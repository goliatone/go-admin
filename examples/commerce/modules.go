package main

import (
	"fmt"
	"path"

	"github.com/goliatone/go-admin/admin/routing"
	"github.com/goliatone/go-admin/examples/commerce/stores"
	"github.com/goliatone/go-admin/pkg/admin"
	"github.com/goliatone/go-admin/quickstart"
	router "github.com/goliatone/go-router"
)

type commerceModule struct {
	stores        *stores.CommerceStores
	basePath      string
	menuCode      string
	defaultLocale string
	placements    quickstart.PlacementConfig
}

func (m *commerceModule) Manifest() admin.ModuleManifest {
	return admin.ModuleManifest{
		ID:             "commerce",
		NameKey:        "modules.commerce.name",
		DescriptionKey: "modules.commerce.description",
		FeatureFlags:   []string{string(admin.FeatureDashboard), string(admin.FeatureSearch), string(admin.FeatureCommands)},
	}
}

func (m *commerceModule) Register(ctx admin.ModuleContext) error {
	if ctx.Admin == nil {
		return fmt.Errorf("admin is nil")
	}
	if m.stores == nil {
		return fmt.Errorf("commerce stores not provided")
	}

	if _, err := ctx.Admin.RegisterPanel("users", newUserPanel(m.stores)); err != nil {
		return err
	}
	if _, err := ctx.Admin.RegisterPanel("products", newProductPanel(m.stores)); err != nil {
		return err
	}
	if _, err := ctx.Admin.RegisterPanel("orders", newOrderPanel(m.stores)); err != nil {
		return err
	}

	if err := registerCommands(ctx.Admin, m.stores); err != nil {
		return err
	}
	registerDashboard(ctx.Admin, m.stores, m.dashboardPlacements())
	registerSearch(ctx.Admin, m.stores, path.Join(m.basePath, "api"))

	if routePath := ctx.Routing.RoutePath(routing.SurfaceUI, "commerce.index"); routePath != "" {
		ctx.Router.Get(routePath, func(c router.Context) error {
			return c.Redirect(path.Join(m.basePath, "products"))
		})
	}
	return nil
}

func (m *commerceModule) RouteContract() routing.ModuleContract {
	return routing.ModuleContract{
		Slug: "commerce",
		UIRoutes: map[string]string{
			"commerce.index": "/",
		},
	}
}

func (m *commerceModule) MenuItems(locale string) []admin.MenuItem {
	code := m.menuCode
	if code == "" {
		code = "admin.main"
	}
	if locale == "" {
		locale = m.defaultLocale
	}
	items := []admin.MenuItem{
		{
			Label:    "Dashboard",
			LabelKey: "menu.dashboard",
			Icon:     "dashboard",
			Target:   map[string]any{"type": "url", "path": m.basePath, "key": "dashboard"},
			Locale:   locale,
			Menu:     code,
			Position: new(5),
		},
		{
			Label:    "Users",
			LabelKey: "menu.users",
			Icon:     "users",
			Target:   map[string]any{"type": "url", "path": path.Join(m.basePath, "users"), "key": "users"},
			Locale:   locale,
			Menu:     code,
			Position: new(10),
		},
		{
			Label:    "Products",
			LabelKey: "menu.products",
			Icon:     "box",
			Target:   map[string]any{"type": "url", "path": path.Join(m.basePath, "products"), "key": "products"},
			Locale:   locale,
			Menu:     code,
			Position: new(20),
		},
		{
			Label:    "Orders",
			LabelKey: "menu.orders",
			Icon:     "cart",
			Target:   map[string]any{"type": "url", "path": path.Join(m.basePath, "orders"), "key": "orders"},
			Locale:   locale,
			Menu:     code,
			Position: new(30),
		},
	}
	return items
}

func (m *commerceModule) dashboardPlacements() quickstart.PlacementConfig {
	if m == nil {
		return quickstart.PlacementConfig{}
	}
	if len(m.placements.Menus) > 0 || len(m.placements.Dashboards) > 0 {
		return m.placements
	}
	return quickstart.DefaultPlacements(admin.Config{
		NavMenuCode: m.menuCode,
	})
}
