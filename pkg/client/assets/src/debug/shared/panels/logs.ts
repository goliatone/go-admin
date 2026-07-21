// Shared logs panel renderer
// Used by both the full debug console and the debug toolbar

import type { LogEntry, PanelOptions } from '../types.js';
import type { StyleConfig } from '../styles.js';
import { escapeHTML, formatTimestamp, getLevelClass, truncate } from '../utils.js';
import { escapeAttribute } from '../../../shared/html.js';
import { hashString } from './live-list-view.js';

const ERROR_FIELD_ORDER = [
  'error',
  'root_error',
  'text_code',
  'code',
  'status_code',
  'category',
  'retryable',
  'causes',
  'cause',
];
const DIAGNOSTIC_FIELD_ORDER = ['health', 'diagnostics', 'readiness'];
const STACK_KEYS = new Set(['stack', 'stack_trace']);

/** Stable server identity with a deterministic fallback for legacy payloads. */
export function logRowKey(entry: LogEntry): string {
  if (entry.id) return entry.id;
  return `log-${hashString(`${entry.timestamp || ''}|${entry.level || ''}|${entry.source || ''}|${entry.message || ''}`)}`;
}

/** Searchable representation including nested structured and correlation data. */
export function logSearchText(entry: LogEntry): string {
  return serializeLogEntry(entry).toLowerCase();
}

/** Deterministic JSON used by both search and Copy JSON. */
export function serializeLogEntry(entry: LogEntry): string {
  try {
    return JSON.stringify(sortJSONValue(entry), null, 2);
  } catch {
    return JSON.stringify({
      timestamp: entry.timestamp,
      level: entry.level,
      message: entry.message,
      source: entry.source,
    }, null, 2);
  }
}

function sortJSONValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJSONValue);
  if (!value || typeof value !== 'object') return value;
  const record = value as Record<string, unknown>;
  return Object.keys(record).sort().reduce<Record<string, unknown>>((out, key) => {
    out[key] = sortJSONValue(record[key]);
    return out;
  }, {});
}

/** Options for rendering the logs panel. */
export type LogsPanelOptions = PanelOptions & {
  maxEntries?: number;
  showSortToggle?: boolean;
  showSource?: boolean;
  truncateMessage?: boolean;
  maxMessageLength?: number;
  /** Rich adjacent detail rows. Off by default so toolbar output remains compact. */
  expandable?: boolean;
};

function renderSortToggle(panelId: string, newestFirst: boolean, styles: StyleConfig): string {
  return `
    <div class="${styles.panelControls}">
      <label class="${styles.sortToggle}">
        <input type="checkbox" data-sort-toggle="${panelId}" ${newestFirst ? 'checked' : ''}>
        <span>Newest first</span>
      </label>
    </div>
  `;
}

