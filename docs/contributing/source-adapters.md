# Source-adapter authoring guide

## Admission checklist

Before implementation, document the public source URL, accountable publisher, authority,
directness, cadence, rate limit, attribution, sensitivity, terms, and one redistribution class.
Unclear rights are `prohibited`. Do not bypass authentication, CAPTCHAs, paywalls, robots controls,
or anti-bot restrictions. Real retrieval capability requires the project's Tier-2 architecture,
data, security, and performance gates.

## Protocol

Adapters implement three explicit stages:

- `fetch` obtains raw content through a governed worker client or a supplied fixture;
- `parse` extracts source-shaped fields without ledger interpretation;
- `normalize` creates stable candidate records for validation and entity resolution.

The manifest's `protocol_version`/`protocolVersion` allows harnesses to detect incompatible adapter
changes. Python contracts live in `reality_ledger_worker.source_adapter`; matching TypeScript
contracts live in `@reality-ledger/source-sdk`.

## Synthetic fixture pattern

Every adapter must ship deterministic, non-sensitive fixtures. A minimal Python test uses a payload
such as `SYN-001|Synthetic North Facility` and an expected normalized record. Run it through
`run_adapter_fixture`, which reports the failed stage and returns no partial records on failure.
The TypeScript equivalent is `runSyntheticFixture`.

See the [synthetic source request, correction, and adapter examples](../launch/synthetic-contribution-examples.md)
before opening a contribution.

Fixtures must not contain real company names, customers, credentials, copied source pages, or
production operational details. They should cover:

1. a representative successful record;
2. malformed source content;
3. missing required identifiers;
4. attribution and redistribution behavior;
5. a parser change that would alter normalized output.

## Redistribution behavior

- `republish`: a permitted snapshot may be stored and disclosed with attribution.
- `derived-only`: a permitted internal snapshot may be stored, but source bytes cannot be
  published or exported.
- `link-only`: retain citation metadata and a link; do not snapshot copied content.
- `prohibited`: retain only the minimum compliance record needed to prevent ingestion.

Hash equality proves byte equality only. It never upgrades redistribution rights.

## Official portal and manual/link-only adapters

Use `manual-link-only` when only an official landing page has been verified. Set
`machineEndpoint` to `null`, prohibit interactive scraping, document the page's actual scope, and
return `manual-review-required` from configuration health checks. Health in this mode means the
adapter configuration is safe; it does not claim that a portal record was fetched.

Do not invent an API, scrape an interactive portal, or treat a landing/guidance page as direct
event evidence. A later `verified-machine-endpoint` adapter requires official endpoint
documentation, an offline fixture, worker-only bounded retrieval, source-health tests, and Tier-2
approval. See the deep-metro official source matrix and public-source replacement workflow.

## Health and operations

Source health records the adapter and protocol version, check time, terminal stage, health status,
normalized records on success, and a bounded error on failure. Fetching runs only from asynchronous
jobs. Safe retries must be idempotent; terminal failures transition to `dead_letter` after
`max_attempts`.
