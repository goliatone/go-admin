export declare function bindSearchInput(grid: any): void;
/**
 * Bind per-page select
 */
export declare function bindPerPageSelect(grid: any): void;
/**
 * Bind filter inputs
 */
export declare function bindFilterInputs(grid: any): void;
/**
 * Bind column visibility toggle using ColumnManager
 */
export declare function bindColumnVisibility(grid: any): void;
/**
 * Bind export buttons
 */
export declare function bindExportButtons(grid: any): void;
/**
 * Bind table sorting
 */
export declare function bindSorting(grid: any): void;
/**
 * Update sort indicators in table headers
 */
export declare function updateSortIndicators(grid: any): void;
/**
 * Bind selection checkboxes
 */
export declare function bindSelection(grid: any): void;
/**
 * Update selection bindings after rendering
 * This syncs checkbox states with the selectedRows Set
 */
export declare function updateSelectionBindings(grid: any): void;
/**
 * Bind bulk action buttons
 */
export declare function bindBulkActions(grid: any): void;
/**
 * Bind overflow menu toggle (three-dot "More" button)
 */
export declare function bindOverflowMenu(grid: any): void;
/**
 * Update bulk actions bar visibility with animation
 */
export declare function updateBulkActionsBar(grid: any): void;
/**
 * Bind clear selection button
 */
export declare function bindBulkClearButton(grid: any): void;
/**
 * Clear all selections
 */
export declare function clearSelection(grid: any): void;
/**
 * Position dropdown menu intelligently based on available space
 */
export declare function positionDropdownMenu(grid: any, trigger: HTMLElement, menu: HTMLElement): void;
/**
 * Bind dropdown toggles
 */
export declare function bindDropdownToggles(grid: any): void;
/**
 * Show error message using notifier
 */
export declare function showError(grid: any, message: string): void;
/**
 * Show notification using notifier
 */
export declare function notify(grid: any, message: string, type: 'success' | 'error' | 'warning' | 'info'): void;
/**
 * Show confirmation dialog using notifier
 */
export declare function confirmAction(grid: any, message: string): Promise<boolean>;
/**
 * Extract error message from Response or Error
 */
export declare function extractError(grid: any, error: unknown): Promise<string>;
export declare function parseDatasetStringArray(grid: any, raw: string | undefined): string[] | undefined;
export declare function parseDatasetObject(grid: any, raw: string | undefined): Record<string, unknown> | undefined;
//# sourceMappingURL=core-lifecycle.d.ts.map