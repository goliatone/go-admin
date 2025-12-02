package commands

import (
	"context"
	"log"

	"github.com/goliatone/go-admin/examples/web/stores"
)

// userActivateCommand activates users
type userActivateCommand struct {
	store *stores.UserStore
}

// NewUserActivateCommand creates a new user activate command
func NewUserActivateCommand(store *stores.UserStore) *userActivateCommand {
	return &userActivateCommand{store: store}
}

func (c *userActivateCommand) Name() string {
	return "users.activate"
}

func (c *userActivateCommand) Execute(ctx context.Context) error {
	log.Println("Activating users...")
	return nil
}

// userDeactivateCommand deactivates users
type userDeactivateCommand struct {
	store *stores.UserStore
}

// NewUserDeactivateCommand creates a new user deactivate command
func NewUserDeactivateCommand(store *stores.UserStore) *userDeactivateCommand {
	return &userDeactivateCommand{store: store}
}

func (c *userDeactivateCommand) Name() string {
	return "users.deactivate"
}

func (c *userDeactivateCommand) Execute(ctx context.Context) error {
	log.Println("Deactivating users...")
	return nil
}
