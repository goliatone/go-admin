package admin

import (
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

func normalizeBasePath(basePath string) string {
	trimmed := strings.TrimSpace(basePath)
	if trimmed == "" {
		return ""
	}
	return "/" + strings.Trim(trimmed, "/")
}

func newURLManager(cfg Config) (*urlkit.RouteManager, error) {
	if cfg.URLs.URLKit != nil {
		manager, err := urlkit.NewRouteManagerFromConfig(cfg.URLs.URLKit)
		if err != nil {
			return nil, validationDomainError("url manager config error", map[string]any{
				"component": "url_manager",
				"error":     err.Error(),
			})
		}
		if err := validateURLKitRoutes(cfg, manager); err != nil {
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
	if err := validateURLKitRoutes(cfg, manager); err != nil {
		return nil, validationDomainError("url manager validation error", map[string]any{
			"component": "url_manager",
			"error":     err.Error(),
		})
	}
	return manager, nil
}

func defaultURLKitConfig(cfg Config) *urlkit.Config {
	adminRoutes := defaultAdminRoutes()
	adminAPIRoutes := defaultAdminAPIRoutes()
	debugRoutes := defaultAdminDebugRoutes()
	debugAPIRoutes := defaultAdminDebugAPIRoutes()
	publicAPIRoutes := defaultPublicAPIRoutes()

	apiGroup := urlkit.GroupConfig{
		Name: "api",
		Path: "/" + cfg.URLs.Admin.APIPrefix,
	}

	if cfg.URLs.Admin.APIVersion != "" {
		apiGroup.Groups = []urlkit.GroupConfig{
			{
				Name:   cfg.URLs.Admin.APIVersion,
				Path:   "/" + cfg.URLs.Admin.APIVersion,
				Routes: adminAPIRoutes,
			},
		}
	} else {
		apiGroup.Routes = adminAPIRoutes
	}

	debugAPIGroup := urlkit.GroupConfig{
		Name:   "api",
		Path:   "/api",
		Routes: debugAPIRoutes,
	}
	debugGroup := urlkit.GroupConfig{
		Name:   "debug",
		Path:   "/debug",
		Routes: debugRoutes,
		Groups: []urlkit.GroupConfig{debugAPIGroup},
	}

	adminGroup := urlkit.GroupConfig{
		Name:    "admin",
		BaseURL: cfg.URLs.Admin.BasePath,
		Routes:  adminRoutes,
		Groups:  []urlkit.GroupConfig{apiGroup, debugGroup},
	}
	applyNamespaceTemplate(cfg.URLs.Admin, &adminGroup)

	publicAPIGroup := urlkit.GroupConfig{
		Name: "api",
		Path: "/" + cfg.URLs.Public.APIPrefix,
	}
	if cfg.URLs.Public.APIVersion != "" {
		publicAPIGroup.Groups = []urlkit.GroupConfig{
			{
				Name:   cfg.URLs.Public.APIVersion,
				Path:   "/" + cfg.URLs.Public.APIVersion,
				Routes: publicAPIRoutes,
			},
		}
	} else {
		publicAPIGroup.Routes = publicAPIRoutes
	}

	publicGroup := urlkit.GroupConfig{
		Name:    "public",
		BaseURL: cfg.URLs.Public.BasePath,
		Groups:  []urlkit.GroupConfig{publicAPIGroup},
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
		group.TemplateVars = cloneStringMap(cfg.TemplateVars)
	}
}

func adminAPIGroupName(cfg Config) string {
	version := strings.TrimSpace(cfg.URLs.Admin.APIVersion)
	if version == "" {
		return "admin.api"
	}
	return "admin.api." + version
}

func publicAPIGroupName(cfg Config) string {
	version := strings.TrimSpace(cfg.URLs.Public.APIVersion)
	if version == "" {
		return "public.api"
	}
	return "public.api." + version
}

func requiredURLKitRoutes(cfg Config) map[string][]string {
	adminAPIGroup := adminAPIGroupName(cfg)
	publicAPIGroup := publicAPIGroupName(cfg)

	return map[string][]string{
		"admin":       {"dashboard"},
		adminAPIGroup: {"errors", "preview"},
		publicAPIGroup: {
			"pages",
			"page",
			"preview",
		},
	}
}

func validateURLKitRoutes(cfg Config, manager *urlkit.RouteManager) error {
	if manager == nil {
		return serviceNotConfiguredDomainError("url manager", map[string]any{
			"component": "url_manager",
		})
	}
	return manager.Validate(requiredURLKitRoutes(cfg))
}

func defaultAdminRoutes() map[string]string {
	return map[string]string{
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
		"translations.queue":    "/content/translations",
		"translations.exchange": "/translations/exchange",
		"content.alias.pages":   "/pages",
		"content.alias.posts":   "/posts",
		"block_conflicts":       "/block_conflicts",
	}
}

func defaultAdminAPIRoutes() map[string]string {
	return map[string]string{
		"activity":                           "/activity",
		"bulk":                               "/bulk",
		"bulk.rollback":                      "/bulk/:id/rollback",
		"dashboard":                          "/dashboard",
		"dashboard.preferences":              "/dashboard/preferences",
		"dashboard.config":                   "/dashboard/config",
		"dashboard.debug":                    "/dashboard/debug",
		"dashboard.widgets":                  "/dashboard/widgets",
		"dashboard.widget":                   "/dashboard/widgets/:id",
		"dashboard.widgets.reorder":          "/dashboard/widgets/reorder",
		"dashboard.widgets.refresh":          "/dashboard/widgets/refresh",
		"errors":                             "/errors",
		"preview":                            "/preview/:token",
		"feature_flags":                      "/feature-flags",
		"jobs":                               "/jobs",
		"jobs.trigger":                       "/jobs/trigger",
		"media.library":                      "/media/library",
		"navigation":                         "/navigation",
		"notifications":                      "/notifications",
		"notifications.read":                 "/notifications/read",
		"schemas":                            "/schemas",
		"schemas.resource":                   "/schemas/:resource",
		"search":                             "/search",
		"search.typeahead":                   "/search/typeahead",
		"settings":                           "/settings",
		"settings.form":                      "/settings/form",
		"users.import":                       "/users-import",
		"users.import.template":              "/users-import/template",
		"translations.export":                "/translations/export",
		"translations.template":              "/translations/template",
		"translations.import.validate":       "/translations/import/validate",
		"translations.import.apply":          "/translations/import/apply",
		"users.bulk.assign_role":             "/users/bulk/assign-role",
		"users.bulk.unassign_role":           "/users/bulk/unassign-role",
		"panel":                              "/:panel",
		"panel.id":                           "/:panel/:id",
		"panel.action":                       "/:panel/actions/:action",
		"panel.bulk":                         "/:panel/bulk/:action",
		"panel.preview":                      "/:panel/:id/preview",
		"panel.subresource":                  "/:panel/:id/:subresource/:value",
		"content_types.validate":             "/content_types/validate",
		"content_types.preview":              "/content_types/preview",
		"block_definitions_meta.categories":  "/block_definitions_meta/categories",
		"block_definitions_meta.field_types": "/block_definitions_meta/field_types",
		"block_definitions_meta.templates":   "/block_definitions_meta/templates",
		"block_definitions_meta.template":    "/block_definitions_meta/templates/:slug",
		"cms.pages_tree":                     "/pages-tree",
		"cms.content.blocks":                 "/content/:id/blocks",
		"icons.libraries":                    "/icons/libraries",
		"icons.library":                      "/icons/libraries/:id",
		"icons.library.icons":                "/icons/libraries/:id/icons",
		"icons.search":                       "/icons/search",
		"icons.resolve":                      "/icons/resolve",
		"icons.render":                       "/icons/render",
	}
}

func defaultAdminDebugRoutes() map[string]string {
	return map[string]string{
		"index":      "/",
		"ws":         "/ws",
		"session.ws": "/session/:sessionId/ws",
		"repl.app":   "/repl/app/ws",
		"repl.shell": "/repl/shell/ws",
	}
}

func defaultAdminDebugAPIRoutes() map[string]string {
	return map[string]string{
		"panels":                    "/panels",
		"snapshot":                  "/snapshot",
		"sessions":                  "/sessions",
		"clear":                     "/clear",
		"clear.panel":               "/clear/:panel",
		"errors":                    "/errors",
		"dashboard":                 "/dashboard",
		"dashboard.widgets":         "/dashboard/widgets",
		"dashboard.widget":          "/dashboard/widgets/:id",
		"dashboard.widgets.reorder": "/dashboard/widgets/reorder",
		"dashboard.widgets.refresh": "/dashboard/widgets/refresh",
		"dashboard.preferences":     "/dashboard/preferences",
		"dashboard.ws":              "/dashboard/ws",
	}
}

func defaultPublicAPIRoutes() map[string]string {
	return map[string]string{
		"pages":        "/pages",
		"page":         "/pages/:slug",
		"content":      "/content",
		"content.type": "/content/:type",
		"content.item": "/content/:type/:slug",
		"menu":         "/menus/:location",
		"preview":      "/preview/:token",
	}
}
