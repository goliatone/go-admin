CREATE TABLE IF NOT EXISTS document_remediation_leases (
    document_id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    org_id TEXT NOT NULL,
    worker_id TEXT NOT NULL DEFAULT '',
    lease_seq BIGINT NOT NULL DEFAULT 0,
    correlation_id TEXT NOT NULL DEFAULT '',
    acquired_at TIMESTAMP NULL,
    last_heartbeat_at TIMESTAMP NULL,
    expires_at TIMESTAMP NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_document_remediation_leases_scope_expires
    ON document_remediation_leases (tenant_id, org_id, expires_at);

CREATE TABLE IF NOT EXISTS remediation_dispatches (
    dispatch_id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    org_id TEXT NOT NULL,
    document_id TEXT NOT NULL,
    idempotency_key TEXT NOT NULL,
    mode TEXT NOT NULL DEFAULT '',
    command_id TEXT NOT NULL DEFAULT '',
    correlation_id TEXT NOT NULL DEFAULT '',
    accepted BOOLEAN NOT NULL DEFAULT FALSE,
    max_attempts INTEGER NOT NULL DEFAULT 0,
    enqueued_at TIMESTAMP NULL,
    updated_at TIMESTAMP NOT NULL,
    CONSTRAINT uq_remediation_dispatches_scope_idempotency UNIQUE (tenant_id, org_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_remediation_dispatches_scope_document_updated
    ON remediation_dispatches (tenant_id, org_id, document_id, updated_at DESC);
