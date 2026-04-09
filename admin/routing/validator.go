package routing

import (
	"fmt"
	"strings"

	router "github.com/goliatone/go-router"
)

type URLKitCapabilities struct {
	NativeStrictMutations bool `json:"native_strict_mutations"`
	NativeManifest        bool `json:"native_manifest"`
}

type RouterCapabilities struct {
	NativeRouteNamePolicy bool `json:"native_route_name_policy"`
	NativeOwnershipChecks bool `json:"native_ownership_checks"`
	NativeManifest        bool `json:"native_manifest"`
}

type URLKitCapabilityProvider interface {
	RoutingURLKitCapabilities() URLKitCapabilities
}

type RouterCapabilityProvider interface {
	RoutingRouterCapabilities() RouterCapabilities
}

type RouterAdapter interface {
	Routes() []router.RouteDefinition
	ValidateRoutes() []error
}

type Validator struct {
	roots     RootsConfig
	registry  *Registry
	conflicts []Conflict
}

func NewValidator(roots RootsConfig) *Validator {
	return &Validator{
		roots:     NormalizeRoots(roots),
		registry:  NewRegistry(),
		conflicts: nil,
	}
}

func (v *Validator) ValidateHostRoutes(entries []ManifestEntry) error {
	conflicts := make([]Conflict, 0)
	for _, entry := range entries {
		normalized := normalizeManifestEntry(entry)
		if strings.TrimSpace(normalized.Owner) == "" {
			conflicts = append(conflicts, Conflict{
				Kind:    ConflictKindOwnershipViolation,
				Message: "host route owner is required",
			})
			continue
		}
		if strings.TrimSpace(normalized.Surface) == "" {
			conflicts = append(conflicts, Conflict{
				Kind:    ConflictKindOwnershipViolation,
				Module:  moduleFromOwner(normalized.Owner),
				Path:    normalized.Path,
				Message: fmt.Sprintf("host route %q must declare a known surface", normalized.Path),
			})
			continue
		}
		if strings.TrimSpace(normalized.Path) == "" {
			conflicts = append(conflicts, Conflict{
				Kind:    ConflictKindOwnershipViolation,
				Module:  moduleFromOwner(normalized.Owner),
				Message: fmt.Sprintf("host route on surface %q must declare an absolute path", normalized.Surface),
			})
			continue
		}
		conflicts = append(conflicts, v.registry.TrackManifestEntry(normalized)...)
	}
	if len(conflicts) > 0 {
		v.conflicts = append(v.conflicts, conflicts...)
		return conflictError(conflicts)
	}
	return nil
}

func (v *Validator) ValidateModule(contract ModuleContract, resolved ResolvedModule, entries []ManifestEntry) error {
	conflicts := make([]Conflict, 0)
	conflicts = append(conflicts, validateOwnership(contract, resolved, entries, v.roots)...)
	conflicts = append(conflicts, validateRouteNameOwnership(contract, resolved, entries)...)

	for _, entry := range entries {
		conflicts = append(conflicts, v.registry.TrackManifestEntry(entry)...)
	}

	if len(conflicts) > 0 {
		v.conflicts = append(v.conflicts, conflicts...)
		return conflictError(conflicts)
	}

	return nil
}

