package services

import (
	"context"
	"testing"

	"github.com/goliatone/go-admin/examples/esign/stores"
)

func TestSourceSearchAgreementRefreshServiceReindexesUpdatedAgreementTitle(t *testing.T) {
	store, scope, fixtures := seedSourceReadModelFixtures(t)
	search, err := NewGoSearchSourceSearchService(GoSearchSourceSearchConfig{
		Lineage:    store,
		Agreements: store,
	})
	if err != nil {
		t.Fatalf("NewGoSearchSourceSearchService: %v", err)
	}

	before, err := search.Search(context.Background(), scope, SourceSearchQuery{
		Query:    "Renamed Fixture Agreement",
		Page:     1,
		PageSize: 10,
	})
	if err != nil {
		t.Fatalf("Search before refresh: %v", err)
	}
	if len(before.Items) != 0 {
		t.Fatalf("expected renamed agreement title to be absent before refresh, got %+v", before.Items)
	}

	agreement, err := store.GetAgreement(context.Background(), scope, fixtures.repeatedAgreementID)
	if err != nil {
		t.Fatalf("GetAgreement: %v", err)
	}
	updated, err := store.UpdateDraft(context.Background(), scope, agreement.ID, stores.AgreementDraftPatch{
		Title: new("Renamed Fixture Agreement"),
	}, agreement.Version)
	if err != nil {
		t.Fatalf("UpdateDraft: %v", err)
	}

	refresh := NewSourceSearchAgreementRefreshService(store, store, store, search)
	if err := refresh.RefreshAgreement(context.Background(), scope, updated.ID); err != nil {
		t.Fatalf("RefreshAgreement: %v", err)
	}

	after, err := search.Search(context.Background(), scope, SourceSearchQuery{
		Query:    "Renamed Fixture Agreement",
		Page:     1,
		PageSize: 10,
	})
	if err != nil {
		t.Fatalf("Search after refresh: %v", err)
	}
	if len(after.Items) == 0 || after.Items[0].Source == nil || after.Items[0].Source.ID != fixtures.sourceDocumentID {
		t.Fatalf("expected refreshed agreement-title search to resolve canonical source %q, got %+v", fixtures.sourceDocumentID, after.Items)
	}
}
