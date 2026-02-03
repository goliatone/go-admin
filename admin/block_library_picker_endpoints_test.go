package admin

import (
	"context"
	"encoding/json"
	"net/http/httptest"
	"testing"

	router "github.com/goliatone/go-router"
	"github.com/julienschmidt/httprouter"
)

type templateServerOptions struct {
	permission string
	authorizer Authorizer
}

func setupBlockDefinitionTemplateServer(t *testing.T, opts templateServerOptions) (router.Server[*httprouter.Router], *InMemoryContentService) {
	t.Helper()

	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
	}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromKeys(FeatureCMS, FeatureCommands)})
	if opts.authorizer != nil {
		adm.WithAuthorizer(opts.authorizer)
	}

	moduleOpts := []ContentTypeBuilderOption{}
	if opts.permission != "" {
		moduleOpts = append(moduleOpts, WithContentTypeBuilderPermission(opts.permission))
	}
	if err := adm.RegisterModule(NewContentTypeBuilderModule(moduleOpts...)); err != nil {
		t.Fatalf("register module: %v", err)
	}

	container := NewNoopCMSContainer()
	adm.UseCMS(container)

	server := router.NewHTTPServer()
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	return server, container.content
}

func TestBlockDefinitionTemplateEndpoint_SingleActiveSlug(t *testing.T) {
	server, content := setupBlockDefinitionTemplateServer(t, templateServerOptions{})
	seedBlockDefinitions(t, content)
	_, _ = content.CreateBlockDefinition(context.Background(), CMSBlockDefinition{
		ID:     "case-1",
		Name:   "Case Active",
		Slug:   "case_active",
		Type:   "case_active",
		Status: "Active",
		Schema: map[string]any{
			"type":       "object",
			"properties": map[string]any{},
		},
	})

	req := httptest.NewRequest("GET", "/admin/api/block_definitions_meta/templates/case_active", nil)
	req.Header.Set("X-User-ID", "user-1")
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != 200 {
		t.Fatalf("expected 200, got %d body=%s", rr.Code, rr.Body.String())
	}

	var resp struct {
		Items []blockDefinitionTemplateItem `json:"items"`
	}
	if err := json.Unmarshal(rr.Body.Bytes(), &resp); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if len(resp.Items) != 1 {
		t.Fatalf("expected 1 item, got %d", len(resp.Items))
	}
	if resp.Items[0].Disabled {
		t.Error("expected disabled=false for status=Active")
	}
}

func TestBlockDefinitionTemplateEndpoint_SingleInactiveSlugRequiresIncludeInactive(t *testing.T) {
	server, content := setupBlockDefinitionTemplateServer(t, templateServerOptions{})
	seedBlockDefinitions(t, content)

	req := httptest.NewRequest("GET", "/admin/api/block_definitions_meta/templates/old_banner", nil)
	req.Header.Set("X-User-ID", "user-1")
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != 404 {
		t.Fatalf("expected 404 for inactive slug, got %d body=%s", rr.Code, rr.Body.String())
	}

	req = httptest.NewRequest("GET", "/admin/api/block_definitions_meta/templates/old_banner?include_inactive=true", nil)
	req.Header.Set("X-User-ID", "user-1")
	rr = httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != 200 {
		t.Fatalf("expected 200 with include_inactive, got %d body=%s", rr.Code, rr.Body.String())
	}

	var resp struct {
		Items []blockDefinitionTemplateItem `json:"items"`
	}
	if err := json.Unmarshal(rr.Body.Bytes(), &resp); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if len(resp.Items) != 1 {
		t.Fatalf("expected 1 item, got %d", len(resp.Items))
	}
	if !resp.Items[0].Disabled {
		t.Error("expected disabled=true for inactive slug")
	}
}

func TestBlockDefinitionTemplateEndpoint_BatchSlugs(t *testing.T) {
	server, content := setupBlockDefinitionTemplateServer(t, templateServerOptions{})
	seedBlockDefinitions(t, content)

	req := httptest.NewRequest("GET", "/admin/api/block_definitions_meta/templates?slugs=hero_section,old_banner&include_inactive=true", nil)
	req.Header.Set("X-User-ID", "user-1")
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != 200 {
		t.Fatalf("expected 200, got %d body=%s", rr.Code, rr.Body.String())
	}

	var resp struct {
		Items []blockDefinitionTemplateItem `json:"items"`
	}
	if err := json.Unmarshal(rr.Body.Bytes(), &resp); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if len(resp.Items) != 2 {
		t.Fatalf("expected 2 items, got %d", len(resp.Items))
	}
	itemMap := map[string]blockDefinitionTemplateItem{}
	for _, item := range resp.Items {
		itemMap[item.Slug] = item
	}
	if itemMap["hero_section"].Disabled {
		t.Error("expected hero_section disabled=false")
	}
	if !itemMap["old_banner"].Disabled {
		t.Error("expected old_banner disabled=true")
	}
}

func TestBlockDefinitionTemplateEndpoint_EmptySlugsReturnsAll(t *testing.T) {
	server, content := setupBlockDefinitionTemplateServer(t, templateServerOptions{})
	seedBlockDefinitions(t, content)

	req := httptest.NewRequest("GET", "/admin/api/block_definitions_meta/templates?include_inactive=true", nil)
	req.Header.Set("X-User-ID", "user-1")
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != 200 {
		t.Fatalf("expected 200, got %d body=%s", rr.Code, rr.Body.String())
	}

	var resp struct {
		Items []blockDefinitionTemplateItem `json:"items"`
	}
	if err := json.Unmarshal(rr.Body.Bytes(), &resp); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if len(resp.Items) != 4 {
		t.Fatalf("expected 4 items, got %d", len(resp.Items))
	}
}

func TestBlockDefinitionTemplateEndpoint_Unauthorized(t *testing.T) {
	server, content := setupBlockDefinitionTemplateServer(t, templateServerOptions{
		permission: "admin.content_types.view",
		authorizer: stubAuthorizer{allow: false},
	})
	seedBlockDefinitions(t, content)

	req := httptest.NewRequest("GET", "/admin/api/block_definitions_meta/templates/hero_section", nil)
	req.Header.Set("X-User-ID", "user-1")
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != 403 {
		t.Fatalf("expected 403, got %d body=%s", rr.Code, rr.Body.String())
	}
}
