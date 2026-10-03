// Read state for insights and comparisons of one explorer selection. Each
// read belongs to exactly one key (a selection or a pinned A/B pair):
// choosing again, swapping or clearing aborts the read in flight, and an
// answer for any other key is dropped. After a new authorized snapshot the
// shown answer is read again in the background and replaced only when its
// content differs or a policy failure withdraws it; transient failures keep
// what is shown.

import { selectionKey, type ExploreSelection } from '../data-explorer/contract.js';
import type { ExplorerFailureKind, ExplorerResult } from '../data-explorer/transport.js';
import type { ExploreInsights, SelectionComparison } from './contract.js';
import { defaultPair, type CompareCandidate, type CompareEntry, type ComparePair } from './compare.js';
import type { InsightsEntry } from './view.js';

/** Background failures that withdraw shown content; others keep it. */
export const WITHDRAWING: ReadonlySet<ExplorerFailureKind> = new Set(['denied', 'expired', 'gone', 'stale', 'invalid', 'unconfigured']);

export function pairKey(pair: ComparePair): string {
  return `${selectionKey(pair.left)}\u0000${selectionKey(pair.right)}`;
}

type Entry<T> = { status: 'loading' } | { status: 'ready'; value: T } | { status: 'failed'; failure: { kind: ExplorerFailureKind; status: number } };

/** Shown content of an answer: read times and observation-derived IDs are not a change. */
function insightsContent(value: ExploreInsights): unknown {
  const { observed_at: _observed, work: _work, ...content } = value;
  return content;
}

function entryContent<T>(entry: Entry<T> | undefined, content: (value: T) => unknown): string {
  if (!entry) return '';
  if (entry.status === 'ready') return JSON.stringify(['ready', content(entry.value)]);
  return entry.status === 'failed' ? JSON.stringify(['failed', entry.failure.kind]) : 'loading';
}

function comparisonContent(value: SelectionComparison): unknown {
  const { observed_at: _observed, comparison_id: _id, ...content } = value;
  return { ...content, left: insightsContent(value.left), right: insightsContent(value.right) };
}

/**
 * One keyed read slot: `load` starts the read for a key (aborting any other),
 * `revalidate` reads the shown key again in the background.
 */
class ReadSlot<T> {
  entry: Entry<T> | undefined;
  private key = '';
  private controller: AbortController | null = null;
  private pending = false;

  constructor(private readonly content: (value: T) => unknown, private readonly changed: () => void) {}

  current(): string {
    return this.key;
  }

  busy(): boolean {
    return this.controller !== null;
  }

  load(key: string, read: (signal: AbortSignal) => Promise<ExplorerResult<T>>): void {
    this.abort();
    const controller = new AbortController();
    this.key = key;
    this.controller = controller;
    this.pending = false;
    this.entry = { status: 'loading' };
    void read(controller.signal).then((result) => {
      // Only the read for the current key may land.
      if (controller.signal.aborted || this.controller !== controller || this.key !== key) return;
      this.controller = null;
      this.entry = result.ok ? { status: 'ready', value: result.value } : { status: 'failed', failure: result.failure };
      this.changed();
    });
  }

  /** A new snapshot: authorize the shown answer again once it is shown. */
  markStale(): void {
    if (this.key && this.entry && this.entry.status !== 'loading') this.pending = true;
  }

  revalidate(read: (signal: AbortSignal) => Promise<ExplorerResult<T>>): void {
    if (!this.pending || this.controller || !this.key) return;
    this.pending = false;
    const key = this.key;
    const controller = new AbortController();
    this.controller = controller;
    void read(controller.signal).then((result) => {
      if (controller.signal.aborted || this.controller !== controller || this.key !== key) return;
      this.controller = null;
      if (!result.ok && !WITHDRAWING.has(result.failure.kind)) return;
      const next: Entry<T> = result.ok ? { status: 'ready', value: result.value } : { status: 'failed', failure: result.failure };
      if (entryContent(this.entry, this.content) === entryContent(next, this.content)) return;
      this.entry = next;
      this.changed();
    });
  }

  abort(): void {
    this.controller?.abort();
    this.controller = null;
  }

