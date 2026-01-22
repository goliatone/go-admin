# Activity Hooks Pattern

This example demonstrates the **activity-hooks pattern** for event emission in go-admin modules. This pattern follows the strategy from `go-users` where commands emit rich lifecycle events to a slice of hooks, enabling fan-out notification to multiple sinks.

## Pattern Overview

The activity hooks pattern consists of four key components:

1. **Hook Contract**: `ActivityHook` interface with `Notify(ctx, Event)` method
2. **Event Model**: Rich metadata (channel, verb, object type/ID, data)
3. **Fan-out**: `ActivityHookSlice` broadcasts events to multiple registered hooks
4. **Adapters**: Bridge hooks to concrete sinks (admin.ActivitySink, go-users, etc.)

## Implementation

### 1. Hook Contract ([pkg/activity/hooks.go](pkg/activity/hooks.go))

```go
type Event struct {
    Channel    string         // e.g., "users", "pages", "posts"
    Verb       string         // e.g., "created", "activated", "published"
    ObjectType string         // e.g., "user", "page", "post"
    ObjectID   string         // resource identifier
    Data       map[string]any // rich metadata
}

type ActivityHook interface {
    Notify(ctx context.Context, event Event)
}

type ActivityHookSlice []ActivityHook
```

### 2. Admin Activity Adapter ([pkg/activity/adapters.go](pkg/activity/adapters.go))

The `AdminActivityAdapter` bridges activity hooks to `admin.ActivitySink`:

```go
type AdminActivityAdapter struct {
    sink admin.ActivitySink
}

func NewAdminActivityAdapter(sink admin.ActivitySink) *AdminActivityAdapter {
    return &AdminActivityAdapter{sink: sink}
}

func (a *AdminActivityAdapter) Notify(ctx context.Context, event Event) {
    actor := actorFromContext(ctx)
    object := event.ObjectType
    if event.ObjectID != "" {
        object = event.ObjectType + ":" + event.ObjectID
    }

    _ = a.sink.Record(ctx, admin.ActivityEntry{
        Actor:    actor,
        Action:   event.Verb,
        Object:   object,
        Metadata: event.Data,
    })
}
```

### 3. Command Integration

Commands accept activity hooks via a builder pattern:

```go
type userActivateCommand struct {
    store         *stores.UserStore
    activityHooks activity.ActivityHookSlice
}

func (c *userActivateCommand) WithActivityHooks(hooks ...activity.ActivityHook) *userActivateCommand {
    c.activityHooks = append(c.activityHooks, hooks...)
    return c
}

func (c *userActivateCommand) Execute(ctx context.Context) error {
    // ... perform activation logic ...

    // Emit activity event
    c.activityHooks.Notify(ctx, activity.Event{
        Channel:    "users",
        Verb:       "activated",
        ObjectType: "user",
        ObjectID:   userID,
        Data: map[string]any{
            "email": user.Email,
        },
    })

    return nil
}
```

### 4. Module Wiring ([modules.go](modules.go))

Modules create an activity adapter and wire it into commands during registration:

```go
func (m *usersModule) Register(ctx admin.ModuleContext) error {
    // Create activity adapter to bridge command events to admin activity sink
    activityAdapter := activity.NewAdminActivityAdapter(ctx.Admin.ActivityFeed())

    // Register commands with activity hooks for event emission
    activateCmd := commands.NewUserActivateCommand(m.store).
        WithActivityHooks(activityAdapter)
    ctx.Admin.Commands().Register(activateCmd)

    deactivateCmd := commands.NewUserDeactivateCommand(m.store).
        WithActivityHooks(activityAdapter)
    ctx.Admin.Commands().Register(deactivateCmd)

    // ... panel registration ...
}
```

## Activity Flow

```
Command Execution
       ↓
   Event Emission
       ↓
Activity Hook Slice (fan-out)
       ↓
┌──────┴────────┬──────────┐
↓               ↓          ↓
Admin Adapter   Metrics    Workflow
↓               Hook       Hook
ActivitySink
(in-memory or go-users)
```

