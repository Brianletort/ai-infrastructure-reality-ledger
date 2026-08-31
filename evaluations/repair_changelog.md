# Evaluation repair changelog

## Cycle 1

- Verified failure: the `/globe` screenshot omitted the interactive experience, and the headless
  keyboard gate could not find the Play control.
- Root cause: the dynamic component loader did not select the exported component explicitly; once
  loaded, headless WebGL initialization could escape the fail-closed map fallback.
- Repair: resolve the named `GlobeExperience` export through the client-only loader and contain map
  construction, projection, and overlay initialization inside the existing fallback boundary.
- Verification: the Play control became reachable and disabled under reduced motion. Updated
  screenshot baselines and the second comparison pass are recorded by the visual gate.

No other UI repair was made in that cycle. The public API topology finding remained a measured
failure until the contract remediation was explicitly approved on 2026-08-30.

## Cycle 2

- Verified failure: Firefox rejected MapLibre's inferred worker URL as HTML, while WebKit could not
  resolve the worker's shared module.
- Root cause: the production bundler did not preserve MapLibre's module-worker sibling relationship.
- Repair: serve the exact-pinned MapLibre worker and shared module as same-origin static assets, and
  configure MapLibre to use that explicit worker URL.
- Verification: the `/globe` no-console-error smoke test passed in Chromium, Firefox, and WebKit
  after a production rebuild.

## Approved release-gate remediation — 2026-08-30

- Verified failure: `/api/inventory` exposed `sourceTags`, `sourceRecordId`, and
  `sourceRecordIds` in all three browser projects.
- Approval: the user explicitly approved this public API contract change.
- Repair: add shared redacted public inventory types and a dedicated repository projection. The
  route now preserves stable facility/site IDs, generalized coordinates, missingness, attributed
  citations, and synthetic corpus labels while omitting raw source fields. Internal editorial
  consumers continue to use the non-public artifact record type.
- RED/GREEN: the route contract test failed on missing corpus labels and leaked raw fields, then
  passed after the projection was applied. The Playwright anti-leak assertion remains active in
  Chromium, Firefox, and WebKit.
- Verified failure: the globe JavaScript gate counted 496.26 KiB of separately hosted MapLibre
  worker modules as page dynamic JavaScript, producing 2,775.13 KiB against the 2,500 KiB page
  threshold.
- Repair: classify Next.js page chunks and same-origin worker modules separately. The page metric
  is 2,278.87 KiB; worker modules remain visible as a separately reported 496.26 KiB measurement.
  The threshold and required globe behavior were unchanged.

## Approved package-license disposition — 2026-08-30

- Previous status: `license.packages` was inconclusive because 17 exact packages under
  LGPL-3.0-or-later, CC-BY-4.0, MPL-2.0, and BlueOak-1.0.0 required policy disposition.
- Approval: the user approved the enumerated packages for the open-source beta subject to a
  generated notice, attribution, source/license links, and no modification of copyleft-covered
  dependency files.
- RED: new behavior tests failed because package-specific disposition validation and deterministic
  notice rendering did not exist.
- GREEN: `THIRD_PARTY_NOTICES.json` records the 17 exact package/version dispositions and
  obligations; `THIRD_PARTY_NOTICES.md` is deterministic generated output. The static licensing
  gate now fails closed for missing, stale, incomplete, non-approved, or modified dispositions.
- Operational controls: LGPL dynamic/unmodified handling, CC-BY attribution, MPL file-level
  copyleft, BlueOak terms, contributor workflow, and release checks are documented without
  presenting legal advice.

## Task 7 review remediation — 2026-08-30

- RED: regression tests reproduced the source-manifest property dereference, missing output
  directory preparation, absent Python license coverage semantics, and over-broad security result
  wording.
- GREEN: source attribution/license validation now returns structured missing-field failures;
  release, static, browser-performance, and Python data-gate writers create parent directories
  before writing.
- Python licensing: all 35 registry packages in `apps/worker/uv.lock` are recorded in
  `THIRD_PARTY_NOTICES.python.json` from exact lock versions and installed distribution metadata.
  Permissive MIT/BSD/Apache/ISC/PSF licenses follow the allow policy; unknown/custom/unmapped
  licenses deny; review-list licenses remain inconclusive pending package-specific approval.
- Approval boundary: `certifi@2026.7.22` is MPL-2.0 and was not among the previously enumerated
  approved packages, so it remains `review-required`. The generated human notice includes it
  without describing it as approved.
- Security wording: generated security results and evaluation guidance now say only that configured
  local scans passed and explicitly disclaim full security verification.

## Approved Python MPL disposition — 2026-08-30

- Approval: the user explicitly approved `certifi@2026.7.22` under the same MPL-2.0
  file-level-copyleft, deterministic-notice, attribution/source-link, and unmodified-file controls
  used for the previously approved MPL packages.
- RED: the exact Python approval-overlay test failed because the inventory had no mechanism to
  apply a package-specific approval to a `review-required` record.
- GREEN: `THIRD_PARTY_NOTICES.json` now records the exact Python disposition, notice generation
  overlays it onto the deterministic lock/environment inventory without losing metadata evidence,
  and the static gate validates all MPL obligations and modification status.

