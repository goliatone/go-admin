/**
 * Error message extraction helpers
 * Matches the repository's actual backend error formats
 */

// ============================================================================
// Structured Error Types
// ============================================================================

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
    validation_errors?: Array<{ field?: string; message?: string }>;
  };
}

export type ActionResponse = ActionSuccessResponse | ActionErrorResponse;

// ============================================================================
// Structured Error Extraction
// ============================================================================

/**
 * Extract structured error from fetch Response.
 * Use this when you need typed error handling (text_code branching, metadata access).
 * For simple message display, use extractErrorMessage instead.
 */
export async function extractStructuredError(response: Response): Promise<StructuredError> {
  const contentType = response.headers.get('content-type') || '';
  const isJson =
    contentType.includes('application/json') ||
    contentType.includes('application/problem+json');

  const bodyText = await response.clone().text().catch(() => '');

  // Default result
  const result: StructuredError = {
    textCode: null,
    message: `Request failed (${response.status})`,
    metadata: null,
    fields: null,
    validationErrors: null,
  };

  if (!bodyText) {
    return result;
  }

  // Try JSON parsing
  if (isJson || bodyText.trim().startsWith('{')) {
    try {
      const data = JSON.parse(bodyText) as Record<string, unknown>;

      // Handle structured error envelope: { error: { text_code, message, metadata, validation_errors } }
      if (data.error && typeof data.error === 'object') {
        const errObj = data.error as Record<string, unknown>;

        // Extract text_code
        if (typeof errObj.text_code === 'string') {
          result.textCode = errObj.text_code;
        }

        // Extract message
        if (typeof errObj.message === 'string' && errObj.message.trim()) {
          result.message = errObj.message.trim();
        }

        // Extract metadata
        if (errObj.metadata && typeof errObj.metadata === 'object') {
          result.metadata = errObj.metadata as Record<string, unknown>;
        }

        // Extract validation_errors
        if (Array.isArray(errObj.validation_errors)) {
          const validationErrors: ValidationError[] = [];
          const fields: Record<string, string> = {};

          for (const entry of errObj.validation_errors) {
            if (!entry || typeof entry !== 'object') continue;
            const field = (entry as Record<string, unknown>).field;
            const msg = (entry as Record<string, unknown>).message;
            if (typeof field === 'string' && typeof msg === 'string') {
              validationErrors.push({ field, message: msg });
              fields[field] = msg;
            }
          }

          if (validationErrors.length > 0) {
            result.validationErrors = validationErrors;
            result.fields = fields;
          }
        }

        // Also check metadata.fields for field-level errors
        if (result.metadata?.fields && typeof result.metadata.fields === 'object' && !Array.isArray(result.metadata.fields)) {
          const metaFields = result.metadata.fields as Record<string, unknown>;
          if (!result.fields) {
            result.fields = {};
          }
          for (const [field, msg] of Object.entries(metaFields)) {
            if (typeof msg === 'string') {
              result.fields[field] = msg;
            }
          }
        }

        return result;
      }

      // Handle simple string error: { error: "message" }
      if (typeof data.error === 'string' && data.error.trim()) {
        result.message = data.error.trim();
        return result;
      }

      // Handle Problem+JSON format: { detail, title }
      if (typeof data.detail === 'string' && data.detail.trim()) {
        result.message = data.detail.trim();
        return result;
      }
      if (typeof data.title === 'string' && data.title.trim()) {
        result.message = data.title.trim();
        return result;
      }

      // Handle generic message field
      if (typeof data.message === 'string' && data.message.trim()) {
        result.message = data.message.trim();
        return result;
      }
    } catch {
      // Not valid JSON, continue to text parsing
    }
  }

  // Handle text-based errors
  if (bodyText.includes('go-users:')) {
    const match = bodyText.match(/go-users:\s*([^|]+)/);
    if (match) {
      result.message = match[1].trim();
      return result;
    }
  }

  // Pipe-separated errors
  const pipeMatch = bodyText.match(/\|\s*([^|]+)$/);
  if (pipeMatch) {
    result.message = pipeMatch[1].trim();
    return result;
  }

  // Short text responses
  if (bodyText.trim().length > 0 && bodyText.length < 200) {
    result.message = bodyText.trim();
    return result;
  }

  return result;
}

