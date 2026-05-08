package admin

import (
	"context"
	"fmt"
	"io"
	"maps"
	"net/http"
	"strings"
	"sync"
	"time"

	urlkit "github.com/goliatone/go-urlkit"
)

// MediaDeliveryIntent identifies the browser delivery purpose.
type MediaDeliveryIntent string

const (
	MediaDeliveryIntentAsset    MediaDeliveryIntent = "asset"
	MediaDeliveryIntentStream   MediaDeliveryIntent = "stream"
	MediaDeliveryIntentPoster   MediaDeliveryIntent = "poster"
	MediaDeliveryIntentDownload MediaDeliveryIntent = "download"
)

// MediaDeliveryState describes delivery readiness without exposing provider details.
type MediaDeliveryState string

const (
	MediaDeliveryStateReady              MediaDeliveryState = "ready"
	MediaDeliveryStateProcessing         MediaDeliveryState = "processing"
	MediaDeliveryStateExternalSourceOnly MediaDeliveryState = "external_source_only"
	MediaDeliveryStateNeedsImport        MediaDeliveryState = "needs_import"
	MediaDeliveryStateNotPlayable        MediaDeliveryState = "not_playable"
	MediaDeliveryStateUnavailable        MediaDeliveryState = "unavailable"
	MediaDeliveryStateFailed             MediaDeliveryState = "failed"
)

// MediaDeliveryCapability describes delivery behavior available for an item/provider.
type MediaDeliveryCapability string

const (
	MediaDeliveryCapabilityStream       MediaDeliveryCapability = "stream"
	MediaDeliveryCapabilityDownload     MediaDeliveryCapability = "download"
	MediaDeliveryCapabilityPoster       MediaDeliveryCapability = "poster"
	MediaDeliveryCapabilityRedirect     MediaDeliveryCapability = "redirect"
	MediaDeliveryCapabilityProxy        MediaDeliveryCapability = "proxy"
	MediaDeliveryCapabilityImport       MediaDeliveryCapability = "import"
	MediaDeliveryCapabilityRange        MediaDeliveryCapability = "range"
	MediaDeliveryCapabilityAuthRequired MediaDeliveryCapability = "auth_required"
)

// MediaDeliveryMode describes how a delivery adapter satisfied a request.
type MediaDeliveryMode string

const (
	MediaDeliveryModeRedirect    MediaDeliveryMode = "redirect"
	MediaDeliveryModeProxy       MediaDeliveryMode = "proxy"
	MediaDeliveryModeImported    MediaDeliveryMode = "imported"
	MediaDeliveryModeUnavailable MediaDeliveryMode = "unavailable"
)

// MediaDeliveryInfo is safe delivery metadata for normal media payloads.
type MediaDeliveryInfo struct {
	State        MediaDeliveryState        `json:"state,omitempty"`
	Reason       string                    `json:"reason,omitempty"`
	Capabilities []MediaDeliveryCapability `json:"capabilities,omitempty"`
}

// MediaDeliveryRequest is passed to delivery adapters.
type MediaDeliveryRequest struct {
	Item               MediaItem                       `json:"item"`
	Reference          MediaDeliveryReference          `json:"reference"`
	Intent             MediaDeliveryIntent             `json:"intent"`
	Request            *http.Request                   `json:"-"`
	CredentialResolver MediaDeliveryCredentialResolver `json:"-"`
}

// ResolveCredential asks the host-owned resolver for provider credentials.
func (req MediaDeliveryRequest) ResolveCredential(ctx context.Context, scopes ...string) (MediaDeliveryCredential, error) {
	if req.CredentialResolver == nil {
		return MediaDeliveryCredential{}, nil
	}
	return req.CredentialResolver.ResolveMediaDeliveryCredential(ctx, MediaDeliveryCredentialRequest{
		Provider:  strings.TrimSpace(req.Reference.Provider),
		MediaID:   strings.TrimSpace(req.Reference.ID),
		Intent:    req.Intent,
		Reference: req.Reference,
		Scopes:    compactMediaDeliveryStrings(scopes...),
	})
}

