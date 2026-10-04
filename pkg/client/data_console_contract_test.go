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
		Options: "/admin/data/api/panels/:panel/actions/:action/options/:field", Requests: "/admin/data/api/panels/:panel/requests/:request",
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

// presentation names corpus A for people; corpus B keeps identifiers, so the
// golden covers both the declared-title and the fallback paths.
func (f dataConsoleFixtures) presentation(ref admindata.DatasetRef) *admindata.DescriptorPresentation {
	if ref != f.corpusA {
		return nil
	}
	return &admindata.DescriptorPresentation{Title: "Customer corpus A", Summary: "Synthetic customers and their orders for sales reporting checks.",
		Scenarios: map[string]admindata.ScenarioPresentation{"ready": {Title: "Ready", Summary: "Three orders on one day."}, "empty-history": {Title: "Quiet", Summary: "No orders at all."}}}
}

// titles are the human names of a scenario and its dataset, as the module projects them.
func (f dataConsoleFixtures) titles(scenario admindata.ScenarioRef) (datasetTitle, scenarioTitle string) {
	presentation := f.presentation(scenario.Dataset)
	if presentation == nil {
		return "", ""
	}
	return presentation.Title, presentation.Scenarios[scenario.ID].Title
}

func (f dataConsoleFixtures) receipt(id string, scenario admindata.ScenarioRef, revision uint64, verification *admindata.VerificationResult) *admindata.PreparationReceipt {
	return &admindata.PreparationReceipt{ID: id, Target: admindata.TargetKey{ScopeKey: "synthetic-org", TargetID: "preview"},
		Dataset: scenario.Dataset, Scenario: scenario, ContentRevision: revision, Verification: verification}
}

func (f dataConsoleFixtures) verification(id string, revision uint64, status string) *admindata.VerificationResult {
	return &admindata.VerificationResult{ID: id, ContentRevision: revision, Checks: []admindata.Check{{ID: "customer-search", Label: "Customer search", Status: status}}}
}

