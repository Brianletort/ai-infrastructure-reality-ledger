import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { performance } from "node:perf_hooks";

import { expect, test } from "@playwright/test";

const ROOT = process.cwd();
const ARTIFACTS = resolve(ROOT, "evaluations/artifacts");
mkdirSync(ARTIFACTS, { recursive: true });
const CONFIG = JSON.parse(
  readFileSync(resolve(ROOT, "evaluations/gate.config.json"), "utf8"),
) as {
  thresholds: {
    serverHtmlP95Ms: number;
    interactiveReadyP95Ms: number;
    globeDynamicJavaScriptKiB: number;
    headlessAnimationCadenceFps: number;
  };
};

function percentile(values: number[], fraction: number): number {
  const ordered = [...values].sort((left, right) => left - right);
  const index = Math.min(ordered.length - 1, Math.ceil(ordered.length * fraction) - 1);
  return ordered[Math.max(index, 0)] ?? Number.POSITIVE_INFINITY;
}

test("local browser performance stays inside regression budgets", async ({
  browserName,
  page,
  request,
}) => {
  test.skip(browserName !== "chromium", "One headless engine provides the local regression signal.");
  const htmlSamples: number[] = [];
  for (let index = 0; index < 10; index += 1) {
    const started = performance.now();
    const response = await request.get("/");
    expect(response.status()).toBe(200);
    htmlSamples.push(performance.now() - started);
  }

  const interactiveSamples: number[] = [];
  for (let index = 0; index < 5; index += 1) {
    const started = performance.now();
    await page.goto("/globe", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /See the review state/ })).toBeVisible();
    interactiveSamples.push(performance.now() - started);
  }

  const scriptBytes = new Map<string, number>();
  page.on("response", async (response) => {
    if (response.request().resourceType() !== "script") {
      return;
    }
    try {
      scriptBytes.set(response.url(), (await response.body()).byteLength);
    } catch {
      scriptBytes.set(response.url(), Number(response.headers()["content-length"] ?? 0));
    }
  });
  await page.goto("/globe", { waitUntil: "domcontentloaded" });
  await expect(page.getByLabel("Rendering quality")).toHaveValue("auto");
  await page.waitForTimeout(1_000);
  const pageScriptBytes = [...scriptBytes.entries()]
    .filter(([url]) => new URL(url).pathname.startsWith("/_next/static/chunks/"))
    .map(([, size]) => size);
  const workerScriptBytes = [...scriptBytes.entries()]
    .filter(([url]) => new URL(url).pathname.startsWith("/vendor/maplibre-gl-"))
    .map(([, size]) => size);
  const globeJavaScriptKiB =
    pageScriptBytes.reduce((total, size) => total + size, 0) / 1024;
  const globeWorkerJavaScriptKiB =
    workerScriptBytes.reduce((total, size) => total + size, 0) / 1024;
  const scripts = [...scriptBytes.entries()]
    .map(([url, bytes]) => ({
      url,
      bytes,
      kibibytes: bytes / 1024,
      scope: new URL(url).pathname.startsWith("/vendor/maplibre-gl-")
        ? "worker"
        : "page",
    }))
    .sort((left, right) => right.bytes - left.bytes);

  const cadence = await page.evaluate(async () => {
    const samples: number[] = [];
    await new Promise<void>((resolveAnimation) => {
      let previous = window.performance.now();
      const frame = (current: number) => {
        samples.push(current - previous);
        previous = current;
        if (samples.length >= 90) {
          resolveAnimation();
          return;
        }
        requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    });
    const total = samples.reduce((sum, value) => sum + value, 0);
    return {
      frameCount: samples.length,
      averageFps: 1000 / (total / samples.length),
      p95FrameMs: samples.sort((left, right) => left - right)[
        Math.ceil(samples.length * 0.95) - 1
      ],
    };
  });

  const measured = {
    serverHtmlP95Ms: percentile(htmlSamples, 0.95),
    interactiveReadyP95Ms: percentile(interactiveSamples, 0.95),
    globeDynamicJavaScriptKiB: globeJavaScriptKiB,
    globeWorkerJavaScriptKiB,
    headlessAnimationCadenceFps: cadence.averageFps,
  };
  const checks = {
    serverHtmlP95Ms: measured.serverHtmlP95Ms <= CONFIG.thresholds.serverHtmlP95Ms,
    interactiveReadyP95Ms:
      measured.interactiveReadyP95Ms <= CONFIG.thresholds.interactiveReadyP95Ms,
    globeDynamicJavaScriptKiB:
      measured.globeDynamicJavaScriptKiB <=
      CONFIG.thresholds.globeDynamicJavaScriptKiB,
    headlessAnimationCadenceFps:
      measured.headlessAnimationCadenceFps >=
      CONFIG.thresholds.headlessAnimationCadenceFps,
  };
  writeFileSync(
    resolve(ARTIFACTS, "browser-performance.json"),
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        renderer: "headless Chromium; GPU/FPS representativeness not established",
        measured,
        scripts,
        thresholds: CONFIG.thresholds,
        checks,
        cadence,
        gpuTargets: {
          status: "inconclusive",
          laptop60Fps: "not measured in a real GPU browser",
          mobile30Fps: "not measured on representative mobile hardware",
        },
      },
      null,
      2,
    )}\n`,
  );
  expect(checks).toEqual({
    serverHtmlP95Ms: true,
    interactiveReadyP95Ms: true,
    globeDynamicJavaScriptKiB: true,
    headlessAnimationCadenceFps: true,
  });
});
