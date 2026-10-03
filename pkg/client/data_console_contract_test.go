package client_test

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"io/fs"
	"os"
	"path/filepath"
	"regexp"
	"slices"
	"strings"
	"testing"
	"time"

	pongo2 "github.com/flosch/pongo2/v6"
	"github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/console"
	admindata "github.com/goliatone/go-admin/data"
	client "github.com/goliatone/go-admin/pkg/client"
	router "github.com/goliatone/go-router"
)

// dataConsoleContractFixture is the Go-generated Data console wire golden: the
// six Data panels served by a real console host with representative lifecycle
// states. The client view suite renders it through the shipped runtime.
// Regenerate with UPDATE_CONSOLE_CONTRACT=1 after a reviewed change.
const dataConsoleContractFixture = "assets/tests/fixtures/data-console-contract.json"

// dataConsolePageFixture is the packaged Data page rendered with the golden
// bootstrap, for browser checks of the page as shipped.
const dataConsolePageFixture = "assets/tests/fixtures/data-console-page.html"

var dataConsoleIdentity = console.Identity{ConsoleID: "data", ApplicationID: "crm", EnvironmentID: "staging", ActorID: "operator-1", ScopeKey: "synthetic-org"}

func dataConsoleRoutes() console.Routes {
	return console.Routes{
		Page: "/admin/data", Panels: "/admin/data/api/panels", Snapshot: "/admin/data/api/snapshot",
		Action: "/admin/data/api/panels/:panel/actions/:action", Preferences: "/admin/data/api/preferences/panel-order",
		Live: "/admin/data/ws", Lookup: "/admin/data/api/panels/:panel/records/:record",
	}
}

type dataConsoleFixtures struct {
	corpusA, corpusB                               admindata.DatasetRef
	ready, emptyHistory, dstWeek, reprofiled, fill admindata.ScenarioRef
	readyReceipt                                   *admindata.PreparationReceipt
}

func newDataConsoleFixtures() dataConsoleFixtures {
	digest := func(ch string) string { return strings.Repeat(ch, 64) }
	f := dataConsoleFixtures{
		corpusA: admindata.DatasetRef{Provider: "crm", ID: "corpus-a", Version: "1", Digest: digest("a")},
		corpusB: admindata.DatasetRef{Provider: "crm", ID: "corpus-b", Version: "2", Digest: digest("b")},
	}
	f.ready = admindata.ScenarioRef{Dataset: f.corpusA, ID: "ready", Version: "1", ProfileHash: digest("1")}
	f.emptyHistory = admindata.ScenarioRef{Dataset: f.corpusA, ID: "empty-history", Version: "1", ProfileHash: digest("2")}
	f.dstWeek = admindata.ScenarioRef{Dataset: f.corpusA, ID: "dst-week", Version: "1", ProfileHash: digest("3")}
	f.reprofiled = admindata.ScenarioRef{Dataset: f.corpusB, ID: "reprofiled", Version: "2", ProfileHash: digest("4")}
	f.fill = admindata.ScenarioRef{Dataset: f.corpusB, ID: "backfill", Version: "1", ProfileHash: digest("5")}
	f.readyReceipt = f.receipt("rcpt-ready-1", f.ready, 2, f.verification("ver-ready", 2, admindata.CheckPassed))
	return f
}

func (f dataConsoleFixtures) receipt(id string, scenario admindata.ScenarioRef, revision uint64, verification *admindata.VerificationResult) *admindata.PreparationReceipt {
	return &admindata.PreparationReceipt{ID: id, Target: admindata.TargetKey{ScopeKey: "synthetic-org", TargetID: "preview"},
		Dataset: scenario.Dataset, Scenario: scenario, ContentRevision: revision, Verification: verification}
}

func (f dataConsoleFixtures) verification(id string, revision uint64, status string) *admindata.VerificationResult {
	return &admindata.VerificationResult{ID: id, ContentRevision: revision, Checks: []admindata.Check{{ID: "customer-search", Status: status}}}
}

