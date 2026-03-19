ALTER TABLE documents ADD COLUMN source_document_id TEXT NOT NULL DEFAULT '';
ALTER TABLE documents ADD COLUMN source_revision_id TEXT NOT NULL DEFAULT '';
ALTER TABLE documents ADD COLUMN source_artifact_id TEXT NOT NULL DEFAULT '';

ALTER TABLE agreements ADD COLUMN source_revision_id TEXT NOT NULL DEFAULT '';
