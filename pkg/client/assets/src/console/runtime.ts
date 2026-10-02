// Root-mounted operator console runtime. Each mounted root owns its registry,
// record store, preferences, live stream, timers and listeners; nothing is
// looked up or stored outside the supplied root and its identity namespace.

import { consoleStyleConfig, type StyleConfig } from './style-config.js';
import type {
  ConsoleBootstrap,
  ConsoleError,
  ConsoleEvent,
  ConsoleIdentity,
  ConsoleRoutes,
  ConsoleSnapshot,
  PanelActionResult,
  PanelOptions,
  ServerPanelDefinition,
} from './types.js';
import { escapeAttribute, escapeHTML, formatJSON, formatNumber, hashString } from './format.js';
import { createPanelRegistry, defaultGetCount, type PanelDefinition, type PanelRegistry } from './registry.js';
import { ConsoleRecordStore, normalizeConsoleIdentity } from './store.js';
import { ConsolePreferences, consoleIdentityNamespace, type ConsoleStorageProvider } from './preferences.js';
import { ConsoleLiveStream, type ConsoleLiveStatus, type ConsoleLiveStreamOptions } from './live-stream.js';
import { consoleRequest, fillRouteTemplate } from './http.js';
import { panelDefinitionFromServer, type ServerPanelConsoleRenderer } from './schema/hydrate.js';
import { normalizeSchemaID } from './schema/controls.js';
import { buildPanelActionPayload } from './schema/actions.js';

export type ConsoleRuntimeState = 'loading' | 'ready' | 'denied' | 'error' | 'disposed';

export type ConsoleConnectionState = ConsoleLiveStatus | 'offline';

export type ConsoleRuntimeOptions = {
  /** Bootstrap payload; defaults to the root's `[data-console-bootstrap]` JSON. */
  bootstrap?: ConsoleBootstrap;
  /** Class vocabulary; defaults to the scoped `console-*` styles. */
  styles?: StyleConfig;
  /** Browser storage override (tests, embedded hosts). */
  storage?: ConsoleStorageProvider | null;
  /** Disable the live stream even when a live route is provided. */
  live?: boolean;
  /** Reconnect tuning for the live stream. */
  liveOptions?: Pick<ConsoleLiveStreamOptions,
    'maxReconnectAttempts' | 'maxInitialReconnectAttempts' | 'reconnectDelayMs' | 'maxReconnectDelayMs' | 'reconnectStabilityMs'>;
  /** Instance-scoped console renderer overrides keyed by panel ID. */
  renderers?: Record<string, ServerPanelConsoleRenderer>;
  /** Client panel definitions registered before server hydration. */
  panels?: PanelDefinition[];
  /** Consecutive recovery attempts before the console asks for a manual retry. */
  maxRecoveryAttempts?: number;
  /** Backoff schedule (ms) between failed recovery attempts. */
  recoveryDelaysMs?: number[];
  /** Per-request timeout in milliseconds. */
  requestTimeoutMs?: number;
  /** How long to wait for the host's live snapshot before fetching over HTTP. */
  snapshotWaitMs?: number;
  /**
   * Read-only view of an embedded snapshot (dashboard widgets): no live
   * stream, recovery, actions, tabs or filters.
   */
  display?: boolean;
  /** Confirmation prompt for actions that require it. */
  confirm?: (message: string) => boolean;
};

type ActionResultView = {
  status: 'ok' | 'error';
  message: string;
  actionID: string;
  data?: unknown;
};

type NoticeKind = 'none' | 'loading' | 'error' | 'denied';

const ROOT_SELECTOR = '[data-console-root]';
const BOOTSTRAP_SELECTOR = 'script[type="application/json"][data-console-bootstrap]';
const WIDGET_SELECTOR = 'script[type="application/json"][data-console-widget]';
const LIST_RENDERERS = new Set(['table', 'status_list', 'timeline']);
const POLICY_CLOSE_CODES = new Set([1008, 4401, 4403]);
const DEFAULT_RECOVERY_DELAYS_MS = [1000, 2000, 5000, 10000, 30000];
const ACTIVE_PANEL_KEY = 'active-panel';
const FRAME_FALLBACK_MS = 16;
const DEFAULT_SNAPSHOT_WAIT_MS = 5000;
/** Policy closes tolerated per window before live updates stop retrying. */
const POLICY_CLOSE_LIMIT = 3;
const POLICY_CLOSE_WINDOW_MS = 60000;

const mounted = new WeakMap<HTMLElement, ConsoleRuntime>();
let instanceSequence = 0;

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeRoutes(value: unknown): ConsoleRoutes | null {
  if (!isObject(value)) return null;
  const snapshot = text(value.snapshot);
  if (!snapshot) return null;
  return {
    page: text(value.page) || undefined,
    panels: text(value.panels) || undefined,
    snapshot,
    actions: text(value.actions) || undefined,
    preferences: text(value.preferences) || undefined,
    live: text(value.live) || undefined,
    lookup: text(value.lookup) || undefined,
  };
}

/** Read and validate the bootstrap that belongs to this root (not a nested one). */
export function readConsoleBootstrap(root: HTMLElement): ConsoleBootstrap | null {
  const scripts = Array.from(root.querySelectorAll<HTMLScriptElement>(BOOTSTRAP_SELECTOR));
  const own = scripts.find((script) => script.closest(ROOT_SELECTOR) === root);
  if (!own) return null;
  try {
    return normalizeBootstrap(JSON.parse(own.textContent || ''));
  } catch {
    return null;
  }
}

/**
 * Read a dashboard widget payload (`identity`, `panel`, `watermark`) owned by
 * this root and expose it as a display-only bootstrap.
 */