  clear(): void {
    this.abort();
    this.key = '';
    this.entry = undefined;
    this.pending = false;
  }
}

export type InsightsRead = (selection: ExploreSelection, signal: AbortSignal) => Promise<ExplorerResult<ExploreInsights>>;

export type CompareRead = (pair: ComparePair, signal: AbortSignal) => Promise<ExplorerResult<SelectionComparison>>;

/** Insights of the shown selection. */
export class InsightsSession {
  private readonly slot: ReadSlot<ExploreInsights>;
  private selection: ExploreSelection | undefined;

  constructor(private readonly read: InsightsRead, changed: () => void) {
    this.slot = new ReadSlot(insightsContent, changed);
  }

  entry(selection: ExploreSelection | undefined): InsightsEntry | undefined {
    return selection && this.selection && selectionKey(selection) === this.slot.current() ? this.slot.entry : undefined;
  }

  /** Read `selection` unless its read exists (or `force`). */
  load(selection: ExploreSelection, force = false): void {
    const key = selectionKey(selection);
    if (!force && this.slot.current() === key && this.slot.entry) return;
    this.selection = selection;
    this.slot.load(key, (signal) => this.read(selection, signal));
  }

  markStale(): void {
    this.slot.markStale();
  }

  revalidate(): void {
    const selection = this.selection;
    if (selection) this.slot.revalidate((signal) => this.read(selection, signal));
  }

  clear(): void {
    this.slot.clear();
    this.selection = undefined;
  }
}

/**
 * The comparison of the shown selection: the chosen candidate, the pinned
 * pair (A baseline, B compared) and the read for exactly that pair. Reads
 * wait until `ready` (the owner knows the metric set to compare with): a
 * pinned pair stays unread until `ensure`, and a pending re-authorization
 * stays pending.
 */
export class CompareSession {
  choice = '';
  pair: ComparePair | undefined;
  /** The pinned pair drifted; the owner explains it and the operator chooses again. */
  stale = '';
  private readonly slot: ReadSlot<SelectionComparison>;

  constructor(private readonly read: CompareRead, changed: () => void, private readonly ready: () => boolean = () => true) {
    this.slot = new ReadSlot(comparisonContent, changed);
  }

  get entry(): CompareEntry | undefined {
    return this.pair && this.slot.current() === pairKey(this.pair) ? this.slot.entry : undefined;
  }

  /** Pin `candidate` against `shown` exactly as offered now, and read the pair once ready. */
  choose(shown: ExploreSelection, candidate: CompareCandidate | undefined): void {
    this.slot.clear();
    this.stale = '';
    this.choice = candidate?.key || '';
    this.pair = candidate ? defaultPair(shown, candidate) : undefined;
    if (this.pair) this.load();
  }

  /** Read the pinned pair unless it was read already. */
  ensure(): void {
    if (this.pair && !this.stale && this.slot.current() !== pairKey(this.pair)) this.load();
  }

  swap(): void {
    if (!this.pair || this.stale) return;
    this.pair = { left: this.pair.right, right: this.pair.left };
    this.load();
  }

  /** Read the pinned pair again (Try again). */
  retry(): void {
    if (this.pair && !this.stale) this.load();
  }

  /** Stop reading a pinned pair that drifted; nothing it loaded stays shown. */
  markDrifted(reason: string): void {
    if (!this.pair || this.stale) return;
    this.slot.clear();
    this.stale = reason;
  }

  markStale(): void {
    if (!this.stale) this.slot.markStale();
  }

  revalidate(): void {
    const pair = this.pair;
    // Not ready: the pending re-authorization waits for the metric set.
    if (pair && !this.stale && this.ready()) this.slot.revalidate((signal) => this.read(pair, signal));
  }

  clear(): void {
    this.slot.clear();
    this.choice = '';
    this.pair = undefined;
    this.stale = '';
  }

  private load(): void {
    const pair = this.pair as ComparePair;
    if (!this.ready()) {
      // Pinned but unread: nothing an earlier pair or orientation loaded stays shown.
      this.slot.clear();
      return;
    }
    this.slot.load(pairKey(pair), (signal) => this.read(pair, signal));
  }
}
