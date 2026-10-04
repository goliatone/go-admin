// Data explorer controller: the read-only Explore panel of the Data console.
// It renders dataset cards and descriptive details from the catalog records
// of its own panel and the Scenarios rows the actor already received, and
// loads declared descriptions,
// record previews and related records lazily through the Data module's
// explore routes. Reads are bounded and cancellable; switching selection
// aborts the old reads and a late answer for any other selection is discarded.
// Denial and disposal drop everything loaded. No lifecycle action is offered.
// When the page offers insights routes, Insights and Compare sections load the
// insights module on demand; it reads only the pinned selection. When it
// offers application preview routes, the App preview section loads the
// preview module on demand for the pinned prepared receipt. A Data page URL
// with an exact `selection` (the return link of an application preview) opens
// that selection's details once the first authorized snapshot arrives.

import { readConsoleBootstrap, type ConsoleRuntime, type ConsoleRuntimeChange } from './runtime.js';
import type { ServerPanelConsoleRenderer } from './schema/hydrate.js';
import {
  buildCatalog,
  cardScenario,
  scenarioContexts,
  targetActiveSelection,
  type CatalogDataset,
  type CatalogScenario,
} from './data-explorer/catalog.js';
import { parseSelection, selectionKey, type ExploreContext, type ExploreSelection } from './data-explorer/contract.js';
import { ExplorerPreviews, WITHDRAWING_FAILURES } from './data-explorer/previews.js';
import {
  createHTTPExplorerTransport,
  readExplorerRoutes,
  readInsightsRoutes,
  readPreviewRoutes,
  unconfiguredExplorerTransport,
  type ExplorerTransport,
} from './data-explorer/transport.js';
import {
  availableMetadata,
  explorerSections,
  isInsightsSection,
  renderCatalog,
  renderDetails,
  scenarioStatus,
  scenarioTitle,
  type ExplorerDrift,
  type ExplorerSection,
  type InsightsSectionID,
  type MetadataEntry,
} from './data-explorer/view.js';
import type { DataInsights } from './data-insights/controller.js';
import type { InsightsRoutes, InsightsTransport } from './data-insights/transport.js';
import type { DataPreview } from './data-preview/controller.js';
import { generateRequestID } from './requests.js';
import type { PreviewRoutes, PreviewTransport } from './data-preview/transport.js';
import { forgetLaunches, launchStoreScope } from './data-preview/keys.js';

/** Panel ID of the explorer in the Data console. */
export const DATA_EXPLORE_PANEL = 'explore';

const CATALOG_PANELS = new Set([DATA_EXPLORE_PANEL, 'scenarios', 'overview']);

/** Shown content of a description: a read time alone is not a change. */
function entryContent(entry: MetadataEntry | undefined): string {
  if (!entry) return '';
  if (entry.status === 'ready') {
    const { observed_at: _observed, ...content } = entry.value;
    return JSON.stringify(['ready', content]);
  }
  return entry.status === 'failed' ? JSON.stringify(['failed', entry.failure.kind]) : 'loading';
}
const DEFAULT_CARD_LIMIT = 12;
const DEFAULT_CONCURRENCY = 3;
/** Loaded descriptions kept per explorer (oldest first out). */
const ENTRY_LIMIT = 48;

export type DataExplorerOptions = {
  /** Read seam; defaults to the page's explore routes (unsupported when absent). */
  transport?: ExplorerTransport;
  /** Cards shown before "Show more". */
  cardLimit?: number;
  /** Concurrent card description reads. */
  concurrency?: number;
  /**
   * Insight reads; defaults to the page's insights routes. Without them (or
   * with `false`) the details offer no Insights or Compare section.
   */
  insights?: { routes?: InsightsRoutes; transport?: InsightsTransport } | false;
  /**
   * Application preview requests; defaults to the page's preview routes.
   * Without them (or with `false`) the details offer no App preview section.
   */
  preview?: { routes?: PreviewRoutes; transport?: PreviewTransport; generate?: () => string; now?: () => number } | false;
};

type ExplorerView = 'catalog' | 'details';

let explorerSequence = 0;

function frame(callback: () => void): void {
  if (typeof queueMicrotask === 'function') queueMicrotask(callback);
  else void Promise.resolve().then(callback);
}

