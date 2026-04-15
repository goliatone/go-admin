package admin

import "context"

// MediaMutationOperation describes the mutation being applied to media.
type MediaMutationOperation string

const (
	MediaMutationCreate  MediaMutationOperation = "create"
	MediaMutationUpload  MediaMutationOperation = "upload"
	MediaMutationConfirm MediaMutationOperation = "confirm"
	MediaMutationUpdate  MediaMutationOperation = "update"
	MediaMutationDelete  MediaMutationOperation = "delete"
)

// MediaMutationEvent describes a media mutation before activity projection.
type MediaMutationEvent struct {
	Operation    MediaMutationOperation `json:"operation"`
	MediaID      string                 `json:"media_id,omitempty"`
	Reference    MediaReference         `json:"reference,omitempty"`
	Before       *MediaItem             `json:"before,omitempty"`
	After        *MediaItem             `json:"after,omitempty"`
	Request      map[string]any         `json:"request,omitempty"`
	DefaultEntry *ActivityEntry         `json:"default_entry,omitempty"`
}

// MediaActivityDecision allows hosts to override, suppress, or append activity
// entries without taking over the core mutation path.
type MediaActivityDecision struct {
	SuppressDefault bool            `json:"suppress_default,omitempty"`
	Primary         *ActivityEntry  `json:"primary,omitempty"`
	Additional      []ActivityEntry `json:"additional,omitempty"`
}

// MediaActivityHook optionally customizes default media mutation activity.
type MediaActivityHook func(context.Context, MediaMutationEvent) (MediaActivityDecision, error)
