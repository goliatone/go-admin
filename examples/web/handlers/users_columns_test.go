package handlers

import "testing"

func TestUserDataGridColumnsAllowlist(t *testing.T) {
	cols := userDataGridColumns()
	if len(cols) == 0 {
		t.Fatalf("expected allowlisted columns")
	}
	seen := map[string]bool{}
	for _, col := range cols {
		field, _ := col["field"].(string)
		if field == "" {
			t.Fatalf("expected field to be set: %v", col)
		}
		if seen[field] {
			t.Fatalf("duplicate field %q", field)
		}
		seen[field] = true
	}
	if seen["password"] || seen["password_hash"] || seen["token"] {
		t.Fatalf("expected sensitive columns to be excluded: %v", cols)
	}
}
