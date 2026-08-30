import { describe, expect, it } from "vitest";

import {
  checkOfficialRecordAdapterHealth,
  runSyntheticFixture,
  validateOfficialRecordAdapterConfig,
  validateSourceForIngestion,
  validateSourceManifest,
  type OfficialRecordAdapterConfig,
  type SourceAdapter,
  type SourceManifest,
} from "../src/index";

const manifest = {
  protocolVersion: "1.0",
  adapterId: "synthetic-public-register",
  name: "Synthetic Public Register",
  sourceUrl: "https://example.invalid/synthetic-register",
  publisher: "Synthetic public authority",
  authority: "primary",
  directness: "direct",
  cadence: "daily",
  rateLimit: { requests: 10, perSeconds: 60 },
  attribution: { text: "Synthetic public authority" },
  license: {
    name: "Synthetic permissive license",
    url: "https://example.invalid/license",
  },
  termsUrl: "https://example.invalid/terms",
  redistribution: "republish",
  sensitivity: "public",
  shareAlike: false,
  allowedUse: "inventory",
  automation: "worker-only",
  notes: "Synthetic fixture source.",
} satisfies SourceManifest;

const adapter: SourceAdapter<string, { id: string; name: string }, { externalId: string; name: string }> =
  {
    manifest,
    fetch(fixture) {
      return fixture.payload;
    },
    parse(raw) {
      const [id, name] = raw.split("|");
      if (!id || !name) {
        throw new Error("invalid synthetic fixture");
      }
      return { id, name };
    },
    normalize(parsed) {
      return { externalId: parsed.id, name: parsed.name };
    },
  };

describe("source manifest validation", () => {
  it("accepts a complete synthetic source manifest", () => {
    expect(validateSourceManifest(manifest)).toEqual({ valid: true, issues: [] });
  });

  it("rejects unsafe or incomplete policy fields", () => {
    expect(
      validateSourceManifest({
        ...manifest,
        sourceUrl: "http://example.invalid/source",
        authority: "self-asserted" as SourceManifest["authority"],
        directness: "speculative" as SourceManifest["directness"],
        rateLimit: { requests: 0, perSeconds: 60 },
        attribution: { text: "" },
        redistribution: "unreviewed" as SourceManifest["redistribution"],
        allowedUse: "unknown" as SourceManifest["allowedUse"],
      }),
    ).toEqual({
      valid: false,
      issues: [
        "sourceUrl must use https",
        "authority is invalid",
        "directness is invalid",
        "rateLimit.requests must be a positive integer",
        "attribution.text is required",
        "redistribution is invalid",
        "allowedUse is invalid",
      ],
    });
  });

  it("rejects prohibited sources before adapter execution", () => {
    const prohibited = {
      ...manifest,
      adapterId: "peeringdb-prohibited",
      redistribution: "prohibited",
      allowedUse: "prohibited",
      automation: "none",
    } satisfies SourceManifest;

    expect(() => validateSourceForIngestion(prohibited)).toThrowError(
      "peeringdb-prohibited is prohibited for ingestion",
    );
  });

  it("enforces ODbL attribution and share-alike before ingestion", () => {
    const invalidOdbl = {
      ...manifest,
      adapterId: "osm-overpass-v1",
      attribution: { text: "Missing required attribution" },
      license: {
        name: "Open Data Commons Open Database License 1.0",
        url: "https://opendatacommons.org/licenses/odbl/1-0/",
      },
      shareAlike: false,
    } satisfies SourceManifest;

    expect(() => validateSourceForIngestion(invalidOdbl)).toThrowError(
      "osm-overpass-v1 must preserve ODbL share-alike",
    );
  });
});

describe("synthetic source fixture harness", () => {
  it("runs fetch, parse, and normalize deterministically", async () => {
    const result = await runSyntheticFixture(adapter, {
      name: "synthetic facility",
      payload: "SYN-001|Synthetic North Facility",
      expected: { externalId: "SYN-001", name: "Synthetic North Facility" },
    });

    expect(result).toEqual({
      healthy: true,
      stage: "complete",
      adapterId: "synthetic-public-register",
      protocolVersion: "1.0",
      records: [{ externalId: "SYN-001", name: "Synthetic North Facility" }],
      issue: null,
    });
  });

  it("reports the failed stage without returning partial records", async () => {
    const result = await runSyntheticFixture(adapter, {
      name: "invalid synthetic facility",
      payload: "missing-separator",
      expected: { externalId: "unused", name: "unused" },
    });

    expect(result.healthy).toBe(false);
    expect(result.stage).toBe("parse");
    expect(result.records).toEqual([]);
    expect(result.issue).toBe("invalid synthetic fixture");
  });

  it("compares expected output semantically regardless of object key order", async () => {
    const reorderedAdapter: SourceAdapter<
      string,
      string,
      { name: string; metadata: { region: string; externalId: string } }
    > = {
      manifest,
      fetch(fixture) {
        return fixture.payload;
      },
      parse(raw) {
        return raw;
      },
      normalize() {
        return {
          name: "Synthetic North Facility",
          metadata: { region: "Synthetic Region", externalId: "SYN-001" },
        };
      },
    };

    const result = await runSyntheticFixture(reorderedAdapter, {
      name: "key-order-independent synthetic facility",
      payload: "unused synthetic payload",
      expected: {
        metadata: { externalId: "SYN-001", region: "Synthetic Region" },
        name: "Synthetic North Facility",
      },
    });

    expect(result.healthy).toBe(true);
    expect(result.stage).toBe("complete");
  });
});

