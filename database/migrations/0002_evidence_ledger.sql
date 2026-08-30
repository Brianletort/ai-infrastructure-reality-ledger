-- Evidence-platform system of record.
-- IDs are supplied by the application so fixture and replay behavior remains deterministic.

CREATE TABLE IF NOT EXISTS sources (
    id uuid PRIMARY KEY,
    adapter_version text NOT NULL,
    name text NOT NULL CHECK (length(name) BETWEEN 1 AND 500),
    canonical_url text NOT NULL,
    authority text NOT NULL CHECK (
        authority IN ('primary', 'authoritative-secondary', 'secondary', 'aggregator', 'unknown')
    ),
    directness text NOT NULL CHECK (
        directness IN ('direct', 'near-direct', 'indirect', 'unknown')
    ),
    redistribution text NOT NULL CHECK (
        redistribution IN ('republish', 'derived-only', 'link-only', 'prohibited')
    ),
    manifest jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS source_runs (
    id uuid PRIMARY KEY,
    source_id uuid NOT NULL REFERENCES sources(id),
    status text NOT NULL CHECK (status IN ('started', 'succeeded', 'failed', 'partial')),
    started_at timestamptz NOT NULL,
    completed_at timestamptz,
    health_result jsonb,
    error_summary text,
    CHECK (completed_at IS NULL OR completed_at >= started_at)
);

CREATE TABLE IF NOT EXISTS artifacts (
    id uuid PRIMARY KEY,
    source_run_id uuid NOT NULL REFERENCES source_runs(id),
    sha256 char(64) NOT NULL UNIQUE CHECK (sha256 ~ '^[0-9a-f]{64}$'),
    storage_path text NOT NULL UNIQUE,
    media_type text NOT NULL,
    byte_length bigint NOT NULL CHECK (byte_length >= 0),
    redistribution text NOT NULL CHECK (
        redistribution IN ('republish', 'derived-only', 'link-only')
    ),
    attribution text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS entities (
    id uuid PRIMARY KEY,
    kind text NOT NULL CHECK (
        kind IN ('organization', 'facility', 'project', 'technology', 'jurisdiction', 'other')
    ),
    name text NOT NULL CHECK (length(name) BETWEEN 1 AND 500),
    normalized_name text NOT NULL,
    normalized_address text,
    exact_identifiers jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    search_document tsvector GENERATED ALWAYS AS (
        to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(normalized_address, ''))
    ) STORED
);

CREATE TABLE IF NOT EXISTS sites (
    id uuid PRIMARY KEY,
    entity_id uuid NOT NULL REFERENCES entities(id),
    name text NOT NULL CHECK (length(name) BETWEEN 1 AND 500),
    normalized_address text,
    geom geometry(Point, 4326) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS entity_aliases (
    id uuid PRIMARY KEY,
    entity_id uuid NOT NULL REFERENCES entities(id),
    alias text NOT NULL CHECK (length(alias) BETWEEN 1 AND 500),
    normalized_alias text NOT NULL,
    source_id uuid REFERENCES sources(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (entity_id, normalized_alias)
);

CREATE TABLE IF NOT EXISTS evidence (
    id uuid PRIMARY KEY,
    source_id uuid NOT NULL REFERENCES sources(id),
    source_run_id uuid NOT NULL REFERENCES source_runs(id),
    artifact_id uuid REFERENCES artifacts(id),
    supersedes_evidence_id uuid REFERENCES evidence(id),
    lifecycle_state text NOT NULL CHECK (
        lifecycle_state IN (
            'announced',
            'readiness_evidence',
            'construction_evidence',
            'activation_evidence',
            'contested',
            'stale',
            'superseded',
            'unknown'
        )
    ),
    summary text NOT NULL CHECK (length(summary) BETWEEN 1 AND 5000),
    citation_url text NOT NULL,
    valid_from timestamptz NOT NULL,
    valid_to timestamptz,
    asserted_at timestamptz NOT NULL,
    source_published_at timestamptz NOT NULL,
    retrieved_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK (valid_to IS NULL OR valid_to >= valid_from),
    CHECK (supersedes_evidence_id IS NULL OR supersedes_evidence_id <> id)
);

CREATE TABLE IF NOT EXISTS claims (
    id uuid PRIMARY KEY,
    entity_id uuid NOT NULL REFERENCES entities(id),
    predicate text NOT NULL CHECK (length(predicate) BETWEEN 1 AND 300),
    value jsonb NOT NULL,
    lifecycle_state text NOT NULL CHECK (
        lifecycle_state IN (
            'announced',
            'readiness_evidence',
            'construction_evidence',
            'activation_evidence',
            'contested',
            'stale',
            'superseded',
            'unknown'
        )
    ),
    confidence_score numeric(4, 3) NOT NULL CHECK (confidence_score BETWEEN 0 AND 1),
    source_authority_confidence numeric(4, 3) NOT NULL CHECK (
        source_authority_confidence BETWEEN 0 AND 1
    ),
    directness_confidence numeric(4, 3) NOT NULL CHECK (
        directness_confidence BETWEEN 0 AND 1
    ),
    entity_match_confidence numeric(4, 3) NOT NULL CHECK (
        entity_match_confidence BETWEEN 0 AND 1
    ),
    confidence_rationale text NOT NULL,
    valid_from timestamptz NOT NULL,
    valid_to timestamptz,
    asserted_at timestamptz NOT NULL,
    source_published_at timestamptz NOT NULL,
    retrieved_at timestamptz NOT NULL,
    supersedes_claim_id uuid REFERENCES claims(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK (valid_to IS NULL OR valid_to >= valid_from),
    CHECK (supersedes_claim_id IS NULL OR supersedes_claim_id <> id)
);

CREATE TABLE IF NOT EXISTS claim_evidence (
    claim_id uuid NOT NULL REFERENCES claims(id),
    evidence_id uuid NOT NULL REFERENCES evidence(id),
    support_type text NOT NULL CHECK (support_type IN ('supports', 'contradicts', 'context')),
    PRIMARY KEY (claim_id, evidence_id)
);

CREATE TABLE IF NOT EXISTS events (
    id uuid PRIMARY KEY,
    entity_id uuid NOT NULL REFERENCES entities(id),
    event_type text NOT NULL,
    observed_at timestamptz NOT NULL,
    valid_from timestamptz NOT NULL,
    valid_to timestamptz,
    description text,
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK (valid_to IS NULL OR valid_to >= valid_from)
);

CREATE TABLE IF NOT EXISTS event_evidence (
    event_id uuid NOT NULL REFERENCES events(id),
    evidence_id uuid NOT NULL REFERENCES evidence(id),
    PRIMARY KEY (event_id, evidence_id)
);

CREATE TABLE IF NOT EXISTS relationships (
    id uuid PRIMARY KEY,
    from_entity_id uuid NOT NULL REFERENCES entities(id),
    to_entity_id uuid NOT NULL REFERENCES entities(id),
    relationship_type text NOT NULL,
    valid_from timestamptz NOT NULL,
    valid_to timestamptz,
    source_claim_id uuid NOT NULL REFERENCES claims(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK (from_entity_id <> to_entity_id),
    CHECK (valid_to IS NULL OR valid_to >= valid_from)
);

CREATE TABLE IF NOT EXISTS relationship_evidence (
    relationship_id uuid NOT NULL REFERENCES relationships(id),
    evidence_id uuid NOT NULL REFERENCES evidence(id),
    PRIMARY KEY (relationship_id, evidence_id)
);

CREATE TABLE IF NOT EXISTS corrections (
    id uuid PRIMARY KEY,
    target_type text NOT NULL CHECK (
        target_type IN ('entity', 'site', 'evidence', 'claim', 'event', 'relationship', 'source')
    ),
    target_id uuid NOT NULL,
    status text NOT NULL CHECK (status IN ('requested', 'accepted', 'rejected', 'applied')),
    reason text NOT NULL,
    submitted_at timestamptz NOT NULL,
    resolved_at timestamptz,
    superseding_evidence_id uuid REFERENCES evidence(id),
    superseding_claim_id uuid REFERENCES claims(id),
    corrects_correction_id uuid REFERENCES corrections(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK (resolved_at IS NULL OR resolved_at >= submitted_at),
    CHECK (corrects_correction_id IS NULL OR corrects_correction_id <> id),
    CHECK (
        status NOT IN ('accepted', 'rejected', 'applied')
        OR resolved_at IS NOT NULL
    )
);

CREATE TABLE IF NOT EXISTS entity_resolution_reviews (
    id uuid PRIMARY KEY,
    source_run_id uuid NOT NULL REFERENCES source_runs(id),
    candidate_payload jsonb NOT NULL,
    candidate_entity_ids uuid[] NOT NULL DEFAULT '{}',
    confidence_dimensions jsonb NOT NULL,
    outcome text NOT NULL CHECK (outcome IN ('review', 'unresolved', 'resolved')),
    resolved_entity_id uuid REFERENCES entities(id),
    queued_at timestamptz NOT NULL DEFAULT now(),
    resolved_at timestamptz,
    CHECK (
        (outcome = 'resolved' AND resolved_entity_id IS NOT NULL AND resolved_at IS NOT NULL)
        OR (outcome <> 'resolved' AND resolved_entity_id IS NULL)
    )
);

CREATE TABLE IF NOT EXISTS async_jobs (
    id uuid PRIMARY KEY,
    queue_name text NOT NULL,
    job_type text NOT NULL,
    payload jsonb NOT NULL,
    status text NOT NULL DEFAULT 'queued' CHECK (
        status IN ('queued', 'running', 'succeeded', 'dead_letter')
    ),
    priority integer NOT NULL DEFAULT 0,
    attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    max_attempts integer NOT NULL DEFAULT 5 CHECK (max_attempts > 0),
    available_at timestamptz NOT NULL DEFAULT now(),
    locked_at timestamptz,
    locked_by text,
    last_error text,
    completed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CHECK (attempts <= max_attempts),
    CHECK (
        (status = 'running' AND locked_at IS NOT NULL AND locked_by IS NOT NULL)
        OR status <> 'running'
    ),
    CHECK (
        (status = 'succeeded' AND completed_at IS NOT NULL)
        OR status <> 'succeeded'
    )
);

CREATE INDEX IF NOT EXISTS entities_name_trgm_idx
    ON entities USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS entities_search_document_idx
    ON entities USING gin (search_document);
CREATE INDEX IF NOT EXISTS aliases_normalized_trgm_idx
    ON entity_aliases USING gin (normalized_alias gin_trgm_ops);
CREATE INDEX IF NOT EXISTS sites_geom_idx
    ON sites USING gist (geom);
CREATE INDEX IF NOT EXISTS evidence_temporal_idx
    ON evidence (valid_from, valid_to);
CREATE INDEX IF NOT EXISTS evidence_retrieved_idx
    ON evidence (retrieved_at DESC);
CREATE INDEX IF NOT EXISTS claims_entity_temporal_idx
    ON claims (entity_id, valid_from, valid_to);
CREATE INDEX IF NOT EXISTS events_entity_time_idx
    ON events (entity_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS relationships_from_type_idx
    ON relationships (from_entity_id, relationship_type, valid_from);
CREATE INDEX IF NOT EXISTS relationships_to_type_idx
    ON relationships (to_entity_id, relationship_type, valid_from);
CREATE INDEX IF NOT EXISTS correction_target_idx
    ON corrections (target_type, target_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS resolution_review_queue_idx
    ON entity_resolution_reviews (outcome, queued_at);
CREATE INDEX IF NOT EXISTS async_jobs_claim_idx
    ON async_jobs (status, available_at, priority DESC)
    WHERE status = 'queued';

CREATE OR REPLACE FUNCTION prevent_immutable_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION '% records are immutable; append a superseding record', TG_TABLE_NAME;
END;
$$;

DROP TRIGGER IF EXISTS artifacts_are_immutable ON artifacts;
CREATE TRIGGER artifacts_are_immutable
    BEFORE UPDATE OR DELETE ON artifacts
    FOR EACH ROW EXECUTE FUNCTION prevent_immutable_mutation();

DROP TRIGGER IF EXISTS evidence_is_immutable ON evidence;
CREATE TRIGGER evidence_is_immutable
    BEFORE UPDATE OR DELETE ON evidence
    FOR EACH ROW EXECUTE FUNCTION prevent_immutable_mutation();

DROP TRIGGER IF EXISTS claims_are_immutable ON claims;
CREATE TRIGGER claims_are_immutable
    BEFORE UPDATE OR DELETE ON claims
    FOR EACH ROW EXECUTE FUNCTION prevent_immutable_mutation();

DROP TRIGGER IF EXISTS corrections_are_immutable ON corrections;
CREATE TRIGGER corrections_are_immutable
    BEFORE UPDATE OR DELETE ON corrections
    FOR EACH ROW EXECUTE FUNCTION prevent_immutable_mutation();
