import type { DataGridPersistedState, DataGridShareState, DataGridURLStateConfig } from './core-types.js';
export declare function getURLStateConfig(grid: any): Required<DataGridURLStateConfig>;
export declare function parseJSONArray(_grid: any, raw: string, label: string): unknown[] | null;
export declare function applyPersistedStateSnapshot(grid: any, snapshot: DataGridPersistedState, options?: {
    merge?: boolean;
}): void;
export declare function applyShareStateSnapshot(grid: any, snapshot: DataGridShareState): void;
export declare function buildPersistedStateSnapshot(grid: any): DataGridPersistedState;
export declare function buildShareStateSnapshot(grid: any): DataGridShareState;
export declare function persistStateSnapshot(grid: any): void;
export declare function restoreStateFromURL(grid: any): void;
export declare function applyRestoredState(grid: any): void;
export declare function pushStateToURL(grid: any, options?: {
    replace?: boolean;
}): void;
//# sourceMappingURL=core-state.d.ts.map