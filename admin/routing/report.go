package routing

import (
	"fmt"
	"maps"
	"sort"
	"strconv"
	"strings"

	router "github.com/goliatone/go-router"
)

const (
	ConflictKindPathConflict       = "path_conflict"
	ConflictKindRouteNameConflict  = "route_name_conflict"
	ConflictKindOwnershipViolation = "ownership_violation"
	ConflictKindSlugViolation      = "slug_violation"
)

type StartupReport struct {
	EffectiveRoots RootsConfig      `json:"effective_roots"`
	Modules        []ResolvedModule `json:"modules,omitempty"`
	RouteSummary   RouteSummary     `json:"route_summary"`
	Fallbacks      []FallbackEntry  `json:"fallbacks,omitempty"`
	Conflicts      []Conflict       `json:"conflicts,omitempty"`
	Warnings       []string         `json:"warnings,omitempty"`
	Runtime        *RuntimeReport   `json:"runtime,omitempty"`
}

type RuntimeReport struct {
	Available          bool                     `json:"available"`
	State              router.RegistrationState `json:"state,omitempty"`
	Revision           uint64                   `json:"revision,omitempty"`
	DeclaredRoutes     int                      `json:"declared_routes"`
	MountedRoutes      int                      `json:"mounted_routes"`
	MissingRoutes      []RuntimeRouteIssue      `json:"missing_routes,omitempty"`
	UnverifiableRoutes []RuntimeRouteIssue      `json:"unverifiable_routes,omitempty"`
	Shadows            []router.RouteShadow     `json:"shadows,omitempty"`
}

type RuntimeRouteIssue struct {
	Owner     string `json:"owner,omitempty"`
	RouteName string `json:"route_name,omitempty"`
	Method    string `json:"method"`
	Path      string `json:"path"`
	Reason    string `json:"reason"`
}

func BuildRuntimeReport(manifest Manifest, snapshot router.RegistrationSnapshot) RuntimeReport {
	report := RuntimeReport{
		Available:      true,
		State:          snapshot.State,
		Revision:       snapshot.Revision,
		DeclaredRoutes: len(snapshot.DeclaredRoutes),
		MountedRoutes:  len(snapshot.MountedRoutes),
		Shadows:        router.AnalyzeRouteShadowsWithSemantics(snapshot.MountedRoutes, snapshot.MatchingSemantics),
	}

	mounted := make(map[string]struct{}, len(snapshot.MountedRoutes))
	mountedPaths := make(map[string]struct{}, len(snapshot.MountedRoutes))
	for _, route := range snapshot.MountedRoutes {
		mounted[runtimeRouteKey(string(route.Method), route.Path)] = struct{}{}
		mountedPaths[strings.TrimSpace(route.Path)] = struct{}{}
	}
	for _, entry := range NormalizeManifest(manifest).Entries {
		if entry.Path == "" {
			continue
		}
		if entry.Method == "" || entry.Method == ManifestMethodUnknown {
			if _, ok := mountedPaths[strings.TrimSpace(entry.Path)]; !ok {
				report.MissingRoutes = append(report.MissingRoutes, runtimeRouteIssue(entry, "legacy route declaration path is absent from the mounted route table; HTTP method is also unknown"))
				continue
			}
			report.UnverifiableRoutes = append(report.UnverifiableRoutes, runtimeRouteIssue(entry, "legacy route declaration has no HTTP method; path presence is verified but method reachability is unknown"))
			continue
		}
		if _, ok := mounted[runtimeRouteKey(entry.Method, entry.Path)]; ok {
			continue
		}
		report.MissingRoutes = append(report.MissingRoutes, runtimeRouteIssue(entry, "declared manifest route is absent from the mounted route table"))
	}
	return report
}

func runtimeRouteIssue(entry ManifestEntry, reason string) RuntimeRouteIssue {
	return RuntimeRouteIssue{
		Owner:     entry.Owner,
		RouteName: entry.RouteName,
		Method:    entry.Method,
		Path:      entry.Path,
		Reason:    reason,
	}
}

