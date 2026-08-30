import type {
  EvidencePacketRecord,
  ReviewedTimelineRecord,
} from "../../../../packages/domain/src/index";
import {
  DEEP_METRO_CORPUS_MODE,
  DEEP_METRO_WARNING,
  deepMetroRepository,
} from "./deep-metro-repository";
import {
  generatedInventoryRepository,
  type InventoryArtifactRecord,
} from "./generated-inventory-repository";

export {
  buildCorrectionPacket,
  type CorrectionDraft,
  type CorrectionPacket,
  validateCorrectionDraft,
} from "./correction-packet";

export const CORPUS_WARNING = DEEP_METRO_WARNING;
export const CORPUS_MODE = DEEP_METRO_CORPUS_MODE;

export const DEEP_METROS = [
  { slug: "northern-virginia", name: "Northern Virginia" },
  { slug: "dallas-fort-worth", name: "Dallas–Fort Worth" },
  { slug: "phoenix", name: "Phoenix" },
  { slug: "toronto", name: "Toronto" },
] as const;

export interface UiCitation {
  id: string;
  title: string;
  url: string;
  exactReference: string;
  sourcePublishedAt: string;
  retrievedAt: string;
  attribution?: string;
}

export interface SafeFacility {
  id: string;
  name: string | null;
  operator: string | null;
  capacityMw: number | null;
  lifecycleState: "unknown";
  facilityType: string | null;
  aliases: string[];
  missing: string[];
  location: {
    countryCode: "US" | "CA" | "MX";
    macroRegion: string;
    metro: string | null;
    locality: string | null;
    geometryType: "point" | "area";
    coordinatePrecision: "generalized-0.01-degree";
  };
  citations: UiCitation[];
}

export interface ExplicitProvider {
  id: string;
  name: string;
  facilityIds: string[];
  facilityCount: number;
  retrievalDate: string;
}

export interface EditorialMetro {
  slug: string;
  name: string;
  countryCode: string;
  region: string;
  timelineCount: number;
  eventCount: number;
  citationCompleteness: number;
  conflictCount: number;
  missingCount: number;
  warning: string;
}

export interface EditorialChange {
  id: string;
  timelineId: string;
  facilityName: string;
  metroName: string;
  eventType: string;
  lifecycleState: string;
  summary: string;
  observedAt: string;
  reviewDecision: string;
  citations: UiCitation[];
  warning: string;
}

export interface EditorialSnapshot {
  mode: typeof CORPUS_MODE;
  warning: typeof CORPUS_WARNING;
  generatedAt: string;
  datasetTimestamp: string;
  sourceTimestamp: string;
  inventoryCount: number;
  timelineCount: number;
  regions: Array<{ slug: string; name: string; facilityCount: number }>;
  metros: EditorialMetro[];
  providers: ExplicitProvider[];
  recentChanges: EditorialChange[];
  missingCriticalFields: Record<string, number>;
  limitations: string[];
}

export type SearchResultKind = "facility" | "provider" | "metro" | "timeline";

export interface EditorialSearchResult {
  id: string;
  kind: SearchResultKind;
  title: string;
  context: string;
  href: string;
}

const REGION_SLUGS: Record<string, string> = {
  Canada: "canada",
  Mexico: "mexico",
  "United States": "united-states",
};

function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function allInventory(): InventoryArtifactRecord[] {
  return generatedInventoryRepository.listInventory({
    country: null,
    metro: null,
    limit: 100,
  });
}

function timelineCitation(
  packet: EvidencePacketRecord | undefined,
): UiCitation[] {
  return (
    packet?.citations.map((citation) => ({
      id: citation.citationId,
      title: citation.title,
      url: citation.url,
      exactReference: citation.exactReference,
      sourcePublishedAt: citation.sourcePublishedAt,
      retrievedAt: citation.retrievedAt,
    })) ?? []
  );
}

function toSafeFacility(record: InventoryArtifactRecord): SafeFacility {
  return {
    id: record.facility.id,
    name: record.facility.name,
    operator: record.facility.operator,
    capacityMw: record.facility.capacityMw,
    lifecycleState: record.facility.lifecycleState,
    facilityType: record.facility.facilityType,
    aliases: record.facility.aliases,
    missing: record.facility.missing,
    location: {
      countryCode: record.site.countryCode,
      macroRegion: record.site.macroRegion,
      metro: record.site.metro,
      locality: record.site.locality,
      geometryType: record.site.geometryType,
      coordinatePrecision: record.site.coordinatePrecision,
    },
    citations: record.citations.map((citation) => ({
      id: citation.evidenceId,
      title: citation.title,
      url: citation.url,
      exactReference: citation.sourceRecordId,
      sourcePublishedAt: citation.sourceTimestamp,
      retrievedAt: citation.retrievedAt,
      attribution: citation.attribution,
    })),
  };
}

