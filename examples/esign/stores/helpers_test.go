package stores

import (
	"testing"

	"github.com/goliatone/go-admin/internal/primitives"
)

var intPtr = primitives.Int

func reloadInMemoryStoreFromSnapshot(t *testing.T, store *InMemoryStore) *InMemoryStore {
	t.Helper()
	payload, err := store.SnapshotPayload()
	if err != nil {
		t.Fatalf("SnapshotPayload: %v", err)
	}
	reloaded, err := NewInMemoryStoreFromSnapshotPayload(payload)
	if err != nil {
		t.Fatalf("NewInMemoryStoreFromSnapshotPayload: %v", err)
	}
	return reloaded
}
