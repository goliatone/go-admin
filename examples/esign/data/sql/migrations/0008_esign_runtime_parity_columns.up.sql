ALTER TABLE documents ADD COLUMN created_by_user_id TEXT NOT NULL DEFAULT '';
ALTER TABLE documents ADD COLUMN normalized_object_key TEXT NOT NULL DEFAULT '';
ALTER TABLE documents ADD COLUMN source_mime_type TEXT NOT NULL DEFAULT '';
ALTER TABLE documents ADD COLUMN source_ingestion_mode TEXT NOT NULL DEFAULT '';
ALTER TABLE documents ADD COLUMN pdf_compatibility_tier TEXT NOT NULL DEFAULT '';
ALTER TABLE documents ADD COLUMN pdf_compatibility_reason TEXT NOT NULL DEFAULT '';
ALTER TABLE documents ADD COLUMN pdf_normalization_status TEXT NOT NULL DEFAULT '';
ALTER TABLE documents ADD COLUMN pdf_analyzed_at TIMESTAMP NULL;
ALTER TABLE documents ADD COLUMN pdf_policy_version TEXT NOT NULL DEFAULT '';

ALTER TABLE agreements ADD COLUMN source_mime_type TEXT NOT NULL DEFAULT '';
ALTER TABLE agreements ADD COLUMN source_ingestion_mode TEXT NOT NULL DEFAULT '';

ALTER TABLE fields ADD COLUMN field_definition_id TEXT NULL;
ALTER TABLE fields ADD COLUMN placement_source TEXT NOT NULL DEFAULT '';
ALTER TABLE fields ADD COLUMN link_group_id TEXT NOT NULL DEFAULT '';
ALTER TABLE fields ADD COLUMN linked_from_field_id TEXT NOT NULL DEFAULT '';
ALTER TABLE fields ADD COLUMN is_unlinked BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE field_definitions ADD COLUMN link_group_id TEXT NOT NULL DEFAULT '';

ALTER TABLE field_instances ADD COLUMN placement_source TEXT NOT NULL DEFAULT '';
ALTER TABLE field_instances ADD COLUMN resolver_id TEXT NOT NULL DEFAULT '';
ALTER TABLE field_instances ADD COLUMN confidence DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE field_instances ADD COLUMN placement_run_id TEXT NULL;
ALTER TABLE field_instances ADD COLUMN manual_override BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE field_instances ADD COLUMN link_group_id TEXT NOT NULL DEFAULT '';
ALTER TABLE field_instances ADD COLUMN linked_from_field_id TEXT NOT NULL DEFAULT '';
ALTER TABLE field_instances ADD COLUMN is_unlinked BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE email_logs ADD COLUMN attempt_count INTEGER NOT NULL DEFAULT 1;
ALTER TABLE email_logs ADD COLUMN max_attempts INTEGER NOT NULL DEFAULT 1;
ALTER TABLE email_logs ADD COLUMN correlation_id TEXT NOT NULL DEFAULT '';
ALTER TABLE email_logs ADD COLUMN next_retry_at TIMESTAMP NULL;
ALTER TABLE email_logs ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT '1970-01-01T00:00:00Z';
UPDATE email_logs
SET updated_at = COALESCE(created_at, '1970-01-01T00:00:00Z')
WHERE updated_at = '1970-01-01T00:00:00Z';

ALTER TABLE integration_credentials ADD COLUMN profile_json TEXT NOT NULL DEFAULT '{}';
ALTER TABLE integration_credentials ADD COLUMN last_used_at TIMESTAMP NULL;