// MediaDeliveryReference is internal provider/provenance data used by adapters.
type MediaDeliveryReference struct {
	ID         string         `json:"id,omitempty"`
	Name       string         `json:"name,omitempty"`
	Provider   string         `json:"provider,omitempty"`
	SourceURL  string         `json:"source_url,omitempty"`
	ExternalID string         `json:"external_id,omitempty"`
	StorageKey string         `json:"storage_key,omitempty"`
	PosterKey  string         `json:"poster_key,omitempty"`
	MIMEType   string         `json:"mime_type,omitempty"`
	Size       int64          `json:"size,omitempty"`
	Metadata   map[string]any `json:"metadata,omitempty"`
}

// MediaDeliveryReferenceProjector converts media items into internal delivery references.
type MediaDeliveryReferenceProjector interface {
	ProjectMediaDeliveryReference(context.Context, MediaItem) (MediaDeliveryReference, error)
}

// MediaDeliveryReferenceProjectorFunc adapts a function to MediaDeliveryReferenceProjector.
type MediaDeliveryReferenceProjectorFunc func(context.Context, MediaItem) (MediaDeliveryReference, error)

func (f MediaDeliveryReferenceProjectorFunc) ProjectMediaDeliveryReference(ctx context.Context, item MediaItem) (MediaDeliveryReference, error) {
	if f == nil {
		return DefaultMediaDeliveryReferenceProjector{}.ProjectMediaDeliveryReference(ctx, item)
	}
	return f(ctx, item)
}

// DefaultMediaDeliveryReferenceProjector reads common provenance fields from item metadata.
type DefaultMediaDeliveryReferenceProjector struct{}

func (DefaultMediaDeliveryReferenceProjector) ProjectMediaDeliveryReference(_ context.Context, item MediaItem) (MediaDeliveryReference, error) {
	metadata := cloneMediaDeliveryMetadata(item.Metadata)
	return MediaDeliveryReference{
		ID:         strings.TrimSpace(item.ID),
		Name:       strings.TrimSpace(item.Name),
		Provider:   mediaMetadataString(metadata, "provider"),
		SourceURL:  mediaMetadataString(metadata, "source_url"),
		ExternalID: mediaMetadataString(metadata, "external_id"),
		StorageKey: mediaMetadataString(metadata, "storage_key"),
		PosterKey:  mediaMetadataString(metadata, "poster_key"),
		MIMEType:   strings.TrimSpace(item.MIMEType),
		Size:       item.Size,
		Metadata:   metadata,
	}, nil
}

// MediaDeliveryCredentialRequest asks a host credential resolver for provider access.
type MediaDeliveryCredentialRequest struct {
	Provider  string                 `json:"provider,omitempty"`
	MediaID   string                 `json:"media_id,omitempty"`
	Intent    MediaDeliveryIntent    `json:"intent,omitempty"`
	Reference MediaDeliveryReference `json:"reference"`
	Scopes    []string               `json:"scopes,omitempty"`
}

// MediaDeliveryCredential carries host-resolved provider credentials.
type MediaDeliveryCredential struct {
	AccessToken string            `json:"access_token,omitempty"`
	TokenType   string            `json:"token_type,omitempty"`
	Headers     map[string]string `json:"headers,omitempty"`
	ExpiresAt   *time.Time        `json:"expires_at,omitempty"`
}

// MediaDeliveryCredentialResolver keeps OAuth/token ownership outside the media module.
type MediaDeliveryCredentialResolver interface {
	ResolveMediaDeliveryCredential(context.Context, MediaDeliveryCredentialRequest) (MediaDeliveryCredential, error)
}

// MediaDeliveryCredentialResolverFunc adapts a function to MediaDeliveryCredentialResolver.
type MediaDeliveryCredentialResolverFunc func(context.Context, MediaDeliveryCredentialRequest) (MediaDeliveryCredential, error)

func (f MediaDeliveryCredentialResolverFunc) ResolveMediaDeliveryCredential(ctx context.Context, req MediaDeliveryCredentialRequest) (MediaDeliveryCredential, error) {
	if f == nil {
		return MediaDeliveryCredential{}, nil
	}
	return f(ctx, req)
}

