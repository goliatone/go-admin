/**
 * Translation Style Constants
 *
 * Site-aligned CSS class constants for consistent styling across all translation surfaces.
 * These constants ensure translation UI matches the established admin site patterns.
 *
 * Usage:
 *   import { BTN_PRIMARY, HEADER_TITLE } from '../translation-shared/style-constants.js';
 *   const html = `<button class="${BTN_PRIMARY}">Save</button>`;
 */

// =============================================================================
// Button Classes
// Matches site patterns from input.css: .btn, .btn-primary, .btn-secondary, etc.
// =============================================================================

/** Base button: inline-flex, gap-2, px-6, py-3, rounded-lg, text-sm, font-medium */
export const BTN = 'btn';

/** Primary action button: dark background, white text */
export const BTN_PRIMARY = 'btn btn-primary';

/** Secondary action button: white background, dark text, border */
export const BTN_SECONDARY = 'btn btn-secondary';

/** Danger/destructive button: red background, white text */
export const BTN_DANGER = 'btn btn-danger';

/** Small button variant: px-3, py-2, text-xs */
export const BTN_SM = 'btn btn-sm';

/** Primary small button */
export const BTN_PRIMARY_SM = 'btn btn-primary btn-sm';

/** Secondary small button */
export const BTN_SECONDARY_SM = 'btn btn-secondary btn-sm';

/** Danger small button */
export const BTN_DANGER_SM = 'btn btn-danger btn-sm';

/** Ghost button (minimal styling, for icon-only or subtle actions) */
export const BTN_GHOST =
  'inline-flex items-center justify-center p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors';

/** Icon-only button (square, centered icon) */
export const BTN_ICON =
  'inline-flex items-center justify-center w-9 h-9 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors';

// =============================================================================
// Border Radius
// Site uses rounded-xl for cards, rounded-lg for buttons, rounded-full for badges
// =============================================================================

/** Card container radius (site standard) */
export const ROUNDED_CARD = 'rounded-xl';

/** Button/input radius */
export const ROUNDED_BUTTON = 'rounded-lg';

/** Badge/pill radius */
export const ROUNDED_BADGE = 'rounded-full';

/** Small badge radius */
export const ROUNDED_MD = 'rounded-md';

// =============================================================================
// Color Palette
// Site uses gray-* (not slate-*) for neutral colors
// =============================================================================

/** Muted text color */
export const TEXT_MUTED = 'text-gray-500';

/** Default/body text color */
export const TEXT_DEFAULT = 'text-gray-900';

/** Dimmed text (lighter than muted) */
export const TEXT_DIMMED = 'text-gray-400';

/** Admin dark text (for titles) */
export const TEXT_TITLE = 'text-admin-dark';

/** Default border color */
export const BORDER_DEFAULT = 'border-gray-200';

/** Subtle border color */
export const BORDER_SUBTLE = 'border-gray-100';

/** White surface background */
export const BG_SURFACE = 'bg-white';

/** Muted surface background */
export const BG_MUTED = 'bg-gray-50';

/** Page background */
export const BG_PAGE = 'bg-gray-50';

// =============================================================================
// Header Patterns
// Matches shared/detail-base.html and shared/list-base.html
// =============================================================================

/** Main page title: text-3xl font-bold text-admin-dark */
export const HEADER_TITLE = 'text-3xl font-bold text-admin-dark';

/** Pretitle/section label: text-xs font-semibold uppercase tracking-wider text-gray-500 */
export const HEADER_PRETITLE = 'text-xs font-semibold uppercase tracking-wider text-gray-500';

/** Description text below title */
export const HEADER_DESCRIPTION = 'text-sm text-gray-500 mt-1';

/** Header container (matches site pattern) */
export const HEADER_CONTAINER = 'px-8 py-6 bg-white border-b border-gray-200';

/** Header flex layout */
export const HEADER_FLEX = 'flex flex-wrap items-center justify-between gap-4';

// =============================================================================
// Card/Container Patterns
// Standard card spacing: p-6 for all card bodies, headers, and list items
// This ensures visual consistency across all translation surfaces.
// =============================================================================

/** Standard card container */
export const CARD = 'bg-white border border-gray-200 rounded-xl';

/** Card with shadow */
export const CARD_SHADOW = 'bg-white border border-gray-200 rounded-xl shadow-sm';

