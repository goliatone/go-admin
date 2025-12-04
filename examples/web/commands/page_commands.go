package commands

import (
	"context"
	"log"

	"github.com/goliatone/go-admin/examples/web/pkg/activity"
	"github.com/goliatone/go-admin/examples/web/stores"
)

// pagePublishCommand publishes a page
type pagePublishCommand struct {
	store         *stores.PageStore
	activityHooks activity.ActivityHookSlice
}

// NewPagePublishCommand creates a new page publish command
func NewPagePublishCommand(store *stores.PageStore) *pagePublishCommand {
	return &pagePublishCommand{store: store}
}

// WithActivityHooks configures activity hooks for event emission
func (c *pagePublishCommand) WithActivityHooks(hooks ...activity.ActivityHook) *pagePublishCommand {
	c.activityHooks = append(c.activityHooks, hooks...)
	return c
}

func (c *pagePublishCommand) Name() string {
	return "pages.publish"
}

func (c *pagePublishCommand) Execute(ctx context.Context) error {
	log.Println("Publishing page...")

	// Emit activity event
	c.activityHooks.Notify(ctx, activity.Event{
		Channel:    "pages",
		Verb:       "published",
		ObjectType: "page",
		ObjectID:   "single",
		Data: map[string]any{
			"action": "publish",
		},
	})

	return nil
}

// pageBulkPublishCommand publishes multiple pages
type pageBulkPublishCommand struct {
	store         *stores.PageStore
	activityHooks activity.ActivityHookSlice
}

// NewPageBulkPublishCommand creates a new page bulk publish command
func NewPageBulkPublishCommand(store *stores.PageStore) *pageBulkPublishCommand {
	return &pageBulkPublishCommand{store: store}
}

// WithActivityHooks configures activity hooks for event emission
func (c *pageBulkPublishCommand) WithActivityHooks(hooks ...activity.ActivityHook) *pageBulkPublishCommand {
	c.activityHooks = append(c.activityHooks, hooks...)
	return c
}

func (c *pageBulkPublishCommand) Name() string {
	return "pages.bulk_publish"
}

func (c *pageBulkPublishCommand) Execute(ctx context.Context) error {
	log.Println("Bulk publishing pages...")

	// Emit activity event
	c.activityHooks.Notify(ctx, activity.Event{
		Channel:    "pages",
		Verb:       "published",
		ObjectType: "page",
		ObjectID:   "bulk",
		Data: map[string]any{
			"action": "bulk_publish",
		},
	})

	return nil
}

// pageBulkUnpublishCommand unpublishes multiple pages
type pageBulkUnpublishCommand struct {
	store         *stores.PageStore
	activityHooks activity.ActivityHookSlice
}

// NewPageBulkUnpublishCommand creates a new page bulk unpublish command
func NewPageBulkUnpublishCommand(store *stores.PageStore) *pageBulkUnpublishCommand {
	return &pageBulkUnpublishCommand{store: store}
}

// WithActivityHooks configures activity hooks for event emission
func (c *pageBulkUnpublishCommand) WithActivityHooks(hooks ...activity.ActivityHook) *pageBulkUnpublishCommand {
	c.activityHooks = append(c.activityHooks, hooks...)
	return c
}

func (c *pageBulkUnpublishCommand) Name() string {
	return "pages.bulk_unpublish"
}

func (c *pageBulkUnpublishCommand) Execute(ctx context.Context) error {
	log.Println("Bulk unpublishing pages...")

	// Emit activity event
	c.activityHooks.Notify(ctx, activity.Event{
		Channel:    "pages",
		Verb:       "unpublished",
		ObjectType: "page",
		ObjectID:   "bulk",
		Data: map[string]any{
			"action": "bulk_unpublish",
		},
	})

	return nil
}
