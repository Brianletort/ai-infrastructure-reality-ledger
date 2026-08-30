# Public beta release notes

## Proposed release

**Title:** AI Infrastructure Reality Ledger v0.1.0-beta.0

**Status:** local launch candidate; not tagged, published, or deployed.

## Bottom line

This beta demonstrates an evidence-first way to track AI infrastructure claims without collapsing
announcements, construction, and activation into one number. It is a product and method preview,
not a market dataset.

## Included

- Next.js evidence interface with globe, regions, metros, facilities, timelines, sources,
  comparison, search, corrections, and launch views.
- Typed evidence, entity, event, confidence, source, correction, and relationship contracts.
- Fixture-first Python and TypeScript source-adapter boundaries.
- Deterministic six-record synthetic North America inventory.
- 100 independently reviewed synthetic timelines across four test metros.
- Local data, license, security, misuse, browser, accessibility, visual, and performance gates.
- Reproducible headless screenshots, social preview art, a bounded video capture script, and a
  verified 2.76 MB WebM with a visible globe scene.

## Known limits

- The six inventory records and 100 timelines are not real market coverage or public factual data.
- Capacity is unknown across the inventory; coordinates are generalized to 0.01 degree.
- A public Vercel deployment hosts the synthetic demonstration. No production ingestion,
  production database, service level, adoption, accuracy, or uptime claim exists.
- Search indexing remains intentionally closed: page metadata emits `noindex,nofollow`, and
  `/robots.txt` disallows crawling. Enabling indexing requires separate hosted public-visibility
  approval for the resulting runtime revision.
- Live Overpass ingestion is blocked by default. It requires a validated, approved public
  repository or operator contact URL in `REALITY_LEDGER_OVERPASS_CONTACT_URL`; an absent or invalid
  value falls back to the explicitly synthetic fixture without starting a network request.
- Representative laptop real-GPU performance passed under the hardened evidence policy. The
  scripted real-browser artifact was generated at 2026-08-30T17:11:37.113Z for
  `/globe?theme=obsidian` with `/globe` runtime fingerprint
  `sha256:fd16f811654ae7ca16a864970e6ac44e083614eb97e4b1c0a66dd045d8f2d62e`, Chrome
  151.0.0.0, the Apple M4 Pro Metal renderer, matching 1199 × 792 overlay/canvas geometry, 1,200
  frames over 10,000.00 ms, 120.00 FPS, 10.20 ms p95 frame time, 10.40 ms max frame time, and
  bound globe PNG/demo WebM hashes.
- Representative midrange mobile performance remains unmeasured and inconclusive. Local headless
  cadence is only a regression signal.
- Video status: **captured**. The repaired headless path produced a visible MapLibre/deck.gl globe,
  retained the persistent synthetic warning, and passed the bounded asset-size check.
- Configured local security checks passed in the pre-launch baseline, but that is not full security
  verification.
- The working name had no exact collision in the recorded current search; that is not trademark
  clearance.

## Local release evidence

The hardened launch-candidate rerun generated at 2026-08-30T17:06:49.154Z reports 32 measured
gates pass, 0 fail, and one inconclusive performance gate: representative midrange mobile.
The launch package must rerun the complete command before external approval:

```bash
npm run gates:release
```

The release gate also inventories the proposed source package and built hosting package and fails
if either includes `.local/**` restricted evidence or a symlink resolving into it.

Review [the generated report](../../evaluations/review_report.md) and
[Tier-3 external-release checklist](../contributing/release-checklist.md). An inconclusive release
decision must not be described as a pass.

## Upgrade and rollback

There is no prior public version and no external state to migrate. Local rollback is file-based:
restore the previous source tree and checked-in artifacts. If a future hosted beta is approved,
retain the prior immutable release artifact and hosting revision until smoke and post-checks pass.
