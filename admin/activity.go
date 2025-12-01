package admin

import (
	"context"
	"strconv"
	"sync"
	"time"
)

// ActivityEntry represents an activity feed entry.
type ActivityEntry struct {
	ID        string         `json:"id"`
	Actor     string         `json:"actor,omitempty"`
	Action    string         `json:"action,omitempty"`
	Object    string         `json:"object,omitempty"`
	Metadata  map[string]any `json:"metadata,omitempty"`
	CreatedAt time.Time      `json:"created_at"`
}

// ActivitySink records activity entries.
type ActivitySink interface {
	Record(ctx context.Context, entry ActivityEntry) error
	List(ctx context.Context, limit int) ([]ActivityEntry, error)
}

// ActivityFeed stores activities in memory.
type ActivityFeed struct {
	mu      sync.Mutex
	nextID  int
	entries []ActivityEntry
}

// NewActivityFeed constructs a feed.
func NewActivityFeed() *ActivityFeed {
	return &ActivityFeed{nextID: 1}
}

// Record appends an activity entry.
func (f *ActivityFeed) Record(ctx context.Context, entry ActivityEntry) error {
	_ = ctx
	f.mu.Lock()
	defer f.mu.Unlock()
	if entry.ID == "" {
		entry.ID = strconv.Itoa(f.nextID)
		f.nextID++
	}
	if entry.CreatedAt.IsZero() {
		entry.CreatedAt = time.Now()
	}
	f.entries = append([]ActivityEntry{entry}, f.entries...)
	return nil
}

// List returns the most recent entries.
func (f *ActivityFeed) List(ctx context.Context, limit int) ([]ActivityEntry, error) {
	_ = ctx
	f.mu.Lock()
	defer f.mu.Unlock()
	if limit <= 0 || limit > len(f.entries) {
		limit = len(f.entries)
	}
	out := make([]ActivityEntry, limit)
	copy(out, f.entries[:limit])
	return out, nil
}
