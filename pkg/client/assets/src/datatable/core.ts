import type {
  ColumnDefinition,
  ColumnFilter,
  SortColumn,
  DataGridBehaviors
} from './behaviors/types.js';
import type { ActionButton, BulkActionConfig, ActionRenderMode } from './actions.js';
import type { CellRenderer, CellRendererContext } from './renderers.js';
import type { ToastNotifier } from '../toast/types.js';
import type { ViewMode, GroupedData, RecordGroup } from './grouped-mode.js';
import { ActionRenderer } from './actions.js';
import { CellRendererRegistry } from './renderers.js';
import { FallbackNotifier } from '../toast/toast-manager.js';
import { extractErrorMessage } from '../toast/error-helpers.js';
import { ColumnManager } from './column-manager.js';
import {
  transformToGroups,
  extractBackendSummaries,
  mergeBackendSummaries,
  getPersistedExpandState,
  persistExpandState,
  getPersistedViewMode,
  persistViewMode,
  renderGroupHeaderRow,
  renderGroupedEmptyState,
  renderGroupedLoadingState,
  renderGroupedErrorState,
  getViewModeForViewport,
  getExpandedGroupIds,
} from './grouped-mode.js';

/**
 * DataGrid configuration
 */
export interface DataGridConfig {
  tableId: string;
  apiEndpoint: string;
  /**
   * Optional base path for view/edit links (UI routes). Falls back to apiEndpoint.
   */
  actionBasePath?: string;
  columns: ColumnDefinition[];
  perPage?: number;
  searchDelay?: number;
  behaviors?: DataGridBehaviors;
  selectors?: Partial<DataGridSelectors>;

  // Extension points
  /**
   * Custom row actions (overrides default view/edit/delete)
   */
  rowActions?: (record: any) => ActionButton[];
  /**
   * Custom bulk actions
   */
  bulkActions?: BulkActionConfig[];
  /**
   * Custom cell renderers (field name -> renderer function)
   */
  cellRenderers?: Record<string, CellRenderer>;
  /**
   * Custom row class provider
   */
  rowClassProvider?: (record: any) => string[];
  /**
   * Use default actions (view, edit, delete)
   */
  useDefaultActions?: boolean;
  /**
   * Action rendering mode: 'inline' (buttons) or 'dropdown' (menu)
   */
  actionRenderMode?: ActionRenderMode;
  /**
   * Toast notification handler (optional)
   * If not provided, falls back to native alert/confirm
   */
  notifier?: ToastNotifier;
  /**
   * Panel identifier for state persistence (Phase 2 grouped mode)
   */
  panelId?: string;
  /**
   * Enable grouped mode support (Phase 2)
   * When true, records can be grouped by translation_group_id
   */
  enableGroupedMode?: boolean;
  /**
   * Default view mode: 'flat', 'grouped', or 'matrix' (Phase 2)
   */
  defaultViewMode?: ViewMode;
  /**
   * Field to group by (default: translation_group_id)
   */
  groupByField?: string;
}

/**
 * DOM element selectors
 */
interface DataGridSelectors {
  table: string;
  searchInput: string;
  perPageSelect: string;
  filterRow: string;
  columnToggleBtn: string;
  columnToggleMenu: string;
  exportBtn: string;
  exportMenu: string;
  paginationContainer: string;
  tableInfoStart: string;
  tableInfoEnd: string;
  tableInfoTotal: string;
  selectAllCheckbox: string;
  rowCheckboxes: string;
  bulkActionsBar: string;
  selectedCount: string;
}

/**
 * DataGrid state
 */
interface DataGridState {
  currentPage: number;
  perPage: number;
  totalRows: number;
  search: string;
  filters: ColumnFilter[];
  sort: SortColumn[];
  selectedRows: Set<string>;
  hiddenColumns: Set<string>;
  columnOrder: string[];  // Ordered list of column fields (Phase FE2)
  // Phase 2: Grouped mode state
  viewMode: ViewMode;
  groupedData: GroupedData | null;
  expandedGroups: Set<string>;
}

/**
 * API response format (go-crud default)
 */
interface ApiResponse<T = any> {
  success?: boolean;
  data?: T[];
  records?: T[];
  total?: number;
  count?: number;
  $meta?: {
    count?: number;
  };
  schema?: Record<string, any>;
  form?: Record<string, any>;
}

interface DetailResponse<T = any> {
  data?: T;
  schema?: Record<string, any>;
  form?: Record<string, any>;
}

/**
 * DataGrid component
 * Behavior-agnostic data grid with pluggable behaviors
 */
export class DataGrid {
  public config: DataGridConfig;
  public state: DataGridState;
  private selectors: DataGridSelectors;
  private tableEl: HTMLTableElement | null = null;
  private searchTimeout: number | null = null;
  private abortController: AbortController | null = null;
  private dropdownAbortController: AbortController | null = null;
  private didRestoreColumnOrder: boolean = false;
  private shouldReorderDOMOnRestore: boolean = false;
  private actionRenderer: ActionRenderer;
  private cellRendererRegistry: CellRendererRegistry;
  private recordsById: Record<string, any> = {};
  private notifier: ToastNotifier;
  private columnManager: ColumnManager | null = null;
  private defaultColumns: ColumnDefinition[];
  private lastSchema: Record<string, any> | null = null;
  private lastForm: Record<string, any> | null = null;

  constructor(config: DataGridConfig) {
    this.config = {
      perPage: 10,
      searchDelay: 300,
      behaviors: {},
      ...config
    };

    // Initialize notifier (use provided or fallback to alert/confirm)
    this.notifier = config.notifier || new FallbackNotifier();

    this.selectors = {
      table: `#${config.tableId}`,
      searchInput: '#table-search',
      perPageSelect: '#table-per-page',
      filterRow: '[data-filter-column]',
      columnToggleBtn: '#column-toggle-btn',
      columnToggleMenu: '#column-toggle-menu',
      exportBtn: '#export-btn',
      exportMenu: '#export-menu',
      paginationContainer: '#table-pagination',
      tableInfoStart: '#table-info-start',
      tableInfoEnd: '#table-info-end',
      tableInfoTotal: '#table-info-total',
      selectAllCheckbox: '#table-checkbox-all',
      rowCheckboxes: '.table-checkbox',
      bulkActionsBar: '#bulk-actions-bar',
      selectedCount: '#selected-count',
      ...config.selectors
    };

    // Restore persisted grouped mode state if enabled
    const panelId = this.config.panelId || this.config.tableId;
    const persistedViewMode = this.config.enableGroupedMode
      ? getPersistedViewMode(panelId)
      : null;
    const persistedExpandState = this.config.enableGroupedMode
      ? getPersistedExpandState(panelId)
      : new Set<string>();
    const initialViewMode = persistedViewMode || this.config.defaultViewMode || 'flat';

    this.state = {
      currentPage: 1,
      perPage: this.config.perPage || 10,
      totalRows: 0,
      search: '',
      filters: [],
      sort: [],
      selectedRows: new Set(),
      hiddenColumns: new Set(
        this.config.columns.filter(col => col.hidden).map(col => col.field)
      ),
      columnOrder: this.config.columns.map(col => col.field),  // Initialize with config column order
      // Phase 2: Grouped mode state
      viewMode: initialViewMode,
      groupedData: null,
      expandedGroups: persistedExpandState,
    };

    // Initialize action renderer and cell renderer registry
    this.actionRenderer = new ActionRenderer({
      mode: this.config.actionRenderMode || 'dropdown',  // Default to dropdown
      actionBasePath: this.config.actionBasePath || this.config.apiEndpoint,
      notifier: this.notifier  // Pass notifier to ActionRenderer
    });
    this.cellRendererRegistry = new CellRendererRegistry();

    // Register custom cell renderers if provided
    if (this.config.cellRenderers) {
      Object.entries(this.config.cellRenderers).forEach(([field, renderer]) => {
        this.cellRendererRegistry.register(field, renderer);
      });
    }

    // Snapshot default columns for "Reset to Default" behavior.
    // Keep a shallow copy so functions (renderers) remain intact.
    this.defaultColumns = this.config.columns.map(col => ({ ...col }));
  }

  /**
   * Initialize the data grid
   */
  init(): void {
    console.log('[DataGrid] Initializing with config:', this.config);
    this.tableEl = document.querySelector(this.selectors.table);
    if (!this.tableEl) {
      console.error(`[DataGrid] Table element not found: ${this.selectors.table}`);
      return;
    }
    console.log('[DataGrid] Table element found:', this.tableEl);

    // Don't auto-inject bulk actions toolbar - we use a custom overlay in the template
    // that's positioned at the bottom of the page
    // The auto-injection creates duplicate IDs and conflicts with our custom overlay

    // Restore state from URL before binding
    this.restoreStateFromURL();

    this.bindSearchInput();
    this.bindPerPageSelect();
    this.bindFilterInputs();
    this.bindColumnVisibility();
    this.bindExportButtons();
    this.bindSorting();
    this.bindSelection();
    this.bindBulkActions();
    this.bindBulkClearButton();
    this.bindDropdownToggles();

    // Initial data load
    this.refresh();
  }

