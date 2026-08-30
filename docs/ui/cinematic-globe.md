# Cinematic globe and temporal visual system

## Position

The globe is a geographic index into reviewed evidence, not a digital twin or infrastructure
telemetry display. Every visible marker is synthetic or fixture-derived. Arcs and pulses encode
reviewed sequence and the currently focused change only. They never encode capacity, live traffic,
power flow, activation, utilization, or certainty.

The default beta works from checked-in code and bundled geometry. It does not contact a basemap,
geocoder, analytics endpoint, proprietary tile provider, or other runtime service.

## Architecture

- The `/globe` Server Component parses bounded canonical URL state and always renders the complete
  HTML fallback.
- `globe-client-island.tsx` uses `next/dynamic` with server rendering disabled for the WebGL scene.
  Its top-level dynamic module expression keeps MapLibre, deck.gl, PMTiles, and Natural Earth data
  out of the server-rendered page path.
- `packages/visuals` owns view-state parsing, themes, scene data, aggregation, playback, semantic
  policy, PMTiles configuration, land conversion, deck.gl layers, MapLibre lifecycle, and controls.
- MapLibre GL JS provides the globe projection, camera, gestures, and canvas.
- A deck.gl `MapboxOverlay` draws bundled land polygons, graticule lines, circular deep-metro
  markers, SVG-atlas diamond inventory icons, text labels, reviewed-state arcs, and the current
  reviewed-event pulse.
- PMTiles protocol registration is present. The default style has no tile source; an optional
  validated same-origin source can be injected by server configuration.

## Preserved visual directions

### Obsidian Atmosphere — preferred

A dark editorial field with low-saturation land, mint evidence marks, amber reviewed metros, a
restrained star field, atmospheric limb, and vignette. It provides the best continuity with the
existing ledger and keeps warning/status colors legible.

### Infrared Grid

A higher-energy diagnostic direction using coral and red tokens, denser contrast, and stronger
atmosphere. The increased energy changes presentation only. Marker size, arc direction, and event
logic remain identical to the preferred direction.

### Signal Daylight

A light, restrained analytical direction with green evidence marks and low bloom. It is suitable
for bright rooms and editorial screenshots. Data and interaction semantics are unchanged.

Each direction explicitly supplies star, atmosphere, bloom, grid, and vignette effect intensity.
Those values drive CSS/deck effects, while the background token updates both the frame and the
MapLibre background layer. Signal Daylight sets star intensity to zero.

## Visual semantics

| Visual | Meaning | Explicitly not represented |
| --- | --- | --- |
| Amber circle | Synthetic reviewed deep-metro corpus | Metro size, capacity, completeness |
| Solid mint diamond | Approximate synthetic inventory record | Exact geometry, operator activity |
| Outlined mint diamond | Cluster of nearby inventory records at the current zoom | Facility, campus boundary, or colocation |
| Grouped circle | Cluster of nearby deep-metro records at the current zoom | Metro size or completeness |
| Static arc | Reviewed sequence between synthetic changes | Network route, traffic, power flow |
| Ring pulse | Reviewed change in focus at selected time | Activation, alert severity, certainty |
| Graticule | Geographic orientation | Service territory or jurisdiction |

The same statements are present in the high-contrast HTML legend and selection summaries.

## Local data and attribution

- Land geometry is `world-atlas@2.0.2` countries at 110m resolution, derived from Natural Earth.
  Natural Earth data is public domain. The npm package uses the ISC license.
- TopoJSON is converted locally with `topojson-client`; no runtime fetch occurs.
- Inventory markers are rounded to approximately 0.1 degree from the distributable synthetic ODbL
  fixture and link to the existing facility pages. The UI attributes © OpenStreetMap contributors,
  ODbL 1.0.
- Deep-metro markers and eight playback events are explicit synthetic scene fixtures tied to
  existing synthetic timeline routes.
- Raw source tags, exact geometry, street addresses, and restricted-coordinate fields are excluded
  and covered by recursive field-policy tests.

## Camera, URL, and interaction model

The home view and four metro presets support continent overview, Northern Virginia, Dallas–Fort
Worth, Phoenix, and Toronto. Selecting an inventory point focuses its approximate position; event
selection focuses the event's reviewed metro and time. Reduced motion replaces flight animation
with an immediate camera jump.

Selecting a cluster is a drill action: it clears any prior facility selection and zooms toward the
bucket. Cluster IDs never become `facility` URL parameters and clusters never link to facility
pages.

When a bookmark contains `metro` or `facility` without camera parameters, the server resolves the
selection against the local scene and hydrates its semantic camera and selected evidence summary.
Explicit camera parameters take precedence while preserving the semantic selection.