func (v *Validator) ValidateFallbacks(entries []ManifestEntry, fallbacks []FallbackEntry) error {
	conflicts := make([]Conflict, 0)
	seen := map[string]FallbackEntry{}
	for _, entry := range fallbacks {
		fallback := NormalizeFallbackEntry(entry)
		switch fallback.Mode {
		case FallbackModeDisabled, FallbackModePublicContentOnly, FallbackModeExplicitPathsOnly:
		default:
			conflicts = append(conflicts, Conflict{
				Kind:    ConflictKindOwnershipViolation,
				Module:  moduleFromOwner(fallback.Owner),
				Message: fmt.Sprintf("unsupported fallback mode %q", fallback.Mode),
			})
			continue
		}
		if fallback.Surface != SurfacePublicSite {
			conflicts = append(conflicts, Conflict{
				Kind:    ConflictKindOwnershipViolation,
				Module:  moduleFromOwner(fallback.Owner),
				Message: fmt.Sprintf("fallback surface %q is not supported", fallback.Surface),
			})
			continue
		}
		if fallback.Domain != RouteDomainPublicSite {
			conflicts = append(conflicts, Conflict{
				Kind:    ConflictKindOwnershipViolation,
				Module:  moduleFromOwner(fallback.Owner),
				Message: fmt.Sprintf("fallback domain %q must be %q", fallback.Domain, RouteDomainPublicSite),
			})
			continue
		}
		key := fallbackIdentityKey(fallback)
		if existing, ok := seen[key]; ok && !fallbackEntriesEqual(existing, fallback) {
			conflicts = append(conflicts, Conflict{
				Kind:   ConflictKindOwnershipViolation,
				Module: moduleFromOwner(fallback.Owner),
				Existing: map[string]string{
					"owner": existing.Owner,
					"mode":  existing.Mode,
				},
				Incoming: map[string]string{
					"owner": fallback.Owner,
					"mode":  fallback.Mode,
				},
				Message: fmt.Sprintf("only one fallback owner may exist for surface %q", fallback.Surface),
			})
			continue
		}
		seen[key] = fallback
		conflicts = append(conflicts, validateFallbackReservedPrefixes(fallback)...)
		conflicts = append(conflicts, validateFallbackShadowing(entries, fallback)...)
	}
	if len(conflicts) > 0 {
		v.conflicts = append(v.conflicts, conflicts...)
		return conflictError(conflicts)
	}
	return nil
}

func (v *Validator) PreflightURLKit(entries []ManifestEntry, urls URLKitAdapter) error {
	if urls == nil {
		return nil
	}
	if caps := DetectURLKitCapabilities(urls); caps.NativeStrictMutations {
		return nil
	}

	conflicts := make([]Conflict, 0)
	for _, entry := range entries {
		if entry.GroupPath == "" || entry.RouteKey == "" {
			continue
		}

		templatePath, templateErr := urls.RouteTemplate(entry.GroupPath, entry.RouteKey)
		resolvedPath, resolvedErr := urls.RoutePath(entry.GroupPath, entry.RouteKey)
		existingPath := strings.TrimSpace(resolvedPath)
		if existingPath == "" {
			existingPath = strings.TrimSpace(templatePath)
		}
		if (resolvedErr != nil || strings.TrimSpace(resolvedPath) == "") && (templateErr != nil || strings.TrimSpace(templatePath) == "") {
			continue
		}

		incomingPath := normalizeAbsolutePath(entry.Path)
		if normalizeAbsolutePath(existingPath) == incomingPath || normalizeAbsolutePath(templatePath) == incomingPath {
			continue
		}

		conflicts = append(conflicts, Conflict{
			Kind:      ConflictKindRouteNameConflict,
			Module:    moduleFromOwner(entry.Owner),
			Path:      entry.Path,
			RouteName: entry.RouteName,
			Existing: map[string]string{
				"group_path": entry.GroupPath,
				"route_key":  entry.RouteKey,
				"path":       existingPath,
			},
			Incoming: map[string]string{
				"group_path": entry.GroupPath,
				"route_key":  entry.RouteKey,
				"path":       entry.Path,
			},
			Message: fmt.Sprintf("urlkit route key conflict for %s.%s", entry.GroupPath, entry.RouteKey),
		})
	}

	if len(conflicts) > 0 {
		v.conflicts = append(v.conflicts, conflicts...)
		return conflictError(conflicts)
	}

	return nil
}

func (v *Validator) PreflightRouter(owner, module string, routes []router.RouteDefinition) error {
	if caps := DetectRouterCapabilities(v.routerAdapterFromRoutes(routes)); caps.NativeRouteNamePolicy && caps.NativeOwnershipChecks {
		return nil
	}
	conflicts := make([]Conflict, 0)
	for _, route := range routes {
		conflicts = append(conflicts, v.registry.TrackRouterRoute(owner, module, route)...)
	}
	if len(conflicts) > 0 {
		v.conflicts = append(v.conflicts, conflicts...)
		return conflictError(conflicts)
	}
	return nil
}

