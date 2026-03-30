export function normalizeMenuBuilderPath(basePath: string, path: string, emptyFallback = basePath): string {
  if (!path) {
    return emptyFallback;
  }
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  if (path.startsWith('/')) {
    return path;
  }
  return `${basePath.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}

export function normalizeMenuBuilderRoute(basePath: string, path: string): string {
  return normalizeMenuBuilderPath(basePath, path, '');
}

export function normalizeMenuBuilderAPIBasePath(basePath: string, candidate: string): string {
  const fallback = `${basePath.replace(/\/+$/, '')}/api`;
  const resolved = normalizeMenuBuilderPath(basePath, candidate || fallback, fallback);
  if (/\/api(\/|$)/.test(resolved)) {
    return resolved;
  }
  return `${resolved.replace(/\/+$/, '')}/api`;
}
