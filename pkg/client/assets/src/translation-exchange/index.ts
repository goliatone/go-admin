/**
 * Translation Exchange Module
 * UI for managing translation export/import workflows
 */

export { TranslationExchangeManager } from "./translation-exchange-manager.js";
export {
  normalizeTranslationExchangeHistoryResponse,
  normalizeTranslationExchangeJob,
  normalizeTranslationExchangeUploadDescriptor,
  normalizeTranslationExchangeValidationResult,
} from "../translation-contracts/index.js";

export type {
  ApplyConflictResolution,
  ApplyRequest,
  ApplyResolutionDecision,
  ApplyResponse,
  TranslationExchangeConfig,
  TranslationExchangeSelectors,
  LongPollOptions,
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
  TranslationExchangeAnalyticsEvent,
  ToastNotifier,
} from "./types.js";
export type {
  TranslationExchangeConflictRow,
  TranslationExchangeConflictType,
  TranslationExchangeHistoryResponse,
  TranslationExchangeJob,
  TranslationExchangeJobDownload,
  TranslationExchangeJobKind,
  TranslationExchangeJobProgress,
  TranslationExchangeJobRetention,
  TranslationExchangeJobStatus,
  TranslationExchangeUploadDescriptor,
  TranslationExchangeUploadState,
  TranslationExchangeValidationResult,
  TranslationExchangeValidationSummary,
} from "../translation-contracts/index.js";
