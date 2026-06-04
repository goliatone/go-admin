package admin

import (
	"context"
	"encoding/json"
	"reflect"
	"strings"
	"testing"

	router "github.com/goliatone/go-router"
)

type navigationTestMenuService interface {
	CreateMenu(context.Context, string) (*Menu, error)
	AddMenuItem(context.Context, string, MenuItem) error
}

func mustCreateNavigationTestMenu(t *testing.T, svc navigationTestMenuService, ctx context.Context, code string) {
	t.Helper()
	if _, err := svc.CreateMenu(ctx, code); err != nil {
		t.Fatalf("create menu %q: %v", code, err)
	}
}

func mustAddNavigationTestMenuItem(t *testing.T, svc navigationTestMenuService, ctx context.Context, code string, item MenuItem) {
	t.Helper()
	if err := svc.AddMenuItem(ctx, code, item); err != nil {
		t.Fatalf("add menu item to %q: %v", code, err)
	}
}

func TestNavigationResolve(t *testing.T) {
	menuSvc := NewInMemoryMenuService()
	ctx := context.Background()
	mustCreateNavigationTestMenu(t, menuSvc, ctx, "admin.main")
	mustAddNavigationTestMenuItem(t, menuSvc, ctx, "admin.main", MenuItem{
		Label:       "Dashboard",
		Target:      map[string]any{"type": "route", "name": "admin.dashboard"},
		Locale:      "en",
		Permissions: []string{"nav.view"},
	})

	nav := NewNavigation(menuSvc, allowAllNav{})
	items := nav.Resolve(ctx, "en")
	if len(items) != 1 || items[0].Label != "Dashboard" {
		t.Fatalf("unexpected nav items: %+v", items)
	}
}

func TestNavigationPermissionDeniedModeFacadeAndConfigJSON(t *testing.T) {
	if NavigationPermissionDeniedModeHide != "hide" {
		t.Fatalf("expected hide constant, got %q", NavigationPermissionDeniedModeHide)
	}
	if NavigationPermissionDeniedModeDisable != "disable" {
		t.Fatalf("expected disable constant, got %q", NavigationPermissionDeniedModeDisable)
	}
	if NavigationDisabledReasonCodePermissionDenied != "permission_denied" {
		t.Fatalf("expected permission denied reason code, got %q", NavigationDisabledReasonCodePermissionDenied)
	}
	if got := NormalizeNavigationPermissionDeniedMode("unknown"); got != NavigationPermissionDeniedModeHide {
		t.Fatalf("expected unknown mode to normalize to hide, got %q", got)
	}

	field, ok := reflect.TypeFor[Config]().FieldByName("NavPermissionDeniedMode")
	if !ok {
		t.Fatalf("expected Config.NavPermissionDeniedMode field")
	}
	if got := field.Tag.Get("json"); got != "nav_permission_denied_mode" {
		t.Fatalf("expected nav_permission_denied_mode JSON tag, got %q", got)
	}

	var cfg Config
	if err := json.Unmarshal([]byte(`{"nav_permission_denied_mode":"disable"}`), &cfg); err != nil {
		t.Fatalf("unmarshal config: %v", err)
	}
	if cfg.NavPermissionDeniedMode != NavigationPermissionDeniedModeDisable {
		t.Fatalf("expected disable mode after unmarshal, got %q", cfg.NavPermissionDeniedMode)
	}
}

func TestNavigationResolveMenuCode(t *testing.T) {
	menuSvc := NewInMemoryMenuService()
	ctx := context.Background()
	mustCreateNavigationTestMenu(t, menuSvc, ctx, "admin.main")
	mustAddNavigationTestMenuItem(t, menuSvc, ctx, "admin.main", MenuItem{Label: "Main", Locale: "en"})
	mustCreateNavigationTestMenu(t, menuSvc, ctx, "admin.reports")
	mustAddNavigationTestMenuItem(t, menuSvc, ctx, "admin.reports", MenuItem{Label: "Reports", Locale: "en"})

	nav := NewNavigation(menuSvc, allowAllNav{})
	nav.SetDefaultMenuCode("admin.main")

	mainItems := nav.Resolve(ctx, "en")
	if len(mainItems) != 1 || mainItems[0].Label != "Main" {
		t.Fatalf("unexpected main items: %+v", mainItems)
	}

	reportItems := nav.ResolveMenu(ctx, "admin.reports", "en")
	if len(reportItems) != 1 || reportItems[0].Label != "Reports" {
		t.Fatalf("unexpected report items: %+v", reportItems)
	}
}

