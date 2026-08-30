# Editorial intelligence interface

## Information architecture

The public beta is organized around an evidence drill-down:

1. Home briefing: corpus status, continental signals, missingness, recent reviewed changes, and a
   static globe entry point.
2. Place: region index/detail, deep-metro index/detail, then campus/facility records.
3. Organization: provider index/detail, limited to explicit operator values in source fixtures.
4. Evidence: timeline event replay, exact references, source/retrieval dates, confidence
   dimensions, independent review, and correction/supersession lineage.
5. Investigation: bounded local search, two-to-four-record comparison, and “What changed.”
6. Trust: methodology, coverage, sources, corrections, accessibility, security/precision, and
   contributor guidance.

The cinematic map is intentionally represented by an accessible static placeholder. No map or
heavy visualization library is included in Task 5.

## Canonical route map

| Route | Purpose | Rendering |
| --- | --- | --- |
| `/` | Intelligence briefing | Server Component |
| `/regions` | Region coverage index | Server Component |
| `/regions/[region]` | Region inventory detail | Server Component, static params |
| `/metros` | Four deep-review metros | Server Component |
| `/metros/[metro]` | Metro metrics and 25 timelines | Server Component, static params |
| `/campuses/[id]` | Campus interpretation of a safe inventory record | Server Component |
| `/facilities/[id]` | Facility identity, precision, evidence, and missingness | Server Component |
| `/providers` | Explicit operator values only | Server Component |
| `/providers/[id]` | Explicit source-attributed facility links | Server Component |
| `/timelines/[timelineId]` | Atomic event replay and review | Server Component, static params |
| `/search?q=` | Bounded grouped search | Server Component with async `searchParams` |
| `/compare?id=&id=` | Two-to-four-record factual comparison | Server page + selector island |
| `/changes` | Recent synthetic reviewed event feed | Server Component |
| `/corrections` | Local correction packet generation | Server page + form island |
| `/methodology` | Evidence/review method | Server Component |
| `/coverage` | Coverage and missingness | Server Component |
| `/sources` | Rights-aware source registry | Server Component |
| `/accessibility` | Access commitments | Server Component |
| `/security` | Precision and publication controls | Server Component |
| `/contributors` | Safe contribution guidance | Server Component |

Global `loading`, `error`, and `not-found` boundaries fail clearly without exposing server errors.

## Design tokens

Tokens live in `apps/web/src/app/globals.css`.

- Surfaces: `--paper`, `--paper-raised`, `--paper-high`
- Text: `--ink`, `--ink-soft`, `--ink-dim`
- Structure: `--rule`, `--rule-bright`
- Evidence/support: `--signal`, `--signal-dark`
- Caution/unknown: `--amber`, `--amber-dark`
- Validation error: `--danger`
- Layout: `--max`, `--gutter`
- Type: self-hosted `next/font` Geist Sans and Geist Mono variables

Status is never communicated by color alone. Supported states use a filled-circle symbol and text;
caution/unknown states use a triangle or question mark plus text. Focus uses a high-contrast amber
outline. Motion is limited and disabled by `prefers-reduced-motion`.

## Content style

- Lead with what the evidence can support, not with market conclusions.
- Always state corpus mode near the top of the page and globally in the masthead.
- Use “synthetic reviewed” and “not public factual data” together.
- Write “unknown” rather than blank, zero, unavailable-as-fact, or inferred.
- Distinguish inventory fixture records from independently reviewed timeline fixtures.
- Preserve exact references, source publication dates, retrieval dates, and review decisions.
- Never infer provider, owner, tenant, campus, or facility relationships.
- Call incomplete coverage “incomplete”; do not use it to estimate market size.
- Describe generalized precision without rendering restricted coordinates or source tags.

## Rendering and data boundaries

Pages read checked-in JSON through server-only repository modules. There are no page request-path
network calls and no client data-fetch waterfalls. Client JavaScript is limited to mobile
navigation, comparison selection, and local correction-packet generation. Evidence disclosure uses
native accessible `details` elements.

Safe facility view models omit `sourceTags`, display coordinates, and exact-geometry fields before
rendering. The timeline repository validates the warning, synthetic mode, false public-fact
approval, review status, and all nested labels before returning records.

## Accessibility behavior

- Skip link targets `#main-content`.
- Header, primary navigation, main, complementary, section, and footer landmarks are explicit.
- Dynamic result and correction feedback use status/alert semantics.
- Comparison uses a captioned table with row and column headers.
- Event replay has a keyboard-accessible jump list and stable event fragment identifiers.
- Responsive layouts preserve reading order and horizontal comparison access.
- Reduced-motion preferences eliminate smooth scrolling and animation duration.
