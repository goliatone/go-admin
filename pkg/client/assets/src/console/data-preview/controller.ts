// Application preview controls bound into the explorer details. The explorer
// owns the catalog, the pinned selection, its drift and focus; this controller
// owns the capability read of the shown prepared selection and one launch per
// registered surface: its request ID draft, its session and its open, close
// and status requests. Launch requests follow the request draft rules
// (ADR-0003): an attempt without a definitive answer is retried with the same
// request ID, so the server reattaches to the session it may have created; a
// definitive answer or an ended session reserves a new ID for explicitly new
// work. Sessions are kept per exact selection and surface (bounded), so a
// preview opened here can still be closed after the operator looked
// elsewhere, and are remembered in this tab (see store.ts) so an operator who
// returns from a preview finds it again: a remembered session is shown only
// after the server answers a status read for it. Nothing for another
// selection is ever shown, and the browser never extends a session: the
// server decides expiry, this page only stops offering the launch link once
// the expiry passed on its clock.

import { selectionKey, type ExploreSelection } from '../data-explorer/contract.js';
import type { PreviewSession, PreviewSurface } from './contract.js';
import { LaunchStore, defaultLaunchStorage, type LaunchStorage, type StoredLaunch } from './store.js';
import {
  createHTTPPreviewTransport,
  unconfiguredPreviewTransport,
  type PreviewFailure,
  type PreviewRoutes,
  type PreviewTransport,
} from './transport.js';
import {
  ENDING_FAILURES,
  UNCERTAIN_FAILURES,
  renderPreview,
  sessionLive,
  type CapabilityEntry,
  type LaunchAction,
  type LaunchBusy,
  type LaunchView,
} from './view.js';

/** Launches kept across selections (oldest idle ones leave first). */
const LAUNCH_LIMIT = 16;

/** Failures that withdraw a shown capability on a background read; others keep it. */
const WITHDRAWING: ReadonlySet<PreviewFailure['kind']> = new Set(['denied', 'expired', 'gone', 'stale', 'invalid', 'unconfigured']);


export type PreviewHost = {
  /** Element ID prefix unique to the explorer. */
  scope: string;
  /** Re-render the explorer, then focus the element with this focus key. */
  update(focus?: string): void;
};

/** What the explorer knows about the shown selection's scenario row. */
export type PreviewContext = {
  title: string;
  status?: { label: string; tone: string };
  activeReceipt: boolean;
  /** Page URL that launch links must share an origin with. */
  base: string;
};

export type DataPreviewOptions = PreviewHost & {
  routes?: PreviewRoutes;
  transport?: PreviewTransport;
  /**
   * Request ID generator: the console's cryptographic UUID v4 generator
   * (`generateRequestID`), returning '' when the browser has no source.
   * Without one no new launch can be identified, so none is offered.
   */
  generate?: () => string;
  /** Clock for expiry decisions. */
  now?: () => number;
  /** Where launches are remembered across navigations (default: this tab's session storage; null: nowhere). */
  storage?: LaunchStorage | null;
  /** Console identity the remembered launches belong to (application, environment, actor, scope). */
  storageScope?: string;
};

type Launch = {
  key: string;
  selection: ExploreSelection;
  surfaceId: string;
  /** The surface as the capability offered it when this launch started. */
  surface: PreviewSurface;
  /** ID reserved for the next new launch; '' when the browser cannot create one. */
  nextID: string;
  /** The latest open request; `uncertain` replays its ID. */
  submitted: { id: string; state: 'pending' | 'uncertain' | 'settled' } | null;
  session: PreviewSession | null;
  busy: LaunchBusy;
  failure: { action: LaunchAction; failure: PreviewFailure } | null;
  controller: AbortController | null;
  /** A new snapshot asked for this session's state to be read again. */
  stale: boolean;
  /** Server clock minus this page's clock at the latest dated answer (ms). */
  skew: number;
  /** Session locator, known before the session's state when restored. */
  sessionId: string;
};

function launchKey(selection: ExploreSelection, surfaceId: string): string {
  return `${selectionKey(selection)}\u0000${surfaceId}`;
}

export class DataPreview {
  private readonly host: PreviewHost;
  private readonly transport: PreviewTransport;
  private readonly generate: () => string;
  private readonly now: () => number;
  private readonly identifiable: boolean;
  private readonly launches = new Map<string, Launch>();
  private readonly store: LaunchStore;
  private shown: ExploreSelection | undefined;
  private capability: CapabilityEntry | undefined;
  private capabilityRead: AbortController | null = null;
  /** The shown capability was authorized before the latest snapshot. */
  private capabilityStale = false;
  private expiryTimer: ReturnType<typeof setTimeout> | null = null;
  private disposed = false;

