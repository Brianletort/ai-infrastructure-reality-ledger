import type { Metadata } from "next";
import Link from "next/link";

import { ModeLabel, PageIntro, SectionHeading } from "../components/editorial";
import { getEditorialSnapshot } from "../../lib/editorial-data";

export const metadata: Metadata = {
  title: "Regions",
  description: "Region-level coverage and missingness in the checked-in North American inventory.",
  alternates: { canonical: "/regions" },
};

export default function RegionsPage() {
  const snapshot = getEditorialSnapshot();

  return (
    <div className="page-shell">
      <PageIntro
        eyebrow="Geographic index · 01"
        title="Regions"
        summary="A deliberately bounded view of the checked-in North American inventory. Counts describe fixture coverage, not market size."
        meta={<ModeLabel publicInventory />}
      />
      <section className="editorial-section">
        <SectionHeading kicker="Inventory coverage" title="Three regions, six records" />
        <div className="index-list">
          {snapshot.regions.map((region, index) => (
            <article className="index-row" key={region.slug}>
              <span className="index-row__number">{String(index + 1).padStart(2, "0")}</span>
              <h2>
                <Link href={`/regions/${region.slug}`}>{region.name}</Link>
              </h2>
              <p>
                {region.facilityCount} fixture-derived facilit
                {region.facilityCount === 1 ? "y" : "ies"} · incomplete coverage
              </p>
              <Link className="index-row__arrow" href={`/regions/${region.slug}`} aria-label={`View ${region.name}`}>
                ↗
              </Link>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
