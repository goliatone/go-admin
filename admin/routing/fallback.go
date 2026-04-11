package routing

import (
	"slices"
	"strings"
)

const (
	FallbackModeDisabled          = "disabled"
	FallbackModePublicContentOnly = "public_content_only"
	FallbackModeExplicitPathsOnly = "explicit_paths_only"
)

type FallbackEntry struct {
	Owner               string   `json:"owner"`
	Surface             string   `json:"surface"`
	Domain              string   `json:"domain,omitempty"`
	BasePath            string   `json:"base_path,omitempty"`
	Mode                string   `json:"mode"`
	AllowRoot           bool     `json:"allow_root"`
	AllowedMethods      []string `json:"allowed_methods,omitempty"`
	AllowedExactPaths   []string `json:"allowed_exact_paths,omitempty"`
	AllowedPathPrefixes []string `json:"allowed_path_prefixes,omitempty"`
	ReservedPrefixes    []string `json:"reserved_prefixes,omitempty"`
}

func NormalizeFallbackEntry(entry FallbackEntry) FallbackEntry {
	entry.Owner = strings.TrimSpace(entry.Owner)
	entry.Surface = NormalizeRouteSurface(entry.Surface)
	entry.Domain = NormalizeRouteDomain(entry.Domain)
	if entry.Surface == "" {
		entry.Surface = DefaultRouteSurfaceForDomain(entry.Domain)
	}
	if entry.Domain == "" {
		entry.Domain = DefaultRouteDomainForSurface(entry.Surface)
	}
	entry.BasePath = normalizeFallbackBasePath(entry.BasePath)
	entry.Mode = normalizeFallbackMode(entry.Mode)
	entry.AllowedMethods = normalizeFallbackMethods(entry.AllowedMethods)
	entry.AllowedExactPaths = normalizeFallbackPaths(entry.AllowedExactPaths)
	entry.AllowedPathPrefixes = normalizeFallbackPaths(entry.AllowedPathPrefixes)
	entry.ReservedPrefixes = normalizeFallbackPaths(entry.ReservedPrefixes)
	if len(entry.AllowedMethods) == 0 {
		entry.AllowedMethods = []string{"GET", "HEAD"}
	}
	return entry
}

func normalizeFallbackMode(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "", FallbackModePublicContentOnly:
		return FallbackModePublicContentOnly
	case FallbackModeDisabled:
		return FallbackModeDisabled
	case FallbackModeExplicitPathsOnly:
		return FallbackModeExplicitPathsOnly
	default:
		return strings.ToLower(strings.TrimSpace(value))
	}
}

func normalizeFallbackBasePath(value string) string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" || trimmed == "/" {
		return ""
	}
	return normalizeAbsolutePath(trimmed)
}

func normalizeFallbackMethods(values []string) []string {
	if len(values) == 0 {
		return nil
	}

	seen := map[string]struct{}{}
	out := make([]string, 0, len(values))
	for _, value := range values {
		method := strings.ToUpper(strings.TrimSpace(value))
		if method == "" {
			continue
		}
		if _, ok := seen[method]; ok {
			continue
		}
		seen[method] = struct{}{}
		out = append(out, method)
	}

	slices.SortFunc(out, func(a, b string) int {
		left := fallbackMethodOrder(a)
		right := fallbackMethodOrder(b)
		if left != right {
			return left - right
		}
		return strings.Compare(a, b)
	})
	if len(out) == 0 {
		return nil
	}
	return out
}

func fallbackMethodOrder(method string) int {
	switch method {
	case "GET":
		return 0
	case "HEAD":
		return 1
	default:
		return 2
	}
}

func normalizeFallbackPaths(values []string) []string {
	if len(values) == 0 {
		return nil
	}

	seen := map[string]struct{}{}
	out := make([]string, 0, len(values))
	for _, value := range values {
		path := normalizeFallbackPath(value)
		if path == "" {
			continue
		}
		if _, ok := seen[path]; ok {
			continue
		}
		seen[path] = struct{}{}
		out = append(out, path)
	}
	slices.Sort(out)
	if len(out) == 0 {
		return nil
	}
	return out
}

func normalizeFallbackPath(value string) string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return ""
	}
	if trimmed == "/" {
		return "/"
	}
	return normalizeAbsolutePath(trimmed)
}

func fallbackBaseRoot(entry FallbackEntry) string {
	entry = NormalizeFallbackEntry(entry)
	if entry.BasePath == "" {
		return "/"
	}
	return entry.BasePath
}

func fallbackScopeKey(entry FallbackEntry) string {
	entry = NormalizeFallbackEntry(entry)
	return entry.Surface + "|" + entry.Domain
}

func fallbackIdentityKey(entry FallbackEntry) string {
	entry = NormalizeFallbackEntry(entry)
	return entry.Owner + "|" + fallbackScopeKey(entry)
}

func fallbackAllowsMethod(entry FallbackEntry, method string) bool {
	entry = NormalizeFallbackEntry(entry)
	method = strings.ToUpper(strings.TrimSpace(method))
	if method == "" || len(entry.AllowedMethods) == 0 {
		return false
	}
	return slices.Contains(entry.AllowedMethods, method)
}

func fallbackReservesPath(entry FallbackEntry, requestPath string) bool {
	entry = NormalizeFallbackEntry(entry)
	requestPath = normalizeFallbackPath(requestPath)
	if requestPath == "" {
		return false
	}
	for _, prefix := range entry.ReservedPrefixes {
		if requestPath == prefix || strings.HasPrefix(requestPath, strings.TrimSuffix(prefix, "/")+"/") {
			return true
		}
	}
	return false
}

func fallbackClaimsPath(entry FallbackEntry, requestPath string) bool {
	entry = NormalizeFallbackEntry(entry)
	requestPath = normalizeFallbackPath(requestPath)
	if requestPath == "" || fallbackReservesPath(entry, requestPath) {
		return false
	}

	root := fallbackBaseRoot(entry)
	if root != "/" {
		if requestPath != root && !strings.HasPrefix(requestPath, root+"/") {
			return false
		}
	}

	switch entry.Mode {
	case FallbackModeDisabled:
		return false
	case FallbackModePublicContentOnly:
		if requestPath == root {
			return entry.AllowRoot
		}
		return true
	case FallbackModeExplicitPathsOnly:
		if requestPath == root {
			return entry.AllowRoot
		}
		if slices.Contains(entry.AllowedExactPaths, requestPath) {
			return true
		}
		for _, prefix := range entry.AllowedPathPrefixes {
			if requestPath == prefix || strings.HasPrefix(requestPath, strings.TrimSuffix(prefix, "/")+"/") {
				return true
			}
		}
		return false
	default:
		return false
	}
}

func sortFallbackEntries(entries []FallbackEntry) {
	slices.SortFunc(entries, func(a, b FallbackEntry) int {
		left := NormalizeFallbackEntry(a)
		right := NormalizeFallbackEntry(b)
		switch {
		case left.Surface != right.Surface:
			return strings.Compare(left.Surface, right.Surface)
		case left.Owner != right.Owner:
			return strings.Compare(left.Owner, right.Owner)
		default:
			return strings.Compare(left.Mode, right.Mode)
		}
	})
}
