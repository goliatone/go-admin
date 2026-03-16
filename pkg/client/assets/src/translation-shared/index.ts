/**
 * Translation Shared Module
 *
 * Provides shared utilities, style constants, and components for
 * all translation UI surfaces (queue, editor, dashboard, family, matrix, exchange).
 *
 * This module ensures visual consistency with the admin site patterns.
 */

// =============================================================================
// Style Constants
// =============================================================================

export {
  // Buttons
  BTN,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_DANGER,
  BTN_SM,
  BTN_PRIMARY_SM,
  BTN_SECONDARY_SM,
  BTN_DANGER_SM,
  BTN_GHOST,
  BTN_ICON,

  // Border Radius
  ROUNDED_CARD,
  ROUNDED_BUTTON,
  ROUNDED_BADGE,
  ROUNDED_MD,

  // Colors
  TEXT_MUTED,
  TEXT_DEFAULT,
  TEXT_DIMMED,
  TEXT_TITLE,
  BORDER_DEFAULT,
  BORDER_SUBTLE,
  BG_SURFACE,
  BG_MUTED,
  BG_PAGE,

  // Headers
  HEADER_TITLE,
  HEADER_PRETITLE,
  HEADER_DESCRIPTION,
  HEADER_CONTAINER,
  HEADER_FLEX,

  // Cards
  CARD,
  CARD_SHADOW,
  CARD_HEADER,
  CARD_BODY,
  CARD_HEADER_MUTED,

  // States
  EMPTY_STATE,
  EMPTY_STATE_TITLE,
  EMPTY_STATE_TEXT,
  ERROR_STATE,
  ERROR_STATE_TITLE,
  ERROR_STATE_TEXT,
  LOADING_STATE,

  // Status Badges
  STATUS_BADGE,
  STATUS_SUCCESS,
  STATUS_WARNING,
  STATUS_ERROR,
  STATUS_NEUTRAL,
  STATUS_DRAFT,
  STATUS_ARCHIVED,
  STATUS_PUBLISHED,

  // CSS Custom Property Status Colors (Task 4.2)
  STATUS_COLOR_SUCCESS,
  STATUS_COLOR_WARNING,
  STATUS_COLOR_ERROR,
  STATUS_COLOR_INFO,
  STATUS_COLOR_NEUTRAL,
  STATUS_COLOR_PURPLE,
  SEVERITY_COLOR_MAP,
  getStatusColorClass,
  STATUS_SEVERITY_MAP,
  getStatusSeverityClass,

  // Form Inputs
  INPUT_TEXT,
  INPUT_TEXT_SM,
  INPUT_TEXTAREA,
  INPUT_SELECT,

  // Layout
  CONTENT_PADDING,
  CONTENT_MAX_WIDTH,
  FLEX_ROW,
  FLEX_ROW_SM,
  FLEX_COL,
  GRID_2COL_XL,
  GRID_MAIN_SIDEBAR,

  // Responsive Layout (Task 4.3)
  GRID_RESPONSIVE_MAIN_SIDEBAR,
  GRID_EDITOR_LAYOUT,
  FLEX_STACK_TO_ROW,
  BTN_RESPONSIVE,
  PADDING_RESPONSIVE,
  CARD_RESPONSIVE,

  // Mobile Card View (Task 4.4)
  MOBILE_CARD_LIST,
  MOBILE_CARD,
  MOBILE_CARD_HEADER,
  MOBILE_CARD_TITLE,
  MOBILE_CARD_SUBTITLE,
  MOBILE_CARD_BODY,
  MOBILE_CARD_ROW,
  MOBILE_CARD_LABEL,
  MOBILE_CARD_VALUE,
  MOBILE_CARD_ACTIONS,
  TABLE_RESPONSIVE,

  // Matrix View (Task 4.6)
  MATRIX_GRID_CONTAINER,
  MATRIX_TABLE,
  MATRIX_HEADER_ROW,
  MATRIX_STICKY_CELL,
  MATRIX_CORNER_CELL,
  MATRIX_CELL,
  MATRIX_MOBILE,

  // Disabled/Focus
  DISABLED,
  DISABLED_INTERACTIVE,
  FOCUS_RING,
  FOCUS_VISIBLE,

  // Modal Patterns
  MODAL_OVERLAY,
  MODAL_CONTENT,

  // Focus Utilities
  trapFocus,
  setupFieldTabOrder,
} from './style-constants.js';

// =============================================================================
// Icon Constants (Task 4.1)
// =============================================================================

export {
  // Action Icons
  ICON_CHECK,
  ICON_XMARK,
  ICON_EDIT,
  ICON_TRASH,
  ICON_SAVE,
  ICON_REFRESH,
  ICON_UNDO,
  ICON_COPY,
  ICON_DOWNLOAD,
  ICON_UPLOAD,
  ICON_EXPORT,
  ICON_IMPORT,

  // Navigation Icons
  ICON_CHEVRON_LEFT,
  ICON_CHEVRON_RIGHT,
  ICON_CHEVRON_DOWN,
  ICON_CHEVRON_UP,
  ICON_ARROW_LEFT,
  ICON_ARROW_RIGHT,
  ICON_EXTERNAL,

  // Status Icons
  ICON_WARNING,
  ICON_ERROR,
  ICON_INFO,
  ICON_SUCCESS,
  ICON_CLOCK,
  ICON_LOCK,
  ICON_UNLOCK,
  ICON_BAN,

  // Translation-Specific Icons
  ICON_GLOBE,
  ICON_LANGUAGE,
  ICON_TRANSLATE,
  ICON_CALENDAR,
  ICON_USER,
  ICON_USERS,
  ICON_DOCUMENT,
  ICON_DOCUMENTS,
  ICON_ARCHIVE,
  ICON_PLAY,
  ICON_PAUSE,
  ICON_QUEUE,
  ICON_DASHBOARD,
  ICON_FAMILY,
  ICON_EXCHANGE,
  ICON_MATRIX,

  // UI Element Icons
  ICON_CLOSE,
  ICON_MENU,
  ICON_MORE,
  ICON_SEARCH,
  ICON_FILTER,
  ICON_SORT,
  ICON_SETTINGS,
  ICON_HELP,
  ICON_EXPAND,
  ICON_COLLAPSE,
  ICON_VISIBLE,
  ICON_HIDDEN,

  // Mapping Helper
  STATUS_ICON_MAP,
  getStatusIcon,
} from './icon-constants.js';
