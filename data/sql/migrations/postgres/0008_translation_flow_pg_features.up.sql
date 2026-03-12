CREATE INDEX IF NOT EXISTS ix_families_blocker_codes_gin
    ON content_families USING GIN (CAST(blocker_codes_json AS JSONB));

ALTER TABLE content_families
    ADD CONSTRAINT fk_families_source_variant
    FOREIGN KEY (source_variant_id, family_id, source_locale)
    REFERENCES locale_variants(variant_id, family_id, locale)
    DEFERRABLE INITIALLY DEFERRED;

CREATE UNIQUE INDEX IF NOT EXISTS ux_assignments_scope_active_family_locale_scope
    ON translation_assignments(
        COALESCE(tenant_id, '__global__'),
        COALESCE(org_id, '__global__'),
        family_id,
        target_locale,
        work_scope
    )
    WHERE status IN ('open', 'assigned', 'in_progress', 'in_review', 'changes_requested');
