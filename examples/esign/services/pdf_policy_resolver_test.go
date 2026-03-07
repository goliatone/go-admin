package services

import (
	"context"
	"testing"

	coreadmin "github.com/goliatone/go-admin/admin"
	appcfg "github.com/goliatone/go-admin/examples/esign/config"
	"github.com/goliatone/go-admin/examples/esign/stores"
)

func TestRuntimePDFPolicyResolverPrefersCanonicalMaxSourceBytesOverLegacy(t *testing.T) {
	settings := newPDFPolicySettingsServiceForTest()
	if err := settings.Apply(context.Background(), coreadmin.SettingsBundle{
		Scope: coreadmin.SettingsScopeSystem,
		Values: map[string]any{
			SettingPDFMaxSourceBytesLegacy: int64(8 * 1024 * 1024),
			SettingPDFMaxSourceBytes:       int64(4 * 1024 * 1024),
		},
	}); err != nil {
		t.Fatalf("apply settings: %v", err)
	}

	cfg := *appcfg.Defaults()
	cfg.Signer.PDF.MaxSourceBytes = 12 * 1024 * 1024

	resolver := NewRuntimePDFPolicyResolver(settings,
		WithRuntimePDFPolicyConfigProvider(func() appcfg.Config { return cfg }),
	)

	policy := resolver.Resolve(context.Background(), stores.Scope{})
	if policy.MaxSourceBytes != 4*1024*1024 {
		t.Fatalf("expected canonical max_source_bytes to win, got %d", policy.MaxSourceBytes)
	}
}

func TestRuntimePDFPolicyResolverUsesLegacyAliasWhenCanonicalMissing(t *testing.T) {
	settings := newPDFPolicySettingsServiceForTest()
	if err := settings.Apply(context.Background(), coreadmin.SettingsBundle{
		Scope: coreadmin.SettingsScopeSystem,
		Values: map[string]any{
			SettingPDFMaxSourceBytesLegacy: int64(6 * 1024 * 1024),
		},
	}); err != nil {
		t.Fatalf("apply settings: %v", err)
	}

	cfg := *appcfg.Defaults()
	cfg.Signer.PDF.MaxSourceBytes = 14 * 1024 * 1024

	resolver := NewRuntimePDFPolicyResolver(settings,
		WithRuntimePDFPolicyConfigProvider(func() appcfg.Config { return cfg }),
	)

	policy := resolver.Resolve(context.Background(), stores.Scope{})
	if policy.MaxSourceBytes != 6*1024*1024 {
		t.Fatalf("expected legacy alias max_source_pdf_bytes fallback, got %d", policy.MaxSourceBytes)
	}
}

func TestRuntimePDFPolicyResolverFallsBackToRuntimeConfigWithoutSettingsOverride(t *testing.T) {
	cfg := *appcfg.Defaults()
	cfg.Signer.PDF.MaxSourceBytes = 3 * 1024 * 1024
	cfg.Signer.PDF.MaxPages = 40
	cfg.Signer.PDF.ParseTimeoutMS = 1500
	cfg.Signer.PDF.PreviewFallbackEnabled = true
	cfg.Signer.PDF.PipelineMode = string(PDFPipelineModeAnalyzeOnly)

	resolver := NewRuntimePDFPolicyResolver(nil,
		WithRuntimePDFPolicyConfigProvider(func() appcfg.Config { return cfg }),
	)
	policy := resolver.Resolve(context.Background(), stores.Scope{})

	if policy.MaxSourceBytes != 3*1024*1024 {
		t.Fatalf("expected runtime config max_source_bytes fallback, got %d", policy.MaxSourceBytes)
	}
	if policy.MaxPages != 40 {
		t.Fatalf("expected runtime config max_pages fallback, got %d", policy.MaxPages)
	}
	if policy.ParseTimeout.Milliseconds() != 1500 {
		t.Fatalf("expected runtime config parse timeout 1500ms, got %d", policy.ParseTimeout.Milliseconds())
	}
	if !policy.PreviewFallbackEnabled {
		t.Fatalf("expected runtime config preview fallback enabled")
	}
	if policy.PipelineMode != PDFPipelineModeAnalyzeOnly {
		t.Fatalf("expected runtime config pipeline mode analyze_only fallback, got %q", policy.PipelineMode)
	}
}

