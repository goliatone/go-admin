import type {
  DataGridConfig,
  DataGridURLStateConfig,
  DataGridSelectors,
  DataGridState,
  ApiResponse,
  DetailResponse,
  ColumnDefinition,
  DataGridStateStore,
} from './core-types.js';
import { ActionRenderer } from './actions.js';
import { CellRendererRegistry } from './renderers.js';
import { FallbackNotifier } from '../toast/toast-manager.js';
import { createDataGridStateStore } from './state-store.js';
import {
  getPersistedExpandMode,
  getPersistedExpandState,
  getPersistedViewMode,
  hasPersistedExpandState,
  normalizeExpandMode,
} from './grouped-mode.js';
import {
  DATAGRID_DEFAULT_MAX_FILTERS_LENGTH,
  DATAGRID_DEFAULT_MAX_URL_LENGTH,
  DATAGRID_MANAGED_URL_KEYS,
  DATAGRID_URL_KEY_EXPANDED_GROUPS,
  DATAGRID_URL_KEY_FILTERS,
  DATAGRID_URL_KEY_HIDDEN_COLUMNS,
  DATAGRID_URL_KEY_PAGE,
  DATAGRID_URL_KEY_PER_PAGE,
  DATAGRID_URL_KEY_SEARCH,
  DATAGRID_URL_KEY_SORT,
  DATAGRID_URL_KEY_STATE,
  DATAGRID_URL_KEY_VIEW_MODE,
} from './core-constants.js';
import * as stateOps from './core-state.js';
import * as fetchOps from './core-fetch-query.js';
import * as groupedOps from './core-grouped.js';
import * as renderOps from './core-rendering.js';
import * as lifecycleOps from './core-lifecycle.js';
import * as columnOps from './core-columns.js';

export type { DataGridConfig } from './core-types.js';

export class DataGrid {
  private static readonly URL_KEY_SEARCH = DATAGRID_URL_KEY_SEARCH;
  private static readonly URL_KEY_PAGE = DATAGRID_URL_KEY_PAGE;
  private static readonly URL_KEY_PER_PAGE = DATAGRID_URL_KEY_PER_PAGE;
  private static readonly URL_KEY_FILTERS = DATAGRID_URL_KEY_FILTERS;
  private static readonly URL_KEY_SORT = DATAGRID_URL_KEY_SORT;
  private static readonly URL_KEY_STATE = DATAGRID_URL_KEY_STATE;
  private static readonly URL_KEY_HIDDEN_COLUMNS = DATAGRID_URL_KEY_HIDDEN_COLUMNS;
  private static readonly URL_KEY_VIEW_MODE = DATAGRID_URL_KEY_VIEW_MODE;
  private static readonly URL_KEY_EXPANDED_GROUPS = DATAGRID_URL_KEY_EXPANDED_GROUPS;
  private static readonly MANAGED_URL_KEYS = DATAGRID_MANAGED_URL_KEYS;
  private static readonly DEFAULT_MAX_URL_LENGTH = DATAGRID_DEFAULT_MAX_URL_LENGTH;
  private static readonly DEFAULT_MAX_FILTERS_LENGTH = DATAGRID_DEFAULT_MAX_FILTERS_LENGTH;

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
  private notifier: any;
  private columnManager: any = null;
  private defaultColumns: ColumnDefinition[];
  private lastSchema: Record<string, any> | null = null;
  private lastForm: Record<string, any> | null = null;
  private stateStore: DataGridStateStore;
  private hasURLStateOverrides: boolean = false;
  private hasPersistedHiddenColumnState: boolean = false;
  private hasPersistedColumnOrderState: boolean = false;

  constructor(config: DataGridConfig) {
    this.config = {
      perPage: 10,
      searchDelay: 300,
      behaviors: {},
      ...config,
    };

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
      ...config.selectors,
    };

    const panelId = this.config.panelId || this.config.tableId;
    this.stateStore = this.config.stateStore || createDataGridStateStore({
      key: panelId,
      ...(this.config.stateStoreConfig || {}),
    });

