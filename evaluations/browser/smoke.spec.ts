import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const ROOT = process.cwd();
const ARTIFACTS = resolve(ROOT, "evaluations/artifacts");
const SYNTHETIC_WARNING = /SYNTHETIC REVIEWED BETA.*NOT PUBLIC FACTUAL DATA/i;
const ROUTES = [
  "/",
  "/launch",
  "/globe",
  "/metros/northern-virginia",
  "/facilities/facility-osm-43681388092c8c3a7e56",
  "/timelines/synthetic-northern-virginia-01",
  "/search?q=synthetic",
  "/compare?id=facility-osm-43681388092c8c3a7e56&id=facility-osm-316add245b25fd1d87d4",
  "/corrections",
  "/sources",
  "/methodology",
  "/route-that-does-not-exist",
];
const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "tablet", width: 820, height: 1180 },
  { name: "mobile", width: 390, height: 844 },
];

mkdirSync(ARTIFACTS, { recursive: true });

test.afterAll(async ({ browser, browserName }, testInfo) => {
  writeFileSync(
    resolve(ARTIFACTS, `browser-${testInfo.project.name}.json`),
    `${JSON.stringify(
      {
        browserName,
        browserVersion: browser.version(),
        project: testInfo.project.name,
        routes: ROUTES,
      },
      null,
      2,
    )}\n`,
  );
});

for (const route of ROUTES) {
  test(`${route} renders without browser errors or overflow`, async ({ page }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") {
        const location = message.location().url;
        consoleErrors.push(`${message.text()}${location ? ` [${location}]` : ""}`);
      }
    });
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await page.setViewportSize(VIEWPORTS[0]);
    const response = await page.goto(route, { waitUntil: "domcontentloaded" });
    expect(response, `${route} did not return a document response`).not.toBeNull();
    expect(
      route === "/route-that-does-not-exist"
        ? response?.status() === 404
        : [200, 304].includes(response?.status() ?? 0),
    ).toBe(true);

    for (const viewport of VIEWPORTS) {
      await page.setViewportSize(viewport);
      await expect(page.locator("main")).toBeVisible();
      await expect(page.locator(".corpus-warning")).toContainText(SYNTHETIC_WARNING);
      if (route === "/globe") {
        await expect(page.locator(".globe-experience")).toBeVisible();
        await expect(
          page.getByRole("heading", { name: "Local evidence could not be read." }),
        ).toHaveCount(0);
      }
      if (route === "/launch") {
        await expect(page.getByRole("heading", { name: "Evidence before infrastructure assertions." })).toBeVisible();
        await expect(page.getByRole("link", { name: "Enter the visual demo" })).toBeVisible();
        await expect(page.getByText("Pass · 120.00 FPS over 10,000.00 ms")).toBeVisible();
        await expect(page.getByText("Midrange mobile target remains inconclusive")).toBeVisible();
      }
      const overflow = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));
      expect(
        overflow.scrollWidth,
        `${route} horizontally overflows at ${viewport.name}`,
      ).toBeLessThanOrEqual(overflow.clientWidth + 1);
    }

    const unexpectedConsoleErrors = consoleErrors.filter(
      (error) =>
        route !== "/route-that-does-not-exist" ||
        !error.includes("server responded with a status of 404"),
    );
    expect(unexpectedConsoleErrors, `Unexpected console errors on ${route}`).toEqual([]);
    expect(pageErrors, `Unexpected page errors on ${route}`).toEqual([]);
  });
}

test("key controls are reachable and reduced motion is honored", async ({
  browserName,
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/globe", { waitUntil: "domcontentloaded" });

  await page.keyboard.press(browserName === "webkit" ? "Alt+Tab" : "Tab");
  await expect(page.locator(".skip-link")).toBeFocused();
  await expect(page.locator(".skip-link")).toBeVisible();
  const play = page.getByRole("button", { name: "Play" });
  await expect(play).toBeVisible();
  await expect(play).toBeDisabled();
  const animation = await page.locator(".globe-experience").evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      animationDuration: style.animationDuration,
      transitionDuration: style.transitionDuration,
    };
  });
  expect(["0s", "0.01ms", "1e-05s", "0.00001s"]).toContain(
    animation.animationDuration,
  );
  expect(["0s", "0.01ms", "1e-05s", "0.00001s"]).toContain(
    animation.transitionDuration,
  );

  await page.goto("/corrections", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Ledger record").focus();
  await expect(page.getByLabel("Ledger record")).toBeFocused();
  await page.getByLabel("Proposed correction and rationale").focus();
  await expect(page.getByLabel("Proposed correction and rationale")).toBeFocused();
  await page.getByLabel("Supporting evidence URL").focus();
  await expect(page.getByLabel("Supporting evidence URL")).toBeFocused();
});

