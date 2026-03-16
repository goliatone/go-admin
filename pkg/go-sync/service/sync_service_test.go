package service_test

import (
	"context"
	"errors"
	"log/slog"
	"maps"
	"strings"
	"testing"
	"time"

	"github.com/goliatone/go-admin/pkg/go-sync/core"
	"github.com/goliatone/go-admin/pkg/go-sync/observability"
	"github.com/goliatone/go-admin/pkg/go-sync/service"
	"github.com/goliatone/go-admin/pkg/go-sync/store"
)

func TestScopeIdempotencyKeyUsesStableUserIntentScope(t *testing.T) {
	key, err := service.ScopeIdempotencyKey(core.MutationInput{
		ResourceRef: core.ResourceRef{
			Kind: "agreement_draft",
			ID:   "draft_123",
			Scope: map[string]string{
				"tenant": "tenant_1",
				"org":    "org_9",
			},
		},
		Operation:      "send",
		IdempotencyKey: "send-1",
		ActorID:        "user_42",
	})
	if err != nil {
		t.Fatalf("build scoped idempotency key: %v", err)
	}

	expected := "v1|agreement_draft|draft_123|send|actor=user_42|scope=org=org_9,tenant=tenant_1|key=send-1"
	if key != expected {
		t.Fatalf("expected scoped idempotency key %q, got %q", expected, key)
	}
}

func TestScopeIdempotencyKeyRejectsMissingActorForIdempotentMutation(t *testing.T) {
	_, err := service.ScopeIdempotencyKey(core.MutationInput{
		ResourceRef:    seededRef(),
		Operation:      "send",
		IdempotencyKey: "send-1",
	})
	if err == nil {
		t.Fatal("expected actor validation error")
	}
	if !core.HasCode(err, core.CodeInvalidMutation) {
		t.Fatalf("expected invalid mutation code, got %v", err)
	}
}

func TestSyncServiceGetLoadsSnapshotAndEmitsReadObservability(t *testing.T) {
	ctx := context.Background()
	now := time.Date(2026, time.March, 12, 18, 0, 0, 0, time.UTC)
	resourceStore := store.NewMemoryResourceStore(seedSnapshot(now, 12))
	metrics := &captureMetrics{}
	logger := &captureLogger{}

	svc := mustNewSyncService(t, resourceStore, nil, service.WithMetrics(metrics), service.WithLogger(logger))
	snapshot, err := svc.Get(ctx, seededRef())
	if err != nil {
		t.Fatalf("get snapshot: %v", err)
	}

	if snapshot.Revision != 12 {
		t.Fatalf("expected revision 12, got %d", snapshot.Revision)
	}
	if len(metrics.reads) != 1 || !metrics.reads[0].success {
		t.Fatalf("expected one successful read metric, got %+v", metrics.reads)
	}
	if len(logger.entries) != 1 || logger.entries[0].level != slog.LevelInfo {
		t.Fatalf("expected one info read log, got %+v", logger.entries)
	}
}

func TestSyncServiceMutateReplaysStoredIdempotentResult(t *testing.T) {
	ctx := context.Background()
	now := time.Date(2026, time.March, 12, 18, 0, 0, 0, time.UTC)
	resourceStore := store.NewMemoryResourceStore(seedSnapshot(now, 12))
	resourceStore.Now = func() time.Time { return now.Add(2 * time.Second) }

	idempotencyStore := store.NewMemoryIdempotencyStore()
	idempotencyStore.Now = func() time.Time { return now }
	metrics := &captureMetrics{}
	logger := &captureLogger{}

	svc := mustNewSyncService(t,
		resourceStore,
		idempotencyStore,
		service.WithMetrics(metrics),
		service.WithLogger(logger),
		service.WithIdempotencyTTL(90*time.Minute),
	)

	input := seededMutation()
	first, err := svc.Mutate(ctx, input)
	if err != nil {
		t.Fatalf("first mutate: %v", err)
	}
	second, err := svc.Mutate(ctx, input)
	if err != nil {
		t.Fatalf("second mutate: %v", err)
	}

	if first.Replay {
		t.Fatal("expected first mutation to be applied, not replayed")
	}
	if !second.Replay {
		t.Fatal("expected second mutation to be replayed")
	}
	if second.Snapshot.Revision != first.Snapshot.Revision {
		t.Fatalf("expected replay revision %d, got %d", first.Snapshot.Revision, second.Snapshot.Revision)
	}
	if resourceStore.LastMutateInput.ExpectedRevision != 12 {
		t.Fatalf("expected one applied mutation against revision 12, got %+v", resourceStore.LastMutateInput)
	}
	expectedKey, err := service.ScopeIdempotencyKey(input)
	if err != nil {
		t.Fatalf("build scoped idempotency key: %v", err)
	}
	if idempotencyStore.LastReserveKey != expectedKey || idempotencyStore.LastCommitKey != expectedKey {
		t.Fatalf("expected scoped idempotency key %q, got reserve=%q commit=%q", expectedKey, idempotencyStore.LastReserveKey, idempotencyStore.LastCommitKey)
	}
	if idempotencyStore.LastTTL != 90*time.Minute {
		t.Fatalf("expected idempotency TTL 90m, got %s", idempotencyStore.LastTTL)
	}
	if metrics.replays != 1 {
		t.Fatalf("expected one replay metric, got %d", metrics.replays)
	}
	if !logger.containsAttr("idempotency_key", "send-1") {
		t.Fatalf("expected replay logs to include idempotency key, got %+v", logger.entries)
	}
}

