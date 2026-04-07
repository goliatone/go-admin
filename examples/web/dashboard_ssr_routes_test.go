package main

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	coreadmin "github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/examples/web/setup"
	commandregistry "github.com/goliatone/go-command/registry"
	router "github.com/goliatone/go-router"
)

func TestExampleDashboardSSRRouteUsesTypedRenderer(t *testing.T) {
	if err := commandregistry.Stop(context.Background()); err != nil {
		t.Fatalf("stop command registry before test: %v", err)
	}
	t.Cleanup(func() {
		_ = commandregistry.Stop(context.Background())
	})

	cfg := coreadmin.Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		Title:         "Web Example",
		AuthConfig:    &coreadmin.AuthConfig{AllowUnauthenticatedRoutes: true},
	}
	adm, err := coreadmin.New(cfg, coreadmin.Dependencies{
		FeatureGate: debugCompatibilityFeatureGate(map[string]bool{
			string(coreadmin.FeatureCMS):         true,
			string(coreadmin.FeatureDashboard):   true,
			string(coreadmin.FeaturePreferences): true,
		}),
	})
	if err != nil {
		t.Fatalf("create admin: %v", err)
	}
	adm.WithAuth(translationRuntimeHarnessPassthroughAuthenticator{}, nil)
	adm.WithAuthorizer(translationRuntimeHarnessAllowAllAuthorizer{})

	renderer, err := setup.NewDashboardRenderer()
	if err != nil {
		t.Fatalf("create dashboard renderer: %v", err)
	}
	adm.Dashboard().WithRenderer(renderer)

	server := router.NewHTTPServer()
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize admin: %v", err)
	}

	req := httptest.NewRequest(http.MethodGet, "/admin/dashboard?locale=en", nil)
	req.Header.Set("X-User-ID", "web-test-user")
	rec := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 from /admin/dashboard, got %d body=%s", rec.Code, rec.Body.String())
	}
	if contentType := rec.Header().Get("Content-Type"); contentType == "" {
		t.Fatalf("expected content type for /admin/dashboard response")
	}
	body := rec.Body.String()
	if body == "" {
		t.Fatalf("expected SSR html body")
	}
	if !containsAll(body,
		`id="dashboard-state"`,
		`/admin/assets/dist/dashboard/index.js`,
	) {
		t.Fatalf("expected typed SSR dashboard markup, got body=%s", body)
	}
}

func containsAll(body string, fragments ...string) bool {
	for _, fragment := range fragments {
		if fragment == "" {
			continue
		}
		if !strings.Contains(body, fragment) {
			return false
		}
	}
	return true
}