// ============================================================================
// Translation Blocker Extraction
// ============================================================================

/**
 * Extract translation blocker information from a structured error.
 * Returns null if the error is not a TRANSLATION_MISSING error.
 */
export function extractTranslationBlocker(error: StructuredError): TranslationBlockerInfo | null {
  if (error.textCode !== 'TRANSLATION_MISSING') {
    return null;
  }

  const metadata = error.metadata || {};

  // Extract missing_locales
  let missingLocales: string[] = [];
  if (Array.isArray(metadata.missing_locales)) {
    missingLocales = metadata.missing_locales.filter((v): v is string => typeof v === 'string');
  }

  // Extract missing_fields_by_locale
  let missingFieldsByLocale: Record<string, string[]> | null = null;
  if (metadata.missing_fields_by_locale && typeof metadata.missing_fields_by_locale === 'object') {
    missingFieldsByLocale = {};
    const raw = metadata.missing_fields_by_locale as Record<string, unknown>;
    for (const [locale, fields] of Object.entries(raw)) {
      if (Array.isArray(fields)) {
        missingFieldsByLocale[locale] = fields.filter((v): v is string => typeof v === 'string');
      }
    }
    // If no valid entries, set to null
    if (Object.keys(missingFieldsByLocale).length === 0) {
      missingFieldsByLocale = null;
    }
  }

  // Extract other metadata fields
  const transition = typeof metadata.transition === 'string' ? metadata.transition : null;
  const entityType = typeof metadata.entity_type === 'string'
    ? metadata.entity_type
    : (typeof metadata.policy_entity === 'string' ? metadata.policy_entity : null);
  const requestedLocale = typeof metadata.requested_locale === 'string' ? metadata.requested_locale : null;
  const environment = typeof metadata.environment === 'string' ? metadata.environment : null;

  return {
    missingLocales,
    missingFieldsByLocale,
    transition,
    entityType,
    requestedLocale,
    environment,
  };
}

/**
 * Check if a structured error is a translation blocker
 */
export function isTranslationBlocker(error: StructuredError): boolean {
  return error.textCode === 'TRANSLATION_MISSING';
}

// ============================================================================
// Action Response Parsing
// ============================================================================

/**
 * Parse action response from panel action endpoint.
 * Returns typed result for deterministic control flow.
 */
export function parseActionResponse(data: unknown): {
  success: boolean;
  data?: Record<string, unknown>;
  error?: StructuredError;
} {
  if (!data || typeof data !== 'object') {
    return {
      success: false,
      error: {
        textCode: null,
        message: 'Invalid response format',
        metadata: null,
        fields: null,
        validationErrors: null,
      },
    };
  }

  const obj = data as Record<string, unknown>;

  // Check for success response: { status: "ok", data?: {...} }
  if (obj.status === 'ok') {
    const result: { success: boolean; data?: Record<string, unknown> } = { success: true };
    if (obj.data && typeof obj.data === 'object') {
      result.data = obj.data as Record<string, unknown>;
    }
    return result;
  }

  // Check for error response: { error: {...} }
  if (obj.error && typeof obj.error === 'object') {
    const errObj = obj.error as Record<string, unknown>;
    const error: StructuredError = {
      textCode: typeof errObj.text_code === 'string' ? errObj.text_code : null,
      message: typeof errObj.message === 'string' ? errObj.message : 'Unknown error',
      metadata: errObj.metadata && typeof errObj.metadata === 'object'
        ? errObj.metadata as Record<string, unknown>
        : null,
      fields: null,
      validationErrors: null,
    };

    // Extract validation errors
    if (Array.isArray(errObj.validation_errors)) {
      const validationErrors: ValidationError[] = [];
      const fields: Record<string, string> = {};

      for (const entry of errObj.validation_errors) {
        if (!entry || typeof entry !== 'object') continue;
        const field = (entry as Record<string, unknown>).field;
        const msg = (entry as Record<string, unknown>).message;
        if (typeof field === 'string' && typeof msg === 'string') {
          validationErrors.push({ field, message: msg });
          fields[field] = msg;
        }
      }

      if (validationErrors.length > 0) {
        error.validationErrors = validationErrors;
        error.fields = fields;
      }
    }

    return { success: false, error };
  }

  // Unknown format - try to extract a message
  let message = 'Unknown response format';
  if (typeof obj.message === 'string') {
    message = obj.message;
  } else if (typeof obj.error === 'string') {
    message = obj.error;
  }

  return {
    success: false,
    error: {
      textCode: null,
      message,
      metadata: null,
      fields: null,
      validationErrors: null,
    },
  };
}

