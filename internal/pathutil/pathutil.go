package pathutil

import "strings"

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
	return strings.HasPrefix(path, "http://") ||
		strings.HasPrefix(path, "https://") ||
		strings.HasPrefix(path, "//")
}
