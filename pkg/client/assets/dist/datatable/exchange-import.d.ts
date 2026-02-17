/**
 * Exchange Import Component (Phase 4 - TX-048)
 *
 * Provides enhanced import workflow with:
 * - Preview grid for validation results
 * - Selective row apply
 * - Conflict resolution controls
 * - Permission-gated apply action
 */
import type { CapabilityGate } from './capability-gate.js';
import type { ExchangeRowResult, ExchangeImportResult } from '../toast/error-helpers.js';
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
/**
 * Exchange Import component
 */
export declare class ExchangeImport {
    private config;
    private container;
    private state;
    private validationResult;
    private previewRows;
    private selection;
    private applyOptions;
    private error;
    private file;
    private rawData;
    constructor(config: ExchangeImportConfig);
    /**
     * Mount the component to a container
     */
    mount(container: HTMLElement): void;
    /**
     * Unmount and cleanup
     */
    unmount(): void;
    /**
     * Get current state
     */
    getState(): ImportPreviewState;
    /**
     * Get validation result
     */
    getValidationResult(): ExchangeImportResult | null;
    /**
     * Get selected row indices
     */
    getSelectedIndices(): number[];
    /**
     * Set file for import
     */
    setFile(file: File): void;
    /**
     * Set raw data for import
     */
    setRawData(data: string): void;
    /**
     * Validate the import data
     */
    validate(): Promise<ExchangeImportResult | null>;
    /**
     * Apply the import with selected rows
     */
    apply(options?: ImportApplyOptions): Promise<ExchangeImportResult | null>;
    /**
     * Toggle row selection
     */
    toggleRowSelection(index: number): void;
    /**
     * Select all rows
     */
    selectAll(): void;
    /**
     * Deselect all rows
     */
    deselectAll(): void;
    /**
     * Set resolution for a row
     */
    setRowResolution(index: number, resolution: ImportConflictResolution): void;
    /**
     * Set apply option
     */
    setApplyOption<K extends keyof ImportApplyOptions>(key: K, value: ImportApplyOptions[K]): void;
    /**
     * Reset to idle state
     */
    reset(): void;
    private handleValidationResult;
    private updatePreviewRowSelection;
    private render;
    private renderHeader;
    private renderSummaryBadges;
    private renderContent;
    private renderFileInput;
    private renderLoading;
    private renderPreviewGrid;
    private renderPreviewRow;
    private renderConflictResolution;
    private renderApplyResult;
    private renderError;
    private renderFooter;
    private getApplyGate;
    private attachEventListeners;
}
/**
 * Get CSS styles for exchange import component
 */
export declare function getExchangeImportStyles(): string;
/**
 * Create and mount an exchange import component
 */
export declare function createExchangeImport(container: HTMLElement, config: ExchangeImportConfig): ExchangeImport;
/**
 * Initialize exchange import from data attributes
 */
export declare function initExchangeImport(container: HTMLElement): ExchangeImport | null;
//# sourceMappingURL=exchange-import.d.ts.map