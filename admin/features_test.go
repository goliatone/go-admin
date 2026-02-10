package admin

import (
	"encoding/json"
	"errors"
	"net/http/httptest"
	"strings"
	"testing"

	router "github.com/goliatone/go-router"
)

func TestInitializeValidatesFeatureDependencies(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
	}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromKeys(FeatureBulk)})
	server := router.NewHTTPServer()

	err := adm.Initialize(server.Router())
	if err == nil {
		t.Fatalf("expected dependency validation error")
	}
	var invalid InvalidFeatureConfigError
	if !errors.As(err, &invalid) {
		t.Fatalf("expected InvalidFeatureConfigError, got %v", err)
	}
	if len(invalid.Issues) == 0 {
		t.Fatalf("expected at least one dependency issue, got %v", invalid)
	}
}

func TestSearchRouteRespectsFeatureGates(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
	}
	adm := mustNewAdmin(t, cfg, Dependencies{})
	server := router.NewHTTPServer()
	r := server.Router()

	if err := adm.Initialize(r); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	req := httptest.NewRequest("GET", "/admin/api/search?query=missing", nil)
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != 404 {
		t.Fatalf("expected 404 when search is disabled, got %d", rr.Code)
	}

	var body map[string]any
	_ = json.Unmarshal(rr.Body.Bytes(), &body)
	errPayload, ok := body["error"].(map[string]any)
	if !ok {
		t.Fatalf("expected structured error payload, got %v", body)
	}
	if code := int(errPayload["code"].(float64)); code != 404 {
		t.Fatalf("expected error code 404, got %d", code)
	}
	msg := strings.ToLower(toString(errPayload["message"]))
	if msg == "" || !strings.Contains(msg, "search") {
		t.Fatalf("expected search gate error message, got %v", errPayload)
	}
	if text := toString(errPayload["text_code"]); text != "FEATURE_DISABLED" {
		t.Fatalf("expected FEATURE_DISABLED text_code, got %v", text)
	}
}

func TestInitializeValidatesTranslationExchangeFeatureDependencies(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
	}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromKeys(FeatureTranslationExchange)})
	server := router.NewHTTPServer()

	err := adm.Initialize(server.Router())
	if err == nil {
		t.Fatalf("expected dependency validation error")
	}
	var invalid InvalidFeatureConfigError
	if !errors.As(err, &invalid) {
		t.Fatalf("expected InvalidFeatureConfigError, got %v", err)
	}
	if len(invalid.Issues) == 0 {
		t.Fatalf("expected at least one dependency issue, got %v", invalid)
	}
}

func TestInitializeValidatesTranslationQueueFeatureDependencies(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
	}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromKeys(FeatureTranslationQueue)})
	server := router.NewHTTPServer()

	err := adm.Initialize(server.Router())
	if err == nil {
		t.Fatalf("expected dependency validation error")
	}
	var invalid InvalidFeatureConfigError
	if !errors.As(err, &invalid) {
		t.Fatalf("expected InvalidFeatureConfigError, got %v", err)
	}
	if len(invalid.Issues) == 0 {
		t.Fatalf("expected at least one dependency issue, got %v", invalid)
	}
}
