package console_test

import (
	"context"
	"encoding/json"
	"strings"
	"testing"

	"github.com/goliatone/go-admin/console"
	"github.com/goliatone/go-admin/debug"
)

func TestRegistriesAndLegacyFacadeAreIndependent(t *testing.T) {
	a, b := console.NewPanelRegistry(), console.NewPanelRegistry()
	for n, registry := range []*console.PanelRegistry{a, b} {
		if err := registry.Register("operations", console.PanelConfig{
			Snapshot: func(context.Context) any { return n },
			UI:       console.NewPanelUI(console.TableView(""), nil),
		}); err != nil {
			t.Fatal(err)
		}
	}
	if err := a.Register("operations", console.PanelConfig{}); err == nil {
		t.Fatal("duplicate replaced callback")
	}
	for n, registry := range []*console.PanelRegistry{a, b} {
		reg, ok := registry.Registration("operations")
		if !ok || reg.Snapshot(context.Background()) != n {
			t.Fatal("registry callback crossed instance")
		}
	}
	if _, ok := debug.Panel("operations"); ok {
		t.Fatal("neutral registration reached Debug default")
	}
	// Alias compatibility includes function signatures, not just JSON values.
	var legacy debug.PanelActionHandler = func(_ context.Context, req console.PanelActionRequest) (console.PanelActionResult, error) {
		return debug.PanelActionResult{OK: req.PanelID == "operations"}, nil
	}
	neutral := legacy
	result, err := neutral(context.Background(), debug.PanelActionRequest{PanelID: "operations"})
	if err != nil || !result.OK {
		t.Fatal("legacy callback signature changed")
	}
}

func TestIdentityNamespaceIncludesAllBoundaries(t *testing.T) {
	i := console.Identity{ConsoleID: "data", ApplicationID: "app", EnvironmentID: "dev", ActorID: "alice", ScopeKey: "org"}
	variants := []console.Identity{i, {ConsoleID: "debug", ApplicationID: "app", EnvironmentID: "dev", ActorID: "alice", ScopeKey: "org"}, {ConsoleID: "data", ApplicationID: "app", EnvironmentID: "dev", ActorID: "bob", ScopeKey: "org"}}
	seen := map[string]bool{}
	for _, identity := range variants {
		if !identity.Valid() || seen[identity.Namespace()] {
			t.Fatal("identity namespace collided")
		}
		seen[identity.Namespace()] = true
	}
}

func workflowRegistry(t *testing.T, filter console.PanelDefinitionFilter) *console.PanelRegistry {
	t.Helper()
	minimum, maximum := 1.0, 10000.0
	handler := func(context.Context, console.PanelActionRequest) (console.PanelActionResult, error) {
		return console.PanelActionResult{OK: true}, nil
	}
	registry := console.NewPanelRegistry()
	if err := registry.Register("scenarios", console.PanelConfig{
		Definition: filter,
		UI: &console.PanelUI{
			Views: console.PanelUIViews{Console: &console.PanelUIView{
				Renderer: console.PanelRendererCards, Title: "Targets", Description: "What each target serves",
				Empty: "No active dataset.", Link: &console.PanelUILink{Label: "All scenarios", PanelID: "Scenarios"},
				Actions: []console.PanelUIActionRef{{PanelID: "scenarios", ActionID: "refresh", Emphasis: "PRIMARY"}, {PanelID: "scenarios", ActionID: "refresh"}, {PanelID: "bad id", ActionID: "x"}},
				Options: map[string]any{"title_bind": "target", "tone_bind": "status_tone", "actions_bind": "actions", "max_cards": 4},
			}},
			ActionLayout: &console.PanelUIActionLayout{Mode: "DRAWER"},
			Actions: []console.PanelUIAction{
				{
					ID: "refresh", Label: "Refresh", RequestScope: "refresh:preview",
					Fields: []console.PanelUIActionField{
						{Name: "request_id", Label: "Request ID", Generate: "request_id", Advanced: true, Default: "reused-key"},
						{Name: "dry_run", Kind: console.PanelFieldKindHidden, Default: false},
						{Name: "batch_limit", Kind: "integer", Min: &minimum, Max: &maximum},
						{Name: "receipt", Kind: "select", OptionSource: &console.PanelUIActionOptionSource{ID: "receipts", Paginated: true, Searchable: true}},
					},
					Secondary: &console.PanelUIActionSubmit{Label: "Preview plan", Field: "dry_run", Value: true},
					Drawer: &console.PanelUIActionDrawer{
						Eyebrow: "Refresh · preview", Title: "Refresh ready v1", Effect: "preview keeps serving its receipt.", EffectTone: "INFO",
						Steps:   []console.PanelUIStep{{Label: "Prepare", State: "current"}, {Label: "Verify", State: "bogus", Tone: "pink"}, {Label: "<b>x</b>"}},
						Details: []console.PanelUIDetail{{Label: "Dataset", Value: "crm/corpus-a v1"}, {Label: "Script", Value: "<script>"}},
					},
					Confirmation: &console.PanelUIActionConfirmation{Title: "Activate?", Changes: []console.PanelUIChange{{Label: "Generation", Before: "3", After: "4", Format: "number"}}, Tone: "warning"},
				},
				{ID: "reset", Label: "Reset", Availability: console.PanelActionUnsupported, Reason: "This target has no safe reset.", Payload: map[string]any{"target": "preview"}, Fields: []console.PanelUIActionField{{Name: "confirm"}}},
				{ID: "verify", Label: "Verify", Availability: "stale-ish"},
				{ID: "orphan", Label: "Orphan"},
				{ID: "plain", Label: "Plain", Secondary: &console.PanelUIActionSubmit{Label: "Preview", Field: "note", Value: true}, Fields: []console.PanelUIActionField{{Name: "note", Kind: "text"}}},
			},
		},
		Actions: map[string]console.PanelActionHandler{"refresh": handler, "plain": handler, "reset": handler},
	}); err != nil {
		t.Fatal(err)
	}
	return registry
}

