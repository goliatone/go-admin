package services

import (
	"context"
	"fmt"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	searchcommand "github.com/goliatone/go-search/command"
	searchindexing "github.com/goliatone/go-search/indexing"
	searchtypes "github.com/goliatone/go-search/pkg/types"
	searchplanner "github.com/goliatone/go-search/planner"
	searchproviders "github.com/goliatone/go-search/providers"
	searchmemory "github.com/goliatone/go-search/providers/memory"
	searchquery "github.com/goliatone/go-search/query"

	"github.com/goliatone/go-admin/examples/esign/observability"
	"github.com/goliatone/go-admin/examples/esign/stores"
)

const (
	defaultSourceManagementGoSearchIndexName       = "esign_source_management"
	defaultSourceManagementGoSearchRegistrationKey = "source_document"
	defaultSourceManagementGoSearchSourceType      = "source_document"
)

type GoSearchSourceSearchConfig struct {
	Lineage         stores.LineageStore
	Agreements      stores.AgreementStore
	IndexName       string
	RegistrationKey string
	ProviderFactory func(scope stores.Scope) searchproviders.Provider
}

type GoSearchSourceSearchService struct {
	lineage         stores.LineageStore
	agreements      stores.AgreementStore
	indexName       string
	registrationKey string
	providerFactory func(scope stores.Scope) searchproviders.Provider

	mu      sync.Mutex
	bundles map[string]*goSearchSourceSearchBundle
}

type goSearchSourceSearchBundle struct {
	indexName       string
	registrationKey string
	provider        searchproviders.Provider
	source          goSearchSourceDocumentSource
	indexer         *searchindexing.Indexer
	search          *searchquery.Search
	health          *searchquery.Health
	stats           *searchquery.Stats

	bootstrapMu  sync.Mutex
	bootstrapped bool
}

type goSearchSourceDocumentSource struct {
	lineage stores.LineageStore
	scope   stores.Scope
}

type goSearchSourceDocumentProjector struct {
	lineage    stores.LineageStore
	agreements stores.AgreementStore
	scope      stores.Scope
}

func NewGoSearchSourceSearchService(cfg GoSearchSourceSearchConfig) (*GoSearchSourceSearchService, error) {
	if cfg.Lineage == nil {
		return nil, domainValidationError("source_search", "lineage", "not configured")
	}
	if strings.TrimSpace(cfg.IndexName) == "" {
		cfg.IndexName = defaultSourceManagementGoSearchIndexName
	}
	if strings.TrimSpace(cfg.RegistrationKey) == "" {
		cfg.RegistrationKey = defaultSourceManagementGoSearchRegistrationKey
	}
	if cfg.ProviderFactory == nil {
		cfg.ProviderFactory = func(scope stores.Scope) searchproviders.Provider {
			return searchmemory.New(searchmemory.Config{})
		}
	}
	return &GoSearchSourceSearchService{
		lineage:         cfg.Lineage,
		agreements:      firstAgreementStore(cfg.Agreements, cfg.Lineage),
		indexName:       strings.TrimSpace(cfg.IndexName),
		registrationKey: strings.TrimSpace(cfg.RegistrationKey),
		providerFactory: cfg.ProviderFactory,
		bundles:         map[string]*goSearchSourceSearchBundle{},
	}, nil
}