test("WebGL-independent fallback remains available", async ({ page }) => {
  await page.goto("/globe", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Map summary" })).toBeVisible();
  await expect(page.getByText("This list remains usable without JavaScript or WebGL.")).toBeVisible();
});

test("globe overlay occupies the visible map frame when WebGL initializes", async ({
  browserName,
  page,
}) => {
  test.skip(
    browserName !== "chromium",
    "Chromium provides deterministic canvas and atlas evidence for the WebGL regression gate.",
  );
  const atlasResponses: Array<{ url: string; status: number }> = [];
  page.on("response", (response) => {
    if (new URL(response.url()).pathname === "/visuals/inventory-diamonds.svg") {
      atlasResponses.push({ url: response.url(), status: response.status() });
    }
  });
  await page.goto("/globe", { waitUntil: "networkidle" });

  const overlay = page.locator(".deck-widget-container");
  await expect(overlay).toHaveCount(1);
  const bounds = await overlay.boundingBox();

  expect(bounds?.width).toBeGreaterThan(600);
  expect(bounds?.height).toBeGreaterThan(400);
  expect(atlasResponses).toEqual(
    expect.arrayContaining([expect.objectContaining({ status: 200 })]),
  );
  await expect
    .poll(async () =>
      page.evaluate(async () => {
        const image = new Image();
        image.src = "/visuals/inventory-diamonds.svg";
        const decoded = image.decode().then(
          () => true,
          () => false,
        );
        const canvases = [
          ...document.querySelectorAll<HTMLCanvasElement>(
            ".globe-map-frame canvas",
          ),
        ].filter((canvas) => canvas.width > 0 && canvas.height > 0);
        const canvasSummaries = canvases.map((canvas) => {
          const sample = document.createElement("canvas");
          sample.width = Math.min(canvas.width, 160);
          sample.height = Math.min(canvas.height, 120);
          const context = sample.getContext("2d", { willReadFrequently: true });
          if (!context) {
            return { distinctColors: 0, nonTransparentPixels: 0 };
          }
          context.drawImage(canvas, 0, 0, sample.width, sample.height);
          const pixels = context.getImageData(0, 0, sample.width, sample.height).data;
          const colors = new Set<string>();
          let nonTransparentPixels = 0;
          for (let index = 0; index < pixels.length; index += 16) {
            const alpha = pixels[index + 3] ?? 0;
            if (alpha <= 0) {
              continue;
            }
            nonTransparentPixels += 1;
            colors.add(
              `${pixels[index] ?? 0},${pixels[index + 1] ?? 0},${pixels[index + 2] ?? 0}`,
            );
          }
          return { distinctColors: colors.size, nonTransparentPixels };
        });
        return {
          atlasDecoded: await decoded,
          canvasCount: canvases.length,
          meaningfulRender:
            canvases.length > 0 &&
            canvasSummaries.some(
              (summary) =>
                summary.nonTransparentPixels > 100 &&
                summary.distinctColors > 8,
            ),
          distinctColors: canvasSummaries.reduce(
            (total, summary) => total + summary.distinctColors,
            0,
          ),
          nonTransparentPixels: canvasSummaries.reduce(
            (total, summary) => total + summary.nonTransparentPixels,
            0,
          ),
        };
      }),
    )
    .toMatchObject({
      atlasDecoded: true,
      canvasCount: expect.any(Number),
      meaningfulRender: true,
      distinctColors: expect.any(Number),
      nonTransparentPixels: expect.any(Number),
    });
  const renderEvidence = await page.evaluate(() => {
    const canvases = [
      ...document.querySelectorAll<HTMLCanvasElement>(".globe-map-frame canvas"),
    ];
    return {
      canvasCount: canvases.length,
      hasDeckCanvas: canvases.some((canvas) =>
        canvas.closest(".deck-widget-container"),
      ),
      className: document.querySelector(".deck-widget-container")?.className ?? "",
    };
  });
  expect(renderEvidence.canvasCount).toBeGreaterThan(0);
  expect(renderEvidence.hasDeckCanvas).toBe(true);
  await expect(page.locator(".globe-map-error")).toHaveCount(0);
});

test("API bounds reject abuse and public inventory excludes restricted topology", async ({
  request,
}) => {
  const excessive = await request.get("/api/inventory?limit=1000000");
  expect(excessive.status()).toBe(400);
  const invalidSearch = await request.get("/api/search?q=x");
  expect(invalidSearch.status()).toBe(400);

  const inventory = await request.get("/api/inventory?limit=1");
  expect(inventory.status()).toBe(200);
  const serialized = JSON.stringify(await inventory.json());
  const restrictedFields = ["sourceTags", "sourceRecordId", "sourceRecordIds"];
  const leakedFields = restrictedFields.filter((field) => serialized.includes(field));
  expect(leakedFields, "Public API leaked raw source or topology fields").toEqual([]);
});

test("security headers are present", async ({ request }) => {
  const response = await request.get("/");
  const csp = response.headers()["content-security-policy"];
  expect(csp).toContain("default-src 'self'");
  expect(csp).toContain("style-src 'self' 'unsafe-inline'");
  expect(csp).toContain("object-src 'none'");
  expect(csp).toContain("frame-ancestors 'none'");
  expect(response.headers()["x-content-type-options"]).toBe("nosniff");
  expect(response.headers()["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(response.headers()["permissions-policy"]).toContain("camera=()");
});

test("robots remain noindex and disallow crawling", async ({ page, request }) => {
  const robots = await request.get("/robots.txt");
  expect(robots.status()).toBe(200);
  expect(await robots.text()).toContain("Disallow: /");

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex,\s*nofollow/i,
  );
});

for (const route of ["/", "/launch", "/globe", "/compare", "/corrections"]) {
  test(`axe has no serious or critical violations on ${route}`, async ({ page }) => {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    const violations = results.violations.filter(
      (violation) => violation.impact === "serious" || violation.impact === "critical",
    );
    expect(violations).toEqual([]);
  });
}
