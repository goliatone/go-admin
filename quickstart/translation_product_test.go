package quickstart

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"testing"

	"github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-command/dispatcher"
	"github.com/goliatone/go-command/registry"
	urlkit "github.com/goliatone/go-urlkit"
)

func TestWithTranslationProfileSetsProductConfig(t *testing.T) {
	opts := &adminOptions{}
	WithTranslationProfile(TranslationProfileFull)(opts)
	if !opts.translationProductConfigSet {
		t.Fatalf("expected translation product config marked as set")
	}
	if opts.translationProductConfig.Profile != TranslationProfileFull {
		t.Fatalf("expected profile %q, got %q", TranslationProfileFull, opts.translationProductConfig.Profile)
	}
}

func TestBuildTranslationProductResolutionDefaultsToCoreWhenCMSEnabled(t *testing.T) {
	resolved, err := buildTranslationProductResolution(NewAdminConfig("", "", ""), adminOptions{
		translationProductConfigSet: true,
		translationProductConfig:    TranslationProductConfig{},
	})
	if err != nil {
		t.Fatalf("buildTranslationProductResolution error: %v", err)
	}
	if resolved.Config.Profile != TranslationProfileCore {
		t.Fatalf("expected default profile core, got %q", resolved.Config.Profile)
	}
	if resolved.Config.SchemaVersion != TranslationProductSchemaVersionCurrent {
		t.Fatalf("expected schema version %d, got %d", TranslationProductSchemaVersionCurrent, resolved.Config.SchemaVersion)
	}
}

func TestBuildTranslationProductResolutionDefaultsToNoneWhenCMSDisabled(t *testing.T) {
	resolved, err := buildTranslationProductResolution(NewAdminConfig("", "", ""), adminOptions{
		featureDefaults: map[string]bool{
			"cms": false,
		},
		translationProductConfigSet: true,
		translationProductConfig:    TranslationProductConfig{},
	})
	if err != nil {
		t.Fatalf("buildTranslationProductResolution error: %v", err)
	}
	if resolved.Config.Profile != TranslationProfileNone {
		t.Fatalf("expected default profile none when cms disabled, got %q", resolved.Config.Profile)
	}
}

func TestBuildTranslationProductResolutionRejectsUnknownProfile(t *testing.T) {
	_, err := buildTranslationProductResolution(NewAdminConfig("", "", ""), adminOptions{
		translationProductConfigSet: true,
		translationProductConfig: TranslationProductConfig{
			Profile: TranslationProfile("unknown"),
		},
	})
	if err == nil {
		t.Fatalf("expected unknown profile error")
	}
	if !errors.Is(err, ErrTranslationProductConfig) {
		t.Fatalf("expected ErrTranslationProductConfig, got %v", err)
	}
}

func TestBuildTranslationProductResolutionRejectsUnsupportedSchemaVersion(t *testing.T) {
	_, err := buildTranslationProductResolution(NewAdminConfig("", "", ""), adminOptions{
		translationProductConfigSet: true,
		translationProductConfig: TranslationProductConfig{
			SchemaVersion: TranslationProductSchemaVersionCurrent + 1,
		},
	})
	if err == nil {
		t.Fatalf("expected unsupported schema version error")
	}
	if !errors.Is(err, ErrTranslationProductConfig) {
		t.Fatalf("expected ErrTranslationProductConfig, got %v", err)
	}
}

func TestNewAdminTranslationProfileCoreExchangeRequiresHandlers(t *testing.T) {
	cfg := NewAdminConfig("", "", "")
	_, _, err := NewAdmin(cfg, AdapterHooks{}, WithTranslationProfile(TranslationProfileCoreExchange))
	if err == nil {
		t.Fatalf("expected translation product config error for missing exchange handlers")
	}
	if !errors.Is(err, ErrTranslationProductConfig) {
		t.Fatalf("expected ErrTranslationProductConfig, got %v", err)
	}
}

func TestNewAdminTranslationProfileRequiresCMSFeature(t *testing.T) {
	cfg := NewAdminConfig("", "", "")
	_, _, err := NewAdmin(
		cfg,
		AdapterHooks{},
		WithFeatureDefaults(map[string]bool{"cms": false}),
		WithTranslationProfile(TranslationProfileCore),
	)
	if err == nil {
		t.Fatalf("expected translation product config error when cms feature disabled")
	}
	if !errors.Is(err, ErrTranslationProductConfig) {
		t.Fatalf("expected ErrTranslationProductConfig, got %v", err)
	}
}

func TestNewAdminTranslationProductConfigEnablesQueueProfile(t *testing.T) {
	t.Cleanup(func() { _ = registry.Stop(context.Background()) })
	cfg := NewAdminConfig("", "", "")

	adm, _, err := NewAdmin(cfg, AdapterHooks{}, WithTranslationProductConfig(TranslationProductConfig{
		Profile: TranslationProfileCoreQueue,
		Queue: &TranslationQueueConfig{
			Enabled:          true,
			SupportedLocales: []string{"en", "es"},
		},
	}))
	if err != nil {
		t.Fatalf("NewAdmin error: %v", err)
	}
	if adm.Commands() != nil {
		t.Cleanup(adm.Commands().Reset)
	}
	if _, ok := adm.Registry().Panel("translations"); !ok {
		t.Fatalf("expected translation queue panel registration")
	}
	if binding := adm.BootTranslationExchange(); binding != nil {
		t.Fatalf("expected translation exchange to remain disabled")
	}
}

func TestNewAdminTranslationProductConfigOverrideDisablesQueueModule(t *testing.T) {
	t.Cleanup(func() { _ = registry.Stop(context.Background()) })
	cfg := NewAdminConfig("", "", "")

	adm, _, err := NewAdmin(cfg, AdapterHooks{}, WithTranslationProductConfig(TranslationProductConfig{
		Profile: TranslationProfileFull,
		Exchange: &TranslationExchangeConfig{
			Enabled: true,
			Store:   &stubQuickstartTranslationExchangeStore{},
		},
		Queue: &TranslationQueueConfig{Enabled: false},
	}))
	if err != nil {
		t.Fatalf("NewAdmin error: %v", err)
	}
	if adm.Commands() != nil {
		t.Cleanup(adm.Commands().Reset)
	}
	if binding := adm.BootTranslationExchange(); binding == nil {
		t.Fatalf("expected translation exchange to be enabled")
	}
	if _, ok := adm.Registry().Panel("translations"); ok {
		t.Fatalf("expected translation queue panel to be disabled by override")
	}
}

func TestNewAdminTranslationProductConfigLegacyOverridesTakePrecedence(t *testing.T) {
	t.Cleanup(func() { _ = registry.Stop(context.Background()) })
	cfg := NewAdminConfig("", "", "")

	adm, _, err := NewAdmin(
		cfg,
		AdapterHooks{},
		WithTranslationProductConfig(TranslationProductConfig{Profile: TranslationProfileNone}),
		WithTranslationQueueConfig(TranslationQueueConfig{
			Enabled:          true,
			SupportedLocales: []string{"en", "es"},
		}),
	)
	if err != nil {
		t.Fatalf("NewAdmin error: %v", err)
	}
	if adm.Commands() != nil {
		t.Cleanup(adm.Commands().Reset)
	}
	if _, ok := adm.Registry().Panel("translations"); !ok {
		t.Fatalf("expected legacy queue config to override profile none")
	}
	caps := TranslationCapabilities(adm)
	modules, _ := caps["modules"].(map[string]any)
	queue, _ := modules["queue"].(map[string]any)
	if enabled, _ := queue["enabled"].(bool); !enabled {
		t.Fatalf("expected queue capability enabled after legacy override")
	}
	warnings, _ := caps["warnings"].([]string)
	found := false
	for _, warning := range warnings {
		if warning == translationProductLegacyOverrideWarning {
			found = true
			break
		}
	}
	if !found {
		t.Fatalf("expected legacy override warning in capabilities, got %v", warnings)
	}
}

