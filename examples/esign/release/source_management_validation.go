package release

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"sort"
	"strings"
	"time"

	searchtypes "github.com/goliatone/go-search/pkg/types"

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
	SourceWorkspaceReadable        bool                          `json:"source_workspace_readable"`
	RevisionHistoryReadable        bool                          `json:"revision_history_readable"`
	RevisionTimelineReadable       bool                          `json:"revision_timeline_readable"`
	MultiHandleContinuityVisible   bool                          `json:"multi_handle_continuity_visible"`
	RelationshipSummariesReadable  bool                          `json:"relationship_summaries_readable"`
	SourceAgreementsReadable       bool                          `json:"source_agreements_readable"`
	SourceArtifactsReadable        bool                          `json:"source_artifacts_readable"`
	SourceSearchCorrect            bool                          `json:"source_search_correct"`
	SearchIndexReady               bool                          `json:"search_index_ready"`
	SearchProviderMetadataVisible  bool                          `json:"search_provider_metadata_visible"`
	SearchNormalizedTextCorrect    bool                          `json:"search_normalized_text_correct"`
	SearchAgreementTitleCorrect    bool                          `json:"search_agreement_title_correct"`
	SourceCommentsReadable         bool                          `json:"source_comments_readable"`
	QueueReadable                  bool                          `json:"queue_readable"`
	QueueActionSucceeded           bool                          `json:"queue_action_succeeded"`
	ProviderNeutralContractsStable bool                          `json:"provider_neutral_contracts_stable"`
	Scenario                       stores.LineageFixtureSet      `json:"scenario"`
	URLs                           fixtures.LineageFixtureURLSet `json:"urls"`
}

type sourceSearchOperationalStatus interface {
	HealthStatus(ctx context.Context, scope stores.Scope) (searchtypes.HealthStatus, error)
	StatsSnapshot(ctx context.Context, scope stores.Scope) (searchtypes.StatsResult, error)
}

func RunSourceManagementValidationProfile(ctx context.Context, _ SourceManagementValidationConfig) (SourceManagementValidationResult, error) {
	if ctx == nil {
		ctx = context.Background()
	}
	validationCtx, err := newSourceManagementValidationContext(ctx)
	if err != nil {
		return SourceManagementValidationResult{}, err
	}
	defer validationCtx.close()
	snapshot, err := runSourceManagementValidationReads(ctx, validationCtx)
	if err != nil {
		return SourceManagementValidationResult{}, err
	}
	if err := validateSourceManagementSnapshot(snapshot, validationCtx.fixtureSet); err != nil {
		return SourceManagementValidationResult{}, err
	}
	return buildSourceManagementValidationResult(validationCtx, snapshot), nil
}

type sourceManagementValidationContext struct {
	repoRoot     string
	bootstrap    *esignpersistence.BootstrapResult
	store        stores.Store
	storeCleanup func() error
	uploadDir    string
	scope        stores.Scope
	fixtureSet   stores.LineageFixtureSet
	urls         fixtures.LineageFixtureURLSet
	lineageStore stores.LineageStore
	sourceSearch services.SourceSearchService
	readModels   services.SourceReadModelService
}

type sourceManagementValidationSnapshot struct {
	listPage               services.SourceListPage
	detail                 services.SourceDetail
	workspace              services.SourceWorkspace
	revisions              services.SourceRevisionPage
	handles                services.SourceHandlePage
	relationships          services.SourceRelationshipPage
	agreements             services.SourceAgreementPage
	searchByLegacyHandle   services.SourceSearchResults
	searchByNormalizedText services.SourceSearchResults
	searchByComment        services.SourceSearchResults
	searchByAgreementTitle services.SourceSearchResults
	comments               services.SourceCommentPage
	queue                  services.ReconciliationQueuePage
	queueCandidate         services.ReconciliationCandidateDetail
	searchHealth           searchtypes.HealthStatus
	searchStats            searchtypes.StatsResult
	reviewed               services.CandidateWarningSummary
	queueAfterReview       services.ReconciliationQueuePage
}

