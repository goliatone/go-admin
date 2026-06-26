package admin

import (
	"context"
	"strings"
	"testing"
)

type fakeTranslationSuggestionContextLoader struct {
	calls       int
	assignment  TranslationAssignment
	environment string
	ctx         TranslationSuggestionAssignmentContext
	err         error
}

func (l *fakeTranslationSuggestionContextLoader) LoadTranslationSuggestionContext(_ context.Context, assignment TranslationAssignment, environment string) (TranslationSuggestionAssignmentContext, error) {
	l.calls++
	l.assignment = assignment
	l.environment = environment
	if l.err != nil {
		return TranslationSuggestionAssignmentContext{}, l.err
	}
	return l.ctx, nil
}

type fakeTranslationSuggestionEligibility struct {
	calls    int
	decision TranslationSuggestionDecision
	err      error
}

func (e *fakeTranslationSuggestionEligibility) EvaluateTranslationSuggestion(_ context.Context, _ TranslationSuggestionInput, _ TranslationSuggestionAssignmentContext) (TranslationSuggestionDecision, error) {
	e.calls++
	if e.err != nil {
		return TranslationSuggestionDecision{}, e.err
	}
	return e.decision, nil
}

type fakeTranslationSuggestionProvider struct {
	calls int
	input TranslationSuggestionProviderInput
	err   error
}

func (p *fakeTranslationSuggestionProvider) SuggestTranslation(_ context.Context, input TranslationSuggestionProviderInput) (TranslationSuggestionProviderResult, error) {
	p.calls++
	p.input = input
	if p.err != nil {
		return TranslationSuggestionProviderResult{}, p.err
	}
	return TranslationSuggestionProviderResult{
		Text:     "Hola desde el servidor",
		Provider: "fake",
		Model:    "fake-model",
	}, nil
}

type fakeTranslationSuggestionAuthorizer struct {
	allowed bool
}

func (a fakeTranslationSuggestionAuthorizer) Can(context.Context, string, string) bool {
	return a.allowed
}

func TestDefaultTranslationSuggestionServiceUsesServerLoadedSourceText(t *testing.T) {
	repo := NewInMemoryTranslationAssignmentRepository()
	assignment, err := repo.Create(context.Background(), TranslationAssignment{
		FamilyID:       "family_1",
		EntityType:     "pages",
		TenantID:       "tenant_1",
		OrgID:          "org_1",
		SourceRecordID: "page_1",
		SourceLocale:   "en",
		TargetLocale:   "es",
		AssignmentType: AssignmentTypeDirect,
		Status:         AssignmentStatusInProgress,
		Priority:       PriorityNormal,
		AssigneeID:     "translator_1",
		WorkScope:      "default",
	})
	if err != nil {
		t.Fatalf("create assignment: %v", err)
	}
	loader := &fakeTranslationSuggestionContextLoader{
		ctx: TranslationSuggestionAssignmentContext{
			Environment:  "staging",
			EntityType:   "pages",
			SourceLocale: "en",
			TargetLocale: "es",
			SourceFields: map[string]string{"title": "Hello from server"},
			TargetFields: map[string]string{"title": ""},
		},
	}
	eligibility := &fakeTranslationSuggestionEligibility{decision: TranslationSuggestionDecision{Allowed: true}}
	provider := &fakeTranslationSuggestionProvider{}
	service := &DefaultTranslationSuggestionService{
		Repository:    repo,
		ContextLoader: loader,
		Authorizer:    fakeTranslationSuggestionAuthorizer{allowed: true},
		Eligibility:   eligibility,
		Provider:      provider,
	}

	result, err := service.SuggestTranslation(context.Background(), TranslationSuggestionInput{
		AssignmentID:  assignment.ID,
		FieldPath:     "title",
		ActorID:       "translator_1",
		TenantID:      "tenant_1",
		OrgID:         "org_1",
		Channel:       "staging",
		SourceText:    "tampered browser text",
		CorrelationID: "corr_1",
	})
	if err != nil {
		t.Fatalf("suggest translation: %v", err)
	}
	if loader.calls != 1 || loader.assignment.ID != assignment.ID || loader.environment != "staging" {
		t.Fatalf("context loader was not used correctly: %+v", loader)
	}
	if eligibility.calls != 1 {
		t.Fatalf("expected eligibility check before provider, got %d", eligibility.calls)
	}
	if provider.calls != 1 {
		t.Fatalf("expected provider call, got %d", provider.calls)
	}
	if provider.input.SourceText != "Hello from server" {
		t.Fatalf("provider used untrusted source text: %q", provider.input.SourceText)
	}
	if provider.input.CorrelationID != "corr_1" {
		t.Fatalf("correlation metadata not forwarded: %+v", provider.input)
	}
	if result.SuggestedText != "Hola desde el servidor" || result.Provider != "fake" || result.Model != "fake-model" {
		t.Fatalf("unexpected result: %+v", result)
	}
}

