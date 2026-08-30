import { expect, test } from "@playwright/test";

const PAGES = [
  { name: "home", route: "/" },
  { name: "launch", route: "/launch" },
  {
    name: "globe-obsidian",
    route: "/globe?theme=obsidian",
    expectedTheme: "Obsidian Atmosphere",
  },
  {
    name: "globe-infrared",
    route: "/globe?theme=infrared",
    expectedTheme: "Infrared Grid",
  },
  {
    name: "globe-daylight",
    route: "/globe?theme=daylight",
    expectedTheme: "Signal Daylight",
  },
  { name: "metro", route: "/metros/northern-virginia" },
  {
    name: "facility",
    route: "/facilities/facility-osm-43681388092c8c3a7e56",
  },
  {
    name: "timeline",
    route: "/timelines/synthetic-northern-virginia-01",
  },
  {
    name: "compare",
    route:
      "/compare?id=facility-osm-43681388092c8c3a7e56&id=facility-osm-316add245b25fd1d87d4",
  },
  { name: "correction", route: "/corrections" },
];
const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "mobile", width: 390, height: 844 },
];

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    const fixedNow = Date.parse("2026-08-29T23:00:00Z");
    Date.now = () => fixedNow;
  });
});

for (const pageCase of PAGES) {
  for (const viewport of VIEWPORTS) {
    test(`${pageCase.name} ${viewport.name} matches baseline`, async (
      { browserName, page },
      testInfo,
    ) => {
      test.skip(browserName !== "chromium", "Visual baselines use one deterministic renderer.");
      await page.setViewportSize(viewport);
      await page.goto(pageCase.route, { waitUntil: "domcontentloaded" });
      await expect(page.locator("main h1").first()).toBeVisible();
      if (pageCase.expectedTheme) {
        await expect(page.locator(".globe-experience")).toBeVisible();
        await expect(
          page.getByRole("heading", { name: pageCase.expectedTheme }),
        ).toBeVisible();
      }
      await page.addStyleTag({
        content:
          "*,*::before,*::after{caret-color:transparent!important;animation:none!important;transition:none!important}",
      });
      await expect(page.locator("main")).toBeVisible();
      await expect(page).toHaveScreenshot(
        `${pageCase.name}-${viewport.name}.png`,
        {
          fullPage: false,
          maxDiffPixelRatio: 0.01,
        },
      );
      await testInfo.attach("route", {
        body: pageCase.route,
        contentType: "text/plain",
      });
    });
  }
}
