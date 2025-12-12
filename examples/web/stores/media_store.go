package stores

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/goliatone/go-admin/pkg/admin"
	repository "github.com/goliatone/go-repository-bun"
	"github.com/uptrace/bun"
)

// MediaStore manages media files backed by SQLite/Bun.
type MediaStore struct {
	repo     repository.Repository[*MediaRecord]
	activity admin.ActivitySink
	adapter  *admin.BunRepositoryAdapter[*MediaRecord]
}

// NewMediaStore creates a new MediaStore instance.
func NewMediaStore(db *bun.DB) (*MediaStore, error) {
	if db == nil {
		return nil, fmt.Errorf("media store database is nil")
	}

	repo := repository.MustNewRepository[*MediaRecord](db, mediaModelHandlers())
	adapter := admin.NewBunRepositoryAdapter[*MediaRecord](
		repo,
		admin.WithBunSearchColumns[*MediaRecord]("filename"),
		admin.WithBunRecordMapper[*MediaRecord](admin.BunRecordMapper[*MediaRecord]{
			ToRecord: func(m map[string]any) (*MediaRecord, error) {
				return mediaRecordFromMap(m), nil
			},
			ToMap: func(rec *MediaRecord) (map[string]any, error) {
				return mediaRecordToMap(rec), nil
			},
		}),
	)

	return &MediaStore{repo: repo, adapter: adapter}, nil
}

// WithActivitySink enables activity emission on CRUD operations.
func (s *MediaStore) WithActivitySink(sink admin.ActivitySink) {
	s.activity = sink
}

// Seed populates the MediaStore with initial data when empty.
func (s *MediaStore) Seed() {
	if s.repo == nil {
		return
	}
	ctx := context.Background()
	total, err := s.repo.Count(ctx)
	if err == nil && total > 0 {
		return
	}

	now := time.Now().UTC()
	media := []map[string]any{
		{
			"id":          seedContentUUID("media:logo.png"),
			"filename":    "logo.png",
			"type":        "image",
			"mime_type":   "image/png",
			"size":        parseSize("245 KB"),
			"url":         "/uploads/logo.png",
			"uploaded_by": "admin",
			"created_at":  now.Add(-60 * 24 * time.Hour),
			"alt_text":    "Company Logo",
		},
		{
			"id":          seedContentUUID("media:banner.jpg"),
			"filename":    "banner.jpg",
			"type":        "image",
			"mime_type":   "image/jpeg",
			"size":        parseSize("1.2 MB"),
			"url":         "/uploads/banner.jpg",
			"uploaded_by": "jane.smith",
			"created_at":  now.Add(-45 * 24 * time.Hour),
			"alt_text":    "Homepage Banner",
			"caption":     "Main banner image",
		},
		{
			"id":          seedContentUUID("media:guide.pdf"),
			"filename":    "guide.pdf",
			"type":        "document",
			"mime_type":   "application/pdf",
			"size":        parseSize("3.5 MB"),
			"url":         "/uploads/guide.pdf",
			"uploaded_by": "jane.smith",
			"created_at":  now.Add(-30 * 24 * time.Hour),
			"caption":     "User guide document",
		},
		{
			"id":          seedContentUUID("media:demo.mp4"),
			"filename":    "demo.mp4",
			"type":        "video",
			"mime_type":   "video/mp4",
			"size":        parseSize("15.8 MB"),
			"url":         "/uploads/demo.mp4",
			"uploaded_by": "john.doe",
			"created_at":  now.Add(-15 * 24 * time.Hour),
			"caption":     "Product demo video",
		},
		{
			"id":          seedContentUUID("media:screenshot.png"),
			"filename":    "screenshot.png",
			"type":        "image",
			"mime_type":   "image/png",
			"size":        parseSize("680 KB"),
			"url":         "/uploads/screenshot.png",
			"uploaded_by": "admin",
			"created_at":  now.Add(-5 * 24 * time.Hour),
			"alt_text":    "Dashboard Screenshot",
		},
	}

	for _, seed := range media {
		rec := mediaRecordFromMap(seed)
		ensureMediaTimestamps(rec, true)
		if _, err := s.repo.Upsert(ctx, rec); err != nil {
			continue
		}
	}
}

