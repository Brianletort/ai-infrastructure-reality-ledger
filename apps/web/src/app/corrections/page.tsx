import type { Metadata } from "next";

import { CorrectionBuilder } from "../components/correction-builder";
import { ModeLabel, PageIntro } from "../components/editorial";
import { deepMetroRepository } from "../../lib/deep-metro-repository";
import { DEEP_METROS, getSafeFacilities } from "../../lib/editorial-data";

export const metadata: Metadata = {
  title: "Corrections",
  description: "Validate and generate a local Reality Ledger correction packet.",
  alternates: { canonical: "/corrections" },
};

export default function CorrectionsPage() {
  const targets = [
    ...getSafeFacilities().map((facility) => ({
      id: facility.id,
      name: facility.name ?? `Unnamed facility · ${facility.id}`,
    })),
    ...DEEP_METROS.flatMap((metro) =>
      deepMetroRepository.listMetroTimelines(metro.slug, 25),
    ).map((timeline) => ({
      id: timeline.timelineId,
      name: `${timeline.facilityName} · synthetic timeline`,
    })),
  ];

  return (
    <div className="page-shell">
      <PageIntro
        eyebrow="Local-only workflow"
        title="Propose a correction"
        summary="Create a structured review packet without transmitting data. Validation, preview, copy, and download happen entirely in your browser."
        meta={<ModeLabel />}
      />
      <CorrectionBuilder targets={targets} />
      <div className="prose">
        <h2>What happens next</h2>
        <div>
          <p>
            The downloaded packet is not a submission and makes no external mutation. A maintainer
            must independently verify the evidence, apply source-rights rules, and preserve
            correction lineage before any record changes.
          </p>
        </div>
        <h2>Do not include</h2>
        <div>
          <p>
            Do not place credentials, personal data, restricted coordinates, source payloads, or
            confidential material in a correction packet.
          </p>
        </div>
      </div>
    </div>
  );
}