func TestRuntimePDFPolicyResolverSettingsOverridePipelineMode(t *testing.T) {
	settings := newPDFPolicySettingsServiceForTest()
	if err := settings.Apply(context.Background(), coreadmin.SettingsBundle{
		Scope: coreadmin.SettingsScopeSystem,
		Values: map[string]any{
			SettingPDFPipelineMode: string(PDFPipelineModeEnforcePolicy),
		},
	}); err != nil {
		t.Fatalf("apply settings: %v", err)
	}
	cfg := *appcfg.Defaults()
	cfg.Signer.PDF.PipelineMode = string(PDFPipelineModeAnalyzeOnly)

	resolver := NewRuntimePDFPolicyResolver(settings,
		WithRuntimePDFPolicyConfigProvider(func() appcfg.Config { return cfg }),
	)
	policy := resolver.Resolve(context.Background(), stores.Scope{})
	if policy.PipelineMode != PDFPipelineModeEnforcePolicy {
		t.Fatalf("expected settings override pipeline mode enforce_policy, got %q", policy.PipelineMode)
	}
}

func newPDFPolicySettingsServiceForTest() *coreadmin.SettingsService {
	svc := coreadmin.NewSettingsService()
	svc.RegisterDefinition(coreadmin.SettingDefinition{Key: SettingPDFMaxSourceBytes, Type: "integer", Default: int64(0), AllowedScopes: []coreadmin.SettingsScope{coreadmin.SettingsScopeSystem, coreadmin.SettingsScopeSite}})
	svc.RegisterDefinition(coreadmin.SettingDefinition{Key: SettingPDFMaxSourceBytesLegacy, Type: "integer", Default: int64(0), AllowedScopes: []coreadmin.SettingsScope{coreadmin.SettingsScopeSystem, coreadmin.SettingsScopeSite}})
	svc.RegisterDefinition(coreadmin.SettingDefinition{Key: SettingPDFMaxPages, Type: "integer", Default: 0, AllowedScopes: []coreadmin.SettingsScope{coreadmin.SettingsScopeSystem, coreadmin.SettingsScopeSite}})
	svc.RegisterDefinition(coreadmin.SettingDefinition{Key: SettingPDFMaxObjects, Type: "integer", Default: 0, AllowedScopes: []coreadmin.SettingsScope{coreadmin.SettingsScopeSystem, coreadmin.SettingsScopeSite}})
	svc.RegisterDefinition(coreadmin.SettingDefinition{Key: SettingPDFMaxDecompressedBytes, Type: "integer", Default: int64(0), AllowedScopes: []coreadmin.SettingsScope{coreadmin.SettingsScopeSystem, coreadmin.SettingsScopeSite}})
	svc.RegisterDefinition(coreadmin.SettingDefinition{Key: SettingPDFParseTimeoutMS, Type: "integer", Default: 0, AllowedScopes: []coreadmin.SettingsScope{coreadmin.SettingsScopeSystem, coreadmin.SettingsScopeSite}})
	svc.RegisterDefinition(coreadmin.SettingDefinition{Key: SettingPDFNormalizationTimeoutMS, Type: "integer", Default: 0, AllowedScopes: []coreadmin.SettingsScope{coreadmin.SettingsScopeSystem, coreadmin.SettingsScopeSite}})
	svc.RegisterDefinition(coreadmin.SettingDefinition{Key: SettingPDFAllowEncrypted, Type: "boolean", Default: false, AllowedScopes: []coreadmin.SettingsScope{coreadmin.SettingsScopeSystem, coreadmin.SettingsScopeSite}})
	svc.RegisterDefinition(coreadmin.SettingDefinition{Key: SettingPDFAllowJavaScriptActions, Type: "boolean", Default: false, AllowedScopes: []coreadmin.SettingsScope{coreadmin.SettingsScopeSystem, coreadmin.SettingsScopeSite}})
	svc.RegisterDefinition(coreadmin.SettingDefinition{Key: SettingPDFCompatibilityMode, Type: "string", Default: "balanced", AllowedScopes: []coreadmin.SettingsScope{coreadmin.SettingsScopeSystem, coreadmin.SettingsScopeSite}})
	svc.RegisterDefinition(coreadmin.SettingDefinition{Key: SettingPDFPreviewFallbackEnabled, Type: "boolean", Default: false, AllowedScopes: []coreadmin.SettingsScope{coreadmin.SettingsScopeSystem, coreadmin.SettingsScopeSite}})
	svc.RegisterDefinition(coreadmin.SettingDefinition{Key: SettingPDFPipelineMode, Type: "string", Default: string(PDFPipelineModePreferNormalized), AllowedScopes: []coreadmin.SettingsScope{coreadmin.SettingsScopeSystem, coreadmin.SettingsScopeSite}})
	return svc
}
