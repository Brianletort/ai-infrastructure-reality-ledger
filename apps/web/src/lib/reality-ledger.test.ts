import { describe, expect, it, vi } from "vitest";

import { GET as getContestedClaims } from "../app/api/claims/contested/route";
import { GET as getCoverage } from "../app/api/coverage/route";
import { GET as getEntityTimeline } from "../app/api/entities/[id]/timeline/route";
import { GET as getEvidencePacket } from "../app/api/evidence/[claimId]/route";
import { GET as getFacility } from "../app/api/facilities/[id]/route";
import { GET as getInventory } from "../app/api/inventory/route";
import { GET as getProvider } from "../app/api/providers/[id]/route";
import { GET as search } from "../app/api/search/route";
import { GET as getSourceManifests } from "../app/api/sources/route";
import { syntheticLedgerRepository } from "./synthetic-ledger-repository";

async function json(response: Response): Promise<unknown> {
  return response.json();
}

describe("synthetic ledger repository", () => {
  it("returns deterministic search records with evidence metadata", async () => {
    const results = await syntheticLedgerRepository.search("north", 10);

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      id: "facility-synthetic-north",
      kind: "facility",
      name: "Synthetic North Facility",
      lifecycleState: "contested",
      retrievalDate: "2026-08-29T10:00:00.000Z",
      confidence: {
        score: 0.74,
        sourceAuthority: 0.9,
        directness: 0.8,
        entityMatch: 1,
      },
    });
    expect(results[0]?.citations).toHaveLength(2);
  });

  it("normalizes synthetic search without locale-sensitive casing", async () => {
    const localeLowerCase = vi
      .spyOn(String.prototype, "toLocaleLowerCase")
      .mockImplementation(() => {
        throw new Error("locale-sensitive casing must not be used");
      });

    try {
      const results = await syntheticLedgerRepository.search("NORTH", 10);
      expect(results.map((result) => result.id)).toEqual(["facility-synthetic-north"]);
    } finally {
      localeLowerCase.mockRestore();
    }
  });

  it("returns explicit missingness and correction lineage for facility lookup", async () => {
    const facility = await syntheticLedgerRepository.getFacility("facility-synthetic-north");

    expect(facility).toMatchObject({
      lifecycleState: "contested",
      commissionedCapacityMw: null,
      missing: ["commissionedCapacityMw"],
      correctionLineage: [
        {
          correctionId: "correction-synthetic-1",
          status: "applied",
          supersedesClaimId: "claim-synthetic-status-1",
        },
      ],
    });
  });

  it("returns provider, timeline, packet, source, and contested-claim read models", async () => {
    const provider = await syntheticLedgerRepository.getProvider("provider-synthetic-grid");
    const timeline = await syntheticLedgerRepository.getTimeline("facility-synthetic-north", 10);
    const packet = await syntheticLedgerRepository.getEvidencePacket("claim-synthetic-status-2");
    const sources = await syntheticLedgerRepository.listSourceManifests(10);
    const contested = await syntheticLedgerRepository.listContestedClaims(10);

    expect(provider?.kind).toBe("organization");
    expect(provider?.missing).toEqual(["headquarters"]);
    expect(timeline).toHaveLength(2);
    expect(timeline[0]?.citations[0]?.retrievedAt).toBe("2026-08-29T10:00:00.000Z");
    expect(packet?.claim.lifecycleState).toBe("contested");
    expect(packet?.evidence).toHaveLength(2);
    expect(sources).toHaveLength(2);
    expect(sources[0]?.adapterId).toMatch(/^synthetic-/);
    expect(contested).toHaveLength(1);
    expect(contested[0]?.correctionLineage).toHaveLength(1);
  });

  it("returns null or empty collections for missing fixture records", async () => {
    expect(await syntheticLedgerRepository.getFacility("facility-missing")).toBeNull();
    expect(await syntheticLedgerRepository.getProvider("provider-missing")).toBeNull();
    expect(await syntheticLedgerRepository.getEvidencePacket("claim-missing")).toBeNull();
    expect(await syntheticLedgerRepository.getTimeline("entity-missing", 10)).toEqual([]);
  });
});

