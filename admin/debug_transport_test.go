package admin

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
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

	req := httptest.NewRequest("GET", debugAPIPath(t, adm, cfg.Debug, "snapshot"), nil)
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

	req := httptest.NewRequest("GET", debugAPIPath(t, adm, cfg.Debug, "snapshot"), nil)
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != 200 {
		t.Fatalf("expected debug snapshot ok, got %d", rr.Code)
	}
	if authn.calls == 0 {
		t.Fatalf("expected authenticator to be invoked")
	}
}

func TestDebugDoctorActionEndpointRunsCheckAction(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		Debug: DebugConfig{
			Enabled: true,
		},
	}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromFlags(map[string]bool{"debug": true})})
	adm.WithAuthorizer(allowAuthorizer{})
	called := false
	adm.RegisterDoctorChecks(DoctorCheck{
		ID:          "debug.autofix",
		Description: "test",
		Run: func(_ context.Context, _ *Admin) DoctorCheckOutput {
			return DoctorCheckOutput{
				Findings: []DoctorFinding{{Severity: DoctorSeverityWarn, Message: "fix me"}},
			}
		},
		Action: &DoctorAction{
			CTA: "Run auto fix",
			Run: func(_ context.Context, _ *Admin, _ DoctorCheckResult, input map[string]any) (DoctorActionExecution, error) {
				called = input["source"] == "transport-test"
				return DoctorActionExecution{Status: "ok", Message: "fixed"}, nil
			},
		},
	})
	if err := adm.RegisterModule(NewDebugModule(cfg.Debug)); err != nil {
		t.Fatalf("register debug module: %v", err)
	}

	server := router.NewHTTPServer()
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	path := strings.Replace(debugAPIPath(t, adm, cfg.Debug, "doctor.action"), ":check", "debug.autofix", 1)
	req := httptest.NewRequest("POST", path, strings.NewReader(`{"source":"transport-test"}`))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != 200 {
		t.Fatalf("expected 200 doctor action, got %d: %s", rr.Code, rr.Body.String())
	}
	if !called {
		t.Fatalf("expected doctor action handler invocation")
	}
}

// jsErrorTestConfig returns a DebugConfig with CaptureJSErrors enabled.
func jsErrorTestConfig() DebugConfig {
	return DebugConfig{
		Enabled:         true,
		CaptureJSErrors: true,
		Panels:          []string{DebugPanelJSErrors},
	}
}

// addNonceCookie adds the nonce cookie and returns a body with the nonce field.
func addNonceCookie(req *http.Request, nonce string) {
	req.AddCookie(&http.Cookie{
		Name:  debugNonceCookieName,
		Value: nonce,
	})
}

func TestJSErrorReportEndpointAcceptsValidPayload(t *testing.T) {
	debugCfg := jsErrorTestConfig()
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		Debug:         debugCfg,
	}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromFlags(map[string]bool{"debug": true})})
	if err := adm.RegisterModule(NewDebugModule(debugCfg)); err != nil {
		t.Fatalf("register debug module: %v", err)
	}

	server := router.NewHTTPServer()
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	nonce := "test-nonce-abc123"
	body := `{"type":"uncaught","message":"ReferenceError: foo is not defined","source":"app.js","line":42,"nonce":"` + nonce + `"}`
	req := httptest.NewRequest("POST", debugAPIPath(t, adm, debugCfg, "errors"), strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	addNonceCookie(req, nonce)
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != 200 {
		t.Fatalf("expected 200 for valid payload, got %d: %s", rr.Code, rr.Body.String())
	}
	if !strings.Contains(rr.Body.String(), `"status":"ok"`) {
		t.Fatalf("expected status ok in response, got %s", rr.Body.String())
	}
}

func TestJSErrorReportEndpointRejectsEmptyMessage(t *testing.T) {
	debugCfg := jsErrorTestConfig()
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		Debug:         debugCfg,
	}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromFlags(map[string]bool{"debug": true})})
	if err := adm.RegisterModule(NewDebugModule(debugCfg)); err != nil {
		t.Fatalf("register debug module: %v", err)
	}

	server := router.NewHTTPServer()
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	nonce := "test-nonce-empty-msg"
	body := `{"type":"uncaught","message":"","nonce":"` + nonce + `"}`
	req := httptest.NewRequest("POST", debugAPIPath(t, adm, debugCfg, "errors"), strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	addNonceCookie(req, nonce)
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != 400 {
		t.Fatalf("expected 400 for empty message, got %d: %s", rr.Code, rr.Body.String())
	}
}

func TestJSErrorReportEndpointRejectsInvalidJSON(t *testing.T) {
	debugCfg := jsErrorTestConfig()
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		Debug:         debugCfg,
	}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromFlags(map[string]bool{"debug": true})})
	if err := adm.RegisterModule(NewDebugModule(debugCfg)); err != nil {
		t.Fatalf("register debug module: %v", err)
	}

	server := router.NewHTTPServer()
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	body := `not json`
	req := httptest.NewRequest("POST", debugAPIPath(t, adm, debugCfg, "errors"), strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	addNonceCookie(req, "some-nonce")
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != 400 {
		t.Fatalf("expected 400 for invalid JSON, got %d: %s", rr.Code, rr.Body.String())
	}
}

