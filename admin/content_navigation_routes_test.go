package admin

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	router "github.com/goliatone/go-router"
	"github.com/julienschmidt/httprouter"
)

type contentNavigationPermissionAuthorizer struct {
	allowed map[string]bool
}

func (a contentNavigationPermissionAuthorizer) Can(_ context.Context, action string, _ string) bool {
	if len(a.allowed) == 0 {
		return false
	}
	return a.allowed[action]
}

func newContentNavigationTestServer(t *testing.T, capabilities map[string]any, allowed map[string]bool) (*Admin, router.Server[*httprouter.Router], string) {
	t.Helper()
	cfg := Config{BasePath: "/admin", DefaultLocale: "en"}
	deps := Dependencies{
		FeatureGate: featureGateFromKeys(FeatureCMS),
		Authorizer:  contentNavigationPermissionAuthorizer{allowed: allowed},
	}
	adm := mustNewAdmin(t, cfg, deps)

	record, err := adm.contentTypeSvc.CreateContentType(context.Background(), CMSContentType{
		Name: "Page",
		Slug: "page",
		Schema: map[string]any{
			"fields": []map[string]any{{"name": "title", "type": "string"}},
		},
		Capabilities: map[string]any{
			"navigation": capabilities,
		},
	})
	if err != nil {
		t.Fatalf("create content type: %v", err)
	}
	if record == nil {
		t.Fatalf("expected created content type")
	}

	repo := NewCMSContentTypeEntryRepository(adm.contentSvc, *record)
	_, err = adm.RegisterPanel("page", adm.Panel("page").
		WithRepository(repo).
		ListFields(Field{Name: "title", Type: "text"}).
		DetailFields(Field{Name: "title", Type: "text"}).
		Permissions(PanelPermissions{View: "page:read", Edit: "page:update"}))
	if err != nil {
		t.Fatalf("register page panel: %v", err)
	}

	created, err := repo.Create(context.Background(), map[string]any{
		"title":  "Home",
		"slug":   "home",
		"locale": "en",
		"status": "draft",
	})
	if err != nil {
		t.Fatalf("create page entry: %v", err)
	}
	id := strings.TrimSpace(toString(created["id"]))
	if id == "" {
		t.Fatalf("expected created entry id")
	}

	server := router.NewHTTPServer()
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}
	return adm, server, id
}

func TestContentNavigationPatchTriStateToggles(t *testing.T) {
	adm, server, id := newContentNavigationTestServer(t, map[string]any{
		"enabled":                 true,
		"eligible_locations":      []string{"site.main", "site.footer"},
		"default_locations":       []string{"site.footer"},
		"default_visible":         true,
		"allow_instance_override": true,
		"merge_mode":              "append",
	}, map[string]bool{
		"page:read":   true,
		"page:update": true,
	})
	group := adminAPIGroupName(adm.config)
	path := mustResolveURL(t, adm.URLs(), group, "content.navigation", map[string]string{"type": "page", "id": id}, nil)

	req := httptest.NewRequest(http.MethodPatch, path, strings.NewReader(`{"_navigation":{"site.main":"show","site.footer":"hide"}}`))
	req.Header.Set("Content-Type", "application/json")
	res := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(res, req)
	if res.Code != http.StatusOK {
		t.Fatalf("patch navigation status=%d body=%s", res.Code, res.Body.String())
	}

	payload := decodeJSONMap(t, res)
	data := extractMap(payload["data"])
	navigation := extractMap(data["_navigation"])
	if got := strings.TrimSpace(toString(navigation["site.main"])); got != NavigationOverrideShow {
		t.Fatalf("expected site.main=show, got %q", got)
	}
	if got := strings.TrimSpace(toString(navigation["site.footer"])); got != NavigationOverrideHide {
		t.Fatalf("expected site.footer=hide, got %q", got)
	}
	locations := toStringSlice(data["effective_menu_locations"])
	if len(locations) != 1 || locations[0] != "site.main" {
		t.Fatalf("expected effective_menu_locations=[site.main], got %+v", locations)
	}
	visibility := extractMap(data["effective_navigation_visibility"])
	if !toBool(visibility["site.main"]) {
		t.Fatalf("expected effective_navigation_visibility.site.main=true, got %+v", visibility)
	}
	if toBool(visibility["site.footer"]) {
		t.Fatalf("expected effective_navigation_visibility.site.footer=false, got %+v", visibility)
	}

	detailPath := mustResolveURL(t, adm.URLs(), group, "panel.id", map[string]string{"panel": "page", "id": id}, nil)
	detailReq := httptest.NewRequest(http.MethodGet, detailPath, nil)
	detailRes := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(detailRes, detailReq)
	if detailRes.Code != http.StatusOK {
		t.Fatalf("detail status=%d body=%s", detailRes.Code, detailRes.Body.String())
	}
	detail := extractMap(decodeJSONMap(t, detailRes)["data"])
	if got := toStringSlice(detail["effective_menu_locations"]); len(got) != 1 || got[0] != "site.main" {
		t.Fatalf("expected persisted effective_menu_locations=[site.main], got %+v", got)
	}
}