describe("read API route handlers", () => {
  it("searches with bounded query input", async () => {
    const response = await search(new Request("https://ledger.invalid/api/search?q=north&limit=5"));

    expect(response.status).toBe(200);
    expect(await json(response)).toMatchObject({
      data: [{ id: "facility-synthetic-north" }],
      meta: { query: "north", limit: 5, explicitMissingness: true },
    });
  });

  it("rejects invalid search and anti-bulk limits", async () => {
    const shortQuery = await search(new Request("https://ledger.invalid/api/search?q=n"));
    const bulkLimit = await search(
      new Request("https://ledger.invalid/api/search?q=north&limit=1000"),
    );

    expect(shortQuery.status).toBe(400);
    expect(await json(shortQuery)).toEqual({ error: "q must contain 2 to 100 characters" });
    expect(bulkLimit.status).toBe(400);
    expect(await json(bulkLimit)).toEqual({ error: "limit must be an integer between 1 and 25" });
  });

  it("looks up a facility and rejects invalid identifiers", async () => {
    const response = await getFacility(new Request("https://ledger.invalid"), {
      params: Promise.resolve({ id: "facility-synthetic-north" }),
    });
    const invalid = await getFacility(new Request("https://ledger.invalid"), {
      params: Promise.resolve({ id: "../invalid" }),
    });

    expect(response.status).toBe(200);
    expect(await json(response)).toMatchObject({
      data: { id: "facility-synthetic-north", missing: ["commissionedCapacityMw"] },
    });
    expect(invalid.status).toBe(400);
  });

  it("looks up a provider and returns 404 for unknown records", async () => {
    const response = await getProvider(new Request("https://ledger.invalid"), {
      params: Promise.resolve({ id: "provider-synthetic-grid" }),
    });
    const missing = await getProvider(new Request("https://ledger.invalid"), {
      params: Promise.resolve({ id: "provider-missing" }),
    });

    expect(response.status).toBe(200);
    expect(await json(response)).toMatchObject({ data: { kind: "organization" } });
    expect(missing.status).toBe(404);
  });

  it("returns a bounded entity timeline", async () => {
    const response = await getEntityTimeline(
      new Request("https://ledger.invalid/api/entities/facility-synthetic-north/timeline?limit=2"),
      { params: Promise.resolve({ id: "facility-synthetic-north" }) },
    );
    const bulk = await getEntityTimeline(
      new Request("https://ledger.invalid/api/entities/facility-synthetic-north/timeline?limit=101"),
      { params: Promise.resolve({ id: "facility-synthetic-north" }) },
    );

    expect(response.status).toBe(200);
    expect(await json(response)).toEqual(
      expect.objectContaining({
        data: expect.arrayContaining([expect.objectContaining({ eventType: "status_asserted" })]),
      }),
    );
    expect(bulk.status).toBe(400);
    expect(await json(bulk)).toEqual({ error: "limit must be an integer between 1 and 100" });
  });

  it("returns an evidence packet with citation and correction lineage", async () => {
    const response = await getEvidencePacket(new Request("https://ledger.invalid"), {
      params: Promise.resolve({ claimId: "claim-synthetic-status-2" }),
    });
    const missing = await getEvidencePacket(new Request("https://ledger.invalid"), {
      params: Promise.resolve({ claimId: "claim-missing" }),
    });

    expect(response.status).toBe(200);
    expect(await json(response)).toMatchObject({
      data: {
        claim: { lifecycleState: "contested" },
        correctionLineage: [{ correctionId: "correction-synthetic-1" }],
      },
    });
    expect(missing.status).toBe(404);
  });

  it("returns bounded source manifests without source payloads", async () => {
    const response = await getSourceManifests(
      new Request("https://ledger.invalid/api/sources?limit=10"),
    );
    const bulk = await getSourceManifests(
      new Request("https://ledger.invalid/api/sources?limit=51"),
    );

    expect(response.status).toBe(200);
    expect(await json(response)).toEqual(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({
            adapterId: "osm-overpass-v1",
            redistribution: "republish",
            shareAlike: true,
          }),
          expect.objectContaining({
            adapterId: "peeringdb-prohibited",
            allowedUse: "prohibited",
          }),
        ]),
      }),
    );
    expect(bulk.status).toBe(400);
  });

  it("returns bounded contested claims and rejects invalid limits", async () => {
    const response = await getContestedClaims(
      new Request("https://ledger.invalid/api/claims/contested?limit=10"),
    );
    const invalid = await getContestedClaims(
      new Request("https://ledger.invalid/api/claims/contested?limit=all"),
    );

    expect(response.status).toBe(200);
    expect(await json(response)).toMatchObject({
      data: [{ id: "claim-synthetic-status-2", lifecycleState: "contested" }],
    });
    expect(invalid.status).toBe(400);
  });

  it("returns bounded generalized inventory records with explicit absence", async () => {
    const response = await getInventory(
      new Request(
        "https://ledger.invalid/api/inventory?country=US&metro=Northern%20Virginia&limit=2",
      ),
    );

    expect(response.status).toBe(200);
    const body = await json(response);
    expect(body).toMatchObject({
      data: expect.arrayContaining([
        expect.objectContaining({
          facility: expect.objectContaining({
            id: expect.stringMatching(/^facility-osm-[a-f0-9]+$/),
            capacityMw: null,
            lifecycleState: "unknown",
            missing: expect.arrayContaining(["capacityMw", "lifecycleState"]),
          }),
          site: expect.objectContaining({
            countryCode: "US",
            metro: "Northern Virginia",
            coordinatePrecision: "generalized-0.01-degree",
            exactGeometryRestricted: true,
          }),
          citations: expect.arrayContaining([
            expect.objectContaining({
              attribution: "© OpenStreetMap contributors",
              sourceId: "osm-overpass-v1",
            }),
          ]),
          synthetic: true,
          publicFactApproved: false,
          corpusMode: "synthetic-reviewed-beta",
        }),
      ]),
      meta: {
        limit: 2,
        notComplete: true,
        queryVersion: "osm-overpass-na-v1",
        corpusMode: "synthetic-reviewed-beta",
        warning: expect.stringContaining("NOT PUBLIC FACTUAL DATA"),
      },
    });
    const encoded = JSON.stringify(body);
    expect(encoded).not.toContain("exactLatitude");
    expect(encoded).not.toContain("exactLongitude");
    expect(encoded).not.toContain("sourceTags");
    expect(encoded).not.toContain("sourceRecordId");
    expect(encoded).not.toContain("sourceRecordIds");
  });

  it("rejects inventory bulk and unsupported-country requests", async () => {
    const bulk = await getInventory(
      new Request("https://ledger.invalid/api/inventory?limit=101"),
    );
    const unsupportedCountry = await getInventory(
      new Request("https://ledger.invalid/api/inventory?country=FR"),
    );

    expect(bulk.status).toBe(400);
    expect(unsupportedCountry.status).toBe(400);
    expect(await json(unsupportedCountry)).toEqual({
      error: "country must be one of US, CA, or MX",
    });
  });

  it("returns a compact coverage report with explicit incompleteness", async () => {
    const response = await getCoverage(new Request("https://ledger.invalid/api/coverage"));

    expect(response.status).toBe(200);
    expect(await json(response)).toMatchObject({
      data: {
        recordCount: 6,
        notComplete: true,
        byCountry: { US: 4, CA: 1, MX: 1 },
        deepMetros: {
          "Northern Virginia": { recordCount: 2 },
          "Dallas–Fort Worth": { recordCount: 1 },
          Phoenix: { recordCount: 1 },
          Toronto: { recordCount: 1 },
        },
      },
      meta: {
        notComplete: true,
        queryVersion: "osm-overpass-na-v1",
      },
    });
  });
});
