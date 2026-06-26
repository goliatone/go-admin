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

// TranslationSuggestionServiceDependencies contains host-owned dependencies that
// complete a provider-backed suggestion service without duplicating editor
// context loading logic in each host application.
type TranslationSuggestionServiceDependencies struct {
	Repository    TranslationAssignmentRepository
	ContextLoader TranslationSuggestionContextLoader
	Authorizer    Authorizer
	Permission    string
	Resource      string
	Eligibility   TranslationSuggestionEligibilityChecker
	AssistContext TranslationSuggestionAssistContextExtractor
}

// TranslationSuggestionDependencyConfigurer is implemented by suggestion
// services that can receive admin/quickstart-owned dependencies after
// construction. Implementations should only fill unset dependencies.
type TranslationSuggestionDependencyConfigurer interface {
	ConfigureTranslationSuggestionServiceDependencies(TranslationSuggestionServiceDependencies)
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

func mergeTranslationSuggestionServiceDependencies(base, override TranslationSuggestionServiceDependencies) TranslationSuggestionServiceDependencies {
	out := base
	if override.Repository != nil {
		out.Repository = override.Repository
	}
	if override.ContextLoader != nil {
		out.ContextLoader = override.ContextLoader
	}
	if override.Authorizer != nil {
		out.Authorizer = override.Authorizer
	}
	if strings.TrimSpace(override.Permission) != "" {
		out.Permission = strings.TrimSpace(override.Permission)
	}
	if strings.TrimSpace(override.Resource) != "" {
		out.Resource = strings.TrimSpace(override.Resource)
	}
	if override.Eligibility != nil {
		out.Eligibility = override.Eligibility
	}
	if override.AssistContext != nil {
		out.AssistContext = override.AssistContext
	}
	return out
}

type translationSuggestionExecutionContext struct {
	Assignment TranslationAssignment
	Loaded     TranslationSuggestionAssignmentContext
	FieldPath  string
	SourceText string
	Assist     map[string]any
}

func (s *DefaultTranslationSuggestionService) ConfigureTranslationSuggestionServiceDependencies(deps TranslationSuggestionServiceDependencies) {
	if s == nil {
		return
	}
	if s.Repository == nil {
		s.Repository = deps.Repository
	}
	if s.ContextLoader == nil {
		s.ContextLoader = deps.ContextLoader
	}
	if s.Authorizer == nil {
		s.Authorizer = deps.Authorizer
	}
	if strings.TrimSpace(s.Permission) == "" {
		s.Permission = strings.TrimSpace(deps.Permission)
	}
	if strings.TrimSpace(s.Resource) == "" {
		s.Resource = strings.TrimSpace(deps.Resource)
	}
	if s.Eligibility == nil {
		s.Eligibility = deps.Eligibility
	}
	if s.AssistContext == nil {
		s.AssistContext = deps.AssistContext
	}
}

// ConfigureTranslationSuggestionServiceDependencies fills missing
// host-provided dependencies on services that opt into late configuration.
func ConfigureTranslationSuggestionServiceDependencies(service TranslationSuggestionService, deps TranslationSuggestionServiceDependencies) {
	configurable, ok := service.(TranslationSuggestionDependencyConfigurer)
	if !ok || configurable == nil {
		return
	}
	configurable.ConfigureTranslationSuggestionServiceDependencies(deps)
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
	if !s.translationSuggestionPermissionAllowed(ctx, input) {
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
	if err := s.requireSuggestionServiceReady(input); err != nil {
		return TranslationSuggestionResult{}, err
	}
	executionCtx, err := s.prepareTranslationSuggestion(ctx, input)
	if err != nil {
		return TranslationSuggestionResult{}, err
	}
	providerResult, err := s.Provider.SuggestTranslation(ctx, executionCtx.providerInput(input))
	if err != nil {
		return TranslationSuggestionResult{}, err
	}
	return executionCtx.result(providerResult)
}

func (s *DefaultTranslationSuggestionService) requireSuggestionServiceReady(input TranslationSuggestionInput) error {
	if err := input.Validate(); err != nil {
		return err
	}
	if s == nil || s.Repository == nil {
		return serviceNotConfiguredDomainError("translation assignment repository", map[string]any{
			"component": "translation_suggestion_service",
		})
	}
	if s.ContextLoader == nil {
		return serviceNotConfiguredDomainError("translation suggestion context loader", map[string]any{
			"component": "translation_suggestion_service",
		})
	}
	if s.Provider == nil {
		return translationSuggestionDeniedError(TranslationSuggestionReasonProviderUnavailable, "Translation suggestion provider is not configured.", input, nil)
	}
	if s.Eligibility == nil {
		return translationSuggestionDeniedError(TranslationSuggestionReasonPolicyDenied, "Translation suggestion eligibility policy is not configured.", input, nil)
	}
	return nil
}

func (s *DefaultTranslationSuggestionService) prepareTranslationSuggestion(ctx context.Context, input TranslationSuggestionInput) (translationSuggestionExecutionContext, error) {
	if err := s.requireSuggestionPermission(ctx, input); err != nil {
		return translationSuggestionExecutionContext{}, err
	}
	assignment, loaded, err := s.loadTranslationSuggestionContext(ctx, input)
	if err != nil {
		return translationSuggestionExecutionContext{}, err
	}
	fieldPath, sourceText, err := validateTranslationSuggestionLoadedInput(input, assignment, loaded)
	if err != nil {
		return translationSuggestionExecutionContext{}, err
	}
	if eligibilityErr := s.requireTranslationSuggestionEligibility(ctx, input, loaded); eligibilityErr != nil {
		return translationSuggestionExecutionContext{}, eligibilityErr
	}
	assist, err := s.translationSuggestionAssistContext(ctx, input, loaded)
	if err != nil {
		return translationSuggestionExecutionContext{}, err
	}
	return translationSuggestionExecutionContext{
		Assignment: assignment,
		Loaded:     loaded,
		FieldPath:  fieldPath,
		SourceText: sourceText,
		Assist:     assist,
	}, nil
}

func (s *DefaultTranslationSuggestionService) loadTranslationSuggestionContext(ctx context.Context, input TranslationSuggestionInput) (TranslationAssignment, TranslationSuggestionAssignmentContext, error) {
	assignment, err := s.Repository.Get(ctx, strings.TrimSpace(input.AssignmentID))
	if err != nil {
		return TranslationAssignment{}, TranslationSuggestionAssignmentContext{}, err
	}
	if scopeErr := translationSuggestionScopeGuard(input, assignment); scopeErr != nil {
		return TranslationAssignment{}, TranslationSuggestionAssignmentContext{}, scopeErr
	}
	environment := strings.TrimSpace(firstNonEmpty(input.Environment, input.Channel))
	loaded, err := s.ContextLoader.LoadTranslationSuggestionContext(ctx, assignment, environment)
	if err != nil {
		return TranslationAssignment{}, TranslationSuggestionAssignmentContext{}, err
	}
	return assignment, normalizeTranslationSuggestionContext(loaded, assignment, environment), nil
}

func normalizeTranslationSuggestionContext(loaded TranslationSuggestionAssignmentContext, assignment TranslationAssignment, environment string) TranslationSuggestionAssignmentContext {
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
	return loaded
}

func validateTranslationSuggestionLoadedInput(input TranslationSuggestionInput, assignment TranslationAssignment, loaded TranslationSuggestionAssignmentContext) (string, string, error) {
	if !translationSuggestionEditableStatus(assignment.Status) {
		return "", "", translationSuggestionDeniedError(
			TranslationSuggestionReasonReadOnlyAssignment,
			"Translation suggestion is unavailable for this assignment state.",
			input,
			map[string]any{"assignment_status": strings.TrimSpace(string(assignment.Status))},
		)
	}
	fieldPath := strings.TrimSpace(input.FieldPath)
	sourceText, ok := loaded.SourceFields[fieldPath]
	if !ok {
		return "", "", translationSuggestionDeniedError(TranslationSuggestionReasonFieldUnsupported, "Translation suggestion is unavailable for this field.", input, nil)
	}
	sourceText = strings.TrimSpace(sourceText)
	if sourceText == "" {
		return "", "", translationSuggestionDeniedError(TranslationSuggestionReasonEmptySource, "Translation suggestion is unavailable for an empty source field.", input, nil)
	}
	return fieldPath, sourceText, nil
}

func (s *DefaultTranslationSuggestionService) requireTranslationSuggestionEligibility(ctx context.Context, input TranslationSuggestionInput, loaded TranslationSuggestionAssignmentContext) error {
	decision, err := s.Eligibility.EvaluateTranslationSuggestion(ctx, input, loaded)
	if err != nil {
		return err
	}
	decision = normalizeTranslationSuggestionDecision(decision)
	if !decision.Allowed {
		return translationSuggestionDeniedError(decision.ReasonCode, decision.Reason, input, decision.Diagnostics)
	}
	return nil
}

func (s *DefaultTranslationSuggestionService) translationSuggestionAssistContext(ctx context.Context, input TranslationSuggestionInput, loaded TranslationSuggestionAssignmentContext) (map[string]any, error) {
	if s.AssistContext == nil {
		return nil, nil
	}
	return s.AssistContext.TranslationSuggestionAssistContext(ctx, input, loaded)
}

func (c translationSuggestionExecutionContext) providerInput(input TranslationSuggestionInput) TranslationSuggestionProviderInput {
	return TranslationSuggestionProviderInput{
		AssignmentID:   strings.TrimSpace(c.Assignment.ID),
		FieldPath:      c.FieldPath,
		EntityType:     strings.TrimSpace(c.Loaded.EntityType),
		SourceLocale:   strings.TrimSpace(c.Loaded.SourceLocale),
		TargetLocale:   strings.TrimSpace(c.Loaded.TargetLocale),
		SourceText:     c.SourceText,
		TargetText:     strings.TrimSpace(c.Loaded.TargetFields[c.FieldPath]),
		AssistContext:  c.Assist,
		ActorID:        strings.TrimSpace(input.ActorID),
		TenantID:       strings.TrimSpace(firstNonEmpty(input.TenantID, c.Assignment.TenantID)),
		OrgID:          strings.TrimSpace(firstNonEmpty(input.OrgID, c.Assignment.OrgID)),
		Channel:        strings.TrimSpace(firstNonEmpty(input.Channel, c.Loaded.Environment)),
		CorrelationID:  strings.TrimSpace(input.CorrelationID),
		IdempotencyKey: strings.TrimSpace(input.IdempotencyKey),
	}
}

func (c translationSuggestionExecutionContext) result(providerResult TranslationSuggestionProviderResult) (TranslationSuggestionResult, error) {
	suggested := strings.TrimSpace(providerResult.Text)
	if suggested == "" {
		return TranslationSuggestionResult{}, serviceUnavailableDomainError("translation suggestion provider returned empty text", map[string]any{
			"component":     "translation_suggestion_service",
			"assignment_id": strings.TrimSpace(c.Assignment.ID),
			"field_path":    c.FieldPath,
		})
	}
	return TranslationSuggestionResult{
		AssignmentID:  strings.TrimSpace(c.Assignment.ID),
		FieldPath:     c.FieldPath,
		SuggestedText: suggested,
		Provider:      strings.TrimSpace(providerResult.Provider),
		Model:         strings.TrimSpace(providerResult.Model),
		SourceLocale:  strings.TrimSpace(c.Loaded.SourceLocale),
		TargetLocale:  strings.TrimSpace(c.Loaded.TargetLocale),
		Diagnostics:   translationSuggestionDiagnostics(providerResult),
	}, nil
}

func translationSuggestionDiagnostics(providerResult TranslationSuggestionProviderResult) map[string]any {
	diagnostics := cloneAnyMap(providerResult.Diagnostics)
	if diagnostics == nil {
		return translationSuggestionTimestampDiagnostic()
	}
	for key, value := range translationSuggestionTimestampDiagnostic() {
		if _, exists := diagnostics[key]; !exists {
			diagnostics[key] = value
		}
	}
	return diagnostics
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

func (s *DefaultTranslationSuggestionService) translationSuggestionPermissionAllowed(ctx context.Context, input TranslationSuggestionInput) bool {
	return s.requireSuggestionPermission(ctx, input) == nil
}

func translationSuggestionScopeGuard(input TranslationSuggestionInput, assignment TranslationAssignment) error {
	inputTenantID := strings.TrimSpace(input.TenantID)
	assignmentTenantID := strings.TrimSpace(assignment.TenantID)
	if assignmentTenantID != "" && inputTenantID == "" {
		return permissionDenied(PermAdminTranslationsSuggest, "translations")
	}
	if inputTenantID != "" && !strings.EqualFold(inputTenantID, assignmentTenantID) {
		return permissionDenied(PermAdminTranslationsSuggest, "translations")
	}

	inputOrgID := strings.TrimSpace(input.OrgID)
	assignmentOrgID := strings.TrimSpace(assignment.OrgID)
	if assignmentOrgID != "" && inputOrgID == "" {
		return permissionDenied(PermAdminTranslationsSuggest, "translations")
	}
	if inputOrgID != "" && !strings.EqualFold(inputOrgID, assignmentOrgID) {
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

// NewTranslationSuggestionContextLoader returns the built-in server-side editor
// context loader used by the default translation suggestion service.
func NewTranslationSuggestionContextLoader(adm *Admin) TranslationSuggestionContextLoader {
	return adminTranslationSuggestionContextLoader{admin: adm}
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
