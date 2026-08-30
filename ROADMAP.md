# Roadmap

The roadmap is sequenced around evidence quality and operating controls. Record count is not the
primary success measure.

## Public beta

- Publish only after the Tier-3 release checklist and dual approvals are complete.
- Keep the six-record inventory and 100 timelines visibly synthetic.
- Resolve the representative real-GPU performance gate or explicitly accept it as inconclusive.
- Open correction, source-request, and fixture-first adapter contribution paths.

## Evidence expansion

- Replace synthetic examples metro by metro with approved public-source records.
- Require source-level authority, directness, timestamps, rights, and exact references.
- Add independent review queues and conflict-resolution evidence.
- Publish coverage and missingness measures beside every expansion.

## Operating maturity

- Exercise backup, restore, artifact rollback, and correction lineage in a non-production
  environment.
- Add source-health, ingestion-lag, dead-letter, and evidence-retention telemetry.
- Threat-model any authentication, uploads, or contributor execution before implementation.
- Measure accessibility and performance on representative devices and GPUs.

## Optional scale path

- Evaluate PostgreSQL/PostGIS for spatial and temporal query load.
- Evaluate object storage for immutable evidence snapshots.
- Evaluate PMTiles for a reviewed, same-origin basemap.
- Keep web request paths deterministic and move retrieval to bounded asynchronous workers.

## Explicitly not promised

No date is committed for production hosting, broad geographic coverage, capacity estimation,
automated factual approval, or a contributor write API. Each would require separate evidence,
design, and approval.
