import json
from collections import Counter
from dataclasses import dataclass, replace
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Literal, cast
from urllib.parse import urlparse

CorpusMode = Literal["synthetic-reviewed-beta"]
EventType = Literal[
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
]
LifecycleState = Literal[
    "announced",
    "permitted",
    "under_construction",
    "ready",
    "active",
    "policy_hold",
    "corrected",
    "contested",
    "superseded",
    "stale",
    "unknown",
]
ReviewStatus = Literal["approved_synthetic", "failed", "pending"]
ReviewDecision = Literal["approve_synthetic_fixture", "reject", "pending"]
ReviewerType = Literal["automated-independent-validator", "human-independent-reviewer"]
SourceMode = Literal["synthetic-fixture", "manual-link-only", "verified-machine-endpoint"]

CORPUS_MODE: CorpusMode = "synthetic-reviewed-beta"
CORPUS_WARNING = (
    "SYNTHETIC REVIEWED BETA CORPUS — NOT PUBLIC FACTUAL DATA. "
    "Do not use these records as evidence of real facilities or events."
)
GENERATOR_AUTHOR_ID = "deep-metro-fixture-generator-v1"
VALIDATOR_ID = "deep-metro-independent-validator-v1"
VALIDATOR_TYPE: ReviewerType = "automated-independent-validator"


@dataclass(frozen=True)
class Metro:
    slug: str
    name: str
    country_code: str
    region: str


METROS = (
    Metro("northern-virginia", "Northern Virginia", "US", "Virginia"),
    Metro("dallas-fort-worth", "Dallas\u2013Fort Worth", "US", "Texas"),
    Metro("phoenix", "Phoenix", "US", "Arizona"),
    Metro("toronto", "Toronto", "CA", "Ontario"),
)


@dataclass(frozen=True)
class Citation:
    citation_id: str
    source_id: str
    title: str
    url: str
    exact_reference: str
    source_published_at: str
    retrieved_at: str
    synthetic: bool
    corpus_mode: CorpusMode = CORPUS_MODE
    warning: str = CORPUS_WARNING
    public_fact_approved: bool = False


@dataclass(frozen=True)
class EvidenceSignal:
    signal_id: str
    source_id: str
    independence_group: str
    authoritative: bool
    signal_kind: str
    authority: str
    directness: str
    entity_match_confidence: float | None
    synthetic: bool = True
    corpus_mode: CorpusMode = CORPUS_MODE
    warning: str = CORPUS_WARNING
    public_fact_approved: bool = False


@dataclass(frozen=True)
class EvidencePacket:
    packet_id: str
    timeline_id: str
    event_id: str
    source_mode: SourceMode
    citations: tuple[Citation, ...]
    signals: tuple[EvidenceSignal, ...]
    synthetic: bool
    corpus_mode: CorpusMode
    warning: str
    public_fact_approved: bool = False


@dataclass(frozen=True)
class TimelineEvent:
    event_id: str
    event_type: EventType
    lifecycle_state: LifecycleState
    summary: str
    valid_from: str
    valid_to: str | None
    asserted_at: str
    source_published_at: str
    retrieved_at: str
    evidence_packet_id: str
    exact_evidence_references: tuple[str, ...]
    corrects_event_id: str | None = None
    supersedes_event_id: str | None = None
    synthetic: bool = True
    corpus_mode: CorpusMode = CORPUS_MODE
    warning: str = CORPUS_WARNING
    public_fact_approved: bool = False


@dataclass(frozen=True)
class Reviewer:
    reviewer_id: str
    reviewer_type: ReviewerType


@dataclass(frozen=True)
class ReviewerIndependence:
    is_independent: bool
    separate_validator_path: bool
    rationale: str


@dataclass(frozen=True)
class ChecklistResult:
    check_id: str
    passed: bool
    note: str


@dataclass(frozen=True)
class ReviewRecord:
    review_id: str
    reviewer: Reviewer
    reviewed_at: str
    status: ReviewStatus
    decision: ReviewDecision
    independence: ReviewerIndependence
    checklist_results: tuple[ChecklistResult, ...]
    failed_checks: tuple[str, ...]
    adjudication_notes: tuple[str, ...]
    public_fact_approved: bool
    synthetic: bool = True
    corpus_mode: CorpusMode = CORPUS_MODE
    warning: str = CORPUS_WARNING


