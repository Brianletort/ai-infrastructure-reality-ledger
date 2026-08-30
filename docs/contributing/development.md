# Development guide

## Setup

Use Node.js 22+, npm 10+, Python 3.12+, and uv. Install from the repository root:

```bash
npm install
uv sync --project apps/worker
```

The repository uses npm workspaces and one root lockfile. The Python worker has an independent
`uv.lock` because its runtime and release lifecycle are separate.

## Change workflow

1. Create a task packet with measurable acceptance criteria and required gates.
2. For behavior, write the smallest failing test and confirm the expected failure.
3. Implement the minimum change that passes.
4. Run focused tests, then the full root and Python verification suites.
5. Document provenance, source rights, threat-model changes, and residual risks.
6. Run `npm run notices:check` after any dependency or lockfile change. A reviewed-license package
   needs an exact package/version disposition in `THIRD_PARTY_NOTICES.json`; locked Python
   packages must also byte-match the generated `THIRD_PARTY_NOTICES.python.json` inventory.
7. Request the human reviews required by the task's risk tier.

Package boundaries are intentional. Domain contracts belong in `packages/domain`; source connector
interfaces in `packages/source-sdk`; retrieval implementations in `apps/worker`; presentation
primitives in `packages/ui`; and project-specific pages in `apps/web`.

## Generated and local files

Do not commit `.env` files, virtual environments, build output, evidence snapshots, generated tiles,
or local databases. Commit lockfiles after approved dependency changes.

Do not patch LGPL- or MPL-covered dependency files under the current approved beta dispositions.
See the [third-party dependency policy](../policy/third-party-dependencies.md) and
[release checklist](release-checklist.md) before preparing a distribution.
