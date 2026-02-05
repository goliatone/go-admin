// Debug Toolbar Web Component
// A self-contained toolbar that displays debug information at the bottom of the page
// Works in conjunction with DebugFab for collapsed state

import { DebugStream, type DebugEvent, type DebugStreamStatus } from '../debug-stream.js';
import { DebugReplPanel, type DebugReplCommand } from '../repl/repl-panel.js';
import { toolbarStyles } from './toolbar-styles.js';
import { renderPanel, getCounts, type DebugSnapshot, type PanelOptions } from './panel-renderers.js';
import {
  attachCopyListeners,
  attachExpandableRowListeners,
  attachSortToggleListeners,
  attachSQLSelectionListeners,
  attachRequestDetailListeners,
} from '../shared/interactions.js';
import {
  panelRegistry,
  normalizeEventTypes,
  defaultHandleEvent,
  getSnapshotKey,
  type RegistryChangeEvent,
} from '../shared/panel-registry.js';
// Import to ensure built-in panels are registered
import '../shared/builtin-panels.js';

// Panel configuration
const replPanelIDs = new Set(['console', 'shell']);

// REPL panel labels (not in registry)
const replPanelLabels: Record<string, string> = {
  console: 'Console',
  shell: 'Shell',
};

// Get default toolbar panels from registry (filter to toolbar-compatible)
const getDefaultToolbarPanels = (): string[] => {
  const toolbarPanels = panelRegistry.getToolbarPanels();
  if (toolbarPanels.length > 0) {
    // Filter to core panels for toolbar default
    return toolbarPanels
      .filter((p) => p.category === 'core' || p.category === 'system')
      .map((p) => p.id);
  }
  return ['requests', 'sql', 'logs', 'routes', 'config'];
};

// Get panel label from registry or fallback
const getPanelLabel = (panelId: string): string => {
  if (replPanelLabels[panelId]) {
    return replPanelLabels[panelId];
  }
  const def = panelRegistry.get(panelId);
  if (def) {
    return def.label;
  }
  // Fallback: capitalize
  return panelId.charAt(0).toUpperCase() + panelId.slice(1);
};

// Get event types for a panel
const getPanelEventTypes = (panelId: string): string[] => {
  const def = panelRegistry.get(panelId);
  if (def) {
    return normalizeEventTypes(def);
  }
  return [panelId];
};

// Build event-to-panel mapping from registry
const buildEventToPanel = (): Record<string, string> => {
  const mapping: Record<string, string> = {};
  for (const def of panelRegistry.list()) {
    for (const eventType of normalizeEventTypes(def)) {
      mapping[eventType] = def.id;
    }
  }
  return mapping;
};

type DebugReplCommandPayload = {
  command?: string;
  description?: string;
  tags?: string[];
  aliases?: string[];
  mutates?: boolean;
  read_only?: boolean;
};

const normalizeReplCommands = (value: unknown): DebugReplCommand[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  const commands: DebugReplCommand[] = [];
  value.forEach((item) => {
    if (!item || typeof item !== 'object') {
      return;
    }
    const raw = item as DebugReplCommandPayload;
    const command = typeof raw.command === 'string' ? raw.command.trim() : '';
    if (!command) {
      return;
    }
    const description = typeof raw.description === 'string' ? raw.description.trim() : '';
    const tags = Array.isArray(raw.tags)
      ? raw.tags.filter((tag) => typeof tag === 'string' && tag.trim() !== '').map((tag) => tag.trim())
      : [];
    const aliases = Array.isArray(raw.aliases)
      ? raw.aliases.filter((alias) => typeof alias === 'string' && alias.trim() !== '').map((alias) => alias.trim())
      : [];
    const mutates =
      typeof raw.mutates === 'boolean'
        ? raw.mutates
        : typeof raw.read_only === 'boolean'
          ? !raw.read_only
          : false;
    commands.push({
      command,
      description: description || undefined,
      tags: tags.length > 0 ? tags : undefined,
      aliases: aliases.length > 0 ? aliases : undefined,
      mutates,
    });
  });
  return commands;
};

export class DebugToolbar extends HTMLElement {
  private shadow: ShadowRoot;
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

  private static readonly MIN_HEIGHT = 150;
  private static readonly MAX_HEIGHT_RATIO = 0.8;
  private static readonly DEFAULT_HEIGHT = 320;

