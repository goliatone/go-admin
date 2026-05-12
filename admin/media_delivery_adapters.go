package admin

import (
	"context"
	"net/http"
	"net/url"
	"path/filepath"
	"strings"
)

// MediaRedirectDeliveryAdapter redirects to app-approved provider or CDN URLs.
type MediaRedirectDeliveryAdapter struct {
	AllowedHosts []string `json:"allowed_hosts,omitempty"`
	Status       int      `json:"status,omitempty"`
	Cache        string   `json:"cache,omitempty"`
}

func (a MediaRedirectDeliveryAdapter) ResolveMediaDelivery(_ context.Context, req MediaDeliveryRequest) (MediaDeliveryResponse, error) {
	target := firstNonEmpty(
		mediaReferenceMetadataString(req.Reference, "redirect_url"),
		mediaReferenceMetadataString(req.Reference, "public_url"),
		mediaReferenceMetadataString(req.Reference, "cdn_url"),
		req.Reference.SourceURL,
	)
	if !mediaRedirectURLAllowed(target, a.AllowedHosts) {
		return mediaDeliveryUnavailableResponse(MediaDeliveryStateUnavailable, "media redirect URL is not allowed", http.StatusForbidden), nil
	}
	status := a.Status
	if status < 300 || status > 399 {
		status = http.StatusFound
	}
	return MediaDeliveryResponse{
		Mode: MediaDeliveryModeRedirect,
		Redirect: &MediaDeliveryRedirect{
			URL:    strings.TrimSpace(target),
			Status: status,
			Cache:  strings.TrimSpace(a.Cache),
		},
	}, nil
}

// MediaLocalFileDeliveryAdapter serves files from configured local roots.
type MediaLocalFileDeliveryAdapter struct {
	Roots []string `json:"roots,omitempty"`
}

func (a MediaLocalFileDeliveryAdapter) ResolveMediaDelivery(_ context.Context, req MediaDeliveryRequest) (MediaDeliveryResponse, error) {
	path := mediaLocalDeliveryPath(req.Reference, req.Intent)
	if path == "" {
		return mediaDeliveryUnavailableResponse(MediaDeliveryStateUnavailable, "local media path unavailable", http.StatusServiceUnavailable), nil
	}
	if !filepath.IsAbs(path) && len(a.Roots) > 0 {
		path = filepath.Join(a.Roots[0], path)
	}
	imported, err := NewLocalMediaDeliveryImported(path, a.Roots, req.Reference.MIMEType)
	if err != nil {
		return mediaDeliveryUnavailableResponse(MediaDeliveryStateUnavailable, err.Error(), http.StatusForbidden), nil
	}
	return MediaDeliveryResponse{
		Mode:     MediaDeliveryModeImported,
		Imported: imported,
	}, nil
}

func mediaDeliveryUnavailableResponse(state MediaDeliveryState, reason string, code int) MediaDeliveryResponse {
	if code == 0 {
		code = http.StatusServiceUnavailable
	}
	return MediaDeliveryResponse{
		Mode: MediaDeliveryModeUnavailable,
		Unavailable: &MediaDeliveryUnavailable{
			State:  state,
			Reason: strings.TrimSpace(reason),
			Code:   code,
		},
	}
}

func mediaRedirectURLAllowed(raw string, allowedHosts []string) bool {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return false
	}
	parsed, err := url.Parse(raw)
	if err != nil {
		return false
	}
	if parsed.IsAbs() {
		if parsed.Scheme != "http" && parsed.Scheme != "https" {
			return false
		}
		host := strings.ToLower(strings.TrimSpace(parsed.Hostname()))
		for _, allowed := range allowedHosts {
			allowed = strings.ToLower(strings.TrimSpace(allowed))
			if allowed == "*" || allowed == host {
				return true
			}
		}
		return false
	}
	return strings.HasPrefix(raw, "/") && !strings.HasPrefix(raw, "//")
}

func mediaLocalDeliveryPath(ref MediaDeliveryReference, intent MediaDeliveryIntent) string {
	switch intent {
	case MediaDeliveryIntentPoster:
		if value := firstNonEmpty(
			mediaReferenceMetadataString(ref, "local_poster_path"),
			mediaReferenceMetadataString(ref, "poster_path"),
			ref.PosterKey,
		); value != "" {
			return value
		}
		if !mediaDeliveryReferenceCanUseAssetAsPoster(ref) {
			return ""
		}
	case MediaDeliveryIntentStream:
		if value := firstNonEmpty(
			mediaReferenceMetadataString(ref, "local_stream_path"),
			mediaReferenceMetadataString(ref, "stream_path"),
		); value != "" {
			return value
		}
	case MediaDeliveryIntentDownload:
		if value := firstNonEmpty(
			mediaReferenceMetadataString(ref, "local_download_path"),
			mediaReferenceMetadataString(ref, "download_path"),
		); value != "" {
			return value
		}
	}
	return firstNonEmpty(
		mediaReferenceMetadataString(ref, "local_path"),
		mediaReferenceMetadataString(ref, "path"),
		mediaReferenceMetadataString(ref, "asset_path"),
		ref.StorageKey,
	)
}

func mediaDeliveryReferenceCanUseAssetAsPoster(ref MediaDeliveryReference) bool {
	mimeType := strings.ToLower(strings.TrimSpace(ref.MIMEType))
	if strings.HasPrefix(mimeType, "image/") {
		return true
	}
	mediaType := strings.ToLower(strings.TrimSpace(mediaReferenceMetadataString(ref, "type")))
	if mediaType == "image" || mediaType == "vector" {
		return true
	}
	return mediaItemLooksLikeImagePreviewURL(firstNonEmpty(
		ref.SourceURL,
		mediaReferenceMetadataString(ref, "asset_url"),
		mediaReferenceMetadataString(ref, "local_path"),
		mediaReferenceMetadataString(ref, "path"),
		mediaReferenceMetadataString(ref, "asset_path"),
		ref.StorageKey,
	))
}

func mediaReferenceMetadataString(ref MediaDeliveryReference, key string) string {
	return mediaMetadataString(ref.Metadata, key)
}
