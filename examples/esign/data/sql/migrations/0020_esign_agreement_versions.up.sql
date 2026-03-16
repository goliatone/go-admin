ALTER TABLE agreements ADD COLUMN workflow_kind TEXT NOT NULL DEFAULT 'standard';
ALTER TABLE agreements ADD COLUMN root_agreement_id TEXT NOT NULL DEFAULT '';
ALTER TABLE agreements ADD COLUMN parent_agreement_id TEXT NOT NULL DEFAULT '';
ALTER TABLE agreements ADD COLUMN parent_executed_sha256 TEXT NOT NULL DEFAULT '';

UPDATE agreements
SET workflow_kind = 'standard'
WHERE TRIM(COALESCE(workflow_kind, '')) = '';

UPDATE agreements
SET root_agreement_id = id
WHERE TRIM(COALESCE(root_agreement_id, '')) = '';
