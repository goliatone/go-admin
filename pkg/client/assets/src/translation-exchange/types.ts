export interface TranslationExchangeConfig {
  apiPath: string;
  basePath: string;
  rootSelector?: string;
  historyPath?: string;
  includeExamples?: boolean;
}

export interface TranslationExchangeSelectors {
  root: string;
}

export interface LocaleOption {
  code: string;
  label: string;
}

export interface ResourceOption {
  value: string;
  label: string;
}

export interface ExportRequest {
  filter: {
    resources: string[];
    source_locale: string;
    target_locales: string[];
    include_source_hash: boolean;
  };
}

export interface ExportRow {
  resource: string;
  entity_id: string;
  translation_group_id: string;
  source_locale?: string;
  target_locale: string;
  field_path: string;
  source_text?: string;
  translated_text?: string;
  source_hash?: string;
  path?: string;
  title?: string;
  status?: string;
  notes?: string;
}

export interface ExportResponse {
  row_count: number;
  format?: string;
  rows?: ExportRow[];
  job?: Record<string, unknown>;
}

export interface ImportOptions {
  allow_create_missing: boolean;
  allow_source_hash_override: boolean;
  continue_on_error: boolean;
  dry_run: boolean;
}

export type RowStatus = "success" | "error" | "conflict" | "skipped";

export interface RowResult {
  index: number;
  resource: string;
  entity_id: string;
  translation_group_id: string;
  target_locale: string;
  field_path: string;
  status: RowStatus;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface ResultSummary {
  processed: number;
  succeeded: number;
  failed: number;
  skipped?: number;
  conflicts?: number;
}

export interface ImportResult {
  summary: ResultSummary;
  results: RowResult[];
  total_rows?: number;
  message?: string;
}

export type TranslationExchangeStageDecision = "accepted" | "rejected";

export interface ToastNotifier {
  success(message: string): void;
  error(message: string): void;
  info(message: string): void;
  warning(message: string): void;
}
