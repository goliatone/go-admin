package admin

import (
	"context"
	"strconv"
	"sync"
	"time"
)

// MediaItem describes a stored asset.
type MediaItem struct {
	ID        string         `json:"id"`
	Name      string         `json:"name"`
	URL       string         `json:"url"`
	Thumbnail string         `json:"thumbnail,omitempty"`
	Size      int64          `json:"size,omitempty"`
	Metadata  map[string]any `json:"metadata,omitempty"`
	CreatedAt time.Time      `json:"created_at,omitempty"`
}

// MediaLibrary exposes media listing/creation.
type MediaLibrary interface {
	List(ctx context.Context) ([]MediaItem, error)
	Add(ctx context.Context, item MediaItem) (MediaItem, error)
}

// InMemoryMediaLibrary stores media items in memory.
type InMemoryMediaLibrary struct {
	mu     sync.Mutex
	nextID int
	items  []MediaItem
}

// NewInMemoryMediaLibrary seeds a few sample assets.
func NewInMemoryMediaLibrary(baseURL string) *InMemoryMediaLibrary {
	return &InMemoryMediaLibrary{
		nextID: 1,
		items: []MediaItem{
			{
				ID:        "1",
				Name:      "hero.jpg",
				URL:       baseURL + "/assets/hero.jpg",
				Thumbnail: baseURL + "/assets/hero-thumb.jpg",
				Size:      102400,
				Metadata: map[string]any{
					"cdn_url": baseURL + "/cdn/hero.jpg",
					"type":    "image",
				},
				CreatedAt: time.Now().Add(-24 * time.Hour),
			},
			{
				ID:        "2",
				Name:      "logo.svg",
				URL:       baseURL + "/assets/logo.svg",
				Thumbnail: baseURL + "/assets/logo.svg",
				Size:      2048,
				Metadata: map[string]any{
					"cdn_url": baseURL + "/cdn/logo.svg",
					"type":    "vector",
				},
				CreatedAt: time.Now().Add(-48 * time.Hour),
			},
		},
	}
}

// List returns items newest first.
func (m *InMemoryMediaLibrary) List(ctx context.Context) ([]MediaItem, error) {
	_ = ctx
	m.mu.Lock()
	defer m.mu.Unlock()
	out := make([]MediaItem, len(m.items))
	copy(out, m.items)
	return out, nil
}

// Add stores a media item.
func (m *InMemoryMediaLibrary) Add(ctx context.Context, item MediaItem) (MediaItem, error) {
	_ = ctx
	m.mu.Lock()
	defer m.mu.Unlock()
	if item.ID == "" {
		item.ID = strconv.Itoa(m.nextID)
		m.nextID++
	}
	if item.CreatedAt.IsZero() {
		item.CreatedAt = time.Now()
	}
	if item.Thumbnail == "" {
		item.Thumbnail = item.URL
	}
	if item.Metadata == nil {
		item.Metadata = map[string]any{}
	}
	m.items = append([]MediaItem{item}, m.items...)
	return item, nil
}

// DisabledMediaLibrary returns feature disabled errors.
type DisabledMediaLibrary struct{}

func (DisabledMediaLibrary) List(ctx context.Context) ([]MediaItem, error) {
	_ = ctx
	return nil, FeatureDisabledError{Feature: string(FeatureMedia)}
}

func (DisabledMediaLibrary) Add(ctx context.Context, item MediaItem) (MediaItem, error) {
	_ = ctx
	_ = item
	return MediaItem{}, FeatureDisabledError{Feature: string(FeatureMedia)}
}
