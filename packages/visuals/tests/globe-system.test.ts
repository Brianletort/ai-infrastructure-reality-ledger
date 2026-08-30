import { describe, expect, it } from "vitest";
import { IconLayer, ScatterplotLayer } from "@deck.gl/layers";

import {
  applyMapTheme,
  createThemeEffectStyle,
  DEFAULT_THEME_ID,
  GLOBE_HOME_VIEW,
  INVENTORY_ICON_ATLAS_PATH,
  LAND_GEOJSON,
  LOCAL_GLOBE_SCENE,
  METRO_CAMERA_PRESETS,
  PMTILES_PROTOCOL,
  aggregateSceneMarkers,
  applyGlobeProjectionWhenReady,
  assertPublicSceneData,
  createInitialPlaybackState,
  createPmtilesBasemapConfig,
  filterEventsAtTime,
  getLayerSemantic,
  getSceneDetail,
  getVisualTheme,
  hydrateSemanticGlobeState,
  parseGlobeUrlState,
  playbackReducer,
  requiresMapRecreation,
  resolveMarkerSelection,
  resolveSceneSelection,
  serializeGlobeUrlState,
  toDeckColor,
  type SceneMarker,
  type AggregatedSceneMarker,
  type VisualThemeId,
} from "../src/index";
import { buildSceneLayers } from "../src/globe-layers";

describe("visual themes", () => {
  it("converts theme tokens to deterministic deck.gl colors", () => {
    expect(toDeckColor("#9de0ca", 0.5)).toEqual([157, 224, 202, 128]);
  });

  it("preserves three exhaustive visual directions with Obsidian as default", () => {
    const ids = ["obsidian", "infrared", "daylight"] satisfies VisualThemeId[];

    expect(ids.map((id) => getVisualTheme(id).id)).toEqual(ids);
    expect(DEFAULT_THEME_ID).toBe("obsidian");
  });

  it("rejects unknown themes instead of silently changing semantics", () => {
    expect(() => getVisualTheme("unknown" as VisualThemeId)).toThrow(
      "Unsupported visual theme",
    );
  });

  it("maps every cinematic effect token into scene CSS variables", () => {
    const obsidian = createThemeEffectStyle(getVisualTheme("obsidian"));
    const daylight = createThemeEffectStyle(getVisualTheme("daylight"));

    expect(obsidian["--globe-stars-opacity"]).toBe("0.42");
    expect(obsidian["--globe-atmosphere-opacity"]).toBe("0.64");
    expect(obsidian["--globe-grid-opacity"]).not.toBe(
      daylight["--globe-grid-opacity"],
    );
    expect(daylight["--globe-stars-opacity"]).toBe("0");
    expect(daylight["--globe-vignette-opacity"]).toBe("0.2");
  });
});

describe("canonical globe URL state", () => {
  it("bounds unsafe view values and preserves valid selections", () => {
    const state = parseGlobeUrlState(
      new URLSearchParams(
        "lng=999&lat=-999&z=50&bearing=725&pitch=100&metro=phoenix&facility=facility-1&time=2026-08-20T00%3A00%3A00.000Z&theme=infrared",
      ),
    );

    expect(state).toEqual({
      longitude: 180,
      latitude: -85,
      zoom: 12,
      bearing: 5,
      pitch: 85,
      selectedMetro: "phoenix",
      selectedFacility: "facility-1",
      time: "2026-08-20T00:00:00.000Z",
      theme: "infrared",
    });
  });

  it("falls back to the home view for malformed values", () => {
    expect(parseGlobeUrlState(new URLSearchParams("lng=nope&theme=neon"))).toEqual(
      GLOBE_HOME_VIEW,
    );
  });

  it("serializes a stable bookmarkable query string", () => {
    const params = serializeGlobeUrlState({
      ...GLOBE_HOME_VIEW,
      selectedMetro: "toronto",
      time: "2026-08-29T12:00:00.000Z",
      theme: "daylight",
    });

    expect(params.toString()).toBe(
      "lng=-98&lat=39&z=1.8&bearing=0&pitch=20&metro=toronto&time=2026-08-29T12%3A00%3A00.000Z&theme=daylight",
    );
  });

  it("hydrates a metro selection into its preset when camera params are absent", () => {
    const params = new URLSearchParams("metro=phoenix&theme=daylight");
    const hydrated = hydrateSemanticGlobeState(
      parseGlobeUrlState(params),
      params,
      LOCAL_GLOBE_SCENE,
    );

    expect(hydrated).toMatchObject({
      longitude: -112.1,
      latitude: 33.5,
      zoom: 6.2,
      selectedMetro: "phoenix",
      theme: "daylight",
    });
  });

  it("hydrates a facility selection and retains explicit camera values", () => {
    const facilityId = "facility-osm-1072d5143dff1517cd3a";
    const semanticParams = new URLSearchParams(`facility=${facilityId}`);
    const semantic = hydrateSemanticGlobeState(
      parseGlobeUrlState(semanticParams),
      semanticParams,
      LOCAL_GLOBE_SCENE,
    );
    const explicitParams = new URLSearchParams(
      `facility=${facilityId}&lng=-100&lat=40&z=3`,
    );
    const explicit = hydrateSemanticGlobeState(
      parseGlobeUrlState(explicitParams),
      explicitParams,
      LOCAL_GLOBE_SCENE,
    );

    expect(semantic).toMatchObject({
      longitude: -112.1,
      latitude: 33.5,
      zoom: 8,
      selectedFacility: facilityId,
      selectedMetro: "phoenix",
    });
    expect(resolveSceneSelection(LOCAL_GLOBE_SCENE, semantic)?.id).toBe(
      facilityId,
    );
    expect(explicit).toMatchObject({
      longitude: -100,
      latitude: 40,
      zoom: 3,
      selectedFacility: facilityId,
    });
  });
});

