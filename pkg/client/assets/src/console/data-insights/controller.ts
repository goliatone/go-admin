// Insights and comparisons bound into the explorer details. The explorer owns
// the catalog, the pinned selection, its drift and focus; this controller owns
// the Show as choice, the Compare choice and their keyed reads, and renders
// the Insights and Compare sections of the shown selection. A comparison uses
// the metric set the shown selection's insights read names, pins the compared
// side exactly as the snapshot offered it and stops, never re-pins, when that
// side changes. Nothing for another selection is ever shown.

import { selectionKey, type ExploreSelection } from '../data-explorer/contract.js';
import type { CatalogDataset } from '../data-explorer/catalog.js';
import {
  compareCandidates,
  describeSelection,
  renderCompare,
  type CompareCandidate,
  type ComparePair,
  type ComparePrerequisite,
} from './compare.js';
import { CompareSession, InsightsSession } from './session.js';
import { createHTTPInsightsTransport, type InsightsRoutes, type InsightsTransport } from './transport.js';
import { renderInsights, type InsightsDisplay } from './view.js';

export type InsightsSection = 'insights' | 'compare';

export type InsightsHost = {
  /** Element ID prefix unique to the explorer. */
  scope: string;
  /** Re-render the explorer, then focus the element with this focus key. */
  update(focus?: string): void;
  /** The shown selection's dataset as the snapshot offers it now. */
  dataset(): CatalogDataset | undefined;
  /** The target's active selection as the snapshot offers it now. */
  activeSelection(targetId: string): ExploreSelection | undefined;
  /** Scenario title of a selection (declared when known). */
  title(selection: ExploreSelection): string;
};

export type DataInsightsOptions = InsightsHost & { routes?: InsightsRoutes; transport?: InsightsTransport };

function sameScenario(a: ExploreSelection, b: ExploreSelection): boolean {
  return a.target_id === b.target_id && a.dataset.provider === b.dataset.provider && a.dataset.id === b.dataset.id
    && a.dataset.version === b.dataset.version && a.dataset.digest === b.dataset.digest
    && a.scenario.id === b.scenario.id && a.scenario.version === b.scenario.version && a.scenario.profile_hash === b.scenario.profile_hash;
}

const unconfigured: InsightsTransport = {
  insights: () => Promise.resolve({ ok: false, failure: { kind: 'unconfigured', status: 0 } }),
  compare: () => Promise.resolve({ ok: false, failure: { kind: 'unconfigured', status: 0 } }),
};

export class DataInsights {
  private readonly host: InsightsHost;
  private readonly insights: InsightsSession;
  private readonly comparison: CompareSession;
  private shown: ExploreSelection | undefined;
  private display: InsightsDisplay = 'chart';

  constructor(options: DataInsightsOptions) {
    this.host = options;
    const transport = options.transport || (options.routes ? createHTTPInsightsTransport(options.routes) : unconfigured);
    this.insights = new InsightsSession((selection, signal) => transport.insights(selection, '', signal), () => this.insightsLanded());
    // A comparison reads only with the metric set the shown selection's insights named.
    this.comparison = new CompareSession((pair, signal) => transport.compare(pair, this.metricSet(), signal), () => this.host.update(), () => Boolean(this.metricSet()));
  }

  /** The explorer shows `selection` (undefined: nothing); state for any other selection is dropped. */
  show(selection: ExploreSelection | undefined): void {
    if (selection && this.shown && selectionKey(selection) === selectionKey(this.shown)) return;
    this.insights.clear();
    this.comparison.clear();
    this.shown = selection;
  }

  /** Section markup for the shown selection. */
  render(section: InsightsSection): string {
    const shown = this.shown;
    if (!shown) return '';
    if (section === 'insights') {
      return renderInsights({ scope: this.host.scope, selection: shown, entry: this.insights.entry(shown), display: this.display });
    }
    return renderCompare({
      scope: this.host.scope,
      shown,
      candidates: this.candidates(),
      choice: this.comparison.choice,
      pair: this.comparison.pair,
      describe: (selection) => describeSelection(selection, shown, this.host.title),
      entry: this.comparison.entry,
      display: this.display,
      ...this.staleState(),
      prerequisite: this.prerequisite(),
    });
  }

