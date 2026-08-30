from collections.abc import Callable
from dataclasses import dataclass, replace
from datetime import UTC, datetime
from pathlib import Path

import pytest

from reality_ledger_worker.claims import (
    ActivationSignal,
    adjudicate_activation,
    create_temporal_claim,
)
from reality_ledger_worker.entity_resolution import (
    EntityCandidate,
    KnownEntity,
    ResolutionOutcome,
    resolve_entity,
)
from reality_ledger_worker.graph import project_typed_edge
from reality_ledger_worker.object_store import (
    ContentAddressedObjectStore,
    RedistributionDenied,
)
from reality_ledger_worker.source_adapter import (
    AdapterFixture,
    AdapterManifest,
    Attribution,
    RateLimit,
    Redistribution,
    SourceAdapter,
    run_adapter_fixture,
)

NOW = datetime(2026, 8, 29, 12, tzinfo=UTC)


@dataclass(frozen=True)
class SyntheticRecord:
    external_id: str
    name: str


class SyntheticAdapter(SourceAdapter[str, dict[str, str], SyntheticRecord]):
    manifest = AdapterManifest(
        protocol_version="1.0",
        adapter_id="synthetic-public-register",
        name="Synthetic Public Register",
        source_url="https://register.example.invalid/facilities",
        authority="primary",
        directness="direct",
        cadence="daily",
        rate_limit=RateLimit(requests=10, per_seconds=60),
        attribution=Attribution(text="Synthetic public authority"),
        redistribution=Redistribution.REPUBLISH,
        sensitivity="public",
    )

    def fetch(self, fixture_payload: str) -> str:
        return fixture_payload

    def parse(self, raw: str) -> dict[str, str]:
        external_id, name = raw.split("|", maxsplit=1)
        return {"external_id": external_id, "name": name}

    def normalize(self, parsed: dict[str, str]) -> SyntheticRecord:
        return SyntheticRecord(**parsed)


def test_adapter_harness_runs_versioned_fetch_parse_normalize_stages() -> None:
    result = run_adapter_fixture(
        SyntheticAdapter(),
        AdapterFixture(
            name="synthetic facility",
            payload="SYN-001|Synthetic North Facility",
            expected=SyntheticRecord("SYN-001", "Synthetic North Facility"),
        ),
        checked_at=NOW,
    )

    assert result.healthy is True
    assert result.stage == "complete"
    assert result.adapter_id == "synthetic-public-register"
    assert result.protocol_version == "1.0"
    assert result.records == (SyntheticRecord("SYN-001", "Synthetic North Facility"),)
    assert result.checked_at == NOW


def make_policy_manifest() -> AdapterManifest:
    return AdapterManifest(
        protocol_version="1.0",
        adapter_id="synthetic-public-register",
        name="Synthetic Public Register",
        source_url="https://register.example.invalid/facilities",
        authority="primary",
        directness="direct",
        cadence="daily",
        rate_limit=RateLimit(requests=10, per_seconds=60),
        attribution=Attribution(text="Synthetic public authority"),
        redistribution=Redistribution.REPUBLISH,
        sensitivity="public",
    )


def test_adapter_manifest_matches_source_policy_fields() -> None:
    manifest = make_policy_manifest()

    assert manifest.source_url == "https://register.example.invalid/facilities"
    assert manifest.authority == "primary"
    assert manifest.directness == "direct"


@pytest.mark.parametrize(
    ("factory", "message"),
    [
        (
            lambda: replace(
                make_policy_manifest(),
                source_url="http://register.example.invalid",
            ),
            "source_url must use https",
        ),
        (
            lambda: replace(make_policy_manifest(), authority="self-asserted"),
            "authority is invalid",
        ),
        (
            lambda: replace(make_policy_manifest(), directness="speculative"),
            "directness is invalid",
        ),
    ],
)
def test_adapter_manifest_rejects_invalid_source_policy_fields(
    factory: Callable[[], AdapterManifest],
    message: str,
) -> None:
    with pytest.raises(ValueError, match=message):
        factory()


