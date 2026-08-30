# Reality Ledger release evaluation

**Decision: INCONCLUSIVE**

Generated 2026-08-30T17:21:12.235Z. A pass means only that the measured local gate met its documented
threshold. Unmeasured claims are inconclusive. The local headless cadence is a regression signal,
not evidence for a representative device. The recorded real-browser laptop gate is evaluated
separately; the 30 FPS representative midrange mobile target remains unmeasured. Configured local
security scans passing is not full security verification or assurance.

## Summary

| Pass | Fail | Inconclusive |
| ---: | ---: | ---: |
| 32 | 0 | 1 |

## Gate results

| Gate | Status | Detail |
| --- | --- | --- |
| data.checked-in-artifacts | PASS | All measured assertions passed. |
| data.deep-metro | PASS | All measured assertions passed. |
| data.inventory-coverage | PASS | All measured assertions passed. |
| license.source-manifests | PASS | All measured assertions passed. |
| license.packages | PASS | Every installed Node package is allowed or has an explicit approved disposition and current notice. |
| license.python-packages | PASS | Every locked Python package is installed, enumerated, and allowed by policy or an exact approved disposition. |
| security.secret-scan | PASS | Configured local scan passed; this is not full security verification. |
| security.request-path-network | PASS | Configured local scan passed; this is not full security verification. |
| security.unsafe-code | PASS | Configured local scan passed; this is not full security verification. |
| misuse.api-bounds | PASS | All measured assertions passed. |
| misuse.correction-external-mutation | PASS | All measured assertions passed. |
| data.deterministic-generation | PASS | Two independent fixed-time generations were byte-identical. |
| data.entity-resolution-synthetic-gold | PASS | Synthetic labeled-set precision 1.000; threshold 0.950. This is not real-world precision. |
| harness.behavior-tests | PASS | Command passed in 135 ms. |
| gates.static | PASS | Command passed in 1260 ms. |
| data.python-gates | PASS | Command passed in 246 ms. |
| typescript.tests | PASS | Command passed in 2032 ms. |
| typescript.lint | PASS | Command passed in 5038 ms. |
| typescript.typecheck | PASS | Command passed in 2955 ms. |
| python.tests | PASS | Command passed in 1147 ms. |
| python.lint | PASS | Command passed in 298 ms. |
| python.typecheck | PASS | Command passed in 2701 ms. |
| security.npm-audit | PASS | Configured local npm audit passed; this is not full security verification. |
| security.python-audit | PASS | Configured local Python audit passed; this is not full security verification. |
| build.production | PASS | Command passed in 13303 ms. |
| release.package-boundaries | PASS | Source and hosting package inventories exclude .local/** restricted evidence paths. |
| browser.cross-browser-accessibility-visual-performance | PASS | Command passed in 132642 ms. |
| repository.diff-check | PASS | Command passed in 166 ms. |
| browser.versions | PASS | All three pinned Playwright browser engines recorded version evidence. |
| performance.measured-budgets | PASS | Measured local HTML, readiness, JS payload, headless cadence, layer, and reducer budgets passed. |
| performance.real-gpu-laptop | PASS | Representative laptop real-GPU measurement passed at 120.00 FPS over 10000.00 ms. |
| performance.representative-mobile | INCONCLUSIVE | The 30 FPS representative midrange mobile target remains unmeasured; the laptop result does not substantiate mobile performance. |
| visual.manual-inspection | PASS | All 20 deterministic desktop/mobile baselines were inspected with the repaired globe capture. The launch globe image visibly renders land, graticule, evidence markers, playback controls, and the synthetic warning; the mobile baseline retains the equivalent text index. No overlap, out-of-bounds content, text overflow, unreadable density, missing assets, or inconsistent typography was observed. |

## Release blockers

- No measured failures.

## Inconclusive items

- **performance.representative-mobile:** The 30 FPS representative midrange mobile target remains unmeasured; the laptop result does not substantiate mobile performance.

## Raw artifacts

- Command logs: `evaluations/artifacts/*.log`
- Static/data reports: `evaluations/artifacts/static-gates.json`,
  `evaluations/artifacts/data-quality-python.json`
- Browser and performance evidence: `evaluations/artifacts/playwright-results.json`,
  `evaluations/artifacts/browser-*.json`, `evaluations/artifacts/*performance.json`
- Visual baselines: `evaluations/visual-baselines/`

## Rollback

Remove `evaluations/`, `playwright.config.ts`, the root gate scripts/dependencies, the
`pip-audit` dev dependency, and the security-header block in `apps/web/next.config.ts`.
No schema, production data, deployment, or external system was mutated.
