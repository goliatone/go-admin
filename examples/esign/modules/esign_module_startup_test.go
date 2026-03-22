package modules

import (
	"context"
	"fmt"
	"strings"
	"testing"
	"time"

	coreadmin "github.com/goliatone/go-admin/admin"
	appcfg "github.com/goliatone/go-admin/examples/esign/config"
	"github.com/goliatone/go-admin/examples/esign/jobs"
	"github.com/goliatone/go-admin/examples/esign/services"
	"github.com/goliatone/go-admin/examples/esign/stores"
	"github.com/goliatone/go-uploader"
)

func TestValidateGoogleRuntimeWiringRequiresGoogleServiceWhenEnabled(t *testing.T) {
	module := &ESignModule{
		googleEnabled: true,
	}
	err := module.validateGoogleRuntimeWiring(context.Background(), true)
	if err == nil {
		t.Fatal("expected validation error when google integration is missing")
	}
	if !strings.Contains(err.Error(), "google integration service is required") {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestValidateGoogleRuntimeWiringRequiresRuntimeWhenEnabled(t *testing.T) {
	module := &ESignModule{
		googleEnabled: true,
		google: startupGoogleIntegrationStub{
			health: services.GoogleProviderHealthStatus{Healthy: true},
		},
	}
	err := module.validateGoogleRuntimeWiring(context.Background(), true)
	if err == nil {
		t.Fatal("expected validation error when durable job runtime is missing")
	}
	if !strings.Contains(err.Error(), "durable job runtime is required") {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestValidateGoogleRuntimeWiringWarnModeAllowsDegradedProvider(t *testing.T) {
	module := &ESignModule{
		googleEnabled: true,
		durableJobs:   &jobs.DurableJobRuntime{},
		google: startupGoogleIntegrationStub{
			health: services.GoogleProviderHealthStatus{
				Healthy: false,
				Mode:    "degraded",
				Reason:  "mock",
			},
		},
	}
	if err := module.validateGoogleRuntimeWiring(context.Background(), false); err != nil {
		t.Fatalf("expected degraded provider to be tolerated in warn mode, got %v", err)
	}
}

func TestValidateGoogleRuntimeWiringStrictModeFailsOnDegradedProvider(t *testing.T) {
	module := &ESignModule{
		googleEnabled: true,
		durableJobs:   &jobs.DurableJobRuntime{},
		google: startupGoogleIntegrationStub{
			health: services.GoogleProviderHealthStatus{
				Healthy: false,
				Mode:    "degraded",
				Reason:  "mock",
			},
		},
	}
	err := module.validateGoogleRuntimeWiring(context.Background(), true)
	if err == nil {
		t.Fatal("expected strict mode to fail on degraded provider")
	}
	if !strings.Contains(err.Error(), "google provider degraded at startup") {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestValidateLineageRuntimeWiringRequiresReadModelsWhenLineageEnabled(t *testing.T) {
	module := &ESignModule{
		store: stores.NewInMemoryStore(),
	}
	err := module.validateLineageRuntimeWiring(context.Background())
	if err == nil {
		t.Fatal("expected validation error when lineage read models are missing")
	}
	if !strings.Contains(err.Error(), "source read model service is required") {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestValidateLineageRuntimeWiringRequiresDiagnosticsWhenLineageEnabled(t *testing.T) {
	store := stores.NewInMemoryStore()
	module := &ESignModule{
		store:            store,
		sourceReadModels: services.NewDefaultSourceReadModelService(store, store, store),
	}
	err := module.validateLineageRuntimeWiring(context.Background())
	if err == nil {
		t.Fatal("expected validation error when lineage diagnostics are missing")
	}
	if !strings.Contains(err.Error(), "lineage diagnostics service is required") {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestValidateLineageRuntimeWiringRequiresRuntimeWhenGoogleAndLineageEnabled(t *testing.T) {
	store := stores.NewInMemoryStore()
	module := &ESignModule{
		store:             store,
		googleEnabled:     true,
		sourceReadModels:  services.NewDefaultSourceReadModelService(store, store, store),
		sourceDiagnostics: services.NewDefaultLineageDiagnosticsService(store, store, store),
	}
	err := module.validateLineageRuntimeWiring(context.Background())
	if err == nil {
		t.Fatal("expected validation error when durable runtime is missing")
	}
	if !strings.Contains(err.Error(), "durable job runtime is required") {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestValidateLineageRuntimeWiringPassesWhenLineageServicesAreConfigured(t *testing.T) {
	store := stores.NewInMemoryStore()
	restoreRepoRoot := resolveV2SourceManagementRepoRoot
	restoreValidate := validateV2SourceManagementRuntime
	resolveV2SourceManagementRepoRoot = func() (string, error) { return t.TempDir(), nil }
	validateV2SourceManagementRuntime = func(context.Context, string, stores.Scope, any, services.SourceReadModelService) error { return nil }
	t.Cleanup(func() {
		resolveV2SourceManagementRepoRoot = restoreRepoRoot
		validateV2SourceManagementRuntime = restoreValidate
	})
	module := &ESignModule{
		store:             store,
		sourceReadModels:  services.NewDefaultSourceReadModelService(store, store, store),
		sourceDiagnostics: services.NewDefaultLineageDiagnosticsService(store, store, store),
	}
	if err := module.validateLineageRuntimeWiring(context.Background()); err != nil {
		t.Fatalf("expected lineage startup validation to pass, got %v", err)
	}
}

func TestValidateLineageRuntimeWiringFailsWhenV2SourceManagementStartupValidationFails(t *testing.T) {
	store := stores.NewInMemoryStore()
	restoreRepoRoot := resolveV2SourceManagementRepoRoot
	restoreValidate := validateV2SourceManagementRuntime
	resolveV2SourceManagementRepoRoot = func() (string, error) { return t.TempDir(), nil }
	validateV2SourceManagementRuntime = func(context.Context, string, stores.Scope, any, services.SourceReadModelService) error {
		return fmt.Errorf("missing v2 guard snapshot")
	}
	t.Cleanup(func() {
		resolveV2SourceManagementRepoRoot = restoreRepoRoot
		validateV2SourceManagementRuntime = restoreValidate
	})

	module := &ESignModule{
		store:             store,
		sourceReadModels:  services.NewDefaultSourceReadModelService(store, store, store),
		sourceDiagnostics: services.NewDefaultLineageDiagnosticsService(store, store, store),
	}
	err := module.validateLineageRuntimeWiring(context.Background())
	if err == nil {
		t.Fatal("expected v2 source-management startup validation failure")
	}
	if !strings.Contains(err.Error(), "missing v2 guard snapshot") {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestResolveESignStrictStartupDefaultsFalse(t *testing.T) {
	cfg := appcfg.Defaults()
	cfg.Runtime.StrictStartup = false
	appcfg.SetActive(cfg)
	t.Cleanup(appcfg.ResetActive)

	if resolveESignStrictStartup() {
		t.Fatal("expected strict startup to default to false")
	}
}

func TestResolveESignStrictStartupParsesBooleanValues(t *testing.T) {
	cfg := appcfg.Defaults()
	cfg.Runtime.StrictStartup = true
	appcfg.SetActive(cfg)
	t.Cleanup(appcfg.ResetActive)

	if !resolveESignStrictStartup() {
		t.Fatal("expected strict startup true for APP_RUNTIME__STRICT_STARTUP=true")
	}
	cfg.Runtime.StrictStartup = false
	appcfg.SetActive(cfg)
	if resolveESignStrictStartup() {
		t.Fatal("expected strict startup false for config false value")
	}
}

func TestBuildPDFRemediationCommandServiceDisabledReturnsNil(t *testing.T) {
	cfg := appcfg.Defaults()
	cfg.Signer.PDF.Remediation.Enabled = false

	service, err := buildPDFRemediationCommandService(
		cfg,
		stores.NewInMemoryStore(),
		uploader.NewManager(uploader.WithProvider(uploader.NewFSProvider(t.TempDir()))),
		services.NewPDFService(),
		coreadmin.NewActivityFeed(),
		nil,
	)
	if err != nil {
		t.Fatalf("buildPDFRemediationCommandService: %v", err)
	}
	if service != nil {
		t.Fatalf("expected nil remediation service when feature disabled")
	}
}

func TestBuildPDFRemediationCommandServiceRejectsNonAllowlistedExecutable(t *testing.T) {
	cfg := appcfg.Defaults()
	cfg.Signer.PDF.Remediation.Enabled = true
	cfg.Signer.PDF.Remediation.LeaseTTLMS = int((30 * time.Second).Milliseconds())
	cfg.Signer.PDF.Remediation.Command.Bin = "cat"
	cfg.Signer.PDF.Remediation.Command.Args = []string{"{in}", "{out}"}

	_, err := buildPDFRemediationCommandService(
		cfg,
		stores.NewInMemoryStore(),
		uploader.NewManager(uploader.WithProvider(uploader.NewFSProvider(t.TempDir()))),
		services.NewPDFService(),
		coreadmin.NewActivityFeed(),
		nil,
	)
	if err == nil {
		t.Fatal("expected validation error for non-allowlisted remediation executable")
	}
	if !strings.Contains(err.Error(), "not allowlisted") {
		t.Fatalf("unexpected error: %v", err)
	}
}

type startupGoogleIntegrationStub struct {
	health services.GoogleProviderHealthStatus
}

func (startupGoogleIntegrationStub) Connect(context.Context, stores.Scope, services.GoogleConnectInput) (services.GoogleOAuthStatus, error) {
	return services.GoogleOAuthStatus{}, nil
}

func (startupGoogleIntegrationStub) Disconnect(context.Context, stores.Scope, string) error {
	return nil
}

func (startupGoogleIntegrationStub) RotateCredentialEncryption(context.Context, stores.Scope, string) (services.GoogleOAuthStatus, error) {
	return services.GoogleOAuthStatus{}, nil
}

func (startupGoogleIntegrationStub) Status(context.Context, stores.Scope, string) (services.GoogleOAuthStatus, error) {
	return services.GoogleOAuthStatus{}, nil
}

func (startupGoogleIntegrationStub) ListAccounts(context.Context, stores.Scope, string) ([]services.GoogleAccountInfo, error) {
	return nil, nil
}

func (startupGoogleIntegrationStub) SearchFiles(context.Context, stores.Scope, services.GoogleDriveQueryInput) (services.GoogleDriveListResult, error) {
	return services.GoogleDriveListResult{}, nil
}

func (startupGoogleIntegrationStub) BrowseFiles(context.Context, stores.Scope, services.GoogleDriveQueryInput) (services.GoogleDriveListResult, error) {
	return services.GoogleDriveListResult{}, nil
}

func (startupGoogleIntegrationStub) ImportDocument(context.Context, stores.Scope, services.GoogleImportInput) (services.GoogleImportResult, error) {
	return services.GoogleImportResult{}, nil
}

func (s startupGoogleIntegrationStub) ProviderHealth(context.Context) services.GoogleProviderHealthStatus {
	return s.health
}
