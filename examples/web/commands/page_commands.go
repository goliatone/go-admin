package commands

import (
	"context"
	"fmt"
	"strings"

	"github.com/goliatone/go-admin/admin"
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
	if c.store == nil {
		return fmt.Errorf("page store is nil")
	}

	pages, err := c.store.Publish(ctx, admin.CommandIDs(ctx))
	if err != nil {
		return err
	}

	for _, page := range pages {
		id := strings.TrimSpace(fmt.Sprint(page["id"]))
		c.activityHooks.Notify(ctx, activity.Event{
			Channel:    "pages",
			Verb:       "published",
			ObjectType: "page",
			ObjectID:   id,
			Data: map[string]any{
				"title":  page["title"],
				"slug":   page["slug"],
				"status": page["status"],
			},
		})
	}

	return nil
}

func (c *pagePublishCommand) CLIOptions() *admin.CLIOptions {
	return &admin.CLIOptions{
		Path:        []string{"pages", "publish"},
		Description: "Publish selected pages",
		Group:       "pages",
		Aliases:     []string{"pages:publish"},
	}
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
	if c.store == nil {
		return fmt.Errorf("page store is nil")
	}

	pages, err := c.store.Publish(ctx, admin.CommandIDs(ctx))
	if err != nil {
		return err
	}

	for _, page := range pages {
		id := strings.TrimSpace(fmt.Sprint(page["id"]))
		c.activityHooks.Notify(ctx, activity.Event{
			Channel:    "pages",
			Verb:       "published",
			ObjectType: "page",
			ObjectID:   id,
			Data: map[string]any{
				"title":  page["title"],
				"slug":   page["slug"],
				"status": page["status"],
			},
		})
	}

	return nil
}

func (c *pageBulkPublishCommand) CLIOptions() *admin.CLIOptions {
	return &admin.CLIOptions{
		Path:        []string{"pages", "bulk", "publish"},
		Description: "Bulk publish pages",
		Group:       "pages",
		Aliases:     []string{"pages:bulk-publish"},
	}
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
	if c.store == nil {
		return fmt.Errorf("page store is nil")
	}

	pages, err := c.store.Unpublish(ctx, admin.CommandIDs(ctx))
	if err != nil {
		return err
	}

	for _, page := range pages {
		id := strings.TrimSpace(fmt.Sprint(page["id"]))
		c.activityHooks.Notify(ctx, activity.Event{
			Channel:    "pages",
			Verb:       "unpublished",
			ObjectType: "page",
			ObjectID:   id,
			Data: map[string]any{
				"title":  page["title"],
				"slug":   page["slug"],
				"status": page["status"],
			},
		})
	}

	return nil
}

func (c *pageBulkUnpublishCommand) CLIOptions() *admin.CLIOptions {
	return &admin.CLIOptions{
		Path:        []string{"pages", "bulk", "unpublish"},
		Description: "Bulk unpublish pages",
		Group:       "pages",
		Aliases:     []string{"pages:bulk-unpublish"},
	}
}
