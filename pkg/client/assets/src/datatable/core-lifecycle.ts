// @ts-nocheck
import type { ColumnFilter } from './core-types.js';
import { ColumnManager } from './column-manager.js';
import { extractErrorMessage } from '../toast/error-helpers.js';
import { addDelegatedEventListener } from '../shared/events/delegation.js';

export function bindSearchInput(grid: any): void {
    const input = document.querySelector<HTMLInputElement>(grid.selectors.searchInput);
    if (!input) {
      console.warn(`[DataGrid] Search input not found: ${grid.selectors.searchInput}`);
      return;
    }

    console.log(`[DataGrid] Search input bound to: ${grid.selectors.searchInput}`);

    const clearBtn = document.getElementById('clear-search-btn');

    // Toggle clear button visibility
    const toggleClearBtn = () => {
      if (clearBtn) {
        if (input.value.trim()) {
          clearBtn.classList.remove('hidden');
        } else {
          clearBtn.classList.add('hidden');
        }
      }
    };

    input.addEventListener('input', () => {
      toggleClearBtn();

      if (grid.searchTimeout) {
        clearTimeout(grid.searchTimeout);
      }

      grid.searchTimeout = window.setTimeout(async () => {
        console.log(`[DataGrid] Search triggered: "${input.value}"`);
        grid.state.search = input.value;
        grid.pushStateToURL();
        if (grid.config.behaviors?.search) {
          await grid.config.behaviors.search.onSearch(input.value, grid);
        } else {
          grid.resetPagination();
          await grid.refresh();
        }
      }, grid.config.searchDelay);
    });

    // Clear button handler
    if (clearBtn) {
      clearBtn.addEventListener('click', async () => {
        input.value = '';
        input.focus();
        toggleClearBtn();

        // Trigger search with empty value
        grid.state.search = '';
        grid.pushStateToURL();
        if (grid.config.behaviors?.search) {
          await grid.config.behaviors.search.onSearch('', grid);
        } else {
          grid.resetPagination();
          await grid.refresh();
        }
      });
    }

    // Initial toggle on page load
    toggleClearBtn();
  }

  /**
   * Bind per-page select
   */
export function bindPerPageSelect(grid: any): void {
    const select = document.querySelector<HTMLSelectElement>(grid.selectors.perPageSelect);
    if (!select) return;

    select.addEventListener('change', async () => {
      grid.state.perPage = parseInt(select.value, 10);
      grid.resetPagination();
      grid.pushStateToURL();
      await grid.refresh();
    });
  }

  /**
   * Bind filter inputs
   */
export function bindFilterInputs(grid: any): void {
    const filterInputs = document.querySelectorAll<HTMLInputElement | HTMLSelectElement>(grid.selectors.filterRow);

    filterInputs.forEach((input) => {
      // Handler function for both input and change events
      const handleFilterChange = async () => {
        const column = input.dataset.filterColumn;
        const inputType = input instanceof HTMLInputElement ? input.type.toLowerCase() : '';
        const inferredOperator = input instanceof HTMLSelectElement
          ? 'eq'
          : (inputType === '' || inputType === 'text' || inputType === 'search' || inputType === 'email' || inputType === 'tel' || inputType === 'url')
            ? 'ilike'
            : 'eq';
        const operator = (input.dataset.filterOperator as any) || inferredOperator;
        const value = input.value;

        if (!column) return;

        // Update filters state
        const existingIndex = grid.state.filters.findIndex(f => f.column === column);
        if (value) {
          const filter: ColumnFilter = { column, operator, value };
          if (existingIndex >= 0) {
            grid.state.filters[existingIndex] = filter;
          } else {
            grid.state.filters.push(filter);
          }
        } else {
          // Remove filter if value is empty
          if (existingIndex >= 0) {
            grid.state.filters.splice(existingIndex, 1);
          }
        }

        grid.pushStateToURL();
        if (grid.config.behaviors?.filter) {
          await grid.config.behaviors.filter.onFilterChange(column, value, grid);
        } else {
          grid.resetPagination();
          await grid.refresh();
        }
      };

      // Bind both input (for text inputs) and change (for selects) events
      input.addEventListener('input', handleFilterChange);
      input.addEventListener('change', handleFilterChange);
    });
  }

  /**
   * Bind column visibility toggle using ColumnManager
   */
