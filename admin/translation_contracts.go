package admin

import (
	"github.com/goliatone/go-admin/internal/primitives"
	translationcore "github.com/goliatone/go-admin/translations/core"
	translationui "github.com/goliatone/go-admin/translations/ui"
	"sort"
	"strings"
)

const translationSharedContractSchemaVersionCurrent = 5

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
		"matrix_contracts":      TranslationMatrixContractPayload(),
		"disabled_reason_codes": ActionDisabledReasonCodes(),
		"source_target_drift":   TranslationSourceTargetDriftContract(),
		"editor_contracts":      TranslationEditorContractPayload(),
		"flow_vocabulary":       translationcore.VocabularyPayload(),
		"openapi": map[string]any{
			"schema_version": translationcore.SchemaVersion,
			"artifact_path":  "translations/ui/openapi/translations.json",
			"artifact_bytes": len(translationui.OpenAPISpec()),
		},
	}
}

// TranslationStatusEnumContract returns stable status enums shared across
// core translation readiness, queue, and exchange payloads.
func TranslationStatusEnumContract() map[string]any {
	coreReadiness := translationCoreReadinessStates()
	queueStates := translationQueueStates()
	queueContentStates := translationQueueContentStates()
	queueDueStates := translationQueueDueStates()
	exchangeRowStates := translationExchangeRowStates()
	exchangeJobStates := translationExchangeJobStates()
	return map[string]any{
		"core": map[string]any{
			"readiness_state": coreReadiness,
		},
		"queue": map[string]any{
			"queue_state":   queueStates,
			"content_state": queueContentStates,
			"due_state":     queueDueStates,
		},
		"exchange": map[string]any{
			"row_status": exchangeRowStates,
			"job_status": exchangeJobStates,
		},
		"all": translationStatusUnion(
			coreReadiness,
			queueStates,
			queueContentStates,
			queueDueStates,
			exchangeRowStates,
			exchangeJobStates,
		),
	}
}

// TranslationSourceTargetDriftContract documents the source-target drift metadata
// contract expected by side-by-side editor surfaces.
func TranslationSourceTargetDriftContract() map[string]any {
	return map[string]any{
		"key": translationSourceTargetDriftKey,
		"required_fields": []string{
			translationSourceTargetDriftSourceHashKey,
			translationSourceTargetDriftSourceVersionKey,
			translationSourceTargetDriftChangedSummaryKey,
		},
		"summary_fields": []string{
			translationSourceTargetDriftSummaryCountKey,
			translationSourceTargetDriftSummaryFieldsKey,
		},
	}
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
	return []string{
		translationReadinessStateReady,
		translationReadinessStateMissingLocales,
		translationReadinessStateMissingFields,
		translationReadinessStateMissingLocalesFields,
	}
}

func translationQueueStates() []string {
	return []string{
		string(AssignmentStatusPending),
		string(AssignmentStatusAssigned),
		string(AssignmentStatusInProgress),
		string(AssignmentStatusReview),
		string(AssignmentStatusRejected),
		string(AssignmentStatusApproved),
		string(AssignmentStatusPublished),
		string(AssignmentStatusArchived),
	}
}

func translationQueueContentStates() []string {
	return []string{
		translationQueueContentStateDraft,
		translationQueueContentStateReview,
		translationQueueContentStateReady,
		translationQueueContentStateArchived,
	}
}

func translationQueueDueStates() []string {
	return []string{
		translationQueueDueStateOverdue,
		translationQueueDueStateSoon,
		translationQueueDueStateOnTrack,
		translationQueueDueStateNone,
	}
}

func translationExchangeRowStates() []string {
	return []string{
		translationExchangeRowStatusSuccess,
		translationExchangeRowStatusError,
		translationExchangeRowStatusConflict,
		translationExchangeRowStatusSkipped,
	}
}

