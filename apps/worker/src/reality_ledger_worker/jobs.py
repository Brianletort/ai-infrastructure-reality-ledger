"""Parameterized PostgreSQL statements for durable async-job ownership."""

CLAIM_JOB_SQL = """
WITH candidate AS (
    SELECT id
    FROM async_jobs
    WHERE queue_name = %(queue_name)s
      AND status = 'queued'
      AND available_at <= now()
      AND attempts < max_attempts
    ORDER BY priority DESC, available_at, created_at, id
    FOR UPDATE SKIP LOCKED
    LIMIT 1
)
UPDATE async_jobs AS jobs
SET status = 'running',
    attempts = attempts + 1,
    locked_at = now(),
    locked_by = %(worker_id)s,
    updated_at = now()
FROM candidate
WHERE jobs.id = candidate.id
RETURNING jobs.*;
"""

SUCCEED_JOB_SQL = """
UPDATE async_jobs
SET status = 'succeeded',
    completed_at = now(),
    locked_at = NULL,
    locked_by = NULL,
    last_error = NULL,
    updated_at = now()
WHERE id = %(job_id)s
  AND status = 'running'
  AND locked_by = %(worker_id)s;
"""

FAIL_JOB_SQL = """
UPDATE async_jobs
SET status = CASE
        WHEN attempts >= max_attempts THEN 'dead_letter'
        ELSE 'queued'
    END,
    available_at = now() + (%(retry_delay_seconds)s * interval '1 second'),
    locked_at = NULL,
    locked_by = NULL,
    last_error = %(error)s,
    updated_at = now()
WHERE id = %(job_id)s
  AND status = 'running'
  AND locked_by = %(worker_id)s;
"""
