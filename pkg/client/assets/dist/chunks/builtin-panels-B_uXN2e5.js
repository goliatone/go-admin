import { escapeAttribute as C, escapeHTML as a } from "../shared/html.js";
import { normalizeDebugBasePath as ae } from "../debug/shared/path-helpers.js";
import { r as h } from "./icons-SGrt9O6P.js";
import { A as ie, B as S, E as x, F as b, I as m, L as X, M as K, N as B, O as A, P as T, R as le, a as de, k as ce, w as f, y as _ } from "./server-definitions-Cw_avwJX.js";
var pe = 1e3, ue = 12e3, ge = 8, be = 1, fe = 3e4, he = (e) => {
  const t = window.location.protocol === "https:" ? "wss:" : "ws:", o = ae(e);
  return `${t}//${window.location.host}${o}/ws`;
}, me = (e, t, o) => {
  const r = e.trim();
  if (!r || !t || !o) return e;
  const [s, n] = r.split("#"), i = `${s}${s.includes("?") ? "&" : "?"}${encodeURIComponent(t)}=${encodeURIComponent(o)}`;
  return n ? `${i}#${n}` : i;
}, xe = (e) => {
  if (!e) return null;
  const t = e.replace(/-/g, "+").replace(/_/g, "/"), o = t.padEnd(t.length + (4 - (t.length % 4 || 4)) % 4, "=");
  try {
    if (typeof globalThis.atob == "function") return globalThis.atob(o);
  } catch {
    return null;
  }
  return null;
}, ye = (e) => {
  if (!e) return null;
  const t = e.split(".");
  if (t.length < 2) return null;
  const o = xe(t[1]);
  if (!o) return null;
  try {
    const r = JSON.parse(o);
    if (typeof r.exp == "number") return r.exp * 1e3;
  } catch {
    return null;
  }
  return null;
}, ve = (e, t) => {
  if (t) {
    if (typeof t.expiresInMs == "number" && t.expiresInMs > 0) return Date.now() + t.expiresInMs;
    const o = t.expiresAt ?? t.expires_at;
    if (typeof o == "number") return o;
    if (typeof o == "string") {
      const r = new Date(o);
      if (!Number.isNaN(r.getTime())) return r.getTime();
    }
  }
  return ye(e);
}, $e = class {
  constructor(e) {
    this.ws = null, this.reconnectTimer = null, this.reconnectAttempts = 0, this.manualClose = !1, this.pendingCommands = [], this.status = "disconnected", this.hasConnected = !1, this.options = e;
  }
  getWebSocketURL() {
    return this.options.url ? this.options.url : he(this.options.basePath || "");
  }
  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return;
    this.reconnectTimer !== null && (window.clearTimeout(this.reconnectTimer), this.reconnectTimer = null), this.manualClose = !1;
    const e = this.getWebSocketURL();
    if (!e) {
      this.setStatus("error");
      return;
    }
    this.ws = new WebSocket(e), this.ws.onopen = () => {
      this.hasConnected = !0, this.reconnectAttempts = 0, this.setStatus("connected"), this.flushPending();
    }, this.ws.onmessage = (t) => {
      if (!(!t || typeof t.data != "string"))
        try {
          const o = JSON.parse(t.data);
          this.options.onEvent?.(o);
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
    this.sendCommand({
      type: "subscribe",
      panels: e
    });
  }
  unsubscribe(e) {
    this.sendCommand({
      type: "unsubscribe",
      panels: e
    });
  }
  requestSnapshot() {
    this.sendCommand({ type: "snapshot" });
  }
  clear(e) {
    this.sendCommand({
      type: "clear",
      panels: e
    });
  }
  getStatus() {
    return this.status;
  }
  setStatus(e) {
    this.status !== e && (this.status = e, this.options.onStatusChange?.(e));
  }
  flushPending() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || this.pendingCommands.length === 0) return;
    const e = [...this.pendingCommands];
    this.pendingCommands = [];
    for (const t of e) this.ws.send(JSON.stringify(t));
  }
  scheduleReconnect() {
    const e = this.hasConnected ? this.options.maxReconnectAttempts ?? ge : this.options.maxInitialReconnectAttempts ?? be, t = this.options.reconnectDelayMs ?? pe, o = this.options.maxReconnectDelayMs ?? ue;
    if (this.reconnectAttempts >= e) {
      this.setStatus("disconnected");
      return;
    }
    const r = this.reconnectAttempts, s = Math.min(t * Math.pow(2, r), o), n = s * (0.2 + Math.random() * 0.3);
    this.reconnectAttempts += 1, this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null, this.connect();
    }, s + n);
  }
}, Zt = class extends $e {
  constructor(e) {
    const { url: t, authToken: o, tokenProvider: r, tokenRefreshBufferMs: s, tokenParam: n, appId: i, onEvent: c, ...d } = e, l = (p) => {
      if (i && p && !p.app_id) {
        c?.({
          ...p,
          app_id: i
        });
        return;
      }
      c?.(p);
    };
    super({
      ...d,
      url: t,
      onEvent: l
    }), this.authToken = null, this.tokenRefreshTimer = null, this.tokenExpiresAt = null, this.baseUrl = t, this.tokenProvider = r, this.tokenRefreshBufferMs = s ?? fe, this.tokenParam = n || "token", o && this.setToken(o);
  }
  getWebSocketURL() {
    return this.authToken ? me(this.baseUrl, this.tokenParam, this.authToken) : this.baseUrl;
  }
  connect() {
    this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) || this.ensureToken().then((e) => {
      e && super.connect();
    });
  }
  close() {
    this.clearTokenRefresh(), super.close();
  }
  clearTokenRefresh() {
    this.tokenRefreshTimer !== null && (clearTimeout(this.tokenRefreshTimer), this.tokenRefreshTimer = null);
  }
  scheduleTokenRefresh() {
    if (!this.tokenExpiresAt || !this.tokenProvider) return;
    const e = Math.max(this.tokenExpiresAt - Date.now() - this.tokenRefreshBufferMs, 0);
    this.clearTokenRefresh(), this.tokenRefreshTimer = setTimeout(() => {
      this.refreshToken();
    }, e);
  }
  setToken(e, t) {
    this.authToken = e, this.tokenExpiresAt = ve(e, t), this.scheduleTokenRefresh();
  }
  tokenNeedsRefresh() {
    return this.tokenExpiresAt ? Date.now() + this.tokenRefreshBufferMs >= this.tokenExpiresAt : !1;
  }
  async ensureToken() {
    return this.tokenProvider ? this.authToken && !this.tokenNeedsRefresh() ? !0 : this.refreshToken() : this.authToken != null;
  }
  async refreshToken() {
    if (!this.tokenProvider) return this.authToken != null;
    try {
      const e = await this.tokenProvider();
      return !e || !e.token ? (this.setStatus("error"), !1) : (this.setToken(e.token, e), this.reconnectAttempts = 0, this.ws && this.ws.readyState === WebSocket.OPEN && this.ws.close(), !0);
    } catch {
      return this.setStatus("error"), !1;
    }
  }
};
function q(e) {
  let t = 5381;
  for (let o = 0; o < e.length; o++) t = (t << 5) + t + e.charCodeAt(o) | 0;
  return (t >>> 0).toString(36);
}
var we = (e) => {
  typeof requestAnimationFrame == "function" ? requestAnimationFrame(() => e()) : setTimeout(e, 16);
};
function Y(e, t, o) {
  e.insertAdjacentHTML(o ? "afterbegin" : "beforeend", t);
}
function ke(e, t) {
  let o = e.nextElementSibling;
  for (e.remove(); o && !o.matches(t); ) {
    const r = o.nextElementSibling;
    o.remove(), o = r;
  }
}
function Z(e, t, o, r, s) {
  if (!r || r <= 0) return [];
  const n = Array.from(e.querySelectorAll(t)), i = n.length - r;
  if (i <= 0) return [];
  const c = s ? n.reverse() : n, d = [];
  for (let l = 0; l < i; l++) {
    const p = c[l];
    if (!p) break;
    const u = p.getAttribute(o);
    u && d.push(u), ke(p, t);
  }
  return d;
}
var Ce = class {
  constructor(e) {
    this.root = null, this.container = null, this.pending = [], this.frameScheduled = !1, this.paused = !1, this.wired = /* @__PURE__ */ new WeakSet(), this.opts = e, this.scheduleFrame = e.scheduleFrame || we, this.containerSelector = e.containerSelector || "[data-live-list]", this.rowSelector = e.rowSelector || "[data-row-key]", this.keyAttr = e.keyAttr || "data-row-key";
  }
  adopt(e) {
    this.root = e, this.container = e.querySelector(this.containerSelector), this.container && (this.wired.has(this.container) || (this.wired.add(this.container), this.opts.onAdopt?.(e, this.container)), this.opts.onRestore?.(e, this.container));
  }
  enqueue(e) {
    if (!(!e || e.length === 0)) {
      for (const t of e) this.pending.push(t);
      if (this.paused) {
        this.emitPending();
        return;
      }
      this.scheduleFlush();
    }
  }
  setPaused(e) {
    this.paused = e, !e && this.pending.length > 0 && this.scheduleFlush();
  }
  get pendingCount() {
    return this.pending.length;
  }
  discardPending() {
    this.pending.length !== 0 && (this.pending = [], this.emitPending());
  }
  scheduleFlush() {
    this.frameScheduled || (this.frameScheduled = !0, this.scheduleFrame(() => {
      this.frameScheduled = !1, this.flush();
    }));
  }
  flush() {
    if (this.paused) return;
    let e = this.pending;
    if (this.pending = [], this.emitPending(), e.length === 0) return;
    if (!this.container) {
      this.opts.onNeedFullRender?.();
      return;
    }
    const t = this.opts.getRenderOptions().newestFirst !== !1, o = this.opts.getMaxEntries();
    o && e.length > o && (e = e.slice(-o));
    const r = [];
    for (const s of e)
      this.opts.shouldDisplay && !this.opts.shouldDisplay(s) || (Y(this.container, this.opts.renderRow(s), t), r.push(this.opts.keyOf(s)));
    r.length > 0 && (Z(this.container, this.rowSelector, this.keyAttr, o, t), this.opts.onAfterAppend?.(this.container, r));
  }
  emitPending() {
    this.opts.onPendingChange?.(this.pending.length);
  }
};
function k(e) {
  return e.id ? e.id : `sql-${q(`${e.timestamp || ""}|${e.duration ?? ""}|${e.query || ""}`)}`;
}
function Se(e, t, o) {
  return `
    <div class="${o.panelControls}">
      <label class="${o.sortToggle}">
        <input type="checkbox" data-sort-toggle="${e}" ${t ? "checked" : ""}>
        <span>Newest first</span>
      </label>
    </div>
  `;
}
function Te(e) {
  return `
    <div class="${e.sqlToolbar}" data-sql-toolbar>
      <span data-sql-selected-count>0 selected</span>
      <button class="${e.sqlToolbarBtn}" data-sql-export="clipboard" title="Copy selected queries to clipboard">
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
        Copy
      </button>
      <button class="${e.sqlToolbarBtn}" data-sql-export="download" title="Download selected queries as .sql file">
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="7 10 12 15 17 10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
        Download .sql
      </button>
      <button class="${e.sqlToolbarBtn}" data-sql-clear-selection title="Clear selection">
        Clear
      </button>
    </div>
  `;
}
function _e(e, t, o) {
  return t ? `
      <button class="${e.copyBtnSm}" data-copy-trigger="${o}" title="Copy SQL">
        <i class="iconoir-copy"></i> Copy
      </button>
    ` : `
    <button class="${e.copyBtn}" data-copy-trigger title="Copy SQL">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
      </svg>
      Copy
    </button>
  `;
}
function I(e, t, o) {
  const r = B(e.duration, o.slowThresholdMs), s = r.isSlow, n = !!e.error, i = k(e), c = C(i), d = `sql-row-${i}`, l = C(d), p = e.query || "", u = ce(p, !0), g = [t.expandableRow];
  s && g.push(t.slowQuery), n && g.push(t.errorQuery);
  const v = s ? t.durationSlow : "", $ = _e(t, o.useIconCopyButton || !1, d);
  return `
    <tr class="${g.join(" ")}" data-row-id="${l}" data-sql-id="${c}">
      <td class="${t.selectCell}"><input type="checkbox" class="sql-select-row" data-sql-id="${c}"></td>
      <td class="${t.duration} ${v}">${r.text}</td>
      <td>${a(b(e.row_count ?? "-"))}</td>
      <td class="${t.timestamp}">${a(m(e.timestamp))}</td>
      <td>${n ? `<span class="${t.badgeError}">Error</span>` : ""}</td>
      <td class="${t.queryText}"><span class="${t.expandIcon}">&#9654;</span>${a(p)}</td>
    </tr>
    <tr class="${t.expansionRow}" data-expansion-for="${l}">
      <td colspan="6">
        <div class="${t.expandedContent}" data-copy-content="${a(p)}">
          <div class="${t.expandedContentHeader}">
            ${$}
          </div>
          <pre>${u}</pre>
        </div>
      </td>
    </tr>
  `;
}
function qe(e, t, o) {
  return e.map((r) => I(r, t, o)).join("");
}
function R(e, t, o = {}) {
  const { newestFirst: r = !0, slowThresholdMs: s = 50, maxEntries: n = 50, showSortToggle: i = !1, useIconCopyButton: c = !1 } = o, d = i ? Se("sql", r, t) : "", l = Te(t);
  if (!e.length) return d + `<div class="${t.emptyState}">No SQL queries captured</div>`;
  let p = n ? e.slice(-n) : e;
  r && (p = [...p].reverse());
  const u = qe(p, t, {
    ...o,
    slowThresholdMs: s,
    useIconCopyButton: c
  });
  return `
    ${d}
    ${l}
    <table class="${t.table}" data-sql-table>
      <thead>
        <tr>
          <th class="${t.selectCell}"><input type="checkbox" class="sql-select-all"></th>
          <th>Duration</th>
          <th>Rows</th>
          <th>Time</th>
          <th>Status</th>
          <th>Query</th>
        </tr>
      </thead>
      <tbody>${u}</tbody>
    </table>
  `;
}
function eo(e, t, o, r) {
  return Y(e, I(t, o, r), r.newestFirst !== !1), k(t);
}
function to(e, t, o) {
  return Z(e, "tr[data-sql-id]", "data-sql-id", t, o);
}
async function O(e, t, o = {}) {
  const { feedbackDuration: r = 1500, useIconFeedback: s = !1, successClass: n = s ? "debug-copy--success" : "copied", errorClass: i = "debug-copy--error" } = o;
  try {
    await navigator.clipboard.writeText(e);
    const c = t.innerHTML;
    return t.classList.add(n), s ? t.innerHTML = '<i class="iconoir-check"></i> Copied' : t.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        Copied
      `, setTimeout(() => {
      t.innerHTML = c, t.classList.remove(n);
    }, r), !0;
  } catch {
    return t.classList.add(i), setTimeout(() => {
      t.classList.remove(i);
    }, r), !1;
  }
}
function oo(e, t = {}) {
  e.querySelectorAll("[data-copy-trigger]").forEach((o) => {
    o.closest("[data-sql-table]") || o.addEventListener("click", async (r) => {
      r.preventDefault(), r.stopPropagation();
      const s = o.closest("[data-copy-content]");
      s && await O(s.getAttribute("data-copy-content") || "", o, t);
    });
  });
}
function ro(e) {
  e.querySelectorAll(".expandable-row").forEach((t) => {
    t.closest("[data-sql-table], [data-live-list]") || t.addEventListener("click", (o) => {
      o.target.closest("a, button, input") || o.currentTarget.classList.toggle("expanded");
    });
  });
}
function so(e, t) {
  const { tableSelector: o, rowSelector: r, keyAttr: s, expanded: n } = t;
  e.querySelectorAll(o).forEach((i) => {
    i.addEventListener("click", (c) => {
      const d = c.target;
      if (d.closest("a, button, input")) return;
      const l = d.closest(r);
      if (!l || !i.contains(l)) return;
      const p = l.getAttribute(s);
      p && (n.has(p) ? (n.delete(p), l.classList.remove("expanded")) : (n.add(p), l.classList.add("expanded")));
    });
  });
}
function no(e, t) {
  const { rowSelector: o, keyAttr: r, expanded: s } = t;
  e.querySelectorAll(o).forEach((n) => {
    const i = n.getAttribute(r);
    i && s.has(i) ? n.classList.add("expanded") : n.classList.remove("expanded");
  });
}
function ao(e, t) {
  e.querySelectorAll("[data-sort-toggle]").forEach((o) => {
    o.addEventListener("change", (r) => {
      const s = r.target, n = s.dataset.sortToggle;
      n && t(n, s.checked);
    });
  });
}
var io = {
  COPY_TRIGGER: "data-copy-trigger",
  COPY_CONTENT: "data-copy-content",
  ROW_ID: "data-row-id",
  EXPANSION_FOR: "data-expansion-for",
  SORT_TOGGLE: "data-sort-toggle"
}, lo = {
  EXPANDABLE_ROW: "expandable-row",
  EXPANDED: "expanded",
  EXPANSION_ROW: "expansion-row",
  SLOW_QUERY: "slow-query",
  ERROR_QUERY: "error-query",
  EXPAND_ICON: "expand-icon"
};
function J(e, t) {
  const o = /* @__PURE__ */ new Map(), r = /* @__PURE__ */ new Map();
  return e.forEach((s, n) => {
    const i = k(s);
    o.set(i, n), r.set(i, s);
  }), [...t].filter((s) => r.has(s)).sort((s, n) => (o.get(s) ?? 0) - (o.get(n) ?? 0)).map((s) => r.get(s)).map((s) => {
    let n = `-- Duration: ${B(s.duration).text} | Rows: ${s.row_count ?? 0}`;
    return s.error && (n += ` | Error: ${s.error}`), s.timestamp && (n += ` | Time: ${s.timestamp}`), `${n}
${s.query || ""};`;
  }).join(`

`);
}
function ze(e, t, o = "text/sql") {
  const r = new Blob([e], { type: o }), s = URL.createObjectURL(r), n = document.createElement("a");
  n.href = s, n.download = t, n.click(), URL.revokeObjectURL(s);
}
function co(e, t) {
  e.querySelectorAll("[data-request-table]").forEach((o) => {
    o.addEventListener("click", (r) => {
      const s = r.target;
      if (s.closest("button, a, input, [data-detail-for]")) return;
      const n = s.closest("[data-request-id]");
      if (!n) return;
      const i = n.dataset.requestId;
      if (!i) return;
      const c = n.nextElementSibling;
      if (!c || !c.hasAttribute("data-detail-for") || c.dataset.detailFor !== i) return;
      const d = c.querySelector("[data-request-detail-template]");
      if (d) {
        const p = c.querySelector("td");
        p && (p.appendChild(d.content.cloneNode(!0)), d.remove());
      }
      const l = n.querySelector("[data-expand-icon]");
      t.has(i) ? (t.delete(i), c.style.display = "none", l && (l.textContent = "▶")) : (t.add(i), c.style.display = "table-row", l && (l.textContent = "▼"));
    });
  });
}
var Ee = {
  table: "debug-table",
  tableRoutes: "debug-table debug-routes-table",
  badge: "badge",
  badgeMethod: (e) => `badge badge--method-${e.toLowerCase()}`,
  badgeStatus: (e) => e >= 500 ? "badge badge--status-error" : e >= 400 ? "badge badge--status-warn" : "badge badge--status",
  badgeLevel: (e) => `badge badge--level-${e.toLowerCase()}`,
  badgeError: "badge badge--status-error",
  badgeCustom: "badge badge--custom",
  duration: "duration",
  durationSlow: "duration--slow",
  timestamp: "timestamp",
  path: "path",
  message: "message",
  queryText: "query-text",
  rowError: "error",
  rowSlow: "slow",
  expandableRow: "expandable-row",
  expansionRow: "expansion-row",
  slowQuery: "slow",
  errorQuery: "error",
  expandIcon: "expand-icon",
  emptyState: "debug-empty",
  jsonViewer: "debug-json-panel",
  jsonViewerHeader: "debug-json-header",
  jsonViewerTitle: "",
  jsonGrid: "debug-json-grid",
  jsonPanel: "debug-json-panel",
  jsonHeader: "debug-json-header",
  jsonActions: "debug-json-actions",
  jsonContent: "debug-json-content",
  copyBtn: "debug-btn debug-copy",
  copyBtnSm: "debug-btn debug-copy debug-copy--sm",
  panelControls: "debug-filter",
  sortToggle: "debug-btn",
  expandedContent: "expanded-content",
  expandedContentHeader: "expanded-content__header",
  muted: "debug-muted",
  selectCell: "debug-sql-select",
  sqlToolbar: "debug-sql-toolbar",
  sqlToolbarBtn: "debug-btn",
  detailRow: "request-detail-row",
  detailPane: "request-detail-pane",
  detailSection: "request-detail-section",
  detailLabel: "request-detail-label",
  detailValue: "request-detail-value",
  detailKeyValueTable: "request-detail-kv",
  detailError: "request-detail-error",
  detailMasked: "request-detail-masked",
  detailBody: "request-detail-body",
  detailMetadataLine: "request-detail-metadata",
  badgeContentType: "badge badge--content-type"
}, Re = {
  table: "",
  tableRoutes: "",
  badge: "badge",
  badgeMethod: (e) => `badge badge-method ${e.toLowerCase()}`,
  badgeStatus: (e) => {
    const t = le(e);
    return t ? `badge badge-status ${t}` : "badge badge-status";
  },
  badgeLevel: (e) => `badge badge-level ${X(e)}`,
  badgeError: "badge badge-status error",
  badgeCustom: "badge",
  duration: "duration",
  durationSlow: "slow",
  timestamp: "timestamp",
  path: "path",
  message: "message",
  queryText: "query-text",
  rowError: "",
  rowSlow: "",
  expandableRow: "expandable-row",
  expansionRow: "expansion-row",
  slowQuery: "slow-query",
  errorQuery: "error-query",
  expandIcon: "expand-icon",
  emptyState: "empty-state",
  jsonViewer: "json-viewer",
  jsonViewerHeader: "json-viewer__header",
  jsonViewerTitle: "json-viewer__title",
  jsonGrid: "",
  jsonPanel: "json-viewer",
  jsonHeader: "json-viewer__header",
  jsonActions: "",
  jsonContent: "",
  copyBtn: "copy-btn",
  copyBtnSm: "copy-btn",
  panelControls: "panel-controls",
  sortToggle: "sort-toggle",
  expandedContent: "expanded-content",
  expandedContentHeader: "expanded-content__header",
  muted: "timestamp",
  selectCell: "sql-select",
  sqlToolbar: "sql-toolbar",
  sqlToolbarBtn: "copy-btn",
  detailRow: "request-detail-row",
  detailPane: "request-detail-pane",
  detailSection: "request-detail-section",
  detailLabel: "request-detail-label",
  detailValue: "request-detail-value",
  detailKeyValueTable: "request-detail-kv",
  detailError: "request-detail-error",
  detailMasked: "request-detail-masked",
  detailBody: "request-detail-body",
  detailMetadataLine: "request-detail-metadata",
  badgeContentType: "badge badge-content-type"
};
function po(e) {
  return e === "console" ? Ee : Re;
}
function Le(e) {
  const t = String(e ?? "GET").trim().toUpperCase();
  return {
    display: t || "GET",
    classToken: t.replace(/[^A-Z]/g, "") || "GET"
  };
}
function Pe(e) {
  return e.id ? e.id : `req-${q(`${e.timestamp || ""}|${e.method || ""}|${e.path || ""}|${e.status ?? ""}`)}`;
}
function Me(e, t, o) {
  return `
    <div class="${o.panelControls}">
      <label class="${o.sortToggle}">
        <input type="checkbox" data-sort-toggle="${e}" ${t ? "checked" : ""}>
        <span>Newest first</span>
      </label>
    </div>
  `;
}
function Ne(e, t, o = {}) {
  const { maskPlaceholder: r = "***", maxDetailLength: s } = o, n = [], i = [];
  if (e.id && i.push(`<span>ID: <code>${a(e.id)}</code></span>`), e.remote_ip && i.push(`<span>IP: <code>${a(e.remote_ip)}</code></span>`), e.content_type && i.push(`<span>Content-Type: <code>${a(e.content_type)}</code></span>`), i.length > 0 && n.push(`<div class="${t.detailMetadataLine}">${i.join("")}</div>`), e.headers && Object.keys(e.headers).length > 0) {
    const c = Object.entries(e.headers).map(([d, l]) => {
      const p = s && l.length > s ? S(l, s) : l, u = l === r ? ` <span class="${t.detailMasked}">(masked)</span>` : "";
      return `<dt>${a(d)}</dt><dd>${a(p)}${u}</dd>`;
    }).join("");
    n.push(`
      <div class="${t.detailSection}">
        <span class="${t.detailLabel}">Request Headers</span>
        <dl class="${t.detailKeyValueTable}">${c}</dl>
      </div>
    `);
  }
  if (e.query && Object.keys(e.query).length > 0) {
    const c = Object.entries(e.query).map(([d, l]) => {
      const p = l === r ? ` <span class="${t.detailMasked}">(masked)</span>` : "";
      return `<dt>${a(d)}</dt><dd>${a(l)}${p}</dd>`;
    }).join("");
    n.push(`
      <div class="${t.detailSection}">
        <span class="${t.detailLabel}">Query Parameters</span>
        <dl class="${t.detailKeyValueTable}">${c}</dl>
      </div>
    `);
  }
  if (e.request_body) {
    const c = e.request_size ? ` (${K(e.request_size)})` : "", d = e.body_truncated ? ' <span class="' + t.detailMasked + '">(truncated)</span>' : "";
    let l;
    try {
      l = A(JSON.parse(e.request_body), !0);
    } catch {
      l = a(e.request_body);
    }
    n.push(`
      <div class="${t.detailSection}">
        <span class="${t.detailLabel}">Request Body${c}${d}</span>
        <div class="${t.detailBody}">
          <pre>${l}</pre>
        </div>
        <button class="${t.copyBtnSm}" data-copy-trigger="${a(e.request_body)}">Copy</button>
      </div>
    `);
  }
  if (e.response_headers && Object.keys(e.response_headers).length > 0) {
    const c = Object.entries(e.response_headers).map(([d, l]) => {
      const p = s && l.length > s ? S(l, s) : l;
      return `<dt>${a(d)}</dt><dd>${a(p)}</dd>`;
    }).join("");
    n.push(`
      <div class="${t.detailSection}">
        <span class="${t.detailLabel}">Response Headers</span>
        <dl class="${t.detailKeyValueTable}">${c}</dl>
      </div>
    `);
  }
  if (e.response_body) {
    const c = e.response_size ? ` (${K(e.response_size)})` : "";
    let d;
    try {
      d = A(JSON.parse(e.response_body), !0);
    } catch {
      d = a(e.response_body);
    }
    n.push(`
      <div class="${t.detailSection}">
        <span class="${t.detailLabel}">Response Body${c}</span>
        <div class="${t.detailBody}">
          <pre>${d}</pre>
        </div>
        <button class="${t.copyBtnSm}" data-copy-trigger="${a(e.response_body)}">Copy</button>
      </div>
    `);
  }
  return e.error && n.push(`
      <div class="${t.detailSection}">
        <div class="${t.detailError}">${a(e.error)}</div>
      </div>
    `), n.length === 0 ? `<div class="${t.detailPane}"><span class="${t.muted}">No additional details available</span></div>` : `<div class="${t.detailPane}">${n.join("")}</div>`;
}
function je(e, t, o) {
  const { display: r, classToken: s } = Le(e.method), n = e.path || "", i = e.status || 0, c = B(e.duration, o.slowThresholdMs), d = Pe(e), l = o.expandedRequestIds?.has(d) || !1, p = t.badgeMethod(s), u = t.badgeStatus(i), g = c.isSlow ? t.durationSlow : "", v = i >= 400 ? t.rowError : "", $ = o.truncatePath ? S(n, o.maxPathLength || 50) : n;
  let w = "";
  const E = r;
  if (E === "POST" || E === "PUT" || E === "PATCH") {
    const H = (e.content_type || e.headers?.["Content-Type"] || e.headers?.["content-type"] || "").split(";")[0].trim();
    H && (w = ` <span class="${t.badgeContentType}">${a(H)}</span>`);
  }
  const re = `<span class="${t.expandIcon}" data-expand-icon>${l ? "▼" : "▶"}</span>`, se = l ? "table-row" : "none", F = Ne(e, t, {
    maskPlaceholder: o.maskPlaceholder,
    maxDetailLength: o.maxDetailLength
  }), ne = l ? F : `<template data-request-detail-template>${F}</template>`;
  return `
    <tr class="${v}" data-request-id="${a(d)}" style="cursor:pointer">
      <td>${re}<span class="${p}">${a(r)}</span>${w}</td>
      <td class="${t.path}" title="${a(n)}">${a($)}</td>
      <td><span class="${u}">${a(i || "-")}</span></td>
      <td class="${t.duration} ${g}">${c.text}</td>
      <td class="${t.timestamp}">${a(m(e.timestamp))}</td>
    </tr>
    <tr class="${t.detailRow}" data-detail-for="${a(d)}" style="display:${se}">
      <td colspan="5">${ne}</td>
    </tr>
  `;
}
function L(e, t, o = {}) {
  const { newestFirst: r = !0, slowThresholdMs: s = 50, maxEntries: n, showSortToggle: i = !1, truncatePath: c = !0, maxPathLength: d = 50 } = o, l = i ? Me("requests", r, t) : "";
  if (!e.length) return l + `<div class="${t.emptyState}">No requests captured</div>`;
  let p = n ? e.slice(-n) : e;
  r && (p = [...p].reverse());
  const u = p.map((g) => je(g, t, {
    ...o,
    slowThresholdMs: s,
    truncatePath: c,
    maxPathLength: d
  })).join("");
  return `
    ${l}
    <table class="${t.table}" data-request-table>
      <thead>
        <tr>
          <th>Method</th>
          <th>Path</th>
          <th>Status</th>
          <th>Duration</th>
          <th>Time</th>
        </tr>
      </thead>
      <tbody data-live-list>${u}</tbody>
    </table>
  `;
}
var uo = class {
  constructor(e) {
    this.selected = /* @__PURE__ */ new Set(), this.expanded = /* @__PURE__ */ new Set(), this.table = null, this.toolbarEl = null, this.countEl = null, this.selectAllEl = null, this.wired = /* @__PURE__ */ new WeakSet(), this.onTableChange = (t) => {
      const o = t.target;
      if (!(!o || !o.classList)) {
        if (o.classList.contains("sql-select-all")) {
          this.setAllVisible(o.checked);
          return;
        }
        if (o.classList.contains("sql-select-row")) {
          const r = o, s = r.dataset.sqlId;
          if (!s) return;
          r.checked ? this.selected.add(s) : this.selected.delete(s), this.updateToolbar();
        }
      }
    }, this.onTableClick = (t) => {
      const o = t.target;
      if (!o) return;
      const r = o.closest("[data-copy-trigger]");
      if (r) {
        t.preventDefault(), t.stopPropagation(), O(r.closest("[data-copy-content]")?.getAttribute("data-copy-content") || "", r, this.opts.copyOptions);
        return;
      }
      if (o.closest("a, button, input")) return;
      const s = o.closest("tr[data-sql-id]");
      if (!s) return;
      const n = s.dataset.sqlId;
      n && (this.expanded.has(n) ? (this.expanded.delete(n), s.classList.remove("expanded")) : (this.expanded.add(n), s.classList.add("expanded")));
    }, this.opts = e, this.list = new Ce({
      styles: e.styles,
      containerSelector: "[data-sql-table] tbody",
      rowSelector: "tr[data-sql-id]",
      keyAttr: "data-sql-id",
      keyOf: k,
      renderRow: (t) => I(t, e.styles, e.getRenderOptions()),
      getItems: e.getQueries,
      getRenderOptions: e.getRenderOptions,
      getMaxEntries: e.getMaxEntries,
      shouldDisplay: e.shouldDisplay,
      onNeedFullRender: e.onNeedFullRender,
      onPendingChange: e.onPendingChange,
      scheduleFrame: e.scheduleFrame,
      onAdopt: (t) => this.wire(t),
      onRestore: () => this.restoreState()
    });
  }
  adopt(e) {
    this.list.adopt(e);
  }
  enqueue(e) {
    this.list.enqueue(e);
  }
  setPaused(e) {
    this.list.setPaused(e);
  }
  discardPending() {
    this.list.discardPending();
  }
  get pendingCount() {
    return this.list.pendingCount;
  }
  wire(e) {
    this.table = e.querySelector("[data-sql-table]"), this.toolbarEl = e.querySelector("[data-sql-toolbar]"), this.countEl = e.querySelector("[data-sql-selected-count]"), this.selectAllEl = this.table?.querySelector(".sql-select-all") ?? null, this.table && !this.wired.has(this.table) && (this.wired.add(this.table), this.table.addEventListener("change", this.onTableChange), this.table.addEventListener("click", this.onTableClick)), this.toolbarEl && !this.wired.has(this.toolbarEl) && (this.wired.add(this.toolbarEl), this.wireToolbar(this.toolbarEl));
  }
  wireToolbar(e) {
    e.querySelector('[data-sql-export="clipboard"]')?.addEventListener("click", async (t) => {
      t.preventDefault(), this.selected.size !== 0 && await O(J(this.opts.getQueries(), this.selected), t.currentTarget, this.opts.copyOptions);
    }), e.querySelector('[data-sql-export="download"]')?.addEventListener("click", (t) => {
      t.preventDefault(), this.selected.size !== 0 && ze(J(this.opts.getQueries(), this.selected), `sql-queries-${(/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-").slice(0, 19)}.sql`);
    }), e.querySelector("[data-sql-clear-selection]")?.addEventListener("click", (t) => {
      t.preventDefault(), this.clearSelection();
    });
  }
  setAllVisible(e) {
    this.table && (this.table.querySelectorAll(".sql-select-row").forEach((t) => {
      t.checked = e;
      const o = t.dataset.sqlId;
      o && (e ? this.selected.add(o) : this.selected.delete(o));
    }), this.updateToolbar());
  }
  clearSelection() {
    this.selected.clear(), this.table?.querySelectorAll(".sql-select-row").forEach((e) => {
      e.checked = !1;
    }), this.updateToolbar();
  }
  restoreState() {
    if (!this.table) return;
    const e = new Set(this.opts.getQueries().map(k));
    for (const t of [...this.selected]) e.has(t) || this.selected.delete(t);
    for (const t of [...this.expanded]) e.has(t) || this.expanded.delete(t);
    this.table.querySelectorAll(".sql-select-row").forEach((t) => {
      t.checked = !!t.dataset.sqlId && this.selected.has(t.dataset.sqlId);
    }), this.table.querySelectorAll("tr[data-sql-id]").forEach((t) => {
      const o = t.dataset.sqlId;
      o && this.expanded.has(o) ? t.classList.add("expanded") : t.classList.remove("expanded");
    }), this.updateToolbar();
  }
  updateToolbar() {
    if (this.toolbarEl) {
      const e = this.selected.size;
      this.toolbarEl.dataset.visible = e > 0 ? "true" : "false", this.countEl && (this.countEl.textContent = `${e} selected`);
    }
    if (this.selectAllEl && this.table) {
      const e = this.table.querySelectorAll(".sql-select-row"), t = this.table.querySelectorAll(".sql-select-row:checked").length;
      this.selectAllEl.checked = e.length > 0 && t === e.length, this.selectAllEl.indeterminate = t > 0 && t < e.length;
    }
  }
};
function Ae(e) {
  return `log-${q(`${e.timestamp || ""}|${e.level || ""}|${e.source || ""}|${e.message || ""}`)}`;
}
function Oe(e, t, o) {
  return `
    <div class="${o.panelControls}">
      <label class="${o.sortToggle}">
        <input type="checkbox" data-sort-toggle="${e}" ${t ? "checked" : ""}>
        <span>Newest first</span>
      </label>
    </div>
  `;
}
function Be(e, t, o) {
  const r = e.level || "INFO", s = String(r).toUpperCase(), n = X(String(r)), i = e.message || "", c = e.source || "", d = t.badgeLevel(n), l = n === "error" ? t.rowError : "", p = o.truncateMessage ? S(i, o.maxMessageLength || 100) : i, u = o.showSource ? `<td class="${t.timestamp}">${a(c)}</td>` : "";
  return `
    <tr class="${l}" data-row-key="${C(Ae(e))}">
      <td><span class="${d}">${a(s)}</span></td>
      <td class="${t.timestamp}">${a(m(e.timestamp))}</td>
      <td class="${t.message}" title="${a(i)}">${a(p)}</td>
      ${u}
    </tr>
  `;
}
function P(e, t, o = {}) {
  const { newestFirst: r = !0, maxEntries: s = 100, showSortToggle: n = !1, showSource: i = !1, truncateMessage: c = !0, maxMessageLength: d = 100 } = o, l = n ? Oe("logs", r, t) : "";
  if (!e.length) return l + `<div class="${t.emptyState}">No logs captured</div>`;
  let p = s ? e.slice(-s) : e;
  r && (p = [...p].reverse());
  const u = p.map((v) => Be(v, t, {
    ...o,
    showSource: i,
    truncateMessage: c,
    maxMessageLength: d
  })).join(""), g = i ? "<th>Source</th>" : "";
  return `
    ${l}
    <table class="${t.table}">
      <thead>
        <tr>
          <th>Level</th>
          <th>Time</th>
          <th>Message</th>
          ${g}
        </tr>
      </thead>
      <tbody data-live-list>${u}</tbody>
    </table>
  `;
}
function Ie(e, t, o) {
  const r = e.method || "GET", s = e.path || "", n = e.handler || "-", i = e.name || "", c = t.badgeMethod(r), d = o.showName ? `<td class="${t.timestamp}">${a(i)}</td>` : "";
  return `
    <tr>
      <td><span class="${c}">${a(r)}</span></td>
      <td class="${t.path}">${a(s)}</td>
      <td>${a(n)}</td>
      ${d}
    </tr>
  `;
}
function M(e, t, o = {}) {
  const { showName: r = !1 } = o;
  if (!e.length) return `<div class="${t.emptyState}">No routes available</div>`;
  const s = e.map((i) => Ie(i, t, { showName: r })).join(""), n = r ? "<th>Name</th>" : "";
  return `
    <table class="${t.tableRoutes || t.table}">
      <thead>
        <tr>
          <th>Method</th>
          <th>Path</th>
          <th>Handler</th>
          ${n}
        </tr>
      </thead>
      <tbody>${s}</tbody>
    </table>
  `;
}
function De(e, t) {
  return t ? `
      <button class="${e.copyBtn}" data-copy-trigger="custom-data" title="Copy to clipboard">
        <i class="iconoir-copy"></i> Copy
      </button>
    ` : `
    <button class="${e.copyBtn}" data-copy-trigger title="Copy JSON">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
      </svg>
      Copy
    </button>
  `;
}
function Fe(e, t) {
  return `
    <tr>
      <td><span class="${t.badgeCustom}">${a(e.category || "custom")}</span></td>
      <td class="${t.timestamp}">${a(m(e.timestamp))}</td>
      <td class="${t.message}">${a(e.message || "")}</td>
    </tr>
  `;
}
function He(e, t, o) {
  const { useIconCopyButton: r = !1, showCount: s = !0 } = o, n = T(e), i = A(e, !0), c = De(t, r), d = s ? `<span class="${t.muted}">${b(ie(e))} keys</span>` : "";
  return `
    <div class="${t.jsonPanel}" data-copy-content="${a(n)}">
      <div class="${t.jsonHeader}">
        <span class="${t.jsonViewerTitle}">Custom Data</span>
        <div class="${t.jsonActions}">
          ${d}
          ${c}
        </div>
      </div>
      <div class="${t.jsonContent}">
        <pre>${i}</pre>
      </div>
    </div>
  `;
}
function Ke(e, t, o) {
  const { maxLogEntries: r = 50 } = o;
  if (!e.length) return `<div class="${t.emptyState}">No custom logs yet.</div>`;
  const s = e.slice(-r).reverse().map((n) => Fe(n, t)).join("");
  return `
    <table class="${t.table}">
      <thead>
        <tr>
          <th>Category</th>
          <th>Time</th>
          <th>Message</th>
        </tr>
      </thead>
      <tbody>${s}</tbody>
    </table>
  `;
}
function N(e, t, o = {}) {
  const { dataFilterFn: r } = o, s = e.data || {}, n = r ? r(s) : s, i = e.logs || [], c = Object.keys(n).length > 0, d = i.length > 0;
  if (!c && !d) return `<div class="${t.emptyState}">No custom data captured</div>`;
  let l = "";
  return c && (l += He(n, t, o)), d && (l += `
      <div class="${t.jsonPanel}">
        <div class="${t.jsonHeader}">
          <span class="${t.jsonViewerTitle}">Custom Logs</span>
          <span class="${t.muted}">${b(i.length)} entries</span>
        </div>
        <div class="${t.jsonContent}">
          ${Ke(i, t, o)}
        </div>
      </div>
    `), c && d ? `<div class="${t.jsonGrid}">${l}</div>` : l;
}
function Je(e) {
  return e.id ? e.id : `jserr-${q(`${e.timestamp || ""}|${e.type || ""}|${e.message || ""}|${e.source || ""}|${e.line ?? ""}`)}`;
}
function Ve(e) {
  switch ((e || "").toLowerCase()) {
    case "uncaught":
      return "error";
    case "unhandled_rejection":
      return "error";
    case "console_error":
      return "warn";
    case "network_error":
      return "warn";
    default:
      return "error";
  }
}
function Ue(e) {
  switch ((e || "").toLowerCase()) {
    case "uncaught":
      return "Uncaught";
    case "unhandled_rejection":
      return "Rejection";
    case "console_error":
      return "Console";
    case "network_error":
      return "Network";
    default:
      return e || "Error";
  }
}
function Qe(e, t, o) {
  const r = Ue(e.type), s = Ve(e.type), n = t.badgeLevel(s), i = e.message || "", c = e.source || "", d = !!e.stack, l = e.type === "network_error" && e.extra?.request_url ? String(e.extra.request_url) : c && e.line ? `${c}:${e.line}${e.column ? ":" + e.column : ""}` : c || "", p = d ? `<span class="${t.expandIcon}">&#9654;</span>` : "", u = d ? t.expandableRow : "", g = o.compact ? a(i.length > 100 ? i.slice(0, 100) + "..." : i) : a(i), v = !o.compact && l ? `<td class="${t.timestamp}" title="${a(l)}">${a(l.length > 60 ? "..." + l.slice(-57) : l)}</td>` : "", $ = !o.compact && e.url ? `<td class="${t.timestamp}" title="${a(e.url)}">${a(e.url.length > 40 ? "..." + e.url.slice(-37) : e.url)}</td>` : "";
  let w = "";
  return d && (w = `
      <tr class="${t.expansionRow}">
        <td colspan="${o.compact ? 3 : 5}">
          <div class="${t.expandedContent}">
            <pre style="margin:0;white-space:pre-wrap;word-break:break-all;font-size:0.8em;opacity:0.85">${a(e.stack)}</pre>
          </div>
        </td>
      </tr>
    `), `
    <tr class="${t.rowError} ${u}" data-row-key="${C(Je(e))}">
      <td>${p}<span class="${n}">${a(r)}</span></td>
      <td class="${t.timestamp}">${a(m(e.timestamp))}</td>
      <td class="${t.message}" title="${a(i)}">${g}</td>
      ${v}
      ${$}
    </tr>
    ${w}
  `;
}
function We(e, t) {
  return `
    <div class="${t.panelControls}">
      <label class="${t.sortToggle}">
        <input type="checkbox" data-sort-toggle="jserrors" ${e ? "checked" : ""}>
        <span>Newest first</span>
      </label>
    </div>
  `;
}
function j(e, t, o = {}) {
  const { newestFirst: r = !0, maxEntries: s = 100, compact: n = !1, showSortToggle: i = !1 } = o, c = i ? We(r, t) : "";
  if (!e.length) return c + `<div class="${t.emptyState}">No JS errors captured</div>`;
  let d = s ? e.slice(-s) : e;
  r && (d = [...d].reverse());
  const l = d.map((g) => Qe(g, t, {
    ...o,
    compact: n
  })).join(""), p = n ? "" : "<th>Location</th>", u = n ? "" : "<th>Page</th>";
  return `
    ${c}
    <table class="${t.table}">
      <thead>
        <tr>
          <th>Type</th>
          <th>Time</th>
          <th>Message</th>
          ${p}
          ${u}
        </tr>
      </thead>
      <tbody data-live-list>${l}</tbody>
    </table>
  `;
}
function D(e) {
  switch (e) {
    case "healthy":
      return {
        label: "Healthy",
        color: "#22c55e",
        bgColor: "rgba(34, 197, 94, 0.1)",
        icon: "success"
      };
    case "missing_grants":
      return {
        label: "Missing Grants",
        color: "#ef4444",
        bgColor: "rgba(239, 68, 68, 0.1)",
        icon: "error"
      };
    case "claims_stale":
      return {
        label: "Resolver Drift",
        color: "#f97316",
        bgColor: "rgba(249, 115, 22, 0.1)",
        icon: "warning"
      };
    case "scope_mismatch":
      return {
        label: "Scope/Policy Mismatch",
        color: "#eab308",
        bgColor: "rgba(234, 179, 8, 0.1)",
        icon: "warning"
      };
    case "error":
      return {
        label: "Error",
        color: "#ef4444",
        bgColor: "rgba(239, 68, 68, 0.1)",
        icon: "error"
      };
    default:
      return {
        label: "Unknown",
        color: "#6b7280",
        bgColor: "rgba(107, 114, 128, 0.1)",
        icon: "unknown"
      };
  }
}
function Ge(e) {
  switch (e) {
    case "ok":
      return {
        color: "#22c55e",
        bgColor: "rgba(34, 197, 94, 0.15)"
      };
    case "error":
      return {
        color: "#ef4444",
        bgColor: "rgba(239, 68, 68, 0.15)"
      };
    case "warning":
      return {
        color: "#f97316",
        bgColor: "rgba(249, 115, 22, 0.15)"
      };
    default:
      return {
        color: "#6b7280",
        bgColor: "rgba(107, 114, 128, 0.15)"
      };
  }
}
function Xe(e) {
  const t = D(e.verdict), o = e.user_info || {};
  let r = "";
  return (o.username || o.user_id) && (r = `
      <div style="display: flex; gap: 12px; font-size: 12px; color: #94a3b8; margin-top: 8px;">
        ${o.username ? `<span>User: <strong style="color: #e2e8f0;">${a(o.username)}</strong></span>` : ""}
        ${o.role ? `<span>Role: <strong style="color: #e2e8f0;">${a(o.role)}</strong></span>` : ""}
        ${o.tenant_id ? `<span>Tenant: <strong style="color: #e2e8f0;">${a(o.tenant_id)}</strong></span>` : ""}
        ${o.org_id ? `<span>Org: <strong style="color: #e2e8f0;">${a(o.org_id)}</strong></span>` : ""}
      </div>
    `), `
    <div style="
      background: ${t.bgColor};
      border: 1px solid ${t.color}40;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 16px;
    ">
      <div style="display: flex; align-items: center; gap: 12px;">
        <span style="
          font-size: 24px;
          color: ${t.color};
        ">${h(t.icon, { size: "24px" })}</span>
        <div>
          <div style="
            font-size: 18px;
            font-weight: 600;
            color: ${t.color};
          ">${t.label}</div>
        </div>
      </div>
      ${r}
    </div>
  `;
}
function Ye(e) {
  const t = e.summary || {
    module_count: 0,
    required_keys: 0,
    claims_keys: 0,
    missing_keys: 0
  };
  return `
    <div style="
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      margin-bottom: 16px;
    ">
      ${[
    {
      label: "Modules",
      value: t.module_count,
      color: "#3b82f6"
    },
    {
      label: "Required",
      value: t.required_keys,
      color: "#8b5cf6"
    },
    {
      label: "Resolved",
      value: t.claims_keys,
      color: "#22c55e"
    },
    {
      label: "Missing",
      value: t.missing_keys,
      color: t.missing_keys > 0 ? "#ef4444" : "#6b7280"
    }
  ].map((o) => `
        <div style="
          background: ${o.color}20;
          border: 1px solid ${o.color}40;
          border-radius: 6px;
          padding: 8px 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          min-width: 80px;
        ">
          <span style="font-size: 20px; font-weight: 700; color: ${o.color};">${o.value}</span>
          <span style="font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">${o.label}</span>
        </div>
      `).join("")}
    </div>
  `;
}
function Ze(e, t) {
  const o = Ge(e.status), r = (s) => s ? `<span style="color: #22c55e;">${h("success", { size: "14px" })}</span>` : `<span style="color: #ef4444;">${h("error", { size: "14px" })}</span>`;
  return `
    <tr style="border-bottom: 1px solid #334155;">
      <td style="padding: 10px 12px; font-family: monospace; font-size: 12px; color: #e2e8f0;">
        ${a(e.permission)}
        ${e.module ? `<span style="color: #64748b; font-size: 10px; margin-left: 8px;">(${a(e.module)})</span>` : ""}
      </td>
      <td style="padding: 10px 12px; text-align: center;">${r(e.required)}</td>
      <td style="padding: 10px 12px; text-align: center;">${r(e.in_claims)}</td>
      <td style="padding: 10px 12px; text-align: center;">${r(e.allows)}</td>
      <td style="padding: 10px 12px;">
        <span style="
          display: inline-block;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 11px;
          background: ${o.bgColor};
          color: ${o.color};
        ">${a(e.diagnosis)}</span>
      </td>
    </tr>
  `;
}
function et(e) {
  const t = e.entries || [];
  return t.length === 0 ? `
      <div style="
        text-align: center;
        padding: 24px;
        color: #64748b;
        font-style: italic;
      ">No permissions to display</div>
    ` : `
    <div style="margin-bottom: 16px;">
      <h3 style="
        font-size: 14px;
        font-weight: 600;
        color: #e2e8f0;
        margin: 0 0 12px 0;
        padding-bottom: 8px;
        border-bottom: 1px solid #334155;
      ">Permission Details</h3>
      <div style="overflow-x: auto;">
        <table style="
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        ">
          <thead>
            <tr style="background: #1e293b; border-bottom: 2px solid #334155;">
              <th style="padding: 10px 12px; text-align: left; color: #94a3b8; font-weight: 600;">Permission</th>
              <th style="padding: 10px 12px; text-align: center; color: #94a3b8; font-weight: 600; width: 80px;">Required</th>
              <th style="padding: 10px 12px; text-align: center; color: #94a3b8; font-weight: 600; width: 80px;">Listed</th>
              <th style="padding: 10px 12px; text-align: center; color: #94a3b8; font-weight: 600; width: 80px;">Allows</th>
              <th style="padding: 10px 12px; text-align: left; color: #94a3b8; font-weight: 600;">Diagnosis</th>
            </tr>
          </thead>
          <tbody>
            ${t.map((o, r) => Ze(o, r)).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}
function tt(e) {
  const t = e.next_actions || [];
  return t.length === 0 ? "" : `
    <div style="
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 16px;
    ">
      <h3 style="
        font-size: 14px;
        font-weight: 600;
        color: #e2e8f0;
        margin: 0 0 12px 0;
        display: flex;
        align-items: center;
        gap: 8px;
      ">
        <span style="color: ${D(e.verdict).color};">Next Actions</span>
      </h3>
      <ul style="
        margin: 0;
        padding: 0 0 0 20px;
        color: #cbd5e1;
        font-size: 13px;
        line-height: 1.6;
      ">
        ${t.map((o) => o.startsWith("  -") ? `<li style="margin-left: 20px; color: #94a3b8;">${a(o.trim().slice(2))}</li>` : `<li>${a(o)}</li>`).join("")}
      </ul>
    </div>
  `;
}
function ot(e) {
  return `
    <details style="margin-top: 16px;">
      <summary style="
        cursor: pointer;
        padding: 12px;
        background: #1e293b;
        border: 1px solid #334155;
        border-radius: 6px;
        color: #94a3b8;
        font-size: 13px;
        user-select: none;
      ">
        <span style="margin-left: 8px;">Raw JSON Data</span>
      </summary>
      <div style="
        margin-top: 8px;
        background: #0f172a;
        border: 1px solid #334155;
        border-radius: 6px;
        padding: 12px;
        overflow-x: auto;
      ">
        <pre style="
          margin: 0;
          font-family: monospace;
          font-size: 11px;
          color: #e2e8f0;
          white-space: pre-wrap;
          word-break: break-word;
        ">${a(T(e))}</pre>
      </div>
    </details>
  `;
}
function V(e, t, o = {}) {
  const { showRawJSON: r = !0, showCollapsible: s = !0 } = o;
  return e ? `
    <div style="padding: 8px;">
      ${Xe(e)}
      ${Ye(e)}
      ${et(e)}
      ${tt(e)}
      ${r ? ot(e) : ""}
    </div>
  ` : `<div class="${t.emptyState}">No permissions data available</div>`;
}
function rt(e, t) {
  if (!e) return `<div class="${t.emptyState}">No permissions data</div>`;
  const o = D(e.verdict), r = e.summary || {
    module_count: 0,
    required_keys: 0,
    claims_keys: 0,
    missing_keys: 0
  };
  return `
    <div style="padding: 8px;">
      <div style="
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 12px;
      ">
        <span style="
          font-size: 18px;
          color: ${o.color};
        ">${h(o.icon, { size: "18px" })}</span>
        <span style="
          font-size: 14px;
          font-weight: 600;
          color: ${o.color};
        ">${o.label}</span>
      </div>
      <div style="
        display: flex;
        gap: 16px;
        font-size: 12px;
        color: #94a3b8;
      ">
        <span>Required: <strong style="color: #e2e8f0;">${r.required_keys}</strong></span>
        <span>Claims: <strong style="color: #e2e8f0;">${r.claims_keys}</strong></span>
        <span>Missing: <strong style="color: ${r.missing_keys > 0 ? "#ef4444" : "#e2e8f0"};">${r.missing_keys}</strong></span>
      </div>
    </div>
  `;
}
function z(e) {
  switch ((e || "").toLowerCase()) {
    case "error":
      return {
        label: "Error",
        color: "#ef4444",
        bgColor: "rgba(239, 68, 68, 0.1)",
        borderColor: "rgba(239, 68, 68, 0.4)",
        icon: "error"
      };
    case "warn":
      return {
        label: "Warning",
        color: "#f59e0b",
        bgColor: "rgba(245, 158, 11, 0.1)",
        borderColor: "rgba(245, 158, 11, 0.4)",
        icon: "warning"
      };
    case "info":
      return {
        label: "Info",
        color: "#3b82f6",
        bgColor: "rgba(59, 130, 246, 0.1)",
        borderColor: "rgba(59, 130, 246, 0.4)",
        icon: "info"
      };
    default:
      return {
        label: "OK",
        color: "#22c55e",
        bgColor: "rgba(34, 197, 94, 0.1)",
        borderColor: "rgba(34, 197, 94, 0.4)",
        icon: "success"
      };
  }
}
function ee(e) {
  switch ((e || "").toLowerCase()) {
    case "error":
      return "Unhealthy";
    case "warn":
      return "Needs Attention";
    case "info":
      return "Info Available";
    default:
      return "Healthy";
  }
}
function st(e) {
  const t = z(e.verdict), o = ee(e.verdict);
  return `
    <div style="
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 16px;
      background: ${t.bgColor};
      border: 1px solid ${t.borderColor};
      border-radius: 8px;
    ">
      <span style="
        font-size: 24px;
        color: ${t.color};
        line-height: 1;
      ">${h(t.icon, { size: "24px" })}</span>
      <div>
        <div style="
          font-size: 16px;
          font-weight: 600;
          color: ${t.color};
        ">${a(o)}</div>
        <div style="
          font-size: 11px;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        ">System Status</div>
      </div>
    </div>
  `;
}
function nt(e) {
  const t = e || {
    checks: 0,
    ok: 0,
    info: 0,
    warn: 0,
    error: 0
  };
  return `
    <div style="
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    ">
      ${[
    {
      label: "Total",
      value: t.checks || 0,
      color: "#64748b"
    },
    {
      label: "OK",
      value: t.ok || 0,
      color: "#22c55e"
    },
    {
      label: "Info",
      value: t.info || 0,
      color: "#3b82f6"
    },
    {
      label: "Warn",
      value: t.warn || 0,
      color: t.warn ? "#f59e0b" : "#64748b"
    },
    {
      label: "Error",
      value: t.error || 0,
      color: t.error ? "#ef4444" : "#64748b"
    }
  ].map((o) => `
        <div style="
          background: ${o.color}15;
          border: 1px solid ${o.color}30;
          border-radius: 6px;
          padding: 8px 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          min-width: 60px;
        ">
          <span style="
            font-size: 18px;
            font-weight: 700;
            color: ${o.color};
            line-height: 1.2;
          ">${o.value}</span>
          <span style="
            font-size: 10px;
            color: #94a3b8;
            text-transform: uppercase;
            letter-spacing: 0.3px;
          ">${o.label}</span>
        </div>
      `).join("")}
    </div>
  `;
}
function at(e) {
  const t = e.generated_at ? new Date(e.generated_at).toLocaleString() : "";
  return `
    <div style="
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    ">
      ${st(e)}
      <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 8px;">
        ${nt(e.summary)}
        ${t ? `<span style="font-size: 11px; color: #64748b;">Generated: ${a(t)}</span>` : ""}
      </div>
    </div>
  `;
}
function it(e) {
  const t = z(e.severity), o = String(e.message || "").trim(), r = String(e.hint || "").trim(), s = String(e.code || "").trim(), n = String(e.component || "").trim();
  if (!o) return "";
  const i = [s, n].filter(Boolean).join(" • ");
  return `
    <div style="
      display: flex;
      gap: 10px;
      padding: 10px 12px;
      background: ${t.bgColor};
      border-left: 3px solid ${t.color};
      border-radius: 0 6px 6px 0;
      margin-bottom: 8px;
    ">
      <span style="
        font-size: 14px;
        color: ${t.color};
        line-height: 1.4;
      ">${h(t.icon, { size: "14px" })}</span>
      <div style="flex: 1; min-width: 0;">
        <div style="
          font-size: 13px;
          color: #e2e8f0;
          line-height: 1.4;
          word-break: break-word;
        ">${a(o)}</div>
        ${r ? `
          <div style="
            margin-top: 6px;
            font-size: 12px;
            color: #94a3b8;
            display: flex;
            align-items: flex-start;
            gap: 6px;
          ">
            <span style="color: #64748b;">${h("hint", { size: "13px" })}</span>
            <span>${a(r)}</span>
          </div>
        ` : ""}
        ${i ? `
          <div style="
            margin-top: 4px;
            font-size: 11px;
            color: #64748b;
            font-family: monospace;
          ">${a(i)}</div>
        ` : ""}
      </div>
    </div>
  `;
}
function lt(e) {
  return !e || e.length === 0 ? "" : `
    <div style="margin-top: 12px;">
      <div style="
        font-size: 12px;
        font-weight: 600;
        color: #94a3b8;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 8px;
      ">Findings</div>
      ${e.map((t) => it(t)).join("")}
    </div>
  `;
}
function dt(e, t) {
  if (!t) return "";
  const o = String(t.description || "").trim(), r = String(t.cta || t.label || "").trim(), s = !!t.runnable, n = !!t.applicable, i = !!t.requires_confirmation, c = String(t.confirm_text || "").trim(), d = t.kind || "manual";
  let l = "enabled", p = "";
  n ? s || (l = "manual", p = d === "manual" ? "Manual action required" : "Action not available") : (l = "not-applicable", p = "Not applicable for current status");
  const u = l !== "enabled", g = u ? "background: #374151; color: #6b7280; cursor: not-allowed;" : "background: #3b82f6; color: #fff; cursor: pointer;";
  return `
    <div style="
      margin-top: 12px;
      padding: 12px;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 8px;
    ">
      <div style="
        font-size: 12px;
        font-weight: 600;
        color: #94a3b8;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 8px;
      ">How to Fix</div>
      ${o ? `
        <div style="
          font-size: 13px;
          color: #cbd5e1;
          line-height: 1.5;
          margin-bottom: 12px;
        ">${a(o)}</div>
      ` : ""}
      <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
        ${r ? `
          <button
            type="button"
            class="debug-btn"
            data-doctor-action-run="${a(e)}"
            ${c ? `data-doctor-action-confirm="${a(c)}"` : ""}
            ${i ? 'data-doctor-action-requires-confirmation="true"' : ""}
            ${u ? "disabled" : ""}
            style="
              padding: 8px 16px;
              border: none;
              border-radius: 6px;
              font-size: 13px;
              font-weight: 500;
              ${g}
            "
          >${a(r)}</button>
        ` : ""}
        ${p ? `
          <span style="
            font-size: 12px;
            color: #64748b;
            font-style: italic;
          ">${a(p)}</span>
        ` : ""}
      </div>
    </div>
  `;
}
function ct(e) {
  return e == null ? '<span style="color: #64748b; font-style: italic;">null</span>' : typeof e == "boolean" ? `<span style="color: ${e ? "#22c55e" : "#ef4444"}; font-weight: 500;">${e}</span>` : typeof e == "number" ? `<span style="color: #818cf8;">${e}</span>` : typeof e == "string" ? `<span style="color: #fbbf24;">"${a(e)}"</span>` : typeof e == "object" ? `<span style="color: #94a3b8;">${a(JSON.stringify(e))}</span>` : a(String(e));
}
function pt(e) {
  if (!e || Object.keys(e).length === 0) return "";
  const t = Object.entries(e).map(([o, r]) => `
      <tr>
        <td style="
          padding: 4px 8px 4px 0;
          color: #94a3b8;
          font-size: 12px;
          vertical-align: top;
          white-space: nowrap;
        ">${a(o)}:</td>
        <td style="
          padding: 4px 0;
          font-family: monospace;
          font-size: 11px;
          word-break: break-all;
        ">${ct(r)}</td>
      </tr>
    `).join("");
  return `
    <details style="margin-top: 12px;">
      <summary style="
        cursor: pointer;
        padding: 8px 12px;
        background: #0f172a;
        border: 1px solid #1e293b;
        border-radius: 6px;
        color: #64748b;
        font-size: 12px;
        user-select: none;
      ">
        <span style="margin-left: 8px;">Metadata (${Object.keys(e).length} keys)</span>
      </summary>
      <div style="
        margin-top: 4px;
        padding: 12px;
        background: #0f172a;
        border: 1px solid #1e293b;
        border-radius: 6px;
      ">
        <table style="width: 100%; border-collapse: collapse;">
          <tbody>${t}</tbody>
        </table>
      </div>
    </details>
  `;
}
function ut(e) {
  const t = z(e.status), o = String(e.label || e.id || "").trim(), r = String(e.summary || "").trim(), s = String(e.help || e.description || "").trim(), n = e.duration_ms !== void 0 ? `${e.duration_ms}ms` : "";
  return `
    <div style="
      border: 1px solid ${t.borderColor};
      border-left: 4px solid ${t.color};
      border-radius: 0 8px 8px 0;
      margin-bottom: 12px;
      background: #0f172a;
      overflow: hidden;
    ">
      <!-- Card Header -->
      <div style="
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        background: ${t.bgColor};
        border-bottom: 1px solid ${t.borderColor};
      ">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: ${t.color};
            color: #fff;
            border-radius: 50%;
            font-size: 12px;
            font-weight: 600;
          ">${h(t.icon, { size: "12px" })}</span>
          <div>
            <div style="
              font-size: 14px;
              font-weight: 600;
              color: #e2e8f0;
            ">${a(o)}</div>
            <div style="
              font-size: 11px;
              color: #64748b;
              font-family: monospace;
            ">${a(e.id || "")}</div>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 12px;">
          ${n ? `
            <span style="
              font-size: 11px;
              color: #64748b;
              font-family: monospace;
            ">${a(n)}</span>
          ` : ""}
          <span style="
            padding: 4px 10px;
            border-radius: 999px;
            font-size: 11px;
            font-weight: 600;
            color: ${t.color};
            background: ${t.bgColor};
            border: 1px solid ${t.borderColor};
          ">${a(t.label)}</span>
        </div>
      </div>

      <!-- Card Body -->
      <div style="padding: 16px;">
        <!-- Summary -->
        ${r ? `
          <div style="
            font-size: 13px;
            color: #cbd5e1;
            line-height: 1.5;
          ">${a(r)}</div>
        ` : ""}

        <!-- Help Section -->
        ${s ? `
          <details style="margin-top: 12px;">
            <summary style="
              cursor: pointer;
              font-size: 12px;
              font-weight: 600;
              color: #94a3b8;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              user-select: none;
            ">What This Means</summary>
            <div style="
              margin-top: 8px;
              padding: 12px;
              background: #1e293b;
              border-radius: 6px;
              font-size: 13px;
              color: #94a3b8;
              line-height: 1.5;
            ">${a(s)}</div>
          </details>
        ` : ""}

        <!-- Findings -->
        ${lt(e.findings)}

        <!-- Action -->
        ${dt(e.id, e.action)}

        <!-- Metadata -->
        ${pt(e.metadata)}
      </div>
    </div>
  `;
}
function gt(e) {
  return !e || e.length === 0 ? "" : `
    <div style="
      margin-top: 20px;
      padding: 16px;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 8px;
    ">
      <div style="
        font-size: 14px;
        font-weight: 600;
        color: #e2e8f0;
        margin-bottom: 12px;
        display: flex;
        align-items: center;
        gap: 8px;
      ">
        <span style="color: #f59e0b;">${h("nextAction", { size: "14px" })}</span>
        Recommended Next Actions
      </div>
      <ol style="
        margin: 0;
        padding: 0 0 0 20px;
        color: #cbd5e1;
        font-size: 13px;
        line-height: 1.6;
      ">
        ${e.map((t) => `<li style="margin-bottom: 4px;">${a(t)}</li>`).join("")}
      </ol>
    </div>
  `;
}
function bt(e) {
  return `
    <details style="margin-top: 20px;">
      <summary style="
        cursor: pointer;
        padding: 12px;
        background: #1e293b;
        border: 1px solid #334155;
        border-radius: 6px;
        color: #64748b;
        font-size: 13px;
        user-select: none;
      ">
        <span style="margin-left: 8px;">Raw JSON Data</span>
      </summary>
      <div style="
        margin-top: 8px;
        background: #0f172a;
        border: 1px solid #334155;
        border-radius: 6px;
        padding: 12px;
        overflow-x: auto;
      ">
        <pre style="
          margin: 0;
          font-family: monospace;
          font-size: 11px;
          color: #e2e8f0;
          white-space: pre-wrap;
          word-break: break-word;
        ">${a(T(e))}</pre>
      </div>
    </details>
  `;
}
function U(e, t, o = {}) {
  const { showRawJSON: r = !0, problemsOnly: s = !1 } = o;
  if (!e) return `<div class="${t.emptyState}">No doctor diagnostics available</div>`;
  let n = e.checks || [];
  s && (n = n.filter((l) => l.status === "warn" || l.status === "error"));
  const i = {
    error: 0,
    warn: 1,
    info: 2,
    ok: 3
  };
  n = [...n].sort((l, p) => {
    const u = i[l.status || "ok"] ?? 4, g = i[p.status || "ok"] ?? 4;
    return u !== g ? u - g : (l.label || l.id || "").localeCompare(p.label || p.id || "");
  });
  const c = n.some((l) => l.status === "warn" || l.status === "error");
  let d = "";
  return n.length === 0 ? s && !c ? d = `
        <div style="
          text-align: center;
          padding: 40px 20px;
          color: #22c55e;
        ">
          <div style="font-size: 48px; margin-bottom: 12px;">${h("success", { size: "48px" })}</div>
          <div style="font-size: 18px; font-weight: 600; margin-bottom: 8px;">All Systems Healthy</div>
          <div style="font-size: 14px; color: #94a3b8;">${e.summary?.checks || 0} checks passed</div>
        </div>
      ` : d = `<div class="${t.emptyState}">No doctor checks available</div>` : d = n.map((l) => ut(l)).join(""), `
    <div style="padding: 12px;">
      ${at(e)}
      ${d}
      ${gt(e.next_actions)}
      ${r ? bt(e) : ""}
    </div>
  `;
}
function go(e, t) {
  if (!e) return `<div class="${t.emptyState}">No doctor diagnostics</div>`;
  const o = z(e.verdict), r = ee(e.verdict), s = e.summary || {
    checks: 0,
    ok: 0,
    info: 0,
    warn: 0,
    error: 0
  }, n = (s.warn || 0) + (s.error || 0);
  return `
    <div style="padding: 8px;">
      <div style="
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 12px;
      ">
        <span style="
          font-size: 20px;
          color: ${o.color};
        ">${h(o.icon, { size: "20px" })}</span>
        <span style="
          font-size: 14px;
          font-weight: 600;
          color: ${o.color};
        ">${a(r)}</span>
      </div>
      <div style="
        display: flex;
        gap: 16px;
        font-size: 12px;
        color: #94a3b8;
      ">
        <span>Checks: <strong style="color: #e2e8f0;">${s.checks || 0}</strong></span>
        <span>OK: <strong style="color: #22c55e;">${s.ok || 0}</strong></span>
        ${n > 0 ? `
          <span>Problems: <strong style="color: #ef4444;">${n}</strong></span>
        ` : ""}
      </div>
    </div>
  `;
}
function y(e, t = {}) {
  const o = t.size || 12, r = `data-site-cache-icon="${e}" aria-hidden="true" focusable="false" width="${o}" height="${o}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;flex:0 0 ${o}px;width:${o}px;height:${o}px;color:${t.color || "currentColor"};vertical-align:-2px;"`;
  switch (e) {
    case "success":
      return `<svg ${r}><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    case "warning":
      return `<svg ${r}><path d="M10.3 4.3 2.6 18a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z"></path><path d="M12 9v4"></path><path d="M12 17h.01"></path></svg>`;
    case "error":
      return `<svg ${r}><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>`;
    case "inactive":
      return `<svg ${r}><circle cx="12" cy="12" r="8"></circle></svg>`;
    case "refresh":
      return `<svg ${r}><path d="M21 12a9 9 0 0 1-15.1 6.6"></path><path d="M3 12a9 9 0 0 1 15.1-6.6"></path><path d="M18 3v5h-5"></path><path d="M6 21v-5h5"></path></svg>`;
    case "clear":
      return `<svg ${r}><path d="m7 21-4-4 10-10 4 4-8 8"></path><path d="m14 4 6 6"></path><path d="M9 21h12"></path></svg>`;
    default:
      return `<svg ${r}><circle cx="12" cy="12" r="9"></circle><path d="M9.5 9a2.6 2.6 0 1 1 4.3 2c-.9.6-1.8 1.3-1.8 2.5"></path><path d="M12 17h.01"></path></svg>`;
  }
}
function te(e) {
  const t = (e || "").toLowerCase();
  return t === "healthy" || t === "active" ? {
    label: "Healthy",
    color: "#22c55e",
    bgColor: "rgba(34, 197, 94, 0.1)",
    borderColor: "rgba(34, 197, 94, 0.4)",
    icon: "success"
  } : t === "degraded" || t === "warn" ? {
    label: "Degraded",
    color: "#f59e0b",
    bgColor: "rgba(245, 158, 11, 0.1)",
    borderColor: "rgba(245, 158, 11, 0.4)",
    icon: "warning"
  } : t === "error" || t === "startup_error" ? {
    label: "Error",
    color: "#ef4444",
    bgColor: "rgba(239, 68, 68, 0.1)",
    borderColor: "rgba(239, 68, 68, 0.4)",
    icon: "error"
  } : t === "inactive" || t === "disabled" ? {
    label: "Inactive",
    color: "#64748b",
    bgColor: "rgba(100, 116, 139, 0.1)",
    borderColor: "rgba(100, 116, 139, 0.4)",
    icon: "inactive"
  } : {
    label: e || "Unknown",
    color: "#94a3b8",
    bgColor: "rgba(148, 163, 184, 0.1)",
    borderColor: "rgba(148, 163, 184, 0.4)",
    icon: "unknown"
  };
}
function oe(e) {
  const t = (e || "").toLowerCase();
  return t === "success" || t === "ok" ? {
    label: "Success",
    color: "#22c55e",
    bgColor: "rgba(34, 197, 94, 0.1)",
    borderColor: "rgba(34, 197, 94, 0.4)",
    icon: "success"
  } : t === "failed" || t === "error" ? {
    label: "Failed",
    color: "#ef4444",
    bgColor: "rgba(239, 68, 68, 0.1)",
    borderColor: "rgba(239, 68, 68, 0.4)",
    icon: "error"
  } : t === "unsupported" || t === "none" ? {
    label: "Unsupported",
    color: "#f59e0b",
    bgColor: "rgba(245, 158, 11, 0.1)",
    borderColor: "rgba(245, 158, 11, 0.4)",
    icon: "warning"
  } : {
    label: e || "Unknown",
    color: "#94a3b8",
    bgColor: "rgba(148, 163, 184, 0.1)",
    borderColor: "rgba(148, 163, 184, 0.4)",
    icon: "unknown"
  };
}
function ft(e) {
  let t = e.status;
  e.configured && e.active || (t = "inactive");
  const o = te(t);
  let r = o.label;
  return e.configured ? e.active || (r = "Inactive") : r = "Not Configured", `
    <div style="
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 5px 10px;
      background: ${o.bgColor};
      border: 1px solid ${o.borderColor};
      border-radius: 5px;
    ">
      ${y(o.icon, {
    size: 13,
    color: o.color
  })}
      <span style="
        font-size: 12px;
        font-weight: 600;
        color: ${o.color};
      ">${a(r)}</span>
    </div>
  `;
}
function ht(e) {
  const t = e.backend || "none", o = e.scope || "unknown", r = o === "process_local", s = r ? "rgba(245, 158, 11, 0.15)" : "rgba(100, 116, 139, 0.15)", n = r ? "rgba(245, 158, 11, 0.3)" : "rgba(100, 116, 139, 0.3)", i = r ? "#f59e0b" : "#94a3b8";
  return `
    <div style="
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
    ">
      <span style="
        padding: 5px 8px;
        background: #1e293b;
        border: 1px solid #334155;
        border-radius: 4px;
        font-family: monospace;
        color: #e2e8f0;
      ">${a(t)}</span>
      <span style="
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 5px 8px;
        background: ${s};
        border: 1px solid ${n};
        border-radius: 4px;
        color: ${i};
        font-weight: 500;
      ">${r ? y("warning", {
    size: 13,
    color: i
  }) : ""}<span>${a(o)}</span></span>
      ${e.observed_by ? `
        <span style="color: #64748b; font-size: 11px;">
          obs: ${a(e.observed_by)}
        </span>
      ` : ""}
    </div>
  `;
}
function mt() {
  return `
    <button
      type="button"
      class="debug-btn"
      data-debug-action="clear-panel"
      style="
        padding: 5px 10px;
        background: #dc2626;
        color: #fff;
        border: none;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 500;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        line-height: 1;
      "
    >
      ${y("clear", {
    size: 13,
    color: "#fff"
  })}
      <span>Clear Cache</span>
    </button>
  `;
}
function Q(e) {
  return `
    <div style="
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 14px;
      padding-bottom: 10px;
      border-bottom: 1px solid #1e293b;
      flex-wrap: wrap;
    ">
      ${ft(e)}
      <span style="color: #334155; font-size: 10px;">│</span>
      ${ht(e)}
      ${e.active ? `
        <div style="margin-left: auto;">
          ${mt()}
        </div>
      ` : ""}
    </div>
  `;
}
function xt(e) {
  const t = e || {}, o = t.lookups || 0, r = t.hits || 0, s = t.misses || 0, n = t.writes || 0, i = t.errors || 0, c = t.clears || 0;
  let d = "N/A";
  return o > 0 && (d = `${((t.hit_ratio !== null && t.hit_ratio !== void 0 ? t.hit_ratio : r / o) * 100).toFixed(1)}%`), `
    <div style="
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(75px, 1fr));
      gap: 6px;
      margin-bottom: 16px;
    ">
      ${[
    {
      label: "Lookups",
      value: b(o),
      color: "#64748b"
    },
    {
      label: "Hits",
      value: b(r),
      color: "#22c55e"
    },
    {
      label: "Misses",
      value: b(s),
      color: "#f59e0b"
    },
    {
      label: "Writes",
      value: b(n),
      color: "#3b82f6"
    },
    {
      label: "Errors",
      value: b(i),
      color: i > 0 ? "#ef4444" : "#64748b"
    },
    {
      label: "Clears",
      value: b(c),
      color: "#8b5cf6"
    },
    {
      label: "Hit Rate",
      value: d,
      color: o > 0 ? "#22c55e" : "#64748b"
    }
  ].map((l) => `
        <div style="
          background: ${l.color}15;
          border: 1px solid ${l.color}30;
          border-radius: 5px;
          padding: 8px 10px;
          text-align: center;
        ">
          <div style="
            font-size: 16px;
            font-weight: 600;
            color: ${l.color};
            line-height: 1.2;
          ">${l.value}</div>
          <div style="
            font-size: 10px;
            color: #94a3b8;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            margin-top: 2px;
          ">${l.label}</div>
        </div>
      `).join("")}
    </div>
  `;
}
function yt(e) {
  if (!e) return "";
  const t = oe(e.outcome), o = e.timestamp ? m(e.timestamp) : "";
  return `
    <div style="
      margin-bottom: 12px;
      padding: 10px 12px;
      background: ${t.bgColor};
      border: 1px solid ${t.borderColor};
      border-left: 3px solid ${t.color};
      border-radius: 0 6px 6px 0;
    ">
      <div style="
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 6px;
      ">
        <div style="
          font-size: 11px;
          font-weight: 600;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.4px;
        ">Last Command</div>
        <span style="
          padding: 2px 6px;
          border-radius: 3px;
          font-size: 10px;
          font-weight: 600;
          color: ${t.color};
          background: ${t.bgColor};
          border: 1px solid ${t.borderColor};
        ">${a(t.label)}</span>
      </div>
      <div style="
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
        font-size: 12px;
        color: #cbd5e1;
      ">
        <span><strong>Command:</strong> ${a(e.command || "unknown")}</span>
        <span><strong>Mode:</strong> ${a(e.mode || "none")}</span>
        ${e.target_count !== void 0 ? `<span><strong>Targets:</strong> ${e.target_count}</span>` : ""}
        ${o ? `<span style="color: #64748b;">${a(o)}</span>` : ""}
      </div>
      ${e.message ? `
        <div style="
          margin-top: 6px;
          font-size: 11px;
          color: #94a3b8;
          font-style: italic;
        ">${a(e.message)}</div>
      ` : ""}
    </div>
  `;
}
function vt(e) {
  return e ? `
    <div style="
      margin-bottom: 12px;
      padding: 10px 12px;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.4);
      border-left: 3px solid #ef4444;
      border-radius: 0 6px 6px 0;
    ">
      <div style="
        font-size: 11px;
        font-weight: 600;
        color: #ef4444;
        text-transform: uppercase;
        letter-spacing: 0.4px;
        margin-bottom: 6px;
      ">Startup Error</div>
      <div style="
        font-size: 12px;
        color: #fca5a5;
        line-height: 1.5;
      ">${a(e.message || "Unknown error")}</div>
      <div style="
        margin-top: 6px;
        display: flex;
        gap: 12px;
        font-size: 11px;
        color: #94a3b8;
      ">
        ${e.backend ? `<span><strong>Backend:</strong> ${a(e.backend)}</span>` : ""}
        ${e.error_kind ? `<span><strong>Kind:</strong> ${a(e.error_kind)}</span>` : ""}
        ${e.fail_closed !== void 0 ? `<span><strong>Fail Closed:</strong> ${e.fail_closed ? "Yes" : "No"}</span>` : ""}
      </div>
    </div>
  ` : "";
}
function $t(e) {
  return `
    <tr style="border-bottom: 1px solid #1e293b;">
      <td style="padding: 5px 8px; color: #64748b; font-size: 10px; white-space: nowrap;">${a(e.timestamp ? m(e.timestamp) : "")}</td>
      <td style="padding: 5px 8px;">
        <span style="
          padding: 2px 5px;
          background: rgba(239, 68, 68, 0.15);
          border-radius: 3px;
          font-size: 10px;
          color: #f87171;
        ">${a(e.operation || "unknown")}</span>
      </td>
      <td style="padding: 5px 8px; font-size: 11px; color: #cbd5e1;">${a(e.message || "")}</td>
      <td style="padding: 5px 8px; font-size: 10px; color: #64748b; font-family: monospace;">
        ${e.key?.route_hint ? a(e.key.route_hint) : e.key?.key_hash ? a(e.key.key_hash.slice(0, 12)) : ""}
      </td>
    </tr>
  `;
}
function wt(e, t = 10) {
  const o = e || [];
  if (o.length === 0) return "";
  const r = o.slice(-t).reverse();
  return `
    <div style="margin-bottom: 12px;">
      <div style="
        font-size: 11px;
        font-weight: 600;
        color: #ef4444;
        text-transform: uppercase;
        letter-spacing: 0.4px;
        margin-bottom: 6px;
        display: flex;
        align-items: center;
        gap: 5px;
      ">
        ${y("warning", {
    size: 13,
    color: "#ef4444"
  })} Recent Errors (${o.length})
      </div>
      <div style="
        background: #0f172a;
        border: 1px solid #1e293b;
        border-radius: 5px;
        overflow: hidden;
      ">
        <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
          <thead>
            <tr style="background: #1e293b;">
              <th style="padding: 6px 8px; text-align: left; color: #94a3b8; font-weight: 500; font-size: 10px;">Time</th>
              <th style="padding: 6px 8px; text-align: left; color: #94a3b8; font-weight: 500; font-size: 10px;">Operation</th>
              <th style="padding: 6px 8px; text-align: left; color: #94a3b8; font-weight: 500; font-size: 10px;">Message</th>
              <th style="padding: 6px 8px; text-align: left; color: #94a3b8; font-weight: 500; font-size: 10px;">Key</th>
            </tr>
          </thead>
          <tbody>
            ${r.map((s) => $t(s)).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}
