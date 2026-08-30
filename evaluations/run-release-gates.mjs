import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { platform, release, arch } from "node:os";
import { resolve } from "node:path";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

import {
  computeReleaseSourceFingerprint,
  ensureEvaluationOutputDirectories,
  evaluateRealGpuLaptop,
  hashExistingEvidenceFiles,
  makeResult,
  summarizeResults,
} from "./core.mjs";

const ROOT = process.cwd();
const ARTIFACTS = resolve(ROOT, "evaluations/artifacts");
ensureEvaluationOutputDirectories(ROOT);
const GATE_CONFIG = JSON.parse(
  readFileSync(resolve(ROOT, "evaluations/gate.config.json"), "utf8"),
);
const REAL_GPU_EVIDENCE_FILES = [
  "docs/assets/launch/globe.png",
  "docs/assets/launch/reality-ledger-demo.webm",
];
const commands = [
  {
    id: "harness.behavior-tests",
    command: "node",
    args: [
      "--test",
      "evaluations/tests/gate-behavior.test.mjs",
      "evaluations/tests/launch-package.test.mjs",
      "evaluations/tests/threat-model.test.mjs",
    ],
  },
  {
    id: "gates.static",
    command: "node",
    args: ["evaluations/static-gates.mjs"],
  },
  {
    id: "data.python-gates",
    command: "uv",
    args: ["run", "--project", "apps/worker", "python", "evaluations/data_quality_gate.py"],
  },
  { id: "typescript.tests", command: "npm", args: ["test"] },
  { id: "typescript.lint", command: "npm", args: ["run", "lint"] },
  { id: "typescript.typecheck", command: "npm", args: ["run", "typecheck"] },
  { id: "python.tests", command: "npm", args: ["run", "python:test"] },
  { id: "python.lint", command: "npm", args: ["run", "python:lint"] },
  { id: "python.typecheck", command: "npm", args: ["run", "python:typecheck"] },
  {
    id: "security.npm-audit",
    command: "npm",
    args: ["audit", "--audit-level=high"],
    passDetail:
      "Configured local npm audit passed; this is not full security verification.",
  },
  {
    id: "security.python-audit",
    command: "uv",
    args: ["run", "--project", "apps/worker", "pip-audit", "--local"],
    passDetail:
      "Configured local Python audit passed; this is not full security verification.",
  },
  { id: "build.production", command: "npm", args: ["run", "build"] },
  {
    id: "release.package-boundaries",
    command: "npm",
    args: ["run", "release:verify-boundaries"],
    passDetail:
      "Source and hosting package inventories exclude .local/** restricted evidence paths.",
  },
  {
    id: "browser.cross-browser-accessibility-visual-performance",
    command: "npx",
    args: ["playwright", "test"],
  },
  { id: "repository.diff-check", command: "git", args: ["diff", "--check"] },
];

function safeId(id) {
  return id.replaceAll(/[^a-z0-9.-]+/gi, "-");
}

function runCommand(item) {
  const startedAt = new Date();
  const started = performance.now();
  const completed = spawnSync(item.command, item.args, {
    cwd: ROOT,
    encoding: "utf8",
    env: {
      ...process.env,
      CI: "1",
      FORCE_COLOR: "0",
      NO_COLOR: "1",
    },
    maxBuffer: 50 * 1024 * 1024,
  });
  const durationMs = performance.now() - started;
  const stdout = completed.stdout ?? "";
  const stderr = completed.stderr ?? "";
  writeFileSync(
    resolve(ARTIFACTS, `${safeId(item.id)}.log`),
    [
      `$ ${item.command} ${item.args.join(" ")}`,
      `started: ${startedAt.toISOString()}`,
      `duration_ms: ${durationMs.toFixed(3)}`,
      `exit_code: ${completed.status ?? "null"}`,
      "",
      stdout,
      stderr,
    ].join("\n"),
  );
  return makeResult(
    item.id,
    completed.status === 0 ? "pass" : "fail",
    completed.status === 0
      ? item.passDetail ?? `Command passed in ${durationMs.toFixed(0)} ms.`
      : `Command exited ${completed.status ?? "without status"}; see artifact log.`,
    {
      command: [item.command, ...item.args].join(" "),
      durationMs,
      exitCode: completed.status,
      log: `evaluations/artifacts/${safeId(item.id)}.log`,
    },
  );
}

