/**
 * E-Sign Module
 * Main entry point for the e-sign frontend module
 *
 * This module provides TypeScript-based page controllers and utilities
 * for the e-sign application, replacing inline template JavaScript.
 */

// Types
export * from './types.js';
export {
  normalizeCandidateWarningSummary,
  normalizeLineagePresentationWarning,
  normalizeDocumentLineageDetail,
  normalizeAgreementLineageDetail,
  normalizeGoogleImportLineageStatus,
  normalizeGoogleImportRunHandle,
  normalizeGoogleImportRunDetail,
  isTerminalGoogleImportStatus,
  resolveGoogleImportRedirectURL,
  normalizePhase1LineageContractFixtures,
  // Fingerprint status constants (Phase 7 Task 7.7)
  FINGERPRINT_STATUS,
  isValidFingerprintStatus,
  // Candidate relationship constants (Phase 8 Task 8.9)
  CANDIDATE_RELATIONSHIP_STATUS,
  CANDIDATE_RELATIONSHIP_TYPE,
  CONFIDENCE_BAND,
  isValidCandidateRelationshipStatus,
  type FingerprintStatus,
  type CandidateRelationshipStatus,
  type CandidateRelationshipType,
  type ConfidenceBand,
  type GoogleImportRunHandle,
  type GoogleImportRunDetail,
  type GoogleImportRunResource,
  type GoogleImportRedirectRoutes,
  type LineagePresentationWarning,
} from './lineage-contracts.js';

// Lineage Presentation Mappers (Phase 5 Task 5.6)
export {
  mapDocumentProvenance,
  mapAgreementProvenance,
  validateDocumentProvenanceViewModel,
  validateAgreementProvenanceViewModel,
  isGoogleSourced,
  hasActionableWarnings,
  getWarningSeverityClass,
  getWarningSeverityIcon,
  getSourceTypeIcon,
  getSourceTypeLabel,
  // Fingerprint status helpers (Phase 7 Task 7.7)
  getFingerprintStatusClass,
  getFingerprintStatusIcon,
  isFingerprintTerminal,
  isFingerprintSuccessful,
  hasFingerprintError,
  getFingerprintStatusMessage,
  type ProvenanceSourceType,
  type ProvenanceStatus,
  type WarningSeverity,
  type ProvenanceWarning,
  type ProvenanceSourceReference,
  type ProvenanceRevisionSummary,
  type ProvenanceArtifactSummary,
  type ProvenanceFingerprintStatus,
  type ProvenanceGoogleSource,
  type ProvenanceEmptyState,
  type DocumentProvenanceViewModel,
  type AgreementProvenanceViewModel,
} from './lineage-presentation.js';

// Lineage Diagnostics Rendering (Phase 6 Task 6.6)
export {
  // State determination
  determineDiagnosticState,
  // Display config builders
  createEmptyDisplayConfig,
  createNativeDisplayConfig,
  createFingerprintPendingDisplayConfig,
  createFingerprintFailedDisplayConfig,
  createCandidateWarningDisplayConfig,
  createLoadingDisplayConfig,
  createErrorDisplayConfig,
  // Card builders
  createWarningCard,
  createWarningCards,
  createFingerprintCard,
  createSourceCard,
  createNewerSourceCard,
  // Complete view model builders
  createDocumentDiagnosticViewModel,
  createAgreementDiagnosticViewModel,
  // State checks
  isDiagnosticEmpty,
  isDiagnosticNative,
  isDiagnosticFingerprintPending,
  isDiagnosticFingerprintFailed,
  isDiagnosticCandidateWarning,
  getPrimaryWarningCard,
  hasDiagnosticActionableWarnings,
  // Validation
  validateDocumentDiagnosticViewModel,
  validateAgreementDiagnosticViewModel,
  // Types
  type DiagnosticRenderState,
  type DiagnosticDisplayConfig,
  type DiagnosticWarningCard,
  type DiagnosticFingerprintCard,
  type DiagnosticSourceCard,
  type DiagnosticNewerSourceCard,
  type DocumentDiagnosticViewModel,
  type AgreementDiagnosticViewModel,
  type DiagnosticFixtureState,
} from './lineage-diagnostics.js';

// Provenance Card Interactivity (Phase 9 Task 9.5-9.8)
export {
  // Initialization
  initProvenanceCards,
  bootstrapProvenanceCards,
  initAllEvidenceToggles,
  initEvidenceToggle,
  // Utilities
  getProvenanceCards,
  getProvenanceCardFor,
  hasWarnings,
  hasEmptyState,
  getLineageStatus,
  getResourceKind,
  // Constants
  PROVENANCE_CARD_SELECTOR,
  EVIDENCE_TOGGLE_SELECTOR,
  EVIDENCE_COLLAPSED_SELECTOR,
  EVIDENCE_CONTAINER_SELECTOR,
  DEFAULT_PROVENANCE_CARD_CONFIG,
  // Types
  type ProvenanceCardConfig,
} from './provenance-card.js';

