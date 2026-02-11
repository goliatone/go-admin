/**
 * Error message extraction helpers
 * Matches the repository's actual backend error formats
 */
/**
 * Structured error result from API responses.
 * Used for typed error handling (e.g., translation blockers, validation).
 */
export interface StructuredError {
    /** Domain error code (e.g., 'TRANSLATION_MISSING', 'VALIDATION_FAILED') */
    textCode: string | null;
    /** Human-readable error message */
    message: string;
    /** Error metadata (varies by error type) */
    metadata: Record<string, unknown> | null;
    /** Field-level validation errors */
    fields: Record<string, string> | null;
    /** Original validation_errors array if present */
    validationErrors: ValidationError[] | null;
}
/**
 * Field validation error entry
 */
export interface ValidationError {
    field: string;
    message: string;
}
/**
 * Translation blocker metadata extracted from TRANSLATION_MISSING errors
 */
export interface TranslationBlockerInfo {
    /** Locales that are missing translations */
    missingLocales: string[];
    /** Required fields missing per locale (optional) */
    missingFieldsByLocale: Record<string, string[]> | null;
    /** The workflow transition that was blocked (e.g., 'publish') */
    transition: string | null;
    /** Entity type (e.g., 'pages', 'posts') */
    entityType: string | null;
    /** The locale that was requested */
    requestedLocale: string | null;
    /** The environment context (e.g., 'production', 'staging') */
    environment: string | null;
}
/**
 * Action response envelope types
 */
export interface ActionSuccessResponse {
    status: 'ok';
    data?: Record<string, unknown>;
}
export interface ActionErrorResponse {
    error: {
        text_code?: string;
        message?: string;
        metadata?: Record<string, unknown>;
        validation_errors?: Array<{
            field?: string;
            message?: string;
        }>;
    };
}
export type ActionResponse = ActionSuccessResponse | ActionErrorResponse;
/**
 * Extract structured error from fetch Response.
 * Use this when you need typed error handling (text_code branching, metadata access).
 * For simple message display, use extractErrorMessage instead.
 */
export declare function extractStructuredError(response: Response): Promise<StructuredError>;
/**
 * Extract translation blocker information from a structured error.
 * Returns null if the error is not a TRANSLATION_MISSING error.
 */
export declare function extractTranslationBlocker(error: StructuredError): TranslationBlockerInfo | null;
/**
 * Check if a structured error is a translation blocker
 */
export declare function isTranslationBlocker(error: StructuredError): boolean;
/**
 * Parse action response from panel action endpoint.
 * Returns typed result for deterministic control flow.
 */
export declare function parseActionResponse(data: unknown): {
    success: boolean;
    data?: Record<string, unknown>;
    error?: StructuredError;
};
/**
 * Execute a panel action and parse the response with typed handling.
 * Handles both success and error envelopes.
 */
export declare function executeActionRequest(endpoint: string, payload: Record<string, unknown>, options?: RequestInit): Promise<{
    success: boolean;
    data?: Record<string, unknown>;
    error?: StructuredError;
}>;
/**
 * Extract user-friendly error message from fetch Response
 * Handles multiple backend formats used in this repo:
 * 1. /admin/api/* format: {status, error} (quickstart/error_fiber.go)
 * 2. /admin/crud/* format: Problem+JSON {detail, title} (go-crud)
 * 3. go-users errors: Text with "go-users:" prefix
 */
export declare function extractErrorMessage(response: Response): Promise<string>;
/**
 * Extract error message from various error types
 */
export declare function getErrorMessage(error: unknown): string;
/**
 * Build a user-facing message from a structured error.
 * Includes text_code and field-level details when available.
 */
export declare function formatStructuredErrorForDisplay(error: StructuredError, fallbackMessage?: string): string;
/**
 * Exchange error codes for import/export operations.
 * These match the backend error codes from Phase 12 Task 12.3.
 */
export type ExchangeErrorCode = 'IMPORT_VALIDATION_FAILED' | 'IMPORT_CONFLICT' | 'IMPORT_LINKAGE_ERROR' | 'IMPORT_UNSUPPORTED_FORMAT' | 'IMPORT_STALE_SOURCE' | 'EXPORT_FAILED' | 'EXCHANGE_PERMISSION_DENIED';
/**
 * Row-level result status for import validation/apply operations.
 */
