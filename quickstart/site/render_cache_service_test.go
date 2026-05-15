package site

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	debugregistry "github.com/goliatone/go-admin/debug"
)

func TestNewRenderCacheRuntimeBuildsMemoryRuntimeWithObserver(t *testing.T) {
	runtime, err := NewRenderCacheRuntime(context.Background(), RenderCacheConfig{
		Enabled:            true,
		Backend:            RenderCacheBackendMemory,
		FreshTTL:           45 * time.Second,
		StaleTTL:           15 * time.Second,
		DebugHeaders:       true,
		DebugKeys:          true,
		RenderVersion:      "test-build",
		Namespace:          "test-site",
		RequireTagIndex:    true,
		MaxCaptureBodySize: 1024,
	}, RenderCachePolicy{
		Enabled: true,
	})
	if err != nil {
		t.Fatalf("NewRenderCacheRuntime: %v", err)
	}
	if runtime == nil || runtime.Store == nil || runtime.Observer == nil {
		t.Fatalf("expected active runtime with observed store, got %#v", runtime)
	}
	if !runtime.Diagnostic.Configured || !runtime.Diagnostic.Active || runtime.Diagnostic.Backend != RenderCacheBackendMemory {
		t.Fatalf("unexpected diagnostic: %+v", runtime.Diagnostic)
	}
	if got := RenderCacheBackendKind(runtime.Store); got != RenderCacheBackendMemory {
		t.Fatalf("expected memory backend descriptor, got %q", got)
	}
	if !RenderCacheStoreSupportsTagInvalidation(runtime.Store) || !RenderCacheStoreSupportsPrefixInvalidation(runtime.Store) {
		t.Fatalf("expected memory store to preserve tag and prefix invalidation capabilities")
	}
	if RenderCacheStoreSupportsClose(runtime.Store) {
		t.Fatalf("memory runtime should not advertise close support")
	}
	if runtime.Policy.FreshTTL != 45*time.Second || runtime.Policy.StaleTTL != 15*time.Second {
		t.Fatalf("expected runtime config TTLs to be reflected in policy, got %+v", runtime.Policy)
	}
	if !runtime.Policy.DebugHeaders || !runtime.Policy.DebugKeys || !runtime.Policy.RequireTagIndex {
		t.Fatalf("expected runtime config booleans to be reflected in policy, got %+v", runtime.Policy)
	}
	if runtime.Policy.SiteNamespace != "test-site" || runtime.Policy.RenderVersion != "test-build" || runtime.Policy.MaxCaptureBodySize != 1024 {
		t.Fatalf("expected runtime config identity/capture fields to be reflected in policy, got %+v", runtime.Policy)
	}
}

func TestNewRenderCacheRuntimeDisabledBuildsInactiveRuntime(t *testing.T) {
	runtime, err := NewRenderCacheRuntime(context.Background(), RenderCacheConfig{
		Enabled: false,
		Backend: RenderCacheBackendMemory,
	}, RenderCachePolicy{
		Enabled:      true,
		DebugHeaders: true,
	})
	if err != nil {
		t.Fatalf("NewRenderCacheRuntime: %v", err)
	}
	if runtime == nil || runtime.Store != nil || runtime.Observer != nil {
		t.Fatalf("expected disabled inactive runtime, got %#v", runtime)
	}
	if runtime.Diagnostic.Configured || runtime.Diagnostic.Active {
		t.Fatalf("expected disabled diagnostic, got %+v", runtime.Diagnostic)
	}
	if runtime.Policy.Enabled {
		t.Fatalf("runtime config disabled state should be reflected in policy, got %+v", runtime.Policy)
	}
}

