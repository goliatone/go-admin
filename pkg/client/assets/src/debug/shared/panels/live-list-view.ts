// Generic engine for coalesced, identity-stable, incremental list rendering in
// debug panels. Extracted from the SQL panel controller so any append-style
// panel (logs, requests, jserrors, app-registered panels) can get the same
// behavior: render the list once, then append/evict only changed rows instead
// of rebuilding the whole table, coalescing bursts into one animation frame and
// falling back to a full render when the list is not mounted.
//
// Panel-specific concerns (how to render a row, what the stable key is, what
// interactions exist) are supplied via options + lifecycle hooks. A stateless
// panel (logs) uses this class directly; a stateful one (SQL) composes it and
// wires selection/expansion through `onAdopt`/`onRestore`.

import type { StyleConfig } from '../styles.js';

/** Small, stable djb2 hash for deterministic fallback row keys. */
export function hashString(value: string): string {
  let hash = 5381;
  for (let i = 0; i < value.length; i++) {
    hash = ((hash << 5) + hash + value.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(36);
}

const defaultScheduleFrame = (cb: () => void): void => {
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => cb());
  } else {
    setTimeout(cb, 16);
  }
};

/**
 * Insert one item's row HTML into a live container at the correct edge for the
 * current sort order, without disturbing existing rows.
 */
export function appendListRow(container: HTMLElement, html: string, newestFirst: boolean): void {
  container.insertAdjacentHTML(newestFirst ? 'afterbegin' : 'beforeend', html);
}

/**
 * Remove a whole logical row: the primary (keyed) row plus any following
 * sibling rows that are not themselves primary rows. This removes multi-row
 * items (e.g. a SQL summary + its expansion row) as a unit while leaving
 * single-row items (e.g. logs) intact.
 */
function removeLogicalRow(primary: Element, rowSelector: string): void {
  let next = primary.nextElementSibling;
  primary.remove();
  while (next && !next.matches(rowSelector)) {
    const after = next.nextElementSibling;
    next.remove();
    next = after;
  }
}

/**
 * Evict overflow logical rows so the container stays within `maxEntries`. The
 * oldest rows are removed from the edge opposite to where new rows are inserted:
 * the bottom when newest-first, the top otherwise.
 *
 * @returns the keys of the evicted primary rows
 */
export function evictListOverflow(
  container: HTMLElement,
  rowSelector: string,
  keyAttr: string,
  maxEntries: number,
  newestFirst: boolean
): string[] {
  if (!maxEntries || maxEntries <= 0) return [];
  const primaries = Array.from(container.querySelectorAll<HTMLElement>(rowSelector));
  const overflow = primaries.length - maxEntries;
  if (overflow <= 0) return [];

  const ordered = newestFirst ? primaries.reverse() : primaries;
  const evicted: string[] = [];
  for (let i = 0; i < overflow; i++) {
    const primary = ordered[i];
    if (!primary) break;
    const key = primary.getAttribute(keyAttr);
    if (key) evicted.push(key);
    removeLogicalRow(primary, rowSelector);
  }
  return evicted;
}

export interface LiveListViewOptions<T> {
  /** Style configuration (console vs toolbar class names). */
  styles: StyleConfig;
  /** Selector for the live container (the `<tbody>` or list element). Default `[data-live-list]`. */
  containerSelector?: string;
  /** Selector matching a primary (keyed) row. Default `[data-row-key]`. */
  rowSelector?: string;
  /** Attribute holding the stable key on a primary row. Default `data-row-key`. */
  keyAttr?: string;
  /** Stable identity for an item. */
  keyOf(item: T): string;
  /** Render a single item to HTML (may be more than one row for expandable items). */
  renderRow(item: T): string;
  /** Append (default) or replace a logical row with the same stable key. */
  updateMode?: 'append' | 'upsert';
  /** Monotonic revision for duplicate/stale rejection in upsert mode. */
  revisionOf?(item: T): number;
  /** Terminal state guard for upsert mode. */
  terminalOf?(item: T): boolean;
  /** Render options that may change between renders (e.g. sort order). */
  getRenderOptions(): { newestFirst?: boolean };
  /** Max visible items; overflow is evicted from the oldest edge. */
  getMaxEntries(): number;
  /** Whether an incoming item should be shown given active filters. */
  shouldDisplay?(item: T): boolean;
  /** Invoked when a live update cannot be applied incrementally (container not mounted). */
  onNeedFullRender?(): void;
  /** Invoked when the buffered (pending) count changes — used for a paused indicator. */
  onPendingChange?(count: number): void;
  /** Wire delegated listeners once per freshly mounted container. */
  onAdopt?(root: ParentNode, container: HTMLElement): void;
  /** Restore per-row DOM state from controller state on every adopt. */
  onRestore?(root: ParentNode, container: HTMLElement): void;
  /** Called after rows are appended in a flush (e.g. auto-scroll to the tail). */
  onAfterAppend?(container: HTMLElement, appendedKeys: string[]): void;
  /** Called after bounded-list eviction removes logical rows. */
  onEvict?(evictedKeys: string[]): void;
  /** Frame scheduler; injectable for tests. Defaults to requestAnimationFrame. */
  scheduleFrame?(cb: () => void): void;
}