func (s *GoSearchSourceSearchService) Search(ctx context.Context, scope stores.Scope, query SourceSearchQuery) (SourceSearchResults, error) {
	normalized := normalizeSourceSearchQuery(query)
	results := emptySourceSearchResults(normalized)
	scope, err := validateGoSearchScope(scope)
	if err != nil {
		return results, err
	}
	bundle, err := s.bundleForScope(ctx, scope)
	if err != nil {
		return results, err
	}
	err = bundle.ensureBootstrapped(ctx)
	if err != nil {
		return results, err
	}
	page, err := bundle.search.Query(ctx, sourceSearchGoSearchRequest(s.indexName, scope, normalized))
	if err != nil {
		return results, err
	}
	scored := make([]scoredSourceSearchResult, 0, len(page.Hits))
	legacy := DefaultSourceSearchService{lineage: s.lineage, agreements: s.agreements}
	for _, hit := range page.Hits {
		indexed, ok := sourceSearchRecordFromHit(hit)
		if !ok {
			continue
		}
		if summary, score, matched := legacy.matchIndexedDocument(ctx, scope, indexed, normalized); matched {
			scored = append(scored, scoredSourceSearchResult{result: summary, score: score})
			continue
		}
		summary, _, ok := legacy.buildSourceSearchResultSummary(ctx, scope, indexed)
		if !ok {
			continue
		}
		scored = append(scored, scoredSourceSearchResult{result: summary})
	}
	if len(scored) != 0 {
		sortIndexedSourceSearchResults(scored, normalized.Sort)
		results.Items = make([]SourceSearchResultSummary, 0, len(scored))
		for _, item := range scored {
			results.Items = append(results.Items, item.result)
		}
	}
	results.PageInfo = SourceManagementPageInfo{
		Mode:       SourceManagementPaginationModePage,
		Page:       max(1, page.Page),
		PageSize:   max(1, page.PerPage),
		TotalCount: page.Total,
		HasMore:    page.Page*page.PerPage < page.Total,
		Sort:       strings.TrimSpace(normalized.Sort),
	}
	results.AppliedQuery = normalized
	results.Permissions = defaultSourceManagementPermissions()
	results.EmptyState = sourceCollectionEmptyState(len(results.Items) == 0, "No search results", "No sources matched the current search query.")
	results.Links = SourceManagementLinks{Self: sourceManagementSearchPath()}
	return results, nil
}

func (s *GoSearchSourceSearchService) ReindexSourceDocument(ctx context.Context, scope stores.Scope, sourceDocumentID string) (SourceSearchIndexResult, error) {
	scope, err := validateGoSearchScope(scope)
	if err != nil {
		return SourceSearchIndexResult{}, err
	}
	sourceDocumentID = strings.TrimSpace(sourceDocumentID)
	if sourceDocumentID == "" {
		return SourceSearchIndexResult{}, domainValidationError("source_search", "source_document_id", "required")
	}
	bundle, err := s.bundleForScope(ctx, scope)
	if err != nil {
		return SourceSearchIndexResult{}, err
	}
	docs, err := bundle.indexer.IndexRecord(ctx, s.indexName, s.registrationKey, sourceDocumentID)
	if err != nil {
		observability.ObserveSourceSearchReindex(ctx, SourceManagementSearchResultSourceDocument, false)
		return SourceSearchIndexResult{}, err
	}
	sourceDocument, err := s.lineage.GetSourceDocument(ctx, scope, sourceDocumentID)
	if err != nil {
		return SourceSearchIndexResult{}, err
	}
	commentStatus, err := currentSourceSearchCommentStatus(ctx, scope, s.lineage, sourceDocument.ID)
	if err != nil {
		return SourceSearchIndexResult{}, err
	}
	return SourceSearchIndexResult{
		TargetKind:        SourceManagementSearchResultSourceDocument,
		TargetID:          sourceDocumentID,
		IndexedCount:      len(docs),
		DeletedCount:      0,
		CommentSyncStatus: commentStatus,
		IndexedAt:         sourceSearchIndexedAtPtr(),
	}, observeSourceSearchReindexSuccess(ctx, SourceManagementSearchResultSourceDocument)
}

func (s *GoSearchSourceSearchService) ReindexSourceRevision(ctx context.Context, scope stores.Scope, sourceRevisionID string) (SourceSearchIndexResult, error) {
	scope, err := validateGoSearchScope(scope)
	if err != nil {
		return SourceSearchIndexResult{}, err
	}
	sourceRevisionID = strings.TrimSpace(sourceRevisionID)
	if sourceRevisionID == "" {
		return SourceSearchIndexResult{}, domainValidationError("source_search", "source_revision_id", "required")
	}
	revision, err := s.lineage.GetSourceRevision(ctx, scope, sourceRevisionID)
	if err != nil {
		return SourceSearchIndexResult{}, err
	}
	result, err := s.ReindexSourceDocument(ctx, scope, revision.SourceDocumentID)
	if err != nil {
		observability.ObserveSourceSearchReindex(ctx, SourceManagementSearchResultSourceRevision, false)
		return SourceSearchIndexResult{}, err
	}
	result.TargetKind = SourceManagementSearchResultSourceRevision
	result.TargetID = sourceRevisionID
	observability.ObserveSourceSearchReindex(ctx, SourceManagementSearchResultSourceRevision, true)
	return result, nil
}

