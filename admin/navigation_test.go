package admin

import (
	"context"
	"encoding/json"
	"errors"
	"reflect"
	"strings"
	"sync"
	"testing"
	"time"

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
	field, ok = reflect.TypeFor[Config]().FieldByName("NavRouteMissingPolicy")
	if !ok {
		t.Fatalf("expected Config.NavRouteMissingPolicy field")
	}
	if got := field.Tag.Get("json"); got != "nav_route_missing_policy" {
		t.Fatalf("expected nav_route_missing_policy JSON tag, got %q", got)
	}

	var cfg Config
	if err := json.Unmarshal([]byte(`{"nav_permission_denied_mode":"disable","nav_route_missing_policy":"report"}`), &cfg); err != nil {
		t.Fatalf("unmarshal config: %v", err)
	}
	if cfg.NavPermissionDeniedMode != NavigationPermissionDeniedModeDisable {
		t.Fatalf("expected disable mode after unmarshal, got %q", cfg.NavPermissionDeniedMode)
	}
	if cfg.NavRouteMissingPolicy != NavigationRouteMissingPolicyReport {
		t.Fatalf("expected report route missing policy after unmarshal, got %q", cfg.NavRouteMissingPolicy)
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

func TestInMemoryMenuServiceMenuByLocationDoesNotDeadlock(t *testing.T) {
	ctx := context.Background()
	menuSvc := NewInMemoryMenuService()
	mustCreateNavigationTestMenu(t, menuSvc, ctx, "site_main")
	mustAddNavigationTestMenuItem(t, menuSvc, ctx, "site_main", MenuItem{
		ID:     "home",
		Label:  "Home",
		Locale: "en",
		Target: map[string]any{"url": "/"},
	})

	result := make(chan struct {
		menu *Menu
		err  error
	}, 1)
	go func() {
		menu, err := menuSvc.MenuByLocation(ctx, "site_main", "en")
		result <- struct {
			menu *Menu
			err  error
		}{menu: menu, err: err}
	}()

	select {
	case got := <-result:
		if got.err != nil {
			t.Fatalf("MenuByLocation: %v", got.err)
		}
		if got.menu == nil || got.menu.Code != "site_main" || len(got.menu.Items) != 1 {
			t.Fatalf("expected site_main menu from location, got %#v", got.menu)
		}
	case <-time.After(500 * time.Millisecond):
		t.Fatalf("MenuByLocation deadlocked")
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

func TestAdminPersistMenuItemsReportsRouteMissingItemsByDefaultOutsideDev(t *testing.T) {
	ctx := context.Background()
	menuSvc := NewInMemoryMenuService()
	adm := mustNewAdmin(t, Config{
		DefaultLocale: "en",
		NavMenuCode:   "admin_main",
		Debug:         DebugConfig{Environment: "production"},
	}, Dependencies{FeatureGate: featureGateFromKeys(FeatureCMS)})
	adm.UseCMS(&stubCMSContainer{menu: menuSvc})
	mustCreateNavigationTestMenu(t, menuSvc, ctx, "admin_main")

	err := adm.addMenuItems(ctx, []MenuItem{{
		Label:  "Broken",
		Locale: "en",
		Menu:   "admin_main",
		Target: map[string]any{"type": "url", "key": "broken"},
	}})
	if err != nil {
		t.Fatalf("expected production default route-missing item to be reported, got %v", err)
	}
	report := adm.NavigationLifecycleReport()
	if report.RouteMissingPolicy != NavigationRouteMissingPolicyReport {
		t.Fatalf("expected production default report policy, got %#v", report)
	}
	if !stringSliceContains(report.RouteMissingItems, "admin_main.broken") && !stringSliceContains(report.RouteMissingItems, "broken") {
		t.Fatalf("expected route-missing lifecycle diagnostic, got %#v", report)
	}
}

func TestNavigationRouteMissingAutoPolicyUsesDevModeSignals(t *testing.T) {
	tests := []struct {
		name string
		cfg  Config
		want NavigationRouteMissingPolicy
	}{
		{
			name: "errors dev mode is strict",
			cfg:  Config{Errors: ErrorConfig{DevMode: true}},
			want: NavigationRouteMissingPolicyStrict,
		},
		{
			name: "debug enabled normalizes to dev mode strict",
			cfg:  Config{Debug: DebugConfig{Enabled: true}},
			want: NavigationRouteMissingPolicyStrict,
		},
		{
			name: "test environment is strict",
			cfg:  Config{Debug: DebugConfig{Environment: "testing"}},
			want: NavigationRouteMissingPolicyStrict,
		},
		{
			name: "production environment reports",
			cfg:  Config{Debug: DebugConfig{Environment: "production"}},
			want: NavigationRouteMissingPolicyReport,
		},
		{
			name: "explicit report overrides dev mode",
			cfg: Config{
				Errors:                ErrorConfig{DevMode: true},
				NavRouteMissingPolicy: NavigationRouteMissingPolicyReport,
			},
			want: NavigationRouteMissingPolicyReport,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			adm := mustNewAdmin(t, tc.cfg, Dependencies{})
			if got := adm.NavigationLifecycleReport().RouteMissingPolicy; got != tc.want {
				t.Fatalf("expected route missing policy %q, got %q", tc.want, got)
			}
		})
	}
}

func TestAdminPersistMenuItemsPreservesUserRowMatchedOnlyByBroadTargetKey(t *testing.T) {
	ctx := context.Background()
	menuSvc := NewInMemoryMenuService()
	adm := mustNewAdmin(t, Config{
		DefaultLocale:         "en",
		NavMenuCode:           "admin_main",
		NavRouteMissingPolicy: NavigationRouteMissingPolicyStrict,
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

func TestAdminPersistMenuItemsRepairsLegacyEquivalentIDRow(t *testing.T) {
	ctx := context.Background()
	menuSvc := NewInMemoryMenuService()
	adm := mustNewAdmin(t, Config{
		DefaultLocale:         "en",
		NavMenuCode:           "admin_main",
		NavRouteMissingPolicy: NavigationRouteMissingPolicyStrict,
	}, Dependencies{FeatureGate: featureGateFromKeys(FeatureCMS)})
	adm.UseCMS(&stubCMSContainer{menu: menuSvc})

	mustCreateNavigationTestMenu(t, menuSvc, ctx, "admin_main")
	mustAddNavigationTestMenuItem(t, menuSvc, ctx, "admin_main", MenuItem{
		ID:       "admin_main.nav-group-others",
		Type:     MenuItemTypeGroup,
		Menu:     "admin_main",
		Locale:   "en",
		Position: new(90),
	})
	mustAddNavigationTestMenuItem(t, menuSvc, ctx, "admin_main", MenuItem{
		ID:       "admin_main.nav-group-others.feature-flags",
		Label:    "Feature Flags",
		LabelKey: "menu.feature_flags",
		Locale:   "en",
		Menu:     "admin_main",
		ParentID: "admin_main.nav-group-others",
		Icon:     "old-switch",
		Target: map[string]any{
			"type": "url",
			"path": "/admin/feature-flags",
			"key":  "feature_flags",
		},
		Permissions: []string{"admin.feature_flags.view"},
	})

	if err := adm.addMenuItems(ctx, []MenuItem{{
		Label:       "Feature Flags",
		LabelKey:    "menu.feature_flags",
		Icon:        "switch-on",
		Locale:      "en",
		Menu:        "admin_main",
		ParentID:    "admin_main.nav-group-others",
		Permissions: []string{"admin.feature_flags.view"},
		Target: map[string]any{
			"type": "url",
			"path": "/admin/feature-flags",
			"key":  "feature_flags",
		},
	}}); err != nil {
		t.Fatalf("addMenuItems: %v", err)
	}

	menu, err := menuSvc.Menu(ctx, "admin_main", "en")
	if err != nil {
		t.Fatalf("menu: %v", err)
	}
	if got := countMenuItemsByTargetKey(menu.Items, "feature_flags"); got != 1 {
		t.Fatalf("expected one feature flags row after repair, got %d in %#v", got, menu.Items)
	}
	legacy := findNavigationTestMenuItemByID(menu.Items, "admin_main.nav-group-others.feature-flags")
	if legacy == nil {
		t.Fatalf("expected legacy feature flags row to be repaired in place, got %#v", menu.Items)
	}
	if got := strings.TrimSpace(legacy.Icon); got != "switch-on" {
		t.Fatalf("expected feature flags icon repaired, got %q", got)
	}
	if got := strings.TrimSpace(toString(legacy.Target[menuTargetProgrammaticOwnerKey])); got != menuTargetProgrammaticOwner {
		t.Fatalf("expected programmatic owner metadata, got target %#v", legacy.Target)
	}
	if got := strings.TrimSpace(toString(legacy.Target[menuTargetProgrammaticIDKey])); got != "feature_flags" {
		t.Fatalf("expected programmatic owner id feature_flags, got target %#v", legacy.Target)
	}
	if canonical := findNavigationTestMenuItemByID(menu.Items, "admin_main.nav-group-others.feature_flags"); canonical != nil {
		t.Fatalf("expected no duplicate canonical feature flags row, got %#v", *canonical)
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

func TestAdminPersistMenuItemsUsesRawInventoryWhenRenderedMenuHidesRow(t *testing.T) {
	ctx := context.Background()
	rawOnly := MenuItem{
		ID:          "legacy.media",
		Label:       "Media",
		Locale:      "en",
		Permissions: []string{"admin.archive.view"},
		Target:      map[string]any{"type": "url", "path": "", "key": "media"},
	}
	menuSvc := &adminRawInventoryOnlyMenuService{
		InMemoryMenuService: NewInMemoryMenuService(),
		raw:                 []MenuItem{rawOnly},
	}
	adm := mustNewAdmin(t, Config{
		DefaultLocale: "en",
		NavMenuCode:   "admin_main",
	}, Dependencies{FeatureGate: featureGateFromKeys(FeatureCMS)})
	adm.UseCMS(&stubCMSContainer{menu: menuSvc})
	mustCreateNavigationTestMenu(t, menuSvc, ctx, "admin_main")

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
	if got := countMenuItemsByTargetKey(menu.Items, "media"); got != 1 {
		t.Fatalf("expected one repaired media row from raw inventory, got %d in %#v", got, menu.Items)
	}
	item := findMenuItemByTargetKey(menu.Items, "media")
	if item == nil {
		t.Fatalf("expected media row")
	}
	if got := strings.TrimSpace(toString(item.Target["path"])); got != "/admin/media" {
		t.Fatalf("expected raw hidden media row to be repaired, got path %q", got)
	}
}

func TestAdminPersistMenuItemsPreservesExtendedMenuFields(t *testing.T) {
	ctx := context.Background()
	menuSvc := NewInMemoryMenuService()
	adm := mustNewAdmin(t, Config{
		DefaultLocale: "en",
		NavMenuCode:   "admin_main",
	}, Dependencies{FeatureGate: featureGateFromKeys(FeatureCMS)})
	adm.UseCMS(&stubCMSContainer{menu: menuSvc})
	mustCreateNavigationTestMenu(t, menuSvc, ctx, "admin_main")
	mustAddNavigationTestMenuItem(t, menuSvc, ctx, "admin_main", MenuItem{
		ID:     "legacy.media",
		Label:  "Media",
		Locale: "en",
		Target: map[string]any{"type": "url", "path": "", "key": "media"},
	})

	urlOverride := "/admin/media?layout=compact"
	expectedBadge := map[string]any{"label": "New", "tone": "info"}
	expectedClasses := []string{"nav-media", "is-promoted"}
	expectedStyles := map[string]string{"--accent": "#0a7"}
	if err := adm.addMenuItems(ctx, []MenuItem{{
		Label:       "Media",
		Locale:      "en",
		Menu:        "admin_main",
		URLOverride: &urlOverride,
		Badge:       expectedBadge,
		Classes:     expectedClasses,
		Styles:      expectedStyles,
		Target:      map[string]any{"type": "url", "path": "/admin/media", "key": "media"},
	}}); err != nil {
		t.Fatalf("addMenuItems: %v", err)
	}

	menu, err := menuSvc.Menu(ctx, "admin_main", "en")
	if err != nil {
		t.Fatalf("menu: %v", err)
	}
	item := findMenuItemByTargetKey(menu.Items, "media")
	if item == nil {
		t.Fatalf("expected media row, got %#v", menu.Items)
	}
	if item.URLOverride == nil || *item.URLOverride != urlOverride {
		t.Fatalf("expected URLOverride %q, got %#v", urlOverride, item.URLOverride)
	}
	if !reflect.DeepEqual(item.Badge, expectedBadge) {
		t.Fatalf("expected badge %#v, got %#v", expectedBadge, item.Badge)
	}
	if !reflect.DeepEqual(item.Classes, expectedClasses) {
		t.Fatalf("expected classes %#v, got %#v", expectedClasses, item.Classes)
	}
	if !reflect.DeepEqual(item.Styles, expectedStyles) {
		t.Fatalf("expected styles %#v, got %#v", expectedStyles, item.Styles)
	}
}

func TestAdminPersistMenuItemsFailsLoudlyForRouteMissingModuleItem(t *testing.T) {
	ctx := context.Background()
	menuSvc := NewInMemoryMenuService()
	adm := mustNewAdmin(t, Config{
		DefaultLocale:         "en",
		NavMenuCode:           "admin_main",
		NavRouteMissingPolicy: NavigationRouteMissingPolicyStrict,
	}, Dependencies{FeatureGate: featureGateFromKeys(FeatureCMS)})
	adm.UseCMS(&stubCMSContainer{menu: menuSvc})
	mustCreateNavigationTestMenu(t, menuSvc, ctx, "admin_main")

	err := adm.addMenuItems(ctx, []MenuItem{{
		Label:  "Broken",
		Locale: "en",
		Menu:   "admin_main",
		Target: map[string]any{"type": "url", "key": "broken"},
	}})
	if err == nil {
		t.Fatalf("expected route-missing module item to fail")
	}
	if !strings.Contains(errorDetail(err), "navigation route target missing") {
		t.Fatalf("expected route-missing error, got %v", err)
	}
	report := adm.NavigationLifecycleReport()
	if !stringSliceContains(report.RouteMissingItems, "admin_main.broken") && !stringSliceContains(report.RouteMissingItems, "broken") {
		t.Fatalf("expected route-missing lifecycle diagnostic, got %#v", report)
	}
}

func TestAdminPersistMenuItemsFailsForRouteMissingModuleItemInAutoDevMode(t *testing.T) {
	ctx := context.Background()
	menuSvc := NewInMemoryMenuService()
	adm := mustNewAdmin(t, Config{
		DefaultLocale: "en",
		NavMenuCode:   "admin_main",
		Errors:        ErrorConfig{DevMode: true},
	}, Dependencies{FeatureGate: featureGateFromKeys(FeatureCMS)})
	adm.UseCMS(&stubCMSContainer{menu: menuSvc})
	mustCreateNavigationTestMenu(t, menuSvc, ctx, "admin_main")

	err := adm.addMenuItems(ctx, []MenuItem{{
		Label:  "Broken",
		Locale: "en",
		Menu:   "admin_main",
		Target: map[string]any{"type": "url", "key": "broken"},
	}})
	if err == nil {
		t.Fatalf("expected route-missing module item to fail in dev auto mode")
	}
	if !strings.Contains(errorDetail(err), "navigation route target missing") {
		t.Fatalf("expected route-missing error, got %v", err)
	}
	report := adm.NavigationLifecycleReport()
	if report.RouteMissingPolicy != NavigationRouteMissingPolicyStrict {
		t.Fatalf("expected strict route-missing policy in dev auto mode, got %#v", report)
	}
	if !stringSliceContains(report.RouteMissingItems, "admin_main.broken") && !stringSliceContains(report.RouteMissingItems, "broken") {
		t.Fatalf("expected route-missing lifecycle diagnostic, got %#v", report)
	}
}

func TestAdminPersistMenuItemsReportsAndSkipsRouteMissingItemsInReportMode(t *testing.T) {
	ctx := context.Background()
	menuSvc := NewInMemoryMenuService()
	adm := mustNewAdmin(t, Config{
		DefaultLocale: "en",
		NavMenuCode:   "admin_main",
	}, Dependencies{FeatureGate: featureGateFromKeys(FeatureCMS)})
	adm.UseCMS(&stubCMSContainer{menu: menuSvc})
	adm.WithNavigationRouteMissingPolicy(NavigationRouteMissingPolicyReport)
	mustCreateNavigationTestMenu(t, menuSvc, ctx, "admin_main")

	err := adm.addMenuItems(ctx, []MenuItem{{
		Label:  "Broken",
		Locale: "en",
		Menu:   "admin_main",
		Target: map[string]any{"type": "url", "key": "broken"},
	}})
	if err != nil {
		t.Fatalf("expected report-mode route-missing item to be skipped, got %v", err)
	}
	report := adm.NavigationLifecycleReport()
	if report.RouteMissingPolicy != NavigationRouteMissingPolicyReport {
		t.Fatalf("expected report route-missing policy, got %#v", report)
	}
	if !stringSliceContains(report.RouteMissingItems, "admin_main.broken") && !stringSliceContains(report.RouteMissingItems, "broken") {
		t.Fatalf("expected route-missing lifecycle diagnostic, got %#v", report)
	}
	menu, err := menuSvc.Menu(ctx, "admin_main", "en")
	if err != nil {
		t.Fatalf("menu: %v", err)
	}
	if countMenuItemsByTargetKey(menu.Items, "broken") != 0 {
		t.Fatalf("expected broken item to be skipped in report mode, got %#v", menu.Items)
	}
}

func TestAdminPersistMenuItemsFailsWhenRawInventoryProviderErrors(t *testing.T) {
	ctx := context.Background()
	rawErr := errors.New("raw inventory unavailable")
	menuSvc := &adminRawInventoryErrorMenuService{
		InMemoryMenuService: NewInMemoryMenuService(),
		err:                 rawErr,
	}
	adm := mustNewAdmin(t, Config{
		DefaultLocale: "en",
		NavMenuCode:   "admin_main",
	}, Dependencies{FeatureGate: featureGateFromKeys(FeatureCMS)})
	adm.UseCMS(&stubCMSContainer{menu: menuSvc})
	mustCreateNavigationTestMenu(t, menuSvc, ctx, "admin_main")

	err := adm.addMenuItems(ctx, []MenuItem{{
		Label:  "Media",
		Locale: "en",
		Menu:   "admin_main",
		Target: map[string]any{"type": "url", "path": "/admin/media", "key": "media"},
	}})
	if err == nil || !strings.Contains(errorDetail(err), "navigation raw inventory unavailable") {
		t.Fatalf("expected raw inventory error, got %v", err)
	}
	report := adm.NavigationLifecycleReport()
	if len(report.RawInventoryErrors) != 1 || !strings.Contains(report.RawInventoryErrors[0], rawErr.Error()) {
		t.Fatalf("expected raw inventory lifecycle diagnostic, got %#v", report)
	}
}

func TestNavigationLifecycleReportIncludesEnvironmentAndCoordination(t *testing.T) {
	adm := mustNewAdmin(t, Config{
		DefaultLocale:  "en",
		NavMenuCode:    "admin_main",
		NavEnvironment: "staging",
		Debug:          DebugConfig{Environment: "production"},
	}, Dependencies{FeatureGate: featureGateFromKeys(FeatureCMS)})
	adm.UseCMS(&stubCMSContainer{menu: NewInMemoryMenuService()})

	report := adm.NavigationLifecycleReport()
	if report.Environment != "staging" || report.EnvironmentSource != "config.nav_environment" {
		t.Fatalf("expected explicit navigation environment, got %#v", report)
	}
	if report.CoordinationBackend != "memory" || report.CoordinationSupported {
		t.Fatalf("expected in-memory unsupported coordination diagnostic, got %#v", report)
	}
	if report.CoordinationScope != "admin-process" {
		t.Fatalf("expected process-scoped coordination diagnostic, got %#v", report)
	}
	if report.PersistenceBackend != "memory" || !report.RawInventoryBounded || report.RawInventoryEnvScoped {
		t.Fatalf("expected in-memory persistence capability diagnostic, got %#v", report)
	}
	if !stringSliceContains(report.PersistenceWarnings, "in-memory menu service raw inventory accepts environment options but stores one process-local menu state per menu code") {
		t.Fatalf("expected in-memory environment scope warning, got %#v", report.PersistenceWarnings)
	}
	if report.TransactionalApply {
		t.Fatalf("expected in-memory transactional apply to be unsupported, got %#v", report)
	}
}

func TestAdminAddMenuItemsUsesNavigationConvergenceCoordinator(t *testing.T) {
	ctx := context.Background()
	menuSvc := &adminCoordinatedMenuService{InMemoryMenuService: NewInMemoryMenuService()}
	adm := mustNewAdmin(t, Config{
		DefaultLocale:  "en",
		NavMenuCode:    "admin_main",
		NavEnvironment: "preview",
	}, Dependencies{FeatureGate: featureGateFromKeys(FeatureCMS)})
	adm.UseCMS(&stubCMSContainer{menu: menuSvc})
	mustCreateNavigationTestMenu(t, menuSvc, ctx, "admin_main")

	if err := adm.addMenuItems(ctx, []MenuItem{{
		ID:     "admin_main.media",
		Label:  "Media",
		Locale: "en",
		Menu:   "admin_main",
		Target: map[string]any{"type": "url", "path": "/admin/media", "key": "media"},
	}}); err != nil {
		t.Fatalf("addMenuItems: %v", err)
	}
	if menuSvc.coordinationCalls != 1 {
		t.Fatalf("expected one coordination call, got %d", menuSvc.coordinationCalls)
	}
	if menuSvc.lastScope.MenuCode != "admin_main" || menuSvc.lastScope.Environment != "preview" || menuSvc.lastScope.EnvironmentSource != "config.nav_environment" {
		t.Fatalf("expected scoped convergence call, got %#v", menuSvc.lastScope)
	}
	if menuSvc.lastScope.EngineIdentity == "" || menuSvc.lastScope.EngineVersion == "" {
		t.Fatalf("expected engine stamp in convergence scope, got %#v", menuSvc.lastScope)
	}
}

func TestAdminPersistMenuItemsFailsWhenAddReportsTargetMissing(t *testing.T) {
	ctx := context.Background()
	menuSvc := &adminTargetMissingAddMenuService{InMemoryMenuService: NewInMemoryMenuService()}
	adm := mustNewAdmin(t, Config{
		DefaultLocale:         "en",
		NavMenuCode:           "admin_main",
		NavRouteMissingPolicy: NavigationRouteMissingPolicyStrict,
	}, Dependencies{FeatureGate: featureGateFromKeys(FeatureCMS)})
	adm.UseCMS(&stubCMSContainer{menu: menuSvc})
	mustCreateNavigationTestMenu(t, menuSvc, ctx, "admin_main")

	err := adm.addMenuItems(ctx, []MenuItem{{
		ID:     "admin_main.media",
		Label:  "Media",
		Locale: "en",
		Menu:   "admin_main",
		Target: map[string]any{"type": "url", "path": "/admin/media", "key": "media"},
	}})
	if err == nil || !strings.Contains(errorDetail(err), "navigation route target missing") {
		t.Fatalf("expected route-missing error from target-missing add, got %v", err)
	}
	report := adm.NavigationLifecycleReport()
	if !stringSliceContains(report.RouteMissingItems, "admin_main.media") {
		t.Fatalf("expected target-missing lifecycle diagnostic, got %#v", report)
	}
}

func TestAdminPersistMenuItemsFailsWhenRepairAddReportsTargetMissing(t *testing.T) {
	ctx := context.Background()
	raw := MenuItem{
		ID:     "admin_main.media",
		Label:  "Old Media",
		Locale: "en",
		Menu:   "admin_main",
		Target: map[string]any{"type": "url", "path": "/old/media", "key": "media"},
	}
	menuSvc := &adminTargetMissingRepairMenuService{
		InMemoryMenuService: NewInMemoryMenuService(),
		raw:                 []MenuItem{raw},
	}
	adm := mustNewAdmin(t, Config{
		DefaultLocale:         "en",
		NavMenuCode:           "admin_main",
		NavRouteMissingPolicy: NavigationRouteMissingPolicyStrict,
	}, Dependencies{FeatureGate: featureGateFromKeys(FeatureCMS)})
	adm.UseCMS(&stubCMSContainer{menu: menuSvc})
	mustCreateNavigationTestMenu(t, menuSvc, ctx, "admin_main")

	err := adm.addMenuItems(ctx, []MenuItem{{
		ID:     "admin_main.media",
		Label:  "Media",
		Locale: "en",
		Menu:   "admin_main",
		Target: map[string]any{"type": "url", "path": "/admin/media", "key": "media"},
	}})
	if err == nil || !strings.Contains(errorDetail(err), "navigation route target missing") {
		t.Fatalf("expected route-missing error from target-missing repair add, got %v", err)
	}
	report := adm.NavigationLifecycleReport()
	if !stringSliceContains(report.RouteMissingItems, "admin_main.media") {
		t.Fatalf("expected target-missing lifecycle diagnostic, got %#v", report)
	}
}

func TestAdminRawInventoryUsesNavigationEnvironmentScope(t *testing.T) {
	ctx := context.Background()
	menuSvc := &adminScopedRawInventoryMenuService{
		InMemoryMenuService: NewInMemoryMenuService(),
		raw:                 []MenuItem{},
	}
	adm := mustNewAdmin(t, Config{
		DefaultLocale:  "en",
		NavMenuCode:    "admin_main",
		NavEnvironment: "preview",
	}, Dependencies{FeatureGate: featureGateFromKeys(FeatureCMS)})
	adm.UseCMS(&stubCMSContainer{menu: menuSvc})
	mustCreateNavigationTestMenu(t, menuSvc, ctx, "admin_main")

	err := adm.addMenuItems(ctx, []MenuItem{{
		ID:     "admin_main.media",
		Label:  "Media",
		Locale: "en",
		Menu:   "admin_main",
		Target: map[string]any{"type": "url", "path": "/admin/media", "key": "media"},
	}})
	if err != nil {
		t.Fatalf("addMenuItems: %v", err)
	}
	if menuSvc.lastRawOptions.Environment != "preview" || menuSvc.lastRawOptions.EnvironmentSource != "config.nav_environment" {
		t.Fatalf("expected scoped raw inventory options, got %#v", menuSvc.lastRawOptions)
	}
	if menuSvc.lastRawOptions.MenuCode != "admin_main" {
		t.Fatalf("expected menu code in raw inventory options, got %#v", menuSvc.lastRawOptions)
	}
}

func TestAdminRawMenuItemsUsesScopedOnlyProvider(t *testing.T) {
	ctx := context.Background()
	provider := &adminScopedOnlyRawInventoryProvider{
		raw: []MenuItem{{
			ID:     "admin_main.media",
			Locale: "en",
			Target: map[string]any{"type": "url", "path": "/admin/media", "key": "media"},
		}},
	}

	items, err := rawMenuItems(ctx, provider, NavigationRawInventoryOptions{
		MenuCode:          "admin_main",
		Environment:       "preview",
		EnvironmentSource: "test",
	})
	if err != nil {
		t.Fatalf("rawMenuItems: %v", err)
	}
	if len(items) != 1 || items[0].ID != "admin_main.media" {
		t.Fatalf("expected scoped raw item, got %#v", items)
	}
	if provider.lastRawOptions.MenuCode != "admin_main" || provider.lastRawOptions.Environment != "preview" || provider.lastRawOptions.EnvironmentSource != "test" {
		t.Fatalf("expected scoped raw inventory options, got %#v", provider.lastRawOptions)
	}
}

func TestInMemoryMenuServiceStripsRequestScopedTargetState(t *testing.T) {
	ctx := context.Background()
	menuSvc := NewInMemoryMenuService()
	mustCreateNavigationTestMenu(t, menuSvc, ctx, "admin_main")

	if err := menuSvc.AddMenuItem(ctx, "admin_main", MenuItem{
		ID:     "admin_main.debug",
		Label:  "Debug",
		Locale: "en",
		Target: map[string]any{
			"type":                 "url",
			"path":                 "/admin/debug",
			"enabled":              false,
			"disabled":             true,
			"disabled_reason":      "Permission denied",
			"disabled_reason_code": "permission_denied",
		},
	}); err != nil {
		t.Fatalf("AddMenuItem: %v", err)
	}
	raw, err := menuSvc.RawMenuItems(ctx, "admin_main")
	if err != nil {
		t.Fatalf("RawMenuItems: %v", err)
	}
	if len(raw) != 1 {
		t.Fatalf("expected one raw row, got %#v", raw)
	}
	for _, key := range []string{"enabled", "disabled", "disabled_reason", "disabled_reason_code"} {
		if _, ok := raw[0].Target[key]; ok {
			t.Fatalf("expected request scoped key %q to be stripped, got target %#v", key, raw[0].Target)
		}
	}
}

func TestAdminDiagnoseNavigationUsesSharedClassifierAndRawInventory(t *testing.T) {
	ctx := context.Background()
	menuSvc := &adminRawInventoryOnlyMenuService{
		InMemoryMenuService: NewInMemoryMenuService(),
		raw: []MenuItem{{
			ID:     "admin_main.media",
			Label:  "Media",
			Locale: "en",
			Target: map[string]any{
				"_menu_owner":    "go-admin.programmatic",
				"_menu_owner_id": "media",
				"type":           "url",
				"path":           "/admin/media",
				"key":            "media",
			},
		}},
	}
	adm := mustNewAdmin(t, Config{
		DefaultLocale: "en",
		NavMenuCode:   "admin_main",
	}, Dependencies{FeatureGate: featureGateFromKeys(FeatureCMS)})
	adm.UseCMS(&stubCMSContainer{menu: menuSvc})
	mustCreateNavigationTestMenu(t, menuSvc, ctx, "admin_main")

	report, err := adm.DiagnoseNavigation(ctx, NavigationDoctorOptions{
		MenuCode: "admin_main",
		Locale:   "en",
		Expected: []NavigationDoctorExpectedItem{{
			Owner: NavigationOwnerModule,
			Item: MenuItem{
				ID:     "admin_main.media",
				Label:  "Media",
				Locale: "en",
				Target: map[string]any{
					"_menu_owner":    "go-admin.programmatic",
					"_menu_owner_id": "media",
					"type":           "url",
					"path":           "/admin/media",
					"key":            "media",
				},
			},
		}},
	})
	if err != nil {
		t.Fatalf("DiagnoseNavigation: %v", err)
	}
	if report.EngineIdentity == "" || report.EngineVersion == "" {
		t.Fatalf("expected engine stamp, got %#v", report)
	}
	if report.Environment != "default" || report.EnvironmentSource != "default" {
		t.Fatalf("expected default doctor environment, got %#v", report)
	}
	if report.CoordinationBackend != "memory" || report.CoordinationWarning == "" {
		t.Fatalf("expected doctor coordination diagnostic, got %#v", report)
	}
	if len(report.Items) != 1 {
		t.Fatalf("expected one classified item, got %#v", report.Items)
	}
	if report.Items[0].Classification != NavigationClassificationRawPresentNotRendered {
		t.Fatalf("expected raw-present-not-rendered classification, got %#v", report.Items[0])
	}
}

func TestAdminDiagnoseNavigationUsesScopedOnlyRawInventoryProvider(t *testing.T) {
	ctx := context.Background()
	rawItem := MenuItem{
		ID:     "admin_main.media",
		Label:  "Media",
		Locale: "en",
		Target: map[string]any{
			"_menu_owner":    "go-admin.programmatic",
			"_menu_owner_id": "media",
			"type":           "url",
			"path":           "/admin/media",
			"key":            "media",
		},
	}
	menuSvc := &adminScopedOnlyDoctorMenuService{
		base: NewInMemoryMenuService(),
		raw:  []MenuItem{rawItem},
	}
	adm := mustNewAdmin(t, Config{
		DefaultLocale:  "en",
		NavMenuCode:    "admin_main",
		NavEnvironment: "preview",
	}, Dependencies{FeatureGate: featureGateFromKeys(FeatureCMS)})
	adm.UseCMS(&stubCMSContainer{menu: menuSvc})
	mustCreateNavigationTestMenu(t, menuSvc, ctx, "admin_main")

	report, err := adm.DiagnoseNavigation(ctx, NavigationDoctorOptions{
		MenuCode: "admin_main",
		Locale:   "en",
		Expected: []NavigationDoctorExpectedItem{{
			Owner: NavigationOwnerModule,
			Item:  rawItem,
		}},
	})
	if err != nil {
		t.Fatalf("DiagnoseNavigation: %v", err)
	}
	if menuSvc.lastRawOptions.MenuCode != "admin_main" || menuSvc.lastRawOptions.Environment != "preview" || menuSvc.lastRawOptions.EnvironmentSource != "config.nav_environment" {
		t.Fatalf("expected scoped raw options, got %#v", menuSvc.lastRawOptions)
	}
	if len(report.Items) != 1 || report.Items[0].Classification != NavigationClassificationRawPresentNotRendered {
		t.Fatalf("expected scoped-only raw row classified as raw-present-not-rendered, got %#v", report.Items)
	}
}

func TestNavigationContributionLifecycleRejectsLateWritesInStrictMode(t *testing.T) {
	menuSvc := NewInMemoryMenuService()
	adm := mustNewAdmin(t, Config{
		DefaultLocale: "en",
		NavMenuCode:   "admin.main",
	}, Dependencies{FeatureGate: featureGateFromKeys(FeatureCMS)})
	adm.UseCMS(&stubCMSContainer{menu: menuSvc})
	adm.WithNavigationContributionPolicy(NavigationContributionPolicyStrict)
	report := adm.CloseNavigationContributions()
	if !report.ContributionsClosed || report.Policy != NavigationContributionPolicyStrict {
		t.Fatalf("expected strict closed lifecycle report, got %#v", report)
	}

	err := adm.addMenuItems(context.Background(), []MenuItem{{
		ID:     "admin_main.late",
		Label:  "Late",
		Locale: "en",
		Target: map[string]any{"type": "url", "path": "/admin/late", "key": "late"},
	}})
	if err == nil || !strings.Contains(errorDetail(err), "navigation contributions closed") {
		t.Fatalf("expected late write rejection, got %v", err)
	}
}

func TestNavigationContributionLifecycleQueuesLateWritesInTolerantMode(t *testing.T) {
	ctx := context.Background()
	menuSvc := NewInMemoryMenuService()
	adm := mustNewAdmin(t, Config{
		DefaultLocale: "en",
		NavMenuCode:   "admin.main",
	}, Dependencies{FeatureGate: featureGateFromKeys(FeatureCMS)})
	adm.UseCMS(&stubCMSContainer{menu: menuSvc})
	adm.WithNavigationContributionPolicy(NavigationContributionPolicyTolerant)
	adm.CloseNavigationContributions()

	err := adm.addMenuItems(ctx, []MenuItem{{
		ID:     "admin_main.late",
		Label:  "Late",
		Locale: "en",
		Target: map[string]any{"type": "url", "path": "/admin/late", "key": "late"},
	}})
	if err != nil {
		t.Fatalf("expected tolerant late write to queue, got %v", err)
	}
	if got := adm.NavigationLifecycleReport().QueuedItems; got != 1 {
		t.Fatalf("expected one queued item, got %d", got)
	}
	if flushErr := adm.FlushQueuedNavigationContributions(ctx); flushErr != nil {
		t.Fatalf("flush queued navigation contributions: %v", flushErr)
	}
	if got := adm.NavigationLifecycleReport().QueuedItems; got != 0 {
		t.Fatalf("expected queue to drain, got %d", got)
	}
	menu, err := menuSvc.Menu(ctx, "admin.main", "en")
	if err != nil {
		t.Fatalf("menu: %v", err)
	}
	if countMenuItemsByTargetKey(menu.Items, "late") != 1 {
		t.Fatalf("expected flushed late item, got %#v", menu.Items)
	}
}

func TestNavigationContributionLifecycleRetainsQueuedWritesWhenFlushFails(t *testing.T) {
	ctx := context.Background()
	menuSvc := &adminRawInventoryErrorMenuService{
		InMemoryMenuService: NewInMemoryMenuService(),
		err:                 errors.New("raw inventory failed"),
	}
	adm := mustNewAdmin(t, Config{
		DefaultLocale: "en",
		NavMenuCode:   "admin.main",
	}, Dependencies{FeatureGate: featureGateFromKeys(FeatureCMS)})
	adm.UseCMS(&stubCMSContainer{menu: menuSvc})
	adm.WithNavigationContributionPolicy(NavigationContributionPolicyTolerant)
	adm.CloseNavigationContributions()

	if err := adm.addMenuItems(ctx, []MenuItem{{
		ID:     "admin_main.late",
		Label:  "Late",
		Locale: "en",
		Target: map[string]any{"type": "url", "path": "/admin/late", "key": "late"},
	}}); err != nil {
		t.Fatalf("queue late navigation item: %v", err)
	}
	err := adm.FlushQueuedNavigationContributions(ctx)
	if err == nil || !strings.Contains(errorDetail(err), "navigation raw inventory unavailable") {
		t.Fatalf("expected raw inventory flush error, got %v", err)
	}
	if got := adm.NavigationLifecycleReport().QueuedItems; got != 1 {
		t.Fatalf("expected failed flush to retain queued item, got %d", got)
	}
}

func TestNavigationConvergenceSerializesConcurrentModuleWrites(t *testing.T) {
	ctx := context.Background()
	menuSvc := NewInMemoryMenuService()
	adm := mustNewAdmin(t, Config{
		DefaultLocale: "en",
		NavMenuCode:   "admin.main",
	}, Dependencies{FeatureGate: featureGateFromKeys(FeatureCMS)})
	adm.UseCMS(&stubCMSContainer{menu: menuSvc})

	item := MenuItem{
		ID:     "admin_main.concurrent",
		Label:  "Concurrent",
		Locale: "en",
		Target: map[string]any{"type": "url", "path": "/admin/concurrent", "key": "concurrent"},
	}
	var wg sync.WaitGroup
	errs := make(chan error, 2)
	for range 2 {
		wg.Go(func() {
			errs <- adm.addMenuItems(ctx, []MenuItem{item})
		})
	}
	wg.Wait()
	close(errs)
	for err := range errs {
		if err != nil {
			t.Fatalf("addMenuItems: %v", err)
		}
	}
	menu, err := menuSvc.Menu(ctx, "admin.main", "en")
	if err != nil {
		t.Fatalf("menu: %v", err)
	}
	if countMenuItemsByTargetKey(menu.Items, "concurrent") != 1 {
		t.Fatalf("expected one concurrent item, got %#v", menu.Items)
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

type adminRawInventoryOnlyMenuService struct {
	*InMemoryMenuService
	raw []MenuItem
}

func (s *adminRawInventoryOnlyMenuService) RawMenuItems(context.Context, string) ([]MenuItem, error) {
	return append([]MenuItem{}, s.raw...), nil
}

func (s *adminRawInventoryOnlyMenuService) RawMenuItemsWithOptions(context.Context, NavigationRawInventoryOptions) ([]MenuItem, error) {
	return append([]MenuItem{}, s.raw...), nil
}

type adminRawInventoryErrorMenuService struct {
	*InMemoryMenuService
	err error
}

func (s *adminRawInventoryErrorMenuService) RawMenuItems(context.Context, string) ([]MenuItem, error) {
	return nil, s.err
}

func (s *adminRawInventoryErrorMenuService) RawMenuItemsWithOptions(context.Context, NavigationRawInventoryOptions) ([]MenuItem, error) {
	return nil, s.err
}

type adminScopedRawInventoryMenuService struct {
	*InMemoryMenuService
	raw            []MenuItem
	lastRawOptions NavigationRawInventoryOptions
}

func (s *adminScopedRawInventoryMenuService) RawMenuItems(context.Context, string) ([]MenuItem, error) {
	return append([]MenuItem{}, s.raw...), nil
}

func (s *adminScopedRawInventoryMenuService) RawMenuItemsWithOptions(_ context.Context, opts NavigationRawInventoryOptions) ([]MenuItem, error) {
	s.lastRawOptions = opts
	return append([]MenuItem{}, s.raw...), nil
}

type adminScopedOnlyRawInventoryProvider struct {
	raw            []MenuItem
	lastRawOptions NavigationRawInventoryOptions
}

func (s *adminScopedOnlyRawInventoryProvider) RawMenuItemsWithOptions(_ context.Context, opts NavigationRawInventoryOptions) ([]MenuItem, error) {
	s.lastRawOptions = opts
	return append([]MenuItem{}, s.raw...), nil
}

type adminScopedOnlyDoctorMenuService struct {
	base           *InMemoryMenuService
	raw            []MenuItem
	lastRawOptions NavigationRawInventoryOptions
}

func (s *adminScopedOnlyDoctorMenuService) CreateMenu(ctx context.Context, code string) (*Menu, error) {
	return s.base.CreateMenu(ctx, code)
}

func (s *adminScopedOnlyDoctorMenuService) AddMenuItem(ctx context.Context, menuCode string, item MenuItem) error {
	return s.base.AddMenuItem(ctx, menuCode, item)
}

func (s *adminScopedOnlyDoctorMenuService) UpdateMenuItem(ctx context.Context, menuCode string, item MenuItem) error {
	return s.base.UpdateMenuItem(ctx, menuCode, item)
}

func (s *adminScopedOnlyDoctorMenuService) DeleteMenuItem(ctx context.Context, menuCode, id string) error {
	return s.base.DeleteMenuItem(ctx, menuCode, id)
}

func (s *adminScopedOnlyDoctorMenuService) ReorderMenu(ctx context.Context, menuCode string, orderedIDs []string) error {
	return s.base.ReorderMenu(ctx, menuCode, orderedIDs)
}

func (s *adminScopedOnlyDoctorMenuService) Menu(ctx context.Context, code, locale string) (*Menu, error) {
	return s.base.Menu(ctx, code, locale)
}

func (s *adminScopedOnlyDoctorMenuService) MenuByLocation(ctx context.Context, location, locale string) (*Menu, error) {
	return s.base.MenuByLocation(ctx, location, locale)
}

func (s *adminScopedOnlyDoctorMenuService) RawMenuItemsWithOptions(_ context.Context, opts NavigationRawInventoryOptions) ([]MenuItem, error) {
	s.lastRawOptions = opts
	return append([]MenuItem{}, s.raw...), nil
}

type adminCoordinatedMenuService struct {
	*InMemoryMenuService
	coordinationCalls int
	lastScope         NavigationConvergenceScope
}

func (s *adminCoordinatedMenuService) NavigationCoordinationReport() NavigationCoordinationReport {
	return NavigationCoordinationReport{
		Backend:   "test",
		Scope:     "test-menu",
		Supported: true,
	}
}

func (s *adminCoordinatedMenuService) WithNavigationConvergence(ctx context.Context, scope NavigationConvergenceScope, fn func(context.Context) error) error {
	s.coordinationCalls++
	s.lastScope = scope
	if fn == nil {
		return nil
	}
	return fn(ctx)
}

type adminTargetMissingAddMenuService struct {
	*InMemoryMenuService
}

func (s *adminTargetMissingAddMenuService) AddMenuItem(context.Context, string, MenuItem) error {
	return ErrMenuTargetNotFound
}

type adminTargetMissingRepairMenuService struct {
	*InMemoryMenuService
	raw []MenuItem
}

func (s *adminTargetMissingRepairMenuService) RawMenuItems(context.Context, string) ([]MenuItem, error) {
	return append([]MenuItem{}, s.raw...), nil
}

func (s *adminTargetMissingRepairMenuService) RawMenuItemsWithOptions(context.Context, NavigationRawInventoryOptions) ([]MenuItem, error) {
	return append([]MenuItem{}, s.raw...), nil
}

func (s *adminTargetMissingRepairMenuService) UpdateMenuItem(context.Context, string, MenuItem) error {
	return ErrMenuTargetNotFound
}

func (s *adminTargetMissingRepairMenuService) AddMenuItem(context.Context, string, MenuItem) error {
	return ErrMenuTargetNotFound
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
