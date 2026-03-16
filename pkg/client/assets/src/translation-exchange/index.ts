/**
 * Translation Exchange Module
 * UI for managing translation export/import workflows
 */

export { TranslationExchangeManager } from "./translation-exchange-manager.js";
export {
  normalizeTranslationExchangeJob,
  normalizeTranslationExchangeUploadDescriptor,
  normalizeTranslationExchangeValidationResult,
} from "../translation-contracts/index.js";

export type {
  TranslationExchangeConfig,
  TranslationExchangeSelectors,
  LocaleOption,
  ResourceOption,
  ExportRequest,
  ExportResponse,
  ExportRow,
  ImportOptions,
  ImportResult,
  ImportState,
  RowResult,
  RowStatus,
  ResultSummary,
  ToastNotifier,
} from "./types.js";
export type {
  TranslationExchangeConflictRow,
  TranslationExchangeJob,
  TranslationExchangeJobKind,
  TranslationExchangeJobProgress,
  TranslationExchangeJobStatus,
  TranslationExchangeUploadDescriptor,
  TranslationExchangeUploadState,
  TranslationExchangeValidationResult,
  TranslationExchangeValidationSummary,
} from "../translation-contracts/index.js";
