import { D as T } from "../chunks/debug-stream-DXYTUS6I.js";
const P = ["template", "session", "requests", "sql", "logs", "config", "routes", "custom"], E = new Set(P), y = {
  template: "Template",
  session: "Session",
  requests: "Requests",
  sql: "SQL Queries",
  logs: "Logs",
  config: "Config",
  routes: "Routes",
  custom: "Custom"
}, N = {
  template: "template",
  session: "session",
  requests: "request",
  sql: "sql",
  logs: "log",
  custom: "custom"
}, k = {
  request: "requests",
  sql: "sql",
  log: "logs",
  template: "template",
  session: "session",
  custom: "custom"
}, A = (a) => {
  if (!a)
    return null;
  try {
    return JSON.parse(a);
  } catch {
    return null;
  }
}, o = (a) => String(a ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;"), f = (a) => {
  if (!a)
    return "";
  if (typeof a == "number")
    return new Date(a).toLocaleTimeString();
  if (typeof a == "string") {
    const t = new Date(a);
    return Number.isNaN(t.getTime()) ? a : t.toLocaleTimeString();
  }
  return "";
}, v = (a) => {
  if (a == null)
    return "0ms";
  if (typeof a == "string")
    return a;
  const t = Number(a);
  if (Number.isNaN(t))
    return "0ms";
  const e = t / 1e6;
  return e < 1 ? `${(t / 1e3).toFixed(1)}us` : e < 1e3 ? `${e.toFixed(2)}ms` : `${(e / 1e3).toFixed(2)}s`;
}, d = (a) => {
  if (a == null || a === "")
    return "0";
  const t = Number(a);
  return Number.isNaN(t) ? String(a) : t.toLocaleString();
}, g = (a) => {
  if (a === void 0)
    return "{}";
  try {
    return JSON.stringify(a, null, 2);
  } catch {
    return String(a ?? "");
  }
}, u = (a) => a == null ? 0 : Array.isArray(a) ? a.length : typeof a == "object" ? Object.keys(a).length : 1, j = (a) => Array.isArray(a) && a.length > 0 ? a.filter((t) => typeof t == "string" && t.trim()).map((t) => t.trim()) : [...P], q = (a) => y[a] ? y[a] : a ? a.replace(/[-_.]/g, " ").replace(/\s+/g, " ").trim().replace(/\bsql\b/i, "SQL").replace(/\b([a-z])/g, (t) => t.toUpperCase()) : "", w = (a, t) => {
  if (!t)
    return a;
  const e = t.toLowerCase(), s = {};
  for (const [n, r] of Object.entries(a || {}))
    n.toLowerCase().includes(e) && (s[n] = r);
  return s;
}, O = (a, t, e) => {
  if (!a || !t)
    return;
  const s = t.split(".").map((r) => r.trim()).filter(Boolean);
  if (s.length === 0)
    return;
  let n = a;
  for (let r = 0; r < s.length - 1; r += 1) {
    const i = s[r];
    (!n[i] || typeof n[i] != "object") && (n[i] = {}), n = n[i];
  }
  n[s[s.length - 1]] = e;
}, p = (a) => Array.isArray(a) ? a : [], b = (a, t) => {
  if (!a)
    return t;
  const e = Number(a);
  return Number.isNaN(e) ? t : e;
};
class x {
  constructor(t) {
    this.paused = !1, this.eventCount = 0, this.lastEventAt = null, this.container = t;
    const e = A(t.dataset.panels);
    this.panels = j(e), this.activePanel = this.panels[0] || "template", this.debugPath = t.dataset.debugPath || "", this.maxLogEntries = b(t.dataset.maxLogEntries, 500), this.maxSQLQueries = b(t.dataset.maxSqlQueries, 200), this.slowThresholdMs = b(t.dataset.slowThresholdMs, 50), this.state = {
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
    }, this.tabsEl = this.requireElement("[data-debug-tabs]", document), this.panelEl = this.requireElement("[data-debug-panel]", document), this.filtersEl = this.requireElement("[data-debug-filters]", document), this.statusEl = document.querySelector("[data-debug-status]") || this.container, this.connectionEl = this.requireElement("[data-debug-connection]", document), this.eventCountEl = this.requireElement("[data-debug-events]", document), this.lastEventEl = this.requireElement("[data-debug-last]", document), this.renderTabs(), this.renderActivePanel(), this.bindActions(), this.stream = new T({
      basePath: this.debugPath,
      onEvent: (s) => this.handleEvent(s),
      onStatusChange: (s) => this.updateConnectionStatus(s)
    }), this.fetchSnapshot(), this.stream.connect(), this.stream.subscribe(this.panels.map((s) => N[s] || s));
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
      const n = s.closest("[data-panel]");
      if (!n)
        return;
      const r = n.dataset.panel || "";
      !r || r === this.activePanel || (this.activePanel = r, this.renderActivePanel());
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
            <span class="debug-tab__label">${o(q(e))}</span>
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
    if (t === "requests") {
      const s = this.filters.requests;
      e = `
        <div class="debug-filter">
          <label>Method</label>
          <select data-filter="method">
            ${this.renderSelectOptions(["all", "GET", "POST", "PUT", "PATCH", "DELETE"], s.method)}
          </select>
        </div>
        <div class="debug-filter">
          <label>Status</label>
          <select data-filter="status">
            ${this.renderSelectOptions(["all", "200", "201", "204", "400", "401", "403", "404", "500"], s.status)}
          </select>
        </div>
        <div class="debug-filter debug-filter--grow">
          <label>Search</label>
          <input type="search" data-filter="search" value="${o(s.search)}" placeholder="/admin/users" />
        </div>
      `;
    } else if (t === "sql") {
      const s = this.filters.sql;
      e = `
        <div class="debug-filter debug-filter--grow">
          <label>Search</label>
          <input type="search" data-filter="search" value="${o(s.search)}" placeholder="SELECT" />
        </div>
        <label class="debug-btn">
          <input type="checkbox" data-filter="slowOnly" ${s.slowOnly ? "checked" : ""} />
          <span>Slow only</span>
        </label>
        <label class="debug-btn">
          <input type="checkbox" data-filter="errorOnly" ${s.errorOnly ? "checked" : ""} />
          <span>Errors</span>
        </label>
      `;
    } else if (t === "logs") {
      const s = this.filters.logs;
      e = `
        <div class="debug-filter">
          <label>Level</label>
          <select data-filter="level">
            ${this.renderSelectOptions(["all", "debug", "info", "warn", "error"], s.level)}
          </select>
        </div>
        <div class="debug-filter debug-filter--grow">
          <label>Search</label>
          <input type="search" data-filter="search" value="${o(s.search)}" placeholder="database" />
        </div>
        <label class="debug-btn">
          <input type="checkbox" data-filter="autoScroll" ${s.autoScroll ? "checked" : ""} />
          <span>Auto-scroll</span>
        </label>
      `;
    } else if (t === "routes") {
      const s = this.filters.routes;
      e = `
        <div class="debug-filter">
          <label>Method</label>
          <select data-filter="method">
            ${this.renderSelectOptions(["all", "GET", "POST", "PUT", "PATCH", "DELETE"], s.method)}
          </select>
        </div>
        <div class="debug-filter debug-filter--grow">
          <label>Search</label>
          <input type="search" data-filter="search" value="${o(s.search)}" placeholder="/admin" />
        </div>
      `;
    } else {
      const s = this.filters.objects;
      e = `
        <div class="debug-filter debug-filter--grow">
          <label>Search keys</label>
          <input type="search" data-filter="search" value="${o(s.search)}" placeholder="token" />
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
      e.forEach((n) => {
        const r = n.dataset.filter || "";
        r && r in s && (s[r] = n.value);
      }), this.filters.requests = s;
    } else if (t === "sql") {
      const s = { ...this.filters.sql };
      e.forEach((n) => {
        const r = n.dataset.filter || "";
        r === "slowOnly" || r === "errorOnly" ? s[r] = n.checked : r === "search" && (s[r] = n.value);
      }), this.filters.sql = s;
    } else if (t === "logs") {
      const s = { ...this.filters.logs };
      e.forEach((n) => {
        const r = n.dataset.filter || "";
        r === "autoScroll" ? s[r] = n.checked : (r === "level" || r === "search") && (s[r] = n.value);
      }), this.filters.logs = s;
    } else if (t === "routes") {
      const s = { ...this.filters.routes };
      e.forEach((n) => {
        const r = n.dataset.filter || "";
        r && r in s && (s[r] = n.value);
      }), this.filters.routes = s;
    } else {
      const s = { ...this.filters.objects };
      e.forEach((n) => {
        const r = n.dataset.filter || "";
        r && r in s && (s[r] = n.value);
      }), this.filters.objects = s;
    }
    this.renderPanel();
  }
  renderPanel() {
    const t = this.activePanel;
    let e = "";
    t === "template" ? e = this.renderJSONPanel("Template Context", this.state.template, this.filters.objects.search) : t === "session" ? e = this.renderJSONPanel("Session", this.state.session, this.filters.objects.search) : t === "config" ? e = this.renderJSONPanel("Config", this.state.config, this.filters.objects.search) : t === "requests" ? e = this.renderRequests() : t === "sql" ? e = this.renderSQL() : t === "logs" ? e = this.renderLogs() : t === "routes" ? e = this.renderRoutes() : t === "custom" ? e = this.renderCustom() : e = this.renderJSONPanel(q(t), this.state.extra[t], this.filters.objects.search), this.panelEl.innerHTML = e, t === "logs" && this.filters.logs.autoScroll && (this.panelEl.scrollTop = this.panelEl.scrollHeight);
  }
  renderRequests() {
    const { method: t, status: e, search: s } = this.filters.requests, n = s.toLowerCase(), r = this.state.requests.filter((l) => !(t !== "all" && (l.method || "").toUpperCase() !== t || e !== "all" && String(l.status || "") !== e || n && !(l.path || "").toLowerCase().includes(n)));
    return r.length === 0 ? this.renderEmptyState("No requests captured yet.") : `
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
        <tbody>${r.map((l) => {
      const c = `badge--method-${(l.method || "get").toLowerCase()}`, h = l.status || 0, m = h >= 500 ? "badge--status-error" : h >= 400 ? "badge--status-warn" : "badge--status", S = h >= 400 ? "error" : "", $ = l.duration || 0, L = (typeof $ == "number" ? $ / 1e6 : 0) >= this.slowThresholdMs ? "duration--slow" : "";
      return `
          <tr class="${S}">
            <td><span class="badge ${c}">${o(l.method || "GET")}</span></td>
            <td><span class="path">${o(l.path || "")}</span></td>
            <td><span class="badge ${m}">${o(h)}</span></td>
            <td><span class="duration ${L}">${v(l.duration)}</span></td>
            <td><span class="timestamp">${o(f(l.timestamp))}</span></td>
          </tr>
        `;
    }).join("")}</tbody>
      </table>
    `;
  }
  renderSQL() {
    const { search: t, slowOnly: e, errorOnly: s } = this.filters.sql, n = t.toLowerCase(), r = this.state.sql.filter((l) => !(s && !l.error || e && !this.isSlowQuery(l) || n && !(l.query || "").toLowerCase().includes(n)));
    return r.length === 0 ? this.renderEmptyState("No SQL queries captured yet.") : `
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
        <tbody>${r.map((l) => {
      const c = this.isSlowQuery(l), h = !!l.error;
      return `
          <tr class="${h ? "error" : c ? "slow" : ""}">
            <td><span class="duration ${c ? "duration--slow" : ""}">${v(l.duration)}</span></td>
            <td>${o(d(l.row_count || 0))}</td>
            <td><span class="timestamp">${o(f(l.timestamp))}</span></td>
            <td>${h ? '<span class="badge badge--status-error">Error</span>' : ""}</td>
            <td><span class="query-text">${o(l.query || "")}</span></td>
          </tr>
        `;
    }).join("")}</tbody>
      </table>
    `;
  }
  renderLogs() {
    const { level: t, search: e } = this.filters.logs, s = e.toLowerCase(), n = this.state.logs.filter((i) => {
      if (t !== "all" && (i.level || "").toLowerCase() !== t)
        return !1;
      const l = `${i.message || ""} ${i.source || ""} ${g(i.fields || {})}`.toLowerCase();
      return !(s && !l.includes(s));
    });
    return n.length === 0 ? this.renderEmptyState("No logs captured yet.") : `
      <table class="debug-table">
        <thead>
          <tr>
            <th>Level</th>
            <th>Time</th>
            <th>Message</th>
            <th>Source</th>
          </tr>
        </thead>
        <tbody>${n.map((i) => {
      const l = (i.level || "info").toLowerCase(), c = `badge--level-${l}`;
      return `
          <tr class="${l === "error" || l === "fatal" ? "error" : ""}">
            <td><span class="badge ${c}">${o((i.level || "info").toUpperCase())}</span></td>
            <td><span class="timestamp">${o(f(i.timestamp))}</span></td>
            <td><span class="message">${o(i.message || "")}</span></td>
            <td><span class="timestamp">${o(i.source || "")}</span></td>
          </tr>
        `;
    }).join("")}</tbody>
      </table>
    `;
  }
  renderRoutes() {
    const { method: t, search: e } = this.filters.routes, s = e.toLowerCase(), n = this.state.routes.filter((i) => {
      if (t !== "all" && (i.method || "").toUpperCase() !== t)
        return !1;
      const l = `${i.path || ""} ${i.handler || ""} ${i.summary || ""}`.toLowerCase();
      return !(s && !l.includes(s));
    });
    return n.length === 0 ? this.renderEmptyState("No routes captured yet.") : `
      <table class="debug-table debug-routes-table">
        <thead>
          <tr>
            <th>Method</th>
            <th>Path</th>
            <th>Handler</th>
            <th>Name</th>
          </tr>
        </thead>
        <tbody>${n.map((i) => `
          <tr>
            <td><span class="badge ${`badge--method-${(i.method || "get").toLowerCase()}`}">${o(i.method || "")}</span></td>
            <td><span class="path">${o(i.path || "")}</span></td>
            <td><span class="timestamp">${o(i.handler || "")}</span></td>
            <td><span class="timestamp">${o(i.name || "")}</span></td>
          </tr>
        `).join("")}</tbody>
      </table>
    `;
  }
  renderCustom() {
    const { search: t } = this.filters.custom, e = w(this.state.custom.data, t);
    this.renderJSONPanel("Custom Data", e, "");
    const s = this.state.custom.logs, n = s.length ? s.map((i) => `
              <tr>
                <td><span class="badge badge--custom">${o(i.category || "custom")}</span></td>
                <td><span class="timestamp">${o(f(i.timestamp))}</span></td>
                <td><span class="message">${o(i.message || "")}</span></td>
              </tr>
            `).join("") : "", r = s.length ? `
        <table class="debug-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Time</th>
              <th>Message</th>
            </tr>
          </thead>
          <tbody>${n}</tbody>
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
            ${r}
          </div>
        </div>
      </div>
    `;
  }
  renderJSONPanel(t, e, s) {
    const n = e && typeof e == "object" && !Array.isArray(e), r = Array.isArray(e), i = n ? w(e || {}, s) : e ?? {}, l = u(i), c = r ? "items" : n ? "keys" : "entries";
    return `
      <section class="debug-json-panel">
        <div class="debug-json-header">
          <h3>${o(t)}</h3>
          <span class="debug-muted">${d(l)} ${c}</span>
        </div>
        <pre>${o(g(i))}</pre>
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
      const n = s.toLowerCase() === e.toLowerCase() ? "selected" : "";
      return `<option value="${o(s)}" ${n}>${o(s)}</option>`;
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
    const e = k[t.type] || t.type;
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
        E.has(e) || (this.state.extra[e] = t.payload);
        break;
    }
    this.updateTabCounts(), e === this.activePanel && this.renderPanel();
  }
  handleCustomEvent(t) {
    if (t) {
      if (typeof t == "object" && "key" in t && "value" in t) {
        O(this.state.custom.data, String(t.key), t.value);
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
    const n = {};
    this.panels.forEach((r) => {
      !E.has(r) && r in e && (n[r] = e[r]);
    }), this.state.extra = n, this.updateTabCounts(), this.renderPanel();
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
const M = (a) => {
  const t = a || document.querySelector("[data-debug-console]");
  return t ? new x(t) : null;
}, C = () => {
  M();
};
document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", C) : C();
export {
  x as DebugPanel,
  T as DebugStream,
  M as initDebugPanel
};
//# sourceMappingURL=index.js.map