func TestNavigationResolveMenuWithOptionsDisableMode(t *testing.T) {
	nav := NewNavigation(nil, denyAllNav{})
	nav.AddItem(NavigationItem{ID: "debug", Label: "Debug", Permissions: []string{"admin.debug.view"}})

	result := nav.ResolveMenuResultWithOptions(context.Background(), "", "en", ResolveOptions{
		PermissionDeniedMode: NavigationPermissionDeniedModeDisable,
	})
	if result.Source != ResolveSourceFallbackNoCMS {
		t.Fatalf("expected fallback_no_cms source, got %q", result.Source)
	}
	items := result.Items
	if len(items) != 1 {
		t.Fatalf("expected disabled item through public facade, got %+v", items)
	}
	got := items[0]
	if got.Enabled == nil || *got.Enabled || !got.Disabled {
		t.Fatalf("expected disabled metadata through public facade, got %+v", got)
	}
	if got.MissingPermission != "admin.debug.view" {
		t.Fatalf("expected missing permission metadata, got %q", got.MissingPermission)
	}
}

func TestNavigationBindingHonorsConfiguredPermissionDeniedMode(t *testing.T) {
	cfg := Config{
		DefaultLocale:           "en",
		NavPermissionDeniedMode: NavigationPermissionDeniedModeDisable,
	}
	adm := mustNewAdmin(t, cfg, Dependencies{})
	adm.WithAuthorizer(denyAllNav{})
	adm.nav.UseCMS(false)
	adm.nav.AddFallback(NavigationItem{
		ID:          "debug",
		Label:       "Debug",
		Permissions: []string{"admin.debug.view"},
	})

	c := router.NewMockContext()
	c.On("Context").Return(context.Background())
	c.On("IP").Return("")

	itemsAny, _ := newNavigationBinding(adm).Resolve(c, "en", "")
	items, ok := itemsAny.([]NavigationItem)
	if !ok {
		t.Fatalf("expected []NavigationItem, got %T", itemsAny)
	}
	if len(items) != 1 {
		t.Fatalf("expected disabled item through boot navigation binding, got %+v", items)
	}
	got := items[0]
	if got.Enabled == nil || *got.Enabled || !got.Disabled {
		t.Fatalf("expected disabled metadata through boot navigation binding, got %+v", got)
	}
	if got.MissingPermission != "admin.debug.view" {
		t.Fatalf("expected missing permission metadata, got %q", got.MissingPermission)
	}

	c.AssertExpectations(t)
}

func TestNavigationResolvesMenuLocaleFromCMS(t *testing.T) {
	menuSvc := NewInMemoryMenuService()
	ctx := context.Background()
	mustCreateNavigationTestMenu(t, menuSvc, ctx, "admin.main")
	mustAddNavigationTestMenuItem(t, menuSvc, ctx, "admin.main", MenuItem{Label: "Dashboard", Locale: "en"})
	mustAddNavigationTestMenuItem(t, menuSvc, ctx, "admin.main", MenuItem{Label: "Inicio", Locale: "es"})

	nav := NewNavigation(menuSvc, allowAllNav{})
	en := nav.Resolve(ctx, "en")
	if len(en) != 1 || en[0].Label != "Dashboard" {
		t.Fatalf("expected english menu item, got %+v", en)
	}
	es := nav.Resolve(ctx, "es")
	if len(es) != 1 || es[0].Label != "Inicio" {
		t.Fatalf("expected spanish menu item, got %+v", es)
	}
}

func TestNavigationFallbackWhenCMSDisabled(t *testing.T) {
	menuSvc := NewInMemoryMenuService()
	ctx := context.Background()
	mustCreateNavigationTestMenu(t, menuSvc, ctx, "admin.main")
	mustAddNavigationTestMenuItem(t, menuSvc, ctx, "admin.main", MenuItem{Label: "CMS Item", Locale: "en"})

	nav := NewNavigation(menuSvc, allowAllNav{})
	nav.UseCMS(false)
	nav.AddFallback(NavigationItem{Label: "Fallback Item", Locale: "en"})

	items := nav.Resolve(ctx, "en")
	if len(items) != 1 || items[0].Label != "Fallback Item" {
		t.Fatalf("expected fallback navigation, got %+v", items)
	}
}

