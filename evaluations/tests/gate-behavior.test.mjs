import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import * as core from "../core.mjs";

const {
  evaluateLicenseName,
  evaluateSourceManifest,
  makeResult,
  summarizeResults,
} = core;

test("unmeasured claims are inconclusive and prevent release", () => {
  const results = [
    makeResult("measured-pass", "pass", "measured"),
    makeResult("not-measured", "inconclusive", "GPU browser not available"),
  ];

  assert.deepEqual(summarizeResults(results), {
    decision: "inconclusive",
    counts: { pass: 1, fail: 0, inconclusive: 1 },
  });
});

test("a failed check takes precedence over inconclusive checks", () => {
  const results = [
    makeResult("gpu", "inconclusive", "not representative"),
    makeResult("secret-scan", "fail", "candidate found"),
  ];

  assert.equal(summarizeResults(results).decision, "fail");
});

test("unknown and custom licenses require review", () => {
  const policy = {
    allow: ["Apache-2.0", "MIT"],
    review: ["ODbL-1.0"],
  };

  assert.equal(evaluateLicenseName("MIT", policy), "pass");
  assert.equal(evaluateLicenseName("(MIT OR Apache-2.0)", policy), "pass");
  assert.equal(evaluateLicenseName("ODbL-1.0", policy), "inconclusive");
  assert.equal(evaluateLicenseName("Custom Internal", policy), "fail");
  assert.equal(evaluateLicenseName("UNKNOWN", policy), "fail");
});

test("source manifests require legal and sensitivity metadata", () => {
  const valid = {
    adapterId: "source-a",
    attribution: { text: "Example", url: "https://example.invalid/license" },
    license: { name: "MIT", url: "https://example.invalid/license" },
    termsUrl: "https://example.invalid/terms",
    sensitivity: "public",
    redistribution: "republish",
    allowedUse: "inventory",
  };

  assert.deepEqual(evaluateSourceManifest([valid]), []);
  assert.deepEqual(
    evaluateSourceManifest([{ ...valid, termsUrl: "" }]),
    ["source-a: missing termsUrl"],
  );
  assert.deepEqual(
    evaluateSourceManifest([{ ...valid, attribution: undefined, license: undefined }]),
    [
      "source-a: missing attribution",
      "source-a: missing attribution.url",
      "source-a: missing license",
      "source-a: missing license.url",
    ],
  );
});

test("prohibited manifests cannot produce records", () => {
  const prohibited = {
    adapterId: "blocked",
    attribution: { text: "No use", url: "https://example.invalid" },
    license: { name: "restricted", url: "https://example.invalid" },
    termsUrl: "https://example.invalid",
    sensitivity: "not ingested",
    redistribution: "prohibited",
    allowedUse: "prohibited",
  };

  assert.deepEqual(
    evaluateSourceManifest([prohibited], new Set(["blocked"])),
    ["blocked: prohibited source produced records"],
  );
});

const APPROVED_POLICY = {
  "MPL-2.0": {
    requiredObligations: [
      "include-notice",
      "provide-license-link",
      "provide-source-link",
      "preserve-file-level-copyleft",
    ],
    requiredModificationStatus: "unmodified",
  },
};

function approvedMplPackage(overrides = {}) {
  return {
    name: "example-mpl",
    version: "1.2.3",
    license: "MPL-2.0",
    disposition: "approved",
    attribution: "Example maintainers and contributors.",
    packageUrl: "https://www.npmjs.com/package/example-mpl/v/1.2.3",
    sourceUrl: "https://example.invalid/source",
    licenseUrl: "https://www.mozilla.org/MPL/2.0/",
    obligations: [
      "include-notice",
      "provide-license-link",
      "provide-source-link",
      "preserve-file-level-copyleft",
    ],
    modificationStatus: "unmodified",
    modifiedFiles: [],
    ...overrides,
  };
}

