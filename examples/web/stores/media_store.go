package stores

import (
	"context"
	"errors"
	"fmt"
	"io"
	"mime"
	"os"
	"path"
	"path/filepath"
	"strings"
	"time"

	"github.com/goliatone/go-admin/admin"
	repository "github.com/goliatone/go-repository-bun"
	"github.com/google/uuid"
	"github.com/uptrace/bun"
)

// MediaStore manages media files backed by SQLite/Bun.
type MediaStore struct {
	repo     repository.Repository[*MediaRecord]
	activity admin.ActivitySink
	adapter  *admin.BunRepositoryAdapter[*MediaRecord]
}

const (
	defaultMediaLibraryUploadSubdir = "uploads/media/library"
	defaultMediaLibraryMaxUpload    = 25 * 1024 * 1024
	mediaShowcaseImageURL           = "/admin/assets/uploads/users/profile-pictures/1765861166124613.png"
	mediaShowcaseVectorURL          = "/admin/assets/uploads/media/showcase/brand-mark.svg"
	mediaShowcaseGenericVectorURL   = "/admin/assets/uploads/media/showcase/generic-vector.svg"
	mediaShowcaseVideoURL           = "/admin/assets/uploads/media/showcase/product-demo.mp4"
	mediaShowcaseAudioURL           = "/admin/assets/uploads/media/showcase/narration.mp3"
	mediaShowcaseDocumentURL        = "/admin/assets/uploads/media/showcase/operator-guide.pdf"
)

var staleMediaShowcaseURLs = []string{
	"/static/media/logo.png",
	"/static/media/banner.jpg",
}

// MediaLibraryUploadConfig configures disk-backed uploads for the media module.
type MediaLibraryUploadConfig struct {
	DiskAssetsDir     string
	BasePath          string
	UploadSubdir      string
	MaxSize           int64
	AcceptedKinds     []string
	AcceptedMIMETypes []string
}

// DefaultMediaLibraryUploadConfig returns the example app's durable media upload defaults.
func DefaultMediaLibraryUploadConfig(basePath string, diskAssetsDir string) MediaLibraryUploadConfig {
	return MediaLibraryUploadConfig{
		DiskAssetsDir: strings.TrimSpace(diskAssetsDir),
		BasePath:      strings.TrimSpace(basePath),
		UploadSubdir:  defaultMediaLibraryUploadSubdir,
		MaxSize:       defaultMediaLibraryMaxUpload,
		AcceptedKinds: []string{"image", "vector", "video", "audio", "document", "binary"},
		AcceptedMIMETypes: []string{
			"image/jpeg",
			"image/png",
			"image/gif",
			"image/webp",
			"image/svg+xml",
			"video/mp4",
			"video/webm",
			"video/quicktime",
			"audio/mpeg",
			"audio/mp4",
			"audio/wav",
			"application/pdf",
			"application/json",
			"application/zip",
			"application/octet-stream",
			"text/csv",
			"text/plain",
		},
	}
}

