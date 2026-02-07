package admin

import (
	"context"
)

// userLifecycleCommand updates the lifecycle status for one or more users.
type userLifecycleCommand struct {
	service    *UserManagementService
	nextStatus string
}

func (c *userLifecycleCommand) transition(ctx context.Context, ids []string) error {
	if c == nil || c.service == nil {
		return serviceNotConfiguredDomainError("user lifecycle command", map[string]any{"component": "user_commands"})
	}
	if len(ids) == 0 {
		return requiredFieldDomainError("user ids", map[string]any{"component": "user_commands"})
	}
	for _, id := range ids {
		if _, err := c.service.TransitionUser(ctx, id, c.nextStatus); err != nil {
			return err
		}
	}
	return nil
}

type userActivateCommand struct {
	userLifecycleCommand
}

func newUserActivateCommand(service *UserManagementService) *userActivateCommand {
	return &userActivateCommand{userLifecycleCommand{service: service, nextStatus: "active"}}
}

func (c *userActivateCommand) Execute(ctx context.Context, msg UserActivateMsg) error {
	return c.transition(ctx, msg.IDs)
}

type userSuspendCommand struct {
	userLifecycleCommand
}

func newUserSuspendCommand(service *UserManagementService) *userSuspendCommand {
	return &userSuspendCommand{userLifecycleCommand{service: service, nextStatus: "suspended"}}
}

func (c *userSuspendCommand) Execute(ctx context.Context, msg UserSuspendMsg) error {
	return c.transition(ctx, msg.IDs)
}

type userDisableCommand struct {
	userLifecycleCommand
}

func newUserDisableCommand(service *UserManagementService) *userDisableCommand {
	return &userDisableCommand{userLifecycleCommand{service: service, nextStatus: "disabled"}}
}

func (c *userDisableCommand) Execute(ctx context.Context, msg UserDisableMsg) error {
	return c.transition(ctx, msg.IDs)
}

type userArchiveCommand struct {
	userLifecycleCommand
}

func newUserArchiveCommand(service *UserManagementService) *userArchiveCommand {
	return &userArchiveCommand{userLifecycleCommand{service: service, nextStatus: "archived"}}
}

func (c *userArchiveCommand) Execute(ctx context.Context, msg UserArchiveMsg) error {
	return c.transition(ctx, msg.IDs)
}
