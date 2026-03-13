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
// =============================================================================

/** Standard card container */
export const CARD = 'bg-white border border-gray-200 rounded-xl';

/** Card with shadow */
export const CARD_SHADOW = 'bg-white border border-gray-200 rounded-xl shadow-sm';

/** Card header section */
export const CARD_HEADER = 'p-6 border-b border-gray-200';

/** Card body section */
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
