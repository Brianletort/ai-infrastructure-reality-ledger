import type { Metadata } from "next";
import Link from "next/link";

import { ModeLabel, PageIntro, SectionHeading } from "../components/editorial";
import { getEditorialSnapshot } from "../../lib/editorial-data";

export const metadata: Metadata = {
  title: "Deep-review metros",
  description: "Four deep metros with independently reviewed synthetic evidence timelines.",
  alternates: { canonical: "/metros" },
};

export default function MetrosPage() {
  const snapshot = getEditorialSnapshot();

  return (
    <div className="page-shell">
      <PageIntro
        eyebrow="Geographic index · 02"
        title="Deep-review metros"
        summary="Four metro scenarios test evidence chronology, review independence, correction lineage, and activation precision. They are not public facts."
        meta={<ModeLabel />}
      />
      <section className="editorial-section">
        <SectionHeading kicker="Reviewed timeline corpus" title="Exactly 25 timelines per metro" />
        <div className="index-list">
          {snapshot.metros.map((metro, index) => (
            <article className="index-row" key={metro.slug}>
              <span className="index-row__number">{String(index + 1).padStart(2, "0")}</span>
              <h2>
                <Link href={`/metros/${metro.slug}`}>{metro.name}</Link>
              </h2>
              <p>
                {metro.timelineCount} timelines · {metro.eventCount} events ·{" "}
                {Math.round(metro.citationCompleteness * 100)}% citation completeness
              </p>
              <Link className="index-row__arrow" href={`/metros/${metro.slug}`} aria-label={`View ${metro.name}`}>
                ↗
              </Link>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
