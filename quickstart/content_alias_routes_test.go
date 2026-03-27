package quickstart

import (
	"context"
	"strings"
	"testing"

	"github.com/goliatone/go-admin/admin"
)

type quickstartContentAliasSpyContentTypeService struct {
	types []admin.CMSContentType
	seen  []context.Context
}

func (s *quickstartContentAliasSpyContentTypeService) ContentTypes(ctx context.Context) ([]admin.CMSContentType, error) {
	s.seen = append(s.seen, ctx)
	out := make([]admin.CMSContentType, len(s.types))
	copy(out, s.types)
	return out, nil
}

func (s *quickstartContentAliasSpyContentTypeService) ContentType(_ context.Context, id string) (*admin.CMSContentType, error) {
	for _, contentType := range s.types {
		if contentType.ID == id {
			copy := contentType
			return &copy, nil
		}
	}
	return nil, nil
}

func (s *quickstartContentAliasSpyContentTypeService) ContentTypeBySlug(ctx context.Context, slug string) (*admin.CMSContentType, error) {
	s.seen = append(s.seen, ctx)
	for _, contentType := range s.types {
		if strings.EqualFold(strings.TrimSpace(contentType.Slug), strings.TrimSpace(slug)) {
			copy := contentType
			return &copy, nil
		}
	}
	return nil, nil
}

func (s *quickstartContentAliasSpyContentTypeService) CreateContentType(_ context.Context, contentType admin.CMSContentType) (*admin.CMSContentType, error) {
	copy := contentType
	s.types = append(s.types, copy)
	return &copy, nil
}

func (s *quickstartContentAliasSpyContentTypeService) UpdateContentType(_ context.Context, contentType admin.CMSContentType) (*admin.CMSContentType, error) {
	copy := contentType
	return &copy, nil
}

func (s *quickstartContentAliasSpyContentTypeService) DeleteContentType(context.Context, string) error {
	return nil
}

type quickstartContentAliasSpyContainer struct {
	contentTypes admin.CMSContentTypeService
}

func (s *quickstartContentAliasSpyContainer) WidgetService() admin.CMSWidgetService   { return nil }
func (s *quickstartContentAliasSpyContainer) MenuService() admin.CMSMenuService       { return nil }
func (s *quickstartContentAliasSpyContainer) ContentService() admin.CMSContentService { return nil }
func (s *quickstartContentAliasSpyContainer) ContentTypeService() admin.CMSContentTypeService {
	return s.contentTypes
}

func TestRegisterContentEntryAliasRoutesUsesProvidedContextForAliasDiscovery(t *testing.T) {
	type aliasKey struct{}

	cfg := admin.Config{BasePath: "/admin", DefaultLocale: "en"}
	adm, err := admin.New(cfg, admin.Dependencies{})
	if err != nil {
		t.Fatalf("admin.New: %v", err)
	}
	spy := &quickstartContentAliasSpyContentTypeService{
		types: []admin.CMSContentType{{
			ID:           "ct-page",
			Name:         "Page",
			Slug:         "page",
			Status:       "active",
			Capabilities: map[string]any{"panel_slug": "pages"},
		}},
	}
	adm.UseCMS(&quickstartContentAliasSpyContainer{contentTypes: spy})

	ctx := context.WithValue(context.Background(), aliasKey{}, "quickstart-alias-context")
	r := newContentEntryRouteCaptureRouter()
	if err := RegisterContentEntryAliasRoutes(r, cfg, adm, nil, WithContentAliasContext(ctx)); err != nil {
		t.Fatalf("RegisterContentEntryAliasRoutes: %v", err)
	}

	if len(spy.seen) == 0 {
		t.Fatalf("expected content type lookup during alias registration")
	}
	if got := spy.seen[0].Value(aliasKey{}); got != "quickstart-alias-context" {
		t.Fatalf("expected provided context to reach alias discovery, got %#v", got)
	}
	if !r.paths["/admin/pages"] || !r.paths["/admin/pages/*path"] {
		t.Fatalf("expected alias routes registered, got %v", sortedRoutePaths(r.paths))
	}
}
