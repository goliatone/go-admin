package site

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/goliatone/go-admin/internal/primitives"
	router "github.com/goliatone/go-router"
)

const (
	maxRenderCacheHandlerSurfaceBytes   = 64
	maxRenderCacheHandlerCanonicalBytes = 16 * 1024
	maxRenderCacheConcurrentFillKeys    = 1024
)

const renderCacheHandlerTagsLocalsKey contextKey = "quickstart.site.render_cache_handler_tags"

// RenderCacheHandlerDecision is the host-owned, pre-handler cache decision.
// CanonicalPath and CanonicalQuery are hashed before entering the backend key.
type RenderCacheHandlerDecision struct {
	Cacheable        bool
	Reason           string
	Surface          string
	CanonicalPath    string
	CanonicalQuery   string
	FreshTTLOverride time.Duration
	DisableStale     bool
	// FenceScopes participates in the representation identity and is re-read
	// before a captured miss is stored. FenceScope remains the compatible
	// single-scope alias and is merged into this bounded set.
	FenceScopes  []string
	FenceScope   string
	RequireFence bool
	// AllowProcessLocalFence is intended only for explicit single-process
	// development and tests. Production hosts should leave it false.
	AllowProcessLocalFence bool
	State                  RequestState
}

// RenderCacheHandlerOptions configures arbitrary public HTML handler caching.
// Decide must be cheap and deterministic. ResolveTags runs only after a safe
// GET miss has executed and may inspect request locals populated by the handler.
type RenderCacheHandlerOptions struct {
	Decide             func(router.Context) (RenderCacheHandlerDecision, error)
	ResolveTags        func(router.Context) ([]string, error)
	ObservationSurface func(router.Context) string
}

type renderCacheHandlerExecutor struct {
	runtime      *RenderCacheRuntime
	handler      router.HandlerFunc
	options      RenderCacheHandlerOptions
	revalidation renderCacheRevalidationGroup
	fills        renderCacheFillGroup
}

// SetRenderCacheHandlerTags publishes bounded response dependencies from a
// wrapped miss handler. Repeated calls merge and deduplicate tags.
func SetRenderCacheHandlerTags(c router.Context, tags ...string) {
	if c == nil {
		return
	}
	existing := renderCacheHandlerLocalTags(c)
	merged := primitives.NormalizeUniqueStringSliceEmpty(append(existing, tags...))
	c.Locals(renderCacheHandlerTagsLocalsKey, merged)
}

// RenderCacheHandlerTags returns a copy of tags published by a wrapped handler.
func RenderCacheHandlerTags(c router.Context) []string {
	tags := renderCacheHandlerLocalTags(c)
	return append([]string(nil), tags...)
}

func renderCacheHandlerLocalTags(c router.Context) []string {
	if c == nil {
		return nil
	}
	tags, ok := c.Locals(renderCacheHandlerTagsLocalsKey).([]string)
	if !ok {
		return nil
	}
	return tags
}

// WrapRenderCacheHandler applies the shared public HTML render-cache lifecycle
// to an arbitrary router handler. Hits skip handler execution. GET and HEAD use
// one representation key; HEAD misses execute once and never populate storage.
func WrapRenderCacheHandler(runtime *RenderCacheRuntime, handler router.HandlerFunc, options RenderCacheHandlerOptions) router.HandlerFunc {
	if handler == nil {
		return nil
	}
	executor := &renderCacheHandlerExecutor{
		runtime: runtime,
		handler: handler,
		options: options,
	}
	return executor.handle
}

func (e *renderCacheHandlerExecutor) handle(c router.Context) (returnErr error) {
	policy, store, observers := renderCacheHandlerRuntimeConfig(e.runtime)
	tracker := installRenderCacheRequestTracker(c, observers)
	if tracker != nil && e.options.ObservationSurface != nil {
		tracker.setSurface(e.options.ObservationSurface(c))
	}
	defer func() {
		if tracker != nil {
			tracker.complete(returnErr)
		}
	}()

	returnErr = e.execute(c, tracker, policy, store)
	return returnErr
}

