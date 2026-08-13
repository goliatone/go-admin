/**
 * Public bulk-import interaction primitives.
 *
 * Applications own parsing, validation, authorization, conflict policy,
 * persistence, transactions, receipts, idempotency and audit. This module owns
 * only accessible file intake, modal/workflow lifecycle and safe report
 * presentation.
 */
import { Modal } from './modal.js';
export type ImportWorkflowState = 'idle' | 'selected' | 'submitting' | 'previewing' | 'preview-ready' | 'applying' | 'complete' | 'recoverable-error' | 'terminal-error';
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
/**
 * Row detail and aggregate totals are distinct declared presentations. The
 * renderer never infers one from the other: a source that returns no rows for a
 * positive total is a truthful bounded row report, not an aggregate report.
 */
export type ImportReportDetailMode = 'rows' | 'aggregate';
export interface ImportReportData {
    phase: 'preview' | 'apply' | 'complete';
    mode: string;
    metrics: ImportMetric[];
    rows: ImportReportRow[];
    bounds: ImportReportBounds;
    /** Defaults to `rows` so existing application adapters are unchanged. */
    detailMode?: ImportReportDetailMode;
    run?: Record<string, ImportSafeValue>;
    replayed?: boolean;
    partial?: boolean;
}
export interface ImportReportColumn {
    key: string;
    label: string;
    /** Narrow layouts hide `secondary` columns. Column order is never semantic. */
    priority?: 'primary' | 'secondary';
    value?: (row: Readonly<ImportReportRow>) => ImportSafeValue;
}
/** One allowlisted, localized `report.run` fact. Undeclared keys never render. */
export interface ImportRunField {
    key: string;
    label: string;
    format?: (value: ImportSafeValue) => ImportSafeValue;
}
/**
 * Per-source report vocabulary. Modal-level `columns`/`filters` remain
 * compatibility fallbacks; a source that declares its own presentation wins and
 * is reapplied whenever the active source changes.
 */
