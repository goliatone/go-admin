package admin

import (
	"testing"

	theme "github.com/goliatone/go-theme"
)

func TestPreferencesVariantOptionsUseManifest(t *testing.T) {
	cfg := Config{
		ThemeVariant: "custom",
	}
	adm := mustNewAdmin(t, cfg, Dependencies{})
	adm.WithThemeManifest(&theme.Manifest{
		Name: "admin",
		Variants: map[string]theme.Variant{
			"dark":  {},
			"light": {},
		},
	})

	opts := NewPreferencesModule().variantOptions(adm)
	values := map[string]bool{}
	for _, opt := range opts {
		values[toString(opt.Value)] = true
	}

	if !values["dark"] || !values["light"] {
		t.Fatalf("expected manifest variants included, got %v", values)
	}
	if values["custom"] {
		t.Fatalf("expected config variant ignored when manifest present, got %v", values)
	}
}

func TestPreferencesVariantOptionsFallbacksWithoutManifest(t *testing.T) {
	cfg := Config{
		ThemeVariant: "light",
	}
	adm := mustNewAdmin(t, cfg, Dependencies{})
	if adm.defaultTheme == nil {
		t.Fatalf("expected default theme")
	}
	adm.defaultTheme.ChartTheme = "night"

	opts := NewPreferencesModule().variantOptions(adm)
	values := map[string]bool{}
	for _, opt := range opts {
		values[toString(opt.Value)] = true
	}

	if !values["light"] || !values["night"] {
		t.Fatalf("expected config and chart variants included, got %v", values)
	}
}

func TestPreferencesVariantOptionsTreatBaseOnlyManifestAsAuthoritative(t *testing.T) {
	adm := mustNewAdmin(t, Config{Theme: "brand"}, Dependencies{})
	adm.WithThemeManifest(&theme.Manifest{
		Name:    "brand",
		Version: "1.0.0",
	})

	options := NewPreferencesModule().variantOptions(adm)
	if len(options) != 1 || toString(options[0].Value) != "" {
		t.Fatalf("base-only manifest options = %#v, want only system default", options)
	}
}
