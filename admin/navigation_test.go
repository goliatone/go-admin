package admin

import (
	"context"
	"encoding/json"
	"reflect"
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

type denySettingsNav struct{}

func (denySettingsNav) Can(ctx context.Context, action string, resource string) bool {
	_ = ctx
	if action == "admin.settings.view" && (resource == "navigation" || resource == "admin.settings") {
		return false
	}
	return true
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