// NewMediaStore creates a new MediaStore instance.
func NewMediaStore(db *bun.DB, opts ...repository.Option) (*MediaStore, error) {
	if db == nil {
		return nil, fmt.Errorf("media store database is nil")
	}

	repo := newStoreRepository[*MediaRecord](db, mediaModelHandlers(), storeRepositoryPaginationNoDefault, opts...)
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

// SeedMediaShowcase ensures the example showcase media records are present in a DB-backed media store.
func SeedMediaShowcase(ctx context.Context, db *bun.DB, opts ...repository.Option) error {
	store, err := NewMediaStore(db, opts...)
	if err != nil {
		return err
	}
	return store.SeedWithContext(ctx)
}

// WithActivitySink enables activity emission on CRUD operations.
func (s *MediaStore) WithActivitySink(sink admin.ActivitySink) {
	s.activity = sink
}

// MediaLibrary returns a media-module adapter backed by this persistent store.
func (s *MediaStore) MediaLibrary() admin.MediaLibrary {
	if s == nil {
		return nil
	}
	return &mediaStoreLibrary{store: s}
}

// MediaLibraryWithUploads returns a media-module adapter that can persist direct uploads.
func (s *MediaStore) MediaLibraryWithUploads(cfg MediaLibraryUploadConfig) admin.MediaLibrary {
	if s == nil {
		return nil
	}
	base := &mediaStoreLibrary{store: s}
	cfg = normalizeMediaLibraryUploadConfig(cfg)
	if !cfg.uploadsEnabled() {
		return base
	}
	return &uploadMediaStoreLibrary{mediaStoreLibrary: base, cfg: cfg}
}

// Seed ensures the example showcase media records are present.
func (s *MediaStore) Seed() {
	_ = s.SeedWithContext(context.Background())
}

// SeedWithContext ensures the example showcase media records are present.
func (s *MediaStore) SeedWithContext(ctx context.Context) error {
	if ctx == nil {
		ctx = context.Background()
	}
	if s == nil || s.repo == nil {
		return nil
	}
	if err := s.deleteStaleShowcaseMedia(ctx); err != nil {
		return err
	}

	now := time.Now().UTC()
	media := []map[string]any{
		{
			"id":          seedContentUUID("media:dashboard-screenshot.png"),
			"filename":    "dashboard-screenshot.png",
			"type":        "image",
			"mime_type":   "image/png",
			"size":        int64(38224),
			"url":         mediaShowcaseImageURL,
			"uploaded_by": "admin",
			"created_at":  now.Add(-60 * 24 * time.Hour),
			"alt_text":    "Dashboard screenshot",
		},
		{
			"id":          seedContentUUID("media:brand-mark.svg"),
			"filename":    "brand-mark.svg",
			"type":        "vector",
			"mime_type":   "image/svg+xml",
			"size":        int64(493),
			"url":         mediaShowcaseVectorURL,
			"uploaded_by": "jane.smith",
			"created_at":  now.Add(-45 * 24 * time.Hour),
			"alt_text":    "Brand mark",
			"caption":     "SVG brand mark for vector preview checks",
		},
		{
			"id":          seedContentUUID("media:operator-guide.pdf"),
			"filename":    "operator-guide.pdf",
			"type":        "document",
			"mime_type":   "application/pdf",
			"size":        int64(470),
			"url":         mediaShowcaseDocumentURL,
			"uploaded_by": "jane.smith",
			"created_at":  now.Add(-30 * 24 * time.Hour),
			"caption":     "Operator guide document",
		},
		{
			"id":          seedContentUUID("media:product-demo.mp4"),
			"filename":    "product-demo.mp4",
			"type":        "video",
			"mime_type":   "video/mp4",
			"size":        int64(12394),
			"url":         mediaShowcaseVideoURL,
			"uploaded_by": "john.doe",
			"created_at":  now.Add(-15 * 24 * time.Hour),
			"caption":     "Product demo video",
		},
		{
			"id":          seedContentUUID("media:narration.mp3"),
			"filename":    "narration.mp3",
			"type":        "binary",
			"mime_type":   "audio/mpeg",
			"size":        int64(4961),
			"url":         mediaShowcaseAudioURL,
			"uploaded_by": "admin",
			"created_at":  now.Add(-5 * 24 * time.Hour),
			"caption":     "Narration audio with generic type for MIME-family checks",
		},
		{
			"id":          seedContentUUID("media:generic-vector.svg"),
			"filename":    "generic-vector.svg",
			"type":        "asset",
			"mime_type":   "image/svg+xml",
			"size":        int64(467),
			"url":         mediaShowcaseGenericVectorURL,
			"uploaded_by": "admin",
			"created_at":  now.Add(-2 * 24 * time.Hour),
			"alt_text":    "Generic SVG asset",
			"caption":     "Generic type SVG for effective vector filter checks",
		},
	}

	for _, seed := range media {
		rec := mediaRecordFromMap(seed)
		ensureMediaTimestamps(rec, true)
		if _, err := s.repo.Upsert(ctx, rec); err != nil {
			return fmt.Errorf("seed media showcase %s: %w", rec.Filename, err)
		}
	}
	return nil
}

func (s *MediaStore) deleteStaleShowcaseMedia(ctx context.Context) error {
	if s == nil || s.repo == nil {
		return nil
	}
	records, _, err := s.repo.List(ctx, repository.SelectColumnIn[string]("url", staleMediaShowcaseURLs))
	if err != nil {
		return fmt.Errorf("list stale media showcase rows: %w", err)
	}
	for _, rec := range records {
		if err := s.repo.Delete(ctx, rec); err != nil {
			return fmt.Errorf("delete stale media showcase row %s: %w", rec.URL, err)
		}
	}
	return nil
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
		rec.CreatedAt = new(now)
	}
	if rec.UpdatedAt == nil || rec.UpdatedAt.IsZero() || isCreate {
		rec.UpdatedAt = new(now)
	}
}