func newSourceManagementValidationContext(ctx context.Context) (*sourceManagementValidationContext, error) {
	repoRoot, err := DefaultRepoRoot()
	if err != nil {
		return nil, err
	}
	if guardErr := validateSourceManagementContractGuard(repoRoot); guardErr != nil {
		return nil, guardErr
	}
	bootstrap, store, storeCleanup, uploadDir, err := bootstrapSourceManagementValidationRuntime(ctx)
	if err != nil {
		return nil, err
	}
	scope := stores.Scope{TenantID: "tenant-source-management-validation", OrgID: "org-source-management-validation"}
	uploads := uploader.NewManager(uploader.WithProvider(uploader.NewFSProvider(uploadDir)))
	fixtureSet, lineageStore, urls, err := seedSourceManagementValidationFixtures(ctx, bootstrap, store, uploads, scope)
	if err != nil {
		_ = bootstrap.Close()
		if storeCleanup != nil {
			_ = storeCleanup()
		}
		_ = os.RemoveAll(uploadDir)
		return nil, err
	}
	sourceSearch, readModels, err := buildSourceManagementValidationServices(store, lineageStore)
	if err != nil {
		_ = bootstrap.Close()
		if storeCleanup != nil {
			_ = storeCleanup()
		}
		_ = os.RemoveAll(uploadDir)
		return nil, err
	}
	return &sourceManagementValidationContext{
		repoRoot:     repoRoot,
		bootstrap:    bootstrap,
		store:        store,
		storeCleanup: storeCleanup,
		uploadDir:    uploadDir,
		scope:        scope,
		fixtureSet:   fixtureSet,
		urls:         urls,
		lineageStore: lineageStore,
		sourceSearch: sourceSearch,
		readModels:   readModels,
	}, nil
}

func (c *sourceManagementValidationContext) close() {
	if c == nil {
		return
	}
	if c.bootstrap != nil {
		_ = c.bootstrap.Close()
	}
	if c.storeCleanup != nil {
		_ = c.storeCleanup()
	}
	if strings.TrimSpace(c.uploadDir) != "" {
		_ = os.RemoveAll(c.uploadDir)
	}
}

func validateSourceManagementContractGuard(repoRoot string) error {
	guard, err := LoadV2ContractFreezeGuard(DefaultV2ContractFreezeGuardPath(repoRoot))
	if err != nil {
		return fmt.Errorf("load v2 source-management contract guard: %w", err)
	}
	guardIssues, err := ValidateV2ContractFreezeGuard(repoRoot, guard, time.Date(2026, 3, 22, 12, 0, 0, 0, time.UTC))
	if err != nil {
		return fmt.Errorf("validate v2 source-management contract guard: %w", err)
	}
	if len(guardIssues) != 0 {
		return fmt.Errorf("v2 source-management contract guard failed: %s", strings.Join(guardIssues, "; "))
	}
	return nil
}

func bootstrapSourceManagementValidationRuntime(ctx context.Context) (*esignpersistence.BootstrapResult, stores.Store, func() error, string, error) {
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
		return nil, nil, nil, "", fmt.Errorf("bootstrap source-management validation store: %w", err)
	}
	store, storeCleanup, err := esignpersistence.NewStoreAdapter(bootstrap)
	if err != nil {
		_ = bootstrap.Close()
		return nil, nil, nil, "", fmt.Errorf("create source-management validation store adapter: %w", err)
	}
	uploadDir, err := os.MkdirTemp("", "go-admin-source-management-validation-upload-*")
	if err != nil {
		_ = bootstrap.Close()
		if storeCleanup != nil {
			_ = storeCleanup()
		}
		return nil, nil, nil, "", fmt.Errorf("create source-management validation upload dir: %w", err)
	}
	return bootstrap, store, storeCleanup, uploadDir, nil
}

