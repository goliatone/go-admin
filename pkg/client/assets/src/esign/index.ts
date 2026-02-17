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
  // Integration pages
  IntegrationHealthController,
  initIntegrationHealth,
  bootstrapIntegrationHealth,
  type IntegrationHealthConfig,
  IntegrationMappingsController,
  initIntegrationMappings,
  bootstrapIntegrationMappings,
  type IntegrationMappingsConfig,
  IntegrationConflictsController,
  initIntegrationConflicts,
  bootstrapIntegrationConflicts,
  type IntegrationConflictsConfig,
  IntegrationSyncRunsController,
  initIntegrationSyncRuns,
  bootstrapIntegrationSyncRuns,
  type IntegrationSyncRunsConfig,
  // Document form
  DocumentFormController,
  initDocumentForm,
  bootstrapDocumentForm,
  type DocumentFormConfig,
  // Agreement form
  AgreementFormController,
  initAgreementForm,
  bootstrapAgreementForm,
  type AgreementFormConfig,
  // Signer review
  SignerReviewController,
  initSignerReview,
  bootstrapSignerReview,
  type SignerReviewConfig,
  // Signer error
  SignerErrorPageController,
  initSignerErrorPage,
  bootstrapSignerErrorPage,
  type SignerErrorConfig,
  // Document detail preview
  DocumentDetailPreviewController,
  initDocumentDetailPreview,
  bootstrapDocumentDetailPreview,
  type DocumentDetailPreviewConfig,
  // Datatable bootstrap utilities
  PanelPaginationBehavior,
  PanelSearchBehavior,
  normalizeFilterType,
  normalizeFilterOptions,
  normalizeFilterOperators,
  prepareGridColumns,
  prepareFilterFields,
  dateTimeCellRenderer,
  fileSizeCellRenderer,
  defaultActionSuccessHandler,
  defaultActionErrorHandler,
  setupRefreshButton,
  createSchemaActionCachingRefresh,
  STANDARD_GRID_SELECTORS,
  type FilterField,
  type ColumnConfig,
  type CellRenderer,
  type DatatableBootstrapConfig,
} from './pages/index.js';

// Google Drive utilities
export {
  // Constants
  MIME_GOOGLE_DOC,
  MIME_GOOGLE_SHEET,
  MIME_GOOGLE_SLIDES,
  MIME_GOOGLE_FOLDER,
  MIME_PDF,
  IMPORTABLE_MIME_TYPES,
  GOOGLE_ACCOUNT_STORAGE_KEY,
  // Type predicates
  isGoogleDoc,
  isPDF,
  isFolder,
  isImportable,
  isGoogleWorkspaceFile,
  // Normalizers
  normalizeDriveFile,
  normalizeDriveFiles,
  // Display utilities
  getFileTypeName,
  getFileIconConfig,
  formatFileSize as formatDriveFileSize,
  formatDate as formatDriveDate,
  // Account ID management
  resolveAccountId,
  normalizeAccountId,
  saveAccountId,
  applyAccountIdToPath,
  buildScopedApiUrl,
  syncAccountIdToUrl,
  // HTML utilities
  escapeHtml,
  renderFileIcon,
  renderBreadcrumb,
  renderFileItem,
  renderFileList,
  createSelectedFile,
  // Types
  type NormalizedDriveFile,
  type FolderPathItem,
  type RawGoogleDriveFile,
  type SelectedFile,
} from './utils/google-drive-utils.js';
