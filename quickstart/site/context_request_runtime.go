package site

import (
	"maps"
	"strings"
	"time"

	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
)

// fallbackRequestState returns middleware-owned request state when present and
// otherwise builds a minimal runtime-safe state from resolved site config.
func fallbackRequestState(c router.Context, cfg ResolvedSiteConfig, fallbackActivePath string) RequestState {
	if state, ok := RequestStateFromRequest(c); ok {
		return state
	}

	assetBasePath := strings.TrimSpace(cfg.Views.AssetBasePath)
	if assetBasePath == "" {
		assetBasePath = cfg.BasePath
	}

	activePath := strings.TrimSpace(fallbackActivePath)
	if c != nil {
		if path := strings.TrimSpace(c.Path()); path != "" {
			activePath = path
		}
	}
	if activePath == "" {
		activePath = "/"
	}

	return RequestState{
		Locale:              cfg.DefaultLocale,
		DefaultLocale:       cfg.DefaultLocale,
		SupportedLocales:    cloneStrings(cfg.SupportedLocales),
		Environment:         cfg.Environment,
		ContentChannel:      cfg.ContentChannel,
		AllowLocaleFallback: cfg.AllowLocaleFallback,
		BasePath:            cfg.BasePath,
		AssetBasePath:       assetBasePath,
		ActivePath:          activePath,
		ViewContext:         router.ViewContext{},
	}
}

// ViewContextFromRequest returns site view context prepared by site middleware.
func ViewContextFromRequest(c router.Context) router.ViewContext {
	if c == nil {
		return router.ViewContext{}
	}
	if raw := c.Locals(viewContextLocalsKey); raw != nil {
		if typed, ok := raw.(router.ViewContext); ok && typed != nil {
			return cloneViewContext(typed)
		}
	}
	if state, ok := RequestStateFromContext(c.Context()); ok {
		return cloneViewContext(state.ViewContext)
	}
	return router.ViewContext{}
}

// MergeViewContext overlays request-level site context onto an existing view context.
func MergeViewContext(in router.ViewContext, c router.Context) router.ViewContext {
	if in == nil {
		in = router.ViewContext{}
	}
	maps.Copy(in, ViewContextFromRequest(c))
	return in
}

func requestContextMiddleware(adm *admin.Admin, cfg admin.Config, siteCfg ResolvedSiteConfig, modules []SiteModule) router.MiddlewareFunc {
	return func(next router.HandlerFunc) router.HandlerFunc {
		return func(c router.Context) error {
			if c == nil {
				return next(c)
			}
			requestCtx, state := ResolveRequestState(c.Context(), c, adm, cfg, siteCfg, modules)
			c.SetContext(requestCtx)
			c.Locals(requestStateLocalsKey, state)
			c.Locals(viewContextLocalsKey, cloneViewContext(state.ViewContext))
			persistLocaleCookie(c, siteCfg, state)
			return next(c)
		}
	}
}

func persistLocaleCookie(c router.Context, siteCfg ResolvedSiteConfig, state RequestState) {
	if c == nil || !siteCfg.Features.EnableI18N {
		return
	}
	locale := matchSupportedLocale(state.Locale, siteCfg.SupportedLocales)
	if locale == "" {
		return
	}
	current := matchSupportedLocale(c.Cookies(defaultLocaleCookieName), siteCfg.SupportedLocales)
	if current == locale {
		return
	}
	path := normalizeLocalePath(siteCfg.BasePath)
	if path == "" {
		path = "/"
	}
	cookie := router.FirstPartySessionCookie(defaultLocaleCookieName, locale)
	cookie.Path = path
	cookie.MaxAge = int((365 * 24 * time.Hour).Seconds())
	cookie.Expires = time.Now().Add(365 * 24 * time.Hour)
	cookie.SessionOnly = false
	cookie.HTTPOnly = false
	c.Cookie(&cookie)
}

func cloneViewContext(input router.ViewContext) router.ViewContext {
	if input == nil {
		return router.ViewContext{}
	}
	out := make(router.ViewContext, len(input))
	maps.Copy(out, input)
	return out
}
