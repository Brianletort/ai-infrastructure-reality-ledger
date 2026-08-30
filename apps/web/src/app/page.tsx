import type { Metadata } from "next";
import Link from "next/link";

import {
  EvidencePanel,
  ModeLabel,
  SectionHeading,
  StatusBadge,
  formatDate,
} from "./components/editorial";
import { homeContent } from "./site-content";
import { getEditorialSnapshot } from "../lib/editorial-data";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function Home() {
  const snapshot = getEditorialSnapshot();
  const knownOperators =
    snapshot.missingCriticalFields.operator === undefined
      ? 0
      : snapshot.inventoryCount - snapshot.missingCriticalFields.operator;

  return (
    <>
      <section className="home-hero">
        <div className="home-hero__copy">
          <ModeLabel />
          <p className="eyebrow">{homeContent.eyebrow}</p>
          <h1>{homeContent.heading}</h1>
          <p className="home-hero__summary">{homeContent.summary}</p>
          <div className="button-row">
            <Link className="button" href="/changes">
              Read the latest changes
            </Link>
            <Link className="text-link" href="/methodology">
              How review works <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </div>
        <aside className="briefing-stamp" aria-label="Current data edition">
          <span>Current edition</span>
          <strong>{formatDate(snapshot.generatedAt)}</strong>
          <dl>
            <div>
              <dt>Timeline corpus</dt>
              <dd>{snapshot.timelineCount} synthetic reviewed</dd>
            </div>
            <div>
              <dt>Inventory</dt>
              <dd>{snapshot.inventoryCount} fixture-derived records</dd>
            </div>
            <div>
              <dt>Coverage</dt>
              <dd>North America · incomplete</dd>
            </div>
          </dl>
        </aside>
      </section>

      <section className="signal-band" aria-labelledby="signals-title">
        <SectionHeading kicker="Continental signals" title="What the checked-in corpus can support" />
        <div className="signal-grid" id="signals-title">
          <article>
            <span className="signal-grid__number">{snapshot.regions.length}</span>
            <h3>Country-level regions</h3>
            <p>Coverage is fixture-derived and not a market census.</p>
          </article>
          <article>
            <span className="signal-grid__number">{snapshot.metros.length}</span>
            <h3>Deep-review metros</h3>
            <p>Exactly 25 independently checked synthetic timelines per metro.</p>
          </article>
          <article>
            <span className="signal-grid__number">{knownOperators}</span>
            <h3>Explicit operator values</h3>
            <p>Relationships are shown only when the source fixture states an operator.</p>
          </article>
          <article>
            <span className="signal-grid__number">
              {snapshot.missingCriticalFields.capacityMw}
            </span>
            <h3>Unknown capacity fields</h3>
            <p>Absence is preserved; announced and operational capacity are never conflated.</p>
          </article>
        </div>
      </section>

      <section className="globe-entry" aria-labelledby="globe-entry-title">
        <div
          className="globe-entry__visual"
          role="img"
          aria-label="Preview of the evidence globe showing approximate synthetic locations"
        >
          <div className="globe-entry__orb" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <p>Local land geometry · reviewed changes · no remote basemap</p>
        </div>
        <div className="globe-entry__copy">
          <p className="eyebrow">Geographic index</p>
          <h2 id="globe-entry-title">Begin with place. End with evidence.</h2>
          <p>
            Move from continental coverage to region, metro, campus, facility, event, and exact
            reference without presenting generalized coordinates as site precision.
          </p>
          <div className="button-row">
            <Link className="button" href="/globe">
              Open evidence globe
            </Link>
            <Link className="text-link" href="/regions">
              Explore regions
            </Link>
          </div>
        </div>
      </section>

      <section className="editorial-section">
        <SectionHeading
          kicker="Recent review activity"
          title="What changed"
          action={<Link href="/changes">View full feed</Link>}
        />
        <div className="change-list">
          {snapshot.recentChanges.slice(0, 5).map((change) => (
            <article key={change.id} className="change-row">
              <time dateTime={change.observedAt}>{formatDate(change.observedAt)}</time>
              <div>
                <p className="change-row__meta">
                  {change.metroName} · {change.eventType}
                </p>
                <h3>
                  <Link href={`/timelines/${change.timelineId}`}>{change.facilityName}</Link>
                </h3>
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

      <section className="coverage-strip" aria-label="Coverage limitations">
        <div>
          <p className="eyebrow">Coverage status</p>
          <h2>Deliberately incomplete.</h2>
        </div>
        <p>
          {snapshot.limitations[0]} Every page preserves retrieval dates, explicit unknowns, and
          the corpus-mode warning.
        </p>
        <Link href="/coverage">Inspect missingness</Link>
      </section>
    </>
  );
}
