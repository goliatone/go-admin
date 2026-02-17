/**
 * DataTable component entry point
 * Exports core component and all behaviors
 */

export { DataGrid } from './core.js';
export type { DataGridConfig } from './core.js';

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

// Export payload modal
export { PayloadInputModal } from './payload-modal.js';
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
  AutosaveStateChangeCallback
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
