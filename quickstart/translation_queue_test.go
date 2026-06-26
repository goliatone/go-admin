package quickstart

import (
	"context"
	"errors"
	"testing"

	"github.com/goliatone/go-admin/admin"
	gocommand "github.com/goliatone/go-command"
)

func TestWithTranslationQueueConfigSetsFeatureDefault(t *testing.T) {
	opts := &adminOptions{}
	WithTranslationQueueConfig(TranslationQueueConfig{Enabled: true})(opts)
	if opts.featureDefaults[string(admin.FeatureTranslationQueue)] != true {
		t.Fatalf("expected translation queue feature default enabled")
	}
	if !opts.translationQueueConfigSet {
		t.Fatalf("expected translation queue config to be marked as set")
	}
}

func TestNewAdminTranslationQueueDisabledByDefault(t *testing.T) {
	cfg := NewAdminConfig("", "", "")
	adm, _, err := NewAdmin(cfg, AdapterHooks{})
	if err != nil {
		t.Fatalf("NewAdmin error: %v", err)
	}
	if _, ok := adm.Registry().Panel("translations"); ok {
		t.Fatalf("expected translation queue panel disabled by default")
	}
}

func TestNewAdminTranslationQueueEnabledRegistersPanelCommandsAndPermissions(t *testing.T) {
	cleanupGlobalCommandRegistry(t)

	repo := admin.NewInMemoryTranslationAssignmentRepository()
	ctx := context.Background()
	created, err := repo.Create(ctx, admin.TranslationAssignment{
		FamilyID:       "tg_1",
		EntityType:     "pages",
		SourceRecordID: "page_1",
		SourceLocale:   "en",
		TargetLocale:   "es",
		AssignmentType: admin.AssignmentTypeOpenPool,
		Status:         admin.AssignmentStatusPending,
		Priority:       admin.PriorityNormal,
	})
	if err != nil {
		t.Fatalf("seed assignment: %v", err)
	}

	registered := []PermissionDefinition{}
	cfg := NewAdminConfig("", "", "")
	adm, _, err := NewAdmin(cfg, AdapterHooks{}, WithTranslationQueueConfig(TranslationQueueConfig{
		Enabled:          true,
		Repository:       repo,
		SupportedLocales: []string{"en", "es"},
		PermissionRegister: func(def PermissionDefinition) error {
			registered = append(registered, def)
			return nil
		},
	}))
	if err != nil {
		t.Fatalf("NewAdmin error: %v", err)
	}
	if adm.Commands() != nil {
		t.Cleanup(adm.Commands().Reset)
	}

	if _, ok := adm.Registry().Panel("translations"); !ok {
		t.Fatalf("expected translation queue panel to be registered")
	}
	for _, panelName := range []string{"pages", "posts"} {
		if len(adm.Registry().PanelTabs(panelName)) != 0 {
			t.Fatalf("expected no hardcoded translation tab registration for %s", panelName)
		}
	}
	if len(registered) != len(TranslationQueuePermissions()) {
		t.Fatalf("expected %d permissions, got %d", len(TranslationQueuePermissions()), len(registered))
	}

	if err = adm.Commands().DispatchByName(ctx, (admin.TranslationQueueClaimInput{}).Type(), map[string]any{
		"assignment_id":    created.ID,
		"claimer_id":       "translator_1",
		"expected_version": created.Version,
	}, nil); err != nil {
		t.Fatalf("dispatch queue claim by name: %v", err)
	}
	updated, err := repo.Get(ctx, created.ID)
	if err != nil {
		t.Fatalf("get updated assignment: %v", err)
	}
	if updated.Status != admin.AssignmentStatusInProgress {
		t.Fatalf("expected in_progress after claim command, got %q", updated.Status)
	}
}

