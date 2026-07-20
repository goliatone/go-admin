package quickstart

import (
	"context"
	"errors"
	"strings"
	"testing"

	"github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-command/dispatcher"
)

type stubQuickstartTranslationExchangeStore struct {
	exportRows    []admin.TranslationExchangeRow
	exportFilters []admin.TranslationExportFilter
	applyCalls    int
}

func (s *stubQuickstartTranslationExchangeStore) ExportRows(_ context.Context, filter admin.TranslationExportFilter) ([]admin.TranslationExchangeRow, error) {
	s.exportFilters = append(s.exportFilters, filter)
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
	cleanupGlobalCommandRegistry(t)
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
	cleanupGlobalCommandRegistry(t)
	store := &stubQuickstartTranslationExchangeStore{
		exportRows: []admin.TranslationExchangeRow{
			{Resource: "pages", EntityID: "page-1", FamilyID: "tg-1", TargetLocale: "es", FieldPath: "title"},
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
	cleanupGlobalCommandRegistry(t)
	store := &stubQuickstartTranslationExchangeStore{
		exportRows: []admin.TranslationExchangeRow{
			{Resource: "pages", EntityID: "page-1", FamilyID: "tg-1", TargetLocale: "es", FieldPath: "title"},
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
				Resource:       "pages",
				EntityID:       "page-1",
				FamilyID:       "tg-1",
				TargetLocale:   "es",
				FieldPath:      "title",
				TranslatedText: "Hola",
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
	cleanupGlobalCommandRegistry(t)
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
				"resource":        "pages",
				"entity_id":       "page-1",
				"family_id":       "tg-1",
				"target_locale":   "es",
				"field_path":      "title",
				"translated_text": "Hola",
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

func TestTranslationExchangeValidatingExporterRejectsUnsupportedConfiguredFilters(t *testing.T) {
	ui := normalizeTranslationExchangeUIConfig(TranslationExchangeUIConfig{
		SourceLocale:  "en",
		TargetLocales: []TranslationExchangeLocaleOption{{Code: "bo"}, {Code: "zh"}},
		Resources:     []TranslationExchangeResourceOption{{ID: "archive_items"}},
	}, "en", nil)
	_, err := validateTranslationExchangeExportFilter(admin.TranslationExportFilter{
		Resources:     []string{"pages"},
		SourceLocale:  "en",
		TargetLocales: []string{"bo"},
	}, ui)
	if err == nil || !strings.Contains(errorDetail(err), "unsupported exchange resource") {
		t.Fatalf("expected unsupported resource validation error, got %v", err)
	}
	_, err = validateTranslationExchangeExportFilter(admin.TranslationExportFilter{
		Resources:     []string{"archive_items"},
		SourceLocale:  "es",
		TargetLocales: []string{"bo"},
	}, ui)
	if err == nil || !strings.Contains(errorDetail(err), "unsupported source locale") {
		t.Fatalf("expected unsupported source validation error, got %v", err)
	}
	_, err = validateTranslationExchangeExportFilter(admin.TranslationExportFilter{
		Resources:     []string{"archive_items"},
		SourceLocale:  "en",
		TargetLocales: []string{"es"},
	}, ui)
	if err == nil || !strings.Contains(errorDetail(err), "unsupported target locale") {
		t.Fatalf("expected unsupported target validation error, got %v", err)
	}
}

func TestTranslationExchangeValidatingExporterPreservesResourceIDs(t *testing.T) {
	ui := normalizeTranslationExchangeUIConfig(TranslationExchangeUIConfig{
		SourceLocale:  "en",
		TargetLocales: []TranslationExchangeLocaleOption{{Code: "bo"}},
		Resources:     []TranslationExchangeResourceOption{{ID: "Archive_Items"}},
	}, "en", nil)

	filter, err := validateTranslationExchangeExportFilter(admin.TranslationExportFilter{
		Resources:     []string{"Archive_Items"},
		SourceLocale:  "en",
		TargetLocales: []string{"bo"},
	}, ui)
	if err != nil {
		t.Fatalf("expected preserved resource ID to validate, got %v", err)
	}
	if got := strings.Join(filter.Resources, ","); got != "Archive_Items" {
		t.Fatalf("expected resource ID preserved, got %q", got)
	}

	_, err = validateTranslationExchangeExportFilter(admin.TranslationExportFilter{
		Resources:     []string{"archive_items"},
		SourceLocale:  "en",
		TargetLocales: []string{"bo"},
	}, ui)
	if err == nil || !strings.Contains(errorDetail(err), "unsupported exchange resource") {
		t.Fatalf("expected case-mismatched resource ID rejected, got %v", err)
	}
}

func TestNewAdminTranslationExchangeValidatesConfiguredFiltersBeforeServiceExport(t *testing.T) {
	cleanupGlobalCommandRegistry(t)
	store := &stubQuickstartTranslationExchangeStore{}
	cfg := NewAdminConfig("", "", "en")
	adm, _, err := NewAdmin(cfg, AdapterHooks{}, WithTranslationExchangeConfig(TranslationExchangeConfig{
		Enabled: true,
		Store:   store,
		UI: TranslationExchangeUIConfig{
			SourceLocale:  "en",
			TargetLocales: []TranslationExchangeLocaleOption{{Code: "bo"}, {Code: "zh"}},
			Resources:     []TranslationExchangeResourceOption{{ID: "archive_items"}},
		},
	}))
	if err != nil {
		t.Fatalf("NewAdmin error: %v", err)
	}
	if adm.Commands() != nil {
		t.Cleanup(adm.Commands().Reset)
	}

	err = dispatcher.Dispatch(context.Background(), admin.TranslationExportInput{
		Filter: admin.TranslationExportFilter{
			Resources:     []string{"archive_items"},
			SourceLocale:  "en",
			TargetLocales: []string{"es"},
		},
		Output: &admin.TranslationExportResult{},
	})
	if err == nil || !strings.Contains(errorDetail(err), "unsupported target locale") {
		t.Fatalf("expected unsupported target locale error, got %v", err)
	}
	if len(store.exportFilters) != 0 {
		t.Fatalf("expected validation to reject before store export, got %d calls", len(store.exportFilters))
	}

	err = dispatcher.Dispatch(context.Background(), admin.TranslationExportInput{
		Filter: admin.TranslationExportFilter{
			Resources:     []string{"archive_items"},
			SourceLocale:  "EN",
			TargetLocales: []string{"BO", "ZH"},
		},
		Output: &admin.TranslationExportResult{},
	})
	if err != nil {
		t.Fatalf("expected normalized configured export to pass, got %v", err)
	}
	if len(store.exportFilters) != 1 {
		t.Fatalf("expected store export call")
	}
	got := store.exportFilters[0]
	if strings.Join(got.Resources, ",") != "archive_items" || got.SourceLocale != "en" || strings.Join(got.TargetLocales, ",") != "bo,zh" {
		t.Fatalf("expected normalized filter passed to store, got %+v", got)
	}
}

type customQuickstartTranslationExchangeExporter struct {
	calls int
}

func (e *customQuickstartTranslationExchangeExporter) Export(context.Context, admin.TranslationExportInput) (admin.TranslationExportResult, error) {
	e.calls++
	return admin.TranslationExportResult{}, nil
}

func TestNewAdminTranslationExchangeValidatesConfiguredFiltersBeforeCustomExporter(t *testing.T) {
	cleanupGlobalCommandRegistry(t)
	store := &stubQuickstartTranslationExchangeStore{}
	exporter := &customQuickstartTranslationExchangeExporter{}
	cfg := NewAdminConfig("", "", "en")
	adm, _, err := NewAdmin(cfg, AdapterHooks{}, WithTranslationExchangeConfig(TranslationExchangeConfig{
		Enabled:  true,
		Store:    store,
		Exporter: exporter,
		UI: TranslationExchangeUIConfig{
			SourceLocale:  "en",
			TargetLocales: []TranslationExchangeLocaleOption{{Code: "bo"}, {Code: "zh"}},
			Resources:     []TranslationExchangeResourceOption{{ID: "archive_items"}},
		},
	}))
	if err != nil {
		t.Fatalf("NewAdmin error: %v", err)
	}
	if adm.Commands() != nil {
		t.Cleanup(adm.Commands().Reset)
	}

	err = dispatcher.Dispatch(context.Background(), admin.TranslationExportInput{
		Filter: admin.TranslationExportFilter{
			Resources:     []string{"archive_items"},
			SourceLocale:  "en",
			TargetLocales: []string{"fr"},
		},
		Output: &admin.TranslationExportResult{},
	})
	if err == nil || !strings.Contains(errorDetail(err), "unsupported target locale") {
		t.Fatalf("expected unsupported target locale error, got %v", err)
	}
	if exporter.calls != 0 {
		t.Fatalf("expected validation to reject before custom exporter")
	}
}

func TestNormalizeTranslationExchangeUIConfigZeroValuePreservesFallbackPath(t *testing.T) {
	got := normalizeTranslationExchangeUIConfig(TranslationExchangeUIConfig{}, "en", []string{"en", "es"})
	if got.Configured {
		t.Fatalf("expected zero-value UI config to remain unconfigured: %+v", got)
	}
	if len(got.Resources) != 0 || len(got.TargetLocales) != 0 || len(got.SourceLocales) != 0 {
		t.Fatalf("expected zero-value UI config to avoid demo/default values: %+v", got)
	}
}

func TestNormalizeTranslationExchangeUIConfigLocalesResourcesAndDefaults(t *testing.T) {
	includeHash := false
	allowCreate := false
	continueOnError := false
	got := normalizeTranslationExchangeUIConfig(TranslationExchangeUIConfig{
		SourceLocale: " EN ",
		TargetLocales: []TranslationExchangeLocaleOption{
			{Code: "BO", Label: "Tibetan"},
			{Code: "ZH", Label: "Chinese"},
			{Code: "en", Label: "English"},
		},
		Resources: []TranslationExchangeResourceOption{
			{ID: "Pages", Label: "Pages"},
			{ID: "ARCHIVE_ITEMS", Label: "Archive items"},
			{ID: "Pages", Label: "Duplicate pages"},
		},
		DefaultResources:     []string{"ARCHIVE_ITEMS", "missing"},
		DefaultTargetLocales: []string{"EN", "BO", "missing"},
		LocaleLabels: map[string]string{
			"en": "English",
			"bo": "Bod",
		},
		IncludeSourceHash: &includeHash,
		Apply: TranslationExchangeApplyDefaults{
			AllowCreateMissing: &allowCreate,
			ContinueOnError:    &continueOnError,
		},
	}, "en", nil)

	if !got.Configured {
		t.Fatalf("expected configured UI config")
	}
	if got.SourceLocale != "en" {
		t.Fatalf("expected normalized source locale en, got %q", got.SourceLocale)
	}
	if len(got.SourceLocales) != 1 || got.SourceLocales[0].Label != "English" {
		t.Fatalf("expected source locale label preserved from label map, got %+v", got.SourceLocales)
	}
	if got.IncludeSourceHash == nil || *got.IncludeSourceHash != false {
		t.Fatalf("expected explicit false include_source_hash to be preserved")
	}
	if got.Apply.AllowCreateMissing == nil || *got.Apply.AllowCreateMissing != false {
		t.Fatalf("expected explicit false allow_create_missing to be preserved")
	}
	if got.Apply.ContinueOnError == nil || *got.Apply.ContinueOnError != false {
		t.Fatalf("expected explicit false continue_on_error to be preserved")
	}
	if got := localeOptionCodes(got.TargetLocales); strings.Join(got, ",") != "bo,zh" {
		t.Fatalf("expected source removed and target locales lower-cased, got %v", got)
	}
	if got := strings.Join(got.DefaultTargetLocales, ","); got != "bo" {
		t.Fatalf("expected invalid and source defaults removed, got %q", got)
	}
	if got := resourceOptionIDs(got.Resources); strings.Join(got, ",") != "Pages,ARCHIVE_ITEMS" {
		t.Fatalf("expected resource IDs preserved and deduped, got %v", got)
	}
	if got := strings.Join(got.DefaultResources, ","); got != "ARCHIVE_ITEMS" {
		t.Fatalf("expected invalid default resource removed, got %q", got)
	}
}

func TestNormalizeTranslationExchangeUIConfigRejectsInvalidSourceModes(t *testing.T) {
	for _, source := range []string{"", "none", "mixed"} {
		got := normalizeTranslationExchangeUIConfig(TranslationExchangeUIConfig{
			SourceLocale: source,
			SourceLocales: []TranslationExchangeLocaleOption{
				{Code: "none", Label: "None"},
				{Code: "mixed", Label: "Mixed"},
				{Code: ""},
			},
			TargetLocales: []TranslationExchangeLocaleOption{{Code: "bo"}},
		}, "EN", nil)
		if got.SourceLocale != "en" {
			t.Fatalf("expected invalid source %q to fall back to admin default en, got %+v", source, got)
		}
		if len(got.SourceLocales) != 1 || got.SourceLocales[0].Code != "en" {
			t.Fatalf("expected only admin default source option, got %+v", got.SourceLocales)
		}
	}
}

func TestNormalizeTranslationExchangeUIConfigRejectsInvalidTargetModes(t *testing.T) {
	got := normalizeTranslationExchangeUIConfig(TranslationExchangeUIConfig{
		SourceLocale: "en",
		TargetLocales: []TranslationExchangeLocaleOption{
			{Code: "none", Label: "None"},
			{Code: "mixed", Label: "Mixed"},
			{Code: "bo", Label: "BO"},
		},
		Resources: []TranslationExchangeResourceOption{{ID: "archive_items"}},
	}, "en", []string{"none", "mixed", "zh"})

	if got := strings.Join(localeOptionCodes(got.TargetLocales), ","); got != "bo" {
		t.Fatalf("expected sentinel target modes removed, got %q", got)
	}
	if got := strings.Join(got.DefaultTargetLocales, ","); got != "bo" {
		t.Fatalf("expected target defaults to exclude sentinel modes, got %q", got)
	}
}

func TestValidateTranslationExchangeExportFilterRejectsSentinelTargetModes(t *testing.T) {
	ui := TranslationExchangeUIConfig{
		Configured:    true,
		SourceLocale:  "en",
		SourceLocales: []TranslationExchangeLocaleOption{{Code: "en"}},
		TargetLocales: []TranslationExchangeLocaleOption{{Code: "none"}, {Code: "mixed"}, {Code: "bo"}},
		Resources:     []TranslationExchangeResourceOption{{ID: "archive_items"}},
	}

	_, err := validateTranslationExchangeExportFilter(admin.TranslationExportFilter{
		Resources:     []string{"archive_items"},
		SourceLocale:  "en",
		TargetLocales: []string{"none"},
	}, ui)
	if err == nil || !strings.Contains(errorDetail(err), "unsupported target locale") {
		t.Fatalf("expected unsupported sentinel target locale error, got %v", err)
	}
}