// Repository exposes the underlying go-repository-bun repository.
func (s *MediaStore) Repository() repository.Repository[*MediaRecord] {
	return s.repo
}

type mediaStoreLibrary struct {
	store *MediaStore
}

func (l *mediaStoreLibrary) QueryMedia(ctx context.Context, query admin.MediaQuery) (admin.MediaPage, error) {
	if l == nil || l.store == nil {
		return admin.MediaPage{}, errors.New("media store is nil")
	}
	if mediaStatusUnsupported(query.Status, query.WorkflowStatus) {
		return admin.MediaPage{Items: []admin.MediaItem{}, Total: 0, Limit: query.Limit, Offset: query.Offset}, nil
	}

	criteria := mediaQueryCriteria(query)
	records, total, err := l.store.repo.List(ctx, criteria...)
	if err != nil {
		return admin.MediaPage{}, err
	}
	items := make([]admin.MediaItem, 0, len(records))
	for _, record := range records {
		items = append(items, mediaRecordToMediaItem(record))
	}
	return admin.MediaPage{
		Items:  items,
		Total:  total,
		Limit:  query.Limit,
		Offset: query.Offset,
	}, nil
}

func (l *mediaStoreLibrary) createMediaItem(ctx context.Context, item admin.MediaItem) (admin.MediaItem, error) {
	if l == nil || l.store == nil {
		return admin.MediaItem{}, errors.New("media store is nil")
	}
	record := mediaRecordFromMediaItem(item)
	ensureMediaTimestamps(record, true)
	created, err := l.store.repo.Create(ctx, record)
	if err != nil {
		return admin.MediaItem{}, err
	}
	out := mediaRecordToMediaItem(created)
	l.store.emitActivity(ctx, "uploaded", mediaRecordToMap(created))
	return out, nil
}

func (l *mediaStoreLibrary) GetMedia(ctx context.Context, id string) (admin.MediaItem, error) {
	if l == nil || l.store == nil {
		return admin.MediaItem{}, errors.New("media store is nil")
	}
	record, err := l.store.repo.GetByID(ctx, strings.TrimSpace(id))
	if err != nil {
		return admin.MediaItem{}, err
	}
	return mediaRecordToMediaItem(record), nil
}

func (l *mediaStoreLibrary) ResolveMedia(ctx context.Context, ref admin.MediaReference) (admin.MediaItem, error) {
	if strings.TrimSpace(ref.ID) != "" {
		return l.GetMedia(ctx, ref.ID)
	}
	if strings.TrimSpace(ref.URL) != "" {
		return l.firstMediaItemBy(ctx, "url", ref.URL)
	}
	if strings.TrimSpace(ref.Name) != "" {
		return l.firstMediaItemBy(ctx, "filename", ref.Name)
	}
	return admin.MediaItem{}, admin.ErrNotFound
}

