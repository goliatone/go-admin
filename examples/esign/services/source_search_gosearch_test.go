package services

import (
	"context"
	"encoding/json"
	"fmt"
	"testing"

	searchtypes "github.com/goliatone/go-search/pkg/types"
	searchproviders "github.com/goliatone/go-search/providers"
	searchmemory "github.com/goliatone/go-search/providers/memory"

	"github.com/goliatone/go-admin/examples/esign/stores"
)

func TestGoSearchSourceSearchServiceTranslatesRequestsAndReturnsContracts(t *testing.T) {
	store, scope, fixtures := seedSourceReadModelFixtures(t)
	recordingProvider := &recordingSourceSearchProvider{Provider: searchmemory.New(searchmemory.Config{})}

	service, err := NewGoSearchSourceSearchService(GoSearchSourceSearchConfig{
		Lineage: store,
		ProviderFactory: func(scope stores.Scope) searchproviders.Provider {
			return recordingProvider
		},
	})
	if err != nil {
		t.Fatalf("NewGoSearchSourceSearchService: %v", err)
	}

	results, err := service.Search(context.Background(), scope, SourceSearchQuery{
		Query:    "fixture-google-file-2",
		Page:     1,
		PageSize: 10,
	})
	if err != nil {
		t.Fatalf("Search: %v", err)
	}
	if len(results.Items) == 0 || results.Items[0].Source == nil || results.Items[0].Source.ID != fixtures.sourceDocumentID {
		t.Fatalf("expected go-search-backed results to expose source %q, got %+v", fixtures.sourceDocumentID, results.Items)
	}
	if results.Items[0].DrillIn == nil || results.Items[0].DrillIn.Href == "" {
		t.Fatalf("expected go-search-backed results to expose workspace drill-in, got %+v", results.Items[0])
	}
	if recordingProvider.replaceDocumentsCalls == 0 {
		t.Fatal("expected initial go-search search to bootstrap the scope index")
	}
	replaceCallsAfterBootstrap := recordingProvider.replaceDocumentsCalls

	agreementResults, err := service.Search(context.Background(), scope, SourceSearchQuery{
		Query:    "Imported Fixture Agreement Rev 2",
		Page:     1,
		PageSize: 10,
	})
	if err != nil {
		t.Fatalf("Search by agreement title: %v", err)
	}
	if len(agreementResults.Items) == 0 || agreementResults.Items[0].Source == nil || agreementResults.Items[0].Source.ID != fixtures.sourceDocumentID {
		t.Fatalf("expected agreement-title search to resolve canonical source %q, got %+v", fixtures.sourceDocumentID, agreementResults.Items)
	}

	normalizedResults, err := service.Search(context.Background(), scope, SourceSearchQuery{
		Query:    "fixture normalized text for repeated revision",
		Page:     1,
		PageSize: 10,
	})
	if err != nil {
		t.Fatalf("Search by normalized text: %v", err)
	}
	if len(normalizedResults.Items) == 0 || normalizedResults.Items[0].Revision == nil || normalizedResults.Items[0].Revision.ID != fixtures.secondSourceRevisionID {
		t.Fatalf("expected normalized-text search to resolve repeated revision %q, got %+v", fixtures.secondSourceRevisionID, normalizedResults.Items)
	}

	hasComments := true
	if _, err := service.Search(context.Background(), scope, SourceSearchQuery{
		Query:       "fixture-google-file-2",
		ResultKind:  SourceManagementSearchResultSourceRevision,
		HasComments: &hasComments,
		Sort:        sourceSearchSortTitleAsc,
		Page:        1,
		PageSize:    10,
	}); err != nil {
		t.Fatalf("Search with translated filters: %v", err)
	}

	if len(recordingProvider.searchRequests) == 0 {
		t.Fatal("expected go-search provider Search to receive at least one request")
	}
	if recordingProvider.replaceDocumentsCalls != replaceCallsAfterBootstrap {
		t.Fatalf("expected repeated go-search searches to reuse the bootstrapped index, got replace calls %d -> %d", replaceCallsAfterBootstrap, recordingProvider.replaceDocumentsCalls)
	}
	req := recordingProvider.searchRequests[len(recordingProvider.searchRequests)-1]
	if len(req.Indexes) != 1 || req.Indexes[0] != defaultSourceManagementGoSearchIndexName {
		t.Fatalf("expected default source-management go-search index, got %+v", req.Indexes)
	}
	if req.Scope.TenantID != scope.TenantID || req.Scope.OrgID != scope.OrgID {
		t.Fatalf("expected go-search scope %+v, got %+v", scope, req.Scope)
	}
	if len(req.Sort) != 1 || req.Sort[0].Field != "title" || req.Sort[0].Direction != searchtypes.SortAsc {
		t.Fatalf("expected title ascending sort translation, got %+v", req.Sort)
	}
	filters, ok := req.Filters.(searchtypes.AndExpr)
	if !ok || len(filters.Terms) != 2 {
		t.Fatalf("expected translated result-kind and has-comments filters, got %#v", req.Filters)
	}
	if !containsGoSearchTerm(filters.Terms, "result_kind", SourceManagementSearchResultSourceRevision) {
		t.Fatalf("expected result_kind filter, got %#v", req.Filters)
	}
	if !containsGoSearchTerm(filters.Terms, "has_comments", "true") {
		t.Fatalf("expected has_comments filter, got %#v", req.Filters)
	}
}

