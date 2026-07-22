// Debug Toolbar Web Component
// A self-contained toolbar that displays debug information at the bottom of the page
// Works in conjunction with DebugFab for collapsed state

import { DebugStream, type DebugEvent, type DebugStreamStatus } from '../debug-stream.js';
import { DebugReplPanel, type DebugReplCommand } from '../repl/repl-panel.js';
import { toolbarStyles } from './toolbar-styles.js';
import { renderPanel, getCounts, type DebugSnapshot, type PanelOptions } from './panel-renderers.js';
import { escapeHTML, formatJSON } from '../shared/utils.js';
import {
  attachCopyListeners,
  attachExpandableRowListeners,
  attachSortToggleListeners,
  attachRequestDetailListeners,
  attachRowExpansion,
  restoreRowExpansion,
} from '../shared/interactions.js';
import {
  SqlLiveView,
  LiveListView,
  RegistryLiveListManager,
  renderLogRow,
  logRowKey,
  renderRequestRow,
  requestRowKey,
  renderErrorRow,
  jsErrorRowKey,
} from '../shared/panels/index.js';
import { toolbarStyles as toolbarStyleConfig } from '../shared/styles.js';
import type { SQLEntry, LogEntry, RequestEntry, JSErrorEntry } from '../shared/types.js';
import {
  panelRegistry,
  getPanelCount as getRegistryPanelCount,
  getSnapshotKey,
  type RegistryChangeEvent,
} from '../shared/panel-registry.js';
import {
  applyDebugEventToSnapshot,
  buildEventToPanel,
  fetchDebugSnapshot,
  getDefaultToolbarPanels,
  getPanelEventTypes,
  getPanelIcon,
  getPanelLabel,
  normalizeReplCommands,
  replPanelIDs,
} from '../shared/runtime-helpers.js';
import { renderDebugIconRef } from '../shared/icons.js';
import { buildPanelActionPayload } from '../shared/panel-actions.js';
import { hydrateServerPanelDefinitions } from '../shared/server-definitions.js';
import { httpRequest, readExpectedHTTPJSON, readHTTPError } from '../../shared/transport/http-client.js';
// Import to ensure built-in panels are registered
import '../shared/builtin-panels.js';

const DEBUG_TOOLBAR_ACTIVE_PANEL_KEY = 'debug-toolbar-active-panel';

type PanelActionResultView = {
  status: 'ok' | 'error';
  message: string;
  data?: unknown;
};

export class DebugToolbar extends HTMLElement {
  private shadow: ShadowRoot;
  private sqlView!: SqlLiveView;
  private logsView!: LiveListView<LogEntry>;
  private requestsView!: LiveListView<RequestEntry>;
  private jserrorsView!: LiveListView<JSErrorEntry>;
  private registryLiveList!: RegistryLiveListManager;
  private jserrorsExpanded: Set<string> = new Set();
  private stream: DebugStream | null = null;
  private externalStream: DebugStream | null = null;
  private snapshot: DebugSnapshot = {};
  private replPanels: Map<string, DebugReplPanel> = new Map();
  private replCommands: DebugReplCommand[] = [];
  private expanded = false;
  private activePanel = 'requests';
  private connectionStatus: DebugStreamStatus = 'disconnected';
  private slowThresholdMs = 50;
  private useFab = false;
  private customHeight: number | null = null;
  private isResizing = false;
  private resizeStartY = 0;
  private resizeStartHeight = 0;
  // Sort order state per panel (true = newest first, which is default)
  private panelSortOrder: Map<string, boolean> = new Map([
    ['requests', true],
    ['sql', true],
  ]);
  // Event-to-panel mapping (built from registry)
  private eventToPanel: Record<string, string> = {};
  // Registry subscription cleanup
  private unsubscribeRegistry: (() => void) | null = null;
  // Expanded request detail state (preserved across re-renders)
  private expandedRequests: Set<string> = new Set();
  private initializeGeneration = 0;
  private panelActionResults: Map<string, PanelActionResultView> = new Map();

  private static readonly MIN_HEIGHT = 150;
  private static readonly MAX_HEIGHT_RATIO = 0.8;
  private static readonly DEFAULT_HEIGHT = 320;

