import hashlib
import ipaddress
import json
import math
import os
import shutil
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import Counter
from collections.abc import Callable, Iterable, Mapping
from dataclasses import dataclass, replace
from datetime import UTC, datetime
from pathlib import Path
from typing import Literal, Protocol, cast

from reality_ledger_worker.source_adapter import SourceAdapter
from reality_ledger_worker.source_registry import RegisteredSource

OVERPASS_QUERY_VERSION = "osm-overpass-na-v1"
OVERPASS_ENDPOINT = "https://overpass-api.de/api/interpreter"
OVERPASS_ATTRIBUTION = "© OpenStreetMap contributors"
OVERPASS_CONTACT_ENV = "REALITY_LEDGER_OVERPASS_CONTACT_URL"
PUBLIC_COORDINATE_DECIMALS = 2
MAX_QUERY_RECORDS = 2_000
MAX_RESPONSE_BYTES = 20_000_000
PUBLIC_SOURCE_TAGS = frozenset(
    {
        "telecom",
        "building",
        "man_made",
        "name",
        "operator",
        "brand",
        "addr:city",
        "addr:place",
        "addr:state",
        "addr:province",
        "addr:country",
        "ref",
    }
)

CountryCode = Literal["US", "CA", "MX"]

COUNTRY_MACRO_REGIONS: dict[CountryCode, str] = {
    "US": "United States",
    "CA": "Canada",
    "MX": "Mexico",
}

DEEP_METRO_BOUNDS: dict[str, tuple[CountryCode, tuple[float, float, float, float]]] = {
    "Northern Virginia": ("US", (38.55, -77.85, 39.25, -76.95)),
    "Dallas\u2013Fort Worth": ("US", (32.45, -97.65, 33.25, -96.45)),
    "Phoenix": ("US", (33.05, -112.75, 34.05, -111.35)),
    "Toronto": ("CA", (43.35, -80.05, 44.05, -78.85)),
}

LIVE_QUERY_REGIONS: dict[CountryCode, tuple[tuple[str, tuple[float, float, float, float]], ...]] = {
    "US": (
        ("west", (24.0, -125.0, 50.0, -102.0)),
        ("central", (24.0, -102.0, 50.0, -84.0)),
        ("east", (24.0, -84.0, 50.0, -66.0)),
        ("alaska", (51.0, -170.0, 72.0, -130.0)),
        ("hawaii", (18.0, -161.0, 23.0, -154.0)),
    ),
    "CA": (
        ("west", (48.0, -141.0, 70.0, -110.0)),
        ("central", (42.0, -110.0, 70.0, -85.0)),
        ("east", (42.0, -85.0, 70.0, -52.0)),
        ("north", (70.0, -141.0, 84.0, -52.0)),
    ),
    "MX": (
        ("northwest", (22.0, -118.0, 33.0, -103.0)),
        ("northeast", (22.0, -103.0, 33.0, -86.0)),
        ("south", (14.0, -118.0, 23.0, -86.0)),
    ),
}


class SourceIngestionProhibited(ValueError):
    """Raised when registry policy does not permit inventory ingestion."""


def build_overpass_user_agent(contact_url: str | None = None) -> str:
    configured = (
        contact_url
        if contact_url is not None
        else os.environ.get("REALITY_LEDGER_OVERPASS_CONTACT_URL", "")
    ).strip()
    parsed = urllib.parse.urlsplit(configured)
    hostname = (parsed.hostname or "").casefold()
    try:
        hostname_is_public = ipaddress.ip_address(hostname).is_global
    except ValueError:
        hostname_is_public = True
    invalid_hostname = (
        not hostname
        or hostname == "localhost"
        or hostname.endswith((".invalid", ".local", ".test", ".example"))
        or not hostname_is_public
    )
    invalid_url = (
        parsed.scheme != "https"
        or invalid_hostname
        or parsed.username is not None
        or parsed.password is not None
        or bool(parsed.query)
        or bool(parsed.fragment)
        or parsed.path in {"", "/"}
        or len(configured) > 256
        or any(character.isspace() or ord(character) < 32 for character in configured)
    )
    if invalid_url:
        raise ValueError(
            f"{OVERPASS_CONTACT_ENV} must be an approved public HTTPS repository or "
            "contact URL without credentials, query parameters, or fragments; live ingestion "
            "remains blocked"
        )
    return f"AI-Infrastructure-Reality-Ledger/0.1 (public research; +{configured})"


def require_ingestible_source(source: RegisteredSource) -> None:
    if source.allowed_use != "inventory" or source.redistribution.value == "prohibited":
        raise SourceIngestionProhibited(
            f"{source.adapter_id} is not permitted for inventory ingestion "
            f"(allowed_use={source.allowed_use}, redistribution={source.redistribution.value})"
        )
    is_odbl = "odbl" in source.license_name.casefold() or (
        "open database license" in source.license_name.casefold()
    )
    if is_odbl and not source.share_alike:
        raise SourceIngestionProhibited(
            f"{source.adapter_id} must preserve ODbL share-alike"
        )
    if is_odbl and "openstreetmap" not in source.attribution.text.casefold():
        raise SourceIngestionProhibited(
            f"{source.adapter_id} must preserve OpenStreetMap attribution"
        )


