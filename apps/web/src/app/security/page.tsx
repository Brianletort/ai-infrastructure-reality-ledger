import type { Metadata } from "next";

import { InformationPage } from "../components/information-page";

export const metadata: Metadata = {
  title: "Security and precision",
  description: "Location precision, restricted fields, and safe publication controls.",
  alternates: { canonical: "/security" },
};

export default function SecurityPage() {
  return (
    <InformationPage
      eyebrow="Publication controls"
      title="Security and precision"
      summary="Public utility does not require unrestricted precision. The interface publishes only fields allowed by the reviewed local read model."
      sections={[
        {
          title: "Location",
          body: (
            <p>
              Generated coordinates are generalized to 0.01 degree in the underlying distributable
              artifact. This interface omits coordinate values entirely and states the precision
              class instead.
            </p>
          ),
        },
        {
          title: "Restricted fields",
          body: (
            <p>
              Exact geometry, raw source tags, credentials, source payloads, and restricted
              operational metadata are not rendered into pages or comparison state.
            </p>
          ),
        },
        {
          title: "Request paths",
          body: (
            <p>
              Server Components read checked-in local artifacts. Page request paths make no
              third-party network calls, and the correction experience creates local files only.
            </p>
          ),
        },
        {
          title: "Threat reporting",
          body: (
            <p>
              Do not place vulnerability details into public correction packets. Follow the
              repository security policy for coordinated disclosure.
            </p>
          ),
        },
      ]}
    />
  );
}