func (s *GoSearchSourceSearchService) HealthStatus(ctx context.Context, scope stores.Scope) (searchtypes.HealthStatus, error) {
	scope, err := validateGoSearchScope(scope)
	if err != nil {
		return searchtypes.HealthStatus{}, err
	}
	bundle, err := s.bundleForScope(ctx, scope)
	if err != nil {
		return searchtypes.HealthStatus{}, err
	}
	if bundle.health == nil {
		return searchtypes.HealthStatus{}, fmt.Errorf("source-management go-search health query is not configured")
	}
	health, err := bundle.health.Query(ctx, searchtypes.HealthRequest{Indexes: []string{s.indexName}})
	if err == nil {
		stats, _ := s.StatsSnapshot(ctx, scope)
		observability.ObserveSourceSearchProviderSnapshot(ctx, health, stats)
	}
	return health, err
}

func (s *GoSearchSourceSearchService) StatsSnapshot(ctx context.Context, scope stores.Scope) (searchtypes.StatsResult, error) {
	scope, err := validateGoSearchScope(scope)
	if err != nil {
		return searchtypes.StatsResult{}, err
	}
	bundle, err := s.bundleForScope(ctx, scope)
	if err != nil {
		return searchtypes.StatsResult{}, err
	}
	if bundle.stats == nil {
		return searchtypes.StatsResult{}, fmt.Errorf("source-management go-search stats query is not configured")
	}
	stats, err := bundle.stats.Query(ctx, searchtypes.StatsRequest{Indexes: []string{s.indexName}})
	if err == nil {
		health, _ := bundle.health.Query(ctx, searchtypes.HealthRequest{Indexes: []string{s.indexName}})
		observability.ObserveSourceSearchProviderSnapshot(ctx, health, stats)
	}
	return stats, err
}

func (s *GoSearchSourceSearchService) bundleForScope(ctx context.Context, scope stores.Scope) (*goSearchSourceSearchBundle, error) {
	scopeKey := sourceSearchScopeKey(scope)
	s.mu.Lock()
	defer s.mu.Unlock()
	if bundle, ok := s.bundles[scopeKey]; ok {
		return bundle, nil
	}

	provider := s.providerFactory(scope)
	if provider == nil {
		return nil, fmt.Errorf("source-management go-search provider factory returned nil")
	}

	indexDef := sourceManagementGoSearchIndexDefinition(s.indexName)
	registry := searchindexing.NewRegistry()
	source := goSearchSourceDocumentSource{lineage: s.lineage, scope: scope}
	registration := searchindexing.NewRegistrationWithKey(
		s.indexName,
		indexDef,
		s.registrationKey,
		defaultSourceManagementGoSearchSourceType,
		source,
		goSearchSourceDocumentProjector{lineage: s.lineage, agreements: s.agreements, scope: scope},
		func(record stores.SourceDocumentRecord) string {
			return strings.TrimSpace(record.ID)
		},
	)
	if err := registry.Register(indexDef, registration); err != nil {
		return nil, err
	}

	ensureIndex, err := searchcommand.NewEnsureIndex(searchcommand.EnsureIndexConfig{
		Provider: provider,
		Registry: registry,
	})
	if err != nil {
		return nil, err
	}
	err = ensureIndex.Execute(ctx, searchtypes.EnsureIndexInput{Definition: indexDef})
	if err != nil {
		return nil, err
	}

	indexer, err := searchindexing.NewIndexer(searchindexing.IndexerConfig{
		Registry: registry,
		Provider: provider,
	})
	if err != nil {
		return nil, err
	}
	pln, err := searchplanner.New(searchplanner.Config{
		Registry: registry,
		Defaults: searchplanner.Defaults{
			DisableIndexGroupByDefault: true,
		},
	})
	if err != nil {
		return nil, err
	}
	search, err := searchquery.NewSearch(searchquery.SearchConfig{
		Planner:  pln,
		Provider: provider,
	})
	if err != nil {
		return nil, err
	}
	health, err := searchquery.NewHealth(searchquery.HealthConfig{Provider: provider})
	if err != nil {
		return nil, err
	}
	stats, err := searchquery.NewStats(searchquery.StatsConfig{
		Provider: provider,
		Registry: registry,
	})
	if err != nil {
		return nil, err
	}

	bundle := &goSearchSourceSearchBundle{
		indexName:       s.indexName,
		registrationKey: s.registrationKey,
		provider:        provider,
		source:          source,
		indexer:         indexer,
		search:          search,
		health:          health,
		stats:           stats,
	}
	s.bundles[scopeKey] = bundle
	return bundle, nil
}

