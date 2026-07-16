package site

import (
	"net/http"
	"net/url"
	"slices"
	"strings"

	"github.com/goliatone/go-admin/admin"
	auth "github.com/goliatone/go-auth"
	router "github.com/goliatone/go-router"
)

const (
	renderCacheStatusBypass = DeliveryCacheStatusBypass
	renderCacheStatusMiss   = DeliveryCacheStatusMiss
	renderCacheStatusHit    = DeliveryCacheStatusHit
	renderCacheStatusStale  = DeliveryCacheStatusStale

	renderCacheReasonDisabled             = "disabled"
	renderCacheReasonMissingStore         = "missing_store"
	renderCacheReasonUnsupportedRenderer  = "unsupported_template_renderer"
	renderCacheReasonMethod               = "method"
	renderCacheReasonJSON                 = "json"
	renderCacheReasonPreview              = "preview"
	renderCacheReasonAuth                 = "auth"
	renderCacheReasonHostBypass           = "host_bypass"
	renderCacheReasonLocaleCookieMutation = "locale_cookie_mutation"
	renderCacheReasonUnknownQuery         = "unknown_query"
	renderCacheReasonReservedRoute        = "reserved_route"
	renderCacheReasonSearchRoute          = "search_route"
	renderCacheReasonCacheReadError       = "cache_read_error"
	renderCacheReasonCacheWriteError      = "cache_write_error"
	renderCacheReasonCanonicalRedirect    = "canonical_redirect"
	renderCacheReasonRenderError          = "render_error"
	renderCacheReasonStatus               = "status"
	renderCacheReasonOversizedCapture     = "oversized_capture"
	renderCacheReasonStreamCapture        = "stream_capture"
	renderCacheReasonNonHTML              = "non_html"
	renderCacheReasonUnsafeHeader         = "unsafe_header"
	renderCacheReasonTagIndexRequired     = "tag_index_required"
	renderCacheReasonTagIndexMemoryStore  = "tag_index_memory_backend"
	renderCacheReasonTagIndexBackendKind  = "tag_index_backend_kind"
	renderCacheReasonTagIndexWriteError   = "tag_index_write_error"
)

type renderCacheDecision struct {
	Cacheable   bool
	Key         string
	RequestPath string
	Query       url.Values
	Reason      string
}

func (r *deliveryRuntime) renderCacheLookupDecision(c router.Context, state RequestState) renderCacheDecision {
	if r == nil {
		return renderCacheDecision{Reason: renderCacheReasonDisabled}
	}
	decision := r.renderCacheBaseDecision(c, state)
	if !decision.Cacheable {
		return decision
	}
	requestPath := r.requestPathForResolution(c)
	decision.RequestPath = requestPath
	decision.Key = buildRenderCacheKey(renderCacheKeyInput{
		Policy:      r.renderCache.policy,
		State:       state,
		RequestPath: requestPath,
		Query:       decision.Query,
	})
	return decision
}

func (r *deliveryRuntime) renderCacheBaseDecision(c router.Context, state RequestState) renderCacheDecision {
	cfg := r.renderCache
	policy := normalizeRenderCachePolicy(cfg.policy)
	if decision := renderCacheConfigDecision(cfg, policy); !decision.Cacheable {
		return decision
	}
	if c == nil {
		return renderCacheDecision{Reason: renderCacheReasonDisabled}
	}
	if decision := renderCacheRequestDecision(c, policy); !decision.Cacheable {
		return decision
	}
	if decision := renderCacheStateDecision(c, state, policy); !decision.Cacheable {
		return decision
	}
	if r.renderCacheReservedRoute(c) {
		return renderCacheDecision{Reason: renderCacheReasonReservedRoute}
	}
	if r.renderCacheSearchRoute(c) {
		return renderCacheDecision{Reason: renderCacheReasonSearchRoute}
	}
	query, ok := renderCacheAllowedQuery(c, policy)
	if !ok {
		return renderCacheDecision{Reason: renderCacheReasonUnknownQuery}
	}
	return renderCacheDecision{Cacheable: true, Query: query}
}

func renderCacheConfigDecision(cfg renderCacheConfig, policy RenderCachePolicy) renderCacheDecision {
	switch {
	case !policy.Enabled:
		return renderCacheDecision{Reason: renderCacheReasonDisabled}
	case cfg.store == nil:
		return renderCacheDecision{Reason: renderCacheReasonMissingStore}
	case policy.RequireTagIndex && renderCacheStoreIsMemoryBackend(cfg.store):
		return renderCacheDecision{Reason: renderCacheReasonTagIndexMemoryStore}
	case policy.RequireTagIndex && !renderCacheStoreHasDeclaredBackendKind(cfg.store):
		return renderCacheDecision{Reason: renderCacheReasonTagIndexBackendKind}
	case policy.RequireTagIndex && !renderCacheStoreSupportsTagIndex(cfg.store):
		return renderCacheDecision{Reason: renderCacheReasonTagIndexRequired}
	default:
		return renderCacheDecision{Cacheable: true}
	}
}

func renderCacheStoreSupportsTagIndex(store RenderCacheStore) bool {
	if store == nil {
		return false
	}
	_, ok := store.(RenderCacheTagInvalidator)
	return ok
}

