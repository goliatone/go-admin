package site

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
	"time"

	router "github.com/goliatone/go-router"
)

func TestRenderCacheHandlerGETHitAndHEADShareRepresentation(t *testing.T) {
	store := newTestRenderCacheStore()
	observer := &testRenderCacheHandlerObserver{}
	runtime := testRenderCacheHandlerRuntime(store, observer)
	calls := 0
	wrapped := WrapRenderCacheHandler(runtime, func(c router.Context) error {
		calls++
		c.SetHeader("Content-Type", "text/html; charset=utf-8")
		SetRenderCacheHandlerTags(c, "site:archive", "site:event:event-1")
		return c.SendString("<html>archive</html>")
	}, testRenderCacheHandlerOptions("archive", "/events/event-1"))

	first := performRenderCacheHandlerRequest(t, wrapped, http.MethodGet, "/events/event-1")
	if first.Code != http.StatusOK || first.Body.String() != "<html>archive</html>" {
		t.Fatalf("first GET response=%d body=%q", first.Code, first.Body.String())
	}
	if got := first.Header().Get("X-Site-Render-Cache"); got != renderCacheStatusMiss {
		t.Fatalf("first GET cache status=%q", got)
	}

	second := performRenderCacheHandlerRequest(t, wrapped, http.MethodGet, "/events/event-1")
	if second.Code != http.StatusOK || second.Body.String() != "<html>archive</html>" {
		t.Fatalf("second GET response=%d body=%q", second.Code, second.Body.String())
	}
	if got := second.Header().Get("X-Site-Render-Cache"); got != renderCacheStatusHit {
		t.Fatalf("second GET cache status=%q", got)
	}
	if calls != 1 {
		t.Fatalf("GET hit executed handler: calls=%d", calls)
	}

	head := performRenderCacheHandlerRequest(t, wrapped, http.MethodHead, "/events/event-1")
	if head.Code != http.StatusOK || head.Body.Len() != 0 {
		t.Fatalf("HEAD hit response=%d body=%q", head.Code, head.Body.String())
	}
	if got := head.Header().Get("X-Site-Render-Cache"); got != renderCacheStatusHit {
		t.Fatalf("HEAD cache status=%q", got)
	}
	if calls != 1 {
		t.Fatalf("HEAD hit executed handler: calls=%d", calls)
	}
	if len(store.items) != 1 || len(store.tagsByKey) != 1 {
		t.Fatalf("expected one tagged cache entry, items=%d tags=%d", len(store.items), len(store.tagsByKey))
	}
	for _, tags := range store.tagsByKey {
		assertStringContains(t, tags, RenderCacheAllSiteTag)
		assertStringContains(t, tags, "site:archive")
		assertStringContains(t, tags, "site:event:event-1")
	}
	observer.assertPairs(t, 3)
}

