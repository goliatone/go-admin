package commands

import (
	"context"
	"log"

	"github.com/goliatone/go-admin/examples/web/pkg/activity"
	"github.com/goliatone/go-admin/examples/web/stores"
)

// mediaBulkDeleteCommand deletes multiple media files
type mediaBulkDeleteCommand struct {
	store         *stores.MediaStore
	activityHooks activity.ActivityHookSlice
}

// NewMediaBulkDeleteCommand creates a new media bulk delete command
func NewMediaBulkDeleteCommand(store *stores.MediaStore) *mediaBulkDeleteCommand {
	return &mediaBulkDeleteCommand{store: store}
}

// WithActivityHooks configures activity hooks for event emission
func (c *mediaBulkDeleteCommand) WithActivityHooks(hooks ...activity.ActivityHook) *mediaBulkDeleteCommand {
	c.activityHooks = append(c.activityHooks, hooks...)
	return c
}

func (c *mediaBulkDeleteCommand) Name() string {
	return "media.bulk_delete"
}

func (c *mediaBulkDeleteCommand) Execute(ctx context.Context) error {
	log.Println("Bulk deleting media...")

	// Emit activity event
	c.activityHooks.Notify(ctx, activity.Event{
		Channel:    "media",
		Verb:       "deleted",
		ObjectType: "media",
		ObjectID:   "bulk",
		Data: map[string]any{
			"action": "bulk_delete",
		},
	})

	return nil
}
