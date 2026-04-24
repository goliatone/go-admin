package quickstart

import (
	"path"
	"strings"

	coreadmin "github.com/goliatone/go-admin/admin"
	adminrouting "github.com/goliatone/go-admin/admin/routing"
)

type hostRouteDomainResolver struct {
	adminRoot           string
	apiRoot             string
	protectedAppRoot    string
	protectedAppAPIRoot string
	publicAPIRoot       string
	staticPrefixes      []string
}

func newHostRouteDomainResolver(cfg coreadmin.Config) hostRouteDomainResolver {
	roots := resolveHostRouterRoots(cfg)
	return hostRouteDomainResolver{
		adminRoot:           roots.AdminRoot,
		apiRoot:             roots.APIRoot,
		protectedAppRoot:    roots.ProtectedAppRoot,
		protectedAppAPIRoot: roots.ProtectedAppAPIRoot,
		publicAPIRoot:       roots.PublicAPIRoot,
		staticPrefixes:      resolveHostStaticPrefixes(cfg),
	}
}

func (r hostRouteDomainResolver) classify(candidate string, op hostRouteOperation) string {
	if op == hostRouteStatic {
		return adminrouting.RouteDomainStatic
	}

	candidate = normalizeHostRoutePath(candidate)
	switch {
	case candidate == "":
		return ""
	case matchesRoutePrefix(candidate, "/.well-known"):
		return adminrouting.RouteDomainSystem
	case matchesAnyRoutePrefix(candidate, r.staticPrefixes):
		return adminrouting.RouteDomainStatic
	case matchesRoutePrefix(candidate, r.protectedAppAPIRoot):
		return adminrouting.RouteDomainProtectedAppAPI
	case matchesRoutePrefix(candidate, r.protectedAppRoot):
		return adminrouting.RouteDomainProtectedAppUI
	case matchesRoutePrefix(candidate, r.publicAPIRoot):
		return adminrouting.RouteDomainPublicAPI
	case matchesRoutePrefix(candidate, r.apiRoot):
		return adminrouting.RouteDomainAdminAPI
	case isAdminDebugAPIPath(candidate, r.adminRoot):
		return adminrouting.RouteDomainAdminAPI
	case isAdminCRUDAPIPath(candidate, r.adminRoot):
		return adminrouting.RouteDomainAdminAPI
	case matchesRoutePrefix(candidate, r.adminRoot):
		return adminrouting.RouteDomainAdminUI
	default:
		return adminrouting.RouteDomainPublicSite
	}
}

func normalizeHostRoutePath(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return ""
	}
	if strings.HasPrefix(value, "http://") || strings.HasPrefix(value, "https://") || strings.HasPrefix(value, "//") {
		return value
	}
	return coreadmin.NormalizeBasePath(value)
}

func matchesAnyRoutePrefix(candidate string, prefixes []string) bool {
	for _, prefix := range prefixes {
		if matchesRoutePrefix(candidate, prefix) {
			return true
		}
	}
	return false
}

func matchesRoutePrefix(candidate, prefix string) bool {
	candidate = normalizeHostRoutePath(candidate)
	prefix = normalizeHostRoutePath(prefix)
	switch {
	case candidate == "", prefix == "":
		return false
	case candidate == prefix:
		return true
	default:
		return strings.HasPrefix(candidate, prefix+"/")
	}
}

func isAdminDebugAPIPath(candidate, adminRoot string) bool {
	adminRoot = normalizeHostRoutePath(adminRoot)
	if adminRoot == "" {
		return false
	}
	return matchesRoutePrefix(candidate, path.Join(adminRoot, "debug", "api"))
}

func isAdminCRUDAPIPath(candidate, adminRoot string) bool {
	adminRoot = normalizeHostRoutePath(adminRoot)
	if adminRoot == "" {
		return false
	}
	return matchesRoutePrefix(candidate, path.Join(adminRoot, "crud"))
}
