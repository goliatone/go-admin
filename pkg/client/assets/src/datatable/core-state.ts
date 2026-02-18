// @ts-nocheck
import type {
  ColumnDefinition,
  ColumnFilter,
  SortColumn,
  DataGridPersistedState,
  DataGridShareState,
  DataGridURLStateConfig,
} from './core-types.js';
import {
  decodeExpandedGroupsToken,
  getViewModeForViewport,
  normalizeExpandMode,
  parseViewMode,
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
import { buildURL, deleteSearchParams } from '../shared/query-state/url-state.js';

export function getURLStateConfig(grid: any): Required<DataGridURLStateConfig> {
  const maxURLLength = Math.max(
    256,
    grid.config.urlState?.maxURLLength || DATAGRID_DEFAULT_MAX_URL_LENGTH,
  );
  const maxFiltersLength = Math.max(
    64,
    grid.config.urlState?.maxFiltersLength || DATAGRID_DEFAULT_MAX_FILTERS_LENGTH,
  );
  const enableStateToken = grid.config.urlState?.enableStateToken !== false;
  return {
    maxURLLength,
    maxFiltersLength,
    enableStateToken,
  };
}

export function parseJSONArray(_grid: any, raw: string, label: string): unknown[] | null {
  const normalized = String(raw || '').trim();
  if (!normalized) {
    return null;
  }
  try {
    const parsed = JSON.parse(normalized) as unknown;
    if (!Array.isArray(parsed)) {
      console.warn(`[DataGrid] Invalid ${label} payload in URL (expected array)`);
      return null;
    }
    return parsed;
  } catch (error) {
    console.warn(`[DataGrid] Failed to parse ${label} payload from URL:`, error);
    return null;
  }
}

export function applyPersistedStateSnapshot(
  grid: any,
  snapshot: DataGridPersistedState,
  options: { merge?: boolean } = {},
): void {
  const merge = options.merge === true;
  const validFields = new Set(grid.config.columns.map((col: ColumnDefinition) => col.field));

  const persistedHidden = Array.isArray(snapshot.hiddenColumns)
    ? new Set(
      snapshot.hiddenColumns
        .map((field) => String(field || '').trim())
        .filter((field) => field.length > 0 && validFields.has(field)),
    )
    : null;
  if (persistedHidden) {
    grid.state.hiddenColumns = persistedHidden;
    grid.hasPersistedHiddenColumnState = true;
  } else if (!merge) {
    grid.state.hiddenColumns = new Set(
      grid.config.columns.filter((col: ColumnDefinition) => col.hidden).map((col: ColumnDefinition) => col.field),
    );
    grid.hasPersistedHiddenColumnState = false;
  }

  const persistedOrder = Array.isArray(snapshot.columnOrder)
    ? snapshot.columnOrder
      .map((field) => String(field || '').trim())
      .filter((field) => field.length > 0 && validFields.has(field))
    : null;
  if (persistedOrder && persistedOrder.length > 0) {
    const validOrder = grid.mergeColumnOrder(persistedOrder);
    grid.state.columnOrder = validOrder;
    grid.hasPersistedColumnOrderState = true;
    grid.didRestoreColumnOrder = true;
    const defaultOrder = grid.defaultColumns.map((col: ColumnDefinition) => col.field);
    grid.shouldReorderDOMOnRestore = defaultOrder.join('|') !== validOrder.join('|');

    const columnMap = new Map(grid.config.columns.map((c: ColumnDefinition) => [c.field, c]));
    grid.config.columns = validOrder
      .map((field) => columnMap.get(field))
      .filter((c: ColumnDefinition | undefined): c is ColumnDefinition => c !== undefined);
  } else if (!merge) {
    grid.state.columnOrder = grid.config.columns.map((col: ColumnDefinition) => col.field);
    grid.hasPersistedColumnOrderState = false;
    grid.didRestoreColumnOrder = false;
    grid.shouldReorderDOMOnRestore = false;
  }

  if (!grid.config.enableGroupedMode) {
    return;
  }

  if (snapshot.viewMode) {
    const parsed = parseViewMode(snapshot.viewMode);
    if (parsed) {
      grid.state.viewMode = getViewModeForViewport(parsed);
    }
  }

  grid.state.expandMode = normalizeExpandMode(snapshot.expandMode, grid.state.expandMode);

  if (Array.isArray(snapshot.expandedGroups)) {
    grid.state.expandedGroups = new Set(
      snapshot.expandedGroups
        .map((groupId) => String(groupId || '').trim())
        .filter(Boolean),
    );
    grid.state.hasPersistedExpandState = true;
  } else if (snapshot.expandMode !== undefined) {
    grid.state.hasPersistedExpandState = true;
  }
}

export function applyShareStateSnapshot(grid: any, snapshot: DataGridShareState): void {
  if (snapshot.persisted) {
    grid.applyPersistedStateSnapshot(snapshot.persisted, { merge: true });
  }
  if (typeof snapshot.search === 'string') {
    grid.state.search = snapshot.search;
  }
  if (typeof snapshot.page === 'number' && Number.isFinite(snapshot.page)) {
    grid.state.currentPage = Math.max(1, Math.trunc(snapshot.page));
  }
  if (typeof snapshot.perPage === 'number' && Number.isFinite(snapshot.perPage)) {
    grid.state.perPage = Math.max(1, Math.trunc(snapshot.perPage));
  }
  if (Array.isArray(snapshot.filters)) {
    grid.state.filters = snapshot.filters as ColumnFilter[];
  }
  if (Array.isArray(snapshot.sort)) {
    grid.state.sort = snapshot.sort as SortColumn[];
  }
}

export function buildPersistedStateSnapshot(grid: any): DataGridPersistedState {
  const persisted: DataGridPersistedState = {
    version: 1,
    hiddenColumns: Array.from(grid.state.hiddenColumns),
    columnOrder: [...grid.state.columnOrder],
    updatedAt: Date.now(),
  };
  if (grid.config.enableGroupedMode) {
    persisted.viewMode = grid.state.viewMode;
    persisted.expandMode = grid.state.expandMode;
    persisted.expandedGroups = Array.from(grid.state.expandedGroups);
  }
  return persisted;
}

export function buildShareStateSnapshot(grid: any): DataGridShareState {
  const shareState: DataGridShareState = {
    version: 1,
    search: grid.state.search || undefined,
    page: grid.state.currentPage > 1 ? grid.state.currentPage : undefined,
    perPage: grid.state.perPage !== (grid.config.perPage || 10) ? grid.state.perPage : undefined,
    filters: grid.state.filters.length > 0 ? [...grid.state.filters] : undefined,
    sort: grid.state.sort.length > 0 ? [...grid.state.sort] : undefined,
    persisted: grid.buildPersistedStateSnapshot(),
    updatedAt: Date.now(),
  };
  return shareState;
}

export function persistStateSnapshot(grid: any): void {
  grid.stateStore.savePersistedState(grid.buildPersistedStateSnapshot());
}

export function restoreStateFromURL(grid: any): void {
  const params = new URLSearchParams(window.location.search);
  grid.didRestoreColumnOrder = false;
  grid.shouldReorderDOMOnRestore = false;
  grid.hasURLStateOverrides = DATAGRID_MANAGED_URL_KEYS.some((key) => params.has(key));

  const stateToken = params.get(DATAGRID_URL_KEY_STATE);
  if (stateToken) {
    const shared = grid.stateStore.resolveShareState(stateToken);
    if (shared) {
      grid.applyShareStateSnapshot(shared);
    }
  }

  const search = params.get(DATAGRID_URL_KEY_SEARCH);
  if (search) {
    grid.state.search = search;
    const searchInput = document.querySelector<HTMLInputElement>(grid.selectors.searchInput);
    if (searchInput) {
      searchInput.value = search;
    }
  }

  const page = params.get(DATAGRID_URL_KEY_PAGE);
  if (page) {
    const parsedPage = parseInt(page, 10);
    grid.state.currentPage = Number.isNaN(parsedPage) ? 1 : Math.max(1, parsedPage);
  }

  const perPage = params.get(DATAGRID_URL_KEY_PER_PAGE);
  if (perPage) {
    const parsedPerPage = parseInt(perPage, 10);
    const fallbackPerPage = grid.config.perPage || 10;
    grid.state.perPage = Number.isNaN(parsedPerPage)
      ? fallbackPerPage
      : Math.max(1, parsedPerPage);
    const perPageSelect = document.querySelector<HTMLSelectElement>(grid.selectors.perPageSelect);
    if (perPageSelect) {
      perPageSelect.value = String(grid.state.perPage);
    }
  }

  const filtersParam = params.get(DATAGRID_URL_KEY_FILTERS);
  if (filtersParam) {
    const parsed = grid.parseJSONArray(filtersParam, 'filters');
    if (parsed) {
      grid.state.filters = parsed as ColumnFilter[];
    }
  }

  const sortParam = params.get(DATAGRID_URL_KEY_SORT);
  if (sortParam) {
    const parsed = grid.parseJSONArray(sortParam, 'sort');
    if (parsed) {
      grid.state.sort = parsed as SortColumn[];
    }
  }

  if (grid.config.enableGroupedMode) {
    const urlViewMode = parseViewMode(params.get(DATAGRID_URL_KEY_VIEW_MODE));
    if (urlViewMode) {
      grid.state.viewMode = getViewModeForViewport(urlViewMode);
    }

    if (params.has(DATAGRID_URL_KEY_EXPANDED_GROUPS)) {
      grid.state.expandedGroups = decodeExpandedGroupsToken(
        params.get(DATAGRID_URL_KEY_EXPANDED_GROUPS),
      );
      grid.state.expandMode = 'explicit';
      grid.state.hasPersistedExpandState = true;
    }
  }

  const hiddenColumnsParam = params.get(DATAGRID_URL_KEY_HIDDEN_COLUMNS);
  if (hiddenColumnsParam) {
    const hiddenArray = grid.parseJSONArray(hiddenColumnsParam, 'hidden columns');
    if (hiddenArray) {
      const validFields = new Set(grid.config.columns.map((col: ColumnDefinition) => col.field));
      grid.state.hiddenColumns = new Set(
        hiddenArray
          .map((field) => (typeof field === 'string' ? field.trim() : ''))
          .filter((field) => field.length > 0 && validFields.has(field)),
      );
    }
  } else if (!grid.hasPersistedHiddenColumnState && grid.config.behaviors?.columnVisibility) {
    const allColumnFields = grid.config.columns.map((col: ColumnDefinition) => col.field);
    const cachedHidden = grid.config.behaviors.columnVisibility.loadHiddenColumnsFromCache(allColumnFields);
    if (cachedHidden.size > 0) {
      grid.state.hiddenColumns = cachedHidden;
    }
  }

  if (!grid.hasPersistedColumnOrderState && grid.config.behaviors?.columnVisibility?.loadColumnOrderFromCache) {
    const allColumnFields = grid.config.columns.map((col: ColumnDefinition) => col.field);
    const cachedOrder = grid.config.behaviors.columnVisibility.loadColumnOrderFromCache(allColumnFields);
    if (cachedOrder && cachedOrder.length > 0) {
      const validOrder = grid.mergeColumnOrder(cachedOrder);
      grid.state.columnOrder = validOrder;

      grid.didRestoreColumnOrder = true;
      const defaultOrder = grid.defaultColumns.map((col: ColumnDefinition) => col.field);
      grid.shouldReorderDOMOnRestore = defaultOrder.join('|') !== validOrder.join('|');

      const columnMap = new Map(grid.config.columns.map((c: ColumnDefinition) => [c.field, c]));
      grid.config.columns = validOrder
        .map((field) => columnMap.get(field))
        .filter((c: ColumnDefinition | undefined): c is ColumnDefinition => c !== undefined);
    }
  }

  grid.persistStateSnapshot();

  console.log('[DataGrid] State restored from URL:', grid.state);

  setTimeout(() => {
    grid.applyRestoredState();
  }, 0);
}

export function applyRestoredState(grid: any): void {
  const searchInput = document.querySelector<HTMLInputElement>(grid.selectors.searchInput);
  if (searchInput) {
    searchInput.value = grid.state.search;
  }

  const perPageSelect = document.querySelector<HTMLSelectElement>(grid.selectors.perPageSelect);
  if (perPageSelect) {
    perPageSelect.value = String(grid.state.perPage);
  }

  if (grid.state.filters.length > 0) {
    grid.state.filters.forEach((filter: ColumnFilter) => {
      const input = document.querySelector<HTMLInputElement>(
        `[data-filter-column="${filter.column}"]`,
      );
      if (input) {
        input.value = String(filter.value);
      }
    });
  }

  if (grid.didRestoreColumnOrder && grid.shouldReorderDOMOnRestore) {
    grid.reorderTableColumns(grid.state.columnOrder);
  }

  const visibleColumns = grid.config.columns
    .filter((col: ColumnDefinition) => !grid.state.hiddenColumns.has(col.field))
    .map((col: ColumnDefinition) => col.field);

  grid.updateColumnVisibility(visibleColumns, true);

  if (grid.state.sort.length > 0) {
    grid.updateSortIndicators();
  }
}

export function pushStateToURL(grid: any, options: { replace?: boolean } = {}): void {
  grid.persistStateSnapshot();
  const urlState = grid.getURLStateConfig();
  const params = new URLSearchParams(window.location.search);

  deleteSearchParams(params, DATAGRID_MANAGED_URL_KEYS);

  if (grid.state.search) {
    params.set(DATAGRID_URL_KEY_SEARCH, grid.state.search);
  }

  if (grid.state.currentPage > 1) {
    params.set(DATAGRID_URL_KEY_PAGE, String(grid.state.currentPage));
  }

  if (grid.state.perPage !== (grid.config.perPage || 10)) {
    params.set(DATAGRID_URL_KEY_PER_PAGE, String(grid.state.perPage));
  }

  let filtersTooLong = false;
  if (grid.state.filters.length > 0) {
    const serializedFilters = JSON.stringify(grid.state.filters);
    if (serializedFilters.length <= urlState.maxFiltersLength) {
      params.set(DATAGRID_URL_KEY_FILTERS, serializedFilters);
    } else {
      filtersTooLong = true;
    }
  }

  if (grid.state.sort.length > 0) {
    params.set(DATAGRID_URL_KEY_SORT, JSON.stringify(grid.state.sort));
  }

  if (grid.config.enableGroupedMode) {
    params.set(DATAGRID_URL_KEY_VIEW_MODE, grid.state.viewMode);
  }

  let newURL = buildURL(window.location.pathname, params);

  const exceedsBudget = newURL.length > urlState.maxURLLength;
  if (urlState.enableStateToken && (filtersTooLong || exceedsBudget)) {
    params.delete(DATAGRID_URL_KEY_SEARCH);
    params.delete(DATAGRID_URL_KEY_PAGE);
    params.delete(DATAGRID_URL_KEY_PER_PAGE);
    params.delete(DATAGRID_URL_KEY_FILTERS);
    params.delete(DATAGRID_URL_KEY_SORT);

    const token = grid.stateStore.createShareState(grid.buildShareStateSnapshot());
    if (token) {
      params.set(DATAGRID_URL_KEY_STATE, token);
    }
    newURL = buildURL(window.location.pathname, params);
  }

  if (options.replace) {
    window.history.replaceState({}, '', newURL);
  } else {
    window.history.pushState({}, '', newURL);
  }
  console.log('[DataGrid] URL updated:', newURL);
}
