# ADR 0002: PostgreSQL/PostGIS with typed edges before a graph database

- Status: Accepted
- Date: 2026-08-29

## Context

The ledger needs transactional records, geospatial queries, evidence lineage, and relationship
traversal. Operating separate relational, geospatial, and graph systems at foundation stage would
increase consistency and operational risk before query patterns are measured.

## Decision

Use PostgreSQL with PostGIS as the system of record. Represent relationships in typed edge tables
with explicit endpoints, validity intervals, evidence references, and constraints. Build read
projections for graph and map workloads. Consider a dedicated graph database only after measured
queries exceed defensible relational approaches.

## Consequences

One database owns truth and correction transactions. Some deep traversals may require recursive SQL
or materialized projections. A future graph store, if justified, will be a rebuildable projection,
not an independent source of truth.