func renderCacheHandlerRuntimeConfig(runtime *RenderCacheRuntime) (RenderCachePolicy, RenderCacheStore, []RenderCacheRequestObserver) {
	if runtime == nil {
		return RenderCachePolicy{}, nil, nil
	}
	observers := composeRenderCacheRequestObservers(runtime.RequestObservers)
	if runtime.Observer != nil {
		observers = composeRenderCacheRequestObservers(observers, []RenderCacheRequestObserver{runtime.Observer})
	}
	return normalizeRenderCachePolicy(runtime.Policy), runtime.Store, observers
}

func (e *renderCacheHandlerExecutor) execute(c router.Context, tracker *renderCacheRequestTracker, policy RenderCachePolicy, store RenderCacheStore) error {
	decision, generations, key, handled, prepareErr := e.prepare(c, tracker, policy, store)
	if handled {
		return prepareErr
	}
	return e.lookup(c, tracker, policy, store, decision, generations, key)
}

func (e *renderCacheHandlerExecutor) prepare(c router.Context, tracker *renderCacheRequestTracker, policy RenderCachePolicy, store RenderCacheStore) (RenderCacheHandlerDecision, renderCacheGenerationSnapshot, string, bool, error) {
	if configDecision := renderCacheConfigDecision(renderCacheConfig{store: store, policy: policy}, policy); !configDecision.Cacheable {
		if policy.FailClosed && renderCacheFailClosedPreflightReason(configDecision.Reason) {
			return RenderCacheHandlerDecision{}, nil, "", true, renderCacheHandlerPreExecutionFailure(c, e.handler, tracker, policy, configDecision.Reason, errors.New(configDecision.Reason))
		}
		return RenderCacheHandlerDecision{}, nil, "", true, renderCacheHandlerBypass(c, e.handler, tracker, policy, configDecision.Reason)
	}
	if requestDecision := renderCacheRequestDecision(c, policy); !requestDecision.Cacheable {
		return RenderCacheHandlerDecision{}, nil, "", true, renderCacheHandlerBypass(c, e.handler, tracker, policy, requestDecision.Reason)
	}
	if renderCacheHandlerPreviewTokenPresent(c) {
		return RenderCacheHandlerDecision{}, nil, "", true, renderCacheHandlerBypass(c, e.handler, tracker, policy, renderCacheReasonPreview)
	}
	if e.options.Decide == nil {
		return RenderCacheHandlerDecision{}, nil, "", true, renderCacheHandlerBypass(c, e.handler, tracker, policy, renderCacheReasonHandlerDecision)
	}

	decision, decisionErr := e.options.Decide(c)
	if decisionErr != nil {
		return RenderCacheHandlerDecision{}, nil, "", true, renderCacheHandlerPreExecutionFailure(c, e.handler, tracker, policy, renderCacheReasonHandlerDecisionError, decisionErr)
	}
	if tracker != nil && strings.TrimSpace(decision.Surface) != "" {
		tracker.setSurface(decision.Surface)
	}
	if !decision.Cacheable {
		reason := renderCacheHandlerDecisionReason(decision, policy)
		return RenderCacheHandlerDecision{}, nil, "", true, renderCacheHandlerBypass(c, e.handler, tracker, policy, reason)
	}
	if stateDecision := renderCacheStateDecision(c, decision.State, policy); !stateDecision.Cacheable {
		return RenderCacheHandlerDecision{}, nil, "", true, renderCacheHandlerBypass(c, e.handler, tracker, policy, stateDecision.Reason)
	}
	if validationErr := validateRenderCacheHandlerDecision(decision); validationErr != nil {
		return RenderCacheHandlerDecision{}, nil, "", true, renderCacheHandlerPreExecutionFailure(c, e.handler, tracker, policy, renderCacheReasonHandlerDecisionError, validationErr)
	}

	generations, fenceErr := e.readRequiredGenerations(c, decision)
	if fenceErr != nil {
		reason := renderCacheReasonFenceReadError
		if errors.Is(fenceErr, ErrRenderCacheGenerationUnavailable) {
			reason = renderCacheReasonFenceUnavailable
		}
		return RenderCacheHandlerDecision{}, nil, "", true, renderCacheHandlerPreExecutionFailure(c, e.handler, tracker, policy, reason, fenceErr)
	}
	return decision, generations, buildRenderCacheHandlerKey(policy, decision, generations), false, nil
}

