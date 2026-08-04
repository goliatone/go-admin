package site

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/goliatone/go-admin/internal/primitives"
	router "github.com/goliatone/go-router"
)

const (
	maxRenderCacheHandlerSurfaceBytes   = 64
	maxRenderCacheHandlerCanonicalBytes = 16 * 1024
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
	FenceScope       string
	RequireFence     bool
	// AllowProcessLocalFence is intended only for explicit single-process
	// development and tests. Production hosts should leave it false.
	AllowProcessLocalFence bool
	State                  RequestState
}

// RenderCacheHandlerOptions configures arbitrary public HTML handler caching.
// Decide must be cheap and deterministic. ResolveTags runs only after a safe
// GET miss has executed and may inspect request locals populated by the handler.
type RenderCacheHandlerOptions struct {
	Decide      func(router.Context) (RenderCacheHandlerDecision, error)
	ResolveTags func(router.Context) ([]string, error)
}

// SetRenderCacheHandlerTags publishes bounded response dependencies from a
// wrapped miss handler. Repeated calls merge and deduplicate tags.
func SetRenderCacheHandlerTags(c router.Context, tags ...string) {
	if c == nil {
		return
	}
	existing, _ := c.Locals(renderCacheHandlerTagsLocalsKey).([]string)
	merged := primitives.NormalizeUniqueStringSliceEmpty(append(existing, tags...))
	c.Locals(renderCacheHandlerTagsLocalsKey, merged)
}

// RenderCacheHandlerTags returns a copy of tags published by a wrapped handler.
func RenderCacheHandlerTags(c router.Context) []string {
	if c == nil {
		return nil
	}
	tags, _ := c.Locals(renderCacheHandlerTagsLocalsKey).([]string)
	return append([]string(nil), tags...)
}

