import type { Metadata } from "next";

import { ModeLabel, PageIntro, SectionHeading, UnknownValue } from "../components/editorial";
import { generatedInventoryRepository } from "../../lib/generated-inventory-repository";

export const metadata: Metadata = {
  title: "Sources",
  description: "Source registry, rights, retrieval state, and publication limitations.",
  alternates: { canonical: "/sources" },
};

export default function SourcesPage() {
  const sources = generatedInventoryRepository.listSourceManifests(50);

  return (
    <div className="page-shell">
      <PageIntro
        eyebrow="Rights-aware registry"
        title="Sources and permitted use"
        summary="The source registry distinguishes authority, directness, redistribution rights, automation policy, and missing retrieval state. It does not expose source payloads."
        meta={<ModeLabel publicInventory />}
      />
      <section className="editorial-section">
        <SectionHeading kicker="Configured manifests" title={`${sources.length} source policies`} />
        <div className="index-list">
          {sources.map((source, index) => (
            <article className="index-row" key={source.adapterId}>
              <span className="index-row__number">{String(index + 1).padStart(2, "0")}</span>
              <div>
                <h2>
                  <a href={source.sourceUrl} rel="noreferrer">
                    {source.name}
                  </a>
                </h2>
                <p>{source.publisher}</p>
              </div>
              <p>
                {source.authority} · {source.directness} · {source.redistribution} ·{" "}
                {source.allowedUse}
              </p>
              <span className="index-row__arrow">↗</span>
            </article>
          ))}
        </div>
      </section>
      <section className="detail-grid">
        <div className="detail-section">
          <h2>Registry interpretation</h2>
          <p className="empty-state">
            “Configured” does not mean successfully retrieved, complete, factual, or approved for
            republication. Each manifest is enforced according to its redistribution and
            automation fields.
          </p>
        </div>
        <aside className="detail-section">
          <h2>Inventory provenance</h2>
          <dl className="fact-grid">
            <UnknownValue label="License" value="ODbL-1.0" />
            <UnknownValue label="Attribution" value="© OpenStreetMap contributors" />
            <UnknownValue label="Share-alike" value="Required" />
            <UnknownValue label="Completeness" value="Not complete" />
          </dl>
        </aside>
      </section>
    </div>
  );
}
