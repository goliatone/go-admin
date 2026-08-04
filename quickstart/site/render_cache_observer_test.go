package site

import (
	"context"
	"fmt"
	"net/http"
	"sync"
	"testing"
	"time"

	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
)

type testRenderCacheRequestObserver struct {
	mu           sync.Mutex
	observations []RenderCacheRequestObservation
	panic        bool
}

func (o *testRenderCacheRequestObserver) ObserveRenderCacheRequest(_ context.Context, observation RenderCacheRequestObservation) {
	if o.panic {
		panic("render cache observer failure")
	}
	o.mu.Lock()
	o.observations = append(o.observations, observation)
	o.mu.Unlock()
}

func (o *testRenderCacheRequestObserver) snapshot() []RenderCacheRequestObservation {
	o.mu.Lock()
	defer o.mu.Unlock()
	return append([]RenderCacheRequestObservation(nil), o.observations...)
}

func TestRenderCacheRuntimeObserverTracksBypassStoreAndHitExactlyOnce(t *testing.T) {
	store := newTestRenderCacheStore()
	store.backendKind = RenderCacheBackendValkey
	debugObserver := NewRenderCacheDebugObserver(store, RenderCacheConfig{
		Enabled: true,
		Backend: RenderCacheBackendValkey,
	})
	recordingObserver := &testRenderCacheRequestObserver{}
	panicObserver := &testRenderCacheRequestObserver{panic: true}
	runtime := &RenderCacheRuntime{
		Config: RenderCacheConfig{Enabled: true, Backend: RenderCacheBackendValkey},
		Store:  NewRenderCacheDebugObservedStore(debugObserver),
		Policy: RenderCachePolicy{
			Enabled:          true,
			FreshTTL:         time.Minute,
			DebugHeaders:     true,
			TemplateRenderer: &testRenderCacheRenderer{},
		},
		Observer: debugObserver,
		RequestObservers: []RenderCacheRequestObserver{
			panicObserver,
			recordingObserver,
			recordingObserver,
		},
	}
	services := newRenderCacheDeliveryServices(t)
	server := router.NewHTTPServer()
	if err := RegisterSiteRoutes(
		server.Router(),
		nil,
		admin.Config{DefaultLocale: "en"},
		SiteConfig{Features: SiteFeatures{EnableI18N: new(false)}},
		WithDeliveryServices(services, services),
		WithRenderCacheRuntime(runtime),
	); err != nil {
		t.Fatalf("register site routes: %v", err)
	}

	first := performSiteRequestRaw(t, server, "/about", "text/html")
	second := performSiteRequestRaw(t, server, "/about", "text/html")
	authRequest := httptestRequest(http.MethodGet, "/about")
	authRequest.Header.Set("Accept", "text/html")
	authRequest.Header.Set("Authorization", "Bearer operator")
	authResponse := performRawRequest(t, server, authRequest)
	if first.Header().Get("X-Site-Render-Cache") != renderCacheStatusMiss || second.Header().Get("X-Site-Render-Cache") != renderCacheStatusHit {
		t.Fatalf("expected miss then hit, first=%v second=%v", first.Header(), second.Header())
	}
	if authResponse.Header().Get("X-Site-Render-Cache-Reason") != renderCacheReasonAuth {
		t.Fatalf("expected auth bypass, headers=%v", authResponse.Header())
	}

	snapshot := debugObserver.Snapshot(runtime)
	requests := snapshot.RequestCounters
	if requests.Evaluated != 3 || requests.Eligible != 2 || requests.Bypassed != 1 || requests.Terminal != 3 {
		t.Fatalf("unexpected request decision counters: %+v", requests)
	}
	if requests.StoredResponses != 1 || requests.ServedHits != 1 || requests.RenderedUncached != 0 || requests.Failed != 0 {
		t.Fatalf("unexpected terminal request counters: %+v", requests)
	}
	if requests.BypassReasons[renderCacheReasonAuth] != 1 || snapshot.Engagement != "engaged" {
		t.Fatalf("expected bounded auth reason and engaged state, snapshot=%+v", snapshot)
	}
	if snapshot.Counters.Lookups != 2 || snapshot.Counters.Misses != 1 || snapshot.Counters.Hits != 1 || snapshot.Counters.Writes != 1 {
		t.Fatalf("backend operations should exclude auth bypass: %+v", snapshot.Counters)
	}

	observations := recordingObserver.snapshot()
	if len(observations) != 6 {
		t.Fatalf("expected one evaluation and terminal event per request after deduplication, got %d: %+v", len(observations), observations)
	}
	terminal := 0
	for _, observation := range observations {
		if observation.Phase == RenderCacheRequestPhaseTerminal {
			terminal++
		}
	}
	if terminal != 3 {
		t.Fatalf("expected exactly three terminal events, got %d: %+v", terminal, observations)
	}
}

