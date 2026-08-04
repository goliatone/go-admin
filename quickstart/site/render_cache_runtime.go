package site

import (
	"context"
	"net/http"
	"strings"
	"sync"
	"time"

	router "github.com/goliatone/go-router"
)

func (r *deliveryRuntime) tryRenderCacheHit(c router.Context, state RequestState) (bool, renderCacheDecision, error) {
	decision := r.renderCacheLookupDecision(c, state)
	observationReason := ""
	if !decision.Cacheable {
		observationReason = boundedRenderCacheObservationReason(decision.Reason, r.renderCache.policy)
	}
	if tracker := renderCacheRequestTrackerFromContext(c); tracker != nil {
		tracker.evaluate(decision.Cacheable, observationReason)
	}
	if !decision.Cacheable {
		r.writeRenderCacheDebugHeaders(c, renderCacheStatusBypass, decision.Reason, "")
		return false, decision, nil
	}
	response, hit, err := r.renderCache.store.Get(RequestContext(c), decision.Key)
	if err != nil {
		r.writeRenderCacheDebugHeaders(c, renderCacheStatusBypass, renderCacheReasonCacheReadError, decision.Key)
		setRenderCacheRequestFallbackReason(c, renderCacheReasonCacheReadError)
		if r.renderCache.policy.FailClosed {
			err = c.SendStatus(http.StatusServiceUnavailable)
			finishRenderCacheRequest(c, RenderCacheRequestOutcomeFailed, renderCacheReasonCacheReadError, err)
			return true, decision, err
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
		if err := r.renderCache.store.Delete(RequestContext(c), decision.Key); err != nil {
			r.writeRenderCacheDebugHeaders(c, renderCacheStatusBypass, renderCacheReasonCacheWriteError, decision.Key)
			setRenderCacheRequestFallbackReason(c, renderCacheReasonCacheWriteError)
			if r.renderCache.policy.FailClosed {
				err = c.SendStatus(http.StatusServiceUnavailable)
				finishRenderCacheRequest(c, RenderCacheRequestOutcomeFailed, renderCacheReasonCacheWriteError, err)
				return true, decision, err
			}
			decision.Cacheable = false
			decision.Reason = renderCacheReasonCacheWriteError
			return false, decision, nil
		}
		r.writeRenderCacheDebugHeaders(c, renderCacheStatusMiss, "", decision.Key)
		return false, decision, nil
	}
	if freshness == renderCacheFreshnessStale {
		r.writeRenderCacheDebugHeaders(c, renderCacheStatusStale, "", decision.Key)
		r.triggerRenderCacheStaleRevalidation(c, state, decision, response)
		provenance := cloneDeliveryProvenance(response.Provenance)
		provenance.CacheStatus = renderCacheStatusStale
		writeDeliveryProvenanceHeaders(c, provenance)
		err := replayRenderedSiteResponse(c, response)
		finishRenderCacheRequest(c, RenderCacheRequestOutcomeStale, "", err)
		return true, decision, err
	}
	r.writeRenderCacheDebugHeaders(c, renderCacheStatusHit, "", decision.Key)
	provenance := cloneDeliveryProvenance(response.Provenance)
	provenance.CacheStatus = renderCacheStatusHit
	writeDeliveryProvenanceHeaders(c, provenance)
	err = replayRenderedSiteResponse(c, response)
	finishRenderCacheRequest(c, RenderCacheRequestOutcomeHit, "", err)
	return true, decision, err
}

func (r *deliveryRuntime) writeCapturedRenderCacheResponse(c router.Context, state RequestState, decision renderCacheDecision, result renderedSiteTemplateResult, resolution *deliveryResolution) error {
	if r == nil || !decision.Cacheable || strings.TrimSpace(decision.Key) == "" {
		setRenderCacheRequestFallbackReason(c, firstNonEmpty(decision.Reason, renderCacheReasonDisabled))
		return writeRenderedTemplateWithProvenance(c, result, renderCacheStatusBypass)
	}
	policy := normalizeRenderCachePolicy(r.renderCache.policy)
	if !renderCacheStatusAllowed(result.Status, policy.CacheableStatuses) {
		r.writeRenderCacheDebugHeaders(c, renderCacheStatusBypass, renderCacheReasonStatus, decision.Key)
		setRenderCacheRequestFallbackReason(c, renderCacheReasonStatus)
		return writeRenderedTemplateWithProvenance(c, result, renderCacheStatusBypass)
	}
	response, reason, ok := newRenderedSiteResponse(result, policy, renderCacheTagsForResolution(r.siteCfg, state, decision, resolution), time.Now())
	if !ok {
		r.writeRenderCacheDebugHeaders(c, renderCacheStatusBypass, reason, decision.Key)
		setRenderCacheRequestFallbackReason(c, reason)
		return writeRenderedTemplateWithProvenance(c, result, renderCacheStatusBypass)
	}
	if err := r.renderCache.store.Set(RequestContext(c), decision.Key, response, renderCacheStoreTTL(policy)); err != nil {
		r.writeRenderCacheDebugHeaders(c, renderCacheStatusBypass, renderCacheReasonCacheWriteError, decision.Key)
		setRenderCacheRequestFallbackReason(c, renderCacheReasonCacheWriteError)
		writeDeliveryProvenanceHeaders(c, deliveryProvenanceWithCacheStatus(result.Provenance, renderCacheStatusBypass))
		if policy.FailClosed {
			err = c.SendStatus(http.StatusServiceUnavailable)
			finishRenderCacheRequest(c, RenderCacheRequestOutcomeFailed, renderCacheReasonCacheWriteError, err)
			return err
		}
		return writeRenderedTemplate(c, result.Status, result.Rendered)
	}
	if err := r.attachRenderedResponseTags(c, decision.Key, response.Tags); err != nil {
		if policy.RequireTagIndex {
			if err := r.renderCache.store.Delete(RequestContext(c), decision.Key); err != nil {
				r.writeRenderCacheDebugHeaders(c, renderCacheStatusBypass, renderCacheReasonCacheWriteError, decision.Key)
				setRenderCacheRequestFallbackReason(c, renderCacheReasonCacheWriteError)
				writeDeliveryProvenanceHeaders(c, deliveryProvenanceWithCacheStatus(result.Provenance, renderCacheStatusBypass))
				if policy.FailClosed {
					err = c.SendStatus(http.StatusServiceUnavailable)
					finishRenderCacheRequest(c, RenderCacheRequestOutcomeFailed, renderCacheReasonCacheWriteError, err)
					return err
				}
				return writeRenderedTemplate(c, result.Status, result.Rendered)
			}
			r.writeRenderCacheDebugHeaders(c, renderCacheStatusBypass, renderCacheReasonTagIndexWriteError, decision.Key)
			setRenderCacheRequestFallbackReason(c, renderCacheReasonTagIndexWriteError)
			writeDeliveryProvenanceHeaders(c, deliveryProvenanceWithCacheStatus(result.Provenance, renderCacheStatusBypass))
			if policy.FailClosed {
				err = c.SendStatus(http.StatusServiceUnavailable)
				finishRenderCacheRequest(c, RenderCacheRequestOutcomeFailed, renderCacheReasonTagIndexWriteError, err)
				return err
			}
			return writeRenderedTemplate(c, result.Status, result.Rendered)
		}
	}
	r.writeRenderCacheDebugHeaders(c, renderCacheStatusMiss, "", decision.Key)
	err := writeRenderedTemplateWithProvenance(c, result, renderCacheStatusMiss)
	finishRenderCacheRequest(c, RenderCacheRequestOutcomeStored, "", err)
	return err
}

func deliveryProvenanceWithCacheStatus(provenance DeliveryProvenance, cacheStatus string) DeliveryProvenance {
	provenance = cloneDeliveryProvenance(provenance)
	provenance.CacheStatus = strings.TrimSpace(cacheStatus)
	return provenance
}

func writeRenderedTemplateWithProvenance(c router.Context, result renderedSiteTemplateResult, cacheStatus string) error {
	writeDeliveryProvenanceHeaders(c, deliveryProvenanceWithCacheStatus(result.Provenance, cacheStatus))
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
	group := &r.revalidation
	if !group.begin(key) {
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
	go func() {
		defer group.done(key)
		defer func() {
			_ = recover()
		}()
		revalidator(ctx, request)
	}()
}

type renderCacheRevalidationGroup struct {
	mu       sync.Mutex
	inFlight map[string]struct{}
}

func (g *renderCacheRevalidationGroup) begin(key string) bool {
	key = strings.TrimSpace(key)
	if g == nil || key == "" {
		return false
	}
	g.mu.Lock()
	defer g.mu.Unlock()
	if g.inFlight == nil {
		g.inFlight = map[string]struct{}{}
	}
	if _, ok := g.inFlight[key]; ok {
		return false
	}
	g.inFlight[key] = struct{}{}
	return true
}

func (g *renderCacheRevalidationGroup) done(key string) {
	key = strings.TrimSpace(key)
	if g == nil || key == "" {
		return
	}
	g.mu.Lock()
	defer g.mu.Unlock()
	delete(g.inFlight, key)
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
	response.Provenance = cloneDeliveryProvenance(response.Provenance)
	return response
}

func (r *deliveryRuntime) attachRenderedResponseTags(c router.Context, key string, tags []string) error {
	if r == nil || len(tags) == 0 || strings.TrimSpace(key) == "" {
		return nil
	}
	if renderCacheStoreIsMemoryBackend(r.renderCache.store) {
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
