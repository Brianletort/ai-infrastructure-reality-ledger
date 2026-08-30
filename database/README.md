# Local database migrations

The files in `migrations/` are ordered, versioned PostgreSQL migrations. They are written to be
repeatable on an empty or already-initialized local database through `IF NOT EXISTS` and
replaceable trigger-function definitions. Applied migration files must not be edited; schema
changes require a new numbered file.

## Apply locally

Do not apply these commands to a remote or production database.

```bash
createdb reality_ledger_local
psql --set ON_ERROR_STOP=1 --dbname reality_ledger_local \
  --file database/migrations/0001_extensions.sql
psql --set ON_ERROR_STOP=1 --dbname reality_ledger_local \
  --file database/migrations/0002_evidence_ledger.sql
```

The database role must be allowed to install PostGIS and `pg_trgm`. IDs are application-supplied to
keep replays and synthetic fixtures deterministic.

## Rollback guidance

Prefer a forward corrective migration whenever records may exist. Dropping this schema destroys
evidence and correction lineage and is unsuitable for a populated database.

For a disposable, verified-empty local database, rollback by dropping the database:

```bash
dropdb reality_ledger_local
```

If database deletion is not possible, take a backup first, verify no shared consumers, then remove
objects in reverse dependency order: immutability triggers and function; join tables; corrections,
review queue, and jobs; relationships, events, claims, and evidence; aliases and sites; entities,
artifacts, source runs, and sources. Do not drop PostGIS or `pg_trgm` unless the entire database is
disposable and no other schema uses them.

## Static verification

`apps/worker/tests/test_sql_migrations.py` checks the required tables, extensions, lineage fields,
immutability triggers, job state, and spatial, temporal, text-search, and queue indexes without
connecting to any database.