  constructor(options: DataPreviewOptions) {
    this.host = options;
    this.transport = options.transport || (options.routes ? createHTTPPreviewTransport(options.routes) : unconfiguredPreviewTransport);
    this.generate = options.generate || (() => '');
    this.now = options.now || Date.now;
    // A browser without a cryptographic source can never start new work.
    this.identifiable = Boolean(this.generate());
    this.store = new LaunchStore(options.storage === undefined ? defaultLaunchStorage() : options.storage, options.storageScope || '', this.now);
    this.restore();
  }

  /**
   * The explorer shows `selection` (undefined: nothing to preview). The
   * capability of any other selection is dropped; launches stay keyed by
   * their own exact selection.
   */
  show(selection: ExploreSelection | undefined): void {
    const next = selection?.context === 'prepared' ? selection : undefined;
    if (next && this.shown && selectionKey(next) === selectionKey(this.shown)) return;
    this.capabilityRead?.abort();
    this.capabilityRead = null;
    this.capability = undefined;
    this.capabilityStale = false;
    this.shown = next;
    this.revive();
    this.scheduleExpiry();
  }

  /** Section markup for the shown prepared selection. */
  render(context: PreviewContext): string {
    const shown = this.shown;
    if (!shown) return '';
    return renderPreview({
      scope: this.host.scope,
      selection: shown,
      title: context.title,
      status: context.status,
      activeReceipt: context.activeReceipt,
      capability: this.capability,
      launch: (surfaceId) => this.view(this.launches.get(launchKey(shown, surfaceId))),
      opened: Array.from(this.launches.values())
        .filter((launch) => (launch.session || launch.sessionId) && this.isShown(launch.selection))
        .map((launch) => launch.surface),
      identifiable: this.identifiable,
      base: context.base,
      now: this.now(),
    });
  }

  /** Read the shown selection's capability once (or again with `force`). */
  load(force = false): void {
    const shown = this.shown;
    if (!shown || this.disposed || (!force && this.capability)) return;
    this.readCapability(shown, false);
  }

  /** A new authorized snapshot: authorize what is shown again once shown. */
  markStale(): void {
    if (this.capability?.status === 'ready') this.capabilityStale = true;
    this.launches.forEach((launch) => {
      // Open sessions, and remembered ones whose state is still unknown, are read again.
      if (launch.session?.state === 'ready' || (launch.sessionId && !launch.session)) launch.stale = true;
    });
  }

  /** Background re-reads of the shown capability and its open sessions. */
  revalidate(): void {
    const shown = this.shown;
    if (!shown || this.disposed) return;
    if (this.capabilityStale && !this.capabilityRead) {
      this.capabilityStale = false;
      this.readCapability(shown, true);
    }
    this.launches.forEach((launch) => {
      if (launch.stale && !launch.busy && selectionKey(launch.selection) === selectionKey(shown)) {
        launch.stale = false;
        this.check(launch, false);
      }
    });
  }

  /** Handle a `[data-preview-action]` click; true when handled. */
  handleClick(control: HTMLElement): boolean {
    const action = control.dataset.previewAction || '';
    if (!action) return false;
    // Unavailable and busy controls stay focusable for keyboard users but never act.
    if (control.getAttribute('aria-disabled') === 'true') return true;
    const surfaceId = control.dataset.surfaceId || '';
    switch (action) {
      case 'retry':
        this.load(true);
        this.host.update('section-panel');
        return true;
      case 'open':
        this.open(surfaceId, false);
        return true;
      case 'new':
        this.open(surfaceId, true);
        return true;
      case 'close':
        this.close(surfaceId);
        return true;
      case 'check': {
        const launch = this.shownLaunch(surfaceId);
        if (launch && (launch.session || launch.sessionId) && !launch.busy) this.check(launch, true);
        return true;
      }
      default:
        return false;
    }
  }

