/**
 * Inline Missing Locale Chips Component
 *
 * Renders actionable locale chips inline with content rows for creating
 * missing translations directly from list/grid views.
 *
 * Design decisions (per TRANSLATION_UX_IMPL.md Section 8.2):
 * - Chips appear inline with rows that have missing required locales
 * - Create action is gated by _action_state for the create_translation action
 * - Uses shared LocaleActionChip component for consistent UX
 */
import { LocaleActionChip, type CreateActionResult } from './locale-action.js';
/**
 * Configuration for inline locale chips
 */
export interface InlineLocaleChipsConfig {
    /** Record ID */
    recordId: string;
    /** API endpoint for panel actions (e.g., /admin/api/pages) */
    apiEndpoint: string;
    /** Base path for navigation (e.g., /admin/content/pages) */
    navigationBasePath: string;
    /** Panel/entity name (e.g., 'pages') */
    panelName?: string;
    /** Current environment context */
    environment?: string;
    /** Maximum number of chips to display (default: 3) */
    maxChips?: number;
    /** Size variant for chips */
    size?: 'sm' | 'md';
    /** Callback after successful create action */
    onCreateSuccess?: (locale: string, result: CreateActionResult) => void;
    /** Callback after action error */
    onError?: (locale: string, message: string) => void;
}
/**
 * Action state from record _action_state field
 */
export interface ActionStateEntry {
    enabled?: boolean;
    reason?: string;
    reason_code?: string;
}
/**
 * InlineLocaleChips renders actionable chips for missing locales.
 * Respects _action_state for gating the create_translation action.
 */
export declare class InlineLocaleChips {
    private config;
    private readiness;
    private actionState;
    private chips;
    private element;
    constructor(record: Record<string, unknown>, config: InlineLocaleChipsConfig);
    /**
     * Extract action state for a specific action from the record.
     */
    private extractActionState;
    /**
     * Check if the create_translation action is enabled.
     */
    isCreateActionEnabled(): boolean;
    /**
     * Get the disabled reason if create action is disabled.
     */
    getDisabledReason(): string | null;
    /**
     * Get missing locales to display as chips.
     */
    getMissingLocales(): string[];
    /**
     * Get count of overflow locales (not displayed).
     */
    getOverflowCount(): number;
    /**
     * Render the inline locale chips as HTML string.
     */
    render(): string;
    /**
     * Render a single locale chip.
     */
    private renderChip;
    /**
     * Render a disabled locale chip (no action buttons).
     */
    private renderDisabledChip;
    /**
     * Render overflow indicator.
     */
    private renderOverflow;
    /**
     * Mount the component and bind events.
     */
    mount(container: HTMLElement): void;
    /**
     * Bind event handlers for actionable chips.
     */
    private bindEvents;
    /**
     * Get chip instance by locale (for testing/inspection).
     */
    getChip(locale: string): LocaleActionChip | undefined;
}
/**
 * Render inline locale chips from a record payload.
 */
export declare function renderInlineLocaleChips(record: Record<string, unknown>, config: Omit<InlineLocaleChipsConfig, 'recordId'>): string;
/**
 * Check if a record has missing locales that should show chips.
 */
export declare function shouldShowInlineLocaleChips(record: Record<string, unknown>): boolean;
/**
 * Initialize inline locale chips in a container.
 */
export declare function initInlineLocaleChips(container: HTMLElement, record: Record<string, unknown>, config: Omit<InlineLocaleChipsConfig, 'recordId'>): InlineLocaleChips;
/**
 * Create a cell renderer for inline locale chips.
 * Can be used with DataGrid column configuration.
 */
export declare function createInlineLocaleChipsRenderer(config: Omit<InlineLocaleChipsConfig, 'recordId'>): (value: unknown, record: Record<string, unknown>, column: string) => string;
//# sourceMappingURL=inline-locale-chips.d.ts.map