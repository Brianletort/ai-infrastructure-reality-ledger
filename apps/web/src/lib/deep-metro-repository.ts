import { readFileSync } from "node:fs";
import { resolve, sep } from "node:path";

import type {
  DeepMetroReportRecord,
  DeepMetroReviewedCorpus,
  EvidencePacketRecord,
  MetroRecord,
  ReviewedTimelineRecord,
} from "../../../../packages/domain/src/index";

export type { EvidencePacketRecord, ReviewedTimelineRecord };
export type DeepMetroReport = DeepMetroReportRecord;

export const DEEP_METRO_CORPUS_MODE = "synthetic-reviewed-beta";
export const DEEP_METRO_WARNING =
  "SYNTHETIC REVIEWED BETA CORPUS — NOT PUBLIC FACTUAL DATA. Do not use these records as evidence of real facilities or events.";

export interface DeepMetroTimelineSummary {
  timelineId: string;
  metro: MetroRecord;
  facilityName: string;
  eventCount: number;
  latestLifecycleState: string;
  reviewStatus: "approved_synthetic";
  conflictCount: number;
  missing: string[];
  synthetic: true;
  publicFactApproved: false;
}

export interface TimelineHistoryEntry {
  id: string;
  kind: "review" | "correction" | "supersession";
  occurredAt: string;
  status: string;
  notes: string[];
  targetEventId: string | null;
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

function hasStrictSyntheticLabels(value: unknown): value is Record<string, unknown> {
  return (
    isObject(value) &&
    value.synthetic === true &&
    value.publicFactApproved === false &&
    value.corpusMode === DEEP_METRO_CORPUS_MODE &&
    value.warning === DEEP_METRO_WARNING
  );
}

export function validateDeepMetroCorpus(raw: unknown): DeepMetroReviewedCorpus {
  if (
    !isObject(raw) ||
    raw.corpusMode !== DEEP_METRO_CORPUS_MODE ||
    raw.warning !== DEEP_METRO_WARNING ||
    !Array.isArray(raw.timelines) ||
    raw.timelines.length !== 100
  ) {
    throw new Error("deep-metro corpus metadata is invalid");
  }
  const metroCounts = new Map<string, number>();
  for (const timeline of raw.timelines) {
    if (
      !hasStrictSyntheticLabels(timeline) ||
      !isObject(timeline.metro) ||
      typeof timeline.metro.slug !== "string" ||
      !Array.isArray(timeline.events) ||
      !Array.isArray(timeline.evidencePackets) ||
      !hasStrictSyntheticLabels(timeline.review) ||
      timeline.review.status !== "approved_synthetic" ||
      !timeline.events.every(hasStrictSyntheticLabels) ||
      !timeline.evidencePackets.every(
        (packet) =>
          hasStrictSyntheticLabels(packet) &&
          Array.isArray(packet.citations) &&
          packet.citations.every(hasStrictSyntheticLabels) &&
          Array.isArray(packet.signals) &&
          packet.signals.every(hasStrictSyntheticLabels),
      )
    ) {
      throw new Error("deep-metro corpus contains unsafe or unlabeled nested data");
    }
    metroCounts.set(timeline.metro.slug, (metroCounts.get(timeline.metro.slug) ?? 0) + 1);
  }
  if (
    metroCounts.size !== 4 ||
    [...metroCounts.values()].some((timelineCount) => timelineCount !== 25)
  ) {
    throw new Error("deep-metro corpus must contain exactly 25 timelines per metro");
  }
  return raw as unknown as DeepMetroReviewedCorpus;
}

function loadCorpus(): DeepMetroReviewedCorpus {
  return validateDeepMetroCorpus(readJson("data/corpus/deep-metro-reviewed-beta.json"));
}

function loadReport(metroSlug: string): DeepMetroReport | null {
  try {
    const raw = readJson(`data/reports/deep-metro/${metroSlug}.json`);
    if (
      !isObject(raw) ||
      raw.corpusMode !== DEEP_METRO_CORPUS_MODE ||
      raw.warning !== DEEP_METRO_WARNING ||
      raw.timelineCount !== 25
    ) {
      throw new Error("deep-metro report is invalid");
    }
    return raw as unknown as DeepMetroReport;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

class DeepMetroRepository {
  getCorpusMetadata(): Pick<DeepMetroReviewedCorpus, "corpusVersion" | "generatedAt"> {
    const corpus = loadCorpus();
    return { corpusVersion: corpus.corpusVersion, generatedAt: corpus.generatedAt };
  }

  getMetroSummary(metroSlug: string): DeepMetroReport | null {
    return loadReport(metroSlug);
  }

  listMetroTimelines(metroSlug: string, limit: number): DeepMetroTimelineSummary[] {
    return loadCorpus()
      .timelines.filter((timeline) => timeline.metro.slug === metroSlug)
      .slice(0, limit)
      .map((timeline) => ({
        timelineId: timeline.timelineId,
        metro: timeline.metro,
        facilityName: timeline.facilityName,
        eventCount: timeline.events.length,
        latestLifecycleState: timeline.events.at(-1)?.lifecycleState ?? "unknown",
        reviewStatus: "approved_synthetic",
        conflictCount: timeline.conflicts.length,
        missing: timeline.missing,
        synthetic: true,
        publicFactApproved: false,
      }));
  }

  getTimeline(timelineId: string): ReviewedTimelineRecord | null {
    return loadCorpus().timelines.find((timeline) => timeline.timelineId === timelineId) ?? null;
  }

  getEvidencePacket(packetId: string): EvidencePacketRecord | null {
    for (const timeline of loadCorpus().timelines) {
      const packet = timeline.evidencePackets.find((candidate) => candidate.packetId === packetId);
      if (packet) {
        return packet;
      }
    }
    return null;
  }

  getTimelineHistory(timelineId: string, limit: number): TimelineHistoryEntry[] | null {
    const timeline = this.getTimeline(timelineId);
    if (!timeline) {
      return null;
    }
    const eventHistory: TimelineHistoryEntry[] = [];
    for (const event of timeline.events) {
      if (event.eventType === "correction") {
        eventHistory.push({
          id: event.eventId,
          kind: "correction",
          occurredAt: event.assertedAt,
          status: event.lifecycleState,
          notes: [event.summary],
          targetEventId: event.correctsEventId,
        });
      }
      if (event.eventType === "superseded") {
        eventHistory.push({
          id: event.eventId,
          kind: "supersession",
          occurredAt: event.assertedAt,
          status: event.lifecycleState,
          notes: [event.summary],
          targetEventId: event.supersedesEventId,
        });
      }
    }
    const reviewEntry: TimelineHistoryEntry = {
      id: timeline.review.reviewId,
      kind: "review",
      occurredAt: timeline.review.reviewedAt,
      status: timeline.review.status,
      notes: timeline.review.adjudicationNotes,
      targetEventId: null,
    };
    return [
      reviewEntry,
      ...eventHistory,
    ]
      .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt))
      .slice(0, limit);
  }
}

export const deepMetroRepository = new DeepMetroRepository();
