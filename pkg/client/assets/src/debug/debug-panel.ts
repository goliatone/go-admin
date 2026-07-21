import Sortable from 'sortablejs';
import { DebugStream, type DebugEvent, type DebugStreamStatus } from './debug-stream.js';
import { DebugReplPanel, type DebugReplCommand } from './repl/repl-panel.js';
import { filterObjectBySearch } from './shared/jsonpath-search.js';
import type {
  RequestEntry,
  SQLEntry,
  LogEntry,
  JSErrorEntry,
  RouteEntry,
  CustomLogEntry,
  DebugSnapshot,
  DebugUserSession,
} from './shared/types.js';
import {
  escapeHTML,
  formatJSON,
  formatTimestamp,
  formatNumber,
  countPayload,
  isSlowDuration,
  ensureArray,
} from './shared/utils.js';
import {
  attachCopyListeners,
  attachExpandableRowListeners,
  attachRequestDetailListeners,
  attachRowExpansion,
  restoreRowExpansion,
} from './shared/interactions.js';
import { consoleStyles } from './shared/styles.js';
import {
  renderRequestsPanel,
  renderSQLPanel,
  renderLogsPanel,
  renderRoutesPanel,
  renderJSONPanel as renderSharedJSONPanel,
  renderCustomPanel,
  renderJSErrorsPanel,
  renderRequestRow,
  requestRowKey,
  renderErrorRow,
  jsErrorRowKey,
  SqlLiveView,
  LiveListView,
  RegistryLiveListManager,
  renderLogRow,
  logRowKey,
  logSearchText,
} from './shared/panels/index.js';
import {
  panelRegistry,
  getSnapshotKey,
  defaultHandleEvent,
  getPanelCount,
  type PanelDefinition,
  type RegistryChangeEvent,
} from './shared/panel-registry.js';
import {
  buildEventToPanel,
  getDefaultPanels,
  getPanelEventTypes,
  getPanelIcon,
  getPanelLabel,
  isKnownPanel,
  normalizeReplCommands,
  replPanelIDs,
} from './shared/runtime-helpers.js';
import { renderDebugIconRef } from './shared/icons.js';
import { applyPanelActionNavigation, buildPanelActionPayload, panelActionHasSensitiveFields } from './shared/panel-actions.js';
import { hydrateServerPanelDefinitions } from './shared/server-definitions.js';
import {
  attachCommandLauncherListeners,
  extractCommandLauncherResult,
  renderCommandLauncherResultCard,
  applyCommandLauncherStatusEvent,
  getCommandLauncherLiveStatus,
  recordCommandLauncherInvocation,
	applyCommandLauncherControllerErrors,
	loadCommandLauncherControllerValues,
	detachCommandLauncherControllers,
} from './shared/panels/command-launcher.js';
import { httpRequest, readExpectedHTTPJSON, readHTTPErrorResult } from '../shared/transport/http-client.js';
// Import to ensure built-in panels are registered
import './shared/builtin-panels.js';

type PanelFilters = {
  requests: { method: string; status: string; search: string; newestFirst: boolean; hasBody: boolean; contentType: string };
  sql: { search: string; slowOnly: boolean; errorOnly: boolean; newestFirst: boolean };
  logs: { level: string; search: string; autoScroll: boolean; newestFirst: boolean };
  routes: { method: string; search: string };
  sessions: { search: string };
  custom: { search: string };
  objects: { search: string };
};

type DebugState = {
  template: Record<string, any>;
  session: Record<string, any>;
  requests: RequestEntry[];
  sql: SQLEntry[];
  logs: LogEntry[];
  config: Record<string, any>;
  routes: RouteEntry[];
  custom: { data: Record<string, any>; logs: CustomLogEntry[] };
  extra: Record<string, any>;
};

type PanelRenderer = {
  render: () => void;
  filters?: () => string;
};

type PanelActionResultView = {
  status: 'ok' | 'error';
  message: string;
  actionID?: string;
  data?: unknown;
  errors?: Record<string, unknown>;
  at?: number;
  durationMs?: number;
};

type PanelOrderPreferenceResponse = {
  available?: boolean;
  found?: boolean;
  panel_order?: unknown;
};

const DEBUG_CONSOLE_ACTIVE_PANEL_KEY = 'debug-console-active-panel';
const DEBUG_CONSOLE_PANEL_ORDER_KEY = 'debug-console-panel-order';

const DEBUG_PANEL_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/;

const parseJSON = (value: string | undefined): any => {
  if (!value) {
    return null;
  }
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const normalizePanelList = (value: any): string[] => {
  if (Array.isArray(value) && value.length > 0) {
    return value.filter((panel) => typeof panel === 'string' && panel.trim()).map((panel) => panel.trim());
  }
  return getDefaultPanels();
};

const filterObjectByKey = (data: Record<string, any>, search: string): Record<string, any> => {
  return filterObjectBySearch(data, search) as Record<string, any>;
};

const setNestedValue = (dest: Record<string, any>, key: string, value: any): void => {
  if (!dest || !key) {
    return;
  }
  const parts = key.split('.').map((part) => part.trim()).filter(Boolean);
  if (parts.length === 0) {
    return;
  }
  let current = dest;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const part = parts[i];
    if (!current[part] || typeof current[part] !== 'object') {
      current[part] = {};
    }
    current = current[part];
  }
  current[parts[parts.length - 1]] = value;
};

const parseNumber = (value: string | undefined, fallback: number): number => {
  if (!value) {
    return fallback;
  }
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    return fallback;
  }
  return parsed;
};

const clonePanelActionPayload = (payload: Record<string, unknown>): Record<string, unknown> => {
  try {
    return JSON.parse(JSON.stringify(payload)) as Record<string, unknown>;
  } catch {
    return { ...payload };
  }
};

export class DebugPanel {
  private container: HTMLElement;
  private debugPath: string;
  private panelOrderPreferencesPath: string;
  private availablePanels: string[];
  private savedPanelOrder: string[] | null = null;
  private panels: string[];
  private activePanel: string;
  private state: DebugState;
  private filters: PanelFilters;
  private customFilterState: Record<string, unknown> = {};
  private paused = false;
  private sqlView!: SqlLiveView;
  private logsView!: LiveListView<LogEntry>;
  private requestsView!: LiveListView<RequestEntry>;
  private jserrorsView!: LiveListView<JSErrorEntry>;
  private registryLiveList!: RegistryLiveListManager;
  private logsExpanded: Set<string> = new Set();
  private jserrorsExpanded: Set<string> = new Set();
  private pauseButton: HTMLButtonElement | null = null;
  private maxLogEntries: number;
  private maxSQLQueries: number;
  private slowThresholdMs: number;
  private eventCount = 0;
  private lastEventAt: Date | null = null;
  private stream: DebugStream;
  private streamBasePath: string;
  private sessions: DebugUserSession[] = [];
  private sessionsLoading = false;
  private sessionsLoaded = false;
  private sessionsError: string | null = null;
  private sessionsUpdatedAt: Date | null = null;
  private activeSessionId: string | null = null;
  private activeSession: DebugUserSession | null = null;
  private replPanels: Map<string, DebugReplPanel>;
  private replCommands: DebugReplCommand[];
  private panelRenderers: Map<string, PanelRenderer>;
  private tabsEl: HTMLElement;
  private panelEl: HTMLElement;
  private filtersEl: HTMLElement;
  private statusEl: HTMLElement;
  private connectionEl: HTMLElement;
  private eventCountEl: HTMLElement;
  private lastEventEl: HTMLElement;
  private sessionBannerEl: HTMLElement | null = null;
  private sessionMetaEl: HTMLElement | null = null;
  private sessionDetachEl: HTMLButtonElement | null = null;
  private eventToPanel: Record<string, string>;
  private unsubscribeRegistry: (() => void) | null = null;
  private expandedRequests: Set<string> = new Set();
  private tabsSortable: Sortable | null = null;
  private panelActionResults: Map<string, PanelActionResultView> = new Map();
  private commandLauncherLastPayloads: Map<string, Record<string, unknown>> = new Map();

