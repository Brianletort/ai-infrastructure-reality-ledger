import argparse
import json
import sys
from dataclasses import dataclass, replace
from datetime import UTC, datetime
from pathlib import Path
from typing import cast

from reality_ledger_worker.inventory import (
    CountryCode,
    OverpassClient,
    OverpassFetcher,
    build_coverage_report,
    fetch_live_country_payloads,
    generate_inventory,
    write_public_artifacts,
    write_restricted_evidence,
)

REPOSITORY_ROOT = Path(__file__).parents[4]
DEFAULT_FIXTURE_DIRECTORY = REPOSITORY_ROOT / "sources" / "fixtures" / "osm-overpass-v1"
DEFAULT_OUTPUT_ROOT = REPOSITORY_ROOT / "data"
DEFAULT_RESTRICTED_ROOT = REPOSITORY_ROOT / ".local" / "restricted-evidence" / "osm-overpass-v1"


@dataclass(frozen=True)
class RefreshResult:
    synthetic: bool
    real_record_count: int
    synthetic_record_count: int
    live_blocker: str | None
    inventory_path: Path
    coverage_json_path: Path
    coverage_markdown_path: Path
    restricted_evidence_count: int


def _load_fixture_payloads(directory: Path) -> dict[CountryCode, str]:
    payloads: dict[CountryCode, str] = {}
    for country in ("US", "CA", "MX"):
        path = directory / f"{country.lower()}.json"
        payload = path.read_text(encoding="utf-8")
        decoded = cast(object, json.loads(payload))
        if not isinstance(decoded, dict):
            raise ValueError(f"{path} must be an explicitly synthetic Overpass fixture")
        payload_object = cast(dict[str, object], decoded)
        if payload_object.get("generator") != "Synthetic Overpass fixture":
            raise ValueError(f"{path} must be an explicitly synthetic Overpass fixture")
        payloads[country] = payload
    return payloads


def refresh_inventory(
    *,
    fixture_directory: Path = DEFAULT_FIXTURE_DIRECTORY,
    output_root: Path = DEFAULT_OUTPUT_ROOT,
    restricted_root: Path = DEFAULT_RESTRICTED_ROOT,
    retrieved_at: datetime | None = None,
    live_client: OverpassFetcher | None = None,
    fixture_only: bool = False,
) -> RefreshResult:
    timestamp = retrieved_at or datetime.now(tz=UTC)
    live_blocker: str | None = None
    synthetic = fixture_only
    if fixture_only:
        live_blocker = "live retrieval intentionally skipped (--fixture-only)"
        payloads = _load_fixture_payloads(fixture_directory)
    else:
        try:
            payloads = fetch_live_country_payloads(live_client or OverpassClient())
        except (OSError, RuntimeError, TimeoutError, ValueError) as error:
            live_blocker = str(error)
            synthetic = True
            payloads = _load_fixture_payloads(fixture_directory)

    dataset = generate_inventory(payloads, retrieved_at=timestamp, synthetic=synthetic)
    if live_blocker:
        dataset = replace(
            dataset,
            limitations=(
                *dataset.limitations,
                f"Live ingestion blocker recorded for this generation: {live_blocker}",
            ),
        )
    coverage = build_coverage_report(dataset)
    inventory_path = output_root / "odbl" / "north-america-facilities.json"
    coverage_json_path = output_root / "reports" / "north-america-coverage.json"
    coverage_markdown_path = output_root / "reports" / "north-america-coverage.md"
    restricted_count = write_restricted_evidence(dataset, restricted_root)
    write_public_artifacts(
        dataset,
        coverage,
        inventory_path=inventory_path,
        coverage_json_path=coverage_json_path,
        coverage_markdown_path=coverage_markdown_path,
    )
    return RefreshResult(
        synthetic=synthetic,
        real_record_count=0 if synthetic else len(dataset.records),
        synthetic_record_count=len(dataset.records) if synthetic else 0,
        live_blocker=live_blocker,
        inventory_path=inventory_path,
        coverage_json_path=coverage_json_path,
        coverage_markdown_path=coverage_markdown_path,
        restricted_evidence_count=restricted_count,
    )


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="reality-ledger-inventory",
        description="Refresh the bounded North America facility inventory.",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)
    refresh = subparsers.add_parser("refresh")
    refresh.add_argument(
        "--fixture-only",
        action="store_true",
        help="Skip live Overpass and deterministically generate the synthetic fallback.",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    arguments = _parser().parse_args(argv)
    if arguments.command != "refresh":
        return 2
    result = refresh_inventory(fixture_only=bool(arguments.fixture_only))
    sys.stdout.write(
        json.dumps(
            {
                "mode": "synthetic" if result.synthetic else "live",
                "realRecordCount": result.real_record_count,
                "syntheticRecordCount": result.synthetic_record_count,
                "liveBlocker": result.live_blocker,
                "inventoryPath": str(result.inventory_path),
                "coverageJsonPath": str(result.coverage_json_path),
                "coverageMarkdownPath": str(result.coverage_markdown_path),
                "restrictedEvidenceWritten": result.restricted_evidence_count,
            },
            sort_keys=True,
        )
        + "\n"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
