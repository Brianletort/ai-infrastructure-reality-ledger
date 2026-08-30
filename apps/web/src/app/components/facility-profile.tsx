import Link from "next/link";

import type { SafeFacility } from "../../lib/editorial-data";
import {
  EvidencePanel,
  ModeLabel,
  PageIntro,
  StatusBadge,
  UnknownValue,
} from "./editorial";

export function FacilityProfile({
  facility,
  recordType,
}: {
  facility: SafeFacility;
  recordType: "Campus" | "Facility";
}) {
  return (
    <div className="page-shell">
      <PageIntro
        eyebrow={`${recordType} detail · ${facility.location.countryCode}`}
        title={facility.name ?? `Unnamed ${recordType.toLowerCase()}`}
        summary="A fixture-derived public inventory record. Presence supports only the fields explicitly displayed; it does not establish operational status, capacity, tenant, or ownership."
        meta={
          <>
            <ModeLabel publicInventory />
            <br />
            Record ID: {facility.id}
          </>
        }
      />
      <div className="detail-grid">
        <div className="detail-main">
          <section className="detail-section" aria-labelledby="identity-title">
            <h2 id="identity-title">Identity and stated attributes</h2>
            <dl className="fact-grid">
              <UnknownValue label="Record name" value={facility.name} />
              <UnknownValue label="Explicit operator" value={facility.operator} />
              <UnknownValue label="Facility type" value={facility.facilityType} />
              <UnknownValue
                label="Commissioned capacity"
                value={facility.capacityMw}
                suffix=" MW"
              />
              <UnknownValue label="Lifecycle state" value={facility.lifecycleState} />
              <UnknownValue
                label="Aliases"
                value={facility.aliases.length > 0 ? facility.aliases.join(", ") : null}
              />
            </dl>
          </section>

          <section className="detail-section" aria-labelledby="timeline-title">
            <h2 id="timeline-title">Timeline</h2>
            <div className="empty-state">
              No reviewed timeline is linked to this generated inventory record. The synthetic
              deep-metro scenarios are deliberately not inferred as relationships.{" "}
              {facility.location.metro ? (
                <Link
                  href={`/metros/${
                    facility.location.metro === "Dallas–Fort Worth"
                      ? "dallas-fort-worth"
                      : facility.location.metro.toLowerCase().replaceAll(" ", "-")
                  }`}
                >
                  View the separate {facility.location.metro} scenario corpus.
                </Link>
              ) : null}
            </div>
          </section>

          <section className="detail-section" aria-labelledby="evidence-title">
            <h2 id="evidence-title">Source citations</h2>
            <EvidencePanel title="Open exact evidence references" citations={facility.citations} />
          </section>
        </div>

        <aside className="detail-aside" aria-label="Record assessment">
          <section className="detail-section">
            <h2>Location precision</h2>
            <dl className="fact-grid">
              <UnknownValue label="Country" value={facility.location.countryCode} />
              <UnknownValue label="Macro region" value={facility.location.macroRegion} />
              <UnknownValue label="Metro" value={facility.location.metro} />
              <UnknownValue label="Locality" value={facility.location.locality} />
              <UnknownValue label="Geometry class" value={facility.location.geometryType} />
              <UnknownValue
                label="Published precision"
                value={facility.location.coordinatePrecision}
              />
            </dl>
            <p className="empty-state">
              Exact coordinates and source tags are restricted from this view. Published location
              precision is generalized.
            </p>
          </section>

          <section className="detail-section">
            <h2>Evidence state</h2>
            <StatusBadge state={facility.lifecycleState} />
            <dl className="fact-grid">
              <UnknownValue label="Overall confidence" value={null} />
              <UnknownValue label="Source authority" value={null} />
              <UnknownValue label="Directness" value={null} />
              <UnknownValue label="Entity match" value={null} />
            </dl>
          </section>

          <section className="detail-section">
            <h2>Missingness</h2>
            {facility.missing.length ? (
              <ul className="missing-list">
                {facility.missing.map((field) => (
                  <li key={field}>{field}</li>
                ))}
              </ul>
            ) : (
              <p className="empty-state">No missingness markers were emitted.</p>
            )}
          </section>

          <section className="detail-section">
            <h2>Correction history</h2>
            <p className="empty-state">
              No correction lineage is attached to this generated inventory record.{" "}
              <Link href="/corrections">Generate a correction packet.</Link>
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
