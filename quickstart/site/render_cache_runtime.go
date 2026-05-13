package site

import (
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
	r.writeRenderCacheDebugHeaders(c, renderCacheStatusHit, "", decision.Key)
	return true, decision, replayRenderedSiteResponse(c, response)
}

func (r *deliveryRuntime) storeRenderedResponse(c router.Context, state RequestState, decision renderCacheDecision, result renderedSiteTemplateResult, resolution *deliveryResolution) {
	if r == nil || !decision.Cacheable || strings.TrimSpace(decision.Key) == "" {
		return
	}
	policy := normalizeRenderCachePolicy(r.renderCache.policy)
	if !renderCacheStatusAllowed(result.Status, policy.CacheableStatuses) {
		r.writeRenderCacheDebugHeaders(c, renderCacheStatusBypass, renderCacheReasonStatus, decision.Key)
		return
	}
	response, reason, ok := newRenderedSiteResponse(result, policy, renderCacheTagsForResolution(r.siteCfg, state, decision, resolution), time.Now())
	if !ok {
		r.writeRenderCacheDebugHeaders(c, renderCacheStatusBypass, reason, decision.Key)
		return
	}
	if err := r.renderCache.store.Set(RequestContext(c), decision.Key, response, policy.FreshTTL); err != nil {
		r.writeRenderCacheDebugHeaders(c, renderCacheStatusBypass, renderCacheReasonCacheWriteError, decision.Key)
		return
	}
	r.attachRenderedResponseTags(c, decision.Key, response.Tags)
	r.writeRenderCacheDebugHeaders(c, renderCacheStatusMiss, "", decision.Key)
}

func (r *deliveryRuntime) attachRenderedResponseTags(c router.Context, key string, tags []string) {
	if r == nil || len(tags) == 0 || strings.TrimSpace(key) == "" {
		return
	}
	invalidator, ok := r.renderCache.store.(RenderCacheTagInvalidator)
	if !ok {
		return
	}
	_ = invalidator.AddTagsForKey(RequestContext(c), key, cloneStrings(tags))
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
