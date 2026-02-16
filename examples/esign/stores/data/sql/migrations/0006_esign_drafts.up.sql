CREATE TABLE esign_drafts (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    org_id TEXT NOT NULL,
    created_by TEXT NOT NULL,
    wizard_id TEXT NOT NULL,
    document_id TEXT NULL,
    title TEXT NOT NULL DEFAULT '',
    current_step INTEGER NOT NULL DEFAULT 1 CHECK (current_step >= 1 AND current_step <= 6),
    wizard_state_json TEXT NOT NULL DEFAULT '{}',
    revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_esign_drafts_document FOREIGN KEY (document_id) REFERENCES documents (id) ON DELETE SET NULL,
    CONSTRAINT uq_esign_drafts_scope_wizard UNIQUE (tenant_id, org_id, created_by, wizard_id)
);

CREATE INDEX idx_esign_drafts_scope_user_updated
    ON esign_drafts (tenant_id, org_id, created_by, updated_at);

CREATE INDEX idx_esign_drafts_expires_at
    ON esign_drafts (expires_at);