@dataclass(frozen=True)
class ReviewedTimeline:
    timeline_id: str
    metro: Metro
    facility_name: str
    author_id: str
    events: tuple[TimelineEvent, ...]
    evidence_packets: tuple[EvidencePacket, ...]
    review: ReviewRecord | None
    conflicts: tuple[str, ...]
    missing: tuple[str, ...]
    synthetic: bool
    public_fact_approved: bool
    corpus_mode: CorpusMode
    warning: str


@dataclass(frozen=True)
class ReviewedCorpus:
    corpus_version: str
    corpus_mode: CorpusMode
    warning: str
    generated_at: str
    timelines: tuple[ReviewedTimeline, ...]


@dataclass(frozen=True)
class MetroReport:
    metro: Metro
    corpus_mode: CorpusMode
    warning: str
    timeline_count: int
    event_distribution: dict[str, int]
    state_distribution: dict[str, int]
    source_mode_distribution: dict[str, int]
    citation_completeness: float
    conflict_count: int
    missingness_distribution: dict[str, int]
    failed_review_count: int
    pending_review_count: int
    approved_synthetic_review_count: int
    public_fact_approval_count: int
    activation_precision_proxy: float


@dataclass(frozen=True)
class OfficialSourceConfig:
    protocol_version: str
    adapter_id: str
    metro_slug: str
    name: str
    source_url: str
    publisher: str
    mode: SourceMode
    machine_endpoint: str | None
    authority: str
    directness: str
    limitations: str
    prohibits_interactive_scraping: bool


@dataclass(frozen=True)
class OfficialSourceHealth:
    adapter_id: str
    protocol_version: str
    checked_at: str
    healthy: bool
    stage: str
    records: tuple[object, ...]
    issue: str | None


EVENT_STATE: dict[EventType, LifecycleState] = {
    "announcement": "announced",
    "permit": "permitted",
    "construction": "under_construction",
    "readiness": "ready",
    "activation": "active",
    "moratorium_policy": "policy_hold",
    "correction": "corrected",
    "contested": "contested",
    "superseded": "superseded",
    "stale": "stale",
    "unknown": "unknown",
}


def _iso(value: datetime) -> str:
    return value.astimezone(UTC).isoformat().replace("+00:00", "Z")


def _scenario_event_types(index: int) -> tuple[EventType, ...]:
    event_types: list[EventType] = ["announcement"]
    if index % 2 == 0:
        event_types.append("permit")
    if index % 3 == 0:
        event_types.append("construction")
    if index % 4 == 0:
        event_types.append("readiness")
    if index % 5 == 0:
        event_types.append("activation")
    if index % 6 == 0:
        event_types.append("moratorium_policy")
    if index % 7 == 0:
        event_types.append("contested")
    if index % 8 == 0:
        event_types.append("stale")
    if index % 9 == 0:
        event_types.append("unknown")
    if index % 10 == 0:
        event_types.extend(("superseded", "correction"))
    return tuple(event_types)


