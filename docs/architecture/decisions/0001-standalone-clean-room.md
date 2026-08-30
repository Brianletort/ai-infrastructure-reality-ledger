# ADR 0001: Standalone repository and clean-room boundary

- Status: Accepted
- Date: 2026-08-29

## Context

The project must be independently publishable and auditable. Similar problem domains may exist in
other projects, but their implementation material, schemas, prompts, data, styles, and assets are
outside this project's provenance boundary.

## Decision

Build in a standalone repository from public concepts and original implementation work. Do not
read, copy, adapt, or translate Magellan or Pawsey implementation files. Contributions must identify
their provenance and source rights. Publicly documented standards and independently authored
interfaces are permitted when attribution and license obligations are met.

## Consequences

The project accepts some duplicated discovery cost in exchange for defensible provenance. Reviewers
may reject useful contributions when their origin cannot be established. The provenance policy and
task packet are release-blocking records.