func (l *mediaStoreLibrary) UpdateMedia(ctx context.Context, id string, input admin.MediaUpdateInput) (admin.MediaItem, error) {
	if l == nil || l.store == nil {
		return admin.MediaItem{}, errors.New("media store is nil")
	}
	current, err := l.store.repo.GetByID(ctx, strings.TrimSpace(id))
	if err != nil {
		return admin.MediaItem{}, err
	}
	updated := *current
	if strings.TrimSpace(input.Name) != "" {
		updated.Filename = strings.TrimSpace(input.Name)
	}
	if strings.TrimSpace(input.Type) != "" {
		updated.Type = strings.TrimSpace(input.Type)
	}
	if strings.TrimSpace(input.MIMEType) != "" {
		updated.MimeType = strings.TrimSpace(input.MIMEType)
	}
	if input.Metadata != nil {
		updated.Metadata = cloneMetadata(input.Metadata)
	}
	if updated.CreatedAt == nil || updated.CreatedAt.IsZero() {
		now := time.Now().UTC()
		updated.CreatedAt = &now
	}
	now := time.Now().UTC()
	updated.UpdatedAt = &now
	saved, err := l.store.repo.Update(ctx, &updated)
	if err != nil {
		return admin.MediaItem{}, err
	}
	l.store.emitActivity(ctx, "updated", mediaRecordToMap(saved))
	return mediaRecordToMediaItem(saved), nil
}

func (l *mediaStoreLibrary) DeleteMedia(ctx context.Context, id string) error {
	if l == nil || l.store == nil {
		return errors.New("media store is nil")
	}
	return l.store.Delete(ctx, strings.TrimSpace(id))
}

func (l *mediaStoreLibrary) firstMediaItemBy(ctx context.Context, column string, value string) (admin.MediaItem, error) {
	if l == nil || l.store == nil {
		return admin.MediaItem{}, errors.New("media store is nil")
	}
	records, _, err := l.store.repo.List(ctx, repository.SelectBy(column, "=", strings.TrimSpace(value)), repository.SelectPaginate(1, 0))
	if err != nil {
		return admin.MediaItem{}, err
	}
	if len(records) == 0 {
		return admin.MediaItem{}, admin.ErrNotFound
	}
	return mediaRecordToMediaItem(records[0]), nil
}

type uploadMediaStoreLibrary struct {
	*mediaStoreLibrary
	cfg MediaLibraryUploadConfig
}

func (l *uploadMediaStoreLibrary) UploadMedia(ctx context.Context, input admin.MediaUploadInput) (admin.MediaItem, error) {
	if l == nil || l.mediaStoreLibrary == nil || l.store == nil {
		return admin.MediaItem{}, errors.New("media store is nil")
	}
	if input.Reader == nil {
		return admin.MediaItem{}, errors.New("media upload reader is nil")
	}
	cfg := normalizeMediaLibraryUploadConfig(l.cfg)
	if !cfg.uploadsEnabled() {
		return admin.MediaItem{}, errors.New("media upload storage is not configured")
	}

	fileName := sanitizeMediaUploadFileName(firstMediaString(input.FileName, input.Name, "upload.bin"))
	contentType := normalizeMediaContentType(firstMediaString(input.ContentType, mime.TypeByExtension(path.Ext(fileName)), "application/octet-stream"))
	if !mediaContentTypeAccepted(contentType, cfg.AcceptedMIMETypes) {
		return admin.MediaItem{}, fmt.Errorf("media content type %q is not accepted", contentType)
	}
	if input.Size > 0 && cfg.MaxSize > 0 && input.Size > cfg.MaxSize {
		return admin.MediaItem{}, fmt.Errorf("media upload exceeds max size %d", cfg.MaxSize)
	}

	dir := filepath.Join(cfg.DiskAssetsDir, filepath.FromSlash(cfg.UploadSubdir))
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return admin.MediaItem{}, err
	}
	storedName := uuid.NewString() + "-" + fileName
	finalPath := filepath.Join(dir, storedName)
	tmp, err := os.CreateTemp(dir, "."+storedName+".*.tmp")
	if err != nil {
		return admin.MediaItem{}, err
	}
	tmpName := tmp.Name()
	cleanupTmp := true
	defer func() {
		if cleanupTmp {
			_ = os.Remove(tmpName)
		}
	}()

	size, err := copyMediaUpload(tmp, input.Reader, cfg.MaxSize)
	closeErr := tmp.Close()
	if err != nil {
		return admin.MediaItem{}, err
	}
	if closeErr != nil {
		return admin.MediaItem{}, closeErr
	}
	if err := os.Rename(tmpName, finalPath); err != nil {
		return admin.MediaItem{}, err
	}
	cleanupTmp = false

	url := path.Join("/", strings.Trim(cfg.BasePath, "/"), "assets", cfg.UploadSubdir, storedName)
	item := admin.MediaItem{
		Name:     firstMediaString(input.Name, fileName),
		URL:      url,
		Type:     inferMediaType(contentType, fileName),
		MIMEType: contentType,
		Size:     size,
		Metadata: input.Metadata,
	}
	created, err := l.mediaStoreLibrary.createMediaItem(ctx, item)
	if err != nil {
		_ = os.Remove(finalPath)
		return admin.MediaItem{}, err
	}
	return created, nil
}

