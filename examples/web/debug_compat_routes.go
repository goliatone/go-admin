package main

import (
	"fmt"
	"net/http"
	"net/url"
	"path"
	"strings"

	"github.com/goliatone/go-admin/admin/routing"
	"github.com/goliatone/go-admin/pkg/admin"
	router "github.com/goliatone/go-router"
)

const debugSessionsCompatibilityRouteKey = "debug_tools.api.sessions"

type debugCompatibilityRoute struct {
	alias    string
	routeKey string
}

// registerDebugCompatibilityRoutes installs redirects for common debug API
// guesses so the example remains usable even when callers target the admin API
// surface instead of the debug module surface.
func registerDebugCompatibilityRoutes[T any](r router.Router[T], adm *admin.Admin, adminAPIBasePath string) error {
	if r == nil || adm == nil || adm.URLs() == nil {
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

		target, err := adm.URLs().Resolve(routing.DefaultUIGroupPath(), route.routeKey, nil, nil)
		if err != nil {
			return fmt.Errorf("resolve debug compatibility route %s: %w", route.routeKey, err)
		}
		target = strings.TrimSpace(target)
		if target == "" || target == alias {
			continue
		}
		r.Get(alias, debugCompatibilityRedirect(target))
	}

	return nil
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
