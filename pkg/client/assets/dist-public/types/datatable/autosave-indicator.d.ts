/**
 * Autosave Indicator Component
 *
 * Phase 3a baseline autosave UX for translation forms.
 * Provides visual feedback for autosave states: idle, saving, saved, error.
 *
 * Phase 3b (TX-074): Conflict-aware autosave with recovery UI.
 * Handles AUTOSAVE_CONFLICT errors from backend TX-015.
 *
 * Usage:
 *   const indicator = new AutosaveIndicator({
 *     container: document.querySelector('.autosave-container'),
 *     onSave: async (data) => { await saveToServer(data); },
 *     debounceMs: 1500
 *   });
 *
 *   // Mark form as dirty when user edits
 *   indicator.markDirty(formData);
 *
 *   // Manual save trigger
 *   await indicator.save();
 *
 *   // With conflict handling (TX-074):
 *   const indicator = new AutosaveIndicator({
 *     container: document.querySelector('.autosave-container'),
 *     onSave: async (data) => { await saveToServer(data); },
 *     onConflictResolve: async (resolution) => {
 *       if (resolution.action === 'use_server') {
 *         loadServerVersion(resolution.serverState);
 *       } else if (resolution.action === 'force_save') {
 *         await forceSaveToServer(data);
 *       }
 *     },
 *     enableConflictDetection: true
 *   });
 */
import type { ToastNotifier } from '../toast/types.js';
/**
 * Autosave state machine states.
 * Phase 3a baseline: idle, saving, saved, error.
 * Phase 3b (TX-074): conflict state for version conflicts.
 */
export type AutosaveState = 'idle' | 'saving' | 'saved' | 'error' | 'conflict';
/**
 * Conflict information from AUTOSAVE_CONFLICT error (TX-074).
 * Matches backend AutosaveConflictError contract from TX-015.
 */
export interface AutosaveConflictInfo {
    /** Current server version token */
    version: string;
    /** Version the client expected */
    expectedVersion: string;
    /** Path to fetch latest server state */
    latestStatePath?: string;
    /** Latest server state (if provided inline) */
    latestServerState?: Record<string, unknown>;
    /** Entity ID that conflicted */
    entityId?: string;
    /** Panel/entity type */
    panel?: string;
}
/**
 * Resolution action for autosave conflicts.
 */
export type ConflictResolutionAction = 'use_server' | 'force_save' | 'merge' | 'dismiss';
/**
 * Conflict resolution result passed to callback.
 */
export interface ConflictResolution {
    /** The action chosen by the user */
    action: ConflictResolutionAction;
    /** Server state if using server version */
    serverState?: Record<string, unknown>;
    /** Local data that was conflicting */
    localData?: unknown;
    /** The conflict info */
    conflict: AutosaveConflictInfo;
}
/**
 * Configuration for the AutosaveIndicator component.
 */
export interface AutosaveIndicatorConfig {
    /**
     * Container element to render the indicator into.
     * If not provided, use renderIndicator() to get HTML string.
     */
    container?: HTMLElement;
    /**
     * Async save handler. Called with current dirty data when autosave triggers.
     * Should return the saved data or throw on error.
     * For conflict detection: throw an error with `code: 'AUTOSAVE_CONFLICT'`
     * and `metadata` containing conflict info.
     */
    onSave?: (data: unknown) => Promise<unknown>;
    /**
     * Debounce delay in milliseconds before triggering autosave.
     * Default: 1500ms
     */
    debounceMs?: number;
    /**
     * Duration to show "saved" state before returning to idle.
     * Default: 2000ms
     */
    savedDurationMs?: number;
    /**
     * Optional toast notifier for showing save feedback.
     */
    notifier?: ToastNotifier;
    /**
     * Whether to show toast notifications for state changes.
     * Default: false (only shows indicator)
     */
    showToasts?: boolean;
    /**
     * CSS class prefix for styling.
     * Default: 'autosave'
     */
    classPrefix?: string;
    /**
     * Labels for each state (for i18n support).
     */
    labels?: Partial<AutosaveLabels>;
    /**
     * Enable conflict detection and recovery UI.
     * When true, AUTOSAVE_CONFLICT errors trigger the conflict state.
     * Default: false
     */
    enableConflictDetection?: boolean;
    /**
     * Callback when user resolves a conflict.
     * Called with the resolution action and relevant data.
     */
    onConflictResolve?: (resolution: ConflictResolution) => void | Promise<void>;
    /**
     * Optional handler to fetch latest server state when conflict occurs.
     * Used when latestServerState is not included inline.
     */
    fetchServerState?: (path: string) => Promise<Record<string, unknown>>;
    /**
     * Whether to show force save option in conflict UI.
     * Default: true
     */
    allowForceSave?: boolean;
    /**
     * Conflict-specific labels (for i18n support).
     */
    conflictLabels?: Partial<ConflictLabels>;
}
/**
 * Labels for conflict UI (TX-074).
 */
