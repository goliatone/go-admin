package admin

import (
	"reflect"
	"strings"
	"testing"
)

func TestNormalizeThemeProjectionPreservesLegacyPayloadAndSafeApprovedRoot(t *testing.T) {
	selection := normalizeThemeProjection(&ThemeSelection{
		Tokens: map[string]string{
			"primary":                "#123456",
			"admin.shell.background": "#f8fafc",
			"custom.safe":            "12px",
			"custom.unsafe":          "red;display:none",
		},
		CSSVars: map[string]string{
			"--primary":      "#123456",
			"--custom-safe":  "12px",
			"--host-safe":    "#ffffff",
			"--host-unsafe":  "blue;background:red",
			"not-a-variable": "#000000",
		},
	})

	if got := selection.CSSVars["--primary"]; got != "#123456" {
		t.Fatalf("legacy --primary payload changed: %q", got)
	}
	if got := selection.CSSVars["--custom-safe"]; got != "12px" {
		t.Fatalf("safe legacy custom variable missing: %q", got)
	}
	if _, ok := selection.CSSVars["--custom-unsafe"]; ok {
		t.Fatalf("unsafe token value was projected: %+v", selection.CSSVars)
	}
	if got := selection.CSSVars["--host-safe"]; got != "#ffffff" {
		t.Fatalf("safe explicit variable missing: %q", got)
	}
	if _, ok := selection.CSSVars["--host-unsafe"]; ok {
		t.Fatalf("unsafe explicit variable was projected: %+v", selection.CSSVars)
	}
	if strings.Contains(selection.RootCSSVarsInline, "custom") ||
		strings.Contains(selection.RootCSSVarsInline, "host-") {
		t.Fatalf("unsupported variables reached the admin root: %q", selection.RootCSSVarsInline)
	}
	for _, expected := range []string{
		"--admin-shell-background:#f8fafc;",
		"--color-action-primary:#123456;",
		"--color-primary:#123456;",
	} {
		if !strings.Contains(selection.RootCSSVarsInline, expected) {
			t.Fatalf("expected approved root declaration %q in %q", expected, selection.RootCSSVarsInline)
		}
	}
}

func TestNormalizeThemeProjectionKeepsSidebarBackgroundScoped(t *testing.T) {
	selection := normalizeThemeProjection(&ThemeSelection{
		Tokens: map[string]string{
			"admin.sidebar.background": "#1C1C1E",
		},
	})

	if got := selection.SemanticTokens["admin.sidebar.background"]; got != "#1C1C1E" {
		t.Fatalf("expected semantic sidebar background, got %q", got)
	}
	if !strings.Contains(selection.RootCSSVarsInline, "--admin-sidebar-background:#1C1C1E;") {
		t.Fatalf("expected scoped sidebar declaration, got %q", selection.RootCSSVarsInline)
	}
	if strings.Contains(selection.RootCSSVarsInline, "--color-surface-default:") {
		t.Fatalf("sidebar-only token must not define the global surface: %q", selection.RootCSSVarsInline)
	}
}

func TestNormalizeThemeProjectionIsDeterministicAndCanonicalWins(t *testing.T) {
	tokens := map[string]string{
		"primary":              "#111111",
		"color.action.primary": "#222222",
		"admin.sidebar.width":  "18rem",
		"sidebar-width":        "260px",
	}
	first := normalizeThemeProjection(&ThemeSelection{Tokens: tokens})
	for range 10 {
		next := normalizeThemeProjection(&ThemeSelection{Tokens: tokens})
		if first.RootCSSVarsInline != next.RootCSSVarsInline ||
			!reflect.DeepEqual(first.CSSVars, next.CSSVars) {
			t.Fatalf("projection is not deterministic:\n%s\n%s", first.RootCSSVarsInline, next.RootCSSVarsInline)
		}
	}
	if got := first.SemanticTokens["color.action.primary"]; got != "#222222" {
		t.Fatalf("canonical token did not win: %q", got)
	}
	if strings.Contains(first.RootCSSVarsInline, "--color-primary:#111111") ||
		strings.Contains(first.RootCSSVarsInline, "--sidebar-width:260px") {
		t.Fatalf("ignored aliases leaked into compatibility variables: %q", first.RootCSSVarsInline)
	}
}

