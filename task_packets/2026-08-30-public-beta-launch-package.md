# Task packet: Public-beta launch package

- `project_key`: `memoryos`
- `linear_issue_id`: `not_provided`
- `linear_session_id`: `not_provided`
- `work_item_id`: `not_registered` (external writes prohibited by binding brief)
- `run_id`: `reality-ledger-task8-2026-08-30`
- `otel_trace_id`: `not_provided`
- `risk_tier`: `2` for local preparation; external release is Tier 3
- `branch`: `feat/public-beta`

## Goal

Prepare and locally verify the complete open-source public-beta package without performing an
external write.

## Acceptance criteria

- [x] Open-source README, governance files, release notes, roadmap, and self-hosting guide.
- [x] `/launch` route with thesis, evidence loop, coverage truth, architecture, contribution paths,
  and honest gate status.
- [x] Deterministic headless screenshots, social art, storyboard, capture script, and verified
  2.76 MB WebM with a meaningful MapLibre/deck.gl scene.
- [x] Forwardable launch narrative, channel drafts, narration, FAQ, and maintainer templates.
- [x] Ten substantive LinkedIn-ready posts with distinct required angles and claim checks.
- [x] Contributor issue forms, source/correction/adapter examples, policy links, and review
  expectations.
- [x] Tier-3 release checklist with dual approvals, branding, real-GPU disposition, security,
  license, publication, hosting, post-check, and rollback controls.
- [x] Robots remain `noindex,nofollow` with `/robots.txt` disallowing `/`; the Tier-3 checklist
  records the exact approval-gated indexing switch, rerun, post-check, and rollback.
- [x] Live Overpass retrieval fails closed before network access unless the validated
  `REALITY_LEDGER_OVERPASS_CONTACT_URL` public path is configured and approved.
- [x] `.env.example` contains exactly the environment variables consumed by production source.
- [x] The threat model records the current `style-src 'unsafe-inline'` scope, justification,
  compensating controls, residual risk, and nonce/hash hardening path without weakening CSP.
- [x] Source and hosting package evaluation rejects `.local/**` and symlinks into it.
- [x] TDD evidence for launch truth, links, paths, assets, secrets, claims, alt text, and warning.
- [x] Complete release gates rerun; reports updated with exact measured disposition.
- [x] Full local report at `/tmp/reality-ledger-task8-report.md`.

## Scope boundaries

In scope: local source, documentation, tests, deterministic checked-in launch assets, and generated
local evaluation reports.

Out of scope: commit, push, remote creation, public visibility, deployment, domain, DNS, IaC,
production configuration, schema or auth changes, data mutation, and any external write.

## Required evaluations

- TDD red/green evidence for launch-package checks.
- TypeScript/Python tests, lint, typecheck, production build, dependency audits, data/license gates,
  headless Chromium/Firefox/WebKit, accessibility, visual regression, and diff check.
- Overpass configuration validation and fail-closed/no-network tests.
- Robots metadata and `robots.txt` browser checks, CSP header checks, exact env/source reconciliation,
  and source/hosting `.local/**` package-boundary evaluation.
- Headless-only launch capture and visual review.
- Security wording limited to configured local checks.

## Required gates

Architecture, data, security, performance, and merge review for local Tier-2 work. Separate dual
release approvals and the full Tier-3 checklist before any external action.

## Outputs

- Uncommitted local launch package on `feat/public-beta`.
- Updated `evaluations/review_report.md`, `evaluations/review_report.json`, and raw artifacts.
- Exact local commands/results and artifact inventory in `/tmp/reality-ledger-task8-report.md`.

## Final whole-repository review remediation

- RED: the added release-control tests produced 6 Node failures for missing robots, env, package,
  and CSP controls plus 10 Python failures for the absent Overpass contact boundary.
- GREEN focused checks: 33 Node launch/gate/threat tests and 23 Python inventory tests passed.
- Hardened release disposition: **INCONCLUSIVE**, with 32 measured passes, 0 failures, a passing
  representative laptop real-GPU gate, and 1 representative midrange mobile inconclusive item.
- Package evidence: 284 source-package files and more than 1,600 built hosting-package files were
  inventoried; neither contained `.local/**` or a symlink resolving into it.
- Cross-browser evidence: 87 tests passed and 42 project-specific cases were intentionally skipped
  across pinned Chromium, Firefox, and WebKit.
- No commit, push, deployment, IaC, production mutation, or other external write was performed.

## Real-browser globe repair evidence

- MapLibre globe projection is applied only after style load; the deck overlay is created only
  after projection succeeds.
- The inventory icon atlas uses same-origin `/visuals/inventory-diamonds.svg`, and the MapLibre
  control container remains visible so deck overlay geometry can render.
- Chromium regression coverage requires the same-origin atlas to load and decode, the deck overlay
  to have nonzero visible geometry, and the globe canvases to contain meaningful rendered pixels.
- Current real-browser laptop evidence: generated at 2026-08-30T17:11:37.113Z; route
  `/globe?theme=obsidian`; `/globe` runtime fingerprint
  `sha256:fd16f811654ae7ca16a864970e6ac44e083614eb97e4b1c0a66dd045d8f2d62e`; scripted real
  browser capture; Chrome 151.0.0.0 user agent; Apple M4 Pro Metal renderer; visible 1199 × 792
  overlay and 1199 × 792 MapLibre canvas; 1,200 frames over 10,000.00 ms; 120.00 FPS; p95
  10.20 ms; maximum 10.40 ms; bound globe PNG and demo WebM hashes.
- The laptop gate rejects software/SwiftShader renderers, hidden overlays, measurements shorter
  than 10 seconds, inconsistent frameCount/duration/fps math, mismatched route/revision/hash
  evidence, and results below 60 FPS. Representative midrange mobile remains inconclusive.
