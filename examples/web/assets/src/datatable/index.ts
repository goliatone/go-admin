/**
 * DataTable component entry point
 * Exports core component and all behaviors
 */

export { DataGrid } from './core.js';
export type { DataGridConfig } from './core.js';

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
  DataGridBehaviors
} from './behaviors/types.js';

// Export go-crud implementations
export {
  GoCrudSearchBehavior,
  GoCrudFilterBehavior,
  GoCrudPaginationBehavior,
  GoCrudSortBehavior,
  GoCrudExportBehavior,
  GoCrudBulkActionBehavior,
  DefaultColumnVisibilityBehavior
} from './go-crud/index.js';
