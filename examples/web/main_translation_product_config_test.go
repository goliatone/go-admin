package main

import (
	"context"
	"testing"

	coreadmin "github.com/goliatone/go-admin/admin"
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
	t.Setenv("ADMIN_TRANSLATION_EXCHANGE", "")
	t.Setenv("ADMIN_TRANSLATION_QUEUE", "")

	cfg := buildTranslationProductConfig(
		quickstart.TranslationProfileFull,
		noopExchangeStore{},
		coreadmin.NewInMemoryTranslationAssignmentRepository(),
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
	t.Setenv("ADMIN_TRANSLATION_EXCHANGE", "false")
	t.Setenv("ADMIN_TRANSLATION_QUEUE", "")

	cfg := buildTranslationProductConfig(
		quickstart.TranslationProfileCoreExchange,
		noopExchangeStore{},
		coreadmin.NewInMemoryTranslationAssignmentRepository(),
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
	t.Setenv("ADMIN_TRANSLATION_EXCHANGE", "")
	t.Setenv("ADMIN_TRANSLATION_QUEUE", "true")

	cfg := buildTranslationProductConfig(
		quickstart.TranslationProfileCore,
		noopExchangeStore{},
		coreadmin.NewInMemoryTranslationAssignmentRepository(),
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

func TestResolveTranslationProfileParsesEnvironmentValues(t *testing.T) {
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
			t.Setenv("ADMIN_TRANSLATION_PROFILE", tc.envValue)
			profile := resolveTranslationProfile()
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
	)

	if cfg.SchemaVersion != quickstart.TranslationProductSchemaVersionCurrent {
		t.Fatalf("expected schema_version=%d, got %d",
			quickstart.TranslationProductSchemaVersionCurrent, cfg.SchemaVersion)
	}
}

func TestBuildTranslationProductConfigAttachesStoreAndRepository(t *testing.T) {
	exchangeStore := noopExchangeStore{}
	queueRepo := coreadmin.NewInMemoryTranslationAssignmentRepository()

	t.Setenv("ADMIN_TRANSLATION_EXCHANGE", "true")
	t.Setenv("ADMIN_TRANSLATION_QUEUE", "true")

	cfg := buildTranslationProductConfig(
		quickstart.TranslationProfileFull,
		exchangeStore,
		queueRepo,
	)

	if cfg.Exchange == nil || cfg.Exchange.Store == nil {
		t.Fatalf("expected exchange store to be attached")
	}
	if cfg.Queue == nil || cfg.Queue.Repository == nil {
		t.Fatalf("expected queue repository to be attached")
	}
}
