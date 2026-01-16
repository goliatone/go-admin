import { DebugStream, type DebugEvent, type DebugStreamStatus } from './debug-stream.js';
import { DebugReplPanel, type DebugReplCommand } from './repl/repl-panel.js';
import { highlightSQL, highlightJSON } from './syntax-highlight.js';

type RequestEntry = {
  id?: string;
  timestamp?: string;
  method?: string;
  path?: string;
  status?: number;
  duration?: number;
  headers?: Record<string, string>;
  query?: Record<string, string>;
  error?: string;
};

type SQLEntry = {
  id?: string;
  timestamp?: string;
  query?: string;
  args?: any[];
  duration?: number;
  row_count?: number;
  error?: string;
};

type LogEntry = {
  timestamp?: string;
  level?: string;
  message?: string;
  fields?: Record<string, any>;
  source?: string;
};

type CustomLogEntry = {
  timestamp?: string;
  category?: string;
  message?: string;
  fields?: Record<string, any>;
};

type RouteEntry = {
  method?: string;
  path?: string;
  name?: string;
  handler?: string;
  middleware?: string[];
  summary?: string;
  tags?: string[];
};

type CustomSnapshot = {
  data?: Record<string, any>;
  logs?: CustomLogEntry[];
};

type DebugReplCommandPayload = {
  command?: string;
  description?: string;
  tags?: string[];
  aliases?: string[];
  read_only?: boolean;
};

type DebugSnapshot = {
  template?: Record<string, any>;
  session?: Record<string, any>;
  requests?: RequestEntry[];
  sql?: SQLEntry[];
  logs?: LogEntry[];
  config?: Record<string, any>;
  routes?: RouteEntry[];
  custom?: CustomSnapshot;
  [key: string]: any;
};

type PanelFilters = {
  requests: { method: string; status: string; search: string };
  sql: { search: string; slowOnly: boolean; errorOnly: boolean };
  logs: { level: string; search: string; autoScroll: boolean };
  routes: { method: string; search: string };
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

const defaultPanels = ['template', 'session', 'requests', 'sql', 'logs', 'config', 'routes', 'custom'];
const replPanelIDs = new Set(['shell', 'console']);
const knownPanels = new Set([...defaultPanels, ...replPanelIDs]);

const panelLabels: Record<string, string> = {
  template: 'Template',
  session: 'Session',
  requests: 'Requests',
  sql: 'SQL Queries',
  logs: 'Logs',
  config: 'Config',
  routes: 'Routes',
  custom: 'Custom',
  shell: 'Shell',
  console: 'Console',
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

const normalizeReplCommands = (value: any): DebugReplCommand[] => {
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
      ? raw.tags
          .filter((tag) => typeof tag === 'string' && tag.trim() !== '')
          .map((tag) => tag.trim())
      : [];
    const aliases = Array.isArray(raw.aliases)
      ? raw.aliases
          .filter((alias) => typeof alias === 'string' && alias.trim() !== '')
          .map((alias) => alias.trim())
      : [];
    commands.push({
      command,
      description: description || undefined,
      tags: tags.length > 0 ? tags : undefined,
      aliases: aliases.length > 0 ? aliases : undefined,
      readOnly: Boolean(raw.read_only),
    });
  });
  return commands;
};

const escapeHTML = (value: any): string => {
  const str = String(value ?? '');
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

const formatTimestamp = (value: any): string => {
  if (!value) {
    return '';
  }
  if (typeof value === 'number') {
    return new Date(value).toLocaleTimeString();
  }
  if (typeof value === 'string') {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleTimeString();
    }
    return value;
  }
  return '';
};

