package navigation

import (
	"context"
	"errors"
	"testing"
)

type navigationMenuServiceStub struct {
	menu          *Menu
	err           error
	exists        *bool
	presenceCalls *int
}

func (s navigationMenuServiceStub) Menu(context.Context, string, string) (*Menu, error) {
	return s.menu, s.err
}

func (s navigationMenuServiceStub) MenuExists(context.Context, string) (bool, error) {
	if s.presenceCalls != nil {
		(*s.presenceCalls)++
	}
	if s.exists == nil {
		return s.menu != nil, nil
	}
	return *s.exists, nil
}

type translatorStub struct{}

func (translatorStub) Translate(locale, key string, args ...any) (string, error) {
	return key + ":" + locale, nil
}

type allowAllAuthorizer struct{}

func (allowAllAuthorizer) Can(_ context.Context, _, _ string) bool { return true }

type permissionAuthorizer map[string]bool

func (a permissionAuthorizer) Can(_ context.Context, action, resource string) bool {
	return resource == navigationPermissionResource(action) && a[action]
}

func TestNavigationFallbackFiltersSeparatorsAndEmptyNodes(t *testing.T) {
	nav := NewNavigation(nil, allowAllAuthorizer{})
	nav.SetTranslator(translatorStub{})
	nav.AddFallback(
		NavigationItem{Type: MenuItemTypeSeparator, Label: "---", Locale: "en", Position: new(0)},
		NavigationItem{Type: MenuItemTypeItem, Label: "A", Locale: "en", Position: new(1)},
		NavigationItem{Type: MenuItemTypeSeparator, Label: "---", Locale: "en", Position: new(2)},
		NavigationItem{Type: MenuItemTypeSeparator, Label: "---", Locale: "en", Position: new(2)},
		NavigationItem{Type: MenuItemTypeItem, Label: "B", Locale: "en", Position: new(3)},
		NavigationItem{Type: MenuItemTypeSeparator, Label: "---", Locale: "en", Position: new(4)},
		NavigationItem{Type: MenuItemTypeGroup, Label: "Empty Group", Locale: "en", Position: new(10)},
		NavigationItem{Type: MenuItemTypeItem, Label: "Collapsible Empty", Collapsible: true, Locale: "en", Position: new(11)},
	)

	items := nav.Resolve(context.Background(), "en")
	if len(items) != 3 {
		t.Fatalf("expected 3 items after filtering, got %+v", items)
	}
	if items[0].Label != "A" {
		t.Fatalf("expected first item A, got %q", items[0].Label)
	}
	if items[1].Type != MenuItemTypeSeparator {
		t.Fatalf("expected middle separator, got %+v", items[1])
	}
	if items[2].Label != "B" {
		t.Fatalf("expected last item B, got %q", items[2].Label)
	}
}

func TestNavigationUsesMenuSpecificFallbacks(t *testing.T) {
	nav := NewNavigation(nil, allowAllAuthorizer{})
	nav.AddFallback(NavigationItem{ID: "primary", Label: "Primary"})
	nav.SetMenuFallback("admin.utility", NavigationItem{ID: "settings", Label: "Settings"})
	if _, ok := nav.MenuFallback("admin_utility"); !ok {
		t.Fatal("expected canonical-equivalent menu code to resolve named fallback")
	}

	utility := nav.ResolveMenuWithOptions(context.Background(), "admin.utility", "en", ResolveOptions{})
	if len(utility) != 1 || utility[0].ID != "settings" {
		t.Fatalf("expected utility-specific fallback, got %+v", utility)
	}
	primary := nav.ResolveMenuWithOptions(context.Background(), "admin.main", "en", ResolveOptions{})
	if len(primary) != 1 || primary[0].ID != "primary" {
		t.Fatalf("expected global fallback for unconfigured menu, got %+v", primary)
	}

	nav.SetMenuFallback("admin.empty")
	empty := nav.ResolveMenuWithOptions(context.Background(), "admin.empty", "en", ResolveOptions{})
	if len(empty) != 0 {
		t.Fatalf("expected explicit empty fallback, got %+v", empty)
	}
}

