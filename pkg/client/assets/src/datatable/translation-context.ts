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

import { badge } from '../shared/badge.js';

// ============================================================================
// Types
// ============================================================================

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

// ============================================================================
// Translation Context Extraction
// ============================================================================

/**
 * Extract and normalize translation context from a record payload.
 * Handles both flat fields and nested `translation.meta.*` / `content_translation.meta.*` structures.
 *
 * @param record - The record object from API response
 * @returns Normalized TranslationContext
 */
export function extractTranslationContext(record: Record<string, unknown>): TranslationContext {
  const context: TranslationContext = {
    requestedLocale: null,
    resolvedLocale: null,
    availableLocales: [],
    missingRequestedLocale: false,
    fallbackUsed: false,
    translationGroupId: null,
    status: null,
    entityType: null,
    recordId: null,
  };

  if (!record || typeof record !== 'object') {
    return context;
  }

  // Try flat fields first, then nested structures
  context.requestedLocale = extractStringField(record, [
    'requested_locale',
    'translation.meta.requested_locale',
    'content_translation.meta.requested_locale',
  ]);

  context.resolvedLocale = extractStringField(record, [
    'resolved_locale',
    'locale',
    'translation.meta.resolved_locale',
    'content_translation.meta.resolved_locale',
  ]);

  context.availableLocales = extractStringArrayField(record, [
    'available_locales',
    'translation.meta.available_locales',
    'content_translation.meta.available_locales',
  ]);

  context.missingRequestedLocale = extractBooleanField(record, [
    'missing_requested_locale',
    'translation.meta.missing_requested_locale',
    'content_translation.meta.missing_requested_locale',
  ]);

  context.fallbackUsed = extractBooleanField(record, [
    'fallback_used',
    'translation.meta.fallback_used',
    'content_translation.meta.fallback_used',
  ]);

  context.translationGroupId = extractStringField(record, [
    'translation_group_id',
    'translation.meta.translation_group_id',
    'content_translation.meta.translation_group_id',
  ]);

  context.status = extractStringField(record, ['status']);
  context.entityType = extractStringField(record, ['entity_type', 'type', '_type']);
  context.recordId = extractStringField(record, ['id']);

  // Infer fallback state from locale mismatch if not explicitly set
  if (!context.fallbackUsed && context.requestedLocale && context.resolvedLocale) {
    context.fallbackUsed = context.requestedLocale !== context.resolvedLocale;
  }

  // Infer missing_requested_locale from fallback state
  if (!context.missingRequestedLocale && context.fallbackUsed) {
    context.missingRequestedLocale = true;
  }

  return context;
}

/**
 * Check if a record is in fallback mode (requested locale doesn't exist).
 * Use this to determine if edit guards should be applied.
 */
export function isInFallbackMode(record: Record<string, unknown>): boolean {
  const ctx = extractTranslationContext(record);
  return ctx.fallbackUsed || ctx.missingRequestedLocale;
}

/**
 * Check if a record has translation context metadata available.
 */
export function hasTranslationContext(record: Record<string, unknown>): boolean {
  const ctx = extractTranslationContext(record);
  return ctx.translationGroupId !== null || ctx.resolvedLocale !== null || ctx.availableLocales.length > 0;
}

/**
 * Extract canonical translation readiness fields from a record payload.
 * These fields are exposed by Phase 18.6 productization for grid-level visibility.
 *
 * @param record - The record object from API response
 * @returns Normalized TranslationReadiness
 */
