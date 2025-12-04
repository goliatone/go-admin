package commands

import (
	"context"
	"fmt"
	"strings"

	"github.com/goliatone/go-admin/admin"
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
	if c.store == nil {
		return fmt.Errorf("user store is nil")
	}

	targets, err := collectUsers(ctx, c.store, admin.CommandIDs(ctx))
	if err != nil {
		return err
	}

	for _, user := range targets {
		id := strings.TrimSpace(fmt.Sprint(user["id"]))
		if id == "" {
			continue
		}
		currentStatus := strings.ToLower(fmt.Sprint(user["status"]))
		if currentStatus == "active" {
			continue
		}

		record, err := c.store.Update(ctx, id, map[string]any{"status": "active"})
		if err != nil {
			return err
		}
		c.activityHooks.Notify(ctx, activity.Event{
			Channel:    "users",
			Verb:       "activated",
			ObjectType: "user",
			ObjectID:   id,
			Data: map[string]any{
				"from_status": currentStatus,
				"to_status":   "active",
				"email":       record["email"],
				"username":    record["username"],
				"role":        record["role"],
			},
		})
	}

	return nil
}

func (c *userActivateCommand) CLIOptions() *admin.CLIOptions {
	return &admin.CLIOptions{
		Path:        []string{"users", "activate"},
		Description: "Activate selected users",
		Group:       "users",
		Aliases:     []string{"users:activate"},
	}
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
	if c.store == nil {
		return fmt.Errorf("user store is nil")
	}

	targets, err := collectUsers(ctx, c.store, admin.CommandIDs(ctx))
	if err != nil {
		return err
	}

	for _, user := range targets {
		id := strings.TrimSpace(fmt.Sprint(user["id"]))
		if id == "" {
			continue
		}
		currentStatus := strings.ToLower(fmt.Sprint(user["status"]))
		if currentStatus == "inactive" {
			continue
		}

		record, err := c.store.Update(ctx, id, map[string]any{"status": "inactive"})
		if err != nil {
			return err
		}
		c.activityHooks.Notify(ctx, activity.Event{
			Channel:    "users",
			Verb:       "deactivated",
			ObjectType: "user",
			ObjectID:   id,
			Data: map[string]any{
				"from_status": currentStatus,
				"to_status":   "inactive",
				"email":       record["email"],
				"username":    record["username"],
				"role":        record["role"],
			},
		})
	}

	return nil
}

func (c *userDeactivateCommand) CLIOptions() *admin.CLIOptions {
	return &admin.CLIOptions{
		Path:        []string{"users", "deactivate"},
		Description: "Deactivate selected users",
		Group:       "users",
		Aliases:     []string{"users:deactivate"},
	}
}

func collectUsers(ctx context.Context, store *stores.UserStore, ids []string) ([]map[string]any, error) {
	if store == nil {
		return nil, fmt.Errorf("user store is nil")
	}
	if len(ids) == 0 {
		users, _, err := store.List(ctx, admin.ListOptions{PerPage: 1000})
		return users, err
	}
	out := []map[string]any{}
	for _, id := range ids {
		if trimmed := strings.TrimSpace(id); trimmed != "" {
			user, err := store.Get(ctx, trimmed)
			if err != nil {
				return nil, err
			}
			out = append(out, user)
		}
	}
	return out, nil
}