func TestGoSearchSourceProjectorPublishesSourceAndRevisionDocumentsWithPhase16Fields(t *testing.T) {
	store, scope, fixtures := seedSourceReadModelFixtures(t)
	sourceDocument, err := store.GetSourceDocument(context.Background(), scope, fixtures.sourceDocumentID)
	if err != nil {
		t.Fatalf("GetSourceDocument: %v", err)
	}
	projector := goSearchSourceDocumentProjector{
		lineage:    store,
		agreements: store,
		scope:      scope,
	}
	docs, err := projector.Project(context.Background(), sourceDocument)
	if err != nil {
		t.Fatalf("Project: %v", err)
	}
	if len(docs) != 3 {
		t.Fatalf("expected source projector to emit one source and two revision documents, got %d", len(docs))
	}
	byID := make(map[string]searchtypes.Document, len(docs))
	for _, doc := range docs {
		byID[doc.ID] = doc
	}
	sourceDoc, ok := byID[deterministicSourceSearchDocumentID(SourceManagementSearchResultSourceDocument, fixtures.sourceDocumentID, "")]
	if !ok {
		t.Fatalf("expected canonical source search document, got %+v", byID)
	}
	if sourceDoc.ParentID != "" {
		t.Fatalf("expected canonical source document to be top-level, got %+v", sourceDoc)
	}
	if got := documentStringSliceField(sourceDoc, "agreement_titles"); len(got) < 2 {
		t.Fatalf("expected source document to carry related agreement titles, got %+v", sourceDoc.Fields)
	}
	revisionDoc, ok := byID[deterministicSourceSearchDocumentID(SourceManagementSearchResultSourceRevision, fixtures.sourceDocumentID, fixtures.secondSourceRevisionID)]
	if !ok {
		t.Fatalf("expected repeated revision search document, got %+v", byID)
	}
	if revisionDoc.ParentID != fixtures.sourceDocumentID {
		t.Fatalf("expected revision document parent_id %q, got %+v", fixtures.sourceDocumentID, revisionDoc)
	}
	if got := documentStringSliceField(revisionDoc, "normalized_texts"); len(got) == 0 {
		t.Fatalf("expected revision document normalized text fields, got %+v", revisionDoc.Fields)
	}
	if got := documentStringSliceField(revisionDoc, "agreement_titles"); len(got) == 0 {
		t.Fatalf("expected revision document agreement-title fields, got %+v", revisionDoc.Fields)
	}
}

