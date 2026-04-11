package site

import (
	"fmt"
	"slices"
	"strings"

	router "github.com/goliatone/go-router"
)

const (
	siteErrorCodeTranslationMissing = "translation_missing"
)

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
	code = strings.ToLower(strings.TrimSpace(code))
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

func renderSiteRuntimeError(c router.Context, state RequestState, cfg ResolvedSiteConfig, siteErr SiteRuntimeError) error {
	status := siteErr.Status
	if status <= 0 {
		status = 500
	}
	code := strings.ToLower(strings.TrimSpace(siteErr.Code))

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

	errorCtx := cloneViewContext(state.ViewContext)
	errorCtx["error_code"] = code
	errorCtx["error_status"] = status
	if requested := strings.TrimSpace(siteErr.RequestedLocale); requested != "" {
		errorCtx["requested_locale"] = requested
	}
	if len(siteErr.AvailableLocales) > 0 {
		errorCtx["available_locales"] = cloneStrings(siteErr.AvailableLocales)
	}
	if contentType := strings.TrimSpace(siteErr.ContentType); contentType != "" {
		errorCtx["content_type"] = contentType
	}
	if slugOrPath := strings.TrimSpace(siteErr.SlugOrPath); slugOrPath != "" {
		errorCtx["slug_path"] = slugOrPath
	}

	templates := ResolveErrorTemplateCandidates(cfg.Views, code, status)
	for _, templateName := range templates {
		c.Status(status)
		if err := renderSiteTemplate(c, templateName, errorCtx); err == nil {
			return nil
		}
	}
	return c.SendStatus(status)
}
