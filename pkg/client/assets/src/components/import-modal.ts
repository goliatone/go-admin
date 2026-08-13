/**
 * Public bulk-import interaction primitives.
 *
 * Applications own parsing, validation, authorization, conflict policy,
 * persistence, transactions, receipts, idempotency and audit. This module owns
 * only accessible file intake, modal/workflow lifecycle and safe report
 * presentation.
 */

import { ConfirmModal, Modal } from './modal.js';
import { escapeHTML as escapeHtml } from '../shared/html.js';
import { formatByteSize } from '../shared/size-formatters.js';
import { httpRequest } from '../shared/transport/http-client.js';

export type ImportWorkflowState =
  | 'idle'
  | 'selected'
  | 'submitting'
  | 'previewing'
  | 'preview-ready'
  | 'applying'
  | 'complete'
  | 'recoverable-error'
  | 'terminal-error';

export type ImportMetricTone = 'neutral' | 'success' | 'warning' | 'danger';
export type ImportSafeValue = string | number | boolean | null;

export interface ImportModeDescriptor {
  key: string;
  label: string;
  description?: string;
  confirmation?: string;
}

export interface ImportReportFilter {
  key: string;
  label: string;
  outcome?: string;
  action?: string;
  code?: string;
  predicate?: (row: Readonly<ImportReportRow>) => boolean;
}

export interface ImportMetric {
  key: string;
  label: string;
  value: number;
  tone?: ImportMetricTone;
  filter?: ImportReportFilter;
}

export interface ImportReportRow {
  reference: string;
  outcome: string;
  action?: string;
  fields?: string[];
  codes?: string[];
  message?: string;
  metadata?: Record<string, ImportSafeValue>;
}

export interface ImportReportContinuation {
  available: boolean;
  label?: string;
}

export interface ImportReportBounds {
  returnedRows: number;
  totalRows: number;
  truncated: boolean;
  continuation?: ImportReportContinuation;
}

export interface ImportReportData {
  phase: 'preview' | 'apply' | 'complete';
  mode: string;
  metrics: ImportMetric[];
  rows: ImportReportRow[];
  bounds: ImportReportBounds;
  run?: Record<string, ImportSafeValue>;
  replayed?: boolean;
  partial?: boolean;
}

export interface ImportReportColumn {
  key: string;
  label: string;
  value?: (row: Readonly<ImportReportRow>) => ImportSafeValue;
}

export interface ImportAttemptContext {
  readonly attemptId: string;
  readonly idempotencyKey: string;
}

export interface ImportApplyEligibility {
  allowed: boolean;
  reason?: string;
}

export interface ImportTransportContext {
  signal: AbortSignal;
  mode: Readonly<ImportModeDescriptor>;
}

export interface ImportApplyTransportContext extends ImportTransportContext {
  attempt: Readonly<ImportAttemptContext>;
}

export interface ImportPreviewAdaptation<TPreview = unknown> {
  state: TPreview;
  report: ImportReportData;
  eligibility: ImportApplyEligibility;
}

export interface ImportCompletion {
  sourceKey: string;
  report: ImportReportData;
  response: unknown;
  attempt?: Readonly<ImportAttemptContext>;
}

export type ImportTransportOutcome = 'retryable' | 'unknown' | 'terminal';

export class ImportTransportError extends Error {
  readonly outcome: ImportTransportOutcome;

  constructor(message: string, outcome: ImportTransportOutcome = 'unknown') {
    super(message);
    this.name = 'ImportTransportError';
    this.outcome = outcome;
  }
}

export interface ImportSourcePanelAPI {
  setReady(ready: boolean): void;
  /** Notify the workflow that custom input changed and any preview is stale. */
  inputChanged(ready?: boolean): void;
  setStatus(message: string): void;
}

export type ImportDiscardReason = 'source-switch';

export interface ImportDiscardContext {
  reason: ImportDiscardReason;
  state: ImportWorkflowState;
  sourceKey: string;
  nextSourceKey?: string;
  hasInput: boolean;
  hasPreview: boolean;
  attempt?: Readonly<ImportAttemptContext>;
}

export interface ImportSourceDescriptor<
  TInput = unknown,
  TPreview = unknown,
  TSubmitResponse = unknown,
  TPreviewResponse = unknown,
  TApplyResponse = unknown,
> {
  key: string;
  label: string;
  help?: string;
  available?: boolean;
  unavailableReason?: string;
  mode: ImportModeDescriptor;
  modes?: readonly ImportModeDescriptor[];
  selectableModes?: boolean;
  workflow: 'single' | 'preview-apply';
  kind: 'file' | 'custom';
  file?: Omit<FileDropzoneOptions, 'root' | 'onChange'>;
  mountInput?: (root: HTMLElement, api: ImportSourcePanelAPI) => void | (() => void);
  readInput?: (root: HTMLElement) => TInput | null;
  isInputReady?: (input: TInput | null) => boolean;
  setInputDisabled?: (root: HTMLElement, disabled: boolean) => void;
  submit?: (input: TInput, context: ImportTransportContext) => Promise<TSubmitResponse>;
  adaptSubmit?: (response: TSubmitResponse, mode: Readonly<ImportModeDescriptor>) => ImportReportData;
  preview?: (input: TInput, context: ImportTransportContext) => Promise<TPreviewResponse>;
  adaptPreview?: (response: TPreviewResponse, mode: Readonly<ImportModeDescriptor>) => ImportPreviewAdaptation<TPreview>;
  apply?: (input: TInput, preview: TPreview, context: ImportApplyTransportContext) => Promise<TApplyResponse>;
  adaptApply?: (response: TApplyResponse, mode: Readonly<ImportModeDescriptor>) => ImportReportData;
  onComplete?: (completion: ImportCompletion) => void | Promise<void>;
  onCompletionError?: (error: unknown, completion: ImportCompletion) => void | Promise<void>;
  onReconcileAttempt?: (attempt: Readonly<ImportAttemptContext>) => boolean | Promise<boolean>;
  confirmDiscard?: (context: Readonly<ImportDiscardContext>) => boolean | Promise<boolean>;
}

// A modal may compose heterogeneous file and custom source input/response
// types. Each descriptor remains strongly typed at its declaration site.
export type AnyImportSourceDescriptor = ImportSourceDescriptor<any, any, any, any, any>;

