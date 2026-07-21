package routing

import (
	"fmt"
	"maps"
	"slices"
	"strings"

	router "github.com/goliatone/go-router"
)

type RouteDeclaration struct {
	Method router.HTTPMethod `json:"method"`
	Path   string            `json:"path"`
}

type ModuleContract struct {
	Slug            string            `json:"slug"`
	UIRoutes        map[string]string `json:"ui_routes,omitempty"`
	APIRoutes       map[string]string `json:"api_routes,omitempty"`
	PublicAPIRoutes map[string]string `json:"public_api_routes,omitempty"`
	// Typed declarations are preferred for new modules because they enable
	// exact method/path conflict detection and runtime reconciliation. The
	// path-only fields remain source compatible and normalize to UNKNOWN.
	UIRouteDeclarations        map[string]RouteDeclaration `json:"ui_route_declarations,omitempty"`
	APIRouteDeclarations       map[string]RouteDeclaration `json:"api_route_declarations,omitempty"`
	PublicAPIRouteDeclarations map[string]RouteDeclaration `json:"public_api_route_declarations,omitempty"`
	RouteNamePrefix            string                      `json:"route_name_prefix,omitempty"`
	// Mounts declares additional named route sets. The host must authorize each
	// name with a surface and absolute base in Config.Modules[slug].Mounts.
	Mounts map[string]NamedMountContract `json:"mounts,omitempty"`
}

type NamedMountContract struct {
	Routes            map[string]string           `json:"routes,omitempty"`
	RouteDeclarations map[string]RouteDeclaration `json:"route_declarations,omitempty"`
}

type ResolvedMount struct {
	Name      string `json:"name"`
	Surface   string `json:"surface"`
	Base      string `json:"base"`
	GroupPath string `json:"group_path"`
}

type ResolvedModule struct {
	Slug               string                   `json:"slug"`
	UIMountBase        string                   `json:"ui_mount_base,omitempty"`
	APIMountBase       string                   `json:"api_mount_base,omitempty"`
	PublicAPIMountBase string                   `json:"public_api_mount_base,omitempty"`
	UIGroupPath        string                   `json:"ui_group_path,omitempty"`
	APIGroupPath       string                   `json:"api_group_path,omitempty"`
	PublicAPIGroupPath string                   `json:"public_api_group_path,omitempty"`
	Mounts             map[string]ResolvedMount `json:"mounts,omitempty"`
}

type ModuleContext struct {
	Contract        ModuleContract               `json:"contract"`
	Resolved        ResolvedModule               `json:"resolved"`
	UIRoutes        map[string]string            `json:"ui_routes,omitempty"`
	APIRoutes       map[string]string            `json:"api_routes,omitempty"`
	PublicAPIRoutes map[string]string            `json:"public_api_routes,omitempty"`
	MountRoutes     map[string]map[string]string `json:"mount_routes,omitempty"`
}

func NormalizeModuleContract(contract ModuleContract) ModuleContract {
	contract.Slug = normalizePathSegment(contract.Slug)
	contract.RouteNamePrefix = NormalizeRouteNamePrefix(contract.RouteNamePrefix, contract.Slug)
	contract.UIRoutes = normalizeRouteTable(contract.UIRoutes)
	contract.APIRoutes = normalizeRouteTable(contract.APIRoutes)
	contract.PublicAPIRoutes = normalizeRouteTable(contract.PublicAPIRoutes)
	contract.UIRouteDeclarations = normalizeRouteDeclarations(contract.UIRouteDeclarations)
	contract.APIRouteDeclarations = normalizeRouteDeclarations(contract.APIRouteDeclarations)
	contract.PublicAPIRouteDeclarations = normalizeRouteDeclarations(contract.PublicAPIRouteDeclarations)
	contract.UIRoutes = mergeDeclaredRoutePaths(contract.UIRoutes, contract.UIRouteDeclarations)
	contract.APIRoutes = mergeDeclaredRoutePaths(contract.APIRoutes, contract.APIRouteDeclarations)
	contract.PublicAPIRoutes = mergeDeclaredRoutePaths(contract.PublicAPIRoutes, contract.PublicAPIRouteDeclarations)
	if len(contract.Mounts) > 0 {
		contract.Mounts = normalizeNamedMountContracts(contract.Mounts)
	}
	return contract
}

func normalizeRouteDeclarations(routes map[string]RouteDeclaration) map[string]RouteDeclaration {
	if len(routes) == 0 {
		return nil
	}
	out := make(map[string]RouteDeclaration, len(routes))
	for routeKey, declaration := range routes {
		declaration.Method = router.HTTPMethod(strings.ToUpper(strings.TrimSpace(string(declaration.Method))))
		declaration.Path = NormalizeRelativePath(declaration.Path)
		out[routeKey] = declaration
	}
	return out
}

func mergeDeclaredRoutePaths(routes map[string]string, declarations map[string]RouteDeclaration) map[string]string {
	if len(declarations) == 0 {
		return routes
	}
	out := make(map[string]string, len(routes)+len(declarations))
	maps.Copy(out, routes)
	for routeKey, declaration := range declarations {
		out[routeKey] = declaration.Path
	}
	return out
}

