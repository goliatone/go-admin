package site

import (
	"context"
	"strings"
	"time"

	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
)

type contextKey string

const (
	requestStateContextKey contextKey = "quickstart.site.request_state"
	viewContextLocalsKey              = "quickstart.site.view_context"
	requestStateLocalsKey             = "quickstart.site.request_state"
)

// RequestState is the normalized per-request site runtime state.
type RequestState struct {
	Locale              string   `json:"locale"`
	DefaultLocale       string   `json:"default_locale"`
	SupportedLocales    []string `json:"supported_locales"`
	Environment         string   `json:"environment"`
	ContentChannel      string   `json:"content_channel"`
	AllowLocaleFallback bool     `json:"allow_locale_fallback"`

	PreviewTokenPresent bool   `json:"preview_token_present"`
	PreviewTokenValid   bool   `json:"preview_token_valid"`
	IsPreview           bool   `json:"is_preview"`
	PreviewToken        string `json:"preview_token"`
	PreviewEntityType   string `json:"preview_entity_type"`
	PreviewContentID    string `json:"preview_content_id"`

	ThemeName    string                       `json:"theme_name"`
	ThemeVariant string                       `json:"theme_variant"`
	Theme        map[string]map[string]string `json:"theme"`

	BasePath      string `json:"base_path"`
	AssetBasePath string `json:"asset_base_path"`
	ActivePath    string `json:"active_path"`

	ViewContext router.ViewContext `json:"view_context"`
}

// RequestStateFromContext reads request state from context.
func RequestStateFromContext(ctx context.Context) (RequestState, bool) {
	if ctx == nil {
		return RequestState{}, false
	}
	state, ok := ctx.Value(requestStateContextKey).(RequestState)
	if !ok {
		return RequestState{}, false
	}
	return state, true
}

// RequestStateFromRequest reads request state from request locals/context.
func RequestStateFromRequest(c router.Context) (RequestState, bool) {
	if c == nil {
		return RequestState{}, false
	}
	if raw := c.Locals(requestStateLocalsKey); raw != nil {
		if typed, ok := raw.(RequestState); ok {
			return typed, true
		}
	}
	return RequestStateFromContext(c.Context())
}

// RequestContext returns the request context when available and falls back to a
// background context for detached helpers and tests.
func RequestContext(c router.Context) context.Context {
	if c == nil {
		return context.Background()
	}
	requestCtx := c.Context()
	if requestCtx == nil {
		return context.Background()
	}
	return requestCtx
}

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
	for key, value := range ViewContextFromRequest(c) {
		in[key] = value
	}
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

