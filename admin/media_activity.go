package admin

import (
	"context"
	"maps"
	"strings"
)

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
	Reference    MediaReference         `json:"reference"`
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

func (a *Admin) recordMediaMutationActivity(ctx context.Context, event MediaMutationEvent) {
	if a == nil || a.activity == nil {
		return
	}
	defaultEntry := defaultMediaActivityEntry(ctx, event)
	event.DefaultEntry = cloneActivityEntryPtr(defaultEntry)

	decision := MediaActivityDecision{}
	if a.mediaActivityHook != nil {
		next, err := a.mediaActivityHook(ctx, event)
		if err != nil {
			a.loggerFor("admin.media").Warn("media activity hook failed", "error", err)
		} else {
			decision = next
		}
	}

	if primary, ok := resolveMediaPrimaryEntry(defaultEntry, decision); ok {
		_ = a.activity.Record(ctx, primary)
	}
	for _, entry := range decision.Additional {
		_ = a.activity.Record(ctx, normalizeMediaActivityEntry(entry, defaultEntry))
	}
}

func resolveMediaPrimaryEntry(defaultEntry ActivityEntry, decision MediaActivityDecision) (ActivityEntry, bool) {
	if decision.Primary != nil {
		return normalizeMediaActivityEntry(*decision.Primary, defaultEntry), true
	}
	if decision.SuppressDefault {
		return ActivityEntry{}, false
	}
	return defaultEntry, true
}

func normalizeMediaActivityEntry(entry, fallback ActivityEntry) ActivityEntry {
	if strings.TrimSpace(entry.Actor) == "" {
		entry.Actor = fallback.Actor
	}
	if strings.TrimSpace(entry.Action) == "" {
		entry.Action = fallback.Action
	}
	if strings.TrimSpace(entry.Object) == "" {
		entry.Object = fallback.Object
	}
	if strings.TrimSpace(entry.Channel) == "" {
		entry.Channel = fallback.Channel
	}
	if len(entry.Metadata) == 0 {
		entry.Metadata = cloneMediaActivityMetadata(fallback.Metadata)
	}
	if entry.CreatedAt.IsZero() {
		entry.CreatedAt = fallback.CreatedAt
	}
	return entry
}

func defaultMediaActivityEntry(ctx context.Context, event MediaMutationEvent) ActivityEntry {
	actor := actorFromContext(ctx)
	if actor == "" {
		actor = userIDFromContext(ctx)
	}
	mediaID := strings.TrimSpace(event.MediaID)
	if mediaID == "" {
		mediaID = strings.TrimSpace(event.Reference.ID)
	}
	item := mediaActivityItem(event)
	if mediaID == "" && item != nil {
		mediaID = strings.TrimSpace(item.ID)
	}
	return ActivityEntry{
		Actor:    actor,
		Action:   defaultMediaActivityAction(event.Operation),
		Object:   joinObject("media", mediaID),
		Channel:  "media",
		Metadata: mediaActivityMetadata(event, item, mediaID),
	}
}

func mediaActivityItem(event MediaMutationEvent) *MediaItem {
	if event.After != nil {
		return event.After
	}
	if event.Before != nil {
		return event.Before
	}
	return nil
}

func defaultMediaActivityAction(operation MediaMutationOperation) string {
	switch operation {
	case MediaMutationUpdate:
		return "media.updated"
	case MediaMutationDelete:
		return "media.deleted"
	default:
		return "media.created"
	}
}

func mediaActivityMetadata(event MediaMutationEvent, item *MediaItem, mediaID string) map[string]any {
	metadata := cloneMediaActivityMetadata(nil)
	if strings.TrimSpace(mediaID) != "" {
		metadata["media_id"] = mediaID
	}
	addMediaActivityItemMetadata(metadata, item)
	if requestKind := strings.TrimSpace(toString(event.Request["request_kind"])); requestKind != "" {
		metadata["request_kind"] = requestKind
	}
	return metadata
}

func addMediaActivityItemMetadata(metadata map[string]any, item *MediaItem) {
	if item == nil {
		return
	}
	if value := strings.TrimSpace(item.Name); value != "" {
		metadata["name"] = value
	}
	if value := strings.TrimSpace(item.Type); value != "" {
		metadata["type"] = value
	}
	if value := strings.TrimSpace(item.MIMEType); value != "" {
		metadata["mime_type"] = value
	}
	if item.Size > 0 {
		metadata["size"] = item.Size
	}
	if value := strings.TrimSpace(item.Status); value != "" {
		metadata["status"] = value
	}
	if value := strings.TrimSpace(item.WorkflowStatus); value != "" {
		metadata["workflow_status"] = value
	}
}

func cloneMediaActivityMetadata(input map[string]any) map[string]any {
	if len(input) == 0 {
		return map[string]any{}
	}
	out := make(map[string]any, len(input))
	maps.Copy(out, input)
	return out
}

func cloneActivityEntryPtr(entry ActivityEntry) *ActivityEntry {
	cloned := normalizeMediaActivityEntry(entry, ActivityEntry{})
	return &cloned
}
