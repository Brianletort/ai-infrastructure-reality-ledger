# Deep-metro independent review playbook

> **SYNTHETIC REVIEWED BETA CORPUS — NOT PUBLIC FACTUAL DATA. Do not use these
> records as evidence of real facilities or events.**

## Roles and independence

The author creates a candidate timeline. A second person or separately identified validator path
reviews it. The reviewer identity must differ from the author identity, and the review record must
state reviewer type, timestamp, checklist results, decision, independence rationale, and
adjudication notes. Same-identity review fails closed.

`approved_synthetic` and `approve_synthetic_fixture` apply only to deterministic test fixtures.
They cannot be converted into public-fact approval. A factual replacement starts as a new
`public-factual-reviewed` candidate and requires a separate independent review decision.

## Mandatory checklist

Reject the candidate if any item fails:

1. Every material event has an HTTPS citation and exact record/page/section reference.
2. Synthetic records use only `.invalid` URLs; factual candidates use no `.invalid` URL.
3. Valid, assertion, source-publication, and retrieval times are present and distinguishable.
4. Each signal records authority, directness, and entity-match confidence.
5. Activation has at least two independent signals, including one authoritative source.
6. Imagery is never sufficient by itself to establish activation.
7. Correction and supersession targets exist and precede the correcting event.
8. Conflicts and missing fields remain explicit.
9. Author and reviewer identities differ, and the validator path is separate.
10. The decision explicitly states whether it is synthetic-only or public-factual.

## Decisions

- `approve_synthetic_fixture`: internally consistent demo/test fixture; public-fact approval false.
- `approve_public_fact`: independently reviewed factual record created through the public-source
  replacement workflow; never inferred from synthetic approval.
- `reject`: one or more mandatory checks failed.
- `pending`: review is incomplete; the record must not be presented as approved.

Corrections append events and preserve the prior record. Reviewers never silently rewrite event
history or remove contradictory evidence.
