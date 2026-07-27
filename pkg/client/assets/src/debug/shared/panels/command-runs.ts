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
  outcome?: {
    summary?: string;
    fields?: Record<string, string | boolean | number>;
  };
  metadata?: Record<string, unknown>;
};

const terminalPhases = new Set(['succeeded', 'failed', 'canceled', 'rejected']);
const expandedRuns = new Set<string>();
let selectedRun = '';
let requestedRun = '';
let requestedDispatch = '';
let requestedCorrelation = '';
let selectionUnavailable = false;

export const commandRunSelectionEvent = 'debug:command-run-selection';

export type CommandRunNavigationTarget = {
  runID?: string;
  dispatchID?: string;
  correlationID?: string;
};

export type CommandRunSnapshotBaselineEntry = {
  revision: number;
  generation: number;
};

export type CommandRunSnapshotBaseline = Map<string, CommandRunSnapshotBaselineEntry>;

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
    dispatchID: navigationValue(params.get('dispatch_id')) || undefined,
    correlationID: navigationValue(params.get('correlation_id')) || undefined,
  };
}

export function commandRunsNavigationHref(currentURL: string, target: CommandRunNavigationTarget): string {
  const base = typeof window !== 'undefined' ? window.location.href : 'http://localhost/';
  const url = new URL(currentURL || base, base);
  const runID = navigationValue(target.runID);
  const dispatchID = navigationValue(target.dispatchID);
  const correlationID = navigationValue(target.correlationID);
  url.searchParams.set('panel', 'command_runs');
  if (runID) url.searchParams.set('run_id', runID);
  else url.searchParams.delete('run_id');
  if (dispatchID && !runID) url.searchParams.set('dispatch_id', dispatchID);
  else url.searchParams.delete('dispatch_id');
  if (correlationID && !runID && !dispatchID) url.searchParams.set('correlation_id', correlationID);
  else url.searchParams.delete('correlation_id');
  return `${url.pathname}${url.search}${url.hash}`;
}

export function setCommandRunsNavigationTarget(target: CommandRunNavigationTarget): void {
  requestedRun = navigationValue(target.runID);
  requestedDispatch = requestedRun ? '' : navigationValue(target.dispatchID);
  requestedCorrelation = requestedRun || requestedDispatch ? '' : navigationValue(target.correlationID);
  selectedRun = requestedRun;
  selectionUnavailable = false;
  if (selectedRun) expandedRuns.add(selectedRun);
}

