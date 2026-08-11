package quickstart

import (
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"testing"

	"github.com/goliatone/go-admin/admin"
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

func TestDashboardRendererGuidanceMatchesTypedRuntimeContract(t *testing.T) {
	renderer := reflect.TypeFor[admin.DashboardRenderer]()
	method, ok := renderer.MethodByName("RenderPage")
	if !ok || method.Type.NumIn() < 2 {
		t.Fatal("admin.DashboardRenderer.RenderPage contract is unavailable")
	}
	pageType := method.Type.In(1)
	if pageType.PkgPath() != "github.com/goliatone/go-admin/admin" || pageType.Name() != "AdminDashboardPage" {
		t.Fatalf("unexpected dashboard renderer page contract %s.%s", pageType.PkgPath(), pageType.Name())
	}

	guidance := map[string][]string{
		"../docs/GUIDE_DASHBOARD_WIDGETS.md": {
			"accept `admin.AdminDashboardPage` only",
			"`quickstart.DashboardTemplatesFS()` returns",
			"`client.Templates()`",
			"is not retained as a fallback",
			"`quickstart.NormalizeDashboardTemplateData(...)`",
			"does not broaden the `admin.DashboardRenderer` interface",
		},
	}
	if home, err := os.UserHomeDir(); err == nil {
		skillRoot := filepath.Join(home, ".agents", "skills", "go-admin-dashboard-builder")
		for path, required := range map[string][]string{
			filepath.Join(skillRoot, "SKILL.md"): {
				"accept `admin.AdminDashboardPage`",
				"`quickstart.NormalizeDashboardTemplateData(...)` accepts a raw typed `dashboard.Page`",
				"`quickstart.DashboardTemplatesFS()` returns `client.Templates()`",
				"is not a fallback",
			},
			filepath.Join(skillRoot, "references", "rendering-and-placements.md"): {
				"accept `admin.AdminDashboardPage`",
				"`quickstart.NormalizeDashboardTemplateData(...)` accepts a raw typed `dashboard.Page`",
				"`quickstart.DashboardTemplatesFS()` returns `client.Templates()`",
				"is not a fallback",
			},
		} {
			if _, statErr := os.Stat(path); statErr == nil {
				guidance[path] = required
			}
		}
	}

	for path, required := range guidance {
		content, err := os.ReadFile(path)
		if err != nil {
			t.Fatalf("read dashboard renderer guidance %s: %v", path, err)
		}
		text := string(content)
		normalized := strings.Join(strings.Fields(text), " ")
		for _, fragment := range required {
			if !strings.Contains(normalized, strings.Join(strings.Fields(fragment), " ")) {
				t.Errorf("%s is missing live renderer contract fragment %q", path, fragment)
			}
		}
		for _, stale := range []string{
			"accept `admin.DashboardLayout`",
			"accept `DashboardLayout` only",
			"retains compact quickstart templates",
		} {
			if strings.Contains(text, stale) {
				t.Errorf("%s retains stale renderer guidance %q", path, stale)
			}
		}
	}
}