func renderCacheRequestDecision(c router.Context, policy RenderCachePolicy) renderCacheDecision {
	if !renderCacheMethodAllowed(c.Method(), policy.CacheableMethods) {
		return renderCacheDecision{Reason: renderCacheReasonMethod}
	}
	if wantsJSONResponse(c) {
		return renderCacheDecision{Reason: renderCacheReasonJSON}
	}
	return renderCacheDecision{Cacheable: true}
}

func renderCacheStateDecision(c router.Context, state RequestState, policy RenderCachePolicy) renderCacheDecision {
	if state.PreviewTokenPresent || state.IsPreview || state.PreviewTokenValid {
		return renderCacheDecision{Reason: renderCacheReasonPreview}
	}
	if renderCacheHasAuthSignal(c, policy) {
		return renderCacheDecision{Reason: renderCacheReasonAuth}
	}
	for _, predicate := range policy.BypassPredicates {
		if predicate == nil {
			continue
		}
		if bypass, reason := predicate(c, state); bypass {
			if strings.TrimSpace(reason) == "" {
				reason = renderCacheReasonHostBypass
			}
			return renderCacheDecision{Reason: reason}
		}
	}
	if LocaleCookieMutatedFromRequest(c) {
		return renderCacheDecision{Reason: renderCacheReasonLocaleCookieMutation}
	}
	return renderCacheDecision{Cacheable: true}
}

func renderCacheMethodAllowed(method string, allowed []string) bool {
	method = strings.ToUpper(strings.TrimSpace(method))
	for _, candidate := range allowed {
		if method == strings.ToUpper(strings.TrimSpace(candidate)) {
			return true
		}
	}
	return false
}

func renderCacheHasAuthSignal(c router.Context, policy RenderCachePolicy) bool {
	if c == nil {
		return false
	}
	if admin.AuthenticatedRequestFromContext(c.Context()) {
		return true
	}
	if claims, ok := auth.GetClaims(c.Context()); ok && claims != nil {
		return true
	}
	if actor, ok := auth.ActorFromContext(c.Context()); ok && actor != nil {
		return true
	}
	if strings.TrimSpace(c.Header("Authorization")) != "" {
		return true
	}
	for _, cookie := range renderCacheAuthCookieNames(policy) {
		if strings.TrimSpace(c.Cookies(cookie)) != "" {
			return true
		}
	}
	return false
}

func renderCacheAuthCookieNames(policy RenderCachePolicy) []string {
	defaults := []string{
		"session",
		"session_id",
		"sid",
		"auth",
		"auth_token",
		"jwt",
		"jwt_token",
		"id_token",
		"access_token",
		"refresh_token",
		"user",
		"admin_user",
		"go_admin_session",
	}
	return append(defaults, policy.AuthCookieNames...)
}

func (r *deliveryRuntime) renderCacheReservedRoute(c router.Context) bool {
	if r == nil || c == nil {
		return false
	}
	path := normalizeLocalePath(r.requestPathForResolution(c))
	for _, prefix := range r.siteCfg.Fallback.ReservedPrefixes {
		prefix = normalizeLocalePath(prefix)
		if prefix == "/" {
			continue
		}
		if path == prefix || strings.HasPrefix(path, prefix+"/") {
			return true
		}
	}
	return false
}

func (r *deliveryRuntime) renderCacheSearchRoute(c router.Context) bool {
	if r == nil || c == nil || !r.siteCfg.Features.EnableSearch {
		return false
	}
	path := normalizeLocalePath(r.requestPathForResolution(c))
	for _, candidate := range []string{r.siteCfg.Search.Route, r.siteCfg.Search.Endpoint, searchSuggestRoute(r.siteCfg.Search.Endpoint)} {
		candidate = normalizeLocalePath(candidate)
		if candidate == "/" {
			continue
		}
		if path == candidate || strings.HasPrefix(path, candidate+"/") {
			return true
		}
	}
	return false
}

func renderCacheAllowedQuery(c router.Context, policy RenderCachePolicy) (url.Values, bool) {
	values := url.Values{}
	if c == nil {
		return values, true
	}
	allowlist := map[string]bool{}
	for _, key := range policy.QueryAllowlist {
		key = strings.ToLower(strings.TrimSpace(key))
		if key != "" {
			allowlist[key] = true
		}
	}
	for rawKey := range c.Queries() {
		key := strings.TrimSpace(rawKey)
		if key == "" {
			continue
		}
		normalized := strings.ToLower(key)
		if renderCacheKnownStateQuery(normalized) {
			continue
		}
		if normalized == "format" && strings.EqualFold(strings.TrimSpace(c.Query(key)), "json") {
			return values, false
		}
		if !allowlist[normalized] {
			return values, false
		}
		queryValues := c.QueryValues(key)
		if len(queryValues) == 0 {
			queryValues = []string{c.Query(key)}
		}
		for _, value := range queryValues {
			values.Add(key, strings.TrimSpace(value))
		}
	}
	return values, true
}

func renderCacheKnownStateQuery(key string) bool {
	switch strings.ToLower(strings.TrimSpace(key)) {
	case "locale",
		"channel",
		"content_channel",
		"site_content_channel",
		"theme",
		"variant",
		"runtime_env",
		"site_runtime_env",
		strings.ToLower(admin.ContentChannelScopeQueryParam):
		return true
	default:
		return false
	}
}

func renderCacheStatusAllowed(status int, allowed []int) bool {
	return slices.Contains(allowed, status)
}

func renderCacheMethodIsHead(c router.Context) bool {
	return c != nil && strings.EqualFold(strings.TrimSpace(c.Method()), http.MethodHead)
}
