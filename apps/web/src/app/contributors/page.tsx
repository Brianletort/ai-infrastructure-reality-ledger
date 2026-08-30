import type { Metadata } from "next";

import { InformationPage } from "../components/information-page";

export const metadata: Metadata = {
  title: "Contributors",
  description: "How to contribute evidence, adapters, review, design, and corrections safely.",
  alternates: { canonical: "/contributors" },
};

export default function ContributorsPage() {
  return (
    <InformationPage
      eyebrow="Open-source participation"
      title="Contribute with evidence"
      summary="The ledger welcomes source research, adapters, independent review, accessibility work, and corrections that preserve rights, uncertainty, and lineage."
      sections={[
        {
          title: "Start with scope",
          body: (
            <p>
              State the claim, allowed source class, acceptance criteria, risk tier, and required
              evaluations before implementation. Keep factual replacement separate from fixture
              behavior.
            </p>
          ),
        },
        {
          title: "Bring exact support",
          body: (
            <p>
              Cite the exact page, section, row, or record; preserve source-publication and
              retrieval dates; and document authority, directness, entity match, and license.
            </p>
          ),
        },
        {
          title: "Review independently",
          body: (
            <p>
              Authors do not approve their own factual timelines. Activation claims require
              independent signals, and every correction must retain the superseded lineage.
            </p>
          ),
        },
        {
          title: "Respect boundaries",
          body: (
            <p>
              Never bypass access controls, automate an interactive portal without permission,
              expose restricted location data, or substitute inference for an explicit
              relationship.
            </p>
          ),
        },
      ]}
    />
  );
}