func seedSourceManagementValidationFixtures(
	ctx context.Context,
	bootstrap *esignpersistence.BootstrapResult,
	store stores.Store,
	uploads *uploader.Manager,
	scope stores.Scope,
) (stores.LineageFixtureSet, stores.LineageStore, fixtures.LineageFixtureURLSet, error) {
	fixtureSet, err := fixtures.EnsureLineageQAFixtures(ctx, bootstrap.BunDB, uploads, scope)
	if err != nil {
		return stores.LineageFixtureSet{}, nil, fixtures.LineageFixtureURLSet{}, fmt.Errorf("seed source-management qa fixtures: %w", err)
	}
	lineageStore, err := RequireV2SourceManagementLineageStore(any(store))
	if err != nil {
		return stores.LineageFixtureSet{}, nil, fixtures.LineageFixtureURLSet{}, fmt.Errorf("source-management validation store does not implement lineage store contracts: %w", err)
	}
	urls, err := fixtures.BuildLineageFixtureURLs("/admin", scope, fixtureSet)
	if err != nil {
		return stores.LineageFixtureSet{}, nil, fixtures.LineageFixtureURLSet{}, fmt.Errorf("build source-management qa fixture urls: %w", err)
	}
	return fixtureSet, lineageStore, urls, nil
}

func buildSourceManagementValidationServices(store stores.Store, lineageStore stores.LineageStore) (services.SourceSearchService, services.SourceReadModelService, error) {
	sourceSearch, err := services.NewGoSearchSourceSearchService(services.GoSearchSourceSearchConfig{
		Lineage: lineageStore,
	})
	if err != nil {
		return nil, nil, fmt.Errorf("build source-management go-search service: %w", err)
	}
	readModels := services.NewDefaultSourceReadModelService(
		store,
		store,
		lineageStore,
		services.WithSourceReadModelSearchService(sourceSearch),
	)
	return sourceSearch, readModels, nil
}

func runSourceManagementValidationReads(ctx context.Context, validationCtx *sourceManagementValidationContext) (sourceManagementValidationSnapshot, error) {
	snapshot := sourceManagementValidationSnapshot{}
	if err := readSourceManagementCoreViews(ctx, validationCtx, &snapshot); err != nil {
		return snapshot, err
	}
	if err := readSourceManagementSearchViews(ctx, validationCtx.scope, validationCtx.fixtureSet, validationCtx.readModels, &snapshot); err != nil {
		return snapshot, err
	}
	if err := readSourceManagementQueueViews(ctx, validationCtx, &snapshot); err != nil {
		return snapshot, err
	}
	return snapshot, nil
}

func readSourceManagementCoreViews(
	ctx context.Context,
	validationCtx *sourceManagementValidationContext,
	snapshot *sourceManagementValidationSnapshot,
) error {
	scope := validationCtx.scope
	fixtureSet := validationCtx.fixtureSet
	readModels := validationCtx.readModels
	var err error

	if snapshot.listPage, err = readModels.ListSources(ctx, scope, services.SourceListQuery{Page: 1, PageSize: 10}); err != nil {
		return fmt.Errorf("list sources: %w", err)
	}
	if snapshot.detail, err = readModels.GetSourceDetail(ctx, scope, fixtureSet.SourceDocumentID); err != nil {
		return fmt.Errorf("get source detail: %w", err)
	}
	if snapshot.workspace, err = readModels.GetSourceWorkspace(ctx, scope, fixtureSet.SourceDocumentID, services.SourceWorkspaceQuery{
		Panel:  services.SourceWorkspacePanelAgreements,
		Anchor: "agreement:" + fixtureSet.ImportedAgreementID,
	}); err != nil {
		return fmt.Errorf("get source workspace: %w", err)
	}
	if snapshot.revisions, err = readModels.ListSourceRevisions(ctx, scope, fixtureSet.SourceDocumentID, services.SourceRevisionListQuery{Page: 1, PageSize: 10}); err != nil {
		return fmt.Errorf("list source revisions: %w", err)
	}
	if snapshot.handles, err = readModels.ListSourceHandles(ctx, scope, fixtureSet.SourceDocumentID); err != nil {
		return fmt.Errorf("list source handles: %w", err)
	}
	if snapshot.relationships, err = readModels.ListSourceRelationships(ctx, scope, fixtureSet.SourceDocumentID, services.SourceRelationshipListQuery{
		Status:   stores.SourceRelationshipStatusPendingReview,
		Page:     1,
		PageSize: 10,
	}); err != nil {
		return fmt.Errorf("list source relationships: %w", err)
	}
	if snapshot.agreements, err = readModels.ListSourceAgreements(ctx, scope, fixtureSet.SourceDocumentID, services.SourceAgreementListQuery{Page: 1, PageSize: 10}); err != nil {
		return fmt.Errorf("list source agreements: %w", err)
	}
	return nil
}