// ResolveRequestState computes the normalized request context + view context.
func ResolveRequestState(
	requestCtx context.Context,
	c router.Context,
	adm *admin.Admin,
	_ admin.Config,
	siteCfg ResolvedSiteConfig,
	modules []SiteModule,
) (context.Context, RequestState) {
	if requestCtx == nil {
		requestCtx = context.Background()
	}

	environment := resolveRequestEnvironment(c, siteCfg.Environment)
	contentChannel := resolveRequestContentChannel(c, siteCfg.ContentChannel)
	locale := resolveRequestLocale(c, siteCfg.Features.EnableI18N, siteCfg.DefaultLocale, siteCfg.SupportedLocales)
	preview := resolveRequestPreview(c, adm, siteCfg.Features.EnablePreview)
	if preview.Channel != "" {
		contentChannel = normalizeContentChannel(preview.Channel)
	}

	requestCtx = admin.WithContentChannel(requestCtx, contentChannel)
	requestCtx = admin.WithLocale(requestCtx, locale)
	requestCtx = admin.WithLocaleFallback(requestCtx, siteCfg.AllowLocaleFallback)

	requestCtx, themePayload, themeName, themeVariant := resolveRequestTheme(c, adm, requestCtx, siteCfg, environment)

	assetBasePath := strings.TrimSpace(siteCfg.Views.AssetBasePath)
	if assetBasePath == "" {
		assetBasePath = siteCfg.BasePath
	}

	activePath := "/"
	if c != nil {
		if path := strings.TrimSpace(c.Path()); path != "" {
			activePath = path
		}
	}

	state := RequestState{
		Locale:              locale,
		DefaultLocale:       siteCfg.DefaultLocale,
		SupportedLocales:    cloneStrings(siteCfg.SupportedLocales),
		Environment:         environment,
		ContentChannel:      contentChannel,
		AllowLocaleFallback: siteCfg.AllowLocaleFallback,
		PreviewTokenPresent: preview.Present,
		PreviewTokenValid:   preview.Valid,
		IsPreview:           preview.Valid,
		PreviewToken:        preview.Token,
		PreviewEntityType:   preview.EntityType,
		PreviewContentID:    preview.ContentID,
		ThemeName:           themeName,
		ThemeVariant:        themeVariant,
		Theme:               themePayload,
		BasePath:            siteCfg.BasePath,
		AssetBasePath:       assetBasePath,
		ActivePath:          activePath,
	}

	viewCtx := router.ViewContext{
		"base_path":             state.BasePath,
		"asset_base_path":       state.AssetBasePath,
		"active_path":           state.ActivePath,
		"locale":                state.Locale,
		"default_locale":        state.DefaultLocale,
		"supported_locales":     cloneStrings(state.SupportedLocales),
		"preview_token_present": state.PreviewTokenPresent,
		"preview_token_valid":   state.PreviewTokenValid,
		"is_preview":            state.IsPreview,
		"allow_locale_fallback": state.AllowLocaleFallback,
		"environment":           state.Environment,
		"content_channel":       state.ContentChannel,
		"preview_banner": map[string]any{
			"enabled":       state.PreviewTokenPresent,
			"is_preview":    state.IsPreview,
			"token_present": state.PreviewTokenPresent,
			"token_valid":   state.PreviewTokenValid,
		},
	}
	viewCtx = applyLocaleSwitcherViewContext(
		viewCtx,
		siteCfg,
		state.ActivePath,
		state.Locale,
		state.Locale,
		"",
		state.SupportedLocales,
		nil,
		state,
	)
	if state.Theme != nil {
		viewCtx["theme"] = cloneThemePayload(state.Theme)
	}
	if state.ThemeName != "" {
		viewCtx["theme_name"] = state.ThemeName
	}
	if state.ThemeVariant != "" {
		viewCtx["theme_variant"] = state.ThemeVariant
	}

	for _, module := range modules {
		if module == nil {
			continue
		}
		next := module.ViewContext(requestCtx, viewCtx)
		if next != nil {
			viewCtx = next
		}
	}

	state.ViewContext = cloneViewContext(viewCtx)
	requestCtx = context.WithValue(requestCtx, requestStateContextKey, state)
	return requestCtx, state
}

type previewResolution struct {
	Present    bool   `json:"present"`
	Valid      bool   `json:"valid"`
	Token      string `json:"token"`
	EntityType string `json:"entity_type"`
	ContentID  string `json:"content_id"`
	Channel    string `json:"channel"`
}

func resolveRequestPreview(c router.Context, adm *admin.Admin, enabled bool) previewResolution {
	if c == nil || !enabled {
		return previewResolution{}
	}
	token := strings.TrimSpace(c.Query("preview_token"))
	if token == "" {
		return previewResolution{}
	}
	out := previewResolution{Present: true, Token: token}
	if adm == nil || adm.Preview() == nil {
		return out
	}
	validated, err := adm.Preview().Validate(token)
	if err != nil || validated == nil {
		return out
	}
	entityType, entityChannel := splitPreviewEntityType(validated.EntityType)
	contentID := strings.TrimSpace(validated.ContentID)
	if entityType == "" || contentID == "" {
		return out
	}
	out.Valid = true
	out.EntityType = entityType
	out.ContentID = contentID
	entityChannel = strings.TrimSpace(entityChannel)
	if entityChannel != "" {
		out.Channel = normalizeContentChannel(entityChannel)
	}
	return out
}

func splitPreviewEntityType(raw string) (string, string) {
	raw = strings.TrimSpace(strings.ToLower(raw))
	if raw == "" {
		return "", ""
	}
	idx := strings.LastIndex(raw, "@")
	if idx <= 0 || idx+1 >= len(raw) {
		return raw, ""
	}
	entityType := strings.TrimSpace(raw[:idx])
	channel := strings.TrimSpace(raw[idx+1:])
	return entityType, channel
}

func cloneViewContext(input router.ViewContext) router.ViewContext {
	if input == nil {
		return router.ViewContext{}
	}
	out := make(router.ViewContext, len(input))
	for key, value := range input {
		out[key] = value
	}
	return out
}