  /** Start the reads a shown section needs (each read happens once per key). */
  load(section: InsightsSection): void {
    if (!this.shown) return;
    this.insights.load(this.shown);
    if (section === 'compare') this.comparison.ensure();
  }

  /** A new authorized snapshot: authorize shown answers again once shown. */
  markStale(): void {
    this.insights.markStale();
    this.comparison.markStale();
  }

  revalidate(section: InsightsSection): void {
    this.insights.revalidate();
    if (section === 'compare') this.comparison.revalidate();
  }

  /**
   * After the catalog changed: a pinned compared side that the snapshot no
   * longer offers exactly as pinned stops being read; nothing is re-pinned.
   */
  reconcile(): void {
    const compared = this.comparedSide();
    if (!compared || this.comparison.stale) return;
    if (this.candidates().some((candidate) => candidate.key === selectionKey(compared))) return;
    this.comparison.markDrifted('drifted');
  }

  /** A drifted pin, explained against what the snapshot offers now (never a stale description). */
  private staleState(): { stale?: string; staleCurrent?: boolean } {
    const compared = this.comparedSide();
    if (!this.comparison.stale || !compared) return {};
    const current = this.replacement(compared);
    return { stale: this.driftReason(compared, current), staleCurrent: Boolean(current) };
  }

  /** Handle a `[data-insights-control]` change; true when handled. */
  handleChange(control: HTMLElement): boolean {
    const kind = control.dataset.insightsControl;
    if (kind === 'display' && control instanceof HTMLInputElement) {
      const next: InsightsDisplay = control.value === 'table' ? 'table' : 'chart';
      if (control.checked && next !== this.display) {
        this.display = next;
        this.host.update(`insights:display:${next}`);
      }
      return true;
    }
    if (kind === 'compare' && control instanceof HTMLSelectElement) {
      this.choose(control.value);
      return true;
    }
    return false;
  }

  /** Handle a `[data-insights-action]` click; true when handled. */
  handleClick(control: HTMLElement): boolean {
    const action = control.dataset.insightsAction || '';
    if (!action) return false;
    // Unavailable controls stay focusable for keyboard users but never act.
    if (control.getAttribute('aria-disabled') === 'true') return true;
    const shown = this.shown;
    switch (action) {
      case 'retry':
        if (shown) this.insights.load(shown, true);
        this.host.update('section:insights');
        return true;
      case 'compare-retry':
        // Without a metric set, read the shown selection first; the comparison follows.
        if (shown && !this.metricSet()) this.insights.load(shown, true);
        else this.comparison.retry();
        this.host.update('insights:compare');
        return true;
      case 'swap':
        this.comparison.swap();
        this.host.update('insights:swap');
        return true;
      case 'compare-current':
        this.compareCurrent();
        return true;
      default:
        return false;
    }
  }

  /** After an explicit Refresh of the same selection: read failed answers again. */
  refreshFailed(): void {
    if (!this.shown) return;
    if (this.insights.entry(this.shown)?.status === 'failed') this.insights.load(this.shown, true);
    if (this.comparison.entry?.status === 'failed') this.comparison.retry();
  }

  /** Abort every read and forget everything shown. */
  clear(): void {
    this.insights.clear();
    this.comparison.clear();
    this.shown = undefined;
  }

  // -------------------------------------------------------------------------

  /** The metric set named by the shown selection's insights, '' until known. */
  private metricSet(): string {
    const entry = this.insights.entry(this.shown);
    if (entry?.status !== 'ready') return '';
    const { state, metric_set_id: id } = entry.value;
    return state === 'available' || state === 'empty' ? id : '';
  }

