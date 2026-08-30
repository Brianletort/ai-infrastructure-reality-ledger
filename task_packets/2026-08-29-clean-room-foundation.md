# Task packet: Clean-room repository foundation

- `project_key`: `memoryos`
- `linear_issue_id`: `not_provided`
- `linear_session_id`: `not_provided`
- `work_item_id`: `unavailable` (registration attempted; AgentOS hostname did not resolve)
- `run_id`: `9b51cb01-666a-4b1d-8fda-e9b3b3016153`
- `otel_trace_id`: `b13bee38c017237c165f22f6d3098beb`
- `risk_tier`: `2`
- `date`: `2026-08-29`
- `branch`: `feat/public-beta`

## Goal

Create the independently maintainable, clean-room monorepo foundation for an open-source AI
Infrastructure Reality Ledger with typed domain contracts, asynchronous ingestion boundaries,
evidence and source policies, and reproducible quality checks.

## Acceptance criteria

- [x] npm monorepo includes Next.js App Router web, typed Python worker, domain, graph, geo, visuals,
  source SDK, and UI package boundaries.
- [x] Root repository includes workspace scripts, editor and ignore rules, environment example,
  Apache-2.0 license, contribution, security, and executive README material.
- [x] Clean-room, public-data, redistribution, security, and correction policies are explicit.
- [x] Initial architecture decisions cover clean-room separation, PostgreSQL/PostGIS typed edges,
  visual core, immutable asynchronous evidence, and no third-party calls in request paths.
- [x] JSON Schemas and matching TypeScript types cover entity, site, evidence, claim, event,
  relationship, source, license/redistribution, confidence, and correction.
- [x] Evidence states and four distinct time dimensions are represented and validated.
- [x] Schema validation and worker smoke tests exist and were introduced test-first.
- [x] Architecture overview includes a Mermaid data-flow diagram.
- [x] No production infrastructure, real credentials, employer data, or named customer data exists.
- [x] Dependencies are installed with npm and uv.
- [x] Final lint, typecheck, test, build, DQ, security, and performance results recorded below.

## Scope

### In scope

- Repository and package scaffolding.
- Foundation contracts, tests, policies, ADRs, and contributor guidance.
- A side-effect-free worker health primitive.
- Local dependency lockfiles and verification.

### Explicitly out of scope

- Production deployment, infrastructure, databases, queues, storage, or data mutation.
- Authentication, authorization, user accounts, or operational secrets.
- Real source connectors, scraping, model calls, source data, and evidence snapshots.
- Database migrations and finalized persistence schemas.
- Populated maps, graph traversal behavior, or production correction intake.
- Magellan or Pawsey implementation files, schemas, prompts, data, styles, and assets.

## Clearance and provenance

Written employer/IP/disclosure/customer-competitor clearance was confirmed by the user on
2026-08-29. This packet records the user's confirmation; the project does not claim to possess or
independently verify the clearance document.

Implementation provenance is original clean-room work plus public standards and package-manager
scaffolding. No Magellan or Pawsey implementation files were read or copied.

## Required evaluations

| Evaluation | Requirement | Result |
| --- | --- | --- |
| Unit/schema tests | Domain schemas compile and enforce lifecycle/time constraints | 15 passed across domain and web content coverage |
| Worker smoke test | Package imports and health check has no network side effects | 1 passed |
| Type safety | Next.js/TypeScript and strict Python checks pass | TypeScript and Pyright passed |
| Data quality | All schemas compile; invalid lifecycle and missing retrieval time rejected | Passed through schema tests |
| Security | Dependency audit, secret-pattern review, and threat-model review | npm and Python audits found no known vulnerabilities; secret-pattern scan found no matches |
| Performance | Verify web build characteristics and no request-path third-party calls | Static Next.js route built; source scan found links but no `fetch` or `axios` calls |

## Gates

| Gate | Required | Status |
| --- | --- | --- |
| Architecture | Yes | Authorized by the binding Task 1 brief; ADR review still required at merge |
| Data | Yes | Authorized for foundation schemas; reviewer approval required at merge |
| Security | Yes | Authorized for non-production foundation; reviewer approval required at merge |
| Performance | Yes | Authorized for foundation checks; reviewer approval required at merge |
| Release | No | No release or production action in scope |
| Merge | Yes | Pending human review; this task does not commit or merge |

## Required outputs

- Uncommitted repository foundation on `feat/public-beta`.
- Full implementation report at `/tmp/reality-ledger-task1-report.md`.
- Exact verification commands, exit results, and residual concerns.
- No PR link: commit, push, and PR creation are explicitly out of scope.

## Verification record

Executed from the repository root on 2026-08-29:

- `npm run lint` — exit 0.
- `npm run typecheck` — exit 0.
- `npm test` — exit 0; 15 tests passed across 2 test files.
- `npm run build` — exit 0; Next.js 16.3.3 compiled and generated static routes; all TypeScript
  packages built.
- `npm run python:lint` — exit 0; Ruff passed.
- `npm run python:typecheck` — exit 0; Pyright reported 0 errors and 0 warnings.
- `npm run python:test` — exit 0; 1 test passed.
- `npm audit --audit-level=high` — exit 0; 0 vulnerabilities.
- `uvx pip-audit --path apps/worker/.venv/lib/python3.12/site-packages` — exit 0; no known
  vulnerabilities; the local unpublished worker package was not auditable through PyPI.
- `git diff --check` — exit 0.
- Source search for credential assignment patterns — no matches.
- Source search for `fetch`, `axios`, and HTTP URLs in the web source — no request-path network
  calls; starter marketing links were removed from the page and app README.
