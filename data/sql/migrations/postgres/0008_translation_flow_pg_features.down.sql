DROP INDEX IF EXISTS ux_assignments_scope_active_family_locale_scope;
ALTER TABLE content_families DROP CONSTRAINT IF EXISTS fk_families_source_variant;
DROP INDEX IF EXISTS ix_families_blocker_codes_gin;