func (f dataConsoleFixtures) capabilities(prepare admindata.Capability) map[admindata.Kind]admindata.Capability {
	available := admindata.Capability{Supported: true, Permitted: true}
	return map[admindata.Kind]admindata.Capability{
		admindata.Validate: available, admindata.Prepare: prepare, admindata.Refresh: available,
		admindata.Verify: available, admindata.Activate: available,
		admindata.Reset:    {Reason: "Preview target has no safe deactivation"},
		admindata.Generate: {Supported: true, Reason: "Requires the data custodian grant"},
	}
}

func (f dataConsoleFixtures) operation(id string, kind admindata.Kind, state admindata.State, scenario admindata.ScenarioRef, minute int, mutate func(*admindata.Operation)) admindata.Operation {
	at := time.Date(2026, 10, 1, 9, minute, 0, 0, time.UTC)
	op := admindata.Operation{
		Result:    admindata.Result{OperationID: id, Kind: kind, State: state, Revision: 2, Phase: "accepted"},
		Target:    admindata.TargetKey{ScopeKey: "synthetic-org", TargetID: "preview"},
		Input:     admindata.Input{Dataset: scenario.Dataset, Scenario: scenario, TargetID: "preview"},
		CreatedAt: at, UpdatedAt: at.Add(time.Minute),
	}
	if mutate != nil {
		mutate(&op)
	}
	return op
}

// operations covers queued, running, failed, canceled, recovering, stale
// generation, validation problems, verification, activation and dry run.
func (f dataConsoleFixtures) operations() []admindata.Operation {
	failure := func(code string) func(*admindata.Operation) {
		return func(op *admindata.Operation) { op.Result.Failure = &admindata.Failure{Code: code} }
	}
	return []admindata.Operation{
		f.operation("op-0001", admindata.Validate, admindata.Succeeded, f.fill, 1, func(op *admindata.Operation) {
			op.Result.Checks = []admindata.Check{{ID: "prerequisite.holiday-calendar", Status: admindata.CheckFailed}}
		}),
		f.operation("op-0002", admindata.Prepare, admindata.Queued, f.dstWeek, 2, nil),
		f.operation("op-0003", admindata.Refresh, admindata.Running, f.ready, 3, func(op *admindata.Operation) {
			op.Result.Phase = "preparing"
			op.Result.Progress = admindata.Progress{Stage: "seed audiences", Completed: 40, Total: 100}
		}),
		f.operation("op-0004", admindata.Activate, admindata.Failed, f.emptyHistory, 4, failure(admindata.CodeStale)),
		f.operation("op-0005", admindata.Prepare, admindata.Canceled, f.reprofiled, 5, failure(admindata.CodeCanceled)),
		f.operation("op-0006", admindata.Activate, admindata.Running, f.ready, 6, func(op *admindata.Operation) {
			op.Result.Phase = "recovering"
			op.Target.TargetID = "staging"
		}),
		f.operation("op-0007", admindata.Verify, admindata.Succeeded, f.emptyHistory, 7, func(op *admindata.Operation) {
			op.Result.Verification = f.verification("ver-empty", 1, admindata.CheckPassed)
		}),
		f.operation("op-0008", admindata.Activate, admindata.Succeeded, f.ready, 8, func(op *admindata.Operation) {
			op.Result.Active = true
			op.Result.Activation = &admindata.Activation{ReceiptID: "rcpt-ready-1", Generation: 3, Ready: true}
		}),
		f.operation("op-0009", admindata.Verify, admindata.Succeeded, f.dstWeek, 9, func(op *admindata.Operation) { op.Result.DryRun = true }),
	}
}