func TestNavigationUsesMenuFallbackOnlyWhenCMSMenuIsUnavailable(t *testing.T) {
	fallback := NavigationItem{ID: "settings", Label: "Settings"}

	missing := NewNavigation(navigationMenuServiceStub{exists: new(false)}, allowAllAuthorizer{})
	missing.SetMenuFallback("admin.utility", fallback)
	missingResult := missing.ResolveMenuResultWithOptions(context.Background(), "admin.utility", "en", ResolveOptions{})
	if missingResult.Source != ResolveSourceFallbackCMSMissing ||
		len(missingResult.Items) != 1 ||
		missingResult.Items[0].ID != "settings" {
		t.Fatalf("expected missing CMS menu to use named fallback, got %+v", missingResult)
	}

	failed := NewNavigation(navigationMenuServiceStub{err: errors.New("unavailable")}, allowAllAuthorizer{})
	failed.SetMenuFallback("admin.utility", fallback)
	failedResult := failed.ResolveMenuResultWithOptions(context.Background(), "admin.utility", "en", ResolveOptions{})
	if failedResult.Source != ResolveSourceFallbackCMSError ||
		len(failedResult.Items) != 1 ||
		failedResult.Items[0].ID != "settings" {
		t.Fatalf("expected CMS error to use named fallback, got %+v", failedResult)
	}

	empty := NewNavigation(navigationMenuServiceStub{menu: &Menu{Code: "admin.utility"}, exists: new(true)}, allowAllAuthorizer{})
	empty.SetMenuFallback("admin.utility", fallback)
	emptyResult := empty.ResolveMenuResultWithOptions(context.Background(), "admin.utility", "en", ResolveOptions{})
	if emptyResult.Source != ResolveSourceCMS || len(emptyResult.Items) != 0 {
		t.Fatalf("expected existing empty CMS menu to remain authoritative, got %+v", emptyResult)
	}
}

func TestNavigationChecksPresenceOnlyForEmptyCMSMenus(t *testing.T) {
	calls := 0
	nav := NewNavigation(navigationMenuServiceStub{
		menu:          &Menu{Code: "admin.utility", Items: []MenuItem{{ID: "settings", Label: "Settings"}}},
		presenceCalls: &calls,
	}, allowAllAuthorizer{})

	result := nav.ResolveMenuResultWithOptions(context.Background(), "admin.utility", "en", ResolveOptions{})
	if result.Source != ResolveSourceCMS || len(result.Items) != 1 {
		t.Fatalf("expected non-empty CMS menu, got %+v", result)
	}
	if calls != 0 {
		t.Fatalf("expected no presence probe for non-empty menu, got %d", calls)
	}

	nav = NewNavigation(navigationMenuServiceStub{
		menu:          &Menu{Code: "admin.utility"},
		exists:        new(true),
		presenceCalls: &calls,
	}, allowAllAuthorizer{})
	result = nav.ResolveMenuResultWithOptions(context.Background(), "admin.utility", "en", ResolveOptions{})
	if result.Source != ResolveSourceCMS {
		t.Fatalf("expected existing empty CMS menu, got %+v", result)
	}
	if calls != 1 {
		t.Fatalf("expected one presence probe for empty menu, got %d", calls)
	}
}

func TestConvertMenuItemsTranslatesLabelAndGroupTitle(t *testing.T) {
	items := ConvertMenuItems([]MenuItem{
		{ID: "one", Label: "Raw", LabelKey: "nav.one", Locale: "en"},
	}, translatorStub{}, "en")
	if len(items) != 1 {
		t.Fatalf("expected one item, got %+v", items)
	}
	if items[0].Label != "nav.one:en" {
		t.Fatalf("expected label translation, got %q", items[0].Label)
	}
	if items[0].GroupTitle != "nav.one:en" {
		t.Fatalf("expected group title translation, got %q", items[0].GroupTitle)
	}
}

