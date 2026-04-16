package admin

import (
	"maps"

	"github.com/goliatone/go-admin/admin/routing"
	"github.com/goliatone/go-admin/internal/primitives"
	translationgoadmin "github.com/goliatone/go-admin/translations/adapters/goadmin"
	"strings"

	urlkit "github.com/goliatone/go-urlkit"
)

const defaultAPIPrefix = "api"
const defaultPublicAPIVersion = "v1"

func normalizeURLConfig(cfg URLConfig, basePath string) URLConfig {
	cfg.Admin = normalizeURLNamespace(cfg.Admin, URLNamespaceConfig{
		BasePath:   basePath,
		APIPrefix:  defaultAPIPrefix,
		APIVersion: "",
	})
	cfg.Public = normalizeURLNamespace(cfg.Public, URLNamespaceConfig{
		BasePath:   "",
		APIPrefix:  defaultAPIPrefix,
		APIVersion: defaultPublicAPIVersion,
	})

	return cfg
}

func normalizeURLNamespace(cfg URLNamespaceConfig, defaults URLNamespaceConfig) URLNamespaceConfig {
	if strings.TrimSpace(cfg.BasePath) == "" {
		cfg.BasePath = defaults.BasePath
	}
	cfg.BasePath = normalizeBasePath(cfg.BasePath)

	cfg.APIPrefix = normalizeAPIPrefix(cfg.APIPrefix, defaults.APIPrefix)
	cfg.APIVersion = normalizeAPIVersion(cfg.APIVersion)
	if cfg.APIVersion == "" {
		cfg.APIVersion = defaults.APIVersion
	}

	cfg.URLTemplate = strings.TrimSpace(cfg.URLTemplate)

	return cfg
}

func normalizeAPIPrefix(prefix, fallback string) string {
	trimmed := strings.TrimSpace(prefix)
	trimmed = strings.Trim(trimmed, "/")
	if trimmed == "" {
		return fallback
	}
	return trimmed
}

func normalizeAPIVersion(version string) string {
	trimmed := strings.TrimSpace(version)
	return strings.Trim(trimmed, "/")
}

func newURLManager(cfg Config, requireMediaRoutes ...bool) (*urlkit.RouteManager, error) {
	includeMediaRoutes := len(requireMediaRoutes) > 0 && requireMediaRoutes[0]
	if cfg.URLs.URLKit != nil {
		manager, err := urlkit.NewRouteManagerFromConfig(cfg.URLs.URLKit)
		if err != nil {
			return nil, validationDomainError("url manager config error", map[string]any{
				"component": "url_manager",
				"error":     err.Error(),
			})
		}
		if err := mergeDefaultURLKitRoutes(manager, cfg); err != nil {
			return nil, validationDomainError("url manager merge error", map[string]any{
				"component": "url_manager",
				"error":     err.Error(),
			})
		}
		if err := validateURLKitRoutes(cfg, manager, includeMediaRoutes); err != nil {
			return nil, validationDomainError("url manager validation error", map[string]any{
				"component": "url_manager",
				"error":     err.Error(),
			})
		}
		return manager, nil
	}

	manager, err := urlkit.NewRouteManagerFromConfig(defaultURLKitConfig(cfg))
	if err != nil {
		return nil, validationDomainError("url manager default config error", map[string]any{
			"component": "url_manager",
			"error":     err.Error(),
		})
	}
	if err := validateURLKitRoutes(cfg, manager, includeMediaRoutes); err != nil {
		return nil, validationDomainError("url manager validation error", map[string]any{
			"component": "url_manager",
			"error":     err.Error(),
		})
	}
	return manager, nil
}

func defaultURLKitConfig(cfg Config) *urlkit.Config {
	roots := effectiveRoutingRoots(cfg)
	adminRoutes := rootedRoutes(roots.AdminRoot, defaultAdminRoutes())
	adminAPIRoutes := rootedRoutes(roots.APIRoot, defaultAdminAPIRoutes())
	publicAPIRoutes := rootedRoutes(roots.PublicAPIRoot, defaultPublicAPIRoutes())

	adminGroup := urlkit.GroupConfig{
		Name:    routing.DefaultUIGroupPath(),
		BaseURL: "",
		Routes:  adminRoutes,
		Groups: []urlkit.GroupConfig{
			rootedGroupConfig(routing.AdminAPIGroupPath(roots), adminAPIRoutes, routing.DefaultUIGroupPath()),
		},
	}
	applyNamespaceTemplate(cfg.URLs.Admin, &adminGroup)

	publicGroup := urlkit.GroupConfig{
		Name:    "public",
		BaseURL: "",
		Groups:  []urlkit.GroupConfig{rootedGroupConfig(publicAPIGroupName(cfg), publicAPIRoutes, "public")},
	}
	applyNamespaceTemplate(cfg.URLs.Public, &publicGroup)

	return &urlkit.Config{
		Groups: []urlkit.GroupConfig{
			adminGroup,
			publicGroup,
		},
	}
}