func TestAdminNavigationUsesFallbackWithoutCMSFeature(t *testing.T) {
	cfg := Config{
		DefaultLocale: "en",
	}
	adm := mustNewAdmin(t, cfg, Dependencies{})
	ctx := context.Background()

	mustCreateNavigationTestMenu(t, adm.menuSvc, ctx, "admin.main")
	mustAddNavigationTestMenuItem(t, adm.menuSvc, ctx, "admin.main", MenuItem{Label: "CMS Item", Locale: "en"})

	if err := adm.addMenuItems(ctx, []MenuItem{{Label: "Fallback Item", Locale: "en"}}); err != nil {
		t.Fatalf("add menu items failed: %v", err)
	}

	items := adm.nav.Resolve(ctx, "en")
	if len(items) != 1 || items[0].Label != "Fallback Item" {
		t.Fatalf("expected fallback navigation when CMS is disabled, got %+v", items)
	}
}

func TestAdminPersistMenuItemsRepairsExistingRowMatchedByTargetKey(t *testing.T) {
	ctx := context.Background()
	menuSvc := NewInMemoryMenuService()
	adm := mustNewAdmin(t, Config{
		DefaultLocale: "en",
		NavMenuCode:   "admin_main",
	}, Dependencies{FeatureGate: featureGateFromKeys(FeatureCMS)})
	adm.UseCMS(&stubCMSContainer{menu: menuSvc})

	mustCreateNavigationTestMenu(t, menuSvc, ctx, "admin_main")
	mustAddNavigationTestMenuItem(t, menuSvc, ctx, "admin_main", MenuItem{
		ID:          "custom.media",
		Label:       "Media",
		Icon:        "old-icon",
		Locale:      "en",
		Permissions: []string{"admin.archive.view"},
		Target: map[string]any{
			"type": "url",
			"path": "",
			"key":  "media",
		},
	})

	if err := adm.addMenuItems(ctx, []MenuItem{{
		Label:       "Media",
		LabelKey:    "menu.media",
		Icon:        "media-image-list",
		Locale:      "en",
		Menu:        "admin_main",
		Permissions: []string{"admin.media.view"},
		Target: map[string]any{
			"type": "url",
			"path": "/admin/media",
			"key":  "media",
		},
	}}); err != nil {
		t.Fatalf("addMenuItems: %v", err)
	}

	menu, err := menuSvc.Menu(ctx, "admin_main", "en")
	if err != nil {
		t.Fatalf("menu: %v", err)
	}
	if got := countMenuItemsByTargetKey(menu.Items, "media"); got != 1 {
		t.Fatalf("expected one media row after repair, got %d in %#v", got, menu.Items)
	}
	item := findMenuItemByTargetKey(menu.Items, "media")
	if item == nil {
		t.Fatalf("expected media row")
	}
	if got := strings.TrimSpace(toString(item.Target["path"])); got != "/admin/media" {
		t.Fatalf("expected media path repaired, got %q", got)
	}
	if !stringSliceContains(item.Permissions, "admin.media.view") || stringSliceContains(item.Permissions, "admin.archive.view") {
		t.Fatalf("expected media permissions repaired, got %#v", item.Permissions)
	}
}