describe("official-record adapter configuration", () => {
  const officialConfig = {
    protocolVersion: "1.0",
    adapterId: "loudoun-landmarc-manual-v1",
    metroSlug: "northern-virginia",
    name: "Loudoun County LandMARC",
    sourceUrl: "https://www.loudoun.gov/landmarc",
    publisher: "Loudoun County, Virginia",
    mode: "manual-link-only",
    machineEndpoint: null,
    authority: "primary",
    directness: "near-direct",
    limitations: "Verified landing page only; manual review is required.",
    prohibitsInteractiveScraping: true,
  } satisfies OfficialRecordAdapterConfig;

  it("accepts a versioned manual link-only source without inventing an endpoint", () => {
    expect(validateOfficialRecordAdapterConfig(officialConfig)).toEqual({
      valid: true,
      issues: [],
    });
    expect(checkOfficialRecordAdapterHealth(officialConfig, "2026-08-29T18:00:00Z")).toEqual({
      adapterId: "loudoun-landmarc-manual-v1",
      protocolVersion: "1.0",
      checkedAt: "2026-08-29T18:00:00Z",
      healthy: true,
      stage: "manual-review-required",
      records: [],
      issue: null,
    });
  });

  it("rejects interactive scraping and endpoints on manual-only sources", () => {
    expect(
      validateOfficialRecordAdapterConfig({
        ...officialConfig,
        machineEndpoint: "https://www.loudoun.gov/unverified-api",
        prohibitsInteractiveScraping: false,
      }),
    ).toEqual({
      valid: false,
      issues: [
        "manual-link-only sources cannot declare a machineEndpoint",
        "interactive portal scraping must be prohibited",
      ],
    });
  });

  it("gates verified machine endpoints with the same fail-closed rules as Python", () => {
    const machineConfig = {
      ...officialConfig,
      adapterId: "verified-machine-fixture-v1",
      mode: "verified-machine-endpoint",
      machineEndpoint: "https://official.example.invalid/api",
      directness: "direct",
    } satisfies OfficialRecordAdapterConfig;

    expect(validateOfficialRecordAdapterConfig(machineConfig)).toEqual({
      valid: true,
      issues: [],
    });
    expect(checkOfficialRecordAdapterHealth(machineConfig, "2026-08-29T18:00:00Z")).toMatchObject({
      healthy: false,
      stage: "fixture-required",
      issue: "Verified machine endpoint adapters require an offline fixture before use.",
    });
    expect(
      validateOfficialRecordAdapterConfig({ ...machineConfig, machineEndpoint: null }),
    ).toEqual({
      valid: false,
      issues: ["verified-machine-endpoint sources require an HTTPS machineEndpoint"],
    });
    expect(
      validateOfficialRecordAdapterConfig({
        ...machineConfig,
        machineEndpoint: "http://official.example.invalid/api",
      }),
    ).toEqual({
      valid: false,
      issues: ["verified-machine-endpoint sources require an HTTPS machineEndpoint"],
    });
    expect(
      validateOfficialRecordAdapterConfig({
        ...machineConfig,
        authority: "self-asserted" as OfficialRecordAdapterConfig["authority"],
        directness: "speculative" as OfficialRecordAdapterConfig["directness"],
      }),
    ).toEqual({
      valid: false,
      issues: ["authority is invalid", "directness is invalid"],
    });
    expect(
      validateOfficialRecordAdapterConfig({
        ...machineConfig,
        mode: "fixture-only" as OfficialRecordAdapterConfig["mode"],
      }),
    ).toEqual({
      valid: false,
      issues: ["mode is invalid"],
    });
    expect(
      validateOfficialRecordAdapterConfig({
        ...machineConfig,
        machineEndpoint: 42 as unknown as string,
      }),
    ).toEqual({
      valid: false,
      issues: ["machineEndpoint must be a string or null"],
    });
  });
});
