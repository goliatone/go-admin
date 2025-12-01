package admin

import (
	"encoding/json"
	"net/http/httptest"
	"testing"

	router "github.com/goliatone/go-router"
)

func TestDashboardRouteReturnsTheme(t *testing.T) {
	cfg := Config{
		BasePath:        "/admin",
		DefaultLocale:   "en",
		EnableDashboard: true,
		Theme:           "ocean",
		ThemeVariant:    "dark",
		ThemeTokens: map[string]string{
			"primary": "#111",
		},
		ThemeAssetPrefix: "https://cdn.example.com",
	}
	adm := New(cfg)
	server := router.NewHTTPServer()
	r := server.Router()

	if err := adm.Initialize(r); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	req := httptest.NewRequest("GET", "/admin/api/dashboard", nil)
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != 200 {
		t.Fatalf("expected 200, got %d", rr.Code)
	}

	var body map[string]any
	if err := json.NewDecoder(rr.Body).Decode(&body); err != nil {
		t.Fatalf("decode: %v", err)
	}
	theme, ok := body["theme"].(map[string]any)
	if !ok {
		t.Fatalf("expected theme payload")
	}
	selection, ok := theme["selection"].(map[string]any)
	if !ok || selection["variant"] != "dark" {
		t.Fatalf("expected selection variant dark, got %v", selection)
	}
	tokens, ok := theme["tokens"].(map[string]any)
	if !ok || tokens["primary"] != "#111" {
		t.Fatalf("expected primary token set, got %v", tokens)
	}
	assets, ok := theme["assets"].(map[string]any)
	if !ok || assets["prefix"] != "https://cdn.example.com" {
		t.Fatalf("expected asset prefix carried through, got %v", assets)
	}
	chart, ok := theme["chart"].(map[string]any)
	if !ok || chart["theme"] != "dark" {
		t.Fatalf("expected chart theme, got %v", chart)
	}
}

func TestPanelSchemaIncludesThemePayload(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		Theme:         "brand",
		ThemeTokens: map[string]string{
			"primary": "#123456",
		},
	}
	adm := New(cfg)
	repo := NewMemoryRepository()
	builder := (&PanelBuilder{}).WithRepository(repo)
	if _, err := adm.RegisterPanel("items", builder); err != nil {
		t.Fatalf("register panel: %v", err)
	}

	server := router.NewHTTPServer()
	r := server.Router()
	if err := adm.Initialize(r); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	req := httptest.NewRequest("GET", "/admin/api/items", nil)
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != 200 {
		t.Fatalf("expected 200, got %d", rr.Code)
	}
	var body map[string]any
	if err := json.NewDecoder(rr.Body).Decode(&body); err != nil {
		t.Fatalf("decode: %v", err)
	}
	schema, ok := body["schema"].(map[string]any)
	if !ok {
		t.Fatalf("expected schema in response")
	}
	theme, ok := schema["theme"].(map[string]any)
	if !ok {
		t.Fatalf("expected theme payload in schema")
	}
	tokens, ok := theme["tokens"].(map[string]any)
	if !ok || tokens["primary"] != "#123456" {
		t.Fatalf("expected primary token carried through, got %v", tokens)
	}
	expected := map[string]map[string]string{
		"selection": {
			"name":    "brand",
			"variant": "default",
		},
		"tokens": {
			"primary":   "#123456",
			"base_path": "/admin",
			"theme":     "brand",
		},
		"chart": {
			"theme": "default",
		},
	}
	for key, exp := range expected {
		actual, ok := theme[key].(map[string]any)
		if !ok {
			t.Fatalf("expected map for %s, got %T", key, theme[key])
		}
		for k, v := range exp {
			if actual[k] != v {
				t.Fatalf("expected %s[%s]=%s, got %v", key, k, v, actual[k])
			}
		}
	}
}