func normalizeRouteTable(routes map[string]string) map[string]string {
	if len(routes) == 0 {
		return nil
	}

	out := make(map[string]string, len(routes))
	for routeKey, routePath := range routes {
		out[routeKey] = NormalizeRelativePath(routePath)
	}
	return out
}

func BuildModuleContext(contract ModuleContract, resolved ResolvedModule) ModuleContext {
	contract = NormalizeModuleContract(contract)
	return ModuleContext{
		Contract:        contract,
		Resolved:        resolved,
		UIRoutes:        buildResolvedRouteTable(resolved.UIMountBase, contract.UIRoutes),
		APIRoutes:       buildResolvedRouteTable(resolved.APIMountBase, contract.APIRoutes),
		PublicAPIRoutes: buildResolvedRouteTable(resolved.PublicAPIMountBase, contract.PublicAPIRoutes),
		MountRoutes:     buildNamedMountRouteTables(contract.Mounts, resolved.Mounts),
	}
}

func (c ModuleContext) Mount(name string) (ResolvedMount, bool) {
	mount, ok := c.Resolved.Mounts[NormalizeMountName(name)]
	return mount, ok
}

func (c ModuleContext) MountRoutePath(name, routeKey string) string {
	return c.MountRoutes[NormalizeMountName(name)][routeKey]
}

func normalizeNamedMountContracts(mounts map[string]NamedMountContract) map[string]NamedMountContract {
	out := make(map[string]NamedMountContract, len(mounts))
	for name, mount := range mounts {
		declarations := normalizeRouteDeclarations(mount.RouteDeclarations)
		routes := mergeDeclaredRoutePaths(normalizeRouteTable(mount.Routes), declarations)
		out[NormalizeMountName(name)] = NamedMountContract{Routes: routes, RouteDeclarations: declarations}
	}
	return out
}

func validateNamedMountContractNames(mounts map[string]NamedMountContract) error {
	seen := map[string]string{}
	names := make([]string, 0, len(mounts))
	for name := range mounts {
		names = append(names, name)
	}
	slices.Sort(names)
	for _, name := range names {
		canonical := NormalizeMountName(name)
		if canonical == "" {
			return fmt.Errorf("named mount name is required")
		}
		if existing, ok := seen[canonical]; ok {
			return fmt.Errorf("named mounts %q and %q normalize to the same name %q", existing, name, canonical)
		}
		seen[canonical] = name
	}
	return nil
}

func validateRouteDeclarationSources(contract ModuleContract) error {
	if err := validateRouteDeclarationSource(SurfaceUI, contract.UIRoutes, contract.UIRouteDeclarations); err != nil {
		return err
	}
	if err := validateRouteDeclarationSource(SurfaceAPI, contract.APIRoutes, contract.APIRouteDeclarations); err != nil {
		return err
	}
	if err := validateRouteDeclarationSource(SurfacePublicAPI, contract.PublicAPIRoutes, contract.PublicAPIRouteDeclarations); err != nil {
		return err
	}
	for name, mount := range contract.Mounts {
		if err := validateRouteDeclarationSource("mount."+NormalizeMountName(name), mount.Routes, mount.RouteDeclarations); err != nil {
			return err
		}
	}
	return nil
}

func validateRouteDeclarationSource(surface string, legacy map[string]string, typed map[string]RouteDeclaration) error {
	for routeKey, declaration := range typed {
		legacyPath, ok := legacy[routeKey]
		if !ok {
			continue
		}
		if NormalizeRelativePath(legacyPath) != NormalizeRelativePath(declaration.Path) {
			return fmt.Errorf("%s route %q declares conflicting legacy and typed paths", surface, routeKey)
		}
	}
	return nil
}

func buildNamedMountRouteTables(contracts map[string]NamedMountContract, resolved map[string]ResolvedMount) map[string]map[string]string {
	if len(contracts) == 0 {
		return nil
	}
	out := make(map[string]map[string]string, len(contracts))
	for name, contract := range contracts {
		mount, ok := resolved[name]
		if !ok {
			continue
		}
		out[name] = buildResolvedRouteTable(mount.Base, contract.Routes)
	}
	return out
}

func (c ModuleContext) GroupPath(surface string) string {
	switch surface {
	case SurfaceUI:
		return c.Resolved.UIGroupPath
	case SurfaceAPI:
		return c.Resolved.APIGroupPath
	case SurfacePublicAPI:
		return c.Resolved.PublicAPIGroupPath
	default:
		return ""
	}
}

func (c ModuleContext) RoutePath(surface, routeKey string) string {
	switch surface {
	case SurfaceUI:
		return c.UIRoutes[routeKey]
	case SurfaceAPI:
		return c.APIRoutes[routeKey]
	case SurfacePublicAPI:
		return c.PublicAPIRoutes[routeKey]
	default:
		return ""
	}
}

func buildResolvedRouteTable(base string, routes map[string]string) map[string]string {
	if len(routes) == 0 {
		return nil
	}

	out := make(map[string]string, len(routes))
	for routeKey, routePath := range routes {
		out[routeKey] = joinMountPath(base, routePath)
	}
	return out
}
