package routing

import (
	"errors"
	"fmt"
	"slices"
	"sort"
	"strings"
)

type URLKitAdapter interface {
	EnsureGroup(path string) error
	AddRoutes(path string, routes map[string]string) error
	RoutePath(group, route string) (string, error)
	RouteTemplate(group, route string) (string, error)
}

type Planner interface {
	RegisterModule(contract ModuleContract) error
	ResolvedModule(slug string) (ResolvedModule, bool)
	Validate() error
	Manifest() Manifest
	Report() StartupReport
}

const (
	SurfaceUI        = "ui"
	SurfaceAPI       = "api"
	SurfacePublicAPI = "public_api"
)

type planner struct {
	cfg      Config
	urls     URLKitAdapter
	modules  map[string]modulePlan
	order    []string
	manifest Manifest
	report   StartupReport
}

type modulePlan struct {
	contract ModuleContract
	resolved ResolvedModule
	entries  []ManifestEntry
}

func NewPlanner(cfg Config, urls URLKitAdapter) (Planner, error) {
	cfg.Roots = NormalizeRoots(cfg.Roots)
	cfg.Modules = normalizeModuleConfigs(cfg.Modules)
	cfg.Manifest = normalizeManifestConfig(cfg.Manifest)

	planner := &planner{
		cfg:     cfg,
		urls:    urls,
		modules: map[string]modulePlan{},
		order:   []string{},
	}
	planner.rebuildViews()

	return planner, planner.Validate()
}

func (p *planner) RegisterModule(contract ModuleContract) error {
	normalized, err := validateModuleContract(contract, p.cfg)
	if err != nil {
		return err
	}
	if _, exists := p.modules[normalized.Slug]; exists {
		return fmt.Errorf("module %q already registered", normalized.Slug)
	}

	resolved, entries, err := p.resolveModule(normalized)
	if err != nil {
		return err
	}

	candidate := modulePlan{
		contract: normalized,
		resolved: resolved,
		entries:  entries,
	}

	if err := p.validateCandidate(candidate); err != nil {
		p.refreshCandidateFailureReport(candidate, err)
		return err
	}
	if err := p.applyModuleRoutes(candidate); err != nil {
		p.refreshCandidateFailureReport(candidate, err)
		return err
	}

	p.modules[normalized.Slug] = candidate
	p.order = append(p.order, normalized.Slug)
	sort.Strings(p.order)
	p.rebuildViews()

	return p.Validate()
}

func (p *planner) ResolvedModule(slug string) (ResolvedModule, bool) {
	normalized := normalizePathSegment(slug)
	plan, ok := p.modules[normalized]
	if !ok {
		return ResolvedModule{}, false
	}
	return plan.resolved, true
}

func (p *planner) Validate() error {
	if err := validatePlannerRoots(p.cfg.Roots); err != nil {
		return err
	}

	validator := NewValidator(p.cfg.Roots)
	for _, slug := range p.order {
		plan := p.modules[slug]
		if err := validator.ValidateModule(plan.contract, plan.resolved, plan.entries); err != nil {
			p.refreshReport(validator.Conflicts())
			return err
		}
	}
	p.refreshReport(validator.Conflicts())

	return nil
}

func (p *planner) Manifest() Manifest {
	return NormalizeManifest(p.manifest)
}

func (p *planner) Report() StartupReport {
	report := p.report
	report.Modules = append([]ResolvedModule{}, p.report.Modules...)
	report.RouteSummary.Modules = append([]string{}, p.report.RouteSummary.Modules...)
	report.Conflicts = append([]Conflict{}, p.report.Conflicts...)
	report.Warnings = append([]string{}, p.report.Warnings...)
	return report
}

