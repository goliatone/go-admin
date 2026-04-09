package quickstart

import (
	"net/http"
	"net/http/httptest"
	"testing"

	router "github.com/goliatone/go-router"
)

func TestResolveInternalOpsConfigNormalizesDefaultPaths(t *testing.T) {
	cfg := ResolveInternalOpsConfig(InternalOpsConfig{
		EnableHealthz: true,
		EnableStatus:  true,
		HealthzPath:   " healthz ",
		StatusPath:    "ops/status/",
	})

	if cfg.HealthzPath != "/healthz" {
		t.Fatalf("expected healthz path /healthz, got %q", cfg.HealthzPath)
	}
	if cfg.StatusPath != "/ops/status" {
		t.Fatalf("expected status path /ops/status, got %q", cfg.StatusPath)
	}
}

func TestInternalOpsReservedPrefixesOnlyIncludeEnabledRoutes(t *testing.T) {
	got := InternalOpsReservedPrefixes(InternalOpsConfig{
		EnableHealthz: true,
		EnableStatus:  false,
	})
	if len(got) != 1 || got[0] != DefaultInternalOpsHealthzPath {
		t.Fatalf("expected only enabled healthz route, got %v", got)
	}

	got = InternalOpsReservedPrefixes(InternalOpsConfig{
		EnableHealthz: true,
		EnableStatus:  true,
		HealthzPath:   "/ready",
		StatusPath:    "/ops/status",
	})
	if len(got) != 2 || got[0] != "/ops/status" || got[1] != "/ready" {
		t.Fatalf("expected sorted enabled ops paths, got %v", got)
	}
}

func TestRegisterInternalOpsRoutesRegistersOnlyEnabledHandlers(t *testing.T) {
	server := router.NewHTTPServer()
	resolved, err := RegisterInternalOpsRoutes(server.Router(), InternalOpsConfig{
		EnableHealthz: true,
		EnableStatus:  false,
		HealthzPath:   "readyz",
		StatusPath:    "/ops/status",
	})
	if err != nil {
		t.Fatalf("register internal ops routes: %v", err)
	}

	if resolved.HealthzPath != "/readyz" || resolved.StatusPath != "/ops/status" {
		t.Fatalf("expected normalized paths, got %+v", resolved)
	}

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/readyz", nil)
	server.WrappedRouter().ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected healthz status 200, got %d body=%s", rec.Code, rec.Body.String())
	}

	missing := httptest.NewRecorder()
	missingReq := httptest.NewRequest(http.MethodGet, "/ops/status", nil)
	server.WrappedRouter().ServeHTTP(missing, missingReq)
	if missing.Code != http.StatusNotFound {
		t.Fatalf("expected disabled status route to remain unregistered, got %d body=%s", missing.Code, missing.Body.String())
	}
}

func TestRegisterInternalOpsRoutesRejectsNilRouter(t *testing.T) {
	if _, err := RegisterInternalOpsRoutes[any](nil, InternalOpsConfig{}); err == nil {
		t.Fatalf("expected nil router to fail")
	}
}
