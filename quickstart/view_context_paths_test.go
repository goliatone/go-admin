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
	if got := ctx["preferences_api_path"]; got != "/admin/api/v1/panels/preferences" {
		t.Fatalf("expected preferences_api_path /admin/api/v1/panels/preferences, got %v", got)
	}
}

func TestWithAuthUIViewContextIncludesNormalizedLoginLogoPlacement(t *testing.T) {
	for name, tc := range map[string]struct {
		placement admin.LoginLogoPlacement
		want      string
	}{
		"inside":  {placement: admin.LoginLogoPlacementInsideCard, want: "inside-card"},
		"invalid": {placement: "unknown", want: "outside-card"},
	} {
		t.Run(name, func(t *testing.T) {
			ctx := WithAuthUIViewContext(nil, admin.Config{
				BasePath:           "/admin",
				LoginLogoPlacement: tc.placement,
			}, AuthUIState{}, AuthUIPaths{})
			if got := ctx["login_logo_placement"]; got != tc.want {
				t.Fatalf("login_logo_placement = %v, want %q", got, tc.want)
			}
		})
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
				Groups: []urlkit.GroupConfig{
					{
						Name: "api",
						Path: "/api",
						Groups: []urlkit.GroupConfig{
							{
								Name: "v1",
								Path: "/v1",
								Routes: map[string]string{
									"errors": "/errors",
								},
							},
						},
					},
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
	if got := ctx["preferences_api_path"]; got != "/console/api/v1/panels/preferences" {
		t.Fatalf("expected preferences_api_path /console/api/v1/panels/preferences, got %v", got)
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
	if got := out["preferences_api_path"]; got != "/console/api/panels/preferences" {
		t.Fatalf("expected preferences_api_path /console/api/panels/preferences, got %v", got)
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
	if got := ctx["login_logo_placement"]; got != "outside-card" {
		t.Fatalf("expected outside-card login logo placement, got %v", got)
	}
	externalAssets, ok := ctx["external_assets"].(map[string]string)
	if !ok {
		t.Fatalf("expected external_assets map, got %T", ctx["external_assets"])
	}
	if externalAssets["iconoir_css"] != "" ||
		externalAssets["datatables_css"] != "" ||
		externalAssets["echarts_js"] != "" {
		t.Fatalf("expected packaged defaults without external overrides, got %+v", externalAssets)
	}
}

func TestWithAuthUIViewContextIncludesExplicitExternalAssetOverrides(t *testing.T) {
	cfg := admin.Config{
		BasePath: "/admin",
		ExternalAssets: admin.ExternalAssetConfig{
			IconoirCSS:    " https://assets.example/iconoir.css ",
			DataTablesCSS: " https://assets.example/datatables.css ",
			EChartsJS:     " https://assets.example/echarts.js ",
		},
	}
	ctx := WithAuthUIViewContext(nil, cfg, AuthUIState{}, AuthUIPaths{BasePath: "/admin"})
	externalAssets, ok := ctx["external_assets"].(map[string]string)
	if !ok {
		t.Fatalf("expected external_assets map, got %T", ctx["external_assets"])
	}
	if externalAssets["iconoir_css"] != "https://assets.example/iconoir.css" ||
		externalAssets["datatables_css"] != "https://assets.example/datatables.css" ||
		externalAssets["echarts_js"] != "https://assets.example/echarts.js" {
		t.Fatalf("unexpected external asset overrides: %+v", externalAssets)
	}
}
