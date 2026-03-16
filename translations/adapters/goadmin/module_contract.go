package goadmin

import "maps"

import "github.com/goliatone/go-admin/admin/routing"

const ModuleSlug = "translations"

func ModuleUIRoutes() map[string]string {
	return cloneRoutes(map[string]string{
		"translations.dashboard":        "/dashboard",
		"translations.exchange":         "/exchange",
		"translations.matrix":           "/matrix",
		"translations.families.id":      "/families/:family_id",
		"translations.assignments.id":   "/assignments/:assignment_id",
		"translations.assignments.edit": "/assignments/:assignment_id/edit",
	})
}

func ModuleAPIRoutes() map[string]string {
	return cloneRoutes(map[string]string{
		"translations.dashboard":                      "/dashboard",
		"translations.matrix":                         "/matrix",
		"translations.matrix.actions.create_missing":  "/matrix/actions/create-missing",
		"translations.matrix.actions.export_selected": "/matrix/actions/export-selected",
		"translations.families":                       "/families",
		"translations.families.id":                    "/families/:family_id",
		"translations.families.variants":              "/families/:family_id/variants",
		"translations.variants.id":                    "/variants/:variant_id",
		"translations.assignments":                    "/assignments",
		"translations.assignments.id":                 "/assignments/:assignment_id",
		"translations.assignments.actions":            "/assignments/:assignment_id/actions/:action",
		"translations.export":                         "/exchange/export",
		"translations.template":                       "/exchange/template",
		"translations.import.validate":                "/exchange/import/validate",
		"translations.import.apply":                   "/exchange/import/apply",
		"translations.jobs.id":                        "/exchange/jobs/:job_id",
		"translations.my_work":                        "/my-work",
		"translations.queue":                          "/queue",
	})
}

func AdminUIRoutes() map[string]string {
	routes := prefixRoutes("/translations", ModuleUIRoutes())
	// The queue UI is panel-backed, so its canonical admin entrypoint lives under
	// the shared content surface rather than the translations module mount.
	routes["translations.queue"] = "/content/translations"
	return routes
}

func AdminAPIRoutes() map[string]string {
	return prefixRoutes("/translations", ModuleAPIRoutes())
}

func ModuleContract() routing.ModuleContract {
	return routing.ModuleContract{
		Slug:            ModuleSlug,
		RouteNamePrefix: ModuleSlug,
		UIRoutes:        ModuleUIRoutes(),
		APIRoutes:       ModuleAPIRoutes(),
	}
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