class FailingStageAdapter(SyntheticAdapter):
    def __init__(self, stage: str, error: BaseException) -> None:
        self.stage = stage
        self.error = error

    def fetch(self, fixture_payload: str) -> str:
        if self.stage == "fetch":
            raise self.error
        return super().fetch(fixture_payload)

    def parse(self, raw: str) -> dict[str, str]:
        if self.stage == "parse":
            raise self.error
        return super().parse(raw)

    def normalize(self, parsed: dict[str, str]) -> SyntheticRecord:
        if self.stage == "normalize":
            raise self.error
        return super().normalize(parsed)


@pytest.mark.parametrize(
    ("stage", "error"),
    [
        ("fetch", TimeoutError("synthetic timeout")),
        ("fetch", RuntimeError("synthetic runtime failure")),
        ("parse", KeyError("synthetic missing key")),
        ("parse", SyntaxError("synthetic parser failure")),
        ("normalize", RuntimeError("synthetic normalization failure")),
    ],
)
def test_adapter_harness_converts_ordinary_stage_exceptions_to_health(
    stage: str,
    error: Exception,
) -> None:
    result = run_adapter_fixture(
        FailingStageAdapter(stage, error),
        AdapterFixture(
            name="synthetic failure",
            payload="SYN-001|Synthetic North Facility",
            expected=SyntheticRecord("SYN-001", "Synthetic North Facility"),
        ),
        checked_at=NOW,
    )

    assert result.healthy is False
    assert result.stage == stage
    assert result.records == ()
    assert result.error


@pytest.mark.parametrize(
    "error",
    [KeyboardInterrupt(), SystemExit(2), GeneratorExit()],
)
def test_adapter_harness_does_not_swallow_process_control(error: BaseException) -> None:
    with pytest.raises(type(error)):
        run_adapter_fixture(
            FailingStageAdapter("fetch", error),
            AdapterFixture(
                name="synthetic process control",
                payload="SYN-001|Synthetic North Facility",
                expected=SyntheticRecord("SYN-001", "Synthetic North Facility"),
            ),
            checked_at=NOW,
        )


def test_object_store_is_content_addressed_and_snapshot_immutable(tmp_path: Path) -> None:
    store = ContentAddressedObjectStore(tmp_path)
    content = b"Synthetic evidence snapshot."

    first = store.put(content, Redistribution.REPUBLISH)
    second = store.put(content, Redistribution.REPUBLISH)

    assert first == second
    assert first.sha256 == "0f6970c1d7672d104fc07e0832ed03ac2cdb2cbe9253680407144c29b9ef356d"
    assert first.path.read_bytes() == content
    with pytest.raises(PermissionError):
        first.path.write_bytes(b"replacement")


def test_object_store_refuses_prohibited_storage_publication_and_export(tmp_path: Path) -> None:
    store = ContentAddressedObjectStore(tmp_path)

    with pytest.raises(RedistributionDenied):
        store.put(b"must not be retained", Redistribution.PROHIBITED)

    stored = store.put(b"derived-only source", Redistribution.DERIVED_ONLY)
    with pytest.raises(RedistributionDenied):
        store.read_for_publication(stored)
    with pytest.raises(RedistributionDenied):
        store.export(stored, tmp_path / "export")


def test_entity_resolution_prefers_exact_identifier_with_separate_confidences() -> None:
    known = (
        KnownEntity(
            entity_id="entity-a",
            name="Synthetic North Facility",
            aliases=("SNF",),
            normalized_address="100 example road synthetic city",
            identifiers={"register": "SYN-001"},
            latitude=40.0,
            longitude=-75.0,
        ),
        KnownEntity(
            entity_id="entity-b",
            name="Synthetic North Annex",
            aliases=("North Annex",),
            normalized_address="200 example road synthetic city",
            identifiers={"register": "SYN-002"},
            latitude=40.1,
            longitude=-75.1,
        ),
    )
    candidate = EntityCandidate(
        name="Unrelated display label",
        aliases=(),
        address="100 Example Road, Synthetic City",
        identifiers={"register": "SYN-001"},
        latitude=40.0001,
        longitude=-75.0001,
    )

    result = resolve_entity(candidate, known)

    assert result.outcome is ResolutionOutcome.RESOLVED
    assert result.entity_id == "entity-a"
    assert result.confidence.identifier == 1.0
    assert result.confidence.address == 1.0
    assert result.confidence.geometry > 0.99
    assert result.confidence.alias == 0.0