func TestRenderCacheHandlerCoalescesConcurrentColdGETFills(t *testing.T) {
	const requestCount = 12
	store := newBlockingRenderCacheHandlerStore(requestCount)
	observer := &testRenderCacheHandlerObserver{}
	runtime := testRenderCacheHandlerRuntime(store, observer)
	started := make(chan struct{})
	release := make(chan struct{})
	var startedOnce sync.Once
	var callsMu sync.Mutex
	calls := 0
	wrapper := WrapRenderCacheHandler(runtime, func(c router.Context) error {
		callsMu.Lock()
		calls++
		callsMu.Unlock()
		startedOnce.Do(func() { close(started) })
		<-release
		c.SetHeader("Content-Type", "text/html; charset=utf-8")
		return c.SendString("<html>coalesced</html>")
	}, testRenderCacheHandlerOptions("archive_event", "/events/coalesced"))

	responses := make([]*httptest.ResponseRecorder, requestCount)
	errorsByRequest := make([]error, requestCount)
	var requests sync.WaitGroup
	requests.Add(requestCount)
	for index := range requestCount {
		go func(index int) {
			defer requests.Done()
			recorder := httptest.NewRecorder()
			request := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/events/coalesced", nil)
			ctx := router.NewHTTPRouterContext(recorder, request, nil, nil)
			errorsByRequest[index] = wrapper(ctx)
			responses[index] = recorder
		}(index)
	}
	<-started
	<-store.initialLookupsDone
	close(release)
	requests.Wait()

	callsMu.Lock()
	handlerCalls := calls
	callsMu.Unlock()
	if handlerCalls != 1 {
		t.Fatalf("concurrent cold requests executed handler %d times", handlerCalls)
	}
	misses := 0
	hits := 0
	for index, response := range responses {
		if errorsByRequest[index] != nil || response.Code != http.StatusOK || response.Body.String() != "<html>coalesced</html>" {
			t.Fatalf("request %d err=%v response=%d body=%q", index, errorsByRequest[index], response.Code, response.Body.String())
		}
		switch response.Header().Get("X-Site-Render-Cache") {
		case renderCacheStatusMiss:
			misses++
		case renderCacheStatusHit:
			hits++
		default:
			t.Fatalf("request %d cache status=%q", index, response.Header().Get("X-Site-Render-Cache"))
		}
	}
	if misses != 1 || hits != requestCount-1 {
		t.Fatalf("coalesced statuses misses=%d hits=%d", misses, hits)
	}
	observer.mu.Lock()
	observations := append([]RenderCacheRequestObservation(nil), observer.observations...)
	observer.mu.Unlock()
	evaluated := 0
	terminal := 0
	for _, observation := range observations {
		if observation.Surface != "archive_event" {
			t.Fatalf("coalesced observation lost surface: %+v", observation)
		}
		switch observation.Phase {
		case RenderCacheRequestPhaseEvaluated:
			evaluated++
		case RenderCacheRequestPhaseTerminal:
			terminal++
		}
	}
	if evaluated != requestCount || terminal != requestCount {
		t.Fatalf("coalesced observations evaluated=%d terminal=%d want=%d", evaluated, terminal, requestCount)
	}
}

func TestRenderCacheHandlerCoalescedFillRekeysAfterFenceMutation(t *testing.T) {
	store := newBlockingRenderCacheHandlerStore(2)
	runtime := testRenderCacheHandlerRuntime(store)
	started := make(chan struct{})
	release := make(chan struct{})
	var startedOnce sync.Once
	var callsMu sync.Mutex
	calls := 0
	wrapper := WrapRenderCacheHandler(runtime, func(c router.Context) error {
		callsMu.Lock()
		calls++
		callsMu.Unlock()
		startedOnce.Do(func() { close(started) })
		<-release
		c.SetHeader("Content-Type", "text/html; charset=utf-8")
		return c.SendString("<html>current generation</html>")
	}, testRenderCacheHandlerOptions("archive_event", "/events/coalesced-fence"))

	responses := make([]*httptest.ResponseRecorder, 2)
	requestErrors := make([]error, 2)
	var requests sync.WaitGroup
	requests.Add(2)
	for index := range 2 {
		go func(index int) {
			defer requests.Done()
			recorder := httptest.NewRecorder()
			request := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/events/coalesced-fence", nil)
			requestErrors[index] = wrapper(router.NewHTTPRouterContext(recorder, request, nil, nil))
			responses[index] = recorder
		}(index)
	}
	<-started
	<-store.initialLookupsDone
	if _, err := AdvanceRenderCacheGeneration(context.Background(), runtime, "site:archive_event"); err != nil {
		t.Fatalf("advance generation during coalesced fill: %v", err)
	}
	close(release)
	requests.Wait()

	statuses := map[string]int{}
	for index, response := range responses {
		if requestErrors[index] != nil || response.Code != http.StatusOK || response.Body.String() != "<html>current generation</html>" {
			t.Fatalf("request %d err=%v response=%d body=%q", index, requestErrors[index], response.Code, response.Body.String())
		}
		statuses[response.Header().Get("X-Site-Render-Cache")]++
	}
	if statuses[renderCacheStatusBypass] != 1 || statuses[renderCacheStatusMiss] != 1 {
		t.Fatalf("mutation during fill statuses=%+v want one bypass and one miss", statuses)
	}
	callsMu.Lock()
	handlerCalls := calls
	callsMu.Unlock()
	if handlerCalls != 2 {
		t.Fatalf("post-mutation follower did not rekey exactly once: calls=%d", handlerCalls)
	}

	hit := performRenderCacheHandlerRequest(t, wrapper, http.MethodGet, "/events/coalesced-fence")
	if hit.Header().Get("X-Site-Render-Cache") != renderCacheStatusHit {
		t.Fatalf("post-mutation generation was not stored: headers=%v", hit.Header())
	}
	callsMu.Lock()
	defer callsMu.Unlock()
	if calls != 2 {
		t.Fatalf("post-mutation hit executed handler: calls=%d", calls)
	}
}

