/**
 * DataTable component entry point
 * Exports core component and all behaviors
 */

export { DataGrid } from './core.js';
export type { DataGridConfig } from './core.js';
export {
  createDataGridStateStore,
  LocalDataGridStateStore,
  PreferencesDataGridStateStore,
} from './state-store.js';
export type {
  DataGridStateStore,
  DataGridStateStoreMode,
  DataGridStateStoreConfig,
  DataGridPersistedState,
  DataGridShareState,
} from './state-store.js';

export { AdvancedSearch } from './advanced-search.js';
export type { AdvancedSearchConfig, SearchCriterion, FieldDefinition } from './advanced-search.js';

export { FilterBuilder } from './filter-builder.js';
export type { FilterBuilderConfig } from './filter-builder.js';

// Export behavior types
export type {
  ColumnDefinition,
  ColumnFilter,
  SortColumn,
  SearchBehavior,
  FilterBehavior,
  PaginationBehavior,
  SortBehavior,
  ExportBehavior,
  BulkActionBehavior,
  ColumnVisibilityBehavior,
  DataGridBehaviors,
  FilterCondition,
  FilterGroup,
  FilterStructure
} from './behaviors/types.js';

// Export go-crud implementations
export {
  GoCrudSearchBehavior,
  GoCrudFilterBehavior,
  GoCrudPaginationBehavior,
  GoCrudSortBehavior,
  GoCrudExportBehavior,
  GoCrudBulkActionBehavior,
  DefaultColumnVisibilityBehavior,
  ServerColumnVisibilityBehavior
} from './go-crud/index.js';
export type { ServerColumnVisibilityConfig } from './go-crud/index.js';

// Export actions system
export { ActionRenderer } from './actions.js';
export type { ActionButton, BulkActionConfig, ActionVariant } from './actions.js';

// Export cell renderers
export { CellRendererRegistry, CommonRenderers } from './renderers.js';
export type { CellRenderer } from './renderers.js';

// Export column manager
export { ColumnManager } from './column-manager.js';
export type { ColumnManagerConfig } from './column-manager.js';

// Export schema-driven actions
export {
  SchemaActionBuilder,
  buildSchemaRowActions,
  extractSchemaActions
} from './schema-actions.js';
export type {
  SchemaAction,
  SchemaActionBuilderConfig,
  ActionResult,
  TranslationBlockerContext,
  PayloadSchema,
  PayloadSchemaProperty
} from './schema-actions.js';

// Export payload modal as lazy proxy so schema-actions can keep payload-modal in a split chunk.
export { PayloadInputModal } from './payload-modal-lazy.js';
export type {
  PayloadModalConfig,
  PayloadModalField,
  PayloadModalFieldOption
} from './payload-modal.js';

// Export translation blocker modal
export {
  TranslationBlockerModal,
  showTranslationBlocker
} from './translation-blocker-modal.js';
export type {
  TranslationBlockerModalConfig,
  CreateTranslationResult
} from './translation-blocker-modal.js';

// Export translation context helpers
export {
  extractTranslationContext,
  isInFallbackMode,
  hasTranslationContext,
  renderLocaleBadge,
  renderAvailableLocalesIndicator,
  renderTranslationStatusCell,
  renderStatusBadge,
  renderFallbackWarning,
  createTranslationStatusRenderer,
  createLocaleBadgeRenderer,
  // Phase 19 productization: translation readiness
  extractTranslationReadiness,
  hasTranslationReadiness,
  isReadyForTransition,
  renderReadinessIndicator,
  renderPublishReadinessBadge,
  renderLocaleCompleteness,
  // Phase 19.2: Missing translations affordance
  renderMissingTranslationsBadge,
  hasMissingTranslations,
  getMissingTranslationsCount,
  // Phase 2: Translation Matrix Cell
  renderTranslationMatrixCell,
  createTranslationMatrixRenderer
} from './translation-context.js';
export type {
  TranslationContext,
  LocaleBadgeOptions,
  TranslationStatusOptions,
  // Phase 19 productization types
  TranslationReadiness,
  ReadinessState,
  ReadinessBadgeOptions,
  // Phase 2: Translation Matrix Cell
  MatrixCellOptions
} from './translation-context.js';

// Export status legend component
export {
  StatusLegend,
  createStatusLegend,
  initStatusLegends,
  renderStatusLegendHTML,
  DEFAULT_STATUS_LEGEND_ITEMS
} from './status-legend.js';
export type {
  StatusLegendItem,
  StatusLegendConfig
} from './status-legend.js';

// Export quick filters (Phase 2)
export {
  QuickFilters,
  createTranslationQuickFilters,
  initQuickFilters,
  renderQuickFiltersHTML,
  DEFAULT_TRANSLATION_QUICK_FILTERS
} from './quick-filters.js';
export type {
  QuickFilter,
  QuickFilterCapability,
  QuickFilterState,
  QuickFiltersConfig
} from './quick-filters.js';

