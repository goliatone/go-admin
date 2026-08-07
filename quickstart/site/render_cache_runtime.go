package site

import (
	"context"
	"errors"
	"net/http"
	"strings"
	"sync"
	"time"

	router "github.com/goliatone/go-router"
)

var errRenderCacheRenewalUnsupported = errors.New("site render cache store does not support conditional renewal")

func (r *deliveryRuntime) tryRenderCacheHit(c router.Context, state RequestState) (bool, renderCacheDecision, error) {
	decision := r.renderCacheLookupDecision(c, state)
	fatalConfig := !decision.Cacheable && r.renderCache.policy.FailClosed && renderCacheFailClosedPreflightReason(decision.Reason)
	observationReason := ""
	if !decision.Cacheable {
		observationReason = boundedRenderCacheObservationReason(decision.Reason, r.renderCache.policy)
	}
	if tracker := renderCacheRequestTrackerFromContext(c); tracker != nil {
		tracker.evaluate(decision.Cacheable || fatalConfig, observationReason)
	}
	if fatalConfig {
		r.writeRenderCacheDebugHeaders(c, renderCacheStatusBypass, decision.Reason, "")
		sendErr := c.SendStatus(http.StatusServiceUnavailable)
		finishRenderCacheRequest(c, RenderCacheRequestOutcomeFailed, decision.Reason, firstNonNilError(decision.Cause, sendErr))
		return true, decision, sendErr
	}
	if !decision.Cacheable {
		r.writeRenderCacheDebugHeaders(c, renderCacheStatusBypass, decision.Reason, "")
		return false, decision, nil
	}
	response, hit, lookupErr := r.renderCache.store.Get(RequestContext(c), decision.Key)
	if lookupErr != nil {
		return r.handleRenderCacheLookupFailure(c, decision, renderCacheReasonCacheReadError)
	}
	if !hit {
		r.writeRenderCacheDebugHeaders(c, renderCacheStatusMiss, "", decision.Key)
		return false, decision, nil
	}

	switch renderCacheResponseFreshness(response, time.Now()) {
	case renderCacheFreshnessExpired:
		deleteErr := r.renderCache.store.Delete(RequestContext(c), decision.Key)
		if deleteErr != nil {
			return r.handleRenderCacheLookupFailure(c, decision, renderCacheReasonCacheWriteError)
		}
		r.writeRenderCacheDebugHeaders(c, renderCacheStatusMiss, "", decision.Key)
		return false, decision, nil
	case renderCacheFreshnessStale:
		r.writeRenderCacheDebugHeaders(c, renderCacheStatusStale, "", decision.Key)
		r.triggerRenderCacheStaleRevalidation(c, state, decision, response)
		replayErr := replayRenderCacheResponse(c, response, renderCacheStatusStale, RenderCacheRequestOutcomeStale)
		return true, decision, replayErr
	default:
		if r.renderCache.policy.ExpirationMode == RenderCacheExpirationSliding {
			_, renewalErr := renewRenderedSiteResponse(RequestContext(c), r.renderCache.store, decision.Key, response, r.renderCache.policy, time.Now())
			if renewalErr != nil {
				return r.handleRenderCacheRenewalFailure(c, decision, response, renewalErr)
			}
		}
		r.writeRenderCacheDebugHeaders(c, renderCacheStatusHit, "", decision.Key)
		replayErr := replayRenderCacheResponse(c, response, renderCacheStatusHit, RenderCacheRequestOutcomeHit)
		return true, decision, replayErr
	}
}

func renderCacheFailClosedPreflightReason(reason string) bool {
	switch strings.TrimSpace(reason) {
	case renderCacheReasonExpirationMode,
		renderCacheReasonRenewalUnsupported,
		renderCacheReasonFenceUnavailable,
		renderCacheReasonFenceReadError:
		return true
	default:
		return false
	}
}

func (r *deliveryRuntime) handleRenderCacheRenewalFailure(c router.Context, decision renderCacheDecision, response RenderedSiteResponse, cause error) (bool, renderCacheDecision, error) {
	reason := renderCacheReasonRenewalError
	if errors.Is(cause, errRenderCacheRenewalUnsupported) {
		reason = renderCacheReasonRenewalUnsupported
	}
	r.writeRenderCacheDebugHeaders(c, renderCacheStatusHit, reason, decision.Key)
	setRenderCacheRequestFallbackReason(c, reason)
	if r.renderCache.policy.FailClosed {
		sendErr := c.SendStatus(http.StatusServiceUnavailable)
		finishRenderCacheRequest(c, RenderCacheRequestOutcomeFailed, reason, firstNonNilError(cause, sendErr))
		return true, decision, sendErr
	}
	replayErr := replayRenderCacheResponse(c, response, renderCacheStatusHit, RenderCacheRequestOutcomeHit)
	return true, decision, replayErr
}

func (r *deliveryRuntime) handleRenderCacheLookupFailure(c router.Context, decision renderCacheDecision, reason string) (bool, renderCacheDecision, error) {
	r.writeRenderCacheDebugHeaders(c, renderCacheStatusBypass, reason, decision.Key)
	setRenderCacheRequestFallbackReason(c, reason)
	if r.renderCache.policy.FailClosed {
		sendErr := c.SendStatus(http.StatusServiceUnavailable)
		finishRenderCacheRequest(c, RenderCacheRequestOutcomeFailed, reason, sendErr)
		return true, decision, sendErr
	}
	decision.Cacheable = false
	decision.Reason = reason
	return false, decision, nil
}

