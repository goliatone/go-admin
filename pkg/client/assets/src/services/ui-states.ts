/**
 * UI State Components
 * Shared rendering utilities for loading, empty, no-results, error, and forbidden states.
 * Provides consistent UX across all services pages and detail panels.
 */

import { renderIcon } from '../shared/icon-renderer.js';

// =============================================================================
// Types
// =============================================================================

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

// =============================================================================
// Default Configurations
// =============================================================================

const EMPTY_STATE_DEFAULTS: Record<string, { icon: string; title: string; message: string }> = {
  providers: {
    icon: 'iconoir:plug',
    title: 'No providers available',
    message: 'No service providers are currently configured.',
  },
  connections: {
    icon: 'iconoir:link',
    title: 'No connections found',
    message: 'Connect a service to get started.',
  },
  installations: {
    icon: 'iconoir:download',
    title: 'No installations found',
    message: 'Install a service to get started.',
  },
  subscriptions: {
    icon: 'iconoir:bell-off',
    title: 'No subscriptions found',
    message: 'Subscriptions will appear here when created.',
  },
  sync: {
    icon: 'iconoir:sync',
    title: 'No sync jobs found',
    message: 'Sync jobs will appear here when syncs are triggered.',
  },
  activity: {
    icon: 'iconoir:activity',
    title: 'No activity found',
    message: 'Activity entries will appear here as actions occur.',
  },
  generic: {
    icon: 'iconoir:folder-empty',
    title: 'No data',
    message: 'Nothing to display.',
  },
};

// =============================================================================
// Render Functions
// =============================================================================

/**
 * Render a loading state
 */
export function renderLoadingState(config: LoadingStateConfig = {}): string {
  const { text = 'Loading...', size = 'md', containerClass = '' } = config;

  const sizeClasses = {
    sm: { spinner: 'h-4 w-4', text: 'text-xs', py: 'py-4' },
    md: { spinner: 'h-5 w-5', text: 'text-sm', py: 'py-8' },
    lg: { spinner: 'h-8 w-8', text: 'text-base', py: 'py-16' },
  };

  const sizes = sizeClasses[size];

  return `
    <div class="ui-state ui-state-loading flex items-center justify-center ${sizes.py} ${containerClass}" aria-busy="true" aria-label="Loading">
      <div class="flex flex-col items-center gap-3 text-gray-500">
        <svg class="animate-spin ${sizes.spinner}" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span class="${sizes.text}">${escapeHtml(text)}</span>
      </div>
    </div>
  `;
}

/**
 * Render an empty state (no data at all)
 */
export function renderEmptyState(config: EmptyStateConfig = {}): string {
  const defaults = EMPTY_STATE_DEFAULTS[config.type || 'generic'];
  const {
    icon = defaults.icon,
    iconClass = 'text-gray-400',
    title = defaults.title,
    message = defaults.message,
    containerClass = '',
    action,
  } = config;

  return `
    <div class="ui-state ui-state-empty flex items-center justify-center py-12 ${containerClass}" role="status" aria-label="Empty">
      <div class="flex flex-col items-center gap-4 text-center max-w-sm">
        <div class="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center" aria-hidden="true">
          ${renderIcon(icon, { size: '24px', extraClass: iconClass })}
        </div>
        <div>
          <h3 class="text-lg font-medium text-gray-900">${escapeHtml(title)}</h3>
          <p class="text-sm text-gray-500 mt-1">${escapeHtml(message)}</p>
        </div>
        ${action ? renderActionButton(action) : ''}
      </div>
    </div>
  `;
}

/**
 * Render a no-results state (filters/search returned nothing)
 */
