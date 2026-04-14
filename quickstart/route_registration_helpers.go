package quickstart

import (
	"regexp"
	"strings"

	"github.com/goliatone/go-admin/admin"
	templateview "github.com/goliatone/go-admin/internal/templateview"
	csrfmw "github.com/goliatone/go-auth/middleware/csrf"
	fggate "github.com/goliatone/go-featuregate/gate"
	router "github.com/goliatone/go-router"
	urlkit "github.com/goliatone/go-urlkit"
)

var firstFormTagPattern = regexp.MustCompile(`(?i)<form\b[^>]*>`)

func normalizeQuickstartRouteBasePath(basePath string) string {
	return admin.NormalizeBasePath(basePath)
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
	adm *admin.Admin,
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
	viewCtx = mergeQuickstartCSRFViewContext(c, viewCtx)
	viewCtx["title"] = title
	if adm != nil {
		viewCtx = WithThemeContext(viewCtx, adm, c)
		viewCtx = withAuthUIViewThemeAssets(viewCtx, assets, assetPrefix, false)
	} else {
		viewCtx = WithAuthUIViewThemeAssets(viewCtx, assets, assetPrefix)
	}
	return WithFeatureTemplateContext(viewCtx, c.Context(), scope, snapshot)
}

func mergeQuickstartCSRFViewContext(c router.Context, viewCtx router.ViewContext) router.ViewContext {
	if viewCtx == nil {
		viewCtx = router.ViewContext{}
	}
	if c == nil {
		return viewCtx
	}
	helpers, ok := c.Locals(csrfmw.DefaultTemplateHelpersKey).(map[string]any)
	if !ok || helpers == nil {
		return viewCtx
	}
	viewCtx[csrfmw.DefaultTemplateHelpersKey] = helpers
	for key, value := range helpers {
		if _, exists := viewCtx[key]; !exists {
			viewCtx[key] = value
		}
	}
	return viewCtx
}

func injectQuickstartCSRFField(c router.Context, raw string) string {
	if c == nil {
		return raw
	}
	if strings.TrimSpace(raw) == "" || strings.Contains(raw, `name="`+csrfmw.DefaultFormFieldName+`"`) {
		return raw
	}
	field, ok := c.Locals(csrfmw.DefaultTemplateHelpersKey).(map[string]any)
	if !ok || field == nil {
		return raw
	}
	csrfField := strings.TrimSpace(anyToString(field["csrf_field"]))
	if csrfField == "" {
		return raw
	}
	return firstFormTagPattern.ReplaceAllString(raw, "${0}\n"+csrfField)
}
