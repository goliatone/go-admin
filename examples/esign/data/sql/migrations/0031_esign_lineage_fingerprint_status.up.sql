ALTER TABLE source_fingerprints
    ADD COLUMN status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('ready', 'failed'));

ALTER TABLE source_fingerprints
    ADD COLUMN extraction_metadata_json TEXT NOT NULL DEFAULT '{}';

ALTER TABLE source_fingerprints
    ADD COLUMN error_code TEXT NOT NULL DEFAULT '';

ALTER TABLE source_fingerprints
    ADD COLUMN error_message TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_source_fingerprints_status
    ON source_fingerprints (tenant_id, org_id, status, created_at DESC);
