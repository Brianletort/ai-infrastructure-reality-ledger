import argparse
import json
import os
import sys
from dataclasses import dataclass, fields, is_dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import cast

from reality_ledger_worker.deep_metro import (
    CORPUS_WARNING,
    METROS,
    MetroReport,
    build_corpus,
    build_metro_report,
)

REPOSITORY_ROOT = Path(__file__).parents[4]
DEFAULT_OUTPUT_ROOT = REPOSITORY_ROOT / "data"
FIXED_BETA_GENERATED_AT = datetime(2026, 8, 29, 23, tzinfo=UTC)


@dataclass(frozen=True)
class GenerationResult:
    corpus_path: Path
    report_json_paths: tuple[Path, ...]
    report_markdown_paths: tuple[Path, ...]
    timeline_count: int
    real_timeline_count: int
    synthetic_timeline_count: int


def _camel_case(value: str) -> str:
    first, *rest = value.split("_")
    return first + "".join(part.capitalize() for part in rest)


def _jsonable(value: object) -> object:
    if is_dataclass(value) and not isinstance(value, type):
        return {
            _camel_case(field.name): _jsonable(getattr(value, field.name))
            for field in fields(value)
        }
    if isinstance(value, (tuple, list)):
        sequence = cast(tuple[object, ...] | list[object], value)
        return [_jsonable(item) for item in sequence]
    if isinstance(value, dict):
        mapping = cast(dict[object, object], value)
        return {str(key): _jsonable(item) for key, item in mapping.items()}
    return value


def _atomic_write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary_path = path.with_name(f".{path.name}.tmp-{os.getpid()}")
    try:
        temporary_path.write_text(content, encoding="utf-8")
        os.replace(temporary_path, path)
    finally:
        temporary_path.unlink(missing_ok=True)


def _json_text(value: object) -> str:
    return json.dumps(_jsonable(value), indent=2, sort_keys=True, ensure_ascii=False) + "\n"


def _markdown_report(report: MetroReport) -> str:
    event_distribution = "\n".join(
        f"| {event_type} | {count} |"
        for event_type, count in report.event_distribution.items()
    )
    state_distribution = "\n".join(
        f"| {state} | {count} |" for state, count in report.state_distribution.items()
    )
    source_modes = "\n".join(
        f"| {mode} | {count} |" for mode, count in report.source_mode_distribution.items()
    )
    missingness = (
        "\n".join(
            f"| {field} | {count} |"
            for field, count in report.missingness_distribution.items()
        )
        or "| none | 0 |"
    )
    return f"""# {report.metro.name} deep-metro reviewed beta report

> **{CORPUS_WARNING}**

This report describes deterministic test fixtures only. It contains no approved public factual
timeline and must not be represented as a real facility inventory.

## Review summary

| Metric | Value |
| --- | ---: |
| Timelines | {report.timeline_count} |
| Approved synthetic reviews | {report.approved_synthetic_review_count} |
| Public-fact approvals | {report.public_fact_approval_count} |
| Failed reviews | {report.failed_review_count} |
| Pending reviews | {report.pending_review_count} |
| Citation completeness | {report.citation_completeness:.3f} |
| Conflicts | {report.conflict_count} |
| Activation precision proxy | {report.activation_precision_proxy:.3f} |

The activation precision proxy is a policy check over synthetic fixtures: the share of activation
events with at least two independent signals, at least one authoritative source, and at least one
non-imagery signal. It is not an empirical estimate of real-world precision.

## Event distribution

| Event | Count |
| --- | ---: |
{event_distribution}

## Lifecycle-state distribution

| State | Count |
| --- | ---: |
{state_distribution}

## Source-mode distribution

| Source mode | Evidence packets |
| --- | ---: |
{source_modes}

## Explicit missingness

| Missing field/scenario | Timelines |
| --- | ---: |
{missingness}
"""


def generate_deep_metro_artifacts(
    *,
    output_root: Path = DEFAULT_OUTPUT_ROOT,
    generated_at: datetime = FIXED_BETA_GENERATED_AT,
) -> GenerationResult:
    corpus = build_corpus(generated_at=generated_at)
    corpus_path = output_root / "corpus" / "deep-metro-reviewed-beta.json"
    _atomic_write(corpus_path, _json_text(corpus))
    report_json_paths: list[Path] = []
    report_markdown_paths: list[Path] = []
    for metro in METROS:
        report = build_metro_report(corpus, metro)
        json_path = output_root / "reports" / "deep-metro" / f"{metro.slug}.json"
        markdown_path = output_root / "reports" / "deep-metro" / f"{metro.slug}.md"
        _atomic_write(json_path, _json_text(report))
        _atomic_write(markdown_path, _markdown_report(report))
        report_json_paths.append(json_path)
        report_markdown_paths.append(markdown_path)
    return GenerationResult(
        corpus_path=corpus_path,
        report_json_paths=tuple(report_json_paths),
        report_markdown_paths=tuple(report_markdown_paths),
        timeline_count=len(corpus.timelines),
        real_timeline_count=0,
        synthetic_timeline_count=len(corpus.timelines),
    )


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="reality-ledger-deep-metro",
        description="Generate deterministic reviewed synthetic deep-metro artifacts.",
    )
    parser.add_argument(
        "command",
        choices=("generate",),
        help="Generate the checked-in reviewed synthetic corpus and reports.",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    arguments = _parser().parse_args(argv)
    if arguments.command != "generate":
        return 2
    result = generate_deep_metro_artifacts()
    sys.stdout.write(
        json.dumps(
            {
                "corpusMode": "synthetic-reviewed-beta",
                "corpusPath": str(result.corpus_path),
                "realTimelineCount": result.real_timeline_count,
                "syntheticTimelineCount": result.synthetic_timeline_count,
                "timelineCount": result.timeline_count,
                "warning": CORPUS_WARNING,
            },
            sort_keys=True,
        )
        + "\n"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