func (b *goSearchSourceSearchBundle) reindexAll(ctx context.Context) error {
	if b == nil || b.indexer == nil {
		return nil
	}
	cursor := ""
	for {
		records, next, err := b.source.List(ctx, 100, cursor)
		if err != nil {
			return err
		}
		for _, record := range records {
			recordID := strings.TrimSpace(record.ID)
			if recordID == "" {
				continue
			}
			if _, err := b.indexer.IndexRecord(ctx, b.indexName, b.registrationKey, recordID); err != nil {
				return err
			}
		}
		if next == "" || len(records) == 0 {
			return nil
		}
		cursor = next
	}
}

func (b *goSearchSourceSearchBundle) ensureBootstrapped(ctx context.Context) error {
	if b == nil {
		return nil
	}
	b.bootstrapMu.Lock()
	defer b.bootstrapMu.Unlock()
	if b.bootstrapped {
		return nil
	}
	if err := b.reindexAll(ctx); err != nil {
		return err
	}
	b.bootstrapped = true
	return nil
}

func (s goSearchSourceDocumentSource) Get(ctx context.Context, id string) (stores.SourceDocumentRecord, error) {
	return s.lineage.GetSourceDocument(ctx, s.scope, strings.TrimSpace(id))
}

func (s goSearchSourceDocumentSource) List(ctx context.Context, limit int, cursor string) ([]stores.SourceDocumentRecord, string, error) {
	records, err := s.lineage.ListSourceDocuments(ctx, s.scope, stores.SourceDocumentQuery{})
	if err != nil {
		return nil, "", err
	}
	sort.SliceStable(records, func(i, j int) bool {
		return strings.TrimSpace(records[i].ID) < strings.TrimSpace(records[j].ID)
	})
	start := 0
	cursor = strings.TrimSpace(cursor)
	if cursor != "" {
		for i, record := range records {
			if strings.TrimSpace(record.ID) == cursor {
				start = i + 1
				break
			}
		}
	}
	if limit <= 0 {
		limit = len(records)
	}
	end := min(start+limit, len(records))
	next := ""
	if end < len(records) && end > start {
		next = strings.TrimSpace(records[end-1].ID)
	}
	return append([]stores.SourceDocumentRecord(nil), records[start:end]...), next, nil
}

func (p goSearchSourceDocumentProjector) Project(ctx context.Context, record stores.SourceDocumentRecord) ([]searchtypes.Document, error) {
	legacy := DefaultSourceSearchService{lineage: p.lineage, agreements: p.agreements}
	indexed, _, err := legacy.buildIndexDocuments(ctx, p.scope, record)
	if err != nil {
		return nil, err
	}
	out := make([]searchtypes.Document, 0, len(indexed))
	for _, item := range indexed {
		out = append(out, sourceSearchGoSearchDocument(p.scope, record, item))
	}
	return out, nil
}

