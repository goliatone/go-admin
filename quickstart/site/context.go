package site

import (
	"context"
	"strings"

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