func TestRenderCacheRuntimeConfigOverridesPolicyOverlap(t *testing.T) {
	runtime, err := NewRenderCacheRuntime(context.Background(), RenderCacheConfig{
		Enabled:  true,
		Backend:  RenderCacheBackendMemory,
		FreshTTL: 10 * time.Second,
		StaleTTL: 0,
	}, RenderCachePolicy{
		Enabled:         true,
		FreshTTL:        time.Minute,
		StaleTTL:        time.Hour,
		DebugHeaders:    true,
		DebugKeys:       true,
		FailClosed:      true,
		RequireTagIndex: true,
	})
	if err != nil {
		t.Fatalf("NewRenderCacheRuntime: %v", err)
	}
	if runtime.Policy.FreshTTL != 10*time.Second || runtime.Policy.StaleTTL != 0 {
		t.Fatalf("expected config TTLs to override policy, got %+v", runtime.Policy)
	}
	if runtime.Policy.DebugHeaders || runtime.Policy.DebugKeys || runtime.Policy.FailClosed || runtime.Policy.RequireTagIndex {
		t.Fatalf("expected config booleans to override policy booleans, got %+v", runtime.Policy)
	}
}

func TestNewRenderCacheRuntimeFailOpenRecordsSanitizedValkeyStartupError(t *testing.T) {
	runtime, err := NewRenderCacheRuntime(context.Background(), RenderCacheConfig{
		Enabled:    true,
		Backend:    RenderCacheBackendValkey,
		FailClosed: false,
		Valkey: RenderCacheValkeyConfig{
			URL:       "redis://user:secret@127.0.0.1:1?password=secret",
			Username:  "user",
			Password:  "secret",
			Namespace: "test",
		},
	}, RenderCachePolicy{Enabled: true})
	if err != nil {
		t.Fatalf("expected fail-open valkey startup to return nil error, got %v", err)
	}
	if runtime == nil || runtime.Store != nil || runtime.Observer != nil {
		t.Fatalf("expected inactive fail-open runtime, got %#v", runtime)
	}
	if runtime.Diagnostic.Active || runtime.Diagnostic.Error == "" {
		t.Fatalf("expected inactive diagnostic with error, got %+v", runtime.Diagnostic)
	}
	if containsAny(runtime.Diagnostic.Error, "user", "secret", "password=secret") {
		t.Fatalf("diagnostic leaked credentials: %q", runtime.Diagnostic.Error)
	}
}

func TestNewRenderCacheRuntimeFailClosedReturnsValkeyStartupError(t *testing.T) {
	runtime, err := NewRenderCacheRuntime(context.Background(), RenderCacheConfig{
		Enabled:    true,
		Backend:    RenderCacheBackendValkey,
		FailClosed: true,
		Valkey: RenderCacheValkeyConfig{
			Address:   "127.0.0.1:1",
			Namespace: "test",
		},
	}, RenderCachePolicy{Enabled: true})
	if err == nil {
		t.Fatal("expected fail-closed valkey startup error")
	}
	if runtime == nil || runtime.Diagnostic.ErrorKind != "store_initialization_failed" || !runtime.Diagnostic.FailClosed {
		t.Fatalf("expected fail-closed startup diagnostic, got runtime=%#v err=%v", runtime, err)
	}
}

func TestNewRenderCacheRuntimeInvalidValkeyURLFailsWithSanitizedDiagnostic(t *testing.T) {
	runtime, err := NewRenderCacheRuntime(context.Background(), RenderCacheConfig{
		Enabled: true,
		Backend: RenderCacheBackendValkey,
		Valkey: RenderCacheValkeyConfig{
			URL:       "redis://user:secret@%zz",
			Username:  "user",
			Password:  "secret",
			Namespace: "test",
		},
	}, RenderCachePolicy{Enabled: true})
	if err == nil {
		t.Fatal("expected invalid valkey URL error")
	}
	if runtime == nil || runtime.Diagnostic.ErrorKind != "invalid_configuration" {
		t.Fatalf("expected invalid configuration diagnostic, got runtime=%#v err=%v", runtime, err)
	}
	if containsAny(runtime.Diagnostic.Error, "user", "secret") {
		t.Fatalf("diagnostic leaked credentials: %q", runtime.Diagnostic.Error)
	}
}