func sourceManagementGoSearchIndexDefinition(indexName string) searchtypes.IndexDefinition {
	return searchtypes.IndexDefinition{
		Name:               strings.TrimSpace(indexName),
		Label:              "E-Sign Source Management",
		DefaultQueryFields: []string{"title", "summary", "body"},
		SearchableFields:   []string{"title", "summary", "body"},
		FilterableFields:   []string{"result_kind", "provider_kind", "status", "relationship_state", "comment_sync_status", "has_comments", "revision_hint"},
		SortableFields:     []string{"title", "updated_at"},
		HighlightFields:    []string{"body"},
	}
}

func sourceSearchGoSearchDocument(scope stores.Scope, sourceDocument stores.SourceDocumentRecord, indexed stores.SourceSearchDocumentRecord) searchtypes.Document {
	metadata := decodeLineageMetadataJSON(indexed.MetadataJSON)
	artifactHash := ""
	if hashes := anyStrings(metadata["artifact_hashes"]); len(hashes) > 0 {
		artifactHash = strings.TrimSpace(hashes[0])
	}
	revisionHints := anyStrings(metadata["revision_hints"])
	fields := map[string]any{
		"source_document_id":  strings.TrimSpace(indexed.SourceDocumentID),
		"source_revision_id":  strings.TrimSpace(indexed.SourceRevisionID),
		"result_kind":         strings.TrimSpace(indexed.ResultKind),
		"provider_kind":       strings.TrimSpace(indexed.ProviderKind),
		"status":              strings.TrimSpace(sourceDocument.Status),
		"relationship_state":  strings.TrimSpace(indexed.RelationshipState),
		"comment_sync_status": strings.TrimSpace(indexed.CommentSyncStatus),
		"comment_count":       indexed.CommentCount,
		"has_comments":        indexed.HasComments,
		"artifact_hash":       artifactHash,
		"updated_at":          indexed.UpdatedAt.UnixMilli(),
		"metadata_json":       strings.TrimSpace(indexed.MetadataJSON),
	}
	appendGoSearchFieldStrings(fields, "agreement_titles", anyStrings(metadata["agreement_titles"]))
	appendGoSearchFieldStrings(fields, "normalized_texts", anyStrings(metadata["normalized_texts"]))
	appendGoSearchFieldStrings(fields, "drive_ids", anyStrings(metadata["drive_ids"]))
	if len(revisionHints) > 0 {
		fields["revision_hint"] = revisionHints[0]
	}
	facets := map[string][]string{
		"result_kind":   {strings.TrimSpace(indexed.ResultKind)},
		"provider_kind": {strings.TrimSpace(indexed.ProviderKind)},
		"status":        {strings.TrimSpace(sourceDocument.Status)},
		"has_comments":  {strconv.FormatBool(indexed.HasComments)},
		"revision_hint": revisionHints,
	}
	if value := strings.TrimSpace(indexed.RelationshipState); value != "" {
		facets["relationship_state"] = []string{value}
	}
	if value := strings.TrimSpace(indexed.CommentSyncStatus); value != "" {
		facets["comment_sync_status"] = []string{value}
	}
	doc := searchtypes.Document{
		ID:         strings.TrimSpace(indexed.ID),
		Type:       strings.TrimSpace(indexed.ResultKind),
		SourceType: defaultSourceManagementGoSearchSourceType,
		SourceID:   strings.TrimSpace(indexed.SourceDocumentID),
		Title:      strings.TrimSpace(indexed.CanonicalTitle),
		Summary:    sourceSearchSummaryText(indexed.ResultKind, indexed.CommentCount, indexed.RelationshipState),
		Body:       strings.TrimSpace(indexed.SearchText),
		URL:        sourceSearchRecordURL(indexed),
		Fields:     fields,
		Facets:     facets,
		Scope:      searchtypes.Scope{TenantID: scope.TenantID, OrgID: scope.OrgID},
		Metadata:   metadata,
	}
	if !indexed.UpdatedAt.IsZero() {
		updatedAt := indexed.UpdatedAt
		doc.UpdatedAt = &updatedAt
	}
	if strings.TrimSpace(indexed.SourceRevisionID) != "" {
		doc.ParentID = strings.TrimSpace(indexed.SourceDocumentID)
	}
	return doc
}

