package routing

type ModuleContract struct {
	Slug            string            `json:"slug"`
	UIRoutes        map[string]string `json:"ui_routes,omitempty"`
	APIRoutes       map[string]string `json:"api_routes,omitempty"`
	PublicAPIRoutes map[string]string `json:"public_api_routes,omitempty"`
	RouteNamePrefix string            `json:"route_name_prefix,omitempty"`
	// Mounts declares additional named route sets. The host must authorize each
	// name with a surface and absolute base in Config.Modules[slug].Mounts.
	Mounts map[string]NamedMountContract `json:"mounts,omitempty"`
}

type NamedMountContract struct {
	Routes map[string]string `json:"routes"`
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
	if len(contract.Mounts) > 0 {
		contract.Mounts = normalizeNamedMountContracts(contract.Mounts)
	}
	return contract
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
	mount, ok := c.Resolved.Mounts[normalizePathSegment(name)]
	return mount, ok
}

func (c ModuleContext) MountRoutePath(name, routeKey string) string {
	return c.MountRoutes[normalizePathSegment(name)][routeKey]
}

func normalizeNamedMountContracts(mounts map[string]NamedMountContract) map[string]NamedMountContract {
	out := make(map[string]NamedMountContract, len(mounts))
	for name, mount := range mounts {
		out[normalizePathSegment(name)] = NamedMountContract{Routes: normalizeRouteTable(mount.Routes)}
	}
	return out
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