func TestNewRenderCacheRuntimeUnsupportedBackendIsInvalidConfiguration(t *testing.T) {
	runtime, err := NewRenderCacheRuntime(context.Background(), RenderCacheConfig{
		Enabled:    true,
		Backend:    "pebble",
		FailClosed: false,
	}, RenderCachePolicy{Enabled: true})
	if err == nil {
		t.Fatal("expected unsupported backend error")
	}
	if runtime == nil || runtime.Store != nil || runtime.Diagnostic.ErrorKind != "invalid_configuration" {
		t.Fatalf("expected invalid configuration diagnostic, got runtime=%#v err=%v", runtime, err)
	}
}

func TestBuildRenderCacheValkeyClientOptionMapsConfig(t *testing.T) {
	option, err := buildRenderCacheValkeyClientOption(RenderCacheValkeyConfig{
		URL:           "rediss://url-user:url-pass@cache.example.test:6380/4",
		Address:       "ignored.example.test:6379",
		Username:      "explicit-user",
		Password:      "explicit-pass",
		DB:            6,
		TLSEnabled:    true,
		TLSSkipVerify: true,
	})
	if err != nil {
		t.Fatalf("buildRenderCacheValkeyClientOption: %v", err)
	}
	if len(option.InitAddress) != 1 || option.InitAddress[0] != "cache.example.test:6380" {
		t.Fatalf("expected URL address to win, got %+v", option.InitAddress)
	}
	if option.Username != "explicit-user" || option.Password != "explicit-pass" || option.SelectDB != 6 {
		t.Fatalf("expected explicit auth/db overrides, got username=%q password=%q db=%d", option.Username, option.Password, option.SelectDB)
	}
	if option.TLSConfig == nil || !option.TLSConfig.InsecureSkipVerify {
		t.Fatalf("expected TLS skip verify config, got %+v", option.TLSConfig)
	}
	if !option.DisableCache || !option.ForceSingleClient {
		t.Fatalf("expected broad-compatible valkey client options, got %+v", option)
	}
	if option.Dialer.KeepAlive != defaultRenderCacheValkeyDialKeepAlive {
		t.Fatalf("expected keepalive %s, got %s", defaultRenderCacheValkeyDialKeepAlive, option.Dialer.KeepAlive)
	}
}

func TestRenderCacheDebugObserverRecordsSnapshotAndClear(t *testing.T) {
	store := newTestRenderCacheStore()
	store.backendKind = RenderCacheBackendValkey
	observer := NewRenderCacheDebugObserver(store, RenderCacheConfig{
		Enabled:   true,
		Backend:   RenderCacheBackendValkey,
		DebugKeys: true,
	})
	wrapped := NewRenderCacheDebugObservedStore(observer)
	response := RenderedSiteResponse{
		Status:      200,
		ContentType: "text/html",
		Body:        []byte("<main>ok</main>"),
		Tags:        []string{RenderCacheAllSiteTag},
		FreshUntil:  time.Now().Add(time.Minute),
	}
	if err := wrapped.Set(context.Background(), RenderCacheKeyPrefix+"path=%2F", response, time.Minute); err != nil {
		t.Fatalf("Set: %v", err)
	}
	if tagger, ok := wrapped.(RenderCacheTagInvalidator); ok {
		if err := tagger.AddTagsForKey(context.Background(), RenderCacheKeyPrefix+"path=%2F", []string{RenderCacheAllSiteTag}); err != nil {
			t.Fatalf("AddTagsForKey: %v", err)
		}
	} else {
		t.Fatal("expected tag invalidation capability")
	}
	if _, ok, err := wrapped.Get(context.Background(), RenderCacheKeyPrefix+"path=%2F"); err != nil || !ok {
		t.Fatalf("Get hit ok=%v err=%v", ok, err)
	}
	command := observer.ClearAll(context.Background())
	if command.Outcome != "ok" || command.Mode != "tag" {
		t.Fatalf("unexpected clear command: %+v", command)
	}
	snapshot := observer.Snapshot(&RenderCacheRuntime{
		Config: RenderCacheConfig{Enabled: true, Backend: RenderCacheBackendValkey, DebugKeys: true},
		Store:  wrapped,
		Policy: RenderCachePolicy{Enabled: true},
	})
	if snapshot.Counters.Writes != 1 || snapshot.Counters.Hits != 1 || snapshot.Counters.Clears != 1 {
		t.Fatalf("unexpected counters: %+v", snapshot.Counters)
	}
	if snapshot.LastCommand == nil || snapshot.LastCommand.Outcome != "ok" {
		t.Fatalf("expected clear command in snapshot, got %+v", snapshot.LastCommand)
	}
	if len(snapshot.ObservedKeys) == 0 || snapshot.ObservedKeys[0].RawKey == "" {
		t.Fatalf("expected raw observed key when debug keys enabled, got %+v", snapshot.ObservedKeys)
	}
}

