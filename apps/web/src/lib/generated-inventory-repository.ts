import { readFileSync } from "node:fs";
import { resolve, sep } from "node:path";

import type {
  PublicInventoryCitation,
  PublicInventoryFacility,
  PublicInventoryRecord,
  PublicInventorySite,
} from "../../../../packages/domain/src/index";
import type { SourceManifestRecord } from "./ledger-repository";

export interface InventoryArtifactCitation extends PublicInventoryCitation {
  sourceRecordId: string;
}

export interface InventoryArtifactRecord {
  facility: PublicInventoryFacility;
  site: PublicInventorySite;
  sourceRecordIds: string[];
  sourceTags: Record<string, string>;
  citations: InventoryArtifactCitation[];
}

export const PUBLIC_INVENTORY_CORPUS_MODE = "synthetic-reviewed-beta" as const;
export const PUBLIC_INVENTORY_WARNING =
  "SYNTHETIC REVIEWED BETA CORPUS — NOT PUBLIC FACTUAL DATA. Do not use these records as evidence of real facilities or events.";

export interface PublicInventoryMetadata {
  datasetTimestamp: string;
  sourceTimestamp: string;
  queryVersion: string;
  recordCount: number;
  synthetic: boolean;
  notComplete: true;
  license: "ODbL-1.0";
  attribution: string;
  shareAlike: true;
  limitations: string[];
}

export interface PublicInventoryDataset {
  metadata: PublicInventoryMetadata;
  records: InventoryArtifactRecord[];
  conflicts: Array<{
    id: string;
    reason: string;
    sourceRecordIds: string[];
    facilityIds: string[];
    status: "unresolved";
  }>;
  aliasGroups: string[][];
}

export interface PublicCoverageReport {
  datasetTimestamp: string;
  sourceTimestamp: string;
  queryVersion: string;
  recordCount: number;
  synthetic: boolean;
  notComplete: true;
  byCountry: Record<string, number>;
  byMacroRegion: Record<string, number>;
  byMetro: Record<string, number>;
  providerOperatorKnownness: Record<string, number>;
  byGeometryType: Record<string, number>;
  byFacilityType: Record<string, number>;
  bySource: Record<string, number>;
  conflictCount: number;
  conflictsByReason: Record<string, number>;
  missingCriticalFields: Record<string, number>;
  deepMetros: Record<
    string,
    {
      recordCount: number;
      conflictCount: number;
      operatorKnownCount: number;
      missingCriticalFieldCount: number;
    }
  >;
  limitations: string[];
}

interface InventoryFilters {
  country: "US" | "CA" | "MX" | null;
  metro: string | null;
  limit: number;
}

function repositoryRoot(): string {
  const current = process.cwd();
  const workspaceSuffix = `${sep}apps${sep}web`;
  return current.endsWith(workspaceSuffix) ? resolve(current, "..", "..") : current;
}

function readJson(relativePath: string): unknown {
  return JSON.parse(readFileSync(resolve(repositoryRoot(), relativePath), "utf8")) as unknown;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function loadInventory(): PublicInventoryDataset {
  const raw = readJson("data/odbl/north-america-facilities.json");
  if (!isObject(raw) || !isObject(raw.metadata) || !Array.isArray(raw.records)) {
    throw new Error("generated inventory artifact is invalid");
  }
  if (
    raw.metadata.notComplete !== true ||
    raw.metadata.license !== "ODbL-1.0" ||
    raw.metadata.shareAlike !== true
  ) {
    throw new Error("generated inventory is missing ODbL compliance metadata");
  }
  return raw as unknown as PublicInventoryDataset;
}

function loadCoverage(): PublicCoverageReport {
  const raw = readJson("data/reports/north-america-coverage.json");
  if (!isObject(raw) || raw.notComplete !== true || typeof raw.recordCount !== "number") {
    throw new Error("generated coverage artifact is invalid");
  }
  return raw as unknown as PublicCoverageReport;
}

function loadSourceManifests(): SourceManifestRecord[] {
  const raw = readJson("sources/manifests/north-america-public-sources.json");
  if (!Array.isArray(raw)) {
    throw new Error("source manifest registry must be an array");
  }
  return raw.map((entry) => {
    if (!isObject(entry) || typeof entry.adapterId !== "string") {
      throw new Error("source manifest registry entry is invalid");
    }
    return {
      ...(entry as unknown as Omit<SourceManifestRecord, "lastRetrievedAt" | "missing">),
      lastRetrievedAt: null,
      missing: [],
    };
  });
}

class GeneratedInventoryRepository {
  listInventory(filters: InventoryFilters): InventoryArtifactRecord[] {
    return loadInventory()
      .records.filter(
        (record) => filters.country === null || record.site.countryCode === filters.country,
      )
      .filter((record) => filters.metro === null || record.site.metro === filters.metro)
      .slice(0, filters.limit);
  }

  listPublicInventory(filters: InventoryFilters): PublicInventoryRecord[] {
    return this.listInventory(filters).map((record) => ({
      facility: record.facility,
      site: record.site,
      citations: record.citations.map((citation) => ({
        evidenceId: citation.evidenceId,
        sourceId: citation.sourceId,
        title: citation.title,
        url: citation.url,
        attribution: citation.attribution,
        sourceTimestamp: citation.sourceTimestamp,
        retrievedAt: citation.retrievedAt,
        exactGeometryRestricted: citation.exactGeometryRestricted,
      })),
      synthetic: true,
      publicFactApproved: false,
      corpusMode: PUBLIC_INVENTORY_CORPUS_MODE,
      warning: PUBLIC_INVENTORY_WARNING,
    }));
  }

  getMetadata(): PublicInventoryMetadata {
    return loadInventory().metadata;
  }

  getCoverage(): PublicCoverageReport {
    return loadCoverage();
  }

  listSourceManifests(limit: number): SourceManifestRecord[] {
    return loadSourceManifests().slice(0, limit);
  }
}

export const generatedInventoryRepository = new GeneratedInventoryRepository();