func TestRenderCacheRequestTrackerBoundsHostReasonsAndCompletesOnce(t *testing.T) {
	observer := &testRenderCacheRequestObserver{}
	tracker := newRenderCacheRequestTracker(context.Background(), []RenderCacheRequestObserver{observer})
	policy := normalizeRenderCachePolicy(RenderCachePolicy{HostBypassReasonAllowlist: []string{"newsletter_flash"}})
	tracker.evaluate(false, boundedRenderCacheObservationReason("request-derived/value", policy))
	tracker.complete(nil)
	tracker.finish(RenderCacheRequestOutcomeFailed, renderCacheReasonRenderError)

	observations := observer.snapshot()
	if len(observations) != 2 {
		t.Fatalf("expected one evaluation and one terminal event, got %+v", observations)
	}
	for _, observation := range observations {
		if observation.Reason != renderCacheReasonHostBypass {
			t.Fatalf("expected unsafe reason to collapse to host_bypass, got %+v", observations)
		}
	}
	if got := boundedRenderCacheObservationReason("newsletter_flash", policy); got != "newsletter_flash" {
		t.Fatalf("expected static allowlisted host reason, got %q", got)
	}
	allowlist := make([]string, renderCacheHostReasonAllowlistCap+10)
	for index := range allowlist {
		allowlist[index] = fmt.Sprintf("host_%d", index)
	}
	if got := len(normalizeRenderCacheReasonAllowlist(allowlist)); got != renderCacheHostReasonAllowlistCap {
		t.Fatalf("expected host reason allowlist cap %d, got %d", renderCacheHostReasonAllowlistCap, got)
	}
}

func TestRenderCacheRequestTrackerTerminalReasonContract(t *testing.T) {
	bypassReasons := []string{
		renderCacheReasonDisabled,
		renderCacheReasonMissingStore,
		renderCacheReasonUnsupportedRenderer,
		renderCacheReasonMethod,
		renderCacheReasonJSON,
		renderCacheReasonPreview,
		renderCacheReasonAuth,
		renderCacheReasonHostBypass,
		renderCacheReasonLocaleCookieMutation,
		renderCacheReasonUnknownQuery,
		renderCacheReasonReservedRoute,
		renderCacheReasonSearchRoute,
		renderCacheReasonTagIndexRequired,
		renderCacheReasonTagIndexMemoryStore,
		renderCacheReasonTagIndexBackendKind,
	}
	for _, reason := range bypassReasons {
		t.Run("bypass/"+reason, func(t *testing.T) {
			observer := &testRenderCacheRequestObserver{}
			tracker := newRenderCacheRequestTracker(t.Context(), []RenderCacheRequestObserver{observer})
			tracker.evaluate(false, reason)
			tracker.complete(nil)
			tracker.finish(RenderCacheRequestOutcomeFailed, renderCacheReasonRenderError)
			assertRenderCacheObservationPair(t, observer.snapshot(), RenderCacheRequestOutcomeBypassed, reason)
		})
	}

	uncachedReasons := []string{
		renderCacheReasonCacheReadError,
		renderCacheReasonCacheWriteError,
		renderCacheReasonCanonicalRedirect,
		renderCacheReasonHistoricalRedirect,
		renderCacheReasonStatus,
		renderCacheReasonOversizedCapture,
		renderCacheReasonStreamCapture,
		renderCacheReasonNonHTML,
		renderCacheReasonUnsafeHeader,
		renderCacheReasonTagIndexWriteError,
	}
	for _, reason := range uncachedReasons {
		t.Run("uncached/"+reason, func(t *testing.T) {
			observer := &testRenderCacheRequestObserver{}
			tracker := newRenderCacheRequestTracker(t.Context(), []RenderCacheRequestObserver{observer})
			tracker.evaluate(true, "")
			tracker.setFallbackReason(reason)
			tracker.complete(nil)
			tracker.complete(context.Canceled)
			assertRenderCacheObservationPair(t, observer.snapshot(), RenderCacheRequestOutcomeRenderedUncached, reason)
		})
	}

	t.Run("render failure", func(t *testing.T) {
		observer := &testRenderCacheRequestObserver{}
		tracker := newRenderCacheRequestTracker(t.Context(), []RenderCacheRequestObserver{observer})
		tracker.evaluate(true, "")
		tracker.setFallbackReason(renderCacheReasonRenderError)
		tracker.complete(nil)
		assertRenderCacheObservationPair(t, observer.snapshot(), RenderCacheRequestOutcomeFailed, renderCacheReasonRenderError)
	})

	t.Run("response write failure", func(t *testing.T) {
		observer := &testRenderCacheRequestObserver{}
		tracker := newRenderCacheRequestTracker(t.Context(), []RenderCacheRequestObserver{observer})
		tracker.evaluate(true, "")
		tracker.finish(RenderCacheRequestOutcomeFailed, "")
		assertRenderCacheObservationPair(t, observer.snapshot(), RenderCacheRequestOutcomeFailed, "")
	})
}

