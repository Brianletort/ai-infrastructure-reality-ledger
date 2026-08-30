from reality_ledger_worker.jobs import CLAIM_JOB_SQL, FAIL_JOB_SQL, SUCCEED_JOB_SQL


def normalized(sql: str) -> str:
    return " ".join(sql.lower().split())


def test_job_claim_uses_skip_locked_and_deterministic_queue_order() -> None:
    sql = normalized(CLAIM_JOB_SQL)

    assert "for update skip locked" in sql
    assert "status = 'queued'" in sql
    assert "available_at <= now()" in sql
    assert "order by priority desc, available_at, created_at, id" in sql
    assert "attempts = attempts + 1" in sql
    assert "returning jobs.*" in sql


def test_job_success_clears_lock_and_marks_completion() -> None:
    sql = normalized(SUCCEED_JOB_SQL)

    assert "status = 'succeeded'" in sql
    assert "locked_at = null" in sql
    assert "locked_by = null" in sql
    assert "completed_at = now()" in sql


def test_job_failure_retries_or_dead_letters_at_attempt_limit() -> None:
    sql = normalized(FAIL_JOB_SQL)

    assert "when attempts >= max_attempts then 'dead_letter'" in sql
    assert "else 'queued'" in sql
    assert "last_error = %(error)s" in sql
    assert "available_at = now() + (%(retry_delay_seconds)s * interval '1 second')" in sql
    assert "locked_at = null" in sql
    assert "locked_by = null" in sql
