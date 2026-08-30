import json
from datetime import UTC, datetime, timedelta
from pathlib import Path

import pytest

from reality_ledger_worker.inventory_cli import refresh_inventory

NOW = datetime(2026, 8, 29, 21, tzinfo=UTC)


class BlockedClient:
    def fetch(self, query: str) -> str:
        raise RuntimeError(f"synthetic endpoint blocker for {len(query)} byte query")


def _write_fixture(directory: Path, country: str, element_id: int) -> None:
    directory.mkdir(parents=True, exist_ok=True)
    payload = {
        "version": 0.6,
        "generator": "Synthetic Overpass fixture",
        "osm3s": {"timestamp_osm_base": "2026-08-29T20:30:00Z"},
        "elements": [
            {
                "type": "node",
                "id": element_id,
                "lat": {"US": 38.95, "CA": 43.65, "MX": 19.43}[country],
                "lon": {"US": -77.45, "CA": -79.38, "MX": -99.13}[country],
                "tags": {
                    "telecom": "data_center",
                    "name": f"Synthetic {country} Facility",
                },
            }
        ],
    }
    (directory / f"{country.lower()}.json").write_text(
        json.dumps(payload),
        encoding="utf-8",
    )


def test_refresh_falls_back_deterministically_and_records_live_blocker(tmp_path: Path) -> None:
    fixture_directory = tmp_path / "fixtures"
    for country, element_id in (("US", 1001), ("CA", 1002), ("MX", 1003)):
        _write_fixture(fixture_directory, country, element_id)

    result = refresh_inventory(
        fixture_directory=fixture_directory,
        output_root=tmp_path / "generated",
        restricted_root=tmp_path / "restricted",
        retrieved_at=NOW,
        live_client=BlockedClient(),
    )

    assert result.synthetic is True
    assert result.real_record_count == 0
    assert result.synthetic_record_count == 3
    assert result.live_blocker and "synthetic endpoint blocker" in result.live_blocker
    inventory = json.loads(result.inventory_path.read_text(encoding="utf-8"))
    assert inventory["metadata"]["notComplete"] is True
    assert inventory["metadata"]["attribution"] == "© OpenStreetMap contributors"
    assert "exactLatitude" not in result.inventory_path.read_text(encoding="utf-8")
    assert result.coverage_json_path.exists()
    assert result.coverage_markdown_path.exists()
    assert len(tuple((tmp_path / "restricted").iterdir())) == 3


def test_fixture_only_refresh_does_not_attempt_live_network(tmp_path: Path) -> None:
    fixture_directory = tmp_path / "fixtures"
    for country, element_id in (("US", 1001), ("CA", 1002), ("MX", 1003)):
        _write_fixture(fixture_directory, country, element_id)

    result = refresh_inventory(
        fixture_directory=fixture_directory,
        output_root=tmp_path / "generated",
        restricted_root=tmp_path / "restricted",
        retrieved_at=NOW,
        fixture_only=True,
    )

    assert result.synthetic is True
    assert result.live_blocker == "live retrieval intentionally skipped (--fixture-only)"


def test_default_refresh_fails_closed_before_network_without_contact_configuration(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    fixture_directory = tmp_path / "fixtures"
    for country, element_id in (("US", 1001), ("CA", 1002), ("MX", 1003)):
        _write_fixture(fixture_directory, country, element_id)
    monkeypatch.delenv("REALITY_LEDGER_OVERPASS_CONTACT_URL", raising=False)

    def unexpected_network(*_args: object, **_kwargs: object) -> object:
        raise AssertionError(
            "live network must remain blocked without approved contact configuration"
        )

    monkeypatch.setattr("urllib.request.urlopen", unexpected_network)

    result = refresh_inventory(
        fixture_directory=fixture_directory,
        output_root=tmp_path / "generated",
        restricted_root=tmp_path / "restricted",
        retrieved_at=NOW,
    )

    assert result.synthetic is True
    assert result.live_blocker and "REALITY_LEDGER_OVERPASS_CONTACT_URL" in result.live_blocker


def test_evidence_write_failure_leaves_prior_public_artifacts_untouched(
    tmp_path: Path,
) -> None:
    fixture_directory = tmp_path / "fixtures"
    for country, element_id in (("US", 1001), ("CA", 1002), ("MX", 1003)):
        _write_fixture(fixture_directory, country, element_id)
    output_root = tmp_path / "generated"
    inventory_path = output_root / "odbl" / "north-america-facilities.json"
    coverage_json_path = output_root / "reports" / "north-america-coverage.json"
    coverage_markdown_path = output_root / "reports" / "north-america-coverage.md"
    inventory_path.parent.mkdir(parents=True)
    coverage_json_path.parent.mkdir(parents=True)
    previous = {
        inventory_path: "prior inventory\n",
        coverage_json_path: "prior coverage json\n",
        coverage_markdown_path: "prior coverage markdown\n",
    }
    for path, content in previous.items():
        path.write_text(content, encoding="utf-8")
    restricted_blocker = tmp_path / "restricted-blocker"
    restricted_blocker.write_text("not a directory", encoding="utf-8")

    with pytest.raises(OSError):
        refresh_inventory(
            fixture_directory=fixture_directory,
            output_root=output_root,
            restricted_root=restricted_blocker,
            retrieved_at=NOW,
            fixture_only=True,
        )

    assert {
        path: path.read_text(encoding="utf-8") for path in previous
    } == previous


def test_successful_refresh_atomically_replaces_each_public_artifact(tmp_path: Path) -> None:
    fixture_directory = tmp_path / "fixtures"
    for country, element_id in (("US", 1001), ("CA", 1002), ("MX", 1003)):
        _write_fixture(fixture_directory, country, element_id)
    output_root = tmp_path / "generated"
    restricted_root = tmp_path / "restricted"
    first = refresh_inventory(
        fixture_directory=fixture_directory,
        output_root=output_root,
        restricted_root=restricted_root,
        retrieved_at=NOW,
        fixture_only=True,
    )
    paths = (
        first.inventory_path,
        first.coverage_json_path,
        first.coverage_markdown_path,
    )
    original_inodes = {path: path.stat().st_ino for path in paths}

    second = refresh_inventory(
        fixture_directory=fixture_directory,
        output_root=output_root,
        restricted_root=restricted_root,
        retrieved_at=NOW + timedelta(minutes=5),
        fixture_only=True,
    )

    assert all(path.stat().st_ino != original_inodes[path] for path in paths)
    assert all(path.read_text(encoding="utf-8") for path in paths)
    assert not tuple(output_root.rglob("*.tmp-*"))
    assert second.restricted_evidence_count == 3
