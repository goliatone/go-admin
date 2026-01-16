import { D as N, h as k, a as $ } from "../chunks/syntax-highlight-Q2MTgRi9.js";
import { DebugReplPanel as j } from "./repl.js";
const x = ["template", "session", "requests", "sql", "logs", "config", "routes", "custom"], A = /* @__PURE__ */ new Set(["shell", "console"]), w = /* @__PURE__ */ new Set([...x, ...A]), v = {
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
}, O = {
  template: "template",
  session: "session",
  requests: "request",
  sql: "sql",
  logs: "log",
  custom: "custom"
}, M = {
  request: "requests",
  sql: "sql",
  log: "logs",
  template: "template",
  session: "session",
  custom: "custom"
}, q = (r) => {
  if (!r)
    return null;
  try {
    return JSON.parse(r);
  } catch {
    return null;
  }
}, R = (r) => {
  if (!Array.isArray(r))
    return [];
  const t = [];
  return r.forEach((e) => {
    if (!e || typeof e != "object")
      return;
    const s = e, a = typeof s.command == "string" ? s.command.trim() : "";
    if (!a)
      return;
    const n = typeof s.description == "string" ? s.description.trim() : "", l = Array.isArray(s.tags) ? s.tags.filter((c) => typeof c == "string" && c.trim() !== "").map((c) => c.trim()) : [], i = Array.isArray(s.aliases) ? s.aliases.filter((c) => typeof c == "string" && c.trim() !== "").map((c) => c.trim()) : [];
    t.push({
      command: a,
      description: n || void 0,
      tags: l.length > 0 ? l : void 0,
      aliases: i.length > 0 ? i : void 0,
      readOnly: !!s.read_only
    });
  }), t;
}, o = (r) => String(r ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;"), b = (r) => {
  if (!r)
    return "";
  if (typeof r == "number")
    return new Date(r).toLocaleTimeString();
  if (typeof r == "string") {
    const t = new Date(r);
    return Number.isNaN(t.getTime()) ? r : t.toLocaleTimeString();
  }
  return "";
}, C = (r) => {
  if (r == null)
    return "0ms";
  if (typeof r == "string")
    return r;
  const t = Number(r);
  if (Number.isNaN(t))
    return "0ms";
  const e = t / 1e6;
  return e < 1 ? `${(t / 1e3).toFixed(1)}us` : e < 1e3 ? `${e.toFixed(2)}ms` : `${(e / 1e3).toFixed(2)}s`;
}, u = (r) => {
  if (r == null || r === "")
    return "0";
  const t = Number(r);
  return Number.isNaN(t) ? String(r) : t.toLocaleString();
}, D = (r) => {
  if (r === void 0)
    return "{}";
  try {
    return JSON.stringify(r, null, 2);
  } catch {
    return String(r ?? "");
  }
}, d = (r) => r == null ? 0 : Array.isArray(r) ? r.length : typeof r == "object" ? Object.keys(r).length : 1, Q = (r) => Array.isArray(r) && r.length > 0 ? r.filter((t) => typeof t == "string" && t.trim()).map((t) => t.trim()) : [...x], P = (r) => v[r] ? v[r] : r ? r.replace(/[-_.]/g, " ").replace(/\s+/g, " ").trim().replace(/\bsql\b/i, "SQL").replace(/\b([a-z])/g, (t) => t.toUpperCase()) : "", L = (r, t) => {
  if (!t)
    return r;
  const e = t.toLowerCase(), s = {};
  for (const [a, n] of Object.entries(r || {}))
    a.toLowerCase().includes(e) && (s[a] = n);
  return s;
}, F = (r, t, e) => {
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
}, m = (r) => Array.isArray(r) ? r : [], S = (r, t) => {
  if (!r)
    return t;
  const e = Number(r);
  return Number.isNaN(e) ? t : e;
};
class J {
  constructor(t) {
    this.paused = !1, this.eventCount = 0, this.lastEventAt = null, this.container = t;
    const e = q(t.dataset.panels);
    this.panels = Q(e), this.activePanel = this.panels[0] || "template", this.debugPath = t.dataset.debugPath || "", this.maxLogEntries = S(t.dataset.maxLogEntries, 500), this.maxSQLQueries = S(t.dataset.maxSqlQueries, 200), this.slowThresholdMs = S(t.dataset.slowThresholdMs, 50), this.replCommands = R(q(t.dataset.replCommands)), this.state = {
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
    }, this.replPanels = /* @__PURE__ */ new Map(), this.panelRenderers = /* @__PURE__ */ new Map(), A.forEach((s) => {
      this.panelRenderers.set(s, {
        render: () => this.renderReplPanel(s),
        filters: () => '<span class="timestamp">REPL controls are in the panel header.</span>'
      });
    }), this.tabsEl = this.requireElement("[data-debug-tabs]", document), this.panelEl = this.requireElement("[data-debug-panel]", document), this.filtersEl = this.requireElement("[data-debug-filters]", document), this.statusEl = document.querySelector("[data-debug-status]") || this.container, this.connectionEl = this.requireElement("[data-debug-connection]", document), this.eventCountEl = this.requireElement("[data-debug-events]", document), this.lastEventEl = this.requireElement("[data-debug-last]", document), this.renderTabs(), this.renderActivePanel(), this.bindActions(), this.stream = new N({
      basePath: this.debugPath,
      onEvent: (s) => this.handleEvent(s),
      onStatusChange: (s) => this.updateConnectionStatus(s)
    }), this.fetchSnapshot(), this.stream.connect(), this.stream.subscribe(this.panels.map((s) => O[s] || s));
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
            <span class="debug-tab__label">${o(P(e))}</span>
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
    t === "template" ? s = this.renderJSONPanel("Template Context", this.state.template, this.filters.objects.search) : t === "session" ? s = this.renderJSONPanel("Session", this.state.session, this.filters.objects.search) : t === "config" ? s = this.renderJSONPanel("Config", this.state.config, this.filters.objects.search) : t === "requests" ? s = this.renderRequests() : t === "sql" ? s = this.renderSQL() : t === "logs" ? s = this.renderLogs() : t === "routes" ? s = this.renderRoutes() : t === "custom" ? s = this.renderCustom() : s = this.renderJSONPanel(P(t), this.state.extra[t], this.filters.objects.search), this.panelEl.innerHTML = s, t === "logs" && this.filters.logs.autoScroll && (this.panelEl.scrollTop = this.panelEl.scrollHeight), this.attachExpandableRowListeners();
  }
  attachExpandableRowListeners() {
    this.panelEl.querySelectorAll(".expandable-row").forEach((t) => {
      t.addEventListener("click", (e) => {
        if (e.target.closest("a, button")) return;
        e.currentTarget.classList.toggle("expanded");
      });
    });
  }
  renderReplPanel(t) {
    this.panelEl.classList.add("debug-content--repl");
    let e = this.replPanels.get(t);
    e || (e = new j({
      kind: t === "shell" ? "shell" : "console",
      debugPath: this.debugPath,
      commands: t === "console" ? this.replCommands : []
    }), this.replPanels.set(t, e)), e.attach(this.panelEl);
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
      const c = `badge--method-${(i.method || "get").toLowerCase()}`, h = i.status || 0, p = h >= 500 ? "badge--status-error" : h >= 400 ? "badge--status-warn" : "badge--status", f = h >= 400 ? "error" : "", g = i.duration || 0, y = (typeof g == "number" ? g / 1e6 : 0) >= this.slowThresholdMs ? "duration--slow" : "";
      return `
          <tr class="${f}">
            <td><span class="badge ${c}">${o(i.method || "GET")}</span></td>
            <td><span class="path">${o(i.path || "")}</span></td>
            <td><span class="badge ${p}">${o(h)}</span></td>
            <td><span class="duration ${y}">${C(i.duration)}</span></td>
            <td><span class="timestamp">${o(b(i.timestamp))}</span></td>
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
        <tbody>${n.map((i, c) => {
      const h = this.isSlowQuery(i), p = !!i.error, f = ["expandable-row"];
      p && f.push("error"), h && f.push("slow");
      const g = h ? "duration--slow" : "", E = `sql-row-${c}`, y = k(i.query || "", !0);
      return `
          <tr class="${f.join(" ")}" data-row-id="${E}">
            <td><span class="duration ${g}">${C(i.duration)}</span></td>
            <td>${o(u(i.row_count || 0))}</td>
            <td><span class="timestamp">${o(b(i.timestamp))}</span></td>
            <td>${p ? '<span class="badge badge--status-error">Error</span>' : ""}</td>
            <td><span class="query-text"><span class="expand-icon">&#9654;</span>${o(i.query || "")}</span></td>
          </tr>
          <tr class="expansion-row" data-expansion-for="${E}">
            <td colspan="5">
              <div class="expanded-content">
                <pre>${y}</pre>
              </div>
            </td>
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
      const i = `${l.message || ""} ${l.source || ""} ${D(l.fields || {})}`.toLowerCase();
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
            <td><span class="timestamp">${o(b(l.timestamp))}</span></td>
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
    const { search: t } = this.filters.custom, e = L(this.state.custom.data, t);
    this.renderJSONPanel("Custom Data", e, "");
    const s = this.state.custom.logs, a = $(e, !0), n = s.length ? s.map((i) => `
              <tr>
                <td><span class="badge badge--custom">${o(i.category || "custom")}</span></td>
                <td><span class="timestamp">${o(b(i.timestamp))}</span></td>
                <td><span class="message">${o(i.message || "")}</span></td>
              </tr>
            `).join("") : "", l = s.length ? `
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
            <span class="timestamp">${u(d(e))} keys</span>
          </div>
          <div class="debug-json-content">
            <pre>${a}</pre>
          </div>
        </div>
        <div class="debug-json-panel">
          <div class="debug-json-header">
            <h3>Custom Logs</h3>
            <span class="timestamp">${u(s.length)} entries</span>
          </div>
          <div class="debug-json-content">
            ${l}
          </div>
        </div>
      </div>
    `;
  }
  renderJSONPanel(t, e, s) {
    const a = e && typeof e == "object" && !Array.isArray(e), n = Array.isArray(e), l = a ? L(e || {}, s) : e ?? {}, i = d(l), c = n ? "items" : a ? "keys" : "entries", h = $(l, !0);
    return `
      <section class="debug-json-panel">
        <div class="debug-json-header">
          <h3>${o(t)}</h3>
          <span class="debug-muted">${u(i)} ${c}</span>
        </div>
        <pre>${h}</pre>
      </section>
    `;
  }
  panelCount(t) {
    switch (t) {
      case "template":
        return d(this.state.template);
      case "session":
        return d(this.state.session);
      case "requests":
        return this.state.requests.length;
      case "sql":
        return this.state.sql.length;
      case "logs":
        return this.state.logs.length;
      case "config":
        return d(this.state.config);
      case "routes":
        return this.state.routes.length;
      case "custom":
        return d(this.state.custom.data) + this.state.custom.logs.length;
      default:
        return d(this.state.extra[t]);
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
      s && (s.textContent = u(e));
    });
  }
  updateConnectionStatus(t) {
    this.connectionEl.textContent = t, this.statusEl.setAttribute("data-status", t);
  }
  updateStatusMeta() {
    this.eventCountEl.textContent = `${u(this.eventCount)} events`, this.lastEventAt && (this.lastEventEl.textContent = this.lastEventAt.toLocaleTimeString());
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
    const e = M[t.type] || t.type;
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
        w.has(e) || (this.state.extra[e] = t.payload);
        break;
    }
    this.updateTabCounts(), e === this.activePanel && this.renderPanel();
  }
  handleCustomEvent(t) {
    if (t) {
      if (typeof t == "object" && "key" in t && "value" in t) {
        F(this.state.custom.data, String(t.key), t.value);
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
    this.state.template = e.template || {}, this.state.session = e.session || {}, this.state.requests = m(e.requests), this.state.sql = m(e.sql), this.state.logs = m(e.logs), this.state.config = e.config || {}, this.state.routes = m(e.routes);
    const s = e.custom || {};
    this.state.custom = {
      data: s.data || {},
      logs: m(s.logs)
    };
    const a = {};
    this.panels.forEach((n) => {
      !w.has(n) && n in e && (a[n] = e[n]);
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
const H = (r) => {
  const t = r || document.querySelector("[data-debug-console]");
  return t ? new J(t) : null;
}, T = () => {
  H();
};
document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", T) : T();
export {
  J as DebugPanel,
  N as DebugStream,
  H as initDebugPanel
};
//# sourceMappingURL=index.js.map
