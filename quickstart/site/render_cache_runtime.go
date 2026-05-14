package site

import (
	"context"
	"net/http"
	"strings"
	"time"

	router "github.com/goliatone/go-router"
)

func (r *deliveryRuntime) tryRenderCacheHit(c router.Context, state RequestState) (bool, renderCacheDecision, error) {
	decision := r.renderCacheLookupDecision(c, state)
	if !decision.Cacheable {
		r.writeRenderCacheDebugHeaders(c, renderCacheStatusBypass, decision.Reason, "")
		return false, decision, nil
	}
	response, hit, err := r.renderCache.store.Get(RequestContext(c), decision.Key)
	if err != nil {
		r.writeRenderCacheDebugHeaders(c, renderCacheStatusBypass, renderCacheReasonCacheReadError, decision.Key)
		if r.renderCache.policy.FailClosed {
			return true, decision, c.SendStatus(http.StatusServiceUnavailable)
		}
		decision.Cacheable = false
		decision.Reason = renderCacheReasonCacheReadError
		return false, decision, nil
	}
	if !hit {
		r.writeRenderCacheDebugHeaders(c, renderCacheStatusMiss, "", decision.Key)
		return false, decision, nil
	}
	freshness := renderCacheResponseFreshness(response, time.Now())
	if freshness == renderCacheFreshnessExpired {
		_ = r.renderCache.store.Delete(RequestContext(c), decision.Key)
		r.writeRenderCacheDebugHeaders(c, renderCacheStatusMiss, "", decision.Key)
		return false, decision, nil
	}
	if freshness == renderCacheFreshnessStale {
		r.writeRenderCacheDebugHeaders(c, renderCacheStatusStale, "", decision.Key)
		r.triggerRenderCacheStaleRevalidation(c, state, decision, response)
		return true, decision, replayRenderedSiteResponse(c, response)
	}
	r.writeRenderCacheDebugHeaders(c, renderCacheStatusHit, "", decision.Key)
	return true, decision, replayRenderedSiteResponse(c, response)
}

func (r *deliveryRuntime) writeCapturedRenderCacheResponse(c router.Context, state RequestState, decision renderCacheDecision, result renderedSiteTemplateResult, resolution *deliveryResolution) error {
	if r == nil || !decision.Cacheable || strings.TrimSpace(decision.Key) == "" {
		return writeRenderedTemplate(c, result.Status, result.Rendered)
	}
	policy := normalizeRenderCachePolicy(r.renderCache.policy)
	if !renderCacheStatusAllowed(result.Status, policy.CacheableStatuses) {
		r.writeRenderCacheDebugHeaders(c, renderCacheStatusBypass, renderCacheReasonStatus, decision.Key)
		return writeRenderedTemplate(c, result.Status, result.Rendered)
	}
	response, reason, ok := newRenderedSiteResponse(result, policy, renderCacheTagsForResolution(r.siteCfg, state, decision, resolution), time.Now())
	if !ok {
		r.writeRenderCacheDebugHeaders(c, renderCacheStatusBypass, reason, decision.Key)
		return writeRenderedTemplate(c, result.Status, result.Rendered)
	}
	if err := r.renderCache.store.Set(RequestContext(c), decision.Key, response, renderCacheStoreTTL(policy)); err != nil {
		r.writeRenderCacheDebugHeaders(c, renderCacheStatusBypass, renderCacheReasonCacheWriteError, decision.Key)
		if policy.FailClosed {
			return c.SendStatus(http.StatusServiceUnavailable)
		}
		return writeRenderedTemplate(c, result.Status, result.Rendered)
	}
	if err := r.attachRenderedResponseTags(c, decision.Key, response.Tags); err != nil {
		if policy.RequireTagIndex {
			_ = r.renderCache.store.Delete(RequestContext(c), decision.Key)
			r.writeRenderCacheDebugHeaders(c, renderCacheStatusBypass, renderCacheReasonTagIndexWriteError, decision.Key)
			if policy.FailClosed {
				return c.SendStatus(http.StatusServiceUnavailable)
			}
			return writeRenderedTemplate(c, result.Status, result.Rendered)
		}
	}
	r.writeRenderCacheDebugHeaders(c, renderCacheStatusMiss, "", decision.Key)
	return writeRenderedTemplate(c, result.Status, result.Rendered)
}