function readReportResults(path) {
  try {
    return JSON.parse(readFileSync(resolve(ROOT, path), "utf8")).results ?? [];
  } catch (error) {
    return [
      makeResult(
        `artifact.${safeId(path)}`,
        "fail",
        `Could not read ${path}: ${String(error)}`,
      ),
    ];
  }
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(resolve(ROOT, path), "utf8"));
  } catch {
    return null;
  }
}

function browserEvidence() {
  const projects = ["chromium", "firefox", "webkit"]
    .map((name) => readJson(`evaluations/artifacts/browser-${name}.json`))
    .filter(Boolean);
  return projects.length === 3
    ? makeResult(
        "browser.versions",
        "pass",
        "All three pinned Playwright browser engines recorded version evidence.",
        { projects },
      )
    : makeResult(
        "browser.versions",
        "fail",
        `Expected 3 browser version artifacts; found ${projects.length}.`,
        { projects },
      );
}

function performanceEvidence() {
  const browser = readJson("evaluations/artifacts/browser-performance.json");
  const internal = readJson("evaluations/artifacts/internal-performance.json");
  const realGpuLaptop = readJson("evaluations/artifacts/real-gpu-laptop.json");
  const realGpuThresholds = {
    minimumDurationMs: GATE_CONFIG.thresholds.realGpuMinimumDurationMs,
    minimumFps: GATE_CONFIG.thresholds.realGpuLaptopFps,
  };
  const realGpuContext = {
    now: new Date(),
    expectedRoute: "/globe?theme=obsidian",
    sourceFingerprint: computeReleaseSourceFingerprint(ROOT),
    freshnessMaxAgeMs: GATE_CONFIG.thresholds.realGpuFreshnessMaxAgeMs,
    fpsTolerance: GATE_CONFIG.thresholds.realGpuFpsTolerance,
    evidenceHashes: hashExistingEvidenceFiles(ROOT, REAL_GPU_EVIDENCE_FILES),
  };
  if (!browser || !internal) {
    return [
      makeResult(
        "performance.measured-budgets",
        "fail",
        "One or more required performance artifacts are missing.",
      ),
      evaluateRealGpuLaptop(realGpuLaptop, realGpuThresholds, realGpuContext),
      makeResult(
        "performance.representative-mobile",
        "inconclusive",
        "The 30 FPS representative midrange mobile target remains unmeasured.",
      ),
    ];
  }
  const measuredPass = Object.values(browser.checks ?? {}).every(Boolean);
  return [
    makeResult(
      "performance.measured-budgets",
      measuredPass ? "pass" : "fail",
      measuredPass
        ? "Measured local HTML, readiness, JS payload, headless cadence, layer, and reducer budgets passed."
        : "At least one measured local performance budget failed.",
      { browser, internal },
    ),
    evaluateRealGpuLaptop(realGpuLaptop, realGpuThresholds, realGpuContext),
    makeResult(
      "performance.representative-mobile",
      "inconclusive",
      "The 30 FPS representative midrange mobile target remains unmeasured; the laptop result does not substantiate mobile performance.",
      { targetFps: 30, deviceClass: "representative-midrange-mobile" },
    ),
  ];
}

function visualInspectionEvidence() {
  const inspection = readJson("evaluations/artifacts/visual-inspection.json");
  if (!inspection) {
    return makeResult(
      "visual.manual-inspection",
      "inconclusive",
      "Screenshot baselines exist, but no inspection artifact was recorded.",
    );
  }
  return makeResult(
    "visual.manual-inspection",
    inspection.status,
    inspection.detail,
    inspection,
  );
}