export function extractTranslationReadiness(record: Record<string, unknown>): TranslationReadiness {
  const readiness: TranslationReadiness = {
    translationGroupId: null,
    requiredLocales: [],
    availableLocales: [],
    missingRequiredLocales: [],
    missingRequiredFieldsByLocale: {},
    readinessState: null,
    readyForTransition: {},
    evaluatedEnvironment: null,
    hasReadinessMetadata: false,
  };

  if (!record || typeof record !== 'object') {
    return readiness;
  }

  // Check for nested translation_readiness object (canonical productized format)
  const readinessObj = record.translation_readiness as Record<string, unknown> | undefined;

  if (readinessObj && typeof readinessObj === 'object') {
    readiness.hasReadinessMetadata = true;

    readiness.translationGroupId = typeof readinessObj.translation_group_id === 'string'
      ? readinessObj.translation_group_id
      : null;

    readiness.requiredLocales = Array.isArray(readinessObj.required_locales)
      ? readinessObj.required_locales.filter((v): v is string => typeof v === 'string')
      : [];

    readiness.availableLocales = Array.isArray(readinessObj.available_locales)
      ? readinessObj.available_locales.filter((v): v is string => typeof v === 'string')
      : [];

    readiness.missingRequiredLocales = Array.isArray(readinessObj.missing_required_locales)
      ? readinessObj.missing_required_locales.filter((v): v is string => typeof v === 'string')
      : [];

    // Parse missing_required_fields_by_locale
    const fieldsByLocale = readinessObj.missing_required_fields_by_locale;
    if (fieldsByLocale && typeof fieldsByLocale === 'object' && !Array.isArray(fieldsByLocale)) {
      for (const [locale, fields] of Object.entries(fieldsByLocale)) {
        if (Array.isArray(fields)) {
          readiness.missingRequiredFieldsByLocale[locale] = fields.filter(
            (v): v is string => typeof v === 'string'
          );
        }
      }
    }

    // Parse readiness_state
    const state = readinessObj.readiness_state;
    if (typeof state === 'string' && isValidReadinessState(state)) {
      readiness.readinessState = state;
    }

    // Parse ready_for_transition map
    const readyFor = readinessObj.ready_for_transition;
    if (readyFor && typeof readyFor === 'object' && !Array.isArray(readyFor)) {
      for (const [transition, ready] of Object.entries(readyFor)) {
        if (typeof ready === 'boolean') {
          readiness.readyForTransition[transition] = ready;
        }
      }
    }

    readiness.evaluatedEnvironment = typeof readinessObj.evaluated_environment === 'string'
      ? readinessObj.evaluated_environment
      : null;
  }

  return readiness;
}

/**
 * Check if a record has canonical translation readiness metadata.
 * Used to determine whether to use productized rendering vs legacy fallback.
 */
export function hasTranslationReadiness(record: Record<string, unknown>): boolean {
  const readiness = extractTranslationReadiness(record);
  return readiness.hasReadinessMetadata;
}

/**
 * Check if a record is ready for a specific transition (e.g., 'publish').
 */
export function isReadyForTransition(record: Record<string, unknown>, transition: string): boolean {
  const readiness = extractTranslationReadiness(record);
  return readiness.readyForTransition[transition] === true;
}

/**
 * Type guard for valid readiness states.
 */
function isValidReadinessState(state: string): state is ReadinessState {
  return ['ready', 'missing_locales', 'missing_fields', 'missing_locales_and_fields'].includes(state);
}

// ============================================================================
// Badge Rendering
// ============================================================================

/**
 * Render a locale badge for display in content rows.
 * Shows the resolved locale with an optional fallback indicator.
 *
 * @param context - Translation context or record to extract from
 * @param options - Rendering options
 * @returns HTML string for the locale badge
 */
export function renderLocaleBadge(
  context: TranslationContext | Record<string, unknown>,
  options: LocaleBadgeOptions = {}
): string {
  const ctx = 'resolvedLocale' in context
    ? context as TranslationContext
    : extractTranslationContext(context as Record<string, unknown>);

  const { showFallbackIndicator = true, size = 'default', extraClass = '' } = options;

  if (!ctx.resolvedLocale) {
    return '';
  }

  const locale = ctx.resolvedLocale.toUpperCase();
  const isFallback = ctx.fallbackUsed || ctx.missingRequestedLocale;

  // Build badge classes
  const sizeClass = size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-xs px-2 py-1';
  const baseClasses = `inline-flex items-center gap-1 rounded font-medium ${sizeClass}`;

  if (isFallback && showFallbackIndicator) {
    // Fallback mode: amber/warning style with indicator
    return `<span class="${baseClasses} bg-amber-100 text-amber-800 ${extraClass}"
                  title="Showing ${ctx.resolvedLocale} content (${ctx.requestedLocale || 'requested locale'} not available)"
                  aria-label="Fallback locale: ${locale}">
      <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
      </svg>
      ${locale}
    </span>`;
  }

  // Normal locale badge
  return `<span class="${baseClasses} bg-blue-100 text-blue-800 ${extraClass}"
                title="Locale: ${locale}"
                aria-label="Locale: ${locale}">
    ${locale}
  </span>`;
}

