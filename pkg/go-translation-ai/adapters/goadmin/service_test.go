package goadmin

import (
	"context"
	"errors"
	"strings"
	"testing"

	coreadmin "github.com/goliatone/go-admin/admin"
	translationai "github.com/goliatone/go-admin/pkg/go-translation-ai"
)

type fakeAssignmentRepo struct {
	assignment coreadmin.TranslationAssignment
}

func (r fakeAssignmentRepo) List(context.Context, coreadmin.ListOptions) ([]coreadmin.TranslationAssignment, int, error) {
	return []coreadmin.TranslationAssignment{r.assignment}, 1, nil
}

func (r fakeAssignmentRepo) Create(context.Context, coreadmin.TranslationAssignment) (coreadmin.TranslationAssignment, error) {
	return coreadmin.TranslationAssignment{}, errors.New("not implemented")
}

func (r fakeAssignmentRepo) CreateOrReuseActive(context.Context, coreadmin.TranslationAssignment) (coreadmin.TranslationAssignment, bool, error) {
	return coreadmin.TranslationAssignment{}, false, errors.New("not implemented")
}

func (r fakeAssignmentRepo) Get(context.Context, string) (coreadmin.TranslationAssignment, error) {
	return r.assignment, nil
}

func (r fakeAssignmentRepo) Update(context.Context, coreadmin.TranslationAssignment, int64) (coreadmin.TranslationAssignment, error) {
	return coreadmin.TranslationAssignment{}, errors.New("not implemented")
}

type fakeContextLoader struct {
	loaded coreadmin.TranslationSuggestionAssignmentContext
}

func (l fakeContextLoader) LoadTranslationSuggestionContext(context.Context, coreadmin.TranslationAssignment, string) (coreadmin.TranslationSuggestionAssignmentContext, error) {
	return l.loaded, nil
}

type allowAuthorizer struct{}

func (allowAuthorizer) Can(context.Context, string, string) bool { return true }

type denyEligibility struct {
	calls int
}

func (e *denyEligibility) EvaluateTranslationSuggestion(context.Context, coreadmin.TranslationSuggestionInput, coreadmin.TranslationSuggestionAssignmentContext) (coreadmin.TranslationSuggestionDecision, error) {
	e.calls++
	return coreadmin.TranslationSuggestionDecision{
		Allowed:    false,
		ReasonCode: coreadmin.TranslationSuggestionReasonQuotaExceeded,
		Reason:     "quota exhausted",
	}, nil
}

type fakeAssistContext struct{}

func (fakeAssistContext) TranslationSuggestionAssistContext(context.Context, coreadmin.TranslationSuggestionInput, coreadmin.TranslationSuggestionAssignmentContext) (map[string]any, error) {
	return map[string]any{
		"glossary": []map[string]string{{"term": "publish", "preferred_translation": "publier"}},
		"style":    "Use concise product copy.",
	}, nil
}

type fakeProvider struct {
	calls int
	last  translationai.ProviderRequest
	resp  translationai.ProviderResponse
	err   error
}

func (p *fakeProvider) GenerateTranslation(_ context.Context, req translationai.ProviderRequest) (translationai.ProviderResponse, error) {
	p.calls++
	p.last = req
	if p.err != nil {
		return translationai.ProviderResponse{}, p.err
	}
	return p.resp, nil
}

func suggestionTestAssignment() coreadmin.TranslationAssignment {
	return coreadmin.TranslationAssignment{
		ID:           "asg-ai-1",
		EntityType:   "pages",
		TenantID:     "tenant-1",
		OrgID:        "org-1",
		SourceLocale: "en",
		TargetLocale: "fr",
		Status:       coreadmin.AssignmentStatusInProgress,
		Version:      3,
	}
}

func suggestionTestContext(assignment coreadmin.TranslationAssignment) coreadmin.TranslationSuggestionAssignmentContext {
	return coreadmin.TranslationSuggestionAssignmentContext{
		Assignment:   assignment,
		Environment:  "staging",
		EntityType:   "pages",
		SourceLocale: "en",
		TargetLocale: "fr",
		SourceFields: map[string]string{
			"title": "Translation publish guide {{cta}}",
		},
		TargetFields: map[string]string{
			"title": "Guide actuel",
		},
	}
}