func (v *Validator) ReconcileRouter(manifest Manifest, adapter RouterAdapter) error {
	if adapter == nil {
		return nil
	}
	if caps := DetectRouterCapabilities(adapter); caps.NativeManifest {
		return nil
	}

	conflicts := make([]Conflict, 0)
	routerRoutes := adapter.Routes()
	routerByName := make(map[string]router.RouteDefinition, len(routerRoutes))
	for _, route := range routerRoutes {
		name := strings.TrimSpace(route.Name)
		if name != "" {
			routerByName[name] = route
		}
	}

	for _, entry := range manifest.Entries {
		if entry.RouteName == "" {
			continue
		}
		route, ok := routerByName[entry.RouteName]
		if !ok {
			conflicts = append(conflicts, Conflict{
				Kind:      ConflictKindPathConflict,
				Module:    moduleFromOwner(entry.Owner),
				Path:      entry.Path,
				RouteName: entry.RouteName,
				Incoming: map[string]string{
					"owner":      entry.Owner,
					"route_name": entry.RouteName,
					"path":       entry.Path,
				},
				Message: fmt.Sprintf("router mismatch for %s: missing route", entry.RouteName),
			})
			continue
		}
		if strings.TrimSpace(route.Path) != strings.TrimSpace(entry.Path) {
			conflicts = append(conflicts, Conflict{
				Kind:      ConflictKindPathConflict,
				Module:    moduleFromOwner(entry.Owner),
				Path:      entry.Path,
				RouteName: entry.RouteName,
				Existing: map[string]string{
					"route_name": route.Name,
					"path":       route.Path,
				},
				Incoming: map[string]string{
					"route_name": entry.RouteName,
					"path":       entry.Path,
				},
				Message: fmt.Sprintf("router mismatch for %s: manifest path %s does not match runtime path %s", entry.RouteName, entry.Path, route.Path),
			})
		}
	}

	for _, err := range adapter.ValidateRoutes() {
		if err == nil {
			continue
		}
		conflicts = append(conflicts, Conflict{
			Kind:    ConflictKindPathConflict,
			Message: err.Error(),
		})
	}

	if len(conflicts) > 0 {
		v.conflicts = append(v.conflicts, conflicts...)
		return conflictError(conflicts)
	}

	return nil
}

func (v *Validator) Conflicts() []Conflict {
	if len(v.conflicts) == 0 {
		return nil
	}
	out := make([]Conflict, len(v.conflicts))
	copy(out, v.conflicts)
	return out
}

func validateOwnership(contract ModuleContract, resolved ResolvedModule, entries []ManifestEntry, roots RootsConfig) []Conflict {
	conflicts := make([]Conflict, 0)
	conflicts = append(conflicts, validateSurfaceOwnership(contract.Slug, SurfaceUI, roots.AdminRoot, entries)...)
	conflicts = append(conflicts, validateSurfaceOwnership(contract.Slug, SurfaceAPI, roots.APIRoot, entries)...)
	conflicts = append(conflicts, validateSurfaceOwnership(contract.Slug, SurfacePublicAPI, roots.PublicAPIRoot, entries)...)
	return conflicts
}

func validateSurfaceOwnership(slug, surface, root string, entries []ManifestEntry) []Conflict {
	root = normalizeAbsolutePath(root)
	conflicts := make([]Conflict, 0, 2)
	for _, entry := range entries {
		if entry.Surface != surface {
			continue
		}
		path := normalizeAbsolutePath(entry.Path)
		if path == "" || !pathWithinRoot(root, path) {
			conflicts = append(conflicts, Conflict{
				Kind:   ConflictKindOwnershipViolation,
				Module: slug,
				Path:   path,
				Existing: map[string]string{
					"root": root,
				},
				Incoming: map[string]string{
					"surface": surface,
					"path":    path,
				},
				Message: fmt.Sprintf("%s route %q must remain under host root %q", surface, path, root),
			})
			continue
		}
		if root != "" && path == root {
			conflicts = append(conflicts, Conflict{
				Kind:   ConflictKindOwnershipViolation,
				Module: slug,
				Path:   path,
				Existing: map[string]string{
					"root": root,
				},
				Incoming: map[string]string{
					"surface": surface,
					"path":    path,
				},
				Message: fmt.Sprintf("%s route %q cannot claim reserved host root directly", surface, path),
			})
		}
	}

	return conflicts
}