/**
 * Render available locales as a compact indicator for content rows.
 * Shows which locales exist for this translation group.
 *
 * @param context - Translation context or record
 * @param options - Rendering options
 * @returns HTML string for available locales indicator
 */
export function renderAvailableLocalesIndicator(
  context: TranslationContext | Record<string, unknown>,
  options: TranslationStatusOptions = {}
): string {
  const ctx = 'resolvedLocale' in context
    ? context as TranslationContext
    : extractTranslationContext(context as Record<string, unknown>);

  const { maxLocales = 3, size = 'default' } = options;

  if (ctx.availableLocales.length === 0) {
    return '';
  }

  const sizeClass = size === 'sm' ? 'text-xs gap-0.5' : 'text-xs gap-1';
  const pillSize = size === 'sm' ? 'px-1 py-0.5 text-[10px]' : 'px-1.5 py-0.5';

  const visibleLocales = ctx.availableLocales.slice(0, maxLocales);
  const hiddenCount = ctx.availableLocales.length - maxLocales;

  const pills = visibleLocales.map(locale => {
    const isResolved = locale === ctx.resolvedLocale;
    const pillClass = isResolved
      ? `${pillSize} rounded bg-blue-100 text-blue-700 font-medium`
      : `${pillSize} rounded bg-gray-100 text-gray-600`;
    return `<span class="${pillClass}">${locale.toUpperCase()}</span>`;
  }).join('');

  const overflow = hiddenCount > 0
    ? `<span class="${pillSize} rounded bg-gray-100 text-gray-500">+${hiddenCount}</span>`
    : '';

  return `<span class="inline-flex items-center ${sizeClass}"
                title="Available locales: ${ctx.availableLocales.join(', ')}"
                aria-label="Available locales: ${ctx.availableLocales.join(', ')}">
    ${pills}${overflow}
  </span>`;
}

/**
 * Render a combined translation status cell for content rows.
 * Combines locale badge + availability indicator.
 *
 * @param context - Translation context or record
 * @param options - Rendering options
 * @returns HTML string for the translation status cell
 */
export function renderTranslationStatusCell(
  context: TranslationContext | Record<string, unknown>,
  options: TranslationStatusOptions = {}
): string {
  const ctx = 'resolvedLocale' in context
    ? context as TranslationContext
    : extractTranslationContext(context as Record<string, unknown>);

  const { showResolvedLocale = true, size = 'default' } = options;

  const parts: string[] = [];

  // Add locale badge
  if (showResolvedLocale && ctx.resolvedLocale) {
    parts.push(renderLocaleBadge(ctx, { size, showFallbackIndicator: true }));
  }

  // Add available locales indicator
  if (ctx.availableLocales.length > 1) {
    parts.push(renderAvailableLocalesIndicator(ctx, { ...options, size }));
  }

  if (parts.length === 0) {
    return '<span class="text-gray-400">-</span>';
  }

  const gapClass = size === 'sm' ? 'gap-1' : 'gap-2';
  return `<div class="flex items-center flex-wrap ${gapClass}">${parts.join('')}</div>`;
}

/**
 * Render a workflow status badge.
 */
export function renderStatusBadge(status: string | null, size: 'sm' | 'default' = 'default'): string {
  if (!status) {
    return '';
  }

  const statusLower = status.toLowerCase();
  return badge(status, 'status', statusLower, { size: size === 'sm' ? 'sm' : undefined });
}

// ============================================================================
// Translation Readiness Rendering (Productized Phase 19)
// ============================================================================

/**
 * Render a translation readiness indicator for content rows.
 * Shows completeness state based on canonical backend readiness fields.
 *
 * @param record - The record from API response
 * @param options - Rendering options
 * @returns HTML string for the readiness indicator
 */
export function renderReadinessIndicator(
  record: Record<string, unknown>,
  options: ReadinessBadgeOptions = {}
): string {
  const readiness = extractTranslationReadiness(record);

  // Legacy mode: no readiness metadata, show nothing or fallback
  if (!readiness.hasReadinessMetadata) {
    return '';
  }

  const { size = 'default', showDetailedTooltip = true, extraClass = '' } = options;
  const sizeClass = size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-xs px-2 py-1';
  const baseClasses = `inline-flex items-center gap-1 rounded font-medium ${sizeClass}`;

  const state = readiness.readinessState || 'ready';
  const { icon, label, bgClass, textClass, tooltip } = getReadinessStateDisplay(state, readiness, showDetailedTooltip);

  return `<span class="${baseClasses} ${bgClass} ${textClass} ${extraClass}"
                title="${tooltip}"
                aria-label="${label}"
                data-readiness-state="${state}">
    ${icon}
    <span>${label}</span>
  </span>`;
}