  /**
   * After an explicit Refresh of the same selection: read the capability again
   * (a failed one in the foreground) and let launches a failure blocked start
   * again. Unanswered launches keep their request ID for replay.
   */
  refreshFailed(): void {
    const shown = this.shown;
    if (!shown || this.disposed) return;
    this.launches.forEach((launch) => {
      if (this.isShown(launch.selection) && launch.failure?.action === 'open' && launch.submitted?.state !== 'uncertain') launch.failure = null;
    });
    if (this.capability?.status === 'failed') this.load(true);
    else if (!this.capabilityRead) this.readCapability(shown, true);
  }

  /**
   * Abort every request and forget everything (denial or disposal). `forget`
   * also drops what this tab remembers, for a console that lost access.
   */
  clear(forget = false): void {
    if (forget) this.store.wipe();
    this.capabilityRead?.abort();
    this.capabilityRead = null;
    this.capability = undefined;
    this.capabilityStale = false;
    this.launches.forEach((launch) => {
      launch.controller?.abort();
      launch.controller = null;
    });
    this.launches.clear();
    this.shown = undefined;
    this.clearExpiry();
  }

  destroy(): void {
    this.clear();
    this.disposed = true;
  }

  // -------------------------------------------------------------------------

  private view(launch: Launch | undefined): LaunchView | undefined {
    if (!launch) return undefined;
    return {
      session: launch.session, now: this.clock(launch), busy: launch.busy, uncertain: launch.submitted?.state === 'uncertain', failure: launch.failure,
      remembered: !launch.session && Boolean(launch.sessionId),
    };
  }

  /** Launches remembered in this tab, before any of them is shown. */
  private restore(): void {
    this.store.read().forEach((entry) => {
      const key = launchKey(entry.selection, entry.surface.id);
      this.launches.set(key, {
        key, selection: entry.selection, surfaceId: entry.surface.id, surface: entry.surface, nextID: this.generate(),
        submitted: entry.request_id ? { id: entry.request_id, state: 'uncertain' } : null,
        session: null, busy: '', failure: null, controller: null, stale: false, skew: 0, sessionId: entry.session_id || '',
      });
    });
  }

  /** Remember launches with a session or an unanswered request, most recent last. */
  private persist(): void {
    const entries: StoredLaunch[] = [];
    this.launches.forEach((launch) => {
      const sessionId = launch.session?.session_id || launch.sessionId;
      const request = launch.submitted && launch.submitted.state !== 'settled' ? launch.submitted.id : '';
      if (!sessionId && !request) return;
      const entry: StoredLaunch = { selection: launch.selection, surface: launch.surface, at: this.now() };
      if (sessionId) entry.session_id = sessionId;
      if (request) entry.request_id = request;
      entries.push(entry);
    });
    this.store.write(entries);
  }

  /** Read the state of remembered sessions of the shown selection before showing them. */
  private revive(): void {
    if (!this.shown || this.disposed) return;
    this.launches.forEach((launch) => {
      if (launch.sessionId && !launch.session && !launch.busy && this.isShown(launch.selection)) this.check(launch, false);
    });
  }

  /** This page's clock, corrected by the server's for the launch's expiry decisions. */
  private clock(launch: Launch): number {
    return this.now() + launch.skew;
  }

  /** Follow the server's clock when its answer is dated (ignoring implausible skews over a day). */
  private dated(launch: Launch, serverTime: number | undefined): void {
    if (serverTime === undefined) return;
    const skew = serverTime - this.now();
    launch.skew = Math.abs(skew) <= 24 * 60 * 60 * 1000 ? skew : 0;
  }

  private shownLaunch(surfaceId: string): Launch | undefined {
    return this.shown ? this.launches.get(launchKey(this.shown, surfaceId)) : undefined;
  }

  private isShown(selection: ExploreSelection): boolean {
    return Boolean(this.shown) && selectionKey(this.shown as ExploreSelection) === selectionKey(selection);
  }

  /** Re-render only when the change belongs to what is shown. */
  private landed(launch: Launch, focus = ''): void {
    if (this.disposed) return;
    this.scheduleExpiry();
    if (this.isShown(launch.selection)) this.host.update(focus);
  }

  private readCapability(selection: ExploreSelection, background: boolean): void {
    this.capabilityRead?.abort();
    const controller = new AbortController();
    this.capabilityRead = controller;
    if (!background) this.capability = { status: 'loading' };
    void this.transport.capabilities(selection, controller.signal).then((result) => {
      if (this.disposed || controller.signal.aborted || this.capabilityRead !== controller) return;
      this.capabilityRead = null;
      const next: CapabilityEntry = result.ok ? { status: 'ready', value: result.value } : { status: 'failed', failure: result.failure };
      // Transient background failures keep what is shown; a later snapshot tries again.
      if (background && !result.ok && !WITHDRAWING.has(result.failure.kind)) return;
      const unchanged = background && JSON.stringify(this.capability) === JSON.stringify(next);
      this.capability = next;
      if (!unchanged) this.host.update();
    });
  }