func translationExchangeJobStates() []string {
	return []string{
		translationExchangeAsyncJobStatusRunning,
		translationExchangeAsyncJobStatusCompleted,
		translationExchangeAsyncJobStatusFailed,
	}
}

func translationStatusUnion(groups ...[]string) []string {
	out := []string{}
	seen := map[string]struct{}{}
	for _, group := range groups {
		for _, raw := range group {
			value := strings.TrimSpace(raw)
			if value == "" {
				continue
			}
			key := strings.ToLower(value)
			if _, ok := seen[key]; ok {
				continue
			}
			seen[key] = struct{}{}
			out = append(out, value)
		}
	}
	return out
}

func normalizeTranslationReadinessState(state string) string {
	switch strings.ToLower(strings.TrimSpace(state)) {
	case translationReadinessStateReady:
		return translationReadinessStateReady
	case translationReadinessStateMissingLocales:
		return translationReadinessStateMissingLocales
	case translationReadinessStateMissingFields:
		return translationReadinessStateMissingFields
	case translationReadinessStateMissingLocalesFields:
		return translationReadinessStateMissingLocalesFields
	default:
		return translationReadinessStateReady
	}
}

func normalizeTranslationQueueState(state string) string {
	switch strings.ToLower(strings.TrimSpace(state)) {
	case string(AssignmentStatusPending):
		return string(AssignmentStatusPending)
	case string(AssignmentStatusAssigned):
		return string(AssignmentStatusAssigned)
	case string(AssignmentStatusInProgress):
		return string(AssignmentStatusInProgress)
	case string(AssignmentStatusReview):
		return string(AssignmentStatusReview)
	case string(AssignmentStatusRejected):
		return string(AssignmentStatusRejected)
	case string(AssignmentStatusApproved):
		return string(AssignmentStatusApproved)
	case string(AssignmentStatusPublished):
		return string(AssignmentStatusPublished)
	case string(AssignmentStatusArchived):
		return string(AssignmentStatusArchived)
	default:
		return string(AssignmentStatusPending)
	}
}

func normalizeTranslationQueueContentState(state string) string {
	switch strings.ToLower(strings.TrimSpace(state)) {
	case translationQueueContentStateDraft:
		return translationQueueContentStateDraft
	case translationQueueContentStateReview:
		return translationQueueContentStateReview
	case translationQueueContentStateReady:
		return translationQueueContentStateReady
	case translationQueueContentStateArchived:
		return translationQueueContentStateArchived
	default:
		return translationQueueContentStateDraft
	}
}

func normalizeTranslationQueueDueState(state string) string {
	switch strings.ToLower(strings.TrimSpace(state)) {
	case translationQueueDueStateOverdue:
		return translationQueueDueStateOverdue
	case translationQueueDueStateSoon:
		return translationQueueDueStateSoon
	case translationQueueDueStateOnTrack:
		return translationQueueDueStateOnTrack
	case translationQueueDueStateNone:
		return translationQueueDueStateNone
	default:
		return translationQueueDueStateNone
	}
}

func normalizeTranslationExchangeRowStatus(status string) string {
	switch strings.ToLower(strings.TrimSpace(status)) {
	case translationExchangeRowStatusSuccess:
		return translationExchangeRowStatusSuccess
	case translationExchangeRowStatusError:
		return translationExchangeRowStatusError
	case translationExchangeRowStatusConflict:
		return translationExchangeRowStatusConflict
	case translationExchangeRowStatusSkipped:
		return translationExchangeRowStatusSkipped
	default:
		return translationExchangeRowStatusError
	}
}

func normalizeTranslationExchangeJobStatus(status string) string {
	switch strings.ToLower(strings.TrimSpace(status)) {
	case translationExchangeAsyncJobStatusRunning:
		return translationExchangeAsyncJobStatusRunning
	case translationExchangeAsyncJobStatusCompleted:
		return translationExchangeAsyncJobStatusCompleted
	case translationExchangeAsyncJobStatusFailed:
		return translationExchangeAsyncJobStatusFailed
	default:
		return translationExchangeAsyncJobStatusFailed
	}
}

