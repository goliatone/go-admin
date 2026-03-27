package services

import (
	"context"
	"errors"
	"testing"
	"time"

	gocore "github.com/goliatone/go-services/core"
)

func TestWorkflowMappingSpecStorePublishVersionHonorsCanceledContext(t *testing.T) {
	store := newWorkflowMappingSpecStore()
	scope := gocore.ScopeRef{Type: "tenant", ID: "tenant-1"}

	_, err := store.CreateDraft(context.Background(), gocore.MappingSpec{
		ID:         "mapping_1",
		ProviderID: "provider-1",
		Scope:      scope,
		SpecID:     "spec-1",
		Version:    1,
		Status:     gocore.MappingSpecStatusValidated,
	})
	if err != nil {
		t.Fatalf("CreateDraft: %v", err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	_, err = store.PublishVersion(ctx, "provider-1", scope, "spec-1", 1, time.Now())
	if !errors.Is(err, context.Canceled) {
		t.Fatalf("expected context canceled, got %v", err)
	}
}

func TestWorkflowSyncConflictStoreListByBindingHonorsCanceledContext(t *testing.T) {
	store := newWorkflowSyncConflictStore()
	scope := gocore.ScopeRef{Type: "tenant", ID: "tenant-1"}

	_, err := store.Append(context.Background(), gocore.SyncConflict{
		ID:            "conflict-1",
		ProviderID:    "provider-1",
		Scope:         scope,
		SyncBindingID: "binding-1",
		Status:        gocore.SyncConflictStatusPending,
	})
	if err != nil {
		t.Fatalf("Append: %v", err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	rows, err := store.ListByBinding(ctx, "provider-1", scope, "binding-1", gocore.SyncConflictStatusPending)
	if !errors.Is(err, context.Canceled) {
		t.Fatalf("expected context canceled, got %v", err)
	}
	if rows != nil {
		t.Fatalf("expected nil rows on canceled context, got %+v", rows)
	}
}
