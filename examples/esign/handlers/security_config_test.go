package handlers

import (
	"context"
	"testing"

	"github.com/goliatone/go-admin/examples/esign/jobs"
	"github.com/goliatone/go-admin/examples/esign/services"
	"github.com/goliatone/go-admin/examples/esign/stores"
)

func TestGoogleRuntimeConfigValidateRejectsPartialAsyncWiring(t *testing.T) {
	cfg := GoogleRuntimeConfig{
		ImportRuns: stores.NewInMemoryStore(),
	}
	if err := cfg.Validate(); err == nil {
		t.Fatal("expected validation error for partial async google runtime wiring")
	}
}

func TestGoogleRuntimeConfigValidateRejectsNonTransactionalJobStore(t *testing.T) {
	store := stores.NewInMemoryStore()
	cfg := GoogleRuntimeConfig{
		Integration:   services.NewGoogleIntegrationService(store, services.NewDeterministicGoogleProvider(), services.NewDocumentService(store), services.NewAgreementService(store)),
		ImportRuns:    store,
		ImportJobs:    nonTransactionalJobRunStore{JobRunStore: store},
		ImportEnqueue: func(context.Context, jobs.GoogleDriveImportMsg) error { return nil },
	}
	if err := cfg.Validate(); err == nil {
		t.Fatal("expected validation error for non-transactional job store")
	}
}

func TestBuildRegisterConfigRejectsEnabledGoogleWithoutService(t *testing.T) {
	_, err := buildRegisterConfig([]RegisterOption{
		WithGoogleRuntime(GoogleRuntimeConfig{
			Enabled: true,
		}),
	})
	if err == nil {
		t.Fatal("expected buildRegisterConfig error when google runtime is enabled without service")
	}
}

func TestBuildRegisterConfigAcceptsCompleteGoogleRuntimeBundle(t *testing.T) {
	store := stores.NewInMemoryStore()
	google := services.NewGoogleIntegrationService(
		store,
		services.NewDeterministicGoogleProvider(),
		services.NewDocumentService(store),
		services.NewAgreementService(store),
	)
	cfg, err := buildRegisterConfig([]RegisterOption{
		WithGoogleRuntime(GoogleRuntimeConfig{
			Enabled:     true,
			Integration: google,
			ImportRuns:  store,
			ImportJobs:  store,
			ImportEnqueue: func(context.Context, jobs.GoogleDriveImportMsg) error {
				return nil
			},
		}),
	})
	if err != nil {
		t.Fatalf("buildRegisterConfig: %v", err)
	}
	if !cfg.googleEnabled || cfg.google == nil || cfg.googleImportRuns == nil || cfg.googleImportEnqueue == nil {
		t.Fatalf("expected google runtime config to be applied, got %+v", cfg)
	}
}

type nonTransactionalJobRunStore struct {
	stores.JobRunStore
}