func applySourceTargetDriftContract(record map[string]any) {
	if len(record) == 0 {
		return
	}
	drift := sourceTargetDriftPayload(record)
	if len(drift) == 0 {
		return
	}
	record[translationSourceTargetDriftKey] = drift
}

func sourceTargetDriftPayload(record map[string]any) map[string]any {
	if len(record) == 0 || !hasSourceTargetDriftInput(record) {
		return nil
	}
	existing := extractMap(record[translationSourceTargetDriftKey])
	sourceHash := strings.TrimSpace(primitives.FirstNonEmptyRaw(
		toString(existing[translationSourceTargetDriftSourceHashKey]),
		toString(record[translationSourceTargetDriftSourceHashKey]),
		toString(record[translationSourceTargetDriftCurrentSourceHashKey]),
	))
	sourceVersion := strings.TrimSpace(primitives.FirstNonEmptyRaw(
		toString(existing[translationSourceTargetDriftSourceVersionKey]),
		toString(record[translationSourceTargetDriftSourceVersionKey]),
	))

	summary := primitives.CloneAnyMap(extractMap(existing[translationSourceTargetDriftChangedSummaryKey]))
	if len(summary) == 0 {
		summary = primitives.CloneAnyMap(extractMap(record[translationSourceTargetDriftChangedSummaryKey]))
	}
	if summary == nil {
		summary = map[string]any{}
	}

	changedFields := normalizeDriftFields(
		toStringSlice(existing[translationSourceTargetDriftChangedFieldsKey]),
		toStringSlice(record[translationSourceTargetDriftChangedFieldsKey]),
		toStringSlice(record["source_changed_fields"]),
		toStringSlice(summary[translationSourceTargetDriftSummaryFieldsKey]),
		toStringSlice(summary[translationSourceTargetDriftChangedFieldsKey]),
	)
	summary[translationSourceTargetDriftSummaryFieldsKey] = changedFields
	delete(summary, translationSourceTargetDriftChangedFieldsKey)
	count := atoiDefault(toString(summary[translationSourceTargetDriftSummaryCountKey]), len(changedFields))
	if count < len(changedFields) {
		count = len(changedFields)
	}
	summary[translationSourceTargetDriftSummaryCountKey] = count

	return map[string]any{
		translationSourceTargetDriftSourceHashKey:     sourceHash,
		translationSourceTargetDriftSourceVersionKey:  sourceVersion,
		translationSourceTargetDriftChangedSummaryKey: summary,
	}
}

func hasSourceTargetDriftInput(record map[string]any) bool {
	if len(record) == 0 {
		return false
	}
	if len(extractMap(record[translationSourceTargetDriftKey])) > 0 {
		return true
	}
	if strings.TrimSpace(toString(record[translationSourceTargetDriftSourceHashKey])) != "" {
		return true
	}
	if strings.TrimSpace(toString(record[translationSourceTargetDriftCurrentSourceHashKey])) != "" {
		return true
	}
	if strings.TrimSpace(toString(record[translationSourceTargetDriftSourceVersionKey])) != "" {
		return true
	}
	if len(toStringSlice(record[translationSourceTargetDriftChangedFieldsKey])) > 0 {
		return true
	}
	if len(toStringSlice(record["source_changed_fields"])) > 0 {
		return true
	}
	return len(extractMap(record[translationSourceTargetDriftChangedSummaryKey])) > 0
}

func normalizeDriftFields(groups ...[]string) []string {
	out := []string{}
	seen := map[string]struct{}{}
	for _, group := range groups {
		for _, raw := range group {
			field := strings.TrimSpace(raw)
			if field == "" {
				continue
			}
			key := strings.ToLower(field)
			if _, ok := seen[key]; ok {
				continue
			}
			seen[key] = struct{}{}
			out = append(out, field)
		}
	}
	sort.Strings(out)
	return out
}
