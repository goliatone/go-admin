DROP INDEX IF EXISTS idx_guarded_effects_scope_group;

ALTER TABLE guarded_effects
    DROP COLUMN group_id;

ALTER TABLE guarded_effects
    DROP COLUMN group_type;
