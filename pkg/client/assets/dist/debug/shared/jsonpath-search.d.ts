export type SearchMode = 'simple' | 'jsonpath';
export type SearchResult = {
    path: string;
    value: unknown;
};
/**
 * Detect if a search string is a JSONPath expression
 * JSONPath expressions start with $ or contain path-like syntax (dots, brackets)
 */
export declare function isJsonPathExpression(search: string): boolean;
/**
 * Normalize a search string to a valid JSONPath expression
 */
export declare function normalizeToJsonPath(search: string): string;
/**
 * Search an object using JSONPath and return matching paths with values
 */
export declare function searchWithJsonPath(data: unknown, expression: string): SearchResult[];
/**
 * Filter an object to only include keys/paths matching the search
 * For simple searches, matches keys containing the search string
 * For JSONPath expressions, extracts matching subtrees
 */
export declare function filterObjectBySearch(data: Record<string, unknown>, search: string): Record<string, unknown>;
/**
 * Check if a search matches anywhere in the object (deep search)
 * Used for filtering arrays of objects
 */
export declare function objectMatchesSearch(data: unknown, search: string): boolean;
/**
 * Get a value from an object using a path string
 * Supports dot notation and bracket notation
 * e.g., "profile.roles[0].label"
 */
export declare function getByPath(data: unknown, path: string): unknown;
/**
 * Get all paths in an object (for autocomplete suggestions)
 */
export declare function getAllPaths(data: unknown, maxDepth?: number, prefix?: string): string[];
//# sourceMappingURL=jsonpath-search.d.ts.map