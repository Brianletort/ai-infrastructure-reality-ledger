import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  ModeLabel,
  PageIntro,
  SectionHeading,
  StatusBadge,
} from "../../components/editorial";
import { deepMetroRepository } from "../../../lib/deep-metro-repository";
import { DEEP_METROS, getMetro } from "../../../lib/editorial-data";

interface MetroPageProps {
  params: Promise<{ metro: string }>;
}

export function generateStaticParams() {
  return DEEP_METROS.map((metro) => ({ metro: metro.slug }));
}

export async function generateMetadata(props: MetroPageProps): Promise<Metadata> {
  const { metro: slug } = await props.params;
  const metro = getMetro(slug);
  return metro
    ? {
        title: `${metro.name} timelines`,
        description: `${metro.timelineCount} synthetic reviewed evidence timelines for ${metro.name}.`,
        alternates: { canonical: `/metros/${metro.slug}` },
      }
    : { title: "Metro not found" };
}

export default async function MetroDetailPage(props: MetroPageProps) {
  const { metro: slug } = await props.params;
  const metro = getMetro(slug);
  if (!metro) {
    notFound();
  }
  const timelines = deepMetroRepository.listMetroTimelines(slug, 25);

  return (
    <div className="page-shell">
      <PageIntro
        eyebrow={`${metro.countryCode} · ${metro.region}`}
        title={metro.name}
        summary={`${metro.timelineCount} deterministic scenarios preserve atomic evidence events, exact references, missingness, and independent review decisions.`}
        meta={<ModeLabel />}
      />
      <section className="signal-band">
        <div className="signal-grid">
          <article>
            <span className="signal-grid__number">{metro.timelineCount}</span>
            <h3>Reviewed timelines</h3>
            <p>Every record is approved only as a synthetic fixture.</p>
          </article>
          <article>
            <span className="signal-grid__number">{metro.eventCount}</span>
            <h3>Atomic events</h3>
            <p>Announcement, permit, construction, readiness, activation, and correction states.</p>
          </article>
          <article>
            <span className="signal-grid__number">
              {Math.round(metro.citationCompleteness * 100)}%
            </span>
            <h3>Citation completeness</h3>
            <p>Completeness does not convert a fixture into a public fact.</p>
          </article>
          <article>
            <span className="signal-grid__number">{metro.missingCount}</span>
            <h3>Missingness markers</h3>
            <p>Unknown and unsupported states remain visible.</p>
          </article>
        </div>
      </section>
      <section className="editorial-section">
        <SectionHeading kicker="Scenario ledger" title="Reviewed facility timelines" />
        <div className="index-list">
          {timelines.map((timeline, index) => (
            <article className="index-row" key={timeline.timelineId}>
              <span className="index-row__number">{String(index + 1).padStart(2, "0")}</span>
              <h2>
                <Link href={`/timelines/${timeline.timelineId}`}>{timeline.facilityName}</Link>
              </h2>
              <p>
                {timeline.eventCount} event{timeline.eventCount === 1 ? "" : "s"} ·{" "}
                {timeline.missing.length} missingness marker
                {timeline.missing.length === 1 ? "" : "s"}
              </p>
              <StatusBadge state={timeline.latestLifecycleState} />
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
