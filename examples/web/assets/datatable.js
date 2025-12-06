/**
 * EnhancedDataTable - Pluggable DataTable component for go-crud backend
 *
 * Features:
 * - Server-side pagination, filtering, sorting via go-crud API
 * - Client-side column visibility toggle
 * - Export (CSV, Excel, PDF, Print, Copy)
 * - Pluggable strategy pattern for custom implementations
 *
 * Usage:
 * ```js
 * const table = new EnhancedDataTable({
 *   tableId: 'users-datatable',
 *   apiEndpoint: '/admin/crud/users',
 *   columns: ['username', 'email', 'role', 'status', 'created_at']
 * });
 * table.init();
 * ```
 */

class EnhancedDataTable {
  constructor(options = {}) {
    this.options = {
      tableId: options.tableId || 'datatable',
      apiEndpoint: options.apiEndpoint,
      columns: options.columns || [],
      perPage: options.perPage || 10,
      searchDelay: options.searchDelay || 300,

      // Strategy implementations
      strategies: {
        search: options.searchStrategy || new CrudSearchStrategy(),
        filter: options.filterStrategy || new CrudFilterStrategy(),
        sort: options.sortStrategy || new CrudSortStrategy(),
        pagination: options.paginationStrategy || new CrudPaginationStrategy(),
        export: options.exportStrategy || new ClientExportStrategy()
      },

      // UI selectors
      selectors: {
        table: `#${options.tableId}`,
        searchInput: options.searchInput || '#table-search',
        perPageSelect: options.perPageSelect || '#table-per-page',
        filterRow: options.filterRow || '[data-filter-column]',
        columnToggleBtn: options.columnToggleBtn || '#column-toggle-btn',
        columnToggleMenu: options.columnToggleMenu || '#column-toggle-menu',
        exportBtn: options.exportBtn || '#export-btn',
        exportMenu: options.exportMenu || '#export-menu',
        paginationContainer: options.paginationContainer || '#table-pagination',
        tableInfoStart: options.tableInfoStart || '#table-info-start',
        tableInfoEnd: options.tableInfoEnd || '#table-info-end',
        tableInfoTotal: options.tableInfoTotal || '#table-info-total',
        selectAllCheckbox: options.selectAllCheckbox || '#table-checkbox-all',
        rowCheckboxes: options.rowCheckboxes || '.table-checkbox',
        bulkActionsBar: options.bulkActionsBar || '#bulk-actions-bar',
        selectedCount: options.selectedCount || '#selected-count'
      }
    };

    this.state = {
      currentPage: 1,
      perPage: this.options.perPage,
      totalRows: 0,
      search: '',
      filters: {},
      sort: [],
      hiddenColumns: new Set(),
      selectedRows: new Set()
    };

    this.tableEl = null;
    this.searchTimeout = null;
    this.abortController = null;
  }

  /**
   * Initialize the datatable
   */
  init() {
    this.tableEl = document.querySelector(this.options.selectors.table);
    if (!this.tableEl) {
      console.error(`Table element not found: ${this.options.selectors.table}`);
      return;
    }

    this.loadHiddenColumnsState();
    this.bindSearchInput();
    this.bindPerPageSelect();
    this.bindFilterInputs();
    this.bindColumnVisibility();
    this.bindExportButtons();
    this.bindSorting();
    this.bindSelection();
    this.bindDropdownToggles();

    // Initial data load
    this.fetchData();
  }