## Benefits

1. **Decoupling**: Commands remain independent of activity sink implementation
2. **Composability**: Multiple sinks can be wired without changing command code
3. **Opt-in**: Activity emission is optional and composable via builder pattern
4. **Rich Context**: Event metadata supports advanced filtering and analytics
5. **Reusability**: Pattern works across all modules (users, pages, posts, media)

## Examples in This Codebase

### User Commands
- [commands/user_commands.go](commands/user_commands.go): `UserActivateCommand`, `UserDeactivateCommand`

### Page Commands
- [commands/page_commands.go](commands/page_commands.go): `PagePublishCommand`, `PageBulkPublishCommand`, `PageBulkUnpublishCommand`

### Post Commands
- [commands/post_commands.go](commands/post_commands.go): `PostBulkPublishCommand`, `PostBulkArchiveCommand`

### Media Commands
- [commands/media_commands.go](commands/media_commands.go): `MediaBulkDeleteCommand`

## Viewing Activity

Activity events are visible via the admin activity feed API:

```bash
curl "http://localhost:8080/admin/api/activity?limit=5&offset=0&channel=users"
```

Response:
```json
{
  "entries": [
    {
      "id": "1",
      "actor": "admin",
      "action": "activated",
      "object": "user:bulk",
      "metadata": {
        "action": "bulk_activate"
      },
      "created_at": "2025-12-02T10:30:00Z"
    }
  ],
  "total": 1,
  "next_offset": 1,
  "has_more": false
}
```

Notes:
- Defaults: limit 50 (max 200), offset 0; ordered by most recent first.
- Filters: `user_id`, `actor_id`, `verb`, `object_type`, `object_id`, `channel`/`channels`, `channel_denylist`, `since`, `until`, `q`.
- `channel` and `channels` are mutually exclusive.
- Access is scoped by the go-users policy (non-admins see their own activity; machine activity may be hidden).

## Extending with Custom Hooks

You can add custom hooks alongside the admin adapter:

```go
// Custom metrics hook
type MetricsActivityHook struct {
    metrics MetricsClient
}

func (m *MetricsActivityHook) Notify(ctx context.Context, event activity.Event) {
    m.metrics.Increment(fmt.Sprintf("activity.%s.%s", event.Channel, event.Verb))
}

// Wire it in module registration
func (m *usersModule) Register(ctx admin.ModuleContext) error {
    activityAdapter := activity.NewAdminActivityAdapter(ctx.Admin.ActivityFeed())
    metricsHook := &MetricsActivityHook{metrics: metricsClient}

    activateCmd := commands.NewUserActivateCommand(m.store).
        WithActivityHooks(activityAdapter, metricsHook)
    // ...
}
```

## Integration with go-users

For persistent activity storage and policy-aware reads, wire go-users:

```go
import (
    "github.com/goliatone/go-admin/pkg/admin"
    "github.com/goliatone/go-admin/quickstart"
    users "github.com/goliatone/go-users"
    usersactivity "github.com/goliatone/go-users/activity"
)

// In main.go setup (read path)
adminDeps := admin.Dependencies{
    ActivityRepository:   usersDeps.ActivityRepo,
    ActivityAccessPolicy: usersactivity.NewDefaultAccessPolicy(),
}
adm, _, err := quickstart.NewAdmin(cfg, hooks, quickstart.WithAdminDependencies(adminDeps))

// Write path
usersActivityLogger := users.NewActivityLogger(/* config */)
activitySink := admin.NewActivitySinkAdapter(
    usersActivityLogger,
    usersActivityLogger,
)

adm.WithActivitySink(activitySink)
```

Now all activity events flow to go-users persistent storage while still being available in the admin UI.

## References

- [EXAMPLE_TDD.md](../../docs/prds/EXAMPLE_TDD.md) - Full enhancement plan
- [ADMIN_TDD.md](../../docs/prds/ADMIN_TDD.md#activity-integration) - Architecture reference
- [pkg/activity/doc.go](pkg/activity/doc.go) - Package documentation