// CloneStartupReport returns an immutable-by-convention copy suitable for
// concurrent caches and diagnostics callers.
func CloneStartupReport(report StartupReport) StartupReport {
	report.Modules = append([]ResolvedModule(nil), report.Modules...)
	for index := range report.Modules {
		if len(report.Modules[index].Mounts) == 0 {
			continue
		}
		mounts := make(map[string]ResolvedMount, len(report.Modules[index].Mounts))
		maps.Copy(mounts, report.Modules[index].Mounts)
		report.Modules[index].Mounts = mounts
	}
	report.RouteSummary.Modules = append([]string(nil), report.RouteSummary.Modules...)
	report.RouteSummary.Domains = append([]string(nil), report.RouteSummary.Domains...)
	if report.RouteSummary.DomainCounts != nil {
		counts := make(map[string]int, len(report.RouteSummary.DomainCounts))
		maps.Copy(counts, report.RouteSummary.DomainCounts)
		report.RouteSummary.DomainCounts = counts
	}
	report.Fallbacks = append([]FallbackEntry(nil), report.Fallbacks...)
	for index := range report.Fallbacks {
		report.Fallbacks[index].AllowedMethods = append([]string(nil), report.Fallbacks[index].AllowedMethods...)
		report.Fallbacks[index].AllowedExactPaths = append([]string(nil), report.Fallbacks[index].AllowedExactPaths...)
		report.Fallbacks[index].AllowedPathPrefixes = append([]string(nil), report.Fallbacks[index].AllowedPathPrefixes...)
		report.Fallbacks[index].ReservedPrefixes = append([]string(nil), report.Fallbacks[index].ReservedPrefixes...)
	}
	report.Conflicts = append([]Conflict(nil), report.Conflicts...)
	for index := range report.Conflicts {
		report.Conflicts[index].Existing = cloneStringMap(report.Conflicts[index].Existing)
		report.Conflicts[index].Incoming = cloneStringMap(report.Conflicts[index].Incoming)
	}
	report.Warnings = append([]string(nil), report.Warnings...)
	if report.Runtime != nil {
		runtimeCopy := *report.Runtime
		runtimeCopy.MissingRoutes = append([]RuntimeRouteIssue(nil), report.Runtime.MissingRoutes...)
		runtimeCopy.UnverifiableRoutes = append([]RuntimeRouteIssue(nil), report.Runtime.UnverifiableRoutes...)
		runtimeCopy.Shadows = append([]router.RouteShadow(nil), report.Runtime.Shadows...)
		report.Runtime = &runtimeCopy
	}
	return report
}

func cloneStringMap(values map[string]string) map[string]string {
	if values == nil {
		return nil
	}
	out := make(map[string]string, len(values))
	maps.Copy(out, values)
	return out
}

func runtimeRouteKey(method, path string) string {
	return strings.ToUpper(strings.TrimSpace(method)) + " " + strings.TrimSpace(path)
}

type RouteSummary struct {
	TotalRoutes    int            `json:"total_routes"`
	HostRoutes     int            `json:"host_routes"`
	ModuleRoutes   int            `json:"module_routes"`
	FallbackRoutes int            `json:"fallback_routes"`
	Modules        []string       `json:"modules,omitempty"`
	Domains        []string       `json:"domains,omitempty"`
	DomainCounts   map[string]int `json:"domain_counts,omitempty"`
}

type Conflict struct {
	Kind      string            `json:"kind"`
	Module    string            `json:"module,omitempty"`
	Method    string            `json:"method,omitempty"`
	Path      string            `json:"path,omitempty"`
	RouteName string            `json:"route_name,omitempty"`
	Existing  map[string]string `json:"existing,omitempty"`
	Incoming  map[string]string `json:"incoming,omitempty"`
	Message   string            `json:"message,omitempty"`
}

type ConflictError struct {
	Conflicts []Conflict `json:"conflicts"`
}

func (e *ConflictError) Error() string {
	if e == nil || len(e.Conflicts) == 0 {
		return "routing validation failed"
	}

	messages := make([]string, 0, len(e.Conflicts))
	for _, conflict := range e.Conflicts {
		message := strings.TrimSpace(conflict.Message)
		if message == "" {
			message = fmt.Sprintf("%s conflict", strings.TrimSpace(conflict.Kind))
		}
		messages = append(messages, message)
	}

	return "routing validation failed: " + strings.Join(messages, "; ")
}

func conflictError(conflicts []Conflict) error {
	if len(conflicts) == 0 {
		return nil
	}

	copied := make([]Conflict, len(conflicts))
	copy(copied, conflicts)
	return &ConflictError{Conflicts: copied}
}