/** Card header section - always use p-6 */
export const CARD_HEADER = 'p-6 border-b border-gray-200';

/** Card body section - always use p-6 */
export const CARD_BODY = 'p-6';

/** Card with muted header */
export const CARD_HEADER_MUTED = 'p-6 bg-gray-50 border-b border-gray-200';

// =============================================================================
// Empty/Error State Patterns
// =============================================================================

/** Empty state container (solid border, not dashed) */
export const EMPTY_STATE = 'rounded-xl border border-gray-200 bg-gray-50 p-8 text-center';

/** Empty state title */
export const EMPTY_STATE_TITLE = 'text-lg font-semibold text-gray-900';

/** Empty state description */
export const EMPTY_STATE_TEXT = 'text-sm text-gray-500 mt-2';

/** Error state container */
export const ERROR_STATE = 'rounded-xl border border-rose-200 bg-rose-50 p-6';

/** Error state title */
export const ERROR_STATE_TITLE = 'text-lg font-semibold text-rose-800';

/** Error state message */
export const ERROR_STATE_TEXT = 'text-sm text-rose-700 mt-2';

/** Loading state container */
export const LOADING_STATE = 'rounded-xl border border-gray-200 bg-white p-8 text-center';

// =============================================================================
// Status Badge Patterns
// Matches input.css status-badge system
// =============================================================================

/** Base status badge */
export const STATUS_BADGE = 'status-badge';

/** Success/active status */
export const STATUS_SUCCESS = 'status-active';

/** Warning/pending status */
export const STATUS_WARNING = 'status-pending';

/** Error/failed status */
export const STATUS_ERROR = 'status-failed';

/** Neutral/inactive status */
export const STATUS_NEUTRAL = 'status-inactive';

/** Draft status */
export const STATUS_DRAFT = 'status-draft';

/** Archived status */
export const STATUS_ARCHIVED = 'status-archived';

/** Published status */
export const STATUS_PUBLISHED = 'status-published';

// =============================================================================
// Form Input Patterns
// =============================================================================

/** Standard text input */
export const INPUT_TEXT =
  'w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500';

/** Small text input */
export const INPUT_TEXT_SM =
  'w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500';

/** Textarea */
export const INPUT_TEXTAREA =
  'w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none';

/** Select dropdown */
export const INPUT_SELECT =
  'w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white';

/** Readonly input (non-editable, visible value) */
export const INPUT_READONLY =
  'w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 cursor-not-allowed';

/** Error state input (validation failed) */
export const INPUT_ERROR =
  'w-full rounded-lg border border-rose-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-100';

/** Disabled input (non-interactive) */
export const INPUT_DISABLED =
  'w-full rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-500 cursor-not-allowed opacity-60';

// =============================================================================
// Form Input Groups
// =============================================================================

/** Input group container */
export const INPUT_GROUP = 'rounded-xl border border-gray-200 bg-white p-4 space-y-3';

/** Input group header row */
export const INPUT_GROUP_HEADER = 'flex items-center justify-between gap-3';

/** Input group label */
export const INPUT_GROUP_LABEL = 'text-xs font-semibold uppercase tracking-[0.18em] text-gray-500';

/** Input group helper text */
export const INPUT_GROUP_HELPER = 'text-xs text-gray-500 mt-1';

/** Input group error text */
export const INPUT_GROUP_ERROR = 'text-xs text-rose-600 mt-1';

/**
 * Returns the appropriate CSS class for an input based on its state.
 *
 * @param options - Input state options
 * @param options.hasError - Whether the input has a validation error
 * @param options.isReadonly - Whether the input is read-only
 * @param options.isDisabled - Whether the input is disabled
 * @param options.isTextarea - Whether the input is a textarea
 * @returns Tailwind CSS class string for the input
 *
 * @example
 * const className = getInputClass({ hasError: true });
 * // Returns INPUT_ERROR class string
 *
 * @example
 * const className = getInputClass({ isReadonly: true, isTextarea: true });
 * // Returns INPUT_READONLY class string (state takes precedence over type)
 */
export function getInputClass(options: {
  hasError?: boolean;
  isReadonly?: boolean;
  isDisabled?: boolean;
  isTextarea?: boolean;
}): string {
  if (options.isDisabled) return INPUT_DISABLED;
  if (options.isReadonly) return INPUT_READONLY;
  if (options.hasError) return INPUT_ERROR;
  return options.isTextarea ? INPUT_TEXTAREA : INPUT_TEXT;
}

