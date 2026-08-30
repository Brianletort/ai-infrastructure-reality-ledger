export const SOURCE_SDK_PACKAGE = "@reality-ledger/source-sdk";

export type SourceAuthority =
  | "primary"
  | "authoritative-secondary"
  | "secondary"
  | "aggregator"
  | "unknown";
export type SourceDirectness = "direct" | "near-direct" | "indirect" | "unknown";
export type RedistributionClass = "republish" | "derived-only" | "link-only" | "prohibited";
export type AllowedUse = "inventory" | "context-only" | "prohibited";
export type SourceAutomation = "worker-only" | "manual-import" | "none";

export interface SourceManifest {
  protocolVersion: string;
  adapterId: string;
  name: string;
  sourceUrl: string;
  publisher: string;
  authority: SourceAuthority;
  directness: SourceDirectness;
  cadence: string;
  rateLimit: {
    requests: number;
    perSeconds: number;
  };
  attribution: {
    text: string;
    url?: string;
  };
  license: {
    name: string;
    url: string;
  };
  termsUrl: string;
  redistribution: RedistributionClass;
  sensitivity: string;
  shareAlike: boolean;
  allowedUse: AllowedUse;
  automation: SourceAutomation;
  notes: string;
}

export interface ManifestValidation {
  valid: boolean;
  issues: string[];
}

const REDISTRIBUTION_CLASSES: readonly string[] = [
  "republish",
  "derived-only",
  "link-only",
  "prohibited",
];
const SOURCE_AUTHORITIES: readonly string[] = [
  "primary",
  "authoritative-secondary",
  "secondary",
  "aggregator",
  "unknown",
];
const SOURCE_DIRECTNESS_VALUES: readonly string[] = [
  "direct",
  "near-direct",
  "indirect",
  "unknown",
];
const ALLOWED_USES: readonly string[] = ["inventory", "context-only", "prohibited"];
const AUTOMATION_VALUES: readonly string[] = ["worker-only", "manual-import", "none"];

export function validateSourceManifest(manifest: SourceManifest): ManifestValidation {
  const issues: string[] = [];
  if (!manifest.protocolVersion.trim()) {
    issues.push("protocolVersion is required");
  }
  if (!manifest.adapterId.trim()) {
    issues.push("adapterId is required");
  }
  if (!manifest.name.trim()) {
    issues.push("name is required");
  }
  if (!manifest.publisher.trim()) {
    issues.push("publisher is required");
  }
  if (!manifest.sourceUrl.startsWith("https://")) {
    issues.push("sourceUrl must use https");
  }
  if (!SOURCE_AUTHORITIES.includes(manifest.authority)) {
    issues.push("authority is invalid");
  }
  if (!SOURCE_DIRECTNESS_VALUES.includes(manifest.directness)) {
    issues.push("directness is invalid");
  }
  if (!Number.isInteger(manifest.rateLimit.requests) || manifest.rateLimit.requests < 1) {
    issues.push("rateLimit.requests must be a positive integer");
  }
  if (!Number.isInteger(manifest.rateLimit.perSeconds) || manifest.rateLimit.perSeconds < 1) {
    issues.push("rateLimit.perSeconds must be a positive integer");
  }
  if (!manifest.attribution.text.trim()) {
    issues.push("attribution.text is required");
  }
  if (!manifest.license.name.trim()) {
    issues.push("license.name is required");
  }
  if (!manifest.license.url.startsWith("https://")) {
    issues.push("license.url must use https");
  }
  if (!manifest.termsUrl.startsWith("https://")) {
    issues.push("termsUrl must use https");
  }
  if (!REDISTRIBUTION_CLASSES.includes(manifest.redistribution)) {
    issues.push("redistribution is invalid");
  }
  if (!ALLOWED_USES.includes(manifest.allowedUse)) {
    issues.push("allowedUse is invalid");
  }
  if (!AUTOMATION_VALUES.includes(manifest.automation)) {
    issues.push("automation is invalid");
  }
  if (!manifest.cadence.trim()) {
    issues.push("cadence is required");
  }
  if (!manifest.sensitivity.trim()) {
    issues.push("sensitivity is required");
  }
  if (!manifest.notes.trim()) {
    issues.push("notes is required");
  }
  return { valid: issues.length === 0, issues };
}

