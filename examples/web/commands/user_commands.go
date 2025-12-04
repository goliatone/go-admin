package commands

import (
	"context"
	"log"

	"github.com/goliatone/go-admin/examples/web/pkg/activity"
	"github.com/goliatone/go-admin/examples/web/stores"
)

// userActivateCommand activates users
type userActivateCommand struct {
	store         *stores.UserStore
	activityHooks activity.ActivityHookSlice
}

// NewUserActivateCommand creates a new user activate command
func NewUserActivateCommand(store *stores.UserStore) *userActivateCommand {
	return &userActivateCommand{store: store}
}

// WithActivityHooks configures activity hooks for event emission
func (c *userActivateCommand) WithActivityHooks(hooks ...activity.ActivityHook) *userActivateCommand {
	c.activityHooks = append(c.activityHooks, hooks...)
	return c
}

func (c *userActivateCommand) Name() string {
	return "users.activate"
}

func (c *userActivateCommand) Execute(ctx context.Context) error {
	log.Println("Activating users...")

	// Emit activity event
	c.activityHooks.Notify(ctx, activity.Event{
		Channel:    "users",
		Verb:       "activated",
		ObjectType: "user",
		ObjectID:   "bulk",
		Data: map[string]any{
			"action": "bulk_activate",
		},
	})

	return nil
}

// userDeactivateCommand deactivates users
type userDeactivateCommand struct {
	store         *stores.UserStore
	activityHooks activity.ActivityHookSlice
}

// NewUserDeactivateCommand creates a new user deactivate command
func NewUserDeactivateCommand(store *stores.UserStore) *userDeactivateCommand {
	return &userDeactivateCommand{store: store}
}

// WithActivityHooks configures activity hooks for event emission
func (c *userDeactivateCommand) WithActivityHooks(hooks ...activity.ActivityHook) *userDeactivateCommand {
	c.activityHooks = append(c.activityHooks, hooks...)
	return c
}

func (c *userDeactivateCommand) Name() string {
	return "users.deactivate"
}

func (c *userDeactivateCommand) Execute(ctx context.Context) error {
	log.Println("Deactivating users...")

	// Emit activity event
	c.activityHooks.Notify(ctx, activity.Event{
		Channel:    "users",
		Verb:       "deactivated",
		ObjectType: "user",
		ObjectID:   "bulk",
		Data: map[string]any{
			"action": "bulk_deactivate",
		},
	})

	return nil
}
