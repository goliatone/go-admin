ALTER TABLE google_import_runs
    ADD COLUMN source_document_id TEXT NOT NULL DEFAULT '';

ALTER TABLE google_import_runs
    ADD COLUMN source_revision_id TEXT NOT NULL DEFAULT '';

ALTER TABLE google_import_runs
    ADD COLUMN source_artifact_id TEXT NOT NULL DEFAULT '';

ALTER TABLE google_import_runs
    ADD COLUMN lineage_status TEXT NOT NULL DEFAULT '';

ALTER TABLE google_import_runs
    ADD COLUMN fingerprint_status TEXT NOT NULL DEFAULT '';

ALTER TABLE google_import_runs
    ADD COLUMN candidate_status_json TEXT NOT NULL DEFAULT '[]';

ALTER TABLE google_import_runs
    ADD COLUMN document_detail_url TEXT NOT NULL DEFAULT '';

ALTER TABLE google_import_runs
    ADD COLUMN agreement_detail_url TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_google_import_runs_source_document
    ON google_import_runs (tenant_id, org_id, source_document_id);

CREATE INDEX IF NOT EXISTS idx_google_import_runs_source_revision
    ON google_import_runs (tenant_id, org_id, source_revision_id);

CREATE INDEX IF NOT EXISTS idx_google_import_runs_source_artifact
    ON google_import_runs (tenant_id, org_id, source_artifact_id);