func TestSyncServiceMutateRecoversReplayPersistenceAfterCommitFailure(t *testing.T) {
	ctx := context.Background()
	now := time.Date(2026, time.March, 12, 18, 0, 0, 0, time.UTC)
	resourceStore := store.NewMemoryResourceStore(seedSnapshot(now, 12))
	resourceStore.Now = func() time.Time { return now.Add(2 * time.Second) }

	idempotencyStore := store.NewMemoryIdempotencyStore()
	idempotencyStore.Now = func() time.Time { return now }
	idempotencyStore.CommitError = errors.New("commit unavailable")
	metrics := &captureMetrics{}
	logger := &captureLogger{}

	svc := mustNewSyncService(t,
		resourceStore,
		idempotencyStore,
		service.WithMetrics(metrics),
		service.WithLogger(logger),
	)

	input := seededMutation()
	first, err := svc.Mutate(ctx, input)
	if err != nil {
		t.Fatalf("expected recovery after replay commit failure, got %v", err)
	}
	if first.Replay {
		t.Fatalf("expected first mutation not to be a replay, got %+v", first)
	}
	if resourceStore.MutateCalls != 1 {
		t.Fatalf("expected one applied mutation, got %d", resourceStore.MutateCalls)
	}

	current, getErr := resourceStore.Get(ctx, seededRef())
	if getErr != nil {
		t.Fatalf("load current snapshot: %v", getErr)
	}
	if current.Revision != 13 {
		t.Fatalf("expected mutation to be applied once at revision 13, got %d", current.Revision)
	}

	replayed, err := svc.Mutate(ctx, input)
	if err == nil {
		if !replayed.Replay {
			t.Fatalf("expected recovered retry to replay original result, got %+v", replayed)
		}
	} else {
		t.Fatalf("expected replay after recovered commit failure, got %v", err)
	}
	if resourceStore.MutateCalls != 1 {
		t.Fatalf("expected retry to avoid a second mutate call, got %d", resourceStore.MutateCalls)
	}
	if !logger.containsAttr("recovered_commit", "true") {
		t.Fatalf("expected recovered commit log entry, got %+v", logger.entries)
	}
}

func TestSyncServiceMutateReturnsTemporaryFailureWhenReplayRecoveryFails(t *testing.T) {
	ctx := context.Background()
	now := time.Date(2026, time.March, 12, 18, 0, 0, 0, time.UTC)
	resourceStore := store.NewMemoryResourceStore(seedSnapshot(now, 12))
	resourceStore.Now = func() time.Time { return now.Add(2 * time.Second) }

	idempotencyStore := store.NewMemoryIdempotencyStore()
	idempotencyStore.Now = func() time.Time { return now }
	idempotencyStore.CommitError = errors.New("commit unavailable")
	idempotencyStore.RecoverError = errors.New("recovery unavailable")
	metrics := &captureMetrics{}
	logger := &captureLogger{}

	svc := mustNewSyncService(t,
		resourceStore,
		idempotencyStore,
		service.WithMetrics(metrics),
		service.WithLogger(logger),
	)

	input := seededMutation()
	_, err := svc.Mutate(ctx, input)
	if err == nil {
		t.Fatal("expected temporary failure when replay recovery fails")
	}
	if !core.HasCode(err, core.CodeTemporaryFailure) {
		t.Fatalf("expected temporary failure code, got %v", err)
	}
	if resourceStore.MutateCalls != 1 {
		t.Fatalf("expected exactly one applied mutation, got %d mutate calls", resourceStore.MutateCalls)
	}
	if metrics.retries == 0 {
		t.Fatalf("expected retry metrics after replay recovery failure, got %+v", metrics)
	}
	if !logger.containsAttr("stored", "false") {
		t.Fatalf("expected unrecovered commit failure log entry, got %+v", logger.entries)
	}
}

