import { D as v } from "../chunks/debug-stream-DXYTUS6I.js";
const w = `
  :host {
    --toolbar-bg: #1e1e2e;
    --toolbar-bg-secondary: #181825;
    --toolbar-border: #313244;
    --toolbar-text: #cdd6f4;
    --toolbar-text-muted: #6c7086;
    --toolbar-accent: #89b4fa;
    --toolbar-accent-hover: #b4befe;
    --toolbar-success: #a6e3a1;
    --toolbar-warning: #f9e2af;
    --toolbar-error: #f38ba8;
    --toolbar-info: #89dceb;
    --toolbar-height-collapsed: 36px;
    --toolbar-height-expanded: 320px;
    --toolbar-font: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;

    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 99999;
    font-family: var(--toolbar-font);
    font-size: 12px;
    line-height: 1.4;
    pointer-events: auto;
  }

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  .toolbar {
    background: var(--toolbar-bg);
    border-top: 1px solid var(--toolbar-border);
    color: var(--toolbar-text);
    transition: height 0.2s ease-out;
    display: flex;
    flex-direction: column;
  }

  .toolbar.collapsed {
    height: var(--toolbar-height-collapsed);
  }

  .toolbar.expanded {
    height: var(--toolbar-height-expanded);
  }

  /* Header with tabs */
  .toolbar-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 12px;
    height: 36px;
    min-height: 36px;
    border-bottom: 1px solid var(--toolbar-border);
    background: var(--toolbar-bg-secondary);
  }

  .toolbar-tabs {
    display: flex;
    gap: 2px;
    overflow-x: auto;
    scrollbar-width: none;
  }

  .toolbar-tabs::-webkit-scrollbar {
    display: none;
  }

  .tab {
    background: transparent;
    border: none;
    color: var(--toolbar-text-muted);
    padding: 6px 10px;
    cursor: pointer;
    border-radius: 4px;
    font-size: 11px;
    font-family: inherit;
    white-space: nowrap;
    transition: all 0.15s ease;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .tab:hover {
    background: rgba(137, 180, 250, 0.1);
    color: var(--toolbar-text);
  }

  .tab.active {
    background: var(--toolbar-accent);
    color: var(--toolbar-bg);
  }

  .tab-count {
    font-size: 10px;
    background: rgba(255, 255, 255, 0.15);
    padding: 1px 5px;
    border-radius: 8px;
    min-width: 18px;
    text-align: center;
  }

  .tab.active .tab-count {
    background: rgba(0, 0, 0, 0.2);
  }

  /* Actions */
  .toolbar-actions {
    display: flex;
    gap: 4px;
    align-items: center;
  }

  .action-btn {
    background: transparent;
    border: none;
    color: var(--toolbar-text-muted);
    cursor: pointer;
    padding: 6px 8px;
    font-size: 14px;
    font-family: inherit;
    border-radius: 4px;
    transition: all 0.15s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .action-btn:hover {
    background: rgba(137, 180, 250, 0.1);
    color: var(--toolbar-text);
  }

  .action-btn.toggle-btn {
    font-size: 12px;
    padding: 6px 10px;
  }

  .expand-link {
    color: var(--toolbar-text-muted);
    text-decoration: none;
    padding: 6px 8px;
    font-size: 14px;
    border-radius: 4px;
    transition: all 0.15s ease;
  }

  .expand-link:hover {
    background: rgba(137, 180, 250, 0.1);
    color: var(--toolbar-text);
  }

  /* Content area */
  .toolbar-content {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .panel-container {
    flex: 1;
    overflow: auto;
    padding: 8px 12px;
    scrollbar-width: thin;
    scrollbar-color: var(--toolbar-border) transparent;
  }

  .panel-container::-webkit-scrollbar {
    width: 6px;
  }

  .panel-container::-webkit-scrollbar-track {
    background: transparent;
  }

  .panel-container::-webkit-scrollbar-thumb {
    background: var(--toolbar-border);
    border-radius: 3px;
  }

  /* Summary bar (shown when collapsed) */
  .toolbar-summary {
    display: flex;
    gap: 16px;
    padding: 0 12px;
    height: 36px;
    align-items: center;
    cursor: pointer;
    background: var(--toolbar-bg);
    transition: background 0.15s ease;
  }

  .toolbar-summary:hover {
    background: var(--toolbar-bg-secondary);
  }

  .toolbar.expanded .toolbar-summary {
    display: none;
  }

  .summary-item {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--toolbar-text-muted);
    font-size: 11px;
  }

  .summary-item .count {
    color: var(--toolbar-text);
    font-weight: 600;
  }

  .summary-item.has-errors .count {
    color: var(--toolbar-error);
  }

  .summary-item.has-slow .count {
    color: var(--toolbar-warning);
  }

  .connection-status {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-left: auto;
  }

  .status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--toolbar-text-muted);
  }

  .status-dot.connected {
    background: var(--toolbar-success);
    box-shadow: 0 0 4px var(--toolbar-success);
  }

  .status-dot.error {
    background: var(--toolbar-error);
    box-shadow: 0 0 4px var(--toolbar-error);
  }

  .status-dot.reconnecting {
    background: var(--toolbar-warning);
    animation: pulse 1s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }

  /* Table styles */
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 11px;
  }

  th, td {
    text-align: left;
    padding: 6px 8px;
    border-bottom: 1px solid var(--toolbar-border);
    vertical-align: top;
  }

  th {
    color: var(--toolbar-text-muted);
    font-weight: 500;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    position: sticky;
    top: 0;
    background: var(--toolbar-bg);
    z-index: 1;
  }

  tr:hover td {
    background: rgba(137, 180, 250, 0.05);
  }

  /* Badges */
  .badge {
    display: inline-block;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .badge-method {
    background: rgba(137, 180, 250, 0.2);
    color: var(--toolbar-accent);
  }

  .badge-method.get { background: rgba(166, 227, 161, 0.2); color: var(--toolbar-success); }
  .badge-method.post { background: rgba(137, 180, 250, 0.2); color: var(--toolbar-accent); }
  .badge-method.put { background: rgba(249, 226, 175, 0.2); color: var(--toolbar-warning); }
  .badge-method.patch { background: rgba(249, 226, 175, 0.2); color: var(--toolbar-warning); }
  .badge-method.delete { background: rgba(243, 139, 168, 0.2); color: var(--toolbar-error); }

  .badge-status {
    background: rgba(166, 227, 161, 0.2);
    color: var(--toolbar-success);
  }

  .badge-status.error {
    background: rgba(243, 139, 168, 0.2);
    color: var(--toolbar-error);
  }

  .badge-status.warn {
    background: rgba(249, 226, 175, 0.2);
    color: var(--toolbar-warning);
  }

  .badge-level {
    min-width: 40px;
    text-align: center;
  }

  .badge-level.debug { background: rgba(108, 112, 134, 0.3); color: var(--toolbar-text-muted); }
  .badge-level.info { background: rgba(137, 220, 235, 0.2); color: var(--toolbar-info); }
  .badge-level.warn { background: rgba(249, 226, 175, 0.2); color: var(--toolbar-warning); }
  .badge-level.error { background: rgba(243, 139, 168, 0.2); color: var(--toolbar-error); }

  /* Query highlighting */
  .slow-query {
    color: var(--toolbar-warning);
  }

  .error-query {
    color: var(--toolbar-error);
  }

  /* Code/pre */
  pre, code {
    font-family: var(--toolbar-font);
    font-size: 11px;
  }

  pre {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
    color: var(--toolbar-text);
  }

  .query-text {
    max-width: 400px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .query-text:hover {
    white-space: pre-wrap;
    word-break: break-all;
  }

  /* Empty state */
  .empty-state {
    color: var(--toolbar-text-muted);
    text-align: center;
    padding: 24px;
    font-size: 12px;
  }

  /* JSON viewer */
  .json-viewer {
    background: var(--toolbar-bg-secondary);
    border-radius: 4px;
    padding: 8px;
    overflow: auto;
    max-height: 100%;
  }

  .json-viewer pre {
    font-size: 11px;
    line-height: 1.5;
  }

  /* Duration formatting */
  .duration {
    color: var(--toolbar-text-muted);
    font-variant-numeric: tabular-nums;
  }

  .duration.slow {
    color: var(--toolbar-warning);
    font-weight: 600;
  }

  /* Timestamp */
  .timestamp {
    color: var(--toolbar-text-muted);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  /* Path/URL */
  .path {
    color: var(--toolbar-text);
    max-width: 300px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* Message */
  .message {
    color: var(--toolbar-text);
    max-width: 400px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .message:hover {
    white-space: normal;
    word-break: break-word;
  }

  /* Responsive */
  @media (max-width: 768px) {
    :host {
      --toolbar-height-expanded: 50vh;
    }

    .toolbar-tabs {
      max-width: 60%;
    }
  }
`, n = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;"), d = (s) => {
  if (!s) return "";
  if (typeof s == "number")
    return new Date(s).toLocaleTimeString();
  if (typeof s == "string") {
    const t = new Date(s);
    return Number.isNaN(t.getTime()) ? s : t.toLocaleTimeString();
  }
  return "";
}, f = (s, t = 50) => {
  if (s == null)
    return { text: "0ms", isSlow: !1 };
  const e = Number(s);
  if (Number.isNaN(e))
    return { text: "0ms", isSlow: !1 };
  const a = e / 1e6, r = a >= t;
  return a < 1 ? { text: `${(e / 1e3).toFixed(1)}µs`, isSlow: r } : a < 1e3 ? { text: `${a.toFixed(2)}ms`, isSlow: r } : { text: `${(a / 1e3).toFixed(2)}s`, isSlow: r };
}, x = (s) => {
  if (s == null) return "{}";
  try {
    return JSON.stringify(s, null, 2);
  } catch {
    return String(s ?? "");
  }
}, b = (s, t) => s ? s.length > t ? s.substring(0, t) + "..." : s : "", y = (s) => s ? s >= 500 ? "error" : s >= 400 ? "warn" : "" : "", k = (s) => {
  if (!s) return "info";
  const t = s.toLowerCase();
  return t === "error" || t === "fatal" ? "error" : t === "warn" || t === "warning" ? "warn" : t === "debug" || t === "trace" ? "debug" : "info";
};
function u(s, t, e = 50) {
  switch (s) {
    case "requests":
      return S(t.requests || []);
    case "sql":
      return $(t.sql || [], e);
    case "logs":
      return q(t.logs || []);
    case "config":
      return p("Config", t.config || {});
    case "routes":
      return C(t.routes || []);
    case "template":
      return p("Template Context", t.template || {});
    case "session":
      return p("Session", t.session || {});
    case "custom":
      return L(t.custom || {});
    default:
      return `<div class="empty-state">Panel "${n(s)}" not available</div>`;
  }
}
function S(s) {
  return s.length ? `
    <table>
      <thead>
        <tr>
          <th>Method</th>
          <th>Path</th>
          <th>Status</th>
          <th>Duration</th>
          <th>Time</th>
        </tr>
      </thead>
      <tbody>${s.slice(-50).reverse().map((e) => {
    const a = (e.method || "get").toLowerCase(), r = y(e.status), o = f(e.duration);
    return `
        <tr>
          <td><span class="badge badge-method ${a}">${n(e.method || "GET")}</span></td>
          <td class="path" title="${n(e.path || "")}">${n(b(e.path || "", 50))}</td>
          <td><span class="badge badge-status ${r}">${n(e.status || "-")}</span></td>
          <td class="duration ${o.isSlow ? "slow" : ""}">${o.text}</td>
          <td class="timestamp">${n(d(e.timestamp))}</td>
        </tr>
      `;
  }).join("")}</tbody>
    </table>
  ` : '<div class="empty-state">No requests captured</div>';
}
function $(s, t) {
  return s.length ? `
    <table>
      <thead>
        <tr>
          <th>Query</th>
          <th>Duration</th>
          <th>Rows</th>
          <th>Time</th>
        </tr>
      </thead>
      <tbody>${s.slice(-50).reverse().map((a) => {
    const r = f(a.duration, t), o = [];
    return r.isSlow && o.push("slow-query"), a.error && o.push("error-query"), `
        <tr class="${o.join(" ")}">
          <td class="query-text" title="${n(a.query || "")}">${n(b(a.query || "", 80))}</td>
          <td class="duration ${r.isSlow ? "slow" : ""}">${r.text}</td>
          <td>${n(a.row_count ?? "-")}</td>
          <td class="timestamp">${n(d(a.timestamp))}</td>
        </tr>
      `;
  }).join("")}</tbody>
    </table>
  ` : '<div class="empty-state">No SQL queries captured</div>';
}
function q(s) {
  return s.length ? `
    <table>
      <thead>
        <tr>
          <th>Level</th>
          <th>Message</th>
          <th>Time</th>
        </tr>
      </thead>
      <tbody>${s.slice(-100).reverse().map((e) => `
        <tr>
          <td><span class="badge badge-level ${k(e.level)}">${n((e.level || "INFO").toUpperCase())}</span></td>
          <td class="message" title="${n(e.message || "")}">${n(b(e.message || "", 100))}</td>
          <td class="timestamp">${n(d(e.timestamp))}</td>
        </tr>
      `).join("")}</tbody>
    </table>
  ` : '<div class="empty-state">No logs captured</div>';
}
function C(s) {
  return s.length ? `
    <table>
      <thead>
        <tr>
          <th>Method</th>
          <th>Path</th>
          <th>Handler</th>
        </tr>
      </thead>
      <tbody>${s.map((e) => `
        <tr>
          <td><span class="badge badge-method ${(e.method || "get").toLowerCase()}">${n(e.method || "")}</span></td>
          <td class="path">${n(e.path || "")}</td>
          <td>${n(e.handler || "-")}</td>
        </tr>
      `).join("")}</tbody>
    </table>
  ` : '<div class="empty-state">No routes available</div>';
}
function p(s, t) {
  return Object.keys(t || {}).length ? `
    <div class="json-viewer">
      <pre>${n(x(t))}</pre>
    </div>
  ` : `<div class="empty-state">No ${s.toLowerCase()} data available</div>`;
}
function L(s) {
  const t = s.data || {}, e = s.logs || [];
  if (!Object.keys(t).length && !e.length)
    return '<div class="empty-state">No custom data captured</div>';
  let a = "";
  if (Object.keys(t).length && (a += `
      <div class="json-viewer">
        <pre>${n(x(t))}</pre>
      </div>
    `), e.length) {
    const r = e.slice(-50).reverse().map((o) => `
        <tr>
          <td><span class="badge">${n(o.category || "custom")}</span></td>
          <td class="message">${n(o.message || "")}</td>
          <td class="timestamp">${n(d(o.timestamp))}</td>
        </tr>
      `).join("");
    a += `
      <table>
        <thead>
          <tr>
            <th>Category</th>
            <th>Message</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>${r}</tbody>
      </table>
    `;
  }
  return a;
}
function g(s) {
  const t = s.requests?.length || 0, e = s.sql?.length || 0, a = s.logs?.length || 0, r = (s.requests || []).filter((l) => (l.status || 0) >= 400).length, o = (s.sql || []).filter((l) => l.error).length, i = (s.logs || []).filter((l) => {
    const c = (l.level || "").toLowerCase();
    return c === "error" || c === "fatal";
  }).length, h = (s.sql || []).filter((l) => {
    const c = Number(l.duration);
    return Number.isNaN(c) ? !1 : c / 1e6 >= 50;
  }).length;
  return {
    requests: t,
    sql: e,
    logs: a,
    errors: r + o + i,
    slowQueries: h
  };
}
const m = ["requests", "sql", "logs", "routes", "config"], T = {
  template: "Template",
  session: "Session",
  requests: "Requests",
  sql: "SQL",
  logs: "Logs",
  config: "Config",
  routes: "Routes",
  custom: "Custom"
}, E = {
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
};
class N extends HTMLElement {
  constructor() {
    super(), this.stream = null, this.snapshot = {}, this.expanded = !1, this.activePanel = "requests", this.connectionStatus = "disconnected", this.slowThresholdMs = 50, this.shadow = this.attachShadow({ mode: "open" });
  }
  static get observedAttributes() {
    return ["base-path", "debug-path", "panels", "expanded", "slow-threshold-ms"];
  }
  connectedCallback() {
    this.render(), this.initWebSocket(), this.fetchInitialSnapshot();
  }
  disconnectedCallback() {
    this.stream?.close();
  }
  attributeChangedCallback(t, e, a) {
    e !== a && (t === "expanded" ? (this.expanded = a === "true" || a === "", this.render()) : t === "slow-threshold-ms" && (this.slowThresholdMs = parseInt(a || "50", 10) || 50));
  }
  // Attribute getters
  get basePath() {
    return this.getAttribute("base-path") || "/admin";
  }
  get debugPath() {
    const t = this.getAttribute("debug-path");
    return t || `${this.basePath}/debug`;
  }
  get panels() {
    const t = this.getAttribute("panels");
    if (t) {
      const e = t.split(",").map((a) => a.trim().toLowerCase()).filter(Boolean);
      return e.length ? e : m;
    }
    return m;
  }
  get wsUrl() {
    return `${this.debugPath}/ws`;
  }
  // WebSocket initialization
  initWebSocket() {
    this.stream = new v({
      basePath: this.debugPath,
      onEvent: (t) => this.handleEvent(t),
      onStatusChange: (t) => this.handleStatusChange(t)
    }), this.stream.connect(), this.stream.subscribe(this.panels.map((t) => E[t] || t));
  }
  // Fetch initial snapshot via HTTP
  async fetchInitialSnapshot() {
    try {
      const t = await fetch(`${this.debugPath}/api/snapshot`, {
        credentials: "same-origin"
      });
      if (t.ok) {
        const e = await t.json();
        this.applySnapshot(e);
      }
    } catch {
    }
  }
  // Event handlers
  handleEvent(t) {
    if (!t || !t.type) return;
    if (t.type === "snapshot") {
      this.applySnapshot(t.payload);
      return;
    }
    const e = P[t.type] || t.type;
    switch (t.type) {
      case "request":
        this.snapshot.requests = this.snapshot.requests || [], this.snapshot.requests.push(t.payload), this.trimArray(this.snapshot.requests, 500);
        break;
      case "sql":
        this.snapshot.sql = this.snapshot.sql || [], this.snapshot.sql.push(t.payload), this.trimArray(this.snapshot.sql, 200);
        break;
      case "log":
        this.snapshot.logs = this.snapshot.logs || [], this.snapshot.logs.push(t.payload), this.trimArray(this.snapshot.logs, 500);
        break;
      case "template":
        this.snapshot.template = t.payload || {};
        break;
      case "session":
        this.snapshot.session = t.payload || {};
        break;
      case "custom":
        this.handleCustomEvent(t.payload);
        break;
    }
    (e === this.activePanel || !this.expanded) && this.updateContent();
  }
  handleCustomEvent(t) {
    if (!t || typeof t != "object") return;
    this.snapshot.custom = this.snapshot.custom || { data: {}, logs: [] };
    const e = t;
    "key" in e && "value" in e ? (this.snapshot.custom.data = this.snapshot.custom.data || {}, this.snapshot.custom.data[String(e.key)] = e.value) : ("category" in e || "message" in e) && (this.snapshot.custom.logs = this.snapshot.custom.logs || [], this.snapshot.custom.logs.push(t), this.trimArray(this.snapshot.custom.logs, 500));
  }
  handleStatusChange(t) {
    this.connectionStatus = t, this.updateConnectionStatus();
  }
  applySnapshot(t) {
    this.snapshot = t || {}, this.updateContent();
  }
  trimArray(t, e) {
    for (; t.length > e; )
      t.shift();
  }
  // Rendering
  render() {
    const t = g(this.snapshot), e = this.panels.map((o) => {
      const i = T[o] || o, h = this.getPanelCount(o);
      return `
          <button class="tab ${this.activePanel === o ? "active" : ""}" data-panel="${o}">
            ${i}
            <span class="tab-count">${h}</span>
          </button>
        `;
    }).join(""), a = this.expanded ? "expanded" : "collapsed", r = this.expanded ? "▼" : "▲";
    this.shadow.innerHTML = `
      <style>${w}</style>
      <div class="toolbar ${a}">
        ${this.expanded ? `
          <div class="toolbar-header">
            <div class="toolbar-tabs">${e}</div>
            <div class="toolbar-actions">
              <button class="action-btn" data-action="refresh" title="Refresh">↻</button>
              <button class="action-btn" data-action="clear" title="Clear">🗑</button>
              <a class="expand-link" href="${this.debugPath}" title="Open full debug page">⛶</a>
              <button class="action-btn toggle-btn" data-action="toggle" title="Collapse">${r}</button>
            </div>
          </div>
          <div class="toolbar-content">
            <div class="panel-container" id="panel-content">
              ${u(this.activePanel, this.snapshot, this.slowThresholdMs)}
            </div>
          </div>
        ` : ""}
        <div class="toolbar-summary">
          <div class="summary-item ${t.errors > 0 ? "has-errors" : ""}">
            <span>Requests:</span>
            <span class="count">${t.requests}</span>
          </div>
          <div class="summary-item ${t.slowQueries > 0 ? "has-slow" : ""}">
            <span>SQL:</span>
            <span class="count">${t.sql}</span>
          </div>
          <div class="summary-item">
            <span>Logs:</span>
            <span class="count">${t.logs}</span>
          </div>
          ${t.errors > 0 ? `
            <div class="summary-item has-errors">
              <span>Errors:</span>
              <span class="count">${t.errors}</span>
            </div>
          ` : ""}
          <div class="connection-status">
            <span class="status-dot ${this.connectionStatus}"></span>
            <span>${this.connectionStatus}</span>
          </div>
        </div>
      </div>
    `, this.attachEventListeners();
  }
  updateContent() {
    if (this.expanded) {
      const t = this.shadow.getElementById("panel-content");
      t && (t.innerHTML = u(this.activePanel, this.snapshot, this.slowThresholdMs)), this.panels.forEach((e) => {
        const a = this.shadow.querySelector(`[data-panel="${e}"] .tab-count`);
        a && (a.textContent = String(this.getPanelCount(e)));
      });
    }
    this.updateSummary();
  }
  updateSummary() {
    const t = g(this.snapshot), e = this.shadow.querySelector(".toolbar-summary");
    if (!e) return;
    e.querySelectorAll(".summary-item").forEach((r) => {
      const o = r.querySelector("span:first-child")?.textContent?.replace(":", "").toLowerCase(), i = r.querySelector(".count");
      !i || !o || (o === "requests" ? (i.textContent = String(t.requests), r.classList.toggle("has-errors", t.errors > 0)) : o === "sql" ? (i.textContent = String(t.sql), r.classList.toggle("has-slow", t.slowQueries > 0)) : o === "logs" ? i.textContent = String(t.logs) : o === "errors" && (i.textContent = String(t.errors)));
    });
  }
  updateConnectionStatus() {
    const t = this.shadow.querySelector(".status-dot"), e = this.shadow.querySelector(".connection-status span:last-child");
    t && (t.className = `status-dot ${this.connectionStatus}`), e && (e.textContent = this.connectionStatus);
  }
  getPanelCount(t) {
    switch (t) {
      case "requests":
        return this.snapshot.requests?.length || 0;
      case "sql":
        return this.snapshot.sql?.length || 0;
      case "logs":
        return this.snapshot.logs?.length || 0;
      case "routes":
        return this.snapshot.routes?.length || 0;
      case "template":
        return Object.keys(this.snapshot.template || {}).length;
      case "session":
        return Object.keys(this.snapshot.session || {}).length;
      case "config":
        return Object.keys(this.snapshot.config || {}).length;
      case "custom":
        const e = this.snapshot.custom || {};
        return Object.keys(e.data || {}).length + (e.logs?.length || 0);
      default:
        return 0;
    }
  }
  attachEventListeners() {
    this.shadow.querySelectorAll(".tab").forEach((e) => {
      e.addEventListener("click", (a) => {
        const r = a.currentTarget.dataset.panel;
        if (r && r !== this.activePanel) {
          this.activePanel = r, this.shadow.querySelectorAll(".tab").forEach((i) => i.classList.remove("active")), a.currentTarget.classList.add("active");
          const o = this.shadow.getElementById("panel-content");
          o && (o.innerHTML = u(this.activePanel, this.snapshot, this.slowThresholdMs));
        }
      });
    }), this.shadow.querySelectorAll("[data-action]").forEach((e) => {
      e.addEventListener("click", (a) => {
        switch (a.currentTarget.dataset.action) {
          case "toggle":
            this.expanded = !this.expanded, this.render();
            break;
          case "refresh":
            this.stream?.requestSnapshot();
            break;
          case "clear":
            this.stream?.clear(), this.snapshot = {}, this.updateContent();
            break;
        }
      });
    });
    const t = this.shadow.querySelector(".toolbar-summary");
    t && t.addEventListener("click", () => {
      this.expanded || (this.expanded = !0, this.render());
    });
  }
}
customElements.get("debug-toolbar") || customElements.define("debug-toolbar", N);
export {
  N as DebugToolbar,
  g as getCounts,
  u as renderPanel
};
//# sourceMappingURL=toolbar.js.map
