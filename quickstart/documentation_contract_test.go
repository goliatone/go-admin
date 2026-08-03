package quickstart_test

import (
	"go/ast"
	"go/build"
	"go/parser"
	"go/token"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"testing"
)

func TestREADMEUsesExportedQuickstartFunctions(t *testing.T) {
	exports := quickstartFunctionExports(t)
	content := readQuickstartREADME(t)
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
			t.Errorf("README.md references nonexistent quickstart function %s", name)
		}
	}
}

func TestREADMEHasNoKnownStaleContracts(t *testing.T) {
	content := readQuickstartREADME(t)
	prohibited := []string{
		"WithFeatureDefaults(quickstart.DefaultMinimalFeatures())",
		"WithFeatureDefaults(DefaultMinimalFeatures())",
		"WithLegacyUserRoleBulkRoutes",
		"`docs/prds/ADMIN_TDD.md",
		"/opt/homebrew/bin/go",
		"/Users/goliatone/.g/go/bin/go",
	}
	for _, value := range prohibited {
		if strings.Contains(content, value) {
			t.Errorf("README.md contains stale contract %q", value)
		}
	}
}

func quickstartFunctionExports(t *testing.T) map[string]struct{} {
	t.Helper()
	pkg, err := build.Default.ImportDir(".", build.IgnoreVendor)
	if err != nil {
		t.Fatalf("load quickstart package: %v", err)
	}
	if pkg.Name != "quickstart" {
		t.Fatalf("loaded package %q, want quickstart", pkg.Name)
	}

	files := append(append([]string{}, pkg.GoFiles...), pkg.CgoFiles...)
	fileSet := token.NewFileSet()
	exports := map[string]struct{}{}
	for _, name := range files {
		file, parseErr := parser.ParseFile(fileSet, filepath.Join(".", name), nil, 0)
		if parseErr != nil {
			t.Fatalf("parse quickstart file %s: %v", name, parseErr)
		}
		for _, declaration := range file.Decls {
			function, ok := declaration.(*ast.FuncDecl)
			if ok && function.Recv == nil && function.Name.IsExported() {
				exports[function.Name.Name] = struct{}{}
			}
		}
	}
	return exports
}

func readQuickstartREADME(t *testing.T) string {
	t.Helper()
	content, err := os.ReadFile("README.md")
	if err != nil {
		t.Fatalf("read README.md: %v", err)
	}
	return string(content)
}
