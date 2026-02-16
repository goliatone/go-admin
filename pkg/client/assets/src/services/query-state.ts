/**
 * Services Query State Manager
 * URL-synced filters, pagination, search, and reset behavior for list pages
 */

// =============================================================================
// Types
// =============================================================================

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

const DEFAULT_CONFIG: Required<Omit<QueryStateConfig, 'onChange'>> = {
  defaultPage: 1,
  defaultPerPage: 25,
  searchDelay: 300,
  useReplaceState: false,
};

// =============================================================================
// Query State Manager
// =============================================================================

export class QueryStateManager<F extends Record<string, string> = Record<string, string>> {
  private config: Required<Omit<QueryStateConfig, 'onChange'>> & Pick<QueryStateConfig, 'onChange'>;
  private filterFields: Set<keyof F>;
  private dateFields: Set<keyof F>;
  private storageKey: string | null;
  private state: QueryState<F>;
  private searchTimeout: ReturnType<typeof setTimeout> | null = null;
  private initialized = false;

  constructor(options: QueryStateManagerOptions<F> = {}) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...options.config,
    };
    this.filterFields = new Set(options.filterFields || []);
    this.dateFields = new Set(options.dateFields || []);
    this.storageKey = options.storageKey || null;

    // Initialize state with defaults
    this.state = {
      page: this.config.defaultPage,
      per_page: this.config.defaultPerPage,
      search: '',
      filters: {} as F,
    };
  }

  /**
   * Initialize the query state manager
   * Restores state from URL and/or localStorage
   */
  init(): QueryState<F> {
    if (this.initialized) {
      return this.state;
    }

    // First try to restore from URL (highest priority)
    this.restoreFromURL();

    // Then try localStorage for preferences like per_page
    this.restoreFromStorage();

    this.initialized = true;
    return this.state;
  }

  /**
   * Get the current state
   */
  getState(): QueryState<F> {
    return { ...this.state, filters: { ...this.state.filters } };
  }

  /**
   * Get state as API query parameters
   */
  getQueryParams(): Record<string, string | number> {
    const params: Record<string, string | number> = {};

    // Pagination
    params.page = this.state.page;
    params.per_page = this.state.per_page;

    // Search
    if (this.state.search) {
      params.q = this.state.search;
    }

    // Sort
    if (this.state.sort_field) {
      params.sort_field = this.state.sort_field;
      if (this.state.sort_order) {
        params.sort_order = this.state.sort_order;
      }
    }

    // Filters
    for (const [key, value] of Object.entries(this.state.filters)) {
      if (value !== undefined && value !== null && value !== '') {
        // Convert date fields to RFC3339
        if (this.dateFields.has(key as keyof F)) {
          const rfc3339 = this.toRFC3339(value);
          if (rfc3339) {
            params[key] = rfc3339;
          }
        } else {
          params[key] = value;
        }
      }
    }

    return params;
  }

  /**
   * Set the current page
   */
  setPage(page: number): void {
    const newPage = Math.max(1, page);
    if (this.state.page !== newPage) {
      this.state.page = newPage;
      this.syncToURL();
      this.notifyChange();
    }
  }

  /**
   * Set items per page
   */
  setPerPage(perPage: number): void {
    const newPerPage = Math.max(1, perPage);
    if (this.state.per_page !== newPerPage) {
      this.state.per_page = newPerPage;
      this.state.page = 1; // Reset to first page
      this.syncToURL();
      this.saveToStorage();
      this.notifyChange();
    }
  }

  /**
   * Set search term with debouncing
   */
  setSearch(search: string): void {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    this.searchTimeout = setTimeout(() => {
      if (this.state.search !== search) {
        this.state.search = search;
        this.state.page = 1; // Reset to first page
        this.syncToURL();
        this.notifyChange();
      }
    }, this.config.searchDelay);
  }

  /**
   * Set search term immediately (no debouncing)
   */
  setSearchImmediate(search: string): void {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    if (this.state.search !== search) {
      this.state.search = search;
      this.state.page = 1;
      this.syncToURL();
      this.notifyChange();
    }
  }

  /**
   * Set a single filter value
   */
  setFilter<K extends keyof F>(key: K, value: F[K] | undefined): void {
    const currentValue = this.state.filters[key];
    if (currentValue !== value) {
      if (value === undefined || value === null || value === '') {
        delete this.state.filters[key];
      } else {
        this.state.filters[key] = value;
      }
      this.state.page = 1; // Reset to first page
      this.syncToURL();
      this.notifyChange();
    }
  }

  /**
   * Set multiple filters at once
   */
  setFilters(filters: Partial<F>): void {
    let changed = false;

    for (const [key, value] of Object.entries(filters)) {
      const currentValue = this.state.filters[key as keyof F];
      if (currentValue !== value) {
        if (value === undefined || value === null || value === '') {
          delete this.state.filters[key as keyof F];
        } else {
          this.state.filters[key as keyof F] = value as F[keyof F];
        }
        changed = true;
      }
    }

    if (changed) {
      this.state.page = 1;
      this.syncToURL();
      this.notifyChange();
    }
  }

  /**
   * Set sort field and order
   */
  setSort(field: string | undefined, order: 'asc' | 'desc' = 'asc'): void {
    if (this.state.sort_field !== field || this.state.sort_order !== order) {
      this.state.sort_field = field;
      this.state.sort_order = field ? order : undefined;
      this.state.page = 1;
      this.syncToURL();
      this.notifyChange();
    }
  }

  /**
   * Reset all state to defaults
   */
  reset(): void {
    this.state = {
      page: this.config.defaultPage,
      per_page: this.state.per_page, // Keep per_page preference
      search: '',
      filters: {} as F,
    };
    this.syncToURL();
    this.notifyChange();
  }

  /**
   * Reset filters only
   */
  resetFilters(): void {
    if (Object.keys(this.state.filters).length > 0) {
      this.state.filters = {} as F;
      this.state.page = 1;
      this.syncToURL();
      this.notifyChange();
    }
  }

  /**
   * Check if any filters are active
   */
  hasActiveFilters(): boolean {
    return Object.values(this.state.filters).some(
      (v) => v !== undefined && v !== null && v !== ''
    );
  }

  /**
   * Get the count of active filters
   */
  getActiveFilterCount(): number {
    return Object.values(this.state.filters).filter(
      (v) => v !== undefined && v !== null && v !== ''
    ).length;
  }

  /**
   * Navigate to next page
   */
  nextPage(): void {
    this.setPage(this.state.page + 1);
  }

  /**
   * Navigate to previous page
   */
  prevPage(): void {
    this.setPage(this.state.page - 1);
  }

  /**
   * Update pagination info based on API response
   */
  updateFromResponse(total: number, hasNext?: boolean): void {
    // Check if current page exceeds total pages
    const totalPages = Math.ceil(total / this.state.per_page);
    if (this.state.page > totalPages && totalPages > 0) {
      this.setPage(totalPages);
    }
  }

  /**
   * Destroy the manager and clean up
   */
  destroy(): void {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
  }

  // ---------------------------------------------------------------------------
  // Private Methods
  // ---------------------------------------------------------------------------

  private restoreFromURL(): void {
    const params = new URLSearchParams(window.location.search);

    // Restore page
    const page = params.get('page');
    if (page) {
      const parsed = parseInt(page, 10);
      if (!Number.isNaN(parsed) && parsed > 0) {
        this.state.page = parsed;
      }
    }

    // Restore per_page
    const perPage = params.get('per_page');
    if (perPage) {
      const parsed = parseInt(perPage, 10);
      if (!Number.isNaN(parsed) && parsed > 0) {
        this.state.per_page = parsed;
      }
    }

    // Restore search
    const search = params.get('q') || params.get('search');
    if (search) {
      this.state.search = search;
    }

    // Restore sort
    const sortField = params.get('sort_field');
    const sortOrder = params.get('sort_order');
    if (sortField) {
      this.state.sort_field = sortField;
      this.state.sort_order = sortOrder === 'desc' ? 'desc' : 'asc';
    }

    // Restore filters
    for (const key of this.filterFields) {
      const value = params.get(String(key));
      if (value !== null) {
        // Handle date fields - convert from RFC3339 to local input format
        if (this.dateFields.has(key)) {
          this.state.filters[key] = this.toLocalInput(value) as F[typeof key];
        } else {
          this.state.filters[key] = value as F[typeof key];
        }
      }
    }
  }

  private restoreFromStorage(): void {
    if (!this.storageKey) return;

    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        // Only restore per_page preference from storage
        if (typeof data.per_page === 'number' && data.per_page > 0) {
          // URL takes precedence
          const params = new URLSearchParams(window.location.search);
          if (!params.has('per_page')) {
            this.state.per_page = data.per_page;
          }
        }
      }
    } catch (e) {
      console.warn('[QueryStateManager] Failed to restore from localStorage:', e);
    }
  }

  private saveToStorage(): void {
    if (!this.storageKey) return;

    try {
      localStorage.setItem(
        this.storageKey,
        JSON.stringify({ per_page: this.state.per_page })
      );
    } catch (e) {
      console.warn('[QueryStateManager] Failed to save to localStorage:', e);
    }
  }

  private syncToURL(): void {
    const params = new URLSearchParams();

    // Add page (only if not page 1)
    if (this.state.page > 1) {
      params.set('page', String(this.state.page));
    }

    // Add per_page (only if different from default)
    if (this.state.per_page !== this.config.defaultPerPage) {
      params.set('per_page', String(this.state.per_page));
    }

    // Add search
    if (this.state.search) {
      params.set('q', this.state.search);
    }

    // Add sort
    if (this.state.sort_field) {
      params.set('sort_field', this.state.sort_field);
      if (this.state.sort_order) {
        params.set('sort_order', this.state.sort_order);
      }
    }

    // Add filters
    for (const [key, value] of Object.entries(this.state.filters)) {
      if (value !== undefined && value !== null && value !== '') {
        // Convert date fields to RFC3339 for URL
        if (this.dateFields.has(key as keyof F)) {
          const rfc3339 = this.toRFC3339(value);
          if (rfc3339) {
            params.set(key, rfc3339);
          }
        } else {
          params.set(key, value);
        }
      }
    }

    // Update URL
    const newURL = params.toString()
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname;

    if (this.config.useReplaceState) {
      window.history.replaceState({}, '', newURL);
    } else {
      window.history.pushState({}, '', newURL);
    }
  }

  private notifyChange(): void {
    this.config.onChange?.(this.getState());
  }

  private toRFC3339(value: string): string {
    if (!value) return '';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '';
    return parsed.toISOString();
  }

  private toLocalInput(value: string): string {
    if (!value) return '';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    const offset = parsed.getTimezoneOffset() * 60000;
    return new Date(parsed.getTime() - offset).toISOString().slice(0, 16);
  }
}

