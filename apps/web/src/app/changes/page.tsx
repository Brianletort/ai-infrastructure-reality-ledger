import type { Metadata } from "next";
import Link from "next/link";

import {
  EvidencePanel,
  ModeLabel,
  PageIntro,
  StatusBadge,
  formatDate,
} from "../components/editorial";
import { getEditorialSnapshot } from "../../lib/editorial-data";

export const metadata: Metadata = {
  title: "What changed",
  description: "Recent synthetic reviewed event changes with evidence references.",
  alternates: { canonical: "/changes" },
};

export default function ChangesPage() {
  const changes = getEditorialSnapshot().recentChanges;

  return (
    <div className="page-shell">
      <PageIntro
        eyebrow="Review activity"
        title="What changed"
        summary="A deterministic feed of the latest event in each sampled synthetic timeline. Dates belong to scenarios, not real infrastructure."
        meta={<ModeLabel />}
      />
      <section className="editorial-section" aria-label="Recent synthetic changes">
        <div className="change-list">
          {changes.map((change) => (
            <article key={change.id} className="change-row">
              <time dateTime={change.observedAt}>{formatDate(change.observedAt)}</time>
              <div>
                <p className="change-row__meta">
                  {change.metroName} · {change.eventType} · {change.reviewDecision}
                </p>
                <h2>
                  <Link href={`/timelines/${change.timelineId}`}>{change.facilityName}</Link>
                </h2>
                <p>{change.summary}</p>
              </div>
              <div className="change-row__status">
                <StatusBadge state={change.lifecycleState} />
                <EvidencePanel citations={change.citations} />
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
