ALTER TABLE translation_assignments
    DROP CONSTRAINT IF EXISTS fk_assignments_variant_family_locale;

ALTER TABLE translation_assignments
    ALTER COLUMN variant_id DROP NOT NULL;

ALTER TABLE translation_assignments
    ADD CONSTRAINT fk_assignments_variant_family_locale
    FOREIGN KEY (variant_id, family_id, target_locale)
    REFERENCES locale_variants(variant_id, family_id, locale)
    ON UPDATE CASCADE
    ON DELETE CASCADE;

ALTER TABLE content_families
    DROP CONSTRAINT IF EXISTS fk_families_source_variant;

ALTER TABLE content_families
    ADD CONSTRAINT fk_families_source_variant
    FOREIGN KEY (source_variant_id, family_id, source_locale)
    REFERENCES locale_variants(variant_id, family_id, locale)
    ON UPDATE CASCADE
    DEFERRABLE INITIALLY DEFERRED;
