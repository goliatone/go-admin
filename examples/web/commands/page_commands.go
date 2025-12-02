package commands

import (
	"context"
	"log"

	"github.com/goliatone/go-admin/examples/web/stores"
)

// pagePublishCommand publishes a page
type pagePublishCommand struct {
	store *stores.PageStore
}

// NewPagePublishCommand creates a new page publish command
func NewPagePublishCommand(store *stores.PageStore) *pagePublishCommand {
	return &pagePublishCommand{store: store}
}

func (c *pagePublishCommand) Name() string {
	return "pages.publish"
}

func (c *pagePublishCommand) Execute(ctx context.Context) error {
	log.Println("Publishing page...")
	return nil
}

// pageBulkPublishCommand publishes multiple pages
type pageBulkPublishCommand struct {
	store *stores.PageStore
}

// NewPageBulkPublishCommand creates a new page bulk publish command
func NewPageBulkPublishCommand(store *stores.PageStore) *pageBulkPublishCommand {
	return &pageBulkPublishCommand{store: store}
}

func (c *pageBulkPublishCommand) Name() string {
	return "pages.bulk_publish"
}

func (c *pageBulkPublishCommand) Execute(ctx context.Context) error {
	log.Println("Bulk publishing pages...")
	return nil
}

// pageBulkUnpublishCommand unpublishes multiple pages
type pageBulkUnpublishCommand struct {
	store *stores.PageStore
}

// NewPageBulkUnpublishCommand creates a new page bulk unpublish command
func NewPageBulkUnpublishCommand(store *stores.PageStore) *pageBulkUnpublishCommand {
	return &pageBulkUnpublishCommand{store: store}
}

func (c *pageBulkUnpublishCommand) Name() string {
	return "pages.bulk_unpublish"
}

func (c *pageBulkUnpublishCommand) Execute(ctx context.Context) error {
	log.Println("Bulk unpublishing pages...")
	return nil
}
