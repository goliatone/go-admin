/**
 * E-Sign Module
 * Main entry point for the e-sign frontend module
 *
 * This module provides TypeScript-based page controllers and utilities
 * for the e-sign application, replacing inline template JavaScript.
 */

// Types
export * from './types.js';

// API Client
export {
  ESignAPIClient,
  ESignAPIError,
  getESignClient,
  setESignClient,
  createESignClient,
  type ESignAPIClientConfig,
} from './api-client.js';

// Utilities
export {
  // Formatters
  formatFileSize,
  formatPageCount,
  formatDateTime,
  formatDate,
  formatTime,
  formatRelativeTime,
  formatRecipientCount,
  capitalize,
  snakeToTitle,
  truncate,
  // Status badges
  AGREEMENT_STATUS_BADGES,
  getAgreementStatusBadge,
  renderStatusBadge,
  createStatusBadgeElement,
  updateStatusBadge,
  type BadgeConfig,
  // DOM helpers
  qs,
  qsa,
  byId,
  createElement,
  on,
  delegate,
  onReady,
  show,
  hide,
  toggle,
  setLoading,
  updateDataText,
  updateDataTexts,
  getPageConfig,
  announce,
  // Async helpers
  poll,
  retry,
  sleep,
  debounce,
  throttle,
  createTimeoutController,
  withTimeout,
  type PollOptions,
  type PollResult,
  type RetryOptions,
} from './utils/index.js';

// Page controllers
export {
  LandingPageController,
  initLandingPage,
  bootstrapLandingPage,
  type LandingPageConfig,
  SignerCompletePageController,
  initSignerCompletePage,
  bootstrapSignerCompletePage,
  type SignerCompleteConfig,
  type ArtifactUrls,
  formatSizeElements,
  formatTimestampElements,
  applyDetailFormatters,
  initDetailFormatters,
  // Google integration
  GoogleCallbackController,
  initGoogleCallback,
  bootstrapGoogleCallback,
  type GoogleCallbackConfig,
  GoogleIntegrationController,
  initGoogleIntegration,
  bootstrapGoogleIntegration,
  GoogleDrivePickerController,
  initGoogleDrivePicker,
  bootstrapGoogleDrivePicker,
  type GoogleDrivePickerConfig,
} from './pages/index.js';
