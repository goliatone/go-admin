/**
 * SearchBox Types
 * Generic interfaces for reusable search functionality
 */

/**
 * Generic search result item
 */
export interface SearchResult<T = unknown> {
  /** Unique identifier for the result */
  id: string;
  /** Display label for the result */
  label: string;
  /** Optional secondary text/description */
  description?: string;
  /** Optional icon name or URL */
  icon?: string;
  /** Optional metadata for custom rendering */
  metadata?: Record<string, unknown>;
  /** The original data item */
  data: T;
}

/**
 * Search resolver interface - fetches results for a query
 */
export interface SearchResolver<T = unknown> {
  /**
   * Search for results matching the query
   * @param query - The search query string
   * @param signal - Optional AbortSignal for cancellation
   * @returns Promise resolving to array of search results
   */
  search(query: string, signal?: AbortSignal): Promise<SearchResult<T>[]>;
}

/**
 * Result renderer interface - renders a single search result
 */
export interface ResultRenderer<T = unknown> {
  /**
   * Render a search result as HTML string
   * @param result - The search result to render
   * @param isSelected - Whether this result is currently selected
   * @returns HTML string for the result item
   */
  render(result: SearchResult<T>, isSelected: boolean): string;
}

/**
 * SearchBox configuration options
 */
export interface SearchBoxConfig<T = unknown> {
  /** The input element or selector */
  input: HTMLInputElement | string;
  /** Container for the dropdown (defaults to parent of input) */
  container?: HTMLElement | string;
  /** Search resolver to use */
  resolver: SearchResolver<T>;
  /** Result renderer to use */
  renderer: ResultRenderer<T>;
  /** Minimum characters before searching (default: 2) */
  minChars?: number;
  /** Debounce delay in ms (default: 300) */
  debounceMs?: number;
  /** Placeholder text for the input */
  placeholder?: string;
  /** Text to show when no results found */
  emptyText?: string;
  /** Text to show while loading */
  loadingText?: string;
  /** Maximum results to display (default: 10) */
  maxResults?: number;
  /** Additional CSS classes for the dropdown */
  dropdownClass?: string;
  /** Callback when a result is selected */
  onSelect?: (result: SearchResult<T>) => void;
  /** Callback when the input is cleared */
  onClear?: () => void;
  /** Callback when search starts */
  onSearchStart?: (query: string) => void;
  /** Callback when search completes */
  onSearchComplete?: (results: SearchResult<T>[]) => void;
  /** Callback on search error */
  onError?: (error: Error) => void;
}

/**
 * SearchBox state
 */
export interface SearchBoxState<T = unknown> {
  /** Current query string */
  query: string;
  /** Current results */
  results: SearchResult<T>[];
  /** Index of currently selected result (-1 if none) */
  selectedIndex: number;
  /** Whether the dropdown is visible */
  isOpen: boolean;
  /** Whether a search is in progress */
  isLoading: boolean;
  /** Current error if any */
  error: Error | null;
}

/**
 * API resolver configuration
 */
export interface ApiResolverConfig<T = unknown> {
  /** API endpoint URL (query will be appended as ?q=...) */
  endpoint: string;
  /** Query parameter name (default: 'q') */
  queryParam?: string;
  /** Additional query parameters */
  params?: Record<string, string>;
  /** Request headers */
  headers?: Record<string, string>;
  /** Transform API response to SearchResult array */
  transform: (response: unknown) => SearchResult<T>[];
  /** Request timeout in ms (default: 5000) */
  timeout?: number;
}

/**
 * Static resolver configuration
 */
export interface StaticResolverConfig<T = unknown> {
  /** Static items to search */
  items: SearchResult<T>[];
  /** Fields to search in (default: ['label', 'description']) */
  searchFields?: (keyof SearchResult<T>)[];
  /** Case sensitive search (default: false) */
  caseSensitive?: boolean;
}

/**
 * Simple renderer configuration
 */
export interface SimpleRendererConfig {
  /** Show description if available (default: true) */
  showDescription?: boolean;
  /** Show icon if available (default: true) */
  showIcon?: boolean;
  /** Custom CSS classes for the item */
  itemClass?: string;
  /** Custom CSS classes for selected item */
  selectedClass?: string;
}

/**
 * User renderer configuration for user-type results
 */
export interface UserRendererConfig extends SimpleRendererConfig {
  /** Field name for avatar URL in metadata (default: 'avatar') */
  avatarField?: string;
  /** Field name for email in metadata (default: 'email') */
  emailField?: string;
  /** Field name for role in metadata (default: 'role') */
  roleField?: string;
  /** Show avatar placeholder if no avatar (default: true) */
  showAvatarPlaceholder?: boolean;
}

/**
 * Entity renderer configuration for generic entity results
 */
export interface EntityRendererConfig extends SimpleRendererConfig {
  /** Field name for badge/status in metadata */
  badgeField?: string;
  /** Badge color map */
  badgeColors?: Record<string, string>;
  /** Fields to show as metadata pills */
  metadataFields?: string[];
}
