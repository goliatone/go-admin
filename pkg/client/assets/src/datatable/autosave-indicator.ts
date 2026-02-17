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

// =============================================================================
// Types
// =============================================================================

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
export type ConflictResolutionAction =
  | 'use_server'   // Discard local changes, use server version
  | 'force_save'   // Force save local changes (overwrite server)
  | 'merge'        // Attempt to merge (advanced, optional)
  | 'dismiss';     // Dismiss conflict, keep local changes but don't save

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

  // ==========================================================================
  // Phase 3b Conflict Handling (TX-074)
  // ==========================================================================

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

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_DEBOUNCE_MS = 1500;
const DEFAULT_SAVED_DURATION_MS = 2000;
const DEFAULT_CLASS_PREFIX = 'autosave';

const DEFAULT_LABELS: AutosaveLabels = {
  idle: '',
  saving: 'Saving...',
  saved: 'Saved',
  error: 'Save failed',
  conflict: 'Conflict detected'
};

const DEFAULT_CONFLICT_LABELS: ConflictLabels = {
  title: 'Save Conflict',
  message: 'This content was modified by someone else. Choose how to proceed:',
  useServer: 'Use server version',
  forceSave: 'Overwrite with my changes',
  viewDiff: 'View differences',
  dismiss: 'Dismiss'
};

// =============================================================================
// AutosaveIndicator Class
// =============================================================================

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
export class AutosaveIndicator {
  private config: Required<Omit<AutosaveIndicatorConfig, 'container' | 'onSave' | 'notifier' | 'onConflictResolve' | 'fetchServerState'>> & {
    container?: HTMLElement;
    onSave?: (data: unknown) => Promise<unknown>;
    notifier?: ToastNotifier;
    onConflictResolve?: (resolution: ConflictResolution) => void | Promise<void>;
    fetchServerState?: (path: string) => Promise<Record<string, unknown>>;
  };

  private state: AutosaveState = 'idle';
  private conflictInfo: AutosaveConflictInfo | null = null;
  private pendingData: unknown = null;
  private lastError: Error | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private savedTimer: ReturnType<typeof setTimeout> | null = null;
  private listeners: AutosaveStateChangeCallback[] = [];
  private isDirty: boolean = false;

