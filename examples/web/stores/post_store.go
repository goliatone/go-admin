package stores

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/goliatone/go-admin/admin"
	repository "github.com/goliatone/go-repository-bun"
	"github.com/uptrace/bun"
)

// PostStore manages blog posts backed by SQLite/Bun.
type PostStore struct {
	repo     repository.Repository[*PostRecord]
	activity admin.ActivitySink
	adapter  *admin.BunRepositoryAdapter[*PostRecord]
}

// NewPostStore creates a new PostStore instance.
func NewPostStore(db *bun.DB) (*PostStore, error) {
	if db == nil {
		return nil, fmt.Errorf("post store database is nil")
	}

	repo := repository.MustNewRepository[*PostRecord](db, postModelHandlers())
	adapter := admin.NewBunRepositoryAdapter[*PostRecord](
		repo,
		admin.WithBunSearchColumns[*PostRecord]("title", "slug", "category"),
		admin.WithBunRecordMapper[*PostRecord](admin.BunRecordMapper[*PostRecord]{
			ToRecord: func(m map[string]any) (*PostRecord, error) {
				return postRecordFromMap(m), nil
			},
			ToMap: func(rec *PostRecord) (map[string]any, error) {
				return postRecordToMap(rec), nil
			},
		}),
	)

	return &PostStore{repo: repo, adapter: adapter}, nil
}

// WithActivitySink enables activity emission on CRUD operations.
func (s *PostStore) WithActivitySink(sink admin.ActivitySink) {
	s.activity = sink
}

// Seed populates the PostStore with initial data when empty.
func (s *PostStore) Seed() {
	if s.repo == nil {
		return
	}
	ctx := context.Background()
	total, err := s.repo.Count(ctx)
	if err == nil && total > 0 {
		return
	}

	now := time.Now().UTC()
	posts := []map[string]any{
		{
			"id":             seedContentUUID("post:getting-started-go"),
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
			"id":             seedContentUUID("post:building-rest-apis"),
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
			"id":             seedContentUUID("post:company-news-q4-2024"),
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
			"id":             seedContentUUID("post:database-optimization"),
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
			"id":             seedContentUUID("post:upcoming-features-2025"),
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

	for _, seed := range posts {
		rec := postRecordFromMap(seed)
		ensurePostTimestamps(rec, true)
		if strings.EqualFold(rec.Status, "published") && rec.PublishedAt == nil {
			rec.PublishedAt = ptrTime(now)
		}
		if _, err := s.repo.Upsert(ctx, rec); err != nil {
			continue
		}
	}
}

// List returns a list of posts matching the given options.
func (s *PostStore) List(ctx context.Context, opts admin.ListOptions) ([]map[string]any, int, error) {
	return s.adapter.List(ctx, opts)
}

// Get returns a single post by ID.
func (s *PostStore) Get(ctx context.Context, id string) (map[string]any, error) {
	return s.adapter.Get(ctx, id)
}

// Create creates a new post.
func (s *PostStore) Create(ctx context.Context, record map[string]any) (map[string]any, error) {
	rec := postRecordFromMap(record)
	ensurePostTimestamps(rec, true)
	if strings.EqualFold(rec.Status, "published") && rec.PublishedAt == nil {
		now := time.Now().UTC()
		rec.PublishedAt = ptrTime(now)
		rec.UpdatedAt = ptrTime(now)
	}

	created, err := s.repo.Create(ctx, rec)
	if err != nil {
		return nil, err
	}
	out := postRecordToMap(created)
	s.emitActivity(ctx, "created", out)
	return out, nil
}

// Update updates an existing post.
func (s *PostStore) Update(ctx context.Context, id string, record map[string]any) (map[string]any, error) {
	current, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	updated := postRecordFromMap(record)
	updated.ID = current.ID
	updated.CreatedAt = current.CreatedAt
	if updated.PublishedAt == nil {
		updated.PublishedAt = current.PublishedAt
	}
	ensurePostTimestamps(updated, false)

	saved, err := s.repo.Update(ctx, updated)
	if err != nil {
		return nil, err
	}
	out := postRecordToMap(saved)
	s.emitActivity(ctx, "updated", out)
	return out, nil
}

// Delete deletes a post by ID.
func (s *PostStore) Delete(ctx context.Context, id string) error {
	current, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}
	if err := s.repo.Delete(ctx, current); err != nil {
		return err
	}
	s.emitActivity(ctx, "deleted", postRecordToMap(current))
	return nil
}

// Publish sets matching posts to published and stamps published_at when missing.
func (s *PostStore) Publish(ctx context.Context, ids []string) ([]map[string]any, error) {
	return s.updateStatus(ctx, ids, "published")
}

// Archive marks matching posts as archived.
func (s *PostStore) Archive(ctx context.Context, ids []string) ([]map[string]any, error) {
	return s.updateStatus(ctx, ids, "archived")
}

func (s *PostStore) updateStatus(ctx context.Context, ids []string, status string) ([]map[string]any, error) {
	targets := normalizeIDSet(ids)
	now := time.Now().UTC()
	updated := []map[string]any{}

	listCriteria := []repository.SelectCriteria{}
	if len(targets) > 0 {
		listCriteria = append(listCriteria, repository.SelectColumnIn[string]("id", mapKeys(targets)))
	}

	records, _, err := s.repo.List(ctx, listCriteria...)
	if err != nil {
		return nil, err
	}
	if len(records) == 0 && len(targets) > 0 {
		return nil, admin.ErrNotFound
	}

	for _, rec := range records {
		if strings.EqualFold(rec.Status, status) {
			continue
		}
		rec.Status = status
		rec.UpdatedAt = ptrTime(now)
		if strings.EqualFold(status, "published") && rec.PublishedAt == nil {
			rec.PublishedAt = ptrTime(now)
		}
		saved, err := s.repo.Update(ctx, rec)
		if err != nil {
			return nil, err
		}
		out := postRecordToMap(saved)
		updated = append(updated, out)
		s.emitActivity(ctx, statusVerb(status), out)
	}

	if len(updated) == 0 && len(targets) > 0 {
		return nil, admin.ErrNotFound
	}
	return updated, nil
}

func (s *PostStore) emitActivity(ctx context.Context, verb string, post map[string]any) {
	if s.activity == nil || post == nil {
		return
	}

	objectID := strings.TrimSpace(fmt.Sprintf("%v", post["id"]))
	entry := admin.ActivityEntry{
		Actor:  resolveActivityActor(ctx),
		Action: verb,
		Object: fmt.Sprintf("post:%s", objectID),
		Metadata: map[string]any{
			"title":    post["title"],
			"slug":     post["slug"],
			"status":   post["status"],
			"category": post["category"],
		},
	}
	_ = s.activity.Record(ctx, entry)
}

func ensurePostTimestamps(rec *PostRecord, isCreate bool) {
	now := time.Now().UTC()
	if rec.CreatedAt == nil || rec.CreatedAt.IsZero() {
		rec.CreatedAt = ptrTime(now)
	}
	if rec.UpdatedAt == nil || rec.UpdatedAt.IsZero() || isCreate {
		rec.UpdatedAt = ptrTime(now)
	}
}

// Repository exposes the underlying go-repository-bun repository.
func (s *PostStore) Repository() repository.Repository[*PostRecord] {
	return s.repo
}
