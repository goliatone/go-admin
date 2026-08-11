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
		".admin-shell-content {\n    background-color:",
		".admin-shell-footer {\n    background-color:",
		".admin-breadcrumbs {\n    color:",
		".admin-page-header__actions:empty {\n    display: none;",
		".admin-page-content {\n    display: flex;\n    flex-direction: column;",
		".admin-page-content > .formgen-form {\n    width: 100%;",
		`var(--admin-shell-background, var(--color-surface-canvas, #f9fafb))`,
		`var(--admin-header-background, var(--color-surface-default, #ffffff))`,
		`var(--admin-sidebar-item-hover, var(--color-surface-subtle, #3f3f46))`,
		`var(--admin-sidebar-footer-height, var(--sidebar-footer-height, auto))`,
		`var(--admin-sidebar-item-content-gap, var(--sidebar-item-content-gap, 0.75rem))`,
		`var(--admin-sidebar-item-radius, var(--sidebar-item-radius, 0.5rem))`,
		`var(--admin-sidebar-item-stack-gap, var(--sidebar-item-stack-gap, 0))`,
		`var(--admin-sidebar-nested-indent, var(--sidebar-nested-indent, 2rem))`,
		`var(--admin-sidebar-nested-item-block-inset, 0px)`,
		`var(--admin-sidebar-nested-item-inset, 0px)`,
		`var(--admin-sidebar-nested-item-padding-inline-start, var(--admin-sidebar-padding-inline, var(--sidebar-padding-x, var(--space-surface, 12px))))`,
		`var(--admin-sidebar-utility-padding-block-start, var(--admin-sidebar-padding-inline, var(--sidebar-padding-x, var(--space-surface, 12px))))`,
		`var(--admin-sidebar-user-avatar-size, var(--sidebar-user-avatar-size, 36px))`,
		`var(--admin-sidebar-user-content-gap, var(--admin-sidebar-item-content-gap, var(--sidebar-item-content-gap, 0.5rem)))`,
		`var(--admin-sidebar-user-name-font-size, 0.75rem)`,
		`var(--form-control-background, var(--color-surface-default, #ffffff))`,
		`var(--form-control-border, var(--color-border-default, #d1d5db))`,
		`var(--datagrid-header-background, var(--color-surface-subtle, #f9fafb))`,
		`var(--datagrid-row-hover, var(--color-surface-subtle, #f9fafb))`,
		`var(--datagrid-row-selected, var(--color-action-primary, #2563eb))`,
		`var(--datagrid-row-selected-text, var(--color-text-inverse, #ffffff))`,
		`var(--datagrid-border, var(--color-border-default, #e5e7eb))`,
		`var(--datagrid-empty-text, var(--color-text-secondary, #6b7280))`,
		`var(--datagrid-pagination-text, var(--color-text-secondary, #6b7280))`,
		`var(--datagrid-pagination-control-background, var(--color-surface-default, #ffffff))`,
		`var(--datagrid-pagination-active-background, var(--datagrid-row-selected, var(--color-action-primary, #e5e7eb)))`,
		`var(--datagrid-pagination-active-text, var(--color-text-inverse, #1f2937))`,
		`var(--datagrid-pagination-active-shadow, none)`,
		`var(--datagrid-pagination-hover-background, var(--color-surface-subtle, #f3f4f6))`,
		`var(--datagrid-pagination-focus-border, var(--color-focus-ring, #3b82f6))`,
		`var(--datagrid-pagination-disabled-background, var(--datagrid-pagination-control-background, var(--color-surface-default, #ffffff)))`,
		`var(--datagrid-pagination-disabled-opacity, 0.5)`,
		`var(--datagrid-pagination-control-height, var(--size-control-height, 38px))`,
		`var(--datagrid-pagination-page-width, 38px)`,
		`.admin-select .admin-select__field {`,
		`appearance: none;`,
		`.admin-select__decoration {`,
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

func TestSemanticPaginationStatesAreScopedAndDoNotOverrideCurrentPage(t *testing.T) {
	content, err := os.ReadFile("assets/input.css")
	if err != nil {
		t.Fatalf("read semantic style source: %v", err)
	}
	css := string(content)
	for _, fragment := range []string{
		`.admin-datagrid__pagination--presented .admin-datagrid__page-button:not([aria-current="page"]):not(:disabled):hover`,
		`.admin-datagrid__pagination--presented .admin-datagrid__page-button:not([aria-current="page"]):not(:disabled):focus-visible`,
		`.admin-datagrid__pagination--presented .admin-datagrid__page-button:disabled`,
		`pointer-events: none;`,
	} {
		if !strings.Contains(css, fragment) {
			t.Fatalf("owned pagination state selector missing %q", fragment)
		}
	}
	if strings.Contains(css, `.admin-datagrid__pagination .admin-datagrid__page-button:hover`) ||
		strings.Contains(css, `.admin-datagrid__pagination .admin-datagrid__page-button:focus-visible`) {
		t.Fatal("semantic pagination must not use ungated interaction selectors")
	}
}

