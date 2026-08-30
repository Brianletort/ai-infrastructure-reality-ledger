import json
import urllib.error
import urllib.request
from collections.abc import Mapping
from dataclasses import replace
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import cast

import pytest

from reality_ledger_worker.inventory import (
    OVERPASS_QUERY_VERSION,
    CountryCode,
    CoverageReport,
    InventoryDataset,
    OSMInventoryAdapter,
    OverpassClient,
    SourceIngestionProhibited,
    build_coverage_report,
    build_overpass_query,
    deduplicate_inventory,
    generate_inventory,
    require_ingestible_source,
    write_restricted_evidence,
)
from reality_ledger_worker.source_registry import load_source_manifests

REPOSITORY_ROOT = Path(__file__).parents[3]
NOW = datetime(2026, 8, 29, 20, tzinfo=UTC)

OVERPASS_FIXTURE = json.dumps(
    {
        "version": 0.6,
        "generator": "Overpass API",
        "osm3s": {"timestamp_osm_base": "2026-08-29T19:30:00Z"},
        "elements": [
            {
                "type": "node",
                "id": 1001,
                "lat": 38.954321,
                "lon": -77.447654,
                "tags": {
                    "telecom": "data_center",
                    "name": "Synthetic Potomac Compute",
                    "operator": "Synthetic Operator",
                    "addr:city": "Ashburn",
                    "addr:housenumber": "100",
                    "addr:street": "Synthetic Test Road",
                    "contact:phone": "+1-555-0100",
                },
            },
            {
                "type": "node",
                "id": 1001,
                "lat": 38.954321,
                "lon": -77.447654,
                "tags": {
                    "telecom": "data_center",
                    "name": "Synthetic Potomac Compute",
                    "operator": "Synthetic Operator",
                    "addr:city": "Ashburn",
                },
            },
            {
                "type": "way",
                "id": 2001,
                "center": {"lat": 38.9545, "lon": -77.4475},
                "tags": {
                    "building": "data_center",
                    "name": "Synthetic Potomac Compute",
                    "addr:city": "Ashburn",
                },
            },
            {
                "type": "node",
                "id": 1002,
                "lat": 43.653481,
                "lon": -79.383934,
                "tags": {"man_made": "data_center", "addr:city": "Toronto"},
            },
            {
                "type": "node",
                "id": 1003,
                "lat": 19.432641,
                "lon": -99.133209,
                "tags": {
                    "telecom": "data_center",
                    "name": "Synthetic Valle Compute",
                    "addr:city": "Ciudad de México",
                },
            },
        ],
    }
)


def test_source_registry_captures_rights_and_rejects_prohibited_sources() -> None:
    manifests = load_source_manifests(REPOSITORY_ROOT / "sources" / "manifests")
    by_id = {manifest.adapter_id: manifest for manifest in manifests}

    assert by_id["osm-overpass-v1"].license_name == "Open Data Commons Open Database License 1.0"
    assert by_id["osm-overpass-v1"].share_alike is True
    assert "OpenStreetMap contributors" in by_id["osm-overpass-v1"].attribution.text
    assert by_id["pnnl-im3-atlas-manual"].automation == "manual-import"
    assert by_id["canada-legacy-data-centres-context"].allowed_use == "context-only"
    assert by_id["peeringdb-prohibited"].redistribution.value == "prohibited"

    with pytest.raises(SourceIngestionProhibited, match="peeringdb-prohibited"):
        require_ingestible_source(by_id["peeringdb-prohibited"])
    with pytest.raises(SourceIngestionProhibited, match="ODbL share-alike"):
        require_ingestible_source(replace(by_id["osm-overpass-v1"], share_alike=False))


def test_overpass_query_is_bounded_and_only_uses_defensible_data_center_tags() -> None:
    query = build_overpass_query("MX", (18.0, -118.0, 33.0, -86.0), max_records=500)

    assert query.startswith(f"[out:json][timeout:25];/* {OVERPASS_QUERY_VERSION} */")
    assert 'area["ISO3166-1"="MX"]["boundary"="administrative"]->.country;' in query
    assert "(18.0,-118.0,33.0,-86.0)" in query
    assert '["telecom"="data_center"](18.0,-118.0,33.0,-86.0)(area.country)' in query
    assert '["building"="data_center"](18.0,-118.0,33.0,-86.0)(area.country)' in query
    assert '["man_made"="data_center"](18.0,-118.0,33.0,-86.0)(area.country)' in query
    assert "500" in query
    assert "around:" not in query

    with pytest.raises(ValueError, match="maximum 2000"):
        build_overpass_query("MX", (18.0, -118.0, 33.0, -86.0), max_records=2001)
    with pytest.raises(ValueError, match="valid bbox"):
        build_overpass_query("MX", (33.0, -118.0, 18.0, -86.0), max_records=500)
    with pytest.raises(ValueError, match="country must be one of"):
        build_overpass_query("FR", (18.0, -118.0, 33.0, -86.0), max_records=500)


