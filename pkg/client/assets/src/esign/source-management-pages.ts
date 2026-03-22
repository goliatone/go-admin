/**
 * Source-Management Page Architectural Shells
 *
 * Route-level architectural shells for source-management surfaces.
 * These modules define data fetching, URL state management, and page lifecycle
 * without prescribing visual implementation.
 *
 * CRITICAL RULES:
 * 1. Each page consumes exactly ONE backend endpoint family
 * 2. URL state (query params, pagination, filters) drives page state
 * 3. Pages must NOT reconstruct data from multiple endpoints client-side
 * 4. Pages must NOT compute lineage semantics, warning precedence, or source continuity
 * 5. Visual rendering is deferred to template layer or future implementation
 *
 * @see DOC_LINEAGE_V1_TSK.md Phase 12 Task 12.7
 * @see source-management-composition.ts for composition boundaries
 */

import type {
  SourceListPage,
  SourceDetail,
  SourceRevisionPage,
  SourceListQuery,
  SourceRevisionListQuery,
} from './lineage-contracts.js';

import type {
  SourceBrowserPageContracts,
  SourceDetailPageContracts,
  SourceRevisionTimelinePageContracts,
  SourceManagementPageState,
  SourceManagementPageMetadata,
} from './source-management-composition.js';

import { validatePageComposition } from './source-management-composition.js';

// ============================================================================
// HTTP Client Abstraction
// ============================================================================

/**
 * Simple fetch-based HTTP client for source-management endpoints.
 * Handles JSON parsing, error conversion, and loading states.
 */
interface FetchOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

async function fetchJSON<T>(url: string, options: FetchOptions = {}): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const config: RequestInit = {
    method: options.method ?? 'GET',
    headers,
  };

  if (options.body) {
    config.body = JSON.stringify(options.body);
  }

  const response = await fetch(url, config);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  return response.json() as Promise<T>;
}

// ============================================================================
// URL State Management
// ============================================================================

/**
 * Parses query parameters from current URL.
 */
function parseQueryParams(): URLSearchParams {
  if (typeof window === 'undefined') {
    return new URLSearchParams();
  }
  return new URLSearchParams(window.location.search);
}

/**
 * Updates URL query parameters without triggering page reload.
 */
function updateQueryParams(params: Record<string, string | number | boolean | undefined>): void {
  if (typeof window === 'undefined' || typeof history === 'undefined') {
    return;
  }

  const url = new URL(window.location.href);
  const searchParams = url.searchParams;

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      searchParams.delete(key);
    } else {
      searchParams.set(key, String(value));
    }
  });

  url.search = searchParams.toString();
  history.pushState({}, '', url.toString());
}

/**
 * Extracts SourceListQuery from URL params.
 */
function extractSourceListQuery(params: URLSearchParams): SourceListQuery {
  const page = Number.parseInt(params.get('page') ?? '1', 10);
  const pageSize = Number.parseInt(params.get('page_size') ?? '20', 10);

  return {
    query: params.get('query') ?? undefined,
    provider_kind: params.get('provider_kind') ?? undefined,
    status: params.get('status') ?? undefined,
    has_pending_candidates: params.get('has_pending_candidates') === 'true' ? true : undefined,
    sort: params.get('sort') ?? undefined,
    page: page > 0 ? page : 1,
    page_size: pageSize > 0 ? pageSize : 20,
  };
}

/**
 * Extracts SourceRevisionListQuery from URL params.
 */
function extractSourceRevisionListQuery(params: URLSearchParams): SourceRevisionListQuery {
  const page = Number.parseInt(params.get('page') ?? '1', 10);
  const pageSize = Number.parseInt(params.get('page_size') ?? '20', 10);

  return {
    sort: params.get('sort') ?? undefined,
    page: page > 0 ? page : 1,
    page_size: pageSize > 0 ? pageSize : 20,
  };
}

/**
 * Builds query string from SourceListQuery.
 */
function buildSourceListQueryString(query: SourceListQuery): string {
  const params = new URLSearchParams();

  if (query.query) params.set('query', query.query);
  if (query.provider_kind) params.set('provider_kind', query.provider_kind);
  if (query.status) params.set('status', query.status);
  if (query.has_pending_candidates !== undefined)
    params.set('has_pending_candidates', String(query.has_pending_candidates));
  if (query.sort) params.set('sort', query.sort);
  if (query.page && query.page !== 1) params.set('page', String(query.page));
  if (query.page_size && query.page_size !== 20) params.set('page_size', String(query.page_size));

  return params.toString();
}

