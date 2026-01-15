import { D as x } from "../chunks/debug-stream-DXYTUS6I.js";
const S = `
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
    transition: height 0.2s ease-out, transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease;
    display: flex;
    flex-direction: column;
  }

  .toolbar.collapsed {
    height: var(--toolbar-height-collapsed);
  }

  .toolbar.expanded {
    height: var(--toolbar-height-expanded);
  }

  .toolbar.hidden {
    transform: translateY(100%);
    opacity: 0;
    pointer-events: none;
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

  .connection-indicator {
    display: flex;
    align-items: center;
    padding: 0 8px;
  }

  .connection-indicator .status-dot {
    width: 8px;
    height: 8px;
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

  .action-btn.collapse-btn:hover {
    background: rgba(243, 139, 168, 0.2);
    color: var(--toolbar-error);
  }

  .expand-link {
    color: var(--toolbar-text-muted);
    text-decoration: none;
    padding: 6px 8px;
    font-size: 14px;
    border-radius: 4px;
    transition: all 0.15s ease;
    display: flex;
    align-items: center;
    justify-content: center;
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
`, n = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;"), u = (s) => {
  if (!s) return "";
  if (typeof s == "number")
    return new Date(s).toLocaleTimeString();
  if (typeof s == "string") {
    const t = new Date(s);
    return Number.isNaN(t.getTime()) ? s : t.toLocaleTimeString();
  }
  return "";
}, v = (s, t = 50) => {
  if (s == null)
    return { text: "0ms", isSlow: !1 };
  const e = Number(s);
  if (Number.isNaN(e))
    return { text: "0ms", isSlow: !1 };
  const a = e / 1e6, o = a >= t;
  return a < 1 ? { text: `${(e / 1e3).toFixed(1)}µs`, isSlow: o } : a < 1e3 ? { text: `${a.toFixed(2)}ms`, isSlow: o } : { text: `${(a / 1e3).toFixed(2)}s`, isSlow: o };
}, w = (s) => {
  if (s == null) return "{}";
  try {
    return JSON.stringify(s, null, 2);
  } catch {
    return String(s ?? "");
  }
}, g = (s, t) => s ? s.length > t ? s.substring(0, t) + "..." : s : "", C = (s) => s ? s >= 500 ? "error" : s >= 400 ? "warn" : "" : "", k = (s) => {
  if (!s) return "info";
  const t = s.toLowerCase();
  return t === "error" || t === "fatal" ? "error" : t === "warn" || t === "warning" ? "warn" : t === "debug" || t === "trace" ? "debug" : "info";
};
function p(s, t, e = 50) {
  switch (s) {
    case "requests":
      return q(t.requests || []);
    case "sql":
      return E(t.sql || [], e);
    case "logs":
      return $(t.logs || []);
    case "config":
      return b("Config", t.config || {});
    case "routes":
      return L(t.routes || []);
    case "template":
      return b("Template Context", t.template || {});
    case "session":
      return b("Session", t.session || {});
    case "custom":
      return M(t.custom || {});
    default:
      return `<div class="empty-state">Panel "${n(s)}" not available</div>`;
  }
}
function q(s) {
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
    const a = (e.method || "get").toLowerCase(), o = C(e.status), r = v(e.duration);
    return `
        <tr>
          <td><span class="badge badge-method ${a}">${n(e.method || "GET")}</span></td>
          <td class="path" title="${n(e.path || "")}">${n(g(e.path || "", 50))}</td>
          <td><span class="badge badge-status ${o}">${n(e.status || "-")}</span></td>
          <td class="duration ${r.isSlow ? "slow" : ""}">${r.text}</td>
          <td class="timestamp">${n(u(e.timestamp))}</td>
        </tr>
      `;
  }).join("")}</tbody>
    </table>
  ` : '<div class="empty-state">No requests captured</div>';
}
function E(s, t) {
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
    const o = v(a.duration, t), r = [];
    return o.isSlow && r.push("slow-query"), a.error && r.push("error-query"), `
        <tr class="${r.join(" ")}">
          <td class="query-text" title="${n(a.query || "")}">${n(g(a.query || "", 80))}</td>
          <td class="duration ${o.isSlow ? "slow" : ""}">${o.text}</td>
          <td>${n(a.row_count ?? "-")}</td>
          <td class="timestamp">${n(u(a.timestamp))}</td>
        </tr>
      `;
  }).join("")}</tbody>
    </table>
  ` : '<div class="empty-state">No SQL queries captured</div>';
}
function $(s) {
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
          <td class="message" title="${n(e.message || "")}">${n(g(e.message || "", 100))}</td>
          <td class="timestamp">${n(u(e.timestamp))}</td>
        </tr>
      `).join("")}</tbody>
    </table>
  ` : '<div class="empty-state">No logs captured</div>';
}
function L(s) {
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
function b(s, t) {
  return Object.keys(t || {}).length ? `
    <div class="json-viewer">
      <pre>${n(w(t))}</pre>
    </div>
  ` : `<div class="empty-state">No ${s.toLowerCase()} data available</div>`;
}
function M(s) {
  const t = s.data || {}, e = s.logs || [];
  if (!Object.keys(t).length && !e.length)
    return '<div class="empty-state">No custom data captured</div>';
  let a = "";
  if (Object.keys(t).length && (a += `
      <div class="json-viewer">
        <pre>${n(w(t))}</pre>
      </div>
    `), e.length) {
    const o = e.slice(-50).reverse().map((r) => `
        <tr>
          <td><span class="badge">${n(r.category || "custom")}</span></td>
          <td class="message">${n(r.message || "")}</td>
          <td class="timestamp">${n(u(r.timestamp))}</td>
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
        <tbody>${o}</tbody>
      </table>
    `;
  }
  return a;
}
function c(s) {
  const t = s.requests?.length || 0, e = s.sql?.length || 0, a = s.logs?.length || 0, o = (s.requests || []).filter((i) => (i.status || 0) >= 400).length, r = (s.sql || []).filter((i) => i.error).length, l = (s.logs || []).filter((i) => {
    const h = (i.level || "").toLowerCase();
    return h === "error" || h === "fatal";
  }).length, d = (s.sql || []).filter((i) => {
    const h = Number(i.duration);
    return Number.isNaN(h) ? !1 : h / 1e6 >= 50;
  }).length;
  return {
    requests: t,
    sql: e,
    logs: a,
    errors: o + r + l,
    slowQueries: d
  };
}
const f = ["requests", "sql", "logs", "routes", "config"], T = {
  template: "Template",
  session: "Session",
  requests: "Requests",
  sql: "SQL",
  logs: "Logs",
  config: "Config",
  routes: "Routes",
  custom: "Custom"
}, P = {
  template: "template",
  session: "session",
  requests: "request",
  sql: "sql",
  logs: "log",
  custom: "custom"
}, A = {
  request: "requests",
  sql: "sql",
  log: "logs",
  template: "template",
  session: "session",
  custom: "custom"
};
class z extends HTMLElement {
  constructor() {
    super(), this.stream = null, this.externalStream = null, this.snapshot = {}, this.expanded = !1, this.activePanel = "requests", this.connectionStatus = "disconnected", this.slowThresholdMs = 50, this.useFab = !1, this.handleKeyDown = (t) => {
      (t.ctrlKey || t.metaKey) && t.shiftKey && t.key.toLowerCase() === "d" && (t.preventDefault(), this.toggleExpanded()), t.key === "Escape" && this.expanded && this.collapse();
    }, this.shadow = this.attachShadow({ mode: "open" });
  }
  static get observedAttributes() {
    return ["base-path", "debug-path", "panels", "expanded", "slow-threshold-ms", "use-fab"];
  }
  connectedCallback() {
    this.loadState(), this.render(), this.useFab || (this.initWebSocket(), this.fetchInitialSnapshot()), this.setupKeyboardShortcut();
  }
  disconnectedCallback() {
    this.stream?.close(), document.removeEventListener("keydown", this.handleKeyDown);
  }
  attributeChangedCallback(t, e, a) {
    e !== a && (t === "expanded" ? (this.expanded = a === "true" || a === "", this.saveState(), this.render()) : t === "slow-threshold-ms" ? this.slowThresholdMs = parseInt(a || "50", 10) || 50 : t === "use-fab" && (this.useFab = a === "true" || a === ""));
  }
  // Public API for FAB integration
  setExpanded(t) {
    this.expanded = t, this.saveState(), this.render();
  }
  setSnapshot(t) {
    this.snapshot = t || {}, this.updateContent();
  }
  setConnectionStatus(t) {
    this.connectionStatus = t, this.updateConnectionStatus();
  }
  setStream(t) {
    this.externalStream = t;
  }
  isExpanded() {
    return this.expanded;
  }
  // State persistence
  loadState() {
    try {
      const t = localStorage.getItem("debug-toolbar-expanded");
      t !== null && (this.expanded = t === "true");
    } catch {
    }
  }
  saveState() {
    try {
      localStorage.setItem("debug-toolbar-expanded", String(this.expanded));
    } catch {
    }
  }
  setupKeyboardShortcut() {
    document.addEventListener("keydown", this.handleKeyDown);
  }
  toggleExpanded() {
    this.expanded = !this.expanded, this.saveState(), this.render(), this.dispatchExpandEvent();
  }
  collapse() {
    this.expanded && (this.expanded = !1, this.saveState(), this.render(), this.dispatchExpandEvent());
  }
  dispatchExpandEvent() {
    this.dispatchEvent(new CustomEvent("debug-expand", {
      detail: { expanded: this.expanded },
      bubbles: !0,
      composed: !0
    }));
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
      return e.length ? e : f;
    }
    return f;
  }
  get wsUrl() {
    return `${this.debugPath}/ws`;
  }
  // Get the active stream (external from FAB or internal)
  getStream() {
    return this.externalStream || this.stream;
  }
  // WebSocket initialization
  initWebSocket() {
    this.stream = new x({
      basePath: this.debugPath,
      onEvent: (t) => this.handleEvent(t),
      onStatusChange: (t) => this.handleStatusChange(t)
    }), this.stream.connect(), this.stream.subscribe(this.panels.map((t) => P[t] || t));
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
    const e = A[t.type] || t.type;
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
    e === this.activePanel && this.expanded && this.updateContent();
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
    const t = c(this.snapshot), e = this.panels.map((r) => {
      const l = T[r] || r, d = this.getPanelCount(r);
      return `
          <button class="tab ${this.activePanel === r ? "active" : ""}" data-panel="${r}">
            ${l}
            <span class="tab-count">${d}</span>
          </button>
        `;
    }).join("");
    this.useFab && this.expanded;
    const a = this.expanded ? "expanded" : "collapsed", o = this.useFab && !this.expanded ? "hidden" : "";
    this.shadow.innerHTML = `
      <style>${S}</style>
      <div class="toolbar ${a} ${o}">
        ${this.expanded ? `
          <div class="toolbar-header">
            <div class="toolbar-tabs">${e}</div>
            <div class="toolbar-actions">
              <span class="connection-indicator">
                <span class="status-dot ${this.connectionStatus}"></span>
              </span>
              <button class="action-btn" data-action="refresh" title="Refresh (get snapshot)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                  <path d="M23 4v6h-6M1 20v-6h6"/>
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                </svg>
              </button>
              <button class="action-btn" data-action="clear" title="Clear all data">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
              </button>
              <a class="action-btn expand-link" href="${this.debugPath}" title="Open full debug page">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                  <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
                </svg>
              </a>
              <button class="action-btn collapse-btn" data-action="collapse" title="Collapse (Esc)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
          </div>
          <div class="toolbar-content">
            <div class="panel-container" id="panel-content">
              ${p(this.activePanel, this.snapshot, this.slowThresholdMs)}
            </div>
          </div>
        ` : ""}
        ${this.useFab ? "" : `
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
        `}
      </div>
    `, this.attachEventListeners();
  }
  updateContent() {
    if (this.expanded) {
      const t = this.shadow.getElementById("panel-content");
      t && (t.innerHTML = p(this.activePanel, this.snapshot, this.slowThresholdMs)), this.panels.forEach((e) => {
        const a = this.shadow.querySelector(`[data-panel="${e}"] .tab-count`);
        a && (a.textContent = String(this.getPanelCount(e)));
      });
    }
    this.useFab || this.updateSummary();
  }
  updateSummary() {
    const t = c(this.snapshot), e = this.shadow.querySelector(".toolbar-summary");
    if (!e) return;
    e.querySelectorAll(".summary-item").forEach((o) => {
      const r = o.querySelector("span:first-child")?.textContent?.replace(":", "").toLowerCase(), l = o.querySelector(".count");
      !l || !r || (r === "requests" ? (l.textContent = String(t.requests), o.classList.toggle("has-errors", t.errors > 0)) : r === "sql" ? (l.textContent = String(t.sql), o.classList.toggle("has-slow", t.slowQueries > 0)) : r === "logs" ? l.textContent = String(t.logs) : r === "errors" && (l.textContent = String(t.errors)));
    });
  }
  updateConnectionStatus() {
    const t = this.shadow.querySelector(".connection-indicator .status-dot");
    t && (t.className = `status-dot ${this.connectionStatus}`);
    const e = this.shadow.querySelector(".connection-status .status-dot"), a = this.shadow.querySelector(".connection-status span:last-child");
    e && (e.className = `status-dot ${this.connectionStatus}`), a && (a.textContent = this.connectionStatus);
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
    if (this.shadow.querySelectorAll(".tab").forEach((t) => {
      t.addEventListener("click", (e) => {
        const a = e.currentTarget.dataset.panel;
        if (a && a !== this.activePanel) {
          this.activePanel = a, this.shadow.querySelectorAll(".tab").forEach((r) => r.classList.remove("active")), e.currentTarget.classList.add("active");
          const o = this.shadow.getElementById("panel-content");
          o && (o.innerHTML = p(this.activePanel, this.snapshot, this.slowThresholdMs));
        }
      });
    }), this.shadow.querySelectorAll("[data-action]").forEach((t) => {
      t.addEventListener("click", (e) => {
        const a = e.currentTarget.dataset.action, o = this.getStream();
        switch (a) {
          case "toggle":
            this.toggleExpanded();
            break;
          case "collapse":
            this.collapse();
            break;
          case "refresh":
            o?.requestSnapshot();
            break;
          case "clear":
            o?.clear(), this.snapshot = {}, this.updateContent();
            break;
        }
      });
    }), !this.useFab) {
      const t = this.shadow.querySelector(".toolbar-summary");
      t && t.addEventListener("click", () => {
        this.expanded || (this.expanded = !0, this.saveState(), this.render(), this.dispatchExpandEvent());
      });
    }
  }
}
customElements.get("debug-toolbar") || customElements.define("debug-toolbar", z);
const j = `
  :host {
    --fab-bg: #1e1e2e;
    --fab-bg-hover: #313244;
    --fab-border: #45475a;
    --fab-text: #cdd6f4;
    --fab-text-muted: #6c7086;
    --fab-accent: #89b4fa;
    --fab-success: #a6e3a1;
    --fab-warning: #f9e2af;
    --fab-error: #f38ba8;
    --fab-font: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;

    position: fixed;
    bottom: 16px;
    right: 16px;
    z-index: 99998;
    font-family: var(--fab-font);
    font-size: 12px;
    line-height: 1.4;
    pointer-events: auto;
  }

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  .fab {
    display: flex;
    align-items: center;
    background: var(--fab-bg);
    border: 1px solid var(--fab-border);
    border-radius: 24px;
    cursor: pointer;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    overflow: hidden;
    height: 48px;
    min-width: 48px;
  }

  .fab:hover {
    background: var(--fab-bg-hover);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
    transform: translateY(-2px);
  }

  .fab.hidden {
    opacity: 0;
    pointer-events: none;
    transform: scale(0.8) translateY(20px);
  }

  /* Collapsed state - icon only */
  .fab-collapsed {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    flex-shrink: 0;
    position: relative;
  }

  .fab-icon {
    width: 24px;
    height: 24px;
    color: var(--fab-accent);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .fab-icon svg {
    width: 100%;
    height: 100%;
  }

  /* Connection status dot */
  .fab-status-dot {
    position: absolute;
    bottom: 6px;
    right: 6px;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    border: 2px solid var(--fab-bg);
    background: var(--fab-text-muted);
    transition: background 0.2s, box-shadow 0.2s;
  }

  .fab[data-status="connected"] .fab-status-dot {
    background: var(--fab-success);
    box-shadow: 0 0 6px var(--fab-success);
  }

  .fab[data-status="disconnected"] .fab-status-dot {
    background: var(--fab-text-muted);
  }

  .fab[data-status="reconnecting"] .fab-status-dot {
    background: var(--fab-warning);
    animation: pulse 1s ease-in-out infinite;
  }

  .fab[data-status="error"] .fab-status-dot {
    background: var(--fab-error);
    box-shadow: 0 0 6px var(--fab-error);
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }

  /* Expanded state - counters */
  .fab-expanded {
    display: flex;
    align-items: center;
    gap: 12px;
    padding-right: 16px;
    max-width: 0;
    opacity: 0;
    overflow: hidden;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .fab:hover .fab-expanded,
  .fab.is-hovered .fab-expanded {
    max-width: 300px;
    opacity: 1;
    padding-left: 4px;
  }

  .fab-counter {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 36px;
    padding: 4px 8px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.05);
    transition: background 0.15s;
  }

  .fab-counter.has-items {
    background: rgba(137, 180, 250, 0.15);
  }

  .fab-counter.has-slow {
    background: rgba(249, 226, 175, 0.15);
  }

  .fab-counter.has-errors {
    background: rgba(243, 139, 168, 0.15);
  }

  .counter-value {
    font-size: 14px;
    font-weight: 600;
    color: var(--fab-text);
    font-variant-numeric: tabular-nums;
  }

  .fab-counter.has-items .counter-value {
    color: var(--fab-accent);
  }

  .fab-counter.has-slow .counter-value {
    color: var(--fab-warning);
  }

  .fab-counter.has-errors .counter-value {
    color: var(--fab-error);
  }

  .counter-label {
    font-size: 9px;
    color: var(--fab-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  /* Responsive */
  @media (max-width: 480px) {
    :host {
      bottom: 12px;
      right: 12px;
    }

    .fab {
      height: 44px;
      min-width: 44px;
    }

    .fab-collapsed {
      width: 44px;
      height: 44px;
    }

    .fab-icon {
      width: 20px;
      height: 20px;
    }

    .fab-status-dot {
      width: 10px;
      height: 10px;
      bottom: 3px;
      right: 3px;
    }

    .fab-counter {
      min-width: 32px;
      padding: 3px 6px;
    }

    .counter-value {
      font-size: 12px;
    }

    .counter-label {
      font-size: 8px;
    }
  }
`, N = {
  template: "template",
  session: "session",
  requests: "request",
  sql: "sql",
  logs: "log",
  custom: "custom"
}, m = ["requests", "sql", "logs", "routes", "config"];
class D extends HTMLElement {
  constructor() {
    super(), this.stream = null, this.snapshot = {}, this.connectionStatus = "disconnected", this.isHovered = !1, this.toolbarExpanded = !1, this.shadow = this.attachShadow({ mode: "open" });
  }
  static get observedAttributes() {
    return ["debug-path", "panels", "toolbar-expanded"];
  }
  connectedCallback() {
    this.render(), this.initWebSocket(), this.fetchInitialSnapshot(), this.loadState();
  }
  disconnectedCallback() {
    this.stream?.close();
  }
  attributeChangedCallback(t, e, a) {
    e !== a && t === "toolbar-expanded" && (this.toolbarExpanded = a === "true" || a === "", this.render());
  }
  // Public API
  setToolbarExpanded(t) {
    this.toolbarExpanded = t, this.saveState(), this.render();
  }
  getSnapshot() {
    return this.snapshot;
  }
  getConnectionStatus() {
    return this.connectionStatus;
  }
  getStream() {
    return this.stream;
  }
  // Attribute getters
  get debugPath() {
    return this.getAttribute("debug-path") || "/admin/debug";
  }
  get panels() {
    const t = this.getAttribute("panels");
    if (t) {
      const e = t.split(",").map((a) => a.trim().toLowerCase()).filter(Boolean);
      return e.length ? e : m;
    }
    return m;
  }
  // State persistence
  loadState() {
    try {
      const t = localStorage.getItem("debug-toolbar-expanded");
      t !== null && (this.toolbarExpanded = t === "true", this.render());
    } catch {
    }
  }
  saveState() {
    try {
      localStorage.setItem("debug-toolbar-expanded", String(this.toolbarExpanded));
    } catch {
    }
  }
  // WebSocket initialization
  initWebSocket() {
    this.stream = new x({
      basePath: this.debugPath,
      onEvent: (t) => this.handleEvent(t),
      onStatusChange: (t) => this.handleStatusChange(t)
    }), this.stream.connect(), this.stream.subscribe(this.panels.map((t) => N[t] || t));
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
    if (!(!t || !t.type)) {
      if (t.type === "snapshot") {
        this.applySnapshot(t.payload);
        return;
      }
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
      this.updateCounters();
    }
  }
  handleCustomEvent(t) {
    if (!t || typeof t != "object") return;
    this.snapshot.custom = this.snapshot.custom || { data: {}, logs: [] };
    const e = t;
    "key" in e && "value" in e ? (this.snapshot.custom.data = this.snapshot.custom.data || {}, this.snapshot.custom.data[String(e.key)] = e.value) : ("category" in e || "message" in e) && (this.snapshot.custom.logs = this.snapshot.custom.logs || [], this.snapshot.custom.logs.push(t), this.trimArray(this.snapshot.custom.logs, 500));
  }
  handleStatusChange(t) {
    this.connectionStatus = t, this.updateConnectionStatus(), this.dispatchEvent(new CustomEvent("debug-status-change", {
      detail: { status: t },
      bubbles: !0,
      composed: !0
    }));
  }
  applySnapshot(t) {
    this.snapshot = t || {}, this.updateCounters(), this.dispatchEvent(new CustomEvent("debug-snapshot", {
      detail: { snapshot: this.snapshot },
      bubbles: !0,
      composed: !0
    }));
  }
  trimArray(t, e) {
    for (; t.length > e; )
      t.shift();
  }
  // Rendering
  render() {
    const t = c(this.snapshot), e = t.errors > 0, a = t.slowQueries > 0, o = this.toolbarExpanded ? "hidden" : "";
    this.shadow.innerHTML = `
      <style>${j}</style>
      <div class="fab ${o}" data-status="${this.connectionStatus}">
        <div class="fab-collapsed">
          <span class="fab-icon">
            <svg viewBox="0 0 24 24" stroke-width="1.5" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path fill-rule="evenodd" clip-rule="evenodd" d="M12 2.25C15.4148 2.25 18.157 4.93659 19.2445 8.53907L20.6646 7.82902C21.0351 7.64377 21.4856 7.79394 21.6709 8.16443C21.8561 8.53491 21.7059 8.98541 21.3355 9.17066L19.5919 10.0425C19.6958 10.6789 19.75 11.3341 19.75 12C19.75 12.4216 19.7283 12.839 19.6859 13.25H22C22.4142 13.25 22.75 13.5858 22.75 14C22.75 14.4142 22.4142 14.75 22 14.75H19.4347C19.2438 15.5659 18.9699 16.3431 18.6235 17.0629L20.5303 18.9697C20.8232 19.2626 20.8232 19.7374 20.5303 20.0303C20.2374 20.3232 19.7626 20.3232 19.4697 20.0303L17.8463 18.4069C16.4519 20.4331 14.3908 21.75 12 21.75C9.60921 21.75 7.54809 20.4331 6.15371 18.4069L4.53033 20.0303C4.23744 20.3232 3.76256 20.3232 3.46967 20.0303C3.17678 19.7374 3.17678 19.2626 3.46967 18.9697L5.37647 17.0629C5.03008 16.3431 4.7562 15.5659 4.56527 14.75H2C1.58579 14.75 1.25 14.4142 1.25 14C1.25 13.5858 1.58579 13.25 2 13.25H4.31407C4.27174 12.839 4.25 12.4216 4.25 12C4.25 11.3341 4.30423 10.6789 4.40814 10.0425L2.66455 9.17066C2.29406 8.98541 2.1439 8.53491 2.32914 8.16443C2.51438 7.79394 2.96488 7.64377 3.33537 7.82902L4.75547 8.53907C5.84297 4.93659 8.58522 2.25 12 2.25ZM11.25 19C11.25 19.4142 11.5858 19.75 12 19.75C12.4142 19.75 12.75 19.4142 12.75 19V9.73117C14.005 9.6696 15.2088 9.46632 16.1588 9.26042C16.5636 9.17268 16.8207 8.77339 16.7329 8.36857C16.6452 7.96376 16.2459 7.70672 15.8411 7.79445C14.7597 8.02883 13.3718 8.25 12 8.25C10.6281 8.25 9.24022 8.02883 8.15882 7.79445C7.75401 7.70672 7.35472 7.96376 7.26698 8.36857C7.17924 8.77339 7.43629 9.17268 7.8411 9.26042C8.79115 9.46632 9.99494 9.6696 11.25 9.73117V19Z" fill="currentColor"></path>
            </svg>
          </span>
          <span class="fab-status-dot"></span>
        </div>
        <div class="fab-expanded">
          <div class="fab-counter ${t.requests > 0 ? "has-items" : ""}">
            <span class="counter-value">${t.requests}</span>
            <span class="counter-label">Req</span>
          </div>
          <div class="fab-counter ${t.sql > 0 ? "has-items" : ""} ${a ? "has-slow" : ""}">
            <span class="counter-value">${t.sql}</span>
            <span class="counter-label">SQL</span>
          </div>
          <div class="fab-counter ${t.logs > 0 ? "has-items" : ""} ${e ? "has-errors" : ""}">
            <span class="counter-value">${t.logs}</span>
            <span class="counter-label">Logs</span>
          </div>
          ${e ? `
            <div class="fab-counter has-errors">
              <span class="counter-value">${t.errors}</span>
              <span class="counter-label">Err</span>
            </div>
          ` : ""}
        </div>
      </div>
    `, this.attachEventListeners();
  }
  updateCounters() {
    const t = c(this.snapshot), e = t.errors > 0, a = t.slowQueries > 0, o = this.shadow.querySelector(".fab-counter:nth-child(1)");
    if (o) {
      const i = o.querySelector(".counter-value");
      i && (i.textContent = String(t.requests)), o.classList.toggle("has-items", t.requests > 0);
    }
    const r = this.shadow.querySelector(".fab-counter:nth-child(2)");
    if (r) {
      const i = r.querySelector(".counter-value");
      i && (i.textContent = String(t.sql)), r.classList.toggle("has-items", t.sql > 0), r.classList.toggle("has-slow", a);
    }
    const l = this.shadow.querySelector(".fab-counter:nth-child(3)");
    if (l) {
      const i = l.querySelector(".counter-value");
      i && (i.textContent = String(t.logs)), l.classList.toggle("has-items", t.logs > 0), l.classList.toggle("has-errors", e);
    }
    const d = this.shadow.querySelector(".fab-counter:nth-child(4)");
    if (e && d) {
      const i = d.querySelector(".counter-value");
      i && (i.textContent = String(t.errors));
    }
  }
  updateConnectionStatus() {
    const t = this.shadow.querySelector(".fab");
    t && t.setAttribute("data-status", this.connectionStatus);
  }
  attachEventListeners() {
    const t = this.shadow.querySelector(".fab");
    t && (t.addEventListener("click", () => {
      this.toolbarExpanded = !0, this.saveState(), this.render(), this.dispatchEvent(new CustomEvent("debug-expand", {
        detail: { expanded: !0 },
        bubbles: !0,
        composed: !0
      }));
    }), t.addEventListener("mouseenter", () => {
      this.isHovered = !0, t.classList.add("is-hovered");
    }), t.addEventListener("mouseleave", () => {
      this.isHovered = !1, t.classList.remove("is-hovered");
    }));
  }
}
customElements.get("debug-fab") || customElements.define("debug-fab", D);
class y {
  constructor(t = {}) {
    this.fab = null, this.toolbar = null, this.initialized = !1, this.options = {
      debugPath: "/admin/debug",
      panels: ["requests", "sql", "logs", "routes", "config"],
      slowThresholdMs: 50,
      container: document.body,
      ...t
    };
  }
  /**
   * Initialize the debug UI with FAB and Toolbar
   */
  init() {
    this.initialized || (this.initialized = !0, this.createFab(), this.createToolbar(), this.wireEvents());
  }
  /**
   * Destroy the debug UI
   */
  destroy() {
    this.fab && (this.fab.remove(), this.fab = null), this.toolbar && (this.toolbar.remove(), this.toolbar = null), this.initialized = !1;
  }
  /**
   * Expand the toolbar programmatically
   */
  expand() {
    !this.toolbar || !this.fab || (this.fab.setToolbarExpanded(!0), this.toolbar.setExpanded(!0));
  }
  /**
   * Collapse the toolbar programmatically
   */
  collapse() {
    !this.toolbar || !this.fab || (this.fab.setToolbarExpanded(!1), this.toolbar.setExpanded(!1));
  }
  /**
   * Toggle the toolbar state
   */
  toggle() {
    this.toolbar && (this.toolbar.isExpanded() ? this.collapse() : this.expand());
  }
  createFab() {
    this.fab = document.createElement("debug-fab"), this.fab.setAttribute("debug-path", this.options.debugPath || "/admin/debug"), this.options.panels && this.fab.setAttribute("panels", this.options.panels.join(",")), this.options.container?.appendChild(this.fab);
  }
  createToolbar() {
    this.toolbar = document.createElement("debug-toolbar"), this.toolbar.setAttribute("debug-path", this.options.debugPath || "/admin/debug"), this.toolbar.setAttribute("use-fab", "true"), this.options.panels && this.toolbar.setAttribute("panels", this.options.panels.join(",")), this.options.slowThresholdMs && this.toolbar.setAttribute("slow-threshold-ms", String(this.options.slowThresholdMs)), this.options.container?.appendChild(this.toolbar);
  }
  wireEvents() {
    !this.fab || !this.toolbar || (this.fab.addEventListener("debug-expand", (t) => {
      if (t.detail?.expanded && this.toolbar) {
        const e = this.fab?.getStream();
        e && this.toolbar.setStream(e);
        const a = this.fab?.getSnapshot();
        a && this.toolbar.setSnapshot(a);
        const o = this.fab?.getConnectionStatus();
        o && this.toolbar.setConnectionStatus(o), this.toolbar.setExpanded(!0);
      }
    }), this.fab.addEventListener("debug-status-change", (t) => {
      this.toolbar && t.detail?.status && this.toolbar.setConnectionStatus(t.detail.status);
    }), this.fab.addEventListener("debug-snapshot", (t) => {
      this.toolbar && t.detail?.snapshot && this.toolbar.setSnapshot(t.detail.snapshot);
    }), this.toolbar.addEventListener("debug-expand", (t) => {
      !t.detail?.expanded && this.fab && this.fab.setToolbarExpanded(!1);
    }));
  }
}
function F() {
  const s = window.DEBUG_CONFIG, t = document.querySelector("[data-debug-path]");
  let e = {};
  if (s ? e = {
    debugPath: s.debugPath || s.basePath,
    panels: s.panels,
    slowThresholdMs: s.slowThresholdMs
  } : t && (e = {
    debugPath: t.getAttribute("data-debug-path") || void 0,
    panels: t.getAttribute("data-panels")?.split(","),
    slowThresholdMs: parseInt(t.getAttribute("data-slow-threshold-ms") || "50", 10)
  }), !e.debugPath && !s && !t)
    return null;
  const a = new y(e);
  return a.init(), a;
}
window.DebugManager = y;
window.initDebugManager = F;
export {
  D as DebugFab,
  y as DebugManager,
  z as DebugToolbar,
  c as getCounts,
  F as initDebugManager,
  p as renderPanel
};
//# sourceMappingURL=toolbar.js.map
