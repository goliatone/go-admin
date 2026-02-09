package activity

import (
	"context"
	"testing"
	"time"

	"github.com/goliatone/go-admin/pkg/admin"
	dashboardactivity "github.com/goliatone/go-dashboard/pkg/activity"
)

func TestAdminActivitySinkAdapterRecordUsesAdminInteropDefaults(t *testing.T) {
	capture := &dashboardactivity.CaptureHook{}
	sink := NewAdminActivitySinkAdapter(
		dashboardactivity.Hooks{capture},
		dashboardactivity.Config{Enabled: true, Channel: "dashboard"},
	)

	now := time.Date(2026, 1, 11, 13, 14, 15, 0, time.UTC)
	err := sink.Record(context.Background(), admin.ActivityEntry{
		Actor:     "user-1",
		Action:    "updated",
		Object:    "page:123",
		Metadata:  map[string]any{"locale": "en"},
		CreatedAt: now,
	})
	if err != nil {
		t.Fatalf("record error: %v", err)
	}
	if len(capture.Events) != 1 {
		t.Fatalf("expected one event, got %d", len(capture.Events))
	}

	event := capture.Events[0]
	if event.Verb != "updated" || event.ActorID != "user-1" {
		t.Fatalf("unexpected verb/actor mapping: %+v", event)
	}
	if event.ObjectType != "page" || event.ObjectID != "123" {
		t.Fatalf("unexpected object mapping: %+v", event)
	}
	if event.Channel != "admin" {
		t.Fatalf("expected channel admin default, got %q", event.Channel)
	}
	if event.Metadata["locale"] != "en" {
		t.Fatalf("expected metadata passthrough, got %+v", event.Metadata)
	}
	if !event.OccurredAt.Equal(now) {
		t.Fatalf("expected occurred_at %v, got %v", now, event.OccurredAt)
	}
}

func TestAdminActivitySinkAdapterRecordPassesExplicitChannel(t *testing.T) {
	capture := &dashboardactivity.CaptureHook{}
	sink := NewAdminActivitySinkAdapter(
		dashboardactivity.Hooks{capture},
		dashboardactivity.Config{Enabled: true},
	)

	err := sink.Record(context.Background(), admin.ActivityEntry{
		Actor:   "user-2",
		Action:  "deleted",
		Object:  "media:7",
		Channel: "audit",
	})
	if err != nil {
		t.Fatalf("record error: %v", err)
	}
	if len(capture.Events) != 1 {
		t.Fatalf("expected one event, got %d", len(capture.Events))
	}
	if capture.Events[0].Channel != "audit" {
		t.Fatalf("expected channel audit, got %q", capture.Events[0].Channel)
	}
}

func TestAdminActivitySinkAdapterListIsNoop(t *testing.T) {
	sink := NewAdminActivitySinkAdapter(dashboardactivity.Hooks{}, dashboardactivity.Config{Enabled: true})
	list, err := sink.List(context.Background(), 10)
	if err != nil {
		t.Fatalf("list error: %v", err)
	}
	if len(list) != 0 {
		t.Fatalf("expected empty list, got %d", len(list))
	}
}
