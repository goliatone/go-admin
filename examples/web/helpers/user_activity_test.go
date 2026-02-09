package helpers

import (
	"context"
	"errors"
	"fmt"
	"testing"
	"time"

	"github.com/goliatone/go-admin/pkg/admin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type mockActivitySink struct {
	entries     map[string][]admin.ActivityEntry
	shouldError bool
}

func newMockActivitySink() *mockActivitySink {
	return &mockActivitySink{
		entries: make(map[string][]admin.ActivityEntry),
	}
}

func (m *mockActivitySink) Record(ctx context.Context, entry admin.ActivityEntry) error {
	return nil
}

func (m *mockActivitySink) List(ctx context.Context, limit int, filters ...admin.ActivityFilter) ([]admin.ActivityEntry, error) {
	if m.shouldError {
		return nil, errors.New("mock sink error")
	}
	var result []admin.ActivityEntry
	for _, filter := range filters {
		if filter.Object != "" {
			result = append(result, m.entries["object:"+filter.Object]...)
		}
		if filter.Actor != "" {
			result = append(result, m.entries["actor:"+filter.Actor]...)
		}
	}
	if limit > 0 && len(result) > limit {
		result = result[:limit]
	}
	return result, nil
}

func TestClampActivityLimit(t *testing.T) {
	tests := []struct {
		name     string
		input    int
		expected int
	}{
		{"zero returns default", 0, UserActivityDefaultLimit},
		{"negative returns default", -5, UserActivityDefaultLimit},
		{"below min clamps to min", 0, UserActivityDefaultLimit},
		{"at min stays at min", 1, 1},
		{"within range stays unchanged", 25, 25},
		{"at max stays at max", 50, 50},
		{"above max clamps to max", 100, UserActivityMaxLimit},
		{"default value", 10, 10},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := ClampActivityLimit(tt.input)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestBuildUserTabActivity_NilSink(t *testing.T) {
	result := BuildUserTabActivity(context.Background(), nil, "user-123", 10)
	assert.Empty(t, result.Entries)
	assert.NoError(t, result.Error)
}

func TestBuildUserTabActivity_EmptyUserID(t *testing.T) {
	sink := newMockActivitySink()
	result := BuildUserTabActivity(context.Background(), sink, "", 10)
	assert.Empty(t, result.Entries)
	assert.NoError(t, result.Error)
}

func TestBuildUserTabActivity_SinkError(t *testing.T) {
	sink := newMockActivitySink()
	sink.shouldError = true

	result := BuildUserTabActivity(context.Background(), sink, "user-123", 10)
	assert.Error(t, result.Error)
}

func TestBuildUserTabActivity_TargetOnly(t *testing.T) {
	sink := newMockActivitySink()
	now := time.Now()
	sink.entries["object:user:user-123"] = []admin.ActivityEntry{
		{ID: "t1", Actor: "admin-1", Action: "updated", Object: "user:user-123", CreatedAt: now.Add(-time.Minute)},
		{ID: "t0", Actor: "admin-2", Action: "created", Object: "user:user-123", CreatedAt: now.Add(-2 * time.Minute)},
	}

	result := BuildUserTabActivity(context.Background(), sink, "user-123", 10)
	require.NoError(t, result.Error)
	require.Len(t, result.Entries, 2)
	assert.Equal(t, "t1", result.Entries[0].ID)
	assert.Equal(t, "t0", result.Entries[1].ID)
}

func TestBuildUserTabActivity_ActorOnly(t *testing.T) {
	sink := newMockActivitySink()
	now := time.Now()
	sink.entries["actor:user-123"] = []admin.ActivityEntry{
		{ID: "a1", Actor: "user-123", Action: "login", Object: "session", CreatedAt: now.Add(-time.Minute)},
		{ID: "a0", Actor: "user-123", Action: "viewed", Object: "page:1", CreatedAt: now.Add(-2 * time.Minute)},
	}

	result := BuildUserTabActivity(context.Background(), sink, "user-123", 10)
	require.NoError(t, result.Error)
	require.Len(t, result.Entries, 2)
	assert.Equal(t, "a1", result.Entries[0].ID)
	assert.Equal(t, "a0", result.Entries[1].ID)
}

func TestBuildUserTabActivity_MixedDedupedAndLimited(t *testing.T) {
	sink := newMockActivitySink()
	now := time.Now()
	duplicate := admin.ActivityEntry{
		ID:        "dup",
		Actor:     "user-123",
		Action:    "updated",
		Object:    "user:user-123",
		CreatedAt: now.Add(-time.Minute),
	}

	sink.entries["object:user:user-123"] = []admin.ActivityEntry{
		duplicate,
		{ID: "z-last", Actor: "admin-1", Action: "created", Object: "user:user-123", CreatedAt: now.Add(-3 * time.Minute)},
	}
	sink.entries["actor:user-123"] = []admin.ActivityEntry{
		duplicate, // duplicated across target+actor queries
		{ID: "a-first", Actor: "user-123", Action: "login", Object: "session", CreatedAt: now},
	}

	result := BuildUserTabActivity(context.Background(), sink, "user-123", 2)
	require.NoError(t, result.Error)
	require.Len(t, result.Entries, 2, "limit should apply after merge+dedupe")
	assert.Equal(t, "a-first", result.Entries[0].ID)
	assert.Equal(t, "dup", result.Entries[1].ID)
}

func TestBuildUserTabActivity_RefetchesWhenOverlapUnderfillsInitialWindow(t *testing.T) {
	sink := newMockActivitySink()
	now := time.Now()

	targetEntries := make([]admin.ActivityEntry, 0, 50)
	actorEntries := make([]admin.ActivityEntry, 0, 20)

	// First window (limit*2 for requested limit=10) has only 5 unique IDs due overlap.
	for i := 0; i < 20; i++ {
		id := fmt.Sprintf("dup-%d", (i%5)+1)
		ts := now.Add(-time.Duration(i) * time.Second)
		targetEntries = append(targetEntries, admin.ActivityEntry{
			ID:        id,
			Actor:     "admin-1",
			Action:    "updated",
			Object:    "user:user-123",
			CreatedAt: ts,
		})
		actorEntries = append(actorEntries, admin.ActivityEntry{
			ID:        id,
			Actor:     "user-123",
			Action:    "updated",
			Object:    "user:user-123",
			CreatedAt: ts,
		})
	}

	// Additional unique target entries are outside the initial window.
	for i := 0; i < 30; i++ {
		id := fmt.Sprintf("unique-%02d", i+1)
		targetEntries = append(targetEntries, admin.ActivityEntry{
			ID:        id,
			Actor:     "admin-2",
			Action:    "created",
			Object:    "user:user-123",
			CreatedAt: now.Add(-time.Duration(40+i) * time.Second),
		})
	}

	sink.entries["object:user:user-123"] = targetEntries
	sink.entries["actor:user-123"] = actorEntries

	result := BuildUserTabActivity(context.Background(), sink, "user-123", 10)
	require.NoError(t, result.Error)
	require.Len(t, result.Entries, 10, "should refill to requested limit after bounded refetch")
}

func TestMergeActivityEntries(t *testing.T) {
	now := time.Now()
	a := []admin.ActivityEntry{
		{ID: "1", CreatedAt: now},
		{ID: "2", CreatedAt: now.Add(-time.Hour)},
	}
	b := []admin.ActivityEntry{
		{ID: "3", CreatedAt: now.Add(-2 * time.Hour)},
	}

	result := mergeActivityEntries(a, b)
	assert.Len(t, result, 3)
	assert.Equal(t, "1", result[0].ID)
	assert.Equal(t, "2", result[1].ID)
	assert.Equal(t, "3", result[2].ID)
}

func TestMergeActivityEntries_Empty(t *testing.T) {
	result := mergeActivityEntries(nil, nil)
	assert.Empty(t, result)

	result = mergeActivityEntries([]admin.ActivityEntry{{ID: "1"}}, nil)
	assert.Len(t, result, 1)

	result = mergeActivityEntries(nil, []admin.ActivityEntry{{ID: "2"}})
	assert.Len(t, result, 1)
}

func TestDedupeActivityEntries(t *testing.T) {
	now := time.Now()
	entries := []admin.ActivityEntry{
		{ID: "1", CreatedAt: now},
		{ID: "2", CreatedAt: now.Add(-time.Hour)},
		{ID: "1", CreatedAt: now}, // duplicate
		{ID: "3", CreatedAt: now.Add(-2 * time.Hour)},
		{ID: "2", CreatedAt: now.Add(-time.Hour)}, // duplicate
	}

	result := dedupeActivityEntries(entries)
	require.Len(t, result, 3)
	assert.Equal(t, "1", result[0].ID)
	assert.Equal(t, "2", result[1].ID)
	assert.Equal(t, "3", result[2].ID)
}

func TestDedupeActivityEntries_Empty(t *testing.T) {
	result := dedupeActivityEntries(nil)
	assert.Empty(t, result)

	result = dedupeActivityEntries([]admin.ActivityEntry{})
	assert.Empty(t, result)
}

func TestDedupeActivityEntries_NoID(t *testing.T) {
	entries := []admin.ActivityEntry{
		{ID: "", Action: "action1"},
		{ID: "", Action: "action2"},
	}
	result := dedupeActivityEntries(entries)
	assert.Len(t, result, 2) // entries without IDs are always included
}

func TestSortActivityEntries(t *testing.T) {
	now := time.Now()
	entries := []admin.ActivityEntry{
		{ID: "a", CreatedAt: now.Add(-2 * time.Hour)},
		{ID: "c", CreatedAt: now},
		{ID: "b", CreatedAt: now.Add(-time.Hour)},
	}

	result := sortActivityEntries(entries)
	require.Len(t, result, 3)
	assert.Equal(t, "c", result[0].ID) // newest first
	assert.Equal(t, "b", result[1].ID)
	assert.Equal(t, "a", result[2].ID)
}

func TestSortActivityEntries_TieBreaker(t *testing.T) {
	now := time.Now()
	// Same timestamp, different IDs - should sort by ID descending
	entries := []admin.ActivityEntry{
		{ID: "aaa", CreatedAt: now},
		{ID: "ccc", CreatedAt: now},
		{ID: "bbb", CreatedAt: now},
	}

	result := sortActivityEntries(entries)
	require.Len(t, result, 3)
	assert.Equal(t, "ccc", result[0].ID) // highest ID first
	assert.Equal(t, "bbb", result[1].ID)
	assert.Equal(t, "aaa", result[2].ID)
}

func TestSortActivityEntries_Empty(t *testing.T) {
	result := sortActivityEntries(nil)
	assert.Empty(t, result)

	result = sortActivityEntries([]admin.ActivityEntry{})
	assert.Empty(t, result)
}

func TestSortActivityEntries_Single(t *testing.T) {
	entries := []admin.ActivityEntry{{ID: "1"}}
	result := sortActivityEntries(entries)
	assert.Len(t, result, 1)
	assert.Equal(t, "1", result[0].ID)
}

func TestUserActivityBuilder_Fluent(t *testing.T) {
	sink := newMockActivitySink()
	builder := NewUserActivityBuilder(sink).
		ForUser("user-123").
		WithLimit(25)

	assert.Equal(t, "user-123", builder.userID)
	assert.Equal(t, 25, builder.limit)
}

func TestUserActivityBuilder_LimitClamping(t *testing.T) {
	sink := newMockActivitySink()

	builder := NewUserActivityBuilder(sink).WithLimit(0)
	assert.Equal(t, UserActivityDefaultLimit, builder.limit)

	builder = NewUserActivityBuilder(sink).WithLimit(100)
	assert.Equal(t, UserActivityMaxLimit, builder.limit)
}

func TestIsValidActivityTimestamp(t *testing.T) {
	assert.True(t, IsValidActivityTimestamp(time.Now()))
	assert.False(t, IsValidActivityTimestamp(time.Time{}))
}
