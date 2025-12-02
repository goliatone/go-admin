package commands

import (
	"context"
	"log"

	"github.com/goliatone/go-admin/examples/web/stores"
)

// mediaBulkDeleteCommand deletes multiple media files
type mediaBulkDeleteCommand struct {
	store *stores.MediaStore
}

// NewMediaBulkDeleteCommand creates a new media bulk delete command
func NewMediaBulkDeleteCommand(store *stores.MediaStore) *mediaBulkDeleteCommand {
	return &mediaBulkDeleteCommand{store: store}
}

func (c *mediaBulkDeleteCommand) Name() string {
	return "media.bulk_delete"
}

func (c *mediaBulkDeleteCommand) Execute(ctx context.Context) error {
	log.Println("Bulk deleting media...")
	return nil
}
