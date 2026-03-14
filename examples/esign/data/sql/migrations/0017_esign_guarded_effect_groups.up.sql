ALTER TABLE guarded_effects
    ADD COLUMN group_type TEXT NOT NULL DEFAULT '';

ALTER TABLE guarded_effects
    ADD COLUMN group_id TEXT NOT NULL DEFAULT '';

CREATE INDEX idx_guarded_effects_scope_group
    ON guarded_effects (tenant_id, org_id, group_type, group_id, created_at DESC);
