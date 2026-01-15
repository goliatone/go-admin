// Debug FAB (Floating Action Button) Component
// A minimized debug indicator that expands on hover and opens the toolbar on click

import { DebugStream, type DebugEvent, type DebugStreamStatus } from '../debug-stream.js';
import { getCounts, type DebugSnapshot } from './panel-renderers.js';
import { fabStyles } from './fab-styles.js';

// Panel configuration for events
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

const defaultPanels = ['requests', 'sql', 'logs', 'routes', 'config'];

export class DebugFab extends HTMLElement {
  private shadow: ShadowRoot;
  private stream: DebugStream | null = null;
  private snapshot: DebugSnapshot = {};
  private connectionStatus: DebugStreamStatus = 'disconnected';
  private isHovered = false;
  private toolbarExpanded = false;

  static get observedAttributes(): string[] {
    return ['debug-path', 'panels', 'toolbar-expanded'];
  }

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
  }

  connectedCallback(): void {
    this.render();
    this.initWebSocket();
    this.fetchInitialSnapshot();
    this.loadState();
  }

  disconnectedCallback(): void {
    this.stream?.close();
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (oldValue === newValue) return;

    if (name === 'toolbar-expanded') {
      this.toolbarExpanded = newValue === 'true' || newValue === '';
      this.render();
    }
  }

  // Public API
  public setToolbarExpanded(expanded: boolean): void {
    this.toolbarExpanded = expanded;
    this.saveState();
    this.render();
  }

  public getSnapshot(): DebugSnapshot {
    return this.snapshot;
  }

  public getConnectionStatus(): DebugStreamStatus {
    return this.connectionStatus;
  }

  public getStream(): DebugStream | null {
    return this.stream;
  }

  // Attribute getters
  private get debugPath(): string {
    return this.getAttribute('debug-path') || '/admin/debug';
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

  // State persistence
  private loadState(): void {
    try {
      const stored = localStorage.getItem('debug-toolbar-expanded');
      if (stored !== null) {
        this.toolbarExpanded = stored === 'true';
        this.render();
      }
    } catch {
      // Ignore localStorage errors
    }
  }

  private saveState(): void {
    try {
      localStorage.setItem('debug-toolbar-expanded', String(this.toolbarExpanded));
    } catch {
      // Ignore localStorage errors
    }
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

    this.updateCounters();
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
    // Dispatch event for toolbar to listen
    this.dispatchEvent(new CustomEvent('debug-status-change', {
      detail: { status },
      bubbles: true,
      composed: true,
    }));
  }

  private applySnapshot(data: DebugSnapshot): void {
    this.snapshot = data || {};
    this.updateCounters();
    // Dispatch event for toolbar to listen
    this.dispatchEvent(new CustomEvent('debug-snapshot', {
      detail: { snapshot: this.snapshot },
      bubbles: true,
      composed: true,
    }));
  }

  private trimArray<T>(arr: T[], max: number): void {
    while (arr.length > max) {
      arr.shift();
    }
  }

  // Rendering
  private render(): void {
    const counts = getCounts(this.snapshot);
    const hasErrors = counts.errors > 0;
    const hasSlowQueries = counts.slowQueries > 0;

    // Hide FAB when toolbar is expanded
    const hiddenClass = this.toolbarExpanded ? 'hidden' : '';

    this.shadow.innerHTML = `
      <style>${fabStyles}</style>
      <div class="fab ${hiddenClass}" data-status="${this.connectionStatus}">
        <div class="fab-collapsed">
          <span class="fab-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
              <circle cx="8" cy="14" r="1.5"/>
              <circle cx="16" cy="14" r="1.5"/>
              <path d="M12 8c-2 0-3.5 1-4 2.5h8c-.5-1.5-2-2.5-4-2.5z"/>
            </svg>
          </span>
          <span class="fab-status-dot"></span>
        </div>
        <div class="fab-expanded">
          <div class="fab-counter ${counts.requests > 0 ? 'has-items' : ''}">
            <span class="counter-value">${counts.requests}</span>
            <span class="counter-label">Req</span>
          </div>
          <div class="fab-counter ${counts.sql > 0 ? 'has-items' : ''} ${hasSlowQueries ? 'has-slow' : ''}">
            <span class="counter-value">${counts.sql}</span>
            <span class="counter-label">SQL</span>
          </div>
          <div class="fab-counter ${counts.logs > 0 ? 'has-items' : ''} ${hasErrors ? 'has-errors' : ''}">
            <span class="counter-value">${counts.logs}</span>
            <span class="counter-label">Logs</span>
          </div>
          ${hasErrors ? `
            <div class="fab-counter has-errors">
              <span class="counter-value">${counts.errors}</span>
              <span class="counter-label">Err</span>
            </div>
          ` : ''}
        </div>
      </div>
    `;

    this.attachEventListeners();
  }

  private updateCounters(): void {
    const counts = getCounts(this.snapshot);
    const hasErrors = counts.errors > 0;
    const hasSlowQueries = counts.slowQueries > 0;

    // Update request counter
    const reqCounter = this.shadow.querySelector('.fab-counter:nth-child(1)');
    if (reqCounter) {
      const reqValue = reqCounter.querySelector('.counter-value');
      if (reqValue) reqValue.textContent = String(counts.requests);
      reqCounter.classList.toggle('has-items', counts.requests > 0);
    }

    // Update SQL counter
    const sqlCounter = this.shadow.querySelector('.fab-counter:nth-child(2)');
    if (sqlCounter) {
      const sqlValue = sqlCounter.querySelector('.counter-value');
      if (sqlValue) sqlValue.textContent = String(counts.sql);
      sqlCounter.classList.toggle('has-items', counts.sql > 0);
      sqlCounter.classList.toggle('has-slow', hasSlowQueries);
    }

    // Update logs counter
    const logsCounter = this.shadow.querySelector('.fab-counter:nth-child(3)');
    if (logsCounter) {
      const logsValue = logsCounter.querySelector('.counter-value');
      if (logsValue) logsValue.textContent = String(counts.logs);
      logsCounter.classList.toggle('has-items', counts.logs > 0);
      logsCounter.classList.toggle('has-errors', hasErrors);
    }

    // Update or add error counter
    const errorCounter = this.shadow.querySelector('.fab-counter:nth-child(4)');
    if (hasErrors) {
      if (errorCounter) {
        const errValue = errorCounter.querySelector('.counter-value');
        if (errValue) errValue.textContent = String(counts.errors);
      }
    }
  }

  private updateConnectionStatus(): void {
    const fab = this.shadow.querySelector('.fab');
    if (fab) {
      fab.setAttribute('data-status', this.connectionStatus);
    }
  }

  private attachEventListeners(): void {
    const fab = this.shadow.querySelector('.fab');
    if (!fab) return;

    // Click to expand toolbar
    fab.addEventListener('click', () => {
      this.toolbarExpanded = true;
      this.saveState();
      this.render();
      this.dispatchEvent(new CustomEvent('debug-expand', {
        detail: { expanded: true },
        bubbles: true,
        composed: true,
      }));
    });

    // Hover state (for CSS transitions)
    fab.addEventListener('mouseenter', () => {
      this.isHovered = true;
      fab.classList.add('is-hovered');
    });

    fab.addEventListener('mouseleave', () => {
      this.isHovered = false;
      fab.classList.remove('is-hovered');
    });
  }
}

// Register the custom element
if (!customElements.get('debug-fab')) {
  customElements.define('debug-fab', DebugFab);
}