type renderCacheFreshness int

const (
	renderCacheFreshnessFresh renderCacheFreshness = iota
	renderCacheFreshnessStale
	renderCacheFreshnessExpired
)

func renderCacheStoreTTL(policy RenderCachePolicy) time.Duration {
	policy = normalizeRenderCachePolicy(policy)
	ttl := policy.FreshTTL
	if policy.StaleTTL > 0 {
		ttl += policy.StaleTTL
	}
	return ttl
}

func renderCacheResponseFreshness(response RenderedSiteResponse, now time.Time) renderCacheFreshness {
	if now.IsZero() {
		now = time.Now()
	}
	if response.FreshUntil.IsZero() || now.Before(response.FreshUntil) || now.Equal(response.FreshUntil) {
		return renderCacheFreshnessFresh
	}
	if response.StaleUntil.IsZero() || now.After(response.StaleUntil) {
		return renderCacheFreshnessExpired
	}
	return renderCacheFreshnessStale
}

func (r *deliveryRuntime) triggerRenderCacheStaleRevalidation(c router.Context, state RequestState, decision renderCacheDecision, response RenderedSiteResponse) {
	if r == nil || r.renderCache.policy.StaleRevalidator == nil {
		return
	}
	key := strings.TrimSpace(decision.Key)
	if key == "" {
		return
	}
	request := RenderCacheRevalidationRequest{
		Key:         key,
		RequestPath: strings.TrimSpace(decision.RequestPath),
		State:       cloneRenderCacheRevalidationState(state),
		Response:    cloneRenderedSiteResponse(response),
	}
	ctx := context.Background()
	if c != nil {
		ctx = context.WithoutCancel(RequestContext(c))
	}
	revalidator := r.renderCache.policy.StaleRevalidator
	go revalidator(ctx, request)
}

func cloneRenderCacheRevalidationState(state RequestState) RequestState {
	state.SupportedLocales = cloneStrings(state.SupportedLocales)
	state.Theme = cloneThemePayload(state.Theme)
	state.SiteTheme = cloneSiteThemeContract(state.SiteTheme)
	state.ViewContext = cloneViewContext(state.ViewContext)
	return state
}

func cloneRenderedSiteResponse(response RenderedSiteResponse) RenderedSiteResponse {
	response.Headers = cloneRenderCacheHeaderMap(response.Headers)
	response.Body = append([]byte{}, response.Body...)
	response.Tags = cloneStrings(response.Tags)
	return response
}

func (r *deliveryRuntime) attachRenderedResponseTags(c router.Context, key string, tags []string) error {
	if r == nil || len(tags) == 0 || strings.TrimSpace(key) == "" {
		return nil
	}
	if renderCacheStoreBackendKind(r.renderCache.store) == "memory" {
		return nil
	}
	invalidator, ok := r.renderCache.store.(RenderCacheTagInvalidator)
	if !ok {
		return nil
	}
	if err := invalidator.AddTagsForKey(RequestContext(c), key, cloneStrings(tags)); err != nil {
		return err
	}
	return nil
}

func (r *deliveryRuntime) writeRenderCacheDebugHeaders(c router.Context, status, reason, key string) {
	if r == nil || c == nil || !r.renderCache.policy.DebugHeaders {
		return
	}
	if strings.TrimSpace(status) != "" {
		c.SetHeader("X-Site-Render-Cache", strings.TrimSpace(status))
	}
	if strings.TrimSpace(reason) != "" {
		c.SetHeader("X-Site-Render-Cache-Reason", strings.TrimSpace(reason))
	}
	if r.renderCache.policy.DebugKeys && strings.TrimSpace(key) != "" {
		c.SetHeader("X-Site-Render-Cache-Key", strings.TrimSpace(key))
	}
}