export function bindColumnVisibility(grid: any): void {
    const toggleBtn = document.querySelector(grid.selectors.columnToggleBtn);
    const menu = document.querySelector<HTMLElement>(grid.selectors.columnToggleMenu);

    if (!toggleBtn || !menu) return;

    // Initialize ColumnManager to render column items with switches and drag handles
    grid.columnManager = new ColumnManager({
      container: menu,
      grid: grid,
      onToggle: (field, visible) => {
        console.log(`[DataGrid] Column ${field} visibility toggled to ${visible}`);
      },
      onReorder: (order) => {
        console.log(`[DataGrid] Columns reordered:`, order);
      }
    });
  }

  /**
   * Bind export buttons
   */
export function bindExportButtons(grid: any): void {
    const menu = document.querySelector(grid.selectors.exportMenu);
    if (!menu) return;

    const exportButtons = menu.querySelectorAll<HTMLButtonElement>('[data-export-format]');

    exportButtons.forEach((btn) => {
      btn.addEventListener('click', async () => {
        const format = (btn as HTMLElement).dataset.exportFormat as 'csv' | 'json' | 'excel' | 'pdf';
        if (!format || !grid.config.behaviors?.export) return;

        // Get concurrency mode (default to 'single')
        const concurrency = grid.config.behaviors.export.getConcurrency?.() || 'single';

        // Determine which buttons to disable based on concurrency mode
        const buttonsToDisable: HTMLButtonElement[] = [];
        if (concurrency === 'single') {
          // Disable all export buttons
          exportButtons.forEach(b => buttonsToDisable.push(b));
        } else if (concurrency === 'per-format') {
          // Disable only the clicked button
          buttonsToDisable.push(btn);
        }
        // 'none' mode: no buttons disabled, but clicked button still shows spinner

        // Helper to toggle spinner visibility on a button
        const showSpinner = (b: HTMLButtonElement) => {
          const icon = b.querySelector('.export-icon');
          const spinner = b.querySelector('.export-spinner');
          if (icon) icon.classList.add('hidden');
          if (spinner) spinner.classList.remove('hidden');
        };

        const hideSpinner = (b: HTMLButtonElement) => {
          const icon = b.querySelector('.export-icon');
          const spinner = b.querySelector('.export-spinner');
          if (icon) icon.classList.remove('hidden');
          if (spinner) spinner.classList.add('hidden');
        };

        // Apply loading state to buttons that should be disabled
        buttonsToDisable.forEach(b => {
          b.setAttribute('data-export-loading', 'true');
          b.disabled = true;
          showSpinner(b);
        });

        // For 'none' mode, still show spinner on clicked button (but don't disable)
        const showSpinnerOnly = concurrency === 'none';
        if (showSpinnerOnly) {
          btn.setAttribute('data-export-loading', 'true');
          showSpinner(btn);
        }

        try {
          await grid.config.behaviors.export.export(format, grid);
        } catch (error) {
          // Error already handled by the export behavior (toast shown)
          console.error('[DataGrid] Export failed:', error);
        } finally {
          // Clear loading state from disabled buttons
          buttonsToDisable.forEach(b => {
            b.removeAttribute('data-export-loading');
            b.disabled = false;
            hideSpinner(b);
          });

          // Clear spinner-only state for 'none' mode
          if (showSpinnerOnly) {
            btn.removeAttribute('data-export-loading');
            hideSpinner(btn);
          }
        }
      });
    });
  }

  /**
   * Bind table sorting
   */
