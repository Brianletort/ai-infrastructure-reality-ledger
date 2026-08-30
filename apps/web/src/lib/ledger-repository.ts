export type LifecycleState =
  | "announced"
  | "readiness_evidence"
  | "construction_evidence"
  | "activation_evidence"
  | "contested"
  | "stale"
  | "superseded"
  | "unknown";

export interface Citation {
  sourceId: string;
  title: string;
  url: string;
  attribution: string;
  sourcePublishedAt: string;
  retrievedAt: string;
}

export interface ConfidenceDimensions {
  score: number;
  sourceAuthority: number;
  directness: number;
  entityMatch: number;
  rationale: string;
}

export interface CorrectionLineage {
  correctionId: string;
  status: "requested" | "accepted" | "rejected" | "applied";
  reason: string;
  submittedAt: string;
  resolvedAt: string | null;
  supersedesClaimId: string | null;
}

export interface SearchRecord {
  id: string;
  kind: "facility" | "organization";
  name: string;
  aliases: string[];
  lifecycleState: LifecycleState;
  retrievalDate: string;
  confidence: ConfidenceDimensions;
  citations: Citation[];
  missing: string[];
}

export interface FacilityRecord extends SearchRecord {
  kind: "facility";
  providerId: string | null;
  location: {
    countryCode: string;
    region: string | null;
    locality: string | null;
    latitude: number;
    longitude: number;
  };
  commissionedCapacityMw: number | null;
  correctionLineage: CorrectionLineage[];
}

export interface ProviderRecord extends SearchRecord {
  kind: "organization";
  headquarters: string | null;
  correctionLineage: CorrectionLineage[];
}

export interface TimelineRecord {
  id: string;
  entityId: string;
  eventType: string;
  observedAt: string;
  lifecycleState: LifecycleState;
  description: string;
  confidence: ConfidenceDimensions;
  citations: Citation[];
  correctionLineage: CorrectionLineage[];
  missing: string[];
}

export interface ClaimRecord {
  id: string;
  entityId: string;
  predicate: string;
  value: unknown;
  lifecycleState: LifecycleState;
  validFrom: string;
  validTo: string | null;
  assertedAt: string;
  sourcePublishedAt: string;
  retrievedAt: string;
  confidence: ConfidenceDimensions;
  citations: Citation[];
  correctionLineage: CorrectionLineage[];
  missing: string[];
}

export interface EvidenceRecord {
  id: string;
  lifecycleState: LifecycleState;
  summary: string;
  contentHash: string | null;
  snapshotUri: string | null;
  citation: Citation;
  missing: string[];
}

export interface EvidencePacket {
  claim: ClaimRecord;
  evidence: EvidenceRecord[];
  correctionLineage: CorrectionLineage[];
  missing: string[];
}

export interface SourceManifestRecord {
  adapterId: string;
  protocolVersion: string;
  name: string;
  sourceUrl: string;
  publisher: string;
  authority: "primary" | "authoritative-secondary" | "secondary" | "aggregator" | "unknown";
  directness: "direct" | "near-direct" | "indirect" | "unknown";
  cadence: string;
  rateLimit: { requests: number; perSeconds: number };
  attribution: { text: string; url?: string };
  license: { name: string; url: string };
  termsUrl: string;
  redistribution: "republish" | "derived-only" | "link-only" | "prohibited";
  sensitivity: string;
  shareAlike: boolean;
  allowedUse: "inventory" | "context-only" | "prohibited";
  automation: "worker-only" | "manual-import" | "none";
  notes: string;
  lastRetrievedAt: string | null;
  missing: string[];
}

export interface LedgerRepository {
  search(query: string, limit: number): Promise<SearchRecord[]>;
  getFacility(id: string): Promise<FacilityRecord | null>;
  getProvider(id: string): Promise<ProviderRecord | null>;
  getTimeline(entityId: string, limit: number): Promise<TimelineRecord[]>;
  getEvidencePacket(claimId: string): Promise<EvidencePacket | null>;
  listSourceManifests(limit: number): Promise<SourceManifestRecord[]>;
  listContestedClaims(limit: number): Promise<ClaimRecord[]>;
}
