package admin

import (
	translationcontracts "github.com/goliatone/go-admin/admin/internal/translationcontracts"
	translationcore "github.com/goliatone/go-admin/translations/core"
	translationui "github.com/goliatone/go-admin/translations/ui"
)

const translationSharedContractSchemaVersionCurrent = 6

const (
	translationQueueContentStateDraft    = "draft"
	translationQueueContentStateReview   = "review"
	translationQueueContentStateReady    = "ready"
	translationQueueContentStateArchived = "archived"
)

const (
	translationQueueDueStateOverdue = "overdue"
	translationQueueDueStateSoon    = "due_soon"
	translationQueueDueStateOnTrack = "on_track"
	translationQueueDueStateNone    = "none"
)

const (
	translationSourceTargetDriftKey                  = "source_target_drift"
	translationSourceTargetDriftSourceHashKey        = "source_hash"
	translationSourceTargetDriftSourceVersionKey     = "source_version"
	translationSourceTargetDriftChangedFieldsKey     = "changed_fields"
	translationSourceTargetDriftChangedSummaryKey    = "changed_fields_summary"
	translationSourceTargetDriftSummaryCountKey      = "count"
	translationSourceTargetDriftSummaryFieldsKey     = "fields"
	translationSourceTargetDriftCurrentSourceHashKey = "current_source_hash"
)

// TranslationSharedContractsPayload returns the canonical shared translation contracts
// consumed by frontend status/reason renderers.
func TranslationSharedContractsPayload() map[string]any {
	return map[string]any{
		"schema_version":        translationSharedContractSchemaVersionCurrent,
		"status_enums":          TranslationStatusEnumContract(),
		"dashboard_contracts":   TranslationDashboardContractPayload(),
		"queue_contracts":       TranslationQueueContractPayload(),
		"exchange_contracts":    TranslationExchangeContractPayload(),
		"matrix_contracts":      TranslationMatrixContractPayload(),
		"disabled_reason_codes": ActionDisabledReasonCodes(),
		"source_target_drift":   TranslationSourceTargetDriftContract(),
		"editor_contracts":      TranslationEditorContractPayload(),
		"flow_vocabulary":       translationFlowVocabularyPayload(),
		"openapi": map[string]any{
			"schema_version": translationcore.SchemaVersion,
			"artifact_path":  "translations/ui/openapi/translations.json",
			"artifact_bytes": len(translationui.OpenAPISpec()),
		},
	}
}

func translationFlowVocabularyPayload() map[string]any {
	payload := translationcore.VocabularyPayload()
	payload["disabled_reason_codes"] = ActionDisabledReasonCodes()
	return payload
}

// TranslationStatusEnumContract returns stable status enums shared across
// core translation readiness, queue, and exchange payloads.
func TranslationStatusEnumContract() map[string]any {
	return translationcontracts.StatusEnumContract()
}

// TranslationSourceTargetDriftContract documents the source-target drift metadata
// contract expected by side-by-side editor surfaces.
func TranslationSourceTargetDriftContract() map[string]any {
	return translationcontracts.SourceTargetDriftContract()
}