func replayRenderCacheResponse(c router.Context, response RenderedSiteResponse, status string, outcome RenderCacheRequestOutcome) error {
	provenance := cloneDeliveryProvenance(response.Provenance)
	provenance.CacheStatus = status
	writeDeliveryProvenanceHeaders(c, provenance)
	replayErr := replayRenderedSiteResponse(c, response)
	finishRenderCacheRequest(c, outcome, "", replayErr)
	return replayErr
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
	if len(decision.Generations) > 0 {
		current, fenceErr := r.readSharedRenderCacheGenerations(c)
		if fenceErr != nil {
			return r.handleRenderCacheStorageFailure(c, decision.Key, result, policy, renderCacheReasonFenceReadError)
		}
		if !renderCacheGenerationSnapshotsEqual(current, decision.Generations) {
			r.writeRenderCacheDebugHeaders(c, renderCacheStatusBypass, renderCacheReasonFenceChanged, decision.Key)
			setRenderCacheRequestFallbackReason(c, renderCacheReasonFenceChanged)
			writeErr := writeRenderedTemplateWithProvenance(c, result, renderCacheStatusBypass)
			finishRenderCacheRequest(c, RenderCacheRequestOutcomeRenderedUncached, renderCacheReasonFenceChanged, writeErr)
			return writeErr
		}
	}
	setErr := r.renderCache.store.Set(RequestContext(c), decision.Key, response, renderCacheStoreTTL(policy))
	if setErr != nil {
		r.writeRenderCacheDebugHeaders(c, renderCacheStatusBypass, renderCacheReasonCacheWriteError, decision.Key)
		setRenderCacheRequestFallbackReason(c, renderCacheReasonCacheWriteError)
		writeDeliveryProvenanceHeaders(c, deliveryProvenanceWithCacheStatus(result.Provenance, renderCacheStatusBypass))
		if policy.FailClosed {
			sendErr := c.SendStatus(http.StatusServiceUnavailable)
			finishRenderCacheRequest(c, RenderCacheRequestOutcomeFailed, renderCacheReasonCacheWriteError, sendErr)
			return sendErr
		}
		return writeRenderedTemplate(c, result.Status, result.Rendered)
	}
	tagErr := r.attachRenderedResponseTags(c, decision.Key, response.Tags)
	if tagErr != nil && policy.RequireTagIndex {
		return r.handleRequiredRenderCacheTagFailure(c, decision.Key, result, policy)
	}
	r.writeRenderCacheDebugHeaders(c, renderCacheStatusMiss, "", decision.Key)
	writeErr := writeRenderedTemplateWithProvenance(c, result, renderCacheStatusMiss)
	finishRenderCacheRequest(c, RenderCacheRequestOutcomeStored, "", writeErr)
	return writeErr
}

func (r *deliveryRuntime) readSharedRenderCacheGenerations(c router.Context) (renderCacheGenerationSnapshot, error) {
	if r == nil || r.renderCache.generations == nil {
		return nil, ErrRenderCacheGenerationUnavailable
	}
	return readRenderCacheGenerationSnapshot(RequestContext(c), &RenderCacheRuntime{Generations: r.renderCache.generations}, []string{RenderCacheSharedFenceScope})
}

func (r *deliveryRuntime) handleRequiredRenderCacheTagFailure(c router.Context, key string, result renderedSiteTemplateResult, policy RenderCachePolicy) error {
	deleteErr := r.renderCache.store.Delete(RequestContext(c), key)
	if deleteErr != nil {
		return r.handleRenderCacheStorageFailure(c, key, result, policy, renderCacheReasonCacheWriteError)
	}
	return r.handleRenderCacheStorageFailure(c, key, result, policy, renderCacheReasonTagIndexWriteError)
}

func (r *deliveryRuntime) handleRenderCacheStorageFailure(c router.Context, key string, result renderedSiteTemplateResult, policy RenderCachePolicy, reason string) error {
	r.writeRenderCacheDebugHeaders(c, renderCacheStatusBypass, reason, key)
	setRenderCacheRequestFallbackReason(c, reason)
	writeDeliveryProvenanceHeaders(c, deliveryProvenanceWithCacheStatus(result.Provenance, renderCacheStatusBypass))
	if policy.FailClosed {
		sendErr := c.SendStatus(http.StatusServiceUnavailable)
		finishRenderCacheRequest(c, RenderCacheRequestOutcomeFailed, reason, sendErr)
		return sendErr
	}
	return writeRenderedTemplate(c, result.Status, result.Rendered)
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

func renewRenderedSiteResponse(ctx context.Context, store RenderCacheStore, key string, response RenderedSiteResponse, policy RenderCachePolicy, now time.Time) (bool, error) {
	policy = normalizeRenderCachePolicy(policy)
	if policy.ExpirationMode != RenderCacheExpirationSliding {
		return false, nil
	}
	updater, ok := store.(RenderCacheSetIfPresentStore)
	if !ok || updater == nil {
		return false, errRenderCacheRenewalUnsupported
	}
	if now.IsZero() {
		now = time.Now()
	}
	renewed := cloneRenderedSiteResponse(response)
	renewed.FreshUntil = now.Add(policy.FreshTTL)
	renewed.StaleUntil = renewed.FreshUntil
	if policy.StaleTTL > 0 {
		renewed.StaleUntil = renewed.FreshUntil.Add(policy.StaleTTL)
	}
	return updater.SetIfPresent(ctx, key, renewed, renderCacheStoreTTL(policy))
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
			_ = recover() //nolint:errcheck // Revalidator panics must not escape this goroutine.
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