func TestNavigationFailsClosedWithoutAuthorizerForPermissionedItems(t *testing.T) {
	nav := NewNavigation(nil, nil)
	nav.AddFallback(
		NavigationItem{ID: "public", Label: "Public", Locale: "en"},
		NavigationItem{ID: "protected", Label: "Protected", Locale: "en", Permissions: []string{"admin.settings.view"}},
	)

	items := nav.Resolve(context.Background(), "en")
	if len(items) != 1 {
		t.Fatalf("expected only unprotected item without authorizer, got %+v", items)
	}
	if items[0].ID != "public" {
		t.Fatalf("expected public item to remain visible, got %+v", items[0])
	}
}

func TestNavigationPermissionChecksUsePermissionResource(t *testing.T) {
	nav := NewNavigation(nil, resourceAuthorizer{"admin.events": true})
	nav.AddFallback(
		NavigationItem{ID: "events", Label: "Events", Permissions: []string{"admin.events.view"}},
		NavigationItem{ID: "sessions", Label: "Sessions", Permissions: []string{"admin.sessions.view"}},
	)

	items := nav.Resolve(context.Background(), "en")
	if len(items) != 1 || items[0].ID != "events" {
		t.Fatalf("expected only event item allowed by admin.events resource, got %+v", items)
	}
}

func TestNormalizeNavigationPermissionDeniedMode(t *testing.T) {
	tests := []struct {
		name string
		in   NavigationPermissionDeniedMode
		want NavigationPermissionDeniedMode
	}{
		{name: "empty", in: "", want: NavigationPermissionDeniedModeHide},
		{name: "unknown", in: "visible", want: NavigationPermissionDeniedModeHide},
		{name: "hide", in: NavigationPermissionDeniedModeHide, want: NavigationPermissionDeniedModeHide},
		{name: "disable", in: NavigationPermissionDeniedModeDisable, want: NavigationPermissionDeniedModeDisable},
		{name: "trim case", in: " DISABLE ", want: NavigationPermissionDeniedModeDisable},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := NormalizeNavigationPermissionDeniedMode(tt.in); got != tt.want {
				t.Fatalf("expected %q, got %q", tt.want, got)
			}
		})
	}
}

func TestConvertMenuItemsDoesNotSynthesizeTransientDisabledMetadata(t *testing.T) {
	items := ConvertMenuItems([]MenuItem{
		{
			ID:     "debug",
			Code:   "debug.code",
			Label:  "Debug",
			Target: map[string]any{"key": "debug", "enabled": false, "disabled": true, "disabled_reason_code": "stale"},
		},
	}, nil, "en")
	if len(items) != 1 {
		t.Fatalf("expected one item, got %+v", items)
	}

	item := items[0]
	if item.Enabled != nil {
		t.Fatalf("expected transient enabled state to be unset, got %v", *item.Enabled)
	}
	if item.Disabled || item.ARIADisabled || item.DisabledReason != "" || item.DisabledReasonCode != "" || item.MissingPermission != "" {
		t.Fatalf("expected no transient disabled metadata, got %+v", item)
	}
	if item.Target["disabled"] != true {
		t.Fatalf("expected stable target metadata to be preserved, got %+v", item.Target)
	}
	if item.Code != "debug.code" {
		t.Fatalf("expected menu item code to be preserved, got %q", item.Code)
	}
}

func TestNavigationPermissionResourceOverride(t *testing.T) {
	nav := NewNavigation(nil, navigationResourceAuthorizer{"site.docs.view": true})
	nav.AddFallback(NavigationItem{
		ID:          "docs",
		Label:       "Docs",
		Permissions: []string{"site.docs.view"},
	})

	defaultItems := nav.ResolveMenuWithOptions(context.Background(), "", "en", ResolveOptions{
		PermissionDeniedMode: NavigationPermissionDeniedModeHide,
	})
	if len(defaultItems) != 0 {
		t.Fatalf("expected derived resource to deny navigation-resource authorizer, got %+v", defaultItems)
	}

	overrideItems := nav.ResolveMenuWithOptions(context.Background(), "", "en", ResolveOptions{
		PermissionDeniedMode: NavigationPermissionDeniedModeHide,
		PermissionResource:   "navigation",
	})
	if len(overrideItems) != 1 || overrideItems[0].ID != "docs" {
		t.Fatalf("expected override resource to allow docs item, got %+v", overrideItems)
	}
}

