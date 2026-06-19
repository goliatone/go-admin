// Live, incremental view controller for the debug SQL panel.
//
// Owns SQL row selection and expansion state keyed by stable id (see
// `sqlRowKey`), so both survive incremental updates AND full re-renders. Used by
// the full console (light DOM) and the toolbar (shadow DOM): each host renders
// the table HTML as before, then calls `adopt()` to wire delegated listeners and
// restore state; live `sql` events go through `enqueue()`, which coalesces a
// burst into a single animation-frame DOM pass and appends/evicts only the
// changed rows instead of rebuilding the table.

import type { SQLEntry } from '../types.js';
import type { StyleConfig } from '../styles.js';
import {
  appendSqlRowDOM,
  evictSqlOverflow,
  sqlRowKey,
  type SQLPanelOptions,
} from './sql.js';
import {
  buildSQLExportText,
  copyToClipboard,
  downloadAsFile,
  type CopyFeedbackOptions,
} from '../interactions.js';

const defaultScheduleFrame = (cb: () => void): void => {
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => cb());
  } else {
    setTimeout(cb, 16);
  }
};

export interface SqlLiveViewOptions {
  /** Style configuration (console vs toolbar class names). */
  styles: StyleConfig;
  /** Clipboard feedback style for copy buttons. */
  copyOptions?: CopyFeedbackOptions;
  /** Current full (unfiltered) query list; used for export + key resolution. */
  getQueries: () => SQLEntry[];
  /** Row render options (sort order, slow threshold, copy-button style). */
  getRenderOptions: () => SQLPanelOptions;
  /** Max visible rows; overflow rows are evicted from the oldest edge. */
  getMaxEntries: () => number;
  /** Whether an incoming entry should be shown given active filters. */
  shouldDisplay?: (entry: SQLEntry) => boolean;
  /** Invoked when a live update cannot be applied incrementally (table not mounted). */
  onNeedFullRender?: () => void;
  /** Invoked when the buffered (pending) count changes — used for the paused indicator. */
  onPendingChange?: (count: number) => void;
  /** Frame scheduler; injectable for tests. Defaults to requestAnimationFrame. */
  scheduleFrame?: (cb: () => void) => void;
}

export class SqlLiveView {
  private readonly opts: SqlLiveViewOptions;
  private readonly scheduleFrame: (cb: () => void) => void;

  // Interaction state, keyed by stable row id, persists across re-renders.
  private readonly selected = new Set<string>();
  private readonly expanded = new Set<string>();

  // Mounted DOM references (null when the panel shows the empty state).
  private root: ParentNode | null = null;
  private table: HTMLElement | null = null;
  private tbody: HTMLElement | null = null;
  private toolbarEl: HTMLElement | null = null;
  private countEl: Element | null = null;
  private selectAllEl: HTMLInputElement | null = null;

  // Coalescing + backpressure.
  private pending: SQLEntry[] = [];
  private frameScheduled = false;
  private paused = false;
  private readonly wired = new WeakSet<Element>();

  constructor(opts: SqlLiveViewOptions) {
    this.opts = opts;
    this.scheduleFrame = opts.scheduleFrame || defaultScheduleFrame;
  }

  /**
   * Adopt the table after a full render: locate DOM, wire delegated listeners
   * (once per table element), and restore selection/expansion from state.
   * Safe to call when the panel shows the empty state (no table) — state is
   * retained for the next mount.
   */
  adopt(root: ParentNode): void {
    this.root = root;
    this.table = root.querySelector<HTMLElement>('[data-sql-table]');
    this.tbody = this.table?.querySelector('tbody') ?? null;
    this.toolbarEl = root.querySelector<HTMLElement>('[data-sql-toolbar]');
    this.countEl = root.querySelector('[data-sql-selected-count]');
    this.selectAllEl = this.table?.querySelector<HTMLInputElement>('.sql-select-all') ?? null;

    if (!this.table || !this.tbody) return;

    this.wireTable(this.table);
    if (this.toolbarEl) this.wireToolbar(this.toolbarEl);
    this.restoreState();
  }

  /** Queue live entries for incremental rendering, coalesced per frame. */
  enqueue(entries: SQLEntry[]): void {
    if (!entries || entries.length === 0) return;
    for (const entry of entries) this.pending.push(entry);
    if (this.paused) {
      this.emitPending();
      return;
    }
    this.scheduleFlush();
  }

  /** Pause/resume rendering. While paused, entries buffer and report a pending count. */
  setPaused(paused: boolean): void {
    this.paused = paused;
    if (!paused && this.pending.length > 0) this.scheduleFlush();
  }

  /** Number of buffered entries not yet rendered (while paused). */
  get pendingCount(): number {
    return this.pending.length;
  }

  /** Drop buffered entries without rendering them (used when a host reconciles via a full snapshot on resume). */
  discardPending(): void {
    if (this.pending.length === 0) return;
    this.pending = [];
    this.emitPending();
  }

  private scheduleFlush(): void {
    if (this.frameScheduled) return;
    this.frameScheduled = true;
    this.scheduleFrame(() => {
      this.frameScheduled = false;
      this.flush();
    });
  }

