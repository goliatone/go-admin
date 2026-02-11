package quickstart

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"testing"

	"github.com/goliatone/go-command/registry"
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
