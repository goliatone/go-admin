const $ = (a) => {
  const e = (a || "").trim();
  return e ? e.startsWith("/") ? e.replace(/\/+$/, "") : `/${e.replace(/\/+$/, "")}` : "";
}, E = (a) => {
  const e = window.location.protocol === "https:" ? "wss:" : "ws:", t = $(a);
  return `${e}//${window.location.host}${t}/ws`;
};
class q {
  constructor(e) {
    this.ws = null, this.reconnectTimer = null, this.reconnectAttempts = 0, this.manualClose = !1, this.pendingCommands = [], this.status = "disconnected", this.options = e;
  }
  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING))
      return;
    this.manualClose = !1;
    const e = E(this.options.basePath);
    this.ws = new WebSocket(e), this.ws.onopen = () => {
      this.reconnectAttempts = 0, this.setStatus("connected"), this.flushPending();
    }, this.ws.onmessage = (t) => {
      if (!(!t || typeof t.data != "string"))
        try {
          const s = JSON.parse(t.data);
          this.options.onEvent?.(s);
        } catch {
        }
    }, this.ws.onclose = () => {
      if (this.ws = null, this.manualClose) {
        this.setStatus("disconnected");
        return;
      }
      this.setStatus("reconnecting"), this.scheduleReconnect();
    }, this.ws.onerror = (t) => {
      this.options.onError?.(t), this.setStatus("error");
    };
  }
  close() {
    this.manualClose = !0, this.reconnectTimer !== null && (window.clearTimeout(this.reconnectTimer), this.reconnectTimer = null), this.ws && this.ws.close();
  }
  sendCommand(e) {
    if (!(!e || !e.type)) {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(e));
        return;
      }
      this.pendingCommands.push(e);
    }
  }
  subscribe(e) {
    this.sendCommand({ type: "subscribe", panels: e });
  }
  unsubscribe(e) {
    this.sendCommand({ type: "unsubscribe", panels: e });
  }
  requestSnapshot() {
    this.sendCommand({ type: "snapshot" });
  }
  clear(e) {
    this.sendCommand({ type: "clear", panels: e });
  }
  getStatus() {
    return this.status;
  }
  setStatus(e) {
    this.status !== e && (this.status = e, this.options.onStatusChange?.(e));
  }
  flushPending() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || this.pendingCommands.length === 0)
      return;
    const e = [...this.pendingCommands];
    this.pendingCommands = [];
    for (const t of e)
      this.ws.send(JSON.stringify(t));
  }
  scheduleReconnect() {
    const e = this.options.maxReconnectAttempts ?? 8, t = this.options.reconnectDelayMs ?? 1e3, s = this.options.maxReconnectDelayMs ?? 12e3;
    if (this.reconnectAttempts >= e) {
      this.setStatus("disconnected");
      return;
    }
    const r = this.reconnectAttempts, i = Math.min(t * Math.pow(2, r), s), n = i * (0.2 + Math.random() * 0.3);
    this.reconnectAttempts += 1, this.reconnectTimer = window.setTimeout(() => {
      this.connect();
    }, i + n);
  }
}
const y = ["template", "session", "requests", "sql", "logs", "config", "routes", "custom"], f = {
  template: "Template",
  session: "Session",
  requests: "Requests",
  sql: "SQL Queries",
  logs: "Logs",
  config: "Config",
  routes: "Routes",
  custom: "Custom"
}, C = {
  template: "template",
  session: "session",
  requests: "request",
  sql: "sql",
  logs: "log",
  custom: "custom"
}, P = {
  request: "requests",
  sql: "sql",
  log: "logs",
  template: "template",
  session: "session",
  custom: "custom"
}, L = (a) => {
  if (!a)
    return null;
  try {
    return JSON.parse(a);
  } catch {
    return null;
  }
}, l = (a) => String(a ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;"), d = (a) => {
  if (!a)
    return "";
  if (typeof a == "number")
    return new Date(a).toLocaleTimeString();
  if (typeof a == "string") {
    const e = new Date(a);
    return Number.isNaN(e.getTime()) ? a : e.toLocaleTimeString();
  }
  return "";
}, b = (a) => {
  if (a == null)
    return "0ms";
  if (typeof a == "string")
    return a;
  const e = Number(a);
  if (Number.isNaN(e))
    return "0ms";
  const t = e / 1e6;
  return t < 1 ? `${(e / 1e3).toFixed(1)}us` : t < 1e3 ? `${t.toFixed(2)}ms` : `${(t / 1e3).toFixed(2)}s`;
}, h = (a) => {
  if (a == null || a === "")
    return "0";
  const e = Number(a);
  return Number.isNaN(e) ? String(a) : e.toLocaleString();
}, c = (a) => {
  if (a === void 0)
    return "{}";
  try {
    return JSON.stringify(a, null, 2);
  } catch {
    return String(a ?? "");
  }
}, _ = (a) => Array.isArray(a) && a.length > 0 ? a.filter((e) => typeof e == "string" && e.trim()).map((e) => e.trim()) : [...y], v = (a) => f[a] ? f[a] : a ? a.replace(/[-_.]/g, " ").replace(/\s+/g, " ").trim().replace(/\bsql\b/i, "SQL").replace(/\b([a-z])/g, (e) => e.toUpperCase()) : "", S = (a, e) => {
  if (!e)
    return a;
  const t = e.toLowerCase(), s = {};
  for (const [r, i] of Object.entries(a || {}))
    r.toLowerCase().includes(t) && (s[r] = i);
  return s;
}, k = (a, e, t) => {
  if (!a || !e)
    return;
  const s = e.split(".").map((i) => i.trim()).filter(Boolean);
  if (s.length === 0)
    return;
  let r = a;
  for (let i = 0; i < s.length - 1; i += 1) {
    const n = s[i];
    (!r[n] || typeof r[n] != "object") && (r[n] = {}), r = r[n];
  }
  r[s[s.length - 1]] = t;
}, u = (a) => Array.isArray(a) ? a : [], m = (a, e) => {
  if (!a)
    return e;
  const t = Number(a);
  return Number.isNaN(t) ? e : t;
};
class N {
  constructor(e) {
    this.paused = !1, this.eventCount = 0, this.lastEventAt = null, this.container = e;
    const t = L(e.dataset.panels);
    this.panels = _(t), this.activePanel = this.panels[0] || "template", this.debugPath = e.dataset.debugPath || "", this.maxLogEntries = m(e.dataset.maxLogEntries, 500), this.maxSQLQueries = m(e.dataset.maxSqlQueries, 200), this.slowThresholdMs = m(e.dataset.slowThresholdMs, 50), this.state = {
      template: {},
      session: {},
      requests: [],
      sql: [],
      logs: [],
      config: {},
      routes: [],
      custom: { data: {}, logs: [] }
    }, this.filters = {
      requests: { method: "all", status: "all", search: "" },
      sql: { search: "", slowOnly: !1, errorOnly: !1 },
      logs: { level: "all", search: "", autoScroll: !0 },
      routes: { method: "all", search: "" },
      custom: { search: "" },
      objects: { search: "" }
    }, this.tabsEl = this.requireElement("[data-debug-tabs]"), this.panelEl = this.requireElement("[data-debug-panel]"), this.filtersEl = this.requireElement("[data-debug-filters]"), this.statusEl = this.requireElement("[data-debug-status]"), this.connectionEl = this.requireElement("[data-debug-connection]"), this.eventCountEl = this.requireElement("[data-debug-events]"), this.lastEventEl = this.requireElement("[data-debug-last]"), this.renderTabs(), this.renderActivePanel(), this.bindActions(), this.stream = new q({
      basePath: this.debugPath,
      onEvent: (s) => this.handleEvent(s),
      onStatusChange: (s) => this.updateConnectionStatus(s)
    }), this.fetchSnapshot(), this.stream.connect(), this.stream.subscribe(this.panels.map((s) => C[s] || s));
  }
  requireElement(e) {
    const t = this.container.querySelector(e);
    if (!t)
      throw new Error(`Missing debug element: ${e}`);
    return t;
  }
  bindActions() {
    this.tabsEl.addEventListener("click", (t) => {
      const s = t.target;
      if (!s)
        return;
      const r = s.closest("[data-panel]");
      if (!r)
        return;
      const i = r.dataset.panel || "";
      !i || i === this.activePanel || (this.activePanel = i, this.renderActivePanel());
    }), this.container.querySelectorAll("[data-debug-action]").forEach((t) => {
      t.addEventListener("click", () => {
        switch (t.dataset.debugAction || "") {
          case "snapshot":
            this.stream.requestSnapshot();
            break;
          case "clear":
            this.clearAll();
            break;
          case "pause":
            this.togglePause(t);
            break;
          case "clear-panel":
            this.clearActivePanel();
            break;
        }
      });
    });
  }
  renderTabs() {
    const e = this.panels.map((t) => `
          <button class="debug-tab ${t === this.activePanel ? "debug-tab--active" : ""}" data-panel="${l(t)}">
            <span class="debug-tab__label">${l(v(t))}</span>
            <span class="debug-tab__count" data-panel-count="${l(t)}">0</span>
          </button>
        `).join("");
    this.tabsEl.innerHTML = e, this.updateTabCounts();
  }
  renderActivePanel() {
    this.renderTabs(), this.renderFilters(), this.renderPanel();
  }
  renderFilters() {
    const e = this.activePanel;
    let t = "";
    if (e === "requests") {
      const s = this.filters.requests;
      t = `
        <div class="debug-filter-group">
          <label>Method</label>
          <select data-filter="method">
            ${this.renderSelectOptions(["all", "GET", "POST", "PUT", "PATCH", "DELETE"], s.method)}
          </select>
        </div>
        <div class="debug-filter-group">
          <label>Status</label>
          <select data-filter="status">
            ${this.renderSelectOptions(["all", "200", "201", "204", "400", "401", "403", "404", "500"], s.status)}
          </select>
        </div>
        <div class="debug-filter-group grow">
          <label>Search</label>
          <input type="search" data-filter="search" value="${l(s.search)}" placeholder="/admin/users" />
        </div>
      `;
    } else if (e === "sql") {
      const s = this.filters.sql;
      t = `
        <div class="debug-filter-group grow">
          <label>Search</label>
          <input type="search" data-filter="search" value="${l(s.search)}" placeholder="SELECT" />
        </div>
        <label class="debug-toggle">
          <input type="checkbox" data-filter="slowOnly" ${s.slowOnly ? "checked" : ""} />
          <span>Slow only</span>
        </label>
        <label class="debug-toggle">
          <input type="checkbox" data-filter="errorOnly" ${s.errorOnly ? "checked" : ""} />
          <span>Errors</span>
        </label>
      `;
    } else if (e === "logs") {
      const s = this.filters.logs;
      t = `
        <div class="debug-filter-group">
          <label>Level</label>
          <select data-filter="level">
            ${this.renderSelectOptions(["all", "debug", "info", "warn", "error"], s.level)}
          </select>
        </div>
        <div class="debug-filter-group grow">
          <label>Search</label>
          <input type="search" data-filter="search" value="${l(s.search)}" placeholder="database" />
        </div>
        <label class="debug-toggle">
          <input type="checkbox" data-filter="autoScroll" ${s.autoScroll ? "checked" : ""} />
          <span>Auto-scroll</span>
        </label>
      `;
    } else if (e === "routes") {
      const s = this.filters.routes;
      t = `
        <div class="debug-filter-group">
          <label>Method</label>
          <select data-filter="method">
            ${this.renderSelectOptions(["all", "GET", "POST", "PUT", "PATCH", "DELETE"], s.method)}
          </select>
        </div>
        <div class="debug-filter-group grow">
          <label>Search</label>
          <input type="search" data-filter="search" value="${l(s.search)}" placeholder="/admin" />
        </div>
      `;
    } else {
      const s = this.filters.objects;
      t = `
        <div class="debug-filter-group grow">
          <label>Search keys</label>
          <input type="search" data-filter="search" value="${l(s.search)}" placeholder="token" />
        </div>
      `;
    }
    this.filtersEl.innerHTML = t || '<span class="debug-muted">No filters</span>', this.bindFilterInputs();
  }
  bindFilterInputs() {
    this.filtersEl.querySelectorAll("input, select").forEach((t) => {
      t.addEventListener("input", () => this.updateFiltersFromInputs()), t.addEventListener("change", () => this.updateFiltersFromInputs());
    });
  }
  updateFiltersFromInputs() {
    const e = this.activePanel, t = this.filtersEl.querySelectorAll("[data-filter]");
    if (e === "requests") {
      const s = { ...this.filters.requests };
      t.forEach((r) => {
        const i = r.dataset.filter || "";
        i && i in s && (s[i] = r.value);
      }), this.filters.requests = s;
    } else if (e === "sql") {
      const s = { ...this.filters.sql };
      t.forEach((r) => {
        const i = r.dataset.filter || "";
        i === "slowOnly" || i === "errorOnly" ? s[i] = r.checked : i === "search" && (s[i] = r.value);
      }), this.filters.sql = s;
    } else if (e === "logs") {
      const s = { ...this.filters.logs };
      t.forEach((r) => {
        const i = r.dataset.filter || "";
        i === "autoScroll" ? s[i] = r.checked : (i === "level" || i === "search") && (s[i] = r.value);
      }), this.filters.logs = s;
    } else if (e === "routes") {
      const s = { ...this.filters.routes };
      t.forEach((r) => {
        const i = r.dataset.filter || "";
        i && i in s && (s[i] = r.value);
      }), this.filters.routes = s;
    } else {
      const s = { ...this.filters.objects };
      t.forEach((r) => {
        const i = r.dataset.filter || "";
        i && i in s && (s[i] = r.value);
      }), this.filters.objects = s;
    }
    this.renderPanel();
  }
  renderPanel() {
    const e = this.activePanel;
    let t = "";
    e === "template" ? t = this.renderJSONPanel("Template Context", this.state.template, this.filters.objects.search) : e === "session" ? t = this.renderJSONPanel("Session", this.state.session, this.filters.objects.search) : e === "config" ? t = this.renderJSONPanel("Config", this.state.config, this.filters.objects.search) : e === "requests" ? t = this.renderRequests() : e === "sql" ? t = this.renderSQL() : e === "logs" ? t = this.renderLogs() : e === "routes" ? t = this.renderRoutes() : e === "custom" ? t = this.renderCustom() : t = this.renderJSONPanel(v(e), this.state[e] || {}, this.filters.objects.search), this.panelEl.innerHTML = t, e === "logs" && this.filters.logs.autoScroll && (this.panelEl.scrollTop = this.panelEl.scrollHeight);
  }
  renderRequests() {
    const { method: e, status: t, search: s } = this.filters.requests, r = s.toLowerCase(), i = this.state.requests.filter((o) => !(e !== "all" && (o.method || "").toUpperCase() !== e || t !== "all" && String(o.status || "") !== t || r && !(o.path || "").toLowerCase().includes(r)));
    return i.length === 0 ? this.renderEmptyState("No requests captured yet.") : `<div class="debug-stack">${i.map((o) => {
      const p = o.headers ? c(o.headers) : "{}", g = o.query ? c(o.query) : "{}";
      return `
          <article class="debug-card">
            <div class="debug-card__row">
              <span class="debug-badge debug-badge--method">${l(o.method || "GET")}</span>
              <span class="debug-card__path">${l(o.path || "")}</span>
              <span class="debug-badge debug-badge--status">${l(o.status || 0)}</span>
              <span class="debug-card__meta">${b(o.duration)}</span>
              <span class="debug-card__meta">${l(d(o.timestamp))}</span>
            </div>
            <details class="debug-card__details">
              <summary>Details</summary>
              ${o.error ? `<div class="debug-card__error">${l(o.error)}</div>` : ""}
              <div class="debug-card__grid">
                <div>
                  <h4>Query</h4>
                  <pre>${l(g)}</pre>
                </div>
                <div>
                  <h4>Headers</h4>
                  <pre>${l(p)}</pre>
                </div>
              </div>
            </details>
          </article>
        `;
    }).join("")}</div>`;
  }
  renderSQL() {
    const { search: e, slowOnly: t, errorOnly: s } = this.filters.sql, r = e.toLowerCase(), i = this.state.sql.filter((o) => !(s && !o.error || t && !this.isSlowQuery(o) || r && !(o.query || "").toLowerCase().includes(r)));
    return i.length === 0 ? this.renderEmptyState("No SQL queries captured yet.") : `<div class="debug-stack">${i.map((o) => {
      const p = this.isSlowQuery(o), g = o.args ? c(o.args) : "[]";
      return `
          <article class="debug-card ${p ? "debug-card--slow" : ""}">
            <div class="debug-card__row">
              <span class="debug-badge debug-badge--sql">SQL</span>
              <span class="debug-card__meta">${l(d(o.timestamp))}</span>
              <span class="debug-card__meta">${b(o.duration)}</span>
              <span class="debug-card__meta">Rows: ${l(h(o.row_count || 0))}</span>
              ${o.error ? '<span class="debug-badge debug-badge--error">Error</span>' : ""}
            </div>
            <pre class="debug-code">${l(o.query || "")}</pre>
            <div class="debug-card__grid">
              <div>
                <h4>Args</h4>
                <pre>${l(g)}</pre>
              </div>
              ${o.error ? `<div><h4>Error</h4><pre>${l(o.error)}</pre></div>` : ""}
            </div>
          </article>
        `;
    }).join("")}</div>`;
  }
  renderLogs() {
    const { level: e, search: t } = this.filters.logs, s = t.toLowerCase(), r = this.state.logs.filter((n) => {
      if (e !== "all" && (n.level || "").toLowerCase() !== e)
        return !1;
      const o = `${n.message || ""} ${n.source || ""} ${c(n.fields || {})}`.toLowerCase();
      return !(s && !o.includes(s));
    });
    return r.length === 0 ? this.renderEmptyState("No logs captured yet.") : `<div class="debug-stack">${r.map((n) => `
          <article class="debug-card">
            <div class="debug-card__row">
              <span class="debug-badge debug-badge--level">${l((n.level || "info").toUpperCase())}</span>
              <span class="debug-card__meta">${l(d(n.timestamp))}</span>
              <span class="debug-card__path">${l(n.message || "")}</span>
            </div>
            <div class="debug-card__grid">
              ${n.source ? `<div><h4>Source</h4><pre>${l(n.source)}</pre></div>` : ""}
              ${n.fields ? `<div><h4>Fields</h4><pre>${l(c(n.fields))}</pre></div>` : ""}
            </div>
          </article>
        `).join("")}</div>`;
  }
  renderRoutes() {
    const { method: e, search: t } = this.filters.routes, s = t.toLowerCase(), r = this.state.routes.filter((n) => {
      if (e !== "all" && (n.method || "").toUpperCase() !== e)
        return !1;
      const o = `${n.path || ""} ${n.handler || ""} ${n.summary || ""}`.toLowerCase();
      return !(s && !o.includes(s));
    });
    return r.length === 0 ? this.renderEmptyState("No routes captured yet.") : `<div class="debug-stack">${r.map((n) => `
          <article class="debug-card">
            <div class="debug-card__row">
              <span class="debug-badge debug-badge--method">${l(n.method || "")}</span>
              <span class="debug-card__path">${l(n.path || "")}</span>
              ${n.handler ? `<span class="debug-card__meta">${l(n.handler)}</span>` : ""}
            </div>
            <div class="debug-card__grid">
              ${n.summary ? `<div><h4>Summary</h4><pre>${l(n.summary)}</pre></div>` : ""}
              ${n.middleware && n.middleware.length > 0 ? `<div><h4>Middleware</h4><pre>${l(c(n.middleware))}</pre></div>` : ""}
              ${n.tags && n.tags.length > 0 ? `<div><h4>Tags</h4><pre>${l(c(n.tags))}</pre></div>` : ""}
            </div>
          </article>
        `).join("")}</div>`;
  }
  renderCustom() {
    const { search: e } = this.filters.custom, t = S(this.state.custom.data, e), s = this.renderJSONPanel("Custom Data", t, ""), r = this.state.custom.logs, i = r.length ? `
        <div class="debug-stack">
          ${r.map((n) => `
                <article class="debug-card">
                  <div class="debug-card__row">
                    <span class="debug-badge debug-badge--custom">${l(n.category || "custom")}</span>
                    <span class="debug-card__meta">${l(d(n.timestamp))}</span>
                    <span class="debug-card__path">${l(n.message || "")}</span>
                  </div>
                  ${n.fields ? `<pre>${l(c(n.fields))}</pre>` : ""}
                </article>
              `).join("")}
        </div>
      ` : this.renderEmptyState("No custom logs yet.");
    return `
      <div class="debug-grid">
        <section>
          <h3 class="debug-section-title">Custom Data</h3>
          ${s}
        </section>
        <section>
          <h3 class="debug-section-title">Custom Logs</h3>
          ${i}
        </section>
      </div>
    `;
  }
  renderJSONPanel(e, t, s) {
    const r = S(t || {}, s);
    return `
      <section class="debug-json-panel">
        <div class="debug-json-header">
          <h3>${l(e)}</h3>
          <span class="debug-muted">${h(Object.keys(r || {}).length)} keys</span>
        </div>
        <pre>${l(c(r))}</pre>
      </section>
    `;
  }
  renderEmptyState(e) {
    return `
      <div class="debug-empty">
        <p>${l(e)}</p>
      </div>
    `;
  }
  renderSelectOptions(e, t) {
    return e.map((s) => {
      const r = s.toLowerCase() === t.toLowerCase() ? "selected" : "";
      return `<option value="${l(s)}" ${r}>${l(s)}</option>`;
    }).join("");
  }
  updateTabCounts() {
    const e = {
      template: Object.keys(this.state.template || {}).length,
      session: Object.keys(this.state.session || {}).length,
      requests: this.state.requests.length,
      sql: this.state.sql.length,
      logs: this.state.logs.length,
      config: Object.keys(this.state.config || {}).length,
      routes: this.state.routes.length,
      custom: Object.keys(this.state.custom.data || {}).length + this.state.custom.logs.length
    };
    Object.entries(e).forEach(([t, s]) => {
      const r = this.tabsEl.querySelector(`[data-panel-count="${t}"]`);
      r && (r.textContent = h(s));
    });
  }
  updateConnectionStatus(e) {
    this.connectionEl.textContent = e, this.statusEl.setAttribute("data-status", e);
  }
  updateStatusMeta() {
    this.eventCountEl.textContent = `${h(this.eventCount)} events`, this.lastEventAt && (this.lastEventEl.textContent = this.lastEventAt.toLocaleTimeString());
  }
  handleEvent(e) {
    if (!e || !e.type)
      return;
    if (e.type === "snapshot") {
      this.applySnapshot(e.payload);
      return;
    }
    if (this.eventCount += 1, this.lastEventAt = /* @__PURE__ */ new Date(), this.updateStatusMeta(), this.paused)
      return;
    const t = P[e.type] || e.type;
    switch (e.type) {
      case "request":
        this.state.requests.push(e.payload), this.trim(this.state.requests, this.maxLogEntries);
        break;
      case "sql":
        this.state.sql.push(e.payload), this.trim(this.state.sql, this.maxSQLQueries);
        break;
      case "log":
        this.state.logs.push(e.payload), this.trim(this.state.logs, this.maxLogEntries);
        break;
      case "template":
        this.state.template = e.payload || {};
        break;
      case "session":
        this.state.session = e.payload || {};
        break;
      case "custom":
        this.handleCustomEvent(e.payload);
        break;
    }
    this.updateTabCounts(), t === this.activePanel && this.renderPanel();
  }
  handleCustomEvent(e) {
    if (e) {
      if (typeof e == "object" && "key" in e && "value" in e) {
        k(this.state.custom.data, String(e.key), e.value);
        return;
      }
      if (typeof e == "object" && ("category" in e || "message" in e)) {
        this.state.custom.logs.push(e), this.trim(this.state.custom.logs, this.maxLogEntries);
        return;
      }
    }
  }
  applySnapshot(e) {
    const t = e || {};
    this.state.template = t.template || {}, this.state.session = t.session || {}, this.state.requests = u(t.requests), this.state.sql = u(t.sql), this.state.logs = u(t.logs), this.state.config = t.config || {}, this.state.routes = u(t.routes);
    const s = t.custom || {};
    this.state.custom = {
      data: s.data || {},
      logs: u(s.logs)
    }, this.updateTabCounts(), this.renderPanel();
  }
  trim(e, t) {
    if (!(!Array.isArray(e) || t <= 0))
      for (; e.length > t; )
        e.shift();
  }
  isSlowQuery(e) {
    if (!e || e.duration === void 0 || e.duration === null)
      return !1;
    const t = Number(e.duration);
    return Number.isNaN(t) ? !1 : t / 1e6 >= this.slowThresholdMs;
  }
  async fetchSnapshot() {
    if (this.debugPath)
      try {
        const e = await fetch(`${this.debugPath}/api/snapshot`, {
          credentials: "same-origin"
        });
        if (!e.ok)
          return;
        const t = await e.json();
        this.applySnapshot(t);
      } catch {
      }
  }
  clearAll() {
    this.debugPath && (this.stream.clear(), fetch(`${this.debugPath}/api/clear`, { method: "POST", credentials: "same-origin" }).catch(() => {
    }));
  }
  clearActivePanel() {
    if (!this.debugPath)
      return;
    const e = this.activePanel;
    this.stream.clear([e]), fetch(`${this.debugPath}/api/clear/${e}`, { method: "POST", credentials: "same-origin" }).catch(() => {
    });
  }
  togglePause(e) {
    this.paused = !this.paused, e.textContent = this.paused ? "Resume" : "Pause", this.paused || this.stream.requestSnapshot();
  }
}
const T = (a) => {
  const e = a || document.querySelector("[data-debug-console]");
  return e ? new N(e) : null;
}, w = () => {
  T();
};
document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", w) : w();
export {
  N as DebugPanel,
  q as DebugStream,
  T as initDebugPanel
};
//# sourceMappingURL=index.js.map
