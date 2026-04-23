package quickstart

import (
	"maps"
	"strings"

	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
	urlkit "github.com/goliatone/go-urlkit"
)

// PathViewContextConfig describes how base/api/asset paths should be injected into a view context.
type PathViewContextConfig struct {
	BasePath      string          `json:"base_path"`
	APIBasePath   string          `json:"api_base_path"`
	AssetBasePath string          `json:"asset_base_path"`
	URLResolver   urlkit.Resolver `json:"url_resolver"`
}

// PathViewContext returns canonical template path keys:
// - base_path
// - api_base_path
// - asset_base_path
// - preferences_api_path
func PathViewContext(cfg admin.Config, pathCfg PathViewContextConfig) router.ViewContext {
	basePath := resolveAdminBasePath(pathCfg.URLResolver, firstNonEmpty(pathCfg.BasePath, cfg.BasePath))
	basePath = admin.NormalizeBasePath(basePath)

	apiBasePath := strings.TrimSpace(pathCfg.APIBasePath)
	if apiBasePath == "" {
		apiBasePath = resolveAdminAPIBasePath(pathCfg.URLResolver, cfg, basePath)
	}

	assetBasePath := normalizeAssetBasePath(pathCfg.AssetBasePath)
	if assetBasePath == "" {
		assetBasePath = basePath
	}
	preferencesAPIPath := resolveAdminPreferencesAPICollectionPath(pathCfg.URLResolver, cfg, basePath)

	return router.ViewContext{
		"base_path":            basePath,
		"api_base_path":        strings.TrimSpace(apiBasePath),
		"asset_base_path":      assetBasePath,
		"preferences_api_path": strings.TrimSpace(preferencesAPIPath),
	}
}

// WithPathViewContext merges canonical template path keys into an existing context.
func WithPathViewContext(ctx router.ViewContext, cfg admin.Config, pathCfg PathViewContextConfig) router.ViewContext {
	if ctx == nil {
		ctx = router.ViewContext{}
	}
	maps.Copy(ctx, PathViewContext(cfg, pathCfg))
	return ctx
}

func normalizeAssetBasePath(basePath string) string {
	trimmed := strings.TrimSpace(basePath)
	if trimmed == "" {
		return ""
	}
	if isAbsoluteURL(trimmed) {
		return strings.TrimSuffix(trimmed, "/")
	}
	return admin.NormalizeBasePath(trimmed)
}