func TestWorkflowPrimitivesNormalizeAdditivelyAndFailSafe(t *testing.T) {
	registry := workflowRegistry(t, nil)
	def, ok := registry.DefinitionForContext(context.Background(), "scenarios")
	if !ok || def.UI == nil || def.UI.Views.Console == nil {
		t.Fatal("cards view was dropped")
	}
	view := def.UI.Views.Console
	if view.Renderer != console.PanelRendererCards || view.Description == "" || view.Empty != "No active dataset." ||
		view.Link == nil || view.Link.PanelID != "scenarios" || len(view.Actions) != 1 || view.Actions[0].Emphasis != console.PanelActionEmphasisPrimary {
		t.Fatalf("view metadata = %+v", view)
	}
	if def.UI.ActionLayout == nil || def.UI.ActionLayout.Mode != console.PanelActionLayoutDrawer {
		t.Fatalf("drawer layout = %+v", def.UI.ActionLayout)
	}
	actions := map[string]console.PanelUIAction{}
	for _, action := range def.UI.Actions {
		actions[action.ID] = action
	}
	if _, kept := actions["orphan"]; kept {
		t.Fatal("an executable declaration without a handler survived")
	}

	refresh := actions["refresh"]
	if got := strings.Join(refresh.Requires, ","); got != console.ClientCapabilityRequestID+","+console.ClientCapabilitySecondarySubmit {
		t.Fatalf("implied requirements = %q", got)
	}
	generated := refresh.Fields[0]
	if generated.Generate != console.PanelFieldGenerateRequestID || generated.Default != nil || !generated.Required || !generated.Advanced {
		t.Fatalf("generated field must be required, advanced and carry no value: %+v", generated)
	}
	if bounds := refresh.Fields[2]; bounds.Min == nil || *bounds.Min != 1 || bounds.Max == nil || *bounds.Max != 10000 {
		t.Fatalf("numeric bounds = %+v", bounds)
	}
	if source := refresh.Fields[3].OptionSource; source == nil || !source.Paginated || !source.Searchable {
		t.Fatalf("paginated source = %+v", source)
	}
	if refresh.Secondary == nil || refresh.Secondary.Field != "dry_run" || refresh.Secondary.Value != true || refresh.RequestScope != "refresh:preview" {
		t.Fatalf("secondary submit = %+v scope=%q", refresh.Secondary, refresh.RequestScope)
	}
	drawer := refresh.Drawer
	if drawer == nil || drawer.EffectTone != console.PanelToneInfo || len(drawer.Steps) != 2 || drawer.Steps[1].State != console.PanelStepPending ||
		drawer.Steps[1].Tone != "" || len(drawer.Details) != 2 || drawer.Details[1].Value != "" {
		t.Fatalf("drawer = %+v", drawer)
	}
	if refresh.Confirmation == nil || refresh.Confirmation.Changes[0].After != "4" || refresh.Confirmation.Tone != console.PanelToneWarning {
		t.Fatalf("confirmation = %+v", refresh.Confirmation)
	}
	if !refresh.Executable() || !console.PanelDefinitionHasAction(def, "refresh") {
		t.Fatal("refresh must stay executable")
	}

	reset := actions["reset"]
	if reset.Executable() || reset.Availability != console.PanelActionUnsupported || reset.Reason != "This target has no safe reset." ||
		reset.Payload != nil || reset.Fields != nil || strings.Join(reset.Requires, ",") != console.ClientCapabilityActionAvailability {
		t.Fatalf("unavailable declarations must be display metadata only: %+v", reset)
	}
	if verify := actions["verify"]; verify.Availability != console.PanelActionUnavailable || verify.Reason == "" {
		t.Fatalf("unknown availability must fail closed: %+v", verify)
	}
	if console.PanelDefinitionHasAction(def, "reset") || console.PanelDefinitionHasAction(def, "verify") {
		t.Fatal("unavailable declarations must not count as dispatchable")
	}
	reg, _ := registry.Registration("scenarios")
	if reg.ActionHandlerForContext(context.Background(), "reset") != nil {
		t.Fatal("a handler for an unavailable declaration must not resolve")
	}
	if plain := actions["plain"]; plain.Secondary != nil || len(plain.Requires) != 0 {
		t.Fatalf("a secondary submit must set a declared hidden/boolean field: %+v", plain)
	}
}

