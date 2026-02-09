package quickstart

import (
	"context"

	"github.com/goliatone/go-admin/admin"
	dashboardactivity "github.com/goliatone/go-dashboard/pkg/activity"
	"github.com/goliatone/go-dashboard/pkg/activity/admininterop"
)

// NewCompositeActivitySink forwards admin activity entries to the primary sink and dashboard hooks.
func NewCompositeActivitySink(primary admin.ActivitySink, hooks dashboardactivity.Hooks, cfg dashboardactivity.Config) admin.ActivitySink {
	if primary == nil {
		primary = admin.NewActivityFeed()
	}
	var bridge admininterop.Sink
	if hooks.Enabled() {
		bridge = admininterop.NewSink(hooks, cfg)
	}
	return &compositeActivitySink{
		primary: primary,
		bridge:  bridge,
	}
}

type compositeActivitySink struct {
	primary admin.ActivitySink
	bridge  admininterop.Sink
}

func (c *compositeActivitySink) Record(ctx context.Context, entry admin.ActivityEntry) error {
	if err := c.primary.Record(ctx, entry); err != nil {
		return err
	}

	if c.bridge == nil {
		return nil
	}
	return c.bridge.Record(ctx, admininterop.Record{
		Actor:      entry.Actor,
		Action:     entry.Action,
		Object:     entry.Object,
		Channel:    entry.Channel,
		Metadata:   cloneAnyMap(entry.Metadata),
		OccurredAt: entry.CreatedAt,
	})
}

func (c *compositeActivitySink) List(ctx context.Context, limit int, filters ...admin.ActivityFilter) ([]admin.ActivityEntry, error) {
	return c.primary.List(ctx, limit, filters...)
}