func (p *planner) resolveModule(contract ModuleContract) (ResolvedModule, []ManifestEntry, error) {
	mount := mergeMountOverrides(contract.Mount, p.cfg.Modules[contract.Slug].Mount)

	resolved := ResolvedModule{Slug: contract.Slug}
	entries := make([]ManifestEntry, 0, routeTableLen(contract))

	if len(contract.UIRoutes) > 0 {
		base, err := resolveSurfaceMount(p.cfg.Roots.AdminRoot, contract.Slug, mount.UIBase, SurfaceUI)
		if err != nil {
			return ResolvedModule{}, nil, err
		}
		resolved.UIMountBase = base
		resolved.UIGroupPath = deriveUIGroupPath()
		entries = append(entries, buildManifestEntries(contract.Slug, contract.RouteNamePrefix, SurfaceUI, resolved.UIGroupPath, resolved.UIMountBase, contract.UIRoutes)...)
	}

	if len(contract.APIRoutes) > 0 {
		base, err := resolveSurfaceMount(p.cfg.Roots.APIRoot, contract.Slug, mount.APIBase, SurfaceAPI)
		if err != nil {
			return ResolvedModule{}, nil, err
		}
		resolved.APIMountBase = base
		resolved.APIGroupPath = deriveAPIGroupPath(p.cfg.Roots)
		entries = append(entries, buildManifestEntries(contract.Slug, contract.RouteNamePrefix, SurfaceAPI, resolved.APIGroupPath, resolved.APIMountBase, contract.APIRoutes)...)
	}

	if len(contract.PublicAPIRoutes) > 0 {
		base, err := resolveSurfaceMount(p.cfg.Roots.PublicAPIRoot, contract.Slug, mount.PublicAPIBase, SurfacePublicAPI)
		if err != nil {
			return ResolvedModule{}, nil, err
		}
		resolved.PublicAPIMountBase = base
		resolved.PublicAPIGroupPath = derivePublicAPIGroupPath(p.cfg.Roots)
		entries = append(entries, buildManifestEntries(contract.Slug, contract.RouteNamePrefix, SurfacePublicAPI, resolved.PublicAPIGroupPath, resolved.PublicAPIMountBase, contract.PublicAPIRoutes)...)
	}

	sortManifestEntries(entries)
	return resolved, entries, nil
}

func (p *planner) rebuildViews() {
	modules := make([]ResolvedModule, 0, len(p.order))
	moduleNames := make([]string, 0, len(p.order))
	entries := make([]ManifestEntry, 0)

	for _, slug := range p.order {
		plan := p.modules[slug]
		modules = append(modules, plan.resolved)
		moduleNames = append(moduleNames, slug)
		if p.cfg.Manifest.Enabled && p.cfg.Manifest.IncludeModuleRoutes {
			entries = append(entries, plan.entries...)
		}
	}

	sortManifestEntries(entries)
	p.manifest = Manifest{Entries: entries}
	p.report = BuildStartupReport(p.cfg.Roots, modules, p.manifest, nil, plannerWarnings(p.cfg, p.urls))
}

func (p *planner) validateCandidate(candidate modulePlan) error {
	validator := NewValidator(p.cfg.Roots)
	for _, slug := range p.order {
		plan := p.modules[slug]
		if err := validator.ValidateModule(plan.contract, plan.resolved, plan.entries); err != nil {
			return err
		}
	}
	if err := validator.ValidateModule(candidate.contract, candidate.resolved, candidate.entries); err != nil {
		return err
	}
	return nil
}

