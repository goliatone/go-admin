-- Rollback Version 1 lineage tables
-- Drop in reverse order of dependencies

-- Remove indexes and foreign keys from agreements table
DROP INDEX IF EXISTS idx_agreements_source_revision;

-- Remove indexes and foreign keys from documents table
DROP INDEX IF EXISTS idx_documents_source_artifact;
DROP INDEX IF EXISTS idx_documents_source_revision;
DROP INDEX IF EXISTS idx_documents_source_document;

-- Drop source_relationships table
DROP INDEX IF EXISTS idx_source_relationships_status;
DROP INDEX IF EXISTS idx_source_relationships_scope_right;
DROP INDEX IF EXISTS idx_source_relationships_scope_left;
DROP INDEX IF EXISTS uq_source_relationships_scope_tuple;
DROP TABLE IF EXISTS source_relationships;

-- Drop source_fingerprints table
DROP INDEX IF EXISTS idx_source_fingerprints_normalized_hash;
DROP INDEX IF EXISTS idx_source_fingerprints_scope_artifact;
DROP INDEX IF EXISTS idx_source_fingerprints_scope_revision;
DROP TABLE IF EXISTS source_fingerprints;

-- Drop source_artifacts table
DROP INDEX IF EXISTS idx_source_artifacts_scope_sha256;
DROP INDEX IF EXISTS idx_source_artifacts_scope_revision;
DROP TABLE IF EXISTS source_artifacts;

-- Drop source_revisions table
DROP INDEX IF EXISTS idx_source_revisions_modified_time;
DROP INDEX IF EXISTS idx_source_revisions_scope_handle;
DROP INDEX IF EXISTS idx_source_revisions_scope_document;
DROP TABLE IF EXISTS source_revisions;

-- Drop source_handles table
DROP INDEX IF EXISTS uq_source_handles_active_provider_file_account;
DROP INDEX IF EXISTS idx_source_handles_validity;
DROP INDEX IF EXISTS idx_source_handles_scope_external;
DROP INDEX IF EXISTS idx_source_handles_scope_document;
DROP TABLE IF EXISTS source_handles;

-- Drop source_documents table
DROP INDEX IF EXISTS idx_source_documents_scope_provider;
DROP INDEX IF EXISTS idx_source_documents_scope_status;
DROP TABLE IF EXISTS source_documents;