func TestLegacyDefinitionsKeepTheirWireShape(t *testing.T) {
	registry := console.NewPanelRegistry()
	if err := registry.Register("operations", console.PanelConfig{
		UI: &console.PanelUI{Views: console.PanelUIViews{Console: console.TableView("")}, Actions: []console.PanelUIAction{{
			ID: "preview", Label: "Preview", Fields: []console.PanelUIActionField{{Name: "dataset", Kind: "select", Options: []string{"baseline"}}},
		}}},
		Actions: map[string]console.PanelActionHandler{"preview": func(context.Context, console.PanelActionRequest) (console.PanelActionResult, error) {
			return console.PanelActionResult{OK: true}, nil
		}},
	}); err != nil {
		t.Fatal(err)
	}
	def, _ := registry.DefinitionForContext(context.Background(), "operations")
	encoded, err := json.Marshal(def)
	if err != nil {
		t.Fatal(err)
	}
	for _, key := range []string{"availability", "requires", "reason", "secondary_submit", "drawer", "confirmation", "request_scope", "generate", "advanced", `"min"`, `"max"`, "description", `"empty"`, `"link"`} {
		if strings.Contains(string(encoded), key) {
			t.Fatalf("legacy definition gained %s: %s", key, encoded)
		}
	}
	if !console.PanelDefinitionHasAction(def, "preview") {
		t.Fatal("legacy actions stay executable")
	}
}

func TestDefinitionFiltersCannotMutateStoredWorkflowMetadata(t *testing.T) {
	registry := workflowRegistry(t, func(_ context.Context, def console.PanelDefinition) console.PanelDefinition {
		for index := range def.UI.Actions {
			action := &def.UI.Actions[index]
			if action.Drawer != nil {
				action.Drawer.Title = "mutated"
				action.Drawer.Steps[0].Label = "mutated"
			}
			if action.Secondary != nil {
				action.Secondary.Value = false
			}
			for fieldIndex := range action.Fields {
				if action.Fields[fieldIndex].Min != nil {
					*action.Fields[fieldIndex].Min = 99
				}
			}
		}
		return def
	})
	for range 2 {
		reg, _ := registry.Registration("scenarios")
		for _, action := range reg.Definition.UI.Actions {
			if action.ID != "refresh" {
				continue
			}
			if action.Drawer.Title != "Refresh ready v1" || action.Drawer.Steps[0].Label != "Prepare" || action.Secondary.Value != true || *action.Fields[2].Min != 1 {
				t.Fatalf("filter mutated stored metadata: %+v", action)
			}
		}
		_, _ = registry.DefinitionForContext(context.Background(), "scenarios")
	}
}

