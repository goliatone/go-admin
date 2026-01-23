/**
 * Import Modal Component
 *
 * A reusable modal component for bulk file imports with drag & drop support,
 * file preview, results display with summary cards, fullscreen toggle,
 * and result filtering.
 *
 * Usage:
 *   import { ImportModal } from '/admin/assets/components/import-modal.js';
 *
 *   const importModal = new ImportModal({
 *     modalId: 'import-users-modal',
 *     endpoint: '/admin/api/users/import',
 *     onSuccess: (summary) => grid.refresh(),
 *     notifier: window.toastManager
 *   });
 *
 *   // Open modal
 *   document.getElementById('import-btn')?.addEventListener('click', () => importModal.open());
 */

type ImportModalNotifier = {
  success: (message: string) => void;
  error: (message: string) => void;
};

type ImportModalOptions = {
  modalId?: string;
  endpoint?: string;
  onSuccess?: (summary: Record<string, number>) => void;
  notifier?: ImportModalNotifier;
  resourceName?: string;
};

/**
 * Format file size in human-readable format
 * @param bytes - File size in bytes
 * @returns Formatted size string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Import Modal class for handling bulk file imports
 */
export class ImportModal {
  modalId: string;
  endpoint: string;
  onSuccess: (summary: Record<string, number>) => void;
  notifier: ImportModalNotifier;
  resourceName: string;
  elements: Record<string, HTMLElement | null>;
  isFullscreen: boolean;
  currentFilter: string;
  resultItems: any[];

  /**
   * @param options - Configuration options
   * @param options.modalId - ID of the modal element
   * @param options.endpoint - API endpoint for file upload
   * @param options.onSuccess - Callback when import succeeds (receives summary)
   * @param options.notifier - Toast notification manager (with success/error methods)
   * @param options.resourceName - Name of resource being imported (default: 'items')
   */
  constructor(options: ImportModalOptions = {}) {
    this.modalId = options.modalId || 'import-modal';
    this.endpoint = options.endpoint || '/api/import';
    this.onSuccess = options.onSuccess || (() => {});
    this.notifier = options.notifier || { success: console.log, error: console.error };
    this.resourceName = options.resourceName || 'items';

    this.elements = {};
    this.isFullscreen = false;
    this.currentFilter = 'all';
    this.resultItems = [];
    this.bindElements();
    this.bindEvents();
  }

  /**
   * Bind DOM elements
   */
  bindElements() {
    // Extract prefix from modal ID (e.g., 'import-users-modal' -> 'import-users')
    const prefix = this.modalId.replace('-modal', '');

    this.elements = {
      modal: document.getElementById(this.modalId),
      container: document.getElementById(`${prefix}-container`),
      backdrop: document.getElementById(`${prefix}-backdrop`),
      closeBtn: document.getElementById(`${prefix}-close`),
      cancelBtn: document.getElementById(`${prefix}-cancel`),
      fullscreenBtn: document.getElementById(`${prefix}-fullscreen`),
      expandIcon: document.getElementById(`${prefix}-expand-icon`),
      collapseIcon: document.getElementById(`${prefix}-collapse-icon`),
      form: document.getElementById(`${prefix}-form`),
      fileInput: document.getElementById(`${prefix}-file`),
      submitBtn: document.getElementById(`${prefix}-submit`),
      anotherBtn: document.getElementById(`${prefix}-another`),
      spinner: document.getElementById(`${prefix}-spinner`),
      results: document.getElementById(`${prefix}-results`),
      error: document.getElementById(`${prefix}-error`),
      errorBanner: document.getElementById(`${prefix}-error-banner`),
      resultsBody: document.getElementById(`${prefix}-results-body`),
      tableScroll: document.getElementById(`${prefix}-table-scroll`),
      dropzone: document.getElementById(`${prefix}-dropzone`),
      dropzoneEmpty: document.getElementById(`${prefix}-dropzone-empty`),
      dropzoneSelected: document.getElementById(`${prefix}-dropzone-selected`),
      fileName: document.getElementById(`${prefix}-file-name`),
      fileSize: document.getElementById(`${prefix}-file-size`),
      fileRemove: document.getElementById(`${prefix}-file-remove`),
      statProcessed: document.getElementById(`${prefix}-stat-processed`),
      statSucceeded: document.getElementById(`${prefix}-stat-succeeded`),
      statFailed: document.getElementById(`${prefix}-stat-failed`),
      visibleCount: document.getElementById(`${prefix}-visible-count`),
      totalCount: document.getElementById(`${prefix}-total-count`)
    };
  }

