import { ActionRenderer } from './actions.js';
import { CellRendererRegistry } from './renderers.js';
/**
 * DataGrid component
 * Behavior-agnostic data grid with pluggable behaviors
 */
export class DataGrid {
    constructor(config) {
        this.tableEl = null;
        this.searchTimeout = null;
        this.abortController = null;
        this.recordsById = {};
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
            selectedRows: new Set(),
            hiddenColumns: new Set()
        };
        // Initialize action renderer and cell renderer registry
        this.actionRenderer = new ActionRenderer({
            mode: this.config.actionRenderMode || 'dropdown', // Default to dropdown
            actionBasePath: this.config.actionBasePath || this.config.apiEndpoint
        });
        this.cellRendererRegistry = new CellRendererRegistry();
        // Register custom cell renderers if provided
        if (this.config.cellRenderers) {
            Object.entries(this.config.cellRenderers).forEach(([field, renderer]) => {
                this.cellRendererRegistry.register(field, renderer);
            });
        }
    }
    /**
     * Initialize the data grid
     */
    init() {
        console.log('[DataGrid] Initializing with config:', this.config);
        this.tableEl = document.querySelector(this.selectors.table);
        if (!this.tableEl) {
            console.error(`[DataGrid] Table element not found: ${this.selectors.table}`);
            return;
        }
        console.log('[DataGrid] Table element found:', this.tableEl);
        // Render bulk actions toolbar if configured
        if (this.config.bulkActions && this.config.bulkActions.length > 0) {
            const toolbar = this.actionRenderer.renderBulkActionsToolbar(this.config.bulkActions);
            // Insert before the table
            this.tableEl.parentElement?.insertBefore(toolbar, this.tableEl.parentElement.firstChild);
        }
        // Restore state from URL before binding
        this.restoreStateFromURL();
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
     * Restore DataGrid state from URL parameters
     */
    restoreStateFromURL() {
        const params = new URLSearchParams(window.location.search);
        // Restore search
        const search = params.get('search');
        if (search) {
            this.state.search = search;
            const searchInput = document.querySelector(this.selectors.searchInput);
            if (searchInput) {
                searchInput.value = search;
            }
        }
        // Restore page
        const page = params.get('page');
        if (page) {
            this.state.currentPage = parseInt(page, 10) || 1;
        }
        // Restore perPage
        const perPage = params.get('perPage');
        if (perPage) {
            this.state.perPage = parseInt(perPage, 10) || this.config.perPage || 10;
            const perPageSelect = document.querySelector(this.selectors.perPageSelect);
            if (perPageSelect) {
                perPageSelect.value = String(this.state.perPage);
            }
        }
        // Restore filters
        const filtersParam = params.get('filters');
        if (filtersParam) {
            try {
                this.state.filters = JSON.parse(filtersParam);
            }
            catch (e) {
                console.warn('[DataGrid] Failed to parse filters from URL:', e);
            }
        }
        // Restore sort
        const sortParam = params.get('sort');
        if (sortParam) {
            try {
                this.state.sort = JSON.parse(sortParam);
            }
            catch (e) {
                console.warn('[DataGrid] Failed to parse sort from URL:', e);
            }
        }
        // Restore hidden columns
        const hiddenColumnsParam = params.get('hiddenColumns');
        if (hiddenColumnsParam) {
            try {
                const hiddenArray = JSON.parse(hiddenColumnsParam);
                this.state.hiddenColumns = new Set(hiddenArray);
            }
            catch (e) {
                console.warn('[DataGrid] Failed to parse hidden columns from URL:', e);
            }
        }
        console.log('[DataGrid] State restored from URL:', this.state);
        // Apply restored state to UI after a short delay to ensure DOM is ready
        setTimeout(() => {
            this.applyRestoredState();
        }, 0);
    }
    /**
     * Apply restored state to UI elements
     */
    applyRestoredState() {
        // Apply filter values to inputs
        if (this.state.filters.length > 0) {
            this.state.filters.forEach(filter => {
                const input = document.querySelector(`[data-filter-column="${filter.column}"]`);
                if (input) {
                    input.value = String(filter.value);
                }
            });
        }
        // Apply column visibility
        if (this.state.hiddenColumns.size > 0) {
            const visibleColumns = this.config.columns
                .filter(col => !this.state.hiddenColumns.has(col.field))
                .map(col => col.field);
            this.updateColumnVisibility(visibleColumns, true); // Skip URL update during restoration
            // Update checkboxes in column visibility menu
            const menu = document.querySelector(this.selectors.columnToggleMenu);
            if (menu) {
                this.config.columns.forEach(col => {
                    const checkbox = menu.querySelector(`input[data-column="${col.field}"]`);
                    if (checkbox) {
                        checkbox.checked = !this.state.hiddenColumns.has(col.field);
                    }
                });
            }
        }
        // Apply sort indicators
        if (this.state.sort.length > 0) {
            this.updateSortIndicators();
        }
    }
    /**
     * Push current state to URL without reloading page
     */
    pushStateToURL() {
        const params = new URLSearchParams();
        // Add search
        if (this.state.search) {
            params.set('search', this.state.search);
        }
        // Add page (only if not page 1)
        if (this.state.currentPage > 1) {
            params.set('page', String(this.state.currentPage));
        }
        // Add perPage (only if different from default)
        if (this.state.perPage !== (this.config.perPage || 10)) {
            params.set('perPage', String(this.state.perPage));
        }
        // Add filters
        if (this.state.filters.length > 0) {
            params.set('filters', JSON.stringify(this.state.filters));
        }
        // Add sort
        if (this.state.sort.length > 0) {
            params.set('sort', JSON.stringify(this.state.sort));
        }
        // Add hidden columns
        if (this.state.hiddenColumns.size > 0) {
            params.set('hiddenColumns', JSON.stringify(Array.from(this.state.hiddenColumns)));
        }
        // Update URL without reload
        const newURL = params.toString()
            ? `${window.location.pathname}?${params.toString()}`
            : window.location.pathname;
        window.history.pushState({}, '', newURL);
        console.log('[DataGrid] URL updated:', newURL);
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
            console.log('[DataGrid] API Response:', data);
            console.log('[DataGrid] API Response data array:', data.data);
            console.log('[DataGrid] API Response total:', data.total, 'count:', data.count, '$meta:', data.$meta);
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
        const url = `${this.config.apiEndpoint}?${params.toString()}`;
        console.log(`[DataGrid] API URL: ${url}`);
        return url;
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
    updateColumnVisibility(visibleColumns, skipURLUpdate = false) {
        if (!this.tableEl)
            return;
        const visibleSet = new Set(visibleColumns);
        // Update hidden columns state
        this.state.hiddenColumns.clear();
        this.config.columns.forEach(col => {
            if (!visibleSet.has(col.field)) {
                this.state.hiddenColumns.add(col.field);
            }
        });
        // Update URL with new hidden columns state (unless during restoration)
        if (!skipURLUpdate) {
            this.pushStateToURL();
        }
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
        if (!tbody) {
            console.error('[DataGrid] tbody not found!');
            return;
        }
        tbody.innerHTML = '';
        const items = data.data || [];
        console.log(`[DataGrid] Rendering ${items.length} items`);
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
        // Clear and populate records by ID cache
        this.recordsById = {};
        items.forEach((item) => {
            if (item.id) {
                this.recordsById[item.id] = item;
            }
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
        // Apply custom row classes if provider is configured
        let rowClasses = ['hover:bg-gray-50'];
        if (this.config.rowClassProvider) {
            rowClasses = rowClasses.concat(this.config.rowClassProvider(item));
        }
        row.className = rowClasses.join(' ');
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
            // Priority: column render > custom renderer > default renderer
            if (col.render) {
                cell.innerHTML = col.render(value, item);
            }
            else if (this.cellRendererRegistry.has(col.field)) {
                const renderer = this.cellRendererRegistry.get(col.field);
                cell.innerHTML = renderer(value, item, col.field);
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
        const actionBase = this.config.actionBasePath || this.config.apiEndpoint;
        const actionsCell = document.createElement('td');
        actionsCell.className = 'px-6 py-4 whitespace-nowrap text-end text-sm font-medium';
        // Use custom row actions if provided, otherwise use default actions
        if (this.config.rowActions) {
            const actions = this.config.rowActions(item);
            actionsCell.innerHTML = this.actionRenderer.renderRowActions(item, actions);
            // Attach event listeners for each action button
            actions.forEach(action => {
                const actionId = this.sanitizeActionId(action.label);
                const button = actionsCell.querySelector(`[data-action-id="${actionId}"]`);
                if (button) {
                    button.addEventListener('click', async (e) => {
                        e.preventDefault();
                        try {
                            await action.action(item);
                        }
                        catch (error) {
                            console.error(`Action "${action.label}" failed:`, error);
                        }
                    });
                }
            });
        }
        else if (this.config.useDefaultActions !== false) {
            // Default actions (view, edit, delete)
            const defaultActions = [
                {
                    label: 'View',
                    icon: 'eye',
                    action: () => { window.location.href = `${actionBase}/${item.id}`; },
                    variant: 'secondary'
                },
                {
                    label: 'Edit',
                    icon: 'edit',
                    action: () => { window.location.href = `${actionBase}/${item.id}/edit`; },
                    variant: 'primary'
                },
                {
                    label: 'Delete',
                    icon: 'trash',
                    action: async () => { await this.handleDelete(item.id); },
                    variant: 'danger'
                }
            ];
            actionsCell.innerHTML = this.actionRenderer.renderRowActions(item, defaultActions);
            // Attach event listeners for each default action
            defaultActions.forEach(action => {
                const actionId = this.sanitizeActionId(action.label);
                const button = actionsCell.querySelector(`[data-action-id="${actionId}"]`);
                if (button) {
                    button.addEventListener('click', async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        try {
                            await action.action();
                        }
                        catch (error) {
                            console.error(`Action "${action.label}" failed:`, error);
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
    sanitizeActionId(label) {
        return label.toLowerCase().replace(/[^a-z0-9]/g, '-');
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
                    this.pushStateToURL();
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
        if (!input) {
            console.warn(`[DataGrid] Search input not found: ${this.selectors.searchInput}`);
            return;
        }
        console.log(`[DataGrid] Search input bound to: ${this.selectors.searchInput}`);
        const clearBtn = document.getElementById('clear-search-btn');
        // Toggle clear button visibility
        const toggleClearBtn = () => {
            if (clearBtn) {
                if (input.value.trim()) {
                    clearBtn.classList.remove('hidden');
                }
                else {
                    clearBtn.classList.add('hidden');
                }
            }
        };
        input.addEventListener('input', () => {
            toggleClearBtn();
            if (this.searchTimeout) {
                clearTimeout(this.searchTimeout);
            }
            this.searchTimeout = window.setTimeout(async () => {
                console.log(`[DataGrid] Search triggered: "${input.value}"`);
                this.state.search = input.value;
                this.pushStateToURL();
                if (this.config.behaviors?.search) {
                    await this.config.behaviors.search.onSearch(input.value, this);
                }
                else {
                    this.resetPagination();
                    await this.refresh();
                }
            }, this.config.searchDelay);
        });
        // Clear button handler
        if (clearBtn) {
            clearBtn.addEventListener('click', async () => {
                input.value = '';
                input.focus();
                toggleClearBtn();
                // Trigger search with empty value
                this.state.search = '';
                this.pushStateToURL();
                if (this.config.behaviors?.search) {
                    await this.config.behaviors.search.onSearch('', this);
                }
                else {
                    this.resetPagination();
                    await this.refresh();
                }
            });
        }
        // Initial toggle on page load
        toggleClearBtn();
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
            this.pushStateToURL();
            await this.refresh();
        });
    }
    /**
     * Bind filter inputs
     */
    bindFilterInputs() {
        const filterInputs = document.querySelectorAll(this.selectors.filterRow);
        filterInputs.forEach((input) => {
            // Handler function for both input and change events
            const handleFilterChange = async () => {
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
                this.pushStateToURL();
                if (this.config.behaviors?.filter) {
                    await this.config.behaviors.filter.onFilterChange(column, value, this);
                }
                else {
                    this.resetPagination();
                    await this.refresh();
                }
            };
            // Bind both input (for text inputs) and change (for selects) events
            input.addEventListener('input', handleFilterChange);
            input.addEventListener('change', handleFilterChange);
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
                this.pushStateToURL();
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
                const actionId = btn.dataset.bulkAction;
                if (!actionId)
                    return;
                const ids = Array.from(this.state.selectedRows);
                if (ids.length === 0) {
                    alert('Please select items first');
                    return;
                }
                // Try config.bulkActions first (new system)
                if (this.config.bulkActions) {
                    const bulkActionConfig = this.config.bulkActions.find(ba => ba.id === actionId);
                    if (bulkActionConfig) {
                        try {
                            await this.actionRenderer.executeBulkAction(bulkActionConfig, ids);
                            this.state.selectedRows.clear();
                            this.updateBulkActionsBar();
                            await this.refresh();
                        }
                        catch (error) {
                            console.error('Bulk action failed:', error);
                            this.showError('Bulk action failed');
                        }
                        return;
                    }
                }
                // Fall back to behaviors.bulkActions (old system)
                if (this.config.behaviors?.bulkActions) {
                    try {
                        await this.config.behaviors.bulkActions.execute(actionId, ids, this);
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
        // Bind clear selection button
        const clearBtn = document.getElementById('clear-selection-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.state.selectedRows.clear();
                this.updateBulkActionsBar();
                // Uncheck all checkboxes
                const checkboxes = document.querySelectorAll('.table-checkbox');
                checkboxes.forEach(cb => cb.checked = false);
                const selectAll = document.querySelector(this.selectors.selectAllCheckbox);
                if (selectAll)
                    selectAll.checked = false;
            });
        }
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
     * Position dropdown menu intelligently based on available space
     */
    positionDropdownMenu(trigger, menu) {
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
        }
        else {
            // Open downward (default)
            menu.style.top = `${triggerRect.bottom + 8}px`;
            menu.style.bottom = 'auto';
        }
    }
    /**
     * Bind dropdown toggles
     */
    bindDropdownToggles() {
        // Existing dropdown toggles (column visibility, export, etc.)
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
        // Action dropdown menus (row actions)
        document.addEventListener('click', (e) => {
            const trigger = e.target.closest('[data-dropdown-trigger]');
            if (trigger) {
                e.stopPropagation();
                const dropdown = trigger.closest('[data-dropdown]');
                const menu = dropdown?.querySelector('.actions-menu');
                // Close other action dropdowns
                document.querySelectorAll('.actions-menu').forEach(m => {
                    if (m !== menu)
                        m.classList.add('hidden');
                });
                // Toggle this dropdown
                const isOpening = menu?.classList.contains('hidden');
                menu?.classList.toggle('hidden');
                trigger.setAttribute('aria-expanded', isOpening ? 'true' : 'false');
                // Position the dropdown intelligently (only when opening)
                if (isOpening && menu) {
                    this.positionDropdownMenu(trigger, menu);
                }
            }
            else {
                // Close all action dropdowns when clicking outside
                document.querySelectorAll('.actions-menu').forEach(m => m.classList.add('hidden'));
                // Also close existing dropdowns
                document.querySelectorAll('[data-dropdown-toggle]').forEach((toggle) => {
                    const targetId = toggle.dataset.dropdownToggle;
                    const target = document.getElementById(targetId || '');
                    if (target) {
                        target.classList.add('hidden');
                    }
                });
            }
        });
        // ESC key closes all dropdowns
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.actions-menu').forEach(m => {
                    m.classList.add('hidden');
                    const trigger = m.closest('[data-dropdown]')?.querySelector('[data-dropdown-trigger]');
                    if (trigger)
                        trigger.setAttribute('aria-expanded', 'false');
                });
            }
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