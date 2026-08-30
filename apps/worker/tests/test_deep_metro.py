import json
from dataclasses import replace
from datetime import UTC, datetime
from pathlib import Path

import pytest

from reality_ledger_worker.deep_metro import (
    CORPUS_MODE,
    CORPUS_WARNING,
    METROS,
    EvidenceSignal,
    Reviewer,
    build_corpus,
    build_metro_report,
    check_official_source_fixture,
    load_official_source_configs,
    review_timeline,
)

NOW = datetime(2026, 8, 29, 18, tzinfo=UTC)


def test_corpus_has_exactly_twenty_five_deterministic_timelines_per_metro() -> None:
    first = build_corpus(generated_at=NOW)
    second = build_corpus(generated_at=NOW)

    assert first == second
    assert first.corpus_mode == CORPUS_MODE
    assert first.warning == CORPUS_WARNING
    assert len(first.timelines) == 100
    assert {
        metro.slug: sum(timeline.metro.slug == metro.slug for timeline in first.timelines)
        for metro in METROS
    } == {metro.slug: 25 for metro in METROS}


def test_every_record_is_explicitly_synthetic_and_uses_invalid_citations() -> None:
    corpus = build_corpus(generated_at=NOW)

    assert all(timeline.synthetic is True for timeline in corpus.timelines)
    assert all(timeline.public_fact_approved is False for timeline in corpus.timelines)
    assert all("Synthetic" in timeline.facility_name for timeline in corpus.timelines)
    assert all(
        citation.url.endswith(".invalid")
        for timeline in corpus.timelines
        for packet in timeline.evidence_packets
        for citation in packet.citations
    )
    assert all(
        packet.corpus_mode == CORPUS_MODE
        and packet.warning == CORPUS_WARNING
        and packet.synthetic is True
        and packet.public_fact_approved is False
        for timeline in corpus.timelines
        for packet in timeline.evidence_packets
    )
    assert all(
        event.corpus_mode == CORPUS_MODE
        and event.warning == CORPUS_WARNING
        and event.synthetic is True
        and event.public_fact_approved is False
        for timeline in corpus.timelines
        for event in timeline.events
    )
    assert all(
        timeline.review is not None
        and timeline.review.corpus_mode == CORPUS_MODE
        and timeline.review.warning == CORPUS_WARNING
        and timeline.review.synthetic is True
        and timeline.review.public_fact_approved is False
        for timeline in corpus.timelines
    )
    assert all(
        citation.corpus_mode == CORPUS_MODE
        and citation.warning == CORPUS_WARNING
        and citation.public_fact_approved is False
        for timeline in corpus.timelines
        for packet in timeline.evidence_packets
        for citation in packet.citations
    )
    assert all(
        signal.corpus_mode == CORPUS_MODE
        and signal.warning == CORPUS_WARNING
        and signal.synthetic is True
        and signal.public_fact_approved is False
        for timeline in corpus.timelines
        for packet in timeline.evidence_packets
        for signal in packet.signals
    )


def test_corpus_exercises_all_required_event_and_missingness_scenarios() -> None:
    corpus = build_corpus(generated_at=NOW)
    event_kinds = {
        event.event_type for timeline in corpus.timelines for event in timeline.events
    }

    assert event_kinds == {
        "announcement",
        "permit",
        "construction",
        "readiness",
        "activation",
        "moratorium_policy",
        "correction",
        "contested",
        "superseded",
        "stale",
        "unknown",
    }
    assert any(timeline.missing for timeline in corpus.timelines)
    assert any(timeline.conflicts for timeline in corpus.timelines)


def test_independent_second_pass_review_is_synthetic_only() -> None:
    corpus = build_corpus(generated_at=NOW)

    for timeline in corpus.timelines:
        review = timeline.review
        assert review is not None
        assert review.status == "approved_synthetic"
        assert review.decision == "approve_synthetic_fixture"
        assert review.reviewer.reviewer_id != timeline.author_id
        assert review.independence.is_independent is True
        assert review.independence.separate_validator_path is True
        assert review.public_fact_approved is False
        assert review.checklist_results
        assert all(result.passed for result in review.checklist_results)


