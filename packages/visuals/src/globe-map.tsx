"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { MapboxOverlay } from "@deck.gl/mapbox";
import * as maplibregl from "maplibre-gl";
import { Protocol } from "pmtiles";

import {
  buildSceneLayers,
  type GlobeQuality,
  type LayerVisibility,
} from "./globe-layers.js";
import type { GlobeEvent, GlobeSceneData } from "./local-scene-data.js";
import {
  applyGlobeProjectionWhenReady,
  applyMapTheme,
  mapLifecycleKey,
} from "./map-runtime.js";
import { PMTILES_PROTOCOL, createPmtilesBasemapConfig } from "./pmtiles-config.js";
import type { AggregatedSceneMarker } from "./scene.js";
import {
  createThemeEffectStyle,
  type ThemeEffectStyle,
  type VisualTheme,
} from "./themes.js";
import type { GlobeViewState } from "./view-state.js";

export interface CameraCommand {
  id: number;
  target: GlobeViewState;
}

interface GlobeMapProps {
  scene: GlobeSceneData;
  view: GlobeViewState;
  selectedTime: string;
  selectedId: string | null;
  theme: VisualTheme;
  visibility: LayerVisibility;
  quality: Exclude<GlobeQuality, "auto">;
  reducedMotion: boolean;
  pulsePhase: number;
  cameraCommand: CameraCommand | null;
  pmtilesPath?: string;
  onSelect: (object: AggregatedSceneMarker | GlobeEvent) => void;
  onViewChange: (view: Pick<GlobeViewState, "longitude" | "latitude" | "zoom" | "bearing" | "pitch">) => void;
}

type ThemeStyle = CSSProperties & ThemeEffectStyle;

let protocolRegistered = false;
const maplibreWorkerUrl = "/vendor/maplibre-gl-worker.mjs";

function registerPmtilesProtocol(): void {
  if (protocolRegistered) {
    return;
  }
  maplibregl.setWorkerUrl(maplibreWorkerUrl);
  const protocol = new Protocol({ metadata: false, errorOnMissingTile: false });
  maplibregl.addProtocol(PMTILES_PROTOCOL, protocol.tile);
  protocolRegistered = true;
}

function supportsWebGl2(): boolean {
  const canvas = document.createElement("canvas");
  return canvas.getContext("webgl2", { failIfMajorPerformanceCaveat: true }) !== null;
}

function tooltipText(object: unknown): string | null {
  if (object === null || typeof object !== "object") {
    return null;
  }
  if ("label" in object && typeof object.label === "string") {
    return `${object.label}. Visual state represents reviewed synthetic evidence, not capacity or traffic.`;
  }
  return null;
}

