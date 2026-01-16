// Debug Toolbar Web Component
// A self-contained toolbar that displays debug information at the bottom of the page
// Works in conjunction with DebugFab for collapsed state

import { DebugStream, type DebugEvent, type DebugStreamStatus } from '../debug-stream.js';
import { toolbarStyles } from './toolbar-styles.js';
import { renderPanel, getCounts, type DebugSnapshot } from './panel-renderers.js';

// Panel configuration
const defaultPanels = ['requests', 'sql', 'logs', 'routes', 'config'];

const panelLabels: Record<string, string> = {
  template: 'Template',
  session: 'Session',
  requests: 'Requests',
  sql: 'SQL',
  logs: 'Logs',
  config: 'Config',
  routes: 'Routes',
  custom: 'Custom',
};

const panelEventMap: Record<string, string> = {
  template: 'template',
  session: 'session',
  requests: 'request',
  sql: 'sql',
  logs: 'log',
  custom: 'custom',
};

const eventToPanel: Record<string, string> = {
  request: 'requests',
  sql: 'sql',
  log: 'logs',
  template: 'template',
  session: 'session',
  custom: 'custom',
};

export class DebugToolbar extends HTMLElement {
  private shadow: ShadowRoot;
  private stream: DebugStream | null = null;
  private externalStream: DebugStream | null = null;
  private snapshot: DebugSnapshot = {};
  private expanded = false;
  private activePanel = 'requests';
  private connectionStatus: DebugStreamStatus = 'disconnected';
  private slowThresholdMs = 50;
  private useFab = false;

  static get observedAttributes(): string[] {
    return ['base-path', 'debug-path', 'panels', 'expanded', 'slow-threshold-ms', 'use-fab'];
  }

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
  }

  connectedCallback(): void {
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
    document.removeEventListener('keydown', this.handleKeyDown);
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
    this.snapshot = snapshot || {};
    this.updateContent();
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
    } catch {
      // Ignore localStorage errors
    }
  }

  private saveState(): void {
    try {
      localStorage.setItem('debug-toolbar-expanded', String(this.expanded));
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
      return parsed.length ? parsed : defaultPanels;
    }
    return defaultPanels;
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
    this.stream.subscribe(this.panels.map((panel) => panelEventMap[panel] || panel));
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

    // Apply incremental updates
    const panel = eventToPanel[event.type] || event.type;
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
    this.updateContent();
  }

  private trimArray<T>(arr: T[], max: number): void {
    while (arr.length > max) {
      arr.shift();
    }
  }

  // Rendering
  private render(): void {
    const counts = getCounts(this.snapshot);
    const panelTabs = this.panels
      .map((panel) => {
        const label = panelLabels[panel] || panel;
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
    const showToolbar = this.useFab ? this.expanded : true;
    const expandedClass = this.expanded ? 'expanded' : 'collapsed';
    const hiddenClass = this.useFab && !this.expanded ? 'hidden' : '';

    this.shadow.innerHTML = `
      <style>${toolbarStyles}</style>
      <div class="toolbar ${expandedClass} ${hiddenClass}">
        ${this.expanded ? `
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
              ${renderPanel(this.activePanel, this.snapshot, this.slowThresholdMs)}
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
        container.innerHTML = renderPanel(this.activePanel, this.snapshot, this.slowThresholdMs);
        this.attachExpandableRowListeners();
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
    const counts = getCounts(this.snapshot);
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
      default:
        return 0;
    }
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
            container.innerHTML = renderPanel(this.activePanel, this.snapshot, this.slowThresholdMs);
            this.attachExpandableRowListeners();
          }
        }
      });
    });

    // Attach expandable row listeners for initial render
    this.attachExpandableRowListeners();

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
  }

  private attachExpandableRowListeners(): void {
    // Attach click listeners to expandable rows (SQL queries)
    this.shadow.querySelectorAll('.expandable-row').forEach((row) => {
      row.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        // Don't toggle if clicking on a link or button
        if (target.closest('a, button')) return;

        const rowEl = e.currentTarget as HTMLElement;
        rowEl.classList.toggle('expanded');
      });
    });
  }
}

// Register the custom element
if (!customElements.get('debug-toolbar')) {
  customElements.define('debug-toolbar', DebugToolbar);
}
