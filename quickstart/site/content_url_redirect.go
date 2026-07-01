package site

import (
	"context"
	"net/http"
	"net/url"
	"strings"

	router "github.com/goliatone/go-router"
)

const renderCacheReasonHistoricalRedirect = "historical_redirect"

// ContentURLRedirectLookup describes a public-site request that did not resolve
// to current content and may have a host-owned historical URL redirect.
type ContentURLRedirectLookup struct {
	Path           string `json:"path"`
	Method         string `json:"method"`
	Locale         string `json:"locale"`
	DefaultLocale  string `json:"default_locale"`
	SiteKey        string `json:"site_key"`
	Host           string `json:"host"`
	ContentChannel string `json:"content_channel"`
	BasePath       string `json:"base_path"`
	WantsJSON      bool   `json:"wants_json"`
}

// ContentURLRedirect is a host-owned historical URL redirect record.
type ContentURLRedirect struct {
	SourcePath      string         `json:"source_path"`
	TargetPath      string         `json:"target_path"`
	StatusCode      int            `json:"status_code"`
	Active          bool           `json:"active"`
	SiteKey         string         `json:"site_key"`
	ContentID       string         `json:"content_id"`
	ContentTypeSlug string         `json:"content_type_slug"`
	Locale          string         `json:"locale"`
	ContentChannel  string         `json:"content_channel"`
	Metadata        map[string]any `json:"metadata,omitempty"`
}

// ContentURLRedirectStore lets host applications provide historical URL
// redirect lookup without go-admin owning persistence or migrations.
type ContentURLRedirectStore interface {
	LookupContentURLRedirect(context.Context, ContentURLRedirectLookup) (*ContentURLRedirect, error)
}

func (r *deliveryRuntime) respondHistoricalContentURLRedirect(
	c router.Context,
	state RequestState,
	requestPath string,
	cacheDecision renderCacheDecision,
) (bool, error) {
	if r == nil || c == nil || r.redirectStore == nil {
		return false, nil
	}
	if !contentURLRedirectRequestEligible(c) {
		return false, nil
	}
	sourcePath := normalizeLocalePath(requestPath)
	if sourcePath == "" {
		sourcePath = "/"
	}
	lookup := r.contentURLRedirectLookup(c, state, sourcePath)
	redirect, err := r.redirectStore.LookupContentURLRedirect(RequestContext(c), lookup)
	if err != nil {
		return true, c.SendStatus(http.StatusServiceUnavailable)
	}
	target, status, ok := r.validContentURLRedirectTarget(c, sourcePath, redirect)
	if !ok {
		return false, nil
	}
	if cacheDecision.Cacheable {
		r.writeRenderCacheDebugHeaders(c, renderCacheStatusBypass, renderCacheReasonHistoricalRedirect, cacheDecision.Key)
	}
	return true, c.Redirect(target, status)
}

func (r *deliveryRuntime) contentURLRedirectLookup(c router.Context, state RequestState, sourcePath string) ContentURLRedirectLookup {
	defaultLocale := strings.TrimSpace(firstNonEmpty(state.DefaultLocale, r.siteCfg.DefaultLocale))
	contentChannel := strings.TrimSpace(firstNonEmpty(state.ContentChannel, r.siteCfg.ContentChannel))
	host := contentURLRedirectRequestHost(c)
	basePath := normalizeLocalePath(firstNonEmpty(state.BasePath, r.siteCfg.BasePath))
	return ContentURLRedirectLookup{
		Path:           contentURLRedirectLookupPath(c, sourcePath),
		Method:         strings.ToUpper(strings.TrimSpace(c.Method())),
		Locale:         strings.TrimSpace(state.Locale),
		DefaultLocale:  defaultLocale,
		SiteKey:        contentURLRedirectLookupSiteKey(r.redirectSiteKey, host, basePath, contentChannel),
		Host:           host,
		ContentChannel: contentChannel,
		BasePath:       basePath,
		WantsJSON:      wantsJSONResponse(c),
	}
}

func contentURLRedirectLookupPath(c router.Context, fallback string) string {
	if c != nil {
		if path := normalizeLocalePath(c.Path()); path != "" {
			return path
		}
	}
	return normalizeLocalePath(fallback)
}

func contentURLRedirectRequestEligible(c router.Context) bool {
	if c == nil || wantsJSONResponse(c) {
		return false
	}
	switch strings.ToUpper(strings.TrimSpace(c.Method())) {
	case http.MethodGet, http.MethodHead:
		return true
	default:
		return false
	}
}

func (r *deliveryRuntime) validContentURLRedirectTarget(
	c router.Context,
	sourcePath string,
	redirect *ContentURLRedirect,
) (string, int, bool) {
	if !r.contentURLRedirectRecordUsable(redirect) {
		return "", 0, false
	}
	sourcePath = normalizedContentURLRedirectSourcePath(sourcePath)
	if !r.contentURLRedirectSourceAllowed(sourcePath, redirect.SourcePath) {
		return "", 0, false
	}
	target, targetPath, hasTargetQuery, ok := normalizeContentURLRedirectTarget(redirect.TargetPath, contentURLRedirectRequestHost(c))
	if !ok {
		return "", 0, false
	}
	targetPolicyPath := contentURLRedirectPolicyPath(targetPath, r.siteCfg)
	if !r.contentURLRedirectTargetAllowed(sourcePath, targetPolicyPath) {
		return "", 0, false
	}
	if !hasTargetQuery {
		if query := encodeRequestQuery(c); query != "" {
			target += "?" + query
		}
	}
	return target, contentURLRedirectStatusCode(redirect.StatusCode), true
}