  constructor(container: HTMLElement) {
    this.container = container;
    const panelsData = parseJSON(container.dataset.panels);
    const serverPanels = normalizePanelList(panelsData);
    if (!serverPanels.includes('sessions')) {
      serverPanels.push('sessions');
    }
    this.availablePanels = this.normalizeAvailablePanelIDs(serverPanels);
    this.savedPanelOrder = this.loadStoredPanelOrder();
    this.panels = this.mergePanelOrder(this.availablePanels, this.savedPanelOrder);
    this.activePanel = this.panels[0] || 'template';

    this.debugPath = container.dataset.debugPath || '';
    this.panelOrderPreferencesPath = container.dataset.panelOrderPreferencesPath || '';
    this.streamBasePath = this.debugPath;
    this.maxLogEntries = parseNumber(container.dataset.maxLogEntries, 500);
    this.maxSQLQueries = parseNumber(container.dataset.maxSqlQueries, 200);
    this.slowThresholdMs = parseNumber(container.dataset.slowThresholdMs, 50);
    this.replCommands = normalizeReplCommands(parseJSON(container.dataset.replCommands));

    this.state = {
      template: {},
      session: {},
      requests: [],
      sql: [],
      logs: [],
      config: {},
      routes: [],
      custom: { data: {}, logs: [] },
      extra: {},
    };

    this.filters = {
      requests: { method: 'all', status: 'all', search: '', newestFirst: true, hasBody: false, contentType: 'all' },
      sql: { search: '', slowOnly: false, errorOnly: false, newestFirst: true },
      logs: { level: 'all', search: '', autoScroll: true, newestFirst: true },
      routes: { method: 'all', search: '' },
      sessions: { search: '' },
      custom: { search: '' },
      objects: { search: '' },
    };

    this.replPanels = new Map();
    this.panelRenderers = new Map();
    replPanelIDs.forEach((panel) => {
      this.panelRenderers.set(panel, {
        render: () => this.renderReplPanel(panel),
        filters: () => '<span class="timestamp">REPL controls are in the panel header.</span>',
      });
    });

    // Build event-to-panel mapping from registry
    this.eventToPanel = buildEventToPanel();

    this.tabsEl = this.requireElement('[data-debug-tabs]', document);
    this.panelEl = this.requireElement('[data-debug-panel]', document);
    this.filtersEl = this.requireElement('[data-debug-filters]', document);
    this.statusEl = document.querySelector('[data-debug-status]') || this.container;
    this.connectionEl = this.requireElement('[data-debug-connection]', document);
    this.eventCountEl = this.requireElement('[data-debug-events]', document);
    this.lastEventEl = this.requireElement('[data-debug-last]', document);
    this.sessionBannerEl = document.querySelector('[data-debug-session-banner]');
    this.sessionMetaEl = document.querySelector('[data-debug-session-meta]');
    this.sessionDetachEl = document.querySelector('[data-debug-session-detach]');
    if (this.sessionDetachEl) {
      this.sessionDetachEl.addEventListener('click', () => this.detachSession());
    }

    this.sqlView = new SqlLiveView({
      styles: consoleStyles,
      copyOptions: { useIconFeedback: true },
      getQueries: () => this.state.sql,
      getRenderOptions: () => ({
        newestFirst: this.filters.sql.newestFirst,
        slowThresholdMs: this.slowThresholdMs,
        maxEntries: this.maxSQLQueries,
        useIconCopyButton: true,
      }),
      getMaxEntries: () => this.maxSQLQueries,
      shouldDisplay: (entry) => this.sqlEntryMatchesFilters(entry),
      onNeedFullRender: () => this.renderPanel(),
      onPendingChange: (count) => this.updatePauseIndicator(count),
    });

    this.logsView = new LiveListView<LogEntry>({
      styles: consoleStyles,
      keyOf: logRowKey,
      renderRow: (entry) => renderLogRow(entry, consoleStyles, {
        showSource: true,
        truncateMessage: false,
        expandable: true,
      }),
      getRenderOptions: () => ({ newestFirst: this.filters.logs.newestFirst }),
      getMaxEntries: () => this.maxLogEntries,
      shouldDisplay: (entry) => this.logEntryMatchesFilters(entry),
      onNeedFullRender: () => this.renderPanel(),
      onAdopt: (root) =>
        attachRowExpansion(root, {
          tableSelector: '[data-live-list]',
          rowSelector: 'tr.expandable-row',
          keyAttr: 'data-row-key',
          expanded: this.logsExpanded,
        }),
      onRestore: (root) =>
        restoreRowExpansion(root, {
          rowSelector: 'tr.expandable-row',
          keyAttr: 'data-row-key',
          expanded: this.logsExpanded,
        }),
      onEvict: (keys) => keys.forEach((key) => this.logsExpanded.delete(key)),
      onAfterAppend: () => {
        this.attachCopyButtonListeners();
        this.applyLogsAutoScroll();
      },
    });

    this.requestsView = new LiveListView<RequestEntry>({
      styles: consoleStyles,
      containerSelector: '[data-request-table] tbody',
      rowSelector: 'tr[data-request-id]',
      keyAttr: 'data-request-id',
      keyOf: requestRowKey,
      renderRow: (entry) =>
        renderRequestRow(entry, consoleStyles, {
          expandedRequestIds: this.expandedRequests,
          truncatePath: false,
          slowThresholdMs: this.slowThresholdMs,
        }),
      getRenderOptions: () => ({ newestFirst: this.filters.requests.newestFirst }),
      getMaxEntries: () => this.maxLogEntries,
      shouldDisplay: (entry) => this.requestEntryMatchesFilters(entry),
      onNeedFullRender: () => this.renderPanel(),
      onAdopt: (root) =>
        attachRequestDetailListeners(root, this.expandedRequests, { useIconFeedback: true }),
    });

    this.jserrorsView = new LiveListView<JSErrorEntry>({
      styles: consoleStyles,
      keyOf: jsErrorRowKey,
      renderRow: (entry) => renderErrorRow(entry, consoleStyles, { compact: false }),
      getRenderOptions: () => ({ newestFirst: this.filters.logs.newestFirst }),
      getMaxEntries: () => this.maxLogEntries,
      onNeedFullRender: () => this.renderPanel(),
      onAdopt: (root) =>
        attachRowExpansion(root, {
          tableSelector: '[data-live-list]',
          rowSelector: 'tr.expandable-row',
          keyAttr: 'data-row-key',
          expanded: this.jserrorsExpanded,
        }),
      onRestore: (root) =>
        restoreRowExpansion(root, {
          rowSelector: 'tr.expandable-row',
          keyAttr: 'data-row-key',
          expanded: this.jserrorsExpanded,
        }),
    });

    this.registryLiveList = new RegistryLiveListManager({
      styles: consoleStyles,
      // Sort direction is owned by each panel's `liveList.newestFirst` (the single
      // source shared with its renderer), so the manager doesn't take a host sort.
      getRenderOptions: () => ({}),
      shouldDisplay: (def, item) => {
        if (!def.applyFilters) return true;
        const state = this.getPanelFilterState(def.id, def);
        const result = def.applyFilters([item], state);
        return Array.isArray(result) ? result.length > 0 : true;
      },
      onNeedFullRender: () => this.renderPanel(),
    });

    this.bindActions();
    this.updateSessionBanner();

    this.stream = new DebugStream({
      basePath: this.streamBasePath,
      onEvent: (event) => this.handleEvent(event),
      onStatusChange: (status) => this.updateConnectionStatus(status),
    });

    // Subscribe to registry changes for dynamic panel updates
    this.unsubscribeRegistry = panelRegistry.subscribe((event) => this.handleRegistryChange(event));

    void this.initializeServerDefinitions();
  }

  private async initializeServerDefinitions(): Promise<void> {
    const loadedServerPanelOrder = await this.loadServerPanelOrderPreference();
    this.applyPanelOrder();
    await hydrateServerPanelDefinitions(this.debugPath);
    this.eventToPanel = buildEventToPanel();
    this.applyPanelOrder();
    if (loadedServerPanelOrder) {
      this.persistPanelOrder();
    }
    this.restoreActivePanel();
    this.renderTabs();
    this.renderActivePanel();
    this.fetchSnapshot();
    this.stream.connect();
    this.subscribeToEvents();
  }

  /**
   * Subscribe to WebSocket events for all panels based on registry
   */
  private subscribeToEvents(): void {
    const eventTypes = new Set<string>();
    for (const panel of this.panels) {
      for (const eventType of getPanelEventTypes(panel)) {
        eventTypes.add(eventType);
      }
    }
    this.stream.subscribe(Array.from(eventTypes));
  }

  private normalizeStoredPanelID(value: string | null): string | null {
    const panel = typeof value === 'string' ? value.trim() : '';
    if (!panel) {
      return null;
    }
    return this.panels.includes(panel) ? panel : null;
  }

  private restoreActivePanel(): void {
    let restored: string | null = null;
    try {
      restored = this.normalizeStoredPanelID(sessionStorage.getItem(DEBUG_CONSOLE_ACTIVE_PANEL_KEY));
    } catch {
      restored = null;
    }
    this.activePanel = restored || this.normalizeStoredPanelID(this.activePanel) || this.panels[0] || 'template';
  }

  private persistActivePanel(): void {
    try {
      sessionStorage.setItem(DEBUG_CONSOLE_ACTIVE_PANEL_KEY, this.activePanel);
    } catch {
      // Ignore blocked or unavailable browser storage.
    }
  }

  /**
   * Persist panel order to localStorage
   */
  private persistPanelOrder(): void {
    try {
      localStorage.setItem(DEBUG_CONSOLE_PANEL_ORDER_KEY, JSON.stringify(this.panels));
    } catch {
      // Ignore blocked or unavailable browser storage.
    }
  }

  private async loadServerPanelOrderPreference(): Promise<boolean> {
    const endpoint = this.panelOrderPreferencesPath.trim();
    if (!endpoint) {
      return false;
    }
    try {
      const response = await httpRequest(endpoint, {
        method: 'GET',
        credentials: 'same-origin',
      });
      if (!response.ok) {
        return false;
      }
      const payload = await readExpectedHTTPJSON<PanelOrderPreferenceResponse>(response);
      if (!payload?.available || !payload.found) {
        return false;
      }
      this.savedPanelOrder = this.normalizeAvailablePanelIDs(payload.panel_order);
      return this.savedPanelOrder.length > 0;
    } catch {
      // Server preferences are optional; localStorage remains the fallback.
      return false;
    }
  }

  private async saveServerPanelOrderPreference(order: string[]): Promise<void> {
    const endpoint = this.panelOrderPreferencesPath.trim();
    if (!endpoint) {
      return;
    }
    try {
      await httpRequest(endpoint, {
        method: 'PUT',
        credentials: 'same-origin',
        json: { panel_order: order },
      });
    } catch {
      // Keep the visible and local order even when server persistence fails.
    }
  }

  /**
   * Read panel order from localStorage without filtering unknown IDs yet. Server
   * definitions can arrive later, so saved dynamic panels must remain available.
   */
  private loadStoredPanelOrder(): string[] | null {
    try {
      const stored = localStorage.getItem(DEBUG_CONSOLE_PANEL_ORDER_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return this.normalizeSavedPanelOrder(parsed);
      }
    } catch {
      // Ignore parse errors or blocked storage.
    }

    return null;
  }

  private normalizePanelID(value: unknown): string | null {
    const panel = typeof value === 'string' ? value.trim() : '';
    if (!panel || !DEBUG_PANEL_ID_PATTERN.test(panel)) {
      return null;
    }
    return panel;
  }

