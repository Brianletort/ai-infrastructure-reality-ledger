import hashlib
import json
import tempfile
from datetime import UTC, datetime
from pathlib import Path

from reality_ledger_worker.deep_metro_cli import generate_deep_metro_artifacts
from reality_ledger_worker.entity_resolution import (
    EntityCandidate,
    KnownEntity,
    ResolutionOutcome,
    resolve_entity,
)
from reality_ledger_worker.inventory_cli import refresh_inventory

REPOSITORY_ROOT = Path(__file__).parents[1]
ARTIFACT_PATH = REPOSITORY_ROOT / "evaluations" / "artifacts" / "data-quality-python.json"
FIXED_TIME = datetime(2026, 8, 29, 23, tzinfo=UTC)
PRECISION_THRESHOLD = 0.95


def _hash_tree(root: Path) -> dict[str, str]:
    return {
        str(path.relative_to(root)): hashlib.sha256(path.read_bytes()).hexdigest()
        for path in sorted(root.rglob("*"))
        if path.is_file()
    }


def _determinism_result() -> dict[str, object]:
    with tempfile.TemporaryDirectory() as first_raw, tempfile.TemporaryDirectory() as second_raw:
        first = Path(first_raw)
        second = Path(second_raw)
        generate_deep_metro_artifacts(output_root=first, generated_at=FIXED_TIME)
        generate_deep_metro_artifacts(output_root=second, generated_at=FIXED_TIME)
        refresh_inventory(
            output_root=first,
            restricted_root=first / "restricted",
            retrieved_at=FIXED_TIME,
            fixture_only=True,
        )
        refresh_inventory(
            output_root=second,
            restricted_root=second / "restricted",
            retrieved_at=FIXED_TIME,
            fixture_only=True,
        )
        first_hashes = _hash_tree(first)
        second_hashes = _hash_tree(second)
    passed = first_hashes == second_hashes and len(first_hashes) > 0
    return {
        "id": "data.deterministic-generation",
        "status": "pass" if passed else "fail",
        "detail": (
            "Two independent fixed-time generations were byte-identical."
            if passed
            else "Fixed-time generation produced different artifact hashes."
        ),
        "evidence": {"artifactCount": len(first_hashes), "sha256": first_hashes},
    }


def _entity_resolution_result() -> dict[str, object]:
    entities = (
        KnownEntity(
            entity_id="alpha",
            name="Synthetic Alpha Campus",
            aliases=("Alpha DC",),
            normalized_address="100 Example Road",
            identifiers={"fixture": "A-1"},
            latitude=38.9,
            longitude=-77.4,
        ),
        KnownEntity(
            entity_id="beta",
            name="Synthetic Beta Campus",
            aliases=("Beta Compute",),
            normalized_address="200 Example Road",
            identifiers={"fixture": "B-1"},
            latitude=32.9,
            longitude=-97.0,
        ),
        KnownEntity(
            entity_id="gamma",
            name="Synthetic Gamma Campus",
            aliases=("Gamma Compute",),
            normalized_address="300 Example Road",
            identifiers={"fixture": "G-1"},
            latitude=43.7,
            longitude=-79.4,
        ),
    )
    gold = (
        (EntityCandidate("Alpha DC", identifiers={"fixture": "A-1"}), "alpha"),
        (EntityCandidate("Synthetic Beta Campus", address="200 Example Road"), "beta"),
        (
            EntityCandidate(
                "Gamma Compute",
                latitude=43.7001,
                longitude=-79.4001,
            ),
            "gamma",
        ),
        (
            EntityCandidate(
                "Synthetic Alpha Campus",
                address="100 Example Road",
                latitude=38.9001,
                longitude=-77.4001,
            ),
            "alpha",
        ),
        (EntityCandidate("No matching synthetic entity"), None),
    )
    predictions = []
    resolved_predictions = 0
    correct_resolved_predictions = 0
    for candidate, expected in gold:
        resolved = resolve_entity(candidate, entities)
        predicted = (
            resolved.entity_id if resolved.outcome is ResolutionOutcome.RESOLVED else None
        )
        predictions.append(
            {
                "candidate": candidate.name,
                "expected": expected,
                "predicted": predicted,
                "outcome": resolved.outcome.value,
            }
        )
        if predicted is not None:
            resolved_predictions += 1
            if predicted == expected:
                correct_resolved_predictions += 1
    precision = (
        correct_resolved_predictions / resolved_predictions
        if resolved_predictions > 0
        else 0.0
    )
    passed = precision >= PRECISION_THRESHOLD
    return {
        "id": "data.entity-resolution-synthetic-gold",
        "status": "pass" if passed else "fail",
        "detail": (
            f"Synthetic labeled-set precision {precision:.3f}; threshold "
            f"{PRECISION_THRESHOLD:.3f}. This is not real-world precision."
        ),
        "evidence": {
            "dataset": "labeled synthetic gold set only",
            "isRealWorldPrecision": False,
            "precision": precision,
            "resolvedPredictions": resolved_predictions,
            "correctResolvedPredictions": correct_resolved_predictions,
            "predictions": predictions,
        },
    }


def main() -> int:
    ARTIFACT_PATH.parent.mkdir(parents=True, exist_ok=True)
    results = [_determinism_result(), _entity_resolution_result()]
    counts = {
        status: sum(result["status"] == status for result in results)
        for status in ("pass", "fail", "inconclusive")
    }
    report = {
        "schemaVersion": "1.0.0",
        "generatedAt": datetime.now(tz=UTC).isoformat(),
        "summary": {
            "decision": "fail" if counts["fail"] else "pass",
            "counts": counts,
        },
        "results": results,
    }
    ARTIFACT_PATH.write_text(
        json.dumps(report, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(report["summary"], sort_keys=True))
    return 1 if counts["fail"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