func (p *planner) applyModuleRoutes(candidate modulePlan) error {
	if p.urls == nil {
		return nil
	}

	grouped := make(map[string]map[string]string)
	for _, entry := range candidate.entries {
		if strings.TrimSpace(entry.GroupPath) == "" || strings.TrimSpace(entry.RouteKey) == "" || strings.TrimSpace(entry.Path) == "" {
			continue
		}
		routes, ok := grouped[entry.GroupPath]
		if !ok {
			routes = map[string]string{}
			grouped[entry.GroupPath] = routes
		}
		routes[entry.RouteKey] = entry.Path
	}

	groups := make([]string, 0, len(grouped))
	for group := range grouped {
		groups = append(groups, group)
	}
	sort.Strings(groups)
	for _, group := range groups {
		if err := p.urls.EnsureGroup(group); err != nil {
			return err
		}
		pending := map[string]string{}
		for routeKey, routePath := range grouped[group] {
			templatePath, templateErr := p.urls.RouteTemplate(group, routeKey)
			resolvedPath, resolvedErr := p.urls.RoutePath(group, routeKey)
			if (templateErr == nil && strings.TrimSpace(templatePath) != "") || (resolvedErr == nil && strings.TrimSpace(resolvedPath) != "") {
				if routePathsEquivalent(group, templatePath, routePath, p.cfg.Roots) || routePathsEquivalent(group, resolvedPath, routePath, p.cfg.Roots) {
					continue
				}
				existingPath := strings.TrimSpace(resolvedPath)
				if existingPath == "" {
					existingPath = strings.TrimSpace(templatePath)
				}
				return conflictError([]Conflict{{
					Kind:      ConflictKindRouteNameConflict,
					Module:    candidate.contract.Slug,
					Path:      routePath,
					RouteName: buildSurfaceRouteName(group, routeKey, candidate.contract.Slug, candidate.contract.RouteNamePrefix),
					Existing: map[string]string{
						"group_path": group,
						"route_key":  routeKey,
						"path":       existingPath,
					},
					Incoming: map[string]string{
						"group_path": group,
						"route_key":  routeKey,
						"path":       routePath,
					},
					Message: fmt.Sprintf(
						"route conflict in group %q for route %q: existing=%q incoming=%q",
						group,
						routeKey,
						existingPath,
						routePath,
					),
				}})
			}
			pending[routeKey] = mutationRoutePath(group, routePath, p.cfg.Roots)
		}
		if len(pending) == 0 {
			continue
		}
		if err := p.urls.AddRoutes(group, pending); err != nil {
			return err
		}
	}
	return nil
}

func routePathsEquivalent(groupPath, existingPath, incomingPath string, roots RootsConfig) bool {
	existing := normalizeAbsolutePath(existingPath)
	incoming := normalizeAbsolutePath(incomingPath)
	if existing == incoming {
		return true
	}

	root := normalizeAbsolutePath(routeRootForGroup(groupPath, roots))
	if root == "" || incoming == "" {
		return false
	}
	return strings.TrimPrefix(incoming, root) == existing
}

func routeRootForGroup(groupPath string, roots RootsConfig) string {
	switch strings.TrimSpace(groupPath) {
	case deriveUIGroupPath():
		return roots.AdminRoot
	case deriveAPIGroupPath(roots):
		return roots.APIRoot
	case derivePublicAPIGroupPath(roots):
		return roots.PublicAPIRoot
	default:
		return ""
	}
}

func mutationRoutePath(groupPath, routePath string, roots RootsConfig) string {
	routePath = normalizeAbsolutePath(routePath)
	root := normalizeAbsolutePath(routeRootForGroup(groupPath, roots))
	if root == "" {
		return NormalizeRelativePath(routePath)
	}
	if routePath == root {
		return "/"
	}
	if strings.HasPrefix(routePath, root+"/") {
		return NormalizeRelativePath(strings.TrimPrefix(routePath, root))
	}
	return NormalizeRelativePath(routePath)
}

func (p *planner) refreshReport(conflicts []Conflict) {
	modules := make([]ResolvedModule, 0, len(p.order))
	for _, slug := range p.order {
		modules = append(modules, p.modules[slug].resolved)
	}
	p.report = BuildStartupReport(p.cfg.Roots, modules, p.manifest, conflicts, plannerWarnings(p.cfg, p.urls))
}

func (p *planner) refreshCandidateFailureReport(candidate modulePlan, err error) {
	modules := make([]ResolvedModule, 0, len(p.order))
	for _, slug := range p.order {
		modules = append(modules, p.modules[slug].resolved)
	}
	p.report = BuildStartupReport(
		p.cfg.Roots,
		modules,
		p.manifest,
		plannerConflictsFromError(err),
		plannerWarnings(p.cfg, p.urls),
	)
}

func plannerConflictsFromError(err error) []Conflict {
	var conflictErr *ConflictError
	if !errors.As(err, &conflictErr) || conflictErr == nil {
		return nil
	}
	return append([]Conflict{}, conflictErr.Conflicts...)
}

func validatePlannerRoots(roots RootsConfig) error {
	if roots.APIRoot == "" {
		return errors.New("api root is required")
	}
	return nil
}