func TestNewAdminTranslationProductConfigPublishesCapabilityMetadata(t *testing.T) {
	t.Cleanup(func() { _ = registry.Stop(context.Background()) })
	cfg := NewAdminConfig("", "", "")

	adm, _, err := NewAdmin(cfg, AdapterHooks{}, WithTranslationProductConfig(TranslationProductConfig{
		Profile: TranslationProfileFull,
		Exchange: &TranslationExchangeConfig{
			Enabled: true,
			Store:   &stubQuickstartTranslationExchangeStore{},
		},
		Queue: &TranslationQueueConfig{
			Enabled:          true,
			SupportedLocales: []string{"en", "es"},
		},
	}))
	if err != nil {
		t.Fatalf("NewAdmin error: %v", err)
	}
	if adm.Commands() != nil {
		t.Cleanup(adm.Commands().Reset)
	}

	caps := TranslationCapabilities(adm)
	if got := strings.TrimSpace(fmt.Sprint(caps["profile"])); got != string(TranslationProfileFull) {
		t.Fatalf("expected profile %q, got %q", TranslationProfileFull, got)
	}
	modules, _ := caps["modules"].(map[string]any)
	exchange, _ := modules["exchange"].(map[string]any)
	if enabled, _ := exchange["enabled"].(bool); !enabled {
		t.Fatalf("expected exchange capability enabled")
	}
	queue, _ := modules["queue"].(map[string]any)
	if enabled, _ := queue["enabled"].(bool); !enabled {
		t.Fatalf("expected queue capability enabled")
	}
	resolverKeys, _ := caps["resolver_keys"].([]string)
	hasExportRoute := false
	for _, key := range resolverKeys {
		if strings.Contains(key, "translations.export") {
			hasExportRoute = true
			break
		}
	}
	if !hasExportRoute {
		t.Fatalf("expected translations.export resolver key, got %v", resolverKeys)
	}
}

// Contract tests for productized quickstart options/profiles

func TestBuildTranslationProductResolutionRejectsNegativeSchemaVersion(t *testing.T) {
	_, err := buildTranslationProductResolution(NewAdminConfig("", "", ""), adminOptions{
		translationProductConfigSet: true,
		translationProductConfig: TranslationProductConfig{
			SchemaVersion: -1,
		},
	})
	if err == nil {
		t.Fatalf("expected negative schema version error")
	}
	if !errors.Is(err, ErrTranslationProductConfig) {
		t.Fatalf("expected ErrTranslationProductConfig, got %v", err)
	}
	var cfgErr translationProductConfigError
	if !errors.As(err, &cfgErr) {
		t.Fatalf("expected translationProductConfigError, got %T", err)
	}
	if cfgErr.Code != "translation.productization.schema.invalid" {
		t.Fatalf("expected schema.invalid error code, got %s", cfgErr.Code)
	}
}

func TestNewAdminTranslationDisabledModuleDoesNotRegisterRoutes(t *testing.T) {
	t.Cleanup(func() { _ = registry.Stop(context.Background()) })
	cfg := NewAdminConfig("", "", "")

	// Profile Core should not register exchange or queue routes
	adm, _, err := NewAdmin(cfg, AdapterHooks{}, WithTranslationProfile(TranslationProfileCore))
	if err != nil {
		t.Fatalf("NewAdmin error: %v", err)
	}
	if adm.Commands() != nil {
		t.Cleanup(adm.Commands().Reset)
	}

	// Exchange should not be registered
	if binding := adm.BootTranslationExchange(); binding != nil {
		t.Fatalf("expected exchange binding nil for core profile")
	}

	// Queue panel should not be registered
	if _, ok := adm.Registry().Panel("translations"); ok {
		t.Fatalf("expected no translations panel for core profile")
	}

	// Capabilities should show modules disabled
	caps := TranslationCapabilities(adm)
	modules, _ := caps["modules"].(map[string]any)

	exchange, _ := modules["exchange"].(map[string]any)
	if enabled, _ := exchange["enabled"].(bool); enabled {
		t.Fatalf("expected exchange capability disabled for core profile")
	}

	queue, _ := modules["queue"].(map[string]any)
	if enabled, _ := queue["enabled"].(bool); enabled {
		t.Fatalf("expected queue capability disabled for core profile")
	}
}

func TestNewAdminTranslationProductConfigProfileResolutionPrecedence(t *testing.T) {
	t.Cleanup(func() { _ = registry.Stop(context.Background()) })
	cfg := NewAdminConfig("", "", "")

	// Test: Profile + Module Override + Legacy Option precedence
	// Profile=core+queue should enable queue
	// Queue override should disable it
	adm, _, err := NewAdmin(cfg, AdapterHooks{}, WithTranslationProductConfig(TranslationProductConfig{
		Profile: TranslationProfileCoreQueue,
		Queue:   &TranslationQueueConfig{Enabled: false}, // override
	}))
	if err != nil {
		t.Fatalf("NewAdmin error: %v", err)
	}
	if adm.Commands() != nil {
		t.Cleanup(adm.Commands().Reset)
	}

	// Queue should be disabled by override even though profile enables it
	if _, ok := adm.Registry().Panel("translations"); ok {
		t.Fatalf("expected queue panel disabled by module override")
	}

	caps := TranslationCapabilities(adm)
	modules, _ := caps["modules"].(map[string]any)
	queue, _ := modules["queue"].(map[string]any)
	if enabled, _ := queue["enabled"].(bool); enabled {
		t.Fatalf("expected queue module disabled by override")
	}
}

func TestNewAdminTranslationProductConfigDependencyValidationQueue(t *testing.T) {
	cfg := NewAdminConfig("", "", "")

	// Queue requires locales - should fail without supported_locales and no policy
	_, _, err := NewAdmin(cfg, AdapterHooks{}, WithTranslationProductConfig(TranslationProductConfig{
		Profile: TranslationProfileCoreQueue,
		Queue:   &TranslationQueueConfig{Enabled: true},
	}))
	if err == nil {
		t.Fatalf("expected queue config error for missing locales")
	}
	if !errors.Is(err, ErrTranslationProductConfig) {
		t.Fatalf("expected ErrTranslationProductConfig, got %v", err)
	}
	var cfgErr translationProductConfigError
	if !errors.As(err, &cfgErr) {
		t.Fatalf("expected translationProductConfigError, got %T", err)
	}
	if cfgErr.Code != "translation.productization.queue.locales_invalid" {
		t.Fatalf("expected queue.locales_invalid error code, got %s", cfgErr.Code)
	}
}

func TestNewAdminTranslationProductConfigDependencyValidationExchange(t *testing.T) {
	cfg := NewAdminConfig("", "", "")

	// Exchange requires handlers - should fail without Store or Exporter/Validator/Applier
	_, _, err := NewAdmin(cfg, AdapterHooks{}, WithTranslationProductConfig(TranslationProductConfig{
		Profile: TranslationProfileCoreExchange,
		Exchange: &TranslationExchangeConfig{
			Enabled: true,
			// No handlers provided
		},
	}))
	if err == nil {
		t.Fatalf("expected exchange config error for missing handlers")
	}
	if !errors.Is(err, ErrTranslationProductConfig) {
		t.Fatalf("expected ErrTranslationProductConfig, got %v", err)
	}
	var cfgErr translationProductConfigError
	if !errors.As(err, &cfgErr) {
		t.Fatalf("expected translationProductConfigError, got %T", err)
	}
	if cfgErr.Code != "translation.productization.exchange.handlers_missing" {
		t.Fatalf("expected exchange.handlers_missing error code, got %s", cfgErr.Code)
	}
}

