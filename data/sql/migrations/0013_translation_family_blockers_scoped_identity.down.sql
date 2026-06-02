DROP INDEX IF EXISTS ux_family_blockers_identity;

CREATE UNIQUE INDEX IF NOT EXISTS ux_family_blockers_identity
    ON family_blockers(family_id, blocker_code, COALESCE(locale, ''), COALESCE(field_path, ''));
