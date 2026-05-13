package site

import (
	"errors"
	"net/http"
	"strings"
	"time"

	router "github.com/goliatone/go-router"
)

// RenderedSiteResponse is the serializable rendered-page cache value.
type RenderedSiteResponse struct {
	Status      int                 `json:"status"`
	ContentType string              `json:"content_type"`
	Headers     map[string][]string `json:"headers"`
	Body        []byte              `json:"body"`
	CreatedAt   time.Time           `json:"created_at"`
	FreshUntil  time.Time           `json:"fresh_until"`
	StaleUntil  time.Time           `json:"stale_until"`
	Tags        []string            `json:"tags"`
}

type renderedSiteTemplateResult struct {
	Status       int
	TemplateName string
	Rendered     RenderedTemplate
}

func renderSiteTemplateResponseCaptured(
	c router.Context,
	state RequestState,
	cfg ResolvedSiteConfig,
	response siteTemplateResponse,
	renderer RenderCacheTemplateRenderer,
) (renderedSiteTemplateResult, error) {
	if renderer == nil {
		return renderedSiteTemplateResult{}, errors.New(renderCacheReasonMissingRenderer)
	}
	if wantsJSONResponse(c) {
		status := response.JSONStatus
		if status <= 0 {
			status = http.StatusOK
		}
		return renderedSiteTemplateResult{}, c.JSON(status, response.JSONPayload)
	}
	status := response.TemplateStatus
	if status <= 0 {
		status = http.StatusOK
	}
	for _, templateName := range response.TemplateNames {
		templateName = strings.TrimSpace(templateName)
		if templateName == "" {
			continue
		}
		rendered, err := renderer.RenderSiteTemplate(RequestContext(c), templateName, siteTemplateContext(c, response.ViewContext))
		if err != nil {
			continue
		}
		if strings.TrimSpace(rendered.ContentType) == "" {
			rendered.ContentType = "text/html; charset=utf-8"
		}
		if err := writeRenderedTemplate(c, status, rendered); err != nil {
			return renderedSiteTemplateResult{}, err
		}
		return renderedSiteTemplateResult{
			Status:       status,
			TemplateName: templateName,
			Rendered:     rendered,
		}, nil
	}
	if err := renderSiteRuntimeError(c, state, cfg, response.FallbackError); err != nil {
		return renderedSiteTemplateResult{}, err
	}
	return renderedSiteTemplateResult{}, nil
}

func writeRenderedTemplate(c router.Context, status int, rendered RenderedTemplate) error {
	if c == nil {
		return nil
	}
	if status <= 0 {
		status = http.StatusOK
	}
	applyRenderedHeaders(c, rendered.ContentType, rendered.Headers)
	c.Status(status)
	if renderCacheMethodIsHead(c) {
		return nil
	}
	return c.Send(rendered.Body)
}

func replayRenderedSiteResponse(c router.Context, response RenderedSiteResponse) error {
	if c == nil {
		return nil
	}
	status := response.Status
	if status <= 0 {
		status = http.StatusOK
	}
	applyRenderedHeaders(c, response.ContentType, response.Headers)
	c.Status(status)
	if renderCacheMethodIsHead(c) {
		return nil
	}
	return c.Send(append([]byte{}, response.Body...))
}

func applyRenderedHeaders(c router.Context, contentType string, headers map[string][]string) {
	if c == nil {
		return
	}
	if strings.TrimSpace(contentType) != "" {
		c.SetHeader("Content-Type", strings.TrimSpace(contentType))
	}
	for key, values := range headers {
		key = http.CanonicalHeaderKey(strings.TrimSpace(key))
		if key == "" || strings.EqualFold(key, "Content-Type") {
			continue
		}
		if len(values) == 0 {
			continue
		}
		value := strings.TrimSpace(values[0])
		if value == "" {
			continue
		}
		c.SetHeader(key, value)
	}
}

func newRenderedSiteResponse(result renderedSiteTemplateResult, policy RenderCachePolicy, tags []string, now time.Time) (RenderedSiteResponse, string, bool) {
	if now.IsZero() {
		now = time.Now()
	}
	headers, reason, ok := safeRenderCacheHeaders(result.Rendered.Headers, policy.HeaderAllowlist)
	if !ok {
		return RenderedSiteResponse{}, reason, false
	}
	contentType := strings.TrimSpace(result.Rendered.ContentType)
	if contentType == "" {
		contentType = firstHeaderValue(headers, "Content-Type")
	}
	if contentType == "" {
		contentType = "text/html; charset=utf-8"
	}
	if !isHTMLContentType(contentType) {
		return RenderedSiteResponse{}, "non_html", false
	}
	freshUntil := now.Add(policy.FreshTTL)
	staleUntil := freshUntil
	if policy.StaleTTL > 0 {
		staleUntil = freshUntil.Add(policy.StaleTTL)
	}
	return RenderedSiteResponse{
		Status:      result.Status,
		ContentType: contentType,
		Headers:     headers,
		Body:        append([]byte{}, result.Rendered.Body...),
		CreatedAt:   now,
		FreshUntil:  freshUntil,
		StaleUntil:  staleUntil,
		Tags:        cloneStrings(tags),
	}, "", true
}

func safeRenderCacheHeaders(headers map[string][]string, allowlist []string) (map[string][]string, string, bool) {
	for key := range headers {
		if renderCacheUnsafeHeader(key) {
			return nil, "unsafe_header", false
		}
	}
	allowed := map[string]bool{}
	for _, key := range allowlist {
		key = http.CanonicalHeaderKey(strings.TrimSpace(key))
		if key != "" {
			allowed[key] = true
		}
	}
	out := map[string][]string{}
	for key, values := range headers {
		key = http.CanonicalHeaderKey(strings.TrimSpace(key))
		if !allowed[key] {
			continue
		}
		for _, value := range values {
			value = strings.TrimSpace(value)
			if value != "" {
				out[key] = append(out[key], value)
			}
		}
	}
	return out, "", true
}

func renderCacheUnsafeHeader(key string) bool {
	switch http.CanonicalHeaderKey(strings.TrimSpace(key)) {
	case "Set-Cookie",
		"Authorization",
		"Cookie",
		"X-CSRF-Token",
		"X-Request-ID",
		"X-Request-Id",
		"X-Correlation-ID",
		"X-Correlation-Id",
		"X-Trace-ID",
		"X-Trace-Id":
		return true
	default:
		return false
	}
}

func firstHeaderValue(headers map[string][]string, key string) string {
	values := headers[http.CanonicalHeaderKey(key)]
	if len(values) == 0 {
		return ""
	}
	return strings.TrimSpace(values[0])
}

func isHTMLContentType(contentType string) bool {
	contentType = strings.ToLower(strings.TrimSpace(contentType))
	return strings.Contains(contentType, "text/html") || strings.Contains(contentType, "application/xhtml")
}