/**
 * Render a compact publish readiness badge (ready/not ready).
 */
export function renderPublishReadinessBadge(
  record: Record<string, unknown>,
  options: ReadinessBadgeOptions = {}
): string {
  const readiness = extractTranslationReadiness(record);

  if (!readiness.hasReadinessMetadata) {
    return '';
  }

  const isReady = readiness.readyForTransition.publish === true;
  const { size = 'default', extraClass = '' } = options;
  const sizeClass = size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-1';

  if (isReady) {
    return `<span class="inline-flex items-center gap-1 rounded font-medium ${sizeClass} bg-green-100 text-green-700 ${extraClass}"
                  title="Ready to publish"
                  aria-label="Ready to publish">
      <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
      </svg>
      Ready
    </span>`;
  }

  // Not ready - show missing info
  const missingCount = readiness.missingRequiredLocales.length;
  const tooltip = missingCount > 0
    ? `Missing translations: ${readiness.missingRequiredLocales.join(', ')}`
    : 'Not ready to publish';

  return `<span class="inline-flex items-center gap-1 rounded font-medium ${sizeClass} bg-amber-100 text-amber-700 ${extraClass}"
                title="${tooltip}"
                aria-label="Not ready to publish">
    <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
      <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
    </svg>
    ${missingCount > 0 ? `${missingCount} missing` : 'Not ready'}
  </span>`;
}

/**
 * Render a locale completeness progress indicator.
 * Shows X/Y locales complete.
 */
export function renderLocaleCompleteness(
  record: Record<string, unknown>,
  options: { size?: 'sm' | 'default'; extraClass?: string } = {}
): string {
  const readiness = extractTranslationReadiness(record);

  if (!readiness.hasReadinessMetadata || readiness.requiredLocales.length === 0) {
    return '';
  }

  const { size = 'default', extraClass = '' } = options;
  const sizeClass = size === 'sm' ? 'text-xs' : 'text-sm';

  const required = readiness.requiredLocales.length;
  const available = readiness.availableLocales.filter(
    loc => readiness.requiredLocales.includes(loc)
  ).length;
  const complete = required > 0 && available === required;

  const colorClass = complete
    ? 'text-green-600'
    : available > 0
      ? 'text-amber-600'
      : 'text-gray-500';

  return `<span class="${sizeClass} ${colorClass} font-medium ${extraClass}"
                title="Locale completeness: ${available} of ${required} required locales available"
                aria-label="${available} of ${required} locales">
    ${available}/${required}
  </span>`;
}

/**
 * Render a prominent "Missing Translations" badge for list rows.
 * This is a first-class affordance to quickly identify incomplete content.
 *
 * @param record - The record from API response
 * @param options - Rendering options
 * @returns HTML string for the missing translations badge, or empty if complete
 */
export function renderMissingTranslationsBadge(
  record: Record<string, unknown>,
  options: ReadinessBadgeOptions = {}
): string {
  const readiness = extractTranslationReadiness(record);

  // No badge needed if ready or no metadata
  if (!readiness.hasReadinessMetadata || readiness.readinessState === 'ready') {
    return '';
  }

  const { size = 'default', extraClass = '' } = options;
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-1' : 'text-sm px-2.5 py-1';
  const missingCount = readiness.missingRequiredLocales.length;

  // Different severity levels
  const hasMissingLocales = missingCount > 0;
  const hasMissingFields = Object.keys(readiness.missingRequiredFieldsByLocale).length > 0;

  let bgClass = 'bg-amber-100';
  let textClass = 'text-amber-800';
  let label = '';
  let tooltip = '';

  if (hasMissingLocales && hasMissingFields) {
    bgClass = 'bg-red-100';
    textClass = 'text-red-800';
    label = `${missingCount} missing`;
    tooltip = `Missing translations: ${readiness.missingRequiredLocales.join(', ')}. Also has incomplete fields.`;
  } else if (hasMissingLocales) {
    bgClass = 'bg-amber-100';
    textClass = 'text-amber-800';
    label = `${missingCount} missing`;
    tooltip = `Missing translations: ${readiness.missingRequiredLocales.join(', ')}`;
  } else if (hasMissingFields) {
    bgClass = 'bg-yellow-100';
    textClass = 'text-yellow-800';
    label = 'Incomplete';
    const locales = Object.keys(readiness.missingRequiredFieldsByLocale);
    tooltip = `Incomplete fields in: ${locales.join(', ')}`;
  }

  if (!label) {
    return '';
  }

  const warningIcon = `<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>`;

  return `<span class="inline-flex items-center gap-1.5 rounded-full font-medium ${sizeClass} ${bgClass} ${textClass} ${extraClass}"
                title="${tooltip}"
                aria-label="${tooltip}"
                data-missing-translations="true"
                data-missing-count="${missingCount}">
    ${warningIcon}
    <span>${label}</span>
  </span>`;
}

