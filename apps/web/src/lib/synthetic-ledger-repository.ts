import type {
  Citation,
  ClaimRecord,
  ConfidenceDimensions,
  CorrectionLineage,
  EvidencePacket,
  FacilityRecord,
  LedgerRepository,
  ProviderRecord,
  SourceManifestRecord,
  TimelineRecord,
} from "./ledger-repository";

const authoritativeCitation: Citation = {
  sourceId: "source-synthetic-authority",
  title: "Synthetic public register entry",
  url: "https://authority.example.invalid/register/SYN-001",
  attribution: "Synthetic public authority",
  sourcePublishedAt: "2026-08-28T09:00:00.000Z",
  retrievedAt: "2026-08-29T10:00:00.000Z",
};

const imageryCitation: Citation = {
  sourceId: "source-synthetic-imagery",
  title: "Synthetic dated imagery observation",
  url: "https://imagery.example.invalid/observations/SYN-IMG-001",
  attribution: "Synthetic imagery publisher",
  sourcePublishedAt: "2026-08-27T15:00:00.000Z",
  retrievedAt: "2026-08-29T10:00:00.000Z",
};

const confidence: ConfidenceDimensions = {
  score: 0.74,
  sourceAuthority: 0.9,
  directness: 0.8,
  entityMatch: 1,
  rationale: "Synthetic records agree on identity but disagree on lifecycle interpretation.",
};

const correctionLineage: CorrectionLineage[] = [
  {
    correctionId: "correction-synthetic-1",
    status: "applied",
    reason: "A later synthetic authority record superseded the original lifecycle assertion.",
    submittedAt: "2026-08-29T11:00:00.000Z",
    resolvedAt: "2026-08-29T12:00:00.000Z",
    supersedesClaimId: "claim-synthetic-status-1",
  },
];

const facility: FacilityRecord = {
  id: "facility-synthetic-north",
  kind: "facility",
  name: "Synthetic North Facility",
  aliases: ["Synthetic North Campus"],
  lifecycleState: "contested",
  retrievalDate: "2026-08-29T10:00:00.000Z",
  confidence,
  citations: [authoritativeCitation, imageryCitation],
  providerId: "provider-synthetic-grid",
  location: {
    countryCode: "XZ",
    region: "Synthetic Region",
    locality: "Example City",
    latitude: 40,
    longitude: -75,
  },
  commissionedCapacityMw: null,
  correctionLineage,
  missing: ["commissionedCapacityMw"],
};

const provider: ProviderRecord = {
  id: "provider-synthetic-grid",
  kind: "organization",
  name: "Synthetic Grid Provider",
  aliases: ["SGP"],
  lifecycleState: "unknown",
  retrievalDate: "2026-08-29T10:00:00.000Z",
  confidence: {
    score: 0.91,
    sourceAuthority: 0.95,
    directness: 0.9,
    entityMatch: 1,
    rationale: "A synthetic authority identifier directly resolves the provider.",
  },
  citations: [authoritativeCitation],
  headquarters: null,
  correctionLineage: [],
  missing: ["headquarters"],
};

const claim: ClaimRecord = {
  id: "claim-synthetic-status-2",
  entityId: facility.id,
  predicate: "has_lifecycle_state",
  value: "contested",
  lifecycleState: "contested",
  validFrom: "2026-08-28T09:00:00.000Z",
  validTo: null,
  assertedAt: "2026-08-29T12:00:00.000Z",
  sourcePublishedAt: "2026-08-28T09:00:00.000Z",
  retrievedAt: "2026-08-29T10:00:00.000Z",
  confidence,
  citations: [authoritativeCitation, imageryCitation],
  correctionLineage,
  missing: ["validTo"],
};

