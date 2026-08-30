# Task packet: Release evaluation gates

- `project_key`: `memoryos`
- `linear_issue_id`: `not_provided`
- `linear_session_id`: `not_provided`
- `work_item_id`: `unavailable` (AgentOS endpoint unavailable)
- `run_id`: `reality-ledger-task7-review-remediation-2026-08-30`
- `otel_trace_id`: `not_provided`
- `risk_tier`: `2`
- `date`: `2026-08-29`
- `branch`: `feat/public-beta`

## Goal and acceptance criteria

Implement and run repeatable local data-quality, source-license, configured security-scan, misuse, performance,
accessibility, visual-regression, and cross-browser release gates. Preserve pass/fail/inconclusive
semantics, exact-pin new dependencies, and produce machine-readable and human-readable evidence.

- [x] One local release-gate command and documented thresholds.
- [x] Deterministic data, corpus semantics, precision, licensing, configured local security scans,
  and misuse checks without claiming full security verification.
- [x] Headless Chromium, Firefox, and WebKit coverage with axe and responsive assertions.
- [x] Deterministic desktop/mobile screenshot baselines and a second comparison pass.
- [x] Local performance and bundle budgets with real-GPU FPS explicitly inconclusive.
- [x] Review reports, raw artifacts, repair log, rollback notes, and exact release decision.
- [x] Approved public inventory contract remediation preserves stable IDs, generalized
  coordinates, citations, attribution, missingness, and corpus labels while removing raw source
  fields.
- [x] Globe page dynamic JavaScript is measured separately from same-origin worker assets and
  remains below the unchanged 2,500 KiB threshold.
- [x] Every reviewed Node package/version has an explicit approved disposition, attribution,
  source/license links, required obligations, and unmodified-file status.
- [x] Deterministic human- and machine-readable third-party notices are generated and gated.
- [x] Every locked Python registry package is matched to installed metadata and receives an
  explicit allow, review, or deny disposition; unknown/custom licenses fail closed.
- [x] Release writers create absent artifact parent directories before writing.
- [x] Missing source attribution/license objects return structured failures without exceptions.

## Scope boundaries

In scope: `evaluations/`, exact-pinned local evaluation dependencies, Playwright configuration,
tests, security response headers, verified UI repairs required for gateability, and the
user-approved redacted `/api/inventory` public contract, package license dispositions, and
third-party notice artifacts.

Out of scope: deployment, CI infrastructure, GUI browser windows, auth/permissions, database
schemas, production/external mutation, commits, and any public contract change beyond the approved
inventory redaction.

## Required evaluations and gates

- Existing TypeScript/Python tests, lint, typecheck, build, npm/Python audits, and `git diff --check`.
- Data, security, performance, architecture, and merge review gates required by tier 2.
- Tier-2 local dependency/evaluation work is pre-authorized by the binding Task 7 brief; the
  `/api/inventory` contract change was explicitly approved on 2026-08-30.
- The enumerated LGPL-3.0-or-later, CC-BY-4.0, MPL-2.0, and BlueOak-1.0.0 package dispositions
  were explicitly approved on 2026-08-30 subject to notices, attribution, source/license links,
  and no modification of copyleft-covered dependency files.
- Python `certifi@2026.7.22` received a separate explicit MPL-2.0 disposition on 2026-08-30 under
  the same file-level-copyleft, deterministic-notice, attribution/source-link, and unmodified-file
  controls. Ordinary permissive Python packages follow the allow policy.
- Release and merge remain human decisions; this task does not commit, deploy, or merge.

## Required outputs

- Uncommitted implementation on `feat/public-beta`.
- `evaluations/review_report.md`, `evaluations/review_report.json`, raw artifacts, baselines, and
  repair changelog.
- Full task report at `/tmp/reality-ledger-task7-report.md`.

## Final remediation evidence

- `npm run gates:release`: `INCONCLUSIVE`, with 30 pass, 0 fail, and 1 inconclusive.
- Package licensing: 17/17 reviewed package/version dispositions are explicit and approved;
  deterministic NOTICE generation and the `license.packages` gate pass.
- Python licensing: 35/35 locked registry packages are matched to installed metadata and included
  in deterministic machine/human notices. The exact `certifi@2026.7.22` MPL-2.0 disposition is
  explicitly approved and passes its file-level-copyleft and unmodified-file controls.
- Clean-checkout outputs: RED/GREEN behavior coverage confirms absent artifact parents are created
  before writes; source-manifest missing attribution/license objects return structured failures.
- Security: configured local secret/network/unsafe-code scans and npm/Python audits passed. This is
  not full security verification.
- Public inventory anti-leak contract: pass in Chromium, Firefox, and WebKit.
- Globe page dynamic JavaScript: 2,278.87 KiB against the unchanged 2,500 KiB threshold;
  MapLibre worker modules: 496.26 KiB reported separately.
- Browser suite: 76 passed, 38 intentionally skipped, 0 failed.
- TypeScript: 109 unit tests passed; lint, typecheck, and production build passed.
- Python: 60 tests passed; lint, typecheck, data-quality gates, and audit passed.
- Gate behavior/threat models: 18 tests passed, including the certifi exact-approval overlay.
- Remaining inconclusive gate: representative real-GPU FPS only.
