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
	for _, name := range []string{
		"partials/admin-page-header.html",
		"resources/shared/list-base.html",
	} {
		template := mustReadClientTemplate(t, name)
		if !strings.Contains(template, "admin-page-heading-group") {
			t.Fatalf("%s is missing the additive heading composition hook", name)
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
	if prePaint < 0 || shellStyles < 0 || sidebarMarkup < 0 || runtime < 0 {
		t.Fatal("layout must include the sidebar pre-paint, stylesheet, markup, and runtime contracts")
	}
	if !(prePaint < shellStyles && shellStyles < sidebarMarkup && sidebarMarkup < runtime) {
		t.Fatalf(
			"sidebar asset order must be pre-paint < styles < markup < runtime; got %d < %d < %d < %d",
			prePaint,
			shellStyles,
			sidebarMarkup,
			runtime,
		)
	}
	if !strings.Contains(template, `data-admin-sidebar-state`) {
		t.Fatal("sidebar pre-paint asset must expose a stable layout marker")
	}
}