export function bindSorting(grid: any): void {
    if (!grid.tableEl) return;

    // Bind new sort buttons ([data-sort-column])
    const sortButtons = grid.tableEl.querySelectorAll<HTMLButtonElement>('[data-sort-column]');

    sortButtons.forEach((button) => {
      button.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();

        const field = button.dataset.sortColumn;
        if (!field) return;

        console.log(`[DataGrid] Sort button clicked for field: ${field}`);

        // Triple-click cycle: none -> asc -> desc -> none -> asc -> ...
        const existing = grid.state.sort.find(s => s.field === field);
        let direction: 'asc' | 'desc' | null = null;

        if (existing) {
          if (existing.direction === 'asc') {
            // asc -> desc
            direction = 'desc';
            existing.direction = direction;
          } else {
            // desc -> none (clear sort)
            grid.state.sort = grid.state.sort.filter(s => s.field !== field);
            direction = null;
            console.log(`[DataGrid] Sort cleared for field: ${field}`);
          }
        } else {
          // none -> asc
          direction = 'asc';
          grid.state.sort = [{ field, direction }];
        }

        console.log(`[DataGrid] New sort state:`, grid.state.sort);

        grid.pushStateToURL();

        if (direction !== null && grid.config.behaviors?.sort) {
          console.log('[DataGrid] Calling custom sort behavior');
          await grid.config.behaviors.sort.onSort(field, direction, grid);
        } else {
          console.log('[DataGrid] Calling refresh() for sort');
          await grid.refresh();
        }

        // Update UI
        console.log('[DataGrid] Updating sort indicators');
        grid.updateSortIndicators();
      });
    });

    // Also bind legacy sortable headers ([data-sort])
    const sortableHeaders = grid.tableEl.querySelectorAll<HTMLElement>('[data-sort]');

    sortableHeaders.forEach((header) => {
      header.addEventListener('click', async () => {
        const field = header.dataset.sort;
        if (!field) return;

        // Triple-click cycle: none -> asc -> desc -> none -> asc -> ...
        const existing = grid.state.sort.find(s => s.field === field);
        let direction: 'asc' | 'desc' | null = null;

        if (existing) {
          if (existing.direction === 'asc') {
            // asc -> desc
            direction = 'desc';
            existing.direction = direction;
          } else {
            // desc -> none (clear sort)
            grid.state.sort = grid.state.sort.filter(s => s.field !== field);
            direction = null;
          }
        } else {
          // none -> asc
          direction = 'asc';
          grid.state.sort = [{ field, direction }];
        }

        grid.pushStateToURL();

        if (direction !== null && grid.config.behaviors?.sort) {
          await grid.config.behaviors.sort.onSort(field, direction, grid);
        } else {
          await grid.refresh();
        }

        // Update UI
        grid.updateSortIndicators();
      });
    });
  }

  /**
   * Update sort indicators in table headers
   */
export function updateSortIndicators(grid: any): void {
    if (!grid.tableEl) return;

    // Handle both old [data-sort] and new [data-sort-column] buttons
    const sortButtons = grid.tableEl.querySelectorAll<HTMLButtonElement>('[data-sort-column]');

    sortButtons.forEach((button) => {
      const field = button.dataset.sortColumn;
      if (!field) return;

      const sorted = grid.state.sort.find(s => s.field === field);
      const svg = button.querySelector('svg');

      if (svg) {
        // Update button visibility and styling based on sort state
        if (sorted) {
          button.classList.remove('opacity-0');
          button.classList.add('opacity-100');

          // Update icon based on direction
          if (sorted.direction === 'asc') {
            // Show ascending arrow (up arrow only)
            svg.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />';
            svg.classList.add('text-blue-600');
            svg.classList.remove('text-gray-400');
          } else {
            // Show descending arrow (down arrow only)
            svg.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />';
            svg.classList.add('text-blue-600');
            svg.classList.remove('text-gray-400');
          }
        } else {
          // Reset to default double arrow
          svg.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />';
          svg.classList.remove('text-blue-600');
          svg.classList.add('text-gray-400');
        }
      }
    });

    // Also handle legacy [data-sort] headers with .sort-indicator
    const headers = grid.tableEl.querySelectorAll<HTMLElement>('[data-sort]');
    headers.forEach((header) => {
      const field = header.dataset.sort;
      const sorted = grid.state.sort.find(s => s.field === field);

      const indicator = header.querySelector('.sort-indicator');
      if (indicator) {
        indicator.textContent = sorted ? (sorted.direction === 'asc' ? '↑' : '↓') : '';
      }
    });
  }

  /**
   * Bind selection checkboxes
   */
export function bindSelection(grid: any): void {
    const selectAll = document.querySelector<HTMLInputElement>(grid.selectors.selectAllCheckbox);

    if (selectAll) {
      selectAll.addEventListener('change', () => {
        const checkboxes = document.querySelectorAll<HTMLInputElement>(grid.selectors.rowCheckboxes);
        checkboxes.forEach((cb) => {
          cb.checked = selectAll.checked;
          const id = cb.dataset.id;
          if (id) {
            if (selectAll.checked) {
              grid.state.selectedRows.add(id);
            } else {
              grid.state.selectedRows.delete(id);
            }
          }
        });
        grid.updateBulkActionsBar();
      });
    }

    grid.updateSelectionBindings();
  }

  /**
   * Update selection bindings after rendering
   * This syncs checkbox states with the selectedRows Set
   */
