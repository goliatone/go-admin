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
        <span class="fab-status-dot"></span>
        <div class="fab-collapsed">
          <span class="fab-icon">
            <svg viewBox="0 0 24 24" stroke-width="1.5" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path fill-rule="evenodd" clip-rule="evenodd" d="M12 2.25C15.4148 2.25 18.157 4.93659 19.2445 8.53907L20.6646 7.82902C21.0351 7.64377 21.4856 7.79394 21.6709 8.16443C21.8561 8.53491 21.7059 8.98541 21.3355 9.17066L19.5919 10.0425C19.6958 10.6789 19.75 11.3341 19.75 12C19.75 12.4216 19.7283 12.839 19.6859 13.25H22C22.4142 13.25 22.75 13.5858 22.75 14C22.75 14.4142 22.4142 14.75 22 14.75H19.4347C19.2438 15.5659 18.9699 16.3431 18.6235 17.0629L20.5303 18.9697C20.8232 19.2626 20.8232 19.7374 20.5303 20.0303C20.2374 20.3232 19.7626 20.3232 19.4697 20.0303L17.8463 18.4069C16.4519 20.4331 14.3908 21.75 12 21.75C9.60921 21.75 7.54809 20.4331 6.15371 18.4069L4.53033 20.0303C4.23744 20.3232 3.76256 20.3232 3.46967 20.0303C3.17678 19.7374 3.17678 19.2626 3.46967 18.9697L5.37647 17.0629C5.03008 16.3431 4.7562 15.5659 4.56527 14.75H2C1.58579 14.75 1.25 14.4142 1.25 14C1.25 13.5858 1.58579 13.25 2 13.25H4.31407C4.27174 12.839 4.25 12.4216 4.25 12C4.25 11.3341 4.30423 10.6789 4.40814 10.0425L2.66455 9.17066C2.29406 8.98541 2.1439 8.53491 2.32914 8.16443C2.51438 7.79394 2.96488 7.64377 3.33537 7.82902L4.75547 8.53907C5.84297 4.93659 8.58522 2.25 12 2.25ZM11.25 19C11.25 19.4142 11.5858 19.75 12 19.75C12.4142 19.75 12.75 19.4142 12.75 19V9.73117C14.005 9.6696 15.2088 9.46632 16.1588 9.26042C16.5636 9.17268 16.8207 8.77339 16.7329 8.36857C16.6452 7.96376 16.2459 7.70672 15.8411 7.79445C14.7597 8.02883 13.3718 8.25 12 8.25C10.6281 8.25 9.24022 8.02883 8.15882 7.79445C7.75401 7.70672 7.35472 7.96376 7.26698 8.36857C7.17924 8.77339 7.43629 9.17268 7.8411 9.26042C8.79115 9.46632 9.99494 9.6696 11.25 9.73117V19Z" fill="currentColor"></path>
            </svg>
          </span>
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
