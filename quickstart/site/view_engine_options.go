package site

import (
	"github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/quickstart"
)

// ViewEngineOptions converts site runtime view settings into quickstart view-engine options.
// The base host filesystem must still be provided directly to quickstart.NewViewEngine.
func ViewEngineOptions(cfg admin.Config, siteCfg SiteConfig) []quickstart.ViewEngineOption {
	return ViewEngineOptionsResolved(ResolveSiteConfig(cfg, siteCfg))
}

// ViewEngineOptionsResolved converts a resolved site config into quickstart view-engine options.
func ViewEngineOptionsResolved(siteCfg ResolvedSiteConfig) []quickstart.ViewEngineOption {
	runtime := ResolveViewRuntime(siteCfg.Views, siteCfg.Environment)
	out := make([]quickstart.ViewEngineOption, 0, 2)
	if len(runtime.TemplateFS) > 0 {
		out = append(out, quickstart.WithViewTemplatesFS(runtime.TemplateFS...))
	}
	out = append(out, quickstart.WithViewReload(runtime.Reload))
	return out
}
