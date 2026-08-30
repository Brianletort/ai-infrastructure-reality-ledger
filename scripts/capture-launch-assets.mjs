import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFileSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC_DIR = join(ROOT, "apps/web/public/launch");
const DOCS_DIR = join(ROOT, "docs/assets/launch");
const TEMP_DIR = join(ROOT, ".local/launch-capture");
const BASE_URL = "http://127.0.0.1:4183";
const WARNING = /SYNTHETIC REVIEWED BETA.*NOT PUBLIC FACTUAL DATA/i;

mkdirSync(PUBLIC_DIR, { recursive: true });
mkdirSync(DOCS_DIR, { recursive: true });
rmSync(TEMP_DIR, { recursive: true, force: true });
mkdirSync(TEMP_DIR, { recursive: true });

const server = spawn(
  "npm",
  ["run", "start", "--workspace", "web", "--", "--hostname", "127.0.0.1", "--port", "4183"],
  {
    cwd: ROOT,
    env: { ...process.env, NODE_ENV: "production" },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
let serverOutput = "";
server.stdout.on("data", (chunk) => {
  serverOutput += chunk.toString();
});
server.stderr.on("data", (chunk) => {
  serverOutput += chunk.toString();
});

async function waitForServer() {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(`Local server exited ${server.exitCode}:\n${serverOutput}`);
    }
    try {
      const response = await fetch(`${BASE_URL}/launch`);
      if (response.ok) {
        return;
      }
    } catch {
      // The local server is still starting.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 250));
  }
  throw new Error(`Timed out waiting for local server:\n${serverOutput}`);
}

async function assertSyntheticWarning(page) {
  const warning = page.locator(".corpus-warning");
  await warning.waitFor({ state: "visible" });
  const text = await warning.textContent();
  if (!WARNING.test(text ?? "")) {
    throw new Error(`Synthetic warning missing at ${page.url()}`);
  }
}

async function assertMeaningfulGlobe(page) {
  await page.locator(".globe-experience").waitFor({ state: "visible" });
  const error = page.getByRole("status").filter({ hasText: "Interactive view unavailable" });
  if ((await error.count()) > 0 && (await error.first().isVisible())) {
    throw new Error("Headless globe rendered its error fallback instead of a meaningful scene.");
  }
  const canvas = page.locator(".globe-map-canvas canvas");
  if ((await canvas.count()) === 0 || !(await canvas.first().isVisible())) {
    throw new Error("Headless globe did not produce a visible WebGL canvas.");
  }
  const overlay = page.locator(".deck-widget-container");
  await overlay.waitFor({ state: "attached" });
  const bounds = await overlay.boundingBox();
  if (!bounds || bounds.width <= 0 || bounds.height <= 0) {
    throw new Error("Headless globe deck overlay has no visible geometry.");
  }
}

async function hasMeaningfulGlobe(page) {
  try {
    await assertMeaningfulGlobe(page);
    return true;
  } catch {
    return false;
  }
}

async function preparePage(page, route) {
  const response = await page.goto(`${BASE_URL}${route}`, { waitUntil: "networkidle" });
  if (!response?.ok()) {
    throw new Error(`${route} returned ${response?.status() ?? "no response"}`);
  }
  await assertSyntheticWarning(page);
  await page.addStyleTag({
    content:
      "*,*::before,*::after{caret-color:transparent!important;animation:none!important;transition:none!important}",
  });
}

async function captureScreenshots(browser) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
    serviceWorkers: "block",
  });
  const page = await context.newPage();
  const captures = [
    ["home.png", "/"],
    ["globe.png", "/globe?theme=obsidian"],
    ["timeline-evidence.png", "/timelines/synthetic-northern-virginia-01"],
  ];
  let meaningfulGlobe = false;

  for (const [filename, route] of captures) {
    await preparePage(page, route);
    if (route.startsWith("/globe")) {
      meaningfulGlobe = await hasMeaningfulGlobe(page);
      await page.locator(".globe-experience").scrollIntoViewIfNeeded();
    }
    if (route.startsWith("/timelines/")) {
      await page
        .getByRole("heading", { name: "Exact evidence references" })
        .scrollIntoViewIfNeeded();
    }
    const publicPath = join(PUBLIC_DIR, filename);
    await page.screenshot({ path: publicPath, fullPage: false });
    copyFileSync(publicPath, join(DOCS_DIR, filename));
  }
  await context.close();
  return meaningfulGlobe;
}