export function readConsoleWidgetBootstrap(root: HTMLElement): ConsoleBootstrap | null {
  const scripts = Array.from(root.querySelectorAll<HTMLScriptElement>(WIDGET_SELECTOR));
  const own = scripts.find((script) => script.closest(ROOT_SELECTOR) === root);
  if (!own) return null;
  try {
    const payload = JSON.parse(own.textContent || '') as unknown;
    if (!isObject(payload) || !isObject(payload.panel)) return null;
    const identity = normalizeConsoleIdentity(payload);
    const watermark = typeof payload.watermark === 'number' ? payload.watermark : 0;
    if (!identity.console_id) return null;
    return {
      ...identity,
      title: text(payload.panel.label) || undefined,
      urls: { snapshot: '' },
      snapshot: { ...identity, watermark, panels: [payload.panel as ServerPanelDefinition] },
    };
  } catch {
    return null;
  }
}

function normalizeBootstrap(value: unknown): ConsoleBootstrap | null {
  if (!isObject(value)) return null;
  const identity = normalizeConsoleIdentity(value);
  const urls = normalizeRoutes(value.urls);
  if (!identity.console_id || !urls) return null;
  return {
    ...identity,
    title: text(value.title) || undefined,
    urls,
    preferences_namespace: text(value.preferences_namespace) || undefined,
    snapshot: isObject(value.snapshot) ? value.snapshot as unknown as ConsoleSnapshot : undefined,
  };
}

function isConsoleSnapshot(value: Record<string, unknown>): value is ConsoleSnapshot & Record<string, unknown> {
  return typeof value.watermark === 'number' && Array.isArray(value.panels) && typeof value.console_id === 'string';
}

/** Append one query parameter to a resolved URL without rebuilding it. */
function withQueryParam(url: string, key: string, value: string): string {
  const [base, hash] = url.split('#');
  const separator = base.includes('?') ? '&' : '?';
  const next = `${base}${separator}${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
  return hash === undefined ? next : `${next}#${hash}`;
}

function isConsoleEvent(value: unknown): value is ConsoleEvent {
  return isObject(value)
    && typeof value.sequence === 'number'
    && typeof value.kind === 'string'
    && typeof value.console_id === 'string';
}