func (r *deliveryRuntime) contentURLRedirectRecordUsable(redirect *ContentURLRedirect) bool {
	return r != nil && redirect != nil && redirect.Active
}

func normalizedContentURLRedirectSourcePath(sourcePath string) string {
	sourcePath = normalizeLocalePath(sourcePath)
	if sourcePath == "" {
		return "/"
	}
	return sourcePath
}

func (r *deliveryRuntime) contentURLRedirectSourceAllowed(sourcePath string, storedSource string) bool {
	if siteFallbackReservedPath(r.siteCfg.Fallback, sourcePath) {
		return false
	}
	storedSource = strings.TrimSpace(storedSource)
	return storedSource == "" || contentURLRedirectPolicyPath(storedSource, r.siteCfg) == sourcePath
}

func (r *deliveryRuntime) contentURLRedirectTargetAllowed(sourcePath string, targetPolicyPath string) bool {
	switch {
	case targetPolicyPath == "":
		return false
	case targetPolicyPath == "/" && sourcePath == "/":
		return false
	case targetPolicyPath == sourcePath:
		return false
	case siteFallbackReservedPath(r.siteCfg.Fallback, targetPolicyPath):
		return false
	default:
		return true
	}
}

func normalizeContentURLRedirectTarget(raw string, requestHost string) (target string, path string, hasQuery bool, ok bool) {
	raw = strings.TrimSpace(raw)
	if raw == "" || strings.HasPrefix(raw, "//") || strings.Contains(raw, "\\") {
		return "", "", false, false
	}
	parsed, err := url.Parse(raw)
	if err != nil {
		return "", "", false, false
	}
	if parsed.Scheme != "" || parsed.Host != "" {
		if !contentURLRedirectSameHost(parsed.Host, requestHost) {
			return "", "", false, false
		}
		if parsed.Scheme != "" && parsed.Scheme != "http" && parsed.Scheme != "https" {
			return "", "", false, false
		}
	}
	if parsed.Path == "" {
		return "", "", false, false
	}
	path = sanitizeDeliveryPath(parsed.Path, deliveryPathPolicy{AllowRoot: true})
	if path == "" {
		return "", "", false, false
	}
	target = path
	if parsed.RawQuery != "" {
		target += "?" + parsed.RawQuery
		hasQuery = true
	}
	return target, path, hasQuery, true
}

func contentURLRedirectStatusCode(status int) int {
	switch status {
	case http.StatusMovedPermanently, http.StatusFound, http.StatusTemporaryRedirect, http.StatusPermanentRedirect:
		return status
	default:
		return http.StatusPermanentRedirect
	}
}

func contentURLRedirectPolicyPath(path string, siteCfg ResolvedSiteConfig) string {
	path = normalizeLocalePath(path)
	basePath := normalizeLocalePath(siteCfg.BasePath)
	if basePath != "/" {
		switch {
		case path == basePath:
			path = "/"
		case strings.HasPrefix(path, basePath+"/"):
			path = normalizeLocalePath(strings.TrimPrefix(path, basePath))
		}
	}
	if siteCfg.Features.EnableI18N {
		if stripped, _ := StripSupportedLocalePrefix(path, siteCfg.SupportedLocales); stripped != "" {
			path = stripped
		}
	}
	if path == "" {
		return "/"
	}
	return path
}

func contentURLRedirectRequestHost(c router.Context) string {
	if c == nil {
		return ""
	}
	if httpCtx, ok := c.(router.HTTPContext); ok {
		if req := httpCtx.Request(); req != nil && strings.TrimSpace(req.Host) != "" {
			return strings.TrimSpace(req.Host)
		}
	}
	return strings.TrimSpace(c.Header("Host"))
}

func contentURLRedirectSameHost(candidate, requestHost string) bool {
	candidate = normalizeContentURLRedirectHost(candidate)
	requestHost = normalizeContentURLRedirectHost(requestHost)
	return candidate != "" && requestHost != "" && candidate == requestHost
}

func normalizeContentURLRedirectHost(host string) string {
	host = strings.ToLower(strings.TrimSpace(host))
	if host == "" {
		return ""
	}
	if parsed, err := url.Parse("//" + host); err == nil && parsed.Hostname() != "" {
		host = parsed.Hostname()
		if port := parsed.Port(); port != "" {
			host += ":" + port
		}
	}
	return host
}

func contentURLRedirectLookupSiteKey(explicit string, host string, basePath string, contentChannel string) string {
	if explicit = strings.TrimSpace(explicit); explicit != "" {
		return explicit
	}
	parts := make([]string, 0, 3)
	if normalizedHost := normalizeContentURLRedirectHost(host); normalizedHost != "" {
		parts = append(parts, "host="+normalizedHost)
	}
	if basePath = normalizeLocalePath(basePath); basePath != "" && basePath != "/" {
		parts = append(parts, "base="+basePath)
	}
	if contentChannel = strings.TrimSpace(contentChannel); contentChannel != "" {
		parts = append(parts, "channel="+contentChannel)
	}
	return strings.Join(parts, "|")
}
