package quickstart

import (
	"testing"

	theme "github.com/goliatone/go-theme"
)

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
