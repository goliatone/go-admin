/**
 * Mutation Feedback Module
 * Provides confirmation UX and feedback patterns for destructive and asynchronous actions.
 *
 * Includes:
 * - Button state management during async operations (loading, success, error states)
 * - Toast notification wrappers for mutation results
 * - Inline retry utilities for failed mutations
 * - Confirmation dialog helpers for destructive actions
 */

import type { ToastNotifier, ConfirmOptions } from '../toast/types.js';
import { ConfirmModal } from '../shared/modal.js';
import { renderIcon } from '../shared/icon-renderer.js';

// =============================================================================
// Types
// =============================================================================

/** Button state during mutation lifecycle */
export type MutationButtonState = 'idle' | 'loading' | 'success' | 'error';

/** Configuration for mutation button state management */
export interface MutationButtonConfig {
  /** Button element to manage */
  button: HTMLButtonElement;
  /** Text to show when loading */
  loadingText?: string;
  /** Text to show on success (briefly) */
  successText?: string;
  /** Text to show on error */
  errorText?: string;
  /** Duration to show success/error state before returning to idle (ms) */
  feedbackDuration?: number;
  /** Whether to disable the button during loading */
  disableOnLoading?: boolean;
  /** Whether to show spinner during loading */
  showSpinner?: boolean;
}

/** Configuration for mutation execution with feedback */
export interface MutationFeedbackConfig<T> {
  /** Async function to execute */
  mutation: () => Promise<T>;
  /** Toast notifier for showing messages */
  notifier?: ToastNotifier;
  /** Success message or function to generate it from result */
  successMessage?: string | ((result: T) => string);
  /** Error message prefix (actual error will be appended) */
  errorMessagePrefix?: string;
  /** Button config for loading state management */
  buttonConfig?: MutationButtonConfig;
  /** Called after successful mutation */
  onSuccess?: (result: T) => void | Promise<void>;
  /** Called after failed mutation */
  onError?: (error: Error) => void;
  /** Show inline retry on error */
  showInlineRetry?: boolean;
  /** Container for inline retry UI */
  retryContainer?: HTMLElement;
}

/** Configuration for confirmation before mutation */
export interface ConfirmMutationConfig<T> extends MutationFeedbackConfig<T> {
  /** Confirmation message */
  confirmMessage: string;
  /** Confirmation dialog options */
  confirmOptions?: ConfirmOptions & { variant?: 'primary' | 'danger' };
}

/** Configuration for retryable inline action */
export interface RetryableActionConfig {
  /** Container element for retry UI */
  container: HTMLElement;
  /** Action to retry */
  action: () => Promise<void>;
  /** Error message to display */
  errorMessage: string;
  /** Retry button text */
  retryText?: string;
  /** Dismiss button text */
  dismissText?: string;
  /** Callback when dismissed */
  onDismiss?: () => void;
}

// =============================================================================
// Mutation Button State Manager
// =============================================================================

/**
 * Manages button state during async operations.
 * Provides visual feedback for loading, success, and error states.
 */
export class MutationButtonManager {
  private button: HTMLButtonElement;
  private config: Required<Omit<MutationButtonConfig, 'button'>>;
  private originalHTML: string;
  private originalDisabled: boolean;
  private state: MutationButtonState = 'idle';
  private feedbackTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(config: MutationButtonConfig) {
    this.button = config.button;
    this.originalHTML = this.button.innerHTML;
    this.originalDisabled = this.button.disabled;

    this.config = {
      loadingText: config.loadingText ?? 'Processing...',
      successText: config.successText ?? 'Done',
      errorText: config.errorText ?? 'Failed',
      feedbackDuration: config.feedbackDuration ?? 2000,
      disableOnLoading: config.disableOnLoading ?? true,
      showSpinner: config.showSpinner ?? true,
    };
  }

  /** Get current state */
  getState(): MutationButtonState {
    return this.state;
  }

  /** Set button to loading state */
  setLoading(): void {
    this.clearFeedbackTimeout();
    this.state = 'loading';

    if (this.config.disableOnLoading) {
      this.button.disabled = true;
    }

    this.button.classList.add('mutation-loading');
    this.button.classList.remove('mutation-success', 'mutation-error');

    const spinnerHTML = this.config.showSpinner
      ? `<svg class="animate-spin -ml-1 mr-2 h-4 w-4 inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
           <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
           <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
         </svg>`
      : '';

    this.button.innerHTML = `${spinnerHTML}<span>${escapeHtml(this.config.loadingText)}</span>`;
  }

  /** Set button to success state (briefly shows success, then returns to idle) */
  setSuccess(): void {
    this.clearFeedbackTimeout();
    this.state = 'success';

    this.button.disabled = this.originalDisabled;
    this.button.classList.remove('mutation-loading', 'mutation-error');
    this.button.classList.add('mutation-success');

    this.button.innerHTML = `
      <svg class="-ml-1 mr-2 h-4 w-4 inline-block text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
      </svg>
      <span>${escapeHtml(this.config.successText)}</span>
    `;

    this.feedbackTimeout = setTimeout(() => {
      this.reset();
    }, this.config.feedbackDuration);
  }

