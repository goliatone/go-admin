package main

import (
	"fmt"
	"net/http"
	"net/url"
	"path"
	"strings"

	coreadmin "github.com/goliatone/go-admin/admin"
	adminrouting "github.com/goliatone/go-admin/admin/routing"
	"github.com/goliatone/go-admin/pkg/admin"
	router "github.com/goliatone/go-router"
)

const debugSessionsCompatibilityRouteKey = "debug_tools.api.sessions"

type debugCompatibilityRoute struct {
	alias    string
	routeKey string
}

// registerDebugCompatibilityRoutes installs redirects for common debug API
// guesses so the example remains usable even when callers target the wrong
// surface. Each alias is registered on the same host surface that would own it
// under the current routing roots.
func registerDebugCompatibilityRoutes[T any](adminAPI, publicAPI, publicSite router.Router[T], cfg coreadmin.Config, adm *admin.Admin, adminAPIBasePath string) error {
	if adm == nil || adm.URLs() == nil {
		return nil
	}

	routes := []debugCompatibilityRoute{
		{alias: "/api/sessions", routeKey: debugSessionsCompatibilityRouteKey},
		{alias: path.Join(adminAPIBasePath, "debug", "sessions"), routeKey: debugSessionsCompatibilityRouteKey},
	}

	seen := map[string]struct{}{}
	for _, route := range routes {
		alias := strings.TrimSpace(route.alias)
		if alias == "" {
			continue
		}
		if _, ok := seen[alias]; ok {
			continue
		}
		seen[alias] = struct{}{}

		target, err := adm.URLs().Resolve(adminrouting.DefaultUIGroupPath(), route.routeKey, nil, nil)
		if err != nil {
			return fmt.Errorf("resolve debug compatibility route %s: %w", route.routeKey, err)
		}
		target = strings.TrimSpace(target)
		if target == "" || target == alias {
			continue
		}
		switch resolveDebugCompatibilityRouteSurface(cfg, alias) {
		case adminrouting.RouteDomainPublicAPI:
			if publicAPI == nil {
				continue
			}
			publicAPI.Get(alias, debugCompatibilityRedirect(target))
		case adminrouting.RouteDomainAdminAPI:
			if adminAPI == nil {
				continue
			}
			adminAPI.Get(alias, debugCompatibilityRedirect(target))
		default:
			if publicSite == nil {
				continue
			}
			publicSite.Get(alias, debugCompatibilityRedirect(target))
		}
	}

	return nil
}

func resolveDebugCompatibilityRouteSurface(cfg coreadmin.Config, alias string) string {
	roots := adminrouting.MergeRoots(
		adminrouting.DeriveDefaultRoots(adminrouting.RootDerivationInput{
			BasePath: cfg.BasePath,
			URLs: adminrouting.URLConfig{
				Admin: adminrouting.URLNamespaceConfig{
					BasePath:   cfg.URLs.Admin.BasePath,
					APIPrefix:  cfg.URLs.Admin.APIPrefix,
					APIVersion: cfg.URLs.Admin.APIVersion,
				},
				Public: adminrouting.URLNamespaceConfig{
					BasePath:   cfg.URLs.Public.BasePath,
					APIPrefix:  cfg.URLs.Public.APIPrefix,
					APIVersion: cfg.URLs.Public.APIVersion,
				},
			},
		}),
		adminrouting.NormalizeRoots(cfg.Routing.Roots),
	)
	switch {
	case routeMatchesPrefix(alias, roots.PublicAPIRoot):
		return adminrouting.RouteDomainPublicAPI
	case routeMatchesPrefix(alias, roots.APIRoot):
		return adminrouting.RouteDomainAdminAPI
	default:
		return adminrouting.RouteDomainPublicSite
	}
}

func routeMatchesPrefix(candidate, prefix string) bool {
	candidate = strings.TrimSpace(candidate)
	prefix = strings.TrimSpace(prefix)
	switch {
	case candidate == "", prefix == "":
		return false
	case candidate == prefix:
		return true
	default:
		return strings.HasPrefix(candidate, prefix+"/")
	}
}

func debugCompatibilityRedirect(target string) router.HandlerFunc {
	target = strings.TrimSpace(target)
	return func(c router.Context) error {
		if c == nil || target == "" {
			return admin.ErrNotFound
		}
		location := target
		if rawQuery := rawQueryFromURLString(c.OriginalURL()); rawQuery != "" {
			if strings.Contains(location, "?") {
				location += "&" + rawQuery
			} else {
				location += "?" + rawQuery
			}
		}
		return c.Redirect(location, http.StatusPermanentRedirect)
	}
}

func rawQueryFromURLString(raw string) string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return ""
	}
	parsed, err := url.Parse(raw)
	if err != nil {
		if idx := strings.Index(raw, "?"); idx >= 0 && idx+1 < len(raw) {
			return raw[idx+1:]
		}
		return ""
	}
	return strings.TrimPrefix(parsed.RawQuery, "?")
}
