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
  PanelOptionPage,
  PanelOptions,
  PanelRequestStatus,
  PanelUIActionRef,
  ServerPanelDefinition,
  ServerPanelUIAction,
} from './types.js';
import { escapeAttribute, escapeHTML, formatJSON, formatNumber, hashString, pathValue } from './format.js';
import { createPanelRegistry, defaultGetCount, type PanelDefinition, type PanelRegistry } from './registry.js';
import { ConsoleRecordStore, normalizeConsoleIdentity } from './store.js';
import { ConsolePreferences, consoleIdentityNamespace, type ConsoleStorageProvider } from './preferences.js';
import { ConsoleLiveStream, type ConsoleLiveStatus, type ConsoleLiveStreamOptions } from './live-stream.js';
import { consoleRequest, fillRouteTemplate, type ConsoleRequestResult } from './http.js';
import { panelDefinitionFromServer, type ServerPanelConsoleRenderer } from './schema/hydrate.js';
import { normalizeSchemaID, renderConsoleActionForm } from './schema/controls.js';
import { applyPanelActionPayload, buildPanelActionPayload, setPayloadPath } from './schema/actions.js';
import { normalizeTone, renderActionSlot } from './schema/rich.js';
import {
  CONSOLE_CAPABILITIES_HEADER,
  CONSOLE_CAPABILITIES_QUERY,
  CONSOLE_OUTDATED_REASON,
  consoleActionState,
  consoleCapabilitiesValue,
} from './capabilities.js';
import {
  ConsoleRequestLedger,
  REQUEST_ID_UNAVAILABLE_REASON,
  canonicalJSON,
  canReplayRequest,
  applyRequestStatus,
  decideSubmission,
  displayedRequestID,
  draftKey,
  freezeSubmission,
  generateRequestID,
  newRequestDraft,
  requestUnresolved,
  restoreDraft,
  startNewRequest,
  validRequestID,
  type ConsoleRequestDraft,
  type ConsoleRequestMode,
  type ConsoleSubmittedRequest,
} from './requests.js';
import { ConsoleDrawer } from './drawer.js';
import type { ConsoleConfirmRequest } from './confirm.js';
import { resetBusy, setBusy } from '../shared/behaviors/busy.js';

export type ConsoleRuntimeState = 'loading' | 'ready' | 'denied' | 'error' | 'disposed';

export type ConsoleConnectionState = ConsoleLiveStatus | 'offline';

/**
 * One rendered change: the panels whose records changed (every authorized
 * panel after a snapshot, none on denial or disposal), whether a whole
 * authorized snapshot was applied, and the current state.
 */
export type ConsoleRuntimeChange = {
  state: ConsoleRuntimeState;
  panels: string[];
  snapshot: boolean;
};

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
  /**
   * Confirmation prompt for actions that require it. Defaults to the admin
   * modal with the declared structured confirmation.
   */
  confirm?: (message: string, request?: ConsoleConfirmRequest) => boolean | Promise<boolean>;
  /** Toast sink for background completions; defaults to the admin toast manager. */
  notify?: (tone: string, message: string) => void;
  /** Request ID source (tests); defaults to the browser's cryptographic UUIDs. */
  generateRequestID?: () => string;
  /**
   * Called after each rendered change, so instance extensions can follow the
   * records of panels other than the one they render and drop protected state
   * on denial or disposal. Errors thrown by the callback are contained.
   */
  onChange?: (change: ConsoleRuntimeChange) => void;
};

type ActionResultView = {
  status: 'ok' | 'error';
  tone: string;
  message: string;
  actionID: string;
  data?: unknown;
  requestID?: string;
  record?: { panelId: string; recordKey: string };
  followUp?: PanelUIActionRef[];
  reload?: boolean;
  /** Offer a status check for the request this result left unresolved. */
  checkRequest?: boolean;
};

type DispatchContext = {
  panelId: string;
  actionId: string;
  payload: Record<string, unknown>;
  mode: ConsoleRequestMode;
  form: HTMLFormElement | null;
  draft?: ConsoleRequestDraft;
  request?: ConsoleSubmittedRequest;
};

type NoticeKind = 'none' | 'loading' | 'error' | 'denied';

const ROOT_SELECTOR = '[data-console-root]';
/** Page header group carrying live status and Refresh for one root. */
const PAGE_CONTROLS_SELECTOR = '[data-console-page-actions][data-console-for]';
const BOOTSTRAP_SELECTOR = 'script[type="application/json"][data-console-bootstrap]';
const WIDGET_SELECTOR = 'script[type="application/json"][data-console-widget]';
const LIST_RENDERERS = new Set(['table', 'status_list', 'timeline']);
const POLICY_CLOSE_CODES = new Set([1008, 4401, 4403]);
const DEFAULT_RECOVERY_DELAYS_MS = [1000, 2000, 5000, 10000, 30000];
const ACTIVE_PANEL_KEY = 'active-panel';
const FRAME_FALLBACK_MS = 16;
const DEFAULT_SNAPSHOT_WAIT_MS = 5000;
/** Rank of panels without a declared order, as for hydrated definitions. */
const DEFAULT_PANEL_ORDER = 100;
/** Policy closes tolerated per window before live updates stop retrying. */
const POLICY_CLOSE_LIMIT = 3;
const POLICY_CLOSE_WINDOW_MS = 60000;
/** Session ledger of unresolved request drafts (ADR-0003). */
const REQUEST_LEDGER_KEY = 'requests';
/** Responses that leave delivery of an idempotent request unknown. */
const UNCERTAIN_STATUSES = new Set([0, 500, 502, 503, 504]);
const NOTIFIED_LIMIT = 500;
const OPTION_PAGE_LIMIT = 25;
const OPTION_SEARCH_DELAY_MS = 250;
const UNAVAILABLE_ACTION_MESSAGE = 'This action is no longer available.';
/** Delegated navigation controls: action references, links, banners and copy buttons. */
const NAVIGATION_CONTROLS = '[data-console-action-ref], [data-console-panel-link], [data-console-record-link], [data-console-banner-dismiss], [data-copy-trigger]';
/** Delegated request-draft controls inside forms and banners. */
const REQUEST_CONTROLS = '[data-advanced-toggle], [data-copy-request-id], [data-new-request], [data-request-check], [data-request-resubmit], [data-request-new], [data-option-more]';

const mounted = new WeakMap<HTMLElement, ConsoleRuntime>();
/** Page header groups claimed by a live runtime; a group serves one instance. */
const boundPageControls = new WeakMap<HTMLElement, ConsoleRuntime>();
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
    options: text(value.options) || undefined,
    requests: text(value.requests) || undefined,
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

function optionPageURL(base: string, page: { query: string; cursor: string; pinned: string }): string {
  let url = withQueryParam(base, 'limit', String(OPTION_PAGE_LIMIT));
  if (page.query) url = withQueryParam(url, 'q', page.query.slice(0, 120));
  if (page.cursor) url = withQueryParam(url, 'cursor', page.cursor);
  if (page.pinned) url = withQueryParam(url, 'value', page.pinned);
  return url;
}

function optionMarkup(item: unknown): string {
  if (!isObject(item)) return '';
  const value = text(item.value);
  if (!value) return '';
  const description = text(item.description);
  return `<option value="${escapeAttribute(value)}"${item.disabled === true ? ' disabled' : ''}${description ? ` title="${escapeAttribute(description)}"` : ''}>${escapeHTML(text(item.label) || value)}</option>`;
}

/**
 * Render one authorized option page into a select. Only server items become
 * options; the pinned value survives when the page or its `selected` pins
 * include it. Returns the next cursor.
 */
function applyOptionPage(select: HTMLSelectElement, page: PanelOptionPage, append: boolean, pinned: string): string {
  const existing = new Set(Array.from(select.options).map((item) => item.value));
  const items = (Array.isArray(page.items) ? page.items : []).filter((item) => !append || !existing.has(text(item?.value)));
  const selected = (Array.isArray(page.selected) ? page.selected : []).filter((item) => !items.some((other) => text(other?.value) === text(item?.value)));
  if (append) {
    select.insertAdjacentHTML('beforeend', items.map(optionMarkup).join(''));
  } else {
    const placeholder = `<option value="">${items.length || selected.length ? 'Select…' : 'No options available'}</option>`;
    select.innerHTML = placeholder + selected.map(optionMarkup).join('') + items.map(optionMarkup).join('');
    if (pinned && Array.from(select.options).some((item) => item.value === pinned)) select.value = pinned;
    delete select.dataset.pendingValue;
  }
  const next = text(page.next_cursor);
  if (next) select.dataset.nextCursor = next;
  else delete select.dataset.nextCursor;
  return next;
}

/** Expand or collapse a form's Advanced section from its toggle. */
function setAdvancedExpanded(toggle: HTMLElement, expanded: boolean): void {
  toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  const section = toggle.closest<HTMLElement>('[data-expanded]');
  if (section) section.dataset.expanded = expanded ? 'true' : 'false';
}

/** Pending-request lookup URL: the request ID in the path, its action, scope and first submission time. */
function requestStatusURL(template: string, draft: ConsoleRequestDraft, request: ConsoleSubmittedRequest): string {
  let url = fillRouteTemplate(template, { panel_id: draft.panelID, request_id: request.id });
  url = withQueryParam(url, 'action', draft.actionID);
  if (request.scope) url = withQueryParam(url, 'scope', request.scope);
  return withQueryParam(url, 'submitted_at', request.submittedAt);
}

function shortRequestID(value: string): string {
  return `<code class="console-kv__mono" title="${escapeAttribute(value)}">${escapeHTML(value.slice(0, 8))}</code>`;
}

function statusButton(attribute: string, label: string, ghost = false): string {
  return `<button type="button" class="console-btn console-btn--sm${ghost ? ' console-btn--ghost' : ''}" ${attribute}>${escapeHTML(label)}</button>`;
}

/**
 * Escaped request status markup for a draft's current request: what happened,
 * and only the choices that are safe in that state.
 */
