package admin

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	router "github.com/goliatone/go-router"
)

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

	req = httptest.NewRequest("GET", "/admin/posts/2024?env=staging&foo=bar", nil)
	res = httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(res, req)
	if res.Code != http.StatusFound {
		t.Fatalf("expected redirect for posts alias, got %d", res.Code)
	}
	location := res.Header().Get("Location")
	if !strings.HasPrefix(location, "/admin/content/posts/2024") || !strings.Contains(location, "env=staging") || !strings.Contains(location, "foo=bar") {
		t.Fatalf("unexpected posts redirect: %q", location)
	}
}