export class LiveListView<T> {
  private readonly opts: LiveListViewOptions<T>;
  private readonly scheduleFrame: (cb: () => void) => void;
  private readonly containerSelector: string;
  private readonly rowSelector: string;
  private readonly keyAttr: string;

  private root: ParentNode | null = null;
  private container: HTMLElement | null = null;

  private pending: T[] = [];
  private frameScheduled = false;
  private paused = false;
  private readonly wired = new WeakSet<Element>();

  constructor(opts: LiveListViewOptions<T>) {
    this.opts = opts;
    this.scheduleFrame = opts.scheduleFrame || defaultScheduleFrame;
    this.containerSelector = opts.containerSelector || '[data-live-list]';
    this.rowSelector = opts.rowSelector || '[data-row-key]';
    this.keyAttr = opts.keyAttr || 'data-row-key';
  }

  /**
   * Adopt the list after a full render: locate the container, wire delegated
   * listeners (once per container element), and restore per-row state. Safe to
   * call when the list shows an empty state (no container).
   */
  adopt(root: ParentNode): void {
    this.root = root;
    this.container = root.querySelector<HTMLElement>(this.containerSelector);
    if (!this.container) return;

    if (!this.wired.has(this.container)) {
      this.wired.add(this.container);
      this.opts.onAdopt?.(root, this.container);
    }
    this.opts.onRestore?.(root, this.container);
  }

  /** Queue live items for incremental rendering, coalesced per frame. */
  enqueue(items: T[]): void {
    if (!items || items.length === 0) return;
    for (const item of items) this.pending.push(item);
    if (this.paused) {
      this.emitPending();
      return;
    }
    if (this.opts.updateMode === 'upsert' && items.some((item) => this.opts.terminalOf?.(item))) {
      this.flush();
      return;
    }
    this.scheduleFlush();
  }

  /** Pause/resume rendering. While paused, items buffer and report a pending count. */
  setPaused(paused: boolean): void {
    this.paused = paused;
    if (!paused && this.pending.length > 0) this.scheduleFlush();
  }

  /** Number of buffered items not yet rendered (while paused). */
  get pendingCount(): number {
    return this.pending.length;
  }

  /** Drop buffered items without rendering (used when a host reconciles via a full snapshot). */
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

    if (!this.container) {
      this.opts.onNeedFullRender?.();
      return;
    }

    const renderOptions = this.opts.getRenderOptions();
    const newestFirst = renderOptions.newestFirst !== false;
    const max = this.opts.getMaxEntries();

    if (this.opts.updateMode === 'upsert') {
      batch = this.collapseUpserts(batch);
    }

    // Long pauses can buffer more than the cap; only the newest `max` survive
    // eviction, so skip inserting rows that would be evicted anyway.
    if (max && batch.length > max) batch = batch.slice(-max);