// Export grouped mode utilities (Phase 2)
export {
  transformToGroups,
  hasBackendGroupedRows,
  normalizeBackendGroupedRows,
  mergeBackendSummaries,
  extractBackendSummaries,
  getPersistedExpandState,
  persistExpandState,
  toggleGroupExpand,
  expandAllGroups,
  collapseAllGroups,
  getExpandedGroupIds,
  getPersistedViewMode,
  persistViewMode,
  parseViewMode,
  encodeExpandedGroupsToken,
  decodeExpandedGroupsToken,
  renderGroupHeaderSummary,
  renderGroupHeaderRow,
  renderGroupedEmptyState,
  renderGroupedLoadingState,
  renderGroupedErrorState,
  isNarrowViewport,
  getViewModeForViewport
} from './grouped-mode.js';
export type {
  ViewMode,
  GroupSummary,
  RecordGroup,
  GroupedData,
  GroupTransformOptions
} from './grouped-mode.js';

// Export translation bulk actions (Phase 2)
export {
  executeBulkCreateMissing,
  renderBulkResultSummary,
  renderBulkResultInline,
  createBulkCreateMissingHandler
} from './translation-bulk-actions.js';
export type {
  BulkCreateResult,
  BulkCreateMissingResponse,
  BulkActionSummary,
  BulkCreateMissingConfig
} from './translation-bulk-actions.js';

// Export locale action component (Phase 3)
export {
  LocaleActionChip,
  getLocaleLabel,
  renderLocaleActionChip,
  renderLocaleActionList,
  initLocaleActionChips,
  buildLocaleEditUrl
} from './locale-action.js';
export type {
  LocaleActionConfig,
  LocaleActionState,
  CreateActionResult
} from './locale-action.js';

// Export fallback banner component (Phase 3)
export {
  FallbackBanner,
  applyFormLock,
  removeFormLock,
  isFormLocked,
  getFormLockReason,
  renderFallbackBannerFromRecord,
  shouldShowFallbackBanner,
  initFallbackBanner,
  initFormLock
} from './fallback-banner.js';
export type {
  FallbackBannerConfig,
  FormLockState
} from './fallback-banner.js';

// Export inline locale chips component (Phase 3)
export {
  InlineLocaleChips,
  renderInlineLocaleChips,
  shouldShowInlineLocaleChips,
  initInlineLocaleChips,
  createInlineLocaleChipsRenderer
} from './inline-locale-chips.js';
export type {
  InlineLocaleChipsConfig,
  ActionStateEntry
} from './inline-locale-chips.js';

// Export keyboard shortcuts registry (Phase 3)
export {
  KeyboardShortcutRegistry,
  isMacPlatform,
  getPrimaryModifierLabel,
  getModifierSymbol,
  formatShortcutDisplay,
  createTranslationShortcuts,
  renderShortcutsHelpContent,
  getDefaultShortcutRegistry,
  initKeyboardShortcuts,
  // Phase 3 Addenda: Discovery and settings (TX-073)
  loadShortcutSettings,
  saveShortcutSettings,
  isShortcutHintDismissed,
  dismissShortcutHint,
  renderDiscoveryHint,
  renderShortcutSettingsUI,
  applyShortcutSettings,
  initKeyboardShortcutsWithDiscovery
} from './keyboard-shortcuts.js';
export type {
  KeyboardShortcut,
  ModifierKey,
  ShortcutCategory,
  ShortcutContext,
  ShortcutRegistrationOptions,
  ShortcutRegistryConfig,
  // Phase 3 Addenda: Settings types (TX-073)
  ShortcutSettings,
  DiscoveryHintConfig,
  ShortcutSettingsUIConfig
} from './keyboard-shortcuts.js';

// Export autosave indicator component (Phase 3)
export {
  AutosaveIndicator,
  createTranslationAutosave,
  renderAutosaveIndicator,
  getAutosaveIndicatorStyles,
  initFormAutosave
} from './autosave-indicator.js';
export type {
  AutosaveState,
  AutosaveIndicatorConfig,
  AutosaveLabels,
  AutosaveStateChangeEvent,
  AutosaveStateChangeCallback,
  // Phase 3b conflict handling types (TX-074)
  AutosaveConflictInfo,
  ConflictResolutionAction,
  ConflictResolution,
  ConflictLabels
} from './autosave-indicator.js';

// Export field-level helpers (Phase 3)
export {
  CharacterCounter,
  InterpolationPreview,
  DirectionToggle,
  initFieldHelpers,
  renderCharacterCounter,
  renderDirectionToggle,
  getFieldHelperStyles,
  detectInterpolations,
  getCharCountSeverity,
  DEFAULT_INTERPOLATION_PATTERNS,
  DEFAULT_SAMPLE_VALUES
} from './field-helpers.js';
export type {
  CharacterCounterThreshold,
  CharacterCounterConfig,
  InterpolationPattern,
  InterpolationPreviewConfig,
  DirectionToggleConfig,
  FieldHelperState,
  InterpolationMatch
} from './field-helpers.js';

