import math
import unicodedata
from dataclasses import dataclass, field
from enum import StrEnum


def _normalize(value: str) -> str:
    decomposed = unicodedata.normalize("NFKD", value).casefold()
    alphanumeric = "".join(
        character if character.isalnum() else " " for character in decomposed
    )
    return " ".join(alphanumeric.split())


@dataclass(frozen=True)
class EntityCandidate:
    name: str
    aliases: tuple[str, ...] = ()
    address: str | None = None
    identifiers: dict[str, str] = field(default_factory=dict[str, str])
    latitude: float | None = None
    longitude: float | None = None


@dataclass(frozen=True)
class KnownEntity:
    entity_id: str
    name: str
    aliases: tuple[str, ...] = ()
    normalized_address: str | None = None
    identifiers: dict[str, str] = field(default_factory=dict[str, str])
    latitude: float | None = None
    longitude: float | None = None


@dataclass(frozen=True)
class ResolutionConfidence:
    identifier: float
    alias: float
    address: float
    geometry: float
    overall: float


class ResolutionOutcome(StrEnum):
    RESOLVED = "resolved"
    REVIEW = "review"
    UNRESOLVED = "unresolved"


@dataclass(frozen=True)
class ResolutionResult:
    outcome: ResolutionOutcome
    entity_id: str | None
    candidate_entity_ids: tuple[str, ...]
    confidence: ResolutionConfidence


@dataclass(frozen=True)
class _ScoredEntity:
    entity_id: str
    confidence: ResolutionConfidence
    supported_dimensions: int


def _geometry_confidence(candidate: EntityCandidate, known: KnownEntity) -> float:
    if (
        candidate.latitude is None
        or candidate.longitude is None
        or known.latitude is None
        or known.longitude is None
    ):
        return 0.0
    distance = _haversine_metres(
        candidate.latitude,
        candidate.longitude,
        known.latitude,
        known.longitude,
    )
    return max(0.0, 1.0 - (distance / 5_000.0))


def _haversine_metres(lat_a: float, lon_a: float, lat_b: float, lon_b: float) -> float:
    radius_metres = 6_371_000.0
    lat_a_radians = math.radians(lat_a)
    lat_b_radians = math.radians(lat_b)
    delta_lat = math.radians(lat_b - lat_a)
    delta_lon = math.radians(lon_b - lon_a)
    haversine = (
        math.sin(delta_lat / 2) ** 2
        + math.cos(lat_a_radians)
        * math.cos(lat_b_radians)
        * math.sin(delta_lon / 2) ** 2
    )
    return radius_metres * 2 * math.atan2(math.sqrt(haversine), math.sqrt(1 - haversine))


def _score(candidate: EntityCandidate, known: KnownEntity) -> _ScoredEntity:
    identifier = float(
        any(
            candidate.identifiers.get(namespace) == value
            for namespace, value in known.identifiers.items()
            if value
        )
    )
    candidate_names = {
        _normalize(candidate.name),
        *(_normalize(alias) for alias in candidate.aliases),
    }
    known_names = {_normalize(known.name), *(_normalize(alias) for alias in known.aliases)}
    alias = float(bool(candidate_names & known_names))
    address = float(
        candidate.address is not None
        and known.normalized_address is not None
        and _normalize(candidate.address) == _normalize(known.normalized_address)
    )
    geometry = _geometry_confidence(candidate, known)
    overall = round(
        (identifier * 0.55) + (alias * 0.2) + (address * 0.15) + (geometry * 0.1),
        6,
    )
    confidence = ResolutionConfidence(identifier, alias, address, geometry, overall)
    supported = sum(
        value > 0.0 for value in (identifier, alias, address, geometry)
    )
    return _ScoredEntity(known.entity_id, confidence, supported)


def resolve_entity(
    candidate: EntityCandidate,
    known_entities: tuple[KnownEntity, ...],
) -> ResolutionResult:
    scored = sorted(
        (_score(candidate, known) for known in known_entities),
        key=lambda item: (-item.confidence.overall, item.entity_id),
    )
    supported = [item for item in scored if item.confidence.overall > 0.0]
    if not supported:
        return ResolutionResult(
            ResolutionOutcome.UNRESOLVED,
            None,
            (),
            ResolutionConfidence(0.0, 0.0, 0.0, 0.0, 0.0),
        )

    exact = [item for item in supported if item.confidence.identifier == 1.0]
    if len(exact) == 1:
        winner = exact[0]
        return ResolutionResult(
            ResolutionOutcome.RESOLVED,
            winner.entity_id,
            (winner.entity_id,),
            winner.confidence,
        )

    best = supported[0]
    tied = [
        item
        for item in supported
        if math.isclose(item.confidence.overall, best.confidence.overall, abs_tol=1e-9)
    ]
    if len(tied) == 1 and best.supported_dimensions >= 2 and best.confidence.overall >= 0.3:
        return ResolutionResult(
            ResolutionOutcome.RESOLVED,
            best.entity_id,
            (best.entity_id,),
            best.confidence,
        )

    review_candidates = exact if len(exact) > 1 else tied if len(tied) > 1 else [best]
    return ResolutionResult(
        ResolutionOutcome.REVIEW,
        None,
        tuple(sorted(item.entity_id for item in review_candidates)),
        best.confidence,
    )