func renderCacheHandlerDecisionReason(decision RenderCacheHandlerDecision, policy RenderCachePolicy) string {
	reason := boundedRenderCacheObservationReason(decision.Reason, policy)
	if reason == "" || reason == renderCacheReasonHostBypass {
		return renderCacheReasonHandlerDecision
	}
	return reason
}

func (e *renderCacheHandlerExecutor) readRequiredGenerations(c router.Context, decision RenderCacheHandlerDecision) (renderCacheGenerationSnapshot, error) {
	if !decision.RequireFence {
		return nil, nil
	}
	if e.runtime == nil || e.runtime.Generations == nil {
		return nil, ErrRenderCacheGenerationUnavailable
	}
	if !e.runtime.Generations.Shared() {
		runtimeAllowsProcessLocal := e.runtime.Config.AllowProcessLocalFence &&
			strings.EqualFold(strings.TrimSpace(e.runtime.Config.Backend), RenderCacheBackendMemory)
		if !decision.AllowProcessLocalFence || !runtimeAllowsProcessLocal {
			return nil, ErrRenderCacheGenerationUnavailable
		}
	}
	return readRenderCacheGenerationSnapshot(RequestContext(c), e.runtime, renderCacheHandlerFenceScopes(decision))
}

func (e *renderCacheHandlerExecutor) lookup(c router.Context, tracker *renderCacheRequestTracker, policy RenderCachePolicy, store RenderCacheStore, decision RenderCacheHandlerDecision, generations renderCacheGenerationSnapshot, key string) error {
	tracker.evaluate(true, "")
	response, hit, getErr := store.Get(RequestContext(c), key)
	if getErr != nil {
		return renderCacheHandlerPreExecutionFailure(c, e.handler, tracker, policy, renderCacheReasonCacheReadError, getErr)
	}
	if hit {
		handled, hitErr := e.handleHit(c, tracker, policy, store, decision, key, response)
		if handled {
			return hitErr
		}
	}
	return e.executeMiss(c, tracker, policy, store, decision, generations, key)
}

func (e *renderCacheHandlerExecutor) handleHit(c router.Context, tracker *renderCacheRequestTracker, policy RenderCachePolicy, store RenderCacheStore, decision RenderCacheHandlerDecision, key string, response RenderedSiteResponse) (bool, error) {
	switch renderCacheResponseFreshness(response, time.Now()) {
	case renderCacheFreshnessFresh:
		effectivePolicy := renderCacheHandlerPolicy(policy, decision)
		if effectivePolicy.ExpirationMode == RenderCacheExpirationSliding {
			_, renewalErr := renewRenderedSiteResponse(RequestContext(c), store, key, response, effectivePolicy, time.Now())
			if renewalErr != nil {
				return true, renderCacheHandlerRenewalFailure(c, tracker, effectivePolicy, key, response, renewalErr)
			}
		}
		writeRenderCacheHandlerDebugHeaders(c, policy, renderCacheStatusHit, "", key)
		return true, replayRenderCacheResponse(c, response, renderCacheStatusHit, RenderCacheRequestOutcomeHit)
	case renderCacheFreshnessStale:
		if !decision.DisableStale {
			writeRenderCacheHandlerDebugHeaders(c, policy, renderCacheStatusStale, "", key)
			triggerRenderCacheHandlerStaleRevalidation(c, policy, &e.revalidation, key, decision, response)
			return true, replayRenderCacheResponse(c, response, renderCacheStatusStale, RenderCacheRequestOutcomeStale)
		}
	}
	deleteErr := store.Delete(RequestContext(c), key)
	if deleteErr != nil {
		return true, renderCacheHandlerPreExecutionFailure(c, e.handler, tracker, policy, renderCacheReasonCacheWriteError, deleteErr)
	}
	return false, nil
}

