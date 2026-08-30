# ADR 0005: No third-party network calls in web request paths

- Status: Accepted
- Date: 2026-08-29

## Context

Inline calls to source sites, model providers, geocoders, or other third parties make public request
latency and availability dependent on systems outside project control. They also risk leaking user
activity and bypassing ingestion policy checks.

## Decision

Web request handling may access only project-controlled data stores, immutable assets, and governed
read models. All third-party retrieval runs asynchronously through workers with destination
allowlists, timeouts, bounded retries, and audit records.

## Consequences

New external information is eventually consistent rather than fetched on demand. Features requiring
live external access must be redesigned around queued work and cached, policy-approved results.
Exceptions require a superseding ADR and Tier-2 security, data, performance, and architecture
approval before implementation.
