package quickstart

import (
	"context"
	"errors"
	"testing"

	"github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-command/dispatcher"
	"github.com/goliatone/go-command/registry"
)

type stubQuickstartTranslationExchangeStore struct {
	exportRows []admin.TranslationExchangeRow
	applyCalls int
}

func (s *stubQuickstartTranslationExchangeStore) ExportRows(context.Context, admin.TranslationExportFilter) ([]admin.TranslationExchangeRow, error) {
	return append([]admin.TranslationExchangeRow{}, s.exportRows...), nil
}

func (s *stubQuickstartTranslationExchangeStore) ResolveLinkage(context.Context, admin.TranslationExchangeLinkageKey) (admin.TranslationExchangeLinkage, error) {
	return admin.TranslationExchangeLinkage{
		SourceHash:   "hash",
		TargetExists: true,
	}, nil
}

func (s *stubQuickstartTranslationExchangeStore) ApplyTranslation(context.Context, admin.TranslationExchangeApplyRequest) error {
	s.applyCalls++
	return nil
}

func TestWithTranslationExchangeConfigSetsFeatureDefault(t *testing.T) {
	opts := &adminOptions{}
	WithTranslationExchangeConfig(TranslationExchangeConfig{Enabled: true})(opts)
	if opts.featureDefaults[string(admin.FeatureTranslationExchange)] != true {
		t.Fatalf("expected translation exchange feature default enabled")
	}
	if !opts.translationExchangeConfigSet {
		t.Fatalf("expected translation exchange config to be marked as set")
	}
}

func TestNewAdminTranslationExchangeDisabledByDefault(t *testing.T) {
	t.Cleanup(func() { _ = registry.Stop(context.Background()) })
	cfg := NewAdminConfig("", "", "")
	adm, _, err := NewAdmin(cfg, AdapterHooks{})
	if err != nil {
		t.Fatalf("NewAdmin error: %v", err)
	}
	if adm.Commands() != nil {
		t.Cleanup(adm.Commands().Reset)
	}
	if binding := adm.BootTranslationExchange(); binding != nil {
		t.Fatalf("expected translation exchange binding disabled by default")
	}
}

func TestNewAdminTranslationExchangeEnabledRegistersCommandsAndPermissions(t *testing.T) {
	t.Cleanup(func() { _ = registry.Stop(context.Background()) })
	store := &stubQuickstartTranslationExchangeStore{
		exportRows: []admin.TranslationExchangeRow{
			{Resource: "pages", EntityID: "page-1", TranslationGroupID: "tg-1", TargetLocale: "es", FieldPath: "title"},
		},
	}
	registered := []PermissionDefinition{}

	cfg := NewAdminConfig("", "", "")
	adm, _, err := NewAdmin(cfg, AdapterHooks{}, WithTranslationExchangeConfig(TranslationExchangeConfig{
		Enabled: true,
		Store:   store,
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
	if binding := adm.BootTranslationExchange(); binding == nil {
		t.Fatalf("expected translation exchange binding enabled")
	}
	if len(registered) != len(TranslationExchangePermissions()) {
		t.Fatalf("expected %d registered permissions, got %d", len(TranslationExchangePermissions()), len(registered))
	}

	out := admin.TranslationExportResult{}
	err = dispatcher.Dispatch(context.Background(), admin.TranslationExportInput{
		Filter: admin.TranslationExportFilter{
			Resources: []string{"pages"},
		},
		Output: &out,
	})
	if err != nil {
		t.Fatalf("dispatch export command: %v", err)
	}
	if out.RowCount != 1 {
		t.Fatalf("expected row count 1, got %d", out.RowCount)
	}
}

func TestNewAdminTranslationExchangeAsyncApplyHook(t *testing.T) {
	t.Cleanup(func() { _ = registry.Stop(context.Background()) })
	store := &stubQuickstartTranslationExchangeStore{
		exportRows: []admin.TranslationExchangeRow{
			{Resource: "pages", EntityID: "page-1", TranslationGroupID: "tg-1", TargetLocale: "es", FieldPath: "title"},
		},
	}
	asyncCalled := false

	cfg := NewAdminConfig("", "", "")
	adm, _, err := NewAdmin(cfg, AdapterHooks{}, WithTranslationExchangeConfig(TranslationExchangeConfig{
		Enabled: true,
		Store:   store,
		AsyncApply: func(_ context.Context, input admin.TranslationImportApplyInput) (admin.TranslationExchangeResult, error) {
			asyncCalled = true
			return admin.TranslationExchangeResult{
				Summary: admin.TranslationExchangeSummary{
					Processed: len(input.Rows),
					Succeeded: len(input.Rows),
				},
			}, nil
		},
	}))
	if err != nil {
		t.Fatalf("NewAdmin error: %v", err)
	}
	if adm.Commands() != nil {
		t.Cleanup(adm.Commands().Reset)
	}

	result := admin.TranslationExchangeResult{}
	err = dispatcher.Dispatch(context.Background(), admin.TranslationImportApplyInput{
		Rows: []admin.TranslationExchangeRow{
			{
				Resource:           "pages",
				EntityID:           "page-1",
				TranslationGroupID: "tg-1",
				TargetLocale:       "es",
				FieldPath:          "title",
				TranslatedText:     "Hola",
			},
		},
		Result: &result,
	})
	if err != nil {
		t.Fatalf("dispatch apply command: %v", err)
	}
	if !asyncCalled {
		t.Fatalf("expected async apply hook to be called")
	}
	if result.Summary.Processed != 1 || result.Summary.Succeeded != 1 {
		t.Fatalf("expected async summary to be applied, got %+v", result.Summary)
	}
}

func TestNewAdminTranslationExchangeRegistersByNameFactories(t *testing.T) {
	t.Cleanup(func() { _ = registry.Stop(context.Background()) })
	store := &stubQuickstartTranslationExchangeStore{}

	cfg := NewAdminConfig("", "", "")
	adm, _, err := NewAdmin(cfg, AdapterHooks{}, WithTranslationExchangeConfig(TranslationExchangeConfig{
		Enabled: true,
		Store:   store,
	}))
	if err != nil {
		t.Fatalf("NewAdmin error: %v", err)
	}
	if adm.Commands() != nil {
		t.Cleanup(adm.Commands().Reset)
	}

	err = adm.Commands().DispatchByName(context.Background(), (admin.TranslationImportApplyInput{}).Type(), map[string]any{
		"rows": []map[string]any{
			{
				"resource":             "pages",
				"entity_id":            "page-1",
				"translation_group_id": "tg-1",
				"target_locale":        "es",
				"field_path":           "title",
				"translated_text":      "Hola",
			},
		},
	}, nil)
	if err != nil {
		t.Fatalf("dispatch by name apply command: %v", err)
	}
	if store.applyCalls != 1 {
		t.Fatalf("expected apply command to call store once, got %d", store.applyCalls)
	}
}

func TestNewAdminTranslationExchangeEnabledRequiresHandlers(t *testing.T) {
	cfg := NewAdminConfig("", "", "")
	_, _, err := NewAdmin(cfg, AdapterHooks{}, WithTranslationExchangeConfig(TranslationExchangeConfig{
		Enabled: true,
	}))
	if err == nil {
		t.Fatalf("expected error for missing exchange handlers")
	}
	if !errors.Is(err, ErrTranslationExchangeConfig) {
		t.Fatalf("expected ErrTranslationExchangeConfig, got %v", err)
	}
}
