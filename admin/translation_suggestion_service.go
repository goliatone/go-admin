package admin

import (
	"context"
	"strings"
)

// TranslationSuggestionService contains suggestion generation behavior used by
// commands and transports.
type TranslationSuggestionService interface {
	SuggestTranslation(context.Context, TranslationSuggestionInput) (TranslationSuggestionResult, error)
}

// TranslationSuggestionContextLoader reloads assignment/editor state from
// trusted server-side storage.
type TranslationSuggestionContextLoader interface {
	LoadTranslationSuggestionContext(context.Context, TranslationAssignment, string) (TranslationSuggestionAssignmentContext, error)
}

// TranslationSuggestionEligibilityChecker enforces provider policy, tenant
// opt-out, data residency, quota, and rate-limit rules before provider calls.
type TranslationSuggestionEligibilityChecker interface {
	EvaluateTranslationSuggestion(context.Context, TranslationSuggestionInput, TranslationSuggestionAssignmentContext) (TranslationSuggestionDecision, error)
}

// TranslationSuggestionAssistContextExtractor builds glossary/style/TM context
// that may be sent to the provider after eligibility checks pass.
type TranslationSuggestionAssistContextExtractor interface {
	TranslationSuggestionAssistContext(context.Context, TranslationSuggestionInput, TranslationSuggestionAssignmentContext) (map[string]any, error)
}

// TranslationSuggestionActionEvaluator can report safe field-level availability
// without invoking a provider.
type TranslationSuggestionActionEvaluator interface {
	EvaluateTranslationSuggestionAction(context.Context, TranslationSuggestionInput, TranslationSuggestionAssignmentContext) (TranslationSuggestionDecision, error)
}

// TranslationSuggestionProvider generates suggested text from sanitized input.
type TranslationSuggestionProvider interface {
	SuggestTranslation(context.Context, TranslationSuggestionProviderInput) (TranslationSuggestionProviderResult, error)
}

// TranslationSuggestionAllowAllEligibility is an explicit opt-in eligibility
// checker for tests or hosts that perform policy checks outside this service.
type TranslationSuggestionAllowAllEligibility struct{}

func (TranslationSuggestionAllowAllEligibility) EvaluateTranslationSuggestion(context.Context, TranslationSuggestionInput, TranslationSuggestionAssignmentContext) (TranslationSuggestionDecision, error) {
	return TranslationSuggestionDecision{Allowed: true}, nil
}

// DefaultTranslationSuggestionService orchestrates server-side checks and a
// provider-neutral suggestion provider.
type DefaultTranslationSuggestionService struct {
	Repository    TranslationAssignmentRepository
	ContextLoader TranslationSuggestionContextLoader
	Authorizer    Authorizer
	Permission    string
	Resource      string
	Eligibility   TranslationSuggestionEligibilityChecker
	AssistContext TranslationSuggestionAssistContextExtractor
	Provider      TranslationSuggestionProvider
}