func TestTranslationProductErrorPayloadStructure(t *testing.T) {
	err := newTranslationProductConfigError(
		"test.error.code",
		"test error reason",
		"test hint",
		[]string{"check1", "check2"},
		nil,
	)

	payload := translationProductErrorPayload(err)

	if payload["error_code"] != "test.error.code" {
		t.Fatalf("expected error_code 'test.error.code', got %v", payload["error_code"])
	}
	if payload["error_message"] != "test error reason" {
		t.Fatalf("expected error_message 'test error reason', got %v", payload["error_message"])
	}
	if payload["hint"] != "test hint" {
		t.Fatalf("expected hint 'test hint', got %v", payload["hint"])
	}
	failedChecks, _ := payload["failed_checks"].([]string)
	if len(failedChecks) != 2 {
		t.Fatalf("expected 2 failed_checks, got %v", failedChecks)
	}
}

func TestTranslationProfileAllValidProfilesAccepted(t *testing.T) {
	validProfiles := []TranslationProfile{
		TranslationProfileNone,
		TranslationProfileCore,
		TranslationProfileCoreExchange,
		TranslationProfileCoreQueue,
		TranslationProfileFull,
	}

	for _, profile := range validProfiles {
		resolved, err := resolveTranslationProfile(profile, true)
		if err != nil {
			t.Fatalf("expected profile %q to be valid, got error: %v", profile, err)
		}
		if resolved != profile {
			t.Fatalf("expected resolved profile %q, got %q", profile, resolved)
		}
	}
}

func TestTranslationProfileDefaultsToCoreWithCMSEnabled(t *testing.T) {
	resolved, err := resolveTranslationProfile("", true)
	if err != nil {
		t.Fatalf("expected no error for empty profile with cms enabled, got: %v", err)
	}
	if resolved != TranslationProfileCore {
		t.Fatalf("expected default profile core with cms enabled, got %q", resolved)
	}
}

func TestTranslationProfileDefaultsToNoneWithCMSDisabled(t *testing.T) {
	resolved, err := resolveTranslationProfile("", false)
	if err != nil {
		t.Fatalf("expected no error for empty profile with cms disabled, got: %v", err)
	}
	if resolved != TranslationProfileNone {
		t.Fatalf("expected default profile none with cms disabled, got %q", resolved)
	}
}

// Data-retention behavior tests for module disable/re-enable flows

