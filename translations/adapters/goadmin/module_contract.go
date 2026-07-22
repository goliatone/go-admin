package goadmin

import (
	"maps"

	"github.com/goliatone/go-admin/admin/routing"
	router "github.com/goliatone/go-router"
)

const ModuleSlug = "translations"

func ModuleUIRoutes() map[string]string {
	return declarationPaths(ModuleUIRouteDeclarations())
}

func ModuleAPIRoutes() map[string]string {
	return declarationPaths(ModuleAPIRouteDeclarations())
}

func ModuleUIRouteDeclarations() map[string]routing.RouteDeclaration {
	return map[string]routing.RouteDeclaration{
		"translations.dashboard":            {Method: router.GET, Path: "/dashboard"},
		"translations.exchange":             {Method: router.GET, Path: "/exchange"},
		"translations.matrix":               {Method: router.GET, Path: "/matrix"},
		"translations.queue":                {Method: router.GET, Path: "/queue"},
		"translations.families":             {Method: router.GET, Path: "/families"},
		"translations.families.id":          {Method: router.GET, Path: "/families/:family_id"},
		"translations.families.assignments": {Method: router.GET, Path: "/families/:family_id/assignments"},
		"translations.assignments.edit":     {Method: router.GET, Path: "/assignments/:assignment_id/edit"},
	}
}

func ModuleAPIRouteDeclarations() map[string]routing.RouteDeclaration {
	return map[string]routing.RouteDeclaration{
		"translations.dashboard":                      {Method: router.GET, Path: "/dashboard"},
		"translations.matrix":                         {Method: router.GET, Path: "/matrix"},
		"translations.matrix.actions.create_missing":  {Method: router.POST, Path: "/matrix/actions/create-missing"},
		"translations.matrix.actions.export_selected": {Method: router.POST, Path: "/matrix/actions/export-selected"},
		"translations.families":                       {Method: router.GET, Path: "/families"},
		"translations.families.id":                    {Method: router.GET, Path: "/families/:family_id"},
		"translations.families.variants":              {Method: router.POST, Path: "/families/:family_id/variants"},
		"translations.sync.resources.id":              {Method: router.GET, Path: "/sync/resources/:kind/:id"},
		"translations.assignments":                    {Method: router.GET, Path: "/assignments"},
		"translations.assignments.family_assignments": {Method: router.GET, Path: "/families/:family_id/assignments"},
		"translations.assignments.id":                 {Method: router.GET, Path: "/assignments/:assignment_id"},
		"translations.assignments.preview":            {Method: router.GET, Path: "/assignments/:assignment_id/preview"},
		"translations.assignments.bulk_snapshot":      {Method: router.POST, Path: "/assignment-actions/snapshot"},
		"translations.assignments.bulk_actions":       {Method: router.POST, Path: "/assignment-actions/bulk"},
		"translations.assignments.actions":            {Method: router.POST, Path: "/assignments/:assignment_id/actions/:action"},
		"translations.export":                         {Method: router.POST, Path: "/exchange/export"},
		"translations.template":                       {Method: router.GET, Path: "/exchange/template"},
		"translations.import.validate":                {Method: router.POST, Path: "/exchange/import/validate"},
		"translations.import.apply":                   {Method: router.POST, Path: "/exchange/import/apply"},
		"translations.jobs.id":                        {Method: router.GET, Path: "/exchange/jobs/:job_id"},
		"translations.my_work":                        {Method: router.GET, Path: "/my-work"},
		"translations.queue":                          {Method: router.GET, Path: "/queue"},
	}
}

func AdminUIRoutes() map[string]string {
	routes := prefixRoutes("/translations", ModuleUIRoutes())
	routes["translations.assignments"] = "/content/translations"
	return routes
}

func AdminAPIRoutes() map[string]string {
	return prefixRoutes("/translations", ModuleAPIRoutes())
}

func ModuleContract() routing.ModuleContract {
	return ModuleContractForCapabilities(true, true, true)
}

