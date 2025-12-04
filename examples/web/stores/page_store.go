package stores

import (
	"context"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/goliatone/go-admin/admin"
)

// PageStore manages pages in memory.
type PageStore struct {
	mu       sync.RWMutex
	pages    []map[string]any
	nextID   int
	activity admin.ActivitySink
}

// NewPageStore creates a new page store.
func NewPageStore() *PageStore {
	return &PageStore{pages: []map[string]any{}, nextID: 1}
}

// WithActivitySink enables activity emission on CRUD operations.
func (s *PageStore) WithActivitySink(sink admin.ActivitySink) {
	s.activity = sink
}

// Seed populates the store with sample data.
func (s *PageStore) Seed() {
	now := time.Now()
	s.pages = []map[string]any{
		{"id": "1", "title": "Home", "slug": "home", "content": "Welcome to our website", "status": "published", "parent_id": "", "meta_title": "Home - Enterprise Admin", "meta_description": "Welcome to Enterprise Admin", "created_at": now.Add(-100 * 24 * time.Hour), "updated_at": now.Add(-10 * 24 * time.Hour)},
		{"id": "2", "title": "About Us", "slug": "about", "content": "Learn more about our company", "status": "published", "parent_id": "", "meta_title": "About Us", "meta_description": "Learn more about our company", "created_at": now.Add(-90 * 24 * time.Hour), "updated_at": now.Add(-5 * 24 * time.Hour)},
		{"id": "3", "title": "Our Team", "slug": "team", "content": "Meet our team members", "status": "published", "parent_id": "2", "meta_title": "Our Team", "meta_description": "Meet our team", "created_at": now.Add(-80 * 24 * time.Hour), "updated_at": now.Add(-3 * 24 * time.Hour)},
		{"id": "4", "title": "Contact", "slug": "contact", "content": "Get in touch with us", "status": "published", "parent_id": "", "meta_title": "Contact Us", "meta_description": "Get in touch", "created_at": now.Add(-70 * 24 * time.Hour), "updated_at": now.Add(-1 * 24 * time.Hour)},
		{"id": "5", "title": "Privacy Policy", "slug": "privacy", "content": "Our privacy policy", "status": "draft", "parent_id": "", "meta_title": "Privacy Policy", "meta_description": "Our privacy policy", "created_at": now.Add(-20 * 24 * time.Hour), "updated_at": now.Add(-20 * 24 * time.Hour)},
	}
	s.nextID = 6
}

func (s *PageStore) List(ctx context.Context, opts admin.ListOptions) ([]map[string]any, int, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	filtered := s.pages
	if search, ok := opts.Filters["_search"].(string); ok && search != "" {
		filtered = []map[string]any{}
		for _, p := range s.pages {
			if strings.Contains(strings.ToLower(fmt.Sprintf("%v", p["title"])), strings.ToLower(search)) || strings.Contains(strings.ToLower(fmt.Sprintf("%v", p["slug"])), strings.ToLower(search)) {
				filtered = append(filtered, p)
			}
		}
	}
	return filtered, len(filtered), nil
}

func (s *PageStore) Get(ctx context.Context, id string) (map[string]any, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	for _, p := range s.pages {
		if fmt.Sprintf("%v", p["id"]) == id {
			return p, nil
		}
	}
	return nil, admin.ErrNotFound
}

func (s *PageStore) Create(ctx context.Context, record map[string]any) (map[string]any, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	record["id"] = fmt.Sprintf("%d", s.nextID)
	record["created_at"] = time.Now()
	record["updated_at"] = time.Now()
	s.nextID++
	s.pages = append(s.pages, record)
	s.emitActivity(ctx, "created", record)
	return record, nil
}

func (s *PageStore) Update(ctx context.Context, id string, record map[string]any) (map[string]any, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	for i, p := range s.pages {
		if fmt.Sprintf("%v", p["id"]) == id {
			record["id"] = id
			record["created_at"] = p["created_at"]
			record["updated_at"] = time.Now()
			s.pages[i] = record
			s.emitActivity(ctx, "updated", record)
			return record, nil
		}
	}
	return nil, admin.ErrNotFound
}

func (s *PageStore) Delete(ctx context.Context, id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	for i, p := range s.pages {
		if fmt.Sprintf("%v", p["id"]) == id {
			s.emitActivity(ctx, "deleted", p)
			s.pages = append(s.pages[:i], s.pages[i+1:]...)
			return nil
		}
	}
	return admin.ErrNotFound
}

// Publish sets the status to published for matching pages (or all when ids are empty).
func (s *PageStore) Publish(ctx context.Context, ids []string) ([]map[string]any, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	targets := normalizeIDSet(ids)
	now := time.Now()
	updated := []map[string]any{}

	for i, p := range s.pages {
		id := stringID(p["id"])
		if !idMatches(targets, id) {
			continue
		}
		status := strings.ToLower(fmt.Sprint(p["status"]))
		if status == "published" {
			continue
		}
		record := cloneRecord(p)
		record["id"] = id
		record["status"] = "published"
		record["updated_at"] = now
		s.pages[i] = record
		s.emitActivity(ctx, "published", record)
		updated = append(updated, cloneRecord(record))
	}

	if len(updated) == 0 && len(targets) > 0 {
		return nil, admin.ErrNotFound
	}
	return updated, nil
}

// Unpublish marks matching pages as drafts.
func (s *PageStore) Unpublish(ctx context.Context, ids []string) ([]map[string]any, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	targets := normalizeIDSet(ids)
	now := time.Now()
	updated := []map[string]any{}

	for i, p := range s.pages {
		id := stringID(p["id"])
		if !idMatches(targets, id) {
			continue
		}
		status := strings.ToLower(fmt.Sprint(p["status"]))
		if status == "draft" {
			continue
		}
		record := cloneRecord(p)
		record["id"] = id
		record["status"] = "draft"
		record["updated_at"] = now
		s.pages[i] = record
		s.emitActivity(ctx, "unpublished", record)
		updated = append(updated, cloneRecord(record))
	}

	if len(updated) == 0 && len(targets) > 0 {
		return nil, admin.ErrNotFound
	}
	return updated, nil
}

func (s *PageStore) emitActivity(ctx context.Context, verb string, page map[string]any) {
	if s.activity == nil || page == nil {
		return
	}

	objectID := strings.TrimSpace(fmt.Sprintf("%v", page["id"]))
	entry := admin.ActivityEntry{
		Actor:  resolveActivityActor(ctx),
		Action: verb,
		Object: fmt.Sprintf("page:%s", objectID),
		Metadata: map[string]any{
			"title":  page["title"],
			"slug":   page["slug"],
			"status": page["status"],
		},
	}
	_ = s.activity.Record(ctx, entry)
}
