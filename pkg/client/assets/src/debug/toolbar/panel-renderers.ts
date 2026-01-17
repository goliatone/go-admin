// Panel renderers for the debug toolbar
// Each function returns HTML string for a specific panel type

import { highlightSQL, formatSQL, highlightJSON } from '../syntax-highlight.js';

export type RequestEntry = {
  id?: string;
  timestamp?: string;
  method?: string;
  path?: string;
  status?: number;
  duration?: number;
  headers?: Record<string, string>;
  query?: Record<string, string>;
  error?: string;
};

export type SQLEntry = {
  id?: string;
  timestamp?: string;
  query?: string;
  args?: unknown[];
  duration?: number;
  row_count?: number;
  error?: string;
};

export type LogEntry = {
  timestamp?: string;
  level?: string;
  message?: string;
  fields?: Record<string, unknown>;
  source?: string;
};

export type RouteEntry = {
  method?: string;
  path?: string;
  name?: string;
  handler?: string;
  middleware?: string[];
  summary?: string;
  tags?: string[];
};

export type CustomLogEntry = {
  timestamp?: string;
  category?: string;
  message?: string;
  fields?: Record<string, unknown>;
};

export type CustomSnapshot = {
  data?: Record<string, unknown>;
  logs?: CustomLogEntry[];
};

export type DebugSnapshot = {
  template?: Record<string, unknown>;
  session?: Record<string, unknown>;
  requests?: RequestEntry[];
  sql?: SQLEntry[];
  logs?: LogEntry[];
  config?: Record<string, unknown>;
  routes?: RouteEntry[];
  custom?: CustomSnapshot;
};

// Utility functions
const escapeHTML = (value: unknown): string => {
  const str = String(value ?? '');
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

const formatTimestamp = (value: unknown): string => {
  if (!value) return '';
  if (typeof value === 'number') {
    return new Date(value).toLocaleTimeString();
  }
  if (typeof value === 'string') {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleTimeString();
    }
    return value;
  }
  return '';
};

const formatDuration = (value: unknown, slowThresholdMs = 50): { text: string; isSlow: boolean } => {
  if (value === null || value === undefined) {
    return { text: '0ms', isSlow: false };
  }
  const nanos = Number(value);
  if (Number.isNaN(nanos)) {
    return { text: '0ms', isSlow: false };
  }
  const ms = nanos / 1e6;
  const isSlow = ms >= slowThresholdMs;
  if (ms < 1) {
    const micros = nanos / 1e3;
    return { text: `${micros.toFixed(1)}µs`, isSlow };
  }
  if (ms < 1000) {
    return { text: `${ms.toFixed(2)}ms`, isSlow };
  }
  return { text: `${(ms / 1000).toFixed(2)}s`, isSlow };
};

const formatJSON = (value: unknown): string => {
  if (value === undefined || value === null) return '{}';
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value ?? '');
  }
};

const truncate = (str: string, len: number): string => {
  if (!str) return '';
  return str.length > len ? str.substring(0, len) + '...' : str;
};

const getStatusClass = (status: number | undefined): string => {
  if (!status) return '';
  if (status >= 500) return 'error';
  if (status >= 400) return 'warn';
  return '';
};

const getLevelClass = (level: string | undefined): string => {
  if (!level) return 'info';
  const l = level.toLowerCase();
  if (l === 'error' || l === 'fatal') return 'error';
  if (l === 'warn' || l === 'warning') return 'warn';
  if (l === 'debug' || l === 'trace') return 'debug';
  return 'info';
};

// Panel render functions
export function renderPanel(
  panel: string,
  snapshot: DebugSnapshot,
  slowThresholdMs = 50
): string {
  switch (panel) {
    case 'requests':
      return renderRequests(snapshot.requests || []);
    case 'sql':
      return renderSQL(snapshot.sql || [], slowThresholdMs);
    case 'logs':
      return renderLogs(snapshot.logs || []);
    case 'config':
      return renderJSON('Config', snapshot.config || {});
    case 'routes':
      return renderRoutes(snapshot.routes || []);
    case 'template':
      return renderJSON('Template Context', snapshot.template || {});
    case 'session':
      return renderJSON('Session', snapshot.session || {});
    case 'custom':
      return renderCustom(snapshot.custom || {});
    default:
      return `<div class="empty-state">Panel "${escapeHTML(panel)}" not available</div>`;
  }
}

