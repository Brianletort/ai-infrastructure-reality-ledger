import type { Metadata } from "next";

import { InformationPage } from "../components/information-page";

export const metadata: Metadata = {
  title: "Methodology",
  description: "How the Reality Ledger separates claims, evidence, time, confidence, and review.",
  alternates: { canonical: "/methodology" },
};

export default function MethodologyPage() {
  return (
    <InformationPage
      eyebrow="Publication method"
      title="Evidence before status"
      summary="The ledger records what a source supports, when it supported it, and how an independent review treated the claim. It does not collapse those distinctions into a single status."
      sections={[
        {
          title: "Atomic events",
          body: (
            <>
              <p>
                Announcements, permits, construction observations, readiness evidence, activation,
                corrections, and supersessions are separate events. Announcement is never treated
                as activation.
              </p>
              <p>
                Every event retains valid-from, assertion, source-publication, and retrieval
                timestamps.
              </p>
            </>
          ),
        },
        {
          title: "Activation threshold",
          body: (
            <p>
              Synthetic activation scenarios require two independent signals and at least one
              authoritative source. Imagery alone cannot support activation.
            </p>
          ),
        },
        {
          title: "Independent review",
          body: (
            <p>
              The checked-in 100-timeline corpus uses a separate validator identity and code path.
              Its approval decision applies only to fixture quality, never to public fact.
            </p>
          ),
        },
        {
          title: "Fail-closed publication",
          body: (
            <p>
              Missing warning labels, review independence, exact citation links, or evidence
              lineage prevent the corpus from loading. Unknown fields remain unknown.
            </p>
          ),
        },
      ]}
    />
  );
}
