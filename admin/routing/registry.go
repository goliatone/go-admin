package routing

import (
	"fmt"
	"strings"

	router "github.com/goliatone/go-router"
)

type Registry struct {
	routeKeys   map[string]registryEntry
	routeNames  map[string]registryEntry
	methodPaths map[string]registryEntry
	conflicts   []Conflict
}

type registryEntry struct {
	Owner     string
	Module    string
	Surface   string
	GroupPath string
	RouteKey  string
	RouteName string
	Method    string
	Path      string
}

func NewRegistry() *Registry {
	return &Registry{
		routeKeys:   map[string]registryEntry{},
		routeNames:  map[string]registryEntry{},
		methodPaths: map[string]registryEntry{},
		conflicts:   nil,
	}
}

func (r *Registry) TrackManifestEntry(entry ManifestEntry) []Conflict {
	incoming := registryEntry{
		Owner:     strings.TrimSpace(entry.Owner),
		Module:    moduleFromOwner(entry.Owner),
		Surface:   strings.TrimSpace(entry.Surface),
		GroupPath: strings.TrimSpace(entry.GroupPath),
		RouteKey:  strings.TrimSpace(entry.RouteKey),
		RouteName: strings.TrimSpace(entry.RouteName),
		Method:    strings.ToUpper(strings.TrimSpace(entry.Method)),
		Path:      strings.TrimSpace(entry.Path),
	}
	return r.trackEntry(incoming)
}

func (r *Registry) TrackRouterRoute(owner, module string, route router.RouteDefinition) []Conflict {
	incoming := registryEntry{
		Owner:     strings.TrimSpace(owner),
		Module:    strings.TrimSpace(module),
		RouteName: strings.TrimSpace(route.Name),
		Method:    strings.ToUpper(strings.TrimSpace(string(route.Method))),
		Path:      strings.TrimSpace(route.Path),
	}
	return r.trackEntry(incoming)
}

func (r *Registry) Conflicts() []Conflict {
	if len(r.conflicts) == 0 {
		return nil
	}
	out := make([]Conflict, len(r.conflicts))
	copy(out, r.conflicts)
	return out
}

func (r *Registry) trackEntry(incoming registryEntry) []Conflict {
	conflicts := make([]Conflict, 0, 3)

	if key := routeKeyIndex(incoming.GroupPath, incoming.RouteKey); key != "" {
		if existing, ok := r.routeKeys[key]; ok {
			conflicts = append(conflicts, newRouteKeyConflict(existing, incoming))
		} else {
			r.routeKeys[key] = incoming
		}
	}

	if incoming.RouteName != "" {
		if existing, ok := r.routeNames[incoming.RouteName]; ok {
			conflicts = append(conflicts, newRouteNameConflict(existing, incoming))
		} else {
			r.routeNames[incoming.RouteName] = incoming
		}
	}

	if key := methodPathIndex(incoming.Method, incoming.Path); key != "" {
		if existing, ok := r.methodPaths[key]; ok {
			conflicts = append(conflicts, newMethodPathConflict(existing, incoming))
		} else {
			r.methodPaths[key] = incoming
		}
	}

	if len(conflicts) > 0 {
		r.conflicts = append(r.conflicts, conflicts...)
	}

	return conflicts
}

func routeKeyIndex(groupPath, routeKey string) string {
	groupPath = strings.TrimSpace(groupPath)
	routeKey = strings.TrimSpace(routeKey)
	if groupPath == "" || routeKey == "" {
		return ""
	}
	return groupPath + "|" + routeKey
}

func methodPathIndex(method, path string) string {
	method = strings.ToUpper(strings.TrimSpace(method))
	path = strings.TrimSpace(path)
	if method == "" || path == "" {
		return ""
	}
	return method + " " + path
}

func moduleFromOwner(owner string) string {
	owner = strings.TrimSpace(owner)
	if after, ok := strings.CutPrefix(owner, "module:"); ok {
		return after
	}
	return owner
}

func newRouteKeyConflict(existing, incoming registryEntry) Conflict {
	routeName := incoming.RouteName
	if routeName == "" {
		routeName = buildSurfaceRouteName(incoming.GroupPath, incoming.RouteKey, incoming.Module, "")
	}
	return Conflict{
		Kind:      ConflictKindRouteNameConflict,
		Module:    incoming.Module,
		Path:      incoming.Path,
		RouteName: routeName,
		Existing: map[string]string{
			"owner":      existing.Owner,
			"group_path": existing.GroupPath,
			"route_key":  existing.RouteKey,
			"path":       existing.Path,
		},
		Incoming: map[string]string{
			"owner":      incoming.Owner,
			"group_path": incoming.GroupPath,
			"route_key":  incoming.RouteKey,
			"path":       incoming.Path,
		},
		Message: fmt.Sprintf("route key conflict for %s.%s", incoming.GroupPath, incoming.RouteKey),
	}
}

func newRouteNameConflict(existing, incoming registryEntry) Conflict {
	return Conflict{
		Kind:      ConflictKindRouteNameConflict,
		Module:    incoming.Module,
		Path:      incoming.Path,
		RouteName: incoming.RouteName,
		Existing: map[string]string{
			"owner":      existing.Owner,
			"route_name": existing.RouteName,
			"path":       existing.Path,
		},
		Incoming: map[string]string{
			"owner":      incoming.Owner,
			"route_name": incoming.RouteName,
			"path":       incoming.Path,
		},
		Message: fmt.Sprintf("route name conflict for %s", incoming.RouteName),
	}
}

func newMethodPathConflict(existing, incoming registryEntry) Conflict {
	return Conflict{
		Kind:   ConflictKindPathConflict,
		Module: incoming.Module,
		Method: incoming.Method,
		Path:   incoming.Path,
		Existing: map[string]string{
			"owner":      existing.Owner,
			"route_name": existing.RouteName,
			"method":     existing.Method,
			"path":       existing.Path,
		},
		Incoming: map[string]string{
			"owner":      incoming.Owner,
			"route_name": incoming.RouteName,
			"method":     incoming.Method,
			"path":       incoming.Path,
		},
		Message: fmt.Sprintf("method/path conflict for %s %s", incoming.Method, incoming.Path),
	}
}