export interface BulkImportCopy {
  title: string;
  description?: string;
  close: string;
  maximize: string;
  restore: string;
  preview: string;
  apply: string;
  submit: string;
  retry: string;
  importAnother: string;
  idleStatus: string;
  selectedStatus: string;
  previewingStatus: string;
  applyingStatus: string;
  completeStatus: string;
  completionError: string;
  confirmApply: string;
  noRows: string;
  sourceTabsLabel: string;
  modeLabel: string;
  samplesLabel: string;
  reportFiltersLabel: string;
  allRows: string;
  reportBounds: string;
  reportTruncated: string;
  partialResult: string;
  replayedResult: string;
  inputRequired: string;
  previewReady: string;
  previewIneligible: string;
  reconcileRequired: string;
  unknownOutcome: string;
  importFailed: string;
  unavailableSource: string;
  discardTitle: string;
  discardSourceChange: string;
  discard: string;
  cancel: string;
}

export interface BulkImportModalOptions {
  root: HTMLElement;
  sources: readonly AnyImportSourceDescriptor[];
  columns?: readonly ImportReportColumn[];
  filters?: readonly ImportReportFilter[];
  copy?: Partial<BulkImportCopy>;
  onComplete?: (completion: ImportCompletion) => void | Promise<void>;
  onCompletionError?: (error: unknown, completion: ImportCompletion) => void | Promise<void>;
  onStateChange?: (state: ImportWorkflowState) => void;
  attemptFactory?: () => ImportAttemptContext;
  confirmDiscard?: (context: Readonly<ImportDiscardContext>) => boolean | Promise<boolean>;
}

export interface FileDropzoneCopy {
  browse: string;
  guidance: string;
  remove: string;
  invalid: string;
  tooLarge: string;
  samplesLabel: string;
}

export interface FileDropzoneSampleLink {
  label: string;
  href: string;
}

export interface FileDropzoneOptions {
  root: HTMLElement;
  accept?: string;
  maxBytes?: number;
  guidance?: string;
  samples?: readonly FileDropzoneSampleLink[];
  copy?: Partial<FileDropzoneCopy>;
  onChange?: (file: File | null) => void;
  onInvalid?: (message: string) => void;
}

const defaultCopy: BulkImportCopy = {
  title: 'Bulk import',
  description: 'Choose a source, review the result, and apply only when the preview is eligible.',
  close: 'Close bulk import',
  maximize: 'Maximize report',
  restore: 'Restore report size',
  preview: 'Preview',
  apply: 'Apply import',
  submit: 'Import',
  retry: 'Retry',
  importAnother: 'Import another',
  idleStatus: 'Choose an import source to begin.',
  selectedStatus: 'Ready to continue.',
  previewingStatus: 'Preparing preview…',
  applyingStatus: 'Applying import…',
  completeStatus: 'Import completed.',
  completionError: 'Import completed, but the page could not refresh.',
  confirmApply: 'Apply this import using the reviewed preview?',
  noRows: 'No row details were returned.',
  sourceTabsLabel: 'Import source',
  modeLabel: 'Import mode',
  samplesLabel: 'Import samples',
  reportFiltersLabel: 'Filter import rows',
  allRows: 'All',
  reportBounds: 'Showing {visible} of {returned} returned rows ({total} total).',
  reportTruncated: 'Details are truncated.',
  partialResult: 'Partial result',
  replayedResult: 'Idempotent replay',
  inputRequired: 'Provide valid import input first.',
  previewReady: 'Preview ready. Review the report before applying.',
  previewIneligible: 'This preview cannot be applied.',
  reconcileRequired: 'Reconcile the current import attempt before starting another.',
  unknownOutcome: 'The apply outcome is unknown or retryable. Retrying will reuse the same attempt.',
  importFailed: 'Import failed.',
  unavailableSource: 'This import source is unavailable.',
  discardTitle: 'Discard current import?',
  discardSourceChange: 'Switching sources will discard the selected input and current preview.',
  discard: 'Discard and continue',
  cancel: 'Cancel',
};

const defaultDropzoneCopy: FileDropzoneCopy = {
  browse: 'Choose a file or drag and drop it here',
  guidance: 'Select a supported import file.',
  remove: 'Remove selected file',
  invalid: 'The selected file is not supported.',
  tooLarge: 'The selected file exceeds the client-visible size limit.',
  samplesLabel: 'Import samples',
};

let importModalSequence = 0;

export function formatFileSize(bytes: number): string {
  return formatByteSize(bytes, {
    zeroFallback: '0 Bytes',
    invalidFallback: '0 Bytes',
    unitLabels: ['Bytes', 'KB', 'MB', 'GB'],
    precisionByUnit: [0, 2, 2, 2],
    trimTrailingZeros: true,
  }) as string;
}

function isAccepted(file: File, accept: string): boolean {
  const rules = accept.split(',').map((value) => value.trim().toLowerCase()).filter(Boolean);
  if (rules.length === 0) return true;
  const filename = file.name.toLowerCase();
  const mime = file.type.toLowerCase();
  return rules.some((rule) => {
    if (rule.startsWith('.')) return filename.endsWith(rule);
    if (rule.endsWith('/*')) return mime.startsWith(rule.slice(0, -1));
    return mime === rule;
  });
}

function listen(target: EventTarget, event: string, handler: EventListener): () => void {
  target.addEventListener(event, handler);
  return () => target.removeEventListener(event, handler);
}

function formatCopy(template: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.split(`{${key}}`).join(String(value)),
    template,
  );
}

/** Root-scoped file intake. It never reads or parses file contents. */
export class FileDropzone {
  private readonly options: FileDropzoneOptions;
  private readonly copy: FileDropzoneCopy;
  private readonly cleanup: Array<() => void> = [];
  private input: HTMLInputElement | null = null;
  private selected: File | null = null;
  private dragDepth = 0;
  private disabled = false;

  constructor(options: FileDropzoneOptions) {
    this.options = options;
    this.copy = { ...defaultDropzoneCopy, ...options.copy };
    this.render();
    this.bind();
  }

  get file(): File | null {
    return this.selected;
  }

  setFile(file: File | null, notify = true): boolean {
    if (file && this.options.maxBytes && file.size > this.options.maxBytes) {
      this.options.onInvalid?.(this.copy.tooLarge);
      return false;
    }
    if (file && this.options.accept && !isAccepted(file, this.options.accept)) {
      this.options.onInvalid?.(this.copy.invalid);
      return false;
    }
    this.selected = file;
    this.update();
    if (notify) this.options.onChange?.(file);
    return true;
  }

  reset(): void {
    if (this.input) this.input.value = '';
    this.setFile(null);
  }

