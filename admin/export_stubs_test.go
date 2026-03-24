package admin

import (
	"go/ast"
	"go/parser"
	"go/token"
	"os"
	"strings"
	"testing"
)

func TestExportStubsRemoved(t *testing.T) {
	fset := token.NewFileSet()
	entries, err := os.ReadDir(".")
	if err != nil {
		t.Fatalf("read admin sources: %v", err)
	}
	declared := map[string]struct{}{}
	for _, entry := range entries {
		name := entry.Name()
		if entry.IsDir() || !strings.HasSuffix(name, ".go") || strings.HasSuffix(name, "_test.go") {
			continue
		}
		file, parseErr := parser.ParseFile(fset, name, nil, 0)
		if parseErr != nil {
			t.Fatalf("parse admin source %s: %v", name, parseErr)
		}
		for _, decl := range file.Decls {
			gen, ok := decl.(*ast.GenDecl)
			if !ok || gen.Tok != token.TYPE {
				continue
			}
			for _, spec := range gen.Specs {
				ts, ok := spec.(*ast.TypeSpec)
				if !ok {
					continue
				}
				declared[ts.Name.Name] = struct{}{}
			}
		}
	}

	forbidden := []string{
		"ExportService",
		"ExportRequest",
		"ExportResult",
		"InMemoryExportService",
		"DisabledExportService",
	}
	for _, name := range forbidden {
		if _, ok := declared[name]; ok {
			t.Fatalf("legacy export stub type %s should be removed", name)
		}
	}
}
