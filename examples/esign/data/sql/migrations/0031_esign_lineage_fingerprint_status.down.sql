DROP INDEX IF EXISTS idx_source_fingerprints_status;

ALTER TABLE source_fingerprints DROP COLUMN IF EXISTS error_message;
ALTER TABLE source_fingerprints DROP COLUMN IF EXISTS error_code;
ALTER TABLE source_fingerprints DROP COLUMN IF EXISTS extraction_metadata_json;
ALTER TABLE source_fingerprints DROP COLUMN IF EXISTS status;
