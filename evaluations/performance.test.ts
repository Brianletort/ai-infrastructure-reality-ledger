import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { performance } from "node:perf_hooks";

import { describe, expect, it } from "vitest";

import { buildSceneLayers } from "../packages/visuals/src/globe-layers";
import { LOCAL_GLOBE_SCENE } from "../packages/visuals/src/local-scene-data";
import {
  createInitialPlaybackState,
  playbackReducer,
} from "../packages/visuals/src/playback";
import { getVisualTheme } from "../packages/visuals/src/themes";

const config = JSON.parse(
  readFileSync(resolve("evaluations/gate.config.json"), "utf8"),
) as {
  thresholds: {
    layerGenerationP95Ms: number;
    playbackReducerP95Ms: number;
  };
};
const ARTIFACTS = resolve("evaluations/artifacts");

function p95(values: number[]): number {
  const ordered = [...values].sort((left, right) => left - right);
  return ordered[Math.ceil(ordered.length * 0.95) - 1] ?? Number.POSITIVE_INFINITY;
}

describe("local rendering performance gates", () => {
  it("keeps layer generation, playback, and adaptive quality inside budgets", () => {
    const layerDurations: number[] = [];
    let highLayers = buildSceneLayers({
      scene: LOCAL_GLOBE_SCENE,
      zoom: 4,
      selectedTime: "2026-08-29T23:00:00.000Z",
      selectedId: null,
      theme: getVisualTheme("obsidian"),
      visibility: { land: true, grid: true, markers: true, changes: true },
      quality: "high",
      pulsePhase: 0,
      onSelect: () => undefined,
    });
    for (let index = 0; index < 100; index += 1) {
      const started = performance.now();
      highLayers = buildSceneLayers({
        scene: LOCAL_GLOBE_SCENE,
        zoom: 4,
        selectedTime: "2026-08-29T23:00:00.000Z",
        selectedId: null,
        theme: getVisualTheme("obsidian"),
        visibility: { land: true, grid: true, markers: true, changes: true },
        quality: "high",
        pulsePhase: index / 100,
        onSelect: () => undefined,
      });
      layerDurations.push(performance.now() - started);
    }
    const lowLayers = buildSceneLayers({
      scene: LOCAL_GLOBE_SCENE,
      zoom: 4,
      selectedTime: "2026-08-29T23:00:00.000Z",
      selectedId: null,
      theme: getVisualTheme("obsidian"),
      visibility: { land: true, grid: true, markers: true, changes: true },
      quality: "low",
      pulsePhase: 0,
      onSelect: () => undefined,
    });
    const highArcData = highLayers.find((layer) => layer.id === "reviewed-state-arcs")?.props
      .data as unknown[];
    const lowArcData = lowLayers.find((layer) => layer.id === "reviewed-state-arcs")?.props
      .data as unknown[];

    const playbackDurations: number[] = [];
    let state = {
      ...createInitialPlaybackState(
        "2023-01-01T00:00:00Z",
        "2027-01-01T00:00:00Z",
      ),
      playing: true,
    };
    for (let batch = 0; batch < 25; batch += 1) {
      const started = performance.now();
      for (let index = 0; index < 1_000; index += 1) {
        state = playbackReducer(state, { type: "tick", elapsedMilliseconds: 1 });
      }
      playbackDurations.push((performance.now() - started) / 1_000);
    }

    const measured = {
      layerGenerationP95Ms: p95(layerDurations),
      playbackReducerP95Ms: p95(playbackDurations),
      highQualityArcCount: highArcData.length,
      lowQualityArcCount: lowArcData.length,
    };
    mkdirSync(ARTIFACTS, { recursive: true });
    writeFileSync(
      resolve(ARTIFACTS, "internal-performance.json"),
      `${JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          measured,
          thresholds: config.thresholds,
          notes: "CPU-only local microbenchmarks; not a GPU FPS measurement.",
        },
        null,
        2,
      )}\n`,
    );

    expect(measured.layerGenerationP95Ms).toBeLessThanOrEqual(
      config.thresholds.layerGenerationP95Ms,
    );
    expect(measured.playbackReducerP95Ms).toBeLessThanOrEqual(
      config.thresholds.playbackReducerP95Ms,
    );
    expect(measured.lowQualityArcCount).toBeLessThan(measured.highQualityArcCount);
  });
});
