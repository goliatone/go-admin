package quickstart

import (
	"github.com/goliatone/go-admin/admin"
	urlkit "github.com/goliatone/go-urlkit"
)

// ResolveAdminBasePath returns the admin base path using URLKit when available.
func ResolveAdminBasePath(urls urlkit.Resolver, fallback string) string {
	return resolveAdminBasePath(urls, fallback)
}

// ResolveAdminBaseURL returns the admin base URL using URLKit when available.
func ResolveAdminBaseURL(urls urlkit.Resolver, fallback string) string {
	return resolveAdminBaseURL(urls, fallback)
}

// ResolveAdminRoutePath returns a resolved admin route path using URLKit when available.
func ResolveAdminRoutePath(urls urlkit.Resolver, fallback, route string) string {
	return resolveAdminRoutePath(urls, fallback, route)
}

// ResolveAdminURL prefixes the admin base URL to the provided path.
func ResolveAdminURL(urls urlkit.Resolver, fallback, path string) string {
	return resolveAdminURL(urls, fallback, path)
}

// ResolveAdminPanelURL returns the canonical admin UI path for a panel.
func ResolveAdminPanelURL(urls urlkit.Resolver, fallback, panel string) string {
	return resolveAdminPanelURL(urls, fallback, panel)
}

// ResolveAdminPanelDetailURL returns the canonical admin UI detail path for a panel record.
func ResolveAdminPanelDetailURL(urls urlkit.Resolver, fallback, panel, id string) string {
	return resolveAdminPanelDetailURL(urls, fallback, panel, id)
}

// ResolveAdminPanelEditURL returns the canonical admin UI edit path for a panel record.
func ResolveAdminPanelEditURL(urls urlkit.Resolver, fallback, panel, id string) string {
	return resolveAdminPanelEditURL(urls, fallback, panel, id)
}

// ResolveAdminPanelPreviewURL returns the canonical admin UI preview path for a panel record.
func ResolveAdminPanelPreviewURL(urls urlkit.Resolver, fallback, panel, id string) string {
	return resolveAdminPanelPreviewURL(urls, fallback, panel, id)
}

// ResolveAdminAPIBasePath returns the base admin API path using URLKit when available.
func ResolveAdminAPIBasePath(urls urlkit.Resolver, cfg admin.Config, fallbackBase string) string {
	return resolveAdminAPIBasePath(urls, cfg, fallbackBase)
}

// ResolveAdminAPIGroupName returns the URLKit group name for admin API routes.
func ResolveAdminAPIGroupName(cfg admin.Config) string {
	return adminAPIGroupName(cfg)
}

// ResolveAdminPanelAPICollectionPath returns the canonical admin API collection path for a panel.
func ResolveAdminPanelAPICollectionPath(urls urlkit.Resolver, cfg admin.Config, fallbackBase, panel string) string {
	return resolveAdminPanelAPICollectionPath(urls, cfg, fallbackBase, panel)
}

// ResolveAdminPanelAPIDetailPath returns the canonical admin API detail path for a panel record.
func ResolveAdminPanelAPIDetailPath(urls urlkit.Resolver, cfg admin.Config, fallbackBase, panel, id string) string {
	return resolveAdminPanelAPIDetailPath(urls, cfg, fallbackBase, panel, id)
}
