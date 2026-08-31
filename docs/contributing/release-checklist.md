# Tier-3 external public-beta release checklist

This checklist controls external publication. The local launch package does not authorize a commit,
push, remote repository, public visibility, hosting, domain, release, or production action.

## Current local disposition

- [x] Launch-candidate rerun: 32 measured gates pass.
- [x] Launch-candidate rerun: 0 measured gates fail.
- [x] Representative laptop real-GPU gate: **pass** at 120.00 FPS over 10,050.00 ms. The
  scripted real-browser artifact was generated at 2026-08-31T00:03:56.701Z for
  `/globe?theme=obsidian` with `/globe` runtime fingerprint
  `sha256:db8adaf9a321b2b6d0e5c15dfd5567c22d93808820a8745e77f711f6fb85a889`, Chrome
  151.0.0.0, the Apple M4 Pro Metal renderer, matching 1199 × 792 overlay/canvas geometry,
  summarized frame evidence, consistent frame math, and bound globe PNG/demo WebM hashes.
- [ ] Representative midrange mobile gate: **inconclusive**; the 30 FPS target remains unmeasured.
- [x] Mobile residual risk accepted by Brian Letort at 2026-08-30T18:52:00Z; this acceptance is
  not a measured mobile pass.
- [x] Final launch-package release gates rerun and report reviewed.
- [x] Search indexing remains closed: page metadata emits `noindex,nofollow` and `/robots.txt`
  disallows `/`.

Manifest video status: `captured`.

The remaining mobile inconclusive decision is not a pass. The release owners must either obtain a
representative midrange mobile measurement or explicitly accept the residual risk before
publication.

## Launch-media acceptance

Complete and approve exactly one disposition:

- [x] **Option A — verified public demo video accepted:** a meaningful WebGL scene, persistent
  synthetic warning, bounded file size, and public playback were reviewed successfully.
- [ ] **Option B — pending-video disclosure and storyboard accepted:** no fallback footage is
  retained; README, release notes, storyboard, and capture manifest disclose the pending state.

The selected option must match `docs/assets/launch/manifest.json`. A pending-video disposition does
not block publication when both release approvers explicitly accept Option B.

## Approval record

- [x] Reapprove runtime fingerprint
  `sha256:db8adaf9a321b2b6d0e5c15dfd5567c22d93808820a8745e77f711f6fb85a889` after the
  production API tracing repair. Earlier approvals apply to the superseded fingerprint
  `sha256:fd16f811654ae7ca16a864970e6ac44e083614eb97e4b1c0a66dd045d8f2d62e`.
- [x] Release approval 1: Brian Letort, 2026-08-31T10:02:00Z, repaired runtime fingerprint.
- [x] Release approval 2: Daniel Letort, 2026-08-31T10:02:00Z, repaired runtime fingerprint.
- [x] Merge/publication approval: Brian Letort, 2026-08-31T10:02:00Z, repaired runtime
  fingerprint.

Dual release approvals are required. No approver can approve a revision different from the one
evaluated without rerunning affected gates.

## Branding and destination

- [x] Confirm the public name and repository slug: AI Infrastructure Reality Ledger at
  `Brianletort/ai-infrastructure-reality-ledger`.
- [x] Record trademark/name review. The exact-name search found no direct collision; that is not
  trademark clearance.
- [x] Confirm repository owner and initial visibility: `Brianletort`, private before public review.
- [x] Confirm default branch `main` and Apache-2.0 license display after remote creation.
- [x] No custom domain is required for this beta; the approved canonical origin is
  `https://ai-infrastructure-reality-ledger.vercel.app`.
- [x] Replace local demo and repository URL placeholders only with approved destinations.

## Source, data, and license

- [x] Confirm the six-record inventory and 100 timelines remain visibly synthetic and are never
  described as real market coverage.
- [x] Confirm all source manifests contain publisher, authority, directness, retrieval, attribution,
  rights, and redistribution class.
- [x] Run `npm run notices:check`.
- [x] Include `LICENSE`, `THIRD_PARTY_NOTICES.md`, `THIRD_PARTY_NOTICES.json`,
  `THIRD_PARTY_NOTICES.python.json`, and the ODbL artifact notice.
- [x] Confirm every reviewed Node and locked Python package has an allowed or exact approved
  disposition.
- [x] Confirm no LGPL- or MPL-covered dependency file was modified under the current disposition.
- [x] Review screenshots, the selected launch-media disposition, release copy, and issue examples
  for restricted or personal data.
- [x] Approve `https://github.com/Brianletort/ai-infrastructure-reality-ledger` as the public
  repository contact URL for
  `REALITY_LEDGER_OVERPASS_CONTACT_URL`. It must be a public HTTPS path without credentials,
  query parameters, or a fragment. Live ingestion remains blocked and falls back to the
  explicitly synthetic fixture until this value is configured and reviewed.

## Security and repository hygiene

- [x] Run the configured local secret-pattern scan through the final release gates.
- [x] Run a separate approved repository-history secret scan after the first local commit and before
  public visibility.
- [x] Confirm `.env.local`, credentials, private keys, local evidence, browser profiles, traces, and
  temporary video directories are excluded.
- [x] Run `npm run release:verify-boundaries` after the production build. Confirm both the source
  package inventory and hosting package inventory exclude `.local/**`, and confirm neither package
  contains a symlink resolving into `.local/**`.