def _build_event(
    *,
    metro: Metro,
    timeline_id: str,
    index: int,
    position: int,
    event_type: EventType,
    base_time: datetime,
    prior_event_ids: tuple[str, ...],
) -> tuple[TimelineEvent, EvidencePacket]:
    event_id = f"{timeline_id}-event-{position:02d}-{event_type}"
    packet_id = f"{timeline_id}-packet-{position:02d}"
    valid_from = base_time + timedelta(days=position * 12)
    source_published_at = valid_from + timedelta(days=1)
    retrieved_at = source_published_at + timedelta(days=1)
    asserted_at = retrieved_at + timedelta(hours=1)
    signal_count = 2 if event_type == "activation" else 1
    signals = tuple(
        EvidenceSignal(
            signal_id=f"{packet_id}-signal-{signal_index}",
            source_id=f"{packet_id}-source-{signal_index}",
            independence_group=f"{packet_id}-publisher-{signal_index}",
            authoritative=signal_index == 1,
            signal_kind="official-record" if signal_index == 1 else "operator-statement",
            authority="primary" if signal_index == 1 else "secondary",
            directness="direct" if signal_index == 1 else "near-direct",
            entity_match_confidence=0.97 if signal_index == 1 else 0.88,
        )
        for signal_index in range(1, signal_count + 1)
    )
    citations = tuple(
        Citation(
            citation_id=f"{packet_id}-citation-{signal_index}",
            source_id=signal.source_id,
            title=(
                f"Synthetic {metro.name} {event_type.replace('_', ' ')} "
                f"fixture reference {index:02d}.{signal_index}"
            ),
            url=(
                f"https://{metro.slug}-{index:02d}-{event_type.replace('_', '-')}-"
                f"{signal_index}.invalid"
            ),
            exact_reference=f"fixture:{timeline_id}:{event_type}:{signal_index}",
            source_published_at=_iso(source_published_at),
            retrieved_at=_iso(retrieved_at),
            synthetic=True,
        )
        for signal_index, signal in enumerate(signals, start=1)
    )
    exact_references = tuple(citation.exact_reference for citation in citations)
    corrects_event_id = prior_event_ids[-1] if event_type == "correction" else None
    supersedes_event_id = prior_event_ids[0] if event_type == "superseded" else None
    event = TimelineEvent(
        event_id=event_id,
        event_type=event_type,
        lifecycle_state=EVENT_STATE[event_type],
        summary=(
            f"Synthetic {event_type.replace('_', ' ')} scenario for deterministic beta review."
        ),
        valid_from=_iso(valid_from),
        valid_to=None,
        asserted_at=_iso(asserted_at),
        source_published_at=_iso(source_published_at),
        retrieved_at=_iso(retrieved_at),
        evidence_packet_id=packet_id,
        exact_evidence_references=exact_references,
        corrects_event_id=corrects_event_id,
        supersedes_event_id=supersedes_event_id,
    )
    packet = EvidencePacket(
        packet_id=packet_id,
        timeline_id=timeline_id,
        event_id=event_id,
        source_mode="synthetic-fixture",
        citations=citations,
        signals=signals,
        synthetic=True,
        corpus_mode=CORPUS_MODE,
        warning=CORPUS_WARNING,
    )
    return event, packet


def _build_unreviewed_timeline(metro: Metro, index: int) -> ReviewedTimeline:
    timeline_id = f"synthetic-{metro.slug}-{index:02d}"
    base_time = datetime(2023, 1, 1, tzinfo=UTC) + timedelta(days=index * 20)
    events: list[TimelineEvent] = []
    packets: list[EvidencePacket] = []
    for position, event_type in enumerate(_scenario_event_types(index), start=1):
        event, packet = _build_event(
            metro=metro,
            timeline_id=timeline_id,
            index=index,
            position=position,
            event_type=event_type,
            base_time=base_time,
            prior_event_ids=tuple(existing.event_id for existing in events),
        )
        events.append(event)
        packets.append(packet)
    events.sort(key=lambda event: (event.valid_from, event.asserted_at, event.event_id))
    conflicts = ("synthetic_conflicting_readiness_signals",) if index % 7 == 0 else ()
    missing = ("synthetic_activation_not_asserted",) if index % 5 != 0 else ()
    return ReviewedTimeline(
        timeline_id=timeline_id,
        metro=metro,
        facility_name=f"Synthetic {metro.name} Campus {index:02d}",
        author_id=GENERATOR_AUTHOR_ID,
        events=tuple(events),
        evidence_packets=tuple(packets),
        review=None,
        conflicts=conflicts,
        missing=missing,
        synthetic=True,
        public_fact_approved=False,
        corpus_mode=CORPUS_MODE,
        warning=CORPUS_WARNING,
    )


def _valid_timestamp(value: str) -> bool:
    if not value:
        return False
    try:
        datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return False
    return True


def _check_citations(timeline: ReviewedTimeline) -> bool:
    if not timeline.evidence_packets:
        return False
    for packet in timeline.evidence_packets:
        if not packet.citations:
            return False
        for citation in packet.citations:
            parsed = urlparse(citation.url)
            if (
                not citation.title.strip()
                or not citation.exact_reference.strip()
                or parsed.scheme != "https"
                or not parsed.hostname
            ):
                return False
            if timeline.synthetic and not parsed.hostname.endswith(".invalid"):
                return False
            if not timeline.synthetic and parsed.hostname.endswith(".invalid"):
                return False
    return True


