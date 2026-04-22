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
		files, err := os.ReadDir(dir)
		if err != nil {
			t.Fatalf("read dir %s: %v", dir, err)
		}
		for _, entry := range files {
			if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".go") {
				continue
			}
			filename := filepath.Join(dir, entry.Name())
			fset := token.NewFileSet()
			file, parseErr := parser.ParseFile(fset, filename, nil, parser.ImportsOnly)
			if parseErr != nil {
				t.Fatalf("parse file %s: %v", filename, parseErr)
			}
			for _, spec := range file.Imports {
				path := strings.Trim(spec.Path.Value, `"`)
				if strings.Contains(path, "/admin") || strings.Contains(path, "go-cms") {
					t.Fatalf("%s imports forbidden host package %q", filename, path)
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
