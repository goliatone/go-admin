package quickstart

import (
	"context"
	"net/url"
	"strings"
	"testing"

	"github.com/goliatone/go-admin/admin"
	urlkit "github.com/goliatone/go-urlkit"
	"github.com/goliatone/go-users/command"
)

func TestBuildNavItemsOrdering(t *testing.T) {
	cfg := admin.Config{
		DefaultLocale: "en",
	}
	adm, err := admin.New(cfg, admin.Dependencies{})
	if err != nil {
		t.Fatalf("admin.New: %v", err)
	}
	ctx := context.Background()

	nav := adm.Navigation()
	nav.UseCMS(false)
	nav.AddFallback(
		admin.NavigationItem{Label: "Second", Position: intPtr(2)},
		admin.NavigationItem{Label: "First", Position: intPtr(1)},
		admin.NavigationItem{
			ID:          "parent",
			Label:       "Parent",
			Collapsible: true,
			Position:    intPtr(5),
			Children: []admin.NavigationItem{
				{Label: "ChildB", Position: intPtr(2)},
				{Label: "ChildA", Position: intPtr(1)},
				{Label: "ChildAuto"},
			},
		},
	)

	items := BuildNavItems(adm, cfg, ctx, "")
	if len(items) != 3 {
		t.Fatalf("expected 3 root items, got %d", len(items))
	}
	if items[0]["label"] != "First" || items[1]["label"] != "Second" {
		t.Fatalf("unexpected root order: %v, %v", items[0]["label"], items[1]["label"])
	}

	parent := items[2]
	children, ok := parent["children"].([]map[string]any)
	if !ok {
		t.Fatalf("expected children slice, got %T", parent["children"])
	}
	expected := []string{"ChildA", "ChildB", "ChildAuto"}
	if len(children) != len(expected) {
		t.Fatalf("expected %d children, got %d", len(expected), len(children))
	}
	for i, child := range children {
		if child["label"] != expected[i] {
			t.Fatalf("child %d expected %s, got %v", i, expected[i], child["label"])
		}
	}
}

func TestWithNavInjectsThemeAndSession(t *testing.T) {
	cfg := admin.Config{DefaultLocale: "en"}
	adm, err := admin.New(cfg, admin.Dependencies{})
	if err != nil {
		t.Fatalf("admin.New: %v", err)
	}
	ctx := context.Background()

	view := WithNav(nil, adm, cfg, "", ctx)
	if view["session_user"] == nil {
		t.Fatalf("expected session_user in view context")
	}
	if view["theme"] == nil {
		t.Fatalf("expected theme in view context")
	}
	if view["nav_items"] == nil {
		t.Fatalf("expected nav_items in view context")
	}
	if view["nav_utility_items"] == nil {
		t.Fatalf("expected nav_utility_items in view context")
	}
	if view["asset_base_path"] == nil {
		t.Fatalf("expected asset_base_path in view context")
	}
	if view["translation_capabilities"] == nil {
		t.Fatalf("expected translation_capabilities in view context")
	}
	if _, ok := view["activity_enabled"].(bool); !ok {
		t.Fatalf("expected activity_enabled boolean in view context")
	}
	if _, ok := view["activity_feature_enabled"].(bool); !ok {
		t.Fatalf("expected activity_feature_enabled boolean in view context")
	}
	if available, ok := view["users_import_available"].(bool); !ok || available {
		t.Fatalf("expected users_import_available=false by default, got %v", view["users_import_available"])
	}
	if enabled, ok := view["users_import_enabled"].(bool); !ok || enabled {
		t.Fatalf("expected users_import_enabled=false by default, got %v", view["users_import_enabled"])
	}
}

func TestWithNavIncludesUsersImportFlagsWhenConfigured(t *testing.T) {
	cfg := admin.Config{DefaultLocale: "en"}
	adm, err := admin.New(cfg, admin.Dependencies{
		BulkUserImport: &command.BulkUserImportCommand{},
	})
	if err != nil {
		t.Fatalf("admin.New: %v", err)
	}
	view := WithNav(nil, adm, cfg, "", context.Background())
	if available, ok := view["users_import_available"].(bool); !ok || !available {
		t.Fatalf("expected users_import_available=true when command is configured, got %v", view["users_import_available"])
	}
	if enabled, ok := view["users_import_enabled"].(bool); !ok || !enabled {
		t.Fatalf("expected users_import_enabled=true when command is configured, got %v", view["users_import_enabled"])
	}
}

