package admin

import (
	"strings"
	"time"
)

const (
	TranslationSuggestionGenerateCommandName = "translations.suggestions.generate"

	TranslationSuggestionReasonServiceUnavailable  = "service_unavailable"
	TranslationSuggestionReasonPermissionDenied    = "permission_denied"
	TranslationSuggestionReasonReadOnlyAssignment  = "read_only_assignment"
	TranslationSuggestionReasonFieldUnsupported    = "field_unsupported"
	TranslationSuggestionReasonEmptySource         = "empty_source"
	TranslationSuggestionReasonProviderUnavailable = "provider_unavailable"
	TranslationSuggestionReasonPolicyDenied        = "provider_policy_denied"
	TranslationSuggestionReasonQuotaExceeded       = "quota_exceeded"
	TranslationSuggestionReasonRateLimited         = "rate_limited"
)

// TranslationSuggestionInput is the transport-neutral command/service payload
// for generating a suggestion for one assignment field.
type TranslationSuggestionInput struct {
	AssignmentID   string         `json:"assignment_id"`
	FieldPath      string         `json:"field_path"`
	ActorID        string         `json:"actor_id,omitempty"`
	TenantID       string         `json:"tenant_id,omitempty"`
	OrgID          string         `json:"org_id,omitempty"`
	Channel        string         `json:"channel,omitempty"`
	Environment    string         `json:"environment,omitempty"`
	RequestID      string         `json:"request_id,omitempty"`
	CorrelationID  string         `json:"correlation_id,omitempty"`
	IdempotencyKey string         `json:"idempotency_key,omitempty"`
	Metadata       map[string]any `json:"metadata,omitempty"`

	// SourceText is accepted only for compatibility/correlation diagnostics.
	// The default service ignores it and reloads source text server-side.
	SourceText string `json:"source_text,omitempty"`

	Result *TranslationSuggestionResult `json:"-"`
}

func (TranslationSuggestionInput) Type() string { return TranslationSuggestionGenerateCommandName }

func (m TranslationSuggestionInput) Validate() error {
	if strings.TrimSpace(m.AssignmentID) == "" {
		return requiredFieldDomainError("assignment_id", nil)
	}
	if strings.TrimSpace(m.FieldPath) == "" {
		return requiredFieldDomainError("field_path", nil)
	}
	return nil
}

// TranslationSuggestionResult is safe to return to browser/RPC callers.
type TranslationSuggestionResult struct {
	AssignmentID  string         `json:"assignment_id"`
	FieldPath     string         `json:"field_path"`
	SuggestedText string         `json:"suggested_text"`
	Provider      string         `json:"provider,omitempty"`
	Model         string         `json:"model,omitempty"`
	SourceLocale  string         `json:"source_locale,omitempty"`
	TargetLocale  string         `json:"target_locale,omitempty"`
	Diagnostics   map[string]any `json:"diagnostics,omitempty"`
}

// TranslationSuggestionProviderInput is the sanitized provider request built
// after assignment, scope, permission, policy, quota, and rate-limit checks.
type TranslationSuggestionProviderInput struct {
	AssignmentID   string         `json:"assignment_id"`
	FieldPath      string         `json:"field_path"`
	EntityType     string         `json:"entity_type,omitempty"`
	SourceLocale   string         `json:"source_locale,omitempty"`
	TargetLocale   string         `json:"target_locale,omitempty"`
	SourceText     string         `json:"source_text"`
	TargetText     string         `json:"target_text,omitempty"`
	AssistContext  map[string]any `json:"assist_context,omitempty"`
	ActorID        string         `json:"actor_id,omitempty"`
	TenantID       string         `json:"tenant_id,omitempty"`
	OrgID          string         `json:"org_id,omitempty"`
	Channel        string         `json:"channel,omitempty"`
	CorrelationID  string         `json:"correlation_id,omitempty"`
	IdempotencyKey string         `json:"idempotency_key,omitempty"`
}

// TranslationSuggestionProviderResult is the provider-facing result before it
// is normalized into the command response.
type TranslationSuggestionProviderResult struct {
	Text        string         `json:"text"`
	Provider    string         `json:"provider,omitempty"`
	Model       string         `json:"model,omitempty"`
	Diagnostics map[string]any `json:"diagnostics,omitempty"`
}

// TranslationSuggestionDecision describes a safe allow/deny outcome from
// provider policy, tenant opt-out, quota, and rate-limit checks.
type TranslationSuggestionDecision struct {
	Allowed     bool           `json:"allowed"`
	ReasonCode  string         `json:"reason_code,omitempty"`
	Reason      string         `json:"reason,omitempty"`
	Diagnostics map[string]any `json:"diagnostics,omitempty"`
}

// TranslationSuggestionAssignmentContext is the server-loaded editor state
// needed by the suggestion service. Implementations should populate it from
// trusted repositories/loaders, not browser payloads.
type TranslationSuggestionAssignmentContext struct {
	Assignment       TranslationAssignment `json:"assignment"`
	Environment      string                `json:"environment,omitempty"`
	EntityType       string                `json:"entity_type,omitempty"`
	SourceLocale     string                `json:"source_locale,omitempty"`
	TargetLocale     string                `json:"target_locale,omitempty"`
	SourceFields     map[string]string     `json:"source_fields,omitempty"`
	TargetFields     map[string]string     `json:"target_fields,omitempty"`
	SourceRecordID   string                `json:"source_record_id,omitempty"`
	TargetRecordID   string                `json:"target_record_id,omitempty"`
	SourceVersion    string                `json:"source_version,omitempty"`
	TargetRowVersion int64                 `json:"target_row_version,omitempty"`
}

func normalizeTranslationSuggestionDecision(decision TranslationSuggestionDecision) TranslationSuggestionDecision {
	decision.ReasonCode = strings.TrimSpace(decision.ReasonCode)
	decision.Reason = strings.TrimSpace(decision.Reason)
	if decision.Allowed {
		return decision
	}
	if decision.ReasonCode == "" {
		decision.ReasonCode = TranslationSuggestionReasonPolicyDenied
	}
	if decision.Reason == "" {
		decision.Reason = "Translation suggestion is not available for this request."
	}
	return decision
}

func translationSuggestionEditableStatus(status AssignmentStatus) bool {
	switch normalizeTranslationAssignmentStatus(status) {
	case AssignmentStatusAssigned, AssignmentStatusInProgress, AssignmentStatusChangesRequested:
		return true
	default:
		return false
	}
}

func translationSuggestionTimestampDiagnostic() map[string]any {
	return map[string]any{
		"generated_at": time.Now().UTC().Format(time.RFC3339),
	}
}