// =============================================================================
// Layout Helpers
// =============================================================================

/** Content area padding */
export const CONTENT_PADDING = 'p-8';

/** Max content width wrapper */
export const CONTENT_MAX_WIDTH = 'max-w-7xl mx-auto';

/** Flex row with gap */
export const FLEX_ROW = 'flex items-center gap-4';

/** Flex row with small gap */
export const FLEX_ROW_SM = 'flex items-center gap-2';

/** Flex column with gap */
export const FLEX_COL = 'flex flex-col gap-4';

/** Grid 2 columns on xl */
export const GRID_2COL_XL = 'grid grid-cols-1 xl:grid-cols-2 gap-6';

/** Grid with main/sidebar layout */
export const GRID_MAIN_SIDEBAR = 'grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-6';

// =============================================================================
// Disabled State
// =============================================================================

/** Disabled element styling */
export const DISABLED = 'opacity-50 cursor-not-allowed pointer-events-none';

/** Disabled with hover hint */
export const DISABLED_INTERACTIVE = 'opacity-50 cursor-not-allowed';

// =============================================================================
// Focus Ring (Accessibility)
// =============================================================================

/** Standard focus ring */
export const FOCUS_RING = 'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2';

/** Focus visible only (keyboard navigation) */
export const FOCUS_VISIBLE = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2';

// =============================================================================
// Modal/Dialog Patterns
// =============================================================================

/** Modal overlay backdrop */
export const MODAL_OVERLAY = 'fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 px-4';

/** Modal content container */
export const MODAL_CONTENT = 'w-full max-w-xl rounded-xl border border-gray-200 bg-white p-6 shadow-2xl';

// =============================================================================
// CSS Custom Property Status Colors
// Use these instead of hardcoded Tailwind colors for translation status badges.
// These reference the CSS custom properties defined in input.css.
// =============================================================================

/**
 * Status color classes using CSS custom properties.
 * These enable theming and dark mode support.
 */

/** Success status (ready, approved, published, on_track) - uses CSS variables */
export const STATUS_COLOR_SUCCESS =
  'bg-[var(--translation-status-success-bg)] text-[var(--translation-status-success-text)] border-[var(--translation-status-success-border)]';

/** Warning status (pending_review, due_soon, missing_field) - uses CSS variables */
export const STATUS_COLOR_WARNING =
  'bg-[var(--translation-status-warning-bg)] text-[var(--translation-status-warning-text)] border-[var(--translation-status-warning-border)]';

/** Error status (blocked, overdue, rejected, missing_locale) - uses CSS variables */
export const STATUS_COLOR_ERROR =
  'bg-[var(--translation-status-error-bg)] text-[var(--translation-status-error-text)] border-[var(--translation-status-error-border)]';

/** Info status (in_progress, assigned, in_review) - uses CSS variables */
export const STATUS_COLOR_INFO =
  'bg-[var(--translation-status-info-bg)] text-[var(--translation-status-info-text)] border-[var(--translation-status-info-border)]';

/** Neutral status (draft, archived, none, not_required) - uses CSS variables */
export const STATUS_COLOR_NEUTRAL =
  'bg-[var(--translation-status-neutral-bg)] text-[var(--translation-status-neutral-text)] border-[var(--translation-status-neutral-border)]';

/** Purple status (in_review, changes_requested) - uses CSS variables */
export const STATUS_COLOR_PURPLE =
  'bg-[var(--translation-status-purple-bg)] text-[var(--translation-status-purple-text)] border-[var(--translation-status-purple-border)]';

/**
 * Maps severity levels to CSS custom property classes.
 */
export const SEVERITY_COLOR_MAP: Record<string, string> = {
  success: STATUS_COLOR_SUCCESS,
  warning: STATUS_COLOR_WARNING,
  error: STATUS_COLOR_ERROR,
  info: STATUS_COLOR_INFO,
  neutral: STATUS_COLOR_NEUTRAL,
  purple: STATUS_COLOR_PURPLE,
};

/**
 * Gets the CSS custom property class for a severity level.
 */
export function getStatusColorClass(severity: string): string {
  return SEVERITY_COLOR_MAP[severity.toLowerCase()] ?? STATUS_COLOR_NEUTRAL;
}

/**
 * Maps status strings to their severity level.
 */
