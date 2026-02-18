package quickstart

import (
	"testing"

	"github.com/goliatone/go-admin/admin"
)

// contentEntryAdminFixture keeps admin bootstrap setup explicit in tests.
type contentEntryAdminFixture struct {
	Config admin.Config
	Admin  *admin.Admin
}

func newContentEntryAdminFixture(t *testing.T) contentEntryAdminFixture {
	t.Helper()

	cfg := admin.Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
	}
	adm, err := admin.New(cfg, admin.Dependencies{})
	if err != nil {
		t.Fatalf("new admin: %v", err)
	}
	return contentEntryAdminFixture{Config: cfg, Admin: adm}
}

func newInMemoryPanelBuilder() *admin.PanelBuilder {
	return (&admin.PanelBuilder{}).WithRepository(admin.NewMemoryRepository())
}

func mustBuildInMemoryPanel(t *testing.T, configure func(*admin.PanelBuilder)) *admin.Panel {
	t.Helper()

	builder := newInMemoryPanelBuilder()
	if configure != nil {
		configure(builder)
	}
	panel, err := builder.Build()
	if err != nil {
		t.Fatalf("build panel: %v", err)
	}
	return panel
}

func mustRegisterInMemoryPanel(t *testing.T, adm *admin.Admin, name string, configure func(*admin.PanelBuilder)) *admin.Panel {
	t.Helper()

	builder := newInMemoryPanelBuilder()
	if configure != nil {
		configure(builder)
	}
	panel, err := adm.RegisterPanel(name, builder)
	if err != nil {
		t.Fatalf("register panel %s: %v", name, err)
	}
	return panel
}