func renderCacheHandlerRenewalFailure(c router.Context, tracker *renderCacheRequestTracker, policy RenderCachePolicy, key string, response RenderedSiteResponse, cause error) error {
	reason := renderCacheReasonRenewalError
	if errors.Is(cause, errRenderCacheRenewalUnsupported) {
		reason = renderCacheReasonRenewalUnsupported
	}
	writeRenderCacheHandlerDebugHeaders(c, policy, renderCacheStatusHit, reason, key)
	setRenderCacheRequestFallbackReason(c, reason)
	if policy.FailClosed {
		if c == nil {
			finishRenderCacheRequest(c, RenderCacheRequestOutcomeFailed, reason, cause)
			return cause
		}
		sendErr := c.SendStatus(http.StatusServiceUnavailable)
		finishRenderCacheRequest(c, RenderCacheRequestOutcomeFailed, reason, firstNonNilError(cause, sendErr))
		return sendErr
	}
	return replayRenderCacheResponse(c, response, renderCacheStatusHit, RenderCacheRequestOutcomeHit)
}

func (e *renderCacheHandlerExecutor) executeMiss(c router.Context, tracker *renderCacheRequestTracker, policy RenderCachePolicy, store RenderCacheStore, decision RenderCacheHandlerDecision, generations renderCacheGenerationSnapshot, key string) error {
	writeRenderCacheHandlerDebugHeaders(c, policy, renderCacheStatusMiss, "", key)
	if renderCacheMethodIsHead(c) {
		return renderCacheHandlerHeadMiss(c, e.handler, policy)
	}
	leader, fillDone := e.fills.begin(key)
	if !leader {
		select {
		case <-fillDone:
			// Re-run the decision and lookup so a fence change while waiting
			// derives the new representation key before another fill begins.
			return e.execute(c, tracker, policy, store)
		case <-RequestContext(c).Done():
			return RequestContext(c).Err()
		}
	}
	defer e.fills.done(key, fillDone)
	return e.executeMissLeader(c, tracker, policy, store, decision, generations, key)
}

func (e *renderCacheHandlerExecutor) executeMissLeader(c router.Context, tracker *renderCacheRequestTracker, policy RenderCachePolicy, store RenderCacheStore, decision RenderCacheHandlerDecision, generations renderCacheGenerationSnapshot, key string) error {

	captured, captureErr := router.CaptureResponse(c, policy.MaxCaptureBodySize, e.handler)
	if captureErr != nil {
		setRenderCacheRequestFallbackReason(c, renderCacheCaptureFailureReason(captureErr))
		return captureErr
	}
	if captured == nil {
		return fmt.Errorf("render cache handler returned no captured response")
	}
	result := renderedSiteTemplateResult{
		Status:   captured.StatusCode,
		Rendered: renderedTemplateFromCapturedResponse(captured),
	}
	if !renderCacheStatusAllowed(result.Status, policy.CacheableStatuses) {
		return replayUncachedRenderCacheHandlerResponse(c, captured, policy, key, renderCacheReasonStatus)
	}
	policy = renderCacheHandlerPolicy(policy, decision)
	tags, tagErr := e.resolveTags(c)
	if tagErr != nil {
		return renderCacheHandlerPostExecutionFailure(c, captured, tracker, policy, key, renderCacheReasonTagResolutionError, tagErr)
	}
	cached, reason, cacheable := newRenderedSiteResponse(result, policy, tags, time.Now())
	if !cacheable {
		return replayUncachedRenderCacheHandlerResponse(c, captured, policy, key, reason)
	}

	currentGenerations, fenceErr := e.readRequiredGenerations(c, decision)
	if fenceErr != nil {
		return renderCacheHandlerPostExecutionFailure(c, captured, tracker, policy, key, renderCacheReasonFenceReadError, fenceErr)
	}
	if !renderCacheGenerationSnapshotsEqual(currentGenerations, generations) {
		return replayUncachedRenderCacheHandlerResponse(c, captured, policy, key, renderCacheReasonFenceChanged)
	}
	if setErr := store.Set(RequestContext(c), key, cached, renderCacheStoreTTL(policy)); setErr != nil {
		return renderCacheHandlerPostExecutionFailure(c, captured, tracker, policy, key, renderCacheReasonCacheWriteError, setErr)
	}
	attachErr := attachRenderCacheHandlerTags(c, store, key, cached.Tags)
	if attachErr != nil && policy.RequireTagIndex {
		cleanupErr := quarantineRenderCacheHandlerEntry(c, store, key, cached, attachErr)
		return renderCacheHandlerPostExecutionFailure(c, captured, tracker, policy, key, renderCacheReasonTagIndexWriteError, cleanupErr)
	}
	writeRenderCacheHandlerDebugHeaders(c, policy, renderCacheStatusMiss, "", key)
	replayErr := router.ReplayCapturedResponse(c, captured)
	finishRenderCacheRequest(c, RenderCacheRequestOutcomeStored, "", replayErr)
	return replayErr
}

