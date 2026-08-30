# Synthetic contribution examples

These examples are intentionally fictional. They show the expected shape without introducing a
market claim, real company, credential, private record, or copied source content.

## Source request

**Title:** Evaluate Synthetic State Energy Bulletin as link-only activation context

- Publisher: Synthetic State Energy Office
- Landing URL: `https://example.invalid/bulletins/energy-2026-0042`
- Scope: a fictional notice stating that service began at `SYN-FAC-0042`
- Authority: first-party for the fictional service event; not authoritative for ownership or
  capacity
- Directness: direct for the described service event
- Publication cadence: ad hoc
- Terms: no reuse terms identified in the fixture
- Proposed redistribution class: `link-only`
- Attribution: Synthetic State Energy Office, bulletin `energy-2026-0042`
- Intended use: one signal in an activation review; never sufficient by itself
- Open question: whether a separately approved non-imagery signal can establish entity match

Expected review: keep source bytes out of the repository, retain only synthetic citation metadata,
and require an independent second signal.

## Correction report

**Ledger record:** `synthetic-northern-virginia-01:event-02`

**Disputed claim:** lifecycle state `activation`

**Proposed correction:** supersede the activation claim with `construction`

**Rationale:** the fictional service notice refers to an adjacent parcel identifier and does not
establish entity match to the ledger facility.

**Supporting evidence:** `https://example.invalid/parcels/SYN-PARCEL-0043`

**Expected review:**

1. confirm the evidence remains synthetic and contains no restricted content;
2. compare parcel and facility identifiers;
3. score entity-match confidence;
4. record the conflict;
5. append a correction event that links to the activation event;
6. preserve the prior event and rerun timeline/schema tests.

## Python adapter fixture

```python
from reality_ledger_worker.source_adapter import AdapterManifest
from reality_ledger_worker.source_adapter import Attribution
from reality_ledger_worker.source_adapter import RateLimit
from reality_ledger_worker.source_adapter import Redistribution
from reality_ledger_worker.source_adapter import SourceAdapter


class SyntheticBulletinAdapter(
    SourceAdapter[str, tuple[str, str, str], dict[str, str]]
):
    manifest = AdapterManifest(
        protocol_version="1.0",
        adapter_id="synthetic-bulletin",
        name="Synthetic Bulletin",
        source_url="https://example.invalid/bulletins",
        authority="primary",
        directness="direct",
        cadence="ad hoc",
        rate_limit=RateLimit(requests=1, per_seconds=60),
        attribution=Attribution(text="Synthetic State Energy Office"),
        redistribution=Redistribution.LINK_ONLY,
        sensitivity="synthetic fixture only",
    )

    def fetch(self, fixture_payload: str) -> str:
        return fixture_payload

    def parse(self, raw: str) -> tuple[str, str, str]:
        identifier, name, state = raw.split("|")
        return identifier, name, state

    def normalize(self, parsed: tuple[str, str, str]) -> dict[str, str]:
        identifier, name, state = parsed
        return {
            "source_record_id": identifier,
            "name": name,
            "lifecycle_state": state,
        }
```

This uses the current generic adapter contract. Pair it with `AdapterFixture` and
`run_adapter_fixture` in a test; do not add network retrieval to the fixture method.

## TypeScript fixture

```typescript
const fixture = {
  protocolVersion: "1.0",
  payload: "SYN-0042|Synthetic North Facility|construction",
  expected: {
    sourceRecordId: "SYN-0042",
    name: "Synthetic North Facility",
    lifecycleState: "construction",
  },
};
```

Run synthetic fixtures through the source SDK's current `runSyntheticFixture` contract. Include a
successful record, malformed input, missing identifier, rights behavior, and a parser-change case.

## Review boundary

An accepted issue approves investigation, not factual inclusion or redistribution. A real adapter
requires a reviewed source manifest, offline synthetic fixture, bounded worker-only retrieval,
source-health tests, and the applicable data, security, performance, and merge gates.
