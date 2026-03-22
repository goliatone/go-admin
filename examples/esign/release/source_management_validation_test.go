package release

import (
	"context"
	"fmt"
	"strings"
	"testing"

	"github.com/goliatone/go-admin/examples/esign/services"
	"github.com/goliatone/go-admin/examples/esign/stores"
)

func TestRunSourceManagementValidationProfileCoversPhase14LandingZone(t *testing.T) {
	result, err := RunSourceManagementValidationProfile(context.Background(), SourceManagementValidationConfig{})
	if err != nil {
		t.Fatalf("RunSourceManagementValidationProfile: %v", err)
	}
	if !result.BootstrapValidated || !result.ContractGuardValidated || !result.FixtureScenarioSeeded {
		t.Fatalf("expected bootstrap, guard, and fixture validation, got %+v", result)
	}
	if !result.SourceListBootstrapped || !result.SourceBrowserNavigationReady || !result.SourceDetailReadable {
		t.Fatalf("expected source browser landing-zone coverage, got %+v", result)
	}
	if !result.RevisionHistoryReadable || !result.MultiHandleContinuityVisible || !result.RelationshipSummariesReadable {
		t.Fatalf("expected revision, handle continuity, and relationship coverage, got %+v", result)
	}
	if !result.SourceSearchCorrect || !result.SourceCommentsReadable || !result.ProviderNeutralContractsStable {
		t.Fatalf("expected search, comments, and provider-neutral contract coverage, got %+v", result)
	}
	if result.Scenario.SourceDocumentID == "" || result.Scenario.SecondSourceRevisionID == "" || result.Scenario.CandidateRelationshipID == "" {
		t.Fatalf("expected seeded scenario ids, got %+v", result.Scenario)
	}
	if result.URLs.ImportedDocumentURL == "" || result.URLs.ImportedAgreementURL == "" {
		t.Fatalf("expected seeded QA urls, got %+v", result.URLs)
	}
}

func TestValidateV2SourceManagementStartupRequiresSearchStoreReadiness(t *testing.T) {
	repoRoot, err := DefaultRepoRoot()
	if err != nil {
		t.Fatalf("DefaultRepoRoot: %v", err)
	}
	store := failingSourceManagementStartupStore{InMemoryStore: stores.NewInMemoryStore(), failSearchDocuments: true}
	readModels := services.NewDefaultSourceReadModelService(store, store, store)

	err = ValidateV2SourceManagementStartup(context.Background(), repoRoot, stores.Scope{TenantID: "tenant-startup", OrgID: "org-startup"}, store, readModels)
	if err == nil {
		t.Fatal("expected startup validation error when source search store readiness fails")
	}
	if !strings.Contains(err.Error(), "source_search_documents") {
		t.Fatalf("unexpected startup validation error: %v", err)
	}
}

type failingSourceManagementStartupStore struct {
	*stores.InMemoryStore
	failSearchDocuments bool
}

func (s failingSourceManagementStartupStore) ListSourceSearchDocuments(ctx context.Context, scope stores.Scope, query stores.SourceSearchDocumentQuery) ([]stores.SourceSearchDocumentRecord, error) {
	if s.failSearchDocuments {
		return nil, fmt.Errorf("simulated source_search_documents failure")
	}
	return s.InMemoryStore.ListSourceSearchDocuments(ctx, scope, query)
}
