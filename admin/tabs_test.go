package admin

import (
	"context"
	"errors"
	"testing"
)

type tabsAllowAuthorizer struct{}

func (tabsAllowAuthorizer) Can(context.Context, string, string) bool { return true }

type tabsDenyAuthorizer struct{}

func (tabsDenyAuthorizer) Can(context.Context, string, string) bool { return false }

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
	admin := &Admin{authorizer: tabsDenyAuthorizer{}}
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
	admin := &Admin{authorizer: tabsAllowAuthorizer{}}
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
	admin := &Admin{authorizer: tabsDenyAuthorizer{}}
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
	admin := &Admin{authorizer: tabsAllowAuthorizer{}}
	admin.panelTabCollisionHandler = func(string, PanelTab, PanelTab) (PanelTab, error) {
		return PanelTab{ID: "dup", Label: "Second", Scope: PanelTabScopeDetail, Target: PanelTabTarget{Type: "panel", Panel: "second"}}, nil
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
	if len(tabs[0].Contexts) != 1 || tabs[0].Contexts[0] != "detail" {
		t.Fatalf("expected normalized contexts, got %+v", tabs[0].Contexts)
	}
}

func TestMergePanelTabsCollisionHandlerError(t *testing.T) {
	admin := &Admin{authorizer: tabsAllowAuthorizer{}}
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

func TestMergePanelTabsCollisionHandlerRejectedChoiceKeepsExisting(t *testing.T) {
	admin := &Admin{authorizer: tabsDenyAuthorizer{}}
	admin.panelTabCollisionHandler = func(string, PanelTab, PanelTab) (PanelTab, error) {
		return PanelTab{
			ID:         "dup",
			Label:      "Blocked",
			Permission: "tabs.blocked",
			Target:     PanelTabTarget{Type: "panel", Panel: "blocked"},
		}, nil
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
	if len(tabs) != 1 || tabs[0].Label != "First" {
		t.Fatalf("expected existing tab to remain, got %+v", tabs)
	}
}

func TestResolvePanelTabsUsesAdminContextAndPermissions(t *testing.T) {
	adm := &Admin{
		registry:   NewRegistry(),
		authorizer: tabsDenyAuthorizer{},
	}
	if err := adm.registry.RegisterPanelTab("users", PanelTab{
		ID:     "profile",
		Label:  "Profile",
		Scope:  PanelTabScopeDetail,
		Target: PanelTabTarget{Type: "panel", Panel: "user-profiles"},
	}); err != nil {
		t.Fatalf("register profile tab: %v", err)
	}
	if err := adm.registry.RegisterPanelTab("users", PanelTab{
		ID:         "activity",
		Label:      "Activity",
		Permission: "admin.users.view",
		Scope:      PanelTabScopeDetail,
		Target:     PanelTabTarget{Type: "path", Path: "/admin/activity"},
	}); err != nil {
		t.Fatalf("register activity tab: %v", err)
	}

	tabs, err := adm.ResolvePanelTabs(AdminContext{Context: context.Background()}, "users")
	if err != nil {
		t.Fatalf("resolve tabs: %v", err)
	}
	if len(tabs) != 1 || tabs[0].ID != "profile" {
		t.Fatalf("expected only profile tab after permission filtering, got %+v", tabs)
	}
}