  /**
   * Fetch data from backend using current state
   */
  async fetchData() {
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
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Request aborted');
        return;
      }
      console.error('Error fetching data:', error);
      this.showError('Failed to load data');
    }
  }

  /**
   * Build API URL with query parameters using go-crud format
   */
  buildApiUrl() {
    const params = new URLSearchParams();

    // Pagination (go-crud format: ?limit=10&offset=20)
    const pagination = this.options.strategies.pagination.buildParams(this.state);
    Object.entries(pagination).forEach(([key, value]) => {
      params.append(key, value);
    });

    // Search (go-crud format: ?field__ilike=value%)
    if (this.state.search) {
      const searchParams = this.options.strategies.search.buildParams(
        this.state.search,
        this.options.columns
      );
      Object.entries(searchParams).forEach(([key, value]) => {
        params.append(key, value);
      });
    }

    // Filters (go-crud format: ?field__operator=value)
    const filterParams = this.options.strategies.filter.buildParams(this.state.filters);
    Object.entries(filterParams).forEach(([key, value]) => {
      params.append(key, value);
    });

    // Sorting (go-crud format: ?order=field1 asc,field2 desc)
    if (this.state.sort.length > 0) {
      const sortParam = this.options.strategies.sort.buildParams(this.state.sort);
      if (sortParam) {
        params.append('order', sortParam);
      }
    }

    return `${this.options.apiEndpoint}?${params.toString()}`;
  }

  /**
   * Render data into table
   */
  renderData(data) {
    const tbody = this.tableEl.querySelector('tbody');
    if (!tbody) return;

    // Clear existing rows
    tbody.innerHTML = '';

    const items = data.data || data.items || data;
    this.state.totalRows = data.total || data.count || items.length;

    if (items.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="${this.options.columns.length + 2}" class="px-6 py-8 text-center text-gray-500">
            No results found
          </td>
        </tr>
      `;
      return;
    }

    items.forEach(item => {
      const row = this.createTableRow(item);
      tbody.appendChild(row);
    });

    // Reapply hidden columns
    this.applyHiddenColumns();

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
    this.options.columns.forEach((col, index) => {
      const cell = document.createElement('td');
      cell.className = 'px-6 py-4 whitespace-nowrap text-sm text-gray-800';
      cell.setAttribute('data-column', index + 1);

      const value = item[col] || '-';

      // Special rendering for certain columns
      if (col === 'status') {
        cell.innerHTML = `<span class="status-badge status-${value}">${value}</span>`;
      } else if (col === 'email') {
        cell.innerHTML = `<span class="font-medium">${value}</span>`;
      } else if (col.includes('_at') && value !== '-') {
        cell.textContent = new Date(value).toLocaleDateString();
      } else {
        cell.textContent = value;
      }

      row.appendChild(cell);
    });

    // Actions cell
    const actionsCell = document.createElement('td');
    actionsCell.className = 'px-6 py-4 whitespace-nowrap text-end text-sm font-medium';
    actionsCell.innerHTML = `
      <div class="flex justify-end gap-2">
        <a href="${this.options.apiEndpoint}/${item.id}"
           class="text-sm font-semibold text-blue-600 hover:text-blue-800">
          View
        </a>
        <a href="${this.options.apiEndpoint}/${item.id}/edit"
           class="text-sm font-semibold text-blue-600 hover:text-blue-800">
          Edit
        </a>
        <button type="button"
                onclick="if(confirm('Delete?'))fetch('${this.options.apiEndpoint}/${item.id}',{method:'DELETE'}).then(()=>location.reload())"
                class="text-sm font-semibold text-red-600 hover:text-red-800">
          Delete
        </button>
      </div>
    `;
    row.appendChild(actionsCell);

    return row;
  }

  /**
   * Update pagination UI
   */
  updatePaginationUI(data) {
    const total = data.total || data.count || this.state.totalRows;
    const offset = this.state.perPage * (this.state.currentPage - 1);
    const start = total === 0 ? 0 : offset + 1;
    const end = Math.min(offset + this.state.perPage, total);

    const startEl = document.querySelector(this.options.selectors.tableInfoStart);
    const endEl = document.querySelector(this.options.selectors.tableInfoEnd);
    const totalEl = document.querySelector(this.options.selectors.tableInfoTotal);

    if (startEl) startEl.textContent = start;
    if (endEl) endEl.textContent = end;
    if (totalEl) totalEl.textContent = total;

    this.renderPaginationButtons(total);
  }

  /**
   * Render pagination buttons
   */
  renderPaginationButtons(total) {
    const container = document.querySelector(this.options.selectors.paginationContainer);
    if (!container) return;

    container.innerHTML = '';

    const totalPages = Math.ceil(total / this.state.perPage);
    if (totalPages <= 1) return;

    // Previous button
    const prevBtn = this.createPaginationButton('prev', this.state.currentPage > 1);
    prevBtn.onclick = () => this.goToPage(this.state.currentPage - 1);
    container.appendChild(prevBtn);

    // Page numbers
    const maxVisible = 5;
    let startPage = Math.max(1, this.state.currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);

    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      const pageBtn = this.createPaginationButton(
        i.toString(),
        true,
        i === this.state.currentPage
      );
      pageBtn.onclick = () => this.goToPage(i);
      container.appendChild(pageBtn);
    }

    // Next button
    const nextBtn = this.createPaginationButton('next', this.state.currentPage < totalPages);
    nextBtn.onclick = () => this.goToPage(this.state.currentPage + 1);
    container.appendChild(nextBtn);
  }

  /**
   * Create pagination button element
   */
  createPaginationButton(type, enabled, active = false) {
    const btn = document.createElement('button');
    btn.type = 'button';

    if (type === 'prev' || type === 'next') {
      btn.className = 'min-h-[38px] min-w-[38px] py-2 px-2.5 inline-flex justify-center items-center text-sm rounded-lg border border-transparent text-gray-800 hover:bg-gray-100 disabled:opacity-50 disabled:pointer-events-none';
      btn.disabled = !enabled;
      btn.innerHTML = type === 'prev'
        ? '<svg class="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"/></svg>'
        : '<svg class="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>';
    } else {
      btn.className = `min-h-[38px] min-w-[38px] flex justify-center items-center border text-sm py-2 px-3 rounded-lg ${
        active
          ? 'border-blue-600 text-blue-600 bg-blue-50'
          : 'border-gray-200 text-gray-800 hover:bg-gray-100'
      }`;
      btn.textContent = type;
    }

    return btn;
  }

  /**
   * Navigate to page
   */
  goToPage(page) {
    if (page < 1) return;
    this.state.currentPage = page;
    this.fetchData();
  }

  /**
   * Bind search input
   */
  bindSearchInput() {
    const input = document.querySelector(this.options.selectors.searchInput);
    if (!input) return;

    input.addEventListener('input', (e) => {
      clearTimeout(this.searchTimeout);
      this.searchTimeout = setTimeout(() => {
        this.state.search = e.target.value;
        this.state.currentPage = 1;
        this.fetchData();
      }, this.options.searchDelay);
    });
  }

  /**
   * Bind per-page selector
   */
  bindPerPageSelect() {
    const select = document.querySelector(this.options.selectors.perPageSelect);
    if (!select) return;

    select.addEventListener('change', (e) => {
      this.state.perPage = parseInt(e.target.value);
      this.state.currentPage = 1;
      this.fetchData();
    });
  }

  /**
   * Bind filter inputs
   */
  bindFilterInputs() {
    const filters = document.querySelectorAll(this.options.selectors.filterRow);

    filters.forEach(input => {
      const column = input.dataset.filterColumn;
      const columnName = this.options.columns[parseInt(column) - 1];
      const eventType = input.tagName === 'SELECT' ? 'change' : 'input';

      input.addEventListener(eventType, (e) => {
        const value = e.target.value.trim();

        if (value === '') {
          delete this.state.filters[columnName];
        } else {
          // Determine operator based on column type/input
          let operator = 'ilike'; // Default for text search
          if (input.tagName === 'SELECT') {
            operator = 'eq';
          }

          this.state.filters[columnName] = { operator, value };
        }

        this.state.currentPage = 1;
        this.fetchData();
      });
    });
  }

  /**
   * Bind column visibility controls
   */
  bindColumnVisibility() {
    const toggles = document.querySelectorAll('.column-toggle');

    toggles.forEach(checkbox => {
      const colIndex = parseInt(checkbox.value);

      checkbox.addEventListener('change', (e) => {
        if (e.target.checked) {
          this.state.hiddenColumns.delete(colIndex);
        } else {
          this.state.hiddenColumns.add(colIndex);
        }

        this.saveHiddenColumnsState();
        this.applyHiddenColumns();
      });
    });
  }

  /**
   * Apply hidden columns to table
   */
  applyHiddenColumns() {
    this.tableEl.querySelectorAll('tr').forEach(row => {
      row.querySelectorAll('th[data-column], td[data-column]').forEach(cell => {
        const colIndex = parseInt(cell.dataset.column);
        cell.style.display = this.state.hiddenColumns.has(colIndex) ? 'none' : '';
      });
    });
  }

  /**
   * Save hidden columns state to localStorage
   */
  saveHiddenColumnsState() {
    localStorage.setItem(`${this.options.tableId}_hiddenColumns`, JSON.stringify([...this.state.hiddenColumns]));
  }

  /**
   * Load hidden columns state from localStorage
   */
  loadHiddenColumnsState() {
    const saved = localStorage.getItem(`${this.options.tableId}_hiddenColumns`);
    if (saved) {
      this.state.hiddenColumns = new Set(JSON.parse(saved));

      // Update checkboxes
      document.querySelectorAll('.column-toggle').forEach(checkbox => {
        const colIndex = parseInt(checkbox.value);
        checkbox.checked = !this.state.hiddenColumns.has(colIndex);
      });
    }
  }

  /**
   * Bind export buttons
   */
  bindExportButtons() {
    window.tableExport = {
      copy: () => this.options.strategies.export.copy(this.tableEl),
      csv: () => this.options.strategies.export.csv(this.tableEl, 'export.csv'),
      excel: () => this.options.strategies.export.excel(this.tableEl, 'export.xlsx'),
      pdf: () => this.options.strategies.export.pdf(this.tableEl, 'export.pdf'),
      print: () => this.options.strategies.export.print(this.tableEl)
    };
  }

  /**
   * Bind sorting on column headers
   */
  bindSorting() {
    const headers = this.tableEl.querySelectorAll('thead th[data-sortable]');

    headers.forEach(header => {
      const column = header.dataset.sortable;

      header.style.cursor = 'pointer';
      header.addEventListener('click', () => {
        const existingSort = this.state.sort.find(s => s.column === column);

        if (!existingSort) {
          this.state.sort = [{ column, direction: 'asc' }];
        } else if (existingSort.direction === 'asc') {
          existingSort.direction = 'desc';
        } else {
          this.state.sort = this.state.sort.filter(s => s.column !== column);
        }

        this.fetchData();
        this.updateSortIndicators();
      });
    });
  }

  /**
   * Update sort indicators in headers
   */
  updateSortIndicators() {
    const headers = this.tableEl.querySelectorAll('thead th[data-sortable]');

    headers.forEach(header => {
      const column = header.dataset.sortable;
      const sort = this.state.sort.find(s => s.column === column);

      const indicator = header.querySelector('.sort-indicator');
      if (indicator) indicator.remove();

      if (sort) {
        const arrow = document.createElement('span');
        arrow.className = 'sort-indicator ml-1';
        arrow.textContent = sort.direction === 'asc' ? '↑' : '↓';
        header.appendChild(arrow);
      }
    });
  }

  /**
   * Bind selection checkboxes
   */
  bindSelection() {
    const selectAll = document.querySelector(this.options.selectors.selectAllCheckbox);

    if (selectAll) {
      selectAll.addEventListener('change', (e) => {
        const checkboxes = this.tableEl.querySelectorAll(this.options.selectors.rowCheckboxes);
        checkboxes.forEach(cb => {
          cb.checked = e.target.checked;
          if (e.target.checked) {
            this.state.selectedRows.add(cb.dataset.id);
          } else {
            this.state.selectedRows.delete(cb.dataset.id);
          }
        });
        this.updateBulkActionsBar();
      });
    }

    this.updateSelectionBindings();
  }

  /**
   * Update selection event bindings (after re-render)
   */
  updateSelectionBindings() {
    const checkboxes = this.tableEl.querySelectorAll(this.options.selectors.rowCheckboxes);

    checkboxes.forEach(cb => {
      cb.addEventListener('change', (e) => {
        if (e.target.checked) {
          this.state.selectedRows.add(cb.dataset.id);
        } else {
          this.state.selectedRows.delete(cb.dataset.id);
        }
        this.updateBulkActionsBar();
      });
    });
  }

  /**
   * Update bulk actions bar
   */
  updateBulkActionsBar() {
    const bar = document.querySelector(this.options.selectors.bulkActionsBar);
    const count = document.querySelector(this.options.selectors.selectedCount);

    if (bar && count) {
      if (this.state.selectedRows.size > 0) {
        bar.classList.remove('hidden');
        count.textContent = this.state.selectedRows.size;
      } else {
        bar.classList.add('hidden');
      }
    }
  }

  /**
   * Bind dropdown toggles
   */
  bindDropdownToggles() {
    // Column toggle dropdown
    this.bindDropdown(
      this.options.selectors.columnToggleBtn,
      this.options.selectors.columnToggleMenu
    );

    // Export dropdown
    this.bindDropdown(
      this.options.selectors.exportBtn,
      this.options.selectors.exportMenu
    );
  }

  /**
   * Bind dropdown toggle behavior
   */
  bindDropdown(btnSelector, menuSelector) {
    const btn = document.querySelector(btnSelector);
    const menu = document.querySelector(menuSelector);

    if (!btn || !menu) return;

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      menu.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
      if (!btn.contains(e.target) && !menu.contains(e.target)) {
        menu.classList.add('hidden');
      }
    });
  }

  /**
   * Show error message
   */
  showError(message) {
    const tbody = this.tableEl.querySelector('tbody');
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="${this.options.columns.length + 2}" class="px-6 py-8 text-center text-red-600">
            ${message}
          </td>
        </tr>
      `;
    }
  }
}

