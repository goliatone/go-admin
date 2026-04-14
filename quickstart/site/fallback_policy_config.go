package site

import (
	"path"
	"strings"

	"github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/admin/routing"
	sitereserved "github.com/goliatone/go-admin/quickstart/internal/sitereserved"
	staticprefixes "github.com/goliatone/go-admin/quickstart/internal/staticprefixes"
)

// SiteReservedPrefixesForAdminConfig returns the structural reserved prefixes
// that should be protected from site fallback for the provided admin config.
func SiteReservedPrefixesForAdminConfig(cfg admin.Config) []string {
	return SiteReservedPrefixesForAdminConfigWithStaticInput(cfg, staticprefixes.DefaultInput(cfg))
}

// SiteReservedPrefixesForAdminConfigWithStaticInput returns the structural
// reserved prefixes using the provided static mount input. Hosts that customize
// static asset route prefixes should derive both the static mounts and site
// fallback reservations from the same input.
func SiteReservedPrefixesForAdminConfigWithStaticInput(cfg admin.Config, input staticprefixes.Input) []string {
	return normalizeSiteFallbackPaths(sitereserved.ForAdminConfig(cfg, input))
}

// DefaultSiteSearchEndpointForAdminConfig derives the public site search API
// endpoint from the configured public API root.
func DefaultSiteSearchEndpointForAdminConfig(cfg admin.Config) string {
	roots := siteRoutingRootsFromAdminConfig(cfg)
	if roots.PublicAPIRoot == "" {
		return DefaultSearchEndpoint
	}
	return normalizePath(path.Join(roots.PublicAPIRoot, "site", "search"))
}

func siteRoutingRootsFromAdminConfig(cfg admin.Config) routing.RootsConfig {
	defaults := routing.DeriveDefaultRoots(routing.RootDerivationInput{
		BasePath: cfg.BasePath,
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
	})
	return routing.MergeRoots(defaults, routing.NormalizeRoots(cfg.Routing.Roots))
}

func sitePublicAPIPrefixFromAdminConfig(cfg admin.Config) string {
	publicPrefix := strings.TrimSpace(cfg.URLs.Public.APIPrefix)
	if publicPrefix == "" {
		publicPrefix = routing.DefaultPublicAPIPrefix
	}
	return routing.JoinAbsolutePath(cfg.URLs.Public.BasePath, publicPrefix)
}