async function captureOpenGraph(browser) {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await page.setContent(`
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <style>
          *{box-sizing:border-box}body{margin:0;width:1200px;height:630px;overflow:hidden;background:#0a0c0d;color:#f2f1eb;font-family:Arial,sans-serif}
          main{position:relative;display:grid;height:100%;grid-template-columns:1.45fr .55fr;padding:72px 78px;border:1px solid #2a2f31;background:radial-gradient(circle at 78% 42%,rgba(157,224,202,.16),transparent 260px)}
          main:before{position:absolute;inset:0;background:linear-gradient(90deg,transparent calc(100% - 1px),rgba(255,255,255,.025) 1px) 0 0/96px 100%;content:""}
          section,aside{position:relative;z-index:1}.eyebrow{color:#9de0ca;font:700 13px monospace;letter-spacing:.17em;text-transform:uppercase}
          h1{max-width:760px;margin:28px 0 32px;font-size:76px;font-weight:430;line-height:.92;letter-spacing:-.065em}
          p{max-width:700px;color:#b9b8b1;font-size:22px;line-height:1.45}.mark{display:grid;width:150px;height:150px;margin:14px auto 78px;place-items:center;border:1px solid #9de0ca;border-radius:50%;color:#9de0ca;font:700 34px monospace;box-shadow:0 0 80px rgba(157,224,202,.12)}
          aside{border-top:1px solid #9de0ca;padding-top:16px}aside p{font:700 12px monospace;letter-spacing:.12em;text-transform:uppercase}strong{display:block;margin-top:16px;color:#9de0ca;font:500 18px monospace;line-height:1.5}
          footer{position:absolute;right:78px;bottom:58px;left:78px;z-index:1;display:flex;justify-content:space-between;border-top:1px solid #2a2f31;padding-top:18px;color:#81817b;font:12px monospace;letter-spacing:.08em;text-transform:uppercase}
        </style>
      </head>
      <body>
        <main>
          <section>
            <div class="eyebrow">Open-source public beta</div>
            <h1>Evidence before infrastructure assertions.</h1>
            <p>Separate announcement, construction, activation, contest, and correction. Keep the source and uncertainty visible.</p>
          </section>
          <aside>
            <div class="mark">RL</div>
            <p>Current corpus</p>
            <strong>6 SYNTHETIC RECORDS<br>100 SYNTHETIC TIMELINES<br>NO MARKET COVERAGE CLAIM</strong>
          </aside>
          <footer><span>AI Infrastructure Reality Ledger</span><span>NOT PUBLIC FACTUAL DATA</span></footer>
        </main>
      </body>
    </html>
  `);
  await page.screenshot({
    path: join(PUBLIC_DIR, "reality-ledger-og.png"),
    fullPage: false,
  });
  await page.close();
}

async function captureVideo(browser) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: TEMP_DIR, size: { width: 1440, height: 900 } },
    serviceWorkers: "block",
  });
  const page = await context.newPage();
  const video = page.video();

  await preparePage(page, "/");
  await page.waitForTimeout(2_000);
  await page.mouse.wheel(0, 620);
  await page.waitForTimeout(1_200);

  await preparePage(page, "/globe?theme=obsidian");
  await assertMeaningfulGlobe(page);
  await page.waitForTimeout(3_000);
  await page.mouse.wheel(0, 520);
  await page.waitForTimeout(1_200);

  await preparePage(page, "/metros/northern-virginia");
  await page.waitForTimeout(2_000);
  await page.mouse.wheel(0, 700);
  await page.waitForTimeout(1_200);

  await preparePage(page, "/timelines/synthetic-northern-virginia-01");
  await page.waitForTimeout(2_000);
  await page.locator("#event-replay-title").scrollIntoViewIfNeeded();
  await page.waitForTimeout(1_200);
  await page.mouse.wheel(0, 760);
  await page.waitForTimeout(2_000);

  await preparePage(page, "/launch#contribute");
  await page.locator("#contribute").scrollIntoViewIfNeeded();
  await page.waitForTimeout(2_000);

  await context.close();
  if (!video) {
    throw new Error("Playwright did not create a video artifact.");
  }
  await video.saveAs(join(DOCS_DIR, "reality-ledger-demo.webm"));
}

function writeManifest(video) {
  const filenames = [
    "home.png",
    "globe.png",
    "timeline-evidence.png",
  ];
  const files = Object.fromEntries(
    filenames.map((filename) => {
      const path = join(DOCS_DIR, filename);
      return [
        filename,
        {
          bytes: statSync(path).size,
          sha256: createHash("sha256").update(readFileSync(path)).digest("hex"),
        },
      ];
    }),
  );
  const ogPath = join(PUBLIC_DIR, "reality-ledger-og.png");
  files["reality-ledger-og.png"] = {
    bytes: statSync(ogPath).size,
    sha256: createHash("sha256").update(readFileSync(ogPath)).digest("hex"),
  };
  const videoPath = join(DOCS_DIR, "reality-ledger-demo.webm");
  if (video.status === "captured") {
    files["reality-ledger-demo.webm"] = {
      bytes: statSync(videoPath).size,
      sha256: createHash("sha256").update(readFileSync(videoPath)).digest("hex"),
    };
  }
  writeFileSync(
    join(DOCS_DIR, "manifest.json"),
    `${JSON.stringify(
      {
        capture: "local Playwright Chromium, headless",
        viewport: "1440x1000 screenshots; 1440x900 video; 1200x630 social preview",
        corpus: "synthetic-reviewed-beta",
        video,
        files,
      },
      null,
      2,
    )}\n`,
  );
}

let browser;
try {
  await waitForServer();
  browser = await chromium.launch({
    headless: true,
    args: ["--enable-webgl", "--ignore-gpu-blocklist", "--use-angle=swiftshader"],
  });
  const meaningfulGlobe = await captureScreenshots(browser);
  await captureOpenGraph(browser);
  const videoPath = join(DOCS_DIR, "reality-ledger-demo.webm");
  rmSync(videoPath, { force: true });
  let video = {
    status: "pending",
    reason: "Headless WebGL did not produce a meaningful scene; fallback footage was not retained.",
  };
  if (meaningfulGlobe) {
    try {
      await captureVideo(browser);
      video = {
        status: "captured",
        reason: "Headless WebGL produced a meaningful scene and the synthetic warning was verified.",
      };
    } catch (error) {
      rmSync(videoPath, { force: true });
      video = {
        status: "pending",
        reason: `Headless WebGL video verification failed; footage was not retained: ${String(error)}`,
      };
    }
  }
  writeManifest(video);
  process.stdout.write(
    `${JSON.stringify({
      assets: readdirSync(DOCS_DIR).sort(),
      mode: "local-headless",
      videoStatus: video.status,
    })}\n`,
  );
} finally {
  await browser?.close();
  server.kill("SIGTERM");
  rmSync(TEMP_DIR, { recursive: true, force: true });
}