func validateModuleContract(contract ModuleContract, cfg Config) (ModuleContract, error) {
	contract = NormalizeModuleContract(contract)
	if contract.Slug == "" {
		return ModuleContract{}, errors.New("module slug is required")
	}
	if cfg.EnforceSlugPolicy {
		if err := ValidateSlug(contract.Slug); err != nil {
			return ModuleContract{}, err
		}
	}
	if routeTableLen(contract) == 0 {
		return ModuleContract{}, fmt.Errorf("module %q must declare at least one route surface", contract.Slug)
	}

	for _, surface := range surfaceSpecs(contract) {
		if err := validateRouteTable(surface.slug, surface.name, surface.routes); err != nil {
			return ModuleContract{}, err
		}
	}

	return contract, nil
}

type surfaceSpec struct {
	slug   string
	name   string
	routes map[string]string
}

func surfaceSpecs(contract ModuleContract) []surfaceSpec {
	return []surfaceSpec{
		{slug: contract.Slug, name: SurfaceUI, routes: contract.UIRoutes},
		{slug: contract.Slug, name: SurfaceAPI, routes: contract.APIRoutes},
		{slug: contract.Slug, name: SurfacePublicAPI, routes: contract.PublicAPIRoutes},
	}
}

func validateRouteTable(slug, surface string, routes map[string]string) error {
	for routeKey, routePath := range routes {
		key := strings.TrimSpace(routeKey)
		if key == "" {
			return fmt.Errorf("%s route key is required", surface)
		}
		if !OwnsRouteKey(slug, key) {
			return fmt.Errorf("%s route key %q must be owned by slug %q", surface, key, slug)
		}
		if strings.TrimSpace(routePath) == "" {
			return fmt.Errorf("%s route %q must declare a relative path", surface, key)
		}
	}
	return nil
}

func resolveSurfaceMount(root, slug, override, surface string) (string, error) {
	root = normalizeAbsolutePath(root)
	override = normalizeAbsolutePath(override)

	if override != "" {
		if !pathWithinRoot(root, override) {
			return "", fmt.Errorf("%s mount %q must remain under host root %q", surface, override, root)
		}
		return override, nil
	}

	if surface == SurfacePublicAPI && root == "" {
		return "", errors.New("public_api root is required when public_api routes are declared")
	}

	return JoinAbsolutePath(root, slug), nil
}

func mergeMountOverrides(contract, host ModuleMountOverride) ModuleMountOverride {
	merged := contract
	if host.UIBase != "" {
		merged.UIBase = host.UIBase
	}
	if host.APIBase != "" {
		merged.APIBase = host.APIBase
	}
	if host.PublicAPIBase != "" {
		merged.PublicAPIBase = host.PublicAPIBase
	}
	return merged
}

func buildManifestEntries(slug, routeNamePrefix, surface, groupPath, mountBase string, routes map[string]string) []ManifestEntry {
	keys := make([]string, 0, len(routes))
	for routeKey := range routes {
		keys = append(keys, routeKey)
	}
	sort.Strings(keys)

	entries := make([]ManifestEntry, 0, len(keys))
	for _, routeKey := range keys {
		routePath := routes[routeKey]
		entries = append(entries, ManifestEntry{
			Owner:     "module:" + slug,
			Surface:   surface,
			RouteKey:  routeKey,
			RouteName: buildSurfaceRouteName(groupPath, routeKey, slug, routeNamePrefix),
			Method:    ManifestMethodUnknown,
			Path:      joinMountPath(mountBase, routePath),
			GroupPath: groupPath,
		})
	}

	return entries
}

func buildSurfaceRouteName(groupPath, routeKey, slug, routeNamePrefix string) string {
	groupPath = strings.TrimSpace(groupPath)
	routeKey = strings.TrimSpace(routeKey)
	if groupPath == "" {
		return routeKey
	}
	if routeKey == "" {
		return groupPath
	}

	namePrefix := NormalizeRouteNamePrefix(routeNamePrefix, slug)
	namePrefix = strings.Trim(namePrefix, ".")
	suffix := strings.TrimPrefix(routeKey, RouteKeyOwnershipPrefix(slug))
	suffix = strings.Trim(suffix, ".")
	if namePrefix == "" {
		return groupPath + "." + routeKey
	}
	if suffix == "" {
		return groupPath + "." + namePrefix
	}
	return groupPath + "." + namePrefix + "." + suffix
}