function requestStatusView(request: ConsoleSubmittedRequest | null, inDrawer: boolean): { message: string; actions: string; tone: string } {
  if (!request) return { message: '', actions: '', tone: 'info' };
  const id = shortRequestID(request.id);
  const resubmit = request.partial ? '' : statusButton('data-request-resubmit', 'Resubmit unchanged');
  switch (request.state) {
    case 'pending':
      return { message: `Sending request ${id}…`, actions: '', tone: 'info' };
    case 'checking':
      return { message: `Checking request ${id}…`, actions: '', tone: 'info' };
    case 'uncertain':
      return { message: `Request ${id} may not have been received. Check its status before starting new work.`, actions: statusButton('data-request-check', 'Check status') + resubmit, tone: 'warning' };
    case 'unclaimed':
      return { message: `Request ${id} was not received.`, actions: resubmit + statusButton('data-request-new', 'Start new request', true), tone: 'warning' };
    case 'unknown':
      return { message: escapeHTML(request.message || 'The state of this request is unknown.'), actions: statusButton('data-request-check', 'Check again') + statusButton('data-request-new', 'Start new request', true), tone: 'warning' };
    case 'expired':
      return { message: `${escapeHTML(request.message || 'This request can no longer be confirmed.')} Start a new request to continue.`, actions: statusButton('data-request-new', 'Start new request'), tone: 'warning' };
    default:
      // Inline forms keep their draft, so say what an unchanged submission does.
      return inDrawer
        ? { message: '', actions: '', tone: 'info' }
        : { message: `Submitting unchanged input repeats request ${id}. Choose New request to start new work.`, actions: '', tone: 'neutral' };
  }
}

/** Field errors carried by an `ok: false` outcome. */
function resultFieldErrors(value: PanelActionResult): Record<string, string> {
  if (value.ok !== false || !isObject(value.errors)) return {};
  return Object.fromEntries(Object.entries(value.errors).map(([key, message]) => [
    key,
    typeof message === 'string' ? message : formatJSON(message, { nullAsEmptyObject: false }),
  ]));
}

/** Banner view for an outcome; planned work never reads as executed. */
function resultView(value: PanelActionResult, panelId: string, actionId: string, request?: ConsoleSubmittedRequest): ActionResultView {
  const failed = value.ok === false;
  const fallback = failed ? 'Action failed.' : value.planned ? 'Planned. Nothing changed.' : 'Action complete.';
  const record = isObject(value.record) ? value.record as Record<string, unknown> : null;
  const recordKey = text(record?.record_key);
  return {
    status: failed ? 'error' : 'ok',
    tone: normalizeTone(value.tone) || (failed ? 'error' : value.planned ? 'planned' : 'success'),
    message: text(value.message) || fallback,
    actionID: actionId,
    data: value.data,
    requestID: request?.id,
    record: recordKey ? { panelId: normalizeSchemaID(record?.panel_id) || panelId, recordKey } : undefined,
    followUp: Array.isArray(value.follow_up) ? value.follow_up : undefined,
  };
}

