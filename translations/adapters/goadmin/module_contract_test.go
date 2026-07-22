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

func TestModuleContractForCapabilitiesOnlyAdvertisesMountedSurfaces(t *testing.T) {
	tests := []struct {
		name                    string
		core, exchange          bool
		queue                   bool
		wantUI, wantAPI         int
		wantExchange, wantQueue bool
	}{
		{name: "none"},
		{name: "exchange only", exchange: true, wantUI: 1, wantAPI: 5, wantExchange: true},
		{name: "queue only", queue: true, wantUI: 4, wantAPI: 10, wantQueue: true},
		{name: "core", core: true, wantUI: 3, wantAPI: 7},
		{name: "core exchange", core: true, exchange: true, wantUI: 4, wantAPI: 12, wantExchange: true},
		{name: "core queue", core: true, queue: true, wantUI: 7, wantAPI: 17, wantQueue: true},
		{name: "full", core: true, exchange: true, queue: true, wantUI: 8, wantAPI: 22, wantExchange: true, wantQueue: true},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			contract := ModuleContractForCapabilities(test.core, test.exchange, test.queue)
			if len(contract.UIRoutes) != test.wantUI || len(contract.APIRoutes) != test.wantAPI {
				t.Fatalf("route counts ui=%d api=%d, want ui=%d api=%d", len(contract.UIRoutes), len(contract.APIRoutes), test.wantUI, test.wantAPI)
			}
			_, hasExchange := contract.UIRoutes["translations.exchange"]
			_, hasQueue := contract.UIRoutes["translations.queue"]
			if hasExchange != test.wantExchange || hasQueue != test.wantQueue {
				t.Fatalf("optional UI routes exchange=%t queue=%t", hasExchange, hasQueue)
			}
		})
	}
}
