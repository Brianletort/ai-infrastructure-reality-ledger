# Task packet: Cinematic globe and temporal visual system

- `project_key`: `memoryos`
- `linear_issue_id`: `not_provided`
- `linear_session_id`: `not_provided`
- `work_item_id`: `unavailable` (binding brief limits work to the local repository)
- `run_id`: `reality-ledger-task6-2026-08-29`
- `otel_trace_id`: `not_provided`
- `risk_tier`: `2`
- `date`: `2026-08-29`
- `branch`: `feat/public-beta`

## Goal

Build a production cinematic geographic experience over local public-domain land geometry and the
checked-in synthetic reviewed corpus. Preserve the ledger's uncertainty and warning semantics:
effects communicate reviewed change and selection, never infrastructure capacity, traffic, power
flow, activation, or certainty.

## Acceptance criteria

- [x] MapLibre globe camera and deck.gl analytical layers live in `packages/visuals`.
- [x] PMTiles protocol support accepts a future same-origin archive; default style makes no remote
  request and requires no API token.
- [x] Obsidian Atmosphere, Infrared Grid, and Signal Daylight remain selectable; Obsidian is the
  documented default.
- [x] Public-domain Natural Earth geometry is bundled locally through `world-atlas`.
- [x] Approximate synthetic metro and inventory markers are visually and textually distinct.
- [x] Reviewed arcs and pulses have explicit non-quantitative semantics.
- [x] Deterministic play, pause, speed, step, scrubber, keyboard controls, event count, reduced
  motion, and hidden-document pause behavior are implemented.
- [x] Home, four metro presets, selected facility focus, and canonical URL state are supported.
- [x] Tooltips, selection summary, legend, layers, quality, theme, time, and deep links are present.
- [x] Server-rendered full lists remain usable without JavaScript or WebGL.
- [x] LOD aggregation, memoized layers, bounded local data, and adaptive effects support the
  documented frame-rate budget.
- [x] Final root, Python, dependency, bundle, and diff verification is recorded in the Task 6
  report.

## Scope boundaries

### In scope

- `/globe`, the home entry, geospatial package code, local synthetic scene data, tests, and docs.
- Exact-pinned open-source dependencies needed for MapLibre, deck.gl, PMTiles, TopoJSON conversion,
  and Natural Earth-derived geometry.

### Explicitly out of scope

- Remote basemaps, geocoders, live APIs, third-party runtime services, tokens, deployment, factual
  source replacement, schema changes, and production actions.
- Precise restricted coordinates, raw source tags, or effects that claim real-world operational
  state.
- Magellan or Pawsey implementation files, schemas, prompts, data, assets, or styles.
- Commits, pushes, merges, releases, or production actions.

## Required evaluations

- Root lint, TypeScript typecheck, tests, and build.
- Python Ruff, Pyright, and pytest.
- Dependency audit, build output inspection, and `git diff --check`.
- Unit coverage for URL state, view bounds, themes, LOD/aggregation, playback, reduced motion,
  visual semantics, restricted fields, PMTiles configuration, route inventory, and fallback markup.

## Gates

| Gate | Required | Status |
| --- | --- | --- |
| Architecture | Yes | Pre-authorized by the binding Task 6 brief; merge review pending |
| Data | Yes | Pre-authorized local synthetic/public-domain data only; merge review pending |
| Security | Yes | Pre-authorized no-remote default and restricted-field exclusions; merge review pending |
| Performance | Yes | Pre-authorized bounded layers, aggregation, and adaptive quality; verification pending |
| Release | No | No deployment or production action |
| Merge | Yes | Pending human review; this task does not commit or merge |

## Required outputs

- Uncommitted implementation on `feat/public-beta`.
- Globe architecture, visual semantics, attribution, performance, PMTiles, and accessibility docs.
- Full report at `/tmp/reality-ledger-task6-report.md` with exact commands/results, route/component
  inventory, dependency versions, performance evidence, changed files, and concerns.
