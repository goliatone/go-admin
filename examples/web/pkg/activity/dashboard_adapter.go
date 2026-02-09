package activity

import (
	"context"

	"github.com/goliatone/go-admin/pkg/admin"
	dashboardactivity "github.com/goliatone/go-dashboard/pkg/activity"
	"github.com/goliatone/go-dashboard/pkg/activity/admininterop"
)

// DashboardActivityHook adapts go-admin activity events to go-dashboard activity hooks.
// This allows admin activity to be emitted to go-dashboard's hook system for
// broader integration (metrics, analytics, notifications, etc).
type DashboardActivityHook struct {
	emitter *dashboardactivity.Emitter
}

// NewDashboardActivityHook creates an adapter that forwards admin activity to go-dashboard hooks.
func NewDashboardActivityHook(hooks dashboardactivity.Hooks, cfg dashboardactivity.Config) *DashboardActivityHook {
	return &DashboardActivityHook{
		emitter: dashboardactivity.NewEmitter(hooks, cfg),
	}
}

// Notify implements the activity.ActivityHook interface by converting admin events
// to go-dashboard events and emitting them through the dashboard activity system.
func (h *DashboardActivityHook) Notify(ctx context.Context, event Event) {
	if h.emitter == nil || !h.emitter.Enabled() {
		return
	}

	// Convert admin activity event to dashboard activity event
	dashEvent := dashboardactivity.Event{
		Verb:       event.Verb,
		ActorID:    actorFromContext(ctx),
		ObjectType: event.ObjectType,
		ObjectID:   event.ObjectID,
		Channel:    event.Channel,
		Metadata:   event.Data,
	}

	// Emit to dashboard hooks (errors are logged by the emitter)
	_ = h.emitter.Emit(ctx, dashEvent)
}

// AdminActivitySinkAdapter adapts go-dashboard activity hooks to admin.ActivitySink.
// This allows dashboard activity hooks to receive events from admin's activity system.
type AdminActivitySinkAdapter struct {
	sink admininterop.Sink
}

// NewAdminActivitySinkAdapter creates an adapter that forwards admin ActivityEntry
// records to go-dashboard activity hooks.
func NewAdminActivitySinkAdapter(hooks dashboardactivity.Hooks, cfg dashboardactivity.Config) *AdminActivitySinkAdapter {
	return &AdminActivitySinkAdapter{
		sink: admininterop.NewSink(hooks, cfg),
	}
}

// Record implements admin.ActivitySink by converting ActivityEntry to dashboard Event.
func (a *AdminActivitySinkAdapter) Record(ctx context.Context, entry admin.ActivityEntry) error {
	if a == nil || a.sink == nil {
		return nil
	}
	return a.sink.Record(ctx, admininterop.Record{
		Actor:      entry.Actor,
		Action:     entry.Action,
		Object:     entry.Object,
		Channel:    entry.Channel,
		Metadata:   entry.Metadata,
		OccurredAt: entry.CreatedAt,
	})
}

// List implements admin.ActivitySink but is not supported by this adapter
// since go-dashboard hooks are write-only.
func (a *AdminActivitySinkAdapter) List(ctx context.Context, limit int, filters ...admin.ActivityFilter) ([]admin.ActivityEntry, error) {
	// Dashboard hooks don't support listing - return empty
	return []admin.ActivityEntry{}, nil
}
