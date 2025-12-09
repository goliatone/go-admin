package admin

import (
	"context"
	"errors"
)

// userLifecycleCommand updates the lifecycle status for one or more users.
type userLifecycleCommand struct {
	service    *UserManagementService
	name       string
	nextStatus string
}

func newUserLifecycleCommand(service *UserManagementService, name, status string) Command {
	return &userLifecycleCommand{service: service, name: name, nextStatus: status}
}

func (c *userLifecycleCommand) Name() string {
	if c == nil {
		return ""
	}
	return c.name
}

func (c *userLifecycleCommand) Execute(ctx context.Context) error {
	if c == nil || c.service == nil {
		return errors.New("user lifecycle command not configured")
	}
	ids := CommandIDs(ctx)
	if len(ids) == 0 {
		return errors.New("user ids required")
	}
	for _, id := range ids {
		if _, err := c.service.TransitionUser(ctx, id, c.nextStatus); err != nil {
			return err
		}
	}
	return nil
}
