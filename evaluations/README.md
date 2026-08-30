# Local release evaluation gates

The release decision is generated locally with:

```bash
npm ci
npx playwright install chromium firefox webkit
npm run gates:release
```

`gates:release` runs the data, source-license, dependency-audit, security, misuse, performance,
accessibility, visual-regression, cross-browser, TypeScript, Python, build, and diff gates. It does
not deploy, mutate an external service, or create CI configuration.
Passing security entries mean only that the configured local scans passed. They do not constitute
full security verification or assurance.

## Decision semantics

- `pass`: the documented local assertion was measured and met its threshold.
- `fail`: a measured assertion or required command failed.
- `inconclusive`: evidence is absent or not representative. Inconclusive is not converted to pass.

A failed gate makes the release decision `fail`. With no failures, any inconclusive gate makes the
decision `inconclusive`. The command exits `0` for pass, `1` for fail, and `2` for inconclusive.

## Gate inventory

| Area | Measurement |
| --- | --- |
| Data quality | All domain schema tests; deterministic inventory/corpus generation; 25 timelines per deep metro; labels, citations, timestamps, confidence, review independence, activation, correction lineage, unknowns, precision, conflicts, and coverage consistency |
| Entity resolution | Precision on a small labeled synthetic gold set only; never described as real-world precision |
| Licensing | Required source fields, prohibited-source exclusion, ODbL notice/attribution/share-alike, every installed Node package, every locked Python package matched to environment metadata, and exact allow/review/deny dispositions with deterministic third-party notices |
| Security/misuse | Configured local npm and Python audits, secret patterns, request-route network scan, unsafe HTML/eval, route file access, API limits, public API precision/raw-tag checks, and correction external mutation |
| Release boundaries | `npm run release:verify-boundaries` inventories the source package and built hosting package, rejects any `.local/**` path, rejects package symlinks resolving into `.local/**`, and requires the explicit root ignore rule |
| Browsers | Headless Chromium, Firefox, and WebKit on home, launch, globe, metro, facility, timeline, search, compare, correction, sources, methodology, 404, and API bounds |
| Accessibility | Persistent synthetic warning, keyboard access, reduced motion, WebGL-independent fallback, responsive overflow, and axe serious/critical count |
| Visual | Twenty deterministic Chromium baselines: ten views at desktop and representative mobile |
| Performance | HTML response, interactive readiness, globe page JavaScript, separately reported MapLibre worker assets, layer generation, playback reducer, adaptive quality, headless frame cadence, and separately recorded representative laptop real-GPU evidence |

## Thresholds

The machine-readable source is `evaluations/gate.config.json`.

- Server HTML p95: at most 1,500 ms locally.
- Interactive readiness p95: at most 4,000 ms locally.
- Globe page JavaScript transfer: at most 2,500 KiB, measured from Next.js page chunks. The
  same-origin MapLibre worker and its shared module execute in a separate worker context, are
  reported independently in `browser-performance.json`, and are not counted as page dynamic
  JavaScript.
- Layer generation p95: at most 50 ms.
- Playback reducer p95 per action: at most 5 ms.
- Headless animation cadence: at least 20 FPS as a regression signal.
- Representative laptop real-GPU measurement: at least 60 FPS for at least 10,000 ms, with a
  visible deck overlay, positive MapLibre canvas dimensions, and no software/SwiftShader renderer.
  The artifact must also record a generated/captured ISO timestamp no older than one hour at gate
  time, the measured route, `source-fingerprint` revision identity for the current no-commit
  `/globe` runtime fingerprint, capture method, browser name/version/user agent, renderer, overlay
  and canvas geometry, summarized frame evidence, frameCount/duration/fps mathematical consistency
  within `realGpuFpsTolerance`, and hashes for available screenshot/demo evidence.
  The runtime fingerprint covers `/globe` route source, shared layout/style modules, package source
  and manifests, lock/build configuration, and runtime visual/vendor assets; it excludes evaluation
  artifacts/tests/docs, generated reports, launch prose/media, and other non-runtime release
  records.
- Representative midrange mobile target: at least 30 FPS; currently unmeasured and inconclusive.
- Axe serious/critical violations: zero.
- Visual max changed-pixel ratio: 1%.
- Synthetic labeled-set entity-resolution precision: at least 0.95.

The current scripted Chrome 151.0.0.0 laptop measurement used the Apple M4 Pro Metal renderer and
route `/globe?theme=obsidian`. It was generated at 2026-08-30T17:11:37.113Z against the `/globe`
runtime fingerprint `sha256:fd16f811654ae7ca16a864970e6ac44e083614eb97e4b1c0a66dd045d8f2d62e`,
with matching 1199 × 792 overlay/canvas geometry. It measured 1,200 frames over 10,000.00 ms:
120.00 FPS, 10.20 ms p95 frame time, and 10.40 ms maximum frame time, and binds the current globe
PNG and demo WebM hashes. That passes the 60 FPS representative laptop gate. It does not
substantiate the 30 FPS representative midrange mobile target, which remains `inconclusive`.

The release-boundary check must run after `npm run build` so the exact Next.js hosting package is
present. Ignoring `.local/` is necessary but not sufficient: the gate separately inspects the
proposed source inventory and hosting output and fails if restricted evidence is package-visible.

## Third-party notice workflow

`THIRD_PARTY_NOTICES.json` is the explicit reviewed Node package/version approval record.
`THIRD_PARTY_NOTICES.python.json` is generated from `uv.lock` and installed package metadata and
records allow, review, or deny disposition for every locked registry package.
`THIRD_PARTY_NOTICES.md` is generated deterministically:

```bash
npm run notices:generate
npm run notices:check
```

The licensing gate fails when required inventory is missing or stale, an unknown/custom license or
required notice field is absent, a covered dependency is recorded as modified, or the Markdown
notice does not byte-match generated output. Review-list licenses remain inconclusive until the
exact package/version is explicitly approved; they are not globally allow-listed.

## Visual workflow

Create or intentionally update baselines only after a production build:

```bash
npm run build
npm run gates:visual:update
npx playwright test evaluations/browser/visual.spec.ts
```

The second command creates baselines; the third is the required comparison pass. Review all
screenshots for overlap, out-of-bounds content, density, missing assets, and typography. Record the
inspection in `evaluations/artifacts/visual-inspection.json`. Repair only a reproduced failure, log
it in `evaluations/repair_changelog.md`, and stop after three repair cycles.

## Artifacts and rollback

- Release reports: `evaluations/review_report.md` and `evaluations/review_report.json`
- Command logs and raw results: `evaluations/artifacts/`
- Browser traces/screenshots: `evaluations/artifacts/playwright/`
- Visual baselines: `evaluations/visual-baselines/`
- Report schema: `evaluations/schemas/review-report.schema.json`

Rollback is file-local: remove `evaluations/`, `playwright.config.ts`, root gate scripts and
development dependencies, the `pip-audit` development dependency, and the security headers in
`apps/web/next.config.ts`. No production data or external state is changed by these gates.
