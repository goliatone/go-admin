package site

import (
	"errors"
	"fmt"
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
	Provenance  DeliveryProvenance  `json:"provenance,omitempty"`
}

type renderedSiteTemplateResult struct {
	Status       int
	TemplateName string
	Rendered     RenderedTemplate
	Provenance   DeliveryProvenance
	LastError    error
}

type renderCacheCaptureError struct {
	Reason string
	Err    error
}

func (e renderCacheCaptureError) Error() string {
	if e.Err == nil {
		return e.Reason
	}
	return fmt.Sprintf("%s: %v", e.Reason, e.Err)
}

func (e renderCacheCaptureError) Unwrap() error {
	return e.Err
}

func renderSiteTemplateResponseCaptured(
	c router.Context,
	response siteTemplateResponse,
	policy RenderCachePolicy,
) (renderedSiteTemplateResult, error) {
	if wantsJSONResponse(c) {
		return renderedSiteTemplateResult{}, renderCacheCaptureError{Reason: renderCacheReasonJSON, Err: errors.New(renderCacheReasonJSON)}
	}
	policy = normalizeRenderCachePolicy(policy)
	if policy.TemplateRenderer != nil {
		return renderSiteTemplateResponseWithOverride(c, response, policy.TemplateRenderer)
	}
	if _, ok := router.AsTemplateRenderer(c); !ok {
		return renderedSiteTemplateResult{}, renderCacheCaptureError{
			Reason: renderCacheReasonUnsupportedRenderer,
			Err:    errors.New("router context does not support non-committing template rendering"),
		}
	}
	return renderSiteTemplateResponseWithRouterCapture(c, response, policy)
}

func renderSiteTemplateResponseWithOverride(
	c router.Context,
	response siteTemplateResponse,
	renderer RenderCacheTemplateRenderer,
) (renderedSiteTemplateResult, error) {
	provenance := cloneDeliveryProvenance(response.Provenance)
	var lastErr error
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
			lastErr = err
			appendDeliveryTemplateAttempt(&provenance, templateName, "failed")
			continue
		}
		appendDeliveryTemplateAttempt(&provenance, templateName, "selected")
		finalizeDeliveryProvenance(&provenance, templateName, "PUBLIC_SITE_DELIVERY_RENDERED")
		if strings.TrimSpace(rendered.ContentType) == "" {
			rendered.ContentType = "text/html; charset=utf-8"
		}
		return renderedSiteTemplateResult{
			Status:       status,
			TemplateName: templateName,
			Rendered:     rendered,
			Provenance:   provenance,
		}, nil
	}
	finalizeDeliveryProvenance(&provenance, "", "PUBLIC_TEMPLATE_RENDER_FAILED")
	return renderedSiteTemplateResult{Provenance: provenance, LastError: lastErr}, nil
}

func renderSiteTemplateResponseWithRouterCapture(
	c router.Context,
	response siteTemplateResponse,
	policy RenderCachePolicy,
) (renderedSiteTemplateResult, error) {
	provenance := cloneDeliveryProvenance(response.Provenance)
	var lastErr error
	status := response.TemplateStatus
	if status <= 0 {
		status = http.StatusOK
	}
	for _, templateName := range response.TemplateNames {
		templateName = strings.TrimSpace(templateName)
		if templateName == "" {
			continue
		}
		captured, err := router.CaptureResponse(c, policy.MaxCaptureBodySize, func(capture router.Context) error {
			capture.Status(status)
			return renderSiteTemplate(capture, templateName, response.ViewContext)
		})
		if err != nil {
			reason := renderCacheCaptureFailureReason(err)
			if reason == renderCacheReasonRenderError {
				lastErr = err
				appendDeliveryTemplateAttempt(&provenance, templateName, "failed")
				continue
			}
			return renderedSiteTemplateResult{}, renderCacheCaptureError{Reason: reason, Err: err}
		}
		appendDeliveryTemplateAttempt(&provenance, templateName, "selected")
		finalizeDeliveryProvenance(&provenance, templateName, "PUBLIC_SITE_DELIVERY_RENDERED")
		rendered := renderedTemplateFromCapturedResponse(captured)
		if strings.TrimSpace(rendered.ContentType) == "" {
			rendered.ContentType = "text/html; charset=utf-8"
		}
		return renderedSiteTemplateResult{
			Status:       captured.StatusCode,
			TemplateName: templateName,
			Rendered:     rendered,
			Provenance:   provenance,
		}, nil
	}
	finalizeDeliveryProvenance(&provenance, "", "PUBLIC_TEMPLATE_RENDER_FAILED")
	return renderedSiteTemplateResult{Provenance: provenance, LastError: lastErr}, nil
}

func renderedTemplateFromCapturedResponse(captured *router.CapturedResponse) RenderedTemplate {
	if captured == nil {
		return RenderedTemplate{}
	}
	headers := cloneRenderCacheHeaderMap(captured.Headers)
	return RenderedTemplate{
		ContentType: firstHeaderValue(headers, "Content-Type"),
		Headers:     headers,
		Body:        append([]byte{}, captured.Body...),
	}
}

func cloneRenderCacheHeaderMap(input map[string][]string) map[string][]string {
	if len(input) == 0 {
		return nil
	}
	out := make(map[string][]string, len(input))
	for key, values := range input {
		out[key] = append([]string{}, values...)
	}
	return out
}

func renderCacheCaptureFailureReason(err error) string {
	switch {
	case errors.Is(err, router.ErrResponseCaptureTooLarge):
		return renderCacheReasonOversizedCapture
	case errors.Is(err, router.ErrResponseCaptureStream):
		return renderCacheReasonStreamCapture
	case strings.Contains(strings.ToLower(err.Error()), "does not support template rendering"):
		return renderCacheReasonUnsupportedRenderer
	default:
		return renderCacheReasonRenderError
	}
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
		return RenderedSiteResponse{}, renderCacheReasonNonHTML, false
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
		Provenance:  cloneDeliveryProvenance(result.Provenance),
	}, "", true
}

func safeRenderCacheHeaders(headers map[string][]string, allowlist []string) (map[string][]string, string, bool) {
	for key := range headers {
		if renderCacheUnsafeHeader(key) {
			return nil, renderCacheReasonUnsafeHeader, false
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
