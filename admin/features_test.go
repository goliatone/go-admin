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
		Features: Features{
			Bulk: true,
		},
	}
	adm := New(cfg)
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
	adm := New(cfg)
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
	msg, _ := body["error"].(string)
	if msg == "" || !strings.Contains(strings.ToLower(msg), "search") {
		t.Fatalf("expected search gate error message, got %v", body)
	}
}
