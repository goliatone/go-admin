package site

import (
	"context"
	"reflect"
	"strings"
	"sync"

	router "github.com/goliatone/go-router"
)

// RenderCacheRequestPhase identifies where an observation was emitted in the
// public HTML cache request lifecycle.
type RenderCacheRequestPhase string

const (
	RenderCacheRequestPhaseEvaluated RenderCacheRequestPhase = "evaluated"
	RenderCacheRequestPhaseTerminal  RenderCacheRequestPhase = "terminal"
)

// RenderCacheRequestOutcome is a bounded request-level cache outcome. These
// outcomes intentionally describe delivery rather than individual store calls.
type RenderCacheRequestOutcome string

const (
	RenderCacheRequestOutcomeEligible         RenderCacheRequestOutcome = "eligible"
	RenderCacheRequestOutcomeBypassed         RenderCacheRequestOutcome = "bypassed"
	RenderCacheRequestOutcomeHit              RenderCacheRequestOutcome = "hit"
	RenderCacheRequestOutcomeStale            RenderCacheRequestOutcome = "stale"
	RenderCacheRequestOutcomeStored           RenderCacheRequestOutcome = "stored"
	RenderCacheRequestOutcomeRenderedUncached RenderCacheRequestOutcome = "rendered_uncached"
	RenderCacheRequestOutcomeFailed           RenderCacheRequestOutcome = "failed"
)

// RenderCacheRequestObservation contains bounded, privacy-safe request cache
// diagnostics. It deliberately excludes paths, queries, keys, cookies, headers,
// bodies, and content identifiers.
type RenderCacheRequestObservation struct {
	Surface string                    `json:"surface"`
	Phase   RenderCacheRequestPhase   `json:"phase"`
	Outcome RenderCacheRequestOutcome `json:"outcome"`
	Reason  string                    `json:"reason,omitempty"`
}

// RenderCacheRequestObserver observes public HTML cache request decisions and
// terminal outcomes. Implementations must return quickly. Panics are isolated
// from visitor responses and from other observers.
type RenderCacheRequestObserver interface {
	ObserveRenderCacheRequest(context.Context, RenderCacheRequestObservation)
}

const renderCacheRequestTrackerLocalsKey contextKey = "quickstart.site.render_cache_request_tracker"

type renderCacheRequestTracker struct {
	ctx       context.Context
	observers []RenderCacheRequestObserver

	mu               sync.Mutex
	evaluated        bool
	eligible         bool
	terminal         bool
	evaluationReason string
	fallbackReason   string
	surface          string
}

func newRenderCacheRequestTracker(ctx context.Context, observers []RenderCacheRequestObserver) *renderCacheRequestTracker {
	if ctx == nil {
		ctx = context.Background()
	}
	return &renderCacheRequestTracker{
		ctx:       ctx,
		observers: composeRenderCacheRequestObservers(observers),
	}
}

func installRenderCacheRequestTracker(c router.Context, observers []RenderCacheRequestObserver) *renderCacheRequestTracker {
	observers = composeRenderCacheRequestObservers(observers)
	if len(observers) == 0 {
		return nil
	}
	if c == nil {
		return newRenderCacheRequestTracker(context.Background(), observers)
	}
	tracker := newRenderCacheRequestTracker(RequestContext(c), observers)
	c.Locals(renderCacheRequestTrackerLocalsKey, tracker)
	return tracker
}

func renderCacheRequestTrackerFromContext(c router.Context) *renderCacheRequestTracker {
	if c == nil {
		return nil
	}
	tracker, ok := c.Locals(renderCacheRequestTrackerLocalsKey).(*renderCacheRequestTracker)
	if !ok {
		return nil
	}
	return tracker
}

func setRenderCacheRequestFallbackReason(c router.Context, reason string) {
	if tracker := renderCacheRequestTrackerFromContext(c); tracker != nil {
		tracker.setFallbackReason(reason)
	}
}

func finishRenderCacheRequest(c router.Context, outcome RenderCacheRequestOutcome, reason string, err error) {
	tracker := renderCacheRequestTrackerFromContext(c)
	if tracker == nil {
		return
	}
	if err != nil {
		tracker.finish(RenderCacheRequestOutcomeFailed, reason)
		return
	}
	tracker.finish(outcome, reason)
}

func (t *renderCacheRequestTracker) evaluate(cacheable bool, reason string) {
	if t == nil {
		return
	}
	reason = strings.TrimSpace(reason)
	outcome := RenderCacheRequestOutcomeEligible
	if !cacheable {
		outcome = RenderCacheRequestOutcomeBypassed
	}

	t.mu.Lock()
	if t.evaluated {
		t.mu.Unlock()
		return
	}
	t.evaluated = true
	t.eligible = cacheable
	t.evaluationReason = reason
	if reason != "" {
		t.fallbackReason = reason
	}
	t.mu.Unlock()

	observeRenderCacheRequest(t.ctx, t.observers, RenderCacheRequestObservation{
		Surface: t.observationSurface(),
		Phase:   RenderCacheRequestPhaseEvaluated,
		Outcome: outcome,
		Reason:  reason,
	})
	if !cacheable {
		t.finish(RenderCacheRequestOutcomeBypassed, reason)
	}
}

