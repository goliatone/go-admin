/**
 * Static Resolver
 * Searches through a static list of items in memory
 */
import type { SearchResult, SearchResolver, StaticResolverConfig } from '../types.js';
export declare class StaticResolver<T = unknown> implements SearchResolver<T> {
    private config;
    private items;
    constructor(config: StaticResolverConfig<T>);
    search(query: string, _signal?: AbortSignal): Promise<SearchResult<T>[]>;
    /**
     * Update the items to search
     */
    setItems(items: SearchResult<T>[]): void;
    /**
     * Add items to the list
     */
    addItems(items: SearchResult<T>[]): void;
    /**
     * Remove an item by ID
     */
    removeItem(id: string): void;
    /**
     * Get all items
     */
    getItems(): SearchResult<T>[];
}
/**
 * Create a static resolver from an array of simple objects
 */
export declare function createStaticResolver<T extends {
    id?: string;
    name?: string;
    label?: string;
}>(items: T[], options?: {
    labelField?: keyof T;
    descriptionField?: keyof T;
    idField?: keyof T;
}): StaticResolver<T>;
//# sourceMappingURL=static-resolver.d.ts.map