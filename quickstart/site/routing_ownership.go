package site

import (
	"strings"

	"github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/admin/routing"
	router "github.com/goliatone/go-router"
)

const siteRoutingOwner = "host:public_site"

// RegisterSiteRoutingOwnership records public-site exact routes and fallback
// ownership in the shared routing planner without mutating the runtime router.
func RegisterSiteRoutingOwnership(
	adm *admin.Admin,
	cfg admin.Config,
	siteCfg SiteConfig,
	opts ...SiteOption,
) error {
	flow := resolveSiteRegisterFlow[struct{}](adm, cfg, siteCfg, opts)
	return flow.registerRoutingOwnership(adm)
}

func (f siteRegisterFlow[T]) registerRoutingOwnership(adm *admin.Admin) error {
	if adm == nil || adm.RoutingPlanner() == nil {
		return nil
	}

	planner := adm.RoutingPlanner()
	if entries := f.routingManifestEntries(); len(entries) > 0 {
		if err := planner.RegisterHostRoutes(entries...); err != nil {
			adm.RefreshRoutingReport()
			return err
		}
	}
	if fallback, ok := f.routingFallbackEntry(); ok {
		if err := planner.RegisterFallback(fallback); err != nil {
			adm.RefreshRoutingReport()
			return err
		}
	}
	adm.RefreshRoutingReport()
	return nil
}

func (f siteRegisterFlow[T]) routingManifestEntries() []routing.ManifestEntry {
	entries := make([]routing.ManifestEntry, 0, 4)
	if !f.resolved.Features.EnableSearch || f.options.searchProvider == nil {
		return nil
	}

	searchPath := prefixedRoutePath(f.resolved.BasePath, f.resolved.Search.Route)
	searchTopicPath := strings.TrimSuffix(searchPath, "/") + "/topics/:topic_slug"
	searchAPIPath := prefixedRoutePath("", f.resolved.Search.Endpoint)
	suggestAPIPath := prefixedRoutePath("", searchSuggestRoute(f.resolved.Search.Endpoint))

	entries = append(entries,
		routing.ManifestEntry{
			Owner:     siteRoutingOwner,
			Surface:   routing.SurfacePublicSite,
			Domain:    routing.RouteDomainPublicSite,
			RouteKey:  "site.search.page",
			RouteName: "site.search.page",
			Method:    "GET",
			Path:      searchPath,
		},
		routing.ManifestEntry{
			Owner:     siteRoutingOwner,
			Surface:   routing.SurfacePublicSite,
			Domain:    routing.RouteDomainPublicSite,
			RouteKey:  "site.search.topic",
			RouteName: "site.search.topic",
			Method:    "GET",
			Path:      searchTopicPath,
		},
		routing.ManifestEntry{
			Owner:     siteRoutingOwner,
			Surface:   routing.SurfacePublicAPI,
			Domain:    routing.RouteDomainPublicAPI,
			RouteKey:  "site.search.api",
			RouteName: "site.search.api",
			Method:    "GET",
			Path:      searchAPIPath,
		},
		routing.ManifestEntry{
			Owner:     siteRoutingOwner,
			Surface:   routing.SurfacePublicAPI,
			Domain:    routing.RouteDomainPublicAPI,
			RouteKey:  "site.search.suggest",
			RouteName: "site.search.suggest",
			Method:    "GET",
			Path:      suggestAPIPath,
		},
	)
	return entries
}

func (f siteRegisterFlow[T]) routingFallbackEntry() (routing.FallbackEntry, bool) {
	policy := f.options.fallbackPolicy
	if policy.Mode == SiteFallbackModeDisabled {
		return routing.FallbackEntry{}, false
	}
	return routing.FallbackEntry{
		Owner:               siteRoutingOwner,
		Surface:             routing.SurfacePublicSite,
		Domain:              routing.RouteDomainPublicSite,
		BasePath:            prefixedRoutePath(f.resolved.BasePath, "/"),
		Mode:                string(policy.Mode),
		AllowRoot:           policy.AllowRoot,
		AllowedMethods:      cloneStrings(policyMethodStrings(policy.AllowedMethods)),
		AllowedExactPaths:   prefixedFallbackPaths(f.resolved.BasePath, policy.AllowedExactPaths),
		AllowedPathPrefixes: prefixedFallbackPaths(f.resolved.BasePath, policy.AllowedPathPrefixes),
		ReservedPrefixes:    append([]string{}, policy.ReservedPrefixes...),
	}, true
}

func prefixedFallbackPaths(basePath string, values []string) []string {
	if len(values) == 0 {
		return nil
	}
	out := make([]string, 0, len(values))
	for _, value := range values {
		normalized := normalizePath(value)
		if normalized == "" || normalized == "/" {
			continue
		}
		out = append(out, prefixedRoutePath(basePath, normalized))
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func policyMethodStrings(values []router.HTTPMethod) []string {
	if len(values) == 0 {
		return nil
	}
	out := make([]string, 0, len(values))
	for _, value := range values {
		method := strings.ToUpper(strings.TrimSpace(string(value)))
		if method == "" {
			continue
		}
		out = append(out, method)
	}
	if len(out) == 0 {
		return nil
	}
	return out
}
