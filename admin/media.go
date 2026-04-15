package admin

import (
	"context"
	"io"
	"strconv"
	"sync"
	"time"
)

// MediaItem describes a stored asset.
type MediaItem struct {
	ID             string         `json:"id"`
	Name           string         `json:"name"`
	URL            string         `json:"url"`
	Thumbnail      string         `json:"thumbnail,omitempty"`
	Type           string         `json:"type,omitempty"`
	MIMEType       string         `json:"mime_type,omitempty"`
	Size           int64          `json:"size,omitempty"`
	Status         string         `json:"status,omitempty"`
	WorkflowStatus string         `json:"workflow_status,omitempty"`
	WorkflowError  string         `json:"workflow_error,omitempty"`
	Metadata       map[string]any `json:"metadata,omitempty"`
	CreatedAt      time.Time      `json:"created_at"`
}

// MediaLibrary exposes the legacy V1-compatible media listing/creation surface.
// Hosts may continue to implement List/Add during the additive media-route
// transition, but richer interfaces should be preferred for new integrations.
type MediaLibrary interface {
	List(ctx context.Context) ([]MediaItem, error)
	Add(ctx context.Context, item MediaItem) (MediaItem, error)
}

// MediaQuery carries list filtering and pagination hints.
type MediaQuery struct {
	Search         string `json:"search,omitempty"`
	Type           string `json:"type,omitempty"`
	MIMEFamily     string `json:"mime_family,omitempty"`
	Status         string `json:"status,omitempty"`
	WorkflowStatus string `json:"workflow_status,omitempty"`
	Sort           string `json:"sort,omitempty"`
	Limit          int    `json:"limit,omitempty"`
	Offset         int    `json:"offset,omitempty"`
}

// MediaPage represents a paginated media result set.
type MediaPage struct {
	Items  []MediaItem `json:"items"`
	Total  int         `json:"total"`
	Limit  int         `json:"limit,omitempty"`
	Offset int         `json:"offset,omitempty"`
}

// MediaReference identifies a media item by the stable value modes exposed to
// form widgets and APIs.
type MediaReference struct {
	ID   string `json:"id,omitempty"`
	URL  string `json:"url,omitempty"`
	Name string `json:"name,omitempty"`
}

// MediaValueMode defines how media picker fields persist values.
type MediaValueMode string

const (
	MediaValueModeURL MediaValueMode = "url"
	MediaValueModeID  MediaValueMode = "id"
)

// MediaOperationCapabilities describes which high-level operations are
// available for the current request.
type MediaOperationCapabilities struct {
	List         bool `json:"list"`
	Get          bool `json:"get"`
	Resolve      bool `json:"resolve"`
	Upload       bool `json:"upload"`
	Presign      bool `json:"presign"`
	Confirm      bool `json:"confirm"`
	Update       bool `json:"update"`
	Delete       bool `json:"delete"`
	LegacyCreate bool `json:"legacy_create,omitempty"`
}

// MediaUploadCapabilities describes available upload modes and limits.
type MediaUploadCapabilities struct {
	DirectUpload      bool     `json:"direct_upload"`
	Presign           bool     `json:"presign"`
	MaxSize           int64    `json:"max_size,omitempty"`
	AcceptedKinds     []string `json:"accepted_kinds,omitempty"`
	AcceptedMIMETypes []string `json:"accepted_mime_types,omitempty"`
}

// MediaPickerCapabilities describes picker value-mode behavior.
type MediaPickerCapabilities struct {
	ValueModes       []MediaValueMode `json:"value_modes,omitempty"`
	DefaultValueMode MediaValueMode   `json:"default_value_mode,omitempty"`
}

// MediaCapabilities aggregates request-scoped media capabilities.
type MediaCapabilities struct {
	Operations MediaOperationCapabilities `json:"operations"`
	Upload     MediaUploadCapabilities    `json:"upload"`
	Picker     MediaPickerCapabilities    `json:"picker"`
}

// MediaUploadRequest captures transport-layer upload metadata from HTTP callers.
type MediaUploadRequest struct {
	Name        string         `json:"name,omitempty"`
	FileName    string         `json:"file_name,omitempty"`
	ContentType string         `json:"content_type,omitempty"`
	Size        int64          `json:"size,omitempty"`
	Metadata    map[string]any `json:"metadata,omitempty"`
}

// MediaUploadInput carries the service-layer upload request with a reader-backed
// payload.
type MediaUploadInput struct {
	MediaUploadRequest
	Reader io.Reader `json:"-"`
}

