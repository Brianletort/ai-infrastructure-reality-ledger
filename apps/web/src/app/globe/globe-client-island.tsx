"use client";

import dynamic from "next/dynamic";

import type {
  GlobeSceneData,
  GlobeViewState,
} from "@reality-ledger/visuals";

interface GlobeClientIslandProps {
  initialView: GlobeViewState;
  scene: GlobeSceneData;
  pmtilesPath?: string;
}

const GlobeClientScene = dynamic(
  () =>
    import("@reality-ledger/visuals/globe").then(
      (module) => module.GlobeExperience,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="globe-client-loading" role="status">
        Preparing the local WebGL scene. The full geographic index remains available below.
      </div>
    ),
  },
);

export function GlobeClientIsland({
  initialView,
  scene,
  pmtilesPath,
}: GlobeClientIslandProps) {
  return (
    <GlobeClientScene
      initialView={initialView}
      scene={scene}
      {...(pmtilesPath ? { pmtilesPath } : {})}
    />
  );
}
