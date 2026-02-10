package quickstart

import "testing"

func TestRegisterTranslationExchangePermissions(t *testing.T) {
	got := []PermissionDefinition{}
	err := RegisterTranslationExchangePermissions(func(def PermissionDefinition) error {
		got = append(got, def)
		return nil
	})
	if err != nil {
		t.Fatalf("register permissions: %v", err)
	}
	if len(got) != len(TranslationExchangePermissions()) {
		t.Fatalf("expected %d permissions, got %d", len(TranslationExchangePermissions()), len(got))
	}
}

func TestRegisterTranslationExchangePermissionsRequiresRegistrar(t *testing.T) {
	err := RegisterTranslationExchangePermissions(nil)
	if err == nil {
		t.Fatalf("expected error when register function is nil")
	}
	if err.Error() != "permission registry required" {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestRegisterTranslationQueuePermissions(t *testing.T) {
	got := []PermissionDefinition{}
	err := RegisterTranslationQueuePermissions(func(def PermissionDefinition) error {
		got = append(got, def)
		return nil
	})
	if err != nil {
		t.Fatalf("register queue permissions: %v", err)
	}
	if len(got) != len(TranslationQueuePermissions()) {
		t.Fatalf("expected %d permissions, got %d", len(TranslationQueuePermissions()), len(got))
	}
}

func TestRegisterTranslationQueuePermissionsRequiresRegistrar(t *testing.T) {
	err := RegisterTranslationQueuePermissions(nil)
	if err == nil {
		t.Fatalf("expected error when register function is nil")
	}
	if err.Error() != "permission registry required" {
		t.Fatalf("unexpected error: %v", err)
	}
}