  setDisabled(disabled: boolean): void {
    this.disabled = disabled;
    if (this.input) this.input.disabled = disabled;
    this.options.root.setAttribute('aria-disabled', String(disabled));
    this.options.root.querySelectorAll<HTMLButtonElement>('button').forEach((button) => {
      button.disabled = disabled;
    });
  }

  destroy(): void {
    this.cleanup.splice(0).forEach((dispose) => dispose());
    this.selected = null;
    this.input = null;
    this.dragDepth = 0;
    this.options.root.removeAttribute('data-drag-active');
  }

  private render(): void {
    const guidance = this.options.guidance || this.copy.guidance;
    const samples = (this.options.samples || []).map((sample) =>
      `<a class="go-admin-import__sample" href="${escapeHtml(sample.href)}">${escapeHtml(sample.label)}</a>`,
    ).join('');
    this.options.root.innerHTML = `
      <div class="go-admin-import__dropzone" data-import-dropzone tabindex="0" role="button">
        <input data-import-file type="file" class="go-admin-import__file-input" accept="${escapeHtml(this.options.accept || '')}">
        <div data-import-empty>
          <strong>${escapeHtml(this.copy.browse)}</strong>
          <span>${escapeHtml(guidance)}</span>
        </div>
        <div data-import-selected hidden>
          <strong data-import-file-name></strong>
          <span data-import-file-size></span>
          <button data-import-remove type="button">${escapeHtml(this.copy.remove)}</button>
        </div>
      </div>
      ${samples ? `<nav class="go-admin-import__samples" aria-label="${escapeHtml(this.copy.samplesLabel)}">${samples}</nav>` : ''}
    `;
    this.input = this.options.root.querySelector<HTMLInputElement>('[data-import-file]');
  }

  private bind(): void {
    const dropzone = this.options.root.querySelector<HTMLElement>('[data-import-dropzone]');
    const remove = this.options.root.querySelector<HTMLElement>('[data-import-remove]');
    if (!dropzone || !this.input) return;
    this.cleanup.push(listen(this.input, 'change', () => {
      this.setFile(this.input?.files?.[0] || null);
    }));
    this.cleanup.push(listen(dropzone, 'keydown', (rawEvent) => {
      const event = rawEvent as KeyboardEvent;
      if (!this.disabled && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        this.input?.click();
      }
    }));
    this.cleanup.push(listen(dropzone, 'click', (event) => {
      if (!this.disabled && event.target === dropzone) this.input?.click();
    }));
    for (const name of ['dragenter', 'dragover']) {
      this.cleanup.push(listen(dropzone, name, (rawEvent) => {
        const event = rawEvent as DragEvent;
        event.preventDefault();
        if (this.disabled) return;
        if (name === 'dragenter') this.dragDepth += 1;
        this.options.root.setAttribute('data-drag-active', 'true');
      }));
    }
    this.cleanup.push(listen(dropzone, 'dragleave', (rawEvent) => {
      rawEvent.preventDefault();
      this.dragDepth = Math.max(0, this.dragDepth - 1);
      if (this.dragDepth === 0) this.options.root.removeAttribute('data-drag-active');
    }));
    this.cleanup.push(listen(dropzone, 'drop', (rawEvent) => {
      const event = rawEvent as DragEvent;
      event.preventDefault();
      this.dragDepth = 0;
      this.options.root.removeAttribute('data-drag-active');
      if (!this.disabled) this.setFile(event.dataTransfer?.files?.[0] || null);
    }));
    if (remove) {
      this.cleanup.push(listen(remove, 'click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!this.disabled) this.reset();
      }));
    }
  }

  private update(): void {
    const empty = this.options.root.querySelector<HTMLElement>('[data-import-empty]');
    const selected = this.options.root.querySelector<HTMLElement>('[data-import-selected]');
    const name = this.options.root.querySelector<HTMLElement>('[data-import-file-name]');
    const size = this.options.root.querySelector<HTMLElement>('[data-import-file-size]');
    if (empty) empty.hidden = Boolean(this.selected);
    if (selected) selected.hidden = !this.selected;
    if (name) name.textContent = this.selected?.name || '';
    if (size) size.textContent = this.selected ? formatFileSize(this.selected.size) : '';
  }
}

function reportValue(row: ImportReportRow, column: ImportReportColumn): ImportSafeValue {
  if (column.value) return column.value(row);
  switch (column.key) {
    case 'reference': return row.reference;
    case 'outcome': return row.outcome;
    case 'action': return row.action || '';
    case 'fields': return (row.fields || []).join(', ');
    case 'codes': return (row.codes || []).join(', ');
    case 'message': return row.message || '';
    default: return row.metadata?.[column.key] ?? '';
  }
}

function matchesFilter(row: ImportReportRow, filter: ImportReportFilter): boolean {
  if (filter.predicate) return Boolean(filter.predicate(row));
  if (filter.outcome && row.outcome !== filter.outcome) return false;
  if (filter.action && row.action !== filter.action) return false;
  if (filter.code && !(row.codes || []).includes(filter.code)) return false;
  return true;
}

/** Safe, data-driven import report renderer. */
export class ImportReportView {
  private readonly root: HTMLElement;
  private readonly columns: readonly ImportReportColumn[];
  private readonly filters: readonly ImportReportFilter[];
  private readonly noRows: string;
  private readonly copy: Pick<BulkImportCopy,
    'reportFiltersLabel' | 'allRows' | 'reportBounds' | 'reportTruncated' | 'partialResult' | 'replayedResult'>;
  private report: ImportReportData | null = null;
  private activeFilter = 'all';

  constructor(root: HTMLElement, options: {
    columns?: readonly ImportReportColumn[];
    filters?: readonly ImportReportFilter[];
    noRows?: string;
    copy?: Partial<Pick<BulkImportCopy,
      'reportFiltersLabel' | 'allRows' | 'reportBounds' | 'reportTruncated' | 'partialResult' | 'replayedResult'>>;
  } = {}) {
    this.root = root;
    this.columns = options.columns || [
      { key: 'reference', label: 'Row' },
      { key: 'outcome', label: 'Outcome' },
      { key: 'action', label: 'Action' },
      { key: 'message', label: 'Details' },
    ];
    this.filters = options.filters || [];
    this.noRows = options.noRows || defaultCopy.noRows;
    this.copy = {
      reportFiltersLabel: defaultCopy.reportFiltersLabel,
      allRows: defaultCopy.allRows,
      reportBounds: defaultCopy.reportBounds,
      reportTruncated: defaultCopy.reportTruncated,
      partialResult: defaultCopy.partialResult,
      replayedResult: defaultCopy.replayedResult,
      ...options.copy,
    };
  }