func TestDefaultTranslationSuggestionServiceDeniesBeforeProvider(t *testing.T) {
	repo := NewInMemoryTranslationAssignmentRepository()
	assignment, err := repo.Create(context.Background(), TranslationAssignment{
		FamilyID:       "family_1",
		EntityType:     "pages",
		TenantID:       "tenant_1",
		OrgID:          "org_1",
		SourceRecordID: "page_1",
		SourceLocale:   "en",
		TargetLocale:   "es",
		AssignmentType: AssignmentTypeDirect,
		Status:         AssignmentStatusInProgress,
		Priority:       PriorityNormal,
		WorkScope:      "default",
	})
	if err != nil {
		t.Fatalf("create assignment: %v", err)
	}
	eligibility := &fakeTranslationSuggestionEligibility{decision: TranslationSuggestionDecision{
		Allowed:    false,
		ReasonCode: TranslationSuggestionReasonQuotaExceeded,
		Reason:     "Quota exhausted.",
	}}
	provider := &fakeTranslationSuggestionProvider{}
	service := &DefaultTranslationSuggestionService{
		Repository: repo,
		Authorizer: fakeTranslationSuggestionAuthorizer{allowed: true},
		ContextLoader: &fakeTranslationSuggestionContextLoader{
			ctx: TranslationSuggestionAssignmentContext{
				SourceFields: map[string]string{"title": "Hello"},
				TargetFields: map[string]string{"title": ""},
			},
		},
		Eligibility: eligibility,
		Provider:    provider,
	}

	_, err = service.SuggestTranslation(context.Background(), TranslationSuggestionInput{
		AssignmentID: assignment.ID,
		FieldPath:    "title",
	})
	if err == nil {
		t.Fatal("expected quota denial error")
	}
	if provider.calls != 0 {
		t.Fatalf("provider was called despite denial: %d", provider.calls)
	}
	if !strings.Contains(err.Error(), "Quota exhausted") {
		t.Fatalf("expected safe denial reason, got %v", err)
	}
}

func TestDefaultTranslationSuggestionServiceDeniesPermissionBeforeContextLoad(t *testing.T) {
	repo := NewInMemoryTranslationAssignmentRepository()
	assignment, err := repo.Create(context.Background(), TranslationAssignment{
		FamilyID:       "family_1",
		EntityType:     "pages",
		TenantID:       "tenant_1",
		OrgID:          "org_1",
		SourceRecordID: "page_1",
		SourceLocale:   "en",
		TargetLocale:   "es",
		AssignmentType: AssignmentTypeDirect,
		Status:         AssignmentStatusInProgress,
		Priority:       PriorityNormal,
		WorkScope:      "default",
	})
	if err != nil {
		t.Fatalf("create assignment: %v", err)
	}
	loader := &fakeTranslationSuggestionContextLoader{
		ctx: TranslationSuggestionAssignmentContext{
			SourceFields: map[string]string{"title": "Hello"},
			TargetFields: map[string]string{"title": ""},
		},
	}
	eligibility := &fakeTranslationSuggestionEligibility{decision: TranslationSuggestionDecision{Allowed: true}}
	provider := &fakeTranslationSuggestionProvider{}
	service := &DefaultTranslationSuggestionService{
		Repository:    repo,
		Authorizer:    fakeTranslationSuggestionAuthorizer{allowed: false},
		ContextLoader: loader,
		Eligibility:   eligibility,
		Provider:      provider,
	}

	_, err = service.SuggestTranslation(context.Background(), TranslationSuggestionInput{
		AssignmentID: assignment.ID,
		FieldPath:    "title",
	})
	if err == nil {
		t.Fatal("expected permission denial error")
	}
	if loader.calls != 0 {
		t.Fatalf("context loader was called before permission denial: %d", loader.calls)
	}
	if eligibility.calls != 0 {
		t.Fatalf("eligibility was called before permission denial: %d", eligibility.calls)
	}
	if provider.calls != 0 {
		t.Fatalf("provider was called before permission denial: %d", provider.calls)
	}
	if !strings.Contains(err.Error(), "permission") {
		t.Fatalf("expected permission denial, got %v", err)
	}
}

