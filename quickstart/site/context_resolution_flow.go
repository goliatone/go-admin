package site

import (
	"context"
	"strings"

	router "github.com/goliatone/go-router"
)

type requestStateFlowInputs struct {
	Environment    string
	ContentChannel string
	Locale         string
	Preview        previewResolution
	ThemePayload   map[string]map[string]string
	ThemeName      string
	ThemeVariant   string
}

func resolveRequestStateFlow(
	requestCtx context.Context,
	c router.Context,
	siteCfg ResolvedSiteConfig,
	modules []SiteModule,
	inputs requestStateFlowInputs,
) (context.Context, RequestState) {
	if requestCtx == nil {
		requestCtx = context.Background()
	}

	state := buildResolvedRequestState(siteCfg, c, inputs)
	viewCtx := buildResolvedRequestViewContext(siteCfg, state)
	viewCtx = applyRequestStateModuleViewContext(requestCtx, viewCtx, modules)

	state.ViewContext = cloneViewContext(viewCtx)
	requestCtx = context.WithValue(requestCtx, requestStateContextKey, state)
	return requestCtx, state
}

func buildResolvedRequestState(siteCfg ResolvedSiteConfig, c router.Context, inputs requestStateFlowInputs) RequestState {
	assetBasePath := strings.TrimSpace(siteCfg.Views.AssetBasePath)
	if assetBasePath == "" {
		assetBasePath = siteCfg.BasePath
	}
	siteTheme := buildSiteThemeContract(inputs.ThemePayload, assetBasePath)

	return RequestState{
		Locale:              inputs.Locale,
		DefaultLocale:       siteCfg.DefaultLocale,
		SupportedLocales:    cloneStrings(siteCfg.SupportedLocales),
		Environment:         inputs.Environment,
		ContentChannel:      inputs.ContentChannel,
		AllowLocaleFallback: siteCfg.AllowLocaleFallback,
		PreviewTokenPresent: inputs.Preview.Present,
		PreviewTokenValid:   inputs.Preview.Valid,
		IsPreview:           inputs.Preview.Valid,
		PreviewToken:        inputs.Preview.Token,
		PreviewEntityType:   inputs.Preview.EntityType,
		PreviewContentID:    inputs.Preview.ContentID,
		ThemeName:           inputs.ThemeName,
		ThemeVariant:        inputs.ThemeVariant,
		Theme:               inputs.ThemePayload,
		SiteTheme:           siteTheme,
		BasePath:            siteCfg.BasePath,
		AssetBasePath:       assetBasePath,
		ActivePath:          resolveRequestActivePath(c),
	}
}

func resolveRequestActivePath(c router.Context) string {
	if c != nil {
		if path := strings.TrimSpace(c.Path()); path != "" {
			return path
		}
	}
	return "/"
}

func buildResolvedRequestViewContext(siteCfg ResolvedSiteConfig, state RequestState) router.ViewContext {
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
	if state.SiteTheme != nil {
		viewCtx["site_theme"] = cloneSiteThemeContract(state.SiteTheme)
	}

	return viewCtx
}

func applyRequestStateModuleViewContext(requestCtx context.Context, viewCtx router.ViewContext, modules []SiteModule) router.ViewContext {
	for _, module := range modules {
		if module == nil {
			continue
		}
		next := module.ViewContext(requestCtx, viewCtx)
		if next != nil {
			viewCtx = next
		}
	}
	return viewCtx
}
