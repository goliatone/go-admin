package modules

import (
	"context"
	"strings"
	"testing"

	"github.com/goliatone/go-admin/examples/esign/jobs"
	"github.com/goliatone/go-admin/examples/esign/services"
	"github.com/goliatone/go-admin/examples/esign/stores"
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

func TestValidateGoogleRuntimeWiringRequiresQueueWhenEnabled(t *testing.T) {
	module := &ESignModule{
		googleEnabled: true,
		google: startupGoogleIntegrationStub{
			health: services.GoogleProviderHealthStatus{Healthy: true},
		},
	}
	err := module.validateGoogleRuntimeWiring(context.Background(), true)
	if err == nil {
		t.Fatal("expected validation error when google import queue is missing")
	}
	if !strings.Contains(err.Error(), "google import queue is required") {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestValidateGoogleRuntimeWiringWarnModeAllowsDegradedProvider(t *testing.T) {
	module := &ESignModule{
		googleEnabled:     true,
		googleImportQueue: &jobs.GoogleDriveImportQueue{},
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
		googleEnabled:     true,
		googleImportQueue: &jobs.GoogleDriveImportQueue{},
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

func TestResolveESignStrictStartupDefaultsFalse(t *testing.T) {
	t.Setenv("ESIGN_STRICT_STARTUP", "")
	if resolveESignStrictStartup() {
		t.Fatal("expected strict startup to default to false")
	}
}

func TestResolveESignStrictStartupParsesBooleanValues(t *testing.T) {
	t.Setenv("ESIGN_STRICT_STARTUP", "true")
	if !resolveESignStrictStartup() {
		t.Fatal("expected strict startup true for ESIGN_STRICT_STARTUP=true")
	}
	t.Setenv("ESIGN_STRICT_STARTUP", "invalid")
	if resolveESignStrictStartup() {
		t.Fatal("expected strict startup false for invalid boolean value")
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