// MediaPresignRequest captures the metadata needed to prepare an upload.
type MediaPresignRequest struct {
	Name        string         `json:"name,omitempty"`
	FileName    string         `json:"file_name,omitempty"`
	ContentType string         `json:"content_type,omitempty"`
	Size        int64          `json:"size,omitempty"`
	Metadata    map[string]any `json:"metadata,omitempty"`
}

// MediaPresignResponse returns the upload target and any required request data.
type MediaPresignResponse struct {
	UploadURL string            `json:"upload_url,omitempty"`
	Method    string            `json:"method,omitempty"`
	Headers   map[string]string `json:"headers,omitempty"`
	Fields    map[string]string `json:"fields,omitempty"`
	UploadID  string            `json:"upload_id,omitempty"`
}

// MediaConfirmRequest finalizes an upload after direct or presigned transfer.
type MediaConfirmRequest struct {
	UploadID    string         `json:"upload_id,omitempty"`
	Name        string         `json:"name,omitempty"`
	URL         string         `json:"url,omitempty"`
	FileName    string         `json:"file_name,omitempty"`
	ContentType string         `json:"content_type,omitempty"`
	Size        int64          `json:"size,omitempty"`
	Metadata    map[string]any `json:"metadata,omitempty"`
}

// MediaUpdateInput applies mutable metadata updates to an existing media item.
type MediaUpdateInput struct {
	Name           string         `json:"name,omitempty"`
	Thumbnail      string         `json:"thumbnail,omitempty"`
	Type           string         `json:"type,omitempty"`
	MIMEType       string         `json:"mime_type,omitempty"`
	Status         string         `json:"status,omitempty"`
	WorkflowStatus string         `json:"workflow_status,omitempty"`
	WorkflowError  string         `json:"workflow_error,omitempty"`
	Metadata       map[string]any `json:"metadata,omitempty"`
}

// MediaQueryProvider exposes paginated/query-aware listing.
type MediaQueryProvider interface {
	QueryMedia(ctx context.Context, query MediaQuery) (MediaPage, error)
}

// MediaCapabilityProvider exposes request-scoped media capability information.
type MediaCapabilityProvider interface {
	MediaCapabilities(ctx context.Context) (MediaCapabilities, error)
}

// MediaGetter resolves a media item by ID.
type MediaGetter interface {
	GetMedia(ctx context.Context, id string) (MediaItem, error)
}

// MediaResolver resolves a picker reference into a media item.
type MediaResolver interface {
	ResolveMedia(ctx context.Context, ref MediaReference) (MediaItem, error)
}

// MediaUploader stores a new media asset from a reader-backed upload payload.
type MediaUploader interface {
	UploadMedia(ctx context.Context, input MediaUploadInput) (MediaItem, error)
}

// MediaPresigner prepares an upload target for client-side transfer.
type MediaPresigner interface {
	PresignMedia(ctx context.Context, req MediaPresignRequest) (MediaPresignResponse, error)
}

// MediaConfirmer finalizes a previously uploaded media asset.
type MediaConfirmer interface {
	ConfirmMedia(ctx context.Context, req MediaConfirmRequest) (MediaItem, error)
}

// MediaUpdater mutates an existing media item's metadata.
type MediaUpdater interface {
	UpdateMedia(ctx context.Context, id string, input MediaUpdateInput) (MediaItem, error)
}

// MediaDeleter removes a media item.
type MediaDeleter interface {
	DeleteMedia(ctx context.Context, id string) error
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
				ID:             "1",
				Name:           "hero.jpg",
				URL:            baseURL + "/assets/hero.jpg",
				Thumbnail:      baseURL + "/assets/hero-thumb.jpg",
				Type:           "image",
				MIMEType:       "image/jpeg",
				Size:           102400,
				Status:         "ready",
				WorkflowStatus: "complete",
				Metadata: map[string]any{
					"cdn_url": baseURL + "/cdn/hero.jpg",
					"type":    "image",
				},
				CreatedAt: time.Now().Add(-24 * time.Hour),
			},
			{
				ID:             "2",
				Name:           "logo.svg",
				URL:            baseURL + "/assets/logo.svg",
				Thumbnail:      baseURL + "/assets/logo.svg",
				Type:           "vector",
				MIMEType:       "image/svg+xml",
				Size:           2048,
				Status:         "ready",
				WorkflowStatus: "complete",
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
	if item.Type == "" {
		if typed, ok := item.Metadata["type"].(string); ok {
			item.Type = typed
		}
	}
	if item.Status == "" {
		item.Status = "ready"
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