/**
 * Check if a record has missing required translations.
 * Used for quick filtering in list views.
 */
export function hasMissingTranslations(record: Record<string, unknown>): boolean {
  const readiness = extractTranslationReadiness(record);
  if (!readiness.hasReadinessMetadata) {
    return false;
  }
  return readiness.readinessState !== 'ready';
}

/**
 * Get the missing translations count for a record.
 */
export function getMissingTranslationsCount(record: Record<string, unknown>): number {
  const readiness = extractTranslationReadiness(record);
  return readiness.missingRequiredLocales.length;
}

/**
 * Get display properties for a readiness state.
 */
function getReadinessStateDisplay(
  state: ReadinessState,
  readiness: TranslationReadiness,
  showDetailedTooltip: boolean
): { icon: string; label: string; bgClass: string; textClass: string; tooltip: string } {
  const checkIcon = `<svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>`;
  const warningIcon = `<svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>`;

  switch (state) {
    case 'ready':
      return {
        icon: checkIcon,
        label: 'Ready',
        bgClass: 'bg-green-100',
        textClass: 'text-green-700',
        tooltip: 'All required translations are complete',
      };

    case 'missing_locales': {
      const missing = readiness.missingRequiredLocales;
      const tooltip = showDetailedTooltip && missing.length > 0
        ? `Missing translations: ${missing.join(', ')}`
        : 'Missing required translations';
      return {
        icon: warningIcon,
        label: `${missing.length} missing`,
        bgClass: 'bg-amber-100',
        textClass: 'text-amber-700',
        tooltip,
      };
    }

    case 'missing_fields': {
      const localesWithMissingFields = Object.keys(readiness.missingRequiredFieldsByLocale);
      const tooltip = showDetailedTooltip && localesWithMissingFields.length > 0
        ? `Incomplete fields in: ${localesWithMissingFields.join(', ')}`
        : 'Some translations have missing required fields';
      return {
        icon: warningIcon,
        label: 'Incomplete',
        bgClass: 'bg-yellow-100',
        textClass: 'text-yellow-700',
        tooltip,
      };
    }

    case 'missing_locales_and_fields': {
      const missingLocales = readiness.missingRequiredLocales;
      const localesWithMissingFields = Object.keys(readiness.missingRequiredFieldsByLocale);
      const parts: string[] = [];
      if (missingLocales.length > 0) {
        parts.push(`Missing: ${missingLocales.join(', ')}`);
      }
      if (localesWithMissingFields.length > 0) {
        parts.push(`Incomplete: ${localesWithMissingFields.join(', ')}`);
      }
      const tooltip = showDetailedTooltip ? parts.join('; ') : 'Missing translations and incomplete fields';
      return {
        icon: warningIcon,
        label: 'Not ready',
        bgClass: 'bg-red-100',
        textClass: 'text-red-700',
        tooltip,
      };
    }

    default:
      return {
        icon: '',
        label: 'Unknown',
        bgClass: 'bg-gray-100',
        textClass: 'text-gray-600',
        tooltip: 'Unknown readiness state',
      };
  }
}

// ============================================================================
// Translation Matrix Cell (Phase 2)
// ============================================================================

/**
 * Matrix cell rendering options
 */
export interface MatrixCellOptions {
  /** Size variant: 'sm' or 'md' */
  size?: 'sm' | 'md';
  /** Maximum number of locales to show before truncating */
  maxLocales?: number;
  /** Show locale labels alongside icons */
  showLabels?: boolean;
}