function readableLabel(key: string): string {
  return key.replace(/[_-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function renderValue(value: unknown): string {
  if (value !== null && typeof value === 'object') {
    return `<pre>${escapeHTML(JSON.stringify(sortJSONValue(value), null, 2))}</pre>`;
  }
  return `<span>${escapeHTML(value == null ? String(value) : String(value))}</span>`;
}

function renderDetailSection(
  title: string,
  entries: Array<[string, unknown]>,
  styles: StyleConfig
): string {
  if (entries.length === 0) return '';
  return `
    <section class="debug-log-detail-section">
      <h4>${escapeHTML(title)}</h4>
      <dl class="${styles.detailKeyValueTable}">
        ${entries.map(([key, value]) => `
          <dt>${escapeHTML(readableLabel(key))}</dt>
          <dd>${renderValue(value)}</dd>
        `).join('')}
      </dl>
    </section>
  `;
}

function callerValue(entry: LogEntry): string {
  const caller = entry.caller;
  if (!caller) return entry.source || '';
  const location = caller.file ? `${caller.file}${caller.line ? `:${caller.line}` : ''}` : '';
  return [caller.function, location].filter(Boolean).join(' — ') || entry.source || '';
}

function summarySource(entry: LogEntry): string {
  if (entry.source) return entry.source;
  if (entry.caller?.file) return `${entry.caller.file}${entry.caller.line ? `:${entry.caller.line}` : ''}`;
  return entry.caller?.function || entry.logger || '';
}

function fieldEntries(entry: LogEntry): {
  errors: Array<[string, unknown]>;
  diagnostics: Array<[string, unknown]>;
  remaining: Array<[string, unknown]>;
  stack: string;
} {
  const fields = entry.fields || {};
  const used = new Set<string>();
  const take = (order: string[]): Array<[string, unknown]> => order.flatMap((key) => {
    if (!(key in fields)) return [];
    used.add(key);
    return [[key, fields[key]] as [string, unknown]];
  });
  let stack = '';
  for (const key of STACK_KEYS) {
    if (!(key in fields)) continue;
    used.add(key);
    const value = fields[key];
    stack = typeof value === 'string' ? value : (JSON.stringify(sortJSONValue(value), null, 2) || '');
    if (stack) break;
  }
  const errors = take(ERROR_FIELD_ORDER);
  const diagnostics = take(DIAGNOSTIC_FIELD_ORDER);
  const remaining = Object.keys(fields)
    .filter((key) => !used.has(key))
    .sort((a, b) => a.localeCompare(b))
    .map((key) => [key, fields[key]] as [string, unknown]);
  return {
    errors,
    diagnostics,
    remaining,
    stack,
  };
}

function renderLogDetails(entry: LogEntry, styles: StyleConfig, detailID: string, columnCount: number): string {
  const fields = fieldEntries(entry);
  const contextCandidates: Array<[string, unknown]> = [
    ['logger', entry.logger],
    ['caller', callerValue(entry)],
    ['request_id', entry.request_id],
    ['trace_id', entry.trace_id],
    ['span_id', entry.span_id],
    ['session_id', entry.session_id],
    ['user_id', entry.user_id],
  ];
  const context = contextCandidates.filter(([, value]) => value !== undefined && value !== null && value !== '');
  const eventJSON = serializeLogEntry(entry);
  const stackAction = fields.stack
    ? `<div data-copy-content="${escapeAttribute(fields.stack)}"><button type="button" class="${styles.copyBtnSm}" data-copy-trigger title="Copy stack trace">Copy stack</button></div>`
    : '';

  return `
    <tr class="${styles.expansionRow}" aria-hidden="true">
      <td colspan="${columnCount}">
        <div id="${escapeAttribute(detailID)}" class="${styles.expandedContent} debug-log-details">
          <div class="${styles.expandedContentHeader} debug-log-detail-actions">
            ${stackAction}
            <div data-copy-content="${escapeAttribute(eventJSON)}">
              <button type="button" class="${styles.copyBtnSm}" data-copy-trigger title="Copy normalized log event as JSON">Copy JSON</button>
            </div>
          </div>
          ${renderDetailSection('Error', fields.errors, styles)}
          ${renderDetailSection('Diagnostics', fields.diagnostics, styles)}
          ${renderDetailSection('Context', context, styles)}
          ${renderDetailSection('Fields', fields.remaining, styles)}
          ${fields.stack ? `
            <section class="debug-log-detail-section debug-log-stack">
              <h4>Stack</h4>
              <pre>${escapeHTML(fields.stack)}</pre>
            </section>
          ` : ''}
        </div>
      </td>
    </tr>
  `;
}

/** Render one compact summary and, when opted in, its adjacent detail row. */
export function renderLogRow(
  entry: LogEntry,
  styles: StyleConfig,
  options: LogsPanelOptions
): string {
  const rawLevel = entry.level || 'INFO';
  const level = String(rawLevel).toUpperCase();
  const levelClassName = getLevelClass(String(rawLevel));
  const message = entry.message || '';
  const source = summarySource(entry);
  const key = logRowKey(entry);
  const detailID = `log-details-${hashString(key)}`;
  const expandable = options.expandable === true;
  const columnCount = options.showSource ? 4 : 3;

  const levelClass = styles.badgeLevel(levelClassName);
  const rowClasses = [levelClassName === 'error' ? styles.rowError : ''];
  if (expandable) rowClasses.push(styles.expandableRow);
  const displayMessage = options.truncateMessage
    ? truncate(message, options.maxMessageLength || 100)
    : message;
  const sourceColumn = options.showSource
    ? `<td class="${styles.timestamp}" title="${escapeAttribute(callerValue(entry) || source)}">${escapeHTML(source)}</td>`
    : '';
  const expandIcon = expandable ? `<span class="${styles.expandIcon}" aria-hidden="true">&#9654;</span>` : '';
  const accessibility = expandable
    ? ` tabindex="0" role="button" aria-expanded="false" aria-controls="${escapeAttribute(detailID)}" aria-label="Show details for ${escapeAttribute(message || 'log entry')}"`
    : '';

  return `
    <tr class="${rowClasses.filter(Boolean).join(' ')}" data-row-key="${escapeAttribute(key)}"${accessibility}>
      <td>${expandIcon}<span class="${levelClass}">${escapeHTML(level)}</span></td>
      <td class="${styles.timestamp}">${escapeHTML(formatTimestamp(entry.timestamp))}</td>
      <td class="${styles.message}" title="${escapeAttribute(message)}">${escapeHTML(displayMessage)}</td>
      ${sourceColumn}
    </tr>
    ${expandable ? renderLogDetails(entry, styles, detailID, columnCount) : ''}
  `;
}

/** Render the logs table; rich details are explicitly opt-in. */
export function renderLogsPanel(
  logs: LogEntry[],
  styles: StyleConfig,
  options: LogsPanelOptions = {}
): string {
  const {
    newestFirst = true,
    maxEntries = 100,
    showSortToggle = false,
    showSource = false,
    truncateMessage = true,
    maxMessageLength = 100,
  } = options;
  const sortToggle = showSortToggle ? renderSortToggle('logs', newestFirst, styles) : '';
  if (!logs.length) return sortToggle + `<div class="${styles.emptyState}">No logs captured</div>`;

  let items = maxEntries ? logs.slice(-maxEntries) : logs;
  if (newestFirst) items = [...items].reverse();
  const rows = items.map((entry) => renderLogRow(entry, styles, {
    ...options,
    showSource,
    truncateMessage,
    maxMessageLength,
  })).join('');

  return `
    ${sortToggle}
    <table class="${styles.table}">
      <thead>
        <tr>
          <th>Level</th>
          <th>Time</th>
          <th>Message</th>
          ${showSource ? '<th>Caller / Source</th>' : ''}
        </tr>
      </thead>
      <tbody data-live-list>${rows}</tbody>
    </table>
  `;
}