func TestJSErrorReportEndpointNoAuthRequired(t *testing.T) {
	debugCfg := jsErrorTestConfig()
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		Debug:         debugCfg,
	}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromFlags(map[string]bool{"debug": true})})
	adm.WithAuthorizer(denyAllAuthz{})
	if err := adm.RegisterModule(NewDebugModule(debugCfg)); err != nil {
		t.Fatalf("register debug module: %v", err)
	}

	server := router.NewHTTPServer()
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	// api/errors should be accessible even with denyAllAuthz (uses nonce instead)
	nonce := "test-nonce-no-auth"
	body := `{"type":"uncaught","message":"test error","nonce":"` + nonce + `"}`
	req := httptest.NewRequest("POST", debugAPIPath(t, adm, debugCfg, "errors"), strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	addNonceCookie(req, nonce)
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != 200 {
		t.Fatalf("expected 200 for unauthenticated error report with valid nonce, got %d: %s", rr.Code, rr.Body.String())
	}
}

func TestJSErrorReportEndpointRejectsMismatchedNonce(t *testing.T) {
	debugCfg := jsErrorTestConfig()
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		Debug:         debugCfg,
	}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromFlags(map[string]bool{"debug": true})})
	if err := adm.RegisterModule(NewDebugModule(debugCfg)); err != nil {
		t.Fatalf("register debug module: %v", err)
	}

	server := router.NewHTTPServer()
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	body := `{"type":"uncaught","message":"test error","nonce":"body-nonce"}`
	req := httptest.NewRequest("POST", debugAPIPath(t, adm, debugCfg, "errors"), strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	addNonceCookie(req, "cookie-nonce") // Different from body nonce
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != 403 {
		t.Fatalf("expected 403 for mismatched nonce, got %d: %s", rr.Code, rr.Body.String())
	}
}

func TestJSErrorReportEndpointRejectsMissingNonce(t *testing.T) {
	debugCfg := jsErrorTestConfig()
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		Debug:         debugCfg,
	}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromFlags(map[string]bool{"debug": true})})
	if err := adm.RegisterModule(NewDebugModule(debugCfg)); err != nil {
		t.Fatalf("register debug module: %v", err)
	}

	server := router.NewHTTPServer()
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	// No nonce cookie, no nonce in body
	body := `{"type":"uncaught","message":"test error"}`
	req := httptest.NewRequest("POST", debugAPIPath(t, adm, debugCfg, "errors"), strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != 403 {
		t.Fatalf("expected 403 for missing nonce, got %d: %s", rr.Code, rr.Body.String())
	}
}

func TestJSErrorReportEndpointReturns404WhenDisabled(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		Debug: DebugConfig{
			Enabled:         true,
			CaptureJSErrors: false, // Explicitly disabled
			Panels:          []string{DebugPanelJSErrors},
		},
	}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromFlags(map[string]bool{"debug": true})})
	if err := adm.RegisterModule(NewDebugModule(cfg.Debug)); err != nil {
		t.Fatalf("register debug module: %v", err)
	}

	server := router.NewHTTPServer()
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	body := `{"type":"uncaught","message":"test error"}`
	req := httptest.NewRequest("POST", debugAPIPath(t, adm, cfg.Debug, "errors"), strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != 404 {
		t.Fatalf("expected 404 when CaptureJSErrors is disabled, got %d: %s", rr.Code, rr.Body.String())
	}
}

func TestJSErrorReportEndpointAcceptsNetworkErrorType(t *testing.T) {
	debugCfg := jsErrorTestConfig()
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		Debug:         debugCfg,
	}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromFlags(map[string]bool{"debug": true})})
	if err := adm.RegisterModule(NewDebugModule(debugCfg)); err != nil {
		t.Fatalf("register debug module: %v", err)
	}

	server := router.NewHTTPServer()
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	nonce := "test-nonce-network"
	body := `{"type":"network_error","message":"GET http://localhost/api/test 404 (Not Found)","nonce":"` + nonce + `","extra":{"method":"GET","status":404,"status_text":"Not Found","request_url":"http://localhost/api/test"}}`
	req := httptest.NewRequest("POST", debugAPIPath(t, adm, debugCfg, "errors"), strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	addNonceCookie(req, nonce)
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != 200 {
		t.Fatalf("expected 200 for network_error type, got %d: %s", rr.Code, rr.Body.String())
	}
	if !strings.Contains(rr.Body.String(), `"status":"ok"`) {
		t.Fatalf("expected status ok in response, got %s", rr.Body.String())
	}
}

func debugAPIPath(t *testing.T, adm *Admin, cfg DebugConfig, route string) string {
	t.Helper()
	path := debugAPIRoutePath(adm, cfg, route)
	if path == "" {
		t.Fatalf("expected debug api path for %s", route)
	}
	return path
}
