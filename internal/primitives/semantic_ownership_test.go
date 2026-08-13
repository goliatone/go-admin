package primitives

import (
	"go/ast"
	"go/parser"
	"go/token"
	"path/filepath"
	"runtime"
	"testing"
)

func TestConsolidatedHelperFunctionsDoNotReturn(t *testing.T) {
	t.Parallel()
	root := semanticAuditRepositoryRoot(t)
	tests := []struct {
		path string
		name string
	}{
		{path: "admin/repository_memory.go", name: "cloneMap"},
		{path: "internal/navigation/contract.go", name: "cloneMap"},
		{path: "testkit/admincontract/list_contract.go", name: "cloneMap"},
		{path: "examples/web/handlers/site_test.go", name: "cloneMap"},
		{path: "examples/web/commands/factories.go", name: "extractMap"},
		{path: "examples/web/content_actions_contracts_test.go", name: "extractMap"},
		{path: "admin/cms_blocks.go", name: "stringSliceFromAny"},
		{path: "examples/web/stores/cms_page_store.go", name: "stringSliceFromAny"},
		{path: "quickstart/site/navigation_generated_fallback_support.go", name: "stringSliceFromAny"},
		{path: "admin/users_module.go", name: "toBool"},
		{path: "modules/services/util.go", name: "toBool"},
		{path: "quickstart/internal/sitereserved/prefixes.go", name: "normalizePath"},
		{path: "quickstart/protectedapp/protectedapp.go", name: "normalizePath"},
	}

	for _, test := range tests {
		t.Run(test.path+":"+test.name, func(t *testing.T) {
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