export interface ImportReportPresentation {
    columns?: readonly ImportReportColumn[];
    filters?: readonly ImportReportFilter[];
    outcomeLabels?: Readonly<Record<string, string>>;
    outcomeTones?: Readonly<Record<string, ImportMetricTone>>;
    runFields?: readonly ImportRunField[];
    emptyState?: string;
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
export declare class ImportTransportError extends Error {
    readonly outcome: ImportTransportOutcome;
    constructor(message: string, outcome?: ImportTransportOutcome);
}
export interface ImportSourcePanelAPI {
    setReady(ready: boolean): void;
    /** Notify the workflow that custom input changed and any preview is stale. */
    inputChanged(ready?: boolean): void;
    setStatus(message: string): void;
}
export type ImportDiscardReason = 'source-switch' | 'close';
export interface ImportDiscardContext {
    reason: ImportDiscardReason;
    state: ImportWorkflowState;
    sourceKey: string;
    nextSourceKey?: string;
    hasInput: boolean;
    hasPreview: boolean;
    attempt?: Readonly<ImportAttemptContext>;
}
export interface ImportSourceDescriptor<TInput = unknown, TPreview = unknown, TSubmitResponse = unknown, TPreviewResponse = unknown, TApplyResponse = unknown> {
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
    report?: ImportReportPresentation;
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
    reportAggregate: string;
    runDetailsLabel: string;
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
    discardOnClose: string;
    discard: string;
    cancel: string;
    dismiss: string;
    change: string;
    summaryBounds: string;
    busyDismissBlocked: string;
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
    replace: string;
    acceptedTypes: string;
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
export declare function formatFileSize(bytes: number): string;
/** Root-scoped file intake. It never reads or parses file contents. */
export declare class FileDropzone {
    private readonly options;
    private readonly copy;
    private readonly cleanup;
    private input;
    private selected;
    private dragDepth;
    private disabled;
    constructor(options: FileDropzoneOptions);
    get file(): File | null;
    setFile(file: File | null, notify?: boolean): boolean;
    reset(): void;
    setDisabled(disabled: boolean): void;
    destroy(): void;
    private render;
    /**
     * Human-readable accepted types. MIME tokens are dropped rather than echoed,
     * so the hint reads "CSV, JSON" instead of "text/csv, application/json".
     */
    private acceptedTypesHint;
    private bind;
    private update;
}
type ImportReportViewCopy = Pick<BulkImportCopy, 'reportFiltersLabel' | 'allRows' | 'reportBounds' | 'reportTruncated' | 'reportAggregate' | 'runDetailsLabel' | 'partialResult' | 'replayedResult'>;
/** Safe, data-driven import report renderer. */
export declare class ImportReportView {
    private readonly root;
    private readonly fallbackColumns;
    private readonly fallbackFilters;
    private readonly noRows;
    private readonly copy;
    private presentation;
    private report;
    private activeFilter;
    constructor(root: HTMLElement, options?: {
        columns?: readonly ImportReportColumn[];
        filters?: readonly ImportReportFilter[];
        presentation?: ImportReportPresentation;
        noRows?: string;
        copy?: Partial<ImportReportViewCopy>;
    });
    /** Swap the active source's report vocabulary. Clears stale filter state. */
    setPresentation(presentation?: ImportReportPresentation): void;
    private get columns();
    private get filters();
    render(report: ImportReportData): void;
    clear(): void;
    private draw;
    private buildMetrics;
    private availableFilters;
    private buildFilters;
    private buildTable;
    private buildRow;
    /**
     * Renders only source-declared run facts. `report.run` stays open-ended safe
     * metadata; enumerating it into the DOM would leak whatever an adapter adds.
     */
    private drawRunDetails;
}
/** Canonical modal + file/custom source + report workflow composition. */
export declare class BulkImportModal extends Modal {
    private readonly config;
    private readonly copy;
    private readonly instanceID;
    private workflowState;
    private sourceIndex;
    private selectedMode;
    private currentInput;
    private previewState;
    private eligibility;
    private attempt;
    private attemptTerminal;
    private report;
    private response;
    private aborter;
    private dropzone;
    private panelCleanup;
    private reportView;
    private busy;
    /** One-shot authorization for the second pass of a confirmed close. */
    private closeAuthorized;
    /** Repeated dismissal requests while a confirmation is pending are ignored. */
    private closePending;
    constructor(options: BulkImportModalOptions);
    get state(): ImportWorkflowState;
    get activeAttempt(): Readonly<ImportAttemptContext> | null;
    get isFullscreen(): boolean;
    open(): void;
    close(): void;
    toggleFullscreen(): boolean;
    reset(): Promise<boolean>;
    destroy(): void;
    protected renderContent(): string;
    protected bindContentEvents(): void;
    protected onAfterHide(): void;
    protected onMaximizedChange(): void;
    protected onBeforeHide(): boolean;
    private resolveDismissal;
    private get source();
    private resolveModes;
    private setState;
    private setStatus;
    /**
     * The banner is the single visible result surface. It sits above metrics and
     * the row table so partial, replayed, ineligible, uncertain and terminal
     * outcomes are read before the detail they describe, and it renders for
     * errors raised before any report exists.
     */
    private setBanner;
    private setError;
    /** Recompute the banner from the workflow state plus the current report. */
    private refreshBanner;
    /**
     * Phase is derived from workflow state plus real report presence, never from
     * row counts. Compose keeps the body scrollable so short viewports and 200%
     * zoom reach every input; review collapses input to the summary strip and
     * gives the report the remaining bounded scroll.
     */
    private updatePhase;
    /** Compact review-state summary: source, input identity, mode, and Change. */
    private renderSummary;
    /** Return to compose through the existing preview-invalidation path. */
    private requestChange;
    private updateMaximizeControl;
    private renderSourcePanel;
    private renderModeControls;
    private mountFileSource;
    private mountCustomSource;
    private renderModeDescription;
    private releasePanel;
    private hasUnresolvedAttempt;
    private hasDiscardableWork;
    /**
     * Work a confirmed dismissal may discard. An unresolved unknown/retryable
     * apply is deliberately excluded: closing preserves its attempt, input and
     * report so reopening still shows the truthful uncertain outcome.
     */
    private hasDiscardableEditableWork;
    private reconcileAttempt;
    private clearWorkflow;
    private invalidatePreview;
    private confirmSourceDiscard;
    private activateSource;
    private onSourceKeydown;
    private readInput;
    private inputReady;
    private advance;
    private startBusy;
    private stopBusy;
    private submitSingle;
    private preview;
    private applyPreview;
    private complete;
    private handleError;
    private showReport;
    private updateActions;
    private updateFooterActions;
    private primaryActionLabel;
}
type LegacyImportModalOptions = {
    modalId?: string;
    endpoint?: string;
    apiBasePath?: string;
    onSuccess?: (summary: Record<string, number>) => void;
    notifier?: {
        success: (message: string) => void;
        error: (message: string) => void;
    };
    resourceName?: string;
};
/** @deprecated Configure BulkImportModal directly for new import workflows. */
export declare class ImportModal extends BulkImportModal {
    constructor(options?: LegacyImportModalOptions);
}
export declare function legacyUsersReport(payload: any): ImportReportData;
export declare const COMMON_IMPORT_MODES: Readonly<{
    createOnly: {
        key: string;
        label: string;
        description: string;
    };
    skipConflicts: {
        key: string;
        label: string;
        description: string;
    };
    updateOnly: {
        key: string;
        label: string;
        description: string;
    };
    upsert: {
        key: string;
        label: string;
        description: string;
    };
}>;
export default BulkImportModal;
//# sourceMappingURL=import-modal.d.ts.map