/**
 * Execute a panel action and parse the response with typed handling.
 * Handles both success and error envelopes.
 */
export async function executeActionRequest(
  endpoint: string,
  payload: Record<string, unknown>,
  options?: RequestInit
): Promise<{
  success: boolean;
  data?: Record<string, unknown>;
  error?: StructuredError;
}> {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      ...options,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await extractStructuredError(response);
      return { success: false, error };
    }

    const data = await response.json();
    return parseActionResponse(data);
  } catch (err) {
    return {
      success: false,
      error: {
        textCode: null,
        message: err instanceof Error ? err.message : 'Network error',
        metadata: null,
        fields: null,
        validationErrors: null,
      },
    };
  }
}

// ============================================================================
// Legacy Message Extraction (backward compatible)
// ============================================================================

/**
 * Extract user-friendly error message from fetch Response
 * Handles multiple backend formats used in this repo:
 * 1. /admin/api/* format: {status, error} (quickstart/error_fiber.go)
 * 2. /admin/crud/* format: Problem+JSON {detail, title} (go-crud)
 * 3. go-users errors: Text with "go-users:" prefix
 */
export async function extractErrorMessage(response: Response): Promise<string> {
  const contentType = response.headers.get('content-type') || '';
  const isJson =
    contentType.includes('application/json') ||
    contentType.includes('application/problem+json');

  const bodyText = await response.clone().text().catch(() => '');

  if (bodyText) {
    // Try JSON payloads first (including Problem Details)
    if (isJson || bodyText.trim().startsWith('{')) {
      try {
        const data = JSON.parse(bodyText) as Record<string, unknown>;

        // Priority 1: /admin/api/* format (quickstart/error_fiber.go:18)
        if (typeof data.error === 'string' && data.error.trim()) return data.error.trim();
        if (data.error && typeof data.error === 'object') {
          const errObj = data.error as Record<string, unknown>;
          const message =
            typeof errObj.message === 'string' ? errObj.message.trim() : '';
          const fieldMessages: string[] = [];

          if (Array.isArray(errObj.validation_errors)) {
            for (const entry of errObj.validation_errors) {
              if (!entry || typeof entry !== 'object') continue;
              const field = (entry as Record<string, unknown>).field;
              const msg = (entry as Record<string, unknown>).message;
              if (typeof field === 'string' && typeof msg === 'string') {
                fieldMessages.push(`${field}: ${msg}`);
              }
            }
          }

          const metadata = errObj.metadata;
          if (metadata && typeof metadata === 'object') {
            const fields = (metadata as Record<string, unknown>).fields;
            if (fields && typeof fields === 'object' && !Array.isArray(fields)) {
              for (const [field, msg] of Object.entries(fields)) {
                if (typeof msg === 'string') {
                  fieldMessages.push(`${field}: ${msg}`);
                }
              }
            }
          }

          if (fieldMessages.length > 0) {
            const prefix =
              message && message.toLowerCase() !== 'validation failed'
                ? `${message}: `
                : 'Validation failed: ';
            return `${prefix}${fieldMessages.join('; ')}`;
          }
          if (message) return message;
        }

        // Priority 2: Problem+JSON (go-crud)
        if (typeof data.detail === 'string' && data.detail.trim()) return data.detail.trim();
        if (typeof data.title === 'string' && data.title.trim()) return data.title.trim();

        // Priority 3: Generic message field
        if (typeof data.message === 'string' && data.message.trim()) return data.message.trim();
      } catch {
        // Not JSON (or parse failed) - fall through to text handling
      }
    }

    // Extract go-users errors: "... | go-users: lifecycle transition not allowed"
    if (bodyText.includes('go-users:')) {
      const match = bodyText.match(/go-users:\s*([^|]+)/);
      if (match) return match[1].trim();
    }

    // Extract pipe-separated errors (common pattern)
    const pipeMatch = bodyText.match(/\|\s*([^|]+)$/);
    if (pipeMatch) return pipeMatch[1].trim();

    // If text is short enough, return it directly
    if (bodyText.trim().length > 0 && bodyText.length < 200) return bodyText.trim();
  }

  // Fallback to status code
  return `Request failed (${response.status})`;
}

