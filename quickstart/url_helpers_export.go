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

// ResolveAdminAPIBasePath returns the base admin API path using URLKit when available.
func ResolveAdminAPIBasePath(urls urlkit.Resolver, cfg admin.Config, fallbackBase string) string {
	return resolveAdminAPIBasePath(urls, cfg, fallbackBase)
}

// ResolveAdminAPIGroupName returns the URLKit group name for admin API routes.
func ResolveAdminAPIGroupName(cfg admin.Config) string {
	return adminAPIGroupName(cfg)
}