def test_review_fails_closed_for_invalid_citation_and_same_identity() -> None:
    timeline = build_corpus(generated_at=NOW).timelines[0]
    packet = timeline.evidence_packets[0]
    bad_citation = replace(packet.citations[0], url="https://example.com/not-synthetic")
    invalid_citation = replace(
        timeline,
        evidence_packets=(
            replace(packet, citations=(bad_citation, *packet.citations[1:])),
            *timeline.evidence_packets[1:],
        ),
    )

    citation_review = review_timeline(
        invalid_citation,
        Reviewer("validator-independent", "automated-independent-validator"),
        reviewed_at=NOW,
    )
    identity_review = review_timeline(
        timeline,
        Reviewer(timeline.author_id, "automated-independent-validator"),
        reviewed_at=NOW,
    )

    assert citation_review.status == "failed"
    assert "valid_citations" in citation_review.failed_checks
    assert identity_review.status == "failed"
    assert "reviewer_independence" in identity_review.failed_checks


def test_review_fails_closed_for_missing_times_confidence_and_broken_lineage() -> None:
    timeline = next(
        candidate
        for candidate in build_corpus(generated_at=NOW).timelines
        if any(event.event_type == "correction" for event in candidate.events)
    )
    first_event = timeline.events[0]
    missing_time = replace(
        timeline,
        events=(replace(first_event, retrieved_at=""), *timeline.events[1:]),
    )
    first_packet = timeline.evidence_packets[0]
    first_signal = first_packet.signals[0]
    missing_confidence = replace(
        timeline,
        evidence_packets=(
            replace(
                first_packet,
                signals=(
                    replace(
                        first_signal,
                        authority="",
                        directness="",
                        entity_match_confidence=None,
                    ),
                    *first_packet.signals[1:],
                ),
            ),
            *timeline.evidence_packets[1:],
        ),
    )
    correction_index = next(
        index for index, event in enumerate(timeline.events) if event.event_type == "correction"
    )
    broken_events = list(timeline.events)
    broken_events[correction_index] = replace(
        broken_events[correction_index],
        corrects_event_id="event-does-not-exist",
    )

    assert review_timeline(
        missing_time,
        Reviewer("validator-a", "automated-independent-validator"),
        reviewed_at=NOW,
    ).failed_checks == ("required_timestamps",)
    assert review_timeline(
        missing_confidence,
        Reviewer("validator-a", "automated-independent-validator"),
        reviewed_at=NOW,
    ).failed_checks == ("source_confidence",)
    assert review_timeline(
        replace(timeline, events=tuple(broken_events)),
        Reviewer("validator-a", "automated-independent-validator"),
        reviewed_at=NOW,
    ).failed_checks == ("correction_lineage",)


def test_review_fails_closed_when_any_event_lacks_its_evidence_packet() -> None:
    timeline = build_corpus(generated_at=NOW).timelines[0]

    review = review_timeline(
        replace(timeline, evidence_packets=()),
        Reviewer("validator-a", "automated-independent-validator"),
        reviewed_at=NOW,
    )

    assert "evidence_linkage" in review.failed_checks


def test_review_fails_closed_when_event_exact_references_are_empty() -> None:
    timeline = build_corpus(generated_at=NOW).timelines[0]
    event = timeline.events[0]

    review = review_timeline(
        replace(timeline, events=(replace(event, exact_evidence_references=()),)),
        Reviewer("validator-a", "automated-independent-validator"),
        reviewed_at=NOW,
    )

    assert "evidence_linkage" in review.failed_checks