func applyNamespaceTemplate(cfg URLNamespaceConfig, group *urlkit.GroupConfig) {
	if group == nil {
		return
	}
	if strings.TrimSpace(cfg.URLTemplate) != "" {
		group.URLTemplate = strings.TrimSpace(cfg.URLTemplate)
	}
	if len(cfg.TemplateVars) > 0 {
		group.TemplateVars = primitives.CloneStringMapNilOnEmpty(cfg.TemplateVars)
	}
}

func adminAPIGroupName(cfg Config) string {
	return routing.AdminAPIGroupPath(effectiveRoutingRoots(cfg))
}

func publicAPIGroupName(cfg Config) string {
	return routing.PublicAPIGroupPath(effectiveRoutingRoots(cfg))
}

func requiredURLKitRoutes(cfg Config, includeMediaRoutes bool) map[string][]string {
	adminAPIGroup := adminAPIGroupName(cfg)
	publicAPIGroup := publicAPIGroupName(cfg)

	required := map[string][]string{
		"admin":       {"dashboard"},
		adminAPIGroup: {"errors", "preview"},
		publicAPIGroup: {
			"content",
			"content.type",
			"content.item",
			"menu",
			"preview",
			"site.content.type",
			"site.content.item",
			"site.navigation",
			"site.menus.location",
			"site.menus.code",
		},
	}
	if includeMediaRoutes {
		required[adminAPIGroup] = append(required[adminAPIGroup],
			"media.library",
			"media.item",
			"media.resolve",
			"media.upload",
			"media.presign",
			"media.confirm",
			"media.capabilities",
		)
	}
	return required
}

func validateURLKitRoutes(cfg Config, manager *urlkit.RouteManager, includeMediaRoutes bool) error {
	if manager == nil {
		return serviceNotConfiguredDomainError("url manager", map[string]any{
			"component": "url_manager",
		})
	}
	return manager.Validate(requiredURLKitRoutes(cfg, includeMediaRoutes))
}

func mergeDefaultURLKitRoutes(manager *urlkit.RouteManager, cfg Config) error {
	if manager == nil {
		return nil
	}
	for _, group := range defaultURLKitConfig(cfg).GetGroups() {
		if err := mergeURLKitGroupConfig(manager, "", group); err != nil {
			return err
		}
	}
	return nil
}

func mergeURLKitGroupConfig(manager *urlkit.RouteManager, parentPath string, cfg urlkit.GroupConfig) error {
	if manager == nil {
		return nil
	}
	name := strings.TrimSpace(cfg.Name)
	if name == "" {
		return nil
	}

	groupPath := name
	if parentPath != "" {
		groupPath = parentPath + "." + name
	}

	group, err := ensureURLKitGroup(manager, parentPath, cfg)
	if err != nil {
		return err
	}
	if group != nil {
		if template := strings.TrimSpace(cfg.URLTemplate); template != "" {
			if setErr := group.SetURLTemplate(template); setErr != nil {
				return setErr
			}
		}
		for key, value := range cfg.TemplateVars {
			if setErr := group.SetTemplateVar(key, value); setErr != nil {
				return setErr
			}
		}
		routes := missingURLKitRoutes(group, cfg)
		if len(routes) > 0 {
			if _, _, addErr := manager.AddRoutes(groupPath, routes); addErr != nil {
				return addErr
			}
		}
	}

	for _, child := range cfg.Groups {
		if err := mergeURLKitGroupConfig(manager, groupPath, child); err != nil {
			return err
		}
	}
	return nil
}

func ensureURLKitGroup(manager *urlkit.RouteManager, parentPath string, cfg urlkit.GroupConfig) (*urlkit.Group, error) {
	if manager == nil {
		return nil, nil
	}
	name := strings.TrimSpace(cfg.Name)
	if name == "" {
		return nil, nil
	}
	if parentPath == "" {
		if group, err := manager.GetGroup(name); err == nil {
			return group, nil
		}
		group, _, err := manager.RegisterGroup(name, cfg.BaseURL, nil)
		return group, err
	}

	segment := name
	if path := strings.TrimSpace(cfg.Path); path != "" {
		segment = name + ":" + path
	}
	groupPath := parentPath + "." + segment
	return manager.EnsureGroup(groupPath)
}