// WrapRenderCacheHandler applies the shared public HTML render-cache lifecycle
// to an arbitrary router handler. Hits skip handler execution. GET and HEAD use
// one representation key; HEAD misses execute once and never populate storage.
func WrapRenderCacheHandler(runtime *RenderCacheRuntime, handler router.HandlerFunc, options RenderCacheHandlerOptions) router.HandlerFunc {
	if handler == nil {
		return nil
	}
	var revalidation renderCacheRevalidationGroup
	return func(c router.Context) (returnErr error) {
		policy := RenderCachePolicy{}
		var store RenderCacheStore
		var observers []RenderCacheRequestObserver
		if runtime != nil {
			policy = normalizeRenderCachePolicy(runtime.Policy)
			store = runtime.Store
			observers = composeRenderCacheRequestObservers(runtime.RequestObservers)
			if runtime.Observer != nil {
				observers = composeRenderCacheRequestObservers(observers, []RenderCacheRequestObserver{runtime.Observer})
			}
		}
		tracker := installRenderCacheRequestTracker(c, observers)
		defer func() {
			if tracker != nil {
				tracker.complete(returnErr)
			}
		}()

		if decision := renderCacheConfigDecision(renderCacheConfig{store: store, policy: policy}, policy); !decision.Cacheable {
			return renderCacheHandlerBypass(c, handler, tracker, policy, decision.Reason)
		}
		if decision := renderCacheRequestDecision(c, policy); !decision.Cacheable {
			return renderCacheHandlerBypass(c, handler, tracker, policy, decision.Reason)
		}
		if renderCacheHandlerPreviewTokenPresent(c) {
			return renderCacheHandlerBypass(c, handler, tracker, policy, renderCacheReasonPreview)
		}
		if options.Decide == nil {
			return renderCacheHandlerBypass(c, handler, tracker, policy, renderCacheReasonHandlerDecision)
		}

		decision, err := options.Decide(c)
		if err != nil {
			return renderCacheHandlerPreExecutionFailure(c, handler, tracker, policy, renderCacheReasonHandlerDecisionError, err)
		}
		if !decision.Cacheable {
			reason := boundedRenderCacheObservationReason(decision.Reason, policy)
			if reason == "" || reason == renderCacheReasonHostBypass {
				reason = renderCacheReasonHandlerDecision
			}
			return renderCacheHandlerBypass(c, handler, tracker, policy, reason)
		}
		if stateDecision := renderCacheStateDecision(c, decision.State, policy); !stateDecision.Cacheable {
			return renderCacheHandlerBypass(c, handler, tracker, policy, stateDecision.Reason)
		}
		if err := validateRenderCacheHandlerDecision(decision); err != nil {
			return renderCacheHandlerPreExecutionFailure(c, handler, tracker, policy, renderCacheReasonHandlerDecisionError, err)
		}

		generation := uint64(0)
		if decision.RequireFence {
			if runtime == nil || runtime.Generations == nil || (!runtime.Generations.Shared() && !decision.AllowProcessLocalFence) {
				return renderCacheHandlerPreExecutionFailure(c, handler, tracker, policy, renderCacheReasonFenceUnavailable, ErrRenderCacheGenerationUnavailable)
			}
			generation, err = ReadRenderCacheGeneration(RequestContext(c), runtime, decision.FenceScope)
			if err != nil {
				return renderCacheHandlerPreExecutionFailure(c, handler, tracker, policy, renderCacheReasonFenceReadError, err)
			}
		}

		key := buildRenderCacheHandlerKey(policy, decision, generation)
		tracker.evaluate(true, "")
		response, hit, err := store.Get(RequestContext(c), key)
		if err != nil {
			return renderCacheHandlerPreExecutionFailure(c, handler, tracker, policy, renderCacheReasonCacheReadError, err)
		}
		if hit {
			switch renderCacheResponseFreshness(response, time.Now()) {
			case renderCacheFreshnessFresh:
				writeRenderCacheHandlerDebugHeaders(c, policy, renderCacheStatusHit, "", key)
				return replayRenderCacheResponse(c, response, renderCacheStatusHit, RenderCacheRequestOutcomeHit)
			case renderCacheFreshnessStale:
				if !decision.DisableStale {
					writeRenderCacheHandlerDebugHeaders(c, policy, renderCacheStatusStale, "", key)
					triggerRenderCacheHandlerStaleRevalidation(c, policy, &revalidation, key, decision, response)
					return replayRenderCacheResponse(c, response, renderCacheStatusStale, RenderCacheRequestOutcomeStale)
				}
			}
			if err := store.Delete(RequestContext(c), key); err != nil {
				return renderCacheHandlerPreExecutionFailure(c, handler, tracker, policy, renderCacheReasonCacheWriteError, err)
			}
		}
		writeRenderCacheHandlerDebugHeaders(c, policy, renderCacheStatusMiss, "", key)

		if renderCacheMethodIsHead(c) {
			setRenderCacheRequestFallbackReason(c, renderCacheReasonHeadMiss)
			captured, captureErr := router.CaptureResponse(c, policy.MaxCaptureBodySize, handler)
			if captureErr != nil {
				return captureErr
			}
			if captured == nil {
				return fmt.Errorf("render cache HEAD handler returned no captured response")
			}
			captured.Body = nil
			returnErr = router.ReplayCapturedResponse(c, captured)
			finishRenderCacheRequest(c, RenderCacheRequestOutcomeRenderedUncached, renderCacheReasonHeadMiss, returnErr)
			return returnErr
		}

		captured, err := router.CaptureResponse(c, policy.MaxCaptureBodySize, handler)
		if err != nil {
			setRenderCacheRequestFallbackReason(c, renderCacheCaptureFailureReason(err))
			return err
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
		if decision.FreshTTLOverride > 0 {
			policy.FreshTTL = decision.FreshTTLOverride
		}
		if decision.DisableStale {
			policy.StaleTTL = 0
		}
		tags := RenderCacheHandlerTags(c)
		if options.ResolveTags != nil {
			tags, err = options.ResolveTags(c)
			if err != nil {
				return renderCacheHandlerPostExecutionFailure(c, captured, tracker, policy, key, renderCacheReasonTagResolutionError, err)
			}
		}
		tags = primitives.NormalizeUniqueStringSliceEmpty(append([]string{RenderCacheAllSiteTag}, tags...))
		cached, reason, ok := newRenderedSiteResponse(result, policy, tags, time.Now())
		if !ok {
			return replayUncachedRenderCacheHandlerResponse(c, captured, policy, key, reason)
		}

		if decision.RequireFence {
			current, readErr := ReadRenderCacheGeneration(RequestContext(c), runtime, decision.FenceScope)
			if readErr != nil {
				return renderCacheHandlerPostExecutionFailure(c, captured, tracker, policy, key, renderCacheReasonFenceReadError, readErr)
			}
			if current != generation {
				return replayUncachedRenderCacheHandlerResponse(c, captured, policy, key, renderCacheReasonFenceChanged)
			}
		}
		if err := store.Set(RequestContext(c), key, cached, renderCacheStoreTTL(policy)); err != nil {
			return renderCacheHandlerPostExecutionFailure(c, captured, tracker, policy, key, renderCacheReasonCacheWriteError, err)
		}
		if err := attachRenderCacheHandlerTags(c, store, key, cached.Tags); err != nil && policy.RequireTagIndex {
			cleanupErr := quarantineRenderCacheHandlerEntry(c, store, key, cached, err)
			return renderCacheHandlerPostExecutionFailure(c, captured, tracker, policy, key, renderCacheReasonTagIndexWriteError, cleanupErr)
		}
		writeRenderCacheHandlerDebugHeaders(c, policy, renderCacheStatusMiss, "", key)
		returnErr = router.ReplayCapturedResponse(c, captured)
		finishRenderCacheRequest(c, RenderCacheRequestOutcomeStored, "", returnErr)
		return returnErr
	}
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
		if _, err := normalizeRenderCacheGenerationScope(decision.FenceScope); err != nil {
			return err
		}
	}
	return nil
}

func buildRenderCacheHandlerKey(policy RenderCachePolicy, decision RenderCacheHandlerDecision, generation uint64) string {
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
		"generation=" + strconv.FormatUint(generation, 10),
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
