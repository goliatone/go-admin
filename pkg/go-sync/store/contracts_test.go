package store_test

import (
	"context"
	"encoding/json"
	"errors"
	"testing"
	"time"

	"github.com/goliatone/go-admin/pkg/go-sync/core"
	"github.com/goliatone/go-admin/pkg/go-sync/store"
)

func TestMemoryResourceStoreGetReturnsClonedSnapshot(t *testing.T) {
	t.Parallel()

	seed := core.Snapshot{
		ResourceRef: core.ResourceRef{
			Kind: "agreement_draft",
			ID:   "draft_123",
			Scope: map[string]string{
				"tenant": "tenant_1",
			},
		},
		Data:      []byte(`{"title":"Original"}`),
		Revision:  7,
		UpdatedAt: time.Date(2026, 3, 12, 12, 0, 0, 0, time.UTC),
		Metadata: map[string]any{
			"source": "seed",
		},
	}

	resourceStore := store.NewMemoryResourceStore(seed)
	got, err := resourceStore.Get(context.Background(), seed.ResourceRef)
	if err != nil {
		t.Fatalf("get seeded snapshot: %v", err)
	}

	got.ResourceRef.Scope["tenant"] = "tenant_changed"
	got.Metadata["source"] = "mutated"
	got.Data = []byte(`{"title":"Changed"}`)

	again, err := resourceStore.Get(context.Background(), seed.ResourceRef)
	if err != nil {
		t.Fatalf("get seeded snapshot again: %v", err)
	}

	if again.ResourceRef.Scope["tenant"] != "tenant_1" {
		t.Fatalf("scope must be cloned, got %q", again.ResourceRef.Scope["tenant"])
	}
	if again.Metadata["source"] != "seed" {
		t.Fatalf("metadata must be cloned, got %v", again.Metadata["source"])
	}
	if string(again.Data) != `{"title":"Original"}` {
		t.Fatalf("data must be cloned, got %s", string(again.Data))
	}
}

func TestMemoryResourceStoreMutateRequiresMatchingRevision(t *testing.T) {
	t.Parallel()

	now := time.Date(2026, 3, 12, 13, 0, 0, 0, time.UTC)
	resourceStore := store.NewMemoryResourceStore(core.Snapshot{
		ResourceRef: core.ResourceRef{
			Kind: "agreement_draft",
			ID:   "draft_123",
			Scope: map[string]string{
				"tenant": "tenant_1",
			},
		},
		Data:      []byte(`{"title":"Before"}`),
		Revision:  3,
		UpdatedAt: now.Add(-time.Minute),
	})
	resourceStore.Now = func() time.Time { return now }

	updated, err := resourceStore.Mutate(context.Background(), core.MutationInput{
		ResourceRef: core.ResourceRef{
			Kind: "agreement_draft",
			ID:   "draft_123",
			Scope: map[string]string{
				"tenant": "tenant_1",
			},
		},
		Operation:        "autosave",
		Payload:          []byte(`{"title":"After"}`),
		ExpectedRevision: 3,
	})
	if err != nil {
		t.Fatalf("mutate resource: %v", err)
	}

	if updated.Revision != 4 {
		t.Fatalf("expected revision 4, got %d", updated.Revision)
	}
	if updated.UpdatedAt != now {
		t.Fatalf("expected updated_at %s, got %s", now, updated.UpdatedAt)
	}
	if updated.Metadata["operation"] != "autosave" {
		t.Fatalf("expected operation metadata to be captured, got %v", updated.Metadata["operation"])
	}

	_, err = resourceStore.Mutate(context.Background(), core.MutationInput{
		ResourceRef:      updated.ResourceRef,
		Operation:        "autosave",
		Payload:          []byte(`{"title":"Conflict"}`),
		ExpectedRevision: 3,
	})
	if !core.HasCode(err, core.CodeStaleRevision) {
		t.Fatalf("expected stale revision error, got %v", err)
	}

	currentRevision, latest, ok := core.StaleRevisionDetails(err)
	if !ok {
		t.Fatal("expected stale revision details")
	}
	if currentRevision != 4 {
		t.Fatalf("expected current revision 4, got %d", currentRevision)
	}
	if latest == nil || latest.Revision != 4 {
		t.Fatalf("expected latest snapshot revision 4, got %+v", latest)
	}
}

