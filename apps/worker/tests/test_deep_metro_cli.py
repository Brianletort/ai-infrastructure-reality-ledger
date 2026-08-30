import json
from datetime import UTC, datetime
from pathlib import Path

from reality_ledger_worker.deep_metro import CORPUS_MODE, CORPUS_WARNING
from reality_ledger_worker.deep_metro_cli import generate_deep_metro_artifacts

NOW = datetime(2026, 8, 29, 18, tzinfo=UTC)


def test_generation_writes_reviewed_corpus_and_four_reconciling_reports(
    tmp_path: Path,
) -> None:
    result = generate_deep_metro_artifacts(output_root=tmp_path, generated_at=NOW)

    corpus = json.loads(result.corpus_path.read_text(encoding="utf-8"))
    assert corpus["corpusMode"] == CORPUS_MODE
    assert corpus["warning"] == CORPUS_WARNING
    assert len(corpus["timelines"]) == 100
    assert all(timeline["synthetic"] is True for timeline in corpus["timelines"])
    assert all(timeline["publicFactApproved"] is False for timeline in corpus["timelines"])
    assert len(result.report_json_paths) == 4
    assert len(result.report_markdown_paths) == 4

    for report_path in result.report_json_paths:
        report = json.loads(report_path.read_text(encoding="utf-8"))
        assert report["timelineCount"] == 25
        assert report["corpusMode"] == CORPUS_MODE
        assert report["warning"] == CORPUS_WARNING
        assert report["approvedSyntheticReviewCount"] == 25
        assert report["publicFactApprovalCount"] == 0

    for report_path in result.report_markdown_paths:
        report_markdown = report_path.read_text(encoding="utf-8")
        assert CORPUS_WARNING in report_markdown
        assert "25" in report_markdown
        assert "Public-fact approvals | 0" in report_markdown


def test_generation_is_byte_deterministic_for_fixed_timestamp(tmp_path: Path) -> None:
    first = generate_deep_metro_artifacts(output_root=tmp_path, generated_at=NOW)
    first_bytes = {
        path.relative_to(tmp_path): path.read_bytes()
        for path in (
            first.corpus_path,
            *first.report_json_paths,
            *first.report_markdown_paths,
        )
    }

    second = generate_deep_metro_artifacts(output_root=tmp_path, generated_at=NOW)
    second_bytes = {
        path.relative_to(tmp_path): path.read_bytes()
        for path in (
            second.corpus_path,
            *second.report_json_paths,
            *second.report_markdown_paths,
        )
    }

    assert second_bytes == first_bytes