func (f dataConsoleFixtures) records() map[string][]console.Record {
	descriptor := func(ref admindata.DatasetRef, synthetic bool, scenarios []admindata.ScenarioRef, prerequisites []string, prepare admindata.Capability) admindata.Descriptor {
		return admindata.Descriptor{Dataset: ref, Synthetic: synthetic, Timezone: "America/Los_Angeles", Scenarios: scenarios,
			Components: []admindata.Component{{Path: "people.json", Digest: ref.Digest}}, Prerequisites: prerequisites,
			Counts: map[string]uint64{"people": 120, "orders": 40}, Capabilities: f.capabilities(prepare)}
	}
	operations := f.operations()
	opRecords := make([]console.Record, 0, len(operations))
	for _, op := range operations {
		opRecords = append(opRecords, admin.DataOperationRecord(op))
	}
	check := func(origin admindata.Kind, opID, verID string, dryRun bool, check admindata.Check) console.Record {
		return admin.DataCheckRecord(admin.DataCheckView{Origin: origin, OperationID: opID, VerificationID: verID, ReceiptID: "rcpt-ready-1", DryRun: dryRun, Check: check}, 1)
	}
	coverage := func(day, status string) console.Record {
		sample := admindata.SamplePeriod{LocalDay: day, Timezone: "America/Los_Angeles", EvidenceRef: "evidence/" + day}
		return admin.DataCoverageRecord(admin.DataCoverageView{VerificationID: "ver-ready", ReceiptID: "rcpt-ready-1", Coverage: admindata.Coverage{Status: status, Sample: sample}}, 1)
	}
	latest := operations[3]
	return map[string][]console.Record{
		admin.DataPanelOverview: {admin.DataOverviewRecord(admin.DataOverviewView{
			Targets: []admin.DataTargetView{
				{State: admindata.ActiveState{Target: admindata.TargetKey{ScopeKey: "synthetic-org", TargetID: "preview"}, Activation: admindata.Activation{ReceiptID: "rcpt-ready-1", Generation: 3, Ready: true}}, Receipt: f.readyReceipt},
				{State: admindata.ActiveState{Target: admindata.TargetKey{ScopeKey: "synthetic-org", TargetID: "staging"}, RecoveryRequired: true, Activation: admindata.Activation{ReceiptID: "rcpt-ready-0", Generation: 2}}},
			},
			Capabilities:    f.capabilities(admindata.Capability{Supported: true, Permitted: true}),
			LatestOperation: &latest,
			Counts:          admin.DataOverviewCounts{Datasets: 2, Scenarios: 5, Running: 2, Failed: 1},
		}, 5)},
		admin.DataPanelDatasets: {
			admin.DataDatasetRecord(descriptor(f.corpusA, true, []admindata.ScenarioRef{f.ready, f.emptyHistory, f.dstWeek}, []string{"audience-definitions"}, admindata.Capability{Supported: true, Permitted: true}), 1),
			admin.DataDatasetRecord(descriptor(f.corpusB, false, []admindata.ScenarioRef{f.reprofiled, f.fill}, []string{"holiday-calendar"}, admindata.Capability{Supported: true, Reason: "Requires admin.data.prepare"}), 1),
		},
		admin.DataPanelScenarios: {
			admin.DataScenarioRecord(admin.DataScenarioView{Scenario: f.ready, TargetID: "preview", Receipt: f.readyReceipt, Active: true}, 1),
			admin.DataScenarioRecord(admin.DataScenarioView{Scenario: f.emptyHistory, TargetID: "preview", Receipt: f.receipt("rcpt-empty-1", f.emptyHistory, 1, f.verification("ver-empty", 1, admindata.CheckPassed))}, 1),
			admin.DataScenarioRecord(admin.DataScenarioView{Scenario: f.dstWeek, TargetID: "preview", Receipt: f.receipt("rcpt-dst-1", f.dstWeek, 1, nil)}, 1),
			admin.DataScenarioRecord(admin.DataScenarioView{Scenario: f.reprofiled, TargetID: "preview", Receipt: f.receipt("rcpt-reprofiled-1", f.reprofiled, 3, f.verification("ver-reprofiled", 2, admindata.CheckPassed))}, 1),
			admin.DataScenarioRecord(admin.DataScenarioView{Scenario: f.fill}, 1),
		},
		admin.DataPanelOperations: opRecords,
		admin.DataPanelVerification: {
			check(admindata.Validate, "op-0001", "", false, admindata.Check{ID: "prerequisite.holiday-calendar", Status: admindata.CheckFailed, Expected: "present", Actual: "missing"}),
			check(admindata.Verify, "", "ver-ready", false, admindata.Check{ID: "customer-search", Status: admindata.CheckPassed, Expected: "42 matches", Actual: "42 matches", EvidenceRef: "evidence/search"}),
			check(admindata.Verify, "", "ver-ready", false, admindata.Check{ID: "report-export", Status: admindata.CheckFailed, Expected: "120 rows", Actual: "118 rows", EvidenceRef: "evidence/export"}),
			check(admindata.Verify, "", "ver-ready", false, admindata.Check{ID: "analytics-render", Status: admindata.CheckUnavailable}),
			check(admindata.Verify, "op-0009", "", true, admindata.Check{ID: "report-export", Status: admindata.CheckPlanned, Expected: "120 rows"}),
		},
		admin.DataPanelCoverage: {
			coverage("2026-03-08", admindata.CoveredEmpty),
			coverage("2026-03-09", admindata.PolicySuppressed),
			coverage("2026-03-10", admindata.Uncovered),
			coverage("2026-03-11", admindata.Partial),
			coverage("2026-03-12", admindata.Unavailable),
		},
	}
}