export const STATUS_SEVERITY_MAP: Record<string, string> = {
  // Success
  ready: 'success',
  approved: 'success',
  published: 'success',
  completed: 'success',
  on_track: 'success',
  success: 'success',

  // Warning
  pending: 'warning',
  pending_review: 'warning',
  due_soon: 'warning',
  missing_fields: 'warning',
  missing_field: 'warning',
  conflict: 'warning',
  changes_requested: 'warning',

  // Error
  blocked: 'error',
  rejected: 'error',
  failed: 'error',
  overdue: 'error',
  missing_locale: 'error',
  missing_locales: 'error',
  missing_locales_and_fields: 'error',
  error: 'error',

  // Info
  in_progress: 'info',
  assigned: 'info',
  in_review: 'info',
  review: 'info',
  running: 'info',

  // Neutral
  draft: 'neutral',
  archived: 'neutral',
  none: 'neutral',
  not_required: 'neutral',
  skipped: 'neutral',
  inactive: 'neutral',
};

/**
 * Gets the CSS custom property class for a status value.
 */
export function getStatusSeverityClass(status: string): string {
  const normalized = status.toLowerCase().replace(/-/g, '_');
  const severity = STATUS_SEVERITY_MAP[normalized] ?? 'neutral';
  return getStatusColorClass(severity);
}

// =============================================================================
// Local Summary Badge Constants (Phase 6.1.2)
// =============================================================================

/**
 * Local summary-chip sizes for non-canonical counts and UI metadata.
 *
 * IMPORTANT: Do NOT use these for backend-authored translation statuses.
 * Canonical translation statuses must continue to use renderVocabularyStatusBadge(...)
 * from datatable/translation-status-vocabulary.ts.
 *
 * Use these badges for:
 * - Count indicators (e.g., "3 warnings", "5 blockers")
 * - Autosave state chips
 * - QA finding severity badges
 * - Timeline entry type badges
 * - Glossary match chips
 */

/** Base meta badge: standard size for summary chips */
export const META_BADGE_BASE = 'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium';

/** Small meta badge: uppercase tracking for severity labels */
export const META_BADGE_SM = 'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em]';

/** Large meta badge: for prominent status indicators */
export const META_BADGE_LG = 'inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium';

/** Count badge: with icon gap for number + label patterns */
export const META_BADGE_COUNT = 'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium';

/** Badge severity type */
export type BadgeSeverity = 'success' | 'warning' | 'error' | 'info' | 'neutral';

/** Badge size type */
export type MetaBadgeSize = 'sm' | 'md' | 'lg' | 'count';

/**
 * Returns the appropriate CSS class for a meta badge based on severity and size.
 *
 * Use this for non-canonical UI badges like counts, QA summaries, and autosave state.
 * Do NOT use for backend-authored translation statuses (use renderVocabularyStatusBadge instead).
 *
 * @param severity - The semantic severity level of the badge
 * @param size - The badge size variant (default: 'md')
 * @returns Combined CSS class string including size and color classes
 *
 * @example
 * // Warning badge at default size
 * const className = getMetaBadgeClass('warning');
 *
 * @example
 * // Small error badge for QA severity label
 * const className = getMetaBadgeClass('error', 'sm');
 *
 * @example
 * // Count badge with success styling
 * const className = getMetaBadgeClass('success', 'count');
 */
export function getMetaBadgeClass(
  severity: BadgeSeverity,
  size: MetaBadgeSize = 'md'
): string {
  const sizeClass =
    size === 'sm'
      ? META_BADGE_SM
      : size === 'lg'
        ? META_BADGE_LG
        : size === 'count'
          ? META_BADGE_COUNT
          : META_BADGE_BASE;
  return `${sizeClass} ${getStatusColorClass(severity)}`;
}

// =============================================================================
// Timeline Entry Constants (Phase 6.2.1)
// =============================================================================

/** Base timeline entry container */
export const TIMELINE_ENTRY_BASE = 'rounded-xl border px-3 py-3 text-sm';

/** Timeline entry title text */
export const TIMELINE_TITLE_BASE = 'font-semibold';

/** Timeline entry timestamp text */
export const TIMELINE_TIME_BASE = 'text-xs';

/**
 * Maps timeline entry tones to severity levels for styling.
 */
export const TIMELINE_TONE_MAP = {
  event: 'neutral',
  review: 'warning',
  qa: 'error',
  success: 'success',
} as const;

