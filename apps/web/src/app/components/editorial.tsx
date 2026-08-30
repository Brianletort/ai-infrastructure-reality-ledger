import Link from "next/link";
import type { ReactNode } from "react";

import {
  CORPUS_MODE,
  CORPUS_WARNING,
  type UiCitation,
} from "../../lib/editorial-data";
import { MobileNavigation } from "./mobile-navigation";

const PRIMARY_LINKS = [
  ["/launch", "Launch"],
  ["/regions", "Regions"],
  ["/metros", "Metros"],
  ["/providers", "Providers"],
  ["/changes", "What changed"],
  ["/compare", "Compare"],
] as const;

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(value));
}

export function CorpusWarning({ compact = false }: { compact?: boolean }) {
  return (
    <aside className={compact ? "corpus-warning corpus-warning--compact" : "corpus-warning"}>
      <div className="corpus-warning__label">
        <span className="status-symbol" aria-hidden="true">
          ◇
        </span>
        Corpus mode
      </div>
      <p role="status">
        <strong>SYNTHETIC REVIEWED BETA</strong>
        <span aria-hidden="true"> / </span>
        <strong>NOT PUBLIC FACTUAL DATA</strong>
        {!compact ? (
          <>
            . Records are deterministic reviewed fixtures and must not be used as evidence of real
            facilities or events.
          </>
        ) : null}
      </p>
    </aside>
  );
}

export function AppFrame({ children }: { children: ReactNode }) {
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="masthead">
        <div className="masthead__top">
          <Link href="/" className="wordmark" aria-label="Reality Ledger home">
            <span className="wordmark__mark" aria-hidden="true">
              RL
            </span>
            <span>
              Reality Ledger
              <small>AI infrastructure evidence</small>
            </span>
          </Link>
          <form className="masthead-search" role="search" action="/search">
            <label className="sr-only" htmlFor="masthead-query">
              Search the ledger
            </label>
            <input
              id="masthead-query"
              name="q"
              type="search"
              minLength={2}
              maxLength={100}
              placeholder="Search records"
            />
            <button type="submit">Search</button>
          </form>
          <div className="masthead__utility">
            <Link href="/methodology">Method</Link>
            <Link href="/sources">Sources</Link>
            <Link href="/corrections">Corrections</Link>
          </div>
          <MobileNavigation />
        </div>
        <div className="masthead__nav">
          <nav aria-label="Primary navigation">
            {PRIMARY_LINKS.map(([href, label]) => (
              <Link key={href} href={href}>
                {label}
              </Link>
            ))}
          </nav>
          <p>
            <span className="live-dot" aria-hidden="true" /> Local corpus · {CORPUS_MODE}
          </p>
        </div>
        <CorpusWarning compact />
      </header>
      <main id="main-content" tabIndex={-1}>
        {children}
      </main>
      <footer className="site-footer">
        <div>
          <Link href="/" className="wordmark wordmark--footer">
            Reality Ledger
          </Link>
          <p>
            Open-source, evidence-first infrastructure intelligence. Unknown remains unknown.
          </p>
        </div>
        <nav aria-label="Footer navigation">
          <Link href="/launch">Public beta</Link>
          <Link href="/coverage">Coverage</Link>
          <Link href="/accessibility">Accessibility</Link>
          <Link href="/security">Security &amp; precision</Link>
          <Link href="/contributors">Contributors</Link>
        </nav>
        <p className="site-footer__attribution">
          Inventory attribution: © OpenStreetMap contributors, ODbL 1.0. Timeline corpus: synthetic
          reviewed beta. No external calls are made in page request paths.
        </p>
      </footer>
    </>
  );
}

export function ModeLabel({ publicInventory = false }: { publicInventory?: boolean }) {
  return (
    <span className="mode-label">
      <span aria-hidden="true">◇</span>{" "}
      {publicInventory ? "Synthetic source fixture inventory" : "Synthetic reviewed timeline"}
    </span>
  );
}

export function PageIntro({
  eyebrow,
  title,
  summary,
  meta,
}: {
  eyebrow: string;
  title: string;
  summary: string;
  meta?: ReactNode;
}) {
  return (
    <header className="page-intro">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p className="page-intro__summary">{summary}</p>
      {meta ? <div className="page-intro__meta">{meta}</div> : null}
    </header>
  );
}

export function SectionHeading({
  kicker,
  title,
  action,
}: {
  kicker: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="section-heading">
      <div>
        <p className="eyebrow">{kicker}</p>
        <h2>{title}</h2>
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  );
}

export function StatusBadge({ state }: { state: string }) {
  const readable = state.replaceAll("_", " ");
  const caution = /unknown|contested|stale|hold|superseded/i.test(state);
  return (
    <span className={caution ? "status-badge status-badge--caution" : "status-badge"}>
      <span aria-hidden="true">{caution ? "△" : "●"}</span> {readable}
    </span>
  );
}

export function UnknownValue({
  label,
  value,
  suffix = "",
}: {
  label: string;
  value: string | number | null;
  suffix?: string;
}) {
  const unknown = value === null || value === "";
  return (
    <div className="fact">
      <dt>{label}</dt>
      <dd data-unknown={unknown ? "true" : undefined}>
        {unknown ? (
          <>
            <span aria-hidden="true">?</span> Unknown
          </>
        ) : (
          `${value}${suffix}`
        )}
      </dd>
    </div>
  );
}

export function CitationList({ citations }: { citations: UiCitation[] }) {
  if (citations.length === 0) {
    return <p className="empty-state">No citation is attached. Treat the field as unsupported.</p>;
  }
  return (
    <ol className="citation-list">
      {citations.map((citation) => (
        <li key={citation.id}>
          <div>
            <span className="citation-list__index" aria-hidden="true">
              ↗
            </span>
            <a href={citation.url} rel="noreferrer">
              {citation.title}
            </a>
          </div>
          <p>
            Exact reference: <code>{citation.exactReference}</code>
          </p>
          <p>
            Published {formatDate(citation.sourcePublishedAt)} · Retrieved{" "}
            {citation.retrievedAt.slice(0, 10)}
          </p>
          {citation.attribution ? <p>{citation.attribution}</p> : null}
        </li>
      ))}
    </ol>
  );
}

export function EvidencePanel({
  title = "Evidence",
  citations,
}: {
  title?: string;
  citations: UiCitation[];
}) {
  return (
    <details className="evidence-panel">
      <summary>
        <span>{title}</span>
        <span>{citations.length} reference(s)</span>
      </summary>
      <div className="evidence-panel__body">
        <CitationList citations={citations} />
      </div>
    </details>
  );
}

export function WarningText() {
  return <span className="sr-only">{CORPUS_WARNING}</span>;
}
