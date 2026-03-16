ALTER TABLE exchange_jobs ADD COLUMN permission TEXT;
ALTER TABLE exchange_jobs ADD COLUMN request_hash TEXT;
ALTER TABLE exchange_jobs ADD COLUMN request_json TEXT NOT NULL DEFAULT '{}';
ALTER TABLE exchange_jobs ADD COLUMN summary_json TEXT NOT NULL DEFAULT '{}';
ALTER TABLE exchange_jobs ADD COLUMN retention_json TEXT NOT NULL DEFAULT '{}';
ALTER TABLE exchange_jobs ADD COLUMN request_id TEXT;
ALTER TABLE exchange_jobs ADD COLUMN trace_id TEXT;
ALTER TABLE exchange_jobs ADD COLUMN poll_endpoint TEXT;
ALTER TABLE exchange_jobs ADD COLUMN worker_id TEXT;
ALTER TABLE exchange_jobs ADD COLUMN started_at TEXT;
ALTER TABLE exchange_jobs ADD COLUMN completed_at TEXT;
ALTER TABLE exchange_jobs ADD COLUMN heartbeat_at TEXT;
ALTER TABLE exchange_jobs ADD COLUMN lease_expires_at TEXT;
ALTER TABLE exchange_jobs ADD COLUMN deleted_at TEXT;

CREATE INDEX IF NOT EXISTS ix_exchange_jobs_scope_request_hash
    ON exchange_jobs(tenant_id, org_id, created_by, kind, request_hash);
CREATE INDEX IF NOT EXISTS ix_exchange_jobs_recovery
    ON exchange_jobs(status, lease_expires_at, updated_at);

CREATE TABLE IF NOT EXISTS translation_exchange_job_rows (
    job_id TEXT NOT NULL,
    row_index INTEGER NOT NULL,
    tenant_id TEXT,
    org_id TEXT,
    kind TEXT NOT NULL,
    status TEXT,
    input_json TEXT NOT NULL DEFAULT '{}',
    result_json TEXT NOT NULL DEFAULT '{}',
    linkage_key TEXT,
    payload_hash TEXT,
    seen_registered INTEGER NOT NULL DEFAULT 0,
    create_translation INTEGER NOT NULL DEFAULT 0,
    applied_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (job_id, row_index),
    FOREIGN KEY (job_id) REFERENCES exchange_jobs(job_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_translation_exchange_job_rows_job
    ON translation_exchange_job_rows(job_id, row_index);

CREATE TABLE IF NOT EXISTS translation_exchange_job_artifacts (
    job_id TEXT NOT NULL,
    kind TEXT NOT NULL,
    label TEXT,
    filename TEXT,
    content_type TEXT,
    content_bytes BLOB,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (job_id, kind),
    FOREIGN KEY (job_id) REFERENCES exchange_jobs(job_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS translation_exchange_apply_ledger (
    ledger_id TEXT PRIMARY KEY,
    tenant_id TEXT,
    org_id TEXT,
    linkage_key TEXT NOT NULL,
    payload_hash TEXT NOT NULL,
    create_translation INTEGER NOT NULL DEFAULT 0,
    workflow_status TEXT,
    applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    request_json TEXT NOT NULL DEFAULT '{}'
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_translation_exchange_apply_ledger_scope_payload
    ON translation_exchange_apply_ledger(tenant_id, org_id, linkage_key, payload_hash);
