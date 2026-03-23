package main

import (
	"net/http"
	"net/http/httptest"
	"testing"

	coreadmin "github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-featuregate/adapters/configadapter"
	fggate "github.com/goliatone/go-featuregate/gate"
	"github.com/goliatone/go-featuregate/resolver"
	"github.com/goliatone/go-featuregate/store"
	router "github.com/goliatone/go-router"
)

func TestRegisterDebugCompatibilityRoutesRedirectsRootSessionsAlias(t *testing.T) {
	handler, _ := newDebugCompatibilityTestServer(t)

	req := httptest.NewRequest(http.MethodGet, "/api/sessions?source=compat", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusPermanentRedirect {
		t.Fatalf("expected permanent redirect, got %d", rec.Code)
	}
	if location := rec.Header().Get("Location"); location != "/admin/debug/api/sessions?source=compat" {
		t.Fatalf("expected canonical debug sessions location, got %q", location)
	}
}

func TestRegisterDebugCompatibilityRoutesRedirectsAdminAPIDebugSessionsAlias(t *testing.T) {
	handler, adminAPIBasePath := newDebugCompatibilityTestServer(t)

	req := httptest.NewRequest(http.MethodGet, adminAPIBasePath+"/debug/sessions", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusPermanentRedirect {
		t.Fatalf("expected permanent redirect, got %d", rec.Code)
	}
	if location := rec.Header().Get("Location"); location != "/admin/debug/api/sessions" {
		t.Fatalf("expected canonical debug sessions location, got %q", location)
	}
}

func newDebugCompatibilityTestServer(t *testing.T) (http.Handler, string) {
	t.Helper()

	cfg := coreadmin.Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		Debug: coreadmin.DebugConfig{
			Enabled: true,
		},
	}
	adm, err := coreadmin.New(cfg, coreadmin.Dependencies{
		FeatureGate: debugCompatibilityFeatureGate(map[string]bool{"debug": true}),
	})
	if err != nil {
		t.Fatalf("new admin: %v", err)
	}
	if err := adm.RegisterModule(coreadmin.NewDebugModule(cfg.Debug)); err != nil {
		t.Fatalf("register debug module: %v", err)
	}

	server := router.NewHTTPServer()
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize admin: %v", err)
	}

	adminAPIBasePath := "/admin/api"
	if err := registerDebugCompatibilityRoutes(server.Router(), adm, adminAPIBasePath); err != nil {
		t.Fatalf("register debug compatibility routes: %v", err)
	}

	return server.WrappedRouter(), adminAPIBasePath
}

func debugCompatibilityFeatureGate(flags map[string]bool) fggate.MutableFeatureGate {
	if flags == nil {
		flags = map[string]bool{}
	}
	return resolver.New(
		resolver.WithDefaults(configadapter.NewDefaultsFromBools(flags)),
		resolver.WithOverrideStore(store.NewMemoryStore()),
	)
}
