package quickstart

import (
	"io/fs"
	"strings"
	"testing"

	client "github.com/goliatone/go-admin/pkg/client"
)

func TestSidebarAssetsExposeAccessibleNarrowDisclosureContract(t *testing.T) {
	assets := SidebarAssetsFS()
	stateBytes, err := fs.ReadFile(assets, "sidebar-state.js")
	if err != nil {
		t.Fatalf("read sidebar-state.js: %v", err)
	}
	canonicalState, err := fs.ReadFile(client.Assets(), "sidebar-state.js")
	if err != nil {
		t.Fatalf("read canonical sidebar-state.js: %v", err)
	}
	if string(stateBytes) != string(canonicalState) {
		t.Fatal("quickstart sidebar-state.js fallback drifted from the canonical client asset")
	}
	state := string(stateBytes)
	for _, required := range []string{
		"admin-sidebar-collapsed",
		"data-admin-sidebar-collapsed",
		"data-admin-sidebar-ready",
		"readStorage",
		"writeStorage",
		"applyInitialState",
	} {
		if !strings.Contains(state, required) {
			t.Fatalf("sidebar-state.js missing %q", required)
		}
	}

	scriptBytes, err := fs.ReadFile(assets, "sidebar.js")
	if err != nil {
		t.Fatalf("read sidebar.js: %v", err)
	}
	script := string(scriptBytes)
	canonicalScript, err := fs.ReadFile(client.Assets(), "sidebar.js")
	if err != nil {
		t.Fatalf("read canonical sidebar.js: %v", err)
	}
	if script != string(canonicalScript) {
		t.Fatal("quickstart sidebar.js fallback drifted from the canonical client asset")
	}
	for _, required := range []string{
		"data-mobile-open",
		"aria-expanded",
		"aria-hidden",
		"sidebar.inert",
		"event.key === 'Escape'",
		"setMobileOpen(false, true)",
		"mobileToggle?.focus()",
		"sidebarState.writeStoredCollapsed",
		"sidebarState.readStorage",
		"data-sidebar-runtime-initialized",
	} {
		if !strings.Contains(script, required) {
			t.Fatalf("sidebar.js missing %q", required)
		}
	}

	cssBytes, err := fs.ReadFile(assets, "sidebar.css")
	if err != nil {
		t.Fatalf("read sidebar.css: %v", err)
	}
	css := string(cssBytes)
	for _, required := range []string{
		`@media (max-width: 1023px)`,
		`#sidebar[data-mobile-open="true"]`,
		`transform: translateX(-100%)`,
		`.sidebar-mobile-toggle`,
		`.sidebar-backdrop:not([hidden])`,
		`@media (prefers-reduced-motion: reduce)`,
		`data-admin-sidebar-collapsed`,
		`data-admin-sidebar-ready`,
	} {
		if !strings.Contains(css, required) {
			t.Fatalf("sidebar.css missing %q", required)
		}
	}
}

func TestSidebarTemplateDeclaresDisclosureARIA(t *testing.T) {
	templates := SidebarTemplatesFS()
	templateBytes, err := fs.ReadFile(templates, "partials/sidebar.html")
	if err != nil {
		t.Fatalf("read sidebar template: %v", err)
	}
	template := string(templateBytes)
	for _, required := range []string{
		`id="sidebar-mobile-toggle"`,
		`aria-controls="sidebar"`,
		`aria-expanded="false"`,
		`data-mobile-open="false"`,
		`data-collapse-placement=`,
		`data-compact-footer=`,
		`aria-label="Admin navigation"`,
		`id="sidebar-navigation"`,
		`sidebar-collapse-action`,
		`sidebar-user-avatar`,
		`sidebar_hide_presence`,
		`sidebar_hide_user_menu_indicator`,
	} {
		if !strings.Contains(template, required) {
			t.Fatalf("sidebar template missing %q", required)
		}
	}
}
