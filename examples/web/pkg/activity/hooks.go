package activity

import "context"

// Event represents a lifecycle event for activity tracking.
// This follows the activity-hooks pattern from go-users where commands
// emit rich events to a slice of hooks for fan-out notification.
type Event struct {
	// Channel categorizes the event source (e.g., "users", "pages", "posts")
	Channel string

	// Verb describes the action taken (e.g., "created", "activated", "published")
	Verb string

	// ObjectType identifies the resource type (e.g., "user", "page", "post")
	ObjectType string

	// ObjectID is the unique identifier of the affected resource
	ObjectID string

	// Data carries rich metadata for context (e.g., email, status, previous values)
	Data map[string]any
}

// ActivityHook receives activity notifications.
// Implementations can log to persistence, emit metrics, trigger workflows, etc.
type ActivityHook interface {
	Notify(ctx context.Context, event Event)
}

// ActivityHookSlice enables fan-out emission to multiple hooks.
// Commands hold a slice of hooks and broadcast events to all registered listeners.
type ActivityHookSlice []ActivityHook

// Notify broadcasts the event to all registered hooks.
// Failures are silently ignored to prevent hook errors from blocking command execution.
func (s ActivityHookSlice) Notify(ctx context.Context, event Event) {
	for _, hook := range s {
		if hook != nil {
			hook.Notify(ctx, event)
		}
	}
}
