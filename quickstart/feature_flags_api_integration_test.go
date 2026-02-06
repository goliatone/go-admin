package quickstart

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
)

func TestFeatureFlagsAPIListAndMutate(t *testing.T) {
	cfg := admin.Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		Title:         "Admin",
	}
	store := admin.NewInMemoryPreferencesStore()
	defaults := map[string]bool{
		"users.signup": true,
	}
	gate := buildFeatureGate(cfg, defaults, store)

	adm, err := admin.New(cfg, admin.Dependencies{
		FeatureGate:      gate,
		PreferencesStore: store,
	})
	if err != nil {
		t.Fatalf("admin.New error: %v", err)
	}

	server := router.NewFiberAdapter()
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize error: %v", err)
	}

	flags := getFeatureFlags(t, server, "/admin/api/feature-flags?scope=system")
	flag := findFlag(flags, "users.signup")
	if flag == nil {
		t.Fatalf("expected users.signup flag in list")
	}

	postBody := `{"key":"users.signup","enabled":false,"scope":"system"}`
	postReq := httptest.NewRequest(http.MethodPost, "/admin/api/feature-flags", strings.NewReader(postBody))
	postReq.Header.Set("Content-Type", "application/json")
	postResp, err := server.WrappedRouter().Test(postReq)
	if err != nil {
		t.Fatalf("feature flag set request error: %v", err)
	}
	if postResp.StatusCode != http.StatusOK {
		t.Fatalf("expected set status 200, got %d", postResp.StatusCode)
	}

	flags = getFeatureFlags(t, server, "/admin/api/feature-flags?scope=system")
	flag = findFlag(flags, "users.signup")
	if flag == nil {
		t.Fatalf("expected users.signup flag in list after set")
	}
	if effective, ok := flag["effective"].(bool); !ok || effective {
		t.Fatalf("expected effective false after set, got %v", flag["effective"])
	}
	if override := flagMap(flag["override"]); override["state"] != "disabled" {
		t.Fatalf("expected override state disabled, got %v", override["state"])
	}

	deleteBody := `{"key":"users.signup","scope":"system"}`
	deleteReq := httptest.NewRequest(http.MethodDelete, "/admin/api/feature-flags", strings.NewReader(deleteBody))
	deleteReq.Header.Set("Content-Type", "application/json")
	deleteResp, err := server.WrappedRouter().Test(deleteReq)
	if err != nil {
		t.Fatalf("feature flag unset request error: %v", err)
	}
	if deleteResp.StatusCode != http.StatusOK {
		t.Fatalf("expected unset status 200, got %d", deleteResp.StatusCode)
	}

	flags = getFeatureFlags(t, server, "/admin/api/feature-flags?scope=system")
	flag = findFlag(flags, "users.signup")
	if flag == nil {
		t.Fatalf("expected users.signup flag in list after unset")
	}
	override := flagMap(flag["override"])
	if override["state"] == "enabled" || override["state"] == "disabled" {
		t.Fatalf("expected override cleared after unset, got %v", override["state"])
	}

	scopeFlags := getFeatureFlags(t, server, "/admin/api/feature-flags?scope=tenant&scope_id=tenant-1")
	flag = findFlag(scopeFlags, "users.signup")
	if flag == nil {
		t.Fatalf("expected users.signup flag in tenant scope list")
	}
}

func TestFeatureFlagsAPIIncludesUsersDescriptionAndDefault(t *testing.T) {
	cfg := admin.Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		Title:         "Admin",
	}
	catalogPath := filepath.Join(t.TempDir(), "feature_catalog.yaml")
	catalogBody := []byte("users: \"User and role management.\"\n")
	if err := os.WriteFile(catalogPath, catalogBody, 0o600); err != nil {
		t.Fatalf("write catalog: %v", err)
	}
	cfg.FeatureCatalogPath = catalogPath

	store := admin.NewInMemoryPreferencesStore()
	defaults := map[string]bool{
		"users": true,
	}
	gate := buildFeatureGate(cfg, defaults, store)

	adm, err := admin.New(cfg, admin.Dependencies{
		FeatureGate:      gate,
		PreferencesStore: store,
	})
	if err != nil {
		t.Fatalf("admin.New error: %v", err)
	}

	server := router.NewFiberAdapter()
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize error: %v", err)
	}

	flags := getFeatureFlags(t, server, "/admin/api/feature-flags?scope=system")
	flag := findFlag(flags, "users")
	if flag == nil {
		t.Fatalf("expected users flag in list")
	}
	if description, ok := flag["description"].(string); !ok || description == "" {
		t.Fatalf("expected users description, got %v", flag["description"])
	}
	defaultInfo, ok := flag["default"].(map[string]any)
	if !ok {
		t.Fatalf("expected default info for users, got %v", flag["default"])
	}
	if set, ok := defaultInfo["set"].(bool); !ok || !set {
		t.Fatalf("expected default set true, got %v", defaultInfo["set"])
	}
	if value, ok := defaultInfo["value"].(bool); !ok || !value {
		t.Fatalf("expected default value true, got %v", defaultInfo["value"])
	}
}

func getFeatureFlags(t *testing.T, server router.Server[*fiber.App], path string) []any {
	t.Helper()
	req := httptest.NewRequest(http.MethodGet, path, nil)
	resp, err := server.WrappedRouter().Test(req)
	if err != nil {
		t.Fatalf("feature flags list request error: %v", err)
	}
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected list status 200, got %d", resp.StatusCode)
	}
	defer resp.Body.Close()

	var payload map[string]any
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		t.Fatalf("decode list response: %v", err)
	}
	flags, ok := payload["flags"].([]any)
	if !ok {
		t.Fatalf("expected flags array, got %v", payload["flags"])
	}
	return flags
}

func findFlag(flags []any, key string) map[string]any {
	for _, raw := range flags {
		flag, ok := raw.(map[string]any)
		if !ok {
			continue
		}
		if flag["key"] == key {
			return flag
		}
	}
	return nil
}

func flagMap(raw any) map[string]any {
	if raw == nil {
		return map[string]any{}
	}
	if cast, ok := raw.(map[string]any); ok {
		return cast
	}
	return map[string]any{}
}