  static get observedAttributes(): string[] {
    return ['base-path', 'debug-path', 'panels', 'expanded', 'slow-threshold-ms', 'use-fab'];
  }

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
  }

  connectedCallback(): void {
    // Build event-to-panel mapping from registry
    this.eventToPanel = buildEventToPanel();

    // Subscribe to registry changes
    this.unsubscribeRegistry = panelRegistry.subscribe((event) => this.handleRegistryChange(event));

    this.loadState();
    this.render();
    // Only init WebSocket if not using FAB (FAB manages its own connection)
    if (!this.useFab) {
      this.initWebSocket();
      this.fetchInitialSnapshot();
    }
    this.setupKeyboardShortcut();
  }

  disconnectedCallback(): void {
    this.stream?.close();
    this.unsubscribeRegistry?.();
    document.removeEventListener('keydown', this.handleKeyDown);
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
    } catch {
      // Ignore localStorage errors
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
    return this.getAttribute('base-path') || '/admin';
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
  private async fetchInitialSnapshot(): Promise<void> {
    try {
      const response = await fetch(`${this.debugPath}/api/snapshot`, {
        credentials: 'same-origin',
      });
      if (response.ok) {
        const data = await response.json();
        this.applySnapshot(data);
      }
    } catch {
      // Ignore fetch errors - WebSocket will provide data
    }
  }

  // Event handlers
  private handleEvent(event: DebugEvent): void {
    if (!event || !event.type) return;

    if (event.type === 'snapshot') {
      this.applySnapshot(event.payload as DebugSnapshot);
      return;
    }

    // Find panel for this event type
    const panel = this.eventToPanel[event.type] || event.type;

    // Check if we have a registry definition
    const def = panelRegistry.get(panel);
    if (def) {
      // Use registry's handleEvent or default
      const snapshotKey = getSnapshotKey(def);
      const currentData = (this.snapshot as Record<string, unknown>)[snapshotKey];
      const handler = def.handleEvent || ((current, payload) => defaultHandleEvent(current, payload, 500));
      const newData = handler(currentData, event.payload);
      (this.snapshot as Record<string, unknown>)[snapshotKey] = newData;
    } else {
      // Fallback for non-registry events
      switch (event.type) {
        case 'request':
          this.snapshot.requests = this.snapshot.requests || [];
          this.snapshot.requests.push(event.payload);
          this.trimArray(this.snapshot.requests, 500);
          break;
        case 'sql':
          this.snapshot.sql = this.snapshot.sql || [];
          this.snapshot.sql.push(event.payload);
          this.trimArray(this.snapshot.sql, 200);
          break;
        case 'log':
          this.snapshot.logs = this.snapshot.logs || [];
          this.snapshot.logs.push(event.payload);
          this.trimArray(this.snapshot.logs, 500);
          break;
        case 'template':
          this.snapshot.template = event.payload || {};
          break;
        case 'session':
          this.snapshot.session = event.payload || {};
          break;
        case 'custom':
          this.handleCustomEvent(event.payload);
          break;
      }
    }

    // Update UI if showing affected panel
    if (panel === this.activePanel && this.expanded) {
      this.updateContent();
    }
  }

  private handleCustomEvent(payload: unknown): void {
    if (!payload || typeof payload !== 'object') return;
    this.snapshot.custom = this.snapshot.custom || { data: {}, logs: [] };

    const p = payload as Record<string, unknown>;
    if ('key' in p && 'value' in p) {
      this.snapshot.custom.data = this.snapshot.custom.data || {};
      this.snapshot.custom.data[String(p.key)] = p.value;
    } else if ('category' in p || 'message' in p) {
      this.snapshot.custom.logs = this.snapshot.custom.logs || [];
      this.snapshot.custom.logs.push(payload as { category?: string; message?: string });
      this.trimArray(this.snapshot.custom.logs, 500);
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

  private trimArray<T>(arr: T[], max: number): void {
    while (arr.length > max) {
      arr.shift();
    }
  }

  // Rendering
  private render(): void {
    const counts = getCounts(this.snapshot, this.slowThresholdMs);
    const panelTabs = this.panels
      .map((panel) => {
        const label = getPanelLabel(panel);
        const count = this.getPanelCount(panel);
        const active = this.activePanel === panel ? 'active' : '';
        return `
          <button class="tab ${active}" data-panel="${panel}">
            ${label}
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
          this.attachSQLSelectionListeners();
          if (this.activePanel === 'requests') {
            attachRequestDetailListeners(this.shadow, this.expandedRequests);
          }
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
            this.attachSQLSelectionListeners();
            if (this.activePanel === 'requests') {
              attachRequestDetailListeners(this.shadow, this.expandedRequests);
            }
          }
        }
      });
    });

    // Attach expandable row listeners for initial render
    this.attachExpandableRowListeners();
    this.attachCopyListeners();
    this.attachSortToggleListeners();
    this.attachSQLSelectionListeners();
    if (this.activePanel === 'requests') {
      attachRequestDetailListeners(this.shadow, this.expandedRequests);
    }

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

  private attachSQLSelectionListeners(): void {
    if (this.activePanel !== 'sql') return;
    // Use shared helper for SQL row selection (toolbar style with SVG feedback)
    attachSQLSelectionListeners(this.shadow, this.snapshot.sql || [], { useIconFeedback: false });
  }
}

// Register the custom element
if (!customElements.get('debug-toolbar')) {
  customElements.define('debug-toolbar', DebugToolbar);
}