// List returns a list of media files matching the given options.
func (s *MediaStore) List(ctx context.Context, opts admin.ListOptions) ([]map[string]any, int, error) {
	return s.adapter.List(ctx, opts)
}

// Get returns a single media file by ID.
func (s *MediaStore) Get(ctx context.Context, id string) (map[string]any, error) {
	return s.adapter.Get(ctx, id)
}

// Create creates a new media file.
func (s *MediaStore) Create(ctx context.Context, record map[string]any) (map[string]any, error) {
	rec := mediaRecordFromMap(record)
	ensureMediaTimestamps(rec, true)

	created, err := s.repo.Create(ctx, rec)
	if err != nil {
		return nil, err
	}
	out := mediaRecordToMap(created)
	s.emitActivity(ctx, "uploaded", out)
	return out, nil
}

// Update updates an existing media file.
func (s *MediaStore) Update(ctx context.Context, id string, record map[string]any) (map[string]any, error) {
	current, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	updated := mediaRecordFromMap(record)
	updated.ID = current.ID
	updated.CreatedAt = current.CreatedAt
	if updated.MimeType == "" {
		updated.MimeType = current.MimeType
	}
	if updated.Size == 0 {
		updated.Size = current.Size
	}
	for k, v := range current.Metadata {
		if updated.Metadata == nil {
			updated.Metadata = map[string]any{}
		}
		if _, ok := updated.Metadata[k]; !ok {
			updated.Metadata[k] = v
		}
	}
	ensureMediaTimestamps(updated, false)

	saved, err := s.repo.Update(ctx, updated)
	if err != nil {
		return nil, err
	}
	out := mediaRecordToMap(saved)
	s.emitActivity(ctx, "updated", out)
	return out, nil
}

// Delete deletes a media file by ID.
func (s *MediaStore) Delete(ctx context.Context, id string) error {
	current, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}
	if err := s.repo.Delete(ctx, current); err != nil {
		return err
	}
	s.emitActivity(ctx, "deleted", mediaRecordToMap(current))
	return nil
}

// DeleteMany removes multiple media files in one pass.
func (s *MediaStore) DeleteMany(ctx context.Context, ids []string) ([]map[string]any, error) {
	targets := normalizeIDSet(ids)
	if len(targets) == 0 {
		return nil, errors.New("no media ids provided")
	}

	listCriteria := []repository.SelectCriteria{repository.SelectColumnIn[string]("id", mapKeys(targets))}
	records, _, err := s.repo.List(ctx, listCriteria...)
	if err != nil {
		return nil, err
	}
	if len(records) == 0 {
		return nil, admin.ErrNotFound
	}

	deleted := []map[string]any{}
	for _, rec := range records {
		if err := s.repo.Delete(ctx, rec); err != nil {
			return nil, err
		}
		out := mediaRecordToMap(rec)
		deleted = append(deleted, out)
		s.emitActivity(ctx, "deleted", out)
	}
	return deleted, nil
}

func (s *MediaStore) emitActivity(ctx context.Context, verb string, media map[string]any) {
	if s.activity == nil || media == nil {
		return
	}

	objectID := strings.TrimSpace(fmt.Sprintf("%v", media["id"]))
	entry := admin.ActivityEntry{
		Actor:  resolveActivityActor(ctx),
		Action: verb,
		Object: fmt.Sprintf("media:%s", objectID),
		Metadata: map[string]any{
			"filename": media["filename"],
			"type":     media["type"],
			"url":      media["url"],
		},
	}
	_ = s.activity.Record(ctx, entry)
}

func ensureMediaTimestamps(rec *MediaRecord, isCreate bool) {
	now := time.Now().UTC()
	if rec.CreatedAt == nil || rec.CreatedAt.IsZero() {
		rec.CreatedAt = ptrTime(now)
	}
	if rec.UpdatedAt == nil || rec.UpdatedAt.IsZero() || isCreate {
		rec.UpdatedAt = ptrTime(now)
	}
}

// Repository exposes the underlying go-repository-bun repository.
func (s *MediaStore) Repository() repository.Repository[*MediaRecord] {
	return s.repo
}
