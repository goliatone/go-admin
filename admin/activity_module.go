package admin

import (
	"strings"

	"github.com/goliatone/go-admin/admin/routing"
	urlkit "github.com/goliatone/go-urlkit"
)

const activityModuleID = "activity"
const activityRouteKey = "activity.index"

// ActivityModule registers the activity log navigation and user detail tab.
type ActivityModule struct {
	basePath      string
	menuCode      string
	defaultLocale string
	permission    string
	menuParent    string
	uiGroupPath   string
	urls          urlkit.Resolver
}

// NewActivityModule constructs the default activity module.
func NewActivityModule() *ActivityModule {
	return &ActivityModule{}
}

// Manifest describes the module metadata.
func (m *ActivityModule) Manifest() ModuleManifest {
	return ModuleManifest{
		ID:             activityModuleID,
		NameKey:        "modules.activity.name",
		DescriptionKey: "modules.activity.description",
	}
}

// Register wires the activity module metadata and user tab integration.
func (m *ActivityModule) Register(ctx ModuleContext) error {
	if ctx.Admin == nil {
		return serviceNotConfiguredDomainError("admin", map[string]any{"component": "activity_module"})
	}
	return configureSingleRouteModule(ctx, activityRouteKey, ctx.Admin.config.ActivityPermission, &m.basePath, &m.menuCode, &m.defaultLocale, &m.permission, &m.uiGroupPath, &m.urls)
}

func (m *ActivityModule) RouteContract() routing.ModuleContract {
	return routing.ModuleContract{
		Slug: activityModuleID,
		UIRoutes: map[string]string{
			activityRouteKey: "/",
		},
	}
}

// MenuItems contributes navigation for the activity module.
func (m *ActivityModule) MenuItems(locale string) []MenuItem {
	if locale == "" {
		locale = m.defaultLocale
	}
	group := strings.TrimSpace(m.uiGroupPath)
	if group == "" {
		group = routing.DefaultUIGroupPath()
	}
	path := resolveURLWith(m.urls, group, activityRouteKey, nil, nil)
	permissions := []string{}
	if m.permission != "" {
		permissions = []string{m.permission}
	}
	return []MenuItem{
		{
			Label:       "Activity",
			LabelKey:    "menu.activity",
			Icon:        "clock",
			Target:      map[string]any{"type": "url", "path": path, "key": activityModuleID},
			Permissions: permissions,
			Menu:        m.menuCode,
			Locale:      locale,
			Position:    new(45),
			ParentID:    m.menuParent,
		},
	}
}

// WithMenuParent nests the activity navigation under a parent menu item ID.
func (m *ActivityModule) WithMenuParent(parent string) *ActivityModule {
	m.menuParent = parent
	return m
}

func configureSingleRouteModule(
	ctx ModuleContext,
	routeKey string,
	defaultPermission string,
	basePath *string,
	menuCode *string,
	defaultLocale *string,
	permission *string,
	uiGroupPath *string,
	urls *urlkit.Resolver,
) error {
	if *basePath == "" {
		*basePath = ctx.Admin.config.BasePath
	}
	if *menuCode == "" {
		*menuCode = ctx.Admin.navMenuCode
	}
	if *defaultLocale == "" {
		*defaultLocale = ctx.Admin.config.DefaultLocale
	}
	if *permission == "" {
		*permission = defaultPermission
	}
	if *urls == nil {
		*urls = ctx.Admin.URLs()
	}
	if path := strings.TrimSpace(ctx.Routing.Resolved.UIGroupPath); path != "" {
		*uiGroupPath = path
	}
	if path := ctx.Routing.RoutePath(routing.SurfaceUI, routeKey); path != "" {
		*basePath = path
	}
	return nil
}
