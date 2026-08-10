package client

import (
	"strings"
	"testing"
)

func TestAdminAndAuthLayoutsRenderSafeThemeProjectionAndFavicon(t *testing.T) {
	for _, name := range []string{"layout.html", "login-layout.html"} {
		template := mustReadClientTemplate(t, name)
		for _, fragment := range []string{
			`<link rel="icon" href="{{ theme.assets.favicon }}">`,
			`:root { {{ theme.styles.root|safe }} }`,
		} {
			if !strings.Contains(template, fragment) {
				t.Fatalf("%s missing theme contract fragment %q", name, fragment)
			}
		}
		if strings.Contains(template, `{{ theme.tokens.primary }}`) {
			t.Fatalf("%s directly emits unvalidated token values", name)
		}
	}
}

func TestAdminAndAuthLayoutsDefaultToPackagedDocumentDependencies(t *testing.T) {
	adminLayout := mustReadClientTemplate(t, "layout.html")
	for _, assetPath := range []string{
		"assets/dist/third-party/iconoir/iconoir.css",
		"assets/dist/third-party/simple-datatables/style.css",
		"assets/dist/third-party/echarts/echarts.min.js",
	} {
		if !strings.Contains(adminLayout, `{{ asset_base_path }}/`+assetPath) {
			t.Fatalf("layout.html missing packaged dependency %q", assetPath)
		}
	}
	loginLayout := mustReadClientTemplate(t, "login-layout.html")
	if !strings.Contains(loginLayout, `{{ asset_base_path }}/assets/dist/third-party/iconoir/iconoir.css`) {
		t.Fatal("login-layout.html missing packaged Iconoir dependency")
	}
	for name, template := range map[string]string{
		"layout.html":       adminLayout,
		"login-layout.html": loginLayout,
	} {
		for _, publicHost := range []string{"cdn.jsdelivr.net", "go-echarts.github.io"} {
			if strings.Contains(template, publicHost) {
				t.Fatalf("%s still hard-depends on %s", name, publicHost)
			}
		}
	}
}

func TestAdminHeaderTemplatesExposeThemeCompositionHook(t *testing.T) {
	for _, name := range []string{"layout.html", "partials/admin-page-header.html"} {
		template := mustReadClientTemplate(t, name)
		if !strings.Contains(template, "admin-page-heading-group") {
			t.Fatalf("%s is missing the additive heading composition hook", name)
		}
	}
	for _, name := range []string{"resources/shared/list-base.html", "resources/shared/detail-base.html"} {
		template := mustReadClientTemplate(t, name)
		for _, fragment := range []string{`{% block page_title %}`, `{% block page_header_actions %}`} {
			if !strings.Contains(template, fragment) {
				t.Fatalf("%s is missing canonical page-header block %q", name, fragment)
			}
		}
	}
}

func TestAdminLayoutHeadExtraFollowsSharedStylesheets(t *testing.T) {
	template := mustReadClientTemplate(t, "layout.html")
	shellStyles := strings.Index(template, `assets/output.css`)
	headExtra := strings.Index(template, `{% block head_extra %}`)
	if shellStyles < 0 || headExtra < 0 {
		t.Fatal("layout must expose the shared stylesheet and head_extra contract")
	}
	if headExtra <= shellStyles {
		t.Fatal("head_extra must follow the shared stylesheet so product CSS can compose predictably")
	}
}

func TestAdminLayoutLoadsSidebarStateBeforeSharedStylesheetsAndRuntime(t *testing.T) {
	template := mustReadClientTemplate(t, "layout.html")
	prePaint := strings.Index(template, `assets/sidebar-state.js`)
	shellStyles := strings.Index(template, `assets/output.css`)
	sidebarMarkup := strings.Index(template, `{% include "partials/sidebar.html" %}`)
	runtime := strings.Index(template, `assets/sidebar.js`)
	main := strings.Index(template, `<main class="admin-main`)
	if prePaint < 0 || shellStyles < 0 || sidebarMarkup < 0 || runtime < 0 || main < 0 {
		t.Fatal("layout must include the sidebar pre-paint, stylesheet, markup, runtime, and main-content contracts")
	}
	if prePaint >= shellStyles || shellStyles >= sidebarMarkup || sidebarMarkup >= runtime || runtime >= main {
		t.Fatalf(
			"sidebar asset order must be pre-paint < styles < markup < runtime < main; got %d < %d < %d < %d < %d",
			prePaint,
			shellStyles,
			sidebarMarkup,
			runtime,
			main,
		)
	}
	if strings.Count(template, `assets/sidebar.js`) != 1 {
		t.Fatal("layout must load the sidebar runtime exactly once")
	}
	if !strings.Contains(template, `data-admin-sidebar-state`) {
		t.Fatal("sidebar pre-paint asset must expose a stable layout marker")
	}
}

func TestAdminLayoutOwnsCanonicalShellAndCompatibilitySlots(t *testing.T) {
	template := mustReadClientTemplate(t, "layout.html")
	for _, fragment := range []string{
		`data-admin-shell`,
		`class="admin-shell-content flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden"`,
		`{% block shell_sidebar %}`,
		`{% block shell_page_header %}`,
		`{% block page_breadcrumbs %}`,
		`{% block page_title %}`,
		`{% block page_pretitle %}`,
		`{% block page_subtitle %}`,
		`{% block page_header_actions %}`,
		`{% block page_below_header %}`,
		`{% block shell_content %}{% block content %}`,
		`{% block shell_footer %}`,
		`{% block header_actions %}`,
		`{% block header_actions_prepend %}`,
		`{% block header_actions_append %}`,
		`{% block header_title %}`,
		`{% block header_pretitle %}`,
		`{% block tabs_area %}`,
	} {
		if !strings.Contains(template, fragment) {
			t.Fatalf("layout.html missing canonical shell contract %q", fragment)
		}
	}
}

func TestLegacyPageHeaderDelegatesToCanonicalBreadcrumbLeaf(t *testing.T) {
	header := mustReadClientTemplate(t, "partials/admin-page-header.html")
	if strings.Contains(header, `<nav`) || strings.Contains(header, `<ol`) {
		t.Fatal("legacy page header must not own breadcrumb navigation markup")
	}
	for _, fragment := range []string{`include admin_partials.breadcrumbs`, `include "partials/breadcrumbs.html"`} {
		if !strings.Contains(header, fragment) {
			t.Fatalf("legacy page header missing breadcrumb delegation %q", fragment)
		}
	}
	footer := mustReadClientTemplate(t, "partials/admin-footer.html")
	if !strings.Contains(footer, `{% if footer_content %}`) || !strings.Contains(footer, `data-admin-shell-footer`) {
		t.Fatal("packaged footer must remain empty unless footer_content is supplied")
	}
}