export type ExchangeRowStatus = 'success' | 'error' | 'conflict' | 'skipped';
/**
 * Single row result from import validation or apply.
 * Matches contract from TDD: Phase 11 Task 11.6 (TranslationExchangeTypes).
 */
export interface ExchangeRowResult {
    /** Row index in the import file (0-based) */
    index: number;
    /** Resource type (e.g., 'pages', 'posts') */
    resource: string;
    /** Entity ID in the source system */
    entityId: string;
    /** Translation group ID */
    translationGroupId: string;
    /** Target locale for this row */
    targetLocale: string;
    /** Field path being translated */
    fieldPath: string;
    /** Row processing status */
    status: ExchangeRowStatus;
    /** Error message if status is 'error' or 'conflict' */
    error?: string;
    /** Conflict details when status is 'conflict' */
    conflict?: ExchangeConflictInfo;
}
/**
 * Conflict information for a single row.
 */
export interface ExchangeConflictInfo {
    /** Type of conflict */
    type: 'stale_source' | 'missing_linkage' | 'duplicate' | 'invalid_locale';
    /** Expected source hash (for stale_source conflicts) */
    expectedHash?: string;
    /** Actual source hash in the file */
    actualHash?: string;
    /** Additional details */
    details?: string;
}
/**
 * Summary statistics from import validation/apply.
 */
export interface ExchangeResultSummary {
    /** Total rows processed */
    processed: number;
    /** Successfully processed rows */
    succeeded: number;
    /** Failed rows */
    failed: number;
    /** Rows with conflicts */
    conflicts: number;
    /** Rows skipped */
    skipped: number;
}
/**
 * Full import validation/apply result.
 */
export interface ExchangeImportResult {
    /** Summary statistics */
    summary: ExchangeResultSummary;
    /** Per-row results (may be truncated for large imports) */
    results: ExchangeRowResult[];
    /** Whether there are more results than returned */
    truncated: boolean;
    /** Total row count if truncated */
    totalRows?: number;
}
/**
 * Export options for translation export workflow.
 */
export interface ExchangeExportOptions {
    /** Resource types to export (e.g., ['pages', 'posts']) */
    resources: string[];
    /** Source locale */
    sourceLocale: string;
    /** Target locales to export for */
    targetLocales: string[];
    /** Field paths to include (empty = all translatable fields) */
    fields?: string[];
    /** Export format */
    format: 'csv' | 'json' | 'xliff';
    /** Include context columns (title, path, status, notes) */
    includeContext?: boolean;
}
/**
 * Export result metadata.
 */
export interface ExchangeExportResult {
    /** Number of rows exported */
    rowCount: number;
    /** Export format used */
    format: 'csv' | 'json' | 'xliff';
    /** Download URL or blob */
    downloadUrl?: string;
    /** Filename for download */
    filename: string;
}
/**
 * Exchange-specific error info extracted from structured error.
 */
export interface ExchangeErrorInfo {
    /** Exchange error code */
    code: ExchangeErrorCode;
    /** Human-readable message */
    message: string;
    /** Import result if validation failed */
    importResult?: ExchangeImportResult;
    /** Resource type context */
    resource?: string;
    /** Additional metadata */
    metadata?: Record<string, unknown>;
}
/**
 * Check if an error is an exchange-related error.
 */
export declare function isExchangeError(error: StructuredError): boolean;
/**
 * Extract exchange error info from a structured error.
 * Returns null if not an exchange error.
 */
export declare function extractExchangeError(error: StructuredError): ExchangeErrorInfo | null;
/**
 * Parse raw import result from API response.
 */
export declare function parseImportResult(data: Record<string, unknown>): ExchangeImportResult;
/**
 * Group exchange row results by status for UI rendering.
 */
export declare function groupRowResultsByStatus(results: ExchangeRowResult[]): {
    success: ExchangeRowResult[];
    error: ExchangeRowResult[];
    conflict: ExchangeRowResult[];
    skipped: ExchangeRowResult[];
};
/**
 * Generate a downloadable report from exchange results.
 * Returns a Blob suitable for download.
 */
export declare function generateExchangeReport(result: ExchangeImportResult, format?: 'json' | 'csv'): Blob;
//# sourceMappingURL=error-helpers.d.ts.map