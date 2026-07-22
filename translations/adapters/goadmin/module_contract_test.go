package goadmin

import (
	"testing"

	router "github.com/goliatone/go-router"
)

func TestModuleContractDeclaresMethodsAndOnlyRegisteredAssignmentUIRoute(t *testing.T) {
	contract := ModuleContract()
	if _, stale := contract.UIRoutes["translations.assignments.id"]; stale {
		t.Fatal("translation UI contract still advertises the unregistered assignment detail route")
	}
	if got := contract.UIRouteDeclarations["translations.assignments.edit"]; got.Method != router.GET || got.Path != "/assignments/:assignment_id/edit" {
		t.Fatalf("assignment editor declaration = %+v", got)
	}
	for key := range contract.UIRoutes {
		if contract.UIRouteDeclarations[key].Method == "" {
			t.Errorf("UI route %q has no method", key)
		}
	}
	for key := range contract.APIRoutes {
		if contract.APIRouteDeclarations[key].Method == "" {
			t.Errorf("API route %q has no method", key)
		}
	}
}
