/**
 * UI State Components
 * Shared rendering utilities for loading, empty, no-results, error, and forbidden states.
 * Provides consistent UX across all services pages and detail panels.
 */
export interface UIStateConfig {
    /** Icon name from iconoir */
    icon?: string;
    /** Icon extra CSS classes */
    iconClass?: string;
    /** Title text */
    title?: string;
    /** Description/message text */
    message?: string;
    /** Additional CSS classes for the container */
    containerClass?: string;
    /** Whether to show a retry button */
    showRetry?: boolean;
    /** Retry button text */
    retryText?: string;
    /** Retry callback */
    onRetry?: () => void;
    /** Additional action button */
    action?: {
        text: string;
        onClick: () => void;
        variant?: 'primary' | 'secondary' | 'danger';
    };
}
export interface LoadingStateConfig extends UIStateConfig {
    /** Loading text (default: "Loading...") */
    text?: string;
    /** Size variant */
    size?: 'sm' | 'md' | 'lg';
}
export interface EmptyStateConfig extends UIStateConfig {
    /** Type of empty state for appropriate defaults */
    type?: 'providers' | 'connections' | 'installations' | 'subscriptions' | 'sync' | 'activity' | 'generic';
}
export interface NoResultsStateConfig extends UIStateConfig {
    /** Search/filter query that returned no results */
    query?: string;
    /** Active filter count */
    filterCount?: number;
    /** Reset filters callback */
    onReset?: () => void;
}
export interface ErrorStateConfig extends UIStateConfig {
    /** Error object */
    error?: Error | null;
    /** Error code for specific handling */
    errorCode?: string;
    /** Compact mode for inline errors */
    compact?: boolean;
}
export interface ForbiddenStateConfig extends UIStateConfig {
    /** Resource type user tried to access */
    resource?: string;
    /** Required permission */
    permission?: string;
}
/**
 * Render a loading state
 */
export declare function renderLoadingState(config?: LoadingStateConfig): string;
/**
 * Render an empty state (no data at all)
 */
export declare function renderEmptyState(config?: EmptyStateConfig): string;
/**
 * Render a no-results state (filters/search returned nothing)
 */
export declare function renderNoResultsState(config?: NoResultsStateConfig): string;
/**
 * Render an error state
 */
export declare function renderErrorState(config?: ErrorStateConfig): string;
/**
 * Render a forbidden/access denied state
 */
export declare function renderForbiddenState(config?: ForbiddenStateConfig): string;
/**
 * Render a table loading state (for use inside tbody)
 */
export declare function renderTableLoadingState(colspan: number, config?: LoadingStateConfig): string;
/**
 * Render a table error state (for use inside tbody)
 */
export declare function renderTableErrorState(colspan: number, config?: ErrorStateConfig): string;
/**
 * Render a table empty state (for use inside tbody)
 */
export declare function renderTableEmptyState(colspan: number, config?: EmptyStateConfig): string;
/**
 * Render a table no-results state (for use inside tbody)
 */
export declare function renderTableNoResultsState(colspan: number, config?: NoResultsStateConfig): string;
export type UIStateType = 'loading' | 'empty' | 'no-results' | 'error' | 'forbidden' | 'content';
export interface UIStateManagerConfig {
    container: HTMLElement;
    /** Callback when retry is clicked */
    onRetry?: () => void;
    /** Callback when reset filters is clicked */
    onReset?: () => void;
}
/**
 * Manages UI state transitions for a container element.
 * Handles loading, empty, no-results, error, and forbidden states with proper event binding.
 */
export declare class UIStateManager {
    private container;
    private config;
    private currentState;
    constructor(config: UIStateManagerConfig);
    /**
     * Show loading state
     */
    showLoading(loadingConfig?: LoadingStateConfig): void;
    /**
     * Show empty state (no data)
     */
    showEmpty(emptyConfig?: EmptyStateConfig): void;
    /**
     * Show no-results state (filters returned nothing)
     */
    showNoResults(noResultsConfig?: NoResultsStateConfig): void;
    /**
     * Show error state
     */
    showError(errorConfig?: ErrorStateConfig): void;
    /**
     * Show forbidden state
     */
    showForbidden(forbiddenConfig?: ForbiddenStateConfig): void;
    /**
     * Show content (clears any state and allows content rendering)
     */
    showContent(): void;
    /**
     * Get current state
     */
    getState(): UIStateType;
    /**
     * Check if currently showing loading
     */
    isLoading(): boolean;
    /**
     * Check if showing error
     */
    hasError(): boolean;
    private bindRetryHandler;
    private bindResetHandler;
}
//# sourceMappingURL=ui-states.d.ts.map