/**
 * Builds query string from SourceRevisionListQuery.
 */
function buildSourceRevisionListQueryString(query: SourceRevisionListQuery): string {
  const params = new URLSearchParams();

  if (query.sort) params.set('sort', query.sort);
  if (query.page && query.page !== 1) params.set('page', String(query.page));
  if (query.page_size && query.page_size !== 20) params.set('page_size', String(query.page_size));

  return params.toString();
}

// ============================================================================
// Source Browser Page
// ============================================================================

/**
 * Configuration for source browser page.
 */
export interface SourceBrowserPageConfig {
  /** Base API path (e.g., "/admin/api/v1/esign") */
  apiBasePath: string;
  /** Container element selector for rendering */
  containerSelector?: string;
  /** Initial query parameters */
  initialQuery?: Partial<SourceListQuery>;
  /** Callback when page state changes */
  onStateChange?: (state: SourceManagementPageState<SourceBrowserPageContracts>) => void;
}

/**
 * Source Browser Page Controller.
 * Manages URL state, data fetching, and page lifecycle for source list.
 */
export class SourceBrowserPageController {
  private readonly config: SourceBrowserPageConfig;
  private readonly metadata: SourceManagementPageMetadata;
  private state: SourceManagementPageState<SourceBrowserPageContracts>;

  constructor(config: SourceBrowserPageConfig) {
    this.config = config;
    this.metadata = {
      pageId: 'source-browser',
      apiBasePath: config.apiBasePath,
      endpointFamily: 'sources',
      contractVersion: 1,
    };

    // Validate composition
    const validation = validatePageComposition(this.metadata, ['sources']);
    if (!validation.valid) {
      console.error('[SourceBrowserPage] Composition validation failed:', validation.errors);
    }
    if (validation.warnings.length > 0) {
      console.warn('[SourceBrowserPage] Composition warnings:', validation.warnings);
    }

    this.state = {
      loading: false,
      error: null,
      contracts: null,
    };
  }

  /**
   * Initialize page from current URL state.
   */
  async init(): Promise<void> {
    const params = parseQueryParams();
    const query = extractSourceListQuery(params);
    await this.fetchSources(query);
  }

  /**
   * Fetch sources from backend.
   */
  async fetchSources(query: SourceListQuery): Promise<void> {
    this.setState({ loading: true, error: null, contracts: null });

    try {
      const queryString = buildSourceListQueryString(query);
      const url = `${this.config.apiBasePath}/sources?${queryString}`;

      const listSources = await fetchJSON<SourceListPage>(url);

      const contracts: SourceBrowserPageContracts = {
        listSources,
        query,
        permissions: listSources.permissions,
      };

      this.setState({ loading: false, error: null, contracts });
    } catch (error) {
      this.setState({
        loading: false,
        error: error instanceof Error ? error : new Error(String(error)),
        contracts: null,
      });
    }
  }

  /**
   * Navigate to a specific page.
   */
  async goToPage(page: number): Promise<void> {
    const currentQuery = this.state.contracts?.query ?? {};
    const newQuery = { ...currentQuery, page };
    updateQueryParams({ page });
    await this.fetchSources(newQuery);
  }

  /**
   * Apply filters and reset to page 1.
   */
  async applyFilters(filters: Partial<SourceListQuery>): Promise<void> {
    const currentQuery = this.state.contracts?.query ?? {};
    const newQuery = { ...currentQuery, ...filters, page: 1 };
    updateQueryParams(newQuery as Record<string, string | number | boolean | undefined>);
    await this.fetchSources(newQuery);
  }

  /**
   * Get current page state.
   */
  getState(): SourceManagementPageState<SourceBrowserPageContracts> {
    return this.state;
  }

  /**
   * Update page state and trigger callbacks.
   */
  private setState(state: SourceManagementPageState<SourceBrowserPageContracts>): void {
    this.state = state;
    if (this.config.onStateChange) {
      this.config.onStateChange(state);
    }
  }
}