func readSourceManagementSearchViews(
	ctx context.Context,
	scope stores.Scope,
	fixtureSet stores.LineageFixtureSet,
	readModels services.SourceReadModelService,
	snapshot *sourceManagementValidationSnapshot,
) error {
	var err error

	if snapshot.searchByLegacyHandle, err = readModels.SearchSources(ctx, scope, services.SourceSearchQuery{Query: "fixture-google-file-legacy", Page: 1, PageSize: 10}); err != nil {
		return fmt.Errorf("search sources by legacy handle: %w", err)
	}
	if snapshot.searchByNormalizedText, err = readModels.SearchSources(ctx, scope, services.SourceSearchQuery{Query: "fixture normalized text for repeated revision", ResultKind: services.SourceManagementSearchResultSourceRevision, Page: 1, PageSize: 10}); err != nil {
		return fmt.Errorf("search sources by normalized text: %w", err)
	}
	if snapshot.searchByComment, err = readModels.SearchSources(ctx, scope, services.SourceSearchQuery{Query: "Need legal approval", ResultKind: services.SourceManagementSearchResultSourceRevision, Page: 1, PageSize: 10, HasComments: new(true)}); err != nil {
		return fmt.Errorf("search sources by comment text: %w", err)
	}
	if snapshot.searchByAgreementTitle, err = readModels.SearchSources(ctx, scope, services.SourceSearchQuery{Query: "Imported Fixture Agreement", Page: 1, PageSize: 10}); err != nil {
		return fmt.Errorf("search sources by agreement title: %w", err)
	}
	if snapshot.comments, err = readModels.ListSourceRevisionComments(ctx, scope, fixtureSet.SecondSourceRevisionID, services.SourceCommentListQuery{Page: 1, PageSize: 10}); err != nil {
		return fmt.Errorf("list source revision comments: %w", err)
	}
	return nil
}

func readSourceManagementQueueViews(
	ctx context.Context,
	validationCtx *sourceManagementValidationContext,
	snapshot *sourceManagementValidationSnapshot,
) error {
	scope := validationCtx.scope
	fixtureSet := validationCtx.fixtureSet
	readModels := validationCtx.readModels
	var err error

	if snapshot.queue, err = readModels.ListReconciliationQueue(ctx, scope, services.ReconciliationQueueQuery{Sort: "confidence_desc", Page: 1, PageSize: 10}); err != nil {
		return fmt.Errorf("list reconciliation queue: %w", err)
	}
	if snapshot.queueCandidate, err = readModels.GetReconciliationCandidate(ctx, scope, fixtureSet.CandidateRelationshipID); err != nil {
		return fmt.Errorf("get reconciliation candidate: %w", err)
	}
	if snapshot.searchHealth, snapshot.searchStats, err = sourceManagementValidationSearchStatus(ctx, scope, validationCtx.sourceSearch); err != nil {
		return err
	}
	if snapshot.reviewed, snapshot.queueAfterReview, err = applySourceManagementValidationReview(ctx, scope, fixtureSet, validationCtx.lineageStore, validationCtx.sourceSearch, readModels); err != nil {
		return err
	}
	return nil
}

func sourceManagementValidationSearchStatus(
	ctx context.Context,
	scope stores.Scope,
	sourceSearch services.SourceSearchService,
) (searchtypes.HealthStatus, searchtypes.StatsResult, error) {
	searchHealth := searchtypes.HealthStatus{}
	searchStats := searchtypes.StatsResult{}
	operational, ok := any(sourceSearch).(sourceSearchOperationalStatus)
	if !ok {
		return searchHealth, searchStats, nil
	}
	var err error
	if searchHealth, err = operational.HealthStatus(ctx, scope); err != nil {
		return searchHealth, searchStats, fmt.Errorf("query source-management go-search health: %w", err)
	}
	if searchStats, err = operational.StatsSnapshot(ctx, scope); err != nil {
		return searchHealth, searchStats, fmt.Errorf("query source-management go-search stats: %w", err)
	}
	return searchHealth, searchStats, nil
}

