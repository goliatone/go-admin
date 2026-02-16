/**
 * Services Query State Manager
 * URL-synced filters, pagination, search, and reset behavior for list pages
 */
export interface QueryStateConfig {
    /** Default page number (default: 1) */
    defaultPage?: number;
    /** Default items per page (default: 25) */
    defaultPerPage?: number;
    /** Search debounce delay in ms (default: 300) */
    searchDelay?: number;
    /** Use replaceState instead of pushState (default: false) */
    useReplaceState?: boolean;
    /** Callback when state changes */
    onChange?: (state: QueryState) => void;
}
export interface QueryState<F = Record<string, string>> {
    page: number;
    per_page: number;
    search: string;
    filters: F;
    sort_field?: string;
    sort_order?: 'asc' | 'desc';
}
export interface QueryStateManagerOptions<F = Record<string, string>> {
    /** Configuration options */
    config?: QueryStateConfig;
    /** Filter field definitions with default values */
    filterFields?: (keyof F)[];
    /** Date fields that need RFC3339 conversion */
    dateFields?: (keyof F)[];
    /** Storage key for localStorage persistence (optional) */
    storageKey?: string;
}
export declare class QueryStateManager<F extends Record<string, string> = Record<string, string>> {
    private config;
    private filterFields;
    private dateFields;
    private storageKey;
    private state;
    private searchTimeout;
    private initialized;
    constructor(options?: QueryStateManagerOptions<F>);
    /**
     * Initialize the query state manager
     * Restores state from URL and/or localStorage
     */
    init(): QueryState<F>;
    /**
     * Get the current state
     */
    getState(): QueryState<F>;
    /**
     * Get state as API query parameters
     */
    getQueryParams(): Record<string, string | number>;
    /**
     * Set the current page
     */
    setPage(page: number): void;
    /**
     * Set items per page
     */
    setPerPage(perPage: number): void;
    /**
     * Set search term with debouncing
     */
    setSearch(search: string): void;
    /**
     * Set search term immediately (no debouncing)
     */
    setSearchImmediate(search: string): void;
    /**
     * Set a single filter value
     */
    setFilter<K extends keyof F>(key: K, value: F[K] | undefined): void;
    /**
     * Set multiple filters at once
     */
    setFilters(filters: Partial<F>): void;
    /**
     * Set sort field and order
     */
    setSort(field: string | undefined, order?: 'asc' | 'desc'): void;
    /**
     * Reset all state to defaults
     */
    reset(): void;
    /**
     * Reset filters only
     */
    resetFilters(): void;
    /**
     * Check if any filters are active
     */
    hasActiveFilters(): boolean;
    /**
     * Get the count of active filters
     */
    getActiveFilterCount(): number;
    /**
     * Navigate to next page
     */
    nextPage(): void;
    /**
     * Navigate to previous page
     */
    prevPage(): void;
    /**
     * Update pagination info based on API response
     */
    updateFromResponse(total: number, hasNext?: boolean): void;
    /**
     * Destroy the manager and clean up
     */
    destroy(): void;
    private restoreFromURL;
    private restoreFromStorage;
    private saveToStorage;
    private syncToURL;
    private notifyChange;
    private toRFC3339;
    private toLocalInput;
}
/**
 * Create a debounced function
 */
export declare function debounce<T extends (...args: unknown[]) => void>(fn: T, delay: number): {
    call: T;
    cancel: () => void;
};
/**
 * Build URLSearchParams from query state
 */
export declare function buildSearchParams<F extends Record<string, string>>(state: QueryState<F>, options?: {
    includePage?: boolean;
    includeDefaults?: boolean;
}): URLSearchParams;
/**
 * Parse URLSearchParams into query state
 */
export declare function parseSearchParams<F extends Record<string, string>>(params: URLSearchParams, filterFields: (keyof F)[], defaults?: Partial<QueryState<F>>): QueryState<F>;
//# sourceMappingURL=query-state.d.ts.map