  constructor(config: AutosaveIndicatorConfig = {}) {
    this.config = {
      container: config.container,
      onSave: config.onSave,
      debounceMs: config.debounceMs ?? DEFAULT_DEBOUNCE_MS,
      savedDurationMs: config.savedDurationMs ?? DEFAULT_SAVED_DURATION_MS,
      notifier: config.notifier,
      showToasts: config.showToasts ?? false,
      classPrefix: config.classPrefix ?? DEFAULT_CLASS_PREFIX,
      labels: { ...DEFAULT_LABELS, ...config.labels },
      // Phase 3b conflict handling (TX-074)
      enableConflictDetection: config.enableConflictDetection ?? false,
      onConflictResolve: config.onConflictResolve,
      fetchServerState: config.fetchServerState,
      allowForceSave: config.allowForceSave ?? true,
      conflictLabels: { ...DEFAULT_CONFLICT_LABELS, ...config.conflictLabels }
    };
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Get current autosave state.
   */
  getState(): AutosaveState {
    return this.state;
  }

  /**
   * Check if there are unsaved changes.
   */
  hasPendingChanges(): boolean {
    return this.isDirty || this.pendingData !== null;
  }

  /**
   * Get the last error that occurred during save.
   */
  getLastError(): Error | null {
    return this.lastError;
  }

  /**
   * Mark form as dirty with new data. Triggers debounced autosave.
   */
  markDirty(data?: unknown): void {
    this.isDirty = true;
    this.pendingData = data;
    this.lastError = null;

    this.cancelDebounce();

    if (this.config.onSave) {
      this.debounceTimer = setTimeout(() => {
        this.save();
      }, this.config.debounceMs);
    }

    // Update indicator if currently showing saved or idle
    if (this.state === 'saved' || this.state === 'idle') {
      this.cancelSavedTimer();
      // Don't change state yet - wait for save to trigger
    }

    this.render();
  }

  /**
   * Mark form as clean (no pending changes).
   */
  markClean(): void {
    this.isDirty = false;
    this.pendingData = null;
    this.cancelDebounce();
    this.setState('idle');
  }

  /**
   * Trigger save immediately (bypassing debounce).
   */
  async save(): Promise<boolean> {
    if (!this.config.onSave) {
      return true;
    }

    if (!this.isDirty && this.pendingData === null) {
      return true;
    }

    this.cancelDebounce();
    const dataToSave = this.pendingData;

    this.setState('saving');

    try {
      await this.config.onSave(dataToSave);
      this.isDirty = false;
      this.pendingData = null;
      this.lastError = null;
      this.conflictInfo = null;
      this.setState('saved');

      // Auto-transition back to idle after duration
      this.savedTimer = setTimeout(() => {
        if (this.state === 'saved') {
          this.setState('idle');
        }
      }, this.config.savedDurationMs);

      return true;
    } catch (error) {
      this.lastError = error instanceof Error ? error : new Error(String(error));

      // Check for conflict error (TX-074)
      if (this.config.enableConflictDetection && this.isConflictError(error)) {
        this.conflictInfo = this.extractConflictInfo(error);
        this.setState('conflict');
        return false;
      }

      this.setState('error');
      return false;
    }
  }

  /**
   * Retry a failed save.
   */
  async retry(): Promise<boolean> {
    if (this.state !== 'error' && this.state !== 'conflict') {
      return true;
    }
    this.conflictInfo = null;
    return this.save();
  }

  // ---------------------------------------------------------------------------
  // Conflict Handling (TX-074)
  // ---------------------------------------------------------------------------

  /**
   * Get current conflict info if in conflict state.
   */
  getConflictInfo(): AutosaveConflictInfo | null {
    return this.conflictInfo;
  }

  /**
   * Check if in conflict state.
   */
  isInConflict(): boolean {
    return this.state === 'conflict' && this.conflictInfo !== null;
  }

  /**
   * Resolve conflict by using server version (discard local changes).
   */
  async resolveWithServerVersion(): Promise<void> {
    if (!this.isInConflict() || !this.conflictInfo) return;

    const conflict = this.conflictInfo;
    let serverState = conflict.latestServerState;

    // Fetch server state if not provided inline
    if (!serverState && conflict.latestStatePath && this.config.fetchServerState) {
      try {
        serverState = await this.config.fetchServerState(conflict.latestStatePath);
      } catch {
        // Failed to fetch, show error
        this.lastError = new Error('Failed to fetch server version');
        this.setState('error');
        return;
      }
    }

    const resolution: ConflictResolution = {
      action: 'use_server',
      serverState,
      localData: this.pendingData,
      conflict
    };

    // Clear local state
    this.isDirty = false;
    this.pendingData = null;
    this.conflictInfo = null;
    this.setState('idle');

    // Notify caller
    if (this.config.onConflictResolve) {
      try {
        await this.config.onConflictResolve(resolution);
      } catch {
        // Ignore callback errors
      }
    }
  }

  /**
   * Resolve conflict by forcing save (overwrite server version).
   */
  async resolveWithForceSave(): Promise<boolean> {
    if (!this.isInConflict() || !this.conflictInfo) return true;
    if (!this.config.allowForceSave) return false;

    const conflict = this.conflictInfo;

    const resolution: ConflictResolution = {
      action: 'force_save',
      localData: this.pendingData,
      conflict
    };

    // Notify caller that force save was requested
    if (this.config.onConflictResolve) {
      try {
        await this.config.onConflictResolve(resolution);
      } catch {
        // Ignore callback errors
      }
    }

    // Clear conflict state and retry save
    this.conflictInfo = null;
    return this.save();
  }

  /**
   * Dismiss conflict without resolving (keep local changes but don't save).
   */
  dismissConflict(): void {
    if (!this.isInConflict() || !this.conflictInfo) return;

    const conflict = this.conflictInfo;

    const resolution: ConflictResolution = {
      action: 'dismiss',
      localData: this.pendingData,
      conflict
    };

    this.conflictInfo = null;
    this.setState('idle');

    // Notify caller
    if (this.config.onConflictResolve) {
      try {
        this.config.onConflictResolve(resolution);
      } catch {
        // Ignore callback errors
      }
    }
  }

  /**
   * Check if an error is an autosave conflict error.
   */
  private isConflictError(error: unknown): boolean {
    if (!error) return false;

    // Check for error code
    const errorObj = error as { code?: string; text_code?: string; name?: string };
    if (errorObj.code === 'AUTOSAVE_CONFLICT' || errorObj.text_code === 'AUTOSAVE_CONFLICT') {
      return true;
    }
    if (errorObj.name === 'AutosaveConflictError') {
      return true;
    }

    // Check error message
    const message = error instanceof Error ? error.message : String(error);
    if (message.toLowerCase().includes('autosave conflict')) {
      return true;
    }

    return false;
  }

  /**
   * Extract conflict info from an error.
   */
  private extractConflictInfo(error: unknown): AutosaveConflictInfo {
    const errorObj = error as {
      metadata?: {
        version?: string;
        expected_version?: string;
        latest_state_path?: string;
        latest_server_state?: Record<string, unknown>;
        entity_id?: string;
        panel?: string;
      };
      version?: string;
      expectedVersion?: string;
      latestStatePath?: string;
      latestServerState?: Record<string, unknown>;
      entityId?: string;
      panel?: string;
    };

    // Try metadata first (backend response format)
    const metadata = errorObj.metadata;
    if (metadata) {
      return {
        version: metadata.version || '',
        expectedVersion: metadata.expected_version || '',
        latestStatePath: metadata.latest_state_path,
        latestServerState: metadata.latest_server_state,
        entityId: metadata.entity_id,
        panel: metadata.panel
      };
    }

    // Fall back to direct properties
    return {
      version: errorObj.version || '',
      expectedVersion: errorObj.expectedVersion || '',
      latestStatePath: errorObj.latestStatePath,
      latestServerState: errorObj.latestServerState,
      entityId: errorObj.entityId,
      panel: errorObj.panel
    };
  }

  /**
   * Add a state change listener.
   */
  onStateChange(callback: AutosaveStateChangeCallback): () => void {
    this.listeners.push(callback);
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index >= 0) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Render the indicator HTML.
   * Call this to get HTML string for manual rendering.
   */
  renderIndicator(): string {
    const prefix = this.config.classPrefix;
    const labels = this.config.labels;

    const stateClass = `${prefix}--${this.state}`;
    const label = labels[this.state] || '';
    const icon = this.getStateIcon();

    // Conflict state renders expanded UI (TX-074)
    if (this.state === 'conflict') {
      return this.renderConflictUI();
    }

    return `<div class="${prefix} ${stateClass}" role="status" aria-live="polite" aria-atomic="true">
      <span class="${prefix}__icon">${icon}</span>
      <span class="${prefix}__label">${label}</span>
      ${this.state === 'error' ? `<button type="button" class="${prefix}__retry" aria-label="Retry save">Retry</button>` : ''}
    </div>`;
  }

  /**
   * Render conflict recovery UI (TX-074).
   */
  renderConflictUI(): string {
    const prefix = this.config.classPrefix;
    const labels = this.config.conflictLabels;

    return `<div class="${prefix} ${prefix}--conflict" role="alertdialog" aria-labelledby="${prefix}-conflict-title" aria-describedby="${prefix}-conflict-desc">
      <div class="${prefix}__conflict-header">
        <span class="${prefix}__icon">${this.getStateIcon()}</span>
        <span id="${prefix}-conflict-title" class="${prefix}__conflict-title">${labels.title}</span>
      </div>
      <p id="${prefix}-conflict-desc" class="${prefix}__conflict-message">${labels.message}</p>
      <div class="${prefix}__conflict-actions">
        <button type="button" class="${prefix}__conflict-use-server" aria-label="${labels.useServer}">
          ${labels.useServer}
        </button>
        ${this.config.allowForceSave ? `
          <button type="button" class="${prefix}__conflict-force-save" aria-label="${labels.forceSave}">
            ${labels.forceSave}
          </button>
        ` : ''}
        <button type="button" class="${prefix}__conflict-dismiss" aria-label="${labels.dismiss}">
          ${labels.dismiss}
        </button>
      </div>
    </div>`;
  }

  /**
   * Render indicator into configured container.
   */
  render(): void {
    if (this.config.container) {
      this.config.container.innerHTML = this.renderIndicator();
      this.bindRetryButton();
      this.bindConflictButtons();
    }
  }

  /**
   * Clean up timers and listeners.
   */
  destroy(): void {
    this.cancelDebounce();
    this.cancelSavedTimer();
    this.listeners = [];
  }

  // ---------------------------------------------------------------------------
  // Private Methods
  // ---------------------------------------------------------------------------

  private setState(newState: AutosaveState): void {
    if (newState === this.state) return;

    const previousState = this.state;
    this.state = newState;

    // Emit state change event
    const event: AutosaveStateChangeEvent = {
      previousState,
      currentState: newState,
      error: this.lastError ?? undefined,
      data: this.pendingData ?? undefined
    };

    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // Ignore listener errors
      }
    }