func TestNewSyncServiceRequiresResourceStore(t *testing.T) {
	_, err := service.NewSyncService(nil, nil)
	if err == nil {
		t.Fatal("expected constructor error for nil resource store")
	}
	if !core.HasCode(err, core.CodeTemporaryFailure) {
		t.Fatalf("expected temporary failure code, got %v", err)
	}
}

func TestSyncServiceMutateRequiresConfiguredIdempotencyStore(t *testing.T) {
	ctx := context.Background()
	resourceStore := store.NewMemoryResourceStore(seedSnapshot(time.Now().UTC(), 12))
	svc := mustNewSyncService(t, resourceStore, nil)

	_, err := svc.Mutate(ctx, seededMutation())
	if err == nil {
		t.Fatal("expected temporary failure for missing idempotency store")
	}
	if !core.HasCode(err, core.CodeTemporaryFailure) {
		t.Fatalf("expected temporary failure code, got %v", err)
	}
	if resourceStore.MutateCalls != 0 {
		t.Fatalf("expected mutate call to be blocked, got %d", resourceStore.MutateCalls)
	}
}

func TestSyncServiceMutateReturnsCanonicalStaleRevisionDetails(t *testing.T) {
	ctx := context.Background()
	now := time.Date(2026, time.March, 12, 18, 0, 0, 0, time.UTC)
	resourceStore := store.NewMemoryResourceStore(seedSnapshot(now, 13))
	metrics := &captureMetrics{}
	logger := &captureLogger{}
	svc := mustNewSyncService(t, resourceStore, store.NewMemoryIdempotencyStore(), service.WithMetrics(metrics), service.WithLogger(logger))

	_, err := svc.Mutate(ctx, core.MutationInput{
		ResourceRef:      seededRef(),
		Operation:        "autosave",
		Payload:          []byte(`{"status":"draft"}`),
		ExpectedRevision: 12,
	})
	if err == nil {
		t.Fatal("expected stale revision error")
	}
	if !core.HasCode(err, core.CodeStaleRevision) {
		t.Fatalf("expected stale revision code, got %v", err)
	}

	currentRevision, latest, ok := core.StaleRevisionDetails(err)
	if !ok {
		t.Fatalf("expected stale revision details, got %v", err)
	}
	if currentRevision != 13 {
		t.Fatalf("expected current revision 13, got %d", currentRevision)
	}
	if latest == nil || latest.Revision != 13 {
		t.Fatalf("expected latest snapshot revision 13, got %+v", latest)
	}
	if metrics.conflicts != 1 {
		t.Fatalf("expected one conflict metric, got %d", metrics.conflicts)
	}
	if !logger.containsAttr("error_code", string(core.CodeStaleRevision)) {
		t.Fatalf("expected stale revision log entry, got %+v", logger.entries)
	}
}

func TestSyncServiceMutateRejectsInvalidMutation(t *testing.T) {
	ctx := context.Background()
	resourceStore := store.NewMemoryResourceStore(seedSnapshot(time.Now().UTC(), 12))
	svc := mustNewSyncService(t, resourceStore, nil)

	_, err := svc.Mutate(ctx, core.MutationInput{
		ResourceRef:      seededRef(),
		ExpectedRevision: -1,
	})
	if err == nil {
		t.Fatal("expected invalid mutation error")
	}
	if !core.HasCode(err, core.CodeInvalidMutation) {
		t.Fatalf("expected invalid mutation code, got %v", err)
	}
	if resourceStore.LastMutateInput.Operation != "" {
		t.Fatalf("expected store not to be called for invalid mutation, got %+v", resourceStore.LastMutateInput)
	}
}

