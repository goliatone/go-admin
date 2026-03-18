package routing

import (
	"fmt"
	"sort"
	"strconv"
	"strings"
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
	Conflicts      []Conflict       `json:"conflicts,omitempty"`
	Warnings       []string         `json:"warnings,omitempty"`
}

type RouteSummary struct {
	TotalRoutes  int      `json:"total_routes"`
	HostRoutes   int      `json:"host_routes"`
	ModuleRoutes int      `json:"module_routes"`
	Modules      []string `json:"modules,omitempty"`
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
	for _, entry := range normalizedManifest.Entries {
		if strings.HasPrefix(entry.Owner, "module:") {
			moduleRoutes++
			continue
		}
		hostRoutes++
	}

	conflictsCopy := append([]Conflict{}, conflicts...)
	warningsCopy := append([]string{}, warnings...)
	sortConflicts(conflictsCopy)
	sort.Strings(warningsCopy)

	return StartupReport{
		EffectiveRoots: NormalizeRoots(roots),
		Modules:        modulesCopy,
		RouteSummary: RouteSummary{
			TotalRoutes:  len(normalizedManifest.Entries),
			HostRoutes:   hostRoutes,
			ModuleRoutes: moduleRoutes,
			Modules:      moduleNames,
		},
		Conflicts: conflictsCopy,
		Warnings:  warningsCopy,
	}
}

func FormatStartupReport(report StartupReport) string {
	lines := []string{
		"routing report",
		"roots: admin=" + printablePath(report.EffectiveRoots.AdminRoot) +
			" api=" + printablePath(report.EffectiveRoots.APIRoot) +
			" public_api=" + printablePath(report.EffectiveRoots.PublicAPIRoot),
		"summary: total=" + strconv.Itoa(report.RouteSummary.TotalRoutes) +
			" host=" + strconv.Itoa(report.RouteSummary.HostRoutes) +
			" module=" + strconv.Itoa(report.RouteSummary.ModuleRoutes),
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

	return strings.Join(lines, "\n")
}

func printablePath(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return "-"
	}
	return value
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
