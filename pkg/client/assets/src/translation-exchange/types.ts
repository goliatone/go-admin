/**
 * Translation Exchange Types
 * Type definitions for the translation exchange UI module
 */

/**
 * Configuration for the TranslationExchangeManager
 */
export interface TranslationExchangeConfig {
  /** Base API path for translation exchange endpoints */
  apiPath: string;
  /** Base path for the admin UI */
  basePath: string;
  /** Available locales for selection */
  availableLocales?: LocaleOption[];
  /** Available resources for export */
  availableResources?: ResourceOption[];
}

/**
 * Locale option for dropdowns
 */
export interface LocaleOption {
  code: string;
  label: string;
}

/**
 * Resource option for export
 */
export interface ResourceOption {
  value: string;
  label: string;
}

/**
 * DOM element selectors for the exchange UI
 */
export interface TranslationExchangeSelectors {
  // Tabs
  tabExport: string;
  tabImport: string;
  panelExport: string;
  panelImport: string;
  // Export form
  exportForm: string;
  sourceLocale: string;
  exportStatus: string;
  // Import
  importFile: string;
  importOptions: string;
  fileName: string;
  validateBtn: string;
  applyBtn: string;
  // Import options
  allowCreateMissing: string;
  allowHashOverride: string;
  continueOnError: string;
  dryRun: string;
  // Results
  validationResults: string;
  downloadReport: string;
  resultsSummary: string;
  resultsTable: string;
  resultsEmpty: string;
  summaryProcessed: string;
  summarySucceeded: string;
  summaryFailed: string;
  summaryConflicts: string;
}

/**
 * Export request payload
 */
export interface ExportRequest {
  filter: {
    resources: string[];
    source_locale: string;
    target_locales: string[];
    include_source_hash: boolean;
  };
}

/**
 * Export response from the API
 */
export interface ExportResponse {
  rows: ExportRow[];
  row_count: number;
  format?: string;
}

/**
 * Single export row
 */
export interface ExportRow {
  resource: string;
  entity_id: string;
  translation_group_id: string;
  source_locale: string;
  target_locale: string;
  field_path: string;
  source_text: string;
  translated_text: string;
  source_hash: string;
  path?: string;
  title?: string;
  status?: string;
  notes?: string;
}

/**
 * Import options for validate/apply
 */
export interface ImportOptions {
  allow_create_missing: boolean;
  allow_source_hash_override: boolean;
  continue_on_error: boolean;
  dry_run: boolean;
}

/**
 * Row status in import results
 */
export type RowStatus = 'success' | 'error' | 'conflict' | 'skipped';

/**
 * Single row result from import validation/apply
 */
export interface RowResult {
  index: number;
  resource: string;
  entity_id: string;
  translation_group_id: string;
  target_locale: string;
  field_path: string;
  status: RowStatus;
  error?: string;
  conflict?: {
    type: 'stale_source_hash' | 'missing_linkage' | 'duplicate_row' | 'invalid_locale';
    current_source_hash?: string;
    provided_source_hash?: string;
  };
  metadata?: Record<string, unknown>;
}

/**
 * Summary of import results
 */
export interface ResultSummary {
  processed: number;
  succeeded: number;
  failed: number;
  skipped?: number;
  conflicts?: number;
}

/**
 * Full import result from validate/apply
 */
export interface ImportResult {
  status: 'ok' | 'partial' | 'error';
  summary: ResultSummary;
  results: RowResult[];
  message?: string;
}

/**
 * Toast notification interface
 */
export interface ToastNotifier {
  success(message: string): void;
  error(message: string): void;
  info(message: string): void;
  warning(message: string): void;
}

/**
 * Import state tracking
 */
export interface ImportState {
  file: File | null;
  validated: boolean;
  validationResult: ImportResult | null;
}