func applySourceManagementValidationReview(
	ctx context.Context,
	scope stores.Scope,
	fixtureSet stores.LineageFixtureSet,
	lineageStore stores.LineageStore,
	sourceSearch services.SourceSearchService,
	readModels services.SourceReadModelService,
) (services.CandidateWarningSummary, services.ReconciliationQueuePage, error) {
	reconciliation := services.NewDefaultSourceReconciliationService(
		lineageStore,
		services.WithSourceReconciliationSearchService(sourceSearch),
	)
	reviewed, err := reconciliation.ApplyReviewAction(ctx, scope, services.SourceRelationshipReviewInput{
		RelationshipID:  fixtureSet.CandidateRelationshipID,
		Action:          services.SourceRelationshipActionConfirm,
		ConfirmBehavior: services.SourceRelationshipActionRelated,
		ActorID:         "fixture-reviewer",
		Reason:          "phase18_validation_related_confirmation",
	})
	if err != nil {
		return services.CandidateWarningSummary{}, services.ReconciliationQueuePage{}, fmt.Errorf("apply reconciliation review action: %w", err)
	}
	queueAfterReview, err := readModels.ListReconciliationQueue(ctx, scope, services.ReconciliationQueueQuery{Sort: "confidence_desc", Page: 1, PageSize: 10})
	if err != nil {
		return services.CandidateWarningSummary{}, services.ReconciliationQueuePage{}, fmt.Errorf("list reconciliation queue after review: %w", err)
	}
	return reviewed, queueAfterReview, nil
}

func validateSourceManagementSnapshot(snapshot sourceManagementValidationSnapshot, fixtureSet stores.LineageFixtureSet) error {
	if len(snapshot.listPage.Items) < 2 {
		return fmt.Errorf("expected at least two sources in fresh-environment source list, got %d", len(snapshot.listPage.Items))
	}
	if snapshot.detail.Source == nil || strings.TrimSpace(snapshot.detail.Source.ID) != strings.TrimSpace(fixtureSet.SourceDocumentID) {
		return fmt.Errorf("source detail did not resolve seeded canonical source")
	}
	if err := validateSourceManagementReadModels(snapshot, fixtureSet); err != nil {
		return err
	}
	if err := validateSourceManagementSearchAndQueue(snapshot, fixtureSet); err != nil {
		return err
	}
	return validateSourceManagementProviderNeutralContracts(snapshot)
}

func validateSourceManagementReadModels(snapshot sourceManagementValidationSnapshot, fixtureSet stores.LineageFixtureSet) error {
	if err := validateSourceManagementDetailAndWorkspace(snapshot, fixtureSet); err != nil {
		return err
	}
	if err := validateSourceManagementRevisionViews(snapshot, fixtureSet); err != nil {
		return err
	}
	if err := validateSourceManagementHandleViews(snapshot); err != nil {
		return err
	}
	return validateSourceManagementRelationshipViews(snapshot, fixtureSet)
}

func validateSourceManagementSearchAndQueue(snapshot sourceManagementValidationSnapshot, fixtureSet stores.LineageFixtureSet) error {
	if err := validateSourceManagementSearchResults(snapshot, fixtureSet); err != nil {
		return err
	}
	if err := validateSourceManagementQueueReview(snapshot, fixtureSet); err != nil {
		return err
	}
	return validateSourceManagementSearchHealth(snapshot)
}

func validateSourceManagementDetailAndWorkspace(snapshot sourceManagementValidationSnapshot, fixtureSet stores.LineageFixtureSet) error {
	if snapshot.detail.Source == nil || strings.TrimSpace(snapshot.detail.Source.ID) != strings.TrimSpace(fixtureSet.SourceDocumentID) {
		return fmt.Errorf("source detail did not resolve seeded canonical source")
	}
	if snapshot.workspace.Source == nil || strings.TrimSpace(snapshot.workspace.Source.ID) != strings.TrimSpace(fixtureSet.SourceDocumentID) {
		return fmt.Errorf("source workspace did not resolve seeded canonical source")
	}
	if strings.TrimSpace(snapshot.workspace.ActivePanel) != services.SourceWorkspacePanelAgreements || len(snapshot.workspace.Timeline.Entries) < 2 {
		return fmt.Errorf("source workspace did not expose timeline and active panel continuity")
	}
	return nil
}

