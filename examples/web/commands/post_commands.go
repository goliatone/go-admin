package commands

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/goliatone/go-admin/examples/web/pkg/activity"
	"github.com/goliatone/go-admin/examples/web/stores"
	"github.com/goliatone/go-admin/pkg/admin"
)

// postBulkPublishCommand publishes multiple posts
type postBulkPublishCommand struct {
	store         stores.PostRepository
	activityHooks activity.ActivityHookSlice
}

// NewPostBulkPublishCommand creates a new post bulk publish command
func NewPostBulkPublishCommand(store stores.PostRepository) *postBulkPublishCommand {
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

func (c *postBulkPublishCommand) Execute(ctx context.Context, msg PostBulkPublishMsg) error {
	if c.store == nil {
		return fmt.Errorf("post store is nil")
	}

	posts, err := c.store.Publish(ctx, msg.IDs)
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

// postBulkUnpublishCommand marks posts as drafts.
type postBulkUnpublishCommand struct {
	store         stores.PostRepository
	activityHooks activity.ActivityHookSlice
}

// NewPostBulkUnpublishCommand creates a new post bulk unpublish command.
func NewPostBulkUnpublishCommand(store stores.PostRepository) *postBulkUnpublishCommand {
	return &postBulkUnpublishCommand{store: store}
}

// WithActivityHooks configures activity hooks for event emission.
func (c *postBulkUnpublishCommand) WithActivityHooks(hooks ...activity.ActivityHook) *postBulkUnpublishCommand {
	c.activityHooks = append(c.activityHooks, hooks...)
	return c
}

func (c *postBulkUnpublishCommand) Name() string {
	return "posts.bulk_unpublish"
}

func (c *postBulkUnpublishCommand) Execute(ctx context.Context, msg PostBulkUnpublishMsg) error {
	if c.store == nil {
		return fmt.Errorf("post store is nil")
	}

	posts, err := c.store.Unpublish(ctx, msg.IDs)
	if err != nil {
		return err
	}

	for _, post := range posts {
		id := strings.TrimSpace(fmt.Sprint(post["id"]))
		c.activityHooks.Notify(ctx, activity.Event{
			Channel:    "posts",
			Verb:       "unpublished",
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

func (c *postBulkUnpublishCommand) CLIOptions() *admin.CLIOptions {
	return &admin.CLIOptions{
		Path:        []string{"posts", "bulk", "unpublish"},
		Description: "Unpublish selected posts",
		Group:       "posts",
		Aliases:     []string{"posts:bulk-unpublish"},
	}
}

// postBulkScheduleCommand schedules posts for publication.
type postBulkScheduleCommand struct {
	store         stores.PostRepository
	activityHooks activity.ActivityHookSlice
}

// NewPostBulkScheduleCommand creates a new post bulk schedule command.
func NewPostBulkScheduleCommand(store stores.PostRepository) *postBulkScheduleCommand {
	return &postBulkScheduleCommand{store: store}
}

// WithActivityHooks configures activity hooks for event emission.
func (c *postBulkScheduleCommand) WithActivityHooks(hooks ...activity.ActivityHook) *postBulkScheduleCommand {
	c.activityHooks = append(c.activityHooks, hooks...)
	return c
}

func (c *postBulkScheduleCommand) Name() string {
	return "posts.bulk_schedule"
}

func (c *postBulkScheduleCommand) Execute(ctx context.Context, msg PostBulkScheduleMsg) error {
	if c.store == nil {
		return fmt.Errorf("post store is nil")
	}

	publishAt := msg.PublishAt
	if publishAt.IsZero() {
		publishAt = msg.ScheduledAt
	}
	if publishAt.IsZero() && msg.Payload != nil {
		raw := msg.Payload["publish_at"]
		if raw == nil {
			raw = msg.Payload["scheduled_at"]
		}
		switch v := raw.(type) {
		case time.Time:
			if !v.IsZero() {
				publishAt = v
			}
		case *time.Time:
			if v != nil && !v.IsZero() {
				publishAt = *v
			}
		case string:
			if parsed, err := time.Parse(time.RFC3339, strings.TrimSpace(v)); err == nil {
				publishAt = parsed
			}
		}
	}
	if publishAt.IsZero() {
		publishAt = time.Now()
	}

	posts, err := c.store.Schedule(ctx, msg.IDs, publishAt)
	if err != nil {
		return err
	}

	for _, post := range posts {
		id := strings.TrimSpace(fmt.Sprint(post["id"]))
		c.activityHooks.Notify(ctx, activity.Event{
			Channel:    "posts",
			Verb:       "scheduled",
			ObjectType: "post",
			ObjectID:   id,
			Data: map[string]any{
				"title":       post["title"],
				"slug":        post["slug"],
				"status":      post["status"],
				"publish_at":  publishAt.UTC(),
				"category":    post["category"],
				"publishedAt": post["published_at"],
			},
		})
	}

	return nil
}

func (c *postBulkScheduleCommand) CLIOptions() *admin.CLIOptions {
	return &admin.CLIOptions{
		Path:        []string{"posts", "bulk", "schedule"},
		Description: "Schedule selected posts",
		Group:       "posts",
		Aliases:     []string{"posts:bulk-schedule"},
	}
}

// postBulkArchiveCommand archives multiple posts
type postBulkArchiveCommand struct {
	store         stores.PostRepository
	activityHooks activity.ActivityHookSlice
}

// NewPostBulkArchiveCommand creates a new post bulk archive command
func NewPostBulkArchiveCommand(store stores.PostRepository) *postBulkArchiveCommand {
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

func (c *postBulkArchiveCommand) Execute(ctx context.Context, msg PostBulkArchiveMsg) error {
	if c.store == nil {
		return fmt.Errorf("post store is nil")
	}

	posts, err := c.store.Archive(ctx, msg.IDs)
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