func (f dataConsoleFixtures) capabilities(prepare admindata.Capability) map[admindata.Kind]admindata.Capability {
	available := admindata.Capability{Supported: true, Permitted: true}
	return map[admindata.Kind]admindata.Capability{
		admindata.Validate: available, admindata.Prepare: prepare, admindata.Refresh: available,
		admindata.Verify: available, admindata.Activate: available,
		admindata.Reset:    {Reason: "safe_reset_unavailable"},
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
			op.Result.Checks = []admindata.Check{{ID: "prerequisite.holiday-calendar", Label: "Holiday calendar present", Status: admindata.CheckFailed}}
		}),
		f.operation("op-0002", admindata.Prepare, admindata.Queued, f.dstWeek, 2, nil),
		f.operation("op-0003", admindata.Refresh, admindata.Running, f.ready, 3, func(op *admindata.Operation) {
			op.Result.Phase = "preparing"
			op.Result.Progress = admindata.Progress{Stage: "Seeding audiences", Completed: 40, Total: 100}
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

// dataConsoleChoice is one offered action with the row it belongs to and the
// emphasis the module would give it.
type dataConsoleChoice struct {
	choice   admin.DataActionChoice
	emphasis string
}

// choices mirror the module's offer for the representative state: each
// scenario's applicable work with its next step primary, a disabled
// not-permitted Prepare on corpus B, and cancel, recover and try again for the
// operations in the window.
func (f dataConsoleFixtures) choices() []dataConsoleChoice {
	generation := uint64(3)
	current := &admin.DataTargetSummary{TargetID: "preview", ScenarioTitle: "Ready", ReceiptID: "rcpt-ready-1", Generation: 3, Ready: true}
	steps := func(status string) []console.PanelUIStep {
		prepared := console.PanelUIStep{Label: "Prepared", State: console.PanelStepDone, Tone: console.PanelToneInfo}
		verified := console.PanelUIStep{Label: "Verified", State: console.PanelStepPending}
		active := console.PanelUIStep{Label: "Active", State: console.PanelStepPending}
		switch status {
		case "not_prepared":
			prepared = console.PanelUIStep{Label: "Prepared", State: console.PanelStepCurrent}
		case "prepared":
			verified.State = console.PanelStepCurrent
		case "verified":
			verified.State, verified.Tone, active.State = console.PanelStepDone, console.PanelToneSuccess, console.PanelStepCurrent
		case "active":
			verified.State, verified.Tone, active.State, active.Tone = console.PanelStepDone, console.PanelToneSuccess, console.PanelStepDone, console.PanelToneSuccess
		case "stale_verification":
			verified.Label, verified.State, verified.Tone = "Changed since verification", console.PanelStepWarning, console.PanelToneWarning
		}
		return []console.PanelUIStep{prepared, verified, active}
	}
	scenario := func(kind admindata.Kind, ref admindata.ScenarioRef, status, emphasis string, mutate func(*admin.DataActionChoice)) dataConsoleChoice {
		datasetTitle, title := f.titles(ref)
		if title == "" {
			title = ref.ID + " v" + ref.Version
		}
		choice := admin.DataActionChoice{Kind: kind, Label: strings.ToUpper(string(kind)[:1]) + string(kind)[1:], Title: title, DatasetTitle: datasetTitle, Steps: steps(status),
			Input: admindata.Input{Dataset: ref.Dataset, Scenario: ref, TargetID: "preview"}}
		if kind == admindata.Verify || kind == admindata.Activate {
			choice.ReceiptInput = true
		}
		if kind == admindata.Activate {
			choice.Input.ExpectedGeneration = &generation
			choice.Current = current
		}
		if mutate != nil {
			mutate(&choice)
		}
		return dataConsoleChoice{choice: choice, emphasis: emphasis}
	}
	receipt := func(id string) func(*admin.DataActionChoice) {
		return func(choice *admin.DataActionChoice) { choice.DefaultReceiptID = id }
	}
	notPermitted := func(choice *admin.DataActionChoice) {
		choice.Availability, choice.Reason = console.PanelActionNotPermitted, "Requires admin.data.prepare"
	}
	return []dataConsoleChoice{
		// Ready is active: routine work only.
		scenario(admindata.Refresh, f.ready, "active", "", nil),
		scenario(admindata.Validate, f.ready, "active", console.PanelActionEmphasisMenu, nil),
		scenario(admindata.Verify, f.ready, "active", console.PanelActionEmphasisMenu, receipt("rcpt-ready-1")),
		// Quiet is verified: activation is the next step.
		scenario(admindata.Activate, f.emptyHistory, "verified", console.PanelActionEmphasisPrimary, receipt("rcpt-empty-1")),
		scenario(admindata.Verify, f.emptyHistory, "verified", console.PanelActionEmphasisMenu, receipt("rcpt-empty-1")),
		scenario(admindata.Refresh, f.emptyHistory, "verified", console.PanelActionEmphasisMenu, nil),
		// dst-week is prepared: verification is next.
		scenario(admindata.Verify, f.dstWeek, "prepared", console.PanelActionEmphasisPrimary, receipt("rcpt-dst-1")),
		scenario(admindata.Refresh, f.dstWeek, "prepared", console.PanelActionEmphasisMenu, nil),
		scenario(admindata.Validate, f.dstWeek, "prepared", console.PanelActionEmphasisMenu, nil),
		// reprofiled changed since verification: verify again.
		scenario(admindata.Verify, f.reprofiled, "stale_verification", console.PanelActionEmphasisPrimary, receipt("rcpt-reprofiled-1")),
		// backfill is not prepared and this actor may not prepare corpus B.
		scenario(admindata.Prepare, f.fill, "not_prepared", console.PanelActionEmphasisPrimary, notPermitted),
		scenario(admindata.Validate, f.fill, "not_prepared", console.PanelActionEmphasisMenu, nil),
		{choice: admin.DataActionChoice{Kind: admindata.Cancel, Label: "Cancel", Title: "Ready", DatasetTitle: "Customer corpus A", Input: admindata.Input{TargetID: "preview", OperationID: "op-0003"}}},
		{choice: admin.DataActionChoice{Kind: admindata.Recover, Label: "Recover", Title: "Ready", DatasetTitle: "Customer corpus A", Input: admindata.Input{TargetID: "staging", OperationID: "op-0006"}}, emphasis: console.PanelActionEmphasisPrimary},
		{choice: admin.DataActionChoice{Kind: admindata.Activate, Label: "Try again", Title: "Quiet", DatasetTitle: "Customer corpus A", RetryOf: "op-0004", Current: current, Steps: steps("verified"),
			Input: admindata.Input{Dataset: f.corpusA, Scenario: f.emptyHistory, TargetID: "preview", ReceiptID: "rcpt-empty-1", ExpectedGeneration: &generation}}, emphasis: console.PanelActionEmphasisPrimary},
	}
}

func dataConsoleChoicePanels(choice admin.DataActionChoice) []string {
	if choice.Kind == admindata.Cancel || choice.Kind == admindata.Recover || choice.RetryOf != "" {
		return []string{admin.DataPanelOverview, admin.DataPanelOperations}
	}
	return []string{admin.DataPanelOverview, admin.DataPanelScenarios}
}

// scenarioRefs are a scenario row's references to the actions a panel declares.
func (f dataConsoleFixtures) scenarioRefs(panel string, scenario admindata.ScenarioRef, choices []dataConsoleChoice) []console.PanelUIActionRef {
	refs := []console.PanelUIActionRef{}
	for _, item := range choices {
		choice := item.choice
		if choice.RetryOf != "" || choice.Input.OperationID != "" || choice.Input.Scenario != scenario || !slices.Contains(dataConsoleChoicePanels(choice), panel) {
			continue
		}
		refs = append(refs, console.PanelUIActionRef{PanelID: panel, ActionID: admin.DataActionID(choice), Emphasis: item.emphasis})
	}
	return refs
}

// operationRefs are an operation row's cancel, recover and try-again references.
func (f dataConsoleFixtures) operationRefs(panel, operationID string, choices []dataConsoleChoice) []console.PanelUIActionRef {
	refs := []console.PanelUIActionRef{}
	for _, item := range choices {
		choice := item.choice
		if (choice.Input.OperationID != operationID && choice.RetryOf != operationID) || !slices.Contains(dataConsoleChoicePanels(choice), panel) {
			continue
		}
		refs = append(refs, console.PanelUIActionRef{PanelID: panel, ActionID: admin.DataActionID(choice), Emphasis: item.emphasis})
	}
	return refs
}

func (f dataConsoleFixtures) descriptor(ref admindata.DatasetRef, synthetic bool, scenarios []admindata.ScenarioRef, prerequisites []string, prepare admindata.Capability) admindata.Descriptor {
	return admindata.Descriptor{Dataset: ref, Synthetic: synthetic, Timezone: "America/Los_Angeles", Scenarios: scenarios,
		Components: []admindata.Component{{Path: "people.json", Digest: ref.Digest}}, Prerequisites: prerequisites,
		Counts: map[string]uint64{"people": 120, "orders": 40}, Capabilities: f.capabilities(prepare), Presentation: f.presentation(ref)}
}

// records project the representative state. With choices, rows carry the
// action references the operator's panels declare.
func (f dataConsoleFixtures) records(choices []dataConsoleChoice) map[string][]console.Record {
	operations := f.operations()
	operationView := func(panel string, op admindata.Operation) admin.DataOperationView {
		datasetTitle, scenarioTitle := f.titles(op.Input.Scenario)
		return admin.DataOperationView{Operation: op, DatasetTitle: datasetTitle, ScenarioTitle: scenarioTitle, Actions: f.operationRefs(panel, op.Result.OperationID, choices)}
	}
	opRecords := make([]console.Record, 0, len(operations))
	for _, op := range operations {
		opRecords = append(opRecords, admin.DataOperationViewRecord(operationView(admin.DataPanelOperations, op)))
	}
	scenarioView := func(panel string, scenario admindata.ScenarioRef, receipt *admindata.PreparationReceipt, active bool, updated int) admin.DataScenarioView {
		datasetTitle, title := f.titles(scenario)
		view := admin.DataScenarioView{Scenario: scenario, Receipt: receipt, Active: active, Title: title, DatasetTitle: datasetTitle}
		if title != "" {
			view.Summary = f.presentation(scenario.Dataset).Scenarios[scenario.ID].Summary
		}
		if scenario != f.fill {
			view.TargetID = "preview"
			view.Actions = f.scenarioRefs(panel, scenario, choices)
		}
		if updated > 0 {
			view.UpdatedAt = time.Date(2026, 10, 1, 9, updated, 0, 0, time.UTC)
		}
		return view
	}
	scenarios := func(panel string) []admin.DataScenarioView {
		return []admin.DataScenarioView{
			scenarioView(panel, f.ready, f.readyReceipt, true, 9),
			scenarioView(panel, f.emptyHistory, f.receipt("rcpt-empty-1", f.emptyHistory, 1, f.verification("ver-empty", 1, admindata.CheckPassed)), false, 8),
			scenarioView(panel, f.dstWeek, f.receipt("rcpt-dst-1", f.dstWeek, 1, nil), false, 10),
			scenarioView(panel, f.reprofiled, f.receipt("rcpt-reprofiled-1", f.reprofiled, 3, f.verification("ver-reprofiled", 2, admindata.CheckPassed)), false, 6),
			scenarioView(panel, f.fill, nil, false, 2),
		}
	}
	check := func(origin admindata.Kind, opID, verID string, scenario admindata.ScenarioRef, dryRun bool, check admindata.Check) console.Record {
		_, title := f.titles(scenario)
		receipt := ""
		if verID != "" {
			receipt = "rcpt-ready-1"
		}
		return admin.DataCheckRecord(admin.DataCheckView{Origin: origin, OperationID: opID, VerificationID: verID, ReceiptID: receipt, DryRun: dryRun, Check: check, Scenario: scenario, ScenarioTitle: title}, 1)
	}
	coverage := func(day, status string) console.Record {
		sample := admindata.SamplePeriod{LocalDay: day, Timezone: "America/Los_Angeles", EvidenceRef: "evidence/" + day}
		return admin.DataCoverageRecord(admin.DataCoverageView{VerificationID: "ver-ready", ReceiptID: "rcpt-ready-1", Coverage: admindata.Coverage{Status: status, Sample: sample}, Scenario: f.ready, ScenarioTitle: "Ready"}, 1)
	}
	latest := operations[3]
	recent := []admin.DataOperationView{}
	for _, op := range []admindata.Operation{operations[3], operations[2], operations[5], operations[1], operations[7]} {
		recent = append(recent, operationView(admin.DataPanelOverview, op))
	}
	upNext := []admin.DataScenarioView{}
	for _, view := range scenarios(admin.DataPanelOverview) {
		if !view.Active {
			upNext = append(upNext, view)
		}
	}
	scenarioRecords := []console.Record{}
	for _, view := range scenarios(admin.DataPanelScenarios) {
		scenarioRecords = append(scenarioRecords, admin.DataScenarioRecord(view, 1))
	}
	return map[string][]console.Record{
		admin.DataPanelOverview: {admin.DataOverviewRecord(admin.DataOverviewView{
			Targets: []admin.DataTargetView{
				{State: admindata.ActiveState{Target: admindata.TargetKey{ScopeKey: "synthetic-org", TargetID: "preview"}, Activation: admindata.Activation{ReceiptID: "rcpt-ready-1", Generation: 3, Ready: true}}, Receipt: f.readyReceipt, ScenarioTitle: "Ready", DatasetTitle: "Customer corpus A"},
				{State: admindata.ActiveState{Target: admindata.TargetKey{ScopeKey: "synthetic-org", TargetID: "staging"}, RecoveryRequired: true, PendingOperationID: "op-0006", Activation: admindata.Activation{ReceiptID: "rcpt-ready-0", Generation: 2}},
					Actions: f.operationRefs(admin.DataPanelOverview, "op-0006", choices)},
			},
			Capabilities:    f.capabilities(admindata.Capability{Supported: true, Permitted: true}),
			LatestOperation: &latest,
			Counts:          admin.DataOverviewCounts{Datasets: 2, Scenarios: 5, Running: 2, Failed: 1},
			Recent:          recent,
			UpNext:          upNext,
		}, 5)},
		admin.DataPanelExplore: {
			admin.DataDatasetRecord(f.descriptor(f.corpusA, true, []admindata.ScenarioRef{f.ready, f.emptyHistory, f.dstWeek}, []string{"audience-definitions"}, admindata.Capability{Supported: true, Permitted: true}), 1),
			admin.DataDatasetRecord(f.descriptor(f.corpusB, false, []admindata.ScenarioRef{f.reprofiled, f.fill}, []string{"holiday-calendar"}, admindata.Capability{Supported: true, Reason: "Requires admin.data.prepare"}), 1),
		},
		admin.DataPanelScenarios:  scenarioRecords,
		admin.DataPanelOperations: opRecords,
		admin.DataPanelVerification: {
			check(admindata.Validate, "op-0001", "", f.fill, false, admindata.Check{ID: "prerequisite.holiday-calendar", Label: "Holiday calendar present", Status: admindata.CheckFailed, Expected: "present", Actual: "missing"}),
			check(admindata.Verify, "", "ver-ready", f.ready, false, admindata.Check{ID: "customer-search", Label: "Customer search", Status: admindata.CheckPassed, Expected: "42 matches", Actual: "42 matches", EvidenceRef: "evidence/search"}),
			check(admindata.Verify, "", "ver-ready", f.ready, false, admindata.Check{ID: "report-export", Label: "Report export", Status: admindata.CheckFailed, Expected: "120 rows", Actual: "118 rows", EvidenceRef: "evidence/export"}),
			check(admindata.Verify, "", "ver-ready", f.ready, false, admindata.Check{ID: "analytics-render", Status: admindata.CheckUnavailable}),
			check(admindata.Verify, "", "ver-ready", f.ready, false, admindata.Check{ID: "source-identity", Label: "Source matches the catalog", Status: admindata.CheckPassed, Expected: strings.Repeat("a", 64), Actual: strings.Repeat("a", 64)}),
			check(admindata.Verify, "op-0009", "", f.dstWeek, true, admindata.Check{ID: "report-export", Label: "Report export", Status: admindata.CheckPlanned, Expected: "120 rows"}),
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

// dataConsoleClientContext advertises every console workflow capability, as
// the shipped Data page does, so capability-gated declarations are served.
func dataConsoleClientContext() context.Context {
	return console.WithClientCapabilities(context.Background(), console.ParseClientCapabilities(strings.Join(console.ClientCapabilityIDs(), ",")))
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
	snapshot, err := host.Snapshot(dataConsoleClientContext(), dataConsoleIdentity)
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
		op.Result.Progress = admindata.Progress{Stage: "Allocating stage", Completed: 1, Total: 4}
	})
	switching := admin.DataOverviewRecord(admin.DataOverviewView{
		Targets: []admin.DataTargetView{{State: admindata.ActiveState{Target: admindata.TargetKey{ScopeKey: "synthetic-org", TargetID: "preview"},
			Transitioning: true, Activation: admindata.Activation{ReceiptID: "rcpt-ready-1", Generation: 3}}, Receipt: f.readyReceipt, ScenarioTitle: "Ready", DatasetTitle: "Customer corpus A"}},
		Counts: admin.DataOverviewCounts{Datasets: 1, Scenarios: 3, Running: 2},
	}, 6)
	removed := admin.DataDatasetRecord(admindata.Descriptor{Dataset: f.corpusB}, 2)
	return []console.Event{
		{PanelID: admin.DataPanelOperations, Record: admin.DataOperationViewRecord(admin.DataOperationView{Operation: running, DatasetTitle: "Customer corpus A"}), Kind: console.EventUpsert},
		{PanelID: admin.DataPanelOverview, Record: switching, Kind: console.EventUpsert},
		{PanelID: admin.DataPanelExplore, Record: console.Record{Key: removed.Key, Revision: removed.Revision}, Kind: console.EventDelete},
	}
}

// actions offers the fixture choices through the same Go declarations as the
// live module: generated request IDs under Advanced, receipt pickers, Preview
// plan, structured confirmations and visible not-permitted work.
func (f dataConsoleFixtures) actions() *admin.DataPanelActions {
	choices := []admin.DataActionChoice{}
	for _, item := range f.choices() {
		choices = append(choices, item.choice)
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
	present := func(kind admindata.Kind, result admindata.Result, err error, labels admin.DataActionLabels) console.PanelActionResult {
		presented, presentErr := admin.DataActionResultFor(kind, result, err, labels)
		if presentErr != nil {
			t.Fatalf("present %s: %v", kind, presentErr)
		}
		return presented
	}
	labels := admin.DataActionLabels{Scenario: "dst-week v1", Target: "preview"}
	return map[string]console.PanelActionResult{
		"accepted": present(admindata.Prepare, admindata.Result{OperationID: "op-0010", Kind: admindata.Prepare, State: admindata.Queued, Revision: 1, Phase: "accepted"}, nil, labels),
		"planned": present(admindata.Prepare, admindata.Result{OperationID: "op-0011", Kind: admindata.Prepare, State: admindata.Succeeded, Revision: 2, DryRun: true,
			Checks: []admindata.Check{{ID: "prepare-plan", Status: admindata.CheckPlanned}}}, nil, labels),
		"invalid": present(admindata.Prepare, admindata.Result{OperationID: "op-0010", Kind: admindata.Prepare, State: admindata.Failed,
			Failure: &admindata.Failure{Code: admindata.CodeInvalid, Fields: map[string]string{"batch_limit": "Enter a whole number from 1 to 10000."}}}, nil, labels),
		"stale": present(admindata.Activate, admindata.Result{}, admindata.Error(admindata.CodeStale), admin.DataActionLabels{Scenario: "Quiet", Target: "preview"}),
	}
}

func dataConsoleContractDocument(t *testing.T) map[string]any {
	t.Helper()
	fixtures := newDataConsoleFixtures()
	empty := map[string][]console.Record{admin.DataPanelOverview: {admin.DataOverviewRecord(admin.DataOverviewView{}, 1)}}
	operator, _ := dataConsoleHostSnapshot(t, fixtures.records(fixtures.choices()), nil, fixtures.actions())
	snapshot, events := dataConsoleHostSnapshot(t, fixtures.records(nil), fixtures.liveEvents(), nil)
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
	bootstrap := dataConsoleBootstrap(dataConsoleSnapshot(t, newDataConsoleFixtures().records(nil)))
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
	fixtures := newDataConsoleFixtures()
	encoded, err := json.Marshal(dataConsoleSnapshot(t, fixtures.records(fixtures.choices())))
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
	case "table", "status_list", "timeline", "cards", "list":
		checkDataRowBinds(t, panelID, view, rows)
	case "stack":
		if len(rows) != 1 {
			t.Fatalf("panel %s stack view needs exactly one record, got %d", panelID, len(rows))
		}
		for _, item := range dataList(view["sections"]) {
			section := dataObject(item)
			data := dataPath(rows[0], dataString(section["bind"]))
			switch dataString(section["renderer"]) {
			case "table", "cards", "list":
				checkDataRowBinds(t, panelID, section, dataList(data))
			default:
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
