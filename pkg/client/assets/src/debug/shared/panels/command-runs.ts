import type { StyleConfig } from '../styles.js';
import { escapeHTML, formatTimestamp } from '../utils.js';
import { escapeAttribute } from '../../../shared/html.js';

export type CommandRunRow = {
  schema_version?: number;
  event_id?: string;
  run_id?: string;
  revision?: number;
  command_id?: string;
  dispatch_id?: string;
  correlation_id?: string;
  phase?: string;
  occurred_at?: string;
  started_at?: string;
  first_occurred_at?: string;
  updated_at?: string;
  duration_ms?: number;
  mode?: string;
  checkpoint?: string;
  message?: string;
  current?: number;
  total?: number;
  attempt?: number;
  max_attempts?: number;
  failure?: { category?: string; code?: string };
  metadata?: Record<string, unknown>;
};

const terminalPhases = new Set(['succeeded', 'failed', 'canceled', 'rejected']);
const expandedRuns = new Set<string>();
let selectedRun = '';
let requestedRun = '';
let requestedCorrelation = '';
let selectionUnavailable = false;

export const commandRunSelectionEvent = 'debug:command-run-selection';

export type CommandRunNavigationTarget = {
  runID?: string;
  correlationID?: string;
};

function text(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function number(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function navigationValue(value: unknown): string {
  const normalized = text(value);
  return normalized.length <= 512 ? normalized : '';
}

export function parseCommandRunsNavigation(search: string): CommandRunNavigationTarget {
  const params = new URLSearchParams(search || '');
  return {
    runID: navigationValue(params.get('run_id')) || undefined,
    correlationID: navigationValue(params.get('correlation_id')) || undefined,
  };
}

export function commandRunsNavigationHref(currentURL: string, target: CommandRunNavigationTarget): string {
  const base = typeof window !== 'undefined' ? window.location.href : 'http://localhost/';
  const url = new URL(currentURL || base, base);
  const runID = navigationValue(target.runID);
  const correlationID = navigationValue(target.correlationID);
  url.searchParams.set('panel', 'command_runs');
  if (runID) url.searchParams.set('run_id', runID);
  else url.searchParams.delete('run_id');
  if (correlationID && !runID) url.searchParams.set('correlation_id', correlationID);
  else url.searchParams.delete('correlation_id');
  return `${url.pathname}${url.search}${url.hash}`;
}

export function setCommandRunsNavigationTarget(target: CommandRunNavigationTarget): void {
  requestedRun = navigationValue(target.runID);
  requestedCorrelation = navigationValue(target.correlationID);
  selectedRun = requestedRun;
  selectionUnavailable = false;
  if (selectedRun) expandedRuns.add(selectedRun);
}

export function reconcileCommandRunsRows(data: unknown, authoritative = false): string {
  const rows = Array.isArray(data) ? data.filter((row) => row && typeof row === 'object') as CommandRunRow[] : [];
  const match = requestedRun
    ? rows.find((row) => commandRunKey(row) === requestedRun)
    : requestedCorrelation
      ? rows.find((row) => text(row.correlation_id) === requestedCorrelation)
      : undefined;
  if (match) {
    selectedRun = commandRunKey(match);
    expandedRuns.add(selectedRun);
    selectionUnavailable = false;
  } else if (authoritative && (requestedRun || requestedCorrelation)) {
    selectionUnavailable = true;
  }
  return selectedRun;
}

export function commandRunKey(row: unknown): string {
  return row && typeof row === 'object' ? text((row as CommandRunRow).run_id) : '';
}

export function commandRunRevision(row: unknown): number {
  return row && typeof row === 'object' ? number((row as CommandRunRow).revision) : 0;
}

export function commandRunTerminal(row: unknown): boolean {
  return !!row && typeof row === 'object' && terminalPhases.has(text((row as CommandRunRow).phase).toLowerCase());
}

function progress(row: CommandRunRow): string {
  const current = row.current;
  const total = row.total;
  if (typeof current !== 'number' && typeof total !== 'number') return '—';
  if (typeof total === 'number' && total > 0) {
    const percentage = Math.max(0, Math.min(100, Math.round((number(current) / total) * 100)));
    return `${number(current)} / ${total} (${percentage}%)`;
  }
  return String(number(current));
}

function attempt(row: CommandRunRow): string {
  if (!row.attempt && !row.max_attempts) return '—';
  return row.max_attempts ? `${number(row.attempt)} / ${number(row.max_attempts)}` : String(number(row.attempt));
}

function duration(row: CommandRunRow): string {
  if (typeof row.duration_ms !== 'number') return '—';
  if (row.duration_ms < 1000) return `${row.duration_ms} ms`;
  return `${(row.duration_ms / 1000).toFixed(row.duration_ms < 10000 ? 2 : 1)} s`;
}

function detailValue(label: string, value: unknown, styles: StyleConfig): string {
  const rendered = text(value) || '—';
  return `<div><dt class="${styles.detailLabel}">${escapeHTML(label)}</dt><dd class="${styles.detailValue}">${escapeHTML(rendered)}</dd></div>`;
}

function safeMetadata(row: CommandRunRow): string {
  if (!row.metadata || Object.keys(row.metadata).length === 0) return '';
  try {
    return JSON.stringify(row.metadata, null, 2);
  } catch {
    return '';
  }
}

export function renderCommandRunRow(rowValue: unknown, styles: StyleConfig): string {
  const row = rowValue && typeof rowValue === 'object' ? rowValue as CommandRunRow : {};
  const key = commandRunKey(row);
  if (!key) return '';
  const phase = text(row.phase).toLowerCase() || 'unknown';
  const revision = commandRunRevision(row);
  const terminal = commandRunTerminal(row);
  const detailID = `command-run-detail-${key.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
  const metadata = safeMetadata(row);
  const failure = row.failure && (row.failure.category || row.failure.code)
    ? `${text(row.failure.category)}${row.failure.category && row.failure.code ? ' / ' : ''}${text(row.failure.code)}`
    : '—';
  return `
    <tr
      class="command-run-row ${styles.expandableRow}"
      data-row-key="${escapeAttribute(key)}"
      data-row-revision="${revision}"
      data-row-terminal="${terminal ? 'true' : 'false'}"
      data-command-run-row
      aria-selected="false"
      tabindex="-1"
    >
      <td>
        <button type="button" class="command-run-toggle" data-command-run-toggle data-live-row-focus aria-expanded="false" aria-controls="${escapeAttribute(detailID)}">
          <span aria-hidden="true">›</span><span class="sr-only">Toggle details for ${escapeHTML(key)}</span>
        </button>
        <span class="${styles.badge} command-run-phase command-run-phase--${escapeAttribute(phase)}">${escapeHTML(phase)}</span>
      </td>
      <td><strong>${escapeHTML(text(row.command_id) || 'Unknown command')}</strong><div class="${styles.muted}">${escapeHTML(key)}</div></td>
      <td>${escapeHTML(progress(row))}</td>
      <td>${escapeHTML(text(row.mode) || '—')}</td>
      <td>${escapeHTML(attempt(row))}</td>
      <td><span class="${styles.timestamp}">${escapeHTML(formatTimestamp(row.updated_at || row.occurred_at))}</span><div class="${styles.muted}">${escapeHTML(duration(row))}</div></td>
      <td>${escapeHTML(text(row.message) || text(row.checkpoint) || '—')}</td>
    </tr>
    <tr id="${escapeAttribute(detailID)}" class="command-run-detail ${styles.expansionRow}" data-command-run-detail data-parent-key="${escapeAttribute(key)}" hidden>
      <td colspan="7">
        <div class="${styles.expandedContent}">
          <dl class="command-run-details">
            ${detailValue('Run ID', row.run_id, styles)}
            ${detailValue('Correlation ID', row.correlation_id, styles)}
            ${detailValue('Dispatch ID', row.dispatch_id, styles)}
            ${detailValue('Event ID', row.event_id, styles)}
            ${detailValue('Revision', row.revision, styles)}
            ${detailValue('Started', row.started_at, styles)}
            ${detailValue('Failure', failure, styles)}
          </dl>
          ${metadata ? `<details><summary>Safe metadata</summary><pre>${escapeHTML(metadata)}</pre></details>` : ''}
        </div>
      </td>
    </tr>
  `;
}

export function renderCommandRunsPanel(data: unknown, styles: StyleConfig): string {
  const rows = Array.isArray(data) ? data : [];
  reconcileCommandRunsRows(rows);
  if (rows.length === 0) {
    return `<div class="${styles.emptyState}" data-command-runs-empty>No command runs available</div>
      <div class="${styles.emptyState}" data-command-run-unavailable ${selectionUnavailable ? '' : 'hidden'}>Selected command run is no longer retained.</div>`;
  }
  return `
    <section class="${styles.jsonPanel}" data-command-runs-panel>
      <table class="${styles.table} command-runs-table">
        <thead><tr><th>Status</th><th>Command / Run</th><th>Progress</th><th>Mode</th><th>Attempt</th><th>Timing</th><th>Message</th></tr></thead>
        <tbody data-live-list>${rows.map((row) => renderCommandRunRow(row, styles)).join('')}</tbody>
      </table>
      <div class="${styles.emptyState}" data-command-run-unavailable hidden>Selected command run is no longer retained.</div>
    </section>
  `;
}

export function attachCommandRunsInteractions(root: ParentNode, container: HTMLElement): void {
  if (container.dataset.commandRunsWired === 'true') return;
  container.dataset.commandRunsWired = 'true';
  container.addEventListener('click', (event) => {
    const target = event.target as Element | null;
    const row = target?.closest<HTMLElement>('[data-command-run-row]');
    if (!row) return;
    const key = row.getAttribute('data-row-key') || '';
    if (!key) return;
    selectedRun = key;
    requestedRun = key;
    requestedCorrelation = '';
    selectionUnavailable = false;
    if (target?.closest('[data-command-run-toggle]')) {
      if (expandedRuns.has(key)) expandedRuns.delete(key);
      else expandedRuns.add(key);
    }
    restoreCommandRunsInteractions(root, container);
    const EventConstructor = container.ownerDocument.defaultView?.CustomEvent || CustomEvent;
    container.dispatchEvent(new EventConstructor(commandRunSelectionEvent, {
      bubbles: true,
      detail: { runID: key },
    }));
  });
  container.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const target = event.target as Element | null;
    if (!target?.closest('[data-command-run-toggle]')) return;
    event.preventDefault();
    (target as HTMLElement).click();
  });
}

export function restoreCommandRunsInteractions(_root: ParentNode, container: HTMLElement): void {
  container.querySelectorAll<HTMLElement>('[data-command-run-row]').forEach((row) => {
    const key = row.getAttribute('data-row-key') || '';
    const expanded = expandedRuns.has(key);
    const selected = selectedRun === key;
    row.setAttribute('aria-selected', selected ? 'true' : 'false');
    row.classList.toggle('command-run-row--selected', selected);
    const toggle = row.querySelector<HTMLElement>('[data-command-run-toggle]');
    toggle?.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    const detail = Array.from(container.querySelectorAll<HTMLElement>('[data-command-run-detail]'))
      .find((candidate) => candidate.getAttribute('data-parent-key') === key);
    if (detail) detail.hidden = !expanded;
  });
  const root = _root as ParentNode;
  root.querySelectorAll<HTMLElement>('[data-command-run-unavailable]').forEach((element) => {
    element.hidden = !selectionUnavailable;
  });
}

export function commandRunsEvicted(keys: string[]): void {
  keys.forEach((key) => {
    expandedRuns.delete(key);
    if (key === selectedRun) selectionUnavailable = true;
  });
}

export function commandRunsSelection(): string {
  return selectedRun;
}

export function selectCommandRun(runID: string): void {
  selectedRun = text(runID);
  requestedRun = selectedRun;
  requestedCorrelation = '';
  selectionUnavailable = false;
  if (selectedRun) expandedRuns.add(selectedRun);
}

export function resetCommandRunsState(): void {
  selectedRun = '';
  requestedRun = '';
  requestedCorrelation = '';
  selectionUnavailable = false;
  expandedRuns.clear();
}