  /** Set button to error state */
  setError(): void {
    this.clearFeedbackTimeout();
    this.state = 'error';

    this.button.disabled = this.originalDisabled;
    this.button.classList.remove('mutation-loading', 'mutation-success');
    this.button.classList.add('mutation-error');

    this.button.innerHTML = `
      <svg class="-ml-1 mr-2 h-4 w-4 inline-block text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
      </svg>
      <span>${escapeHtml(this.config.errorText)}</span>
    `;

    this.feedbackTimeout = setTimeout(() => {
      this.reset();
    }, this.config.feedbackDuration);
  }

  /** Reset button to original state */
  reset(): void {
    this.clearFeedbackTimeout();
    this.state = 'idle';

    this.button.disabled = this.originalDisabled;
    this.button.classList.remove('mutation-loading', 'mutation-success', 'mutation-error');
    this.button.innerHTML = this.originalHTML;
  }

  /** Destroy and cleanup */
  destroy(): void {
    this.clearFeedbackTimeout();
    this.reset();
  }

  private clearFeedbackTimeout(): void {
    if (this.feedbackTimeout) {
      clearTimeout(this.feedbackTimeout);
      this.feedbackTimeout = null;
    }
  }
}

// =============================================================================
// Mutation Execution with Feedback
// =============================================================================

/**
 * Execute a mutation with toast feedback and optional button state management.
 * Handles loading states, success/error toasts, and inline retry.
 */
export async function withMutationFeedback<T>(
  config: MutationFeedbackConfig<T>
): Promise<{ success: boolean; result?: T; error?: Error }> {
  const {
    mutation,
    notifier,
    successMessage,
    errorMessagePrefix = 'Operation failed',
    buttonConfig,
    onSuccess,
    onError,
    showInlineRetry = false,
    retryContainer,
  } = config;

  // Set up button manager if provided
  const buttonManager = buttonConfig ? new MutationButtonManager(buttonConfig) : null;

  try {
    // Show loading state
    buttonManager?.setLoading();

    // Execute mutation
    const result = await mutation();

    // Show success state
    buttonManager?.setSuccess();

    // Show success toast
    if (notifier && successMessage) {
      const message = typeof successMessage === 'function'
        ? successMessage(result)
        : successMessage;
      notifier.success(message);
    }

    // Clear any retry UI
    if (retryContainer) {
      clearRetryUI(retryContainer);
    }

    // Call success callback
    await onSuccess?.(result);

    return { success: true, result };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));

    // Show error state
    buttonManager?.setError();

    // Show error toast
    if (notifier) {
      notifier.error(`${errorMessagePrefix}: ${error.message}`);
    }

    // Show inline retry if requested
    if (showInlineRetry && retryContainer) {
      renderRetryUI({
        container: retryContainer,
        action: () => withMutationFeedback(config).then(() => {}),
        errorMessage: `${errorMessagePrefix}: ${error.message}`,
        onDismiss: () => clearRetryUI(retryContainer),
      });
    }

    // Call error callback
    onError?.(error);

    return { success: false, error };
  }
}

/**
 * Execute a mutation with confirmation dialog.
 * Shows a confirmation modal before executing the mutation.
 */
export async function withConfirmation<T>(
  config: ConfirmMutationConfig<T>
): Promise<{ success: boolean; result?: T; error?: Error; cancelled: boolean }> {
  const { confirmMessage, confirmOptions, ...mutationConfig } = config;

  // Show confirmation dialog
  const confirmed = await ConfirmModal.confirm(confirmMessage, {
    title: confirmOptions?.title ?? 'Confirm Action',
    confirmText: confirmOptions?.confirmText ?? 'Confirm',
    cancelText: confirmOptions?.cancelText ?? 'Cancel',
    confirmVariant: confirmOptions?.variant ?? 'primary',
  });

  if (!confirmed) {
    return { success: false, cancelled: true };
  }

  // Execute mutation with feedback
  const result = await withMutationFeedback(mutationConfig);
  return { ...result, cancelled: false };
}

// =============================================================================
// Inline Retry UI
// =============================================================================

/**
 * Render inline retry UI in a container.
 * Shows error message with retry and dismiss buttons.
 */
