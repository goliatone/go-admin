package admin

import (
	"context"
	"testing"
)

func TestRegisterModuleRejectsDuplicates(t *testing.T) {
	adm := New(Config{DefaultLocale: "en"})

	if err := adm.RegisterModule(&stubModule{id: "mod"}); err != nil {
		t.Fatalf("register module failed: %v", err)
	}
	if err := adm.RegisterModule(&stubModule{id: "mod"}); err == nil {
		t.Fatalf("expected duplicate module registration to fail")
	}
}

func TestLoadModulesRunsInOrderOnce(t *testing.T) {
	adm := New(Config{DefaultLocale: "en"})
	seq := []string{}

	m1 := &stubModule{id: "one", onRegister: func() { seq = append(seq, "one") }}
	m2 := &stubModule{id: "two", onRegister: func() { seq = append(seq, "two") }}

	if err := adm.RegisterModule(m1); err != nil {
		t.Fatalf("register module failed: %v", err)
	}
	if err := adm.RegisterModule(m2); err != nil {
		t.Fatalf("register module failed: %v", err)
	}

	if err := adm.loadModules(context.Background()); err != nil {
		t.Fatalf("load modules failed: %v", err)
	}
	if err := adm.loadModules(context.Background()); err != nil { // second call should no-op
		t.Fatalf("load modules second pass failed: %v", err)
	}

	expected := []string{"one", "two"}
	if len(seq) != len(expected) {
		t.Fatalf("expected sequence %v, got %v", expected, seq)
	}
	for i := range expected {
		if seq[i] != expected[i] {
			t.Fatalf("expected sequence %v, got %v", expected, seq)
		}
	}
}

func TestModuleMenuItemsRespectPermissions(t *testing.T) {
	adm := New(Config{DefaultLocale: "en"})
	menu := []MenuItem{{Label: "Secret", Permissions: []string{"nav.secret"}, Locale: "en"}}

	mod := &menuModule{id: "nav", menu: menu}
	if err := adm.RegisterModule(mod); err != nil {
		t.Fatalf("register module failed: %v", err)
	}
	adm.WithAuthorizer(denyAuthorizer{})

	if err := adm.loadModules(context.Background()); err != nil {
		t.Fatalf("load modules failed: %v", err)
	}

	items := adm.nav.Resolve(context.Background(), "en")
	if len(items) != 0 {
		t.Fatalf("expected navigation to be empty when permissions denied, got %v", items)
	}
}

func TestModuleMenuItemsAppearInNavigation(t *testing.T) {
	adm := New(Config{DefaultLocale: "en"})
	menu := []MenuItem{{Label: "Users", Icon: "users", Locale: "en"}}
	mod := &menuModule{id: "nav", menu: menu}

	if err := adm.RegisterModule(mod); err != nil {
		t.Fatalf("register module failed: %v", err)
	}
	adm.WithAuthorizer(allowAuthorizer{})

	if err := adm.loadModules(context.Background()); err != nil {
		t.Fatalf("load modules failed: %v", err)
	}

	items := adm.nav.Resolve(context.Background(), "en")
	if len(items) != 1 {
		t.Fatalf("expected 1 navigation item, got %d", len(items))
	}
	if items[0].Label != "Users" {
		t.Fatalf("expected label Users, got %s", items[0].Label)
	}
}

type stubModule struct {
	id         string
	onRegister func()
}

func (m *stubModule) Manifest() ModuleManifest {
	return ModuleManifest{ID: m.id}
}

func (m *stubModule) Register(_ ModuleContext) error {
	if m.onRegister != nil {
		m.onRegister()
	}
	return nil
}

type menuModule struct {
	id   string
	menu []MenuItem
}

func (m *menuModule) Manifest() ModuleManifest {
	return ModuleManifest{ID: m.id}
}

func (m *menuModule) Register(_ ModuleContext) error { return nil }

func (m *menuModule) MenuItems(locale string) []MenuItem {
	items := []MenuItem{}
	for _, item := range m.menu {
		item.Locale = locale
		items = append(items, item)
	}
	return items
}

type denyAuthorizer struct{}

func (denyAuthorizer) Can(ctx context.Context, action string, resource string) bool {
	_ = ctx
	_ = resource
	return action != "nav.secret"
}

type allowAuthorizer struct{}

func (allowAuthorizer) Can(ctx context.Context, action string, resource string) bool {
	_ = ctx
	_ = action
	_ = resource
	return true
}