class HttpResponse(Protocol):
    @property
    def headers(self) -> Mapping[str, str]: ...

    def read(self, _maximum_bytes: int = -1) -> bytes: ...

    def __enter__(self) -> "HttpResponse": ...

    def __exit__(self, *args: object) -> object: ...


class UrlOpener(Protocol):
    def __call__(
        self,
        request: urllib.request.Request,
        *,
        timeout: float,
    ) -> HttpResponse: ...


def _isoformat(value: datetime) -> str:
    return value.astimezone(UTC).isoformat().replace("+00:00", "Z")


def _parse_datetime(value: str) -> datetime:
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        raise ValueError("timestamp must include a timezone")
    return parsed.astimezone(UTC)


def build_overpass_query(
    country_code: str,
    bbox: tuple[float, float, float, float],
    *,
    max_records: int = 1_000,
) -> str:
    if country_code not in COUNTRY_MACRO_REGIONS:
        raise ValueError("country must be one of US, CA, or MX")
    south, west, north, east = bbox
    if not (-90 <= south < north <= 90 and -180 <= west < east <= 180):
        raise ValueError("valid bbox requires south < north and west < east")
    if not 1 <= max_records <= MAX_QUERY_RECORDS:
        raise ValueError(f"max_records must be between 1 and maximum {MAX_QUERY_RECORDS}")
    bbox_text = ",".join(str(value) for value in bbox)
    return (
        f"[out:json][timeout:25];/* {OVERPASS_QUERY_VERSION} */"
        f'area["ISO3166-1"="{country_code}"]["boundary"="administrative"]->.country;'
        "("
        f'nwr["telecom"="data_center"]({bbox_text})(area.country);'
        f'nwr["building"="data_center"]({bbox_text})(area.country);'
        f'nwr["man_made"="data_center"]({bbox_text})(area.country);'
        ");"
        f"out center tags qt {max_records};"
    )


@dataclass(frozen=True)
class OSMParsed:
    source_timestamp: datetime
    elements: tuple[dict[str, object], ...]


@dataclass(frozen=True)
class CanonicalFacility:
    id: str
    name: str | None
    operator: str | None
    capacity_mw: float | None
    lifecycle_state: Literal["unknown"]
    facility_type: str | None
    aliases: tuple[str, ...]
    missing: tuple[str, ...]

    def to_dict(self) -> dict[str, object]:
        return {
            "id": self.id,
            "name": self.name,
            "operator": self.operator,
            "capacityMw": self.capacity_mw,
            "lifecycleState": self.lifecycle_state,
            "facilityType": self.facility_type,
            "aliases": list(self.aliases),
            "missing": list(self.missing),
        }


@dataclass(frozen=True)
class CanonicalSite:
    id: str
    facility_id: str
    country_code: CountryCode
    macro_region: str
    metro: str | None
    locality: str | None
    geometry_type: Literal["point", "area"]
    display_latitude: float
    display_longitude: float
    coordinate_precision: Literal["generalized-0.01-degree"]
    exact_geometry_restricted: Literal[True]

    def to_dict(self) -> dict[str, object]:
        return {
            "id": self.id,
            "facilityId": self.facility_id,
            "countryCode": self.country_code,
            "macroRegion": self.macro_region,
            "metro": self.metro,
            "locality": self.locality,
            "geometryType": self.geometry_type,
            "displayLatitude": self.display_latitude,
            "displayLongitude": self.display_longitude,
            "coordinatePrecision": self.coordinate_precision,
            "exactGeometryRestricted": self.exact_geometry_restricted,
        }


@dataclass(frozen=True)
class RestrictedEvidence:
    id: str
    source_id: Literal["osm-overpass-v1"]
    source_record_id: str
    source_url: str
    exact_latitude: float
    exact_longitude: float
    tags: dict[str, str]
    source_timestamp: datetime
    retrieved_at: datetime
    content_hash: str
    restricted: Literal[True]

    def to_restricted_dict(self) -> dict[str, object]:
        return {
            "id": self.id,
            "sourceId": self.source_id,
            "sourceRecordId": self.source_record_id,
            "sourceUrl": self.source_url,
            "exactLatitude": self.exact_latitude,
            "exactLongitude": self.exact_longitude,
            "tags": dict(sorted(self.tags.items())),
            "sourceTimestamp": _isoformat(self.source_timestamp),
            "retrievedAt": _isoformat(self.retrieved_at),
            "contentHash": self.content_hash,
            "restricted": True,
        }

    def to_public_citation(self) -> dict[str, object]:
        synthetic = self.source_url.startswith("https://osm.example.invalid/")
        return {
            "evidenceId": self.id,
            "sourceId": self.source_id,
            "sourceRecordId": self.source_record_id,
            "title": (
                f"Synthetic OSM fixture {self.source_record_id}"
                if synthetic
                else f"OpenStreetMap {self.source_record_id}"
            ),
            "url": self.source_url,
            "attribution": OVERPASS_ATTRIBUTION,
            "sourceTimestamp": _isoformat(self.source_timestamp),
            "retrievedAt": _isoformat(self.retrieved_at),
            "exactGeometryRestricted": True,
        }


