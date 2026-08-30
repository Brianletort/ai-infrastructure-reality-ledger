# Contributing

Thank you for helping make public AI infrastructure claims more verifiable.

## Before opening a change

1. Read the clean-room and public-source policies.
2. Use the local [source-request form](.github/ISSUE_TEMPLATE/source-request.yml) or
   [correction-report form](.github/ISSUE_TEMPLATE/correction-report.yml) to describe the problem,
   proposed scope, and provenance.
3. Create or update a task packet with acceptance criteria and risk gates.
4. Confirm that every proposed source has an explicit redistribution classification.
5. For dependency additions or upgrades, update the package-specific disposition in
   `THIRD_PARTY_NOTICES.json`, regenerate `THIRD_PARTY_NOTICES.python.json` from `uv.lock` and
   installed metadata, and obtain review before treating a review-list license as approved.

Do not contribute confidential, employer-owned, customer-specific, access-controlled, scraped in
violation of terms, or otherwise restricted material. A public URL does not by itself grant
redistribution rights.

The [synthetic contribution examples](docs/launch/synthetic-contribution-examples.md) show the
expected shape for source requests, corrections, and fixture-first adapters. Participation is
governed by the [code of conduct](CODE_OF_CONDUCT.md).

## Engineering standard

- Keep changes small and typed.
- Introduce behavior test-first.
- Keep third-party network calls out of web request paths.
- Never commit credentials, local data snapshots, or personal data.
- Run the commands documented in the root README before requesting review.
- Run `npm run notices:check`; do not modify LGPL- or MPL-covered dependency files under the
  current approved dispositions.
- Record material architecture decisions in an ADR.

All changes require human review. Tier-2 changes additionally require the architecture, data,
security, performance, and merge gates listed in their task packet.

See the [third-party dependency policy](docs/policy/third-party-dependencies.md) and
[open-source beta release checklist](docs/contributing/release-checklist.md). These materials
record project process and are not legal advice.
