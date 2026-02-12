package quickstart

import (
	"context"
	"errors"
	"testing"

	"github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-command/registry"
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
	t.Cleanup(func() { _ = registry.Stop(context.Background()) })

	repo := admin.NewInMemoryTranslationAssignmentRepository()
	ctx := context.Background()
	created, err := repo.Create(ctx, admin.TranslationAssignment{
		TranslationGroupID: "tg_1",
		EntityType:         "pages",
		SourceRecordID:     "page_1",
		SourceLocale:       "en",
		TargetLocale:       "es",
		AssignmentType:     admin.AssignmentTypeOpenPool,
		Status:             admin.AssignmentStatusPending,
		Priority:           admin.PriorityNormal,
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
		if len(adm.Registry().PanelTabs(panelName)) == 0 {
			t.Fatalf("expected translation tab registration for %s", panelName)
		}
	}
	if len(registered) != len(TranslationQueuePermissions()) {
		t.Fatalf("expected %d permissions, got %d", len(TranslationQueuePermissions()), len(registered))
	}

	if err := adm.Commands().DispatchByName(ctx, (admin.TranslationQueueClaimInput{}).Type(), map[string]any{
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

func TestNewAdminTranslationQueueDerivesLocalesFromPolicyWhenUnset(t *testing.T) {
	t.Cleanup(func() { _ = registry.Stop(context.Background()) })

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
	adm, _, err := NewAdmin(cfg, AdapterHooks{},
		WithTranslationPolicyConfig(policy),
		WithTranslationQueueConfig(TranslationQueueConfig{Enabled: true}),
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
	_, _, err := NewAdmin(cfg, AdapterHooks{},
		WithTranslationPolicyConfig(policy),
		WithTranslationQueueConfig(TranslationQueueConfig{
			Enabled:          true,
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
		TranslationGroupID: "tg_123",
		EntityType:         "pages",
		EntityID:           "page_123",
		SourceLocale:       "en",
		MissingLocales:     []string{"es"},
	})
	if result.Created != 1 {
		t.Fatalf("expected 1 created, got %d", result.Created)
	}
}

func TestNewTranslationQueueAutoCreateHookUsesDefaultRepoWhenNil(t *testing.T) {
	hook := NewTranslationQueueAutoCreateHook(TranslationQueueConfig{
		Enabled:          true,
		EnableAutoCreate: true,
		Repository:       nil, // nil repo should use default in-memory
	})
	if hook == nil {
		t.Fatalf("expected non-nil hook with default repo")
	}

	result := hook.OnTranslationBlocker(context.Background(), admin.TranslationQueueAutoCreateInput{
		TranslationGroupID: "tg_456",
		EntityType:         "posts",
		EntityID:           "post_456",
		SourceLocale:       "en",
		MissingLocales:     []string{"fr"},
	})
	if result.Created != 1 {
		t.Fatalf("expected 1 created with default repo, got %d", result.Created)
	}
}
