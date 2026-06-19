// Live, incremental view controller for the debug SQL panel.
//
// Composes the generic `LiveListView` engine (coalesced append/evict, pause,
// fallback) and adds the SQL-specific interactions: row selection + expansion
// keyed by stable id (see `sqlRowKey`), so both survive incremental updates AND
// full re-renders. Used by the full console (light DOM) and the toolbar (shadow
// DOM): each host renders the table HTML as before, then calls `adopt()`; live
// `sql` events go through `enqueue()`.

import type { SQLEntry } from '../types.js';
import type { StyleConfig } from '../styles.js';
import { renderSQLRow, sqlRowKey, type SQLPanelOptions } from './sql.js';
import { LiveListView } from './live-list-view.js';
import {
  buildSQLExportText,
  copyToClipboard,
  downloadAsFile,
  type CopyFeedbackOptions,
} from '../interactions.js';

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
  private readonly list: LiveListView<SQLEntry>;

  // Interaction state, keyed by stable row id, persists across re-renders.
  private readonly selected = new Set<string>();
  private readonly expanded = new Set<string>();

  // Mounted DOM references (null when the panel shows the empty state).
  private table: HTMLElement | null = null;
  private toolbarEl: HTMLElement | null = null;
  private countEl: Element | null = null;
  private selectAllEl: HTMLInputElement | null = null;
  private readonly wired = new WeakSet<Element>();

  constructor(opts: SqlLiveViewOptions) {
    this.opts = opts;
    this.list = new LiveListView<SQLEntry>({
      styles: opts.styles,
      containerSelector: '[data-sql-table] tbody',
      rowSelector: 'tr[data-sql-id]',
      keyAttr: 'data-sql-id',
      keyOf: sqlRowKey,
      renderRow: (entry) => renderSQLRow(entry, opts.styles, opts.getRenderOptions()),
      getRenderOptions: opts.getRenderOptions,
      getMaxEntries: opts.getMaxEntries,
      shouldDisplay: opts.shouldDisplay,
      onNeedFullRender: opts.onNeedFullRender,
      onPendingChange: opts.onPendingChange,
      scheduleFrame: opts.scheduleFrame,
      onAdopt: (root) => this.wire(root),
      onRestore: () => this.restoreState(),
    });
  }

  /** Adopt the table after a full render (wire listeners + restore state). */
  adopt(root: ParentNode): void {
    this.list.adopt(root);
  }

  /** Queue live entries for incremental rendering. */
  enqueue(entries: SQLEntry[]): void {
    this.list.enqueue(entries);
  }

  /** Pause/resume rendering; while paused entries buffer and report a pending count. */
  setPaused(paused: boolean): void {
    this.list.setPaused(paused);
  }

  /** Drop buffered entries without rendering (used when a host reconciles via a snapshot on resume). */
  discardPending(): void {
    this.list.discardPending();
  }

  /** Number of entries buffered while paused. */
  get pendingCount(): number {
    return this.list.pendingCount;
  }

  private wire(root: ParentNode): void {
    this.table = root.querySelector<HTMLElement>('[data-sql-table]');
    this.toolbarEl = root.querySelector<HTMLElement>('[data-sql-toolbar]');
    this.countEl = root.querySelector('[data-sql-selected-count]');
    this.selectAllEl = this.table?.querySelector<HTMLInputElement>('.sql-select-all') ?? null;

    if (this.table && !this.wired.has(this.table)) {
      this.wired.add(this.table);
      this.table.addEventListener('change', this.onTableChange);
      this.table.addEventListener('click', this.onTableClick);
    }
    if (this.toolbarEl && !this.wired.has(this.toolbarEl)) {
      this.wired.add(this.toolbarEl);
      this.wireToolbar(this.toolbarEl);
    }
  }

  private wireToolbar(toolbar: HTMLElement): void {
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