const timeline: TimelineRecord[] = [
  {
    id: "event-synthetic-status-2",
    entityId: facility.id,
    eventType: "status_asserted",
    observedAt: "2026-08-29T12:00:00.000Z",
    lifecycleState: "contested",
    description: "Synthetic evidence produced a contested lifecycle assertion.",
    confidence,
    citations: [authoritativeCitation, imageryCitation],
    correctionLineage,
    missing: [],
  },
  {
    id: "event-synthetic-announcement-1",
    entityId: facility.id,
    eventType: "announcement_recorded",
    observedAt: "2026-08-01T08:00:00.000Z",
    lifecycleState: "announced",
    description: "A synthetic authority record announced the facility.",
    confidence: {
      score: 0.95,
      sourceAuthority: 0.95,
      directness: 0.95,
      entityMatch: 1,
      rationale: "The synthetic authority record directly identifies the facility.",
    },
    citations: [authoritativeCitation],
    correctionLineage: [],
    missing: [],
  },
];

const packet: EvidencePacket = {
  claim,
  evidence: [
    {
      id: "evidence-synthetic-authority-1",
      lifecycleState: "activation_evidence",
      summary: "A synthetic register describes an in-service date.",
      contentHash: "a".repeat(64),
      snapshotUri: "urn:sha256:" + "a".repeat(64),
      citation: authoritativeCitation,
      missing: [],
    },
    {
      id: "evidence-synthetic-imagery-1",
      lifecycleState: "construction_evidence",
      summary: "Synthetic imagery indicates construction activity but cannot establish activation.",
      contentHash: null,
      snapshotUri: null,
      citation: imageryCitation,
      missing: ["contentHash", "snapshotUri"],
    },
  ],
  correctionLineage,
  missing: [],
};

const sourceManifests: SourceManifestRecord[] = [
  {
    adapterId: "synthetic-authority-register",
    protocolVersion: "1.0",
    name: "Synthetic Authority Register",
    sourceUrl: "https://authority.example.invalid/register",
    publisher: "Synthetic public authority",
    authority: "primary",
    directness: "direct",
    cadence: "daily",
    rateLimit: { requests: 10, perSeconds: 60 },
    attribution: { text: "Synthetic public authority" },
    license: {
      name: "Synthetic permissive license",
      url: "https://authority.example.invalid/license",
    },
    termsUrl: "https://authority.example.invalid/terms",
    redistribution: "republish",
    sensitivity: "public",
    shareAlike: false,
    allowedUse: "inventory",
    automation: "worker-only",
    notes: "Synthetic source used for deterministic evidence-interface tests.",
    lastRetrievedAt: "2026-08-29T10:00:00.000Z",
    missing: [],
  },
  {
    adapterId: "synthetic-imagery-index",
    protocolVersion: "1.0",
    name: "Synthetic Imagery Index",
    sourceUrl: "https://imagery.example.invalid/observations",
    publisher: "Synthetic imagery publisher",
    authority: "secondary",
    directness: "indirect",
    cadence: "monthly",
    rateLimit: { requests: 2, perSeconds: 60 },
    attribution: { text: "Synthetic imagery publisher" },
    license: {
      name: "Synthetic link-only terms",
      url: "https://imagery.example.invalid/license",
    },
    termsUrl: "https://imagery.example.invalid/terms",
    redistribution: "link-only",
    sensitivity: "public",
    shareAlike: false,
    allowedUse: "context-only",
    automation: "none",
    notes: "Synthetic citation-only source.",
    lastRetrievedAt: "2026-08-29T10:00:00.000Z",
    missing: [],
  },
];

class SyntheticLedgerRepository implements LedgerRepository {
  async search(query: string, limit: number) {
    const normalized = query.trim().toLowerCase();
    return [facility, provider]
      .filter((record) =>
        [record.name, ...record.aliases].some((value) =>
          value.toLowerCase().includes(normalized),
        ),
      )
      .slice(0, limit);
  }

  async getFacility(id: string) {
    return id === facility.id ? facility : null;
  }

  async getProvider(id: string) {
    return id === provider.id ? provider : null;
  }

  async getTimeline(entityId: string, limit: number) {
    return entityId === facility.id ? timeline.slice(0, limit) : [];
  }

  async getEvidencePacket(claimId: string) {
    return claimId === claim.id ? packet : null;
  }

  async listSourceManifests(limit: number) {
    return sourceManifests.slice(0, limit);
  }

  async listContestedClaims(limit: number) {
    return [claim].slice(0, limit);
  }
}

export const syntheticLedgerRepository: LedgerRepository = new SyntheticLedgerRepository();