def test_review_fails_closed_when_event_references_do_not_match_packet_citations() -> None:
    timeline = build_corpus(generated_at=NOW).timelines[0]
    event = timeline.events[0]

    review = review_timeline(
        replace(
            timeline,
            events=(replace(event, exact_evidence_references=("fixture:mismatched",)),),
        ),
        Reviewer("validator-a", "automated-independent-validator"),
        reviewed_at=NOW,
    )

    assert "evidence_linkage" in review.failed_checks


def test_activation_requires_independent_signals_and_one_authoritative_non_imagery_signal() -> None:
    timeline = next(
        candidate
        for candidate in build_corpus(generated_at=NOW).timelines
        if any(event.event_type == "activation" for event in candidate.events)
    )
    activation_packet = next(
        packet
        for packet in timeline.evidence_packets
        if packet.event_id
        in {event.event_id for event in timeline.events if event.event_type == "activation"}
    )
    unsupported = replace(
        timeline,
        evidence_packets=tuple(
            replace(packet, signals=(packet.signals[0],))
            if packet.packet_id == activation_packet.packet_id
            else packet
            for packet in timeline.evidence_packets
        ),
    )
    imagery_only = replace(
        timeline,
        evidence_packets=tuple(
            replace(
                packet,
                signals=(
                    EvidenceSignal(
                        signal_id=f"{packet.packet_id}-imagery-a",
                        source_id="synthetic-imagery-a",
                        independence_group="imagery-a",
                        authoritative=True,
                        signal_kind="imagery",
                        authority="primary",
                        directness="direct",
                        entity_match_confidence=0.9,
                    ),
                    EvidenceSignal(
                        signal_id=f"{packet.packet_id}-imagery-b",
                        source_id="synthetic-imagery-b",
                        independence_group="imagery-b",
                        authoritative=True,
                        signal_kind="imagery",
                        authority="primary",
                        directness="direct",
                        entity_match_confidence=0.9,
                    ),
                ),
            )
            if packet.packet_id == activation_packet.packet_id
            else packet
            for packet in timeline.evidence_packets
        ),
    )

    assert "supported_activation" in review_timeline(
        unsupported,
        Reviewer("validator-a", "automated-independent-validator"),
        reviewed_at=NOW,
    ).failed_checks
    assert "supported_activation" in review_timeline(
        imagery_only,
        Reviewer("validator-a", "automated-independent-validator"),
        reviewed_at=NOW,
    ).failed_checks


def test_events_are_temporally_sorted_and_report_metrics_reconcile() -> None:
    corpus = build_corpus(generated_at=NOW)

    for timeline in corpus.timelines:
        sort_keys = [
            (event.valid_from, event.asserted_at, event.event_id) for event in timeline.events
        ]
        assert sort_keys == sorted(sort_keys)

    report = build_metro_report(corpus, METROS[0])
    assert report.timeline_count == 25
    assert sum(report.event_distribution.values()) == sum(
        len(timeline.events)
        for timeline in corpus.timelines
        if timeline.metro == METROS[0]
    )
    assert report.citation_completeness == 1.0
    assert report.failed_review_count == 0
    assert report.pending_review_count == 0
    assert 0.0 <= report.activation_precision_proxy <= 1.0
    assert report.corpus_mode == CORPUS_MODE
    assert report.warning == CORPUS_WARNING


def test_official_sources_are_link_only_or_manual_without_unverified_endpoints(
    tmp_path: Path,
) -> None:
    manifest_path = tmp_path / "deep-metro-official-sources.json"
    manifest_path.write_text(
        """
[
  {
    "protocolVersion": "1.0",
    "adapterId": "official-manual",
    "metroSlug": "northern-virginia",
    "name": "Official manual source",
    "sourceUrl": "https://official.example.invalid/landing",
    "publisher": "Synthetic authority",
    "mode": "manual-link-only",
    "machineEndpoint": null,
    "authority": "primary",
    "directness": "near-direct",
    "limitations": "Landing page only.",
    "prohibitsInteractiveScraping": true
  }
]
""".strip(),
        encoding="utf-8",
    )

    configs = load_official_source_configs(manifest_path)
    health = check_official_source_fixture(configs[0], checked_at=NOW)

    assert configs[0].machine_endpoint is None
    assert configs[0].mode == "manual-link-only"
    assert configs[0].prohibits_interactive_scraping is True
    assert health.healthy is True
    assert health.stage == "manual-review-required"
    assert health.records == ()