/** Timeline entry tone type */
export type TimelineTone = 'event' | 'review' | 'qa' | 'success';

/**
 * Returns CSS classes for timeline entry components based on tone.
 *
 * @param tone - The semantic tone of the timeline entry
 * @returns Object containing CSS classes for container, title, badge, and time elements
 *
 * @example
 * const classes = getTimelineEntryClasses('review');
 * // Use: <li class="${classes.container}">
 * //        <p class="${classes.title}">Review requested</p>
 * //        <span class="${classes.badge}">Review</span>
 * //        <span class="${classes.time}">2 hours ago</span>
 * //      </li>
 */
export function getTimelineEntryClasses(tone: TimelineTone): {
  container: string;
  title: string;
  badge: string;
  time: string;
} {
  const severity = TIMELINE_TONE_MAP[tone] ?? 'neutral';
  const colorClass = getStatusColorClass(severity);

  return {
    container: `${TIMELINE_ENTRY_BASE} ${colorClass}`,
    title: `${TIMELINE_TITLE_BASE} text-gray-900`,
    badge: getMetaBadgeClass(severity as BadgeSeverity, 'sm'),
    time: `${TIMELINE_TIME_BASE} text-gray-500`,
  };
}

// =============================================================================
// QA Finding Constants (Phase 6.2.2)
// =============================================================================

/** Base QA finding container */
export const QA_FINDING_BASE = 'rounded-xl border px-3 py-3 text-sm bg-white';

/** Base QA panel container */
export const QA_PANEL_BASE = 'rounded-xl border p-5';

/** QA finding severity type */
export type QASeverity = 'blocker' | 'warning';

/**
 * Returns CSS classes for QA finding components based on severity.
 *
 * @param severity - The QA finding severity ('blocker' or 'warning')
 * @returns Object containing CSS classes for container and badge elements
 *
 * @example
 * const classes = getQAFindingClasses('blocker');
 * // Use: <li class="${classes.container}">
 * //        <span class="${classes.badge}">Blocker</span>
 * //        <p>Missing required field</p>
 * //      </li>
 */
export function getQAFindingClasses(severity: QASeverity): {
  container: string;
  badge: string;
} {
  return severity === 'blocker'
    ? {
        container: `${QA_FINDING_BASE} ${getStatusColorClass('error')} text-gray-900`,
        badge: getMetaBadgeClass('error', 'sm'),
      }
    : {
        container: `${QA_FINDING_BASE} ${getStatusColorClass('warning')} text-gray-900`,
        badge: getMetaBadgeClass('warning', 'sm'),
      };
}

/**
 * Returns the CSS class for a QA panel based on submit blocked state.
 *
 * @param submitBlocked - Whether the submit action is blocked due to QA issues
 * @returns CSS class string for the QA panel container
 *
 * @example
 * const panelClass = getQAPanelClass(true);
 * // Use: <section class="${panelClass}">...</section>
 */
export function getQAPanelClass(submitBlocked: boolean): string {
  return `${QA_PANEL_BASE} ${submitBlocked ? getStatusColorClass('error') : getStatusColorClass('neutral')}`;
}

// =============================================================================
// Autosave State Constants (Phase 6.2.3)
// =============================================================================

/** Autosave state type */
export type AutosaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'conflict';

/**
 * Returns the CSS class for an autosave state badge.
 *
 * @param state - The current autosave state
 * @returns Tailwind CSS class string for the autosave state badge
 *
 * @example
 * const className = getAutosaveStateClass('saving');
 * // Use: <span class="${className}">Saving...</span>
 */
export function getAutosaveStateClass(state: AutosaveState): string {
  switch (state) {
    case 'conflict':
      return getMetaBadgeClass('error');
    case 'saving':
      return getMetaBadgeClass('warning');
    case 'saved':
      return getMetaBadgeClass('success');
    case 'dirty':
      return getMetaBadgeClass('neutral');
    case 'idle':
    default:
      return getMetaBadgeClass('neutral');
  }
}

/**
 * Returns the display label for an autosave state.
 *
 * @param state - The current autosave state
 * @param lastSavedMessage - Optional custom message for the 'saved' state
 * @returns Human-readable label for the autosave state
 *
 * @example
 * const label = getAutosaveStateLabel('saving');
 * // Returns: "Autosaving draft…"
 *
 * @example
 * const label = getAutosaveStateLabel('saved', 'Saved 2 minutes ago');
 * // Returns: "Saved 2 minutes ago"
 */
