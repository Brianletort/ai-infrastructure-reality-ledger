# Task packet: Editorial intelligence UI

- `project_key`: `memoryos`
- `linear_issue_id`: `not_provided`
- `linear_session_id`: `not_provided`
- `work_item_id`: `unavailable` (binding brief prohibits external writes)
- `run_id`: `reality-ledger-task5-2026-08-29`
- `otel_trace_id`: `not_provided`
- `risk_tier`: `2`
- `date`: `2026-08-29`
- `branch`: `feat/public-beta`

## Goal

Build a premium, self-hostable, accessible editorial intelligence interface over the checked-in
generated inventory and 100-timeline synthetic reviewed corpus without external calls, inferred
relationships, restricted fields, or public-fact ambiguity.

## Acceptance criteria

- [x] Dark editorial design system uses `next/font`, precise spacing/rules, responsive layouts,
  visible focus, semantic landmarks, high-contrast status symbols, and reduced-motion behavior.
- [x] Global shell provides masthead, bounded search entry, navigation, data/corpus status,
  methodology/source/correction links, and attribution.
- [x] Home, region, metro, campus, facility, provider, timeline, search, comparison, changes,
  correction, methodology, coverage, sources, accessibility, security, and contributor experiences
  have canonical routes.
- [x] Pages default to Server Components; client islands are limited to mobile navigation,
  comparison selection, and local correction packet generation.
- [x] Local read models fail closed on timeline labels and omit restricted coordinates/source tags.
- [x] Unknowns, exact references, publication/retrieval dates, confidence dimensions, missingness,
  review decisions, and correction lineage are visible where data supports them.
- [x] Search and comparison query state is bounded and bookmarkable.
- [x] Correction validation creates copyable/downloadable local JSON without network submission.
- [x] Static/dynamic metadata, canonical links, Open Graph defaults, loading, error, and not-found
  states are present.
- [x] UI information architecture, tokens, content style, route map, and rendering boundaries are
  documented.
- [x] Required final verification is recorded in the Task 5 report.

## Scope boundaries

### In scope

- Information architecture and non-map editorial experiences.
- Accessible static globe placeholder.
- Checked-in synthetic/reviewed data, safe derived UI view models, metadata, tests, and docs.

### Explicitly out of scope

- Cinematic globe implementation, production deployment, authentication, schema changes, external
  writes, factual data replacement, inferred relationships, restricted coordinates/tags, or third-
  party request-path calls.
- Magellan or Pawsey implementation files, schemas, prompts, data, assets, or styles.
- Commits, pushes, merges, releases, or production actions.

## Required evaluations

- Root lint, typecheck, test, and build.
- Python Ruff, Pyright, and pytest.
- UI/component semantics and accessibility-oriented static checks.
- Warning propagation, unknown rendering, citations, query bounds, comparison limits, correction
  validation, route inventory, and restricted-field tests.
- `git diff --check`.
- Dependency audit only if dependency versions change.

## Gates

| Gate | Required | Status |
| --- | --- | --- |
| Architecture | Yes | Pre-authorized by binding Task 5 brief; merge review pending |
| Data | Yes | Pre-authorized local synthetic/reviewed reads; merge review pending |
| Security | Yes | Pre-authorized safe local publication model; merge review pending |
| Performance | Yes | Pre-authorized bounded local reads and small client islands; merge review pending |
| Release | No | No release, deployment, or production action |
| Merge | Yes | Pending human review; this task does not commit or merge |

## Required outputs

- Uncommitted implementation on `feat/public-beta`.
- UI architecture/design/content/route documentation.
- Full report at `/tmp/reality-ledger-task5-report.md` with exact commands/results, route inventory,
  changed files, and concerns.
