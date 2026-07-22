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
	return routing.ModuleContract{
		Slug:                 ModuleSlug,
		RouteNamePrefix:      ModuleSlug,
		UIRoutes:             ModuleUIRoutes(),
		APIRoutes:            ModuleAPIRoutes(),
		UIRouteDeclarations:  ModuleUIRouteDeclarations(),
		APIRouteDeclarations: ModuleAPIRouteDeclarations(),
	}
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
