package console_test

import (
	"context"
	"testing"

	"github.com/goliatone/go-admin/console"
	"github.com/goliatone/go-admin/debug"
)

func TestRegistriesAndLegacyFacadeAreIndependent(t *testing.T) {
	a, b := console.NewPanelRegistry(), console.NewPanelRegistry()
	for n, registry := range []*console.PanelRegistry{a, b} {
		if err := registry.Register("operations", console.PanelConfig{
			Snapshot: func(context.Context) any { return n },
			UI:       console.NewPanelUI(console.TableView(""), nil),
		}); err != nil {
			t.Fatal(err)
		}
	}
	if err := a.Register("operations", console.PanelConfig{}); err == nil {
		t.Fatal("duplicate replaced callback")
	}
	for n, registry := range []*console.PanelRegistry{a, b} {
		reg, ok := registry.Registration("operations")
		if !ok || reg.Snapshot(context.Background()) != n {
			t.Fatal("registry callback crossed instance")
		}
	}
	if _, ok := debug.Panel("operations"); ok {
		t.Fatal("neutral registration reached Debug default")
	}
	// Alias compatibility includes function signatures, not just JSON values.
	var legacy debug.PanelActionHandler = func(_ context.Context, req console.PanelActionRequest) (console.PanelActionResult, error) {
		return debug.PanelActionResult{OK: req.PanelID == "operations"}, nil
	}
	var neutral console.PanelActionHandler = legacy
	result, err := neutral(context.Background(), debug.PanelActionRequest{PanelID: "operations"})
	if err != nil || !result.OK {
		t.Fatal("legacy callback signature changed")
	}
}

func TestIdentityNamespaceIncludesAllBoundaries(t *testing.T) {
	i := console.Identity{ConsoleID: "data", ApplicationID: "app", EnvironmentID: "dev", ActorID: "alice", ScopeKey: "org"}
	variants := []console.Identity{i, {ConsoleID: "debug", ApplicationID: "app", EnvironmentID: "dev", ActorID: "alice", ScopeKey: "org"}, {ConsoleID: "data", ApplicationID: "app", EnvironmentID: "dev", ActorID: "bob", ScopeKey: "org"}}
	seen := map[string]bool{}
	for _, identity := range variants {
		if !identity.Valid() || seen[identity.Namespace()] {
			t.Fatal("identity namespace collided")
		}
		seen[identity.Namespace()] = true
	}
}
