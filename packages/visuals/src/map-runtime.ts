import type { VisualTheme, VisualThemeId } from "./themes.js";

export interface MapRenderSettings {
  quality: "high" | "low";
  themeId: VisualThemeId;
  pmtilesPath: string | null;
}

export interface ThemeableMap {
  setPaintProperty(
    layerId: string,
    propertyName: string,
    value: string,
  ): unknown;
  triggerRepaint(): void;
}

export interface ProjectionReadyMap {
  isStyleLoaded(): boolean | void;
  once(event: "load", listener: () => void): unknown;
  setProjection(projection: { type: "globe" }): unknown;
}

export function applyGlobeProjectionWhenReady(
  map: ProjectionReadyMap,
  onReady: () => void,
  onError: (error: unknown) => void,
): () => void {
  let disposed = false;
  const applyProjection = () => {
    if (disposed) {
      return;
    }
    try {
      map.setProjection({ type: "globe" });
      if (disposed) {
        return;
      }
      onReady();
    } catch (error) {
      if (disposed) {
        return;
      }
      onError(error);
    }
  };

  if (map.isStyleLoaded() === true) {
    applyProjection();
    return () => {
      disposed = true;
    };
  }
  map.once("load", applyProjection);
  return () => {
    disposed = true;
  };
}

export function requiresMapRecreation(
  previous: MapRenderSettings,
  next: MapRenderSettings,
): boolean {
  return mapLifecycleKey(previous) !== mapLifecycleKey(next);
}

export function mapLifecycleKey(
  settings: MapRenderSettings,
): string | null {
  return settings.pmtilesPath;
}

export function applyMapTheme(map: ThemeableMap, theme: VisualTheme): void {
  map.setPaintProperty(
    "background",
    "background-color",
    theme.tokens.background,
  );
  map.triggerRepaint();
}