    const persistedState = this.stateStore.loadPersistedState();
    const validFields = new Set(this.config.columns.map((col) => col.field));
    const defaultHiddenColumns = new Set(
      this.config.columns.filter((col) => col.hidden).map((col) => col.field),
    );
    const hasPersistedHiddenColumns = !!persistedState && Array.isArray(persistedState.hiddenColumns);
    this.hasPersistedHiddenColumnState = hasPersistedHiddenColumns;
    const persistedHiddenColumns = new Set(
      (persistedState?.hiddenColumns || []).filter((field) => validFields.has(field)),
    );
    const defaultColumnOrder = this.config.columns.map((col) => col.field);
    const hasPersistedColumnOrder = !!persistedState && Array.isArray(persistedState.columnOrder) && persistedState.columnOrder.length > 0;
    this.hasPersistedColumnOrderState = hasPersistedColumnOrder;
    const persistedColumnOrder = (persistedState?.columnOrder || []).filter((field) => validFields.has(field));
    const mergedColumnOrder = hasPersistedColumnOrder
      ? [...persistedColumnOrder, ...defaultColumnOrder.filter((field) => !persistedColumnOrder.includes(field))]
      : defaultColumnOrder;

    const legacyHasPersistedExpandState = this.config.enableGroupedMode
      ? hasPersistedExpandState(panelId)
      : false;
    const legacyViewMode = this.config.enableGroupedMode
      ? getPersistedViewMode(panelId)
      : null;
    const legacyExpandMode = this.config.enableGroupedMode
      ? getPersistedExpandMode(panelId)
      : 'explicit';
    const legacyExpandedGroups = this.config.enableGroupedMode
      ? getPersistedExpandState(panelId)
      : new Set<string>();

    const persistedExpandMode = normalizeExpandMode(
      persistedState?.expandMode,
      legacyExpandMode,
    );
    const persistedExpandState = new Set(
      (persistedState?.expandedGroups || Array.from(legacyExpandedGroups))
        .map((groupId) => String(groupId).trim())
        .filter(Boolean),
    );
    const hasPersistedGroupedExpandState = this.config.enableGroupedMode
      ? persistedState?.expandMode !== undefined || persistedExpandState.size > 0 || legacyHasPersistedExpandState
      : false;
    const persistedViewMode = this.config.enableGroupedMode
      ? (persistedState?.viewMode || legacyViewMode)
      : null;
    const initialViewMode = persistedViewMode || this.config.defaultViewMode || 'flat';

    this.state = {
      currentPage: 1,
      perPage: this.config.perPage || 10,
      totalRows: 0,
      search: '',
      filters: [],
      sort: [],
      selectedRows: new Set(),
      hiddenColumns: hasPersistedHiddenColumns ? persistedHiddenColumns : defaultHiddenColumns,
      columnOrder: mergedColumnOrder,
      viewMode: initialViewMode,
      expandMode: persistedExpandMode,
      groupedData: null,
      expandedGroups: persistedExpandState,
      hasPersistedExpandState: hasPersistedGroupedExpandState,
    };

    this.actionRenderer = new ActionRenderer({
      mode: this.config.actionRenderMode || 'dropdown',
      actionBasePath: this.config.actionBasePath || this.config.apiEndpoint,
      notifier: this.notifier,
    });
    this.cellRendererRegistry = new CellRendererRegistry();

    if (this.config.cellRenderers) {
      Object.entries(this.config.cellRenderers).forEach(([field, renderer]) => {
        this.cellRendererRegistry.register(field, renderer);
      });
    }

