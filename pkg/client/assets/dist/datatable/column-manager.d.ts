import type { DataGrid } from './core.js';
/**
 * Configuration for the ColumnManager component
 */
export interface ColumnManagerConfig {
    container: HTMLElement;
    grid: DataGrid;
    onReorder?: (order: string[]) => void;
    onToggle?: (field: string, visible: boolean) => void;
    onReset?: () => void;
}
/**
 * ColumnManager - Manages column visibility and ordering with drag-and-drop support
 *
 * Renders a list of columns with:
 * - Search/filter field to find columns quickly
 * - Item count badge showing visible/total columns
 * - Scroll shadows to indicate content above/below fold
 * - Drag handles for reordering
 * - iOS-style switches for visibility toggle
 *
 * Uses safe DOM construction (textContent) to prevent XSS when labels come from server metadata.
 */
export declare class ColumnManager {
    private container;
    private grid;
    private sortable;
    private onReorder?;
    private onToggle?;
    private onReset?;
    private searchInput;
    private columnListEl;
    private countBadgeEl;
    constructor(config: ColumnManagerConfig);
    private initialize;
    /**
     * Render column items using safe DOM construction
     * Uses textContent for labels to prevent XSS
     */
    private render;
    /**
     * Create header with search input and count badge
     */
    private createHeader;
    /**
     * Filter columns by search term
     */
    private filterColumns;
    /**
     * Update the count badge
     */
    private updateCountBadge;
    /**
     * Setup scroll shadow detection on the column list
     */
    private setupScrollShadows;
    /**
     * Update scroll shadow classes based on scroll position
     */
    private updateScrollShadows;
    /**
     * Create footer with Reset to Default button
     */
    private createFooter;
    /**
     * Handle reset button click
     */
    private handleReset;
    /**
     * Create a single column item element
     * Uses DOM APIs with textContent for safe label rendering
     * Includes full ARIA support for accessibility
     */
    private createColumnItem;
    /**
     * Setup SortableJS for drag-and-drop reordering
     */
    private setupDragAndDrop;
    /**
     * Bind change events for visibility switches
     * Includes ARIA state updates for accessibility
     */
    private bindSwitchToggles;
    /**
     * Update the switch state for a specific column
     * Called when visibility changes externally (e.g., URL restore)
     * Also updates ARIA attributes for accessibility
     */
    updateSwitchState(field: string, isVisible: boolean): void;
    /**
     * Sync all switch states with current grid state
     */
    syncWithGridState(): void;
    /**
     * Get the current column order from the DOM
     */
    getColumnOrder(): string[];
    /**
     * Re-render the column list (e.g., after columns change)
     */
    refresh(): void;
    /**
     * Cleanup - destroy SortableJS instance
     */
    destroy(): void;
}
export default ColumnManager;
//# sourceMappingURL=column-manager.d.ts.map