function cssEscape(value: string): string {
  return typeof CSS !== 'undefined' && typeof CSS.escape === 'function' ? CSS.escape(value) : value.replace(/["\\]/g, '\\$&');
}

type PreviewSource = Exclude<DataExplorerOptions['preview'], false | undefined>;

/** The exact selection in the page URL's `selection` parameter, if any. */
function readSelectionLink(doc: Document): ExploreSelection | null {
  try {
    const raw = new URL(doc.location?.href || '').searchParams.get('selection');
    return raw ? parseSelection(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

/** Remove the `selection` parameter, so a reload or later navigation does not reopen it. */
function dropSelectionLink(doc: Document): void {
  try {
    const url = new URL(doc.location.href);
    if (!url.searchParams.has('selection')) return;
    url.searchParams.delete('selection');
    doc.defaultView?.history.replaceState(doc.defaultView.history.state, '', `${url.pathname}${url.search}${url.hash}`);
  } catch {
    // Without history support the parameter stays; it is applied only once per page.
  }
}

/**
 * Where application previews are managed, or null when the page offers none.
 * Options may supply a transport, routes, generator or clock; routes default
 * to the page's own bootstrap. A custom explore transport implies no routes.
 */
function previewSource(root: HTMLElement, options: DataExplorerOptions): PreviewSource | null {
  if (options.preview === false) return null;
  const declared = options.preview || {};
  if (declared.transport) return declared;
  const routes = options.transport ? undefined : declared.routes || readPreviewRoutes(root) || undefined;
  return routes ? { ...declared, routes } : null;
}

export class DataExplorer {
  readonly root: HTMLElement;
  /** Console renderer for the Explore panel; reads only this explorer's state. */
  readonly renderer: ServerPanelConsoleRenderer;

  private readonly transport: ExplorerTransport;
  private readonly configured: boolean;
  private readonly scope: string;
  private readonly concurrency: number;
  private readonly entries = new Map<string, MetadataEntry>();
  private readonly pending = new Map<string, AbortController>();
  /** Loaded descriptions a new snapshot asked to authorize again once shown. */
  private readonly stale = new Set<string>();
  private readonly cleanup: Array<() => void> = [];
  private readonly previews: ExplorerPreviews;
  private runtime: ConsoleRuntime | null = null;
  private catalog: CatalogDataset[] = [];
  private catalogSignature = '';
  private view: ExplorerView = 'catalog';
  private datasetKey = '';
  private scenarioKey = '';
  private context: ExploreContext = 'catalog_example';
  /** The exact selection the details show; changes only by the operator's choice. */
  private pinned: ExploreSelection | undefined;
  private section: ExplorerSection = 'about';
  private cardLimit: number;
  private focusRequest = '';
  private disposed = false;
  /** The runtime is rendering this panel from `markup()`; skip in-place updates. */
  private rendering = false;
  /** Technical identity disclosure state, kept across re-renders. */
  private identityOpen = false;
  /** Where insights read from; null when the page offers none. */
  private readonly insightsSource: { routes?: InsightsRoutes; transport?: InsightsTransport } | null;
  /** The insights module's controller, once loaded. */
  private insights: DataInsights | null = null;
  private insightsLoading = false;
  private insightsFailed = false;
  /** Where application previews are managed; null when the page offers none. */
  private readonly previewSource: PreviewSource | null;
  /** The application preview module's controller, once loaded. */
  private appPreview: DataPreview | null = null;
  private previewLoading = false;
  private previewFailed = false;
  /** An exact selection the page URL asks to open, until the first ready snapshot. */
  private deepLink: ExploreSelection | null = null;

  constructor(root: HTMLElement, options: DataExplorerOptions = {}) {
    this.root = root;
    const routes = options.transport ? null : readExplorerRoutes(root);
    this.configured = Boolean(options.transport || routes);
    this.transport = options.transport || (routes ? createHTTPExplorerTransport(routes) : unconfiguredExplorerTransport);
    this.scope = `data-explorer-${(explorerSequence += 1)}`;
    this.cardLimit = Math.max(1, Math.floor(options.cardLimit || DEFAULT_CARD_LIMIT));
    this.concurrency = Math.max(1, Math.floor(options.concurrency || DEFAULT_CONCURRENCY));
    this.previews = new ExplorerPreviews({
      root,
      scope: this.scope,
      transport: this.transport,
      configured: this.configured,
      update: (focus) => this.update(focus),
      fallbackFocus: (key) => this.container()?.querySelector<HTMLElement>(`[data-explorer-focus="${cssEscape(key)}"]`)
        || this.container()?.querySelector<HTMLElement>('[data-explorer-section-panel]') || null,
    });
    this.renderer = () => this.renderForRuntime();
    const insightsRoutes = options.insights === false || options.insights?.transport || options.transport ? null : readInsightsRoutes(root);
    const source = options.insights ? options.insights : insightsRoutes ? { routes: insightsRoutes } : null;
    this.insightsSource = this.configured && source && (source.routes || source.transport) ? source : null;
    this.previewSource = this.configured ? previewSource(root, options) : null;
    this.deepLink = this.configured ? readSelectionLink(root.ownerDocument) : null;
  }

  /** Bind to the mounted runtime: follow its records and handle explorer controls. */
  attach(runtime: ConsoleRuntime): void {
    if (this.disposed || this.runtime) return;
    this.runtime = runtime;
    this.listen('click', (event) => this.handleClick(event));
    this.listen('change', (event) => this.handleChange(event));
    this.listen('keydown', (event) => this.handleKeydown(event as KeyboardEvent));
    // `toggle` does not bubble: listen in the capture phase.
    this.listen('toggle', (event) => {
      const disclosure = this.owned(event.target, '[data-explorer-disclosure="identity"]');
      if (disclosure?.tagName === 'DETAILS') this.identityOpen = (disclosure as HTMLDetailsElement).open;
    }, true);
    this.syncCatalog();
    this.applyDeepLink();
    this.update();
  }

  /**
   * Runtime change hook. Denial and disposal drop everything. A new authorized
   * snapshot (including the host's periodic revalidation) keeps what is shown
   * and authorizes it again in the background: content changes only when the
   * answer differs or a policy failure withdraws it. Record changes refresh
   * the catalog.
   */
  handleRuntimeChange(change: ConsoleRuntimeChange): void {
    if (this.disposed) return;
    if (change.state === 'denied' || change.state === 'disposed') {
      // A console that lost access also forgets the previews this tab remembers,
      // even when the preview module was never loaded.
      if (change.state === 'denied') {
        this.appPreview?.clear(true);
        if (this.previewSource) forgetLaunches(launchStoreScope(readConsoleBootstrap(this.root)));
      }
      this.reset();
      if (change.state === 'disposed') this.destroy();
      return;
    }
    if (change.state !== 'ready' || !this.runtime) return;
    if (change.snapshot) {
      const changed = this.syncCatalog();
      if (this.applyDeepLink()) return;
      this.entries.forEach((entry, key) => {
        if (entry.status !== 'loading' && !this.pending.has(key)) this.stale.add(key);
      });
      this.previews.markStale(this.drift() ? undefined : this.selection());
      this.insights?.markStale();
      this.insights?.reconcile();
      this.appPreview?.markStale();
      // A hidden explorer authorizes again only once it is shown.
      if (changed) this.update();
      else if (this.container()) this.revalidateShown();
      return;
    }
    if (change.panels.some((panel) => CATALOG_PANELS.has(panel)) && this.syncCatalog()) {
      this.insights?.reconcile();
      this.update();
    }
  }

  destroy(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.reset();
    this.insights = null;
    this.appPreview?.destroy();
    this.appPreview = null;
    this.cleanup.splice(0).forEach((release) => release());
    this.runtime = null;
  }

  // -------------------------------------------------------------------------
  // State

  /** Abort every description read and forget every loaded description. */
  private forgetDescriptions(): void {
    this.pending.forEach((controller) => controller.abort());
    this.pending.clear();
    this.entries.clear();
    this.stale.clear();
  }

  private reset(): void {
    this.forgetDescriptions();
    this.previews.clear();
    this.insights?.clear();
    this.appPreview?.clear();
    this.catalog = [];
    this.catalogSignature = '';
    this.view = 'catalog';
    this.datasetKey = '';
    this.scenarioKey = '';
    this.context = 'catalog_example';
    this.pinned = undefined;
    this.section = 'about';
  }

  /** Rebuild the catalog from the authorized panels; true when it changed. */
  private syncCatalog(): boolean {
    if (!this.runtime || this.runtime.getState() !== 'ready') return false;
    const catalog = buildCatalog(this.runtime.getPanelData(DATA_EXPLORE_PANEL), this.runtime.getPanelData('scenarios'), this.runtime.getPanelData('overview'));
    const signature = JSON.stringify(catalog);
    if (signature === this.catalogSignature) return false;
    this.catalog = catalog;
    this.catalogSignature = signature;
    this.reconcileSelection();
    return true;
  }

  /**
   * A gone dataset returns to the catalog. Otherwise the pinned selection is
   * kept: when its receipt, generation or context changed, its reads stop and
   * its content is dropped until the operator refreshes or reselects.
   */
  private reconcileSelection(): void {
    if (this.view !== 'details') return;
    if (!this.dataset()) {
      this.view = 'catalog';
      this.pinned = undefined;
      this.previews.clear();
      this.insights?.clear();
      this.appPreview?.show(undefined);
      this.focusRequest = 'catalog';
      return;
    }
    if (this.drift() && this.pinned) {
      this.cancel(this.pinned);
      this.entries.delete(selectionKey(this.pinned));
      this.previews.clear();
      this.insights?.clear();
      // Launches stay keyed by their own receipt; nothing of a drifted selection is shown.
      this.appPreview?.show(undefined);
    }
  }

  /**
   * Open the details of the exact selection the page URL names (once, on the
   * first authorized snapshot) and drop it from the URL. The selection is
   * pinned as given: if the snapshot offers another receipt now, the details
   * explain the change instead of repinning. Prepared receipts land on App
   * preview when the page offers it. True when the details were opened.
   */
  private applyDeepLink(): boolean {
    const target = this.deepLink;
    if (!target || !this.runtime || this.runtime.getState() !== 'ready') return false;
    this.deepLink = null;
    dropSelectionLink(this.root.ownerDocument);
    const dataset = this.catalog.find((candidate) => candidate.provider === target.dataset.provider && candidate.datasetId === target.dataset.id
      && candidate.version === target.dataset.version && candidate.digest.length > 0 && target.dataset.digest.startsWith(candidate.digest));
    const scenario = dataset?.scenarios.find((candidate) => scenarioContexts(candidate).some((context) => {
      const offered = candidate.selections[context];
      return offered?.scenario.id === target.scenario.id && offered.scenario.version === target.scenario.version
        && offered.scenario.profile_hash === target.scenario.profile_hash;
    }));
    if (!dataset || !scenario) return false;
    this.view = 'details';
    this.datasetKey = dataset.key;
    this.scenarioKey = scenario.key;
    this.context = target.context;
    this.pinned = target;
    this.insights?.show(target);
    this.appPreview?.show(target);
    this.section = target.context === 'prepared' && this.previewSource ? 'app-preview' : 'about';
    this.focusRequest = this.section === 'app-preview' ? 'section-panel' : 'title';
    // Selecting an already active panel renders nothing: render the details either way.
    this.runtime.selectPanel(DATA_EXPLORE_PANEL);
    this.update();
    return true;
  }

  /** How the pinned selection differs from the one the snapshot offers now. */
  private drift(): ExplorerDrift {
    if (this.view !== 'details' || !this.pinned) return '';
    const current = this.currentSelection();
    if (!current) return 'unavailable';
    return selectionKey(current) === selectionKey(this.pinned) ? '' : 'changed';
  }

  /** Pin the scenario/context the controls name, exactly as the snapshot offers it. */
  private pin(): void {
    this.pinned = this.currentSelection();
    this.insights?.show(this.pinned);
    this.appPreview?.show(this.pinned);
  }

  /** Detail sections; Insights and Compare, and App preview, only when the page offers them. */
  private sections(): ReadonlyArray<{ id: ExplorerSection; label: string }> {
    return explorerSections(Boolean(this.insightsSource), Boolean(this.previewSource));
  }

  private dataset(): CatalogDataset | undefined {
    return this.catalog.find((dataset) => dataset.key === this.datasetKey);
  }

  private scenario(): CatalogScenario | undefined {
    return this.dataset()?.scenarios.find((scenario) => scenario.key === this.scenarioKey);
  }

  /** What the details show and read: the pinned selection. */
  private selection(): ExploreSelection | undefined {
    return this.view === 'details' ? this.pinned : undefined;
  }

  private currentSelection(): ExploreSelection | undefined {
    return this.scenario()?.selections[this.context];
  }

  private entryFor(selection: ExploreSelection | undefined): MetadataEntry | undefined {
    return selection ? this.entries.get(selectionKey(selection)) : undefined;
  }

  // -------------------------------------------------------------------------
  // Reads

  /** Start a bounded description read for `selection` unless one exists. */
  private load(selection: ExploreSelection, force = false): void {
    const key = selectionKey(selection);
    if (!force && (this.entries.has(key) || this.pending.has(key))) return;
    this.pending.get(key)?.abort();
    const controller = new AbortController();
    this.pending.set(key, controller);
    this.store(key, { status: 'loading' });
    void this.transport.metadata(selection, controller.signal).then((result) => {
      // Only the request that is still current for this exact selection may land.
      if (this.disposed || controller.signal.aborted || this.pending.get(key) !== controller) return;
      this.pending.delete(key);
      this.store(key, result.ok ? { status: 'ready', value: result.value } : { status: 'failed', failure: result.failure });
      this.update();
    });
  }

  private store(key: string, entry: MetadataEntry): void {
    this.entries.delete(key);
    this.entries.set(key, entry);
    for (const candidate of this.entries.keys()) {
      if (this.entries.size <= ENTRY_LIMIT) break;
      if (!this.pending.has(candidate)) this.entries.delete(candidate);
    }
  }

  /** Selections whose descriptions are on screen now. */
  private shownSelections(): ExploreSelection[] {
    if (this.view === 'details') {
      const selection = this.drift() ? undefined : this.selection();
      return selection ? [selection] : [];
    }
    return this.catalog.slice(0, this.cardLimit)
      .map((dataset) => cardScenario(dataset)?.selections.catalog_example)
      .filter((selection): selection is ExploreSelection => Boolean(selection));
  }

  /** Authorize shown, stale descriptions again in the background. */
  private revalidateShown(): void {
    if (this.configured) {
      this.shownSelections().forEach((selection) => {
        const key = selectionKey(selection);
        if (!this.stale.has(key) || this.pending.has(key)) return;
        this.stale.delete(key);
        this.reauthorize(selection, key);
      });
    }
    if (this.view === 'details' && !this.drift()) {
      this.previews.revalidate();
      if (isInsightsSection(this.section)) this.insights?.revalidate(this.section);
      if (this.section === 'app-preview') this.appPreview?.revalidate();
    }
  }

  private reauthorize(selection: ExploreSelection, key: string): void {
    const controller = new AbortController();
    this.pending.set(key, controller);
    void this.transport.metadata(selection, controller.signal).then((result) => {
      if (this.disposed || controller.signal.aborted || this.pending.get(key) !== controller) return;
      this.pending.delete(key);
      // Transient failures keep what is shown; a later snapshot tries again.
      if (!result.ok && !WITHDRAWING_FAILURES.has(result.failure.kind)) return;
      const next: MetadataEntry = result.ok ? { status: 'ready', value: result.value } : { status: 'failed', failure: result.failure };
      const unchanged = entryContent(this.entries.get(key)) === entryContent(next);
      this.store(key, next);
      if (!unchanged) this.update();
    });
  }

  /** Abort a superseded details read so it can neither land nor keep working. */
  private cancel(selection: ExploreSelection | undefined): void {
    if (!selection) return;
    const key = selectionKey(selection);
    const controller = this.pending.get(key);
    if (!controller) return;
    controller.abort();
    this.pending.delete(key);
    this.entries.delete(key);
  }

  /** Card descriptions load lazily for shown cards, a few at a time. */
  private loadCards(): void {
    if (!this.configured || this.view !== 'catalog') return;
    for (const dataset of this.catalog.slice(0, this.cardLimit)) {
      if (this.pending.size >= this.concurrency) return;
      const selection = cardScenario(dataset)?.selections.catalog_example;
      if (selection) this.load(selection);
    }
  }

  private loadDetails(): void {
    const selection = this.selection();
    if (this.configured && selection && !this.drift()) this.load(selection);
  }

  // -------------------------------------------------------------------------
  // Rendering

  private renderForRuntime(): string {
    this.rememberFocus();
    this.rendering = true;
    try {
      if (this.runtime) this.syncCatalog();
      return this.markup();
    } finally {
      this.rendering = false;
      frame(() => this.afterRender());
    }
  }

  private markup(): string {
    if (!this.runtime || this.runtime.getState() !== 'ready') {
      return `<div class="console-explorer" data-data-explorer data-explorer-view="loading"><div class="console-explorer__loading" role="status" aria-busy="true">Loading datasets…</div></div>`;
    }
    return `<div class="console-explorer" data-data-explorer data-explorer-view="${this.view}">${this.view === 'details' && this.dataset() ? this.detailsMarkup() : this.catalogMarkup()}</div>`;
  }

  private catalogMarkup(): string {
    const cards = new Map<string, MetadataEntry | undefined>();
    const explorable = new Set<string>();
    this.catalog.forEach((dataset) => {
      const selection = cardScenario(dataset)?.selections.catalog_example;
      cards.set(dataset.key, this.entryFor(selection));
      if (selection) explorable.add(dataset.key);
    });
    return renderCatalog({ scope: this.scope, configured: this.configured, datasets: this.catalog, cards, explorable, limit: this.cardLimit });
  }

  private detailsMarkup(): string {
    const dataset = this.dataset() as CatalogDataset;
    const selection = this.selection();
    const drift = this.drift();
    return renderDetails({
      scope: this.scope,
      configured: this.configured,
      dataset,
      scenario: this.scenario(),
      scenarioKey: this.scenarioKey,
      context: this.context,
      selection,
      drift,
      current: this.currentSelection(),
      section: this.section,
      // Content of a drifted selection is never shown.
      entry: drift ? undefined : this.entryFor(selection),
      base: this.root.ownerDocument.location?.href || 'http://localhost/',
      identityOpen: this.identityOpen,
      preview: (entity) => this.previews.render(selection, entity),
      sections: this.sections(),
      insights: (section) => this.insightsMarkup(section, selection as ExploreSelection),
      appPreview: () => this.appPreviewMarkup(selection as ExploreSelection),
    });
  }

  /** App preview body: the module's view once loaded, else its loading state. */
  private appPreviewMarkup(selection: ExploreSelection): string {
    if (this.appPreview) {
      this.appPreview.show(selection);
      const scenario = this.scenario();
      return this.appPreview.render({
        title: this.selectionTitle(selection),
        status: scenarioStatus(scenario),
        activeReceipt: Boolean(selection.receipt_id) && scenario?.selections.active?.receipt_id === selection.receipt_id,
        base: this.root.ownerDocument.location?.href || 'http://localhost/',
      });
    }
    if (this.previewFailed) {
      return '<div class="console-callout console-explorer__state" data-tone="warning" role="alert" data-explorer-failure="preview-module"><p>Application preview could not be loaded.</p><div class="console-explorer__state-actions"><button type="button" class="console-btn console-btn--sm" data-explorer-action="preview-load" data-explorer-focus="preview-load">Try again</button></div></div>';
    }
    return '<div class="console-explorer__loading" role="status" aria-busy="true">Loading application preview…</div>';
  }

  /** Load the application preview module once the App preview section is shown. */
  private ensureAppPreview(): void {
    const source = this.previewSource;
    if (this.appPreview || this.previewLoading || !source || this.disposed) return;
    this.previewLoading = true;
    this.previewFailed = false;
    import('./data-preview.js').then((module) => {
      this.previewLoading = false;
      if (this.disposed) return;
      this.appPreview = module.createDataPreview({
        // The runtime's request ID generator, so the module shares the console's draft rules.
        generate: generateRequestID,
        // Remembered launches belong to this console identity only.
        storageScope: launchStoreScope(readConsoleBootstrap(this.root)),
        ...source,
        scope: `${this.scope}-preview`,
        update: (focus) => this.update(focus),
      });
      this.update();
    }, () => {
      this.previewLoading = false;
      this.previewFailed = true;
      this.update();
    });
  }

  /** Start the shown App preview section's capability read (loading the module first). */
  private loadAppPreview(): void {
    const selection = this.selection();
    if (this.view !== 'details' || this.section !== 'app-preview' || !selection || selection.context !== 'prepared' || this.drift()) return;
    if (!this.appPreview) {
      this.ensureAppPreview();
      return;
    }
    this.appPreview.show(selection);
    this.appPreview.load();
  }

  /** Insights or Compare body: the module's view once loaded, else its loading state. */
  private insightsMarkup(section: InsightsSectionID, selection: ExploreSelection): string {
    if (this.insights) {
      this.insights.show(selection);
      return this.insights.render(section);
    }
    if (this.insightsFailed) {
      return '<div class="console-callout console-explorer__state" data-tone="warning" role="alert" data-explorer-failure="insights-module"><p>Insights could not be loaded.</p><div class="console-explorer__state-actions"><button type="button" class="console-btn console-btn--sm" data-explorer-action="insights-load" data-explorer-focus="insights-load">Try again</button></div></div>';
    }
    return '<div class="console-explorer__loading" role="status" aria-busy="true">Loading insights…</div>';
  }

  /** Scenario title of a selection: declared by the shown description when known, else its lifecycle label. */
  private selectionTitle(selection: ExploreSelection): string {
    const dataset = this.catalog.find((candidate) => candidate.provider === selection.dataset.provider
      && candidate.datasetId === selection.dataset.id && candidate.version === selection.dataset.version);
    const scenario = dataset?.scenarios.find((candidate) => candidate.scenarioId === selection.scenario.id && candidate.version === selection.scenario.version);
    if (!dataset || !scenario) return `${selection.scenario.id} v${selection.scenario.version}`;
    const metadata = dataset.key === this.datasetKey && !this.drift() ? availableMetadata(this.entryFor(this.selection())) : undefined;
    return scenarioTitle(metadata, scenario);
  }

  /** Load the insights module once an Insights or Compare section is shown. */
  private ensureInsights(): void {
    const source = this.insightsSource;
    if (this.insights || this.insightsLoading || !source || this.disposed) return;
    this.insightsLoading = true;
    this.insightsFailed = false;
    import('./data-insights.js').then((module) => {
      this.insightsLoading = false;
      if (this.disposed) return;
      this.insights = module.createDataInsights({
        ...source,
        scope: `${this.scope}-insights`,
        update: (focus) => this.update(focus),
        dataset: () => this.dataset(),
        activeSelection: (targetId) => targetActiveSelection(this.runtime?.getPanelData('overview'), targetId),
        title: (selection) => this.selectionTitle(selection),
      });
      this.update();
    }, () => {
      this.insightsLoading = false;
      this.insightsFailed = true;
      this.update();
    });
  }

  /** Start the shown Insights or Compare section's reads (loading the module first). */
  private loadInsights(): void {
    if (this.view !== 'details' || !isInsightsSection(this.section) || !this.selection() || this.drift()) return;
    if (!this.insights) {
      this.ensureInsights();
      return;
    }
    this.insights.show(this.selection());
    this.insights.load(this.section);
  }

  private container(): HTMLElement | null {
    const panel = Array.from(this.root.querySelectorAll<HTMLElement>('[data-console-panel]'))
      .find((element) => element.closest('[data-console-root]') === this.root);
    return panel?.querySelector<HTMLElement>(':scope > [data-data-explorer]') || null;
  }

  /** Re-render the mounted explorer in place; state alone updates when hidden. */
  private update(focus = ''): void {
    if (focus) this.focusRequest = focus;
    const container = this.container();
    if (!container || this.disposed || this.rendering) return;
    this.rememberFocus();
    const template = this.root.ownerDocument.createElement('template');
    template.innerHTML = this.markup();
    const next = template.content.firstElementChild;
    if (next) container.replaceWith(next);
    this.afterRender();
  }

  private afterRender(): void {
    if (this.disposed || !this.container()) return;
    this.restoreFocus();
    this.loadDetails();
    this.loadInsights();
    this.loadAppPreview();
    this.revalidateShown();
    this.loadCards();
  }

  private rememberFocus(): void {
    if (this.focusRequest) return;
    const active = this.root.ownerDocument.activeElement;
    const container = this.container();
    if (active instanceof HTMLElement && container?.contains(active)) {
      // An unkeyed element keeps focus near it: its closest keyed ancestor (the section panel).
      this.focusRequest = active.closest('[data-explorer-focus]')?.getAttribute('data-explorer-focus') || '';
    }
  }

  private restoreFocus(): void {
    const key = this.focusRequest;
    this.focusRequest = '';
    if (!key) return;
    const container = this.container();
    const keyed = key === 'catalog'
      ? container?.querySelector<HTMLElement>('.console-explorer__catalog h3')
      : container?.querySelector<HTMLElement>(`[data-explorer-focus="${cssEscape(key)}"]`);
    // A control that left the re-rendered details hands focus to the section panel, never the page body.
    const target = keyed || (this.view === 'details' ? container?.querySelector<HTMLElement>('[data-explorer-section-panel]') : null);
    if (target) {
      if (key === 'catalog') target.setAttribute('tabindex', '-1');
      target.focus();
    }
  }

  // -------------------------------------------------------------------------
  // Controls

  private listen(type: string, handler: (event: Event) => void, capture = false): void {
    this.root.addEventListener(type, handler, capture);
    this.cleanup.push(() => this.root.removeEventListener(type, handler, capture));
  }

  private owned(target: EventTarget | null, selector: string): HTMLElement | null {
    const element = target instanceof Element ? target.closest<HTMLElement>(selector) : null;
    if (!element) return null;
    return this.container()?.contains(element) || this.previews.ownsDrawerElement(element) ? element : null;
  }

  private handleClick(event: Event): void {
    const insightsControl = this.owned(event.target, '[data-insights-action]');
    if (insightsControl) {
      event.preventDefault();
      this.insights?.handleClick(insightsControl);
      return;
    }
    const previewControl = this.owned(event.target, '[data-preview-action]');
    if (previewControl) {
      event.preventDefault();
      this.appPreview?.handleClick(previewControl);
      return;
    }
    const section = this.owned(event.target, '[data-explorer-section]');
    if (section) {
      this.selectSection(section.dataset.explorerSection || '', true);
      return;
    }
    const control = this.owned(event.target, '[data-explorer-action]');
    if (!control) return;
    event.preventDefault();
    // Unavailable controls stay focusable for keyboard users but never act.
    if (control.getAttribute('aria-disabled') === 'true') return;
    const action = control.dataset.explorerAction || '';
    if (action.startsWith('page-') || action.startsWith('samples') || action === 'related') {
      this.handleRecordControl(action, control);
      return;
    }
    switch (action) {
      case 'open': this.open(control.dataset.datasetKey || ''); break;
      case 'back': this.back(); break;
      case 'more': this.showMore(); break;
      case 'scenario': this.selectScenario(control.dataset.scenarioKey || '', true); break;
      case 'retry': this.retry(); break;
      case 'refresh': this.refreshSelection(); break;
      case 'insights-load':
        this.focusRequest = `section:${this.section}`;
        this.ensureInsights();
        this.update();
        break;
      case 'preview-load':
        this.focusRequest = `section:${this.section}`;
        this.ensureAppPreview();
        this.update();
        break;
      case 'prepared':
        this.selectContext('prepared', 'section-panel');
        break;
      default: break;
    }
  }

  /** Record previews of the shown selection and the related drawer. */
  private handleRecordControl(action: string, control: HTMLElement): void {
    const selection = this.selection();
    if (!selection || this.view !== 'details') return;
    const entityId = control.dataset.entityId || '';
    const delta = action === 'page-next' ? 1 : action === 'page-previous' ? -1 : 0;
    if (action.startsWith('page-') && control.hasAttribute('data-related-page')) {
      this.previews.turnRelated(delta);
    } else if (action.startsWith('page-')) {
      this.previews.turn(selection, entityId, delta);
    } else if (action === 'samples') {
      this.previews.open(selection, entityId);
    } else if (action === 'samples-hide') {
      this.previews.hide(selection, entityId);
    } else {
      const metadata = availableMetadata(this.entryFor(selection));
      if (metadata) {
        this.previews.openRelated(selection, metadata, entityId, control.dataset.recordKey || '', control.dataset.relationshipId || '', control);
      }
    }
  }

  private handleChange(event: Event): void {
    const insightsControl = this.owned(event.target, '[data-insights-control]');
    if (insightsControl) {
      this.insights?.handleChange(insightsControl);
      return;
    }
    const control = this.owned(event.target, '[data-explorer-control]');
    if (!control) return;
    if (control instanceof HTMLSelectElement && control.dataset.explorerControl === 'scenario') {
      this.selectScenario(control.value, false);
    } else if (control instanceof HTMLInputElement && control.dataset.explorerControl === 'context' && control.checked) {
      this.selectContext(control.value as ExploreContext);
    }
  }

  private handleKeydown(event: KeyboardEvent): void {
    const tab = this.owned(event.target, '[data-explorer-section]');
    if (!tab) return;
    const ids = this.sections().map((section) => section.id);
    const current = ids.indexOf(this.section);
    const moves: Record<string, number> = { ArrowRight: current + 1, ArrowLeft: current - 1, Home: 0, End: ids.length - 1 };
    if (!(event.key in moves)) return;
    event.preventDefault();
    const next = (moves[event.key] + ids.length) % ids.length;
    this.selectSection(ids[next], true);
  }

  private open(datasetKey: string): void {
    const dataset = this.catalog.find((candidate) => candidate.key === datasetKey);
    if (!dataset) return;
    this.view = 'details';
    this.datasetKey = dataset.key;
    this.scenarioKey = (cardScenario(dataset) || dataset.scenarios[0])?.key || '';
    this.context = scenarioContexts(this.scenario())[0] || 'catalog_example';
    this.pin();
    this.section = 'about';
    this.focusRequest = 'title';
    this.update();
  }

  private back(): void {
    this.cancel(this.selection());
    this.previews.clear();
    this.insights?.clear();
    this.appPreview?.show(undefined);
    const key = this.datasetKey;
    this.pinned = undefined;
    this.view = 'catalog';
    this.focusRequest = key ? `open:${key}` : 'catalog';
    this.update();
  }

  private showMore(): void {
    this.cardLimit += DEFAULT_CARD_LIMIT;
    const next = this.catalog[this.cardLimit - DEFAULT_CARD_LIMIT];
    this.focusRequest = next ? `open:${next.key}` : '';
    this.update();
  }

  private selectScenario(scenarioKey: string, focusTitle: boolean): void {
    const dataset = this.dataset();
    const scenario = dataset?.scenarios.find((candidate) => candidate.key === scenarioKey);
    if (!scenario || (scenario.key === this.scenarioKey && !this.drift())) return;
    this.cancel(this.selection());
    this.previews.clear();
    this.scenarioKey = scenario.key;
    const contexts = scenarioContexts(scenario);
    if (!contexts.includes(this.context)) this.context = contexts[0] || 'catalog_example';
    this.pin();
    this.focusRequest = focusTitle ? 'title' : 'scenario';
    this.update();
  }

  private selectContext(context: ExploreContext, focus = `context:${context}`): void {
    if ((context === this.context && !this.drift()) || !this.scenario()?.selections[context]) return;
    this.cancel(this.selection());
    this.previews.clear();
    this.context = context;
    this.pin();
    this.focusRequest = focus;
    this.update();
  }

  private selectSection(section: string, focus: boolean): void {
    const next = this.sections().find((candidate) => candidate.id === section);
    if (!next) return;
    this.section = next.id;
    this.focusRequest = focus ? `section:${next.id}` : '';
    this.update();
  }

  /** Try again: read the pinned selection's description and open previews again. */
  private retry(): void {
    const selection = this.selection();
    if (!selection || this.drift()) return;
    this.focusRequest = 'title';
    this.load(selection, true);
    this.previews.markStale(selection);
    this.previews.revalidate();
    this.update();
  }

  /**
   * Refresh: load the current authorized snapshot, then explore the scenario's
   * current selection. A stale receipt or generation is never repinned without
   * this explicit step.
   */
  private refreshSelection(): void {
    this.focusRequest = 'title';
    const repin = (): void => {
      if (this.disposed || this.view !== 'details' || !this.dataset()) return;
      const previous = this.pinned;
      const dataset = this.dataset() as CatalogDataset;
      if (!this.scenario()) this.scenarioKey = (cardScenario(dataset) || dataset.scenarios[0])?.key || '';
      const contexts = scenarioContexts(this.scenario());
      if (!contexts.includes(this.context)) this.context = contexts[0] || 'catalog_example';
      const next = this.currentSelection();
      if (!previous || !next || selectionKey(previous) !== selectionKey(next)) {
        // A moved selection keeps nothing the old one loaded.
        this.cancel(previous);
        if (previous) this.entries.delete(selectionKey(previous));
        this.previews.clear();
      } else {
        // Same selection: the new snapshot already re-read it unless refresh failed.
        if (this.entryFor(next)?.status === 'failed') this.load(next, true);
        this.insights?.refreshFailed();
        this.appPreview?.refreshFailed();
      }
      this.pinned = next;
      this.insights?.show(next);
      this.appPreview?.show(next);
      this.focusRequest = 'title';
      this.update();
    };
    if (!this.runtime) {
      repin();
      return;
    }
    void this.runtime.refresh().then(repin);
  }
}

export function createDataExplorer(root: HTMLElement, options: DataExplorerOptions = {}): DataExplorer {
  return new DataExplorer(root, options);
}
