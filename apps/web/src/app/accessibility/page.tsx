import type { Metadata } from "next";

import { InformationPage } from "../components/information-page";

export const metadata: Metadata = {
  title: "Accessibility",
  description: "Accessibility commitments and keyboard interaction for the Reality Ledger.",
  alternates: { canonical: "/accessibility" },
};

export default function AccessibilityPage() {
  return (
    <InformationPage
      eyebrow="Access for every reader"
      title="Accessibility"
      summary="The editorial interface is built for keyboard, screen-reader, reduced-motion, magnified, mobile, and high-contrast use."
      sections={[
        {
          title: "Navigation",
          body: (
            <p>
              A skip link bypasses the masthead. Landmarks, heading hierarchy, labeled navigation,
              visible focus, and canonical page titles support orientation.
            </p>
          ),
        },
        {
          title: "Evidence state",
          body: (
            <p>
              Status cues combine text, symbols, and color. Unknown values are written explicitly;
              no conclusion depends on color alone.
            </p>
          ),
        },
        {
          title: "Motion and layout",
          body: (
            <p>
              The interface honors reduced-motion preferences, reflows across narrow viewports,
              and keeps tabular comparisons horizontally accessible instead of collapsing meaning.
            </p>
          ),
        },
        {
          title: "Feedback",
          body: (
            <p>
              Use the local correction packet to describe an accessibility issue without sending
              data automatically. Maintainer review remains a separate human step.
            </p>
          ),
        },
      ]}
    />
  );
}
