-- Reality Ledger local schema prerequisite extensions.
-- This migration is idempotent and must be applied by a role allowed to install extensions.

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
