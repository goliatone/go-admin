package admin

import (
	"context"
	"testing"

	"github.com/google/uuid"
)

func TestResolveContentPageIDParsesUUID(t *testing.T) {
	id := uuid.New()
	if got := resolveContentPageID(id.String()); got != id {
		t.Fatalf("expected parsed uuid %s, got %s", id, got)
	}
	if got := resolveContentPageID("not-a-uuid"); got != uuid.Nil {
		t.Fatalf("expected nil uuid for invalid input, got %s", got)
	}
}

func TestGoCMSContentWriteBoundaryContentTypeForMetadataPrefersSlugAndID(t *testing.T) {
	ctx := context.Background()
	pageID := uuid.New().String()
	typeSvc := newStubContentTypeService(
		CMSContentType{ID: pageID, Slug: "page"},
		CMSContentType{ID: uuid.New().String(), Slug: "post"},
	)
	adapter := &GoCMSContentAdapter{contentTypes: typeSvc}
	boundary := goCMSContentWriteBoundary{adapter: adapter}

	bySlug := boundary.contentTypeForMetadata(ctx, CMSContent{ContentTypeSlug: "page"})
	if bySlug == nil || bySlug.Slug != "page" {
		t.Fatalf("expected slug lookup to resolve page, got %+v", bySlug)
	}

	byID := boundary.contentTypeForMetadata(ctx, CMSContent{ContentType: pageID})
	if byID == nil || byID.ID != pageID {
		t.Fatalf("expected id lookup to resolve %s, got %+v", pageID, byID)
	}
}