export function updateSelectionBindings(grid: any): void {
    const checkboxes = document.querySelectorAll<HTMLInputElement>(grid.selectors.rowCheckboxes);

    checkboxes.forEach((cb) => {
      const id = cb.dataset.id;

      // Sync checkbox state with selectedRows Set
      if (id) {
        cb.checked = grid.state.selectedRows.has(id);
      }

      // Remove old listeners to avoid duplicates (use once: true or track bound status in production)
      cb.addEventListener('change', () => {
        if (id) {
          if (cb.checked) {
            grid.state.selectedRows.add(id);
          } else {
            grid.state.selectedRows.delete(id);
          }
        }
        grid.updateBulkActionsBar();
      });
    });
  }

  /**
   * Bind bulk action buttons
   */
export function bindBulkActions(grid: any): void {
    const overlay = document.getElementById('bulk-actions-overlay');
    const bulkBase = overlay?.dataset?.bulkBase || '';
    const bulkActionButtons = document.querySelectorAll('[data-bulk-action]');

    bulkActionButtons.forEach((btn) => {
      btn.addEventListener('click', async () => {
        const el = btn as HTMLElement;
        const actionId = el.dataset.bulkAction;
        if (!actionId) return;

        const ids = Array.from(grid.state.selectedRows);
        if (ids.length === 0) {
          grid.notify('Please select items first', 'warning');
          return;
        }

        // 1. Try config.bulkActions first (inline JS config)
        if (grid.config.bulkActions) {
          const bulkActionConfig = grid.config.bulkActions.find(ba => ba.id === actionId);
          if (bulkActionConfig) {
            try {
              await grid.actionRenderer.executeBulkAction(bulkActionConfig, ids);
              grid.state.selectedRows.clear();
              grid.updateBulkActionsBar();
              await grid.refresh();
            } catch (error) {
              console.error('Bulk action failed:', error);
              grid.showError('Bulk action failed');
            }
            return;
          }
        }

        // 2. Try DOM data-driven config (from server-rendered data-bulk-* attributes)
        if (bulkBase) {
          const endpoint = `${bulkBase}/${actionId}`;
          const confirmMsg = el.dataset.bulkConfirm;
          const payloadRequired = grid.parseDatasetStringArray(el.dataset.bulkPayloadRequired);
          const payloadSchema = grid.parseDatasetObject(el.dataset.bulkPayloadSchema);
          const domConfig = {
            id: actionId,
            label: el.textContent?.trim() || actionId,
            endpoint: endpoint,
            confirm: confirmMsg,
            payloadRequired: payloadRequired,
            payloadSchema: payloadSchema,
          };
          try {
            await grid.actionRenderer.executeBulkAction(domConfig, ids);
            grid.state.selectedRows.clear();
            grid.updateBulkActionsBar();
            await grid.refresh();
          } catch (error) {
            console.error('Bulk action failed:', error);
            grid.showError('Bulk action failed');
          }
          return;
        }

        // 3. Fall back to behaviors.bulkActions (old system)
        if (grid.config.behaviors?.bulkActions) {
          try {
            await grid.config.behaviors.bulkActions.execute(actionId, ids, grid);
            grid.state.selectedRows.clear();
            grid.updateBulkActionsBar();
          } catch (error) {
            console.error('Bulk action failed:', error);
            grid.showError('Bulk action failed');
          }
        }
      });
    });

    // Bind clear selection button
    const clearBtn = document.getElementById('clear-selection-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        grid.state.selectedRows.clear();
        grid.updateBulkActionsBar();
        // Uncheck all checkboxes
        const checkboxes = document.querySelectorAll<HTMLInputElement>('.table-checkbox');
        checkboxes.forEach(cb => cb.checked = false);
        const selectAll = document.querySelector<HTMLInputElement>(grid.selectors.selectAllCheckbox);
        if (selectAll) selectAll.checked = false;
      });
    }

    // Bind overflow menu toggle
    grid.bindOverflowMenu();
  }

  /**
   * Bind overflow menu toggle (three-dot "More" button)
   */