func joinMountPath(base, relative string) string {
	relative = NormalizeRelativePath(relative)
	if relative == "/" {
		return normalizeAbsolutePath(base)
	}
	return JoinAbsolutePath(base, relative)
}

func totalModuleRoutes(modules map[string]modulePlan) int {
	total := 0
	for _, plan := range modules {
		total += len(plan.entries)
	}
	return total
}

func routeTableLen(contract ModuleContract) int {
	return len(contract.UIRoutes) + len(contract.APIRoutes) + len(contract.PublicAPIRoutes)
}

func pathWithinRoot(root, candidate string) bool {
	root = normalizeAbsolutePath(root)
	candidate = normalizeAbsolutePath(candidate)
	if candidate == "" {
		return false
	}
	if root == "" {
		return strings.HasPrefix(candidate, "/")
	}
	return candidate == root || strings.HasPrefix(candidate, root+"/")
}

func deriveUIGroupPath() string {
	return "admin"
}

func deriveAPIGroupPath(roots RootsConfig) string {
	return deriveVersionedGroupPath("admin.api", inferSurfaceVersion(roots.AdminRoot, roots.APIRoot))
}

func derivePublicAPIGroupPath(roots RootsConfig) string {
	return deriveVersionedGroupPath("public.api", inferSurfaceVersion("", roots.PublicAPIRoot))
}

func deriveVersionedGroupPath(base, version string) string {
	version = normalizePathSegment(version)
	if version == "" {
		return base
	}
	return base + "." + version
}

func inferSurfaceVersion(parentRoot, surfaceRoot string) string {
	parentSegments := pathSegments(parentRoot)
	surfaceSegments := pathSegments(surfaceRoot)
	if len(surfaceSegments) == 0 {
		return ""
	}

	if len(parentSegments) > 0 && len(surfaceSegments) >= len(parentSegments) && slices.Equal(parentSegments, surfaceSegments[:len(parentSegments)]) {
		remainder := surfaceSegments[len(parentSegments):]
		if len(remainder) >= 2 {
			return remainder[len(remainder)-1]
		}
		return ""
	}

	if len(surfaceSegments) >= 2 {
		return surfaceSegments[len(surfaceSegments)-1]
	}

	return ""
}

func pathSegments(value string) []string {
	normalized := normalizeAbsolutePath(value)
	trimmed := strings.Trim(normalized, "/")
	if trimmed == "" {
		return nil
	}
	return strings.Split(trimmed, "/")
}

func sortManifestEntries(entries []ManifestEntry) {
	sort.Slice(entries, func(i, j int) bool {
		left := entries[i]
		right := entries[j]
		switch {
		case left.Owner != right.Owner:
			return left.Owner < right.Owner
		case left.Surface != right.Surface:
			return surfaceOrder(left.Surface) < surfaceOrder(right.Surface)
		case left.RouteKey != right.RouteKey:
			return left.RouteKey < right.RouteKey
		case left.Path != right.Path:
			return left.Path < right.Path
		default:
			return left.GroupPath < right.GroupPath
		}
	})
}

func surfaceOrder(surface string) int {
	switch surface {
	case SurfaceUI:
		return 0
	case SurfaceAPI:
		return 1
	case SurfacePublicAPI:
		return 2
	default:
		return 99
	}
}

func plannerWarnings(cfg Config, urls URLKitAdapter) []string {
	warnings := BuildAdapterWarnings(urls, nil)
	if !cfg.Manifest.Enabled {
		warnings = append(warnings, "routing manifest export is disabled")
	}
	return warnings
}

func DefaultUIGroupPath() string {
	return deriveUIGroupPath()
}

func AdminAPIGroupPath(roots RootsConfig) string {
	return deriveAPIGroupPath(NormalizeRoots(roots))
}

func PublicAPIGroupPath(roots RootsConfig) string {
	return derivePublicAPIGroupPath(NormalizeRoots(roots))
}
