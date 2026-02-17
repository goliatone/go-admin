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
import { FallbackNotifier } from '../toast/toast-manager.js';

// ============================================================================
// Types
// ============================================================================

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
  failures: { id: string; locale: string; error: string }[];
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

// ============================================================================
// Bulk Create Missing Translations Handler
// ============================================================================

/**
 * Execute bulk create-missing-translations action.
 *
 * @param config - Action configuration
 * @param recordIds - IDs of records to create missing translations for
 * @param options - Optional action parameters
 * @returns Summary of the operation
 */
export async function executeBulkCreateMissing(
  config: BulkCreateMissingConfig,
  recordIds: string[],
  options: { locales?: string[] } = {}
): Promise<BulkActionSummary> {
  const { apiEndpoint, notifier = new FallbackNotifier(), maxFailuresToShow = 5 } = config;

  const endpoint = `${apiEndpoint}/bulk/create-missing-translations`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        ids: recordIds,
        locales: options.locales,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      let errorMessage = `Request failed: ${response.status}`;

      try {
        const errorJson = JSON.parse(errorBody);
        errorMessage = errorJson.error || errorJson.message || errorMessage;
      } catch {
        // Use text error
        if (errorBody) {
          errorMessage = errorBody;
        }
      }

      throw new Error(errorMessage);
    }

    const data: BulkCreateMissingResponse = await response.json();

    // Parse response into summary
    const summary = parseBulkResponse(data, maxFailuresToShow);

    // Show result toast
    showResultToast(summary, notifier);

    // Call success callback
    if (config.onSuccess) {
      config.onSuccess(summary);
    }

    return summary;
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));

    notifier.error(`Failed to create translations: ${err.message}`);

    if (config.onError) {
      config.onError(err);
    }

    throw err;
  }
}

/**
 * Parse bulk response into summary
 */
function parseBulkResponse(
  response: BulkCreateMissingResponse,
  maxFailures: number
): BulkActionSummary {
  const results = response.data || [];

  const created = response.created_count ?? results.filter((r) => r.success).length;
  const failed = response.failed_count ?? results.filter((r) => !r.success).length;
  const skipped = response.skipped_count ?? 0;
  const total = response.total ?? results.length;

  // Collect failure details (limited)
  const failures = results
    .filter((r) => !r.success && r.error)
    .slice(0, maxFailures)
    .map((r) => ({
      id: r.id,
      locale: r.locale,
      error: r.error || 'Unknown error',
    }));

  return {
    total,
    created,
    failed,
    skipped,
    failures,
  };
}

/**
 * Show result toast based on summary
 */
function showResultToast(summary: BulkActionSummary, notifier: ToastNotifier): void {
  const { created, failed, skipped, total } = summary;

  if (total === 0) {
    notifier.info('No translations to create');
    return;
  }

  if (failed === 0) {
    // All successful
    if (created > 0) {
      notifier.success(`Created ${created} translation${created !== 1 ? 's' : ''}${skipped > 0 ? ` (${skipped} skipped)` : ''}`);
    } else if (skipped > 0) {
      notifier.info(`All ${skipped} translation${skipped !== 1 ? 's' : ''} already exist`);
    }
  } else if (created === 0) {
    // All failed
    notifier.error(`Failed to create ${failed} translation${failed !== 1 ? 's' : ''}`);
  } else {
    // Partial success
    notifier.warning(
      `Created ${created}, failed ${failed}${skipped > 0 ? `, skipped ${skipped}` : ''}`
    );
  }
}

// ============================================================================
// Result Summary Rendering
// ============================================================================

/**
 * Render detailed result summary HTML for modal or report
 */
export function renderBulkResultSummary(summary: BulkActionSummary): string {
  const { created, failed, skipped, total, failures } = summary;

  // Overall stats
  const statsHtml = `
    <div class="grid grid-cols-3 gap-4 mb-4">
      <div class="text-center p-3 bg-green-50 rounded">
        <div class="text-2xl font-bold text-green-700">${created}</div>
        <div class="text-sm text-green-600">Created</div>
      </div>
      <div class="text-center p-3 ${failed > 0 ? 'bg-red-50' : 'bg-gray-50'} rounded">
        <div class="text-2xl font-bold ${failed > 0 ? 'text-red-700' : 'text-gray-400'}">${failed}</div>
        <div class="text-sm ${failed > 0 ? 'text-red-600' : 'text-gray-500'}">Failed</div>
      </div>
      <div class="text-center p-3 ${skipped > 0 ? 'bg-yellow-50' : 'bg-gray-50'} rounded">
        <div class="text-2xl font-bold ${skipped > 0 ? 'text-yellow-700' : 'text-gray-400'}">${skipped}</div>
        <div class="text-sm ${skipped > 0 ? 'text-yellow-600' : 'text-gray-500'}">Skipped</div>
      </div>
    </div>
  `;

  // Failure details
  let failuresHtml = '';
  if (failures.length > 0) {
    const failureRows = failures
      .map(
        (f) => `
        <tr>
          <td class="px-3 py-2 text-sm text-gray-700">${escapeHtml(f.id)}</td>
          <td class="px-3 py-2 text-sm text-gray-700">${escapeHtml(f.locale)}</td>
          <td class="px-3 py-2 text-sm text-red-600">${escapeHtml(f.error)}</td>
        </tr>
      `
      )
      .join('');

    failuresHtml = `
      <div class="mt-4">
        <h4 class="text-sm font-medium text-gray-700 mb-2">Failure Details</h4>
        <div class="border rounded overflow-hidden">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Locale</th>
                <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Error</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              ${failureRows}
            </tbody>
          </table>
        </div>
        ${failed > failures.length ? `<p class="mt-2 text-sm text-gray-500">Showing ${failures.length} of ${failed} failures</p>` : ''}
      </div>
    `;
  }

  return `
    <div class="bulk-result-summary">
      <div class="mb-4 text-sm text-gray-600">
        Processed ${total} item${total !== 1 ? 's' : ''}
      </div>
      ${statsHtml}
      ${failuresHtml}
    </div>
  `;
}

/**
 * Render compact inline summary for list view
 */
export function renderBulkResultInline(summary: BulkActionSummary): string {
  const { created, failed, skipped } = summary;

  const parts: string[] = [];

  if (created > 0) {
    parts.push(`<span class="text-green-600">+${created}</span>`);
  }
  if (failed > 0) {
    parts.push(`<span class="text-red-600">${failed} failed</span>`);
  }
  if (skipped > 0) {
    parts.push(`<span class="text-yellow-600">${skipped} skipped</span>`);
  }

  return parts.join(' · ');
}

// ============================================================================
// Action Builder Integration
// ============================================================================

/**
 * Create a bulk action handler for create-missing-translations
 * that can be passed to DataGrid configuration.
 */
export function createBulkCreateMissingHandler(
  apiEndpoint: string,
  notifier?: ToastNotifier,
  onComplete?: (summary: BulkActionSummary) => void
): (ids: string[]) => Promise<BulkActionSummary> {
  return async (ids: string[]) => {
    return executeBulkCreateMissing(
      {
        apiEndpoint,
        notifier,
        onSuccess: onComplete,
      },
      ids
    );
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
