/**
 * Quick Filters Component (Phase 2)
 *
 * Provides preset filter buttons for common translation filter scenarios.
 * Supports capability-aware disabled states with visible reason text.
 *
 * Contract:
 * - Quick filters are visible-disabled when unsupported, not hidden
 * - Each filter shows a reason when disabled
 * - Filter state is synchronized with DataGrid
 */
/**
 * Quick filter definition
 */
export interface QuickFilter {
    /** Unique filter key */
    key: string;
    /** Display label */
    label: string;
    /** Filter field name */
    field: string;
    /** Filter value */
    value: string;
    /** Icon or badge (optional) */
    icon?: string;
    /** CSS class for styling */
    styleClass?: string;
    /** Tooltip description */
    description?: string;
}
/**
 * Quick filter capability - defines whether a filter is supported
 */
export interface QuickFilterCapability {
    /** The filter key */
    key: string;
    /** Whether the filter is supported */
    supported: boolean;
    /** Reason why filter is disabled (when not supported) */
    disabledReason?: string;
}
/**
 * Quick filter state
 */
export interface QuickFilterState {
    /** Currently active filter key (null if none) */
    activeKey: string | null;
    /** Filter capabilities */
    capabilities: Map<string, QuickFilterCapability>;
}
/**
 * Quick filters configuration
 */
export interface QuickFiltersConfig {
    /** Container element or selector */
    container: HTMLElement | string;
    /** Available filters */
    filters: QuickFilter[];
    /** Initial capabilities (optional) */
    capabilities?: QuickFilterCapability[];
    /** Callback when filter is selected */
    onFilterSelect: (filter: QuickFilter | null) => void;
    /** Additional CSS classes */
    containerClass?: string;
    /** Size variant */
    size?: 'sm' | 'default';
}
/**
 * Default quick filters for translation readiness states
 */
export declare const DEFAULT_TRANSLATION_QUICK_FILTERS: QuickFilter[];
export declare class QuickFilters {
    private container;
    private config;
    private state;
    constructor(config: QuickFiltersConfig);
    /**
     * Render the quick filters
     */
    render(): void;
    /**
     * Render a single filter button
     */
    private renderFilterButton;
    /**
     * Bind event listeners to filter buttons
     */
    private bindEventListeners;
    /**
     * Select a filter by key
     */
    selectFilter(key: string): void;
    /**
     * Clear the active filter
     */
    clearFilter(): void;
    /**
     * Update filter capabilities
     */
    updateCapabilities(capabilities: QuickFilterCapability[]): void;
    /**
     * Set a specific capability
     */
    setCapability(key: string, supported: boolean, disabledReason?: string): void;
    /**
     * Get current active filter
     */
    getActiveFilter(): QuickFilter | null;
    /**
     * Set active filter programmatically
     */
    setActiveFilter(key: string | null): void;
    /**
     * Destroy the component
     */
    destroy(): void;
}
/**
 * Create quick filters for translation readiness
 */
export declare function createTranslationQuickFilters(container: HTMLElement | string, onFilterSelect: (filter: QuickFilter | null) => void, options?: {
    capabilities?: QuickFilterCapability[];
    size?: 'sm' | 'default';
    containerClass?: string;
}): QuickFilters;
/**
 * Initialize quick filters on elements with data-quick-filters attribute
 */
export declare function initQuickFilters(onFilterSelect: (filter: QuickFilter | null, container: HTMLElement) => void): QuickFilters[];
/**
 * Render inline quick filters HTML for embedding in templates
 */
export declare function renderQuickFiltersHTML(options?: {
    filters?: QuickFilter[];
    activeKey?: string | null;
    capabilities?: QuickFilterCapability[];
    size?: 'sm' | 'default';
    containerClass?: string;
}): string;
//# sourceMappingURL=quick-filters.d.ts.map