func TestRenderCacheDebugObserverRecordsDeleteAndPrefixClear(t *testing.T) {
	store := &testRenderCachePrefixStore{
		items:       map[string]RenderedSiteResponse{},
		backendKind: RenderCacheBackendMemory,
	}
	observer := NewRenderCacheDebugObserver(store, RenderCacheConfig{Enabled: true, Backend: RenderCacheBackendMemory})
	wrapped := NewRenderCacheDebugObservedStore(observer)
	if err := wrapped.Set(context.Background(), RenderCacheKeyPrefix+"path=%2Fprefix", RenderedSiteResponse{Status: 200}, time.Minute); err != nil {
		t.Fatalf("Set: %v", err)
	}
	if err := wrapped.Delete(context.Background(), RenderCacheKeyPrefix+"path=%2Fprefix"); err != nil {
		t.Fatalf("Delete: %v", err)
	}
	if err := wrapped.Set(context.Background(), RenderCacheKeyPrefix+"path=%2Fprefix", RenderedSiteResponse{Status: 200}, time.Minute); err != nil {
		t.Fatalf("Set after delete: %v", err)
	}
	prefixInvalidator, ok := wrapped.(RenderCachePrefixInvalidator)
	if !ok {
		t.Fatalf("expected prefix invalidator capability, got %T", wrapped)
	}
	if err := prefixInvalidator.DeleteByKeyPrefix(context.Background(), RenderCacheKeyPrefix); err != nil {
		t.Fatalf("DeleteByKeyPrefix: %v", err)
	}
	if store.deletedPrefix != RenderCacheKeyPrefix {
		t.Fatalf("expected observed prefix invalidation to use render key prefix, got %q", store.deletedPrefix)
	}
	if err := wrapped.Set(context.Background(), RenderCacheKeyPrefix+"path=%2Fprefix", RenderedSiteResponse{Status: 200}, time.Minute); err != nil {
		t.Fatalf("Set after prefix delete: %v", err)
	}
	command := observer.ClearAll(context.Background())
	if command.Outcome != "ok" || command.Mode != "prefix" || store.deletedPrefix != RenderCacheKeyPrefix {
		t.Fatalf("expected prefix clear, command=%+v store=%+v", command, store)
	}
	snapshot := observer.Snapshot(&RenderCacheRuntime{Config: RenderCacheConfig{Enabled: true}, Store: wrapped})
	if snapshot.Counters.Deletes != 1 || snapshot.Counters.Clears != 1 || snapshot.Counters.Invalidations != 1 {
		t.Fatalf("expected delete/clear counters, got %+v", snapshot.Counters)
	}
}

