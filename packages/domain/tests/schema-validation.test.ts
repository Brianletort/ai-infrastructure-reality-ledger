import Ajv2020, { type AnySchema } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { describe, expect, it } from "vitest";

import type {
  Claim,
  Confidence,
  Correction,
  Entity,
  Evidence,
  LedgerEvent,
  LicenseRedistribution,
  Relationship,
  Site,
  Source,
} from "../src/index";
import claimSchema from "../schemas/claim.schema.json";
import confidenceSchema from "../schemas/confidence.schema.json";
import correctionSchema from "../schemas/correction.schema.json";
import entitySchema from "../schemas/entity.schema.json";
import eventSchema from "../schemas/event.schema.json";
import evidenceSchema from "../schemas/evidence.schema.json";
import licenseSchema from "../schemas/license-redistribution.schema.json";
import relationshipSchema from "../schemas/relationship.schema.json";
import siteSchema from "../schemas/site.schema.json";
import sourceSchema from "../schemas/source.schema.json";

type IdentifiedSchema = Exclude<AnySchema, boolean> & { $id: string };

const entityId = "6386cb41-3b1e-4a56-a8f3-5a6359cf27d2";
const relatedEntityId = "1901f45c-d0a6-4c22-a064-420f9f12f8ba";
const evidenceId = "e90b4a9e-699c-4cc8-8474-6cf46fde27e6";
const sourceId = "e885db19-e74c-4ae4-aa29-612cf8ee5038";

const representativeLicense = {
  licenseName: "Example Open Data License",
  licenseUrl: "https://example.org/license",
  classification: "derived-only",
  attribution: "Example public authority",
  notes: "Only non-reconstructive derived facts may be redistributed.",
} satisfies LicenseRedistribution;

const representativeConfidence = {
  score: 0.82,
  sourceAuthority: 0.95,
  directness: 0.8,
  entityMatch: 0.9,
  rationale: "An authoritative filing directly identifies the matched project.",
} satisfies Confidence;

const representativeEntity = {
  id: entityId,
  kind: "project",
  name: "Example Compute Campus",
  aliases: ["Example Campus Phase One"],
} satisfies Entity;

const representativeSite = {
  id: "58841111-150f-4d17-b4f2-63e51ab24ffc",
  entityId,
  name: "Example Compute Campus Site",
  location: {
    longitude: -97.7431,
    latitude: 30.2672,
    countryCode: "US",
    region: "Texas",
    locality: "Austin",
  },
} satisfies Site;

const representativeSource = {
  id: sourceId,
  name: "Example public filing",
  url: "https://example.org/filings/compute-campus",
  authority: "primary",
  directness: "direct",
  publisher: "Example public authority",
  redistribution: representativeLicense,
} satisfies Source;

const representativeEvidence = {
  id: evidenceId,
  sourceId,
  lifecycleState: "activation_evidence",
  summary: "A public filing records an in-service date.",
  snapshotUri: "https://evidence.example.org/sha256/example",
  contentHash: "a".repeat(64),
  validFrom: "2026-08-01T00:00:00Z",
  validTo: "2026-12-31T23:59:59Z",
  assertedAt: "2026-08-15T08:30:00Z",
  sourcePublishedAt: "2026-08-14T12:00:00Z",
  retrievedAt: "2026-08-15T08:00:00Z",
} satisfies Evidence;

const representativeClaim = {
  id: "b4d23582-e898-4727-9a8d-25806fabf048",
  entityId,
  predicate: "hasLifecycleEvidence",
  value: { state: "activation_evidence" },
  evidenceIds: [evidenceId],
  confidence: representativeConfidence,
  validFrom: "2026-08-01T00:00:00Z",
  validTo: "2026-12-31T23:59:59Z",
  assertedAt: "2026-08-15T08:30:00Z",
} satisfies Claim;

const representativeEvent = {
  id: "c9bb283f-6a5e-46e6-9caf-2f51d829468d",
  entityId,
  eventType: "service_activation",
  observedAt: "2026-08-01T00:00:00Z",
  description: "The public record indicates that service began.",
  evidenceIds: [evidenceId],
} satisfies LedgerEvent;

const representativeRelationship = {
  id: "bb1817fe-2360-4db9-aea7-c1c140f5934d",
  fromEntityId: entityId,
  toEntityId: relatedEntityId,
  relationshipType: "operated_by",
  validFrom: "2026-08-01T00:00:00Z",
  validTo: "2026-12-31T23:59:59Z",
  evidenceIds: [evidenceId],
} satisfies Relationship;

const representativeCorrection = {
  id: "d73c8348-8a3e-49ed-bf56-8112af1b688c",
  targetType: "claim",
  targetId: representativeClaim.id,
  status: "applied",
  reason: "A later authoritative filing corrected the activation date.",
  submittedAt: "2026-08-20T10:00:00Z",
  resolvedAt: "2026-08-22T15:00:00Z",
  replacementEvidenceIds: [evidenceId],
} satisfies Correction;

const schemas = [
  claimSchema,
  confidenceSchema,
  correctionSchema,
  entitySchema,
  eventSchema,
  evidenceSchema,
  licenseSchema,
  relationshipSchema,
  siteSchema,
  sourceSchema,
] as IdentifiedSchema[];

const representativeCases = [
  [entitySchema.$id, representativeEntity],
  [siteSchema.$id, representativeSite],
  [evidenceSchema.$id, representativeEvidence],
  [claimSchema.$id, representativeClaim],
  [eventSchema.$id, representativeEvent],
  [relationshipSchema.$id, representativeRelationship],
  [sourceSchema.$id, representativeSource],
  [licenseSchema.$id, representativeLicense],
  [confidenceSchema.$id, representativeConfidence],
  [correctionSchema.$id, representativeCorrection],
] as const;

function buildValidator(): Ajv2020 {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  for (const schema of schemas) {
    ajv.addSchema(schema);
  }
  return ajv;
}

describe("domain JSON Schemas", () => {
  it("compile together without unresolved references", () => {
    const ajv = buildValidator();

    for (const schema of schemas) {
      expect(ajv.getSchema(schema.$id)).toBeTypeOf("function");
    }
  });

  it.each(representativeCases)(
    "accepts the representative object for %s",
    (schemaId, representative) => {
      const validate = buildValidator().getSchema(schemaId);

      expect(validate).toBeDefined();
      expect(validate?.(representative), JSON.stringify(validate?.errors ?? [])).toBe(true);
    },
  );

  it("rejects unknown evidence lifecycle states", () => {
    const validate = buildValidator().getSchema(evidenceSchema.$id);

    const valid = validate?.({
      ...representativeEvidence,
      lifecycleState: "probably_ready",
    });

    expect(valid).toBe(false);
  });

  it("requires all four evidence time dimensions", () => {
    const validate = buildValidator().getSchema(evidenceSchema.$id);
    const missingRetrievalTime = Object.fromEntries(
      Object.entries(representativeEvidence).filter(([key]) => key !== "retrievedAt"),
    );

    const valid = validate?.(missingRetrievalTime);

    expect(valid).toBe(false);
    expect(validate?.errors?.some((error) => error.params.missingProperty === "retrievedAt")).toBe(
      true,
    );
  });
});