func TestResolveNavTargetUsesURLKitRoute(t *testing.T) {
	manager, err := urlkit.NewRouteManagerFromConfig(&urlkit.Config{
		Groups: []urlkit.GroupConfig{
			{
				Name:    "admin",
				BaseURL: "/console",
				Routes: map[string]string{
					"dashboard": "/",
					"settings":  "/settings",
				},
			},
		},
	})
	if err != nil {
		t.Fatalf("urlkit config: %v", err)
	}

	href, key, _ := resolveNavTarget(map[string]any{
		"name": "admin.settings",
	}, "/admin", manager, navRequestScope{})

	if href != "/console/settings" {
		t.Fatalf("expected urlkit path, got %q", href)
	}
	if key != "settings" {
		t.Fatalf("expected key settings, got %q", key)
	}
}

func TestResolveNavTargetPrefersLocalizedURLOverrideAndAppliesRequestScope(t *testing.T) {
	href, key, _ := resolveNavTarget(map[string]any{
		"url":  "/sobre-nosotros",
		"path": "/about",
		"key":  "about",
	}, "/admin", nil, navRequestScope{
		Locale:  "es",
		Channel: "preview",
	})

	parsed, err := url.Parse(href)
	if err != nil {
		t.Fatalf("parse href: %v", err)
	}
	if parsed.Path != "/sobre-nosotros" {
		t.Fatalf("expected localized url override path /sobre-nosotros, got %q", parsed.Path)
	}
	if got := strings.TrimSpace(parsed.Query().Get("locale")); got != "es" {
		t.Fatalf("expected locale query es, got %q", got)
	}
	if got := strings.TrimSpace(parsed.Query().Get(admin.ContentChannelScopeQueryParam)); got != "preview" {
		t.Fatalf("expected %s query preview, got %q", admin.ContentChannelScopeQueryParam, got)
	}
	if key != "about" {
		t.Fatalf("expected key about, got %q", key)
	}
}

func TestDefaultPlacementsIncludeSidebarUtilityMenu(t *testing.T) {
	cfg := admin.Config{NavMenuCode: "admin.main"}
	placements := DefaultPlacements(cfg)
	code := placements.MenuCodeFor(SidebarPlacementUtility, "")
	if code == "" {
		t.Fatalf("expected non-empty sidebar utility menu code")
	}
	if code != admin.NormalizeMenuSlug(DefaultSidebarUtilityMenuCode) {
		t.Fatalf("expected sidebar utility menu code %q, got %q", admin.NormalizeMenuSlug(DefaultSidebarUtilityMenuCode), code)
	}
	if area := placements.DashboardAreaFor(DashboardPlacementSidebar, ""); area != "admin.dashboard.sidebar" {
		t.Fatalf("expected dashboard sidebar placement area admin.dashboard.sidebar, got %q", area)
	}
	if area := placements.DashboardAreaFor(DashboardPlacementMain, ""); area != "admin.dashboard.main" {
		t.Fatalf("expected dashboard main area admin.dashboard.main, got %q", area)
	}
	if area := placements.DashboardAreaFor(DashboardPlacementFooter, ""); area != "admin.dashboard.footer" {
		t.Fatalf("expected dashboard footer area admin.dashboard.footer, got %q", area)
	}
}

func TestBuildNavItemsPrunesEmptyGroupNodes(t *testing.T) {
	cfg := NewAdminConfig("/admin", "Admin", "en")
	adm, _, err := NewAdmin(cfg, AdapterHooks{})
	if err != nil {
		t.Fatalf("NewAdmin: %v", err)
	}
	if err := SeedNavigation(context.Background(), SeedNavigationOptions{
		MenuSvc:  adm.MenuService(),
		MenuCode: cfg.NavMenuCode,
		Locale:   cfg.DefaultLocale,
		Items:    DefaultMenuParents(cfg.NavMenuCode),
	}); err != nil {
		t.Fatalf("SeedNavigation: %v", err)
	}

	items := BuildNavItems(adm, cfg, context.Background(), "")
	if hasNavItemByGroupTitle(items, "Tools") {
		t.Fatalf("expected empty Tools group to be pruned")
	}
	if hasNavItemByGroupTitle(items, "Translations") {
		t.Fatalf("expected empty Translations group to be pruned")
	}
}

