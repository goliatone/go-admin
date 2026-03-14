/**
 * Translation Icon Constants
 *
 * Maps common translation UI icons to Iconoir icon names for consistent usage
 * across all translation surfaces. Prefer these constants over inline SVGs.
 *
 * Usage:
 *   import { renderIcon } from '../shared/icon-renderer.js';
 *   import { ICON_CHECK, ICON_WARNING } from './icon-constants.js';
 *   const html = renderIcon(ICON_CHECK, { size: '16px' });
 *
 * When to use inline SVG instead:
 *   - Complex/custom semantic icons that don't exist in Iconoir
 *   - Icons that need special animation or morphing
 *   - Icons embedded in status vocabulary constants (for consistency with backend)
 */

// =============================================================================
// Action Icons
// =============================================================================

/** Approve/confirm action */
export const ICON_CHECK = 'iconoir:check';

/** Reject/cancel action */
export const ICON_XMARK = 'iconoir:xmark';

/** Edit/pencil action */
export const ICON_EDIT = 'iconoir:edit-pencil';

/** Delete/trash action */
export const ICON_TRASH = 'iconoir:trash';

/** Save action */
export const ICON_SAVE = 'iconoir:save-floppy-disk';

/** Refresh/reload action */
export const ICON_REFRESH = 'iconoir:refresh-double';

/** Undo action */
export const ICON_UNDO = 'iconoir:undo';

/** Copy action */
export const ICON_COPY = 'iconoir:copy';

/** Download action */
export const ICON_DOWNLOAD = 'iconoir:download';

/** Upload action */
export const ICON_UPLOAD = 'iconoir:upload';

/** Export action */
export const ICON_EXPORT = 'iconoir:share-android';

/** Import action */
export const ICON_IMPORT = 'iconoir:import';

// =============================================================================
// Navigation Icons
// =============================================================================

/** Chevron left */
export const ICON_CHEVRON_LEFT = 'iconoir:nav-arrow-left';

/** Chevron right */
export const ICON_CHEVRON_RIGHT = 'iconoir:nav-arrow-right';

/** Chevron down */
export const ICON_CHEVRON_DOWN = 'iconoir:nav-arrow-down';

/** Chevron up */
export const ICON_CHEVRON_UP = 'iconoir:nav-arrow-up';

/** Arrow left */
export const ICON_ARROW_LEFT = 'iconoir:arrow-left';

/** Arrow right */
export const ICON_ARROW_RIGHT = 'iconoir:arrow-right';

/** External link */
export const ICON_EXTERNAL = 'iconoir:open-new-window';

// =============================================================================
// Status Icons
// =============================================================================

/** Warning/alert status */
export const ICON_WARNING = 'iconoir:warning-triangle';

/** Error/danger status */
export const ICON_ERROR = 'iconoir:warning-circle';

/** Info status */
export const ICON_INFO = 'iconoir:info-circle';

/** Success status */
export const ICON_SUCCESS = 'iconoir:check-circle';

/** Clock/time status */
export const ICON_CLOCK = 'iconoir:clock';

/** Lock/secured status */
export const ICON_LOCK = 'iconoir:lock';

/** Unlock status */
export const ICON_UNLOCK = 'iconoir:lock-open';

/** Ban/blocked status */
export const ICON_BAN = 'iconoir:prohibition';

// =============================================================================
// Translation-Specific Icons
// =============================================================================

/** Globe/locale icon */
export const ICON_GLOBE = 'iconoir:globe';

/** Language icon */
export const ICON_LANGUAGE = 'iconoir:language';

/** Translate icon */
export const ICON_TRANSLATE = 'iconoir:translate';

/** Due date icon */
export const ICON_CALENDAR = 'iconoir:calendar';

/** User/assignee icon */
export const ICON_USER = 'iconoir:user';

/** Users/team icon */
export const ICON_USERS = 'iconoir:group';

/** Document icon */
export const ICON_DOCUMENT = 'iconoir:page';

/** Documents/multiple pages icon */
export const ICON_DOCUMENTS = 'iconoir:multiple-pages';

/** Archive icon */
export const ICON_ARCHIVE = 'iconoir:archive';

/** Play/in-progress icon */
export const ICON_PLAY = 'iconoir:play';

/** Pause icon */
export const ICON_PAUSE = 'iconoir:pause';

/** Queue/list icon */
export const ICON_QUEUE = 'iconoir:list';

/** Dashboard/grid icon */
export const ICON_DASHBOARD = 'iconoir:view-grid';

/** Family/group icon */
export const ICON_FAMILY = 'iconoir:folder';

/** Exchange/sync icon */
export const ICON_EXCHANGE = 'iconoir:data-transfer-both';

/** Matrix/table icon */
export const ICON_MATRIX = 'iconoir:table-rows';

// =============================================================================
// UI Element Icons
// =============================================================================

/** Close/dismiss icon */
export const ICON_CLOSE = 'iconoir:xmark';

/** Menu/hamburger icon */
export const ICON_MENU = 'iconoir:menu';

/** More options (ellipsis) icon */
export const ICON_MORE = 'iconoir:more-horiz';

/** Search icon */
export const ICON_SEARCH = 'iconoir:search';

/** Filter icon */
export const ICON_FILTER = 'iconoir:filter-alt';

/** Sort icon */
export const ICON_SORT = 'iconoir:sort';

/** Settings/cog icon */
export const ICON_SETTINGS = 'iconoir:settings';

/** Help/question icon */
export const ICON_HELP = 'iconoir:help-circle';

/** Expand icon */
export const ICON_EXPAND = 'iconoir:expand';

/** Collapse icon */
export const ICON_COLLAPSE = 'iconoir:collapse';

/** Eye/visible icon */
export const ICON_VISIBLE = 'iconoir:eye';

/** Eye off/hidden icon */
export const ICON_HIDDEN = 'iconoir:eye-off';

// =============================================================================
// Mapping Helper
// =============================================================================

/**
 * Maps status/action keywords to appropriate Iconoir icons.
 * Useful for dynamic icon selection based on status or action type.
 */
export const STATUS_ICON_MAP: Record<string, string> = {
  // Success states
  ready: ICON_SUCCESS,
  approved: ICON_SUCCESS,
  published: ICON_SUCCESS,
  completed: ICON_SUCCESS,
  on_track: ICON_SUCCESS,

  // Warning states
  pending: ICON_CLOCK,
  pending_review: ICON_CLOCK,
  due_soon: ICON_CLOCK,
  missing_fields: ICON_WARNING,

  // Error states
  blocked: ICON_BAN,
  rejected: ICON_ERROR,
  failed: ICON_ERROR,
  overdue: ICON_WARNING,
  missing_locale: ICON_ERROR,
  missing_locales: ICON_ERROR,

  // Info states
  in_progress: ICON_PLAY,
  assigned: ICON_USER,
  in_review: ICON_DOCUMENT,
  review: ICON_DOCUMENT,

  // Neutral states
  draft: ICON_DOCUMENT,
  archived: ICON_ARCHIVE,
  none: ICON_CLOCK,
  not_required: ICON_INFO,
};

/**
 * Gets the appropriate icon for a status value.
 * Falls back to info icon if status is not mapped.
 */
export function getStatusIcon(status: string): string {
  const normalized = status.toLowerCase().replace(/-/g, '_');
  return STATUS_ICON_MAP[normalized] ?? ICON_INFO;
}
