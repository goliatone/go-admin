package site

import (
	"context"
	"sort"
	"strconv"
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
	Locale              string
	DefaultLocale       string
	SupportedLocales    []string
	Environment         string
	ContentEnvironment  string
	AllowLocaleFallback bool

	PreviewTokenPresent bool
	PreviewTokenValid   bool
	IsPreview           bool
	PreviewToken        string
	PreviewEntityType   string
	PreviewContentID    string

	ThemeName    string
	ThemeVariant string
	Theme        map[string]map[string]string

	BasePath      string
	AssetBasePath string
	ActivePath    string

	ViewContext router.ViewContext
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
			return next(c)
		}
	}
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
	contentEnvironment := resolveRequestContentEnvironment(c, siteCfg.ContentEnvironment)
	locale := resolveRequestLocale(c, siteCfg.Features.EnableI18N, siteCfg.DefaultLocale, siteCfg.SupportedLocales)
	preview := resolveRequestPreview(c, adm, siteCfg.Features.EnablePreview)
	if preview.Environment != "" {
		if previewRuntimeEnvironment := normalizeRuntimeEnvironment(preview.Environment); previewRuntimeEnvironment != "" {
			environment = previewRuntimeEnvironment
		}
		contentEnvironment = normalizeContentEnvironment(preview.Environment)
	}

	requestCtx = admin.WithEnvironment(requestCtx, contentEnvironment)
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
		ContentEnvironment:  contentEnvironment,
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
		"content_environment":   state.ContentEnvironment,
		"preview_banner": map[string]any{
			"enabled":       state.PreviewTokenPresent,
			"is_preview":    state.IsPreview,
			"token_present": state.PreviewTokenPresent,
			"token_valid":   state.PreviewTokenValid,
		},
	}
	switcherQuery := map[string]string{}
	if token := strings.TrimSpace(state.PreviewToken); token != "" {
		switcherQuery["preview_token"] = token
	}
	viewCtx["locale_switcher"] = BuildLocaleSwitcherContract(
		siteCfg,
		state.ActivePath,
		state.Locale,
		state.Locale,
		"",
		state.SupportedLocales,
		nil,
		switcherQuery,
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
	Present     bool
	Valid       bool
	Token       string
	EntityType  string
	ContentID   string
	Environment string
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
	entityType, entityEnv := splitPreviewEntityType(validated.EntityType)
	contentID := strings.TrimSpace(validated.ContentID)
	if entityType == "" || contentID == "" {
		return out
	}
	out.Valid = true
	out.EntityType = entityType
	out.ContentID = contentID
	out.Environment = normalizeContentEnvironment(entityEnv)
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
	environment := strings.TrimSpace(raw[idx+1:])
	return entityType, environment
}

func resolveRequestEnvironment(c router.Context, fallback string) string {
	if c == nil {
		return normalizeRuntimeEnvironment(fallback)
	}
	candidates := []string{
		c.Query("env"),
		c.Query("environment"),
		c.Header("X-Site-Environment"),
		c.Header("X-Admin-Environment"),
		c.Header("X-Environment"),
		c.Cookies(defaultEnvironmentCookie),
		fallback,
	}
	for _, candidate := range candidates {
		if normalized := normalizeRuntimeEnvironment(candidate); normalized != "" {
			return normalized
		}
	}
	return "prod"
}

func resolveRequestContentEnvironment(c router.Context, fallback string) string {
	fallback = normalizeContentEnvironment(fallback)
	if c == nil {
		if fallback != "" {
			return fallback
		}
		return "default"
	}
	candidates := []string{
		c.Query("content_env"),
		c.Query("site_env"),
		c.Query("env"),
		c.Query("environment"),
		c.Header("X-Site-Content-Environment"),
		c.Header("X-Site-Environment"),
		c.Header("X-Admin-Environment"),
		c.Header("X-Environment"),
		c.Cookies(defaultEnvironmentCookie),
		fallback,
	}
	for _, candidate := range candidates {
		if normalized := normalizeContentEnvironment(candidate); normalized != "" {
			return normalized
		}
	}
	return "default"
}

func resolveRequestLocale(c router.Context, i18nEnabled bool, fallback string, supported []string) string {
	fallback = strings.ToLower(strings.TrimSpace(fallback))
	if fallback == "" {
		fallback = "en"
	}
	if !i18nEnabled || c == nil {
		return fallback
	}

	candidates := []string{
		c.Param("locale", ""),
		localeFromRequestPath(c, supported),
		c.Query("locale"),
		c.Cookies(defaultLocaleCookieName),
	}
	for _, candidate := range candidates {
		if locale := matchSupportedLocale(candidate, supported); locale != "" {
			return locale
		}
	}
	if headerLocale := matchAcceptedLanguage(c.Header("Accept-Language"), supported); headerLocale != "" {
		return headerLocale
	}
	if locale := matchSupportedLocale(fallback, supported); locale != "" {
		return locale
	}
	return fallback
}