def test_checked_in_official_source_matrix_uses_only_verified_landing_pages() -> None:
    repository_root = Path(__file__).parents[3]
    configs = load_official_source_configs(
        repository_root / "sources" / "manifests" / "deep-metro-official-sources.json"
    )

    assert len(configs) == 8
    assert {config.metro_slug for config in configs} == {metro.slug for metro in METROS}
    assert {config.source_url for config in configs} == {
        "https://www.loudoun.gov/landmarc",
        "https://www.loudoun.gov/5037/Open-Government-Property-and-Land-Use",
        "https://dallascityhall.com/departments/sustainabledevelopment/Pages/DallasNow.aspx",
        (
            "https://dallascityhall.com/departments/sustainabledevelopment/"
            "buildinginspection/Pages/commercial_overview.aspx"
        ),
        "https://phoenixopendata.com/pages/tips",
        "https://www.phoenixopendata.com/dataset/phoenix-az-building-permit-data",
        "https://open.toronto.ca/",
        "https://open.toronto.ca/dataset/building-permits-active-permits/",
    }
    assert all(config.mode == "manual-link-only" for config in configs)
    assert all(config.machine_endpoint is None for config in configs)
    assert all(config.limitations for config in configs)


def test_python_official_source_validation_matches_typescript_machine_endpoint_gate(
    tmp_path: Path,
) -> None:
    manifest_path = tmp_path / "official-source.json"
    valid_machine_config: dict[str, object] = {
        "protocolVersion": "1.0",
        "adapterId": "verified-machine-fixture-v1",
        "metroSlug": "phoenix",
        "name": "Verified machine fixture",
        "sourceUrl": "https://official.example.invalid/landing",
        "publisher": "Synthetic authority",
        "mode": "verified-machine-endpoint",
        "machineEndpoint": "https://official.example.invalid/api",
        "authority": "primary",
        "directness": "direct",
        "limitations": "Synthetic parity fixture only.",
        "prohibitsInteractiveScraping": True,
    }
    manifest_path.write_text(json.dumps([valid_machine_config]), encoding="utf-8")

    config = load_official_source_configs(manifest_path)[0]
    health = check_official_source_fixture(config, checked_at=NOW)

    assert health.healthy is False
    assert health.stage == "fixture-required"
    assert health.issue == (
        "Verified machine endpoint adapters require an offline fixture before use."
    )

    invalid_cases = (
        (
            {"machineEndpoint": None},
            "verified-machine-endpoint sources require an HTTPS machineEndpoint",
        ),
        (
            {"machineEndpoint": "http://official.example.invalid/api"},
            "verified-machine-endpoint sources require an HTTPS machineEndpoint",
        ),
        ({"authority": "self-asserted"}, "authority is invalid"),
        ({"directness": "speculative"}, "directness is invalid"),
        (
            {
                "mode": "manual-link-only",
                "machineEndpoint": "https://official.example.invalid/api",
            },
            "manual-link-only sources cannot declare a machineEndpoint",
        ),
        ({"mode": "fixture-only"}, "mode is invalid"),
        ({"machineEndpoint": 42}, "machineEndpoint must be a string or null"),
    )
    for changes, message in invalid_cases:
        manifest_path.write_text(
            json.dumps([{**valid_machine_config, **changes}]),
            encoding="utf-8",
        )
        with pytest.raises(ValueError, match=message):
            load_official_source_configs(manifest_path)
