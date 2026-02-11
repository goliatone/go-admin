package quickstart

import (
	"testing"

	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
	urlkit "github.com/goliatone/go-urlkit"
)

func TestPathViewContextDefaults(t *testing.T) {
	cfg := admin.Config{BasePath: "/admin"}
	cfg.URLs.Admin.APIPrefix = "api"
	cfg.URLs.Admin.APIVersion = "v1"

	ctx := PathViewContext(cfg, PathViewContextConfig{})

	if got := ctx["base_path"]; got != "/admin" {
		t.Fatalf("expected base_path /admin, got %v", got)
	}
	if got := ctx["api_base_path"]; got != "/admin/api/v1" {
		t.Fatalf("expected api_base_path /admin/api/v1, got %v", got)
	}
	if got := ctx["asset_base_path"]; got != "/admin" {
		t.Fatalf("expected asset_base_path /admin, got %v", got)
	}
}

func TestPathViewContextUsesURLResolver(t *testing.T) {
	cfg := admin.Config{BasePath: "/admin"}
	cfg.URLs.Admin.APIPrefix = "api"
	cfg.URLs.Admin.APIVersion = "v1"

	urls, err := urlkit.NewRouteManagerFromConfig(&urlkit.Config{
		Groups: []urlkit.GroupConfig{
			{
				Name:    "admin",
				BaseURL: "/console",
				Routes: map[string]string{
					"dashboard": "/",
				},
			},
			{
				Name:    "admin.api.v1",
				BaseURL: "/console/api/v1",
				Routes: map[string]string{
					"errors": "/errors",
				},
			},
		},
	})
	if err != nil {
		t.Fatalf("urlkit config: %v", err)
	}

	ctx := PathViewContext(cfg, PathViewContextConfig{URLResolver: urls})

	if got := ctx["base_path"]; got != "/console" {
		t.Fatalf("expected base_path /console, got %v", got)
	}
	if got := ctx["api_base_path"]; got != "/console/api/v1" {
		t.Fatalf("expected api_base_path /console/api/v1, got %v", got)
	}
	if got := ctx["asset_base_path"]; got != "/console" {
		t.Fatalf("expected asset_base_path /console, got %v", got)
	}
}

func TestPathViewContextSupportsAssetCDNOverride(t *testing.T) {
	cfg := admin.Config{BasePath: "/admin"}
	ctx := PathViewContext(cfg, PathViewContextConfig{
		BasePath:      "/admin",
		AssetBasePath: "https://cdn.example.com/admin-assets/",
	})
	if got := ctx["asset_base_path"]; got != "https://cdn.example.com/admin-assets" {
		t.Fatalf("expected normalized asset cdn path, got %v", got)
	}
}

func TestWithPathViewContextMergesPaths(t *testing.T) {
	cfg := admin.Config{BasePath: "/admin"}
	base := router.ViewContext{
		"title": "Custom",
	}
	out := WithPathViewContext(base, cfg, PathViewContextConfig{BasePath: "/console"})

	if got := out["title"]; got != "Custom" {
		t.Fatalf("expected title to be preserved, got %v", got)
	}
	if got := out["base_path"]; got != "/console" {
		t.Fatalf("expected base_path /console, got %v", got)
	}
	if got := out["asset_base_path"]; got != "/console" {
		t.Fatalf("expected asset_base_path /console, got %v", got)
	}
}

func TestWithAuthUIViewContextIncludesAssetBasePath(t *testing.T) {
	cfg := admin.Config{BasePath: "/admin"}
	ctx := WithAuthUIViewContext(nil, cfg, AuthUIState{}, AuthUIPaths{
		BasePath: "/admin",
	})
	if got := ctx["asset_base_path"]; got != "/admin" {
		t.Fatalf("expected asset_base_path /admin, got %v", got)
	}
}
