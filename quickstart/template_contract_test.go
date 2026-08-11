package quickstart

import (
	"io/fs"
	"strings"
	"testing"

	"github.com/goliatone/go-admin/pkg/client"
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
			path: "resources/roles/list.html",
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
			path: "resources/content/list.html",
			required: []string{
				"const dataGridConfig =",
				"dataGridConfig.table_id",
				"dataGridConfig.api_endpoint",
				"dataGridConfig.action_base",
				"dataGridConfig.column_storage_key",
				"pagination: dataGridConfig.pagination || undefined",
			},
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			raw, err := fs.ReadFile(client.Templates(), tc.path)
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

func TestSharedListTemplateCanRenderDataGridShellWithoutPrefetchedItems(t *testing.T) {
	path := "resources/shared/list-base.html"
	raw, err := fs.ReadFile(client.Templates(), path)
	if err != nil {
		t.Fatalf("read template: %v", err)
	}
	content := string(raw)
	if !strings.Contains(content, "{% if items or render_datagrid_shell %}") {
		t.Fatalf("expected shared list template to render shell when render_datagrid_shell is true")
	}
	if !strings.Contains(content, `<table id="{{ datatable_id|default:resource }}-datatable"`) {
		t.Fatalf("expected shared list template to keep the DataGrid table shell")
	}
}

func TestRolesListTemplateNoopsWhenDataTableIsMissing(t *testing.T) {
	rolesPath := "resources/roles/list.html"
	raw, err := fs.ReadFile(client.Templates(), rolesPath)
	if err != nil {
		t.Fatalf("read roles template: %v", err)
	}
	rolesTemplate := string(raw)
	required := []string{
		"const tableEl = document.getElementById(tableId);",
		"if (!tableEl) {\n    return;\n  }",
	}
	for _, fragment := range required {
		if !strings.Contains(rolesTemplate, fragment) {
			t.Fatalf("expected roles list template to contain no-table guard fragment %q", fragment)
		}
	}

	sharedPath := "resources/shared/list-base.html"
	raw, err = fs.ReadFile(client.Templates(), sharedPath)
	if err != nil {
		t.Fatalf("read shared template: %v", err)
	}
	sharedTemplate := string(raw)
	if !strings.Contains(sharedTemplate, "{% if items or render_datagrid_shell %}") {
		t.Fatalf("expected shared list template to omit table shell for empty-state pages")
	}
}
