import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  applyApprovedDispositions,
  ensureEvaluationOutputDirectories,
  evaluateLicenseDispositions,
  evaluateLicenseName,
  evaluatePythonLicenseInventory,
  evaluateSourceManifest,
  makeConfiguredLocalScanResult,
  makeResult,
  renderThirdPartyNotices,
  summarizeResults,
} from "./core.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const ARTIFACTS = join(HERE, "artifacts");
ensureEvaluationOutputDirectories(ROOT);
const config = readJson(join(HERE, "gate.config.json"));

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function resultFromFailures(id, failures, evidence = {}) {
  return makeResult(
    id,
    failures.length === 0 ? "pass" : "fail",
    failures.length === 0 ? "All measured assertions passed." : failures.join("; "),
    evidence,
  );
}

function finiteTimestamp(value) {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function validateDeepMetroCorpus() {
  const corpus = readJson(join(ROOT, "data/corpus/deep-metro-reviewed-beta.json"));
  const failures = [];
  const expectedMetros = [
    "northern-virginia",
    "dallas-fort-worth",
    "phoenix",
    "toronto",
  ];
  const counts = Object.fromEntries(expectedMetros.map((metro) => [metro, 0]));
  let citationCount = 0;
  let eventCount = 0;
  let activationCount = 0;
  let correctionCount = 0;
  let conflictCount = 0;

  if (corpus.corpusMode !== "synthetic-reviewed-beta") {
    failures.push("corpus mode is not synthetic-reviewed-beta");
  }
  for (const timeline of corpus.timelines ?? []) {
    counts[timeline.metro?.slug] = (counts[timeline.metro?.slug] ?? 0) + 1;
    const warningFields = [
      timeline,
      timeline.review,
      ...(timeline.events ?? []),
      ...(timeline.evidencePackets ?? []),
      ...(timeline.evidencePackets ?? []).flatMap((packet) => packet.citations ?? []),
      ...(timeline.evidencePackets ?? []).flatMap((packet) => packet.signals ?? []),
    ];
    if (
      warningFields.some(
        (item) =>
          !item ||
          item.synthetic !== true ||
          item.publicFactApproved !== false ||
          item.corpusMode !== "synthetic-reviewed-beta" ||
          !String(item.warning ?? "").includes("NOT PUBLIC FACTUAL DATA"),
      )
    ) {
      failures.push(`${timeline.timelineId}: incomplete synthetic/public-fact labeling`);
    }
    const review = timeline.review;
    if (
      !review ||
      review.reviewer?.reviewerId === timeline.authorId ||
      review.independence?.isIndependent !== true ||
      review.independence?.separateValidatorPath !== true ||
      review.status !== "approved_synthetic" ||
      review.decision !== "approve_synthetic_fixture" ||
      review.checklistResults?.some((check) => check.passed !== true)
    ) {
      failures.push(`${timeline.timelineId}: independent review is incomplete`);
    }
    const eventIndex = new Map(
      (timeline.events ?? []).map((event, index) => [event.eventId, index]),
    );
    const packets = new Map(
      (timeline.evidencePackets ?? []).map((packet) => [packet.packetId, packet]),
    );
    conflictCount += timeline.conflicts?.length ?? 0;
    for (const event of timeline.events ?? []) {
      eventCount += 1;
      const packet = packets.get(event.evidencePacketId);
      if (
        !finiteTimestamp(event.validFrom) ||
        !finiteTimestamp(event.assertedAt) ||
        !finiteTimestamp(event.sourcePublishedAt) ||
        !finiteTimestamp(event.retrievedAt) ||
        !packet ||
        !Array.isArray(event.exactEvidenceReferences) ||
        event.exactEvidenceReferences.length === 0
      ) {
        failures.push(`${event.eventId}: timestamps or evidence linkage incomplete`);
      }
      if (event.eventType === "activation") {
        activationCount += 1;
        const signals = packet?.signals ?? [];
        const independent = new Set(signals.map((signal) => signal.independenceGroup));
        if (
          independent.size < 2 ||
          !signals.some((signal) => signal.authoritative === true) ||
          !signals.some((signal) => signal.signalKind !== "imagery")
        ) {
          failures.push(`${event.eventId}: activation rule failed`);
        }
      }
      if (event.eventType === "correction") {
        correctionCount += 1;
        const targetIndex = eventIndex.get(event.correctsEventId);
        const currentIndex = eventIndex.get(event.eventId);
        if (
          targetIndex === undefined ||
          currentIndex === undefined ||
          targetIndex >= currentIndex
        ) {
          failures.push(`${event.eventId}: correction lineage is invalid`);
        }
      }
    }
    for (const packet of timeline.evidencePackets ?? []) {
      for (const citation of packet.citations ?? []) {
        citationCount += 1;
        if (
          !citation.exactReference ||
          !finiteTimestamp(citation.sourcePublishedAt) ||
          !finiteTimestamp(citation.retrievedAt)
        ) {
          failures.push(`${citation.citationId}: citation metadata incomplete`);
        }
      }
      for (const signal of packet.signals ?? []) {
        if (
          !signal.authority ||
          !signal.directness ||
          typeof signal.entityMatchConfidence !== "number" ||
          signal.entityMatchConfidence < 0 ||
          signal.entityMatchConfidence > 1
        ) {
          failures.push(`${signal.signalId}: source confidence incomplete`);
        }
      }
    }
  }
  for (const metro of expectedMetros) {
    if (counts[metro] !== 25) {
      failures.push(`${metro}: expected 25 timelines, found ${counts[metro] ?? 0}`);
    }
  }
  if (eventCount === 0 || citationCount === 0 || activationCount === 0 || correctionCount === 0) {
    failures.push("required event/citation scenarios were not exercised");
  }
  if (conflictCount === 0 || !(corpus.timelines ?? []).some((item) => item.missing?.length > 0)) {
    failures.push("conflict or explicit absence scenarios were not exercised");
  }
  return resultFromFailures("data.deep-metro", failures, {
    timelines: corpus.timelines?.length ?? 0,
    timelinesByMetro: counts,
    events: eventCount,
    citations: citationCount,
    activations: activationCount,
    corrections: correctionCount,
    conflicts: conflictCount,
  });
}

function increment(map, key) {
  map[key] = (map[key] ?? 0) + 1;
}

function stable(value) {
  if (Array.isArray(value)) {
    return value.map(stable);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, stable(item)]),
    );
  }
  return value;
}

