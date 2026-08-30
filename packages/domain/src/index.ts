export type EntityKind =
  | "organization"
  | "facility"
  | "project"
  | "technology"
  | "jurisdiction"
  | "other";

export type EvidenceLifecycleState =
  | "announced"
  | "readiness_evidence"
  | "construction_evidence"
  | "activation_evidence"
  | "contested"
  | "stale"
  | "superseded"
  | "unknown";

export type RedistributionClass = "republish" | "derived-only" | "link-only" | "prohibited";

export interface Entity {
  id: string;
  kind: EntityKind;
  name: string;
  aliases?: string[];
}

export interface GeoLocation {
  longitude: number;
  latitude: number;
  countryCode: string;
  region?: string;
  locality?: string;
}

export interface Site {
  id: string;
  entityId: string;
  name: string;
  location: GeoLocation;
}

export interface LicenseRedistribution {
  licenseName?: string;
  licenseUrl?: string;
  classification: RedistributionClass;
  attribution?: string;
  notes?: string;
}

export type SourceAuthority =
  | "primary"
  | "authoritative-secondary"
  | "secondary"
  | "aggregator"
  | "unknown";

export type SourceDirectness = "direct" | "near-direct" | "indirect" | "unknown";

export interface Source {
  id: string;
  name: string;
  url: string;
  authority: SourceAuthority;
  directness: SourceDirectness;
  publisher?: string;
  redistribution: LicenseRedistribution;
}

export interface Confidence {
  score: number;
  sourceAuthority: number;
  directness: number;
  entityMatch: number;
  rationale: string;
}

export interface Evidence {
  id: string;
  sourceId: string;
  lifecycleState: EvidenceLifecycleState;
  summary: string;
  snapshotUri?: string;
  contentHash?: string;
  validFrom: string;
  validTo?: string;
  assertedAt: string;
  sourcePublishedAt: string;
  retrievedAt: string;
}

export interface Claim {
  id: string;
  entityId: string;
  predicate: string;
  value: unknown;
  evidenceIds: string[];
  confidence: Confidence;
  validFrom: string;
  validTo?: string;
  assertedAt: string;
}

export interface LedgerEvent {
  id: string;
  entityId: string;
  eventType: string;
  observedAt: string;
  description?: string;
  evidenceIds: string[];
}

export interface Relationship {
  id: string;
  fromEntityId: string;
  toEntityId: string;
  relationshipType: string;
  validFrom: string;
  validTo?: string;
  evidenceIds: string[];
}

export type CorrectionTarget =
  | "entity"
  | "site"
  | "evidence"
  | "claim"
  | "event"
  | "relationship"
  | "source";

export type CorrectionStatus = "requested" | "accepted" | "rejected" | "applied";

export interface Correction {
  id: string;
  targetType: CorrectionTarget;
  targetId: string;
  status: CorrectionStatus;
  reason: string;
  submittedAt: string;
  resolvedAt?: string;
  replacementEvidenceIds?: string[];
}

export type TimelineCorpusMode = "synthetic-reviewed-beta" | "public-factual-reviewed";

export type AtomicTimelineEventType =
  | "announcement"
  | "permit"
  | "construction"
  | "readiness"
  | "activation"
  | "moratorium_policy"
  | "correction"
  | "contested"
  | "superseded"
  | "stale"
  | "unknown";

export type TimelineLifecycleState =
  | "announced"
  | "permitted"
  | "under_construction"
  | "ready"
  | "active"
  | "policy_hold"
  | "corrected"
  | "contested"
  | "superseded"
  | "stale"
  | "unknown";

export interface MetroRecord {
  slug: string;
  name: string;
  countryCode: string;
  region: string;
}

export interface TimelineCitation {
  citationId: string;
  sourceId: string;
  title: string;
  url: string;
  exactReference: string;
  sourcePublishedAt: string;
  retrievedAt: string;
  synthetic: boolean;
  corpusMode: TimelineCorpusMode;
  warning: string;
  publicFactApproved: boolean;
}

export interface TimelineEvidenceSignal {
  signalId: string;
  sourceId: string;
  independenceGroup: string;
  authoritative: boolean;
  signalKind: string;
  authority: SourceAuthority | "";
  directness: SourceDirectness | "";
  entityMatchConfidence: number | null;
  synthetic: boolean;
  corpusMode: TimelineCorpusMode;
  warning: string;
  publicFactApproved: boolean;
}

export type TimelineSourceMode =
  | "synthetic-fixture"
  | "manual-link-only"
  | "verified-machine-endpoint";