func (l *uploadMediaStoreLibrary) MediaCapabilities(context.Context) (admin.MediaCapabilities, error) {
	cfg := normalizeMediaLibraryUploadConfig(l.cfg)
	return admin.MediaCapabilities{
		Operations: admin.MediaOperationCapabilities{
			List:    true,
			Get:     true,
			Resolve: true,
			Upload:  cfg.uploadsEnabled(),
			Update:  true,
			Delete:  true,
		},
		Upload: admin.MediaUploadCapabilities{
			DirectUpload:      cfg.uploadsEnabled(),
			MaxSize:           cfg.MaxSize,
			AcceptedKinds:     append([]string{}, cfg.AcceptedKinds...),
			AcceptedMIMETypes: append([]string{}, cfg.AcceptedMIMETypes...),
		},
		Picker: admin.MediaPickerCapabilities{
			ValueModes:       []admin.MediaValueMode{admin.MediaValueModeURL, admin.MediaValueModeID},
			DefaultValueMode: admin.MediaValueModeURL,
		},
	}, nil
}

func mediaQueryCriteria(query admin.MediaQuery) []repository.SelectCriteria {
	limit := query.Limit
	if limit <= 0 {
		limit = 50
	}
	offset := query.Offset
	if offset < 0 {
		offset = 0
	}
	criteria := []repository.SelectCriteria{
		repository.SelectPaginate(limit, offset),
		mediaSortCriteria(query.Sort),
	}
	if search := strings.TrimSpace(query.Search); search != "" {
		criteria = append(criteria, mediaSearchCriteria(search))
	}
	if typ := strings.TrimSpace(query.Type); typ != "" {
		criteria = append(criteria, repository.SelectBy("type", "=", strings.ToLower(typ)))
	}
	if family := strings.TrimSpace(query.MIMEFamily); family != "" {
		criteria = append(criteria, mediaMIMEFamilyCriteria(family))
	}
	return criteria
}

func mediaSortCriteria(sortBy string) repository.SelectCriteria {
	switch strings.ToLower(strings.TrimSpace(sortBy)) {
	case "oldest":
		return repository.OrderBy("created_at ASC")
	case "name", "filename":
		return repository.OrderBy("filename ASC")
	case "size":
		return repository.OrderBy("size DESC")
	default:
		return repository.OrderBy("created_at DESC")
	}
}

func mediaSearchCriteria(search string) repository.SelectCriteria {
	like := "%" + strings.ToLower(strings.TrimSpace(search)) + "%"
	return repository.SelectRawProcessor(func(q *bun.SelectQuery) *bun.SelectQuery {
		return q.WhereGroup(" AND ", func(q *bun.SelectQuery) *bun.SelectQuery {
			return q.
				WhereOr("LOWER(?TableAlias.filename) LIKE ?", like).
				WhereOr("LOWER(?TableAlias.url) LIKE ?", like).
				WhereOr("LOWER(?TableAlias.type) LIKE ?", like).
				WhereOr("LOWER(?TableAlias.mime_type) LIKE ?", like)
		})
	})
}