export function validateSourceForIngestion(manifest: SourceManifest): void {
  const validation = validateSourceManifest(manifest);
  if (!validation.valid) {
    throw new Error(`${manifest.adapterId} has an invalid source manifest`);
  }
  if (manifest.redistribution === "prohibited" || manifest.allowedUse !== "inventory") {
    throw new Error(`${manifest.adapterId} is prohibited for ingestion`);
  }
  const normalizedLicense = manifest.license.name.toLowerCase();
  const isOdbl =
    normalizedLicense.includes("odbl") || normalizedLicense.includes("open database license");
  if (isOdbl && !manifest.shareAlike) {
    throw new Error(`${manifest.adapterId} must preserve ODbL share-alike`);
  }
  if (isOdbl && !manifest.attribution.text.toLowerCase().includes("openstreetmap")) {
    throw new Error(`${manifest.adapterId} must preserve OpenStreetMap attribution`);
  }
}

export interface SyntheticFixture<TNormalized> {
  name: string;
  payload: string;
  expected: TNormalized;
}

export interface SourceAdapter<TRaw, TParsed, TNormalized> {
  manifest: SourceManifest;
  fetch(fixture: Pick<SyntheticFixture<TNormalized>, "name" | "payload">): TRaw | Promise<TRaw>;
  parse(raw: TRaw): TParsed | Promise<TParsed>;
  normalize(parsed: TParsed): TNormalized | Promise<TNormalized>;
}

export interface FixtureHealth<TNormalized> {
  healthy: boolean;
  stage: "fetch" | "parse" | "normalize" | "validate" | "complete";
  adapterId: string;
  protocolVersion: string;
  records: TNormalized[];
  issue: string | null;
}

function semanticEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) {
    return true;
  }
  if (left instanceof Date && right instanceof Date) {
    return left.getTime() === right.getTime();
  }
  if (Array.isArray(left) && Array.isArray(right)) {
    return (
      left.length === right.length &&
      left.every((value, index) => semanticEqual(value, right[index]))
    );
  }
  if (
    left === null ||
    right === null ||
    typeof left !== "object" ||
    typeof right !== "object" ||
    Array.isArray(left) ||
    Array.isArray(right)
  ) {
    return false;
  }

  const leftRecord = left as Record<string, unknown>;
  const rightRecord = right as Record<string, unknown>;
  const leftKeys = Object.keys(leftRecord).sort();
  const rightKeys = Object.keys(rightRecord).sort();
  return (
    leftKeys.length === rightKeys.length &&
    leftKeys.every(
      (key, index) =>
        key === rightKeys[index] &&
        Object.prototype.hasOwnProperty.call(rightRecord, key) &&
        semanticEqual(leftRecord[key], rightRecord[key]),
    )
  );
}

export async function runSyntheticFixture<TRaw, TParsed, TNormalized>(
  adapter: SourceAdapter<TRaw, TParsed, TNormalized>,
  fixture: SyntheticFixture<TNormalized>,
): Promise<FixtureHealth<TNormalized>> {
  let stage: FixtureHealth<TNormalized>["stage"] = "fetch";
  try {
    const raw = await adapter.fetch({ name: fixture.name, payload: fixture.payload });
    stage = "parse";
    const parsed = await adapter.parse(raw);
    stage = "normalize";
    const normalized = await adapter.normalize(parsed);
    stage = "validate";
    if (!semanticEqual(normalized, fixture.expected)) {
      throw new Error(`fixture ${fixture.name} did not match expected normalized record`);
    }
    return {
      healthy: true,
      stage: "complete",
      adapterId: adapter.manifest.adapterId,
      protocolVersion: adapter.manifest.protocolVersion,
      records: [normalized],
      issue: null,
    };
  } catch (error) {
    return {
      healthy: false,
      stage,
      adapterId: adapter.manifest.adapterId,
      protocolVersion: adapter.manifest.protocolVersion,
      records: [],
      issue: error instanceof Error ? error.message : "unknown adapter failure",
    };
  }
}