- [ ] Confirm security-reporting instructions point to an active private channel before visibility.
- [ ] Confirm branch protection, required review, dependency alerts, and least-privilege repository
  access.
- [x] Describe scan results as configured local checks, not full security verification.

## Final local release gate

From the exact revision proposed for publication:

```bash
npm ci
uv sync --project apps/worker --frozen
npx playwright install chromium firefox webkit
npm run notices:check
npm run launch:capture
npm run release:verify-boundaries
npm run gates:release
```

- [x] Review `evaluations/review_report.md` and `evaluations/review_report.json`.
- [x] Require 0 measured failures.
- [x] Record every inconclusive gate and explicit owner disposition.
- [x] Review Chromium, Firefox, and WebKit results.
- [x] Review launch screenshots and the selected media disposition. For Option A, inspect video for
  warning visibility, meaningful WebGL, bounded size, and unrelated local content. For Option B,
  confirm no video is retained and the pending disclosure/storyboard is consistent.
- [x] For representative laptop real-GPU evidence, require `generatedAt` within the configured
  freshness window, route, `source-fingerprint` revision identity for the current no-commit
  `/globe` runtime fingerprint, capture method, browser name/version/user agent, renderer, overlay
  and canvas geometry, summarized frame evidence, frameCount/duration/fps consistency within
  tolerance, and hashes for available screenshots or demo files.
- [x] Confirm generated report and launch artifacts match the proposed revision.

## Commit, remote, and public visibility

These steps require final approval and are intentionally not executed by local package preparation.

- [x] Create the first reviewed local commit from the approved file inventory.
- [x] Create or confirm the approved remote repository.
- [x] Push the approved branch without force.
- [x] Review the remote diff, rendered README, license, issue forms, and security settings while the
  repository remains private.
- [ ] Create the approved tag and GitHub release from the same evaluated revision.
- [ ] Change repository visibility only after dual release approval and remote post-checks.

## Search indexing decision

The reviewed launch candidate must remain `noindex,nofollow` until hosted public-visibility
approval is recorded for the exact revision and destination.

- [ ] Record hosted public-visibility approval, canonical public URL, owner, UTC timestamp, and
  approved revision before changing either robots control.
- [ ] In `apps/web/src/app/layout.tsx`, change only `robots.index` and `robots.follow` from `false`
  to `true` (`index: true`, `follow: true`).
- [ ] In `apps/web/src/app/robots.ts`, replace `disallow: "/"` with `allow: "/"`.
- [ ] Set `NEXT_PUBLIC_SITE_URL` to the approved canonical HTTPS origin, rebuild, rerun
  `npm run gates:release`, and obtain approval for the newly evaluated revision.
- [ ] On the immutable hosted preview, verify `/robots.txt` contains `Allow: /`, the rendered HTML
  contains `<meta name="robots" content="index, follow">`, the canonical origin is correct, and no
  route emits `noindex` or `nofollow`.
- [x] Indexing approval for this runtime revision is absent; retain
  `index: false`, `follow: false`, and `disallow: "/"`.

## Hosting and domain

- [x] Approve Vercel hosting under Brian Letort's account, managed runtime identity and TLS, no
  application secrets, platform logging/retention, and immutable-deployment rollback.
- [x] Deploy immutable preview `dpl_4HBDbi5ho6N7XbXsGY5vK28MBt17` from the approved revision.
- [x] Run route, API, warning, security-header, accessibility, and asset smoke checks.
- [x] Confirm no third-party network calls occur in page request paths.
- [x] No custom domain or DNS change is included in this beta.
- [x] Preview deployment recorded at 2026-08-31T00:01:04Z; owner: Brian Letort.

## Post-check

- [ ] Verify home, `/launch`, globe, metro, facility, timeline/evidence, sources, corrections, and
  404 routes.
- [ ] Verify the six-record/100-timeline synthetic warning on representative desktop and mobile
  pages.
- [ ] Verify social preview and repository screenshots from the public destination; verify either
  the accepted public demo video or the approved pending-video disclosure and storyboard.
- [ ] Verify issue forms, private security channel, license files, and correction workflow.
- [ ] Verify the approved indexing disposition from both `/robots.txt` and representative rendered
  pages; public visibility alone does not authorize indexing.
- [ ] Rerun `npm run release:verify-boundaries` against the source package and exact hosting
  package selected for release; retain the `.local/**`-free inventories with the release evidence.
- [ ] Check application errors, failed requests, unexpected outbound calls, and asset sizes.
- [ ] Record pass/fail evidence and the release decision.

## Rollback

Trigger rollback for a secret, restricted-data exposure, broken warning, incorrect claim, missing
license notice, material route failure, or unapproved external behavior.

1. Return repository visibility to private if exposure controls permit; otherwise remove public
   release/tag artifacts through the approved incident process.
2. Roll hosting back to the last reviewed immutable revision or disable the deployment.
3. Revert DNS only through the approved DNS workflow.
4. Preserve audit evidence without retaining exposed secrets in routine artifacts.
5. Rotate any exposed credential outside the repository.
6. Correct the source revision, rerun all gates, obtain new approvals, and document the incident.

This checklist is operational guidance, not legal advice.
