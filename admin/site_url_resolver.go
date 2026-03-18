package admin

import (
	"net/url"
	"strings"
)

// SiteURLResolver resolves canonical site paths and URLs used by delivery/search integrations.
type SiteURLResolver interface {
	ContentPath(contentType, slug string) string
	ContentURL(contentType, slug string) string
	NormalizePath(path, fallback string) string
}

// CanonicalURLResolver resolves canonical paths and URLs with an optional base URL prefix.
type CanonicalURLResolver struct {
	BaseURL string `json:"base_url"`
}

// ContentPath returns a canonical content path for (type, slug).
func (r CanonicalURLResolver) ContentPath(contentType, slug string) string {
	return CanonicalContentPath(contentType, slug)
}

// ContentURL returns a canonical absolute/relative URL for (type, slug).
func (r CanonicalURLResolver) ContentURL(contentType, slug string) string {
	return CanonicalContentURL(r.BaseURL, contentType, slug)
}

// NormalizePath returns a normalized path with leading slash and fallback support.
func (r CanonicalURLResolver) NormalizePath(path, fallback string) string {
	return CanonicalPath(path, fallback)
}

// CanonicalPath normalizes path with leading slash and fallback slug support.
func CanonicalPath(path, fallback string) string {
	path = strings.TrimSpace(path)
	if path == "" {
		path = strings.TrimSpace(fallback)
	}
	if path == "" {
		return ""
	}
	if strings.HasPrefix(path, "http://") || strings.HasPrefix(path, "https://") {
		return path
	}
	trimmed := strings.Trim(path, " ")
	if trimmed == "" {
		return ""
	}
	if !strings.HasPrefix(trimmed, "/") {
		trimmed = "/" + strings.TrimLeft(trimmed, "/")
	}
	return trimmed
}

// CanonicalContentPath builds a canonical content path from content type and slug.
func CanonicalContentPath(contentType, slug string) string {
	slug = strings.TrimSpace(slug)
	if slug == "" {
		return ""
	}
	slug = strings.Trim(slug, "/")
	if slug == "" {
		return ""
	}
	contentType = strings.Trim(strings.TrimSpace(contentType), "/")
	if contentType == "" {
		return "/" + slug
	}
	return "/" + contentType + "/" + slug
}

// CanonicalContentURL builds a canonical URL from base URL and content path.
func CanonicalContentURL(baseURL, contentType, slug string) string {
	path := CanonicalContentPath(contentType, slug)
	if path == "" {
		return ""
	}
	baseURL = strings.TrimSpace(baseURL)
	if baseURL == "" {
		return path
	}
	parsed, err := url.Parse(baseURL)
	if err != nil {
		return path
	}
	if parsed.Scheme == "" || parsed.Host == "" {
		return path
	}
	parsed.Path = strings.TrimSuffix(parsed.Path, "/") + path
	return parsed.String()
}

// ExtractContentPath resolves canonical content path from data/metadata maps with fallback support.
func ExtractContentPath(data, metadata map[string]any, fallback string) string {
	if path := contentPathFromMap(data); path != "" {
		return CanonicalPath(path, "")
	}
	if path := contentPathFromMap(metadata); path != "" {
		return CanonicalPath(path, "")
	}
	return CanonicalPath("", fallback)
}

// ResolveContentPath resolves canonical content path from CMSContent fields.
func ResolveContentPath(content CMSContent, fallback string) string {
	if strings.TrimSpace(fallback) == "" {
		fallback = strings.TrimSpace(content.Slug)
	}
	return ExtractContentPath(content.Data, content.Metadata, fallback)
}

func contentPathFromMap(values map[string]any) string {
	if len(values) == 0 {
		return ""
	}
	if raw, ok := values["path"]; ok {
		if path := strings.TrimSpace(contentPathValue(raw)); path != "" {
			return path
		}
	}
	return ""
}

func contentPathValue(raw any) string {
	switch typed := raw.(type) {
	case string:
		return typed
	case []byte:
		return string(typed)
	default:
		return ""
	}
}