function cssEscape(value: string): string {
  const escape = (globalThis as { CSS?: { escape?: (input: string) => string } }).CSS?.escape;
  return escape ? escape(value) : value.replace(/["\\]/g, '\\$&');
}

function scheduleFrame(callback: () => void): () => void {
  if (typeof requestAnimationFrame === 'function') {
    const handle = requestAnimationFrame(() => callback());
    return () => cancelAnimationFrame(handle);
  }
  const handle = setTimeout(callback, FRAME_FALLBACK_MS);
  return () => clearTimeout(handle);
}

export class ConsoleRuntime {
  readonly root: HTMLElement;
  readonly registry: PanelRegistry;
  readonly identity: ConsoleIdentity;
  readonly idScope: string;

  private readonly bootstrap: ConsoleBootstrap;
  private readonly styles: StyleConfig;
  private readonly options: ConsoleRuntimeOptions;
  private readonly store: ConsoleRecordStore;
  private readonly preferences: ConsolePreferences;
  private readonly serverDefinitions = new Map<string, ServerPanelDefinition>();
  private readonly filterState = new Map<string, unknown>();
  private readonly actionResults = new Map<string, ActionResultView>();
  private readonly controllers = new Set<AbortController>();
  private readonly cleanup: Array<() => void> = [];
  private readonly regions: {
    tabs: HTMLElement;
    filters: HTMLElement;
    panel: HTMLElement;
    notice: HTMLElement;
    connection: HTMLElement | null;
    status: HTMLElement | null;
  };

  private state: ConsoleRuntimeState = 'loading';
  private connection: ConsoleConnectionState = 'offline';
  private activePanel = '';
  private policyCloses: number[] = [];
  private stream: ConsoleLiveStream | null = null;
  private recoveryPromise: Promise<void> | null = null;
  private recoveryPending = false;
  private recoveryAttempts = 0;
  private recoveryTimer: ReturnType<typeof setTimeout> | null = null;
  private cancelFrame: (() => void) | null = null;
  private dirtyPanels = new Set<string>();
  private structureDirty = false;
  private livePanels: string[] = [];
  private snapshotWaitTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly definitionSignatures = new Map<string, string>();
  private notice: { kind: NoticeKind; message: string; action: 'retry' | 'reload' | 'none' } = {
    kind: 'loading',
    message: 'Loading console…',
    action: 'none',
  };

  constructor(root: HTMLElement, bootstrap: ConsoleBootstrap, options: ConsoleRuntimeOptions = {}) {
    this.root = root;
    this.bootstrap = bootstrap;
    this.options = options;
    this.styles = options.styles || consoleStyleConfig;
    this.identity = normalizeConsoleIdentity(bootstrap);
    this.idScope = `console-${(instanceSequence += 1)}`;
    this.registry = createPanelRegistry();
    this.store = new ConsoleRecordStore({ identity: this.identity, sequenceMode: 'monotonic' });
    this.preferences = new ConsolePreferences(
      bootstrap.preferences_namespace || consoleIdentityNamespace(this.identity),
      options.storage ?? null,
    );
    (options.panels || []).forEach((panel) => this.registry.register(panel));
    this.root.classList.add('console-root');
    this.regions = this.ensureRegions();
    this.bindEvents();
    this.root.dataset.consoleState = 'loading';
    this.root.dataset.consoleSync = 'recovering';
    this.render();
    void this.start();
  }

  /** Current lifecycle state. */
  getState(): ConsoleRuntimeState {
    return this.state;
  }

  /** Current live connection state (`offline` when no live route is used). */
  getConnectionState(): ConsoleConnectionState {
    return this.connection;
  }

  /** Authorized panel IDs in display order. */
  getPanels(): string[] {
    return this.visiblePanels();
  }

  getActivePanel(): string {
    return this.activePanel;
  }

  /** Records (payloads) currently displayed for a panel. */
  getPanelData(panelId: string): unknown {
    return this.panelData(normalizeSchemaID(panelId));
  }

  /** Activate a panel when it is authorized. */
  selectPanel(panelId: string, focus = false): boolean {
    const id = normalizeSchemaID(panelId);
    if (!id || !this.visiblePanels().includes(id) || this.state === 'disposed') return false;
    if (id !== this.activePanel) {
      this.activePanel = id;
      this.preferences.set(ACTIVE_PANEL_KEY, id, 'session');
      this.renderTabs();
      this.renderFilters();
      this.renderPanel(true);
    }
    if (focus) this.tabButton(id)?.focus();
    return true;
  }

  /** Request authorized snapshot recovery now. */
  refresh(): Promise<void> {
    this.recoveryAttempts = 0;
    this.policyCloses = [];
    const recovery = this.recover();
    if (!this.stream || this.stream.getStatus() === 'disconnected') {
      // Live delivery stopped (retries exhausted or repeated policy closes):
      // an explicit refresh reconnects once access verifies.
      void recovery.then(() => {
        if (!this.isClosed() && this.state === 'ready' && (!this.stream || this.stream.getStatus() === 'disconnected')) {
          this.closeLive();
          this.connectLive();
        }
      });
    }
    return recovery;
  }

  /** Release every owned resource; the root stays in the document, inert. */
  destroy(): void {
    if (this.state === 'disposed') return;
    this.state = 'disposed';
    this.closeLive();
    this.controllers.forEach((controller) => controller.abort());
    this.controllers.clear();
    if (this.recoveryTimer !== null) clearTimeout(this.recoveryTimer);
    this.recoveryTimer = null;
    this.cancelFrame?.();
    this.cancelFrame = null;
    this.cleanup.splice(0).forEach((release) => release());
    this.registry.dispose();
    this.store.clear();
    this.serverDefinitions.clear();
    this.actionResults.clear();
    this.filterState.clear();
    if (mounted.get(this.root) === this) mounted.delete(this.root);
    this.root.dataset.consoleState = 'disposed';
  }

  private async start(): Promise<void> {
    if (this.bootstrap.snapshot) {
      this.acceptSnapshot(this.bootstrap.snapshot);
    } else {
      await this.recover();
    }
    if (this.isClosed() || this.options.display) return;
    this.connectLive();
  }

  private isClosed(): boolean {
    return this.state === 'disposed' || this.state === 'denied';
  }

  // ---------------------------------------------------------------------------
  // Snapshot and recovery

  /**
   * Fetch an authorized snapshot. Concurrent triggers join the in-flight
   * recovery and schedule one more fetch, so awaiting resolves only after a
   * snapshot newer than every trigger was applied (or access was denied).
   */
  private recover(): Promise<void> {
    if (this.isClosed() || this.options.display || !this.bootstrap.urls.snapshot) return Promise.resolve();
    if (this.recoveryPromise) {
      this.recoveryPending = true;
      return this.recoveryPromise;
    }
    const run = this.runRecovery().finally(() => {
      if (this.recoveryPromise === run) this.recoveryPromise = null;
    });
    this.recoveryPromise = run;
    return run;
  }

  private async runRecovery(): Promise<void> {
    for (;;) {
      if (this.isClosed()) return;
      if (this.recoveryTimer !== null) {
        clearTimeout(this.recoveryTimer);
        this.recoveryTimer = null;
      }
      this.recoveryPending = false;
      this.store.beginRecovery();
      this.root.dataset.consoleSync = 'recovering';
      const controller = new AbortController();
      this.controllers.add(controller);
      const result = await consoleRequest<ConsoleSnapshot>(this.bootstrap.urls.snapshot, {
        method: 'GET',
        signal: controller.signal,
        timeoutMs: this.options.requestTimeoutMs,
        fallbackError: 'Unable to load console data.',
      });
      this.controllers.delete(controller);
      if (this.isClosed()) return;
      if (!result.ok) {
        if (result.status === 401 || result.status === 403) {
          this.deny(result.error);
        } else {
          this.scheduleRecoveryRetry(result.error.message);
        }
        return;
      }
      if (this.acceptSnapshot(result.value)) {
        if (this.isClosed()) return;
        // The snapshot did not close a gap; bound the follow-up fetches.
        this.recoveryAttempts += 1;
        if (this.recoveryAttempts > this.maxRecoveryAttempts()) {
          this.recoveryAttempts = 0;
          this.setNotice('error', 'Live updates are out of sync. Refresh to load the latest data.', 'retry');
          return;
        }
        continue;
      }
      this.recoveryAttempts = 0;
      if (!this.recoveryPending || this.isClosed()) return;
    }
  }

  private maxRecoveryAttempts(): number {
    return Math.max(1, this.options.maxRecoveryAttempts ?? 5);
  }

  private scheduleRecoveryRetry(message: string): void {
    const delays = this.options.recoveryDelaysMs || DEFAULT_RECOVERY_DELAYS_MS;
    const attempt = this.recoveryAttempts;
    this.recoveryAttempts += 1;
    if (attempt >= this.maxRecoveryAttempts() || delays.length === 0) {
      this.recoveryAttempts = 0;
      this.setState(this.state === 'loading' ? 'error' : this.state);
      this.setNotice('error', message, 'retry');
      return;
    }
    if (this.state === 'loading') this.setNotice('loading', `${message} Retrying…`, 'none');
    const delay = delays[Math.min(attempt, delays.length - 1)];
    this.recoveryTimer = setTimeout(() => {
      this.recoveryTimer = null;
      void this.recover();
    }, Math.max(0, delay));
  }

  /** Apply a snapshot; returns true when another recovery is required. */
  private acceptSnapshot(snapshot: ConsoleSnapshot): boolean {
    const outcome = this.store.applySnapshot(snapshot);
    if (!outcome.ok) {
      if (outcome.reason === 'foreign') {
        this.deny({
          status: 409,
          code: 'IDENTITY_CHANGED',
          message: 'Your console session changed. Reload to continue.',
          fields: {},
          action: 'reload',
        });
      } else {
        this.setState(this.state === 'loading' ? 'error' : this.state);
        this.setNotice('error', 'The console received malformed data.', 'retry');
      }
      return false;
    }
    this.syncDefinitions(snapshot.panels);
    this.setState('ready');
    this.root.dataset.consoleSync = outcome.needsRecovery ? 'recovering' : 'current';
    this.setNotice('none', '', 'none');
    this.syncSubscription();
    this.structureDirty = true;
    this.flush();
    return outcome.needsRecovery;
  }

  private syncDefinitions(panels: ServerPanelDefinition[]): void {
    const authorized = new Set<string>();
    panels.forEach((panel) => {
      const id = normalizeSchemaID(panel?.id);
      if (!id || authorized.has(id)) return;
      authorized.add(id);
      const { records: _records, ...definition } = panel as ServerPanelDefinition & { records?: unknown };
      const signature = hashString(JSON.stringify(definition));
      if (this.definitionSignatures.get(id) === signature && this.registry.has(id)) {
        return;
      }
      this.definitionSignatures.set(id, signature);
      this.serverDefinitions.set(id, definition);
      const hydrated = panelDefinitionFromServer(definition, {
        consoleRenderer: this.options.renderers?.[id],
        styles: this.styles,
      });
      if (hydrated) {
        this.registry.registerServerDefinition(hydrated);
      }
    });
    for (const id of Array.from(this.serverDefinitions.keys())) {
      if (!authorized.has(id)) {
        this.serverDefinitions.delete(id);
        this.definitionSignatures.delete(id);
        this.filterState.delete(id);
        this.actionResults.delete(id);
        if (this.registry.isServerDefinition(id)) this.registry.unregister(id);
      }
    }
    const visible = this.visiblePanels();
    if (!visible.includes(this.activePanel)) {
      const stored = normalizeSchemaID(this.preferences.get(ACTIVE_PANEL_KEY, 'session'));
      this.activePanel = visible.includes(stored) ? stored : visible[0] || '';
    }
  }

  // ---------------------------------------------------------------------------
  // Live stream
  //
  // The host selects delivered panels from the live URL's `panels` query,
  // sends an authorized snapshot as the first frame, and answers gaps, idle
  // revalidation and invalidation with `invalidate` followed by a fresh
  // snapshot. Access changes close the socket with a policy code.

  private connectLive(): void {
    const live = this.bootstrap.urls.live;
    if (!live || this.options.live === false || this.isClosed()) {
      this.setConnection('offline');
      return;
    }
    const panels = this.store.panelIds();
    this.livePanels = panels;
    const stream = new ConsoleLiveStream({
      ...(this.options.liveOptions || {}),
      url: withQueryParam(live, 'panels', panels.join(',')),
      onMessage: (message) => {
        if (this.stream === stream) this.handleLiveMessage(message);
      },
      onStatusChange: (status) => {
        if (this.stream === stream) this.handleLiveStatus(status);
      },
      onClose: (event) => {
        if (this.stream === stream && POLICY_CLOSE_CODES.has(event.code)) void this.verifyAccessAfterClose();
      },
      shouldReconnect: (event) => !POLICY_CLOSE_CODES.has(event.code),
    });
    this.stream = stream;
    stream.connect();
  }

  private closeLive(): void {
    const stream = this.stream;
    this.stream = null;
    this.clearSnapshotWait();
    stream?.close();
  }

  private handleLiveStatus(status: ConsoleLiveStatus): void {
    if (this.isClosed()) return;
    this.setConnection(status);
    if (status === 'connected') {
      // The host's first frame is a fresh authorized snapshot.
      this.awaitStreamSnapshot();
    } else if (status === 'disconnected') {
      // Retries are exhausted: distinguish lost access from an outage.
      this.clearSnapshotWait();
      void this.recover();
    }
  }

  /** Hold events until the host's snapshot arrives; fall back to HTTP. */
  private awaitStreamSnapshot(): void {
    this.store.beginRecovery();
    this.root.dataset.consoleSync = 'recovering';
    this.clearSnapshotWait();
    this.snapshotWaitTimer = setTimeout(() => {
      this.snapshotWaitTimer = null;
      void this.recover();
    }, Math.max(0, this.options.snapshotWaitMs ?? DEFAULT_SNAPSHOT_WAIT_MS));
  }

  private clearSnapshotWait(): void {
    if (this.snapshotWaitTimer !== null) {
      clearTimeout(this.snapshotWaitTimer);
      this.snapshotWaitTimer = null;
    }
  }

  /**
   * Keep live selection in step with authorization. Newly authorized panels
   * need a new subscription; removed panels are already filtered by the host.
   */
  private syncSubscription(): void {
    if (!this.stream) return;
    const panels = this.store.panelIds();
    if (panels.some((id) => !this.livePanels.includes(id))) {
      this.closeLive();
      this.connectLive();
    }
  }

  private async verifyAccessAfterClose(): Promise<void> {
    if (this.isClosed()) return;
    this.closeLive();
    const now = Date.now();
    this.policyCloses = this.policyCloses.filter((at) => now - at < POLICY_CLOSE_WINDOW_MS);
    this.policyCloses.push(now);
    await this.recover();
    if (this.isClosed() || this.state !== 'ready') return;
    if (this.policyCloses.length > POLICY_CLOSE_LIMIT) {
      // Access still verifies but the stream keeps closing: stop retrying
      // rather than loop, and let the operator refresh explicitly.
      this.setConnection('disconnected');
      this.setNotice('error', 'Live updates stopped. Refresh to load the latest data.', 'retry');
      return;
    }
    this.connectLive();
  }

  private handleLiveMessage(message: unknown): void {
    if (this.isClosed() || !isObject(message)) return;
    if (isConsoleSnapshot(message)) {
      this.clearSnapshotWait();
      if (this.acceptSnapshot(message)) void this.recover();
      return;
    }
    if (!isConsoleEvent(message)) return;
    const outcome = this.store.applyEvent(message);
    if (outcome === 'applied') {
      this.markPanelDirty(normalizeSchemaID(message.panel_id));
    } else if (outcome === 'invalidated') {
      this.awaitStreamSnapshot();
    } else if (outcome === 'gap') {
      void this.recover();
    }
  }

  // ---------------------------------------------------------------------------
  // Access denial

  private deny(error: ConsoleError): void {
    if (this.state === 'disposed') return;
    this.state = 'denied';
    this.root.dataset.consoleState = 'denied';
    this.closeLive();
    this.controllers.forEach((controller) => controller.abort());
    this.controllers.clear();
    if (this.recoveryTimer !== null) clearTimeout(this.recoveryTimer);
    this.recoveryTimer = null;
    this.recoveryPending = false;
    this.store.clear();
    this.registry.clearServerDefinitions();
    this.serverDefinitions.clear();
    this.definitionSignatures.clear();
    this.livePanels = [];
    this.actionResults.clear();
    this.filterState.clear();
    this.preferences.clear();
    this.activePanel = '';
    this.setConnection('offline');
    const message = error.status === 401
      ? 'Your session expired. Sign in again to continue.'
      : error.code === 'IDENTITY_CHANGED'
        ? error.message
        : 'You do not have access to this console.';
    this.setNotice('denied', message, 'reload');
    this.structureDirty = true;
    this.flush();
  }

  // ---------------------------------------------------------------------------
  // Actions

  private declaredAction(panelId: string, actionId: string): boolean {
    const definition = this.serverDefinitions.get(panelId);
    return Boolean(definition?.ui?.actions?.some((action) => normalizeSchemaID(action.id) === actionId));
  }

  private confirmAction(element: HTMLElement): boolean {
    const confirmText = text(element.dataset.actionConfirm);
    if (element.dataset.actionRequiresConfirm !== 'true' && !confirmText) return true;
    const confirm = this.options.confirm || ((message: string) => window.confirm(message));
    return confirm(confirmText || 'Run this action?');
  }

  private async runAction(element: HTMLElement, button?: HTMLButtonElement | null): Promise<void> {
    const panelId = normalizeSchemaID(element.dataset.panelId);
    const actionId = normalizeSchemaID(element.dataset.actionId);
    const template = this.bootstrap.urls.actions;
    if (this.state !== 'ready' || this.options.display || !template || !panelId || !actionId) return;
    if (!this.visiblePanels().includes(panelId) || !this.declaredAction(panelId, actionId)) return;
    if (!this.confirmAction(element)) return;
    const payload = buildPanelActionPayload(element);
    const url = fillRouteTemplate(template, { panel_id: panelId, action_id: actionId });
    if (button) button.disabled = true;
    this.clearFieldErrors(element);
    const controller = new AbortController();
    this.controllers.add(controller);
    const result = await consoleRequest<PanelActionResult>(url, {
      method: 'POST',
      json: payload,
      signal: controller.signal,
      timeoutMs: this.options.requestTimeoutMs,
      fallbackError: 'Action failed.',
    });
    this.controllers.delete(controller);
    if (button) button.disabled = false;
    if (this.isClosed()) return;
    if (result.ok) {
      this.applyActionResult(element, panelId, actionId, result.value);
    } else {
      this.applyActionFailure(element, panelId, actionId, result.status, result.error);
    }
  }

  private applyActionFailure(element: HTMLElement, panelId: string, actionId: string, status: number, error: ConsoleError): void {
    if (status === 401) {
      this.deny(error);
      return;
    }
    const message = status === 403 ? 'You are not allowed to run this action.' : error.message;
    this.showFieldErrors(element, error.fields);
    this.showActionResult(panelId, { status: 'error', message, actionID: actionId });
    if (status === 403) {
      // Execute and read are separate grants; revalidate read access.
      void this.refresh();
    }
  }

  private applyActionResult(element: HTMLElement, panelId: string, actionId: string, response: unknown): void {
    const value: PanelActionResult = isObject(response) ? response as PanelActionResult : {};
    const failed = value.ok === false;
    if (failed && isObject(value.errors)) {
      this.showFieldErrors(element, Object.fromEntries(
        Object.entries(value.errors).map(([key, message]) => [key, typeof message === 'string' ? message : formatJSON(message, { nullAsEmptyObject: false })]),
      ));
    }
    this.showActionResult(panelId, {
      status: failed ? 'error' : 'ok',
      message: text(value.message) || (failed ? 'Action failed.' : 'Action complete.'),
      actionID: actionId,
      data: value.data,
    });
    if (isConsoleEvent(value.event)) {
      this.handleLiveMessage(value.event);
    }
    if (value.refresh) {
      void this.refresh();
    }
  }

  private showActionResult(panelId: string, view: ActionResultView): void {
    this.actionResults.set(panelId, view);
    if (panelId === this.activePanel) this.renderActionResult();
  }

  private renderActionResult(): void {
    const view = this.actionResults.get(this.activePanel);
    const target = Array.from(this.regions.panel.querySelectorAll<HTMLElement>('[data-panel-action-result]'))
      .find((element) => element.dataset.panelActionResult === this.activePanel);
    if (!target) return;
    if (!view) {
      target.innerHTML = '';
      return;
    }
    const badge = view.status === 'error' ? this.styles.badgeError : this.styles.badge;
    const data = view.data === undefined
      ? ''
      : `<pre class="${this.styles.jsonPanel}">${escapeHTML(formatJSON(view.data, { nullAsEmptyObject: false }))}</pre>`;
    target.innerHTML = `<div class="${badge}" role="${view.status === 'error' ? 'alert' : 'status'}">${escapeHTML(view.message)}</div>${data}`;
  }

  private clearFieldErrors(element: HTMLElement): void {
    element.querySelectorAll<HTMLElement>('[data-action-field-error]').forEach((field) => {
      field.textContent = '';
      field.hidden = true;
    });
  }

  private showFieldErrors(element: HTMLElement, fields: Record<string, string>): void {
    Object.entries(fields).forEach(([path, message]) => {
      const normalized = path.trim();
      const target = Array.from(element.querySelectorAll<HTMLElement>('[data-action-field-error]')).find((field) =>
        field.dataset.actionFieldError === normalized
        || field.dataset.actionFieldName === normalized
        || field.dataset.actionFieldError === `payload.${normalized}`);
      if (target) {
        target.textContent = message;
        target.hidden = false;
      }
    });
  }

  // ---------------------------------------------------------------------------
  // DOM regions and events

  private ensureRegions(): ConsoleRuntime['regions'] {
    const own = <T extends HTMLElement>(selector: string): T | null =>
      Array.from(this.root.querySelectorAll<T>(selector)).find((element) => element.closest(ROOT_SELECTOR) === this.root) || null;
    const create = (tag: string, attribute: string, className: string): HTMLElement => {
      const element = this.root.ownerDocument.createElement(tag);
      element.setAttribute(attribute, '');
      element.className = className;
      this.root.appendChild(element);
      return element;
    };
    const notice = own<HTMLElement>('[data-console-notice]') || create('div', 'data-console-notice', 'console-notice');
    const tabs = own<HTMLElement>('[data-console-tabs]') || create('nav', 'data-console-tabs', 'console-tabs');
    const filters = own<HTMLElement>('[data-console-filters]') || create('div', 'data-console-filters', 'console-filters');
    const panel = own<HTMLElement>('[data-console-panel]') || create('section', 'data-console-panel', 'console-panel');
    tabs.setAttribute('role', 'tablist');
    if (!tabs.hasAttribute('aria-label')) tabs.setAttribute('aria-label', this.bootstrap.title || 'Console panels');
    panel.id = panel.id || `${this.idScope}-panel`;
    panel.setAttribute('role', 'tabpanel');
    panel.tabIndex = 0;
    return {
      tabs,
      filters,
      panel,
      notice,
      connection: own<HTMLElement>('[data-console-connection]'),
      status: own<HTMLElement>('[data-console-status]'),
    };
  }

  private listen(target: EventTarget, type: string, handler: (event: Event) => void): void {
    target.addEventListener(type, handler);
    this.cleanup.push(() => target.removeEventListener(type, handler));
  }

  private bindEvents(): void {
    const { tabs, panel, filters } = this.regions;
    this.listen(tabs, 'click', (event) => {
      const tab = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-console-tab]');
      if (tab && tabs.contains(tab)) this.selectPanel(tab.dataset.consoleTab || '', true);
    });
    this.listen(tabs, 'keydown', (event) => this.handleTabKeydown(event as KeyboardEvent));
    this.listen(filters, 'input', () => this.updateFilters());
    this.listen(filters, 'change', () => this.updateFilters());
    this.listen(panel, 'click', (event) => {
      const button = (event.target as HTMLElement | null)?.closest<HTMLButtonElement>('[data-panel-action]');
      if (!button || !panel.contains(button) || button.disabled) return;
      event.preventDefault();
      void this.runAction(button, button);
    });
    this.listen(panel, 'submit', (event) => {
      const form = (event.target as HTMLElement | null)?.closest<HTMLFormElement>('form[data-panel-action-form]');
      if (!form || !panel.contains(form)) return;
      event.preventDefault();
      const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');
      if (button?.disabled) return;
      void this.runAction(form, button);
    });
    this.listen(panel, 'change', (event) => {
      const picker = (event.target as HTMLElement | null)?.closest<HTMLSelectElement>('[data-panel-action-picker]');
      if (picker && panel.contains(picker)) this.updateActionPicker(picker);
    });
    this.listen(this.root, 'click', (event) => {
      const control = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-console-action]');
      if (!control || control.closest(ROOT_SELECTOR) !== this.root) return;
      const action = control.dataset.consoleAction;
      if (action === 'retry' || action === 'refresh') {
        event.preventDefault();
        void this.refresh();
      } else if (action === 'reload') {
        event.preventDefault();
        this.root.ownerDocument.defaultView?.location.reload();
      }
    });
  }

  private handleTabKeydown(event: KeyboardEvent): void {
    const panels = this.visiblePanels();
    const index = panels.indexOf(this.activePanel);
    if (index < 0 || panels.length === 0) return;
    let next = -1;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        next = (index + 1) % panels.length;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        next = (index - 1 + panels.length) % panels.length;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = panels.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    this.selectPanel(panels[next], true);
  }

  private updateActionPicker(picker: HTMLSelectElement): void {
    const launcher = picker.closest<HTMLElement>('[data-panel-action-launcher]');
    if (!launcher) return;
    launcher.querySelectorAll<HTMLElement>('[data-panel-action-choice]').forEach((choice) => {
      choice.hidden = choice.dataset.panelActionChoice !== picker.value;
    });
  }

  private updateFilters(): void {
    const panelId = this.activePanel;
    const definition = this.registry.get(panelId);
    if (!definition?.renderFilters) return;
    const current = this.filterStateFor(panelId, definition);
    const next: Record<string, unknown> = isObject(current) ? { ...current } : {};
    this.regions.filters.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-filter]').forEach((input) => {
      const key = input.dataset.filter || '';
      if (!key) return;
      next[key] = input instanceof HTMLInputElement && input.type === 'checkbox' ? input.checked : input.value;
    });
    this.filterState.set(panelId, next);
    this.renderPanel(false);
  }

  private filterStateFor(panelId: string, definition: PanelDefinition): unknown {
    if (!this.filterState.has(panelId)) {
      const defaults = definition.defaultFilters;
      this.filterState.set(panelId, isObject(defaults) ? { ...defaults } : defaults ?? {});
    }
    return this.filterState.get(panelId);
  }

  // ---------------------------------------------------------------------------
  // Rendering

  private markPanelDirty(panelId: string): void {
    this.dirtyPanels.add(panelId);
    if (this.cancelFrame) return;
    this.cancelFrame = scheduleFrame(() => {
      this.cancelFrame = null;
      this.flush();
    });
  }

  private flush(): void {
    if (this.state === 'disposed') return;
    if (this.structureDirty) {
      this.structureDirty = false;
      this.dirtyPanels.clear();
      this.renderNotice();
      this.renderConnection();
      this.renderTabs();
      if (!this.panelMounted(this.activePanel)) {
        this.renderFilters();
        this.renderPanel(true);
      } else {
        this.renderPanel(false);
      }
      return;
    }
    const dirty = Array.from(this.dirtyPanels);
    this.dirtyPanels.clear();
    if (dirty.length === 0) return;
    this.updateCounts();
    if (dirty.includes(this.activePanel)) this.renderPanel(false);
  }

  private render(): void {
    this.renderNotice();
    this.renderConnection();
    this.renderTabs();
    this.renderFilters();
    this.renderPanel(true);
  }

  /** Authorized panels in snapshot order that have a renderer. */
  private visiblePanels(): string[] {
    return this.store.panelIds().filter((id) => this.registry.has(id));
  }

  private tabButton(panelId: string): HTMLButtonElement | null {
    return this.regions.tabs.querySelector<HTMLButtonElement>(`[data-console-tab="${cssEscape(panelId)}"]`);
  }

  private renderTabs(): void {
    const panels = this.visiblePanels();
    const focused = this.root.ownerDocument.activeElement;
    const focusedTab = focused instanceof HTMLElement && this.regions.tabs.contains(focused)
      ? focused.dataset.consoleTab || ''
      : '';
    this.regions.tabs.hidden = panels.length === 0 || Boolean(this.options.display);
    this.regions.tabs.innerHTML = panels.map((panelId) => {
      const definition = this.registry.get(panelId);
      const active = panelId === this.activePanel;
      const count = this.panelCount(panelId, definition);
      return `<button type="button" class="console-tab${active ? ' console-tab--active' : ''}" role="tab" id="${escapeAttribute(`${this.idScope}-tab-${panelId}`)}" aria-selected="${active ? 'true' : 'false'}" aria-controls="${escapeAttribute(this.regions.panel.id)}" tabindex="${active ? '0' : '-1'}" data-console-tab="${escapeAttribute(panelId)}"><span class="console-tab__label">${escapeHTML(definition?.label || panelId)}</span><span class="console-tab__count" data-console-tab-count="${escapeAttribute(panelId)}">${escapeHTML(formatNumber(count))}</span></button>`;
    }).join('');
    if (this.activePanel) {
      this.regions.panel.setAttribute('aria-labelledby', `${this.idScope}-tab-${this.activePanel}`);
    } else {
      this.regions.panel.removeAttribute('aria-labelledby');
    }
    // Rebuilding the tablist must not drop keyboard focus.
    if (focusedTab) this.tabButton(panels.includes(focusedTab) ? focusedTab : this.activePanel)?.focus();
  }

  private updateCounts(): void {
    this.visiblePanels().forEach((panelId) => {
      const badge = this.regions.tabs.querySelector<HTMLElement>(`[data-console-tab-count="${cssEscape(panelId)}"]`);
      if (badge) badge.textContent = formatNumber(this.panelCount(panelId, this.registry.get(panelId)));
    });
  }

  private panelCount(panelId: string, definition?: PanelDefinition): number {
    const data = this.panelData(panelId);
    return definition?.getCount ? definition.getCount(data) : defaultGetCount(data);
  }

  /**
   * Panel payload for renderers: record payloads in order. A non-list view
   * over a single record binds that record's payload directly.
   */
  private panelData(panelId: string): unknown {
    const records = this.store.records(panelId);
    const definition = this.serverDefinitions.get(panelId);
    const view = definition?.ui?.views?.console || definition?.ui?.views?.toolbar;
    const renderer = normalizeSchemaID(view?.renderer);
    if (records.length === 1 && !LIST_RENDERERS.has(renderer)) {
      return records[0].data;
    }
    return records.map((record) => record.data);
  }

  private renderFilters(): void {
    const definition = this.registry.get(this.activePanel);
    if (!definition?.renderFilters || definition.showFilters === false || this.state !== 'ready' || this.options.display) {
      this.regions.filters.innerHTML = '';
      this.regions.filters.hidden = true;
      return;
    }
    const markup = definition.renderFilters(this.filterStateFor(this.activePanel, definition));
    this.regions.filters.innerHTML = markup;
    this.regions.filters.hidden = !markup;
  }

  private renderOptions(): PanelOptions {
    return { idScope: this.idScope };
  }

  /** True when the panel's current definition is already mounted. */
  private panelMounted(panelId: string): boolean {
    const panel = this.regions.panel;
    return Boolean(panelId)
      && panel.dataset.consolePanelId === panelId
      && panel.dataset.consoleDefinition === (this.definitionSignatures.get(panelId) || '');
  }

  /**
   * Render the active panel. Full renders rebuild action controls; data-only
   * renders keep mounted action forms (and their input) intact.
   */
  private renderPanel(full: boolean): void {
    const panel = this.regions.panel;
    const panelId = this.activePanel;
    const definition = panelId ? this.registry.get(panelId) : undefined;
    if (!definition || this.state !== 'ready') {
      panel.innerHTML = this.state === 'ready'
        ? `<div class="${this.styles.emptyState}">No panels are available.</div>`
        : '';
      panel.dataset.consolePanelId = '';
      return;
    }
    let data = this.panelData(panelId);
    if (definition.applyFilters) {
      data = definition.applyFilters(data, this.filterStateFor(panelId, definition));
    }
    const options = this.renderOptions();
    if (this.options.display && definition.renderBody) {
      panel.innerHTML = definition.renderBody(data, this.styles, options);
      panel.dataset.consolePanelId = panelId;
      return;
    }
    if (definition.renderActions && definition.renderBody) {
      const body = panel.querySelector<HTMLElement>(':scope > [data-console-panel-body]');
      if (!full && body && this.panelMounted(panelId)) {
        body.innerHTML = definition.renderBody(data, this.styles, options);
        return;
      }
      panel.innerHTML = `<div class="console-panel__actions" data-console-panel-actions>${definition.renderActions(this.styles, options)}</div><div class="console-panel__body" data-console-panel-body>${definition.renderBody(data, this.styles, options)}</div><div class="console-panel__result" data-panel-action-result="${escapeAttribute(panelId)}" aria-live="polite"></div>`;
    } else {
      const render = definition.renderConsole || definition.render;
      panel.innerHTML = render(data, this.styles, options);
    }
    panel.dataset.consolePanelId = panelId;
    panel.dataset.consoleDefinition = this.definitionSignatures.get(panelId) || '';
    panel.querySelectorAll<HTMLSelectElement>('[data-panel-action-picker]').forEach((picker) => this.updateActionPicker(picker));
    this.renderActionResult();
  }

  private setState(state: ConsoleRuntimeState): void {
    if (this.state === 'disposed' || this.state === 'denied') return;
    this.state = state;
    this.root.dataset.consoleState = state;
  }

  private setConnection(state: ConsoleConnectionState): void {
    this.connection = state;
    this.renderConnection();
  }

  private renderConnection(): void {
    const labels: Record<ConsoleConnectionState, string> = {
      connected: 'Live',
      reconnecting: 'Reconnecting',
      disconnected: 'Disconnected',
      error: 'Connection error',
      offline: 'Not live',
    };
    this.root.dataset.consoleConnection = this.connection;
    if (this.regions.status) this.regions.status.dataset.status = this.connection;
    if (this.regions.connection) this.regions.connection.textContent = labels[this.connection];
  }

  private setNotice(kind: NoticeKind, message: string, action: 'retry' | 'reload' | 'none'): void {
    this.notice = { kind, message, action };
    this.renderNotice();
  }

  private renderNotice(): void {
    const { kind, message, action } = this.notice;
    const notice = this.regions.notice;
    notice.dataset.consoleNotice = kind;
    if (kind === 'none' || !message || (this.options.display && kind === 'loading')) {
      notice.hidden = true;
      notice.innerHTML = '';
      notice.removeAttribute('role');
      return;
    }
    notice.hidden = false;
    notice.setAttribute('role', kind === 'error' || kind === 'denied' ? 'alert' : 'status');
    const label = action === 'reload' ? 'Reload' : 'Retry';
    const control = action === 'none'
      ? ''
      : ` <button type="button" class="console-btn" data-console-action="${action}">${label}</button>`;
    notice.innerHTML = `<span class="console-notice__message">${escapeHTML(message)}</span>${control}`;
  }
}