func TestAdminSemanticProfileReturnsDefensiveCopies(t *testing.T) {
	first := AdminSemanticProfile()
	delete(first.Tokens, "admin.shell.background")
	first.Aliases["sidebar-width"] = "changed"

	second := AdminSemanticProfile()
	if _, ok := second.Tokens["admin.shell.background"]; !ok {
		t.Fatal("token profile was not defensively copied")
	}
	if second.Aliases["sidebar-width"] != "admin.sidebar.width" {
		t.Fatalf("alias profile was not defensively copied: %+v", second.Aliases)
	}
}

func TestAdminSemanticProfileIncludesDatagridPaginationContracts(t *testing.T) {
	profile := AdminSemanticProfile()
	for _, token := range []string{
		"datagrid.row.selected-text",
		"datagrid.pagination.control-background",
		"datagrid.pagination.control-border",
		"datagrid.pagination.control-text",
		"datagrid.pagination.page-text",
		"datagrid.pagination.active-background",
		"datagrid.pagination.active-border",
		"datagrid.pagination.active-text",
		"datagrid.pagination.active-shadow",
		"datagrid.pagination.hover-background",
		"datagrid.pagination.hover-border",
		"datagrid.pagination.hover-text",
		"datagrid.pagination.focus-background",
		"datagrid.pagination.focus-border",
		"datagrid.pagination.focus-text",
		"datagrid.pagination.disabled-background",
		"datagrid.pagination.disabled-border",
		"datagrid.pagination.disabled-text",
		"datagrid.pagination.disabled-opacity",
		"datagrid.pagination.radius",
		"datagrid.pagination.control-height",
		"datagrid.pagination.page-width",
		"datagrid.pagination.gap",
		"datagrid.pagination.padding-inline",
		"datagrid.pagination.font-size",
		"datagrid.pagination.line-height",
		"datagrid.pagination.font-weight",
		"datagrid.pagination.ellipsis-size",
	} {
		if _, ok := profile.Tokens[token]; !ok {
			t.Fatalf("pagination semantic token %q is missing", token)
		}
	}

	selection := normalizeThemeProjection(&ThemeSelection{Tokens: map[string]string{
		"datagrid.row.selected-text":            "#0a0a0a",
		"datagrid.pagination.active-background": "#ffffff",
		"datagrid.pagination.active-shadow":     "0 1px 2px rgba(0, 0, 0, 0.05)",
		"datagrid.pagination.hover-background":  "#f5f5f5",
		"datagrid.pagination.disabled-opacity":  "0.45",
		"datagrid.pagination.control-height":    "36px",
		"datagrid.pagination.font-weight":       "500",
	}})
	for _, declaration := range []string{
		"--datagrid-row-selected-text:#0a0a0a;",
		"--datagrid-pagination-active-background:#ffffff;",
		"--datagrid-pagination-active-shadow:0 1px 2px rgba(0, 0, 0, 0.05);",
		"--datagrid-pagination-hover-background:#f5f5f5;",
		"--datagrid-pagination-disabled-opacity:0.45;",
		"--datagrid-pagination-control-height:36px;",
		"--datagrid-pagination-font-weight:500;",
	} {
		if !strings.Contains(selection.RootCSSVarsInline, declaration) {
			t.Fatalf("pagination declaration %q missing from %q", declaration, selection.RootCSSVarsInline)
		}
	}
}