func sourceSearchGoSearchRequest(indexName string, scope stores.Scope, query SourceSearchQuery) searchtypes.SearchRequest {
	return searchtypes.SearchRequest{
		Indexes: []string{strings.TrimSpace(indexName)},
		Query:   strings.TrimSpace(query.Query),
		Page:    query.Page,
		PerPage: query.PageSize,
		Sort:    sourceSearchGoSearchSort(query.Sort),
		Filters: sourceSearchGoSearchFilters(query),
		Scope:   searchtypes.Scope{TenantID: scope.TenantID, OrgID: scope.OrgID},
	}
}

func sourceSearchGoSearchSort(sortKey string) []searchtypes.Sort {
	switch normalizeSourceSearchSort(sortKey) {
	case sourceSearchSortTitleAsc:
		return []searchtypes.Sort{{Field: "title", Direction: searchtypes.SortAsc}}
	default:
		return nil
	}
}

func sourceSearchGoSearchFilters(query SourceSearchQuery) searchtypes.FilterExpr {
	terms := make([]searchtypes.FilterExpr, 0, 7)
	if value := strings.TrimSpace(query.ProviderKind); value != "" {
		terms = append(terms, searchtypes.TermExpr{Field: "provider_kind", Op: searchtypes.FilterOpEQ, Value: value})
	}
	if value := strings.TrimSpace(query.Status); value != "" {
		terms = append(terms, searchtypes.TermExpr{Field: "status", Op: searchtypes.FilterOpEQ, Value: value})
	}
	if value := strings.TrimSpace(query.ResultKind); value != "" {
		terms = append(terms, searchtypes.TermExpr{Field: "result_kind", Op: searchtypes.FilterOpEQ, Value: value})
	}
	if value := strings.TrimSpace(query.RelationshipState); value != "" {
		terms = append(terms, searchtypes.TermExpr{Field: "relationship_state", Op: searchtypes.FilterOpEQ, Value: value})
	}
	if value := strings.TrimSpace(query.CommentSyncStatus); value != "" {
		terms = append(terms, searchtypes.TermExpr{Field: "comment_sync_status", Op: searchtypes.FilterOpEQ, Value: value})
	}
	if value := strings.TrimSpace(query.RevisionHint); value != "" {
		terms = append(terms, searchtypes.TermExpr{Field: "revision_hint", Op: searchtypes.FilterOpEQ, Value: value})
	}
	if query.HasComments != nil {
		terms = append(terms, searchtypes.TermExpr{Field: "has_comments", Op: searchtypes.FilterOpEQ, Value: strconv.FormatBool(*query.HasComments)})
	}
	switch len(terms) {
	case 0:
		return nil
	case 1:
		return terms[0]
	default:
		return searchtypes.AndExpr{Terms: terms}
	}
}

func sourceSearchRecordFromHit(hit searchtypes.SearchHit) (stores.SourceSearchDocumentRecord, bool) {
	if hit.Document != nil {
		return sourceSearchRecordFromDocument(*hit.Document)
	}
	return stores.SourceSearchDocumentRecord{}, false
}

func sourceSearchRecordFromDocument(doc searchtypes.Document) (stores.SourceSearchDocumentRecord, bool) {
	resultKind := strings.TrimSpace(documentStringField(doc, "result_kind", doc.Type))
	sourceDocumentID := strings.TrimSpace(documentStringField(doc, "source_document_id", doc.SourceID))
	if resultKind == "" || sourceDocumentID == "" {
		return stores.SourceSearchDocumentRecord{}, false
	}
	return stores.SourceSearchDocumentRecord{
		ID:                strings.TrimSpace(doc.ID),
		SourceDocumentID:  sourceDocumentID,
		SourceRevisionID:  strings.TrimSpace(documentStringField(doc, "source_revision_id", "")),
		ResultKind:        resultKind,
		ProviderKind:      strings.TrimSpace(documentStringField(doc, "provider_kind", "")),
		CanonicalTitle:    strings.TrimSpace(doc.Title),
		RelationshipState: strings.TrimSpace(documentStringField(doc, "relationship_state", "")),
		CommentSyncStatus: strings.TrimSpace(documentStringField(doc, "comment_sync_status", "")),
		CommentCount:      documentIntField(doc, "comment_count"),
		HasComments:       documentBoolField(doc, "has_comments"),
		SearchText:        strings.TrimSpace(doc.Body),
		MetadataJSON:      strings.TrimSpace(documentStringField(doc, "metadata_json", "")),
	}, true
}