@dataclass(frozen=True)
class NormalizedInventoryRecord:
    source_record_id: str
    facility: CanonicalFacility
    site: CanonicalSite
    evidence: RestrictedEvidence
    additional_evidence: tuple[RestrictedEvidence, ...] = ()

    @property
    def all_evidence(self) -> tuple[RestrictedEvidence, ...]:
        return tuple(
            sorted(
                (self.evidence, *self.additional_evidence),
                key=lambda evidence: _source_record_key(evidence.source_record_id),
            )
        )

    def to_public_dict(self) -> dict[str, object]:
        public_tags: dict[str, str] = {}
        for evidence in reversed(self.all_evidence):
            public_tags.update(
                {
                    key: value
                    for key, value in sorted(evidence.tags.items())
                    if key in PUBLIC_SOURCE_TAGS
                }
            )
        return {
            "facility": self.facility.to_dict(),
            "site": self.site.to_dict(),
            "sourceRecordIds": [
                evidence.source_record_id for evidence in self.all_evidence
            ],
            "sourceTags": dict(sorted(public_tags.items())),
            "citations": [
                evidence.to_public_citation() for evidence in self.all_evidence
            ],
        }


@dataclass(frozen=True)
class InventoryConflict:
    id: str
    reason: Literal["overlapping-point-and-area", "colocated-distinct-records"]
    source_record_ids: tuple[str, ...]
    facility_ids: tuple[str, ...]
    status: Literal["unresolved"] = "unresolved"

    def to_dict(self) -> dict[str, object]:
        return {
            "id": self.id,
            "reason": self.reason,
            "sourceRecordIds": list(self.source_record_ids),
            "facilityIds": list(self.facility_ids),
            "status": self.status,
        }


@dataclass(frozen=True)
class DeduplicationResult:
    records: tuple[NormalizedInventoryRecord, ...]
    conflicts: tuple[InventoryConflict, ...]
    alias_groups: tuple[tuple[str, ...], ...]


@dataclass(frozen=True)
class InventoryDataset:
    dataset_timestamp: datetime
    source_timestamp: datetime
    query_version: str
    synthetic: bool
    records: tuple[NormalizedInventoryRecord, ...]
    conflicts: tuple[InventoryConflict, ...]
    alias_groups: tuple[tuple[str, ...], ...]
    limitations: tuple[str, ...]

    def to_dict(self) -> dict[str, object]:
        return {
            "metadata": {
                "datasetTimestamp": _isoformat(self.dataset_timestamp),
                "sourceTimestamp": _isoformat(self.source_timestamp),
                "queryVersion": self.query_version,
                "recordCount": len(self.records),
                "synthetic": self.synthetic,
                "notComplete": True,
                "license": "ODbL-1.0",
                "attribution": OVERPASS_ATTRIBUTION,
                "shareAlike": True,
                "limitations": list(self.limitations),
            },
            "records": [record.to_public_dict() for record in self.records],
            "conflicts": [conflict.to_dict() for conflict in self.conflicts],
            "aliasGroups": [list(group) for group in self.alias_groups],
        }


@dataclass(frozen=True)
class MetroCoverage:
    record_count: int
    conflict_count: int
    operator_known_count: int
    missing_critical_field_count: int

    def to_dict(self) -> dict[str, int]:
        return {
            "recordCount": self.record_count,
            "conflictCount": self.conflict_count,
            "operatorKnownCount": self.operator_known_count,
            "missingCriticalFieldCount": self.missing_critical_field_count,
        }

    @classmethod
    def from_dict(cls, raw: Mapping[str, object]) -> "MetroCoverage":
        return cls(
            record_count=_required_int(raw, "recordCount"),
            conflict_count=_required_int(raw, "conflictCount"),
            operator_known_count=_required_int(raw, "operatorKnownCount"),
            missing_critical_field_count=_required_int(raw, "missingCriticalFieldCount"),
        )