func validateSourceManagementRevisionViews(snapshot sourceManagementValidationSnapshot, fixtureSet stores.LineageFixtureSet) error {
	if len(snapshot.revisions.Items) < 2 || snapshot.revisions.Items[0].Revision == nil || strings.TrimSpace(snapshot.revisions.Items[0].Revision.ID) != strings.TrimSpace(fixtureSet.SecondSourceRevisionID) {
		return fmt.Errorf("revision history did not expose repeated revision ordering")
	}
	if snapshot.revisions.Items[0].Provider == nil || strings.TrimSpace(snapshot.revisions.Items[0].Provider.ExternalFileID) != "fixture-google-file-1" {
		return fmt.Errorf("latest revision did not expose the active provider handle continuity")
	}
	if snapshot.revisions.Items[1].Provider == nil || strings.TrimSpace(snapshot.revisions.Items[1].Provider.ExternalFileID) != "fixture-google-file-legacy" {
		return fmt.Errorf("historical revision did not expose the superseded legacy provider handle continuity")
	}
	return nil
}

func validateSourceManagementHandleViews(snapshot sourceManagementValidationSnapshot) error {
	if len(snapshot.handles.Items) < 2 {
		return fmt.Errorf("multi-handle continuity fixture is missing from source handle page")
	}
	handleStatuses := make([]string, 0, len(snapshot.handles.Items))
	handleExternalIDs := make([]string, 0, len(snapshot.handles.Items))
	for _, handle := range snapshot.handles.Items {
		handleStatuses = append(handleStatuses, strings.TrimSpace(handle.HandleStatus))
		handleExternalIDs = append(handleExternalIDs, strings.TrimSpace(handle.ExternalFileID))
	}
	sort.Strings(handleStatuses)
	sort.Strings(handleExternalIDs)
	if !contains(handleStatuses, stores.SourceHandleStatusActive) || !contains(handleStatuses, stores.SourceHandleStatusSuperseded) {
		return fmt.Errorf("expected active + superseded handles, got %+v", handleStatuses)
	}
	if !contains(handleExternalIDs, "fixture-google-file-legacy") {
		return fmt.Errorf("expected legacy continuity handle to be searchable, got %+v", handleExternalIDs)
	}
	return nil
}

func validateSourceManagementRelationshipViews(snapshot sourceManagementValidationSnapshot, fixtureSet stores.LineageFixtureSet) error {
	if len(snapshot.relationships.Items) == 0 || strings.TrimSpace(snapshot.relationships.Items[0].ID) != strings.TrimSpace(fixtureSet.CandidateRelationshipID) {
		return fmt.Errorf("relationship summaries did not expose seeded pending candidate")
	}
	if len(snapshot.agreements.Items) < 2 {
		return fmt.Errorf("source agreement summaries did not expose revision-pinned agreement history")
	}
	if got := strings.TrimSpace(snapshot.agreements.Items[0].Links.Agreement); got == "" {
		return fmt.Errorf("source agreements did not expose stable agreement detail links")
	}
	if len(snapshot.workspace.Artifacts.Items) < 2 {
		return fmt.Errorf("source workspace artifacts did not expose multi-artifact history")
	}
	if len(snapshot.comments.Items) == 0 || len(snapshot.comments.Items[0].Messages) != 2 {
		return fmt.Errorf("source comment read did not expose seeded synced thread")
	}
	return nil
}

