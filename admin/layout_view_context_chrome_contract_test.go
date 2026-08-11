package admin

import (
	"os"
	"strings"
	"testing"
)

// This source-level gate is intentionally established before the typed helper
// implementation. It keeps the public shape additive and prevents a future
// raw-HTML action channel from entering the page-chrome model.
func TestTypedPageChromePublicContract(t *testing.T) {
	structural := mustReadChromeContractSource(t, "theme_structural.go")
	for _, required := range []string{
		"type AdminPageChrome struct",
		"Header      AdminPageHeader",
		"Active      string",
		"BodyClasses string",
	} {
		if !strings.Contains(structural, required) {
			t.Errorf("typed page-chrome contract is missing %q", required)
		}
	}
	start := strings.Index(structural, "type AdminPageChrome struct")
	if start >= 0 {
		end := strings.Index(structural[start:], "\n}")
		if end > 0 {
			definition := structural[start : start+end]
			for _, prohibited := range []string{"HTML", "template.HTML", "Actions", "Markup"} {
				if strings.Contains(definition, prohibited) {
					t.Errorf("AdminPageChrome must not expose arbitrary action markup through %q", prohibited)
				}
			}
		}
	}

	api := mustReadChromeContractSource(t, "layout_view_context_api.go")
	if !strings.Contains(api, "func EnrichLayoutViewContextWithChrome(") ||
		!strings.Contains(api, "chrome AdminPageChrome") {
		t.Error("public typed enrichment helper is missing")
	}
}

func TestCanonicalLayoutKeepsActionsTemplateOwned(t *testing.T) {
	data, err := os.ReadFile("../pkg/client/templates/layout.html")
	if err != nil {
		t.Fatalf("read canonical layout: %v", err)
	}
	source := string(data)
	if !strings.Contains(source, "{% block page_header_actions %}") {
		t.Fatal("canonical layout must retain the template-owned action slot")
	}
	for _, prohibited := range []string{"page_header.actions", "page_actions|safe", "page_action_html|safe"} {
		if strings.Contains(source, prohibited) {
			t.Errorf("canonical layout bypasses the template-owned action slot with %q", prohibited)
		}
	}
}

func TestCanonicalComponentStylesheetContract(t *testing.T) {
	for _, path := range []string{
		"../pkg/client/assets/src/styles/components.css",
		"../pkg/client/assets/dist-public/components.css",
	} {
		if _, err := os.Stat(path); err != nil {
			t.Errorf("canonical component stylesheet contract is missing %s: %v", path, err)
		}
	}
	packageJSON, err := os.ReadFile("../pkg/client/assets/package.json")
	if err != nil {
		t.Fatalf("read client package metadata: %v", err)
	}
	if !strings.Contains(string(packageJSON), `"./components.css"`) {
		t.Error("client package must export @goliatone/go-admin-client/components.css")
	}
}

func mustReadChromeContractSource(t *testing.T, path string) string {
	t.Helper()
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read %s: %v", path, err)
	}
	return string(data)
}
