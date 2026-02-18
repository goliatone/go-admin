import type { ApiResponse, GroupedData, ViewMode } from './core-types.js';
export declare function renderGroupedData(grid: any, data: ApiResponse, items: any[], tbody: HTMLElement): void;
/**
 * Whether grouped or matrix view is currently active and enabled.
 */
export declare function isGroupedViewActive(grid: any): boolean;
/**
 * Fallback to flat mode when grouped pagination contract is unavailable.
 */
export declare function fallbackGroupedMode(grid: any, reason: string): void;
/**
 * Fallback on grouped mode request errors that indicate unsupported contract.
 */
export declare function handleGroupedModeStatusFallback(grid: any, status: number): boolean;
/**
 * Fallback when payload does not follow backend grouped-row contract.
 */
export declare function handleGroupedModePayloadFallback(grid: any, items: unknown[]): boolean;
/**
 * Toggle group expand/collapse state (Phase 2)
 */
export declare function toggleGroup(grid: any, groupId: string): void;
/**
 * Set explicit expanded group IDs and switch expand mode to explicit.
 */
export declare function setExpandedGroups(grid: any, groupIDs: string[]): void;
/**
 * Expand all groups using compact mode semantics.
 */
export declare function expandAllGroups(grid: any): void;
/**
 * Collapse all groups using compact mode semantics.
 */
export declare function collapseAllGroups(grid: any): void;
/**
 * Update visibility of child rows for a group
 */
export declare function updateGroupVisibility(grid: any, groupId: string): void;
export declare function updateGroupedRowsFromState(grid: any): void;
export declare function isGroupExpandedByState(grid: any, groupId: string, defaultExpanded?: boolean): boolean;
/**
 * Set view mode (flat, grouped, matrix) - Phase 2
 */
export declare function setViewMode(grid: any, mode: ViewMode): void;
/**
 * Get current view mode
 */
export declare function getViewMode(grid: any): ViewMode;
/**
 * Get grouped data (if available)
 */
export declare function getGroupedData(grid: any): GroupedData | null;
//# sourceMappingURL=core-grouped.d.ts.map