/**
 * Extract error message from various error types
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'An unexpected error occurred';
}

// ============================================================================
// Translation Exchange Types (Phase 15 - prepared for backend integration)
// ============================================================================

/**
 * Exchange error codes for import/export operations.
 * These match the backend error codes from Phase 12 Task 12.3.
 */
export type ExchangeErrorCode =
  | 'IMPORT_VALIDATION_FAILED'
  | 'IMPORT_CONFLICT'
  | 'IMPORT_LINKAGE_ERROR'
  | 'IMPORT_UNSUPPORTED_FORMAT'
  | 'IMPORT_STALE_SOURCE'
  | 'EXPORT_FAILED'
  | 'EXCHANGE_PERMISSION_DENIED';

/**
 * Row-level result status for import validation/apply operations.
 */
export type ExchangeRowStatus =
  | 'success'
  | 'error'
  | 'conflict'
  | 'skipped';

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

// ============================================================================
// Exchange Error Extraction
// ============================================================================

/**
 * Check if an error is an exchange-related error.
 */
export function isExchangeError(error: StructuredError): boolean {
  const exchangeCodes: string[] = [
    'IMPORT_VALIDATION_FAILED',
    'IMPORT_CONFLICT',
    'IMPORT_LINKAGE_ERROR',
    'IMPORT_UNSUPPORTED_FORMAT',
    'IMPORT_STALE_SOURCE',
    'EXPORT_FAILED',
    'EXCHANGE_PERMISSION_DENIED',
  ];
  return error.textCode !== null && exchangeCodes.includes(error.textCode);
}

/**
 * Extract exchange error info from a structured error.
 * Returns null if not an exchange error.
 */
export function extractExchangeError(error: StructuredError): ExchangeErrorInfo | null {
  if (!isExchangeError(error)) {
    return null;
  }

  const metadata = error.metadata || {};
  const result: ExchangeErrorInfo = {
    code: error.textCode as ExchangeErrorCode,
    message: error.message,
    resource: typeof metadata.resource === 'string' ? metadata.resource : undefined,
    metadata,
  };

  // Extract import result if present (for IMPORT_VALIDATION_FAILED)
  if (metadata.import_result && typeof metadata.import_result === 'object') {
    const raw = metadata.import_result as Record<string, unknown>;
    result.importResult = parseImportResult(raw);
  }

  return result;
}

/**
 * Parse raw import result from API response.
 */