func missingURLKitRoutes(group *urlkit.Group, cfg urlkit.GroupConfig) map[string]string {
	if group == nil {
		return nil
	}
	routes := cfg.Routes
	if len(routes) == 0 {
		routes = cfg.Paths
	}
	if len(routes) == 0 {
		return nil
	}
	out := make(map[string]string, len(routes))
	for routeKey, routePath := range routes {
		if _, err := group.Route(routeKey); err == nil {
			continue
		}
		out[routeKey] = routePath
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func effectiveRoutingRoots(cfg Config) routing.RootsConfig {
	return cfg.Routing.Roots
}

func rootedRoutes(root string, routes map[string]string) map[string]string {
	if len(routes) == 0 {
		return nil
	}
	out := make(map[string]string, len(routes))
	for routeKey, routePath := range routes {
		trimmed := strings.TrimSpace(routePath)
		if trimmed == "/" {
			root = normalizeBasePath(root)
			if root == "" {
				out[routeKey] = "/"
				continue
			}
			out[routeKey] = root + "/"
			continue
		}
		out[routeKey] = joinBasePath(root, trimmed)
	}
	return out
}

func rootedGroupConfig(groupPath string, routes map[string]string, rootName string) urlkit.GroupConfig {
	parts := strings.Split(strings.TrimSpace(groupPath), ".")
	if len(parts) == 0 {
		return urlkit.GroupConfig{}
	}
	if rootName != "" && parts[0] == rootName {
		parts = parts[1:]
	}
	if len(parts) == 0 {
		return urlkit.GroupConfig{
			Name:   rootName,
			Path:   "",
			Routes: routes,
		}
	}

	group := urlkit.GroupConfig{
		Name: parts[len(parts)-1],
		Path: "",
	}
	if len(parts) == 1 {
		group.Routes = routes
		return group
	}

	group.Routes = routes
	for i := len(parts) - 2; i >= 0; i-- {
		group = urlkit.GroupConfig{
			Name:   parts[i],
			Path:   "",
			Groups: []urlkit.GroupConfig{group},
		}
	}
	return group
}

func defaultAdminRoutes() map[string]string {
	routes := map[string]string{
		"dashboard":             "/",
		"dashboard.page":        "/dashboard",
		"health":                "/health",
		"settings":              "/settings",
		"preferences":           "/preferences",
		"profile":               "/profile",
		"users":                 "/users",
		"users.id":              "/users/:id",
		"user_profiles":         "/user-profiles",
		"user_profiles.id":      "/user-profiles/:id",
		"roles":                 "/roles",
		"tenants":               "/tenants",
		"tenants.id":            "/tenants/:id",
		"organizations":         "/organizations",
		"organizations.id":      "/organizations/:id",
		"activity":              "/activity",
		"feature_flags":         "/feature-flags",
		"exports":               "/exports",
		"content":               "/content",
		"content.types":         "/content/types",
		"content.block_library": "/content/block-library",
		"content.panel":         "/content/:panel",
		"content.panel.id":      "/content/:panel/:id",
		"content.panel.preview": "/content/:panel/:id/preview",
		"block_conflicts":       "/block_conflicts",
	}
	maps.Copy(routes, translationgoadmin.AdminUIRoutes())
	return routes
}

func defaultAdminAPIRoutes() map[string]string {
	routes := map[string]string{
		"activity":                            "/activity",
		"bulk":                                "/bulk",
		"bulk.rollback":                       "/bulk/:id/rollback",
		"dashboard":                           "/dashboard",
		"dashboard.preferences":               "/dashboard/preferences",
		"dashboard.config":                    "/dashboard/config",
		"dashboard.debug":                     "/dashboard/debug",
		"dashboard.widgets":                   "/dashboard/widgets",
		"dashboard.widget":                    "/dashboard/widgets/:id",
		"dashboard.widgets.reorder":           "/dashboard/widgets/reorder",
		"dashboard.widgets.refresh":           "/dashboard/widgets/refresh",
		"errors":                              "/errors",
		"preview":                             "/preview/:token",
		"feature_flags":                       "/feature-flags",
		"jobs":                                "/jobs",
		"jobs.trigger":                        "/jobs/trigger",
		"media.library":                       "/media/library",
		"media.item":                          "/media/library/:id",
		"media.resolve":                       "/media/resolve",
		"media.upload":                        "/media/upload",
		"media.presign":                       "/media/presign",
		"media.confirm":                       "/media/confirm",
		"media.capabilities":                  "/media/capabilities",
		"menu.bindings":                       "/menu-bindings",
		"menu.bindings.location":              "/menu-bindings/:location",
		"menu.view_profiles":                  "/menu-view-profiles",
		"menu.view_profiles.code":             "/menu-view-profiles/:code",
		"menu.view_profiles.publish":          "/menu-view-profiles/:code/publish",
		"menus":                               "/menus",
		"menus.contracts":                     "/menu-contracts",
		"menus.id":                            "/menus/:id",
		"menus.publish":                       "/menus/:id/publish",
		"menus.unpublish":                     "/menus/:id/unpublish",
		"menus.items":                         "/menus/:id/items",
		"menus.preview":                       "/menus/:id/preview",
		"menus.clone":                         "/menus/:id/clone",
		"menus.archive":                       "/menus/:id/archive",
		"navigation":                          "/navigation",
		"notifications":                       "/notifications",
		"notifications.read":                  "/notifications/read",
		"schemas":                             "/schemas",
		"schemas.resource":                    "/schemas/:resource",
		"search":                              "/search",
		"search.typeahead":                    "/search/typeahead",
		"settings":                            "/settings",
		"settings.form":                       "/settings/form",
		"workflows":                           "/workflows",
		"workflows.id":                        "/workflows/:id",
		"workflows.bindings":                  "/workflows/bindings",
		"workflows.bindings.id":               "/workflows/bindings/:id",
		"users.import":                        "/users-import",
		"users.import.template":               "/users-import/template",
		"translations.dashboard":              "/translations/dashboard",
		"translations.options.entity_types":   "/translations/options/entity-types",
		"translations.options.source_records": "/translations/options/source-records",
		"translations.options.locales":        "/translations/options/locales",
		"translations.options.families":       "/translations/options/families",
		"translations.options.assignees":      "/translations/options/assignees",
		"users.bulk.assign_role":              "/users/bulk/assign-role",
		"users.bulk.unassign_role":            "/users/bulk/unassign-role",
		"panel":                               "/panels/:panel",
		"panel.id":                            "/panels/:panel/:id",
		"panel.action":                        "/panels/:panel/actions/:action",
		"panel.bulk.state":                    "/panels/:panel/bulk-actions/state",
		"panel.bulk":                          "/panels/:panel/bulk/:action",
		"panel.preview":                       "/panels/:panel/:id/preview",
		"panel.subresource":                   "/panels/:panel/:id/:subresource/:value",
		"content_types.validate":              "/content_types/validate",
		"content_types.preview":               "/content_types/preview",
		"block_definitions_meta.categories":   "/block_definitions_meta/categories",
		"block_definitions_meta.diagnostics":  "/block_definitions_meta/diagnostics",
		"block_definitions_meta.field_types":  "/block_definitions_meta/field_types",
		"block_definitions_meta.templates":    "/block_definitions_meta/templates",
		"block_definitions_meta.template":     "/block_definitions_meta/templates/:slug",
		"cms.content_tree":                    "/content-tree",
		"cms.content.blocks":                  "/content/:id/blocks",
		"content.navigation":                  "/content/:type/:id/navigation",
		"icons.libraries":                     "/icons/libraries",
		"icons.library":                       "/icons/libraries/:id",
		"icons.library.icons":                 "/icons/libraries/:id/icons",
		"icons.search":                        "/icons/search",
		"icons.resolve":                       "/icons/resolve",
		"icons.render":                        "/icons/render",
	}
	maps.Copy(routes, translationgoadmin.AdminAPIRoutes())
	return routes
}

func defaultPublicAPIRoutes() map[string]string {
	return map[string]string{
		"content":             "/content",
		"content.type":        "/content/:type",
		"content.item":        "/content/:type/:slug",
		"menu":                "/menus/:location",
		"preview":             "/preview/:token",
		"site.content":        "/site/content",
		"site.content.type":   "/site/content/:type",
		"site.content.item":   "/site/content/:type/:slug",
		"site.navigation":     "/site/navigation/:location",
		"site.menus.location": "/site/menus/:location",
		"site.menus.code":     "/site/menus/code/:code",
	}
}
