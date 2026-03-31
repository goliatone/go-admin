package site

import "github.com/goliatone/go-admin/admin"

type searchRuntime struct {
	siteCfg   ResolvedSiteConfig
	provider  admin.SearchProvider
	modules   []SiteModule
	baseRoute string
}

func newSearchRuntime(siteCfg ResolvedSiteConfig, provider admin.SearchProvider, modules []SiteModule) *searchRuntime {
	if provider == nil {
		return nil
	}
	return &searchRuntime{
		siteCfg:   siteCfg,
		provider:  provider,
		modules:   compactModules(modules),
		baseRoute: prefixedRoutePath(siteCfg.BasePath, siteCfg.Search.Route),
	}
}