func TestNewAdminTranslationQueueRegistersSuggestionServiceCommandAndRPCRule(t *testing.T) {
	cleanupGlobalCommandRegistry(t)

	repo := admin.NewInMemoryTranslationAssignmentRepository()
	suggestionSvc := &quickstartTranslationSuggestionService{
		result: admin.TranslationSuggestionResult{
			AssignmentID:  "tqa_1",
			FieldPath:     "title",
			SuggestedText: "Hola",
		},
	}
	cfg := NewAdminConfig("", "", "")
	adm, _, err := NewAdmin(cfg, AdapterHooks{}, WithTranslationQueueConfig(TranslationQueueConfig{
		Enabled:           true,
		Repository:        repo,
		SupportedLocales:  []string{"en", "es"},
		SuggestionService: suggestionSvc,
	}))
	if err != nil {
		t.Fatalf("NewAdmin error: %v", err)
	}
	if adm.Commands() != nil {
		t.Cleanup(adm.Commands().Reset)
	}
	if adm.TranslationSuggestionService() == nil {
		t.Fatalf("expected suggestion service to be attached")
	}
	outcome, err := adm.Commands().DispatchByNameWithOutcome(context.Background(), (admin.TranslationSuggestionInput{}).Type(), map[string]any{
		"assignment_id": "tqa_1",
		"field_path":    "title",
	}, nil, gocommand.DispatchOptions{Mode: gocommand.ExecutionModeInline})
	if err != nil {
		t.Fatalf("dispatch suggestion command: %v", err)
	}
	if suggestionSvc.calls != 1 {
		t.Fatalf("expected one suggestion service call, got %d", suggestionSvc.calls)
	}
	result, ok := outcome.Result.(admin.TranslationSuggestionResult)
	if !ok || result.SuggestedText != "Hola" {
		t.Fatalf("unexpected suggestion outcome: %#v", outcome.Result)
	}

	caps := admin.TranslationCapabilities(adm)
	features, _ := caps["features"].(map[string]any)
	suggestions, _ := features["suggestions"].(map[string]any)
	if rpcAllowed, _ := suggestions["rpc_allowed"].(bool); !rpcAllowed {
		t.Fatalf("expected quickstart to seed suggestion RPC rule, got %+v", suggestions)
	}
}

func TestNewAdminTranslationQueueConfiguresSuggestionServiceDependencies(t *testing.T) {
	cleanupGlobalCommandRegistry(t)

	repo := admin.NewInMemoryTranslationAssignmentRepository()
	suggestionSvc := &quickstartConfigurableTranslationSuggestionService{}
	eligibility := admin.TranslationSuggestionAllowAllEligibility{}
	authorizer := quickstartTranslationSuggestionAuthorizer{}
	cfg := NewAdminConfig("", "", "")
	adm, _, err := NewAdmin(cfg, AdapterHooks{},
		WithAdminDependencies(admin.Dependencies{Authorizer: authorizer}),
		WithTranslationQueueConfig(TranslationQueueConfig{
			Enabled:               true,
			Repository:            repo,
			SupportedLocales:      []string{"en", "es"},
			SuggestionService:     suggestionSvc,
			SuggestionEligibility: eligibility,
			SuggestionPermission:  "admin.translations.suggest.custom",
			SuggestionResource:    "translation-suggestions",
		}),
	)
	if err != nil {
		t.Fatalf("NewAdmin error: %v", err)
	}
	if adm.Commands() != nil {
		t.Cleanup(adm.Commands().Reset)
	}
	if suggestionSvc.deps.Repository != repo {
		t.Fatalf("expected queue repository dependency, got %#v", suggestionSvc.deps.Repository)
	}
	if suggestionSvc.deps.ContextLoader == nil {
		t.Fatalf("expected admin-backed suggestion context loader")
	}
	if suggestionSvc.deps.Authorizer != authorizer {
		t.Fatalf("expected admin authorizer dependency")
	}
	if suggestionSvc.deps.Eligibility != eligibility {
		t.Fatalf("expected configured eligibility dependency")
	}
	if suggestionSvc.deps.Permission != "admin.translations.suggest.custom" {
		t.Fatalf("expected custom suggestion permission, got %q", suggestionSvc.deps.Permission)
	}
	if suggestionSvc.deps.Resource != "translation-suggestions" {
		t.Fatalf("expected custom suggestion resource, got %q", suggestionSvc.deps.Resource)
	}
}

type quickstartTranslationSuggestionService struct {
	calls  int
	result admin.TranslationSuggestionResult
}

func (s *quickstartTranslationSuggestionService) SuggestTranslation(_ context.Context, input admin.TranslationSuggestionInput) (admin.TranslationSuggestionResult, error) {
	s.calls++
	if s.result.AssignmentID == "" {
		s.result.AssignmentID = input.AssignmentID
	}
	if s.result.FieldPath == "" {
		s.result.FieldPath = input.FieldPath
	}
	return s.result, nil
}

type quickstartConfigurableTranslationSuggestionService struct {
	quickstartTranslationSuggestionService
	deps admin.TranslationSuggestionServiceDependencies
}

func (s *quickstartConfigurableTranslationSuggestionService) ConfigureTranslationSuggestionServiceDependencies(deps admin.TranslationSuggestionServiceDependencies) {
	s.deps = deps
}

type quickstartTranslationSuggestionAuthorizer struct{}

func (quickstartTranslationSuggestionAuthorizer) Can(context.Context, string, string) bool {
	return true
}

