import { describe, expect, it } from "vitest";

import type {
  AtomicTimelineEvent,
  EvidencePacketRecord,
  MetroRecord,
  ReviewedTimelineRecord,
  TimelineReviewRecord,
} from "../src/index";

const warning =
  "SYNTHETIC REVIEWED BETA CORPUS — NOT PUBLIC FACTUAL DATA. Do not use these records as evidence of real facilities or events.";

const metro = {
  slug: "phoenix",
  name: "Phoenix",
  countryCode: "US",
  region: "Arizona",
} satisfies MetroRecord;

const evidencePacket = {
  packetId: "synthetic-phoenix-01-packet-01",
  timelineId: "synthetic-phoenix-01",
  eventId: "synthetic-phoenix-01-event-01-announcement",
  sourceMode: "synthetic-fixture",
  citations: [
    {
      citationId: "citation-1",
      sourceId: "source-1",
      title: "Synthetic announcement fixture",
      url: "https://synthetic-announcement.invalid",
      exactReference: "fixture:synthetic-phoenix-01:announcement:1",
      sourcePublishedAt: "2026-08-01T00:00:00Z",
      retrievedAt: "2026-08-02T00:00:00Z",
      synthetic: true,
      corpusMode: "synthetic-reviewed-beta",
      warning,
      publicFactApproved: false,
    },
  ],
  signals: [
    {
      signalId: "signal-1",
      sourceId: "source-1",
      independenceGroup: "publisher-1",
      authoritative: true,
      signalKind: "official-record",
      authority: "primary",
      directness: "direct",
      entityMatchConfidence: 0.98,
      synthetic: true,
      corpusMode: "synthetic-reviewed-beta",
      warning,
      publicFactApproved: false,
    },
  ],
  synthetic: true,
  corpusMode: "synthetic-reviewed-beta",
  warning,
  publicFactApproved: false,
} satisfies EvidencePacketRecord;

const event = {
  eventId: evidencePacket.eventId,
  eventType: "announcement",
  lifecycleState: "announced",
  summary: "Synthetic announcement scenario.",
  validFrom: "2026-08-01T00:00:00Z",
  validTo: null,
  assertedAt: "2026-08-03T00:00:00Z",
  sourcePublishedAt: "2026-08-01T00:00:00Z",
  retrievedAt: "2026-08-02T00:00:00Z",
  evidencePacketId: evidencePacket.packetId,
  exactEvidenceReferences: ["fixture:synthetic-phoenix-01:announcement:1"],
  correctsEventId: null,
  supersedesEventId: null,
  synthetic: true,
  corpusMode: "synthetic-reviewed-beta",
  warning,
  publicFactApproved: false,
} satisfies AtomicTimelineEvent;

const review = {
  reviewId: "synthetic-phoenix-01-review-02",
  reviewer: {
    reviewerId: "deep-metro-independent-validator-v1",
    reviewerType: "automated-independent-validator",
  },
  reviewedAt: "2026-08-29T18:00:00Z",
  status: "approved_synthetic",
  decision: "approve_synthetic_fixture",
  independence: {
    isIndependent: true,
    separateValidatorPath: true,
    rationale: "Generator and validator use separate paths and identities.",
  },
  checklistResults: [{ checkId: "valid_citations", passed: true, note: "Valid." }],
  failedChecks: [],
  adjudicationNotes: ["Synthetic approval only."],
  publicFactApproved: false,
  synthetic: true,
  corpusMode: "synthetic-reviewed-beta",
  warning,
} satisfies TimelineReviewRecord;

const timeline = {
  timelineId: "synthetic-phoenix-01",
  metro,
  facilityName: "Synthetic Phoenix Campus 01",
  authorId: "deep-metro-fixture-generator-v1",
  events: [event],
  evidencePackets: [evidencePacket],
  review,
  conflicts: [],
  missing: ["synthetic_activation_not_asserted"],
  synthetic: true,
  publicFactApproved: false,
  corpusMode: "synthetic-reviewed-beta",
  warning,
} satisfies ReviewedTimelineRecord;

describe("deep-metro domain contracts", () => {
  it("keep synthetic review semantically separate from public-fact approval", () => {
    expect(timeline.review.status).toBe("approved_synthetic");
    expect(timeline.publicFactApproved).toBe(false);
    expect(timeline.corpusMode).toBe("synthetic-reviewed-beta");
  });
});
