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
	if !result.SourceListBootstrapped || !result.SourceBrowserNavigationReady || !result.SourceDetailReadable || !result.SourceWorkspaceReadable {
		t.Fatalf("expected source browser and workspace landing-zone coverage, got %+v", result)
	}
	if !result.RevisionHistoryReadable || !result.RevisionTimelineReadable || !result.MultiHandleContinuityVisible || !result.RelationshipSummariesReadable {
		t.Fatalf("expected revision, timeline, handle continuity, and relationship coverage, got %+v", result)
	}
	if !result.SourceAgreementsReadable || !result.SourceArtifactsReadable || !result.SourceSearchCorrect || !result.SourceCommentsReadable || !result.ProviderNeutralContractsStable {
		t.Fatalf("expected agreements, artifacts, search, comments, and provider-neutral contract coverage, got %+v", result)
	}
	if result.Scenario.SourceDocumentID == "" || result.Scenario.SecondSourceRevisionID == "" || result.Scenario.CandidateRelationshipID == "" {
		t.Fatalf("expected seeded scenario ids, got %+v", result.Scenario)
	}
	if result.URLs.ImportedDocumentURL == "" || result.URLs.ImportedAgreementURL == "" {
		t.Fatalf("expected seeded QA urls, got %+v", result.URLs)
	}
}

func TestValidateV2SourceManagementStartupRequiresGoSearchWiring(t *testing.T) {
	repoRoot, err := DefaultRepoRoot()
	if err != nil {
		t.Fatalf("DefaultRepoRoot: %v", err)
	}
	store := stores.NewInMemoryStore()
	readModels := services.NewDefaultSourceReadModelService(
		store,
		store,
		store,
		services.WithSourceReadModelSearchService(failingSourceSearchService{}),
	)

	err = ValidateV2SourceManagementStartup(context.Background(), repoRoot, stores.Scope{TenantID: "tenant-startup", OrgID: "org-startup"}, store, readModels)
	if err == nil {
		t.Fatal("expected startup validation error when go-search wiring fails")
	}
	if !strings.Contains(err.Error(), "go-search") {
		t.Fatalf("unexpected startup validation error: %v", err)
	}
}

func TestValidateV2SourceManagementStartupRequiresLineageCapableStore(t *testing.T) {
	repoRoot, err := DefaultRepoRoot()
	if err != nil {
		t.Fatalf("DefaultRepoRoot: %v", err)
	}

	err = ValidateV2SourceManagementStartup(
		context.Background(),
		repoRoot,
		stores.Scope{TenantID: "tenant-startup", OrgID: "org-startup"},
		nonLineageStartupStore{Store: stores.NewInMemoryStore()},
		nil,
	)
	if err == nil {
		t.Fatal("expected startup validation error when store does not expose lineage contracts")
	}
	if !strings.Contains(err.Error(), "lineage-capable store is required") {
		t.Fatalf("unexpected startup validation error: %v", err)
	}
}

func TestValidateV2SourceManagementStartupDoesNotRequireReleaseSnapshots(t *testing.T) {
	store := stores.NewInMemoryStore()
	readModels := services.NewDefaultSourceReadModelService(store, store, store)

	err := ValidateV2SourceManagementStartup(
		context.Background(),
		t.TempDir(),
		stores.Scope{TenantID: "tenant-startup", OrgID: "org-startup"},
		store,
		readModels,
	)
	if err != nil {
		t.Fatalf("expected runtime readiness validation to ignore release snapshots, got %v", err)
	}
}

type nonLineageStartupStore struct {
	stores.Store
}

type failingSourceSearchService struct{}

func (failingSourceSearchService) Search(context.Context, stores.Scope, services.SourceSearchQuery) (services.SourceSearchResults, error) {
	return services.SourceSearchResults{}, fmt.Errorf("go-search unavailable")
}

func (failingSourceSearchService) ReindexSourceDocument(context.Context, stores.Scope, string) (services.SourceSearchIndexResult, error) {
	return services.SourceSearchIndexResult{}, fmt.Errorf("go-search unavailable")
}

func (failingSourceSearchService) ReindexSourceRevision(context.Context, stores.Scope, string) (services.SourceSearchIndexResult, error) {
	return services.SourceSearchIndexResult{}, fmt.Errorf("go-search unavailable")
}
