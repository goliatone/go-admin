PRAGMA foreign_keys=OFF;

ALTER TABLE job_runs RENAME TO job_runs_old;

CREATE TABLE job_runs (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    org_id TEXT NOT NULL,
    job_name TEXT NOT NULL,
    dedupe_key TEXT NOT NULL,
    agreement_id TEXT NOT NULL DEFAULT '',
    recipient_id TEXT NULL,
    correlation_id TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending',
    attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
    max_attempts INTEGER NOT NULL DEFAULT 1 CHECK (max_attempts > 0),
    last_error TEXT NOT NULL DEFAULT '',
    next_retry_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    payload_json TEXT NOT NULL DEFAULT '',
    available_at TIMESTAMP NULL,
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    claimed_at TIMESTAMP NULL,
    lease_expires_at TIMESTAMP NULL,
    worker_id TEXT NOT NULL DEFAULT '',
    resource_kind TEXT NOT NULL DEFAULT '',
    resource_id TEXT NOT NULL DEFAULT '',
    last_error_code TEXT NOT NULL DEFAULT '',
    CONSTRAINT uq_job_runs_scope_dedupe UNIQUE (tenant_id, org_id, job_name, dedupe_key)
);

INSERT INTO job_runs (
    id, tenant_id, org_id, job_name, dedupe_key, agreement_id, recipient_id, correlation_id,
    status, attempt_count, max_attempts, last_error, next_retry_at, created_at, updated_at,
    payload_json, available_at, started_at, completed_at, claimed_at, lease_expires_at,
    worker_id, resource_kind, resource_id, last_error_code
)
SELECT
    id, tenant_id, org_id, job_name, dedupe_key, agreement_id, recipient_id, correlation_id,
    status, attempt_count, max_attempts, last_error, next_retry_at, created_at, updated_at,
    payload_json, available_at, started_at, completed_at, claimed_at, lease_expires_at,
    worker_id, resource_kind, resource_id, last_error_code
FROM job_runs_old;

DROP TABLE job_runs_old;

CREATE INDEX IF NOT EXISTS idx_job_runs_scope_status_updated
    ON job_runs (tenant_id, org_id, status, updated_at DESC);

PRAGMA foreign_keys=ON;