func TestMemoryIdempotencyStoreReserveCommitReplayAndRelease(t *testing.T) {
	t.Parallel()

	now := time.Date(2026, 3, 12, 14, 0, 0, 0, time.UTC)
	idempotencyStore := store.NewMemoryIdempotencyStore()
	idempotencyStore.Now = func() time.Time { return now }

	first, err := idempotencyStore.Reserve(context.Background(), "idem_123", 5*time.Minute)
	if err != nil {
		t.Fatalf("reserve key: %v", err)
	}
	if first.Reservation == nil {
		t.Fatal("expected reservation")
	}
	if first.Pending || first.Result != nil {
		t.Fatalf("unexpected reserve state: %+v", first)
	}

	pending, err := idempotencyStore.Reserve(context.Background(), "idem_123", 5*time.Minute)
	if err != nil {
		t.Fatalf("reserve pending key: %v", err)
	}
	if !pending.Pending {
		t.Fatalf("expected pending reserve state, got %+v", pending)
	}

	result := core.MutationResult{
		Snapshot: core.Snapshot{
			ResourceRef: core.ResourceRef{Kind: "agreement_draft", ID: "draft_123"},
			Data:        []byte(`{"status":"sent"}`),
			Revision:    9,
			UpdatedAt:   now,
			Metadata: map[string]any{
				"idempotency_key": "idem_123",
			},
		},
		Applied: true,
	}
	if err := idempotencyStore.Commit(context.Background(), *first.Reservation, result, 5*time.Minute); err != nil {
		t.Fatalf("commit reservation: %v", err)
	}

	replay, err := idempotencyStore.Reserve(context.Background(), "idem_123", 5*time.Minute)
	if err != nil {
		t.Fatalf("reserve replay key: %v", err)
	}
	if replay.Result == nil || replay.Result.Snapshot.Revision != 9 {
		t.Fatalf("expected replay result, got %+v", replay)
	}

	stored, ok, err := idempotencyStore.Get(context.Background(), "idem_123")
	if err != nil {
		t.Fatalf("get stored result: %v", err)
	}
	if !ok {
		t.Fatal("expected stored result")
	}
	if stored.Snapshot.Metadata["idempotency_key"] != "idem_123" {
		t.Fatalf("expected replay metadata, got %+v", stored.Snapshot.Metadata)
	}

	other, err := idempotencyStore.Reserve(context.Background(), "idem_release", 5*time.Minute)
	if err != nil {
		t.Fatalf("reserve release key: %v", err)
	}
	if err := idempotencyStore.Release(context.Background(), *other.Reservation); err != nil {
		t.Fatalf("release reservation: %v", err)
	}
	if _, ok, err := idempotencyStore.Get(context.Background(), "idem_release"); err != nil {
		t.Fatalf("get released key: %v", err)
	} else if ok {
		t.Fatal("released reservation must not remain stored")
	}

	idempotencyStore.Now = func() time.Time { return now.Add(6 * time.Minute) }
	if _, ok, err := idempotencyStore.Get(context.Background(), "idem_123"); err != nil {
		t.Fatalf("get expired key: %v", err)
	} else if ok {
		t.Fatal("expected committed result to expire after ttl")
	}
}

func TestMemoryIdempotencyStoreRejectsCommitForUnknownReservation(t *testing.T) {
	t.Parallel()

	idempotencyStore := store.NewMemoryIdempotencyStore()
	err := idempotencyStore.Commit(context.Background(), store.IdempotencyReservation{
		Key:   "missing",
		Token: "missing",
	}, core.MutationResult{}, time.Minute)
	if !core.HasCode(err, core.CodeTemporaryFailure) {
		t.Fatalf("expected temporary failure, got %v", err)
	}
}

func TestMemoryResourceStorePreservesJSONPayload(t *testing.T) {
	t.Parallel()

	resourceStore := store.NewMemoryResourceStore(core.Snapshot{
		ResourceRef: core.ResourceRef{Kind: "agreement_draft", ID: "draft_123"},
		Data:        []byte(`{"title":"Before","participants":[1]}`),
		Revision:    1,
		UpdatedAt:   time.Date(2026, 3, 12, 15, 0, 0, 0, time.UTC),
	})

	snapshot, err := resourceStore.Mutate(context.Background(), core.MutationInput{
		ResourceRef:      core.ResourceRef{Kind: "agreement_draft", ID: "draft_123"},
		Operation:        "autosave",
		Payload:          []byte(`{"title":"After","participants":[1,2]}`),
		ExpectedRevision: 1,
	})
	if err != nil {
		t.Fatalf("mutate payload: %v", err)
	}

	var payload map[string]any
	if err := json.Unmarshal(snapshot.Data, &payload); err != nil {
		t.Fatalf("unmarshal stored payload: %v", err)
	}
	if payload["title"] != "After" {
		t.Fatalf("expected updated title, got %+v", payload)
	}
}

func TestMemoryIdempotencyStoreSurfacesInjectedErrors(t *testing.T) {
	t.Parallel()

	idempotencyStore := store.NewMemoryIdempotencyStore()
	expected := errors.New("reserve unavailable")
	idempotencyStore.ReserveError = expected

	_, err := idempotencyStore.Reserve(context.Background(), "idem_123", time.Minute)
	if !errors.Is(err, expected) {
		t.Fatalf("expected injected reserve error, got %v", err)
	}
}