func TestNavigationItemTransientDisabledHelpers(t *testing.T) {
	item := NavigationItem{ID: "debug"}

	item.MarkPermissionDenied(" admin.debug.view ")
	if item.Enabled == nil || *item.Enabled {
		t.Fatalf("expected enabled=false metadata, got %+v", item.Enabled)
	}
	if !item.Disabled || !item.ARIADisabled {
		t.Fatalf("expected disabled metadata, got %+v", item)
	}
	if item.DisabledReasonCode != NavigationDisabledReasonCodePermissionDenied {
		t.Fatalf("expected permission denied reason code, got %q", item.DisabledReasonCode)
	}
	if item.MissingPermission != "admin.debug.view" {
		t.Fatalf("expected trimmed missing permission, got %q", item.MissingPermission)
	}

	item.MarkEnabled()
	if item.Enabled == nil || !*item.Enabled {
		t.Fatalf("expected enabled=true metadata, got %+v", item.Enabled)
	}
	if item.Disabled || item.ARIADisabled || item.DisabledReasonCode != "" || item.MissingPermission != "" {
		t.Fatalf("expected disabled metadata to be cleared, got %+v", item)
	}

	item.ClearTransientState()
	if item.Enabled != nil || item.Disabled || item.ARIADisabled {
		t.Fatalf("expected transient state to be unset, got %+v", item)
	}
}

func TestResolveMenuWithOptionsHidesDeniedItemsByDefault(t *testing.T) {
	nav := NewNavigation(nil, permissionAuthorizer{"admin.public.view": true})
	nav.AddFallback(
		NavigationItem{ID: "public", Label: "Public", Permissions: []string{"admin.public.view"}},
		NavigationItem{ID: "debug", Label: "Debug", Permissions: []string{"admin.debug.view"}},
	)

	items := nav.Resolve(context.Background(), "en")
	if len(items) != 1 || items[0].ID != "public" {
		t.Fatalf("expected only public item by default, got %+v", items)
	}

	items = nav.ResolveMenuWithOptions(context.Background(), "", "en", ResolveOptions{PermissionDeniedMode: NavigationPermissionDeniedModeHide})
	if len(items) != 1 || items[0].ID != "public" {
		t.Fatalf("expected only public item in explicit hide mode, got %+v", items)
	}
}

func TestResolveMenuWithOptionsDisablesDeniedItems(t *testing.T) {
	nav := NewNavigation(nil, permissionAuthorizer{"admin.public.view": true})
	nav.AddFallback(
		NavigationItem{ID: "public", Label: "Public", Permissions: []string{"admin.public.view"}},
		NavigationItem{ID: "debug", Label: "Debug", Permissions: []string{"", "admin.debug.view", "admin.debug.manage"}},
	)

	items := nav.ResolveMenuWithOptions(context.Background(), "", "en", ResolveOptions{PermissionDeniedMode: NavigationPermissionDeniedModeDisable})
	if len(items) != 2 {
		t.Fatalf("expected public and disabled debug items, got %+v", items)
	}
	debug := findNavigationItemForTest(items, "debug")
	if debug == nil {
		t.Fatalf("expected debug item, got %+v", items)
	}
	if debug.Enabled == nil || *debug.Enabled {
		t.Fatalf("expected debug enabled=false, got %+v", debug.Enabled)
	}
	if !debug.Disabled || !debug.ARIADisabled {
		t.Fatalf("expected debug disabled metadata, got %+v", debug)
	}
	if debug.DisabledReasonCode != NavigationDisabledReasonCodePermissionDenied {
		t.Fatalf("expected permission denied reason code, got %q", debug.DisabledReasonCode)
	}
	if debug.MissingPermission != "admin.debug.view" {
		t.Fatalf("expected first missing non-empty permission, got %q", debug.MissingPermission)
	}
}

