CREATE TABLE agreement_revision_requests (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    org_id TEXT NOT NULL,
    source_agreement_id TEXT NOT NULL,
    revision_kind TEXT NOT NULL,
    idempotency_key TEXT NOT NULL,
    request_hash TEXT NOT NULL DEFAULT '',
    actor_id TEXT NOT NULL DEFAULT '',
    created_agreement_id TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_agreement_revision_requests_dedupe
    ON agreement_revision_requests (tenant_id, org_id, source_agreement_id, revision_kind, idempotency_key);

CREATE INDEX idx_agreement_revision_requests_source
    ON agreement_revision_requests (tenant_id, org_id, source_agreement_id, created_at DESC);