func (t *renderCacheRequestTracker) setSurface(surface string) {
	if t == nil {
		return
	}
	surface = normalizeRenderCacheObservationSurface(surface)
	t.mu.Lock()
	if !t.evaluated {
		t.surface = surface
	}
	t.mu.Unlock()
}

func (t *renderCacheRequestTracker) observationSurface() string {
	if t == nil {
		return renderCacheObservationSurfaceUnknown
	}
	t.mu.Lock()
	defer t.mu.Unlock()
	return normalizeRenderCacheObservationSurface(t.surface)
}

func (t *renderCacheRequestTracker) setFallbackReason(reason string) {
	if t == nil {
		return
	}
	reason = strings.TrimSpace(reason)
	if reason == "" {
		return
	}
	t.mu.Lock()
	if !t.terminal {
		t.fallbackReason = reason
	}
	t.mu.Unlock()
}

func (t *renderCacheRequestTracker) finish(outcome RenderCacheRequestOutcome, reason string) {
	if t == nil {
		return
	}
	reason = strings.TrimSpace(reason)
	t.mu.Lock()
	if t.terminal {
		t.mu.Unlock()
		return
	}
	t.terminal = true
	if reason == "" {
		reason = t.fallbackReason
	}
	t.mu.Unlock()

	observeRenderCacheRequest(t.ctx, t.observers, RenderCacheRequestObservation{
		Surface: t.observationSurface(),
		Phase:   RenderCacheRequestPhaseTerminal,
		Outcome: outcome,
		Reason:  reason,
	})
}

const (
	RenderCacheObservationSurfaceGeneric  = "generic"
	renderCacheObservationSurfaceUnknown  = "unknown"
	renderCacheObservationSurfaceMaxBytes = 64
)

func normalizeRenderCacheObservationSurface(surface string) string {
	surface = strings.ToLower(strings.TrimSpace(surface))
	if surface == "" || len(surface) > renderCacheObservationSurfaceMaxBytes {
		return renderCacheObservationSurfaceUnknown
	}
	for _, char := range surface {
		if (char < 'a' || char > 'z') && (char < '0' || char > '9') && char != '_' {
			return renderCacheObservationSurfaceUnknown
		}
	}
	return surface
}

func (t *renderCacheRequestTracker) complete(err error) {
	if t == nil {
		return
	}
	t.mu.Lock()
	if t.terminal {
		t.mu.Unlock()
		return
	}
	evaluated := t.evaluated
	eligible := t.eligible
	reason := t.fallbackReason
	evaluationReason := t.evaluationReason
	t.mu.Unlock()

	if !evaluated {
		t.evaluate(false, renderCacheReasonDisabled)
		return
	}
	if err != nil {
		if reason == "" {
			reason = renderCacheReasonRenderError
		}
		t.finish(RenderCacheRequestOutcomeFailed, reason)
		return
	}
	if !eligible {
		t.finish(RenderCacheRequestOutcomeBypassed, evaluationReason)
		return
	}
	if reason == renderCacheReasonRenderError {
		t.finish(RenderCacheRequestOutcomeFailed, reason)
		return
	}
	if reason == "" {
		reason = renderCacheReasonStatus
	}
	t.finish(RenderCacheRequestOutcomeRenderedUncached, reason)
}

func composeRenderCacheRequestObservers(groups ...[]RenderCacheRequestObserver) []RenderCacheRequestObserver {
	out := make([]RenderCacheRequestObserver, 0)
	for _, group := range groups {
		for _, observer := range group {
			if renderCacheRequestObserverIsNil(observer) || renderCacheRequestObserverPresent(out, observer) {
				continue
			}
			out = append(out, observer)
		}
	}
	return out
}

func renderCacheRequestObserverPresent(observers []RenderCacheRequestObserver, candidate RenderCacheRequestObserver) bool {
	candidateValue := reflect.ValueOf(candidate)
	for _, observer := range observers {
		observerValue := reflect.ValueOf(observer)
		if !observerValue.IsValid() || !candidateValue.IsValid() || observerValue.Type() != candidateValue.Type() {
			continue
		}
		if observerValue.Type().Comparable() && observerValue.Interface() == candidateValue.Interface() {
			return true
		}
	}
	return false
}

func renderCacheRequestObserverIsNil(observer RenderCacheRequestObserver) bool {
	if observer == nil {
		return true
	}
	value := reflect.ValueOf(observer)
	switch value.Kind() {
	case reflect.Chan, reflect.Func, reflect.Interface, reflect.Map, reflect.Pointer, reflect.Slice:
		return value.IsNil()
	default:
		return false
	}
}

func observeRenderCacheRequest(ctx context.Context, observers []RenderCacheRequestObserver, observation RenderCacheRequestObservation) {
	for _, observer := range observers {
		func(observer RenderCacheRequestObserver) {
			defer func() { _ = recover() }() //nolint:errcheck // Diagnostics must never affect public delivery.
			observer.ObserveRenderCacheRequest(ctx, observation)
		}(observer)
	}
}
