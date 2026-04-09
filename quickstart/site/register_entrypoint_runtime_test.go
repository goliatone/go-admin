package site

import (
	"strings"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/goliatone/go-admin/admin"
)

func TestRegisterSiteRoutesEntrypointRejectsNilRouter(t *testing.T) {
	err := registerSiteRoutes[*fiber.App](nil, nil, admin.Config{DefaultLocale: "en"}, SiteConfig{}, nil)
	if err == nil {
		t.Fatalf("expected nil router to fail")
	}
	if !strings.Contains(err.Error(), "site router is required") {
		t.Fatalf("expected nil-router error, got %v", err)
	}
}

func TestRegisterSiteRoutesEntrypointDelegatesToResolvedFlow(t *testing.T) {
	cfg := admin.Config{DefaultLocale: "en"}
	siteCfg := SiteConfig{
		BasePath: "/site",
		Modules: []SiteModule{
			moduleStub{id: "a", registerRoute: "/module-a"},
		},
	}
	recorder := &recordingRouter{}

	if err := registerSiteRoutes[*fiber.App](recorder, nil, cfg, siteCfg, []SiteOption{WithSearchProvider(searchProviderStub{})}); err != nil {
		t.Fatalf("register entrypoint: %v", err)
	}

	expected := []recordedRoute{
		{Method: "GET", Path: "/module-a"},
		{Method: "GET", Path: "/site/search"},
		{Method: "GET", Path: "/api/v1/site/search"},
		{Method: "GET", Path: "/api/v1/site/search/suggest"},
		{Method: "GET", Path: "/site"},
		{Method: "GET", Path: "/site/*path"},
	}
	for _, route := range expected {
		if indexOfRoute(recorder.routes, route.Method, route.Path) == -1 {
			t.Fatalf("expected route %s %s, got %+v", route.Method, route.Path, recorder.routes)
		}
	}
	if len(recorder.middlewares) != 1 {
		t.Fatalf("expected one request-context middleware, got %d", len(recorder.middlewares))
	}
}

func TestRegisterSiteRoutesEntrypointRejectsInvalidFallbackPolicy(t *testing.T) {
	recorder := &recordingRouter{}
	err := registerSiteRoutes[*fiber.App](recorder, nil, admin.Config{DefaultLocale: "en"}, SiteConfig{
		Fallback: SiteFallbackPolicy{
			Mode: SiteFallbackMode("typo_mode"),
		},
	}, nil)
	if err == nil {
		t.Fatalf("expected invalid fallback policy to fail")
	}
	if !strings.Contains(err.Error(), "invalid site fallback policy") {
		t.Fatalf("expected invalid fallback policy error, got %v", err)
	}
}