func TestAdminPersistMenuItemsPreservesUserRowMatchedOnlyByBroadTargetKey(t *testing.T) {
	ctx := context.Background()
	menuSvc := NewInMemoryMenuService()
	adm := mustNewAdmin(t, Config{
		DefaultLocale: "en",
		NavMenuCode:   "admin_main",
	}, Dependencies{FeatureGate: featureGateFromKeys(FeatureCMS)})
	adm.UseCMS(&stubCMSContainer{menu: menuSvc})

	mustCreateNavigationTestMenu(t, menuSvc, ctx, "admin_main")
	mustAddNavigationTestMenuItem(t, menuSvc, ctx, "admin_main", MenuItem{
		ID:          "custom.media.shortcut",
		Label:       "Custom Media",
		Locale:      "en",
		Permissions: []string{"custom.media.view"},
		Target: map[string]any{
			"type": "url",
			"path": "/custom/media",
			"key":  "media",
		},
	})

	if err := adm.addMenuItems(ctx, []MenuItem{{
		Label:       "Media",
		LabelKey:    "menu.media",
		Icon:        "media-image-list",
		Locale:      "en",
		Menu:        "admin_main",
		Permissions: []string{"admin.media.view"},
		Target: map[string]any{
			"type": "url",
			"path": "/admin/media",
			"key":  "media",
		},
	}}); err != nil {
		t.Fatalf("addMenuItems: %v", err)
	}

	menu, err := menuSvc.Menu(ctx, "admin_main", "en")
	if err != nil {
		t.Fatalf("menu: %v", err)
	}
	custom := findNavigationTestMenuItemByID(menu.Items, "custom.media.shortcut")
	if custom == nil {
		t.Fatalf("expected custom media shortcut to be preserved, got %#v", menu.Items)
	}
	if got := strings.TrimSpace(toString(custom.Target["path"])); got != "/custom/media" {
		t.Fatalf("expected custom media path preserved, got %q", got)
	}
	canonical := findNavigationTestMenuItemByID(menu.Items, "admin_main.media")
	if canonical == nil {
		t.Fatalf("expected canonical media module row to be created beside user row, got %#v", menu.Items)
	}
	if got := strings.TrimSpace(toString(canonical.Target["path"])); got != "/admin/media" {
		t.Fatalf("expected canonical media path /admin/media, got %q", got)
	}
}

func TestAdminPersistMenuItemsRepairsHostStyleRowsMatchedByRouteIdentity(t *testing.T) {
	ctx := context.Background()
	menuSvc := NewInMemoryMenuService()
	adm := mustNewAdmin(t, Config{
		DefaultLocale: "en",
		NavMenuCode:   "admin_main",
	}, Dependencies{FeatureGate: featureGateFromKeys(FeatureCMS)})
	adm.UseCMS(&stubCMSContainer{menu: menuSvc})

	mustCreateNavigationTestMenu(t, menuSvc, ctx, "admin_main")
	for _, item := range []MenuItem{
		{
			ID:          "archive.events",
			Label:       "Events",
			Locale:      "en",
			Permissions: []string{"admin.archive.view"},
			Target:      map[string]any{"type": "url", "path": "/admin/archive/events", "key": "events", "name": "admin.archive.events"},
		},
		{
			ID:          "archive.sessions",
			Label:       "Sessions",
			Locale:      "en",
			Permissions: []string{"admin.archive.view"},
			Target:      map[string]any{"type": "url", "path": "/admin/archive/sessions", "key": "sessions", "name": "admin.archive.sessions"},
		},
	} {
		mustAddNavigationTestMenuItem(t, menuSvc, ctx, "admin_main", item)
	}

	expected := []MenuItem{
		{
			Label:       "Events",
			LabelKey:    "menu.events",
			Locale:      "en",
			Menu:        "admin_main",
			Permissions: []string{"admin.events.view"},
			Target:      map[string]any{"type": "url", "path": "/admin/events", "key": "events", "name": "admin.events.index"},
		},
		{
			Label:       "Sessions",
			LabelKey:    "menu.sessions",
			Locale:      "en",
			Menu:        "admin_main",
			Permissions: []string{"admin.sessions.view"},
			Target:      map[string]any{"type": "url", "path": "/admin/sessions", "key": "sessions", "name": "admin.sessions.index"},
		},
	}
	if err := adm.addMenuItems(ctx, expected); err != nil {
		t.Fatalf("addMenuItems: %v", err)
	}

	menu, err := menuSvc.Menu(ctx, "admin_main", "en")
	if err != nil {
		t.Fatalf("menu: %v", err)
	}
	for _, tc := range []struct {
		key        string
		path       string
		permission string
	}{
		{key: "events", path: "/admin/events", permission: "admin.events.view"},
		{key: "sessions", path: "/admin/sessions", permission: "admin.sessions.view"},
	} {
		if got := countMenuItemsByTargetKey(menu.Items, tc.key); got != 1 {
			t.Fatalf("expected one %s row after repair, got %d in %#v", tc.key, got, menu.Items)
		}
		item := findMenuItemByTargetKey(menu.Items, tc.key)
		if item == nil {
			t.Fatalf("expected %s row", tc.key)
		}
		if got := strings.TrimSpace(toString(item.Target["path"])); got != tc.path {
			t.Fatalf("expected %s path repaired to %q, got %q", tc.key, tc.path, got)
		}
		if !stringSliceContains(item.Permissions, tc.permission) || stringSliceContains(item.Permissions, "admin.archive.view") {
			t.Fatalf("expected %s permissions repaired, got %#v", tc.key, item.Permissions)
		}
	}
}

