ALTER TABLE locale_variants ADD COLUMN source_record_id TEXT NOT NULL DEFAULT '';

ALTER TABLE translation_assignments ADD COLUMN entity_type TEXT NOT NULL DEFAULT '';
ALTER TABLE translation_assignments ADD COLUMN source_record_id TEXT NOT NULL DEFAULT '';
ALTER TABLE translation_assignments ADD COLUMN target_record_id TEXT;
ALTER TABLE translation_assignments ADD COLUMN source_title TEXT;
ALTER TABLE translation_assignments ADD COLUMN source_path TEXT;
ALTER TABLE translation_assignments ADD COLUMN assigner_id TEXT;
ALTER TABLE translation_assignments ADD COLUMN last_reviewer_id TEXT;
ALTER TABLE translation_assignments ADD COLUMN last_rejection_reason TEXT;
ALTER TABLE translation_assignments ADD COLUMN published_at TEXT;
