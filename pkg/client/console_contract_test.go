package client_test

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"io/fs"
	"os"
	"path/filepath"
	"testing"

	pongo2 "github.com/flosch/pongo2/v6"
	"github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/console"
	client "github.com/goliatone/go-admin/pkg/client"
)

// consoleContractFixture is the Go-generated wire golden consumed by the
// browser client tests. Regenerate with UPDATE_CONSOLE_CONTRACT=1 after a
// reviewed contract change; the client suites then show the FE impact.
const consoleContractFixture = "assets/tests/fixtures/console-contract.json"

// consolePageFixture is the packaged console shell rendered inside the admin
// layout with the golden bootstrap; the browser suite loads it as a page.
const consolePageFixture = "assets/tests/fixtures/console-page.html"

func contractDefinition(t *testing.T, reg *console.PanelRegistry, id string) console.PanelDefinition {
	t.Helper()
	def, ok := reg.DefinitionForContext(context.Background(), id)
	if !ok {
		t.Fatalf("registry omitted panel %q", id)
	}
	return def
}

func consoleContractDocument(t *testing.T) map[string]any {
	t.Helper()
	noop := func(context.Context, console.PanelActionRequest) (console.PanelActionResult, error) {
		return console.PanelActionResult{OK: true}, nil
	}
	reg := console.NewPanelRegistry()
	register := func(id string, config console.PanelConfig) {
		if err := reg.Register(id, config); err != nil {
			t.Fatalf("register %s: %v", id, err)
		}
	}
	tableView := console.TableView("")
	tableView.Title = "Operations"
	tableView.Options = map[string]any{
		"key_bind": "id",
		"columns": []map[string]any{
			{"label": "Operation", "bind": "name"},
			{"label": "State", "bind": "state"},
		},
	}
	register("operations", console.PanelConfig{
		Label: "Operations",
		Order: 10,
		UI: &console.PanelUI{
			Views: console.PanelUIViews{Console: tableView},
			Filters: []console.PanelUIFilter{
				{ID: "q", Label: "Search", Kind: console.PanelFilterSearch, Bind: "name"},
				{ID: "state", Label: "State", Kind: console.PanelFilterSelect, Bind: "state", Options: []string{"running", "succeeded"}},
			},
			Actions: []console.PanelUIAction{{
				ID: "preview", Label: "Preview dataset", SubmitLabel: "Run preview",
				Fields: []console.PanelUIActionField{{Name: "dataset", Label: "Dataset", Kind: "select", Required: true,
					OptionItems: []console.PanelUIActionOption{{Value: "baseline", Label: "Baseline"}}}},
			}},
		},
		Actions: map[string]console.PanelActionHandler{"preview": noop},
	})
	targetsUI := console.NewPanelUI(console.StatusListView(""), nil)
	targetsUI.ActionLayout = &console.PanelUIActionLayout{Mode: console.PanelActionLayoutSelect, PickerLabel: "Target action"}
	targetsUI.Actions = []console.PanelUIAction{{
		ID: "retry", Label: "Retry target",
		Fields: []console.PanelUIActionField{{Name: "force", Label: "Force", Kind: "boolean"}},
	}}
	register("targets", console.PanelConfig{Label: "Targets", Order: 20, UI: targetsUI,
		Actions: map[string]console.PanelActionHandler{"retry": noop}})
	register("audit", console.PanelConfig{Label: "Audit", Order: 30, UI: console.NewPanelUI(console.TimelineView(""), nil)})

	identity := console.Identity{ConsoleID: "data", ApplicationID: "crm", EnvironmentID: "staging", ActorID: "operator-1", ScopeKey: "synthetic-org"}
	second := identity
	second.ConsoleID, second.ActorID = "ops", "operator-2"
	operations := console.PanelSnapshot{PanelDefinition: contractDefinition(t, reg, "operations"), Records: []console.Record{{
		Key: "op-1", Revision: 3, Data: map[string]any{"id": "op-1", "name": "Seed <baseline>", "state": "running"},
	}}}
	// Hosts list snapshot panels by ID; the client orders tabs by `order`.
	panels := []console.PanelSnapshot{
		{PanelDefinition: contractDefinition(t, reg, "audit"), Records: []console.Record{{Key: "a-1", Revision: 1,
			Data: map[string]any{"timestamp": "2026-10-01T10:00:00Z", "message": "Reset requested", "level": "info"}}}},
		operations,
		{PanelDefinition: contractDefinition(t, reg, "targets"), Records: []console.Record{}},
	}
	urls := func(id string) console.Routes {
		base := "/fixture/" + id
		return console.Routes{
			Page: base, Panels: base + "/api/panels", Snapshot: base + "/api/snapshot",
			Action: base + "/api/panels/:panel/actions/:action", Preferences: base + "/api/preferences/panel-order",
			Live: base + "/ws", Lookup: base + "/api/panels/:panel/records/:record",
		}
	}
	bootstrap := func(id console.Identity, title string) console.Bootstrap {
		return console.Bootstrap{Identity: id, Title: title, URLs: urls(id.ConsoleID),
			PreferencesNamespace: "console:" + id.Namespace(),
			Snapshot:             console.Snapshot{Identity: id, Watermark: 21, Panels: panels}}
	}
	return map[string]any{
		"bootstrap":        bootstrap(identity, "Data operations"),
		"second_bootstrap": bootstrap(second, "Operations review"),
		"upsert": console.Event{Identity: identity, PanelID: "operations", Sequence: 22, Kind: console.EventUpsert,
			Record: console.Record{Key: "op-1", Revision: 4, Data: map[string]any{"id": "op-1", "name": "Seed <baseline>", "state": "succeeded"}}},
		"invalidate": console.Event{Identity: identity, Sequence: 30, Kind: console.EventInvalidate},
		"widget":     admin.ConsolePanelWidgetPayload{Identity: identity, Panel: operations, Watermark: 21},
	}
}

