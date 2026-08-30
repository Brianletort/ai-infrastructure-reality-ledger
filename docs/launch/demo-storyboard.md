# Headless demo storyboard

## Purpose

Show the evidence path in under 35 seconds: home → globe → metro/timeline → evidence. Every scene
must retain a visible synthetic-data warning. The footage demonstrates interface behavior only.

Video status: **captured**. The repaired headless path produced a meaningful MapLibre/deck.gl scene,
retained the synthetic warning, and created `docs/assets/launch/reality-ledger-demo.webm`.

## Capture conditions

- Build: local production build
- Browser: pinned Playwright Chromium, headless
- Viewport: 1440 × 900
- Motion: reduced motion enabled for deterministic screenshots; normal bounded scrolling for video
- Network: loopback application only; service workers blocked
- Output: WebM, target below 12 MB

Recreate:

```bash
npm run build
npm run launch:capture
```

The script starts the built app on `127.0.0.1:4183`, captures deterministic screenshots and social
art, verifies nonzero globe overlay geometry, records the sequence only when the meaningful-WebGL
check passes, writes the captured status and hashes to the manifest, and stops the local process.

## Sequence

1. **Home, 0–6 seconds**

   Hold the hero and current-edition panel. The visible banner states `SYNTHETIC REVIEWED BETA /
   NOT PUBLIC FACTUAL DATA`. Scroll to the globe entry.

2. **Globe, 6–17 seconds**

   Open `/globe?theme=obsidian`. Hold the local evidence scene, generalized-coordinate caveat, and
   event controls. Scroll enough to show the text fallback heading.

3. **Metro, 17–23 seconds**

   Open `/metros/northern-virginia`. Hold the synthetic metro overview and timeline list. Do not
   present the timeline count as facility or market coverage.

4. **Timeline, 23–31 seconds**

   Open `/timelines/synthetic-northern-virginia-01`. Hold the lifecycle history and open the first
   evidence disclosure. The warning remains visible.

5. **End frame, 31–34 seconds**

   Return to `/launch#contribute`. Hold the contribution paths and release disposition.

## Review checklist

- Warning is legible in every route.
- No credentials, local usernames, browser chrome, notifications, or unrelated windows appear.
- Globe scene is meaningful rather than blank or error fallback.
- Timeline and evidence content are visible.
- File opens as WebM and remains under the asset budget.
- If WebGL becomes blank or unusable, do not publish the recording. Keep the script and storyboard,
  delete the failed video, and mark video capture pending in the release notes.
