export function buildURL(pathname: string, params: URLSearchParams): string {
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
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