// dataConsoleSnapshot serves records through a real console host so the golden
// carries the host's panel order, definitions and record projection.
func dataConsoleSnapshot(t *testing.T, records map[string][]console.Record) console.Snapshot {
	t.Helper()
	snapshot, _ := dataConsoleHostSnapshot(t, records, nil, nil)
	return snapshot
}

// dataConsoleHostSnapshot also publishes live events through the host's own
// stream after the snapshot, so sequences and revisions follow the host.
// Actions, when set, are offered to an operator allowed to run every kind.
func dataConsoleHostSnapshot(t *testing.T, records map[string][]console.Record, events []console.Event, actions *admin.DataPanelActions) (console.Snapshot, []console.Event) {
	t.Helper()
	stream := console.NewEventStream("data", 64)
	registry := console.NewPanelRegistry()
	bound := []admin.DataPanelActions{}
	var execute func(context.Context, console.Identity, string, string) bool
	if actions != nil {
		bound = append(bound, *actions)
		execute = func(_ context.Context, _ console.Identity, _ string, actionID string) bool {
			_, ok := admin.DataActionKind(actionID)
			return ok
		}
	}
	if err := admin.RegisterDataPanels(registry, bound...); err != nil {
		t.Fatalf("register data panels: %v", err)
	}
	host, err := admin.NewConsoleHost(admin.ConsoleHostConfig{ID: "data", Title: "Data", Registry: registry, Events: stream, Enabled: func() bool { return true },
		RequestIdentity: func(router.Context) (console.Identity, error) { return dataConsoleIdentity, nil },
		Access: admin.ConsoleAccess{
			Resolve: func(ctx context.Context, identity console.Identity) (context.Context, console.Identity, error) {
				return ctx, identity, nil
			},
			Read:   func(context.Context, console.Identity) error { return nil },
			Panel:  func(context.Context, console.Identity, console.PanelDefinition) bool { return true },
			Action: execute,
			Record: func(context.Context, console.Identity, string, console.Record) bool { return true },
		},
		Snapshot: func(_ context.Context, _ console.Identity, panelID string) ([]console.Record, error) {
			return records[panelID], nil
		},
		RenderPage: func(router.Context, console.Bootstrap) error { return nil },
	})
	if err != nil {
		t.Fatalf("data console host: %v", err)
	}
	defer func() {
		if closeErr := host.Close(); closeErr != nil {
			t.Errorf("close data console host: %v", closeErr)
		}
		if closeErr := stream.Close(); closeErr != nil {
			t.Errorf("close data console stream: %v", closeErr)
		}
	}()
	snapshot, err := host.Snapshot(context.Background(), dataConsoleIdentity)
	if err != nil {
		t.Fatalf("data console snapshot: %v", err)
	}
	published := make([]console.Event, 0, len(events))
	for _, event := range events {
		event.Identity = dataConsoleIdentity
		sent, err := host.Events().Publish(event)
		if err != nil {
			t.Fatalf("publish %s/%s: %v", event.PanelID, event.Key, err)
		}
		published = append(published, sent)
	}
	return snapshot, published
}

