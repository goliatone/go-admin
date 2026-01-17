import { D as j, h as O, a as S } from "../chunks/syntax-highlight-BeUtGWoX.js";
import { DebugReplPanel as M } from "./repl.js";
const A = ["template", "session", "requests", "sql", "logs", "config", "routes", "custom"], k = /* @__PURE__ */ new Set(["shell", "console"]), $ = /* @__PURE__ */ new Set([...A, ...k]), C = {
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
}, R = {
  template: "template",
  session: "session",
  requests: "request",
  sql: "sql",
  logs: "log",
  custom: "custom"
}, D = {
  request: "requests",
  sql: "sql",
  log: "logs",
  template: "template",
  session: "session",
  custom: "custom"
}, L = (r) => {
  if (!r)
    return null;
  try {
    return JSON.parse(r);
  } catch {
    return null;
  }
}, F = (r) => {
  if (!Array.isArray(r))
    return [];
  const t = [];
  return r.forEach((e) => {
    if (!e || typeof e != "object")
      return;
    const s = e, a = typeof s.command == "string" ? s.command.trim() : "";
    if (!a)
      return;
    const n = typeof s.description == "string" ? s.description.trim() : "", l = Array.isArray(s.tags) ? s.tags.filter((c) => typeof c == "string" && c.trim() !== "").map((c) => c.trim()) : [], i = Array.isArray(s.aliases) ? s.aliases.filter((c) => typeof c == "string" && c.trim() !== "").map((c) => c.trim()) : [], d = typeof s.mutates == "boolean" ? s.mutates : typeof s.read_only == "boolean" ? !s.read_only : !1;
    t.push({
      command: a,
      description: n || void 0,
      tags: l.length > 0 ? l : void 0,
      aliases: i.length > 0 ? i : void 0,
      mutates: d
    });
  }), t;
}, o = (r) => String(r ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;"), w = (r) => {
  if (!r)
    return "";
  if (typeof r == "number")
    return new Date(r).toLocaleTimeString();
  if (typeof r == "string") {
    const t = new Date(r);
    return Number.isNaN(t.getTime()) ? r : t.toLocaleTimeString();
  }
  return "";
}, q = (r) => {
  if (r == null)
    return "0ms";
  if (typeof r == "string")
    return r;
  const t = Number(r);
  if (Number.isNaN(t))
    return "0ms";
  const e = t / 1e6;
  return e < 1 ? `${(t / 1e3).toFixed(1)}us` : e < 1e3 ? `${e.toFixed(2)}ms` : `${(e / 1e3).toFixed(2)}s`;
}, g = (r) => {
  if (r == null || r === "")
    return "0";
  const t = Number(r);
  return Number.isNaN(t) ? String(r) : t.toLocaleString();
}, E = (r) => {
  if (r === void 0)
    return "{}";
  try {
    return JSON.stringify(r, null, 2);
  } catch {
    return String(r ?? "");
  }
}, Q = async (r, t) => {
  try {
    await navigator.clipboard.writeText(r);
    const e = t.innerHTML;
    t.innerHTML = '<i class="iconoir-check"></i> Copied', t.classList.add("debug-copy--success"), setTimeout(() => {
      t.innerHTML = e, t.classList.remove("debug-copy--success");
    }, 1500);
  } catch {
    t.classList.add("debug-copy--error"), setTimeout(() => {
      t.classList.remove("debug-copy--error");
    }, 1500);
  }
}, p = (r) => r == null ? 0 : Array.isArray(r) ? r.length : typeof r == "object" ? Object.keys(r).length : 1, H = (r) => Array.isArray(r) && r.length > 0 ? r.filter((t) => typeof t == "string" && t.trim()).map((t) => t.trim()) : [...A], P = (r) => C[r] ? C[r] : r ? r.replace(/[-_.]/g, " ").replace(/\s+/g, " ").trim().replace(/\bsql\b/i, "SQL").replace(/\b([a-z])/g, (t) => t.toUpperCase()) : "", T = (r, t) => {
  if (!t)
    return r;
  const e = t.toLowerCase(), s = {};
  for (const [a, n] of Object.entries(r || {}))
    a.toLowerCase().includes(e) && (s[a] = n);
  return s;
}, J = (r, t, e) => {
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
}, m = (r) => Array.isArray(r) ? r : [], v = (r, t) => {
  if (!r)
    return t;
  const e = Number(r);
  return Number.isNaN(e) ? t : e;
};
class _ {
  constructor(t) {
    this.paused = !1, this.eventCount = 0, this.lastEventAt = null, this.container = t;
    const e = L(t.dataset.panels);
    this.panels = H(e), this.activePanel = this.panels[0] || "template", this.debugPath = t.dataset.debugPath || "", this.maxLogEntries = v(t.dataset.maxLogEntries, 500), this.maxSQLQueries = v(t.dataset.maxSqlQueries, 200), this.slowThresholdMs = v(t.dataset.slowThresholdMs, 50), this.replCommands = F(L(t.dataset.replCommands)), this.state = {
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
      logs: { level: "all", search: "", autoScroll: !0, newestFirst: !0 },
      routes: { method: "all", search: "" },
      custom: { search: "" },
      objects: { search: "" }
    }, this.replPanels = /* @__PURE__ */ new Map(), this.panelRenderers = /* @__PURE__ */ new Map(), k.forEach((s) => {
      this.panelRenderers.set(s, {
        render: () => this.renderReplPanel(s),
        filters: () => '<span class="timestamp">REPL controls are in the panel header.</span>'
      });
    }), this.tabsEl = this.requireElement("[data-debug-tabs]", document), this.panelEl = this.requireElement("[data-debug-panel]", document), this.filtersEl = this.requireElement("[data-debug-filters]", document), this.statusEl = document.querySelector("[data-debug-status]") || this.container, this.connectionEl = this.requireElement("[data-debug-connection]", document), this.eventCountEl = this.requireElement("[data-debug-events]", document), this.lastEventEl = this.requireElement("[data-debug-last]", document), this.renderTabs(), this.renderActivePanel(), this.bindActions(), this.stream = new j({
      basePath: this.debugPath,
      onEvent: (s) => this.handleEvent(s),
      onStatusChange: (s) => this.updateConnectionStatus(s)
    }), this.fetchSnapshot(), this.stream.connect(), this.stream.subscribe(this.panels.map((s) => R[s] || s));
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
          <input type="checkbox" data-filter="newestFirst" ${a.newestFirst ? "checked" : ""} />
          <span>Newest first</span>
        </label>
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
        n === "autoScroll" || n === "newestFirst" ? s[n] = a.checked : (n === "level" || n === "search") && (s[n] = a.value);
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
    t === "template" ? s = this.renderJSONPanel("Template Context", this.state.template, this.filters.objects.search) : t === "session" ? s = this.renderJSONPanel("Session", this.state.session, this.filters.objects.search) : t === "config" ? s = this.renderJSONPanel("Config", this.state.config, this.filters.objects.search) : t === "requests" ? s = this.renderRequests() : t === "sql" ? s = this.renderSQL() : t === "logs" ? s = this.renderLogs() : t === "routes" ? s = this.renderRoutes() : t === "custom" ? s = this.renderCustom() : s = this.renderJSONPanel(P(t), this.state.extra[t], this.filters.objects.search), this.panelEl.innerHTML = s, t === "logs" && this.filters.logs.autoScroll && (this.panelEl.scrollTop = this.filters.logs.newestFirst ? 0 : this.panelEl.scrollHeight), this.attachExpandableRowListeners(), this.attachCopyButtonListeners();
  }
  attachExpandableRowListeners() {
    this.panelEl.querySelectorAll(".expandable-row").forEach((t) => {
      t.addEventListener("click", (e) => {
        if (e.target.closest("a, button")) return;
        e.currentTarget.classList.toggle("expanded");
      });
    });
  }
  attachCopyButtonListeners() {
    this.panelEl.querySelectorAll("[data-copy-trigger]").forEach((t) => {
      t.addEventListener("click", (e) => {
        e.preventDefault(), e.stopPropagation();
        const s = t.closest("[data-copy-content]");
        if (!s) return;
        const a = s.getAttribute("data-copy-content") || "";
        Q(a, t);
      });
    });
  }
  renderReplPanel(t) {
    this.panelEl.classList.add("debug-content--repl");
    let e = this.replPanels.get(t);
    e || (e = new M({
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
      const d = `badge--method-${(i.method || "get").toLowerCase()}`, c = i.status || 0, u = c >= 500 ? "badge--status-error" : c >= 400 ? "badge--status-warn" : "badge--status", h = c >= 400 ? "error" : "", b = i.duration || 0, f = (typeof b == "number" ? b / 1e6 : 0) >= this.slowThresholdMs ? "duration--slow" : "";
      return `
          <tr class="${h}">
            <td><span class="badge ${d}">${o(i.method || "GET")}</span></td>
            <td><span class="path">${o(i.path || "")}</span></td>
            <td><span class="badge ${u}">${o(c)}</span></td>
            <td><span class="duration ${f}">${q(i.duration)}</span></td>
            <td><span class="timestamp">${o(w(i.timestamp))}</span></td>
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
        <tbody>${n.map((i, d) => {
      const c = this.isSlowQuery(i), u = !!i.error, h = ["expandable-row"];
      u && h.push("error"), c && h.push("slow");
      const b = c ? "duration--slow" : "", y = `sql-row-${d}`, f = i.query || "", N = O(f, !0);
      return `
          <tr class="${h.join(" ")}" data-row-id="${y}">
            <td><span class="duration ${b}">${q(i.duration)}</span></td>
            <td>${o(g(i.row_count || 0))}</td>
            <td><span class="timestamp">${o(w(i.timestamp))}</span></td>
            <td>${u ? '<span class="badge badge--status-error">Error</span>' : ""}</td>
            <td><span class="query-text"><span class="expand-icon">&#9654;</span>${o(f)}</span></td>
          </tr>
          <tr class="expansion-row" data-expansion-for="${y}">
            <td colspan="5">
              <div class="expanded-content" data-copy-content="${o(f)}">
                <div class="expanded-content__header">
                  <button class="debug-btn debug-copy debug-copy--sm" data-copy-trigger="${y}" title="Copy SQL">
                    <i class="iconoir-copy"></i> Copy
                  </button>
                </div>
                <pre>${N}</pre>
              </div>
            </td>
          </tr>
        `;
    }).join("")}</tbody>
      </table>
    `;
  }
  renderLogs() {
    const { level: t, search: e, newestFirst: s } = this.filters.logs, a = e.toLowerCase();
    let n = this.state.logs.filter((i) => {
      if (t !== "all" && (i.level || "").toLowerCase() !== t)
        return !1;
      const d = `${i.message || ""} ${i.source || ""} ${E(i.fields || {})}`.toLowerCase();
      return !(a && !d.includes(a));
    });
    return n.length === 0 ? this.renderEmptyState("No logs captured yet.") : (s && (n = [...n].reverse()), `
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
      const d = (i.level || "info").toLowerCase(), c = `badge--level-${d}`;
      return `
          <tr class="${d === "error" || d === "fatal" ? "error" : ""}">
            <td><span class="badge ${c}">${o((i.level || "info").toUpperCase())}</span></td>
            <td><span class="timestamp">${o(w(i.timestamp))}</span></td>
            <td><span class="message">${o(i.message || "")}</span></td>
            <td><span class="timestamp">${o(i.source || "")}</span></td>
          </tr>
        `;
    }).join("")}</tbody>
      </table>
    `);
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
    const { search: t } = this.filters.custom, e = T(this.state.custom.data, t), s = this.state.custom.logs, a = S(e, !0), n = E(e), l = s.length ? s.map((d) => `
              <tr>
                <td><span class="badge badge--custom">${o(d.category || "custom")}</span></td>
                <td><span class="timestamp">${o(w(d.timestamp))}</span></td>
                <td><span class="message">${o(d.message || "")}</span></td>
              </tr>
            `).join("") : "", i = s.length ? `
        <table class="debug-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Time</th>
              <th>Message</th>
            </tr>
          </thead>
          <tbody>${l}</tbody>
        </table>
      ` : this.renderEmptyState("No custom logs yet.");
    return `
      <div class="debug-json-grid">
        <div class="debug-json-panel" data-copy-content="${o(n)}">
          <div class="debug-json-header">
            <h3>Custom Data</h3>
            <div class="debug-json-actions">
              <span class="timestamp">${g(p(e))} keys</span>
              <button class="debug-btn debug-copy" data-copy-trigger="custom-data" title="Copy to clipboard">
                <i class="iconoir-copy"></i> Copy
              </button>
            </div>
          </div>
          <div class="debug-json-content">
            <pre>${a}</pre>
          </div>
        </div>
        <div class="debug-json-panel">
          <div class="debug-json-header">
            <h3>Custom Logs</h3>
            <span class="timestamp">${g(s.length)} entries</span>
          </div>
          <div class="debug-json-content">
            ${i}
          </div>
        </div>
      </div>
    `;
  }
  renderJSONPanel(t, e, s) {
    const a = e && typeof e == "object" && !Array.isArray(e), n = Array.isArray(e), l = a ? T(e || {}, s) : e ?? {}, i = p(l), d = n ? "items" : a ? "keys" : "entries", c = S(l, !0), u = E(l), h = `copy-${t.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`;
    return `
      <section class="debug-json-panel" data-copy-content="${o(u)}">
        <div class="debug-json-header">
          <h3>${o(t)}</h3>
          <div class="debug-json-actions">
            <span class="debug-muted">${g(i)} ${d}</span>
            <button class="debug-btn debug-copy" data-copy-trigger="${h}" title="Copy to clipboard">
              <i class="iconoir-copy"></i> Copy
            </button>
          </div>
        </div>
        <pre>${c}</pre>
      </section>
    `;
  }
  panelCount(t) {
    switch (t) {
      case "template":
        return p(this.state.template);
      case "session":
        return p(this.state.session);
      case "requests":
        return this.state.requests.length;
      case "sql":
        return this.state.sql.length;
      case "logs":
        return this.state.logs.length;
      case "config":
        return p(this.state.config);
      case "routes":
        return this.state.routes.length;
      case "custom":
        return p(this.state.custom.data) + this.state.custom.logs.length;
      default:
        return p(this.state.extra[t]);
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
      s && (s.textContent = g(e));
    });
  }
  updateConnectionStatus(t) {
    this.connectionEl.textContent = t, this.statusEl.setAttribute("data-status", t);
  }
  updateStatusMeta() {
    this.eventCountEl.textContent = `${g(this.eventCount)} events`, this.lastEventAt && (this.lastEventEl.textContent = this.lastEventAt.toLocaleTimeString());
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
    const e = D[t.type] || t.type;
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
        J(this.state.custom.data, String(t.key), t.value);
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
const I = (r) => {
  const t = r || document.querySelector("[data-debug-console]");
  return t ? new _(t) : null;
}, x = () => {
  I();
};
document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", x) : x();
export {
  _ as DebugPanel,
  j as DebugStream,
  I as initDebugPanel
};
//# sourceMappingURL=index.js.map