export function getAutosaveStateLabel(state: AutosaveState, lastSavedMessage?: string): string {
  switch (state) {
    case 'conflict':
      return 'Conflict detected';
    case 'saving':
      return 'Autosaving draft…';
    case 'saved':
      return lastSavedMessage || 'Draft saved automatically';
    case 'dirty':
      return 'Unsaved changes';
    case 'idle':
    default:
      return 'No pending changes';
  }
}

// =============================================================================
// Glossary Chip Constants (Phase 6.2.4)
// =============================================================================

/**
 * CSS class for glossary match chips.
 * Uses info severity for terminology hints in the editor.
 */
export const GLOSSARY_CHIP = `${META_BADGE_BASE} ${getStatusColorClass('info')}`;

/** CSS class for the glossary term text (bold styling) */
export const GLOSSARY_CHIP_TERM = 'font-semibold';

// =============================================================================
// Mobile Responsive Layout Classes
// =============================================================================

/** Grid that collapses to single column on mobile, 2 columns on tablet, main+sidebar on xl */
export const GRID_RESPONSIVE_MAIN_SIDEBAR =
  'grid grid-cols-1 md:grid-cols-1 xl:grid-cols-[2fr_1fr] gap-6';

/** Grid that shows sidebar below main on mobile, reorders on xl */
export const GRID_EDITOR_LAYOUT =
  'grid grid-cols-1 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)] gap-4 xl:gap-6';

/** Stack layout that becomes row on sm+ screens */
export const FLEX_STACK_TO_ROW = 'flex flex-col sm:flex-row gap-4';

/** Full-width button on mobile, auto-width on sm+ */
export const BTN_RESPONSIVE = 'w-full sm:w-auto';

/** Reduced padding on mobile */
export const PADDING_RESPONSIVE = 'p-4 sm:p-6 lg:p-8';

/** Responsive card that fills width on mobile */
export const CARD_RESPONSIVE = 'bg-white border border-gray-200 rounded-xl w-full';

// =============================================================================
// Mobile Card View Classes (for table alternatives)
// =============================================================================

/** Container for mobile card list view */
export const MOBILE_CARD_LIST = 'flex flex-col gap-3 sm:hidden';

/** Individual mobile card */
export const MOBILE_CARD =
  'rounded-xl border border-gray-200 bg-white p-4 shadow-sm';

/** Mobile card header row */
export const MOBILE_CARD_HEADER =
  'flex items-start justify-between gap-3';

/** Mobile card title */
export const MOBILE_CARD_TITLE = 'text-sm font-semibold text-gray-900';

/** Mobile card subtitle */
export const MOBILE_CARD_SUBTITLE = 'text-xs text-gray-500 mt-1';

/** Mobile card body */
export const MOBILE_CARD_BODY = 'mt-3 space-y-2';

/** Mobile card row (label + value) */
export const MOBILE_CARD_ROW = 'flex items-center justify-between text-sm';

/** Mobile card label */
export const MOBILE_CARD_LABEL = 'text-gray-500';

/** Mobile card value */
export const MOBILE_CARD_VALUE = 'font-medium text-gray-900';

/** Mobile card actions row */
export const MOBILE_CARD_ACTIONS =
  'mt-4 flex flex-wrap items-center gap-2 pt-3 border-t border-gray-100';

/** Hide on mobile, show as table on sm+ */
export const TABLE_RESPONSIVE = 'hidden sm:table';

// =============================================================================
// Matrix View Documentation (Task 4.6)
// =============================================================================