func dataConsoleBootstrap(snapshot console.Snapshot) console.Bootstrap {
	return console.Bootstrap{Identity: dataConsoleIdentity, Title: "Data", URLs: dataConsoleRoutes(),
		PreferencesNamespace: "console:" + dataConsoleIdentity.Namespace(), Snapshot: snapshot}
}

// dataConsoleLiveEvents advance the representative state: the queued prepare
// starts, the preview target begins a switch, and a dataset leaves the catalog.
func (f dataConsoleFixtures) liveEvents() []console.Event {
	running := f.operation("op-0002", admindata.Prepare, admindata.Running, f.dstWeek, 2, func(op *admindata.Operation) {
		op.Result.Revision = 3
		op.Result.Phase = "allocating"
		op.Result.Progress = admindata.Progress{Stage: "allocate stage", Completed: 1, Total: 4}
	})
	switching := admin.DataOverviewRecord(admin.DataOverviewView{
		Targets: []admin.DataTargetView{{State: admindata.ActiveState{Target: admindata.TargetKey{ScopeKey: "synthetic-org", TargetID: "preview"},
			Transitioning: true, Activation: admindata.Activation{ReceiptID: "rcpt-ready-1", Generation: 3}}, Receipt: f.readyReceipt}},
		Counts: admin.DataOverviewCounts{Datasets: 1, Scenarios: 3, Running: 2},
	}, 6)
	removed := admin.DataDatasetRecord(admindata.Descriptor{Dataset: f.corpusB}, 2)
	return []console.Event{
		{PanelID: admin.DataPanelOperations, Record: admin.DataOperationRecord(running), Kind: console.EventUpsert},
		{PanelID: admin.DataPanelOverview, Record: switching, Kind: console.EventUpsert},
		{PanelID: admin.DataPanelDatasets, Record: console.Record{Key: removed.Key, Revision: removed.Revision}, Kind: console.EventDelete},
	}
}

// actions offers request options, captured generation, retained receipt and
// operation controls using the same Go declarations as the live module.
func (f dataConsoleFixtures) actions() *admin.DataPanelActions {
	generation := uint64(3)
	prepare := admindata.Input{Dataset: f.corpusA, Scenario: f.dstWeek, TargetID: "preview"}
	activate := admindata.Input{Dataset: f.corpusA, Scenario: f.emptyHistory, TargetID: "preview", ReceiptID: "rcpt-empty-1", ExpectedGeneration: &generation}
	retained := activate
	retained.ReceiptID = ""
	choices := []admin.DataActionChoice{
		{Kind: admindata.Prepare, Label: "Prepare dst-week v1 on preview", Input: prepare},
		{Kind: admindata.Activate, Label: "Activate rcpt-empty-1 (empty-history v1) at generation 3", Input: activate},
		{Kind: admindata.Activate, Label: "Activate another empty-history receipt", Input: retained, ReceiptInput: true},
		{Kind: admindata.Cancel, Label: "Cancel op-0003 (refresh ready v1)", Input: admindata.Input{TargetID: "preview", OperationID: "op-0003"}},
		{Kind: admindata.Recover, Label: "Recover op-0007", Input: admindata.Input{TargetID: "staging", OperationID: "op-0007"}},
	}
	return &admin.DataPanelActions{
		Choices: func(context.Context) ([]admin.DataActionChoice, error) { return choices, nil },
		Dispatch: func(context.Context, admindata.Kind, admindata.Input) (admindata.Result, error) {
			return admindata.Result{}, admindata.Error(admindata.CodeUnavailable)
		},
	}
}

