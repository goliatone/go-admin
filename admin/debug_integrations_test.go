package admin

import "testing"

func TestDebugThemeSnapshotIncludesThemeAssets(t *testing.T) {
	cfg := Config{
		Theme:            "brand",
		ThemeVariant:     "light",
		ThemeAssetPrefix: "/assets",
		ThemeAssets: map[string]string{
			"logo": "/brand/logo.svg",
			"icon": "/brand/icon.svg",
		},
	}

	adminSnapshot := debugAdminConfigSnapshot(cfg)
	if got, ok := adminSnapshot["theme_assets"].(map[string]string); !ok || got["icon"] != "/brand/icon.svg" {
		t.Fatalf("expected admin debug snapshot to include theme_assets, got %+v", adminSnapshot["theme_assets"])
	}

	themeSnapshot := debugThemeSnapshot(cfg)
	if got, ok := themeSnapshot["assets"].(map[string]string); !ok || got["logo"] != "/brand/logo.svg" {
		t.Fatalf("expected theme debug snapshot to include assets, got %+v", themeSnapshot["assets"])
	}
}