  render(report: ImportReportData): void {
    const rows = Array.isArray(report.rows) ? report.rows.slice() : [];
    const totalRows = Math.max(rows.length, Number(report.bounds?.totalRows) || 0);
    this.report = {
      ...report,
      metrics: Array.isArray(report.metrics) ? report.metrics.slice() : [],
      rows,
      bounds: {
        returnedRows: rows.length,
        totalRows,
        truncated: Boolean(report.bounds?.truncated || totalRows > rows.length),
        continuation: report.bounds?.continuation,
      },
    };
    this.activeFilter = 'all';
    this.draw();
  }

  clear(): void {
    this.report = null;
    this.root.replaceChildren();
  }

  private draw(): void {
    const report = this.report;
    if (!report) return;
    this.root.replaceChildren();
    this.root.setAttribute('data-phase', report.phase);

    const metrics = document.createElement('div');
    metrics.className = 'go-admin-import__metrics';
    for (const metric of report.metrics) {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'go-admin-import__metric';
      card.dataset.tone = metric.tone || 'neutral';
      card.disabled = !metric.filter;
      card.append(Object.assign(document.createElement('strong'), { textContent: String(metric.value) }));
      card.append(Object.assign(document.createElement('span'), { textContent: metric.label }));
      if (metric.filter) card.addEventListener('click', () => { this.activeFilter = metric.filter!.key; this.draw(); });
      metrics.appendChild(card);
    }
    this.root.appendChild(metrics);

    const availableFilters = [
      { key: 'all', label: this.copy.allRows } as ImportReportFilter,
      ...this.filters,
      ...report.metrics.flatMap((metric) => metric.filter ? [metric.filter] : []),
    ].filter((filter, index, all) => all.findIndex((candidate) => candidate.key === filter.key) === index);
    if (availableFilters.length > 1) {
      const controls = document.createElement('div');
      controls.className = 'go-admin-import__filters';
      controls.setAttribute('role', 'toolbar');
      controls.setAttribute('aria-label', this.copy.reportFiltersLabel);
      for (const filter of availableFilters) {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = filter.label;
        button.dataset.active = String(filter.key === this.activeFilter);
        button.addEventListener('click', () => { this.activeFilter = filter.key; this.draw(); });
        controls.appendChild(button);
      }
      this.root.appendChild(controls);
    }

    const filter = availableFilters.find((candidate) => candidate.key === this.activeFilter);
    const rows = filter && filter.key !== 'all' ? report.rows.filter((row) => matchesFilter(row, filter)) : report.rows;
    const bounds = document.createElement('p');
    bounds.className = 'go-admin-import__bounds';
    bounds.textContent = [
      formatCopy(this.copy.reportBounds, {
        visible: rows.length,
        returned: report.bounds.returnedRows,
        total: report.bounds.totalRows,
      }),
      report.bounds.truncated ? this.copy.reportTruncated : '',
    ].filter(Boolean).join(' ');
    this.root.appendChild(bounds);

    const scroller = document.createElement('div');
    scroller.className = 'go-admin-import__report-scroll';
    scroller.tabIndex = 0;
    const table = document.createElement('table');
    table.className = 'go-admin-import__report-table';
    const head = document.createElement('thead');
    const headRow = document.createElement('tr');
    for (const column of this.columns) {
      const cell = document.createElement('th');
      cell.scope = 'col';
      cell.textContent = column.label;
      headRow.appendChild(cell);
    }
    head.appendChild(headRow);
    table.appendChild(head);
    const body = document.createElement('tbody');
    if (rows.length === 0) {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.colSpan = Math.max(1, this.columns.length);
      cell.textContent = this.noRows;
      row.appendChild(cell);
      body.appendChild(row);
    } else {
      for (const item of rows) {
        const row = document.createElement('tr');
        row.dataset.outcome = item.outcome || 'unknown';
        row.dataset.action = item.action || '';
        for (const column of this.columns) {
          const cell = document.createElement('td');
          const value = reportValue(item, column);
          cell.textContent = value === null ? '' : String(value);
          row.appendChild(cell);
        }
        body.appendChild(row);
      }
    }
    table.appendChild(body);
    scroller.appendChild(table);
    this.root.appendChild(scroller);

    const flags = [report.partial ? this.copy.partialResult : '', report.replayed ? this.copy.replayedResult : ''].filter(Boolean);
    if (report.bounds.continuation?.available && report.bounds.continuation.label) flags.push(report.bounds.continuation.label);
    if (flags.length) {
      const note = document.createElement('p');
      note.className = 'go-admin-import__flags';
      note.textContent = flags.join(' · ');
      this.root.appendChild(note);
    }
  }
}

function defaultAttemptFactory(): ImportAttemptContext {
  const random = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return Object.freeze({ attemptId: random, idempotencyKey: random });
}

/** Canonical modal + file/custom source + report workflow composition. */
export class BulkImportModal extends Modal {
  private readonly config: BulkImportModalOptions;
  private readonly copy: BulkImportCopy;
  private readonly instanceID = `go-admin-bulk-import-${++importModalSequence}`;
  private workflowState: ImportWorkflowState = 'idle';
  private sourceIndex = 0;
  private selectedMode: ImportModeDescriptor;
  private currentInput: unknown = null;
  private previewState: unknown = null;
  private eligibility: ImportApplyEligibility = { allowed: false };
  private attempt: ImportAttemptContext | null = null;
  private attemptTerminal = true;
  private report: ImportReportData | null = null;
  private response: unknown = null;
  private aborter: AbortController | null = null;
  private dropzone: FileDropzone | null = null;
  private panelCleanup: (() => void) | null = null;
  private reportView: ImportReportView | null = null;
  private busy = false;

  constructor(options: BulkImportModalOptions) {
    if (!options.root || options.sources.length === 0) throw new Error('BulkImportModal requires a root and at least one source.');
    super({
      size: '4xl',
      ariaLabel: options.copy?.title || defaultCopy.title,
      initialFocus: '[data-import-source-tab]',
      maximizable: true,
      containerClass: 'go-admin-import',
    });
    this.config = options;
    this.copy = { ...defaultCopy, ...options.copy };
    this.sourceIndex = Math.max(0, options.sources.findIndex((source) => source.available !== false));
    this.selectedMode = this.resolveModes(this.source)[0];
  }