  /**
   * Restore DataGrid state from URL parameters
   */
  private restoreStateFromURL(): void {
    const params = new URLSearchParams(window.location.search);
    this.didRestoreColumnOrder = false;
    this.shouldReorderDOMOnRestore = false;

    // Restore search
    const search = params.get('search');
    if (search) {
      this.state.search = search;
      const searchInput = document.querySelector<HTMLInputElement>(this.selectors.searchInput);
      if (searchInput) {
        searchInput.value = search;
      }
    }

    // Restore page
    const page = params.get('page');
    if (page) {
      const parsedPage = parseInt(page, 10);
      this.state.currentPage = Number.isNaN(parsedPage) ? 1 : Math.max(1, parsedPage);
    }

    // Restore perPage
    const perPage = params.get('perPage');
    if (perPage) {
      const parsedPerPage = parseInt(perPage, 10);
      const fallbackPerPage = this.config.perPage || 10;
      this.state.perPage = Number.isNaN(parsedPerPage)
        ? fallbackPerPage
        : Math.max(1, parsedPerPage);
      const perPageSelect = document.querySelector<HTMLSelectElement>(this.selectors.perPageSelect);
      if (perPageSelect) {
        perPageSelect.value = String(this.state.perPage);
      }
    }

    // Restore filters
    const filtersParam = params.get('filters');
    if (filtersParam) {
      try {
        this.state.filters = JSON.parse(filtersParam);
      } catch (e) {
        console.warn('[DataGrid] Failed to parse filters from URL:', e);
      }
    }

    // Restore sort
    const sortParam = params.get('sort');
    if (sortParam) {
      try {
        this.state.sort = JSON.parse(sortParam);
      } catch (e) {
        console.warn('[DataGrid] Failed to parse sort from URL:', e);
      }
    }

    // Restore hidden columns with precedence: URL > localStorage > defaults
    const hiddenColumnsParam = params.get('hiddenColumns');
    if (hiddenColumnsParam) {
      // Priority 1: URL params (authoritative for shared links)
      try {
        const hiddenArray = JSON.parse(hiddenColumnsParam);
        const validFields = new Set(this.config.columns.map(col => col.field));
        this.state.hiddenColumns = new Set(
          (Array.isArray(hiddenArray) ? hiddenArray : []).filter((field) => validFields.has(field))
        );
      } catch (e) {
        console.warn('[DataGrid] Failed to parse hidden columns from URL:', e);
      }
    } else if (this.config.behaviors?.columnVisibility) {
      // Priority 2: localStorage cache (fallback when no URL params)
      const allColumnFields = this.config.columns.map(col => col.field);
      const cachedHidden = this.config.behaviors.columnVisibility.loadHiddenColumnsFromCache(allColumnFields);
      if (cachedHidden.size > 0) {
        this.state.hiddenColumns = cachedHidden;
      }
      // Priority 3: defaults (all visible) - already initialized in constructor
    }

    // Restore column order from localStorage cache (not in URL by default per guiding notes)
    // Note: Column order is preferences-only, not URL-shareable
    if (this.config.behaviors?.columnVisibility?.loadColumnOrderFromCache) {
      const allColumnFields = this.config.columns.map(col => col.field);
      const cachedOrder = this.config.behaviors.columnVisibility.loadColumnOrderFromCache(allColumnFields);
      if (cachedOrder && cachedOrder.length > 0) {
        // Merge cached order with current columns (drop missing, append new)
        const validOrder = this.mergeColumnOrder(cachedOrder);
        this.state.columnOrder = validOrder;

        // Track whether we restored an order, and whether it requires DOM reordering.
        this.didRestoreColumnOrder = true;
        const defaultOrder = this.defaultColumns.map(col => col.field);
        this.shouldReorderDOMOnRestore = defaultOrder.join('|') !== validOrder.join('|');

        // Reorder config.columns to match
        const columnMap = new Map(this.config.columns.map(c => [c.field, c]));
        this.config.columns = validOrder
          .map(field => columnMap.get(field))
          .filter((c): c is ColumnDefinition => c !== undefined);

        console.log('[DataGrid] Column order restored from cache:', validOrder);
      }
    }

    console.log('[DataGrid] State restored from URL:', this.state);

    // Apply restored state to UI after a short delay to ensure DOM is ready
    setTimeout(() => {
      this.applyRestoredState();
    }, 0);
  }

  /**
   * Apply restored state to UI elements
   */
  private applyRestoredState(): void {
    // Apply filter values to inputs
    if (this.state.filters.length > 0) {
      this.state.filters.forEach(filter => {
        const input = document.querySelector<HTMLInputElement>(
          `[data-filter-column="${filter.column}"]`
        );
        if (input) {
          input.value = String(filter.value);
        }
      });
    }

    // Apply column order if restored from cache
    // Note: This reorders header/filter rows in DOM to match state.columnOrder
    if (this.didRestoreColumnOrder && this.shouldReorderDOMOnRestore) {
      this.reorderTableColumns(this.state.columnOrder);
    }

    // Apply column visibility (always, even if all visible)
    const visibleColumns = this.config.columns
      .filter(col => !this.state.hiddenColumns.has(col.field))
      .map(col => col.field);

    this.updateColumnVisibility(visibleColumns, true); // Skip URL update during restoration

    // Apply sort indicators
    if (this.state.sort.length > 0) {
      this.updateSortIndicators();
    }
  }

  /**
   * Push current state to URL without reloading page
   */
  private pushStateToURL(): void {
    const params = new URLSearchParams();

    // Add search
    if (this.state.search) {
      params.set('search', this.state.search);
    }

    // Add page (only if not page 1)
    if (this.state.currentPage > 1) {
      params.set('page', String(this.state.currentPage));
    }

    // Add perPage (only if different from default)
    if (this.state.perPage !== (this.config.perPage || 10)) {
      params.set('perPage', String(this.state.perPage));
    }

    // Add filters
    if (this.state.filters.length > 0) {
      params.set('filters', JSON.stringify(this.state.filters));
    }

    // Add sort
    if (this.state.sort.length > 0) {
      params.set('sort', JSON.stringify(this.state.sort));
    }

    // Add hidden columns
    if (this.state.hiddenColumns.size > 0) {
      params.set('hiddenColumns', JSON.stringify(Array.from(this.state.hiddenColumns)));
    }

    // Update URL without reload
    const newURL = params.toString()
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname;

    window.history.pushState({}, '', newURL);
    console.log('[DataGrid] URL updated:', newURL);
  }

  /**
   * Public API: sync current grid state to the URL.
   * Keeps `hiddenColumns` shareable; column order stays preferences-only by default.
   */
  syncURL(): void {
    this.pushStateToURL();
  }

