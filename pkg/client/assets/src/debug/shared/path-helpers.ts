export function normalizeDebugBasePath(basePath?: string): string {
  const trimmed = (basePath || '').trim();
  if (!trimmed || trimmed === '/') {
    return '';
  }
  return `/${trimmed.replace(/^\/+|\/+$/g, '')}`;
}