/** Mount (or return the existing) console for a root element. */
export function mountConsole(root: HTMLElement, options: ConsoleRuntimeOptions = {}): ConsoleRuntime | null {
  const existing = mounted.get(root);
  if (existing) return existing;
  const display = Boolean(options.display) || root.hasAttribute('data-console-display');
  const bootstrap = options.bootstrap
    ? normalizeBootstrap(options.bootstrap)
    : display ? readConsoleWidgetBootstrap(root) : readConsoleBootstrap(root);
  if (!bootstrap) {
    root.dataset.consoleState = 'error';
    return null;
  }
  const runtime = new ConsoleRuntime(root, bootstrap, display ? { ...options, display: true, live: false } : options);
  mounted.set(root, runtime);
  return runtime;
}

/** The console mounted on a root, if any. */
export function getMountedConsole(root: HTMLElement): ConsoleRuntime | null {
  return mounted.get(root) || null;
}

/** Dispose the console mounted on a root. */
export function disposeConsole(root: HTMLElement): void {
  mounted.get(root)?.destroy();
}

/** Mount every console root inside a container that opted into auto-mounting. */
export function mountConsoles(container: ParentNode = document, options: Omit<ConsoleRuntimeOptions, 'bootstrap'> = {}): ConsoleRuntime[] {
  return Array.from(container.querySelectorAll<HTMLElement>(`${ROOT_SELECTOR}:not([data-console-manual])`))
    .map((root) => mountConsole(root, options))
    .filter((runtime): runtime is ConsoleRuntime => runtime !== null);
}
