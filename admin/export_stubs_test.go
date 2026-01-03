package admin

import (
	"go/ast"
	"go/parser"
	"go/token"
	"io/fs"
	"strings"
	"testing"
)

func TestExportStubsRemoved(t *testing.T) {
	fset := token.NewFileSet()
	pkgs, err := parser.ParseDir(fset, ".", func(info fs.FileInfo) bool {
		name := info.Name()
		if !strings.HasSuffix(name, ".go") {
			return false
		}
		return !strings.HasSuffix(name, "_test.go")
	}, 0)
	if err != nil {
		t.Fatalf("parse admin sources: %v", err)
	}

	pkg := pkgs["admin"]
	if pkg == nil {
		for _, candidate := range pkgs {
			pkg = candidate
			break
		}
	}
	if pkg == nil {
		t.Fatalf("admin package sources not found")
	}

	declared := map[string]struct{}{}
	for _, file := range pkg.Files {
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
