CREATE INDEX IF NOT EXISTS ix_translation_assignments_scope_status_updated
    ON translation_assignments(tenant_id, org_id, status, updated_at DESC, assignment_id);

CREATE INDEX IF NOT EXISTS ix_translation_assignments_scope_due
    ON translation_assignments(tenant_id, org_id, due_date, priority, assignment_id);

CREATE INDEX IF NOT EXISTS ix_translation_assignments_scope_assignee_due
    ON translation_assignments(tenant_id, org_id, assignee_id, status, due_date, assignment_id);

CREATE INDEX IF NOT EXISTS ix_translation_assignments_scope_reviewer_due
    ON translation_assignments(tenant_id, org_id, reviewer_id, last_reviewer_id, status, due_date, assignment_id);

CREATE INDEX IF NOT EXISTS ix_translation_assignments_scope_family_locale
    ON translation_assignments(tenant_id, org_id, family_id, target_locale, source_locale, entity_type, assignment_id);

CREATE INDEX IF NOT EXISTS ix_content_families_scope_readiness_updated
    ON content_families(tenant_id, org_id, readiness_state, updated_at DESC, family_id);

CREATE INDEX IF NOT EXISTS ix_content_families_scope_missing_required
    ON content_families(tenant_id, org_id, missing_required_locale_count, updated_at DESC, family_id);

CREATE INDEX IF NOT EXISTS ix_family_blockers_family_code_locale
    ON family_blockers(family_id, blocker_code, locale);