func TestContentNavigationPatchRequiresEditPermission(t *testing.T) {
	adm, server, id := newContentNavigationTestServer(t, map[string]any{
		"enabled":                 true,
		"eligible_locations":      []string{"site.main", "site.footer"},
		"default_locations":       []string{"site.main"},
		"default_visible":         true,
		"allow_instance_override": true,
	}, map[string]bool{
		"page:read":   true,
		"page:update": false,
	})
	group := adminAPIGroupName(adm.config)
	path := mustResolveURL(t, adm.URLs(), group, "content.navigation", map[string]string{"type": "page", "id": id}, nil)

	req := httptest.NewRequest(http.MethodPatch, path, strings.NewReader(`{"_navigation":{"site.main":"show"}}`))
	req.Header.Set("Content-Type", "application/json")
	res := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(res, req)
	if res.Code != http.StatusForbidden {
		t.Fatalf("expected forbidden status, got %d body=%s", res.Code, res.Body.String())
	}
	errPayload := extractMap(decodeJSONMap(t, res)["error"])
	if got := strings.ToUpper(strings.TrimSpace(toString(errPayload["text_code"]))); got != TextCodeForbidden {
		t.Fatalf("expected FORBIDDEN text_code, got %q", got)
	}
}

func TestContentNavigationPatchReturnsInvalidLocationGuidance(t *testing.T) {
	adm, server, id := newContentNavigationTestServer(t, map[string]any{
		"enabled":                 true,
		"eligible_locations":      []string{"site.main", "site.footer"},
		"default_locations":       []string{"site.main"},
		"default_visible":         true,
		"allow_instance_override": true,
	}, map[string]bool{
		"page:read":   true,
		"page:update": true,
	})
	group := adminAPIGroupName(adm.config)
	path := mustResolveURL(t, adm.URLs(), group, "content.navigation", map[string]string{"type": "page", "id": id}, nil)

	req := httptest.NewRequest(http.MethodPatch, path, strings.NewReader(`{"_navigation":{"site.unknown":"show"}}`))
	req.Header.Set("Content-Type", "application/json")
	res := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(res, req)
	if res.Code != http.StatusBadRequest {
		t.Fatalf("expected validation failure, got %d body=%s", res.Code, res.Body.String())
	}
	errPayload := extractMap(decodeJSONMap(t, res)["error"])
	if got := strings.ToUpper(strings.TrimSpace(toString(errPayload["text_code"]))); got != TextCodeValidationError {
		t.Fatalf("expected VALIDATION_ERROR text_code, got %q", got)
	}
	meta := extractMap(errPayload["metadata"])
	if got := strings.TrimSpace(toString(meta["field"])); got != "_navigation.site.unknown" {
		t.Fatalf("expected field _navigation.site.unknown, got %q", got)
	}
	allowed := toStringSlice(meta["allowed_locations"])
	if len(allowed) != 2 || allowed[0] != "site.footer" || allowed[1] != "site.main" {
		t.Fatalf("expected sorted allowed_locations [site.footer site.main], got %+v", allowed)
	}
	guidance := extractMap(meta["guidance"])
	if len(extractMap(guidance["invalid_location"])) == 0 {
		t.Fatalf("expected inline invalid_location guidance metadata")
	}
}

func TestContentNavigationPatchIgnoresOverridesWhenDisabled(t *testing.T) {
	adm, server, id := newContentNavigationTestServer(t, map[string]any{
		"enabled":                 true,
		"eligible_locations":      []string{"site.main", "site.footer"},
		"default_locations":       []string{"site.main"},
		"default_visible":         true,
		"allow_instance_override": false,
	}, map[string]bool{
		"page:read":   true,
		"page:update": true,
	})
	group := adminAPIGroupName(adm.config)
	path := mustResolveURL(t, adm.URLs(), group, "content.navigation", map[string]string{"type": "page", "id": id}, nil)

	req := httptest.NewRequest(http.MethodPatch, path, strings.NewReader(`{"_navigation":{"site.main":"hide","site.footer":"show"}}`))
	req.Header.Set("Content-Type", "application/json")
	res := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(res, req)
	if res.Code != http.StatusOK {
		t.Fatalf("patch navigation status=%d body=%s", res.Code, res.Body.String())
	}
	data := extractMap(decodeJSONMap(t, res)["data"])
	if nav := extractMap(data["_navigation"]); len(nav) != 0 {
		t.Fatalf("expected overrides to be ignored when allow_instance_override=false, got %+v", nav)
	}
	locations := toStringSlice(data["effective_menu_locations"])
	if len(locations) != 1 || locations[0] != "site.main" {
		t.Fatalf("expected effective_menu_locations=[site.main], got %+v", locations)
	}
	visibility := extractMap(data["effective_navigation_visibility"])
	if !toBool(visibility["site.main"]) || toBool(visibility["site.footer"]) {
		t.Fatalf("expected site.main visible and site.footer hidden, got %+v", visibility)
	}
}