  static get observedAttributes(): string[] {
    return ['base-path', 'debug-path', 'panels', 'expanded', 'slow-threshold-ms', 'use-fab', 'live-transport'];
  }

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
    this.sqlView = new SqlLiveView({
      styles: toolbarStyleConfig,
      copyOptions: { useIconFeedback: false },
      getQueries: () => this.snapshot.sql || [],
      getRenderOptions: () => ({
        newestFirst: this.panelSortOrder.get('sql') ?? true,
        slowThresholdMs: this.slowThresholdMs,
        maxEntries: 50,
        useIconCopyButton: false,
      }),
      getMaxEntries: () => 50,
      onNeedFullRender: () => this.updateContent(),
    });
    this.logsView = new LiveListView<LogEntry>({
      styles: toolbarStyleConfig,
      keyOf: logRowKey,
      renderRow: (entry) =>
        renderLogRow(entry, toolbarStyleConfig, { showSource: false, truncateMessage: true, maxMessageLength: 100 }),
      getRenderOptions: () => ({ newestFirst: true }),
      getMaxEntries: () => 100,
      onNeedFullRender: () => this.updateContent(),
    });
    this.requestsView = new LiveListView<RequestEntry>({
      styles: toolbarStyleConfig,
      containerSelector: '[data-request-table] tbody',
      rowSelector: 'tr[data-request-id]',
      keyAttr: 'data-request-id',
      keyOf: requestRowKey,
      renderRow: (entry) =>
        renderRequestRow(entry, toolbarStyleConfig, {
          slowThresholdMs: this.slowThresholdMs,
          truncatePath: true,
          maxPathLength: 50,
          expandedRequestIds: this.expandedRequests,
          maxDetailLength: 80,
        }),
      getRenderOptions: () => ({ newestFirst: this.panelSortOrder.get('requests') ?? true }),
      getMaxEntries: () => 50,
      onNeedFullRender: () => this.updateContent(),
      onAdopt: (root) =>
        attachRequestDetailListeners(root, this.expandedRequests, { useIconFeedback: false }),
    });
    this.jserrorsView = new LiveListView<JSErrorEntry>({
      styles: toolbarStyleConfig,
      keyOf: jsErrorRowKey,
      renderRow: (entry) => renderErrorRow(entry, toolbarStyleConfig, { compact: true }),
      getRenderOptions: () => ({ newestFirst: this.panelSortOrder.get('jserrors') ?? true }),
      getMaxEntries: () => 50,
      onNeedFullRender: () => this.updateContent(),
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
      styles: toolbarStyleConfig,
      allowUpsert: false,
      // Sort direction is owned by each panel's `liveList.newestFirst` (the single
      // source shared with its renderer), so the manager doesn't take a host sort.
      getRenderOptions: () => ({}),
      onNeedFullRender: () => this.updateContent(),
    });
  }

  connectedCallback(): void {
    this.initializeGeneration += 1;
    void this.initialize(this.initializeGeneration);
  }

  private async initialize(generation: number): Promise<void> {
    await hydrateServerPanelDefinitions(this.debugPath);
    if (this.isInitializationStale(generation)) {
      return;
    }

    // Build event-to-panel mapping from registry
    this.eventToPanel = buildEventToPanel();

    // Subscribe to registry changes
    this.unsubscribeRegistry = panelRegistry.subscribe((event) => this.handleRegistryChange(event));
    if (this.isInitializationStale(generation)) {
      this.unsubscribeRegistry?.();
      this.unsubscribeRegistry = null;
      return;
    }

    this.loadState();
    this.render();
    // Only init WebSocket if not using FAB (FAB manages its own connection)
    if (!this.useFab) {
      if (this.liveTransportEnabled) {
        this.initWebSocket();
      }
      this.fetchInitialSnapshot(generation);
    }
    this.setupKeyboardShortcut();
  }

  disconnectedCallback(): void {
    this.initializeGeneration += 1;
    this.stream?.close();
    this.stream = null;
    this.unsubscribeRegistry?.();
    this.unsubscribeRegistry = null;
    document.removeEventListener('keydown', this.handleKeyDown);
  }

  private isInitializationStale(generation: number): boolean {
    return generation !== this.initializeGeneration || !this.isConnected;
  }

  /**
   * Handle registry changes (panel registered/unregistered)
   */
  private handleRegistryChange(event: RegistryChangeEvent): void {
    // Rebuild event-to-panel mapping
    this.eventToPanel = buildEventToPanel();

    // Update subscriptions if we have a stream
    this.updateSubscriptions();

    // Re-render to update tabs
    if (this.expanded) {
      this.render();
    }
  }

  /**
   * Update WebSocket subscriptions based on current panels
   */
  private updateSubscriptions(): void {
    const stream = this.getStream();
    if (!stream) return;

    const eventTypes = new Set<string>();
    for (const panel of this.panels) {
      for (const eventType of getPanelEventTypes(panel)) {
        eventTypes.add(eventType);
      }
    }
    stream.subscribe(Array.from(eventTypes));
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (oldValue === newValue) return;

    if (name === 'expanded') {
      this.expanded = newValue === 'true' || newValue === '';
      this.saveState();
      this.render();
    } else if (name === 'slow-threshold-ms') {
      this.slowThresholdMs = parseInt(newValue || '50', 10) || 50;
    } else if (name === 'use-fab') {
      this.useFab = newValue === 'true' || newValue === '';
    } else if (name === 'live-transport' && !this.useFab && !this.liveTransportEnabled) {
      this.stream?.close();
    }
  }

  // Public API for FAB integration
  public setExpanded(expanded: boolean): void {
    this.expanded = expanded;
    this.saveState();
    this.render();
  }

  public setSnapshot(snapshot: DebugSnapshot): void {
    this.applySnapshot(snapshot || {});
  }

  public setConnectionStatus(status: DebugStreamStatus): void {
    this.connectionStatus = status;
    this.updateConnectionStatus();
  }

  public setStream(stream: DebugStream): void {
    this.externalStream = stream;
  }

  public isExpanded(): boolean {
    return this.expanded;
  }

  // State persistence
  private normalizeStoredPanelID(value: string | null): string | null {
    const panel = typeof value === 'string' ? value.trim() : '';
    if (!panel) {
      return null;
    }
    return this.panels.includes(panel) ? panel : null;
  }

  private fallbackActivePanel(): string {
    return this.panels[0] || 'requests';
  }

  private loadState(): void {
    try {
      const stored = localStorage.getItem('debug-toolbar-expanded');
      if (stored !== null) {
        this.expanded = stored === 'true';
      }
      const storedHeight = localStorage.getItem('debug-toolbar-height');
      if (storedHeight !== null) {
        const height = parseInt(storedHeight, 10);
        if (!isNaN(height) && height >= DebugToolbar.MIN_HEIGHT) {
          this.customHeight = height;
        }
      }
      // Load sort order preferences
      const storedSortOrder = localStorage.getItem('debug-toolbar-sort-order');
      if (storedSortOrder) {
        try {
          const parsed = JSON.parse(storedSortOrder) as Record<string, boolean>;
          Object.entries(parsed).forEach(([panel, newestFirst]) => {
            this.panelSortOrder.set(panel, newestFirst);
          });
        } catch {
          // Ignore parse errors
        }
      }
      const storedActivePanel = this.normalizeStoredPanelID(localStorage.getItem(DEBUG_TOOLBAR_ACTIVE_PANEL_KEY));
      this.activePanel = storedActivePanel || this.normalizeStoredPanelID(this.activePanel) || this.fallbackActivePanel();
    } catch {
      // Ignore localStorage errors
      this.activePanel = this.normalizeStoredPanelID(this.activePanel) || this.fallbackActivePanel();
    }
  }

  private saveState(): void {
    try {
      localStorage.setItem('debug-toolbar-expanded', String(this.expanded));
      if (this.customHeight !== null) {
        localStorage.setItem('debug-toolbar-height', String(this.customHeight));
      }
      // Save sort order preferences
      const sortOrderObj: Record<string, boolean> = {};
      this.panelSortOrder.forEach((value, key) => {
        sortOrderObj[key] = value;
      });
      localStorage.setItem('debug-toolbar-sort-order', JSON.stringify(sortOrderObj));
      localStorage.setItem(DEBUG_TOOLBAR_ACTIVE_PANEL_KEY, this.activePanel);
    } catch {
      // Ignore localStorage errors
    }
  }

  // Keyboard shortcut
  private handleKeyDown = (e: KeyboardEvent): void => {
    // Ctrl+Shift+D or Cmd+Shift+D to toggle
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'd') {
      e.preventDefault();
      this.toggleExpanded();
    }
    // Escape to collapse
    if (e.key === 'Escape' && this.expanded) {
      this.collapse();
    }
  };

  private setupKeyboardShortcut(): void {
    document.addEventListener('keydown', this.handleKeyDown);
  }

  private toggleExpanded(): void {
    this.expanded = !this.expanded;
    this.saveState();
    this.render();
    this.dispatchExpandEvent();
  }

  private collapse(): void {
    if (!this.expanded) return;
    this.expanded = false;
    this.saveState();
    this.render();
    this.dispatchExpandEvent();
  }

  private dispatchExpandEvent(): void {
    this.dispatchEvent(new CustomEvent('debug-expand', {
      detail: { expanded: this.expanded },
      bubbles: true,
      composed: true,
    }));
  }

  // Attribute getters
  private get basePath(): string {
    const attr = this.getAttribute('base-path');
    const trimmed = (attr || '').trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('//')) {
      return trimmed.replace(/\/+$/g, '');
    }
    if (trimmed === '/') return '';
    return '/' + trimmed.replace(/^\/+|\/+$/g, '');
  }

  private get debugPath(): string {
    const attr = this.getAttribute('debug-path');
    if (attr) return attr;
    return `${this.basePath}/debug`;
  }

  private get panels(): string[] {
    const attr = this.getAttribute('panels');
    if (attr) {
      const parsed = attr
        .split(',')
        .map((p) => p.trim().toLowerCase())
        .filter(Boolean);
      return parsed.length ? parsed : getDefaultToolbarPanels();
    }
    return getDefaultToolbarPanels();
  }

  private get liveTransportEnabled(): boolean {
    const attr = this.getAttribute('live-transport');
    if (attr === null) {
      return true;
    }
    return attr === '' || attr === 'true';
  }

  private get wsUrl(): string {
    return `${this.debugPath}/ws`;
  }

  // Get the active stream (external from FAB or internal)
  private getStream(): DebugStream | null {
    return this.externalStream || this.stream;
  }

  // WebSocket initialization
  private initWebSocket(): void {
    this.stream = new DebugStream({
      basePath: this.debugPath,
      onEvent: (event) => this.handleEvent(event),
      onStatusChange: (status) => this.handleStatusChange(status),
    });

    this.stream.connect();
    // Subscribe to event types for all panels
    const eventTypes = new Set<string>();
    for (const panel of this.panels) {
      for (const eventType of getPanelEventTypes(panel)) {
        eventTypes.add(eventType);
      }
    }
    this.stream.subscribe(Array.from(eventTypes));
  }

  // Fetch initial snapshot via HTTP
  private async fetchInitialSnapshot(generation = this.initializeGeneration): Promise<void> {
    const data = await fetchDebugSnapshot(this.debugPath);
    if (this.isInitializationStale(generation)) {
      return;
    }
    if (data) {
      this.applySnapshot(data);
    }
  }

  // Event handlers
  private handleEvent(event: DebugEvent): void {
    if (!event || !event.type) return;

    if (event.type === 'snapshot') {
      this.applySnapshot(event.payload as DebugSnapshot);
      return;
    }

    const panel = applyDebugEventToSnapshot(this.snapshot, event, {
      eventToPanel: this.eventToPanel,
    }) || event.type;

    // Update UI if showing affected panel
    if (panel === this.activePanel && this.expanded) {
      if (panel === 'sql') {
        // Incremental: append only the new row (snapshot already updated above).
        // Falls back to a full render via onNeedFullRender if not yet mounted.
        this.sqlView.enqueue([event.payload as SQLEntry]);
      } else if (panel === 'logs') {
        this.logsView.enqueue([event.payload as LogEntry]);
      } else if (panel === 'requests') {
        this.requestsView.enqueue([event.payload as RequestEntry]);
      } else if (panel === 'jserrors') {
        this.jserrorsView.enqueue([event.payload as JSErrorEntry]);
      } else if (this.registryLiveList.handles(panelRegistry.get(panel))) {
        // Opt-in registry (incl. server schema) panels append incrementally.
        const def = panelRegistry.get(panel)!;
        const data = (this.snapshot as Record<string, unknown>)[getSnapshotKey(def)];
        const item = Array.isArray(data) ? data[data.length - 1] : undefined;
        this.registryLiveList.enqueue(def, item);
      } else {
        this.updateContent();
      }
    }
  }

  private handleStatusChange(status: DebugStreamStatus): void {
    this.connectionStatus = status;
    this.updateConnectionStatus();
  }

  private applySnapshot(data: DebugSnapshot): void {
    this.snapshot = data || {};
    this.replCommands = normalizeReplCommands(this.snapshot.repl_commands);
    this.updateContent();
  }
  // Rendering
  private render(): void {
    const counts = getCounts(this.snapshot, this.slowThresholdMs);
    const panelTabs = this.panels
      .map((panel) => {
        const label = getPanelLabel(panel);
        const count = this.getPanelCount(panel);
        const active = this.activePanel === panel ? 'active' : '';
        const icon = renderDebugIconRef(getPanelIcon(panel), {
          size: '14px',
          extraClass: 'tab-icon',
        });
        return `
          <button class="tab ${active}" data-panel="${escapeHTML(panel)}">
            ${icon}
            <span class="tab-label">${escapeHTML(label)}</span>
            <span class="tab-count">${count}</span>
          </button>
        `;
      })
      .join('');

    // When using FAB, toolbar is either expanded (visible) or collapsed (hidden)
    // When not using FAB, show the summary bar in collapsed state
    const expandedClass = this.expanded ? 'expanded' : 'collapsed';
    const hiddenClass = this.useFab && !this.expanded ? 'hidden' : '';
    const toolbarHeight = this.expanded
      ? (this.customHeight || DebugToolbar.DEFAULT_HEIGHT)
      : 36;
    const heightStyle = this.expanded ? `height: ${toolbarHeight}px;` : '';

    this.shadow.innerHTML = `
      <style>${toolbarStyles}</style>
      <div class="toolbar ${expandedClass} ${hiddenClass}" style="${heightStyle}">
        ${this.expanded ? `
          <div class="resize-handle" data-resize-handle></div>
          <div class="toolbar-header">
            <div class="toolbar-tabs">${panelTabs}</div>
            <div class="toolbar-actions">
              <span class="connection-indicator">
                <span class="status-dot ${this.connectionStatus}"></span>
              </span>
              <button class="action-btn" data-action="refresh" title="Refresh (get snapshot)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                  <path d="M23 4v6h-6M1 20v-6h6"/>
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                </svg>
              </button>
              <button class="action-btn" data-action="clear" title="Clear all data">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
              </button>
              <a class="action-btn expand-link" href="${this.debugPath}" title="Open full debug page">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                  <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
                </svg>
              </a>
              <button class="action-btn collapse-btn" data-action="collapse" title="Collapse (Esc)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
          </div>
          <div class="toolbar-content">
            <div class="panel-container" id="panel-content">
              ${renderPanel(this.activePanel, this.snapshot, this.slowThresholdMs, this.getPanelOptions())}
            </div>
          </div>
        ` : ''}
        ${!this.useFab ? `
          <div class="toolbar-summary">
            <div class="summary-item ${counts.errors > 0 ? 'has-errors' : ''}">
              <span>Requests:</span>
              <span class="count">${counts.requests}</span>
            </div>
            <div class="summary-item ${counts.slowQueries > 0 ? 'has-slow' : ''}">
              <span>SQL:</span>
              <span class="count">${counts.sql}</span>
            </div>
            <div class="summary-item">
              <span>Logs:</span>
              <span class="count">${counts.logs}</span>
            </div>
            ${counts.errors > 0 ? `
              <div class="summary-item has-errors">
                <span>Errors:</span>
                <span class="count">${counts.errors}</span>
              </div>
            ` : ''}
            <div class="connection-status">
              <span class="status-dot ${this.connectionStatus}"></span>
              <span>${this.connectionStatus}</span>
            </div>
          </div>
        ` : ''}
      </div>
    `;

    this.attachEventListeners();
    this.renderStoredPanelActionResult(this.activePanel);
  }

  private updateContent(): void {
    // Update panel content if expanded
    if (this.expanded) {
      const container = this.shadow.getElementById('panel-content');
      if (container) {
        if (replPanelIDs.has(this.activePanel)) {
          this.renderReplPanel(container, this.activePanel);
        } else {
          container.innerHTML = renderPanel(this.activePanel, this.snapshot, this.slowThresholdMs, this.getPanelOptions());
          this.attachExpandableRowListeners();
          this.attachCopyListeners();
          this.attachSortToggleListeners();
          this.mountActivePanelViews();
          this.attachPanelActionListeners();
          this.renderStoredPanelActionResult(this.activePanel);
        }
      }
      // Update tab counts
      this.panels.forEach((panel) => {
        const tab = this.shadow.querySelector(`[data-panel="${panel}"] .tab-count`);
        if (tab) {
          tab.textContent = String(this.getPanelCount(panel));
        }
      });
    }

    // Update summary counts (only when not using FAB)
    if (!this.useFab) {
      this.updateSummary();
    }
  }

  private updateSummary(): void {
    const counts = getCounts(this.snapshot, this.slowThresholdMs);
    const summary = this.shadow.querySelector('.toolbar-summary');
    if (!summary) return;

    const items = summary.querySelectorAll('.summary-item');
    items.forEach((item) => {
      const label = item.querySelector('span:first-child')?.textContent?.replace(':', '').toLowerCase();
      const countEl = item.querySelector('.count');
      if (!countEl || !label) return;

      if (label === 'requests') {
        countEl.textContent = String(counts.requests);
        item.classList.toggle('has-errors', counts.errors > 0);
      } else if (label === 'sql') {
        countEl.textContent = String(counts.sql);
        item.classList.toggle('has-slow', counts.slowQueries > 0);
      } else if (label === 'logs') {
        countEl.textContent = String(counts.logs);
      } else if (label === 'errors') {
        countEl.textContent = String(counts.errors);
      }
    });
  }

  private updateConnectionStatus(): void {
    // Update header indicator
    const headerDot = this.shadow.querySelector('.connection-indicator .status-dot');
    if (headerDot) {
      headerDot.className = `status-dot ${this.connectionStatus}`;
    }

    // Update summary indicator (when not using FAB)
    const summaryDot = this.shadow.querySelector('.connection-status .status-dot');
    const summaryText = this.shadow.querySelector('.connection-status span:last-child');
    if (summaryDot) {
      summaryDot.className = `status-dot ${this.connectionStatus}`;
    }
    if (summaryText) {
      summaryText.textContent = this.connectionStatus;
    }
  }

  private getPanelCount(panel: string): number {
    const registryPanel = panelRegistry.get(panel);
    if (registryPanel) {
      return getRegistryPanelCount(this.snapshot, registryPanel);
    }

    switch (panel) {
      case 'requests':
        return this.snapshot.requests?.length || 0;
      case 'sql':
        return this.snapshot.sql?.length || 0;
      case 'logs':
        return this.snapshot.logs?.length || 0;
      case 'routes':
        return this.snapshot.routes?.length || 0;
      case 'template':
        return Object.keys(this.snapshot.template || {}).length;
      case 'session':
        return Object.keys(this.snapshot.session || {}).length;
      case 'config':
        return Object.keys(this.snapshot.config || {}).length;
      case 'custom':
        const custom = this.snapshot.custom || {};
        return Object.keys(custom.data || {}).length + (custom.logs?.length || 0);
      default: {
        // Dynamically registered panels: count keys if object, length if array
        const data = this.snapshot[panel];
        if (Array.isArray(data)) {
          return data.length;
        }
        if (data != null && typeof data === 'object') {
          return Object.keys(data as Record<string, unknown>).length;
        }
        return 0;
      }
    }
  }

  private getPanelOptions(): PanelOptions & { expandedRequestIds?: Set<string> } {
    return {
      slowThresholdMs: this.slowThresholdMs,
      newestFirst: this.panelSortOrder.get(this.activePanel) ?? true,
      expandedRequestIds: this.expandedRequests,
    };
  }

  private attachEventListeners(): void {
    // Tab clicks
    this.shadow.querySelectorAll('.tab').forEach((tab) => {
      tab.addEventListener('click', (e) => {
        const panel = (e.currentTarget as HTMLElement).dataset.panel;
        if (panel && panel !== this.activePanel) {
          this.activePanel = panel;
          this.saveState();
          // Update active state
          this.shadow.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
          (e.currentTarget as HTMLElement).classList.add('active');
          // Render panel content
          const container = this.shadow.getElementById('panel-content');
          if (container) {
            container.innerHTML = renderPanel(this.activePanel, this.snapshot, this.slowThresholdMs, this.getPanelOptions());
            this.attachExpandableRowListeners();
            this.attachCopyListeners();
            this.attachSortToggleListeners();
            this.mountActivePanelViews();
            this.attachPanelActionListeners();
          }
        }
      });
    });

    // Attach expandable row listeners for initial render
    this.attachExpandableRowListeners();
    this.attachCopyListeners();
    this.attachSortToggleListeners();
    this.mountActivePanelViews();
    this.attachPanelActionListeners();

    // Action buttons
    this.shadow.querySelectorAll('[data-action]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const action = (e.currentTarget as HTMLElement).dataset.action;
        const activeStream = this.getStream();
        switch (action) {
          case 'toggle':
            this.toggleExpanded();
            break;
          case 'collapse':
            this.collapse();
            break;
          case 'refresh':
            activeStream?.requestSnapshot();
            break;
          case 'clear':
            activeStream?.clear();
            this.snapshot = {};
            this.updateContent();
            break;
        }
      });
    });

    // Summary click to expand (when not using FAB)
    if (!this.useFab) {
      const summary = this.shadow.querySelector('.toolbar-summary');
      if (summary) {
        summary.addEventListener('click', () => {
          if (!this.expanded) {
            this.expanded = true;
            this.saveState();
            this.render();
            this.dispatchExpandEvent();
          }
        });
      }
    }

    // Resize handle
    this.attachResizeListeners();

    // Copy buttons
    this.attachCopyListeners();
  }

  private attachPanelActionListeners(): void {
    this.shadow.querySelectorAll<HTMLButtonElement>('[data-panel-action]').forEach((button) => {
      button.addEventListener('click', () => {
        if (!button.disabled) {
          this.runPanelAction(button, button);
        }
      });
    });
    this.shadow.querySelectorAll<HTMLFormElement>('[data-panel-action-form]').forEach((form) => {
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        const button = form.querySelector<HTMLButtonElement>('button[type="submit"]') || undefined;
        if (!button?.disabled) {
          this.runPanelAction(form, button);
        }
      });
    });
  }

  private async runPanelAction(element: HTMLElement, button?: HTMLButtonElement): Promise<void> {
    const panelID = element.dataset.panelId || '';
    const actionID = element.dataset.actionId || '';
    if (!panelID || !actionID) {
      return;
    }
    const confirmText = element.dataset.actionConfirm || '';
    const requiresConfirm = element.dataset.actionRequiresConfirm === 'true';
    if ((requiresConfirm || confirmText) && !window.confirm(confirmText || 'Run this debug panel action?')) {
      return;
    }
    const payload = buildPanelActionPayload(element);
    if (button) {
      button.disabled = true;
    }
    try {
      const response = await httpRequest(`${this.debugPath}/api/panels/${encodeURIComponent(panelID)}/actions/${encodeURIComponent(actionID)}`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error(await readHTTPError(response, `Action failed (${response.status})`, { appendStatusToFallback: false }));
      }
      const result = await readExpectedHTTPJSON<{ ok?: boolean; message?: string; data?: unknown; refresh?: boolean; event?: DebugEvent }>(response);
      this.showPanelActionResult(
        panelID,
        result.ok === false ? 'error' : 'ok',
        result.message || (result.ok === false ? 'Action failed' : 'Action complete'),
        result.data
      );
      if (result.event) {
        this.handleEvent(result.event);
      }
      if (result.refresh) {
        await this.fetchInitialSnapshot();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Action failed';
      this.showPanelActionResult(panelID, 'error', message);
    } finally {
      if (button) {
        button.disabled = false;
      }
    }
  }

  private showPanelActionResult(panelID: string, status: 'ok' | 'error', message: string, data?: unknown): void {
    this.panelActionResults.set(panelID, { status, message, data });
    this.renderStoredPanelActionResult(panelID);
  }

  private renderStoredPanelActionResult(panelID: string): void {
    const result = this.panelActionResults.get(panelID);
    if (!result) {
      return;
    }
    const target = Array.from(this.shadow.querySelectorAll<HTMLElement>('[data-panel-action-result]'))
      .find((element) => element.dataset.panelActionResult === panelID);
    if (!target) {
      return;
    }
    const dataHTML = result.data === undefined
      ? ''
      : `<pre style="margin-top:0.5rem;max-height:14rem;overflow:auto;white-space:pre-wrap;font-size:11px">${escapeHTML(formatJSON(result.data, { nullAsEmptyObject: false }))}</pre>`;
    target.innerHTML = `<div class="${result.status === 'error' ? 'badge error' : 'badge'}">${escapeHTML(result.message)}</div>${dataHTML}`;
  }

  private renderReplPanel(container: HTMLElement, panel: string): void {
    let replPanel = this.replPanels.get(panel);
    if (!replPanel) {
      replPanel = new DebugReplPanel({
        kind: panel === 'shell' ? 'shell' : 'console',
        debugPath: this.debugPath,
        commands: panel === 'console' ? this.replCommands : [],
      });
      this.replPanels.set(panel, replPanel);
    }
    replPanel.attach(container);
  }

  private attachResizeListeners(): void {
    const resizeHandle = this.shadow.querySelector('[data-resize-handle]');
    if (!resizeHandle) return;

    resizeHandle.addEventListener('mousedown', (e: Event) => {
      const mouseEvent = e as MouseEvent;
      mouseEvent.preventDefault();
      this.startResize(mouseEvent.clientY);
    });

    resizeHandle.addEventListener('touchstart', (e: Event) => {
      const touchEvent = e as TouchEvent;
      if (touchEvent.touches.length === 1) {
        touchEvent.preventDefault();
        this.startResize(touchEvent.touches[0].clientY);
      }
    }, { passive: false });
  }

  private startResize(startY: number): void {
    this.isResizing = true;
    this.resizeStartY = startY;
    const toolbar = this.shadow.querySelector('.toolbar') as HTMLElement;
    this.resizeStartHeight = toolbar?.offsetHeight || DebugToolbar.DEFAULT_HEIGHT;

    toolbar?.classList.add('resizing');
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (e: MouseEvent) => {
      this.handleResize(e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        this.handleResize(e.touches[0].clientY);
      }
    };

    const handleEnd = () => {
      this.isResizing = false;
      toolbar?.classList.remove('resizing');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleEnd);
      this.saveState();
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleEnd);
  }

  private handleResize(currentY: number): void {
    if (!this.isResizing) return;

    const delta = this.resizeStartY - currentY;
    const maxHeight = window.innerHeight * DebugToolbar.MAX_HEIGHT_RATIO;
    const newHeight = Math.min(maxHeight, Math.max(DebugToolbar.MIN_HEIGHT, this.resizeStartHeight + delta));

    this.customHeight = newHeight;

    const toolbar = this.shadow.querySelector('.toolbar') as HTMLElement;
    if (toolbar) {
      toolbar.style.height = `${newHeight}px`;
    }
  }

  private attachExpandableRowListeners(): void {
    // Use shared helper for expandable row behavior
    attachExpandableRowListeners(this.shadow);
  }

  private attachCopyListeners(): void {
    // Use shared helper for copy-to-clipboard behavior (toolbar style with SVG feedback)
    attachCopyListeners(this.shadow, { useIconFeedback: false });
  }

  private attachSortToggleListeners(): void {
    // Use shared helper for sort toggle behavior
    attachSortToggleListeners(this.shadow, (panelId, newestFirst) => {
      this.panelSortOrder.set(panelId, newestFirst);
      this.saveState();
      this.updateContent();
    });
  }

  private mountActivePanelViews(): void {
    this.mountSQLView();
    this.mountLogsView();
    this.mountRequestsView();
    this.mountJSErrorsView();
    this.mountRegistryLiveView();
  }

  private mountRegistryLiveView(): void {
    const def = panelRegistry.get(this.activePanel);
    if (def && this.registryLiveList.handles(def)) {
      this.registryLiveList.adopt(def, this.shadow);
    }
  }

  private mountSQLView(): void {
    if (this.activePanel !== 'sql') return;
    // SqlLiveView wires delegated selection/expansion + incremental updates and
    // restores selection/expanded rows keyed by stable id.
    this.sqlView.adopt(this.shadow);
  }

  private mountLogsView(): void {
    if (this.activePanel !== 'logs') return;
    // LiveListView appends/evicts log rows incrementally instead of rebuilding.
    this.logsView.adopt(this.shadow);
  }

  private mountRequestsView(): void {
    if (this.activePanel !== 'requests') return;
    // LiveListView appends/evicts incrementally and wires request-detail
    // expansion (delegated, persisted via expandedRequests) on adopt.
    this.requestsView.adopt(this.shadow);
  }

  private mountJSErrorsView(): void {
    if (this.activePanel !== 'jserrors') return;
    this.jserrorsView.adopt(this.shadow);
  }
}

// Register the custom element
if (!customElements.get('debug-toolbar')) {
  customElements.define('debug-toolbar', DebugToolbar);
}
