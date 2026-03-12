package routing

import (
	"fmt"
	"path"
	"regexp"
	"slices"
	"strings"
)

const (
	DefaultAdminAPIPrefix   = "api"
	DefaultPublicAPIPrefix  = "api"
	DefaultPublicAPIVersion = "v1"
	SlugPattern             = "^[a-z][a-z0-9_-]{1,62}$"
)

var (
	slugPattern = regexp.MustCompile(SlugPattern)
	reservedSet = map[string]struct{}{
		"admin":  {},
		"api":    {},
		"public": {},
		"debug":  {},
		"health": {},
		"rpc":    {},
		"static": {},
		"assets": {},
	}
)

func DeriveDefaultRoots(input RootDerivationInput) RootsConfig {
	adminBase := input.URLs.Admin.BasePath
	if strings.TrimSpace(adminBase) == "" {
		adminBase = input.BasePath
	}

	adminPrefix := normalizePathSegment(input.URLs.Admin.APIPrefix)
	if adminPrefix == "" {
		adminPrefix = DefaultAdminAPIPrefix
	}

	publicPrefix := normalizePathSegment(input.URLs.Public.APIPrefix)
	if publicPrefix == "" {
		publicPrefix = DefaultPublicAPIPrefix
	}

	publicVersion := normalizePathSegment(input.URLs.Public.APIVersion)
	if publicVersion == "" {
		publicVersion = DefaultPublicAPIVersion
	}

	return RootsConfig{
		AdminRoot:     normalizeAbsolutePath(adminBase),
		APIRoot:       JoinAbsolutePath(adminBase, adminPrefix, input.URLs.Admin.APIVersion),
		PublicAPIRoot: JoinAbsolutePath(input.URLs.Public.BasePath, publicPrefix, publicVersion),
	}
}

func NormalizeRoots(cfg RootsConfig) RootsConfig {
	return RootsConfig{
		AdminRoot:     normalizeAbsolutePath(cfg.AdminRoot),
		APIRoot:       normalizeAbsolutePath(cfg.APIRoot),
		PublicAPIRoot: normalizeAbsolutePath(cfg.PublicAPIRoot),
	}
}

func NormalizeMountOverride(cfg ModuleMountOverride) ModuleMountOverride {
	return ModuleMountOverride{
		UIBase:        normalizeAbsolutePath(cfg.UIBase),
		APIBase:       normalizeAbsolutePath(cfg.APIBase),
		PublicAPIBase: normalizeAbsolutePath(cfg.PublicAPIBase),
	}
}

func NormalizeRelativePath(value string) string {
	return cleanPath(value, true)
}

func JoinAbsolutePath(base string, segments ...string) string {
	parts := make([]string, 0, len(segments)+1)
	if basePart := strings.Trim(normalizeAbsolutePath(base), "/"); basePart != "" {
		parts = append(parts, basePart)
	}

	for _, segment := range segments {
		segment = normalizePathSegment(segment)
		if segment != "" {
			parts = append(parts, segment)
		}
	}

	if len(parts) == 0 {
		return ""
	}

	return "/" + strings.Join(parts, "/")
}

func ValidateSlug(slug string) error {
	normalized := strings.TrimSpace(slug)
	switch {
	case normalized == "":
		return fmt.Errorf("slug is required")
	case !slugPattern.MatchString(normalized):
		return fmt.Errorf("slug %q does not match %s", normalized, SlugPattern)
	case IsReservedSlug(normalized):
		return fmt.Errorf("slug %q is reserved", normalized)
	default:
		return nil
	}
}

func IsReservedSlug(slug string) bool {
	_, ok := reservedSet[strings.TrimSpace(slug)]
	return ok
}

func ReservedSlugs() []string {
	slugs := make([]string, 0, len(reservedSet))
	for slug := range reservedSet {
		slugs = append(slugs, slug)
	}
	slices.Sort(slugs)
	return slugs
}

func NormalizeRouteNamePrefix(prefix, slug string) string {
	normalized := strings.TrimSpace(prefix)
	normalized = strings.Trim(normalized, ".")
	if normalized != "" {
		return normalized
	}
	return strings.Trim(strings.TrimSpace(slug), ".")
}

func RouteKeyOwnershipPrefix(slug string) string {
	slug = strings.Trim(strings.TrimSpace(slug), ".")
	if slug == "" {
		return ""
	}
	return slug + "."
}

func RouteNameOwnershipPrefix(prefix, slug string) string {
	normalized := NormalizeRouteNamePrefix(prefix, slug)
	if normalized == "" {
		return ""
	}
	return normalized + "."
}

func OwnsRouteKey(slug, routeKey string) bool {
	prefix := RouteKeyOwnershipPrefix(slug)
	return prefix != "" && strings.HasPrefix(strings.TrimSpace(routeKey), prefix)
}

func OwnsRouteName(prefix, slug, routeName string) bool {
	required := RouteNameOwnershipPrefix(prefix, slug)
	return required != "" && strings.HasPrefix(strings.TrimSpace(routeName), required)
}

func normalizeAbsolutePath(value string) string {
	normalized := cleanPath(value, false)
	if normalized == "/" {
		return ""
	}
	return normalized
}

func normalizePathSegment(value string) string {
	return strings.Trim(strings.TrimSpace(value), "/")
}

func cleanPath(value string, allowRoot bool) string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return ""
	}

	parts := strings.Trim(trimmed, "/")
	if parts == "" {
		if allowRoot {
			return "/"
		}
		return ""
	}

	cleaned := path.Clean("/" + parts)
	if cleaned == "." {
		if allowRoot {
			return "/"
		}
		return ""
	}

	return cleaned
}