func dataConsoleActionResults(t *testing.T) map[string]console.PanelActionResult {
	t.Helper()
	present := func(kind admindata.Kind, result admindata.Result, err error) console.PanelActionResult {
		presented, presentErr := admin.DataActionResult(kind, result, err)
		if presentErr != nil {
			t.Fatalf("present %s: %v", kind, presentErr)
		}
		return presented
	}
	return map[string]console.PanelActionResult{
		"accepted": present(admindata.Prepare, admindata.Result{OperationID: "op-0010", Kind: admindata.Prepare, State: admindata.Queued, Revision: 1, Phase: "accepted"}, nil),
		"invalid": present(admindata.Prepare, admindata.Result{OperationID: "op-0010", Kind: admindata.Prepare, State: admindata.Failed,
			Failure: &admindata.Failure{Code: admindata.CodeInvalid, Fields: map[string]string{"idempotency_key": "Request keys must be unique per request."}}}, nil),
		"stale": present(admindata.Activate, admindata.Result{}, admindata.Error(admindata.CodeStale)),
	}
}

func dataConsoleContractDocument(t *testing.T) map[string]any {
	t.Helper()
	fixtures := newDataConsoleFixtures()
	empty := map[string][]console.Record{admin.DataPanelOverview: {admin.DataOverviewRecord(admin.DataOverviewView{}, 1)}}
	operator, _ := dataConsoleHostSnapshot(t, fixtures.records(), nil, fixtures.actions())
	snapshot, events := dataConsoleHostSnapshot(t, fixtures.records(), fixtures.liveEvents(), nil)
	var overview console.PanelSnapshot
	for _, panel := range snapshot.Panels {
		if panel.ID == admin.DataPanelOverview {
			overview = panel
		}
	}
	return map[string]any{
		"bootstrap":          dataConsoleBootstrap(snapshot),
		"operator_bootstrap": dataConsoleBootstrap(operator),
		"action_results":     dataConsoleActionResults(t),
		"empty_bootstrap":    dataConsoleBootstrap(dataConsoleSnapshot(t, empty)),
		"events":             events,
		"widget":             admin.ConsolePanelWidgetPayload{Identity: dataConsoleIdentity, Panel: overview, Watermark: snapshot.Watermark},
	}
}

func assertDataConsoleGolden(t *testing.T, path string, encoded []byte) {
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
		t.Fatalf("%s drifted from the Data presentation or template; review the client impact and regenerate with UPDATE_CONSOLE_CONTRACT=1", path)
	}
}

func TestDataConsoleContractFixtureMatchesGoProjections(t *testing.T) {
	encoded, err := json.MarshalIndent(dataConsoleContractDocument(t), "", "  ")
	if err != nil {
		t.Fatalf("marshal data console contract: %v", err)
	}
	assertDataConsoleGolden(t, dataConsoleContractFixture, append(encoded, '\n'))
}

type dataConsoleTemplateLoader struct{ fsys fs.FS }

func (l dataConsoleTemplateLoader) Abs(_, name string) string { return name }

func (l dataConsoleTemplateLoader) Get(path string) (io.Reader, error) {
	data, err := fs.ReadFile(l.fsys, path)
	if err != nil {
		return nil, err
	}
	return bytes.NewReader(data), nil
}

