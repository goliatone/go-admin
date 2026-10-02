package primitives

import (
	"go/ast"
	"go/parser"
	"go/token"
	"os"
	"path/filepath"
	"runtime"
	"testing"
)

func TestConsolidatedHelperFunctionsDoNotReturn(t *testing.T) {
	t.Parallel()
	root := semanticAuditRepositoryRoot(t)
	tests := []struct {
		path         string
		name         string
		nestedModule string
	}{
		{path: "admin/repository_memory.go", name: "cloneMap"},
		{path: "internal/navigation/contract.go", name: "cloneMap"},
		{path: "testkit/admincontract/list_contract.go", name: "cloneMap"},
		{path: "examples/web/handlers/site_test.go", name: "cloneMap", nestedModule: "examples/web"},
		{path: "examples/web/commands/factories.go", name: "extractMap", nestedModule: "examples/web"},
		{path: "examples/web/content_actions_contracts_test.go", name: "extractMap", nestedModule: "examples/web"},
		{path: "admin/cms_blocks.go", name: "stringSliceFromAny"},
		{path: "examples/web/stores/cms_page_store.go", name: "stringSliceFromAny", nestedModule: "examples/web"},
		{path: "quickstart/site/navigation_generated_fallback_support.go", name: "stringSliceFromAny", nestedModule: "quickstart"},
		{path: "admin/users_module.go", name: "toBool"},
		{path: "modules/services/util.go", name: "toBool"},
		{path: "quickstart/internal/sitereserved/prefixes.go", name: "normalizePath", nestedModule: "quickstart"},
		{path: "quickstart/protectedapp/protectedapp.go", name: "normalizePath", nestedModule: "quickstart"},
	}

	for _, test := range tests {
		t.Run(test.path+":"+test.name, func(t *testing.T) {
			// Go module ZIPs omit nested modules. Audit their sources when running
			// in a checkout, while still requiring every root-module audit target.
			if test.nestedModule != "" {
				if _, err := os.Stat(filepath.Join(root, filepath.FromSlash(test.nestedModule), "go.mod")); os.IsNotExist(err) {
					t.Skip("nested module is absent from this root module artifact")
				} else if err != nil {
					t.Fatal(err)
				}
			}
			filePath := filepath.Join(root, filepath.FromSlash(test.path))
			parsed, err := parser.ParseFile(token.NewFileSet(), filePath, nil, 0)
			if err != nil {
				t.Fatalf("parse %s: %v", filePath, err)
			}
			for _, declaration := range parsed.Decls {
				function, ok := declaration.(*ast.FuncDecl)
				if ok && function.Name.Name == test.name {
					t.Fatalf("%s must delegate to its audited shared owner instead of defining func %s", test.path, test.name)
				}
			}
		})
	}
}

func semanticAuditRepositoryRoot(t *testing.T) string {
	t.Helper()
	_, currentFile, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("resolve semantic ownership test path")
	}
	return filepath.Clean(filepath.Join(filepath.Dir(currentFile), "..", ".."))
}
