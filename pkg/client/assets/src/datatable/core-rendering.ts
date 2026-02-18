// @ts-nocheck
import type { ApiResponse, ColumnDefinition } from './core-types.js';
import type { CellRendererContext } from './renderers.js';
import { renderGroupedEmptyState } from './grouped-mode.js';
import { httpRequest } from '../shared/transport/http-client.js';

export function updateColumnVisibility(grid: any, visibleColumns: string[], skipURLUpdate: boolean = false): void {
    if (!grid.tableEl) return;

    const visibleSet = new Set(visibleColumns);

    // Update hidden columns state
    grid.state.hiddenColumns.clear();
    grid.config.columns.forEach(col => {
      if (!visibleSet.has(col.field)) {
        grid.state.hiddenColumns.add(col.field);
      }
    });

    // Update URL with new hidden columns state (unless during restoration)
    if (!skipURLUpdate) {
      grid.pushStateToURL();
    }

    // Update header and filter row visibility
    // Note: This selector matches both header row th[data-column] and filter row th[data-column]
    // Filter row cells must have data-column attributes to stay aligned with headers
    const headerCells = grid.tableEl.querySelectorAll('thead th[data-column]');
    headerCells.forEach((th) => {
      const field = (th as HTMLElement).dataset.column;
      if (field) {
        (th as HTMLElement).style.display = visibleSet.has(field) ? '' : 'none';
      }
    });

    // Update body cell visibility
    const bodyCells = grid.tableEl.querySelectorAll('tbody td[data-column]');
    bodyCells.forEach((td) => {
      const field = (td as HTMLElement).dataset.column;
      if (field) {
        (td as HTMLElement).style.display = visibleSet.has(field) ? '' : 'none';
      }
    });

    // Sync checkbox state in column visibility menu
    grid.syncColumnVisibilityCheckboxes();
  }

  /**
   * Sync column visibility switches with current state
   * Uses ColumnManager if available, falls back to direct DOM manipulation
   */
export function syncColumnVisibilityCheckboxes(grid: any): void {
    // Prefer ColumnManager if initialized
    if (grid.columnManager) {
      grid.columnManager.syncWithGridState();
      return;
    }

    // Fallback to direct DOM manipulation for legacy checkboxes
    const menu = document.querySelector(grid.selectors.columnToggleMenu);
    if (!menu) return;

    grid.config.columns.forEach(col => {
      const checkbox = menu.querySelector<HTMLInputElement>(
        `input[data-column="${col.field}"]`
      );
      if (checkbox) {
        checkbox.checked = !grid.state.hiddenColumns.has(col.field);
      }
    });
  }

  /**
   * Render data into table
   */
export function renderData(grid: any, data: ApiResponse): void {
    const tbody = grid.tableEl?.querySelector('tbody');
    if (!tbody) {
      console.error('[DataGrid] tbody not found!');
      return;
    }

    tbody.innerHTML = '';

    const items = data.data || data.records || [];
    console.log(`[DataGrid] renderData() called with ${items.length} items`);
    console.log('[DataGrid] First 3 items:', items.slice(0, 3));
    const total = grid.getResponseTotal(data);
    grid.state.totalRows = total ?? items.length;

    if (items.length === 0) {
      // Use grouped empty state if in grouped mode
      if (grid.isGroupedViewActive()) {
        tbody.innerHTML = renderGroupedEmptyState(grid.config.columns.length);
      } else {
        tbody.innerHTML = `
          <tr>
            <td colspan="${grid.config.columns.length + 2}" class="px-6 py-8 text-center text-gray-500">
              No results found
            </td>
          </tr>
        `;
      }
      return;
    }

    // Clear records by ID cache
    grid.recordsById = {};

    // Phase 2: Check if grouped mode is enabled and active
    if (grid.isGroupedViewActive()) {
      grid.renderGroupedData(data, items, tbody);
    } else {
      // Flat mode rendering (original behavior)
      grid.renderFlatData(items, tbody);
    }

    // Apply column visibility to new body cells
    // Note: config.columns is already in the correct order, but some may be hidden
    if (grid.state.hiddenColumns.size > 0) {
      const bodyCells = tbody.querySelectorAll('td[data-column]');
      bodyCells.forEach((td) => {
        const field = (td as HTMLElement).dataset.column;
        if (field && grid.state.hiddenColumns.has(field)) {
          (td as HTMLElement).style.display = 'none';
        }
      });
    }

    // Rebind selection after rendering
    grid.updateSelectionBindings();
  }

  /**
   * Render data in flat mode (original behavior)
   */
export function renderFlatData(grid: any, items: any[], tbody: HTMLElement): void {
    items.forEach((item: any, index: number) => {
      console.log(`[DataGrid] Rendering row ${index + 1}: id=${item.id}`);
      if (item.id) {
        grid.recordsById[item.id] = item;
      }
      const row = grid.createTableRow(item);
      tbody.appendChild(row);
    });

    console.log(`[DataGrid] Finished appending ${items.length} rows to tbody`);
    console.log(`[DataGrid] tbody.children.length =`, tbody.children.length);
  }

  /**
   * Render data in grouped mode (Phase 2)
   */