  /** The surface the shown capability offers under `surfaceId`, if any. */
  private offeredSurface(surfaceId: string): PreviewSurface | undefined {
    const entry = this.capability;
    if (entry?.status !== 'ready' || !entry.value.supported) return undefined;
    return entry.value.surfaces.find((surface) => surface.id === surfaceId);
  }

  /** The launch of the shown selection for `surface`, created on first use. */
  private ensureLaunch(selection: ExploreSelection, surface: PreviewSurface): Launch {
    const key = launchKey(selection, surface.id);
    let launch = this.launches.get(key);
    if (launch) {
      // Most recently used last; the label follows the latest capability.
      launch.surface = surface;
      this.launches.delete(key);
      this.launches.set(key, launch);
      return launch;
    }
    launch = { key, selection, surfaceId: surface.id, surface, nextID: this.generate(), submitted: null, session: null, busy: '', failure: null, controller: null, stale: false, skew: 0, sessionId: '' };
    this.launches.set(key, launch);
    for (const [candidate, entry] of this.launches) {
      if (this.launches.size <= LAUNCH_LIMIT) break;
      if (!entry.busy && candidate !== key) this.launches.delete(candidate);
    }
    this.persist();
    return launch;
  }

  private open(surfaceId: string, fresh: boolean): void {
    const shown = this.shown;
    const surface = this.offeredSurface(surfaceId);
    if (!shown || this.disposed || !surface) return;
    const launch = this.ensureLaunch(shown, surface);
    if (launch.busy) return;
    // An open session is reached through its link; only an explicit new launch replaces it.
    if (!fresh && sessionLive(launch.session, this.clock(launch))) return;
    let id: string;
    if (!fresh && launch.submitted?.state === 'uncertain') {
      id = launch.submitted.id;
    } else {
      if (!launch.nextID) launch.nextID = this.generate();
      if (!launch.nextID) {
        this.host.update(`preview:open:${surfaceId}`);
        return;
      }
      id = launch.nextID;
      launch.nextID = this.generate();
      launch.session = null;
      launch.sessionId = '';
    }
    launch.submitted = { id, state: 'pending' };
    launch.busy = 'opening';
    launch.failure = null;
    launch.stale = false;
    // Remembered before it is sent: leaving the page mid-request must not lose its request ID.
    this.persist();
    const controller = new AbortController();
    launch.controller = controller;
    this.host.update(`preview:open:${surfaceId}`);
    void this.transport.open({ selection: launch.selection, surface_id: surfaceId, request_id: id }, controller.signal).then((result) => {
      if (this.disposed || launch.controller !== controller) return;
      launch.controller = null;
      launch.busy = '';
      const submitted = launch.submitted;
      if (result.ok) {
        if (submitted) submitted.state = 'settled';
        this.dated(launch, result.serverTime);
        launch.session = result.value;
        launch.sessionId = result.value.session_id;
        this.persist();
        this.landed(launch, sessionLive(result.value, this.clock(launch)) ? `preview:launch:${surfaceId}` : `preview:new:${surfaceId}`);
        return;
      }
      if (UNCERTAIN_FAILURES.has(result.failure.kind)) {
        // The server may have created the session: the next attempt replays this ID.
        if (submitted) submitted.state = 'uncertain';
      } else {
        launch.submitted = null;
      }
      launch.failure = { action: 'open', failure: result.failure };
      this.persist();
      this.landed(launch, `preview:open:${surfaceId}`);
    });
  }

