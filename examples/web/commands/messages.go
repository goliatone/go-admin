package commands

import (
	"errors"
	"time"
)

const (
	postBulkPublishCommandName   = "posts.bulk_publish"
	postBulkUnpublishCommandName = "posts.bulk_unpublish"
	postBulkScheduleCommandName  = "posts.bulk_schedule"
	postBulkArchiveCommandName   = "posts.bulk_archive"
	pagePublishCommandName       = "pages.publish"
	pageBulkPublishCommandName   = "pages.bulk_publish"
	pageBulkUnpublishCommandName = "pages.bulk_unpublish"
	mediaBulkDeleteCommandName   = "media.bulk_delete"
)

type PostBulkPublishMsg struct {
	IDs []string
}

func (PostBulkPublishMsg) Type() string { return postBulkPublishCommandName }

func (m PostBulkPublishMsg) Validate() error { return requireIDs(m.IDs, "post ids required") }

type PostBulkUnpublishMsg struct {
	IDs []string
}

func (PostBulkUnpublishMsg) Type() string { return postBulkUnpublishCommandName }

func (m PostBulkUnpublishMsg) Validate() error { return requireIDs(m.IDs, "post ids required") }

type PostBulkScheduleMsg struct {
	IDs         []string
	PublishAt   time.Time
	ScheduledAt time.Time
	Payload     map[string]any
}

func (PostBulkScheduleMsg) Type() string { return postBulkScheduleCommandName }

func (m PostBulkScheduleMsg) Validate() error { return requireIDs(m.IDs, "post ids required") }

type PostBulkArchiveMsg struct {
	IDs []string
}

func (PostBulkArchiveMsg) Type() string { return postBulkArchiveCommandName }

func (m PostBulkArchiveMsg) Validate() error { return requireIDs(m.IDs, "post ids required") }

type PagePublishMsg struct {
	IDs []string
}

func (PagePublishMsg) Type() string { return pagePublishCommandName }

func (m PagePublishMsg) Validate() error { return requireIDs(m.IDs, "page ids required") }

type PageBulkPublishMsg struct {
	IDs []string
}

func (PageBulkPublishMsg) Type() string { return pageBulkPublishCommandName }

func (m PageBulkPublishMsg) Validate() error { return requireIDs(m.IDs, "page ids required") }

type PageBulkUnpublishMsg struct {
	IDs []string
}

func (PageBulkUnpublishMsg) Type() string { return pageBulkUnpublishCommandName }

func (m PageBulkUnpublishMsg) Validate() error { return requireIDs(m.IDs, "page ids required") }

type MediaBulkDeleteMsg struct {
	IDs []string
}

func (MediaBulkDeleteMsg) Type() string { return mediaBulkDeleteCommandName }

func requireIDs(ids []string, msg string) error {
	if len(ids) == 0 {
		return errors.New(msg)
	}
	return nil
}
