# Security and threat model

## Protected assets

- integrity of claims, evidence, correction history, and provenance;
- source licenses and redistribution decisions;
- availability of the public read experience;
- contributor and reporter privacy;
- credentials and infrastructure configuration, when those are introduced.

## Trust boundaries and threats

| Boundary | Representative threats | Required controls |
| --- | --- | --- |
| Internet to retrieval worker | SSRF, redirects to private networks, oversized files, malware | Scheme and destination allowlists, DNS/IP checks, size/time limits, sandboxed parsing |
| Source content to parser | Prompt injection, parser exploits, formula/script payloads | Treat content as data, no tool authority, content-type validation, patched parsers |
| Worker to snapshot store | Tampering, duplicate or mutable evidence | Content hashes, immutable writes, retention policy, audit events |
| Worker to database | Injection, over-privileged writes, corrupted normalization | Parameterized queries, least privilege, schema validation, idempotency |
| Database/read models to web | unauthorized fields, stale policy decisions | Explicit projections, field allowlists, cache invalidation, correction status |
| Public web to project | abuse, correction spam, dependency attacks | validation, rate limits, safe rendering, dependency scanning, security headers |
| Supply chain | malicious packages, compromised build | lockfiles, provenance review, minimal dependencies, CI scanning |

## Architectural controls

- No third-party network calls in web request paths.
- Retrieval runs asynchronously with bounded concurrency, timeouts, retries, and egress controls.
- Evidence is immutable and corrections are append-only.
- Secrets come from an approved secret manager or local ignored environment; never source control.
- Logs exclude source bodies, personal data, credentials, and sensitive URLs or query parameters.
- Database roles are separated for ingestion, governance, and public reads.

## CSP inline-style decision

The beta keeps `style-src 'self' 'unsafe-inline'` in the site-wide CSP. This is a constrained
compatibility exception, not a general endorsement of inline execution. The current Next.js,
font, and interactive-map/component rendering paths emit inline style elements or attributes; the
exception avoids breaking those reviewed routes while scripts, connections, frames, objects,
forms, fonts, and workers remain limited by the other CSP directives.

Scope and compensating controls:

- the exception applies only to CSS under `style-src`; it does not add another script source;
- all current content is repository-controlled and rendered through React, with no user-supplied
  HTML, CSS, CMS content, upload renderer, or `dangerouslySetInnerHTML` path;
- `default-src`, `connect-src`, `font-src`, and `form-action` remain `'self'`;
- `object-src 'none'`, `frame-ancestors 'none'`, and the existing security headers remain active;
- the CSP is emitted centrally on every application route.

Residual risk: if an attacker gains a style-injection primitive, `'unsafe-inline'` can make UI
redress, content concealment, and some CSS-based data-exposure techniques easier. Same-origin
restrictions and the absence of an untrusted style input reduce but do not eliminate that risk.
This posture must be reevaluated before adding user-authored content, uploads, a CMS, or any HTML
rendering boundary.

Future hardening: inventory framework and component inline styles, replace style attributes with
reviewed classes where practical, split `style-src-elem` from `style-src-attr`, nonce unavoidable
server-generated style elements, and hash immutable inline blocks. Remove `'unsafe-inline'` only
after Chromium, Firefox, and WebKit route, visual, and CSP-violation checks pass; do not silently
weaken or disable CSP to complete the migration.

## Current limitations

Task 1 creates no production service, authentication, database, queue, storage, or connector. The
controls above are design requirements, not claims of deployed enforcement. Each new execution,
upload, authentication, schema, or infrastructure capability requires a threat-model update and
Tier-2 approval before implementation.

## Security evaluations

Before public beta: dependency audit, secret scan, static analysis, connector SSRF tests, parser
fuzzing for supported formats, authorization tests, rate-limit tests, and a review of source-content
rendering. Findings must be linked from the relevant task packet.
