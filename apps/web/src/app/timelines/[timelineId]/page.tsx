import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  CitationList,
  ModeLabel,
  PageIntro,
  StatusBadge,
  UnknownValue,
  formatDate,
} from "../../components/editorial";
import { deepMetroRepository } from "../../../lib/deep-metro-repository";
import {
  DEEP_METROS,
  getReviewedTimeline,
  type UiCitation,
} from "../../../lib/editorial-data";

interface TimelinePageProps {
  params: Promise<{ timelineId: string }>;
}

export function generateStaticParams() {
  return DEEP_METROS.flatMap((metro) =>
    deepMetroRepository
      .listMetroTimelines(metro.slug, 25)
      .map((timeline) => ({ timelineId: timeline.timelineId })),
  );
}

export async function generateMetadata(props: TimelinePageProps): Promise<Metadata> {
  const { timelineId } = await props.params;
  const timeline = getReviewedTimeline(timelineId);
  return timeline
    ? {
        title: `${timeline.facilityName} timeline`,
        description: `Atomic event replay and independent review for ${timeline.facilityName}.`,
        alternates: { canonical: `/timelines/${timelineId}` },
      }
    : { title: "Timeline not found" };
}

function packetCitations(
  timeline: NonNullable<ReturnType<typeof getReviewedTimeline>>,
  packetId: string,
): UiCitation[] {
  const packet = timeline.evidencePackets.find((candidate) => candidate.packetId === packetId);
  return (
    packet?.citations.map((citation) => ({
      id: citation.citationId,
      title: citation.title,
      url: citation.url,
      exactReference: citation.exactReference,
      sourcePublishedAt: citation.sourcePublishedAt,
      retrievedAt: citation.retrievedAt,
    })) ?? []
  );
}

export default async function TimelineDetailPage(props: TimelinePageProps) {
  const { timelineId } = await props.params;
  const timeline = getReviewedTimeline(timelineId);
  if (!timeline) {
    notFound();
  }

  return (
    <div className="page-shell">
      <PageIntro
        eyebrow={`${timeline.metro.name} · event replay`}
        title={timeline.facilityName}
        summary={`${timeline.events.length} atomic event${
          timeline.events.length === 1 ? "" : "s"
        }, each linked to an evidence packet and the final independent review decision.`}
        meta={
          <>
            <ModeLabel /> · Timeline ID: {timeline.timelineId}
          </>
        }
      />
      <div className="detail-grid">
        <div className="detail-main">
          <section className="detail-section" aria-labelledby="event-replay-title">
            <h2 id="event-replay-title">Event replay</h2>
            <nav aria-label="Jump to timeline event">
              <ol className="plain-list">
                {timeline.events.map((event, index) => (
                  <li key={event.eventId}>
                    <a href={`#${event.eventId}`}>
                      {String(index + 1).padStart(2, "0")} · {event.eventType} ·{" "}
                      {formatDate(event.validFrom)}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
            <ol className="timeline-list">
              {timeline.events.map((event) => {
                const citations = packetCitations(timeline, event.evidencePacketId);
                return (
                  <li className="timeline-event" id={event.eventId} key={event.eventId}>
                    <div className="timeline-event__head">
                      <time dateTime={event.validFrom}>{formatDate(event.validFrom)}</time>
                      <StatusBadge state={event.lifecycleState} />
                    </div>
                    <h3>{event.eventType.replaceAll("_", " ")}</h3>
                    <p>{event.summary}</p>
                    <dl className="fact-grid">
                      <UnknownValue label="Valid from" value={event.validFrom.slice(0, 10)} />
                      <UnknownValue
                        label="Valid to"
                        value={event.validTo?.slice(0, 10) ?? null}
                      />
                      <UnknownValue label="Asserted" value={event.assertedAt.slice(0, 10)} />
                      <UnknownValue
                        label="Retrieved"
                        value={event.retrievedAt.slice(0, 10)}
                      />
                      <UnknownValue label="Corrects event" value={event.correctsEventId} />
                      <UnknownValue label="Supersedes event" value={event.supersedesEventId} />
                    </dl>
                    <div className="detail-section">
                      <h3>Exact evidence references</h3>
                      <CitationList citations={citations} />
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        </div>
        <aside className="detail-aside" aria-label="Timeline review">
          <section className="detail-section">
            <h2>Review decision</h2>
            <div className="review-block">
              <div className="review-block__decision">
                <strong>{timeline.review.decision.replaceAll("_", " ")}</strong>
                <StatusBadge state={timeline.review.status} />
              </div>
              <p>
                Reviewed {formatDate(timeline.review.reviewedAt)} by{" "}
                {timeline.review.reviewer.reviewerType.replaceAll("-", " ")}.
              </p>
              <p>{timeline.review.independence.rationale}</p>
            </div>
          </section>
          <section className="detail-section">
            <h2>Confidence dimensions</h2>
            {timeline.evidencePackets[0]?.signals[0] ? (
              <dl className="fact-grid">
                <UnknownValue
                  label="Source authority"
                  value={timeline.evidencePackets[0].signals[0].authority || null}
                />
                <UnknownValue
                  label="Directness"
                  value={timeline.evidencePackets[0].signals[0].directness || null}
                />
                <UnknownValue
                  label="Entity match"
                  value={timeline.evidencePackets[0].signals[0].entityMatchConfidence}
                />
                <UnknownValue
                  label="Independent group"
                  value={timeline.evidencePackets[0].signals[0].independenceGroup}
                />
              </dl>
            ) : (
              <p className="empty-state">No evidence signals are available.</p>
            )}
          </section>
          <section className="detail-section">
            <h2>Missingness</h2>
            {timeline.missing.length ? (
              <ul className="missing-list">
                {timeline.missing.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : (
              <p className="empty-state">No missingness markers.</p>
            )}
          </section>
          <section className="detail-section">
            <h2>Correction history</h2>
            {timeline.events.some(
              (event) => event.correctsEventId !== null || event.supersedesEventId !== null,
            ) ? (
              <ul className="plain-list">
                {timeline.events
                  .filter(
                    (event) =>
                      event.correctsEventId !== null || event.supersedesEventId !== null,
                  )
                  .map((event) => (
                    <li key={event.eventId}>
                      {event.eventType} → {event.correctsEventId ?? event.supersedesEventId}
                    </li>
                  ))}
              </ul>
            ) : (
              <p className="empty-state">No correction or supersession events are attached.</p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
