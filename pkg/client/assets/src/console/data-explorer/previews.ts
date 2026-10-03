// Record previews for the explorer: per-entity cursor pages for the exact
// selection, and one depth-one related page in the shared console drawer.
// Every page read is cancellable; a superseded page (another page, another
// selection, a hidden preview, a closed drawer) is aborted and its late answer
// discarded. Cursors are opaque server values kept only for back navigation.
// After a new authorized snapshot the shown page is read again in the
// background with its own cursor and replaced only when the answer differs or
// a policy failure withdraws it; transient failures keep the shown page.

import { ConsoleDrawer } from '../drawer.js';
import { selectionKey, type ExploreEntity, type ExploreMetadata, type ExploreSelection } from './contract.js';
import { renderEntityPreview, renderRelatedBody, type SamplePage } from './samples.js';
import type { ExplorerFailureKind, ExplorerResult, ExplorerTransport } from './transport.js';
import type { ExploreSamples } from './contract.js';

export const SAMPLE_PAGE_LIMIT = 25;

/** Background failures that withdraw shown content; others keep it. */
export const WITHDRAWING_FAILURES: ReadonlySet<ExplorerFailureKind> = new Set(['denied', 'expired', 'gone', 'stale', 'invalid', 'unconfigured']);

/** Visible content of a page: record keys, cursors and read times may differ between equal reads. */
function pageContent(samples: ExploreSamples): string {
  return JSON.stringify([
    samples.state, samples.completeness, samples.provenance, samples.entity_id, samples.sampling_method, samples.total,
    Boolean(samples.next_cursor), samples.columns, samples.rows.map((row) => row.cells),
  ]);
}

export type PreviewHost = {
  root: HTMLElement;
  scope: string;
  transport: ExplorerTransport;
  configured: boolean;
  /** Re-render the explorer panel (previews render inside it). */
  update(focus?: string): void;
  /** Focus target when a closed drawer's invoker no longer exists. */
  fallbackFocus(key: string): HTMLElement | null;
};

type PageState = {
  selection: ExploreSelection;
  entityId: string;
  cursors: string[];
  starts: number[];
  page: SamplePage;
  controller: AbortController | null;
  /** A new snapshot asked for this page to be authorized again. */
  stale?: boolean;
};

type RelatedState = PageState & {
  source: ExploreEntity;
  target: ExploreEntity | undefined;
  recordKey: string;
  relationshipId: string;
  drawer: ConsoleDrawer;
};

type PageRead = (state: PageState, cursor: string, signal: AbortSignal) => Promise<ExplorerResult<ExploreSamples>>;