func mediaMIMEFamilyCriteria(family string) repository.SelectCriteria {
	normalized := strings.ToLower(strings.Trim(strings.TrimSpace(family), "/"))
	if normalized == "" {
		return repository.SelectRawProcessor(func(q *bun.SelectQuery) *bun.SelectQuery {
			return q
		})
	}
	like := normalized + "/%"
	return repository.SelectRawProcessor(func(q *bun.SelectQuery) *bun.SelectQuery {
		mediaType := "LOWER(COALESCE(?TableAlias.type, ''))"
		mimeType := "LOWER(COALESCE(?TableAlias.mime_type, ''))"
		if normalized == "vector" {
			return q.WhereGroup(" AND ", func(q *bun.SelectQuery) *bun.SelectQuery {
				return q.
					WhereOr(mediaType+" = ?", "vector").
					WhereOr("("+mediaType+" NOT IN (?) AND "+mimeType+" = ?)", bun.In([]string{"image", "vector", "video", "audio"}), "image/svg+xml")
			})
		}
		if normalized == "image" {
			return q.WhereGroup(" AND ", func(q *bun.SelectQuery) *bun.SelectQuery {
				return q.
					WhereOr(mediaType+" = ?", "image").
					WhereOr("("+mediaType+" NOT IN (?) AND "+mimeType+" LIKE ? AND "+mimeType+" <> ?)", bun.In([]string{"image", "vector", "video", "audio"}), like, "image/svg+xml")
			})
		}
		return q.WhereGroup(" AND ", func(q *bun.SelectQuery) *bun.SelectQuery {
			return q.
				WhereOr(mediaType+" = ?", normalized).
				WhereOr("("+mediaType+" NOT IN (?) AND "+mimeType+" LIKE ?)", bun.In([]string{"image", "vector", "video", "audio"}), like)
		})
	})
}

func mediaStatusUnsupported(status string, workflowStatus string) bool {
	normalizedStatus := strings.ToLower(strings.TrimSpace(status))
	if normalizedStatus != "" && normalizedStatus != "ready" {
		return true
	}
	normalizedWorkflow := strings.ToLower(strings.TrimSpace(workflowStatus))
	return normalizedWorkflow != "" && normalizedWorkflow != "complete"
}

func normalizeMediaLibraryUploadConfig(cfg MediaLibraryUploadConfig) MediaLibraryUploadConfig {
	cfg.DiskAssetsDir = strings.TrimSpace(cfg.DiskAssetsDir)
	cfg.BasePath = strings.TrimSpace(cfg.BasePath)
	cfg.UploadSubdir = strings.Trim(strings.TrimSpace(cfg.UploadSubdir), "/")
	if cfg.UploadSubdir == "" {
		cfg.UploadSubdir = defaultMediaLibraryUploadSubdir
	}
	if cfg.MaxSize <= 0 {
		cfg.MaxSize = defaultMediaLibraryMaxUpload
	}
	if len(cfg.AcceptedKinds) == 0 {
		cfg.AcceptedKinds = []string{"image", "vector", "video", "audio", "document", "binary"}
	}
	if len(cfg.AcceptedMIMETypes) == 0 {
		cfg.AcceptedMIMETypes = DefaultMediaLibraryUploadConfig(cfg.BasePath, cfg.DiskAssetsDir).AcceptedMIMETypes
	}
	cfg.AcceptedKinds = normalizeStringSlice(cfg.AcceptedKinds)
	cfg.AcceptedMIMETypes = normalizeStringSlice(cfg.AcceptedMIMETypes)
	return cfg
}

func (cfg MediaLibraryUploadConfig) uploadsEnabled() bool {
	return strings.TrimSpace(cfg.DiskAssetsDir) != ""
}

func copyMediaUpload(dest *os.File, reader io.Reader, maxSize int64) (int64, error) {
	if maxSize <= 0 {
		return io.Copy(dest, reader)
	}
	limited := &io.LimitedReader{R: reader, N: maxSize + 1}
	written, err := io.Copy(dest, limited)
	if err != nil {
		return written, err
	}
	if written > maxSize {
		return written, fmt.Errorf("media upload exceeds max size %d", maxSize)
	}
	return written, nil
}