func TestRenderCacheDebugObserverRecordsUnsupportedClear(t *testing.T) {
	store := &testRenderCacheStoreNoTags{items: map[string]RenderedSiteResponse{}, backendKind: "custom"}
	observer := NewRenderCacheDebugObserver(store, RenderCacheConfig{Enabled: true, Backend: "custom"})
	command := observer.ClearAll(context.Background())
	if command.Outcome != "unsupported" || command.Mode != "none" {
		t.Fatalf("expected unsupported clear, got %+v", command)
	}
	snapshot := observer.Snapshot(&RenderCacheRuntime{Config: RenderCacheConfig{Enabled: true}, Store: store})
	if snapshot.Counters.Clears != 1 || snapshot.Counters.Errors != 0 || snapshot.LastCommand == nil {
		t.Fatalf("expected unsupported clear to be recorded without error, got %+v", snapshot)
	}
}

func TestRegisterRenderCacheDebugPanelProvidesSnapshotAndClear(t *testing.T) {
	debugregistry.UnregisterPanel(RenderCacheDebugPanelID)
	t.Cleanup(func() { debugregistry.UnregisterPanel(RenderCacheDebugPanelID) })

	store := newTestRenderCacheStore()
	store.backendKind = RenderCacheBackendValkey
	observer := NewRenderCacheDebugObserver(store, RenderCacheConfig{Enabled: true, Backend: RenderCacheBackendValkey})
	runtime := &RenderCacheRuntime{
		Config:   RenderCacheConfig{Enabled: true, Backend: RenderCacheBackendValkey},
		Store:    NewRenderCacheDebugObservedStore(observer),
		Policy:   RenderCachePolicy{Enabled: true},
		Observer: observer,
		Diagnostic: RenderCacheStartupDiagnostic{
			Configured: true,
			Active:     true,
			Backend:    RenderCacheBackendValkey,
			RecordedAt: time.Now().UTC(),
		},
	}
	if err := RegisterRenderCacheDebugPanel(runtime); err != nil {
		t.Fatalf("RegisterRenderCacheDebugPanel: %v", err)
	}
	registration, ok := debugregistry.Panel(RenderCacheDebugPanelID)
	if !ok {
		t.Fatal("expected debug panel registration")
	}
	if registration.Definition.SnapshotKey != RenderCacheDebugPanelSnapshot || registration.Definition.Category != "site" {
		t.Fatalf("unexpected panel definition: %+v", registration.Definition)
	}
	if snapshot, ok := registration.Snapshot(context.Background()).(RenderCacheDebugSnapshot); !ok || !snapshot.Configured {
		t.Fatalf("unexpected panel snapshot: %#v", snapshot)
	}
	if err := registration.Clear(context.Background()); err != nil {
		t.Fatalf("clear: %v", err)
	}
	snapshot, ok := registration.Snapshot(context.Background()).(RenderCacheDebugSnapshot)
	if !ok || snapshot.LastCommand == nil {
		t.Fatalf("expected clear command in snapshot after clear, got %#v", snapshot)
	}
}

func TestRenderCacheDebugObserverBoundsLogs(t *testing.T) {
	store := newTestRenderCacheStore()
	store.backendKind = RenderCacheBackendValkey
	observer := NewRenderCacheDebugObserver(store, RenderCacheConfig{Enabled: true, Backend: RenderCacheBackendValkey})
	wrapped := NewRenderCacheDebugObservedStore(observer)
	for i := range renderCacheDebugOperationsCap + 25 {
		key := RenderCacheKeyPrefix + "path=%2Fbounded-" + time.Duration(i).String()
		if err := wrapped.Set(context.Background(), key, RenderedSiteResponse{Status: 200}, time.Minute); err != nil {
			t.Fatalf("Set[%d]: %v", i, err)
		}
	}
	store.err = errors.New("cache unavailable")
	for i := range renderCacheDebugErrorsCap + 10 {
		_, _, _ = wrapped.Get(context.Background(), RenderCacheKeyPrefix+"path=%2Ferror-"+time.Duration(i).String())
	}
	snapshot := observer.Snapshot(&RenderCacheRuntime{Config: RenderCacheConfig{Enabled: true}, Store: wrapped})
	if len(snapshot.RecentOperations) != renderCacheDebugOperationsCap {
		t.Fatalf("expected bounded operations %d, got %d", renderCacheDebugOperationsCap, len(snapshot.RecentOperations))
	}
	if len(snapshot.ObservedKeys) != renderCacheDebugKeysCap {
		t.Fatalf("expected bounded keys %d, got %d", renderCacheDebugKeysCap, len(snapshot.ObservedKeys))
	}
	if len(snapshot.RecentErrors) != renderCacheDebugErrorsCap {
		t.Fatalf("expected bounded errors %d, got %d", renderCacheDebugErrorsCap, len(snapshot.RecentErrors))
	}
}