/**
 * Render a compact translation matrix cell showing locale status for each required locale.
 * Uses translation_readiness data to show ● ready, ◐ incomplete, ○ missing states.
 *
 * @param record - The record from API response
 * @param options - Matrix cell rendering options
 * @returns HTML string for the matrix cell
 */
export function renderTranslationMatrixCell(
  record: Record<string, unknown>,
  options: MatrixCellOptions = {}
): string {
  const { size = 'sm', maxLocales = 5, showLabels = false } = options;

  const readiness = extractTranslationReadiness(record);
  if (!readiness.hasReadinessMetadata) {
    return '<span class="text-gray-400">-</span>';
  }

  const { requiredLocales, availableLocales, missingRequiredFieldsByLocale } = readiness;
  const allLocales = requiredLocales.length > 0 ? requiredLocales : availableLocales;

  if (allLocales.length === 0) {
    return '<span class="text-gray-400">-</span>';
  }

  const availableSet = new Set(availableLocales);
  const incompleteLocales = getIncompleteLocales(missingRequiredFieldsByLocale);

  const chips = allLocales
    .slice(0, maxLocales)
    .map((locale) => {
      const isAvailable = availableSet.has(locale);
      const isIncomplete = isAvailable && incompleteLocales.has(locale);
      const isComplete = isAvailable && !isIncomplete;
      // isMissing implied when !isComplete && !isIncomplete

      // Determine state and styling
      let stateClass: string;
      let icon: string;
      let stateLabel: string;

      if (isComplete) {
        stateClass = 'bg-green-100 text-green-700 border-green-300';
        icon = '●';
        stateLabel = 'Complete';
      } else if (isIncomplete) {
        stateClass = 'bg-amber-100 text-amber-700 border-amber-300';
        icon = '◐';
        stateLabel = 'Incomplete';
      } else {
        // Missing
        stateClass = 'bg-white text-gray-400 border-gray-300 border-dashed';
        icon = '○';
        stateLabel = 'Missing';
      }

      const sizeClass = size === 'sm'
        ? 'text-[10px] px-1.5 py-0.5'
        : 'text-xs px-2 py-1';

      const labelHtml = showLabels
        ? `<span class="font-medium">${locale.toUpperCase()}</span>`
        : '';

      return `
        <span class="inline-flex items-center gap-0.5 ${sizeClass} rounded border ${stateClass}"
              title="${locale.toUpperCase()}: ${stateLabel}"
              aria-label="${locale.toUpperCase()}: ${stateLabel}"
              data-locale="${locale}"
              data-state="${stateLabel.toLowerCase()}">
          ${labelHtml}
          <span aria-hidden="true">${icon}</span>
        </span>
      `;
    })
    .join('');

  const overflow = allLocales.length > maxLocales
    ? `<span class="text-[10px] text-gray-500" title="${allLocales.length - maxLocales} more locales">+${allLocales.length - maxLocales}</span>`
    : '';

  return `<div class="flex items-center gap-1 flex-wrap" data-matrix-cell="true">${chips}${overflow}</div>`;
}

/**
 * Get set of locales that have missing required fields.
 */
function getIncompleteLocales(fieldsByLocale: Record<string, string[]>): Set<string> {
  const incomplete = new Set<string>();
  if (fieldsByLocale && typeof fieldsByLocale === 'object') {
    for (const [locale, fields] of Object.entries(fieldsByLocale)) {
      if (Array.isArray(fields) && fields.length > 0) {
        incomplete.add(locale);
      }
    }
  }
  return incomplete;
}

/**
 * Create a cell renderer for translation matrix that can be used with DataGrid.
 * Returns a function compatible with the CellRenderer type.
 *
 * @param options - Matrix cell rendering options
 * @returns CellRenderer function
 */
export function createTranslationMatrixRenderer(
  options: MatrixCellOptions = {}
): (value: unknown, record: Record<string, unknown>, column: string) => string {
  return (_value: unknown, record: Record<string, unknown>, _column: string): string => {
    return renderTranslationMatrixCell(record, options);
  };
}

// ============================================================================
// Fallback Warning Rendering
// ============================================================================

