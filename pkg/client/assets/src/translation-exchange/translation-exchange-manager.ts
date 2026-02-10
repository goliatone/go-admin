/**
 * Translation Exchange Manager
 * Handles export, import validation, and apply workflows for translation exchange
 */

import type {
  TranslationExchangeConfig,
  TranslationExchangeSelectors,
  ExportRequest,
  ExportResponse,
  ImportOptions,
  ImportResult,
  ImportState,
  RowResult,
  ToastNotifier,
} from './types.js';
import {
  extractStructuredError,
  parseImportResult,
  groupRowResultsByStatus,
  generateExchangeReport,
} from '../toast/error-helpers.js';

const DEFAULT_SELECTORS: TranslationExchangeSelectors = {
  // Tabs
  tabExport: '#tab-export',
  tabImport: '#tab-import',
  panelExport: '#panel-export',
  panelImport: '#panel-import',
  // Export
  exportForm: '#export-form',
  sourceLocale: '#source-locale',
  exportStatus: '#export-status',
  // Import
  importFile: '#import-file',
  importOptions: '#import-options',
  fileName: '#file-name',
  validateBtn: '#validate-btn',
  applyBtn: '#apply-btn',
  // Import options
  allowCreateMissing: '#allow-create-missing',
  allowHashOverride: '#allow-hash-override',
  continueOnError: '#continue-on-error',
  dryRun: '#dry-run',
  // Results
  validationResults: '#validation-results',
  downloadReport: '#download-report',
  resultsSummary: '#results-summary',
  resultsTable: '#results-table',
  resultsEmpty: '#results-empty',
  summaryProcessed: '#summary-processed',
  summarySucceeded: '#summary-succeeded',
  summaryFailed: '#summary-failed',
  summaryConflicts: '#summary-conflicts',
};

const STATUS_BADGES: Record<string, { class: string; label: string }> = {
  success: { class: 'bg-green-100 text-green-800', label: 'Success' },
  error: { class: 'bg-red-100 text-red-800', label: 'Error' },
  conflict: { class: 'bg-yellow-100 text-yellow-800', label: 'Conflict' },
  skipped: { class: 'bg-gray-100 text-gray-800', label: 'Skipped' },
};

export class TranslationExchangeManager {
  private config: TranslationExchangeConfig;
  private selectors: TranslationExchangeSelectors;
  private toast: ToastNotifier | null;

  // Cached DOM elements
  private tabExport: HTMLButtonElement | null = null;
  private tabImport: HTMLButtonElement | null = null;
  private panelExport: HTMLElement | null = null;
  private panelImport: HTMLElement | null = null;
  private exportForm: HTMLFormElement | null = null;
  private exportStatus: HTMLElement | null = null;
  private importFile: HTMLInputElement | null = null;
  private importOptions: HTMLElement | null = null;
  private fileNameEl: HTMLElement | null = null;
  private validateBtn: HTMLButtonElement | null = null;
  private applyBtn: HTMLButtonElement | null = null;
  private validationResults: HTMLElement | null = null;
  private downloadReportBtn: HTMLButtonElement | null = null;
  private resultsTable: HTMLTableSectionElement | null = null;
  private resultsEmpty: HTMLElement | null = null;

  // State
  private importState: ImportState = {
    file: null,
    validated: false,
    validationResult: null,
  };

  constructor(
    config: TranslationExchangeConfig,
    selectors: Partial<TranslationExchangeSelectors> = {},
    toast?: ToastNotifier
  ) {
    this.config = config;
    this.selectors = { ...DEFAULT_SELECTORS, ...selectors };
    this.toast = toast || (window as any).toastManager || null;
  }

  /**
   * Initialize the translation exchange manager
   */
  init(): void {
    this.cacheElements();
    this.bindEvents();
  }

  /**
   * Destroy the manager and clean up
   */
  destroy(): void {
    // Clean up event listeners if needed
  }

