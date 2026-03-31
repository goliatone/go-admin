package site

import (
	"context"

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
	return resolveRequestStateFlow(requestCtx, c, siteCfg, modules, requestStateFlowInputs{
		Environment:    environment,
		ContentChannel: contentChannel,
		Locale:         locale,
		Preview:        preview,
		ThemePayload:   themePayload,
		ThemeName:      themeName,
		ThemeVariant:   themeVariant,
	})
}
