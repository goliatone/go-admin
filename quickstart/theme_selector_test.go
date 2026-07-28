package quickstart

import (
	"testing"

	theme "github.com/goliatone/go-theme"
)

func TestNewThemeSelectorScopesDefaultDarkSurfaceToSidebar(t *testing.T) {
	selector, manifest, err := NewThemeSelector("admin", "light", nil)
	if err != nil {
		t.Fatalf("new theme selector: %v", err)
	}

	if got := manifest.Tokens["admin.sidebar.background"]; got != "#1C1C1E" {
		t.Fatalf("expected light theme sidebar background #1C1C1E, got %q", got)
	}
	if _, exists := manifest.Tokens["surface"]; exists {
		t.Fatalf("default light theme must not publish the sidebar color as global surface: %+v", manifest.Tokens)
	}
	if got := manifest.Variants["dark"].Tokens["admin.sidebar.background"]; got != "#0b1221" {
		t.Fatalf("expected dark variant sidebar background #0b1221, got %q", got)
	}
	if _, exists := manifest.Variants["dark"].Tokens["surface"]; exists {
		t.Fatalf("default dark variant must not publish the sidebar color as global surface: %+v", manifest.Variants["dark"].Tokens)
	}

	selection, err := selector.Select("admin", "light")
	if err != nil {
		t.Fatalf("select light theme: %v", err)
	}
	tokens := selection.Tokens()
	if got := tokens["admin.sidebar.background"]; got != "#1C1C1E" {
		t.Fatalf("expected selected sidebar background #1C1C1E, got %q", got)
	}
	if _, exists := tokens["surface"]; exists {
		t.Fatalf("selected light theme must leave the global surface unset: %+v", tokens)
	}
}

func TestNewThemeSelectorPreservesExplicitGlobalSurfaceOverrides(t *testing.T) {
	tests := []struct {
		name            string
		override        map[string]string
		token           string
		expectedSidebar string
	}{
		{
			name:     "legacy alias",
			override: map[string]string{"surface": "#ffffff"},
			token:    "surface",
		},
		{
			name:     "portable token",
			override: map[string]string{"color.surface.default": "#ffffff"},
			token:    "color.surface.default",
		},
		{
			name: "explicit sidebar token",
			override: map[string]string{
				"surface":                  "#ffffff",
				"admin.sidebar.background": "#111111",
			},
			token:           "surface",
			expectedSidebar: "#111111",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, manifest, err := NewThemeSelector("admin", "light", tt.override)
			if err != nil {
				t.Fatalf("new theme selector: %v", err)
			}
			if got := manifest.Tokens[tt.token]; got != "#ffffff" {
				t.Fatalf("expected explicit global surface override, got %q", got)
			}
			sidebar, exists := manifest.Tokens["admin.sidebar.background"]
			if tt.expectedSidebar == "" && exists {
				t.Fatalf("default sidebar token must not shadow an explicit global surface override: %+v", manifest.Tokens)
			}
			if tt.expectedSidebar != "" && sidebar != tt.expectedSidebar {
				t.Fatalf("expected explicit sidebar override %q, got %q", tt.expectedSidebar, sidebar)
			}
		})
	}
}

func TestNewThemeSelectorDefaultManifestIncludesIconAsset(t *testing.T) {
	_, manifest, err := NewThemeSelector("admin", "dark", nil)
	if err != nil {
		t.Fatalf("new theme selector: %v", err)
	}
	if manifest == nil {
		t.Fatal("expected manifest")
	}
	if got := manifest.Assets.Files["icon"]; got != "logo.svg" {
		t.Fatalf("expected icon asset fallback logo.svg, got %q", got)
	}
	if got := manifest.Variants["dark"].Assets.Files["icon"]; got != "logo.svg" {
		t.Fatalf("expected dark variant icon asset fallback logo.svg, got %q", got)
	}
	if got := manifest.Tokens["sidebar-brand-max-height"]; got != "40px" {
		t.Fatalf("expected sidebar-brand-max-height default 40px, got %q", got)
	}
	if got := manifest.Tokens["sidebar-brand-max-width"]; got != "100%" {
		t.Fatalf("expected sidebar-brand-max-width default 100%%, got %q", got)
	}
	if got := manifest.Tokens["sidebar-brand-collapsed-size"]; got != "32px" {
		t.Fatalf("expected sidebar-brand-collapsed-size default 32px, got %q", got)
	}
	if got := manifest.Tokens["sidebar-brand-align"]; got != "flex-start" {
		t.Fatalf("expected sidebar-brand-align default flex-start, got %q", got)
	}
}

func TestNewThemeSelectorNormalizesIconAssetToLogoWhenMissing(t *testing.T) {
	_, manifest, err := NewThemeSelector(
		"admin",
		"light",
		nil,
		WithThemeAssets("/admin/assets", map[string]string{
			"logo": "logo.png",
		}),
	)
	if err != nil {
		t.Fatalf("new theme selector: %v", err)
	}
	if manifest == nil {
		t.Fatal("expected manifest")
	}
	if got := manifest.Assets.Files["icon"]; got != "logo.png" {
		t.Fatalf("expected icon asset to inherit logo.png, got %q", got)
	}
}

func TestNewThemeSelectorUsesRegisteredThemeWithoutOverwritingIt(t *testing.T) {
	registry := theme.NewRegistry()
	if err := registry.Register(&theme.Manifest{
		Name:    "shared-theme",
		Version: "2.0.0",
		Tokens: map[string]string{
			"primary": "#123456",
		},
		Assets: theme.Assets{
			Prefix: "/themes/shared",
			Files: map[string]string{
				"logo": "brand.svg",
			},
		},
	}); err != nil {
		t.Fatalf("register theme: %v", err)
	}

	selector, manifest, err := NewThemeSelector(
		"shared-theme",
		"light",
		map[string]string{"primary": "#abcdef"},
		WithThemeRegistry(registry),
		WithThemeAssets("/admin/assets", map[string]string{"logo": "logo.png"}),
	)
	if err != nil {
		t.Fatalf("new theme selector: %v", err)
	}
	if selector.DefaultTheme != "shared-theme" {
		t.Fatalf("expected default theme shared-theme, got %q", selector.DefaultTheme)
	}
	if manifest == nil {
		t.Fatal("expected existing manifest")
	}
	if got := manifest.Tokens["primary"]; got != "#123456" {
		t.Fatalf("expected registered theme tokens to stay intact, got %q", got)
	}
	if got := manifest.Assets.Prefix; got != "/themes/shared" {
		t.Fatalf("expected registered theme asset prefix to stay intact, got %q", got)
	}
	if got := manifest.Assets.Files["logo"]; got != "brand.svg" {
		t.Fatalf("expected registered theme logo to stay intact, got %q", got)
	}
}

func TestNewThemeSelectorPreservesExplicitIconAsset(t *testing.T) {
	_, manifest, err := NewThemeSelector(
		"admin",
		"light",
		nil,
		WithThemeAssets("/admin/assets", map[string]string{
			"logo": "logo.png",
			"icon": "mark.png",
		}),
	)
	if err != nil {
		t.Fatalf("new theme selector: %v", err)
	}
	if got := manifest.Assets.Files["icon"]; got != "mark.png" {
		t.Fatalf("expected explicit icon asset to be preserved, got %q", got)
	}
}
