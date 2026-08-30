import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ModeLabel, PageIntro, SectionHeading, StatusBadge } from "../../components/editorial";
import { getEditorialSnapshot, getRegion } from "../../../lib/editorial-data";

interface RegionPageProps {
  params: Promise<{ region: string }>;
}

export function generateStaticParams() {
  return getEditorialSnapshot().regions.map((region) => ({ region: region.slug }));
}

export async function generateMetadata(props: RegionPageProps): Promise<Metadata> {
  const { region: slug } = await props.params;
  const region = getRegion(slug);
  return region
    ? {
        title: region.name,
        description: `Fixture-derived facility coverage for ${region.name}.`,
        alternates: { canonical: `/regions/${region.slug}` },
      }
    : { title: "Region not found" };
}

export default async function RegionDetailPage(props: RegionPageProps) {
  const { region: slug } = await props.params;
  const region = getRegion(slug);
  if (!region) {
    notFound();
  }

  return (
    <div className="page-shell">
      <PageIntro
        eyebrow="Region detail"
        title={region.name}
        summary={`${region.facilityCount} checked-in inventory record${
          region.facilityCount === 1 ? "" : "s"
        }. The inventory is incomplete and does not represent total regional capacity.`}
        meta={<ModeLabel publicInventory />}
      />
      <section className="editorial-section">
        <SectionHeading kicker="Facility records" title="What is explicitly present" />
        <div className="index-list">
          {region.facilities.map((facility, index) => (
            <article className="index-row" key={facility.id}>
              <span className="index-row__number">{String(index + 1).padStart(2, "0")}</span>
              <h2>
                <Link href={`/facilities/${facility.id}`}>
                  {facility.name ?? "Unnamed facility"}
                </Link>
              </h2>
              <p>
                {facility.location.locality ?? "Locality unknown"} ·{" "}
                {facility.operator ?? "Operator unknown"}
              </p>
              <StatusBadge state={facility.lifecycleState} />
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
