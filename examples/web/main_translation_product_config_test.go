package main

import (
	"context"
	"testing"

	coreadmin "github.com/goliatone/go-admin/admin"
	appcfg "github.com/goliatone/go-admin/examples/web/config"
	"github.com/goliatone/go-admin/quickstart"
)

type noopExchangeStore struct{}

func (noopExchangeStore) ExportRows(context.Context, coreadmin.TranslationExportFilter) ([]coreadmin.TranslationExchangeRow, error) {
	return nil, nil
}

func (noopExchangeStore) ResolveLinkage(context.Context, coreadmin.TranslationExchangeLinkageKey) (coreadmin.TranslationExchangeLinkage, error) {
	return coreadmin.TranslationExchangeLinkage{}, nil
}

func (noopExchangeStore) ApplyTranslation(context.Context, coreadmin.TranslationExchangeApplyRequest) error {
	return nil
}

func TestBuildTranslationProductConfigUsesProfileDefaults(t *testing.T) {
	cfg := buildTranslationProductConfig(
		quickstart.TranslationProfileFull,
		noopExchangeStore{},
		coreadmin.NewInMemoryTranslationAssignmentRepository(),
		appcfg.TranslationConfig{},
	)

	if cfg.Profile != quickstart.TranslationProfileFull {
		t.Fatalf("expected profile %q, got %q", quickstart.TranslationProfileFull, cfg.Profile)
	}
	if cfg.Exchange == nil || !cfg.Exchange.Enabled {
		t.Fatalf("expected exchange enabled for full profile")
	}
	if cfg.Queue == nil || !cfg.Queue.Enabled {
		t.Fatalf("expected queue enabled for full profile")
	}
}

func TestBuildTranslationProductConfigAllowsExplicitModuleDisableOverride(t *testing.T) {
	cfg := buildTranslationProductConfig(
		quickstart.TranslationProfileCoreExchange,
		noopExchangeStore{},
		coreadmin.NewInMemoryTranslationAssignmentRepository(),
		appcfg.TranslationConfig{
			Profile:  "core+exchange",
			Exchange: new(false),
		},
	)

	if cfg.Exchange == nil {
		t.Fatalf("expected exchange override config")
	}
	if cfg.Exchange.Enabled {
		t.Fatalf("expected exchange disabled by env override")
	}
	if cfg.Queue != nil {
		t.Fatalf("expected queue config nil for core+exchange profile")
	}
}

func TestBuildTranslationProductConfigAllowsExplicitModuleEnableOverride(t *testing.T) {
	cfg := buildTranslationProductConfig(
		quickstart.TranslationProfileCore,
		noopExchangeStore{},
		coreadmin.NewInMemoryTranslationAssignmentRepository(),
		appcfg.TranslationConfig{
			Profile: "core",
			Queue:   new(true),
		},
	)

	if cfg.Exchange != nil {
		t.Fatalf("expected exchange config nil for core profile")
	}
	if cfg.Queue == nil || !cfg.Queue.Enabled {
		t.Fatalf("expected queue enabled by env override")
	}
}

func TestTranslationProfileModuleDefaults(t *testing.T) {
	tests := []struct {
		profile         quickstart.TranslationProfile
		exchangeEnabled bool
		queueEnabled    bool
	}{
		{quickstart.TranslationProfileNone, false, false},
		{quickstart.TranslationProfileCore, false, false},
		{quickstart.TranslationProfileCoreExchange, true, false},
		{quickstart.TranslationProfileCoreQueue, false, true},
		{quickstart.TranslationProfileFull, true, true},
	}

	for _, tc := range tests {
		t.Run(string(tc.profile), func(t *testing.T) {
			exchangeEnabled, queueEnabled := translationProfileModuleDefaults(tc.profile)
			if exchangeEnabled != tc.exchangeEnabled {
				t.Fatalf("expected exchange=%t got %t", tc.exchangeEnabled, exchangeEnabled)
			}
			if queueEnabled != tc.queueEnabled {
				t.Fatalf("expected queue=%t got %t", tc.queueEnabled, queueEnabled)
			}
		})
	}
}

func TestResolveTranslationProfileParsesConfiguredValues(t *testing.T) {
	tests := []struct {
		envValue        string
		expectedProfile quickstart.TranslationProfile
	}{
		{"", quickstart.TranslationProfile("")},
		{"none", quickstart.TranslationProfileNone},
		{"NONE", quickstart.TranslationProfileNone},
		{"core", quickstart.TranslationProfileCore},
		{"CORE", quickstart.TranslationProfileCore},
		{"core+exchange", quickstart.TranslationProfileCoreExchange},
		{"CORE+EXCHANGE", quickstart.TranslationProfileCoreExchange},
		{"exchange", quickstart.TranslationProfileCoreExchange},
		{"core+queue", quickstart.TranslationProfileCoreQueue},
		{"queue", quickstart.TranslationProfileCoreQueue},
		{"full", quickstart.TranslationProfileFull},
		{"FULL", quickstart.TranslationProfileFull},
		{"unknown", quickstart.TranslationProfile("unknown")},
	}

	for _, tc := range tests {
		t.Run(tc.envValue, func(t *testing.T) {
			profile := resolveTranslationProfile(tc.envValue)
			if profile != tc.expectedProfile {
				t.Fatalf("expected profile %q, got %q", tc.expectedProfile, profile)
			}
		})
	}
}

