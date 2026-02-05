function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function normalizeApiBasePath(value: string): string {
  const raw = value.trim();
  if (!raw) return '';
  const trimmed = trimTrailingSlash(raw);
  if (!trimmed) return '/api';
  if (/\/api(\/|$)/.test(trimmed)) return trimmed;
  return `${trimmed}/api`;
}

export function resolveApiBasePath(...candidates: Array<string | undefined>): string {
  for (const candidate of candidates) {
    const trimmed = (candidate || '').trim();
    if (trimmed) return normalizeApiBasePath(trimmed);
  }

  const docBase =
    document.documentElement?.getAttribute('data-api-base-path') ||
    document.body?.getAttribute('data-api-base-path');
  if (docBase && docBase.trim()) {
    return normalizeApiBasePath(docBase.trim());
  }

  const docAdminBase =
    document.documentElement?.getAttribute('data-base-path') ||
    document.body?.getAttribute('data-base-path');
  if (docAdminBase && docAdminBase.trim()) {
    return normalizeApiBasePath(docAdminBase.trim());
  }

  const debugConfig = (window as any)?.DEBUG_CONFIG;
  if (typeof debugConfig?.apiBasePath === 'string' && debugConfig.apiBasePath.trim()) {
    return normalizeApiBasePath(debugConfig.apiBasePath.trim());
  }
  if (typeof debugConfig?.basePath === 'string' && debugConfig.basePath.trim()) {
    return normalizeApiBasePath(debugConfig.basePath.trim());
  }

  return '';
}

export function deriveAdminBasePath(apiBasePath: string, fallbackBasePath?: string): string {
  const fallback = (fallbackBasePath || '').trim();
  if (fallback) return trimTrailingSlash(fallback);

  const trimmed = trimTrailingSlash((apiBasePath || '').trim());
  if (!trimmed) return '';

  const match = trimmed.match(/^(.*)\/api(?:\/[^/]+)?$/);
  if (match) return match[1] || '';
  return trimmed;
}