  private close(surfaceId: string): void {
    const launch = this.shownLaunch(surfaceId);
    const session = launch?.session;
    if (!launch || !session || launch.busy || this.disposed) return;
    launch.busy = 'closing';
    launch.failure = null;
    const controller = new AbortController();
    launch.controller = controller;
    this.host.update(`preview:close:${surfaceId}`);
    const locator = { sessionId: session.session_id, selection: launch.selection, surfaceId };
    void this.transport.close(locator, controller.signal).then((result) => {
      if (this.disposed || launch.controller !== controller) return;
      launch.controller = null;
      launch.busy = '';
      if (result.ok) {
        this.dated(launch, result.serverTime);
        launch.session = result.value;
        this.persist();
        this.landed(launch, `preview:new:${surfaceId}`);
        return;
      }
      launch.failure = { action: 'close', failure: result.failure };
      // The server ended a session it no longer knows, lets this actor manage or can pin.
      if (ENDING_FAILURES.has(result.failure.kind) && launch.session) launch.session = { ...launch.session, state: 'unavailable', launch_url: '' };
      this.landed(launch, launch.session?.state === 'ready' ? `preview:close:${surfaceId}` : `preview:new:${surfaceId}`);
    });
  }

  /** Read the session's current state; `explicit` checks keep focus on the control. */
  private check(launch: Launch, explicit: boolean): void {
    const sessionId = launch.session?.session_id || launch.sessionId;
    if (!sessionId || launch.busy || this.disposed) return;
    const restoring = !launch.session;
    launch.busy = 'checking';
    if (explicit) launch.failure = null;
    const controller = new AbortController();
    launch.controller = controller;
    // A revived check starts while the explorer renders, which already shows it as checking.
    if (explicit) this.host.update(`preview:check:${launch.surfaceId}`);
    const locator = { sessionId, selection: launch.selection, surfaceId: launch.surfaceId };
    void this.transport.session(locator, controller.signal).then((result) => {
      if (this.disposed || launch.controller !== controller) return;
      launch.controller = null;
      launch.busy = '';
      if (restoring && !result.ok && ENDING_FAILURES.has(result.failure.kind)) {
        // A remembered session the server no longer grants is forgotten, not shown.
        this.launches.delete(launch.key);
        this.persist();
        this.landed(launch);
        return;
      }
      const before = JSON.stringify([launch.session, launch.failure]);
      if (result.ok) {
        this.dated(launch, result.serverTime);
        launch.session = result.value;
        launch.sessionId = result.value.session_id;
        launch.failure = null;
      } else if (ENDING_FAILURES.has(result.failure.kind) || explicit || restoring) {
        // A remembered session that could not be read stays remembered and asks to be checked again.
        if (ENDING_FAILURES.has(result.failure.kind) && launch.session) launch.session = { ...launch.session, state: 'unavailable', launch_url: '' };
        launch.failure = { action: 'check', failure: result.failure };
      }
      this.persist();
      // Background checks re-render only when what is shown changed.
      if (explicit || restoring || before !== JSON.stringify([launch.session, launch.failure])) {
        this.landed(launch, explicit ? this.checkFocus(launch) : '');
      }
    });
  }

  /** Where an explicit status check leaves focus: the link, a new launch, or Check again while still unknown. */
  private checkFocus(launch: Launch): string {
    if (sessionLive(launch.session, this.clock(launch))) return `preview:launch:${launch.surfaceId}`;
    return launch.session ? `preview:new:${launch.surfaceId}` : `preview:check:${launch.surfaceId}`;
  }

  private clearExpiry(): void {
    if (this.expiryTimer !== null) clearTimeout(this.expiryTimer);
    this.expiryTimer = null;
  }

  /**
   * When the nearest shown session passes its expiry on this clock, stop
   * offering its link and ask the server for its state.
   */
  private scheduleExpiry(): void {
    this.clearExpiry();
    const shown = this.shown;
    if (!shown || this.disposed) return;
    let nearest = Infinity;
    this.launches.forEach((launch) => {
      if (!this.isShown(launch.selection) || !sessionLive(launch.session, this.clock(launch))) return;
      // Remaining lifetime on the server's clock, waited on this page's clock.
      nearest = Math.min(nearest, Date.parse(launch.session!.expires_at) - this.clock(launch));
    });
    if (!Number.isFinite(nearest)) return;
    // Bounded: timers never exceed the service's maximum lifetime.
    const delay = Math.min(Math.max(nearest, 0) + 50, 30 * 60 * 1000);
    this.expiryTimer = setTimeout(() => {
      this.expiryTimer = null;
      if (this.disposed) return;
      this.launches.forEach((launch) => {
        if (this.isShown(launch.selection) && launch.session?.state === 'ready' && !sessionLive(launch.session, this.clock(launch))) this.check(launch, false);
      });
      this.host.update();
      this.scheduleExpiry();
    }, delay);
  }
}

export function createDataPreview(options: DataPreviewOptions): DataPreview {
  return new DataPreview(options);
}
