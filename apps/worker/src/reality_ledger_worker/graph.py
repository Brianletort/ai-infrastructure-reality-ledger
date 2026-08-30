from dataclasses import dataclass
from datetime import datetime
from typing import cast

from reality_ledger_worker.claims import TemporalClaim


@dataclass(frozen=True)
class TypedGraphEdge:
    from_entity_id: str
    to_entity_id: str
    edge_type: str
    valid_from: datetime
    valid_to: datetime | None
    claim_id: str
    evidence_ids: tuple[str, ...]


def project_typed_edge(claim: TemporalClaim) -> TypedGraphEdge:
    raw_value: object = claim.value
    if not isinstance(raw_value, dict):
        raise ValueError("relationship claim value must be an object")
    relationship_value = cast(dict[str, object], raw_value)
    to_entity_id = relationship_value.get("to_entity_id")
    if not isinstance(to_entity_id, str) or not to_entity_id:
        raise ValueError("relationship claim requires a to_entity_id")

    return TypedGraphEdge(
        from_entity_id=claim.entity_id,
        to_entity_id=to_entity_id,
        edge_type=claim.predicate,
        valid_from=claim.valid_from,
        valid_to=claim.valid_to,
        claim_id=claim.claim_id,
        evidence_ids=claim.evidence_ids,
    )