@dataclass(frozen=True)
class CoverageReport:
    dataset_timestamp: datetime
    source_timestamp: datetime
    query_version: str
    record_count: int
    synthetic: bool
    not_complete: Literal[True]
    by_country: dict[str, int]
    by_macro_region: dict[str, int]
    by_metro: dict[str, int]
    provider_operator_knownness: dict[str, int]
    by_geometry_type: dict[str, int]
    by_facility_type: dict[str, int]
    by_source: dict[str, int]
    conflict_count: int
    conflicts_by_reason: dict[str, int]
    missing_critical_fields: dict[str, int]
    deep_metros: dict[str, MetroCoverage]
    limitations: tuple[str, ...]

    def to_dict(self) -> dict[str, object]:
        return {
            "datasetTimestamp": _isoformat(self.dataset_timestamp),
            "sourceTimestamp": _isoformat(self.source_timestamp),
            "queryVersion": self.query_version,
            "recordCount": self.record_count,
            "synthetic": self.synthetic,
            "notComplete": self.not_complete,
            "byCountry": self.by_country,
            "byMacroRegion": self.by_macro_region,
            "byMetro": self.by_metro,
            "providerOperatorKnownness": self.provider_operator_knownness,
            "byGeometryType": self.by_geometry_type,
            "byFacilityType": self.by_facility_type,
            "bySource": self.by_source,
            "conflictCount": self.conflict_count,
            "conflictsByReason": self.conflicts_by_reason,
            "missingCriticalFields": self.missing_critical_fields,
            "deepMetros": {
                name: coverage.to_dict() for name, coverage in self.deep_metros.items()
            },
            "limitations": list(self.limitations),
        }

    @classmethod
    def from_dict(cls, raw: Mapping[str, object]) -> "CoverageReport":
        deep_raw = _object_mapping(raw["deepMetros"], "deepMetros")
        return cls(
            dataset_timestamp=_parse_datetime(str(raw["datasetTimestamp"])),
            source_timestamp=_parse_datetime(str(raw["sourceTimestamp"])),
            query_version=str(raw["queryVersion"]),
            record_count=_required_int(raw, "recordCount"),
            synthetic=_required_bool(raw, "synthetic"),
            not_complete=True,
            by_country=_integer_mapping(raw["byCountry"]),
            by_macro_region=_integer_mapping(raw["byMacroRegion"]),
            by_metro=_integer_mapping(raw["byMetro"]),
            provider_operator_knownness=_integer_mapping(raw["providerOperatorKnownness"]),
            by_geometry_type=_integer_mapping(raw["byGeometryType"]),
            by_facility_type=_integer_mapping(raw["byFacilityType"]),
            by_source=_integer_mapping(raw["bySource"]),
            conflict_count=_required_int(raw, "conflictCount"),
            conflicts_by_reason=_integer_mapping(raw["conflictsByReason"]),
            missing_critical_fields=_integer_mapping(raw["missingCriticalFields"]),
            deep_metros={
                name: MetroCoverage.from_dict(_object_mapping(value, f"deepMetros.{name}"))
                for name, value in deep_raw.items()
            },
            limitations=tuple(str(value) for value in _list_value(raw["limitations"])),
        )

    def to_markdown(self) -> str:
        inventory_kind = "deterministic synthetic fallback" if self.synthetic else "live OSM"
        lines = [
            "# North America facility inventory coverage",
            "",
            "> **This inventory is not complete.** Absence from this dataset is not evidence "
            "that a "
            "facility does not exist.",
            "",
            f"- Dataset timestamp: `{_isoformat(self.dataset_timestamp)}`",
            f"- Source timestamp: `{_isoformat(self.source_timestamp)}`",
            f"- Query/version: `{self.query_version}`",
            f"- Inventory mode: {inventory_kind}",
            f"- Public record count: **{self.record_count}**",
            f"- Unresolved conflict count: **{self.conflict_count}**",
            "",
            "## Coverage by country",
            "",
            *_markdown_counts(self.by_country),
            "",
            "## Deep-metro buckets",
            "",
        ]
        for name, coverage in self.deep_metros.items():
            lines.append(
                f"- {name}: {coverage.record_count} records; "
                f"{coverage.conflict_count} conflicts; "
                f"{coverage.operator_known_count} with explicit operator"
            )
        lines.extend(
            [
                "",
                "## Operator/provider knownness",
                "",
                *_markdown_counts(self.provider_operator_knownness),
                "",
                "## Geometry type",
                "",
                *_markdown_counts(self.by_geometry_type),
                "",
                "## Explicit facility tag",
                "",
                *_markdown_counts(self.by_facility_type),
                "",
                "## Missing critical fields",
                "",
                *_markdown_counts(self.missing_critical_fields),
                "",
                "## Known limitations",
                "",
                *(f"- {limitation}" for limitation in self.limitations),
                "",
                "ODbL attribution: © OpenStreetMap contributors. The distributable inventory is "
                "provided under ODbL 1.0 and retains share-alike obligations.",
            ]
        )
        return "\n".join(lines) + "\n"


def _integer_mapping(raw: object) -> dict[str, int]:
    mapping = _object_mapping(raw, "coverage dimension")
    result: dict[str, int] = {}
    for key, value in mapping.items():
        if not isinstance(value, int) or isinstance(value, bool):
            raise ValueError(f"coverage dimension {key} must be an integer")
        result[key] = value
    return result


def _list_value(raw: object) -> list[object]:
    if not isinstance(raw, list):
        raise ValueError("value must be a list")
    return cast(list[object], raw)


def _object_mapping(raw: object, name: str) -> dict[str, object]:
    if not isinstance(raw, dict):
        raise ValueError(f"{name} must be an object with string keys")
    untyped = cast(dict[object, object], raw)
    if not all(isinstance(key, str) for key in untyped):
        raise ValueError(f"{name} must be an object with string keys")
    return cast(dict[str, object], untyped)


def _required_int(raw: Mapping[str, object], key: str) -> int:
    value = raw[key]
    if not isinstance(value, int) or isinstance(value, bool):
        raise ValueError(f"{key} must be an integer")
    return value


def _required_bool(raw: Mapping[str, object], key: str) -> bool:
    value = raw[key]
    if not isinstance(value, bool):
        raise ValueError(f"{key} must be a boolean")
    return value


def _markdown_counts(counts: Mapping[str, int]) -> list[str]:
    return [f"- {name}: {count}" for name, count in counts.items()] or ["- None observed: 0"]


