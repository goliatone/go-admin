package protectedapp

import (
	"fmt"
	"net/http"
	"path"
	"strings"

	"github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/admin/routing"
	router "github.com/goliatone/go-router"
)

// ResolveUIRoot returns the canonical protected-app UI root for the admin config.
func ResolveUIRoot(cfg admin.Config) string {
	return routingRootsFromAdminConfig(cfg).ProtectedAppRoot
}

// ResolveAPIRoot returns the canonical protected-app API root for the admin config.
func ResolveAPIRoot(cfg admin.Config) string {
	return routingRootsFromAdminConfig(cfg).ProtectedAppAPIRoot
}

// ReservedPrefixes returns the protected-app prefixes that site fallback should reserve.
func ReservedPrefixes(cfg admin.Config) []string {
	return uniquePaths([]string{ResolveUIRoot(cfg), ResolveAPIRoot(cfg)})
}

// RegisterShell mounts the protected-app shell at the configured UI root.
func RegisterShell[T any](r router.Router[T], cfg admin.Config, handler router.HandlerFunc, mw ...router.MiddlewareFunc) error {
	if r == nil {
		return fmt.Errorf("protected app router is required")
	}
	if handler == nil {
		return fmt.Errorf("protected app shell handler is required")
	}
	uiRoot := ResolveUIRoot(cfg)
	if uiRoot == "" {
		return fmt.Errorf("protected app ui root is not configured")
	}
	r.Get(uiRoot, handler, mw...)
	r.Head(uiRoot, handler, mw...)
	return nil
}

// MountBundle mounts protected-app static assets under the provided prefix.
// When prefix is empty, assets default to <ui_root>/assets.
func MountBundle[T any](r router.Router[T], cfg admin.Config, prefix, root string, static ...router.Static) error {
	if r == nil {
		return fmt.Errorf("protected app router is required")
	}
	if strings.TrimSpace(root) == "" {
		return fmt.Errorf("protected app bundle root is required")
	}
	uiRoot := ResolveUIRoot(cfg)
	if uiRoot == "" {
		return fmt.Errorf("protected app ui root is not configured")
	}
	prefix = normalizePath(prefix)
	if prefix == "" {
		prefix = normalizePath(path.Join(uiRoot, "assets"))
	}
	r.Static(prefix, root, static...)
	return nil
}

// RegisterHistoryFallback mounts an SPA history fallback under the protected-app UI root.
// Reserved prefixes bypass the fallback and return 404 instead of rendering the shell.
func RegisterHistoryFallback[T any](r router.Router[T], cfg admin.Config, handler router.HandlerFunc, reservedPrefixes ...string) error {
	if r == nil {
		return fmt.Errorf("protected app router is required")
	}
	if handler == nil {
		return fmt.Errorf("protected app fallback handler is required")
	}
	uiRoot := ResolveUIRoot(cfg)
	if uiRoot == "" {
		return fmt.Errorf("protected app ui root is not configured")
	}
	if _, ok := unwrapRouterAdapter(any(r)).(*router.HTTPRouter); ok {
		return fmt.Errorf("protected app history fallback is not supported on httprouter-backed routers; use a fiber adapter or explicit app routes")
	}

	guardedPrefixes := historyFallbackReservedPrefixes(cfg, reservedPrefixes...)
	fallback := func(c router.Context) error {
		if shouldBypassHistoryFallback(c.Path(), uiRoot, guardedPrefixes) {
			return c.SendStatus(http.StatusNotFound)
		}
		return handler(c)
	}
	for _, routePath := range historyFallbackRoutePaths(r, uiRoot) {
		r.Get(routePath, fallback)
		r.Head(routePath, fallback)
	}
	return nil
}

func routingRootsFromAdminConfig(cfg admin.Config) routing.RootsConfig {
	return routing.NormalizeConfig(cfg.Routing, routing.RootDerivationInput{
		BasePath:            cfg.BasePath,
		ProtectedAppEnabled: cfg.Routing.ProtectedAppEnabled,
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
	}).Roots
}

func historyFallbackReservedPrefixes(cfg admin.Config, extra ...string) []string {
	uiRoot := ResolveUIRoot(cfg)
	prefixes := uniquePaths(append(ReservedPrefixes(cfg), extra...))
	if uiRoot == "" {
		return prefixes
	}
	out := make([]string, 0, len(prefixes))
	for _, prefix := range prefixes {
		if prefix == uiRoot {
			continue
		}
		out = append(out, prefix)
	}
	return out
}

func shouldBypassHistoryFallback(requestPath, uiRoot string, reservedPrefixes []string) bool {
	requestPath = normalizePath(requestPath)
	uiRoot = normalizePath(uiRoot)
	if requestPath == "" || uiRoot == "" || !matchesPrefix(requestPath, uiRoot) {
		return true
	}
	for _, prefix := range reservedPrefixes {
		if matchesPrefix(requestPath, prefix) {
			return true
		}
	}
	return false
}

func matchesPrefix(pathValue, prefix string) bool {
	pathValue = normalizePath(pathValue)
	prefix = normalizePath(prefix)
	if pathValue == "" || prefix == "" {
		return false
	}
	return pathValue == prefix || strings.HasPrefix(pathValue, prefix+"/")
}

func normalizePath(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return ""
	}
	if value == "/" {
		return "/"
	}
	return routing.JoinAbsolutePath("", value)
}

func uniquePaths(values []string) []string {
	if len(values) == 0 {
		return nil
	}
	seen := map[string]struct{}{}
	out := make([]string, 0, len(values))
	for _, value := range values {
		value = normalizePath(value)
		if value == "" {
			continue
		}
		if _, ok := seen[value]; ok {
			continue
		}
		seen[value] = struct{}{}
		out = append(out, value)
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

type routerAdapterUnwrapper interface {
	UnderlyingRouter() any
}

func historyFallbackRoutePaths[T any](r router.Router[T], uiRoot string) []string {
	uiRoot = normalizePath(uiRoot)
	if uiRoot == "" {
		return nil
	}
	switch unwrapRouterAdapter(any(r)).(type) {
	case *router.HTTPRouter:
		return []string{
			path.Join(uiRoot, ":path"),
			path.Join(uiRoot, ":path", "*rest"),
		}
	default:
		return []string{path.Join(uiRoot, "*")}
	}
}

func unwrapRouterAdapter(value any) any {
	for value != nil {
		unwrapper, ok := value.(routerAdapterUnwrapper)
		if !ok {
			return value
		}
		next := unwrapper.UnderlyingRouter()
		if next == nil || next == value {
			return value
		}
		value = next
	}
	return nil
}