function buildProviders(
  records: InventoryArtifactRecord[],
  retrievalDate: string,
): ExplicitProvider[] {
  const byName = new Map<string, string[]>();
  for (const record of records) {
    if (record.facility.operator !== null) {
      const ids = byName.get(record.facility.operator) ?? [];
      ids.push(record.facility.id);
      byName.set(record.facility.operator, ids);
    }
  }
  return [...byName.entries()]
    .map(([name, facilityIds]) => ({
      id: `provider-${slugify(name)}`,
      name,
      facilityIds,
      facilityCount: facilityIds.length,
      retrievalDate,
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

function getRecentChanges(limit = 12): EditorialChange[] {
  const changes: EditorialChange[] = [];
  for (const metro of DEEP_METROS) {
    const summaries = deepMetroRepository.listMetroTimelines(metro.slug, 25);
    for (const summary of summaries) {
      const timeline = deepMetroRepository.getTimeline(summary.timelineId);
      const event = timeline?.events.at(-1);
      if (!timeline || !event) {
        continue;
      }
      const packet = timeline.evidencePackets.find(
        (candidate) => candidate.packetId === event.evidencePacketId,
      );
      changes.push({
        id: event.eventId,
        timelineId: timeline.timelineId,
        facilityName: timeline.facilityName,
        metroName: timeline.metro.name,
        eventType: event.eventType,
        lifecycleState: event.lifecycleState,
        summary: event.summary,
        observedAt: event.validFrom,
        reviewDecision: timeline.review.decision,
        citations: timelineCitation(packet),
        warning: timeline.warning,
      });
    }
  }
  return changes
    .sort((left, right) => right.observedAt.localeCompare(left.observedAt))
    .slice(0, limit);
}

export function getEditorialSnapshot(): EditorialSnapshot {
  const coverage = generatedInventoryRepository.getCoverage();
  const metadata = generatedInventoryRepository.getMetadata();
  const corpus = deepMetroRepository.getCorpusMetadata();
  const records = allInventory();
  const regions = Object.entries(coverage.byMacroRegion)
    .map(([name, facilityCount]) => ({
      slug: REGION_SLUGS[name] ?? slugify(name),
      name,
      facilityCount,
    }))
    .sort((left, right) => right.facilityCount - left.facilityCount);
  const metros = DEEP_METROS.map((metro) => {
    const report = deepMetroRepository.getMetroSummary(metro.slug);
    const summaries = deepMetroRepository.listMetroTimelines(metro.slug, 25);
    if (!report || summaries.length !== 25) {
      throw new Error(`Fail-closed: reviewed metro data unavailable for ${metro.slug}`);
    }
    const eventCount = Object.values(report.eventDistribution).reduce(
      (total, count) => total + count,
      0,
    );
    const missingCount = Object.values(report.missingnessDistribution).reduce(
      (total, count) => total + count,
      0,
    );
    return {
      slug: metro.slug,
      name: metro.name,
      countryCode: report.metro.countryCode,
      region: report.metro.region,
      timelineCount: report.timelineCount,
      eventCount,
      citationCompleteness: report.citationCompleteness,
      conflictCount: report.conflictCount,
      missingCount,
      warning: report.warning,
    };
  });

  return {
    mode: CORPUS_MODE,
    warning: CORPUS_WARNING,
    generatedAt: corpus.generatedAt,
    datasetTimestamp: metadata.datasetTimestamp,
    sourceTimestamp: metadata.sourceTimestamp,
    inventoryCount: metadata.recordCount,
    timelineCount: metros.reduce((total, metro) => total + metro.timelineCount, 0),
    regions,
    metros,
    providers: buildProviders(records, metadata.datasetTimestamp),
    recentChanges: getRecentChanges(),
    missingCriticalFields: coverage.missingCriticalFields,
    limitations: coverage.limitations,
  };
}

export function getSafeFacilities(): SafeFacility[] {
  return allInventory().map(toSafeFacility);
}

export function getSafeFacility(id: string): SafeFacility | null {
  const record = allInventory().find((candidate) => candidate.facility.id === id);
  return record ? toSafeFacility(record) : null;
}

export function getExplicitProviders(): ExplicitProvider[] {
  const metadata = generatedInventoryRepository.getMetadata();
  return buildProviders(allInventory(), metadata.datasetTimestamp);
}

export function getExplicitProvider(id: string): ExplicitProvider | null {
  return getExplicitProviders().find((provider) => provider.id === id) ?? null;
}

export function getReviewedTimeline(id: string): ReviewedTimelineRecord | null {
  return deepMetroRepository.getTimeline(id);
}

export function getMetro(slug: string): EditorialMetro | null {
  return getEditorialSnapshot().metros.find((metro) => metro.slug === slug) ?? null;
}

export function getRegion(slug: string) {
  const snapshot = getEditorialSnapshot();
  const region = snapshot.regions.find((candidate) => candidate.slug === slug);
  if (!region) {
    return null;
  }
  const facilities = getSafeFacilities().filter(
    (facility) => facility.location.macroRegion === region.name,
  );
  return { ...region, facilities };
}

export function parseSearchTerm(
  raw: string | string[] | undefined,
): { ok: true; value: string } | { ok: false; error: string } {
  const value = (Array.isArray(raw) ? raw[0] : raw ?? "").trim();
  if (value.length < 2 || value.length > 100) {
    return { ok: false, error: "Enter between 2 and 100 characters." };
  }
  return { ok: true, value };
}

export function searchEditorial(query: string, limit = 25): EditorialSearchResult[] {
  const normalized = query.toLowerCase();
  const snapshot = getEditorialSnapshot();
  const facilities: EditorialSearchResult[] = getSafeFacilities()
    .filter((facility) =>
      [facility.name ?? "", facility.operator ?? "", facility.location.locality ?? ""].some(
        (value) => value.toLowerCase().includes(normalized),
      ),
    )
    .map((facility) => ({
      id: facility.id,
      kind: "facility",
      title: facility.name ?? "Unnamed facility",
      context: facility.location.metro ?? facility.location.macroRegion,
      href: `/facilities/${facility.id}`,
    }));
  const providers: EditorialSearchResult[] = snapshot.providers
    .filter((provider) => provider.name.toLowerCase().includes(normalized))
    .map((provider) => ({
      id: provider.id,
      kind: "provider",
      title: provider.name,
      context: `${provider.facilityCount} explicit operator record${
        provider.facilityCount === 1 ? "" : "s"
      }`,
      href: `/providers/${provider.id}`,
    }));
  const metros: EditorialSearchResult[] = snapshot.metros
    .filter((metro) => metro.name.toLowerCase().includes(normalized))
    .map((metro) => ({
      id: metro.slug,
      kind: "metro",
      title: metro.name,
      context: `${metro.timelineCount} reviewed synthetic timelines`,
      href: `/metros/${metro.slug}`,
    }));
  const timelines: EditorialSearchResult[] = DEEP_METROS.flatMap((metro) =>
    deepMetroRepository.listMetroTimelines(metro.slug, 25),
  )
    .filter((timeline) => timeline.facilityName.toLowerCase().includes(normalized))
    .map((timeline) => ({
      id: timeline.timelineId,
      kind: "timeline",
      title: timeline.facilityName,
      context: timeline.metro.name,
      href: `/timelines/${timeline.timelineId}`,
    }));
  return [...facilities, ...providers, ...metros, ...timelines].slice(
    0,
    Math.min(Math.max(limit, 1), 25),
  );
}

export function parseComparisonSelection(
  raw: string | string[] | undefined,
):
  | { ok: true; ids: string[] }
  | { ok: false; ids: string[]; error: string } {
  const values = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const ids = [...new Set(values.flatMap((value) => value.split(",")).filter(Boolean))];
  const bounded = ids.slice(0, 4);
  if (ids.length < 2 || ids.length > 4) {
    return {
      ok: false,
      ids: bounded,
      error: "Select between 2 and 4 records.",
    };
  }
  return { ok: true, ids: bounded };
}

export function listCanonicalRoutes(): string[] {
  return [
    "/",
    "/globe",
    "/regions",
    "/regions/[region]",
    "/metros",
    "/metros/[metro]",
    "/campuses/[id]",
    "/facilities/[id]",
    "/providers",
    "/providers/[id]",
    "/timelines/[timelineId]",
    "/search?q=",
    "/compare?id=",
    "/changes",
    "/corrections",
    "/methodology",
    "/coverage",
    "/sources",
    "/accessibility",
    "/security",
    "/contributors",
  ];
}
