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

func TestParsePermissionsMapParsesBracketedSliceString(t *testing.T) {
	perms := parsePermissionsMap(`[admin.users.view admin.roles.edit admin.translations.manage]`)
	if !perms["admin.users.view"] {
		t.Fatalf("expected admin.users.view parsed from bracketed slice string")
	}
	if !perms["admin.roles.edit"] {
		t.Fatalf("expected admin.roles.edit parsed from bracketed slice string")
	}
	if !perms["admin.translations.manage"] {
		t.Fatalf("expected admin.translations.manage parsed from bracketed slice string")
	}
}

func TestParsePermissionsMapParsesJSONArrayString(t *testing.T) {
	perms := parsePermissionsMap(`["admin.users.view","admin.debug.repl.exec"]`)
	if !perms["admin.users.view"] {
		t.Fatalf("expected admin.users.view parsed from json array string")
	}
	if !perms["admin.debug.repl.exec"] {
		t.Fatalf("expected admin.debug.repl.exec parsed from json array string")
	}
}

func TestPermissionsValueFromDefaultNormalizesBracketedString(t *testing.T) {
	got := permissionsValueFromDefault(`[admin.users.view admin.translations.import.apply]`)
	want := "admin.users.view\nadmin.translations.import.apply"
	if got != want {
		t.Fatalf("expected normalized permissions string %q, got %q", want, got)
	}
}

func TestMergePermissionOptionsMergesDedupesAndSorts(t *testing.T) {
	got := mergePermissionOptions(
		[]string{" admin.roles.view ", "admin.debug.repl", "admin.roles.view"},
		[]string{"admin.translations.manage"},
		[]string{"", "admin.debug.repl.exec"},
	)
	want := []string{
		"admin.debug.repl",
		"admin.debug.repl.exec",
		"admin.roles.view",
		"admin.translations.manage",
	}
	if len(got) != len(want) {
		t.Fatalf("expected %d options, got %d (%v)", len(want), len(got), got)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("expected option[%d]=%q, got %q (all=%v)", i, want[i], got[i], got)
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
