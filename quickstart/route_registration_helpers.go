package quickstart

import (
	"github.com/goliatone/go-admin/admin"
	templateview "github.com/goliatone/go-admin/internal/templateview"
	csrfmw "github.com/goliatone/go-auth/middleware/csrf"
	fggate "github.com/goliatone/go-featuregate/gate"
	router "github.com/goliatone/go-router"
	urlkit "github.com/goliatone/go-urlkit"
)

func normalizeQuickstartRouteBasePath(basePath string) string {
	return normalizeBasePathValue(basePath)
}

func resolveQuickstartUIViewContextBuilder(adm *admin.Admin, cfg admin.Config, builder UIViewContextBuilder) UIViewContextBuilder {
	if builder != nil {
		return builder
	}
	return defaultUIViewContextBuilder(adm, cfg)
}

func resolveQuickstartAuthUIViewContextBuilder(builder AuthUIViewContextBuilder) AuthUIViewContextBuilder {
	if builder != nil {
		return builder
	}
	return func(ctx router.ViewContext, _ router.Context) router.ViewContext { return ctx }
}

func resolveQuickstartRegistrationUIViewContextBuilder(builder RegistrationUIViewContextBuilder) RegistrationUIViewContextBuilder {
	if builder != nil {
		return builder
	}
	return func(ctx router.ViewContext, _ router.Context) router.ViewContext { return ctx }
}

func wrapQuickstartRouteAuth(auth admin.HandlerAuthenticator) func(router.HandlerFunc) router.HandlerFunc {
	return func(handler router.HandlerFunc) router.HandlerFunc {
		if auth != nil {
			return auth.WrapHandler(handler)
		}
		return handler
	}
}

func resolveQuickstartAdminAPIBase(adm *admin.Admin, cfg admin.Config, fallbackBase string) string {
	var urls urlkit.Resolver
	if adm != nil {
		urls = adm.URLs()
	}
	return resolveAdminAPIBasePath(urls, cfg, fallbackBase)
}

func renderQuickstartUIView(c router.Context, template, title, active, basePath string, builder UIViewContextBuilder, extra router.ViewContext) error {
	viewCtx := router.ViewContext{
		"title":     title,
		"base_path": basePath,
	}
	viewCtx = mergeViewContext(viewCtx, extra)
	if builder != nil {
		viewCtx = builder(viewCtx, active, c)
	}
	return templateview.RenderTemplateView(c, template, viewCtx)
}

func buildQuickstartAuthTemplateViewContext(
	cfg admin.Config,
	c router.Context,
	state AuthUIState,
	paths AuthUIPaths,
	title string,
	assets map[string]string,
	assetPrefix string,
	scope fggate.ScopeChain,
	snapshot any,
) router.ViewContext {
	viewCtx := AuthUIViewContext(cfg, state, paths)
	if c != nil {
		if helpers, ok := c.Locals(csrfmw.DefaultTemplateHelpersKey).(map[string]any); ok && helpers != nil {
			viewCtx[csrfmw.DefaultTemplateHelpersKey] = helpers
			for key, value := range helpers {
				if _, exists := viewCtx[key]; !exists {
					viewCtx[key] = value
				}
			}
		}
	}
	viewCtx["title"] = title
	viewCtx = WithAuthUIViewThemeAssets(viewCtx, assets, assetPrefix)
	return WithFeatureTemplateContext(viewCtx, c.Context(), scope, snapshot)
}
