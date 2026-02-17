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
export type { ColumnDefinition, ColumnFilter, SortColumn, SearchBehavior, FilterBehavior, PaginationBehavior, SortBehavior, ExportBehavior, BulkActionBehavior, ColumnVisibilityBehavior, DataGridBehaviors, FilterCondition, FilterGroup, FilterStructure } from './behaviors/types.js';
export { GoCrudSearchBehavior, GoCrudFilterBehavior, GoCrudPaginationBehavior, GoCrudSortBehavior, GoCrudExportBehavior, GoCrudBulkActionBehavior, DefaultColumnVisibilityBehavior, ServerColumnVisibilityBehavior } from './go-crud/index.js';
export type { ServerColumnVisibilityConfig } from './go-crud/index.js';
export { ActionRenderer } from './actions.js';
export type { ActionButton, BulkActionConfig, ActionVariant } from './actions.js';
export { CellRendererRegistry, CommonRenderers } from './renderers.js';
export type { CellRenderer } from './renderers.js';
export { ColumnManager } from './column-manager.js';
export type { ColumnManagerConfig } from './column-manager.js';
export { SchemaActionBuilder, buildSchemaRowActions, extractSchemaActions } from './schema-actions.js';
export type { SchemaAction, SchemaActionBuilderConfig, ActionResult, TranslationBlockerContext, PayloadSchema, PayloadSchemaProperty } from './schema-actions.js';
export { PayloadInputModal } from './payload-modal.js';
export type { PayloadModalConfig, PayloadModalField, PayloadModalFieldOption } from './payload-modal.js';
export { TranslationBlockerModal, showTranslationBlocker } from './translation-blocker-modal.js';
export type { TranslationBlockerModalConfig, CreateTranslationResult } from './translation-blocker-modal.js';
export { extractTranslationContext, isInFallbackMode, hasTranslationContext, renderLocaleBadge, renderAvailableLocalesIndicator, renderTranslationStatusCell, renderStatusBadge, renderFallbackWarning, createTranslationStatusRenderer, createLocaleBadgeRenderer, extractTranslationReadiness, hasTranslationReadiness, isReadyForTransition, renderReadinessIndicator, renderPublishReadinessBadge, renderLocaleCompleteness, renderMissingTranslationsBadge, hasMissingTranslations, getMissingTranslationsCount, renderTranslationMatrixCell, createTranslationMatrixRenderer } from './translation-context.js';
export type { TranslationContext, LocaleBadgeOptions, TranslationStatusOptions, TranslationReadiness, ReadinessState, ReadinessBadgeOptions, MatrixCellOptions } from './translation-context.js';
export { StatusLegend, createStatusLegend, initStatusLegends, renderStatusLegendHTML, DEFAULT_STATUS_LEGEND_ITEMS } from './status-legend.js';
export type { StatusLegendItem, StatusLegendConfig } from './status-legend.js';
export { QuickFilters, createTranslationQuickFilters, initQuickFilters, renderQuickFiltersHTML, DEFAULT_TRANSLATION_QUICK_FILTERS } from './quick-filters.js';
export type { QuickFilter, QuickFilterCapability, QuickFilterState, QuickFiltersConfig } from './quick-filters.js';
export { transformToGroups, mergeBackendSummaries, extractBackendSummaries, getPersistedExpandState, persistExpandState, toggleGroupExpand, expandAllGroups, collapseAllGroups, getExpandedGroupIds, getPersistedViewMode, persistViewMode, renderGroupHeaderSummary, renderGroupHeaderRow, renderGroupedEmptyState, renderGroupedLoadingState, renderGroupedErrorState, isNarrowViewport, getViewModeForViewport } from './grouped-mode.js';
export type { ViewMode, GroupSummary, RecordGroup, GroupedData, GroupTransformOptions } from './grouped-mode.js';
export { executeBulkCreateMissing, renderBulkResultSummary, renderBulkResultInline, createBulkCreateMissingHandler } from './translation-bulk-actions.js';
export type { BulkCreateResult, BulkCreateMissingResponse, BulkActionSummary, BulkCreateMissingConfig } from './translation-bulk-actions.js';
export { LocaleActionChip, getLocaleLabel, renderLocaleActionChip, renderLocaleActionList, initLocaleActionChips, buildLocaleEditUrl } from './locale-action.js';
export type { LocaleActionConfig, LocaleActionState, CreateActionResult } from './locale-action.js';
export { FallbackBanner, applyFormLock, removeFormLock, isFormLocked, getFormLockReason, renderFallbackBannerFromRecord, shouldShowFallbackBanner, initFallbackBanner, initFormLock } from './fallback-banner.js';
export type { FallbackBannerConfig, FormLockState } from './fallback-banner.js';
export { InlineLocaleChips, renderInlineLocaleChips, shouldShowInlineLocaleChips, initInlineLocaleChips, createInlineLocaleChipsRenderer } from './inline-locale-chips.js';
export type { InlineLocaleChipsConfig, ActionStateEntry } from './inline-locale-chips.js';
export { KeyboardShortcutRegistry, isMacPlatform, getPrimaryModifierLabel, getModifierSymbol, formatShortcutDisplay, createTranslationShortcuts, renderShortcutsHelpContent, getDefaultShortcutRegistry, initKeyboardShortcuts, loadShortcutSettings, saveShortcutSettings, isShortcutHintDismissed, dismissShortcutHint, renderDiscoveryHint, renderShortcutSettingsUI, applyShortcutSettings, initKeyboardShortcutsWithDiscovery } from './keyboard-shortcuts.js';
export type { KeyboardShortcut, ModifierKey, ShortcutCategory, ShortcutContext, ShortcutRegistrationOptions, ShortcutRegistryConfig, ShortcutSettings, DiscoveryHintConfig, ShortcutSettingsUIConfig } from './keyboard-shortcuts.js';
export { AutosaveIndicator, createTranslationAutosave, renderAutosaveIndicator, getAutosaveIndicatorStyles, initFormAutosave } from './autosave-indicator.js';
export type { AutosaveState, AutosaveIndicatorConfig, AutosaveLabels, AutosaveStateChangeEvent, AutosaveStateChangeCallback, AutosaveConflictInfo, ConflictResolutionAction, ConflictResolution, ConflictLabels } from './autosave-indicator.js';
export { CharacterCounter, InterpolationPreview, DirectionToggle, initFieldHelpers, renderCharacterCounter, renderDirectionToggle, getFieldHelperStyles, detectInterpolations, getCharCountSeverity, DEFAULT_INTERPOLATION_PATTERNS, DEFAULT_SAMPLE_VALUES } from './field-helpers.js';
export type { CharacterCounterThreshold, CharacterCounterConfig, InterpolationPattern, InterpolationPreviewConfig, DirectionToggleConfig, FieldHelperState, InterpolationMatch } from './field-helpers.js';
export { isExchangeError, extractExchangeError, parseImportResult, groupRowResultsByStatus, generateExchangeReport } from '../toast/error-helpers.js';
export type { ExchangeErrorCode, ExchangeRowStatus, ExchangeRowResult, ExchangeConflictInfo, ExchangeResultSummary, ExchangeImportResult, ExchangeExportOptions, ExchangeExportResult, ExchangeErrorInfo } from '../toast/error-helpers.js';
export { CapabilityGate, parseCapabilityMode, isExchangeEnabled, isQueueEnabled, isCoreEnabled, extractCapabilities, createCapabilityGate, createEmptyCapabilityGate, renderGateAriaAttributes, renderDisabledReasonBadge, getCapabilityGateStyles, applyGateToElement, initCapabilityGating } from './capability-gate.js';
export type { CapabilityMode, ActionState, ModuleState, RouteConfig, TranslationCapabilities, GateResult, NavItemGate } from './capability-gate.js';
export { TranslatorDashboard, createTranslatorDashboard, initTranslatorDashboard, getTranslatorDashboardStyles, DEFAULT_FILTER_PRESETS } from './translator-dashboard.js';
export type { DueState, QueueState, ContentState, AssignmentPriority, ReviewActionState, TranslationAssignment, MyWorkResponse, QueueResponse, FilterPreset, DashboardState, TranslatorDashboardConfig, DashboardLabels } from './translator-dashboard.js';
//# sourceMappingURL=index.d.ts.map