// TranslationEditorContractPayload documents the editor-side field and assist
// envelopes shared by backend payloads and frontend parsers.
func TranslationEditorContractPayload() map[string]any {
	return map[string]any{
		"field_completeness": map[string]any{
			"required_fields": []string{"required", "complete", "missing"},
		},
		"version_fields": map[string]any{
			"variant_version_fields":    []string{"row_version", "version"},
			"assignment_version_fields": []string{"assignment_row_version", "assignment_version", "translation_assignment.row_version", "translation_assignment.version"},
		},
		"source_sync": map[string]any{
			"ack_request_fields":    []string{translationEditorAcknowledgedSourceHashKey, translationEditorSourceHashAtLastSyncKey},
			"ack_response_fields":   []string{translationEditorSourceHashAtLastSyncKey, translationSourceTargetDriftKey},
			"default_save_behavior": "preserve_existing_sync_baseline",
			"ack_required_behavior": "advance_baseline_only_when_request_matches_current_source_hash",
		},
		"field_drift": map[string]any{
			"required_fields":  []string{"changed", "comparison_mode", "previous_source_value", "current_source_value"},
			"comparison_modes": []string{translationEditorComparisonModeSnapshot, translationEditorComparisonModeHashOnly},
		},
		"field_validations": map[string]any{
			"required_fields": []string{"valid", "message"},
		},
		"assist": map[string]any{
			"glossary_matches_fallback_keys":   []string{"assist.glossary_matches", "glossary_matches"},
			"style_guide_fallback_keys":        []string{"assist.style_guide_summary", "style_guide_summary"},
			"translation_memory_key":           "translation_memory_suggestions",
			"glossary_match_required_fields":   []string{"term", "preferred_translation", "field_paths"},
			"style_guide_required_fields":      []string{"available", "title", "summary", "rules"},
			"action_envelope_required_actions": []string{"claim", "release", "submit_review", "approve", "reject", "archive"},
			"assignment_action_state_payloads": []string{"actions", "editor_actions", "assignment_action_states"},
			"review_action_state_payloads":     []string{"review_actions", "review_action_states"},
		},
		"qa": map[string]any{
			"payload_key":             "qa_results",
			"summary_key":             "summary",
			"category_key":            "categories",
			"findings_key":            "findings",
			"severities":              []string{translationQASeverityWarning, translationQASeverityBlocker},
			"categories":              []string{"terminology", "style"},
			"required_summary":        []string{"finding_count", "warning_count", "blocker_count"},
			"required_finding_fields": []string{"id", "category", "severity", "field_path", "message"},
			"feature_flags":           []string{string(FeatureTranslationQATerms), string(FeatureTranslationQAStyle)},
		},
		"review_feedback": map[string]any{
			"payload_key":             "review_feedback",
			"legacy_reason_key":       "last_rejection_reason",
			"comments_key":            "comments",
			"required_comment_fields": []string{"id", "body", "kind", "created_at"},
		},
		"history": map[string]any{
			"payload_key":     "history",
			"required_fields": []string{"items", "page", "per_page", "total", "has_more"},
			"entry_types":     []string{"comment", "event"},
			"fallback_keys":   []string{"comments", "events"},
		},
		"attachments": map[string]any{
			"payload_key":      "attachments",
			"summary_key":      "attachment_summary",
			"required_fields":  []string{"id", "kind", "filename", "byte_size", "uploaded_at", "description", "url"},
			"summary_required": []string{"total", "kinds"},
		},
	}
}

func translationCoreReadinessStates() []string {
	return translationcontracts.CoreReadinessStates()
}

func translationQueueStates() []string {
	return translationcontracts.QueueStates()
}

func translationQueueContentStates() []string {
	return translationcontracts.QueueContentStates()
}

func translationQueueDueStates() []string {
	return translationcontracts.QueueDueStates()
}

func translationExchangeRowStates() []string {
	return translationcontracts.ExchangeRowStates()
}

func translationExchangeJobStates() []string {
	return translationcontracts.ExchangeJobStates()
}

func translationStatusUnion(groups ...[]string) []string {
	return translationcontracts.StatusUnion(groups...)
}

func normalizeTranslationReadinessState(state string) string {
	return translationcontracts.NormalizeReadinessState(state)
}

func normalizeTranslationQueueState(state string) string {
	return translationcontracts.NormalizeQueueState(state)
}

func normalizeTranslationQueueDueState(state string) string {
	return translationcontracts.NormalizeQueueDueState(state)
}

func normalizeTranslationExchangeRowStatus(status string) string {
	return translationcontracts.NormalizeExchangeRowStatus(status)
}

func normalizeTranslationExchangeJobStatus(status string) string {
	return translationcontracts.NormalizeExchangeJobStatus(status)
}

func applySourceTargetDriftContract(record map[string]any) {
	translationcontracts.ApplySourceTargetDriftContract(record)
}

func sourceTargetDriftPayload(record map[string]any) map[string]any {
	return translationcontracts.SourceTargetDriftPayload(record)
}

func hasSourceTargetDriftInput(record map[string]any) bool {
	return translationcontracts.HasSourceTargetDriftInput(record)
}

func normalizeDriftFields(groups ...[]string) []string {
	return translationcontracts.NormalizeDriftFields(groups...)
}
