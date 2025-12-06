/**
 * DataGrid component
 * Behavior-agnostic data grid with pluggable behaviors
 */
export class DataGrid {
    constructor(config) {
        this.tableEl = null;
        this.searchTimeout = null;
        this.abortController = null;
        this.config = {
            perPage: 10,
            searchDelay: 300,
            behaviors: {},
            ...config
        };
        this.selectors = {
            table: `#${config.tableId}`,
            searchInput: '#table-search',
            perPageSelect: '#table-per-page',
            filterRow: '[data-filter-column]',
            columnToggleBtn: '#column-toggle-btn',
            columnToggleMenu: '#column-toggle-menu',
            exportBtn: '#export-btn',
            exportMenu: '#export-menu',
            paginationContainer: '#table-pagination',
            tableInfoStart: '#table-info-start',
            tableInfoEnd: '#table-info-end',
            tableInfoTotal: '#table-info-total',
            selectAllCheckbox: '#table-checkbox-all',
            rowCheckboxes: '.table-checkbox',
            bulkActionsBar: '#bulk-actions-bar',
            selectedCount: '#selected-count',
            ...config.selectors
        };
        this.state = {
            currentPage: 1,
            perPage: this.config.perPage || 10,
            totalRows: 0,
            search: '',
            filters: [],
            sort: [],
            selectedRows: new Set()
        };
    }
    /**
     * Initialize the data grid
     */
    init() {
        this.tableEl = document.querySelector(this.selectors.table);
        if (!this.tableEl) {
            console.error(`Table element not found: ${this.selectors.table}`);
            return;
        }
        this.bindSearchInput();
        this.bindPerPageSelect();
        this.bindFilterInputs();
        this.bindColumnVisibility();
        this.bindExportButtons();
        this.bindSorting();
        this.bindSelection();
        this.bindBulkActions();
        this.bindDropdownToggles();
        // Initial data load
        this.refresh();
    }
    /**
     * Refresh data from API
     */
    async refresh() {
        if (this.abortController) {
            this.abortController.abort();
        }
        this.abortController = new AbortController();
        try {
            const url = this.buildApiUrl();
            const response = await fetch(url, {
                signal: this.abortController.signal,
                headers: {
                    'Accept': 'application/json'
                }
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            this.renderData(data);
            this.updatePaginationUI(data);
        }
        catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                console.log('Request aborted');
                return;
            }
            console.error('Error fetching data:', error);
            this.showError('Failed to load data');
        }
    }
    /**
     * Build API URL with all query parameters
     */
    buildApiUrl() {
        const params = new URLSearchParams();
        const queryParams = this.buildQueryParams();
        Object.entries(queryParams).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
                params.append(key, String(value));
            }
        });
        return `${this.config.apiEndpoint}?${params.toString()}`;
    }
    /**
     * Build query string (for exports, etc.)
     */
    buildQueryString() {
        const params = new URLSearchParams();
        const queryParams = this.buildQueryParams();
        Object.entries(queryParams).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
                params.append(key, String(value));
            }
        });
        return params.toString();
    }
    /**
     * Build query parameters from state using behaviors
     */
    buildQueryParams() {
        const params = {};
        // Pagination
        if (this.config.behaviors?.pagination) {
            const paginationParams = this.config.behaviors.pagination.buildQuery(this.state.currentPage, this.state.perPage);
            Object.assign(params, paginationParams);
        }
        // Search
        if (this.state.search && this.config.behaviors?.search) {
            const searchParams = this.config.behaviors.search.buildQuery(this.state.search);
            Object.assign(params, searchParams);
        }
        // Filters
        if (this.state.filters.length > 0 && this.config.behaviors?.filter) {
            const filterParams = this.config.behaviors.filter.buildFilters(this.state.filters);
            Object.assign(params, filterParams);
        }
        // Sorting
        if (this.state.sort.length > 0 && this.config.behaviors?.sort) {
            const sortParams = this.config.behaviors.sort.buildQuery(this.state.sort);
            Object.assign(params, sortParams);
        }
        return params;
    }
    /**
     * Reset pagination to first page
     */
    resetPagination() {
        this.state.currentPage = 1;
    }
    /**
     * Update column visibility
     */
    updateColumnVisibility(visibleColumns) {
        if (!this.tableEl)
            return;
        const visibleSet = new Set(visibleColumns);
        // Update header visibility
        const headerCells = this.tableEl.querySelectorAll('thead th[data-column]');
        headerCells.forEach((th) => {
            const field = th.dataset.column;
            if (field) {
                th.style.display = visibleSet.has(field) ? '' : 'none';
            }
        });
        // Update body cell visibility
        const bodyCells = this.tableEl.querySelectorAll('tbody td[data-column]');
        bodyCells.forEach((td) => {
            const field = td.dataset.column;
            if (field) {
                td.style.display = visibleSet.has(field) ? '' : 'none';
            }
        });
    }
    /**
     * Render data into table
     */
    renderData(data) {
        const tbody = this.tableEl?.querySelector('tbody');
        if (!tbody)
            return;
        tbody.innerHTML = '';
        const items = data.data || [];
        this.state.totalRows = data.total || data.$meta?.count || data.count || items.length;
        if (items.length === 0) {
            tbody.innerHTML = `
        <tr>
          <td colspan="${this.config.columns.length + 2}" class="px-6 py-8 text-center text-gray-500">
            No results found
          </td>
        </tr>
      `;
            return;
        }
        items.forEach((item) => {
            const row = this.createTableRow(item);
            tbody.appendChild(row);
        });
        // Rebind selection after rendering
        this.updateSelectionBindings();
    }
    /**
     * Create table row element
     */
    createTableRow(item) {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50';
        // Checkbox cell
        const checkboxCell = document.createElement('td');
        checkboxCell.className = 'px-6 py-4 whitespace-nowrap';
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
        this.config.columns.forEach((col) => {
            const cell = document.createElement('td');
            cell.className = 'px-6 py-4 whitespace-nowrap text-sm text-gray-800';
            cell.setAttribute('data-column', col.field);
            const value = item[col.field];
            if (col.render) {
                cell.innerHTML = col.render(value, item);
            }
            else if (value === null || value === undefined) {
                cell.textContent = '-';
            }
            else if (col.field.includes('_at')) {
                cell.textContent = new Date(value).toLocaleDateString();
            }
            else {
                cell.textContent = String(value);
            }
            row.appendChild(cell);
        });
        // Actions cell
        const actionsCell = document.createElement('td');
        actionsCell.className = 'px-6 py-4 whitespace-nowrap text-end text-sm font-medium';
        actionsCell.innerHTML = `
      <div class="flex justify-end gap-2">
        <a href="${this.config.apiEndpoint}/${item.id}"
           class="text-sm font-semibold text-blue-600 hover:text-blue-800">
          View
        </a>
        <a href="${this.config.apiEndpoint}/${item.id}/edit"
           class="text-sm font-semibold text-blue-600 hover:text-blue-800">
          Edit
        </a>
        <button type="button"
                data-delete-id="${item.id}"
                class="text-sm font-semibold text-red-600 hover:text-red-800">
          Delete
        </button>
      </div>
    `;
        // Bind delete button
        const deleteBtn = actionsCell.querySelector('[data-delete-id]');
        deleteBtn?.addEventListener('click', () => this.handleDelete(item.id));
        row.appendChild(actionsCell);
        return row;
    }
    /**
     * Handle delete action
     */
    async handleDelete(id) {
        if (!confirm('Are you sure you want to delete this item?')) {
            return;
        }
        try {
            const response = await fetch(`${this.config.apiEndpoint}/${id}`, {
                method: 'DELETE'
            });
            if (!response.ok) {
                throw new Error('Delete failed');
            }
            await this.refresh();
        }
        catch (error) {
            console.error('Error deleting item:', error);
            this.showError('Failed to delete item');
        }
    }
    /**
     * Update pagination UI
     */
    updatePaginationUI(data) {
        const total = data.total || data.$meta?.count || data.count || this.state.totalRows;
        const offset = this.state.perPage * (this.state.currentPage - 1);
        const start = total === 0 ? 0 : offset + 1;
        const end = Math.min(offset + this.state.perPage, total);
        const startEl = document.querySelector(this.selectors.tableInfoStart);
        const endEl = document.querySelector(this.selectors.tableInfoEnd);
        const totalEl = document.querySelector(this.selectors.tableInfoTotal);
        if (startEl)
            startEl.textContent = String(start);
        if (endEl)
            endEl.textContent = String(end);
        if (totalEl)
            totalEl.textContent = String(total);
        this.renderPaginationButtons(total);
    }
    /**
     * Render pagination buttons
     */
    renderPaginationButtons(total) {
        const container = document.querySelector(this.selectors.paginationContainer);
        if (!container)
            return;
        const totalPages = Math.ceil(total / this.state.perPage);
        if (totalPages <= 1) {
            container.innerHTML = '';
            return;
        }
        const buttons = [];
        const current = this.state.currentPage;
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
                class="min-h-[38px] min-w-[38px] flex justify-center items-center ${isActive
                ? 'bg-gray-200 text-gray-800 focus:outline-none focus:bg-gray-300'
                : 'text-gray-800 hover:bg-gray-100 focus:outline-none focus:bg-gray-100'} py-2 px-3 text-sm rounded-lg">
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
                const page = parseInt(btn.dataset.page || '1', 10);
                if (page >= 1 && page <= totalPages) {
                    this.state.currentPage = page;
                    if (this.config.behaviors?.pagination) {
                        await this.config.behaviors.pagination.onPageChange(page, this);
                    }
                    else {
                        await this.refresh();
                    }
                }
            });
        });
    }
    /**
     * Bind search input
     */
    bindSearchInput() {
        const input = document.querySelector(this.selectors.searchInput);
        if (!input)
            return;
        input.addEventListener('input', () => {
            if (this.searchTimeout) {
                clearTimeout(this.searchTimeout);
            }
            this.searchTimeout = window.setTimeout(async () => {
                this.state.search = input.value;
                if (this.config.behaviors?.search) {
                    await this.config.behaviors.search.onSearch(input.value, this);
                }
                else {
                    this.resetPagination();
                    await this.refresh();
                }
            }, this.config.searchDelay);
        });
    }
    /**
     * Bind per-page select
     */
    bindPerPageSelect() {
        const select = document.querySelector(this.selectors.perPageSelect);
        if (!select)
            return;
        select.addEventListener('change', async () => {
            this.state.perPage = parseInt(select.value, 10);
            this.resetPagination();
            await this.refresh();
        });
    }
    /**
     * Bind filter inputs
     */
    bindFilterInputs() {
        const filterInputs = document.querySelectorAll(this.selectors.filterRow);
        filterInputs.forEach((input) => {
            input.addEventListener('input', async () => {
                const column = input.dataset.filterColumn;
                const operator = input.dataset.filterOperator || 'eq';
                const value = input.value;
                if (!column)
                    return;
                // Update filters state
                const existingIndex = this.state.filters.findIndex(f => f.column === column);
                if (value) {
                    const filter = { column, operator, value };
                    if (existingIndex >= 0) {
                        this.state.filters[existingIndex] = filter;
                    }
                    else {
                        this.state.filters.push(filter);
                    }
                }
                else {
                    // Remove filter if value is empty
                    if (existingIndex >= 0) {
                        this.state.filters.splice(existingIndex, 1);
                    }
                }
                if (this.config.behaviors?.filter) {
                    await this.config.behaviors.filter.onFilterChange(column, value, this);
                }
                else {
                    this.resetPagination();
                    await this.refresh();
                }
            });
        });
    }
    /**
     * Bind column visibility toggle
     */
    bindColumnVisibility() {
        const toggleBtn = document.querySelector(this.selectors.columnToggleBtn);
        const menu = document.querySelector(this.selectors.columnToggleMenu);
        if (!toggleBtn || !menu)
            return;
        const checkboxes = menu.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach((checkbox) => {
            checkbox.addEventListener('change', () => {
                const field = checkbox.dataset.column;
                if (field && this.config.behaviors?.columnVisibility) {
                    this.config.behaviors.columnVisibility.toggleColumn(field, this);
                }
            });
        });
    }
    /**
     * Bind export buttons
     */
    bindExportButtons() {
        const menu = document.querySelector(this.selectors.exportMenu);
        if (!menu)
            return;
        menu.querySelectorAll('[data-export-format]').forEach((btn) => {
            btn.addEventListener('click', async () => {
                const format = btn.dataset.exportFormat;
                if (format && this.config.behaviors?.export) {
                    await this.config.behaviors.export.export(format, this);
                }
            });
        });
    }
    /**
     * Bind table sorting
     */
    bindSorting() {
        if (!this.tableEl)
            return;
        const sortableHeaders = this.tableEl.querySelectorAll('[data-sort]');
        sortableHeaders.forEach((header) => {
            header.addEventListener('click', async () => {
                const field = header.dataset.sort;
                if (!field)
                    return;
                // Toggle sort direction
                const existing = this.state.sort.find(s => s.field === field);
                let direction = 'asc';
                if (existing) {
                    direction = existing.direction === 'asc' ? 'desc' : 'asc';
                    existing.direction = direction;
                }
                else {
                    this.state.sort = [{ field, direction }];
                }
                if (this.config.behaviors?.sort) {
                    await this.config.behaviors.sort.onSort(field, direction, this);
                }
                else {
                    await this.refresh();
                }
                // Update UI
                this.updateSortIndicators();
            });
        });
    }
    /**
     * Update sort indicators in table headers
     */
    updateSortIndicators() {
        if (!this.tableEl)
            return;
        const headers = this.tableEl.querySelectorAll('[data-sort]');
        headers.forEach((header) => {
            const field = header.dataset.sort;
            const sorted = this.state.sort.find(s => s.field === field);
            const indicator = header.querySelector('.sort-indicator');
            if (indicator) {
                indicator.textContent = sorted ? (sorted.direction === 'asc' ? '↑' : '↓') : '';
            }
        });
    }
    /**
     * Bind selection checkboxes
     */
    bindSelection() {
        const selectAll = document.querySelector(this.selectors.selectAllCheckbox);
        if (selectAll) {
            selectAll.addEventListener('change', () => {
                const checkboxes = document.querySelectorAll(this.selectors.rowCheckboxes);
                checkboxes.forEach((cb) => {
                    cb.checked = selectAll.checked;
                    const id = cb.dataset.id;
                    if (id) {
                        if (selectAll.checked) {
                            this.state.selectedRows.add(id);
                        }
                        else {
                            this.state.selectedRows.delete(id);
                        }
                    }
                });
                this.updateBulkActionsBar();
            });
        }
        this.updateSelectionBindings();
    }
    /**
     * Update selection bindings after rendering
     */
    updateSelectionBindings() {
        const checkboxes = document.querySelectorAll(this.selectors.rowCheckboxes);
        checkboxes.forEach((cb) => {
            cb.addEventListener('change', () => {
                const id = cb.dataset.id;
                if (id) {
                    if (cb.checked) {
                        this.state.selectedRows.add(id);
                    }
                    else {
                        this.state.selectedRows.delete(id);
                    }
                }
                this.updateBulkActionsBar();
            });
        });
    }
    /**
     * Bind bulk action buttons
     */
    bindBulkActions() {
        const bulkActionButtons = document.querySelectorAll('[data-bulk-action]');
        bulkActionButtons.forEach((btn) => {
            btn.addEventListener('click', async () => {
                const action = btn.dataset.bulkAction;
                if (!action)
                    return;
                const ids = Array.from(this.state.selectedRows);
                if (ids.length === 0) {
                    alert('Please select items first');
                    return;
                }
                if (this.config.behaviors?.bulkActions) {
                    try {
                        await this.config.behaviors.bulkActions.execute(action, ids, this);
                        this.state.selectedRows.clear();
                        this.updateBulkActionsBar();
                    }
                    catch (error) {
                        console.error('Bulk action failed:', error);
                        this.showError('Bulk action failed');
                    }
                }
            });
        });
    }
    /**
     * Update bulk actions bar visibility
     */
    updateBulkActionsBar() {
        const bar = document.querySelector(this.selectors.bulkActionsBar);
        const countEl = document.querySelector(this.selectors.selectedCount);
        if (bar) {
            bar.classList.toggle('hidden', this.state.selectedRows.size === 0);
        }
        if (countEl) {
            countEl.textContent = String(this.state.selectedRows.size);
        }
    }
    /**
     * Bind dropdown toggles
     */
    bindDropdownToggles() {
        document.querySelectorAll('[data-dropdown-toggle]').forEach((toggle) => {
            toggle.addEventListener('click', (e) => {
                e.stopPropagation();
                const targetId = toggle.dataset.dropdownToggle;
                const target = document.getElementById(targetId || '');
                if (target) {
                    target.classList.toggle('hidden');
                }
            });
        });
        // Close dropdowns when clicking outside
        document.addEventListener('click', () => {
            document.querySelectorAll('[data-dropdown-toggle]').forEach((toggle) => {
                const targetId = toggle.dataset.dropdownToggle;
                const target = document.getElementById(targetId || '');
                if (target) {
                    target.classList.add('hidden');
                }
            });
        });
    }
    /**
     * Show error message
     */
    showError(message) {
        // Simple error display - can be enhanced
        console.error(message);
        alert(message);
    }
}
// Export for global usage
if (typeof window !== 'undefined') {
    window.DataGrid = DataGrid;
}
//# sourceMappingURL=core.js.map