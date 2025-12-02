package admin

import "testing"

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
	adm := New(Config{})
	builder := (&PanelBuilder{}).WithRepository(NewMemoryRepository())

	if _, err := adm.RegisterPanel("items", builder); err != nil {
		t.Fatalf("register panel: %v", err)
	}
	if _, ok := adm.Registry().Panel("items"); !ok {
		t.Fatalf("expected panel to be stored in registry")
	}
}