func TestRenderCacheFillGroupOverflowLeaderCannotReleaseLaterOwner(t *testing.T) {
	group := &renderCacheFillGroup{}
	owned := make([]<-chan struct{}, 0, maxRenderCacheConcurrentFillKeys)
	for index := range maxRenderCacheConcurrentFillKeys {
		leader, done := group.begin(fmt.Sprintf("key-%d", index))
		if !leader || done == nil {
			t.Fatalf("tracked fill %d leader=%t done=%v", index, leader, done)
		}
		owned = append(owned, done)
	}
	overflowLeader, overflowDone := group.begin("overflow")
	if !overflowLeader || overflowDone != nil {
		t.Fatalf("overflow fill leader=%t done=%v", overflowLeader, overflowDone)
	}
	group.done("key-0", owned[0])
	trackedLeader, trackedDoneReadOnly := group.begin("overflow")
	trackedDone := trackedDoneReadOnly
	if !trackedLeader || trackedDone == nil {
		t.Fatalf("later tracked fill leader=%t done=%v", trackedLeader, trackedDone)
	}

	group.done("overflow", nil)
	follower, followerDone := group.begin("overflow")
	if follower || followerDone != trackedDone {
		t.Fatalf("overflow completion released later owner: leader=%t done=%v want=%v", follower, followerDone, trackedDone)
	}
	group.done("overflow", trackedDone)
}

func TestRenderCacheHandlerSlidingRenewalUsesEffectiveOverrides(t *testing.T) {
	store := newTestRenderCacheStore()
	observer := &testRenderCacheHandlerObserver{}
	runtime := testRenderCacheHandlerRuntime(store, observer)
	runtime.Policy.ExpirationMode = RenderCacheExpirationSliding
	options := testRenderCacheHandlerOptions("archive", "/events/event-1")
	baseDecide := options.Decide
	options.Decide = func(c router.Context) (RenderCacheHandlerDecision, error) {
		decision, err := baseDecide(c)
		decision.FreshTTLOverride = 2 * time.Minute
		decision.DisableStale = true
		return decision, err
	}
	calls := 0
	wrapped := WrapRenderCacheHandler(runtime, func(c router.Context) error {
		calls++
		c.SetHeader("Content-Type", "text/html; charset=utf-8")
		return c.SendString("<html>archive</html>")
	}, options)
	performRenderCacheHandlerRequest(t, wrapped, http.MethodGet, "/events/event-1")
	key, original := onlyRenderCacheItem(t, store)
	time.Sleep(time.Millisecond)
	performRenderCacheHandlerRequest(t, wrapped, http.MethodGet, "/events/event-1")
	performRenderCacheHandlerRequest(t, wrapped, http.MethodHead, "/events/event-1")
	renewed := store.items[key]
	if calls != 1 || store.setIfPresentCalls != 2 || store.lastTTL != 2*time.Minute {
		t.Fatalf("handler renewal calls=%d updates=%d ttl=%s", calls, store.setIfPresentCalls, store.lastTTL)
	}
	if !renewed.CreatedAt.Equal(original.CreatedAt) || !renewed.FreshUntil.After(original.FreshUntil) || !renewed.StaleUntil.Equal(renewed.FreshUntil) {
		t.Fatalf("effective override renewal mismatch: original=%+v renewed=%+v", original, renewed)
	}
	observer.assertPairs(t, 3)
}