export function renderNoResultsState(config: NoResultsStateConfig = {}): string {
  const {
    icon = 'iconoir:search',
    iconClass = 'text-gray-400',
    title = 'No results found',
    query,
    filterCount = 0,
    containerClass = '',
    onReset,
  } = config;

  let message = config.message;
  if (!message) {
    if (query && filterCount > 0) {
      message = `No items match "${query}" with ${filterCount} filter${filterCount > 1 ? 's' : ''} applied.`;
    } else if (query) {
      message = `No items match "${query}".`;
    } else if (filterCount > 0) {
      message = `No items match the ${filterCount} filter${filterCount > 1 ? 's' : ''} applied.`;
    } else {
      message = 'Try adjusting your search or filters.';
    }
  }

  return `
    <div class="ui-state ui-state-no-results flex items-center justify-center py-12 ${containerClass}" role="status" aria-label="No results">
      <div class="flex flex-col items-center gap-4 text-center max-w-sm">
        <div class="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center" aria-hidden="true">
          ${renderIcon(icon, { size: '24px', extraClass: iconClass })}
        </div>
        <div>
          <h3 class="text-lg font-medium text-gray-900">${escapeHtml(title)}</h3>
          <p class="text-sm text-gray-500 mt-1">${escapeHtml(message)}</p>
        </div>
        ${onReset ? `
          <button type="button" class="ui-state-reset-btn px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors">
            Clear filters
          </button>
        ` : ''}
      </div>
    </div>
  `;
}

/**
 * Render an error state
 */
export function renderErrorState(config: ErrorStateConfig = {}): string {
  const {
    icon = 'iconoir:warning-triangle',
    iconClass = 'text-red-500',
    title = 'Something went wrong',
    error,
    compact = false,
    containerClass = '',
    showRetry = true,
    retryText = 'Try again',
  } = config;

  const message = config.message || error?.message || 'An unexpected error occurred. Please try again.';

  if (compact) {
    return `
      <div class="ui-state ui-state-error ui-state-error-compact p-4 ${containerClass}" role="alert">
        <div class="flex items-start gap-3">
          <div class="flex-shrink-0 text-red-500" aria-hidden="true">
            ${renderIcon(icon, { size: '20px', extraClass: iconClass })}
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-red-800">${escapeHtml(title)}</p>
            <p class="text-sm text-red-700 mt-1">${escapeHtml(message)}</p>
          </div>
          ${showRetry ? `
            <button type="button" class="ui-state-retry-btn flex-shrink-0 text-sm text-red-600 hover:text-red-700 font-medium">
              ${escapeHtml(retryText)}
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }

  return `
    <div class="ui-state ui-state-error flex items-center justify-center py-16 ${containerClass}" role="alert">
      <div class="flex flex-col items-center gap-4 text-center max-w-md">
        <div class="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center" aria-hidden="true">
          ${renderIcon(icon, { size: '24px', extraClass: iconClass })}
        </div>
        <div>
          <h3 class="text-lg font-medium text-gray-900">${escapeHtml(title)}</h3>
          <p class="text-sm text-gray-500 mt-1">${escapeHtml(message)}</p>
        </div>
        ${showRetry ? `
          <button type="button" class="ui-state-retry-btn px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors">
            ${escapeHtml(retryText)}
          </button>
        ` : ''}
      </div>
    </div>
  `;
}

/**
 * Render a forbidden/access denied state
 */
export function renderForbiddenState(config: ForbiddenStateConfig = {}): string {
  const {
    icon = 'iconoir:lock',
    iconClass = 'text-amber-500',
    title = 'Access Denied',
    resource,
    permission,
    containerClass = '',
    action,
  } = config;

  let message = config.message;
  if (!message) {
    if (resource && permission) {
      message = `You need the "${permission}" permission to view ${resource}.`;
    } else if (resource) {
      message = `You don't have permission to view ${resource}.`;
    } else {
      message = "You don't have permission to access this resource.";
    }
  }

  return `
    <div class="ui-state ui-state-forbidden flex items-center justify-center py-16 ${containerClass}" role="alert" aria-label="Access denied">
      <div class="flex flex-col items-center gap-4 text-center max-w-md">
        <div class="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center" aria-hidden="true">
          ${renderIcon(icon, { size: '24px', extraClass: iconClass })}
        </div>
        <div>
          <h3 class="text-lg font-medium text-gray-900">${escapeHtml(title)}</h3>
          <p class="text-sm text-gray-500 mt-1">${escapeHtml(message)}</p>
        </div>
        ${action ? renderActionButton(action) : ''}
      </div>
    </div>
  `;
}

