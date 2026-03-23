package release

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	appcfg "github.com/goliatone/go-admin/examples/esign/config"
	"github.com/goliatone/go-admin/examples/esign/fixtures"
	esignpersistence "github.com/goliatone/go-admin/examples/esign/internal/persistence"
	"github.com/goliatone/go-admin/examples/esign/services"
	"github.com/goliatone/go-admin/examples/esign/stores"
	"github.com/goliatone/go-uploader"
)

type SourceManagementValidationConfig struct{}

type SourceManagementValidationResult struct {
	BootstrapValidated             bool                          `json:"bootstrap_validated"`
	ContractGuardValidated         bool                          `json:"contract_guard_validated"`
	FixtureScenarioSeeded          bool                          `json:"fixture_scenario_seeded"`
	SourceListBootstrapped         bool                          `json:"source_list_bootstrapped"`
	SourceBrowserNavigationReady   bool                          `json:"source_browser_navigation_ready"`
	SourceDetailReadable           bool                          `json:"source_detail_readable"`
	RevisionHistoryReadable        bool                          `json:"revision_history_readable"`
	MultiHandleContinuityVisible   bool                          `json:"multi_handle_continuity_visible"`
	RelationshipSummariesReadable  bool                          `json:"relationship_summaries_readable"`
	SourceSearchCorrect            bool                          `json:"source_search_correct"`
	SourceCommentsReadable         bool                          `json:"source_comments_readable"`
	ProviderNeutralContractsStable bool                          `json:"provider_neutral_contracts_stable"`
	Scenario                       stores.LineageFixtureSet      `json:"scenario"`
	URLs                           fixtures.LineageFixtureURLSet `json:"urls"`
}