func TestNewAdminTranslationQueueDerivesLocalesFromPolicyWhenUnset(t *testing.T) {
	cleanupGlobalCommandRegistry(t)

	policy := TranslationPolicyConfig{
		Required: map[string]TranslationPolicyEntityConfig{
			"pages": {
				"publish": {
					Locales: []string{"en", "es"},
				},
			},
		},
	}

	cfg := NewAdminConfig("", "", "")
	repo := admin.NewInMemoryTranslationAssignmentRepository()
	adm, _, err := NewAdmin(cfg, AdapterHooks{},
		WithTranslationPolicyConfig(policy),
		WithTranslationPolicyServices(TranslationPolicyServices{
			Pages:   stubTranslationChecker{},
			Content: stubTranslationChecker{},
		}),
		WithTranslationQueueConfig(TranslationQueueConfig{
			Enabled:    true,
			Repository: repo,
		}),
	)
	if err != nil {
		t.Fatalf("expected queue locales to derive from policy, got %v", err)
	}
	if _, ok := adm.Registry().Panel("translations"); !ok {
		t.Fatalf("expected translation queue panel registration")
	}
}

func TestNewAdminTranslationQueueRequiresLocalesWhenNoPolicy(t *testing.T) {
	cfg := NewAdminConfig("", "", "")
	_, _, err := NewAdmin(cfg, AdapterHooks{}, WithTranslationQueueConfig(TranslationQueueConfig{
		Enabled: true,
	}))
	if err == nil {
		t.Fatalf("expected queue config error when locales cannot be derived")
	}
	if !errors.Is(err, ErrTranslationQueueConfig) {
		t.Fatalf("expected ErrTranslationQueueConfig, got %v", err)
	}
}

func TestNewAdminTranslationQueueFailsOnPolicyLocaleMismatch(t *testing.T) {
	policy := TranslationPolicyConfig{
		Required: map[string]TranslationPolicyEntityConfig{
			"pages": {
				"publish": {
					Locales: []string{"en", "es"},
				},
			},
		},
	}

	cfg := NewAdminConfig("", "", "")
	repo := admin.NewInMemoryTranslationAssignmentRepository()
	_, _, err := NewAdmin(cfg, AdapterHooks{},
		WithTranslationPolicyConfig(policy),
		WithTranslationPolicyServices(TranslationPolicyServices{
			Pages:   stubTranslationChecker{},
			Content: stubTranslationChecker{},
		}),
		WithTranslationQueueConfig(TranslationQueueConfig{
			Enabled:          true,
			Repository:       repo,
			SupportedLocales: []string{"en", "fr"},
		}),
	)
	if err == nil {
		t.Fatalf("expected queue/policy locale mismatch error")
	}
	if !errors.Is(err, ErrTranslationQueueConfig) {
		t.Fatalf("expected ErrTranslationQueueConfig, got %v", err)
	}
}

func TestNewTranslationQueueAutoCreateHookDisabledWhenQueueDisabled(t *testing.T) {
	hook := NewTranslationQueueAutoCreateHook(TranslationQueueConfig{
		Enabled:          false,
		EnableAutoCreate: true,
	})
	if hook != nil {
		t.Fatalf("expected nil hook when queue disabled")
	}
}

func TestNewTranslationQueueAutoCreateHookDisabledWhenAutoCreateDisabled(t *testing.T) {
	hook := NewTranslationQueueAutoCreateHook(TranslationQueueConfig{
		Enabled:          true,
		EnableAutoCreate: false,
	})
	if hook != nil {
		t.Fatalf("expected nil hook when auto-create disabled")
	}
}

func TestNewTranslationQueueAutoCreateHookCreatesHookWhenEnabled(t *testing.T) {
	repo := admin.NewInMemoryTranslationAssignmentRepository()
	hook := NewTranslationQueueAutoCreateHook(TranslationQueueConfig{
		Enabled:          true,
		EnableAutoCreate: true,
		Repository:       repo,
	})
	if hook == nil {
		t.Fatalf("expected non-nil hook when enabled")
	}

	// Test that hook creates assignments
	result := hook.OnTranslationBlocker(context.Background(), admin.TranslationQueueAutoCreateInput{
		FamilyID:       "tg_123",
		EntityType:     "pages",
		EntityID:       "page_123",
		SourceLocale:   "en",
		MissingLocales: []string{"es"},
	})
	if result.Created != 1 {
		t.Fatalf("expected 1 created, got %d", result.Created)
	}
}

func TestNewTranslationQueueAutoCreateHookReturnsNilWhenRepoMissing(t *testing.T) {
	hook := NewTranslationQueueAutoCreateHook(TranslationQueueConfig{
		Enabled:          true,
		EnableAutoCreate: true,
		Repository:       nil,
	})
	if hook != nil {
		t.Fatalf("expected nil hook when repository is missing")
	}
}
