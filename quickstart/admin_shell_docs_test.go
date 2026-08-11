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
			"EnrichLayoutViewContextWithChrome",
			"Header.Title` is the only typed title source",
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
			"@goliatone/go-admin-client/components.css",
			"single self-contained source",
			"were consolidated and removed",
			"v0.133.0",
		},
		"../docs/GUIDE_THEME.md": {
			"ThemeSelection.Partials",
			"exact normalized first-wins template stack",
			"eight-entry per-request cap",
			"admin.modal.surface",
		},
		"../docs/GUIDE_FRONTEND.md": {
			"AdminPageChrome",
			"@goliatone/go-admin-client/components.css",
			"npm run build:css",
		},
		"README.md": {
			"WithViewAdmin(adm *admin.Admin)",
			"admin.EnrichLayoutViewContextWithChrome",
			"`DashboardTemplatesFS()` is the canonical client template set",
		},
		"../examples/admin-shell/README.md": {
			"data/templates/partials/breadcrumbs.html",
			"Neither customization requires copying",
		},
	}

	primitiveGuide, err := os.ReadFile("../docs/GUIDE_UI_PRIMITIVES.md")
	if err != nil {
		t.Fatalf("read primitive guide: %v", err)
	}
	for _, stale := range []string{
		"its component modules live under",
		"`pkg/client/assets/input.css` imports that canonical entry",
	} {
		if strings.Contains(string(primitiveGuide), stale) {
			t.Errorf("primitive guide retains stale component build claim %q", stale)
		}
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