func TestWithNavLoadsUtilityItemsFromUtilityPlacement(t *testing.T) {
	cfg := NewAdminConfig("/admin", "Admin", "en")
	adm, _, err := NewAdmin(cfg, AdapterHooks{})
	if err != nil {
		t.Fatalf("NewAdmin: %v", err)
	}
	utilityMenuCode := DefaultPlacements(cfg).MenuCodeFor(SidebarPlacementUtility, "")
	if err := SeedNavigation(context.Background(), SeedNavigationOptions{
		MenuSvc:  adm.MenuService(),
		MenuCode: utilityMenuCode,
		Locale:   cfg.DefaultLocale,
		Items: []admin.MenuItem{
			{
				ID:       "utility.custom-help",
				Type:     admin.MenuItemTypeItem,
				Label:    "Help",
				LabelKey: "menu.help",
				Target: map[string]any{
					"type": "url",
					"path": "/admin/help",
					"key":  "help",
				},
			},
		},
	}); err != nil {
		t.Fatalf("SeedNavigation utility: %v", err)
	}

	view := WithNav(nil, adm, cfg, "", context.Background())
	utilityItems, ok := view["nav_utility_items"].([]map[string]any)
	if !ok {
		t.Fatalf("expected nav_utility_items slice, got %T", view["nav_utility_items"])
	}
	if len(utilityItems) == 0 {
		t.Fatalf("expected utility nav items")
	}
	if utilityItems[0]["label"] != "Help" {
		t.Fatalf("expected utility nav label Help, got %v", utilityItems[0]["label"])
	}
}

func TestBuildNavItemsForPlacementUsesRequestLocaleAndScope(t *testing.T) {
	cfg := admin.Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		NavMenuCode:   "admin.main",
	}
	adm, err := admin.New(cfg, admin.Dependencies{})
	if err != nil {
		t.Fatalf("admin.New: %v", err)
	}
	adm.Navigation().UseCMS(false)
	adm.Navigation().AddFallback(
		admin.NavigationItem{
			ID:     "content.en",
			Type:   admin.MenuItemTypeItem,
			Label:  "Content",
			Locale: "en",
			Target: map[string]any{"path": "/content"},
		},
		admin.NavigationItem{
			ID:     "content.es",
			Type:   admin.MenuItemTypeItem,
			Label:  "Contenido",
			Locale: "es",
			Target: map[string]any{"path": "/contenido"},
		},
	)

	reqCtx := admin.WithContentChannel(admin.WithLocale(context.Background(), "es"), "preview")
	items := BuildNavItemsForPlacement(adm, cfg, DefaultPlacements(cfg), SidebarPlacementPrimary, reqCtx, "")

	var selected map[string]any
	for _, item := range items {
		if strings.EqualFold(strings.TrimSpace(toNavString(item["label"])), "Contenido") {
			selected = item
			break
		}
	}
	if selected == nil {
		t.Fatalf("expected to resolve locale-specific navigation item Contenido, got %+v", items)
	}

	href := strings.TrimSpace(toNavString(selected["href"]))
	parsed, err := url.Parse(href)
	if err != nil {
		t.Fatalf("parse href: %v", err)
	}
	if parsed.Path != "/admin/contenido" {
		t.Fatalf("expected localized href path /admin/contenido, got %q", parsed.Path)
	}
	if got := strings.TrimSpace(parsed.Query().Get("locale")); got != "es" {
		t.Fatalf("expected locale query es, got %q", got)
	}
	if got := strings.TrimSpace(parsed.Query().Get(admin.ContentChannelScopeQueryParam)); got != "preview" {
		t.Fatalf("expected %s query preview, got %q", admin.ContentChannelScopeQueryParam, got)
	}
}

func hasNavItemByGroupTitle(items []map[string]any, title string) bool {
	title = strings.TrimSpace(title)
	if title == "" {
		return false
	}
	for _, item := range items {
		if strings.EqualFold(strings.TrimSpace(toNavString(item["group_title"])), title) {
			return true
		}
		children, _ := item["children"].([]map[string]any)
		if hasNavItemByGroupTitle(children, title) {
			return true
		}
	}
	return false
}