  private cacheElements(): void {
    this.tabExport = document.querySelector<HTMLButtonElement>(this.selectors.tabExport);
    this.tabImport = document.querySelector<HTMLButtonElement>(this.selectors.tabImport);
    this.panelExport = document.querySelector<HTMLElement>(this.selectors.panelExport);
    this.panelImport = document.querySelector<HTMLElement>(this.selectors.panelImport);
    this.exportForm = document.querySelector<HTMLFormElement>(this.selectors.exportForm);
    this.exportStatus = document.querySelector<HTMLElement>(this.selectors.exportStatus);
    this.importFile = document.querySelector<HTMLInputElement>(this.selectors.importFile);
    this.importOptions = document.querySelector<HTMLElement>(this.selectors.importOptions);
    this.fileNameEl = document.querySelector<HTMLElement>(this.selectors.fileName);
    this.validateBtn = document.querySelector<HTMLButtonElement>(this.selectors.validateBtn);
    this.applyBtn = document.querySelector<HTMLButtonElement>(this.selectors.applyBtn);
    this.validationResults = document.querySelector<HTMLElement>(this.selectors.validationResults);
    this.downloadReportBtn = document.querySelector<HTMLButtonElement>(this.selectors.downloadReport);
    this.resultsTable = document.querySelector<HTMLTableSectionElement>(this.selectors.resultsTable);
    this.resultsEmpty = document.querySelector<HTMLElement>(this.selectors.resultsEmpty);
  }