export function GlobeMap({
  scene,
  view,
  selectedTime,
  selectedId,
  theme,
  visibility,
  quality,
  reducedMotion,
  pulsePhase,
  cameraCommand,
  pmtilesPath,
  onSelect,
  onViewChange,
}: GlobeMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const overlayRef = useRef<MapboxOverlay | null>(null);
  const retainedViewRef = useRef(view);
  const initialQualityRef = useRef(quality);
  const themeRef = useRef(theme);
  const onViewChangeRef = useRef(onViewChange);
  const [mapError, setMapError] = useState<string | null>(null);
  const [basemapWarning, setBasemapWarning] = useState<string | null>(null);
  const lifecycleKey = mapLifecycleKey({
    quality,
    themeId: theme.id,
    pmtilesPath: pmtilesPath ?? null,
  });

  onViewChangeRef.current = onViewChange;
  themeRef.current = theme;

  const layers = useMemo(
    () =>
      buildSceneLayers({
        scene,
        zoom: view.zoom,
        selectedTime,
        selectedId,
        theme,
        visibility,
        quality,
        pulsePhase,
        onSelect,
      }),
    [
      scene,
      view.zoom,
      selectedTime,
      selectedId,
      theme,
      visibility,
      quality,
      pulsePhase,
      onSelect,
    ],
  );
  const layersRef = useRef(layers);
  layersRef.current = layers;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    if (!supportsWebGl2()) {
      setMapError("WebGL 2 is unavailable. Use the complete geographic index below.");
      return;
    }

    const initial = retainedViewRef.current;
    const basemap = createPmtilesBasemapConfig(
      lifecycleKey ?? undefined,
      themeRef.current.tokens.background,
    );
    const initialQuality = initialQualityRef.current;
    let map: maplibregl.Map;
    let disposed = false;
    let cancelProjection: () => void = () => undefined;
    try {
      registerPmtilesProtocol();
      map = new maplibregl.Map({
        container,
        style: basemap.style,
        center: [initial.longitude, initial.latitude],
        zoom: initial.zoom,
        bearing: initial.bearing,
        pitch: initial.pitch,
        minZoom: 0.7,
        maxZoom: 12,
        maxPitch: 85,
        attributionControl: false,
        renderWorldCopies: false,
        canvasContextAttributes: {
          antialias: initialQuality !== "low",
          powerPreference:
            initialQuality === "low" ? "low-power" : "high-performance",
          failIfMajorPerformanceCaveat: false,
          contextType: "webgl2",
        },
      });
    } catch {
      setMapError(
        "The interactive globe could not initialize. Use the complete geographic index below.",
      );
      return;
    }

    mapRef.current = map;
    cancelProjection = applyGlobeProjectionWhenReady(
      map,
      () => {
        if (disposed) {
          return;
        }
        const overlay = new MapboxOverlay({
          interleaved: false,
          layers: layersRef.current,
          getTooltip: ({ object }) => {
            const text = tooltipText(object);
            return text ? { text } : null;
          },
        });
        map.addControl(overlay as unknown as maplibregl.IControl);
        overlayRef.current = overlay;
      },
      () => {
        if (disposed) {
          return;
        }
        setMapError(
          "The globe projection could not initialize. Use the complete geographic index below.",
        );
      },
    );

    const reportView = () => {
      const center = map.getCenter();
      const camera = {
        longitude: center.lng,
        latitude: center.lat,
        zoom: map.getZoom(),
        bearing: map.getBearing(),
        pitch: map.getPitch(),
      };
      retainedViewRef.current = {
        ...retainedViewRef.current,
        ...camera,
      };
      onViewChangeRef.current(camera);
    };
    const reportSourceError = (event: { error?: { message?: string } }) => {
      if (disposed) {
        return;
      }
      if (basemap.source) {
        const error =
          event.error?.message ??
          "The optional PMTiles archive could not be loaded.";
        setBasemapWarning(
          `Optional basemap unavailable (${error}). Local land and evidence layers remain active.`,
        );
      }
    };
    const reportContextLoss = (event: Event) => {
      if (disposed) {
        return;
      }
      event.preventDefault();
      setMapError(
        "The WebGL context was lost. Use the complete geographic index below.",
      );
    };
    map.on("moveend", reportView);
    map.on("error", reportSourceError);
    map.once("load", () => {
      const canvas = map.getCanvas();
      canvas.setAttribute("role", "img");
      canvas.setAttribute(
        "aria-label",
        "Interactive globe of approximate synthetic locations and reviewed changes",
      );
      canvas.setAttribute("aria-describedby", "globe-equivalent-description");
      canvas.addEventListener("webglcontextlost", reportContextLoss);
    });

    return () => {
      disposed = true;
      cancelProjection();
      const center = map.getCenter();
      retainedViewRef.current = {
        ...retainedViewRef.current,
        longitude: center.lng,
        latitude: center.lat,
        zoom: map.getZoom(),
        bearing: map.getBearing(),
        pitch: map.getPitch(),
      };
      map.off("moveend", reportView);
      map.off("error", reportSourceError);
      map.getCanvas().removeEventListener("webglcontextlost", reportContextLoss);
      overlayRef.current = null;
      mapRef.current = null;
      map.remove();
    };
  }, [lifecycleKey]);

  useEffect(() => {
    overlayRef.current?.setProps({ layers });
  }, [layers]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }
    const updateBackground = () => {
      if (map.getLayer("background")) {
        applyMapTheme(map, theme);
      }
    };
    if (map.isStyleLoaded()) {
      updateBackground();
      return;
    }
    map.once("style.load", updateBackground);
    return () => {
      map.off("style.load", updateBackground);
    };
  }, [theme]);

  useEffect(() => {
    if (!cameraCommand) {
      return;
    }
    const map = mapRef.current;
    if (!map) {
      return;
    }
    const target = cameraCommand.target;
    const options = {
      center: [target.longitude, target.latitude] as [number, number],
      zoom: target.zoom,
      bearing: target.bearing,
      pitch: target.pitch,
    };
    if (reducedMotion) {
      map.jumpTo(options);
    } else {
      map.flyTo({ ...options, duration: 1_350, essential: false });
    }
  }, [cameraCommand, reducedMotion]);

  const themeStyle = createThemeEffectStyle(theme) as ThemeStyle;

  return (
    <div className="globe-map-frame" style={themeStyle}>
      <div className="globe-depth-field" aria-hidden="true" />
      <div ref={containerRef} className="globe-map-canvas" />
      <div className="globe-atmosphere" aria-hidden="true" />
      <div className="globe-vignette" aria-hidden="true" />
      {mapError ? (
        <div className="globe-map-error" role="status">
          <strong>Interactive view unavailable</strong>
          <p>{mapError}</p>
        </div>
      ) : null}
      {basemapWarning && !mapError ? (
        <p className="globe-basemap-warning" role="status">
          {basemapWarning}
        </p>
      ) : null}
      <p id="globe-equivalent-description" className="sr-only">
        The canvas shows public-domain land outlines, approximate synthetic metro and inventory
        markers, and reviewed event effects. Equivalent links and descriptions follow the map.
      </p>
    </div>
  );
}
