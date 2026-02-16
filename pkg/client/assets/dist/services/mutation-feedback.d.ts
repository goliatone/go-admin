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
    confirmOptions?: ConfirmOptions & {
        variant?: 'primary' | 'danger';
    };
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
/**
 * Manages button state during async operations.
 * Provides visual feedback for loading, success, and error states.
 */
export declare class MutationButtonManager {
    private button;
    private config;
    private originalHTML;
    private originalDisabled;
    private state;
    private feedbackTimeout;
    constructor(config: MutationButtonConfig);
    /** Get current state */
    getState(): MutationButtonState;
    /** Set button to loading state */
    setLoading(): void;
    /** Set button to success state (briefly shows success, then returns to idle) */
    setSuccess(): void;
    /** Set button to error state */
    setError(): void;
    /** Reset button to original state */
    reset(): void;
    /** Destroy and cleanup */
    destroy(): void;
    private clearFeedbackTimeout;
}
/**
 * Execute a mutation with toast feedback and optional button state management.
 * Handles loading states, success/error toasts, and inline retry.
 */
export declare function withMutationFeedback<T>(config: MutationFeedbackConfig<T>): Promise<{
    success: boolean;
    result?: T;
    error?: Error;
}>;
/**
 * Execute a mutation with confirmation dialog.
 * Shows a confirmation modal before executing the mutation.
 */
export declare function withConfirmation<T>(config: ConfirmMutationConfig<T>): Promise<{
    success: boolean;
    result?: T;
    error?: Error;
    cancelled: boolean;
}>;
/**
 * Render inline retry UI in a container.
 * Shows error message with retry and dismiss buttons.
 */
export declare function renderRetryUI(config: RetryableActionConfig): void;
/**
 * Clear retry UI from a container.
 */
export declare function clearRetryUI(container: HTMLElement): void;
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
export declare function getServiceConfirmConfig(config: ServiceConfirmConfig): {
    message: string;
    options: ConfirmOptions & {
        variant: 'primary' | 'danger';
    };
};
/**
 * Show a service-specific confirmation dialog.
 */
export declare function confirmServiceAction(config: ServiceConfirmConfig): Promise<boolean>;
/**
 * Simple action queue to prevent duplicate submissions.
 * Tracks in-flight actions by key and prevents concurrent execution.
 */
export declare class ActionQueue {
    private inFlight;
    /**
     * Check if an action is currently in flight.
     */
    isInFlight(key: string): boolean;
    /**
     * Execute an action with duplicate prevention.
     * Returns undefined if action is already in flight.
     */
    execute<T>(key: string, action: () => Promise<T>): Promise<T | undefined>;
    /**
     * Clear all in-flight actions.
     */
    clear(): void;
}
//# sourceMappingURL=mutation-feedback.d.ts.map