// MediaDeliveryResponse is returned by delivery adapters.
type MediaDeliveryResponse struct {
	Mode        MediaDeliveryMode         `json:"mode"`
	Redirect    *MediaDeliveryRedirect    `json:"redirect,omitempty"`
	Proxy       *MediaDeliveryProxy       `json:"proxy,omitempty"`
	Imported    *MediaDeliveryImported    `json:"imported,omitempty"`
	Unavailable *MediaDeliveryUnavailable `json:"unavailable,omitempty"`
}

// MediaDeliveryRedirect describes redirect-mode delivery.
type MediaDeliveryRedirect struct {
	URL       string      `json:"url"`
	Status    int         `json:"status,omitempty"`
	Headers   http.Header `json:"-"`
	Cache     string      `json:"cache,omitempty"`
	ExpiresAt *time.Time  `json:"expires_at,omitempty"`
}

// MediaDeliveryProxy describes stream/proxy-mode delivery.
type MediaDeliveryProxy struct {
	Reader        io.ReadCloser `json:"-"`
	ContentType   string        `json:"content_type,omitempty"`
	ContentLength int64         `json:"content_length,omitempty"`
	FileName      string        `json:"file_name,omitempty"`
	ModTime       time.Time     `json:"mod_time"`
	Range         bool          `json:"range,omitempty"`
	Headers       http.Header   `json:"-"`
}

// MediaDeliveryImported describes app-owned imported/local delivery.
type MediaDeliveryImported struct {
	Reader        io.ReadSeeker `json:"-"`
	ContentType   string        `json:"content_type,omitempty"`
	ContentLength int64         `json:"content_length,omitempty"`
	FileName      string        `json:"file_name,omitempty"`
	ModTime       time.Time     `json:"mod_time"`
	Headers       http.Header   `json:"-"`
}

// MediaDeliveryUnavailable describes a typed unavailable delivery outcome.
type MediaDeliveryUnavailable struct {
	State  MediaDeliveryState `json:"state,omitempty"`
	Reason string             `json:"reason,omitempty"`
	Code   int                `json:"code,omitempty"`
}

// MediaDeliveryAdapter resolves provider-specific delivery behavior.
type MediaDeliveryAdapter interface {
	ResolveMediaDelivery(context.Context, MediaDeliveryRequest) (MediaDeliveryResponse, error)
}

// MediaDeliveryRegistry stores provider-specific delivery adapters.
type MediaDeliveryRegistry struct {
	mu       sync.RWMutex
	adapters map[string]MediaDeliveryAdapter
}

// NewMediaDeliveryRegistry constructs an empty delivery adapter registry.
func NewMediaDeliveryRegistry() *MediaDeliveryRegistry {
	return &MediaDeliveryRegistry{adapters: map[string]MediaDeliveryAdapter{}}
}

