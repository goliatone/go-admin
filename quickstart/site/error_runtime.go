package site

import (
	"context"
	"fmt"
	"path"
	"slices"
	"strings"

	router "github.com/goliatone/go-router"
)

const (
	siteErrorCodeTranslationMissing = "translation_missing"
)

// SiteTemplateRef identifies a concrete template or a public-theme manifest
// template key with an optional stable concrete default.
type SiteTemplateRef struct {
	Template        string `json:"template,omitempty"`
	ThemeKey        string `json:"theme_key,omitempty"`
	DefaultTemplate string `json:"default_template,omitempty"`
}

// SiteErrorTemplatePolicy defines ordered error template references by error
// code, HTTP status, and generic fallback.
type SiteErrorTemplatePolicy struct {
	ByCode   map[string][]SiteTemplateRef `json:"by_code,omitempty"`
	ByStatus map[int][]SiteTemplateRef    `json:"by_status,omitempty"`
	Fallback []SiteTemplateRef            `json:"fallback,omitempty"`
}

// SiteErrorTemplateCandidate is a resolved, safe render candidate with
// sanitized provenance for diagnostics.
type SiteErrorTemplateCandidate struct {
	Template   string `json:"template"`
	Source     string `json:"source"`
	ThemeKey   string `json:"theme_key,omitempty"`
	IsFallback bool   `json:"is_fallback"`
}

// SiteErrorRenderRequest contains the normalized error identity, request state,
// and optional safe host view fields for HTML error rendering.
type SiteErrorRenderRequest struct {
	Error       SiteRuntimeError   `json:"error"`
	State       RequestState       `json:"state"`
	ViewContext router.ViewContext `json:"view_context"`
}

// SiteErrorRenderResult reports sanitized selection provenance to callers.
type SiteErrorRenderResult struct {
	Template string `json:"template,omitempty"`
	Source   string `json:"source,omitempty"`
	Attempts int    `json:"attempts"`
}

// SiteRuntimeError carries normalized site error metadata used by HTML and API
// responses.
type SiteRuntimeError struct {
	Code             string   `json:"code"`
	Status           int      `json:"status"`
	Message          string   `json:"message"`
	RequestedLocale  string   `json:"requested_locale"`
	AvailableLocales []string `json:"available_locales"`
	ContentType      string   `json:"content_type"`
	SlugOrPath       string   `json:"slug_or_path"`
}

func (e SiteRuntimeError) Error() string {
	message := strings.TrimSpace(e.Message)
	if message != "" {
		return message
	}
	if strings.TrimSpace(e.Code) != "" {
		return e.Code
	}
	if e.Status > 0 {
		return fmt.Sprintf("site runtime error (%d)", e.Status)
	}
	return "site runtime error"
}

// ResolveErrorTemplate resolves template selection in the required order:
// code-specific, status-specific, and finally generic fallback.
func ResolveErrorTemplate(cfg ResolvedSiteViewConfig, code string, status int) string {
	candidates := ResolveErrorTemplateCandidates(cfg, code, status)
	if len(candidates) == 0 {
		return ""
	}
	return candidates[0]
}

// ResolveErrorTemplateCandidates returns a de-duplicated chain of templates in
// priority order for rendering error pages.
func ResolveErrorTemplateCandidates(cfg ResolvedSiteViewConfig, code string, status int) []string {
	code = normalizeSiteErrorCode(code)
	candidates := make([]string, 0, 3)
	appendCandidate := func(name string) {
		name = strings.TrimSpace(name)
		if name == "" {
			return
		}
		if slices.Contains(candidates, name) {
			return
		}
		candidates = append(candidates, name)
	}
	if code != "" {
		appendCandidate(cfg.ErrorTemplatesByCode[code])
	}
	if status > 0 {
		appendCandidate(cfg.ErrorTemplatesByStatus[status])
	}
	appendCandidate(cfg.ErrorTemplate)
	return candidates
}

