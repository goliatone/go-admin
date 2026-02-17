/**
 * Shared Locale Action Component
 *
 * Reusable UI component for locale-level actions (Create/Open translation).
 * Used across fallback banner, blocker modal, and inline missing-locale affordances.
 *
 * Design decisions (per TRANSLATION_UX_IMPL.md):
 * - Single component for create/open actions ensures consistent UX
 * - Loading/success/error states handled uniformly
 * - Accessible with keyboard navigation and screen-reader labels
 */
/**
 * Configuration for a locale action chip
 */
export interface LocaleActionConfig {
    /** The locale code (e.g., 'es', 'fr') */
    locale: string;
    /** The record ID for actions */
    recordId: string;
    /** API endpoint for panel actions (e.g., /admin/api/panels/pages) */
    apiEndpoint: string;
    /** Base path for navigation (e.g., /admin/content/pages) */
    navigationBasePath: string;
    /** Panel/entity name (e.g., 'pages') */
    panelName?: string;
    /** Current environment context */
    environment?: string;
    /** Whether the locale exists (for existing locales, only show open action) */
    localeExists?: boolean;
    /** Display size variant */
    size?: 'sm' | 'md';
    /** Display mode: 'chip' for inline, 'button' for prominent */
    mode?: 'chip' | 'button';
    /** Callback after successful create action */
    onCreateSuccess?: (locale: string, result: CreateActionResult) => void;
    /** Callback after action error */
    onError?: (locale: string, message: string) => void;
    /** Callback after open action triggered */
    onOpen?: (locale: string, url: string) => void;
}
/**
 * Result from create_translation action
 */
export interface CreateActionResult {
    id: string;
    locale: string;
    status: string;
    translationGroupId?: string;
}
/**
 * State for a locale action component
 */
export interface LocaleActionState {
    loading: boolean;
    created: boolean;
    error: string | null;
    newRecordId?: string;
}
/**
 * Get human-readable label for a locale code.
 */
export declare function getLocaleLabel(locale: string): string;
/**
 * LocaleActionChip renders a locale chip with create/open actions.
 * Manages its own state and can be used standalone or in a list.
 */
export declare class LocaleActionChip {
    private config;
    private state;
    private element;
    constructor(config: LocaleActionConfig);
    /**
     * Render the locale action chip as HTML string.
     * Use when generating static HTML.
     */
    render(): string;
    /**
     * Render action buttons (create/open).
     */
    private renderActions;
    /**
     * Mount the component to a container element and bind events.
     */
    mount(container: HTMLElement): void;
    /**
     * Bind event handlers to action buttons.
     */
    private bindEvents;
    /**
     * Handle create translation action.
     */
    handleCreate(): Promise<void>;
    /**
     * Handle open translation action.
     */
    handleOpen(): void;
    /**
     * Update component state and re-render.
     */
    private setState;
    /**
     * Render spinner icon for loading state.
     */
    private renderSpinner;
    /**
     * Render check icon for success state.
     */
    private renderCheckIcon;
    /**
     * Render error icon for error state.
     */
    private renderErrorIcon;
    /**
     * Get current state (for testing/inspection).
     */
    getState(): LocaleActionState;
}
/**
 * Render a static locale action chip as HTML.
 * Use for server-side or initial render scenarios.
 */
export declare function renderLocaleActionChip(config: LocaleActionConfig): string;
/**
 * Render a list of locale action chips.
 * Useful for rendering multiple missing locales at once.
 */
export declare function renderLocaleActionList(locales: string[], baseConfig: Omit<LocaleActionConfig, 'locale'>): string;
/**
 * Initialize locale action chips within a container.
 * Binds event handlers to all chips matching the selector.
 */
export declare function initLocaleActionChips(container: HTMLElement, baseConfig: Omit<LocaleActionConfig, 'locale'>): Map<string, LocaleActionChip>;
/**
 * Build URL for editing a specific locale of a record.
 */
export declare function buildLocaleEditUrl(basePath: string, recordId: string, locale: string, environment?: string): string;
//# sourceMappingURL=locale-action.d.ts.map