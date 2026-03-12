CREATE UNIQUE INDEX IF NOT EXISTS ux_assignments_scope_active_family_locale_scope
    ON translation_assignments(
        COALESCE(tenant_id, '__global__'),
        COALESCE(org_id, '__global__'),
        family_id,
        target_locale,
        work_scope
    )
    WHERE status IN ('open', 'assigned', 'in_progress', 'in_review', 'changes_requested');
