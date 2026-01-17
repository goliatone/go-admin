// JSONPath search utility for debug panels
// Supports both simple key matching and complex JSONPath expressions like "profile.roles[0].label"

import { JSONPath } from 'jsonpath-plus';

export type SearchMode = 'simple' | 'jsonpath';

export type SearchResult = {
  path: string;
  value: unknown;
};

/**
 * Detect if a search string is a JSONPath expression
 * JSONPath expressions start with $ or contain path-like syntax (dots, brackets)
 */
export function isJsonPathExpression(search: string): boolean {
  if (!search) return false;
  // Starts with $ (explicit JSONPath)
  if (search.startsWith('$')) return true;
  // Contains array bracket notation like [0] or ['key']
  if (/\[\d+\]/.test(search) || /\[['"]/.test(search)) return true;
  // Contains dot notation with at least one segment (a.b but not "a.")
  if (/^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)+$/.test(search)) return true;
  // Contains wildcard or recursive descent
  if (search.includes('..') || search.includes('*')) return true;
  return false;
}

/**
 * Normalize a search string to a valid JSONPath expression
 */
export function normalizeToJsonPath(search: string): string {
  if (!search) return '$';
  // Already a JSONPath expression
  if (search.startsWith('$')) return search;
  // Prepend $. for path-like expressions
  return `$.${search}`;
}

/**
 * Search an object using JSONPath and return matching paths with values
 */
export function searchWithJsonPath(
  data: unknown,
  expression: string
): SearchResult[] {
  if (!data || !expression) return [];

  try {
    const normalizedExpr = normalizeToJsonPath(expression);
    const results = JSONPath({
      path: normalizedExpr,
      json: data as object,
      resultType: 'all',
    });

    return (results || []).map((result: { path: string; value: unknown }) => ({
      path: result.path || '',
      value: result.value,
    }));
  } catch {
    // Invalid expression, return empty
    return [];
  }
}

/**
 * Filter an object to only include keys/paths matching the search
 * For simple searches, matches keys containing the search string
 * For JSONPath expressions, extracts matching subtrees
 */
export function filterObjectBySearch(
  data: Record<string, unknown>,
  search: string
): Record<string, unknown> {
  if (!search || !data) {
    return data || {};
  }

  // Detect search mode
  const isJPath = isJsonPathExpression(search);
  console.log('[jsonpath-search] search:', search, 'isJsonPath:', isJPath);

  if (isJPath) {
    const result = filterByJsonPath(data, search);
    console.log('[jsonpath-search] JSONPath result:', result);
    return result;
  }

  // Simple key matching (original behavior)
  const result = filterByKeyMatch(data, search);
  console.log('[jsonpath-search] key match result:', result);
  return result;
}

/**
 * Simple key matching - filters top-level keys containing the search string
 */
function filterByKeyMatch(
  data: Record<string, unknown>,
  search: string
): Record<string, unknown> {
  const needle = search.toLowerCase();
  const out: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data || {})) {
    if (key.toLowerCase().includes(needle)) {
      out[key] = value;
    }
  }

  return out;
}

/**
 * JSONPath filtering - extracts matching subtrees preserving structure
 */
function filterByJsonPath(
  data: Record<string, unknown>,
  expression: string
): Record<string, unknown> {
  const results = searchWithJsonPath(data, expression);

  if (results.length === 0) {
    return {};
  }

  // If single result and it's a primitive, wrap it
  if (results.length === 1) {
    const { path, value } = results[0];
    // If the path is just "$", return the whole value
    if (path === '$' && typeof value === 'object' && value !== null) {
      return value as Record<string, unknown>;
    }
    // For simple paths, return the value directly if it's an object
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    // For arrays or primitives, wrap in a result object
    return { [extractLastPathSegment(path)]: value };
  }

  // Multiple results - build a results object
  const out: Record<string, unknown> = {};
  for (const { path, value } of results) {
    const key = extractLastPathSegment(path) || `result_${Object.keys(out).length}`;
    // Avoid key collisions by appending index
    if (key in out) {
      out[`${key}_${Object.keys(out).length}`] = value;
    } else {
      out[key] = value;
    }
  }

  return out;
}

/**
 * Extract the last segment from a JSONPath path string
 * e.g., "$['profile']['roles'][0]['label']" -> "label"
 */
function extractLastPathSegment(path: string): string {
  if (!path) return '';

  // Match the last bracket segment
  const bracketMatch = path.match(/\[['"]?([^'"[\]]+)['"]?\]$/);
  if (bracketMatch) {
    return bracketMatch[1];
  }

  // Match dot notation at the end
  const dotMatch = path.match(/\.([^.[\]]+)$/);
  if (dotMatch) {
    return dotMatch[1];
  }

  return path.replace(/^\$\.?/, '');
}

/**
 * Check if a search matches anywhere in the object (deep search)
 * Used for filtering arrays of objects
 */
export function objectMatchesSearch(
  data: unknown,
  search: string
): boolean {
  if (!search || data === null || data === undefined) {
    return !search;
  }

  if (isJsonPathExpression(search)) {
    const results = searchWithJsonPath(data, search);
    return results.length > 0;
  }

  // Simple text search - check if search appears anywhere in stringified JSON
  const needle = search.toLowerCase();
  const haystack = JSON.stringify(data).toLowerCase();
  return haystack.includes(needle);
}

/**
 * Get a value from an object using a path string
 * Supports dot notation and bracket notation
 * e.g., "profile.roles[0].label"
 */
export function getByPath(data: unknown, path: string): unknown {
  if (!data || !path) return undefined;

  try {
    const results = searchWithJsonPath(data, path);
    return results.length > 0 ? results[0].value : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Get all paths in an object (for autocomplete suggestions)
 */
export function getAllPaths(
  data: unknown,
  maxDepth = 5,
  prefix = ''
): string[] {
  const paths: string[] = [];

  if (maxDepth <= 0 || data === null || data === undefined) {
    return paths;
  }

  if (Array.isArray(data)) {
    // Add array indices
    data.slice(0, 10).forEach((item, index) => {
      const itemPath = prefix ? `${prefix}[${index}]` : `[${index}]`;
      paths.push(itemPath);
      paths.push(...getAllPaths(item, maxDepth - 1, itemPath));
    });
    if (data.length > 10) {
      paths.push(prefix ? `${prefix}[...]` : '[...]');
    }
  } else if (typeof data === 'object') {
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      const keyPath = prefix ? `${prefix}.${key}` : key;
      paths.push(keyPath);
      paths.push(...getAllPaths(value, maxDepth - 1, keyPath));
    }
  }

  return paths;
}
