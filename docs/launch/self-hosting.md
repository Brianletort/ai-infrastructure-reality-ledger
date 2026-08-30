# Local self-hosting

## Scope

This guide runs the current synthetic/static beta on one machine. It does not provision
infrastructure, configure a production service, or establish production readiness.

## Prerequisites

- Node.js 22 or later and npm 10 or later
- Python 3.12 or later
- `uv` for the locked worker environment
- Git only if obtaining the source from version control
- Optional: local PostgreSQL with PostGIS for architecture evaluation

Verify:

```bash
node --version
npm --version
python3 --version
uv --version
```

## Install

Use lockfiles. Do not substitute production credentials or edit installed dependency files.

```bash
npm ci
uv sync --project apps/worker --frozen
```

For an offline or controlled environment, populate approved npm and Python package caches before
disconnecting. The application itself makes no third-party calls from page request paths.

## Environment reference

The static beta starts without environment variables. Copy `.env.example` only when exercising an
optional local path.

| Variable | Required now | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | No | Metadata base used by Next.js; defaults to `http://localhost:3000` |
| `REALITY_LEDGER_PMTILES_PATH` | No | Optional same-origin PMTiles archive path |
| `REALITY_LEDGER_OVERPASS_CONTACT_URL` | No | Approved public HTTPS repository or operator contact URL; blank blocks live ingestion before any request |

Keep secrets out of `.env.example`, logs, issue reports, screenshots, and committed files. The
Overpass contact value is public identification, not a secret, but it remains an approval-controlled
live-ingestion setting.

## Development startup

```bash
npm run dev --workspace web
```

Open:

- `http://localhost:3000/launch`
- `http://localhost:3000/globe`
- `http://localhost:3000/timelines/synthetic-northern-virginia-01`

Every route must retain the visible `SYNTHETIC REVIEWED BETA / NOT PUBLIC FACTUAL DATA` warning.

## Production-mode local startup

This tests the optimized build locally; it is not a production deployment.

```bash
npm run build
npm run start --workspace web -- --hostname 127.0.0.1 --port 4173
```

Run the process under a non-privileged local account. Bind to loopback unless an approved network
test requires otherwise.

## Health checks

In another terminal:

```bash
curl --fail --silent --show-error http://127.0.0.1:4173/launch >/dev/null
curl --fail --silent --show-error "http://127.0.0.1:4173/api/inventory?limit=1" >/dev/null
uv run --project apps/worker python -c \
  "from reality_ledger_worker.health import get_worker_health; assert get_worker_health().status == 'ready'"
```

Expected results are HTTP 200 for the page and bounded API request, plus a zero exit code for the
side-effect-free worker check. A successful health check says the local process responds; it does
not validate source freshness or factual accuracy.

## Data refresh

Regenerate only the deterministic fixture by default:

```bash
npm run inventory:fixture
npm run metro:generate
```

Review changes to:

- `data/odbl/north-america-facilities.json`
- `data/reports/north-america-coverage.json`
- `data/corpus/deep-metro-reviewed-beta.json`
- `data/reports/deep-metro/`

The bounded source-refresh command is worker-only and can make an external OpenStreetMap request:

```bash
npm run inventory:refresh
```

Use it only when network retrieval and source terms are approved. It falls back to deterministic
fixtures on a bounded retrieval failure. Live retrieval is also blocked before any network request
unless `REALITY_LEDGER_OVERPASS_CONTACT_URL` contains the approved public HTTPS repository or
operator contact path. The value rejects credentials, query parameters, fragments, local hosts,
and reserved example hosts. Never treat fallback output as a successful live refresh. Run the full
release gates after any generated-data change.

## Optional architecture paths

These are integration boundaries, not provisioned services.

### PostgreSQL and PostGIS

Versioned SQL lives in `database/migrations/`. Apply it only to a disposable local database after
reviewing the migration and rollback impact. The current web beta reads checked-in JSON and does
not require PostgreSQL. Before adopting this path, add repository integration, migration tests,
connection pooling, least-privilege roles, backup/restore tests, and schema-change approval.

### Object storage

The worker contains a local filesystem boundary for immutable snapshots, but no environment
variable currently wires it into the launch application. A future object-store implementation
must preserve content hashes, retention, source rights, encryption, least privilege, and audit
history. Do not put credentials or unrestricted buckets in this repository.

### PMTiles

The globe currently uses local scene data and land geometry. A same-origin PMTiles archive can be
evaluated with `REALITY_LEDGER_PMTILES_PATH`. Confirm the archive's license, attribution, size,
cache behavior, and geographic precision before distribution.

### Worker

The worker package contains adapter, normalization, health, job, dead-letter, and artifact
generation boundaries. It is not configured as a daemon or queue consumer. A persistent worker
requires bounded retries, idempotency, queue controls, observability, secret management, and
operational ownership.

## Production-hardening path

Before any internet-facing deployment:

1. complete the Tier-3 release checklist and dual approvals;
2. define threat model, ownership, service boundaries, logging, retention, and incident response;
3. add authentication and authorization only through a separately approved design;
4. use managed secret storage and least-privilege runtime identities;
5. terminate TLS, set trusted origins, retain security headers, and test abuse limits;
6. add health, readiness, source-freshness, queue, error, and rollback telemetry;
7. test restore, correction, and dependency-patching procedures;
8. measure accessibility and representative real-GPU performance on the deployed build.

Keep `noindex,nofollow` and the `/robots.txt` `Disallow: /` rule through private hosted validation.
Only after hosted public-visibility approval, follow the exact two-file switch and hosted post-check
in the [Tier-3 release checklist](../contributing/release-checklist.md).

## Backup

For the static beta, back up the source revision plus checked-in data and evidence artifacts. Do
not back up `node_modules`, `.next`, Playwright temporary video, or local secrets.

If optional local state is used:

- archive the explicitly configured snapshot directory with hashes and source-rights metadata;
- use database-native logical and physical backup appropriate to the local PostgreSQL version;
- retain the exact application revision and migration level with each database backup;
- test restore into an isolated database before relying on the backup.

## Rollback

Stop the local process, restore the prior reviewed source and artifact set, reinstall from lockfiles,
rebuild, and rerun health checks. For a future database-backed build, rollback means restoring a
compatible application revision and database snapshot; do not reverse destructive migrations
without an approved migration-specific procedure.

## Troubleshooting

**Port already in use:** choose another loopback port and update the URLs used for health checks.

**Missing module or lock mismatch:** remove only generated install/build directories, then rerun
`npm ci` and `uv sync --project apps/worker --frozen`. Do not regenerate lockfiles as a repair.

**Globe shows a fallback:** confirm local JavaScript is enabled and inspect browser console output.
The text map summary remains the supported non-WebGL path.

**Screenshots differ:** build first, set reduced motion, use pinned Playwright Chromium, and run
`npm run launch:capture`. Renderer or font changes must be reviewed, not automatically accepted.

**Inventory refresh reports fallback:** inspect the bounded retrieval error. Keep the fixture label;
do not relabel fallback output as live source evidence.

**Release gate exits 2:** that is the expected inconclusive semantic when no gate fails and the
representative midrange mobile target remains unmeasured. The separately recorded laptop real-GPU
gate passed; it does not convert the mobile target into a pass.
