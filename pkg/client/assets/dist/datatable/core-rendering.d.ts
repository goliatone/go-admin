import type { ApiResponse, ColumnDefinition } from './core-types.js';
export declare function updateColumnVisibility(grid: any, visibleColumns: string[], skipURLUpdate?: boolean): void;
/**
 * Sync column visibility switches with current state
 * Uses ColumnManager if available, falls back to direct DOM manipulation
 */
export declare function syncColumnVisibilityCheckboxes(grid: any): void;
/**
 * Render data into table
 */
export declare function renderData(grid: any, data: ApiResponse): void;
/**
 * Render data in flat mode (original behavior)
 */
export declare function renderFlatData(grid: any, items: any[], tbody: HTMLElement): void;
/**
 * Render data in grouped mode (Phase 2)
 */
export declare function resolveRendererOptions(grid: any, col: ColumnDefinition): Record<string, any>;
/**
 * Create table row element
 */
export declare function createTableRow(grid: any, item: any): HTMLTableRowElement;
/**
 * Sanitize action label to create a valid ID
 */
export declare function sanitizeActionId(grid: any, label: string): string;
/**
 * Handle delete action
 */
export declare function handleDelete(grid: any, id: string): Promise<void>;
/**
 * Update pagination UI
 */
export declare function updatePaginationUI(grid: any, data: ApiResponse): void;
/**
 * Render pagination buttons
 */
export declare function renderPaginationButtons(grid: any, total: number): void;
//# sourceMappingURL=core-rendering.d.ts.map