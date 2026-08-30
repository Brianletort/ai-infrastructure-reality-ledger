import {
  METRO_CAMERA_PRESETS,
  type GlobeSceneData,
} from "./local-scene-data.js";
import type {
  AggregatedSceneMarker,
  SceneMarker,
} from "./scene.js";
import type { GlobeViewState } from "./view-state.js";

const CAMERA_PARAMETERS = ["lng", "lat", "z", "bearing", "pitch"] as const;

function hasExplicitCamera(params: URLSearchParams): boolean {
  return CAMERA_PARAMETERS.some((parameter) => params.has(parameter));
}

function facilitySelection(
  scene: GlobeSceneData,
  facilityId: string | undefined,
): SceneMarker | undefined {
  return facilityId
    ? scene.markers.find(
        (marker) => marker.kind === "inventory" && marker.id === facilityId,
      )
    : undefined;
}

function metroSelection(
  scene: GlobeSceneData,
  metroSlug: string | undefined,
): SceneMarker | undefined {
  return metroSlug
    ? scene.markers.find(
        (marker) =>
          marker.kind === "deep-metro" && marker.metroSlug === metroSlug,
      )
    : undefined;
}

function asSelectedMarker(marker: SceneMarker): AggregatedSceneMarker {
  return {
    ...marker,
    count: 1,
    memberIds: [marker.id],
  };
}

export function hydrateSemanticGlobeState(
  view: GlobeViewState,
  params: URLSearchParams,
  scene: GlobeSceneData,
): GlobeViewState {
  const facility = facilitySelection(scene, view.selectedFacility);
  const metroSlug = facility?.metroSlug ?? view.selectedMetro;
  const preset =
    metroSlug && metroSlug in METRO_CAMERA_PRESETS
      ? METRO_CAMERA_PRESETS[metroSlug as keyof typeof METRO_CAMERA_PRESETS]
      : undefined;

  if (hasExplicitCamera(params)) {
    return {
      ...view,
      ...(facility ? { selectedMetro: facility.metroSlug } : {}),
    };
  }
  if (facility) {
    return {
      ...view,
      longitude: facility.position[0],
      latitude: facility.position[1],
      zoom: 8,
      selectedMetro: facility.metroSlug,
    };
  }
  if (preset) {
    return {
      ...preset,
      theme: view.theme,
      ...(view.time ? { time: view.time } : {}),
    };
  }
  return view;
}

export function resolveSceneSelection(
  scene: GlobeSceneData,
  view: GlobeViewState,
): AggregatedSceneMarker | null {
  const marker =
    facilitySelection(scene, view.selectedFacility) ??
    metroSelection(scene, view.selectedMetro);
  return marker ? asSelectedMarker(marker) : null;
}