func RunSourceManagementValidationProfile(ctx context.Context, _ SourceManagementValidationConfig) (SourceManagementValidationResult, error) {
	if ctx == nil {
		ctx = context.Background()
	}

	repoRoot, err := DefaultRepoRoot()
	if err != nil {
		return SourceManagementValidationResult{}, err
	}
	guard, err := LoadV2ContractFreezeGuard(DefaultV2ContractFreezeGuardPath(repoRoot))
	if err != nil {
		return SourceManagementValidationResult{}, fmt.Errorf("load v2 source-management contract guard: %w", err)
	}
	guardIssues, err := ValidateV2ContractFreezeGuard(repoRoot, guard, time.Date(2026, 3, 22, 12, 0, 0, 0, time.UTC))
	if err != nil {
		return SourceManagementValidationResult{}, fmt.Errorf("validate v2 source-management contract guard: %w", err)
	}
	if len(guardIssues) != 0 {
		return SourceManagementValidationResult{}, fmt.Errorf("v2 source-management contract guard failed: %s", strings.Join(guardIssues, "; "))
	}

	cfg := appcfg.Defaults()
	cfg.Runtime.RepositoryDialect = appcfg.RepositoryDialectSQLite
	cfg.Persistence.Migrations.LocalOnly = true
	storeDSN, cleanup := resolveValidationSQLiteDSN("source-management-validation")
	if cleanup != nil {
		defer cleanup()
	}
	cfg.Persistence.SQLite.DSN = strings.TrimSpace(storeDSN)
	cfg.Persistence.Postgres.DSN = ""

	bootstrap, err := esignpersistence.Bootstrap(ctx, cfg)
	if err != nil {
		return SourceManagementValidationResult{}, fmt.Errorf("bootstrap source-management validation store: %w", err)
	}
	defer func() {
		_ = bootstrap.Close()
	}()

	store, storeCleanup, err := esignpersistence.NewStoreAdapter(bootstrap)
	if err != nil {
		return SourceManagementValidationResult{}, fmt.Errorf("create source-management validation store adapter: %w", err)
	}
	if storeCleanup != nil {
		defer func() {
			_ = storeCleanup()
		}()
	}

	uploadDir, err := os.MkdirTemp("", "go-admin-source-management-validation-upload-*")
	if err != nil {
		return SourceManagementValidationResult{}, fmt.Errorf("create source-management validation upload dir: %w", err)
	}
	defer func() {
		_ = os.RemoveAll(uploadDir)
	}()
	uploads := uploader.NewManager(uploader.WithProvider(uploader.NewFSProvider(uploadDir)))

	scope := stores.Scope{TenantID: "tenant-source-management-validation", OrgID: "org-source-management-validation"}
	fixtureSet, err := fixtures.EnsureLineageQAFixtures(ctx, bootstrap.BunDB, uploads, scope)
	if err != nil {
		return SourceManagementValidationResult{}, fmt.Errorf("seed source-management qa fixtures: %w", err)
	}
	lineageStore, err := RequireV2SourceManagementLineageStore(any(store))
	if err != nil {
		return SourceManagementValidationResult{}, fmt.Errorf("source-management validation store does not implement lineage store contracts: %w", err)
	}
	urls, err := fixtures.BuildLineageFixtureURLs("/admin", scope, fixtureSet)
	if err != nil {
		return SourceManagementValidationResult{}, fmt.Errorf("build source-management qa fixture urls: %w", err)
	}

	sourceSearch, err := services.NewGoSearchSourceSearchService(services.GoSearchSourceSearchConfig{
		Lineage: lineageStore,
	})
	if err != nil {
		return SourceManagementValidationResult{}, fmt.Errorf("build source-management go-search service: %w", err)
	}
	readModels := services.NewDefaultSourceReadModelService(
		store,
		store,
		lineageStore,
		services.WithSourceReadModelSearchService(sourceSearch),
	)
	listPage, err := readModels.ListSources(ctx, scope, services.SourceListQuery{Page: 1, PageSize: 10})
	if err != nil {
		return SourceManagementValidationResult{}, fmt.Errorf("list sources: %w", err)
	}
	detail, err := readModels.GetSourceDetail(ctx, scope, fixtureSet.SourceDocumentID)
	if err != nil {
		return SourceManagementValidationResult{}, fmt.Errorf("get source detail: %w", err)
	}
	revisions, err := readModels.ListSourceRevisions(ctx, scope, fixtureSet.SourceDocumentID, services.SourceRevisionListQuery{Page: 1, PageSize: 10})
	if err != nil {
		return SourceManagementValidationResult{}, fmt.Errorf("list source revisions: %w", err)
	}
	handles, err := readModels.ListSourceHandles(ctx, scope, fixtureSet.SourceDocumentID)
	if err != nil {
		return SourceManagementValidationResult{}, fmt.Errorf("list source handles: %w", err)
	}
	relationships, err := readModels.ListSourceRelationships(ctx, scope, fixtureSet.SourceDocumentID, services.SourceRelationshipListQuery{
		Status:   stores.SourceRelationshipStatusPendingReview,
		Page:     1,
		PageSize: 10,
	})
	if err != nil {
		return SourceManagementValidationResult{}, fmt.Errorf("list source relationships: %w", err)
	}
	searchByLegacyHandle, err := readModels.SearchSources(ctx, scope, services.SourceSearchQuery{
		Query:    "fixture-google-file-legacy",
		Page:     1,
		PageSize: 10,
	})
	if err != nil {
		return SourceManagementValidationResult{}, fmt.Errorf("search sources by legacy handle: %w", err)
	}
	searchByComment, err := readModels.SearchSources(ctx, scope, services.SourceSearchQuery{
		Query:       "Need legal approval",
		ResultKind:  services.SourceManagementSearchResultSourceRevision,
		Page:        1,
		PageSize:    10,
		HasComments: new(true),
	})
	if err != nil {
		return SourceManagementValidationResult{}, fmt.Errorf("search sources by comment text: %w", err)
	}
	comments, err := readModels.ListSourceRevisionComments(ctx, scope, fixtureSet.SecondSourceRevisionID, services.SourceCommentListQuery{
		Page:     1,
		PageSize: 10,
	})
	if err != nil {
		return SourceManagementValidationResult{}, fmt.Errorf("list source revision comments: %w", err)
	}

	if len(listPage.Items) < 2 {
		return SourceManagementValidationResult{}, fmt.Errorf("expected at least two sources in fresh-environment source list, got %d", len(listPage.Items))
	}
	if detail.Source == nil || strings.TrimSpace(detail.Source.ID) != strings.TrimSpace(fixtureSet.SourceDocumentID) {
		return SourceManagementValidationResult{}, fmt.Errorf("source detail did not resolve seeded canonical source")
	}
	if len(revisions.Items) < 2 || revisions.Items[0].Revision == nil || strings.TrimSpace(revisions.Items[0].Revision.ID) != strings.TrimSpace(fixtureSet.SecondSourceRevisionID) {
		return SourceManagementValidationResult{}, fmt.Errorf("revision history did not expose repeated revision ordering")
	}
	if revisions.Items[0].Provider == nil || strings.TrimSpace(revisions.Items[0].Provider.ExternalFileID) != "fixture-google-file-1" {
		return SourceManagementValidationResult{}, fmt.Errorf("latest revision did not expose the active provider handle continuity")
	}
	if revisions.Items[1].Provider == nil || strings.TrimSpace(revisions.Items[1].Provider.ExternalFileID) != "fixture-google-file-legacy" {
		return SourceManagementValidationResult{}, fmt.Errorf("historical revision did not expose the superseded legacy provider handle continuity")
	}
	if len(handles.Items) < 2 {
		return SourceManagementValidationResult{}, fmt.Errorf("multi-handle continuity fixture is missing from source handle page")
	}
	handleStatuses := make([]string, 0, len(handles.Items))
	handleExternalIDs := make([]string, 0, len(handles.Items))
	for _, handle := range handles.Items {
		handleStatuses = append(handleStatuses, strings.TrimSpace(handle.HandleStatus))
		handleExternalIDs = append(handleExternalIDs, strings.TrimSpace(handle.ExternalFileID))
	}
	sort.Strings(handleStatuses)
	sort.Strings(handleExternalIDs)
	if !contains(handleStatuses, stores.SourceHandleStatusActive) || !contains(handleStatuses, stores.SourceHandleStatusSuperseded) {
		return SourceManagementValidationResult{}, fmt.Errorf("expected active + superseded handles, got %+v", handleStatuses)
	}
	if !contains(handleExternalIDs, "fixture-google-file-legacy") {
		return SourceManagementValidationResult{}, fmt.Errorf("expected legacy continuity handle to be searchable, got %+v", handleExternalIDs)
	}
	if len(relationships.Items) == 0 || strings.TrimSpace(relationships.Items[0].ID) != strings.TrimSpace(fixtureSet.CandidateRelationshipID) {
		return SourceManagementValidationResult{}, fmt.Errorf("relationship summaries did not expose seeded pending candidate")
	}
	if len(searchByLegacyHandle.Items) == 0 || searchByLegacyHandle.Items[0].Source == nil || strings.TrimSpace(searchByLegacyHandle.Items[0].Source.ID) != strings.TrimSpace(fixtureSet.SourceDocumentID) {
		return SourceManagementValidationResult{}, fmt.Errorf("search by legacy handle did not discover canonical source")
	}
	if len(searchByComment.Items) == 0 || searchByComment.Items[0].Revision == nil || strings.TrimSpace(searchByComment.Items[0].Revision.ID) != strings.TrimSpace(fixtureSet.SecondSourceRevisionID) {
		return SourceManagementValidationResult{}, fmt.Errorf("search by comment text did not discover revision-scoped source result")
	}
	if len(comments.Items) == 0 || len(comments.Items[0].Messages) != 2 {
		return SourceManagementValidationResult{}, fmt.Errorf("source comment read did not expose seeded synced thread")
	}
	if err := rejectGoogleSpecificJSONKeys(detail, "source_detail"); err != nil {
		return SourceManagementValidationResult{}, err
	}
	if err := rejectGoogleSpecificJSONKeys(searchByComment, "source_search"); err != nil {
		return SourceManagementValidationResult{}, err
	}
	if err := rejectGoogleSpecificJSONKeys(comments, "source_comments"); err != nil {
		return SourceManagementValidationResult{}, err
	}

	return SourceManagementValidationResult{
		BootstrapValidated:             true,
		ContractGuardValidated:         true,
		FixtureScenarioSeeded:          true,
		SourceListBootstrapped:         len(listPage.Items) >= 2,
		SourceBrowserNavigationReady:   strings.TrimSpace(listPage.Items[0].Links.Self) != "" && strings.TrimSpace(detail.Links.Revisions) != "" && strings.TrimSpace(detail.Links.Comments) != "",
		SourceDetailReadable:           detail.Source != nil && strings.TrimSpace(detail.Source.ID) == strings.TrimSpace(fixtureSet.SourceDocumentID),
		RevisionHistoryReadable:        len(revisions.Items) >= 2,
		MultiHandleContinuityVisible:   len(handles.Items) >= 2,
		RelationshipSummariesReadable:  len(relationships.Items) >= 1,
		SourceSearchCorrect:            len(searchByLegacyHandle.Items) >= 1 && len(searchByComment.Items) >= 1,
		SourceCommentsReadable:         len(comments.Items) >= 1 && comments.SyncStatus == services.SourceManagementCommentSyncSynced,
		ProviderNeutralContractsStable: true,
		Scenario:                       fixtureSet,
		URLs:                           urls,
	}, nil
}