export interface EvidencePacketRecord {
  packetId: string;
  timelineId: string;
  eventId: string;
  sourceMode: TimelineSourceMode;
  citations: TimelineCitation[];
  signals: TimelineEvidenceSignal[];
  synthetic: boolean;
  corpusMode: TimelineCorpusMode;
  warning: string;
  publicFactApproved: boolean;
}

export interface AtomicTimelineEvent {
  eventId: string;
  eventType: AtomicTimelineEventType;
  lifecycleState: TimelineLifecycleState;
  summary: string;
  validFrom: string;
  validTo: string | null;
  assertedAt: string;
  sourcePublishedAt: string;
  retrievedAt: string;
  evidencePacketId: string;
  exactEvidenceReferences: string[];
  correctsEventId: string | null;
  supersedesEventId: string | null;
  synthetic: boolean;
  corpusMode: TimelineCorpusMode;
  warning: string;
  publicFactApproved: boolean;
}

export type TimelineReviewerType =
  | "automated-independent-validator"
  | "human-independent-reviewer";

export interface TimelineReviewer {
  reviewerId: string;
  reviewerType: TimelineReviewerType;
}

export interface TimelineReviewerIndependence {
  isIndependent: boolean;
  separateValidatorPath: boolean;
  rationale: string;
}

export type TimelineReviewStatus =
  | "approved_synthetic"
  | "approved_public_fact"
  | "failed"
  | "pending";

export type TimelineReviewDecision =
  | "approve_synthetic_fixture"
  | "approve_public_fact"
  | "reject"
  | "pending";

export interface TimelineReviewChecklistResult {
  checkId: string;
  passed: boolean;
  note: string;
}

export interface TimelineReviewRecord {
  reviewId: string;
  reviewer: TimelineReviewer;
  reviewedAt: string;
  status: TimelineReviewStatus;
  decision: TimelineReviewDecision;
  independence: TimelineReviewerIndependence;
  checklistResults: TimelineReviewChecklistResult[];
  failedChecks: string[];
  adjudicationNotes: string[];
  publicFactApproved: boolean;
  synthetic: boolean;
  corpusMode: TimelineCorpusMode;
  warning: string;
}

export interface ReviewedTimelineRecord {
  timelineId: string;
  metro: MetroRecord;
  facilityName: string;
  authorId: string;
  events: AtomicTimelineEvent[];
  evidencePackets: EvidencePacketRecord[];
  review: TimelineReviewRecord;
  conflicts: string[];
  missing: string[];
  synthetic: boolean;
  publicFactApproved: boolean;
  corpusMode: TimelineCorpusMode;
  warning: string;
}

export interface DeepMetroReviewedCorpus {
  corpusVersion: string;
  corpusMode: TimelineCorpusMode;
  warning: string;
  generatedAt: string;
  timelines: ReviewedTimelineRecord[];
}

export interface DeepMetroReportRecord {
  metro: MetroRecord;
  corpusMode: TimelineCorpusMode;
  warning: string;
  timelineCount: number;
  eventDistribution: Record<string, number>;
  stateDistribution: Record<string, number>;
  sourceModeDistribution: Record<string, number>;
  citationCompleteness: number;
  conflictCount: number;
  missingnessDistribution: Record<string, number>;
  failedReviewCount: number;
  pendingReviewCount: number;
  approvedSyntheticReviewCount: number;
  publicFactApprovalCount: number;
  activationPrecisionProxy: number;
}

export interface PublicInventoryFacility {
  id: string;
  name: string | null;
  operator: string | null;
  capacityMw: number | null;
  lifecycleState: "unknown";
  facilityType: string | null;
  aliases: string[];
  missing: string[];
}

export interface PublicInventorySite {
  id: string;
  facilityId: string;
  countryCode: "US" | "CA" | "MX";
  macroRegion: string;
  metro: string | null;
  locality: string | null;
  geometryType: "point" | "area";
  displayLatitude: number;
  displayLongitude: number;
  coordinatePrecision: "generalized-0.01-degree";
  exactGeometryRestricted: true;
}

export interface PublicInventoryCitation {
  evidenceId: string;
  sourceId: string;
  title: string;
  url: string;
  attribution: string;
  sourceTimestamp: string;
  retrievedAt: string;
  exactGeometryRestricted: true;
}

export interface PublicInventoryRecord {
  facility: PublicInventoryFacility;
  site: PublicInventorySite;
  citations: PublicInventoryCitation[];
  synthetic: true;
  publicFactApproved: false;
  corpusMode: "synthetic-reviewed-beta";
  warning: string;
}
