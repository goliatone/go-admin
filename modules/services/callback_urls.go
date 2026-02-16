package services

import (
	"fmt"
	"net/url"
	"strings"

	router "github.com/goliatone/go-router"
	urlkit "github.com/goliatone/go-urlkit"
)

const defaultConnectionCallbackRoutePath = "/services/connections/:provider/callback"

func (m *Module) ensureCallbackURLRoute() error {
	if m == nil || m.admin == nil {
		return nil
	}
	manager, ok := m.admin.URLs().(*urlkit.RouteManager)
	if !ok || manager == nil {
		return nil
	}

	group := m.callbackURLRouteGroup()
	route := strings.TrimSpace(m.config.Callbacks.DefaultRoute)
	if group == "" || route == "" {
		return nil
	}

	if _, err := manager.RouteTemplate(group, route); err == nil {
		return nil
	}

	if _, err := manager.AddRoutes(group, map[string]string{
		route: defaultConnectionCallbackRoutePath,
	}); err != nil {
		return fmt.Errorf("modules/services: register callback route %q in group %q: %w", route, group, err)
	}

	return nil
}

func (m *Module) resolveCallbackRedirectURI(c router.Context, providerID string) (string, error) {
	providerID = strings.TrimSpace(providerID)
	if providerID == "" {
		return "", fmt.Errorf("modules/services: provider id is required to resolve callback URL")
	}

	if overrideURL := m.callbackURLOverride(providerID); overrideURL != "" {
		return overrideURL, nil
	}

	group := m.callbackURLRouteGroup()
	route := m.callbackURLRoute(providerID)
	resolved := ""
	resolveErr := error(nil)
	if m != nil && m.admin != nil && m.admin.URLs() != nil && group != "" && route != "" {
		resolved, resolveErr = m.admin.URLs().Resolve(group, route, map[string]any{
			"provider": providerID,
			"ref":      providerID,
			"id":       providerID,
		}, nil)
		if resolveErr != nil && m.config.Callbacks.Strict {
			return "", fmt.Errorf(
				"modules/services: resolve callback route %q in group %q for provider %q: %w",
				route,
				group,
				providerID,
				resolveErr,
			)
		}
	}

	resolved = strings.TrimSpace(resolved)
	if resolved == "" {
		resolved = m.defaultCallbackPath(providerID)
	}
	if resolved == "" {
		if resolveErr != nil {
			return "", fmt.Errorf("modules/services: resolve callback URL for provider %q: %w", providerID, resolveErr)
		}
		return "", fmt.Errorf("modules/services: callback path is required for provider %q", providerID)
	}

	absoluteURL, err := m.absoluteCallbackURL(c, resolved)
	if err != nil {
		if m != nil && m.config.Callbacks.Strict {
			return "", err
		}
		return resolved, nil
	}
	return absoluteURL, nil
}

func (m *Module) callbackURLRouteGroup() string {
	if m == nil {
		return ""
	}
	if trimmed := strings.TrimSpace(m.config.Callbacks.URLKitGroup); trimmed != "" {
		return trimmed
	}
	if m.admin == nil {
		return ""
	}
	return strings.TrimSpace(m.admin.AdminAPIGroup())
}

func (m *Module) callbackURLRoute(providerID string) string {
	if m == nil {
		return ""
	}
	if route := callbackMapLookup(m.config.Callbacks.ProviderRoutes, providerID); route != "" {
		return route
	}
	return strings.TrimSpace(m.config.Callbacks.DefaultRoute)
}

func (m *Module) callbackURLOverride(providerID string) string {
	if m == nil {
		return ""
	}
	return callbackMapLookup(m.config.Callbacks.ProviderURLOverrides, providerID)
}

func (m *Module) defaultCallbackPath(providerID string) string {
	if m == nil || m.admin == nil {
		return ""
	}
	base := strings.TrimRight(strings.TrimSpace(m.admin.AdminAPIBasePath()), "/")
	if base == "" {
		return ""
	}
	providerID = strings.TrimSpace(providerID)
	if providerID == "" {
		return ""
	}
	return base + "/services/connections/" + url.PathEscape(providerID) + "/callback"
}