func ValidateV2SourceManagementStartup(
	ctx context.Context,
	repoRoot string,
	scope stores.Scope,
	store any,
	readModels services.SourceReadModelService,
) error {
	if ctx == nil {
		ctx = context.Background()
	}
	repoRoot = strings.TrimSpace(repoRoot)
	if repoRoot == "" {
		return fmt.Errorf("repo root is required")
	}
	lineageStore, err := RequireV2SourceManagementLineageStore(store)
	if err != nil {
		return err
	}
	if readModels == nil {
		return fmt.Errorf("source read model service is required for v2 source-management startup validation")
	}
	if _, err := lineageStore.ListSourceDocuments(ctx, scope, stores.SourceDocumentQuery{}); err != nil {
		return fmt.Errorf("validate source_documents store readiness: %w", err)
	}
	if _, err := lineageStore.ListSourceCommentThreads(ctx, scope, stores.SourceCommentThreadQuery{}); err != nil {
		return fmt.Errorf("validate source_comment_threads store readiness: %w", err)
	}
	if _, err := lineageStore.ListSourceCommentSyncStates(ctx, scope, stores.SourceCommentSyncStateQuery{}); err != nil {
		return fmt.Errorf("validate source_comment_sync_states store readiness: %w", err)
	}
	if _, err := readModels.ListSources(ctx, scope, services.SourceListQuery{Page: 1, PageSize: 1}); err != nil {
		return fmt.Errorf("validate source-management list service wiring: %w", err)
	}
	if _, err := readModels.SearchSources(ctx, scope, services.SourceSearchQuery{Page: 1, PageSize: 1}); err != nil {
		return fmt.Errorf("validate source-management go-search wiring: %w", err)
	}
	return nil
}

