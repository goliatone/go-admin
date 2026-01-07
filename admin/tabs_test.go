package admin

import (
	"context"
	"errors"
	"testing"
)

type allowAuthorizer struct{}

func (allowAuthorizer) Can(context.Context, string, string) bool { return true }

type denyAuthorizer struct{}

func (denyAuthorizer) Can(context.Context, string, string) bool { return false }

func TestDerivePanelTabIDDeterministic(t *testing.T) {
	tab := PanelTab{
		Label:  "User Activity",
		Target: PanelTabTarget{Type: "panel", Panel: "activity"},
	}
	if got, want := derivePanelTabID(tab), "user-activity:panel-activity"; got != want {
		t.Fatalf("expected %q, got %q", want, got)
	}
}

func TestNormalizePanelTabDefaultsScopeAndContexts(t *testing.T) {
	tab := PanelTab{
		ID:     "tab",
		Label:  "Tab",
		Target: PanelTabTarget{Type: "panel", Panel: "users"},
	}
	normalized := normalizePanelTab(tab)
	if normalized.Scope != PanelTabScopeList {
		t.Fatalf("expected default scope list, got %q", normalized.Scope)
	}
	if len(normalized.Contexts) != 1 || normalized.Contexts[0] != "list" {
		t.Fatalf("expected contexts [list], got %+v", normalized.Contexts)
	}
}

func TestMergePanelTabsFiltersByPermission(t *testing.T) {
	admin := &Admin{authorizer: denyAuthorizer{}}
	ctx := AdminContext{Context: context.Background()}
	allowed := PanelTab{
		ID:     "public",
		Label:  "Public",
		Target: PanelTabTarget{Type: "panel", Panel: "public"},
	}
	denied := PanelTab{
		ID:         "secret",
		Label:      "Secret",
		Permission: "tabs.secret",
		Target:     PanelTabTarget{Type: "panel", Panel: "secret"},
	}
	tabs, err := admin.mergePanelTabs(ctx, "items", []PanelTab{allowed, denied})
	if err != nil {
		t.Fatalf("merge tabs: %v", err)
	}
	if len(tabs) != 1 || tabs[0].ID != "public" {
		t.Fatalf("expected only public tab, got %+v", tabs)
	}
}

func TestMergePanelTabsCollisionKeepsFirst(t *testing.T) {
	admin := &Admin{authorizer: allowAuthorizer{}}
	ctx := AdminContext{Context: context.Background()}
	first := PanelTab{
		ID:     "dup",
		Label:  "First",
		Target: PanelTabTarget{Type: "panel", Panel: "first"},
	}
	second := PanelTab{
		ID:     "dup",
		Label:  "Second",
		Target: PanelTabTarget{Type: "panel", Panel: "second"},
	}
	tabs, err := admin.mergePanelTabs(ctx, "items", []PanelTab{first}, []PanelTab{second})
	if err != nil {
		t.Fatalf("merge tabs: %v", err)
	}
	if len(tabs) != 1 || tabs[0].Label != "First" {
		t.Fatalf("expected first tab to win, got %+v", tabs)
	}
}

func TestMergePanelTabsDeniedOwnerDoesNotBlockAllowed(t *testing.T) {
	admin := &Admin{authorizer: denyAuthorizer{}}
	ctx := AdminContext{Context: context.Background()}
	owner := PanelTab{
		ID:         "dup",
		Label:      "Owner",
		Permission: "tabs.owner",
		Target:     PanelTabTarget{Type: "panel", Panel: "owner"},
	}
	external := PanelTab{
		ID:     "dup",
		Label:  "External",
		Target: PanelTabTarget{Type: "panel", Panel: "external"},
	}
	tabs, err := admin.mergePanelTabs(ctx, "items", []PanelTab{owner}, []PanelTab{external})
	if err != nil {
		t.Fatalf("merge tabs: %v", err)
	}
	if len(tabs) != 1 || tabs[0].Label != "External" {
		t.Fatalf("expected external tab to win, got %+v", tabs)
	}
}

func TestMergePanelTabsCollisionHandlerOverwrite(t *testing.T) {
	admin := &Admin{authorizer: allowAuthorizer{}}
	admin.panelTabCollisionHandler = func(string, PanelTab, PanelTab) (PanelTab, error) {
		return PanelTab{ID: "dup", Label: "Second", Target: PanelTabTarget{Type: "panel", Panel: "second"}}, nil
	}
	ctx := AdminContext{Context: context.Background()}
	first := PanelTab{
		ID:     "dup",
		Label:  "First",
		Target: PanelTabTarget{Type: "panel", Panel: "first"},
	}
	second := PanelTab{
		ID:     "dup",
		Label:  "Second",
		Target: PanelTabTarget{Type: "panel", Panel: "second"},
	}
	tabs, err := admin.mergePanelTabs(ctx, "items", []PanelTab{first}, []PanelTab{second})
	if err != nil {
		t.Fatalf("merge tabs: %v", err)
	}
	if len(tabs) != 1 || tabs[0].Label != "Second" {
		t.Fatalf("expected second tab to win, got %+v", tabs)
	}
}

func TestMergePanelTabsCollisionHandlerError(t *testing.T) {
	admin := &Admin{authorizer: allowAuthorizer{}}
	admin.panelTabCollisionHandler = func(string, PanelTab, PanelTab) (PanelTab, error) {
		return PanelTab{}, errors.New("collision failure")
	}
	ctx := AdminContext{Context: context.Background()}
	first := PanelTab{
		ID:     "dup",
		Label:  "First",
		Target: PanelTabTarget{Type: "panel", Panel: "first"},
	}
	second := PanelTab{
		ID:     "dup",
		Label:  "Second",
		Target: PanelTabTarget{Type: "panel", Panel: "second"},
	}
	_, err := admin.mergePanelTabs(ctx, "items", []PanelTab{first}, []PanelTab{second})
	if err == nil {
		t.Fatalf("expected collision error")
	}
}
