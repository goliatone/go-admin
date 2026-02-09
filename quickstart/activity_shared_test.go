package quickstart

import (
	"context"
	"testing"
	"time"

	auth "github.com/goliatone/go-auth"
)

func TestNewGoAuthActivitySinkUsesNormalizedDefaults(t *testing.T) {
	now := time.Date(2026, 1, 11, 10, 9, 8, 0, time.UTC)
	sink := &recordingSink{}
	adapter := NewGoAuthActivitySink(sink)

	err := adapter.Record(context.Background(), auth.ActivityEvent{
		EventType:  auth.ActivityEventLoginSuccess,
		Actor:      auth.ActorRef{ID: "admin-1", Type: "admin"},
		UserID:     "user-7",
		OccurredAt: now,
		Metadata: map[string]any{
			"ticket": "SEC-204",
		},
	})
	if err != nil {
		t.Fatalf("record error: %v", err)
	}
	if len(sink.entries) != 1 {
		t.Fatalf("expected one activity entry, got %d", len(sink.entries))
	}

	entry := sink.entries[0]
	if entry.Actor != "admin-1" {
		t.Fatalf("expected actor admin-1, got %q", entry.Actor)
	}
	if entry.Action != string(auth.ActivityEventLoginSuccess) {
		t.Fatalf("expected action %q, got %q", auth.ActivityEventLoginSuccess, entry.Action)
	}
	if entry.Object != "user:user-7" {
		t.Fatalf("expected object user:user-7, got %q", entry.Object)
	}
	if entry.Channel != "auth" {
		t.Fatalf("expected channel auth, got %q", entry.Channel)
	}
	if !entry.CreatedAt.Equal(now) {
		t.Fatalf("expected timestamp %v, got %v", now, entry.CreatedAt)
	}
	if entry.Metadata["ticket"] != "SEC-204" {
		t.Fatalf("expected ticket metadata, got %+v", entry.Metadata)
	}
	if entry.Metadata["actor_type"] != "admin" {
		t.Fatalf("expected actor_type metadata, got %+v", entry.Metadata["actor_type"])
	}
}

func TestNewGoAuthActivitySinkPreservesActorAndChannelFallbackBehavior(t *testing.T) {
	sink := &recordingSink{}
	adapter := NewGoAuthActivitySink(
		sink,
		WithGoAuthActivityChannel(""),
	)

	err := adapter.Record(context.Background(), auth.ActivityEvent{
		EventType: auth.ActivityEventLoginFailure,
	})
	if err != nil {
		t.Fatalf("record error: %v", err)
	}
	if len(sink.entries) != 1 {
		t.Fatalf("expected one activity entry, got %d", len(sink.entries))
	}

	entry := sink.entries[0]
	if entry.Actor != "" {
		t.Fatalf("expected empty actor fallback, got %q", entry.Actor)
	}
	if entry.Channel != "" {
		t.Fatalf("expected empty channel when overridden, got %q", entry.Channel)
	}
	if entry.Object != "user" {
		t.Fatalf("expected default object type only, got %q", entry.Object)
	}
	if entry.CreatedAt.IsZero() {
		t.Fatalf("expected created_at to be set")
	}
}

func TestNewGoAuthActivitySinkIncludesStatusMetadata(t *testing.T) {
	sink := &recordingSink{}
	adapter := NewGoAuthActivitySink(sink)

	err := adapter.Record(context.Background(), auth.ActivityEvent{
		EventType:  auth.ActivityEventUserStatusChanged,
		Actor:      auth.ActorRef{ID: "moderator-1", Type: "moderator"},
		UserID:     "user-5",
		FromStatus: auth.UserStatusActive,
		ToStatus:   auth.UserStatusSuspended,
	})
	if err != nil {
		t.Fatalf("record error: %v", err)
	}
	if len(sink.entries) != 1 {
		t.Fatalf("expected one activity entry, got %d", len(sink.entries))
	}

	entry := sink.entries[0]
	if entry.Metadata["from_status"] != string(auth.UserStatusActive) {
		t.Fatalf("expected from_status metadata, got %+v", entry.Metadata["from_status"])
	}
	if entry.Metadata["to_status"] != string(auth.UserStatusSuspended) {
		t.Fatalf("expected to_status metadata, got %+v", entry.Metadata["to_status"])
	}
}
