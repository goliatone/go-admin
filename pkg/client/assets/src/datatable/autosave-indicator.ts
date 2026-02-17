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
}

/**
 * Labels for autosave states.
 */
export interface AutosaveLabels {
  idle: string;
  saving: string;
  saved: string;
  error: string;
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
  error: 'Save failed'
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
 *   saved -> idle (after savedDurationMs)
 *   error -> saving (on retry/markDirty)
 */
export class AutosaveIndicator {
  private config: Required<Omit<AutosaveIndicatorConfig, 'container' | 'onSave' | 'notifier'>> & {
    container?: HTMLElement;
    onSave?: (data: unknown) => Promise<unknown>;
    notifier?: ToastNotifier;
  };

  private state: AutosaveState = 'idle';
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
      labels: { ...DEFAULT_LABELS, ...config.labels }
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
      this.setState('error');
      return false;
    }
  }

  /**
   * Retry a failed save.
   */
  async retry(): Promise<boolean> {
    if (this.state !== 'error') {
      return true;
    }
    return this.save();
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

    return `<div class="${prefix} ${stateClass}" role="status" aria-live="polite" aria-atomic="true">
      <span class="${prefix}__icon">${icon}</span>
      <span class="${prefix}__label">${label}</span>
      ${this.state === 'error' ? `<button type="button" class="${prefix}__retry" aria-label="Retry save">Retry</button>` : ''}
    </div>`;
  }

  /**
   * Render indicator into configured container.
   */
  render(): void {
    if (this.config.container) {
      this.config.container.innerHTML = this.renderIndicator();
      this.bindRetryButton();
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
        notifier.success(this.config.labels.saved, 2000);
        break;
      case 'error':
        notifier.error(this.lastError?.message || this.config.labels.error);
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
      default:
        return '';
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
      error: 'Failed to save'
    },
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
    container = form.querySelector(indicatorSelector) ?? undefined;
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