export function resolveRendererOptions(grid: any, col: ColumnDefinition): Record<string, any> {
    const options = col.rendererOptions ?? col.renderer_options;
    if (!options || typeof options !== 'object' || Array.isArray(options)) {
      return {};
    }
    return options;
  }

  /**
   * Create table row element
   */
export function createTableRow(grid: any, item: any): HTMLTableRowElement {
    const row = document.createElement('tr');

    // Apply custom row classes if provider is configured
    let rowClasses = ['hover:bg-gray-50'];
    if (grid.config.rowClassProvider) {
      rowClasses = rowClasses.concat(grid.config.rowClassProvider(item));
    }
    row.className = rowClasses.join(' ');

    // Checkbox cell
    const checkboxCell = document.createElement('td');
    checkboxCell.className = 'px-6 py-4 whitespace-nowrap';
    checkboxCell.dataset.role = 'selection';
    checkboxCell.dataset.fixed = 'left';
    checkboxCell.innerHTML = `
      <label class="flex">
        <input type="checkbox"
               class="table-checkbox shrink-0 border-gray-300 rounded text-blue-600 focus:ring-blue-500"
               data-id="${item.id}">
        <span class="sr-only">Select</span>
      </label>
    `;
    row.appendChild(checkboxCell);

    // Data cells
    grid.config.columns.forEach((col) => {
      const cell = document.createElement('td');
      cell.className = 'px-6 py-4 whitespace-nowrap text-sm text-gray-800';
      cell.setAttribute('data-column', col.field);

      const value = item[col.field];
      const rendererName = typeof col.renderer === 'string' ? col.renderer.trim() : '';
      const rendererContext: CellRendererContext = {
        options: grid.resolveRendererOptions(col),
      };

      // Priority: column render > field renderer > named renderer > default renderer
      if (col.render) {
        cell.innerHTML = col.render(value, item);
      } else if (grid.cellRendererRegistry.has(col.field)) {
        const renderer = grid.cellRendererRegistry.get(col.field);
        cell.innerHTML = renderer(value, item, col.field, rendererContext);
      } else if (rendererName && grid.cellRendererRegistry.has(rendererName)) {
        const renderer = grid.cellRendererRegistry.get(rendererName);
        cell.innerHTML = renderer(value, item, col.field, rendererContext);
      } else if (value === null || value === undefined) {
        cell.textContent = '-';
      } else if (col.field.includes('_at')) {
        cell.textContent = new Date(value).toLocaleDateString();
      } else {
        cell.textContent = String(value);
      }

      row.appendChild(cell);
    });

    // Actions cell
    const actionBase = grid.config.actionBasePath || grid.config.apiEndpoint;
    const actionsCell = document.createElement('td');
    actionsCell.className = 'px-6 py-4 whitespace-nowrap text-end text-sm font-medium';
    actionsCell.dataset.role = 'actions';
    actionsCell.dataset.fixed = 'right';

    // Use custom row actions if provided, otherwise use default actions
    if (grid.config.rowActions) {
      const actions = grid.config.rowActions(item);
      actionsCell.innerHTML = grid.actionRenderer.renderRowActions(item, actions);

      // Attach event listeners for each action button
      actions.forEach(action => {
        const actionId = grid.sanitizeActionId(action.label);
        const button = actionsCell.querySelector(`[data-action-id="${actionId}"]`);
        if (action.disabled) {
          return;
        }
        if (button) {
          button.addEventListener('click', async (e) => {
            e.preventDefault();
            if ((button as HTMLButtonElement).disabled) {
              return;
            }
            try {
              await action.action(item);
            } catch (error) {
              console.error(`Action "${action.label}" failed:`, error);
              const errorMsg = error instanceof Error ? error.message : `Action "${action.label}" failed`;
              grid.notify(errorMsg, 'error');
            }
          });
        }
      });
    } else if (grid.config.useDefaultActions !== false) {
      // Default actions (view, edit, delete)
      const defaultActions = [
        {
          label: 'View',
          icon: 'eye',
          action: () => { window.location.href = `${actionBase}/${item.id}`; },
          variant: 'secondary' as const
        },
        {
          label: 'Edit',
          icon: 'edit',
          action: () => { window.location.href = `${actionBase}/${item.id}/edit`; },
          variant: 'primary' as const
        },
        {
          label: 'Delete',
          icon: 'trash',
          action: async () => { await grid.handleDelete(item.id); },
          variant: 'danger' as const
        }
      ];

      actionsCell.innerHTML = grid.actionRenderer.renderRowActions(item, defaultActions);

      // Attach event listeners for each default action
      defaultActions.forEach(action => {
        const actionId = grid.sanitizeActionId(action.label);
        const button = actionsCell.querySelector(`[data-action-id="${actionId}"]`);
        if (button) {
          button.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            if ((button as HTMLButtonElement).disabled) {
              return;
            }
            try {
              await action.action();
            } catch (error) {
              console.error(`Action "${action.label}" failed:`, error);
              const errorMsg = error instanceof Error ? error.message : `Action "${action.label}" failed`;
              grid.notify(errorMsg, 'error');
            }
          });
        }
      });
    }

    row.appendChild(actionsCell);

    return row;
  }

  /**
   * Sanitize action label to create a valid ID
   */
