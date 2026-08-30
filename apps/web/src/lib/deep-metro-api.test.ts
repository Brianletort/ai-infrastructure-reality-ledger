import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { GET as getEvidencePacket } from "../app/api/evidence-packets/[packetId]/route";
import { GET as getMetroSummary } from "../app/api/metros/[metro]/summary/route";
import { GET as getMetroTimelines } from "../app/api/metros/[metro]/timelines/route";
import { GET as getTimeline } from "../app/api/timelines/[timelineId]/route";
import { GET as getTimelineHistory } from "../app/api/timelines/[timelineId]/history/route";
import {
  DEEP_METRO_WARNING,
  deepMetroRepository,
  validateDeepMetroCorpus,
} from "./deep-metro-repository";

async function json(response: Response): Promise<unknown> {
  return response.json();
}

interface MutableSyntheticRecord {
  synthetic: unknown;
  publicFactApproved: unknown;
  corpusMode: unknown;
  warning: unknown;
}

interface MutablePacket extends MutableSyntheticRecord {
  citations: MutableSyntheticRecord[];
  signals: MutableSyntheticRecord[];
}

interface MutableTimeline {
  events: MutableSyntheticRecord[];
  evidencePackets: MutablePacket[];
  review: MutableSyntheticRecord;
}

interface MutableCorpusFixture {
  timelines: MutableTimeline[];
}

function corpusFixture(): MutableCorpusFixture {
  return JSON.parse(
    readFileSync(resolve(process.cwd(), "data/corpus/deep-metro-reviewed-beta.json"), "utf8"),
  ) as MutableCorpusFixture;
}

describe("deep-metro reviewed corpus repository", () => {
  it.each([
    ["event", "synthetic", false],
    ["event", "publicFactApproved", true],
    ["event", "corpusMode", "public-factual-reviewed"],
    ["event", "warning", "corrupted warning"],
    ["evidence packet", "synthetic", false],
    ["evidence packet", "publicFactApproved", true],
    ["evidence packet", "corpusMode", "public-factual-reviewed"],
    ["evidence packet", "warning", "corrupted warning"],
    ["citation", "synthetic", false],
    ["citation", "publicFactApproved", true],
    ["citation", "corpusMode", "public-factual-reviewed"],
    ["citation", "warning", "corrupted warning"],
    ["signal", "synthetic", false],
    ["signal", "publicFactApproved", true],
    ["signal", "corpusMode", "public-factual-reviewed"],
    ["signal", "warning", "corrupted warning"],
    ["review", "synthetic", false],
    ["review", "publicFactApproved", true],
    ["review", "corpusMode", "public-factual-reviewed"],
    ["review", "warning", "corrupted warning"],
  ])("fails closed when a nested %s has a corrupted %s label", (target, field, value) => {
    const fixture = corpusFixture();
    const timeline = fixture.timelines[0];
    if (!timeline) {
      throw new Error("expected a timeline fixture");
    }
    const packet = timeline.evidencePackets[0];
    if (!packet) {
      throw new Error("expected an evidence packet fixture");
    }
    const targets: Record<string, MutableSyntheticRecord | undefined> = {
      event: timeline.events[0],
      "evidence packet": packet,
      citation: packet.citations[0],
      signal: packet.signals[0],
      review: timeline.review,
    };
    const record = targets[target];
    if (!record) {
      throw new Error(`expected ${target} fixture`);
    }
    record[field as keyof MutableSyntheticRecord] = value;

    expect(() => validateDeepMetroCorpus(fixture)).toThrowError(
      "deep-metro corpus contains unsafe or unlabeled nested data",
    );
  });

  it("loads exactly 25 reviewed synthetic timelines per metro", () => {
    for (const metro of [
      "northern-virginia",
      "dallas-fort-worth",
      "phoenix",
      "toronto",
    ]) {
      const timelines = deepMetroRepository.listMetroTimelines(metro, 25);
      expect(timelines).toHaveLength(25);
      expect(timelines.every((timeline) => timeline.synthetic)).toBe(true);
      expect(timelines.every((timeline) => timeline.publicFactApproved === false)).toBe(true);
      expect(timelines.every((timeline) => timeline.reviewStatus === "approved_synthetic")).toBe(
        true,
      );
    }
  });

  it("returns a single timeline, evidence packet, and correction/review history", () => {
    const timeline = deepMetroRepository.getTimeline("synthetic-dallas-fort-worth-10");
    const correction = timeline?.events.find((event) => event.eventType === "correction");
    const packet = correction
      ? deepMetroRepository.getEvidencePacket(correction.evidencePacketId)
      : null;
    const history = deepMetroRepository.getTimelineHistory(
      "synthetic-dallas-fort-worth-10",
      10,
    );

    if (!history) {
      throw new Error("expected synthetic history fixture");
    }
    expect(timeline?.corpusMode).toBe("synthetic-reviewed-beta");
    expect(packet?.synthetic).toBe(true);
    expect(packet?.warning).toBe(DEEP_METRO_WARNING);
    expect(history.some((entry) => entry.kind === "review")).toBe(true);
    expect(history.some((entry) => entry.kind === "correction")).toBe(true);
  });
});

