package quickstart

import (
	"testing"

	debugregistry "github.com/goliatone/go-admin/debug"
)

func TestRegisterScopeDebugPanelExposesRichUI(t *testing.T) {
	debugregistry.UnregisterPanel(ScopeDebugPanelID)
	defer debugregistry.UnregisterPanel(ScopeDebugPanelID)

	RegisterScopeDebugPanel(NewScopeDebugBuffer(10))
	def, ok := debugregistry.PanelDefinitionFor(ScopeDebugPanelID)
	if !ok {
		t.Fatalf("expected scope panel definition")
	}
	if def.UI == nil || def.UI.Views.Console == nil || def.UI.Views.Toolbar == nil {
		t.Fatalf("expected scope rich ui views, got %+v", def.UI)
	}
	if def.Icon != "iconoir-gps" {
		t.Fatalf("expected scope panel to use a bundled iconoir gps icon, got %q", def.Icon)
	}
	if def.UI.Count == nil || def.UI.Count.Bind != "entries" {
		t.Fatalf("expected scope count policy, got %+v", def.UI.Count)
	}
	if len(def.UI.Actions) != 1 || def.UI.Actions[0].ID != "clear" {
		t.Fatalf("expected scope clear action, got %+v", def.UI.Actions)
	}
}
