package stores

import (
	"context"
	"strings"
	"testing"
	"time"
)

func strPtrDraft(value string) *string {
	return &value
}

func intPtrDraft(value int) *int {
	return &value
}

func TestInMemoryDraftSessionLifecycleAndIdempotency(t *testing.T) {
	store := NewInMemoryStore()
	ctx := context.Background()
	scope := Scope{TenantID: "tenant-1", OrgID: "org-1"}

	created, replay, err := store.CreateDraftSession(ctx, scope, DraftRecord{
		WizardID:        "wiz-1",
		CreatedByUserID: "user-1",
		Title:           "Q1 Contract",
		CurrentStep:     3,
		WizardStateJSON: `{"details":{"title":"Q1 Contract"}}`,
	})
	if err != nil {
		t.Fatalf("CreateDraftSession: %v", err)
	}
	if replay {
		t.Fatalf("expected first create not to be replay")
	}
	if created.Revision != 1 {
		t.Fatalf("expected revision 1, got %d", created.Revision)
	}

	replayUpdatedAt := created.UpdatedAt.Add(10 * time.Minute).UTC()
	replayExpiresAt := created.ExpiresAt.Add(10 * time.Minute).UTC()
	replayed, replay, err := store.CreateDraftSession(ctx, scope, DraftRecord{
		WizardID:        "wiz-1",
		CreatedByUserID: "user-1",
		Title:           "Q1 Contract Duplicate",
		CurrentStep:     4,
		UpdatedAt:       replayUpdatedAt,
		ExpiresAt:       replayExpiresAt,
	})
	if err != nil {
		t.Fatalf("CreateDraftSession replay: %v", err)
	}
	if !replay {
		t.Fatalf("expected idempotent replay=true")
	}
	if replayed.ID != created.ID {
		t.Fatalf("expected replay id %q, got %q", created.ID, replayed.ID)
	}
	if !replayed.UpdatedAt.Equal(replayUpdatedAt) {
		t.Fatalf("expected replay updated_at=%s, got %s", replayUpdatedAt.Format(time.RFC3339Nano), replayed.UpdatedAt.Format(time.RFC3339Nano))
	}
	if !replayed.ExpiresAt.Equal(replayExpiresAt) {
		t.Fatalf("expected replay expires_at=%s, got %s", replayExpiresAt.Format(time.RFC3339Nano), replayed.ExpiresAt.Format(time.RFC3339Nano))
	}

	rows, nextCursor, err := store.ListDraftSessions(ctx, scope, DraftQuery{
		CreatedByUserID: "user-1",
		Limit:           20,
		SortDesc:        true,
	})
	if err != nil {
		t.Fatalf("ListDraftSessions: %v", err)
	}
	if len(rows) != 1 {
		t.Fatalf("expected one draft, got %d", len(rows))
	}
	if nextCursor != "" {
		t.Fatalf("expected empty next cursor, got %q", nextCursor)
	}

	updated, err := store.UpdateDraftSession(ctx, scope, created.ID, DraftPatch{
		Title:           strPtrDraft("Q1 Contract Updated"),
		CurrentStep:     intPtrDraft(4),
		WizardStateJSON: strPtrDraft(`{"details":{"title":"Q1 Contract Updated"}}`),
	}, created.Revision)
	if err != nil {
		t.Fatalf("UpdateDraftSession: %v", err)
	}
	if updated.Revision != created.Revision+1 {
		t.Fatalf("expected revision increment to %d, got %d", created.Revision+1, updated.Revision)
	}
	if updated.CurrentStep != 4 {
		t.Fatalf("expected current_step=4, got %d", updated.CurrentStep)
	}

	if _, err := store.UpdateDraftSession(ctx, scope, created.ID, DraftPatch{
		Title: strPtrDraft("stale write"),
	}, created.Revision); err == nil {
		t.Fatalf("expected version conflict on stale update")
	} else if !strings.Contains(err.Error(), "VERSION_CONFLICT") {
		t.Fatalf("expected VERSION_CONFLICT, got %v", err)
	}

	if err := store.DeleteDraftSession(ctx, scope, created.ID); err != nil {
		t.Fatalf("DeleteDraftSession: %v", err)
	}
	if _, err := store.GetDraftSession(ctx, scope, created.ID); err == nil {
		t.Fatalf("expected deleted draft to be unavailable")
	}
}

func TestInMemoryDraftSessionPaginationAndExpiryCleanup(t *testing.T) {
	store := NewInMemoryStore()
	ctx := context.Background()
	scope := Scope{TenantID: "tenant-1", OrgID: "org-1"}
	now := time.Now().UTC()

	_, _, _ = store.CreateDraftSession(ctx, scope, DraftRecord{
		WizardID:        "wiz-expired",
		CreatedByUserID: "user-1",
		CurrentStep:     2,
		UpdatedAt:       now.Add(-48 * time.Hour),
		ExpiresAt:       now.Add(-24 * time.Hour),
	})
	for i := 0; i < 3; i++ {
		_, _, err := store.CreateDraftSession(ctx, scope, DraftRecord{
			WizardID:        "wiz-live-" + string(rune('a'+i)),
			CreatedByUserID: "user-1",
			CurrentStep:     i + 1,
			UpdatedAt:       now.Add(time.Duration(i) * time.Minute),
		})
		if err != nil {
			t.Fatalf("CreateDraftSession live %d: %v", i, err)
		}
	}

	count, err := store.DeleteExpiredDraftSessions(ctx, now)
	if err != nil {
		t.Fatalf("DeleteExpiredDraftSessions: %v", err)
	}
	if count != 1 {
		t.Fatalf("expected one expired draft removed, got %d", count)
	}

	pageOne, cursor, err := store.ListDraftSessions(ctx, scope, DraftQuery{
		CreatedByUserID: "user-1",
		Limit:           2,
		SortDesc:        true,
	})
	if err != nil {
		t.Fatalf("ListDraftSessions page one: %v", err)
	}
	if len(pageOne) != 2 {
		t.Fatalf("expected 2 drafts in page one, got %d", len(pageOne))
	}
	if cursor == "" {
		t.Fatalf("expected next cursor for second page")
	}

	pageTwo, cursor2, err := store.ListDraftSessions(ctx, scope, DraftQuery{
		CreatedByUserID: "user-1",
		Limit:           2,
		Cursor:          cursor,
		SortDesc:        true,
	})
	if err != nil {
		t.Fatalf("ListDraftSessions page two: %v", err)
	}
	if len(pageTwo) != 1 {
		t.Fatalf("expected 1 draft in page two, got %d", len(pageTwo))
	}
	if cursor2 != "" {
		t.Fatalf("expected empty next cursor on last page, got %q", cursor2)
	}
}
