import type { Metadata } from "next";
import Link from "next/link";

import { ModeLabel, PageIntro } from "../components/editorial";
import {
  parseSearchTerm,
  searchEditorial,
  type SearchResultKind,
} from "../../lib/editorial-data";

interface SearchPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata(props: SearchPageProps): Promise<Metadata> {
  const { q } = await props.searchParams;
  const parsed = parseSearchTerm(q);
  return {
    title: parsed.ok ? `Search: ${parsed.value}` : "Search",
    description: "Search the bounded local Reality Ledger corpus.",
    alternates: {
      canonical: parsed.ok ? `/search?q=${encodeURIComponent(parsed.value)}` : "/search",
    },
  };
}

const GROUP_LABELS: Record<SearchResultKind, string> = {
  facility: "Facilities",
  provider: "Providers",
  metro: "Metros",
  timeline: "Synthetic timelines",
};

export default async function SearchPage(props: SearchPageProps) {
  const parameters = await props.searchParams;
  const hasQuery = parameters.q !== undefined;
  const parsed = parseSearchTerm(parameters.q);
  const results = parsed.ok ? searchEditorial(parsed.value) : [];

  return (
    <div className="page-shell">
      <PageIntro
        eyebrow="Bounded local search"
        title="Search the ledger"
        summary="Search facility names, explicit operators, metros, and synthetic scenario timelines. Results come from checked-in local data only."
        meta={<ModeLabel />}
      />
      <form className="search-form" role="search" action="/search">
        <label className="sr-only" htmlFor="ledger-query">
          Search the ledger
        </label>
        <input
          id="ledger-query"
          name="q"
          type="search"
          minLength={2}
          maxLength={100}
          defaultValue={parsed.ok ? parsed.value : ""}
          placeholder="Try “Northern Virginia” or “Synthetic Operator”"
        />
        <button type="submit">Search</button>
      </form>
      {!hasQuery ? (
        <p className="empty-state">
          Enter 2–100 characters. Search is capped at 25 results and makes no external requests.
        </p>
      ) : !parsed.ok ? (
        <p className="error-state" role="alert">
          {parsed.error}
        </p>
      ) : results.length === 0 ? (
        <p className="empty-state">
          No local records match “{parsed.value}”. Unknown records are not synthesized.
        </p>
      ) : (
        <div className="search-groups" aria-live="polite">
          {(Object.keys(GROUP_LABELS) as SearchResultKind[]).map((kind) => {
            const group = results.filter((result) => result.kind === kind);
            if (group.length === 0) {
              return null;
            }
            return (
              <section className="search-group" key={kind}>
                <h2>{GROUP_LABELS[kind]}</h2>
                <div className="index-list">
                  {group.map((result, index) => (
                    <article className="index-row" key={`${kind}-${result.id}`}>
                      <span className="index-row__number">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <h3>
                        <Link href={result.href}>{result.title}</Link>
                      </h3>
                      <p>{result.context}</p>
                      <Link
                        className="index-row__arrow"
                        href={result.href}
                        aria-label={`Open ${result.title}`}
                      >
                        ↗
                      </Link>
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