func (r *MediaDeliveryRegistry) Register(provider string, adapter MediaDeliveryAdapter) error {
	provider = normalizeMediaDeliveryProvider(provider)
	if provider == "" {
		return validationDomainError("media delivery provider required", map[string]any{
			"component": "media_delivery",
			"field":     "provider",
		})
	}
	if adapter == nil {
		return validationDomainError("media delivery adapter required", map[string]any{
			"component": "media_delivery",
			"field":     "adapter",
		})
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	if r.adapters == nil {
		r.adapters = map[string]MediaDeliveryAdapter{}
	}
	r.adapters[provider] = adapter
	return nil
}

func (r *MediaDeliveryRegistry) Adapter(provider string) (MediaDeliveryAdapter, bool) {
	if r == nil {
		return nil, false
	}
	provider = normalizeMediaDeliveryProvider(provider)
	r.mu.RLock()
	defer r.mu.RUnlock()
	adapter, ok := r.adapters[provider]
	return adapter, ok && adapter != nil
}

func (r *MediaDeliveryRegistry) Resolve(ctx context.Context, req MediaDeliveryRequest) (MediaDeliveryResponse, error) {
	provider := req.Reference.Provider
	adapter, ok := r.Adapter(provider)
	if !ok {
		return MediaDeliveryResponse{
				Mode: MediaDeliveryModeUnavailable,
				Unavailable: &MediaDeliveryUnavailable{
					State:  MediaDeliveryStateUnavailable,
					Reason: "media delivery adapter unavailable",
					Code:   http.StatusServiceUnavailable,
				},
			}, MediaDeliveryUnavailableError{
				State:    MediaDeliveryStateUnavailable,
				Reason:   "media delivery adapter unavailable",
				Code:     http.StatusServiceUnavailable,
				Provider: provider,
			}
	}
	return adapter.ResolveMediaDelivery(ctx, req)
}

// MediaDeliveryUnavailableError is returned for typed unavailable outcomes.
type MediaDeliveryUnavailableError struct {
	State    MediaDeliveryState `json:"state,omitempty"`
	Reason   string             `json:"reason,omitempty"`
	Code     int                `json:"code,omitempty"`
	Provider string             `json:"provider,omitempty"`
}

func (e MediaDeliveryUnavailableError) Error() string {
	reason := strings.TrimSpace(e.Reason)
	if reason == "" {
		reason = "media delivery unavailable"
	}
	if provider := strings.TrimSpace(e.Provider); provider != "" {
		return fmt.Sprintf("%s: provider %s", reason, provider)
	}
	return reason
}

// MediaDeliveryURLs carries app-owned delivery URLs for a media item.
type MediaDeliveryURLs struct {
	AssetURL          string `json:"asset_url,omitempty"`
	StreamURL         string `json:"stream_url,omitempty"`
	PosterURL         string `json:"poster_url,omitempty"`
	DownloadURL       string `json:"download_url,omitempty"`
	PublicAssetURL    string `json:"public_asset_url,omitempty"`
	PublicStreamURL   string `json:"public_stream_url,omitempty"`
	PublicPosterURL   string `json:"public_poster_url,omitempty"`
	PublicDownloadURL string `json:"public_download_url,omitempty"`
}

type MediaDeliveryURLBuildOptions struct {
	IncludeAdmin  bool `json:"include_admin,omitempty"`
	IncludePublic bool `json:"include_public,omitempty"`
}

func BuildMediaDeliveryURLs(urls urlkit.Resolver, adminGroup, publicGroup, id string, includePublic bool) MediaDeliveryURLs {
	return BuildMediaDeliveryURLsWithOptions(urls, adminGroup, publicGroup, id, MediaDeliveryURLBuildOptions{
		IncludeAdmin:  true,
		IncludePublic: includePublic,
	})
}

func BuildMediaDeliveryURLsWithOptions(urls urlkit.Resolver, adminGroup, publicGroup, id string, opts MediaDeliveryURLBuildOptions) MediaDeliveryURLs {
	id = strings.TrimSpace(id)
	if urls == nil || id == "" {
		return MediaDeliveryURLs{}
	}
	params := map[string]any{"id": id}
	out := MediaDeliveryURLs{}
	if opts.IncludeAdmin {
		out.AssetURL = resolveURLWith(urls, adminGroup, mediaDeliveryAssetRouteKey, params, nil)
		out.StreamURL = resolveURLWith(urls, adminGroup, mediaDeliveryStreamRouteKey, params, nil)
		out.PosterURL = resolveURLWith(urls, adminGroup, mediaDeliveryPosterRouteKey, params, nil)
		out.DownloadURL = resolveURLWith(urls, adminGroup, mediaDeliveryDownloadRouteKey, params, nil)
	}
	if opts.IncludePublic && strings.TrimSpace(publicGroup) != "" {
		out.PublicAssetURL = resolveURLWith(urls, publicGroup, mediaDeliveryAssetRouteKey, params, nil)
		out.PublicStreamURL = resolveURLWith(urls, publicGroup, mediaDeliveryStreamRouteKey, params, nil)
		out.PublicPosterURL = resolveURLWith(urls, publicGroup, mediaDeliveryPosterRouteKey, params, nil)
		out.PublicDownloadURL = resolveURLWith(urls, publicGroup, mediaDeliveryDownloadRouteKey, params, nil)
	}
	return out
}

// MediaDeliveryConfig controls browser-consumable media delivery routes.
type MediaDeliveryConfig struct {
	AdminEnabled *bool                         `json:"admin_enabled,omitempty"`
	Public       MediaPublicDeliveryConfig     `json:"public"`
	Cache        MediaDeliveryCacheConfig      `json:"cache"`
	Redirect     MediaDeliveryRedirectConfig   `json:"redirect"`
	Proxy        MediaDeliveryProxyLimitConfig `json:"proxy"`
}

// MediaPublicDeliveryConfig controls opt-in public delivery route exposure.
type MediaPublicDeliveryConfig struct {
	Enabled            bool                             `json:"enabled,omitempty"`
	Authorizer         MediaPublicDeliveryAuthorizer    `json:"-"`
	TokenVerifier      MediaPublicDeliveryTokenVerifier `json:"-"`
	AllowAdapterPolicy bool                             `json:"allow_adapter_policy,omitempty"`
}

// MediaPublicDeliveryAuthorization carries public-route authorization context.
type MediaPublicDeliveryAuthorization struct {
	MediaID string        `json:"media_id,omitempty"`
	Intent  string        `json:"intent,omitempty"`
	Request *http.Request `json:"-"`
}

// MediaPublicDeliveryAuthorizer authorizes an unauthenticated public media delivery request.
type MediaPublicDeliveryAuthorizer func(context.Context, MediaPublicDeliveryAuthorization) error

// MediaPublicDeliveryTokenVerifier validates signed public delivery tokens.
type MediaPublicDeliveryTokenVerifier func(context.Context, string, MediaPublicDeliveryAuthorization) error

// MediaDeliveryCacheConfig carries default cache response policy for delivery handlers.
type MediaDeliveryCacheConfig struct {
	Control string        `json:"control,omitempty"`
	MaxAge  time.Duration `json:"max_age,omitempty"`
}

// MediaDeliveryRedirectConfig carries redirect-mode policy.
type MediaDeliveryRedirectConfig struct {
	Enabled         *bool    `json:"enabled,omitempty"`
	AllowedHosts    []string `json:"allowed_hosts,omitempty"`
	PreferTemporary bool     `json:"prefer_temporary,omitempty"`
}

// MediaDeliveryProxyLimitConfig carries proxy-mode limits.
type MediaDeliveryProxyLimitConfig struct {
	Timeout      time.Duration `json:"timeout,omitempty"`
	MaxBytes     int64         `json:"max_bytes,omitempty"`
	BufferBytes  int           `json:"buffer_bytes,omitempty"`
	AllowedHosts []string      `json:"allowed_hosts,omitempty"`
}

func normalizeMediaDeliveryConfig(cfg MediaDeliveryConfig) MediaDeliveryConfig {
	if cfg.AdminEnabled == nil {
		enabled := true
		cfg.AdminEnabled = &enabled
	}
	cfg.Public = normalizeMediaPublicDeliveryConfig(cfg.Public)
	cfg.Redirect.AllowedHosts = compactMediaDeliveryStrings(cfg.Redirect.AllowedHosts...)
	cfg.Proxy.AllowedHosts = compactMediaDeliveryStrings(cfg.Proxy.AllowedHosts...)
	return cfg
}

func normalizeMediaPublicDeliveryConfig(cfg MediaPublicDeliveryConfig) MediaPublicDeliveryConfig {
	return cfg
}

func (cfg MediaDeliveryConfig) adminRoutesEnabled() bool {
	cfg = normalizeMediaDeliveryConfig(cfg)
	return cfg.AdminEnabled == nil || *cfg.AdminEnabled
}

func (cfg MediaDeliveryConfig) publicRequested() bool {
	return cfg.Public.Enabled
}

func (cfg MediaDeliveryConfig) publicRoutesEnabled() bool {
	return cfg.Public.Enabled && cfg.Public.hasPolicy()
}

func (cfg MediaPublicDeliveryConfig) hasPolicy() bool {
	return cfg.Authorizer != nil || cfg.TokenVerifier != nil || cfg.AllowAdapterPolicy
}

func (cfg MediaDeliveryConfig) validate() error {
	if cfg.Public.Enabled && !cfg.Public.hasPolicy() {
		return validationDomainError("public media delivery requires an authorization policy", map[string]any{
			"component": "media_delivery",
			"field":     "media_delivery.public",
		})
	}
	return nil
}

func mediaPublicDeliveryTokenFromRequest(r *http.Request) string {
	if r == nil {
		return ""
	}
	if token := strings.TrimSpace(r.URL.Query().Get("token")); token != "" {
		return token
	}
	header := strings.TrimSpace(r.Header.Get("Authorization"))
	if strings.HasPrefix(strings.ToLower(header), "bearer ") {
		return strings.TrimSpace(header[7:])
	}
	return ""
}

func ParseMediaDeliveryIntent(raw string) (MediaDeliveryIntent, bool) {
	switch MediaDeliveryIntent(strings.ToLower(strings.TrimSpace(raw))) {
	case MediaDeliveryIntentAsset:
		return MediaDeliveryIntentAsset, true
	case MediaDeliveryIntentStream:
		return MediaDeliveryIntentStream, true
	case MediaDeliveryIntentPoster:
		return MediaDeliveryIntentPoster, true
	case MediaDeliveryIntentDownload:
		return MediaDeliveryIntentDownload, true
	default:
		return "", false
	}
}

func NormalizeMediaDeliveryState(raw string) MediaDeliveryState {
	switch MediaDeliveryState(strings.ToLower(strings.TrimSpace(strings.ReplaceAll(raw, "-", "_")))) {
	case MediaDeliveryStateReady:
		return MediaDeliveryStateReady
	case MediaDeliveryStateProcessing:
		return MediaDeliveryStateProcessing
	case MediaDeliveryStateExternalSourceOnly:
		return MediaDeliveryStateExternalSourceOnly
	case MediaDeliveryStateNeedsImport:
		return MediaDeliveryStateNeedsImport
	case MediaDeliveryStateNotPlayable:
		return MediaDeliveryStateNotPlayable
	case MediaDeliveryStateFailed:
		return MediaDeliveryStateFailed
	default:
		return MediaDeliveryStateUnavailable
	}
}

func NormalizeMediaDeliveryCapabilities(values ...MediaDeliveryCapability) []MediaDeliveryCapability {
	if len(values) == 0 {
		return nil
	}
	out := make([]MediaDeliveryCapability, 0, len(values))
	seen := map[MediaDeliveryCapability]struct{}{}
	for _, value := range values {
		normalized, ok := normalizeMediaDeliveryCapability(value)
		if !ok {
			continue
		}
		if _, exists := seen[normalized]; exists {
			continue
		}
		seen[normalized] = struct{}{}
		out = append(out, normalized)
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func normalizeMediaDeliveryCapability(value MediaDeliveryCapability) (MediaDeliveryCapability, bool) {
	switch MediaDeliveryCapability(strings.ToLower(strings.TrimSpace(strings.ReplaceAll(string(value), "-", "_")))) {
	case MediaDeliveryCapabilityStream:
		return MediaDeliveryCapabilityStream, true
	case MediaDeliveryCapabilityDownload:
		return MediaDeliveryCapabilityDownload, true
	case MediaDeliveryCapabilityPoster:
		return MediaDeliveryCapabilityPoster, true
	case MediaDeliveryCapabilityRedirect:
		return MediaDeliveryCapabilityRedirect, true
	case MediaDeliveryCapabilityProxy:
		return MediaDeliveryCapabilityProxy, true
	case MediaDeliveryCapabilityImport:
		return MediaDeliveryCapabilityImport, true
	case MediaDeliveryCapabilityRange:
		return MediaDeliveryCapabilityRange, true
	case MediaDeliveryCapabilityAuthRequired:
		return MediaDeliveryCapabilityAuthRequired, true
	default:
		return "", false
	}
}

func compactMediaDeliveryStrings(values ...string) []string {
	if len(values) == 0 {
		return nil
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
	if len(out) == 0 {
		return nil
	}
	return out
}

func cloneMediaDeliveryMetadata(in map[string]any) map[string]any {
	if len(in) == 0 {
		return nil
	}
	out := make(map[string]any, len(in))
	maps.Copy(out, in)
	return out
}

func mediaMetadataString(metadata map[string]any, key string) string {
	if len(metadata) == 0 {
		return ""
	}
	return strings.TrimSpace(toString(metadata[key]))
}

func normalizeMediaDeliveryProvider(provider string) string {
	return strings.ToLower(strings.TrimSpace(provider))
}