func assertRenderCacheObservationPair(t *testing.T, observations []RenderCacheRequestObservation, terminal RenderCacheRequestOutcome, reason string) {
	t.Helper()
	if len(observations) != 2 {
		t.Fatalf("expected exactly one evaluation and terminal observation, got %+v", observations)
	}
	if observations[0].Phase != RenderCacheRequestPhaseEvaluated || observations[1].Phase != RenderCacheRequestPhaseTerminal {
		t.Fatalf("unexpected observation phases: %+v", observations)
	}
	if observations[1].Outcome != terminal || observations[1].Reason != reason {
		t.Fatalf("expected terminal %q reason %q, got %+v", terminal, reason, observations[1])
	}
}

func TestRenderCacheDebugObserverBoundsReasonCardinality(t *testing.T) {
	observer := NewRenderCacheDebugObserver(newTestRenderCacheStore(), RenderCacheConfig{Enabled: true})
	for index := 0; index < renderCacheDebugReasonsCap*3; index++ {
		reason := fmt.Sprintf("host_reason_%d", index)
		observer.ObserveRenderCacheRequest(t.Context(), RenderCacheRequestObservation{
			Phase:   RenderCacheRequestPhaseTerminal,
			Outcome: RenderCacheRequestOutcomeRenderedUncached,
			Reason:  reason,
		})
	}
	observer.ObserveRenderCacheRequest(t.Context(), RenderCacheRequestObservation{
		Phase:   RenderCacheRequestPhaseTerminal,
		Outcome: RenderCacheRequestOutcomeRenderedUncached,
		Reason:  renderCacheReasonCacheReadError,
	})
	snapshot := observer.Snapshot(&RenderCacheRuntime{})
	if got := len(snapshot.RequestCounters.ReasonCounts); got > renderCacheDebugReasonsCap {
		t.Fatalf("reason cardinality exceeded cap: got %d, counters=%+v", got, snapshot.RequestCounters.ReasonCounts)
	}
	if snapshot.RequestCounters.ReasonCounts[renderCacheReasonHostBypass] == 0 {
		t.Fatalf("expected overflow reasons to collapse to host_bypass: %+v", snapshot.RequestCounters.ReasonCounts)
	}
	if snapshot.RequestCounters.ReasonCounts[renderCacheReasonCacheReadError] != 1 {
		t.Fatalf("expected bounded built-in reason to displace a host reason: %+v", snapshot.RequestCounters.ReasonCounts)
	}
}

