import type { Metadata } from "next";
import Link from "next/link";

import { ModeLabel, PageIntro, SectionHeading } from "../components/editorial";
import { getExplicitProviders } from "../../lib/editorial-data";

export const metadata: Metadata = {
  title: "Providers",
  description: "Provider index limited to explicit operator values in the synthetic fixture inventory.",
  alternates: { canonical: "/providers" },
};

export default function ProvidersPage() {
  const providers = getExplicitProviders();

  return (
    <div className="page-shell">
      <PageIntro
        eyebrow="Organization index"
        title="Explicit operators"
        summary="Only operator strings stated in the checked-in fixture inventory appear here. The ledger does not infer ownership, tenancy, affiliation, or provider relationships."
        meta={<ModeLabel publicInventory />}
      />
      <section className="editorial-section">
        <SectionHeading kicker="Provider records" title={`${providers.length} explicit values`} />
        <div className="index-list">
          {providers.map((provider, index) => (
            <article className="index-row" key={provider.id}>
              <span className="index-row__number">{String(index + 1).padStart(2, "0")}</span>
              <h2>
                <Link href={`/providers/${provider.id}`}>{provider.name}</Link>
              </h2>
              <p>
                {provider.facilityCount} explicitly attributed facilit
                {provider.facilityCount === 1 ? "y" : "ies"} · no inferred links
              </p>
              <Link className="index-row__arrow" href={`/providers/${provider.id}`} aria-label={`View ${provider.name}`}>
                ↗
              </Link>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