  /**
   * Bind event listeners
   */
  bindEvents() {
    const { modal, backdrop, closeBtn, cancelBtn, fileInput, fileRemove, anotherBtn, submitBtn, fullscreenBtn } = this.elements;

    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.close());
    }
    if (backdrop) {
      backdrop.addEventListener('click', () => this.close());
    }
    if (fileInput) {
      fileInput.addEventListener('change', () => this.updateFilePreview());
    }
    if (fileRemove) {
      fileRemove.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const file = this.elements.fileInput as HTMLInputElement | null;
        if (file) file.value = '';
        this.updateFilePreview();
      });
    }
    if (anotherBtn) {
      anotherBtn.addEventListener('click', () => this.reset());
    }
    if (submitBtn) {
      submitBtn.addEventListener('click', (e) => this.handleSubmit(e));
    }
    if (fullscreenBtn) {
      fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
    }

    // Drag and drop
    this.bindDragAndDrop();

    // Filter buttons
    this.bindFilterButtons();

    // Escape key
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && modal && !modal.classList.contains('hidden')) {
        if (this.isFullscreen) {
          this.toggleFullscreen();
        } else {
          this.close();
        }
      }
    });
  }

  /**
   * Bind filter button events
   */
  bindFilterButtons() {
    const { modal } = this.elements;
    if (!modal) return;

    const filterBtns = modal.querySelectorAll('.import-filter-btn');
    filterBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const filter = btn.getAttribute('data-filter') || 'all';
        this.setFilter(filter);
        // Update active state
        filterBtns.forEach((b) => {
          b.classList.toggle('active', b === btn);
          b.classList.toggle('bg-gray-100', b === btn);
          b.classList.toggle('text-gray-700', b === btn);
          b.classList.toggle('text-gray-500', b !== btn);
        });
      });
    });
  }

  /**
   * Set the current filter and update display
   * @param filter - 'all', 'succeeded', or 'failed'
   */
  setFilter(filter: string) {
    this.currentFilter = filter;
    this.applyFilter();
  }

  /**
   * Apply the current filter to results
   */
  applyFilter() {
    const { resultsBody, visibleCount } = this.elements;
    if (!resultsBody) return;

    const rows = resultsBody.querySelectorAll('tr');
    let visible = 0;

    rows.forEach((row) => {
      const status = row.getAttribute('data-status');
      let show = true;

      if (this.currentFilter === 'succeeded') {
        show = status === 'succeeded';
      } else if (this.currentFilter === 'failed') {
        show = status === 'failed';
      }

      (row as HTMLElement).style.display = show ? '' : 'none';
      if (show) visible++;
    });

    if (visibleCount) {
      visibleCount.textContent = String(visible);
    }
  }

  /**
   * Toggle fullscreen mode
   */
  toggleFullscreen() {
    const { container, expandIcon, collapseIcon, tableScroll } = this.elements;
    if (!container) return;

    this.isFullscreen = !this.isFullscreen;

    if (this.isFullscreen) {
      // Enter fullscreen
      container.classList.remove('max-w-3xl', 'max-h-[90vh]');
      container.classList.add('w-full', 'h-full', 'm-0');
      (container as HTMLElement).style.maxWidth = 'none';
      (container as HTMLElement).style.maxHeight = 'none';
      (container as HTMLElement).style.borderRadius = '0';
      if (expandIcon) expandIcon.classList.add('hidden');
      if (collapseIcon) collapseIcon.classList.remove('hidden');
      if (tableScroll) (tableScroll as HTMLElement).style.maxHeight = '60vh';
    } else {
      // Exit fullscreen - keep w-full since it's part of the original classes
      container.classList.add('w-full', 'max-w-3xl', 'max-h-[90vh]');
      container.classList.remove('h-full', 'm-0');
      (container as HTMLElement).style.maxWidth = '';
      (container as HTMLElement).style.maxHeight = '';
      (container as HTMLElement).style.borderRadius = '';
      if (expandIcon) expandIcon.classList.remove('hidden');
      if (collapseIcon) collapseIcon.classList.add('hidden');
      if (tableScroll) (tableScroll as HTMLElement).style.maxHeight = '40vh';
    }
  }

  /**
   * Bind drag and drop events
   */
  bindDragAndDrop() {
    const { dropzone } = this.elements;
    const fileInput = this.elements.fileInput as HTMLInputElement | null;
    if (!dropzone) return;

    ['dragenter', 'dragover'].forEach((eventName) => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.add('border-blue-400', 'bg-blue-50');
      });
    });

    ['dragleave', 'drop'].forEach((eventName) => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove('border-blue-400', 'bg-blue-50');
      });
    });

    dropzone.addEventListener('drop', (e) => {
      const dtEvent = e as DragEvent;
      const files = dtEvent.dataTransfer?.files;
      if (files && files.length > 0 && fileInput) {
        const dt = new DataTransfer();
        dt.items.add(files[0]);
        fileInput.files = dt.files;
        this.updateFilePreview();
      }
    });
  }

  /**
   * Update the file preview display
   */
  updateFilePreview() {
    const fileInput = this.elements.fileInput as HTMLInputElement | null;
    const { dropzoneEmpty, dropzoneSelected, fileName, fileSize, submitBtn } = this.elements;
    const file = fileInput?.files?.[0] ?? null;
    const hasFile = Boolean(file);

    if (hasFile) {
      if (file && fileName) fileName.textContent = file.name;
      if (file && fileSize) fileSize.textContent = formatFileSize(file.size);
      if (dropzoneEmpty) dropzoneEmpty.classList.add('hidden');
      if (dropzoneSelected) dropzoneSelected.classList.remove('hidden');
      if (submitBtn) (submitBtn as HTMLButtonElement).disabled = false;
    } else {
      if (dropzoneEmpty) dropzoneEmpty.classList.remove('hidden');
      if (dropzoneSelected) dropzoneSelected.classList.add('hidden');
      if (submitBtn) (submitBtn as HTMLButtonElement).disabled = true;
    }
  }

  /**
   * Reset the modal to initial state
   */
  reset() {
    const { fileInput, results, form, errorBanner, error, resultsBody, submitBtn, anotherBtn, statProcessed, statSucceeded, statFailed, visibleCount, totalCount, modal } = this.elements;

    if (fileInput) (fileInput as HTMLInputElement).value = '';
    this.updateFilePreview();
    if (results) results.classList.add('hidden');
    if (form) form.classList.remove('hidden');
    if (errorBanner) errorBanner.classList.add('hidden');
    if (error) error.textContent = '';
    if (resultsBody) resultsBody.innerHTML = '';
    if (submitBtn) {
      submitBtn.classList.remove('hidden');
      (submitBtn as HTMLButtonElement).disabled = true;
    }
    if (anotherBtn) anotherBtn.classList.add('hidden');
    if (statProcessed) statProcessed.textContent = '0';
    if (statSucceeded) statSucceeded.textContent = '0';
    if (statFailed) statFailed.textContent = '0';
    if (visibleCount) visibleCount.textContent = '0';
    if (totalCount) totalCount.textContent = '0';

    // Reset filter to 'all'
    this.currentFilter = 'all';
    this.resultItems = [];
    if (modal) {
      const filterBtns = modal.querySelectorAll('.import-filter-btn');
      filterBtns.forEach((btn) => {
        const isAll = btn.getAttribute('data-filter') === 'all';
        btn.classList.toggle('active', isAll);
        btn.classList.toggle('bg-gray-100', isAll);
        btn.classList.toggle('text-gray-700', isAll);
        btn.classList.toggle('text-gray-500', !isAll);
      });
    }

    // Exit fullscreen if active
    if (this.isFullscreen) {
      this.toggleFullscreen();
    }
  }

  /**
   * Set loading state
   * @param isLoading - Whether loading is in progress
   */
  setLoading(isLoading: boolean) {
    const { submitBtn, cancelBtn, spinner } = this.elements;

    if (submitBtn) {
      (submitBtn as HTMLButtonElement).disabled = isLoading;
      submitBtn.classList.toggle('opacity-50', isLoading);
    }
    if (cancelBtn) {
      (cancelBtn as HTMLButtonElement).disabled = isLoading;
    }
    if (spinner) {
      spinner.classList.toggle('hidden', !isLoading);
      spinner.classList.toggle('flex', isLoading);
    }
  }

  /**
   * Open the modal
   */
  open() {
    const { modal } = this.elements;
    if (!modal) return;
    this.reset();
    modal.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
  }

  /**
   * Close the modal
   */
  close() {
    const { modal } = this.elements;
    if (!modal) return;
    modal.classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
  }

  /**
   * Build a table cell element
   * @param value - Cell content
   * @param className - CSS classes
   */
  buildCell(value: string, className: string) {
    const cell = document.createElement('td');
    cell.className = className;
    cell.textContent = value;
    return cell;
  }

  /**
   * Render import results
   * @param payload - API response payload
   */
  renderResults(payload: any) {
    const { results, resultsBody, form, submitBtn, anotherBtn, errorBanner, error, statProcessed, statSucceeded, statFailed, visibleCount, totalCount } = this.elements;

    if (!results || !resultsBody) return;

    const summary = payload && payload.summary ? payload.summary : {};
    const processed = Number(summary.processed) || 0;
    const succeeded = Number(summary.succeeded) || 0;
    const failed = Number(summary.failed) || 0;
    const resultItems = Array.isArray(payload && payload.results) ? payload.results : [];
    const errorMessage = payload && payload.error ? String(payload.error).trim() : '';

    // Store results for filtering
    this.resultItems = resultItems;

    // Update summary cards
    if (statProcessed) statProcessed.textContent = String(processed);
    if (statSucceeded) statSucceeded.textContent = String(succeeded);
    if (statFailed) statFailed.textContent = String(failed);

    // Update result counts
    if (totalCount) totalCount.textContent = String(resultItems.length);
    if (visibleCount) visibleCount.textContent = String(resultItems.length);

    // Show error banner if needed
    if (errorMessage && errorBanner && error) {
      error.textContent = errorMessage;
      errorBanner.classList.remove('hidden');
    }

    // Build results table
    resultsBody.innerHTML = '';
    if (resultItems.length === 0) {
      const row = document.createElement('tr');
      const cell = this.buildCell('No results to display', 'px-4 py-4 text-gray-500 text-center');
      cell.colSpan = 5;
      row.appendChild(cell);
      resultsBody.appendChild(row);
    } else {
      resultItems.forEach((result: any, idx: number) => {
        const row = document.createElement('tr');
        const displayIndex = typeof result.index === 'number' ? result.index + 1 : idx + 1;
        const email = result.email ? String(result.email) : '-';
        const userId = result.user_id ? String(result.user_id) : '-';
        const hasError = result.error && String(result.error).trim() !== '';
        const statusLabel = hasError ? 'Failed' : (result.status ? String(result.status) : 'Created');

        // Add row background color and data-status attribute for filtering
        row.className = hasError ? 'bg-red-50' : 'bg-green-50';
        row.setAttribute('data-status', hasError ? 'failed' : 'succeeded');

        row.appendChild(this.buildCell(String(displayIndex), 'px-4 py-2 text-gray-700 font-medium'));
        row.appendChild(this.buildCell(email, 'px-4 py-2 text-gray-900'));
        row.appendChild(this.buildCell(userId, 'px-4 py-2 text-gray-500 font-mono text-xs'));

        // Status badge
        const statusCell = document.createElement('td');
        statusCell.className = 'px-4 py-2';
        const badge = document.createElement('span');
        badge.className = hasError
          ? 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700'
          : 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700';

        // Add icon to badge
        const iconSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        iconSvg.setAttribute('class', 'w-3 h-3');
        iconSvg.setAttribute('fill', 'none');
        iconSvg.setAttribute('stroke', 'currentColor');
        iconSvg.setAttribute('viewBox', '0 0 24 24');
        const iconPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        iconPath.setAttribute('stroke-linecap', 'round');
        iconPath.setAttribute('stroke-linejoin', 'round');
        iconPath.setAttribute('stroke-width', '2');
        iconPath.setAttribute('d', hasError ? 'M6 18L18 6M6 6l12 12' : 'M5 13l4 4L19 7');
        iconSvg.appendChild(iconPath);
        badge.appendChild(iconSvg);
        badge.appendChild(document.createTextNode(statusLabel));
        statusCell.appendChild(badge);
        row.appendChild(statusCell);

        row.appendChild(this.buildCell(hasError ? String(result.error) : '-', 'px-4 py-2 text-gray-600 text-xs'));
        resultsBody.appendChild(row);
      });
    }

    // Hide form, show results
    if (form) form.classList.add('hidden');
    results.classList.remove('hidden');

    // Toggle buttons
    if (submitBtn) submitBtn.classList.add('hidden');
    if (anotherBtn) anotherBtn.classList.remove('hidden');

    // Apply current filter (in case it was set before)
    this.applyFilter();
  }

  /**
   * Handle form submission
   * @param event - Submit event
   */
  async handleSubmit(event: Event) {
    event.preventDefault();
    const fileInput = this.elements.fileInput as HTMLInputElement | null;

    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
      this.notifier.error(`Select a file to import ${this.resourceName}.`);
      return;
    }

    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append('file', file);

    this.setLoading(true);
    let response: Response | null = null;
    let payload: any = null;

    try {
      response = await fetch(this.endpoint, {
        method: 'POST',
        body: formData
      });
      const contentType = response.headers.get('Content-Type') || '';
      if (contentType.includes('application/json')) {
        payload = await response.json();
      } else {
        payload = { error: 'Import failed' };
      }
    } catch (err) {
      console.error('Import failed:', err);
      this.notifier.error('Import failed.');
    } finally {
      this.setLoading(false);
    }

    if (!payload) return;

    this.renderResults(payload);

    const summary = payload.summary || {};
    const succeeded = Number(summary.succeeded) || 0;
    const failed = Number(summary.failed) || 0;

    if (response && response.ok && failed === 0) {
      this.notifier.success(`${this.resourceName} imported successfully.`);
    } else {
      const errorMessage = payload.error ? String(payload.error) : 'Import completed with errors.';
      this.notifier.error(errorMessage);
    }

    if (succeeded > 0) {
      this.onSuccess(summary);
    }
  }
}

// Default export
export default ImportModal;