  get state(): ImportWorkflowState {
    return this.workflowState;
  }

  get activeAttempt(): Readonly<ImportAttemptContext> | null {
    return this.attempt;
  }

  get isFullscreen(): boolean {
    return this.isMaximized;
  }

  open(): void {
    void this.show();
  }

  close(): void {
    this.hide();
  }

  toggleFullscreen(): boolean {
    const control = this.container?.querySelector<HTMLElement>('[data-import-maximize]');
    const value = this.toggleMaximized(control);
    this.updateMaximizeControl();
    return value;
  }

  async reset(): Promise<boolean> {
    if (!await this.reconcileAttempt()) return false;
    this.clearWorkflow();
    this.renderSourcePanel();
    this.setStatus(this.copy.idleStatus);
    this.updateActions();
    return true;
  }

  override destroy(): void {
    if (this.attempt && !this.attemptTerminal) void this.source.onReconcileAttempt?.(this.attempt);
    this.aborter?.abort();
    this.releasePanel();
    super.destroy();
  }

  protected renderContent(): string {
    const description = this.copy.description ? `<p id="${this.instanceID}-description">${escapeHtml(this.copy.description)}</p>` : '';
    return `
      <header class="go-admin-modal__header go-admin-import__header">
        <div><h2 id="${this.instanceID}-title">${escapeHtml(this.copy.title)}</h2>${description}</div>
        <div class="go-admin-import__header-actions">
          <button type="button" data-import-maximize aria-expanded="${String(this.isMaximized)}">${escapeHtml(this.isMaximized ? this.copy.restore : this.copy.maximize)}</button>
          <button type="button" class="go-admin-modal__close" data-import-close aria-label="${escapeHtml(this.copy.close)}">×</button>
        </div>
      </header>
      <div class="go-admin-import__sources" role="tablist" aria-label="${escapeHtml(this.copy.sourceTabsLabel)}">
        ${this.config.sources.map((source, index) => `<button id="${this.instanceID}-source-tab-${index}" type="button" role="tab" data-import-source-tab="${index}" aria-controls="${this.instanceID}-source-panel" aria-selected="${String(index === this.sourceIndex)}" ${source.available === false ? 'disabled' : ''}>${escapeHtml(source.label)}</button>`).join('')}
      </div>
      <div class="go-admin-modal__body go-admin-import__body">
        <section id="${this.instanceID}-source-panel" role="tabpanel" aria-labelledby="${this.instanceID}-source-tab-${this.sourceIndex}" data-import-source-panel>
          <section class="go-admin-import__mode" data-import-mode></section>
          <section class="go-admin-import__input" data-import-input></section>
        </section>
        <section class="go-admin-import__report" data-import-report hidden></section>
        <p class="go-admin-import__error" data-import-error role="alert" hidden></p>
      </div>
      <footer class="go-admin-modal__footer go-admin-import__footer">
        <p data-import-status role="status" aria-live="polite">${escapeHtml(this.copy.idleStatus)}</p>
        <div>
          <button type="button" data-import-reset hidden>${escapeHtml(this.copy.importAnother)}</button>
          <button type="button" data-import-primary disabled>${escapeHtml(this.copy.preview)}</button>
        </div>
      </footer>
    `;
  }

  protected bindContentEvents(): void {
    this.container?.querySelector('[data-import-close]')?.addEventListener('click', () => this.requestClose());
    this.container?.querySelector('[data-import-maximize]')?.addEventListener('click', () => this.toggleFullscreen());
    this.container?.querySelectorAll<HTMLElement>('[data-import-source-tab]').forEach((tab) => {
      tab.addEventListener('click', () => void this.activateSource(Number(tab.dataset.importSourceTab)));
      tab.addEventListener('keydown', (event) => this.onSourceKeydown(event));
    });
    this.container?.querySelector('[data-import-primary]')?.addEventListener('click', () => void this.advance());
    this.container?.querySelector('[data-import-reset]')?.addEventListener('click', () => void this.reset());
    const reportRoot = this.container?.querySelector<HTMLElement>('[data-import-report]');
    if (reportRoot) {
      this.reportView = new ImportReportView(reportRoot, {
        columns: this.config.columns,
        filters: this.config.filters,
        noRows: this.copy.noRows,
        copy: this.copy,
      });
    }
    this.renderSourcePanel();
    if (this.report) this.showReport(this.report);
    this.updateActions();
  }

  protected onAfterHide(): void {
    this.releasePanel();
    this.reportView = null;
  }

  protected onMaximizedChange(): void {
    this.updateMaximizeControl();
  }

  protected onBeforeHide(): boolean {
    return !this.busy;
  }

  private get source(): AnyImportSourceDescriptor {
    return this.config.sources[this.sourceIndex];
  }

  private resolveModes(source: AnyImportSourceDescriptor): ImportModeDescriptor[] {
    const modes = source.modes?.length ? Array.from(source.modes) : [source.mode];
    return modes.length ? modes : [source.mode];
  }

  private setState(state: ImportWorkflowState): void {
    this.workflowState = state;
    this.container?.setAttribute('data-import-state', state);
    this.config.onStateChange?.(state);
  }

  private setStatus(message: string): void {
    const status = this.container?.querySelector<HTMLElement>('[data-import-status]');
    if (status) status.textContent = message;
  }

  private setError(message = ''): void {
    const error = this.container?.querySelector<HTMLElement>('[data-import-error]');
    if (!error) return;
    error.hidden = !message;
    error.textContent = message;
  }

  private updateMaximizeControl(): void {
    const control = this.container?.querySelector<HTMLElement>('[data-import-maximize]');
    if (!control) return;
    control.textContent = this.isMaximized ? this.copy.restore : this.copy.maximize;
    control.setAttribute('aria-expanded', String(this.isMaximized));
  }

  private renderSourcePanel(): void {
    this.releasePanel();
    const inputRoot = this.container?.querySelector<HTMLElement>('[data-import-input]');
    const modeRoot = this.container?.querySelector<HTMLElement>('[data-import-mode]');
    if (!inputRoot || !modeRoot) return;
    inputRoot.replaceChildren();
    modeRoot.replaceChildren();

    const source = this.source;
    this.renderModeControls(source, modeRoot);
    if (source.available === false) {
      inputRoot.textContent = source.unavailableReason || this.copy.unavailableSource;
      this.updateActions();
      return;
    }
    if (source.kind === 'file') this.mountFileSource(source, inputRoot);
    else if (source.mountInput) this.mountCustomSource(source, inputRoot);
    this.updateActions();
  }

