package admin

import (
	"testing"
	"time"

	usertypes "github.com/goliatone/go-users/pkg/types"
	"github.com/google/uuid"
)

func TestActivityEntryFromUsersRecordMapsFields(t *testing.T) {
	now := time.Date(2024, 2, 10, 9, 30, 0, 0, time.UTC)
	actorID := uuid.New()
	userID := uuid.New()
	record := usertypes.ActivityRecord{
		ID:         uuid.New(),
		ActorID:    actorID,
		UserID:     userID,
		Verb:       "updated",
		ObjectType: "item",
		ObjectID:   "item-1",
		Channel:    "admin",
		Data:       map[string]any{"token": "secret"},
		OccurredAt: now,
	}

	entry := entryFromUsersRecord(record)
	if entry.ID != record.ID.String() {
		t.Fatalf("expected id %s, got %s", record.ID, entry.ID)
	}
	if entry.Actor != actorID.String() {
		t.Fatalf("expected actor %s, got %s", actorID, entry.Actor)
	}
	if entry.Action != "updated" {
		t.Fatalf("expected action updated, got %s", entry.Action)
	}
	if entry.Object != "item:item-1" {
		t.Fatalf("expected object item:item-1, got %s", entry.Object)
	}
	if entry.Channel != "admin" {
		t.Fatalf("expected channel admin, got %s", entry.Channel)
	}
	if entry.Metadata["token"] != "secret" {
		t.Fatalf("expected metadata token secret, got %v", entry.Metadata["token"])
	}
	if !entry.CreatedAt.Equal(now) {
		t.Fatalf("expected created_at %s, got %s", now, entry.CreatedAt)
	}
}

func TestActivityEntryFromUsersRecordFallsBackToUserID(t *testing.T) {
	userID := uuid.New()
	record := usertypes.ActivityRecord{
		ID:     uuid.New(),
		UserID: userID,
		Verb:   "login",
	}

	entry := entryFromUsersRecord(record)
	if entry.Actor != userID.String() {
		t.Fatalf("expected actor %s, got %s", userID, entry.Actor)
	}
}

func TestActivityEntryFromUsersRecordPrefersDisplayFields(t *testing.T) {
	record := usertypes.ActivityRecord{
		ID:         uuid.New(),
		ActorID:    uuid.New(),
		ObjectType: "role",
		ObjectID:   "role-1",
		Data: map[string]any{
			"actor_display":  "Ada Lovelace",
			"object_display": "Role: Admin",
		},
	}

	entry := entryFromUsersRecord(record)
	if entry.Actor != "Ada Lovelace" {
		t.Fatalf("expected actor display Ada Lovelace, got %s", entry.Actor)
	}
	if entry.Object != "Role: Admin" {
		t.Fatalf("expected object display Role: Admin, got %s", entry.Object)
	}
	if entry.Metadata["actor_display"] != "Ada Lovelace" {
		t.Fatalf("expected actor_display metadata Ada Lovelace, got %v", entry.Metadata["actor_display"])
	}
	if entry.Metadata["object_display"] != "Role: Admin" {
		t.Fatalf("expected object_display metadata Role: Admin, got %v", entry.Metadata["object_display"])
	}
}

func TestActivityEntriesFromUsersRecordsPreservesOrder(t *testing.T) {
	firstID := uuid.New()
	secondID := uuid.New()
	records := []usertypes.ActivityRecord{
		{ID: firstID, Verb: "first"},
		{ID: secondID, Verb: "second"},
	}

	entries := entriesFromUsersRecords(records)
	if len(entries) != 2 {
		t.Fatalf("expected 2 entries, got %d", len(entries))
	}
	if entries[0].ID != firstID.String() || entries[1].ID != secondID.String() {
		t.Fatalf("expected order %s then %s, got %+v", firstID, secondID, entries)
	}
}