  /**
   * Refresh data from API
   */
  async refresh(): Promise<void> {
    console.log('[DataGrid] ===== refresh() CALLED =====');
    console.log('[DataGrid] Current sort state:', JSON.stringify(this.state.sort));

    if (this.abortController) {
      this.abortController.abort();
    }

    this.abortController = new AbortController();

    try {
      const url = this.buildApiUrl();
      const response = await fetch(url, {
        signal: this.abortController.signal,
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ApiResponse = await response.json();
      console.log('[DataGrid] API Response:', data);
      console.log('[DataGrid] API Response data array:', data.data);
      console.log('[DataGrid] API Response total:', data.total, 'count:', data.count, '$meta:', data.$meta);
      this.lastSchema = data.schema || null;
      this.lastForm = data.form || null;
      const total = this.getResponseTotal(data);
      if (this.normalizePagination(total)) {
        return this.refresh();
      }
      console.log('[DataGrid] About to call renderData()...');
      this.renderData(data);
      console.log('[DataGrid] renderData() completed');
      this.updatePaginationUI(data);
      console.log('[DataGrid] ===== refresh() COMPLETED =====');
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('[DataGrid] Request aborted');
        return;
      }
      console.error('[DataGrid] Error fetching data:', error);
      this.showError('Failed to load data');
    }
  }

  /**
   * Build API URL with all query parameters
   */
  buildApiUrl(): string {
    const params = new URLSearchParams();
    const queryParams = this.buildQueryParams();

    Object.entries(queryParams).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        params.append(key, String(value));
      }
    });

    const url = `${this.config.apiEndpoint}?${params.toString()}`;
    console.log(`[DataGrid] API URL: ${url}`);
    return url;
  }

  /**
   * Build query string (for exports, etc.)
   */
  buildQueryString(): string {
    const params = new URLSearchParams();
    const queryParams = this.buildQueryParams();

    Object.entries(queryParams).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        params.append(key, String(value));
      }
    });

    return params.toString();
  }

  /**
   * Build query parameters from state using behaviors
   */
  private buildQueryParams(): Record<string, any> {
    const params: Record<string, any> = {};

    // Pagination
    if (this.config.behaviors?.pagination) {
      const paginationParams = this.config.behaviors.pagination.buildQuery(
        this.state.currentPage,
        this.state.perPage
      );
      Object.assign(params, paginationParams);
    }

    // Search
    if (this.state.search && this.config.behaviors?.search) {
      const searchParams = this.config.behaviors.search.buildQuery(this.state.search);
      Object.assign(params, searchParams);
    }

    // Filters
    if (this.state.filters.length > 0 && this.config.behaviors?.filter) {
      const filterParams = this.config.behaviors.filter.buildFilters(this.state.filters);
      Object.assign(params, filterParams);
    }

    // Sorting
    if (this.state.sort.length > 0 && this.config.behaviors?.sort) {
      const sortParams = this.config.behaviors.sort.buildQuery(this.state.sort);
      Object.assign(params, sortParams);
    }

    return params;
  }

  private getResponseTotal(data: ApiResponse): number | null {
    if (data.total !== undefined && data.total !== null) return data.total;
    if (data.$meta?.count !== undefined && data.$meta?.count !== null) return data.$meta.count;
    if (data.count !== undefined && data.count !== null) return data.count;
    return null;
  }

  private normalizePagination(total: number | null): boolean {
    if (total === null) {
      return false;
    }

    const nextPerPage = Math.max(1, this.state.perPage || this.config.perPage || 10);
    const maxPage = Math.max(1, Math.ceil(total / nextPerPage));
    let nextPage = this.state.currentPage;

    if (total === 0) {
      nextPage = 1;
    } else if (nextPage > maxPage) {
      nextPage = maxPage;
    } else if (nextPage < 1) {
      nextPage = 1;
    }

    const didCorrect = nextPerPage !== this.state.perPage || nextPage !== this.state.currentPage;
    if (didCorrect) {
      this.state.perPage = nextPerPage;
      this.state.currentPage = nextPage;
      this.pushStateToURL();
    }

    if (total === 0) {
      return false;
    }

    return didCorrect;
  }

  /**
   * Reset pagination to first page
   */
  resetPagination(): void {
    this.state.currentPage = 1;
  }

  /**
   * Update column visibility
   */
  updateColumnVisibility(visibleColumns: string[], skipURLUpdate: boolean = false): void {
    if (!this.tableEl) return;

    const visibleSet = new Set(visibleColumns);

    // Update hidden columns state
    this.state.hiddenColumns.clear();
    this.config.columns.forEach(col => {
      if (!visibleSet.has(col.field)) {
        this.state.hiddenColumns.add(col.field);
      }
    });

    // Update URL with new hidden columns state (unless during restoration)
    if (!skipURLUpdate) {
      this.pushStateToURL();
    }

    // Update header and filter row visibility
    // Note: This selector matches both header row th[data-column] and filter row th[data-column]
    // Filter row cells must have data-column attributes to stay aligned with headers
    const headerCells = this.tableEl.querySelectorAll('thead th[data-column]');
    headerCells.forEach((th) => {
      const field = (th as HTMLElement).dataset.column;
      if (field) {
        (th as HTMLElement).style.display = visibleSet.has(field) ? '' : 'none';
      }
    });

    // Update body cell visibility
    const bodyCells = this.tableEl.querySelectorAll('tbody td[data-column]');
    bodyCells.forEach((td) => {
      const field = (td as HTMLElement).dataset.column;
      if (field) {
        (td as HTMLElement).style.display = visibleSet.has(field) ? '' : 'none';
      }
    });

    // Sync checkbox state in column visibility menu
    this.syncColumnVisibilityCheckboxes();
  }

  /**
   * Sync column visibility switches with current state
   * Uses ColumnManager if available, falls back to direct DOM manipulation
   */
  private syncColumnVisibilityCheckboxes(): void {
    // Prefer ColumnManager if initialized
    if (this.columnManager) {
      this.columnManager.syncWithGridState();
      return;
    }

    // Fallback to direct DOM manipulation for legacy checkboxes
    const menu = document.querySelector(this.selectors.columnToggleMenu);
    if (!menu) return;

    this.config.columns.forEach(col => {
      const checkbox = menu.querySelector<HTMLInputElement>(
        `input[data-column="${col.field}"]`
      );
      if (checkbox) {
        checkbox.checked = !this.state.hiddenColumns.has(col.field);
      }
    });
  }

  /**
   * Render data into table
   */
  private renderData(data: ApiResponse): void {
    const tbody = this.tableEl?.querySelector('tbody');
    if (!tbody) {
      console.error('[DataGrid] tbody not found!');
      return;
    }

    tbody.innerHTML = '';

    const items = data.data || data.records || [];
    console.log(`[DataGrid] renderData() called with ${items.length} items`);
    console.log('[DataGrid] First 3 items:', items.slice(0, 3));
    const total = this.getResponseTotal(data);
    this.state.totalRows = total ?? items.length;

    if (items.length === 0) {
      // Use grouped empty state if in grouped mode
      if (this.config.enableGroupedMode && this.state.viewMode === 'grouped') {
        tbody.innerHTML = renderGroupedEmptyState(this.config.columns.length);
      } else {
        tbody.innerHTML = `
          <tr>
            <td colspan="${this.config.columns.length + 2}" class="px-6 py-8 text-center text-gray-500">
              No results found
            </td>
          </tr>
        `;
      }
      return;
    }

    // Clear records by ID cache
    this.recordsById = {};

    // Phase 2: Check if grouped mode is enabled and active
    if (this.config.enableGroupedMode && this.state.viewMode === 'grouped') {
      this.renderGroupedData(data, items, tbody);
    } else {
      // Flat mode rendering (original behavior)
      this.renderFlatData(items, tbody);
    }

    // Apply column visibility to new body cells
    // Note: config.columns is already in the correct order, but some may be hidden
    if (this.state.hiddenColumns.size > 0) {
      const bodyCells = tbody.querySelectorAll('td[data-column]');
      bodyCells.forEach((td) => {
        const field = (td as HTMLElement).dataset.column;
        if (field && this.state.hiddenColumns.has(field)) {
          (td as HTMLElement).style.display = 'none';
        }
      });
    }

    // Rebind selection after rendering
    this.updateSelectionBindings();
  }

  /**
   * Render data in flat mode (original behavior)
   */
  private renderFlatData(items: any[], tbody: HTMLElement): void {
    items.forEach((item: any, index: number) => {
      console.log(`[DataGrid] Rendering row ${index + 1}: id=${item.id}`);
      if (item.id) {
        this.recordsById[item.id] = item;
      }
      const row = this.createTableRow(item);
      tbody.appendChild(row);
    });

    console.log(`[DataGrid] Finished appending ${items.length} rows to tbody`);
    console.log(`[DataGrid] tbody.children.length =`, tbody.children.length);
  }

  /**
   * Render data in grouped mode (Phase 2)
   */
  private renderGroupedData(data: ApiResponse, items: any[], tbody: HTMLElement): void {
    const groupByField = this.config.groupByField || 'translation_group_id';

    // Transform to grouped structure
    let groupedData = transformToGroups(items, {
      groupByField,
      defaultExpanded: true,
      expandedGroups: this.state.expandedGroups,
    });

    // Merge backend summaries if available
    const backendSummaries = extractBackendSummaries(data as Record<string, unknown>);
    if (backendSummaries.size > 0) {
      groupedData = mergeBackendSummaries(groupedData, backendSummaries);
    }

    // Store grouped data in state
    this.state.groupedData = groupedData;

    const colSpan = this.config.columns.length;

    // Render grouped rows
    for (const group of groupedData.groups) {
      // Render group header row
      const headerHtml = renderGroupHeaderRow(group, colSpan);
      tbody.insertAdjacentHTML('beforeend', headerHtml);

      // Get the header row and bind click handler
      const headerRow = tbody.lastElementChild as HTMLElement;
      if (headerRow) {
        headerRow.addEventListener('click', () => this.toggleGroup(group.groupId));
        headerRow.addEventListener('keydown', (e: KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this.toggleGroup(group.groupId);
          }
        });
      }

      // Render child rows if expanded
      if (group.expanded) {
        for (const record of group.records) {
          if (record.id) {
            this.recordsById[record.id as string] = record;
          }
          const row = this.createTableRow(record);
          row.dataset.groupId = group.groupId;
          row.classList.add('group-child-row');
          tbody.appendChild(row);
        }
      }
    }

    // Render ungrouped rows (if any)
    for (const record of groupedData.ungrouped) {
      if (record.id) {
        this.recordsById[record.id as string] = record;
      }
      const row = this.createTableRow(record);
      tbody.appendChild(row);
    }

    console.log(`[DataGrid] Rendered ${groupedData.groups.length} groups, ${groupedData.ungrouped.length} ungrouped`);
  }

  /**
   * Toggle group expand/collapse state (Phase 2)
   */
  toggleGroup(groupId: string): void {
    if (!this.state.groupedData) return;

    // Toggle in state
    if (this.state.expandedGroups.has(groupId)) {
      this.state.expandedGroups.delete(groupId);
    } else {
      this.state.expandedGroups.add(groupId);
    }

    // Persist state
    const panelId = this.config.panelId || this.config.tableId;
    persistExpandState(panelId, this.state.expandedGroups);

    // Update the group's expanded state
    const group = this.state.groupedData.groups.find(g => g.groupId === groupId);
    if (group) {
      group.expanded = this.state.expandedGroups.has(groupId);
    }

    // Re-render the affected group (toggle child row visibility)
    this.updateGroupVisibility(groupId);
  }

  /**
   * Update visibility of child rows for a group
   */
  private updateGroupVisibility(groupId: string): void {
    const tbody = this.tableEl?.querySelector('tbody');
    if (!tbody) return;

    const headerRow = tbody.querySelector(`tr[data-group-id="${groupId}"]`) as HTMLElement;
    if (!headerRow) return;

    const isExpanded = this.state.expandedGroups.has(groupId);

    // Update header row state
    headerRow.dataset.expanded = String(isExpanded);
    headerRow.setAttribute('aria-expanded', String(isExpanded));

    // Update expand icon
    const expandIcon = headerRow.querySelector('.expand-icon');
    if (expandIcon) {
      expandIcon.textContent = isExpanded ? '▼' : '▶';
    }

    // Toggle child rows visibility
    const childRows = tbody.querySelectorAll<HTMLElement>(`tr.group-child-row[data-group-id="${groupId}"]`);
    childRows.forEach(row => {
      row.style.display = isExpanded ? '' : 'none';
    });
  }

  /**
   * Set view mode (flat, grouped, matrix) - Phase 2
   */
  setViewMode(mode: ViewMode): void {
    if (!this.config.enableGroupedMode) {
      console.warn('[DataGrid] Grouped mode not enabled');
      return;
    }

    // Apply viewport-specific adjustments
    const effectiveMode = getViewModeForViewport(mode);

    this.state.viewMode = effectiveMode;

    // Persist mode
    const panelId = this.config.panelId || this.config.tableId;
    persistViewMode(panelId, effectiveMode);

    // Re-fetch data with new mode
    this.refresh();
  }

  /**
   * Get current view mode
   */
  getViewMode(): ViewMode {
    return this.state.viewMode;
  }

  /**
   * Get grouped data (if available)
   */
  getGroupedData(): GroupedData | null {
    return this.state.groupedData;
  }

  /**
   * Fetch a detail payload and unwrap the record from the `data` field.
   */
  async fetchDetail(id: string): Promise<{ data: any; schema?: Record<string, any>; form?: Record<string, any>; tabs?: any[] }> {
    const response = await fetch(`${this.config.apiEndpoint}/${id}`, {
      headers: {
        'Accept': 'application/json'
      }
    });
    if (!response.ok) {
      throw new Error(`Detail request failed: ${response.status}`);
    }
    const payload = await response.json();
    const detail = this.normalizeDetailResponse(payload);
    if (detail.schema) {
      this.lastSchema = detail.schema;
    }
    if (detail.form) {
      this.lastForm = detail.form;
    }
    return {
      ...detail,
      tabs: detail.schema?.tabs || [],
    };
  }

  /**
   * Access the most recent schema returned by the API (list or detail).
   */
  getSchema(): Record<string, any> | null {
    return this.lastSchema;
  }

  /**
   * Access the most recent form returned by the API (list or detail).
   */
  getForm(): Record<string, any> | null {
    return this.lastForm;
  }

  /**
   * Access tabs from the most recent schema payload.
   */
  getTabs(): any[] {
    return this.lastSchema?.tabs || [];
  }

  private normalizeDetailResponse(payload: any): { data: any; schema?: Record<string, any>; form?: Record<string, any> } {
    if (payload && typeof payload === 'object' && 'data' in payload) {
      const detail = payload as DetailResponse;
      return {
        data: detail.data,
        schema: detail.schema,
        form: detail.form,
      };
    }
    return { data: payload };
  }

  private resolveRendererOptions(col: ColumnDefinition): Record<string, any> {
    const options = col.rendererOptions ?? col.renderer_options;
    if (!options || typeof options !== 'object' || Array.isArray(options)) {
      return {};
    }
    return options;
  }

  /**
   * Create table row element
   */
  private createTableRow(item: any): HTMLTableRowElement {
    const row = document.createElement('tr');

    // Apply custom row classes if provider is configured
    let rowClasses = ['hover:bg-gray-50'];
    if (this.config.rowClassProvider) {
      rowClasses = rowClasses.concat(this.config.rowClassProvider(item));
    }
    row.className = rowClasses.join(' ');

    // Checkbox cell
    const checkboxCell = document.createElement('td');
    checkboxCell.className = 'px-6 py-4 whitespace-nowrap';
    checkboxCell.dataset.role = 'selection';
    checkboxCell.dataset.fixed = 'left';
    checkboxCell.innerHTML = `
      <label class="flex">
        <input type="checkbox"
               class="table-checkbox shrink-0 border-gray-300 rounded text-blue-600 focus:ring-blue-500"
               data-id="${item.id}">
        <span class="sr-only">Select</span>
      </label>
    `;
    row.appendChild(checkboxCell);

    // Data cells
    this.config.columns.forEach((col) => {
      const cell = document.createElement('td');
      cell.className = 'px-6 py-4 whitespace-nowrap text-sm text-gray-800';
      cell.setAttribute('data-column', col.field);

      const value = item[col.field];
      const rendererName = typeof col.renderer === 'string' ? col.renderer.trim() : '';
      const rendererContext: CellRendererContext = {
        options: this.resolveRendererOptions(col),
      };

      // Priority: column render > field renderer > named renderer > default renderer
      if (col.render) {
        cell.innerHTML = col.render(value, item);
      } else if (this.cellRendererRegistry.has(col.field)) {
        const renderer = this.cellRendererRegistry.get(col.field);
        cell.innerHTML = renderer(value, item, col.field, rendererContext);
      } else if (rendererName && this.cellRendererRegistry.has(rendererName)) {
        const renderer = this.cellRendererRegistry.get(rendererName);
        cell.innerHTML = renderer(value, item, col.field, rendererContext);
      } else if (value === null || value === undefined) {
        cell.textContent = '-';
      } else if (col.field.includes('_at')) {
        cell.textContent = new Date(value).toLocaleDateString();
      } else {
        cell.textContent = String(value);
      }

      row.appendChild(cell);
    });

    // Actions cell
    const actionBase = this.config.actionBasePath || this.config.apiEndpoint;
    const actionsCell = document.createElement('td');
    actionsCell.className = 'px-6 py-4 whitespace-nowrap text-end text-sm font-medium';
    actionsCell.dataset.role = 'actions';
    actionsCell.dataset.fixed = 'right';

    // Use custom row actions if provided, otherwise use default actions
    if (this.config.rowActions) {
      const actions = this.config.rowActions(item);
      actionsCell.innerHTML = this.actionRenderer.renderRowActions(item, actions);

      // Attach event listeners for each action button
      actions.forEach(action => {
        const actionId = this.sanitizeActionId(action.label);
        const button = actionsCell.querySelector(`[data-action-id="${actionId}"]`);
        if (action.disabled) {
          return;
        }
        if (button) {
          button.addEventListener('click', async (e) => {
            e.preventDefault();
            if ((button as HTMLButtonElement).disabled) {
              return;
            }
            try {
              await action.action(item);
            } catch (error) {
              console.error(`Action "${action.label}" failed:`, error);
              const errorMsg = error instanceof Error ? error.message : `Action "${action.label}" failed`;
              this.notify(errorMsg, 'error');
            }
          });
        }
      });
    } else if (this.config.useDefaultActions !== false) {
      // Default actions (view, edit, delete)
      const defaultActions = [
        {
          label: 'View',
          icon: 'eye',
          action: () => { window.location.href = `${actionBase}/${item.id}`; },
          variant: 'secondary' as const
        },
        {
          label: 'Edit',
          icon: 'edit',
          action: () => { window.location.href = `${actionBase}/${item.id}/edit`; },
          variant: 'primary' as const
        },
        {
          label: 'Delete',
          icon: 'trash',
          action: async () => { await this.handleDelete(item.id); },
          variant: 'danger' as const
        }
      ];

      actionsCell.innerHTML = this.actionRenderer.renderRowActions(item, defaultActions);

      // Attach event listeners for each default action
      defaultActions.forEach(action => {
        const actionId = this.sanitizeActionId(action.label);
        const button = actionsCell.querySelector(`[data-action-id="${actionId}"]`);
        if (button) {
          button.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            if ((button as HTMLButtonElement).disabled) {
              return;
            }
            try {
              await action.action();
            } catch (error) {
              console.error(`Action "${action.label}" failed:`, error);
              const errorMsg = error instanceof Error ? error.message : `Action "${action.label}" failed`;
              this.notify(errorMsg, 'error');
            }
          });
        }
      });
    }

    row.appendChild(actionsCell);

    return row;
  }

  /**
   * Sanitize action label to create a valid ID
   */
  private sanitizeActionId(label: string): string {
    return label.toLowerCase().replace(/[^a-z0-9]/g, '-');
  }

  /**
   * Handle delete action
   */
  private async handleDelete(id: string): Promise<void> {
    const confirmed = await this.confirmAction('Are you sure you want to delete this item?');
    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`${this.config.apiEndpoint}/${id}`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Delete failed');
      }

      await this.refresh();
    } catch (error) {
      console.error('Error deleting item:', error);
      this.showError('Failed to delete item');
    }
  }

  /**
   * Update pagination UI
   */
  private updatePaginationUI(data: ApiResponse): void {
    const total = this.getResponseTotal(data) ?? this.state.totalRows;
    const offset = this.state.perPage * (this.state.currentPage - 1);
    const start = total === 0 ? 0 : offset + 1;
    const end = Math.min(offset + this.state.perPage, total);

    const startEl = document.querySelector(this.selectors.tableInfoStart);
    const endEl = document.querySelector(this.selectors.tableInfoEnd);
    const totalEl = document.querySelector(this.selectors.tableInfoTotal);

    if (startEl) startEl.textContent = String(start);
    if (endEl) endEl.textContent = String(end);
    if (totalEl) totalEl.textContent = String(total);

    this.renderPaginationButtons(total);
  }

  /**
   * Render pagination buttons
   */
  private renderPaginationButtons(total: number): void {
    const container = document.querySelector(this.selectors.paginationContainer);
    if (!container) return;

    const totalPages = Math.ceil(total / this.state.perPage);
    if (totalPages <= 1) {
      container.innerHTML = '';
      return;
    }

    const buttons: string[] = [];
    const current = this.state.currentPage;

    // Previous button
    buttons.push(`
      <button type="button"
              data-page="${current - 1}"
              ${current === 1 ? 'disabled' : ''}
              class="min-h-[38px] min-w-[38px] py-2 px-2.5 inline-flex justify-center items-center gap-x-1.5 text-sm rounded-lg text-gray-800 hover:bg-gray-100 focus:outline-none focus:bg-gray-100 disabled:opacity-50 disabled:pointer-events-none">
        <svg class="shrink-0 size-3.5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m15 18-6-6 6-6"></path>
        </svg>
        <span>Previous</span>
      </button>
    `);

    // Page numbers
    const maxButtons = 5;
    let startPage = Math.max(1, current - Math.floor(maxButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxButtons - 1);

    if (endPage - startPage < maxButtons - 1) {
      startPage = Math.max(1, endPage - maxButtons + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      const isActive = i === current;
      buttons.push(`
        <button type="button"
                data-page="${i}"
                class="min-h-[38px] min-w-[38px] flex justify-center items-center ${
                  isActive
                    ? 'bg-gray-200 text-gray-800 focus:outline-none focus:bg-gray-300'
                    : 'text-gray-800 hover:bg-gray-100 focus:outline-none focus:bg-gray-100'
                } py-2 px-3 text-sm rounded-lg">
          ${i}
        </button>
      `);
    }

    // Next button
    buttons.push(`
      <button type="button"
              data-page="${current + 1}"
              ${current === totalPages ? 'disabled' : ''}
              class="min-h-[38px] min-w-[38px] py-2 px-2.5 inline-flex justify-center items-center gap-x-1.5 text-sm rounded-lg text-gray-800 hover:bg-gray-100 focus:outline-none focus:bg-gray-100 disabled:opacity-50 disabled:pointer-events-none">
        <span>Next</span>
        <svg class="shrink-0 size-3.5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m9 18 6-6-6-6"></path>
        </svg>
      </button>
    `);

    container.innerHTML = buttons.join('');

    // Bind click handlers
    container.querySelectorAll('[data-page]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const page = parseInt((btn as HTMLElement).dataset.page || '1', 10);
        if (page >= 1 && page <= totalPages) {
          this.state.currentPage = page;
          this.pushStateToURL();
          if (this.config.behaviors?.pagination) {
            await this.config.behaviors.pagination.onPageChange(page, this);
          } else {
            await this.refresh();
          }
        }
      });
    });
  }

  /**
   * Bind search input
   */
  private bindSearchInput(): void {
    const input = document.querySelector<HTMLInputElement>(this.selectors.searchInput);
    if (!input) {
      console.warn(`[DataGrid] Search input not found: ${this.selectors.searchInput}`);
      return;
    }

    console.log(`[DataGrid] Search input bound to: ${this.selectors.searchInput}`);

    const clearBtn = document.getElementById('clear-search-btn');

    // Toggle clear button visibility
    const toggleClearBtn = () => {
      if (clearBtn) {
        if (input.value.trim()) {
          clearBtn.classList.remove('hidden');
        } else {
          clearBtn.classList.add('hidden');
        }
      }
    };

    input.addEventListener('input', () => {
      toggleClearBtn();

      if (this.searchTimeout) {
        clearTimeout(this.searchTimeout);
      }

      this.searchTimeout = window.setTimeout(async () => {
        console.log(`[DataGrid] Search triggered: "${input.value}"`);
        this.state.search = input.value;
        this.pushStateToURL();
        if (this.config.behaviors?.search) {
          await this.config.behaviors.search.onSearch(input.value, this);
        } else {
          this.resetPagination();
          await this.refresh();
        }
      }, this.config.searchDelay);
    });

    // Clear button handler
    if (clearBtn) {
      clearBtn.addEventListener('click', async () => {
        input.value = '';
        input.focus();
        toggleClearBtn();

        // Trigger search with empty value
        this.state.search = '';
        this.pushStateToURL();
        if (this.config.behaviors?.search) {
          await this.config.behaviors.search.onSearch('', this);
        } else {
          this.resetPagination();
          await this.refresh();
        }
      });
    }

    // Initial toggle on page load
    toggleClearBtn();
  }

  /**
   * Bind per-page select
   */
  private bindPerPageSelect(): void {
    const select = document.querySelector<HTMLSelectElement>(this.selectors.perPageSelect);
    if (!select) return;

    select.addEventListener('change', async () => {
      this.state.perPage = parseInt(select.value, 10);
      this.resetPagination();
      this.pushStateToURL();
      await this.refresh();
    });
  }

  /**
   * Bind filter inputs
   */
  private bindFilterInputs(): void {
    const filterInputs = document.querySelectorAll<HTMLInputElement | HTMLSelectElement>(this.selectors.filterRow);

    filterInputs.forEach((input) => {
      // Handler function for both input and change events
      const handleFilterChange = async () => {
        const column = input.dataset.filterColumn;
        const inputType = input instanceof HTMLInputElement ? input.type.toLowerCase() : '';
        const inferredOperator = input instanceof HTMLSelectElement
          ? 'eq'
          : (inputType === '' || inputType === 'text' || inputType === 'search' || inputType === 'email' || inputType === 'tel' || inputType === 'url')
            ? 'ilike'
            : 'eq';
        const operator = (input.dataset.filterOperator as any) || inferredOperator;
        const value = input.value;

        if (!column) return;

        // Update filters state
        const existingIndex = this.state.filters.findIndex(f => f.column === column);
        if (value) {
          const filter: ColumnFilter = { column, operator, value };
          if (existingIndex >= 0) {
            this.state.filters[existingIndex] = filter;
          } else {
            this.state.filters.push(filter);
          }
        } else {
          // Remove filter if value is empty
          if (existingIndex >= 0) {
            this.state.filters.splice(existingIndex, 1);
          }
        }

        this.pushStateToURL();
        if (this.config.behaviors?.filter) {
          await this.config.behaviors.filter.onFilterChange(column, value, this);
        } else {
          this.resetPagination();
          await this.refresh();
        }
      };

      // Bind both input (for text inputs) and change (for selects) events
      input.addEventListener('input', handleFilterChange);
      input.addEventListener('change', handleFilterChange);
    });
  }

  /**
   * Bind column visibility toggle using ColumnManager
   */
  private bindColumnVisibility(): void {
    const toggleBtn = document.querySelector(this.selectors.columnToggleBtn);
    const menu = document.querySelector<HTMLElement>(this.selectors.columnToggleMenu);

    if (!toggleBtn || !menu) return;

    // Initialize ColumnManager to render column items with switches and drag handles
    this.columnManager = new ColumnManager({
      container: menu,
      grid: this,
      onToggle: (field, visible) => {
        console.log(`[DataGrid] Column ${field} visibility toggled to ${visible}`);
      },
      onReorder: (order) => {
        console.log(`[DataGrid] Columns reordered:`, order);
      }
    });
  }

  /**
   * Bind export buttons
   */
  private bindExportButtons(): void {
    const menu = document.querySelector(this.selectors.exportMenu);
    if (!menu) return;

    const exportButtons = menu.querySelectorAll<HTMLButtonElement>('[data-export-format]');

    exportButtons.forEach((btn) => {
      btn.addEventListener('click', async () => {
        const format = (btn as HTMLElement).dataset.exportFormat as 'csv' | 'json' | 'excel' | 'pdf';
        if (!format || !this.config.behaviors?.export) return;

        // Get concurrency mode (default to 'single')
        const concurrency = this.config.behaviors.export.getConcurrency?.() || 'single';

        // Determine which buttons to disable based on concurrency mode
        const buttonsToDisable: HTMLButtonElement[] = [];
        if (concurrency === 'single') {
          // Disable all export buttons
          exportButtons.forEach(b => buttonsToDisable.push(b));
        } else if (concurrency === 'per-format') {
          // Disable only the clicked button
          buttonsToDisable.push(btn);
        }
        // 'none' mode: no buttons disabled, but clicked button still shows spinner

        // Helper to toggle spinner visibility on a button
        const showSpinner = (b: HTMLButtonElement) => {
          const icon = b.querySelector('.export-icon');
          const spinner = b.querySelector('.export-spinner');
          if (icon) icon.classList.add('hidden');
          if (spinner) spinner.classList.remove('hidden');
        };

        const hideSpinner = (b: HTMLButtonElement) => {
          const icon = b.querySelector('.export-icon');
          const spinner = b.querySelector('.export-spinner');
          if (icon) icon.classList.remove('hidden');
          if (spinner) spinner.classList.add('hidden');
        };

        // Apply loading state to buttons that should be disabled
        buttonsToDisable.forEach(b => {
          b.setAttribute('data-export-loading', 'true');
          b.disabled = true;
          showSpinner(b);
        });

        // For 'none' mode, still show spinner on clicked button (but don't disable)
        const showSpinnerOnly = concurrency === 'none';
        if (showSpinnerOnly) {
          btn.setAttribute('data-export-loading', 'true');
          showSpinner(btn);
        }

        try {
          await this.config.behaviors.export.export(format, this);
        } catch (error) {
          // Error already handled by the export behavior (toast shown)
          console.error('[DataGrid] Export failed:', error);
        } finally {
          // Clear loading state from disabled buttons
          buttonsToDisable.forEach(b => {
            b.removeAttribute('data-export-loading');
            b.disabled = false;
            hideSpinner(b);
          });

          // Clear spinner-only state for 'none' mode
          if (showSpinnerOnly) {
            btn.removeAttribute('data-export-loading');
            hideSpinner(btn);
          }
        }
      });
    });
  }

  /**
   * Bind table sorting
   */
  private bindSorting(): void {
    if (!this.tableEl) return;

    // Bind new sort buttons ([data-sort-column])
    const sortButtons = this.tableEl.querySelectorAll<HTMLButtonElement>('[data-sort-column]');

    sortButtons.forEach((button) => {
      button.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();

        const field = button.dataset.sortColumn;
        if (!field) return;

        console.log(`[DataGrid] Sort button clicked for field: ${field}`);

        // Triple-click cycle: none -> asc -> desc -> none -> asc -> ...
        const existing = this.state.sort.find(s => s.field === field);
        let direction: 'asc' | 'desc' | null = null;

        if (existing) {
          if (existing.direction === 'asc') {
            // asc -> desc
            direction = 'desc';
            existing.direction = direction;
          } else {
            // desc -> none (clear sort)
            this.state.sort = this.state.sort.filter(s => s.field !== field);
            direction = null;
            console.log(`[DataGrid] Sort cleared for field: ${field}`);
          }
        } else {
          // none -> asc
          direction = 'asc';
          this.state.sort = [{ field, direction }];
        }

        console.log(`[DataGrid] New sort state:`, this.state.sort);

        this.pushStateToURL();

        if (direction !== null && this.config.behaviors?.sort) {
          console.log('[DataGrid] Calling custom sort behavior');
          await this.config.behaviors.sort.onSort(field, direction, this);
        } else {
          console.log('[DataGrid] Calling refresh() for sort');
          await this.refresh();
        }

        // Update UI
        console.log('[DataGrid] Updating sort indicators');
        this.updateSortIndicators();
      });
    });

    // Also bind legacy sortable headers ([data-sort])
    const sortableHeaders = this.tableEl.querySelectorAll<HTMLElement>('[data-sort]');

    sortableHeaders.forEach((header) => {
      header.addEventListener('click', async () => {
        const field = header.dataset.sort;
        if (!field) return;

        // Triple-click cycle: none -> asc -> desc -> none -> asc -> ...
        const existing = this.state.sort.find(s => s.field === field);
        let direction: 'asc' | 'desc' | null = null;

        if (existing) {
          if (existing.direction === 'asc') {
            // asc -> desc
            direction = 'desc';
            existing.direction = direction;
          } else {
            // desc -> none (clear sort)
            this.state.sort = this.state.sort.filter(s => s.field !== field);
            direction = null;
          }
        } else {
          // none -> asc
          direction = 'asc';
          this.state.sort = [{ field, direction }];
        }

        this.pushStateToURL();

        if (direction !== null && this.config.behaviors?.sort) {
          await this.config.behaviors.sort.onSort(field, direction, this);
        } else {
          await this.refresh();
        }

        // Update UI
        this.updateSortIndicators();
      });
    });
  }

  /**
   * Update sort indicators in table headers
   */
  private updateSortIndicators(): void {
    if (!this.tableEl) return;

    // Handle both old [data-sort] and new [data-sort-column] buttons
    const sortButtons = this.tableEl.querySelectorAll<HTMLButtonElement>('[data-sort-column]');

    sortButtons.forEach((button) => {
      const field = button.dataset.sortColumn;
      if (!field) return;

      const sorted = this.state.sort.find(s => s.field === field);
      const svg = button.querySelector('svg');

      if (svg) {
        // Update button visibility and styling based on sort state
        if (sorted) {
          button.classList.remove('opacity-0');
          button.classList.add('opacity-100');

          // Update icon based on direction
          if (sorted.direction === 'asc') {
            // Show ascending arrow (up arrow only)
            svg.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />';
            svg.classList.add('text-blue-600');
            svg.classList.remove('text-gray-400');
          } else {
            // Show descending arrow (down arrow only)
            svg.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />';
            svg.classList.add('text-blue-600');
            svg.classList.remove('text-gray-400');
          }
        } else {
          // Reset to default double arrow
          svg.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />';
          svg.classList.remove('text-blue-600');
          svg.classList.add('text-gray-400');
        }
      }
    });

    // Also handle legacy [data-sort] headers with .sort-indicator
    const headers = this.tableEl.querySelectorAll<HTMLElement>('[data-sort]');
    headers.forEach((header) => {
      const field = header.dataset.sort;
      const sorted = this.state.sort.find(s => s.field === field);

      const indicator = header.querySelector('.sort-indicator');
      if (indicator) {
        indicator.textContent = sorted ? (sorted.direction === 'asc' ? '↑' : '↓') : '';
      }
    });
  }

  /**
   * Bind selection checkboxes
   */
  private bindSelection(): void {
    const selectAll = document.querySelector<HTMLInputElement>(this.selectors.selectAllCheckbox);

    if (selectAll) {
      selectAll.addEventListener('change', () => {
        const checkboxes = document.querySelectorAll<HTMLInputElement>(this.selectors.rowCheckboxes);
        checkboxes.forEach((cb) => {
          cb.checked = selectAll.checked;
          const id = cb.dataset.id;
          if (id) {
            if (selectAll.checked) {
              this.state.selectedRows.add(id);
            } else {
              this.state.selectedRows.delete(id);
            }
          }
        });
        this.updateBulkActionsBar();
      });
    }

    this.updateSelectionBindings();
  }

  /**
   * Update selection bindings after rendering
   * This syncs checkbox states with the selectedRows Set
   */
  private updateSelectionBindings(): void {
    const checkboxes = document.querySelectorAll<HTMLInputElement>(this.selectors.rowCheckboxes);

    checkboxes.forEach((cb) => {
      const id = cb.dataset.id;

      // Sync checkbox state with selectedRows Set
      if (id) {
        cb.checked = this.state.selectedRows.has(id);
      }

      // Remove old listeners to avoid duplicates (use once: true or track bound status in production)
      cb.addEventListener('change', () => {
        if (id) {
          if (cb.checked) {
            this.state.selectedRows.add(id);
          } else {
            this.state.selectedRows.delete(id);
          }
        }
        this.updateBulkActionsBar();
      });
    });
  }

  /**
   * Bind bulk action buttons
   */
  private bindBulkActions(): void {
    const overlay = document.getElementById('bulk-actions-overlay');
    const bulkBase = overlay?.dataset?.bulkBase || '';
    const bulkActionButtons = document.querySelectorAll('[data-bulk-action]');

    bulkActionButtons.forEach((btn) => {
      btn.addEventListener('click', async () => {
        const el = btn as HTMLElement;
        const actionId = el.dataset.bulkAction;
        if (!actionId) return;

        const ids = Array.from(this.state.selectedRows);
        if (ids.length === 0) {
          this.notify('Please select items first', 'warning');
          return;
        }

        // 1. Try config.bulkActions first (inline JS config)
        if (this.config.bulkActions) {
          const bulkActionConfig = this.config.bulkActions.find(ba => ba.id === actionId);
          if (bulkActionConfig) {
            try {
              await this.actionRenderer.executeBulkAction(bulkActionConfig, ids);
              this.state.selectedRows.clear();
              this.updateBulkActionsBar();
              await this.refresh();
            } catch (error) {
              console.error('Bulk action failed:', error);
              this.showError('Bulk action failed');
            }
            return;
          }
        }

        // 2. Try DOM data-driven config (from server-rendered data-bulk-* attributes)
        if (bulkBase) {
          const endpoint = `${bulkBase}/${actionId}`;
          const confirmMsg = el.dataset.bulkConfirm;
          const payloadRequired = this.parseDatasetStringArray(el.dataset.bulkPayloadRequired);
          const payloadSchema = this.parseDatasetObject(el.dataset.bulkPayloadSchema);
          const domConfig = {
            id: actionId,
            label: el.textContent?.trim() || actionId,
            endpoint: endpoint,
            confirm: confirmMsg,
            payloadRequired: payloadRequired,
            payloadSchema: payloadSchema,
          };
          try {
            await this.actionRenderer.executeBulkAction(domConfig, ids);
            this.state.selectedRows.clear();
            this.updateBulkActionsBar();
            await this.refresh();
          } catch (error) {
            console.error('Bulk action failed:', error);
            this.showError('Bulk action failed');
          }
          return;
        }

        // 3. Fall back to behaviors.bulkActions (old system)
        if (this.config.behaviors?.bulkActions) {
          try {
            await this.config.behaviors.bulkActions.execute(actionId, ids, this);
            this.state.selectedRows.clear();
            this.updateBulkActionsBar();
          } catch (error) {
            console.error('Bulk action failed:', error);
            this.showError('Bulk action failed');
          }
        }
      });
    });

    // Bind clear selection button
    const clearBtn = document.getElementById('clear-selection-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.state.selectedRows.clear();
        this.updateBulkActionsBar();
        // Uncheck all checkboxes
        const checkboxes = document.querySelectorAll<HTMLInputElement>('.table-checkbox');
        checkboxes.forEach(cb => cb.checked = false);
        const selectAll = document.querySelector<HTMLInputElement>(this.selectors.selectAllCheckbox);
        if (selectAll) selectAll.checked = false;
      });
    }

    // Bind overflow menu toggle
    this.bindOverflowMenu();
  }

  /**
   * Bind overflow menu toggle (three-dot "More" button)
   */
  private bindOverflowMenu(): void {
    const moreBtn = document.getElementById('bulk-more-btn');
    const menu = document.getElementById('bulk-overflow-menu');
    if (!moreBtn || !menu) return;

    moreBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      menu.classList.toggle('hidden');
    });

    // Close on outside click
    document.addEventListener('click', () => {
      menu.classList.add('hidden');
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        menu.classList.add('hidden');
      }
    });

    // Prevent menu clicks from closing the menu
    menu.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }

  /**
   * Update bulk actions bar visibility with animation
   */
  private updateBulkActionsBar(): void {
    const overlay = document.getElementById('bulk-actions-overlay');
    const countEl = document.getElementById('selected-count');
    const selectedCount = this.state.selectedRows.size;

    console.log('[DataGrid] updateBulkActionsBar - overlay:', overlay, 'countEl:', countEl, 'count:', selectedCount);

    if (!overlay || !countEl) {
      console.error('[DataGrid] Missing bulk actions elements!');
      return;
    }

    // Update count
    countEl.textContent = String(selectedCount);

    // Show/hide with animation
    if (selectedCount > 0) {
      overlay.classList.remove('hidden');
      // Trigger reflow for animation
      void overlay.offsetHeight;
    } else {
      overlay.classList.add('hidden');
    }
  }

  /**
   * Bind clear selection button
   */
  private bindBulkClearButton(): void {
    const clearBtn = document.getElementById('bulk-clear-selection');
    console.log('[DataGrid] Binding clear button:', clearBtn);
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        console.log('[DataGrid] Clear button clicked!');
        this.clearSelection();
      });
    } else {
      console.error('[DataGrid] Clear button not found!');
    }
  }

  /**
   * Clear all selections
   */
  private clearSelection(): void {
    console.log('[DataGrid] Clearing selection...');
    this.state.selectedRows.clear();

    // Uncheck the "select all" checkbox in the table header
    const selectAllCheckbox = document.querySelector<HTMLInputElement>(this.selectors.selectAllCheckbox);
    if (selectAllCheckbox) {
      selectAllCheckbox.checked = false;
    }

    this.updateBulkActionsBar();
    this.updateSelectionBindings();
  }

  /**
   * Position dropdown menu intelligently based on available space
   */
  private positionDropdownMenu(trigger: HTMLElement, menu: HTMLElement): void {
    const triggerRect = trigger.getBoundingClientRect();
    const menuHeight = menu.offsetHeight || 300; // Estimate if not rendered
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - triggerRect.bottom;
    const spaceAbove = triggerRect.top;

    // Determine if menu should open upward or downward
    const shouldOpenUpward = spaceBelow < menuHeight && spaceAbove > spaceBelow;

    // Position horizontally (align right edge of menu with trigger)
    const left = triggerRect.right - (menu.offsetWidth || 224); // 224px = 14rem default width
    menu.style.left = `${Math.max(10, left)}px`; // At least 10px from left edge

    // Position vertically
    if (shouldOpenUpward) {
      // Open upward
      menu.style.top = `${triggerRect.top - menuHeight - 8}px`;
      menu.style.bottom = 'auto';
    } else {
      // Open downward (default)
      menu.style.top = `${triggerRect.bottom + 8}px`;
      menu.style.bottom = 'auto';
    }
  }

  /**
   * Bind dropdown toggles
   */
  private bindDropdownToggles(): void {
    // Ensure we don't stack global listeners across in-page navigations.
    if (this.dropdownAbortController) {
      this.dropdownAbortController.abort();
    }
    this.dropdownAbortController = new AbortController();
    const { signal } = this.dropdownAbortController;

    // Existing dropdown toggles (column visibility, export, etc.)
    // Defensive: ensure all dropdown menus start hidden
    document.querySelectorAll('[data-dropdown-toggle]').forEach((toggle) => {
      const targetId = (toggle as HTMLElement).dataset.dropdownToggle;
      const target = document.getElementById(targetId || '');
      if (target && !target.classList.contains('hidden')) {
        target.classList.add('hidden');
      }
    });

    document.querySelectorAll('[data-dropdown-toggle]').forEach((toggle) => {
      toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const targetId = (toggle as HTMLElement).dataset.dropdownToggle;
        const target = document.getElementById(targetId || '');

        if (target) {
          const isOpening = target.classList.contains('hidden');

          // Close all other toggle dropdowns before opening this one
          document.querySelectorAll('[data-dropdown-toggle]').forEach((otherToggle) => {
            const otherId = (otherToggle as HTMLElement).dataset.dropdownToggle;
            const otherTarget = document.getElementById(otherId || '');
            if (otherTarget && otherTarget !== target) {
              otherTarget.classList.add('hidden');
            }
          });

          // Toggle this dropdown
          target.classList.toggle('hidden');
        }
      }, { signal });
    });

    // Action dropdown menus (row actions)
    document.addEventListener('click', (e) => {
      const trigger = (e.target as HTMLElement).closest('[data-dropdown-trigger]');

      if (trigger) {
        e.stopPropagation();
        const dropdown = trigger.closest('[data-dropdown]');
        const menu = dropdown?.querySelector('.actions-menu') as HTMLElement;

        // Close other action dropdowns
        document.querySelectorAll('.actions-menu').forEach(m => {
          if (m !== menu) m.classList.add('hidden');
        });

        // Toggle this dropdown
        const isOpening = menu?.classList.contains('hidden');
        menu?.classList.toggle('hidden');
        trigger.setAttribute('aria-expanded', isOpening ? 'true' : 'false');

        // Position the dropdown intelligently (only when opening)
        if (isOpening && menu) {
          this.positionDropdownMenu(trigger as HTMLElement, menu);
        }
      } else {
        // Check if the click is inside an open dropdown menu (e.g., column toggle menu)
        const clickedInsideDropdownMenu = (e.target as HTMLElement).closest('[data-dropdown-toggle], #column-toggle-menu, #export-menu');

        if (!clickedInsideDropdownMenu) {
          // Close all action dropdowns when clicking outside
          document.querySelectorAll('.actions-menu').forEach(m =>
            m.classList.add('hidden')
          );

          // Also close existing dropdowns
          document.querySelectorAll('[data-dropdown-toggle]').forEach((toggle) => {
            const targetId = (toggle as HTMLElement).dataset.dropdownToggle;
            const target = document.getElementById(targetId || '');
            if (target) {
              target.classList.add('hidden');
            }
          });
        }
      }
    }, { signal });

    // ESC key closes all dropdowns
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        // Close action dropdowns
        document.querySelectorAll('.actions-menu').forEach(m => {
          m.classList.add('hidden');
          const trigger = m.closest('[data-dropdown]')?.querySelector('[data-dropdown-trigger]');
          if (trigger) trigger.setAttribute('aria-expanded', 'false');
        });

        // Close toggle dropdowns (column visibility, export, etc.)
        document.querySelectorAll('[data-dropdown-toggle]').forEach((toggle) => {
          const targetId = (toggle as HTMLElement).dataset.dropdownToggle;
          const target = document.getElementById(targetId || '');
          if (target) {
            target.classList.add('hidden');
          }
        });
      }
    }, { signal });
  }

  /**
   * Show error message using notifier
   */
  private showError(message: string): void {
    console.error(message);
    this.notifier.error(message);
  }

  /**
   * Show notification using notifier
   */
  private notify(message: string, type: 'success' | 'error' | 'warning' | 'info'): void {
    this.notifier.show({ message, type });
  }

  /**
   * Show confirmation dialog using notifier
   */
  private async confirmAction(message: string): Promise<boolean> {
    return this.notifier.confirm(message);
  }

  /**
   * Extract error message from Response or Error
   */
  private async extractError(error: unknown): Promise<string> {
    if (error instanceof Response) {
      return extractErrorMessage(error);
    }
    if (error instanceof Error) {
      return error.message;
    }
    return 'An unexpected error occurred';
  }

  private parseDatasetStringArray(raw: string | undefined): string[] | undefined {
    if (!raw) {
      return undefined;
    }
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) {
        return undefined;
      }
      const result = parsed
        .map((item) => (typeof item === 'string' ? item.trim() : ''))
        .filter((item) => item.length > 0);
      return result.length > 0 ? result : undefined;
    } catch (error) {
      console.warn('[DataGrid] Failed to parse bulk payload_required:', error);
      return undefined;
    }
  }

  private parseDatasetObject(raw: string | undefined): Record<string, unknown> | undefined {
    if (!raw) {
      return undefined;
    }
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return undefined;
      }
      return parsed as Record<string, unknown>;
    } catch (error) {
      console.warn('[DataGrid] Failed to parse bulk payload_schema:', error);
      return undefined;
    }
  }

  /**
   * Reorder columns based on the provided order array
   * Updates config.columns order and triggers DOM reordering
   * Note: Column order is NOT pushed to URL by default (per guiding notes)
   */
  reorderColumns(newOrder: string[]): void {
    if (!this.tableEl) return;

    // Validate and merge order with current columns
    // - Keep only columns that exist in config.columns
    // - Append any new columns not in newOrder
    const validOrder = this.mergeColumnOrder(newOrder);

    // Update state
    this.state.columnOrder = validOrder;

    // Reorder config.columns to match the new order
    const columnMap = new Map(this.config.columns.map(c => [c.field, c]));
    this.config.columns = validOrder
      .map(field => columnMap.get(field))
      .filter((c): c is ColumnDefinition => c !== undefined);

    // Reorder DOM elements
    this.reorderTableColumns(validOrder);

    console.log('[DataGrid] Columns reordered:', validOrder);
  }

  /**
   * Reset columns to their initial/default order and visibility.
   * Intended to be called by ColumnManager's "Reset to Default" action.
   */
  resetColumnsToDefault(): void {
    // Clear persisted preferences first (localStorage + optional server sync)
    // so "Reset to Default" truly removes saved state instead of re-saving defaults.
    this.config.behaviors?.columnVisibility?.clearSavedPrefs?.();

    // Restore default config columns (shallow copies)
    this.config.columns = this.defaultColumns.map(col => ({ ...col }));
    this.state.columnOrder = this.config.columns.map(col => col.field);

    // Default visibility: visible unless column.hidden is true
    const visibleColumns = this.config.columns
      .filter(col => !col.hidden)
      .map(col => col.field);

    // Apply DOM updates if table is initialized
    if (this.tableEl) {
      this.reorderTableColumns(this.state.columnOrder);
      this.updateColumnVisibility(visibleColumns);
    } else {
      this.state.hiddenColumns = new Set(
        this.config.columns.filter(col => col.hidden).map(col => col.field)
      );
    }

    // Re-render the column menu to reflect defaults (Sortable is re-initialized in refresh()).
    if (this.columnManager) {
      this.columnManager.refresh();
      this.columnManager.syncWithGridState();
    }

    console.log('[DataGrid] Columns reset to default');
  }

  /**
   * Merge and validate saved column order with current columns
   * - Drops columns that no longer exist
   * - Appends new columns that aren't in saved order
   */
  private mergeColumnOrder(savedOrder: string[]): string[] {
    const currentFields = new Set(this.config.columns.map(c => c.field));
    const savedSet = new Set(savedOrder);

    // Keep only saved columns that still exist
    const validSaved = savedOrder.filter(field => currentFields.has(field));

    // Find new columns not in saved order (append at end)
    const newColumns = this.config.columns
      .map(c => c.field)
      .filter(field => !savedSet.has(field));

    return [...validSaved, ...newColumns];
  }

  /**
   * Reorder table DOM elements (header, filter row, body rows)
   * Moves existing nodes rather than recreating them to preserve event listeners
   */
  private reorderTableColumns(order: string[]): void {
    if (!this.tableEl) return;

    // Reorder header row
    const headerRow = this.tableEl.querySelector('thead tr:first-child');
    if (headerRow) {
      this.reorderRowCells(headerRow, order, 'th');
    }

    // Reorder filter row
    const filterRow = this.tableEl.querySelector('#filter-row');
    if (filterRow) {
      this.reorderRowCells(filterRow, order, 'th');
    }

    // Reorder body rows
    const bodyRows = this.tableEl.querySelectorAll('tbody tr');
    bodyRows.forEach(row => {
      this.reorderRowCells(row, order, 'td');
    });
  }

  /**
   * Reorder cells within a single row
   * Preserves fixed columns (selection on left, actions on right)
   */
  private reorderRowCells(row: Element, order: string[], cellTag: 'th' | 'td'): void {
    // Get data cells (those with data-column attribute)
    const dataCells = Array.from(row.querySelectorAll(`${cellTag}[data-column]`));
    const cellMap = new Map(
      dataCells.map(cell => [(cell as HTMLElement).dataset.column!, cell])
    );

    // Get fixed cells (selection/actions)
    // Prefer explicit markers; fall back to heuristics for legacy tables.
    const allCells = Array.from(row.querySelectorAll(cellTag));
    const selectionCell =
      row.querySelector(`${cellTag}[data-role="selection"]`) ||
      allCells.find(cell => cell.querySelector('input[type="checkbox"]'));
    const actionsCell =
      row.querySelector(`${cellTag}[data-role="actions"]`) ||
      allCells.find(cell =>
        !((cell as HTMLElement).dataset.column) && (
          cell.querySelector('[data-action]') ||
          cell.querySelector('[data-action-id]') ||
          cell.querySelector('.dropdown')
        )
      );

    // Build reordered cells array
    const reorderedCells: Element[] = [];

    // Add selection cell first (if exists)
    if (selectionCell) {
      reorderedCells.push(selectionCell);
    }

    // Add data cells in new order
    order.forEach(field => {
      const cell = cellMap.get(field);
      if (cell) {
        reorderedCells.push(cell);
      }
    });

    // Add actions cell last (if exists)
    if (actionsCell) {
      reorderedCells.push(actionsCell);
    }

    // Move cells to new positions (appending moves, doesn't clone)
    reorderedCells.forEach(cell => {
      row.appendChild(cell);
    });
  }

  /**
   * Cleanup and destroy the DataGrid instance
   * Call this when removing the grid from the DOM to prevent memory leaks
   */
  destroy(): void {
    // Destroy ColumnManager (cleans up SortableJS instance)
    if (this.columnManager) {
      this.columnManager.destroy();
      this.columnManager = null;
    }

    // Remove global dropdown listeners
    if (this.dropdownAbortController) {
      this.dropdownAbortController.abort();
      this.dropdownAbortController = null;
    }

    // Abort any pending API requests
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    // Clear search timeout
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
      this.searchTimeout = null;
    }

    console.log('[DataGrid] Instance destroyed');
  }
}

// Export for global usage
if (typeof window !== 'undefined') {
  (window as any).DataGrid = DataGrid;
}