func TestRenderCacheHandlerSlidingUnsupportedStoreFailurePolicy(t *testing.T) {
	for _, failClosed := range []bool{false, true} {
		t.Run(map[bool]string{false: "fail-open", true: "fail-closed"}[failClosed], func(t *testing.T) {
			store := &testRenderCacheStoreNoTags{items: map[string]RenderedSiteResponse{}}
			runtime := testRenderCacheHandlerRuntime(store)
			runtime.Policy.ExpirationMode = RenderCacheExpirationSliding
			runtime.Policy.FailClosed = failClosed
			calls := 0
			wrapped := WrapRenderCacheHandler(runtime, func(c router.Context) error {
				calls++
				c.SetHeader("Content-Type", "text/html")
				return c.SendString("uncached")
			}, testRenderCacheHandlerOptions("archive", "/events/event-1"))
			response := performRenderCacheHandlerRequest(t, wrapped, http.MethodGet, "/events/event-1")
			wantStatus, wantCalls := http.StatusOK, 1
			if failClosed {
				wantStatus, wantCalls = http.StatusServiceUnavailable, 0
			}
			if response.Code != wantStatus || calls != wantCalls || response.Header().Get("X-Site-Render-Cache-Reason") != renderCacheReasonRenewalUnsupported {
				t.Fatalf("response=%d calls=%d reason=%q", response.Code, calls, response.Header().Get("X-Site-Render-Cache-Reason"))
			}
		})
	}
}

func TestRenderCacheHandlerSlidingRenewalErrorFailurePolicy(t *testing.T) {
	for _, failClosed := range []bool{false, true} {
		t.Run(map[bool]string{false: "fail-open", true: "fail-closed"}[failClosed], func(t *testing.T) {
			store := newTestRenderCacheStore()
			runtime := testRenderCacheHandlerRuntime(store)
			runtime.Policy.ExpirationMode = RenderCacheExpirationSliding
			runtime.Policy.FailClosed = failClosed
			wrapped := WrapRenderCacheHandler(runtime, func(c router.Context) error {
				c.SetHeader("Content-Type", "text/html")
				return c.SendString("cached")
			}, testRenderCacheHandlerOptions("archive", "/events/event-1"))
			performRenderCacheHandlerRequest(t, wrapped, http.MethodGet, "/events/event-1")
			store.setIfPresentErr = errors.New("renewal failed")
			response := performRenderCacheHandlerRequest(t, wrapped, http.MethodGet, "/events/event-1")
			wantStatus := http.StatusOK
			if failClosed {
				wantStatus = http.StatusServiceUnavailable
			}
			if response.Code != wantStatus || response.Header().Get("X-Site-Render-Cache-Reason") != renderCacheReasonRenewalError {
				t.Fatalf("response=%d reason=%q", response.Code, response.Header().Get("X-Site-Render-Cache-Reason"))
			}
		})
	}
}

func TestRenderCacheHandlerGenerationAdvanceWinsBlockedSlidingRenewal(t *testing.T) {
	store := newTestRenderCacheStore()
	runtime := testRenderCacheHandlerRuntime(store)
	runtime.Policy.ExpirationMode = RenderCacheExpirationSliding
	calls := 0
	wrapped := WrapRenderCacheHandler(runtime, func(c router.Context) error {
		calls++
		c.SetHeader("Content-Type", "text/html")
		return c.SendString("generation")
	}, testRenderCacheHandlerOptions("archive", "/events/event-1"))
	performRenderCacheHandlerRequest(t, wrapped, http.MethodGet, "/events/event-1")

	started := make(chan struct{})
	resume := make(chan struct{})
	store.beforeSetIfPresent = func() {
		close(started)
		<-resume
	}
	responseCh := make(chan *httptest.ResponseRecorder, 1)
	go func() { responseCh <- performRenderCacheHandlerRequest(t, wrapped, http.MethodGet, "/events/event-1") }()
	<-started
	if _, err := AdvanceRenderCacheGeneration(context.Background(), runtime, "site:archive"); err != nil {
		t.Fatalf("advance generation: %v", err)
	}
	close(resume)
	if response := <-responseCh; response.Code != http.StatusOK {
		t.Fatalf("in-flight response=%d", response.Code)
	}
	store.beforeSetIfPresent = nil
	postAdvance := performRenderCacheHandlerRequest(t, wrapped, http.MethodGet, "/events/event-1")
	if postAdvance.Header().Get("X-Site-Render-Cache") != renderCacheStatusMiss || calls != 2 {
		t.Fatalf("post-generation status=%q handler calls=%d", postAdvance.Header().Get("X-Site-Render-Cache"), calls)
	}
}

