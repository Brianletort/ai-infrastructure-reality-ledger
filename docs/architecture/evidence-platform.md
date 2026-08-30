# Evidence-platform architecture

## Purpose

The evidence platform turns governed public-source observations into traceable claims without
collapsing source quality, time, lifecycle, or correction history. PostgreSQL/PostGIS owns the
authoritative ledger. Filesystem snapshots are content-addressed local artifacts, and graph edges
are rebuildable projections with claim and evidence provenance.

## Write path

1. A PostgreSQL async job is claimed with `FOR UPDATE SKIP LOCKED`.
2. A versioned source adapter applies its manifest, attribution, rate limit, cadence, sensitivity,
   and redistribution policy.
3. Worker-only fetch, parse, and normalize stages produce candidate records. Public request handlers
   never execute these stages.
4. Permitted bytes are written once under their SHA-256 digest. `link-only` and `prohibited`
   content is not snapshotted; `derived-only` content cannot be published or exported.
5. Deterministic entity resolution evaluates exact identifiers, aliases, normalized address, and
   geometry separately. Ambiguous candidates enter the review queue.
6. Evidence and claims retain valid, assertion, source-publication, and retrieval time.
7. Claims link to supporting, contradicting, or contextual evidence. Corrections append lineage and
   superseding records rather than modifying historical evidence.
8. Typed graph edges retain the originating claim and all evidence identifiers.

## Lifecycle adjudication

Activation is deliberately conservative. It requires at least two distinct source identifiers and
at least one authoritative signal. Multiple imagery observations, including authoritative imagery,
cannot establish activation without a non-imagery signal. A failed threshold remains an explicit
non-activation decision; it is not silently upgraded.

## Read path

Next.js handlers depend on `LedgerRepository`. The current local beta uses a deterministic,
clearly synthetic implementation. A PostgreSQL implementation can replace it without changing the
route contract. Responses include citations, confidence dimensions, retrieval dates,
correction/lifecycle lineage, and `missing` arrays. Query limits reject bulk reconstruction rather
than silently returning an unbounded topology.

The deep-metro beta adds a generated, independently validated synthetic corpus read model. The
Python generator and fail-closed reviewer are separate code paths with distinct identities.
Generated JSON is the only input to bounded metro/timeline/evidence/history handlers; those
handlers never call an official portal. Every nested corpus record and API envelope carries
`synthetic-reviewed-beta`, a not-public-factual warning, and false public-fact approval.

Factual replacement creates new `public-factual-reviewed` candidates from exact official source
references. It does not mutate or relabel synthetic approvals. Publication requires a distinct
independent public-fact review and the existing Tier-2 data, security, performance, and merge
gates.

## Trust and failure boundaries

- Source bytes and parser output are untrusted.
- Redistribution policy is checked before storage and again before disclosure.
- Object hashes establish integrity, not permission.
- Failed jobs retry only while `attempts < max_attempts`; terminal failures become `dead_letter`.
- Worker ownership is conditional on `locked_by`, preventing another worker from completing or
  failing a claimed job.
- This repository defines no production database, remote storage, source credentials, or
  deployment infrastructure.
