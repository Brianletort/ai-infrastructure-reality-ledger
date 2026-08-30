import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  ModeLabel,
  PageIntro,
  SectionHeading,
  UnknownValue,
  formatDate,
} from "../../components/editorial";
import {
  getExplicitProvider,
  getExplicitProviders,
  getSafeFacilities,
} from "../../../lib/editorial-data";

interface ProviderPageProps {
  params: Promise<{ id: string }>;
}

export function generateStaticParams() {
  return getExplicitProviders().map((provider) => ({ id: provider.id }));
}

export async function generateMetadata(props: ProviderPageProps): Promise<Metadata> {
  const { id } = await props.params;
  const provider = getExplicitProvider(id);
  return provider
    ? {
        title: provider.name,
        description: `Explicit fixture-derived operator references for ${provider.name}.`,
        alternates: { canonical: `/providers/${id}` },
      }
    : { title: "Provider not found" };
}

export default async function ProviderDetailPage(props: ProviderPageProps) {
  const { id } = await props.params;
  const provider = getExplicitProvider(id);
  if (!provider) {
    notFound();
  }
  const facilities = getSafeFacilities().filter((facility) =>
    provider.facilityIds.includes(facility.id),
  );

  return (
    <div className="page-shell">
      <PageIntro
        eyebrow="Provider detail · explicit values only"
        title={provider.name}
        summary="This organization view is an index of exact operator strings in the synthetic source fixture. It makes no claim about ownership, tenancy, corporate control, or current operations."
        meta={
          <>
            <ModeLabel publicInventory /> · Retrieved {formatDate(provider.retrievalDate)}
          </>
        }
      />
      <div className="detail-grid">
        <div className="detail-main">
          <section className="detail-section">
            <SectionHeading
              kicker="Explicit source relationships"
              title="Attributed facility records"
            />
            <div className="index-list">
              {facilities.map((facility, index) => (
                <article className="index-row" key={facility.id}>
                  <span className="index-row__number">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3>
                    <Link href={`/facilities/${facility.id}`}>
                      {facility.name ?? "Unnamed facility"}
                    </Link>
                  </h3>
                  <p>
                    {facility.location.locality ?? "Locality unknown"} · source says operator:{" "}
                    {provider.name}
                  </p>
                  <span className="index-row__arrow">↗</span>
                </article>
              ))}
            </div>
          </section>
        </div>
        <aside className="detail-aside">
          <section className="detail-section">
            <h2>Organization attributes</h2>
            <dl className="fact-grid">
              <UnknownValue label="Headquarters" value={null} />
              <UnknownValue label="Parent organization" value={null} />
              <UnknownValue label="Operating status" value={null} />
              <UnknownValue label="Capacity portfolio" value={null} />
            </dl>
          </section>
          <section className="detail-section">
            <h2>Relationship rule</h2>
            <p className="empty-state">
              {provider.facilityCount} facility record
              {provider.facilityCount === 1 ? "" : "s"} contain this exact operator value. No other
              relationships were inferred.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
