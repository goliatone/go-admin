package quickstart

import (
	"context"
	"strings"

	"github.com/goliatone/go-admin/admin"
	auth "github.com/goliatone/go-auth"
	"github.com/goliatone/go-auth/activitymap"
	dashboardactivity "github.com/goliatone/go-dashboard/pkg/activity"
)

// GoAuthActivitySinkOption customizes how go-auth activity events are mapped.
type GoAuthActivitySinkOption func(*goAuthActivitySinkOptions)

type goAuthActivitySinkOptions struct {
	channel    string
	objectType string
}

// WithGoAuthActivityChannel overrides the channel used for go-auth events.
func WithGoAuthActivityChannel(channel string) GoAuthActivitySinkOption {
	return func(opts *goAuthActivitySinkOptions) {
		if opts != nil {
			opts.channel = strings.TrimSpace(channel)
		}
	}
}

// WithGoAuthActivityObjectType overrides the object type used for go-auth events.
func WithGoAuthActivityObjectType(objectType string) GoAuthActivitySinkOption {
	return func(opts *goAuthActivitySinkOptions) {
		if opts != nil {
			opts.objectType = strings.TrimSpace(objectType)
		}
	}
}

// NewGoAuthActivitySink adapts go-auth activity events into the admin activity sink.
func NewGoAuthActivitySink(sink admin.ActivitySink, opts ...GoAuthActivitySinkOption) auth.ActivitySink {
	options := goAuthActivitySinkOptions{
		channel:    "auth",
		objectType: "user",
	}
	for _, opt := range opts {
		if opt != nil {
			opt(&options)
		}
	}
	return auth.ActivitySinkFunc(func(ctx context.Context, event auth.ActivityEvent) error {
		if sink == nil {
			return nil
		}
		normalized := activitymap.Normalize(
			event,
			activitymap.WithDefaultChannel(options.channel),
			activitymap.WithDefaultObjectType(options.objectType),
			// Preserve previous empty actor behavior when actor/user identifiers are missing.
			activitymap.WithActorFallback(""),
		)

		object := strings.TrimSpace(normalized.ObjectType)
		if objectID := strings.TrimSpace(normalized.ObjectID); objectID != "" {
			if object != "" {
				object = object + ":" + objectID
			} else {
				object = objectID
			}
		}

		return sink.Record(ctx, admin.ActivityEntry{
			Actor:     normalized.ActorID,
			Action:    normalized.Verb,
			Object:    object,
			Channel:   normalized.Channel,
			Metadata:  normalized.Metadata,
			CreatedAt: normalized.OccurredAt,
		})
	})
}

// AttachGoAuthActivitySink wires the go-auth activity adapter into the auther.
func AttachGoAuthActivitySink(auther *auth.Auther, sink admin.ActivitySink, opts ...GoAuthActivitySinkOption) {
	if auther == nil {
		return
	}
	auther.WithActivitySink(NewGoAuthActivitySink(sink, opts...))
}

// SharedActivitySinks bundles the admin + go-auth adapters.
type SharedActivitySinks struct {
	Admin admin.ActivitySink
	Auth  auth.ActivitySink
}

// NewSharedActivitySinks builds a shared activity sink for admin/go-users/go-auth.
func NewSharedActivitySinks(primary admin.ActivitySink, hooks dashboardactivity.Hooks, cfg dashboardactivity.Config, opts ...GoAuthActivitySinkOption) SharedActivitySinks {
	adminSink := NewCompositeActivitySink(primary, hooks, cfg)
	return SharedActivitySinks{
		Admin: adminSink,
		Auth:  NewGoAuthActivitySink(adminSink, opts...),
	}
}