func validateSourceManagementSearchResults(snapshot sourceManagementValidationSnapshot, fixtureSet stores.LineageFixtureSet) error {
	if len(snapshot.searchByLegacyHandle.Items) == 0 || snapshot.searchByLegacyHandle.Items[0].Source == nil || strings.TrimSpace(snapshot.searchByLegacyHandle.Items[0].Source.ID) != strings.TrimSpace(fixtureSet.SourceDocumentID) {
		return fmt.Errorf("search by legacy handle did not discover canonical source")
	}
	if len(snapshot.searchByNormalizedText.Items) == 0 || snapshot.searchByNormalizedText.Items[0].Revision == nil || strings.TrimSpace(snapshot.searchByNormalizedText.Items[0].Revision.ID) != strings.TrimSpace(fixtureSet.SecondSourceRevisionID) {
		return fmt.Errorf("search by normalized text did not discover revision-scoped source result")
	}
	if len(snapshot.searchByComment.Items) == 0 || snapshot.searchByComment.Items[0].Revision == nil || strings.TrimSpace(snapshot.searchByComment.Items[0].Revision.ID) != strings.TrimSpace(fixtureSet.SecondSourceRevisionID) {
		return fmt.Errorf("search by comment text did not discover revision-scoped source result")
	}
	if len(snapshot.searchByAgreementTitle.Items) == 0 || snapshot.searchByAgreementTitle.Items[0].Source == nil || strings.TrimSpace(snapshot.searchByAgreementTitle.Items[0].Source.ID) != strings.TrimSpace(fixtureSet.SourceDocumentID) {
		return fmt.Errorf("search by agreement title did not discover canonical source")
	}
	return nil
}

func validateSourceManagementQueueReview(snapshot sourceManagementValidationSnapshot, fixtureSet stores.LineageFixtureSet) error {
	if len(snapshot.queue.Items) == 0 || snapshot.queue.Items[0].Candidate == nil || strings.TrimSpace(snapshot.queue.Items[0].Candidate.ID) != strings.TrimSpace(fixtureSet.CandidateRelationshipID) {
		return fmt.Errorf("reconciliation queue did not expose seeded candidate backlog")
	}
	if snapshot.queueCandidate.Candidate == nil || strings.TrimSpace(snapshot.queueCandidate.Candidate.ID) != strings.TrimSpace(fixtureSet.CandidateRelationshipID) {
		return fmt.Errorf("reconciliation queue detail did not expose seeded candidate")
	}
	if strings.TrimSpace(snapshot.reviewed.Status) != stores.SourceRelationshipStatusConfirmed {
		return fmt.Errorf("reconciliation review action did not confirm candidate, got %+v", snapshot.reviewed)
	}
	if len(snapshot.queueAfterReview.Items) != 0 {
		return fmt.Errorf("reconciliation queue still contains reviewed candidate after action success")
	}
	return nil
}

func validateSourceManagementSearchHealth(snapshot sourceManagementValidationSnapshot) error {
	if !snapshot.searchHealth.Healthy {
		return fmt.Errorf("source-management go-search health is not ready: %+v", snapshot.searchHealth)
	}
	if snapshot.searchStats.Provider == "" || len(snapshot.searchStats.Indexes) == 0 {
		return fmt.Errorf("source-management go-search stats did not expose provider/index snapshot: %+v", snapshot.searchStats)
	}
	if !hasReadySearchIndex(snapshot.searchHealth, snapshot.searchStats) {
		return fmt.Errorf("source-management go-search index is not ready: health=%+v stats=%+v", snapshot.searchHealth, snapshot.searchStats)
	}
	return nil
}

func validateSourceManagementProviderNeutralContracts(snapshot sourceManagementValidationSnapshot) error {
	if err := rejectGoogleSpecificJSONKeys(snapshot.workspace, "source_workspace"); err != nil {
		return err
	}
	if err := rejectGoogleSpecificJSONKeys(snapshot.detail, "source_detail"); err != nil {
		return err
	}
	if err := rejectGoogleSpecificJSONKeys(snapshot.queue, "reconciliation_queue"); err != nil {
		return err
	}
	if err := rejectGoogleSpecificJSONKeys(snapshot.queueCandidate, "reconciliation_candidate"); err != nil {
		return err
	}
	if err := rejectGoogleSpecificJSONKeys(snapshot.searchByComment, "source_search"); err != nil {
		return err
	}
	return rejectGoogleSpecificJSONKeys(snapshot.comments, "source_comments")
}

