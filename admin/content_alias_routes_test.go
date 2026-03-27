package admin

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	router "github.com/goliatone/go-router"
)

type contentAliasSpyContentTypeService struct {
	types     []CMSContentType
	seenTypes []context.Context
}

func (s *contentAliasSpyContentTypeService) ContentTypes(ctx context.Context) ([]CMSContentType, error) {
	s.seenTypes = append(s.seenTypes, ctx)
	out := make([]CMSContentType, len(s.types))
	copy(out, s.types)
	return out, nil
}

func (s *contentAliasSpyContentTypeService) ContentType(_ context.Context, id string) (*CMSContentType, error) {
	for _, contentType := range s.types {
		if contentType.ID == id {
			copy := contentType
			return &copy, nil
		}
	}
	return nil, nil
}

func (s *contentAliasSpyContentTypeService) ContentTypeBySlug(ctx context.Context, slug string) (*CMSContentType, error) {
	s.seenTypes = append(s.seenTypes, ctx)
	for _, contentType := range s.types {
		if strings.EqualFold(strings.TrimSpace(contentType.Slug), strings.TrimSpace(slug)) {
			copy := contentType
			return &copy, nil
		}
	}
	return nil, nil
}

func (s *contentAliasSpyContentTypeService) CreateContentType(_ context.Context, contentType CMSContentType) (*CMSContentType, error) {
	copy := contentType
	s.types = append(s.types, copy)
	return &copy, nil
}

func (s *contentAliasSpyContentTypeService) UpdateContentType(_ context.Context, contentType CMSContentType) (*CMSContentType, error) {
	copy := contentType
	return &copy, nil
}

func (s *contentAliasSpyContentTypeService) DeleteContentType(context.Context, string) error {
	return nil
}

type contentAliasSpyContainer struct {
	contentTypes CMSContentTypeService
}

func (s *contentAliasSpyContainer) WidgetService() CMSWidgetService   { return nil }
func (s *contentAliasSpyContainer) MenuService() CMSMenuService       { return nil }
func (s *contentAliasSpyContainer) ContentService() CMSContentService { return nil }
func (s *contentAliasSpyContainer) ContentTypeService() CMSContentTypeService {
	return s.contentTypes
}

func TestContentAliasRoutesRedirectToContentEntryPanels(t *testing.T) {
	cfg := Config{BasePath: "/admin", DefaultLocale: "en"}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromKeys(FeatureCMS)})

	contentSvc, ok := adm.ContentTypeService().(*InMemoryContentService)
	if !ok || contentSvc == nil {
		t.Fatalf("expected in-memory content type service")
	}

	_, err := contentSvc.CreateContentType(context.Background(), CMSContentType{
		Name:         "Page",
		Slug:         "page",
		Status:       "active",
		Schema:       minimalContentTypeSchema(),
		Capabilities: map[string]any{"panel_slug": "pages"},
	})
	if err != nil {
		t.Fatalf("seed page content type failed: %v", err)
	}
	_, err = contentSvc.CreateContentType(context.Background(), CMSContentType{
		Name:         "Blog Post",
		Slug:         "blog_post",
		Status:       "active",
		Schema:       minimalContentTypeSchema(),
		Capabilities: map[string]any{"panel_slug": "posts"},
	})
	if err != nil {
		t.Fatalf("seed blog_post content type failed: %v", err)
	}

	server := router.NewHTTPServer()
	adm.router = server.Router()
	adm.registerContentEntryAliases()

	req := httptest.NewRequest("GET", "/admin/pages", nil)
	res := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(res, req)
	if res.Code != http.StatusFound {
		t.Fatalf("expected redirect for pages alias, got %d", res.Code)
	}
	if location := res.Header().Get("Location"); location != "/admin/content/pages" {
		t.Fatalf("unexpected pages redirect: %q", location)
	}

	req = httptest.NewRequest("GET", "/admin/posts/2024?channel=staging&foo=bar", nil)
	res = httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(res, req)
	if res.Code != http.StatusFound {
		t.Fatalf("expected redirect for posts alias, got %d", res.Code)
	}
	location := res.Header().Get("Location")
	if !strings.HasPrefix(location, "/admin/content/posts/2024") || !strings.Contains(location, "channel=staging") || !strings.Contains(location, "foo=bar") {
		t.Fatalf("unexpected posts redirect: %q", location)
	}
}

func TestContentAliasRoutesUseLifecycleContextForAliasDiscovery(t *testing.T) {
	type lifecycleKey struct{}

	cfg := Config{BasePath: "/admin", DefaultLocale: "en"}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromKeys(FeatureCMS)})
	spy := &contentAliasSpyContentTypeService{
		types: []CMSContentType{{
			ID:           "ct-page",
			Name:         "Page",
			Slug:         "page",
			Status:       "active",
			Schema:       minimalContentTypeSchema(),
			Capabilities: map[string]any{"panel_slug": "pages"},
		}},
	}
	adm.UseCMS(&contentAliasSpyContainer{contentTypes: spy})
	lifecycleCtx := context.WithValue(context.Background(), lifecycleKey{}, "boot-alias-context")
	adm.bootContext = lifecycleCtx

	server := router.NewHTTPServer()
	adm.router = server.Router()
	adm.registerContentEntryAliases()

	if len(spy.seenTypes) == 0 {
		t.Fatalf("expected content type discovery during alias registration")
	}
	if got := spy.seenTypes[0].Value(lifecycleKey{}); got != "boot-alias-context" {
		t.Fatalf("expected lifecycle context to reach alias discovery, got %#v", got)
	}
}
