package admin

import (
	"context"
	"encoding/json"
	"io"
	"maps"
	"net/url"
	"strings"
	"sync"
	"time"
)

// MediaItem describes a stored asset.
type MediaItem struct {
	ID             string            `json:"id"`
	Name           string            `json:"name"`
	URL            string            `json:"url"`
	AssetURL       string            `json:"asset_url,omitempty"`
	StreamURL      string            `json:"stream_url,omitempty"`
	PosterURL      string            `json:"poster_url,omitempty"`
	DownloadURL    string            `json:"download_url,omitempty"`
	Thumbnail      string            `json:"thumbnail,omitempty"`
	Type           string            `json:"type,omitempty"`
	MIMEType       string            `json:"mime_type,omitempty"`
	Size           int64             `json:"size,omitempty"`
	Status         string            `json:"status,omitempty"`
	WorkflowStatus string            `json:"workflow_status,omitempty"`
	WorkflowError  string            `json:"workflow_error,omitempty"`
	Delivery       MediaDeliveryInfo `json:"delivery,omitempty"`
	Metadata       map[string]any    `json:"metadata,omitempty"`
	CreatedAt      time.Time         `json:"created_at"`
}

func (item MediaItem) MarshalJSON() ([]byte, error) {
	type mediaItemJSON MediaItem
	out := mediaItemJSON(item)
	out.Metadata = sanitizeMediaItemMetadataForJSON(item.Metadata)
	return json.Marshal(out)
}

func sanitizeMediaItemMetadataForJSON(metadata map[string]any) map[string]any {
	if len(metadata) == 0 {
		return nil
	}
	out := make(map[string]any, len(metadata))
	maps.Copy(out, metadata)
	for _, key := range []string{
		"source_url",
		"signed_url",
		"provider_url",
		"external_url",
		"external_id",
		"storage_key",
		"poster_key",
	} {
		delete(out, key)
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func normalizeMediaDeliveryPayload(item MediaItem, urls MediaDeliveryURLs) MediaItem {
	if strings.TrimSpace(item.ID) == "" {
		return item
	}
	if strings.TrimSpace(urls.AssetURL) != "" {
		item.AssetURL = strings.TrimSpace(urls.AssetURL)
		item.URL = item.AssetURL
	}
	if strings.TrimSpace(urls.StreamURL) != "" {
		item.StreamURL = strings.TrimSpace(urls.StreamURL)
	}
	if strings.TrimSpace(urls.PosterURL) != "" {
		item.PosterURL = strings.TrimSpace(urls.PosterURL)
	}
	if strings.TrimSpace(urls.DownloadURL) != "" {
		item.DownloadURL = strings.TrimSpace(urls.DownloadURL)
	}
	if strings.TrimSpace(item.PosterURL) != "" {
		item.Thumbnail = item.PosterURL
	}
	item.Delivery = normalizeMediaItemDeliveryInfo(item)
	return item
}

func normalizeMediaItemDeliveryInfo(item MediaItem) MediaDeliveryInfo {
	state := NormalizeMediaDeliveryState(firstNonEmpty(
		mediaMetadataString(item.Metadata, "delivery_state"),
		item.WorkflowStatus,
		item.Status,
	))
	reason := firstNonEmpty(
		mediaMetadataString(item.Metadata, "delivery_reason"),
		item.WorkflowError,
	)
	capabilities := mediaDeliveryCapabilitiesForItem(item)
	return MediaDeliveryInfo{
		State:        state,
		Reason:       strings.TrimSpace(reason),
		Capabilities: capabilities,
	}
}

func mediaDeliveryCapabilitiesForItem(item MediaItem) []MediaDeliveryCapability {
	values := []MediaDeliveryCapability{
		MediaDeliveryCapabilityDownload,
	}
	if strings.HasPrefix(strings.ToLower(strings.TrimSpace(item.MIMEType)), "image/") || strings.EqualFold(strings.TrimSpace(item.Type), "image") {
		values = append(values, MediaDeliveryCapabilityPoster)
	}
	if mediaItemStreamCapable(item) {
		values = append(values, MediaDeliveryCapabilityStream, MediaDeliveryCapabilityRange)
	}
	if provider := mediaMetadataString(item.Metadata, "provider"); provider != "" {
		values = append(values, MediaDeliveryCapabilityAuthRequired)
	}
	return NormalizeMediaDeliveryCapabilities(values...)
}

func mediaItemStreamCapable(item MediaItem) bool {
	mimeType := strings.ToLower(strings.TrimSpace(item.MIMEType))
	if strings.HasPrefix(mimeType, "video/") || strings.HasPrefix(mimeType, "audio/") {
		return true
	}
	switch strings.ToLower(strings.TrimSpace(item.Type)) {
	case "video", "audio":
		return true
	default:
		return false
	}
}

func mediaItemIDFromDeliveryURL(raw string) string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return ""
	}
	parsed, err := url.Parse(raw)
	path := raw
	if err == nil && strings.TrimSpace(parsed.Path) != "" {
		path = parsed.Path
	}
	segments := strings.Split(strings.Trim(path, "/"), "/")
	for idx := 0; idx+2 < len(segments); idx++ {
		if segments[idx] != "delivery" {
			continue
		}
		if _, ok := ParseMediaDeliveryIntent(segments[idx+2]); !ok {
			continue
		}
		if id, err := url.PathUnescape(segments[idx+1]); err == nil {
			return strings.TrimSpace(id)
		}
		return strings.TrimSpace(segments[idx+1])
	}
	return ""
}