  private flush(): void {
    if (this.paused) return;
    let batch = this.pending;
    this.pending = [];
    this.emitPending();
    if (batch.length === 0) return;

    if (!this.table || !this.tbody) {
      this.opts.onNeedFullRender?.();
      return;
    }

    const renderOptions = this.opts.getRenderOptions();
    const newestFirst = renderOptions.newestFirst !== false;
    const max = this.opts.getMaxEntries();

    // Long pauses can buffer more than the cap; only the newest `max` survive
    // eviction, so don't bother inserting rows that would be evicted anyway.
    if (max && batch.length > max) batch = batch.slice(-max);

    let appended = 0;
    for (const entry of batch) {
      if (this.opts.shouldDisplay && !this.opts.shouldDisplay(entry)) continue;
      appendSqlRowDOM(this.tbody, entry, this.opts.styles, renderOptions);
      appended += 1;
    }

    if (appended > 0) {
      evictSqlOverflow(this.tbody, max, newestFirst);
      this.updateToolbar();
    }
  }

  private emitPending(): void {
    this.opts.onPendingChange?.(this.pending.length);
  }

  private wireTable(table: HTMLElement): void {
    if (this.wired.has(table)) return;
    this.wired.add(table);
    table.addEventListener('change', this.onTableChange);
    table.addEventListener('click', this.onTableClick);
  }

  private wireToolbar(toolbar: HTMLElement): void {
    if (this.wired.has(toolbar)) return;
    this.wired.add(toolbar);

    toolbar.querySelector('[data-sql-export="clipboard"]')?.addEventListener('click', async (e) => {
      e.preventDefault();
      if (this.selected.size === 0) return;
      const text = buildSQLExportText(this.opts.getQueries(), this.selected);
      await copyToClipboard(text, e.currentTarget as HTMLElement, this.opts.copyOptions);
    });

    toolbar.querySelector('[data-sql-export="download"]')?.addEventListener('click', (e) => {
      e.preventDefault();
      if (this.selected.size === 0) return;
      const text = buildSQLExportText(this.opts.getQueries(), this.selected);
      const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      downloadAsFile(text, `sql-queries-${ts}.sql`);
    });

    toolbar.querySelector('[data-sql-clear-selection]')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.clearSelection();
    });
  }

  private readonly onTableChange = (e: Event): void => {
    const target = e.target as HTMLElement | null;
    if (!target || !target.classList) return;

    if (target.classList.contains('sql-select-all')) {
      this.setAllVisible((target as HTMLInputElement).checked);
      return;
    }
    if (target.classList.contains('sql-select-row')) {
      const cb = target as HTMLInputElement;
      const id = cb.dataset.sqlId;
      if (!id) return;
      if (cb.checked) this.selected.add(id);
      else this.selected.delete(id);
      this.updateToolbar();
    }
  };

  private readonly onTableClick = (e: Event): void => {
    const target = e.target as HTMLElement | null;
    if (!target) return;

    // Per-row copy button (lives inside the expansion row). Handled here via
    // delegation so newly streamed rows copy without per-row re-attachment.
    const copyBtn = target.closest<HTMLElement>('[data-copy-trigger]');
    if (copyBtn) {
      e.preventDefault();
      e.stopPropagation();
      const container = copyBtn.closest('[data-copy-content]');
      const content = container?.getAttribute('data-copy-content') || '';
      void copyToClipboard(content, copyBtn, this.opts.copyOptions);
      return;
    }

    // Other interactive elements (checkbox, links) must not toggle expansion.
    if (target.closest('a, button, input')) return;

    const summary = target.closest<HTMLElement>('tr[data-sql-id]');
    if (!summary) return;
    const id = summary.dataset.sqlId;
    if (!id) return;
    if (this.expanded.has(id)) {
      this.expanded.delete(id);
      summary.classList.remove('expanded');
    } else {
      this.expanded.add(id);
      summary.classList.add('expanded');
    }
  };

  private setAllVisible(checked: boolean): void {
    if (!this.table) return;
    this.table.querySelectorAll<HTMLInputElement>('.sql-select-row').forEach((cb) => {
      cb.checked = checked;
      const id = cb.dataset.sqlId;
      if (!id) return;
      if (checked) this.selected.add(id);
      else this.selected.delete(id);
    });
    this.updateToolbar();
  }

  private clearSelection(): void {
    this.selected.clear();
    this.table?.querySelectorAll<HTMLInputElement>('.sql-select-row').forEach((cb) => {
      cb.checked = false;
    });
    this.updateToolbar();
  }

  private restoreState(): void {
    if (!this.table) return;

    // Drop state for entries the buffer has dropped entirely.
    const liveKeys = new Set(this.opts.getQueries().map(sqlRowKey));
    for (const id of [...this.selected]) if (!liveKeys.has(id)) this.selected.delete(id);
    for (const id of [...this.expanded]) if (!liveKeys.has(id)) this.expanded.delete(id);

    this.table.querySelectorAll<HTMLInputElement>('.sql-select-row').forEach((cb) => {
      cb.checked = !!cb.dataset.sqlId && this.selected.has(cb.dataset.sqlId);
    });
    this.table.querySelectorAll<HTMLElement>('tr[data-sql-id]').forEach((row) => {
      const id = row.dataset.sqlId;
      if (id && this.expanded.has(id)) row.classList.add('expanded');
      else row.classList.remove('expanded');
    });

    this.updateToolbar();
  }

  private updateToolbar(): void {
    if (this.toolbarEl) {
      const count = this.selected.size;
      this.toolbarEl.dataset.visible = count > 0 ? 'true' : 'false';
      if (this.countEl) this.countEl.textContent = `${count} selected`;
    }
    if (this.selectAllEl && this.table) {
      const boxes = this.table.querySelectorAll('.sql-select-row');
      const checked = this.table.querySelectorAll('.sql-select-row:checked').length;
      this.selectAllEl.checked = boxes.length > 0 && checked === boxes.length;
      this.selectAllEl.indeterminate = checked > 0 && checked < boxes.length;
    }
  }
}
