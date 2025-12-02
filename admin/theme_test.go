package admin

import (
	"encoding/json"
	"net/http/httptest"
	"os"
	"reflect"
	"strings"
	"testing"

	router "github.com/goliatone/go-router"
	theme "github.com/goliatone/go-theme"
)

func TestDashboardRouteReturnsTheme(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		Features: Features{
			Dashboard: true,
		},
		Theme:        "ocean",
		ThemeVariant: "dark",
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

func TestThemeOverrideViaGoThemeSelector(t *testing.T) {
	manifest := &theme.Manifest{
		Name:    "brand",
		Version: "1.0.0",
		Tokens: map[string]string{
			"primary": "#0044ff",
			"accent":  "#ffaa00",
			"surface": "#111827",
		},
		Assets: theme.Assets{
			Prefix: "https://cdn.example.com/static",
			Files: map[string]string{
				"logo":    "logo.svg",
				"favicon": "favicon.ico",
			},
		},
		Templates: map[string]string{
			"layout.header": "templates/header.html",
			"forms.input":   "templates/forms/input.html",
		},
		Variants: map[string]theme.Variant{
			"dark": {
				Tokens: map[string]string{
					"primary": "#0f172a",
					"surface": "#0b1221",
				},
				Assets: theme.Assets{
					Prefix: "https://cdn.example.com/cdn",
					Files: map[string]string{
						"logo": "logo-dark.svg",
					},
				},
				Templates: map[string]string{
					"layout.header": "templates/dark/header.html",
				},
			},
		},
	}
	registry := theme.NewRegistry()
	if err := registry.Register(manifest); err != nil {
		t.Fatalf("register manifest: %v", err)
	}

	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		Theme:         "brand",
		ThemeVariant:  "light",
		Features: Features{
			Dashboard: true,
			Settings:  true,
		},
	}
	adm := New(cfg)
	adm.WithGoTheme(theme.Selector{Registry: registry, DefaultTheme: cfg.Theme, DefaultVariant: cfg.ThemeVariant})

	repo := NewMemoryRepository()
	builder := (&PanelBuilder{}).WithRepository(repo)
	builder.ListFields(Field{Name: "id", Label: "ID", Type: "text"})
	builder.FormFields(Field{Name: "name", Label: "Name", Type: "text"})
	if _, err := adm.RegisterPanel("items", builder); err != nil {
		t.Fatalf("register panel: %v", err)
	}

	server := router.NewHTTPServer()
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	themeQuery := "?theme=brand&variant=dark"
	tests := []struct {
		path    string
		extract func(map[string]any) map[string]any
		label   string
	}{
		{
			path:  "/admin/api/dashboard" + themeQuery,
			label: "dashboard",
			extract: func(body map[string]any) map[string]any {
				return mapFromAny(body["theme"])
			},
		},
		{
			path:  "/admin/api/navigation" + themeQuery,
			label: "navigation",
			extract: func(body map[string]any) map[string]any {
				return mapFromAny(body["theme"])
			},
		},
		{
			path:  "/admin/api/items" + themeQuery,
			label: "panel",
			extract: func(body map[string]any) map[string]any {
				schema, _ := body["schema"].(map[string]any)
				return mapFromAny(schema["theme"])
			},
		},
		{
			path:  "/admin/api/settings/form" + themeQuery,
			label: "settings",
			extract: func(body map[string]any) map[string]any {
				return mapFromAny(body["theme"])
			},
		},
	}

	var expected map[string]any
	for _, tc := range tests {
		req := httptest.NewRequest("GET", tc.path, nil)
		rr := httptest.NewRecorder()
		server.WrappedRouter().ServeHTTP(rr, req)
		if rr.Code != 200 {
			t.Fatalf("[%s] expected 200, got %d", tc.label, rr.Code)
		}
		var body map[string]any
		if err := json.NewDecoder(rr.Body).Decode(&body); err != nil {
			t.Fatalf("[%s] decode: %v", tc.label, err)
		}
		themeMap := tc.extract(body)
		if len(themeMap) == 0 {
			t.Fatalf("[%s] expected theme payload", tc.label)
		}
		if expected == nil {
			expected = themeMap
			continue
		}
		if !reflect.DeepEqual(expected, themeMap) {
			t.Fatalf("[%s] theme mismatch\nexpected: %+v\ngot: %+v", tc.label, expected, themeMap)
		}
	}

	assertGoldenTheme(t, expected, "testdata/theme_dark_snapshot.json")
}

func mapFromAny(val any) map[string]any {
	if val == nil {
		return nil
	}
	if m, ok := val.(map[string]any); ok {
		return m
	}
	return nil
}

func assertGoldenTheme(t *testing.T, theme map[string]any, goldenPath string) {
	t.Helper()
	data, err := json.MarshalIndent(theme, "", "  ")
	if err != nil {
		t.Fatalf("marshal theme: %v", err)
	}
	want, err := os.ReadFile(goldenPath)
	if err != nil {
		t.Fatalf("read golden: %v", err)
	}
	got := strings.TrimSpace(string(data))
	expected := strings.TrimSpace(string(want))
	if got != expected {
		t.Fatalf("theme payload mismatch:\nexpected:\n%s\n\ngot:\n%s", expected, got)
	}
}