func TestAdminPersistMenuItemsSkipsAmbiguousTargetKeyMatches(t *testing.T) {
	ctx := context.Background()
	menuSvc := NewInMemoryMenuService()
	adm := mustNewAdmin(t, Config{
		DefaultLocale: "en",
		NavMenuCode:   "admin_main",
	}, Dependencies{FeatureGate: featureGateFromKeys(FeatureCMS)})
	adm.UseCMS(&stubCMSContainer{menu: menuSvc})

	mustCreateNavigationTestMenu(t, menuSvc, ctx, "admin_main")
	for _, item := range []MenuItem{
		{ID: "custom.media.one", Label: "Media One", Locale: "en", Target: map[string]any{"type": "url", "path": "/custom/one", "key": "media"}},
		{ID: "custom.media.two", Label: "Media Two", Locale: "en", Target: map[string]any{"type": "url", "path": "/custom/two", "key": "media"}},
	} {
		mustAddNavigationTestMenuItem(t, menuSvc, ctx, "admin_main", item)
	}

	if err := adm.addMenuItems(ctx, []MenuItem{{
		Label:       "Media",
		Locale:      "en",
		Menu:        "admin_main",
		Permissions: []string{"admin.media.view"},
		Target:      map[string]any{"type": "url", "path": "/admin/media", "key": "media"},
	}}); err != nil {
		t.Fatalf("addMenuItems: %v", err)
	}

	menu, err := menuSvc.Menu(ctx, "admin_main", "en")
	if err != nil {
		t.Fatalf("menu: %v", err)
	}
	if got := countMenuItemsByTargetKey(menu.Items, "media"); got != 3 {
		t.Fatalf("expected ambiguous media rows plus canonical module row, got %d in %#v", got, menu.Items)
	}
	if item := findNavigationTestMenuItemByID(menu.Items, "custom.media.one"); item == nil || strings.TrimSpace(toString(item.Target["path"])) != "/custom/one" {
		t.Fatalf("expected first ambiguous row untouched, got %#v", item)
	}
	if item := findNavigationTestMenuItemByID(menu.Items, "custom.media.two"); item == nil || strings.TrimSpace(toString(item.Target["path"])) != "/custom/two" {
		t.Fatalf("expected second ambiguous row untouched, got %#v", item)
	}
	if item := findNavigationTestMenuItemByID(menu.Items, "admin_main.media"); item == nil || strings.TrimSpace(toString(item.Target["path"])) != "/admin/media" {
		t.Fatalf("expected canonical media row created without mutating ambiguous rows, got %#v", item)
	}
}

func TestAdminPersistMenuItemsPreservesCallerContextOnRepair(t *testing.T) {
	type contextKey string
	const requestKey contextKey = "request"

	base := NewInMemoryMenuService()
	menuSvc := &contextRecordingMenuService{InMemoryMenuService: base, key: requestKey}
	adm := mustNewAdmin(t, Config{
		DefaultLocale: "en",
		NavMenuCode:   "admin_main",
	}, Dependencies{FeatureGate: featureGateFromKeys(FeatureCMS)})
	adm.UseCMS(&stubCMSContainer{menu: menuSvc})

	ctx := context.WithValue(context.Background(), requestKey, "startup-1")
	mustCreateNavigationTestMenu(t, menuSvc, ctx, "admin_main")
	mustAddNavigationTestMenuItem(t, menuSvc, ctx, "admin_main", MenuItem{
		ID:     "custom.media",
		Label:  "Media",
		Locale: "en",
		Target: map[string]any{"type": "url", "path": "", "key": "media"},
	})

	if err := adm.addMenuItems(ctx, []MenuItem{{
		Label:  "Media",
		Locale: "en",
		Menu:   "admin_main",
		Target: map[string]any{"type": "url", "path": "/admin/media", "key": "media"},
	}}); err != nil {
		t.Fatalf("addMenuItems: %v", err)
	}
	if got := menuSvc.updateContextValue; got != "startup-1" {
		t.Fatalf("expected repair update to preserve caller context value, got %#v", got)
	}
}

