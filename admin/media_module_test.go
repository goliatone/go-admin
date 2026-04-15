package admin

import (
	"context"
	"strings"
	"testing"

	router "github.com/goliatone/go-router"
	"github.com/stretchr/testify/mock"
)

func TestMediaModuleRouteContractUsesModuleOwnedPages(t *testing.T) {
	contract := NewMediaModule().RouteContract()
	if contract.Slug != mediaModuleID {
		t.Fatalf("expected slug %q, got %q", mediaModuleID, contract.Slug)
	}
	if got := contract.UIRoutes[mediaIndexRouteKey]; got != "/" {
		t.Fatalf("expected gallery route '/', got %q", got)
	}
	if got := contract.UIRoutes[mediaListRouteKey]; got != "/list" {
		t.Fatalf("expected list route '/list', got %q", got)
	}
}

func TestMediaModuleMenuItemsResolvePlannerPathAndPlacement(t *testing.T) {
	cfg := Config{BasePath: "/admin", DefaultLocale: "en"}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromKeys(FeatureMedia, FeatureCMS)})
	mod := NewMediaModule().WithMenuParent("nav.content").WithMenuPosition(52)

	if err := adm.RegisterModule(mod); err != nil {
		t.Fatalf("register media module: %v", err)
	}
	if err := adm.loadModules(context.Background()); err != nil {
		t.Fatalf("load modules: %v", err)
	}

	items := mod.MenuItems("en")
	if len(items) != 1 {
		t.Fatalf("expected one menu item, got %d", len(items))
	}
	item := items[0]
	if item.ParentID != "nav.content" {
		t.Fatalf("expected parent nav.content, got %q", item.ParentID)
	}
	if item.Position == nil || *item.Position != 52 {
		t.Fatalf("expected position 52, got %v", item.Position)
	}
	targetPath := toString(item.Target["path"])
	if targetPath != "/admin/media" {
		t.Fatalf("expected resolved path /admin/media, got %q", targetPath)
	}
}

func TestDefaultModulesRegisterMediaModuleWhenFeatureEnabled(t *testing.T) {
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureMedia, FeatureCMS),
	})
	if err := adm.registerDefaultModules(); err != nil {
		t.Fatalf("register default modules: %v", err)
	}
	if _, ok := adm.registry.Module(mediaModuleID); !ok {
		t.Fatalf("expected built-in media module to be registered")
	}
}

func TestMediaModuleRenderPageIncludesLayoutContextAndContractPaths(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		NavMenuCode:   "admin.main",
	}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromKeys(FeatureMedia, FeatureCMS)})
	adm.WithAuthorizer(allowAll{})
	adm.Navigation().UseCMS(false)
	adm.Navigation().AddFallback(NavigationItem{
		ID:    "admin.main.dashboard",
		Label: "Dashboard",
		Target: map[string]any{
			"path": "/admin",
			"key":  "dashboard",
		},
	})
	mod := NewMediaModule()
	mod.urls = adm.URLs()
	mod.uiGroupPath = "admin"

	mockCtx := router.NewMockContext()
	mockCtx.On("Context").Return(context.Background())
	mockCtx.On("IP").Return("").Maybe()
	mockCtx.On("Path").Return("/admin/media")
	mockCtx.On("Query", "locale").Return("").Maybe()
	mockCtx.HeadersM["X-User-ID"] = "user-1"
	mockCtx.On("Render", "resources/media/gallery", mock.MatchedBy(func(arg any) bool {
		viewCtx, ok := arg.(router.ViewContext)
		if !ok {
			return false
		}
		if viewCtx["active"] != mediaModuleID {
			return false
		}
		if viewCtx["asset_base_path"] != "/admin" {
			return false
		}
		if toString(viewCtx["media_gallery_path"]) != "/admin/media" {
			return false
		}
		if toString(viewCtx["media_list_path"]) != "/admin/media/list" {
			return false
		}
		if !strings.Contains(toString(viewCtx["media_capabilities_path"]), "/admin/api/media/capabilities") {
			return false
		}
		navItems, ok := viewCtx["nav_items"].([]map[string]any)
		return ok && len(navItems) > 0
	})).Return(nil)

	if err := mod.renderPage(adm, mockCtx, "grid"); err != nil {
		t.Fatalf("render media page: %v", err)
	}
	mockCtx.AssertExpectations(t)
}
