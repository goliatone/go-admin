/**
 * Activity Action Labels Module
 * Provides action label resolution with backend-provided overrides and safe fallbacks.
 *
 * Usage:
 *   // Initialize from backend config during app bootstrap
 *   initActivityLabels({ labels: configFromBackend.activity_labels });
 *
 *   // Use in activity page
 *   createActivityPage({ getActionLabel: getActionLabel });
 */

// =============================================================================
// Types
// =============================================================================

export interface ActionLabelConfig {
  /** Backend-provided action label overrides */
  labels?: Record<string, string>;
  /** Fallback for unknown actions (default: formats snake_case to Title Case) */
  fallbackFormatter?: (action: string) => string;
}

export interface ActionLabelEntry {
  /** The action key (e.g., "connected", "sync_started") */
  action: string;
  /** Human-readable label */
  label: string;
  /** Optional description for tooltips */
  description?: string;
  /** Optional category for grouping */
  category?: string;
}

// =============================================================================
// Default Action Labels
// =============================================================================

/**
 * Default action labels with safe, user-friendly text.
 * These serve as fallbacks when backend doesn't provide custom labels.
 */
const DEFAULT_ACTION_LABELS: Record<string, ActionLabelEntry> = {
  // Connection lifecycle
  connected: {
    action: 'connected',
    label: 'Connected',
    description: 'Service connection established',
    category: 'connections',
  },
  disconnected: {
    action: 'disconnected',
    label: 'Disconnected',
    description: 'Service connection terminated',
    category: 'connections',
  },
  refreshed: {
    action: 'refreshed',
    label: 'Credentials Refreshed',
    description: 'Connection credentials were refreshed',
    category: 'credentials',
  },
  revoked: {
    action: 'revoked',
    label: 'Connection Revoked',
    description: 'Connection access was revoked',
    category: 'connections',
  },
  reconsent_started: {
    action: 'reconsent_started',
    label: 'Re-consent Started',
    description: 'User initiated re-authorization',
    category: 'connections',
  },
  reconsent_completed: {
    action: 'reconsent_completed',
    label: 'Re-consent Completed',
    description: 'User completed re-authorization',
    category: 'connections',
  },
  reconsent_failed: {
    action: 'reconsent_failed',
    label: 'Re-consent Failed',
    description: 'Re-authorization could not be completed',
    category: 'connections',
  },

  // Sync operations
  sync_started: {
    action: 'sync_started',
    label: 'Sync Started',
    description: 'Data synchronization began',
    category: 'sync',
  },
  sync_completed: {
    action: 'sync_completed',
    label: 'Sync Completed',
    description: 'Data synchronization finished successfully',
    category: 'sync',
  },
  sync_failed: {
    action: 'sync_failed',
    label: 'Sync Failed',
    description: 'Data synchronization encountered an error',
    category: 'sync',
  },
  sync_progress: {
    action: 'sync_progress',
    label: 'Sync Progress',
    description: 'Data synchronization progress update',
    category: 'sync',
  },

  // Webhook events
  webhook_received: {
    action: 'webhook_received',
    label: 'Webhook Received',
    description: 'Inbound webhook notification received',
    category: 'webhooks',
  },
  webhook_processed: {
    action: 'webhook_processed',
    label: 'Webhook Processed',
    description: 'Webhook notification was processed',
    category: 'webhooks',
  },
  webhook_failed: {
    action: 'webhook_failed',
    label: 'Webhook Failed',
    description: 'Webhook processing failed',
    category: 'webhooks',
  },
  webhook_retried: {
    action: 'webhook_retried',
    label: 'Webhook Retried',
    description: 'Webhook processing was retried',
    category: 'webhooks',
  },

  // Subscription events
  subscription_created: {
    action: 'subscription_created',
    label: 'Subscription Created',
    description: 'Event subscription was established',
    category: 'subscriptions',
  },
  subscription_renewed: {
    action: 'subscription_renewed',
    label: 'Subscription Renewed',
    description: 'Event subscription was renewed',
    category: 'subscriptions',
  },
  subscription_expired: {
    action: 'subscription_expired',
    label: 'Subscription Expired',
    description: 'Event subscription has expired',
    category: 'subscriptions',
  },
  subscription_cancelled: {
    action: 'subscription_cancelled',
    label: 'Subscription Cancelled',
    description: 'Event subscription was cancelled',
    category: 'subscriptions',
  },

  // Installation events
  installed: {
    action: 'installed',
    label: 'Installed',
    description: 'Service was installed',
    category: 'installations',
  },
  uninstalled: {
    action: 'uninstalled',
    label: 'Uninstalled',
    description: 'Service was uninstalled',
    category: 'installations',
  },
  reinstalled: {
    action: 'reinstalled',
    label: 'Reinstalled',
    description: 'Service was reinstalled',
    category: 'installations',
  },

  // Grant/permission events
  grants_updated: {
    action: 'grants_updated',
    label: 'Permissions Updated',
    description: 'Connection permissions were modified',
    category: 'grants',
  },
  grants_captured: {
    action: 'grants_captured',
    label: 'Permissions Captured',
    description: 'Connection permissions were recorded',
    category: 'grants',
  },

  // Token events
  token_refreshed: {
    action: 'token_refreshed',
    label: 'Token Refreshed',
    description: 'Access token was refreshed',
    category: 'credentials',
  },
  token_expired: {
    action: 'token_expired',
    label: 'Token Expired',
    description: 'Access token has expired',
    category: 'credentials',
  },
  token_revoked: {
    action: 'token_revoked',
    label: 'Token Revoked',
    description: 'Access token was revoked',
    category: 'credentials',
  },

  // Error events
  error_occurred: {
    action: 'error_occurred',
    label: 'Error Occurred',
    description: 'An error was recorded',
    category: 'errors',
  },
  error_resolved: {
    action: 'error_resolved',
    label: 'Error Resolved',
    description: 'A previous error was resolved',
    category: 'errors',
  },

  // Rate limit events
  rate_limited: {
    action: 'rate_limited',
    label: 'Rate Limited',
    description: 'API request was rate limited',
    category: 'errors',
  },
  quota_exceeded: {
    action: 'quota_exceeded',
    label: 'Quota Exceeded',
    description: 'API quota was exceeded',
    category: 'errors',
  },
};

