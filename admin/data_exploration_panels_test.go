package admin

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/goliatone/go-admin/console"
	admindata "github.com/goliatone/go-admin/data"
)

func dataExploreTestSelections(t *testing.T, record console.Record) map[string]admindata.ExploreSelection {
	t.Helper()
	row, ok := record.Data.(map[string]any)
	if !ok {
		t.Fatalf("record data = %T", record.Data)
	}
	encoded, err := json.Marshal(row["explore"])
	if err != nil {
		t.Fatal(err)
	}
	selections := map[string]admindata.ExploreSelection{}
	if string(encoded) != "null" {
		if err := json.Unmarshal(encoded, &selections); err != nil {
			t.Fatal(err)
		}
	}
	return selections
}

func TestDataExplorePanelIsReadOnlyAndLast(t *testing.T) {
	registry := console.NewPanelRegistry()
	if err := RegisterDataPanels(registry, DataPanelActions{
		Choices: func(context.Context) ([]DataActionChoice, error) { return nil, nil },
		Dispatch: func(context.Context, admindata.Kind, admindata.Input) (admindata.Result, error) {
			return admindata.Result{}, nil
		},
	}); err != nil {
		t.Fatal(err)
	}
	def, ok := registry.DefinitionForContext(context.Background(), DataPanelExplore)
	if !ok || def.Label != "Explore" || def.Order != dataExplorePanelOrder || len(def.UI.Actions) != 0 {
		t.Fatalf("explore panel = %+v", def)
	}
	if def.UI.Count == nil || def.UI.Count.Mode != console.PanelCountArrayLength || def.UI.Views.Console.Renderer != console.PanelRendererTable || def.UI.Views.Console.Empty == "" {
		t.Fatalf("explore view = %+v", def.UI)
	}
	ids := DataPanelIDs()
	if ids[len(ids)-1] != DataPanelExplore {
		t.Fatalf("panel ids = %v", ids)
	}
}

func TestDataScenarioRecordProjectsExactExploreSelections(t *testing.T) {
	scenario := dataPanelTestScenario("ready")
	receipt := &admindata.PreparationReceipt{ID: "rcpt-1", Dataset: scenario.Dataset, Scenario: scenario, ContentRevision: 2}
	record := DataScenarioRecord(DataScenarioView{Scenario: scenario, TargetID: "preview", Receipt: receipt}, 1)
	selections := dataExploreTestSelections(t, record)
	catalog, prepared := selections[admindata.ExploreCatalog], selections[admindata.ExplorePrepared]
	if catalog.Validate() != nil || catalog.Scenario != scenario || catalog.TargetID != "preview" || catalog.ReceiptID != "" {
		t.Fatalf("catalog selection = %+v", catalog)
	}
	if prepared.Validate() != nil || prepared.ReceiptID != "rcpt-1" || prepared.ContentRevision != 2 || prepared.Generation != nil {
		t.Fatalf("prepared selection = %+v", prepared)
	}
	if _, ok := selections[admindata.ExploreActive]; ok {
		t.Fatal("scenario rows never project an active selection")
	}
	row, ok := record.Data.(map[string]any)
	if !ok {
		t.Fatalf("record data = %T", record.Data)
	}
	if row["dataset_key"] != DataDatasetRecord(admindata.Descriptor{Dataset: scenario.Dataset}, 1).Key {
		t.Fatalf("dataset_key = %v", row["dataset_key"])
	}

	// A receipt for another scenario is not shown, so it is never explorable.
	other := dataPanelTestScenario("quiet")
	foreign := &admindata.PreparationReceipt{ID: "rcpt-2", Dataset: other.Dataset, Scenario: other, ContentRevision: 1}
	selections = dataExploreTestSelections(t, DataScenarioRecord(DataScenarioView{Scenario: scenario, TargetID: "preview", Receipt: foreign}, 1))
	if _, ok := selections[admindata.ExplorePrepared]; ok || len(selections) != 1 {
		t.Fatalf("foreign receipt projected: %+v", selections)
	}
	// Without a target there is nothing to explore.
	if selections = dataExploreTestSelections(t, DataScenarioRecord(DataScenarioView{Scenario: scenario}, 1)); len(selections) != 0 {
		t.Fatalf("targetless row projected: %+v", selections)
	}
}

func TestDataOverviewProjectsActiveSelectionOnlyForShownSettledReceipt(t *testing.T) {
	scenario := dataPanelTestScenario("ready")
	receipt := &admindata.PreparationReceipt{ID: "rcpt-1", Dataset: scenario.Dataset, Scenario: scenario, ContentRevision: 2}
	state := admindata.ActiveState{Target: admindata.TargetKey{ScopeKey: "org", TargetID: "preview"}, Activation: admindata.Activation{ReceiptID: "rcpt-1", Generation: 3, Ready: true}}
	active := func(view DataTargetView) (admindata.ExploreSelection, bool) {
		record := DataOverviewRecord(DataOverviewView{Targets: []DataTargetView{view}}, 1)
		fields, ok := record.Data.(map[string]any)
		if !ok {
			t.Fatalf("overview data = %T", record.Data)
		}
		row, ok := fields["primary"].(map[string]any)
		if !ok {
			t.Fatalf("primary data = %T", fields["primary"])
		}
		raw, ok := row["explore_active"]
		if !ok {
			return admindata.ExploreSelection{}, false
		}
		encoded, err := json.Marshal(raw)
		if err != nil {
			t.Fatal(err)
		}
		var selection admindata.ExploreSelection
		if err := json.Unmarshal(encoded, &selection); err != nil {
			t.Fatal(err)
		}
		return selection, true
	}
	selection, ok := active(DataTargetView{State: state, Receipt: receipt})
	if !ok || selection.Validate() != nil || selection.Context != admindata.ExploreActive || selection.Generation == nil || *selection.Generation != 3 || selection.ReceiptID != "rcpt-1" {
		t.Fatalf("active selection = %+v (%v)", selection, ok)
	}
	withheld := DataTargetView{State: state}
	switching := DataTargetView{State: state, Receipt: receipt}
	switching.State.Transitioning = true
	recovering := DataTargetView{State: state, Receipt: receipt}
	recovering.State.RecoveryRequired = true
	stale := DataTargetView{State: state, Receipt: &admindata.PreparationReceipt{ID: "rcpt-0", Dataset: scenario.Dataset, Scenario: scenario, ContentRevision: 1}}
	for name, view := range map[string]DataTargetView{"withheld receipt": withheld, "switching": switching, "recovery": recovering, "other receipt": stale} {
		if _, ok := active(view); ok {
			t.Fatalf("%s projected an active selection", name)
		}
	}
}