function renderRequests(requests: RequestEntry[]): string {
  if (!requests.length) {
    return '<div class="empty-state">No requests captured</div>';
  }

  const rows = requests
    .slice(-50)
    .reverse()
    .map((req) => {
      const methodClass = (req.method || 'get').toLowerCase();
      const statusClass = getStatusClass(req.status);
      const duration = formatDuration(req.duration);
      return `
        <tr>
          <td><span class="badge badge-method ${methodClass}">${escapeHTML(req.method || 'GET')}</span></td>
          <td class="path" title="${escapeHTML(req.path || '')}">${escapeHTML(truncate(req.path || '', 50))}</td>
          <td><span class="badge badge-status ${statusClass}">${escapeHTML(req.status || '-')}</span></td>
          <td class="duration ${duration.isSlow ? 'slow' : ''}">${duration.text}</td>
          <td class="timestamp">${escapeHTML(formatTimestamp(req.timestamp))}</td>
        </tr>
      `;
    })
    .join('');

  return `
    <table>
      <thead>
        <tr>
          <th>Method</th>
          <th>Path</th>
          <th>Status</th>
          <th>Duration</th>
          <th>Time</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderSQL(queries: SQLEntry[], slowThresholdMs: number): string {
  if (!queries.length) {
    return '<div class="empty-state">No SQL queries captured</div>';
  }

  const rows = queries
    .slice(-50)
    .reverse()
    .map((q, index) => {
      const duration = formatDuration(q.duration, slowThresholdMs);
      const rowClasses = ['expandable-row'];
      if (duration.isSlow) rowClasses.push('slow-query');
      if (q.error) rowClasses.push('error-query');
      const rowId = `sql-row-${index}`;
      const rawQuery = q.query || '';
      const highlightedSQL = highlightSQL(rawQuery, true);
      return `
        <tr class="${rowClasses.join(' ')}" data-row-id="${rowId}">
          <td class="duration ${duration.isSlow ? 'slow' : ''}">${duration.text}</td>
          <td>${escapeHTML(q.row_count ?? '-')}</td>
          <td class="timestamp">${escapeHTML(formatTimestamp(q.timestamp))}</td>
          <td>${q.error ? '<span class="badge badge-error">Error</span>' : ''}</td>
          <td class="query-text"><span class="expand-icon">&#9654;</span>${escapeHTML(rawQuery)}</td>
        </tr>
        <tr class="expansion-row" data-expansion-for="${rowId}">
          <td colspan="5">
            <div class="expanded-content" data-copy-content="${escapeHTML(rawQuery)}">
              <div class="expanded-content__header">
                <button class="copy-btn" data-copy-trigger title="Copy SQL">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                  Copy
                </button>
              </div>
              <pre>${highlightedSQL}</pre>
            </div>
          </td>
        </tr>
      `;
    })
    .join('');

  return `
    <table>
      <thead>
        <tr>
          <th>Duration</th>
          <th>Rows</th>
          <th>Time</th>
          <th>Status</th>
          <th>Query</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderLogs(logs: LogEntry[]): string {
  if (!logs.length) {
    return '<div class="empty-state">No logs captured</div>';
  }

  const rows = logs
    .slice(-100)
    .reverse()
    .map((log) => {
      const levelClass = getLevelClass(log.level);
      return `
        <tr>
          <td><span class="badge badge-level ${levelClass}">${escapeHTML((log.level || 'INFO').toUpperCase())}</span></td>
          <td class="message" title="${escapeHTML(log.message || '')}">${escapeHTML(truncate(log.message || '', 100))}</td>
          <td class="timestamp">${escapeHTML(formatTimestamp(log.timestamp))}</td>
        </tr>
      `;
    })
    .join('');

  return `
    <table>
      <thead>
        <tr>
          <th>Level</th>
          <th>Message</th>
          <th>Time</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderRoutes(routes: RouteEntry[]): string {
  if (!routes.length) {
    return '<div class="empty-state">No routes available</div>';
  }

  const rows = routes
    .map((r) => {
      const methodClass = (r.method || 'get').toLowerCase();
      return `
        <tr>
          <td><span class="badge badge-method ${methodClass}">${escapeHTML(r.method || '')}</span></td>
          <td class="path">${escapeHTML(r.path || '')}</td>
          <td>${escapeHTML(r.handler || '-')}</td>
        </tr>
      `;
    })
    .join('');

  return `
    <table>
      <thead>
        <tr>
          <th>Method</th>
          <th>Path</th>
          <th>Handler</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderJSON(title: string, data: Record<string, unknown>): string {
  const keys = Object.keys(data || {});
  if (!keys.length) {
    return `<div class="empty-state">No ${title.toLowerCase()} data available</div>`;
  }

  const rawJSON = formatJSON(data);
  const highlighted = highlightJSON(data, true);
  return `
    <div class="json-viewer" data-copy-content="${escapeHTML(rawJSON)}">
      <div class="json-viewer__header">
        <span class="json-viewer__title">${escapeHTML(title)}</span>
        <button class="copy-btn" data-copy-trigger title="Copy JSON">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
          Copy
        </button>
      </div>
      <pre>${highlighted}</pre>
    </div>
  `;
}

function renderCustom(custom: CustomSnapshot): string {
  const data = custom.data || {};
  const logs = custom.logs || [];

  if (!Object.keys(data).length && !logs.length) {
    return '<div class="empty-state">No custom data captured</div>';
  }

  let content = '';

  if (Object.keys(data).length) {
    const rawJSON = formatJSON(data);
    const highlighted = highlightJSON(data, true);
    content += `
      <div class="json-viewer" data-copy-content="${escapeHTML(rawJSON)}">
        <div class="json-viewer__header">
          <span class="json-viewer__title">Custom Data</span>
          <button class="copy-btn" data-copy-trigger title="Copy JSON">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            Copy
          </button>
        </div>
        <pre>${highlighted}</pre>
      </div>
    `;
  }

  if (logs.length) {
    const logRows = logs
      .slice(-50)
      .reverse()
      .map((log) => `
        <tr>
          <td><span class="badge">${escapeHTML(log.category || 'custom')}</span></td>
          <td class="message">${escapeHTML(log.message || '')}</td>
          <td class="timestamp">${escapeHTML(formatTimestamp(log.timestamp))}</td>
        </tr>
      `)
      .join('');

    content += `
      <table>
        <thead>
          <tr>
            <th>Category</th>
            <th>Message</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>${logRows}</tbody>
      </table>
    `;
  }

  return content;
}

// Get counts for summary display
export function getCounts(snapshot: DebugSnapshot): {
  requests: number;
  sql: number;
  logs: number;
  errors: number;
  slowQueries: number;
} {
  const requests = snapshot.requests?.length || 0;
  const sql = snapshot.sql?.length || 0;
  const logs = snapshot.logs?.length || 0;

  // Count errors
  const requestErrors = (snapshot.requests || []).filter((r) => (r.status || 0) >= 400).length;
  const sqlErrors = (snapshot.sql || []).filter((q) => q.error).length;
  const logErrors = (snapshot.logs || []).filter((l) => {
    const level = (l.level || '').toLowerCase();
    return level === 'error' || level === 'fatal';
  }).length;

  // Count slow queries (using default 50ms threshold)
  const slowQueries = (snapshot.sql || []).filter((q) => {
    const nanos = Number(q.duration);
    if (Number.isNaN(nanos)) return false;
    return nanos / 1e6 >= 50;
  }).length;

  return {
    requests,
    sql,
    logs,
    errors: requestErrors + sqlErrors + logErrors,
    slowQueries,
  };
}
