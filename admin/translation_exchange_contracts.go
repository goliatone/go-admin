package admin

func TranslationExchangeContractPayload() map[string]any {
	return map[string]any{
		"job": map[string]any{
			"kinds": []string{
				translationExchangeJobKindExport,
				translationExchangeJobKindImportValidate,
				translationExchangeJobKindImportApply,
			},
			"statuses": translationExchangeJobStates(),
			"required_fields": []string{
				"id",
				"kind",
				"status",
				"poll_endpoint",
				"progress",
				"created_at",
				"updated_at",
			},
			"progress_fields": []string{
				"total",
				"processed",
				"succeeded",
				"failed",
				"conflicts",
				"skipped",
			},
			"optional_fields": []string{
				"actor",
				"file",
				"summary",
				"downloads",
				"fixture",
			},
		},
		"validation_summary": map[string]any{
			"required_fields": []string{"processed", "succeeded", "failed"},
			"optional_fields": []string{"conflicts", "skipped", "partial_success", "by_status", "by_conflict"},
		},
		"conflict_row": map[string]any{
			"types": []string{
				translationExchangeConflictTypeMissingLinkage,
				translationExchangeConflictTypeDuplicateRow,
				translationExchangeConflictTypeStaleSource,
			},
			"required_fields": []string{"index", "resource", "entity_id", "translation_group_id", "target_locale", "field_path", "status"},
			"conflict_fields": []string{"type", "message", "current_source_hash", "provided_source_hash"},
		},
		"upload_state": map[string]any{
			"states":          []string{"idle", "selected", "uploading", "validated", "error"},
			"required_fields": []string{"state", "filename", "format", "row_count"},
		},
		"history": map[string]any{
			"required_fields": []string{"items", "page", "per_page", "total", "has_more", "counts"},
			"count_fields":    []string{"by_kind", "by_status"},
			"meta_fields":     []string{"job_kinds", "job_statuses", "download_kinds", "include_examples"},
		},
		"downloads": map[string]any{
			"kinds":           []string{translationExchangeDownloadKindArtifact, translationExchangeDownloadKindInput, translationExchangeDownloadKindReport},
			"required_fields": []string{"kind", "label", "filename", "content_type", "href"},
		},
	}
}
