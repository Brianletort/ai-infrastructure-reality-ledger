import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";

export function makeResult(id, status, detail, evidence = {}) {
  if (!["pass", "fail", "inconclusive"].includes(status)) {
    throw new Error(`Invalid gate status for ${id}: ${status}`);
  }
  return { id, status, detail, evidence };
}

export function makeConfiguredLocalScanResult(id, findings, evidence = {}) {
  return makeResult(
    id,
    findings.length === 0 ? "pass" : "fail",
    findings.length === 0
      ? "Configured local scan passed; this is not full security verification."
      : `Configured local scan found: ${findings.join("; ")}`,
    evidence,
  );
}

export function findRestrictedPublishPaths(paths) {
  return paths.filter((path) =>
    path
      .replaceAll("\\", "/")
      .split("/")
      .some((segment) => segment === ".local"),
  );
}

export function summarizeResults(results) {
  const counts = { pass: 0, fail: 0, inconclusive: 0 };
  for (const result of results) {
    counts[result.status] += 1;
  }
  const decision =
    counts.fail > 0 ? "fail" : counts.inconclusive > 0 ? "inconclusive" : "pass";
  return { decision, counts };
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function nonEmptyString(value) {
  return typeof value === "string" && value.trim() !== "";
}

function finitePositive(value) {
  return Number.isFinite(value) && value > 0;
}

function isoTimestamp(value) {
  if (!nonEmptyString(value)) {
    return null;
  }
  const time = Date.parse(value);
  return Number.isFinite(time) ? new Date(time) : null;
}

function walkFingerprintFiles(root, relativePath) {
  const absolutePath = resolve(root, relativePath);
  if (!existsSync(absolutePath)) {
    return [];
  }
  const ignored = new Set([
    ".git",
    ".next",
    "dist",
    "node_modules",
    "artifacts",
    "visual-baselines",
    "review_report.md",
    "review_report.json",
  ]);
  const entry = statSync(absolutePath);
  if (entry.isDirectory()) {
    return readdirSync(absolutePath, { withFileTypes: true })
      .filter((child) => !ignored.has(child.name))
      .flatMap((child) =>
        walkFingerprintFiles(root, `${relativePath}/${child.name}`),
      );
  }
  if (!entry.isFile()) {
    return [];
  }
  return [relativePath];
}

function packageRuntimeEntries(root) {
  const packagesRoot = resolve(root, "packages");
  if (!existsSync(packagesRoot)) {
    return [];
  }
  return readdirSync(packagesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => [
      `packages/${entry.name}/package.json`,
      `packages/${entry.name}/tsconfig.json`,
      `packages/${entry.name}/src`,
    ]);
}

function isRuntimeFingerprintFile(path) {
  return !/(^|\/)(?:tests?|__tests__)(?:\/|$)/.test(path) && !/\.(?:test|spec)\.[cm]?[jt]sx?$/.test(path);
}

export function runtimeFingerprintInputs(root) {
  return [
    "package.json",
    "package-lock.json",
    "tsconfig.base.json",
    "apps/web/package.json",
    "apps/web/next.config.ts",
    "apps/web/tsconfig.json",
    "apps/web/src/app/globe",
    "apps/web/src/app/layout.tsx",
    "apps/web/src/app/globals.css",
    "apps/web/src/app/components/editorial.tsx",
    "apps/web/src/app/components/mobile-navigation.tsx",
    "apps/web/src/app/site-content.ts",
    "apps/web/src/lib/editorial-data.ts",
    "apps/web/public/visuals",
    "apps/web/public/vendor",
    ...packageRuntimeEntries(root),
  ]
    .flatMap((path) => walkFingerprintFiles(root, path))
    .filter(isRuntimeFingerprintFile)
    .sort();
}

/**
 * Fingerprint the runtime inputs for the measured /globe build.
 *
 * This intentionally excludes evaluation docs/tests/artifacts, generated reports,
 * launch prose/media, and other release records so evidence documentation can be
 * updated without forcing meaningless real-GPU recaptures.
 */
export function computeReleaseSourceFingerprint(root) {
  const hash = createHash("sha256");
  const files = runtimeFingerprintInputs(root);
  for (const file of files) {
    hash.update(file);
    hash.update("\0");
    hash.update(readFileSync(resolve(root, file)));
    hash.update("\0");
  }
  return `sha256:${hash.digest("hex")}`;
}

export function hashExistingEvidenceFiles(root, files) {
  return Object.fromEntries(
    files
      .filter((file) => existsSync(resolve(root, file)))
      .map((file) => [
        file,
        createHash("sha256").update(readFileSync(resolve(root, file))).digest("hex"),
      ]),
  );
}

export function evaluateRealGpuLaptop(
  measurement,
  thresholds = { minimumDurationMs: 10_000, minimumFps: 60 },
  context = {},
) {
  const failures = [];
  const inconclusive = [];
  const renderer = measurement?.gpu?.renderer;
  const sample = measurement?.measurement;
  const generatedAt = isoTimestamp(measurement?.generatedAt);
  const freshnessMaxAgeMs = context.freshnessMaxAgeMs ?? 60 * 60 * 1000;
  const fpsTolerance = context.fpsTolerance ?? 0.05;

  if (measurement?.schemaVersion !== "1.0.0") {
    inconclusive.push("schemaVersion must be 1.0.0; recapture the real-GPU artifact");
  }
  if (measurement?.deviceClass !== "representative-laptop") {
    failures.push("deviceClass must be representative-laptop");
  }
  if (!generatedAt) {
    inconclusive.push("generatedAt must be an ISO timestamp; recapture the real-GPU artifact");
  } else if (context.now instanceof Date) {
    const ageMs = context.now.getTime() - generatedAt.getTime();
    if (ageMs < 0 || ageMs > freshnessMaxAgeMs) {
      inconclusive.push(
        `freshness exceeded bounded policy of ${freshnessMaxAgeMs} ms; recapture the real-GPU artifact`,
      );
    }
  }
  if (!nonEmptyString(measurement?.route)) {
    inconclusive.push("route is required; recapture the real-GPU artifact");
  } else if (context.expectedRoute && measurement.route !== context.expectedRoute) {
    failures.push(`route mismatch: expected ${context.expectedRoute}, got ${measurement.route}`);
  }
  if (
    !isObject(measurement?.revision) ||
    measurement.revision.kind !== "source-fingerprint" ||
    !nonEmptyString(measurement.revision.value)
  ) {
    inconclusive.push(
      "revision.kind source-fingerprint and revision.value are required; recapture against the current /globe runtime fingerprint",
    );
  } else if (
    context.sourceFingerprint &&
    measurement.revision.value !== context.sourceFingerprint
  ) {
    failures.push("revision fingerprint does not match the current /globe runtime fingerprint");
  }
  if (
    ![
      "real-browser-manual-measurement",
      "real-browser-scripted-measurement",
    ].includes(measurement?.captureMethod)
  ) {
    inconclusive.push(
      "captureMethod must identify real-browser manual or scripted measurement; recapture the artifact",
    );
  }
  if (
    typeof measurement?.browser?.name !== "string" ||
    typeof measurement?.browser?.version !== "string" ||
    typeof measurement?.browser?.userAgent !== "string"
  ) {
    inconclusive.push("browser name, version, and userAgent are required; recapture the artifact");
  } else if (!measurement.browser.userAgent.includes(measurement.browser.version.split(".")[0])) {
    failures.push("browser userAgent does not match the recorded browser version");
  }
  if (typeof renderer !== "string" || !renderer.trim()) {
    inconclusive.push("GPU renderer is required; recapture the artifact");
  } else if (/swiftshader|software|llvmpipe|lavapipe|basic render/i.test(renderer)) {
    failures.push(`software renderer is not representative: ${renderer}`);
  }
  if (measurement?.overlay?.visible !== true) {
    failures.push("deck overlay must have nonzero visible geometry");
  }
  if (
    !finitePositive(measurement?.overlay?.width) ||
    !finitePositive(measurement?.overlay?.height)
  ) {
    inconclusive.push("overlay width and height are required; recapture the artifact");
  }
  if (
    !Number.isFinite(measurement?.mapCanvas?.width) ||
    measurement.mapCanvas.width <= 0 ||
    !Number.isFinite(measurement?.mapCanvas?.height) ||
    measurement.mapCanvas.height <= 0
  ) {
    failures.push("MapLibre canvas dimensions must be positive");
  } else if (
    finitePositive(measurement?.overlay?.width) &&
    finitePositive(measurement?.overlay?.height) &&
    (Math.abs(measurement.overlay.width - measurement.mapCanvas.width) > 2 ||
      Math.abs(measurement.overlay.height - measurement.mapCanvas.height) > 2)
  ) {
    failures.push("overlay geometry must match MapLibre canvas geometry within 2 px");
  }
  if (!Number.isFinite(sample?.frameCount) || sample.frameCount < 1) {
    failures.push("frame count must be positive");
  }
  if (
    !Number.isFinite(sample?.durationMs) ||
    sample.durationMs < thresholds.minimumDurationMs
  ) {
    failures.push(`measurement duration must be at least ${thresholds.minimumDurationMs} ms`);
  }
  if (!Number.isFinite(sample?.fps) || sample.fps < thresholds.minimumFps) {
    failures.push(`measured FPS must be at least ${thresholds.minimumFps}`);
  }
  if (
    Number.isFinite(sample?.frameCount) &&
    Number.isFinite(sample?.durationMs) &&
    Number.isFinite(sample?.fps)
  ) {
    const expectedFps = sample.frameCount / (sample.durationMs / 1000);
    if (Math.abs(expectedFps - sample.fps) > fpsTolerance) {
      failures.push(
        `frameCount/duration/fps are inconsistent: expected ${expectedFps.toFixed(2)} FPS`,
      );
    }
  }
  if (
    !Number.isFinite(sample?.frameTimeP95Ms) ||
    !Number.isFinite(sample?.frameTimeMaxMs)
  ) {
    failures.push("p95 and maximum frame times are required");
  }
  if (
    !isObject(measurement?.frameEvidence) ||
    measurement.frameEvidence.kind !== "summary" ||
    measurement.frameEvidence.sampleCount !== sample?.frameCount
  ) {
    inconclusive.push(
      "summarized frame evidence with sampleCount matching frameCount is required; recapture the artifact",
    );
  }
  if (isObject(context.evidenceHashes) && Object.keys(context.evidenceHashes).length > 0) {
    if (!isObject(measurement?.evidenceHashes)) {
      inconclusive.push(
        "evidenceHashes are required for available screenshots or demo files; recapture or bind the artifact",
      );
    } else {
      for (const [path, expectedHash] of Object.entries(context.evidenceHashes)) {
        const actualHash = measurement.evidenceHashes[path];
        if (!actualHash) {
          inconclusive.push(`${path} hash is missing; recapture or bind the artifact`);
        } else if (actualHash !== expectedHash) {
          failures.push(`${path} hash mismatch`);
        }
      }
    }
  }

  const status =
    failures.length > 0
      ? "fail"
      : inconclusive.length > 0
        ? "inconclusive"
        : "pass";

  return makeResult(
    "performance.real-gpu-laptop",
    status,
    status === "pass"
      ? `Representative laptop real-GPU measurement passed at ${sample.fps.toFixed(2)} FPS over ${sample.durationMs.toFixed(2)} ms.`
      : status === "fail"
        ? `Representative laptop real-GPU measurement failed: ${failures.join("; ")}`
        : `Representative laptop real-GPU measurement inconclusive: ${inconclusive.join("; ")}`,
    { measurement, thresholds, context, failures, inconclusive },
  );
}

export function evaluateLicenseName(name, policy) {
  const normalized = name.trim();
  if (
    normalized.length === 0 ||
    /unknown|custom|source-specific|dataset-specific|restricted/i.test(normalized)
  ) {
    return "fail";
  }
  if (policy.allow.includes(normalized)) {
    return "pass";
  }
  if (policy.review.includes(normalized)) {
    return "inconclusive";
  }
  const terms = normalized
    .replaceAll(/[()]/g, "")
    .split(/\s+(?:AND|OR)\s+/)
    .map((term) => term.trim());
  if (terms.length > 1 && terms.every((term) => policy.allow.includes(term))) {
    return "pass";
  }
  if (
    terms.length > 1 &&
    terms.every((term) => policy.allow.includes(term) || policy.review.includes(term))
  ) {
    return "inconclusive";
  }
  return "fail";
}

export function classifyPackageLicenses(packages, policy) {
  const classified = { allowed: [], review: [], denied: [] };
  for (const pkg of packages) {
    const status = evaluateLicenseName(pkg.license, policy);
    if (status === "pass") {
      classified.allowed.push(pkg);
    } else if (status === "inconclusive") {
      classified.review.push(pkg);
    } else {
      classified.denied.push(pkg);
    }
  }
  return classified;
}

function ecosystemPackageKey(pkg) {
  return `${pkg.ecosystem ?? "node"}:${pkg.name}@${pkg.version}:${pkg.license}`;
}

export function evaluatePythonLicenseInventory(
  lockedPackages,
  recordedPackages,
  policy,
) {
  const failures = [];
  const review = [];
  const allowed = [];
  const recordedKeys = new Set(recordedPackages.map(ecosystemPackageKey));
  const lockedKeys = new Set(lockedPackages.map(ecosystemPackageKey));

  for (const pkg of lockedPackages) {
    const key = ecosystemPackageKey(pkg);
    if (!recordedKeys.has(key)) {
      failures.push(`${key}: missing environment metadata`);
    }
  }
  for (const pkg of recordedPackages) {
    const key = ecosystemPackageKey(pkg);
    if (!lockedKeys.has(key)) {
      failures.push(`${key}: not present in the lockfile`);
      continue;
    }
    const status = evaluateLicenseName(pkg.license, policy);
    if (status === "pass") {
      allowed.push(key);
    } else if (status === "inconclusive") {
      review.push(key);
    } else {
      failures.push(`${key}: disallowed or unknown license`);
    }
  }
  return { failures, review, allowed };
}

export function ensureEvaluationOutputDirectories(root) {
  for (const path of [
    "evaluations/artifacts",
    "evaluations/artifacts/playwright",
    "evaluations/artifacts/python",
  ]) {
    mkdirSync(resolve(root, path), { recursive: true });
  }
}

function packageKey(pkg) {
  return `${pkg.name}@${pkg.version}:${pkg.license}`;
}

function comparePackages(left, right) {
  const leftKey = packageKey(left);
  const rightKey = packageKey(right);
  return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
}

function isHttpsUrl(value) {
  return typeof value === "string" && /^https:\/\/\S+$/.test(value);
}

export function applyApprovedDispositions(packages, approvals) {
  const approvalByKey = new Map(approvals.map((approval) => [packageKey(approval), approval]));
  return packages.map((pkg) => {
    const approval = approvalByKey.get(packageKey(pkg));
    return approval
      ? {
          ...pkg,
          ...approval,
          metadataEvidence: pkg.metadataEvidence,
        }
      : pkg;
  });
}

export function evaluateLicenseDispositions(reviewedPackages, manifest, policy) {
  const failures = [];
  if (
    typeof manifest?.legalDisclaimer !== "string" ||
    !/not legal advice/i.test(manifest.legalDisclaimer)
  ) {
    failures.push("third-party manifest: legal disclaimer must state that it is not legal advice");
  }
  const dispositions = Array.isArray(manifest?.packages) ? manifest.packages : [];
  const reviewedKeys = new Set(reviewedPackages.map(packageKey));
  const dispositionKeys = new Set();

  for (const pkg of dispositions) {
    const key = packageKey(pkg);
    if (dispositionKeys.has(key)) {
      failures.push(`${key}: duplicate disposition`);
      continue;
    }
    dispositionKeys.add(key);
    if (!reviewedKeys.has(key)) {
      failures.push(`${key}: disposition is not for a reviewed package`);
      continue;
    }
    if (pkg.disposition !== "approved") {
      failures.push(`${key}: disposition must be approved`);
    }
    for (const field of ["attribution", "packageUrl", "sourceUrl", "licenseUrl"]) {
      const value = pkg[field];
      const missing =
        field === "attribution"
          ? typeof value !== "string" || value.trim() === ""
          : !isHttpsUrl(value);
      if (missing) {
        failures.push(`${key}: missing ${field}`);
      }
    }
    const licensePolicy = policy[pkg.license];
    if (!licensePolicy) {
      failures.push(`${key}: license has no approved disposition policy`);
      continue;
    }
    const obligations = new Set(
      Array.isArray(pkg.obligations) ? pkg.obligations : [],
    );
    for (const obligation of licensePolicy.requiredObligations) {
      if (!obligations.has(obligation)) {
        failures.push(`${key}: missing obligation ${obligation}`);
      }
    }
    if (
      licensePolicy.requiredModificationStatus &&
      pkg.modificationStatus !== licensePolicy.requiredModificationStatus
    ) {
      failures.push(
        `${key}: modificationStatus must be ${licensePolicy.requiredModificationStatus}`,
      );
    }
    if (
      licensePolicy.requiredModificationStatus === "unmodified" &&
      (!Array.isArray(pkg.modifiedFiles) || pkg.modifiedFiles.length !== 0)
    ) {
      failures.push(`${key}: modifiedFiles must be empty`);
    }
  }

  for (const pkg of reviewedPackages) {
    const key = packageKey(pkg);
    if (!dispositionKeys.has(key)) {
      failures.push(`${key}: missing approved disposition`);
    }
  }
  return failures;
}

function obligationLabel(obligation) {
  return obligation
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function renderThirdPartyNotices(manifest) {
  const packages = [...(manifest.packages ?? [])].sort(comparePackages);
  const lines = [
    "# Third-Party Notices",
    "",
    manifest.legalDisclaimer,
    "",
    `Distribution scope: ${manifest.distributionScope}`,
    "",
    "The packages below are distributed unmodified under their stated licenses. This notice does",
    "not replace or alter those license terms.",
    "",
  ];
  for (const pkg of packages) {
    const ecosystem = pkg.ecosystem ?? "node";
    lines.push(
      `## [${ecosystem}] ${pkg.name} ${pkg.version}`,
      "",
      `- License: [${pkg.license}](${pkg.licenseUrl})`,
      `- Package: ${pkg.packageUrl}`,
      `- Source: ${pkg.sourceUrl}`,
      `- Attribution: ${pkg.attribution}`,
      `- Disposition: ${pkg.disposition}; ${pkg.modificationStatus}`,
      "- Recorded obligations:",
      ...pkg.obligations.map((obligation) => `  - ${obligationLabel(obligation)}`),
      "",
    );
  }
  return `${lines.join("\n").trimEnd()}\n`;
}

export function evaluateSourceManifest(entries, producedSourceIds = new Set()) {
  const failures = [];
  const requiredText = [
    "adapterId",
    "termsUrl",
    "sensitivity",
    "redistribution",
    "allowedUse",
  ];
  for (const entry of entries) {
    const id = entry.adapterId || "<missing-adapter-id>";
    for (const field of requiredText) {
      if (typeof entry[field] !== "string" || entry[field].trim() === "") {
        failures.push(`${id}: missing ${field}`);
      }
    }
    for (const field of ["attribution", "license"]) {
      const value = entry[field];
      const label = field === "attribution" ? value?.text : value?.name;
      if (typeof label !== "string" || label.trim() === "") {
        failures.push(`${id}: missing ${field}`);
      }
      if (typeof value?.url !== "string" || value.url.trim() === "") {
        failures.push(`${id}: missing ${field}.url`);
      }
    }
    if (
      (entry.redistribution === "prohibited" || entry.allowedUse === "prohibited") &&
      producedSourceIds.has(id)
    ) {
      failures.push(`${id}: prohibited source produced records`);
    }
  }
  return failures;
}
