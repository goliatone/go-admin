package routing

import (
	"fmt"
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
	Available      bool                     `json:"available"`
	State          router.RegistrationState `json:"state,omitempty"`
	Revision       uint64                   `json:"revision,omitempty"`
	DeclaredRoutes int                      `json:"declared_routes"`
	MountedRoutes  int                      `json:"mounted_routes"`
	MissingRoutes  []RuntimeRouteIssue      `json:"missing_routes,omitempty"`
	Shadows        []router.RouteShadow     `json:"shadows,omitempty"`
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
		Shadows:        router.AnalyzeRouteShadows(snapshot.MountedRoutes),
	}

	mounted := make(map[string]struct{}, len(snapshot.MountedRoutes))
	for _, route := range snapshot.MountedRoutes {
		mounted[runtimeRouteKey(string(route.Method), route.Path)] = struct{}{}
	}
	for _, entry := range NormalizeManifest(manifest).Entries {
		if entry.Method == "" || entry.Method == ManifestMethodUnknown || entry.Path == "" {
			continue
		}
		if _, ok := mounted[runtimeRouteKey(entry.Method, entry.Path)]; ok {
			continue
		}
		report.MissingRoutes = append(report.MissingRoutes, RuntimeRouteIssue{
			Owner:     entry.Owner,
			RouteName: entry.RouteName,
			Method:    entry.Method,
			Path:      entry.Path,
			Reason:    "declared manifest route is absent from the mounted route table",
		})
	}
	return report
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
	if len(report.RouteSummary.Domains) > 0 {
		parts := make([]string, 0, len(report.RouteSummary.Domains))
		for _, domain := range report.RouteSummary.Domains {
			parts = append(parts, domain+"="+strconv.Itoa(report.RouteSummary.DomainCounts[domain]))
		}
		lines = append(lines, "domains: "+strings.Join(parts, " "))
	}

	if len(report.Modules) == 0 {
		lines = append(lines, "modules: none")
	} else {
		lines = append(lines, "modules:")
		for _, module := range report.Modules {
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

	if len(report.Fallbacks) == 0 {
		lines = append(lines, "fallbacks: none")
	} else {
		lines = append(lines, "fallbacks:")
		for _, fallback := range report.Fallbacks {
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

	if len(report.Conflicts) == 0 {
		lines = append(lines, "conflicts: none")
	} else {
		lines = append(lines, "conflicts:")
		for _, conflict := range report.Conflicts {
			lines = append(lines, "  - "+strings.TrimSpace(conflict.Kind)+": "+strings.TrimSpace(conflict.Message))
		}
	}

	if len(report.Warnings) == 0 {
		lines = append(lines, "warnings: none")
	} else {
		lines = append(lines, "warnings:")
		for _, warning := range report.Warnings {
			lines = append(lines, "  - "+warning)
		}
	}

	if report.Runtime != nil {
		lines = append(lines, "runtime: state="+printablePath(string(report.Runtime.State))+
			" revision="+strconv.FormatUint(report.Runtime.Revision, 10)+
			" declared="+strconv.Itoa(report.Runtime.DeclaredRoutes)+
			" mounted="+strconv.Itoa(report.Runtime.MountedRoutes)+
			" missing="+strconv.Itoa(len(report.Runtime.MissingRoutes))+
			" shadowed="+strconv.Itoa(len(report.Runtime.Shadows)))
		for _, missing := range report.Runtime.MissingRoutes {
			lines = append(lines, "  - missing: "+missing.Method+" "+missing.Path+" owner="+printablePath(missing.Owner))
		}
		for _, shadow := range report.Runtime.Shadows {
			lines = append(lines, "  - shadowed: "+string(shadow.Method)+" "+shadow.Path+" by="+shadow.ShadowedByPath)
		}
	}

	return strings.Join(lines, "\n")
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