// =============================================================================
// Label Registry
// =============================================================================

/**
 * Action label registry singleton.
 * Manages backend-provided overrides and default labels.
 */
class ActionLabelRegistry {
  private backendLabels: Record<string, string> = {};
  private fallbackFormatter: (action: string) => string;
  private initialized = false;

  constructor() {
    this.fallbackFormatter = defaultFallbackFormatter;
  }

  /**
   * Initialize the registry with backend-provided labels.
   */
  init(config: ActionLabelConfig = {}): void {
    if (config.labels) {
      this.backendLabels = { ...config.labels };
    }
    if (config.fallbackFormatter) {
      this.fallbackFormatter = config.fallbackFormatter;
    }
    this.initialized = true;
  }

  /**
   * Check if registry has been initialized.
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get the label for an action.
   * Priority: backend override > default label > fallback formatter
   */
  getLabel(action: string): string {
    // Check backend overrides first
    if (this.backendLabels[action]) {
      return this.backendLabels[action];
    }

    // Check default labels
    const defaultEntry = DEFAULT_ACTION_LABELS[action];
    if (defaultEntry) {
      return defaultEntry.label;
    }

    // Use fallback formatter
    return this.fallbackFormatter(action);
  }

  /**
   * Get full entry information for an action (includes description, category).
   */
  getEntry(action: string): ActionLabelEntry | null {
    const defaultEntry = DEFAULT_ACTION_LABELS[action];
    if (!defaultEntry) {
      return null;
    }

    // Apply backend override to label if present
    return {
      ...defaultEntry,
      label: this.backendLabels[action] || defaultEntry.label,
    };
  }

  /**
   * Get all known actions with their labels.
   */
  getAllLabels(): Record<string, string> {
    const labels: Record<string, string> = {};

    // Add default labels
    for (const [action, entry] of Object.entries(DEFAULT_ACTION_LABELS)) {
      labels[action] = entry.label;
    }

    // Override with backend labels
    for (const [action, label] of Object.entries(this.backendLabels)) {
      labels[action] = label;
    }

    return labels;
  }

  /**
   * Get actions by category.
   */
  getActionsByCategory(): Record<string, ActionLabelEntry[]> {
    const categories: Record<string, ActionLabelEntry[]> = {};

    for (const entry of Object.values(DEFAULT_ACTION_LABELS)) {
      const category = entry.category || 'other';
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push({
        ...entry,
        label: this.backendLabels[entry.action] || entry.label,
      });
    }

    return categories;
  }

  /**
   * Add or update backend labels.
   */
  setLabels(labels: Record<string, string>): void {
    this.backendLabels = { ...this.backendLabels, ...labels };
  }

  /**
   * Clear backend labels (keeps defaults).
   */
  clearBackendLabels(): void {
    this.backendLabels = {};
  }

  /**
   * Reset to initial state.
   */
  reset(): void {
    this.backendLabels = {};
    this.fallbackFormatter = defaultFallbackFormatter;
    this.initialized = false;
  }
}

// =============================================================================
// Module Singleton
// =============================================================================

const registry = new ActionLabelRegistry();

/**
 * Initialize activity labels from backend config.
 * Call this during app bootstrap before rendering activity pages.
 */
export function initActivityLabels(config: ActionLabelConfig = {}): void {
  registry.init(config);
}

/**
 * Get the label for an action.
 * This is the primary function to use for rendering action labels.
 */
export function getActionLabel(action: string): string {
  return registry.getLabel(action);
}

/**
 * Get full entry information for an action.
 */
export function getActionEntry(action: string): ActionLabelEntry | null {
  return registry.getEntry(action);
}

/**
 * Get all known action labels as a flat map.
 */
export function getAllActionLabels(): Record<string, string> {
  return registry.getAllLabels();
}

/**
 * Get actions grouped by category.
 */
export function getActionsByCategory(): Record<string, ActionLabelEntry[]> {
  return registry.getActionsByCategory();
}

/**
 * Update backend labels at runtime (e.g., after fetching config).
 */
export function setActionLabels(labels: Record<string, string>): void {
  registry.setLabels(labels);
}

/**
 * Check if the registry is initialized.
 */
export function isActivityLabelsInitialized(): boolean {
  return registry.isInitialized();
}

/**
 * Reset the registry to default state.
 */
export function resetActivityLabels(): void {
  registry.reset();
}

/**
 * Create a getActionLabel function bound to specific overrides.
 * Useful for component-specific label customization.
 */
export function createActionLabelResolver(overrides: Record<string, string> = {}): (action: string) => string {
  return (action: string) => {
    if (overrides[action]) {
      return overrides[action];
    }
    return registry.getLabel(action);
  };
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Default fallback formatter: converts snake_case to Title Case.
 */
function defaultFallbackFormatter(action: string): string {
  return action
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// =============================================================================
// Export Constants
// =============================================================================

export { DEFAULT_ACTION_LABELS };
