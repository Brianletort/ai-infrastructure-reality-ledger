import type { GlobeViewState } from "./view-state.js";

export type SceneDetail = "overview" | "metro" | "facility";
export type SceneMarkerKind = "deep-metro" | "inventory";

export interface SceneMarker {
  id: string;
  label: string;
  kind: SceneMarkerKind;
  position: readonly [number, number];
  metroSlug: string;
  href: string;
}

export interface AggregatedSceneMarker {
  id: string;
  label: string;
  kind: SceneMarkerKind | "aggregate";
  aggregateKind?: SceneMarkerKind | "mixed";
  position: readonly [number, number];
  metroSlug: string;
  href: string;
  count: number;
  memberIds: readonly string[];
}

export interface MarkerSelectionResult {
  action: "select" | "drill";
  selected: AggregatedSceneMarker | null;
  target: GlobeViewState;
}

export function getSceneDetail(zoom: number): SceneDetail {
  if (zoom < 2.8) {
    return "overview";
  }
  if (zoom < 6) {
    return "metro";
  }
  return "facility";
}

function gridSizeForZoom(zoom: number): number {
  const detail = getSceneDetail(zoom);
  switch (detail) {
    case "overview":
      return 4;
    case "metro":
      return 0.35;
    case "facility":
      return 0;
    default: {
      const exhaustive: never = detail;
      return exhaustive;
    }
  }
}

function singleMarker(marker: SceneMarker): AggregatedSceneMarker {
  return {
    ...marker,
    count: 1,
    memberIds: [marker.id],
  };
}

export function aggregateSceneMarkers(
  markers: readonly SceneMarker[],
  zoom: number,
): AggregatedSceneMarker[] {
  const gridSize = gridSizeForZoom(zoom);
  if (gridSize === 0) {
    return markers.map(singleMarker);
  }

  const buckets = new Map<string, SceneMarker[]>();
  for (const marker of markers) {
    const [longitude, latitude] = marker.position;
    const key = `${Math.round(longitude / gridSize)}:${Math.round(latitude / gridSize)}`;
    const bucket = buckets.get(key) ?? [];
    bucket.push(marker);
    buckets.set(key, bucket);
  }

  return [...buckets.values()].map((bucket) => {
    const first = bucket[0];
    if (!first) {
      throw new Error("Scene aggregation produced an empty bucket.");
    }
    if (bucket.length === 1) {
      return singleMarker(first);
    }
    const [longitudeTotal, latitudeTotal] = bucket.reduce(
      ([longitude, latitude], marker) => [
        longitude + marker.position[0],
        latitude + marker.position[1],
      ],
      [0, 0],
    );
    const memberIds = bucket.map((marker) => marker.id);
    const aggregateKind = bucket.every(
      (marker) => marker.kind === first.kind,
    )
      ? first.kind
      : "mixed";
    return {
      id: `cluster-${memberIds.join("-")}`,
      label: `${bucket.length} reviewed locations`,
      kind: "aggregate",
      aggregateKind,
      position: [
        longitudeTotal / bucket.length,
        latitudeTotal / bucket.length,
      ],
      metroSlug: first.metroSlug,
      href: `/metros/${first.metroSlug}`,
      count: bucket.length,
      memberIds,
    };
  });
}

function withoutFacilitySelection(view: GlobeViewState): GlobeViewState {
  const target = { ...view };
  delete target.selectedFacility;
  return target;
}

export function resolveMarkerSelection(
  view: GlobeViewState,
  marker: AggregatedSceneMarker,
  selectedTime: string,
): MarkerSelectionResult {
  const base = withoutFacilitySelection(view);
  if (marker.kind === "aggregate") {
    return {
      action: "drill",
      selected: null,
      target: {
        ...base,
        longitude: marker.position[0],
        latitude: marker.position[1],
        zoom: Math.min(Math.max(view.zoom + 2, 4.5), 7.5),
        selectedMetro: marker.metroSlug,
        time: selectedTime,
      },
    };
  }

  const isFacility = marker.kind === "inventory";
  return {
    action: "select",
    selected: marker,
    target: {
      ...base,
      longitude: marker.position[0],
      latitude: marker.position[1],
      zoom: isFacility ? 8 : Math.max(view.zoom, 5.8),
      selectedMetro: marker.metroSlug,
      ...(isFacility ? { selectedFacility: marker.id } : {}),
      time: selectedTime,
    },
  };
}