/**
 * Bootstrap source browser page.
 * Initializes controller and returns instance for further interaction.
 */
export function bootstrapSourceBrowserPage(
  config: SourceBrowserPageConfig
): SourceBrowserPageController {
  const controller = new SourceBrowserPageController(config);
  controller.init().catch((error) => {
    console.error('[SourceBrowserPage] Initialization failed:', error);
  });
  return controller;
}

// ============================================================================
// Source Detail Page
// ============================================================================

/**
 * Configuration for source detail page.
 */
export interface SourceDetailPageConfig {
  /** Base API path (e.g., "/admin/api/v1/esign") */
  apiBasePath: string;
  /** Source document ID */
  sourceId: string;
  /** Container element selector for rendering */
  containerSelector?: string;
  /** Callback when page state changes */
  onStateChange?: (state: SourceManagementPageState<SourceDetailPageContracts>) => void;
}

/**
 * Source Detail Page Controller.
 * Manages data fetching and page lifecycle for source detail.
 */
export class SourceDetailPageController {
  private readonly config: SourceDetailPageConfig;
  private readonly metadata: SourceManagementPageMetadata;
  private state: SourceManagementPageState<SourceDetailPageContracts>;

  constructor(config: SourceDetailPageConfig) {
    this.config = config;
    this.metadata = {
      pageId: 'source-detail',
      apiBasePath: config.apiBasePath,
      endpointFamily: 'sources/:id',
      contractVersion: 1,
    };

    // Validate composition
    const validation = validatePageComposition(this.metadata, ['sources/:id']);
    if (!validation.valid) {
      console.error('[SourceDetailPage] Composition validation failed:', validation.errors);
    }

    this.state = {
      loading: false,
      error: null,
      contracts: null,
    };
  }

  /**
   * Initialize page.
   */
  async init(): Promise<void> {
    await this.fetchSource();
  }

  /**
   * Fetch source detail from backend.
   */
  async fetchSource(): Promise<void> {
    this.setState({ loading: true, error: null, contracts: null });

    try {
      const url = `${this.config.apiBasePath}/sources/${encodeURIComponent(this.config.sourceId)}`;
      const sourceDetail = await fetchJSON<SourceDetail>(url);

      const contracts: SourceDetailPageContracts = {
        sourceDetail,
        links: sourceDetail.links,
        permissions: sourceDetail.permissions,
      };

      this.setState({ loading: false, error: null, contracts });
    } catch (error) {
      this.setState({
        loading: false,
        error: error instanceof Error ? error : new Error(String(error)),
        contracts: null,
      });
    }
  }

  /**
   * Refresh source detail.
   */
  async refresh(): Promise<void> {
    await this.fetchSource();
  }

  /**
   * Get current page state.
   */
  getState(): SourceManagementPageState<SourceDetailPageContracts> {
    return this.state;
  }

  /**
   * Update page state and trigger callbacks.
   */
  private setState(state: SourceManagementPageState<SourceDetailPageContracts>): void {
    this.state = state;
    if (this.config.onStateChange) {
      this.config.onStateChange(state);
    }
  }
}

/**
 * Bootstrap source detail page.
 * Initializes controller and returns instance for further interaction.
 */
export function bootstrapSourceDetailPage(
  config: SourceDetailPageConfig
): SourceDetailPageController {
  const controller = new SourceDetailPageController(config);
  controller.init().catch((error) => {
    console.error('[SourceDetailPage] Initialization failed:', error);
  });
  return controller;
}

// ============================================================================
// Source Revision Timeline Page
// ============================================================================

/**
 * Configuration for source revision timeline page.
 */
export interface SourceRevisionTimelinePageConfig {
  /** Base API path (e.g., "/admin/api/v1/esign") */
  apiBasePath: string;
  /** Source document ID */
  sourceId: string;
  /** Container element selector for rendering */
  containerSelector?: string;
  /** Initial query parameters */
  initialQuery?: Partial<SourceRevisionListQuery>;
  /** Callback when page state changes */
  onStateChange?: (state: SourceManagementPageState<SourceRevisionTimelinePageContracts>) => void;
}

/**
 * Source Revision Timeline Page Controller.
 * Manages URL state, data fetching, and page lifecycle for revision timeline.
 */
