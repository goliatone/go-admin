package navigationutil

import "testing"

func TestNormalizeMenuSlug(t *testing.T) {
	tests := map[string]string{
		"":                  "",
		" Admin Main ":      "admin-main",
		"admin.main":        "admin.main",
		"admin__main":       "admin__main",
		"multiple   spaces": "multiple-spaces",
		"Español menu":      "español-menu",
	}
	for input, want := range tests {
		if got := NormalizeMenuSlug(input); got != want {
			t.Fatalf("NormalizeMenuSlug(%q) = %q, want %q", input, got, want)
		}
	}
}

func TestMenuUUIDFromSlug(t *testing.T) {
	if got := MenuUUIDFromSlug(" Admin Main "); got != "admin-main" {
		t.Fatalf("MenuUUIDFromSlug mismatch: %q", got)
	}
}

func TestCanonicalMenuItemPath(t *testing.T) {
	if got := CanonicalMenuItemPath("admin.main", "dashboard"); got != "admin_main.dashboard" {
		t.Fatalf("CanonicalMenuItemPath mismatch: %q", got)
	}
	if got := CanonicalMenuItemPath("admin.main", "admin_main.dashboard"); got != "admin_main.dashboard" {
		t.Fatalf("CanonicalMenuItemPath prefixed mismatch: %q", got)
	}
	if got := CanonicalMenuItemPath("admin.main", " "); got != "" {
		t.Fatalf("CanonicalMenuItemPath blank mismatch: %q", got)
	}
}
