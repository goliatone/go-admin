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

// PageStore manages pages backed by SQLite/Bun.
type PageStore struct {
	repo     repository.Repository[*PageRecord]
	activity admin.ActivitySink
	adapter  *admin.BunRepositoryAdapter[*PageRecord]
}

// NewPageStore creates a new page store.
func NewPageStore(db *bun.DB) (*PageStore, error) {
	if db == nil {
		return nil, fmt.Errorf("page store database is nil")
	}

	repo := repository.MustNewRepository[*PageRecord](db, pageModelHandlers())
	adapter := admin.NewBunRepositoryAdapter[*PageRecord](
		repo,
		admin.WithBunSearchColumns[*PageRecord]("title", "slug"),
		admin.WithBunRecordMapper[*PageRecord](admin.BunRecordMapper[*PageRecord]{
			ToRecord: func(m map[string]any) (*PageRecord, error) {
				return pageRecordFromMap(m), nil
			},
			ToMap: func(rec *PageRecord) (map[string]any, error) {
				return pageRecordToMap(rec), nil
			},
		}),
	)

	return &PageStore{repo: repo, adapter: adapter}, nil
}

// WithActivitySink enables activity emission on CRUD operations.
func (s *PageStore) WithActivitySink(sink admin.ActivitySink) {
	s.activity = sink
}

// Seed populates the store with sample data when empty.
func (s *PageStore) Seed() {
	if s.repo == nil {
		return
	}
	ctx := context.Background()
	total, err := s.repo.Count(ctx)
	if err == nil && total > 0 {
		return
	}

	now := time.Now().UTC()
	pages := []map[string]any{
		{"id": seedContentUUID("page:home"), "title": "Home", "slug": "home", "content": "Welcome to our website", "status": "published", "meta_title": "Home - Enterprise Admin", "meta_description": "Welcome to Enterprise Admin", "created_at": now.Add(-100 * 24 * time.Hour), "updated_at": now.Add(-10 * 24 * time.Hour)},
		{"id": seedContentUUID("page:about"), "title": "About Us", "slug": "about", "content": "Learn more about our company", "status": "published", "meta_title": "About Us", "meta_description": "Learn more about our company", "created_at": now.Add(-90 * 24 * time.Hour), "updated_at": now.Add(-5 * 24 * time.Hour)},
		{"id": seedContentUUID("page:team"), "title": "Our Team", "slug": "team", "content": "Meet our team members", "status": "published", "parent_id": seedContentUUID("page:about").String(), "meta_title": "Our Team", "meta_description": "Meet our team", "created_at": now.Add(-80 * 24 * time.Hour), "updated_at": now.Add(-3 * 24 * time.Hour)},
		{"id": seedContentUUID("page:contact"), "title": "Contact", "slug": "contact", "content": "Get in touch with us", "status": "published", "meta_title": "Contact Us", "meta_description": "Get in touch", "created_at": now.Add(-70 * 24 * time.Hour), "updated_at": now.Add(-1 * 24 * time.Hour)},
		{"id": seedContentUUID("page:privacy"), "title": "Privacy Policy", "slug": "privacy", "content": "Our privacy policy", "status": "draft", "meta_title": "Privacy Policy", "meta_description": "Our privacy policy", "created_at": now.Add(-20 * 24 * time.Hour), "updated_at": now.Add(-20 * 24 * time.Hour)},
	}

	for _, seed := range pages {
		rec := pageRecordFromMap(seed)
		ensurePageTimestamps(rec, true)
		if _, err := s.repo.Upsert(ctx, rec); err != nil {
			continue
		}
	}
}

// List returns a list of pages matching the given options.
func (s *PageStore) List(ctx context.Context, opts admin.ListOptions) ([]map[string]any, int, error) {
	return s.adapter.List(ctx, opts)
}

// Get returns a single page by ID.
func (s *PageStore) Get(ctx context.Context, id string) (map[string]any, error) {
	return s.adapter.Get(ctx, id)
}

// Create creates a new page.
func (s *PageStore) Create(ctx context.Context, record map[string]any) (map[string]any, error) {
	rec := pageRecordFromMap(record)
	ensurePageTimestamps(rec, true)

	created, err := s.repo.Create(ctx, rec)
	if err != nil {
		return nil, err
	}
	out := pageRecordToMap(created)
	s.emitActivity(ctx, "created", out)
	return out, nil
}

// Update updates an existing page.
func (s *PageStore) Update(ctx context.Context, id string, record map[string]any) (map[string]any, error) {
	current, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	updated := pageRecordFromMap(record)
	updated.ID = current.ID
	updated.CreatedAt = current.CreatedAt
	if updated.PublishedAt == nil {
		updated.PublishedAt = current.PublishedAt
	}
	ensurePageTimestamps(updated, false)

	saved, err := s.repo.Update(ctx, updated)
	if err != nil {
		return nil, err
	}
	out := pageRecordToMap(saved)
	s.emitActivity(ctx, "updated", out)
	return out, nil
}

// Delete deletes a page by ID.
func (s *PageStore) Delete(ctx context.Context, id string) error {
	current, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}
	if err := s.repo.Delete(ctx, current); err != nil {
		return err
	}
	s.emitActivity(ctx, "deleted", pageRecordToMap(current))
	return nil
}

// Publish sets the status to published for matching pages (or all when ids are empty).
func (s *PageStore) Publish(ctx context.Context, ids []string) ([]map[string]any, error) {
	return s.updateStatus(ctx, ids, "published")
}

// Unpublish marks matching pages as drafts.
func (s *PageStore) Unpublish(ctx context.Context, ids []string) ([]map[string]any, error) {
	return s.updateStatus(ctx, ids, "draft")
}

func (s *PageStore) updateStatus(ctx context.Context, ids []string, status string) ([]map[string]any, error) {
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
		out := pageRecordToMap(saved)
		updated = append(updated, out)
		s.emitActivity(ctx, statusVerb(status), out)
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

func ensurePageTimestamps(rec *PageRecord, isCreate bool) {
	now := time.Now().UTC()
	if rec.CreatedAt == nil || rec.CreatedAt.IsZero() {
		rec.CreatedAt = ptrTime(now)
	}
	if rec.UpdatedAt == nil || rec.UpdatedAt.IsZero() || isCreate {
		rec.UpdatedAt = ptrTime(now)
	}
}

func statusVerb(status string) string {
	switch strings.ToLower(strings.TrimSpace(status)) {
	case "published":
		return "published"
	case "draft":
		return "unpublished"
	default:
		return status
	}
}

// Repository exposes the underlying go-repository-bun repository.
func (s *PageStore) Repository() repository.Repository[*PageRecord] {
	return s.repo
}

func mapKeys(set map[string]struct{}) []string {
	if len(set) == 0 {
		return nil
	}
	out := make([]string, 0, len(set))
	for k := range set {
		out = append(out, k)
	}
	return out
}