export function sanitizeActionId(grid: any, label: string): string {
    return label.toLowerCase().replace(/[^a-z0-9]/g, '-');
  }

  /**
   * Handle delete action
   */
export async function handleDelete(grid: any, id: string): Promise<void> {
    const confirmed = await grid.confirmAction('Are you sure you want to delete this item?');
    if (!confirmed) {
      return;
    }

    try {
      const response = await httpRequest(`${grid.config.apiEndpoint}/${id}`, {
        method: 'DELETE',
        accept: 'application/json',
      });

      if (!response.ok) {
        throw new Error('Delete failed');
      }

      await grid.refresh();
    } catch (error) {
      console.error('Error deleting item:', error);
      grid.showError('Failed to delete item');
    }
  }

  /**
   * Update pagination UI
   */
export function updatePaginationUI(grid: any, data: ApiResponse): void {
    const total = grid.getResponseTotal(data) ?? grid.state.totalRows;
    const offset = grid.state.perPage * (grid.state.currentPage - 1);
    const start = total === 0 ? 0 : offset + 1;
    const end = Math.min(offset + grid.state.perPage, total);

    const startEl = document.querySelector(grid.selectors.tableInfoStart);
    const endEl = document.querySelector(grid.selectors.tableInfoEnd);
    const totalEl = document.querySelector(grid.selectors.tableInfoTotal);

    if (startEl) startEl.textContent = String(start);
    if (endEl) endEl.textContent = String(end);
    if (totalEl) totalEl.textContent = String(total);

    grid.renderPaginationButtons(total);
  }

  /**
   * Render pagination buttons
   */
export function renderPaginationButtons(grid: any, total: number): void {
    const container = document.querySelector(grid.selectors.paginationContainer);
    if (!container) return;

    const totalPages = Math.ceil(total / grid.state.perPage);
    if (totalPages <= 1) {
      container.innerHTML = '';
      return;
    }

    const buttons: string[] = [];
    const current = grid.state.currentPage;

    // Previous button
    buttons.push(`
      <button type="button"
              data-page="${current - 1}"
              ${current === 1 ? 'disabled' : ''}
              class="min-h-[38px] min-w-[38px] py-2 px-2.5 inline-flex justify-center items-center gap-x-1.5 text-sm rounded-lg text-gray-800 hover:bg-gray-100 focus:outline-none focus:bg-gray-100 disabled:opacity-50 disabled:pointer-events-none">
        <svg class="shrink-0 size-3.5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m15 18-6-6 6-6"></path>
        </svg>
        <span>Previous</span>
      </button>
    `);

    // Page numbers
    const maxButtons = 5;
    let startPage = Math.max(1, current - Math.floor(maxButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxButtons - 1);

    if (endPage - startPage < maxButtons - 1) {
      startPage = Math.max(1, endPage - maxButtons + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      const isActive = i === current;
      buttons.push(`
        <button type="button"
                data-page="${i}"
                class="min-h-[38px] min-w-[38px] flex justify-center items-center ${
                  isActive
                    ? 'bg-gray-200 text-gray-800 focus:outline-none focus:bg-gray-300'
                    : 'text-gray-800 hover:bg-gray-100 focus:outline-none focus:bg-gray-100'
                } py-2 px-3 text-sm rounded-lg">
          ${i}
        </button>
      `);
    }

    // Next button
    buttons.push(`
      <button type="button"
              data-page="${current + 1}"
              ${current === totalPages ? 'disabled' : ''}
              class="min-h-[38px] min-w-[38px] py-2 px-2.5 inline-flex justify-center items-center gap-x-1.5 text-sm rounded-lg text-gray-800 hover:bg-gray-100 focus:outline-none focus:bg-gray-100 disabled:opacity-50 disabled:pointer-events-none">
        <span>Next</span>
        <svg class="shrink-0 size-3.5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m9 18 6-6-6-6"></path>
        </svg>
      </button>
    `);

    container.innerHTML = buttons.join('');

    // Bind click handlers
    container.querySelectorAll('[data-page]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const page = parseInt((btn as HTMLElement).dataset.page || '1', 10);
        if (page >= 1 && page <= totalPages) {
          grid.state.currentPage = page;
          grid.pushStateToURL();
          if (grid.config.behaviors?.pagination) {
            await grid.config.behaviors.pagination.onPageChange(page, grid);
          } else {
            await grid.refresh();
          }
        }
      });
    });
  }
