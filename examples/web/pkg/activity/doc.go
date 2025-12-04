// Package activity implements the activity-hooks pattern for event emission.
//
// This pattern follows the strategy from go-users where commands emit rich
// lifecycle events to a slice of hooks, enabling fan-out notification to
// multiple sinks (activity logs, metrics, workflows, external systems).
//
// # Pattern Overview
//
// 1. Hook Contract: ActivityHook interface with Notify(ctx, Event)
// 2. Event Model: Rich metadata (channel, verb, object type/ID, data)
// 3. Fan-out: ActivityHookSlice broadcasts to multiple hooks
// 4. Adapters: Bridge hooks to concrete sinks (admin.ActivitySink, go-users, etc.)
//
// # Usage in Commands
//
//	type UserActivateCommand struct {
//	    store         *stores.UserStore
//	    activityHooks activity.ActivityHookSlice
//	}
//
//	func (c *UserActivateCommand) WithActivityHooks(hooks ...activity.ActivityHook) *UserActivateCommand {
//	    c.activityHooks = append(c.activityHooks, hooks...)
//	    return c
//	}
//
//	func (c *UserActivateCommand) Execute(ctx admin.AdminContext) error {
//	    // ... perform activation ...
//
//	    // Emit activity event
//	    c.activityHooks.Notify(ctx.Context, activity.Event{
//	        Channel:    "users",
//	        Verb:       "activated",
//	        ObjectType: "user",
//	        ObjectID:   userID,
//	        Data: map[string]any{
//	            "email": user.Email,
//	        },
//	    })
//
//	    return nil
//	}
//
// # Wiring in Modules
//
//	func (m *usersModule) Register(ctx admin.ModuleContext) error {
//	    // Create activity adapter
//	    activityAdapter := activity.NewAdminActivityAdapter(ctx.Admin.ActivityFeed())
//
//	    // Register commands with activity hooks
//	    activateCmd := commands.NewUserActivateCommand(m.store).
//	        WithActivityHooks(activityAdapter)
//
//	    ctx.Admin.Commands().Register(activateCmd)
//	    return nil
//	}
//
// # Benefits
//
// - Commands remain decoupled from activity sink implementation
// - Multiple sinks can be wired without changing command code
// - Activity emission is opt-in and composable
// - Rich event metadata supports advanced filtering and analytics
// - Pattern reusable across modules (users, pages, posts, media)
package activity
