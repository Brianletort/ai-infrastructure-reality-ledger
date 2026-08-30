# Task packet: North America facility inventory

- `project_key`: `memoryos`
- `linear_issue_id`: `not_provided`
- `linear_session_id`: `not_provided`
- `work_item_id`: `unavailable` (inherited clean-room session)
- `run_id`: `reality-ledger-task3-2026-08-29`
- `otel_trace_id`: `not_provided`
- `risk_tier`: `2`
- `date`: `2026-08-29`
- `branch`: `feat/public-beta`

## Goal

Build the first defensible, explicitly incomplete North America facility inventory from approved
public sources, preserving evidence, license obligations, conflicts, missingness, and bounded
offline-only ingestion.

## Acceptance criteria

- [x] Machine-readable manifests cover authority, directness, cadence, rate limit, attribution,
  license/terms, sensitivity, redistribution, allowed use, automation, and notes.
- [x] ODbL attribution/share-alike is enforced and distributable artifacts are separated.
- [x] PNNL is manual-import only; Canada and Mexico government sources are context-only; PeeringDB
  is prohibited and rejected for ingestion.
- [x] Versioned OSM/Overpass adapter uses explicit data-center tags, bounded regional queries,
  response ceilings, identification, rate limiting, retries, provenance, and fixture tests.
- [x] US, Canada, and Mexico records normalize to canonical facility/site/evidence records without
  inferred tenant, capacity, activation, operator, or unsupported facility type.
- [x] Public coordinates are generalized; exact geometry is retained only in local restricted,
  content-addressed, read-only evidence.
- [x] Exact OSM identities and conservative aliases are deduplicated; overlapping point/area
  records remain explicit unresolved conflicts.
- [x] Live ingestion is attempted only through the offline CLI; blocked retrieval falls back to a
  deterministic synthetic inventory with a plain blocker.
- [x] JSON and Markdown coverage report country, macro-region, metro, operator knownness, geometry,
  explicit tag, source, conflicts, missing fields, timestamps, version, limitations, and explicit
  incompleteness, including four deep-metro buckets.
- [x] Bounded inventory and coverage APIs expose no exact restricted geometry and perform no
  third-party request-path calls.
- [x] Methodology, source/license matrix, ODbL compliance, refresh, APIs, and limitations are
  documented.
- [x] Required verification commands pass and are recorded in the final report.

## Scope boundaries

### In scope

- Approved public-source policy records and fixture data.
- Worker-only OSM/Overpass retrieval and deterministic fallback generation.
- Local restricted immutable evidence, checked-in generalized artifacts, coverage reporting, and
  bounded read APIs.
- Unit, integration, policy, deterministic-generation, and API-bound tests.

### Explicitly out of scope

- Restricted/commercial aggregators, scraped operator directories, Kaggle, DC Atlas,
  DataCentersExposed, and PeeringDB content.
- Magellan or Pawsey implementation files, data, schemas, prompts, assets, or styles.
- Production databases, deployments, infrastructure, authentication, or data mutation.
- Claims of completeness, inferred tenants/capacity/activation/operator, exact public topology,
  large raw PBF files, commits, pushes, or pull requests.

## Required evaluations

- Root: lint, typecheck, test, build.
- Python: Ruff, Pyright, pytest.
- Policy/security: prohibited-source rejection, ODbL metadata/attribution, exact-coordinate
  exclusion, request-path network scan, credential-pattern scan.
- Data quality: deterministic generation, country/deep-metro totals, conflict and missingness
  counts, real-versus-synthetic record counts.
- Performance: query/response ceilings, bounded API limits, rate-limit and retry behavior.
- Dependency audit only if dependency versions change.
- `git diff --check`.

## Gates

| Gate | Required | Status |
| --- | --- | --- |
| Architecture | Yes | Pre-authorized by binding Task 3 brief; merge review pending |
| Data | Yes | Pre-authorized approved public-source inventory; merge review pending |
| Security | Yes | Pre-authorized bounded offline retrieval and exact-coordinate restriction; merge review pending |
| Performance | Yes | Pre-authorized bounded worker and read APIs; merge review pending |
| Release | No | No release, deployment, or production action |
| Merge | Yes | Pending human review; this task does not commit or merge |

## Required outputs

- Uncommitted implementation on `feat/public-beta`.
- Generated ODbL-attributed inventory and JSON/Markdown coverage artifacts.
- Full report at `/tmp/reality-ledger-task3-report.md` with exact commands/results,
  real-versus-synthetic counts, changed files, and concerns.

## Verification record

Executed from the repository root on 2026-08-29:

- `npm run lint` — exit 0; ESLint passed without warnings.
- `npm run typecheck` — exit 0; web and package TypeScript checks passed.
- `npm test` — exit 0; 38 tests passed across 4 files.
- `npm run build` — exit 0; Next.js built with `/api/inventory`, `/api/coverage`, and all prior
  routes; package compilation passed.
- `npm run python:lint` — exit 0; Ruff passed.
- `npm run python:typecheck` — exit 0; Pyright reported 0 errors and 0 warnings.
- `npm run python:test` — exit 0; 44 tests passed.
- `git diff --check` — exit 0.
- Public-artifact scan for exact coordinates, precise address/contact tags, and real OSM fixture
  URLs — no matches.
- API request-path scan for `fetch`, Axios, urllib, or Requests calls — no matches.
- Credential-assignment pattern scan — no matches.
- Dependency audit was not rerun because Task 3 changed no dependency or lockfile versions.
- Bounded live refresh was attempted. The initial pre-scope validation run returned 2,275 records
  but was discarded after identifying cross-border bbox contamination. The corrected
  country-scoped run received HTTP 429, so the checked-in artifact is the deterministic synthetic
  fallback: 0 real records and 6 synthetic records.
- Important-finding follow-up: same-name/same-geometry aliases now merge into one deterministic
  canonical record with alternate names and complete provenance; unresolved overlaps remain
  conflicts.
- Important-finding follow-up: restricted evidence now completes before public publication, and
  the three public artifacts use staged atomic replacement with rollback.
- Focused follow-up verification passed 13 tests across `test_inventory.py` and
  `test_inventory_cli.py`.
