import type { ColumnDefinition, ColumnFilter, SortColumn, DataGridBehaviors } from './behaviors/types.js';
import type { ActionButton, BulkActionConfig, ActionRenderMode } from './actions.js';
import type { CellRenderer } from './renderers.js';
import type { ToastNotifier } from '../toast/types.js';
import type { ViewMode, GroupedData, GroupExpandMode } from './grouped-mode.js';
import type { DataGridStateStore, DataGridPersistedState, DataGridShareState, DataGridStateStoreConfig } from './state-store.js';
export interface DataGridConfig {
    tableId: string;
    apiEndpoint: string;
    actionBasePath?: string;
    columns: ColumnDefinition[];
    perPage?: number;
    searchDelay?: number;
    behaviors?: DataGridBehaviors;
    selectors?: Partial<DataGridSelectors>;
    rowActions?: (record: any) => ActionButton[];
    bulkActions?: BulkActionConfig[];
    cellRenderers?: Record<string, CellRenderer>;
    rowClassProvider?: (record: any) => string[];
    useDefaultActions?: boolean;
    actionRenderMode?: ActionRenderMode;
    notifier?: ToastNotifier;
    panelId?: string;
    enableGroupedMode?: boolean;
    defaultViewMode?: ViewMode;
    groupByField?: string;
    stateStore?: DataGridStateStore;
    stateStoreConfig?: Omit<DataGridStateStoreConfig, 'key'>;
    urlState?: DataGridURLStateConfig;
}
export interface DataGridURLStateConfig {
    maxURLLength?: number;
    maxFiltersLength?: number;
    enableStateToken?: boolean;
}
export interface DataGridSelectors {
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
export interface DataGridState {
    currentPage: number;
    perPage: number;
    totalRows: number;
    search: string;
    filters: ColumnFilter[];
    sort: SortColumn[];
    selectedRows: Set<string>;
    hiddenColumns: Set<string>;
    columnOrder: string[];
    viewMode: ViewMode;
    expandMode: GroupExpandMode;
    groupedData: GroupedData | null;
    expandedGroups: Set<string>;
    hasPersistedExpandState: boolean;
}
export interface ApiResponse<T = any> {
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
export interface DetailResponse<T = any> {
    data?: T;
    schema?: Record<string, any>;
    form?: Record<string, any>;
}
export type { ColumnDefinition, ColumnFilter, SortColumn, DataGridBehaviors, ActionButton, BulkActionConfig, ActionRenderMode, CellRenderer, ToastNotifier, ViewMode, GroupedData, GroupExpandMode, DataGridStateStore, DataGridPersistedState, DataGridShareState, DataGridStateStoreConfig, };
//# sourceMappingURL=core-types.d.ts.map