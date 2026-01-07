package quickstart

import (
	"strings"
	"testing"

	"github.com/goliatone/go-admin/admin"
)

type stubModule struct {
	id           string
	deps         []string
	featureFlags []string
	menuItems    []admin.MenuItem
}

func (m stubModule) Manifest() admin.ModuleManifest {
	return admin.ModuleManifest{ID: m.id, Dependencies: m.deps, FeatureFlags: m.featureFlags}
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

func TestNewModuleRegistrarFeatureGatesSkipModules(t *testing.T) {
	cfg := admin.Config{DefaultLocale: "en"}
	adm, err := admin.New(cfg, admin.Dependencies{})
	if err != nil {
		t.Fatalf("admin.New error: %v", err)
	}
	modA := stubModule{id: "alpha", featureFlags: []string{"feature.a"}}
	modB := stubModule{id: "bravo", featureFlags: []string{"feature.b"}}
	gates := admin.NewFeatureGates(map[string]bool{"feature.a": true})
	disabled := []string{}

	err = NewModuleRegistrar(
		adm,
		cfg,
		[]admin.Module{modA, modB},
		false,
		WithSeedNavigation(false),
		WithModuleFeatureGates(gates),
		WithModuleFeatureDisabledHandler(func(feature, moduleID string) error {
			disabled = append(disabled, feature+":"+moduleID)
			return nil
		}),
	)
	if err != nil {
		t.Fatalf("NewModuleRegistrar error: %v", err)
	}
	if _, ok := adm.Registry().Module("alpha"); !ok {
		t.Fatalf("expected module alpha registered")
	}
	if _, ok := adm.Registry().Module("bravo"); ok {
		t.Fatalf("expected module bravo skipped")
	}
	if len(disabled) != 1 || disabled[0] != "feature.b:bravo" {
		t.Fatalf("expected disabled handler called, got %v", disabled)
	}
}

func TestFilterModulesSkipsMissingDependencies(t *testing.T) {
	modA := stubModule{id: "alpha", featureFlags: []string{"feature.a"}}
	modB := stubModule{id: "bravo", deps: []string{"alpha"}}
	gates := admin.NewFeatureGates(map[string]bool{})
	disabled := []string{}

	filtered, err := filterModulesForRegistrar(
		[]admin.Module{modA, modB},
		&gates,
		func(feature, moduleID string) error {
			disabled = append(disabled, feature+":"+moduleID)
			return nil
		},
	)
	if err != nil {
		t.Fatalf("filterModulesForRegistrar error: %v", err)
	}
	if len(filtered) != 0 {
		t.Fatalf("expected all modules skipped, got %d", len(filtered))
	}
	if len(disabled) != 2 {
		t.Fatalf("expected two disabled entries, got %v", disabled)
	}
	if disabled[0] != "feature.a:alpha" || disabled[1] != "dependency:alpha:bravo" {
		t.Fatalf("unexpected disabled entries: %v", disabled)
	}
}

func TestBuildSeedMenuItemsRespectsGates(t *testing.T) {
	menuA := admin.MenuItem{ID: "menu-a"}
	menuB := admin.MenuItem{ID: "menu-b"}
	modA := stubModule{id: "alpha", featureFlags: []string{"feature.a"}, menuItems: []admin.MenuItem{menuA}}
	modB := stubModule{id: "bravo", featureFlags: []string{"feature.b"}, menuItems: []admin.MenuItem{menuB}}
	gates := admin.NewFeatureGates(map[string]bool{"feature.a": true})

	filtered, err := filterModulesForRegistrar(
		[]admin.Module{modA, modB},
		&gates,
		func(feature, moduleID string) error { return nil },
	)
	if err != nil {
		t.Fatalf("filterModulesForRegistrar error: %v", err)
	}
	items := buildSeedMenuItems("admin.main", "en", filtered, nil)
	foundA := false
	foundB := false
	for _, item := range items {
		switch item.ID {
		case "menu-a":
			foundA = true
		case "menu-b":
			foundB = true
		}
	}
	if !foundA {
		t.Fatalf("expected menu-a included")
	}
	if foundB {
		t.Fatalf("expected menu-b skipped")
	}
}

func TestFeatureGatesFromConfigMergesFlags(t *testing.T) {
	cfg := admin.Config{
		Features: admin.Features{
			Search: true,
		},
		FeatureFlags: map[string]bool{
			string(admin.FeatureDashboard): true,
			string(admin.FeatureSearch):    false,
			"custom.flag":                  true,
		},
	}
	gates := FeatureGatesFromConfig(cfg)
	if !gates.Enabled(admin.FeatureDashboard) {
		t.Fatalf("expected dashboard enabled")
	}
	if !gates.Enabled(admin.FeatureSearch) {
		t.Fatalf("expected search enabled")
	}
	if !gates.EnabledKey("custom.flag") {
		t.Fatalf("expected custom flag enabled")
	}
}