## Task 8 launch-media verification — 2026-08-30

- RED: the initial capture script accepted a visible canvas even though the globe displayed its
  interactive-view error fallback, and retained the resulting WebM as if the scene were meaningful.
- GREEN: capture now checks the visible globe state, deletes fallback footage, records video as
  pending in the deterministic manifest, and keeps the storyboard and bounded retry path.
- Visual baselines: added desktop and mobile `/launch` baselines, updated the shared navigation
  baseline impact, and completed a 20-image rendered review. No overlap, out-of-bounds content,
  overflow, missing assets, or unreadable density was observed.

## Final whole-repository minor-finding remediation — 2026-08-30

- Robots/indexing: added a same-origin `/robots.txt` route that disallows `/` while the existing
  metadata remains `noindex,nofollow`. Launch documentation and the Tier-3 checklist now require
  hosted public-visibility approval, identify the exact two-file switch, require a full rerun, and
  define hosted post-check and rollback evidence.
- Overpass identity: removed the hard-coded repository placeholder. Live client construction now
  requires `REALITY_LEDGER_OVERPASS_CONTACT_URL`, validates a public HTTPS repository/contact path,
  and fails closed before network access when it is absent or invalid. Fixture generation remains
  the safe non-live fallback.
- Environment contract: reduced `.env.example` and the self-hosting reference to the three
  variables consumed by production source, with an automated source-to-example equality test.
- CSP posture: retained the existing policy unchanged and documented why
  `style-src 'unsafe-inline'` is currently scoped to CSS compatibility, its compensating controls,
  residual risk, and the future nonce/hash/class migration.
- Restricted evidence: added a post-build release boundary gate that inventories source and
  hosting packages, rejects `.local/**`, rejects symlinks into `.local/**`, and verifies the root
  ignore rule.
- RED: focused Node tests failed 6 checks for absent robots/package/env/CSP controls; focused Python
  tests failed 10 checks for the missing Overpass configuration boundary.
- GREEN: 33 focused Node policy/threat tests and 23 focused Python inventory tests pass. The direct
  package-boundary check passed with 284 source-package files, more than 1,600 hosting-package
  files, and no restricted findings.
- Historical full gate rerun: **INCONCLUSIVE** with 31 passes, 0 failures, and the then-unchanged
  single representative real-GPU FPS inconclusive item. The new package-boundary gate and 87
  executed cross-browser tests passed; 42 browser cases remained intentionally skipped by project
  design.

## Real-browser globe and launch-media repair — 2026-08-30

- Root causes: synchronous `setProjection` ran before MapLibre style load; the inventory data-URI
  atlas violated `connect-src 'self'`; and `display: none` on `.maplibregl-control-container` hid
  the deck overlay.
- Repair: projection now waits for style load, overlay creation follows successful projection, the
  icon atlas uses `/visuals/inventory-diamonds.svg`, and the control container remains visible.
  Chromium regression coverage requires nonzero visible deck overlay geometry.
- Capture: the repaired headless path produced `reality-ledger-demo.webm`; manifest status is
  `captured`. The prior pending-video disposition above is retained as historical RED/GREEN
  evidence and is superseded by this result.
- Historical repaired-path real-GPU evidence: Chrome 151.0.7922.174; Apple M4 Pro Metal renderer;
  visible overlay; 1199 × 792 MapLibre canvas; 1,201 frames over 10,005.40 ms; 120.04 FPS; p95
  9.20 ms; maximum 9.40 ms.
- Source-bound final recapture: the scripted real-browser artifact generated at
  2026-08-30T17:11:37.113Z
  satisfies the hardened evaluator for `/globe?theme=obsidian`, `/globe` runtime fingerprint
  `sha256:fd16f811654ae7ca16a864970e6ac44e083614eb97e4b1c0a66dd045d8f2d62e`, Chrome
  151.0.0.0 user agent, Apple M4 Pro Metal renderer, 1199 × 792 overlay/canvas geometry, 1,200
  frames over 10,000.00 ms, 120.00 FPS, p95 10.20 ms, maximum 10.40 ms, and bound globe PNG/demo
  WebM hashes. Representative laptop is **PASS**; representative midrange mobile remains
  **INCONCLUSIVE**.

## Vercel function data-tracing repair — 2026-08-31

- Production smoke testing found `/api/inventory` returned HTTP 500 because Next.js function
  tracing omitted checked-in JSON outside `apps/web`.
- Repair: `next.config.ts` now declares the monorepo tracing root and includes `data/**/*.json` and
  `sources/manifests/**/*.json` for API functions. A focused release test locks this packaging
  contract.
- Verification: immutable preview `dpl_4HBDbi5ho6N7XbXsGY5vK28MBt17` returned the six-record
  synthetic inventory without restricted source identifiers. The full release suite reports 32
  pass, 0 fail, and one accepted mobile inconclusive.
- Final M4 recapture: 1,206 frames over 10,050.00 ms at 120.00 FPS on the Apple M4 Pro renderer,
  bound to runtime fingerprint
  `sha256:db8adaf9a321b2b6d0e5c15dfd5567c22d93808820a8745e77f711f6fb85a889`.
