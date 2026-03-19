DROP INDEX IF EXISTS idx_google_import_runs_source_artifact;
DROP INDEX IF EXISTS idx_google_import_runs_source_revision;
DROP INDEX IF EXISTS idx_google_import_runs_source_document;

ALTER TABLE google_import_runs
    DROP COLUMN agreement_detail_url;

ALTER TABLE google_import_runs
    DROP COLUMN document_detail_url;

ALTER TABLE google_import_runs
    DROP COLUMN candidate_status_json;

ALTER TABLE google_import_runs
    DROP COLUMN fingerprint_status;

ALTER TABLE google_import_runs
    DROP COLUMN lineage_status;

ALTER TABLE google_import_runs
    DROP COLUMN source_artifact_id;

ALTER TABLE google_import_runs
    DROP COLUMN source_revision_id;

ALTER TABLE google_import_runs
    DROP COLUMN source_document_id;