func TestRenderCacheHandlerHEADFirstDoesNotPopulateGET(t *testing.T) {
	store := newTestRenderCacheStore()
	runtime := testRenderCacheHandlerRuntime(store)
	calls := 0
	wrapped := WrapRenderCacheHandler(runtime, func(c router.Context) error {
		calls++
		c.SetHeader("Content-Type", "text/html; charset=utf-8")
		return c.SendString("<html>search</html>")
	}, testRenderCacheHandlerOptions("search", "/search?q=teachings"))

	head := performRenderCacheHandlerRequest(t, wrapped, http.MethodHead, "/search?q=teachings")
	if head.Code != http.StatusOK || head.Body.Len() != 0 {
		t.Fatalf("HEAD miss response=%d body=%q", head.Code, head.Body.String())
	}
	if len(store.items) != 0 || calls != 1 {
		t.Fatalf("HEAD miss populated cache or executed incorrectly: items=%d calls=%d", len(store.items), calls)
	}

	get := performRenderCacheHandlerRequest(t, wrapped, http.MethodGet, "/search?q=teachings")
	if get.Code != http.StatusOK || get.Body.String() != "<html>search</html>" {
		t.Fatalf("GET response=%d body=%q", get.Code, get.Body.String())
	}
	if calls != 2 || len(store.items) != 1 {
		t.Fatalf("GET after HEAD did not render and store: calls=%d items=%d", calls, len(store.items))
	}

	performRenderCacheHandlerRequest(t, wrapped, http.MethodGet, "/search?q=teachings")
	if calls != 2 {
		t.Fatalf("cached GET executed handler: calls=%d", calls)
	}
}

func TestRenderCacheHandlerGenerationChangeDiscardsInFlightFill(t *testing.T) {
	store := newTestRenderCacheStore()
	runtime := testRenderCacheHandlerRuntime(store)
	calls := 0
	wrapped := WrapRenderCacheHandler(runtime, func(c router.Context) error {
		calls++
		if calls == 1 {
			if _, err := AdvanceRenderCacheGeneration(RequestContext(c), runtime, "site:archive"); err != nil {
				t.Fatalf("advance generation: %v", err)
			}
		}
		c.SetHeader("Content-Type", "text/html; charset=utf-8")
		return c.SendString("<html>archive</html>")
	}, testRenderCacheHandlerOptions("archive", "/events/event-1"))

	first := performRenderCacheHandlerRequest(t, wrapped, http.MethodGet, "/events/event-1")
	if first.Code != http.StatusOK || len(store.items) != 0 {
		t.Fatalf("in-flight fill was stored: status=%d items=%d", first.Code, len(store.items))
	}
	if reason := first.Header().Get("X-Site-Render-Cache-Reason"); reason != renderCacheReasonFenceChanged {
		t.Fatalf("fence-change reason=%q", reason)
	}

	performRenderCacheHandlerRequest(t, wrapped, http.MethodGet, "/events/event-1")
	if calls != 2 || len(store.items) != 1 {
		t.Fatalf("next generation did not store: calls=%d items=%d", calls, len(store.items))
	}
	performRenderCacheHandlerRequest(t, wrapped, http.MethodGet, "/events/event-1")
	if calls != 2 {
		t.Fatalf("stored generation did not hit: calls=%d", calls)
	}
}

func TestRenderCacheHandlerSharedGenerationChangeDiscardsInFlightFill(t *testing.T) {
	store := newTestRenderCacheStore()
	runtime := testRenderCacheHandlerRuntime(store)
	options := testRenderCacheHandlerOptions("archive", "/events/event-1")
	baseDecide := options.Decide
	options.Decide = func(c router.Context) (RenderCacheHandlerDecision, error) {
		decision, err := baseDecide(c)
		decision.FenceScopes = []string{RenderCacheSharedFenceScope, "site:archive"}
		return decision, err
	}
	calls := 0
	wrapped := WrapRenderCacheHandler(runtime, func(c router.Context) error {
		calls++
		if calls == 1 {
			if _, err := AdvanceRenderCacheGeneration(RequestContext(c), runtime, RenderCacheSharedFenceScope); err != nil {
				t.Fatalf("advance shared generation: %v", err)
			}
		}
		c.SetHeader("Content-Type", "text/html; charset=utf-8")
		return c.SendString("<html>archive</html>")
	}, options)

	first := performRenderCacheHandlerRequest(t, wrapped, http.MethodGet, "/events/event-1")
	if first.Code != http.StatusOK || len(store.items) != 0 || first.Header().Get("X-Site-Render-Cache-Reason") != renderCacheReasonFenceChanged {
		t.Fatalf("shared-fence response=%d items=%d headers=%v", first.Code, len(store.items), first.Header())
	}
	second := performRenderCacheHandlerRequest(t, wrapped, http.MethodGet, "/events/event-1")
	third := performRenderCacheHandlerRequest(t, wrapped, http.MethodGet, "/events/event-1")
	if second.Header().Get("X-Site-Render-Cache") != renderCacheStatusMiss || third.Header().Get("X-Site-Render-Cache") != renderCacheStatusHit || calls != 2 {
		t.Fatalf("post-shared-generation statuses=%q/%q calls=%d", second.Header().Get("X-Site-Render-Cache"), third.Header().Get("X-Site-Render-Cache"), calls)
	}
}