func renderDataConsolePage(t *testing.T, bootstrap console.Bootstrap) string {
	t.Helper()
	encoded, err := json.Marshal(bootstrap)
	if err != nil {
		t.Fatalf("marshal bootstrap: %v", err)
	}
	set := pongo2.NewSet("data-console-page", dataConsoleTemplateLoader{fsys: client.Templates()})
	tpl, err := set.FromFile(admin.DataPageTemplate + ".html")
	if err != nil {
		t.Fatalf("parse data page: %v", err)
	}
	page, err := tpl.Execute(pongo2.Context{
		"adminURL":               func(path string) string { return "/admin/" + path },
		"asset_base_path":        "/admin",
		"base_path":              "/admin",
		"csrf_meta":              `<meta name="csrf-token" content="fixture-csrf">`,
		"title":                  bootstrap.Title,
		"console_id":             bootstrap.ConsoleID,
		"console_title":          bootstrap.Title,
		"console_bootstrap_json": string(encoded),
	})
	if err != nil {
		t.Fatalf("render data page: %v", err)
	}
	return page
}

func TestDataConsolePageFixtureMatchesPackagedTemplate(t *testing.T) {
	bootstrap := dataConsoleBootstrap(dataConsoleSnapshot(t, newDataConsoleFixtures().records()))
	assertDataConsoleGolden(t, dataConsolePageFixture, []byte(renderDataConsolePage(t, bootstrap)))
}

func TestDataConsolePageExtendsTheNeutralShellWithoutDebug(t *testing.T) {
	page := renderDataConsolePage(t, dataConsoleBootstrap(console.Snapshot{Identity: dataConsoleIdentity, Panels: []console.PanelSnapshot{}}))
	for _, fragment := range []string{
		`class="console-root" id="console-data" data-console-root data-console-id="data"`, `data-data-console-intro`,
		`data-console-page-actions data-console-for="console-data"`,
		`Preparing or verifying never changes what a target serves.`,
		`href="/admin/assets/dist/styles/console.css"`, `src="/admin/assets/dist/console/data.js"`,
		`<script type="application/json" data-console-bootstrap>`,
	} {
		if !strings.Contains(page, fragment) {
			t.Fatalf("data page omitted %q", fragment)
		}
	}
	// The Data entry mounts the root itself; the generic entry would mount it twice.
	if strings.Contains(page, "dist/console/index.js") {
		t.Fatal("data page also loads the generic console entry")
	}
	if regexp.MustCompile(`(?i)class="[^"]*\bdebug-|dist/debug/|styles/debug\.css|data-debug-root`).MatchString(page) {
		t.Fatal("data page loads or styles Debug")
	}
}

// TestDataConsoleViewBindsResolveAgainstProjectedRecords keeps declarations and
// projections in step: every declared bind must resolve in at least one
// representative row, and select filters must offer every projected value.
func TestDataConsoleViewBindsResolveAgainstProjectedRecords(t *testing.T) {
	encoded, err := json.Marshal(dataConsoleSnapshot(t, newDataConsoleFixtures().records()))
	if err != nil {
		t.Fatal(err)
	}
	var snapshot struct {
		Panels []struct {
			ID      string           `json:"id"`
			UI      map[string]any   `json:"ui"`
			Records []map[string]any `json:"records"`
		} `json:"panels"`
	}
	if err := json.Unmarshal(encoded, &snapshot); err != nil {
		t.Fatal(err)
	}
	seen := []string{}
	for _, panel := range snapshot.Panels {
		seen = append(seen, panel.ID)
		rows := make([]any, 0, len(panel.Records))
		for _, record := range panel.Records {
			rows = append(rows, record["data"])
		}
		view := dataObject(dataPath(panel.UI, "views.console"))
		if view == nil {
			t.Fatalf("panel %s has no console view", panel.ID)
		}
		if panel.ID == admin.DataPanelExplore {
			// Explore reads lazily through its controller: no records, no binds,
			// and its own guidance where no controller renders it.
			if len(rows) != 0 || dataString(view["renderer"]) != "cards" || dataString(view["empty"]) == "" {
				t.Fatalf("explore panel = %d records, view %v", len(rows), view)
			}
			continue
		}
		checkDataViewBinds(t, panel.ID, view, rows)
		checkDataFilterOptions(t, panel.ID, dataList(panel.UI["filters"]), rows)
	}
	slices.Sort(seen)
	want := admin.DataPanelIDs()
	slices.Sort(want)
	if !slices.Equal(seen, want) {
		t.Fatalf("served panels = %v, want %v", seen, want)
	}
}