func documentStringField(doc searchtypes.Document, key, fallback string) string {
	if len(doc.Fields) != 0 {
		if value, ok := doc.Fields[strings.TrimSpace(key)]; ok {
			return strings.TrimSpace(fmt.Sprint(value))
		}
	}
	return strings.TrimSpace(fallback)
}

func documentIntField(doc searchtypes.Document, key string) int {
	if len(doc.Fields) == 0 {
		return 0
	}
	value, ok := doc.Fields[strings.TrimSpace(key)]
	if !ok {
		return 0
	}
	switch typed := value.(type) {
	case int:
		return typed
	case int64:
		return int(typed)
	case float64:
		return int(typed)
	case string:
		parsed, _ := strconv.Atoi(strings.TrimSpace(typed))
		return parsed
	default:
		return 0
	}
}

func documentBoolField(doc searchtypes.Document, key string) bool {
	if len(doc.Fields) == 0 {
		return false
	}
	value, ok := doc.Fields[strings.TrimSpace(key)]
	if !ok {
		return false
	}
	switch typed := value.(type) {
	case bool:
		return typed
	case string:
		parsed, _ := strconv.ParseBool(strings.TrimSpace(typed))
		return parsed
	default:
		return false
	}
}

func appendGoSearchFieldStrings(fields map[string]any, key string, values []string) {
	if len(fields) == 0 || len(values) == 0 {
		return
	}
	fields[strings.TrimSpace(key)] = append([]string(nil), values...)
}

func sourceSearchRecordURL(indexed stores.SourceSearchDocumentRecord) string {
	if strings.TrimSpace(indexed.ResultKind) == SourceManagementSearchResultSourceRevision {
		return sourceManagementRevisionPath(indexed.SourceRevisionID)
	}
	return sourceManagementSourcePath(indexed.SourceDocumentID)
}

func currentSourceSearchCommentStatus(ctx context.Context, scope stores.Scope, lineage stores.LineageStore, sourceDocumentID string) (string, error) {
	states, err := lineage.ListSourceCommentSyncStates(ctx, scope, stores.SourceCommentSyncStateQuery{
		SourceDocumentID: strings.TrimSpace(sourceDocumentID),
	})
	if err != nil {
		return "", err
	}
	return aggregateSourceCommentSyncStatus(states), nil
}

func validateGoSearchScope(scope stores.Scope) (stores.Scope, error) {
	scope = stores.Scope{
		TenantID: strings.TrimSpace(scope.TenantID),
		OrgID:    strings.TrimSpace(scope.OrgID),
	}
	if scope.TenantID == "" || scope.OrgID == "" {
		return stores.Scope{}, domainValidationError("source_search", "scope", "tenant_id and org_id are required")
	}
	return scope, nil
}

func sourceSearchScopeKey(scope stores.Scope) string {
	return strings.TrimSpace(scope.TenantID) + "|" + strings.TrimSpace(scope.OrgID)
}

func firstAgreementStore(primary stores.AgreementStore, fallback any) stores.AgreementStore {
	if primary != nil {
		return primary
	}
	if store, ok := fallback.(stores.AgreementStore); ok {
		return store
	}
	return nil
}

func sourceSearchIndexedAtPtr() *time.Time {
	now := time.Now().UTC()
	return &now
}

func observeSourceSearchReindexSuccess(ctx context.Context, targetKind string) error {
	observability.ObserveSourceSearchReindex(ctx, targetKind, true)
	return nil
}