func TestBuildTranslationProductConfigSchemaVersionIsSet(t *testing.T) {
	cfg := buildTranslationProductConfig(
		quickstart.TranslationProfileCore,
		noopExchangeStore{},
		coreadmin.NewInMemoryTranslationAssignmentRepository(),
		appcfg.TranslationConfig{},
	)

	if cfg.SchemaVersion != quickstart.TranslationProductSchemaVersionCurrent {
		t.Fatalf("expected schema_version=%d, got %d",
			quickstart.TranslationProductSchemaVersionCurrent, cfg.SchemaVersion)
	}
}

func TestBuildTranslationProductConfigAttachesStoreAndRepository(t *testing.T) {
	exchangeStore := noopExchangeStore{}
	queueRepo := coreadmin.NewInMemoryTranslationAssignmentRepository()

	cfg := buildTranslationProductConfig(
		quickstart.TranslationProfileFull,
		exchangeStore,
		queueRepo,
		appcfg.TranslationConfig{
			Profile:  "full",
			Exchange: new(true),
			Queue:    new(true),
		},
	)

	if cfg.Exchange == nil || cfg.Exchange.Store == nil {
		t.Fatalf("expected exchange store to be attached")
	}
	if cfg.Queue == nil || cfg.Queue.Repository == nil {
		t.Fatalf("expected queue repository to be attached")
	}
}

func TestBuildTranslationProductConfigEnablesQueueEnhancedFilterSelects(t *testing.T) {
	cfg := buildTranslationProductConfig(
		quickstart.TranslationProfileFull,
		noopExchangeStore{},
		coreadmin.NewInMemoryTranslationAssignmentRepository(),
		appcfg.TranslationConfig{
			Profile: "full",
			Queue:   new(true),
		},
	)

	if cfg.Queue == nil {
		t.Fatalf("expected queue config")
	}
	if !cfg.Queue.EnhancedFilterSelects {
		t.Fatalf("expected example queue config to enable enhanced filter selects")
	}
}

func TestBuildTranslationProductConfigMapsExchangeUIRuntimeConfig(t *testing.T) {
	includeExamples := false
	cfg := buildTranslationProductConfig(
		quickstart.TranslationProfileCoreExchange,
		noopExchangeStore{},
		coreadmin.NewInMemoryTranslationAssignmentRepository(),
		appcfg.TranslationConfig{
			Profile: "core+exchange",
			ExchangeUI: appcfg.TranslationExchangeUIConfig{
				SourceLocale: "en",
				TargetLocales: []quickstart.TranslationExchangeLocaleOption{
					{Code: "bo", Label: "BO"},
					{Code: "zh", Label: "ZH"},
				},
				Resources: []quickstart.TranslationExchangeResourceOption{
					{ID: "archive_items", Label: "Archive items"},
				},
				DefaultTargetLocales: []string{"bo"},
				IncludeExamples:      &includeExamples,
			},
		},
	)

	if cfg.Exchange == nil {
		t.Fatalf("expected exchange config")
	}
	ui := cfg.Exchange.UI
	if ui.SourceLocale != "en" {
		t.Fatalf("expected source locale en, got %q", ui.SourceLocale)
	}
	if len(ui.TargetLocales) != 2 || ui.TargetLocales[0].Code != "bo" || ui.TargetLocales[1].Code != "zh" {
		t.Fatalf("expected bo/zh target locales, got %+v", ui.TargetLocales)
	}
	if len(ui.Resources) != 1 || ui.Resources[0].ID != "archive_items" {
		t.Fatalf("expected archive resource, got %+v", ui.Resources)
	}
	if ui.IncludeExamples == nil || *ui.IncludeExamples != false {
		t.Fatalf("expected explicit false include_examples to be preserved")
	}
}

func TestBuildTranslationProductConfigLeavesExchangeUIEmptyByDefault(t *testing.T) {
	cfg := buildTranslationProductConfig(
		quickstart.TranslationProfileCoreExchange,
		noopExchangeStore{},
		coreadmin.NewInMemoryTranslationAssignmentRepository(),
		appcfg.TranslationConfig{Profile: "core+exchange"},
	)
	if cfg.Exchange == nil {
		t.Fatalf("expected exchange config")
	}
	if cfg.Exchange.UI.SourceLocale != "" || len(cfg.Exchange.UI.Resources) != 0 || len(cfg.Exchange.UI.TargetLocales) != 0 {
		t.Fatalf("expected example config to keep exchange UI fallback path by default, got %+v", cfg.Exchange.UI)
	}
}

//go:fix inline
func boolPtr(v bool) *bool {
	return new(v)
}