func TestDatagridPaginationUsesNormalizedFigmaEllipsisAsset(t *testing.T) {
	content, err := os.ReadFile("assets/src/datatable/assets/pagination-ellipsis.svg")
	if err != nil {
		t.Fatalf("read pagination ellipsis asset: %v", err)
	}
	svg := string(content)
	for _, fragment := range []string{
		`viewBox="0 0 16 16"`,
		`transform="translate(2.16665 6.83333)"`,
		`M7 1.16667C7 1.811`,
		`M11.6667 1.16667C11.6667 1.811`,
		`M2.33333 1.16667C2.33333 1.811`,
		`fill="currentColor"`,
	} {
		if !strings.Contains(svg, fragment) {
			t.Fatalf("normalized pagination ellipsis missing %q", fragment)
		}
	}
}

func TestPublicSelectPrimitiveIsSafelistedForHostTemplates(t *testing.T) {
	content, err := os.ReadFile("assets/tailwind.config.cjs")
	if err != nil {
		t.Fatalf("read Tailwind config: %v", err)
	}
	config := string(content)
	for _, className := range []string{"admin-select", "admin-select__field", "admin-select__decoration"} {
		if !strings.Contains(config, `'`+className+`'`) {
			t.Fatalf("public select class %q is not safelisted", className)
		}
	}
}

func TestSharedAdminTemplatesOptIntoSemanticPrimitiveClasses(t *testing.T) {
	checks := map[string][]string{
		"layout.html": {
			`class="admin-theme-root`,
			`data-admin-shell`,
			`data-admin-shell-main`,
			`data-admin-page-header`,
			`data-admin-page-actions`,
			`data-admin-shell-content`,
		},
		"partials/breadcrumbs.html": {
			`data-admin-breadcrumbs`,
			`admin-breadcrumbs__list`,
			`admin-breadcrumbs__link`,
			`admin-breadcrumbs__current`,
		},
		"partials/admin-footer.html": {
			`data-admin-shell-footer`,
		},
		"login-layout.html": {
			`class="admin-theme-root`,
		},
		"partials/sidebar.html": {
			`var(--admin-sidebar-padding-inline, var(--sidebar-padding-x, var(--space-surface, 12px)))`,
			`var(--admin-sidebar-item-height, var(--sidebar-item-height, var(--size-control-height, 36px)))`,
			`var(--admin-sidebar-section-gap, var(--sidebar-gap-sections, var(--space-stack, 24px)))`,
			`data-collapse-placement=`,
			`sidebar-collapse-action`,
			`sidebar-nested-item`,
			`sidebar-user-avatar`,
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
			`{% block page_title %}`,
			`{% block page_header_actions %}`,
			`class="admin-page-content`,
		},
		"resources/users/list.html": {
			`class="admin-page-content`,
			`data-datagrid-toolbar`,
			`data-datagrid-filter-panel`,
			`data-datagrid-surface`,
			`data-datagrid-pagination`,
		},
		"resources/user-profiles/list.html": {
			`class="admin-page-content`,
			`data-datagrid-toolbar`,
			`data-datagrid-filter-panel`,
			`data-datagrid-surface`,
			`data-datagrid-pagination`,
		},
		"resources/tenants/list.html": {
			`class="admin-page-content`,
			`data-datagrid-toolbar`,
			`data-datagrid-filter-panel`,
			`data-datagrid-surface`,
			`data-datagrid-pagination`,
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

func TestDashboardWidgetStylesUseSemanticThemeContract(t *testing.T) {
	source, err := os.ReadFile("assets/src/styles/widgets.css")
	if err != nil {
		t.Fatalf("read dashboard widget style source: %v", err)
	}
	dist, err := os.ReadFile("assets/dist/styles/widgets.css")
	if err != nil {
		t.Fatalf("read generated dashboard widget styles: %v", err)
	}
	if string(source) != string(dist) {
		t.Fatal("generated dashboard widget styles are stale; run npm run build:css:widgets")
	}
	for _, fragment := range []string{
		`var(--dashboard-card-background, var(--color-surface-raised, white))`,
		`var(--dashboard-card-border, var(--color-border-default, #e5e7eb))`,
		`var(--dashboard-card-radius, var(--radius-surface, 0.75rem))`,
		`var(--dashboard-card-shadow, var(--shadow-surface, none))`,
		`var(--dashboard-metric-value, var(--color-text-primary, inherit))`,
		`var(--dashboard-metric-trend-negative, var(--color-status-danger, currentColor))`,
		`var(--color-focus-ring, currentColor)`,
		`var(--motion-duration-normal, 200ms)`,
	} {
		if !strings.Contains(string(source), fragment) {
			t.Fatalf("dashboard widget semantic fallback missing %q", fragment)
		}
	}
}