Canonical parameters are `lng`, `lat`, `z`, `bearing`, `pitch`, `metro`, `facility`, `time`, and
`theme`. Numeric values are bounded and malformed input returns to the safe home view. The client
uses `history.replaceState` so camera, selection, time, and theme remain bookmarkable without
navigation churn.

## Temporal behavior

Playback uses a pure reducer and ISO timestamps. One real second advances one synthetic review day
at 1×. Controls include play/pause, 0.5×/1×/2×/4×, one-day steps, range scrubber, current date, and
visible/total reviewed-event count. Arrow keys step; Space plays or pauses; Home and End select
range limits.

The focused pulse and event-list emphasis derive from the same filtered event collection. Browser
visibility pauses playback. `prefers-reduced-motion` disables continuous playback while retaining
step and scrub controls.

## Accessibility and failure behavior

- The map canvas receives an accessible name and points to an equivalent description.
- All controls use native buttons, labels, checkboxes, selects, range input, fieldset, time, and
  list semantics.
- Focus-visible treatment comes from the shared site system; event-list focus is keyboard
  reachable.
- The full metro, facility, and event list is server-rendered after the client scene and remains
  usable when JavaScript is disabled.
- WebGL 2 absence or map error produces an in-context status and directs users to that complete
  list.
- Theme-independent legend structure and explicit caveats preserve meaning in high-contrast modes.

## Performance budget and layer loads

Design target: 60 FPS on a modern laptop and at least 30 FPS on a representative mobile device
under the checked-in synthetic load. The laptop target is measured locally; the representative
midrange mobile target remains unmeasured and inconclusive.

The real-browser repair addressed three independent initialization failures:

- `setProjection` now waits for MapLibre style load; synchronous projection previously threw
  `Style is not done loading`.
- The deck overlay is created only after globe projection succeeds.
- The inventory icon atlas uses same-origin `/visuals/inventory-diamonds.svg`; the prior data URI
  violated `connect-src 'self'`.
- `.maplibregl-control-container` remains visible; `display: none` previously hid the deck overlay.

The deterministic Chromium regression asserts that `.deck-widget-container` has nonzero visible
geometry. The separately recorded real-GPU laptop artifact reports Chrome 151.0.0.0 with
`ANGLE (Apple, ANGLE Metal Renderer: Apple M4 Pro, Unspecified Version)`, a visible overlay, a
1199 × 792 MapLibre canvas, and 1,200 frames over 10,000.00 ms. Measured cadence was 120.00 FPS,
with 10.20 ms p95 and 10.40 ms maximum frame time. The gate rejects software or SwiftShader
renderers, hidden overlays, samples shorter than 10 seconds, and cadence below 60 FPS.

Default bounded load:

- 177 low-resolution country features, bundled once.
- 36 graticule paths at high/adaptive quality; omitted at low quality.
- 4 deep-metro and 6 inventory markers before aggregation.
- 8 reviewed event arcs; low quality retains the most recent 4.
- 1 focused event-pulse object and only zoom-appropriate text labels.

Mitigations:

- Zoom bands aggregate at overview and metro scales; inventory points wait until zoom 4.5.
- Layer arrays, filtered events, themes, and derived values are memoized.
- Low quality removes the graticule, bounds arc history, and avoids label rendering.
- Adaptive quality chooses low power on devices with four or fewer logical cores or very high pixel
  density.
- Quality and theme changes update deck layers and effects in place. They do not recreate MapLibre,
  reset the camera, or replace canonical URL state. The optional PMTiles path is the only mutable
  input that can recreate the map, and the current camera is retained across that transition.
- Animation runs only during playback, clamps frame deltas, stops for reduced motion, and pauses
  when the document is hidden.
- The scene is dynamically loaded, leaving the server fallback and the rest of the site outside the
  geospatial client chunk.

## Future same-origin PMTiles basemap

Place an approved archive at:

```text
apps/web/public/tiles/basemap.pmtiles
```

Set the server-only environment variable in `.env.local`:

```text
REALITY_LEDGER_PMTILES_PATH=/tiles/basemap.pmtiles
```

The `/globe` route validates the value, passes the normalized path through the dynamic client
boundary, and creates this style configuration:

```ts
createPmtilesBasemapConfig("/tiles/basemap.pmtiles");
```

The helper rejects absolute and protocol-relative URLs and produces
`pmtiles:///tiles/basemap.pmtiles` in the MapLibre style's `sources` object. A missing or unreadable
archive produces a nonfatal in-scene warning; bundled land and evidence layers remain active. A
future archive style must add explicit vector layers, include its license/attribution, and pass
architecture, data, security, performance, and merge review. Remote URLs and API tokens are not
accepted. Omitting the variable keeps the default source-free and network-free.