  private prerequisite(): ComparePrerequisite | undefined {
    const entry = this.insights.entry(this.shown);
    if (!entry || entry.status === 'loading') return { status: 'loading' };
    if (entry.status === 'failed') return { status: 'failed', failure: entry.failure };
    if (entry.value.state === 'suppressed') {
      return { status: 'blocked', message: 'Insights for the data shown are hidden by policy, so it cannot be compared.' };
    }
    if (!this.metricSet()) {
      return { status: 'blocked', message: 'This dataset’s provider does not offer insights for the data shown, so it cannot be compared.' };
    }
    return undefined;
  }

  private insightsLanded(): void {
    // A pair pinned while the shown selection was being read waits for its metric set.
    this.comparison.ensure();
    this.comparison.revalidate();
    this.host.update();
  }

  private candidates(): CompareCandidate[] {
    const shown = this.shown;
    const dataset = this.host.dataset();
    return shown && dataset ? compareCandidates(dataset, shown, this.host.activeSelection(shown.target_id), this.host.title) : [];
  }

  /** The pinned side that is not the shown selection. */
  private comparedSide(pair: ComparePair | undefined = this.comparison.pair): ExploreSelection | undefined {
    const shown = this.shown;
    if (!pair || !shown) return undefined;
    return selectionKey(pair.left) === selectionKey(shown) ? pair.right : pair.left;
  }

  /** What the snapshot offers now in place of a pinned side. */
  private replacement(pinned: ExploreSelection | undefined): CompareCandidate | undefined {
    if (!pinned) return undefined;
    const candidates = this.candidates();
    if (pinned.context === 'active') return candidates.find((candidate) => candidate.active);
    return candidates.find((candidate) => !candidate.active && candidate.selection.context === pinned.context && sameScenario(candidate.selection, pinned));
  }

  private driftReason(pinned: ExploreSelection, current: CompareCandidate | undefined): string {
    const title = this.host.title(pinned);
    if (current && current.key === selectionKey(pinned)) {
      // It was briefly not offered (for example while the target switched) and is back unchanged.
      const what = pinned.context === 'active' ? `The active data on ${pinned.target_id}` : pinned.context === 'prepared' ? `The prepared receipt ${pinned.receipt_id} of ${title}` : `The catalog example of ${title}`;
      return `${what} was briefly unavailable. Compare again to read it.`;
    }
    if (pinned.context === 'active') {
      return current
        ? `The active data on ${pinned.target_id} changed since you chose it: it is now ${this.host.title(current.selection)} at generation ${current.selection.generation} (receipt ${current.selection.receipt_id}). Compare again to use the current active data.`
        : `The active data on ${pinned.target_id} you chose is no longer offered. Choose again to compare.`;
    }
    if (pinned.context === 'prepared') {
      return current
        ? `The prepared receipt ${pinned.receipt_id} of ${title} was replaced by receipt ${current.selection.receipt_id}. Compare again to use the current receipt.`
        : `The prepared receipt ${pinned.receipt_id} of ${title} is no longer offered. Choose again to compare.`;
    }
    return current
      ? `The catalog example of ${title} changed since you chose it. Compare again to use the current example.`
      : `The catalog example of ${title} is no longer offered. Choose again to compare.`;
  }

  private choose(key: string): void {
    const shown = this.shown;
    if (!shown) return;
    if (!key) {
      this.comparison.clear();
      this.host.update('insights:compare');
      return;
    }
    const candidate = this.candidates().find((item) => item.key === key);
    if (!candidate || (candidate.key === this.comparison.choice && !this.comparison.stale)) return;
    this.comparison.choose(shown, candidate);
    this.host.update('insights:compare');
  }

  /** Compare again with what the snapshot offers now in place of a drifted side. */
  private compareCurrent(): void {
    const shown = this.shown;
    const current = this.replacement(this.comparedSide());
    if (shown && current) this.comparison.choose(shown, current);
    else this.comparison.clear();
    this.host.update('insights:compare');
  }
}

export function createDataInsights(options: DataInsightsOptions): DataInsights {
  return new DataInsights(options);
}