func TestClientCapabilityHandshakeIsBoundedCompatibilityMetadata(t *testing.T) {
	legacy := console.ClientCapabilitiesFromContext(context.Background())
	if legacy.Mode != console.ClientCapabilitiesLegacy || legacy.Covers([]string{console.ClientCapabilityRequestID}) || !legacy.Covers(nil) {
		t.Fatalf("missing handshake must be a legacy client: %+v", legacy)
	}
	caps := console.ParseClientCapabilities(" Request_ID.v1, action_availability.v1,bad id,<x>,," + strings.Repeat("a,", 40))
	if caps.Mode != console.ClientCapabilitiesAdvertised || !caps.Has(console.ClientCapabilityRequestID) || !caps.Has(console.ClientCapabilityActionAvailability) {
		t.Fatalf("advertised capabilities = %+v", caps.List())
	}
	if caps.Has("bad id") || len(caps.List()) > 16 || caps.Covers([]string{console.ClientCapabilitySecondarySubmit}) {
		t.Fatalf("invalid or missing capabilities must not count: %v", caps.List())
	}
	if console.ParseClientCapabilities(strings.Repeat("x", 2048)).Mode != console.ClientCapabilitiesLegacy {
		t.Fatal("oversized handshakes are ignored")
	}
	page := console.PageClientCapabilities()
	if page.Covers([]string{console.ClientCapabilityRequestID}) {
		t.Fatal("a page bootstrap never advertises execution capabilities")
	}
	ctx := console.WithClientCapabilities(context.Background(), caps)
	if !console.ClientCapabilitiesFromContext(ctx).Has(console.ClientCapabilityRequestID) {
		t.Fatal("context round trip lost the handshake")
	}
}

