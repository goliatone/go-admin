package translations_test

import (
	"go/parser"
	"go/token"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

func TestCoreAndServicesPackagesRemainHostAgnostic(t *testing.T) {
	_, filename, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatalf("runtime.Caller failed")
	}
	root := filepath.Dir(filename)
	repoRoot := filepath.Dir(root)
	for _, dir := range []string{
		filepath.Join(repoRoot, "translations", "core"),
		filepath.Join(repoRoot, "translations", "services"),
	} {
		fset := token.NewFileSet()
		pkgs, err := parser.ParseDir(fset, dir, nil, parser.ImportsOnly)
		if err != nil {
			t.Fatalf("parse dir %s: %v", dir, err)
		}
		for _, pkg := range pkgs {
			for filename, file := range pkg.Files {
				for _, spec := range file.Imports {
					path := strings.Trim(spec.Path.Value, `"`)
					if strings.Contains(path, "/admin") || strings.Contains(path, "go-cms") {
						t.Fatalf("%s imports forbidden host package %q", filename, path)
					}
				}
			}
		}
	}
}

func TestOpenAPISpecExists(t *testing.T) {
	_, filename, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatalf("runtime.Caller failed")
	}
	path := filepath.Join(filepath.Dir(filename), "ui", "openapi", "translations.json")
	if _, err := os.Stat(path); err != nil {
		t.Fatalf("expected OpenAPI artifact at %s: %v", path, err)
	}
}
