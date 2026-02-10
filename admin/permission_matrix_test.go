package admin

import "testing"

func TestPermissionMatrixDefaultsIncludeTranslationExchangePermissions(t *testing.T) {
	if !containsPermissionMatrixString(defaultAdminResources, "admin.translations") {
		t.Fatalf("expected admin.translations in default resources")
	}
	requiredActions := []string{
		"claim",
		"assign",
		"approve",
		"manage",
		"export",
		"import.validate",
		"import.apply",
		"import.view",
	}
	for _, action := range requiredActions {
		if !containsPermissionMatrixString(defaultActions, action) {
			t.Fatalf("expected %q action in default permission matrix actions", action)
		}
	}
}

func TestPermissionMatrixDefaultsIncludeESignPermissions(t *testing.T) {
	if !containsPermissionMatrixString(defaultAdminResources, "admin.esign") {
		t.Fatalf("expected admin.esign in default resources")
	}
	requiredActions := []string{
		"send",
		"void",
		"download",
		"settings",
	}
	for _, action := range requiredActions {
		if !containsPermissionMatrixString(defaultActions, action) {
			t.Fatalf("expected %q action in default permission matrix actions", action)
		}
	}
}

func containsPermissionMatrixString(values []string, target string) bool {
	for _, value := range values {
		if value == target {
			return true
		}
	}
	return false
}
