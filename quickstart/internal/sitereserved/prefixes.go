package sitereserved

import (
	"slices"
	"strings"

	"github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/admin/routing"
	staticprefixes "github.com/goliatone/go-admin/quickstart/internal/staticprefixes"
)

const (
	defaultReservedPrefixWellKnown = "/.well-known"
	defaultReservedPrefixStatic    = "/static"
	defaultReservedPrefixAssets    = "/assets"
)

// ForAdminConfig returns the structural prefixes that site fallback must
// reserve for the provided admin config and static mount input.
func ForAdminConfig(cfg admin.Config, input staticprefixes.Input) []string {
	roots := routingRootsFromAdminConfig(cfg)
	return normalizePaths(append([]string{
		roots.AdminRoot,
		roots.ProtectedAppRoot,
		roots.ProtectedAppAPIRoot,
		publicAPIPrefixFromAdminConfig(cfg),
		roots.PublicAPIRoot,
		defaultReservedPrefixWellKnown,
		defaultReservedPrefixStatic,
		defaultReservedPrefixAssets,
	}, staticprefixes.Resolve(input)...))
}

func routingRootsFromAdminConfig(cfg admin.Config) routing.RootsConfig {
	return routing.NormalizeConfig(cfg.Routing, routing.RootDerivationInput{
		BasePath:            cfg.BasePath,
		ProtectedAppEnabled: cfg.Routing.ProtectedAppEnabled,
		URLs: routing.URLConfig{
			Admin: routing.URLNamespaceConfig{
				BasePath:   cfg.URLs.Admin.BasePath,
				APIPrefix:  cfg.URLs.Admin.APIPrefix,
				APIVersion: cfg.URLs.Admin.APIVersion,
			},
			Public: routing.URLNamespaceConfig{
				BasePath:   cfg.URLs.Public.BasePath,
				APIPrefix:  cfg.URLs.Public.APIPrefix,
				APIVersion: cfg.URLs.Public.APIVersion,
			},
		},
	}).Roots
}

func publicAPIPrefixFromAdminConfig(cfg admin.Config) string {
	publicPrefix := strings.TrimSpace(cfg.URLs.Public.APIPrefix)
	if publicPrefix == "" {
		publicPrefix = routing.DefaultPublicAPIPrefix
	}
	return routing.JoinAbsolutePath(cfg.URLs.Public.BasePath, publicPrefix)
}

func normalizePaths(values []string) []string {
	if len(values) == 0 {
		return nil
	}
	seen := map[string]struct{}{}
	out := make([]string, 0, len(values))
	for _, value := range values {
		path := normalizePath(value)
		if path == "" {
			continue
		}
		if _, ok := seen[path]; ok {
			continue
		}
		seen[path] = struct{}{}
		out = append(out, path)
	}
	if len(out) == 0 {
		return nil
	}
	slices.Sort(out)
	return out
}

func normalizePath(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return ""
	}
	if value == "/" {
		return "/"
	}
	return routing.JoinAbsolutePath("", value)
}