export function bindOverflowMenu(grid: any): void {
    const moreBtn = document.getElementById('bulk-more-btn');
    const menu = document.getElementById('bulk-overflow-menu');
    if (!moreBtn || !menu) return;

    moreBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      menu.classList.toggle('hidden');
    });

    // Close on outside click
    document.addEventListener('click', () => {
      menu.classList.add('hidden');
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        menu.classList.add('hidden');
      }
    });

    // Prevent menu clicks from closing the menu
    menu.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }

  /**
   * Update bulk actions bar visibility with animation
   */
export function updateBulkActionsBar(grid: any): void {
    const overlay = document.getElementById('bulk-actions-overlay');
    const countEl = document.getElementById('selected-count');
    const selectedCount = grid.state.selectedRows.size;

    console.log('[DataGrid] updateBulkActionsBar - overlay:', overlay, 'countEl:', countEl, 'count:', selectedCount);

    if (!overlay || !countEl) {
      console.error('[DataGrid] Missing bulk actions elements!');
      return;
    }

    // Update count
    countEl.textContent = String(selectedCount);

    // Show/hide with animation
    if (selectedCount > 0) {
      overlay.classList.remove('hidden');
      // Trigger reflow for animation
      void overlay.offsetHeight;
    } else {
      overlay.classList.add('hidden');
    }
  }

  /**
   * Bind clear selection button
   */
export function bindBulkClearButton(grid: any): void {
    const clearBtn = document.getElementById('bulk-clear-selection');
    console.log('[DataGrid] Binding clear button:', clearBtn);
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        console.log('[DataGrid] Clear button clicked!');
        grid.clearSelection();
      });
    } else {
      console.error('[DataGrid] Clear button not found!');
    }
  }

  /**
   * Clear all selections
   */
export function clearSelection(grid: any): void {
    console.log('[DataGrid] Clearing selection...');
    grid.state.selectedRows.clear();

    // Uncheck the "select all" checkbox in the table header
    const selectAllCheckbox = document.querySelector<HTMLInputElement>(grid.selectors.selectAllCheckbox);
    if (selectAllCheckbox) {
      selectAllCheckbox.checked = false;
    }

    grid.updateBulkActionsBar();
    grid.updateSelectionBindings();
  }

  /**
   * Position dropdown menu intelligently based on available space
   */
export function positionDropdownMenu(grid: any, trigger: HTMLElement, menu: HTMLElement): void {
    const triggerRect = trigger.getBoundingClientRect();
    const menuHeight = menu.offsetHeight || 300; // Estimate if not rendered
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - triggerRect.bottom;
    const spaceAbove = triggerRect.top;

    // Determine if menu should open upward or downward
    const shouldOpenUpward = spaceBelow < menuHeight && spaceAbove > spaceBelow;

    // Position horizontally (align right edge of menu with trigger)
    const left = triggerRect.right - (menu.offsetWidth || 224); // 224px = 14rem default width
    menu.style.left = `${Math.max(10, left)}px`; // At least 10px from left edge

    // Position vertically
    if (shouldOpenUpward) {
      // Open upward
      menu.style.top = `${triggerRect.top - menuHeight - 8}px`;
      menu.style.bottom = 'auto';
    } else {
      // Open downward (default)
      menu.style.top = `${triggerRect.bottom + 8}px`;
      menu.style.bottom = 'auto';
    }
  }

  /**
   * Bind dropdown toggles
   */