func TestRenderCacheDebugObserverPreservesOptionalCapabilities(t *testing.T) {
	base := &testRenderCacheStoreNoTags{items: map[string]RenderedSiteResponse{}, backendKind: "custom"}
	observer := NewRenderCacheDebugObserver(base, RenderCacheConfig{Enabled: true, Backend: "custom"})
	wrapped := NewRenderCacheDebugObservedStore(observer)
	if _, ok := wrapped.(RenderCacheTagInvalidator); ok {
		t.Fatal("wrapper must not advertise tag invalidation when base store lacks it")
	}
	if _, ok := wrapped.(RenderCachePrefixInvalidator); ok {
		t.Fatal("wrapper must not advertise prefix invalidation when base store lacks it")
	}
	if _, ok := wrapped.(interface{ Close() error }); ok {
		t.Fatal("wrapper must not advertise close when base store lacks it")
	}
	if got := RenderCacheBackendKind(wrapped); got != "custom" {
		t.Fatalf("expected backend descriptor to be preserved, got %q", got)
	}
}

func TestRenderCacheDebugObserverRecordsErrors(t *testing.T) {
	store := newTestRenderCacheStore()
	store.err = errors.New("cache unavailable")
	observer := NewRenderCacheDebugObserver(store, RenderCacheConfig{Enabled: true, Backend: "custom"})
	wrapped := NewRenderCacheDebugObservedStore(observer)
	if _, _, err := wrapped.Get(context.Background(), RenderCacheKeyPrefix+"path=%2Ferror"); err == nil {
		t.Fatal("expected get error")
	}
	snapshot := observer.Snapshot(&RenderCacheRuntime{Config: RenderCacheConfig{Enabled: true}, Store: wrapped})
	if snapshot.Counters.Errors != 1 || len(snapshot.RecentErrors) != 1 {
		t.Fatalf("expected recorded error, got counters=%+v errors=%+v", snapshot.Counters, snapshot.RecentErrors)
	}
}

func containsAny(value string, needles ...string) bool {
	for _, needle := range needles {
		if needle != "" && strings.Contains(value, needle) {
			return true
		}
	}
	return false
}

type testRenderCachePrefixStore struct {
	items         map[string]RenderedSiteResponse
	backendKind   string
	deletedPrefix string
}

func (s *testRenderCachePrefixStore) Get(_ context.Context, key string) (RenderedSiteResponse, bool, error) {
	item, ok := s.items[key]
	return item, ok, nil
}

func (s *testRenderCachePrefixStore) Set(_ context.Context, key string, value RenderedSiteResponse, _ time.Duration) error {
	s.items[key] = value
	return nil
}

func (s *testRenderCachePrefixStore) Delete(_ context.Context, key string) error {
	delete(s.items, key)
	return nil
}

func (s *testRenderCachePrefixStore) DeleteByKeyPrefix(_ context.Context, prefix string) error {
	s.deletedPrefix = prefix
	for key := range s.items {
		if strings.HasPrefix(key, prefix) {
			delete(s.items, key)
		}
	}
	return nil
}

func (s *testRenderCachePrefixStore) RenderCacheBackendKind() string {
	return s.backendKind
}
