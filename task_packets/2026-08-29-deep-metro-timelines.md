# Task packet: Deep-metro evidence timelines and independent review

- `project_key`: `memoryos`
- `linear_issue_id`: `not_provided`
- `linear_session_id`: `not_provided`
- `work_item_id`: `unavailable` (binding brief prohibits external writes)
- `run_id`: `reality-ledger-task4-2026-08-29`
- `otel_trace_id`: `not_provided`
- `risk_tier`: `2`
- `date`: `2026-08-29`
- `branch`: `feat/public-beta`

## Goal

Build a safe, explicitly synthetic reviewed deep-metro beta corpus and the exact independently
reviewed workflow for replacing fixtures with supported public factual timelines.

## Acceptance criteria

- [x] Typed metro, timeline, event, evidence, review, independence, status, and adjudication
  records preserve temporal, citation, confidence, and lineage fields.
- [x] Activation requires two independent signals with one authoritative source; imagery alone
  cannot activate.
- [x] Versioned official-source configurations cover the four metros in manual/link-only mode,
  assert no unverified endpoint, prohibit interactive scraping, and report source health.
- [x] The generated corpus contains exactly 25 deterministic synthetic timelines per metro and
  labels every nested record with synthetic mode, warning, and false public-fact approval.
- [x] Every timeline has a separate-identity second-pass review; all required fail-closed rules are
  tested.
- [x] Four JSON and four Markdown metro reports reconcile distributions, citation completeness,
  conflicts, missingness, reviews, and activation precision proxy.
- [x] Bounded metro, timeline, evidence-packet, and review/correction-history APIs carry corpus
  mode and warning, reject bulk limits, and return 404 for unknown resources.
- [x] Methodology, source limitations, review, replacement, API, architecture, and contributor
  guidance are documented.
- [x] Required verification commands pass and are recorded in the final report.

## Scope boundaries

### In scope

- Deterministic synthetic fixtures using synthetic names and `.invalid` citations.
- Official landing-page configuration and limitation records.
- Offline generation, independent validation, reports, bounded local read APIs, tests, and docs.

### Explicitly out of scope

- Claims about real providers, customers, facilities, capacity, permits, construction, readiness,
  activation, policy action, or market completeness.
- Invented endpoints, interactive portal scraping, access-control bypass, inline request-path
  network calls, or unreviewed factual publication.
- Magellan or Pawsey implementation files, schemas, prompts, data, assets, or styles.
- Production infrastructure, authentication, deployment, external writes, commits, pushes,
  merges, or releases.

## Required evaluations

- Root lint, typecheck, test, and build.
- Python Ruff, Pyright, and pytest.
- Data quality: deterministic generation, exactly 25 timelines per metro, 100 synthetic and zero
  public factual timelines, nested warnings, review independence, report reconciliation.
- Security/policy: `.invalid` synthetic citations, no invented machine endpoint, no interactive
  scraping, fail-closed review, activation policy, correction lineage, no request-path network.
- Performance: bounded API list/history limits and no bulk topology route.
- `git diff --check`.
- Dependency audit only if dependency versions change.

## Gates

| Gate | Required | Status |
| --- | --- | --- |
| Architecture | Yes | Pre-authorized by binding Task 4 brief; merge review pending |
| Data | Yes | Pre-authorized synthetic reviewed beta and replacement workflow; merge review pending |
| Security | Yes | Pre-authorized offline fixtures and bounded reads; merge review pending |
| Performance | Yes | Pre-authorized bounded generated read model; merge review pending |
| Release | No | No release, deployment, or production action |
| Merge | Yes | Pending human review; this task does not commit or merge |

## Required outputs

- Uncommitted implementation on `feat/public-beta`.
- Generated corpus and four JSON/four Markdown metro reports.
- Full report at `/tmp/reality-ledger-task4-report.md` with exact commands/results, counts,
  changed files, and concerns.

## Verification record

Executed from the repository root on 2026-08-29:

- `npm run lint` — exit 0; ESLint passed.
- `npm run typecheck` — exit 0; web and package TypeScript checks passed. A concurrent invocation
  raced with `next build` while `.next/types` was being rewritten; the required serialized rerun
  passed.
- `npm test` — exit 0; 48 tests passed across 6 files.
- `npm run build` — exit 0; Next.js built all prior routes plus five bounded deep-metro routes;
  package compilation passed.
- `npm run python:lint` — exit 0; Ruff passed.
- `npm run python:typecheck` — exit 0; Pyright reported 0 errors and 0 warnings.
- `npm run python:test` — exit 0; 56 tests passed.
- `git diff --check` — exit 0.
- Generated-corpus safety validation — exit 0; 100 synthetic timelines, 0 real timelines, exactly
  25 per metro, 308 `.invalid` citations, nested warnings/false public-fact approvals, and distinct
  author/reviewer identities.
- API request-path scan for `fetch`, Axios, urllib, or Requests calls — no matches.
- Credential-assignment pattern scan — no matches.
- Dependency audit was not run because no dependency or lockfile version changed.

### Review-finding follow-up

- API loading now validates synthetic mode, false public-fact approval, and exact warning labels
  on every timeline, event, evidence packet, citation, signal, and review before casting to shared
  domain types.
- Independent review now verifies that every event links to an existing same-timeline/same-event
  evidence packet and that nonempty exact event references exactly match packet citation
  references.
- Python and TypeScript official-source gates now reject invalid modes, invalid endpoint types,
  manual sources with endpoints, and machine sources without an HTTPS endpoint. Even a valid
  machine configuration remains unhealthy until an offline fixture exists.
- Focused TypeScript corruption/config tests — 36 passed across 2 files.
- Focused Python linkage/config tests — 14 passed.
- Final `npm run lint` — exit 0.
- Final `npm test` — exit 0; 69 tests passed across 6 files.
- Final `npm run build` — exit 0.
- Final serialized `npm run typecheck` — exit 0.
- Final `npm run python:lint` — exit 0.
- Final `npm run python:typecheck` — exit 0; 0 errors and 0 warnings.
- Final `npm run python:test` — exit 0; 60 tests passed.
- Final `git diff --check` — exit 0.
