package quickstart

import (
	"strings"
	"testing"

	"github.com/goliatone/go-admin/admin"
)

type stubModule struct {
	id        string
	deps      []string
	menuItems []admin.MenuItem
}

func (m stubModule) Manifest() admin.ModuleManifest {
	return admin.ModuleManifest{ID: m.id, Dependencies: m.deps}
}

func (m stubModule) Register(ctx admin.ModuleContext) error {
	_ = ctx
	return nil
}

func (m stubModule) MenuItems(locale string) []admin.MenuItem {
	_ = locale
	if len(m.menuItems) == 0 {
		return nil
	}
	items := make([]admin.MenuItem, len(m.menuItems))
	copy(items, m.menuItems)
	return items
}

func TestOrderModulesDeterministic(t *testing.T) {
	modA := stubModule{id: "alpha", deps: []string{"bravo"}}
	modB := stubModule{id: "bravo"}
	modC := stubModule{id: "charlie", deps: []string{"bravo"}}

	ordered, err := orderModules([]admin.Module{modA, modB, modC})
	if err != nil {
		t.Fatalf("orderModules error: %v", err)
	}
	if len(ordered) != 3 {
		t.Fatalf("expected 3 modules, got %d", len(ordered))
	}
	got := []string{
		ordered[0].Manifest().ID,
		ordered[1].Manifest().ID,
		ordered[2].Manifest().ID,
	}
	expected := []string{"bravo", "alpha", "charlie"}
	for i, id := range expected {
		if got[i] != id {
			t.Fatalf("expected order %v, got %v", expected, got)
		}
	}
}

func TestNewModuleRegistrarWrapsRegisterErrors(t *testing.T) {
	cfg := admin.Config{DefaultLocale: "en"}
	adm, err := admin.New(cfg, admin.Dependencies{})
	if err != nil {
		t.Fatalf("admin.New error: %v", err)
	}
	preRegistered := stubModule{id: "dup-module"}
	if err := adm.RegisterModule(preRegistered); err != nil {
		t.Fatalf("pre-register module: %v", err)
	}

	err = NewModuleRegistrar(adm, cfg, []admin.Module{preRegistered}, false, WithSeedNavigation(false))
	if err == nil {
		t.Fatalf("expected registration error")
	}
	if !strings.Contains(err.Error(), "register module dup-module") {
		t.Fatalf("expected wrapped error with module ID, got %v", err)
	}
}
