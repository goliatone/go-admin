package gosync_test

import (
	"go/parser"
	"go/token"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

func TestGoSyncPackagesDoNotImportAppSpecificGoAdminPackages(t *testing.T) {
	repoRoot := repoRoot(t)
	targetRoot := filepath.Join(repoRoot, "pkg", "go-sync")
	files := goFiles(t, targetRoot)

	fset := token.NewFileSet()
	violations := make([]string, 0)

	for _, path := range files {
		file, err := parser.ParseFile(fset, path, nil, parser.ImportsOnly)
		if err != nil {
			t.Fatalf("parse imports for %s: %v", rel(repoRoot, path), err)
		}
		for _, spec := range file.Imports {
			importPath := strings.Trim(spec.Path.Value, `"`)
			if strings.HasPrefix(importPath, "github.com/goliatone/go-admin/") &&
				!strings.HasPrefix(importPath, "github.com/goliatone/go-admin/pkg/go-sync") {
				violations = append(violations, rel(repoRoot, path)+" -> "+importPath)
			}
		}
	}

	if len(violations) > 0 {
		t.Fatalf("pkg/go-sync imports host-specific packages: %v", violations)
	}
}

func repoRoot(t *testing.T) string {
	t.Helper()
	_, filename, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("resolve caller path")
	}
	return filepath.Clean(filepath.Join(filepath.Dir(filename), "..", ".."))
}

func goFiles(t *testing.T, root string) []string {
	t.Helper()
	files := make([]string, 0, 32)
	err := filepath.WalkDir(root, func(path string, d os.DirEntry, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		if d == nil || d.IsDir() {
			return nil
		}
		name := strings.ToLower(strings.TrimSpace(d.Name()))
		if !strings.HasSuffix(name, ".go") || strings.HasSuffix(name, "_test.go") {
			return nil
		}
		files = append(files, path)
		return nil
	})
	if err != nil {
		t.Fatalf("walk go-sync files: %v", err)
	}
	return files
}

func rel(repoRoot, path string) string {
	relative, err := filepath.Rel(repoRoot, path)
	if err != nil {
		return path
	}
	return filepath.ToSlash(relative)
}