func TestAdminSemanticProfileIncludesPromotedComponentConsumers(t *testing.T) {
	profile := AdminSemanticProfile()
	tokens := map[string]string{
		"admin.modal.surface":          "#ffffff",
		"admin.modal.text":             "#111827",
		"admin.modal.border":           "#e5e7eb",
		"admin.modal.backdrop":         "rgba(15, 23, 42, 0.5)",
		"admin.modal.radius":           "12px",
		"admin.modal.shadow":           "0 20px 40px rgba(0, 0, 0, 0.2)",
		"admin.modal.padding-block":    "16px",
		"admin.modal.padding-inline":   "20px",
		"admin.modal.viewport-padding": "16px",
		"admin.modal.max-height":       "80vh",
		"admin.modal.width":            "48rem",
		"admin.action-menu.surface":    "#ffffff",
		"admin.action-menu.text":       "#374151",
		"admin.action-menu.border":     "#e5e7eb",
		"admin.status.surface":         "#f3f4f6",
		"admin.status.text":            "#374151",
		"admin.status.border":          "#d1d5db",
		"admin.filter.surface":         "#f9fafb",
		"admin.filter.text":            "#374151",
		"admin.filter.border":          "#e5e7eb",
		"admin.quick-filter.surface":   "#f3f4f6",
		"admin.quick-filter.text":      "#374151",
		"admin.quick-filter.ring":      "#3b82f6",
	}
	for token := range tokens {
		if _, ok := profile.Tokens[token]; !ok {
			t.Errorf("promoted component token %q is missing", token)
		}
	}

	selection := normalizeThemeProjection(&ThemeSelection{Tokens: tokens})
	statuses := map[string]string{}
	for _, diagnostic := range selection.Diagnostics {
		if diagnostic.Consumer == "go-admin/client" {
			statuses[diagnostic.Canonical] = diagnostic.Status
		}
	}
	for token, value := range tokens {
		declaration := semanticCSSVariable(token) + ":" + value + ";"
		if !strings.Contains(selection.RootCSSVarsInline, declaration) {
			t.Errorf("component declaration %q missing from %q", declaration, selection.RootCSSVarsInline)
		}
		if statuses[token] != "consumed" {
			t.Errorf("component token %q diagnostic = %q, want consumed", token, statuses[token])
		}
	}
}

func TestPromotedComponentFallbackChainsPreferScopedTokens(t *testing.T) {
	selection := normalizeThemeProjection(&ThemeSelection{Tokens: map[string]string{
		"admin.modal.surface":  "#ffffff",
		"color.surface.raised": "#f8fafc",
		"color.text.primary":   "#111827",
	}})
	statuses := map[string]string{}
	for _, diagnostic := range selection.Diagnostics {
		if diagnostic.Consumer == "go-admin/client" {
			statuses[diagnostic.Canonical] = diagnostic.Status
		}
	}
	if statuses["admin.modal.surface"] != "consumed" {
		t.Fatalf("scoped modal surface must win its fallback chain: %+v", statuses)
	}
	if statuses["color.text.primary"] != "consumed" {
		t.Fatalf("portable token without a scoped override must remain consumed: %+v", statuses)
	}
	found := false
	for _, chain := range adminSemanticConsumerChains {
		if reflect.DeepEqual(chain, []string{"admin.modal.surface", "color.surface.raised"}) {
			found = true
			break
		}
	}
	if !found {
		t.Fatal("modal surface must declare component-to-portable consumer precedence")
	}
}

func TestThemePayloadAddsSemanticSectionsWithoutReplacingLegacySections(t *testing.T) {
	selection := normalizeThemeProjection(&ThemeSelection{
		Name:    "brand",
		Variant: "dark",
		Tokens: map[string]string{
			"primary":             "#123456",
			"color.text.primary":  "#111827",
			"admin.header.border": "#e5e7eb",
		},
		CSSVars: map[string]string{"--primary": "#123456"},
	})
	payload := selection.Payload()
	if payload["tokens"]["primary"] != "#123456" ||
		payload["css_vars"]["--primary"] != "#123456" {
		t.Fatalf("legacy payload sections changed: %+v", payload)
	}
	if payload["semantic_tokens"]["color.text.primary"] != "#111827" {
		t.Fatalf("semantic token section missing: %+v", payload)
	}
	if payload["styles"]["root"] == "" {
		t.Fatalf("safe root style section missing: %+v", payload)
	}
}