func TestTranslationQueueDisableRetainsPersistedData(t *testing.T) {
	t.Cleanup(func() { _ = registry.Stop(context.Background()) })

	// Create a shared repository with pre-existing data
	repo := admin.NewInMemoryTranslationAssignmentRepository()
	ctx := context.Background()
	created, err := repo.Create(ctx, admin.TranslationAssignment{
		TranslationGroupID: "tg_data_retention",
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

	cfg := NewAdminConfig("", "", "")

	// First: Enable queue module with shared repo
	adm1, _, err := NewAdmin(cfg, AdapterHooks{}, WithTranslationQueueConfig(TranslationQueueConfig{
		Enabled:          true,
		SupportedLocales: []string{"en", "es"},
		Repository:       repo,
	}))
	if err != nil {
		t.Fatalf("NewAdmin with queue enabled: %v", err)
	}
	if adm1.Commands() != nil {
		t.Cleanup(adm1.Commands().Reset)
	}

	// Verify queue panel exists and can access data
	if _, ok := adm1.Registry().Panel("translations"); !ok {
		t.Fatalf("expected translations panel when queue enabled")
	}

	// Verify assignment is accessible
	found, err := repo.Get(ctx, created.ID)
	if err != nil {
		t.Fatalf("get assignment: %v", err)
	}
	if found.TranslationGroupID != "tg_data_retention" {
		t.Fatalf("expected assignment group ID, got %s", found.TranslationGroupID)
	}

	// Second: Disable queue module (simulating config change)
	adm2, _, err := NewAdmin(cfg, AdapterHooks{}, WithTranslationQueueConfig(TranslationQueueConfig{
		Enabled: false,
	}))
	if err != nil {
		t.Fatalf("NewAdmin with queue disabled: %v", err)
	}
	if adm2.Commands() != nil {
		t.Cleanup(adm2.Commands().Reset)
	}

	// Verify queue panel is NOT registered when disabled
	if _, ok := adm2.Registry().Panel("translations"); ok {
		t.Fatalf("expected no translations panel when queue disabled")
	}

	// Verify data still exists in the shared repository
	found2, err := repo.Get(ctx, created.ID)
	if err != nil {
		t.Fatalf("get assignment after disable: %v", err)
	}
	if found2.TranslationGroupID != "tg_data_retention" {
		t.Fatalf("data retention: expected assignment to persist after module disable")
	}

	// Third: Re-enable queue module with same repo
	adm3, _, err := NewAdmin(cfg, AdapterHooks{}, WithTranslationQueueConfig(TranslationQueueConfig{
		Enabled:          true,
		SupportedLocales: []string{"en", "es"},
		Repository:       repo,
	}))
	if err != nil {
		t.Fatalf("NewAdmin with queue re-enabled: %v", err)
	}
	if adm3.Commands() != nil {
		t.Cleanup(adm3.Commands().Reset)
	}

	// Verify queue panel is back
	if _, ok := adm3.Registry().Panel("translations"); !ok {
		t.Fatalf("expected translations panel after queue re-enable")
	}

	// Verify data is accessible after re-enable
	found3, err := repo.Get(ctx, created.ID)
	if err != nil {
		t.Fatalf("get assignment after re-enable: %v", err)
	}
	if found3.TranslationGroupID != "tg_data_retention" {
		t.Fatalf("data access: expected assignment accessible after re-enable")
	}
}

func TestTranslationQueueDisableRemovesRuntimeExposure(t *testing.T) {
	t.Cleanup(func() { _ = registry.Stop(context.Background()) })
	cfg := NewAdminConfig("", "", "")

	// Enable queue
	adm1, _, err := NewAdmin(cfg, AdapterHooks{}, WithTranslationQueueConfig(TranslationQueueConfig{
		Enabled:          true,
		SupportedLocales: []string{"en", "es"},
	}))
	if err != nil {
		t.Fatalf("NewAdmin with queue enabled: %v", err)
	}
	if adm1.Commands() != nil {
		t.Cleanup(adm1.Commands().Reset)
	}

	// Verify runtime exposure when enabled
	caps1 := TranslationCapabilities(adm1)
	modules1, _ := caps1["modules"].(map[string]any)
	queue1, _ := modules1["queue"].(map[string]any)
	if enabled, _ := queue1["enabled"].(bool); !enabled {
		t.Fatalf("expected queue module enabled in capabilities")
	}
	if _, ok := adm1.Registry().Panel("translations"); !ok {
		t.Fatalf("expected translations panel registered")
	}

	// Disable queue
	adm2, _, err := NewAdmin(cfg, AdapterHooks{}, WithTranslationQueueConfig(TranslationQueueConfig{
		Enabled: false,
	}))
	if err != nil {
		t.Fatalf("NewAdmin with queue disabled: %v", err)
	}
	if adm2.Commands() != nil {
		t.Cleanup(adm2.Commands().Reset)
	}

	// Verify runtime exposure removed when disabled
	caps2 := TranslationCapabilities(adm2)
	modules2, _ := caps2["modules"].(map[string]any)
	queue2, _ := modules2["queue"].(map[string]any)
	if enabled, _ := queue2["enabled"].(bool); enabled {
		t.Fatalf("expected queue module disabled in capabilities")
	}
	if _, ok := adm2.Registry().Panel("translations"); ok {
		t.Fatalf("expected no translations panel when disabled")
	}
}

func TestTranslationProductQueueProfileDisableRetainsDataAndReEnableRestoresAccess(t *testing.T) {
	t.Cleanup(func() { _ = registry.Stop(context.Background()) })
	ctx := context.Background()
	repo := admin.NewInMemoryTranslationAssignmentRepository()
	created, err := repo.Create(ctx, admin.TranslationAssignment{
		TranslationGroupID: "tg_profile_retention",
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
	cfg := NewAdminConfig("", "", "")

	enabled, _, err := NewAdmin(cfg, AdapterHooks{}, WithTranslationProductConfig(TranslationProductConfig{
		Profile: TranslationProfileCoreQueue,
		Queue: &TranslationQueueConfig{
			Enabled:          true,
			SupportedLocales: []string{"en", "es"},
			Repository:       repo,
		},
	}))
	if err != nil {
		t.Fatalf("NewAdmin enabled: %v", err)
	}
	if enabled.Commands() != nil {
		t.Cleanup(enabled.Commands().Reset)
	}
	if _, ok := enabled.Registry().Panel("translations"); !ok {
		t.Fatalf("expected queue panel when enabled")
	}

	disabled, _, err := NewAdmin(cfg, AdapterHooks{}, WithTranslationProductConfig(TranslationProductConfig{
		Profile: TranslationProfileCoreQueue,
		Queue: &TranslationQueueConfig{
			Enabled:          false,
			SupportedLocales: []string{"en", "es"},
			Repository:       repo,
		},
	}))
	if err != nil {
		t.Fatalf("NewAdmin disabled: %v", err)
	}
	if disabled.Commands() != nil {
		t.Cleanup(disabled.Commands().Reset)
	}
	if _, ok := disabled.Registry().Panel("translations"); ok {
		t.Fatalf("expected no queue panel when disabled")
	}
	if _, err := repo.Get(ctx, created.ID); err != nil {
		t.Fatalf("expected assignment to persist while disabled: %v", err)
	}

	reenabled, _, err := NewAdmin(cfg, AdapterHooks{}, WithTranslationProductConfig(TranslationProductConfig{
		Profile: TranslationProfileCoreQueue,
		Queue: &TranslationQueueConfig{
			Enabled:          true,
			SupportedLocales: []string{"en", "es"},
			Repository:       repo,
		},
	}))
	if err != nil {
		t.Fatalf("NewAdmin re-enabled: %v", err)
	}
	if reenabled.Commands() != nil {
		t.Cleanup(reenabled.Commands().Reset)
	}
	if _, ok := reenabled.Registry().Panel("translations"); !ok {
		t.Fatalf("expected queue panel after re-enable")
	}
	if _, err := repo.Get(ctx, created.ID); err != nil {
		t.Fatalf("expected assignment to remain accessible after re-enable: %v", err)
	}
}

func TestTranslationProductExchangeProfileDisableRetainsDataAndReEnableRestoresAccess(t *testing.T) {
	t.Cleanup(func() { _ = registry.Stop(context.Background()) })
	store := &stubQuickstartTranslationExchangeStore{
		exportRows: []admin.TranslationExchangeRow{
			{
				Resource:           "pages",
				EntityID:           "page_1",
				TranslationGroupID: "tg_exchange_retention",
				TargetLocale:       "es",
				FieldPath:          "title",
			},
		},
	}
	cfg := NewAdminConfig("", "", "")

	enabled, _, err := NewAdmin(cfg, AdapterHooks{}, WithTranslationProductConfig(TranslationProductConfig{
		Profile: TranslationProfileCoreExchange,
		Exchange: &TranslationExchangeConfig{
			Enabled: true,
			Store:   store,
		},
	}))
	if err != nil {
		t.Fatalf("NewAdmin enabled: %v", err)
	}
	if enabled.Commands() != nil {
		t.Cleanup(enabled.Commands().Reset)
	}
	if enabled.BootTranslationExchange() == nil {
		t.Fatalf("expected exchange binding when enabled")
	}

	disabled, _, err := NewAdmin(cfg, AdapterHooks{}, WithTranslationProductConfig(TranslationProductConfig{
		Profile: TranslationProfileCoreExchange,
		Exchange: &TranslationExchangeConfig{
			Enabled: false,
			Store:   store,
		},
	}))
	if err != nil {
		t.Fatalf("NewAdmin disabled: %v", err)
	}
	if disabled.Commands() != nil {
		t.Cleanup(disabled.Commands().Reset)
	}
	if disabled.BootTranslationExchange() != nil {
		t.Fatalf("expected no exchange binding when disabled")
	}
	if len(store.exportRows) != 1 {
		t.Fatalf("expected store data retained while exchange disabled")
	}

	reenabled, _, err := NewAdmin(cfg, AdapterHooks{}, WithTranslationProductConfig(TranslationProductConfig{
		Profile: TranslationProfileCoreExchange,
		Exchange: &TranslationExchangeConfig{
			Enabled: true,
			Store:   store,
		},
	}))
	if err != nil {
		t.Fatalf("NewAdmin re-enabled: %v", err)
	}
	if reenabled.Commands() != nil {
		t.Cleanup(reenabled.Commands().Reset)
	}
	if reenabled.BootTranslationExchange() == nil {
		t.Fatalf("expected exchange binding after re-enable")
	}

	out := admin.TranslationExportResult{}
	if err := dispatcher.Dispatch(context.Background(), admin.TranslationExportInput{
		Filter: admin.TranslationExportFilter{
			Resources: []string{"pages"},
		},
		Output: &out,
	}); err != nil {
		t.Fatalf("dispatch export after re-enable: %v", err)
	}
	if out.RowCount != 1 {
		t.Fatalf("expected retained export rows after re-enable, got %d", out.RowCount)
	}
}

// Schema-version compatibility tests

func TestSchemaVersionDefaultsToCurrentWhenZero(t *testing.T) {
	version, err := normalizeTranslationProductSchemaVersion(0)
	if err != nil {
		t.Fatalf("expected no error for schema_version 0, got: %v", err)
	}
	if version != TranslationProductSchemaVersionCurrent {
		t.Fatalf("expected default schema_version %d, got %d",
			TranslationProductSchemaVersionCurrent, version)
	}
}

func TestSchemaVersionAcceptsCurrentVersion(t *testing.T) {
	version, err := normalizeTranslationProductSchemaVersion(TranslationProductSchemaVersionCurrent)
	if err != nil {
		t.Fatalf("expected no error for current schema_version, got: %v", err)
	}
	if version != TranslationProductSchemaVersionCurrent {
		t.Fatalf("expected schema_version %d, got %d",
			TranslationProductSchemaVersionCurrent, version)
	}
}

func TestSchemaVersionRejectsNegativeValues(t *testing.T) {
	_, err := normalizeTranslationProductSchemaVersion(-1)
	if err == nil {
		t.Fatal("expected error for negative schema_version")
	}
	if !errors.Is(err, ErrTranslationProductConfig) {
		t.Fatalf("expected ErrTranslationProductConfig, got: %v", err)
	}
	var cfgErr translationProductConfigError
	if !errors.As(err, &cfgErr) {
		t.Fatalf("expected translationProductConfigError, got: %T", err)
	}
	if cfgErr.Code != "translation.productization.schema.invalid" {
		t.Fatalf("expected schema.invalid error code, got: %s", cfgErr.Code)
	}
}

func TestSchemaVersionRejectsFutureMajorVersions(t *testing.T) {
	futureVersion := TranslationProductSchemaVersionCurrent + 1
	_, err := normalizeTranslationProductSchemaVersion(futureVersion)
	if err == nil {
		t.Fatal("expected error for future schema_version")
	}
	if !errors.Is(err, ErrTranslationProductConfig) {
		t.Fatalf("expected ErrTranslationProductConfig, got: %v", err)
	}
	var cfgErr translationProductConfigError
	if !errors.As(err, &cfgErr) {
		t.Fatalf("expected translationProductConfigError, got: %T", err)
	}
	if cfgErr.Code != "translation.productization.schema.unsupported" {
		t.Fatalf("expected schema.unsupported error code, got: %s", cfgErr.Code)
	}
}

func TestSchemaVersionUpConversionFromSupportedOlderVersions(t *testing.T) {
	// Currently schema_version 1 is the only version, so all versions < current
	// that are > 0 would be "older supported versions" - but since 1 is minimum,
	// this test documents the expected behavior for future versions.
	//
	// When TranslationProductSchemaVersionCurrent becomes 2:
	// - version 1 should up-convert to 2 (apply migration)
	// - version 0 should default to 2
	// - version 3 should error (future unsupported)

	// For now, test that version 1 (current) passes through unchanged
	version, err := normalizeTranslationProductSchemaVersion(1)
	if err != nil {
		t.Fatalf("expected schema_version 1 to be accepted, got: %v", err)
	}
	if version != 1 {
		t.Fatalf("expected schema_version 1 unchanged, got: %d", version)
	}
}

func TestNewAdminSchemaVersionIncludedInCapabilities(t *testing.T) {
	t.Cleanup(func() { _ = registry.Stop(context.Background()) })
	cfg := NewAdminConfig("", "", "")

	adm, _, err := NewAdmin(cfg, AdapterHooks{}, WithTranslationProductConfig(TranslationProductConfig{
		Profile:       TranslationProfileCore,
		SchemaVersion: TranslationProductSchemaVersionCurrent,
	}))
	if err != nil {
		t.Fatalf("NewAdmin error: %v", err)
	}
	if adm.Commands() != nil {
		t.Cleanup(adm.Commands().Reset)
	}

	caps := TranslationCapabilities(adm)
	schemaVersion, ok := caps["schema_version"].(int)
	if !ok {
		t.Fatalf("expected schema_version in capabilities, got: %v", caps["schema_version"])
	}
	if schemaVersion != TranslationProductSchemaVersionCurrent {
		t.Fatalf("expected schema_version %d in capabilities, got: %d",
			TranslationProductSchemaVersionCurrent, schemaVersion)
	}
}

func TestNewAdminSchemaVersionZeroAddsUpconversionWarning(t *testing.T) {
	t.Cleanup(func() { _ = registry.Stop(context.Background()) })
	cfg := NewAdminConfig("", "", "")

	adm, _, err := NewAdmin(cfg, AdapterHooks{}, WithTranslationProductConfig(TranslationProductConfig{
		Profile:       TranslationProfileCore,
		SchemaVersion: 0,
	}))
	if err != nil {
		t.Fatalf("NewAdmin error: %v", err)
	}
	if adm.Commands() != nil {
		t.Cleanup(adm.Commands().Reset)
	}

	caps := TranslationCapabilities(adm)
	warnings, _ := caps["warnings"].([]string)
	found := false
	for _, warning := range warnings {
		if warning == translationProductSchemaUpconvertWarning {
			found = true
			break
		}
	}
	if !found {
		t.Fatalf("expected schema upconversion warning, got %v", warnings)
	}
}

// Feature flag interaction matrix tests

func TestFeatureFlagInteractionCMSDisabledBlocksAllTranslationProfiles(t *testing.T) {
	// When CMS is disabled, only TranslationProfileNone should be allowed
	profiles := []TranslationProfile{
		TranslationProfileCore,
		TranslationProfileCoreExchange,
		TranslationProfileCoreQueue,
		TranslationProfileFull,
	}

	cfg := NewAdminConfig("", "", "")
	for _, profile := range profiles {
		_, _, err := NewAdmin(cfg, AdapterHooks{},
			WithFeatureDefaults(map[string]bool{"cms": false}),
			WithTranslationProfile(profile),
		)
		if err == nil {
			t.Fatalf("expected error for profile %q when CMS disabled", profile)
		}
		if !errors.Is(err, ErrTranslationProductConfig) {
			t.Fatalf("expected ErrTranslationProductConfig for profile %q, got: %v", profile, err)
		}
		var cfgErr translationProductConfigError
		if !errors.As(err, &cfgErr) {
			t.Fatalf("expected translationProductConfigError for profile %q, got: %T", profile, err)
		}
		if cfgErr.Code != "translation.productization.requires_cms" {
			t.Fatalf("expected requires_cms error code for profile %q, got: %s", profile, cfgErr.Code)
		}
	}
}

func TestFeatureFlagInteractionCMSDisabledAllowsProfileNone(t *testing.T) {
	t.Cleanup(func() { _ = registry.Stop(context.Background()) })
	cfg := NewAdminConfig("", "", "")

	adm, _, err := NewAdmin(cfg, AdapterHooks{},
		WithFeatureDefaults(map[string]bool{"cms": false}),
		WithTranslationProfile(TranslationProfileNone),
	)
	if err != nil {
		t.Fatalf("expected profile none allowed when CMS disabled, got: %v", err)
	}
	if adm.Commands() != nil {
		t.Cleanup(adm.Commands().Reset)
	}

	caps := TranslationCapabilities(adm)
	if caps["profile"] != string(TranslationProfileNone) {
		t.Fatalf("expected profile none in capabilities, got: %v", caps["profile"])
	}
}

func TestFeatureFlagInteractionCMSEnabledDefaultsToCore(t *testing.T) {
	t.Cleanup(func() { _ = registry.Stop(context.Background()) })
	cfg := NewAdminConfig("", "", "")

	// CMS is enabled by default in DefaultAdminFeatures
	adm, _, err := NewAdmin(cfg, AdapterHooks{}, WithTranslationProductConfig(TranslationProductConfig{}))
	if err != nil {
		t.Fatalf("expected no error with default CMS enabled, got: %v", err)
	}
	if adm.Commands() != nil {
		t.Cleanup(adm.Commands().Reset)
	}

	caps := TranslationCapabilities(adm)
	if caps["profile"] != string(TranslationProfileCore) {
		t.Fatalf("expected default profile core when CMS enabled, got: %v", caps["profile"])
	}
}

func TestFeatureFlagInteractionModuleEnablementValidatedAtStartup(t *testing.T) {
	// Exchange module requires handlers at startup
	cfg := NewAdminConfig("", "", "")
	_, _, err := NewAdmin(cfg, AdapterHooks{}, WithTranslationProductConfig(TranslationProductConfig{
		Profile:  TranslationProfileCoreExchange,
		Exchange: &TranslationExchangeConfig{Enabled: true}, // no handlers
	}))
	if err == nil {
		t.Fatal("expected startup validation error for exchange without handlers")
	}
	if !errors.Is(err, ErrTranslationProductConfig) {
		t.Fatalf("expected ErrTranslationProductConfig, got: %v", err)
	}

	// Queue module requires locales at startup
	_, _, err = NewAdmin(cfg, AdapterHooks{}, WithTranslationProductConfig(TranslationProductConfig{
		Profile: TranslationProfileCoreQueue,
		Queue:   &TranslationQueueConfig{Enabled: true}, // no locales
	}))
	if err == nil {
		t.Fatal("expected startup validation error for queue without locales")
	}
	if !errors.Is(err, ErrTranslationProductConfig) {
		t.Fatalf("expected ErrTranslationProductConfig, got: %v", err)
	}
}

func TestFeatureFlagInteractionCapabilitiesReflectFinalResolvedState(t *testing.T) {
	t.Cleanup(func() { _ = registry.Stop(context.Background()) })
	cfg := NewAdminConfig("", "", "")

	// Full profile with valid handlers should reflect all modules enabled
	adm, _, err := NewAdmin(cfg, AdapterHooks{}, WithTranslationProductConfig(TranslationProductConfig{
		Profile: TranslationProfileFull,
		Exchange: &TranslationExchangeConfig{
			Enabled: true,
			Store:   &stubQuickstartTranslationExchangeStore{},
		},
		Queue: &TranslationQueueConfig{
			Enabled:          true,
			SupportedLocales: []string{"en", "es"},
		},
	}))
	if err != nil {
		t.Fatalf("NewAdmin error: %v", err)
	}
	if adm.Commands() != nil {
		t.Cleanup(adm.Commands().Reset)
	}

	caps := TranslationCapabilities(adm)

	// Verify profile
	if caps["profile"] != string(TranslationProfileFull) {
		t.Fatalf("expected profile full, got: %v", caps["profile"])
	}

	// Verify modules state
	modules, _ := caps["modules"].(map[string]any)
	if modules == nil {
		t.Fatal("expected modules in capabilities")
	}

	exchange, _ := modules["exchange"].(map[string]any)
	if enabled, _ := exchange["enabled"].(bool); !enabled {
		t.Fatalf("expected exchange enabled in final capabilities")
	}

	queue, _ := modules["queue"].(map[string]any)
	if enabled, _ := queue["enabled"].(bool); !enabled {
		t.Fatalf("expected queue enabled in final capabilities")
	}

	// Verify features state
	features, _ := caps["features"].(map[string]any)
	if features != nil {
		cmsEnabled, _ := features["cms"].(bool)
		if !cmsEnabled {
			t.Fatalf("expected cms feature enabled in capabilities")
		}
	}
}

func TestFeatureFlagInteractionDeterministicResolutionOrder(t *testing.T) {
	// Test that resolution order is deterministic:
	// 1. Profile sets base module state
	// 2. Module override (Exchange/Queue config) applies
	// 3. Legacy options (WithTranslationQueueConfig) apply last
	t.Cleanup(func() { _ = registry.Stop(context.Background()) })
	cfg := NewAdminConfig("", "", "")

	// Profile Full enables queue, but Queue override disables it
	adm, _, err := NewAdmin(cfg, AdapterHooks{}, WithTranslationProductConfig(TranslationProductConfig{
		Profile: TranslationProfileFull,
		Exchange: &TranslationExchangeConfig{
			Enabled: true,
			Store:   &stubQuickstartTranslationExchangeStore{},
		},
		Queue: &TranslationQueueConfig{
			Enabled: false, // override disables queue
		},
	}))
	if err != nil {
		t.Fatalf("NewAdmin error: %v", err)
	}
	if adm.Commands() != nil {
		t.Cleanup(adm.Commands().Reset)
	}

	caps := TranslationCapabilities(adm)
	modules, _ := caps["modules"].(map[string]any)
	queue, _ := modules["queue"].(map[string]any)
	if enabled, _ := queue["enabled"].(bool); enabled {
		t.Fatalf("expected queue disabled by module override")
	}

	// Queue panel should not be registered
	if _, ok := adm.Registry().Panel("translations"); ok {
		t.Fatalf("expected no queue panel when disabled by override")
	}
}

func TestFeatureFlagInteractionExplicitModuleFeatureOverridesProfile(t *testing.T) {
	t.Cleanup(func() { _ = registry.Stop(context.Background()) })
	cfg := NewAdminConfig("", "", "")

	adm, _, err := NewAdmin(cfg, AdapterHooks{},
		WithFeatureDefaults(map[string]bool{
			string(admin.FeatureTranslationQueue):    false,
			string(admin.FeatureTranslationExchange): true,
		}),
		WithTranslationProductConfig(TranslationProductConfig{
			Profile: TranslationProfileFull,
			Exchange: &TranslationExchangeConfig{
				Enabled: true,
				Store:   &stubQuickstartTranslationExchangeStore{},
			},
			Queue: &TranslationQueueConfig{
				Enabled:          true,
				SupportedLocales: []string{"en", "es"},
			},
		}),
	)
	if err != nil {
		t.Fatalf("NewAdmin error: %v", err)
	}
	if adm.Commands() != nil {
		t.Cleanup(adm.Commands().Reset)
	}
	if _, ok := adm.Registry().Panel("translations"); ok {
		t.Fatalf("expected queue panel disabled by explicit queue feature override")
	}
	if adm.BootTranslationExchange() == nil {
		t.Fatalf("expected exchange enabled by explicit exchange feature override")
	}

	caps := TranslationCapabilities(adm)
	modules, _ := caps["modules"].(map[string]any)
	queue, _ := modules["queue"].(map[string]any)
	if enabled, _ := queue["enabled"].(bool); enabled {
		t.Fatalf("expected queue disabled in capabilities")
	}
	exchange, _ := modules["exchange"].(map[string]any)
	if enabled, _ := exchange["enabled"].(bool); !enabled {
		t.Fatalf("expected exchange enabled in capabilities")
	}
}

func TestFeatureFlagInteractionExplicitQueueFeatureEnableRequiresValidDependencies(t *testing.T) {
	cfg := NewAdminConfig("", "", "")
	_, _, err := NewAdmin(cfg, AdapterHooks{},
		WithFeatureDefaults(map[string]bool{
			string(admin.FeatureTranslationQueue): true,
		}),
		WithTranslationProductConfig(TranslationProductConfig{
			Profile: TranslationProfileCore,
			Queue: &TranslationQueueConfig{
				SupportedLocales: []string{"en", "es"},
			},
		}),
	)
	if err != nil {
		t.Fatalf("expected queue enable by feature override to pass with valid locales, got %v", err)
	}
}

func TestRuntimeValidationUsesResolvedTranslationModulesOverFeatureGateState(t *testing.T) {
	t.Cleanup(func() { _ = registry.Stop(context.Background()) })
	cfg := NewAdminConfig("", "", "")

	gateDefaults := DefaultAdminFeatures()
	gateDefaults[string(admin.FeatureTranslationQueue)] = true
	customGate := buildFeatureGate(cfg, gateDefaults, nil)

	adm, _, err := NewAdmin(
		cfg,
		AdapterHooks{},
		WithAdminDependencies(admin.Dependencies{FeatureGate: customGate}),
		WithTranslationProductConfig(TranslationProductConfig{
			Profile: TranslationProfileCore,
		}),
	)
	if err != nil {
		t.Fatalf("expected startup success when profile keeps queue disabled, got %v", err)
	}

	if _, ok := adm.Registry().Panel("translations"); ok {
		t.Fatalf("expected no translations panel when resolved queue module is disabled")
	}

	caps := TranslationCapabilities(adm)
	modules, _ := caps["modules"].(map[string]any)
	queue, _ := modules["queue"].(map[string]any)
	if enabled, _ := queue["enabled"].(bool); enabled {
		t.Fatalf("expected queue disabled in capability snapshot")
	}
}

func TestFeatureFlagInteractionDashboardDisableDoesNotDisableModules(t *testing.T) {
	t.Cleanup(func() { _ = registry.Stop(context.Background()) })
	cfg := NewAdminConfig("", "", "")

	adm, _, err := NewAdmin(cfg, AdapterHooks{},
		WithFeatureDefaults(map[string]bool{
			string(admin.FeatureDashboard): false,
		}),
		WithTranslationProductConfig(TranslationProductConfig{
			Profile: TranslationProfileFull,
			Exchange: &TranslationExchangeConfig{
				Enabled: true,
				Store:   &stubQuickstartTranslationExchangeStore{},
			},
			Queue: &TranslationQueueConfig{
				Enabled:          true,
				SupportedLocales: []string{"en", "es"},
			},
		}),
	)
	if err != nil {
		t.Fatalf("NewAdmin error: %v", err)
	}
	if adm.Commands() != nil {
		t.Cleanup(adm.Commands().Reset)
	}
	if adm.BootTranslationExchange() == nil {
		t.Fatalf("expected exchange binding with dashboard disabled")
	}
	if _, ok := adm.Registry().Panel("translations"); !ok {
		t.Fatalf("expected queue panel with dashboard disabled")
	}

	caps := TranslationCapabilities(adm)
	features, _ := caps["features"].(map[string]any)
	if dashboardEnabled, _ := features["dashboard"].(bool); dashboardEnabled {
		t.Fatalf("expected dashboard disabled in capability features")
	}
}

func TestFeatureFlagInteractionCMSEnabledStateStillValidatedWithModuleFeatureOverrides(t *testing.T) {
	cfg := NewAdminConfig("", "", "")
	_, _, err := NewAdmin(cfg, AdapterHooks{},
		WithFeatureDefaults(map[string]bool{
			string(admin.FeatureCMS):                 false,
			string(admin.FeatureTranslationExchange): true,
		}),
		WithTranslationProductConfig(TranslationProductConfig{
			Profile: TranslationProfileNone,
			Exchange: &TranslationExchangeConfig{
				Store: &stubQuickstartTranslationExchangeStore{},
			},
		}),
	)
	if err == nil {
		t.Fatalf("expected requires_cms error when feature override enables exchange while cms disabled")
	}
	var cfgErr translationProductConfigError
	if !errors.As(err, &cfgErr) {
		t.Fatalf("expected translationProductConfigError, got %T", err)
	}
	if cfgErr.Code != "translation.productization.requires_cms" {
		t.Fatalf("expected requires_cms error code, got %s", cfgErr.Code)
	}
}

func TestTranslationProductRuntimeValidationQueueRouteCoherenceDiagnostics(t *testing.T) {
	tests := []struct {
		name                 string
		includeDashboardUI   bool
		includeMyWorkAPI     bool
		expectedFailedChecks []string
	}{
		{
			name:               "dashboard without my-work API",
			includeDashboardUI: true,
			includeMyWorkAPI:   false,
			expectedFailedChecks: []string{
				"queue.route.api.translations.my_work",
				"queue.coherence.dashboard_without_my_work_api",
			},
		},
		{
			name:               "my-work API without dashboard",
			includeDashboardUI: false,
			includeMyWorkAPI:   true,
			expectedFailedChecks: []string{
				"queue.route.translations.dashboard",
				"queue.coherence.my_work_api_without_dashboard",
			},
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			cfg := NewAdminConfig("/admin", "Admin", "en")
			cfg.URLs.URLKit = translationRuntimeValidationURLKitConfig(tc.includeDashboardUI, tc.includeMyWorkAPI)

			_, _, err := NewAdmin(cfg, AdapterHooks{}, WithTranslationProductConfig(TranslationProductConfig{
				SchemaVersion: TranslationProductSchemaVersionCurrent,
				Profile:       TranslationProfileCoreQueue,
				Queue: &TranslationQueueConfig{
					Enabled:          true,
					SupportedLocales: []string{"en", "es"},
				},
			}))
			if err == nil {
				t.Fatalf("expected runtime validation error")
			}
			if !errors.Is(err, ErrTranslationProductConfig) {
				t.Fatalf("expected ErrTranslationProductConfig, got %v", err)
			}
			var cfgErr translationProductConfigError
			if !errors.As(err, &cfgErr) {
				t.Fatalf("expected translationProductConfigError, got %T", err)
			}
			if cfgErr.Code != "translation.productization.runtime.invalid" {
				t.Fatalf("expected runtime.invalid code, got %s", cfgErr.Code)
			}
			for _, expected := range tc.expectedFailedChecks {
				if !containsTranslationProductString(cfgErr.FailedChecks, expected) {
					t.Fatalf("expected failed check %q, got %v", expected, cfgErr.FailedChecks)
				}
			}
		})
	}
}

func TestTranslationProductRuntimeValidationRejectsUnresolvableQueueAggregateRoutePaths(t *testing.T) {
	cfg := NewAdminConfig("/admin", "Admin", "en")
	cfg.URLs.URLKit = translationRuntimeValidationURLKitConfigWithQueueRoutes(
		"/translations/dashboard",
		"/translations/:id",
		"/translations/queue",
	)

	_, _, err := NewAdmin(cfg, AdapterHooks{}, WithTranslationProductConfig(TranslationProductConfig{
		SchemaVersion: TranslationProductSchemaVersionCurrent,
		Profile:       TranslationProfileCoreQueue,
		Queue: &TranslationQueueConfig{
			Enabled:          true,
			SupportedLocales: []string{"en", "es"},
		},
	}))
	if err == nil {
		t.Fatalf("expected runtime validation error for dynamic queue aggregate route")
	}
	var cfgErr translationProductConfigError
	if !errors.As(err, &cfgErr) {
		t.Fatalf("expected translationProductConfigError, got %T", err)
	}
	if cfgErr.Code != "translation.productization.runtime.invalid" {
		t.Fatalf("expected runtime.invalid code, got %s", cfgErr.Code)
	}
	if !containsTranslationProductString(cfgErr.FailedChecks, "queue.route.api.translations.my_work") {
		t.Fatalf("expected missing my_work failed check, got %v", cfgErr.FailedChecks)
	}
	if !containsTranslationProductString(cfgErr.FailedChecks, "queue.route.api.translations.my_work.resolver") {
		t.Fatalf("expected resolver failed check, got %v", cfgErr.FailedChecks)
	}
}

func TestTranslationProductProfileModeRouteAndNavDeterminism(t *testing.T) {
	tests := []struct {
		profile         TranslationProfile
		expectDashboard bool
	}{
		{profile: TranslationProfileNone, expectDashboard: false},
		{profile: TranslationProfileCore, expectDashboard: false},
		{profile: TranslationProfileCoreExchange, expectDashboard: false},
		{profile: TranslationProfileCoreQueue, expectDashboard: true},
		{profile: TranslationProfileFull, expectDashboard: true},
	}

	for _, tc := range tests {
		t.Run(string(tc.profile), func(t *testing.T) {
			t.Cleanup(func() { _ = registry.Stop(context.Background()) })
			cfg := NewAdminConfig("/admin", "Admin", "en")
			adm, _, err := NewAdmin(
				cfg,
				AdapterHooks{},
				WithTranslationProductConfig(translationProductConfigForProfile(tc.profile)),
			)
			if err != nil {
				t.Fatalf("NewAdmin(%s): %v", tc.profile, err)
			}
			if adm.Commands() != nil {
				t.Cleanup(adm.Commands().Reset)
			}

			captureRouter := newUIRoutesCaptureRouter()
			if err := RegisterAdminUIRoutes(captureRouter, cfg, adm, nil, WithUITranslationDashboardRoute(true)); err != nil {
				t.Fatalf("RegisterAdminUIRoutes(%s): %v", tc.profile, err)
			}
			_, hasDashboardHandler := captureRouter.getHandlers["/admin/translations/dashboard"]
			if hasDashboardHandler != tc.expectDashboard {
				t.Fatalf("expected dashboard handler=%t, got %t", tc.expectDashboard, hasDashboardHandler)
			}

			caps := TranslationCapabilities(adm)
			routes := translationRoutesToStrings(caps["routes"])
			hasDashboardRoute := strings.TrimSpace(routes["admin.translations.dashboard"]) != ""
			if hasDashboardRoute != tc.expectDashboard {
				t.Fatalf("expected capability dashboard route=%t, got %t", tc.expectDashboard, hasDashboardRoute)
			}
			myWorkKey := fmt.Sprintf("%s.%s", adm.AdminAPIGroup(), "translations.my_work")
			hasMyWorkRoute := strings.TrimSpace(routes[myWorkKey]) != ""
			if hasMyWorkRoute != tc.expectDashboard {
				t.Fatalf("expected capability my_work route=%t, got %t", tc.expectDashboard, hasMyWorkRoute)
			}

			if err := NewModuleRegistrar(
				adm,
				cfg,
				nil,
				false,
				WithTranslationCapabilityMenuMode(TranslationCapabilityMenuModeTools),
			); err != nil {
				t.Fatalf("NewModuleRegistrar(%s): %v", tc.profile, err)
			}
			navItems := BuildNavItems(adm, cfg, context.Background(), "")
			hasDashboardNav := findNavItemByKey(navItems, "translation_dashboard") != nil
			if hasDashboardNav != tc.expectDashboard {
				t.Fatalf("expected dashboard nav entry=%t, got %t", tc.expectDashboard, hasDashboardNav)
			}
		})
	}
}

func TestTranslationCapabilitiesDoNotAdvertiseModulesWhenFeatureGateDisablesRoutes(t *testing.T) {
	t.Cleanup(func() { _ = registry.Stop(context.Background()) })
	cfg := NewAdminConfig("/admin", "Admin", "en")
	defaults := DefaultAdminFeatures()
	defaults[string(admin.FeatureTranslationQueue)] = false
	defaults[string(admin.FeatureTranslationExchange)] = false
	customGate := buildFeatureGate(cfg, defaults, nil)

	adm, _, err := NewAdmin(
		cfg,
		AdapterHooks{},
		WithAdminDependencies(admin.Dependencies{FeatureGate: customGate}),
		WithTranslationProductConfig(translationProductConfigForProfile(TranslationProfileFull)),
	)
	if err != nil {
		t.Fatalf("NewAdmin: %v", err)
	}
	if adm.Commands() != nil {
		t.Cleanup(adm.Commands().Reset)
	}

	caps := TranslationCapabilities(adm)
	modules, _ := caps["modules"].(map[string]any)
	queue, _ := modules["queue"].(map[string]any)
	if enabled, _ := queue["enabled"].(bool); enabled {
		t.Fatalf("expected queue module disabled in capabilities")
	}
	exchange, _ := modules["exchange"].(map[string]any)
	if enabled, _ := exchange["enabled"].(bool); enabled {
		t.Fatalf("expected exchange module disabled in capabilities")
	}

	routes := translationRoutesToStrings(caps["routes"])
	if strings.TrimSpace(routes["admin.translations.dashboard"]) != "" {
		t.Fatalf("expected dashboard route hidden when queue feature gate disabled")
	}
	if strings.TrimSpace(routes[fmt.Sprintf("%s.%s", adm.AdminAPIGroup(), "translations.my_work")]) != "" {
		t.Fatalf("expected my_work route hidden when queue feature gate disabled")
	}
	if strings.TrimSpace(routes["admin.translations.exchange"]) != "" {
		t.Fatalf("expected exchange route hidden when exchange feature gate disabled")
	}
	if strings.TrimSpace(routes[fmt.Sprintf("%s.%s", adm.AdminAPIGroup(), "translations.export")]) != "" {
		t.Fatalf("expected exchange export route hidden when exchange feature gate disabled")
	}
}

func translationProductConfigForProfile(profile TranslationProfile) TranslationProductConfig {
	cfg := TranslationProductConfig{
		SchemaVersion: TranslationProductSchemaVersionCurrent,
		Profile:       profile,
	}
	switch profile {
	case TranslationProfileCoreExchange:
		cfg.Exchange = &TranslationExchangeConfig{
			Enabled: true,
			Store:   &stubQuickstartTranslationExchangeStore{},
		}
	case TranslationProfileCoreQueue:
		cfg.Queue = &TranslationQueueConfig{
			Enabled:          true,
			SupportedLocales: []string{"en", "es"},
		}
	case TranslationProfileFull:
		cfg.Exchange = &TranslationExchangeConfig{
			Enabled: true,
			Store:   &stubQuickstartTranslationExchangeStore{},
		}
		cfg.Queue = &TranslationQueueConfig{
			Enabled:          true,
			SupportedLocales: []string{"en", "es"},
		}
	}
	return cfg
}

func translationRuntimeValidationURLKitConfig(includeDashboardUI, includeMyWorkAPI bool) *urlkit.Config {
	dashboardPath := ""
	if includeDashboardUI {
		dashboardPath = "/translations/dashboard"
	}
	myWorkPath := ""
	if includeMyWorkAPI {
		myWorkPath = "/translations/my-work"
	}
	return translationRuntimeValidationURLKitConfigWithQueueRoutes(dashboardPath, myWorkPath, "/translations/queue")
}

func translationRuntimeValidationURLKitConfigWithQueueRoutes(dashboardPath, myWorkPath, queuePath string) *urlkit.Config {
	adminRoutes := map[string]string{
		"dashboard":          "/",
		"translations.queue": "/content/translations",
	}
	if strings.TrimSpace(dashboardPath) != "" {
		adminRoutes["translations.dashboard"] = strings.TrimSpace(dashboardPath)
	}

	adminAPIRoutes := map[string]string{
		"errors":  "/errors",
		"preview": "/preview/:token",
	}
	if strings.TrimSpace(queuePath) != "" {
		adminAPIRoutes["translations.queue"] = strings.TrimSpace(queuePath)
	}
	if strings.TrimSpace(myWorkPath) != "" {
		adminAPIRoutes["translations.my_work"] = strings.TrimSpace(myWorkPath)
	}

	return &urlkit.Config{
		Groups: []urlkit.GroupConfig{
			{
				Name:    "admin",
				BaseURL: "/admin",
				Routes:  adminRoutes,
				Groups: []urlkit.GroupConfig{
					{
						Name:   "api",
						Path:   "/api",
						Routes: adminAPIRoutes,
					},
				},
			},
			{
				Name: "public",
				Groups: []urlkit.GroupConfig{
					{
						Name: "api",
						Path: "/api",
						Groups: []urlkit.GroupConfig{
							{
								Name: "v1",
								Path: "/v1",
								Routes: map[string]string{
									"pages":   "/pages",
									"page":    "/pages/:id",
									"preview": "/preview/:token",
								},
							},
						},
					},
				},
			},
		},
	}
}

func containsTranslationProductString(values []string, target string) bool {
	target = strings.TrimSpace(target)
	for _, value := range values {
		if strings.EqualFold(strings.TrimSpace(value), target) {
			return true
		}
	}
	return false
}