function validateInventoryAndCoverage() {
  const inventory = readJson(join(ROOT, "data/odbl/north-america-facilities.json"));
  const coverage = readJson(join(ROOT, "data/reports/north-america-coverage.json"));
  const failures = [];
  const byCountry = {};
  const byGeometryType = {};
  const byFacilityType = {};
  const bySource = {};
  const missing = { capacityMw: 0, lifecycleState: 0, name: 0, operator: 0 };
  for (const record of inventory.records ?? []) {
    increment(byCountry, record.site.countryCode);
    increment(byGeometryType, record.site.geometryType);
    increment(byFacilityType, record.facility.facilityType);
    for (const citation of record.citations ?? []) {
      increment(bySource, citation.sourceId);
    }
    if (
      record.site.coordinatePrecision !== "generalized-0.01-degree" ||
      record.site.exactGeometryRestricted !== true ||
      Number(record.site.displayLatitude.toFixed(2)) !== record.site.displayLatitude ||
      Number(record.site.displayLongitude.toFixed(2)) !== record.site.displayLongitude
    ) {
      failures.push(`${record.facility.id}: coordinate precision policy failed`);
    }
    for (const field of Object.keys(missing)) {
      const value =
        field === "capacityMw" || field === "lifecycleState"
          ? record.facility[field]
          : record.facility[field];
      const absent = value === null || value === "" || value === "unknown";
      if (absent) {
        missing[field] += 1;
        if (!record.facility.missing?.includes(field)) {
          failures.push(`${record.facility.id}: ${field} absence is not explicit`);
        }
      }
    }
  }
  const comparisons = [
    ["recordCount", inventory.records?.length ?? 0, coverage.recordCount],
    ["conflictCount", inventory.conflicts?.length ?? 0, coverage.conflictCount],
    ["byCountry", byCountry, coverage.byCountry],
    ["byGeometryType", byGeometryType, coverage.byGeometryType],
    ["byFacilityType", byFacilityType, coverage.byFacilityType],
    ["bySource", bySource, coverage.bySource],
    ["missingCriticalFields", missing, coverage.missingCriticalFields],
  ];
  for (const [label, measured, reported] of comparisons) {
    if (JSON.stringify(stable(measured)) !== JSON.stringify(stable(reported))) {
      failures.push(`${label}: coverage report is inconsistent`);
    }
  }
  const facilityIds = new Set((inventory.records ?? []).map((record) => record.facility.id));
  for (const conflict of inventory.conflicts ?? []) {
    if (
      conflict.status !== "unresolved" ||
      conflict.facilityIds?.length < 2 ||
      conflict.facilityIds.some((id) => !facilityIds.has(id))
    ) {
      failures.push(`${conflict.id}: conflict references are inconsistent`);
    }
  }
  return resultFromFailures("data.inventory-coverage", failures, {
    records: inventory.records?.length ?? 0,
    conflicts: inventory.conflicts?.length ?? 0,
    synthetic: inventory.metadata?.synthetic,
    notComplete: coverage.notComplete,
  });
}