// ResolveSiteErrorTemplateCandidates resolves the configured policy after
// request theme context is available. Invalid and duplicate render names are
// skipped without suppressing later fallbacks.
func ResolveSiteErrorTemplateCandidates(
	cfg ResolvedSiteViewConfig,
	code string,
	status int,
	viewCtx router.ViewContext,
) []SiteErrorTemplateCandidate {
	code = normalizeSiteErrorCode(code)
	// Compose defensively so callers that construct ResolvedSiteViewConfig
	// directly retain the legacy code/status/generic behavior.
	policy := resolveSiteErrorTemplatePolicy(cfg.ErrorPolicy, cfg)
	refs := make([]struct {
		ref        SiteTemplateRef
		source     string
		isFallback bool
	}, 0)
	if code != "" {
		for _, ref := range policy.ByCode[code] {
			refs = append(refs, struct {
				ref        SiteTemplateRef
				source     string
				isFallback bool
			}{ref: ref, source: "code"})
		}
	}
	if status > 0 {
		for _, ref := range policy.ByStatus[status] {
			refs = append(refs, struct {
				ref        SiteTemplateRef
				source     string
				isFallback bool
			}{ref: ref, source: "status"})
		}
	}
	for _, ref := range policy.Fallback {
		refs = append(refs, struct {
			ref        SiteTemplateRef
			source     string
			isFallback bool
		}{ref: ref, source: "fallback", isFallback: true})
	}

	siteTheme := anyMap(viewCtx["site_theme"])
	seen := map[string]struct{}{}
	out := make([]SiteErrorTemplateCandidate, 0, len(refs))
	for _, item := range refs {
		templateName, themeKey := resolveSiteTemplateRef(item.ref, siteTheme)
		if templateName == "" {
			continue
		}
		if _, exists := seen[templateName]; exists {
			continue
		}
		seen[templateName] = struct{}{}
		out = append(out, SiteErrorTemplateCandidate{
			Template:   templateName,
			Source:     item.source,
			ThemeKey:   themeKey,
			IsFallback: item.isFallback,
		})
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func resolveSiteTemplateRef(ref SiteTemplateRef, siteTheme map[string]any) (string, string) {
	if strings.TrimSpace(ref.Template) != "" {
		return normalizeSiteErrorTemplateName(ref.Template), ""
	}
	themeKey := strings.TrimSpace(ref.ThemeKey)
	if themeKey != "" {
		if rawTarget, found := siteThemeTemplateTarget(siteTheme, themeKey); found {
			return normalizeSiteErrorThemeTemplateName(rawTarget), themeKey
		}
	}
	return normalizeSiteErrorTemplateName(ref.DefaultTemplate), themeKey
}

func normalizeSiteErrorThemeTemplateName(name string) string {
	name = strings.TrimSpace(name)
	if name == "" || strings.HasPrefix(name, "/") || strings.HasPrefix(name, "\\") || strings.Contains(name, "://") || strings.HasPrefix(name, "//") {
		return ""
	}
	return normalizeSiteErrorTemplateName(siteThemeRenderTemplateName(name))
}

func normalizeSiteErrorTemplateName(name string) string {
	name = strings.TrimSpace(name)
	if name == "" || strings.HasPrefix(name, "/") || strings.HasPrefix(name, "\\") || strings.Contains(name, "\\") || strings.Contains(name, "://") || strings.HasPrefix(name, "//") {
		return ""
	}
	name = strings.TrimPrefix(name, "./")
	name = strings.TrimPrefix(name, "templates/")
	clean := path.Clean(name)
	if clean == "." || clean == ".." || strings.HasPrefix(clean, "../") || strings.Contains(clean, "/../") {
		return ""
	}
	return strings.TrimSpace(clean)
}

func normalizeSiteRuntimeError(siteErr SiteRuntimeError) SiteRuntimeError {
	status := siteErr.Status
	if status <= 0 {
		status = 500
	}
	return SiteRuntimeError{
		Code:             normalizeSiteErrorCode(siteErr.Code),
		Status:           status,
		Message:          strings.TrimSpace(siteErr.Message),
		RequestedLocale:  strings.TrimSpace(siteErr.RequestedLocale),
		AvailableLocales: cloneStrings(siteErr.AvailableLocales),
		ContentType:      strings.TrimSpace(siteErr.ContentType),
		SlugOrPath:       strings.TrimSpace(siteErr.SlugOrPath),
	}
}

func buildSiteErrorViewContext(
	ctx context.Context,
	cfg ResolvedSiteConfig,
	request SiteErrorContextRequest,
	in router.ViewContext,
) router.ViewContext {
	if ctx == nil {
		ctx = context.Background()
	}
	request.Error = normalizeSiteRuntimeError(request.Error)
	request.State = cloneSiteErrorRequestState(request.State)
	viewCtx := cloneSiteErrorViewContext(in)
	viewCtx["error_code"] = request.Error.Code
	viewCtx["error_status"] = request.Error.Status
	if request.Error.RequestedLocale != "" {
		viewCtx["requested_locale"] = request.Error.RequestedLocale
	}
	if len(request.Error.AvailableLocales) > 0 {
		viewCtx["available_locales"] = cloneStrings(request.Error.AvailableLocales)
	}
	if request.Error.ContentType != "" {
		viewCtx["content_type"] = request.Error.ContentType
	}
	if request.Error.SlugOrPath != "" {
		viewCtx["slug_path"] = request.Error.SlugOrPath
	}
	viewCtx["site_error"] = map[string]any{
		"code":      request.Error.Code,
		"status":    request.Error.Status,
		"home_href": ResolveSitePublicPath(cfg, "/", request.State.Locale),
	}

	for _, module := range cfg.Modules {
		provider, ok := module.(SiteErrorContextProvider)
		if !ok || provider == nil {
			continue
		}
		viewCtx = callSiteErrorContextProvider(ctx, provider, request, viewCtx)
	}
	return cloneSiteErrorViewContext(viewCtx)
}

func callSiteErrorContextProvider(
	ctx context.Context,
	provider SiteErrorContextProvider,
	request SiteErrorContextRequest,
	in router.ViewContext,
) (out router.ViewContext) {
	out = cloneSiteErrorViewContext(in)
	defer func() {
		if recover() != nil {
			out = cloneSiteErrorViewContext(in)
		}
	}()
	request.State = cloneSiteErrorRequestState(request.State)
	next := provider.ErrorViewContext(ctx, request, cloneSiteErrorViewContext(in))
	if next != nil {
		out = cloneSiteErrorViewContext(next)
	}
	return out
}

func observeSiteErrorRender(ctx context.Context, modules []SiteModule, event SiteErrorRenderEvent) {
	if ctx == nil {
		ctx = context.Background()
	}
	for _, module := range modules {
		observer, ok := module.(SiteErrorRenderObserver)
		if !ok || observer == nil {
			continue
		}
		callSiteErrorRenderObserver(ctx, observer, event)
	}
}

func callSiteErrorRenderObserver(ctx context.Context, observer SiteErrorRenderObserver, event SiteErrorRenderEvent) {
	defer func() { _ = recover() }()
	observer.ObserveSiteErrorRender(ctx, event)
}

func cloneSiteErrorViewContext(input router.ViewContext) router.ViewContext {
	out := cloneViewContext(input)
	if raw := anyMap(out["site_error"]); raw != nil {
		out["site_error"] = cloneAnyMap(raw)
	}
	if raw := anyMap(out["site_theme"]); raw != nil {
		out["site_theme"] = cloneSiteThemeContract(raw)
	}
	if values := anyStringSlice(out["available_locales"]); len(values) > 0 {
		out["available_locales"] = cloneStrings(values)
	}
	if values := anyStringSlice(out["supported_locales"]); len(values) > 0 {
		out["supported_locales"] = cloneStrings(values)
	}
	return out
}

func cloneSiteErrorRequestState(input RequestState) RequestState {
	out := input
	out.SupportedLocales = cloneStrings(input.SupportedLocales)
	out.Theme = nil
	if len(input.Theme) > 0 {
		out.Theme = make(map[string]map[string]string, len(input.Theme))
		for key, values := range input.Theme {
			out.Theme[key] = cloneStringMap(values)
		}
	}
	out.SiteTheme = cloneSiteThemeContract(input.SiteTheme)
	out.ViewContext = cloneSiteErrorViewContext(input.ViewContext)
	return out
}

// RenderSiteErrorHTML atomically renders the first successful error candidate
// and commits only that captured response. Host applications retain ownership
// of JSON negotiation and payloads.
func RenderSiteErrorHTML(
	c router.Context,
	cfg ResolvedSiteConfig,
	request SiteErrorRenderRequest,
) (SiteErrorRenderResult, error) {
	if c == nil {
		return SiteErrorRenderResult{}, fmt.Errorf("site error renderer: context is nil")
	}
	request.Error = normalizeSiteRuntimeError(request.Error)
	request.State = completeSiteErrorRequestState(c, cfg, request.State)
	baseView := cloneSiteErrorViewContext(request.State.ViewContext)
	for key, value := range cloneSiteErrorViewContext(request.ViewContext) {
		baseView[key] = value
	}
	viewCtx := buildSiteErrorViewContext(RequestContext(c), cfg, SiteErrorContextRequest{
		Error: request.Error,
		State: request.State,
	}, baseView)
	candidates := ResolveSiteErrorTemplateCandidates(cfg.Views, request.Error.Code, request.Error.Status, viewCtx)
	result := SiteErrorRenderResult{}
	for idx, candidate := range candidates {
		result.Attempts++
		attempt := idx + 1
		captured, err := router.CaptureResponse(c, router.DefaultMaxCapturedBodySize, func(capture router.Context) error {
			capture.Status(request.Error.Status)
			return renderSiteTemplate(capture, candidate.Template, cloneSiteErrorViewContext(viewCtx))
		})
		if err != nil || captured == nil {
			observeSiteErrorRender(RequestContext(c), cfg.Modules, siteErrorRenderEvent(request.Error, candidate, "failed", attempt))
			continue
		}
		captured.StatusCode = request.Error.Status
		if renderCacheMethodIsHead(c) {
			captured.Body = nil
		}
		if err := router.ReplayCapturedResponse(c, captured); err != nil {
			observeSiteErrorRender(RequestContext(c), cfg.Modules, siteErrorRenderEvent(request.Error, candidate, "failed", attempt))
			return result, err
		}
		observeSiteErrorRender(RequestContext(c), cfg.Modules, siteErrorRenderEvent(request.Error, candidate, "selected", attempt))
		result.Template = candidate.Template
		result.Source = candidate.Source
		return result, nil
	}
	return result, c.NoContent(request.Error.Status)
}

func completeSiteErrorRequestState(c router.Context, cfg ResolvedSiteConfig, input RequestState) RequestState {
	fallback := fallbackRequestState(c, cfg, "/")
	out := cloneSiteErrorRequestState(input)
	if strings.TrimSpace(out.Locale) == "" {
		out.Locale = fallback.Locale
	}
	if strings.TrimSpace(out.DefaultLocale) == "" {
		out.DefaultLocale = fallback.DefaultLocale
	}
	if len(out.SupportedLocales) == 0 {
		out.SupportedLocales = cloneStrings(fallback.SupportedLocales)
	}
	if strings.TrimSpace(out.BasePath) == "" {
		out.BasePath = fallback.BasePath
	}
	if out.ViewContext == nil || len(out.ViewContext) == 0 {
		out.ViewContext = cloneSiteErrorViewContext(fallback.ViewContext)
	}
	return out
}

func siteErrorRenderEvent(siteErr SiteRuntimeError, candidate SiteErrorTemplateCandidate, outcome string, attempt int) SiteErrorRenderEvent {
	return SiteErrorRenderEvent{
		Code:       siteErr.Code,
		Status:     siteErr.Status,
		Source:     candidate.Source,
		ThemeKey:   candidate.ThemeKey,
		Template:   candidate.Template,
		Outcome:    strings.TrimSpace(outcome),
		Attempt:    attempt,
		IsFallback: candidate.IsFallback || attempt > 1,
	}
}

func renderSiteRuntimeError(c router.Context, state RequestState, cfg ResolvedSiteConfig, siteErr SiteRuntimeError) error {
	siteErr = normalizeSiteRuntimeError(siteErr)
	status := siteErr.Status
	code := siteErr.Code

	if wantsJSONResponse(c) {
		payload := map[string]any{
			"error": map[string]any{
				"code":              code,
				"status":            status,
				"message":           strings.TrimSpace(siteErr.Message),
				"requested_locale":  strings.TrimSpace(siteErr.RequestedLocale),
				"available_locales": cloneStrings(siteErr.AvailableLocales),
				"content_type":      strings.TrimSpace(siteErr.ContentType),
				"slug_path":         strings.TrimSpace(siteErr.SlugOrPath),
			},
		}
		return c.JSON(status, payload)
	}

	_, err := RenderSiteErrorHTML(c, cfg, SiteErrorRenderRequest{
		Error: siteErr,
		State: state,
	})
	return err
}