const commandResults = commands.map(runCommand);
const gateResults = [
  ...readReportResults("evaluations/artifacts/static-gates.json"),
  ...readReportResults("evaluations/artifacts/data-quality-python.json"),
  ...commandResults,
  browserEvidence(),
  ...performanceEvidence(),
  visualInspectionEvidence(),
];
const summary = summarizeResults(gateResults);
const report = {
  schemaVersion: "1.0.0",
  generatedAt: new Date().toISOString(),
  decision: summary.decision,
  counts: summary.counts,
  environment: {
    platform: platform(),
    release: release(),
    architecture: arch(),
    node: process.version,
    execution:
      "local headless gates with separately recorded real-browser laptop GPU evidence; no deployment; representative mobile unmeasured",
  },
  gates: gateResults,
};
const schema = JSON.parse(
  readFileSync(resolve(ROOT, "evaluations/schemas/review-report.schema.json"), "utf8"),
);
const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const valid = ajv.validate(schema, report);
if (!valid) {
  throw new Error(`Generated report violates schema: ${JSON.stringify(ajv.errors)}`);
}
writeFileSync(
  resolve(ROOT, "evaluations/review_report.json"),
  `${JSON.stringify(report, null, 2)}\n`,
);

const rows = gateResults
  .map(
    (result) =>
      `| ${result.id} | ${result.status.toUpperCase()} | ${result.detail.replaceAll("|", "\\|")} |`,
  )
  .join("\n");
const failed = gateResults.filter((result) => result.status === "fail");
const inconclusive = gateResults.filter((result) => result.status === "inconclusive");
const markdown = `# Reality Ledger release evaluation

**Decision: ${summary.decision.toUpperCase()}**

Generated ${report.generatedAt}. A pass means only that the measured local gate met its documented
threshold. Unmeasured claims are inconclusive. The local headless cadence is a regression signal,
not evidence for a representative device. The recorded real-browser laptop gate is evaluated
separately; the 30 FPS representative midrange mobile target remains unmeasured. Configured local
security scans passing is not full security verification or assurance.

## Summary

| Pass | Fail | Inconclusive |
| ---: | ---: | ---: |
| ${summary.counts.pass} | ${summary.counts.fail} | ${summary.counts.inconclusive} |

## Gate results

| Gate | Status | Detail |
| --- | --- | --- |
${rows}

## Release blockers

${
  failed.length > 0
    ? failed.map((result) => `- **${result.id}:** ${result.detail}`).join("\n")
    : "- No measured failures."
}

## Inconclusive items

${
  inconclusive.length > 0
    ? inconclusive.map((result) => `- **${result.id}:** ${result.detail}`).join("\n")
    : "- None."
}

## Raw artifacts

- Command logs: \`evaluations/artifacts/*.log\`
- Static/data reports: \`evaluations/artifacts/static-gates.json\`,
  \`evaluations/artifacts/data-quality-python.json\`
- Browser and performance evidence: \`evaluations/artifacts/playwright-results.json\`,
  \`evaluations/artifacts/browser-*.json\`, \`evaluations/artifacts/*performance.json\`
- Visual baselines: \`evaluations/visual-baselines/\`

## Rollback

Remove \`evaluations/\`, \`playwright.config.ts\`, the root gate scripts/dependencies, the
\`pip-audit\` dev dependency, and the security-header block in \`apps/web/next.config.ts\`.
No schema, production data, deployment, or external system was mutated.
`;
writeFileSync(resolve(ROOT, "evaluations/review_report.md"), markdown);
process.stdout.write(
  `${JSON.stringify({ decision: summary.decision, counts: summary.counts })}\n`,
);
process.exitCode =
  summary.decision === "pass" ? 0 : summary.decision === "inconclusive" ? 2 : 1;
