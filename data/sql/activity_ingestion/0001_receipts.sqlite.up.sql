-- Retain receipts after activity deletion. Pruning permits event recreation.
CREATE TABLE IF NOT EXISTS admin_activity_ingestion_receipts (
    producer_id TEXT COLLATE BINARY NOT NULL,
    event_id TEXT COLLATE BINARY NOT NULL,
    tenant_id TEXT NOT NULL,
    org_id TEXT NOT NULL,
    fingerprint_version INTEGER NOT NULL,
    fingerprint TEXT NOT NULL,
    result_version INTEGER NOT NULL,
    activity_id TEXT NOT NULL UNIQUE,
    occurred_at TIMESTAMP NOT NULL,
    received_at TIMESTAMP NOT NULL,
    actor_kind TEXT NOT NULL,
    attribution TEXT NOT NULL,
    actor_id TEXT NOT NULL,
    subject_user_id TEXT NOT NULL,
    PRIMARY KEY (producer_id, event_id)
);
CREATE INDEX IF NOT EXISTS admin_activity_ingestion_scope_idx
    ON admin_activity_ingestion_receipts (tenant_id, org_id, activity_id);
