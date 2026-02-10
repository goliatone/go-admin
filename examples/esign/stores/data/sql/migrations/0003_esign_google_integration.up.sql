ALTER TABLE documents ADD COLUMN source_type TEXT NOT NULL DEFAULT 'upload';
ALTER TABLE documents ADD COLUMN source_google_file_id TEXT NOT NULL DEFAULT '';
ALTER TABLE documents ADD COLUMN source_google_doc_url TEXT NOT NULL DEFAULT '';
ALTER TABLE documents ADD COLUMN source_modified_time TIMESTAMP NULL;
ALTER TABLE documents ADD COLUMN source_exported_at TIMESTAMP NULL;
ALTER TABLE documents ADD COLUMN source_exported_by_user_id TEXT NOT NULL DEFAULT '';

ALTER TABLE agreements ADD COLUMN source_type TEXT NOT NULL DEFAULT 'upload';
ALTER TABLE agreements ADD COLUMN source_google_file_id TEXT NOT NULL DEFAULT '';
ALTER TABLE agreements ADD COLUMN source_google_doc_url TEXT NOT NULL DEFAULT '';
ALTER TABLE agreements ADD COLUMN source_modified_time TIMESTAMP NULL;
ALTER TABLE agreements ADD COLUMN source_exported_at TIMESTAMP NULL;
ALTER TABLE agreements ADD COLUMN source_exported_by_user_id TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS integration_credentials (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    org_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    encrypted_access_token TEXT NOT NULL,
    encrypted_refresh_token TEXT NOT NULL DEFAULT '',
    scopes_json TEXT NOT NULL DEFAULT '[]',
    expires_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_integration_credentials_scope_id UNIQUE (tenant_id, org_id, id),
    CONSTRAINT uq_integration_credentials_scope_provider_user UNIQUE (tenant_id, org_id, provider, user_id)
);

CREATE INDEX IF NOT EXISTS idx_integration_credentials_scope_provider_user
    ON integration_credentials (tenant_id, org_id, provider, user_id);
