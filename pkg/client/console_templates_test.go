package client

import (
	"encoding/json"
	"html"
	"maps"
	"regexp"
	"strings"
	"testing"

	pongo2 "github.com/flosch/pongo2/v6"
)

func consoleTemplateFuncs(t *testing.T) pongo2.Context {
	t.Helper()
	return pongo2.Context{
		"adminURL": func(path string) string { return "/admin/" + path },
		"toJSON": func(value any) string {
			encoded, err := json.Marshal(value)
			if err != nil {
				t.Fatalf("marshal template value: %v", err)
			}
			return string(encoded)
		},
	}
}

func renderClientTemplate(t *testing.T, name string, ctx pongo2.Context) string {
	t.Helper()
	set := pongo2.NewSet("console-templates-"+name, templateFSLoader{fsys: Templates()})
	tpl, err := set.FromFile(name)
	if err != nil {
		t.Fatalf("parse %s: %v", name, err)
	}
	merged := consoleTemplateFuncs(t)
	maps.Copy(merged, ctx)
	out, err := tpl.Execute(merged)
	if err != nil {
		t.Fatalf("render %s: %v", name, err)
	}
	return out
}

func TestConsoleBaseTemplateRendersRuntimeRegionsAndBootstrap(t *testing.T) {
	bootstrap, err := json.Marshal(map[string]any{
		"console_id": "data",
		"title":      "Data </script>",
		"urls":       map[string]string{"snapshot": "/admin/data/api/snapshot"},
	})
	if err != nil {
		t.Fatal(err)
	}
	out := renderClientTemplate(t, "resources/console/base.html", pongo2.Context{
		"title":                  "Data operations",
		"console_id":             "data",
		"console_title":          "Data operations",
		"console_bootstrap_json": string(bootstrap),
	})
	for _, fragment := range []string{
		`class="console-root" id="console-data" data-console-root data-console-id="data"`,
		`data-console-tabs`, `data-console-filters`, `data-console-panel`, `data-console-notice`,
		`data-console-page-actions data-console-for="console-data"`,
		`data-console-status data-status="offline"`, `data-console-connection`, `data-console-action="refresh" disabled`,
		`href="/admin/assets/dist/styles/console.css"`, `src="/admin/assets/dist/console/index.js"`,
		`<script type="application/json" data-console-bootstrap>` + string(bootstrap) + `</script>`,
	} {
		if !strings.Contains(out, fragment) {
			t.Fatalf("console shell omitted %q:\n%s", fragment, out)
		}
	}
	if strings.Count(out, "</script>") != strings.Count(out, "<script") {
		t.Fatal("bootstrap JSON terminated its script element early")
	}
	if regexp.MustCompile(`class="[^"]*\bdebug-`).MatchString(out) {
		t.Fatal("neutral console shell must not use Debug class names")
	}
}

// The admin page header carries the live status and Refresh outside the root;
// they bind to the root through its DOM ID, never through the console ID.
func TestConsoleBaseTemplateBindsPageHeaderControlsToTheRootDOMID(t *testing.T) {
	out := renderClientTemplate(t, "resources/console/base.html", pongo2.Context{
		"title":                  "Data operations",
		"page_subtitle":          "Datasets <for> operators",
		"console_id":             "data",
		"console_dom_id":         "console-data-primary",
		"console_title":          "Data operations",
		"console_bootstrap_json": `{"console_id":"data"}`,
	})
	actions := strings.Index(out, `data-admin-page-actions`)
	group := strings.Index(out, `data-console-page-actions data-console-for="console-data-primary"`)
	root := strings.Index(out, `<section class="console-root" id="console-data-primary"`)
	if actions < 0 || group < actions || root < 0 || group > root {
		t.Fatalf("header controls must render in the page header before the root (actions=%d group=%d root=%d):\n%s", actions, group, root, out)
	}
	rootMarkup := out[root:]
	for _, control := range []string{"data-console-status", "data-console-connection", `data-console-action="refresh"`} {
		if strings.Count(out, control) != 1 || strings.Contains(rootMarkup, control) {
			t.Fatalf("%s must render once, in the page header only", control)
		}
	}
	if !strings.Contains(out, `<p class="admin-page-header__subtitle console-page-subtitle mt-1 text-sm text-gray-500">Datasets &lt;for&gt; operators</p>`) {
		t.Fatalf("console shell must render the escaped page subtitle in the header:\n%s", out)
	}
	if !strings.Contains(out, `id="console-data-primary"`) || strings.Contains(out, `id="console-data"`) {
		t.Fatal("console_dom_id must replace the default root ID")
	}
}

