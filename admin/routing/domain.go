package routing

import (
	"slices"
	"strings"
)

const (
	RouteDomainSystem          = "system"
	RouteDomainInternalOps     = "internal_ops"
	RouteDomainAdminUI         = "admin_ui"
	RouteDomainAdminAPI        = "admin_api"
	RouteDomainProtectedAppUI  = "protected_app_ui"
	RouteDomainProtectedAppAPI = "protected_app_api"
	RouteDomainPublicAPI       = "public_api"
	RouteDomainPublicSite      = "public_site"
	RouteDomainStatic          = "static"
)

func NormalizeRouteDomain(domain string) string {
	switch strings.ToLower(strings.TrimSpace(domain)) {
	case RouteDomainSystem:
		return RouteDomainSystem
	case RouteDomainInternalOps:
		return RouteDomainInternalOps
	case RouteDomainAdminUI, SurfaceUI:
		return RouteDomainAdminUI
	case RouteDomainAdminAPI, SurfaceAPI:
		return RouteDomainAdminAPI
	case RouteDomainProtectedAppUI:
		return RouteDomainProtectedAppUI
	case RouteDomainProtectedAppAPI:
		return RouteDomainProtectedAppAPI
	case RouteDomainPublicAPI:
		return RouteDomainPublicAPI
	case RouteDomainPublicSite:
		return RouteDomainPublicSite
	case RouteDomainStatic:
		return RouteDomainStatic
	default:
		return ""
	}
}

func NormalizeRouteSurface(surface string) string {
	switch strings.ToLower(strings.TrimSpace(surface)) {
	case SurfaceUI:
		return SurfaceUI
	case SurfaceAPI:
		return SurfaceAPI
	case SurfaceProtectedAppUI:
		return SurfaceProtectedAppUI
	case SurfaceProtectedAppAPI:
		return SurfaceProtectedAppAPI
	case SurfacePublicAPI:
		return SurfacePublicAPI
	case SurfacePublicSite:
		return SurfacePublicSite
	case SurfaceSystem:
		return SurfaceSystem
	case SurfaceInternalOps:
		return SurfaceInternalOps
	case SurfaceStatic:
		return SurfaceStatic
	default:
		return ""
	}
}

func DefaultRouteDomainForSurface(surface string) string {
	switch NormalizeRouteSurface(surface) {
	case SurfaceUI:
		return RouteDomainAdminUI
	case SurfaceAPI:
		return RouteDomainAdminAPI
	case SurfaceProtectedAppUI:
		return RouteDomainProtectedAppUI
	case SurfaceProtectedAppAPI:
		return RouteDomainProtectedAppAPI
	case SurfacePublicAPI:
		return RouteDomainPublicAPI
	case SurfacePublicSite:
		return RouteDomainPublicSite
	case SurfaceSystem:
		return RouteDomainSystem
	case SurfaceInternalOps:
		return RouteDomainInternalOps
	case SurfaceStatic:
		return RouteDomainStatic
	default:
		return ""
	}
}

func DefaultRouteSurfaceForDomain(domain string) string {
	switch NormalizeRouteDomain(domain) {
	case RouteDomainAdminUI:
		return SurfaceUI
	case RouteDomainAdminAPI:
		return SurfaceAPI
	case RouteDomainProtectedAppUI:
		return SurfaceProtectedAppUI
	case RouteDomainProtectedAppAPI:
		return SurfaceProtectedAppAPI
	case RouteDomainPublicAPI:
		return SurfacePublicAPI
	case RouteDomainPublicSite:
		return SurfacePublicSite
	case RouteDomainSystem:
		return SurfaceSystem
	case RouteDomainInternalOps:
		return SurfaceInternalOps
	case RouteDomainStatic:
		return SurfaceStatic
	default:
		return ""
	}
}

func RouteDomains() []string {
	domains := []string{
		RouteDomainAdminAPI,
		RouteDomainAdminUI,
		RouteDomainInternalOps,
		RouteDomainProtectedAppAPI,
		RouteDomainProtectedAppUI,
		RouteDomainPublicAPI,
		RouteDomainPublicSite,
		RouteDomainStatic,
		RouteDomainSystem,
	}
	slices.Sort(domains)
	return domains
}