describe("level of detail and aggregation", () => {
  const markers: SceneMarker[] = [
    {
      id: "a",
      label: "A",
      kind: "deep-metro",
      position: [-77, 39],
      metroSlug: "northern-virginia",
      href: "/metros/northern-virginia",
    },
    {
      id: "b",
      label: "B",
      kind: "inventory",
      position: [-77.03, 39.02],
      metroSlug: "northern-virginia",
      href: "/facilities/b",
    },
    {
      id: "c",
      label: "C",
      kind: "inventory",
      position: [-112, 33],
      metroSlug: "phoenix",
      href: "/facilities/c",
    },
  ];

  it("uses overview, metro, and facility detail bands", () => {
    expect(getSceneDetail(1.8)).toBe("overview");
    expect(getSceneDetail(4)).toBe("metro");
    expect(getSceneDetail(7)).toBe("facility");
  });

  it("clusters nearby markers at continent scale and reveals them at facility scale", () => {
    const overview = aggregateSceneMarkers(markers, 1.8);
    const facility = aggregateSceneMarkers(markers, 7);

    expect(overview).toHaveLength(2);
    expect(overview[0]?.count).toBe(2);
    expect(facility).toHaveLength(3);
    expect(facility.every((marker) => marker.count === 1)).toBe(true);
  });

  it("retains aggregate semantics for homogeneous inventory buckets", () => {
    const inventory = markers.filter((marker) => marker.kind === "inventory");
    const clustered = aggregateSceneMarkers(
      [
        inventory[0]!,
        {
          ...inventory[0]!,
          id: "d",
          position: [
            inventory[0]!.position[0] + 0.01,
            inventory[0]!.position[1] + 0.01,
          ],
        },
      ],
      1.8,
    )[0];

    expect(clustered).toMatchObject({
      kind: "aggregate",
      aggregateKind: "inventory",
      count: 2,
    });
    expect(clustered?.href).not.toMatch(/^\/facilities\//);
  });

  it("drills into clusters without creating a facility selection or URL", () => {
    const cluster: AggregatedSceneMarker = {
      id: "cluster-a-b",
      label: "2 reviewed locations",
      kind: "aggregate",
      aggregateKind: "inventory",
      position: [-77.02, 39.01],
      metroSlug: "northern-virginia",
      href: "/metros/northern-virginia",
      count: 2,
      memberIds: ["a", "b"],
    };
    const result = resolveMarkerSelection(
      {
        ...GLOBE_HOME_VIEW,
        selectedFacility: "facility-previous",
      },
      cluster,
      "2026-08-29T12:00:00.000Z",
    );
    const query = serializeGlobeUrlState(result.target);

    expect(result.action).toBe("drill");
    expect(result.selected).toBeNull();
    expect(result.target.zoom).toBeGreaterThan(GLOBE_HOME_VIEW.zoom);
    expect(result.target.selectedFacility).toBeUndefined();
    expect(query.has("facility")).toBe(false);
    expect(query.toString()).not.toContain("cluster-");
  });
});

describe("deterministic temporal playback", () => {
  const events = [
    { id: "early", occurredAt: "2026-08-20T00:00:00.000Z" },
    { id: "late", occurredAt: "2026-08-22T00:00:00.000Z" },
  ];

  it("filters reviewed events at the selected instant", () => {
    expect(
      filterEventsAtTime(events, "2026-08-21T00:00:00.000Z").map(
        (event) => event.id,
      ),
    ).toEqual(["early"]);
  });

  it("steps deterministically and pauses when the document is hidden", () => {
    const initial = createInitialPlaybackState(
      "2026-08-20T00:00:00.000Z",
      "2026-08-24T00:00:00.000Z",
    );
    const playing = playbackReducer(initial, { type: "play" });
    const advanced = playbackReducer(playing, {
      type: "tick",
      elapsedMilliseconds: 1_000,
    });
    const hidden = playbackReducer(advanced, { type: "visibility", hidden: true });

    expect(advanced.currentTime).toBe("2026-08-21T00:00:00.000Z");
    expect(hidden.playing).toBe(false);
  });

  it("disables continuous playback while reduced motion is active", () => {
    const state = {
      ...createInitialPlaybackState(
        "2026-08-20T00:00:00.000Z",
        "2026-08-24T00:00:00.000Z",
      ),
      reducedMotion: true,
    };

    expect(playbackReducer(state, { type: "play" }).playing).toBe(false);
    expect(playbackReducer(state, { type: "step", direction: 1 }).currentTime).toBe(
      "2026-08-21T00:00:00.000Z",
    );
  });
});

describe("public visual semantics and local basemap configuration", () => {
  it("preserves MapLibre lifecycle across quality and theme changes", () => {
    expect(
      requiresMapRecreation(
        { quality: "high", themeId: "obsidian", pmtilesPath: null },
        { quality: "low", themeId: "daylight", pmtilesPath: null },
      ),
    ).toBe(false);
    expect(
      requiresMapRecreation(
        { quality: "high", themeId: "obsidian", pmtilesPath: null },
        {
          quality: "high",
          themeId: "obsidian",
          pmtilesPath: "/tiles/basemap.pmtiles",
        },
      ),
    ).toBe(true);
  });

  it("renders deep metros as circles and inventory as icon diamonds", () => {
    const layers = buildSceneLayers({
      scene: LOCAL_GLOBE_SCENE,
      zoom: 7,
      selectedTime: LOCAL_GLOBE_SCENE.events.at(-1)?.occurredAt ?? "",
      selectedId: null,
      theme: getVisualTheme("obsidian"),
      visibility: { land: true, grid: true, markers: true, changes: true },
      quality: "high",
      pulsePhase: 0,
      onSelect: () => undefined,
    });

    expect(layers.find((layer) => layer.id === "deep-metro-circles")).toBeInstanceOf(
      ScatterplotLayer,
    );
    expect(layers.find((layer) => layer.id === "inventory-diamonds")).toBeInstanceOf(
      IconLayer,
    );
  });

  it("renders inventory clusters as distinct diamonds without changing their kind", () => {
    const inventory = LOCAL_GLOBE_SCENE.markers.find(
      (marker) => marker.kind === "inventory",
    )!;
    const scene = {
      ...LOCAL_GLOBE_SCENE,
      markers: [
        inventory,
        {
          ...inventory,
          id: `${inventory.id}-nearby`,
          position: [
            inventory.position[0] + 0.01,
            inventory.position[1] + 0.01,
          ] as const,
        },
      ],
    };
    const layers = buildSceneLayers({
      scene,
      zoom: 1.8,
      selectedTime: LOCAL_GLOBE_SCENE.events.at(-1)?.occurredAt ?? "",
      selectedId: null,
      theme: getVisualTheme("obsidian"),
      visibility: { land: true, grid: true, markers: true, changes: true },
      quality: "high",
      pulsePhase: 0,
      onSelect: () => undefined,
    });
    const diamondLayer = layers.find(
      (layer) => layer.id === "inventory-diamonds",
    ) as IconLayer<AggregatedSceneMarker>;
    const [cluster] = diamondLayer.props.data as AggregatedSceneMarker[];
    const getIcon = diamondLayer.props.getIcon as (
      marker: AggregatedSceneMarker,
    ) => string;

    expect(cluster?.kind).toBe("aggregate");
    expect(cluster?.aggregateKind).toBe("inventory");
    expect(getIcon(cluster!)).toBe("cluster-diamond");
    expect(INVENTORY_ICON_ATLAS_PATH).toBe(
      "/visuals/inventory-diamonds.svg",
    );
  });

  it("updates the underlying MapLibre background for theme changes", () => {
    const updates: Array<[string, string, string]> = [];
    const map = {
      setPaintProperty: (layer: string, property: string, value: string) => {
        updates.push([layer, property, value]);
      },
      triggerRepaint: () => undefined,
    };

    applyMapTheme(map, getVisualTheme("daylight"));

    expect(updates).toEqual([
      ["background", "background-color", "#e8e5dc"],
    ]);
  });

  it("waits for the MapLibre style before applying globe projection", () => {
    let loadListener: (() => void) | undefined;
    const projections: Array<{ type: "globe" }> = [];
    const ready: string[] = [];
    const errors: unknown[] = [];
    const map = {
      isStyleLoaded: () => false,
      once: (event: "load", listener: () => void) => {
        expect(event).toBe("load");
        loadListener = listener;
      },
      setProjection: (projection: { type: "globe" }) => {
        projections.push(projection);
      },
    };

    applyGlobeProjectionWhenReady(
      map,
      () => ready.push("ready"),
      (error) => errors.push(error),
    );

    expect(projections).toEqual([]);
    expect(ready).toEqual([]);
    loadListener?.();
    expect(projections).toEqual([{ type: "globe" }]);
    expect(ready).toEqual(["ready"]);
    expect(errors).toEqual([]);
  });

  it("cancels pending globe projection before MapLibre style load", () => {
    let loadListener: (() => void) | undefined;
    const ready: string[] = [];
    const errors: unknown[] = [];
    const map = {
      isStyleLoaded: () => false,
      once: (event: "load", listener: () => void) => {
        expect(event).toBe("load");
        loadListener = listener;
      },
      setProjection: () => {
        throw new Error("projection should not run after disposal");
      },
    };

    const cancel = applyGlobeProjectionWhenReady(
      map,
      () => ready.push("ready"),
      (error) => errors.push(error),
    );
    cancel();
    loadListener?.();

    expect(ready).toEqual([]);
    expect(errors).toEqual([]);
  });

  it("suppresses projection failures after disposal", () => {
    let loadListener: (() => void) | undefined;
    const ready: string[] = [];
    const errors: unknown[] = [];
    const map = {
      isStyleLoaded: () => false,
      once: (event: "load", listener: () => void) => {
        expect(event).toBe("load");
        loadListener = listener;
      },
      setProjection: () => {
        throw new Error("late projection failure");
      },
    };

    const cancel = applyGlobeProjectionWhenReady(
      map,
      () => ready.push("ready"),
      (error) => errors.push(error),
    );
    cancel();
    loadListener?.();

    expect(ready).toEqual([]);
    expect(errors).toEqual([]);
  });

  it("ships four synthetic metro presets and only public scene fields", () => {
    expect(Object.keys(METRO_CAMERA_PRESETS)).toEqual([
      "northern-virginia",
      "dallas-fort-worth",
      "phoenix",
      "toronto",
    ]);
    expect(LOCAL_GLOBE_SCENE.markers.some((marker) => marker.kind === "deep-metro")).toBe(
      true,
    );
    expect(LOCAL_GLOBE_SCENE.markers.some((marker) => marker.kind === "inventory")).toBe(
      true,
    );
    expect(assertPublicSceneData(LOCAL_GLOBE_SCENE)).toBe(true);
  });

  it("bundles recognizable public-domain land geometry locally", () => {
    expect(LAND_GEOJSON.type).toBe("FeatureCollection");
    expect(LAND_GEOJSON.features.length).toBeGreaterThan(100);
  });

  it("maps effects to reviewed state without capacity or traffic claims", () => {
    expect(getLayerSemantic("event-pulse").meaning).toContain("reviewed change");
    expect(getLayerSemantic("state-arc").doesNotMean).toEqual(
      expect.arrayContaining(["capacity", "traffic", "power flow", "activation"]),
    );
  });

  it("rejects restricted geometry and source-tag fields", () => {
    expect(
      assertPublicSceneData({
        id: "safe",
        position: [-77, 39],
        coordinatePrecision: "approximate-metro",
      }),
    ).toBe(true);
    expect(assertPublicSceneData({ exactGeometry: [1, 2] })).toBe(false);
    expect(assertPublicSceneData({ sourceTags: { secret: true } })).toBe(false);
  });

  it("defaults to a network-free style and accepts only same-origin PMTiles paths", () => {
    const defaultConfig = createPmtilesBasemapConfig();
    const localConfig = createPmtilesBasemapConfig("/tiles/basemap.pmtiles");

    expect(defaultConfig.source).toBeNull();
    expect(JSON.stringify(defaultConfig.style)).not.toMatch(/https?:\/\//);
    expect(localConfig.source?.url).toBe(
      `${PMTILES_PROTOCOL}:///tiles/basemap.pmtiles`,
    );
    expect(localConfig.path).toBe("/tiles/basemap.pmtiles");
    expect(localConfig.style.sources["self-hosted-basemap"]).toEqual({
      type: "vector",
      url: `${PMTILES_PROTOCOL}:///tiles/basemap.pmtiles`,
    });
    expect(defaultConfig.style.sources).toEqual({});
    expect(() =>
      createPmtilesBasemapConfig("https://tiles.example.com/world.pmtiles"),
    ).toThrow("same-origin");
  });
});