  private renderModeControls(source: AnyImportSourceDescriptor, modeRoot: HTMLElement): void {
    const modes = this.resolveModes(source);
    if (!modes.some((mode) => mode.key === this.selectedMode?.key)) this.selectedMode = modes[0];
    if (source.selectableModes && modes.length > 1) {
      const label = document.createElement('label');
      label.textContent = this.copy.modeLabel;
      const select = document.createElement('select');
      for (const mode of modes) select.appendChild(Object.assign(document.createElement('option'), { value: mode.key, textContent: mode.label }));
      select.value = this.selectedMode.key;
      select.addEventListener('change', () => {
        if (this.hasUnresolvedAttempt()) {
          select.value = this.selectedMode.key;
          this.setStatus(this.copy.reconcileRequired);
          return;
        }
        this.selectedMode = modes.find((mode) => mode.key === select.value) || modes[0];
        this.invalidatePreview();
        this.renderModeDescription(modeRoot);
      });
      label.appendChild(select);
      modeRoot.appendChild(label);
    }
    this.renderModeDescription(modeRoot);
  }

  private mountFileSource(source: AnyImportSourceDescriptor, inputRoot: HTMLElement): void {
    this.dropzone = new FileDropzone({
      root: inputRoot,
      ...(source.file || {}),
      copy: {
        ...(source.file?.copy || {}),
        samplesLabel: source.file?.copy?.samplesLabel || this.copy.samplesLabel,
      },
      onChange: (file) => {
        if (this.hasUnresolvedAttempt()) {
          this.dropzone?.setFile(this.currentInput instanceof File ? this.currentInput : null, false);
          this.setStatus(this.copy.reconcileRequired);
          this.updateActions();
          return;
        }
        this.currentInput = file;
        this.invalidatePreview(file ? this.copy.selectedStatus : this.copy.idleStatus);
      },
      onInvalid: (message) => this.setError(message),
    });
    if (this.currentInput instanceof File) this.dropzone.setFile(this.currentInput, false);
  }

  private mountCustomSource(source: AnyImportSourceDescriptor, inputRoot: HTMLElement): void {
    let mounting = true;
    const cleanup = source.mountInput?.(inputRoot, {
      setReady: (ready) => {
        this.currentInput = ready ? source.readInput?.(inputRoot) : null;
        if (mounting && (this.workflowState === 'idle' || this.workflowState === 'selected')) {
          this.setState(ready ? 'selected' : 'idle');
        }
        this.updateActions();
      },
      inputChanged: (ready = true) => {
        if (this.hasUnresolvedAttempt()) {
          this.setStatus(this.copy.reconcileRequired);
          this.updateActions();
          return;
        }
        this.currentInput = ready ? source.readInput?.(inputRoot) : null;
        this.invalidatePreview(ready ? this.copy.selectedStatus : this.copy.idleStatus);
      },
      setStatus: (message) => this.setStatus(message),
    });
    mounting = false;
    if (typeof cleanup === 'function') this.panelCleanup = cleanup;
    this.currentInput = source.readInput?.(inputRoot) ?? this.currentInput;
    if (this.workflowState === 'idle' && (source.isInputReady?.(this.currentInput) ?? this.currentInput !== null)) this.setState('selected');
  }

  private renderModeDescription(root: HTMLElement): void {
    root.querySelector('[data-import-mode-display]')?.remove();
    const display = document.createElement('div');
    display.dataset.importModeDisplay = 'true';
    const label = document.createElement('strong');
    label.textContent = this.selectedMode.label;
    display.appendChild(label);
    if (this.selectedMode.description) display.appendChild(Object.assign(document.createElement('p'), { textContent: this.selectedMode.description }));
    root.appendChild(display);
  }

  private releasePanel(): void {
    this.dropzone?.destroy();
    this.dropzone = null;
    this.panelCleanup?.();
    this.panelCleanup = null;
  }

  private hasUnresolvedAttempt(): boolean {
    return Boolean(this.attempt && !this.attemptTerminal);
  }

  private hasDiscardableWork(): boolean {
    if (['complete', 'terminal-error'].includes(this.workflowState) && !this.hasUnresolvedAttempt()) {
      return false;
    }
    return this.currentInput !== null
      || this.previewState !== null
      || this.report !== null
      || this.attempt !== null
      || !['idle', 'selected'].includes(this.workflowState);
  }

  private async reconcileAttempt(): Promise<boolean> {
    if (!this.attempt || this.attemptTerminal) return true;
    const reconcile = this.source.onReconcileAttempt;
    if (!reconcile || !await reconcile(this.attempt)) {
      this.setStatus(this.copy.reconcileRequired);
      return false;
    }
    this.attemptTerminal = true;
    return true;
  }

  private clearWorkflow(): void {
    this.aborter?.abort();
    this.aborter = null;
    this.attempt = null;
    this.attemptTerminal = true;
    this.previewState = null;
    this.eligibility = { allowed: false };
    this.report = null;
    this.response = null;
    this.currentInput = null;
    this.setState('idle');
    this.reportView?.clear();
  }

  private invalidatePreview(status?: string): void {
    this.aborter?.abort();
    this.aborter = null;
    this.previewState = null;
    this.eligibility = { allowed: false };
    this.report = null;
    this.response = null;
    if (this.attemptTerminal) this.attempt = null;
    this.reportView?.clear();
    const ready = this.inputReady(this.currentInput);
    this.setState(ready ? 'selected' : 'idle');
    this.setError();
    this.setStatus(status || (ready ? this.copy.selectedStatus : this.copy.idleStatus));
    this.updateActions();
  }

  private async confirmSourceDiscard(next: AnyImportSourceDescriptor): Promise<boolean> {
    if (!this.hasDiscardableWork()) return true;
    if (!await this.reconcileAttempt()) return false;
    const context: ImportDiscardContext = {
      reason: 'source-switch',
      state: this.workflowState,
      sourceKey: this.source.key,
      nextSourceKey: next.key,
      hasInput: this.currentInput !== null,
      hasPreview: this.previewState !== null,
      attempt: this.attempt || undefined,
    };
    const confirm = this.source.confirmDiscard || this.config.confirmDiscard;
    if (confirm) return Boolean(await confirm(context));
    return ConfirmModal.confirm(this.copy.discardSourceChange, {
      title: this.copy.discardTitle,
      confirmText: this.copy.discard,
      cancelText: this.copy.cancel,
    });
  }

