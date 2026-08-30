from pathlib import Path

REPOSITORY_ROOT = Path(__file__).resolve().parents[3]
MIGRATIONS = REPOSITORY_ROOT / "database" / "migrations"


def migration_sql() -> str:
    return "\n".join(path.read_text() for path in sorted(MIGRATIONS.glob("*.sql"))).lower()


def test_migrations_are_versioned_and_enable_required_extensions() -> None:
    names = [path.name for path in sorted(MIGRATIONS.glob("*.sql"))]
    sql = migration_sql()

    assert names == ["0001_extensions.sql", "0002_evidence_ledger.sql"]
    assert "create extension if not exists postgis" in sql
    assert "create extension if not exists pg_trgm" in sql


def test_migrations_create_all_evidence_platform_tables() -> None:
    sql = migration_sql()
    required_tables = {
        "sources",
        "source_runs",
        "artifacts",
        "entities",
        "sites",
        "entity_aliases",
        "evidence",
        "claims",
        "claim_evidence",
        "events",
        "relationships",
        "relationship_evidence",
        "corrections",
        "entity_resolution_reviews",
        "async_jobs",
    }

    for table in required_tables:
        assert f"create table if not exists {table}" in sql


def test_migrations_enforce_immutability_and_lineage() -> None:
    sql = migration_sql()

    assert "prevent_immutable_mutation" in sql
    assert "before update or delete on artifacts" in sql
    assert "before update or delete on evidence" in sql
    assert "supersedes_evidence_id" in sql
    assert "supersedes_claim_id" in sql
    assert "corrects_correction_id" in sql


def test_migrations_include_spatial_temporal_search_and_queue_indexes() -> None:
    sql = migration_sql()

    assert "using gist (geom)" in sql
    assert "using gin (name gin_trgm_ops)" in sql
    assert "using gin (search_document)" in sql
    assert "valid_from, valid_to" in sql
    assert "status, available_at, priority desc" in sql


def test_migrations_bound_job_state_and_retry_fields() -> None:
    sql = migration_sql()

    assert "status in ('queued', 'running', 'succeeded', 'dead_letter')" in sql
    assert "attempts <= max_attempts" in sql
    assert "locked_at" in sql
    assert "last_error" in sql
