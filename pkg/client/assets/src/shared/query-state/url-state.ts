export function buildURL(pathname: string, params: URLSearchParams): string {
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function hasAbsoluteOrigin(pathname: string): boolean {
  return pathname.startsWith('http://') || pathname.startsWith('https://');
}

function createEndpointURL(endpoint: string): { absolute: boolean; url: URL } | null {
  const normalizedEndpoint = String(endpoint).trim();
  if (!normalizedEndpoint) {
    return null;
  }
  const absolute = hasAbsoluteOrigin(normalizedEndpoint);
  return {
    absolute,
    url: new URL(normalizedEndpoint, absolute ? undefined : 'http://localhost'),
  };
}

export function buildEndpointURL(
  endpoint: string,
  params: URLSearchParams,
  options: { preserveAbsolute?: boolean } = {}
): string {
  const resolved = createEndpointURL(endpoint);
  if (!resolved) {
    return '';
  }
  params.forEach((value, key) => {
    resolved.url.searchParams.set(key, value);
  });
  if (resolved.absolute && options.preserveAbsolute) {
    return resolved.url.toString();
  }
  return `${resolved.url.pathname}${resolved.url.search}`;
}

export function deleteSearchParams(params: URLSearchParams, keys: string[]): void {
  for (const key of keys) {
    params.delete(key);
  }
}

export function setSearchParam(params: URLSearchParams, key: string, value: unknown): void {
  if (value === null || value === undefined) {
    return;
  }
  const normalized = String(value);
  if (!normalized.trim()) {
    return;
  }
  params.set(key, normalized);
}

export function setNumberSearchParam(
  params: URLSearchParams,
  key: string,
  value: unknown,
  options: { min?: number } = {}
): void {
  if (value === null || value === undefined || value === '') {
    return;
  }
  const normalized = Number(value);
  if (!Number.isFinite(normalized)) {
    return;
  }
  if (options.min !== undefined && normalized < options.min) {
    return;
  }
  params.set(key, String(normalized));
}

export function setJoinedSearchParam(
  params: URLSearchParams,
  key: string,
  values: unknown,
  separator = ','
): void {
  if (!Array.isArray(values)) {
    return;
  }
  const normalized = values
    .map((value) => String(value).trim())
    .filter(Boolean);
  if (normalized.length === 0) {
    return;
  }
  params.set(key, normalized.join(separator));
}

export function getNumberSearchParam(params: URLSearchParams, key: string): number | undefined {
  const raw = params.get(key);
  if (!raw || !raw.trim()) {
    return undefined;
  }
  const normalized = Number(raw);
  return Number.isFinite(normalized) ? normalized : undefined;
}

export function getStringSearchParam(params: URLSearchParams, key: string): string | undefined {
  const raw = params.get(key);
  if (typeof raw !== 'string') {
    return undefined;
  }
  const normalized = raw.trim();
  return normalized ? normalized : undefined;
}

export function readLocationSearchParams(
  locationLike: { search?: string | null } | null | undefined = globalThis.location
): URLSearchParams | null {
  if (!locationLike || typeof locationLike.search !== 'string') {
    return null;
  }
  return new URLSearchParams(locationLike.search);
}

export function parseJSONParam<T>(raw: string | null, fallback: T): T {
  if (!raw) {
    return fallback;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
