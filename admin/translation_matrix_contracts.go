package admin

const (
	translationMatrixContractSchemaVersionCurrent = 2
	translationMatrixLatencyTargetMS              = 400
	translationMatrixDefaultPageSize              = 25
	translationMatrixDefaultLocaleLimit           = 20
	translationMatrixMaxPageSize                  = 100
	translationMatrixMaxLocaleLimit               = 50

	translationMatrixCellStateReady       = "ready"
	translationMatrixCellStateMissing     = "missing"
	translationMatrixCellStateInProgress  = "in_progress"
	translationMatrixCellStateInReview    = "in_review"
	translationMatrixCellStateFallback    = "fallback"
	translationMatrixCellStateNotRequired = "not_required"

	translationMatrixBulkActionCreateMissing  = "create_missing"
	translationMatrixBulkActionExportSelected = "export_selected"

	translationMatrixBulkResultStatusCreated     = "created"
	translationMatrixBulkResultStatusExportReady = "export_ready"
	translationMatrixBulkResultStatusSkipped     = "skipped"
	translationMatrixBulkResultStatusFailed      = "failed"
)

func TranslationMatrixContractPayload() map[string]any {
	return map[string]any{
		"schema_version": translationMatrixContractSchemaVersionCurrent,
		"cell_states": []string{
			translationMatrixCellStateReady,
			translationMatrixCellStateMissing,
			translationMatrixCellStateInProgress,
			translationMatrixCellStateInReview,
			translationMatrixCellStateFallback,
			translationMatrixCellStateNotRequired,
		},
		"latency_target_ms": translationMatrixLatencyTargetMS,
		"query_model":       TranslationMatrixQueryModel(),
		"bulk_actions": map[string]any{
			translationMatrixBulkActionCreateMissing: map[string]any{
				"id":                 translationMatrixBulkActionCreateMissing,
				"permission":         PermAdminTranslationsEdit,
				"endpoint_route":     "translations.matrix.actions.create_missing",
				"resolver_key":       "admin.api.translations.matrix.actions.create_missing",
				"required_fields":    []string{"family_ids"},
				"optional_fields":    []string{"locales", "auto_create_assignment", "assignee_id", "priority", "due_date", "channel"},
				"result_statuses":    []string{translationMatrixBulkResultStatusCreated, translationMatrixBulkResultStatusSkipped, translationMatrixBulkResultStatusFailed},
				"selection_required": true,
			},
			translationMatrixBulkActionExportSelected: map[string]any{
				"id":                 translationMatrixBulkActionExportSelected,
				"permission":         translationExchangePermissionExport,
				"endpoint_route":     "translations.matrix.actions.export_selected",
				"resolver_key":       "admin.api.translations.matrix.actions.export_selected",
				"required_fields":    []string{"family_ids"},
				"optional_fields":    []string{"locales", "include_source_hash", "format", "channel"},
				"result_statuses":    []string{translationMatrixBulkResultStatusExportReady, translationMatrixBulkResultStatusSkipped, translationMatrixBulkResultStatusFailed},
				"selection_required": true,
			},
		},
		"ui_metadata": map[string]any{
			"locale_policy_key":          "meta.locale_policy",
			"quick_action_targets_key":   "meta.quick_action_targets",
			"row_link_keys":              []string{"family", "content_detail", "content_edit"},
			"cell_quick_action_keys":     []string{"open", "create"},
			"selection_bulk_actions_key": "data.selection.bulk_actions",
		},
	}
}

func TranslationMatrixQueryModel() map[string]any {
	return map[string]any{
		"id":           "family_locale_matrix",
		"description":  "Families as rows and locales as columns, with backend-resolved cell states and bulk-action contracts.",
		"scope_fields": []string{"tenant_id", "org_id"},
		"supported_filters": []string{
			"family_id",
			"content_type",
			"readiness_state",
			"blocker_code",
			"locale",
			"locales",
			"channel",
		},
		"stable_sort_keys":     []string{"updated_at", "content_type", "family_id"},
		"default_page_size":    translationMatrixDefaultPageSize,
		"max_page_size":        translationMatrixMaxPageSize,
		"default_locale_limit": translationMatrixDefaultLocaleLimit,
		"max_locale_limit":     translationMatrixMaxLocaleLimit,
		"viewport_target": map[string]any{
			"rows":    translationMatrixMaxPageSize,
			"locales": translationMatrixDefaultLocaleLimit,
		},
		"index_hints": []string{
			"content_families_scope_readiness_idx",
			"content_families_scope_type_updated_idx",
			"family_blockers_scope_code_locale_family_idx",
			"translation_assignments_scope_family_locale_scope_status_idx",
			"locale_variants_scope_status_updated_idx",
		},
		"ui_route":  "translations.matrix",
		"api_route": "translations.matrix",
		"resolver_keys": []string{
			"admin.translations.matrix",
			"admin.api.translations.matrix",
			"admin.api.translations.matrix.actions.create_missing",
			"admin.api.translations.matrix.actions.export_selected",
		},
	}
}
