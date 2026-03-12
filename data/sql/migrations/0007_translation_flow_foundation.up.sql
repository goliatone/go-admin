CREATE TABLE IF NOT EXISTS content_families (
    family_id TEXT PRIMARY KEY,
    tenant_id TEXT,
    org_id TEXT,
    content_type TEXT NOT NULL,
    source_locale TEXT NOT NULL,
    source_variant_id TEXT,
    readiness_state TEXT NOT NULL CHECK (readiness_state IN ('ready', 'blocked')),
    blocker_codes_json TEXT NOT NULL DEFAULT '[]',
    missing_required_locale_count INTEGER NOT NULL DEFAULT 0,
    pending_review_count INTEGER NOT NULL DEFAULT 0,
    outdated_locale_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_families_scope_type_updated
    ON content_families(tenant_id, org_id, content_type, updated_at DESC);
CREATE INDEX IF NOT EXISTS ix_families_scope_readiness_updated
    ON content_families(tenant_id, org_id, readiness_state, updated_at DESC);
CREATE INDEX IF NOT EXISTS ix_families_scope_missing_required
    ON content_families(tenant_id, org_id, missing_required_locale_count);

CREATE TABLE IF NOT EXISTS locale_variants (
    variant_id TEXT PRIMARY KEY,
    tenant_id TEXT,
    org_id TEXT,
    family_id TEXT NOT NULL REFERENCES content_families(family_id) ON DELETE CASCADE,
    locale TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('draft', 'in_progress', 'in_review', 'approved', 'published', 'archived')),
    is_source BOOLEAN NOT NULL DEFAULT FALSE,
    source_hash_at_last_sync TEXT,
    fields_json TEXT NOT NULL DEFAULT '{}',
    row_version BIGINT NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    published_at TEXT,
    CONSTRAINT ux_locale_variants_variant_family_locale UNIQUE (variant_id, family_id, locale)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_locale_variants_family_locale
    ON locale_variants(family_id, locale);
CREATE UNIQUE INDEX IF NOT EXISTS ux_locale_variants_one_source_per_family
    ON locale_variants(family_id)
    WHERE is_source = 1;
CREATE INDEX IF NOT EXISTS ix_locale_variants_scope_status_updated
    ON locale_variants(tenant_id, org_id, status, updated_at DESC);

CREATE TABLE IF NOT EXISTS translation_assignments (
    assignment_id TEXT PRIMARY KEY,
    tenant_id TEXT,
    org_id TEXT,
    family_id TEXT NOT NULL REFERENCES content_families(family_id) ON DELETE CASCADE,
    variant_id TEXT NOT NULL,
    source_locale TEXT NOT NULL,
    target_locale TEXT NOT NULL,
    work_scope TEXT NOT NULL DEFAULT '__all__',
    assignment_type TEXT NOT NULL CHECK (assignment_type IN ('open_pool', 'direct')),
    status TEXT NOT NULL CHECK (status IN ('open', 'assigned', 'in_progress', 'in_review', 'changes_requested', 'approved', 'archived')),
    assignee_id TEXT,
    reviewer_id TEXT,
    priority TEXT NOT NULL CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    due_date TEXT,
    row_version BIGINT NOT NULL DEFAULT 1,
    claimed_at TEXT,
    submitted_at TEXT,
    approved_at TEXT,
    archived_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_assignments_variant_family_locale
        FOREIGN KEY (variant_id, family_id, target_locale)
        REFERENCES locale_variants(variant_id, family_id, locale)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_assignments_scope_family_locale_scope_status
    ON translation_assignments(tenant_id, org_id, family_id, target_locale, work_scope, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS ix_assignments_scope_assignee_status_due
    ON translation_assignments(tenant_id, org_id, assignee_id, status, due_date);
CREATE INDEX IF NOT EXISTS ix_assignments_scope_reviewer_status_due
    ON translation_assignments(tenant_id, org_id, reviewer_id, status, due_date);

CREATE TABLE IF NOT EXISTS family_blockers (
    family_id TEXT NOT NULL REFERENCES content_families(family_id) ON DELETE CASCADE,
    tenant_id TEXT,
    org_id TEXT,
    blocker_code TEXT NOT NULL CHECK (blocker_code IN ('missing_locale', 'missing_field', 'pending_review', 'outdated_source', 'policy_denied')),
    locale TEXT,
    field_path TEXT,
    details_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_family_blockers_identity
    ON family_blockers(family_id, blocker_code, COALESCE(locale, ''), COALESCE(field_path, ''));
CREATE INDEX IF NOT EXISTS ix_family_blockers_scope_code_locale_family
    ON family_blockers(tenant_id, org_id, blocker_code, locale, family_id);

CREATE TABLE IF NOT EXISTS translation_assignment_events (
    event_id TEXT PRIMARY KEY,
    tenant_id TEXT,
    org_id TEXT,
    assignment_id TEXT NOT NULL REFERENCES translation_assignments(assignment_id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    from_status TEXT,
    to_status TEXT,
    actor_id TEXT NOT NULL,
    payload_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_assignment_events_scope_assignment_created
    ON translation_assignment_events(tenant_id, org_id, assignment_id, created_at DESC);

CREATE TABLE IF NOT EXISTS exchange_jobs (
    job_id TEXT PRIMARY KEY,
    tenant_id TEXT,
    org_id TEXT,
    kind TEXT NOT NULL CHECK (kind IN ('export', 'import_validate', 'import_apply')),
    status TEXT NOT NULL,
    created_by TEXT NOT NULL,
    progress_json TEXT NOT NULL DEFAULT '{}',
    result_json TEXT NOT NULL DEFAULT '{}',
    error TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_exchange_jobs_scope_created_by_created
    ON exchange_jobs(tenant_id, org_id, created_by, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_exchange_jobs_scope_status_updated
    ON exchange_jobs(tenant_id, org_id, status, updated_at DESC);