/**
 * Render a table loading state (for use inside tbody)
 */
export function renderTableLoadingState(colspan: number, config: LoadingStateConfig = {}): string {
  const { text = 'Loading...', containerClass = '' } = config;

  return `
    <tr class="ui-state ui-state-table-loading ${containerClass}">
      <td colspan="${colspan}" class="px-4 py-12 text-center">
        <div class="inline-flex items-center gap-2 text-gray-500" aria-busy="true">
          <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span class="text-sm">${escapeHtml(text)}</span>
        </div>
      </td>
    </tr>
  `;
}

/**
 * Render a table error state (for use inside tbody)
 */
export function renderTableErrorState(
  colspan: number,
  config: ErrorStateConfig = {}
): string {
  const {
    icon = 'iconoir:warning-triangle',
    iconClass = 'text-red-500',
    title = 'Failed to load data',
    error,
    containerClass = '',
    showRetry = true,
    retryText = 'Try again',
  } = config;

  const message = config.message || error?.message || 'An error occurred while loading.';

  return `
    <tr class="ui-state ui-state-table-error ${containerClass}">
      <td colspan="${colspan}" class="px-4 py-12 text-center">
        <div class="text-red-500 mb-2" aria-hidden="true">
          ${renderIcon(icon, { size: '24px', extraClass: iconClass })}
        </div>
        <p class="text-sm font-medium text-gray-900">${escapeHtml(title)}</p>
        <p class="text-sm text-gray-500 mt-1">${escapeHtml(message)}</p>
        ${showRetry ? `
          <button type="button" class="ui-state-retry-btn mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium">
            ${escapeHtml(retryText)}
          </button>
        ` : ''}
      </td>
    </tr>
  `;
}

/**
 * Render a table empty state (for use inside tbody)
 */
export function renderTableEmptyState(
  colspan: number,
  config: EmptyStateConfig = {}
): string {
  const defaults = EMPTY_STATE_DEFAULTS[config.type || 'generic'];
  const {
    icon = defaults.icon,
    iconClass = 'text-gray-400',
    title = defaults.title,
    message = defaults.message,
    containerClass = '',
  } = config;

  return `
    <tr class="ui-state ui-state-table-empty ${containerClass}">
      <td colspan="${colspan}" class="px-4 py-12 text-center">
        <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-4" aria-hidden="true">
          ${renderIcon(icon, { size: '24px', extraClass: iconClass })}
        </div>
        <h3 class="text-lg font-medium text-gray-900">${escapeHtml(title)}</h3>
        <p class="text-sm text-gray-500 mt-1">${escapeHtml(message)}</p>
      </td>
    </tr>
  `;
}

/**
 * Render a table no-results state (for use inside tbody)
 */
export function renderTableNoResultsState(
  colspan: number,
  config: NoResultsStateConfig = {}
): string {
  const {
    icon = 'iconoir:search',
    iconClass = 'text-gray-400',
    title = 'No results found',
    query,
    filterCount = 0,
    containerClass = '',
    onReset,
  } = config;

  let message = config.message;
  if (!message) {
    if (query && filterCount > 0) {
      message = `No items match "${query}" with ${filterCount} filter${filterCount > 1 ? 's' : ''} applied.`;
    } else if (query) {
      message = `No items match "${query}".`;
    } else if (filterCount > 0) {
      message = `No items match the ${filterCount} filter${filterCount > 1 ? 's' : ''} applied.`;
    } else {
      message = 'Try adjusting your search or filters.';
    }
  }

  return `
    <tr class="ui-state ui-state-table-no-results ${containerClass}">
      <td colspan="${colspan}" class="px-4 py-12 text-center">
        <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-4" aria-hidden="true">
          ${renderIcon(icon, { size: '24px', extraClass: iconClass })}
        </div>
        <h3 class="text-lg font-medium text-gray-900">${escapeHtml(title)}</h3>
        <p class="text-sm text-gray-500 mt-1">${escapeHtml(message)}</p>
        ${onReset ? `
          <button type="button" class="ui-state-reset-btn mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium">
            Clear filters
          </button>
        ` : ''}
      </td>
    </tr>
  `;
}