export type OfficialRecordSourceMode = "manual-link-only" | "verified-machine-endpoint";

export interface OfficialRecordAdapterConfig {
  protocolVersion: string;
  adapterId: string;
  metroSlug: string;
  name: string;
  sourceUrl: string;
  publisher: string;
  mode: OfficialRecordSourceMode;
  machineEndpoint: string | null;
  authority: SourceAuthority;
  directness: SourceDirectness;
  limitations: string;
  prohibitsInteractiveScraping: boolean;
}

export interface OfficialRecordSourceHealth {
  adapterId: string;
  protocolVersion: string;
  checkedAt: string;
  healthy: boolean;
  stage: "validate" | "manual-review-required" | "fixture-required";
  records: unknown[];
  issue: string | null;
}

export function validateOfficialRecordAdapterConfig(
  config: OfficialRecordAdapterConfig,
): ManifestValidation {
  const issues: string[] = [];
  for (const [field, value] of [
    ["protocolVersion", config.protocolVersion],
    ["adapterId", config.adapterId],
    ["metroSlug", config.metroSlug],
    ["name", config.name],
    ["publisher", config.publisher],
    ["limitations", config.limitations],
  ] as const) {
    if (!value.trim()) {
      issues.push(`${field} is required`);
    }
  }
  if (!config.sourceUrl.startsWith("https://")) {
    issues.push("sourceUrl must use https");
  }
  if (!SOURCE_AUTHORITIES.includes(config.authority)) {
    issues.push("authority is invalid");
  }
  if (!SOURCE_DIRECTNESS_VALUES.includes(config.directness)) {
    issues.push("directness is invalid");
  }
  if (!["manual-link-only", "verified-machine-endpoint"].includes(config.mode)) {
    issues.push("mode is invalid");
  }
  const machineEndpointHasValidType =
    config.machineEndpoint === null || typeof config.machineEndpoint === "string";
  if (!machineEndpointHasValidType) {
    issues.push("machineEndpoint must be a string or null");
  } else {
    if (config.mode === "manual-link-only" && config.machineEndpoint !== null) {
      issues.push("manual-link-only sources cannot declare a machineEndpoint");
    }
    if (
      config.mode === "verified-machine-endpoint" &&
      !config.machineEndpoint?.startsWith("https://")
    ) {
      issues.push("verified-machine-endpoint sources require an HTTPS machineEndpoint");
    }
  }
  if (!config.prohibitsInteractiveScraping) {
    issues.push("interactive portal scraping must be prohibited");
  }
  return { valid: issues.length === 0, issues };
}

export function checkOfficialRecordAdapterHealth(
  config: OfficialRecordAdapterConfig,
  checkedAt: string,
): OfficialRecordSourceHealth {
  const validation = validateOfficialRecordAdapterConfig(config);
  if (!validation.valid) {
    return {
      adapterId: config.adapterId,
      protocolVersion: config.protocolVersion,
      checkedAt,
      healthy: false,
      stage: "validate",
      records: [],
      issue: validation.issues.join("; "),
    };
  }
  if (config.mode === "manual-link-only") {
    return {
      adapterId: config.adapterId,
      protocolVersion: config.protocolVersion,
      checkedAt,
      healthy: true,
      stage: "manual-review-required",
      records: [],
      issue: null,
    };
  }
  return {
    adapterId: config.adapterId,
    protocolVersion: config.protocolVersion,
    checkedAt,
    healthy: false,
    stage: "fixture-required",
    records: [],
    issue: "Verified machine endpoint adapters require an offline fixture before use.",
  };
}