func TestResolveMenuWithOptionsKeepsGroupsWithDisabledChildren(t *testing.T) {
	nav := NewNavigation(nil, permissionAuthorizer{})
	nav.AddFallback(NavigationItem{
		ID:    "tools",
		Type:  MenuItemTypeGroup,
		Label: "Tools",
		Children: []NavigationItem{
			{ID: "debug", Label: "Debug", Permissions: []string{"admin.debug.view"}},
		},
	})

	hidden := nav.ResolveMenuWithOptions(context.Background(), "", "en", ResolveOptions{PermissionDeniedMode: NavigationPermissionDeniedModeHide})
	if len(hidden) != 0 {
		t.Fatalf("expected empty group to be pruned in hide mode, got %+v", hidden)
	}

	disabled := nav.ResolveMenuWithOptions(context.Background(), "", "en", ResolveOptions{PermissionDeniedMode: NavigationPermissionDeniedModeDisable})
	if len(disabled) != 1 || len(disabled[0].Children) != 1 {
		t.Fatalf("expected group with disabled child in disable mode, got %+v", disabled)
	}
	if child := disabled[0].Children[0]; child.Enabled == nil || *child.Enabled || !child.Disabled {
		t.Fatalf("expected disabled child metadata, got %+v", child)
	}
}

func TestResolveMenuWithOptionsFailsClosedWithoutAuthorizerInDisableMode(t *testing.T) {
	nav := NewNavigation(nil, nil)
	nav.AddFallback(
		NavigationItem{ID: "public", Label: "Public"},
		NavigationItem{ID: "debug", Label: "Debug", Permissions: []string{"admin.debug.view"}},
	)

	items := nav.ResolveMenuWithOptions(context.Background(), "", "en", ResolveOptions{PermissionDeniedMode: NavigationPermissionDeniedModeDisable})
	if len(items) != 2 {
		t.Fatalf("expected public and disabled debug items, got %+v", items)
	}
	debug := findNavigationItemForTest(items, "debug")
	if debug == nil {
		t.Fatalf("expected debug item, got %+v", items)
	}
	if debug.Enabled == nil || *debug.Enabled || !debug.Disabled {
		t.Fatalf("expected permissioned item to be disabled without authorizer, got %+v", debug)
	}
}

func TestResolveMenuWithOptionsClearsStaleTransientMetadataForAllowedItems(t *testing.T) {
	nav := NewNavigation(nil, allowAllAuthorizer{})
	item := NavigationItem{ID: "settings", Label: "Settings", Permissions: []string{"admin.settings.view"}}
	item.MarkPermissionDenied("admin.settings.view")
	nav.AddFallback(item)

	items := nav.ResolveMenuWithOptions(context.Background(), "", "en", ResolveOptions{PermissionDeniedMode: NavigationPermissionDeniedModeDisable})
	if len(items) != 1 {
		t.Fatalf("expected allowed item, got %+v", items)
	}
	got := items[0]
	if got.Enabled == nil || !*got.Enabled {
		t.Fatalf("expected allowed item to be explicitly enabled, got %+v", got.Enabled)
	}
	if got.Disabled || got.ARIADisabled || got.DisabledReasonCode != "" || got.MissingPermission != "" {
		t.Fatalf("expected stale disabled metadata to be cleared, got %+v", got)
	}
}

type resourceAuthorizer map[string]bool

func (a resourceAuthorizer) Can(_ context.Context, action, resource string) bool {
	return action == resource+".view" && a[resource]
}

type navigationResourceAuthorizer map[string]bool

func (a navigationResourceAuthorizer) Can(_ context.Context, action, resource string) bool {
	return resource == "navigation" && a[action]
}

func findNavigationItemForTest(items []NavigationItem, id string) *NavigationItem {
	for idx := range items {
		if items[idx].ID == id {
			return &items[idx]
		}
		if child := findNavigationItemForTest(items[idx].Children, id); child != nil {
			return child
		}
	}
	return nil
}
