import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FacilityProfile } from "../../components/facility-profile";
import { getSafeFacilities, getSafeFacility } from "../../../lib/editorial-data";

interface FacilityPageProps {
  params: Promise<{ id: string }>;
}

export function generateStaticParams() {
  return getSafeFacilities().map((facility) => ({ id: facility.id }));
}

export async function generateMetadata(props: FacilityPageProps): Promise<Metadata> {
  const { id } = await props.params;
  const facility = getSafeFacility(id);
  return facility
    ? {
        title: facility.name ?? "Unnamed facility",
        description: `Evidence and explicit missingness for ${facility.name ?? "an unnamed facility record"}.`,
        alternates: { canonical: `/facilities/${id}` },
      }
    : { title: "Facility not found" };
}

export default async function FacilityPage(props: FacilityPageProps) {
  const { id } = await props.params;
  const facility = getSafeFacility(id);
  if (!facility) {
    notFound();
  }
  return <FacilityProfile facility={facility} recordType="Facility" />;
}