func BuildStartupReport(roots RootsConfig, modules []ResolvedModule, manifest Manifest, conflicts []Conflict, warnings []string) StartupReport {
	modulesCopy := append([]ResolvedModule{}, modules...)
	sort.Slice(modulesCopy, func(i, j int) bool {
		return modulesCopy[i].Slug < modulesCopy[j].Slug
	})

	moduleNames := make([]string, 0, len(modulesCopy))
	for _, module := range modulesCopy {
		moduleNames = append(moduleNames, module.Slug)
	}
	sort.Strings(moduleNames)

	normalizedManifest := NormalizeManifest(manifest)
	hostRoutes := 0
	moduleRoutes := 0
	domainCounts := map[string]int{}
	for _, entry := range normalizedManifest.Entries {
		if strings.HasPrefix(entry.Owner, "module:") {
			moduleRoutes++
		} else {
			hostRoutes++
		}
		domain := NormalizeRouteDomain(entry.Domain)
		if domain == "" {
			domain = DefaultRouteDomainForSurface(entry.Surface)
		}
		if domain != "" {
			domainCounts[domain]++
		}
	}
	for _, fallback := range normalizedManifest.Fallbacks {
		domain := NormalizeRouteDomain(fallback.Domain)
		if domain == "" {
			domain = DefaultRouteDomainForSurface(fallback.Surface)
		}
		if domain != "" {
			domainCounts[domain]++
		}
	}
	domains := make([]string, 0, len(domainCounts))
	for domain := range domainCounts {
		domains = append(domains, domain)
	}
	sort.Strings(domains)
	fallbacks := append([]FallbackEntry{}, normalizedManifest.Fallbacks...)

	conflictsCopy := append([]Conflict{}, conflicts...)
	warningsCopy := append([]string{}, warnings...)
	sortConflicts(conflictsCopy)
	sort.Strings(warningsCopy)

	return StartupReport{
		EffectiveRoots: NormalizeRoots(roots),
		Modules:        modulesCopy,
		RouteSummary: RouteSummary{
			TotalRoutes:    len(normalizedManifest.Entries),
			HostRoutes:     hostRoutes,
			ModuleRoutes:   moduleRoutes,
			FallbackRoutes: len(fallbacks),
			Modules:        moduleNames,
			Domains:        domains,
			DomainCounts:   domainCounts,
		},
		Fallbacks: fallbacks,
		Conflicts: conflictsCopy,
		Warnings:  warningsCopy,
	}
}

func FormatStartupReport(report StartupReport) string {
	lines := []string{
		"routing report",
		"roots: admin=" + printablePath(report.EffectiveRoots.AdminRoot) +
			" api=" + printablePath(report.EffectiveRoots.APIRoot) +
			" public_api=" + printablePath(report.EffectiveRoots.PublicAPIRoot) +
			" protected_app=" + printablePath(report.EffectiveRoots.ProtectedAppRoot) +
			" protected_app_api=" + printablePath(report.EffectiveRoots.ProtectedAppAPIRoot),
		"summary: total=" + strconv.Itoa(report.RouteSummary.TotalRoutes) +
			" host=" + strconv.Itoa(report.RouteSummary.HostRoutes) +
			" module=" + strconv.Itoa(report.RouteSummary.ModuleRoutes) +
			" fallback=" + strconv.Itoa(report.RouteSummary.FallbackRoutes),
	}
	lines = appendReportDomains(lines, report.RouteSummary)
	lines = appendReportModules(lines, report.Modules)
	lines = appendReportFallbacks(lines, report.Fallbacks)
	lines = appendReportConflicts(lines, report.Conflicts)
	lines = appendReportWarnings(lines, report.Warnings)
	lines = appendRuntimeReport(lines, report.Runtime)

	return strings.Join(lines, "\n")
}

func appendReportDomains(lines []string, summary RouteSummary) []string {
	if len(summary.Domains) > 0 {
		parts := make([]string, 0, len(summary.Domains))
		for _, domain := range summary.Domains {
			parts = append(parts, domain+"="+strconv.Itoa(summary.DomainCounts[domain]))
		}
		lines = append(lines, "domains: "+strings.Join(parts, " "))
	}
	return lines
}

