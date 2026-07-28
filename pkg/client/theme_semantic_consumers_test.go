package client

import (
	"os"
	"strings"
	"testing"
)

func TestSemanticAdminStylesUseComponentPortableAndCurrentFallbacks(t *testing.T) {
	content, err := os.ReadFile("assets/input.css")
	if err != nil {
		t.Fatalf("read semantic style source: %v", err)
	}
	css := string(content)
	required := []string{
		`var(--admin-shell-background, var(--color-surface-canvas, #f9fafb))`,
		`var(--admin-header-background, var(--color-surface-default, #ffffff))`,
		`var(--admin-sidebar-item-hover, var(--color-surface-subtle, #3f3f46))`,
		`var(--admin-sidebar-footer-height, var(--sidebar-footer-height, auto))`,
		`var(--form-control-background, var(--color-surface-default, #ffffff))`,
		`var(--form-control-border, var(--color-border-default, #d1d5db))`,
		`var(--datagrid-header-background, var(--color-surface-subtle, #f9fafb))`,
		`var(--datagrid-row-hover, var(--color-surface-subtle, #f9fafb))`,
		`var(--datagrid-row-selected, var(--color-action-primary, #2563eb))`,
		`var(--datagrid-border, var(--color-border-default, #e5e7eb))`,
		`var(--datagrid-empty-text, var(--color-text-secondary, #6b7280))`,
		`var(--datagrid-pagination-text, var(--color-text-secondary, #6b7280))`,
		`var(--color-focus-ring, #3b82f6)`,
		`var(--color-action-primary-hover, #3f3f46)`,
		`var(--color-text-secondary, #6b7280)`,
	}
	for _, fragment := range required {
		if !strings.Contains(css, fragment) {
			t.Fatalf("semantic consumer fallback missing %q", fragment)
		}
	}
	if strings.Contains(css, `--admin-sidebar-title-height`) {
		t.Fatal("sidebar title token must remain unconsumed until a reusable title slot exists")
	}
}

func TestSharedAdminTemplatesOptIntoSemanticPrimitiveClasses(t *testing.T) {
	checks := map[string][]string{
		"layout.html": {
			`class="admin-theme-root`,
		},
		"login-layout.html": {
			`class="admin-theme-root`,
		},
		"partials/sidebar.html": {
			`var(--admin-sidebar-padding-inline, var(--sidebar-padding-x, var(--space-surface, 12px)))`,
			`var(--admin-sidebar-item-height, var(--sidebar-item-height, var(--size-control-height, 36px)))`,
			`var(--admin-sidebar-section-gap, var(--sidebar-gap-sections, var(--space-stack, 24px)))`,
		},
		"resources/shared/list-base.html": {
			`class="admin-page-content`,
			`class="admin-surface-card`,
			`class="admin-empty-state`,
			`class="admin-datagrid `,
			`class="admin-datagrid__table`,
			`class="admin-datagrid__header`,
			`class="admin-datagrid__body`,
			`class="admin-surface-card admin-pagination admin-datagrid__pagination`,
		},
		"resources/shared/detail-base.html": {
			`class="admin-page-content`,
			`class="admin-surface-card`,
		},
		"resources/content/form.html": {
			`class="admin-page-header`,
			`class="admin-page-content`,
		},
	}
	for name, fragments := range checks {
		template := mustReadClientTemplate(t, name)
		for _, fragment := range fragments {
			if !strings.Contains(template, fragment) {
				t.Fatalf("%s missing semantic primitive class %q", name, fragment)
			}
		}
	}
}

func TestDataGridActionStylesUseSemanticFallbacks(t *testing.T) {
	content, err := os.ReadFile("assets/src/datatable/actions.css")
	if err != nil {
		t.Fatalf("read DataGrid action styles: %v", err)
	}
	css := string(content)
	required := []string{
		`var(--datagrid-row-hover, var(--color-surface-subtle,`,
		`var(--datagrid-border, var(--color-border-default,`,
		`var(--color-focus-ring,`,
		`var(--color-text-primary,`,
		`var(--color-text-secondary,`,
		`var(--color-status-danger,`,
	}
	for _, fragment := range required {
		if !strings.Contains(css, fragment) {
			t.Fatalf("DataGrid action semantic fallback missing %q", fragment)
		}
	}
}