/** Required and declared-bound violations for one operator field, else ''. */
function fieldValidationMessage(field: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement): string {
  const checkbox = field instanceof HTMLInputElement && field.type === 'checkbox';
  const value = checkbox ? '' : field.value.trim();
  if (!checkbox && !value && field.hasAttribute('required')) return 'Enter a value.';
  const kind = text(field.dataset.actionFieldKind).toLowerCase();
  if (!value || (kind !== 'number' && kind !== 'integer')) return '';
  const number = Number(value);
  if (!Number.isFinite(number) || (kind === 'integer' && !Number.isInteger(number))) {
    return kind === 'integer' ? 'Enter a whole number.' : 'Enter a number.';
  }
  const min = field.getAttribute('min');
  const max = field.getAttribute('max');
  if (min !== null && number < Number(min)) return `Enter ${min} or more.`;
  if (max !== null && number > Number(max)) return `Enter ${max} or less.`;
  return '';
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
  /** Request drafts per panel action; they outlive rendered forms and drawers. */
  private readonly drafts = new Map<string, ConsoleRequestDraft>();
  private readonly ledger: ConsoleRequestLedger;
  /** Actions with a dispatch in flight, and the submitter that started it. */
  private readonly inFlight = new Map<string, ConsoleRequestMode>();
  /** Operator input of mounted forms, restored when a rerender replaces them. */
  private readonly workingValues = new Map<string, Record<string, string | boolean>>();
  /** Background notification IDs already shown or present in a snapshot. */
  private readonly notified = new Set<string>();
  private readonly controllers = new Set<AbortController>();
  private readonly cleanup: Array<() => void> = [];
  private readonly regions: {
    tabs: HTMLElement;
    filters: HTMLElement;
    panel: HTMLElement;
    notice: HTMLElement;
    connection: HTMLElement | null;
    status: HTMLElement | null;
    refresh: HTMLButtonElement | null;
    /** Page header group bound to this root, when the controls live outside it. */
    pageControls: HTMLElement | null;
  };

  private state: ConsoleRuntimeState = 'loading';
  private connection: ConsoleConnectionState = 'offline';
  private activePanel = '';
  private policyCloses: number[] = [];
  private stream: ConsoleLiveStream | null = null;
  private recoveryPromise: Promise<void> | null = null;
  private recoveryPending = false;
  private snapshotEpoch = 0;
  /** The next live snapshot is the first frame of a newly connected socket. */
  private freshStreamSnapshot = false;
  private recoveryAttempts = 0;
  private recoveryTimer: ReturnType<typeof setTimeout> | null = null;
  private cancelFrame: (() => void) | null = null;
  private dirtyPanels = new Set<string>();
  private structureDirty = false;
  private livePanels: string[] = [];
  private snapshotWaitTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly definitionSignatures = new Map<string, string>();
  private drawer: ConsoleDrawer | null = null;
  /** The host refused this client's assets: workflow actions wait for a reload. */
  private clientOutdated = false;
  private requestsRestored = false;
  private highlight: { panelId: string; recordKey: string } | null = null;
  private readonly generate: () => string;
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
    this.generate = options.generateRequestID || (() => generateRequestID());
    this.ledger = new ConsoleRequestLedger({
      get: () => this.preferences.get(REQUEST_LEDGER_KEY, 'session'),
      set: (value) => this.preferences.set(REQUEST_LEDGER_KEY, value, 'session'),
      remove: () => this.preferences.remove(REQUEST_LEDGER_KEY, 'session'),
    });
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
    this.closeDrawer(false);
    this.releaseHeaderControls();
    this.registry.dispose();
    this.store.clear();
    this.serverDefinitions.clear();
    this.actionResults.clear();
    this.filterState.clear();
    this.drafts.clear();
    this.inFlight.clear();
    this.workingValues.clear();
    if (mounted.get(this.root) === this) mounted.delete(this.root);
    this.root.dataset.consoleState = 'disposed';
    this.emitChange([], false);
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
      const epoch = this.snapshotEpoch;
      const controller = new AbortController();
      this.controllers.add(controller);
      const result = await consoleRequest<ConsoleSnapshot>(this.bootstrap.urls.snapshot, {
        method: 'GET',
        headers: this.requestHeaders(),
        signal: controller.signal,
        timeoutMs: this.options.requestTimeoutMs,
        fallbackError: 'Unable to load console data.',
      });
      this.controllers.delete(controller);
      if (this.isClosed()) return;
      // A live snapshot/invalidation supersedes this HTTP observation even
      // when its watermark is equal (grant changes need not publish events).
      // A later explicit trigger still deserves its own fresh observation.
      if (epoch !== this.snapshotEpoch) {
        if (this.recoveryPending) continue;
        return;
      }
      if (!result.ok) {
        if (result.status === 401 || result.status === 403) {
          this.deny(result.error);
        } else {
          this.scheduleRecoveryRetry(result.error.message);
        }
        return;
      }
      // Without live delivery each poll is the only sequence there is.
      if (this.acceptSnapshot(result.value, !this.liveConfigured())) {
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
  private acceptSnapshot(snapshot: ConsoleSnapshot, rewind = false): boolean {
    const outcome = this.store.applySnapshot(snapshot, { rewind });
    if (!outcome.ok) {
      if (outcome.reason === 'stale') return outcome.needsRecovery;
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
    this.snapshotEpoch += 1;
    this.syncDefinitions(snapshot.panels);
    this.rememberNotifications();
    this.setState('ready');
    this.root.dataset.consoleSync = outcome.needsRecovery ? 'recovering' : 'current';
    this.setNotice('none', '', 'none');
    this.syncSubscription();
    this.structureDirty = true;
    this.flush();
    // Reload restores unresolved requests against the first authorized state.
    this.restoreRequests();
    return outcome.needsRecovery;
  }

  private syncDefinitions(panels: ServerPanelDefinition[]): void {
    const authorized = new Set<string>();
    panels.forEach((panel) => {
      const id = normalizeSchemaID(panel?.id);
      if (!id || authorized.has(id)) return;
      authorized.add(id);
      const { records: _records, ...declared } = panel as ServerPanelDefinition & { records?: unknown };
      // Display-only consoles (dashboard widgets) render no action affordances.
      const definition = this.options.display && declared.ui?.actions
        ? { ...declared, ui: { ...declared.ui, actions: [] } }
        : declared;
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
        this.forgetPanelRequests(id);
      }
    }
    this.syncDrawerAvailability();
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

  private liveConfigured(): boolean {
    return Boolean(this.bootstrap.urls.live) && this.options.live !== false;
  }

  private connectLive(): void {
    const live = this.bootstrap.urls.live;
    if (!live || !this.liveConfigured() || this.isClosed()) {
      this.setConnection('offline');
      return;
    }
    const panels = this.byDeclaredOrder(this.store.panelIds());
    this.livePanels = panels;
    const stream = new ConsoleLiveStream({
      ...(this.options.liveOptions || {}),
      url: withQueryParam(withQueryParam(live, 'panels', panels.join(',')), CONSOLE_CAPABILITIES_QUERY, consoleCapabilitiesValue()),
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
    this.freshStreamSnapshot = false;
    this.clearSnapshotWait();
    stream?.close();
  }

  private handleLiveStatus(status: ConsoleLiveStatus): void {
    if (this.isClosed()) return;
    this.setConnection(status);
    if (status === 'connected') {
      // The host's first frame is a fresh authorized snapshot. It covers
      // events held from the previous socket, and after a host restart it
      // starts a new sequence below the cursor.
      this.store.discardBuffered();
      this.freshStreamSnapshot = true;
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
   * Keep requested live selection equal to the current authorized panel set.
   * Reconcile removals too, so regrants become fresh selections even when
   * reconnecting to a host without retained subscription intent.
   */
  private syncSubscription(): void {
    if (!this.stream) return;
    const panels = this.store.panelIds();
    if (panels.length !== this.livePanels.length || panels.some((id) => !this.livePanels.includes(id))) {
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
      const rewind = this.freshStreamSnapshot;
      this.freshStreamSnapshot = false;
      if (this.acceptSnapshot(message, rewind)) void this.recover();
      return;
    }
    if (!isConsoleEvent(message)) return;
    const outcome = this.store.applyEvent(message);
    if (outcome === 'applied') {
      this.notifyBackground(message);
      this.markPanelDirty(normalizeSchemaID(message.panel_id));
    } else if (outcome === 'invalidated') {
      this.snapshotEpoch += 1;
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
    // Revocation clears request drafts and the session ledger with every other
    // identity-bound preference.
    this.closeDrawer(false);
    this.drafts.clear();
    this.inFlight.clear();
    this.workingValues.clear();
    this.highlight = null;
    this.preferences.clear();
    this.activePanel = '';
    this.setConnection('offline');
    // Refresh cannot restore access; the notice offers Reload instead.
    this.setRefreshEnabled(false);
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
  //
  // Every dispatch re-reads the request-scoped declaration: hidden,
  // unavailable, capability-gated, undeclared, withdrawn and foreign-panel
  // actions never dispatch (the host re-checks). Forms with a generated
  // request ID submit through an instance-owned request draft (ADR-0003):
  // identical resubmission replays the frozen ID and payload, other input or
  // another submitter is explicit new work, and unknown delivery reconciles
  // before new work.

  private requestHeaders(): Record<string, string> {
    return { [CONSOLE_CAPABILITIES_HEADER]: consoleCapabilitiesValue() };
  }

  private actionDeclaration(panelId: string, actionId: string): ServerPanelUIAction | undefined {
    if (!panelId || !actionId) return undefined;
    return this.serverDefinitions.get(panelId)?.ui?.actions?.find((action) => normalizeSchemaID(action.id) === actionId);
  }

  /** The current declaration when this client may offer and dispatch it. */
  private executableAction(panelId: string, actionId: string): ServerPanelUIAction | null {
    if (this.state !== 'ready' || this.options.display || !this.visiblePanels().includes(panelId)) return null;
    const action = this.actionDeclaration(panelId, actionId);
    return action && action.hidden !== true && consoleActionState(action).executable ? action : null;
  }

  private actionTarget(element: HTMLElement): { panelId: string; actionId: string } {
    return { panelId: normalizeSchemaID(element.dataset.panelId), actionId: normalizeSchemaID(element.dataset.actionId) };
  }

  /** Controls this instance owns: inside its root (not a nested one) and in its panel or drawer. */
  private ownsControl(element: Element): boolean {
    if (element.closest(ROOT_SELECTOR) !== this.root) return false;
    return this.regions.panel.contains(element) || Boolean(this.drawer?.element.contains(element));
  }

  private confirmationFor(action: ServerPanelUIAction, element?: HTMLElement | null): ConsoleConfirmRequest | null {
    const structured = action.confirmation;
    const confirmText = text(action.confirm_text) || text(element?.dataset.actionConfirm);
    const required = Boolean(structured) || action.requires_confirm === true
      || element?.dataset.actionRequiresConfirm === 'true' || Boolean(confirmText);
    if (!required) return null;
    const label = text(action.label) || normalizeSchemaID(action.id);
    return {
      title: text(structured?.title) || label || 'Confirm action',
      message: text(structured?.message) || confirmText || 'Run this action?',
      changes: structured?.changes,
      note: text(structured?.note) || undefined,
      confirmLabel: text(structured?.confirm_label) || text(action.submit_label) || label || 'Confirm',
      tone: text(structured?.tone) || undefined,
    };
  }

  private async confirmWith(request: ConsoleConfirmRequest): Promise<boolean> {
    if (this.options.confirm) {
      try {
        return Boolean(await this.options.confirm(request.message, request));
      } catch {
        return false;
      }
    }
    // The admin modal loads on first use; consoles without confirmations never fetch it.
    try {
      const { confirmConsoleAction } = await import('./confirm.js');
      return await confirmConsoleAction(request);
    } catch {
      return false;
    }
  }

  /** Forms are needed for operator input, a secondary submitter or drawer content. */
  private actionNeedsForm(action: ServerPanelUIAction): boolean {
    const secondary = normalizeSchemaID(action.secondary_submit?.field);
    const editable = (action.fields || []).some((field) =>
      normalizeSchemaID(field.kind) !== 'hidden' && normalizeSchemaID(field.name) !== secondary);
    return editable || Boolean(action.secondary_submit) || Boolean(action.drawer);
  }

  /** Apply hidden-field defaults and the actual submitter's declared value. */
  private applySubmitter(payload: Record<string, unknown>, action: ServerPanelUIAction, mode: ConsoleRequestMode): void {
    const secondary = action.secondary_submit;
    const secondaryField = normalizeSchemaID(secondary?.field);
    (action.fields || []).forEach((field) => {
      const name = normalizeSchemaID(field.name);
      const hidden = normalizeSchemaID(field.kind) === 'hidden';
      if (!name || (!hidden && name !== secondaryField)) return;
      const path = text(field.payload_path) || name;
      if (name === secondaryField && mode === 'secondary') {
        setPayloadPath(payload, path, secondary?.value);
      } else if (field.default !== undefined && field.default !== null && typeof field.default !== 'object') {
        setPayloadPath(payload, path, field.default);
      }
    });
  }

  /**
   * Workflow payload from the current declaration (base payload, hidden
   * defaults, submitter value) and the form's operator fields. Generated
   * request fields are excluded from the signature and set at freeze time.
   */
  private composeWorkflowPayload(action: ServerPanelUIAction, form: HTMLFormElement, mode: ConsoleRequestMode): {
    payload: Record<string, unknown>;
    signature: string;
    generated: string[];
  } {
    const base = action.payload && typeof action.payload === 'object' && !Array.isArray(action.payload) ? action.payload : {};
    const payload = buildPanelActionPayload(form, { base, skipGenerated: true });
    this.applySubmitter(payload, action, mode);
    const generated = (action.fields || [])
      .filter((field) => normalizeSchemaID(field.generate) === 'request_id')
      .map((field) => text(field.payload_path) || normalizeSchemaID(field.name))
      .filter(Boolean);
    return { payload, signature: canonicalJSON(payload), generated };
  }

  private hasSensitiveInput(panelId: string, actionId: string): boolean {
    return (this.actionDeclaration(panelId, actionId)?.fields || []).some((field) => field.sensitive === true);
  }

  private draftFor(panelId: string, actionId: string): ConsoleRequestDraft {
    const key = draftKey(panelId, actionId);
    let draft = this.drafts.get(key);
    if (!draft) {
      draft = newRequestDraft(panelId, actionId, this.generate);
      this.drafts.set(key, draft);
    }
    return draft;
  }

  /** Mounted action forms for a panel action (panel first, then the drawer). */
  private mountedForms(panelId?: string, actionId?: string): HTMLFormElement[] {
    const containers = [this.regions.panel, this.drawer?.element].filter((item): item is HTMLElement => Boolean(item));
    const forms: HTMLFormElement[] = [];
    containers.forEach((container) => {
      container.querySelectorAll<HTMLFormElement>('form[data-panel-action-form]').forEach((form) => {
        if (form.closest(ROOT_SELECTOR) !== this.root) return;
        const target = this.actionTarget(form);
        if (panelId && (target.panelId !== panelId || target.actionId !== actionId)) return;
        forms.push(form);
      });
    });
    return forms;
  }

  /** The live form for an action, preferring the drawer the operator is using. */
  private mountedForm(panelId: string, actionId: string, previous: HTMLFormElement | null): HTMLFormElement | null {
    if (previous?.isConnected) return previous;
    const forms = this.mountedForms(panelId, actionId);
    return forms.find((form) => this.drawer?.element.contains(form)) || forms[0] || null;
  }

  /** A `data-panel-action` button: no form, declared payload only. */
  private async runButtonAction(button: HTMLElement): Promise<void> {
    const { panelId, actionId } = this.actionTarget(button);
    const action = this.executableAction(panelId, actionId);
    if (!action || !this.bootstrap.urls.actions || this.inFlight.has(draftKey(panelId, actionId))) return;
    if (this.clientOutdated) {
      this.showOutdated(panelId, actionId);
      return;
    }
    const confirmation = this.confirmationFor(action, button);
    if (confirmation && !(await this.confirmWith(confirmation))) return;
    if (!this.executableAction(panelId, actionId)) return;
    await this.dispatch({ panelId, actionId, payload: buildPanelActionPayload(button), mode: 'primary', form: null });
  }

  /**
   * Row, card, section and banner action references. They render only for the
   * active panel's own declarations, so a reference naming any other panel is
   * refused even when that panel declares the action.
   */
  private activateActionRef(button: HTMLElement): void {
    if (button.getAttribute('aria-disabled') === 'true' || button.hasAttribute('data-action-unavailable')) return;
    const { panelId, actionId } = this.actionTarget(button);
    if (panelId !== this.activePanel) return;
    const action = this.executableAction(panelId, actionId);
    if (!action) {
      this.showActionResult(this.activePanel, { status: 'error', tone: 'warning', message: UNAVAILABLE_ACTION_MESSAGE, actionID: actionId }, true);
      return;
    }
    const pending = requestUnresolved(this.drafts.get(draftKey(panelId, actionId))?.current);
    if (this.actionNeedsForm(action) || pending) {
      this.openDrawer(panelId, actionId, action, button);
      return;
    }
    void (async () => {
      if (this.clientOutdated) {
        this.showOutdated(panelId, actionId);
        return;
      }
      if (this.inFlight.has(draftKey(panelId, actionId))) return;
      const confirmation = this.confirmationFor(action);
      if (confirmation && !(await this.confirmWith(confirmation))) return;
      const current = this.executableAction(panelId, actionId);
      if (!current) return;
      const payload = current.payload && typeof current.payload === 'object' && !Array.isArray(current.payload)
        ? JSON.parse(JSON.stringify(current.payload)) as Record<string, unknown>
        : {};
      this.applySubmitter(payload, current, 'primary');
      await this.dispatch({ panelId, actionId, payload, mode: 'primary', form: null });
    })();
  }

  private async submitForm(form: HTMLFormElement, submitter: HTMLElement | null): Promise<void> {
    const { panelId, actionId } = this.actionTarget(form);
    if (!this.bootstrap.urls.actions || !panelId || !actionId || this.inFlight.has(draftKey(panelId, actionId))) return;
    const action = this.executableAction(panelId, actionId);
    if (!action) {
      this.setFormMessage(form, UNAVAILABLE_ACTION_MESSAGE, 'warning');
      return;
    }
    if (this.clientOutdated) {
      this.setFormMessage(form, CONSOLE_OUTDATED_REASON, 'warning');
      this.showOutdated(panelId, actionId);
      return;
    }
    const mode: ConsoleRequestMode = submitter?.dataset.submitter === 'secondary' && action.secondary_submit ? 'secondary' : 'primary';
    if (form.querySelector('[data-action-field-generated]')) {
      await this.submitWorkflowForm(form, action, panelId, actionId, mode);
      return;
    }
    // Forms without a request draft keep the established contract.
    const confirmation = this.confirmationFor(action, form);
    if (confirmation && !(await this.confirmWith(confirmation))) return;
    if (!this.executableAction(panelId, actionId)) return;
    const payload = buildPanelActionPayload(form);
    if (action.secondary_submit) this.applySubmitter(payload, action, mode);
    await this.dispatch({ panelId, actionId, payload, mode, form });
  }

  private async submitWorkflowForm(
    initialForm: HTMLFormElement,
    action: ServerPanelUIAction,
    panelId: string,
    actionId: string,
    mode: ConsoleRequestMode,
  ): Promise<void> {
    let form = initialForm;
    const draft = this.draftFor(panelId, actionId);
    this.clearFieldErrors(form);
    const errors = this.validateWorkflowForm(form);
    if (Object.keys(errors).length > 0) {
      this.showFieldErrors(form, errors);
      const invalid = form.querySelector<HTMLElement>('[aria-invalid="true"]');
      const advanced = invalid?.closest<HTMLElement>('[data-expanded]')?.querySelector<HTMLElement>('[data-advanced-toggle]');
      if (advanced) setAdvancedExpanded(advanced, true);
      invalid?.focus();
      return;
    }
    let current = action;
    let composed = this.composeWorkflowPayload(current, form, mode);
    let decision = decideSubmission(draft, mode, composed.signature);
    if (decision.kind === 'blocked') {
      await this.handleBlockedRequest(draft, decision.reason, decision.check, mode, composed.signature);
      return;
    }
    if (decision.kind === 'replay') {
      await this.sendRequest(draft, decision.request, form);
      return;
    }
    const confirmation = this.confirmationFor(current, form);
    if (confirmation) {
      const key = draftKey(panelId, actionId);
      if (current.confirmation) {
        // Reload authoritative state first; the refreshed declaration carries
        // the generation this confirmation binds into the frozen payload.
        this.inFlight.set(key, mode);
        this.syncBusy();
        await this.refresh();
        this.inFlight.delete(key);
        this.syncBusy();
        if (this.isClosed()) return;
        const fresh = this.executableAction(panelId, actionId);
        form = this.mountedForm(panelId, actionId, form) || form;
        if (this.root.dataset.consoleSync !== 'current') {
          // Never confirm against state that could not be reloaded.
          this.setFormMessage(form, 'The current state could not be loaded. Try again.', 'warning');
          return;
        }
        if (!fresh) {
          this.setFormMessage(form, UNAVAILABLE_ACTION_MESSAGE, 'warning');
          return;
        }
        current = fresh;
        composed = this.composeWorkflowPayload(current, form, mode);
      }
      const prompt = this.confirmationFor(current, form) || confirmation;
      if (!(await this.confirmWith(prompt))) return;
      if (this.isClosed()) return;
      if (!this.executableAction(panelId, actionId)) {
        this.setFormMessage(this.mountedForm(panelId, actionId, form) || form, UNAVAILABLE_ACTION_MESSAGE, 'warning');
        return;
      }
      decision = decideSubmission(draft, mode, composed.signature);
      if (decision.kind === 'blocked') {
        await this.handleBlockedRequest(draft, decision.reason, decision.check, mode, composed.signature);
        return;
      }
      if (decision.kind === 'replay') {
        await this.sendRequest(draft, decision.request, form);
        return;
      }
    }
    const id = decision.kind === 'new' ? decision.id : '';
    if (!id) return;
    const payload = composed.payload;
    composed.generated.forEach((path) => setPayloadPath(payload, path, id));
    const request = freezeSubmission(draft, id, mode, payload, composed.signature, text(current.request_scope), this.generate);
    await this.sendRequest(draft, request, form);
  }

  private async handleBlockedRequest(draft: ConsoleRequestDraft, reason: string, check: boolean | undefined, mode: ConsoleRequestMode, signature: string): Promise<void> {
    this.renderRequestState(draft, reason);
    if (check && draft.current?.signature === signature && draft.current.mode === mode) await this.checkRequest(draft);
  }

  /** Required values and declared numeric bounds for workflow forms. */
  private validateWorkflowForm(form: HTMLFormElement): Record<string, string> {
    const errors: Record<string, string> = {};
    form.querySelectorAll<HTMLElement>('[data-action-field]').forEach((field) => {
      if (!(field instanceof HTMLInputElement || field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement)) return;
      if (field.disabled || field.hasAttribute('data-action-field-generated')) return;
      const hiddenAncestor = field.closest('[hidden]');
      if (hiddenAncestor && form.contains(hiddenAncestor)) return;
      const message = fieldValidationMessage(field);
      if (message) errors[text(field.dataset.actionFieldPath) || text(field.dataset.actionField)] = message;
    });
    return errors;
  }

  /** Mark a frozen request pending (persisting it first) and send it. */
  private async sendRequest(draft: ConsoleRequestDraft, request: ConsoleSubmittedRequest, form: HTMLFormElement | null): Promise<void> {
    // New requests start pending. Every replay path passes this same authority
    // check, including form submits, banners and delayed confirmations.
    if (request.state !== 'pending' && !canReplayRequest(request)) {
      await this.checkRequest(draft);
      return;
    }
    request.state = 'pending';
    request.message = undefined;
    this.ledger.put(draft, request, this.hasSensitiveInput(draft.panelID, draft.actionID));
    this.renderRequestState(draft);
    await this.dispatch({
      panelId: draft.panelID,
      actionId: draft.actionID,
      payload: request.payload,
      mode: request.mode,
      form,
      draft,
      request,
    });
  }

  private async dispatch(context: DispatchContext): Promise<void> {
    const { panelId, actionId, payload, mode } = context;
    const key = draftKey(panelId, actionId);
    const url = fillRouteTemplate(this.bootstrap.urls.actions || '', { panel_id: panelId, action_id: actionId });
    if (!url) return;
    this.inFlight.set(key, mode);
    this.syncBusy();
    if (context.form) this.clearFieldErrors(context.form);
    const controller = new AbortController();
    this.controllers.add(controller);
    const result = await consoleRequest<PanelActionResult>(url, {
      method: 'POST',
      json: payload,
      headers: this.requestHeaders(),
      signal: controller.signal,
      timeoutMs: this.options.requestTimeoutMs,
      fallbackError: 'Action failed.',
    });
    this.controllers.delete(controller);
    this.inFlight.delete(key);
    if (this.isClosed()) return;
    this.syncBusy();
    const form = this.mountedForm(panelId, actionId, context.form);
    if (context.draft && context.request) this.settleRequest(context.draft, context.request, result);
    if (result.ok) {
      this.applyActionResult(form, panelId, actionId, result.value, context.request);
    } else {
      this.applyActionFailure(form, panelId, actionId, result.status, result.error, context.request);
    }
  }

  /** Resolve the frozen request, or keep it unresolved when delivery is unknown. */
  private settleRequest(draft: ConsoleRequestDraft, request: ConsoleSubmittedRequest, result: ConsoleRequestResult<PanelActionResult>): void {
    if (draft.current !== request) return;
    if (!result.ok && UNCERTAIN_STATUSES.has(result.status)) {
      request.state = 'uncertain';
      request.message = 'This request may not have been received.';
      this.ledger.put(draft, request, this.hasSensitiveInput(draft.panelID, draft.actionID));
    } else {
      request.state = 'resolved';
      request.message = undefined;
      this.ledger.remove(request.id);
    }
    this.renderRequestState(draft);
  }

  private applyActionFailure(
    form: HTMLFormElement | null,
    panelId: string,
    actionId: string,
    status: number,
    error: ConsoleError,
    request?: ConsoleSubmittedRequest,
  ): void {
    if (status === 401) {
      this.deny(error);
      return;
    }
    if (error.code === 'CONSOLE_CLIENT_OUTDATED') {
      this.clientOutdated = true;
      this.root.dataset.consoleOutdated = 'true';
      this.closeDrawerFor(panelId, actionId);
      this.showActionResult(panelId, { status: 'error', tone: 'warning', message: error.message || CONSOLE_OUTDATED_REASON, actionID: actionId, reload: true }, true);
      return;
    }
    if (request && request.state === 'uncertain') {
      const message = 'We could not confirm this request was received. Check its status before starting new work.';
      if (!this.drawerFor(panelId, actionId)) {
        this.showActionResult(panelId, { status: 'error', tone: 'warning', message, actionID: actionId, requestID: request.id, checkRequest: true }, true);
      }
      return;
    }
    const fields = Object.keys(error.fields).length > 0;
    if (form && fields) this.showFieldErrors(form, error.fields);
    const message = status === 403 ? 'You are not allowed to run this action.' : error.message;
    if (fields && form && this.drawerFor(panelId, actionId)) {
      this.setFormMessage(form, message, 'error');
    } else {
      this.closeDrawerFor(panelId, actionId);
      this.showActionResult(panelId, { status: 'error', tone: 'error', message, actionID: actionId, requestID: request?.id }, true);
    }
    if (status === 403) {
      // Execute and read are separate grants; revalidate read access.
      void this.refresh();
    }
  }

  private applyActionResult(
    form: HTMLFormElement | null,
    panelId: string,
    actionId: string,
    response: unknown,
    request?: ConsoleSubmittedRequest,
    focus = true,
  ): void {
    const value: PanelActionResult = isObject(response) ? response as PanelActionResult : {};
    const fieldErrors = resultFieldErrors(value);
    if (form && Object.keys(fieldErrors).length > 0) this.showFieldErrors(form, fieldErrors);
    const view = resultView(value, panelId, actionId, request);
    if (form && Object.keys(fieldErrors).length > 0 && this.drawerFor(panelId, actionId)) {
      // Field errors keep the operator in the drawer next to the fields.
      this.setFormMessage(form, view.message, 'error');
    } else {
      this.closeDrawerFor(panelId, actionId);
      this.showActionResult(panelId, view, focus);
      if (view.record && view.record.panelId === panelId) {
        this.highlight = { ...view.record };
        this.applyHighlight(true);
      }
    }
    if (isConsoleEvent(value.event)) {
      // The operator already sees this outcome in the banner; never toast it too.
      const note = this.notificationOf(normalizeSchemaID(value.event.panel_id), value.event.data);
      if (note) this.remember(note.id);
      this.handleLiveMessage(value.event);
    }
    if (value.refresh) {
      void this.refresh();
    }
  }

  private showOutdated(panelId: string, actionId: string): void {
    this.showActionResult(panelId || this.activePanel, { status: 'error', tone: 'warning', message: CONSOLE_OUTDATED_REASON, actionID: actionId, reload: true }, true);
  }

  private showActionResult(panelId: string, view: ActionResultView, focus = false): void {
    if (!panelId) return;
    this.actionResults.set(panelId, view);
    if (panelId === this.activePanel) this.renderActionResult(focus);
  }

  /** Result banner at the top of the originating panel. */
  private renderActionResult(focus = false): void {
    const view = this.actionResults.get(this.activePanel);
    const target = Array.from(this.regions.panel.querySelectorAll<HTMLElement>('[data-panel-action-result]'))
      .find((element) => element.dataset.panelActionResult === this.activePanel);
    if (!target) return;
    if (!view) {
      target.innerHTML = '';
      return;
    }
    const tone = normalizeTone(view.tone) || (view.status === 'error' ? 'error' : 'success');
    const serverDef = this.serverDefinitions.get(this.activePanel);
    const requestLine = view.requestID
      ? `<p class="console-banner__meta">Request <code class="console-kv__mono" title="${escapeAttribute(view.requestID)}">${escapeHTML(view.requestID.slice(0, 8))}</code></p>`
      : '';
    const recordLink = view.record && this.visiblePanels().includes(view.record.panelId)
      ? `<button type="button" class="console-btn console-btn--sm" data-console-record-link data-panel-id="${escapeAttribute(view.record.panelId)}" data-record-key="${escapeAttribute(view.record.recordKey)}">View</button>`
      : '';
    const followUp = view.followUp ? renderActionSlot(view.followUp, serverDef, this.styles) : '';
    const check = view.checkRequest && view.requestID
      ? `<button type="button" class="console-btn console-btn--sm" data-request-check data-panel-id="${escapeAttribute(this.activePanel)}" data-action-id="${escapeAttribute(view.actionID)}">Check status</button>`
      : '';
    const reload = view.reload ? '<button type="button" class="console-btn console-btn--sm" data-console-action="reload">Reload</button>' : '';
    const data = view.data === undefined
      ? ''
      : `<details class="console-banner__details"><summary>Details</summary><pre class="${this.styles.jsonPanel}">${escapeHTML(formatJSON(view.data, { nullAsEmptyObject: false }))}</pre></details>`;
    target.innerHTML = `<div class="console-banner" data-console-banner data-tone="${tone}" data-status="${view.status}" role="${view.status === 'error' ? 'alert' : 'status'}" tabindex="-1"><div class="console-banner__body"><p class="console-banner__message">${escapeHTML(view.message)}</p>${requestLine}${data}</div><div class="console-banner__actions">${recordLink}${check}${followUp}${reload}<button type="button" class="console-btn console-btn--ghost console-btn--sm console-btn--icon" data-console-banner-dismiss aria-label="Dismiss"><span aria-hidden="true">×</span></button></div></div>`;
    if (focus) target.querySelector<HTMLElement>('[data-console-banner]')?.focus();
  }

  private dismissActionResult(): void {
    this.actionResults.delete(this.activePanel);
    this.highlight = null;
    this.renderActionResult();
    this.applyHighlight();
    this.regions.panel.focus();
  }

  /** Mark the row an outcome concerns; it survives data rerenders. */
  private applyHighlight(scroll = false): HTMLElement | null {
    this.regions.panel.querySelectorAll<HTMLElement>('[data-console-highlight]').forEach((row) => {
      row.removeAttribute('data-console-highlight');
    });
    const target = this.highlight;
    if (!target || target.panelId !== this.activePanel) return null;
    const row = Array.from(this.regions.panel.querySelectorAll<HTMLElement>('[data-row-key]'))
      .find((element) => element.dataset.rowKey === target.recordKey && element.closest(ROOT_SELECTOR) === this.root) || null;
    if (!row) return null;
    row.setAttribute('data-console-highlight', '');
    if (scroll) row.scrollIntoView?.({ block: 'nearest' });
    return row;
  }

  private openRecord(panelId: string, recordKey: string): void {
    if (!this.visiblePanels().includes(panelId) || !recordKey) return;
    this.highlight = { panelId, recordKey };
    this.selectPanel(panelId);
    const row = this.applyHighlight(true);
    if (row) {
      if (!row.hasAttribute('tabindex')) row.tabIndex = -1;
      row.focus();
    } else {
      this.regions.panel.focus();
    }
  }

  private clearFieldErrors(element: HTMLElement): void {
    element.querySelectorAll<HTMLElement>('[data-action-field-error]').forEach((field) => {
      field.textContent = '';
      field.hidden = true;
    });
    element.querySelectorAll<HTMLElement>('[aria-invalid="true"]').forEach((field) => field.removeAttribute('aria-invalid'));
    const status = element.querySelector<HTMLElement>('[data-form-message]');
    if (status) status.remove();
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
        const control = Array.from(element.querySelectorAll<HTMLElement>('[data-action-field]')).find((field) =>
          (field.dataset.actionFieldPath || field.dataset.actionField) === target.dataset.actionFieldError);
        control?.setAttribute('aria-invalid', 'true');
      }
    });
  }

  /** Form-level message (unavailable, refused, field-error summary). */
  private setFormMessage(form: HTMLFormElement, message: string, tone: string): void {
    form.querySelector('[data-form-message]')?.remove();
    const element = form.ownerDocument.createElement('p');
    element.className = 'console-form__message';
    element.setAttribute('data-form-message', '');
    element.setAttribute('role', tone === 'error' ? 'alert' : 'status');
    element.dataset.tone = normalizeTone(tone) || 'warning';
    element.textContent = message;
    const actions = form.querySelector('.console-form__actions, .console-drawer__footer');
    if (actions?.parentElement) actions.parentElement.insertBefore(element, actions);
    else form.appendChild(element);
  }

  // ---------------------------------------------------------------------------
  // Request drafts: rendering, reconciliation and restoration

  /** Reflect a draft into every mounted form of its action. */
  private renderRequestState(draft: ConsoleRequestDraft, note = ''): void {
    this.mountedForms(draft.panelID, draft.actionID).forEach((form) => this.renderFormRequest(form, draft, note));
    this.syncBusy();
  }

  private renderFormRequest(form: HTMLFormElement, draft: ConsoleRequestDraft, note = ''): void {
    const id = displayedRequestID(draft);
    form.querySelectorAll<HTMLInputElement>('input[data-action-field-generated]').forEach((input) => {
      input.value = id;
    });
    // Without a cryptographic ID source nothing may be submitted.
    const unavailable = !validRequestID(id);
    form.querySelectorAll<HTMLButtonElement>('button[data-submitter]').forEach((button) => {
      if (unavailable) {
        button.disabled = true;
        button.dataset.requestDisabled = 'true';
      } else if (button.dataset.requestDisabled === 'true') {
        delete button.dataset.requestDisabled;
        button.disabled = false;
      }
    });
    const status = form.querySelector<HTMLElement>('[data-request-status]');
    if (!status) return;
    const request = draft.current;
    const view = unavailable
      ? { message: REQUEST_ID_UNAVAILABLE_REASON, actions: '', tone: 'warning' }
      : requestStatusView(request, Boolean(form.closest('[data-console-drawer]')));
    let { message, actions, tone } = view;
    if (note) {
      tone = 'warning';
      message = message ? `${message} ${escapeHTML(note)}` : escapeHTML(note);
      if (request?.state === 'uncertain' && !actions.includes('data-request-check')) actions = statusButton('data-request-check', 'Check status') + actions;
    }
    status.hidden = !message;
    status.dataset.tone = tone;
    status.dataset.state = request?.state || 'draft';
    status.setAttribute('role', tone === 'warning' ? 'alert' : 'status');
    status.innerHTML = message ? `<p class="console-request-status__message">${message}</p>${actions ? `<div class="console-request-status__actions">${actions}</div>` : ''}` : '';
  }

  /** Authorized reconciliation through the host's pending-request route. */
  private async checkRequest(draft: ConsoleRequestDraft, interactive = true): Promise<void> {
    const request = draft.current;
    if (!request || request.state === 'pending' || request.state === 'checking' || this.isClosed()) return;
    const template = this.bootstrap.urls.requests;
    if (!template) {
      request.state = 'expired';
      request.message = 'This console cannot confirm earlier requests.';
      this.ledger.put(draft, request, true);
      this.renderRequestState(draft);
      return;
    }
    const previous = request.state;
    request.state = 'checking';
    this.renderRequestState(draft);
    const controller = new AbortController();
    this.controllers.add(controller);
    const result = await consoleRequest<PanelRequestStatus>(requestStatusURL(template, draft, request), {
      method: 'GET',
      headers: this.requestHeaders(),
      signal: controller.signal,
      timeoutMs: this.options.requestTimeoutMs,
      fallbackError: 'Unable to check this request.',
    });
    this.controllers.delete(controller);
    if (this.isClosed() || draft.current !== request) return;
    if (!result.ok) {
      this.applyFailedCheck(draft, request, previous, result.status, result.error);
      return;
    }
    const status = text(result.value?.status).toLowerCase();
    request.state = applyRequestStatus(request, status, result.value?.retry_until);
    if (status === 'claimed') {
      this.ledger.remove(request.id);
      this.renderRequestState(draft);
      const outcome = isObject(result.value.result) ? result.value.result : { message: text(result.value.message) || 'The request was received.' };
      this.applyActionResult(null, draft.panelID, draft.actionID, outcome, request, interactive);
      return;
    }
    // Unclaimed may be resubmitted unchanged; unknown and expired need an explicit choice.
    const resumable = request.state === 'unclaimed' || request.state === 'unknown';
    request.message = text(result.value.message) || undefined;
    if (!this.actionDeclaration(draft.panelID, draft.actionID)) {
      this.settleWithdrawnRequest(draft, request);
      return;
    }
    this.ledger.put(draft, request, !resumable || this.hasSensitiveInput(draft.panelID, draft.actionID));
    this.renderRequestState(draft);
  }

  /** A restored request whose action is gone can only be reported, never resumed. */
  private settleWithdrawnRequest(draft: ConsoleRequestDraft, request: ConsoleSubmittedRequest): void {
    this.ledger.remove(request.id);
    this.drafts.delete(draftKey(draft.panelID, draft.actionID));
    const detail = request.message ? ` ${request.message}` : '';
    this.showActionResult(draft.panelID, {
      status: 'error',
      tone: 'warning',
      message: `An earlier request could not be confirmed and its action is no longer offered.${detail}`,
      actionID: draft.actionID,
      requestID: request.id,
    });
  }

  /** A lookup that could not answer keeps the uncertainty visible. */
  private applyFailedCheck(draft: ConsoleRequestDraft, request: ConsoleSubmittedRequest, previous: ConsoleSubmittedRequest['state'], status: number, error: ConsoleError): void {
    if (status === 401) {
      this.deny(error);
      return;
    }
    const gone = status === 403 || status === 404;
    if (gone) {
      request.state = 'expired';
      request.message = 'This request\u2019s status cannot be checked.';
      this.ledger.put(draft, request, true);
    } else {
      // A failed refresh cannot extend a stale grant or restore unclaimed
      // authority. Keep its frozen input and require another successful check.
      request.state = previous === 'unknown' ? previous : 'uncertain';
      request.retryUntil = undefined;
      request.message = error.message;
    }
    this.renderRequestState(draft, gone ? '' : 'The status check failed. Try again.');
  }

  private async resubmitRequest(draft: ConsoleRequestDraft): Promise<void> {
    const request = draft.current;
    if (!request || request.partial || (request.state !== 'uncertain' && request.state !== 'unclaimed')) return;
    if (!this.executableAction(draft.panelID, draft.actionID)) {
      this.renderRequestState(draft, UNAVAILABLE_ACTION_MESSAGE);
      return;
    }
    if (this.clientOutdated || this.inFlight.has(draftKey(draft.panelID, draft.actionID))) return;
    await this.sendRequest(draft, request, this.mountedForm(draft.panelID, draft.actionID, null));
  }

  /** Explicit new work: forget a settled request and show a fresh ID. */
  private beginNewRequest(draft: ConsoleRequestDraft): void {
    const previous = draft.current;
    if (!startNewRequest(draft, this.generate)) {
      this.renderRequestState(draft, 'Check the earlier request before starting new work.');
      return;
    }
    if (previous) this.ledger.remove(previous.id);
    draft.nextID = this.generate();
    this.renderRequestState(draft);
  }

  /** Restore unresolved requests from the session ledger and reconcile them. */
  private restoreRequests(): void {
    if (this.requestsRestored || this.options.display || this.state !== 'ready') return;
    this.requestsRestored = true;
    this.ledger.entries().forEach((entry) => {
      // The lookup needs panel read only, so a withdrawn action still reconciles.
      if (!this.serverDefinitions.has(entry.panel_id)) {
        this.ledger.remove(entry.request_id);
        return;
      }
      const key = draftKey(entry.panel_id, entry.action_id);
      if (this.drafts.get(key)?.current) return;
      const draft = restoreDraft(entry, this.generate);
      this.drafts.set(key, draft);
      this.renderRequestState(draft);
      if (draft.current?.state !== 'expired') void this.checkRequest(draft, false);
    });
  }

  /** A revoked panel takes its drafts and ledger entries with it. */
  private forgetPanelRequests(panelId: string): void {
    for (const [key, draft] of Array.from(this.drafts.entries())) {
      if (draft.panelID !== panelId) continue;
      if (draft.current) this.ledger.remove(draft.current.id);
      this.drafts.delete(key);
      this.workingValues.delete(key);
    }
    if (this.drawer?.panelID === panelId) this.closeDrawer(false);
  }

  // ---------------------------------------------------------------------------
  // Mounted forms, drawers and busy state

  /** Bring rendered forms in line with drafts, captured input and option pages. */
  private mountForms(container: HTMLElement): void {
    container.querySelectorAll<HTMLFormElement>('form[data-panel-action-form]').forEach((form) => {
      if (form.closest(ROOT_SELECTOR) !== this.root) return;
      const { panelId, actionId } = this.actionTarget(form);
      const key = draftKey(panelId, actionId);
      const draft = form.querySelector('[data-action-field-generated]') ? this.draftFor(panelId, actionId) : null;
      const working = this.workingValues.get(key);
      if (draft?.current && requestUnresolved(draft.current) && !draft.current.partial) {
        // An unresolved request shows exactly what was submitted.
        applyPanelActionPayload(form, draft.current.payload);
      } else if (working) {
        this.applyWorkingValues(form, working);
      }
      if (draft) this.renderFormRequest(form, draft);
      form.querySelectorAll<HTMLSelectElement>('select[data-option-paginated]').forEach((select) => {
        void this.loadOptions(form, select, false);
      });
    });
    this.syncBusy();
  }

  private captureWorkingValues(container: HTMLElement): void {
    container.querySelectorAll<HTMLFormElement>('form[data-panel-action-form]').forEach((form) => {
      if (form.closest(ROOT_SELECTOR) !== this.root) return;
      const { panelId, actionId } = this.actionTarget(form);
      const values: Record<string, string | boolean> = {};
      form.querySelectorAll<HTMLElement>('[data-action-field]').forEach((field) => {
        const name = text(field.dataset.actionField);
        if (!name || field.hasAttribute('data-action-field-generated') || field.dataset.actionFieldSensitive === 'true') return;
        if (field instanceof HTMLInputElement && field.type === 'checkbox') values[name] = field.checked;
        else if (field instanceof HTMLInputElement || field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement) values[name] = field.value;
      });
      this.workingValues.set(draftKey(panelId, actionId), values);
    });
  }

  private applyWorkingValues(form: HTMLFormElement, values: Record<string, string | boolean>): void {
    form.querySelectorAll<HTMLElement>('[data-action-field]').forEach((field) => {
      const name = text(field.dataset.actionField);
      if (!name || !(name in values) || field.hasAttribute('data-action-field-generated')) return;
      const value = values[name];
      if (field instanceof HTMLInputElement && field.type === 'checkbox') field.checked = value === true;
      else if (field instanceof HTMLSelectElement && field.hasAttribute('data-option-paginated')) field.dataset.pendingValue = String(value);
      else if (field instanceof HTMLInputElement || field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement) field.value = String(value);
    });
  }

  /** All submitters of an in-flight action are busy together, wherever rendered. */
  private syncBusy(): void {
    this.mountedForms().forEach((form) => {
      const { panelId, actionId } = this.actionTarget(form);
      const mode = this.inFlight.get(draftKey(panelId, actionId));
      if (mode === undefined) {
        if (form.dataset.busy === 'true') resetBusy(form);
        return;
      }
      if (form.dataset.busy === 'true') return;
      const submitters = Array.from(form.querySelectorAll<HTMLButtonElement>('button[type="submit"]'));
      const submitter = form.querySelector<HTMLButtonElement>(`button[data-submitter="${mode}"]`) || submitters[submitters.length - 1] || null;
      setBusy(form, { controls: submitters, includeDescendantControls: false, submitter, indicator: 'submitter', label: 'Working…', generateSpinner: true });
    });
    this.regions.panel.querySelectorAll<HTMLButtonElement>('button[data-panel-action]').forEach((button) => {
      if (button.closest(ROOT_SELECTOR) !== this.root) return;
      const { panelId, actionId } = this.actionTarget(button);
      const busy = this.inFlight.has(draftKey(panelId, actionId));
      if (busy && button.dataset.busy !== 'true') setBusy(button, { label: 'Working…', generateSpinner: true });
      else if (!busy && button.dataset.busy === 'true') resetBusy(button);
    });
  }

  private drawerFor(panelId: string, actionId: string): ConsoleDrawer | null {
    const drawer = this.drawer;
    return drawer && drawer.isOpen() && drawer.panelID === panelId && drawer.actionID === actionId ? drawer : null;
  }

  private openDrawer(panelId: string, actionId: string, action: ServerPanelUIAction, invoker: HTMLElement | null): void {
    this.closeDrawer(false);
    const body = renderConsoleActionForm(panelId, actionId, action, this.styles, this.renderOptions(), 'drawer');
    const drawer = new ConsoleDrawer({
      root: this.root,
      id: `${this.idScope}-drawer-${hashString(`${panelId}/${actionId}`)}`,
      panelID: panelId,
      actionID: actionId,
      title: text(action.drawer?.title) || text(action.label) || actionId,
      eyebrow: text(action.drawer?.eyebrow) || undefined,
      body,
      invoker,
      fallbackFocus: () => this.focusFallback(panelId, actionId),
      onClose: () => {
        if (this.drawer === drawer) this.drawer = null;
        this.releaseDraftAfterClose(panelId, actionId);
      },
    });
    this.drawer = drawer;
    this.mountForms(drawer.element);
    drawer.focusInitial();
  }

  /** Outcomes close only their own action's drawer, never one opened for other work. */
  private closeDrawerFor(panelId: string, actionId: string): void {
    if (this.drawerFor(panelId, actionId)) this.closeDrawer(true);
  }

  private closeDrawer(restoreFocus: boolean): void {
    const drawer = this.drawer;
    this.drawer = null;
    drawer?.close(restoreFocus);
  }

  /** A discarded or settled drawer draft gets a fresh ID on the next open. */
  private releaseDraftAfterClose(panelId: string, actionId: string): void {
    const key = draftKey(panelId, actionId);
    const draft = this.drafts.get(key);
    if (draft && !requestUnresolved(draft.current) && !this.inFlight.has(key)
      && !this.mountedForms(panelId, actionId).length) {
      this.drafts.delete(key);
    }
    this.workingValues.delete(key);
  }

  /** Surviving equivalent control, else the panel itself. */
  private focusFallback(panelId: string, actionId: string): HTMLElement | null {
    const same = Array.from(this.regions.panel.querySelectorAll<HTMLElement>('[data-console-action-ref], [data-panel-action]'))
      .find((element) => element.closest(ROOT_SELECTOR) === this.root
        && normalizeSchemaID(element.dataset.panelId) === panelId
        && normalizeSchemaID(element.dataset.actionId) === actionId
        && !element.closest('[hidden]'));
    return same || this.regions.panel;
  }

  /** A withdrawn drawer action can still be reconciled, never submitted. */
  private syncDrawerAvailability(): void {
    const drawer = this.drawer;
    if (!drawer?.isOpen()) return;
    const form = drawer.element.querySelector<HTMLFormElement>('form[data-panel-action-form]');
    const available = Boolean(this.executableAction(drawer.panelID, drawer.actionID));
    drawer.element.querySelectorAll<HTMLButtonElement>('button[data-submitter]').forEach((button) => {
      if (!available) {
        button.disabled = true;
        button.dataset.withdrawn = 'true';
      } else if (button.dataset.withdrawn === 'true') {
        delete button.dataset.withdrawn;
        if (!this.inFlight.has(draftKey(drawer.panelID, drawer.actionID))) button.disabled = false;
      }
    });
    if (form && !available && !form.querySelector('[data-form-message]')) this.setFormMessage(form, UNAVAILABLE_ACTION_MESSAGE, 'warning');
  }

  // ---------------------------------------------------------------------------
  // Paginated options

  private async loadOptions(form: HTMLFormElement, select: HTMLSelectElement, append: boolean): Promise<void> {
    const { panelId, actionId } = this.actionTarget(form);
    const template = this.bootstrap.urls.options;
    const field = text(select.dataset.actionField);
    const fieldWrap = select.closest<HTMLElement>('[data-field-name]') || form;
    const more = fieldWrap.querySelector<HTMLButtonElement>('[data-option-more]');
    if (!template || !field || this.isClosed()) {
      select.innerHTML = '<option value="">Options are unavailable</option>';
      return;
    }
    const sequence = String(Number(select.dataset.optionSequence || '0') + 1);
    select.dataset.optionSequence = sequence;
    const pinned = select.dataset.pendingValue ?? (append ? '' : select.value);
    const url = optionPageURL(fillRouteTemplate(template, { panel_id: panelId, action_id: actionId, field }), {
      query: text(fieldWrap.querySelector<HTMLInputElement>('[data-option-search]')?.value),
      cursor: append ? select.dataset.nextCursor || '' : '',
      pinned: append ? '' : pinned,
    });
    if (more) more.disabled = true;
    select.setAttribute('aria-busy', 'true');
    const controller = new AbortController();
    this.controllers.add(controller);
    const result = await consoleRequest<PanelOptionPage>(url, {
      method: 'GET',
      headers: this.requestHeaders(),
      signal: controller.signal,
      timeoutMs: this.options.requestTimeoutMs,
      fallbackError: 'Unable to load options.',
    });
    this.controllers.delete(controller);
    if (this.isClosed() || select.dataset.optionSequence !== sequence) return;
    select.removeAttribute('aria-busy');
    if (more) more.disabled = false;
    if (!result.ok) {
      if (result.status === 401) {
        this.deny(result.error);
        return;
      }
      if (!append) select.innerHTML = '<option value="">Options could not be loaded</option>';
      this.showFieldErrors(form, { [text(select.dataset.actionFieldPath) || field]: result.error.message });
      return;
    }
    const next = applyOptionPage(select, isObject(result.value) ? result.value : {}, append, pinned);
    if (more) more.hidden = !next;
  }

  // ---------------------------------------------------------------------------
  // Background notifications

  /**
   * Live upserts whose console view declares `notify_bind` may carry a
   * `{id, message, tone}` notification. Each ID toasts once; snapshot records
   * are remembered without toasting so recovery never replays history.
   */
  private notificationOf(panelId: string, data: unknown): { id: string; message: string; tone: string } | null {
    const view = this.serverDefinitions.get(panelId)?.ui?.views?.console;
    const bind = text(view?.options?.notify_bind);
    if (!bind) return null;
    const note = pathValue(data, bind);
    if (!isObject(note)) return null;
    const id = text(note.id);
    const message = text(note.message);
    if (!id || !message || id.length > 200 || message.length > 300) return null;
    return { id: `${panelId}\u0000${id}`, message, tone: normalizeTone(note.tone) || 'info' };
  }

  private remember(id: string): boolean {
    if (this.notified.has(id)) return false;
    this.notified.add(id);
    if (this.notified.size > NOTIFIED_LIMIT) {
      const oldest = this.notified.values().next().value;
      if (oldest !== undefined) this.notified.delete(oldest);
    }
    return true;
  }

  private rememberNotifications(): void {
    this.store.panelIds().forEach((panelId) => {
      this.store.records(panelId).forEach((record) => {
        const note = this.notificationOf(panelId, record.data);
        if (note) this.remember(note.id);
      });
    });
  }

  private notifyBackground(event: ConsoleEvent): void {
    if (event.kind !== 'upsert' || this.options.display) return;
    const note = this.notificationOf(normalizeSchemaID(event.panel_id), event.data);
    if (!note || !this.remember(note.id)) return;
    this.toast(note.tone, note.message);
  }

  private toast(tone: string, message: string): void {
    if (this.options.notify) {
      this.options.notify(tone, message);
      return;
    }
    const type = tone === 'error' || tone === 'warning' || tone === 'success' ? tone : 'info';
    const host = this.root.ownerDocument.defaultView as (Window & {
      toastManager?: { show?: (options: Record<string, unknown>) => void };
      notify?: Record<string, ((message: string) => void) | undefined>;
    }) | null;
    if (typeof host?.toastManager?.show === 'function') {
      host.toastManager.show({ message, type, dismissible: true, duration: type === 'error' ? 0 : undefined });
      return;
    }
    const notify = host?.notify?.[type];
    if (typeof notify === 'function') {
      notify(message);
      return;
    }
    // Standalone hosts: a polite in-root status region.
    let region = Array.from(this.root.querySelectorAll<HTMLElement>('[data-console-toasts]')).find((element) => element.closest(ROOT_SELECTOR) === this.root);
    if (!region) {
      region = this.root.ownerDocument.createElement('div');
      region.className = 'console-toasts';
      region.setAttribute('data-console-toasts', '');
      region.setAttribute('role', 'status');
      region.setAttribute('aria-live', 'polite');
      this.root.appendChild(region);
    }
    const item = this.root.ownerDocument.createElement('p');
    item.className = 'console-toast';
    item.dataset.tone = type;
    item.textContent = message;
    region.appendChild(item);
    while (region.children.length > 3) region.firstElementChild?.remove();
    setTimeout(() => item.remove(), 8000);
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
    return { tabs, filters, panel, notice, ...this.resolveHeaderControls(own) };
  }

  /**
   * Live status and Refresh. Controls inside the root win (standalone hosts);
   * otherwise exactly one page header group whose data-console-for names this
   * root's unique DOM ID. A console ID alone can repeat on a page, so a missing
   * or duplicated root ID, a second group or a group another instance holds
   * binds nothing rather than letting one control drive another instance.
   */
  private resolveHeaderControls(own: <T extends HTMLElement>(selector: string) => T | null): Pick<ConsoleRuntime['regions'], 'connection' | 'status' | 'refresh' | 'pageControls'> {
    const connection = own<HTMLElement>('[data-console-connection]');
    const status = own<HTMLElement>('[data-console-status]');
    const refresh = own<HTMLButtonElement>('button[data-console-action="refresh"]');
    if (connection || status || refresh) {
      this.root.dataset.consoleControls = 'root';
      return { connection, status, refresh, pageControls: null };
    }
    // Display-only widgets never take page controls.
    if (this.options.display) this.root.dataset.consoleControls = 'none';
    const group = this.options.display ? null : this.pageControlsGroup();
    if (!group) return { connection: null, status: null, refresh: null, pageControls: null };
    boundPageControls.set(group, this);
    this.root.dataset.consoleControls = 'page';
    return {
      connection: group.querySelector<HTMLElement>('[data-console-connection]'),
      status: group.querySelector<HTMLElement>('[data-console-status]'),
      refresh: group.querySelector<HTMLButtonElement>('button[data-console-action="refresh"]'),
      pageControls: group,
    };
  }

  private pageControlsGroup(): HTMLElement | null {
    const id = this.root.id;
    const doc = this.root.ownerDocument;
    const groups = id
      ? Array.from(doc.querySelectorAll<HTMLElement>(PAGE_CONTROLS_SELECTOR))
        .filter((group) => group.getAttribute('data-console-for') === id && !group.closest(ROOT_SELECTOR))
      : [];
    if (groups.length === 0) {
      this.root.dataset.consoleControls = 'none';
      return null;
    }
    const unique = doc.querySelectorAll(`[id="${cssEscape(id)}"]`).length === 1;
    if (!unique || groups.length !== 1 || boundPageControls.has(groups[0])) {
      this.root.dataset.consoleControls = 'ambiguous';
      return null;
    }
    return groups[0];
  }

  private setRefreshEnabled(enabled: boolean): void {
    const refresh = this.regions.refresh;
    if (!refresh) return;
    refresh.disabled = !enabled;
  }

  /** Leave bound header controls inert and free a page group for a remount. */
  private releaseHeaderControls(): void {
    this.connection = 'offline';
    this.renderConnection();
    this.setRefreshEnabled(false);
    const group = this.regions.pageControls;
    if (group && boundPageControls.get(group) === this) boundPageControls.delete(group);
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
      if (!button || !panel.contains(button) || button.disabled || button.closest(ROOT_SELECTOR) !== this.root) return;
      event.preventDefault();
      void this.runButtonAction(button);
    });
    // Forms live in the panel or this instance's drawer.
    this.listen(this.root, 'submit', (event) => {
      const form = (event.target as HTMLElement | null)?.closest<HTMLFormElement>('form[data-panel-action-form]');
      if (!form || !this.ownsControl(form)) return;
      event.preventDefault();
      const submitter = (event as SubmitEvent).submitter;
      if (submitter instanceof HTMLButtonElement && submitter.disabled) return;
      void this.submitForm(form, submitter instanceof HTMLElement ? submitter : null);
    });
    this.listen(panel, 'change', (event) => {
      const picker = (event.target as HTMLElement | null)?.closest<HTMLSelectElement>('[data-panel-action-picker]');
      if (picker && panel.contains(picker)) this.updateActionPicker(picker);
    });
    this.listen(this.root, 'input', (event) => {
      const search = (event.target as HTMLElement | null)?.closest<HTMLInputElement>('input[data-option-search]');
      if (!search || !this.ownsControl(search)) return;
      const form = search.closest<HTMLFormElement>('form[data-panel-action-form]');
      const select = search.closest<HTMLElement>('[data-field-name]')?.querySelector<HTMLSelectElement>('select[data-option-paginated]');
      if (!form || !select) return;
      const pending = Number(search.dataset.searchTimer || '0');
      if (pending) clearTimeout(pending);
      const timer = setTimeout(() => void this.loadOptions(form, select, false), OPTION_SEARCH_DELAY_MS);
      search.dataset.searchTimer = String(timer as unknown as number);
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
    this.listen(this.root, 'click', (event) => this.handleControlClick(event));
    const pageRefresh = this.regions.pageControls ? this.regions.refresh : null;
    if (pageRefresh) {
      this.listen(pageRefresh, 'click', (event) => {
        event.preventDefault();
        if (!pageRefresh.disabled) void this.refresh();
      });
    }
    this.setRefreshEnabled(true);
  }

  /** Delegated controls rendered by the shared views, forms, drawers and banners. */
  private handleControlClick(event: Event): void {
    const target = event.target as HTMLElement | null;
    const control = target?.closest<HTMLElement>(NAVIGATION_CONTROLS) || target?.closest<HTMLElement>(REQUEST_CONTROLS);
    if (!control || !this.ownsControl(control)) return;
    event.preventDefault();
    if (control.matches(NAVIGATION_CONTROLS)) this.handleNavigationControl(control);
    else this.handleRequestControl(control);
  }

  private handleNavigationControl(control: HTMLElement): void {
    if (control.matches('[data-console-action-ref]')) {
      this.activateActionRef(control);
    } else if (control.matches('[data-console-panel-link]')) {
      this.selectPanel(control.dataset.consolePanelLink || '', true);
    } else if (control.matches('[data-console-record-link]')) {
      this.openRecord(normalizeSchemaID(control.dataset.panelId), text(control.dataset.recordKey));
    } else if (control.matches('[data-console-banner-dismiss]')) {
      this.dismissActionResult();
    } else {
      const content = control.closest<HTMLElement>('[data-copy-content]')?.getAttribute('data-copy-content') || '';
      if (content) void this.copyText(content, control);
    }
  }

  /** Controls of a form's request draft, its option pages, or a banner's Check status. */
  private handleRequestControl(control: HTMLElement): void {
    if (control.matches('[data-advanced-toggle]')) {
      setAdvancedExpanded(control, control.getAttribute('aria-expanded') !== 'true');
      return;
    }
    const scope = control.closest<HTMLElement>('form[data-panel-action-form]') || control;
    if (control.matches('[data-option-more]')) {
      const select = control.closest<HTMLElement>('[data-field-name]')?.querySelector<HTMLSelectElement>('select[data-option-paginated]');
      if (scope instanceof HTMLFormElement && select) void this.loadOptions(scope, select, true);
      return;
    }
    if (control.matches('[data-copy-request-id]')) {
      const value = scope.querySelector<HTMLInputElement>('input[data-action-field-generated]')?.value || '';
      if (validRequestID(value)) void this.copyText(value, control);
      return;
    }
    const { panelId, actionId } = this.actionTarget(scope);
    const draft = this.drafts.get(draftKey(panelId, actionId));
    if (!draft) return;
    if (control.matches('[data-request-check]')) void this.checkRequest(draft);
    else if (control.matches('[data-request-resubmit]')) void this.resubmitRequest(draft);
    else this.beginNewRequest(draft);
  }

  private async copyText(value: string, button: HTMLElement): Promise<void> {
    const doc = this.root.ownerDocument;
    let copied = false;
    try {
      const clipboard = doc.defaultView?.navigator?.clipboard;
      if (clipboard && typeof clipboard.writeText === 'function') {
        await clipboard.writeText(value);
        copied = true;
      }
    } catch {
      copied = false;
    }
    if (!copied) {
      const area = doc.createElement('textarea');
      area.value = value;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      doc.body.appendChild(area);
      area.select();
      try {
        copied = typeof doc.execCommand === 'function' && doc.execCommand('copy');
      } catch {
        copied = false;
      }
      area.remove();
      button.focus();
    }
    if (!button.isConnected) return;
    const original = button.dataset.copyLabel ?? button.textContent ?? '';
    button.dataset.copyLabel = original;
    button.dataset.copied = copied ? 'true' : 'false';
    button.textContent = copied ? 'Copied' : 'Copy failed';
    setTimeout(() => {
      if (!button.isConnected) return;
      button.textContent = button.dataset.copyLabel ?? original;
      delete button.dataset.copied;
      delete button.dataset.copyLabel;
    }, 1500);
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
      this.emitChange(this.store.panelIds(), this.state === 'ready');
      return;
    }
    const dirty = Array.from(this.dirtyPanels);
    this.dirtyPanels.clear();
    if (dirty.length === 0) return;
    this.updateCounts();
    if (dirty.includes(this.activePanel)) this.renderPanel(false);
    this.emitChange(dirty, false);
  }

  private emitChange(panels: string[], snapshot: boolean): void {
    const listener = this.options.onChange;
    if (!listener) return;
    try {
      listener({ state: this.state, panels: [...panels], snapshot });
    } catch {
      // An extension failure must not break the console it observes.
    }
  }

  private render(): void {
    this.renderNotice();
    this.renderConnection();
    this.renderTabs();
    this.renderFilters();
    this.renderPanel(true);
  }

  /** Authorized panels that have a renderer, in declared order. */
  private visiblePanels(): string[] {
    return this.byDeclaredOrder(this.store.panelIds()).filter((id) => this.registry.has(id));
  }

  /**
   * Hosts list snapshot panels by ID, so tabs, the default panel and the live
   * selection follow the declared `order` (unset ranks as 100); snapshot order
   * breaks ties.
   */
  private byDeclaredOrder(ids: string[]): string[] {
    const rank = (id: string): number => {
      const order = this.serverDefinitions.get(id)?.order ?? this.registry.get(id)?.order;
      return typeof order === 'number' && Number.isFinite(order) ? order : DEFAULT_PANEL_ORDER;
    };
    return ids
      .map((id, index) => ({ id, index, order: rank(id) }))
      .sort((a, b) => a.order - b.order || a.index - b.index)
      .map((entry) => entry.id);
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
      const tone = this.panelCountTone(panelId, definition);
      const hidden = definition?.hideCount ? definition.hideCount(count) : false;
      return `<button type="button" class="console-tab${active ? ' console-tab--active' : ''}" role="tab" id="${escapeAttribute(`${this.idScope}-tab-${panelId}`)}" aria-selected="${active ? 'true' : 'false'}" aria-controls="${escapeAttribute(this.regions.panel.id)}" tabindex="${active ? '0' : '-1'}" data-console-tab="${escapeAttribute(panelId)}"><span class="console-tab__label">${escapeHTML(definition?.label || panelId)}</span><span class="console-tab__count" data-console-tab-count="${escapeAttribute(panelId)}"${tone ? ` data-tone="${tone}"` : ''}${hidden ? ' hidden' : ''}>${escapeHTML(formatNumber(count))}</span></button>`;
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
      if (!badge) return;
      const definition = this.registry.get(panelId);
      const count = this.panelCount(panelId, definition);
      const tone = this.panelCountTone(panelId, definition);
      badge.textContent = formatNumber(count);
      badge.hidden = definition?.hideCount ? definition.hideCount(count) : false;
      if (tone) badge.dataset.tone = tone;
      else delete badge.dataset.tone;
    });
  }

  private panelCount(panelId: string, definition?: PanelDefinition): number {
    const data = this.panelData(panelId);
    return definition?.getCount ? definition.getCount(data) : defaultGetCount(data);
  }

  private panelCountTone(panelId: string, definition?: PanelDefinition): string {
    return definition?.getCountTone ? normalizeTone(definition.getCountTone(this.panelData(panelId))) : '';
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
        this.applyHighlight();
        return;
      }
      // Rebuilt forms get their operator input back from the instance.
      this.captureWorkingValues(panel);
      const actions = definition.renderActions(this.styles, options);
      panel.innerHTML = `<div class="console-panel__result" data-panel-action-result="${escapeAttribute(panelId)}"></div>${actions.trim() ? `<div class="console-panel__actions" data-console-panel-actions>${actions}</div>` : '<div class="console-panel__actions" data-console-panel-actions hidden></div>'}<div class="console-panel__body" data-console-panel-body>${definition.renderBody(data, this.styles, options)}</div>`;
    } else {
      // Renderers that own their whole panel (instance overrides, client panels)
      // re-render for new data or a full render, not for every revalidation
      // snapshot, so the focus, disclosures and scroll they own survive.
      const signature = hashString(JSON.stringify(data ?? null));
      if (!full && this.panelMounted(panelId) && panel.dataset.consoleData === signature) return;
      this.captureWorkingValues(panel);
      const render = definition.renderConsole || definition.render;
      panel.innerHTML = render(data, this.styles, options);
      panel.dataset.consoleData = signature;
    }
    panel.dataset.consolePanelId = panelId;
    panel.dataset.consoleDefinition = this.definitionSignatures.get(panelId) || '';
    panel.querySelectorAll<HTMLSelectElement>('[data-panel-action-picker]').forEach((picker) => this.updateActionPicker(picker));
    this.mountForms(panel);
    this.renderActionResult();
    this.applyHighlight();
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
    this.root.dataset.consoleLive = this.connection;
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
