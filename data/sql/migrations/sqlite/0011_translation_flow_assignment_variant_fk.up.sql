PRAGMA foreign_keys = OFF;

DROP INDEX IF EXISTS ux_assignments_scope_active_family_locale_scope;

CREATE TABLE translation_assignments_new (
    assignment_id TEXT PRIMARY KEY,
    tenant_id TEXT,
    org_id TEXT,
    family_id TEXT NOT NULL REFERENCES content_families(family_id) ON DELETE CASCADE,
    variant_id TEXT,
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
    entity_type TEXT NOT NULL DEFAULT '',
    source_record_id TEXT NOT NULL DEFAULT '',
    target_record_id TEXT,
    source_title TEXT,
    source_path TEXT,
    assigner_id TEXT,
    last_reviewer_id TEXT,
    last_rejection_reason TEXT,
    published_at TEXT,
    CONSTRAINT fk_assignments_variant_family_locale
        FOREIGN KEY (variant_id, family_id, target_locale)
        REFERENCES locale_variants(variant_id, family_id, locale)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

INSERT INTO translation_assignments_new (
    assignment_id, tenant_id, org_id, family_id, variant_id, source_locale,
    target_locale, work_scope, assignment_type, status, assignee_id, reviewer_id,
    priority, due_date, row_version, claimed_at, submitted_at, approved_at,
    archived_at, created_at, updated_at, entity_type, source_record_id,
    target_record_id, source_title, source_path, assigner_id, last_reviewer_id,
    last_rejection_reason, published_at
)
SELECT
    assignment_id, tenant_id, org_id, family_id, variant_id, source_locale,
    target_locale, work_scope, assignment_type, status, assignee_id, reviewer_id,
    priority, due_date, row_version, claimed_at, submitted_at, approved_at,
    archived_at, created_at, updated_at, entity_type, source_record_id,
    target_record_id, source_title, source_path, assigner_id, last_reviewer_id,
    last_rejection_reason, published_at
FROM translation_assignments;

DROP TABLE translation_assignments;
ALTER TABLE translation_assignments_new RENAME TO translation_assignments;

CREATE INDEX IF NOT EXISTS ix_assignments_scope_family_locale_scope_status
    ON translation_assignments(tenant_id, org_id, family_id, target_locale, work_scope, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS ix_assignments_scope_assignee_status_due
    ON translation_assignments(tenant_id, org_id, assignee_id, status, due_date);
CREATE INDEX IF NOT EXISTS ix_assignments_scope_reviewer_status_due
    ON translation_assignments(tenant_id, org_id, reviewer_id, status, due_date);
CREATE UNIQUE INDEX IF NOT EXISTS ux_assignments_scope_active_family_locale_scope
    ON translation_assignments(
        COALESCE(tenant_id, '__global__'),
        COALESCE(org_id, '__global__'),
        family_id,
        target_locale,
        work_scope
    )
    WHERE status IN ('open', 'assigned', 'in_progress', 'in_review', 'changes_requested');

PRAGMA foreign_keys = ON;
