CREATE UNIQUE INDEX IF NOT EXISTS uq_translation_assignments_active
ON translation_assignments (translation_group_id, entity_type, source_locale, target_locale)
WHERE status NOT IN ('published', 'archived');
