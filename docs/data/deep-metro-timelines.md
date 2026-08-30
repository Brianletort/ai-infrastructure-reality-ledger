# Deep-metro timeline methodology

> **SYNTHETIC REVIEWED BETA CORPUS — NOT PUBLIC FACTUAL DATA. Do not use these
> records as evidence of real facilities or events.**

The checked-in deep-metro corpus contains exactly 25 deterministic synthetic campus/facility
timelines for each of Northern Virginia, Dallas–Fort Worth, Phoenix, and Toronto (100 total).
Every timeline, event, evidence packet, signal, citation, review, generated report, and API
response carries the synthetic corpus mode and warning. Names are synthetic, citations use the
reserved `.invalid` domain, and public-fact approval is always false.

## What the beta corpus tests

The fixtures exercise announcement, permit, construction, readiness, activation,
moratorium/policy, correction, contested, superseded, stale, and unknown events. Deliberate
conflict and missingness scenarios test review and reporting behavior without asserting anything
about a real provider, customer, facility, or project.

Each atomic event preserves:

- valid, assertion, source-publication, and retrieval time;
- exact evidence references and citations;
- source authority, directness, and entity-match confidence;
- correction or supersession lineage where applicable;
- explicit synthetic mode, warning, and false public-fact approval.

Events sort by valid time, then assertion time, then stable event identifier.

## Review policy

Generation and review are separate code paths with distinct identities. Every generated timeline
receives a second-pass review. Synthetic approval means only that the fixture is internally valid
for beta testing; it never approves a public fact.

Review fails closed when a citation is missing or invalid, activation lacks two independent
signals with one authoritative source, imagery is the only activation evidence, a required time
is absent, authority/directness/entity-match confidence is absent, correction lineage is broken,
or author and reviewer identities match.

## Reports

`data/reports/deep-metro/` contains JSON and Markdown reports for each metro. They reconcile:

- exactly 25 timelines;
- event and lifecycle-state distributions;
- source-mode distribution;
- citation completeness;
- conflicts and explicit missingness;
- failed, pending, and synthetic-approved review counts;
- public-fact approval count, which is zero in this corpus;
- an activation precision proxy.

The activation precision proxy is the share of synthetic activation events satisfying the
activation evidence policy. It is a fixture-policy check, not a measured real-world precision
estimate.

## Limitations

This corpus has zero real timelines and 100 synthetic timelines. It is not a market inventory,
capacity estimate, completeness claim, provider list, or evidence that any real event occurred.
The official source matrix records verified landing pages and their limitations, but those pages
are not copied into the corpus and are not claimed to expose verified machine endpoints.