func (m *Module) absoluteCallbackURL(c router.Context, rawURL string) (string, error) {
	rawURL = strings.TrimSpace(rawURL)
	if rawURL == "" {
		return "", fmt.Errorf("modules/services: callback URL is required")
	}

	if parsed, err := url.Parse(rawURL); err == nil && parsed != nil && parsed.IsAbs() && strings.TrimSpace(parsed.Host) != "" {
		return parsed.String(), nil
	}

	if base := strings.TrimSpace(m.config.Callbacks.PublicBaseURL); base != "" {
		resolved, err := joinAbsoluteURL(base, rawURL)
		if err != nil {
			return "", fmt.Errorf("modules/services: resolve callback URL with callbacks.public_base_url: %w", err)
		}
		return resolved, nil
	}

	if origin := callbackRequestOrigin(c); origin != "" {
		resolved, err := joinAbsoluteURL(origin, rawURL)
		if err != nil {
			return "", fmt.Errorf("modules/services: resolve callback URL from request origin: %w", err)
		}
		return resolved, nil
	}

	if m != nil && m.config.Callbacks.Strict {
		return "", fmt.Errorf("modules/services: unable to resolve absolute callback URL for %q", rawURL)
	}

	return rawURL, nil
}

func callbackMapLookup(values map[string]string, key string) string {
	if len(values) == 0 {
		return ""
	}
	key = strings.TrimSpace(key)
	if key == "" {
		return ""
	}
	if value := strings.TrimSpace(values[key]); value != "" {
		return value
	}
	for candidate, value := range values {
		if strings.EqualFold(strings.TrimSpace(candidate), key) {
			return strings.TrimSpace(value)
		}
	}
	return ""
}

func callbackRequestOrigin(c router.Context) string {
	if c == nil {
		return ""
	}

	scheme := firstCSVValue(c.Header("X-Forwarded-Proto"))
	if scheme == "" {
		scheme = firstCSVValue(c.Header("X-Forwarded-Scheme"))
	}

	host := firstCSVValue(c.Header("X-Forwarded-Host"))
	if host == "" {
		host = strings.TrimSpace(c.Header("Host"))
	}

	if httpCtx, ok := c.(router.HTTPContext); ok && httpCtx != nil {
		request := httpCtx.Request()
		if request != nil {
			if host == "" {
				host = strings.TrimSpace(request.Host)
			}
			if scheme == "" && request.URL != nil {
				scheme = strings.TrimSpace(request.URL.Scheme)
			}
			if scheme == "" && request.TLS != nil {
				scheme = "https"
			}
		}
	}

	if scheme == "" {
		if strings.EqualFold(strings.TrimSpace(c.Header("X-Forwarded-SSL")), "on") {
			scheme = "https"
		} else {
			scheme = "http"
		}
	}

	if host == "" {
		return ""
	}
	return strings.ToLower(strings.TrimSpace(scheme)) + "://" + host
}

func firstCSVValue(raw string) string {
	parts := strings.Split(strings.TrimSpace(raw), ",")
	if len(parts) == 0 {
		return ""
	}
	return strings.TrimSpace(parts[0])
}

func joinAbsoluteURL(baseURL string, pathOrURL string) (string, error) {
	baseURL = strings.TrimSpace(baseURL)
	pathOrURL = strings.TrimSpace(pathOrURL)
	if baseURL == "" {
		return "", fmt.Errorf("base URL is required")
	}

	base, err := url.Parse(baseURL)
	if err != nil {
		return "", fmt.Errorf("parse base URL: %w", err)
	}
	if base == nil || !base.IsAbs() || strings.TrimSpace(base.Host) == "" {
		return "", fmt.Errorf("base URL must be absolute")
	}

	if pathOrURL == "" {
		return base.String(), nil
	}

	pathRef, err := url.Parse(pathOrURL)
	if err != nil {
		return "", fmt.Errorf("parse callback path/url: %w", err)
	}
	if pathRef != nil && pathRef.IsAbs() && strings.TrimSpace(pathRef.Host) != "" {
		return pathRef.String(), nil
	}

	joined := *base
	joined.Path = joinURLPaths(base.Path, pathRef.Path)
	joined.RawQuery = pathRef.RawQuery
	joined.Fragment = pathRef.Fragment

	return joined.String(), nil
}

func joinURLPaths(basePath string, nextPath string) string {
	basePath = strings.Trim(strings.TrimSpace(basePath), "/")
	nextPath = strings.Trim(strings.TrimSpace(nextPath), "/")

	switch {
	case basePath == "" && nextPath == "":
		return "/"
	case basePath == "":
		return "/" + nextPath
	case nextPath == "":
		return "/" + basePath
	default:
		return "/" + basePath + "/" + nextPath
	}
}
