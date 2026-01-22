package admin

import (
	"net/http/httptest"
	"testing"

	router "github.com/goliatone/go-router"
)

func TestDebugRoutesRequirePermission(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		Debug: DebugConfig{
			Enabled: true,
		},
	}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromFlags(map[string]bool{"debug": true})})
	adm.WithAuthorizer(denyAllAuthz{})
	if err := adm.RegisterModule(NewDebugModule(cfg.Debug)); err != nil {
		t.Fatalf("register debug module: %v", err)
	}

	server := router.NewHTTPServer()
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	req := httptest.NewRequest("GET", "/admin/debug/api/snapshot", nil)
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != 403 {
		t.Fatalf("expected debug snapshot to enforce permissions, got %d", rr.Code)
	}
}

func TestDebugRoutesUseAuthenticator(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		Debug: DebugConfig{
			Enabled: true,
		},
	}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromFlags(map[string]bool{"debug": true})})
	authn := &recordingAuthenticator{}
	adm.WithAuth(authn, nil)
	adm.WithAuthorizer(allowAuthorizer{})
	if err := adm.RegisterModule(NewDebugModule(cfg.Debug)); err != nil {
		t.Fatalf("register debug module: %v", err)
	}

	server := router.NewHTTPServer()
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	req := httptest.NewRequest("GET", "/admin/debug/api/snapshot", nil)
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != 200 {
		t.Fatalf("expected debug snapshot ok, got %d", rr.Code)
	}
	if authn.calls == 0 {
		t.Fatalf("expected authenticator to be invoked")
	}
}
