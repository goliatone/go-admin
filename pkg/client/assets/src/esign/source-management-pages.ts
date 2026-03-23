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
  SourceRevisionDetail,
  SourceRevisionPage,
  SourceArtifactPage,
  SourceCommentPage,
  SourceSearchResults,
  SourceWorkspace,
  SourceListQuery,
  SourceCommentListQuery,
  SourceRevisionListQuery,
  Phase13SourceSearchQuery,
  SourceWorkspaceQuery,
  ReconciliationQueuePage,
  ReconciliationCandidateDetail,
  ReconciliationQueueQuery,
  ReconciliationReviewInput,
  ReconciliationReviewResponse,
} from './lineage-contracts.js';

import { normalizeSourceWorkspace } from './lineage-contracts.js';

import type {
  SourceBrowserPageContracts,
  SourceCommentInspectorPageContracts,
  SourceDetailPageContracts,
  SourceWorkspacePageContracts,
  SourceRevisionDetailPageContracts,
  SourceRevisionTimelinePageContracts,
  SourceArtifactInspectorPageContracts,
  SourceSearchPageContracts,
  SourceManagementPageState,
  SourceManagementPageMetadata,
  ReconciliationQueuePageContracts,
  ReconciliationCandidateDetailPageContracts,
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

function buildSourceListQueryParamUpdates(
  query: Partial<SourceListQuery>
): Record<string, string | number | boolean | undefined> {
  return {
    q: query.query,
    query: undefined,
    provider_kind: query.provider_kind,
    status: query.status,
    has_pending_candidates: query.has_pending_candidates,
    sort: query.sort,
    page: query.page,
    page_size: query.page_size,
  };
}

/**
 * Extracts SourceListQuery from URL params.
 */
function extractSourceListQuery(params: URLSearchParams): SourceListQuery {
  const page = Number.parseInt(params.get('page') ?? '1', 10);
  const pageSize = Number.parseInt(params.get('page_size') ?? '20', 10);
  const query = params.get('q') ?? params.get('query') ?? undefined;

  return {
    query,
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
 * Extracts SourceCommentListQuery from URL params.
 */
function extractSourceCommentListQuery(params: URLSearchParams): SourceCommentListQuery {
  const page = Number.parseInt(params.get('page') ?? '1', 10);
  const pageSize = Number.parseInt(params.get('page_size') ?? '20', 10);

  return {
    status: params.get('status') ?? undefined,
    sync_status: params.get('sync_status') ?? undefined,
    page: page > 0 ? page : 1,
    page_size: pageSize > 0 ? pageSize : 20,
  };
}

/**
 * Extracts SourceSearchQuery from URL params.
 */
function extractSourceSearchQuery(params: URLSearchParams): Phase13SourceSearchQuery {
  const page = Number.parseInt(params.get('page') ?? '1', 10);
  const pageSize = Number.parseInt(params.get('page_size') ?? '20', 10);

  return {
    query: params.get('q') ?? params.get('query') ?? undefined,
    provider_kind: params.get('provider_kind') ?? undefined,
    status: params.get('status') ?? undefined,
    result_kind: params.get('result_kind') ?? undefined,
    relationship_state: params.get('relationship_state') ?? undefined,
    comment_sync_status: params.get('comment_sync_status') ?? undefined,
    revision_hint: params.get('revision_hint') ?? undefined,
    sort: params.get('sort') ?? undefined,
    page: page > 0 ? page : 1,
    page_size: pageSize > 0 ? pageSize : 20,
    has_comments: params.get('has_comments') === 'true' ? true : undefined,
  };
}

/**
 * Builds query string from SourceListQuery.
 */
function buildSourceListQueryString(query: SourceListQuery): string {
  const params = new URLSearchParams();

  if (query.query) params.set('q', query.query);
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

function buildSourceCommentListQueryString(query: SourceCommentListQuery): string {
  const params = new URLSearchParams();

  if (query.status) params.set('status', query.status);
  if (query.sync_status) params.set('sync_status', query.sync_status);
  if (query.page && query.page !== 1) params.set('page', String(query.page));
  if (query.page_size && query.page_size !== 20) params.set('page_size', String(query.page_size));

  return params.toString();
}

function buildSourceSearchQueryParamUpdates(
  query: Partial<Phase13SourceSearchQuery>
): Record<string, string | number | boolean | undefined> {
  return {
    q: query.query,
    query: undefined,
    provider_kind: query.provider_kind,
    status: query.status,
    result_kind: query.result_kind,
    relationship_state: query.relationship_state,
    comment_sync_status: query.comment_sync_status,
    revision_hint: query.revision_hint,
    has_comments: query.has_comments,
    sort: query.sort,
    page: query.page,
    page_size: query.page_size,
  };
}

function buildSourceSearchQueryString(query: Phase13SourceSearchQuery): string {
  const params = new URLSearchParams();

  if (query.query) params.set('q', query.query);
  if (query.provider_kind) params.set('provider_kind', query.provider_kind);
  if (query.status) params.set('status', query.status);
  if (query.result_kind) params.set('result_kind', query.result_kind);
  if (query.relationship_state) params.set('relationship_state', query.relationship_state);
  if (query.comment_sync_status) params.set('comment_sync_status', query.comment_sync_status);
  if (query.revision_hint) params.set('revision_hint', query.revision_hint);
  if (query.has_comments !== undefined) params.set('has_comments', String(query.has_comments));
  if (query.sort) params.set('sort', query.sort);
  if (query.page && query.page !== 1) params.set('page', String(query.page));
  if (query.page_size && query.page_size !== 20) params.set('page_size', String(query.page_size));

  return params.toString();
}

function extractSourceWorkspaceQuery(params: URLSearchParams): SourceWorkspaceQuery {
  return {
    panel: params.get('panel') ?? undefined,
    anchor: params.get('anchor') ?? undefined,
  };
}

function buildSourceWorkspaceQueryParamUpdates(
  query: Partial<SourceWorkspaceQuery>
): Record<string, string | number | boolean | undefined> {
  return {
    panel: query.panel,
    anchor: query.anchor,
  };
}

function buildSourceWorkspaceQueryString(query: SourceWorkspaceQuery): string {
  const params = new URLSearchParams();
  if (query.panel) params.set('panel', query.panel);
  if (query.anchor) params.set('anchor', query.anchor);
  return params.toString();
}

// ============================================================================
// Reconciliation Queue URL State (Phase 17 - Task 17.6)
// ============================================================================

/**
 * Extracts ReconciliationQueueQuery from URL params.
 */
function extractReconciliationQueueQuery(params: URLSearchParams): ReconciliationQueueQuery {
  const page = Number.parseInt(params.get('page') ?? '1', 10);
  const pageSize = Number.parseInt(params.get('page_size') ?? '20', 10);

  return {
    confidence_band: params.get('confidence_band') ?? undefined,
    relationship_type: params.get('relationship_type') ?? undefined,
    provider_kind: params.get('provider_kind') ?? undefined,
    source_status: params.get('source_status') ?? undefined,
    age_band: params.get('age_band') ?? undefined,
    sort: params.get('sort') ?? undefined,
    page: page > 0 ? page : 1,
    page_size: pageSize > 0 ? pageSize : 20,
  };
}

/**
 * Builds URL param updates from ReconciliationQueueQuery.
 */
function buildReconciliationQueueQueryParamUpdates(
  query: Partial<ReconciliationQueueQuery>
): Record<string, string | number | boolean | undefined> {
  return {
    confidence_band: query.confidence_band,
    relationship_type: query.relationship_type,
    provider_kind: query.provider_kind,
    source_status: query.source_status,
    age_band: query.age_band,
    sort: query.sort,
    page: query.page,
    page_size: query.page_size,
  };
}

/**
 * Builds query string from ReconciliationQueueQuery.
 */
function buildReconciliationQueueQueryString(query: ReconciliationQueueQuery): string {
  const params = new URLSearchParams();

  if (query.confidence_band) params.set('confidence_band', query.confidence_band);
  if (query.relationship_type) params.set('relationship_type', query.relationship_type);
  if (query.provider_kind) params.set('provider_kind', query.provider_kind);
  if (query.source_status) params.set('source_status', query.source_status);
  if (query.age_band) params.set('age_band', query.age_band);
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
    updateQueryParams(buildSourceListQueryParamUpdates(newQuery));
    await this.fetchSources(newQuery);
  }

  /**
   * Apply filters and reset to page 1.
   */
  async applyFilters(filters: Partial<SourceListQuery>): Promise<void> {
    const currentQuery = this.state.contracts?.query ?? {};
    const newQuery = { ...currentQuery, ...filters, page: 1 };
    updateQueryParams(buildSourceListQueryParamUpdates(newQuery));
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
// Source Workspace Page
// ============================================================================

export interface SourceWorkspacePageConfig {
  apiBasePath: string;
  sourceId: string;
  containerSelector?: string;
  onStateChange?: (state: SourceManagementPageState<SourceWorkspacePageContracts>) => void;
}

export class SourceWorkspacePageController {
  private readonly config: SourceWorkspacePageConfig;
  private readonly metadata: SourceManagementPageMetadata;
  private state: SourceManagementPageState<SourceWorkspacePageContracts>;

  constructor(config: SourceWorkspacePageConfig) {
    this.config = config;
    this.metadata = {
      pageId: 'source-workspace',
      apiBasePath: config.apiBasePath,
      endpointFamily: 'sources/:id/workspace',
      contractVersion: 1,
    };

    const validation = validatePageComposition(this.metadata, ['sources/:id/workspace']);
    if (!validation.valid) {
      console.error('[SourceWorkspacePage] Composition validation failed:', validation.errors);
    }

    this.state = {
      loading: false,
      error: null,
      contracts: null,
    };
  }

  async init(): Promise<void> {
    const params = parseQueryParams();
    const query = extractSourceWorkspaceQuery(params);
    await this.fetchWorkspace(query);
  }

  async fetchWorkspace(query: SourceWorkspaceQuery): Promise<void> {
    this.setState({ loading: true, error: null, contracts: null });

    try {
      const queryString = buildSourceWorkspaceQueryString(query);
      const suffix = queryString ? `?${queryString}` : '';
      const url = `${this.config.apiBasePath}/sources/${encodeURIComponent(this.config.sourceId)}/workspace${suffix}`;
      const workspace = normalizeSourceWorkspace(await fetchJSON<unknown>(url));

      const contracts: SourceWorkspacePageContracts = {
        workspace,
        query,
        links: workspace.links,
        permissions: workspace.permissions,
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

  async refresh(): Promise<void> {
    const query = this.state.contracts?.query ?? extractSourceWorkspaceQuery(parseQueryParams());
    await this.fetchWorkspace(query);
  }

  async navigateToHref(href: string): Promise<void> {
    const target = String(href ?? '').trim();
    if (!target || typeof window === 'undefined') {
      return;
    }
    const currentURL = new URL(window.location.href);
    const nextURL = new URL(target, currentURL.origin);
    if (currentURL.pathname !== nextURL.pathname) {
      window.location.assign(nextURL.toString());
      return;
    }
    const query = extractSourceWorkspaceQuery(nextURL.searchParams);
    updateQueryParams(buildSourceWorkspaceQueryParamUpdates(query));
    await this.fetchWorkspace(query);
  }

  getState(): SourceManagementPageState<SourceWorkspacePageContracts> {
    return this.state;
  }

  private setState(state: SourceManagementPageState<SourceWorkspacePageContracts>): void {
    this.state = state;
    if (this.config.onStateChange) {
      this.config.onStateChange(state);
    }
  }
}

export function bootstrapSourceWorkspacePage(
  config: SourceWorkspacePageConfig
): SourceWorkspacePageController {
  const controller = new SourceWorkspacePageController(config);
  controller.init().catch((error) => {
    console.error('[SourceWorkspacePage] Initialization failed:', error);
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
// Source Revision Inspector Page
// ============================================================================

export interface SourceRevisionInspectorPageConfig {
  apiBasePath: string;
  sourceRevisionId: string;
  containerSelector?: string;
  onStateChange?: (state: SourceManagementPageState<SourceRevisionDetailPageContracts>) => void;
}

export class SourceRevisionInspectorPageController {
  private readonly config: SourceRevisionInspectorPageConfig;
  private readonly metadata: SourceManagementPageMetadata;
  private state: SourceManagementPageState<SourceRevisionDetailPageContracts>;

  constructor(config: SourceRevisionInspectorPageConfig) {
    this.config = config;
    this.metadata = {
      pageId: 'source-revision-inspector',
      apiBasePath: config.apiBasePath,
      endpointFamily: 'source-revisions/:id',
      contractVersion: 1,
    };

    const validation = validatePageComposition(this.metadata, ['source-revisions/:id']);
    if (!validation.valid) {
      console.error('[SourceRevisionInspectorPage] Composition validation failed:', validation.errors);
    }

    this.state = {
      loading: false,
      error: null,
      contracts: null,
    };
  }

  async init(): Promise<void> {
    await this.fetchRevision();
  }

  async fetchRevision(): Promise<void> {
    this.setState({ loading: true, error: null, contracts: null });

    try {
      const url = `${this.config.apiBasePath}/source-revisions/${encodeURIComponent(this.config.sourceRevisionId)}`;
      const revisionDetail = await fetchJSON<SourceRevisionDetail>(url);

      const contracts: SourceRevisionDetailPageContracts = {
        revisionDetail,
        links: revisionDetail.links,
        permissions: revisionDetail.permissions,
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

  async refresh(): Promise<void> {
    await this.fetchRevision();
  }

  getState(): SourceManagementPageState<SourceRevisionDetailPageContracts> {
    return this.state;
  }

  private setState(state: SourceManagementPageState<SourceRevisionDetailPageContracts>): void {
    this.state = state;
    if (this.config.onStateChange) {
      this.config.onStateChange(state);
    }
  }
}

export function bootstrapSourceRevisionInspectorPage(
  config: SourceRevisionInspectorPageConfig
): SourceRevisionInspectorPageController {
  const controller = new SourceRevisionInspectorPageController(config);
  controller.init().catch((error) => {
    console.error('[SourceRevisionInspectorPage] Initialization failed:', error);
  });
  return controller;
}

// ============================================================================
// Source Comment Inspector Page
// ============================================================================

export interface SourceCommentInspectorPageConfig {
  apiBasePath: string;
  sourceRevisionId: string;
  initialQuery?: Partial<SourceCommentListQuery>;
  containerSelector?: string;
  onStateChange?: (state: SourceManagementPageState<SourceCommentInspectorPageContracts>) => void;
}

export class SourceCommentInspectorPageController {
  private readonly config: SourceCommentInspectorPageConfig;
  private readonly metadata: SourceManagementPageMetadata;
  private state: SourceManagementPageState<SourceCommentInspectorPageContracts>;

  constructor(config: SourceCommentInspectorPageConfig) {
    this.config = config;
    this.metadata = {
      pageId: 'source-comment-inspector',
      apiBasePath: config.apiBasePath,
      endpointFamily: 'source-revisions/:id/comments',
      contractVersion: 1,
    };

    const validation = validatePageComposition(this.metadata, ['source-revisions/:id/comments']);
    if (!validation.valid) {
      console.error('[SourceCommentInspectorPage] Composition validation failed:', validation.errors);
    }

    this.state = {
      loading: false,
      error: null,
      contracts: null,
    };
  }

  async init(): Promise<void> {
    const params = parseQueryParams();
    const query = extractSourceCommentListQuery(params);
    await this.fetchComments(query);
  }

  async fetchComments(query: SourceCommentListQuery): Promise<void> {
    this.setState({ loading: true, error: null, contracts: null });

    try {
      const queryString = buildSourceCommentListQueryString(query);
      const url = `${this.config.apiBasePath}/source-revisions/${encodeURIComponent(this.config.sourceRevisionId)}/comments?${queryString}`;
      const commentPage = await fetchJSON<SourceCommentPage>(url);

      const contracts: SourceCommentInspectorPageContracts = {
        commentPage,
        links: commentPage.links,
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

  async goToPage(page: number): Promise<void> {
    const currentQuery = this.state.contracts?.commentPage.page_info
      ? extractSourceCommentListQuery(parseQueryParams())
      : {};
    const newQuery = { ...currentQuery, page };
    updateQueryParams({ page });
    await this.fetchComments(newQuery);
  }

  async refresh(): Promise<void> {
    const query = extractSourceCommentListQuery(parseQueryParams());
    await this.fetchComments(query);
  }

  getState(): SourceManagementPageState<SourceCommentInspectorPageContracts> {
    return this.state;
  }

  private setState(state: SourceManagementPageState<SourceCommentInspectorPageContracts>): void {
    this.state = state;
    if (this.config.onStateChange) {
      this.config.onStateChange(state);
    }
  }
}

export function bootstrapSourceCommentInspectorPage(
  config: SourceCommentInspectorPageConfig
): SourceCommentInspectorPageController {
  const controller = new SourceCommentInspectorPageController(config);
  controller.init().catch((error) => {
    console.error('[SourceCommentInspectorPage] Initialization failed:', error);
  });
  return controller;
}

// ============================================================================
// Source Artifact Inspector Page
// ============================================================================

export interface SourceArtifactInspectorPageConfig {
  apiBasePath: string;
  sourceRevisionId: string;
  containerSelector?: string;
  onStateChange?: (state: SourceManagementPageState<SourceArtifactInspectorPageContracts>) => void;
}

export class SourceArtifactInspectorPageController {
  private readonly config: SourceArtifactInspectorPageConfig;
  private readonly metadata: SourceManagementPageMetadata;
  private state: SourceManagementPageState<SourceArtifactInspectorPageContracts>;

  constructor(config: SourceArtifactInspectorPageConfig) {
    this.config = config;
    this.metadata = {
      pageId: 'source-artifact-inspector',
      apiBasePath: config.apiBasePath,
      endpointFamily: 'source-revisions/:id/artifacts',
      contractVersion: 1,
    };

    const validation = validatePageComposition(this.metadata, ['source-revisions/:id/artifacts']);
    if (!validation.valid) {
      console.error('[SourceArtifactInspectorPage] Composition validation failed:', validation.errors);
    }

    this.state = {
      loading: false,
      error: null,
      contracts: null,
    };
  }

  async init(): Promise<void> {
    await this.fetchArtifacts();
  }

  async fetchArtifacts(): Promise<void> {
    this.setState({ loading: true, error: null, contracts: null });

    try {
      const url = `${this.config.apiBasePath}/source-revisions/${encodeURIComponent(this.config.sourceRevisionId)}/artifacts`;
      const artifactPage = await fetchJSON<SourceArtifactPage>(url);

      const contracts: SourceArtifactInspectorPageContracts = {
        artifactPage,
        links: artifactPage.links,
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

  async refresh(): Promise<void> {
    await this.fetchArtifacts();
  }

  getState(): SourceManagementPageState<SourceArtifactInspectorPageContracts> {
    return this.state;
  }

  private setState(state: SourceManagementPageState<SourceArtifactInspectorPageContracts>): void {
    this.state = state;
    if (this.config.onStateChange) {
      this.config.onStateChange(state);
    }
  }
}

export function bootstrapSourceArtifactInspectorPage(
  config: SourceArtifactInspectorPageConfig
): SourceArtifactInspectorPageController {
  const controller = new SourceArtifactInspectorPageController(config);
  controller.init().catch((error) => {
    console.error('[SourceArtifactInspectorPage] Initialization failed:', error);
  });
  return controller;
}

// ============================================================================
// Source Search Page
// ============================================================================

export interface SourceSearchPageConfig {
  apiBasePath: string;
  initialQuery?: Partial<Phase13SourceSearchQuery>;
  containerSelector?: string;
  onStateChange?: (state: SourceManagementPageState<SourceSearchPageContracts>) => void;
}

export class SourceSearchPageController {
  private readonly config: SourceSearchPageConfig;
  private readonly metadata: SourceManagementPageMetadata;
  private state: SourceManagementPageState<SourceSearchPageContracts>;

  constructor(config: SourceSearchPageConfig) {
    this.config = config;
    this.metadata = {
      pageId: 'source-search',
      apiBasePath: config.apiBasePath,
      endpointFamily: 'source-search',
      contractVersion: 1,
    };

    const validation = validatePageComposition(this.metadata, ['source-search']);
    if (!validation.valid) {
      console.error('[SourceSearchPage] Composition validation failed:', validation.errors);
    }

    this.state = {
      loading: false,
      error: null,
      contracts: null,
    };
  }

  async init(): Promise<void> {
    const params = parseQueryParams();
    const query = extractSourceSearchQuery(params);
    await this.search(query);
  }

  async search(query: Phase13SourceSearchQuery): Promise<void> {
    this.setState({ loading: true, error: null, contracts: null });

    try {
      const queryString = buildSourceSearchQueryString(query);
      const url = `${this.config.apiBasePath}/source-search?${queryString}`;
      const searchResults = await fetchJSON<SourceSearchResults>(url);

      const contracts: SourceSearchPageContracts = {
        searchResults,
        query,
        links: searchResults.links,
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

  async goToPage(page: number): Promise<void> {
    const currentQuery = this.state.contracts?.query ?? {};
    const newQuery = { ...currentQuery, page };
    updateQueryParams(buildSourceSearchQueryParamUpdates(newQuery));
    await this.search(newQuery);
  }

  async applyFilters(filters: Partial<Phase13SourceSearchQuery>): Promise<void> {
    const currentQuery = this.state.contracts?.query ?? {};
    const newQuery = { ...currentQuery, ...filters, page: 1 };
    updateQueryParams(buildSourceSearchQueryParamUpdates(newQuery));
    await this.search(newQuery);
  }

  async refresh(): Promise<void> {
    const query = this.state.contracts?.query ?? extractSourceSearchQuery(parseQueryParams());
    await this.search(query);
  }

  getState(): SourceManagementPageState<SourceSearchPageContracts> {
    return this.state;
  }

  private setState(state: SourceManagementPageState<SourceSearchPageContracts>): void {
    this.state = state;
    if (this.config.onStateChange) {
      this.config.onStateChange(state);
    }
  }
}

export function bootstrapSourceSearchPage(
  config: SourceSearchPageConfig
): SourceSearchPageController {
  const controller = new SourceSearchPageController(config);
  controller.init().catch((error) => {
    console.error('[SourceSearchPage] Initialization failed:', error);
  });
  return controller;
}

// ============================================================================
// Reconciliation Queue Page (Phase 17 - Task 17.6)
// ============================================================================

/**
 * Configuration for reconciliation queue page.
 */
export interface ReconciliationQueuePageConfig {
  /** Base API path (e.g., "/admin/api/v1/esign") */
  apiBasePath: string;
  /** Container element selector for rendering */
  containerSelector?: string;
  /** Initial query parameters */
  initialQuery?: Partial<ReconciliationQueueQuery>;
  /** Callback when page state changes */
  onStateChange?: (state: SourceManagementPageState<ReconciliationQueuePageContracts>) => void;
}

/**
 * Reconciliation Queue Page Controller.
 * Manages URL state, data fetching, and page lifecycle for reconciliation queue.
 *
 * CRITICAL: Frontend must NOT derive candidate ranking, action availability,
 * confirm semantics, or review outcomes from backend implementation code.
 *
 * @see DOC_LINEAGE_V2_TSK.md Phase 17 Task 17.6
 */
export class ReconciliationQueuePageController {
  private readonly config: ReconciliationQueuePageConfig;
  private readonly metadata: SourceManagementPageMetadata;
  private state: SourceManagementPageState<ReconciliationQueuePageContracts>;

  constructor(config: ReconciliationQueuePageConfig) {
    this.config = config;
    this.metadata = {
      pageId: 'reconciliation-queue',
      apiBasePath: config.apiBasePath,
      endpointFamily: 'reconciliation-queue',
      contractVersion: 1,
    };

    const validation = validatePageComposition(this.metadata, ['reconciliation-queue']);
    if (!validation.valid) {
      console.error('[ReconciliationQueuePage] Composition validation failed:', validation.errors);
    }
    if (validation.warnings.length > 0) {
      console.warn('[ReconciliationQueuePage] Composition warnings:', validation.warnings);
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
    const query = extractReconciliationQueueQuery(params);
    await this.fetchQueue(query);
  }

  /**
   * Fetch reconciliation queue from backend.
   */
  async fetchQueue(query: ReconciliationQueueQuery): Promise<void> {
    this.setState({ loading: true, error: null, contracts: null });

    try {
      const queryString = buildReconciliationQueueQueryString(query);
      const url = `${this.config.apiBasePath}/reconciliation-queue?${queryString}`;

      const queuePage = await fetchJSON<ReconciliationQueuePage>(url);

      const contracts: ReconciliationQueuePageContracts = {
        queuePage,
        query,
        permissions: queuePage.permissions,
        links: queuePage.links,
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
    updateQueryParams(buildReconciliationQueueQueryParamUpdates(newQuery));
    await this.fetchQueue(newQuery);
  }

  /**
   * Apply filters and reset to page 1.
   */
  async applyFilters(filters: Partial<ReconciliationQueueQuery>): Promise<void> {
    const currentQuery = this.state.contracts?.query ?? {};
    const newQuery = { ...currentQuery, ...filters, page: 1 };
    updateQueryParams(buildReconciliationQueueQueryParamUpdates(newQuery));
    await this.fetchQueue(newQuery);
  }

  /**
   * Clear all filters and reset to page 1.
   */
  async clearFilters(): Promise<void> {
    const newQuery: ReconciliationQueueQuery = { page: 1, page_size: 20 };
    updateQueryParams(buildReconciliationQueueQueryParamUpdates(newQuery));
    await this.fetchQueue(newQuery);
  }

  /**
   * Refresh the queue with current query.
   */
  async refresh(): Promise<void> {
    const query = this.state.contracts?.query ?? extractReconciliationQueueQuery(parseQueryParams());
    await this.fetchQueue(query);
  }

  /**
   * Get current page state.
   */
  getState(): SourceManagementPageState<ReconciliationQueuePageContracts> {
    return this.state;
  }

  /**
   * Update page state and trigger callbacks.
   */
  private setState(state: SourceManagementPageState<ReconciliationQueuePageContracts>): void {
    this.state = state;
    if (this.config.onStateChange) {
      this.config.onStateChange(state);
    }
  }
}

/**
 * Bootstrap reconciliation queue page.
 * Initializes controller and returns instance for further interaction.
 */
export function bootstrapReconciliationQueuePage(
  config: ReconciliationQueuePageConfig
): ReconciliationQueuePageController {
  const controller = new ReconciliationQueuePageController(config);
  controller.init().catch((error) => {
    console.error('[ReconciliationQueuePage] Initialization failed:', error);
  });
  return controller;
}

// ============================================================================
// Reconciliation Candidate Detail Page (Phase 17 - Task 17.6/17.7)
// ============================================================================

/**
 * Configuration for reconciliation candidate detail page.
 */
export interface ReconciliationCandidateDetailPageConfig {
  /** Base API path (e.g., "/admin/api/v1/esign") */
  apiBasePath: string;
  /** Relationship ID (candidate ID) */
  relationshipId: string;
  /** Container element selector for rendering */
  containerSelector?: string;
  /** Callback when page state changes */
  onStateChange?: (state: SourceManagementPageState<ReconciliationCandidateDetailPageContracts>) => void;
  /** Callback when review action completes */
  onReviewComplete?: (response: ReconciliationReviewResponse) => void;
}

/**
 * Reconciliation Candidate Detail Page Controller.
 * Manages data fetching and review action submission for candidate detail.
 *
 * CRITICAL: Frontend must use backend-provided action metadata, evidence summaries,
 * permissions, links, validation errors, and conflict responses only.
 * Frontend owns copy hierarchy, affordance design, and safety presentation,
 * NOT action contract design or fallback state machines.
 *
 * @see DOC_LINEAGE_V2_TSK.md Phase 17 Task 17.6, 17.7
 */
export class ReconciliationCandidateDetailPageController {
  private readonly config: ReconciliationCandidateDetailPageConfig;
  private readonly metadata: SourceManagementPageMetadata;
  private state: SourceManagementPageState<ReconciliationCandidateDetailPageContracts>;
  private reviewInProgress: boolean = false;

  constructor(config: ReconciliationCandidateDetailPageConfig) {
    this.config = config;
    this.metadata = {
      pageId: 'reconciliation-candidate-detail',
      apiBasePath: config.apiBasePath,
      endpointFamily: 'reconciliation-queue/:id',
      contractVersion: 1,
    };

    const validation = validatePageComposition(this.metadata, ['reconciliation-queue/:id']);
    if (!validation.valid) {
      console.error('[ReconciliationCandidateDetailPage] Composition validation failed:', validation.errors);
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
    await this.fetchCandidate();
  }

  /**
   * Fetch candidate detail from backend.
   */
  async fetchCandidate(): Promise<void> {
    this.setState({ loading: true, error: null, contracts: null });

    try {
      const url = `${this.config.apiBasePath}/reconciliation-queue/${encodeURIComponent(this.config.relationshipId)}`;
      const candidateDetail = await fetchJSON<ReconciliationCandidateDetail>(url);

      const contracts: ReconciliationCandidateDetailPageContracts = {
        candidateDetail,
        permissions: candidateDetail.permissions,
        links: candidateDetail.links,
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
   * Submit a review action for the candidate.
   *
   * CRITICAL: Uses backend-provided action metadata only.
   * Frontend must NOT compute action availability or semantics.
   *
   * @param input - Review action input (action, optional confirm_behavior, optional reason)
   * @returns Review response with updated candidate detail
   */
  async submitReview(input: ReconciliationReviewInput): Promise<ReconciliationReviewResponse> {
    if (this.reviewInProgress) {
      throw new Error('Review action already in progress');
    }

    this.reviewInProgress = true;

    try {
      const url = `${this.config.apiBasePath}/reconciliation-queue/${encodeURIComponent(this.config.relationshipId)}/review`;
      const response = await fetchJSON<ReconciliationReviewResponse>(url, {
        method: 'POST',
        body: input,
      });

      // Update state with refreshed candidate detail if available
      if (response.candidate) {
        const contracts: ReconciliationCandidateDetailPageContracts = {
          candidateDetail: response.candidate,
          permissions: response.candidate.permissions,
          links: response.candidate.links,
        };
        this.setState({ loading: false, error: null, contracts });
      }

      // Notify callback if configured
      if (this.config.onReviewComplete) {
        this.config.onReviewComplete(response);
      }

      return response;
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      // Don't update state error for review failures - let UI handle error display
      return {
        status: 'error',
        error: {
          code: 'REVIEW_SUBMIT_ERROR',
          message: errorObj.message,
        },
      };
    } finally {
      this.reviewInProgress = false;
    }
  }

  /**
   * Refresh candidate detail.
   */
  async refresh(): Promise<void> {
    await this.fetchCandidate();
  }

  /**
   * Check if a review action is currently in progress.
   */
  isReviewInProgress(): boolean {
    return this.reviewInProgress;
  }

  /**
   * Get current page state.
   */
  getState(): SourceManagementPageState<ReconciliationCandidateDetailPageContracts> {
    return this.state;
  }

  /**
   * Update page state and trigger callbacks.
   */
  private setState(state: SourceManagementPageState<ReconciliationCandidateDetailPageContracts>): void {
    this.state = state;
    if (this.config.onStateChange) {
      this.config.onStateChange(state);
    }
  }
}

/**
 * Bootstrap reconciliation candidate detail page.
 * Initializes controller and returns instance for further interaction.
 */
export function bootstrapReconciliationCandidateDetailPage(
  config: ReconciliationCandidateDetailPageConfig
): ReconciliationCandidateDetailPageController {
  const controller = new ReconciliationCandidateDetailPageController(config);
  controller.init().catch((error) => {
    console.error('[ReconciliationCandidateDetailPage] Initialization failed:', error);
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
  controller:
    | SourceBrowserPageController
    | SourceDetailPageController
    | SourceWorkspacePageController
    | SourceRevisionTimelinePageController
    | SourceRevisionInspectorPageController
    | SourceCommentInspectorPageController
    | SourceArtifactInspectorPageController
    | SourceSearchPageController
    | ReconciliationQueuePageController
    | ReconciliationCandidateDetailPageController
    | unknown
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