func TestSyncServiceMapsUnknownStoreErrorsToTemporaryFailure(t *testing.T) {
	ctx := context.Background()
	resourceStore := store.NewMemoryResourceStore(seedSnapshot(time.Now().UTC(), 12))
	resourceStore.MutateError = errors.New("database unavailable")
	metrics := &captureMetrics{}
	logger := &captureLogger{}
	svc := mustNewSyncService(t, resourceStore, store.NewMemoryIdempotencyStore(), service.WithMetrics(metrics), service.WithLogger(logger))

	_, err := svc.Mutate(ctx, core.MutationInput{
		ResourceRef:      seededRef(),
		Operation:        "autosave",
		Payload:          []byte(`{"status":"draft"}`),
		ExpectedRevision: 12,
	})
	if err == nil {
		t.Fatal("expected temporary failure")
	}
	if !core.HasCode(err, core.CodeTemporaryFailure) {
		t.Fatalf("expected temporary failure code, got %v", err)
	}
	if metrics.retries != 1 {
		t.Fatalf("expected retry metric on retry-safe failure, got %d", metrics.retries)
	}
	if !logger.containsAttr("error_code", string(core.CodeTemporaryFailure)) {
		t.Fatalf("expected temporary failure log entry, got %+v", logger.entries)
	}
}

func seededRef() core.ResourceRef {
	return core.ResourceRef{
		Kind: "agreement_draft",
		ID:   "agreement_draft_123",
		Scope: map[string]string{
			"tenant": "tenant_1",
		},
	}
}

func seedSnapshot(now time.Time, revision int64) core.Snapshot {
	return core.Snapshot{
		ResourceRef: seededRef(),
		Data:        []byte(`{"id":"agreement_draft_123","status":"draft"}`),
		Revision:    revision,
		UpdatedAt:   now,
		Metadata: map[string]any{
			"kind": "agreement_draft",
		},
	}
}

func seededMutation() core.MutationInput {
	return core.MutationInput{
		ResourceRef:      seededRef(),
		Operation:        "send",
		Payload:          []byte(`{"id":"agreement_draft_123","status":"sent"}`),
		ExpectedRevision: 12,
		IdempotencyKey:   "send-1",
		ActorID:          "user_42",
		ClientID:         "client_7",
		CorrelationID:    "corr_123",
	}
}

type metricCall struct {
	success bool
	attrs   map[string]string
}

type captureMetrics struct {
	reads     []metricCall
	mutations []metricCall
	conflicts int
	replays   int
	retries   int
}

var _ observability.Metrics = (*captureMetrics)(nil)

func (c *captureMetrics) ObserveRead(_ context.Context, _ time.Duration, success bool, attrs map[string]string) {
	c.reads = append(c.reads, metricCall{success: success, attrs: cloneStringMap(attrs)})
}

func (c *captureMetrics) ObserveMutation(_ context.Context, _ time.Duration, success bool, attrs map[string]string) {
	c.mutations = append(c.mutations, metricCall{success: success, attrs: cloneStringMap(attrs)})
}

func (c *captureMetrics) IncrementConflict(_ context.Context, _ map[string]string) {
	c.conflicts++
}

func (c *captureMetrics) IncrementReplay(_ context.Context, _ map[string]string) {
	c.replays++
}

func (c *captureMetrics) IncrementRetry(_ context.Context, _ map[string]string) {
	c.retries++
}

type logEntry struct {
	level slog.Level
	msg   string
	args  []any
}

type captureLogger struct {
	entries []logEntry
}

var _ observability.Logger = (*captureLogger)(nil)

func (c *captureLogger) Log(_ context.Context, level slog.Level, msg string, args ...any) {
	entry := logEntry{
		level: level,
		msg:   msg,
		args:  append([]any(nil), args...),
	}
	c.entries = append(c.entries, entry)
}

func (c *captureLogger) containsAttr(key, want string) bool {
	for _, entry := range c.entries {
		for i := 0; i+1 < len(entry.args); i += 2 {
			currentKey, ok := entry.args[i].(string)
			if !ok || currentKey != key {
				continue
			}
			switch got := entry.args[i+1].(type) {
			case string:
				if strings.TrimSpace(got) == want {
					return true
				}
			case bool:
				if got && want == "true" {
					return true
				}
				if !got && want == "false" {
					return true
				}
			}
		}
	}
	return false
}

func cloneStringMap(input map[string]string) map[string]string {
	if len(input) == 0 {
		return nil
	}
	out := make(map[string]string, len(input))
	maps.Copy(out, input)
	return out
}

func mustNewSyncService(
	t *testing.T,
	resourceStore store.ResourceStore,
	idempotencyStore store.ReservingIdempotencyStore,
	opts ...service.Option,
) *service.SyncService {
	t.Helper()
	svc, err := service.NewSyncService(resourceStore, idempotencyStore, opts...)
	if err != nil {
		t.Fatalf("new sync service: %v", err)
	}
	return svc
}