func validateRouteNameOwnership(contract ModuleContract, resolved ResolvedModule, entries []ManifestEntry) []Conflict {
	conflicts := make([]Conflict, 0)
	for _, entry := range entries {
		expectedPrefix := buildOwnedRouteNamePrefix(groupPathForSurface(resolved, entry.Surface), contract.RouteNamePrefix, contract.Slug)
		if expectedPrefix != "" && !strings.HasPrefix(strings.TrimSpace(entry.RouteName), expectedPrefix) {
			conflicts = append(conflicts, Conflict{
				Kind:      ConflictKindOwnershipViolation,
				Module:    contract.Slug,
				Path:      entry.Path,
				RouteName: entry.RouteName,
				Existing: map[string]string{
					"expected_prefix": expectedPrefix,
				},
				Incoming: map[string]string{
					"route_name": entry.RouteName,
					"route_key":  entry.RouteKey,
				},
				Message: fmt.Sprintf("route name %q must use prefix %q", entry.RouteName, expectedPrefix),
			})
		}
		if !OwnsRouteKey(contract.Slug, entry.RouteKey) {
			conflicts = append(conflicts, Conflict{
				Kind:      ConflictKindSlugViolation,
				Module:    contract.Slug,
				Path:      entry.Path,
				RouteName: entry.RouteName,
				Existing: map[string]string{
					"required_prefix": RouteKeyOwnershipPrefix(contract.Slug),
				},
				Incoming: map[string]string{
					"route_key": entry.RouteKey,
				},
				Message: fmt.Sprintf("route key %q must be owned by slug %q", entry.RouteKey, contract.Slug),
			})
		}
	}
	return conflicts
}

func validateFallbackReservedPrefixes(fallback FallbackEntry) []Conflict {
	conflicts := make([]Conflict, 0)
	for _, path := range fallback.AllowedExactPaths {
		if fallbackReservesPath(fallback, path) {
			conflicts = append(conflicts, Conflict{
				Kind:   ConflictKindOwnershipViolation,
				Module: moduleFromOwner(fallback.Owner),
				Path:   path,
				Existing: map[string]string{
					"owner":    fallback.Owner,
					"reserved": strings.Join(fallback.ReservedPrefixes, ","),
				},
				Incoming: map[string]string{
					"path": path,
				},
				Message: fmt.Sprintf("public-site fallback exact path %q overlaps a reserved prefix", path),
			})
		}
	}
	for _, prefix := range fallback.AllowedPathPrefixes {
		if fallbackReservesPath(fallback, prefix) {
			conflicts = append(conflicts, Conflict{
				Kind:   ConflictKindOwnershipViolation,
				Module: moduleFromOwner(fallback.Owner),
				Path:   prefix,
				Existing: map[string]string{
					"owner":    fallback.Owner,
					"reserved": strings.Join(fallback.ReservedPrefixes, ","),
				},
				Incoming: map[string]string{
					"path_prefix": prefix,
				},
				Message: fmt.Sprintf("public-site fallback path prefix %q overlaps a reserved prefix", prefix),
			})
		}
	}
	return conflicts
}