export function reconcileCommandRunsRows(data: unknown, authoritative = false): string {
  const rows = Array.isArray(data) ? data.filter((row) => row && typeof row === 'object') as CommandRunRow[] : [];
  const match = requestedRun
    ? rows.find((row) => commandRunKey(row) === requestedRun)
    : requestedDispatch
      ? rows.find((row) => text(row.dispatch_id) === requestedDispatch)
    : requestedCorrelation
      ? rows.find((row) => text(row.correlation_id) === requestedCorrelation)
      : undefined;
  if (match) {
    selectedRun = commandRunKey(match);
    expandedRuns.add(selectedRun);
    selectionUnavailable = false;
  } else if (authoritative && (requestedRun || requestedDispatch || requestedCorrelation)) {
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

function commandRunUpdatedAt(row: unknown): number {
  if (!row || typeof row !== 'object') return 0;
  const value = (row as CommandRunRow).updated_at || (row as CommandRunRow).occurred_at || '';
  const parsed = Date.parse(text(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

function snapshotRowAdvances(current: CommandRunRow, incoming: CommandRunRow): boolean {
  const currentRevision = commandRunRevision(current);
  const incomingRevision = commandRunRevision(incoming);
  if (commandRunTerminal(current) && !commandRunTerminal(incoming)) return false;
  if (
    currentRevision === incomingRevision
    && commandRunTerminal(current)
    && commandRunTerminal(incoming)
    && text(current.phase).trim().toLowerCase() !== text(incoming.phase).trim().toLowerCase()
  ) {
    return false;
  }
  if (incomingRevision > 0 && currentRevision > 0) {
    if (incomingRevision < currentRevision) return false;
    if (incomingRevision > currentRevision) return true;
  }
  if (commandRunTerminal(incoming) && !commandRunTerminal(current)) return true;
  // An authoritative row at the same accepted revision may fill fields omitted
  // from a transient live event.
  return incomingRevision >= currentRevision;
}

function mergeSnapshotRow(current: CommandRunRow | undefined, incoming: CommandRunRow): CommandRunRow {
  if (!current || !snapshotRowAdvances(current, incoming)) return current || incoming;
  if (commandRunRevision(current) === commandRunRevision(incoming)) {
    // Equal-revision snapshots may complete fields omitted from a transient
    // live event, but omission in the snapshot must not erase fields already
    // observed at that revision.
    return { ...current, ...incoming };
  }
  return incoming;
}

export function commandRunRevisionGap(current: unknown, incoming: unknown): boolean {
  const currentRevision = commandRunRevision(current);
  const incomingRevision = commandRunRevision(incoming);
  return currentRevision > 0 && incomingRevision > currentRevision + 1;
}

export function captureCommandRunSnapshotBaseline(
  data: unknown,
  generations: ReadonlyMap<string, number>,
): CommandRunSnapshotBaseline {
  const baseline: CommandRunSnapshotBaseline = new Map();
  const rows = Array.isArray(data) ? data : [];
  rows.forEach((value) => {
    const key = commandRunKey(value);
    if (!key) return;
    baseline.set(key, {
      revision: commandRunRevision(value),
      generation: generations.get(key) || 0,
    });
  });
  return baseline;
}

export function mergeAuthoritativeCommandRuns(
  currentData: unknown,
  snapshotData: unknown,
  baseline: CommandRunSnapshotBaseline,
  generations: ReadonlyMap<string, number>,
  maxEntries = 500,
): CommandRunRow[] {
  const currentRows = Array.isArray(currentData)
    ? currentData.filter((row) => row && typeof row === 'object') as CommandRunRow[]
    : [];
  const snapshotRows = Array.isArray(snapshotData)
    ? snapshotData.filter((row) => row && typeof row === 'object') as CommandRunRow[]
    : [];
  const currentByKey = new Map<string, CommandRunRow>();
  currentRows.forEach((row) => {
    const key = commandRunKey(row);
    if (key) currentByKey.set(key, row);
  });
  const snapshotKeys = new Set<string>();
  const merged: CommandRunRow[] = [];

  snapshotRows.forEach((snapshotRow) => {
    const key = commandRunKey(snapshotRow);
    if (!key || snapshotKeys.has(key)) return;
    snapshotKeys.add(key);
    merged.push(mergeSnapshotRow(currentByKey.get(key), snapshotRow));
  });

  currentRows.forEach((current) => {
    const key = commandRunKey(current);
    if (!key || snapshotKeys.has(key)) return;
    const started = baseline.get(key);
    const unchangedSinceRequest = started
      && started.revision === commandRunRevision(current)
      && started.generation === (generations.get(key) || 0);
    if (!unchangedSinceRequest) merged.push(current);
  });

  merged.sort((left, right) => {
    const byUpdated = commandRunUpdatedAt(right) - commandRunUpdatedAt(left);
    return byUpdated || commandRunKey(left).localeCompare(commandRunKey(right));
  });
  return maxEntries > 0 ? merged.slice(0, maxEntries) : merged;
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

function renderOutcome(row: CommandRunRow, styles: StyleConfig): string {
  const summary = text(row.outcome?.summary);
  const fields = row.outcome?.fields && typeof row.outcome.fields === 'object'
    ? Object.entries(row.outcome.fields)
      .filter(([key, value]) => {
        if (!text(key)) return false;
        if (typeof value === 'number') return Number.isFinite(value);
        return typeof value === 'string' || typeof value === 'boolean';
      })
      .sort(([left], [right]) => left.localeCompare(right))
    : [];
  if (!summary && fields.length === 0) {
    return `<p class="${styles.muted}" data-command-run-outcome-empty>No additional result metadata was recorded.</p>`;
  }
  return `
    <section class="command-run-outcome" data-command-run-outcome>
      <h4>Outcome</h4>
      ${summary ? `<p>${escapeHTML(summary)}</p>` : ''}
      ${fields.length > 0 ? `
        <dl class="command-run-details command-run-outcome__fields">
          ${fields.map(([key, value]) => detailValue(key, value, styles)).join('')}
        </dl>
      ` : ''}
    </section>
  `;
}

export function renderCommandRunRow(rowValue: unknown, styles: StyleConfig): string {
  const row = rowValue && typeof rowValue === 'object' ? rowValue as CommandRunRow : {};
  const key = commandRunKey(row);
  if (!key) return '';
  const phase = text(row.phase).toLowerCase() || 'unknown';
  const revision = commandRunRevision(row);
  const terminal = commandRunTerminal(row);
  const detailID = `command-run-detail-${key.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
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
        <button type="button" class="command-run-toggle" data-command-run-toggle data-live-row-focus aria-expanded="false" aria-controls="${escapeAttribute(detailID)}" aria-label="Show details for ${escapeAttribute(text(row.command_id) || 'unknown command')} run ${escapeAttribute(key)} (${escapeAttribute(phase)})">
          <span aria-hidden="true">›</span>
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
            ${detailValue('Dispatch ID', row.dispatch_id, styles)}
            ${detailValue('Correlation ID', row.correlation_id, styles)}
            ${detailValue('Event ID', row.event_id, styles)}
            ${detailValue('Command', row.command_id, styles)}
            ${detailValue('Phase', phase, styles)}
            ${detailValue('Revision', row.revision, styles)}
            ${detailValue('Mode', row.mode, styles)}
            ${detailValue('Progress', progress(row), styles)}
            ${detailValue('Attempt', attempt(row), styles)}
            ${detailValue('First occurred', row.first_occurred_at, styles)}
            ${detailValue('Occurred', row.occurred_at, styles)}
            ${detailValue('Started', row.started_at, styles)}
            ${detailValue('Updated', row.updated_at, styles)}
            ${detailValue('Duration', duration(row), styles)}
            ${detailValue('Checkpoint', row.checkpoint, styles)}
            ${detailValue('Message', row.message, styles)}
            ${detailValue('Failure', failure, styles)}
          </dl>
          ${renderOutcome(row, styles)}
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
    requestedDispatch = '';
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
    row.classList.toggle('expanded', expanded);
    const toggle = row.querySelector<HTMLElement>('[data-command-run-toggle]');
    toggle?.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    if (toggle) {
      const command = text(row.querySelector('strong')?.textContent) || 'unknown command';
      const phase = text(row.querySelector('.command-run-phase')?.textContent) || 'unknown';
      toggle.setAttribute('aria-label', `${expanded ? 'Hide' : 'Show'} details for ${command} run ${key} (${phase})`);
    }
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
  requestedDispatch = '';
  requestedCorrelation = '';
  selectionUnavailable = false;
  if (selectedRun) expandedRuns.add(selectedRun);
}

export function resetCommandRunsState(): void {
  selectedRun = '';
  requestedRun = '';
  requestedDispatch = '';
  requestedCorrelation = '';
  selectionUnavailable = false;
  expandedRuns.clear();
}
