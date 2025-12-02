package commands

import (
	"context"
	"log"

	"github.com/goliatone/go-admin/examples/web/stores"
)

// postBulkPublishCommand publishes multiple posts
type postBulkPublishCommand struct {
	store *stores.PostStore
}

// NewPostBulkPublishCommand creates a new post bulk publish command
func NewPostBulkPublishCommand(store *stores.PostStore) *postBulkPublishCommand {
	return &postBulkPublishCommand{store: store}
}

func (c *postBulkPublishCommand) Name() string {
	return "posts.bulk_publish"
}

func (c *postBulkPublishCommand) Execute(ctx context.Context) error {
	log.Println("Bulk publishing posts...")
	return nil
}

// postBulkArchiveCommand archives multiple posts
type postBulkArchiveCommand struct {
	store *stores.PostStore
}

// NewPostBulkArchiveCommand creates a new post bulk archive command
func NewPostBulkArchiveCommand(store *stores.PostStore) *postBulkArchiveCommand {
	return &postBulkArchiveCommand{store: store}
}

func (c *postBulkArchiveCommand) Name() string {
	return "posts.bulk_archive"
}

func (c *postBulkArchiveCommand) Execute(ctx context.Context) error {
	log.Println("Bulk archiving posts...")
	return nil
}
