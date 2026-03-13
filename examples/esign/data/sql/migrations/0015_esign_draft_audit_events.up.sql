CREATE TABLE draft_audit_events (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    org_id TEXT NOT NULL,
    draft_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    actor_type TEXT NOT NULL,
    actor_id TEXT NOT NULL DEFAULT '',
    metadata_json TEXT NOT NULL DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_draft_audit_events_scope_id UNIQUE (tenant_id, org_id, id)
);

CREATE INDEX idx_draft_audit_events_scope_draft_created
    ON draft_audit_events (tenant_id, org_id, draft_id, created_at DESC);