type denySettingsNav struct{}

func (denySettingsNav) Can(ctx context.Context, action string, resource string) bool {
	_ = ctx
	if action == "admin.settings.view" && (resource == "navigation" || resource == "admin.settings") {
		return false
	}
	return true
}

func findMenuItemByTargetKey(items []MenuItem, key string) *MenuItem {
	for idx := range items {
		if strings.EqualFold(strings.TrimSpace(toString(items[idx].Target["key"])), key) {
			return &items[idx]
		}
		if child := findMenuItemByTargetKey(items[idx].Children, key); child != nil {
			return child
		}
	}
	return nil
}

func findNavigationTestMenuItemByID(items []MenuItem, id string) *MenuItem {
	for idx := range items {
		if strings.EqualFold(strings.TrimSpace(items[idx].ID), id) {
			return &items[idx]
		}
		if child := findNavigationTestMenuItemByID(items[idx].Children, id); child != nil {
			return child
		}
	}
	return nil
}

func countMenuItemsByTargetKey(items []MenuItem, key string) int {
	count := 0
	for idx := range items {
		if strings.EqualFold(strings.TrimSpace(toString(items[idx].Target["key"])), key) {
			count++
		}
		count += countMenuItemsByTargetKey(items[idx].Children, key)
	}
	return count
}

type contextRecordingMenuService struct {
	*InMemoryMenuService
	key                any
	updateContextValue any
}

func (s *contextRecordingMenuService) UpdateMenuItem(ctx context.Context, menuCode string, item MenuItem) error {
	s.updateContextValue = ctx.Value(s.key)
	return s.InMemoryMenuService.UpdateMenuItem(ctx, menuCode, item)
}

func stringSliceContains(values []string, want string) bool {
	for _, value := range values {
		if strings.TrimSpace(value) == want {
			return true
		}
	}
	return false
}

func TestSettingsNavigationPermissionFilters(t *testing.T) {
	cfg := Config{
		DefaultLocale: "en",
	}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromKeys(FeatureSettings)})
	adm.WithAuthorizer(denySettingsNav{})

	if err := adm.Initialize(router.NewHTTPServer().Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	items := adm.nav.Resolve(context.Background(), "en")
	for _, item := range items {
		if item.Label == "Settings" {
			t.Fatalf("expected settings item to be filtered by permissions")
		}
	}
}

func TestNavigationFallbackLocaleAndPermissions(t *testing.T) {
	nav := NewNavigation(nil, allowAll{})
	nav.AddItem(NavigationItem{Label: "Home", Locale: "en"})
	nav.AddItem(NavigationItem{Label: "Inicio", Locale: "es"})
	nav.AddItem(NavigationItem{Label: "Secure", Permissions: []string{"nav.secure"}})

	ctx := context.Background()
	en := nav.Resolve(ctx, "en")
	if len(en) != 2 || en[0].Label != "Home" {
		t.Fatalf("expected english items, got %+v", en)
	}
	es := nav.Resolve(ctx, "es")
	if len(es) != 2 || es[0].Label != "Inicio" {
		t.Fatalf("expected spanish item first, got %+v", es)
	}

	nav.SetAuthorizer(denyAllNav{})
	secureFiltered := nav.Resolve(ctx, "en")
	for _, item := range secureFiltered {
		if item.Label == "Secure" {
			t.Fatalf("permissioned item should be filtered")
		}
	}
}

type allowAllNav struct{}

func (allowAllNav) Can(ctx context.Context, action string, resource string) bool {
	_ = ctx
	_ = action
	_ = resource
	return true
}

type denyAllNav struct{}

func (denyAllNav) Can(ctx context.Context, action string, resource string) bool {
	_ = ctx
	_ = action
	_ = resource
	return false
}
