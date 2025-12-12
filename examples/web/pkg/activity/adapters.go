package activity

import (
	"context"

	"github.com/goliatone/go-admin/pkg/admin"
	auth "github.com/goliatone/go-auth"
)

// AdminActivityAdapter bridges activity hooks to admin.ActivitySink.
// This adapter allows commands to emit activity events through the hook contract
// while delegating actual persistence to the admin orchestrator's activity sink.
type AdminActivityAdapter struct {
	sink admin.ActivitySink
}

// NewAdminActivityAdapter creates an adapter that forwards events to an admin.ActivitySink.
func NewAdminActivityAdapter(sink admin.ActivitySink) *AdminActivityAdapter {
	return &AdminActivityAdapter{sink: sink}
}

// Notify converts an activity Event to an ActivityEntry and records it via the sink.
func (a *AdminActivityAdapter) Notify(ctx context.Context, event Event) {
	if a.sink == nil {
		return
	}

	actor := actorFromContext(ctx)
	object := event.ObjectType
	if event.ObjectID != "" {
		object = event.ObjectType + ":" + event.ObjectID
	}

	_ = a.sink.Record(ctx, admin.ActivityEntry{
		Actor:    actor,
		Action:   event.Verb,
		Object:   object,
		Channel:  event.Channel,
		Metadata: event.Data,
	})
}

// actorFromContext extracts the actor identifier from go-auth context.
// Falls back to "system" when no authenticated actor is present.
func actorFromContext(ctx context.Context) string {
	if ctx == nil {
		return "system"
	}

	if actor, ok := auth.ActorFromContext(ctx); ok && actor != nil {
		if actor.ActorID != "" {
			return actor.ActorID
		}
		if actor.Subject != "" {
			return actor.Subject
		}
	}

	return "system"
}
