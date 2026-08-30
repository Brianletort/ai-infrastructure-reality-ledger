import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FacilityProfile } from "../../components/facility-profile";
import { getSafeFacilities, getSafeFacility } from "../../../lib/editorial-data";

interface CampusPageProps {
  params: Promise<{ id: string }>;
}

export function generateStaticParams() {
  return getSafeFacilities().map((facility) => ({ id: facility.id }));
}

export async function generateMetadata(props: CampusPageProps): Promise<Metadata> {
  const { id } = await props.params;
  const campus = getSafeFacility(id);
  return campus
    ? {
        title: `${campus.name ?? "Unnamed"} campus view`,
        description: `Campus-level evidence view for ${campus.name ?? "an unnamed record"}.`,
        alternates: { canonical: `/campuses/${id}` },
      }
    : { title: "Campus not found" };
}

export default async function CampusPage(props: CampusPageProps) {
  const { id } = await props.params;
  const campus = getSafeFacility(id);
  if (!campus) {
    notFound();
  }
  return <FacilityProfile facility={campus} recordType="Campus" />;
}