func localeFromRequestPath(c router.Context, supported []string) string {
	if c == nil {
		return ""
	}
	pathCandidates := []string{
		c.Param("path", ""),
		c.Path(),
	}
	for _, candidate := range pathCandidates {
		candidate = strings.TrimSpace(candidate)
		if candidate == "" {
			continue
		}
		if !strings.HasPrefix(candidate, "/") {
			candidate = "/" + strings.Trim(candidate, "/")
		}
		if _, locale := StripSupportedLocalePrefix(candidate, supported); locale != "" {
			return locale
		}
	}
	return ""
}

func matchAcceptedLanguage(header string, supported []string) string {
	header = strings.TrimSpace(header)
	if header == "" {
		return ""
	}
	type weightedLocale struct {
		locale string
		weight float64
		order  int
	}
	parts := strings.Split(header, ",")
	parsed := make([]weightedLocale, 0, len(parts))
	for index, part := range parts {
		part = strings.TrimSpace(part)
		if part == "" {
			continue
		}
		locale := part
		weight := 1.0
		if strings.Contains(part, ";") {
			segments := strings.Split(part, ";")
			locale = strings.TrimSpace(segments[0])
			for _, segment := range segments[1:] {
				segment = strings.TrimSpace(segment)
				if !strings.HasPrefix(strings.ToLower(segment), "q=") {
					continue
				}
				if parsedWeight, err := strconv.ParseFloat(strings.TrimPrefix(strings.ToLower(segment), "q="), 64); err == nil {
					weight = parsedWeight
				}
			}
		}
		parsed = append(parsed, weightedLocale{locale: locale, weight: weight, order: index})
	}
	sort.SliceStable(parsed, func(i, j int) bool {
		if parsed[i].weight == parsed[j].weight {
			return parsed[i].order < parsed[j].order
		}
		return parsed[i].weight > parsed[j].weight
	})
	for _, candidate := range parsed {
		if locale := matchSupportedLocale(candidate.locale, supported); locale != "" {
			return locale
		}
	}
	return ""
}

func matchSupportedLocale(candidate string, supported []string) string {
	candidate = strings.ToLower(strings.TrimSpace(candidate))
	if candidate == "" {
		return ""
	}
	if len(supported) == 0 {
		return candidate
	}
	for _, locale := range supported {
		locale = strings.ToLower(strings.TrimSpace(locale))
		if locale == "" {
			continue
		}
		if candidate == locale {
			return locale
		}
	}
	if idx := strings.Index(candidate, "-"); idx > 0 {
		base := candidate[:idx]
		for _, locale := range supported {
			locale = strings.ToLower(strings.TrimSpace(locale))
			if base == locale {
				return locale
			}
		}
	}
	return ""
}

func resolveRequestTheme(c router.Context, adm *admin.Admin, requestCtx context.Context, siteCfg ResolvedSiteConfig, environment string) (context.Context, map[string]map[string]string, string, string) {
	if requestCtx == nil {
		requestCtx = context.Background()
	}
	if !siteCfg.Features.EnableTheme {
		return requestCtx, nil, "", ""
	}

	selector := admin.ThemeSelector{
		Name:    strings.TrimSpace(siteCfg.Theme.Name),
		Variant: strings.TrimSpace(siteCfg.Theme.Variant),
	}
	if c != nil && environmentAllowsThemeOverride(environment) {
		if value := strings.TrimSpace(c.Query("theme")); value != "" {
			selector.Name = value
		}
		if value := strings.TrimSpace(c.Query("variant")); value != "" {
			selector.Variant = value
		}
	}

	themeCtx := requestCtx
	if selector.Name != "" || selector.Variant != "" {
		themeCtx = admin.WithThemeSelection(themeCtx, selector)
	}

	if adm == nil {
		payload := map[string]map[string]string{}
		selection := map[string]string{}
		if selector.Name != "" {
			selection["name"] = selector.Name
		}
		if selector.Variant != "" {
			selection["variant"] = selector.Variant
		}
		if len(selection) > 0 {
			payload["selection"] = selection
		}
		return themeCtx, payload, selection["name"], selection["variant"]
	}

	payload := cloneThemePayload(adm.ThemePayload(themeCtx))
	name := ""
	variant := ""
	if selection, ok := payload["selection"]; ok {
		name = strings.TrimSpace(selection["name"])
		variant = strings.TrimSpace(selection["variant"])
	}
	return themeCtx, payload, name, variant
}

func environmentAllowsThemeOverride(environment string) bool {
	environment = normalizeRuntimeEnvironment(environment)
	return environment != "prod"
}

func cloneThemePayload(input map[string]map[string]string) map[string]map[string]string {
	if len(input) == 0 {
		return nil
	}
	out := make(map[string]map[string]string, len(input))
	for key, values := range input {
		if len(values) == 0 {
			out[key] = map[string]string{}
			continue
		}
		dup := make(map[string]string, len(values))
		for subKey, subValue := range values {
			dup[subKey] = subValue
		}
		out[key] = dup
	}
	return out
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