type renderCacheFillGroup struct {
	mu       sync.Mutex
	inFlight map[string]chan struct{}
}

func (g *renderCacheFillGroup) begin(key string) (bool, <-chan struct{}) {
	key = strings.TrimSpace(key)
	if g == nil || key == "" {
		return true, nil
	}
	g.mu.Lock()
	defer g.mu.Unlock()
	if g.inFlight == nil {
		g.inFlight = map[string]chan struct{}{}
	}
	if done, ok := g.inFlight[key]; ok {
		return false, done
	}
	if len(g.inFlight) >= maxRenderCacheConcurrentFillKeys {
		return true, nil
	}
	done := make(chan struct{})
	g.inFlight[key] = done
	return true, done
}

func (g *renderCacheFillGroup) done(key string, owned <-chan struct{}) {
	key = strings.TrimSpace(key)
	if g == nil || key == "" || owned == nil {
		return
	}
	g.mu.Lock()
	done, ok := g.inFlight[key]
	if ok && done == owned {
		delete(g.inFlight, key)
		close(done)
	}
	g.mu.Unlock()
}

func renderCacheHandlerHeadMiss(c router.Context, handler router.HandlerFunc, policy RenderCachePolicy) error {
	setRenderCacheRequestFallbackReason(c, renderCacheReasonHeadMiss)
	captured, captureErr := router.CaptureResponse(c, policy.MaxCaptureBodySize, handler)
	if captureErr != nil {
		return captureErr
	}
	if captured == nil {
		return fmt.Errorf("render cache HEAD handler returned no captured response")
	}
	captured.Body = nil
	replayErr := router.ReplayCapturedResponse(c, captured)
	finishRenderCacheRequest(c, RenderCacheRequestOutcomeRenderedUncached, renderCacheReasonHeadMiss, replayErr)
	return replayErr
}

func renderCacheHandlerPolicy(policy RenderCachePolicy, decision RenderCacheHandlerDecision) RenderCachePolicy {
	if decision.FreshTTLOverride > 0 {
		policy.FreshTTL = decision.FreshTTLOverride
	}
	if decision.DisableStale {
		policy.StaleTTL = 0
	}
	return policy
}

func (e *renderCacheHandlerExecutor) resolveTags(c router.Context) ([]string, error) {
	tags := RenderCacheHandlerTags(c)
	if e.options.ResolveTags != nil {
		resolved, resolveErr := e.options.ResolveTags(c)
		if resolveErr != nil {
			return nil, resolveErr
		}
		tags = resolved
	}
	tags = append([]string{RenderCacheAllSiteTag}, tags...)
	return primitives.NormalizeUniqueStringSliceEmpty(tags), nil
}

func triggerRenderCacheHandlerStaleRevalidation(c router.Context, policy RenderCachePolicy, group *renderCacheRevalidationGroup, key string, decision RenderCacheHandlerDecision, response RenderedSiteResponse) {
	if policy.StaleRevalidator == nil || group == nil || !group.begin(key) {
		return
	}
	request := RenderCacheRevalidationRequest{
		Key:         strings.TrimSpace(key),
		RequestPath: strings.TrimSpace(decision.CanonicalPath),
		State:       cloneRenderCacheRevalidationState(decision.State),
		Response:    cloneRenderedSiteResponse(response),
	}
	ctx := context.Background()
	if c != nil {
		ctx = context.WithoutCancel(RequestContext(c))
	}
	revalidator := policy.StaleRevalidator
	go func() {
		defer group.done(key)
		defer func() {
			_ = recover() //nolint:errcheck // Revalidator panics must not escape this goroutine.
		}()
		revalidator(ctx, request)
	}()
}