def test_entity_resolution_returns_review_for_ambiguous_aliases() -> None:
    candidate = EntityCandidate(name="Shared Synthetic Campus")
    known = (
        KnownEntity(entity_id="entity-a", name="Alpha", aliases=("Shared Synthetic Campus",)),
        KnownEntity(entity_id="entity-b", name="Beta", aliases=("Shared Synthetic Campus",)),
    )

    result = resolve_entity(candidate, known)

    assert result.outcome is ResolutionOutcome.REVIEW
    assert result.entity_id is None
    assert result.candidate_entity_ids == ("entity-a", "entity-b")


def test_entity_resolution_returns_unresolved_without_supported_match() -> None:
    result = resolve_entity(
        EntityCandidate(name="New Synthetic Facility"),
        (KnownEntity(entity_id="entity-a", name="Different Facility"),),
    )

    assert result.outcome is ResolutionOutcome.UNRESOLVED
    assert result.entity_id is None


def test_temporal_claim_preserves_all_four_time_dimensions() -> None:
    claim = create_temporal_claim(
        claim_id="claim-1",
        entity_id="entity-a",
        predicate="has_status",
        value="construction_evidence",
        evidence_ids=("evidence-1",),
        valid_from=datetime(2026, 8, 1, tzinfo=UTC),
        valid_to=None,
        asserted_at=datetime(2026, 8, 29, 12, tzinfo=UTC),
        source_published_at=datetime(2026, 8, 28, 9, tzinfo=UTC),
        retrieved_at=datetime(2026, 8, 29, 10, tzinfo=UTC),
    )

    assert claim.valid_from == datetime(2026, 8, 1, tzinfo=UTC)
    assert claim.asserted_at == datetime(2026, 8, 29, 12, tzinfo=UTC)
    assert claim.source_published_at == datetime(2026, 8, 28, 9, tzinfo=UTC)
    assert claim.retrieved_at == datetime(2026, 8, 29, 10, tzinfo=UTC)


def test_activation_requires_two_independent_signals_and_one_authoritative() -> None:
    signals = (
        ActivationSignal("source-a", authoritative=True, kind="filing"),
        ActivationSignal("source-b", authoritative=False, kind="operator_statement"),
    )

    assert adjudicate_activation(signals).activated is True
    assert adjudicate_activation(signals).reason == "activation threshold satisfied"
    assert (
        adjudicate_activation(
            (
                ActivationSignal("source-a", authoritative=True, kind="filing"),
                ActivationSignal("source-a", authoritative=True, kind="operator_statement"),
            )
        ).activated
        is False
    )
    assert (
        adjudicate_activation(
            (
                ActivationSignal("source-a", authoritative=False, kind="filing"),
                ActivationSignal("source-b", authoritative=False, kind="operator_statement"),
            )
        ).activated
        is False
    )


def test_imagery_alone_cannot_establish_activation() -> None:
    result = adjudicate_activation(
        (
            ActivationSignal("source-a", authoritative=True, kind="imagery"),
            ActivationSignal("source-b", authoritative=True, kind="imagery"),
        )
    )

    assert result.activated is False
    assert result.reason == "imagery alone cannot establish activation"


def test_graph_projection_preserves_claim_and_evidence_provenance() -> None:
    claim = create_temporal_claim(
        claim_id="claim-edge",
        entity_id="entity-a",
        predicate="operated_by",
        value={"to_entity_id": "entity-b"},
        evidence_ids=("evidence-1", "evidence-2"),
        valid_from=datetime(2026, 8, 1, tzinfo=UTC),
        valid_to=None,
        asserted_at=NOW,
        source_published_at=datetime(2026, 8, 28, tzinfo=UTC),
        retrieved_at=datetime(2026, 8, 29, tzinfo=UTC),
    )

    edge = project_typed_edge(claim)

    assert edge.from_entity_id == "entity-a"
    assert edge.to_entity_id == "entity-b"
    assert edge.edge_type == "operated_by"
    assert edge.claim_id == "claim-edge"
    assert edge.evidence_ids == ("evidence-1", "evidence-2")