export function bindDropdownToggles(grid: any): void {
    // Ensure we don't stack global listeners across in-page navigations.
    if (grid.dropdownAbortController) {
      grid.dropdownAbortController.abort();
    }
    grid.dropdownAbortController = new AbortController();
    const { signal } = grid.dropdownAbortController;

    // Existing dropdown toggles (column visibility, export, etc.)
    // Defensive: ensure all dropdown menus start hidden
    document.querySelectorAll('[data-dropdown-toggle]').forEach((toggle) => {
      const targetId = (toggle as HTMLElement).dataset.dropdownToggle;
      const target = document.getElementById(targetId || '');
      if (target && !target.classList.contains('hidden')) {
        target.classList.add('hidden');
      }
    });

    addDelegatedEventListener(document, 'click', '[data-dropdown-toggle]', (event, toggle) => {
      event.stopPropagation();
      const targetId = toggle.dataset.dropdownToggle;
      const target = document.getElementById(targetId || '');

      if (target) {
        document.querySelectorAll('[data-dropdown-toggle]').forEach((otherToggle) => {
          const otherId = (otherToggle as HTMLElement).dataset.dropdownToggle;
          const otherTarget = document.getElementById(otherId || '');
          if (otherTarget && otherTarget !== target) {
            otherTarget.classList.add('hidden');
          }
        });

        target.classList.toggle('hidden');
      }
    }, { signal });

    // Action dropdown menus (row actions)
    document.addEventListener('click', (e) => {
      const trigger = (e.target as HTMLElement).closest('[data-dropdown-trigger]');

      if (trigger) {
        e.stopPropagation();
        const dropdown = trigger.closest('[data-dropdown]');
        const menu = dropdown?.querySelector('.actions-menu') as HTMLElement;

        // Close other action dropdowns
        document.querySelectorAll('.actions-menu').forEach(m => {
          if (m !== menu) m.classList.add('hidden');
        });

        // Toggle this dropdown
        const isOpening = menu?.classList.contains('hidden');
        menu?.classList.toggle('hidden');
        trigger.setAttribute('aria-expanded', isOpening ? 'true' : 'false');

        // Position the dropdown intelligently (only when opening)
        if (isOpening && menu) {
          grid.positionDropdownMenu(trigger as HTMLElement, menu);
        }
      } else {
        // Check if the click is inside an open dropdown menu (e.g., column toggle menu)
        const clickedInsideDropdownMenu = (e.target as HTMLElement).closest('[data-dropdown-toggle], #column-toggle-menu, #export-menu');

        if (!clickedInsideDropdownMenu) {
          // Close all action dropdowns when clicking outside
          document.querySelectorAll('.actions-menu').forEach(m =>
            m.classList.add('hidden')
          );

          // Also close existing dropdowns
          document.querySelectorAll('[data-dropdown-toggle]').forEach((toggle) => {
            const targetId = (toggle as HTMLElement).dataset.dropdownToggle;
            const target = document.getElementById(targetId || '');
            if (target) {
              target.classList.add('hidden');
            }
          });
        }
      }
    }, { signal });

    // ESC key closes all dropdowns
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        // Close action dropdowns
        document.querySelectorAll('.actions-menu').forEach(m => {
          m.classList.add('hidden');
          const trigger = m.closest('[data-dropdown]')?.querySelector('[data-dropdown-trigger]');
          if (trigger) trigger.setAttribute('aria-expanded', 'false');
        });

        // Close toggle dropdowns (column visibility, export, etc.)
        document.querySelectorAll('[data-dropdown-toggle]').forEach((toggle) => {
          const targetId = (toggle as HTMLElement).dataset.dropdownToggle;
          const target = document.getElementById(targetId || '');
          if (target) {
            target.classList.add('hidden');
          }
        });
      }
    }, { signal });
  }

  /**
   * Show error message using notifier
   */
export function showError(grid: any, message: string): void {
    console.error(message);
    grid.notifier.error(message);
  }

  /**
   * Show notification using notifier
   */
export function notify(grid: any, message: string, type: 'success' | 'error' | 'warning' | 'info'): void {
    grid.notifier.show({ message, type });
  }

  /**
   * Show confirmation dialog using notifier
   */
export async function confirmAction(grid: any, message: string): Promise<boolean> {
    return grid.notifier.confirm(message);
  }

  /**
   * Extract error message from Response or Error
   */
export async function extractError(grid: any, error: unknown): Promise<string> {
    if (error instanceof Response) {
      return extractErrorMessage(error);
    }
    if (error instanceof Error) {
      return error.message;
    }
    return 'An unexpected error occurred';
  }

export function parseDatasetStringArray(grid: any, raw: string | undefined): string[] | undefined {
    if (!raw) {
      return undefined;
    }
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) {
        return undefined;
      }
      const result = parsed
        .map((item) => (typeof item === 'string' ? item.trim() : ''))
        .filter((item) => item.length > 0);
      return result.length > 0 ? result : undefined;
    } catch (error) {
      console.warn('[DataGrid] Failed to parse bulk payload_required:', error);
      return undefined;
    }
  }

export function parseDatasetObject(grid: any, raw: string | undefined): Record<string, unknown> | undefined {
    if (!raw) {
      return undefined;
    }
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return undefined;
      }
      return parsed as Record<string, unknown>;
    } catch (error) {
      console.warn('[DataGrid] Failed to parse bulk payload_schema:', error);
      return undefined;
    }
  }