class OSMInventoryAdapter(SourceAdapter[str, OSMParsed, tuple[NormalizedInventoryRecord, ...]]):
    def fetch(self, fixture_payload: str) -> str:
        return fixture_payload

    def parse(self, raw: str) -> OSMParsed:
        decoded = _object_mapping(cast(object, json.loads(raw)), "Overpass payload")
        osm3s = _object_mapping(decoded.get("osm3s"), "Overpass osm3s metadata")
        elements = _list_value(decoded.get("elements"))
        source_timestamp = osm3s.get("timestamp_osm_base")
        if not isinstance(source_timestamp, str):
            raise ValueError("Overpass payload requires timestamp_osm_base")
        parsed_elements = tuple(
            _object_mapping(cast(object, element), "Overpass element")
            for element in elements
            if isinstance(element, dict)
        )
        return OSMParsed(_parse_datetime(source_timestamp), parsed_elements)

    def normalize(self, parsed: OSMParsed) -> tuple[NormalizedInventoryRecord, ...]:
        raise ValueError("country context is required; use normalize_country")

    def normalize_country(
        self,
        parsed: OSMParsed,
        *,
        country_code: CountryCode,
        macro_region: str,
        retrieved_at: datetime,
        synthetic: bool = False,
    ) -> tuple[NormalizedInventoryRecord, ...]:
        records = [
            self._normalize_element(
                element,
                parsed.source_timestamp,
                country_code,
                macro_region,
                retrieved_at,
                synthetic,
            )
            for element in parsed.elements
        ]
        return tuple(record for record in records if record is not None)

    @staticmethod
    def _normalize_element(
        element: Mapping[str, object],
        source_timestamp: datetime,
        country_code: CountryCode,
        macro_region: str,
        retrieved_at: datetime,
        synthetic: bool,
    ) -> NormalizedInventoryRecord | None:
        element_type = element.get("type")
        element_id = element.get("id")
        if element_type not in {"node", "way", "relation"} or not isinstance(element_id, int):
            return None
        coordinates = (
            (element.get("lat"), element.get("lon"))
            if element_type == "node"
            else _center_coordinates(element.get("center"))
        )
        latitude, longitude = coordinates
        if not isinstance(latitude, (int, float)) or not isinstance(longitude, (int, float)):
            return None
        if not (-90 <= latitude <= 90 and -180 <= longitude <= 180):
            return None
        tags_raw = _object_mapping(element.get("tags", {}), "OSM tags")
        tags = {
            key: str(value)
            for key, value in tags_raw.items()
            if isinstance(value, (str, int, float, bool))
        }
        facility_type = _explicit_facility_type(tags)
        if facility_type is None:
            return None
        source_record_id = f"{element_type}/{element_id}"
        stable_suffix = hashlib.sha256(
            f"osm-overpass-v1|{source_record_id}".encode()
        ).hexdigest()[:20]
        facility_id = f"facility-osm-{stable_suffix}"
        site_id = f"site-osm-{stable_suffix}"
        name = tags.get("name") or None
        operator = tags.get("operator") or None
        missing = tuple(
            field
            for field, value in (
                ("name", name),
                ("operator", operator),
                ("capacityMw", None),
                ("lifecycleState", None),
            )
            if value is None
        )
        metro = _deep_metro(country_code, float(latitude), float(longitude))
        canonical_element = json.dumps(element, sort_keys=True, separators=(",", ":")).encode()
        evidence = RestrictedEvidence(
            id=f"evidence-osm-{stable_suffix}",
            source_id="osm-overpass-v1",
            source_record_id=source_record_id,
            source_url=(
                f"https://osm.example.invalid/{element_type}/{element_id}"
                if synthetic
                else f"https://www.openstreetmap.org/{element_type}/{element_id}"
            ),
            exact_latitude=float(latitude),
            exact_longitude=float(longitude),
            tags=tags,
            source_timestamp=source_timestamp,
            retrieved_at=retrieved_at,
            content_hash=hashlib.sha256(canonical_element).hexdigest(),
            restricted=True,
        )
        return NormalizedInventoryRecord(
            source_record_id=source_record_id,
            facility=CanonicalFacility(
                id=facility_id,
                name=name,
                operator=operator,
                capacity_mw=None,
                lifecycle_state="unknown",
                facility_type=facility_type,
                aliases=(),
                missing=missing,
            ),
            site=CanonicalSite(
                id=site_id,
                facility_id=facility_id,
                country_code=country_code,
                macro_region=macro_region,
                metro=metro,
                locality=tags.get("addr:city") or tags.get("addr:place") or None,
                geometry_type="point" if element_type == "node" else "area",
                display_latitude=round(float(latitude), PUBLIC_COORDINATE_DECIMALS),
                display_longitude=round(float(longitude), PUBLIC_COORDINATE_DECIMALS),
                coordinate_precision="generalized-0.01-degree",
                exact_geometry_restricted=True,
            ),
            evidence=evidence,
        )


def _center_coordinates(raw: object) -> tuple[object, object]:
    if not isinstance(raw, dict):
        return (None, None)
    center = _object_mapping(cast(object, raw), "OSM center")
    return (center.get("lat"), center.get("lon"))


def _explicit_facility_type(tags: Mapping[str, str]) -> str | None:
    for key in ("telecom", "building", "man_made"):
        if tags.get(key) == "data_center":
            return f"{key}=data_center"
    return None


