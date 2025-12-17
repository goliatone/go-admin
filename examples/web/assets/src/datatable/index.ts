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
