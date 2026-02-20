/**
 * Translation Status Legend Component
 *
 * Provides a visual legend for translation status indicators in content list views.
 * Shows readiness states using consistent iconography across the admin panel.
 *
 * Contract:
 * - ● ready: All required translations complete
 * - ◐ incomplete: Has translations but missing required fields
 * - ○ missing: Missing required locale translations
 * - ⚠ fallback/stale: Viewing fallback content or stale data
 *
 * Phase 1 behavior:
 * - Always visible in list toolbar
 * - Non-collapsible
 * - No persisted user preference
 */
/**
 * Status legend item definition
 */
export interface StatusLegendItem {
    /** Unique status key */
    key: string;
    /** Display label */
    label: string;
    /** Icon character or SVG */
    icon: string;
    /** CSS color class for the icon */
    colorClass: string;
    /** Tooltip/description */
    description: string;
}
/**
 * Status legend configuration
 */
export interface StatusLegendConfig {
    /** Container element or selector */
    container: HTMLElement | string;
    /** Additional CSS classes for the legend container */
    containerClass?: string;
    /** Legend title (optional) */
    title?: string;
    /** Orientation: horizontal (default) or vertical */
    orientation?: 'horizontal' | 'vertical';
    /** Size variant */
    size?: 'sm' | 'default';
    /** Items to display (uses defaults if not provided) */
    items?: StatusLegendItem[];
}
/**
 * Default translation status legend items per contract
 */
export declare const DEFAULT_STATUS_LEGEND_ITEMS: StatusLegendItem[];
/**
 * @deprecated Since v2.x - status icons are now inline in quick filters.
 * Retained for compatibility with existing custom templates; planned removal in v3.0.
 */
export declare class StatusLegend {
    private container;
    private config;
    constructor(config: StatusLegendConfig);
    /**
     * Render the legend into the container
     */
    render(): void;
    /**
     * Build HTML for the legend
     */
    buildHTML(): string;
    /**
     * Render a single legend item
     */
    private renderItem;
    /**
     * Update items and re-render
     */
    setItems(items: StatusLegendItem[]): void;
    /**
     * Destroy the legend
     */
    destroy(): void;
    /**
     * Escape HTML special characters
     */
    private escapeHtml;
}
/**
 * Create and render a status legend
 */
export declare function createStatusLegend(config: StatusLegendConfig): StatusLegend;
/**
 * Initialize status legend on elements with data-status-legend attribute
 */
export declare function initStatusLegends(): StatusLegend[];
/**
 * Render inline legend HTML for embedding in templates
 */
export declare function renderStatusLegendHTML(options?: {
    title?: string;
    orientation?: 'horizontal' | 'vertical';
    size?: 'sm' | 'default';
    items?: StatusLegendItem[];
    containerClass?: string;
}): string;
//# sourceMappingURL=status-legend.d.ts.map