def _deep_metro(country: CountryCode, latitude: float, longitude: float) -> str | None:
    for name, (metro_country, bounds) in DEEP_METRO_BOUNDS.items():
        south, west, north, east = bounds
        if (
            country == metro_country
            and south <= latitude <= north
            and west <= longitude <= east
        ):
            return name
    return None


def _haversine_metres(left: NormalizedInventoryRecord, right: NormalizedInventoryRecord) -> float:
    radius_metres = 6_371_000.0
    lat_a = math.radians(left.evidence.exact_latitude)
    lat_b = math.radians(right.evidence.exact_latitude)
    delta_lat = math.radians(right.evidence.exact_latitude - left.evidence.exact_latitude)
    delta_lon = math.radians(right.evidence.exact_longitude - left.evidence.exact_longitude)
    haversine = (
        math.sin(delta_lat / 2) ** 2
        + math.cos(lat_a) * math.cos(lat_b) * math.sin(delta_lon / 2) ** 2
    )
    return radius_metres * 2 * math.atan2(math.sqrt(haversine), math.sqrt(1 - haversine))


def _normalized_name(record: NormalizedInventoryRecord) -> str | None:
    name = record.facility.name
    if name is None:
        return None
    normalized = " ".join(
        "".join(character.casefold() if character.isalnum() else " " for character in name).split()
    )
    return normalized or None


def _source_record_key(source_record_id: str) -> tuple[int, int, str]:
    element_type, separator, raw_id = source_record_id.partition("/")
    type_rank = {"node": 0, "way": 1, "relation": 2}.get(element_type, 3)
    numeric_id = int(raw_id) if separator and raw_id.isdigit() else 2**63 - 1
    return (type_rank, numeric_id, source_record_id)


def _merge_alias_group(
    group: tuple[NormalizedInventoryRecord, ...],
) -> NormalizedInventoryRecord:
    canonical = min(group, key=lambda record: _source_record_key(record.source_record_id))
    aliases = tuple(
        sorted(
            {
                alias
                for record in group
                for alias in (record.facility.name, *record.facility.aliases)
                if alias is not None and alias != canonical.facility.name
            }
        )
    )
    evidence = tuple(
        sorted(
            (record.evidence for record in group),
            key=lambda item: _source_record_key(item.source_record_id),
        )
    )
    return replace(
        canonical,
        facility=replace(canonical.facility, aliases=aliases),
        evidence=evidence[0],
        additional_evidence=evidence[1:],
    )


def deduplicate_inventory(
    records: tuple[NormalizedInventoryRecord, ...],
) -> DeduplicationResult:
    unique: dict[tuple[str, str], NormalizedInventoryRecord] = {}
    for record in sorted(
        records,
        key=lambda item: (item.site.country_code, item.source_record_id),
    ):
        unique.setdefault((record.site.country_code, record.source_record_id), record)
    deduplicated = tuple(unique.values())
    alias_clusters: list[list[NormalizedInventoryRecord]] = []
    for record in deduplicated:
        matching_cluster = next(
            (
                cluster
                for cluster in alias_clusters
                if all(
                    candidate.site.country_code == record.site.country_code
                    and candidate.site.geometry_type == record.site.geometry_type
                    and _normalized_name(candidate) is not None
                    and _normalized_name(candidate) == _normalized_name(record)
                    and _haversine_metres(candidate, record) <= 15
                    for candidate in cluster
                )
            ),
            None,
        )
        if matching_cluster is None:
            alias_clusters.append([record])
        else:
            matching_cluster.append(record)
    merged_records = tuple(
        _merge_alias_group(tuple(cluster)) for cluster in alias_clusters
    )
    conflicts: list[InventoryConflict] = []
    alias_groups = [
        tuple(
            evidence.source_record_id
            for evidence in merged_record.all_evidence
        )
        for merged_record in merged_records
        if len(merged_record.all_evidence) > 1
    ]
    for index, left in enumerate(merged_records):
        for right in merged_records[index + 1 :]:
            if left.site.country_code != right.site.country_code:
                continue
            distance = _haversine_metres(left, right)
            if distance > 100:
                continue
            reason: Literal["overlapping-point-and-area", "colocated-distinct-records"] = (
                "overlapping-point-and-area"
                if left.site.geometry_type != right.site.geometry_type
                else "colocated-distinct-records"
            )
            source_ids = tuple(
                sorted(
                    {
                        evidence.source_record_id
                        for record in (left, right)
                        for evidence in record.all_evidence
                    },
                    key=_source_record_key,
                )
            )
            conflict_suffix = hashlib.sha256("|".join(source_ids).encode()).hexdigest()[:16]
            conflicts.append(
                InventoryConflict(
                    id=f"conflict-osm-{conflict_suffix}",
                    reason=reason,
                    source_record_ids=source_ids,
                    facility_ids=tuple(sorted((left.facility.id, right.facility.id))),
                )
            )
    return DeduplicationResult(
        records=merged_records,
        conflicts=tuple(sorted(set(conflicts), key=lambda conflict: conflict.id)),
        alias_groups=tuple(sorted(set(alias_groups))),
    )


