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
			"admin.shell.background":       "#f8fafc",
			"color.surface.canvas":         "#ffffff",
			"admin.page.gap":               "12px",
			"admin.sidebar.section-gap":    "18px",
			"space.stack":                  "24px",
			"admin.sidebar.padding-inline": "10px",
			"admin.sidebar.padding-block":  "8px",
			"space.surface":                "16px",
			"admin.sidebar.item-height":    "40px",
			"size.control.height":          "36px",
			"form.control.radius":          "6px",
			"radius.control":               "4px",
			"admin.sidebar.title-height":   "42px",
			"dashboard.card.background":    "#ffffff",
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
		"form.control.radius",
	} {
		if got := statuses[token]; got.Status != "consumed" {
			t.Fatalf("expected selected component token %s to be consumed, got %+v", token, got)
		}
	}
	for _, token := range []string{
		"color.surface.canvas",
		"space.stack",
		"space.surface",
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