func TestOutcomeOptionAndRequestSanitizers(t *testing.T) {
	result := console.NormalizePanelActionResult(console.PanelActionResult{
		OK: false, Tone: "Purple", Code: "stale generation!", Planned: true,
		Record:   &console.PanelUIRecordRef{PanelID: "Operations", RecordKey: "op-1"},
		FollowUp: []console.PanelUIActionRef{{PanelID: "operations", ActionID: "recover"}, {PanelID: "", ActionID: "x"}},
	})
	if result.Tone != "" || result.Code != "" || result.Record == nil || result.Record.PanelID != "operations" || len(result.FollowUp) != 1 || !result.Planned {
		t.Fatalf("result = %+v", result)
	}
	if console.NormalizePanelActionResult(console.PanelActionResult{Record: &console.PanelUIRecordRef{PanelID: "ops", RecordKey: "<x>"}}).Record != nil {
		t.Fatal("unsafe record keys are dropped")
	}

	query := console.NormalizePanelOptionQuery(console.PanelOptionQuery{Limit: 500, Search: strings.Repeat("q", 200), Cursor: "c\n", Values: []string{"a", "", "<b>", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l"}})
	if query.Limit != console.PanelOptionPageMax || query.Search != "" || query.Cursor != "" || len(query.Values) != console.PanelOptionValuesMax {
		t.Fatalf("option query = %+v", query)
	}
	if console.NormalizePanelOptionQuery(console.PanelOptionQuery{}).Limit != console.PanelOptionPageDefault {
		t.Fatal("default option page size")
	}
	page := console.NormalizePanelOptionPage(console.PanelOptionPage{
		Items:      []console.PanelUIActionOption{{Value: "r1", Label: "Receipt 1"}, {Value: "r1"}, {Value: "<r2>"}, {Value: "r3"}},
		NextCursor: strings.Repeat("c", 600),
	}, 1)
	if len(page.Items) != 1 || page.Items[0].Value != "r1" || page.NextCursor != "" {
		t.Fatalf("option page = %+v", page)
	}
	if empty := console.NormalizePanelOptionPage(console.PanelOptionPage{}, 10); empty.Items == nil {
		t.Fatal("an empty page encodes items as []")
	}

	status := console.NormalizePanelRequestStatus(console.PanelRequestStatus{Status: "Claimed", RetryUntil: "2026-10-03T10:00:00+02:00", Result: &console.PanelActionResult{OK: true, Tone: "success"}})
	if status.Status != console.PanelRequestClaimed || status.RetryUntil != "2026-10-03T08:00:00Z" || status.Result == nil || status.Result.Tone != console.PanelToneSuccess {
		t.Fatalf("claimed status = %+v", status)
	}
	unknown := console.NormalizePanelRequestStatus(console.PanelRequestStatus{Status: "retry-now", RetryUntil: "tomorrow", Result: &console.PanelActionResult{OK: true}})
	if unknown.Status != console.PanelRequestUnknown || unknown.Result != nil || unknown.RetryUntil != "" {
		t.Fatalf("unknown status must never carry a result: %+v", unknown)
	}
	for value, want := range map[string]bool{
		"0b7e2c4a-1f3d-4c5e-9a8b-7c6d5e4f3a2b": true, "0B7E2C4A-1F3D-4C5E-9A8B-7C6D5E4F3A2B": true,
		"0b7e2c4a1f3d4c5e9a8b7c6d5e4f3a2b": false, "": false, "0b7e2c4a-1f3d-4c5e-9a8b-7c6d5e4f3a2g": false,
	} {
		if console.ValidRequestID(value) != want {
			t.Fatalf("ValidRequestID(%q) != %v", value, want)
		}
	}
}

func TestRequestScopedFilterDeclarationsFailClosed(t *testing.T) {
	registry := console.NewPanelRegistry()
	if err := registry.Register("overview", console.PanelConfig{
		UI: console.NewPanelUI(console.TableView(""), nil),
		Definition: func(_ context.Context, def console.PanelDefinition) console.PanelDefinition {
			ui := *def.UI
			ui.Actions = []console.PanelUIAction{
				{ID: "prepare-a", Label: "Prepare", Fields: []console.PanelUIActionField{
					{Name: "request_id", Generate: "REQUEST_ID", Default: "shared-key"},
					{Name: "dry_run", Kind: "Hidden"},
				}, Secondary: &console.PanelUIActionSubmit{Label: "Preview plan", Field: "dry_run", Value: true}},
				{ID: "reset-a", Label: "Reset", Availability: "Not_Permitted", Payload: map[string]any{"target": "preview"},
					Fields: []console.PanelUIActionField{{Name: "confirm"}}, RequestScope: "reset:preview"},
			}
			ui.Views.Console = &console.PanelUIView{Renderer: "table", Empty: "<b>none</b>", Actions: []console.PanelUIActionRef{{PanelID: "Overview", ActionID: "prepare-a"}}}
			def.UI = &ui
			return def
		},
		ActionResolver: func(context.Context, string) console.PanelActionHandler {
			return func(context.Context, console.PanelActionRequest) (console.PanelActionResult, error) {
				return console.PanelActionResult{OK: true}, nil
			}
		},
	}); err != nil {
		t.Fatal(err)
	}
	def, _ := registry.DefinitionForContext(context.Background(), "overview")
	prepare, _ := console.PanelDefinitionAction(def, "prepare-a")
	if got := strings.Join(prepare.Requires, ","); got != console.ClientCapabilityRequestID+","+console.ClientCapabilitySecondarySubmit ||
		prepare.Fields[0].Default != nil || !prepare.Fields[0].Required || prepare.Fields[1].Kind != console.PanelFieldKindHidden {
		t.Fatalf("filter-built workflow action was not normalized: %+v", prepare)
	}
	reset, _ := console.PanelDefinitionAction(def, "reset-a")
	if reset.Executable() || reset.Availability != console.PanelActionNotPermitted || reset.Payload != nil || reset.Fields != nil ||
		reset.RequestScope != "" || reset.Reason == "" {
		t.Fatalf("filter-built unavailable action kept executable parts: %+v", reset)
	}
	if view := def.UI.Views.Console; view.Empty != "" || len(view.Actions) != 1 || view.Actions[0].PanelID != "overview" {
		t.Fatalf("filter-built view metadata = %+v", view)
	}
	reg, _ := registry.Registration("overview")
	if reg.ActionHandlerForContext(context.Background(), "reset-a") != nil || reg.ActionHandlerForContext(context.Background(), "prepare-a") == nil {
		t.Fatal("resolver dispatch must follow request-scoped executability")
	}
}