func TestRenderCacheHandlerServesStaleUnlessSurfaceDisablesIt(t *testing.T) {
	store := newTestRenderCacheStore()
	runtime := testRenderCacheHandlerRuntime(store)
	runtime.Policy.StaleTTL = time.Minute
	calls := 0
	options := testRenderCacheHandlerOptions("archive", "/events/event-1")
	wrapped := WrapRenderCacheHandler(runtime, func(c router.Context) error {
		calls++
		c.SetHeader("Content-Type", "text/html; charset=utf-8")
		return c.SendString("<html>archive</html>")
	}, options)

	performRenderCacheHandlerRequest(t, wrapped, http.MethodGet, "/events/event-1")
	if calls != 1 || len(store.items) != 1 {
		t.Fatalf("initial fill calls=%d entries=%d", calls, len(store.items))
	}
	for key, item := range store.items {
		item.FreshUntil = time.Now().Add(-time.Second)
		item.StaleUntil = time.Now().Add(time.Minute)
		store.items[key] = item
	}
	stale := performRenderCacheHandlerRequest(t, wrapped, http.MethodGet, "/events/event-1")
	if stale.Header().Get("X-Site-Render-Cache") != renderCacheStatusStale || calls != 1 || stale.Body.String() != "<html>archive</html>" {
		t.Fatalf("stale response status=%q calls=%d body=%q", stale.Header().Get("X-Site-Render-Cache"), calls, stale.Body.String())
	}

	options.Decide = func(c router.Context) (RenderCacheHandlerDecision, error) {
		decision, err := testRenderCacheHandlerOptions("archive", "/events/event-1").Decide(c)
		decision.DisableStale = true
		return decision, err
	}
	wrapped = WrapRenderCacheHandler(runtime, func(c router.Context) error {
		calls++
		c.SetHeader("Content-Type", "text/html; charset=utf-8")
		return c.SendString("<html>fresh archive</html>")
	}, options)
	fresh := performRenderCacheHandlerRequest(t, wrapped, http.MethodGet, "/events/event-1")
	if fresh.Header().Get("X-Site-Render-Cache") != renderCacheStatusMiss || calls != 2 || fresh.Body.String() != "<html>fresh archive</html>" {
		t.Fatalf("stale-disabled response status=%q calls=%d body=%q", fresh.Header().Get("X-Site-Render-Cache"), calls, fresh.Body.String())
	}
}

func TestRenderCacheHandlerRequiresExplicitProcessLocalFence(t *testing.T) {
	store := newTestRenderCacheStore()
	runtime := testRenderCacheHandlerRuntime(store)
	calls := 0
	options := testRenderCacheHandlerOptions("archive", "/events/event-1")
	baseDecide := options.Decide
	options.Decide = func(c router.Context) (RenderCacheHandlerDecision, error) {
		decision, err := baseDecide(c)
		decision.AllowProcessLocalFence = false
		return decision, err
	}
	wrapped := WrapRenderCacheHandler(runtime, func(c router.Context) error {
		calls++
		c.SetHeader("Content-Type", "text/html; charset=utf-8")
		return c.SendString("<html>archive</html>")
	}, options)

	response := performRenderCacheHandlerRequest(t, wrapped, http.MethodGet, "/events/event-1")
	if response.Code != http.StatusOK || calls != 1 || len(store.items) != 0 {
		t.Fatalf("fail-open fence response=%d calls=%d items=%d", response.Code, calls, len(store.items))
	}
	if reason := response.Header().Get("X-Site-Render-Cache-Reason"); reason != renderCacheReasonFenceUnavailable {
		t.Fatalf("fence-unavailable reason=%q", reason)
	}

	runtime.Policy.FailClosed = true
	response = performRenderCacheHandlerRequest(t, wrapped, http.MethodGet, "/events/event-1")
	if response.Code != http.StatusServiceUnavailable || calls != 1 {
		t.Fatalf("fail-closed fence response=%d calls=%d", response.Code, calls)
	}
}