// Export translation exchange types and helpers (Phase 15)
export {
  isExchangeError,
  extractExchangeError,
  parseImportResult,
  groupRowResultsByStatus,
  generateExchangeReport
} from '../toast/error-helpers.js';
export type {
  ExchangeErrorCode,
  ExchangeRowStatus,
  ExchangeRowResult,
  ExchangeConflictInfo,
  ExchangeResultSummary,
  ExchangeImportResult,
  ExchangeExportOptions,
  ExchangeExportResult,
  ExchangeErrorInfo
} from '../toast/error-helpers.js';

// Export capability gate utility (Phase 4 - TX-046)
export {
  CapabilityGate,
  parseCapabilityMode,
  isExchangeEnabled,
  isQueueEnabled,
  isCoreEnabled,
  extractCapabilities,
  createCapabilityGate,
  createEmptyCapabilityGate,
  renderGateAriaAttributes,
  renderDisabledReasonBadge,
  getCapabilityGateStyles,
  applyGateToElement,
  initCapabilityGating
} from './capability-gate.js';
export type {
  CapabilityMode,
  ActionState,
  ModuleState,
  RouteConfig,
  TranslationCapabilities,
  GateResult,
  NavItemGate
} from './capability-gate.js';

// Export translator dashboard (Phase 4 - TX-047)
export {
  TranslatorDashboard,
  createTranslatorDashboard,
  initTranslatorDashboard,
  initTranslatorDashboardWithOptions,
  getTranslatorDashboardStyles,
  DEFAULT_FILTER_PRESETS
} from './translator-dashboard.js';
export type {
  DueState,
  QueueState,
  ContentState,
  AssignmentPriority,
  ReviewActionState,
  TranslationAssignment,
  MyWorkResponse,
  QueueResponse,
  FilterPreset,
  DashboardState,
  TranslatorDashboardConfig,
  InitTranslatorDashboardOptions,
  DashboardLabels
} from './translator-dashboard.js';

// Export exchange import component (Phase 4 - TX-048)
export {
  ExchangeImport,
  createExchangeImport,
  initExchangeImport,
  getExchangeImportStyles
} from './exchange-import.js';
export type {
  ImportConflictResolution,
  RowSelectionState,
  ImportPreviewRow,
  ImportPreviewState,
  ImportApplyOptions,
  ExchangeImportConfig,
  ImportLabels
} from './exchange-import.js';

// Export async progress component (Phase 4 - TX-049)
export {
  AsyncProgress,
  createAsyncProgress,
  initAsyncProgress,
  checkForPersistedJob,
  getAsyncProgressStyles
} from './async-progress.js';
export type {
  JobStatus,
  PollingState,
  JobProgress,
  ConflictSummary,
  AsyncJobEnvelope,
  PersistedJobState,
  AsyncProgressConfig,
  AsyncProgressLabels
} from './async-progress.js';

// Export side-by-side editor component (Phase 5 - TX-051)
export {
  SideBySideEditor,
  createSideBySideEditor,
  initSideBySideEditorFromRecord,
  extractSourceTargetDrift,
  hasFieldDrift,
  getChangedFields,
  getSideBySideEditorStyles,
  DEFAULT_SIDE_BY_SIDE_LABELS
} from './side-by-side-editor.js';
export type {
  SourceTargetDrift,
  SideBySideField,
  SideBySideEditorConfig,
  SideBySideLabels
} from './side-by-side-editor.js';

// Export translation status vocabulary (Phase 5 - TX-052)
export {
  // Display configurations
  CORE_READINESS_DISPLAY,
  QUEUE_STATE_DISPLAY,
  QUEUE_CONTENT_STATE_DISPLAY,
  QUEUE_DUE_STATE_DISPLAY,
  EXCHANGE_ROW_STATUS_DISPLAY,
  EXCHANGE_JOB_STATUS_DISPLAY,
  DISABLED_REASON_DISPLAY,
  // Lookup functions
  getStatusDisplay,
  getDisabledReasonDisplay,
  isValidStatus,
  isValidReasonCode,
  getStatusesForDomain,
  getAllReasonCodes,
  // CSS class helpers (TX-053: shared status class derivation)
  getStatusCssClass,
  getSeverityCssClass,
  // Rendering functions
  renderVocabularyStatusBadge,
  renderVocabularyStatusIcon,
  renderReasonCodeBadge,
  renderReasonCodeIndicator,
  // Cell renderer factories
  createStatusCellRenderer,
  createReasonCodeCellRenderer,
  // Initialization
  initializeVocabularyFromPayload,
  // Styles
  getStatusVocabularyStyles
} from './translation-status-vocabulary.js';
export type {
  StatusDomain,
  CoreReadinessState,
  QueueState as VocabularyQueueState,
  QueueContentState,
  QueueDueState,
  ExchangeRowStatus as VocabularyExchangeRowStatus,
  ExchangeJobStatus,
  TranslationStatus,
  DisabledReasonCode,
  StatusDisplayConfig,
  DisabledReasonDisplayConfig,
  StatusVocabularyPayload
} from './translation-status-vocabulary.js';
