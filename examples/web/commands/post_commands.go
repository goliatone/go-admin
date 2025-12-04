package commands

import (
	"context"
	"fmt"
	"strings"

	"github.com/goliatone/go-admin/admin"
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
	if c.store == nil {
		return fmt.Errorf("post store is nil")
	}

	posts, err := c.store.Publish(ctx, admin.CommandIDs(ctx))
	if err != nil {
		return err
	}

	for _, post := range posts {
		id := strings.TrimSpace(fmt.Sprint(post["id"]))
		c.activityHooks.Notify(ctx, activity.Event{
			Channel:    "posts",
			Verb:       "published",
			ObjectType: "post",
			ObjectID:   id,
			Data: map[string]any{
				"title":    post["title"],
				"slug":     post["slug"],
				"status":   post["status"],
				"category": post["category"],
			},
		})
	}

	return nil
}

func (c *postBulkPublishCommand) CLIOptions() *admin.CLIOptions {
	return &admin.CLIOptions{
		Path:        []string{"posts", "bulk", "publish"},
		Description: "Publish selected posts",
		Group:       "posts",
		Aliases:     []string{"posts:bulk-publish"},
	}
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
	if c.store == nil {
		return fmt.Errorf("post store is nil")
	}

	posts, err := c.store.Archive(ctx, admin.CommandIDs(ctx))
	if err != nil {
		return err
	}

	for _, post := range posts {
		id := strings.TrimSpace(fmt.Sprint(post["id"]))
		c.activityHooks.Notify(ctx, activity.Event{
			Channel:    "posts",
			Verb:       "archived",
			ObjectType: "post",
			ObjectID:   id,
			Data: map[string]any{
				"title":    post["title"],
				"slug":     post["slug"],
				"status":   post["status"],
				"category": post["category"],
			},
		})
	}

	return nil
}

func (c *postBulkArchiveCommand) CLIOptions() *admin.CLIOptions {
	return &admin.CLIOptions{
		Path:        []string{"posts", "bulk", "archive"},
		Description: "Archive selected posts",
		Group:       "posts",
		Aliases:     []string{"posts:bulk-archive"},
	}
}
