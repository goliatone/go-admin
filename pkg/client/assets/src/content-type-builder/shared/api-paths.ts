import {
  normalizeAPIBasePath as normalizeSharedAPIBasePath,
  trimTrailingSlash,
} from '../../shared/path-normalization.js';

export function resolveApiBasePath(...candidates: Array<string | undefined>): string {
  for (const candidate of candidates) {
    const trimmed = (candidate || '').trim();
    if (trimmed) return normalizeSharedAPIBasePath(trimmed, { ensureAPISuffix: true });
  }

  const docBase =
    document.documentElement?.getAttribute('data-api-base-path') ||
    document.body?.getAttribute('data-api-base-path');
  if (docBase && docBase.trim()) {
    return normalizeSharedAPIBasePath(docBase.trim(), { ensureAPISuffix: true });
  }

  const docAdminBase =
    document.documentElement?.getAttribute('data-base-path') ||
    document.body?.getAttribute('data-base-path');
  if (docAdminBase && docAdminBase.trim()) {
    return normalizeSharedAPIBasePath(docAdminBase.trim(), { ensureAPISuffix: true });
  }

  const debugConfig = (window as any)?.DEBUG_CONFIG;
  if (typeof debugConfig?.apiBasePath === 'string' && debugConfig.apiBasePath.trim()) {
    return normalizeSharedAPIBasePath(debugConfig.apiBasePath.trim(), { ensureAPISuffix: true });
  }
  if (typeof debugConfig?.basePath === 'string' && debugConfig.basePath.trim()) {
    return normalizeSharedAPIBasePath(debugConfig.basePath.trim(), { ensureAPISuffix: true });
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
