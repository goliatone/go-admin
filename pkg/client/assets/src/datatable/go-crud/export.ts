import type { ExportBehavior, ExportConcurrencyMode } from '../behaviors/types.js';
import type { DataGrid } from '../core.js';

type ExportFormat = 'csv' | 'json' | 'excel' | 'pdf';
type DeliveryMode = 'sync' | 'async' | 'auto';

interface ExportSelection {
  mode: 'all' | 'ids' | 'query';
  ids?: string[];
  query?: {
    name: string;
    params?: Record<string, any>;
  };
}

interface ExportQueryFilter {
  field: string;
  op: string;
  value: any;
}

interface ExportQuerySort {
  field: string;
  desc: boolean;
}

interface ExportQuery {
  filters?: ExportQueryFilter[];
  search?: string;
  sort?: ExportQuerySort[];
  limit?: number;
  offset?: number;
  cursor?: string;
}

interface ExportPayload {
  definition?: string;
  resource?: string;
  source_variant?: string;
  format: string;
  query?: ExportQuery;
  selection?: ExportSelection;
  columns?: string[];
  delivery?: DeliveryMode;
  estimated_rows?: number;
  estimated_bytes?: number;
}

interface ExportAsyncResponse {
  id?: string;
  status_url?: string;
  download_url?: string;
}

interface ExportStatusRecord {
  id?: string;
  state?: string;
}

export interface GoCrudExportConfig {
  endpoint: string;
  definition?: string;
  resource?: string;
  variant?: string;
  sourceVariant?: string;
  delivery?: DeliveryMode;
  /**
   * Formats that should default to async delivery (when delivery is not explicitly set).
   * Defaults to ['pdf'].
   */
  asyncFormats?: ExportFormat[];
  /**
   * Polling interval for async exports (ms).
   */
  statusPollIntervalMs?: number;
  /**
   * Maximum polling duration for async exports (ms). Set to 0 to disable timeout.
   */
  statusPollTimeoutMs?: number;
  selection?: ExportSelection;
  columns?: string[];
  /**
   * Concurrency mode for export operations
   * - 'single': Block all export buttons while any export is in progress (default)
   * - 'per-format': Block only the clicked format's button
   * - 'none': Allow parallel exports (no blocking)
   */
  concurrency?: ExportConcurrencyMode;
}

/**
 * go-export export behavior
 * Uses go-export endpoints with the datagrid request contract
 */
export class GoCrudExportBehavior implements ExportBehavior {
  private config: GoCrudExportConfig;

  constructor(config: GoCrudExportConfig) {
    if (!config || !config.endpoint) {
      throw new Error('export endpoint is required');
    }
    if (!config.definition && !config.resource) {
      throw new Error('export definition or resource is required');
    }
    this.config = config;
  }

  getEndpoint(): string {
    return this.config.endpoint;
  }

  getConcurrency(): ExportConcurrencyMode {
    return this.config.concurrency || 'single';
  }