/**
 * Render a fallback warning banner for detail/edit views.
 * Shows when the requested locale doesn't exist and fallback content is displayed.
 *
 * @param context - Translation context
 * @param options - Options for the warning
 * @returns HTML string for the fallback warning banner
 */
export function renderFallbackWarning(
  context: TranslationContext,
  options: {
    /** Handler URL for creating the missing translation */
    createTranslationUrl?: string;
    /** Panel name for action dispatch */
    panelName?: string;
    /** Show create translation button */
    showCreateButton?: boolean;
  } = {}
): string {
  if (!context.fallbackUsed && !context.missingRequestedLocale) {
    return '';
  }

  const { showCreateButton = true, createTranslationUrl, panelName } = options;
  const requestedLocale = context.requestedLocale || 'requested locale';
  const resolvedLocale = context.resolvedLocale || 'default';

  const createButtonHtml = showCreateButton ? `
    <button type="button"
            class="inline-flex items-center gap-1 text-sm font-medium text-amber-800 hover:text-amber-900 underline"
            data-action="create-translation"
            data-locale="${context.requestedLocale || ''}"
            data-panel="${panelName || ''}"
            data-record-id="${context.recordId || ''}"
            ${createTranslationUrl ? `data-url="${createTranslationUrl}"` : ''}>
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
      </svg>
      Create ${requestedLocale.toUpperCase()} translation
    </button>
  ` : '';

  return `
    <div class="fallback-warning bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4"
         role="alert"
         aria-live="polite"
         data-fallback-mode="true"
         data-requested-locale="${context.requestedLocale || ''}"
         data-resolved-locale="${context.resolvedLocale || ''}">
      <div class="flex items-start gap-3">
        <div class="flex-shrink-0">
          <svg class="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
          </svg>
        </div>
        <div class="flex-1">
          <h3 class="text-sm font-medium text-amber-800">
            Viewing fallback content
          </h3>
          <p class="mt-1 text-sm text-amber-700">
            The <strong>${requestedLocale.toUpperCase()}</strong> translation doesn't exist yet.
            You're viewing content from <strong>${resolvedLocale.toUpperCase()}</strong>.
            <span class="block mt-1 text-amber-600">Editing is disabled until you create the missing translation.</span>
          </p>
          ${createButtonHtml ? `<div class="mt-3">${createButtonHtml}</div>` : ''}
        </div>
      </div>
    </div>
  `;
}

// ============================================================================
// Cell Renderer Factory
// ============================================================================

/**
 * Create a cell renderer for translation status that can be used with DataGrid.
 * Returns a function compatible with the CellRenderer type.
 *
 * @param options - Rendering options
 * @returns CellRenderer function
 */
export function createTranslationStatusRenderer(
  options: TranslationStatusOptions = {}
): (value: unknown, record: Record<string, unknown>, column: string) => string {
  return (_value: unknown, record: Record<string, unknown>, _column: string): string => {
    return renderTranslationStatusCell(record, options);
  };
}

/**
 * Create a cell renderer for locale badge only.
 */
export function createLocaleBadgeRenderer(
  options: LocaleBadgeOptions = {}
): (value: unknown, record: Record<string, unknown>, column: string) => string {
  return (_value: unknown, record: Record<string, unknown>, _column: string): string => {
    return renderLocaleBadge(record, options);
  };
}

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Extract a string field from a record, trying multiple paths.
 */
function extractStringField(record: Record<string, unknown>, paths: string[]): string | null {
  for (const path of paths) {
    const value = getNestedValue(record, path);
    if (typeof value === 'string' && value.trim()) {
      return value;
    }
  }
  return null;
}

/**
 * Extract a string array field from a record, trying multiple paths.
 */
function extractStringArrayField(record: Record<string, unknown>, paths: string[]): string[] {
  for (const path of paths) {
    const value = getNestedValue(record, path);
    if (Array.isArray(value)) {
      return value.filter((v): v is string => typeof v === 'string');
    }
  }
  return [];
}

/**
 * Extract a boolean field from a record, trying multiple paths.
 */
function extractBooleanField(record: Record<string, unknown>, paths: string[]): boolean {
  for (const path of paths) {
    const value = getNestedValue(record, path);
    if (typeof value === 'boolean') {
      return value;
    }
    // Also handle string "true"/"false"
    if (value === 'true') return true;
    if (value === 'false') return false;
  }
  return false;
}

/**
 * Get a nested value from an object using dot notation.
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}