def test_adapter_normalizes_absence_and_restricts_exact_coordinates() -> None:
    adapter = OSMInventoryAdapter()
    parsed = adapter.parse(adapter.fetch(OVERPASS_FIXTURE))
    records = adapter.normalize_country(
        parsed,
        country_code="CA",
        macro_region="Central Canada",
        retrieved_at=NOW,
    )
    unnamed = next(record for record in records if record.source_record_id == "node/1002")

    assert unnamed.facility.name is None
    assert unnamed.facility.operator is None
    assert unnamed.facility.capacity_mw is None
    assert unnamed.facility.lifecycle_state == "unknown"
    assert unnamed.facility.missing == ("name", "operator", "capacityMw", "lifecycleState")
    assert unnamed.site.display_latitude == 43.65
    assert unnamed.site.display_longitude == -79.38
    assert unnamed.site.coordinate_precision == "generalized-0.01-degree"
    assert unnamed.evidence.exact_latitude == 43.653481
    assert unnamed.evidence.exact_longitude == -79.383934
    assert unnamed.evidence.restricted is True
    assert unnamed.evidence.retrieved_at == NOW
    assert unnamed.evidence.source_timestamp.isoformat() == "2026-08-29T19:30:00+00:00"


def test_deduplication_preserves_overlap_as_a_conflict() -> None:
    adapter = OSMInventoryAdapter()
    parsed = adapter.parse(adapter.fetch(OVERPASS_FIXTURE))
    normalized = adapter.normalize_country(
        parsed,
        country_code="US",
        macro_region="US East",
        retrieved_at=NOW,
    )

    result = deduplicate_inventory(normalized)

    assert [record.source_record_id for record in result.records].count("node/1001") == 1
    assert any(
        conflict.reason == "overlapping-point-and-area"
        and conflict.source_record_ids == ("node/1001", "way/2001")
        for conflict in result.conflicts
    )
    assert result.alias_groups == ()


def test_colocated_aliases_merge_deterministically_with_full_provenance(
    tmp_path: Path,
) -> None:
    payload = json.dumps(
        {
            "version": 0.6,
            "generator": "Synthetic Overpass fixture",
            "osm3s": {"timestamp_osm_base": "2026-08-29T19:30:00Z"},
            "elements": [
                {
                    "type": "node",
                    "id": 9002,
                    "lat": 38.90004,
                    "lon": -77.40004,
                    "tags": {
                        "telecom": "data_center",
                        "name": "Synthetic Alias-Hub",
                        "ref": "SYN-ALIAS-2",
                    },
                },
                {
                    "type": "way",
                    "id": 9003,
                    "center": {"lat": 38.90002, "lon": -77.40002},
                    "tags": {
                        "building": "data_center",
                        "name": "Synthetic Alias Hub",
                    },
                },
                {
                    "type": "node",
                    "id": 9001,
                    "lat": 38.9,
                    "lon": -77.4,
                    "tags": {
                        "telecom": "data_center",
                        "name": "Synthetic Alias Hub",
                        "operator": "Synthetic Canonical Operator",
                    },
                },
            ],
        }
    )
    adapter = OSMInventoryAdapter()
    parsed = adapter.parse(adapter.fetch(payload))
    records = adapter.normalize_country(
        parsed,
        country_code="US",
        macro_region="US East",
        retrieved_at=NOW,
        synthetic=True,
    )

    result = deduplicate_inventory(tuple(reversed(records)))

    assert len(result.records) == 2
    canonical = next(
        record for record in result.records if record.site.geometry_type == "point"
    )
    assert canonical.source_record_id == "node/9001"
    assert canonical.facility.aliases == ("Synthetic Alias-Hub",)
    assert [evidence.source_record_id for evidence in canonical.all_evidence] == [
        "node/9001",
        "node/9002",
    ]
    public = canonical.to_public_dict()
    assert public["sourceRecordIds"] == ["node/9001", "node/9002"]
    citations = cast(list[dict[str, object]], public["citations"])
    assert [
        citation["sourceRecordId"] for citation in citations
    ] == ["node/9001", "node/9002"]
    assert result.alias_groups == (("node/9001", "node/9002"),)
    assert any(
        conflict.reason == "overlapping-point-and-area"
        and conflict.source_record_ids == ("node/9001", "node/9002", "way/9003")
        for conflict in result.conflicts
    )
    assert write_restricted_evidence(
        InventoryDataset(
            dataset_timestamp=NOW,
            source_timestamp=NOW,
            query_version=OVERPASS_QUERY_VERSION,
            synthetic=True,
            records=result.records,
            conflicts=result.conflicts,
            alias_groups=result.alias_groups,
            limitations=(),
        ),
        tmp_path,
    ) == 3


