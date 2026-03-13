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
// Breadcrumb Component
// =============================================================================

export {
  // Types
  type BreadcrumbItem,
  type BreadcrumbOptions,

  // Render functions
  renderBreadcrumb,
  mountBreadcrumb,

  // Preset builders
  buildDashboardBreadcrumb,
  buildQueueBreadcrumb,
  buildEditorBreadcrumb,
  buildFamilyBreadcrumb,
  buildMatrixBreadcrumb,
  buildExchangeBreadcrumb,
} from './breadcrumb.js';
