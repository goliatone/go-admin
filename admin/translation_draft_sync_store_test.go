package admin

import (
	"context"
	"encoding/json"
	"testing"

	synccore "github.com/goliatone/go-admin/pkg/go-sync/core"
)

func TestTranslationDraftSyncStoreGetReturnsEditorSnapshot(t *testing.T) {
	fixture := newTranslationEditorTestFixture(t, translationEditorTestFixtureOptions{})
	store := newTranslationDraftSyncResourceStore(fixture.binding)

	snapshot, err := store.Get(context.Background(), translationDraftSyncTestRef(fixture))
	if err != nil {
		t.Fatalf("Get: %v", err)
	}

	if snapshot.Revision != 3 {
		t.Fatalf("revision=%d want 3", snapshot.Revision)
	}
	data := translationDraftSyncSnapshotData(t, snapshot)
	if got := toString(data["variant_id"]); got != fixture.targetVariantID {
		t.Fatalf("variant_id=%q want %q", got, fixture.targetVariantID)
	}
	fields := mapString(mustAs[map[string]any](data["target_fields"]))
	if got := fields["title"]; got != "Guide de traduction" {
		t.Fatalf("target title=%q", got)
	}
	if got := toString(snapshot.Metadata["channel"]); got != "production" {
		t.Fatalf("metadata channel=%q want production", got)
	}
}

func TestTranslationDraftSyncStoreMutateAppliesConsecutiveAutosavesAndReturnsStaleRevision(t *testing.T) {
	fixture := newTranslationEditorTestFixture(t, translationEditorTestFixtureOptions{})
	store := newTranslationDraftSyncResourceStore(fixture.binding)
	ref := translationDraftSyncTestRef(fixture)

	first := storeMutation(t, store, ref, 3, map[string]any{
		"fields": map[string]any{
			"title": "Guide de publication",
		},
		"autosave": true,
	})
	if first.Revision != 4 {
		t.Fatalf("first revision=%d want 4", first.Revision)
	}
	firstData := translationDraftSyncSnapshotData(t, first)
	firstFields := mapString(mustAs[map[string]any](firstData["target_fields"]))
	if got := firstFields["title"]; got != "Guide de publication" {
		t.Fatalf("first title=%q", got)
	}

	second := storeMutation(t, store, ref, 4, map[string]any{
		"fields": map[string]any{
			"body": "Deuxieme autosave.",
		},
		"metadata": map[string]any{
			"autosave": true,
		},
	})
	if second.Revision != 5 {
		t.Fatalf("second revision=%d want 5", second.Revision)
	}
	secondData := translationDraftSyncSnapshotData(t, second)
	secondFields := mapString(mustAs[map[string]any](secondData["target_fields"]))
	if got := secondFields["title"]; got != "Guide de publication" {
		t.Fatalf("second title=%q", got)
	}
	if got := secondFields["body"]; got != "Deuxieme autosave." {
		t.Fatalf("second body=%q", got)
	}

	_, err := store.Mutate(context.Background(), synccore.MutationInput{
		ResourceRef:      ref,
		Operation:        translationDraftSyncOperation,
		Payload:          mustJSONBytes(t, map[string]any{"fields": map[string]any{"path": "/fr/stale"}}),
		ExpectedRevision: 3,
		ActorID:          "translator-1",
	})
	if err == nil {
		t.Fatal("expected stale revision error")
	}
	if code, ok := synccore.ErrorCodeOf(err); !ok || code != synccore.CodeStaleRevision {
		t.Fatalf("expected STALE_REVISION, got code=%q err=%v", code, err)
	}
	current, latest, ok := synccore.StaleRevisionDetails(err)
	if !ok || current != 5 || latest == nil || latest.Revision != 5 {
		t.Fatalf("unexpected stale details current=%d latest=%+v ok=%v", current, latest, ok)
	}
}

func TestTranslationDraftSyncStoreRejectsClientIdentityFields(t *testing.T) {
	fixture := newTranslationEditorTestFixture(t, translationEditorTestFixtureOptions{})
	store := newTranslationDraftSyncResourceStore(fixture.binding)

	_, err := store.Mutate(context.Background(), synccore.MutationInput{
		ResourceRef: translationDraftSyncTestRef(fixture),
		Operation:   translationDraftSyncOperation,
		Payload: mustJSONBytes(t, map[string]any{
			"fields": map[string]any{
				"title": "Tentative interdite",
			},
			"scope": map[string]any{
				"tenant_id": "tenant-evil",
			},
		}),
		ExpectedRevision: 3,
		ActorID:          "translator-1",
	})
	if err == nil {
		t.Fatal("expected invalid mutation error")
	}
	if code, ok := synccore.ErrorCodeOf(err); !ok || code != synccore.CodeInvalidMutation {
		t.Fatalf("expected INVALID_MUTATION, got code=%q err=%v", code, err)
	}
}

func translationDraftSyncTestRef(fixture translationEditorTestFixture) synccore.ResourceRef {
	return synccore.ResourceRef{
		Kind: translationDraftSyncResourceKind,
		ID:   fixture.targetVariantID,
		Scope: map[string]string{
			ScopeTenantIDKey: "tenant-1",
			ScopeOrgIDKey:    "org-1",
			"channel":        "production",
		},
	}
}

func storeMutation(t *testing.T, store *translationDraftSyncResourceStore, ref synccore.ResourceRef, revision int64, payload map[string]any) synccore.Snapshot {
	t.Helper()
	snapshot, err := store.Mutate(context.Background(), synccore.MutationInput{
		ResourceRef:      ref,
		Operation:        translationDraftSyncOperation,
		Payload:          mustJSONBytes(t, payload),
		ExpectedRevision: revision,
		ActorID:          "translator-1",
	})
	if err != nil {
		t.Fatalf("Mutate: %v", err)
	}
	return snapshot
}

func translationDraftSyncSnapshotData(t *testing.T, snapshot synccore.Snapshot) map[string]any {
	t.Helper()
	var data map[string]any
	if err := json.Unmarshal(snapshot.Data, &data); err != nil {
		t.Fatalf("decode snapshot data: %v", err)
	}
	return data
}

func mustJSONBytes(t *testing.T, payload map[string]any) []byte {
	t.Helper()
	encoded, err := json.Marshal(payload)
	if err != nil {
		t.Fatalf("marshal payload: %v", err)
	}
	return encoded
}
