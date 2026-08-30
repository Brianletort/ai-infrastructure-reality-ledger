export const PMTILES_PROTOCOL = "pmtiles";

export interface LocalMapStyle {
  version: 8;
  name: string;
  sources: Record<
    string,
    {
      type: "vector";
      url: string;
    }
  >;
  layers: Array<{
    id: string;
    type: "background";
    paint: { "background-color": string };
  }>;
}

export interface PmtilesBasemapConfig {
  style: LocalMapStyle;
  path: string | null;
  source: {
    id: "self-hosted-basemap";
    type: "vector";
    url: string;
  } | null;
}

function createLocalStyle(
  background: string,
  source: PmtilesBasemapConfig["source"],
): LocalMapStyle {
  return {
    version: 8,
    name: "Reality Ledger local land canvas",
    sources: source
      ? {
          [source.id]: {
            type: source.type,
            url: source.url,
          },
        }
      : {},
    layers: [
      {
        id: "background",
        type: "background",
        paint: { "background-color": background },
      },
    ],
  };
}

export function createPmtilesBasemapConfig(
  sameOriginPath?: string,
  background = "#050708",
): PmtilesBasemapConfig {
  if (sameOriginPath === undefined || sameOriginPath === "") {
    return {
      style: createLocalStyle(background, null),
      path: null,
      source: null,
    };
  }
  const path = sameOriginPath.trim();
  if (
    !path.startsWith("/") ||
    path.startsWith("//") ||
    path.includes("\\") ||
    !path.endsWith(".pmtiles")
  ) {
    throw new Error("PMTiles basemap path must be a same-origin absolute path.");
  }
  const source = {
    id: "self-hosted-basemap",
    type: "vector",
    url: `${PMTILES_PROTOCOL}://${path}`,
  } as const;
  return {
    style: createLocalStyle(background, source),
    path,
    source,
  };
}
