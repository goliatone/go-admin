package goadmin

import "testing"

// The module root intentionally keeps its implementation in subpackages.
// This smoke test lets `go test` run successfully from the repository root.
func TestModuleRootPackageExists(t *testing.T) {}
