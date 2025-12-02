package stores

import (
	"context"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/goliatone/go-admin/admin"
)

// PostStore manages blog posts
type PostStore struct {
	mu     sync.RWMutex
	posts  []map[string]any
	nextID int
}

// NewPostStore creates a new PostStore instance
func NewPostStore() *PostStore {
	return &PostStore{posts: []map[string]any{}, nextID: 1}
}

// Seed populates the PostStore with initial data
func (s *PostStore) Seed() {
	now := time.Now()
	s.posts = []map[string]any{
		{
			"id":             "1",
			"title":          "Getting Started with Go",
			"slug":           "getting-started-go",
			"content":        "Learn the basics of Go programming...",
			"excerpt":        "A beginner's guide to Go",
			"author":         "jane.smith",
			"category":       "tutorial",
			"status":         "published",
			"published_at":   now.Add(-30 * 24 * time.Hour),
			"featured_image": "/media/go-tutorial.jpg",
			"tags":           "go,programming,tutorial",
			"created_at":     now.Add(-31 * 24 * time.Hour),
			"updated_at":     now.Add(-30 * 24 * time.Hour),
		},
		{
			"id":             "2",
			"title":          "Building REST APIs",
			"slug":           "building-rest-apis",
			"content":        "How to build RESTful APIs in Go...",
			"excerpt":        "REST API development guide",
			"author":         "jane.smith",
			"category":       "tutorial",
			"status":         "published",
			"published_at":   now.Add(-20 * 24 * time.Hour),
			"featured_image": "/media/rest-api.jpg",
			"tags":           "go,api,rest",
			"created_at":     now.Add(-21 * 24 * time.Hour),
			"updated_at":     now.Add(-20 * 24 * time.Hour),
		},
		{
			"id":             "3",
			"title":          "Company News: Q4 2024",
			"slug":           "company-news-q4-2024",
			"content":        "Exciting updates from Q4...",
			"excerpt":        "Our Q4 achievements",
			"author":         "john.doe",
			"category":       "news",
			"status":         "published",
			"published_at":   now.Add(-10 * 24 * time.Hour),
			"featured_image": "/media/news.jpg",
			"tags":           "news,company",
			"created_at":     now.Add(-11 * 24 * time.Hour),
			"updated_at":     now.Add(-10 * 24 * time.Hour),
		},
		{
			"id":             "4",
			"title":          "Database Optimization Tips",
			"slug":           "database-optimization",
			"content":        "Tips for optimizing database queries...",
			"excerpt":        "Improve your database performance",
			"author":         "jane.smith",
			"category":       "blog",
			"status":         "draft",
			"published_at":   nil,
			"featured_image": "",
			"tags":           "database,optimization",
			"created_at":     now.Add(-5 * 24 * time.Hour),
			"updated_at":     now.Add(-1 * 24 * time.Hour),
		},
		{
			"id":             "5",
			"title":          "Upcoming Features in 2025",
			"slug":           "upcoming-features-2025",
			"content":        "What's coming in 2025...",
			"excerpt":        "Preview of 2025 features",
			"author":         "admin",
			"category":       "news",
			"status":         "scheduled",
			"published_at":   now.Add(7 * 24 * time.Hour),
			"featured_image": "/media/2025.jpg",
			"tags":           "news,roadmap",
			"created_at":     now.Add(-2 * 24 * time.Hour),
			"updated_at":     now.Add(-2 * 24 * time.Hour),
		},
	}
	s.nextID = 6
}

// List returns a list of posts matching the given options
func (s *PostStore) List(ctx context.Context, opts admin.ListOptions) ([]map[string]any, int, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	filtered := s.posts
	if search, ok := opts.Filters["_search"].(string); ok && search != "" {
		filtered = []map[string]any{}
		for _, p := range s.posts {
			if strings.Contains(strings.ToLower(fmt.Sprintf("%v", p["title"])), strings.ToLower(search)) ||
				strings.Contains(strings.ToLower(fmt.Sprintf("%v", p["content"])), strings.ToLower(search)) {
				filtered = append(filtered, p)
			}
		}
	}

	return filtered, len(filtered), nil
}

// Get returns a single post by ID
func (s *PostStore) Get(ctx context.Context, id string) (map[string]any, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	for _, p := range s.posts {
		if fmt.Sprintf("%v", p["id"]) == id {
			return p, nil
		}
	}
	return nil, admin.ErrNotFound
}

// Create creates a new post
func (s *PostStore) Create(ctx context.Context, record map[string]any) (map[string]any, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	record["id"] = fmt.Sprintf("%d", s.nextID)
	record["created_at"] = time.Now()
	record["updated_at"] = time.Now()
	s.nextID++
	s.posts = append(s.posts, record)
	return record, nil
}

// Update updates an existing post
func (s *PostStore) Update(ctx context.Context, id string, record map[string]any) (map[string]any, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	for i, p := range s.posts {
		if fmt.Sprintf("%v", p["id"]) == id {
			record["id"] = id
			record["created_at"] = p["created_at"]
			record["updated_at"] = time.Now()
			s.posts[i] = record
			return record, nil
		}
	}
	return nil, admin.ErrNotFound
}

// Delete deletes a post by ID
func (s *PostStore) Delete(ctx context.Context, id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	for i, p := range s.posts {
		if fmt.Sprintf("%v", p["id"]) == id {
			s.posts = append(s.posts[:i], s.posts[i+1:]...)
			return nil
		}
	}
	return admin.ErrNotFound
}