// RequireV2SourceManagementLineageStore enforces the lineage persistence contract required by Phase 14 startup validation.
func RequireV2SourceManagementLineageStore(store any) (stores.LineageStore, error) {
	if store == nil {
		return nil, fmt.Errorf("lineage-capable store is required for v2 source-management startup validation")
	}
	lineageStore, ok := store.(stores.LineageStore)
	if !ok {
		return nil, fmt.Errorf("lineage-capable store is required for v2 source-management startup validation")
	}
	return lineageStore, nil
}

func validateJSONFile(path string) error {
	raw, err := os.ReadFile(filepath.Clean(path))
	if err != nil {
		return err
	}
	var payload any
	if err := json.Unmarshal(raw, &payload); err != nil {
		return err
	}
	return nil
}

func rejectGoogleSpecificJSONKeys(payload any, label string) error {
	raw, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("marshal %s payload: %w", label, err)
	}
	var decoded any
	if err := json.Unmarshal(raw, &decoded); err != nil {
		return fmt.Errorf("unmarshal %s payload: %w", label, err)
	}
	return walkProviderNeutralKeys(decoded, label)
}

func walkProviderNeutralKeys(value any, path string) error {
	switch typed := value.(type) {
	case map[string]any:
		for key, child := range typed {
			if strings.HasPrefix(strings.TrimSpace(key), "google_") {
				return fmt.Errorf("%s exposes provider-specific key %s", path, key)
			}
			next := key
			if strings.TrimSpace(path) != "" {
				next = path + "." + key
			}
			if err := walkProviderNeutralKeys(child, next); err != nil {
				return err
			}
		}
	case []any:
		for idx, child := range typed {
			if err := walkProviderNeutralKeys(child, fmt.Sprintf("%s[%d]", path, idx)); err != nil {
				return err
			}
		}
	}
	return nil
}

func contains(values []string, target string) bool {
	target = strings.TrimSpace(target)
	for _, value := range values {
		if strings.TrimSpace(value) == target {
			return true
		}
	}
	return false
}

//go:fix inline
func boolPtr(value bool) *bool {
	return new(value)
}
