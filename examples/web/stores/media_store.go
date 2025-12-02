package stores

import (
	"context"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/goliatone/go-admin/admin"
)

// MediaStore manages media files
type MediaStore struct {
	mu     sync.RWMutex
	media  []map[string]any
	nextID int
}

// NewMediaStore creates a new MediaStore instance
func NewMediaStore() *MediaStore {
	return &MediaStore{media: []map[string]any{}, nextID: 1}
}

// Seed populates the MediaStore with initial data
func (s *MediaStore) Seed() {
	now := time.Now()
	s.media = []map[string]any{
		{
			"id":          "1",
			"filename":    "logo.png",
			"type":        "image",
			"size":        "245 KB",
			"url":         "/uploads/logo.png",
			"uploaded_by": "admin",
			"uploaded_at": now.Add(-60 * 24 * time.Hour),
			"alt_text":    "Company Logo",
			"caption":     "",
		},
		{
			"id":          "2",
			"filename":    "banner.jpg",
			"type":        "image",
			"size":        "1.2 MB",
			"url":         "/uploads/banner.jpg",
			"uploaded_by": "jane.smith",
			"uploaded_at": now.Add(-45 * 24 * time.Hour),
			"alt_text":    "Homepage Banner",
			"caption":     "Main banner image",
		},
		{
			"id":          "3",
			"filename":    "guide.pdf",
			"type":        "document",
			"size":        "3.5 MB",
			"url":         "/uploads/guide.pdf",
			"uploaded_by": "jane.smith",
			"uploaded_at": now.Add(-30 * 24 * time.Hour),
			"alt_text":    "",
			"caption":     "User guide document",
		},
		{
			"id":          "4",
			"filename":    "demo.mp4",
			"type":        "video",
			"size":        "15.8 MB",
			"url":         "/uploads/demo.mp4",
			"uploaded_by": "john.doe",
			"uploaded_at": now.Add(-15 * 24 * time.Hour),
			"alt_text":    "",
			"caption":     "Product demo video",
		},
		{
			"id":          "5",
			"filename":    "screenshot.png",
			"type":        "image",
			"size":        "680 KB",
			"url":         "/uploads/screenshot.png",
			"uploaded_by": "admin",
			"uploaded_at": now.Add(-5 * 24 * time.Hour),
			"alt_text":    "Dashboard Screenshot",
			"caption":     "",
		},
	}
	s.nextID = 6
}

// List returns a list of media files matching the given options
func (s *MediaStore) List(ctx context.Context, opts admin.ListOptions) ([]map[string]any, int, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	filtered := s.media
	if search, ok := opts.Filters["_search"].(string); ok && search != "" {
		filtered = []map[string]any{}
		for _, m := range s.media {
			if strings.Contains(strings.ToLower(fmt.Sprintf("%v", m["filename"])), strings.ToLower(search)) {
				filtered = append(filtered, m)
			}
		}
	}

	return filtered, len(filtered), nil
}

// Get returns a single media file by ID
func (s *MediaStore) Get(ctx context.Context, id string) (map[string]any, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	for _, m := range s.media {
		if fmt.Sprintf("%v", m["id"]) == id {
			return m, nil
		}
	}
	return nil, admin.ErrNotFound
}

// Create creates a new media file
func (s *MediaStore) Create(ctx context.Context, record map[string]any) (map[string]any, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	record["id"] = fmt.Sprintf("%d", s.nextID)
	record["uploaded_at"] = time.Now()
	s.nextID++
	s.media = append(s.media, record)
	return record, nil
}

// Update updates an existing media file
func (s *MediaStore) Update(ctx context.Context, id string, record map[string]any) (map[string]any, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	for i, m := range s.media {
		if fmt.Sprintf("%v", m["id"]) == id {
			record["id"] = id
			record["uploaded_at"] = m["uploaded_at"]
			s.media[i] = record
			return record, nil
		}
	}
	return nil, admin.ErrNotFound
}

// Delete deletes a media file by ID
func (s *MediaStore) Delete(ctx context.Context, id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	for i, m := range s.media {
		if fmt.Sprintf("%v", m["id"]) == id {
			s.media = append(s.media[:i], s.media[i+1:]...)
			return nil
		}
	}
	return admin.ErrNotFound
}
