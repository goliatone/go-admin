package quickstart

import (
	"context"
	"strings"
	"time"

	"github.com/goliatone/go-admin/admin"
	auth "github.com/goliatone/go-auth"
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
		metadata := cloneAnyMap(event.Metadata)
		if actorType := strings.TrimSpace(event.Actor.Type); actorType != "" {
			if metadata == nil {
				metadata = map[string]any{}
			}
			if _, ok := metadata[admin.ActivityActorTypeKey]; !ok {
				metadata[admin.ActivityActorTypeKey] = actorType
			}
		}
		if event.FromStatus != "" {
			if metadata == nil {
				metadata = map[string]any{}
			}
			metadata["from_status"] = string(event.FromStatus)
		}
		if event.ToStatus != "" {
			if metadata == nil {
				metadata = map[string]any{}
			}
			metadata["to_status"] = string(event.ToStatus)
		}
		actorID := strings.TrimSpace(event.Actor.ID)
		if actorID == "" {
			actorID = strings.TrimSpace(event.UserID)
		}

		object := strings.TrimSpace(options.objectType)
		if userID := strings.TrimSpace(event.UserID); userID != "" {
			if object != "" {
				object = object + ":" + userID
			} else {
				object = userID
			}
		}

		occurredAt := event.OccurredAt
		if occurredAt.IsZero() {
			occurredAt = time.Now().UTC()
		}

		return sink.Record(ctx, admin.ActivityEntry{
			Actor:     actorID,
			Action:    string(event.EventType),
			Object:    object,
			Channel:   options.channel,
			Metadata:  metadata,
			CreatedAt: occurredAt,
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
