package commands

import (
	"context"
	"log"

	"github.com/goliatone/go-admin/examples/web/pkg/activity"
	"github.com/goliatone/go-admin/examples/web/stores"
)

// postBulkPublishCommand publishes multiple posts
type postBulkPublishCommand struct {
	store         *stores.PostStore
	activityHooks activity.ActivityHookSlice
}

// NewPostBulkPublishCommand creates a new post bulk publish command
func NewPostBulkPublishCommand(store *stores.PostStore) *postBulkPublishCommand {
	return &postBulkPublishCommand{store: store}
}

// WithActivityHooks configures activity hooks for event emission
func (c *postBulkPublishCommand) WithActivityHooks(hooks ...activity.ActivityHook) *postBulkPublishCommand {
	c.activityHooks = append(c.activityHooks, hooks...)
	return c
}

func (c *postBulkPublishCommand) Name() string {
	return "posts.bulk_publish"
}

func (c *postBulkPublishCommand) Execute(ctx context.Context) error {
	log.Println("Bulk publishing posts...")

	// Emit activity event
	c.activityHooks.Notify(ctx, activity.Event{
		Channel:    "posts",
		Verb:       "published",
		ObjectType: "post",
		ObjectID:   "bulk",
		Data: map[string]any{
			"action": "bulk_publish",
		},
	})

	return nil
}

// postBulkArchiveCommand archives multiple posts
type postBulkArchiveCommand struct {
	store         *stores.PostStore
	activityHooks activity.ActivityHookSlice
}

// NewPostBulkArchiveCommand creates a new post bulk archive command
func NewPostBulkArchiveCommand(store *stores.PostStore) *postBulkArchiveCommand {
	return &postBulkArchiveCommand{store: store}
}

// WithActivityHooks configures activity hooks for event emission
func (c *postBulkArchiveCommand) WithActivityHooks(hooks ...activity.ActivityHook) *postBulkArchiveCommand {
	c.activityHooks = append(c.activityHooks, hooks...)
	return c
}

func (c *postBulkArchiveCommand) Name() string {
	return "posts.bulk_archive"
}

func (c *postBulkArchiveCommand) Execute(ctx context.Context) error {
	log.Println("Bulk archiving posts...")

	// Emit activity event
	c.activityHooks.Notify(ctx, activity.Event{
		Channel:    "posts",
		Verb:       "archived",
		ObjectType: "post",
		ObjectID:   "bulk",
		Data: map[string]any{
			"action": "bulk_archive",
		},
	})

	return nil
}