// ModuleContractForCapabilities returns only the routes mounted by the
// enabled translation product surfaces.
func ModuleContractForCapabilities(coreEnabled, exchangeEnabled, queueEnabled bool) routing.ModuleContract {
	ui := ModuleUIRouteDeclarations()
	api := ModuleAPIRouteDeclarations()
	if !coreEnabled {
		ui = nil
		api = nil
	} else {
		filterDeclarations(ui, coreUIRouteKeys())
		filterDeclarations(api, coreAPIRouteKeys())
		if exchangeEnabled {
			mergeDeclarations(ui, declarationsForKeys(ModuleUIRouteDeclarations(), exchangeUIRouteKeys()))
			mergeDeclarations(api, declarationsForKeys(ModuleAPIRouteDeclarations(), exchangeAPIRouteKeys()))
		}
		if queueEnabled {
			mergeDeclarations(ui, declarationsForKeys(ModuleUIRouteDeclarations(), queueUIRouteKeys()))
			mergeDeclarations(api, declarationsForKeys(ModuleAPIRouteDeclarations(), queueAPIRouteKeys()))
		}
	}
	return routing.ModuleContract{
		Slug:                 ModuleSlug,
		RouteNamePrefix:      ModuleSlug,
		UIRoutes:             declarationPaths(ui),
		APIRoutes:            declarationPaths(api),
		UIRouteDeclarations:  ui,
		APIRouteDeclarations: api,
	}
}

func coreUIRouteKeys() []string {
	return []string{"translations.matrix", "translations.families", "translations.families.id"}
}

func exchangeUIRouteKeys() []string {
	return []string{"translations.exchange"}
}

func queueUIRouteKeys() []string {
	return []string{"translations.dashboard", "translations.queue", "translations.families.assignments", "translations.assignments.edit"}
}

func coreAPIRouteKeys() []string {
	return []string{
		"translations.matrix",
		"translations.matrix.actions.create_missing",
		"translations.matrix.actions.export_selected",
		"translations.families",
		"translations.families.id",
		"translations.families.variants",
		"translations.sync.resources.id",
	}
}

func exchangeAPIRouteKeys() []string {
	return []string{
		"translations.export",
		"translations.template",
		"translations.import.validate",
		"translations.import.apply",
		"translations.jobs.id",
	}
}

func queueAPIRouteKeys() []string {
	return []string{
		"translations.dashboard",
		"translations.assignments",
		"translations.assignments.family_assignments",
		"translations.assignments.id",
		"translations.assignments.preview",
		"translations.assignments.bulk_snapshot",
		"translations.assignments.bulk_actions",
		"translations.assignments.actions",
		"translations.my_work",
		"translations.queue",
	}
}

func filterDeclarations(declarations map[string]routing.RouteDeclaration, allowed []string) {
	allowedSet := make(map[string]struct{}, len(allowed))
	for _, key := range allowed {
		allowedSet[key] = struct{}{}
	}
	for key := range declarations {
		if _, ok := allowedSet[key]; !ok {
			delete(declarations, key)
		}
	}
}

func declarationsForKeys(source map[string]routing.RouteDeclaration, keys []string) map[string]routing.RouteDeclaration {
	out := make(map[string]routing.RouteDeclaration, len(keys))
	for _, key := range keys {
		if declaration, ok := source[key]; ok {
			out[key] = declaration
		}
	}
	return out
}

func mergeDeclarations(target, source map[string]routing.RouteDeclaration) {
	maps.Copy(target, source)
}

func declarationPaths(declarations map[string]routing.RouteDeclaration) map[string]string {
	routes := make(map[string]string, len(declarations))
	for key, declaration := range declarations {
		routes[key] = declaration.Path
	}
	return routes
}

func prefixRoutes(prefix string, routes map[string]string) map[string]string {
	prefix = routing.NormalizeRelativePath(prefix)
	if len(routes) == 0 {
		return nil
	}

	out := make(map[string]string, len(routes))
	for routeKey, routePath := range routes {
		out[routeKey] = routing.NormalizeRelativePath(prefix + routing.NormalizeRelativePath(routePath))
	}
	return out
}

func cloneRoutes(routes map[string]string) map[string]string {
	if len(routes) == 0 {
		return nil
	}

	out := make(map[string]string, len(routes))
	maps.Copy(out, routes)
	return out
}