test("reviewed packages require exact explicit approved dispositions", () => {
  assert.equal(typeof core.evaluateLicenseDispositions, "function");
  const reviewed = [{ name: "example-mpl", version: "1.2.3", license: "MPL-2.0" }];
  const missing = {
    schemaVersion: "1.0.0",
    legalDisclaimer: "Informational only; not legal advice.",
    packages: [],
  };
  const stale = {
    ...missing,
    packages: [
      approvedMplPackage(),
      approvedMplPackage({ name: "stale-package" }),
    ],
  };

  assert.deepEqual(
    core.evaluateLicenseDispositions(reviewed, missing, APPROVED_POLICY),
    ["example-mpl@1.2.3:MPL-2.0: missing approved disposition"],
  );
  assert.deepEqual(
    core.evaluateLicenseDispositions(reviewed, stale, APPROVED_POLICY),
    ["stale-package@1.2.3:MPL-2.0: disposition is not for a reviewed package"],
  );
});

test("copyleft dispositions require notices, links, obligations, and unmodified files", () => {
  assert.equal(typeof core.evaluateLicenseDispositions, "function");
  const reviewed = [{ name: "example-mpl", version: "1.2.3", license: "MPL-2.0" }];
  const invalid = {
    schemaVersion: "1.0.0",
    legalDisclaimer: "Informational only; not legal advice.",
    packages: [
      approvedMplPackage({
        attribution: "",
        sourceUrl: "",
        obligations: ["include-notice"],
        modificationStatus: "modified",
        modifiedFiles: ["dist/example.js"],
      }),
    ],
  };

  assert.deepEqual(
    core.evaluateLicenseDispositions(reviewed, invalid, APPROVED_POLICY),
    [
      "example-mpl@1.2.3:MPL-2.0: missing attribution",
      "example-mpl@1.2.3:MPL-2.0: missing sourceUrl",
      "example-mpl@1.2.3:MPL-2.0: missing obligation provide-license-link",
      "example-mpl@1.2.3:MPL-2.0: missing obligation provide-source-link",
      "example-mpl@1.2.3:MPL-2.0: missing obligation preserve-file-level-copyleft",
      "example-mpl@1.2.3:MPL-2.0: modificationStatus must be unmodified",
      "example-mpl@1.2.3:MPL-2.0: modifiedFiles must be empty",
    ],
  );
});

test("third-party notice rendering is deterministic", () => {
  assert.equal(typeof core.renderThirdPartyNotices, "function");
  const manifest = {
    schemaVersion: "1.0.0",
    legalDisclaimer: "Informational only; not legal advice.",
    distributionScope: "Reality Ledger open-source beta",
    packages: [
      approvedMplPackage({ ecosystem: "python", name: "z-package" }),
      approvedMplPackage({ ecosystem: "python", name: "a-package" }),
    ],
  };

  const first = core.renderThirdPartyNotices(manifest);
  const second = core.renderThirdPartyNotices({
    ...manifest,
    packages: [...manifest.packages].reverse(),
  });

  assert.equal(first, second);
  assert.ok(
    first.indexOf("## [python] a-package 1.2.3") <
      first.indexOf("## [python] z-package 1.2.3"),
  );
  assert.match(first, /not legal advice/);
});

test("locked package licenses preserve allow review and deny semantics", () => {
  assert.equal(typeof core.classifyPackageLicenses, "function");
  const packages = [
    { ecosystem: "python", name: "allowed", version: "1", license: "MIT" },
    { ecosystem: "python", name: "review", version: "1", license: "MPL-2.0" },
    { ecosystem: "python", name: "denied", version: "1", license: "UNKNOWN" },
  ];
  const policy = {
    allow: ["MIT"],
    review: ["MPL-2.0"],
  };

  assert.deepEqual(core.classifyPackageLicenses(packages, policy), {
    allowed: [packages[0]],
    review: [packages[1]],
    denied: [packages[2]],
  });
});

test("python license inventory must exactly cover locked environment packages", () => {
  assert.equal(typeof core.evaluatePythonLicenseInventory, "function");
  const locked = [
    { ecosystem: "python", name: "allowed", version: "1", license: "MIT" },
    { ecosystem: "python", name: "review", version: "1", license: "MPL-2.0" },
    { ecosystem: "python", name: "unknown", version: "1", license: "UNKNOWN" },
    { ecosystem: "python", name: "missing", version: "1", license: "MIT" },
  ];
  const recorded = locked.slice(0, 3);

  assert.deepEqual(
    core.evaluatePythonLicenseInventory(locked, recorded, {
      allow: ["MIT"],
      review: ["MPL-2.0"],
    }),
    {
      failures: [
        "python:missing@1:MIT: missing environment metadata",
        "python:unknown@1:UNKNOWN: disallowed or unknown license",
      ],
      review: ["python:review@1:MPL-2.0"],
      allowed: ["python:allowed@1:MIT"],
    },
  );
});

