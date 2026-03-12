package routing

type ModuleContract struct {
	Slug            string            `json:"slug"`
	UIRoutes        map[string]string `json:"ui_routes,omitempty"`
	APIRoutes       map[string]string `json:"api_routes,omitempty"`
	PublicAPIRoutes map[string]string `json:"public_api_routes,omitempty"`
	RouteNamePrefix string            `json:"route_name_prefix,omitempty"`
}

type ResolvedModule struct {
	Slug               string `json:"slug"`
	UIMountBase        string `json:"ui_mount_base,omitempty"`
	APIMountBase       string `json:"api_mount_base,omitempty"`
	PublicAPIMountBase string `json:"public_api_mount_base,omitempty"`
	UIGroupPath        string `json:"ui_group_path,omitempty"`
	APIGroupPath       string `json:"api_group_path,omitempty"`
	PublicAPIGroupPath string `json:"public_api_group_path,omitempty"`
}

type ModuleContext struct {
	Contract        ModuleContract    `json:"contract"`
	Resolved        ResolvedModule    `json:"resolved"`
	UIRoutes        map[string]string `json:"ui_routes,omitempty"`
	APIRoutes       map[string]string `json:"api_routes,omitempty"`
	PublicAPIRoutes map[string]string `json:"public_api_routes,omitempty"`
}

func NormalizeModuleContract(contract ModuleContract) ModuleContract {
	contract.Slug = normalizePathSegment(contract.Slug)
	contract.RouteNamePrefix = NormalizeRouteNamePrefix(contract.RouteNamePrefix, contract.Slug)
	contract.UIRoutes = normalizeRouteTable(contract.UIRoutes)
	contract.APIRoutes = normalizeRouteTable(contract.APIRoutes)
	contract.PublicAPIRoutes = normalizeRouteTable(contract.PublicAPIRoutes)
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
	}
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
