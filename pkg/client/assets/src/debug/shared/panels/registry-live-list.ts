// Host-agnostic manager that applies the LiveListView engine to registry
// panels (client- or server-registered) that opt into incremental rendering via
// `PanelDefinition.liveList`. It keeps one LiveListView per panel id and routes
// that panel's adopt() and live events through it, so append-style custom panels
// stop rebuilding their whole table on every event.

import type { StyleConfig } from '../styles.js';
import type { PanelOptions } from '../types.js';
import type { PanelDefinition } from '../panel-registry.js';
import { LiveListView, hashString } from './live-list-view.js';

/**
 * The host state a registry live-list needs to render incrementally. All
 * accessors are called with the panel definition so one manager serves every
 * opted-in panel.
 */
export interface RegistryLiveListHost {
  /** Style configuration (console vs toolbar class names). */
  styles: StyleConfig;
  /** Render options (sort order) for a panel. */
  getRenderOptions: (def: PanelDefinition) => { newestFirst?: boolean };
  /** Optional per-item display predicate (e.g. declared console filters). */
  shouldDisplay?: (def: PanelDefinition, item: unknown) => boolean;
  /** Re-render the panel fully (used when the list is not mounted). */
  onNeedFullRender: (def: PanelDefinition) => void;
  /** Frame scheduler shared by all panel views; injectable for tests. */
  scheduleFrame?: (cb: () => void) => void;
  /** Whether this host can render focused upsert rows. Toolbar hosts disable it. */
  allowUpsert?: boolean;
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value) ?? '';
  } catch {
    return String(value);
  }
}

export class RegistryLiveListManager {
  private readonly host: RegistryLiveListHost;
  private readonly views = new Map<string, LiveListView<unknown>>();

  constructor(host: RegistryLiveListHost) {
    this.host = host;
  }

  /** Whether a panel definition opts into incremental rendering. */
  handles(def: PanelDefinition | undefined | null): boolean {
    if (!def?.liveList) return false;
    return def.liveList.updateMode !== 'upsert' || this.host.allowUpsert !== false;
  }

  /** Adopt the panel's live container after a full render. No-op if not opted in. */
  adopt(def: PanelDefinition, root: ParentNode): void {
    if (!this.handles(def)) return;
    this.viewFor(def).adopt(root);
  }

  /** Append one item incrementally. No-op if not opted in or item is undefined. */
  enqueue(def: PanelDefinition, item: unknown): void {
    if (!this.handles(def) || item === undefined) return;
    this.viewFor(def).enqueue([item]);
  }

  private viewFor(def: PanelDefinition): LiveListView<unknown> {
    const existing = this.views.get(def.id);
    if (existing) return existing;

    const config = def.liveList!;
    const keyOf = config.keyOf || ((item: unknown) => `r-${hashString(safeStringify(item))}`);
    const view = new LiveListView<unknown>({
      styles: this.host.styles,
      containerSelector: config.containerSelector,
      rowSelector: config.rowSelector,
      keyAttr: config.keyAttr,
      keyOf,
      updateMode: config.updateMode,
      revisionOf: config.revisionOf,
      terminalOf: config.terminalOf,
      renderRow: (item) =>
        config.renderRow(item, this.host.styles, this.host.getRenderOptions(def) as PanelOptions),
      // Append direction is owned by the panel definition (`liveList.newestFirst`),
      // the same value the full renderer uses — so the append edge can never
      // diverge from the rendered order. The host's `newestFirst`, if any, is
      // intentionally ignored for live-list panels.
      getRenderOptions: () => ({
        ...this.host.getRenderOptions(def),
        newestFirst: config.newestFirst ?? false,
      }),
      getMaxEntries: () => (config.getMaxEntries ? config.getMaxEntries() : 500),
      shouldDisplay: this.host.shouldDisplay
        ? (item) => this.host.shouldDisplay!(def, item)
        : undefined,
      onNeedFullRender: () => this.host.onNeedFullRender(def),
      onAdopt: config.onAdopt,
      onRestore: config.onRestore,
      onEvict: config.onEvict,
      scheduleFrame: this.host.scheduleFrame,
    });
    this.views.set(def.id, view);
    return view;
  }
}