    this.defaultColumns = this.config.columns.map((col) => ({ ...col }));
  }

  init(): void {
    console.log('[DataGrid] Initializing with config:', this.config);
    this.tableEl = document.querySelector(this.selectors.table);
    if (!this.tableEl) {
      console.error(`[DataGrid] Table element not found: ${this.selectors.table}`);
      return;
    }
    console.log('[DataGrid] Table element found:', this.tableEl);

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

    void this.refresh();

    if (typeof this.stateStore.hydrate === 'function') {
      void this.stateStore.hydrate().then(() => {
        if (this.hasURLStateOverrides) {
          return;
        }
        const hydrated = this.stateStore.loadPersistedState();
        if (!hydrated) {
          return;
        }
        this.applyPersistedStateSnapshot(hydrated, { merge: true });
        this.applyRestoredState();
        this.pushStateToURL({ replace: true });
        void this.refresh();
      }).catch(() => {
        // Ignore async hydrate failures.
      });
    }
  }

  private getURLStateConfig(): Required<DataGridURLStateConfig> {
    return stateOps.getURLStateConfig(this);
  }

  private parseJSONArray(raw: string, label: string): unknown[] | null {
    return stateOps.parseJSONArray(this, raw, label);
  }

  private applyPersistedStateSnapshot(snapshot: any, options: { merge?: boolean } = {}): void {
    stateOps.applyPersistedStateSnapshot(this, snapshot, options);
  }

  private applyShareStateSnapshot(snapshot: any): void {
    stateOps.applyShareStateSnapshot(this, snapshot);
  }

  private buildPersistedStateSnapshot(): any {
    return stateOps.buildPersistedStateSnapshot(this);
  }

  private buildShareStateSnapshot(): any {
    return stateOps.buildShareStateSnapshot(this);
  }

  private persistStateSnapshot(): void {
    stateOps.persistStateSnapshot(this);
  }

  private restoreStateFromURL(): void {
    stateOps.restoreStateFromURL(this);
  }

  private applyRestoredState(): void {
    stateOps.applyRestoredState(this);
  }

  private pushStateToURL(options: { replace?: boolean } = {}): void {
    stateOps.pushStateToURL(this, options);
  }

  syncURL(): void {
    this.pushStateToURL();
  }

  async refresh(): Promise<void> {
    return fetchOps.refresh(this);
  }

  buildApiUrl(): string {
    return fetchOps.buildApiUrl(this);
  }

  buildQueryString(): string {
    return fetchOps.buildQueryString(this);
  }

  private buildQueryParams(): Record<string, any> {
    return fetchOps.buildQueryParams(this);
  }

  private getResponseTotal(data: ApiResponse): number | null {
    return fetchOps.getResponseTotal(this, data);
  }

  private normalizePagination(total: number | null): boolean {
    return fetchOps.normalizePagination(this, total);
  }

  resetPagination(): void {
    this.state.currentPage = 1;
  }

  updateColumnVisibility(visibleColumns: string[], skipURLUpdate: boolean = false): void {
    renderOps.updateColumnVisibility(this, visibleColumns, skipURLUpdate);
  }

  private syncColumnVisibilityCheckboxes(): void {
    renderOps.syncColumnVisibilityCheckboxes(this);
  }

  private renderData(data: ApiResponse): void {
    renderOps.renderData(this, data);
  }

  private renderFlatData(items: any[], tbody: HTMLElement): void {
    renderOps.renderFlatData(this, items, tbody);
  }

  private renderGroupedData(data: ApiResponse, items: any[], tbody: HTMLElement): void {
    groupedOps.renderGroupedData(this, data, items, tbody);
  }

  private isGroupedViewActive(): boolean {
    return groupedOps.isGroupedViewActive(this);
  }

  private fallbackGroupedMode(reason: string): void {
    groupedOps.fallbackGroupedMode(this, reason);
  }

  private handleGroupedModeStatusFallback(status: number): boolean {
    return groupedOps.handleGroupedModeStatusFallback(this, status);
  }

  private handleGroupedModePayloadFallback(items: unknown[]): boolean {
    return groupedOps.handleGroupedModePayloadFallback(this, items);
  }

  toggleGroup(groupId: string): void {
    groupedOps.toggleGroup(this, groupId);
  }

  setExpandedGroups(groupIDs: string[]): void {
    groupedOps.setExpandedGroups(this, groupIDs);
  }

  expandAllGroups(): void {
    groupedOps.expandAllGroups(this);
  }

  collapseAllGroups(): void {
    groupedOps.collapseAllGroups(this);
  }

  private updateGroupVisibility(groupId: string): void {
    groupedOps.updateGroupVisibility(this, groupId);
  }

  private updateGroupedRowsFromState(): void {
    groupedOps.updateGroupedRowsFromState(this);
  }

  private isGroupExpandedByState(groupId: string, defaultExpanded: boolean = false): boolean {
    return groupedOps.isGroupExpandedByState(this, groupId, defaultExpanded);
  }

  setViewMode(mode: any): void {
    groupedOps.setViewMode(this, mode);
  }

  getViewMode(): any {
    return groupedOps.getViewMode(this);
  }

  getGroupedData(): any {
    return groupedOps.getGroupedData(this);
  }

  async fetchDetail(id: string): Promise<{ data: any; schema?: Record<string, any>; form?: Record<string, any>; tabs?: any[] }> {
    return fetchOps.fetchDetail(this, id);
  }

  getSchema(): Record<string, any> | null {
    return fetchOps.getSchema(this);
  }

  getForm(): Record<string, any> | null {
    return fetchOps.getForm(this);
  }

  getTabs(): any[] {
    return fetchOps.getTabs(this);
  }

  private normalizeDetailResponse(payload: any): { data: any; schema?: Record<string, any>; form?: Record<string, any> } {
    return fetchOps.normalizeDetailResponse(this, payload);
  }

  private resolveRendererOptions(col: ColumnDefinition): Record<string, any> {
    return renderOps.resolveRendererOptions(this, col);
  }

  private createTableRow(item: any): HTMLTableRowElement {
    return renderOps.createTableRow(this, item);
  }

  private sanitizeActionId(label: string): string {
    return renderOps.sanitizeActionId(this, label);
  }

  private async handleDelete(id: string): Promise<void> {
    return renderOps.handleDelete(this, id);
  }

  private updatePaginationUI(data: ApiResponse): void {
    renderOps.updatePaginationUI(this, data);
  }

  private renderPaginationButtons(total: number): void {
    renderOps.renderPaginationButtons(this, total);
  }

  private bindSearchInput(): void {
    lifecycleOps.bindSearchInput(this);
  }

  private bindPerPageSelect(): void {
    lifecycleOps.bindPerPageSelect(this);
  }

  private bindFilterInputs(): void {
    lifecycleOps.bindFilterInputs(this);
  }

  private bindColumnVisibility(): void {
    lifecycleOps.bindColumnVisibility(this);
  }

  private bindExportButtons(): void {
    lifecycleOps.bindExportButtons(this);
  }

  private bindSorting(): void {
    lifecycleOps.bindSorting(this);
  }

  private updateSortIndicators(): void {
    lifecycleOps.updateSortIndicators(this);
  }

  private bindSelection(): void {
    lifecycleOps.bindSelection(this);
  }

  private updateSelectionBindings(): void {
    lifecycleOps.updateSelectionBindings(this);
  }

  private bindBulkActions(): void {
    lifecycleOps.bindBulkActions(this);
  }

  private bindOverflowMenu(): void {
    lifecycleOps.bindOverflowMenu(this);
  }

  private updateBulkActionsBar(): void {
    lifecycleOps.updateBulkActionsBar(this);
  }

  private bindBulkClearButton(): void {
    lifecycleOps.bindBulkClearButton(this);
  }

  private clearSelection(): void {
    lifecycleOps.clearSelection(this);
  }

  private positionDropdownMenu(trigger: HTMLElement, menu: HTMLElement): void {
    lifecycleOps.positionDropdownMenu(this, trigger, menu);
  }

  private bindDropdownToggles(): void {
    lifecycleOps.bindDropdownToggles(this);
  }

  private showError(message: string): void {
    lifecycleOps.showError(this, message);
  }

  private notify(message: string, type: 'success' | 'error' | 'warning' | 'info'): void {
    lifecycleOps.notify(this, message, type);
  }

  private async confirmAction(message: string): Promise<boolean> {
    return lifecycleOps.confirmAction(this, message);
  }

  private async extractError(error: unknown): Promise<string> {
    return lifecycleOps.extractError(this, error);
  }

  private parseDatasetStringArray(raw: string | undefined): string[] | undefined {
    return lifecycleOps.parseDatasetStringArray(this, raw);
  }

  private parseDatasetObject(raw: string | undefined): Record<string, unknown> | undefined {
    return lifecycleOps.parseDatasetObject(this, raw);
  }

  reorderColumns(newOrder: string[]): void {
    columnOps.reorderColumns(this, newOrder);
  }

  resetColumnsToDefault(): void {
    columnOps.resetColumnsToDefault(this);
  }

  private mergeColumnOrder(savedOrder: string[]): string[] {
    return columnOps.mergeColumnOrder(this, savedOrder);
  }

  private reorderTableColumns(order: string[]): void {
    columnOps.reorderTableColumns(this, order);
  }

  private reorderRowCells(row: Element, order: string[], cellTag: 'th' | 'td'): void {
    columnOps.reorderRowCells(this, row, order, cellTag);
  }

  destroy(): void {
    if (this.columnManager) {
      this.columnManager.destroy();
      this.columnManager = null;
    }

    if (this.dropdownAbortController) {
      this.dropdownAbortController.abort();
      this.dropdownAbortController = null;
    }

    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
      this.searchTimeout = null;
    }

    console.log('[DataGrid] Instance destroyed');
  }
}

if (typeof window !== 'undefined') {
  (window as any).DataGrid = DataGrid;
}