describe("bounded deep-metro API routes", () => {
  it("returns metro summary with explicit synthetic warning", async () => {
    const response = await getMetroSummary(new Request("https://ledger.invalid"), {
      params: Promise.resolve({ metro: "phoenix" }),
    });

    expect(response.status).toBe(200);
    expect(await json(response)).toMatchObject({
      data: {
        metro: { slug: "phoenix" },
        timelineCount: 25,
        publicFactApprovalCount: 0,
      },
      meta: {
        corpusMode: "synthetic-reviewed-beta",
        warning: DEEP_METRO_WARNING,
      },
    });
  });

  it("bounds metro timeline lists and returns summary records only", async () => {
    const response = await getMetroTimelines(
      new Request("https://ledger.invalid/api/metros/toronto/timelines?limit=5"),
      { params: Promise.resolve({ metro: "toronto" }) },
    );
    const bulk = await getMetroTimelines(
      new Request("https://ledger.invalid/api/metros/toronto/timelines?limit=26"),
      { params: Promise.resolve({ metro: "toronto" }) },
    );

    expect(response.status).toBe(200);
    const body = await json(response);
    expect(body).toMatchObject({
      data: expect.arrayContaining([
        expect.objectContaining({
          timelineId: "synthetic-toronto-01",
          synthetic: true,
          publicFactApproved: false,
        }),
      ]),
      meta: {
        limit: 5,
        corpusMode: "synthetic-reviewed-beta",
        warning: DEEP_METRO_WARNING,
      },
    });
    expect(JSON.stringify(body)).not.toContain("evidencePackets");
    expect(bulk.status).toBe(400);
  });

  it("returns individual records and 404s without leaking bulk data", async () => {
    const timeline = await getTimeline(new Request("https://ledger.invalid"), {
      params: Promise.resolve({ timelineId: "synthetic-northern-virginia-05" }),
    });
    const packet = await getEvidencePacket(new Request("https://ledger.invalid"), {
      params: Promise.resolve({
        packetId: "synthetic-northern-virginia-05-packet-02",
      }),
    });
    const missing = await getTimeline(new Request("https://ledger.invalid"), {
      params: Promise.resolve({ timelineId: "synthetic-missing-01" }),
    });

    expect(timeline.status).toBe(200);
    expect(await json(timeline)).toMatchObject({
      data: { synthetic: true, publicFactApproved: false },
      meta: { warning: DEEP_METRO_WARNING },
    });
    expect(packet.status).toBe(200);
    expect(await json(packet)).toMatchObject({
      data: { synthetic: true },
      meta: { warning: DEEP_METRO_WARNING },
    });
    expect(missing.status).toBe(404);
  });

  it("bounds review/correction history and handles unknown metros", async () => {
    const history = await getTimelineHistory(
      new Request(
        "https://ledger.invalid/api/timelines/synthetic-dallas-fort-worth-10/history?limit=2",
      ),
      { params: Promise.resolve({ timelineId: "synthetic-dallas-fort-worth-10" }) },
    );
    const bulk = await getTimelineHistory(
      new Request(
        "https://ledger.invalid/api/timelines/synthetic-dallas-fort-worth-10/history?limit=51",
      ),
      { params: Promise.resolve({ timelineId: "synthetic-dallas-fort-worth-10" }) },
    );
    const unknownMetro = await getMetroSummary(new Request("https://ledger.invalid"), {
      params: Promise.resolve({ metro: "unknown-metro" }),
    });

    expect(history.status).toBe(200);
    expect(await json(history)).toMatchObject({
      meta: {
        limit: 2,
        corpusMode: "synthetic-reviewed-beta",
        warning: DEEP_METRO_WARNING,
      },
    });
    expect(bulk.status).toBe(400);
    expect(unknownMetro.status).toBe(404);
  });
});