func TestServiceUsesFakeProviderPromptAndNormalizesResult(t *testing.T) {
	assignment := suggestionTestAssignment()
	provider := &fakeProvider{
		resp: translationai.ProviderResponse{
			Text:     " Guide de publication {{cta}} ",
			Provider: "fake",
			Model:    "fake-model",
			Diagnostics: map[string]any{
				"api_key": "secret",
				"safe":    "kept",
			},
		},
	}
	svc := NewService(
		WithRepository(fakeAssignmentRepo{assignment: assignment}),
		WithContextLoader(fakeContextLoader{loaded: suggestionTestContext(assignment)}),
		WithAuthorizer(allowAuthorizer{}),
		WithEligibility(coreadmin.TranslationSuggestionAllowAllEligibility{}),
		WithAssistContext(fakeAssistContext{}),
		WithDefaultModel("fallback-model"),
		WithProvider(provider),
	)

	result, err := svc.SuggestTranslation(context.Background(), coreadmin.TranslationSuggestionInput{
		AssignmentID:   "asg-ai-1",
		FieldPath:      "title",
		TenantID:       "tenant-1",
		OrgID:          "org-1",
		CorrelationID:  "corr-1",
		IdempotencyKey: "idem-1",
		SourceText:     "browser supplied text must be ignored",
	})
	if err != nil {
		t.Fatalf("SuggestTranslation: %v", err)
	}
	if provider.calls != 1 {
		t.Fatalf("expected one provider call, got %d", provider.calls)
	}
	if !strings.Contains(provider.last.Prompt, "Translation publish guide {{cta}}") {
		t.Fatalf("expected server source text in prompt, got %q", provider.last.Prompt)
	}
	if strings.Contains(provider.last.Prompt, "browser supplied") {
		t.Fatalf("prompt used browser-supplied source text: %q", provider.last.Prompt)
	}
	if !strings.Contains(provider.last.Prompt, "publier") {
		t.Fatalf("expected assist context in prompt, got %q", provider.last.Prompt)
	}
	if provider.last.Model != "fallback-model" {
		t.Fatalf("expected fallback model, got %q", provider.last.Model)
	}
	if result.SuggestedText != "Guide de publication {{cta}}" {
		t.Fatalf("unexpected suggestion text %q", result.SuggestedText)
	}
	if result.Provider != "fake" || result.Model != "fake-model" {
		t.Fatalf("unexpected provider metadata: %+v", result)
	}
	if _, ok := result.Diagnostics["api_key"]; ok {
		t.Fatalf("sensitive diagnostic leaked: %+v", result.Diagnostics)
	}
	if result.Diagnostics["safe"] != "kept" {
		t.Fatalf("expected safe diagnostic to remain, got %+v", result.Diagnostics)
	}
}

func TestServiceDeniesBeforeProviderCall(t *testing.T) {
	assignment := suggestionTestAssignment()
	provider := &fakeProvider{resp: translationai.ProviderResponse{Text: "ignored"}}
	eligibility := &denyEligibility{}
	svc := NewService(
		WithRepository(fakeAssignmentRepo{assignment: assignment}),
		WithContextLoader(fakeContextLoader{loaded: suggestionTestContext(assignment)}),
		WithAuthorizer(allowAuthorizer{}),
		WithEligibility(eligibility),
		WithProvider(provider),
	)

	_, err := svc.SuggestTranslation(context.Background(), coreadmin.TranslationSuggestionInput{
		AssignmentID: "asg-ai-1",
		FieldPath:    "title",
		TenantID:     "tenant-1",
		OrgID:        "org-1",
	})
	if err == nil {
		t.Fatalf("expected denial error")
	}
	if provider.calls != 0 {
		t.Fatalf("expected no provider call after denial, got %d", provider.calls)
	}
	if eligibility.calls != 1 {
		t.Fatalf("expected eligibility to be checked once, got %d", eligibility.calls)
	}
}

