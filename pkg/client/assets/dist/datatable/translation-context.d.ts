/**
 * Translation Context Helpers
 *
 * Normalizes translation metadata from API responses (flat or nested) and provides
 * UI rendering utilities for locale badges, fallback warnings, and edit guards.
 *
 * Translation context fields (per CONTENT_TRANSLATION_TDD.md):
 * - requested_locale: The locale requested by the user
 * - resolved_locale: The locale actually returned (may differ if fallback used)
 * - available_locales: Array of locales that exist for this translation group
 * - missing_requested_locale: Boolean indicating requested locale doesn't exist
 * - fallback_used: Boolean indicating content is from a fallback locale
 * - translation_group_id: The group ID linking all locale variants
 */
/**
 * Normalized translation context extracted from record payloads.
 * Used for UI rendering decisions (badges, warnings, edit guards).
 */
export interface TranslationContext {
    /** The locale that was requested (from query params) */
    requestedLocale: string | null;
    /** The locale that was actually resolved/returned */
    resolvedLocale: string | null;
    /** Array of available locales for this translation group */
    availableLocales: string[];
    /** True if the requested locale doesn't exist */
    missingRequestedLocale: boolean;
    /** True if content is from a fallback locale (not the requested one) */
    fallbackUsed: boolean;
    /** Translation group ID linking all locale variants */
    translationGroupId: string | null;
    /** Workflow status of the current locale variant */
    status: string | null;
    /** Entity type (pages, posts, etc.) */
    entityType: string | null;
    /** Record ID */
    recordId: string | null;
}
/**
 * Badge rendering options
 */
export interface LocaleBadgeOptions {
    /** Show fallback indicator when in fallback mode */
    showFallbackIndicator?: boolean;
    /** Size variant for the badge */
    size?: 'sm' | 'default';
    /** Additional CSS classes */
    extraClass?: string;
}
/**
 * Translation status indicator options
 */
export interface TranslationStatusOptions {
    /** Maximum number of locales to show before truncating */
    maxLocales?: number;
    /** Show the resolved locale badge */
    showResolvedLocale?: boolean;
    /** Size variant */
    size?: 'sm' | 'default';
}
/**
 * Extract and normalize translation context from a record payload.
 * Handles both flat fields and nested `translation.meta.*` / `content_translation.meta.*` structures.
 *
 * @param record - The record object from API response
 * @returns Normalized TranslationContext
 */
export declare function extractTranslationContext(record: Record<string, unknown>): TranslationContext;
/**
 * Check if a record is in fallback mode (requested locale doesn't exist).
 * Use this to determine if edit guards should be applied.
 */
export declare function isInFallbackMode(record: Record<string, unknown>): boolean;
/**
 * Check if a record has translation context metadata available.
 */
export declare function hasTranslationContext(record: Record<string, unknown>): boolean;
/**
 * Render a locale badge for display in content rows.
 * Shows the resolved locale with an optional fallback indicator.
 *
 * @param context - Translation context or record to extract from
 * @param options - Rendering options
 * @returns HTML string for the locale badge
 */
export declare function renderLocaleBadge(context: TranslationContext | Record<string, unknown>, options?: LocaleBadgeOptions): string;
/**
 * Render available locales as a compact indicator for content rows.
 * Shows which locales exist for this translation group.
 *
 * @param context - Translation context or record
 * @param options - Rendering options
 * @returns HTML string for available locales indicator
 */
export declare function renderAvailableLocalesIndicator(context: TranslationContext | Record<string, unknown>, options?: TranslationStatusOptions): string;
/**
 * Render a combined translation status cell for content rows.
 * Combines locale badge + availability indicator.
 *
 * @param context - Translation context or record
 * @param options - Rendering options
 * @returns HTML string for the translation status cell
 */
export declare function renderTranslationStatusCell(context: TranslationContext | Record<string, unknown>, options?: TranslationStatusOptions): string;
/**
 * Render a workflow status badge.
 */
export declare function renderStatusBadge(status: string | null, size?: 'sm' | 'default'): string;
/**
 * Render a fallback warning banner for detail/edit views.
 * Shows when the requested locale doesn't exist and fallback content is displayed.
 *
 * @param context - Translation context
 * @param options - Options for the warning
 * @returns HTML string for the fallback warning banner
 */
export declare function renderFallbackWarning(context: TranslationContext, options?: {
    /** Handler URL for creating the missing translation */
    createTranslationUrl?: string;
    /** Panel name for action dispatch */
    panelName?: string;
    /** Show create translation button */
    showCreateButton?: boolean;
}): string;
/**
 * Create a cell renderer for translation status that can be used with DataGrid.
 * Returns a function compatible with the CellRenderer type.
 *
 * @param options - Rendering options
 * @returns CellRenderer function
 */
export declare function createTranslationStatusRenderer(options?: TranslationStatusOptions): (value: unknown, record: Record<string, unknown>, column: string) => string;
/**
 * Create a cell renderer for locale badge only.
 */
export declare function createLocaleBadgeRenderer(options?: LocaleBadgeOptions): (value: unknown, record: Record<string, unknown>, column: string) => string;
//# sourceMappingURL=translation-context.d.ts.map