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
  getMissingTranslationsCount
} from './translation-context.js';
export type {
  TranslationContext,
  LocaleBadgeOptions,
  TranslationStatusOptions,
  // Phase 19 productization types
  TranslationReadiness,
  ReadinessState,
  ReadinessBadgeOptions
} from './translation-context.js';

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