export class SourceRevisionTimelinePageController {
  private readonly config: SourceRevisionTimelinePageConfig;
  private readonly metadata: SourceManagementPageMetadata;
  private state: SourceManagementPageState<SourceRevisionTimelinePageContracts>;

  constructor(config: SourceRevisionTimelinePageConfig) {
    this.config = config;
    this.metadata = {
      pageId: 'source-revision-timeline',
      apiBasePath: config.apiBasePath,
      endpointFamily: 'sources/:id/revisions',
      contractVersion: 1,
    };

    // Validate composition
    const validation = validatePageComposition(this.metadata, ['sources/:id/revisions']);
    if (!validation.valid) {
      console.error('[SourceRevisionTimelinePage] Composition validation failed:', validation.errors);
    }

    this.state = {
      loading: false,
      error: null,
      contracts: null,
    };
  }

  /**
   * Initialize page from current URL state.
   */
  async init(): Promise<void> {
    const params = parseQueryParams();
    const query = extractSourceRevisionListQuery(params);
    await this.fetchRevisions(query);
  }

  /**
   * Fetch revisions from backend.
   */
  async fetchRevisions(query: SourceRevisionListQuery): Promise<void> {
    this.setState({ loading: true, error: null, contracts: null });

    try {
      const queryString = buildSourceRevisionListQueryString(query);
      const url = `${this.config.apiBasePath}/sources/${encodeURIComponent(this.config.sourceId)}/revisions?${queryString}`;

      const revisionPage = await fetchJSON<SourceRevisionPage>(url);

      const contracts: SourceRevisionTimelinePageContracts = {
        revisionPage,
        query,
        links: revisionPage.links,
      };

      this.setState({ loading: false, error: null, contracts });
    } catch (error) {
      this.setState({
        loading: false,
        error: error instanceof Error ? error : new Error(String(error)),
        contracts: null,
      });
    }
  }

  /**
   * Navigate to a specific page.
   */
  async goToPage(page: number): Promise<void> {
    const currentQuery = this.state.contracts?.query ?? {};
    const newQuery = { ...currentQuery, page };
    updateQueryParams({ page });
    await this.fetchRevisions(newQuery);
  }

  /**
   * Change sort order.
   */
  async changeSort(sort: string): Promise<void> {
    const currentQuery = this.state.contracts?.query ?? {};
    const newQuery = { ...currentQuery, sort, page: 1 };
    updateQueryParams({ sort, page: 1 });
    await this.fetchRevisions(newQuery);
  }

  /**
   * Get current page state.
   */
  getState(): SourceManagementPageState<SourceRevisionTimelinePageContracts> {
    return this.state;
  }

  /**
   * Update page state and trigger callbacks.
   */
  private setState(state: SourceManagementPageState<SourceRevisionTimelinePageContracts>): void {
    this.state = state;
    if (this.config.onStateChange) {
      this.config.onStateChange(state);
    }
  }
}

/**
 * Bootstrap source revision timeline page.
 * Initializes controller and returns instance for further interaction.
 */
export function bootstrapSourceRevisionTimelinePage(
  config: SourceRevisionTimelinePageConfig
): SourceRevisionTimelinePageController {
  const controller = new SourceRevisionTimelinePageController(config);
  controller.init().catch((error) => {
    console.error('[SourceRevisionTimelinePage] Initialization failed:', error);
  });
  return controller;
}

// ============================================================================
// Page Registry
// ============================================================================

/**
 * Global registry of active source-management page controllers.
 * Enables debugging and coordination across pages.
 */
const PAGE_REGISTRY: Map<string, unknown> = new Map();

/**
 * Register a page controller in the global registry.
 */
export function registerPageController(
  pageId: string,
  controller: SourceBrowserPageController | SourceDetailPageController | SourceRevisionTimelinePageController
): void {
  PAGE_REGISTRY.set(pageId, controller);
}

/**
 * Get a registered page controller by ID.
 */
export function getPageController(pageId: string): unknown {
  return PAGE_REGISTRY.get(pageId);
}

/**
 * List all registered page IDs.
 */
export function listRegisteredPages(): string[] {
  return Array.from(PAGE_REGISTRY.keys());
}