// Lineage Fixtures (Phase 2 Task 2.7-2.9)
export {
  documentLineageFixtures,
  agreementLineageFixtures,
  getDocumentLineageFixture,
  getAgreementLineageFixture,
  validateDocumentLineagePayload,
  validateAgreementLineagePayload,
  type DocumentLineageFixtures,
  type AgreementLineageFixtures,
  type LineageFixtureState,
  // Phase 3 Task 3.10 - Import state fixtures
  importResponseFixtures,
  getImportResponseFixture,
  validateImportResponsePayload,
  getImportFixtureStates,
  type ImportResponseFixtures,
  type ImportFixtureState,
  // Phase 4 Task 4.9 - Document/Agreement detail payload fixtures with lineage
  documentDetailPayloadFixtures,
  agreementDetailPayloadFixtures,
  getDocumentDetailPayloadFixture,
  getAgreementDetailPayloadFixture,
  validateDocumentDetailPayloadWithLineage,
  validateAgreementDetailPayloadWithLineage,
  hasDocumentLineageLinkage,
  hasAgreementPinnedProvenance,
  getDetailPayloadFixtureStates,
  type DocumentDetailPayloadWithLineage,
  type AgreementDetailPayloadWithLineage,
  type DocumentDetailPayloadFixtures,
  type AgreementDetailPayloadFixtures,
  type DetailPayloadFixtureState,
  // Phase 4 Task 4.10 - Seeded Google import QA fixtures
  seededGoogleImportScenarios,
  getSeededGoogleImportScenario,
  getSeededScenarioIds,
  validateSeededScenarioLineage,
  type SeededGoogleImportScenario,
  // Phase 8 Task 8.9 - Candidate warning fixtures
  candidateWarningFixtures,
  agreementCandidateWarningFixtures,
  getCandidateWarningFixture,
  getAgreementCandidateWarningFixture,
  getCandidateWarningFixtureStates,
  isCandidateActionable,
  isCandidateResolved,
  getPrimaryCandidateWarning,
  countCandidatesByStatus,
  validateCandidateWarningFixture,
  type CandidateWarningFixtureState,
  type ExtendedCandidateWarningSummary,
  type CandidateWarningFixtures,
  type AgreementCandidateWarningFixtures,
} from './lineage-fixtures.js';

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
  // Agreement detail page controller
  AgreementDetailPageController,
  initAgreementDetailPage,
  bootstrapAgreementDetailPage,
  getAgreementDetailController,
  formatTimestamp,
  formatTimestampNodes,
  wireCollapsibleSections,
  reviewActorKey,
  reviewActorInfo,
  applyReviewActorMetadata,
  findParticipantById,
  safeParseJSONScript,
  looksLikeUUID,
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

// Inline Status module (agreement detail live feedback)
export {
  // Manager
  InlineStatusManager,
  createInlineStatusManager,
  // Target resolution
  resolveStatusTarget,
  commandToSection,
  // Rendering
  createStatusElement,
  updateStatusElement,
  removeStatusElement,
  clearAllStatusElements,
  clearStaleStatusElements,
  // Command message customization
  getCommandMessage,
  COMMAND_MESSAGES,
  // Constants
  DEFAULT_INLINE_STATUS_CONFIG,
  SECTION_TARGET_SELECTORS,
  SECTION_FALLBACK_SELECTORS,
  PAGE_STATUS_TARGET,
  STATUS_DISPLAY,
  // Types
  type InlineStatusConfig,
  type StatusDisplayConfig,
  type StatusTargetResult,
  type CommandMessageConfig,
} from './inline-status.js';

// Timeline module
export {
  // Event registry
  TIMELINE_COLOR_CLASSES,
  DEFAULT_EVENT_CONFIG,
  EVENT_REGISTRY,
  CONDENSED_MODE_PRIORITY_THRESHOLD,
  getEventConfig,
  generateFallbackLabel,
  getColorClasses,
  isVisibleInCondensedMode,
  isGroupableEvent,
  // Event resolver
  buildActorKey,
  humanizeActorRole,
  getActorColor,
  getActorInitials,
  createResolverContext,
  resolveActor,
  resolveMetadata,
  resolveFieldLabel,
  resolveParticipantName,
  // Event grouper
  processEventsForDisplay,
  groupItemsByDate,
  countHiddenEvents,
  getDateLabel,
  renderTimeline,
  renderFilteredState,
  // Timeline controller
  TimelineController,
  createTimelineController,
  parseTimelineBootstrap,
  parseMergedTimelineBootstrap,
  mergeReviewDataIntoTimeline,
  mergeReviewBootstrapIntoTimeline,
  // Types
  type EventResolverContext,
  type ProcessedTimelineItem,
  type DateGroup,
  type FilterStats,
} from './timeline/index.js';

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