// MediaLibrary exposes the required query-aware media listing surface.
type MediaLibrary interface {
	MediaQueryProvider
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
	List    bool `json:"list"`
	Get     bool `json:"get"`
	Resolve bool `json:"resolve"`
	Upload  bool `json:"upload"`
	Presign bool `json:"presign"`
	Confirm bool `json:"confirm"`
	Update  bool `json:"update"`
	Delete  bool `json:"delete"`
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
// Implementations should return the full capability payload for the current
// request, not a partial patch.
type MediaCapabilityProvider interface {
	MediaCapabilities(ctx context.Context) (MediaCapabilities, error)
}

// MediaOperationCapabilityOverrides applies partial request-scoped operation
// overrides without requiring callers to populate a full capability payload.
type MediaOperationCapabilityOverrides struct {
	List    *bool `json:"list,omitempty"`
	Get     *bool `json:"get,omitempty"`
	Resolve *bool `json:"resolve,omitempty"`
	Upload  *bool `json:"upload,omitempty"`
	Presign *bool `json:"presign,omitempty"`
	Confirm *bool `json:"confirm,omitempty"`
	Update  *bool `json:"update,omitempty"`
	Delete  *bool `json:"delete,omitempty"`
}

// MediaUploadCapabilityOverrides applies partial request-scoped upload
// overrides without requiring callers to republish unchanged fields.
type MediaUploadCapabilityOverrides struct {
	DirectUpload      *bool     `json:"direct_upload,omitempty"`
	Presign           *bool     `json:"presign,omitempty"`
	MaxSize           *int64    `json:"max_size,omitempty"`
	AcceptedKinds     *[]string `json:"accepted_kinds,omitempty"`
	AcceptedMIMETypes *[]string `json:"accepted_mime_types,omitempty"`
}

// MediaPickerCapabilityOverrides applies partial request-scoped picker
// overrides without requiring callers to republish unchanged fields.
type MediaPickerCapabilityOverrides struct {
	ValueModes       *[]MediaValueMode `json:"value_modes,omitempty"`
	DefaultValueMode *MediaValueMode   `json:"default_value_mode,omitempty"`
}

// MediaCapabilityOverrides carries partial capability overrides. Use this when
// callers only need to tune a subset of the capability payload.
type MediaCapabilityOverrides struct {
	Operations MediaOperationCapabilityOverrides `json:"operations"`
	Upload     MediaUploadCapabilityOverrides    `json:"upload"`
	Picker     MediaPickerCapabilityOverrides    `json:"picker"`
}

// MediaCapabilityOverrideProvider exposes partial request-scoped capability
// overrides layered on top of the built-in supported capability set.
type MediaCapabilityOverrideProvider interface {
	MediaCapabilityOverrides(ctx context.Context) (MediaCapabilityOverrides, error)
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
	mu    sync.Mutex
	items []MediaItem
}

// NewInMemoryMediaLibrary seeds a few sample assets.
func NewInMemoryMediaLibrary(baseURL string) *InMemoryMediaLibrary {
	return &InMemoryMediaLibrary{
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

// QueryMedia returns items matching query filters.
func (m *InMemoryMediaLibrary) QueryMedia(ctx context.Context, query MediaQuery) (MediaPage, error) {
	_ = ctx
	m.mu.Lock()
	defer m.mu.Unlock()
	out := make([]MediaItem, len(m.items))
	copy(out, m.items)
	return mediaPageFromItems(out, query), nil
}

// GetMedia resolves an item by ID.
func (m *InMemoryMediaLibrary) GetMedia(ctx context.Context, id string) (MediaItem, error) {
	_ = ctx
	m.mu.Lock()
	defer m.mu.Unlock()
	id = strings.TrimSpace(id)
	for _, item := range m.items {
		if strings.TrimSpace(item.ID) == id {
			return item, nil
		}
	}
	return MediaItem{}, ErrNotFound
}

// ResolveMedia resolves an item from picker reference values.
func (m *InMemoryMediaLibrary) ResolveMedia(ctx context.Context, ref MediaReference) (MediaItem, error) {
	_ = ctx
	m.mu.Lock()
	defer m.mu.Unlock()
	id := strings.TrimSpace(ref.ID)
	url := strings.TrimSpace(ref.URL)
	name := strings.TrimSpace(ref.Name)
	for _, item := range m.items {
		if id != "" && strings.TrimSpace(item.ID) == id {
			return item, nil
		}
		if url != "" && strings.TrimSpace(item.URL) == url {
			return item, nil
		}
		if name != "" && strings.TrimSpace(item.Name) == name {
			return item, nil
		}
	}
	return MediaItem{}, ErrNotFound
}

func mediaItemCanUseAccessURLAsThumbnail(item MediaItem) bool {
	mediaType := strings.ToLower(strings.TrimSpace(item.Type))
	if mediaType == "" {
		if typed, ok := item.Metadata["type"].(string); ok {
			mediaType = strings.ToLower(strings.TrimSpace(typed))
		}
	}
	switch mediaType {
	case "image", "vector":
		return true
	}
	mimeType := strings.ToLower(strings.TrimSpace(item.MIMEType))
	return strings.HasPrefix(mimeType, "image/")
}

// DisabledMediaLibrary returns feature disabled errors.
type DisabledMediaLibrary struct{}

func (DisabledMediaLibrary) QueryMedia(ctx context.Context, query MediaQuery) (MediaPage, error) {
	_ = ctx
	_ = query
	return MediaPage{}, FeatureDisabledError{Feature: string(FeatureMedia)}
}
