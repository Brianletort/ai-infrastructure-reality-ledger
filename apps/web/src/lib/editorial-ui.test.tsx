import { isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import ErrorBoundary from "../app/error";
import {
  CorrectionBuilder,
  reduceCorrectionBuilderState,
  type CorrectionBuilderState,
} from "../app/components/correction-builder";
import {
  AppFrame,
  CitationList,
  CorpusWarning,
  UnknownValue,
} from "../app/components/editorial";
import {
  CORPUS_WARNING,
  buildCorrectionPacket,
  getEditorialSnapshot,
  getSafeFacility,
  listCanonicalRoutes,
  parseComparisonSelection,
  parseSearchTerm,
  validateCorrectionDraft,
} from "./editorial-data";

function findButton(node: ReactNode): ReactElement<{ children?: ReactNode; onClick?: () => void }> {
  if (isValidElement<{ children?: ReactNode; onClick?: () => void }>(node)) {
    if (node.type === "button") {
      return node;
    }
    const children = node.props.children;
    const candidates = Array.isArray(children) ? children : [children];
    for (const child of candidates) {
      try {
        return findButton(child);
      } catch {
        // Keep walking the rendered element tree.
      }
    }
  }
  throw new Error("button not found");
}

describe("editorial data integrity", () => {
  it("propagates the synthetic warning through the UI snapshot", () => {
    const snapshot = getEditorialSnapshot();

    expect(snapshot.mode).toBe("synthetic-reviewed-beta");
    expect(snapshot.warning).toBe(CORPUS_WARNING);
    expect(snapshot.metros).toHaveLength(4);
    expect(snapshot.metros.every((metro) => metro.warning === CORPUS_WARNING)).toBe(true);
    expect(snapshot.recentChanges.every((change) => change.warning === CORPUS_WARNING)).toBe(true);
  });

  it("keeps unknown values explicit and strips restricted fields", () => {
    const facility = getSafeFacility("facility-osm-316add245b25fd1d87d4");

    expect(facility?.operator).toBeNull();
    expect(facility?.capacityMw).toBeNull();
    const encoded = JSON.stringify(facility);
    expect(encoded).not.toContain("sourceTags");
    expect(encoded).not.toContain("displayLatitude");
    expect(encoded).not.toContain("displayLongitude");
    expect(encoded).not.toContain("exactGeometry");

    const markup = renderToStaticMarkup(<UnknownValue label="Operator" value={null} />);
    expect(markup).toContain("Unknown");
    expect(markup).toContain('data-unknown="true"');
  });

  it("renders exact citation references and retrieval dates", () => {
    const snapshot = getEditorialSnapshot();
    const citation = snapshot.recentChanges[0]?.citations[0];

    expect(citation).toBeDefined();
    const markup = renderToStaticMarkup(<CitationList citations={citation ? [citation] : []} />);
    expect(markup).toContain(citation?.exactReference);
    expect(markup).toContain("Retrieved");
    expect(markup).toContain(citation?.retrievedAt.slice(0, 10));
  });
});

describe("canonical query parsing", () => {
  it("bounds and normalizes search input", () => {
    expect(parseSearchTerm("  north  ")).toEqual({ ok: true, value: "north" });
    expect(parseSearchTerm("n")).toEqual({
      ok: false,
      error: "Enter between 2 and 100 characters.",
    });
    expect(parseSearchTerm("x".repeat(101))).toEqual({
      ok: false,
      error: "Enter between 2 and 100 characters.",
    });
  });

  it("deduplicates comparison IDs and enforces the 2–4 limit", () => {
    expect(parseComparisonSelection(["a", "b", "a"])).toEqual({
      ok: true,
      ids: ["a", "b"],
    });
    expect(parseComparisonSelection(["a"])).toEqual({
      ok: false,
      ids: ["a"],
      error: "Select between 2 and 4 records.",
    });
    expect(parseComparisonSelection(["a", "b", "c", "d", "e"])).toEqual({
      ok: false,
      ids: ["a", "b", "c", "d"],
      error: "Select between 2 and 4 records.",
    });
  });
});

describe("local correction packet", () => {
  it("validates required fields and generates a local-only packet", () => {
    expect(
      validateCorrectionDraft({ targetId: "", reason: "short", evidenceUrl: "not-a-url" }),
    ).toEqual({
      targetId: "Choose a ledger record.",
      reason: "Explain the proposed correction in at least 20 characters.",
      evidenceUrl: "Provide a valid HTTPS evidence URL.",
    });

    const packet = buildCorrectionPacket({
      targetId: "facility-osm-760f52f356d7d3dc9fc1",
      reason: "The displayed operator should be reviewed against the cited register.",
      evidenceUrl: "https://evidence.example.invalid/record/1",
    });
    expect(packet.schemaVersion).toBe("reality-ledger-correction-v1");
    expect(packet.submission).toBe("local-review-packet-only");
    expect(JSON.stringify(packet)).not.toMatch(/endpoint|token|authorization/i);
  });

  it("keeps a generated timestamp stable across feedback and changes it only on generation", () => {
    const state: CorrectionBuilderState = {
      draft: {
        targetId: "facility-osm-760f52f356d7d3dc9fc1",
        reason: "The displayed operator should be reviewed against the cited register.",
        evidenceUrl: "https://evidence.example.invalid/record/1",
      },
      attempted: false,
      copied: false,
      packet: null,
    };
    const generated = reduceCorrectionBuilderState(state, {
      type: "generate",
      generatedAt: "2026-08-30T00:00:00.000Z",
    });
    const feedback = reduceCorrectionBuilderState(generated, { type: "copied" });
    const regenerated = reduceCorrectionBuilderState(feedback, {
      type: "generate",
      generatedAt: "2026-08-30T00:05:00.000Z",
    });

    expect(generated.packet?.generatedAt).toBe("2026-08-30T00:00:00.000Z");
    expect(feedback.packet).toBe(generated.packet);
    expect(feedback.packet?.generatedAt).toBe("2026-08-30T00:00:00.000Z");
    expect(regenerated.packet?.generatedAt).toBe("2026-08-30T00:05:00.000Z");
  });

  it("connects stable validation message IDs to every correction field", () => {
    const markup = renderToStaticMarkup(
      <CorrectionBuilder targets={[{ id: "facility-1", name: "Facility one" }]} />,
    );

    expect(markup).toContain('aria-describedby="correction-target-error"');
    expect(markup).toContain('id="correction-target-error"');
    expect(markup).toContain('aria-describedby="correction-reason-error"');
    expect(markup).toContain('id="correction-reason-error"');
    expect(markup).toContain('aria-describedby="correction-evidence-url-error"');
    expect(markup).toContain('id="correction-evidence-url-error"');
    expect(markup).toContain("Generate packet");
  });
});

describe("route and accessibility contract", () => {
  it("lists every canonical editorial route family", () => {
    const routes = listCanonicalRoutes();

    expect(routes).toEqual(
      expect.arrayContaining([
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
      ]),
    );
  });

  it("provides semantic landmarks, skip navigation, and a visible corpus warning", () => {
    const frame = renderToStaticMarkup(
      <AppFrame>
        <h1>Test page</h1>
      </AppFrame>,
    );
    const warning = renderToStaticMarkup(<CorpusWarning />);

    expect(frame).toContain('href="#main-content"');
    expect(frame).toContain("<nav");
    expect(frame).toContain('id="main-content"');
    expect(frame).toContain("<footer");
    expect(warning).toContain("SYNTHETIC REVIEWED BETA");
    expect(warning).toContain("NOT PUBLIC FACTUAL DATA");
  });

  it("uses the App Router reset callback for error recovery", () => {
    const reset = vi.fn();
    const tree = ErrorBoundary({ error: new Error("local read failed"), reset });

    findButton(tree).props.onClick?.();

    expect(reset).toHaveBeenCalledOnce();
  });
});
