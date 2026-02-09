package helpers

import (
	"context"
	"sort"
	"strings"
	"time"

	"github.com/goliatone/go-admin/pkg/admin"
)

const (
	// UserActivityDefaultLimit is the default number of activity entries to return.
	UserActivityDefaultLimit = 10
	// UserActivityMinLimit is the minimum allowed limit.
	UserActivityMinLimit = 1
	// UserActivityMaxLimit is the maximum allowed limit.
	UserActivityMaxLimit = 50
)

// UserActivityResult holds the result of a user activity query.
type UserActivityResult struct {
	Entries []admin.ActivityEntry `json:"entries"`
	Error   error                 `json:"-"`
}

// UserActivityBuilder provides a fluent interface for building user-tab activity queries.
type UserActivityBuilder struct {
	sink   admin.ActivitySink
	userID string
	limit  int
}

// NewUserActivityBuilder creates a new builder for user-tab activity queries.
func NewUserActivityBuilder(sink admin.ActivitySink) *UserActivityBuilder {
	return &UserActivityBuilder{
		sink:  sink,
		limit: UserActivityDefaultLimit,
	}
}

// ForUser sets the target user ID for the activity query.
func (b *UserActivityBuilder) ForUser(userID string) *UserActivityBuilder {
	b.userID = strings.TrimSpace(userID)
	return b
}

// WithLimit sets the maximum number of entries to return.
// Values are clamped to the range [1, 50].
func (b *UserActivityBuilder) WithLimit(limit int) *UserActivityBuilder {
	b.limit = ClampActivityLimit(limit)
	return b
}

// Build executes the dual-query, merges, dedupes, sorts, and returns the result.
func (b *UserActivityBuilder) Build(ctx context.Context) UserActivityResult {
	if b.sink == nil {
		return UserActivityResult{Entries: []admin.ActivityEntry{}}
	}
	userID := strings.TrimSpace(b.userID)
	if userID == "" {
		return UserActivityResult{Entries: []admin.ActivityEntry{}}
	}

	// Execute dual-query in parallel conceptually, but sequentially for simplicity
	// Query 1: Activities where the user is the target (object)
	targetFilter := admin.ActivityFilter{Object: "user:" + userID}
	fetchLimit := ClampActivityLimit(b.limit * 2)
	targetEntries, targetErr := b.sink.List(ctx, fetchLimit, targetFilter)
	if targetErr != nil {
		return UserActivityResult{Error: targetErr}
	}

	// Query 2: Activities where the user is the actor
	actorFilter := admin.ActivityFilter{Actor: userID}
	actorEntries, actorErr := b.sink.List(ctx, fetchLimit, actorFilter)
	if actorErr != nil {
		return UserActivityResult{Error: actorErr}
	}

	// Merge, dedupe, and sort
	merged := mergeActivityEntries(targetEntries, actorEntries)
	deduped := dedupeActivityEntries(merged)
	sorted := sortActivityEntries(deduped)

	// If overlap is high, perform one bounded refetch pass to improve fill rate.
	if len(sorted) < b.limit && fetchLimit < UserActivityMaxLimit {
		targetEntries, targetErr = b.sink.List(ctx, UserActivityMaxLimit, targetFilter)
		if targetErr != nil {
			return UserActivityResult{Error: targetErr}
		}
		actorEntries, actorErr = b.sink.List(ctx, UserActivityMaxLimit, actorFilter)
		if actorErr != nil {
			return UserActivityResult{Error: actorErr}
		}
		merged = mergeActivityEntries(targetEntries, actorEntries)
		deduped = dedupeActivityEntries(merged)
		sorted = sortActivityEntries(deduped)
	}

	// Apply limit
	if len(sorted) > b.limit {
		sorted = sorted[:b.limit]
	}

	return UserActivityResult{Entries: sorted}
}

// BuildUserTabActivity is a convenience function that creates a builder, configures it,
// and executes the query in one call.
func BuildUserTabActivity(ctx context.Context, sink admin.ActivitySink, userID string, limit int) UserActivityResult {
	return NewUserActivityBuilder(sink).
		ForUser(userID).
		WithLimit(limit).
		Build(ctx)
}

// ClampActivityLimit ensures the limit is within the valid range [1, 50].
// Returns the default limit (10) if the input is <= 0.
func ClampActivityLimit(limit int) int {
	if limit <= 0 {
		return UserActivityDefaultLimit
	}
	if limit < UserActivityMinLimit {
		return UserActivityMinLimit
	}
	if limit > UserActivityMaxLimit {
		return UserActivityMaxLimit
	}
	return limit
}

// mergeActivityEntries combines two slices of activity entries.
func mergeActivityEntries(a, b []admin.ActivityEntry) []admin.ActivityEntry {
	result := make([]admin.ActivityEntry, 0, len(a)+len(b))
	result = append(result, a...)
	result = append(result, b...)
	return result
}

// dedupeActivityEntries removes duplicate entries based on ID.
func dedupeActivityEntries(entries []admin.ActivityEntry) []admin.ActivityEntry {
	if len(entries) == 0 {
		return entries
	}
	seen := make(map[string]struct{}, len(entries))
	result := make([]admin.ActivityEntry, 0, len(entries))
	for _, entry := range entries {
		id := strings.TrimSpace(entry.ID)
		if id == "" {
			// Entries without IDs are always included (shouldn't happen in practice)
			result = append(result, entry)
			continue
		}
		if _, exists := seen[id]; exists {
			continue
		}
		seen[id] = struct{}{}
		result = append(result, entry)
	}
	return result
}

// sortActivityEntries sorts entries by created_at descending, with id descending as tie-breaker.
func sortActivityEntries(entries []admin.ActivityEntry) []admin.ActivityEntry {
	if len(entries) <= 1 {
		return entries
	}
	result := make([]admin.ActivityEntry, len(entries))
	copy(result, entries)

	sort.Slice(result, func(i, j int) bool {
		// Primary sort: created_at descending
		ti := result[i].CreatedAt
		tj := result[j].CreatedAt

		if !ti.Equal(tj) {
			return ti.After(tj)
		}

		// Tie-breaker: id descending (lexicographic for UUIDs)
		return result[i].ID > result[j].ID
	})

	return result
}

// IsValidActivityTimestamp checks if a timestamp is valid for activity sorting.
func IsValidActivityTimestamp(t time.Time) bool {
	return !t.IsZero()
}