func (s *DefaultTranslationSuggestionService) EvaluateTranslationSuggestionAction(ctx context.Context, input TranslationSuggestionInput, loaded TranslationSuggestionAssignmentContext) (TranslationSuggestionDecision, error) {
	if err := input.Validate(); err != nil {
		return TranslationSuggestionDecision{}, err
	}
	if s == nil {
		return TranslationSuggestionDecision{
			Allowed:    false,
			ReasonCode: TranslationSuggestionReasonServiceUnavailable,
			Reason:     "Translation suggestion service is not configured.",
		}, nil
	}
	if s.Provider == nil {
		return TranslationSuggestionDecision{
			Allowed:    false,
			ReasonCode: TranslationSuggestionReasonProviderUnavailable,
			Reason:     "Translation suggestion provider is not configured.",
		}, nil
	}
	if s.Eligibility == nil {
		return TranslationSuggestionDecision{
			Allowed:    false,
			ReasonCode: TranslationSuggestionReasonPolicyDenied,
			Reason:     "Translation suggestion eligibility policy is not configured.",
		}, nil
	}
	assignment := loaded.Assignment
	if strings.TrimSpace(assignment.ID) == "" {
		assignment = loaded.Assignment
	}
	if !translationSuggestionEditableStatus(assignment.Status) {
		return TranslationSuggestionDecision{
			Allowed:    false,
			ReasonCode: TranslationSuggestionReasonReadOnlyAssignment,
			Reason:     "Translation suggestion is unavailable for this assignment state.",
			Diagnostics: map[string]any{
				"assignment_status": strings.TrimSpace(string(assignment.Status)),
			},
		}, nil
	}
	if err := s.requireSuggestionPermission(ctx, input); err != nil {
		return TranslationSuggestionDecision{
			Allowed:    false,
			ReasonCode: TranslationSuggestionReasonPermissionDenied,
			Reason:     "Translation suggestion permission is required.",
		}, nil
	}
	fieldPath := strings.TrimSpace(input.FieldPath)
	sourceText, ok := loaded.SourceFields[fieldPath]
	if !ok {
		return TranslationSuggestionDecision{
			Allowed:    false,
			ReasonCode: TranslationSuggestionReasonFieldUnsupported,
			Reason:     "Translation suggestion is unavailable for this field.",
		}, nil
	}
	if strings.TrimSpace(sourceText) == "" {
		return TranslationSuggestionDecision{
			Allowed:    false,
			ReasonCode: TranslationSuggestionReasonEmptySource,
			Reason:     "Translation suggestion is unavailable for an empty source field.",
		}, nil
	}
	decision, err := s.Eligibility.EvaluateTranslationSuggestion(ctx, input, loaded)
	if err != nil {
		return TranslationSuggestionDecision{}, err
	}
	return normalizeTranslationSuggestionDecision(decision), nil
}