  private bindEvents(): void {
    // Tab switching
    this.tabExport?.addEventListener('click', () => this.switchTab('export'));
    this.tabImport?.addEventListener('click', () => this.switchTab('import'));

    // Export form
    this.exportForm?.addEventListener('submit', (e) => this.handleExport(e));

    // File upload
    this.importFile?.addEventListener('change', (e) => this.handleFileSelect(e));

    // Drag and drop
    const dropZone = this.importFile?.closest('.border-dashed');
    if (dropZone) {
      dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('border-admin-primary', 'bg-admin-primary/5');
      });
      dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('border-admin-primary', 'bg-admin-primary/5');
      });
      dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-admin-primary', 'bg-admin-primary/5');
        const files = (e as DragEvent).dataTransfer?.files;
        if (files && files.length > 0) {
          this.handleFile(files[0]);
        }
      });
    }

    // Validate and Apply buttons
    this.validateBtn?.addEventListener('click', () => this.handleValidate());
    this.applyBtn?.addEventListener('click', () => this.handleApply());

    // Download report
    this.downloadReportBtn?.addEventListener('click', () => this.handleDownloadReport());
  }

  private switchTab(tab: 'export' | 'import'): void {
    const allTabs = document.querySelectorAll('.tab-btn');
    const allPanels = document.querySelectorAll('.tab-panel');

    allTabs.forEach((t) => {
      t.classList.remove('border-admin-primary', 'text-admin-primary');
      t.classList.add('border-transparent', 'text-gray-500');
    });
    allPanels.forEach((p) => p.classList.add('hidden'));

    if (tab === 'export') {
      this.tabExport?.classList.remove('border-transparent', 'text-gray-500');
      this.tabExport?.classList.add('border-admin-primary', 'text-admin-primary');
      this.panelExport?.classList.remove('hidden');
    } else {
      this.tabImport?.classList.remove('border-transparent', 'text-gray-500');
      this.tabImport?.classList.add('border-admin-primary', 'text-admin-primary');
      this.panelImport?.classList.remove('hidden');
    }
  }

  private async handleExport(e: Event): Promise<void> {
    e.preventDefault();
    if (!this.exportForm) return;

    const formData = new FormData(this.exportForm);
    const resources = formData.getAll('resources') as string[];
    const sourceLocale = formData.get('source_locale') as string;
    const targetLocales = formData.getAll('target_locales') as string[];
    const includeSourceHash = formData.has('include_source_hash');

    if (resources.length === 0) {
      this.showError('Please select at least one resource to export.');
      return;
    }
    if (targetLocales.length === 0) {
      this.showError('Please select at least one target locale.');
      return;
    }

    this.setExportStatus('Exporting...');

    try {
      const request: ExportRequest = {
        filter: {
          resources,
          source_locale: sourceLocale,
          target_locales: targetLocales,
          include_source_hash: includeSourceHash,
        },
      };

      const response = await fetch(`${this.config.apiPath}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.json();
        const structured = extractStructuredError(error);
        throw new Error(structured?.message || 'Export failed');
      }

      const result: ExportResponse = await response.json();
      this.downloadExportResult(result, sourceLocale, targetLocales);
      this.setExportStatus(`Exported ${result.row_count} rows`);
      this.toast?.success(`Exported ${result.row_count} translation rows`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Export failed';
      this.setExportStatus('');
      this.showError(message);
    }
  }

  private downloadExportResult(result: ExportResponse, source: string, targets: string[]): void {
    const csv = this.convertToCSV(result.rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().split('T')[0];
    link.href = url;
    link.download = `translations_${source}_to_${targets.join('-')}_${timestamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  private convertToCSV(rows: Record<string, unknown>[]): string {
    if (rows.length === 0) return '';

    const headers = [
      'resource',
      'entity_id',
      'translation_group_id',
      'source_locale',
      'target_locale',
      'field_path',
      'source_text',
      'translated_text',
      'source_hash',
      'path',
      'title',
      'status',
      'notes',
    ];

    const csvRows = [headers.join(',')];
    for (const row of rows) {
      const values = headers.map((h) => {
        const val = row[h] ?? '';
        const str = String(val);
        // Escape quotes and wrap in quotes if contains comma/quote/newline
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      });
      csvRows.push(values.join(','));
    }
    return csvRows.join('\n');
  }

  private handleFileSelect(e: Event): void {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFile(input.files[0]);
    }
  }

  private handleFile(file: File): void {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'csv' && ext !== 'json') {
      this.showError('Please upload a CSV or JSON file.');
      return;
    }

    this.importState.file = file;
    this.importState.validated = false;
    this.importState.validationResult = null;

    // Show file name
    if (this.fileNameEl) {
      this.fileNameEl.textContent = `Selected: ${file.name}`;
      this.fileNameEl.classList.remove('hidden');
    }

    // Show import options
    this.importOptions?.classList.remove('hidden');

    // Reset apply button
    if (this.applyBtn) {
      this.applyBtn.disabled = true;
    }

    // Hide previous results
    this.validationResults?.classList.add('hidden');
  }

  private async handleValidate(): Promise<void> {
    if (!this.importState.file) {
      this.showError('Please select a file first.');
      return;
    }

    this.setButtonLoading(this.validateBtn, true);

    try {
      const formData = new FormData();
      formData.append('file', this.importState.file);

      const response = await fetch(`${this.config.apiPath}/import/validate`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        const structured = extractStructuredError(data);
        throw new Error(structured?.message || 'Validation failed');
      }

      const result = parseImportResult(data);
      this.importState.validated = true;
      this.importState.validationResult = result;

      this.displayResults(result);

      // Enable apply button if validation passed (some succeeded)
      if (this.applyBtn && result.summary.succeeded > 0) {
        this.applyBtn.disabled = false;
      }

      this.toast?.info(`Validation complete: ${result.summary.succeeded}/${result.summary.processed} rows valid`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Validation failed';
      this.showError(message);
    } finally {
      this.setButtonLoading(this.validateBtn, false);
    }
  }

  private async handleApply(): Promise<void> {
    if (!this.importState.file) {
      this.showError('Please select a file first.');
      return;
    }

    const dryRunCheckbox = document.querySelector<HTMLInputElement>(this.selectors.dryRun);
    if (dryRunCheckbox?.checked) {
      this.toast?.info('Dry run mode - no changes will be applied');
    }

    this.setButtonLoading(this.applyBtn, true);

    try {
      const formData = new FormData();
      formData.append('file', this.importState.file);

      // Add options
      const options = this.getImportOptions();
      for (const [key, value] of Object.entries(options)) {
        formData.append(key, String(value));
      }

      const response = await fetch(`${this.config.apiPath}/import/apply`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        const structured = extractStructuredError(data);
        throw new Error(structured?.message || 'Apply failed');
      }

      const result = parseImportResult(data);
      this.importState.validationResult = result;

      this.displayResults(result);

      if (result.summary.succeeded > 0) {
        this.toast?.success(`Applied ${result.summary.succeeded} translations successfully`);
      }
      if (result.summary.failed > 0) {
        this.toast?.warning(`${result.summary.failed} rows failed to apply`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Apply failed';
      this.showError(message);
    } finally {
      this.setButtonLoading(this.applyBtn, false);
    }
  }

  private getImportOptions(): ImportOptions {
    return {
      allow_create_missing:
        document.querySelector<HTMLInputElement>(this.selectors.allowCreateMissing)?.checked ?? false,
      allow_source_hash_override:
        document.querySelector<HTMLInputElement>(this.selectors.allowHashOverride)?.checked ?? false,
      continue_on_error:
        document.querySelector<HTMLInputElement>(this.selectors.continueOnError)?.checked ?? true,
      dry_run: document.querySelector<HTMLInputElement>(this.selectors.dryRun)?.checked ?? false,
    };
  }

  private displayResults(result: ImportResult): void {
    // Show results section
    this.validationResults?.classList.remove('hidden');

    // Update summary
    const processed = document.querySelector(this.selectors.summaryProcessed);
    const succeeded = document.querySelector(this.selectors.summarySucceeded);
    const failed = document.querySelector(this.selectors.summaryFailed);
    const conflicts = document.querySelector(this.selectors.summaryConflicts);

    if (processed) processed.textContent = String(result.summary.processed);
    if (succeeded) succeeded.textContent = String(result.summary.succeeded);
    if (failed) failed.textContent = String(result.summary.failed);

    // Count conflicts from results
    const grouped = groupRowResultsByStatus(result.results);
    if (conflicts) conflicts.textContent = String(grouped.conflict.length);

    // Render results table
    this.renderResultsTable(result.results);
  }

  private renderResultsTable(results: RowResult[]): void {
    if (!this.resultsTable) return;

    if (results.length === 0) {
      this.resultsTable.innerHTML = '';
      this.resultsEmpty?.classList.remove('hidden');
      return;
    }

    this.resultsEmpty?.classList.add('hidden');

    const rows = results.map((row) => {
      const badge = STATUS_BADGES[row.status] || STATUS_BADGES.error;
      const errorDetail = row.error || row.conflict?.type || '';

      return `
        <tr>
          <td class="px-4 py-3 text-gray-500">${row.index + 1}</td>
          <td class="px-4 py-3">${this.escapeHtml(row.resource)}</td>
          <td class="px-4 py-3 font-mono text-xs">${this.escapeHtml(row.entity_id)}</td>
          <td class="px-4 py-3">${this.escapeHtml(row.field_path)}</td>
          <td class="px-4 py-3">${this.escapeHtml(row.target_locale)}</td>
          <td class="px-4 py-3">
            <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${badge.class}">
              ${badge.label}
            </span>
          </td>
          <td class="px-4 py-3 text-xs text-gray-500">${this.escapeHtml(errorDetail)}</td>
        </tr>
      `;
    });

    this.resultsTable.innerHTML = rows.join('');
  }

  private handleDownloadReport(): void {
    if (!this.importState.validationResult) {
      this.showError('No results to download.');
      return;
    }

    const report = generateExchangeReport(this.importState.validationResult, 'text');
    const blob = new Blob([report], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().split('T')[0];
    link.href = url;
    link.download = `translation_import_report_${timestamp}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    this.toast?.info('Report downloaded');
  }

  private setExportStatus(text: string): void {
    if (this.exportStatus) {
      this.exportStatus.textContent = text;
    }
  }

  private setButtonLoading(button: HTMLButtonElement | null, loading: boolean): void {
    if (!button) return;

    if (loading) {
      button.disabled = true;
      button.dataset.originalText = button.textContent || '';
      button.textContent = 'Processing...';
    } else {
      button.disabled = false;
      button.textContent = button.dataset.originalText || button.textContent;
    }
  }

  private showError(message: string): void {
    if (this.toast) {
      this.toast.error(message);
    } else {
      console.error(message);
      alert(message);
    }
  }

  private escapeHtml(str: string): string {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}
