package admin

import (
	"slices"
	"strings"

	"github.com/goliatone/go-admin/admin/routing"
	router "github.com/goliatone/go-router"
	urlkit "github.com/goliatone/go-urlkit"
)

func routingRootDerivationInput(cfg Config) routing.RootDerivationInput {
	return routing.RootDerivationInput{
		BasePath: cfg.BasePath,
		URLs: routing.URLConfig{
			Admin: routing.URLNamespaceConfig{
				BasePath:   cfg.URLs.Admin.BasePath,
				APIPrefix:  cfg.URLs.Admin.APIPrefix,
				APIVersion: cfg.URLs.Admin.APIVersion,
			},
			Public: routing.URLNamespaceConfig{
				BasePath:   cfg.URLs.Public.BasePath,
				APIPrefix:  cfg.URLs.Public.APIPrefix,
				APIVersion: cfg.URLs.Public.APIVersion,
			},
		},
	}
}

func newRoutingPlanner(cfg Config, manager *urlkit.RouteManager) (routing.Planner, routing.StartupReport, error) {
	adapter := newURLKitRoutingAdapter(manager)
	planner, err := routing.NewPlanner(cfg.Routing, adapter)
	if err != nil {
		return nil, routing.StartupReport{}, err
	}
	report := planner.Report()
	return planner, report, nil
}

func (a *Admin) validateRouting() error {
	if a == nil || a.routingPlanner == nil {
		return nil
	}
	if err := a.routingPlanner.Validate(); err != nil {
		a.refreshRoutingReport()
		return err
	}
	a.refreshRoutingReport()
	return nil
}

func (a *Admin) logRoutingStartupReport(stage string, err error) {
	if a == nil {
		return
	}

	a.refreshRoutingReport()
	report := a.RoutingReport()
	attrs := []any{
		"stage", strings.TrimSpace(stage),
		"admin_root", strings.TrimSpace(report.EffectiveRoots.AdminRoot),
		"api_root", strings.TrimSpace(report.EffectiveRoots.APIRoot),
		"public_api_root", strings.TrimSpace(report.EffectiveRoots.PublicAPIRoot),
		"summary", map[string]any{
			"total_routes":    report.RouteSummary.TotalRoutes,
			"host_routes":     report.RouteSummary.HostRoutes,
			"module_routes":   report.RouteSummary.ModuleRoutes,
			"fallback_routes": report.RouteSummary.FallbackRoutes,
			"modules":         append([]string{}, report.RouteSummary.Modules...),
		},
		"modules", routingLogModules(report.Modules),
		"fallbacks", routingLogFallbacks(report.Fallbacks),
		"conflicts", routingLogConflicts(report.Conflicts),
		"warnings", append([]string{}, report.Warnings...),
		"report", routing.FormatStartupReport(report),
	}
	if err != nil {
		attrs = append(attrs, "error", err)
		a.loggerFor("admin.routing").Error("routing startup report", attrs...)
		return
	}
	a.loggerFor("admin.routing").Info("routing startup report", attrs...)
}

func routingLogModules(modules []routing.ResolvedModule) []map[string]string {
	if len(modules) == 0 {
		return nil
	}
	out := make([]map[string]string, 0, len(modules))
	for _, module := range modules {
		out = append(out, map[string]string{
			"slug":             strings.TrimSpace(module.Slug),
			"ui":               strings.TrimSpace(module.UIMountBase),
			"api":              strings.TrimSpace(module.APIMountBase),
			"public_api":       strings.TrimSpace(module.PublicAPIMountBase),
			"ui_group":         strings.TrimSpace(module.UIGroupPath),
			"api_group":        strings.TrimSpace(module.APIGroupPath),
			"public_api_group": strings.TrimSpace(module.PublicAPIGroupPath),
		})
	}
	return out
}

func routingLogConflicts(conflicts []routing.Conflict) []map[string]any {
	if len(conflicts) == 0 {
		return nil
	}
	out := make([]map[string]any, 0, len(conflicts))
	for _, conflict := range conflicts {
		out = append(out, map[string]any{
			"kind":       strings.TrimSpace(conflict.Kind),
			"module":     strings.TrimSpace(conflict.Module),
			"method":     strings.TrimSpace(conflict.Method),
			"path":       strings.TrimSpace(conflict.Path),
			"route_name": strings.TrimSpace(conflict.RouteName),
			"message":    strings.TrimSpace(conflict.Message),
		})
	}
	return out
}

