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
