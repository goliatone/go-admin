ALTER TABLE locale_variants ADD COLUMN IF NOT EXISTS source_record_id TEXT NOT NULL DEFAULT '';

ALTER TABLE translation_assignments ADD COLUMN IF NOT EXISTS entity_type TEXT NOT NULL DEFAULT '';
ALTER TABLE translation_assignments ADD COLUMN IF NOT EXISTS source_record_id TEXT NOT NULL DEFAULT '';
ALTER TABLE translation_assignments ADD COLUMN IF NOT EXISTS target_record_id TEXT;
ALTER TABLE translation_assignments ADD COLUMN IF NOT EXISTS source_title TEXT;
ALTER TABLE translation_assignments ADD COLUMN IF NOT EXISTS source_path TEXT;
ALTER TABLE translation_assignments ADD COLUMN IF NOT EXISTS assigner_id TEXT;
ALTER TABLE translation_assignments ADD COLUMN IF NOT EXISTS last_reviewer_id TEXT;
ALTER TABLE translation_assignments ADD COLUMN IF NOT EXISTS last_rejection_reason TEXT;
ALTER TABLE translation_assignments ADD COLUMN IF NOT EXISTS published_at TEXT;
