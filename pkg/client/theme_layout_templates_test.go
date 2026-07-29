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
		"assets/dist/vendor/iconoir/iconoir.css",
		"assets/dist/vendor/simple-datatables/style.css",
		"assets/dist/vendor/echarts/echarts.min.js",
	} {
		if !strings.Contains(adminLayout, `{{ asset_base_path }}/`+assetPath) {
			t.Fatalf("layout.html missing packaged dependency %q", assetPath)
		}
	}
	loginLayout := mustReadClientTemplate(t, "login-layout.html")
	if !strings.Contains(loginLayout, `{{ asset_base_path }}/assets/dist/vendor/iconoir/iconoir.css`) {
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
