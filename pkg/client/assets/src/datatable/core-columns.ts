// @ts-nocheck
import type { ColumnDefinition } from './core-types.js';

export function reorderColumns(grid: any, newOrder: string[]): void {
    if (!grid.tableEl) return;

    // Validate and merge order with current columns
    // - Keep only columns that exist in config.columns
    // - Append any new columns not in newOrder
    const validOrder = grid.mergeColumnOrder(newOrder);

    // Update state
    grid.state.columnOrder = validOrder;

    // Reorder config.columns to match the new order
    const columnMap = new Map(grid.config.columns.map(c => [c.field, c]));
    grid.config.columns = validOrder
      .map(field => columnMap.get(field))
      .filter((c): c is ColumnDefinition => c !== undefined);

    // Reorder DOM elements
    grid.reorderTableColumns(validOrder);
    grid.persistStateSnapshot();

    console.log('[DataGrid] Columns reordered:', validOrder);
  }

  /**
   * Reset columns to their initial/default order and visibility.
   * Intended to be called by ColumnManager's "Reset to Default" action.
   */
export function resetColumnsToDefault(grid: any): void {
    // Clear persisted preferences first (localStorage + optional server sync)
    // so "Reset to Default" truly removes saved state instead of re-saving defaults.
    grid.config.behaviors?.columnVisibility?.clearSavedPrefs?.();

    // Restore default config columns (shallow copies)
    grid.config.columns = grid.defaultColumns.map(col => ({ ...col }));
    grid.state.columnOrder = grid.config.columns.map(col => col.field);

    // Default visibility: visible unless column.hidden is true
    const visibleColumns = grid.config.columns
      .filter(col => !col.hidden)
      .map(col => col.field);

    // Apply DOM updates if table is initialized
    if (grid.tableEl) {
      grid.reorderTableColumns(grid.state.columnOrder);
      grid.updateColumnVisibility(visibleColumns);
    } else {
      grid.state.hiddenColumns = new Set(
        grid.config.columns.filter(col => col.hidden).map(col => col.field)
      );
      grid.persistStateSnapshot();
    }

    // Re-render the column menu to reflect defaults (Sortable is re-initialized in refresh()).
    if (grid.columnManager) {
      grid.columnManager.refresh();
      grid.columnManager.syncWithGridState();
    }

    console.log('[DataGrid] Columns reset to default');
  }

  /**
   * Merge and validate saved column order with current columns
   * - Drops columns that no longer exist
   * - Appends new columns that aren't in saved order
   */
export function mergeColumnOrder(grid: any, savedOrder: string[]): string[] {
    const currentFields = new Set(grid.config.columns.map(c => c.field));
    const savedSet = new Set(savedOrder);

    // Keep only saved columns that still exist
    const validSaved = savedOrder.filter(field => currentFields.has(field));

    // Find new columns not in saved order (append at end)
    const newColumns = grid.config.columns
      .map(c => c.field)
      .filter(field => !savedSet.has(field));

    return [...validSaved, ...newColumns];
  }

  /**
   * Reorder table DOM elements (header, filter row, body rows)
   * Moves existing nodes rather than recreating them to preserve event listeners
   */
export function reorderTableColumns(grid: any, order: string[]): void {
    if (!grid.tableEl) return;

    // Reorder header row
    const headerRow = grid.tableEl.querySelector('thead tr:first-child');
    if (headerRow) {
      grid.reorderRowCells(headerRow, order, 'th');
    }

    // Reorder filter row
    const filterRow = grid.tableEl.querySelector('#filter-row');
    if (filterRow) {
      grid.reorderRowCells(filterRow, order, 'th');
    }

    // Reorder body rows
    const bodyRows = grid.tableEl.querySelectorAll('tbody tr');
    bodyRows.forEach(row => {
      grid.reorderRowCells(row, order, 'td');
    });
  }

  /**
   * Reorder cells within a single row
   * Preserves fixed columns (selection on left, actions on right)
   */
export function reorderRowCells(grid: any, row: Element, order: string[], cellTag: 'th' | 'td'): void {
    // Get data cells (those with data-column attribute)
    const dataCells = Array.from(row.querySelectorAll(`${cellTag}[data-column]`));
    const cellMap = new Map(
      dataCells.map(cell => [(cell as HTMLElement).dataset.column!, cell])
    );

    // Get fixed cells (selection/actions)
    // Prefer explicit markers; fall back to heuristics for legacy tables.
    const allCells = Array.from(row.querySelectorAll(cellTag));
    const selectionCell =
      row.querySelector(`${cellTag}[data-role="selection"]`) ||
      allCells.find(cell => cell.querySelector('input[type="checkbox"]'));
    const actionsCell =
      row.querySelector(`${cellTag}[data-role="actions"]`) ||
      allCells.find(cell =>
        !((cell as HTMLElement).dataset.column) && (
          cell.querySelector('[data-action]') ||
          cell.querySelector('[data-action-id]') ||
          cell.querySelector('.dropdown')
        )
      );

    // Build reordered cells array
    const reorderedCells: Element[] = [];

    // Add selection cell first (if exists)
    if (selectionCell) {
      reorderedCells.push(selectionCell);
    }

    // Add data cells in new order
    order.forEach(field => {
      const cell = cellMap.get(field);
      if (cell) {
        reorderedCells.push(cell);
      }
    });

    // Add actions cell last (if exists)
    if (actionsCell) {
      reorderedCells.push(actionsCell);
    }

    // Move cells to new positions (appending moves, doesn't clone)
    reorderedCells.forEach(cell => {
      row.appendChild(cell);
    });
  }
