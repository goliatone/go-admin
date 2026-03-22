ALTER TABLE source_relationships
    ADD COLUMN predecessor_source_document_id TEXT NOT NULL DEFAULT '';

ALTER TABLE source_relationships
    ADD COLUMN successor_source_document_id TEXT NOT NULL DEFAULT '';
