# Task packet: Evidence platform

- `project_key`: `memoryos`
- `linear_issue_id`: `not_provided`
- `linear_session_id`: `not_provided`
- `work_item_id`: `unavailable` (inherited clean-room session; no external registration attempted)
- `run_id`: `reality-ledger-task2-2026-08-29`
- `otel_trace_id`: `not_provided`
- `risk_tier`: `2`
- `date`: `2026-08-29`
- `branch`: `feat/public-beta`

## Goal

Build the clean-room Reality Ledger evidence backbone: versioned PostgreSQL/PostGIS persistence,
policy-aware ingestion primitives, a matching TypeScript source SDK, deterministic synthetic read
models and bounded Next.js read APIs.

## Acceptance criteria

- [x] Versioned, idempotent SQL migrations cover all required evidence, entity, lineage, graph,
  review, and async-job records with immutability controls and focused indexes.
- [x] Python ingestion supports versioned adapters, policy-enforced content-addressed storage,
  deterministic entity resolution, temporal claims, conservative lifecycle adjudication,
  provenance-preserving graph projection, and safe PostgreSQL job-claim semantics.
- [x] TypeScript source SDK contracts match source policy and include validation plus a synthetic
  fixture harness.
- [x] Next.js read handlers expose bounded search, facility/provider lookup, timelines, evidence
  packets, source manifests, and contested claims through a repository interface.
- [x] API responses preserve citations, confidence dimensions, retrieval dates,
  lifecycle/correction lineage, and explicit missingness.
- [x] Documentation covers architecture, migration/rollback, adapter authoring, and API contracts.
- [x] Required root, Python, SQL, data-quality, security, and performance checks pass.
- [x] All fixtures and examples are synthetic; there are no external fetches or production changes.

## Scope boundaries

### In scope

- Local schema and migration files; no database application.
- Side-effect-free ingestion domain logic and local filesystem object-store behavior.
- Synthetic fixtures, repository implementation, read APIs, tests, and documentation.

### Explicitly out of scope

- Remote or production databases, infrastructure, deployments, authentication, and authorization.
- Real source connectors, third-party request-path calls, real companies, customers, or source data.
- Bulk topology export/reconstruction.
- Magellan or Pawsey implementation files, schemas, prompts, data, styles, and assets.
- Git commits, pushes, and pull requests.

## Required evaluations

- Root: lint, typecheck, tests, build.
- Python: Ruff, Pyright, pytest.
- SQL: focused static tests for required objects, immutability, indexes, and job semantics.
- Security/data: redistribution denial, synthetic-data review, secret-pattern review.
- Performance: bounded API limits and anti-bulk tests.
- Dependency audit if dependencies change.

## Gates

| Gate | Required | Status |
| --- | --- | --- |
| Architecture | Yes | Pre-authorized by the binding Task 2 brief; merge review pending |
| Data | Yes | Pre-authorized for local versioned schema work; merge review pending |
| Security | Yes | Pre-authorized for policy-enforced local code; merge review pending |
| Performance | Yes | Pre-authorized for bounded read APIs; merge review pending |
| Release | No | No release or production action |
| Merge | Yes | Pending human review; this task does not commit or merge |

## Required outputs

- Uncommitted implementation on `feat/public-beta`.
- Full report at `/tmp/reality-ledger-task2-report.md` with exact commands and results.
- Changed-file summary, test summary, and residual concerns.

## Verification record

Executed from the repository root on 2026-08-29:

- `npm run lint` — exit 0.
- `npm run typecheck` — exit 0.
- `npm test` — exit 0; 31 tests passed across 4 files.
- `npm run build` — exit 0; seven dynamic read routes and the static application built.
- `npm run python:lint` — exit 0; Ruff passed.
- `npm run python:typecheck` — exit 0; Pyright reported 0 errors and 0 warnings.
- `npm run python:test` — exit 0; 19 tests passed.
- `git diff --check` — exit 0.
- API source scan for `fetch(` and `axios(` — no request-path network calls.
- Credential-assignment pattern scan — no matches.
- Dependency audit was not required because no dependency or lockfile versions changed in Task 2.

## Residual concerns

- SQL checks are static; migrations were not applied because this task prohibits remote/production
  database actions and no disposable PostgreSQL/PostGIS service was provisioned.
- The filesystem object store is a local primitive, not a multi-host production storage system.
- Read handlers intentionally use synthetic fixtures; a PostgreSQL repository remains future work.