  async export(format: ExportFormat, grid: DataGrid): Promise<void> {
    if (!grid) {
      throw new Error('datagrid instance is required');
    }

    const payload = buildDatagridExportRequest(grid, this.config, format);
    payload.delivery = resolveDelivery(this.config, format);

    let response: Response;
    try {
      response = await fetch(this.getEndpoint(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json,application/octet-stream'
        },
        body: JSON.stringify(payload)
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Network error during export';
      notify(grid, 'error', message);
      throw err; // Re-throw so core.ts finally block can clear loading state
    }

    if (response.status === 202) {
      const result = (await response.json().catch(() => ({}))) as ExportAsyncResponse;
      notify(grid, 'info', 'Export queued. You can download it when ready.');
      const statusURL = result?.status_url || '';
      if (statusURL) {
        const downloadURL = resolveDownloadURL(result, statusURL);
        try {
          await pollExportStatus(statusURL, {
            intervalMs: resolvePollIntervalMs(this.config),
            timeoutMs: resolvePollTimeoutMs(this.config)
          });
          const downloadResponse = await fetch(downloadURL, {
            headers: {
              'Accept': 'application/octet-stream'
            }
          });
          if (!downloadResponse.ok) {
            const message = await readErrorMessage(downloadResponse);
            notify(grid, 'error', message);
            throw new Error(message);
          }
          await downloadExport(downloadResponse, payload.definition || payload.resource || 'export', payload.format);
          notify(grid, 'success', 'Export ready.');
          return;
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Export failed';
          notify(grid, 'error', message);
          throw err;
        }
      }
      if (result?.download_url) {
        window.open(result.download_url, '_blank');
        return;
      }
      return;
    }

    if (!response.ok) {
      const message = await readErrorMessage(response);
      notify(grid, 'error', message);
      throw new Error(message); // Throw so core.ts finally block can clear loading state
    }

    await downloadExport(response, payload.definition || payload.resource || 'export', payload.format);
    notify(grid, 'success', 'Export ready.');
  }
}

function buildDatagridExportRequest(
  grid: DataGrid,
  config: GoCrudExportConfig,
  format: ExportFormat
): ExportPayload {
  const normalizedFormat = normalizeFormat(format);
  const selection = buildSelection(grid, config);
  const columns = buildVisibleColumns(grid, config);
  const queryParams = buildQueryParams(grid);
  const query = buildQuery(queryParams);

  const payload: ExportPayload = {
    format: normalizedFormat,
    query,
    selection,
    columns,
    delivery: config.delivery || 'auto'
  };

  if (config.definition) {
    payload.definition = config.definition;
  }
  if (config.resource) {
    payload.resource = config.resource;
  }
  const sourceVariant = config.sourceVariant || config.variant;
  if (sourceVariant) {
    payload.source_variant = sourceVariant;
  }

  return payload;
}

function resolveDelivery(config: GoCrudExportConfig, format: ExportFormat): DeliveryMode {
  if (config.delivery) {
    return config.delivery;
  }
  const asyncFormats = config.asyncFormats && config.asyncFormats.length > 0
    ? config.asyncFormats
    : ['pdf'];
  if (asyncFormats.includes(format)) {
    return 'async';
  }
  return 'auto';
}

function resolvePollIntervalMs(config: GoCrudExportConfig): number {
  const value = Number(config.statusPollIntervalMs);
  if (Number.isFinite(value) && value > 0) {
    return value;
  }
  return 2000;
}

function resolvePollTimeoutMs(config: GoCrudExportConfig): number {
  const value = Number(config.statusPollTimeoutMs);
  if (Number.isFinite(value) && value >= 0) {
    return value;
  }
  return 300000;
}

function resolveDownloadURL(result: ExportAsyncResponse, statusURL: string): string {
  if (result?.download_url) {
    return result.download_url;
  }
  const base = statusURL.replace(/\/+$/, '');
  return `${base}/download`;
}

async function pollExportStatus(
  statusURL: string,
  opts: { intervalMs: number; timeoutMs: number }
): Promise<ExportStatusRecord> {
  const started = Date.now();
  const interval = Math.max(250, opts.intervalMs);

  while (true) {
    const response = await fetch(statusURL, {
      headers: {
        'Accept': 'application/json'
      }
    });
    if (!response.ok) {
      const message = await readErrorMessage(response);
      throw new Error(message);
    }
    const record = (await response.json().catch(() => ({}))) as ExportStatusRecord;
    const state = String(record?.state || '').toLowerCase();
    if (state === 'completed') {
      return record;
    }
    if (state === 'failed') {
      throw new Error('Export failed');
    }
    if (state === 'canceled') {
      throw new Error('Export canceled');
    }
    if (state === 'deleted') {
      throw new Error('Export deleted');
    }
    if (opts.timeoutMs > 0 && Date.now() - started > opts.timeoutMs) {
      throw new Error('Export status timed out');
    }
    await sleep(interval);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildSelection(grid: DataGrid, config: GoCrudExportConfig): ExportSelection {
  if (config.selection?.mode) {
    return config.selection;
  }
  const selected = Array.from(grid.state.selectedRows || []);
  const mode = selected.length > 0 ? 'ids' : 'all';
  return {
    mode,
    ids: mode === 'ids' ? selected : []
  };
}

function buildVisibleColumns(grid: DataGrid, config: GoCrudExportConfig): string[] {
  if (Array.isArray(config.columns) && config.columns.length > 0) {
    return config.columns.slice();
  }
  const hidden = grid.state?.hiddenColumns ? new Set(grid.state.hiddenColumns) : new Set<string>();
  const order = Array.isArray(grid.state?.columnOrder) && grid.state.columnOrder.length > 0
    ? grid.state.columnOrder
    : grid.config.columns.map((col) => col.field);
  return order.filter((field) => !hidden.has(field));
}

function buildQueryParams(grid: DataGrid): Record<string, any> {
  const params: Record<string, any> = {};
  const behaviors = grid.config.behaviors || {};

  if (behaviors.pagination) {
    Object.assign(params, behaviors.pagination.buildQuery(grid.state.currentPage, grid.state.perPage));
  }
  if (grid.state.search && behaviors.search) {
    Object.assign(params, behaviors.search.buildQuery(grid.state.search));
  }
  if (grid.state.filters.length > 0 && behaviors.filter) {
    Object.assign(params, behaviors.filter.buildFilters(grid.state.filters));
  }
  if (grid.state.sort.length > 0 && behaviors.sort) {
    Object.assign(params, behaviors.sort.buildQuery(grid.state.sort));
  }

  return params;
}

function buildQuery(params: Record<string, any>): ExportQuery {
  const query: ExportQuery = {};
  const filters: ExportQueryFilter[] = [];

  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') {
      return;
    }
    switch (key) {
      case 'limit':
        query.limit = toNumber(value);
        return;
      case 'offset':
        query.offset = toNumber(value);
        return;
      case 'order':
      case 'sort':
        query.sort = parseSort(String(value));
        return;
      case 'q':
      case 'search':
        query.search = String(value);
        return;
      default:
        break;
    }

    const { field, op } = splitFilterKey(key);
    if (!field) {
      return;
    }
    filters.push({ field, op, value });
  });

