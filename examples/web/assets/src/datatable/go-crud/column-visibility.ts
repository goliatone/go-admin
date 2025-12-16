import type { ColumnVisibilityBehavior } from '../behaviors/types.js';
import type { DataGrid } from '../core.js';

/**
 * Default column visibility behavior
 * Stores state in localStorage as a cache, but DataGrid.state.hiddenColumns is the single source of truth
 */
export class DefaultColumnVisibilityBehavior implements ColumnVisibilityBehavior {
  private storageKey: string;

  constructor(
    initialColumns: string[],
    storageKey: string = 'datatable_columns'
  ) {
    this.storageKey = storageKey;
  }

  /**
   * Get visible columns from grid state (single source of truth)
   */
  getVisibleColumns(grid: DataGrid): string[] {
    return grid.config.columns
      .filter(col => !grid.state.hiddenColumns.has(col.field))
      .map(col => col.field);
  }

  /**
   * Toggle column visibility based on current grid state
   */
  toggleColumn(field: string, grid: DataGrid): void {
    // Read current state from grid (single source of truth)
    const currentlyVisible = !grid.state.hiddenColumns.has(field);

    // Compute new visible columns
    const newVisibleColumns = grid.config.columns
      .filter(col => {
        if (col.field === field) {
          return !currentlyVisible; // Toggle the clicked field
        }
        return !grid.state.hiddenColumns.has(col.field); // Keep others as-is
      })
      .map(col => col.field);

    // Save to localStorage as cache
    const state: Record<string, boolean> = {};
    grid.config.columns.forEach(col => {
      state[col.field] = newVisibleColumns.includes(col.field);
    });
    this.saveState(state);

    // Update grid (which will sync checkboxes automatically)
    grid.updateColumnVisibility(newVisibleColumns);
  }

  /**
   * Load saved visibility state from localStorage
   * Returns hiddenColumns Set to be merged with URL state
   */
  loadHiddenColumnsFromCache(allColumns: string[]): Set<string> {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (!saved) return new Set();

      const state = JSON.parse(saved) as Record<string, boolean>;

      // Return hidden columns (visible=false)
      const hidden = new Set<string>();
      Object.entries(state).forEach(([field, visible]) => {
        if (!visible) {
          hidden.add(field);
        }
      });

      return hidden;
    } catch (e) {
      console.warn('Failed to load column visibility state:', e);
      return new Set();
    }
  }

  private saveState(state: Record<string, boolean>): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(state));
    } catch (e) {
      console.warn('Failed to save column visibility state:', e);
    }
  }
}
