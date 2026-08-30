import type { Layer } from "@deck.gl/core";
import {
  ArcLayer,
  GeoJsonLayer,
  IconLayer,
  PathLayer,
  ScatterplotLayer,
  TextLayer,
} from "@deck.gl/layers";

import { toDeckColor } from "./color.js";
import { LAND_GEOJSON } from "./land-data.js";
import type { GlobeEvent, GlobeSceneData } from "./local-scene-data.js";
import { filterEventsAtTime } from "./playback.js";
import {
  aggregateSceneMarkers,
  getSceneDetail,
  type AggregatedSceneMarker,
} from "./scene.js";
import type { VisualTheme } from "./themes.js";

export type GlobeQuality = "auto" | "high" | "low";

export interface LayerVisibility {
  land: boolean;
  grid: boolean;
  markers: boolean;
  changes: boolean;
}

interface GraticuleLine {
  id: string;
  path: Array<[number, number]>;
}

interface BuildSceneLayersOptions {
  scene: GlobeSceneData;
  zoom: number;
  selectedTime: string;
  selectedId: string | null;
  theme: VisualTheme;
  visibility: LayerVisibility;
  quality: GlobeQuality;
  pulsePhase: number;
  onSelect: (object: AggregatedSceneMarker | GlobeEvent) => void;
}

const LONGITUDES = Array.from({ length: 25 }, (_, index) => -180 + index * 15);
const LATITUDES = Array.from({ length: 11 }, (_, index) => -75 + index * 15);

const GRATICULE: GraticuleLine[] = [
  ...LONGITUDES.map((longitude) => ({
    id: `longitude-${longitude}`,
    path: LATITUDES.map((latitude) => [longitude, latitude] as [number, number]),
  })),
  ...LATITUDES.map((latitude) => ({
    id: `latitude-${latitude}`,
    path: LONGITUDES.map((longitude) => [longitude, latitude] as [number, number]),
  })),
];

export const INVENTORY_ICON_ATLAS_PATH =
  "/visuals/inventory-diamonds.svg";
const DIAMOND_ICON_MAPPING = {
  diamond: {
    x: 0,
    y: 0,
    width: 32,
    height: 32,
    mask: true,
  },
  "cluster-diamond": {
    x: 32,
    y: 0,
    width: 32,
    height: 32,
    mask: true,
  },
} as const;

export function getInventoryMarkerIcon(
  marker: AggregatedSceneMarker,
): "diamond" | "cluster-diamond" {
  return marker.kind === "aggregate" ? "cluster-diamond" : "diamond";
}

function selectedEvent(
  scene: GlobeSceneData,
  selectedTime: string,
): GlobeEvent | null {
  return filterEventsAtTime(scene.events, selectedTime).at(-1) ?? null;
}

function visibleMarkers(
  scene: GlobeSceneData,
  zoom: number,
): AggregatedSceneMarker[] {
  const detail = getSceneDetail(zoom);
  const metroMarkers = scene.markers.filter(
    (marker) => marker.kind === "deep-metro",
  );
  const inventoryMarkers =
    detail === "overview" || zoom >= 4.5
      ? scene.markers.filter((marker) => marker.kind === "inventory")
      : [];
  return [
    ...aggregateSceneMarkers(metroMarkers, zoom),
    ...aggregateSceneMarkers(inventoryMarkers, zoom),
  ];
}

