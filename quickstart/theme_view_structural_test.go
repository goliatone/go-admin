package quickstart

import (
	"context"
	"reflect"
	"testing"

	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
)

func TestWithThemeContextProjectsStructuralSelectionAndDiagnostics(t *testing.T) {
	adm, err := admin.New(admin.Config{}, admin.Dependencies{})
	if err != nil {
		t.Fatalf("admin.New: %v", err)
	}
	adm.WithThemeProvider(func(context.Context, admin.ThemeSelector) (*admin.ThemeSelection, error) {
		return &admin.ThemeSelection{Partials: map[string]string{
			admin.AdminPartialPageBreadcrumbs: "host/breadcrumbs.html",
			admin.AdminPartialShellFooter:     "host/missing.html",
		}}, nil
	}).WithAdminTemplateLookup(admin.AdminTemplateLookupFunc(func(identifier string) bool {
		return identifier == "host/breadcrumbs.html"
	}))

	view := WithThemeContext(router.ViewContext{}, adm, nil)
	partials, ok := view["admin_partials"].(admin.AdminStructuralPartials)
	if !ok || partials.Breadcrumbs != "host/breadcrumbs.html" || partials.Footer != "partials/admin-footer.html" {
		t.Fatalf("admin_partials = %#v", view["admin_partials"])
	}
	diagnostics, ok := view["admin_partial_diagnostics"].([]admin.AdminStructuralPartialDiagnostic)
	if !ok || len(diagnostics) != 1 || diagnostics[0].ReasonCode != admin.AdminPartialUnavailable {
		t.Fatalf("admin_partial_diagnostics = %#v", view["admin_partial_diagnostics"])
	}
}

func TestWithThemeContextUsesPackagedStructuralDefaultsWithoutAdmin(t *testing.T) {
	view := WithThemeContext(nil, nil, nil)
	partials, ok := view["admin_partials"].(admin.AdminStructuralPartials)
	defaults := admin.DefaultAdminStructuralPartials()
	if !ok || partials.Sidebar != defaults.Sidebar || partials.Breadcrumbs != defaults.Breadcrumbs || partials.Footer != defaults.Footer || len(partials.Diagnostics) != 0 {
		t.Fatalf("admin_partials = %#v", view["admin_partials"])
	}
}

func TestWithThemeContextKeepsPublicSiteThemeIsolated(t *testing.T) {
	siteTheme := map[string]any{
		"name":     "public-site",
		"partials": map[string]string{"header": "site/partials/header.html"},
	}
	view := router.ViewContext{"site_theme": siteTheme}
	got := WithThemeContext(view, nil, nil)
	if !reflect.DeepEqual(got["site_theme"], siteTheme) {
		t.Fatalf("admin structural projection changed public site theme: %#v", got["site_theme"])
	}
	if _, ok := got["admin_partials"].(admin.AdminStructuralPartials); !ok {
		t.Fatalf("expected isolated admin structural defaults, got %#v", got["admin_partials"])
	}
}
