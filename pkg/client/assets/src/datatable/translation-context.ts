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

import { badge, badgeClasses } from '../shared/badge.js';

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