func TestRenderCacheHandlerRequiredTagFailureQuarantinesEntryWhenDeleteFails(t *testing.T) {
	tagErr := errors.New("tag index unavailable")
	deleteErr := errors.New("delete unavailable")
	base := newTestRenderCacheStore()
	base.backendKind = RenderCacheBackendValkey
	store := &testRenderCacheHandlerTagCleanupStore{
		testRenderCacheStore: base,
		deleteErr:            deleteErr,
	}
	store.tagErr = tagErr
	runtime := testRenderCacheHandlerRuntime(store)
	runtime.Policy.RequireTagIndex = true
	calls := 0
	wrapped := WrapRenderCacheHandler(runtime, func(c router.Context) error {
		calls++
		c.SetHeader("Content-Type", "text/html; charset=utf-8")
		SetRenderCacheHandlerTags(c, "site:archive")
		return c.SendString("<html>archive</html>")
	}, testRenderCacheHandlerOptions("archive", "/events/event-1"))

	first := performRenderCacheHandlerRequest(t, wrapped, http.MethodGet, "/events/event-1")
	if first.Code != http.StatusOK || first.Body.String() != "<html>archive</html>" || calls != 1 {
		t.Fatalf("first response=%d body=%q calls=%d", first.Code, first.Body.String(), calls)
	}
	if reason := first.Header().Get("X-Site-Render-Cache-Reason"); reason != renderCacheReasonTagIndexWriteError {
		t.Fatalf("tag failure reason=%q", reason)
	}
	if len(store.items) != 1 {
		t.Fatalf("quarantined entries=%d, want 1 tombstone", len(store.items))
	}
	for _, item := range store.items {
		if len(item.Body) != 0 || renderCacheResponseFreshness(item, time.Now()) != renderCacheFreshnessExpired {
			t.Fatalf("failed tag entry remains serveable: %#v", item)
		}
	}

	second := performRenderCacheHandlerRequest(t, wrapped, http.MethodGet, "/events/event-1")
	if second.Code != http.StatusOK || second.Body.String() != "<html>archive</html>" || calls != 2 {
		t.Fatalf("second response=%d body=%q calls=%d", second.Code, second.Body.String(), calls)
	}
	if status := second.Header().Get("X-Site-Render-Cache"); status == renderCacheStatusHit {
		t.Fatalf("quarantined entry was replayed as a hit")
	}
}

func TestMemoryRenderCacheGenerationStore(t *testing.T) {
	store := newMemoryRenderCacheGenerationStore()
	if store.Shared() {
		t.Fatal("memory generation store must not claim cross-process visibility")
	}
	if got, err := store.ReadGeneration(context.Background(), "site:archive"); err != nil || got != 0 {
		t.Fatalf("initial generation=%d err=%v", got, err)
	}
	if got, err := store.AdvanceGeneration(context.Background(), "site:archive"); err != nil || got != 1 {
		t.Fatalf("advanced generation=%d err=%v", got, err)
	}
	if got, err := store.ReadGeneration(context.Background(), "site:archive"); err != nil || got != 1 {
		t.Fatalf("read generation=%d err=%v", got, err)
	}
	if _, err := store.AdvanceGeneration(context.Background(), "unsafe scope"); err == nil {
		t.Fatal("expected invalid generation scope to fail")
	}
}

func testRenderCacheHandlerRuntime(store RenderCacheStore, observers ...RenderCacheRequestObserver) *RenderCacheRuntime {
	return &RenderCacheRuntime{
		Store:       store,
		Generations: newMemoryRenderCacheGenerationStore(),
		Policy: normalizeRenderCachePolicy(RenderCachePolicy{
			Enabled:      true,
			FreshTTL:     time.Minute,
			StaleTTL:     time.Minute,
			DebugHeaders: true,
		}),
		RequestObservers: observers,
	}
}