func TestDebugPageScopesItsRootAndPublishesTheIdentityNamespace(t *testing.T) {
	namespace := `{"console_id":"debug","actor_id":"o'brien","scope_key":"[\"t1\",\"\"]"}`
	out := renderClientTemplate(t, "resources/debug/index.html", pongo2.Context{
		"debug_path":                  "/admin/debug",
		"debug_preferences_namespace": namespace,
		"panels":                      []string{"template"},
		"repl_commands":               []string{},
	})
	if !strings.Contains(out, "<body data-debug-root>") {
		t.Fatal("standalone Debug page must scope chrome lookups to its root")
	}
	match := regexp.MustCompile(`data-preferences-namespace="([^"]*)"`).FindStringSubmatch(out)
	if len(match) != 2 || html.UnescapeString(match[1]) != namespace {
		t.Fatalf("namespace attribute did not round-trip: %v", match)
	}
	for _, fragment := range []string{`data-debug-console`, `data-debug-path="/admin/debug"`, `data-debug-tabs`, `data-debug-filters`} {
		if !strings.Contains(out, fragment) {
			t.Fatalf("Debug page lost %q", fragment)
		}
	}
}

func TestDebugToolbarBootstrapEscapesTheIdentityNamespace(t *testing.T) {
	namespace := `{"actor_id":"x'</script><script>alert(1)</script>"}`
	out := renderClientTemplate(t, "partials/debug-toolbar.html", pongo2.Context{
		"debug_toolbar_enabled":       true,
		"base_path":                   "/admin",
		"debug_path":                  "/admin/debug",
		"debug_preferences_namespace": namespace,
	})
	match := regexp.MustCompile(`preferencesNamespace: '([^']*)'`).FindStringSubmatch(out)
	if len(match) != 2 {
		t.Fatalf("toolbar bootstrap omitted preferencesNamespace:\n%s", out)
	}
	if strings.Contains(match[1], "<") || strings.Contains(match[1], "'") {
		t.Fatalf("namespace was not escaped for a JavaScript string: %s", match[1])
	}
	if strings.Count(out, "</script>") != 2 {
		t.Fatalf("namespace closed the toolbar script early:\n%s", out)
	}
	unscoped := renderClientTemplate(t, "partials/debug-toolbar.html", pongo2.Context{
		"debug_toolbar_enabled": true,
		"debug_path":            "/admin/debug",
	})
	if !strings.Contains(unscoped, "preferencesNamespace: ''") {
		t.Fatal("unscoped Debug toolbar must publish an empty namespace")
	}
}

func TestConsolePanelWidgetRendersSummaryAndDisplayMount(t *testing.T) {
	widget := map[string]any{
		"data": map[string]any{
			"console_id": "data",
			"watermark":  4,
			"panel": map[string]any{
				"id":      "operations",
				"label":   "Operations <b>",
				"records": []any{map[string]any{"record_key": "op-1", "revision": 1, "data": map[string]any{"name": "</script>"}}},
			},
		},
	}
	out := renderClientTemplate(t, "dashboard/widgets/console_panel.html", pongo2.Context{"widget": widget})
	for _, fragment := range []string{
		`data-console-root data-console-display data-console-id="data"`,
		`<script type="application/json" data-console-widget>`,
		`Operations &lt;b&gt;: 1 records`,
		`href="/admin/assets/dist/styles/console.css"`,
		`src="/admin/assets/dist/console/index.js"`,
	} {
		if !strings.Contains(out, fragment) {
			t.Fatalf("console widget omitted %q:\n%s", fragment, out)
		}
	}
	if strings.Count(out, "</script>") != 2 {
		t.Fatalf("widget payload closed its script element early:\n%s", out)
	}
}