export function buildSceneLayers({
  scene,
  zoom,
  selectedTime,
  selectedId,
  theme,
  visibility,
  quality,
  pulsePhase,
  onSelect,
}: BuildSceneLayersOptions): Layer[] {
  const markers = visibleMarkers(scene, zoom);
  const circularMarkers = markers.filter(
    (marker) =>
      marker.kind === "deep-metro" ||
      (marker.kind === "aggregate" &&
        marker.aggregateKind !== "inventory"),
  );
  const inventoryMarkers = markers.filter(
    (marker) =>
      marker.kind === "inventory" ||
      (marker.kind === "aggregate" &&
        marker.aggregateKind === "inventory"),
  );
  const events = filterEventsAtTime(scene.events, selectedTime);
  const focusEvent = selectedEvent(scene, selectedTime);
  const labelsVisible = zoom >= 2.7 && quality !== "low";
  const pulseScale = 1 + Math.sin(pulsePhase) * 0.14;

  return [
    new GeoJsonLayer({
      id: "public-domain-land",
      data: LAND_GEOJSON,
      visible: visibility.land,
      filled: true,
      stroked: true,
      getFillColor: toDeckColor(theme.tokens.land, 0.92),
      getLineColor: toDeckColor(theme.tokens.landLine, 0.64),
      getLineWidth: 1,
      lineWidthMinPixels: 0.65,
      pickable: false,
    }),
    new PathLayer<GraticuleLine>({
      id: "reference-graticule",
      data: GRATICULE,
      visible: visibility.grid && quality !== "low",
      getPath: (line) => line.path,
      getColor: toDeckColor(theme.tokens.grid, theme.effects.grid),
      getWidth: 0.55,
      widthMinPixels: 0.4,
      pickable: false,
    }),
    new ArcLayer<GlobeEvent>({
      id: "reviewed-state-arcs",
      data: quality === "low" ? events.slice(-4) : events,
      visible: visibility.changes,
      getSourcePosition: (event) => event.previousPosition,
      getTargetPosition: (event) => event.position,
      getSourceColor: toDeckColor(theme.tokens.event, 0.16),
      getTargetColor: toDeckColor(theme.tokens.event, 0.58),
      getWidth: 1.25,
      widthMinPixels: 0.75,
      greatCircle: true,
      pickable: true,
      onClick: ({ object }) => {
        if (object) {
          onSelect(object);
        }
      },
    }),
    new ScatterplotLayer<AggregatedSceneMarker>({
      id: "deep-metro-circles",
      data: circularMarkers,
      visible: visibility.markers,
      getPosition: (marker) => marker.position,
      getFillColor: (marker) =>
        toDeckColor(
          marker.kind === "deep-metro"
            ? theme.tokens.metro
            : theme.tokens.landLine,
          marker.id === selectedId ? 1 : 0.82,
        ),
      getLineColor: toDeckColor(theme.tokens.background, 0.9),
      getRadius: (marker) =>
        (marker.kind === "deep-metro" ? 18_000 : 11_000) *
        Math.min(Math.max(marker.count, 1), 4),
      radiusMinPixels: 4,
      radiusMaxPixels: 20,
      lineWidthMinPixels: 1.25,
      stroked: true,
      pickable: true,
      onClick: ({ object }) => {
        if (object) {
          onSelect(object);
        }
      },
    }),
    new IconLayer<AggregatedSceneMarker>({
      id: "inventory-diamonds",
      data: inventoryMarkers,
      visible: visibility.markers,
      iconAtlas: INVENTORY_ICON_ATLAS_PATH,
      iconMapping: DIAMOND_ICON_MAPPING,
      getIcon: getInventoryMarkerIcon,
      getPosition: (marker) => marker.position,
      getColor: (marker) =>
        toDeckColor(
          theme.tokens.inventory,
          marker.id === selectedId ? 1 : 0.86,
        ),
      getSize: (marker) =>
        12 + Math.min(Math.max(marker.count - 1, 0), 4) * 3,
      sizeUnits: "pixels",
      sizeMinPixels: 9,
      sizeMaxPixels: 24,
      billboard: true,
      pickable: true,
      onClick: ({ object }) => {
        if (object) {
          onSelect(object);
        }
      },
    }),
    new TextLayer<AggregatedSceneMarker>({
      id: "scene-marker-labels",
      data: markers,
      visible: visibility.markers && labelsVisible,
      getPosition: (marker) => marker.position,
      getText: (marker) =>
        marker.kind === "aggregate"
          ? `${marker.count} reviewed locations`
          : marker.label.split(" · ")[0] ?? marker.label,
      getColor: toDeckColor(theme.tokens.text, 0.9),
      getSize: 11,
      getPixelOffset: [0, -15],
      getTextAnchor: "middle",
      getAlignmentBaseline: "bottom",
      fontFamily: "system-ui, sans-serif",
      background: true,
      getBackgroundColor: toDeckColor(theme.tokens.background, 0.72),
      backgroundPadding: [4, 2],
      characterSet: "auto",
      pickable: false,
    }),
    new ScatterplotLayer<GlobeEvent>({
      id: "reviewed-change-pulse",
      data: focusEvent ? [focusEvent] : [],
      visible: visibility.changes,
      getPosition: (event) => event.position,
      getFillColor: toDeckColor(theme.tokens.event, 0.18),
      getLineColor: toDeckColor(theme.tokens.event, 0.94),
      getRadius: 28_000 * pulseScale,
      radiusMinPixels: 9 * pulseScale,
      radiusMaxPixels: 28 * pulseScale,
      lineWidthMinPixels: 2,
      stroked: true,
      pickable: true,
      onClick: ({ object }) => {
        if (object) {
          onSelect(object);
        }
      },
    }),
  ];
}
