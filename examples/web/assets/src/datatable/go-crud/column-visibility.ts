import type { ColumnVisibilityBehavior } from '../behaviors/types';
import type { DataGrid } from '../core';

/**
 * Default column visibility behavior
 * Stores state in localStorage
 */
export class DefaultColumnVisibilityBehavior implements ColumnVisibilityBehavior {
  private visibleColumns: Set<string>;
  private storageKey: string;

  constructor(
    initialColumns: string[],
    storageKey: string = 'datatable_columns'
  ) {
    this.storageKey = storageKey;
    this.visibleColumns = new Set(initialColumns);

    // Load saved state
    const saved = this.loadState();
    if (Object.keys(saved).length > 0) {
      this.visibleColumns = new Set(
        Object.entries(saved)
          .filter(([_, visible]) => visible)
          .map(([field, _]) => field)
      );
    }
  }

  getVisibleColumns(): string[] {
    return Array.from(this.visibleColumns);
  }

  toggleColumn(field: string, grid: DataGrid): void {
    if (this.visibleColumns.has(field)) {
      this.visibleColumns.delete(field);
    } else {
      this.visibleColumns.add(field);
    }

    // Save state
    const state: Record<string, boolean> = {};
    grid.config.columns.forEach(col => {
      state[col.field] = this.visibleColumns.has(col.field);
    });
    this.saveState(state);

    // Trigger grid update
    grid.updateColumnVisibility(this.getVisibleColumns());
  }

  saveState(state: Record<string, boolean>): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(state));
    } catch (e) {
      console.warn('Failed to save column visibility state:', e);
    }
  }

  loadState(): Record<string, boolean> {
    try {
      const saved = localStorage.getItem(this.storageKey);
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      console.warn('Failed to load column visibility state:', e);
      return {};
    }
  }
}