function W(e) {
  return e == null ? '<span style="color: #64748b; font-style: italic;">null</span>' : typeof e == "boolean" ? `<span style="color: ${e ? "#22c55e" : "#64748b"}; font-weight: 500;">${e}</span>` : typeof e == "number" ? `<span style="color: #818cf8;">${e}</span>` : typeof e == "string" ? e === "" ? '<span style="color: #64748b; font-style: italic;">empty</span>' : `<span style="color: #fbbf24;">${a(e)}</span>` : a(String(e));
}
function kt(e) {
  if (!e) return "";
  const t = [
    {
      key: "enabled",
      value: e.enabled
    },
    {
      key: "backend",
      value: e.backend
    },
    {
      key: "fresh_ttl",
      value: e.fresh_ttl
    },
    {
      key: "stale_ttl",
      value: e.stale_ttl
    },
    {
      key: "render_version",
      value: e.render_version
    },
    {
      key: "namespace",
      value: e.namespace
    },
    {
      key: "debug_headers",
      value: e.debug_headers
    },
    {
      key: "debug_keys",
      value: e.debug_keys
    },
    {
      key: "fail_closed",
      value: e.fail_closed
    },
    {
      key: "require_tag_index",
      value: e.require_tag_index
    },
    {
      key: "max_capture_body_size",
      value: e.max_capture_body_size
    }
  ].map(({ key: r, value: s }) => `
    <tr>
      <td style="padding: 4px 8px 4px 0; color: #94a3b8; font-size: 12px; white-space: nowrap;">${a(r)}:</td>
      <td style="padding: 4px 0; font-family: monospace; font-size: 11px;">${W(s)}</td>
    </tr>
  `).join("");
  let o = "";
  return e.valkey && e.backend === "valkey" && (o = `
      <div style="margin-top: 8px; padding-left: 12px; border-left: 2px solid #334155;">
        <div style="font-size: 11px; color: #64748b; margin-bottom: 4px;">Valkey</div>
        <table style="width: 100%; border-collapse: collapse;">${[
    {
      key: "address",
      value: e.valkey.address
    },
    {
      key: "namespace",
      value: e.valkey.namespace
    },
    {
      key: "db",
      value: e.valkey.db
    },
    {
      key: "url_configured",
      value: e.valkey.url_configured
    },
    {
      key: "tls_enabled",
      value: e.valkey.tls_enabled
    },
    {
      key: "tls_skip_verify",
      value: e.valkey.tls_skip_verify
    },
    {
      key: "username_set",
      value: e.valkey.username_set
    },
    {
      key: "password_set",
      value: e.valkey.password_set
    }
  ].map(({ key: r, value: s }) => `
      <tr>
        <td style="padding: 4px 8px 4px 0; color: #94a3b8; font-size: 12px; white-space: nowrap;">${a(r)}:</td>
        <td style="padding: 4px 0; font-family: monospace; font-size: 11px;">${W(s)}</td>
      </tr>
    `).join("")}</table>
      </div>
    `), `
    <details style="margin-bottom: 8px;">
      <summary style="
        cursor: pointer;
        padding: 8px 10px;
        background: #1e293b;
        border: 1px solid #334155;
        border-radius: 5px;
        color: #94a3b8;
        font-size: 11px;
        font-weight: 500;
        user-select: none;
      ">
        <span style="margin-left: 6px;">Configuration</span>
      </summary>
      <div style="
        margin-top: 4px;
        padding: 10px;
        background: #0f172a;
        border: 1px solid #1e293b;
        border-radius: 5px;
      ">
        <table style="width: 100%; border-collapse: collapse;">${t}</table>
        ${o}
      </div>
    </details>
  `;
}
function Ct(e) {
  return e ? `
    <details style="margin-bottom: 8px;">
      <summary style="
        cursor: pointer;
        padding: 8px 10px;
        background: #1e293b;
        border: 1px solid #334155;
        border-radius: 5px;
        color: #94a3b8;
        font-size: 11px;
        font-weight: 500;
        user-select: none;
      ">
        <span style="margin-left: 6px;">Capabilities</span>
      </summary>
      <div style="
        margin-top: 4px;
        padding: 10px;
        background: #0f172a;
        border: 1px solid #1e293b;
        border-radius: 5px;
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      ">
        ${[
    {
      key: "tag_invalidation",
      label: "Tag Invalidation",
      value: e.tag_invalidation
    },
    {
      key: "prefix_invalidation",
      label: "Prefix Invalidation",
      value: e.prefix_invalidation
    },
    {
      key: "app_wide_tag_clear_preferred",
      label: "App-Wide Clear",
      value: e.app_wide_tag_clear_preferred
    },
    {
      key: "process_local_observed_keys",
      label: "Process Local Keys",
      value: e.process_local_observed_keys
    },
    {
      key: "backend_key_scanning_enabled",
      label: "Key Scanning",
      value: e.backend_key_scanning_enabled
    }
  ].map(({ label: t, value: o }) => {
    const r = !!o, s = r ? "#22c55e" : "#64748b";
    return `
        <span style="
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          background: ${s}15;
          border: 1px solid ${s}30;
          border-radius: 4px;
          font-size: 11px;
          color: ${s};
        ">
          ${y(r ? "success" : "error", {
      size: 13,
      color: s
    })}
          ${a(t)}
        </span>
      `;
  }).join("")}
      </div>
    </details>
  ` : "";
}
function St(e) {
  if (!e) return "";
  const t = e.timestamp ? m(e.timestamp) : "";
  return `
    <details style="margin-bottom: 8px;">
      <summary style="
        cursor: pointer;
        padding: 8px 10px;
        background: #1e293b;
        border: 1px solid #334155;
        border-radius: 5px;
        color: #94a3b8;
        font-size: 11px;
        font-weight: 500;
        user-select: none;
      ">
        <span style="margin-left: 6px;">Latest Cached Response</span>
        <span style="
          margin-left: 6px;
          padding: 2px 5px;
          background: #3b82f615;
          border-radius: 3px;
          font-size: 9px;
          color: #60a5fa;
        ">${a(e.key?.route_hint || e.key?.key_hash?.slice(0, 16) || "unknown")}</span>
      </summary>
      <div style="
        margin-top: 4px;
        padding: 10px;
        background: #0f172a;
        border: 1px solid #1e293b;
        border-radius: 5px;
      ">
        <div style="
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
          gap: 10px;
          font-size: 11px;
        ">
          <div>
            <div style="color: #64748b; margin-bottom: 2px;">Status</div>
            <div style="color: #e2e8f0; font-weight: 500;">${e.status || 0}</div>
          </div>
          <div>
            <div style="color: #64748b; margin-bottom: 2px;">Content Type</div>
            <div style="color: #e2e8f0; font-family: monospace; font-size: 10px;">${a(e.content_type || "unknown")}</div>
          </div>
          <div>
            <div style="color: #64748b; margin-bottom: 2px;">Body Size</div>
            <div style="color: #e2e8f0;">${b(e.body_size || 0)} bytes</div>
          </div>
          <div>
            <div style="color: #64748b; margin-bottom: 2px;">Headers</div>
            <div style="color: #e2e8f0;">${e.header_count || 0}</div>
          </div>
          <div>
            <div style="color: #64748b; margin-bottom: 2px;">Tags</div>
            <div style="color: #e2e8f0;">${e.tag_count || 0}</div>
          </div>
          <div>
            <div style="color: #64748b; margin-bottom: 2px;">TTL Class</div>
            <div style="color: #e2e8f0;">${a(e.ttl_class || "default")}</div>
          </div>
        </div>
        ${t ? `<div style="margin-top: 6px; font-size: 10px; color: #64748b;">Cached at: ${a(t)}</div>` : ""}
      </div>
    </details>
  `;
}
function Tt(e) {
  const t = e.observed_at ? m(e.observed_at) : "", o = e.raw_key || e.route_hint || e.key_hash?.slice(0, 16) || "unknown";
  return `
    <tr style="border-bottom: 1px solid #1e293b;">
      <td style="padding: 5px 8px; font-size: 10px; color: #64748b; white-space: nowrap;">${a(t)}</td>
      <td style="padding: 5px 8px; font-family: monospace; font-size: 10px; color: #e2e8f0; word-break: break-all;">
        ${a(o)}
        ${e.key_redacted ? '<span style="color: #64748b; font-style: italic;"> (redacted)</span>' : ""}
      </td>
      <td style="padding: 5px 8px; font-size: 10px; color: #64748b;">
        ${e.render_prefix ? '<span style="color: #8b5cf6;">render</span>' : ""}
      </td>
    </tr>
  `;
}
function _t(e, t = 20) {
  const o = e || [];
  if (o.length === 0) return "";
  const r = o.slice(-t).reverse();
  return `
    <details style="margin-bottom: 8px;">
      <summary style="
        cursor: pointer;
        padding: 8px 10px;
        background: #1e293b;
        border: 1px solid #334155;
        border-radius: 5px;
        color: #94a3b8;
        font-size: 11px;
        font-weight: 500;
        user-select: none;
      ">
        <span style="margin-left: 6px;">Observed Keys (${o.length})</span>
      </summary>
      <div style="
        margin-top: 4px;
        background: #0f172a;
        border: 1px solid #1e293b;
        border-radius: 5px;
        overflow: hidden;
        max-height: 250px;
        overflow-y: auto;
      ">
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: #1e293b; position: sticky; top: 0;">
              <th style="padding: 5px 8px; text-align: left; color: #64748b; font-weight: 500; font-size: 10px;">Time</th>
              <th style="padding: 5px 8px; text-align: left; color: #64748b; font-weight: 500; font-size: 10px;">Key</th>
              <th style="padding: 5px 8px; text-align: left; color: #64748b; font-weight: 500; font-size: 10px;">Type</th>
            </tr>
          </thead>
          <tbody>
            ${r.map((s) => Tt(s)).join("")}
          </tbody>
        </table>
      </div>
    </details>
  `;
}
function qt(e) {
  const t = e.timestamp ? m(e.timestamp) : "", o = oe(e.outcome), r = e.key?.route_hint || e.key?.key_hash?.slice(0, 12) || "";
  return `
    <tr style="border-bottom: 1px solid #1e293b;">
      <td style="padding: 5px 8px; font-size: 10px; color: #64748b; white-space: nowrap;">${a(t)}</td>
      <td style="padding: 5px 8px;">
        <span style="
          padding: 2px 5px;
          background: #3b82f615;
          border-radius: 3px;
          font-size: 10px;
          color: #60a5fa;
        ">${a(e.operation || "unknown")}</span>
      </td>
      <td style="padding: 5px 8px;">
        <span style="
          padding: 2px 5px;
          background: ${o.bgColor};
          border-radius: 3px;
          font-size: 10px;
          color: ${o.color};
        ">${a(e.outcome || "unknown")}</span>
      </td>
      <td style="padding: 5px 8px; font-family: monospace; font-size: 9px; color: #94a3b8; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
        ${a(r)}
      </td>
      <td style="padding: 5px 8px; font-size: 10px; color: #64748b;">
        ${e.message ? a(e.message.slice(0, 50)) : ""}
      </td>
    </tr>
  `;
}
function zt(e, t = 20) {
  const o = e || [];
  if (o.length === 0) return "";
  const r = o.slice(-t).reverse();
  return `
    <details style="margin-bottom: 8px;">
      <summary style="
        cursor: pointer;
        padding: 8px 10px;
        background: #1e293b;
        border: 1px solid #334155;
        border-radius: 5px;
        color: #94a3b8;
        font-size: 11px;
        font-weight: 500;
        user-select: none;
      ">
        <span style="margin-left: 6px;">Recent Operations (${o.length})</span>
      </summary>
      <div style="
        margin-top: 4px;
        background: #0f172a;
        border: 1px solid #1e293b;
        border-radius: 5px;
        overflow: hidden;
        max-height: 250px;
        overflow-y: auto;
      ">
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: #1e293b; position: sticky; top: 0;">
              <th style="padding: 5px 8px; text-align: left; color: #64748b; font-weight: 500; font-size: 10px;">Time</th>
              <th style="padding: 5px 8px; text-align: left; color: #64748b; font-weight: 500; font-size: 10px;">Operation</th>
              <th style="padding: 5px 8px; text-align: left; color: #64748b; font-weight: 500; font-size: 10px;">Outcome</th>
              <th style="padding: 5px 8px; text-align: left; color: #64748b; font-weight: 500; font-size: 10px;">Key</th>
              <th style="padding: 5px 8px; text-align: left; color: #64748b; font-weight: 500; font-size: 10px;">Message</th>
            </tr>
          </thead>
          <tbody>
            ${r.map((s) => qt(s)).join("")}
          </tbody>
        </table>
      </div>
    </details>
  `;
}
function Et(e) {
  return `
    <details style="margin-top: 12px;">
      <summary style="
        cursor: pointer;
        padding: 8px 10px;
        background: #1e293b;
        border: 1px solid #334155;
        border-radius: 5px;
        color: #64748b;
        font-size: 11px;
        user-select: none;
      ">
        <span style="margin-left: 6px;">Raw JSON Data</span>
      </summary>
      <div style="
        margin-top: 4px;
        background: #0f172a;
        border: 1px solid #1e293b;
        border-radius: 5px;
        padding: 10px;
        overflow-x: auto;
      ">
        <pre style="
          margin: 0;
          font-family: monospace;
          font-size: 10px;
          color: #e2e8f0;
          white-space: pre-wrap;
          word-break: break-word;
        ">${a(T(e))}</pre>
      </div>
    </details>
  `;
}
function G(e, t, o = {}) {
  const { maxOperations: r = 20, maxKeys: s = 20, maxErrors: n = 10, showRawJSON: i = !1 } = o;
  return e ? e.configured ? `
    <div style="padding: 14px;">
      ${Q(e)}
      ${vt(e.startup_error)}
      ${xt(e.counters)}
      ${yt(e.last_command)}
      ${wt(e.recent_errors, n)}
      ${St(e.latest_cached)}
      ${kt(e.config)}
      ${Ct(e.capabilities)}
      ${_t(e.observed_keys, s)}
      ${zt(e.recent_operations, r)}
      ${i ? Et(e) : ""}
    </div>
  ` : `
      <div style="padding: 12px;">
        ${Q(e)}
        <div style="
          text-align: center;
          padding: 32px 16px;
          color: #64748b;
        ">
          <div style="margin-bottom: 10px;">${y("inactive", {
    size: 24,
    color: "#64748b"
  })}</div>
          <div style="font-size: 14px; font-weight: 500; margin-bottom: 6px; color: #94a3b8;">Cache Not Configured</div>
          <div style="font-size: 12px;">Enable site render cache in application configuration.</div>
        </div>
      </div>
    ` : `<div class="${t.emptyState}">No site render cache data available</div>`;
}
function Rt(e, t) {
  if (!e) return `<div class="${t.emptyState}">No cache data</div>`;
  let o = e.status;
  e.configured && e.active || (o = "inactive");
  const r = te(o), s = e.counters || {}, n = s.hits || 0, i = s.misses || 0, c = s.errors || 0;
  let d = "N/A";
  const l = s.lookups || 0;
  l > 0 && (d = `${((s.hit_ratio !== null && s.hit_ratio !== void 0 ? s.hit_ratio : n / l) * 100).toFixed(1)}%`);
  const p = (e.recent_errors || []).length, u = (e.scope || "unknown") === "process_local";
  return `
    <div style="padding: 8px;">
      <div style="
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
        padding-bottom: 8px;
        border-bottom: 1px solid #1e293b;
      ">
        <span style="
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 6px;
          background: ${r.bgColor};
          border: 1px solid ${r.borderColor};
          border-radius: 4px;
        ">
          ${y(r.icon, {
    size: 13,
    color: r.color
  })}
          <span style="font-size: 11px; font-weight: 600; color: ${r.color};">${a(r.label)}</span>
        </span>
        <span style="
          padding: 3px 6px;
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 4px;
          font-size: 10px;
          font-family: monospace;
          color: #e2e8f0;
        ">${a(e.backend || "none")}</span>
        ${u ? `
          <span style="
            padding: 3px 6px;
            background: rgba(245, 158, 11, 0.15);
            border: 1px solid rgba(245, 158, 11, 0.3);
            border-radius: 4px;
            font-size: 10px;
            color: #f59e0b;
          ">${y("warning", {
    size: 12,
    color: "#f59e0b"
  })} local</span>
        ` : ""}
      </div>
      <div style="
        display: flex;
        gap: 12px;
        font-size: 11px;
        color: #94a3b8;
        flex-wrap: wrap;
      ">
        <span>Hit Rate: <strong style="color: ${l > 0 ? "#22c55e" : "#64748b"};">${d}</strong></span>
        <span>Hits: <strong style="color: #22c55e;">${b(n)}</strong></span>
        <span>Misses: <strong style="color: #f59e0b;">${b(i)}</strong></span>
        ${c > 0 || p > 0 ? `
          <span>Errors: <strong style="color: #ef4444;">${b(c)}</strong></span>
        ` : ""}
      </div>
      ${e.active ? `
        <div style="margin-top: 8px;">
          <button
            type="button"
            class="debug-btn"
            data-debug-action="clear-panel"
            style="
              padding: 4px 10px;
              background: #dc2626;
              color: #fff;
              border: none;
              border-radius: 4px;
              font-size: 11px;
              cursor: pointer;
              display: inline-flex;
              align-items: center;
              gap: 4px;
            "
          >${y("clear", {
    size: 12,
    color: "#fff"
  })} Clear</button>
        </div>
      ` : ""}
    </div>
  `;
}
function bo(e) {
  const t = Lt(e.dataset.actionPayload);
  return e instanceof HTMLFormElement && e.querySelectorAll("[data-action-field]").forEach((o) => {
    const r = o.closest("[hidden]");
    if (r && e.contains(r) || (o instanceof HTMLInputElement || o instanceof HTMLSelectElement || o instanceof HTMLTextAreaElement) && o.disabled) return;
    const s = (o.dataset.actionFieldPath || o.dataset.actionField || "").trim();
    if (!s) return;
    const n = Pt(o);
    n !== void 0 && Nt(t, s, n);
  }), t;
}
function Lt(e) {
  if (!e) return {};
  try {
    const t = JSON.parse(e);
    return t && typeof t == "object" && !Array.isArray(t) ? t : {};
  } catch {
    return {};
  }
}
function Pt(e) {
  const t = (e.dataset.actionFieldKind || "").trim().toLowerCase();
  if (e instanceof HTMLInputElement && e.type === "checkbox") return e.checked;
  const o = Mt(e).trim();
  if (o !== "") {
    if (t === "number") {
      const r = Number(o);
      return Number.isFinite(r) ? r : o;
    }
    if (t === "integer") {
      const r = Number.parseInt(o, 10);
      return Number.isFinite(r) ? r : o;
    }
    if (t === "string_list") return o.split(/[\n,]/g).map((r) => r.trim()).filter(Boolean);
    if (t === "json") try {
      return JSON.parse(o);
    } catch {
      return o;
    }
    return o;
  }
}
function Mt(e) {
  return (e instanceof HTMLInputElement || e instanceof HTMLTextAreaElement || e instanceof HTMLSelectElement) && e.value || "";
}
function Nt(e, t, o) {
  const r = t.split(".").map((n) => n.trim()).filter(Boolean);
  if (r.length === 0) return;
  let s = e;
  r.slice(0, -1).forEach((n) => {
    const i = s[n];
    (!i || typeof i != "object" || Array.isArray(i)) && (s[n] = {}), s = s[n];
  }), s[r[r.length - 1]] = o;
}
var jt = {
  id: "requests",
  label: "Requests",
  icon: "iconoir-network",
  snapshotKey: "requests",
  eventTypes: "request",
  category: "core",
  order: 10,
  render: (e, t, o) => L(e || [], t, {
    ...o,
    showSortToggle: !1,
    truncatePath: !1
  }),
  renderConsole: (e, t, o) => L(e || [], t, {
    ...o,
    showSortToggle: !1,
    truncatePath: !1
  }),
  renderToolbar: (e, t, o) => L(e || [], t, {
    ...o,
    maxEntries: 50,
    showSortToggle: !0,
    truncatePath: !0,
    maxPathLength: 50
  }),
  getCount: (e) => (e || []).length,
  handleEvent: (e, t) => _(e || [], t, 500),
  supportsToolbar: !0
}, At = {
  id: "sql",
  label: "SQL",
  icon: "iconoir-database",
  snapshotKey: "sql",
  eventTypes: "sql",
  category: "core",
  order: 20,
  render: (e, t, o) => R(e || [], t, {
    ...o,
    showSortToggle: !1,
    useIconCopyButton: !0
  }),
  renderConsole: (e, t, o) => R(e || [], t, {
    ...o,
    maxEntries: 200,
    showSortToggle: !1,
    useIconCopyButton: !0
  }),
  renderToolbar: (e, t, o) => R(e || [], t, {
    ...o,
    maxEntries: 50,
    showSortToggle: !0,
    useIconCopyButton: !1
  }),
  getCount: (e) => (e || []).length,
  handleEvent: (e, t) => _(e || [], t, 500),
  supportsToolbar: !0
}, Ot = {
  id: "logs",
  label: "Logs",
  icon: "iconoir-page",
  snapshotKey: "logs",
  eventTypes: "log",
  category: "core",
  order: 30,
  render: (e, t, o) => P(e || [], t, {
    ...o,
    showSortToggle: !1,
    showSource: !0,
    truncateMessage: !1
  }),
  renderConsole: (e, t, o) => P(e || [], t, {
    ...o,
    maxEntries: 500,
    showSortToggle: !1,
    showSource: !0,
    truncateMessage: !1
  }),
  renderToolbar: (e, t, o) => P(e || [], t, {
    newestFirst: !0,
    maxEntries: 100,
    showSortToggle: !1,
    showSource: !1,
    truncateMessage: !0,
    maxMessageLength: 100
  }),
  getCount: (e) => (e || []).length,
  handleEvent: (e, t) => _(e || [], t, 1e3),
  supportsToolbar: !0
}, Bt = {
  id: "routes",
  label: "Routes",
  icon: "iconoir-path-arrow",
  snapshotKey: "routes",
  eventTypes: [],
  category: "system",
  order: 40,
  render: (e, t) => M(e || [], t, { showName: !0 }),
  renderConsole: (e, t) => M(e || [], t, { showName: !0 }),
  renderToolbar: (e, t) => M(e || [], t, { showName: !1 }),
  getCount: (e) => (e || []).length,
  supportsToolbar: !0
}, It = {
  id: "config",
  label: "Config",
  icon: "iconoir-settings",
  snapshotKey: "config",
  eventTypes: [],
  category: "system",
  order: 50,
  render: (e, t, o) => x("Config", e, t, {
    useIconCopyButton: !0,
    showCount: !0
  }),
  renderConsole: (e, t, o) => {
    const r = o?.filterFn;
    return x("Config", e, t, {
      useIconCopyButton: !0,
      showCount: !0,
      filterFn: r
    });
  },
  renderToolbar: (e, t) => x("Config", e, t, {
    useIconCopyButton: !1,
    showCount: !1
  }),
  getCount: (e) => e && typeof e == "object" ? Object.keys(e).length : 0,
  supportsToolbar: !0
}, Dt = {
  id: "template",
  label: "Template",
  icon: "iconoir-code",
  snapshotKey: "template",
  eventTypes: "template",
  category: "data",
  order: 10,
  render: (e, t, o) => x("Template Context", e, t, {
    useIconCopyButton: !0,
    showCount: !0
  }),
  renderConsole: (e, t, o) => {
    const r = o?.filterFn;
    return x("Template Context", e, t, {
      useIconCopyButton: !0,
      showCount: !0,
      filterFn: r
    });
  },
  renderToolbar: (e, t) => x("Template Context", e, t, {
    useIconCopyButton: !1,
    showCount: !1
  }),
  getCount: (e) => e && typeof e == "object" ? Object.keys(e).length : 0,
  handleEvent: (e, t) => t,
  supportsToolbar: !0
}, Ft = {
  id: "session",
  label: "Session",
  icon: "iconoir-user",
  snapshotKey: "session",
  eventTypes: "session",
  category: "data",
  order: 20,
  render: (e, t, o) => x("Session", e, t, {
    useIconCopyButton: !0,
    showCount: !0
  }),
  renderConsole: (e, t, o) => {
    const r = o?.filterFn;
    return x("Session", e, t, {
      useIconCopyButton: !0,
      showCount: !0,
      filterFn: r
    });
  },
  renderToolbar: (e, t) => x("Session", e, t, {
    useIconCopyButton: !1,
    showCount: !1
  }),
  getCount: (e) => e && typeof e == "object" ? Object.keys(e).length : 0,
  handleEvent: (e, t) => t,
  supportsToolbar: !0
}, Ht = {
  id: "custom",
  label: "Custom",
  icon: "iconoir-puzzle",
  snapshotKey: "custom",
  eventTypes: "custom",
  category: "data",
  order: 30,
  render: (e, t, o) => N(e || {}, t, {
    useIconCopyButton: !0,
    showCount: !0
  }),
  renderConsole: (e, t, o) => {
    const r = e || {}, s = o?.dataFilterFn;
    return N(r, t, {
      maxLogEntries: 100,
      useIconCopyButton: !0,
      showCount: !0,
      dataFilterFn: s
    });
  },
  renderToolbar: (e, t) => N(e || {}, t, {
    maxLogEntries: 50,
    useIconCopyButton: !1,
    showCount: !1
  }),
  getCount: (e) => {
    const t = e || {};
    return (t.data ? Object.keys(t.data).length : 0) + (t.logs?.length || 0);
  },
  handleEvent: (e, t) => de(e, t, 500),
  supportsToolbar: !0
}, Kt = {
  id: "jserrors",
  label: "JS Errors",
  icon: "iconoir-warning-triangle",
  snapshotKey: "jserrors",
  eventTypes: "jserror",
  category: "core",
  order: 35,
  render: (e, t, o) => j(e || [], t, {
    ...o,
    compact: !1,
    showSortToggle: !1
  }),
  renderConsole: (e, t, o) => j(e || [], t, {
    ...o,
    maxEntries: 500,
    compact: !1,
    showSortToggle: !1
  }),
  renderToolbar: (e, t, o) => j(e || [], t, {
    ...o,
    maxEntries: 50,
    compact: !0,
    showSortToggle: !0
  }),
  getCount: (e) => (e || []).length,
  handleEvent: (e, t) => _(e || [], t, 500),
  supportsToolbar: !0
}, Jt = {
  id: "permissions",
  label: "Permissions",
  icon: "iconoir-shield-check",
  snapshotKey: "permissions",
  eventTypes: [],
  category: "system",
  order: 45,
  showFilters: !1,
  render: (e, t, o) => V(e, t, { showRawJSON: !0 }),
  renderConsole: (e, t, o) => V(e, t, { showRawJSON: !0 }),
  renderToolbar: (e, t, o) => rt(e, t),
  getCount: (e) => {
    const t = e;
    return !t || !t.summary ? 0 : t.summary.missing_keys;
  },
  supportsToolbar: !0
}, Vt = {
  id: "doctor",
  label: "Doctor",
  icon: "iconoir-heart",
  snapshotKey: "doctor",
  eventTypes: [],
  category: "system",
  order: 46,
  showFilters: !1,
  render: (e, t, o) => U(e, t, { showRawJSON: !0 }),
  renderConsole: (e, t, o) => U(e, t, { showRawJSON: !0 }),
  getCount: (e) => {
    const t = e;
    return !t || !t.summary ? 0 : (t.summary.error || 0) + (t.summary.warn || 0);
  },
  supportsToolbar: !1
}, Ut = {
  id: "site-render-cache",
  label: "Site Cache",
  icon: "iconoir-database",
  snapshotKey: "site-render-cache",
  eventTypes: [],
  category: "site",
  order: 80,
  showFilters: !1,
  render: (e, t) => G(e, t, { showRawJSON: !1 }),
  renderConsole: (e, t) => G(e, t, {
    showRawJSON: !0,
    maxOperations: 50,
    maxKeys: 50,
    maxErrors: 20
  }),
  renderToolbar: (e, t) => Rt(e, t),
  getCount: (e) => {
    const t = e;
    return !t || !t.counters ? 0 : t.counters.errors || 0;
  },
  supportsToolbar: !0
};
function Qt() {
  f.register(jt), f.register(At), f.register(Ot), f.register(Kt), f.register(Bt), f.register(Jt), f.register(Vt), f.register(Ut), f.register(It), f.register(Dt), f.register(Ft), f.register(Ht);
}
Qt();
export {
  O as A,
  Z as B,
  io as C,
  co as D,
  ro as E,
  I as F,
  $e as H,
  qe as I,
  k as L,
  eo as M,
  to as N,
  so as O,
  R as P,
  Ce as R,
  Re as S,
  oo as T,
  Zt as U,
  q as V,
  je as _,
  go as a,
  Ee as b,
  Je as c,
  N as d,
  M as f,
  uo as g,
  P as h,
  U as i,
  no as j,
  ao as k,
  Qe as l,
  Be as m,
  G as n,
  V as o,
  Ae as p,
  Rt as r,
  rt as s,
  bo as t,
  j as u,
  L as v,
  lo as w,
  po as x,
  Pe as y,
  Y as z
};

//# sourceMappingURL=builtin-panels-B_uXN2e5.js.map