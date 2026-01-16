import { D as N } from "../chunks/debug-stream-DXYTUS6I.js";
import { DebugReplPanel as k } from "./repl.js";
const P = ["template", "session", "requests", "sql", "logs", "config", "routes", "custom"], L = /* @__PURE__ */ new Set(["shell", "console"]), $ = /* @__PURE__ */ new Set([...P, ...L]), y = {
  template: "Template",
  session: "Session",
  requests: "Requests",
  sql: "SQL Queries",
  logs: "Logs",
  config: "Config",
  routes: "Routes",
  custom: "Custom",
  shell: "Shell",
  console: "Console"
}, A = {
  template: "template",
  session: "session",
  requests: "request",
  sql: "sql",
  logs: "log",
  custom: "custom"
}, j = {
  request: "requests",
  sql: "sql",
  log: "logs",
  template: "template",
  session: "session",
  custom: "custom"
}, O = (r) => {
  if (!r)
    return null;
  try {
    return JSON.parse(r);
  } catch {
    return null;
  }
}, o = (r) => String(r ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;"), f = (r) => {
  if (!r)
    return "";
  if (typeof r == "number")
    return new Date(r).toLocaleTimeString();
  if (typeof r == "string") {
    const t = new Date(r);
    return Number.isNaN(t.getTime()) ? r : t.toLocaleTimeString();
  }
  return "";
}, v = (r) => {
  if (r == null)
    return "0ms";
  if (typeof r == "string")
    return r;
  const t = Number(r);
  if (Number.isNaN(t))
    return "0ms";
  const e = t / 1e6;
  return e < 1 ? `${(t / 1e3).toFixed(1)}us` : e < 1e3 ? `${e.toFixed(2)}ms` : `${(e / 1e3).toFixed(2)}s`;
}, d = (r) => {
  if (r == null || r === "")
    return "0";
  const t = Number(r);
  return Number.isNaN(t) ? String(r) : t.toLocaleString();
}, g = (r) => {
  if (r === void 0)
    return "{}";
  try {
    return JSON.stringify(r, null, 2);
  } catch {
    return String(r ?? "");
  }
}, u = (r) => r == null ? 0 : Array.isArray(r) ? r.length : typeof r == "object" ? Object.keys(r).length : 1, x = (r) => Array.isArray(r) && r.length > 0 ? r.filter((t) => typeof t == "string" && t.trim()).map((t) => t.trim()) : [...P], w = (r) => y[r] ? y[r] : r ? r.replace(/[-_.]/g, " ").replace(/\s+/g, " ").trim().replace(/\bsql\b/i, "SQL").replace(/\b([a-z])/g, (t) => t.toUpperCase()) : "", q = (r, t) => {
  if (!t)
    return r;
  const e = t.toLowerCase(), s = {};
  for (const [a, n] of Object.entries(r || {}))
    a.toLowerCase().includes(e) && (s[a] = n);
  return s;
}, M = (r, t, e) => {
  if (!r || !t)
    return;
  const s = t.split(".").map((n) => n.trim()).filter(Boolean);
  if (s.length === 0)
    return;
  let a = r;
  for (let n = 0; n < s.length - 1; n += 1) {
    const l = s[n];
    (!a[l] || typeof a[l] != "object") && (a[l] = {}), a = a[l];
  }
  a[s[s.length - 1]] = e;
}, p = (r) => Array.isArray(r) ? r : [], b = (r, t) => {
  if (!r)
    return t;
  const e = Number(r);
  return Number.isNaN(e) ? t : e;
};
class D {
  constructor(t) {
    this.paused = !1, this.eventCount = 0, this.lastEventAt = null, this.container = t;
    const e = O(t.dataset.panels);
    this.panels = x(e), this.activePanel = this.panels[0] || "template", this.debugPath = t.dataset.debugPath || "", this.maxLogEntries = b(t.dataset.maxLogEntries, 500), this.maxSQLQueries = b(t.dataset.maxSqlQueries, 200), this.slowThresholdMs = b(t.dataset.slowThresholdMs, 50), this.state = {
      template: {},
      session: {},
      requests: [],
      sql: [],
      logs: [],
      config: {},
      routes: [],
      custom: { data: {}, logs: [] },
      extra: {}
    }, this.filters = {
      requests: { method: "all", status: "all", search: "" },
      sql: { search: "", slowOnly: !1, errorOnly: !1 },
      logs: { level: "all", search: "", autoScroll: !0 },
      routes: { method: "all", search: "" },
      custom: { search: "" },
      objects: { search: "" }
    }, this.replPanels = /* @__PURE__ */ new Map(), this.panelRenderers = /* @__PURE__ */ new Map(), L.forEach((s) => {
      this.panelRenderers.set(s, {
        render: () => this.renderReplPanel(s),
        filters: () => '<span class="timestamp">REPL controls are in the panel header.</span>'
      });
    }), this.tabsEl = this.requireElement("[data-debug-tabs]", document), this.panelEl = this.requireElement("[data-debug-panel]", document), this.filtersEl = this.requireElement("[data-debug-filters]", document), this.statusEl = document.querySelector("[data-debug-status]") || this.container, this.connectionEl = this.requireElement("[data-debug-connection]", document), this.eventCountEl = this.requireElement("[data-debug-events]", document), this.lastEventEl = this.requireElement("[data-debug-last]", document), this.renderTabs(), this.renderActivePanel(), this.bindActions(), this.stream = new N({
      basePath: this.debugPath,
      onEvent: (s) => this.handleEvent(s),
      onStatusChange: (s) => this.updateConnectionStatus(s)
    }), this.fetchSnapshot(), this.stream.connect(), this.stream.subscribe(this.panels.map((s) => A[s] || s));
  }
  requireElement(t, e = this.container) {
    const s = e.querySelector(t);
    if (!s)
      throw new Error(`Missing debug element: ${t}`);
    return s;
  }
  bindActions() {
    this.tabsEl.addEventListener("click", (e) => {
      const s = e.target;
      if (!s)
        return;
      const a = s.closest("[data-panel]");
      if (!a)
        return;
      const n = a.dataset.panel || "";
      !n || n === this.activePanel || (this.activePanel = n, this.renderActivePanel());
    }), this.container.querySelectorAll("[data-debug-action]").forEach((e) => {
      e.addEventListener("click", () => {
        switch (e.dataset.debugAction || "") {
          case "snapshot":
            this.stream.requestSnapshot();
            break;
          case "clear":
            this.clearAll();
            break;
          case "pause":
            this.togglePause(e);
            break;
          case "clear-panel":
            this.clearActivePanel();
            break;
        }
      });
    });
  }
  renderTabs() {
    const t = this.panels.map((e) => `
          <button class="debug-tab ${e === this.activePanel ? "debug-tab--active" : ""}" data-panel="${o(e)}">
            <span class="debug-tab__label">${o(w(e))}</span>
            <span class="debug-tab__count" data-panel-count="${o(e)}">0</span>
          </button>
        `).join("");
    this.tabsEl.innerHTML = t, this.updateTabCounts();
  }
  renderActivePanel() {
    this.renderTabs(), this.renderFilters(), this.renderPanel();
  }
  renderFilters() {
    const t = this.activePanel;
    let e = "";
    const s = this.panelRenderers.get(t);
    if (s?.filters)
      e = s.filters();
    else if (t === "requests") {
      const a = this.filters.requests;
      e = `
        <div class="debug-filter">
          <label>Method</label>
          <select data-filter="method">
            ${this.renderSelectOptions(["all", "GET", "POST", "PUT", "PATCH", "DELETE"], a.method)}
          </select>
        </div>
        <div class="debug-filter">
          <label>Status</label>
          <select data-filter="status">
            ${this.renderSelectOptions(["all", "200", "201", "204", "400", "401", "403", "404", "500"], a.status)}
          </select>
        </div>
        <div class="debug-filter debug-filter--grow">
          <label>Search</label>
          <input type="search" data-filter="search" value="${o(a.search)}" placeholder="/admin/users" />
        </div>
      `;
    } else if (t === "sql") {
      const a = this.filters.sql;
      e = `
        <div class="debug-filter debug-filter--grow">
          <label>Search</label>
          <input type="search" data-filter="search" value="${o(a.search)}" placeholder="SELECT" />
        </div>
        <label class="debug-btn">
          <input type="checkbox" data-filter="slowOnly" ${a.slowOnly ? "checked" : ""} />
          <span>Slow only</span>
        </label>
        <label class="debug-btn">
          <input type="checkbox" data-filter="errorOnly" ${a.errorOnly ? "checked" : ""} />
          <span>Errors</span>
        </label>
      `;
    } else if (t === "logs") {
      const a = this.filters.logs;
      e = `
        <div class="debug-filter">
          <label>Level</label>
          <select data-filter="level">
            ${this.renderSelectOptions(["all", "debug", "info", "warn", "error"], a.level)}
          </select>
        </div>
        <div class="debug-filter debug-filter--grow">
          <label>Search</label>
          <input type="search" data-filter="search" value="${o(a.search)}" placeholder="database" />
        </div>
        <label class="debug-btn">
          <input type="checkbox" data-filter="autoScroll" ${a.autoScroll ? "checked" : ""} />
          <span>Auto-scroll</span>
        </label>
      `;
    } else if (t === "routes") {
      const a = this.filters.routes;
      e = `
        <div class="debug-filter">
          <label>Method</label>
          <select data-filter="method">
            ${this.renderSelectOptions(["all", "GET", "POST", "PUT", "PATCH", "DELETE"], a.method)}
          </select>
        </div>
        <div class="debug-filter debug-filter--grow">
          <label>Search</label>
          <input type="search" data-filter="search" value="${o(a.search)}" placeholder="/admin" />
        </div>
      `;
    } else {
      const a = this.filters.objects;
      e = `
        <div class="debug-filter debug-filter--grow">
          <label>Search keys</label>
          <input type="search" data-filter="search" value="${o(a.search)}" placeholder="token" />
        </div>
      `;
    }
    this.filtersEl.innerHTML = e || '<span class="timestamp">No filters</span>', this.bindFilterInputs();
  }
  bindFilterInputs() {
    this.filtersEl.querySelectorAll("input, select").forEach((e) => {
      e.addEventListener("input", () => this.updateFiltersFromInputs()), e.addEventListener("change", () => this.updateFiltersFromInputs());
    });
  }
  updateFiltersFromInputs() {
    const t = this.activePanel, e = this.filtersEl.querySelectorAll("[data-filter]");
    if (t === "requests") {
      const s = { ...this.filters.requests };
      e.forEach((a) => {
        const n = a.dataset.filter || "";
        n && n in s && (s[n] = a.value);
      }), this.filters.requests = s;
    } else if (t === "sql") {
      const s = { ...this.filters.sql };
      e.forEach((a) => {
        const n = a.dataset.filter || "";
        n === "slowOnly" || n === "errorOnly" ? s[n] = a.checked : n === "search" && (s[n] = a.value);
      }), this.filters.sql = s;
    } else if (t === "logs") {
      const s = { ...this.filters.logs };
      e.forEach((a) => {
        const n = a.dataset.filter || "";
        n === "autoScroll" ? s[n] = a.checked : (n === "level" || n === "search") && (s[n] = a.value);
      }), this.filters.logs = s;
    } else if (t === "routes") {
      const s = { ...this.filters.routes };
      e.forEach((a) => {
        const n = a.dataset.filter || "";
        n && n in s && (s[n] = a.value);
      }), this.filters.routes = s;
    } else {
      const s = { ...this.filters.objects };
      e.forEach((a) => {
        const n = a.dataset.filter || "";
        n && n in s && (s[n] = a.value);
      }), this.filters.objects = s;
    }
    this.renderPanel();
  }
  renderPanel() {
    const t = this.activePanel, e = this.panelRenderers.get(t);
    if (e) {
      e.render();
      return;
    }
    this.panelEl.classList.remove("debug-content--repl");
    let s = "";
    t === "template" ? s = this.renderJSONPanel("Template Context", this.state.template, this.filters.objects.search) : t === "session" ? s = this.renderJSONPanel("Session", this.state.session, this.filters.objects.search) : t === "config" ? s = this.renderJSONPanel("Config", this.state.config, this.filters.objects.search) : t === "requests" ? s = this.renderRequests() : t === "sql" ? s = this.renderSQL() : t === "logs" ? s = this.renderLogs() : t === "routes" ? s = this.renderRoutes() : t === "custom" ? s = this.renderCustom() : s = this.renderJSONPanel(w(t), this.state.extra[t], this.filters.objects.search), this.panelEl.innerHTML = s, t === "logs" && this.filters.logs.autoScroll && (this.panelEl.scrollTop = this.panelEl.scrollHeight);
  }
  renderReplPanel(t) {
    this.panelEl.classList.add("debug-content--repl");
    let e = this.replPanels.get(t);
    e || (e = new k({ kind: t === "shell" ? "shell" : "console", debugPath: this.debugPath }), this.replPanels.set(t, e)), e.attach(this.panelEl);
  }
  renderRequests() {
    const { method: t, status: e, search: s } = this.filters.requests, a = s.toLowerCase(), n = this.state.requests.filter((i) => !(t !== "all" && (i.method || "").toUpperCase() !== t || e !== "all" && String(i.status || "") !== e || a && !(i.path || "").toLowerCase().includes(a)));
    return n.length === 0 ? this.renderEmptyState("No requests captured yet.") : `
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
        <tbody>${n.map((i) => {
      const c = `badge--method-${(i.method || "get").toLowerCase()}`, h = i.status || 0, m = h >= 500 ? "badge--status-error" : h >= 400 ? "badge--status-warn" : "badge--status", S = h >= 400 ? "error" : "", E = i.duration || 0, T = (typeof E == "number" ? E / 1e6 : 0) >= this.slowThresholdMs ? "duration--slow" : "";
      return `
          <tr class="${S}">
            <td><span class="badge ${c}">${o(i.method || "GET")}</span></td>
            <td><span class="path">${o(i.path || "")}</span></td>
            <td><span class="badge ${m}">${o(h)}</span></td>
            <td><span class="duration ${T}">${v(i.duration)}</span></td>
            <td><span class="timestamp">${o(f(i.timestamp))}</span></td>
          </tr>
        `;
    }).join("")}</tbody>
      </table>
    `;
  }
  renderSQL() {
    const { search: t, slowOnly: e, errorOnly: s } = this.filters.sql, a = t.toLowerCase(), n = this.state.sql.filter((i) => !(s && !i.error || e && !this.isSlowQuery(i) || a && !(i.query || "").toLowerCase().includes(a)));
    return n.length === 0 ? this.renderEmptyState("No SQL queries captured yet.") : `
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
        <tbody>${n.map((i) => {
      const c = this.isSlowQuery(i), h = !!i.error;
      return `
          <tr class="${h ? "error" : c ? "slow" : ""}">
            <td><span class="duration ${c ? "duration--slow" : ""}">${v(i.duration)}</span></td>
            <td>${o(d(i.row_count || 0))}</td>
            <td><span class="timestamp">${o(f(i.timestamp))}</span></td>
            <td>${h ? '<span class="badge badge--status-error">Error</span>' : ""}</td>
            <td><span class="query-text">${o(i.query || "")}</span></td>
          </tr>
        `;
    }).join("")}</tbody>
      </table>
    `;
  }
  renderLogs() {
    const { level: t, search: e } = this.filters.logs, s = e.toLowerCase(), a = this.state.logs.filter((l) => {
      if (t !== "all" && (l.level || "").toLowerCase() !== t)
        return !1;
      const i = `${l.message || ""} ${l.source || ""} ${g(l.fields || {})}`.toLowerCase();
      return !(s && !i.includes(s));
    });
    return a.length === 0 ? this.renderEmptyState("No logs captured yet.") : `
      <table class="debug-table">
        <thead>
          <tr>
            <th>Level</th>
            <th>Time</th>
            <th>Message</th>
            <th>Source</th>
          </tr>
        </thead>
        <tbody>${a.map((l) => {
      const i = (l.level || "info").toLowerCase(), c = `badge--level-${i}`;
      return `
          <tr class="${i === "error" || i === "fatal" ? "error" : ""}">
            <td><span class="badge ${c}">${o((l.level || "info").toUpperCase())}</span></td>
            <td><span class="timestamp">${o(f(l.timestamp))}</span></td>
            <td><span class="message">${o(l.message || "")}</span></td>
            <td><span class="timestamp">${o(l.source || "")}</span></td>
          </tr>
        `;
    }).join("")}</tbody>
      </table>
    `;
  }
  renderRoutes() {
    const { method: t, search: e } = this.filters.routes, s = e.toLowerCase(), a = this.state.routes.filter((l) => {
      if (t !== "all" && (l.method || "").toUpperCase() !== t)
        return !1;
      const i = `${l.path || ""} ${l.handler || ""} ${l.summary || ""}`.toLowerCase();
      return !(s && !i.includes(s));
    });
    return a.length === 0 ? this.renderEmptyState("No routes captured yet.") : `
      <table class="debug-table debug-routes-table">
        <thead>
          <tr>
            <th>Method</th>
            <th>Path</th>
            <th>Handler</th>
            <th>Name</th>
          </tr>
        </thead>
        <tbody>${a.map((l) => `
          <tr>
            <td><span class="badge ${`badge--method-${(l.method || "get").toLowerCase()}`}">${o(l.method || "")}</span></td>
            <td><span class="path">${o(l.path || "")}</span></td>
            <td><span class="timestamp">${o(l.handler || "")}</span></td>
            <td><span class="timestamp">${o(l.name || "")}</span></td>
          </tr>
        `).join("")}</tbody>
      </table>
    `;
  }
  renderCustom() {
    const { search: t } = this.filters.custom, e = q(this.state.custom.data, t);
    this.renderJSONPanel("Custom Data", e, "");
    const s = this.state.custom.logs, a = s.length ? s.map((l) => `
              <tr>
                <td><span class="badge badge--custom">${o(l.category || "custom")}</span></td>
                <td><span class="timestamp">${o(f(l.timestamp))}</span></td>
                <td><span class="message">${o(l.message || "")}</span></td>
              </tr>
            `).join("") : "", n = s.length ? `
        <table class="debug-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Time</th>
              <th>Message</th>
            </tr>
          </thead>
          <tbody>${a}</tbody>
        </table>
      ` : this.renderEmptyState("No custom logs yet.");
    return `
      <div class="debug-json-grid">
        <div class="debug-json-panel">
          <div class="debug-json-header">
            <h3>Custom Data</h3>
            <span class="timestamp">${d(u(e))} keys</span>
          </div>
          <div class="debug-json-content">
            <pre>${o(g(e))}</pre>
          </div>
        </div>
        <div class="debug-json-panel">
          <div class="debug-json-header">
            <h3>Custom Logs</h3>
            <span class="timestamp">${d(s.length)} entries</span>
          </div>
          <div class="debug-json-content">
            ${n}
          </div>
        </div>
      </div>
    `;
  }
  renderJSONPanel(t, e, s) {
    const a = e && typeof e == "object" && !Array.isArray(e), n = Array.isArray(e), l = a ? q(e || {}, s) : e ?? {}, i = u(l), c = n ? "items" : a ? "keys" : "entries";
    return `
      <section class="debug-json-panel">
        <div class="debug-json-header">
          <h3>${o(t)}</h3>
          <span class="debug-muted">${d(i)} ${c}</span>
        </div>
        <pre>${o(g(l))}</pre>
      </section>
    `;
  }
  panelCount(t) {
    switch (t) {
      case "template":
        return u(this.state.template);
      case "session":
        return u(this.state.session);
      case "requests":
        return this.state.requests.length;
      case "sql":
        return this.state.sql.length;
      case "logs":
        return this.state.logs.length;
      case "config":
        return u(this.state.config);
      case "routes":
        return this.state.routes.length;
      case "custom":
        return u(this.state.custom.data) + this.state.custom.logs.length;
      default:
        return u(this.state.extra[t]);
    }
  }
  renderEmptyState(t) {
    return `
      <div class="debug-empty">
        <p>${o(t)}</p>
      </div>
    `;
  }
  renderSelectOptions(t, e) {
    return t.map((s) => {
      const a = s.toLowerCase() === e.toLowerCase() ? "selected" : "";
      return `<option value="${o(s)}" ${a}>${o(s)}</option>`;
    }).join("");
  }
  updateTabCounts() {
    this.panels.forEach((t) => {
      const e = this.panelCount(t), s = this.tabsEl.querySelector(`[data-panel-count="${t}"]`);
      s && (s.textContent = d(e));
    });
  }
  updateConnectionStatus(t) {
    this.connectionEl.textContent = t, this.statusEl.setAttribute("data-status", t);
  }
  updateStatusMeta() {
    this.eventCountEl.textContent = `${d(this.eventCount)} events`, this.lastEventAt && (this.lastEventEl.textContent = this.lastEventAt.toLocaleTimeString());
  }
  handleEvent(t) {
    if (!t || !t.type)
      return;
    if (t.type === "snapshot") {
      this.applySnapshot(t.payload);
      return;
    }
    if (this.eventCount += 1, this.lastEventAt = /* @__PURE__ */ new Date(), this.updateStatusMeta(), this.paused)
      return;
    const e = j[t.type] || t.type;
    switch (t.type) {
      case "request":
        this.state.requests.push(t.payload), this.trim(this.state.requests, this.maxLogEntries);
        break;
      case "sql":
        this.state.sql.push(t.payload), this.trim(this.state.sql, this.maxSQLQueries);
        break;
      case "log":
        this.state.logs.push(t.payload), this.trim(this.state.logs, this.maxLogEntries);
        break;
      case "template":
        this.state.template = t.payload || {};
        break;
      case "session":
        this.state.session = t.payload || {};
        break;
      case "custom":
        this.handleCustomEvent(t.payload);
        break;
      default:
        $.has(e) || (this.state.extra[e] = t.payload);
        break;
    }
    this.updateTabCounts(), e === this.activePanel && this.renderPanel();
  }
  handleCustomEvent(t) {
    if (t) {
      if (typeof t == "object" && "key" in t && "value" in t) {
        M(this.state.custom.data, String(t.key), t.value);
        return;
      }
      if (typeof t == "object" && ("category" in t || "message" in t)) {
        this.state.custom.logs.push(t), this.trim(this.state.custom.logs, this.maxLogEntries);
        return;
      }
    }
  }
  applySnapshot(t) {
    const e = t || {};
    this.state.template = e.template || {}, this.state.session = e.session || {}, this.state.requests = p(e.requests), this.state.sql = p(e.sql), this.state.logs = p(e.logs), this.state.config = e.config || {}, this.state.routes = p(e.routes);
    const s = e.custom || {};
    this.state.custom = {
      data: s.data || {},
      logs: p(s.logs)
    };
    const a = {};
    this.panels.forEach((n) => {
      !$.has(n) && n in e && (a[n] = e[n]);
    }), this.state.extra = a, this.updateTabCounts(), this.renderPanel();
  }
  trim(t, e) {
    if (!(!Array.isArray(t) || e <= 0))
      for (; t.length > e; )
        t.shift();
  }
  isSlowQuery(t) {
    if (!t || t.duration === void 0 || t.duration === null)
      return !1;
    const e = Number(t.duration);
    return Number.isNaN(e) ? !1 : e / 1e6 >= this.slowThresholdMs;
  }
  async fetchSnapshot() {
    if (this.debugPath)
      try {
        const t = await fetch(`${this.debugPath}/api/snapshot`, {
          credentials: "same-origin"
        });
        if (!t.ok)
          return;
        const e = await t.json();
        this.applySnapshot(e);
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
    const t = this.activePanel;
    this.stream.clear([t]), fetch(`${this.debugPath}/api/clear/${t}`, { method: "POST", credentials: "same-origin" }).catch(() => {
    });
  }
  togglePause(t) {
    this.paused = !this.paused, t.textContent = this.paused ? "Resume" : "Pause", this.paused || this.stream.requestSnapshot();
  }
}
const R = (r) => {
  const t = r || document.querySelector("[data-debug-console]");
  return t ? new D(t) : null;
}, C = () => {
  R();
};
document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", C) : C();
export {
  D as DebugPanel,
  N as DebugStream,
  R as initDebugPanel
};
//# sourceMappingURL=index.js.map
