package commands

import (
	"context"
	"fmt"
	"strings"

	"github.com/goliatone/go-admin/pkg/admin"
	"github.com/goliatone/go-admin/examples/web/helpers"
	"github.com/goliatone/go-admin/examples/web/pkg/activity"
	"github.com/goliatone/go-users/command"
	userstypes "github.com/goliatone/go-users/pkg/types"
	userssvc "github.com/goliatone/go-users/service"
	"github.com/google/uuid"
)

// userLifecycleCommand drives go-users lifecycle transitions through the admin command bus.
type userLifecycleCommand struct {
	name          string
	target        userstypes.LifecycleState
	service       *userssvc.Service
	activityHooks activity.ActivityHookSlice
}

// NewUserLifecycleCommand constructs a lifecycle command for the given target status.
func NewUserLifecycleCommand(service *userssvc.Service, name string, target userstypes.LifecycleState) *userLifecycleCommand {
	return &userLifecycleCommand{
		name:    name,
		target:  target,
		service: service,
	}
}

// WithActivityHooks configures fan-out activity hooks (dashboard bridge).
func (c *userLifecycleCommand) WithActivityHooks(hooks ...activity.ActivityHook) *userLifecycleCommand {
	c.activityHooks = append(c.activityHooks, hooks...)
	return c
}

func (c *userLifecycleCommand) Name() string {
	return c.name
}

func (c *userLifecycleCommand) Execute(ctx context.Context) error {
	if c == nil || c.service == nil || c.service.Commands().BulkUserTransition == nil {
		return fmt.Errorf("user lifecycle command not configured")
	}

	actor := helpers.ActorRefFromContext(ctx)
	if actor.ID == uuid.Nil {
		return fmt.Errorf("actor required for lifecycle transition")
	}

	userIDs := normalizeUserIDs(admin.CommandIDs(ctx))
	if len(userIDs) == 0 {
		return fmt.Errorf("user ids required")
	}

	input := command.BulkUserTransitionInput{
		UserIDs:     userIDs,
		Target:      c.target,
		Actor:       actor,
		Scope:       helpers.ScopeFromContext(ctx),
		StopOnError: true,
	}
	if err := c.service.Commands().BulkUserTransition.Execute(ctx, input); err != nil {
		return err
	}

	c.emitActivity(ctx, userIDs)
	return nil
}

func (c *userLifecycleCommand) CLIOptions() *admin.CLIOptions {
	action := strings.TrimPrefix(c.name, "users.")
	return &admin.CLIOptions{
		Path:        []string{"users", action},
		Description: fmt.Sprintf("Transition users to %s", c.target),
		Group:       "users",
		Aliases:     []string{"users:" + action},
	}
}

func (c *userLifecycleCommand) emitActivity(ctx context.Context, ids []uuid.UUID) {
	if len(c.activityHooks) == 0 {
		return
	}
	verb := fmt.Sprintf("status.%s", c.target)
	for _, id := range ids {
		c.activityHooks.Notify(ctx, activity.Event{
			Channel:    "users",
			Verb:       verb,
			ObjectType: "user",
			ObjectID:   id.String(),
		})
	}
}

func normalizeUserIDs(ids []string) []uuid.UUID {
	clean := make([]uuid.UUID, 0, len(ids))
	for _, raw := range ids {
		id, err := uuid.Parse(strings.TrimSpace(raw))
		if err != nil || id == uuid.Nil {
			continue
		}
		clean = append(clean, id)
	}
	return clean
}
