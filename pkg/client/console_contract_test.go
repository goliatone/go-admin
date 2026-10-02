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
			Options:  base + "/api/panels/:panel/actions/:action/options/:field",
			Requests: base + "/api/panels/:panel/requests/:request",
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
		"workflow":   consoleWorkflowContract(t, identity),
	}
}

// consoleWorkflowContract is the frozen schema-v1 workflow wire (ADR-0004):
// registry-normalized rich views, action references, drawer forms with a
// generated request ID and secondary submit, unavailable declarations, and the
// options, pending-request and outcome payloads. Domain wording is
// illustrative; Data projects its own.
func consoleWorkflowContract(t *testing.T, identity console.Identity) map[string]any {
	t.Helper()
	noop := func(context.Context, console.PanelActionRequest) (console.PanelActionResult, error) {
		return console.PanelActionResult{OK: true}, nil
	}
	minimum, maximum := 1.0, 10000.0
	requestID := console.PanelUIActionField{Name: "request_id", Label: "Request ID", Generate: console.PanelFieldGenerateRequestID, Advanced: true,
		Help: "Generated for this request. Unchanged retries reuse it; Preview plan and new work get their own."}
	view := console.TableView("")
	view.Title = "Scenarios"
	view.Description = "Each scenario's lifecycle on its target"
	view.Empty = "No scenarios yet. Datasets appear here once a provider publishes them."
	view.Link = &console.PanelUILink{Label: "All operations", PanelID: "operations"}
	view.Options = map[string]any{
		"key_bind":     "key",
		"actions_bind": "actions",
		"columns": []map[string]any{
			{"label": "Scenario", "bind": "title", "secondary_bind": "subtitle"},
			{"label": "Lifecycle", "bind": "lifecycle", "format": console.PanelFormatSteps},
			{"label": "Status", "bind": "status", "format": console.PanelFormatBadge, "tone_bind": "status_tone"},
			{"label": "Receipt", "bind": "receipt", "format": console.PanelFormatCopy, "empty": "—", "truncate": 12},
			{"label": "Progress", "bind": "progress", "format": console.PanelFormatProgress, "empty": "—"},
			{"label": "Updated", "bind": "updated_at", "format": console.PanelFormatRelative},
		},
	}
	registry := console.NewPanelRegistry()
	if err := registry.Register("scenarios", console.PanelConfig{
		Label: "Scenarios", Order: 20,
		UI: &console.PanelUI{
			Views:        console.PanelUIViews{Console: view},
			ActionLayout: &console.PanelUIActionLayout{Mode: console.PanelActionLayoutDrawer},
			Actions: []console.PanelUIAction{
				{
					ID: "refresh", Label: "Refresh", SubmitLabel: "Refresh", Kind: "refresh", Refresh: true, RequestScope: "refresh:preview",
					Fields: []console.PanelUIActionField{
						{Name: "batch_limit", Label: "Batch size", Kind: "integer", Default: 100, Min: &minimum, Max: &maximum, Help: "Records written per batch, from 1 to 10,000."},
						{Name: "dry_run", Kind: console.PanelFieldKindHidden, Default: false},
						requestID,
					},
					Secondary: &console.PanelUIActionSubmit{Label: "Preview plan", Field: "dry_run", Value: true},
					Drawer: &console.PanelUIActionDrawer{
						Eyebrow: "Refresh · target preview", Title: "Refresh ready v1", EffectTone: console.PanelToneInfo,
						Effect: "preview keeps serving rcpt-ready-1 (generation 3) while this runs.",
						Steps: []console.PanelUIStep{
							{Label: "Prepare receipt", State: console.PanelStepCurrent},
							{Label: "Verify", State: console.PanelStepPending},
							{Label: "Activate", State: console.PanelStepPending},
						},
						Details: []console.PanelUIDetail{{Label: "Dataset", Value: "crm/corpus-a v1"}, {Label: "Records", Value: "orders 40, people 120"}},
						Note:    "Preview plan starts a separate dry-run request. Nothing changes on preview.",
					},
				},
				{
					ID: "activate", Label: "Activate…", SubmitLabel: "Activate", Kind: "activate", Refresh: true, RequestScope: "activate:preview",
					RequiresConfirm: true, ConfirmText: "Activate empty-history v1 on preview?",
					Payload: map[string]any{"expected_generation": 3},
					Fields: []console.PanelUIActionField{
						{Name: "receipt_id", Label: "Receipt", Kind: "select", Required: true,
							OptionSource: &console.PanelUIActionOptionSource{ID: "receipts", Label: "Retained receipts", Paginated: true, Searchable: true}},
						requestID,
					},
					Confirmation: &console.PanelUIActionConfirmation{
						Title: "Activate empty-history v1 on preview?", Message: "preview switches datasets as soon as the activation completes.",
						Changes: []console.PanelUIChange{
							{Label: "Scenario", Before: "ready v1", After: "empty-history v1"},
							{Label: "Receipt", Before: "rcpt-ready-1", After: "rcpt-empty-1", Format: console.PanelFormatMono},
							{Label: "Generation", Before: "3", After: "4", Format: console.PanelFormatNumber},
						},
						Note: "To switch back later, activate rcpt-ready-1 again. That creates generation 5.", ConfirmLabel: "Activate empty-history v1",
					},
				},
				{ID: "validate", Label: "Validate", Kind: "validate", Refresh: true, Fields: []console.PanelUIActionField{requestID}},
				{ID: "prepare-backfill", Label: "Prepare", Kind: "prepare", Availability: console.PanelActionNotPermitted, Reason: "Needs the Data operator role."},
				{ID: "reset", Label: "Reset", Kind: "reset", Availability: console.PanelActionUnsupported, Reason: "This target has no safe reset."},
			},
		},
		Actions: map[string]console.PanelActionHandler{"refresh": noop, "activate": noop, "validate": noop},
	}); err != nil {
		t.Fatalf("register workflow panel: %v", err)
	}
	ref := func(action, emphasis string) console.PanelUIActionRef {
		return console.PanelUIActionRef{PanelID: "scenarios", ActionID: action, Emphasis: emphasis}
	}
	panel := console.PanelSnapshot{PanelDefinition: contractDefinition(t, registry, "scenarios"), Records: []console.Record{
		{Key: "ready", TargetID: "preview", Generation: 3, Revision: 4, Data: map[string]any{
			"key": "ready", "title": "ready v1", "subtitle": "crm/corpus-a v1", "status": "Active", "status_tone": console.PanelToneSuccess,
			"lifecycle": console.NormalizePanelSteps([]console.PanelUIStep{
				{Label: "Prepared", State: console.PanelStepDone, Tone: console.PanelToneSuccess},
				{Label: "Verified", State: console.PanelStepDone, Tone: console.PanelToneSuccess},
				{Label: "Active · gen 3", State: console.PanelStepCurrent, Tone: console.PanelToneSuccess},
			}),
			"receipt":    "rcpt-ready-1",
			"progress":   console.PanelUIProgress{Completed: 40, Total: 100, Label: "Refresh 40 of 100"},
			"updated_at": "2026-10-01T09:01:00Z",
			"actions":    console.NormalizePanelActionRefs([]console.PanelUIActionRef{ref("refresh", console.PanelActionEmphasisPrimary), ref("validate", console.PanelActionEmphasisMenu), ref("reset", console.PanelActionEmphasisMenu)}),
		}},
		{Key: "backfill", TargetID: "preview", Revision: 1, Data: map[string]any{
			"key": "backfill", "title": "backfill v1", "subtitle": "crm/corpus-b v2", "status": "Not prepared", "status_tone": console.PanelTonePlanned,
			"lifecycle": console.NormalizePanelSteps([]console.PanelUIStep{{Label: "Prepared"}, {Label: "Verified"}, {Label: "Active"}}),
			"actions":   console.NormalizePanelActionRefs([]console.PanelUIActionRef{ref("prepare-backfill", console.PanelActionEmphasisPrimary)}),
		}},
	}}
	optionPage := console.NormalizePanelOptionPage(console.PanelOptionPage{
		Items: []console.PanelUIActionOption{
			{Value: "rcpt-empty-1", Label: "empty-history v1 · verified", Description: "Prepared 2026-10-01 08:40"},
			{Value: "rcpt-empty-0", Label: "empty-history v1 · prepared", Description: "Not verified", Disabled: true},
		},
		NextCursor: "opaque-cursor-2",
		Selected:   []console.PanelUIActionOption{{Value: "rcpt-old-7", Label: "empty-history v1 · verified (older)"}},
	}, console.PanelOptionPageDefault)
	return map[string]any{
		"client_capabilities": console.ClientCapabilityIDs(),
		"panel":               panel,
		"option_query":        "?cursor=opaque-cursor-1&q=empty&limit=25&value=rcpt-old-7",
		"option_page":         optionPage,
		"request_status": []console.PanelRequestStatus{
			console.NormalizePanelRequestStatus(console.PanelRequestStatus{Status: console.PanelRequestClaimed, Result: &console.PanelActionResult{
				OK: true, Message: "Refresh accepted for ready v1 on preview. preview keeps serving rcpt-ready-1.", Tone: console.PanelToneInfo,
				Record: &console.PanelUIRecordRef{PanelID: "operations", RecordKey: "op-0003"}}}),
			console.NormalizePanelRequestStatus(console.PanelRequestStatus{Status: console.PanelRequestUnclaimed, RetryUntil: "2026-10-31T09:00:00Z",
				Message: "No request with this ID was received. Resubmitting the unchanged request is safe until the retry window ends."}),
			console.NormalizePanelRequestStatus(console.PanelRequestStatus{Status: console.PanelRequestExpired, Message: "This request can no longer be resumed. Start new work."}),
			console.NormalizePanelRequestStatus(console.PanelRequestStatus{Status: console.PanelRequestUnknown, Message: "The request state is unknown. Check again shortly."}),
		},
		"results": []console.PanelActionResult{
			console.NormalizePanelActionResult(console.PanelActionResult{OK: true, Refresh: true, Tone: console.PanelTonePlanned, Planned: true,
				Message: "Plan ready for ready v1 on preview. Nothing was changed.", Record: &console.PanelUIRecordRef{PanelID: "operations", RecordKey: "op-0007"}}),
			console.NormalizePanelActionResult(console.PanelActionResult{OK: false, Refresh: true, Tone: console.PanelToneError, Code: "stale_generation",
				Message:  "The active dataset changed after this page loaded. Review the current target and confirm again.",
				FollowUp: []console.PanelUIActionRef{ref("activate", console.PanelActionEmphasisPrimary)}}),
		},
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
