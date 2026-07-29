package goadmin_test

import (
	"go/ast"
	"go/parser"
	"go/token"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"testing"
)

var currentDocumentation = []string{
	"README.md",
	"quickstart/README.md",
	"docs/README.md",
	"docs/GUIDE_FEATURE_GATES.md",
	"docs/GUIDE_ROUTING.md",
	"docs/GUIDE_VIEW_CUSTOMIZATION.md",
	"docs/COMMERCE_SETUP.md",
	"docs/PERSISTENCE_GUIDE_GO_ADMIN.md",
	"examples/admin-shell/README.md",
}

func TestCurrentDocumentationUsesExportedQuickstartFunctions(t *testing.T) {
	exports := quickstartFunctionExports(t)
	content := readDocumentation(t, "quickstart/README.md")
	references := regexp.MustCompile(`quickstart\.([A-Z][A-Za-z0-9_]*)\s*\(`).FindAllStringSubmatch(content, -1)
	references = append(
		references,
		regexp.MustCompile(`(?m)^- \x60([A-Z][A-Za-z0-9_]*)\(`).FindAllStringSubmatch(content, -1)...,
	)
	if len(references) == 0 {
		t.Fatal("quickstart README contains no callable API examples")
	}
	for _, reference := range references {
		name := reference[1]
		if _, ok := exports[name]; !ok {
			t.Errorf("quickstart/README.md references nonexistent quickstart function %s", name)
		}
	}
}

func TestCurrentDocumentationRelativeLinksResolve(t *testing.T) {
	linkPattern := regexp.MustCompile(`\[[^\]]+\]\(([^)]+)\)`)
	for _, name := range currentDocumentation {
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
				t.Errorf("%s has unresolved relative link %q (resolved %s): %v", name, match[1], resolved, err)
			}
		}
	}
}

func TestCurrentDocumentationHasNoKnownStaleContracts(t *testing.T) {
	prohibited := []string{
		"WithFeatureDefaults(quickstart.DefaultMinimalFeatures())",
		"WithFeatureDefaults(DefaultMinimalFeatures())",
		"WithLegacyUserRoleBulkRoutes",
		"`docs/prds/ADMIN_TDD.md",
		"`docs/ESIGN_PERSISTENCE_MIGRATION_CHECKLIST.md",
		"/opt/homebrew/bin/go",
		"/Users/goliatone/.g/go/bin/go",
	}
	for _, name := range currentDocumentation {
		content := readDocumentation(t, name)
		for _, value := range prohibited {
			if strings.Contains(content, value) {
				t.Errorf("%s contains stale contract %q", name, value)
			}
		}
	}
}

func quickstartFunctionExports(t *testing.T) map[string]struct{} {
	t.Helper()
	packages, err := parser.ParseDir(token.NewFileSet(), "quickstart", func(info os.FileInfo) bool {
		return !strings.HasSuffix(info.Name(), "_test.go")
	}, 0)
	if err != nil {
		t.Fatalf("parse quickstart package: %v", err)
	}
	pkg := packages["quickstart"]
	if pkg == nil {
		t.Fatal("quickstart package not found")
	}
	exports := map[string]struct{}{}
	for _, file := range pkg.Files {
		for _, declaration := range file.Decls {
			function, ok := declaration.(*ast.FuncDecl)
			if ok && function.Recv == nil && function.Name.IsExported() {
				exports[function.Name.Name] = struct{}{}
			}
		}
	}
	return exports
}

func readDocumentation(t *testing.T, name string) string {
	t.Helper()
	content, err := os.ReadFile(name)
	if err != nil {
		t.Fatalf("read %s: %v", name, err)
	}
	return string(content)
}