func (s *DefaultTranslationSuggestionService) SuggestTranslation(ctx context.Context, input TranslationSuggestionInput) (TranslationSuggestionResult, error) {
	if err := input.Validate(); err != nil {
		return TranslationSuggestionResult{}, err
	}
	if s == nil || s.Repository == nil {
		return TranslationSuggestionResult{}, serviceNotConfiguredDomainError("translation assignment repository", map[string]any{
			"component": "translation_suggestion_service",
		})
	}
	if s.ContextLoader == nil {
		return TranslationSuggestionResult{}, serviceNotConfiguredDomainError("translation suggestion context loader", map[string]any{
			"component": "translation_suggestion_service",
		})
	}
	if s.Provider == nil {
		return TranslationSuggestionResult{}, translationSuggestionDeniedError(
			TranslationSuggestionReasonProviderUnavailable,
			"Translation suggestion provider is not configured.",
			input,
			nil,
		)
	}
	if s.Eligibility == nil {
		return TranslationSuggestionResult{}, translationSuggestionDeniedError(
			TranslationSuggestionReasonPolicyDenied,
			"Translation suggestion eligibility policy is not configured.",
			input,
			nil,
		)
	}
	if err := s.requireSuggestionPermission(ctx, input); err != nil {
		return TranslationSuggestionResult{}, err
	}

	assignment, err := s.Repository.Get(ctx, strings.TrimSpace(input.AssignmentID))
	if err != nil {
		return TranslationSuggestionResult{}, err
	}
	if err := translationSuggestionScopeGuard(input, assignment); err != nil {
		return TranslationSuggestionResult{}, err
	}

	environment := strings.TrimSpace(firstNonEmpty(input.Environment, input.Channel))
	loaded, err := s.ContextLoader.LoadTranslationSuggestionContext(ctx, assignment, environment)
	if err != nil {
		return TranslationSuggestionResult{}, err
	}
	if loaded.Assignment.ID == "" {
		loaded.Assignment = assignment
	}
	if loaded.Environment == "" {
		loaded.Environment = environment
	}
	if loaded.EntityType == "" {
		loaded.EntityType = strings.TrimSpace(assignment.EntityType)
	}
	if loaded.TargetLocale == "" {
		loaded.TargetLocale = strings.TrimSpace(assignment.TargetLocale)
	}
	if loaded.SourceLocale == "" {
		loaded.SourceLocale = strings.TrimSpace(assignment.SourceLocale)
	}

	if !translationSuggestionEditableStatus(assignment.Status) {
		return TranslationSuggestionResult{}, translationSuggestionDeniedError(
			TranslationSuggestionReasonReadOnlyAssignment,
			"Translation suggestion is unavailable for this assignment state.",
			input,
			map[string]any{"assignment_status": strings.TrimSpace(string(assignment.Status))},
		)
	}

	fieldPath := strings.TrimSpace(input.FieldPath)
	sourceText, ok := loaded.SourceFields[fieldPath]
	if !ok {
		return TranslationSuggestionResult{}, translationSuggestionDeniedError(
			TranslationSuggestionReasonFieldUnsupported,
			"Translation suggestion is unavailable for this field.",
			input,
			nil,
		)
	}
	sourceText = strings.TrimSpace(sourceText)
	if sourceText == "" {
		return TranslationSuggestionResult{}, translationSuggestionDeniedError(
			TranslationSuggestionReasonEmptySource,
			"Translation suggestion is unavailable for an empty source field.",
			input,
			nil,
		)
	}

	decision, err := s.Eligibility.EvaluateTranslationSuggestion(ctx, input, loaded)
	if err != nil {
		return TranslationSuggestionResult{}, err
	}
	decision = normalizeTranslationSuggestionDecision(decision)
	if !decision.Allowed {
		return TranslationSuggestionResult{}, translationSuggestionDeniedError(decision.ReasonCode, decision.Reason, input, decision.Diagnostics)
	}

	assist := map[string]any(nil)
	if s.AssistContext != nil {
		assist, err = s.AssistContext.TranslationSuggestionAssistContext(ctx, input, loaded)
		if err != nil {
			return TranslationSuggestionResult{}, err
		}
	}

	providerResult, err := s.Provider.SuggestTranslation(ctx, TranslationSuggestionProviderInput{
		AssignmentID:   strings.TrimSpace(assignment.ID),
		FieldPath:      fieldPath,
		EntityType:     strings.TrimSpace(loaded.EntityType),
		SourceLocale:   strings.TrimSpace(loaded.SourceLocale),
		TargetLocale:   strings.TrimSpace(loaded.TargetLocale),
		SourceText:     sourceText,
		TargetText:     strings.TrimSpace(loaded.TargetFields[fieldPath]),
		AssistContext:  assist,
		ActorID:        strings.TrimSpace(input.ActorID),
		TenantID:       strings.TrimSpace(firstNonEmpty(input.TenantID, assignment.TenantID)),
		OrgID:          strings.TrimSpace(firstNonEmpty(input.OrgID, assignment.OrgID)),
		Channel:        strings.TrimSpace(firstNonEmpty(input.Channel, loaded.Environment)),
		CorrelationID:  strings.TrimSpace(input.CorrelationID),
		IdempotencyKey: strings.TrimSpace(input.IdempotencyKey),
	})
	if err != nil {
		return TranslationSuggestionResult{}, err
	}
	suggested := strings.TrimSpace(providerResult.Text)
	if suggested == "" {
		return TranslationSuggestionResult{}, serviceUnavailableDomainError("translation suggestion provider returned empty text", map[string]any{
			"component":     "translation_suggestion_service",
			"assignment_id": strings.TrimSpace(assignment.ID),
			"field_path":    fieldPath,
		})
	}

	diagnostics := cloneAnyMap(providerResult.Diagnostics)
	if diagnostics == nil {
		diagnostics = translationSuggestionTimestampDiagnostic()
	} else {
		for key, value := range translationSuggestionTimestampDiagnostic() {
			if _, exists := diagnostics[key]; !exists {
				diagnostics[key] = value
			}
		}
	}
	return TranslationSuggestionResult{
		AssignmentID:  strings.TrimSpace(assignment.ID),
		FieldPath:     fieldPath,
		SuggestedText: suggested,
		Provider:      strings.TrimSpace(providerResult.Provider),
		Model:         strings.TrimSpace(providerResult.Model),
		SourceLocale:  strings.TrimSpace(loaded.SourceLocale),
		TargetLocale:  strings.TrimSpace(loaded.TargetLocale),
		Diagnostics:   diagnostics,
	}, nil
}

