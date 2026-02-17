/**
 * Exchange Import Component (Phase 4 - TX-048)
 *
 * Provides enhanced import workflow with:
 * - Preview grid for validation results
 * - Selective row apply
 * - Conflict resolution controls
 * - Permission-gated apply action
 */

import type { GateResult, CapabilityGate } from './capability-gate.js';
import type {
  ExchangeRowResult,
  ExchangeRowStatus,
  ExchangeConflictInfo,
  ExchangeResultSummary,
  ExchangeImportResult,
} from '../toast/error-helpers.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Conflict resolution strategy for import rows
 * (Named ImportConflictResolution to avoid collision with autosave-indicator's ConflictResolution)
 */
export type ImportConflictResolution = 'skip' | 'keep_current' | 'accept_incoming' | 'force';

/**
 * Row selection state
 */
export interface RowSelectionState {
  selected: Set<number>;
  excluded: Set<number>;
  allSelected: boolean;
}

/**
 * Import preview row with selection and resolution state
 */
export interface ImportPreviewRow extends ExchangeRowResult {
  isSelected: boolean;
  resolution?: ImportConflictResolution;
}

/**
 * Import preview state
 */
export type ImportPreviewState = 'idle' | 'validating' | 'validated' | 'applying' | 'applied' | 'error';

/**
 * Import apply options
 */
export interface ImportApplyOptions {
  selectedIndices?: number[];
  allowCreateMissing?: boolean;
  allowSourceHashOverride?: boolean;
  continueOnError?: boolean;
  dryRun?: boolean;
  async?: boolean;
}

/**
 * Import component configuration
 */
export interface ExchangeImportConfig {
  /** Validation endpoint */
  validateEndpoint: string;
  /** Apply endpoint */
  applyEndpoint: string;
  /** Capability gate for permission checks */
  capabilityGate?: CapabilityGate;
  /** Callback when validation completes */
  onValidationComplete?: (result: ExchangeImportResult) => void;
  /** Callback when apply completes */
  onApplyComplete?: (result: ExchangeImportResult) => void;
  /** Callback when error occurs */
  onError?: (error: Error) => void;
  /** Custom labels */
  labels?: Partial<ImportLabels>;
}

/**
 * Customizable labels
 */
export interface ImportLabels {
  title: string;
  selectFile: string;
  validateButton: string;
  applyButton: string;
  cancelButton: string;
  selectAll: string;
  deselectAll: string;
  selectedCount: string;
  previewTitle: string;
  conflictResolution: string;
  keepCurrent: string;
  acceptIncoming: string;
  skip: string;
  force: string;
  success: string;
  error: string;
  conflict: string;
  skipped: string;
  validating: string;
  applying: string;
  noRowsSelected: string;
  applyDisabledReason: string;
  resource: string;
  field: string;
  status: string;
  sourceText: string;
  translatedText: string;
  conflictDetails: string;
  allowCreateMissing: string;
  continueOnError: string;
  dryRun: string;
}

const DEFAULT_LABELS: ImportLabels = {
  title: 'Import Translations',
  selectFile: 'Select file or paste data',
  validateButton: 'Validate',
  applyButton: 'Apply',
  cancelButton: 'Cancel',
  selectAll: 'Select All',
  deselectAll: 'Deselect All',
  selectedCount: 'selected',
  previewTitle: 'Preview',
  conflictResolution: 'Conflict Resolution',
  keepCurrent: 'Keep Current',
  acceptIncoming: 'Accept Incoming',
  skip: 'Skip',
  force: 'Force',
  success: 'Success',
  error: 'Error',
  conflict: 'Conflict',
  skipped: 'Skipped',
  validating: 'Validating...',
  applying: 'Applying...',
  noRowsSelected: 'No rows selected',
  applyDisabledReason: 'Missing import.apply permission',
  resource: 'Resource',
  field: 'Field',
  status: 'Status',
  sourceText: 'Source',
  translatedText: 'Translation',
  conflictDetails: 'Conflict Details',
  allowCreateMissing: 'Create missing translations',
  continueOnError: 'Continue on error',
  dryRun: 'Dry run (preview only)',
};

/**
 * Resolved config with labels fully typed (merged with defaults)
 */
interface ResolvedExchangeImportConfig {
  validateEndpoint: string;
  applyEndpoint: string;
  capabilityGate?: CapabilityGate;
  onValidationComplete?: (result: ExchangeImportResult) => void;
  onApplyComplete?: (result: ExchangeImportResult) => void;
  onError?: (error: Error) => void;
  labels: ImportLabels;
}

// ============================================================================
// ExchangeImport Class
// ============================================================================

/**
 * Exchange Import component
 */
export class ExchangeImport {
  private config: ResolvedExchangeImportConfig;
  private container: HTMLElement | null = null;
  private state: ImportPreviewState = 'idle';
  private validationResult: ExchangeImportResult | null = null;
  private previewRows: ImportPreviewRow[] = [];
  private selection: RowSelectionState = {
    selected: new Set(),
    excluded: new Set(),
    allSelected: false,
  };
  private applyOptions: ImportApplyOptions = {
    allowCreateMissing: false,
    continueOnError: false,
    dryRun: false,
    async: false,
  };
  private error: Error | null = null;
  private file: File | null = null;
  private rawData: string = '';

  constructor(config: ExchangeImportConfig) {
    const labels = { ...DEFAULT_LABELS, ...(config.labels || {}) };
    this.config = {
      validateEndpoint: config.validateEndpoint,
      applyEndpoint: config.applyEndpoint,
      capabilityGate: config.capabilityGate,
      onValidationComplete: config.onValidationComplete,
      onApplyComplete: config.onApplyComplete,
      onError: config.onError,
      labels,
    };
  }

  /**
   * Mount the component to a container
   */
  mount(container: HTMLElement): void {
    this.container = container;
    this.render();
  }

  /**
   * Unmount and cleanup
   */
  unmount(): void {
    if (this.container) {
      this.container.innerHTML = '';
    }
    this.container = null;
  }

  /**
   * Get current state
   */
  getState(): ImportPreviewState {
    return this.state;
  }

  /**
   * Get validation result
   */
  getValidationResult(): ExchangeImportResult | null {
    return this.validationResult;
  }

  /**
   * Get selected row indices
   */
  getSelectedIndices(): number[] {
    if (this.selection.allSelected) {
      return this.previewRows
        .filter(row => !this.selection.excluded.has(row.index))
        .map(row => row.index);
    }
    return Array.from(this.selection.selected);
  }

  /**
   * Set file for import
   */
  setFile(file: File): void {
    this.file = file;
    this.rawData = '';
    this.render();
  }

  /**
   * Set raw data for import
   */
  setRawData(data: string): void {
    this.rawData = data;
    this.file = null;
    this.render();
  }

  /**
   * Validate the import data
   */
  async validate(): Promise<ExchangeImportResult | null> {
    this.state = 'validating';
    this.error = null;
    this.render();

    try {
      const formData = new FormData();

      if (this.file) {
        formData.append('file', this.file);
      } else if (this.rawData) {
        // Send as JSON body
        const response = await fetch(this.config.validateEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: this.rawData,
        });

        if (!response.ok) {
          throw new Error(`Validation failed: ${response.status}`);
        }

        const result = await response.json() as ExchangeImportResult;
        this.handleValidationResult(result);
        return result;
      } else {
        throw new Error('No file or data to validate');
      }

      const response = await fetch(this.config.validateEndpoint, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Validation failed: ${response.status}`);
      }

      const result = await response.json() as ExchangeImportResult;
      this.handleValidationResult(result);
      return result;
    } catch (err) {
      this.error = err instanceof Error ? err : new Error(String(err));
      this.state = 'error';
      this.config.onError?.(this.error);
      this.render();
      return null;
    }
  }

  /**
   * Apply the import with selected rows
   */
  async apply(options?: ImportApplyOptions): Promise<ExchangeImportResult | null> {
    const mergedOptions = { ...this.applyOptions, ...options };
    const selectedIndices = mergedOptions.selectedIndices || this.getSelectedIndices();

    if (selectedIndices.length === 0) {
      this.error = new Error(this.config.labels.noRowsSelected);
      this.render();
      return null;
    }

    // Check permission
    if (this.config.capabilityGate) {
      const gate = this.config.capabilityGate.gateAction('exchange', 'import.apply');
      if (!gate.enabled) {
        this.error = new Error(gate.reason || this.config.labels.applyDisabledReason);
        this.render();
        return null;
      }
    }

    this.state = 'applying';
    this.error = null;
    this.render();

    try {
      // Filter rows by selected indices
      const selectedRows = this.validationResult?.results.filter(
        row => selectedIndices.includes(row.index)
      ) || [];

      // Apply conflict resolutions
      const rowsWithResolutions = selectedRows.map(row => {
        const previewRow = this.previewRows.find(p => p.index === row.index);
        return {
          ...row,
          resolution: previewRow?.resolution,
        };
      });

      const payload = {
        rows: rowsWithResolutions,
        allow_create_missing: mergedOptions.allowCreateMissing,
        allow_source_hash_override: mergedOptions.allowSourceHashOverride,
        continue_on_error: mergedOptions.continueOnError,
        dry_run: mergedOptions.dryRun,
        async: mergedOptions.async,
      };

      const response = await fetch(this.config.applyEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Apply failed: ${response.status}`);
      }

      const result = await response.json() as ExchangeImportResult;
      this.state = 'applied';
      this.config.onApplyComplete?.(result);
      this.render();
      return result;
    } catch (err) {
      this.error = err instanceof Error ? err : new Error(String(err));
      this.state = 'error';
      this.config.onError?.(this.error);
      this.render();
      return null;
    }
  }

  /**
   * Toggle row selection
   */
  toggleRowSelection(index: number): void {
    if (this.selection.allSelected) {
      if (this.selection.excluded.has(index)) {
        this.selection.excluded.delete(index);
      } else {
        this.selection.excluded.add(index);
      }
    } else {
      if (this.selection.selected.has(index)) {
        this.selection.selected.delete(index);
      } else {
        this.selection.selected.add(index);
      }
    }
    this.updatePreviewRowSelection();
    this.render();
  }

  /**
   * Select all rows
   */
  selectAll(): void {
    this.selection.allSelected = true;
    this.selection.excluded.clear();
    this.updatePreviewRowSelection();
    this.render();
  }

  /**
   * Deselect all rows
   */
  deselectAll(): void {
    this.selection.allSelected = false;
    this.selection.selected.clear();
    this.selection.excluded.clear();
    this.updatePreviewRowSelection();
    this.render();
  }

  /**
   * Set resolution for a row
   */
  setRowResolution(index: number, resolution: ImportConflictResolution): void {
    const row = this.previewRows.find(r => r.index === index);
    if (row) {
      row.resolution = resolution;
      this.render();
    }
  }

  /**
   * Set apply option
   */
  setApplyOption<K extends keyof ImportApplyOptions>(key: K, value: ImportApplyOptions[K]): void {
    this.applyOptions[key] = value;
    this.render();
  }

  /**
   * Reset to idle state
   */
  reset(): void {
    this.state = 'idle';
    this.validationResult = null;
    this.previewRows = [];
    this.selection = {
      selected: new Set(),
      excluded: new Set(),
      allSelected: false,
    };
    this.error = null;
    this.file = null;
    this.rawData = '';
    this.render();
  }

  private handleValidationResult(result: ExchangeImportResult): void {
    this.validationResult = result;
    this.previewRows = result.results.map(row => ({
      ...row,
      isSelected: row.status !== 'error',
      resolution: row.status === 'conflict' ? 'skip' : undefined,
    }));

    // Auto-select all non-error rows
    this.selection.allSelected = true;
    this.selection.excluded = new Set(
      result.results.filter(r => r.status === 'error').map(r => r.index)
    );

    this.state = 'validated';
    this.config.onValidationComplete?.(result);
    this.render();
  }

  private updatePreviewRowSelection(): void {
    this.previewRows = this.previewRows.map(row => ({
      ...row,
      isSelected: this.selection.allSelected
        ? !this.selection.excluded.has(row.index)
        : this.selection.selected.has(row.index),
    }));
  }

  private render(): void {
    if (!this.container) return;

    const labels = this.config.labels;
    this.container.innerHTML = `
      <div class="exchange-import" role="dialog" aria-label="${escapeHtml(labels.title)}">
        ${this.renderHeader()}
        ${this.renderContent()}
        ${this.renderFooter()}
      </div>
    `;

    this.attachEventListeners();
  }

  private renderHeader(): string {
    const labels = this.config.labels;
    return `
      <div class="import-header">
        <h3 class="import-title">${escapeHtml(labels.title)}</h3>
        ${this.validationResult ? this.renderSummaryBadges() : ''}
      </div>
    `;
  }

  private renderSummaryBadges(): string {
    if (!this.validationResult) return '';

    const summary = this.validationResult.summary;
    const labels = this.config.labels;

    return `
      <div class="import-summary-badges">
        <span class="summary-badge success">${summary.succeeded} ${escapeHtml(labels.success)}</span>
        <span class="summary-badge error">${summary.failed} ${escapeHtml(labels.error)}</span>
        <span class="summary-badge conflict">${summary.conflicts} ${escapeHtml(labels.conflict)}</span>
        <span class="summary-badge skipped">${summary.skipped} ${escapeHtml(labels.skipped)}</span>
      </div>
    `;
  }

  private renderContent(): string {
    switch (this.state) {
      case 'idle':
        return this.renderFileInput();
      case 'validating':
        return this.renderLoading(this.config.labels.validating);
      case 'validated':
        return this.renderPreviewGrid();
      case 'applying':
        return this.renderLoading(this.config.labels.applying);
      case 'applied':
        return this.renderApplyResult();
      case 'error':
        return this.renderError();
      default:
        return '';
    }
  }

  private renderFileInput(): string {
    const labels = this.config.labels;
    return `
      <div class="import-file-input">
        <label class="file-dropzone">
          <input type="file" accept=".csv,.json" class="file-input" />
          <span class="dropzone-text">${escapeHtml(labels.selectFile)}</span>
        </label>
        <div class="or-divider">or</div>
        <textarea class="data-input" placeholder="Paste JSON or CSV data here..." rows="5"></textarea>
      </div>
    `;
  }

  private renderLoading(message: string): string {
    return `
      <div class="import-loading" role="status" aria-busy="true">
        <div class="loading-spinner"></div>
        <p>${escapeHtml(message)}</p>
      </div>
    `;
  }

  private renderPreviewGrid(): string {
    const labels = this.config.labels;
    const selectedCount = this.getSelectedIndices().length;
    const totalCount = this.previewRows.length;

    return `
      <div class="import-preview">
        <div class="preview-toolbar">
          <div class="selection-controls">
            <button type="button" class="select-all-btn">${escapeHtml(labels.selectAll)}</button>
            <button type="button" class="deselect-all-btn">${escapeHtml(labels.deselectAll)}</button>
            <span class="selection-count">${selectedCount} / ${totalCount} ${escapeHtml(labels.selectedCount)}</span>
          </div>
          <div class="import-options">
            <label class="option-checkbox">
              <input type="checkbox" name="allowCreateMissing" ${this.applyOptions.allowCreateMissing ? 'checked' : ''} />
              ${escapeHtml(labels.allowCreateMissing)}
            </label>
            <label class="option-checkbox">
              <input type="checkbox" name="continueOnError" ${this.applyOptions.continueOnError ? 'checked' : ''} />
              ${escapeHtml(labels.continueOnError)}
            </label>
            <label class="option-checkbox">
              <input type="checkbox" name="dryRun" ${this.applyOptions.dryRun ? 'checked' : ''} />
              ${escapeHtml(labels.dryRun)}
            </label>
          </div>
        </div>
        <div class="preview-grid-container">
          <table class="preview-grid" role="grid">
            <thead>
              <tr>
                <th scope="col" class="select-col">
                  <input type="checkbox" class="select-all-checkbox" ${this.selection.allSelected && this.selection.excluded.size === 0 ? 'checked' : ''} />
                </th>
                <th scope="col">${escapeHtml(labels.resource)}</th>
                <th scope="col">${escapeHtml(labels.field)}</th>
                <th scope="col">${escapeHtml(labels.status)}</th>
                <th scope="col">${escapeHtml(labels.translatedText)}</th>
                <th scope="col">${escapeHtml(labels.conflictResolution)}</th>
              </tr>
            </thead>
            <tbody>
              ${this.previewRows.map(row => this.renderPreviewRow(row)).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  private renderPreviewRow(row: ImportPreviewRow): string {
    const labels = this.config.labels;
    const statusClass = getStatusClass(row.status);
    const isDisabled = row.status === 'error';

    return `
      <tr class="preview-row ${statusClass} ${row.isSelected ? 'selected' : ''}" data-index="${row.index}">
        <td class="select-col">
          <input type="checkbox" class="row-checkbox" ${row.isSelected ? 'checked' : ''} ${isDisabled ? 'disabled' : ''} />
        </td>
        <td class="resource-cell">
          <span class="resource-type">${escapeHtml(row.resource)}</span>
          <span class="entity-id">${escapeHtml(row.entityId)}</span>
        </td>
        <td class="field-cell">${escapeHtml(row.fieldPath)}</td>
        <td class="status-cell">
          <span class="status-badge ${statusClass}">${escapeHtml(formatStatus(row.status))}</span>
          ${row.error ? `<span class="error-message" title="${escapeAttr(row.error)}">${escapeHtml(truncate(row.error, 30))}</span>` : ''}
        </td>
        <td class="translation-cell">
          <span class="translation-text" title="${escapeAttr(row.targetLocale)}">${escapeHtml(row.targetLocale)}</span>
        </td>
        <td class="resolution-cell">
          ${row.status === 'conflict' ? this.renderConflictResolution(row) : '-'}
        </td>
      </tr>
    `;
  }

  private renderConflictResolution(row: ImportPreviewRow): string {
    const labels = this.config.labels;
    const resolution = row.resolution || 'skip';

    return `
      <select class="resolution-select" data-index="${row.index}">
        <option value="skip" ${resolution === 'skip' ? 'selected' : ''}>${escapeHtml(labels.skip)}</option>
        <option value="keep_current" ${resolution === 'keep_current' ? 'selected' : ''}>${escapeHtml(labels.keepCurrent)}</option>
        <option value="accept_incoming" ${resolution === 'accept_incoming' ? 'selected' : ''}>${escapeHtml(labels.acceptIncoming)}</option>
        <option value="force" ${resolution === 'force' ? 'selected' : ''}>${escapeHtml(labels.force)}</option>
      </select>
      ${row.conflict ? `<button type="button" class="conflict-details-btn" data-index="${row.index}" title="${escapeAttr(labels.conflictDetails)}">?</button>` : ''}
    `;
  }

  private renderApplyResult(): string {
    const labels = this.config.labels;
    return `
      <div class="import-applied">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-12 h-12 text-green-500">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd" />
        </svg>
        <p class="applied-message">Import completed successfully</p>
        <button type="button" class="reset-btn">Import Another</button>
      </div>
    `;
  }

  private renderError(): string {
    const labels = this.config.labels;
    return `
      <div class="import-error" role="alert">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-10 h-10 text-red-500">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" />
        </svg>
        <p class="error-message">${escapeHtml(this.error?.message || labels.error)}</p>
        <button type="button" class="reset-btn">${escapeHtml(labels.cancelButton)}</button>
      </div>
    `;
  }

  private renderFooter(): string {
    const labels = this.config.labels;
    const canApply = this.state === 'validated' && this.getSelectedIndices().length > 0;
    const applyGate = this.getApplyGate();

    return `
      <div class="import-footer">
        <button type="button" class="cancel-btn">${escapeHtml(labels.cancelButton)}</button>
        ${this.state === 'idle' ? `
          <button type="button" class="validate-btn" ${!this.file && !this.rawData ? 'disabled' : ''}>
            ${escapeHtml(labels.validateButton)}
          </button>
        ` : ''}
        ${this.state === 'validated' ? `
          <button type="button"
                  class="apply-btn"
                  ${!canApply || !applyGate.enabled ? 'disabled' : ''}
                  ${!applyGate.enabled ? `aria-disabled="true" title="${escapeAttr(applyGate.reason || labels.applyDisabledReason)}"` : ''}>
            ${escapeHtml(labels.applyButton)}
          </button>
        ` : ''}
      </div>
    `;
  }

  private getApplyGate(): GateResult {
    if (!this.config.capabilityGate) {
      return { visible: true, enabled: true };
    }
    return this.config.capabilityGate.gateAction('exchange', 'import.apply');
  }

  private attachEventListeners(): void {
    if (!this.container) return;

    // File input
    const fileInput = this.container.querySelector<HTMLInputElement>('.file-input');
    fileInput?.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      if (target.files?.[0]) {
        this.setFile(target.files[0]);
      }
    });

    // Data input
    const dataInput = this.container.querySelector<HTMLTextAreaElement>('.data-input');
    dataInput?.addEventListener('input', (e) => {
      const target = e.target as HTMLTextAreaElement;
      this.rawData = target.value;
    });

    // Validate button
    const validateBtn = this.container.querySelector('.validate-btn');
    validateBtn?.addEventListener('click', () => this.validate());

    // Apply button
    const applyBtn = this.container.querySelector('.apply-btn');
    applyBtn?.addEventListener('click', () => this.apply());

    // Cancel button
    const cancelBtn = this.container.querySelector('.cancel-btn');
    cancelBtn?.addEventListener('click', () => this.reset());

    // Reset button
    const resetBtn = this.container.querySelector('.reset-btn');
    resetBtn?.addEventListener('click', () => this.reset());

    // Select all / deselect all
    const selectAllBtn = this.container.querySelector('.select-all-btn');
    selectAllBtn?.addEventListener('click', () => this.selectAll());

    const deselectAllBtn = this.container.querySelector('.deselect-all-btn');
    deselectAllBtn?.addEventListener('click', () => this.deselectAll());

    // Select all checkbox
    const selectAllCheckbox = this.container.querySelector<HTMLInputElement>('.select-all-checkbox');
    selectAllCheckbox?.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      if (target.checked) {
        this.selectAll();
      } else {
        this.deselectAll();
      }
    });

    // Row checkboxes
    const rowCheckboxes = this.container.querySelectorAll<HTMLInputElement>('.row-checkbox');
    rowCheckboxes.forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        const row = checkbox.closest<HTMLTableRowElement>('.preview-row');
        const index = parseInt(row?.dataset.index || '', 10);
        if (!isNaN(index)) {
          this.toggleRowSelection(index);
        }
      });
    });

    // Resolution selects
    const resolutionSelects = this.container.querySelectorAll<HTMLSelectElement>('.resolution-select');
    resolutionSelects.forEach(select => {
      select.addEventListener('change', () => {
        const index = parseInt(select.dataset.index || '', 10);
        if (!isNaN(index)) {
          this.setRowResolution(index, select.value as ImportConflictResolution);
        }
      });
    });

    // Option checkboxes
    const optionCheckboxes = this.container.querySelectorAll<HTMLInputElement>('.option-checkbox input');
    optionCheckboxes.forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        const name = checkbox.name as keyof ImportApplyOptions;
        if (name) {
          this.setApplyOption(name, checkbox.checked);
        }
      });
    });
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeAttr(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getStatusClass(status: ExchangeRowStatus): string {
  switch (status) {
    case 'success':
      return 'status-success';
    case 'error':
      return 'status-error';
    case 'conflict':
      return 'status-conflict';
    case 'skipped':
      return 'status-skipped';
    default:
      return '';
  }
}

function formatStatus(status: ExchangeRowStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}

// ============================================================================
// CSS Styles
// ============================================================================

/**
 * Get CSS styles for exchange import component
 */
export function getExchangeImportStyles(): string {
  return `
    /* Exchange Import Styles */
    .exchange-import {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      padding: 1.5rem;
      background: white;
      border-radius: 0.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      max-height: 80vh;
      overflow: hidden;
    }

    .import-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .import-title {
      font-size: 1.25rem;
      font-weight: 600;
      color: #1f2937;
      margin: 0;
    }

    .import-summary-badges {
      display: flex;
      gap: 0.5rem;
    }

    .summary-badge {
      padding: 0.25rem 0.5rem;
      font-size: 0.75rem;
      font-weight: 500;
      border-radius: 9999px;
    }

    .summary-badge.success { background: #d1fae5; color: #059669; }
    .summary-badge.error { background: #fee2e2; color: #dc2626; }
    .summary-badge.conflict { background: #fef3c7; color: #d97706; }
    .summary-badge.skipped { background: #f3f4f6; color: #6b7280; }

    /* File Input */
    .import-file-input {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .file-dropzone {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      border: 2px dashed #d1d5db;
      border-radius: 0.5rem;
      cursor: pointer;
      transition: border-color 0.2s, background 0.2s;
    }

    .file-dropzone:hover {
      border-color: #2563eb;
      background: #eff6ff;
    }

    .file-input {
      display: none;
    }

    .dropzone-text {
      font-size: 0.875rem;
      color: #6b7280;
    }

    .or-divider {
      text-align: center;
      color: #9ca3af;
      font-size: 0.875rem;
    }

    .data-input {
      width: 100%;
      padding: 0.75rem;
      font-family: monospace;
      font-size: 0.875rem;
      border: 1px solid #d1d5db;
      border-radius: 0.375rem;
      resize: vertical;
    }

    /* Loading */
    .import-loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 3rem;
      color: #6b7280;
    }

    .loading-spinner {
      width: 2rem;
      height: 2rem;
      border: 2px solid #e5e7eb;
      border-top-color: #2563eb;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 1rem;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Preview Grid */
    .import-preview {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      flex: 1;
      overflow: hidden;
    }

    .preview-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .selection-controls {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .selection-count {
      font-size: 0.875rem;
      color: #6b7280;
    }

    .import-options {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .option-checkbox {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.875rem;
      color: #374151;
      cursor: pointer;
    }

    .preview-grid-container {
      flex: 1;
      overflow: auto;
      border: 1px solid #e5e7eb;
      border-radius: 0.375rem;
    }

    .preview-grid {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
    }

    .preview-grid th {
      position: sticky;
      top: 0;
      background: #f9fafb;
      padding: 0.75rem 0.5rem;
      text-align: left;
      font-weight: 500;
      color: #6b7280;
      border-bottom: 1px solid #e5e7eb;
    }

    .preview-grid td {
      padding: 0.5rem;
      border-bottom: 1px solid #f3f4f6;
      vertical-align: middle;
    }

    .preview-row.selected {
      background: #eff6ff;
    }

    .preview-row.status-error {
      opacity: 0.6;
    }

    .select-col {
      width: 40px;
      text-align: center;
    }

    .resource-cell {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
    }

    .resource-type {
      font-weight: 500;
      color: #1f2937;
    }

    .entity-id {
      font-size: 0.75rem;
      color: #9ca3af;
    }

    .status-badge {
      display: inline-block;
      padding: 0.125rem 0.375rem;
      font-size: 0.75rem;
      font-weight: 500;
      border-radius: 0.25rem;
    }

    .status-badge.status-success { background: #d1fae5; color: #059669; }
    .status-badge.status-error { background: #fee2e2; color: #dc2626; }
    .status-badge.status-conflict { background: #fef3c7; color: #d97706; }
    .status-badge.status-skipped { background: #f3f4f6; color: #6b7280; }

    .error-message {
      display: block;
      font-size: 0.75rem;
      color: #dc2626;
      margin-top: 0.125rem;
    }

    .resolution-select {
      padding: 0.25rem 0.5rem;
      font-size: 0.75rem;
      border: 1px solid #d1d5db;
      border-radius: 0.25rem;
    }

    .conflict-details-btn {
      padding: 0.125rem 0.375rem;
      font-size: 0.75rem;
      border: 1px solid #d1d5db;
      border-radius: 0.25rem;
      background: white;
      cursor: pointer;
      margin-left: 0.25rem;
    }

    /* Applied / Error states */
    .import-applied,
    .import-error {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 3rem;
      text-align: center;
    }

    .applied-message,
    .error-message {
      font-weight: 500;
      margin: 1rem 0;
    }

    .import-applied .applied-message { color: #059669; }
    .import-error .error-message { color: #dc2626; }

    /* Footer */
    .import-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding-top: 1rem;
      border-top: 1px solid #e5e7eb;
    }

    .cancel-btn,
    .validate-btn,
    .apply-btn,
    .reset-btn,
    .select-all-btn,
    .deselect-all-btn {
      padding: 0.5rem 1rem;
      font-size: 0.875rem;
      border-radius: 0.375rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .cancel-btn,
    .reset-btn,
    .select-all-btn,
    .deselect-all-btn {
      background: white;
      border: 1px solid #d1d5db;
      color: #374151;
    }

    .cancel-btn:hover,
    .reset-btn:hover,
    .select-all-btn:hover,
    .deselect-all-btn:hover {
      background: #f3f4f6;
    }

    .validate-btn,
    .apply-btn {
      background: #2563eb;
      border: none;
      color: white;
    }

    .validate-btn:hover,
    .apply-btn:hover {
      background: #1d4ed8;
    }

    .validate-btn:disabled,
    .apply-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .apply-btn[aria-disabled="true"] {
      opacity: 0.6;
      cursor: not-allowed;
    }
  `;
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create and mount an exchange import component
 */
export function createExchangeImport(
  container: HTMLElement,
  config: ExchangeImportConfig
): ExchangeImport {
  const component = new ExchangeImport(config);
  component.mount(container);
  return component;
}

/**
 * Initialize exchange import from data attributes
 */
export function initExchangeImport(container: HTMLElement): ExchangeImport | null {
  const validateEndpoint = container.dataset.validateEndpoint;
  const applyEndpoint = container.dataset.applyEndpoint;

  if (!validateEndpoint || !applyEndpoint) {
    console.warn('ExchangeImport: Missing required data attributes');
    return null;
  }

  return createExchangeImport(container, {
    validateEndpoint,
    applyEndpoint,
  });
}
