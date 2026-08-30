import { defineConfig, devices } from "@playwright/test";

const baseURL = "http://127.0.0.1:4173";

export default defineConfig({
  testDir: "./evaluations/browser",
  outputDir: "./evaluations/artifacts/playwright",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [
    ["line"],
    ["json", { outputFile: "evaluations/artifacts/playwright-results.json" }],
  ],
  snapshotPathTemplate:
    "{testDir}/../visual-baselines/{testFilePath}/{arg}-{projectName}{ext}",
  use: {
    baseURL,
    headless: true,
    serviceWorkers: "block",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  expect: {
    toHaveScreenshot: {
      animations: "disabled",
      caret: "hide",
      maxDiffPixelRatio: 0.01,
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
  ],
  webServer: {
    command:
      "npm run start --workspace web -- --hostname 127.0.0.1 --port 4173",
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