func TestGoSearchSourceProjectorParityMatchesInMemoryAndSQLiteFixtures(t *testing.T) {
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-lineage-phase16-search", OrgID: "org-lineage-phase16-search"}

	inMemoryStore := stores.NewInMemoryStore()
	inMemoryFixtures := seedSourceReadModelFixturesInStore(t, inMemoryStore, scope)

	relationalStore, cleanup := openSQLiteSourceReadModelFixtureStore(t)
	defer cleanup()
	relationalFixtures := seedSourceReadModelFixturesInStore(t, relationalStore, scope)

	inMemoryDoc, err := inMemoryStore.GetSourceDocument(ctx, scope, inMemoryFixtures.sourceDocumentID)
	if err != nil {
		t.Fatalf("GetSourceDocument in-memory: %v", err)
	}
	relationalDoc, err := relationalStore.GetSourceDocument(ctx, scope, relationalFixtures.sourceDocumentID)
	if err != nil {
		t.Fatalf("GetSourceDocument sqlite: %v", err)
	}

	inMemoryProjected, err := (goSearchSourceDocumentProjector{lineage: inMemoryStore, agreements: inMemoryStore, scope: scope}).Project(ctx, inMemoryDoc)
	if err != nil {
		t.Fatalf("Project in-memory: %v", err)
	}
	relationalProjected, err := (goSearchSourceDocumentProjector{lineage: relationalStore, agreements: relationalStore, scope: scope}).Project(ctx, relationalDoc)
	if err != nil {
		t.Fatalf("Project sqlite: %v", err)
	}
	left, err := json.Marshal(canonicalizeProjectedSearchDocuments(inMemoryProjected))
	if err != nil {
		t.Fatalf("Marshal in-memory projection: %v", err)
	}
	right, err := json.Marshal(canonicalizeProjectedSearchDocuments(relationalProjected))
	if err != nil {
		t.Fatalf("Marshal sqlite projection: %v", err)
	}
	if string(left) != string(right) {
		t.Fatalf("expected go-search projection parity\nin-memory: %s\nsqlite: %s", string(left), string(right))
	}
}

type recordingSourceSearchProvider struct {
	searchproviders.Provider
	searchRequests        []searchtypes.SearchRequest
	replaceDocumentsCalls int
}

func (p *recordingSourceSearchProvider) Search(ctx context.Context, req searchtypes.SearchRequest) (searchtypes.SearchResultPage, error) {
	p.searchRequests = append(p.searchRequests, req)
	return p.Provider.Search(ctx, req)
}

func (p *recordingSourceSearchProvider) ReplaceDocuments(ctx context.Context, index, registrationKey string, sourceIDs []string, docs []searchtypes.Document) error {
	p.replaceDocumentsCalls++
	return p.Provider.ReplaceDocuments(ctx, index, registrationKey, sourceIDs, docs)
}

func containsGoSearchTerm(terms []searchtypes.FilterExpr, field, value string) bool {
	for _, term := range terms {
		candidate, ok := term.(searchtypes.TermExpr)
		if !ok {
			continue
		}
		if candidate.Field == field && candidate.Value == value {
			return true
		}
	}
	return false
}

func documentStringSliceField(doc searchtypes.Document, key string) []string {
	value, ok := doc.Fields[key]
	if !ok {
		return nil
	}
	switch typed := value.(type) {
	case []string:
		return typed
	case []any:
		out := make([]string, 0, len(typed))
		for _, item := range typed {
			out = append(out, fmt.Sprint(item))
		}
		return out
	default:
		return nil
	}
}

func canonicalizeProjectedSearchDocuments(docs []searchtypes.Document) []searchtypes.Document {
	out := make([]searchtypes.Document, len(docs))
	for idx, doc := range docs {
		clone := doc
		clone.UpdatedAt = nil
		if clone.Fields != nil {
			fields := make(map[string]any, len(clone.Fields))
			for key, value := range clone.Fields {
				if key == "updated_at" {
					fields[key] = int64(0)
					continue
				}
				fields[key] = value
			}
			clone.Fields = fields
		}
		out[idx] = clone
	}
	return out
}