  private async activateSource(index: number): Promise<void> {
    const next = this.config.sources[index];
    if (!next || next.available === false || index === this.sourceIndex || this.busy) return;
    if (!await this.confirmSourceDiscard(next)) return;
    this.clearWorkflow();
    this.sourceIndex = index;
    this.selectedMode = this.resolveModes(next)[0];
    this.container?.querySelectorAll<HTMLElement>('[data-import-source-tab]').forEach((tab) => {
      const selected = Number(tab.dataset.importSourceTab) === index;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
    this.container?.querySelector<HTMLElement>('[data-import-source-panel]')
      ?.setAttribute('aria-labelledby', `${this.instanceID}-source-tab-${index}`);
    this.renderSourcePanel();
    this.setStatus(next.help || this.copy.idleStatus);
  }

  private onSourceKeydown(event: KeyboardEvent): void {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const enabled = this.config.sources.map((source, index) => source.available === false ? -1 : index).filter((index) => index >= 0);
    const current = enabled.indexOf(this.sourceIndex);
    const offset = event.key === 'ArrowRight' ? 1 : -1;
    const next = event.key === 'Home'
      ? enabled[0]
      : event.key === 'End'
        ? enabled[enabled.length - 1]
        : enabled[(current + offset + enabled.length) % enabled.length];
    void this.activateSource(next).then(() => this.container?.querySelector<HTMLElement>(`[data-import-source-tab="${next}"]`)?.focus());
  }

  private readInput(): unknown {
    const root = this.container?.querySelector<HTMLElement>('[data-import-input]');
    if (this.source.kind === 'file') return this.dropzone?.file || this.currentInput;
    return root ? this.source.readInput?.(root) ?? this.currentInput : this.currentInput;
  }

  private inputReady(input: unknown): boolean {
    return this.source.isInputReady ? this.source.isInputReady(input) : input !== null && input !== undefined;
  }

  private async advance(): Promise<void> {
    if (this.busy) return;
    // Unknown/retryable applies must replay the exact input snapshot and
    // attempt context; custom panels cannot substitute newly edited values.
    const input = this.hasUnresolvedAttempt() ? this.currentInput : this.readInput();
    this.currentInput = input;
    if (!this.inputReady(input)) {
      this.setStatus(this.copy.inputRequired);
      return;
    }
    if (this.source.workflow === 'single') await this.submitSingle(input);
    else if ((this.workflowState === 'preview-ready' || this.workflowState === 'recoverable-error') && this.previewState !== null && this.eligibility.allowed) await this.applyPreview(input);
    else await this.preview(input);
  }

  private startBusy(state: ImportWorkflowState, status: string): AbortSignal {
    this.busy = true;
    this.aborter?.abort();
    this.aborter = new AbortController();
    this.setState(state);
    this.setStatus(status);
    this.setError();
    this.dropzone?.setDisabled(true);
    this.updateActions();
    return this.aborter.signal;
  }

  private stopBusy(): void {
    this.busy = false;
    this.updateActions();
  }

  private async submitSingle(input: unknown): Promise<void> {
    if (!this.source.submit || !this.source.adaptSubmit) throw new Error('Single-step source is missing its transport adapter.');
    const signal = this.startBusy('submitting', this.copy.applyingStatus);
    try {
      const response = await this.source.submit(input, { signal, mode: this.selectedMode });
      const report = this.source.adaptSubmit(response, this.selectedMode);
      await this.complete(response, report);
    } catch (error) {
      this.handleError(error, false);
    } finally {
      this.stopBusy();
    }
  }

  private async preview(input: unknown): Promise<void> {
    if (!this.source.preview || !this.source.adaptPreview) throw new Error('Preview source is missing its preview adapter.');
    const signal = this.startBusy('previewing', this.copy.previewingStatus);
    try {
      const response = await this.source.preview(input, { signal, mode: this.selectedMode });
      const adapted = this.source.adaptPreview(response, this.selectedMode);
      this.previewState = adapted.state;
      this.eligibility = adapted.eligibility;
      this.response = response;
      this.report = adapted.report;
      this.setState('preview-ready');
      this.setStatus(adapted.eligibility.allowed ? this.copy.previewReady : adapted.eligibility.reason || this.copy.previewIneligible);
      this.showReport(adapted.report);
    } catch (error) {
      this.handleError(error, false);
    } finally {
      this.stopBusy();
    }
  }

  private async applyPreview(input: unknown): Promise<void> {
    if (!this.source.apply || !this.source.adaptApply || this.previewState === null || !this.eligibility.allowed) return;
    const confirmed = await ConfirmModal.confirm(this.selectedMode.confirmation || this.copy.confirmApply, {
      title: this.selectedMode.label,
      confirmText: this.copy.apply,
      cancelText: this.copy.cancel,
    });
    if (!confirmed) return;
    if (!this.attempt || this.attemptTerminal) this.attempt = Object.freeze((this.config.attemptFactory || defaultAttemptFactory)());
    this.attemptTerminal = false;
    const signal = this.startBusy('applying', this.copy.applyingStatus);
    try {
      const response = await this.source.apply(input, this.previewState, { signal, mode: this.selectedMode, attempt: this.attempt });
      const report = this.source.adaptApply(response, this.selectedMode);
      this.attemptTerminal = true;
      await this.complete(response, report);
    } catch (error) {
      this.handleError(error, true);
    } finally {
      this.stopBusy();
    }
  }

  private async complete(response: unknown, report: ImportReportData): Promise<void> {
    this.response = response;
    this.report = report;
    this.setState('complete');
    this.setStatus(this.copy.completeStatus);
    this.showReport(report);
    const completion: ImportCompletion = { sourceKey: this.source.key, report, response, attempt: this.attempt || undefined };
    const failures: unknown[] = [];
    for (const callback of [this.source.onComplete, this.config.onComplete]) {
      if (!callback) continue;
      try {
        await callback(completion);
      } catch (error) {
        failures.push(error);
      }
    }
    if (failures.length === 0) return;
    this.setError(this.copy.completionError);
    for (const error of failures) {
      for (const callback of [this.source.onCompletionError, this.config.onCompletionError]) {
        try {
          await callback?.(error, completion);
        } catch {
          // Completion observers cannot downgrade or replay a committed import.
        }
      }
    }
  }

  private handleError(error: unknown, applying: boolean): void {
    const transportError = error instanceof ImportTransportError ? error : null;
    const terminal = transportError?.outcome === 'terminal';
    if (applying && terminal) this.attemptTerminal = true;
    this.setState(terminal ? 'terminal-error' : 'recoverable-error');
    const message = error instanceof Error ? error.message : this.copy.importFailed;
    this.setError(message);
    this.setStatus(applying && !terminal ? this.copy.unknownOutcome : message);
  }

  private showReport(report: ImportReportData): void {
    const root = this.container?.querySelector<HTMLElement>('[data-import-report]');
    if (root) root.hidden = false;
    this.reportView?.render(report);
  }

  private updateActions(): void {
    const primary = this.container?.querySelector<HTMLButtonElement>('[data-import-primary]');
    const reset = this.container?.querySelector<HTMLButtonElement>('[data-import-reset]');
    if (!primary || !reset) return;
    const input = this.hasUnresolvedAttempt() ? this.currentInput : this.readInput();
    const ready = this.inputReady(input) && this.source.available !== false;
    const settled = ['complete', 'terminal-error'].includes(this.workflowState);
    const inputLocked = this.busy || this.hasUnresolvedAttempt() || settled;
    primary.disabled = this.busy || settled || !ready || (this.source.workflow === 'preview-apply' && this.workflowState === 'preview-ready' && !this.eligibility.allowed);
    if (this.busy) primary.textContent = this.workflowState === 'previewing' ? this.copy.previewingStatus : this.copy.applyingStatus;
    else if (this.workflowState === 'recoverable-error') primary.textContent = this.copy.retry;
    else if (this.source.workflow === 'single') primary.textContent = this.copy.submit;
    else if (this.workflowState === 'preview-ready') primary.textContent = this.copy.apply;
    else primary.textContent = this.copy.preview;
    reset.hidden = !['complete', 'terminal-error'].includes(this.workflowState);
    this.dropzone?.setDisabled(inputLocked);
    const inputRoot = this.container?.querySelector<HTMLElement>('[data-import-input]');
    if (inputRoot) this.source.setInputDisabled?.(inputRoot, inputLocked);
    this.container?.querySelectorAll<HTMLButtonElement>('[data-import-source-tab]').forEach((tab, index) => {
      tab.disabled = this.busy || this.config.sources[index].available === false;
    });
    this.container?.querySelectorAll<HTMLSelectElement>('[data-import-mode] select').forEach((select) => {
      select.disabled = inputLocked;
    });
  }
}

type LegacyImportModalOptions = {
  modalId?: string;
  endpoint?: string;
  apiBasePath?: string;
  onSuccess?: (summary: Record<string, number>) => void;
  notifier?: { success: (message: string) => void; error: (message: string) => void };
  resourceName?: string;
};

/** @deprecated Configure BulkImportModal directly for new import workflows. */
export class ImportModal extends BulkImportModal {
  constructor(options: LegacyImportModalOptions = {}) {
    const resource = options.resourceName || 'items';
    const endpoint = options.endpoint || `${(options.apiBasePath || '/api').replace(/\/+$/, '')}/import`;
    const root = document.getElementById(options.modalId || 'import-modal') || document.body;
    super({
      root,
      copy: { title: `Import ${resource}`, submit: `Import ${resource}` },
      columns: [
        { key: 'reference', label: '#' },
        { key: 'email', label: 'Email' },
        { key: 'user_id', label: 'User ID' },
        { key: 'outcome', label: 'Status' },
        { key: 'message', label: 'Error' },
      ],
      filters: [
        { key: 'succeeded', label: 'Succeeded', outcome: 'succeeded' },
        { key: 'failed', label: 'Failed', outcome: 'failed' },
      ],
      sources: [{
        key: 'file', label: 'File', workflow: 'single', kind: 'file',
        mode: { key: 'users-owned', label: 'Users import policy' },
        file: { accept: '.csv,.json,text/csv,application/json' },
        submit: async (input, context) => {
          const body = new FormData();
          body.set('file', input as File);
          const response = await httpRequest(endpoint, { method: 'POST', body, signal: context.signal });
          const payload = await response.json();
          return { response, payload };
        },
        adaptSubmit: ({ payload }: any) => legacyUsersReport(payload),
        onComplete: ({ report, response }) => {
          const metrics = Object.fromEntries(report.metrics.map((metric) => [metric.key, metric.value]));
          options.onSuccess?.(metrics);
          const failed = Number(metrics.failed || 0);
          if (failed > 0) options.notifier?.error(String((response as any)?.payload?.error || 'Import completed with errors.'));
          else options.notifier?.success(`${resource} imported successfully.`);
        },
      }],
    });
  }
}

export function legacyUsersReport(payload: any): ImportReportData {
  const summary = payload?.summary || {};
  const rows: ImportReportRow[] = (Array.isArray(payload?.results) ? payload.results : []).map((item: any, index: number) => {
    const failed = Boolean(String(item?.error || '').trim());
    return {
      reference: String(Number.isFinite(item?.index) ? item.index + 1 : index + 1),
      outcome: failed ? 'failed' : 'succeeded',
      action: failed ? 'rejected' : String(item?.status || 'imported'),
      message: failed ? String(item.error) : '',
      metadata: {
        email: item?.email ? String(item.email) : '',
        user_id: item?.user_id ? String(item.user_id) : '',
      },
    };
  });
  return {
    phase: 'complete',
    mode: 'users-owned',
    metrics: [
      { key: 'processed', label: 'Processed', value: Number(summary.processed) || 0 },
      { key: 'succeeded', label: 'Succeeded', value: Number(summary.succeeded) || 0, tone: 'success', filter: { key: 'succeeded', label: 'Succeeded', outcome: 'succeeded' } },
      { key: 'failed', label: 'Failed', value: Number(summary.failed) || 0, tone: 'danger', filter: { key: 'failed', label: 'Failed', outcome: 'failed' } },
    ],
    rows,
    bounds: { returnedRows: rows.length, totalRows: Number(summary.processed) || rows.length, truncated: false },
    partial: Number(summary.failed) > 0,
  };
}

export const COMMON_IMPORT_MODES = Object.freeze({
  createOnly: { key: 'create-only', label: 'Create only', description: 'Create new records and leave existing records unchanged.' },
  skipConflicts: { key: 'skip-conflicts', label: 'Skip conflicts', description: 'Skip records that conflict with existing application data.' },
  updateOnly: { key: 'update-only', label: 'Update only', description: 'Update matching records without creating new records.' },
  upsert: { key: 'upsert', label: 'Create or update', description: 'Create missing records and update matching records.' },
} satisfies Record<string, ImportModeDescriptor>);

export default BulkImportModal;
