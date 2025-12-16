package commands

import (
	"context"
	"fmt"
	"strings"

	"github.com/goliatone/go-admin/examples/web/pkg/activity"
	"github.com/goliatone/go-admin/examples/web/stores"
	"github.com/goliatone/go-admin/pkg/admin"
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
	if c.store == nil {
		return fmt.Errorf("media store is nil")
	}

	ids := admin.CommandIDs(ctx)
	if len(ids) == 0 {
		records, _, err := c.store.List(ctx, admin.ListOptions{})
		if err != nil {
			return err
		}
		for _, record := range records {
			if id := strings.TrimSpace(fmt.Sprint(record["id"])); id != "" {
				ids = append(ids, id)
			}
		}
	}

	deleted, err := c.store.DeleteMany(ctx, ids)
	if err != nil {
		return err
	}

	for _, media := range deleted {
		id := strings.TrimSpace(fmt.Sprint(media["id"]))
		c.activityHooks.Notify(ctx, activity.Event{
			Channel:    "media",
			Verb:       "deleted",
			ObjectType: "media",
			ObjectID:   id,
			Data: map[string]any{
				"filename": media["filename"],
				"type":     media["type"],
				"url":      media["url"],
			},
		})
	}

	return nil
}

func (c *mediaBulkDeleteCommand) CLIOptions() *admin.CLIOptions {
	return &admin.CLIOptions{
		Path:        []string{"media", "bulk", "delete"},
		Description: "Bulk delete media items",
		Group:       "media",
		Aliases:     []string{"media:bulk-delete"},
	}
}
