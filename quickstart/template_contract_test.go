package quickstart

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestPanelListTemplatesUseDataGridConfigContract(t *testing.T) {
	tests := []struct {
		name      string
		path      string
		required  []string
		forbidden []string
	}{
		{
			name: "roles",
			path: filepath.Join("..", "pkg", "client", "templates", "resources", "roles", "list.html"),
			required: []string{
				"const dataGridConfig =",
				"dataGridConfig.table_id",
				"dataGridConfig.api_endpoint",
				"dataGridConfig.action_base",
				"dataGridConfig.column_storage_key",
			},
			forbidden: []string{
				"const tableId = 'roles-datatable';",
			},
		},
		{
			name: "content",
			path: filepath.Join("..", "pkg", "client", "templates", "resources", "content", "list.html"),
			required: []string{
				"const dataGridConfig =",
				"dataGridConfig.table_id",
				"dataGridConfig.api_endpoint",
				"dataGridConfig.action_base",
				"dataGridConfig.column_storage_key",
			},
		},
	}

	for _, tc := range tests {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			raw, err := os.ReadFile(tc.path)
			if err != nil {
				t.Fatalf("read template: %v", err)
			}
			content := string(raw)
			for _, expected := range tc.required {
				if !strings.Contains(content, expected) {
					t.Fatalf("expected template %s to contain %q", tc.path, expected)
				}
			}
			for _, forbidden := range tc.forbidden {
				if strings.Contains(content, forbidden) {
					t.Fatalf("expected template %s to avoid %q", tc.path, forbidden)
				}
			}
		})
	}
}
