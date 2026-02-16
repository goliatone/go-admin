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
/**
 * Default action labels with safe, user-friendly text.
 * These serve as fallbacks when backend doesn't provide custom labels.
 */
declare const DEFAULT_ACTION_LABELS: Record<string, ActionLabelEntry>;
/**
 * Initialize activity labels from backend config.
 * Call this during app bootstrap before rendering activity pages.
 */
export declare function initActivityLabels(config?: ActionLabelConfig): void;
/**
 * Get the label for an action.
 * This is the primary function to use for rendering action labels.
 */
export declare function getActionLabel(action: string): string;
/**
 * Get full entry information for an action.
 */
export declare function getActionEntry(action: string): ActionLabelEntry | null;
/**
 * Get all known action labels as a flat map.
 */
export declare function getAllActionLabels(): Record<string, string>;
/**
 * Get actions grouped by category.
 */
export declare function getActionsByCategory(): Record<string, ActionLabelEntry[]>;
/**
 * Update backend labels at runtime (e.g., after fetching config).
 */
export declare function setActionLabels(labels: Record<string, string>): void;
/**
 * Check if the registry is initialized.
 */
export declare function isActivityLabelsInitialized(): boolean;
/**
 * Reset the registry to default state.
 */
export declare function resetActivityLabels(): void;
/**
 * Create a getActionLabel function bound to specific overrides.
 * Useful for component-specific label customization.
 */
export declare function createActionLabelResolver(overrides?: Record<string, string>): (action: string) => string;
export { DEFAULT_ACTION_LABELS };
//# sourceMappingURL=activity-labels.d.ts.map