def test_coverage_reports_deep_metros_conflicts_and_missing_critical_fields() -> None:
    dataset = generate_inventory(
        {"US": OVERPASS_FIXTURE, "CA": OVERPASS_FIXTURE, "MX": OVERPASS_FIXTURE},
        retrieved_at=NOW,
        synthetic=True,
    )
    coverage = build_coverage_report(dataset)

    assert coverage.not_complete is True
    assert coverage.dataset_timestamp == NOW
    assert coverage.query_version == OVERPASS_QUERY_VERSION
    assert coverage.record_count == len(dataset.records)
    assert coverage.by_country["US"] > 0
    assert coverage.deep_metros["Northern Virginia"].record_count > 0
    assert coverage.deep_metros["Toronto"].record_count > 0
    assert coverage.deep_metros["Dallas\u2013Fort Worth"].record_count == 0
    assert coverage.deep_metros["Phoenix"].record_count == 0
    assert coverage.provider_operator_knownness["unknown"] > 0
    assert coverage.conflict_count > 0
    assert coverage.missing_critical_fields["capacityMw"] == coverage.record_count
    assert "not complete" in coverage.to_markdown().lower()


def test_generation_is_deterministic_and_serializable() -> None:
    payloads: dict[CountryCode, str] = {
        "US": OVERPASS_FIXTURE,
        "CA": OVERPASS_FIXTURE,
        "MX": OVERPASS_FIXTURE,
    }

    first = generate_inventory(payloads, retrieved_at=NOW, synthetic=True)
    second = generate_inventory(payloads, retrieved_at=NOW, synthetic=True)

    assert first.to_dict() == second.to_dict()
    assert CoverageReport.from_dict(build_coverage_report(first).to_dict()).to_dict() == (
        build_coverage_report(first).to_dict()
    )
    encoded = json.dumps(first.to_dict(), sort_keys=True)
    assert "43.653481" not in encoded
    assert '"synthetic": true' in encoded
    assert "https://osm.example.invalid/" in encoded
    assert "https://www.openstreetmap.org/node/" not in encoded
    assert "addr:housenumber" not in encoded
    assert "addr:street" not in encoded
    assert "contact:phone" not in encoded
    assert any("addr:street" in record.evidence.tags for record in first.records)


def test_repeated_retrievals_create_distinct_immutable_evidence(tmp_path: Path) -> None:
    payloads: dict[CountryCode, str] = {
        "US": OVERPASS_FIXTURE,
        "CA": OVERPASS_FIXTURE,
        "MX": OVERPASS_FIXTURE,
    }
    first = generate_inventory(payloads, retrieved_at=NOW, synthetic=True)
    second = generate_inventory(
        payloads,
        retrieved_at=NOW + timedelta(minutes=5),
        synthetic=True,
    )

    first_written = write_restricted_evidence(first, tmp_path)
    assert first_written > 0
    assert write_restricted_evidence(second, tmp_path) == first_written
    assert len(tuple(tmp_path.iterdir())) == first_written * 2


class _FakeResponse:
    @property
    def headers(self) -> Mapping[str, str]:
        return {}

    def __enter__(self) -> "_FakeResponse":
        return self

    def __exit__(self, *_args: object) -> None:
        return None

    def read(self, _maximum_bytes: int = -1) -> bytes:
        return OVERPASS_FIXTURE.encode()


def test_live_client_retries_with_identification_and_minimum_interval(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv("REALITY_LEDGER_OVERPASS_CONTACT_URL", raising=False)
    requests: list[tuple[urllib.request.Request, float]] = []
    sleeps: list[float] = []

    def opener(request: urllib.request.Request, *, timeout: float) -> _FakeResponse:
        requests.append((request, timeout))
        if len(requests) == 1:
            raise urllib.error.URLError("synthetic transient failure")
        return _FakeResponse()

    client = OverpassClient(
        contact_url="https://github.com/approved-owner/approved-repository",
        retries=1,
        minimum_interval_seconds=5,
        sleeper=sleeps.append,
        opener=opener,
    )

    payload = client.fetch(build_overpass_query("MX", (18.0, -118.0, 33.0, -86.0)))

    assert payload == OVERPASS_FIXTURE
    assert len(requests) == 2
    user_agent = requests[0][0].get_header("User-agent")
    assert user_agent and user_agent.startswith("AI-Infrastructure-Reality-Ledger/")
    assert "https://github.com/approved-owner/approved-repository" in user_agent
    assert requests[0][1] == 30
    assert sleeps[0] == 1.0
    assert any(delay > 4.9 for delay in sleeps)


def test_live_client_is_blocked_without_an_approved_contact_url(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv("REALITY_LEDGER_OVERPASS_CONTACT_URL", raising=False)

    with pytest.raises(ValueError, match="REALITY_LEDGER_OVERPASS_CONTACT_URL"):
        OverpassClient()


@pytest.mark.parametrize(
    "contact_url",
    [
        "",
        "http://github.com/owner/repository",
        "https://example.invalid/contact",
        "https://localhost/contact",
        "https://127.0.0.1/contact",
        "https://user:password@example.com/contact",
        "https://github.com/owner/repository?token=secret",
        "https://github.com/owner/repository#contact",
    ],
)
def test_live_client_rejects_non_public_or_ambiguous_contact_urls(
    monkeypatch: pytest.MonkeyPatch,
    contact_url: str,
) -> None:
    monkeypatch.delenv("REALITY_LEDGER_OVERPASS_CONTACT_URL", raising=False)

    with pytest.raises(ValueError, match="public HTTPS"):
        OverpassClient(contact_url=contact_url)
