package commands

import (
	"errors"
	"time"
)

type PostBulkPublishMsg struct {
	IDs []string
}

func (PostBulkPublishMsg) Type() string { return "posts.bulk_publish" }

func (m PostBulkPublishMsg) Validate() error { return requireIDs(m.IDs, "post ids required") }

type PostBulkUnpublishMsg struct {
	IDs []string
}

func (PostBulkUnpublishMsg) Type() string { return "posts.bulk_unpublish" }

func (m PostBulkUnpublishMsg) Validate() error { return requireIDs(m.IDs, "post ids required") }

type PostBulkScheduleMsg struct {
	IDs         []string
	PublishAt   time.Time
	ScheduledAt time.Time
	Payload     map[string]any
}

func (PostBulkScheduleMsg) Type() string { return "posts.bulk_schedule" }

func (m PostBulkScheduleMsg) Validate() error { return requireIDs(m.IDs, "post ids required") }

type PostBulkArchiveMsg struct {
	IDs []string
}

func (PostBulkArchiveMsg) Type() string { return "posts.bulk_archive" }

func (m PostBulkArchiveMsg) Validate() error { return requireIDs(m.IDs, "post ids required") }

type PagePublishMsg struct {
	IDs []string
}

func (PagePublishMsg) Type() string { return "pages.publish" }

func (m PagePublishMsg) Validate() error { return requireIDs(m.IDs, "page ids required") }

type PageBulkPublishMsg struct {
	IDs []string
}

func (PageBulkPublishMsg) Type() string { return "pages.bulk_publish" }

func (m PageBulkPublishMsg) Validate() error { return requireIDs(m.IDs, "page ids required") }

type PageBulkUnpublishMsg struct {
	IDs []string
}

func (PageBulkUnpublishMsg) Type() string { return "pages.bulk_unpublish" }

func (m PageBulkUnpublishMsg) Validate() error { return requireIDs(m.IDs, "page ids required") }

type MediaBulkDeleteMsg struct {
	IDs []string
}

func (MediaBulkDeleteMsg) Type() string { return "media.bulk_delete" }

func requireIDs(ids []string, msg string) error {
	if len(ids) == 0 {
		return errors.New(msg)
	}
	return nil
}