func appendReportModules(lines []string, modules []ResolvedModule) []string {
	if len(modules) == 0 {
		lines = append(lines, "modules: none")
	} else {
		lines = append(lines, "modules:")
		for _, module := range modules {
			lines = append(lines, "  - "+module.Slug+
				" ui="+printablePath(module.UIMountBase)+
				" api="+printablePath(module.APIMountBase)+
				" public_api="+printablePath(module.PublicAPIMountBase))
			if len(module.Mounts) > 0 {
				names := make([]string, 0, len(module.Mounts))
				for name := range module.Mounts {
					names = append(names, name)
				}
				sort.Strings(names)
				for _, name := range names {
					mount := module.Mounts[name]
					lines = append(lines, "      mount="+name+
						" surface="+printablePath(mount.Surface)+
						" base="+printablePath(mount.Base)+
						" group="+printablePath(mount.GroupPath))
				}
			}
		}
	}
	return lines
}

func appendReportFallbacks(lines []string, fallbacks []FallbackEntry) []string {
	if len(fallbacks) == 0 {
		lines = append(lines, "fallbacks: none")
	} else {
		lines = append(lines, "fallbacks:")
		for _, fallback := range fallbacks {
			fallback = NormalizeFallbackEntry(fallback)
			lines = append(lines,
				"  - owner="+printablePath(fallback.Owner)+
					" surface="+printablePath(fallback.Surface)+
					" domain="+printablePath(fallback.Domain)+
					" base="+printablePath(fallbackBaseRoot(fallback))+
					" mode="+printablePath(fallback.Mode)+
					" allow_root="+strconv.FormatBool(fallback.AllowRoot)+
					" methods="+printableList(fallback.AllowedMethods)+
					" exact="+printableList(fallback.AllowedExactPaths)+
					" prefixes="+printableList(fallback.AllowedPathPrefixes)+
					" reserved="+printableList(fallback.ReservedPrefixes),
			)
		}
	}
	return lines
}

func appendReportConflicts(lines []string, conflicts []Conflict) []string {
	if len(conflicts) == 0 {
		lines = append(lines, "conflicts: none")
	} else {
		lines = append(lines, "conflicts:")
		for _, conflict := range conflicts {
			lines = append(lines, "  - "+strings.TrimSpace(conflict.Kind)+": "+strings.TrimSpace(conflict.Message))
		}
	}
	return lines
}

func appendReportWarnings(lines []string, warnings []string) []string {
	if len(warnings) == 0 {
		lines = append(lines, "warnings: none")
	} else {
		lines = append(lines, "warnings:")
		for _, warning := range warnings {
			lines = append(lines, "  - "+warning)
		}
	}
	return lines
}

func appendRuntimeReport(lines []string, runtimeReport *RuntimeReport) []string {
	if runtimeReport != nil {
		lines = append(lines, "runtime: state="+printablePath(string(runtimeReport.State))+
			" revision="+strconv.FormatUint(runtimeReport.Revision, 10)+
			" declared="+strconv.Itoa(runtimeReport.DeclaredRoutes)+
			" mounted="+strconv.Itoa(runtimeReport.MountedRoutes)+
			" missing="+strconv.Itoa(len(runtimeReport.MissingRoutes))+
			" unverifiable="+strconv.Itoa(len(runtimeReport.UnverifiableRoutes))+
			" shadowed="+strconv.Itoa(len(runtimeReport.Shadows)))
		for _, missing := range runtimeReport.MissingRoutes {
			lines = append(lines, "  - missing: "+missing.Method+" "+missing.Path+" owner="+printablePath(missing.Owner))
		}
		for _, unverifiable := range runtimeReport.UnverifiableRoutes {
			lines = append(lines, "  - unverifiable: "+unverifiable.Method+" "+unverifiable.Path+" owner="+printablePath(unverifiable.Owner))
		}
		for _, shadow := range runtimeReport.Shadows {
			lines = append(lines, "  - shadowed: "+string(shadow.Method)+" "+shadow.Path+" by="+shadow.ShadowedByPath)
		}
	}
	return lines
}

func printablePath(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return "-"
	}
	return value
}

func printableList(values []string) string {
	if len(values) == 0 {
		return "-"
	}
	return strings.Join(values, ",")
}

func sortConflicts(conflicts []Conflict) {
	sort.Slice(conflicts, func(i, j int) bool {
		left := conflicts[i]
		right := conflicts[j]
		switch {
		case left.Kind != right.Kind:
			return left.Kind < right.Kind
		case left.Module != right.Module:
			return left.Module < right.Module
		case left.RouteName != right.RouteName:
			return left.RouteName < right.RouteName
		case left.Method != right.Method:
			return left.Method < right.Method
		default:
			return left.Path < right.Path
		}
	})
}