export function parseImportResult(data: Record<string, unknown>): ExchangeImportResult {
  const result: ExchangeImportResult = {
    summary: {
      processed: 0,
      succeeded: 0,
      failed: 0,
      conflicts: 0,
      skipped: 0,
    },
    results: [],
    truncated: false,
  };

  // Parse summary
  if (data.summary && typeof data.summary === 'object') {
    const summary = data.summary as Record<string, unknown>;
    result.summary = {
      processed: typeof summary.processed === 'number' ? summary.processed : 0,
      succeeded: typeof summary.succeeded === 'number' ? summary.succeeded : 0,
      failed: typeof summary.failed === 'number' ? summary.failed : 0,
      conflicts: typeof summary.conflicts === 'number' ? summary.conflicts : 0,
      skipped: typeof summary.skipped === 'number' ? summary.skipped : 0,
    };
  }

  // Parse row results
  if (Array.isArray(data.results)) {
    result.results = data.results
      .filter((row): row is Record<string, unknown> => row !== null && typeof row === 'object')
      .map((row) => parseRowResult(row));
  }

  // Parse truncation info
  if (typeof data.truncated === 'boolean') {
    result.truncated = data.truncated;
  }
  if (typeof data.total_rows === 'number') {
    result.totalRows = data.total_rows;
  }

  return result;
}

/**
 * Parse a single row result from API response.
 */
function parseRowResult(row: Record<string, unknown>): ExchangeRowResult {
  const result: ExchangeRowResult = {
    index: typeof row.index === 'number' ? row.index : 0,
    resource: typeof row.resource === 'string' ? row.resource : '',
    entityId: typeof row.entity_id === 'string' ? row.entity_id : '',
    translationGroupId: typeof row.translation_group_id === 'string' ? row.translation_group_id : '',
    targetLocale: typeof row.target_locale === 'string' ? row.target_locale : '',
    fieldPath: typeof row.field_path === 'string' ? row.field_path : '',
    status: parseRowStatus(row.status),
  };

  if (typeof row.error === 'string') {
    result.error = row.error;
  }

  if (row.conflict && typeof row.conflict === 'object') {
    const conflict = row.conflict as Record<string, unknown>;
    result.conflict = {
      type: parseConflictType(conflict.type),
      expectedHash: typeof conflict.expected_hash === 'string' ? conflict.expected_hash : undefined,
      actualHash: typeof conflict.actual_hash === 'string' ? conflict.actual_hash : undefined,
      details: typeof conflict.details === 'string' ? conflict.details : undefined,
    };
  }

  return result;
}

/**
 * Parse row status from API response.
 */
function parseRowStatus(value: unknown): ExchangeRowStatus {
  if (value === 'success' || value === 'error' || value === 'conflict' || value === 'skipped') {
    return value;
  }
  return 'error';
}

/**
 * Parse conflict type from API response.
 */
function parseConflictType(value: unknown): ExchangeConflictInfo['type'] {
  if (value === 'stale_source' || value === 'missing_linkage' || value === 'duplicate' || value === 'invalid_locale') {
    return value;
  }
  return 'missing_linkage';
}

/**
 * Group exchange row results by status for UI rendering.
 */
export function groupRowResultsByStatus(results: ExchangeRowResult[]): {
  success: ExchangeRowResult[];
  error: ExchangeRowResult[];
  conflict: ExchangeRowResult[];
  skipped: ExchangeRowResult[];
} {
  return {
    success: results.filter((r) => r.status === 'success'),
    error: results.filter((r) => r.status === 'error'),
    conflict: results.filter((r) => r.status === 'conflict'),
    skipped: results.filter((r) => r.status === 'skipped'),
  };
}

/**
 * Generate a downloadable report from exchange results.
 * Returns a Blob suitable for download.
 */
export function generateExchangeReport(
  result: ExchangeImportResult,
  format: 'json' | 'csv' = 'json'
): Blob {
  if (format === 'json') {
    const content = JSON.stringify(result, null, 2);
    return new Blob([content], { type: 'application/json' });
  }

  // CSV format
  const headers = ['index', 'resource', 'entity_id', 'translation_group_id', 'target_locale', 'field_path', 'status', 'error', 'conflict_type'];
  const rows = result.results.map((row) => [
    String(row.index),
    row.resource,
    row.entityId,
    row.translationGroupId,
    row.targetLocale,
    row.fieldPath,
    row.status,
    row.error || '',
    row.conflict?.type || '',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')),
  ].join('\n');

  return new Blob([csvContent], { type: 'text/csv' });
}
