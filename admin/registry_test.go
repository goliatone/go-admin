package admin

import (
	"errors"
	"testing"
)

type registryStubModule struct{ manifest ModuleManifest }

func (m registryStubModule) Manifest() ModuleManifest   { return m.manifest }
func (registryStubModule) Register(ModuleContext) error { return nil }

func TestRegistryTracksRegistrations(t *testing.T) {
	reg := NewRegistry()

	if err := reg.RegisterPanel("users", &Panel{name: "users"}); err != nil {
		t.Fatalf("register panel: %v", err)
	}
	if err := reg.RegisterPanel("users", &Panel{name: "users"}); err == nil {
		t.Fatalf("expected duplicate panel registration error")
	}
	if got := len(reg.Panels()); got != 1 {
		t.Fatalf("expected 1 panel, got %d", got)
	}

	mod := registryStubModule{manifest: ModuleManifest{ID: "mod.users"}}
	if err := reg.RegisterModule(mod); err != nil {
		t.Fatalf("register module: %v", err)
	}
	if err := reg.RegisterModule(mod); err == nil {
		t.Fatalf("expected duplicate module registration error")
	}
	if got := len(reg.Modules()); got != 1 {
		t.Fatalf("expected 1 module, got %d", got)
	}

	reg.RegisterDashboardProvider(DashboardProviderSpec{Code: "widgets.b"})
	reg.RegisterDashboardProvider(DashboardProviderSpec{Code: "widgets.a"})
	providers := reg.DashboardProviders()
	if len(providers) != 2 || providers[0].Code != "widgets.a" {
		t.Fatalf("unexpected provider ordering: %+v", providers)
	}

	reg.RegisterSetting(SettingDefinition{Key: "admin.theme"})
	reg.RegisterSetting(SettingDefinition{Key: "site.title"})
	settings := reg.Settings()
	if len(settings) != 2 || settings[0].Key != "admin.theme" {
		t.Fatalf("unexpected settings ordering: %+v", settings)
	}
}

func TestSettingsServiceRegistersIntoRegistry(t *testing.T) {
	reg := NewRegistry()
	svc := NewSettingsService()
	svc.WithRegistry(reg)

	svc.RegisterDefinition(SettingDefinition{Key: "site.name"})
	if got := len(reg.Settings()); got != 1 {
		t.Fatalf("expected registry to capture settings, got %d", got)
	}
}

func TestAdminRegisterPanelUsesRegistry(t *testing.T) {
	adm := mustNewAdmin(t, Config{}, Dependencies{})
	builder := (&PanelBuilder{}).WithRepository(NewMemoryRepository())

	if _, err := adm.RegisterPanel("items", builder); err != nil {
		t.Fatalf("register panel: %v", err)
	}
	if _, ok := adm.Registry().Panel("items"); !ok {
		t.Fatalf("expected panel to be stored in registry")
	}
}

func TestRegistryPanelTabsOrderingAndDedupe(t *testing.T) {
	reg := NewRegistry()

	tabB := PanelTab{
		ID:       "b",
		Label:    "B",
		Position: 2,
		Target:   PanelTabTarget{Type: "panel", Panel: "b"},
	}
	tabA := PanelTab{
		ID:       "a",
		Label:    "A",
		Position: 1,
		Target:   PanelTabTarget{Type: "panel", Panel: "a"},
	}
	if err := reg.RegisterPanelTab("users", tabB); err != nil {
		t.Fatalf("register tab b: %v", err)
	}
	if err := reg.RegisterPanelTab("users", tabA); err != nil {
		t.Fatalf("register tab a: %v", err)
	}
	if err := reg.RegisterPanelTab("users", PanelTab{ID: "a", Label: "A2", Target: PanelTabTarget{Type: "panel", Panel: "a"}}); err != nil {
		t.Fatalf("register duplicate tab: %v", err)
	}

	tabs := reg.PanelTabs("users")
	if len(tabs) != 2 {
		t.Fatalf("expected 2 tabs, got %d", len(tabs))
	}
	if tabs[0].ID != "a" || tabs[1].ID != "b" {
		t.Fatalf("unexpected tab ordering: %+v", tabs)
	}
}

func TestRegistryPanelTabsPreRegistrationAndDerivedID(t *testing.T) {
	reg := NewRegistry()
	tab := PanelTab{
		Label:  "Activity",
		Target: PanelTabTarget{Type: "panel", Panel: "activity"},
	}
	if err := reg.RegisterPanelTab("profile", tab); err != nil {
		t.Fatalf("register tab: %v", err)
	}
	tabs := reg.PanelTabs("profile")
	if len(tabs) != 1 {
		t.Fatalf("expected 1 tab, got %d", len(tabs))
	}
	expected := derivePanelTabID(tab)
	if tabs[0].ID != expected {
		t.Fatalf("expected derived ID %q, got %q", expected, tabs[0].ID)
	}
}

func TestAdminRegisterPanelTabCollisionHandlerOverwrite(t *testing.T) {
	adm := mustNewAdmin(t, Config{}, Dependencies{})
	adm.WithPanelTabCollisionHandler(func(string, PanelTab, PanelTab) (PanelTab, error) {
		return PanelTab{
			ID:     "dup",
			Label:  "Second",
			Target: PanelTabTarget{Type: "panel", Panel: "second"},
		}, nil
	})

	if err := adm.RegisterPanelTab("users", PanelTab{ID: "dup", Label: "First", Target: PanelTabTarget{Type: "panel", Panel: "first"}}); err != nil {
		t.Fatalf("register tab: %v", err)
	}
	if err := adm.RegisterPanelTab("users", PanelTab{ID: "dup", Label: "Second", Target: PanelTabTarget{Type: "panel", Panel: "second"}}); err != nil {
		t.Fatalf("register tab overwrite: %v", err)
	}

	tabs := adm.Registry().PanelTabs("users")
	if len(tabs) != 1 || tabs[0].Label != "Second" {
		t.Fatalf("expected overwritten tab, got %+v", tabs)
	}
}

func TestAdminRegisterPanelTabCollisionHandlerError(t *testing.T) {
	adm := mustNewAdmin(t, Config{}, Dependencies{})
	adm.WithPanelTabCollisionHandler(func(string, PanelTab, PanelTab) (PanelTab, error) {
		return PanelTab{}, errors.New("collision failure")
	})

	if err := adm.RegisterPanelTab("users", PanelTab{ID: "dup", Label: "First", Target: PanelTabTarget{Type: "panel", Panel: "first"}}); err != nil {
		t.Fatalf("register tab: %v", err)
	}
	if err := adm.RegisterPanelTab("users", PanelTab{ID: "dup", Label: "Second", Target: PanelTabTarget{Type: "panel", Panel: "second"}}); err == nil {
		t.Fatalf("expected collision error")
	}

	tabs := adm.Registry().PanelTabs("users")
	if len(tabs) != 1 || tabs[0].Label != "First" {
		t.Fatalf("expected original tab, got %+v", tabs)
	}
}