// =============================================================================
// State Manager Class
// =============================================================================

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
export class UIStateManager {
  private container: HTMLElement;
  private config: UIStateManagerConfig;
  private currentState: UIStateType = 'loading';

  constructor(config: UIStateManagerConfig) {
    this.container = config.container;
    this.config = config;
  }

  /**
   * Show loading state
   */
  showLoading(loadingConfig?: LoadingStateConfig): void {
    this.currentState = 'loading';
    this.container.innerHTML = renderLoadingState(loadingConfig);
  }

  /**
   * Show empty state (no data)
   */
  showEmpty(emptyConfig?: EmptyStateConfig): void {
    this.currentState = 'empty';
    this.container.innerHTML = renderEmptyState(emptyConfig);
  }

  /**
   * Show no-results state (filters returned nothing)
   */
  showNoResults(noResultsConfig?: NoResultsStateConfig): void {
    this.currentState = 'no-results';
    const config = { ...noResultsConfig, onReset: noResultsConfig?.onReset || this.config.onReset };
    this.container.innerHTML = renderNoResultsState(config);
    this.bindResetHandler();
  }

  /**
   * Show error state
   */
  showError(errorConfig?: ErrorStateConfig): void {
    this.currentState = 'error';
    const config = { ...errorConfig, onRetry: errorConfig?.onRetry || this.config.onRetry };
    this.container.innerHTML = renderErrorState(config);
    this.bindRetryHandler();
  }

  /**
   * Show forbidden state
   */
  showForbidden(forbiddenConfig?: ForbiddenStateConfig): void {
    this.currentState = 'forbidden';
    this.container.innerHTML = renderForbiddenState(forbiddenConfig);
  }

  /**
   * Show content (clears any state and allows content rendering)
   */
  showContent(): void {
    this.currentState = 'content';
    // Content rendering is handled externally
  }

  /**
   * Get current state
   */
  getState(): UIStateType {
    return this.currentState;
  }

  /**
   * Check if currently showing loading
   */
  isLoading(): boolean {
    return this.currentState === 'loading';
  }

  /**
   * Check if showing error
   */
  hasError(): boolean {
    return this.currentState === 'error';
  }

  private bindRetryHandler(): void {
    const retryBtn = this.container.querySelector('.ui-state-retry-btn');
    retryBtn?.addEventListener('click', () => {
      this.config.onRetry?.();
    });
  }

  private bindResetHandler(): void {
    const resetBtn = this.container.querySelector('.ui-state-reset-btn');
    resetBtn?.addEventListener('click', () => {
      this.config.onReset?.();
    });
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

function renderActionButton(action: { text: string; onClick: () => void; variant?: 'primary' | 'secondary' | 'danger' }): string {
  const variantClasses = {
    primary: 'text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 focus:ring-gray-500',
    danger: 'text-white bg-red-600 hover:bg-red-700 focus:ring-red-500',
  };

  const classes = variantClasses[action.variant || 'primary'];

  return `
    <button type="button" class="ui-state-action-btn px-4 py-2 text-sm font-medium rounded-lg focus:ring-2 focus:ring-offset-2 transition-colors ${classes}">
      ${escapeHtml(action.text)}
    </button>
  `;
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

