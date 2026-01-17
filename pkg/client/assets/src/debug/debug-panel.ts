import { DebugStream, type DebugEvent, type DebugStreamStatus } from './debug-stream.js';
import { DebugReplPanel, type DebugReplCommand } from './repl/repl-panel.js';
import { filterObjectBySearch } from './shared/jsonpath-search.js';
import type {
  RequestEntry,
  SQLEntry,
  LogEntry,
  RouteEntry,
  CustomLogEntry,
  DebugSnapshot,
} from './shared/types.js';
import {
  escapeHTML,
  formatJSON,
  formatNumber,
  countPayload,
  isSlowDuration,
  ensureArray,
} from './shared/utils.js';
import {
  attachCopyListeners,
  attachExpandableRowListeners,
} from './shared/interactions.js';
import { consoleStyles } from './shared/styles.js';
import {
  renderRequestsPanel,
  renderSQLPanel,
  renderLogsPanel,
  renderRoutesPanel,
  renderJSONPanel as renderSharedJSONPanel,
  renderCustomPanel,
} from './shared/panels/index.js';

type DebugReplCommandPayload = {
  command?: string;
  description?: string;
  tags?: string[];
  aliases?: string[];
  mutates?: boolean;
  read_only?: boolean;
};

type PanelFilters = {
  requests: { method: string; status: string; search: string; newestFirst: boolean };
  sql: { search: string; slowOnly: boolean; errorOnly: boolean; newestFirst: boolean };
  logs: { level: string; search: string; autoScroll: boolean; newestFirst: boolean };
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
      requests: { method: 'all', status: 'all', search: '', newestFirst: true },
      sql: { search: '', slowOnly: false, errorOnly: false, newestFirst: true },
      logs: { level: 'all', search: '', autoScroll: true, newestFirst: true },
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
        <label class="debug-btn">
          <input type="checkbox" data-filter="newestFirst" ${values.newestFirst ? 'checked' : ''} />
          <span>Newest first</span>
        </label>
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
        <label class="debug-btn">
          <input type="checkbox" data-filter="newestFirst" ${values.newestFirst ? 'checked' : ''} />
          <span>Newest first</span>
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
          <input type="checkbox" data-filter="newestFirst" ${values.newestFirst ? 'checked' : ''} />
          <span>Newest first</span>
        </label>
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
    if (panel === 'requests') {
      const next = { ...this.filters.requests };
      inputs.forEach((input) => {
        const key = input.dataset.filter || '';
        if (key === 'newestFirst') {
          next[key] = (input as HTMLInputElement).checked;
        } else if (key && key in next) {
          next[key as 'method' | 'status' | 'search'] = (input as HTMLInputElement).value;
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
      // When newestFirst is true, newest entries are at the top, so scroll to top
      // When newestFirst is false, newest entries are at the bottom, so scroll to bottom
      this.panelEl.scrollTop = this.filters.logs.newestFirst ? 0 : this.panelEl.scrollHeight;
    }
    this.attachExpandableRowListeners();
    this.attachCopyButtonListeners();
  }

  private attachExpandableRowListeners(): void {
    // Use shared helper for expandable row behavior
    attachExpandableRowListeners(this.panelEl);
  }

  private attachCopyButtonListeners(): void {
    // Use shared helper for copy-to-clipboard behavior (console style with icon feedback)
    attachCopyListeners(this.panelEl, { useIconFeedback: true });
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
    const { method, status, search, newestFirst } = this.filters.requests;
    const needle = search.toLowerCase();

    // Apply console-specific filters
    const filtered = this.state.requests.filter((entry) => {
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

    if (filtered.length === 0) {
      return this.renderEmptyState('No requests captured yet.');
    }

    // Use shared renderer with console-specific options
    return renderRequestsPanel(filtered, consoleStyles, {
      newestFirst,
      slowThresholdMs: this.slowThresholdMs,
      showSortToggle: false, // Console has filter bar, not inline toggle
      truncatePath: false, // Console shows full paths
    });
  }

  private renderSQL(): string {
    const { search, slowOnly, errorOnly, newestFirst } = this.filters.sql;
    const needle = search.toLowerCase();

    // Apply console-specific filters
    const filtered = this.state.sql.filter((entry) => {
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

  private renderLogs(): string {
    const { level, search, newestFirst } = this.filters.logs;
    const needle = search.toLowerCase();

    // Apply console-specific filters
    const filtered = this.state.logs.filter((entry) => {
      if (level !== 'all' && (entry.level || '').toLowerCase() !== level) {
        return false;
      }
      const haystack = `${entry.message || ''} ${entry.source || ''} ${formatJSON(entry.fields || {})}`.toLowerCase();
      if (needle && !haystack.includes(needle)) {
        return false;
      }
      return true;
    });

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

  private panelCount(panel: string): number {
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
    return isSlowDuration(entry?.duration, this.slowThresholdMs);
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