const formatDuration = (value: any): string => {
  if (value === null || value === undefined) {
    return '0ms';
  }
  if (typeof value === 'string') {
    return value;
  }
  const nanos = Number(value);
  if (Number.isNaN(nanos)) {
    return '0ms';
  }
  const ms = nanos / 1e6;
  if (ms < 1) {
    const micros = nanos / 1e3;
    return `${micros.toFixed(1)}us`;
  }
  if (ms < 1000) {
    return `${ms.toFixed(2)}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
};

const formatNumber = (value: any): string => {
  if (value === null || value === undefined || value === '') {
    return '0';
  }
  const num = Number(value);
  if (Number.isNaN(num)) {
    return String(value);
  }
  return num.toLocaleString();
};

const formatJSON = (value: any): string => {
  if (value === undefined) {
    return '{}';
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value ?? '');
  }
};

const countPanelPayload = (value: any): number => {
  if (value === null || value === undefined) {
    return 0;
  }
  if (Array.isArray(value)) {
    return value.length;
  }
  if (typeof value === 'object') {
    return Object.keys(value).length;
  }
  return 1;
};

const normalizePanelList = (value: any): string[] => {
  if (Array.isArray(value) && value.length > 0) {
    return value.filter((panel) => typeof panel === 'string' && panel.trim()).map((panel) => panel.trim());
  }
  return [...defaultPanels];
};

const panelLabel = (panelId: string): string => {
  if (panelLabels[panelId]) {
    return panelLabels[panelId];
  }
  if (!panelId) {
    return '';
  }
  return panelId
    .replace(/[-_.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\bsql\b/i, 'SQL')
    .replace(/\b([a-z])/g, (match) => match.toUpperCase());
};

const filterObjectByKey = (data: Record<string, any>, search: string): Record<string, any> => {
  if (!search) {
    return data;
  }
  const needle = search.toLowerCase();
  const out: Record<string, any> = {};
  for (const [key, value] of Object.entries(data || {})) {
    if (key.toLowerCase().includes(needle)) {
      out[key] = value;
    }
  }
  return out;
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

const ensureArray = <T>(value: any): T[] => (Array.isArray(value) ? value : []);

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

export class DebugPanel {
  private container: HTMLElement;
  private debugPath: string;
  private panels: string[];
  private activePanel: string;
  private state: DebugState;
  private filters: PanelFilters;
  private paused = false;
  private maxLogEntries: number;
  private maxSQLQueries: number;
  private slowThresholdMs: number;
  private eventCount = 0;
  private lastEventAt: Date | null = null;
  private stream: DebugStream;
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

  constructor(container: HTMLElement) {
    this.container = container;
    const panelsData = parseJSON(container.dataset.panels);
    this.panels = normalizePanelList(panelsData);
    this.activePanel = this.panels[0] || 'template';

    this.debugPath = container.dataset.debugPath || '';
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
      requests: { method: 'all', status: 'all', search: '' },
      sql: { search: '', slowOnly: false, errorOnly: false },
      logs: { level: 'all', search: '', autoScroll: true },
      routes: { method: 'all', search: '' },
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

    this.tabsEl = this.requireElement('[data-debug-tabs]', document);
    this.panelEl = this.requireElement('[data-debug-panel]', document);
    this.filtersEl = this.requireElement('[data-debug-filters]', document);
    this.statusEl = document.querySelector('[data-debug-status]') || this.container;
    this.connectionEl = this.requireElement('[data-debug-connection]', document);
    this.eventCountEl = this.requireElement('[data-debug-events]', document);
    this.lastEventEl = this.requireElement('[data-debug-last]', document);

    this.renderTabs();
    this.renderActivePanel();
    this.bindActions();

    this.stream = new DebugStream({
      basePath: this.debugPath,
      onEvent: (event) => this.handleEvent(event),
      onStatusChange: (status) => this.updateConnectionStatus(status),
    });

    this.fetchSnapshot();
    this.stream.connect();
    this.stream.subscribe(this.panels.map((panel) => panelEventMap[panel] || panel));
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
      this.renderActivePanel();
    });

    const actions = this.container.querySelectorAll<HTMLButtonElement>('[data-debug-action]');
    actions.forEach((button) => {
      button.addEventListener('click', () => {
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
    });
  }

  private renderTabs(): void {
    const tabs = this.panels
      .map((panel) => {
        const active = panel === this.activePanel ? 'debug-tab--active' : '';
        return `
          <button class="debug-tab ${active}" data-panel="${escapeHTML(panel)}">
            <span class="debug-tab__label">${escapeHTML(panelLabel(panel))}</span>
            <span class="debug-tab__count" data-panel-count="${escapeHTML(panel)}">0</span>
          </button>
        `;
      })
      .join('');
    this.tabsEl.innerHTML = tabs;
    this.updateTabCounts();
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
    } else if (panel === 'requests') {
      const values = this.filters.requests;
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
        <div class="debug-filter debug-filter--grow">
          <label>Search</label>
          <input type="search" data-filter="search" value="${escapeHTML(values.search)}" placeholder="/admin/users" />
        </div>
      `;
    } else if (panel === 'sql') {
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
      `;
    } else if (panel === 'logs') {
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
          <input type="checkbox" data-filter="autoScroll" ${values.autoScroll ? 'checked' : ''} />
          <span>Auto-scroll</span>
        </label>
      `;
    } else if (panel === 'routes') {
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
    } else {
      const values = this.filters.objects;
      content = `
        <div class="debug-filter debug-filter--grow">
          <label>Search keys</label>
          <input type="search" data-filter="search" value="${escapeHTML(values.search)}" placeholder="token" />
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
    if (panel === 'requests') {
      const next = { ...this.filters.requests };
      inputs.forEach((input) => {
        const key = input.dataset.filter || '';
        if (key && key in next) {
          next[key as keyof typeof next] = (input as HTMLInputElement).value;
        }
      });
      this.filters.requests = next;
    } else if (panel === 'sql') {
      const next = { ...this.filters.sql };
      inputs.forEach((input) => {
        const key = input.dataset.filter || '';
        if (key === 'slowOnly' || key === 'errorOnly') {
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
        if (key === 'autoScroll') {
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

  private renderPanel(): void {
    const panel = this.activePanel;
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
    } else if (panel === 'custom') {
      content = this.renderCustom();
    } else {
      content = this.renderJSONPanel(panelLabel(panel), this.state.extra[panel], this.filters.objects.search);
    }

    this.panelEl.innerHTML = content;
    if (panel === 'logs' && this.filters.logs.autoScroll) {
      this.panelEl.scrollTop = this.panelEl.scrollHeight;
    }
    this.attachExpandableRowListeners();
  }

  private attachExpandableRowListeners(): void {
    this.panelEl.querySelectorAll('.expandable-row').forEach((row) => {
      row.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        // Don't toggle if clicking on a link or button
        if (target.closest('a, button')) return;

        const rowEl = e.currentTarget as HTMLElement;
        rowEl.classList.toggle('expanded');
      });
    });
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

  private renderRequests(): string {
    const { method, status, search } = this.filters.requests;
    const needle = search.toLowerCase();
    const entries = this.state.requests.filter((entry) => {
      if (method !== 'all' && (entry.method || '').toUpperCase() !== method) {
        return false;
      }
      if (status !== 'all' && String(entry.status || '') !== status) {
        return false;
      }
      if (needle && !(entry.path || '').toLowerCase().includes(needle)) {
        return false;
      }
      return true;
    });

    if (entries.length === 0) {
      return this.renderEmptyState('No requests captured yet.');
    }

    const rows = entries
      .map((entry) => {
        const methodClass = `badge--method-${(entry.method || 'get').toLowerCase()}`;
        const statusCode = entry.status || 0;
        const statusClass = statusCode >= 500 ? 'badge--status-error' : statusCode >= 400 ? 'badge--status-warn' : 'badge--status';
        const rowClass = statusCode >= 400 ? 'error' : '';
        const duration = entry.duration || 0;
        const durationMs = typeof duration === 'number' ? duration / 1e6 : 0;
        const durationClass = durationMs >= this.slowThresholdMs ? 'duration--slow' : '';
        return `
          <tr class="${rowClass}">
            <td><span class="badge ${methodClass}">${escapeHTML(entry.method || 'GET')}</span></td>
            <td><span class="path">${escapeHTML(entry.path || '')}</span></td>
            <td><span class="badge ${statusClass}">${escapeHTML(statusCode)}</span></td>
            <td><span class="duration ${durationClass}">${formatDuration(entry.duration)}</span></td>
            <td><span class="timestamp">${escapeHTML(formatTimestamp(entry.timestamp))}</span></td>
          </tr>
        `;
      })
      .join('');

    return `
      <table class="debug-table">
        <thead>
          <tr>
            <th>Method</th>
            <th>Path</th>
            <th>Status</th>
            <th>Duration</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  private renderSQL(): string {
    const { search, slowOnly, errorOnly } = this.filters.sql;
    const needle = search.toLowerCase();
    const entries = this.state.sql.filter((entry) => {
      if (errorOnly && !entry.error) {
        return false;
      }
      if (slowOnly && !this.isSlowQuery(entry)) {
        return false;
      }
      if (needle && !(entry.query || '').toLowerCase().includes(needle)) {
        return false;
      }
      return true;
    });

    if (entries.length === 0) {
      return this.renderEmptyState('No SQL queries captured yet.');
    }

    const rows = entries
      .map((entry, index) => {
        const isSlow = this.isSlowQuery(entry);
        const hasError = !!entry.error;
        const rowClasses = ['expandable-row'];
        if (hasError) rowClasses.push('error');
        if (isSlow) rowClasses.push('slow');
        const durationClass = isSlow ? 'duration--slow' : '';
        const rowId = `sql-row-${index}`;
        const highlightedSQL = highlightSQL(entry.query || '', true);
        return `
          <tr class="${rowClasses.join(' ')}" data-row-id="${rowId}">
            <td><span class="duration ${durationClass}">${formatDuration(entry.duration)}</span></td>
            <td>${escapeHTML(formatNumber(entry.row_count || 0))}</td>
            <td><span class="timestamp">${escapeHTML(formatTimestamp(entry.timestamp))}</span></td>
            <td>${hasError ? `<span class="badge badge--status-error">Error</span>` : ''}</td>
            <td><span class="query-text"><span class="expand-icon">&#9654;</span>${escapeHTML(entry.query || '')}</span></td>
          </tr>
          <tr class="expansion-row" data-expansion-for="${rowId}">
            <td colspan="5">
              <div class="expanded-content">
                <pre>${highlightedSQL}</pre>
              </div>
            </td>
          </tr>
        `;
      })
      .join('');

    return `
      <table class="debug-table">
        <thead>
          <tr>
            <th>Duration</th>
            <th>Rows</th>
            <th>Time</th>
            <th>Status</th>
            <th>Query</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  private renderLogs(): string {
    const { level, search } = this.filters.logs;
    const needle = search.toLowerCase();
    const entries = this.state.logs.filter((entry) => {
      if (level !== 'all' && (entry.level || '').toLowerCase() !== level) {
        return false;
      }
      const haystack = `${entry.message || ''} ${entry.source || ''} ${formatJSON(entry.fields || {})}`.toLowerCase();
      if (needle && !haystack.includes(needle)) {
        return false;
      }
      return true;
    });

    if (entries.length === 0) {
      return this.renderEmptyState('No logs captured yet.');
    }

    const rows = entries
      .map((entry) => {
        const logLevel = (entry.level || 'info').toLowerCase();
        const levelClass = `badge--level-${logLevel}`;
        const isError = logLevel === 'error' || logLevel === 'fatal';
        const rowClass = isError ? 'error' : '';
        return `
          <tr class="${rowClass}">
            <td><span class="badge ${levelClass}">${escapeHTML((entry.level || 'info').toUpperCase())}</span></td>
            <td><span class="timestamp">${escapeHTML(formatTimestamp(entry.timestamp))}</span></td>
            <td><span class="message">${escapeHTML(entry.message || '')}</span></td>
            <td><span class="timestamp">${escapeHTML(entry.source || '')}</span></td>
          </tr>
        `;
      })
      .join('');

    return `
      <table class="debug-table">
        <thead>
          <tr>
            <th>Level</th>
            <th>Time</th>
            <th>Message</th>
            <th>Source</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  private renderRoutes(): string {
    const { method, search } = this.filters.routes;
    const needle = search.toLowerCase();
    const entries = this.state.routes.filter((entry) => {
      if (method !== 'all' && (entry.method || '').toUpperCase() !== method) {
        return false;
      }
      const haystack = `${entry.path || ''} ${entry.handler || ''} ${entry.summary || ''}`.toLowerCase();
      if (needle && !haystack.includes(needle)) {
        return false;
      }
      return true;
    });

    if (entries.length === 0) {
      return this.renderEmptyState('No routes captured yet.');
    }

    const rows = entries
      .map((entry) => {
        const methodClass = `badge--method-${(entry.method || 'get').toLowerCase()}`;
        return `
          <tr>
            <td><span class="badge ${methodClass}">${escapeHTML(entry.method || '')}</span></td>
            <td><span class="path">${escapeHTML(entry.path || '')}</span></td>
            <td><span class="timestamp">${escapeHTML(entry.handler || '')}</span></td>
            <td><span class="timestamp">${escapeHTML(entry.name || '')}</span></td>
          </tr>
        `;
      })
      .join('');

    return `
      <table class="debug-table debug-routes-table">
        <thead>
          <tr>
            <th>Method</th>
            <th>Path</th>
            <th>Handler</th>
            <th>Name</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  private renderCustom(): string {
    const { search } = this.filters.custom;
    const data = filterObjectByKey(this.state.custom.data, search);
    const dataPanel = this.renderJSONPanel('Custom Data', data, '');
    const logs = this.state.custom.logs;
    const highlighted = highlightJSON(data, true);

    const logRows = logs.length
      ? logs
          .map((entry) => {
            return `
              <tr>
                <td><span class="badge badge--custom">${escapeHTML(entry.category || 'custom')}</span></td>
                <td><span class="timestamp">${escapeHTML(formatTimestamp(entry.timestamp))}</span></td>
                <td><span class="message">${escapeHTML(entry.message || '')}</span></td>
              </tr>
            `;
          })
          .join('')
      : '';

    const logPanel = logs.length
      ? `
        <table class="debug-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Time</th>
              <th>Message</th>
            </tr>
          </thead>
          <tbody>${logRows}</tbody>
        </table>
      `
      : this.renderEmptyState('No custom logs yet.');

    return `
      <div class="debug-json-grid">
        <div class="debug-json-panel">
          <div class="debug-json-header">
            <h3>Custom Data</h3>
            <span class="timestamp">${formatNumber(countPanelPayload(data))} keys</span>
          </div>
          <div class="debug-json-content">
            <pre>${highlighted}</pre>
          </div>
        </div>
        <div class="debug-json-panel">
          <div class="debug-json-header">
            <h3>Custom Logs</h3>
            <span class="timestamp">${formatNumber(logs.length)} entries</span>
          </div>
          <div class="debug-json-content">
            ${logPanel}
          </div>
        </div>
      </div>
    `;
  }

  private renderJSONPanel(title: string, data: any, search: string): string {
    const isObject = data && typeof data === 'object' && !Array.isArray(data);
    const isArray = Array.isArray(data);
    const filtered = isObject ? filterObjectByKey(data || {}, search) : data ?? {};
    const count = countPanelPayload(filtered);
    const unit = isArray ? 'items' : isObject ? 'keys' : 'entries';
    const highlighted = highlightJSON(filtered, true);
    return `
      <section class="debug-json-panel">
        <div class="debug-json-header">
          <h3>${escapeHTML(title)}</h3>
          <span class="debug-muted">${formatNumber(count)} ${unit}</span>
        </div>
        <pre>${highlighted}</pre>
      </section>
    `;
  }

  private panelCount(panel: string): number {
    switch (panel) {
      case 'template':
        return countPanelPayload(this.state.template);
      case 'session':
        return countPanelPayload(this.state.session);
      case 'requests':
        return this.state.requests.length;
      case 'sql':
        return this.state.sql.length;
      case 'logs':
        return this.state.logs.length;
      case 'config':
        return countPanelPayload(this.state.config);
      case 'routes':
        return this.state.routes.length;
      case 'custom':
        return countPanelPayload(this.state.custom.data) + this.state.custom.logs.length;
      default:
        return countPanelPayload(this.state.extra[panel]);
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
      return;
    }

    const panel = eventToPanel[event.type] || event.type;
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
        if (!knownPanels.has(panel)) {
          this.state.extra[panel] = event.payload;
        }
        break;
    }

    this.updateTabCounts();
    if (panel === this.activePanel) {
      this.renderPanel();
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

  private applySnapshot(snapshot: DebugSnapshot): void {
    const next = snapshot || {};
    this.state.template = next.template || {};
    this.state.session = next.session || {};
    this.state.requests = ensureArray<RequestEntry>(next.requests);
    this.state.sql = ensureArray<SQLEntry>(next.sql);
    this.state.logs = ensureArray<LogEntry>(next.logs);
    this.state.config = next.config || {};
    this.state.routes = ensureArray<RouteEntry>(next.routes);
    const custom = next.custom || {};
    this.state.custom = {
      data: custom.data || {},
      logs: ensureArray<CustomLogEntry>(custom.logs),
    };
    const extra: Record<string, any> = {};
    this.panels.forEach((panel) => {
      if (!knownPanels.has(panel) && panel in next) {
        extra[panel] = next[panel];
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

  private isSlowQuery(entry: SQLEntry): boolean {
    if (!entry || entry.duration === undefined || entry.duration === null) {
      return false;
    }
    const nanos = Number(entry.duration);
    if (Number.isNaN(nanos)) {
      return false;
    }
    const ms = nanos / 1e6;
    return ms >= this.slowThresholdMs;
  }

  private async fetchSnapshot(): Promise<void> {
    if (!this.debugPath) {
      return;
    }
    try {
      const response = await fetch(`${this.debugPath}/api/snapshot`, {
        credentials: 'same-origin',
      });
      if (!response.ok) {
        return;
      }
      const payload = (await response.json()) as DebugSnapshot;
      this.applySnapshot(payload);
    } catch {
      // ignore fetch errors
    }
  }

  private clearAll(): void {
    if (!this.debugPath) {
      return;
    }
    this.stream.clear();
    fetch(`${this.debugPath}/api/clear`, { method: 'POST', credentials: 'same-origin' }).catch(() => {
      // ignore
    });
  }

  private clearActivePanel(): void {
    if (!this.debugPath) {
      return;
    }
    const panel = this.activePanel;
    this.stream.clear([panel]);
    fetch(`${this.debugPath}/api/clear/${panel}`, { method: 'POST', credentials: 'same-origin' }).catch(() => {
      // ignore
    });
  }

  private togglePause(button: HTMLButtonElement): void {
    this.paused = !this.paused;
    button.textContent = this.paused ? 'Resume' : 'Pause';
    if (!this.paused) {
      this.stream.requestSnapshot();
    }
  }
}

export const initDebugPanel = (container?: HTMLElement | null): DebugPanel | null => {
  const target = container || document.querySelector<HTMLElement>('[data-debug-console]');
  if (!target) {
    return null;
  }
  return new DebugPanel(target);
};