func TestRenderCacheRuntimeObserverClassifiesLocaleAndBackendFailures(t *testing.T) {
	tests := []struct {
		name             string
		configureStore   func(*testRenderCacheStore)
		failClosed       bool
		path             string
		wantBypassed     int64
		wantUncached     int64
		wantFailed       int64
		wantReason       string
		wantBackendReads int64
		stableLocale     bool
		rendererHeaders  map[string][]string
		requireTagIndex  bool
	}{
		{
			name:             "locale cookie mutation bypasses before lookup",
			path:             "/about?locale=es",
			wantBypassed:     1,
			wantReason:       renderCacheReasonLocaleCookieMutation,
			wantBackendReads: 0,
		},
		{
			name: "read failure renders uncached when fail open",
			configureStore: func(store *testRenderCacheStore) {
				store.err = context.DeadlineExceeded
			},
			path:             "/about",
			wantUncached:     1,
			wantReason:       renderCacheReasonCacheReadError,
			wantBackendReads: 1,
			stableLocale:     true,
		},
		{
			name: "read failure is terminal when fail closed",
			configureStore: func(store *testRenderCacheStore) {
				store.err = context.DeadlineExceeded
			},
			failClosed:       true,
			path:             "/about",
			wantFailed:       1,
			wantReason:       renderCacheReasonCacheReadError,
			wantBackendReads: 1,
			stableLocale:     true,
		},
		{
			name: "write failure renders uncached when fail open",
			configureStore: func(store *testRenderCacheStore) {
				store.setErr = context.DeadlineExceeded
			},
			path:             "/about",
			wantUncached:     1,
			wantReason:       renderCacheReasonCacheWriteError,
			wantBackendReads: 1,
			stableLocale:     true,
		},
		{
			name: "write failure is terminal when fail closed",
			configureStore: func(store *testRenderCacheStore) {
				store.setErr = context.DeadlineExceeded
			},
			failClosed:       true,
			path:             "/about",
			wantFailed:       1,
			wantReason:       renderCacheReasonCacheWriteError,
			wantBackendReads: 1,
			stableLocale:     true,
		},
		{
			name:             "post render exclusion is terminal uncached delivery",
			path:             "/about",
			wantUncached:     1,
			wantReason:       renderCacheReasonUnsafeHeader,
			wantBackendReads: 1,
			stableLocale:     true,
			rendererHeaders:  map[string][]string{"Set-Cookie": {"personalized=true"}},
		},
		{
			name: "tag attachment failure renders uncached when fail open",
			configureStore: func(store *testRenderCacheStore) {
				store.tagErr = context.DeadlineExceeded
			},
			path:             "/about",
			wantUncached:     1,
			wantReason:       renderCacheReasonTagIndexWriteError,
			wantBackendReads: 1,
			stableLocale:     true,
			requireTagIndex:  true,
		},
		{
			name: "tag attachment failure is terminal when fail closed",
			configureStore: func(store *testRenderCacheStore) {
				store.tagErr = context.DeadlineExceeded
			},
			failClosed:       true,
			path:             "/about",
			wantFailed:       1,
			wantReason:       renderCacheReasonTagIndexWriteError,
			wantBackendReads: 1,
			stableLocale:     true,
			requireTagIndex:  true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			store := newTestRenderCacheStore()
			store.backendKind = RenderCacheBackendValkey
			if tt.configureStore != nil {
				tt.configureStore(store)
			}
			observer := NewRenderCacheDebugObserver(store, RenderCacheConfig{Enabled: true, Backend: RenderCacheBackendValkey})
			runtime := &RenderCacheRuntime{
				Config: RenderCacheConfig{Enabled: true, Backend: RenderCacheBackendValkey},
				Store:  NewRenderCacheDebugObservedStore(observer),
				Policy: RenderCachePolicy{
					Enabled:          true,
					FreshTTL:         time.Minute,
					DebugHeaders:     true,
					FailClosed:       tt.failClosed,
					RequireTagIndex:  tt.requireTagIndex,
					TemplateRenderer: &testRenderCacheRenderer{headers: tt.rendererHeaders},
				},
				Observer:         observer,
				RequestObservers: []RenderCacheRequestObserver{observer},
			}
			services := newRenderCacheDeliveryServices(t)
			server := router.NewHTTPServer()
			if err := RegisterSiteRoutes(
				server.Router(),
				nil,
				admin.Config{DefaultLocale: "en"},
				SiteConfig{SupportedLocales: []string{"en", "es"}},
				WithDeliveryServices(services, services),
				WithRenderCacheRuntime(runtime),
			); err != nil {
				t.Fatalf("register site routes: %v", err)
			}
			request := httptestRequest(http.MethodGet, tt.path)
			request.Header.Set("Accept", "text/html")
			if tt.stableLocale {
				request.AddCookie(&http.Cookie{Name: defaultLocaleCookieName, Value: "en"})
			}
			_ = performRawRequest(t, server, request)

			snapshot := observer.Snapshot(runtime)
			requests := snapshot.RequestCounters
			if requests.Evaluated != 1 || requests.Terminal != 1 || requests.Bypassed != tt.wantBypassed || requests.RenderedUncached != tt.wantUncached || requests.Failed != tt.wantFailed {
				t.Fatalf("unexpected request counters: %+v", requests)
			}
			if requests.ReasonCounts[tt.wantReason] != 1 {
				t.Fatalf("expected terminal reason %q, got %+v", tt.wantReason, requests.ReasonCounts)
			}
			if snapshot.Counters.Lookups != tt.wantBackendReads {
				t.Fatalf("expected %d backend reads, got %+v", tt.wantBackendReads, snapshot.Counters)
			}
		})
	}
}