def generate_inventory(
    payloads: Mapping[CountryCode, str],
    *,
    retrieved_at: datetime,
    synthetic: bool,
) -> InventoryDataset:
    if set(payloads) != set(COUNTRY_MACRO_REGIONS):
        raise ValueError("payloads must include exactly US, CA, and MX")
    adapter = OSMInventoryAdapter()
    normalized: list[NormalizedInventoryRecord] = []
    source_timestamps: list[datetime] = []
    for country_code in ("US", "CA", "MX"):
        parsed = adapter.parse(adapter.fetch(payloads[country_code]))
        source_timestamps.append(parsed.source_timestamp)
        normalized.extend(
            adapter.normalize_country(
                parsed,
                country_code=country_code,
                macro_region=COUNTRY_MACRO_REGIONS[country_code],
                retrieved_at=retrieved_at,
                synthetic=synthetic,
            )
        )
    deduplicated = deduplicate_inventory(tuple(normalized))
    limitations = (
        "OpenStreetMap tagging is voluntary and uneven; untagged facilities are absent.",
        "Coordinates are generalized to 0.01 degree in distributable data and public APIs.",
        "OSM presence does not establish operator, tenant, capacity, facility type beyond explicit "
        "source tags, activation, or lifecycle state.",
        "Overlapping point, building, and campus representations remain unresolved conflicts.",
        "The Canada federal legacy dataset is contextual only; no official comprehensive "
        "commercial registry was verified for Canada or Mexico.",
    )
    return InventoryDataset(
        dataset_timestamp=retrieved_at,
        source_timestamp=max(source_timestamps),
        query_version=OVERPASS_QUERY_VERSION,
        synthetic=synthetic,
        records=deduplicated.records,
        conflicts=deduplicated.conflicts,
        alias_groups=deduplicated.alias_groups,
        limitations=limitations,
    )


def build_coverage_report(dataset: InventoryDataset) -> CoverageReport:
    records = dataset.records
    conflicts_by_facility = {
        facility_id
        for conflict in dataset.conflicts
        for facility_id in conflict.facility_ids
    }
    deep_metros: dict[str, MetroCoverage] = {}
    for metro_name in DEEP_METRO_BOUNDS:
        metro_records = tuple(record for record in records if record.site.metro == metro_name)
        deep_metros[metro_name] = MetroCoverage(
            record_count=len(metro_records),
            conflict_count=sum(
                record.facility.id in conflicts_by_facility for record in metro_records
            ),
            operator_known_count=sum(
                record.facility.operator is not None for record in metro_records
            ),
            missing_critical_field_count=sum(
                len(record.facility.missing) for record in metro_records
            ),
        )
    return CoverageReport(
        dataset_timestamp=dataset.dataset_timestamp,
        source_timestamp=dataset.source_timestamp,
        query_version=dataset.query_version,
        record_count=len(records),
        synthetic=dataset.synthetic,
        not_complete=True,
        by_country=_counts(record.site.country_code for record in records),
        by_macro_region=_counts(record.site.macro_region for record in records),
        by_metro=_counts(record.site.metro or "outside-deep-metro-buckets" for record in records),
        provider_operator_knownness=_counts(
            "known" if record.facility.operator else "unknown" for record in records
        ),
        by_geometry_type=_counts(record.site.geometry_type for record in records),
        by_facility_type=_counts(
            record.facility.facility_type or "unknown" for record in records
        ),
        by_source={"osm-overpass-v1": len(records)},
        conflict_count=len(dataset.conflicts),
        conflicts_by_reason=_counts(conflict.reason for conflict in dataset.conflicts),
        missing_critical_fields={
            field: sum(field in record.facility.missing for record in records)
            for field in ("name", "operator", "capacityMw", "lifecycleState")
        },
        deep_metros=deep_metros,
        limitations=dataset.limitations,
    )


def _counts(values: Iterable[str]) -> dict[str, int]:
    return dict(sorted(Counter(values).items()))


