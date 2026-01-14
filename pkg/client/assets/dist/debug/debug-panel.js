import { DebugStream } from './debug-stream.js';
const defaultPanels = ['template', 'session', 'requests', 'sql', 'logs', 'config', 'routes', 'custom'];
const panelLabels = {
  template: 'Template',
  session: 'Session',
  requests: 'Requests',
  sql: 'SQL Queries',
  logs: 'Logs',
  config: 'Config',
  routes: 'Routes',
  custom: 'Custom'
};
const panelEventMap = {
  template: 'template',
  session: 'session',
  requests: 'request',
  sql: 'sql',
  logs: 'log',
  custom: 'custom'
};
const eventToPanel = {
  request: 'requests',
  sql: 'sql',
  log: 'logs',
  template: 'template',
  session: 'session',
  custom: 'custom'
};
const parseJSON = (value) => {
  if (!value) {
    return null;
  }
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};
const escapeHTML = (value) => {
  const str = String(value ?? '');
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
};
const formatTimestamp = (value) => {
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
const formatDuration = (value) => {
  if (value === null || value === void 0) {
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
const formatNumber = (value) => {
  if (value === null || value === void 0 || value === '') {
    return '0';
  }
  const num = Number(value);
  if (Number.isNaN(num)) {
    return String(value);
  }
  return num.toLocaleString();
};
const formatJSON = (value) => {
  if (value === void 0) {
    return '{}';
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value ?? '');
  }
};
const normalizePanelList = (value) => {
  if (Array.isArray(value) && value.length > 0) {
    return value.filter((panel) => typeof panel === 'string' && panel.trim()).map((panel) => panel.trim());
  }
  return [...defaultPanels];
};
const panelLabel = (panelId) => {
  if (panelLabels[panelId]) {
    return panelLabels[panelId];
  }
  if (!panelId) {
    return '';
  }
  return panelId.replace(/[-_.]/g, ' ').replace(/\s+/g, ' ').trim().replace(/\bsql\b/i, 'SQL').replace(/\b([a-z])/g, (match) => match.toUpperCase());
};
const filterObjectByKey = (data, search) => {
  if (!search) {
    return data;
  }
  const needle = search.toLowerCase();
  const out = {};
  for (const [key, value] of Object.entries(data || {})) {
    if (key.toLowerCase().includes(needle)) {
      out[key] = value;
    }
  }
  return out;
};
const setNestedValue = (dest, key, value) => {
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
const ensureArray = (value) => Array.isArray(value) ? value : [];
const parseNumber = (value, fallback) => {
  if (!value) {
    return fallback;
  }
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    return fallback;
  }
  return parsed;
};
class DebugPanel {
  constructor(container) {
    this.paused = false;
    this.eventCount = 0;
    this.lastEventAt = null;
    this.container = container;
    const panelsData = parseJSON(container.dataset.panels);
    this.panels = normalizePanelList(panelsData);
    this.activePanel = this.panels[0] || 'template';
    this.debugPath = container.dataset.debugPath || '';
    this.maxLogEntries = parseNumber(container.dataset.maxLogEntries, 500);
    this.maxSQLQueries = parseNumber(container.dataset.maxSqlQueries, 200);
    this.slowThresholdMs = parseNumber(container.dataset.slowThresholdMs, 50);
    this.state = {
      template: {},
      session: {},
      requests: [],
      sql: [],
      logs: [],
      config: {},
      routes: [],
      custom: { data: {}, logs: [] }
    };
    this.filters = {
      requests: { method: 'all', status: 'all', search: '' },
      sql: { search: '', slowOnly: false, errorOnly: false },
      logs: { level: 'all', search: '', autoScroll: true },
      routes: { method: 'all', search: '' },
      custom: { search: '' },
      objects: { search: '' }
    };
    this.tabsEl = this.requireElement('[data-debug-tabs]');
    this.panelEl = this.requireElement('[data-debug-panel]');
    this.filtersEl = this.requireElement('[data-debug-filters]');
    this.statusEl = this.requireElement('[data-debug-status]');
    this.connectionEl = this.requireElement('[data-debug-connection]');
    this.eventCountEl = this.requireElement('[data-debug-events]');
    this.lastEventEl = this.requireElement('[data-debug-last]');
    this.renderTabs();
    this.renderActivePanel();
    this.bindActions();
    this.stream = new DebugStream({
      basePath: this.debugPath,
      onEvent: (event) => this.handleEvent(event),
      onStatusChange: (status) => this.updateConnectionStatus(status)
    });
    this.fetchSnapshot();
    this.stream.connect();
    this.stream.subscribe(this.panels.map((panel) => panelEventMap[panel] || panel));
  }
  requireElement(selector) {
    const el = this.container.querySelector(selector);
    if (!el) {
      throw new Error(`Missing debug element: ${selector}`);
    }
    return el;
  }
  bindActions() {
    this.tabsEl.addEventListener('click', (event) => {
      const target = event.target;
      if (!target) {
        return;
      }
      const button = target.closest('[data-panel]');
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
    const actions = this.container.querySelectorAll('[data-debug-action]');
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
  renderTabs() {
    const tabs = this.panels.map((panel) => {
      const active = panel === this.activePanel ? 'debug-tab--active' : '';
      return `
          <button class="debug-tab ${active}" data-panel="${escapeHTML(panel)}">
            <span class="debug-tab__label">${escapeHTML(panelLabel(panel))}</span>
            <span class="debug-tab__count" data-panel-count="${escapeHTML(panel)}">0</span>
          </button>
        `;
    }).join('');
    this.tabsEl.innerHTML = tabs;
    this.updateTabCounts();
  }
  renderActivePanel() {
    this.renderTabs();
    this.renderFilters();
    this.renderPanel();
  }
  renderFilters() {
    const panel = this.activePanel;
    let content = '';
    if (panel === 'requests') {
      const values = this.filters.requests;
      content = `
        <div class="debug-filter-group">
          <label>Method</label>
          <select data-filter="method">
            ${this.renderSelectOptions(['all', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE'], values.method)}
          </select>
        </div>
        <div class="debug-filter-group">
          <label>Status</label>
          <select data-filter="status">
            ${this.renderSelectOptions(['all', '200', '201', '204', '400', '401', '403', '404', '500'], values.status)}
          </select>
        </div>
        <div class="debug-filter-group grow">
          <label>Search</label>
          <input type="search" data-filter="search" value="${escapeHTML(values.search)}" placeholder="/admin/users" />
        </div>
      `;
    } else if (panel === 'sql') {
      const values = this.filters.sql;
      content = `
        <div class="debug-filter-group grow">
          <label>Search</label>
          <input type="search" data-filter="search" value="${escapeHTML(values.search)}" placeholder="SELECT" />
        </div>
        <label class="debug-toggle">
          <input type="checkbox" data-filter="slowOnly" ${values.slowOnly ? 'checked' : ''} />
          <span>Slow only</span>
        </label>
        <label class="debug-toggle">
          <input type="checkbox" data-filter="errorOnly" ${values.errorOnly ? 'checked' : ''} />
          <span>Errors</span>
        </label>
      `;
    } else if (panel === 'logs') {
      const values = this.filters.logs;
      content = `
        <div class="debug-filter-group">
          <label>Level</label>
          <select data-filter="level">
            ${this.renderSelectOptions(['all', 'debug', 'info', 'warn', 'error'], values.level)}
          </select>
        </div>
        <div class="debug-filter-group grow">
          <label>Search</label>
          <input type="search" data-filter="search" value="${escapeHTML(values.search)}" placeholder="database" />
        </div>
        <label class="debug-toggle">
          <input type="checkbox" data-filter="autoScroll" ${values.autoScroll ? 'checked' : ''} />
          <span>Auto-scroll</span>
        </label>
      `;
    } else if (panel === 'routes') {
      const values = this.filters.routes;
      content = `
        <div class="debug-filter-group">
          <label>Method</label>
          <select data-filter="method">
            ${this.renderSelectOptions(['all', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE'], values.method)}
          </select>
        </div>
        <div class="debug-filter-group grow">
          <label>Search</label>
          <input type="search" data-filter="search" value="${escapeHTML(values.search)}" placeholder="/admin" />
        </div>
      `;
    } else {
      const values = this.filters.objects;
      content = `
        <div class="debug-filter-group grow">
          <label>Search keys</label>
          <input type="search" data-filter="search" value="${escapeHTML(values.search)}" placeholder="token" />
        </div>
      `;
    }
    this.filtersEl.innerHTML = content || '<span class="debug-muted">No filters</span>';
    this.bindFilterInputs();
  }
  bindFilterInputs() {
    const inputs = this.filtersEl.querySelectorAll('input, select');
    inputs.forEach((input) => {
      input.addEventListener('input', () => this.updateFiltersFromInputs());
      input.addEventListener('change', () => this.updateFiltersFromInputs());
    });
  }
  updateFiltersFromInputs() {
    const panel = this.activePanel;
    const inputs = this.filtersEl.querySelectorAll('[data-filter]');
    if (panel === 'requests') {
      const next = { ...this.filters.requests };
      inputs.forEach((input) => {
        const key = input.dataset.filter || '';
        if (key && key in next) {
          next[key] = input.value;
        }
      });
      this.filters.requests = next;
    } else if (panel === 'sql') {
      const next = { ...this.filters.sql };
      inputs.forEach((input) => {
        const key = input.dataset.filter || '';
        if (key === 'slowOnly' || key === 'errorOnly') {
          next[key] = input.checked;
        } else if (key && key in next) {
          next[key] = input.value;
        }
      });
      this.filters.sql = next;
    } else if (panel === 'logs') {
      const next = { ...this.filters.logs };
      inputs.forEach((input) => {
        const key = input.dataset.filter || '';
        if (key === 'autoScroll') {
          next[key] = input.checked;
        } else if (key && key in next) {
          next[key] = input.value;
        }
      });
      this.filters.logs = next;
    } else if (panel === 'routes') {
      const next = { ...this.filters.routes };
      inputs.forEach((input) => {
        const key = input.dataset.filter || '';
        if (key && key in next) {
          next[key] = input.value;
        }
      });
      this.filters.routes = next;
    } else {
      const next = { ...this.filters.objects };
      inputs.forEach((input) => {
        const key = input.dataset.filter || '';
        if (key && key in next) {
          next[key] = input.value;
        }
      });
      this.filters.objects = next;
    }
    this.renderPanel();
  }
  renderPanel() {
    const panel = this.activePanel;
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
      content = this.renderJSONPanel(panelLabel(panel), this.state[panel] || {}, this.filters.objects.search);
    }
    this.panelEl.innerHTML = content;
    if (panel === 'logs' && this.filters.logs.autoScroll) {
      this.panelEl.scrollTop = this.panelEl.scrollHeight;
    }
  }
  renderRequests() {
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
    const rows = entries.map((entry) => {
      const headers = entry.headers ? formatJSON(entry.headers) : '{}';
      const query = entry.query ? formatJSON(entry.query) : '{}';
      return `
          <article class="debug-card">
            <div class="debug-card__row">
              <span class="debug-badge debug-badge--method">${escapeHTML(entry.method || 'GET')}</span>
              <span class="debug-card__path">${escapeHTML(entry.path || '')}</span>
              <span class="debug-badge debug-badge--status">${escapeHTML(entry.status || 0)}</span>
              <span class="debug-card__meta">${formatDuration(entry.duration)}</span>
              <span class="debug-card__meta">${escapeHTML(formatTimestamp(entry.timestamp))}</span>
            </div>
            <details class="debug-card__details">
              <summary>Details</summary>
              ${entry.error ? `<div class="debug-card__error">${escapeHTML(entry.error)}</div>` : ''}
              <div class="debug-card__grid">
                <div>
                  <h4>Query</h4>
                  <pre>${escapeHTML(query)}</pre>
                </div>
                <div>
                  <h4>Headers</h4>
                  <pre>${escapeHTML(headers)}</pre>
                </div>
              </div>
            </details>
          </article>
        `;
    }).join('');
    return `<div class="debug-stack">${rows}</div>`;
  }
  renderSQL() {
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
    const rows = entries.map((entry) => {
      const isSlow = this.isSlowQuery(entry);
      const args = entry.args ? formatJSON(entry.args) : '[]';
      return `
          <article class="debug-card ${isSlow ? 'debug-card--slow' : ''}">
            <div class="debug-card__row">
              <span class="debug-badge debug-badge--sql">SQL</span>
              <span class="debug-card__meta">${escapeHTML(formatTimestamp(entry.timestamp))}</span>
              <span class="debug-card__meta">${formatDuration(entry.duration)}</span>
              <span class="debug-card__meta">Rows: ${escapeHTML(formatNumber(entry.row_count || 0))}</span>
              ${entry.error ? `<span class="debug-badge debug-badge--error">Error</span>` : ''}
            </div>
            <pre class="debug-code">${escapeHTML(entry.query || '')}</pre>
            <div class="debug-card__grid">
              <div>
                <h4>Args</h4>
                <pre>${escapeHTML(args)}</pre>
              </div>
              ${entry.error ? `<div><h4>Error</h4><pre>${escapeHTML(entry.error)}</pre></div>` : ''}
            </div>
          </article>
        `;
    }).join('');
    return `<div class="debug-stack">${rows}</div>`;
  }
  renderLogs() {
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
    const rows = entries.map((entry) => {
      return `
          <article class="debug-card">
            <div class="debug-card__row">
              <span class="debug-badge debug-badge--level">${escapeHTML((entry.level || 'info').toUpperCase())}</span>
              <span class="debug-card__meta">${escapeHTML(formatTimestamp(entry.timestamp))}</span>
              <span class="debug-card__path">${escapeHTML(entry.message || '')}</span>
            </div>
            <div class="debug-card__grid">
              ${entry.source ? `<div><h4>Source</h4><pre>${escapeHTML(entry.source)}</pre></div>` : ''}
              ${entry.fields ? `<div><h4>Fields</h4><pre>${escapeHTML(formatJSON(entry.fields))}</pre></div>` : ''}
            </div>
          </article>
        `;
    }).join('');
    return `<div class="debug-stack">${rows}</div>`;
  }
  renderRoutes() {
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
    const rows = entries.map((entry) => {
      return `
          <article class="debug-card">
            <div class="debug-card__row">
              <span class="debug-badge debug-badge--method">${escapeHTML(entry.method || '')}</span>
              <span class="debug-card__path">${escapeHTML(entry.path || '')}</span>
              ${entry.handler ? `<span class="debug-card__meta">${escapeHTML(entry.handler)}</span>` : ''}
            </div>
            <div class="debug-card__grid">
              ${entry.summary ? `<div><h4>Summary</h4><pre>${escapeHTML(entry.summary)}</pre></div>` : ''}
              ${entry.middleware && entry.middleware.length > 0 ? `<div><h4>Middleware</h4><pre>${escapeHTML(formatJSON(entry.middleware))}</pre></div>` : ''}
              ${entry.tags && entry.tags.length > 0 ? `<div><h4>Tags</h4><pre>${escapeHTML(formatJSON(entry.tags))}</pre></div>` : ''}
            </div>
          </article>
        `;
    }).join('');
    return `<div class="debug-stack">${rows}</div>`;
  }
  renderCustom() {
    const { search } = this.filters.custom;
    const data = filterObjectByKey(this.state.custom.data, search);
    const dataPanel = this.renderJSONPanel('Custom Data', data, '');
    const logs = this.state.custom.logs;
    const logPanel = logs.length ? `
        <div class="debug-stack">
          ${logs.map((entry) => {
      return `
                <article class="debug-card">
                  <div class="debug-card__row">
                    <span class="debug-badge debug-badge--custom">${escapeHTML(entry.category || 'custom')}</span>
                    <span class="debug-card__meta">${escapeHTML(formatTimestamp(entry.timestamp))}</span>
                    <span class="debug-card__path">${escapeHTML(entry.message || '')}</span>
                  </div>
                  ${entry.fields ? `<pre>${escapeHTML(formatJSON(entry.fields))}</pre>` : ''}
                </article>
              `;
    }).join('')}
        </div>
      ` : this.renderEmptyState('No custom logs yet.');
    return `
      <div class="debug-grid">
        <section>
          <h3 class="debug-section-title">Custom Data</h3>
          ${dataPanel}
        </section>
        <section>
          <h3 class="debug-section-title">Custom Logs</h3>
          ${logPanel}
        </section>
      </div>
    `;
  }
  renderJSONPanel(title, data, search) {
    const filtered = filterObjectByKey(data || {}, search);
    return `
      <section class="debug-json-panel">
        <div class="debug-json-header">
          <h3>${escapeHTML(title)}</h3>
          <span class="debug-muted">${formatNumber(Object.keys(filtered || {}).length)} keys</span>
        </div>
        <pre>${escapeHTML(formatJSON(filtered))}</pre>
      </section>
    `;
  }
  renderEmptyState(message) {
    return `
      <div class="debug-empty">
        <p>${escapeHTML(message)}</p>
      </div>
    `;
  }
  renderSelectOptions(options, current) {
    return options.map((option) => {
      const selected = option.toLowerCase() === current.toLowerCase() ? 'selected' : '';
      return `<option value="${escapeHTML(option)}" ${selected}>${escapeHTML(option)}</option>`;
    }).join('');
  }
  updateTabCounts() {
    const counts = {
      template: Object.keys(this.state.template || {}).length,
      session: Object.keys(this.state.session || {}).length,
      requests: this.state.requests.length,
      sql: this.state.sql.length,
      logs: this.state.logs.length,
      config: Object.keys(this.state.config || {}).length,
      routes: this.state.routes.length,
      custom: Object.keys(this.state.custom.data || {}).length + this.state.custom.logs.length
    };
    Object.entries(counts).forEach(([panel, count]) => {
      const badge = this.tabsEl.querySelector(`[data-panel-count="${panel}"]`);
      if (badge) {
        badge.textContent = formatNumber(count);
      }
    });
  }
  updateConnectionStatus(status) {
    this.connectionEl.textContent = status;
    this.statusEl.setAttribute('data-status', status);
  }
  updateStatusMeta() {
    this.eventCountEl.textContent = `${formatNumber(this.eventCount)} events`;
    if (this.lastEventAt) {
      this.lastEventEl.textContent = this.lastEventAt.toLocaleTimeString();
    }
  }
  handleEvent(event) {
    if (!event || !event.type) {
      return;
    }
    if (event.type === 'snapshot') {
      this.applySnapshot(event.payload);
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
        this.state.requests.push(event.payload);
        this.trim(this.state.requests, this.maxLogEntries);
        break;
      case 'sql':
        this.state.sql.push(event.payload);
        this.trim(this.state.sql, this.maxSQLQueries);
        break;
      case 'log':
        this.state.logs.push(event.payload);
        this.trim(this.state.logs, this.maxLogEntries);
        break;
      case 'template':
        this.state.template = event.payload || {};
        break;
      case 'session':
        this.state.session = event.payload || {};
        break;
      case 'custom':
        this.handleCustomEvent(event.payload);
        break;
      default:
        break;
    }
    this.updateTabCounts();
    if (panel === this.activePanel) {
      this.renderPanel();
    }
  }
  handleCustomEvent(payload) {
    if (!payload) {
      return;
    }
    if (typeof payload === 'object' && 'key' in payload && 'value' in payload) {
      setNestedValue(this.state.custom.data, String(payload.key), payload.value);
      return;
    }
    if (typeof payload === 'object' && ('category' in payload || 'message' in payload)) {
      this.state.custom.logs.push(payload);
      this.trim(this.state.custom.logs, this.maxLogEntries);
      return;
    }
  }
  applySnapshot(snapshot) {
    const next = snapshot || {};
    this.state.template = next.template || {};
    this.state.session = next.session || {};
    this.state.requests = ensureArray(next.requests);
    this.state.sql = ensureArray(next.sql);
    this.state.logs = ensureArray(next.logs);
    this.state.config = next.config || {};
    this.state.routes = ensureArray(next.routes);
    const custom = next.custom || {};
    this.state.custom = {
      data: custom.data || {},
      logs: ensureArray(custom.logs)
    };
    this.updateTabCounts();
    this.renderPanel();
  }
  trim(list, max) {
    if (!Array.isArray(list) || max <= 0) {
      return;
    }
    while (list.length > max) {
      list.shift();
    }
  }
  isSlowQuery(entry) {
    if (!entry || entry.duration === void 0 || entry.duration === null) {
      return false;
    }
    const nanos = Number(entry.duration);
    if (Number.isNaN(nanos)) {
      return false;
    }
    const ms = nanos / 1e6;
    return ms >= this.slowThresholdMs;
  }
  async fetchSnapshot() {
    if (!this.debugPath) {
      return;
    }
    try {
      const response = await fetch(`${this.debugPath}/api/snapshot`, {
        credentials: 'same-origin'
      });
      if (!response.ok) {
        return;
      }
      const payload = await response.json();
      this.applySnapshot(payload);
    } catch {
    }
  }
  clearAll() {
    if (!this.debugPath) {
      return;
    }
    this.stream.clear();
    fetch(`${this.debugPath}/api/clear`, { method: 'POST', credentials: 'same-origin' }).catch(() => {
    });
  }
  clearActivePanel() {
    if (!this.debugPath) {
      return;
    }
    const panel = this.activePanel;
    this.stream.clear([panel]);
    fetch(`${this.debugPath}/api/clear/${panel}`, { method: 'POST', credentials: 'same-origin' }).catch(() => {
    });
  }
  togglePause(button) {
    this.paused = !this.paused;
    button.textContent = this.paused ? 'Resume' : 'Pause';
    if (!this.paused) {
      this.stream.requestSnapshot();
    }
  }
}
const initDebugPanel = (container) => {
  const target = container || document.querySelector('[data-debug-console]');
  if (!target) {
    return null;
  }
  return new DebugPanel(target);
};
export {
  DebugPanel,
  initDebugPanel
};