func TestServiceConfiguresMissingAdminDependencies(t *testing.T) {
	assignment := suggestionTestAssignment()
	provider := &fakeProvider{resp: translationai.ProviderResponse{
		Text:     " Guide configure ",
		Provider: "fake",
		Model:    "fake-model",
	}}
	svc := NewService(
		WithDefaultModel("fallback-model"),
		WithProvider(provider),
	)
	svc.ConfigureTranslationSuggestionServiceDependencies(coreadmin.TranslationSuggestionServiceDependencies{
		Repository:    fakeAssignmentRepo{assignment: assignment},
		ContextLoader: fakeContextLoader{loaded: suggestionTestContext(assignment)},
		Authorizer:    allowAuthorizer{},
		Eligibility:   coreadmin.TranslationSuggestionAllowAllEligibility{},
		AssistContext: fakeAssistContext{},
	})

	result, err := svc.SuggestTranslation(context.Background(), coreadmin.TranslationSuggestionInput{
		AssignmentID: "asg-ai-1",
		FieldPath:    "title",
		TenantID:     "tenant-1",
		OrgID:        "org-1",
	})
	if err != nil {
		t.Fatalf("SuggestTranslation: %v", err)
	}
	if provider.calls != 1 {
		t.Fatalf("expected provider call after dependency configuration, got %d", provider.calls)
	}
	if result.SuggestedText != "Guide configure" {
		t.Fatalf("unexpected suggestion text %q", result.SuggestedText)
	}
}

func TestServiceActionEvaluationAcceptsLateAuthorizerDependency(t *testing.T) {
	assignment := suggestionTestAssignment()
	svc := NewService(
		WithProvider(&fakeProvider{}),
		WithEligibility(coreadmin.TranslationSuggestionAllowAllEligibility{}),
	)
	input := coreadmin.TranslationSuggestionInput{
		AssignmentID: assignment.ID,
		FieldPath:    "title",
		TenantID:     assignment.TenantID,
		OrgID:        assignment.OrgID,
	}

	decision, err := svc.EvaluateTranslationSuggestionAction(context.Background(), input, suggestionTestContext(assignment))
	if err != nil {
		t.Fatalf("EvaluateTranslationSuggestionAction before authorizer: %v", err)
	}
	if decision.Allowed || decision.ReasonCode != coreadmin.TranslationSuggestionReasonPermissionDenied {
		t.Fatalf("expected permission denial before authorizer dependency, got %+v", decision)
	}

	svc.ConfigureTranslationSuggestionServiceDependencies(coreadmin.TranslationSuggestionServiceDependencies{
		Authorizer: allowAuthorizer{},
	})
	decision, err = svc.EvaluateTranslationSuggestionAction(context.Background(), input, suggestionTestContext(assignment))
	if err != nil {
		t.Fatalf("EvaluateTranslationSuggestionAction after authorizer: %v", err)
	}
	if !decision.Allowed {
		t.Fatalf("expected action allowed after authorizer dependency, got %+v", decision)
	}
}

func TestServiceActionEvaluationFailsClosedWithoutReadyProvider(t *testing.T) {
	assignment := suggestionTestAssignment()
	svc := NewService(
		WithRepository(fakeAssignmentRepo{assignment: assignment}),
		WithContextLoader(fakeContextLoader{loaded: suggestionTestContext(assignment)}),
		WithAuthorizer(allowAuthorizer{}),
		WithEligibility(coreadmin.TranslationSuggestionAllowAllEligibility{}),
		WithOpenAIProvider(translationai.OpenAIConfig{Model: "gpt-test"}),
	)

	decision, err := svc.EvaluateTranslationSuggestionAction(context.Background(), coreadmin.TranslationSuggestionInput{
		AssignmentID: "asg-ai-1",
		FieldPath:    "title",
	}, suggestionTestContext(assignment))
	if err != nil {
		t.Fatalf("EvaluateTranslationSuggestionAction: %v", err)
	}
	if decision.Allowed {
		t.Fatalf("expected provider-unavailable decision")
	}
	if decision.ReasonCode != coreadmin.TranslationSuggestionReasonProviderUnavailable {
		t.Fatalf("expected provider unavailable, got %+v", decision)
	}
}
