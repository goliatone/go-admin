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
 * Translation readiness state from canonical backend `translation_readiness` fields.
 * Used for grid-level visibility without requiring publish-failure round trips.
 */
export interface TranslationReadiness {
    /** Translation group ID linking all locale variants */
    translationGroupId: string | null;
    /** Required locales per policy for this entity/transition/environment */
    requiredLocales: string[];
    /** Available locales that exist for this translation group */
    availableLocales: string[];
    /** Locales that are required but missing */
    missingRequiredLocales: string[];
    /** Missing required fields by locale (only includes locales in availableLocales) */
    missingRequiredFieldsByLocale: Record<string, string[]>;
    /** Computed readiness state */
    readinessState: ReadinessState | null;
    /** Transition readiness map (e.g., { publish: true }) */
    readyForTransition: Record<string, boolean>;
    /** Environment used for policy evaluation */
    evaluatedEnvironment: string | null;
    /** Whether readiness metadata is present (for legacy compat) */
    hasReadinessMetadata: boolean;
}
/** Possible readiness states from backend */
export type ReadinessState = 'ready' | 'missing_locales' | 'missing_fields' | 'missing_locales_and_fields';
/**
 * Readiness badge rendering options
 */
export interface ReadinessBadgeOptions {
    /** Size variant for the badge */
    size?: 'sm' | 'default';
    /** Show detailed tooltip with missing info */
    showDetailedTooltip?: boolean;
    /** Additional CSS classes */
    extraClass?: string;
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
 * Extract canonical translation readiness fields from a record payload.
 * These fields are exposed by Phase 18.6 productization for grid-level visibility.
 *
 * @param record - The record object from API response
 * @returns Normalized TranslationReadiness
 */
export declare function extractTranslationReadiness(record: Record<string, unknown>): TranslationReadiness;
/**
 * Check if a record has canonical translation readiness metadata.
 * Used to determine whether to use productized rendering vs legacy fallback.
 */
export declare function hasTranslationReadiness(record: Record<string, unknown>): boolean;
/**
 * Check if a record is ready for a specific transition (e.g., 'publish').
 */
export declare function isReadyForTransition(record: Record<string, unknown>, transition: string): boolean;
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
 * Render a translation readiness indicator for content rows.
 * Shows completeness state based on canonical backend readiness fields.
 *
 * @param record - The record from API response
 * @param options - Rendering options
 * @returns HTML string for the readiness indicator
 */
export declare function renderReadinessIndicator(record: Record<string, unknown>, options?: ReadinessBadgeOptions): string;
/**
 * Render a compact publish readiness badge (ready/not ready).
 */
export declare function renderPublishReadinessBadge(record: Record<string, unknown>, options?: ReadinessBadgeOptions): string;
/**
 * Render a locale completeness progress indicator.
 * Shows X/Y locales complete.
 */
export declare function renderLocaleCompleteness(record: Record<string, unknown>, options?: {
    size?: 'sm' | 'default';
    extraClass?: string;
}): string;
/**
 * Render a prominent "Missing Translations" badge for list rows.
 * This is a first-class affordance to quickly identify incomplete content.
 *
 * @param record - The record from API response
 * @param options - Rendering options
 * @returns HTML string for the missing translations badge, or empty if complete
 */
export declare function renderMissingTranslationsBadge(record: Record<string, unknown>, options?: ReadinessBadgeOptions): string;
/**
 * Check if a record has missing required translations.
 * Used for quick filtering in list views.
 */
export declare function hasMissingTranslations(record: Record<string, unknown>): boolean;
/**
 * Get the missing translations count for a record.
 */
export declare function getMissingTranslationsCount(record: Record<string, unknown>): number;
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