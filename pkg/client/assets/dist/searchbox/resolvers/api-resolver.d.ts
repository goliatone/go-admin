/**
 * API Resolver
 * Fetches search results from a REST API endpoint
 */
import type { SearchResult, SearchResolver, ApiResolverConfig } from '../types.js';
export declare class ApiResolver<T = unknown> implements SearchResolver<T> {
    private config;
    constructor(config: ApiResolverConfig<T>);
    search(query: string, signal?: AbortSignal): Promise<SearchResult<T>[]>;
    private buildUrl;
    /**
     * Update the endpoint URL
     */
    setEndpoint(endpoint: string): void;
    /**
     * Update additional query parameters
     */
    setParams(params: Record<string, string>): void;
    /**
     * Update request headers
     */
    setHeaders(headers: Record<string, string>): void;
}
/**
 * Create a resolver for go-crud list endpoints
 * Transforms standard go-crud pagination response to SearchResults
 */
export declare function createCrudResolver<T extends {
    id?: string;
    uuid?: string;
}>(endpoint: string, options: {
    labelField: keyof T | ((item: T) => string);
    descriptionField?: keyof T | ((item: T) => string);
    iconField?: keyof T;
    searchParam?: string;
    headers?: Record<string, string>;
}): ApiResolver<T>;
//# sourceMappingURL=api-resolver.d.ts.map