import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

function readJson(path) {
  return JSON.parse(readFileSync(resolve(ROOT, path), "utf8"));
}

test("facility aggregation is bounded at the public inventory route", () => {
  const route = readFileSync(
    resolve(ROOT, "apps/web/src/app/api/inventory/route.ts"),
    "utf8",
  );
  const match = route.match(/parseLimit\(request,\s*(\d+),\s*(\d+)\)/);
  assert.ok(match, "inventory route must use the shared bounded-limit parser");
  const maximum = Number(match[1]);
  const defaultLimit = Number(match[2]);
  assert.ok(maximum <= 100, `inventory maximum ${maximum} permits excessive aggregation`);
  assert.ok(defaultLimit <= maximum, "inventory default exceeds its maximum");
});

test("published inventory coordinates stay generalized and restricted", () => {
  const inventory = readJson("data/odbl/north-america-facilities.json");
  assert.ok(inventory.records.length > 0, "precision test needs inventory records");
  for (const record of inventory.records) {
    assert.equal(record.site.coordinatePrecision, "generalized-0.01-degree");
    assert.equal(record.site.exactGeometryRestricted, true);
    assert.equal(Number(record.site.displayLatitude.toFixed(2)), record.site.displayLatitude);
    assert.equal(Number(record.site.displayLongitude.toFixed(2)), record.site.displayLongitude);
  }
});

test("corpus linkage rejects provenance poisoning", () => {
  const corpus = readJson("data/corpus/deep-metro-reviewed-beta.json");
  for (const timeline of corpus.timelines) {
    const events = new Map(timeline.events.map((event) => [event.eventId, event]));
    for (const packet of timeline.evidencePackets) {
      const event = events.get(packet.eventId);
      assert.ok(event, `${packet.packetId} references an unknown event`);
      assert.equal(event.evidencePacketId, packet.packetId);

      const citationReferences = new Set(
        packet.citations.map((citation) => citation.exactReference),
      );
      assert.deepEqual(
        new Set(event.exactEvidenceReferences),
        citationReferences,
        `${packet.packetId} exact references do not match`,
      );

      const citationSources = new Set(
        packet.citations.map((citation) => citation.sourceId),
      );
      for (const signal of packet.signals) {
        assert.ok(
          citationSources.has(signal.sourceId),
          `${signal.signalId} uses a source absent from its citations`,
        );
      }
    }
  }
});

test("synthetic fixtures cannot be confused with approved public facts", () => {
  const corpus = readJson("data/corpus/deep-metro-reviewed-beta.json");
  const items = corpus.timelines.flatMap((timeline) => [
    timeline,
    timeline.review,
    ...timeline.events,
    ...timeline.evidencePackets,
    ...timeline.evidencePackets.flatMap((packet) => packet.citations),
    ...timeline.evidencePackets.flatMap((packet) => packet.signals),
  ]);
  for (const item of items) {
    assert.equal(item.synthetic, true);
    assert.equal(item.publicFactApproved, false);
    assert.match(item.warning, /NOT PUBLIC FACTUAL DATA/);
  }
});

test("prohibited source adapters cannot bypass production controls", () => {
  const manifests = [
    ...readJson("sources/manifests/north-america-public-sources.json"),
    ...readJson("sources/manifests/deep-metro-official-sources.json"),
  ];
  const prohibited = new Set(
    manifests
      .filter(
        (entry) =>
          entry.redistribution === "prohibited" || entry.allowedUse === "prohibited",
      )
      .map((entry) => entry.adapterId),
  );
  const inventory = readJson("data/odbl/north-america-facilities.json");
  const produced = new Set(
    inventory.records.flatMap((record) =>
      record.citations.map((citation) => citation.sourceId),
    ),
  );
  assert.deepEqual(
    [...produced].filter((sourceId) => prohibited.has(sourceId)),
    [],
  );
});