func validateFallbackShadowing(entries []ManifestEntry, fallback FallbackEntry) []Conflict {
	conflicts := make([]Conflict, 0)
	for _, raw := range entries {
		entry := normalizeManifestEntry(raw)
		if entry.Path == "" {
			continue
		}
		if entry.Owner == fallback.Owner && NormalizeRouteDomain(entry.Domain) == RouteDomainPublicSite {
			continue
		}
		methodAllowed := entry.Method == "" || entry.Method == ManifestMethodUnknown || fallbackAllowsMethod(fallback, entry.Method)
		if !methodAllowed {
			continue
		}
		if !fallbackClaimsPath(fallback, entry.Path) {
			continue
		}
		conflicts = append(conflicts, Conflict{
			Kind:      ConflictKindOwnershipViolation,
			Module:    moduleFromOwner(fallback.Owner),
			Method:    entry.Method,
			Path:      entry.Path,
			RouteName: entry.RouteName,
			Existing: map[string]string{
				"owner":      entry.Owner,
				"surface":    entry.Surface,
				"domain":     entry.Domain,
				"route_name": entry.RouteName,
				"path":       entry.Path,
			},
			Incoming: map[string]string{
				"owner":   fallback.Owner,
				"surface": fallback.Surface,
				"mode":    fallback.Mode,
			},
			Message: fmt.Sprintf("public-site fallback for %q would shadow %s-owned path %q", fallback.Owner, entry.Domain, entry.Path),
		})
	}
	return conflicts
}

func groupPathForSurface(resolved ResolvedModule, surface string) string {
	switch surface {
	case SurfaceUI:
		return resolved.UIGroupPath
	case SurfaceAPI:
		return resolved.APIGroupPath
	case SurfacePublicAPI:
		return resolved.PublicAPIGroupPath
	default:
		return ""
	}
}

func buildOwnedRouteNamePrefix(groupPath, routeNamePrefix, slug string) string {
	groupPath = strings.TrimSpace(groupPath)
	prefix := NormalizeRouteNamePrefix(routeNamePrefix, slug)
	prefix = strings.Trim(prefix, ".")
	if groupPath == "" || prefix == "" {
		return ""
	}
	return groupPath + "." + prefix + "."
}

func DetectURLKitCapabilities(adapter URLKitAdapter) URLKitCapabilities {
	if adapter == nil {
		return URLKitCapabilities{}
	}
	if provider, ok := adapter.(URLKitCapabilityProvider); ok {
		return provider.RoutingURLKitCapabilities()
	}
	return URLKitCapabilities{}
}

func DetectRouterCapabilities(adapter RouterAdapter) RouterCapabilities {
	if adapter == nil {
		return RouterCapabilities{}
	}
	if provider, ok := adapter.(RouterCapabilityProvider); ok {
		return provider.RoutingRouterCapabilities()
	}
	return RouterCapabilities{}
}

func BuildAdapterWarnings(urls URLKitAdapter, router RouterAdapter) []string {
	warnings := make([]string, 0, 2)
	urlCaps := DetectURLKitCapabilities(urls)
	if !urlCaps.NativeStrictMutations {
		warnings = append(warnings, "urlkit adapter does not advertise native strict mutation support; using local preflight checks")
	}
	if !urlCaps.NativeManifest {
		warnings = append(warnings, "urlkit adapter does not advertise native manifest support; using local manifest assembly")
	}

	routerCaps := DetectRouterCapabilities(router)
	if router != nil && !routerCaps.NativeRouteNamePolicy {
		warnings = append(warnings, "router adapter does not advertise native route-name policy support; using local preflight checks")
	}
	if router != nil && !routerCaps.NativeOwnershipChecks {
		warnings = append(warnings, "router adapter does not advertise native ownership validation; using local reconciliation")
	}
	if router != nil && !routerCaps.NativeManifest {
		warnings = append(warnings, "router adapter does not advertise native manifest support; using local manifest reconciliation")
	}

	return warnings
}

type staticRouterAdapter struct {
	routes []router.RouteDefinition
}

func (a staticRouterAdapter) Routes() []router.RouteDefinition {
	return append([]router.RouteDefinition{}, a.routes...)
}

func (a staticRouterAdapter) ValidateRoutes() []error {
	return nil
}

func (v *Validator) routerAdapterFromRoutes(routes []router.RouteDefinition) RouterAdapter {
	return staticRouterAdapter{routes: routes}
}
