package admin

import (
	"github.com/goliatone/go-admin/console"
	admindata "github.com/goliatone/go-admin/data"
)

// Data explorer presentation. The Explore panel is read-only: the Data page's
// explorer controller (pkg/client/assets/src/console/data-explorer.ts) loads
// declared descriptions, bounded record samples and declared usage lazily from
// the Data module's explore routes. The panel carries no snapshot records;
// the controller derives exact selections from the already-authorized Datasets
// and Scenarios rows, and every explore read is authorized again by the
// service. Without the controller (a dashboard widget or an older client) the
// declared view renders its own guidance.

// DataPanelExplore is the read-only dataset explorer panel.
const DataPanelExplore = "explore"

// dataExplorePanelOrder places Explore after the lifecycle evidence tabs, so
// the approved lifecycle tab order stays intact.
const dataExplorePanelOrder = 65

func dataExplorePanelConfig() console.PanelConfig {
	return console.PanelConfig{
		Label:           "Explore",
		Icon:            "iconoir-compass",
		Category:        "data",
		Order:           dataExplorePanelOrder,
		Span:            12,
		SupportsToolbar: new(false),
		UI:              dataExploreUI(),
	}
}

func dataExploreUI() *console.PanelUI {
	view := console.PanelView("cards", "")
	view.Title = "Explore datasets"
	view.Description = "What each dataset contains, what each scenario is for and which application features declare a dependency on it."
	view.Empty = "Open the Data page to explore dataset descriptions, sample records and declared usage."
	ui := console.NewPanelUI(view, nil)
	ui.Count = &console.PanelUICount{Mode: console.PanelCountNone}
	return ui
}

// dataExploreRow adds the explorer's join key and exact selections to a
// scenario row: the catalog example, plus the prepared receipt the row already
// shows. Selections pin full lifecycle identity; they never carry a principal,
// scope or physical locator, and the service re-authorizes each one. Rows
// without a target cannot be explored.
func dataExploreRow(row map[string]any, view DataScenarioView, receipt *admindata.PreparationReceipt) {
	ref := view.Scenario
	row["dataset_key"] = dataDatasetKey(ref.Dataset)
	if view.TargetID == "" {
		return
	}
	selections := map[string]any{
		admindata.ExploreCatalog: admindata.ExploreSelection{Dataset: ref.Dataset, Scenario: ref, TargetID: view.TargetID, Context: admindata.ExploreCatalog},
	}
	if prepared, ok := dataExploreReceiptSelection(receipt, view.TargetID, admindata.ExplorePrepared, nil); ok && prepared.Scenario == ref {
		selections[admindata.ExplorePrepared] = prepared
	}
	row["explore"] = selections
}

// dataExploreActive is the exact active selection of a target row: its active
// receipt at the current generation. It is projected only when the row already
// shows that receipt, so it never reveals a receipt the overview withheld.
func dataExploreActive(row map[string]any, target DataTargetView) {
	activation := target.State.Activation
	receipt := target.Receipt
	if receipt == nil || receipt.ID == "" || receipt.ID != activation.ReceiptID || target.State.Transitioning || target.State.RecoveryRequired {
		return
	}
	generation := activation.Generation
	if selection, ok := dataExploreReceiptSelection(receipt, target.State.Target.TargetID, admindata.ExploreActive, &generation); ok {
		row["explore_active"] = selection
	}
}

func dataExploreReceiptSelection(receipt *admindata.PreparationReceipt, targetID, context string, generation *uint64) (admindata.ExploreSelection, bool) {
	if receipt == nil || receipt.ID == "" || receipt.ContentRevision == 0 || targetID == "" {
		return admindata.ExploreSelection{}, false
	}
	selection := admindata.ExploreSelection{Dataset: receipt.Dataset, Scenario: receipt.Scenario, TargetID: targetID, Context: context,
		ReceiptID: receipt.ID, ContentRevision: receipt.ContentRevision, Generation: generation}
	return selection, selection.Validate() == nil
}

// dataDatasetKey is the Datasets record key, shared by scenario rows so the
// explorer groups scenarios under their exact dataset version.
func dataDatasetKey(ref admindata.DatasetRef) string {
	return dataRecordKey("dataset", ref.Provider, ref.ID, ref.Version, ref.Digest)
}