// quarantineRenderCacheHandlerEntry makes a response non-serveable when the
// required tag index could not be attached. Deletion is preferred. If cleanup
// itself fails, overwrite the value with an already-expired, body-free
// tombstone so a later lookup cannot replay the unindexed response.
func quarantineRenderCacheHandlerEntry(c router.Context, store RenderCacheStore, key string, cached RenderedSiteResponse, tagErr error) error {
	if store == nil {
		return tagErr
	}
	deleteErr := store.Delete(RequestContext(c), key)
	if deleteErr == nil {
		return tagErr
	}
	now := time.Now().Add(-time.Second)
	tombstone := cached
	tombstone.Body = nil
	tombstone.Headers = nil
	tombstone.Tags = nil
	tombstone.FreshUntil = now
	tombstone.StaleUntil = now
	tombstoneErr := store.Set(RequestContext(c), key, tombstone, time.Second)
	return errors.Join(tagErr, deleteErr, tombstoneErr)
}

func validateRenderCacheHandlerDecision(decision RenderCacheHandlerDecision) error {
	if surface := strings.TrimSpace(decision.Surface); surface == "" || len(surface) > maxRenderCacheHandlerSurfaceBytes || normalizeRenderCacheReasonToken(surface) == "" {
		return fmt.Errorf("invalid render cache handler surface")
	}
	if len(decision.CanonicalPath)+len(decision.CanonicalQuery) > maxRenderCacheHandlerCanonicalBytes {
		return fmt.Errorf("render cache handler canonical material exceeds %d bytes", maxRenderCacheHandlerCanonicalBytes)
	}
	if decision.FreshTTLOverride < 0 {
		return fmt.Errorf("render cache handler fresh ttl override must not be negative")
	}
	if decision.RequireFence {
		if _, err := normalizeRenderCacheGenerationScopes(renderCacheHandlerFenceScopes(decision)...); err != nil {
			return err
		}
	}
	return nil
}

func renderCacheHandlerFenceScopes(decision RenderCacheHandlerDecision) []string {
	scopes := append([]string(nil), decision.FenceScopes...)
	if strings.TrimSpace(decision.FenceScope) != "" {
		scopes = append(scopes, decision.FenceScope)
	}
	return scopes
}

func buildRenderCacheHandlerKey(policy RenderCachePolicy, decision RenderCacheHandlerDecision, generations renderCacheGenerationSnapshot) string {
	policy = normalizeRenderCachePolicy(policy)
	payload := strings.Join([]string{
		"surface=" + strings.TrimSpace(decision.Surface),
		"path=" + decision.CanonicalPath,
		"query=" + decision.CanonicalQuery,
	}, "\n")
	parts := []string{
		"schema=" + policy.SchemaVersion,
		"app=" + policy.ApplicationNamespace,
		"env=" + firstNonEmpty(policy.EnvironmentNamespace, "prod"),
		"site=" + policy.SiteNamespace,
		"version=" + policy.RenderVersion,
		"surface=" + strings.TrimSpace(decision.Surface),
		"canonical=" + HashRenderCacheCanonicalData([]byte(payload)),
		"generations=" + hashRenderCacheGenerationSnapshot(generations),
	}
	for index, part := range parts {
		key, value, _ := strings.Cut(part, "=")
		parts[index] = key + "=" + url.QueryEscape(value)
	}
	return RenderCacheKeyPrefix + "handler|" + strings.Join(parts, "|")
}

func renderCacheHandlerBypass(c router.Context, handler router.HandlerFunc, tracker *renderCacheRequestTracker, policy RenderCachePolicy, reason string) error {
	reason = boundedRenderCacheObservationReason(reason, policy)
	if tracker != nil {
		tracker.evaluate(false, reason)
		tracker.setFallbackReason(reason)
	}
	writeRenderCacheHandlerDebugHeaders(c, policy, renderCacheStatusBypass, reason, "")
	return handler(c)
}