function cssEscape(value: string): string {
  return typeof CSS !== 'undefined' && typeof CSS.escape === 'function' ? CSS.escape(value) : value.replace(/["\\]/g, '\\$&');
}

export class ExplorerPreviews {
  private readonly host: PreviewHost;
  private readonly pages = new Map<string, PageState>();
  private related: RelatedState | null = null;
  private relatedSequence = 0;

  constructor(host: PreviewHost) {
    this.host = host;
  }

  private key(selection: ExploreSelection, entityId: string): string {
    return `${selectionKey(selection)}\u0000${entityId}`;
  }

  /** Preview markup for an entity of the shown selection. */
  render(selection: ExploreSelection | undefined, entity: ExploreEntity): string {
    const page = selection ? this.pages.get(this.key(selection, entity.id))?.page : undefined;
    return renderEntityPreview(this.host.scope, entity, page, this.host.configured && Boolean(selection));
  }

  open(selection: ExploreSelection, entityId: string): void {
    const key = this.key(selection, entityId);
    if (this.pages.has(key) || !this.host.configured) return;
    const state: PageState = { selection, entityId, cursors: [''], starts: [0], page: { status: 'loading', page: 0, start: 0 }, controller: null };
    this.pages.set(key, state);
    this.load(state, 0, this.samplesRead, () => this.host.update(`samples:${entityId}:hide`));
  }

  hide(selection: ExploreSelection, entityId: string): void {
    const key = this.key(selection, entityId);
    this.pages.get(key)?.controller?.abort();
    this.pages.delete(key);
    this.host.update(`samples:${entityId}:open`);
  }

  /** Move a preview (`delta` -1/+1) or read its current page again (0). */
  turn(selection: ExploreSelection, entityId: string, delta: -1 | 0 | 1): void {
    const state = this.pages.get(this.key(selection, entityId));
    if (!state) return;
    const target = state.page.page + delta;
    const focus = `samples:${entityId}:${delta < 0 ? 'previous' : delta > 0 ? 'next' : 'retry'}`;
    if (target < 0 || target >= state.cursors.length) return;
    this.load(state, target, this.samplesRead, () => this.host.update(focus));
  }

  openRelated(selection: ExploreSelection, metadata: ExploreMetadata, entityId: string, recordKey: string, relationshipId: string, invoker: HTMLElement | null): void {
    const source = metadata.entities.find((entity) => entity.id === entityId);
    const relationship = source?.relationships.find((candidate) => candidate.id === relationshipId);
    if (!source || !relationship || !this.host.configured) return;
    this.closeRelated(false);
    const target = metadata.entities.find((entity) => entity.id === relationship.entity_id);
    const page: SamplePage = { status: 'loading', page: 0, start: 0 };
    this.relatedSequence += 1;
    const drawer = new ConsoleDrawer({
      root: this.host.root,
      id: `${this.host.scope}-related-${this.relatedSequence}`,
      panelID: 'explore',
      actionID: 'related',
      title: relationship.label,
      eyebrow: 'Related records',
      body: renderRelatedBody(this.host.scope, source, target, recordKey, page),
      invoker,
      // A re-rendered table replaced the invoker: focus the same row control.
      fallbackFocus: () => this.host.fallbackFocus(`related:${entityId}:${recordKey}:${relationshipId}`),
      onClose: () => {
        if (this.related?.drawer === drawer) {
          this.related.controller?.abort();
          this.related = null;
        }
      },
    });
    const state: RelatedState = { selection, entityId, cursors: [''], starts: [0], page, controller: null, source, target, recordKey, relationshipId, drawer };
    this.related = state;
    this.load(state, 0, this.relatedRead, () => this.updateRelated());
  }

  turnRelated(delta: -1 | 0 | 1): void {
    const state = this.related;
    if (!state) return;
    const target = state.page.page + delta;
    if (target < 0 || target >= state.cursors.length) return;
    this.load(state, target, this.relatedRead, () => this.updateRelated());
  }

  closeRelated(restoreFocus = true): void {
    const state = this.related;
    this.related = null;
    state?.controller?.abort();
    state?.drawer.close(restoreFocus);
  }

  /** True when the element belongs to this explorer's open related drawer. */
  ownsDrawerElement(element: Element): boolean {
    return Boolean(this.related?.drawer.isOpen() && this.related.drawer.dialog.contains(element));
  }

  /** Abort every read, forget every page and close the drawer. */
  clear(): void {
    this.pages.forEach((state) => state.controller?.abort());
    this.pages.clear();
    this.closeRelated(false);
  }

  /**
   * Keep previews of the shown selection and mark them for authorization
   * again (`revalidate` reads them once shown); previews of any other
   * selection are aborted and forgotten.
   */
  markStale(selection: ExploreSelection | undefined): void {
    const keep = selection ? selectionKey(selection) : '';
    this.pages.forEach((state, key) => {
      if (selectionKey(state.selection) !== keep) {
        state.controller?.abort();
        this.pages.delete(key);
        return;
      }
      state.stale = true;
    });
    const related = this.related;
    if (related && selectionKey(related.selection) === keep) related.stale = true;
    else this.closeRelated(false);
  }

  /** Read every stale shown page again in the background, keeping it on screen meanwhile. */
  revalidate(): void {
    this.pages.forEach((state) => this.revalidatePage(state, this.samplesRead, () => this.host.update()));
    if (this.related) this.revalidatePage(this.related, this.relatedRead, () => this.updateRelated());
  }

  private revalidatePage(state: PageState, read: PageRead, render: () => void): void {
    // A page being navigated is already a fresh read.
    if (!state.stale || state.controller || state.page.status === 'loading') return;
    state.stale = false;
    const index = state.page.page;
    const shown = state.page;
    const controller = new AbortController();
    state.controller = controller;
    void read(state, state.cursors[index] ?? '', controller.signal).then((result) => {
      if (controller.signal.aborted || state.controller !== controller || !this.isCurrent(state)) return;
      state.controller = null;
      if (!result.ok) {
        if (!WITHDRAWING_FAILURES.has(result.failure.kind)) return;
        state.page = { status: 'failed', page: index, start: shown.start, failure: result.failure };
        render();
        return;
      }
      if (shown.status === 'ready' && pageContent(shown.value) === pageContent(result.value)) return;
      this.applyPage(state, index, result.value);
      render();
    });
  }

  private readonly samplesRead: PageRead = (state, cursor, signal) =>
    this.host.transport.samples({ selection: state.selection, entityId: state.entityId, cursor, limit: SAMPLE_PAGE_LIMIT }, signal);

  private readonly relatedRead: PageRead = (state, cursor, signal) => {
    const related = state as RelatedState;
    const relationship = related.source.relationships.find((candidate) => candidate.id === related.relationshipId);
    return this.host.transport.related({
      selection: state.selection,
      entityId: state.entityId,
      cursor,
      limit: SAMPLE_PAGE_LIMIT,
      recordKey: related.recordKey,
      relationshipId: related.relationshipId,
      relatedEntityId: relationship?.entity_id || state.entityId,
    }, signal);
  };

  private isCurrent(state: PageState): boolean {
    if (state === this.related) return true;
    return this.pages.get(this.key(state.selection, state.entityId)) === state;
  }

  private load(state: PageState, index: number, read: PageRead, render: () => void): void {
    state.stale = false;
    state.controller?.abort();
    const controller = new AbortController();
    state.controller = controller;
    const paged = state.page.status === 'ready' && (state.page.page > 0 || state.page.hasNext);
    state.page = { status: 'loading', page: index, start: state.starts[index] ?? 0, paged };
    render();
    void read(state, state.cursors[index] ?? '', controller.signal).then((result) => {
      // Only the newest read of a preview that still exists may land.
      if (controller.signal.aborted || state.controller !== controller || !this.isCurrent(state)) return;
      state.controller = null;
      if (!result.ok) {
        state.page = { status: 'failed', page: index, start: state.starts[index] ?? 0, failure: result.failure };
      } else {
        this.applyPage(state, index, result.value);
      }
      render();
    });
  }

  /** Show `value` as page `index` and keep the cursor to the next page. */
  private applyPage(state: PageState, index: number, value: ExploreSamples): void {
    const start = state.starts[index] ?? 0;
    const next = value.next_cursor;
    state.cursors = state.cursors.slice(0, index + 1);
    state.starts = state.starts.slice(0, index + 1);
    if (next) {
      state.cursors.push(next);
      state.starts.push(start + value.rows.length);
    }
    state.page = { status: 'ready', page: index, start, value, hasNext: Boolean(next) };
  }

  private updateRelated(): void {
    const state = this.related;
    if (!state || !state.drawer.isOpen()) return;
    const body = state.drawer.dialog.querySelector<HTMLElement>('[data-explorer-related-body]');
    if (!body) return;
    const active = this.host.root.ownerDocument.activeElement;
    const focus = active instanceof HTMLElement && body.contains(active) ? active.getAttribute('data-explorer-focus') || '' : '';
    const template = body.ownerDocument.createElement('template');
    template.innerHTML = renderRelatedBody(this.host.scope, state.source, state.target, state.recordKey, state.page);
    const next = template.content.firstElementChild;
    if (!next) return;
    body.replaceWith(next);
    if (focus) next.querySelector<HTMLElement>(`[data-explorer-focus="${cssEscape(focus)}"]`)?.focus();
  }
}
