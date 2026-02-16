/**
 * E-Sign Module
 * Main entry point for the e-sign frontend module
 *
 * This module provides TypeScript-based page controllers and utilities
 * for the e-sign application, replacing inline template JavaScript.
 */
export * from './types.js';
export { ESignAPIClient, ESignAPIError, getESignClient, setESignClient, createESignClient, type ESignAPIClientConfig, } from './api-client.js';
export { formatFileSize, formatPageCount, formatDateTime, formatDate, formatTime, formatRelativeTime, formatRecipientCount, capitalize, snakeToTitle, truncate, AGREEMENT_STATUS_BADGES, getAgreementStatusBadge, renderStatusBadge, createStatusBadgeElement, updateStatusBadge, type BadgeConfig, qs, qsa, byId, createElement, on, delegate, onReady, show, hide, toggle, setLoading, updateDataText, updateDataTexts, getPageConfig, announce, poll, retry, sleep, debounce, throttle, createTimeoutController, withTimeout, type PollOptions, type PollResult, type RetryOptions, } from './utils/index.js';
export { LandingPageController, initLandingPage, bootstrapLandingPage, type LandingPageConfig, SignerCompletePageController, initSignerCompletePage, bootstrapSignerCompletePage, type SignerCompleteConfig, type ArtifactUrls, formatSizeElements, formatTimestampElements, applyDetailFormatters, initDetailFormatters, GoogleCallbackController, initGoogleCallback, bootstrapGoogleCallback, type GoogleCallbackConfig, GoogleIntegrationController, initGoogleIntegration, bootstrapGoogleIntegration, GoogleDrivePickerController, initGoogleDrivePicker, bootstrapGoogleDrivePicker, type GoogleDrivePickerConfig, } from './pages/index.js';
//# sourceMappingURL=index.d.ts.map