export interface ConflictLabels {
    title: string;
    message: string;
    useServer: string;
    forceSave: string;
    viewDiff: string;
    dismiss: string;
}
/**
 * Labels for autosave states.
 */
export interface AutosaveLabels {
    idle: string;
    saving: string;
    saved: string;
    error: string;
    conflict: string;
}
/**
 * Event emitted when autosave state changes.
 */
export interface AutosaveStateChangeEvent {
    previousState: AutosaveState;
    currentState: AutosaveState;
    error?: Error;
    data?: unknown;
}
/**
 * Callback for state change events.
 */
export type AutosaveStateChangeCallback = (event: AutosaveStateChangeEvent) => void;
/**
 * AutosaveIndicator manages autosave state and provides visual feedback.
 *
 * State machine:
 *   idle -> saving (on markDirty after debounce)
 *   saving -> saved (on successful save)
 *   saving -> error (on failed save)
 *   saving -> conflict (on AUTOSAVE_CONFLICT error, TX-074)
 *   saved -> idle (after savedDurationMs)
 *   error -> saving (on retry/markDirty)
 *   conflict -> idle (on dismiss or resolve)
 *   conflict -> saving (on force save)
 */
export declare class AutosaveIndicator {
    private config;
    private state;
    private conflictInfo;
    private pendingData;
    private lastError;
    private debounceTimer;
    private savedTimer;
    private listeners;
    private isDirty;
    constructor(config?: AutosaveIndicatorConfig);
    /**
     * Get current autosave state.
     */
    getState(): AutosaveState;
    /**
     * Check if there are unsaved changes.
     */
    hasPendingChanges(): boolean;
    /**
     * Get the last error that occurred during save.
     */
    getLastError(): Error | null;
    /**
     * Mark form as dirty with new data. Triggers debounced autosave.
     */
    markDirty(data?: unknown): void;
    /**
     * Mark form as clean (no pending changes).
     */
    markClean(): void;
    /**
     * Trigger save immediately (bypassing debounce).
     */
    save(): Promise<boolean>;
    /**
     * Retry a failed save.
     */
    retry(): Promise<boolean>;
    /**
     * Get current conflict info if in conflict state.
     */
    getConflictInfo(): AutosaveConflictInfo | null;
    /**
     * Check if in conflict state.
     */
    isInConflict(): boolean;
    /**
     * Resolve conflict by using server version (discard local changes).
     */
    resolveWithServerVersion(): Promise<void>;
    /**
     * Resolve conflict by forcing save (overwrite server version).
     */
    resolveWithForceSave(): Promise<boolean>;
    /**
     * Dismiss conflict without resolving (keep local changes but don't save).
     */
    dismissConflict(): void;
    /**
     * Check if an error is an autosave conflict error.
     */
    private isConflictError;
    /**
     * Extract conflict info from an error.
     */
    private extractConflictInfo;
    /**
     * Add a state change listener.
     */
    onStateChange(callback: AutosaveStateChangeCallback): () => void;
    /**
     * Render the indicator HTML.
     * Call this to get HTML string for manual rendering.
     */
    renderIndicator(): string;
    /**
     * Render conflict recovery UI (TX-074).
     */
    renderConflictUI(): string;
    /**
     * Render indicator into configured container.
     */
    render(): void;
    /**
     * Clean up timers and listeners.
     */
    destroy(): void;
    private setState;
    private showToast;
    private getStateIcon;
    private bindConflictButtons;
    private cancelDebounce;
    private cancelSavedTimer;
    private bindRetryButton;
}
/**
 * Create an AutosaveIndicator with common defaults for translation forms.
 */
export declare function createTranslationAutosave(config: AutosaveIndicatorConfig): AutosaveIndicator;
/**
 * Render a standalone autosave indicator HTML string.
 */
export declare function renderAutosaveIndicator(state: AutosaveState, options?: {
    classPrefix?: string;
    labels?: Partial<AutosaveLabels>;
}): string;
/**
 * Get CSS variables for autosave indicator styling.
 */
export declare function getAutosaveIndicatorStyles(classPrefix?: string): string;
/**
 * Initialize autosave behavior on a form element.
 * Automatically tracks changes and triggers save.
 */
export declare function initFormAutosave(form: HTMLFormElement, config: AutosaveIndicatorConfig & {
    /**
     * Fields to watch for changes. If not specified, watches all inputs.
     */
    watchFields?: string[];
    /**
     * Selector for where to render the indicator within the form.
     */
    indicatorSelector?: string;
}): AutosaveIndicator;
//# sourceMappingURL=autosave-indicator.d.ts.map