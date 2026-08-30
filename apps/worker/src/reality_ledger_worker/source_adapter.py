from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from enum import StrEnum
from typing import Literal

SourceAuthority = Literal[
    "primary",
    "authoritative-secondary",
    "secondary",
    "aggregator",
    "unknown",
]
SourceDirectness = Literal["direct", "near-direct", "indirect", "unknown"]

SOURCE_AUTHORITIES: frozenset[str] = frozenset(
    {"primary", "authoritative-secondary", "secondary", "aggregator", "unknown"}
)
SOURCE_DIRECTNESS_VALUES: frozenset[str] = frozenset(
    {"direct", "near-direct", "indirect", "unknown"}
)


class Redistribution(StrEnum):
    REPUBLISH = "republish"
    DERIVED_ONLY = "derived-only"
    LINK_ONLY = "link-only"
    PROHIBITED = "prohibited"


@dataclass(frozen=True)
class RateLimit:
    requests: int
    per_seconds: int

    def __post_init__(self) -> None:
        if self.requests < 1 or self.per_seconds < 1:
            raise ValueError("rate-limit values must be positive")


@dataclass(frozen=True)
class Attribution:
    text: str
    url: str | None = None

    def __post_init__(self) -> None:
        if not self.text.strip():
            raise ValueError("attribution text is required")


@dataclass(frozen=True)
class AdapterManifest:
    protocol_version: str
    adapter_id: str
    name: str
    source_url: str
    authority: SourceAuthority
    directness: SourceDirectness
    cadence: str
    rate_limit: RateLimit
    attribution: Attribution
    redistribution: Redistribution
    sensitivity: str

    def __post_init__(self) -> None:
        required = (
            self.protocol_version,
            self.adapter_id,
            self.name,
            self.cadence,
            self.sensitivity,
        )
        if any(not value.strip() for value in required):
            raise ValueError("manifest string fields must not be empty")
        if not self.source_url.startswith("https://"):
            raise ValueError("source_url must use https")
        if self.authority not in SOURCE_AUTHORITIES:
            raise ValueError("authority is invalid")
        if self.directness not in SOURCE_DIRECTNESS_VALUES:
            raise ValueError("directness is invalid")


@dataclass(frozen=True)
class AdapterFixture[NormalizedT]:
    name: str
    payload: str
    expected: NormalizedT


@dataclass(frozen=True)
class SourceHealth[NormalizedT]:
    adapter_id: str
    protocol_version: str
    healthy: bool
    stage: str
    checked_at: datetime
    records: tuple[NormalizedT, ...]
    error: str | None = None


class SourceAdapter[RawT, ParsedT, NormalizedT](ABC):
    manifest: AdapterManifest

    @abstractmethod
    def fetch(self, fixture_payload: str) -> RawT:
        """Retrieve raw content from a supplied fixture or governed worker client."""

    @abstractmethod
    def parse(self, raw: RawT) -> ParsedT:
        """Parse raw content without assigning ledger semantics."""

    @abstractmethod
    def normalize(self, parsed: ParsedT) -> NormalizedT:
        """Normalize parsed content into a stable adapter record."""


def run_adapter_fixture[RawT, ParsedT, NormalizedT](
    adapter: SourceAdapter[RawT, ParsedT, NormalizedT],
    fixture: AdapterFixture[NormalizedT],
    *,
    checked_at: datetime,
) -> SourceHealth[NormalizedT]:
    stage = "fetch"
    try:
        raw = adapter.fetch(fixture.payload)
        stage = "parse"
        parsed = adapter.parse(raw)
        stage = "normalize"
        normalized = adapter.normalize(parsed)
        stage = "validate"
        if normalized != fixture.expected:
            raise ValueError(f"fixture {fixture.name!r} did not match expected normalized record")
    except Exception as error:
        return SourceHealth(
            adapter_id=adapter.manifest.adapter_id,
            protocol_version=adapter.manifest.protocol_version,
            healthy=False,
            stage=stage,
            checked_at=checked_at,
            records=(),
            error=str(error),
        )

    return SourceHealth(
        adapter_id=adapter.manifest.adapter_id,
        protocol_version=adapter.manifest.protocol_version,
        healthy=True,
        stage="complete",
        checked_at=checked_at,
        records=(normalized,),
    )
