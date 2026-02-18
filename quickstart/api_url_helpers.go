package quickstart

import (
	"path"
	"strings"

	"github.com/goliatone/go-admin/admin"
	urlkit "github.com/goliatone/go-urlkit"
)

func resolveAdminAPIBasePath(urls urlkit.Resolver, cfg admin.Config, fallbackBase string) string {
	group := adminAPIGroupName(cfg)
	if path := resolveRoutePath(urls, group, "errors"); path != "" {
		if strings.HasSuffix(path, "/errors") {
			return strings.TrimSuffix(path, "/errors")
		}
	}

	basePath := resolveAdminBasePath(urls, fallbackBase)
	apiPrefix := effectiveAdminAPIPrefix(cfg)
	apiVersion := effectiveAdminAPIVersion(cfg)

	apiBase := prefixBasePath(basePath, apiPrefix)
	if apiVersion != "" {
		apiBase = prefixBasePath(apiBase, apiVersion)
	}
	return apiBase
}

func adminAPIGroupName(cfg admin.Config) string {
	version := effectiveAdminAPIVersion(cfg)
	if strings.TrimSpace(version) == "" {
		return "admin.api"
	}
	return "admin.api." + strings.Trim(version, "/")
}

func adminAPIBasePathFromConfig(basePath string, cfg admin.Config) string {
	apiPrefix := effectiveAdminAPIPrefix(cfg)
	apiVersion := effectiveAdminAPIVersion(cfg)

	basePath = strings.TrimSpace(basePath)
	if basePath == "" {
		basePath = "/"
	}
	if apiVersion != "" {
		return path.Join(basePath, apiPrefix, apiVersion)
	}
	return path.Join(basePath, apiPrefix)
}

func effectiveAdminAPIPrefix(cfg admin.Config) string {
	if value := strings.TrimSpace(cfg.URLs.Admin.APIPrefix); value != "" {
		return strings.Trim(value, "/")
	}
	return "api"
}

func effectiveAdminAPIVersion(cfg admin.Config) string {
	if value := strings.TrimSpace(cfg.URLs.Admin.APIVersion); value != "" {
		return strings.Trim(value, "/")
	}
	return ""
}

func resolveAdminPanelAPICollectionPath(urls urlkit.Resolver, cfg admin.Config, fallbackBase, panel string) string {
	panel = canonicalPanelName(panel)
	if panel == "" {
		return ""
	}
	group := adminAPIGroupName(cfg)
	if resolved := strings.TrimSpace(resolveRouteURL(urls, group, "panel", map[string]string{"panel": panel}, nil)); resolved != "" {
		return resolved
	}
	apiBasePath := resolveAdminAPIBasePath(urls, cfg, fallbackBase)
	return prefixBasePath(apiBasePath, path.Join("panels", panel))
}

func resolveAdminPanelAPIDetailPath(urls urlkit.Resolver, cfg admin.Config, fallbackBase, panel, id string) string {
	panel = canonicalPanelName(panel)
	id = strings.TrimSpace(id)
	if panel == "" || id == "" {
		return ""
	}
	group := adminAPIGroupName(cfg)
	if resolved := strings.TrimSpace(resolveRouteURL(urls, group, "panel.id", map[string]string{"panel": panel, "id": id}, nil)); resolved != "" {
		return resolved
	}
	collection := resolveAdminPanelAPICollectionPath(urls, cfg, fallbackBase, panel)
	if collection == "" {
		return ""
	}
	return prefixBasePath(collection, id)
}

func resolveAdminPreferencesAPICollectionPath(urls urlkit.Resolver, cfg admin.Config, fallbackBase string) string {
	return resolveAdminPanelAPICollectionPath(urls, cfg, fallbackBase, "preferences")
}
