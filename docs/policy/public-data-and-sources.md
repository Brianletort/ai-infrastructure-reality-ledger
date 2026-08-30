# Public-data and source policy

## Admission standard

A source is eligible only when its origin, retrieval method, authority, directness, terms, license,
and intended use can be recorded. Public accessibility is necessary for the default project scope
but does not imply permission to copy or redistribute.

Sources must be scored independently for:

- **authority:** proximity to an accountable issuer or regulator;
- **directness:** whether the evidence directly supports the claim;
- **entity match:** confidence that the source refers to the same real-world entity.

Conflicting evidence is preserved and marked contested; it is not averaged into false precision.

## Redistribution classifications

Every source receives exactly one classification before content is published:

- **`republish`:** license or permission allows redistribution of the source content, subject to
  attribution and other recorded obligations.
- **`derived-only`:** publish only non-reconstructive facts, statistics, or transformations permitted
  by the source terms; do not expose source content.
- **`link-only`:** publish citation metadata and a link, but no copied source content beyond legally
  reviewed minimal quotation.
- **`prohibited`:** do not ingest or publish content. Retain only the minimum compliance record
  needed to prevent re-ingestion.

When rights are unclear, classify as `prohibited` until reviewed.

## Retrieval controls

Connectors must identify themselves where appropriate, honor applicable terms and technical access
controls, apply rate limits, and use destination allowlists. They must not bypass authentication,
CAPTCHAs, paywalls, robots controls, or anti-bot restrictions. Retrieval occurs asynchronously and
records source-publication and retrieval time separately.

## Data minimization

Collect only fields required to substantiate infrastructure claims. Named customer data, personal
data, credentials, employer data, and production operational details are outside the default scope.
Source deletion requests and changed licensing trigger review of snapshots and derived outputs.
