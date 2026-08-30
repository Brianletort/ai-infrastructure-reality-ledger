from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class TemporalClaim:
    claim_id: str
    entity_id: str
    predicate: str
    value: object
    evidence_ids: tuple[str, ...]
    valid_from: datetime
    valid_to: datetime | None
    asserted_at: datetime
    source_published_at: datetime
    retrieved_at: datetime


def create_temporal_claim(
    *,
    claim_id: str,
    entity_id: str,
    predicate: str,
    value: object,
    evidence_ids: tuple[str, ...],
    valid_from: datetime,
    valid_to: datetime | None,
    asserted_at: datetime,
    source_published_at: datetime,
    retrieved_at: datetime,
) -> TemporalClaim:
    timestamps = (valid_from, asserted_at, source_published_at, retrieved_at)
    if any(timestamp.tzinfo is None for timestamp in timestamps):
        raise ValueError("claim timestamps must be timezone-aware")
    if valid_to is not None:
        if valid_to.tzinfo is None:
            raise ValueError("claim timestamps must be timezone-aware")
        if valid_to < valid_from:
            raise ValueError("valid_to must not precede valid_from")
    if not evidence_ids:
        raise ValueError("a claim requires at least one evidence record")

    return TemporalClaim(
        claim_id=claim_id,
        entity_id=entity_id,
        predicate=predicate,
        value=value,
        evidence_ids=evidence_ids,
        valid_from=valid_from,
        valid_to=valid_to,
        asserted_at=asserted_at,
        source_published_at=source_published_at,
        retrieved_at=retrieved_at,
    )


@dataclass(frozen=True)
class ActivationSignal:
    source_id: str
    authoritative: bool
    kind: str


@dataclass(frozen=True)
class ActivationDecision:
    activated: bool
    reason: str
    independent_signal_count: int
    has_authoritative_signal: bool


def adjudicate_activation(signals: tuple[ActivationSignal, ...]) -> ActivationDecision:
    independent_sources = {signal.source_id for signal in signals}
    authoritative = any(signal.authoritative for signal in signals)
    if len(independent_sources) < 2:
        reason = "at least two independent signals are required"
    elif not authoritative:
        reason = "at least one authoritative signal is required"
    elif all(signal.kind == "imagery" for signal in signals):
        reason = "imagery alone cannot establish activation"
    else:
        return ActivationDecision(
            activated=True,
            reason="activation threshold satisfied",
            independent_signal_count=len(independent_sources),
            has_authoritative_signal=True,
        )

    return ActivationDecision(
        activated=False,
        reason=reason,
        independent_signal_count=len(independent_sources),
        has_authoritative_signal=authoritative,
    )
