# ADR 0004: Immutable evidence snapshots and asynchronous ingestion

- Status: Accepted
- Date: 2026-08-29

## Context

Public pages change or disappear. Reproducible claims require a durable record of what was observed,
when it was published, when it was retrieved, and what use rights applied. Retrieval and parsing
also have unpredictable latency and untrusted inputs.

## Decision

Retrieve sources only in asynchronous worker jobs. Store content-addressed, immutable evidence
snapshots when policy permits; otherwise retain only allowed metadata or links. Preserve source,
retrieval, assertion, and validity timestamps separately. Corrections append new records and
supersession links rather than overwriting evidence.

## Consequences

Storage and retention require explicit governance. Hashes support integrity checks but do not grant
redistribution rights. Parsers can be replayed against permitted snapshots, and public request
latency remains independent of source availability.