// =============================================================================
// Helper Hooks
// =============================================================================

/**
 * Create a debounced function
 */
export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): { call: T; cancel: () => void } {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const debouncedFn = ((...args: unknown[]) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delay);
  }) as T;

  const cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return { call: debouncedFn, cancel };
}

/**
 * Build URLSearchParams from query state
 */
export function buildSearchParams<F extends Record<string, string>>(
  state: QueryState<F>,
  options?: { includePage?: boolean; includeDefaults?: boolean }
): URLSearchParams {
  const params = new URLSearchParams();
  const { includePage = true, includeDefaults = false } = options || {};

  if (includePage && (state.page > 1 || includeDefaults)) {
    params.set('page', String(state.page));
  }

  if (state.per_page !== 25 || includeDefaults) {
    params.set('per_page', String(state.per_page));
  }

  if (state.search) {
    params.set('q', state.search);
  }

  if (state.sort_field) {
    params.set('sort_field', state.sort_field);
    if (state.sort_order) {
      params.set('sort_order', state.sort_order);
    }
  }

  for (const [key, value] of Object.entries(state.filters)) {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, value);
    }
  }

  return params;
}

/**
 * Parse URLSearchParams into query state
 */
export function parseSearchParams<F extends Record<string, string>>(
  params: URLSearchParams,
  filterFields: (keyof F)[],
  defaults?: Partial<QueryState<F>>
): QueryState<F> {
  const state: QueryState<F> = {
    page: defaults?.page ?? 1,
    per_page: defaults?.per_page ?? 25,
    search: defaults?.search ?? '',
    filters: {} as F,
    ...defaults,
  };

  const page = params.get('page');
  if (page) {
    const parsed = parseInt(page, 10);
    if (!Number.isNaN(parsed)) {
      state.page = Math.max(1, parsed);
    }
  }

  const perPage = params.get('per_page');
  if (perPage) {
    const parsed = parseInt(perPage, 10);
    if (!Number.isNaN(parsed)) {
      state.per_page = Math.max(1, parsed);
    }
  }

  const search = params.get('q') || params.get('search');
  if (search) {
    state.search = search;
  }

  const sortField = params.get('sort_field');
  if (sortField) {
    state.sort_field = sortField;
    state.sort_order = params.get('sort_order') === 'desc' ? 'desc' : 'asc';
  }

  for (const key of filterFields) {
    const value = params.get(String(key));
    if (value !== null) {
      state.filters[key] = value as F[typeof key];
    }
  }

  return state;
}
