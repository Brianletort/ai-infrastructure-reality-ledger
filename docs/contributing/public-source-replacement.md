# Public-source replacement workflow

The checked-in deep-metro corpus is synthetic and not public factual data. Replacement is a
reviewed migration, not a relabeling exercise. Synthetic review decisions never transfer to
public facts.

## Replace a fixture safely

1. Select a source from the verified official source matrix. Treat all current entries as
   `manual-link-only`; no current configuration asserts a machine endpoint.
2. Access the official source manually. Do not scrape interactive portals, bypass controls, infer
   undocumented endpoints, or treat a guidance/landing page as an event record.
3. Confirm that the specific record supports the specific facility and event. Record the official
   URL, exact record/page/section reference, publisher, source-publication time, retrieval time,
   authority, directness, entity-match confidence, rights, and limitations.
4. Preserve source bytes only when redistribution policy permits. Link-only evidence retains
   citation metadata and an exact reference, not copied portal content.
5. Create a new candidate in `public-factual-reviewed` mode. Use no synthetic identifier, name, or
   `.invalid` citation. Set review status to pending and public-fact approval to false.
6. Run schema and fail-closed validation. Missing times, citations, confidence dimensions, or
   broken lineage stop publication.
7. For activation, obtain at least two independent signals, including one authoritative source.
   Imagery alone cannot activate a timeline.
8. Dispatch an independent reviewer whose identity differs from the author. The reviewer verifies
   the source directly, repeats entity matching, checks conflicts and lineage, and records every
   checklist result and adjudication note.
9. Publish only after an explicit `approve_public_fact` decision. A rejected or pending candidate
   remains unavailable from factual public views.
10. Regenerate metro reports, verify real-versus-synthetic counts, run all root and Python checks,
    inspect API warnings/modes, and obtain the Tier-2 data/security/performance/merge reviews.

## Adding a machine adapter later

A machine endpoint may be configured only after its official documentation, terms, rate limits,
and response contract are verified. Add a new versioned adapter, an offline synthetic fixture,
source-health tests, bounded worker-only retrieval, and required Tier-2 approvals. Never convert a
manual portal configuration by guessing an endpoint, and never add network access to a web request
handler.

## Contributor evidence package

Submit the candidate timeline, exact source references, source-rights classification, immutable
evidence identifier when permitted, author identity, independent review record, generated report
diff, and exact verification results. Do not include credentials, copied prohibited content,
customer-confidential information, or unsupported provider/capacity/activation assertions.
