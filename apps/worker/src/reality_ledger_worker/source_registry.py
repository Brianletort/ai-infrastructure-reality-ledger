import json
from dataclasses import dataclass
from pathlib import Path
from typing import Literal, cast

from reality_ledger_worker.source_adapter import (
    SOURCE_AUTHORITIES,
    SOURCE_DIRECTNESS_VALUES,
    Attribution,
    RateLimit,
    Redistribution,
    SourceAuthority,
    SourceDirectness,
)

AllowedUse = Literal["inventory", "context-only", "prohibited"]
Automation = Literal["worker-only", "manual-import", "none"]

ALLOWED_USES: frozenset[str] = frozenset({"inventory", "context-only", "prohibited"})
AUTOMATION_VALUES: frozenset[str] = frozenset({"worker-only", "manual-import", "none"})


@dataclass(frozen=True)
class RegisteredSource:
    protocol_version: str
    adapter_id: str
    name: str
    source_url: str
    publisher: str
    authority: SourceAuthority
    directness: SourceDirectness
    cadence: str
    rate_limit: RateLimit
    attribution: Attribution
    license_name: str
    license_url: str
    terms_url: str
    sensitivity: str
    redistribution: Redistribution
    share_alike: bool
    allowed_use: AllowedUse
    automation: Automation
    notes: str

    def __post_init__(self) -> None:
        required = (
            self.protocol_version,
            self.adapter_id,
            self.name,
            self.publisher,
            self.cadence,
            self.license_name,
            self.sensitivity,
            self.notes,
        )
        if any(not value.strip() for value in required):
            raise ValueError("registered source fields must not be empty")
        for field_name, url in (
            ("source_url", self.source_url),
            ("license_url", self.license_url),
            ("terms_url", self.terms_url),
        ):
            if not url.startswith("https://"):
                raise ValueError(f"{field_name} must use https")
        if self.authority not in SOURCE_AUTHORITIES:
            raise ValueError("authority is invalid")
        if self.directness not in SOURCE_DIRECTNESS_VALUES:
            raise ValueError("directness is invalid")
        if self.allowed_use not in ALLOWED_USES:
            raise ValueError("allowed_use is invalid")
        if self.automation not in AUTOMATION_VALUES:
            raise ValueError("automation is invalid")
        if self.redistribution is Redistribution.PROHIBITED and self.allowed_use != "prohibited":
            raise ValueError("prohibited redistribution requires prohibited allowed_use")
        if self.allowed_use == "prohibited" and self.automation != "none":
            raise ValueError("prohibited sources cannot be automated")


def _registered_source(raw: object, source_path: Path) -> RegisteredSource:
    manifest = _object_mapping(raw, f"{source_path}: manifest entry")
    try:
        rate_limit = _object_mapping(manifest["rateLimit"], "rateLimit")
        attribution = _object_mapping(manifest["attribution"], "attribution")
        license_record = _object_mapping(manifest["license"], "license")
        attribution_url = attribution.get("url")
        if attribution_url is not None and not isinstance(attribution_url, str):
            raise TypeError("attribution.url must be a string")
        return RegisteredSource(
            protocol_version=_required_str(manifest, "protocolVersion"),
            adapter_id=_required_str(manifest, "adapterId"),
            name=_required_str(manifest, "name"),
            source_url=_required_str(manifest, "sourceUrl"),
            publisher=_required_str(manifest, "publisher"),
            authority=cast(SourceAuthority, _required_str(manifest, "authority")),
            directness=cast(SourceDirectness, _required_str(manifest, "directness")),
            cadence=_required_str(manifest, "cadence"),
            rate_limit=RateLimit(
                requests=_required_int(rate_limit, "requests"),
                per_seconds=_required_int(rate_limit, "perSeconds"),
            ),
            attribution=Attribution(
                text=_required_str(attribution, "text"),
                url=attribution_url,
            ),
            license_name=_required_str(license_record, "name"),
            license_url=_required_str(license_record, "url"),
            terms_url=_required_str(manifest, "termsUrl"),
            sensitivity=_required_str(manifest, "sensitivity"),
            redistribution=Redistribution(_required_str(manifest, "redistribution")),
            share_alike=_required_bool(manifest, "shareAlike"),
            allowed_use=cast(AllowedUse, _required_str(manifest, "allowedUse")),
            automation=cast(Automation, _required_str(manifest, "automation")),
            notes=_required_str(manifest, "notes"),
        )
    except (KeyError, TypeError, ValueError) as error:
        raise ValueError(f"{source_path}: invalid source manifest: {error}") from error


def _object_mapping(raw: object, name: str) -> dict[str, object]:
    if not isinstance(raw, dict):
        raise ValueError(f"{name} must be an object")
    untyped = cast(dict[object, object], raw)
    if not all(isinstance(key, str) for key in untyped):
        raise ValueError(f"{name} must have string keys")
    return cast(dict[str, object], untyped)


def _required_str(raw: dict[str, object], key: str) -> str:
    value = raw[key]
    if not isinstance(value, str):
        raise TypeError(f"{key} must be a string")
    return value


def _required_int(raw: dict[str, object], key: str) -> int:
    value = raw[key]
    if not isinstance(value, int) or isinstance(value, bool):
        raise TypeError(f"{key} must be an integer")
    return value


def _required_bool(raw: dict[str, object], key: str) -> bool:
    value = raw[key]
    if not isinstance(value, bool):
        raise TypeError(f"{key} must be a boolean")
    return value


def load_source_manifests(directory: Path) -> tuple[RegisteredSource, ...]:
    manifests: list[RegisteredSource] = []
    for source_path in sorted(directory.glob("*.json")):
        raw = cast(object, json.loads(source_path.read_text(encoding="utf-8")))
        entries = cast(list[object], raw) if isinstance(raw, list) else [raw]
        manifests.extend(_registered_source(entry, source_path) for entry in entries)
    if not manifests:
        raise ValueError(f"no source manifests found in {directory}")
    adapter_ids = [manifest.adapter_id for manifest in manifests]
    if len(adapter_ids) != len(set(adapter_ids)):
        raise ValueError("source manifest adapter IDs must be unique")
    return tuple(sorted(manifests, key=lambda manifest: manifest.adapter_id))