func sanitizeMediaUploadFileName(value string) string {
	name := strings.TrimSpace(value)
	name = path.Base(strings.ReplaceAll(name, "\\", "/"))
	name = filepath.Base(name)
	name = strings.TrimSpace(name)
	if name == "." || name == "/" || name == "" {
		name = "upload.bin"
	}
	var builder strings.Builder
	builder.Grow(len(name))
	lastDash := false
	for _, r := range name {
		allowed := (r >= 'a' && r <= 'z') ||
			(r >= 'A' && r <= 'Z') ||
			(r >= '0' && r <= '9') ||
			r == '.' ||
			r == '_' ||
			r == '-'
		if allowed {
			builder.WriteRune(r)
			lastDash = false
			continue
		}
		if !lastDash {
			builder.WriteByte('-')
			lastDash = true
		}
	}
	name = strings.Trim(builder.String(), ".-_")
	if name == "" {
		name = "upload.bin"
	}
	if strings.HasPrefix(name, ".") {
		name = "upload" + name
	}
	if len(name) > 140 {
		ext := path.Ext(name)
		base := strings.TrimSuffix(name, ext)
		if len(ext) > 20 {
			ext = ""
		}
		maxBase := 140 - len(ext)
		if maxBase < 1 {
			maxBase = 1
		}
		if len(base) > maxBase {
			base = base[:maxBase]
		}
		name = base + ext
	}
	return name
}

func normalizeMediaContentType(value string) string {
	value = strings.TrimSpace(strings.ToLower(value))
	if semi := strings.IndexByte(value, ';'); semi > -1 {
		value = strings.TrimSpace(value[:semi])
	}
	return value
}

func mediaContentTypeAccepted(contentType string, accepted []string) bool {
	contentType = normalizeMediaContentType(contentType)
	if contentType == "" || len(accepted) == 0 {
		return true
	}
	for _, value := range accepted {
		if normalizeMediaContentType(value) == contentType {
			return true
		}
	}
	return false
}

func normalizeStringSlice(values []string) []string {
	if len(values) == 0 {
		return []string{}
	}
	out := make([]string, 0, len(values))
	seen := map[string]struct{}{}
	for _, value := range values {
		trimmed := strings.TrimSpace(value)
		if trimmed == "" {
			continue
		}
		if _, ok := seen[trimmed]; ok {
			continue
		}
		seen[trimmed] = struct{}{}
		out = append(out, trimmed)
	}
	return out
}

func mediaRecordFromMediaItem(item admin.MediaItem) *MediaRecord {
	now := time.Now().UTC()
	name := strings.TrimSpace(item.Name)
	if name == "" && strings.TrimSpace(item.URL) != "" {
		name = path.Base(strings.TrimSpace(item.URL))
	}
	record := &MediaRecord{
		ID:        mediaItemUUID(item.ID),
		Filename:  name,
		URL:       strings.TrimSpace(item.URL),
		Type:      strings.ToLower(firstMediaString(item.Type, inferMediaType(item.MIMEType, name))),
		MimeType:  strings.TrimSpace(item.MIMEType),
		Size:      item.Size,
		Metadata:  cloneMetadata(item.Metadata),
		CreatedAt: &now,
		UpdatedAt: &now,
	}
	if uploadedBy := metadataString(record.Metadata, "uploaded_by"); uploadedBy != "" {
		record.UploadedBy = uploadedBy
	}
	if record.MimeType == "" {
		record.MimeType = record.Type
	}
	return record
}

func mediaItemUUID(id string) uuid.UUID {
	if parsed, err := uuid.Parse(strings.TrimSpace(id)); err == nil {
		return parsed
	}
	return uuid.New()
}