export function renderRetryUI(config: RetryableActionConfig): void {
  const {
    container,
    action,
    errorMessage,
    retryText = 'Retry',
    dismissText = 'Dismiss',
    onDismiss,
  } = config;

  container.innerHTML = `
    <div class="mutation-retry-ui flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg" role="alert">
      <div class="flex-shrink-0 text-red-500" aria-hidden="true">
        ${renderIcon('iconoir:warning-triangle', { size: '20px' })}
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-sm text-red-700">${escapeHtml(errorMessage)}</p>
        <div class="flex items-center gap-2 mt-2">
          <button type="button"
                  class="mutation-retry-btn px-3 py-1 text-xs font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded transition-colors">
            ${escapeHtml(retryText)}
          </button>
          <button type="button"
                  class="mutation-dismiss-btn px-3 py-1 text-xs font-medium text-gray-600 hover:text-gray-800 transition-colors">
            ${escapeHtml(dismissText)}
          </button>
        </div>
      </div>
    </div>
  `;

  // Bind events
  const retryBtn = container.querySelector('.mutation-retry-btn');
  const dismissBtn = container.querySelector('.mutation-dismiss-btn');

  retryBtn?.addEventListener('click', async () => {
    // Show loading state on retry button
    const btn = retryBtn as HTMLButtonElement;
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.innerHTML = `
      <svg class="animate-spin h-3 w-3 inline-block mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      Retrying...
    `;

    try {
      await action();
    } finally {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  });

  dismissBtn?.addEventListener('click', () => {
    clearRetryUI(container);
    onDismiss?.();
  });
}

/**
 * Clear retry UI from a container.
 */
export function clearRetryUI(container: HTMLElement): void {
  const retryUI = container.querySelector('.mutation-retry-ui');
  retryUI?.remove();
}

// =============================================================================
// Confirmation Dialog Utilities
// =============================================================================

/** Configuration for service-specific confirmation dialogs */
export interface ServiceConfirmConfig {
  /** Action being confirmed (e.g., "revoke", "disconnect", "uninstall") */
  action: 'revoke' | 'disconnect' | 'uninstall' | 'cancel' | 'delete' | 'refresh';
  /** Resource type being affected */
  resourceType: 'connection' | 'installation' | 'subscription' | 'sync';
  /** Resource identifier for display */
  resourceName?: string;
  /** Additional context message */
  additionalContext?: string;
}

/**
 * Get standard confirmation message and options for service actions.
 */
export function getServiceConfirmConfig(config: ServiceConfirmConfig): {
  message: string;
  options: ConfirmOptions & { variant: 'primary' | 'danger' };
} {
  const { action, resourceType, resourceName, additionalContext } = config;

  const actionLabels: Record<string, { verb: string; noun: string; variant: 'primary' | 'danger' }> = {
    revoke: { verb: 'revoke', noun: 'Revoke', variant: 'danger' },
    disconnect: { verb: 'disconnect', noun: 'Disconnect', variant: 'danger' },
    uninstall: { verb: 'uninstall', noun: 'Uninstall', variant: 'danger' },
    cancel: { verb: 'cancel', noun: 'Cancel', variant: 'danger' },
    delete: { verb: 'delete', noun: 'Delete', variant: 'danger' },
    refresh: { verb: 'refresh', noun: 'Refresh', variant: 'primary' },
  };

  const resourceLabels: Record<string, string> = {
    connection: 'connection',
    installation: 'installation',
    subscription: 'subscription',
    sync: 'sync job',
  };

  const actionConfig = actionLabels[action] || { verb: action, noun: action, variant: 'primary' as const };
  const resourceLabel = resourceLabels[resourceType] || resourceType;

  let message = `Are you sure you want to ${actionConfig.verb} this ${resourceLabel}`;
  if (resourceName) {
    message += ` (${resourceName})`;
  }
  message += '?';

  if (additionalContext) {
    message += ` ${additionalContext}`;
  }

  // Add warning for destructive actions
  if (actionConfig.variant === 'danger') {
    message += ' This action cannot be undone.';
  }

  return {
    message,
    options: {
      title: `${actionConfig.noun} ${resourceLabel.charAt(0).toUpperCase() + resourceLabel.slice(1)}`,
      confirmText: actionConfig.noun,
      cancelText: 'Cancel',
      variant: actionConfig.variant,
    },
  };
}

/**
 * Show a service-specific confirmation dialog.
 */
export async function confirmServiceAction(config: ServiceConfirmConfig): Promise<boolean> {
  const { message, options } = getServiceConfirmConfig(config);
  return ConfirmModal.confirm(message, options);
}

// =============================================================================
// Action Queue (for preventing duplicate submissions)
// =============================================================================

/**
 * Simple action queue to prevent duplicate submissions.
 * Tracks in-flight actions by key and prevents concurrent execution.
 */
export class ActionQueue {
  private inFlight = new Set<string>();

  /**
   * Check if an action is currently in flight.
   */
  isInFlight(key: string): boolean {
    return this.inFlight.has(key);
  }

  /**
   * Execute an action with duplicate prevention.
   * Returns undefined if action is already in flight.
   */
  async execute<T>(key: string, action: () => Promise<T>): Promise<T | undefined> {
    if (this.inFlight.has(key)) {
      return undefined;
    }

    this.inFlight.add(key);
    try {
      return await action();
    } finally {
      this.inFlight.delete(key);
    }
  }

  /**
   * Clear all in-flight actions.
   */
  clear(): void {
    this.inFlight.clear();
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