test("exact Python approval overrides review-required notice disposition", () => {
  assert.equal(typeof core.applyApprovedDispositions, "function");
  const inventory = [
    {
      ecosystem: "python",
      name: "certifi",
      version: "2026.7.22",
      license: "MPL-2.0",
      disposition: "review-required",
      metadataEvidence: { status: "installed-metadata-matched-lock" },
    },
  ];
  const approval = approvedMplPackage({
    ecosystem: "python",
    name: "certifi",
    version: "2026.7.22",
  });

  assert.deepEqual(core.applyApprovedDispositions(inventory, [approval]), [
    {
      ...inventory[0],
      ...approval,
      metadataEvidence: inventory[0].metadataEvidence,
    },
  ]);
});

test("release output preparation creates absent parent directories", () => {
  assert.equal(typeof core.ensureEvaluationOutputDirectories, "function");
  const root = mkdtempSync(join(tmpdir(), "reality-ledger-gates-"));
  try {
    core.ensureEvaluationOutputDirectories(root);
    assert.equal(existsSync(join(root, "evaluations", "artifacts", "playwright")), true);
    assert.equal(existsSync(join(root, "evaluations", "artifacts", "python")), true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("security results describe configured local scans without broad assurance", () => {
  assert.equal(typeof core.makeConfiguredLocalScanResult, "function");
  const result = core.makeConfiguredLocalScanResult("security.example", []);
  assert.equal(result.status, "pass");
  assert.match(result.detail, /configured local scan passed/i);
  assert.match(result.detail, /not full security verification/i);
});

test("publish inventories reject local evidence at any path depth", () => {
  assert.equal(typeof core.findRestrictedPublishPaths, "function");
  assert.deepEqual(
    core.findRestrictedPublishPaths([
      "README.md",
      "apps/web/.next/server/app.js",
      ".local/restricted-evidence/source.json",
      "bundle/.local/launch-capture/demo.webm",
      String.raw`bundle\.local\restricted-evidence\source.json`,
    ]),
    [
      ".local/restricted-evidence/source.json",
      "bundle/.local/launch-capture/demo.webm",
      String.raw`bundle\.local\restricted-evidence\source.json`,
    ],
  );
});

function writeFixtureFile(root, relativePath, content) {
  const path = join(root, relativePath);
  mkdirSync(path.split("/").slice(0, -1).join("/"), { recursive: true });
  writeFileSync(path, content);
}

function createRuntimeFingerprintFixture() {
  const root = mkdtempSync(join(tmpdir(), "reality-ledger-runtime-fingerprint-"));
  writeFixtureFile(root, "package.json", '{"name":"fixture"}\n');
  writeFixtureFile(root, "package-lock.json", '{"lockfileVersion":3}\n');
  writeFixtureFile(root, "tsconfig.base.json", '{"compilerOptions":{}}\n');
  writeFixtureFile(root, "apps/web/package.json", '{"name":"web"}\n');
  writeFixtureFile(root, "apps/web/next.config.ts", "export default {};\n");
  writeFixtureFile(root, "apps/web/tsconfig.json", '{"extends":"../../tsconfig.base.json"}\n');
  writeFixtureFile(root, "apps/web/src/app/globe/page.tsx", "export const route = '/globe';\n");
  writeFixtureFile(root, "apps/web/src/app/launch/page.tsx", "export const launch = 'copy';\n");
  writeFixtureFile(root, "packages/visuals/package.json", '{"name":"@fixture/visuals"}\n');
  writeFixtureFile(root, "packages/visuals/tsconfig.json", '{"extends":"../../tsconfig.base.json"}\n');
  writeFixtureFile(root, "packages/visuals/src/globe-map.tsx", "export const renderer = 'globe';\n");
  writeFixtureFile(root, "apps/web/public/visuals/inventory-diamonds.svg", "<svg />\n");
  writeFixtureFile(root, "apps/web/public/vendor/maplibre-gl-worker.mjs", "export {};\n");
  writeFixtureFile(root, "evaluations/tests/gate-behavior.test.mjs", "test('evidence doc');\n");
  writeFixtureFile(root, "evaluations/README.md", "# evaluation docs\n");
  writeFixtureFile(root, "evaluations/artifacts/real-gpu-laptop.json", "{}\n");
  writeFixtureFile(root, "docs/launch/launch-narrative.md", "# launch narrative\n");
  writeFixtureFile(root, "apps/web/public/launch/globe.png", "not-a-real-png\n");
  return root;
}

test("runtime fingerprint changes for globe runtime source and visual assets", () => {
  assert.equal(typeof core.computeReleaseSourceFingerprint, "function");
  const root = createRuntimeFingerprintFixture();
  try {
    const baseline = core.computeReleaseSourceFingerprint(root);
    writeFixtureFile(root, "packages/visuals/src/globe-map.tsx", "export const renderer = 'globe-v2';\n");
    const sourceChanged = core.computeReleaseSourceFingerprint(root);
    writeFixtureFile(root, "packages/visuals/src/globe-map.tsx", "export const renderer = 'globe';\n");
    writeFixtureFile(root, "apps/web/public/visuals/inventory-diamonds.svg", "<svg><path /></svg>\n");
    const visualAssetChanged = core.computeReleaseSourceFingerprint(root);

    assert.notEqual(sourceChanged, baseline);
    assert.notEqual(visualAssetChanged, baseline);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("runtime fingerprint ignores evaluation records and launch narrative media", () => {
  const root = createRuntimeFingerprintFixture();
  try {
    const baseline = core.computeReleaseSourceFingerprint(root);
    writeFixtureFile(root, "evaluations/tests/gate-behavior.test.mjs", "test('changed evidence');\n");
    writeFixtureFile(root, "evaluations/README.md", "# changed evaluation docs\n");
    writeFixtureFile(root, "evaluations/artifacts/real-gpu-laptop.json", '{"changed":true}\n');
    writeFixtureFile(root, "docs/launch/launch-narrative.md", "# changed launch narrative\n");
    writeFixtureFile(root, "apps/web/src/app/launch/page.tsx", "export const launch = 'changed copy';\n");
    writeFixtureFile(root, "apps/web/public/launch/globe.png", "changed-launch-media\n");

    assert.equal(core.computeReleaseSourceFingerprint(root), baseline);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("runtime fingerprint computation is deterministic", () => {
  const root = createRuntimeFingerprintFixture();
  try {
    assert.equal(
      core.computeReleaseSourceFingerprint(root),
      core.computeReleaseSourceFingerprint(root),
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

const VALID_REAL_GPU_LAPTOP = {
  schemaVersion: "1.0.0",
  deviceClass: "representative-laptop",
  generatedAt: "2026-08-30T16:30:00.000Z",
  route: "/globe?theme=obsidian",
  captureMethod: "real-browser-manual-measurement",
  revision: {
    kind: "source-fingerprint",
    value: "sha256:release-source-fingerprint",
  },
  browser: {
    name: "Chrome",
    version: "151.0.7922.174",
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.7922.174 Safari/537.36",
  },
  gpu: {
    renderer: "ANGLE (Apple, ANGLE Metal Renderer: Apple M4 Pro, Unspecified Version)",
  },
  overlay: {
    visible: true,
    width: 1199,
    height: 792,
  },
  mapCanvas: {
    width: 1199,
    height: 792,
  },
  frameEvidence: {
    kind: "summary",
    sampleCount: 1201,
  },
  evidenceHashes: {
    "docs/assets/launch/reality-ledger-demo.webm":
      "388bb19e8623f95414d6fda819261906fe0cb909c7ab74e584fd4b5474d5543f",
  },
  measurement: {
    frameCount: 1201,
    durationMs: 10005.4,
    fps: 120.04,
    frameTimeP95Ms: 9.2,
    frameTimeMaxMs: 9.4,
  },
};

const REAL_GPU_CONTEXT = {
  now: new Date("2026-08-30T16:45:00.000Z"),
  expectedRoute: "/globe?theme=obsidian",
  sourceFingerprint: "sha256:release-source-fingerprint",
  freshnessMaxAgeMs: 60 * 60 * 1000,
  fpsTolerance: 0.05,
  evidenceHashes: {
    "docs/assets/launch/reality-ledger-demo.webm":
      "388bb19e8623f95414d6fda819261906fe0cb909c7ab74e584fd4b5474d5543f",
  },
};

test("representative laptop GPU evidence passes only with real visible sustained rendering", () => {
  assert.equal(typeof core.evaluateRealGpuLaptop, "function");

  const result = core.evaluateRealGpuLaptop(
    VALID_REAL_GPU_LAPTOP,
    undefined,
    REAL_GPU_CONTEXT,
  );

  assert.equal(result.status, "pass");
  assert.equal(result.id, "performance.real-gpu-laptop");
  assert.deepEqual(result.evidence.measurement, VALID_REAL_GPU_LAPTOP);
});

test("representative laptop GPU evidence rejects unrepresentative measurements", () => {
  const invalidMeasurements = [
    {
      label: "software renderer",
      value: {
        ...VALID_REAL_GPU_LAPTOP,
        gpu: { renderer: "ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)))" },
      },
    },
    {
      label: "hidden overlay",
      value: {
        ...VALID_REAL_GPU_LAPTOP,
        overlay: { visible: false },
      },
    },
    {
      label: "insufficient duration",
      value: {
        ...VALID_REAL_GPU_LAPTOP,
        measurement: { ...VALID_REAL_GPU_LAPTOP.measurement, durationMs: 9999.99 },
      },
    },
    {
      label: "below 60 FPS",
      value: {
        ...VALID_REAL_GPU_LAPTOP,
        measurement: { ...VALID_REAL_GPU_LAPTOP.measurement, fps: 59.99 },
      },
    },
  ];

  for (const scenario of invalidMeasurements) {
    const result = core.evaluateRealGpuLaptop(scenario.value);
    assert.equal(result.status, "fail", scenario.label);
  }
});

test("representative laptop GPU evidence is inconclusive when stale or incomplete", () => {
  const stale = core.evaluateRealGpuLaptop(
    {
      ...VALID_REAL_GPU_LAPTOP,
      generatedAt: "2026-08-30T14:30:00.000Z",
    },
    undefined,
    REAL_GPU_CONTEXT,
  );
  const incomplete = core.evaluateRealGpuLaptop({
    ...VALID_REAL_GPU_LAPTOP,
    generatedAt: undefined,
    browser: { name: "Chrome", version: "151.0.7922.174" },
  });

  assert.equal(stale.status, "inconclusive");
  assert.match(stale.detail, /freshness/i);
  assert.equal(incomplete.status, "inconclusive");
  assert.match(incomplete.detail, /recapture/i);
});

test("representative laptop GPU evidence rejects inconsistent frame math", () => {
  const result = core.evaluateRealGpuLaptop(
    {
      ...VALID_REAL_GPU_LAPTOP,
      measurement: {
        ...VALID_REAL_GPU_LAPTOP.measurement,
        frameCount: 600,
        durationMs: 10000,
        fps: 120,
      },
    },
    undefined,
    REAL_GPU_CONTEXT,
  );

  assert.equal(result.status, "fail");
  assert.match(result.detail, /frameCount\/duration\/fps/i);
});

test("representative laptop GPU evidence rejects mismatched route revision and hashes", () => {
  const result = core.evaluateRealGpuLaptop(
    {
      ...VALID_REAL_GPU_LAPTOP,
      route: "/",
      revision: {
        kind: "source-fingerprint",
        value: "sha256:stale-source",
      },
      evidenceHashes: {
        "docs/assets/launch/reality-ledger-demo.webm": "sha256-not-the-current-demo",
      },
    },
    undefined,
    REAL_GPU_CONTEXT,
  );

  assert.equal(result.status, "fail");
  assert.match(result.detail, /route/i);
  assert.match(result.detail, /revision/i);
  assert.match(result.detail, /hash/i);
});