func TestNormalizeThemeProjectionReportsAdminConsumptionAndUnusedTransport(t *testing.T) {
	selection := normalizeThemeProjection(&ThemeSelection{
		Tokens: map[string]string{
			"admin.shell.background":     "#f8fafc",
			"admin.sidebar.title-height": "42px",
			"datagrid.row.selected":      "#123456",
			"dashboard.card.background":  "#ffffff",
		},
	})

	statuses := map[string]ThemeTokenDiagnostic{}
	for _, diagnostic := range selection.Diagnostics {
		if diagnostic.Consumer == "go-admin/client" {
			statuses[diagnostic.Canonical] = diagnostic
		}
	}
	for _, token := range []string{"admin.shell.background", "datagrid.row.selected"} {
		if got := statuses[token]; got.Status != "consumed" {
			t.Fatalf("expected %s to be consumed by go-admin/client, got %+v", token, got)
		}
	}
	for _, token := range []string{"admin.sidebar.title-height", "dashboard.card.background"} {
		if got := statuses[token]; got.Status != "unused" {
			t.Fatalf("expected %s to remain transport-only for go-admin/client, got %+v", token, got)
		}
	}
}

func TestNormalizeThemeProjectionConsumptionFollowsRenderedFallbackChains(t *testing.T) {
	selection := normalizeThemeProjection(&ThemeSelection{
		Tokens: map[string]string{
			"admin.shell.background":             "#f8fafc",
			"color.surface.canvas":               "#ffffff",
			"admin.page.gap":                     "12px",
			"admin.sidebar.section-gap":          "18px",
			"space.stack":                        "24px",
			"admin.sidebar.padding-inline":       "10px",
			"admin.sidebar.padding-block":        "8px",
			"space.surface":                      "16px",
			"admin.sidebar.item-height":          "40px",
			"admin.sidebar.item-radius":          "5px",
			"size.control.height":                "36px",
			"form.control.radius":                "6px",
			"radius.control":                     "4px",
			"datagrid.pagination.radius":         "8px",
			"datagrid.pagination.control-height": "38px",
			"datagrid.pagination.font-size":      "14px",
			"datagrid.pagination.line-height":    "20px",
			"datagrid.pagination.font-weight":    "500",
			"admin.sidebar.title-height":         "42px",
			"dashboard.card.background":          "#ffffff",
		},
	})

	statuses := map[string]ThemeTokenDiagnostic{}
	for _, diagnostic := range selection.Diagnostics {
		if diagnostic.Consumer == "go-admin/client" {
			statuses[diagnostic.Canonical] = diagnostic
		}
	}
	for _, token := range []string{
		"admin.shell.background",
		"admin.page.gap",
		"admin.sidebar.section-gap",
		"admin.sidebar.padding-inline",
		"admin.sidebar.padding-block",
		"admin.sidebar.item-height",
		"admin.sidebar.item-radius",
		"form.control.radius",
		"space.surface",
	} {
		if got := statuses[token]; got.Status != "consumed" {
			t.Fatalf("expected selected component token %s to be consumed, got %+v", token, got)
		}
	}
	for _, token := range []string{
		"color.surface.canvas",
		"space.stack",
		"size.control.height",
		"radius.control",
		"admin.sidebar.title-height",
		"dashboard.card.background",
	} {
		if got := statuses[token]; got.Status != "unused" {
			t.Fatalf("expected shadowed or transport-only token %s to be unused, got %+v", token, got)
		}
	}

	fallbackOnly := normalizeThemeProjection(&ThemeSelection{
		Tokens: map[string]string{
			"color.surface.canvas": "#f8fafc",
			"space.stack":          "24px",
			"space.surface":        "16px",
			"size.control.height":  "36px",
			"radius.control":       "4px",
		},
	})
	fallbackStatuses := map[string]ThemeTokenDiagnostic{}
	for _, diagnostic := range fallbackOnly.Diagnostics {
		if diagnostic.Consumer == "go-admin/client" {
			fallbackStatuses[diagnostic.Canonical] = diagnostic
		}
	}
	for _, token := range []string{
		"color.surface.canvas",
		"space.stack",
		"space.surface",
		"size.control.height",
		"radius.control",
	} {
		if got := fallbackStatuses[token]; got.Status != "consumed" {
			t.Fatalf("expected portable fallback %s to be consumed, got %+v", token, got)
		}
	}
}
