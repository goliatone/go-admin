import type { ColumnFilter, SortColumn } from './behaviors/types.js';
import type { ViewMode, GroupExpandMode } from './grouped-mode.js';
export type DataGridStateStoreMode = 'local' | 'preferences';
export interface DataGridPersistedState {
    version: 1;
    viewMode?: ViewMode;
    expandMode?: GroupExpandMode;
    expandedGroups?: string[];
    hiddenColumns?: string[];
    columnOrder?: string[];
    updatedAt?: number;
}
export interface DataGridShareState {
    version: 1;
    search?: string;
    page?: number;
    perPage?: number;
    filters?: ColumnFilter[];
    sort?: SortColumn[];
    persisted?: DataGridPersistedState;
    updatedAt?: number;
}
export interface DataGridStateStore {
    hydrate?(): Promise<void>;
    loadPersistedState(): DataGridPersistedState | null;
    savePersistedState(state: DataGridPersistedState): void;
    clearPersistedState(): void;
    createShareState(state: DataGridShareState): string | null;
    resolveShareState(token: string): DataGridShareState | null;
}
export interface DataGridStateStoreConfig {
    key: string;
    mode?: DataGridStateStoreMode;
    preferencesEndpoint?: string;
    resource?: string;
    syncDebounceMs?: number;
    maxShareEntries?: number;
}
export declare class LocalDataGridStateStore implements DataGridStateStore {
    protected readonly key: string;
    protected readonly persistedStorageKey: string;
    protected readonly maxShareEntries: number;
    constructor(config: DataGridStateStoreConfig);
    loadPersistedState(): DataGridPersistedState | null;
    savePersistedState(state: DataGridPersistedState): void;
    clearPersistedState(): void;
    createShareState(state: DataGridShareState): string | null;
    resolveShareState(token: string): DataGridShareState | null;
}
export declare class PreferencesDataGridStateStore extends LocalDataGridStateStore {
    private readonly preferencesEndpoint;
    private readonly resource;
    private readonly syncDebounceMs;
    private syncTimeout;
    constructor(config: DataGridStateStoreConfig);
    private get serverStateKey();
    hydrate(): Promise<void>;
    savePersistedState(state: DataGridPersistedState): void;
    clearPersistedState(): void;
    private scheduleServerSync;
    private scheduleServerClear;
    private syncToServer;
    private clearServerState;
    private buildKeysQueryURL;
    private extractFirstRecord;
    private extractMap;
}
export declare function createDataGridStateStore(config: DataGridStateStoreConfig): DataGridStateStore;
//# sourceMappingURL=state-store.d.ts.map