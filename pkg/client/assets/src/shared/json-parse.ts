type JSONParseErrorHandler = (error: unknown) => void;

interface JSONScriptRoot {
  getElementById(id: string): { textContent?: string | null } | null;
}

interface JSONSelectorRoot {
  querySelector(selector: string): { textContent?: string | null } | null;
}

export function parseJSONValue<T>(
  raw: string | null | undefined,
  fallback: T,
  options: { onError?: JSONParseErrorHandler } = {}
): T {
  const normalized = typeof raw === 'string' ? raw.trim() : '';
  if (!normalized) {
    return fallback;
  }
  try {
    return JSON.parse(normalized) as T;
  } catch (error) {
    options.onError?.(error);
    return fallback;
  }
}

export function parseJSONArray<T>(
  raw: string | null | undefined,
  fallback: T[],
  options: { onError?: JSONParseErrorHandler } = {}
): T[] {
  const parsed = parseJSONValue<unknown>(raw, null, options);
  return Array.isArray(parsed) ? (parsed as T[]) : fallback;
}

export function readJSONScriptValue<T>(
  id: string,
  fallback: T | null = null,
  options: { root?: JSONScriptRoot; onError?: JSONParseErrorHandler } = {}
): T | null {
  const root = options.root ?? document;
  const element = root.getElementById(id);
  return parseJSONValue<T | null>(element?.textContent, fallback, options);
}

export function readJSONSelectorValue<T>(
  selector: string,
  fallback: T | null = null,
  options: { root?: JSONSelectorRoot; onError?: JSONParseErrorHandler } = {}
): T | null {
  const root = options.root ?? document;
  const element = root.querySelector(selector);
  return parseJSONValue<T | null>(element?.textContent, fallback, options);
}