  if (filters.length > 0) {
    query.filters = filters;
  }

  return query;
}

function splitFilterKey(key: string): { field: string; op: string } {
  const parts = key.split('__');
  const field = parts[0]?.trim() || '';
  const op = parts[1]?.trim() || 'eq';
  return { field, op };
}

function parseSort(raw: string): ExportQuerySort[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const parts = chunk.split(/\s+/);
      const field = parts[0] || '';
      const direction = parts[1] || 'asc';
      return { field, desc: direction.toLowerCase() === 'desc' };
    })
    .filter((item) => item.field);
}

function normalizeFormat(format: ExportFormat): string {
  const value = String(format || '').trim().toLowerCase();
  if (value === 'excel' || value === 'xls') {
    return 'xlsx';
  }
  return value || 'csv';
}

function toNumber(value: any): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function downloadExport(response: Response, definition: string, format: string): Promise<void> {
  const blob = await response.blob();
  const filename = resolveFilename(response, definition, format);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function resolveFilename(response: Response, definition: string, format: string): string {
  const header = response.headers.get('content-disposition') || '';
  const fallback = `${definition}.${format}`;
  const filename = parseFilename(header);
  return filename || fallback;
}

function parseFilename(header: string): string | null {
  if (!header) return null;
  const utfMatch = header.match(/filename\*=(?:UTF-8'')?([^;]+)/i);
  if (utfMatch && utfMatch[1]) {
    return decodeURIComponent(utfMatch[1].replace(/"/g, '').trim());
  }
  const match = header.match(/filename="?([^";]+)"?/i);
  if (match && match[1]) {
    return match[1].trim();
  }
  return null;
}

async function readErrorMessage(response: Response): Promise<string> {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const payload = await response.json().catch(() => ({}));
    if (payload?.error?.message) {
      return payload.error.message;
    }
    if (payload?.message) {
      return payload.message;
    }
  }
  const text = await response.text().catch(() => '');
  if (text) {
    return text;
  }
  return `Export failed (${response.status})`;
}

function notify(grid: DataGrid, type: 'info' | 'success' | 'error', message: string): void {
  const notifier = grid.config.notifier as any;
  if (notifier && typeof notifier[type] === 'function') {
    notifier[type](message);
    return;
  }
  const toast = (window as any).toastManager;
  if (toast && typeof toast[type] === 'function') {
    toast[type](message);
    return;
  }
  if (type === 'error') {
    alert(message);
  }
}
