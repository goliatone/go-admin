package quickstart

import (
	"context"
	"testing"
	"time"

	"github.com/goliatone/go-admin/admin"
	dashboardactivity "github.com/goliatone/go-dashboard/pkg/activity"
)

type recordingSink struct {
	entries []admin.ActivityEntry
}

func (s *recordingSink) Record(ctx context.Context, entry admin.ActivityEntry) error {
	_ = ctx
	s.entries = append(s.entries, entry)
	return nil
}

func (s *recordingSink) List(ctx context.Context, limit int, filters ...admin.ActivityFilter) ([]admin.ActivityEntry, error) {
	_, _ = ctx, filters
	if limit <= 0 || limit > len(s.entries) {
		limit = len(s.entries)
	}
	out := make([]admin.ActivityEntry, limit)
	copy(out, s.entries[:limit])
	return out, nil
}

func TestNewCompositeActivitySinkForwardsToHooks(t *testing.T) {
	now := time.Date(2024, 2, 3, 4, 5, 6, 0, time.UTC)
	entry := admin.ActivityEntry{
		Actor:     "user-1",
		Action:    "create",
		Object:    "page:123",
		Metadata:  map[string]any{"foo": "bar"},
		CreatedAt: now,
	}
	primary := &recordingSink{}

	var got dashboardactivity.Event
	called := false
	hook := dashboardactivity.HookFunc(func(ctx context.Context, event dashboardactivity.Event) error {
		_ = ctx
		called = true
		got = event
		return nil
	})

	sink := NewCompositeActivitySink(primary, dashboardactivity.Hooks{hook}, dashboardactivity.Config{
		Enabled: true,
		Channel: "dash",
	})

	if err := sink.Record(context.Background(), entry); err != nil {
		t.Fatalf("record error: %v", err)
	}
	if len(primary.entries) != 1 {
		t.Fatalf("expected primary sink to record entry")
	}
	if !called {
		t.Fatalf("expected dashboard hook called")
	}
	if got.Verb != entry.Action || got.ActorID != entry.Actor {
		t.Fatalf("unexpected event mapping: %+v", got)
	}
	if got.ObjectType != "page" || got.ObjectID != "123" {
		t.Fatalf("unexpected object mapping: %+v", got)
	}
	if got.Channel != "admin" {
		t.Fatalf("expected channel admin, got %q", got.Channel)
	}
	if got.Metadata["foo"] != "bar" {
		t.Fatalf("expected metadata passthrough, got %+v", got.Metadata)
	}
	if !got.OccurredAt.Equal(now) {
		t.Fatalf("expected timestamp %v, got %v", now, got.OccurredAt)
	}
}

func TestNewCompositeActivitySinkSkipsHooksWhenDisabled(t *testing.T) {
	entry := admin.ActivityEntry{
		Actor:  "user-2",
		Action: "update",
		Object: "settings:42",
	}
	primary := &recordingSink{}
	called := false
	hook := dashboardactivity.HookFunc(func(ctx context.Context, event dashboardactivity.Event) error {
		_ = ctx
		called = true
		_ = event
		return nil
	})

	sink := NewCompositeActivitySink(primary, dashboardactivity.Hooks{hook}, dashboardactivity.Config{
		Enabled: false,
	})

	if err := sink.Record(context.Background(), entry); err != nil {
		t.Fatalf("record error: %v", err)
	}
	if len(primary.entries) != 1 {
		t.Fatalf("expected primary sink to record entry")
	}
	if called {
		t.Fatalf("expected hook not called when disabled")
	}
}