func mediaRecordToMediaItem(record *MediaRecord) admin.MediaItem {
	if record == nil {
		return admin.MediaItem{}
	}
	return admin.MediaItem{
		ID:             record.ID.String(),
		Name:           record.Filename,
		URL:            record.URL,
		Thumbnail:      mediaRecordThumbnailURL(record.Type, record.MimeType, record.URL),
		Type:           record.Type,
		MIMEType:       record.MimeType,
		Size:           record.Size,
		Status:         "ready",
		WorkflowStatus: "complete",
		Metadata:       cloneMetadata(record.Metadata),
		CreatedAt:      timeValue(record.CreatedAt),
	}
}

func mediaMapToMediaItem(record map[string]any) admin.MediaItem {
	metadata := map[string]any{}
	if meta, ok := record["metadata"].(map[string]any); ok {
		mapsCopy(metadata, meta)
	}
	for _, key := range []string{"alt_text", "caption", "tags", "uploaded_by"} {
		if value, ok := record[key]; ok {
			metadata[key] = value
		}
	}
	typ := strings.ToLower(fmt.Sprint(record["type"]))
	mimeType := fmt.Sprint(record["mime_type"])
	url := fmt.Sprint(record["url"])
	return admin.MediaItem{
		ID:             fmt.Sprint(record["id"]),
		Name:           fmt.Sprint(record["filename"]),
		URL:            url,
		Thumbnail:      mediaRecordThumbnailURL(typ, mimeType, url),
		Type:           typ,
		MIMEType:       mimeType,
		Size:           toInt64Value(record["size"]),
		Status:         "ready",
		WorkflowStatus: "complete",
		Metadata:       metadata,
		CreatedAt:      parseTimeValue(record["created_at"]),
	}
}

func mediaRecordThumbnailURL(mediaType string, mimeType string, url string) string {
	switch strings.ToLower(strings.TrimSpace(mediaType)) {
	case "image", "vector":
		return strings.TrimSpace(url)
	}
	switch inferMediaType(mimeType, url) {
	case "image", "vector":
		return strings.TrimSpace(url)
	default:
		return ""
	}
}

func inferMediaType(mimeType string, fileName string) string {
	mimeType = strings.ToLower(strings.TrimSpace(mimeType))
	switch {
	case strings.HasPrefix(mimeType, "image/"):
		if strings.Contains(mimeType, "svg") {
			return "vector"
		}
		return "image"
	case strings.HasPrefix(mimeType, "video/"):
		return "video"
	case strings.HasPrefix(mimeType, "audio/"):
		return "audio"
	case strings.Contains(mimeType, "pdf") || strings.HasPrefix(mimeType, "text/"):
		return "document"
	}
	ext := strings.ToLower(path.Ext(fileName))
	switch ext {
	case ".jpg", ".jpeg", ".png", ".gif", ".webp":
		return "image"
	case ".svg":
		return "vector"
	case ".mp4", ".mov", ".webm":
		return "video"
	case ".mp3", ".wav", ".m4a":
		return "audio"
	case ".pdf", ".txt", ".doc", ".docx":
		return "document"
	default:
		return "binary"
	}
}

func firstMediaString(values ...string) string {
	for _, value := range values {
		if trimmed := strings.TrimSpace(value); trimmed != "" {
			return trimmed
		}
	}
	return ""
}

func cloneMetadata(metadata map[string]any) map[string]any {
	if len(metadata) == 0 {
		return map[string]any{}
	}
	out := make(map[string]any, len(metadata))
	mapsCopy(out, metadata)
	return out
}

func mapsCopy(dest map[string]any, src map[string]any) {
	for key, value := range src {
		dest[key] = value
	}
}

func metadataString(metadata map[string]any, key string) string {
	if len(metadata) == 0 {
		return ""
	}
	return strings.TrimSpace(fmt.Sprint(metadata[key]))
}

func timeValue(value *time.Time) time.Time {
	if value == nil {
		return time.Time{}
	}
	return *value
}

func toInt64Value(value any) int64 {
	switch typed := value.(type) {
	case int64:
		return typed
	case int:
		return int64(typed)
	case float64:
		return int64(typed)
	case string:
		return parseSize(typed)
	default:
		return 0
	}
}
