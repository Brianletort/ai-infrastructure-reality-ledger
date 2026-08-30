import { DEFAULT_THEME_ID, type VisualThemeId } from "./themes.js";

export interface GlobeViewState {
  longitude: number;
  latitude: number;
  zoom: number;
  bearing: number;
  pitch: number;
  selectedMetro?: string;
  selectedFacility?: string;
  time?: string;
  theme: VisualThemeId;
}

export const GLOBE_HOME_VIEW: GlobeViewState = {
  longitude: -98,
  latitude: 39,
  zoom: 1.8,
  bearing: 0,
  pitch: 20,
  theme: DEFAULT_THEME_ID,
};

const THEMES = new Set<VisualThemeId>(["obsidian", "infrared", "daylight"]);
const SAFE_SLUG = /^[a-z0-9][a-z0-9-]{0,79}$/;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

function parseOptionalNumber(
  params: URLSearchParams,
  key: string,
  fallback: number,
): number | null {
  const raw = params.get(key);
  if (raw === null) {
    return fallback;
  }
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function normalizeBearing(value: number): number {
  return ((value % 360) + 360) % 360;
}

function safeSelection(value: string | null): string | undefined {
  return value !== null && SAFE_SLUG.test(value) ? value : undefined;
}

function safeIsoTime(value: string | null): string | undefined {
  if (value === null || !Number.isFinite(Date.parse(value))) {
    return undefined;
  }
  return new Date(value).toISOString();
}

export function parseGlobeUrlState(params: URLSearchParams): GlobeViewState {
  const longitude = parseOptionalNumber(params, "lng", GLOBE_HOME_VIEW.longitude);
  const latitude = parseOptionalNumber(params, "lat", GLOBE_HOME_VIEW.latitude);
  const zoom = parseOptionalNumber(params, "z", GLOBE_HOME_VIEW.zoom);
  const bearing = parseOptionalNumber(params, "bearing", GLOBE_HOME_VIEW.bearing);
  const pitch = parseOptionalNumber(params, "pitch", GLOBE_HOME_VIEW.pitch);

  if (
    longitude === null ||
    latitude === null ||
    zoom === null ||
    bearing === null ||
    pitch === null
  ) {
    return GLOBE_HOME_VIEW;
  }

  const requestedTheme = params.get("theme") as VisualThemeId | null;
  const theme =
    requestedTheme !== null && THEMES.has(requestedTheme)
      ? requestedTheme
      : DEFAULT_THEME_ID;
  const selectedMetro = safeSelection(params.get("metro"));
  const selectedFacility = safeSelection(params.get("facility"));
  const time = safeIsoTime(params.get("time"));

  return {
    longitude: clamp(longitude, -180, 180),
    latitude: clamp(latitude, -85, 85),
    zoom: clamp(zoom, 0.7, 12),
    bearing: normalizeBearing(bearing),
    pitch: clamp(pitch, 0, 85),
    ...(selectedMetro ? { selectedMetro } : {}),
    ...(selectedFacility ? { selectedFacility } : {}),
    ...(time ? { time } : {}),
    theme,
  };
}

function formatNumber(value: number): string {
  return Number(value.toFixed(4)).toString();
}

export function serializeGlobeUrlState(state: GlobeViewState): URLSearchParams {
  const params = new URLSearchParams();
  params.set("lng", formatNumber(clamp(state.longitude, -180, 180)));
  params.set("lat", formatNumber(clamp(state.latitude, -85, 85)));
  params.set("z", formatNumber(clamp(state.zoom, 0.7, 12)));
  params.set("bearing", formatNumber(normalizeBearing(state.bearing)));
  params.set("pitch", formatNumber(clamp(state.pitch, 0, 85)));
  if (state.selectedMetro) {
    params.set("metro", state.selectedMetro);
  }
  if (state.selectedFacility) {
    params.set("facility", state.selectedFacility);
  }
  if (state.time) {
    params.set("time", safeIsoTime(state.time) ?? "");
  }
  params.set("theme", state.theme);
  return params;
}