  private normalizeAvailablePanelIDs(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }
    const result: string[] = [];
    const seen = new Set<string>();
    for (const item of value) {
      const panel = this.normalizePanelID(item);
      if (!panel || seen.has(panel)) {
        continue;
      }
      seen.add(panel);
      result.push(panel);
    }
    return result;
  }

  private normalizeSavedPanelOrder(value: unknown): string[] | null {
    const order = this.normalizeAvailablePanelIDs(value);
    return order.length > 0 ? order : null;
  }

  private mergePanelOrder(availablePanels: string[], savedOrder: string[] | null): string[] {
    const available = this.normalizeAvailablePanelIDs(availablePanels);
    if (!savedOrder || savedOrder.length === 0) {
      return available;
    }
    const remaining = new Set(available);
    const result: string[] = [];
    for (const panel of savedOrder) {
      if (remaining.has(panel)) {
        result.push(panel);
        remaining.delete(panel);
      }
    }
    for (const panel of available) {
      if (remaining.has(panel)) {
        result.push(panel);
      }
    }
    return result;
  }

  private applyPanelOrder(): void {
    const nextPanels = this.mergePanelOrder(this.availablePanels, this.savedPanelOrder);
    this.panels = nextPanels.length > 0 ? nextPanels : this.availablePanels;
    this.restoreActivePanel();
  }

  /**
   * Initialize drag/drop reordering for tabs using SortableJS
   */
  private initTabDragDrop(): void {
    if (this.tabsSortable) {
      this.tabsSortable.destroy();
      this.tabsSortable = null;
    }

    this.tabsSortable = Sortable.create(this.tabsEl, {
      animation: 150,
      draggable: '.debug-tab',
      fallbackTolerance: 5,
      delayOnTouchOnly: true,
      delay: 120,
      touchStartThreshold: 8,
      scroll: true,
      bubbleScroll: true,
      ghostClass: 'debug-tab--ghost',
      chosenClass: 'debug-tab--chosen',
      dragClass: 'debug-tab--drag',
      direction: 'horizontal',
      onEnd: () => {
        // Collect new order from DOM
        const domOrder = Array.from(this.tabsEl.querySelectorAll<HTMLElement>('[data-panel]'))
          .map((el) => el.dataset.panel || '')
          .filter(Boolean);
        const newOrder = this.mergePanelOrder(this.availablePanels, domOrder);

        if (newOrder.length > 0) {
          this.savedPanelOrder = newOrder;
          this.panels = newOrder;
          this.persistPanelOrder();
          void this.saveServerPanelOrderPreference(newOrder);
        }
      },
    });
  }

  /**
   * Handle registry changes (panel registered/unregistered)
   */
  private handleRegistryChange(event: RegistryChangeEvent): void {
    const panelID = this.normalizePanelID(event.panelId);
    const previousActivePanel = this.activePanel;
    const wasActivePanelUnregistered = event.type === 'unregister' && panelID === previousActivePanel;

    // Rebuild event-to-panel mapping
    this.eventToPanel = buildEventToPanel();

    // If a new panel was registered and it's in our panel list, update UI
    if (event.type === 'register') {
      if (panelID && !this.availablePanels.includes(panelID)) {
        this.availablePanels.push(panelID);
      }
      if (panelID && event.panel && event.panel.defaultFilters !== undefined && !(panelID in this.customFilterState)) {
        this.customFilterState[panelID] = this.cloneFilterState(event.panel.defaultFilters);
      }
    } else if (event.type === 'unregister' && panelID) {
      this.availablePanels = this.availablePanels.filter((panel) => panel !== panelID);
      delete this.customFilterState[panelID];
    }
    this.applyPanelOrder();
    const activePanelChanged = previousActivePanel !== this.activePanel;

    // Update subscriptions
    this.subscribeToEvents();

    // Rebuild tabs and re-render if needed
    this.renderTabs();
    if (wasActivePanelUnregistered || activePanelChanged || panelID === this.activePanel) {
      this.renderActivePanel();
    }
  }

  private requireElement(selector: string, parent: ParentNode = this.container): HTMLElement {
    const el = parent.querySelector(selector);
    if (!el) {
      throw new Error(`Missing debug element: ${selector}`);
    }
    return el as HTMLElement;
  }

  private bindActions(): void {
    this.tabsEl.addEventListener('click', (event) => {
      const target = event.target as HTMLElement | null;
      if (!target) {
        return;
      }
      const button = target.closest<HTMLButtonElement>('[data-panel]');
      if (!button) {
        return;
      }
      const panel = button.dataset.panel || '';
      if (!panel || panel === this.activePanel) {
        return;
      }
      this.activePanel = panel;
      this.persistActivePanel();
      this.renderActivePanel();
    });

    this.container.addEventListener('click', (event) => {
      const target = event.target as HTMLElement | null;
      const button = target?.closest<HTMLButtonElement>('[data-debug-action]');
      if (!button || !this.container.contains(button)) {
        return;
      }
      const action = button.dataset.debugAction || '';
      switch (action) {
        case 'snapshot':
          this.stream.requestSnapshot();
          break;
        case 'clear':
          this.clearAll();
          break;
        case 'pause':
          this.togglePause(button);
          break;
        case 'clear-panel':
          this.clearActivePanel();
          break;
        default:
          break;
      }
    });

    this.panelEl.addEventListener('click', (event) => {
      const target = event.target as HTMLElement | null;
      if (!target) {
        return;
      }
      const navigationButton = target.closest<HTMLButtonElement>('[data-doctor-action-navigate]');
      if (navigationButton && !navigationButton.disabled) {
        this.navigateFromDoctorAction(navigationButton);
        return;
      }
      const button = target.closest<HTMLButtonElement>('[data-doctor-action-run]');
      if (!button || button.disabled) {
        return;
      }
      const checkID = button.dataset.doctorActionRun || '';
      const confirmText = button.dataset.doctorActionConfirm || '';
      const requiresConfirmation = button.dataset.doctorActionRequiresConfirmation === 'true';
      this.runDoctorAction(checkID, confirmText, requiresConfirmation);
    });
  }

  private renderTabs(): void {
    const tabs = this.panels
      .map((panel) => {
        const active = panel === this.activePanel ? 'debug-tab--active' : '';
        const icon = renderDebugIconRef(getPanelIcon(panel), {
          size: '14px',
          extraClass: 'debug-tab__icon',
        });
        return `
          <button class="debug-tab ${active}" data-panel="${escapeHTML(panel)}">
            ${icon}
            <span class="debug-tab__label">${escapeHTML(getPanelLabel(panel))}</span>
            <span class="debug-tab__count" data-panel-count="${escapeHTML(panel)}">0</span>
          </button>
        `;
      })
      .join('');
    this.tabsEl.innerHTML = tabs;
    this.updateTabCounts();
    // Reinitialize drag/drop after DOM rebuild
    this.initTabDragDrop();
  }

  private renderActivePanel(): void {
    this.renderTabs();
    this.renderFilters();
    this.renderPanel();
  }

  private renderFilters(): void {
    const panel = this.activePanel;
    let content = '';
    const renderer = this.panelRenderers.get(panel);
    if (renderer?.filters) {
      content = renderer.filters();
    } else {
      const def = panelRegistry.get(panel);
      if (def?.showFilters === false) {
        this.filtersEl.innerHTML = '<span class="timestamp">No filters</span>';
        return;
      }
      if (def?.renderFilters) {
        const state = this.getPanelFilterState(panel, def);
        const custom = def.renderFilters(state);
        this.filtersEl.innerHTML = custom || '<span class="timestamp">No filters</span>';
        if (custom) {
          this.bindFilterInputs();
        }
        return;
      }
    }
    if (!renderer?.filters && panel === 'requests') {
      const values = this.filters.requests;
      const contentTypes = this.getUniqueContentTypes();
      content = `
        <div class="debug-filter">
          <label>Method</label>
          <select data-filter="method">
            ${this.renderSelectOptions(['all', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE'], values.method)}
          </select>
        </div>
        <div class="debug-filter">
          <label>Status</label>
          <select data-filter="status">
            ${this.renderSelectOptions(['all', '200', '201', '204', '400', '401', '403', '404', '500'], values.status)}
          </select>
        </div>
        <div class="debug-filter">
          <label>Content-Type</label>
          <select data-filter="contentType">
            ${this.renderSelectOptions(['all', ...contentTypes], values.contentType)}
          </select>
        </div>
        <div class="debug-filter debug-filter--grow">
          <label>Search</label>
          <input type="search" data-filter="search" value="${escapeHTML(values.search)}" placeholder="/admin/users" />
        </div>
        <label class="debug-btn">
          <input type="checkbox" data-filter="hasBody" ${values.hasBody ? 'checked' : ''} />
          <span>Has Body</span>
        </label>
        <label class="debug-btn">
          <input type="checkbox" data-filter="newestFirst" ${values.newestFirst ? 'checked' : ''} />
          <span>Newest first</span>
        </label>
      `;
    } else if (!renderer?.filters && panel === 'sql') {
      const values = this.filters.sql;
      content = `
        <div class="debug-filter debug-filter--grow">
          <label>Search</label>
          <input type="search" data-filter="search" value="${escapeHTML(values.search)}" placeholder="SELECT" />
        </div>
        <label class="debug-btn">
          <input type="checkbox" data-filter="slowOnly" ${values.slowOnly ? 'checked' : ''} />
          <span>Slow only</span>
        </label>
        <label class="debug-btn">
          <input type="checkbox" data-filter="errorOnly" ${values.errorOnly ? 'checked' : ''} />
          <span>Errors</span>
        </label>
        <label class="debug-btn">
          <input type="checkbox" data-filter="newestFirst" ${values.newestFirst ? 'checked' : ''} />
          <span>Newest first</span>
        </label>
      `;
    } else if (!renderer?.filters && panel === 'logs') {
      const values = this.filters.logs;
      content = `
        <div class="debug-filter">
          <label>Level</label>
          <select data-filter="level">
            ${this.renderSelectOptions(['all', 'debug', 'info', 'warn', 'error'], values.level)}
          </select>
        </div>
        <div class="debug-filter debug-filter--grow">
          <label>Search</label>
          <input type="search" data-filter="search" value="${escapeHTML(values.search)}" placeholder="database" />
        </div>
        <label class="debug-btn">
          <input type="checkbox" data-filter="newestFirst" ${values.newestFirst ? 'checked' : ''} />
          <span>Newest first</span>
        </label>
        <label class="debug-btn">
          <input type="checkbox" data-filter="autoScroll" ${values.autoScroll ? 'checked' : ''} />
          <span>Auto-scroll</span>
        </label>
      `;
    } else if (!renderer?.filters && panel === 'routes') {
      const values = this.filters.routes;
      content = `
        <div class="debug-filter">
          <label>Method</label>
          <select data-filter="method">
            ${this.renderSelectOptions(['all', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE'], values.method)}
          </select>
        </div>
        <div class="debug-filter debug-filter--grow">
          <label>Search</label>
          <input type="search" data-filter="search" value="${escapeHTML(values.search)}" placeholder="/admin" />
        </div>
      `;
    } else if (!renderer?.filters && panel === 'sessions') {
      const values = this.filters.sessions;
      content = `
        <div class="debug-filter debug-filter--grow">
          <label>Search</label>
          <input type="search" data-filter="search" value="${escapeHTML(values.search)}" placeholder="user, session id, path" />
        </div>
      `;
    } else if (!renderer?.filters) {
      const values = this.filters.objects;
      content = `
        <div class="debug-filter debug-filter--grow">
          <label>Search (JSONPath supported)</label>
          <input type="search" data-filter="search" value="${escapeHTML(values.search)}" placeholder="user.roles[0].name" />
        </div>
      `;
    }

    this.filtersEl.innerHTML = content || '<span class="timestamp">No filters</span>';
    this.bindFilterInputs();
  }

  private bindFilterInputs(): void {
    const inputs = this.filtersEl.querySelectorAll<HTMLInputElement | HTMLSelectElement>('input, select');
    inputs.forEach((input) => {
      input.addEventListener('input', () => this.updateFiltersFromInputs());
      input.addEventListener('change', () => this.updateFiltersFromInputs());
    });
  }

  private updateFiltersFromInputs(): void {
    const panel = this.activePanel;
    const inputs = this.filtersEl.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-filter]');
    const def = panelRegistry.get(panel);
    if (def?.renderFilters) {
      const current = this.getPanelFilterState(panel, def);
      const next =
        current && typeof current === 'object' && !Array.isArray(current)
          ? { ...(current as Record<string, unknown>) }
          : {};
      inputs.forEach((input) => {
        const key = input.dataset.filter || '';
        if (!key) {
          return;
        }
        const currentValue = (next as Record<string, unknown>)[key];
        (next as Record<string, unknown>)[key] = this.readFilterInputValue(input, currentValue);
      });
      this.customFilterState[panel] = next;
      this.renderPanel();
      return;
    }
    if (panel === 'requests') {
      const next = { ...this.filters.requests };
      inputs.forEach((input) => {
        const key = input.dataset.filter || '';
        if (key === 'newestFirst' || key === 'hasBody') {
          next[key] = (input as HTMLInputElement).checked;
        } else if (key && key in next) {
          next[key as 'method' | 'status' | 'search' | 'contentType'] = (input as HTMLInputElement).value;
        }
      });
      this.filters.requests = next;
    } else if (panel === 'sql') {
      const next = { ...this.filters.sql };
      inputs.forEach((input) => {
        const key = input.dataset.filter || '';
        if (key === 'slowOnly' || key === 'errorOnly' || key === 'newestFirst') {
          next[key] = (input as HTMLInputElement).checked;
        } else if (key === 'search') {
          next[key] = (input as HTMLInputElement).value;
        }
      });
      this.filters.sql = next;
    } else if (panel === 'logs') {
      const next = { ...this.filters.logs };
      inputs.forEach((input) => {
        const key = input.dataset.filter || '';
        if (key === 'autoScroll' || key === 'newestFirst') {
          next[key] = (input as HTMLInputElement).checked;
        } else if (key === 'level' || key === 'search') {
          next[key] = (input as HTMLInputElement).value;
        }
      });
      this.filters.logs = next;
    } else if (panel === 'routes') {
      const next = { ...this.filters.routes };
      inputs.forEach((input) => {
        const key = input.dataset.filter || '';
        if (key && key in next) {
          next[key as keyof typeof next] = (input as HTMLInputElement).value;
        }
      });
      this.filters.routes = next;
    } else if (panel === 'sessions') {
      const next = { ...this.filters.sessions };
      inputs.forEach((input) => {
        const key = input.dataset.filter || '';
        if (key && key in next) {
          next[key as keyof typeof next] = (input as HTMLInputElement).value;
        }
      });
      this.filters.sessions = next;
    } else {
      const next = { ...this.filters.objects };
      inputs.forEach((input) => {
        const key = input.dataset.filter || '';
        if (key && key in next) {
          next[key as keyof typeof next] = (input as HTMLInputElement).value;
        }
      });
      this.filters.objects = next;
    }
    this.renderPanel();
  }

  private getPanelFilterState(panel: string, def?: PanelDefinition): unknown {
    const definition = def || panelRegistry.get(panel);
    if (!definition) {
      return {};
    }
    if (!(panel in this.customFilterState)) {
      this.customFilterState[panel] =
        definition.defaultFilters !== undefined ? this.cloneFilterState(definition.defaultFilters) : {};
    }
    return this.customFilterState[panel];
  }

  private cloneFilterState(value: unknown): unknown {
    if (Array.isArray(value)) {
      return [...value];
    }
    if (value && typeof value === 'object') {
      return { ...(value as Record<string, unknown>) };
    }
    return value;
  }

  private readFilterInputValue(
    input: HTMLInputElement | HTMLSelectElement,
    currentValue: unknown
  ): unknown {
    if (input instanceof HTMLInputElement && input.type === 'checkbox') {
      return input.checked;
    }
    const raw = input.value;
    if (typeof currentValue === 'number') {
      const parsed = Number(raw);
      return Number.isNaN(parsed) ? currentValue : parsed;
    }
    if (typeof currentValue === 'boolean') {
      return raw === 'true' || raw === '1' || raw.toLowerCase() === 'yes';
    }
    return raw;
  }

  private renderPanel(): void {
    const panel = this.activePanel;
    // The command launcher fills the content area (app-shell layout); flag it so
    // the host scroll container becomes a flex column. Toggled before any early
    // return so it is cleared when switching to any other panel.
    this.panelEl.classList.toggle('debug-content--launcher', panel === 'commands');
    const renderer = this.panelRenderers.get(panel);
    if (renderer) {
      renderer.render();
      return;
    }
    this.panelEl.classList.remove('debug-content--repl');

    let content = '';
    if (panel === 'template') {
      content = this.renderJSONPanel('Template Context', this.state.template, this.filters.objects.search);
    } else if (panel === 'session') {
      content = this.renderJSONPanel('Session', this.state.session, this.filters.objects.search);
    } else if (panel === 'config') {
      content = this.renderJSONPanel('Config', this.state.config, this.filters.objects.search);
    } else if (panel === 'requests') {
      content = this.renderRequests();
    } else if (panel === 'sql') {
      content = this.renderSQL();
    } else if (panel === 'logs') {
      content = this.renderLogs();
    } else if (panel === 'routes') {
      content = this.renderRoutes();
    } else if (panel === 'sessions') {
      content = this.renderSessionsPanel();
    } else if (panel === 'custom') {
      content = this.renderCustom();
    } else if (panel === 'jserrors') {
      content = renderJSErrorsPanel(this.state.extra['jserrors'] || [], consoleStyles, {
        newestFirst: this.filters.logs.newestFirst,
        showSortToggle: true,
      });
    } else {
      // Check panel registry for custom renderer
      const def = panelRegistry.get(panel);
      if (def && (def.renderConsole || def.render)) {
        const snapshotKey = getSnapshotKey(def);
        let data = this.getStateForKey(snapshotKey);
        if (def.applyFilters) {
          const state = this.getPanelFilterState(panel, def);
          data = def.applyFilters(data, state);
        } else if (!def.renderFilters && def.showFilters !== false) {
          const search = this.filters.objects.search.trim();
          if (search && data && typeof data === 'object' && !Array.isArray(data)) {
            data = filterObjectByKey(data as Record<string, any>, search);
          }
        }
        const renderFn = def.renderConsole || def.render;
        content = renderFn(data, consoleStyles, {
          newestFirst: this.filters.logs.newestFirst,
        });
      } else {
        content = this.renderJSONPanel(getPanelLabel(panel), this.state.extra[panel], this.filters.objects.search);
      }
    }

	detachCommandLauncherControllers();
    this.panelEl.innerHTML = content;
    if (panel === 'logs') {
      this.applyLogsAutoScroll();
    }
    this.attachExpandableRowListeners();
    this.attachCopyButtonListeners();
    if (panel === 'requests') {
      // LiveListView appends/evicts incrementally and wires request-detail
      // expansion (delegated, persisted via expandedRequests) on adopt.
      this.requestsView.adopt(this.panelEl);
    }
    if (panel === 'sql') {
      this.mountSQLView();
    }
    if (panel === 'logs') {
      this.logsView.adopt(this.panelEl);
    }
    if (panel === 'jserrors') {
      this.jserrorsView.adopt(this.panelEl);
    }
    const liveDef = panelRegistry.get(panel);
    if (liveDef && this.registryLiveList.handles(liveDef)) {
      this.registryLiveList.adopt(liveDef, this.panelEl);
    }
    if (panel === 'sessions') {
      this.attachSessionActions();
    }
    this.attachPanelActionListeners();
    if (panel === 'commands') {
      attachCommandLauncherListeners(this.panelEl, { debugPath: this.debugPath });
    }
    this.renderStoredPanelActionResult(panel);
  }

  private attachPanelActionListeners(): void {
    this.panelEl.querySelectorAll<HTMLSelectElement>('[data-panel-action-picker]').forEach((picker) => {
      const update = () => this.updatePanelActionPicker(picker);
      picker.addEventListener('change', update);
      update();
    });
    this.panelEl.querySelectorAll<HTMLButtonElement>('[data-panel-action]').forEach((button) => {
      button.addEventListener('click', () => {
        if (button.disabled) {
          return;
        }
        this.runPanelAction(button, button);
      });
    });
    this.panelEl.querySelectorAll<HTMLFormElement>('[data-panel-action-form]').forEach((form) => {
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        const button = form.querySelector<HTMLButtonElement>('button[type="submit"]') || undefined;
        if (button?.disabled) {
          return;
        }
        this.runPanelAction(form, button);
      });
    });
  }

  private async runPanelAction(element: HTMLElement, button?: HTMLButtonElement, payloadOverride?: Record<string, unknown>): Promise<void> {
    const panelID = element.dataset.panelId || '';
    const actionID = element.dataset.actionId || '';
    if (!this.debugPath || !panelID || !actionID) {
      return;
    }
    const confirmText = element.dataset.actionConfirm || '';
    const requiresConfirm = element.dataset.actionRequiresConfirm === 'true';
    // Forms that own their confirmation UX (e.g. the command launcher's inline
    // Confirm/Cancel step) opt out of the blocking browser dialog.
    const inlineConfirm = element.dataset.actionConfirmInline === 'true';
    if (!inlineConfirm && (requiresConfirm || confirmText) && !window.confirm(confirmText || 'Run this debug panel action?')) {
      return;
    }
    const payload = payloadOverride || buildPanelActionPayload(element);
    let persistedPayload = payload;
    if (panelID === 'commands' && element instanceof HTMLFormElement) {
      persistedPayload = buildPanelActionPayload(element, { excludeSensitive: true });
      if (panelActionHasSensitiveFields(element)) {
        // Retrying would either retain a secret or silently dispatch without it.
        // Require the operator to re-enter sensitive values in the live form.
        this.commandLauncherLastPayloads.delete(actionID);
      } else {
        this.commandLauncherLastPayloads.set(actionID, clonePanelActionPayload(payload));
      }
    }
    if (button) {
      button.disabled = true;
    }
    const startedAt = Date.now();
    try {
      const response = await httpRequest(`${this.debugPath}/api/panels/${encodeURIComponent(panelID)}/actions/${encodeURIComponent(actionID)}`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        // Keep the full parsed error body (rich error envelope) so the result
        // card can surface source/category/metadata/stack trace — not just the
        // one-line message.
        const errorResult = await readHTTPErrorResult(response, `Action failed (${response.status})`, { appendStatusToFallback: false });
        this.showPanelActionResult(panelID, 'error', errorResult.message, actionID, errorResult.payload, undefined, { at: Date.now(), durationMs: Date.now() - startedAt });
        return;
      }
      const result = await readExpectedHTTPJSON<{ ok?: boolean; message?: string; data?: unknown; errors?: Record<string, unknown>; refresh?: boolean; event?: DebugEvent }>(response);
      this.showPanelActionResult(
        panelID,
        result.ok === false ? 'error' : 'ok',
        result.message || (result.ok === false ? 'Action failed' : 'Action complete'),
        actionID,
        result.data,
        result.errors,
        { at: Date.now(), durationMs: Date.now() - startedAt }
      );
      if (panelID === 'commands') {
        recordCommandLauncherInvocation(persistedPayload);
      }
      if (result.event) {
        this.handleEvent(result.event);
      }
      if (result.refresh) {
        await this.fetchSnapshot();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Action failed';
      this.showPanelActionResult(panelID, 'error', message, actionID, undefined, undefined, { at: Date.now(), durationMs: Date.now() - startedAt });
    } finally {
      if (button) {
        button.disabled = false;
      }
    }
  }

  private showPanelActionResult(panelID: string, status: 'ok' | 'error', message: string, actionID?: string, data?: unknown, errors?: Record<string, unknown>, meta?: { at?: number; durationMs?: number }): void {
    this.panelActionResults.set(panelID, { status, message, actionID, data, errors, at: meta?.at, durationMs: meta?.durationMs });
    this.renderStoredPanelActionResult(panelID);
    if (panelID === 'commands') {
      // Reveal a freshly produced result: the launcher's result now lives in the
      // (full-height, scrollable) detail column, so scroll it into view on a
      // dispatch. This runs only here — not on snapshot-driven re-renders.
      const target = Array.from(this.panelEl.querySelectorAll<HTMLElement>('[data-panel-action-result]'))
        .find((element) => element.dataset.panelActionResult === 'commands');
      if (target && typeof target.scrollIntoView === 'function') {
        target.scrollIntoView({ block: 'nearest' });
      }
    }
  }

  private renderStoredPanelActionResult(panelID: string): void {
    const result = this.panelActionResults.get(panelID);
    if (!result) {
      return;
    }
    this.clearPanelActionErrors();
    const target = Array.from(this.panelEl.querySelectorAll<HTMLElement>('[data-panel-action-result]'))
      .find((element) => element.dataset.panelActionResult === panelID);
    if (!target) {
      return;
    }
    if (panelID === 'commands') {
      const parsed = extractCommandLauncherResult(result.status, result.message, result.data, result.errors);
      const fieldErrors: Record<string, unknown> = {};
      parsed.validationErrors.forEach((entry) => {
        if (entry.path) {
          fieldErrors[entry.path] = entry.message || entry.code;
        }
      });
      if (result.errors && typeof result.errors === 'object') {
        Object.assign(fieldErrors, result.errors);
      }
      // Map validation paths onto the originating fields (side-effect). The card
      // lists the full set, so the leftover return value is intentionally unused.
	  if (!result.actionID || !applyCommandLauncherControllerErrors(result.actionID, fieldErrors)) {
		this.renderPanelActionErrors(fieldErrors, result.actionID);
	  }
      const canRetry = Boolean(result.actionID && this.commandLauncherLastPayloads.has(result.actionID));
      const liveStatus = getCommandLauncherLiveStatus(parsed.correlationId);
      target.innerHTML = renderCommandLauncherResultCard(parsed, { canRetry, at: result.at, durationMs: result.durationMs, liveStatus });
      this.attachCommandLauncherResultActions(target, result.actionID);
      return;
    }
    const formErrors = this.renderPanelActionErrors(result.errors, result.actionID);
    const dataHTML = result.data === undefined
      ? ''
      : `<pre class="${consoleStyles.jsonPanel}" style="margin-top:0.5rem;max-height:18rem;overflow:auto;white-space:pre-wrap">${escapeHTML(formatJSON(result.data, { nullAsEmptyObject: false }))}</pre>`;
    target.innerHTML = `<div class="${result.status === 'error' ? consoleStyles.badgeError : consoleStyles.badge}">${escapeHTML(result.message)}</div>${formErrors}${dataHTML}`;
  }

  private attachCommandLauncherResultActions(target: HTMLElement, actionID?: string): void {
    const dismiss = target.querySelector<HTMLButtonElement>('[data-cmdl-dismiss]');
    if (dismiss) {
      dismiss.addEventListener('click', () => {
        this.panelActionResults.delete('commands');
        target.innerHTML = '';
      });
    }
    const retry = target.querySelector<HTMLButtonElement>('[data-cmdl-retry]');
    if (!retry || !actionID) {
      return;
    }
    retry.addEventListener('click', () => {
      this.retryCommandLauncherAction(actionID, retry);
    });
  }

  private retryCommandLauncherAction(actionID: string, button: HTMLButtonElement): void {
    const payload = this.commandLauncherLastPayloads.get(actionID);
    if (!payload) {
      return;
    }
    const form = Array.from(this.panelEl.querySelectorAll<HTMLFormElement>('[data-panel-action-form]'))
      .find((candidate) => candidate.dataset.panelId === 'commands' && candidate.dataset.actionId === actionID);
    if (!form) {
      return;
    }
	loadCommandLauncherControllerValues(actionID, payload);
    void this.runPanelAction(form, button, clonePanelActionPayload(payload));
  }

  private updatePanelActionPicker(picker: HTMLSelectElement): void {
    const launcher = picker.closest<HTMLElement>('[data-panel-action-launcher]');
    if (!launcher) {
      return;
    }
    const selected = picker.value || '';
    launcher.querySelectorAll<HTMLElement>('[data-panel-action-choice]').forEach((choice) => {
      choice.hidden = choice.dataset.panelActionChoice !== selected;
    });
  }

  private navigateFromDoctorAction(button: HTMLButtonElement): void {
    const panelID = this.normalizePanelID(button.dataset.doctorActionNavigate || '');
    if (!panelID || !this.panels.includes(panelID)) {
      return;
    }
    let state: Record<string, unknown> = {};
    try {
      const decoded = decodeURIComponent(button.dataset.doctorActionState || '');
      const parsed = decoded ? JSON.parse(decoded) : {};
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        state = parsed as Record<string, unknown>;
      }
    } catch {
      state = {};
    }
    this.activePanel = panelID;
    this.persistActivePanel();
    this.renderActivePanel();
    this.applyDoctorNavigationState(panelID, state);
  }

  private applyDoctorNavigationState(panelID: string, state: Record<string, unknown>): void {
    applyPanelActionNavigation(this.panelEl, panelID, state);
  }

  private clearPanelActionErrors(): void {
    this.panelEl.querySelectorAll<HTMLElement>('[data-action-field-error]').forEach((element) => {
      element.textContent = '';
      element.hidden = true;
    });
  }

  private renderPanelActionErrors(errors?: Record<string, unknown>, actionID?: string): string {
    if (!errors || typeof errors !== 'object') {
      return '';
    }
    const remaining: string[] = [];
    Object.entries(errors).forEach(([path, value]) => {
      const message = this.stringifyActionError(value);
      if (!message) {
        return;
      }
      const normalizedPath = path.trim();
      const field = Array.from(this.panelEl.querySelectorAll<HTMLElement>('[data-action-field-error]')).find((element) => {
        if (actionID && element.dataset.actionId !== actionID) {
          return false;
        }
        return element.dataset.actionFieldError === normalizedPath ||
          element.dataset.actionFieldName === normalizedPath ||
          element.dataset.actionFieldError === `payload.${normalizedPath}`;
      });
      if (field) {
        field.textContent = message;
        field.hidden = false;
        return;
      }
      remaining.push(message);
    });
    if (remaining.length === 0) {
      return '';
    }
    return `<ul class="${consoleStyles.badgeError}" style="margin-top:0.5rem">${remaining.map((message) => `<li>${escapeHTML(message)}</li>`).join('')}</ul>`;
  }

  private stringifyActionError(value: unknown): string {
    if (typeof value === 'string') {
      return value.trim();
    }
    if (Array.isArray(value)) {
      return value.map((item) => this.stringifyActionError(item)).filter(Boolean).join('; ');
    }
    if (value && typeof value === 'object' && typeof (value as { message?: unknown }).message === 'string') {
      return ((value as { message: string }).message || '').trim();
    }
    return value == null ? '' : String(value);
  }

  private attachExpandableRowListeners(): void {
    // Use shared helper for expandable row behavior
    attachExpandableRowListeners(this.panelEl);
  }

  private attachCopyButtonListeners(): void {
    // Use shared helper for copy-to-clipboard behavior (console style with icon feedback)
    attachCopyListeners(this.panelEl, { useIconFeedback: true });
  }

  private mountSQLView(): void {
    // SqlLiveView wires delegated selection/expansion + incremental updates and
    // restores state (selection, expanded rows) keyed by stable id.
    this.sqlView.adopt(this.panelEl);
  }

  private renderReplPanel(panel: string): void {
    this.panelEl.classList.add('debug-content--repl');
    let replPanel = this.replPanels.get(panel);
    if (!replPanel) {
      replPanel = new DebugReplPanel({
        kind: panel === 'shell' ? 'shell' : 'console',
        debugPath: this.debugPath,
        commands: panel === 'console' ? this.replCommands : [],
      });
      this.replPanels.set(panel, replPanel);
    }
    replPanel.attach(this.panelEl);
  }

  private getUniqueContentTypes(): string[] {
    const types = new Set<string>();
    for (const entry of this.state.requests) {
      const ct = entry.content_type;
      if (ct) {
        types.add(ct.split(';')[0].trim());
      }
    }
    return [...types].sort();
  }

  /** Whether a request entry passes the active console filters. */
  private requestEntryMatchesFilters(entry: RequestEntry): boolean {
    const { method, status, search, hasBody, contentType } = this.filters.requests;
    if (method !== 'all' && (entry.method || '').toUpperCase() !== method) {
      return false;
    }
    if (status !== 'all' && String(entry.status || '') !== status) {
      return false;
    }
    if (search && !(entry.path || '').toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    if (hasBody && !entry.request_body) {
      return false;
    }
    if (contentType !== 'all') {
      const entryCt = (entry.content_type || '').split(';')[0].trim();
      if (entryCt !== contentType) {
        return false;
      }
    }
    return true;
  }

  private renderRequests(): string {
    const { newestFirst } = this.filters.requests;

    // Apply console-specific filters
    const filtered = this.state.requests.filter((entry) => this.requestEntryMatchesFilters(entry));

    if (filtered.length === 0) {
      return this.renderEmptyState('No requests captured yet.');
    }

    // Use shared renderer with console-specific options
    return renderRequestsPanel(filtered, consoleStyles, {
      newestFirst,
      slowThresholdMs: this.slowThresholdMs,
      showSortToggle: false, // Console has filter bar, not inline toggle
      truncatePath: false, // Console shows full paths
      expandedRequestIds: this.expandedRequests,
    });
  }

  /** Whether a SQL entry passes the active console filters (search/slow/error). */
  private sqlEntryMatchesFilters(entry: SQLEntry): boolean {
    const { search, slowOnly, errorOnly } = this.filters.sql;
    if (errorOnly && !entry.error) {
      return false;
    }
    if (slowOnly && !this.isSlowQuery(entry)) {
      return false;
    }
    if (search && !(entry.query || '').toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    return true;
  }

  private renderSQL(): string {
    const { newestFirst } = this.filters.sql;

    // Apply console-specific filters
    const filtered = this.state.sql.filter((entry) => this.sqlEntryMatchesFilters(entry));

    if (filtered.length === 0) {
      return this.renderEmptyState('No SQL queries captured yet.');
    }

    // Use shared renderer with console-specific options
    return renderSQLPanel(filtered, consoleStyles, {
      newestFirst,
      slowThresholdMs: this.slowThresholdMs,
      maxEntries: this.maxSQLQueries,
      showSortToggle: false, // Console has filter bar
      useIconCopyButton: true, // Console uses iconoir icons
    });
  }

  /** Whether a log entry passes the active console filters (level/search). */
  private logEntryMatchesFilters(entry: LogEntry): boolean {
    const { level, search } = this.filters.logs;
    if (level !== 'all' && (entry.level || '').toLowerCase() !== level) {
      return false;
    }
    if (search) {
      const haystack = logSearchText(entry);
      if (!haystack.includes(search.toLowerCase())) {
        return false;
      }
    }
    return true;
  }

  /** Keep the newest log visible when auto-scroll is enabled (no-op otherwise). */
  private applyLogsAutoScroll(): void {
    if (!this.filters.logs.autoScroll) return;
    // newestFirst => newest at top (scroll to top); otherwise newest at bottom.
    this.panelEl.scrollTop = this.filters.logs.newestFirst ? 0 : this.panelEl.scrollHeight;
  }

  private renderLogs(): string {
    const { newestFirst } = this.filters.logs;

    // Apply console-specific filters
    const filtered = this.state.logs.filter((entry) => this.logEntryMatchesFilters(entry));

    if (filtered.length === 0) {
      return this.renderEmptyState('No logs captured yet.');
    }

    // Use shared renderer with console-specific options
    return renderLogsPanel(filtered, consoleStyles, {
      newestFirst,
      maxEntries: this.maxLogEntries,
      showSortToggle: false, // Console has filter bar
      showSource: true, // Console shows source column
      truncateMessage: false, // Console shows full messages
      expandable: true,
    });
  }

  private renderRoutes(): string {
    const { method, search } = this.filters.routes;
    const needle = search.toLowerCase();

    // Apply console-specific filters
    const filtered = this.state.routes.filter((entry) => {
      if (method !== 'all' && (entry.method || '').toUpperCase() !== method) {
        return false;
      }
      const haystack = `${entry.path || ''} ${entry.handler || ''} ${entry.summary || ''}`.toLowerCase();
      if (needle && !haystack.includes(needle)) {
        return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      return this.renderEmptyState('No routes captured yet.');
    }

    // Use shared renderer with console-specific options
    return renderRoutesPanel(filtered, consoleStyles, {
      showName: true, // Console shows name column
    });
  }

  private renderSessionsPanel(): string {
    if (!this.sessionsLoaded && !this.sessionsLoading) {
      void this.fetchSessions();
    }

    if (this.sessionsError) {
      return this.renderEmptyState(this.sessionsError);
    }

    const trackingFlag =
      this.state.config && typeof this.state.config === 'object' && 'session_tracking' in this.state.config
        ? Boolean((this.state.config as Record<string, unknown>).session_tracking)
        : undefined;

    const search = this.filters.sessions.search.trim().toLowerCase();
    let sessions = [...this.sessions];
    if (search) {
      sessions = sessions.filter((session) => {
        const haystack = [
          session.username,
          session.user_id,
          session.session_id,
          session.ip,
          session.current_page,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(search);
      });
    }

    sessions.sort((a, b) => {
      const aTime = new Date(a.last_activity || a.started_at || 0).getTime();
      const bTime = new Date(b.last_activity || b.started_at || 0).getTime();
      return bTime - aTime;
    });

    if (this.sessionsLoading && sessions.length === 0) {
      return this.renderEmptyState('Loading sessions...');
    }

    if (sessions.length === 0) {
      if (trackingFlag === false) {
        return this.renderEmptyState('Session tracking is disabled. Enable it to list active sessions.');
      }
      return this.renderEmptyState('No active sessions yet.');
    }

    const rows = sessions
      .map((session) => {
        const sessionId = session.session_id || '';
        const userLabel = session.username || session.user_id || 'Unknown';
        const lastActivity = formatTimestamp(session.last_activity || session.started_at);
        const requestCount = formatNumber(session.request_count ?? 0);
        const isActive = !!sessionId && sessionId === this.activeSessionId;
        const action = isActive ? 'detach' : 'attach';
        const actionLabel = isActive ? 'Detach' : 'Attach';
        const actionClass = isActive ? 'debug-btn debug-btn--danger' : 'debug-btn debug-btn--primary';
        const rowClass = isActive ? 'debug-session-row debug-session-row--active' : 'debug-session-row';
        const currentPage = session.current_page || '-';
        const ip = session.ip || '-';

        return `
          <tr class="${rowClass}">
            <td>
              <div class="debug-session-user">${escapeHTML(userLabel)}</div>
              <div class="debug-session-meta">
                <span class="debug-session-id">${escapeHTML(sessionId || '-')}</span>
              </div>
            </td>
            <td>${escapeHTML(ip)}</td>
            <td>
              <span class="debug-session-path">${escapeHTML(currentPage)}</span>
            </td>
            <td>${escapeHTML(lastActivity || '-')}</td>
            <td>${escapeHTML(requestCount)}</td>
            <td>
              <button class="${actionClass}" data-session-action="${action}" data-session-id="${escapeHTML(sessionId)}">
                ${actionLabel}
              </button>
            </td>
          </tr>
        `;
      })
      .join('');

    const refreshLabel = this.sessionsLoading ? 'Refreshing...' : 'Refresh';
    const countLabel = `${formatNumber(sessions.length)} active`;
    return `
      <div class="debug-session-toolbar">
        <span class="debug-session-toolbar__label">${countLabel}</span>
        <div class="debug-session-toolbar__actions">
          <button class="debug-btn" data-session-action="refresh">
            <i class="iconoir-refresh"></i> ${refreshLabel}
          </button>
        </div>
      </div>
      <table class="debug-table debug-session-table">
        <thead>
          <tr>
            <th>User</th>
            <th>IP</th>
            <th>Current Page</th>
            <th>Last Activity</th>
            <th>Requests</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;
  }

  private renderCustom(): string {
    const { search } = this.filters.custom;

    // Check if there's any data at all
    const hasData = Object.keys(this.state.custom.data).length > 0;
    const hasLogs = this.state.custom.logs.length > 0;

    if (!hasData && !hasLogs) {
      return this.renderEmptyState('No custom data captured yet.');
    }

    // Use shared renderer with console-specific options
    return renderCustomPanel(this.state.custom, consoleStyles, {
      maxLogEntries: this.maxLogEntries,
      useIconCopyButton: true, // Console uses iconoir icons
      showCount: true,
      dataFilterFn: search ? (data) => filterObjectByKey(data, search) : undefined,
    });
  }

  private renderJSONPanel(title: string, data: any, search: string): string {
    // Check for empty data
    const isObject = data && typeof data === 'object' && !Array.isArray(data);
    const isArray = Array.isArray(data);
    const isEmpty =
      (isObject && Object.keys(data || {}).length === 0) ||
      (isArray && (data || []).length === 0) ||
      (!isObject && !isArray && !data);

    if (isEmpty) {
      return this.renderEmptyState(`No ${title.toLowerCase()} data available.`);
    }

    // Use shared renderer with console-specific options and search filter
    return renderSharedJSONPanel(title, data, consoleStyles, {
      useIconCopyButton: true, // Console uses iconoir icons
      showCount: true,
      filterFn: search ? (obj) => filterObjectByKey(obj, search) : undefined,
    });
  }

  private attachSessionActions(): void {
    const buttons = this.panelEl.querySelectorAll<HTMLButtonElement>('[data-session-action]');
    buttons.forEach((button) => {
      button.addEventListener('click', () => {
        const action = button.dataset.sessionAction || '';
        const sessionId = button.dataset.sessionId || '';
        switch (action) {
          case 'refresh':
            void this.fetchSessions(true);
            break;
          case 'attach':
            this.attachSessionByID(sessionId);
            break;
          case 'detach':
            this.detachSession();
            break;
          default:
            break;
        }
      });
    });
  }

  private async fetchSessions(force = false): Promise<void> {
    if (!this.debugPath) {
      return;
    }
    if (this.sessionsLoading) {
      return;
    }
    if (!force && this.sessionsLoaded && this.sessionsUpdatedAt) {
      const ageMs = Date.now() - this.sessionsUpdatedAt.getTime();
      if (ageMs < 3000) {
        return;
      }
    }

    this.sessionsLoading = true;
    this.sessionsError = null;
    try {
      const response = await httpRequest(`${this.debugPath}/api/sessions`, {
        credentials: 'same-origin',
      });
      if (!response.ok) {
        this.sessionsError = 'Failed to load active sessions.';
        return;
      }
      const payload = await readExpectedHTTPJSON<{ sessions?: DebugUserSession[] }>(response);
      this.sessions = Array.isArray(payload.sessions) ? payload.sessions : [];
      this.sessionsLoaded = true;
      this.sessionsUpdatedAt = new Date();
      if (this.activeSessionId) {
        const updated = this.sessions.find((session) => session.session_id === this.activeSessionId);
        if (updated) {
          this.activeSession = updated;
          this.updateSessionBanner();
        }
      }
    } catch {
      this.sessionsError = 'Failed to load active sessions.';
    } finally {
      this.sessionsLoading = false;
      this.updateTabCounts();
      if (this.activePanel === 'sessions') {
        this.renderPanel();
      }
    }
  }

  private attachSessionByID(sessionID: string): void {
    const trimmed = sessionID.trim();
    if (!trimmed) {
      return;
    }
    if (this.activeSessionId === trimmed) {
      return;
    }
    const session = this.sessions.find((entry) => entry.session_id === trimmed) || { session_id: trimmed };
    this.attachSession(session);
  }

  private attachSession(session: DebugUserSession): void {
    const sessionID = (session.session_id || '').trim();
    if (!sessionID) {
      return;
    }
    if (this.activeSessionId === sessionID) {
      return;
    }
    this.activeSessionId = sessionID;
    this.activeSession = session;
    this.streamBasePath = this.buildSessionStreamPath(sessionID);
    this.resetDebugState();
    this.updateSessionBanner();
    this.rebuildStream('session');
    this.renderPanel();
  }

  private detachSession(): void {
    if (!this.activeSessionId) {
      return;
    }
    this.activeSessionId = null;
    this.activeSession = null;
    this.streamBasePath = this.debugPath;
    this.resetDebugState();
    this.updateSessionBanner();
    this.rebuildStream('global');
    this.renderPanel();
  }

  private rebuildStream(mode: 'global' | 'session'): void {
    this.stream.close();
    this.stream = new DebugStream({
      basePath: this.streamBasePath,
      onEvent: (event) => this.handleEvent(event),
      onStatusChange: (status) => this.updateConnectionStatus(status),
    });
    this.stream.connect();
    this.subscribeToEvents();
    if (mode === 'session') {
      this.stream.requestSnapshot();
    } else {
      this.fetchSnapshot();
    }
  }

  private resetDebugState(): void {
    this.state = {
      template: {},
      session: {},
      requests: [],
      sql: [],
      logs: [],
      config: {},
      routes: [],
      custom: { data: {}, logs: [] },
      extra: {},
    };
    this.expandedRequests.clear();
    this.logsExpanded.clear();
    this.jserrorsExpanded.clear();
    this.eventCount = 0;
    this.lastEventAt = null;
    this.updateStatusMeta();
    this.updateTabCounts();
  }

  private buildSessionStreamPath(sessionID: string): string {
    const base = this.debugPath.replace(/\/+$/, '');
    const id = encodeURIComponent(sessionID);
    if (!base) {
      return '';
    }
    return `${base}/session/${id}`;
  }

  private updateSessionBanner(): void {
    if (!this.sessionBannerEl) {
      return;
    }
    if (!this.activeSessionId) {
      this.sessionBannerEl.setAttribute('hidden', 'true');
      return;
    }
    this.sessionBannerEl.removeAttribute('hidden');
    if (this.sessionMetaEl) {
      this.sessionMetaEl.textContent = this.sessionMetaText();
    }
  }

  private sessionMetaText(): string {
    const session: DebugUserSession =
      this.activeSession ||
      this.sessions.find((entry) => entry.session_id === this.activeSessionId) ||
      { session_id: this.activeSessionId || undefined };
    const parts = [
      session.username || session.user_id,
      session.session_id,
      session.ip,
      session.current_page,
    ].filter(Boolean);
    return parts.join(' | ');
  }

  private panelCount(panel: string): number {
    if (panel !== 'sessions') {
      const def = panelRegistry.get(panel);
      if (def) {
        const snapshotKey = getSnapshotKey(def);
        const snapshot = { [snapshotKey]: this.getStateForKey(snapshotKey) } as DebugSnapshot;
        return getPanelCount(snapshot, def);
      }
    }

    switch (panel) {
      case 'template':
        return countPayload(this.state.template);
      case 'session':
        return countPayload(this.state.session);
      case 'requests':
        return this.state.requests.length;
      case 'sql':
        return this.state.sql.length;
      case 'logs':
        return this.state.logs.length;
      case 'config':
        return countPayload(this.state.config);
      case 'routes':
        return this.state.routes.length;
      case 'sessions':
        return this.sessions.length;
      case 'custom':
        return countPayload(this.state.custom.data) + this.state.custom.logs.length;
      default:
        return countPayload(this.state.extra[panel]);
    }
  }

  private renderEmptyState(message: string): string {
    return `
      <div class="debug-empty">
        <p>${escapeHTML(message)}</p>
      </div>
    `;
  }

  private renderSelectOptions(options: string[], current: string): string {
    return options
      .map((option) => {
        const selected = option.toLowerCase() === current.toLowerCase() ? 'selected' : '';
        return `<option value="${escapeHTML(option)}" ${selected}>${escapeHTML(option)}</option>`;
      })
      .join('');
  }

  private updateTabCounts(): void {
    this.panels.forEach((panel) => {
      const count = this.panelCount(panel);
      const badge = this.tabsEl.querySelector<HTMLElement>(`[data-panel-count="${panel}"]`);
      if (badge) {
        badge.textContent = formatNumber(count);
      }
    });
  }

  private updateConnectionStatus(status: DebugStreamStatus): void {
    this.connectionEl.textContent = status;
    this.statusEl.setAttribute('data-status', status);
  }

  private updateStatusMeta(): void {
    this.eventCountEl.textContent = `${formatNumber(this.eventCount)} events`;
    if (this.lastEventAt) {
      this.lastEventEl.textContent = this.lastEventAt.toLocaleTimeString();
    }
  }

  private handleEvent(event: DebugEvent): void {
    if (!event || !event.type) {
      return;
    }
    if (event.type === 'snapshot') {
      this.applySnapshot(event.payload as DebugSnapshot);
      return;
    }

    this.eventCount += 1;
    this.lastEventAt = new Date();
    this.updateStatusMeta();

    if (this.paused) {
      // While paused, SQL queries are buffered by SqlLiveView, which surfaces a
      // pending count and flushes on resume, so the operator can see how much new
      // data arrived without losing their place. Other panels stay frozen.
      const pausedPanel = this.eventToPanel[event.type] || event.type;
      if (pausedPanel === 'sql' && this.activePanel === 'sql') {
        this.sqlView.enqueue([event.payload as SQLEntry]);
      }
      return;
    }

    // Live command status (Phase 3 T11): update the launcher result card in place
    // rather than re-rendering the whole panel, so an in-progress form is intact.
    if (event.type === 'command_status') {
      applyCommandLauncherStatusEvent(event.payload);
      if (this.activePanel === 'commands') {
        this.renderStoredPanelActionResult('commands');
      }
      return;
    }

    // Find panel for this event type
    const panel = this.eventToPanel[event.type] || event.type;

    // Check if we have a registry definition for this panel
    const def = panelRegistry.get(panel);
    if (def) {
      // Use registry's handleEvent or default
      const snapshotKey = getSnapshotKey(def);
      const currentData = this.getStateForKey(snapshotKey);
      const handler = def.handleEvent || ((current, payload) => defaultHandleEvent(current, payload, this.maxLogEntries));
      const newData = handler(currentData, event.payload);
      this.setStateForKey(snapshotKey, newData);
    } else {
      // Legacy handling for built-in panels (backward compatibility)
      switch (event.type) {
        case 'request':
          this.state.requests.push(event.payload as RequestEntry);
          this.trim(this.state.requests, this.maxLogEntries);
          break;
        case 'sql':
          this.state.sql.push(event.payload as SQLEntry);
          this.trim(this.state.sql, this.maxSQLQueries);
          break;
        case 'log':
          this.state.logs.push(event.payload as LogEntry);
          this.trim(this.state.logs, this.maxLogEntries);
          break;
        case 'template':
          this.state.template = (event.payload as Record<string, any>) || {};
          break;
        case 'session':
          this.state.session = (event.payload as Record<string, any>) || {};
          break;
        case 'custom':
          this.handleCustomEvent(event.payload);
          break;
        default:
          // Store unknown events in extra
          if (!isKnownPanel(panel)) {
            this.state.extra[panel] = event.payload;
          }
          break;
      }
    }

    this.updateTabCounts();
    if (panel === this.activePanel) {
      if (panel === 'sql') {
        // Incremental: append only the new row (state already updated above).
        // Falls back to a full render via onNeedFullRender if not yet mounted.
        this.sqlView.enqueue([event.payload as SQLEntry]);
      } else if (panel === 'logs') {
        this.logsView.enqueue([event.payload as LogEntry]);
      } else if (panel === 'requests') {
        this.requestsView.enqueue([event.payload as RequestEntry]);
      } else if (panel === 'jserrors') {
        this.jserrorsView.enqueue([event.payload as JSErrorEntry]);
      } else if (this.registryLiveList.handles(def)) {
        // Opt-in registry (incl. server schema) panels: append the newest state
        // item incrementally instead of rebuilding the whole panel.
        const data = this.getStateForKey(getSnapshotKey(def!));
        const item = Array.isArray(data) ? data[data.length - 1] : undefined;
        this.registryLiveList.enqueue(def!, item);
      } else {
        this.renderPanel();
      }
    }
  }

  private handleCustomEvent(payload: any): void {
    if (!payload) {
      return;
    }
    if (typeof payload === 'object' && 'key' in payload && 'value' in payload) {
      setNestedValue(this.state.custom.data, String(payload.key), payload.value);
      return;
    }
    if (typeof payload === 'object' && ('category' in payload || 'message' in payload)) {
      this.state.custom.logs.push(payload as CustomLogEntry);
      this.trim(this.state.custom.logs, this.maxLogEntries);
      return;
    }
  }

  /**
   * Get state data for a snapshot key (used by registry-based event handling)
   */
  private getStateForKey(key: string): unknown {
    switch (key) {
      case 'template': return this.state.template;
      case 'session': return this.state.session;
      case 'requests': return this.state.requests;
      case 'sql': return this.state.sql;
      case 'logs': return this.state.logs;
      case 'config': return this.state.config;
      case 'routes': return this.state.routes;
      case 'custom': return this.state.custom;
      default: return this.state.extra[key];
    }
  }

  /**
   * Set state data for a snapshot key (used by registry-based event handling)
   */
  private setStateForKey(key: string, data: unknown): void {
    switch (key) {
      case 'template':
        this.state.template = (data as Record<string, any>) || {};
        break;
      case 'session':
        this.state.session = (data as Record<string, any>) || {};
        break;
      case 'requests':
        this.state.requests = (data as RequestEntry[]) || [];
        break;
      case 'sql':
        this.state.sql = (data as SQLEntry[]) || [];
        break;
      case 'logs':
        this.state.logs = (data as LogEntry[]) || [];
        this.reconcileLogExpansion();
        break;
      case 'config':
        this.state.config = (data as Record<string, any>) || {};
        break;
      case 'routes':
        this.state.routes = (data as RouteEntry[]) || [];
        break;
      case 'custom':
        this.state.custom = (data as { data: Record<string, any>; logs: CustomLogEntry[] }) || { data: {}, logs: [] };
        break;
      default:
        this.state.extra[key] = data;
        break;
    }
  }

  private applySnapshot(snapshot: DebugSnapshot): void {
    const next = snapshot || {};
    this.state.template = next.template || {};
    this.state.session = next.session || {};
    this.state.requests = ensureArray<RequestEntry>(next.requests);
    this.state.sql = ensureArray<SQLEntry>(next.sql);
    this.state.logs = ensureArray<LogEntry>(next.logs);
    this.reconcileLogExpansion();
    this.state.config = next.config || {};
    this.state.routes = ensureArray<RouteEntry>(next.routes);
    const custom = next.custom || {};
    this.state.custom = {
      data: custom.data || {},
      logs: ensureArray<CustomLogEntry>(custom.logs),
    };
    // Extract registry and unknown panels into extra.
    // Built-in state keys are already assigned above; everything else
    // (including registry panels like jserrors) goes into extra.
    const builtinStateKeys = new Set([
      'template', 'session', 'requests', 'sql', 'logs',
      'config', 'routes', 'custom',
    ]);
    const extra: Record<string, any> = {};
    this.panels.forEach((panel) => {
      if (!builtinStateKeys.has(panel) && panel in next) {
        extra[panel] = (next as any)[panel];
      }
    });
    this.state.extra = extra;

    this.updateTabCounts();
    this.renderPanel();
  }

  private trim<T>(list: T[], max: number): void {
    if (!Array.isArray(list) || max <= 0) {
      return;
    }
    while (list.length > max) {
      list.shift();
    }
  }

  private reconcileLogExpansion(): void {
    const currentKeys = new Set(this.state.logs.map(logRowKey));
    this.logsExpanded.forEach((key) => {
      if (!currentKeys.has(key)) this.logsExpanded.delete(key);
    });
  }

  private isSlowQuery(entry: SQLEntry): boolean {
    return isSlowDuration(entry?.duration, this.slowThresholdMs);
  }

  private async fetchSnapshot(): Promise<void> {
    if (!this.debugPath) {
      return;
    }
    if (this.activeSessionId) {
      return;
    }
    try {
      const response = await httpRequest(`${this.debugPath}/api/snapshot`, {
        credentials: 'same-origin',
      });
      if (!response.ok) {
        return;
      }
      const payload = await readExpectedHTTPJSON<DebugSnapshot>(response);
      this.applySnapshot(payload);
    } catch {
      // ignore fetch errors
    }
  }

  private clearAll(): void {
    if (!this.debugPath) {
      return;
    }
    this.logsExpanded.clear();
    this.stream.clear();
    if (this.activeSessionId) {
      return;
    }
    httpRequest(`${this.debugPath}/api/clear`, { method: 'POST', credentials: 'same-origin' }).catch(() => {
      // ignore
    });
  }

  private clearActivePanel(): void {
    if (!this.debugPath) {
      return;
    }
    const panel = this.activePanel;
    if (panel === 'logs') this.logsExpanded.clear();
    this.stream.clear([panel]);
    if (this.activeSessionId) {
      return;
    }
    httpRequest(`${this.debugPath}/api/clear/${panel}`, { method: 'POST', credentials: 'same-origin' }).catch(() => {
      // ignore
    });
  }

  private async parseJSONResponse(response: Response): Promise<Record<string, any> | null> {
    const payload = await readExpectedHTTPJSON<unknown>(response);
    if (payload && typeof payload === 'object') {
      return payload as Record<string, any>;
    }
    return null;
  }

  private readResponsePath(payload: Record<string, any> | null, path: string): unknown {
    if (!payload || !path) {
      return undefined;
    }
    const segments = path.split('.').map((part) => part.trim()).filter(Boolean);
    if (segments.length === 0) {
      return undefined;
    }
    let current: unknown = payload;
    for (const segment of segments) {
      if (!current || typeof current !== 'object') {
        return undefined;
      }
      current = (current as Record<string, unknown>)[segment];
    }
    return current;
  }

  private responseMessage(payload: Record<string, any> | null, candidates: string[]): string {
    for (const candidate of candidates) {
      const value = this.readResponsePath(payload, candidate);
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }
    return '';
  }

  private showDoctorActionToast(message: string, kind: 'success' | 'error'): void {
    const text = message.trim();
    if (!text) {
      return;
    }

    if (window.getComputedStyle(this.container).position === 'static') {
      this.container.style.position = 'relative';
    }

    let host = this.container.querySelector<HTMLElement>('[data-debug-toast-host]');
    if (!host) {
      host = document.createElement('div');
      host.dataset.debugToastHost = 'true';
      host.style.position = 'absolute';
      host.style.right = '12px';
      host.style.bottom = '12px';
      host.style.display = 'flex';
      host.style.flexDirection = 'column';
      host.style.gap = '8px';
      host.style.pointerEvents = 'none';
      host.style.zIndex = '1000';
      this.container.appendChild(host);
    }

    const palette =
      kind === 'success'
        ? { bg: 'rgba(34, 197, 94, 0.15)', border: 'rgba(34, 197, 94, 0.45)', color: '#bbf7d0' }
        : { bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.45)', color: '#fecaca' };

    const toast = document.createElement('div');
    toast.style.maxWidth = '380px';
    toast.style.padding = '10px 12px';
    toast.style.borderRadius = '8px';
    toast.style.border = `1px solid ${palette.border}`;
    toast.style.background = palette.bg;
    toast.style.color = palette.color;
    toast.style.fontSize = '12px';
    toast.style.lineHeight = '1.4';
    toast.style.boxShadow = '0 6px 24px rgba(0, 0, 0, 0.25)';
    toast.style.pointerEvents = 'auto';
    toast.textContent = text;
    host.appendChild(toast);

    window.setTimeout(() => {
      toast.remove();
      if (host && host.childElementCount === 0) {
        host.remove();
      }
    }, 4200);
  }

  private async runDoctorAction(
    checkID: string,
    confirmText = '',
    requiresConfirmation = false
  ): Promise<void> {
    if (!this.debugPath || this.activeSessionId) {
      return;
    }
    const normalized = checkID.trim();
    if (!normalized) {
      return;
    }

    const confirmMessage = confirmText.trim();
    const mustConfirm = requiresConfirmation || Boolean(confirmMessage);
    if (mustConfirm) {
      const prompt = confirmMessage || 'Are you sure you want to run this doctor action?';
      if (!window.confirm(prompt)) {
        return;
      }
    }

    try {
      const response = await httpRequest(`${this.debugPath}/api/doctor/${encodeURIComponent(normalized)}/action`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
        },
        body: '{}',
      });
      const payload = await this.parseJSONResponse(response);

      if (!response.ok) {
        const errorMessage =
          this.responseMessage(payload, ['error.message', 'message', 'result.message']) ||
          `Doctor action failed (${response.status})`;
        this.showDoctorActionToast(errorMessage, 'error');
        return;
      }

      const successMessage =
        this.responseMessage(payload, ['message', 'result.message']) || 'Doctor action completed.';
      this.showDoctorActionToast(successMessage, 'success');
    } catch {
      this.showDoctorActionToast('Doctor action failed: unable to reach debug API.', 'error');
    } finally {
      this.stream.requestSnapshot();
    }
  }

  private togglePause(button: HTMLButtonElement): void {
    this.paused = !this.paused;
    this.pauseButton = button;
    this.sqlView.setPaused(this.paused);
    if (this.paused) {
      button.textContent = 'Resume';
      return;
    }
    // Resume: discard the buffered rows and rebuild authoritatively from a fresh
    // snapshot. SqlLiveView keeps selection/expansion (keyed by stable id) across
    // the re-render, so the operator's state survives the resume.
    this.sqlView.discardPending();
    button.textContent = 'Pause';
    this.stream.requestSnapshot();
  }

  /** Reflect the count of SQL queries buffered while paused on the pause button. */
  private updatePauseIndicator(count: number): void {
    if (!this.paused || !this.pauseButton) return;
    this.pauseButton.textContent = count > 0 ? `Resume (${count})` : 'Resume';
  }
}

export const initDebugPanel = (container?: HTMLElement | null): DebugPanel | null => {
  const target = container || document.querySelector<HTMLElement>('[data-debug-console]');
  if (!target) {
    return null;
  }
  return new DebugPanel(target);
};
