package primitives

import "testing"

func TestNormalizeSQLIdentifier(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name  string
		value string
		ok    bool
	}{
		{name: "simple", value: "documents", ok: true},
		{name: "trim and lower", value: "  Document_ID  ", ok: true},
		{name: "reject blank", value: " ", ok: false},
		{name: "reject dash", value: "drop-table", ok: false},
		{name: "reject quoted", value: `"users"`, ok: false},
		{name: "reject starts with digit", value: "1table", ok: false},
	}

	for _, tt := range tests {
		tt := tt
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			got, err := NormalizeSQLIdentifier(tt.value)
			if tt.ok && err != nil {
				t.Fatalf("NormalizeSQLIdentifier(%q) returned error: %v", tt.value, err)
			}
			if !tt.ok && err == nil {
				t.Fatalf("NormalizeSQLIdentifier(%q) expected error, got %q", tt.value, got)
			}
		})
	}
}