func TestDefaultTranslationSuggestionServicePropagatesSafePolicyDenialReasons(t *testing.T) {
	cases := []struct {
		name       string
		reasonCode string
		reason     string
	}{
		{
			name:       "provider policy",
			reasonCode: TranslationSuggestionReasonPolicyDenied,
			reason:     "Provider policy denied this assignment.",
		},
		{
			name:       "rate limit",
			reasonCode: TranslationSuggestionReasonRateLimited,
			reason:     "Rate limit reached for this tenant.",
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			repo := NewInMemoryTranslationAssignmentRepository()
			assignment, err := repo.Create(context.Background(), TranslationAssignment{
				FamilyID:       "family_1",
				EntityType:     "pages",
				TenantID:       "tenant_1",
				OrgID:          "org_1",
				SourceRecordID: "page_1",
				SourceLocale:   "en",
				TargetLocale:   "es",
				AssignmentType: AssignmentTypeDirect,
				Status:         AssignmentStatusInProgress,
				Priority:       PriorityNormal,
				WorkScope:      "default",
			})
			if err != nil {
				t.Fatalf("create assignment: %v", err)
			}
			eligibility := &fakeTranslationSuggestionEligibility{decision: TranslationSuggestionDecision{
				Allowed:    false,
				ReasonCode: tc.reasonCode,
				Reason:     tc.reason,
				Diagnostics: map[string]any{
					"tenant_id": "tenant_1",
				},
			}}
			provider := &fakeTranslationSuggestionProvider{}
			service := &DefaultTranslationSuggestionService{
				Repository: repo,
				Authorizer: fakeTranslationSuggestionAuthorizer{allowed: true},
				ContextLoader: &fakeTranslationSuggestionContextLoader{
					ctx: TranslationSuggestionAssignmentContext{
						SourceFields: map[string]string{"title": "Hello"},
						TargetFields: map[string]string{"title": ""},
					},
				},
				Eligibility: eligibility,
				Provider:    provider,
			}

			_, err = service.SuggestTranslation(context.Background(), TranslationSuggestionInput{
				AssignmentID: assignment.ID,
				FieldPath:    "title",
			})
			if err == nil {
				t.Fatal("expected denial error")
			}
			if provider.calls != 0 {
				t.Fatalf("provider was called despite denial: %d", provider.calls)
			}
			if !strings.Contains(err.Error(), tc.reason) {
				t.Fatalf("expected safe denial reason %q, got %v", tc.reason, err)
			}
		})
	}
}

func TestDefaultTranslationSuggestionServiceRejectsReadOnlyAssignment(t *testing.T) {
	repo := NewInMemoryTranslationAssignmentRepository()
	assignment, err := repo.Create(context.Background(), TranslationAssignment{
		FamilyID:       "family_1",
		EntityType:     "pages",
		SourceRecordID: "page_1",
		SourceLocale:   "en",
		TargetLocale:   "es",
		AssignmentType: AssignmentTypeDirect,
		Status:         AssignmentStatusApproved,
		Priority:       PriorityNormal,
		WorkScope:      "default",
	})
	if err != nil {
		t.Fatalf("create assignment: %v", err)
	}
	provider := &fakeTranslationSuggestionProvider{}
	service := &DefaultTranslationSuggestionService{
		Repository: repo,
		Authorizer: fakeTranslationSuggestionAuthorizer{allowed: true},
		ContextLoader: &fakeTranslationSuggestionContextLoader{
			ctx: TranslationSuggestionAssignmentContext{
				SourceFields: map[string]string{"title": "Hello"},
			},
		},
		Eligibility: TranslationSuggestionAllowAllEligibility{},
		Provider:    provider,
	}

	_, err = service.SuggestTranslation(context.Background(), TranslationSuggestionInput{
		AssignmentID: assignment.ID,
		FieldPath:    "title",
	})
	if err == nil {
		t.Fatal("expected read-only assignment error")
	}
	if provider.calls != 0 {
		t.Fatalf("provider was called for read-only assignment: %d", provider.calls)
	}
}
