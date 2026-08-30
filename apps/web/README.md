# Reality Ledger web

Public Next.js App Router application for the AI Infrastructure Reality Ledger.

The web tier presents governed read models and prebuilt geospatial artifacts. It must not retrieve
third-party sources, call model providers, or perform ingestion work in request paths. External
source acquisition belongs in the asynchronous worker.

## Develop

From the repository root:

```bash
npm install
npm run dev --workspace web
```

The application is available at `http://localhost:3000`.

## Verify

```bash
npm run lint --workspace web
npm run typecheck --workspace web
npm run build --workspace web
```

Shared domain contracts live in `packages/domain`; shared presentation primitives belong in
`packages/ui`. Do not place credentials, source snapshots, employer data, or customer data in this
application.