class OverpassClient:
    def __init__(
        self,
        *,
        endpoint: str = OVERPASS_ENDPOINT,
        contact_url: str | None = None,
        timeout_seconds: float = 30,
        retries: int = 1,
        minimum_interval_seconds: float = 5,
        sleeper: Callable[[float], None] = time.sleep,
        opener: UrlOpener | None = None,
    ) -> None:
        if endpoint != OVERPASS_ENDPOINT:
            raise ValueError("Overpass endpoint is not allowlisted")
        if not 1 <= timeout_seconds <= 60:
            raise ValueError("timeout_seconds must be between 1 and 60")
        if not 0 <= retries <= 2:
            raise ValueError("retries must be between 0 and 2")
        if minimum_interval_seconds < 5:
            raise ValueError("minimum_interval_seconds must be at least 5")
        self._endpoint = endpoint
        self._user_agent = build_overpass_user_agent(contact_url)
        self._timeout_seconds = timeout_seconds
        self._retries = retries
        self._minimum_interval_seconds = minimum_interval_seconds
        self._sleeper = sleeper
        self._opener = opener or cast(UrlOpener, urllib.request.urlopen)
        self._last_request_at: float | None = None

    def fetch(self, query: str) -> str:
        encoded = urllib.parse.urlencode({"data": query}).encode()
        request = urllib.request.Request(
            self._endpoint,
            data=encoded,
            headers={
                "User-Agent": self._user_agent,
                "Accept": "application/json",
                "Content-Type": "application/x-www-form-urlencoded",
            },
            method="POST",
        )
        last_error: Exception | None = None
        for attempt in range(self._retries + 1):
            self._respect_rate_limit()
            try:
                with self._opener(request, timeout=self._timeout_seconds) as response:
                    content_length = response.headers.get("Content-Length")
                    if content_length and int(content_length) > MAX_RESPONSE_BYTES:
                        raise ValueError("Overpass response exceeds maximum allowed size")
                    payload = response.read(MAX_RESPONSE_BYTES + 1)
                    if len(payload) > MAX_RESPONSE_BYTES:
                        raise ValueError("Overpass response exceeds maximum allowed size")
                    return payload.decode("utf-8")
            except (OSError, TimeoutError, urllib.error.URLError, urllib.error.HTTPError) as error:
                last_error = error
                if attempt < self._retries:
                    self._sleeper(float(2**attempt))
        raise RuntimeError(f"bounded Overpass retrieval failed: {last_error}") from last_error

    def _respect_rate_limit(self) -> None:
        now = time.monotonic()
        if self._last_request_at is not None:
            remaining = self._minimum_interval_seconds - (now - self._last_request_at)
            if remaining > 0:
                self._sleeper(remaining)
        self._last_request_at = time.monotonic()


class OverpassFetcher(Protocol):
    def fetch(self, query: str) -> str: ...


def fetch_live_country_payloads(
    client: OverpassFetcher,
    *,
    max_records_per_region: int = 1_000,
) -> dict[CountryCode, str]:
    payloads: dict[CountryCode, str] = {}
    for country, regions in LIVE_QUERY_REGIONS.items():
        combined_elements: list[object] = []
        timestamps: list[datetime] = []
        for _, bbox in regions:
            raw = client.fetch(
                build_overpass_query(country, bbox, max_records=max_records_per_region)
            )
            parsed = OSMInventoryAdapter().parse(raw)
            timestamps.append(parsed.source_timestamp)
            combined_elements.extend(parsed.elements)
        payloads[country] = json.dumps(
            {
                "version": 0.6,
                "generator": "Reality Ledger bounded Overpass worker",
                "osm3s": {"timestamp_osm_base": _isoformat(max(timestamps))},
                "elements": combined_elements,
            },
            sort_keys=True,
        )
    return payloads


def write_restricted_evidence(dataset: InventoryDataset, directory: Path) -> int:
    directory.mkdir(parents=True, exist_ok=True)
    written = 0
    for record in dataset.records:
        for evidence in record.all_evidence:
            encoded = (
                json.dumps(evidence.to_restricted_dict(), sort_keys=True, indent=2) + "\n"
            ).encode()
            path = directory / hashlib.sha256(encoded).hexdigest()
            if path.exists() and path.read_bytes() != encoded:
                raise OSError("restricted immutable evidence failed integrity verification")
            if not path.exists():
                path.write_bytes(encoded)
                path.chmod(0o444)
                written += 1
    return written


def write_public_artifacts(
    dataset: InventoryDataset,
    coverage: CoverageReport,
    *,
    inventory_path: Path,
    coverage_json_path: Path,
    coverage_markdown_path: Path,
) -> None:
    artifacts = (
        (
            inventory_path,
            (json.dumps(dataset.to_dict(), indent=2, sort_keys=True) + "\n").encode(),
        ),
        (
            coverage_json_path,
            (json.dumps(coverage.to_dict(), indent=2, sort_keys=True) + "\n").encode(),
        ),
        (coverage_markdown_path, coverage.to_markdown().encode()),
    )
    staged: dict[Path, Path] = {}
    backups: dict[Path, Path | None] = {}
    replaced: list[Path] = []
    try:
        for destination, content in artifacts:
            destination.parent.mkdir(parents=True, exist_ok=True)
            file_descriptor, temporary_name = tempfile.mkstemp(
                dir=destination.parent,
                prefix=f".{destination.name}.tmp-",
            )
            temporary = Path(temporary_name)
            staged[destination] = temporary
            with os.fdopen(file_descriptor, "wb") as temporary_file:
                temporary_file.write(content)
                temporary_file.flush()
                os.fsync(temporary_file.fileno())
        for destination, _ in artifacts:
            if destination.exists():
                file_descriptor, backup_name = tempfile.mkstemp(
                    dir=destination.parent,
                    prefix=f".{destination.name}.backup-",
                )
                os.close(file_descriptor)
                backup = Path(backup_name)
                shutil.copy2(destination, backup)
                backups[destination] = backup
            else:
                backups[destination] = None
        for destination, _ in artifacts:
            os.replace(staged[destination], destination)
            replaced.append(destination)
    except BaseException:
        for destination in reversed(replaced):
            backup = backups.get(destination)
            if backup is None:
                destination.unlink(missing_ok=True)
            else:
                os.replace(backup, destination)
        raise
    finally:
        for temporary in staged.values():
            temporary.unlink(missing_ok=True)
        for backup in backups.values():
            if backup is not None:
                backup.unlink(missing_ok=True)
