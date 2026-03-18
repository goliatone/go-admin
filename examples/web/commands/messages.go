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
	IDs []string `json:"i_ds"`
}

func (PostBulkPublishMsg) Type() string { return postBulkPublishCommandName }

func (m PostBulkPublishMsg) Validate() error { return requireIDs(m.IDs, "post ids required") }

type PostBulkUnpublishMsg struct {
	IDs []string `json:"i_ds"`
}

func (PostBulkUnpublishMsg) Type() string { return postBulkUnpublishCommandName }

func (m PostBulkUnpublishMsg) Validate() error { return requireIDs(m.IDs, "post ids required") }

type PostBulkScheduleMsg struct {
	IDs         []string       `json:"i_ds"`
	PublishAt   time.Time      `json:"publish_at"`
	ScheduledAt time.Time      `json:"scheduled_at"`
	Payload     map[string]any `json:"payload"`
}

func (PostBulkScheduleMsg) Type() string { return postBulkScheduleCommandName }

func (m PostBulkScheduleMsg) Validate() error { return requireIDs(m.IDs, "post ids required") }

type PostBulkArchiveMsg struct {
	IDs []string `json:"i_ds"`
}

func (PostBulkArchiveMsg) Type() string { return postBulkArchiveCommandName }

func (m PostBulkArchiveMsg) Validate() error { return requireIDs(m.IDs, "post ids required") }

type PagePublishMsg struct {
	IDs []string `json:"i_ds"`
}

func (PagePublishMsg) Type() string { return pagePublishCommandName }

func (m PagePublishMsg) Validate() error { return requireIDs(m.IDs, "page ids required") }

type PageBulkPublishMsg struct {
	IDs []string `json:"i_ds"`
}

func (PageBulkPublishMsg) Type() string { return pageBulkPublishCommandName }

func (m PageBulkPublishMsg) Validate() error { return requireIDs(m.IDs, "page ids required") }

type PageBulkUnpublishMsg struct {
	IDs []string `json:"i_ds"`
}

func (PageBulkUnpublishMsg) Type() string { return pageBulkUnpublishCommandName }

func (m PageBulkUnpublishMsg) Validate() error { return requireIDs(m.IDs, "page ids required") }

type MediaBulkDeleteMsg struct {
	IDs []string `json:"i_ds"`
}

func (MediaBulkDeleteMsg) Type() string { return mediaBulkDeleteCommandName }

func requireIDs(ids []string, msg string) error {
	if len(ids) == 0 {
		return errors.New(msg)
	}
	return nil
}