func dataObject(value any) map[string]any {
	object, ok := value.(map[string]any)
	if !ok {
		return nil
	}
	return object
}

func dataList(value any) []any {
	list, ok := value.([]any)
	if !ok {
		return nil
	}
	return list
}

func dataString(value any) string {
	text, ok := value.(string)
	if !ok {
		return ""
	}
	return text
}

// dataPath resolves a declarative bind the way the console client does.
func dataPath(value any, bind string) any {
	bind = strings.TrimPrefix(strings.TrimSpace(bind), "$.")
	if bind == "" {
		return value
	}
	for part := range strings.SplitSeq(bind, ".") {
		object := dataObject(value)
		if object == nil {
			return nil
		}
		value = object[part]
	}
	return value
}

// checkDataViewBinds mirrors the console runtime: a list view renders one row
// per record, and any other view binds into the panel's single record.
func checkDataViewBinds(t *testing.T, panelID string, view map[string]any, rows []any) {
	t.Helper()
	switch renderer := dataString(view["renderer"]); renderer {
	case "table", "status_list", "timeline":
		checkDataRowBinds(t, panelID, view, rows)
	case "stack":
		if len(rows) != 1 {
			t.Fatalf("panel %s stack view needs exactly one record, got %d", panelID, len(rows))
		}
		for _, item := range dataList(view["sections"]) {
			section := dataObject(item)
			data := dataPath(rows[0], dataString(section["bind"]))
			if dataString(section["renderer"]) == "table" {
				checkDataRowBinds(t, panelID, section, dataList(data))
			} else {
				checkDataRowBinds(t, panelID, section, []any{data})
			}
		}
	default:
		t.Fatalf("panel %s uses unexpected renderer %q", panelID, renderer)
	}
}

func checkDataRowBinds(t *testing.T, panelID string, view map[string]any, rows []any) {
	t.Helper()
	options := dataObject(view["options"])
	binds := []string{}
	for _, key := range []string{"columns", "fields", "metrics", "chips"} {
		for _, item := range dataList(options[key]) {
			binds = append(binds, dataString(dataObject(item)["bind"]))
		}
	}
	for key, value := range options {
		if strings.HasSuffix(key, "_bind") {
			binds = append(binds, dataString(value))
		}
	}
	if len(binds) == 0 {
		t.Errorf("panel %s view %q declares no binds", panelID, dataString(view["title"]))
	}
	for _, bind := range binds {
		if bind == "" || !slices.ContainsFunc(rows, func(row any) bool { return dataPath(row, bind) != nil }) {
			t.Errorf("panel %s view %q bind %q resolves in no representative row", panelID, dataString(view["title"]), bind)
		}
	}
}

func checkDataFilterOptions(t *testing.T, panelID string, filters, rows []any) {
	t.Helper()
	for _, item := range filters {
		filter := dataObject(item)
		if dataString(filter["kind"]) != "select" {
			continue
		}
		options := []string{}
		for _, option := range dataList(filter["options"]) {
			options = append(options, dataString(option))
		}
		for _, row := range rows {
			if value := dataString(dataPath(row, dataString(filter["bind"]))); value != "" && !slices.Contains(options, value) {
				t.Errorf("panel %s filter %q cannot select projected value %q (options %v)", panelID, dataString(filter["id"]), value, options)
			}
		}
	}
}