func (s *DefaultTranslationSuggestionService) requireSuggestionPermission(ctx context.Context, input TranslationSuggestionInput) error {
	permission := strings.TrimSpace(s.Permission)
	if permission == "" {
		permission = PermAdminTranslationsSuggest
	}
	resource := strings.TrimSpace(s.Resource)
	if resource == "" {
		resource = "translations"
	}
	if s.Authorizer == nil {
		return translationSuggestionDeniedError(
			TranslationSuggestionReasonPermissionDenied,
			"Translation suggestion permission is required.",
			input,
			map[string]any{"permission": permission, "resource": resource},
		)
	}
	if permissionAllowed(s.Authorizer, ctx, permission, resource) {
		return nil
	}
	return translationSuggestionDeniedError(
		TranslationSuggestionReasonPermissionDenied,
		"Translation suggestion permission is required.",
		input,
		map[string]any{"permission": permission, "resource": resource},
	)
}

func translationSuggestionScopeGuard(input TranslationSuggestionInput, assignment TranslationAssignment) error {
	if tenantID := strings.TrimSpace(input.TenantID); tenantID != "" && !strings.EqualFold(tenantID, strings.TrimSpace(assignment.TenantID)) {
		return permissionDenied(PermAdminTranslationsSuggest, "translations")
	}
	if orgID := strings.TrimSpace(input.OrgID); orgID != "" && !strings.EqualFold(orgID, strings.TrimSpace(assignment.OrgID)) {
		return permissionDenied(PermAdminTranslationsSuggest, "translations")
	}
	return nil
}

func translationSuggestionDeniedError(reasonCode, reason string, input TranslationSuggestionInput, diagnostics map[string]any) error {
	meta := map[string]any{
		"component":     "translation_suggestion_service",
		"assignment_id": strings.TrimSpace(input.AssignmentID),
		"field_path":    strings.TrimSpace(input.FieldPath),
		"reason_code":   strings.TrimSpace(reasonCode),
	}
	if len(diagnostics) > 0 {
		meta["diagnostics"] = cloneAnyMap(diagnostics)
	}
	if strings.TrimSpace(reason) == "" {
		reason = "Translation suggestion is unavailable."
	}
	return NewDomainError(TextCodeForbidden, reason, meta)
}

type adminTranslationSuggestionContextLoader struct {
	admin *Admin
}

func (l adminTranslationSuggestionContextLoader) LoadTranslationSuggestionContext(ctx context.Context, assignment TranslationAssignment, environment string) (TranslationSuggestionAssignmentContext, error) {
	if l.admin == nil {
		return TranslationSuggestionAssignmentContext{}, serviceNotConfiguredDomainError("admin", map[string]any{
			"component": "translation_suggestion_context_loader",
		})
	}
	binding := &translationQueueBinding{admin: l.admin}
	editorCtx, err := binding.loadAssignmentEditorContext(ctx, assignment, strings.TrimSpace(environment))
	if err != nil {
		return TranslationSuggestionAssignmentContext{}, err
	}
	return translationSuggestionContextFromEditor(assignment, editorCtx), nil
}

func translationSuggestionContextFromEditor(assignment TranslationAssignment, editorCtx translationEditorContext) TranslationSuggestionAssignmentContext {
	return TranslationSuggestionAssignmentContext{
		Assignment:       assignment,
		Environment:      strings.TrimSpace(editorCtx.Environment),
		EntityType:       strings.TrimSpace(editorCtx.Family.ContentType),
		SourceLocale:     strings.TrimSpace(editorCtx.SourceVariant.Locale),
		TargetLocale:     strings.TrimSpace(firstNonEmpty(assignment.TargetLocale, editorCtx.TargetVariant.Locale)),
		SourceFields:     cloneStringMap(editorCtx.SourceFields),
		TargetFields:     cloneStringMap(editorCtx.TargetFields),
		SourceRecordID:   strings.TrimSpace(editorCtx.SourceRecordID),
		TargetRecordID:   strings.TrimSpace(editorCtx.TargetRecordID),
		SourceVersion:    strings.TrimSpace(editorCtx.SourceVersion),
		TargetRowVersion: editorCtx.TargetRowVersion,
	}
}
