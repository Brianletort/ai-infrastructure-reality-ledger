import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, resolve } from "node:path";
import test from "node:test";

const ROOT = resolve(import.meta.dirname, "../..");
const REQUIRED_FILES = [
  "CODE_OF_CONDUCT.md",
  "CHANGELOG.md",
  "ROADMAP.md",
  "docs/launch/public-beta-release-notes.md",
  "docs/launch/self-hosting.md",
  "docs/launch/launch-narrative.md",
  "docs/launch/content-sequence.md",
  "docs/launch/demo-storyboard.md",
  "docs/launch/synthetic-contribution-examples.md",
  "evaluations/artifacts/real-gpu-laptop.json",
  ".github/ISSUE_TEMPLATE/source-request.yml",
  ".github/ISSUE_TEMPLATE/correction-report.yml",
  ".github/ISSUE_TEMPLATE/config.yml",
  "apps/web/src/app/robots.ts",
  "apps/web/src/app/launch/page.tsx",
  "scripts/capture-launch-assets.mjs",
];
const ASSETS = [
  ["apps/web/public/launch/reality-ledger-og.png", 10_000, 1_500_000],
  ["docs/assets/launch/home.png", 10_000, 2_000_000],
  ["docs/assets/launch/globe.png", 10_000, 2_000_000],
  ["docs/assets/launch/timeline-evidence.png", 10_000, 2_000_000],
];
const LAUNCH_MARKDOWN = [
  "README.md",
  "CODE_OF_CONDUCT.md",
  "CHANGELOG.md",
  "ROADMAP.md",
  "CONTRIBUTING.md",
  "SECURITY.md",
  "docs/launch/public-beta-release-notes.md",
  "docs/launch/self-hosting.md",
  "docs/launch/launch-narrative.md",
  "docs/launch/content-sequence.md",
  "docs/launch/demo-storyboard.md",
  "docs/launch/synthetic-contribution-examples.md",
  "docs/contributing/source-adapters.md",
  "docs/contributing/release-checklist.md",
];

function read(relativePath) {
  return readFileSync(resolve(ROOT, relativePath), "utf8");
}

function walkSourceFiles(relativePath) {
  const absolutePath = resolve(ROOT, relativePath);
  return readdirSync(absolutePath, { withFileTypes: true }).flatMap((entry) => {
    const child = `${relativePath}/${entry.name}`;
    return entry.isDirectory() ? walkSourceFiles(child) : [child];
  });
}

function localMarkdownLinks(relativePath) {
  const text = read(relativePath);
  return [...text.matchAll(/!?\[[^\]]*]\(([^)]+)\)/g)]
    .map((match) => match[1].trim().split(/\s+/)[0])
    .filter(
      (target) =>
        target &&
        !target.startsWith("#") &&
        !target.startsWith("http://") &&
        !target.startsWith("https://") &&
        !target.startsWith("mailto:"),
    );
}

test("launch package contains every required public-beta artifact", () => {
  const missing = REQUIRED_FILES.filter((path) => !existsSync(resolve(ROOT, path)));
  assert.deepEqual(missing, []);
});

test("README states the beta truth and covers launch decisions", () => {
  const readme = read("README.md");
  for (const required of [
    "six-record",
    "100 synthetic timelines",
    "not real market coverage",
    "Live demo",
    "Evidence model",
    "Cinematic globe",
    "Quick start",
    "Architecture",
    "Source and license boundaries",
    "Roadmap",
    "Security",
    "Correction workflow",
    "Methodology",
    "Limitations",
  ]) {
    assert.match(readme, new RegExp(required, "i"), `README missing ${required}`);
  }
});