// ============================================
// STRATEGY IMPLEMENTATIONS
// ============================================

/**
 * go-crud API Search Strategy
 * Builds search params in go-crud format: ?field__ilike=value%
 */
class CrudSearchStrategy {
  buildParams(searchTerm, columns) {
    const params = {};

    // Search across all text columns using OR operator
    // go-crud format: ?field__or=value1,value2
    columns.forEach(col => {
      if (!col.includes('_at') && !col.includes('id')) {
        params[`${col}__ilike`] = `%${searchTerm}%`;
      }
    });

    return params;
  }
}

/**
 * go-crud API Filter Strategy
 * Builds filter params in go-crud format: ?field__operator=value
 */
class CrudFilterStrategy {
  buildParams(filters) {
    const params = {};

    Object.entries(filters).forEach(([field, filter]) => {
      const key = `${field}__${filter.operator}`;
      params[key] = filter.value;
    });

    return params;
  }
}

/**
 * go-crud API Sort Strategy
 * Builds sort param in go-crud format: ?order=field1 asc,field2 desc
 */
class CrudSortStrategy {
  buildParams(sortArray) {
    if (sortArray.length === 0) return null;

    return sortArray
      .map(s => `${s.column} ${s.direction}`)
      .join(',');
  }
}

/**
 * go-crud API Pagination Strategy
 * Builds pagination params in go-crud format: ?limit=10&offset=20
 */
