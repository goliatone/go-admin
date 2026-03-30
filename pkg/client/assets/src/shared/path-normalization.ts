export interface NormalizeAPIBasePathOptions {
  ensureAPISuffix?: boolean;
}

export function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

export function normalizeBasePath(basePath?: string): string {
  const trimmed = (basePath || '').trim();
  if (!trimmed || trimmed === '/') {
    return '';
  }
  return `/${trimmed.replace(/^\/+|\/+$/g, '')}`;
}

export function normalizeAPIBasePath(
  apiBasePath?: string,
  options: NormalizeAPIBasePathOptions = {}
): string {
  const trimmed = trimTrailingSlash((apiBasePath || '').trim());
  if (!trimmed) {
    return options.ensureAPISuffix ? '/api' : '';
  }
  if (options.ensureAPISuffix && !/\/api(\/|$)/.test(trimmed)) {
    return `${trimmed}/api`;
  }
  return trimmed;
}

export function deriveBasePathFromAPIEndpoint(endpoint: string): string {
  const candidate = endpoint.trim();
  if (!candidate) {
    return '';
  }
  const pathname = candidate.startsWith('http://') || candidate.startsWith('https://')
    ? new URL(candidate).pathname
    : candidate;
  return trimTrailingSlash(pathname.replace(/\/api(?:\/.*)?$/, ''));
}
