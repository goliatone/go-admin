package goadmin_test

import (
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"testing"
)

var currentDocumentation = []string{
	"README.md",
	"docs/README.md",
	"docs/GUIDE_FEATURE_GATES.md",
	"docs/GUIDE_ROUTING.md",
	"docs/GUIDE_VIEW_CUSTOMIZATION.md",
}

var repositoryOnlyDocumentation = []string{
	"docs/COMMERCE_SETUP.md",
	"docs/PERSISTENCE_GUIDE_GO_ADMIN.md",
}

func TestCurrentDocumentationRelativeLinksResolve(t *testing.T) {
	linkPattern := regexp.MustCompile(`\[[^\]]+\]\(([^)]+)\)`)
	for _, name := range currentDocumentationPaths() {
		content := readDocumentation(t, name)
		for _, match := range linkPattern.FindAllStringSubmatch(content, -1) {
			target := strings.TrimSpace(strings.SplitN(match[1], " ", 2)[0])
			target = strings.Trim(target, "<>")
			if target == "" || strings.HasPrefix(target, "#") ||
				strings.HasPrefix(target, "/") || strings.Contains(target, "://") ||
				strings.HasPrefix(target, "mailto:") {
				continue
			}
			if !strings.Contains(target, "/") && !strings.HasSuffix(target, ".md") &&
				!strings.HasPrefix(target, ".") {
				// Go generic calls such as Name[T](value) are not Markdown links.
				continue
			}
			target = strings.SplitN(target, "#", 2)[0]
			target = strings.SplitN(target, "?", 2)[0]
			if target == "" {
				continue
			}
			resolved := filepath.Clean(filepath.Join(filepath.Dir(name), filepath.FromSlash(target)))
			if _, err := os.Stat(resolved); err != nil {
				if os.IsNotExist(err) && unavailableNestedModuleTarget(resolved) {
					continue
				}
				t.Errorf("%s has unresolved relative link %q (resolved %s): %v", name, match[1], resolved, err)
			}
		}
	}
}

func unavailableNestedModuleTarget(path string) bool {
	for _, root := range []string{"quickstart", "examples"} {
		if path != root && !strings.HasPrefix(path, root+string(filepath.Separator)) {
			continue
		}
		if _, err := os.Stat(root); os.IsNotExist(err) {
			return true
		}
	}
	return false
}

func TestCurrentDocumentationHasNoKnownStaleContracts(t *testing.T) {
	prohibited := []string{
		"WithFeatureDefaults(quickstart.DefaultMinimalFeatures())",
		"WithFeatureDefaults(DefaultMinimalFeatures())",
		"WithLegacyUserRoleBulkRoutes",
		"`docs/prds/ADMIN_TDD.md",
		"/opt/homebrew/bin/go",
		"/Users/goliatone/.g/go/bin/go",
	}
	for _, name := range currentDocumentationPaths() {
		content := readDocumentation(t, name)
		for _, value := range prohibited {
			if strings.Contains(content, value) {
				t.Errorf("%s contains stale contract %q", name, value)
			}
		}
	}
}

func TestAdminShellCustomizationDocsMatchRuntimeContract(t *testing.T) {
	documents := map[string][]string{
		"docs/GUIDE_VIEW_CUSTOMIZATION.md": {
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
		"docs/GUIDE_UI_PRIMITIVES.md": {
			"The authenticated `layout.html` owns the single page-header frame",
			"page_header_actions",
			"@goliatone/go-admin-client/components.css",
			"single self-contained source",
			"were consolidated and removed",
			"v0.133.0",
		},
		"docs/GUIDE_THEME.md": {
			"ThemeSelection.Partials",
			"exact normalized first-wins template stack",
			"eight-entry per-request cap",
			"admin.modal.surface",
		},
		"docs/GUIDE_FRONTEND.md": {
			"AdminPageChrome",
			"@goliatone/go-admin-client/components.css",
			"npm run build:css",
		},
	}

	primitiveGuide := readDocumentation(t, "docs/GUIDE_UI_PRIMITIVES.md")
	for _, stale := range []string{
		"its component modules live under",
		"`pkg/client/assets/input.css` imports that canonical entry",
	} {
		if strings.Contains(primitiveGuide, stale) {
			t.Errorf("primitive guide retains stale component build claim %q", stale)
		}
	}

	assertDocumentationFragments(t, documents)

	for _, path := range []string{
		"pkg/client/templates/layout.html",
		"pkg/client/templates/partials/sidebar.html",
		"pkg/client/templates/partials/breadcrumbs.html",
		"pkg/client/templates/partials/admin-footer.html",
	} {
		if info, err := os.Stat(path); err != nil || info.IsDir() {
			t.Errorf("documented template path %s is unavailable", path)
		}
	}

	if _, err := os.Stat("examples/admin-shell/README.md"); err == nil {
		assertDocumentationFragments(t, map[string][]string{
			"examples/admin-shell/README.md": {
				"data/templates/partials/breadcrumbs.html",
				"Neither customization requires copying",
			},
		})
	}
}

func TestDashboardRendererGuidanceMatchesTypedRuntimeContract(t *testing.T) {
	documents := map[string][]string{
		"docs/GUIDE_DASHBOARD_WIDGETS.md": {
			"accept `admin.AdminDashboardPage` only",
			"`quickstart.DashboardTemplatesFS()` returns",
			"`client.Templates()`",
			"is not retained as a fallback",
			"`quickstart.NormalizeDashboardTemplateData(...)`",
			"does not broaden the `admin.DashboardRenderer` interface",
		},
	}
	for path, required := range map[string][]string{
		".agents/skills/go-admin-dashboard-builder/SKILL.md": {
			"accept `admin.AdminDashboardPage`",
			"`quickstart.NormalizeDashboardTemplateData(...)` accepts a raw typed `dashboard.Page`",
			"`quickstart.DashboardTemplatesFS()` returns `client.Templates()`",
			"is not a fallback",
		},
		".agents/skills/go-admin-dashboard-builder/references/rendering-and-placements.md": {
			"accept `admin.AdminDashboardPage`",
			"`quickstart.NormalizeDashboardTemplateData(...)` accepts a raw typed `dashboard.Page`",
			"`quickstart.DashboardTemplatesFS()` returns `client.Templates()`",
			"is not a fallback",
		},
	} {
		if _, err := os.Stat(path); err == nil {
			documents[path] = required
		}
	}

	assertDocumentationFragments(t, documents)
	for path := range documents {
		text := readDocumentation(t, path)
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

func assertDocumentationFragments(t *testing.T, documents map[string][]string) {
	t.Helper()
	for path, fragments := range documents {
		content := readDocumentation(t, path)
		normalized := strings.Join(strings.Fields(content), " ")
		for _, fragment := range fragments {
			if !strings.Contains(normalized, strings.Join(strings.Fields(fragment), " ")) {
				t.Errorf("%s is missing runtime contract fragment %q", path, fragment)
			}
		}
	}
}

func currentDocumentationPaths() []string {
	paths := append([]string(nil), currentDocumentation...)
	for _, name := range repositoryOnlyDocumentation {
		if _, err := os.Stat(name); err == nil {
			paths = append(paths, name)
		}
	}
	return paths
}

func readDocumentation(t *testing.T, name string) string {
	t.Helper()
	content, err := os.ReadFile(name)
	if err != nil {
		t.Fatalf("read %s: %v", name, err)
	}
	return string(content)
}