func routingLogFallbacks(fallbacks []routing.FallbackEntry) []map[string]any {
	if len(fallbacks) == 0 {
		return nil
	}
	out := make([]map[string]any, 0, len(fallbacks))
	for _, fallback := range fallbacks {
		fallback = routing.NormalizeFallbackEntry(fallback)
		out = append(out, map[string]any{
			"owner":                 strings.TrimSpace(fallback.Owner),
			"surface":               strings.TrimSpace(fallback.Surface),
			"domain":                strings.TrimSpace(fallback.Domain),
			"base_path":             strings.TrimSpace(fallback.BasePath),
			"mode":                  strings.TrimSpace(fallback.Mode),
			"allow_root":            fallback.AllowRoot,
			"allowed_methods":       append([]string{}, fallback.AllowedMethods...),
			"allowed_exact_paths":   append([]string{}, fallback.AllowedExactPaths...),
			"allowed_path_prefixes": append([]string{}, fallback.AllowedPathPrefixes...),
			"reserved_prefixes":     append([]string{}, fallback.ReservedPrefixes...),
		})
	}
	return out
}

type urlKitRoutingAdapter struct {
	manager *urlkit.RouteManager
}

func newURLKitRoutingAdapter(manager *urlkit.RouteManager) urlKitRoutingAdapter {
	return urlKitRoutingAdapter{manager: manager}
}

func (a urlKitRoutingAdapter) RoutingURLKitCapabilities() routing.URLKitCapabilities {
	if provider, ok := any(a.manager).(routing.URLKitCapabilityProvider); ok {
		return provider.RoutingURLKitCapabilities()
	}
	return routing.URLKitCapabilities{}
}

func (a urlKitRoutingAdapter) EnsureGroup(path string) error {
	if a.manager == nil {
		return nil
	}
	_, err := a.manager.EnsureGroup(strings.TrimSpace(path))
	return err
}

func (a urlKitRoutingAdapter) AddRoutes(path string, routes map[string]string) error {
	if a.manager == nil {
		return nil
	}
	_, _, err := a.manager.AddRoutes(strings.TrimSpace(path), routes)
	return err
}

func (a urlKitRoutingAdapter) RoutePath(group, route string) (string, error) {
	if a.manager == nil {
		return "", nil
	}
	return a.manager.RoutePath(strings.TrimSpace(group), strings.TrimSpace(route))
}

func (a urlKitRoutingAdapter) RouteTemplate(group, route string) (string, error) {
	if a.manager == nil {
		return "", nil
	}
	return a.manager.RouteTemplate(strings.TrimSpace(group), strings.TrimSpace(route))
}

type runtimeRouterAdapter interface {
	Routes() []router.RouteDefinition
	ValidateRoutes() []error
}

type adminRouterRoutingAdapter struct {
	router runtimeRouterAdapter
}

func newAdminRouterRoutingAdapter(r AdminRouter) *adminRouterRoutingAdapter {
	if r == nil {
		return nil
	}
	adapter, ok := any(r).(runtimeRouterAdapter)
	if !ok {
		return nil
	}
	return &adminRouterRoutingAdapter{router: adapter}
}

func (a *adminRouterRoutingAdapter) Routes() []router.RouteDefinition {
	if a == nil || a.router == nil {
		return nil
	}
	return a.router.Routes()
}

func (a *adminRouterRoutingAdapter) ValidateRoutes() []error {
	if a == nil || a.router == nil {
		return nil
	}
	return a.router.ValidateRoutes()
}

func (a *adminRouterRoutingAdapter) RoutingRouterCapabilities() routing.RouterCapabilities {
	if a == nil || a.router == nil {
		return routing.RouterCapabilities{}
	}
	if provider, ok := any(a.router).(routing.RouterCapabilityProvider); ok {
		return provider.RoutingRouterCapabilities()
	}
	return routing.RouterCapabilities{}
}

func (a *Admin) refreshRoutingReport() {
	if a == nil || a.routingPlanner == nil {
		return
	}
	base := a.routingPlanner.Report()
	warnings := mergeRoutingWarnings(
		base.Warnings,
		routing.BuildAdapterWarnings(newURLKitRoutingAdapter(a.urlManager), newAdminRouterRoutingAdapter(a.router)),
	)
	a.routingReport = routing.BuildStartupReport(
		base.EffectiveRoots,
		base.Modules,
		a.routingPlanner.Manifest(),
		base.Conflicts,
		warnings,
	)
}

// RefreshRoutingReport recomputes the cached routing report after planner mutations.
func (a *Admin) RefreshRoutingReport() routing.StartupReport {
	if a == nil {
		return routing.StartupReport{}
	}
	a.refreshRoutingReport()
	return a.RoutingReport()
}

func mergeRoutingWarnings(groups ...[]string) []string {
	seen := map[string]struct{}{}
	out := make([]string, 0)
	for _, warnings := range groups {
		for _, warning := range warnings {
			warning = strings.TrimSpace(warning)
			if warning == "" {
				continue
			}
			if _, ok := seen[warning]; ok {
				continue
			}
			seen[warning] = struct{}{}
			out = append(out, warning)
		}
	}
	slices.Sort(out)
	if len(out) == 0 {
		return nil
	}
	return out
}