    // Show toast if enabled
    if (this.config.showToasts && this.config.notifier) {
      this.showToast(newState);
    }

    this.render();
  }

  private showToast(state: AutosaveState): void {
    const notifier = this.config.notifier;
    if (!notifier) return;

    switch (state) {
      case 'saved':
        notifier.success(this.config.labels.saved ?? DEFAULT_LABELS.saved, 2000);
        break;
      case 'error':
        notifier.error(this.lastError?.message ?? this.config.labels.error ?? DEFAULT_LABELS.error);
        break;
      case 'conflict':
        notifier.warning?.(this.config.labels.conflict ?? DEFAULT_LABELS.conflict);
        break;
    }
  }

  private getStateIcon(): string {
    switch (this.state) {
      case 'saving':
        return `<svg class="${this.config.classPrefix}__spinner" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-dasharray="28" stroke-dashoffset="7">
            <animateTransform attributeName="transform" type="rotate" from="0 8 8" to="360 8 8" dur="1s" repeatCount="indefinite"/>
          </circle>
        </svg>`;
      case 'saved':
        return `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 8.5L6.5 12L13 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`;
      case 'error':
        return `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="2"/>
          <path d="M8 5v4M8 11v.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>`;
      case 'conflict':
        // Warning triangle icon for conflict state (TX-074)
        return `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M8 1L15 14H1L8 1Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
          <path d="M8 6v4M8 12v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>`;
      default:
        return '';
    }
  }

  private bindConflictButtons(): void {
    if (!this.config.container || this.state !== 'conflict') return;

    const prefix = this.config.classPrefix;

    const useServerBtn = this.config.container.querySelector(`.${prefix}__conflict-use-server`);
    if (useServerBtn) {
      useServerBtn.addEventListener('click', () => this.resolveWithServerVersion());
    }

    const forceSaveBtn = this.config.container.querySelector(`.${prefix}__conflict-force-save`);
    if (forceSaveBtn) {
      forceSaveBtn.addEventListener('click', () => this.resolveWithForceSave());
    }

    const dismissBtn = this.config.container.querySelector(`.${prefix}__conflict-dismiss`);
    if (dismissBtn) {
      dismissBtn.addEventListener('click', () => this.dismissConflict());
    }
  }

  private cancelDebounce(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  private cancelSavedTimer(): void {
    if (this.savedTimer) {
      clearTimeout(this.savedTimer);
      this.savedTimer = null;
    }
  }

  private bindRetryButton(): void {
    if (!this.config.container) return;
    const retryBtn = this.config.container.querySelector(`.${this.config.classPrefix}__retry`);
    if (retryBtn) {
      retryBtn.addEventListener('click', () => this.retry());
    }
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Create an AutosaveIndicator with common defaults for translation forms.
 */
export function createTranslationAutosave(config: AutosaveIndicatorConfig): AutosaveIndicator {
  return new AutosaveIndicator({
    debounceMs: 1500,
    savedDurationMs: 2000,
    showToasts: false,
    labels: {
      idle: '',
      saving: 'Saving...',
      saved: 'All changes saved',
      error: 'Failed to save',
      conflict: 'Conflict detected'
    },
    // Enable conflict detection by default for translation forms (TX-074)
    enableConflictDetection: true,
    allowForceSave: true,
    ...config
  });
}

/**
 * Render a standalone autosave indicator HTML string.
 */
export function renderAutosaveIndicator(
  state: AutosaveState,
  options: {
    classPrefix?: string;
    labels?: Partial<AutosaveLabels>;
  } = {}
): string {
  const prefix = options.classPrefix ?? DEFAULT_CLASS_PREFIX;
  const labels = { ...DEFAULT_LABELS, ...options.labels };
  const label = labels[state] || '';

  let icon = '';
  switch (state) {
    case 'saving':
      icon = `<span class="${prefix}__spinner"></span>`;
      break;
    case 'saved':
      icon = `<span class="${prefix}__check">✓</span>`;
      break;
    case 'error':
      icon = `<span class="${prefix}__error">!</span>`;
      break;
    case 'conflict':
      icon = `<span class="${prefix}__conflict-icon">⚠</span>`;
      break;
  }

  return `<div class="${prefix} ${prefix}--${state}" role="status" aria-live="polite">
    ${icon}
    <span class="${prefix}__label">${label}</span>
  </div>`;
}

/**
 * Get CSS variables for autosave indicator styling.
 */
export function getAutosaveIndicatorStyles(classPrefix: string = DEFAULT_CLASS_PREFIX): string {
  return `
    .${classPrefix} {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.75rem;
      color: var(--autosave-color, #6b7280);
      transition: opacity 200ms ease;
    }

    .${classPrefix}--idle {
      opacity: 0;
    }

    .${classPrefix}--saving {
      color: var(--autosave-saving-color, #3b82f6);
    }

    .${classPrefix}--saved {
      color: var(--autosave-saved-color, #10b981);
    }

    .${classPrefix}--error {
      color: var(--autosave-error-color, #ef4444);
    }

    .${classPrefix}__icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1rem;
      height: 1rem;
    }

    .${classPrefix}__icon svg {
      width: 100%;
      height: 100%;
    }

    .${classPrefix}__spinner {
      animation: ${classPrefix}-spin 1s linear infinite;
    }

    .${classPrefix}__retry {
      margin-left: 0.5rem;
      padding: 0.125rem 0.375rem;
      font-size: 0.75rem;
      color: var(--autosave-retry-color, #3b82f6);
      background: transparent;
      border: 1px solid currentColor;
      border-radius: 0.25rem;
      cursor: pointer;
      transition: background-color 150ms ease;
    }

    .${classPrefix}__retry:hover {
      background-color: var(--autosave-retry-hover-bg, rgba(59, 130, 246, 0.1));
    }

    @keyframes ${classPrefix}-spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    /* Conflict state styles (TX-074) */
    .${classPrefix}--conflict {
      color: var(--autosave-conflict-color, #f59e0b);
      padding: 0.75rem;
      background: var(--autosave-conflict-bg, #fffbeb);
      border: 1px solid var(--autosave-conflict-border, #fcd34d);
      border-radius: 0.5rem;
      flex-direction: column;
      align-items: stretch;
      gap: 0.5rem;
    }

    .${classPrefix}__conflict-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .${classPrefix}__conflict-title {
      font-weight: 600;
      color: var(--autosave-conflict-title-color, #92400e);
    }

    .${classPrefix}__conflict-message {
      font-size: 0.75rem;
      color: var(--autosave-conflict-message-color, #78350f);
      margin: 0;
    }

    .${classPrefix}__conflict-actions {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
      margin-top: 0.25rem;
    }

    .${classPrefix}__conflict-actions button {
      padding: 0.25rem 0.5rem;
      font-size: 0.75rem;
      border-radius: 0.25rem;
      cursor: pointer;
      transition: background-color 150ms ease;
    }

    .${classPrefix}__conflict-use-server {
      color: white;
      background: var(--autosave-conflict-use-server-bg, #3b82f6);
      border: none;
    }

    .${classPrefix}__conflict-use-server:hover {
      background: var(--autosave-conflict-use-server-hover-bg, #2563eb);
    }

    .${classPrefix}__conflict-force-save {
      color: var(--autosave-conflict-force-color, #ef4444);
      background: transparent;
      border: 1px solid currentColor;
    }

    .${classPrefix}__conflict-force-save:hover {
      background: var(--autosave-conflict-force-hover-bg, rgba(239, 68, 68, 0.1));
    }

    .${classPrefix}__conflict-dismiss {
      color: var(--autosave-conflict-dismiss-color, #6b7280);
      background: transparent;
      border: 1px solid var(--autosave-conflict-dismiss-border, #d1d5db);
    }

    .${classPrefix}__conflict-dismiss:hover {
      background: var(--autosave-conflict-dismiss-hover-bg, #f3f4f6);
    }
  `;
}

/**
 * Initialize autosave behavior on a form element.
 * Automatically tracks changes and triggers save.
 */
export function initFormAutosave(
  form: HTMLFormElement,
  config: AutosaveIndicatorConfig & {
    /**
     * Fields to watch for changes. If not specified, watches all inputs.
     */
    watchFields?: string[];

    /**
     * Selector for where to render the indicator within the form.
     */
    indicatorSelector?: string;
  }
): AutosaveIndicator {
  const { watchFields, indicatorSelector, ...indicatorConfig } = config;

  // Find or create indicator container
  let container = indicatorConfig.container;
  if (!container && indicatorSelector) {
    container = form.querySelector<HTMLElement>(indicatorSelector) ?? undefined;
  }

  const indicator = new AutosaveIndicator({
    ...indicatorConfig,
    container
  });

  // Get form data helper
  const getFormData = (): Record<string, unknown> => {
    const formData = new FormData(form);
    const data: Record<string, unknown> = {};
    formData.forEach((value, key) => {
      data[key] = value;
    });
    return data;
  };

  // Change handler
  const handleChange = (event: Event): void => {
    const target = event.target as HTMLElement;
    if (!target) return;

    // Check if we should watch this field
    if (watchFields && watchFields.length > 0) {
      const fieldName = (target as HTMLInputElement).name;
      if (!fieldName || !watchFields.includes(fieldName)) {
        return;
      }
    }

    indicator.markDirty(getFormData());
  };

  // Bind change listeners
  form.addEventListener('input', handleChange);
  form.addEventListener('change', handleChange);

  // Save on form submit
  form.addEventListener('submit', async (event) => {
    if (indicator.hasPendingChanges()) {
      event.preventDefault();
      const success = await indicator.save();
      if (success) {
        // Re-submit after save
        form.submit();
      }
    }
  });

  // Warn before leaving with unsaved changes
  const beforeUnloadHandler = (event: BeforeUnloadEvent): void => {
    if (indicator.hasPendingChanges()) {
      event.preventDefault();
      event.returnValue = '';
    }
  };
  window.addEventListener('beforeunload', beforeUnloadHandler);

  // Save on visibility change (tab switch)
  const visibilityHandler = (): void => {
    if (document.hidden && indicator.hasPendingChanges()) {
      indicator.save();
    }
  };
  document.addEventListener('visibilitychange', visibilityHandler);

  // Extend destroy to clean up listeners
  const originalDestroy = indicator.destroy.bind(indicator);
  indicator.destroy = (): void => {
    form.removeEventListener('input', handleChange);
    form.removeEventListener('change', handleChange);
    window.removeEventListener('beforeunload', beforeUnloadHandler);
    document.removeEventListener('visibilitychange', visibilityHandler);
    originalDestroy();
  };

  return indicator;
}
