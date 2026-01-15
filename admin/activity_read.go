package admin

import (
	"context"
	"strconv"
	"strings"
	"time"

	goerrors "github.com/goliatone/go-errors"
	router "github.com/goliatone/go-router"
	"github.com/goliatone/go-users/pkg/types"
	"github.com/google/uuid"
)

const (
	activityDefaultLimit = 50
	activityMaxLimit     = 200
)

// ActivityFeedQuerier represents the go-users activity feed query contract.
type ActivityFeedQuerier interface {
	Query(context.Context, types.ActivityFilter) (types.ActivityPage, error)
}

func parseActivityFilter(c router.Context, actor types.ActorRef, scope types.ScopeFilter) (types.ActivityFilter, error) {
	limit, offset, err := parseActivityPagination(c)
	if err != nil {
		return types.ActivityFilter{}, err
	}

	userID, err := parseUUIDParam(c.Query("user_id"), "user_id")
	if err != nil {
		return types.ActivityFilter{}, err
	}
	actorID, err := parseUUIDParam(c.Query("actor_id"), "actor_id")
	if err != nil {
		return types.ActivityFilter{}, err
	}

	channel := strings.TrimSpace(c.Query("channel"))
	channels := parseCSVParams(queryValuesFallback(c, "channels"))
	if channel != "" && len(channels) > 0 {
		return types.ActivityFilter{}, activityQueryError("channel", "channel and channels are mutually exclusive")
	}

	since, err := parseTimeParam(c.Query("since"), "since")
	if err != nil {
		return types.ActivityFilter{}, err
	}
	until, err := parseTimeParam(c.Query("until"), "until")
	if err != nil {
		return types.ActivityFilter{}, err
	}

	return types.ActivityFilter{
		Actor:           actor,
		Scope:           scope,
		UserID:          userID,
		ActorID:         actorID,
		Verbs:           parseCSVParams(queryValuesFallback(c, "verb")),
		ObjectType:      strings.TrimSpace(c.Query("object_type")),
		ObjectID:        strings.TrimSpace(c.Query("object_id")),
		Channel:         channel,
		Channels:        channels,
		ChannelDenylist: parseCSVParams(queryValuesFallback(c, "channel_denylist")),
		Since:           since,
		Until:           until,
		Keyword:         strings.TrimSpace(c.Query("q")),
		Pagination:      types.Pagination{Limit: limit, Offset: offset},
	}, nil
}

func parseActivityPagination(c router.Context) (int, int, error) {
	limit := activityDefaultLimit
	if raw := strings.TrimSpace(c.Query("limit")); raw != "" {
		parsed, err := strconv.Atoi(raw)
		if err != nil {
			return 0, 0, activityQueryError("limit", "limit must be an integer")
		}
		if parsed > 0 {
			limit = parsed
		}
	}
	if limit <= 0 {
		limit = activityDefaultLimit
	}
	if limit > activityMaxLimit {
		limit = activityMaxLimit
	}

	offset := 0
	if raw := strings.TrimSpace(c.Query("offset")); raw != "" {
		parsed, err := strconv.Atoi(raw)
		if err != nil {
			return 0, 0, activityQueryError("offset", "offset must be an integer")
		}
		if parsed < 0 {
			return 0, 0, activityQueryError("offset", "offset cannot be negative")
		}
		offset = parsed
	}
	return limit, offset, nil
}

func parseTimeParam(raw string, field string) (*time.Time, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil, nil
	}
	if parsed, err := time.Parse(time.RFC3339Nano, raw); err == nil {
		return &parsed, nil
	}
	if parsed, err := time.Parse(time.RFC3339, raw); err == nil {
		return &parsed, nil
	}
	return nil, activityQueryError(field, "timestamp must be RFC3339 or RFC3339Nano")
}

func parseUUIDParam(raw string, field string) (uuid.UUID, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return uuid.Nil, nil
	}
	parsed, err := uuid.Parse(raw)
	if err != nil {
		return uuid.Nil, activityQueryError(field, "invalid UUID")
	}
	return parsed, nil
}

func queryValuesFallback(c router.Context, key string) []string {
	values := c.QueryValues(key)
	if len(values) == 0 {
		if raw := strings.TrimSpace(c.Query(key)); raw != "" {
			values = []string{raw}
		}
	}
	return values
}

func parseCSVParams(values []string) []string {
	if len(values) == 0 {
		return nil
	}
	seen := map[string]struct{}{}
	out := []string{}
	for _, value := range values {
		for _, part := range strings.Split(value, ",") {
			part = strings.TrimSpace(part)
			if part == "" {
				continue
			}
			if _, ok := seen[part]; ok {
				continue
			}
			seen[part] = struct{}{}
			out = append(out, part)
		}
	}
	return out
}

func activityQueryError(field, message string) error {
	err := goerrors.New(message, goerrors.CategoryValidation).WithCode(goerrors.CodeBadRequest)
	if field == "" {
		return err
	}
	return err.WithMetadata(map[string]any{"field": field})
}

func entriesFromUsersRecords(records []types.ActivityRecord) []ActivityEntry {
	if len(records) == 0 {
		return nil
	}
	entries := make([]ActivityEntry, 0, len(records))
	for _, record := range records {
		entries = append(entries, entryFromUsersRecord(record))
	}
	return entries
}

func entryFromUsersRecord(record types.ActivityRecord) ActivityEntry {
	return ActivityEntry{
		ID:        uuidString(record.ID),
		Actor:     firstNonEmpty(uuidString(record.ActorID), uuidString(record.UserID)),
		Action:    strings.TrimSpace(record.Verb),
		Object:    joinObject(strings.TrimSpace(record.ObjectType), strings.TrimSpace(record.ObjectID)),
		Channel:   strings.TrimSpace(record.Channel),
		Metadata:  cloneAnyMap(record.Data),
		CreatedAt: record.OccurredAt,
	}
}

func uuidString(id uuid.UUID) string {
	if id == uuid.Nil {
		return ""
	}
	return id.String()
}
