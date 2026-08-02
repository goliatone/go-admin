/**
 * Translation Bulk Actions (Phase 2)
 *
 * Provides bulk action handlers for translation operations:
 * - Create missing translations
 *
 * Contract:
 * - Uses typed per-item success/failure results from backend
 * - Shows deterministic result summary toast/report
 * - Refreshes affected rows after mutation
 */
import type { ToastNotifier } from '../toast/types.js';
/**
 * Per-item result from bulk create-missing-translations
 */
export interface BulkCreateResult {
    /** Source record ID */
    id: string;
    /** Target locale */
    locale: string;
    /** Whether creation succeeded */
    success: boolean;
    /** Error message if failed */
    error?: string;
    /** Created record ID if succeeded */
    created_id?: string;
}
/**
 * Bulk create-missing-translations response
 */
export interface BulkCreateMissingResponse {
    /** Whether overall operation completed */
    success: boolean;
    /** Per-item results */
    data?: BulkCreateResult[];
    /** Total items processed */
    total?: number;
    /** Count of successful creations */
    created_count?: number;
    /** Count of failed creations */
    failed_count?: number;
    /** Count of items skipped (already exist) */
    skipped_count?: number;
    /** Overall error message if failed */
    error?: string;
    /** Validation errors */
    validation_errors?: Record<string, string>;
}
/**
 * Summary for display
 */
export interface BulkActionSummary {
    /** Total items processed */
    total: number;
    /** Successfully created */
    created: number;
    /** Failed */
    failed: number;
    /** Skipped (already exist) */
    skipped: number;
    /** Failure details (limited) */
    failures: {
        id: string;
        locale: string;
        error: string;
    }[];
}
/**
 * Configuration for bulk create-missing action
 */
export interface BulkCreateMissingConfig {
    /** API endpoint */
    apiEndpoint: string;
    /** Toast notifier */
    notifier?: ToastNotifier;
    /** Callback after successful operation */
    onSuccess?: (summary: BulkActionSummary) => void;
    /** Callback on error */
    onError?: (error: Error) => void;
    /** Max failures to show in summary */
    maxFailuresToShow?: number;
}
/**
 * Execute bulk create-missing-translations action.
 *
 * @param config - Action configuration
 * @param recordIds - IDs of records to create missing translations for
 * @param options - Optional action parameters
 * @returns Summary of the operation
 */
export declare function executeBulkCreateMissing(config: BulkCreateMissingConfig, recordIds: string[], options?: {
    locales?: string[];
}): Promise<BulkActionSummary>;
/**
 * Render detailed result summary HTML for modal or report
 */
export declare function renderBulkResultSummary(summary: BulkActionSummary): string;
/**
 * Render compact inline summary for list view
 */
export declare function renderBulkResultInline(summary: BulkActionSummary): string;
/**
 * Create a bulk action handler for create-missing-translations
 * that can be passed to DataGrid configuration.
 */
export declare function createBulkCreateMissingHandler(apiEndpoint: string, notifier?: ToastNotifier, onComplete?: (summary: BulkActionSummary) => void): (ids: string[]) => Promise<BulkActionSummary>;
//# sourceMappingURL=translation-bulk-actions.d.ts.map