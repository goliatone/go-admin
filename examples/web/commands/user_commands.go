package commands

import (
	"context"
	"fmt"
	"strings"

	"github.com/goliatone/go-admin/examples/web/helpers"
	"github.com/goliatone/go-admin/examples/web/pkg/activity"
	"github.com/goliatone/go-admin/pkg/admin"
	"github.com/goliatone/go-users/command"
	userstypes "github.com/goliatone/go-users/pkg/types"
	userssvc "github.com/goliatone/go-users/service"
	"github.com/google/uuid"
)

type userLifecycleBase struct {
	name          string
	target        userstypes.LifecycleState
	service       *userssvc.Service
	activityHooks activity.ActivityHookSlice
}

func (c *userLifecycleBase) withActivityHooks(hooks ...activity.ActivityHook) {
	c.activityHooks = append(c.activityHooks, hooks...)
}

func (c *userLifecycleBase) transition(ctx context.Context, ids []string) error {
	if c == nil || c.service == nil || c.service.Commands().BulkUserTransition == nil {
		return fmt.Errorf("user lifecycle command not configured")
	}

	actor := helpers.ActorRefFromContext(ctx)
	if actor.ID == uuid.Nil {
		return fmt.Errorf("actor required for lifecycle transition")
	}

	userIDs := normalizeUserIDs(ids)
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

func (c *userLifecycleBase) CLIHandler() any {
	return &admin.NoopCLIHandler{}
}

func (c *userLifecycleBase) cliOptions() admin.CLIConfig {
	action := strings.TrimPrefix(c.name, "users.")
	return admin.CLIConfig{
		Path:        []string{"users", action},
		Description: fmt.Sprintf("Transition users to %s", c.target),
		Group:       "users",
		Aliases:     []string{"users:" + action},
	}
}

func (c *userLifecycleBase) emitActivity(ctx context.Context, ids []uuid.UUID) {
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

type userActivateCommand struct {
	userLifecycleBase
}

// NewUserActivateCommand constructs a lifecycle command for active status.
func NewUserActivateCommand(service *userssvc.Service) *userActivateCommand {
	return &userActivateCommand{
		userLifecycleBase{
			name:    "users.activate",
			target:  userstypes.LifecycleStateActive,
			service: service,
		},
	}
}

func (c *userActivateCommand) WithActivityHooks(hooks ...activity.ActivityHook) *userActivateCommand {
	c.withActivityHooks(hooks...)
	return c
}

func (c *userActivateCommand) Execute(ctx context.Context, msg admin.UserActivateMsg) error {
	return c.transition(ctx, msg.IDs)
}

func (c *userActivateCommand) CLIOptions() admin.CLIConfig { return c.cliOptions() }

type userSuspendCommand struct {
	userLifecycleBase
}

// NewUserSuspendCommand constructs a lifecycle command for suspended status.
func NewUserSuspendCommand(service *userssvc.Service) *userSuspendCommand {
	return &userSuspendCommand{
		userLifecycleBase{
			name:    "users.suspend",
			target:  userstypes.LifecycleStateSuspended,
			service: service,
		},
	}
}

func (c *userSuspendCommand) WithActivityHooks(hooks ...activity.ActivityHook) *userSuspendCommand {
	c.withActivityHooks(hooks...)
	return c
}

func (c *userSuspendCommand) Execute(ctx context.Context, msg admin.UserSuspendMsg) error {
	return c.transition(ctx, msg.IDs)
}

func (c *userSuspendCommand) CLIOptions() admin.CLIConfig { return c.cliOptions() }

type userDisableCommand struct {
	userLifecycleBase
}

// NewUserDisableCommand constructs a lifecycle command for disabled status.
func NewUserDisableCommand(service *userssvc.Service) *userDisableCommand {
	return &userDisableCommand{
		userLifecycleBase{
			name:    "users.disable",
			target:  userstypes.LifecycleStateDisabled,
			service: service,
		},
	}
}

func (c *userDisableCommand) WithActivityHooks(hooks ...activity.ActivityHook) *userDisableCommand {
	c.withActivityHooks(hooks...)
	return c
}

func (c *userDisableCommand) Execute(ctx context.Context, msg admin.UserDisableMsg) error {
	return c.transition(ctx, msg.IDs)
}

func (c *userDisableCommand) CLIOptions() admin.CLIConfig { return c.cliOptions() }

type userArchiveCommand struct {
	userLifecycleBase
}

// NewUserArchiveCommand constructs a lifecycle command for archived status.
func NewUserArchiveCommand(service *userssvc.Service) *userArchiveCommand {
	return &userArchiveCommand{
		userLifecycleBase{
			name:    "users.archive",
			target:  userstypes.LifecycleStateArchived,
			service: service,
		},
	}
}

func (c *userArchiveCommand) WithActivityHooks(hooks ...activity.ActivityHook) *userArchiveCommand {
	c.withActivityHooks(hooks...)
	return c
}

func (c *userArchiveCommand) Execute(ctx context.Context, msg admin.UserArchiveMsg) error {
	return c.transition(ctx, msg.IDs)
}

func (c *userArchiveCommand) CLIOptions() admin.CLIConfig { return c.cliOptions() }

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
