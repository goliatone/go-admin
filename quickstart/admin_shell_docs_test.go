package quickstart

import (
	"os"
	"strings"
	"testing"
)

func TestAdminShellCustomizationDocsMatchRuntimeContract(t *testing.T) {
	documents := map[string][]string{
		"../docs/GUIDE_VIEW_CUSTOMIZATION.md": {
			"WithViewAdmin(adm)",
			"admin.shell.sidebar",
			"admin.page.breadcrumbs",
			"admin.shell.footer",
			"invalid_identifier",
			"template_unavailable",
			"unsupported_admin_key",
			"returns `client.Templates()`",
		},
		"../docs/GUIDE_UI_PRIMITIVES.md": {
			"The authenticated `layout.html` owns the single page-header frame",
			"page_header_actions",
			"least one major release",
		},
		"../docs/GUIDE_THEME.md": {
			"ThemeSelection.Partials",
			"exact normalized first-wins template stack",
			"eight-entry per-request cap",
		},
		"../docs/GUIDE_FRONTEND.md": {
			"Canonical `layout.html` blocks",
			"npm run build:css",
		},
		"README.md": {
			"WithViewAdmin(adm *admin.Admin)",
			"`DashboardTemplatesFS()` is the canonical client template set",
		},
		"../examples/admin-shell/README.md": {
			"data/templates/partials/breadcrumbs.html",
			"Neither customization requires copying",
		},
	}

	for path, fragments := range documents {
		content, err := os.ReadFile(path)
		if err != nil {
			t.Fatalf("read %s: %v", path, err)
		}
		for _, fragment := range fragments {
			if !strings.Contains(string(content), fragment) {
				t.Errorf("%s is missing runtime contract fragment %q", path, fragment)
			}
		}
	}

	for _, path := range []string{
		"../pkg/client/templates/layout.html",
		"../pkg/client/templates/partials/sidebar.html",
		"../pkg/client/templates/partials/breadcrumbs.html",
		"../pkg/client/templates/partials/admin-footer.html",
	} {
		if info, err := os.Stat(path); err != nil || info.IsDir() {
			t.Errorf("documented template path %s is unavailable", path)
		}
	}
}