func testRenderCacheHandlerOptions(surface, canonical string) RenderCacheHandlerOptions {
	return RenderCacheHandlerOptions{
		ObservationSurface: func(router.Context) string { return surface },
		Decide: func(router.Context) (RenderCacheHandlerDecision, error) {
			return RenderCacheHandlerDecision{
				Cacheable:              true,
				Surface:                surface,
				CanonicalPath:          canonical,
				FenceScope:             "site:" + surface,
				RequireFence:           true,
				AllowProcessLocalFence: true,
			}, nil
		}}
}

func performRenderCacheHandlerRequest(t *testing.T, handler router.HandlerFunc, method, target string) *httptest.ResponseRecorder {
	t.Helper()
	recorder := httptest.NewRecorder()
	request := httptest.NewRequestWithContext(context.Background(), method, target, nil)
	context := router.NewHTTPRouterContext(recorder, request, nil, nil)
	if err := handler(context); err != nil {
		t.Fatalf("%s %s: %v", method, target, err)
	}
	return recorder
}

type testRenderCacheHandlerObserver struct {
	mu           sync.Mutex
	observations []RenderCacheRequestObservation
}

type testRenderCacheHandlerTagCleanupStore struct {
	*testRenderCacheStore
	deleteErr error
}

type blockingRenderCacheHandlerStore struct {
	mu                 sync.Mutex
	base               *testRenderCacheStore
	initialLookups     int
	wantInitialLookups int
	initialLookupsDone chan struct{}
	initialDoneOnce    sync.Once
}

func newBlockingRenderCacheHandlerStore(wantInitialLookups int) *blockingRenderCacheHandlerStore {
	return &blockingRenderCacheHandlerStore{
		base:               newTestRenderCacheStore(),
		wantInitialLookups: wantInitialLookups,
		initialLookupsDone: make(chan struct{}),
	}
}

func (s *blockingRenderCacheHandlerStore) Get(ctx context.Context, key string) (RenderedSiteResponse, bool, error) {
	s.mu.Lock()
	value, ok, err := s.base.Get(ctx, key)
	s.initialLookups++
	ready := s.initialLookups >= s.wantInitialLookups
	s.mu.Unlock()
	if ready {
		s.initialDoneOnce.Do(func() { close(s.initialLookupsDone) })
	}
	return value, ok, err
}

func (s *blockingRenderCacheHandlerStore) Set(ctx context.Context, key string, value RenderedSiteResponse, ttl time.Duration) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.base.Set(ctx, key, value, ttl)
}

func (s *blockingRenderCacheHandlerStore) Delete(ctx context.Context, key string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.base.Delete(ctx, key)
}

func (s *blockingRenderCacheHandlerStore) AddTagsForKey(ctx context.Context, key string, tags []string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.base.AddTagsForKey(ctx, key, tags)
}

func (s *blockingRenderCacheHandlerStore) InvalidateTags(ctx context.Context, tags []string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.base.InvalidateTags(ctx, tags)
}

func (*blockingRenderCacheHandlerStore) RenderCacheBackendKind() string {
	return RenderCacheBackendMemory
}

func (s *testRenderCacheHandlerTagCleanupStore) Delete(context.Context, string) error {
	return s.deleteErr
}

func (o *testRenderCacheHandlerObserver) ObserveRenderCacheRequest(_ context.Context, observation RenderCacheRequestObservation) {
	o.mu.Lock()
	defer o.mu.Unlock()
	o.observations = append(o.observations, observation)
}

func (o *testRenderCacheHandlerObserver) assertPairs(t *testing.T, requests int) {
	t.Helper()
	o.mu.Lock()
	defer o.mu.Unlock()
	if len(o.observations) != requests*2 {
		t.Fatalf("observations=%d want=%d: %+v", len(o.observations), requests*2, o.observations)
	}
	for index := 0; index < len(o.observations); index += 2 {
		if o.observations[index].Phase != RenderCacheRequestPhaseEvaluated || o.observations[index+1].Phase != RenderCacheRequestPhaseTerminal {
			t.Fatalf("request observation pair %d is not evaluated/terminal: %+v", index/2, o.observations[index:index+2])
		}
		if o.observations[index].Surface == "" || o.observations[index].Surface != o.observations[index+1].Surface {
			t.Fatalf("request observation pair %d lost its bounded surface: %+v", index/2, o.observations[index:index+2])
		}
	}
}
