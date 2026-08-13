import type { ImportReportData } from '../components/import-modal';

export interface UsersImportSummary {
  processed?: unknown;
  succeeded?: unknown;
  failed?: unknown;
}

export interface UsersImportResult {
  index?: unknown;
  email?: unknown;
  user_id?: unknown;
  status?: unknown;
  error?: unknown;
}

export interface UsersImportPayload {
  error?: unknown;
  summary?: UsersImportSummary;
  results?: unknown;
}

export interface UsersImportTransportResult {
  response: Pick<Response, 'ok' | 'status'>;
  payload: UsersImportPayload;
}

const count = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
};

const text = (value: unknown): string => value === null || value === undefined ? '' : String(value);

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

const isResultRow = (value: unknown): value is UsersImportResult => {
  if (!isRecord(value)) return false;
  return text(value.status).trim().length > 0 || text(value.error).trim().length > 0;
};

const hasStructuredPayload = (
  payload: UsersImportPayload,
): payload is UsersImportPayload & { summary: UsersImportSummary; results: UsersImportResult[] } => (
  isRecord(payload?.summary)
  && Array.isArray(payload?.results)
  && payload.results.every(isResultRow)
);

const failureMessage = (payload: UsersImportPayload): string => {
  const message = text(payload?.error).trim();
  return message ? message.slice(0, 512) : 'Import failed';
};

/**
 * Users intentionally reports row validation through HTTP 422. Other non-2xx
 * responses are request failures and must not be promoted to completed runs.
 */
export function isReportableUsersImportResult(result: UsersImportTransportResult): boolean {
  if (!hasStructuredPayload(result.payload)) return false;
  if (result.response.ok) return true;
  return result.response.status === 422
    && result.payload.results.length > 0;
}

export function adaptUsersImportReport(payload: UsersImportPayload): ImportReportData {
  const summary = payload?.summary || {};
  const results = Array.isArray(payload?.results) ? payload.results as UsersImportResult[] : [];
  const rows = results.map((item, index) => {
    const error = text(item?.error).trim();
    const failed = error.length > 0;
    const itemIndex = Number(item?.index);
    return {
      reference: String(Number.isFinite(itemIndex) ? itemIndex + 1 : index + 1),
      outcome: failed ? 'failed' : 'succeeded',
      action: failed ? 'rejected' : text(item?.status).trim() || 'imported',
      message: failed ? error : '',
      metadata: {
        email: text(item?.email),
        user_id: text(item?.user_id),
      },
    };
  });
  const processed = Math.max(count(summary.processed), rows.length);
  const rowFailed = rows.filter((row) => row.outcome === 'failed').length;
  const rowSucceeded = rows.length - rowFailed;
  const failed = Math.max(count(summary.failed), rowFailed);
  const succeeded = Math.max(count(summary.succeeded), rowSucceeded);
  return {
    phase: 'complete',
    mode: 'users-create',
    metrics: [
      { key: 'processed', label: 'Processed', value: processed },
      { key: 'succeeded', label: 'Succeeded', value: succeeded, tone: 'success', filter: { key: 'succeeded', label: 'Succeeded', outcome: 'succeeded' } },
      { key: 'failed', label: 'Failed', value: failed, tone: 'danger', filter: { key: 'failed', label: 'Failed', outcome: 'failed' } },
    ],
    rows,
    bounds: { returnedRows: rows.length, totalRows: processed, truncated: false },
    partial: failed > 0,
  };
}

export function adaptUsersImportResult(result: UsersImportTransportResult): ImportReportData {
  if (!isReportableUsersImportResult(result)) throw new Error(failureMessage(result.payload));
  return adaptUsersImportReport(result.payload);
}