func buildSourceManagementValidationResult(
	validationCtx *sourceManagementValidationContext,
	snapshot sourceManagementValidationSnapshot,
) SourceManagementValidationResult {
	return SourceManagementValidationResult{
		BootstrapValidated:             true,
		ContractGuardValidated:         true,
		FixtureScenarioSeeded:          true,
		SourceListBootstrapped:         len(snapshot.listPage.Items) >= 2,
		SourceBrowserNavigationReady:   strings.TrimSpace(snapshot.listPage.Items[0].Links.Self) != "" && strings.TrimSpace(snapshot.detail.Links.Revisions) != "" && strings.TrimSpace(snapshot.detail.Links.Comments) != "",
		SourceDetailReadable:           snapshot.detail.Source != nil && strings.TrimSpace(snapshot.detail.Source.ID) == strings.TrimSpace(validationCtx.fixtureSet.SourceDocumentID),
		SourceWorkspaceReadable:        snapshot.workspace.Source != nil && strings.TrimSpace(snapshot.workspace.Source.ID) == strings.TrimSpace(validationCtx.fixtureSet.SourceDocumentID),
		RevisionHistoryReadable:        len(snapshot.revisions.Items) >= 2,
		RevisionTimelineReadable:       len(snapshot.workspace.Timeline.Entries) >= 2,
		MultiHandleContinuityVisible:   len(snapshot.handles.Items) >= 2,
		RelationshipSummariesReadable:  len(snapshot.relationships.Items) >= 1,
		SourceAgreementsReadable:       len(snapshot.agreements.Items) >= 1,
		SourceArtifactsReadable:        len(snapshot.workspace.Artifacts.Items) >= 1,
		SourceSearchCorrect:            len(snapshot.searchByLegacyHandle.Items) >= 1 && len(snapshot.searchByNormalizedText.Items) >= 1 && len(snapshot.searchByComment.Items) >= 1 && len(snapshot.searchByAgreementTitle.Items) >= 1,
		SearchIndexReady:               hasReadySearchIndex(snapshot.searchHealth, snapshot.searchStats),
		SearchProviderMetadataVisible:  len(snapshot.searchByLegacyHandle.Items) >= 1 && snapshot.searchByLegacyHandle.Items[0].Provider != nil && strings.TrimSpace(snapshot.searchByLegacyHandle.Items[0].Provider.Kind) == stores.SourceProviderKindGoogleDrive,
		SearchNormalizedTextCorrect:    len(snapshot.searchByNormalizedText.Items) >= 1,
		SearchAgreementTitleCorrect:    len(snapshot.searchByAgreementTitle.Items) >= 1,
		SourceCommentsReadable:         len(snapshot.comments.Items) >= 1 && snapshot.comments.SyncStatus == services.SourceManagementCommentSyncSynced,
		QueueReadable:                  len(snapshot.queue.Items) >= 1 && snapshot.queueCandidate.Candidate != nil,
		QueueActionSucceeded:           strings.TrimSpace(snapshot.reviewed.Status) == stores.SourceRelationshipStatusConfirmed && len(snapshot.queueAfterReview.Items) == 0,
		ProviderNeutralContractsStable: true,
		Scenario:                       validationCtx.fixtureSet,
		URLs:                           validationCtx.urls,
	}
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
	const startupValidationSourceID = "startup-validation-source"
	if _, err := readModels.GetSourceWorkspace(ctx, scope, startupValidationSourceID, services.SourceWorkspaceQuery{}); err != nil && !strings.Contains(err.Error(), "not found") {
		return fmt.Errorf("validate source-management workspace wiring: %w", err)
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

func hasReadySearchIndex(health searchtypes.HealthStatus, stats searchtypes.StatsResult) bool {
	for _, idx := range health.Indexes {
		if idx.Ready && strings.TrimSpace(idx.Name) != "" {
			return true
		}
	}
	for _, idx := range stats.Indexes {
		if strings.EqualFold(strings.TrimSpace(idx.ProviderStatus), "ready") && strings.TrimSpace(idx.Name) != "" {
			return true
		}
	}
	return false
}
