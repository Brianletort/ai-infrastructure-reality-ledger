# Read API contract

The local beta API is deterministic. Evidence-platform routes use clearly synthetic fixtures; the
inventory and coverage routes read generated local artifacts. Request handlers make no third-party
network calls.

## Envelope

Successful responses use:

```json
{
  "data": {},
  "meta": {
    "explicitMissingness": true
  }
}
```

Unknown lookup records return `404`; malformed parameters return `400`. Entity identifiers contain
1-64 lowercase letters, digits, or hyphens and must start with a letter or digit. Unknown values
are `null` and named in a `missing` array; omission must not be interpreted as zero or false.

## Routes and bounds

- `GET /api/search?q={2..100 characters}&limit={1..25}`: facility and provider summaries.
- `GET /api/facilities/{id}`: one facility, its direct provider reference, lifecycle, and evidence
  metadata.
- `GET /api/providers/{id}`: one provider summary.
- `GET /api/entities/{id}/timeline?limit={1..100}`: bounded, reverse-chronological entity events.
- `GET /api/evidence/{claimId}`: one claim's evidence packet.
- `GET /api/sources?limit={1..50}`: source manifests and health-relevant retrieval metadata, never
  source payloads.
- `GET /api/claims/contested?limit={1..50}`: bounded contested claims.
- `GET /api/inventory?country={US|CA|MX}&metro={2..100 characters}&limit={1..100}`: generated
  redacted facility/site projections with stable public facility/site identifiers, generalized
  display coordinates, explicit missingness, and attributed citations. Public responses omit raw
  source tags and source-record identifiers; no exact restricted geometry is exposed.
- `GET /api/coverage`: one compact coverage report with country, macro-region, metro, operator
  knownness, geometry, explicit facility tag, source, conflict, and missingness dimensions.
- `GET /api/metros/{metro}/summary`: one generated deep-metro report for
  `northern-virginia`, `dallas-fort-worth`, `phoenix`, or `toronto`.
- `GET /api/metros/{metro}/timelines?limit={1..25}`: bounded timeline summaries without evidence
  packet expansion.
- `GET /api/timelines/{timelineId}`: one reviewed timeline.
- `GET /api/evidence-packets/{packetId}`: one timeline evidence packet.
- `GET /api/timelines/{timelineId}/history?limit={1..50}`: bounded review, correction, and
  supersession history.

Limits outside the documented bounds are rejected rather than clamped. The API has no endpoint for
bulk graph export or topology reconstruction.

All successful deep-metro responses carry `corpusMode: "synthetic-reviewed-beta"` and the warning
`SYNTHETIC REVIEWED BETA CORPUS — NOT PUBLIC FACTUAL DATA`. Every served timeline and nested
record is synthetic; `publicFactApproved` is false. Synthetic review approval is not public-fact
approval.

## Evidence fields

Material search, entity, timeline, and claim records include:

- lifecycle state;
- source authority, directness, entity-match, composite confidence, and rationale;
- citation URL, attribution, source-publication time, and retrieval time;
- correction lineage, including superseded claim identifiers;
- explicit missingness.

Claims additionally preserve `validFrom`, nullable `validTo`, `assertedAt`, `sourcePublishedAt`,
and `retrievedAt`. Evidence packets disclose `snapshotUri` and `contentHash` only when policy
allows; otherwise both are `null` and included in `missing`.

## Repository replacement

`SyntheticLedgerRepository` is the local beta implementation. A future PostgreSQL read-model
repository must implement the same interface and preserve ordering, bounds, null semantics,
citations, and lineage. Adding live source retrieval to a handler is prohibited by ADR 0005.

`GeneratedInventoryRepository` reads `data/odbl/north-america-facilities.json`,
`data/reports/north-america-coverage.json`, and the machine-readable source registry. Inventory
responses always carry `notComplete`, query/version, dataset/source timestamps, mode, attribution,
license metadata, `corpusMode: "synthetic-reviewed-beta"`, and the synthetic corpus warning.
Each public inventory record preserves the stable facility/site IDs, generalized display
coordinates, facility missingness, and citation attribution from the generated artifact while
dropping `sourceTags`, `sourceRecordId`, and `sourceRecordIds`. Exact coordinates and raw source
payload fields remain internal; exact coordinates exist only in local restricted immutable
evidence.