func TestConsoleContractFixtureMatchesGoWire(t *testing.T) {
	encoded, err := json.MarshalIndent(consoleContractDocument(t), "", "  ")
	if err != nil {
		t.Fatalf("marshal console contract: %v", err)
	}
	encoded = append(encoded, '\n')
	assertGolden(t, consoleContractFixture, encoded)
}

type contractTemplateLoader struct{ fsys fs.FS }

func (l contractTemplateLoader) Abs(_, name string) string { return name }

func (l contractTemplateLoader) Get(path string) (io.Reader, error) {
	data, err := fs.ReadFile(l.fsys, path)
	if err != nil {
		return nil, err
	}
	return bytes.NewReader(data), nil
}

func assertGolden(t *testing.T, path string, encoded []byte) {
	t.Helper()
	path = filepath.FromSlash(path)
	if os.Getenv("UPDATE_CONSOLE_CONTRACT") == "1" {
		if err := os.WriteFile(path, encoded, 0o644); err != nil {
			t.Fatalf("write %s: %v", path, err)
		}
	}
	current, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read %s (set UPDATE_CONSOLE_CONTRACT=1 to create it): %v", path, err)
	}
	if !bytes.Equal(current, encoded) {
		t.Fatalf("%s drifted from the Go contract or template; review the client impact and regenerate with UPDATE_CONSOLE_CONTRACT=1", path)
	}
}

func TestConsolePageFixtureMatchesPackagedShell(t *testing.T) {
	bootstrap, err := json.Marshal(consoleContractDocument(t)["bootstrap"])
	if err != nil {
		t.Fatal(err)
	}
	set := pongo2.NewSet("console-page-fixture", contractTemplateLoader{fsys: client.Templates()})
	tpl, err := set.FromFile("resources/console/base.html")
	if err != nil {
		t.Fatalf("parse console shell: %v", err)
	}
	page, err := tpl.Execute(pongo2.Context{
		"adminURL":               func(path string) string { return "/admin/" + path },
		"asset_base_path":        "/admin",
		"base_path":              "/admin",
		"csrf_meta":              `<meta name="csrf-token" content="fixture-csrf">`,
		"title":                  "Data operations",
		"console_id":             "data",
		"console_title":          "Data operations",
		"console_bootstrap_json": string(bootstrap),
	})
	if err != nil {
		t.Fatalf("render console shell: %v", err)
	}
	assertGolden(t, consolePageFixture, []byte(page))
}