def _check_timestamps(timeline: ReviewedTimeline) -> bool:
    return all(
        all(
            _valid_timestamp(value)
            for value in (
                event.valid_from,
                event.asserted_at,
                event.source_published_at,
                event.retrieved_at,
            )
        )
        for event in timeline.events
    )


def _check_source_confidence(timeline: ReviewedTimeline) -> bool:
    valid_authority = {"primary", "authoritative-secondary", "secondary", "aggregator", "unknown"}
    valid_directness = {"direct", "near-direct", "indirect", "unknown"}
    return all(
        signal.authority in valid_authority
        and signal.directness in valid_directness
        and signal.entity_match_confidence is not None
        and 0.0 <= signal.entity_match_confidence <= 1.0
        for packet in timeline.evidence_packets
        for signal in packet.signals
    )


def _check_evidence_linkage(timeline: ReviewedTimeline) -> bool:
    packet_by_id = {packet.packet_id: packet for packet in timeline.evidence_packets}
    if len(packet_by_id) != len(timeline.evidence_packets):
        return False
    for event in timeline.events:
        packet = packet_by_id.get(event.evidence_packet_id)
        if (
            packet is None
            or packet.timeline_id != timeline.timeline_id
            or packet.event_id != event.event_id
            or not event.exact_evidence_references
            or any(not reference.strip() for reference in event.exact_evidence_references)
        ):
            return False
        citation_references = tuple(citation.exact_reference for citation in packet.citations)
        if event.exact_evidence_references != citation_references:
            return False
    return True


def _activation_packet_supported(packet: EvidencePacket) -> bool:
    independence_groups = {signal.independence_group for signal in packet.signals}
    return (
        len(packet.signals) >= 2
        and len(independence_groups) >= 2
        and any(signal.authoritative for signal in packet.signals)
        and any(signal.signal_kind != "imagery" for signal in packet.signals)
    )


def _check_activation(timeline: ReviewedTimeline) -> bool:
    packet_by_id = {packet.packet_id: packet for packet in timeline.evidence_packets}
    return all(
        event.evidence_packet_id in packet_by_id
        and _activation_packet_supported(packet_by_id[event.evidence_packet_id])
        for event in timeline.events
        if event.event_type == "activation"
    )


def _check_correction_lineage(timeline: ReviewedTimeline) -> bool:
    positions = {event.event_id: index for index, event in enumerate(timeline.events)}
    for index, event in enumerate(timeline.events):
        references = tuple(
            reference
            for reference in (event.corrects_event_id, event.supersedes_event_id)
            if reference is not None
        )
        if event.event_type == "correction" and event.corrects_event_id is None:
            return False
        if any(
            reference not in positions or positions[reference] >= index
            for reference in references
        ):
            return False
    return True


def review_timeline(
    timeline: ReviewedTimeline,
    reviewer: Reviewer,
    *,
    reviewed_at: datetime,
) -> ReviewRecord:
    independence_passed = reviewer.reviewer_id != timeline.author_id
    checks = (
        ChecklistResult(
            "valid_citations",
            _check_citations(timeline),
            "Citations are exact, HTTPS, and match corpus mode.",
        ),
        ChecklistResult(
            "supported_activation",
            _check_activation(timeline),
            (
                "Activation requires independent signals and an authoritative source; "
                "imagery alone fails."
            ),
        ),
        ChecklistResult(
            "required_timestamps",
            _check_timestamps(timeline),
            "Valid, assertion, source-publication, and retrieval times are required.",
        ),
        ChecklistResult(
            "source_confidence",
            _check_source_confidence(timeline),
            "Authority, directness, and entity-match confidence are required.",
        ),
        ChecklistResult(
            "evidence_linkage",
            _check_evidence_linkage(timeline),
            "Every event must match a linked packet and its exact citation references.",
        ),
        ChecklistResult(
            "correction_lineage",
            _check_correction_lineage(timeline),
            "Correction and supersession references must point to earlier events.",
        ),
        ChecklistResult(
            "reviewer_independence",
            independence_passed,
            "Reviewer identity must differ from author identity.",
        ),
    )
    failed_checks = tuple(result.check_id for result in checks if not result.passed)
    approved = not failed_checks and timeline.synthetic
    independence = ReviewerIndependence(
        is_independent=independence_passed,
        separate_validator_path=True,
        rationale=(
            "The deterministic generator and fail-closed validator are separate code paths "
            "with distinct identities."
        ),
    )
    return ReviewRecord(
        review_id=f"{timeline.timeline_id}-review-02",
        reviewer=reviewer,
        reviewed_at=_iso(reviewed_at),
        status="approved_synthetic" if approved else "failed",
        decision="approve_synthetic_fixture" if approved else "reject",
        independence=independence,
        checklist_results=checks,
        failed_checks=failed_checks,
        adjudication_notes=(
            "Approval applies only to synthetic fixture quality.",
            "This decision does not approve or assert any public fact.",
        ),
        public_fact_approved=False,
    )


