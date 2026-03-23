package admin

import "github.com/goliatone/go-admin/internal/pathutil"

func normalizeBasePath(basePath string) string {
	return pathutil.NormalizeBasePath(basePath)
}

func prefixBasePath(basePath, routePath string) string {
	return pathutil.PrefixBasePath(basePath, routePath)
}

func joinBasePath(basePath, routePath string) string {
	return pathutil.JoinBasePath(basePath, routePath)
}

func ensureLeadingSlashPath(path string) string {
	return pathutil.EnsureLeadingSlash(path)
}

func ensureLeadingSlash(path string) string {
	return pathutil.EnsureLeadingSlash(path)
}
