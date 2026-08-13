package client

import (
	"encoding/json"
	"strings"
	"testing"

	pongo2 "github.com/flosch/pongo2/v6"
)

func TestListTemplateRendersResolvedPanelCapabilityMatrix(t *testing.T) {
	set := pongo2.NewSet("panel-list-capabilities", templateFSLoader{fsys: Templates()})
	template, err := set.FromFile("resources/shared/list-base.html")
	if err != nil {
		t.Fatalf("parse list template: %v", err)
	}
	tests := []struct {
		name                    string
		selection, bulk, export bool
	}{
		{name: "none"},
		{name: "bulk-only", selection: true, bulk: true},
		{name: "export-only", selection: true, export: true},
		{name: "both", selection: true, bulk: true, export: true},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			output, executeErr := template.Execute(pongo2.Context{
				"adminURL":    func(path string) string { return "/admin/" + path },
				"singularize": func(value string) string { return value },
				"toJSON": func(value any) string {
					encoded, marshalErr := json.Marshal(value)
					if marshalErr != nil {
						t.Fatalf("marshal template value: %v", marshalErr)
					}
					return string(encoded)
				},
				"resource":              "items",
				"resource_label":        "Items",
				"render_datagrid_shell": true,
				"routes":                map[string]string{},
				"columns":               []map[string]any{{"field": "title", "label": "Title"}},
				"list_capabilities": map[string]bool{
					"selection": tc.selection,
					"bulk":      tc.bulk,
					"export":    tc.export,
				},
			})
			if executeErr != nil {
				t.Fatalf("render list template: %v", executeErr)
			}

			assertPresence := func(fragment string, want bool) {
				t.Helper()
				if got := strings.Contains(output, fragment); got != want {
					t.Fatalf("presence of %s = %t, want %t", fragment, got, want)
				}
			}
			assertPresence(`id="table-checkbox-all"`, tc.selection)
			assertPresence(`id="bulk-actions-overlay"`, tc.bulk)
			assertPresence(`id="export-btn"`, tc.export)
			assertPresence(`id="export-menu"`, tc.export)
			if !strings.Contains(output, `data-role="actions"`) {
				t.Fatal("expected the structural actions column to remain rendered")
			}
		})
	}
}