def build_corpus(*, generated_at: datetime) -> ReviewedCorpus:
    reviewer = Reviewer(VALIDATOR_ID, VALIDATOR_TYPE)
    timelines: list[ReviewedTimeline] = []
    for metro in METROS:
        for index in range(1, 26):
            unreviewed = _build_unreviewed_timeline(metro, index)
            review = review_timeline(unreviewed, reviewer, reviewed_at=generated_at)
            timelines.append(replace(unreviewed, review=review))
    return ReviewedCorpus(
        corpus_version="deep-metro-reviewed-beta-v1",
        corpus_mode=CORPUS_MODE,
        warning=CORPUS_WARNING,
        generated_at=_iso(generated_at),
        timelines=tuple(timelines),
    )


def build_metro_report(corpus: ReviewedCorpus, metro: Metro) -> MetroReport:
    timelines = tuple(timeline for timeline in corpus.timelines if timeline.metro == metro)
    events = tuple(event for timeline in timelines for event in timeline.events)
    packets = tuple(packet for timeline in timelines for packet in timeline.evidence_packets)
    complete_packets = sum(
        bool(packet.citations)
        and all(citation.exact_reference and citation.url for citation in packet.citations)
        for packet in packets
    )
    activation_packets = tuple(
        packet
        for timeline in timelines
        for event in timeline.events
        for packet in timeline.evidence_packets
        if event.event_type == "activation" and packet.packet_id == event.evidence_packet_id
    )
    activation_precision_proxy = (
        sum(_activation_packet_supported(packet) for packet in activation_packets)
        / len(activation_packets)
        if activation_packets
        else 1.0
    )
    reviews = tuple(timeline.review for timeline in timelines if timeline.review is not None)
    return MetroReport(
        metro=metro,
        corpus_mode=corpus.corpus_mode,
        warning=corpus.warning,
        timeline_count=len(timelines),
        event_distribution=dict(sorted(Counter(event.event_type for event in events).items())),
        state_distribution=dict(sorted(Counter(event.lifecycle_state for event in events).items())),
        source_mode_distribution=dict(
            sorted(Counter(packet.source_mode for packet in packets).items())
        ),
        citation_completeness=complete_packets / len(packets) if packets else 0.0,
        conflict_count=sum(len(timeline.conflicts) for timeline in timelines),
        missingness_distribution=dict(
            sorted(Counter(item for timeline in timelines for item in timeline.missing).items())
        ),
        failed_review_count=sum(review.status == "failed" for review in reviews),
        pending_review_count=sum(review.status == "pending" for review in reviews),
        approved_synthetic_review_count=sum(
            review.status == "approved_synthetic" for review in reviews
        ),
        public_fact_approval_count=sum(review.public_fact_approved for review in reviews),
        activation_precision_proxy=activation_precision_proxy,
    )


def _mapping(value: object, context: str) -> dict[str, object]:
    if not isinstance(value, dict):
        raise ValueError(f"{context} must be an object")
    mapping = cast(dict[object, object], value)
    if not all(isinstance(key, str) for key in mapping):
        raise ValueError(f"{context} keys must be strings")
    return cast(dict[str, object], mapping)


def _required_string(mapping: dict[str, object], key: str) -> str:
    value = mapping.get(key)
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{key} must be a non-empty string")
    return value


