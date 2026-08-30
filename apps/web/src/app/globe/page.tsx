import type { Metadata } from "next";

import {
  LOCAL_GLOBE_SCENE,
  createPmtilesBasemapConfig,
  hydrateSemanticGlobeState,
  parseGlobeUrlState,
} from "@reality-ledger/visuals";

import { GlobeClientIsland } from "./globe-client-island";
import { GlobeFallback } from "./globe-fallback";

export const metadata: Metadata = {
  title: "Evidence globe",
  description:
    "Explore approximate synthetic locations and reviewed local changes without a remote basemap.",
  alternates: { canonical: "/globe" },
};

interface GlobePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function GlobePage({ searchParams }: GlobePageProps) {
  const requested = await searchParams;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(requested)) {
    const first = Array.isArray(value) ? value[0] : value;
    if (first !== undefined) {
      params.set(key, first);
    }
  }
  const initialView = hydrateSemanticGlobeState(
    parseGlobeUrlState(params),
    params,
    LOCAL_GLOBE_SCENE,
  );
  const basemap = createPmtilesBasemapConfig(
    process.env.REALITY_LEDGER_PMTILES_PATH,
  );

  return (
    <div className="globe-page">
      <header className="globe-page-intro">
        <div>
          <p className="eyebrow">Geographic evidence system</p>
          <h1>See the review state. Never infer the infrastructure state.</h1>
        </div>
        <div>
          <p>
            MapLibre provides the globe camera. deck.gl draws local public-domain land,
            approximate synthetic locations, and reviewed event effects.{" "}
            {basemap.path
              ? "An optional same-origin PMTiles archive is configured."
              : "The default beta uses a source-free basemap."}{" "}
            No remote service, API token, live traffic, or capacity feed is used.
          </p>
          <p className="globe-page-intro__warning">
            All visible facilities, metros, and chronology are synthetic or fixture-derived beta
            records. Position, motion, brightness, and arc direction do not indicate capacity,
            activation, traffic, power flow, or certainty.
          </p>
        </div>
      </header>

      <GlobeClientIsland
        initialView={initialView}
        scene={LOCAL_GLOBE_SCENE}
        {...(basemap.path ? { pmtilesPath: basemap.path } : {})}
      />
      <GlobeFallback scene={LOCAL_GLOBE_SCENE} />
    </div>
  );
}