    const preserveViewport = this.opts.updateMode === 'upsert';
    const scrollTop = this.container.scrollTop;
    const activeElement = typeof document !== 'undefined' ? document.activeElement as HTMLElement | null : null;
    const focusedRow = activeElement && this.container.contains(activeElement)
      ? activeElement.closest<HTMLElement>(this.rowSelector)
      : null;
    const focusedKey = focusedRow?.getAttribute(this.keyAttr) || '';
    const focusedControl = activeElement?.hasAttribute('data-live-row-focus') === true;
    const appendedKeys: string[] = [];
    for (const item of batch) {
      const key = this.opts.keyOf(item);
      const existing = this.findRow(key);
      if (this.opts.shouldDisplay && !this.opts.shouldDisplay(item)) {
        if (existing && this.opts.updateMode === 'upsert') {
          removeLogicalRow(existing, this.rowSelector);
        }
        continue;
      }
      if (this.opts.updateMode === 'upsert' && existing) {
        if (!this.shouldReplace(existing, item)) continue;
        existing.insertAdjacentHTML('beforebegin', this.opts.renderRow(item));
        removeLogicalRow(existing, this.rowSelector);
        this.decorateRow(this.findRow(key), item);
        appendedKeys.push(key);
        continue;
      }
      appendListRow(this.container, this.opts.renderRow(item), newestFirst);
      this.decorateRow(this.findRow(key), item);
      appendedKeys.push(key);
    }

    if (appendedKeys.length > 0) {
      const evictedKeys = evictListOverflow(this.container, this.rowSelector, this.keyAttr, max, newestFirst);
      if (evictedKeys.length > 0) this.opts.onEvict?.(evictedKeys);
      this.opts.onAfterAppend?.(this.container, appendedKeys);
    }
    if (preserveViewport) this.container.scrollTop = scrollTop;
    this.opts.onRestore?.(this.root || this.container, this.container);
    if (focusedKey && activeElement && !activeElement.isConnected) {
      const replacement = this.findRow(focusedKey);
      const focusTarget = focusedControl
        ? replacement?.querySelector<HTMLElement>('[data-live-row-focus]')
        : replacement;
      focusTarget?.focus({ preventScroll: true });
    }
  }

  private collapseUpserts(items: T[]): T[] {
    const byKey = new Map<string, T>();
    const order: string[] = [];
    for (const item of items) {
      const key = this.opts.keyOf(item);
      const previous = byKey.get(key);
      if (!previous) {
        order.push(key);
        byKey.set(key, item);
        continue;
      }
      if (this.shouldAdvance(previous, item)) byKey.set(key, item);
    }
    return order.map((key) => byKey.get(key)!).filter(Boolean);
  }

  private shouldAdvance(previous: T, next: T): boolean {
    const nextRevision = this.opts.revisionOf?.(next) ?? 0;
    const previousRevision = this.opts.revisionOf?.(previous) ?? 0;
    if (nextRevision > 0 && previousRevision > 0 && nextRevision <= previousRevision) return false;
    const previousTerminal = this.opts.terminalOf?.(previous) === true;
    if (previousTerminal && this.opts.terminalOf && !this.opts.terminalOf(next)) return false;
    return true;
  }

  private findRow(key: string): HTMLElement | null {
    if (!this.container) return null;
    return Array.from(this.container.querySelectorAll<HTMLElement>(this.rowSelector))
      .find((row) => row.getAttribute(this.keyAttr) === key) || null;
  }

  private shouldReplace(existing: HTMLElement, item: T): boolean {
    const incomingRevision = this.opts.revisionOf?.(item) ?? 0;
    const existingRevision = Number(existing.getAttribute('data-row-revision') || '0');
    if (incomingRevision > 0 && existingRevision > 0 && incomingRevision <= existingRevision) return false;
    const existingTerminal = existing.getAttribute('data-row-terminal') === 'true';
    if (existingTerminal && this.opts.terminalOf && !this.opts.terminalOf(item)) return false;
    return true;
  }

  private decorateRow(row: HTMLElement | null, item: T): void {
    if (!row) return;
    if (this.opts.revisionOf) row.setAttribute('data-row-revision', String(this.opts.revisionOf(item)));
    if (this.opts.terminalOf) row.setAttribute('data-row-terminal', this.opts.terminalOf(item) ? 'true' : 'false');
  }

  private emitPending(): void {
    this.opts.onPendingChange?.(this.pending.length);
  }
}