function validateSourcesAndLicenses() {
  const manifestPaths = [
    "sources/manifests/north-america-public-sources.json",
    "sources/manifests/deep-metro-official-sources.json",
  ];
  const manifests = manifestPaths.flatMap((path) => readJson(join(ROOT, path)));
  const inventory = readJson(join(ROOT, "data/odbl/north-america-facilities.json"));
  const producedSourceIds = new Set(
    (inventory.records ?? []).flatMap((record) =>
      (record.citations ?? []).map((citation) => citation.sourceId),
    ),
  );
  const manifestFailures = evaluateSourceManifest(manifests, producedSourceIds);
  const inventoryText = readFileSync(
    join(ROOT, "data/odbl/north-america-facilities.json"),
    "utf8",
  );
  const odblNotice = readFileSync(join(ROOT, "data/odbl/README.md"), "utf8");
  if (
    inventory.metadata?.license !== "ODbL-1.0" ||
    inventory.metadata?.shareAlike !== true ||
    !inventory.metadata?.attribution?.includes("OpenStreetMap contributors") ||
    !/share-alike/i.test(odblNotice) ||
    !inventoryText.includes("OpenStreetMap contributors")
  ) {
    manifestFailures.push("ODbL artifact notice, attribution, or share-alike metadata missing");
  }

  const lock = readJson(join(ROOT, "package-lock.json"));
  const repositoryLicense = readJson(join(ROOT, "package.json")).license;
  const packages = [];
  for (const [path, entry] of Object.entries(lock.packages ?? {})) {
    if (!path.includes("node_modules/")) {
      continue;
    }
    const name = path.split("node_modules/").at(-1);
    const isWorkspace = Boolean(entry.link);
    const license =
      typeof entry.license === "string"
        ? entry.license
        : isWorkspace && typeof repositoryLicense === "string"
          ? repositoryLicense
          : "UNKNOWN";
    packages.push({ name, version: entry.version ?? "UNKNOWN", license });
  }
  const failed = [];
  const reviewedPackages = [];
  for (const pkg of packages) {
    const status = evaluateLicenseName(pkg.license, config.licenses);
    if (status === "fail") {
      failed.push(`${pkg.name}@${pkg.version}:${pkg.license}`);
    } else if (status === "inconclusive") {
      reviewedPackages.push(pkg);
    }
  }
  const dispositionFailures = [];
  const pythonDispositionFailures = [];
  const noticeManifestPath = join(ROOT, "THIRD_PARTY_NOTICES.json");
  const pythonNoticeManifestPath = join(ROOT, "THIRD_PARTY_NOTICES.python.json");
  const noticePath = join(ROOT, "THIRD_PARTY_NOTICES.md");
  let dispositionManifest = null;
  let pythonDispositionManifest = null;
  if (
    !existsSync(noticeManifestPath) ||
    !existsSync(pythonNoticeManifestPath) ||
    !existsSync(noticePath)
  ) {
    dispositionFailures.push(
      "Node, Python, and human-readable third-party notices are required",
    );
  } else {
    dispositionManifest = readJson(noticeManifestPath);
    pythonDispositionManifest = readJson(pythonNoticeManifestPath);
    dispositionFailures.push(
      ...evaluateLicenseDispositions(
        reviewedPackages,
        dispositionManifest,
        config.licenses.approvedDispositions,
      ),
    );
    const reviewedPythonPackages = pythonDispositionManifest.packages.filter(
      (pkg) => evaluateLicenseName(pkg.license, config.licenses) === "inconclusive",
    );
    pythonDispositionFailures.push(
      ...evaluateLicenseDispositions(
        reviewedPythonPackages,
        {
          legalDisclaimer: dispositionManifest.legalDisclaimer,
          packages: dispositionManifest.pythonApprovedDispositions ?? [],
        },
        config.licenses.approvedDispositions,
      ),
    );
    const expectedNotice = renderThirdPartyNotices({
      ...dispositionManifest,
      packages: [
        ...dispositionManifest.packages.map((pkg) => ({
          ecosystem: "node",
          ...pkg,
        })),
        ...applyApprovedDispositions(
          pythonDispositionManifest.packages,
          dispositionManifest.pythonApprovedDispositions ?? [],
        ),
      ],
    });
    const actualNotice = readFileSync(noticePath, "utf8");
    if (actualNotice !== expectedNotice) {
      dispositionFailures.push(
        "THIRD_PARTY_NOTICES.md is stale; run npm run notices:generate",
      );
    }
  }
  const packageFailures = [...failed, ...dispositionFailures];
  const pythonInventoryCheck = spawnSync(
    "uv",
    [
      "run",
      "--project",
      "apps/worker",
      "--with",
      "colorama==0.4.6",
      "python",
      "evaluations/python_license_inventory.py",
      "--check",
      "THIRD_PARTY_NOTICES.python.json",
    ],
    { cwd: ROOT, encoding: "utf8" },
  );
  const pythonPackages = pythonDispositionManifest?.packages ?? [];
  const pythonEvaluation = evaluatePythonLicenseInventory(
    pythonPackages,
    pythonPackages,
    config.licenses,
  );
  pythonEvaluation.failures.push(...pythonDispositionFailures);
  if (pythonInventoryCheck.status !== 0) {
    pythonEvaluation.failures.push(
      `Python lock/environment inventory is stale: ${pythonInventoryCheck.stderr.trim()}`,
    );
  }
  for (const pkg of pythonPackages) {
    const status = evaluateLicenseName(pkg.license, config.licenses);
    const expectedDisposition =
      status === "pass"
        ? "allowed-policy"
        : status === "inconclusive"
          ? "review-required"
          : "denied";
    if (pkg.disposition !== expectedDisposition) {
      pythonEvaluation.failures.push(
        `python:${pkg.name}@${pkg.version}:${pkg.license}: disposition must be ${expectedDisposition}`,
      );
    }
    for (const field of ["attribution", "packageUrl", "sourceUrl", "licenseUrl"]) {
      if (typeof pkg[field] !== "string" || !pkg[field].trim()) {
        pythonEvaluation.failures.push(
          `python:${pkg.name}@${pkg.version}:${pkg.license}: missing ${field}`,
        );
      }
    }
  }
  const approvedPythonKeys = new Set(
    (dispositionManifest?.pythonApprovedDispositions ?? []).map(
      (pkg) => `python:${pkg.name}@${pkg.version}:${pkg.license}`,
    ),
  );
  pythonEvaluation.review = pythonEvaluation.review.filter(
    (key) => !approvedPythonKeys.has(key),
  );
  const pythonStatus =
    pythonEvaluation.failures.length > 0
      ? "fail"
      : pythonEvaluation.review.length > 0
        ? "inconclusive"
        : "pass";
  return [
    resultFromFailures("license.source-manifests", manifestFailures, {
      manifests: manifests.length,
      producedSourceIds: [...producedSourceIds].sort(),
    }),
    makeResult(
      "license.packages",
      packageFailures.length > 0 ? "fail" : "pass",
      packageFailures.length > 0
        ? `Package license disposition failed: ${packageFailures.join(", ")}`
        : "Every installed Node package is allowed or has an explicit approved disposition and current notice.",
      {
        packages: packages.sort((left, right) => left.name.localeCompare(right.name)),
        reviewedPackages,
        approvedDispositionCount: dispositionManifest?.packages?.length ?? 0,
        notice: "THIRD_PARTY_NOTICES.md",
      },
    ),
    makeResult(
      "license.python-packages",
      pythonStatus,
      pythonStatus === "fail"
        ? `Python package license inventory failed closed: ${pythonEvaluation.failures.join(", ")}`
        : pythonStatus === "inconclusive"
          ? `Python package licenses are fully enumerated, but explicit review remains required for: ${pythonEvaluation.review.join(", ")}`
          : "Every locked Python package is installed, enumerated, and allowed by policy or an exact approved disposition.",
      {
        packages: pythonPackages,
        allowed: pythonEvaluation.allowed,
        approved: [...approvedPythonKeys].sort(),
        review: pythonEvaluation.review,
        inventory: "THIRD_PARTY_NOTICES.python.json",
      },
    ),
  ];
}

