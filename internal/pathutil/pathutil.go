package pathutil

import (
	"net/url"
	"path"
	"strings"
)

// NormalizeBasePath trims and normalizes a base path into /segment form.
func NormalizeBasePath(basePath string) string {
	trimmed := strings.TrimSpace(basePath)
	if trimmed == "" {
		return ""
	}
	return "/" + strings.Trim(trimmed, "/")
}

// EnsureLeadingSlash normalizes whitespace and ensures the path starts with '/'.
func EnsureLeadingSlash(path string) string {
	trimmed := strings.TrimSpace(path)
	if trimmed == "" {
		return ""
	}
	if strings.HasPrefix(trimmed, "/") {
		return trimmed
	}
	return "/" + trimmed
}

// JoinBasePath joins a normalized base path and route path without duplicating slashes.
func JoinBasePath(basePath, routePath string) string {
	basePath = NormalizeBasePath(basePath)
	if basePath == "" || basePath == "/" {
		return EnsureLeadingSlash(routePath)
	}
	trimmed := strings.TrimPrefix(strings.TrimSpace(routePath), "/")
	if trimmed == "" {
		return basePath
	}
	return basePath + "/" + trimmed
}

// JoinResolvedPath appends a relative suffix to an already-resolved path or URL.
func JoinResolvedPath(basePath, suffix string) string {
	basePath = strings.TrimSpace(basePath)
	suffix = strings.TrimSpace(suffix)
	if IsAbsoluteURL(basePath) {
		return joinResolvedURLPath(basePath, suffix)
	}
	return joinResolvedRawPath(basePath, suffix)
}

func joinResolvedRawPath(basePath, suffix string) string {
	basePath = strings.TrimRight(strings.TrimSpace(basePath), "/")
	suffix = strings.Trim(strings.TrimSpace(suffix), "/")
	if basePath == "" {
		return EnsureLeadingSlash(suffix)
	}
	if suffix == "" {
		return basePath
	}
	if IsAbsoluteURL(basePath) {
		return basePath + "/" + suffix
	}
	return path.Join(basePath, suffix)
}

func joinResolvedURLPath(basePath, suffix string) string {
	parsedBase, err := url.Parse(basePath)
	if err != nil || parsedBase == nil {
		return joinResolvedRawPath(basePath, suffix)
	}

	joined := *parsedBase
	suffixPath := suffix
	if parsedSuffix, err := url.Parse(suffix); err == nil && parsedSuffix != nil && !parsedSuffix.IsAbs() && parsedSuffix.Host == "" {
		suffixPath = parsedSuffix.Path
		if parsedSuffix.RawQuery != "" || strings.Contains(suffix, "?") {
			joined.RawQuery = parsedSuffix.RawQuery
		}
		if parsedSuffix.Fragment != "" || strings.Contains(suffix, "#") {
			joined.Fragment = parsedSuffix.Fragment
		}
	}

	joined.Path = joinURLPath(parsedBase.Path, suffixPath)
	joined.RawPath = ""
	return joined.String()
}

func joinURLPath(basePath, suffix string) string {
	basePath = strings.TrimRight(strings.TrimSpace(basePath), "/")
	suffix = strings.Trim(strings.TrimSpace(suffix), "/")
	if basePath == "" {
		if suffix == "" {
			return ""
		}
		return "/" + suffix
	}
	if suffix == "" {
		return basePath
	}
	joined := path.Join(basePath, suffix)
	if strings.HasPrefix(joined, "/") {
		return joined
	}
	return "/" + joined
}

// PrefixBasePath prefixes a route path with the base path unless already prefixed.
func PrefixBasePath(basePath, routePath string) string {
	routePath = strings.TrimSpace(routePath)
	if routePath == "" {
		return ""
	}
	routePath = EnsureLeadingSlash(routePath)
	basePath = NormalizeBasePath(basePath)
	if basePath == "" || basePath == "/" {
		return routePath
	}
	if routePath == basePath || strings.HasPrefix(routePath, basePath+"/") {
		return routePath
	}
	return JoinBasePath(basePath, routePath)
}

// TrimTrailingSlash removes one trailing slash except for the root path.
func TrimTrailingSlash(path string) string {
	trimmed := strings.TrimSpace(path)
	if trimmed == "" || trimmed == "/" {
		return trimmed
	}
	return strings.TrimSuffix(trimmed, "/")
}

// IsAbsoluteURL reports whether the path is an absolute or scheme-relative URL.
func IsAbsoluteURL(path string) bool {
	trimmed := strings.TrimSpace(path)
	lower := strings.ToLower(trimmed)
	return strings.HasPrefix(lower, "http://") ||
		strings.HasPrefix(lower, "https://") ||
		strings.HasPrefix(trimmed, "//")
}