func renderCacheHandlerPreExecutionFailure(c router.Context, handler router.HandlerFunc, tracker *renderCacheRequestTracker, policy RenderCachePolicy, reason string, cause error) error {
	reason = boundedRenderCacheObservationReason(reason, policy)
	if policy.FailClosed {
		if tracker != nil {
			tracker.evaluate(true, "")
			tracker.setFallbackReason(reason)
		}
		writeRenderCacheHandlerDebugHeaders(c, policy, renderCacheStatusBypass, reason, "")
		if c == nil {
			finishRenderCacheRequest(c, RenderCacheRequestOutcomeFailed, reason, cause)
			return cause
		}
		returnErr := c.SendStatus(http.StatusServiceUnavailable)
		finishRenderCacheRequest(c, RenderCacheRequestOutcomeFailed, reason, firstNonNilError(cause, returnErr))
		if returnErr != nil {
			return returnErr
		}
		return nil
	}
	return renderCacheHandlerBypass(c, handler, tracker, policy, reason)
}

func renderCacheHandlerPostExecutionFailure(c router.Context, captured *router.CapturedResponse, tracker *renderCacheRequestTracker, policy RenderCachePolicy, key, reason string, cause error) error {
	reason = boundedRenderCacheObservationReason(reason, policy)
	writeRenderCacheHandlerDebugHeaders(c, policy, renderCacheStatusBypass, reason, key)
	setRenderCacheRequestFallbackReason(c, reason)
	if policy.FailClosed {
		if c == nil {
			finishRenderCacheRequest(c, RenderCacheRequestOutcomeFailed, reason, cause)
			return cause
		}
		returnErr := c.SendStatus(http.StatusServiceUnavailable)
		finishRenderCacheRequest(c, RenderCacheRequestOutcomeFailed, reason, firstNonNilError(cause, returnErr))
		if returnErr != nil {
			return returnErr
		}
		return nil
	}
	returnErr := router.ReplayCapturedResponse(c, captured)
	finishRenderCacheRequest(c, RenderCacheRequestOutcomeRenderedUncached, reason, returnErr)
	return returnErr
}

func replayUncachedRenderCacheHandlerResponse(c router.Context, captured *router.CapturedResponse, policy RenderCachePolicy, key, reason string) error {
	writeRenderCacheHandlerDebugHeaders(c, policy, renderCacheStatusBypass, reason, key)
	setRenderCacheRequestFallbackReason(c, reason)
	err := router.ReplayCapturedResponse(c, captured)
	finishRenderCacheRequest(c, RenderCacheRequestOutcomeRenderedUncached, reason, err)
	return err
}

func attachRenderCacheHandlerTags(c router.Context, store RenderCacheStore, key string, tags []string) error {
	if len(tags) == 0 || strings.TrimSpace(key) == "" || renderCacheStoreIsMemoryBackend(store) {
		return nil
	}
	invalidator, ok := store.(RenderCacheTagInvalidator)
	if !ok || invalidator == nil {
		return nil
	}
	return invalidator.AddTagsForKey(RequestContext(c), key, append([]string(nil), tags...))
}

func writeRenderCacheHandlerDebugHeaders(c router.Context, policy RenderCachePolicy, status, reason, key string) {
	if c == nil || !policy.DebugHeaders {
		return
	}
	if status = strings.TrimSpace(status); status != "" {
		c.SetHeader("X-Site-Render-Cache", status)
	}
	if reason = strings.TrimSpace(reason); reason != "" {
		c.SetHeader("X-Site-Render-Cache-Reason", reason)
	}
	if policy.DebugKeys && strings.TrimSpace(key) != "" {
		c.SetHeader("X-Site-Render-Cache-Key", strings.TrimSpace(key))
	}
}

func renderCacheHandlerPreviewTokenPresent(c router.Context) bool {
	if c == nil {
		return false
	}
	return len(c.QueryValues("preview_token")) > 0 || strings.TrimSpace(c.Query("preview_token")) != ""
}