function walkFiles(directory) {
  const files = [];
  for (const entry of readdirSync(directory)) {
    if ([".git", ".next", ".local", "node_modules", "evaluations"].includes(entry)) {
      continue;
    }
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) {
      files.push(...walkFiles(path));
    } else {
      files.push(path);
    }
  }
  return files;
}

function securityScans() {
  const files = walkFiles(ROOT).filter(
    (path) =>
      !path.endsWith("package-lock.json") &&
      !path.endsWith("uv.lock") &&
      !/\/sources\/fixtures\//.test(path),
  );
  const secretPatterns = [
    ["private-key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
    ["aws-access-key", /\bAKIA[0-9A-Z]{16}\b/],
    ["github-token", /\bgh[opsu]_[A-Za-z0-9]{36,255}\b/],
    ["openai-key", /\bsk-[A-Za-z0-9_-]{32,}\b/],
    ["jwt", /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/],
  ];
  const secretFindings = [];
  for (const path of files) {
    if (/\.env(?:\.|$)/.test(path) || !/\.(?:json|md|py|ts|tsx|js|mjs|sql|ya?ml)$/.test(path)) {
      continue;
    }
    const text = readFileSync(path, "utf8");
    for (const [kind, pattern] of secretPatterns) {
      if (pattern.test(text)) {
        secretFindings.push(`${relative(ROOT, path)}:${kind}`);
      }
    }
  }

  const routeFiles = walkFiles(join(ROOT, "apps/web/src/app")).filter((path) =>
    path.endsWith("route.ts"),
  );
  const thirdPartyCalls = [];
  const unsafeCode = [];
  const pathTraversal = [];
  for (const path of walkFiles(join(ROOT, "apps/web/src"))) {
    if (!/\.(?:ts|tsx)$/.test(path)) {
      continue;
    }
    const text = readFileSync(path, "utf8");
    const short = relative(ROOT, path);
    if (
      routeFiles.includes(path) &&
      (/\bfetch\s*\(/.test(text) || /\bhttps?:\/\//.test(text) || /\baxios\b/.test(text))
    ) {
      thirdPartyCalls.push(short);
    }
    if (/dangerouslySetInnerHTML|\beval\s*\(|new Function\s*\(/.test(text)) {
      unsafeCode.push(short);
    }
    if (
      routeFiles.includes(path) &&
      /(?:readFile|writeFile|createReadStream|createWriteStream).*(?:params|searchParams)/s.test(
        text,
      )
    ) {
      pathTraversal.push(short);
    }
  }
  const apiText = routeFiles.map((path) => readFileSync(path, "utf8")).join("\n");
  const unboundedRoutes = routeFiles
    .filter((path) => {
      const text = readFileSync(path, "utf8");
      return /\.(?:list|search)\w*\(/.test(text) && !/parseLimit\(/.test(text);
    })
    .map((path) => relative(ROOT, path));
  const correctionText = readFileSync(
    join(ROOT, "apps/web/src/app/components/correction-builder.tsx"),
    "utf8",
  );

  return [
    makeConfiguredLocalScanResult("security.secret-scan", secretFindings, {
      scannedFiles: files.length,
    }),
    makeConfiguredLocalScanResult("security.request-path-network", thirdPartyCalls, {
      routeFiles: routeFiles.length,
    }),
    makeConfiguredLocalScanResult("security.unsafe-code", [
      ...unsafeCode,
      ...pathTraversal,
    ]),
    resultFromFailures("misuse.api-bounds", unboundedRoutes, {
      parseLimitReferences: apiText.match(/parseLimit\(/g)?.length ?? 0,
    }),
    resultFromFailures(
      "misuse.correction-external-mutation",
      /\bfetch\s*\(|XMLHttpRequest|navigator\.sendBeacon/.test(correctionText)
        ? ["correction builder can mutate an external endpoint"]
        : [],
    ),
  ];
}

function validateGeneratedArtifacts() {
  const required = [
    "data/corpus/deep-metro-reviewed-beta.json",
    "data/odbl/north-america-facilities.json",
    "data/reports/north-america-coverage.json",
  ];
  const hashes = {};
  const failures = [];
  for (const path of required) {
    const absolute = join(ROOT, path);
    if (!existsSync(absolute)) {
      failures.push(`${path}: missing`);
      continue;
    }
    hashes[path] = createHash("sha256").update(readFileSync(absolute)).digest("hex");
  }
  return resultFromFailures("data.checked-in-artifacts", failures, { sha256: hashes });
}

const results = [
  validateGeneratedArtifacts(),
  validateDeepMetroCorpus(),
  validateInventoryAndCoverage(),
  ...validateSourcesAndLicenses(),
  ...securityScans(),
];
const report = {
  schemaVersion: "1.0.0",
  generatedAt: new Date().toISOString(),
  summary: summarizeResults(results),
  results,
};
writeFileSync(join(ARTIFACTS, "static-gates.json"), `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(report.summary)}\n`);
process.exitCode = report.summary.decision === "fail" ? 1 : 0;
