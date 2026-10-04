package goadmin

import (
	"os"
	"testing"

	"golang.org/x/mod/modfile"
)

// The module root intentionally keeps its implementation in subpackages.
// This smoke test lets `go test` run successfully from the repository root.
func TestModuleRootPackageExists(t *testing.T) {}

// Workspace replacements can hide stale sibling-module dependencies until
// release validation disables go.work. Keep this guard in ordinary go test.
func TestRootModuleDoesNotRequireSiblingModules(t *testing.T) {
	content, err := os.ReadFile("go.mod")
	if err != nil {
		t.Fatal(err)
	}
	file, err := modfile.Parse("go.mod", content, nil)
	if err != nil {
		t.Fatal(err)
	}
	for _, required := range file.Require {
		switch required.Mod.Path {
		case file.Module.Mod.Path + "/examples", file.Module.Mod.Path + "/quickstart":
			t.Errorf("root module must not require sibling module %s; put shared test fixtures in the root module", required.Mod.Path)
		}
	}
}
