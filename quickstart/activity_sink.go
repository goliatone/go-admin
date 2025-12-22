package quickstart

import (
	"context"
	"strings"

	"github.com/goliatone/go-admin/admin"
	dashboardactivity "github.com/goliatone/go-dashboard/pkg/activity"
)

// NewCompositeActivitySink forwards admin activity entries to the primary sink and dashboard hooks.
func NewCompositeActivitySink(primary admin.ActivitySink, hooks dashboardactivity.Hooks, cfg dashboardactivity.Config) admin.ActivitySink {
	if primary == nil {
		primary = admin.NewActivityFeed()
	}
	var emitter *dashboardactivity.Emitter
	if hooks.Enabled() {
		emitter = dashboardactivity.NewEmitter(hooks, cfg)
	}
	return &compositeActivitySink{
		primary: primary,
		emitter: emitter,
	}
}

type compositeActivitySink struct {
	primary admin.ActivitySink
	emitter *dashboardactivity.Emitter
}

func (c *compositeActivitySink) Record(ctx context.Context, entry admin.ActivityEntry) error {
	if err := c.primary.Record(ctx, entry); err != nil {
		return err
	}

	if c.emitter == nil || !c.emitter.Enabled() {
		return nil
	}

	objectType := entry.Object
	objectID := ""
	if typ, id, ok := strings.Cut(entry.Object, ":"); ok {
		objectType = strings.TrimSpace(typ)
		objectID = strings.TrimSpace(id)
	}

	channel := strings.TrimSpace(entry.Channel)
	if channel == "" {
		channel = "admin"
	}

	event := dashboardactivity.Event{
		Verb:       entry.Action,
		ActorID:    entry.Actor,
		ObjectType: objectType,
		ObjectID:   objectID,
		Channel:    channel,
		Metadata:   cloneAnyMap(entry.Metadata),
		OccurredAt: entry.CreatedAt,
	}

	return c.emitter.Emit(ctx, event)
}

func (c *compositeActivitySink) List(ctx context.Context, limit int, filters ...admin.ActivityFilter) ([]admin.ActivityEntry, error) {
	return c.primary.List(ctx, limit, filters...)
}
