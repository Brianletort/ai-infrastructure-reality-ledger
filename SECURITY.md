# Security Policy

## Supported versions

This repository is pre-release. Security fixes apply to the latest default branch only.

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability. Use the repository host's private
security-advisory feature and include:

- affected revision and component;
- reproduction steps using synthetic data;
- expected and observed impact;
- any known mitigation.

Do not include credentials, personal data, confidential source material, or active exploit traffic.
Maintainers will acknowledge a complete report when project operations are established; no response
SLA is promised during the foundation phase.

## Security boundaries

The web application must not call third-party services from request paths. Source retrieval,
parsing, and snapshot creation run asynchronously with allowlisted destinations, bounded resources,
and untrusted-content handling. See the full
[security and threat model](docs/policy/security-and-threat-model.md).
