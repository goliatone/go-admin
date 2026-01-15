import { D as _ } from "../chunks/debug-stream-DXYTUS6I.js";
const y = ["template", "session", "requests", "sql", "logs", "config", "routes", "custom"], S = {
  template: "Template",
  session: "Session",
  requests: "Requests",
  sql: "SQL Queries",
  logs: "Logs",
  config: "Config",
  routes: "Routes",
  custom: "Custom"
}, k = {
  template: "template",
  session: "session",
  requests: "request",
  sql: "sql",
  logs: "log",
  custom: "custom"
}, T = {
  request: "requests",
  sql: "sql",
  log: "logs",
  template: "template",
  session: "session",
  custom: "custom"
}, N = (r) => {
  if (!r)
    return null;
  try {
    return JSON.parse(r);
  } catch {
    return null;
  }
}, o = (r) => String(r ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;"), b = (r) => {
  if (!r)
    return "";
  if (typeof r == "number")
    return new Date(r).toLocaleTimeString();
  if (typeof r == "string") {
    const e = new Date(r);
    return Number.isNaN(e.getTime()) ? r : e.toLocaleTimeString();
  }
  return "";
}, E = (r) => {
  if (r == null)
    return "0ms";
  if (typeof r == "string")
    return r;
  const e = Number(r);
  if (Number.isNaN(e))
    return "0ms";
  const t = e / 1e6;
  return t < 1 ? `${(e / 1e3).toFixed(1)}us` : t < 1e3 ? `${t.toFixed(2)}ms` : `${(t / 1e3).toFixed(2)}s`;
}, f = (r) => {
  if (r == null || r === "")
    return "0";
  const e = Number(r);
  return Number.isNaN(e) ? String(r) : e.toLocaleString();
}, c = (r) => {
  if (r === void 0)
    return "{}";
  try {
    return JSON.stringify(r, null, 2);
  } catch {
    return String(r ?? "");
  }
}, O = (r) => Array.isArray(r) && r.length > 0 ? r.filter((e) => typeof e == "string" && e.trim()).map((e) => e.trim()) : [...y], q = (r) => S[r] ? S[r] : r ? r.replace(/[-_.]/g, " ").replace(/\s+/g, " ").trim().replace(/\bsql\b/i, "SQL").replace(/\b([a-z])/g, (e) => e.toUpperCase()) : "", w = (r, e) => {
  if (!e)
    return r;
  const t = e.toLowerCase(), s = {};
  for (const [a, i] of Object.entries(r || {}))
    a.toLowerCase().includes(t) && (s[a] = i);
  return s;
}, j = (r, e, t) => {
  if (!r || !e)
    return;
  const s = e.split(".").map((i) => i.trim()).filter(Boolean);
  if (s.length === 0)
    return;
  let a = r;
  for (let i = 0; i < s.length - 1; i += 1) {
    const l = s[i];
    (!a[l] || typeof a[l] != "object") && (a[l] = {}), a = a[l];
  }
  a[s[s.length - 1]] = t;
}, g = (r) => Array.isArray(r) ? r : [], v = (r, e) => {
  if (!r)
    return e;
  const t = Number(r);
  return Number.isNaN(t) ? e : t;
};
class A {
  constructor(e) {
    this.paused = !1, this.eventCount = 0, this.lastEventAt = null, this.container = e;
    const t = N(e.dataset.panels);
    this.panels = O(t), this.activePanel = this.panels[0] || "template", this.debugPath = e.dataset.debugPath || "", this.maxLogEntries = v(e.dataset.maxLogEntries, 500), this.maxSQLQueries = v(e.dataset.maxSqlQueries, 200), this.slowThresholdMs = v(e.dataset.slowThresholdMs, 50), this.state = {
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
    }, this.tabsEl = this.requireElement("[data-debug-tabs]"), this.panelEl = this.requireElement("[data-debug-panel]"), this.filtersEl = this.requireElement("[data-debug-filters]"), this.statusEl = this.requireElement("[data-debug-status]"), this.connectionEl = this.requireElement("[data-debug-connection]"), this.eventCountEl = this.requireElement("[data-debug-events]"), this.lastEventEl = this.requireElement("[data-debug-last]"), this.renderTabs(), this.renderActivePanel(), this.bindActions(), this.stream = new _({
      basePath: this.debugPath,
      onEvent: (s) => this.handleEvent(s),
      onStatusChange: (s) => this.updateConnectionStatus(s)
    }), this.fetchSnapshot(), this.stream.connect(), this.stream.subscribe(this.panels.map((s) => k[s] || s));
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
      const a = s.closest("[data-panel]");
      if (!a)
        return;
      const i = a.dataset.panel || "";
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
          <button class="debug-tab ${t === this.activePanel ? "debug-tab--active" : ""}" data-panel="${o(t)}">
            <span class="debug-tab__label">${o(q(t))}</span>
            <span class="debug-tab__count" data-panel-count="${o(t)}">0</span>
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
          <input type="search" data-filter="search" value="${o(s.search)}" placeholder="/admin/users" />
        </div>
      `;
    } else if (e === "sql") {
      const s = this.filters.sql;
      t = `
        <div class="debug-filter-group grow">
          <label>Search</label>
          <input type="search" data-filter="search" value="${o(s.search)}" placeholder="SELECT" />
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
          <input type="search" data-filter="search" value="${o(s.search)}" placeholder="database" />
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
          <input type="search" data-filter="search" value="${o(s.search)}" placeholder="/admin" />
        </div>
      `;
    } else {
      const s = this.filters.objects;
      t = `
        <div class="debug-filter-group grow">
          <label>Search keys</label>
          <input type="search" data-filter="search" value="${o(s.search)}" placeholder="token" />
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
      t.forEach((a) => {
        const i = a.dataset.filter || "";
        i && i in s && (s[i] = a.value);
      }), this.filters.requests = s;
    } else if (e === "sql") {
      const s = { ...this.filters.sql };
      t.forEach((a) => {
        const i = a.dataset.filter || "";
        i === "slowOnly" || i === "errorOnly" ? s[i] = a.checked : i === "search" && (s[i] = a.value);
      }), this.filters.sql = s;
    } else if (e === "logs") {
      const s = { ...this.filters.logs };
      t.forEach((a) => {
        const i = a.dataset.filter || "";
        i === "autoScroll" ? s[i] = a.checked : (i === "level" || i === "search") && (s[i] = a.value);
      }), this.filters.logs = s;
    } else if (e === "routes") {
      const s = { ...this.filters.routes };
      t.forEach((a) => {
        const i = a.dataset.filter || "";
        i && i in s && (s[i] = a.value);
      }), this.filters.routes = s;
    } else {
      const s = { ...this.filters.objects };
      t.forEach((a) => {
        const i = a.dataset.filter || "";
        i && i in s && (s[i] = a.value);
      }), this.filters.objects = s;
    }
    this.renderPanel();
  }
  renderPanel() {
    const e = this.activePanel;
    let t = "";
    e === "template" ? t = this.renderJSONPanel("Template Context", this.state.template, this.filters.objects.search) : e === "session" ? t = this.renderJSONPanel("Session", this.state.session, this.filters.objects.search) : e === "config" ? t = this.renderJSONPanel("Config", this.state.config, this.filters.objects.search) : e === "requests" ? t = this.renderRequests() : e === "sql" ? t = this.renderSQL() : e === "logs" ? t = this.renderLogs() : e === "routes" ? t = this.renderRoutes() : e === "custom" ? t = this.renderCustom() : t = this.renderJSONPanel(q(e), this.state[e] || {}, this.filters.objects.search), this.panelEl.innerHTML = t, e === "logs" && this.filters.logs.autoScroll && (this.panelEl.scrollTop = this.panelEl.scrollHeight);
  }
  renderRequests() {
    const { method: e, status: t, search: s } = this.filters.requests, a = s.toLowerCase(), i = this.state.requests.filter((n) => !(e !== "all" && (n.method || "").toUpperCase() !== e || t !== "all" && String(n.status || "") !== t || a && !(n.path || "").toLowerCase().includes(a)));
    return i.length === 0 ? this.renderEmptyState("No requests captured yet.") : `<div class="debug-stack">${i.map((n) => {
      const d = n.headers ? c(n.headers) : "{}", u = n.query ? c(n.query) : "{}", p = `debug-badge--method-${(n.method || "get").toLowerCase()}`, h = n.status || 0, m = h >= 500 ? "debug-badge--status-error" : h >= 400 ? "debug-badge--status-warn" : "debug-badge--status", L = h >= 400 ? "debug-card--error" : "", $ = n.duration || 0, P = (typeof $ == "number" ? $ / 1e6 : 0) >= this.slowThresholdMs ? "debug-duration--slow" : "";
      return `
          <article class="debug-card ${L}">
            <div class="debug-card__row">
              <span class="debug-badge debug-badge--method ${p}">${o(n.method || "GET")}</span>
              <span class="debug-card__path">${o(n.path || "")}</span>
              <span class="debug-badge ${m}">${o(h)}</span>
              <span class="debug-card__meta debug-duration ${P}">${E(n.duration)}</span>
              <span class="debug-card__meta debug-timestamp">${o(b(n.timestamp))}</span>
            </div>
            <details class="debug-card__details">
              <summary>Details</summary>
              ${n.error ? `<div class="debug-card__error">${o(n.error)}</div>` : ""}
              <div class="debug-card__grid">
                <div>
                  <h4>Query</h4>
                  <pre>${o(u)}</pre>
                </div>
                <div>
                  <h4>Headers</h4>
                  <pre>${o(d)}</pre>
                </div>
              </div>
            </details>
          </article>
        `;
    }).join("")}</div>`;
  }
  renderSQL() {
    const { search: e, slowOnly: t, errorOnly: s } = this.filters.sql, a = e.toLowerCase(), i = this.state.sql.filter((n) => !(s && !n.error || t && !this.isSlowQuery(n) || a && !(n.query || "").toLowerCase().includes(a)));
    return i.length === 0 ? this.renderEmptyState("No SQL queries captured yet.") : `<div class="debug-stack">${i.map((n) => {
      const d = this.isSlowQuery(n), u = !!n.error, p = n.args ? c(n.args) : "[]", h = u ? "debug-card--error" : d ? "debug-card--slow" : "", m = d ? "debug-duration--slow" : "";
      return `
          <article class="debug-card ${h}">
            <div class="debug-card__row">
              <span class="debug-badge debug-badge--sql">SQL</span>
              <span class="debug-card__meta debug-timestamp">${o(b(n.timestamp))}</span>
              <span class="debug-card__meta debug-duration ${m}">${E(n.duration)}</span>
              <span class="debug-card__meta">Rows: ${o(f(n.row_count || 0))}</span>
              ${u ? '<span class="debug-badge debug-badge--error">Error</span>' : ""}
            </div>
            <pre class="debug-code">${o(n.query || "")}</pre>
            <div class="debug-card__grid">
              <div>
                <h4>Args</h4>
                <pre>${o(p)}</pre>
              </div>
              ${u ? `<div><h4>Error</h4><pre>${o(n.error)}</pre></div>` : ""}
            </div>
          </article>
        `;
    }).join("")}</div>`;
  }
  renderLogs() {
    const { level: e, search: t } = this.filters.logs, s = t.toLowerCase(), a = this.state.logs.filter((l) => {
      if (e !== "all" && (l.level || "").toLowerCase() !== e)
        return !1;
      const n = `${l.message || ""} ${l.source || ""} ${c(l.fields || {})}`.toLowerCase();
      return !(s && !n.includes(s));
    });
    return a.length === 0 ? this.renderEmptyState("No logs captured yet.") : `<div class="debug-stack">${a.map((l) => {
      const n = (l.level || "info").toLowerCase(), d = `debug-badge--level-${n}`;
      return `
          <article class="debug-card ${n === "error" || n === "fatal" ? "debug-card--error" : ""}">
            <div class="debug-card__row">
              <span class="debug-badge debug-badge--level ${d}">${o((l.level || "info").toUpperCase())}</span>
              <span class="debug-card__meta debug-timestamp">${o(b(l.timestamp))}</span>
              <span class="debug-card__path">${o(l.message || "")}</span>
            </div>
            <div class="debug-card__grid">
              ${l.source ? `<div><h4>Source</h4><pre>${o(l.source)}</pre></div>` : ""}
              ${l.fields ? `<div><h4>Fields</h4><pre>${o(c(l.fields))}</pre></div>` : ""}
            </div>
          </article>
        `;
    }).join("")}</div>`;
  }
  renderRoutes() {
    const { method: e, search: t } = this.filters.routes, s = t.toLowerCase(), a = this.state.routes.filter((l) => {
      if (e !== "all" && (l.method || "").toUpperCase() !== e)
        return !1;
      const n = `${l.path || ""} ${l.handler || ""} ${l.summary || ""}`.toLowerCase();
      return !(s && !n.includes(s));
    });
    return a.length === 0 ? this.renderEmptyState("No routes captured yet.") : `<div class="debug-stack">${a.map((l) => `
          <article class="debug-card">
            <div class="debug-card__row">
              <span class="debug-badge debug-badge--method ${`debug-badge--method-${(l.method || "get").toLowerCase()}`}">${o(l.method || "")}</span>
              <span class="debug-card__path">${o(l.path || "")}</span>
              ${l.handler ? `<span class="debug-card__meta">${o(l.handler)}</span>` : ""}
            </div>
            <div class="debug-card__grid">
              ${l.summary ? `<div><h4>Summary</h4><pre>${o(l.summary)}</pre></div>` : ""}
              ${l.middleware && l.middleware.length > 0 ? `<div><h4>Middleware</h4><pre>${o(c(l.middleware))}</pre></div>` : ""}
              ${l.tags && l.tags.length > 0 ? `<div><h4>Tags</h4><pre>${o(c(l.tags))}</pre></div>` : ""}
            </div>
          </article>
        `).join("")}</div>`;
  }
  renderCustom() {
    const { search: e } = this.filters.custom, t = w(this.state.custom.data, e), s = this.renderJSONPanel("Custom Data", t, ""), a = this.state.custom.logs, i = a.length ? `
        <div class="debug-stack">
          ${a.map((l) => `
                <article class="debug-card">
                  <div class="debug-card__row">
                    <span class="debug-badge debug-badge--custom">${o(l.category || "custom")}</span>
                    <span class="debug-card__meta">${o(b(l.timestamp))}</span>
                    <span class="debug-card__path">${o(l.message || "")}</span>
                  </div>
                  ${l.fields ? `<pre>${o(c(l.fields))}</pre>` : ""}
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
    const a = w(t || {}, s);
    return `
      <section class="debug-json-panel">
        <div class="debug-json-header">
          <h3>${o(e)}</h3>
          <span class="debug-muted">${f(Object.keys(a || {}).length)} keys</span>
        </div>
        <pre>${o(c(a))}</pre>
      </section>
    `;
  }
  renderEmptyState(e) {
    return `
      <div class="debug-empty">
        <p>${o(e)}</p>
      </div>
    `;
  }
  renderSelectOptions(e, t) {
    return e.map((s) => {
      const a = s.toLowerCase() === t.toLowerCase() ? "selected" : "";
      return `<option value="${o(s)}" ${a}>${o(s)}</option>`;
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
      const a = this.tabsEl.querySelector(`[data-panel-count="${t}"]`);
      a && (a.textContent = f(s));
    });
  }
  updateConnectionStatus(e) {
    this.connectionEl.textContent = e, this.statusEl.setAttribute("data-status", e);
  }
  updateStatusMeta() {
    this.eventCountEl.textContent = `${f(this.eventCount)} events`, this.lastEventAt && (this.lastEventEl.textContent = this.lastEventAt.toLocaleTimeString());
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
    const t = T[e.type] || e.type;
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
        j(this.state.custom.data, String(e.key), e.value);
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
    this.state.template = t.template || {}, this.state.session = t.session || {}, this.state.requests = g(t.requests), this.state.sql = g(t.sql), this.state.logs = g(t.logs), this.state.config = t.config || {}, this.state.routes = g(t.routes);
    const s = t.custom || {};
    this.state.custom = {
      data: s.data || {},
      logs: g(s.logs)
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
const x = (r) => {
  const e = r || document.querySelector("[data-debug-console]");
  return e ? new A(e) : null;
}, C = () => {
  x();
};
document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", C) : C();
export {
  A as DebugPanel,
  _ as DebugStream,
  x as initDebugPanel
};
//# sourceMappingURL=index.js.map
