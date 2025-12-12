package admin

import (
	"errors"
	"testing"
)

func TestNewValidatesUserAndRoleRepositories(t *testing.T) {
	store := NewInMemoryUserStore()
	_, err := New(Config{}, Dependencies{
		UserRepository: &inMemoryUserRepoAdapter{store: store},
	})
	if err == nil {
		t.Fatalf("expected error")
	}
	var depErr InvalidDependenciesError
	if !errors.As(err, &depErr) {
		t.Fatalf("expected InvalidDependenciesError, got %T", err)
	}

	_, err = New(Config{}, Dependencies{
		UserRepository: &inMemoryUserRepoAdapter{store: store},
		RoleRepository: &inMemoryRoleRepoAdapter{store: store},
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
}

func TestNewAppliesDependencyDefaults(t *testing.T) {
	adm, err := New(Config{}, Dependencies{})
	if err != nil {
		t.Fatalf("admin.New: %v", err)
	}
	if adm.registry == nil {
		t.Fatalf("expected registry default")
	}
	if adm.cms == nil || adm.widgetSvc == nil || adm.menuSvc == nil || adm.contentSvc == nil {
		t.Fatalf("expected CMS defaults")
	}
	if adm.preferences == nil || adm.profile == nil || adm.users == nil || adm.tenants == nil || adm.organizations == nil {
		t.Fatalf("expected service defaults")
	}
	if adm.activity == nil {
		t.Fatalf("expected activity sink default")
	}
	if adm.translator == nil || adm.translator.Translate("key", "en") != "key" {
		t.Fatalf("expected noop translator default")
	}
}