/**
 * Translation Matrix Virtualization Requirements
 *
 * The translation matrix view displays a dense family-by-locale grid with
 * potentially hundreds of rows and dozens of locale columns. This section
 * documents requirements for future virtualization optimization.
 *
 * CURRENT IMPLEMENTATION:
 * - Horizontal scrolling via `overflow-x-auto` on the grid container
 * - Sticky header row (`sticky top-0 z-20`) for locale column headers
 * - Sticky first column (`sticky left-0 z-10/z-30`) for family info
 * - Server-side pagination for rows (page, per_page)
 * - Server-side locale windowing (locale_offset, locale_limit)
 * - Keyboard navigation (Arrow keys to move between cells)
 *
 * VIRTUALIZATION REQUIREMENTS (for large datasets):
 *
 * 1. Horizontal Scroll Behavior:
 *    - Maintain sticky first column during horizontal scroll
 *    - Preserve sticky header visibility on scroll
 *    - Consider horizontal virtualization for 50+ locale columns
 *    - Touch gesture support for horizontal swipe on mobile
 *
 * 2. Sticky Header Requirements:
 *    - Header row must remain visible during vertical scroll
 *    - First column (family info) must remain visible during horizontal scroll
 *    - z-index layering: header (z-20), first column (z-10), corner cell (z-30)
 *    - Shadow indicators for scroll position feedback
 *
 * 3. Touch/Swipe Support:
 *    - Horizontal swipe to navigate between locale columns
 *    - Touch-friendly cell action buttons (min 44px touch target)
 *    - Momentum scrolling for table overflow
 *    - Consider pull-to-refresh for data reload
 *
 * 4. Virtual Rendering (future optimization):
 *    - Only render visible rows + buffer (overscan)
 *    - Dynamic row height support for variable content
 *    - Recycle DOM elements during scroll
 *    - Estimated row count for scroll positioning
 *
 * 5. Performance Targets:
 *    - Backend latency target: configurable via meta.latency_target_ms
 *    - Viewport target: meta.query_model.viewport_target.{rows, locales}
 *    - Default page size: 25 rows, 10 locales
 *    - Maximum render: ~500 cells before considering virtualization
 *
 * CSS PATTERNS FOR MATRIX:
 */

/** Matrix grid container with horizontal scroll and sticky positioning */
export const MATRIX_GRID_CONTAINER = 'overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm';

/** Matrix table with fixed-height cells for potential virtualization */
export const MATRIX_TABLE = 'min-w-full border-separate border-spacing-0';

/** Sticky header row */
export const MATRIX_HEADER_ROW = 'sticky top-0 z-20 bg-white';

/** Sticky first column cell (for family info) */
export const MATRIX_STICKY_CELL = 'sticky left-0 z-10 bg-white';

/** Corner cell (header + first column intersection) */
export const MATRIX_CORNER_CELL = 'sticky left-0 z-30 bg-white';

/** Standard matrix cell */
export const MATRIX_CELL = 'border-b border-gray-200 px-3 py-3 align-top';

/** Mobile-friendly matrix: horizontal scroll with touch momentum */
export const MATRIX_MOBILE = 'overflow-x-auto -webkit-overflow-scrolling-touch scroll-smooth';

// =============================================================================
// Focus Trap Utility
// =============================================================================

/**
 * Creates a focus trap within a modal element.
 * Traps Tab navigation and handles Escape key to close.
 *
 * @param modal - The modal element to trap focus within
 * @param onClose - Callback invoked when Escape is pressed
 * @returns Cleanup function to remove event listeners
 */
export function trapFocus(modal: HTMLElement, onClose?: () => void): () => void {
  const focusableSelector =
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  const getFocusableElements = (): HTMLElement[] => {
    return Array.from(modal.querySelectorAll<HTMLElement>(focusableSelector));
  };

  const handleKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose?.();
      return;
    }

    if (event.key === 'Tab') {
      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  };

  modal.addEventListener('keydown', handleKeydown);

  // Focus the first focusable element
  const focusableElements = getFocusableElements();
  if (focusableElements.length > 0) {
    focusableElements[0].focus();
  }

  return () => {
    modal.removeEventListener('keydown', handleKeydown);
  };
}

function isNaturallyFocusable(element: HTMLElement): boolean {
  const tagName = element.tagName.toLowerCase();
  if (tagName === 'input' || tagName === 'select' || tagName === 'textarea' || tagName === 'button') {
    return true;
  }
  if (tagName === 'a') {
    return element.hasAttribute('href');
  }
  return element.isContentEditable;
}

/**
 * Normalizes editor field focusability without overriding the document tab order.
 * Native controls rely on DOM order, while custom field shells are promoted into it.
 *
 * @param container - Container element with data-field-input elements
 */
export function setupFieldTabOrder(container: HTMLElement): void {
  const inputs = container.querySelectorAll<HTMLElement>('[data-field-input]');
  inputs.forEach((input) => {
    if (isNaturallyFocusable(input)) {
      input.removeAttribute('tabindex');
      return;
    }
    input.setAttribute('tabindex', '0');
  });
}