def validate_official_source_config(config: OfficialSourceConfig) -> tuple[str, ...]:
    issues: list[str] = []
    if not config.source_url.startswith("https://"):
        issues.append("sourceUrl must use https")
    if config.authority not in {
        "primary",
        "authoritative-secondary",
        "secondary",
        "aggregator",
        "unknown",
    }:
        issues.append("authority is invalid")
    if config.directness not in {"direct", "near-direct", "indirect", "unknown"}:
        issues.append("directness is invalid")
    if config.mode not in {"manual-link-only", "verified-machine-endpoint"}:
        issues.append("mode is invalid")
    if config.mode == "manual-link-only" and config.machine_endpoint is not None:
        issues.append("manual-link-only sources cannot declare a machineEndpoint")
    if config.mode == "verified-machine-endpoint" and (
        config.machine_endpoint is None
        or not config.machine_endpoint.startswith("https://")
    ):
        issues.append("verified-machine-endpoint sources require an HTTPS machineEndpoint")
    if not config.prohibits_interactive_scraping:
        issues.append("interactive portal scraping must be prohibited")
    return tuple(issues)


def load_official_source_configs(path: Path) -> tuple[OfficialSourceConfig, ...]:
    raw = cast(object, json.loads(path.read_text(encoding="utf-8")))
    if not isinstance(raw, list):
        raise ValueError("official source manifest must be an array")
    configs: list[OfficialSourceConfig] = []
    for index, item in enumerate(cast(list[object], raw)):
        mapping = _mapping(item, f"source {index}")
        machine_endpoint = mapping.get("machineEndpoint")
        if machine_endpoint is not None and not isinstance(machine_endpoint, str):
            raise ValueError("machineEndpoint must be a string or null")
        prohibits_scraping = mapping.get("prohibitsInteractiveScraping")
        if not isinstance(prohibits_scraping, bool):
            raise ValueError("prohibitsInteractiveScraping must be a boolean")
        mode = _required_string(mapping, "mode")
        if mode not in {"manual-link-only", "verified-machine-endpoint"}:
            raise ValueError("mode is invalid")
        config = OfficialSourceConfig(
            protocol_version=_required_string(mapping, "protocolVersion"),
            adapter_id=_required_string(mapping, "adapterId"),
            metro_slug=_required_string(mapping, "metroSlug"),
            name=_required_string(mapping, "name"),
            source_url=_required_string(mapping, "sourceUrl"),
            publisher=_required_string(mapping, "publisher"),
            mode=cast(SourceMode, mode),
            machine_endpoint=machine_endpoint,
            authority=_required_string(mapping, "authority"),
            directness=_required_string(mapping, "directness"),
            limitations=_required_string(mapping, "limitations"),
            prohibits_interactive_scraping=prohibits_scraping,
        )
        issues = validate_official_source_config(config)
        if issues:
            raise ValueError("; ".join(issues))
        configs.append(config)
    adapter_ids = [config.adapter_id for config in configs]
    if len(adapter_ids) != len(set(adapter_ids)):
        raise ValueError("official source adapter IDs must be unique")
    return tuple(configs)


def check_official_source_fixture(
    config: OfficialSourceConfig,
    *,
    checked_at: datetime,
) -> OfficialSourceHealth:
    issues = validate_official_source_config(config)
    if issues:
        return OfficialSourceHealth(
            adapter_id=config.adapter_id,
            protocol_version=config.protocol_version,
            checked_at=_iso(checked_at),
            healthy=False,
            stage="validate",
            records=(),
            issue="; ".join(issues),
        )
    if config.mode == "manual-link-only" and config.machine_endpoint is None:
        return OfficialSourceHealth(
            adapter_id=config.adapter_id,
            protocol_version=config.protocol_version,
            checked_at=_iso(checked_at),
            healthy=True,
            stage="manual-review-required",
            records=(),
            issue=None,
        )
    return OfficialSourceHealth(
        adapter_id=config.adapter_id,
        protocol_version=config.protocol_version,
        checked_at=_iso(checked_at),
        healthy=False,
        stage="fixture-required",
        records=(),
        issue="Verified machine endpoint adapters require an offline fixture before use.",
    )