class CrudPaginationStrategy {
  buildParams(state) {
    return {
      limit: state.perPage,
      offset: (state.currentPage - 1) * state.perPage
    };
  }
}

/**
 * Client-side Export Strategy
 * Uses browser APIs and libraries for export
 */
class ClientExportStrategy {
  getCurrentData(tableEl) {
    const rows = [];

    // Get headers
    const headerRow = tableEl.querySelector('thead tr:first-child');
    const headers = [];
    headerRow.querySelectorAll('th').forEach((th, index) => {
      if (index > 0 && index < headerRow.children.length - 1 && th.style.display !== 'none') {
        headers.push(th.textContent.trim());
      }
    });
    rows.push(headers);

    // Get data rows
    tableEl.querySelectorAll('tbody tr').forEach(tr => {
      if (tr.style.display !== 'none') {
        const row = [];
        tr.querySelectorAll('td').forEach((td, index) => {
          if (index > 0 && index < tr.children.length - 1 && td.style.display !== 'none') {
            row.push(td.textContent.trim());
          }
        });
        if (row.length > 0) rows.push(row);
      }
    });

    return rows;
  }

  copy(tableEl) {
    const data = this.getCurrentData(tableEl);
    const text = data.map(row => row.join('\t')).join('\n');

    navigator.clipboard.writeText(text).then(() => {
      alert('Table data copied to clipboard');
    }).catch(() => {
      alert('Failed to copy to clipboard');
    });
  }

  csv(tableEl, filename) {
    const data = this.getCurrentData(tableEl);
    const csv = data.map(row =>
      row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')
    ).join('\n');

    this.download(csv, filename, 'text/csv');
  }

  excel(tableEl, filename) {
    if (!window.XLSX) {
      alert('Excel export library not loaded');
      return;
    }

    const data = this.getCurrentData(tableEl);
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    XLSX.writeFile(wb, filename);
  }

  pdf(tableEl, filename) {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      alert('PDF export library not loaded');
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const data = this.getCurrentData(tableEl);

    doc.autoTable({
      head: [data[0]],
      body: data.slice(1),
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] }
    });

    doc.save(filename);
  }

  print(tableEl) {
    window.print();
  }

  download(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}

// Export for use in modules or global scope
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { EnhancedDataTable, CrudSearchStrategy, CrudFilterStrategy, CrudSortStrategy, CrudPaginationStrategy, ClientExportStrategy };
}
