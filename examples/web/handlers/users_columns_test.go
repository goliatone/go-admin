package handlers

import "testing"

func TestUserDataGridColumnsAllowlist(t *testing.T) {
	cols := userDataGridColumns()
	if len(cols) == 0 {
		t.Fatalf("expected allowlisted columns")
	}
	expectedDefaults := map[string]bool{
		"email":             true,
		"username":          true,
		"first_name":        false,
		"last_name":         false,
		"role":              true,
		"status":            true,
		"phone_number":      false,
		"is_email_verified": false,
		"created_at":        true,
		"updated_at":        false,
		"last_login":        false,
	}
	seen := map[string]bool{}
	for _, col := range cols {
		field := col.Field
		if field == "" {
			t.Fatalf("expected field to be set: %v", col)
		}
		expectedDefault, ok := expectedDefaults[field]
		if !ok {
			t.Fatalf("unexpected allowlisted column %q", field)
		}
		if col.Default != expectedDefault {
			t.Fatalf("expected default %v for %q, got %v", expectedDefault, field, col.Default)
		}
		if seen[field] {
			t.Fatalf("duplicate field %q", field)
		}
		seen[field] = true
	}
	for field := range expectedDefaults {
		if !seen[field] {
			t.Fatalf("expected allowlisted column %q", field)
		}
	}
	if seen["password"] || seen["password_hash"] || seen["token"] {
		t.Fatalf("expected sensitive columns to be excluded: %v", cols)
	}
}