test("launch claims avoid unsupported superlatives and metrics", () => {
  const corpus = LAUNCH_MARKDOWN.filter((path) => existsSync(resolve(ROOT, path)))
    .map((path) => `${path}\n${read(path)}`)
    .join("\n");
  const unsupported = [
    /\b(first[- ]ever|world['’]s first|industry first)\b/i,
    /\b(?:delivers?|provides?|maps?|tracks?)\s+(?:complete|comprehensive) market coverage\b/i,
    /\b(?:is|now|fully)\s+production[- ]ready\b/i,
    /\b\d+(?:\.\d+)?%\s+(?:accurate|accuracy)\b/i,
    /\b(?:users|customers|organizations) adopted\b/i,
    /\b(?:guarantees?|proves?)\s+(?:accuracy|performance)\b/i,
  ];
  for (const pattern of unsupported) {
    assert.doesNotMatch(corpus, pattern);
  }
});

test("launch markdown local links and paths resolve", () => {
  const broken = [];
  for (const relativePath of LAUNCH_MARKDOWN) {
    if (!existsSync(resolve(ROOT, relativePath))) {
      continue;
    }
    for (const target of localMarkdownLinks(relativePath)) {
      const decoded = decodeURIComponent(target.split("#")[0]);
      const destination = resolve(dirname(resolve(ROOT, relativePath)), decoded);
      if (!existsSync(destination)) {
        broken.push(`${relativePath} -> ${target}`);
      }
    }
  }
  assert.deepEqual(broken, []);
});

test("launch assets exist within reviewable size budgets", () => {
  const failures = [];
  for (const [path, minimum, maximum] of ASSETS) {
    const absolute = resolve(ROOT, path);
    if (!existsSync(absolute)) {
      failures.push(`${path}: missing`);
      continue;
    }
    const size = statSync(absolute).size;
    if (size < minimum || size > maximum) {
      failures.push(`${path}: ${size} bytes outside ${minimum}-${maximum}`);
    }
  }
  assert.deepEqual(failures, []);
});

test("demo video is valid or explicitly pending after WebGL verification", () => {
  const video = resolve(ROOT, "docs/assets/launch/reality-ledger-demo.webm");
  const manifest = JSON.parse(read("docs/assets/launch/manifest.json"));
  if (existsSync(video)) {
    const size = statSync(video).size;
    assert.ok(size >= 50_000 && size <= 12_000_000);
    assert.equal(manifest.video.status, "captured");
    assert.equal(manifest.files["reality-ledger-demo.webm"].bytes, size);
    for (const path of [
      "README.md",
      "docs/launch/public-beta-release-notes.md",
      "docs/launch/demo-storyboard.md",
    ]) {
      assert.match(read(path), /Video status:\s*\*\*captured\*\*/i);
    }
    assert.match(read("apps/web/src/app/launch/page.tsx"), /Demo video status:\s*captured/i);
    return;
  }

  assert.equal(manifest.video.status, "pending");
  assert.match(manifest.video.reason, /WebGL.*meaningful scene/i);
  assert.match(read("README.md"), /Video status:\s*\*\*pending\*\*/i);
  assert.match(
    read("docs/launch/public-beta-release-notes.md"),
    /Video status:\s*\*\*pending\*\*/i,
  );
  assert.match(read("docs/launch/demo-storyboard.md"), /Video status:\s*\*\*pending\*\*/i);
});

test("changelog and release checklist match manifest video status", () => {
  const manifest = JSON.parse(read("docs/assets/launch/manifest.json"));
  const changelog = read("CHANGELOG.md");
  const checklist = read("docs/contributing/release-checklist.md");
  const statusMarker = new RegExp(`Manifest video status:\\s*\`${manifest.video.status}\``, "i");

  assert.match(changelog, statusMarker);
  assert.match(checklist, statusMarker);
  assert.match(checklist, /verified public demo video[\s\S]*pending-video disclosure[\s\S]*storyboard/i);

  if (manifest.video.status === "pending") {
    assert.match(changelog, /bounded capture script[\s\S]*video remains pending/i);
    assert.doesNotMatch(changelog, /Added[^.\n]*short synthetic demo video/i);
    assert.match(checklist, /pending-video disclosure[\s\S]*accepted/i);
  } else if (manifest.video.status === "captured") {
    assert.match(changelog, /verified[^.\n]*demo video/i);
    assert.match(checklist, /verified public demo video[\s\S]*accepted/i);
  } else {
    assert.fail(`Unsupported manifest video status: ${manifest.video.status}`);
  }
});

test("launch sources contain no secret-like placeholders", () => {
  const checked = [...REQUIRED_FILES, ...LAUNCH_MARKDOWN].filter((path) => {
    const absolute = resolve(ROOT, path);
    return existsSync(absolute) && extname(path) !== ".png" && extname(path) !== ".webm";
  });
  const findings = [];
  const patterns = [
    /\bAKIA[0-9A-Z]{16}\b/,
    /\bgh[opsu]_[A-Za-z0-9]{36,255}\b/,
    /\bsk-[A-Za-z0-9_-]{32,}\b/,
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
    /\b(?:API_KEY|TOKEN|PASSWORD|SECRET)=["']?(?!<|your-|example|change-me)[^\s"']{8,}/i,
  ];
  for (const path of new Set(checked)) {
    const text = read(path);
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        findings.push(`${path}: ${pattern}`);
      }
    }
  }
  assert.deepEqual(findings, []);
});

test("launch page images have alt text and warning is visible", () => {
  const page = read("apps/web/src/app/launch/page.tsx");
  const images = [...page.matchAll(/<(?:img|Image)\b[^>]*>/gs)].map((match) => match[0]);
  assert.ok(images.length >= 3, "expected at least three launch screenshots");
  for (const image of images) {
    assert.match(image, /\balt=(?:"[^"]+"|'[^']+'|\{[^}]+\})/s);
  }
  assert.match(page, /SYNTHETIC REVIEWED BETA/i);
  assert.match(page, /NOT PUBLIC FACTUAL DATA/i);
  assert.match(page, /32 measured gates pass/i);
  assert.match(page, /real-GPU laptop.*pass/is);
  assert.match(page, /120\.00 FPS over 10,000\.00 ms/i);
  assert.match(page, /midrange mobile.*inconclusive/is);
});

test("robots remain closed until hosted public-visibility approval", () => {
  const layout = read("apps/web/src/app/layout.tsx");
  const robots = read("apps/web/src/app/robots.ts");
  const checklist = read("docs/contributing/release-checklist.md");
  const releaseNotes = read("docs/launch/public-beta-release-notes.md");

  assert.match(layout, /robots:\s*\{[\s\S]*index:\s*false[\s\S]*follow:\s*false/);
  assert.match(robots, /disallow:\s*["']\/["']/);
  assert.match(checklist, /hosted public-visibility approval/i);
  assert.match(checklist, /index:\s*true[\s\S]*follow:\s*true/i);
  assert.match(checklist, /robots\.txt[\s\S]*meta name=["']robots["']/i);
  assert.match(releaseNotes, /noindex,\s*nofollow/i);
  assert.match(releaseNotes, /hosted\s+public-visibility\s+approval/i);
});

test("environment example exactly matches consumed production variables", () => {
  const sourceFiles = [
    ...walkSourceFiles("apps/web/src"),
    ...walkSourceFiles("apps/worker/src"),
  ].filter((path) => /\.(?:py|ts|tsx)$/.test(path));
  const consumed = new Set();
  const patterns = [
    /process\.env\.([A-Z][A-Z0-9_]*)/g,
    /os\.environ\.get\(\s*["']([A-Z][A-Z0-9_]*)["']/g,
  ];
  for (const path of sourceFiles) {
    const source = read(path);
    for (const pattern of patterns) {
      for (const match of source.matchAll(pattern)) {
        consumed.add(match[1]);
      }
    }
  }
  const documented = new Set(
    read(".env.example")
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => /^[A-Z][A-Z0-9_]*=/.test(line))
      .map((line) => line.split("=", 1)[0]),
  );

  assert.deepEqual([...documented].sort(), [...consumed].sort());
  assert.ok(documented.has("REALITY_LEDGER_OVERPASS_CONTACT_URL"));
});

test("release controls block local evidence and document package checks", () => {
  const gitignore = read(".gitignore");
  const checklist = read("docs/contributing/release-checklist.md");
  const evaluationGuide = read("evaluations/README.md");

  assert.match(gitignore, /^\.local\/$/m);
  assert.match(checklist, /release:verify-boundaries/);
  assert.match(checklist, /source\s+package[\s\S]*hosting\s+package/i);
  assert.match(checklist, /\.local\/\*\*/);
  assert.match(evaluationGuide, /release:verify-boundaries/);
  assert.match(evaluationGuide, /\.local\/\*\*/);
});

test("CSP inline-style exception is constrained and explicitly accepted", () => {
  const nextConfig = read("apps/web/next.config.ts");
  const threatModel = read("docs/policy/security-and-threat-model.md");

  assert.match(nextConfig, /style-src 'self' 'unsafe-inline'/);
  assert.match(threatModel, /style-src[\s\S]*'unsafe-inline'/i);
  assert.match(threatModel, /scope/i);
  assert.match(threatModel, /residual risk/i);
  assert.match(threatModel, /nonce|hash/i);
  assert.match(threatModel, /future hardening/i);
});

test("launch narrative includes ten distinct, reviewable posts", () => {
  const content = read("docs/launch/content-sequence.md");
  const posts = content.match(/^## Post \d+:/gm) ?? [];
  assert.equal(posts.length, 10);
  assert.equal((content.match(/^### Hook$/gm) ?? []).length, 10);
  assert.equal((content.match(/^### Body$/gm) ?? []).length, 10);
  assert.equal((content.match(/^### Visual$/gm) ?? []).length, 10);
  assert.equal((content.match(/^### CTA$/gm) ?? []).length, 10);
  assert.equal((content.match(/^### Claim and citation check$/gm) ?? []).length, 10);
});
