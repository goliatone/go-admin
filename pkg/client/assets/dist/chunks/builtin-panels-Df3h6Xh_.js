import { escapeHTML as s } from "../shared/html.js";
import { normalizeDebugBasePath as te } from "../debug/shared/path-helpers.js";
import { r as m } from "./icons-SGrt9O6P.js";
import { A as oe, B as k, E as y, F as b, I as h, L as U, M as A, N as j, O as P, P as C, R as re, a as ne, k as se, w as f, y as S } from "./server-definitions-Cw_avwJX.js";
var ae = 1e3, ie = 12e3, le = 8, de = 1, ce = 3e4, pe = (e) => {
  const t = window.location.protocol === "https:" ? "wss:" : "ws:", o = te(e);
  return `${t}//${window.location.host}${o}/ws`;
}, ue = (e, t, o) => {
  const r = e.trim();
  if (!r || !t || !o) return e;
  const [n, a] = r.split("#"), l = `${n}${n.includes("?") ? "&" : "?"}${encodeURIComponent(t)}=${encodeURIComponent(o)}`;
  return a ? `${l}#${a}` : l;
}, ge = (e) => {
  if (!e) return null;
  const t = e.replace(/-/g, "+").replace(/_/g, "/"), o = t.padEnd(t.length + (4 - (t.length % 4 || 4)) % 4, "=");
  try {
    if (typeof globalThis.atob == "function") return globalThis.atob(o);
  } catch {
    return null;
  }
  return null;
}, be = (e) => {
  if (!e) return null;
  const t = e.split(".");
  if (t.length < 2) return null;
  const o = ge(t[1]);
  if (!o) return null;
  try {
    const r = JSON.parse(o);
    if (typeof r.exp == "number") return r.exp * 1e3;
  } catch {
    return null;
  }
  return null;
}, fe = (e, t) => {
  if (t) {
    if (typeof t.expiresInMs == "number" && t.expiresInMs > 0) return Date.now() + t.expiresInMs;
    const o = t.expiresAt ?? t.expires_at;
    if (typeof o == "number") return o;
    if (typeof o == "string") {
      const r = new Date(o);
      if (!Number.isNaN(r.getTime())) return r.getTime();
    }
  }
  return be(e);
}, xe = class {
  constructor(e) {
    this.ws = null, this.reconnectTimer = null, this.reconnectAttempts = 0, this.manualClose = !1, this.pendingCommands = [], this.status = "disconnected", this.hasConnected = !1, this.options = e;
  }
  getWebSocketURL() {
    return this.options.url ? this.options.url : pe(this.options.basePath || "");
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
    const e = this.hasConnected ? this.options.maxReconnectAttempts ?? le : this.options.maxInitialReconnectAttempts ?? de, t = this.options.reconnectDelayMs ?? ae, o = this.options.maxReconnectDelayMs ?? ie;
    if (this.reconnectAttempts >= e) {
      this.setStatus("disconnected");
      return;
    }
    const r = this.reconnectAttempts, n = Math.min(t * Math.pow(2, r), o), a = n * (0.2 + Math.random() * 0.3);
    this.reconnectAttempts += 1, this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null, this.connect();
    }, n + a);
  }
}, Ft = class extends xe {
  constructor(e) {
    const { url: t, authToken: o, tokenProvider: r, tokenRefreshBufferMs: n, tokenParam: a, appId: l, onEvent: d, ...c } = e, i = (p) => {
      if (l && p && !p.app_id) {
        d?.({
          ...p,
          app_id: l
        });
        return;
      }
      d?.(p);
    };
    super({
      ...c,
      url: t,
      onEvent: i
    }), this.authToken = null, this.tokenRefreshTimer = null, this.tokenExpiresAt = null, this.baseUrl = t, this.tokenProvider = r, this.tokenRefreshBufferMs = n ?? ce, this.tokenParam = a || "token", o && this.setToken(o);
  }
  getWebSocketURL() {
    return this.authToken ? ue(this.baseUrl, this.tokenParam, this.authToken) : this.baseUrl;
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
    this.authToken = e, this.tokenExpiresAt = fe(e, t), this.scheduleTokenRefresh();
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
async function W(e, t, o = {}) {
  const { feedbackDuration: r = 1500, useIconFeedback: n = !1, successClass: a = n ? "debug-copy--success" : "copied", errorClass: l = "debug-copy--error" } = o;
  try {
    await navigator.clipboard.writeText(e);
    const d = t.innerHTML;
    return t.classList.add(a), n ? t.innerHTML = '<i class="iconoir-check"></i> Copied' : t.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        Copied
      `, setTimeout(() => {
      t.innerHTML = d, t.classList.remove(a);
    }, r), !0;
  } catch {
    return t.classList.add(l), setTimeout(() => {
      t.classList.remove(l);
    }, r), !1;
  }
}
function Kt(e, t = {}) {
  e.querySelectorAll("[data-copy-trigger]").forEach((o) => {
    o.addEventListener("click", async (r) => {
      r.preventDefault(), r.stopPropagation();
      const n = o.closest("[data-copy-content]");
      n && await W(n.getAttribute("data-copy-content") || "", o, t);
    });
  });
}
function Jt(e) {
  e.querySelectorAll(".expandable-row").forEach((t) => {
    t.addEventListener("click", (o) => {
      o.target.closest("a, button, input") || o.currentTarget.classList.toggle("expanded");
    });
  });
}
function Vt(e, t) {
  e.querySelectorAll("[data-sort-toggle]").forEach((o) => {
    o.addEventListener("change", (r) => {
      const n = r.target, a = n.dataset.sortToggle;
      a && t(a, n.checked);
    });
  });
}
var Ut = {
  COPY_TRIGGER: "data-copy-trigger",
  COPY_CONTENT: "data-copy-content",
  ROW_ID: "data-row-id",
  EXPANSION_FOR: "data-expansion-for",
  SORT_TOGGLE: "data-sort-toggle"
}, Wt = {
  EXPANDABLE_ROW: "expandable-row",
  EXPANDED: "expanded",
  EXPANSION_ROW: "expansion-row",
  SLOW_QUERY: "slow-query",
  ERROR_QUERY: "error-query",
  EXPAND_ICON: "expand-icon"
};
function D(e, t) {
  return [...t].sort((o, r) => o - r).map((o) => e[o]).filter(Boolean).map((o) => {
    let r = `-- Duration: ${j(o.duration).text} | Rows: ${o.row_count ?? 0}`;
    return o.error && (r += ` | Error: ${o.error}`), o.timestamp && (r += ` | Time: ${o.timestamp}`), `${r}
${o.query || ""};`;
  }).join(`

`);
}
function me(e, t, o = "text/sql") {
  const r = new Blob([e], { type: o }), n = URL.createObjectURL(r), a = document.createElement("a");
  a.href = n, a.download = t, a.click(), URL.revokeObjectURL(n);
}
function Qt(e, t, o = {}) {
  const r = /* @__PURE__ */ new Set(), n = e.querySelector("[data-sql-toolbar]"), a = e.querySelector("[data-sql-selected-count]"), l = e.querySelector(".sql-select-all"), d = e.querySelectorAll(".sql-select-row");
  if (!n || d.length === 0) return;
  function c() {
    if (!n) return;
    const i = r.size;
    n.dataset.visible = i > 0 ? "true" : "false", a && (a.textContent = `${i} selected`), l && (l.checked = i > 0 && i === d.length, l.indeterminate = i > 0 && i < d.length);
  }
  d.forEach((i) => {
    i.addEventListener("click", (p) => {
      p.stopPropagation();
    }), i.addEventListener("change", () => {
      const p = parseInt(i.dataset.sqlIndex || "", 10);
      Number.isNaN(p) || (i.checked ? r.add(p) : r.delete(p), c());
    });
  }), l && (l.addEventListener("click", (i) => {
    i.stopPropagation();
  }), l.addEventListener("change", () => {
    d.forEach((i) => {
      i.checked = l.checked;
      const p = parseInt(i.dataset.sqlIndex || "", 10);
      Number.isNaN(p) || (l.checked ? r.add(p) : r.delete(p));
    }), c();
  })), e.querySelector('[data-sql-export="clipboard"]')?.addEventListener("click", async (i) => {
    if (i.preventDefault(), r.size === 0) return;
    const p = D(t, r), u = i.currentTarget;
    await W(p, u, o);
  }), e.querySelector('[data-sql-export="download"]')?.addEventListener("click", (i) => {
    i.preventDefault(), r.size !== 0 && me(D(t, r), `sql-queries-${(/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-").slice(0, 19)}.sql`);
  }), e.querySelector("[data-sql-clear-selection]")?.addEventListener("click", (i) => {
    i.preventDefault(), r.clear(), d.forEach((p) => {
      p.checked = !1;
    }), c();
  });
}
function Gt(e, t) {
  e.querySelectorAll("[data-request-table]").forEach((o) => {
    o.addEventListener("click", (r) => {
      const n = r.target;
      if (n.closest("button, a, input, [data-detail-for]")) return;
      const a = n.closest("[data-request-id]");
      if (!a) return;
      const l = a.dataset.requestId;
      if (!l) return;
      const d = a.nextElementSibling;
      if (!d || !d.hasAttribute("data-detail-for") || d.dataset.detailFor !== l) return;
      const c = d.querySelector("[data-request-detail-template]");
      if (c) {
        const p = d.querySelector("td");
        p && (p.appendChild(c.content.cloneNode(!0)), c.remove());
      }
      const i = a.querySelector("[data-expand-icon]");
      t.has(l) ? (t.delete(l), d.style.display = "none", i && (i.textContent = "▶")) : (t.add(l), d.style.display = "table-row", i && (i.textContent = "▼"));
    });
  });
}
var he = {
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
}, ye = {
  table: "",
  tableRoutes: "",
  badge: "badge",
  badgeMethod: (e) => `badge badge-method ${e.toLowerCase()}`,
  badgeStatus: (e) => {
    const t = re(e);
    return t ? `badge badge-status ${t}` : "badge badge-status";
  },
  badgeLevel: (e) => `badge badge-level ${U(e)}`,
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
function Xt(e) {
  return e === "console" ? he : ye;
}
function ve(e) {
  const t = String(e ?? "GET").trim().toUpperCase();
  return {
    display: t || "GET",
    classToken: t.replace(/[^A-Z]/g, "") || "GET"
  };
}
function $e(e, t) {
  return e.id ? e.id : `${e.timestamp || ""}-${t}`;
}
function we(e, t, o) {
  return `
    <div class="${o.panelControls}">
      <label class="${o.sortToggle}">
        <input type="checkbox" data-sort-toggle="${e}" ${t ? "checked" : ""}>
        <span>Newest first</span>
      </label>
    </div>
  `;
}
function ke(e, t, o = {}) {
  const { maskPlaceholder: r = "***", maxDetailLength: n } = o, a = [], l = [];
  if (e.id && l.push(`<span>ID: <code>${s(e.id)}</code></span>`), e.remote_ip && l.push(`<span>IP: <code>${s(e.remote_ip)}</code></span>`), e.content_type && l.push(`<span>Content-Type: <code>${s(e.content_type)}</code></span>`), l.length > 0 && a.push(`<div class="${t.detailMetadataLine}">${l.join("")}</div>`), e.headers && Object.keys(e.headers).length > 0) {
    const d = Object.entries(e.headers).map(([c, i]) => {
      const p = n && i.length > n ? k(i, n) : i, u = i === r ? ` <span class="${t.detailMasked}">(masked)</span>` : "";
      return `<dt>${s(c)}</dt><dd>${s(p)}${u}</dd>`;
    }).join("");
    a.push(`
      <div class="${t.detailSection}">
        <span class="${t.detailLabel}">Request Headers</span>
        <dl class="${t.detailKeyValueTable}">${d}</dl>
      </div>
    `);
  }
  if (e.query && Object.keys(e.query).length > 0) {
    const d = Object.entries(e.query).map(([c, i]) => {
      const p = i === r ? ` <span class="${t.detailMasked}">(masked)</span>` : "";
      return `<dt>${s(c)}</dt><dd>${s(i)}${p}</dd>`;
    }).join("");
    a.push(`
      <div class="${t.detailSection}">
        <span class="${t.detailLabel}">Query Parameters</span>
        <dl class="${t.detailKeyValueTable}">${d}</dl>
      </div>
    `);
  }
  if (e.request_body) {
    const d = e.request_size ? ` (${A(e.request_size)})` : "", c = e.body_truncated ? ' <span class="' + t.detailMasked + '">(truncated)</span>' : "";
    let i;
    try {
      i = P(JSON.parse(e.request_body), !0);
    } catch {
      i = s(e.request_body);
    }
    a.push(`
      <div class="${t.detailSection}">
        <span class="${t.detailLabel}">Request Body${d}${c}</span>
        <div class="${t.detailBody}">
          <pre>${i}</pre>
        </div>
        <button class="${t.copyBtnSm}" data-copy-trigger="${s(e.request_body)}">Copy</button>
      </div>
    `);
  }
  if (e.response_headers && Object.keys(e.response_headers).length > 0) {
    const d = Object.entries(e.response_headers).map(([c, i]) => {
      const p = n && i.length > n ? k(i, n) : i;
      return `<dt>${s(c)}</dt><dd>${s(p)}</dd>`;
    }).join("");
    a.push(`
      <div class="${t.detailSection}">
        <span class="${t.detailLabel}">Response Headers</span>
        <dl class="${t.detailKeyValueTable}">${d}</dl>
      </div>
    `);
  }
  if (e.response_body) {
    const d = e.response_size ? ` (${A(e.response_size)})` : "";
    let c;
    try {
      c = P(JSON.parse(e.response_body), !0);
    } catch {
      c = s(e.response_body);
    }
    a.push(`
      <div class="${t.detailSection}">
        <span class="${t.detailLabel}">Response Body${d}</span>
        <div class="${t.detailBody}">
          <pre>${c}</pre>
        </div>
        <button class="${t.copyBtnSm}" data-copy-trigger="${s(e.response_body)}">Copy</button>
      </div>
    `);
  }
  return e.error && a.push(`
      <div class="${t.detailSection}">
        <div class="${t.detailError}">${s(e.error)}</div>
      </div>
    `), a.length === 0 ? `<div class="${t.detailPane}"><span class="${t.muted}">No additional details available</span></div>` : `<div class="${t.detailPane}">${a.join("")}</div>`;
}
function Ce(e, t, o, r) {
  const { display: n, classToken: a } = ve(e.method), l = e.path || "", d = e.status || 0, c = j(e.duration, r.slowThresholdMs), i = $e(e, t), p = r.expandedRequestIds?.has(i) || !1, u = o.badgeMethod(a), g = o.badgeStatus(d), x = c.isSlow ? o.durationSlow : "", $ = d >= 400 ? o.rowError : "", w = r.truncatePath ? k(l, r.maxPathLength || 50) : l;
  let O = "";
  const _ = n;
  if (_ === "POST" || _ === "PUT" || _ === "PATCH") {
    const I = (e.content_type || e.headers?.["Content-Type"] || e.headers?.["content-type"] || "").split(";")[0].trim();
    I && (O = ` <span class="${o.badgeContentType}">${s(I)}</span>`);
  }
  const Y = `<span class="${o.expandIcon}" data-expand-icon>${p ? "▼" : "▶"}</span>`, Z = p ? "table-row" : "none", B = ke(e, o, {
    maskPlaceholder: r.maskPlaceholder,
    maxDetailLength: r.maxDetailLength
  }), ee = p ? B : `<template data-request-detail-template>${B}</template>`;
  return `
    <tr class="${$}" data-request-id="${s(i)}" style="cursor:pointer">
      <td>${Y}<span class="${u}">${s(n)}</span>${O}</td>
      <td class="${o.path}" title="${s(l)}">${s(w)}</td>
      <td><span class="${g}">${s(d || "-")}</span></td>
      <td class="${o.duration} ${x}">${c.text}</td>
      <td class="${o.timestamp}">${s(h(e.timestamp))}</td>
    </tr>
    <tr class="${o.detailRow}" data-detail-for="${s(i)}" style="display:${Z}">
      <td colspan="5">${ee}</td>
    </tr>
  `;
}
function z(e, t, o = {}) {
  const { newestFirst: r = !0, slowThresholdMs: n = 50, maxEntries: a, showSortToggle: l = !1, truncatePath: d = !0, maxPathLength: c = 50 } = o, i = l ? we("requests", r, t) : "";
  if (!e.length) return i + `<div class="${t.emptyState}">No requests captured</div>`;
  const p = a ? Math.max(0, e.length - a) : 0;
  let u = (a ? e.slice(-a) : e).map((x, $) => ({
    entry: x,
    originalIndex: p + $
  }));
  r && (u = [...u].reverse());
  const g = u.map(({ entry: x, originalIndex: $ }) => Ce(x, $, t, {
    ...o,
    slowThresholdMs: n,
    truncatePath: d,
    maxPathLength: c
  })).join("");
  return `
    ${i}
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
      <tbody>${g}</tbody>
    </table>
  `;
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
function ze(e, t, o, r) {
  const n = j(e.duration, r.slowThresholdMs), a = n.isSlow, l = !!e.error, d = `sql-row-${t}`, c = e.query || "", i = se(c, !0), p = [o.expandableRow];
  a && p.push(o.slowQuery), l && p.push(o.errorQuery);
  const u = a ? o.durationSlow : "", g = _e(o, r.useIconCopyButton || !1, d);
  return `
    <tr class="${p.join(" ")}" data-row-id="${d}">
      <td class="${o.selectCell}"><input type="checkbox" class="sql-select-row" data-sql-index="${t}"></td>
      <td class="${o.duration} ${u}">${n.text}</td>
      <td>${s(b(e.row_count ?? "-"))}</td>
      <td class="${o.timestamp}">${s(h(e.timestamp))}</td>
      <td>${l ? `<span class="${o.badgeError}">Error</span>` : ""}</td>
      <td class="${o.queryText}"><span class="${o.expandIcon}">&#9654;</span>${s(c)}</td>
    </tr>
    <tr class="${o.expansionRow}" data-expansion-for="${d}">
      <td colspan="6">
        <div class="${o.expandedContent}" data-copy-content="${s(c)}">
          <div class="${o.expandedContentHeader}">
            ${g}
          </div>
          <pre>${i}</pre>
        </div>
      </td>
    </tr>
  `;
}
function E(e, t, o = {}) {
  const { newestFirst: r = !0, slowThresholdMs: n = 50, maxEntries: a = 50, showSortToggle: l = !1, useIconCopyButton: d = !1 } = o, c = l ? Se("sql", r, t) : "", i = Te(t);
  if (!e.length) return c + `<div class="${t.emptyState}">No SQL queries captured</div>`;
  let p = a ? e.slice(-a) : e;
  r && (p = [...p].reverse());
  const u = p.map((g, x) => ze(g, x, t, {
    ...o,
    slowThresholdMs: n,
    useIconCopyButton: d
  })).join("");
  return `
    ${c}
    ${i}
    <table class="${t.table}">
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
function Ee(e, t, o) {
  return `
    <div class="${o.panelControls}">
      <label class="${o.sortToggle}">
        <input type="checkbox" data-sort-toggle="${e}" ${t ? "checked" : ""}>
        <span>Newest first</span>
      </label>
    </div>
  `;
}
function Re(e, t, o) {
  const r = e.level || "INFO", n = String(r).toUpperCase(), a = U(String(r)), l = e.message || "", d = e.source || "", c = t.badgeLevel(a), i = a === "error" ? t.rowError : "", p = o.truncateMessage ? k(l, o.maxMessageLength || 100) : l, u = o.showSource ? `<td class="${t.timestamp}">${s(d)}</td>` : "";
  return `
    <tr class="${i}">
      <td><span class="${c}">${s(n)}</span></td>
      <td class="${t.timestamp}">${s(h(e.timestamp))}</td>
      <td class="${t.message}" title="${s(l)}">${s(p)}</td>
      ${u}
    </tr>
  `;
}
function R(e, t, o = {}) {
  const { newestFirst: r = !0, maxEntries: n = 100, showSortToggle: a = !1, showSource: l = !1, truncateMessage: d = !0, maxMessageLength: c = 100 } = o, i = a ? Ee("logs", r, t) : "";
  if (!e.length) return i + `<div class="${t.emptyState}">No logs captured</div>`;
  let p = n ? e.slice(-n) : e;
  r && (p = [...p].reverse());
  const u = p.map((x) => Re(x, t, {
    ...o,
    showSource: l,
    truncateMessage: d,
    maxMessageLength: c
  })).join(""), g = l ? "<th>Source</th>" : "";
  return `
    ${i}
    <table class="${t.table}">
      <thead>
        <tr>
          <th>Level</th>
          <th>Time</th>
          <th>Message</th>
          ${g}
        </tr>
      </thead>
      <tbody>${u}</tbody>
    </table>
  `;
}
function qe(e, t, o) {
  const r = e.method || "GET", n = e.path || "", a = e.handler || "-", l = e.name || "", d = t.badgeMethod(r), c = o.showName ? `<td class="${t.timestamp}">${s(l)}</td>` : "";
  return `
    <tr>
      <td><span class="${d}">${s(r)}</span></td>
      <td class="${t.path}">${s(n)}</td>
      <td>${s(a)}</td>
      ${c}
    </tr>
  `;
}
function q(e, t, o = {}) {
  const { showName: r = !1 } = o;
  if (!e.length) return `<div class="${t.emptyState}">No routes available</div>`;
  const n = e.map((l) => qe(l, t, { showName: r })).join(""), a = r ? "<th>Name</th>" : "";
  return `
    <table class="${t.tableRoutes || t.table}">
      <thead>
        <tr>
          <th>Method</th>
          <th>Path</th>
          <th>Handler</th>
          ${a}
        </tr>
      </thead>
      <tbody>${n}</tbody>
    </table>
  `;
}
function Le(e, t) {
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
function Ne(e, t) {
  return `
    <tr>
      <td><span class="${t.badgeCustom}">${s(e.category || "custom")}</span></td>
      <td class="${t.timestamp}">${s(h(e.timestamp))}</td>
      <td class="${t.message}">${s(e.message || "")}</td>
    </tr>
  `;
}
function Pe(e, t, o) {
  const { useIconCopyButton: r = !1, showCount: n = !0 } = o, a = C(e), l = P(e, !0), d = Le(t, r), c = n ? `<span class="${t.muted}">${b(oe(e))} keys</span>` : "";
  return `
    <div class="${t.jsonPanel}" data-copy-content="${s(a)}">
      <div class="${t.jsonHeader}">
        <span class="${t.jsonViewerTitle}">Custom Data</span>
        <div class="${t.jsonActions}">
          ${c}
          ${d}
        </div>
      </div>
      <div class="${t.jsonContent}">
        <pre>${l}</pre>
      </div>
    </div>
  `;
}
function je(e, t, o) {
  const { maxLogEntries: r = 50 } = o;
  if (!e.length) return `<div class="${t.emptyState}">No custom logs yet.</div>`;
  const n = e.slice(-r).reverse().map((a) => Ne(a, t)).join("");
  return `
    <table class="${t.table}">
      <thead>
        <tr>
          <th>Category</th>
          <th>Time</th>
          <th>Message</th>
        </tr>
      </thead>
      <tbody>${n}</tbody>
    </table>
  `;
}
function L(e, t, o = {}) {
  const { dataFilterFn: r } = o, n = e.data || {}, a = r ? r(n) : n, l = e.logs || [], d = Object.keys(a).length > 0, c = l.length > 0;
  if (!d && !c) return `<div class="${t.emptyState}">No custom data captured</div>`;
  let i = "";
  return d && (i += Pe(a, t, o)), c && (i += `
      <div class="${t.jsonPanel}">
        <div class="${t.jsonHeader}">
          <span class="${t.jsonViewerTitle}">Custom Logs</span>
          <span class="${t.muted}">${b(l.length)} entries</span>
        </div>
        <div class="${t.jsonContent}">
          ${je(l, t, o)}
        </div>
      </div>
    `), d && c ? `<div class="${t.jsonGrid}">${i}</div>` : i;
}
function Me(e) {
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
function Oe(e) {
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
function Be(e, t, o) {
  const r = Oe(e.type), n = Me(e.type), a = t.badgeLevel(n), l = e.message || "", d = e.source || "", c = !!e.stack, i = e.type === "network_error" && e.extra?.request_url ? String(e.extra.request_url) : d && e.line ? `${d}:${e.line}${e.column ? ":" + e.column : ""}` : d || "", p = c ? `<span class="${t.expandIcon}">&#9654;</span>` : "", u = c ? t.expandableRow : "", g = o.compact ? s(l.length > 100 ? l.slice(0, 100) + "..." : l) : s(l), x = !o.compact && i ? `<td class="${t.timestamp}" title="${s(i)}">${s(i.length > 60 ? "..." + i.slice(-57) : i)}</td>` : "", $ = !o.compact && e.url ? `<td class="${t.timestamp}" title="${s(e.url)}">${s(e.url.length > 40 ? "..." + e.url.slice(-37) : e.url)}</td>` : "";
  let w = "";
  return c && (w = `
      <tr class="${t.expansionRow}">
        <td colspan="${o.compact ? 3 : 5}">
          <div class="${t.expandedContent}">
            <pre style="margin:0;white-space:pre-wrap;word-break:break-all;font-size:0.8em;opacity:0.85">${s(e.stack)}</pre>
          </div>
        </td>
      </tr>
    `), `
    <tr class="${t.rowError} ${u}">
      <td>${p}<span class="${a}">${s(r)}</span></td>
      <td class="${t.timestamp}">${s(h(e.timestamp))}</td>
      <td class="${t.message}" title="${s(l)}">${g}</td>
      ${x}
      ${$}
    </tr>
    ${w}
  `;
}
function Ie(e, t) {
  return `
    <div class="${t.panelControls}">
      <label class="${t.sortToggle}">
        <input type="checkbox" data-sort-toggle="jserrors" ${e ? "checked" : ""}>
        <span>Newest first</span>
      </label>
    </div>
  `;
}
function N(e, t, o = {}) {
  const { newestFirst: r = !0, maxEntries: n = 100, compact: a = !1, showSortToggle: l = !1 } = o, d = l ? Ie(r, t) : "";
  if (!e.length) return d + `<div class="${t.emptyState}">No JS errors captured</div>`;
  let c = n ? e.slice(-n) : e;
  r && (c = [...c].reverse());
  const i = c.map((g) => Be(g, t, {
    ...o,
    compact: a
  })).join(""), p = a ? "" : "<th>Location</th>", u = a ? "" : "<th>Page</th>";
  return `
    ${d}
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
      <tbody>${i}</tbody>
    </table>
  `;
}
function M(e) {
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
function Ae(e) {
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
function De(e) {
  const t = M(e.verdict), o = e.user_info || {};
  let r = "";
  return (o.username || o.user_id) && (r = `
      <div style="display: flex; gap: 12px; font-size: 12px; color: #94a3b8; margin-top: 8px;">
        ${o.username ? `<span>User: <strong style="color: #e2e8f0;">${s(o.username)}</strong></span>` : ""}
        ${o.role ? `<span>Role: <strong style="color: #e2e8f0;">${s(o.role)}</strong></span>` : ""}
        ${o.tenant_id ? `<span>Tenant: <strong style="color: #e2e8f0;">${s(o.tenant_id)}</strong></span>` : ""}
        ${o.org_id ? `<span>Org: <strong style="color: #e2e8f0;">${s(o.org_id)}</strong></span>` : ""}
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
        ">${m(t.icon, { size: "24px" })}</span>
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
function He(e) {
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
function Fe(e, t) {
  const o = Ae(e.status), r = (n) => n ? `<span style="color: #22c55e;">${m("success", { size: "14px" })}</span>` : `<span style="color: #ef4444;">${m("error", { size: "14px" })}</span>`;
  return `
    <tr style="border-bottom: 1px solid #334155;">
      <td style="padding: 10px 12px; font-family: monospace; font-size: 12px; color: #e2e8f0;">
        ${s(e.permission)}
        ${e.module ? `<span style="color: #64748b; font-size: 10px; margin-left: 8px;">(${s(e.module)})</span>` : ""}
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
        ">${s(e.diagnosis)}</span>
      </td>
    </tr>
  `;
}
function Ke(e) {
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
            ${t.map((o, r) => Fe(o, r)).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}
function Je(e) {
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
        <span style="color: ${M(e.verdict).color};">Next Actions</span>
      </h3>
      <ul style="
        margin: 0;
        padding: 0 0 0 20px;
        color: #cbd5e1;
        font-size: 13px;
        line-height: 1.6;
      ">
        ${t.map((o) => o.startsWith("  -") ? `<li style="margin-left: 20px; color: #94a3b8;">${s(o.trim().slice(2))}</li>` : `<li>${s(o)}</li>`).join("")}
      </ul>
    </div>
  `;
}
function Ve(e) {
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
        ">${s(C(e))}</pre>
      </div>
    </details>
  `;
}
function H(e, t, o = {}) {
  const { showRawJSON: r = !0, showCollapsible: n = !0 } = o;
  return e ? `
    <div style="padding: 8px;">
      ${De(e)}
      ${He(e)}
      ${Ke(e)}
      ${Je(e)}
      ${r ? Ve(e) : ""}
    </div>
  ` : `<div class="${t.emptyState}">No permissions data available</div>`;
}
function Ue(e, t) {
  if (!e) return `<div class="${t.emptyState}">No permissions data</div>`;
  const o = M(e.verdict), r = e.summary || {
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
        ">${m(o.icon, { size: "18px" })}</span>
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
function T(e) {
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
function Q(e) {
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
function We(e) {
  const t = T(e.verdict), o = Q(e.verdict);
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
      ">${m(t.icon, { size: "24px" })}</span>
      <div>
        <div style="
          font-size: 16px;
          font-weight: 600;
          color: ${t.color};
        ">${s(o)}</div>
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
function Qe(e) {
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
function Ge(e) {
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
      ${We(e)}
      <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 8px;">
        ${Qe(e.summary)}
        ${t ? `<span style="font-size: 11px; color: #64748b;">Generated: ${s(t)}</span>` : ""}
      </div>
    </div>
  `;
}
function Xe(e) {
  const t = T(e.severity), o = String(e.message || "").trim(), r = String(e.hint || "").trim(), n = String(e.code || "").trim(), a = String(e.component || "").trim();
  if (!o) return "";
  const l = [n, a].filter(Boolean).join(" • ");
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
      ">${m(t.icon, { size: "14px" })}</span>
      <div style="flex: 1; min-width: 0;">
        <div style="
          font-size: 13px;
          color: #e2e8f0;
          line-height: 1.4;
          word-break: break-word;
        ">${s(o)}</div>
        ${r ? `
          <div style="
            margin-top: 6px;
            font-size: 12px;
            color: #94a3b8;
            display: flex;
            align-items: flex-start;
            gap: 6px;
          ">
            <span style="color: #64748b;">${m("hint", { size: "13px" })}</span>
            <span>${s(r)}</span>
          </div>
        ` : ""}
        ${l ? `
          <div style="
            margin-top: 4px;
            font-size: 11px;
            color: #64748b;
            font-family: monospace;
          ">${s(l)}</div>
        ` : ""}
      </div>
    </div>
  `;
}
function Ye(e) {
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
      ${e.map((t) => Xe(t)).join("")}
    </div>
  `;
}
function Ze(e, t) {
  if (!t) return "";
  const o = String(t.description || "").trim(), r = String(t.cta || t.label || "").trim(), n = !!t.runnable, a = !!t.applicable, l = !!t.requires_confirmation, d = String(t.confirm_text || "").trim(), c = t.kind || "manual";
  let i = "enabled", p = "";
  a ? n || (i = "manual", p = c === "manual" ? "Manual action required" : "Action not available") : (i = "not-applicable", p = "Not applicable for current status");
  const u = i !== "enabled", g = u ? "background: #374151; color: #6b7280; cursor: not-allowed;" : "background: #3b82f6; color: #fff; cursor: pointer;";
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
        ">${s(o)}</div>
      ` : ""}
      <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
        ${r ? `
          <button
            type="button"
            class="debug-btn"
            data-doctor-action-run="${s(e)}"
            ${d ? `data-doctor-action-confirm="${s(d)}"` : ""}
            ${l ? 'data-doctor-action-requires-confirmation="true"' : ""}
            ${u ? "disabled" : ""}
            style="
              padding: 8px 16px;
              border: none;
              border-radius: 6px;
              font-size: 13px;
              font-weight: 500;
              ${g}
            "
          >${s(r)}</button>
        ` : ""}
        ${p ? `
          <span style="
            font-size: 12px;
            color: #64748b;
            font-style: italic;
          ">${s(p)}</span>
        ` : ""}
      </div>
    </div>
  `;
}
function et(e) {
  return e == null ? '<span style="color: #64748b; font-style: italic;">null</span>' : typeof e == "boolean" ? `<span style="color: ${e ? "#22c55e" : "#ef4444"}; font-weight: 500;">${e}</span>` : typeof e == "number" ? `<span style="color: #818cf8;">${e}</span>` : typeof e == "string" ? `<span style="color: #fbbf24;">"${s(e)}"</span>` : typeof e == "object" ? `<span style="color: #94a3b8;">${s(JSON.stringify(e))}</span>` : s(String(e));
}
function tt(e) {
  if (!e || Object.keys(e).length === 0) return "";
  const t = Object.entries(e).map(([o, r]) => `
      <tr>
        <td style="
          padding: 4px 8px 4px 0;
          color: #94a3b8;
          font-size: 12px;
          vertical-align: top;
          white-space: nowrap;
        ">${s(o)}:</td>
        <td style="
          padding: 4px 0;
          font-family: monospace;
          font-size: 11px;
          word-break: break-all;
        ">${et(r)}</td>
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
function ot(e) {
  const t = T(e.status), o = String(e.label || e.id || "").trim(), r = String(e.summary || "").trim(), n = String(e.help || e.description || "").trim(), a = e.duration_ms !== void 0 ? `${e.duration_ms}ms` : "";
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
          ">${m(t.icon, { size: "12px" })}</span>
          <div>
            <div style="
              font-size: 14px;
              font-weight: 600;
              color: #e2e8f0;
            ">${s(o)}</div>
            <div style="
              font-size: 11px;
              color: #64748b;
              font-family: monospace;
            ">${s(e.id || "")}</div>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 12px;">
          ${a ? `
            <span style="
              font-size: 11px;
              color: #64748b;
              font-family: monospace;
            ">${s(a)}</span>
          ` : ""}
          <span style="
            padding: 4px 10px;
            border-radius: 999px;
            font-size: 11px;
            font-weight: 600;
            color: ${t.color};
            background: ${t.bgColor};
            border: 1px solid ${t.borderColor};
          ">${s(t.label)}</span>
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
          ">${s(r)}</div>
        ` : ""}

        <!-- Help Section -->
        ${n ? `
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
            ">${s(n)}</div>
          </details>
        ` : ""}

        <!-- Findings -->
        ${Ye(e.findings)}

        <!-- Action -->
        ${Ze(e.id, e.action)}

        <!-- Metadata -->
        ${tt(e.metadata)}
      </div>
    </div>
  `;
}
function rt(e) {
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
        <span style="color: #f59e0b;">${m("nextAction", { size: "14px" })}</span>
        Recommended Next Actions
      </div>
      <ol style="
        margin: 0;
        padding: 0 0 0 20px;
        color: #cbd5e1;
        font-size: 13px;
        line-height: 1.6;
      ">
        ${e.map((t) => `<li style="margin-bottom: 4px;">${s(t)}</li>`).join("")}
      </ol>
    </div>
  `;
}
function nt(e) {
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
        ">${s(C(e))}</pre>
      </div>
    </details>
  `;
}
function F(e, t, o = {}) {
  const { showRawJSON: r = !0, problemsOnly: n = !1 } = o;
  if (!e) return `<div class="${t.emptyState}">No doctor diagnostics available</div>`;
  let a = e.checks || [];
  n && (a = a.filter((i) => i.status === "warn" || i.status === "error"));
  const l = {
    error: 0,
    warn: 1,
    info: 2,
    ok: 3
  };
  a = [...a].sort((i, p) => {
    const u = l[i.status || "ok"] ?? 4, g = l[p.status || "ok"] ?? 4;
    return u !== g ? u - g : (i.label || i.id || "").localeCompare(p.label || p.id || "");
  });
  const d = a.some((i) => i.status === "warn" || i.status === "error");
  let c = "";
  return a.length === 0 ? n && !d ? c = `
        <div style="
          text-align: center;
          padding: 40px 20px;
          color: #22c55e;
        ">
          <div style="font-size: 48px; margin-bottom: 12px;">${m("success", { size: "48px" })}</div>
          <div style="font-size: 18px; font-weight: 600; margin-bottom: 8px;">All Systems Healthy</div>
          <div style="font-size: 14px; color: #94a3b8;">${e.summary?.checks || 0} checks passed</div>
        </div>
      ` : c = `<div class="${t.emptyState}">No doctor checks available</div>` : c = a.map((i) => ot(i)).join(""), `
    <div style="padding: 12px;">
      ${Ge(e)}
      ${c}
      ${rt(e.next_actions)}
      ${r ? nt(e) : ""}
    </div>
  `;
}
function Yt(e, t) {
  if (!e) return `<div class="${t.emptyState}">No doctor diagnostics</div>`;
  const o = T(e.verdict), r = Q(e.verdict), n = e.summary || {
    checks: 0,
    ok: 0,
    info: 0,
    warn: 0,
    error: 0
  }, a = (n.warn || 0) + (n.error || 0);
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
        ">${m(o.icon, { size: "20px" })}</span>
        <span style="
          font-size: 14px;
          font-weight: 600;
          color: ${o.color};
        ">${s(r)}</span>
      </div>
      <div style="
        display: flex;
        gap: 16px;
        font-size: 12px;
        color: #94a3b8;
      ">
        <span>Checks: <strong style="color: #e2e8f0;">${n.checks || 0}</strong></span>
        <span>OK: <strong style="color: #22c55e;">${n.ok || 0}</strong></span>
        ${a > 0 ? `
          <span>Problems: <strong style="color: #ef4444;">${a}</strong></span>
        ` : ""}
      </div>
    </div>
  `;
}
function v(e, t = {}) {
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
function G(e) {
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
function X(e) {
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
function st(e) {
  let t = e.status;
  e.configured && e.active || (t = "inactive");
  const o = G(t);
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
      ${v(o.icon, {
    size: 13,
    color: o.color
  })}
      <span style="
        font-size: 12px;
        font-weight: 600;
        color: ${o.color};
      ">${s(r)}</span>
    </div>
  `;
}
function at(e) {
  const t = e.backend || "none", o = e.scope || "unknown", r = o === "process_local", n = r ? "rgba(245, 158, 11, 0.15)" : "rgba(100, 116, 139, 0.15)", a = r ? "rgba(245, 158, 11, 0.3)" : "rgba(100, 116, 139, 0.3)", l = r ? "#f59e0b" : "#94a3b8";
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
      ">${s(t)}</span>
      <span style="
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 5px 8px;
        background: ${n};
        border: 1px solid ${a};
        border-radius: 4px;
        color: ${l};
        font-weight: 500;
      ">${r ? v("warning", {
    size: 13,
    color: l
  }) : ""}<span>${s(o)}</span></span>
      ${e.observed_by ? `
        <span style="color: #64748b; font-size: 11px;">
          obs: ${s(e.observed_by)}
        </span>
      ` : ""}
    </div>
  `;
}
function it() {
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
      ${v("clear", {
    size: 13,
    color: "#fff"
  })}
      <span>Clear Cache</span>
    </button>
  `;
}
function K(e) {
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
      ${st(e)}
      <span style="color: #334155; font-size: 10px;">│</span>
      ${at(e)}
      ${e.active ? `
        <div style="margin-left: auto;">
          ${it()}
        </div>
      ` : ""}
    </div>
  `;
}
function lt(e) {
  const t = e || {}, o = t.lookups || 0, r = t.hits || 0, n = t.misses || 0, a = t.writes || 0, l = t.errors || 0, d = t.clears || 0;
  let c = "N/A";
  return o > 0 && (c = `${((t.hit_ratio !== null && t.hit_ratio !== void 0 ? t.hit_ratio : r / o) * 100).toFixed(1)}%`), `
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
      value: b(n),
      color: "#f59e0b"
    },
    {
      label: "Writes",
      value: b(a),
      color: "#3b82f6"
    },
    {
      label: "Errors",
      value: b(l),
      color: l > 0 ? "#ef4444" : "#64748b"
    },
    {
      label: "Clears",
      value: b(d),
      color: "#8b5cf6"
    },
    {
      label: "Hit Rate",
      value: c,
      color: o > 0 ? "#22c55e" : "#64748b"
    }
  ].map((i) => `
        <div style="
          background: ${i.color}15;
          border: 1px solid ${i.color}30;
          border-radius: 5px;
          padding: 8px 10px;
          text-align: center;
        ">
          <div style="
            font-size: 16px;
            font-weight: 600;
            color: ${i.color};
            line-height: 1.2;
          ">${i.value}</div>
          <div style="
            font-size: 10px;
            color: #94a3b8;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            margin-top: 2px;
          ">${i.label}</div>
        </div>
      `).join("")}
    </div>
  `;
}
function dt(e) {
  if (!e) return "";
  const t = X(e.outcome), o = e.timestamp ? h(e.timestamp) : "";
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
        ">${s(t.label)}</span>
      </div>
      <div style="
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
        font-size: 12px;
        color: #cbd5e1;
      ">
        <span><strong>Command:</strong> ${s(e.command || "unknown")}</span>
        <span><strong>Mode:</strong> ${s(e.mode || "none")}</span>
        ${e.target_count !== void 0 ? `<span><strong>Targets:</strong> ${e.target_count}</span>` : ""}
        ${o ? `<span style="color: #64748b;">${s(o)}</span>` : ""}
      </div>
      ${e.message ? `
        <div style="
          margin-top: 6px;
          font-size: 11px;
          color: #94a3b8;
          font-style: italic;
        ">${s(e.message)}</div>
      ` : ""}
    </div>
  `;
}
function ct(e) {
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
      ">${s(e.message || "Unknown error")}</div>
      <div style="
        margin-top: 6px;
        display: flex;
        gap: 12px;
        font-size: 11px;
        color: #94a3b8;
      ">
        ${e.backend ? `<span><strong>Backend:</strong> ${s(e.backend)}</span>` : ""}
        ${e.error_kind ? `<span><strong>Kind:</strong> ${s(e.error_kind)}</span>` : ""}
        ${e.fail_closed !== void 0 ? `<span><strong>Fail Closed:</strong> ${e.fail_closed ? "Yes" : "No"}</span>` : ""}
      </div>
    </div>
  ` : "";
}
function pt(e) {
  return `
    <tr style="border-bottom: 1px solid #1e293b;">
      <td style="padding: 5px 8px; color: #64748b; font-size: 10px; white-space: nowrap;">${s(e.timestamp ? h(e.timestamp) : "")}</td>
      <td style="padding: 5px 8px;">
        <span style="
          padding: 2px 5px;
          background: rgba(239, 68, 68, 0.15);
          border-radius: 3px;
          font-size: 10px;
          color: #f87171;
        ">${s(e.operation || "unknown")}</span>
      </td>
      <td style="padding: 5px 8px; font-size: 11px; color: #cbd5e1;">${s(e.message || "")}</td>
      <td style="padding: 5px 8px; font-size: 10px; color: #64748b; font-family: monospace;">
        ${e.key?.route_hint ? s(e.key.route_hint) : e.key?.key_hash ? s(e.key.key_hash.slice(0, 12)) : ""}
      </td>
    </tr>
  `;
}
function ut(e, t = 10) {
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
        ${v("warning", {
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
            ${r.map((n) => pt(n)).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}
function J(e) {
  return e == null ? '<span style="color: #64748b; font-style: italic;">null</span>' : typeof e == "boolean" ? `<span style="color: ${e ? "#22c55e" : "#64748b"}; font-weight: 500;">${e}</span>` : typeof e == "number" ? `<span style="color: #818cf8;">${e}</span>` : typeof e == "string" ? e === "" ? '<span style="color: #64748b; font-style: italic;">empty</span>' : `<span style="color: #fbbf24;">${s(e)}</span>` : s(String(e));
}
function gt(e) {
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
  ].map(({ key: r, value: n }) => `
    <tr>
      <td style="padding: 4px 8px 4px 0; color: #94a3b8; font-size: 12px; white-space: nowrap;">${s(r)}:</td>
      <td style="padding: 4px 0; font-family: monospace; font-size: 11px;">${J(n)}</td>
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
  ].map(({ key: r, value: n }) => `
      <tr>
        <td style="padding: 4px 8px 4px 0; color: #94a3b8; font-size: 12px; white-space: nowrap;">${s(r)}:</td>
        <td style="padding: 4px 0; font-family: monospace; font-size: 11px;">${J(n)}</td>
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
function bt(e) {
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
    const r = !!o, n = r ? "#22c55e" : "#64748b";
    return `
        <span style="
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          background: ${n}15;
          border: 1px solid ${n}30;
          border-radius: 4px;
          font-size: 11px;
          color: ${n};
        ">
          ${v(r ? "success" : "error", {
      size: 13,
      color: n
    })}
          ${s(t)}
        </span>
      `;
  }).join("")}
      </div>
    </details>
  ` : "";
}
function ft(e) {
  if (!e) return "";
  const t = e.timestamp ? h(e.timestamp) : "";
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
        ">${s(e.key?.route_hint || e.key?.key_hash?.slice(0, 16) || "unknown")}</span>
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
            <div style="color: #e2e8f0; font-family: monospace; font-size: 10px;">${s(e.content_type || "unknown")}</div>
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
            <div style="color: #e2e8f0;">${s(e.ttl_class || "default")}</div>
          </div>
        </div>
        ${t ? `<div style="margin-top: 6px; font-size: 10px; color: #64748b;">Cached at: ${s(t)}</div>` : ""}
      </div>
    </details>
  `;
}
function xt(e) {
  const t = e.observed_at ? h(e.observed_at) : "", o = e.raw_key || e.route_hint || e.key_hash?.slice(0, 16) || "unknown";
  return `
    <tr style="border-bottom: 1px solid #1e293b;">
      <td style="padding: 5px 8px; font-size: 10px; color: #64748b; white-space: nowrap;">${s(t)}</td>
      <td style="padding: 5px 8px; font-family: monospace; font-size: 10px; color: #e2e8f0; word-break: break-all;">
        ${s(o)}
        ${e.key_redacted ? '<span style="color: #64748b; font-style: italic;"> (redacted)</span>' : ""}
      </td>
      <td style="padding: 5px 8px; font-size: 10px; color: #64748b;">
        ${e.render_prefix ? '<span style="color: #8b5cf6;">render</span>' : ""}
      </td>
    </tr>
  `;
}
function mt(e, t = 20) {
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
            ${r.map((n) => xt(n)).join("")}
          </tbody>
        </table>
      </div>
    </details>
  `;
}
function ht(e) {
  const t = e.timestamp ? h(e.timestamp) : "", o = X(e.outcome), r = e.key?.route_hint || e.key?.key_hash?.slice(0, 12) || "";
  return `
    <tr style="border-bottom: 1px solid #1e293b;">
      <td style="padding: 5px 8px; font-size: 10px; color: #64748b; white-space: nowrap;">${s(t)}</td>
      <td style="padding: 5px 8px;">
        <span style="
          padding: 2px 5px;
          background: #3b82f615;
          border-radius: 3px;
          font-size: 10px;
          color: #60a5fa;
        ">${s(e.operation || "unknown")}</span>
      </td>
      <td style="padding: 5px 8px;">
        <span style="
          padding: 2px 5px;
          background: ${o.bgColor};
          border-radius: 3px;
          font-size: 10px;
          color: ${o.color};
        ">${s(e.outcome || "unknown")}</span>
      </td>
      <td style="padding: 5px 8px; font-family: monospace; font-size: 9px; color: #94a3b8; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
        ${s(r)}
      </td>
      <td style="padding: 5px 8px; font-size: 10px; color: #64748b;">
        ${e.message ? s(e.message.slice(0, 50)) : ""}
      </td>
    </tr>
  `;
}
function yt(e, t = 20) {
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
            ${r.map((n) => ht(n)).join("")}
          </tbody>
        </table>
      </div>
    </details>
  `;
}
function vt(e) {
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
        ">${s(C(e))}</pre>
      </div>
    </details>
  `;
}
function V(e, t, o = {}) {
  const { maxOperations: r = 20, maxKeys: n = 20, maxErrors: a = 10, showRawJSON: l = !1 } = o;
  return e ? e.configured ? `
    <div style="padding: 14px;">
      ${K(e)}
      ${ct(e.startup_error)}
      ${lt(e.counters)}
      ${dt(e.last_command)}
      ${ut(e.recent_errors, a)}
      ${ft(e.latest_cached)}
      ${gt(e.config)}
      ${bt(e.capabilities)}
      ${mt(e.observed_keys, n)}
      ${yt(e.recent_operations, r)}
      ${l ? vt(e) : ""}
    </div>
  ` : `
      <div style="padding: 12px;">
        ${K(e)}
        <div style="
          text-align: center;
          padding: 32px 16px;
          color: #64748b;
        ">
          <div style="margin-bottom: 10px;">${v("inactive", {
    size: 24,
    color: "#64748b"
  })}</div>
          <div style="font-size: 14px; font-weight: 500; margin-bottom: 6px; color: #94a3b8;">Cache Not Configured</div>
          <div style="font-size: 12px;">Enable site render cache in application configuration.</div>
        </div>
      </div>
    ` : `<div class="${t.emptyState}">No site render cache data available</div>`;
}
function $t(e, t) {
  if (!e) return `<div class="${t.emptyState}">No cache data</div>`;
  let o = e.status;
  e.configured && e.active || (o = "inactive");
  const r = G(o), n = e.counters || {}, a = n.hits || 0, l = n.misses || 0, d = n.errors || 0;
  let c = "N/A";
  const i = n.lookups || 0;
  i > 0 && (c = `${((n.hit_ratio !== null && n.hit_ratio !== void 0 ? n.hit_ratio : a / i) * 100).toFixed(1)}%`);
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
          ${v(r.icon, {
    size: 13,
    color: r.color
  })}
          <span style="font-size: 11px; font-weight: 600; color: ${r.color};">${s(r.label)}</span>
        </span>
        <span style="
          padding: 3px 6px;
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 4px;
          font-size: 10px;
          font-family: monospace;
          color: #e2e8f0;
        ">${s(e.backend || "none")}</span>
        ${u ? `
          <span style="
            padding: 3px 6px;
            background: rgba(245, 158, 11, 0.15);
            border: 1px solid rgba(245, 158, 11, 0.3);
            border-radius: 4px;
            font-size: 10px;
            color: #f59e0b;
          ">${v("warning", {
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
        <span>Hit Rate: <strong style="color: ${i > 0 ? "#22c55e" : "#64748b"};">${c}</strong></span>
        <span>Hits: <strong style="color: #22c55e;">${b(a)}</strong></span>
        <span>Misses: <strong style="color: #f59e0b;">${b(l)}</strong></span>
        ${d > 0 || p > 0 ? `
          <span>Errors: <strong style="color: #ef4444;">${b(d)}</strong></span>
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
          >${v("clear", {
    size: 12,
    color: "#fff"
  })} Clear</button>
        </div>
      ` : ""}
    </div>
  `;
}
function Zt(e) {
  const t = wt(e.dataset.actionPayload);
  return e instanceof HTMLFormElement && e.querySelectorAll("[data-action-field]").forEach((o) => {
    const r = (o.dataset.actionFieldPath || o.dataset.actionField || "").trim();
    if (!r) return;
    const n = kt(o);
    n !== void 0 && St(t, r, n);
  }), t;
}
function wt(e) {
  if (!e) return {};
  try {
    const t = JSON.parse(e);
    return t && typeof t == "object" && !Array.isArray(t) ? t : {};
  } catch {
    return {};
  }
}
function kt(e) {
  const t = (e.dataset.actionFieldKind || "").trim().toLowerCase();
  if (e instanceof HTMLInputElement && e.type === "checkbox") return e.checked;
  const o = Ct(e).trim();
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
function Ct(e) {
  return (e instanceof HTMLInputElement || e instanceof HTMLTextAreaElement || e instanceof HTMLSelectElement) && e.value || "";
}
function St(e, t, o) {
  const r = t.split(".").map((a) => a.trim()).filter(Boolean);
  if (r.length === 0) return;
  let n = e;
  r.slice(0, -1).forEach((a) => {
    const l = n[a];
    (!l || typeof l != "object" || Array.isArray(l)) && (n[a] = {}), n = n[a];
  }), n[r[r.length - 1]] = o;
}
var Tt = {
  id: "requests",
  label: "Requests",
  icon: "iconoir-network",
  snapshotKey: "requests",
  eventTypes: "request",
  category: "core",
  order: 10,
  render: (e, t, o) => z(e || [], t, {
    ...o,
    showSortToggle: !1,
    truncatePath: !1
  }),
  renderConsole: (e, t, o) => z(e || [], t, {
    ...o,
    showSortToggle: !1,
    truncatePath: !1
  }),
  renderToolbar: (e, t, o) => z(e || [], t, {
    ...o,
    maxEntries: 50,
    showSortToggle: !0,
    truncatePath: !0,
    maxPathLength: 50
  }),
  getCount: (e) => (e || []).length,
  handleEvent: (e, t) => S(e || [], t, 500),
  supportsToolbar: !0
}, _t = {
  id: "sql",
  label: "SQL",
  icon: "iconoir-database",
  snapshotKey: "sql",
  eventTypes: "sql",
  category: "core",
  order: 20,
  render: (e, t, o) => E(e || [], t, {
    ...o,
    showSortToggle: !1,
    useIconCopyButton: !0
  }),
  renderConsole: (e, t, o) => E(e || [], t, {
    ...o,
    maxEntries: 200,
    showSortToggle: !1,
    useIconCopyButton: !0
  }),
  renderToolbar: (e, t, o) => E(e || [], t, {
    ...o,
    maxEntries: 50,
    showSortToggle: !0,
    useIconCopyButton: !1
  }),
  getCount: (e) => (e || []).length,
  handleEvent: (e, t) => S(e || [], t, 500),
  supportsToolbar: !0
}, zt = {
  id: "logs",
  label: "Logs",
  icon: "iconoir-page",
  snapshotKey: "logs",
  eventTypes: "log",
  category: "core",
  order: 30,
  render: (e, t, o) => R(e || [], t, {
    ...o,
    showSortToggle: !1,
    showSource: !0,
    truncateMessage: !1
  }),
  renderConsole: (e, t, o) => R(e || [], t, {
    ...o,
    maxEntries: 500,
    showSortToggle: !1,
    showSource: !0,
    truncateMessage: !1
  }),
  renderToolbar: (e, t, o) => R(e || [], t, {
    newestFirst: !0,
    maxEntries: 100,
    showSortToggle: !1,
    showSource: !1,
    truncateMessage: !0,
    maxMessageLength: 100
  }),
  getCount: (e) => (e || []).length,
  handleEvent: (e, t) => S(e || [], t, 1e3),
  supportsToolbar: !0
}, Et = {
  id: "routes",
  label: "Routes",
  icon: "iconoir-path-arrow",
  snapshotKey: "routes",
  eventTypes: [],
  category: "system",
  order: 40,
  render: (e, t) => q(e || [], t, { showName: !0 }),
  renderConsole: (e, t) => q(e || [], t, { showName: !0 }),
  renderToolbar: (e, t) => q(e || [], t, { showName: !1 }),
  getCount: (e) => (e || []).length,
  supportsToolbar: !0
}, Rt = {
  id: "config",
  label: "Config",
  icon: "iconoir-settings",
  snapshotKey: "config",
  eventTypes: [],
  category: "system",
  order: 50,
  render: (e, t, o) => y("Config", e, t, {
    useIconCopyButton: !0,
    showCount: !0
  }),
  renderConsole: (e, t, o) => {
    const r = o?.filterFn;
    return y("Config", e, t, {
      useIconCopyButton: !0,
      showCount: !0,
      filterFn: r
    });
  },
  renderToolbar: (e, t) => y("Config", e, t, {
    useIconCopyButton: !1,
    showCount: !1
  }),
  getCount: (e) => e && typeof e == "object" ? Object.keys(e).length : 0,
  supportsToolbar: !0
}, qt = {
  id: "template",
  label: "Template",
  icon: "iconoir-code",
  snapshotKey: "template",
  eventTypes: "template",
  category: "data",
  order: 10,
  render: (e, t, o) => y("Template Context", e, t, {
    useIconCopyButton: !0,
    showCount: !0
  }),
  renderConsole: (e, t, o) => {
    const r = o?.filterFn;
    return y("Template Context", e, t, {
      useIconCopyButton: !0,
      showCount: !0,
      filterFn: r
    });
  },
  renderToolbar: (e, t) => y("Template Context", e, t, {
    useIconCopyButton: !1,
    showCount: !1
  }),
  getCount: (e) => e && typeof e == "object" ? Object.keys(e).length : 0,
  handleEvent: (e, t) => t,
  supportsToolbar: !0
}, Lt = {
  id: "session",
  label: "Session",
  icon: "iconoir-user",
  snapshotKey: "session",
  eventTypes: "session",
  category: "data",
  order: 20,
  render: (e, t, o) => y("Session", e, t, {
    useIconCopyButton: !0,
    showCount: !0
  }),
  renderConsole: (e, t, o) => {
    const r = o?.filterFn;
    return y("Session", e, t, {
      useIconCopyButton: !0,
      showCount: !0,
      filterFn: r
    });
  },
  renderToolbar: (e, t) => y("Session", e, t, {
    useIconCopyButton: !1,
    showCount: !1
  }),
  getCount: (e) => e && typeof e == "object" ? Object.keys(e).length : 0,
  handleEvent: (e, t) => t,
  supportsToolbar: !0
}, Nt = {
  id: "custom",
  label: "Custom",
  icon: "iconoir-puzzle",
  snapshotKey: "custom",
  eventTypes: "custom",
  category: "data",
  order: 30,
  render: (e, t, o) => L(e || {}, t, {
    useIconCopyButton: !0,
    showCount: !0
  }),
  renderConsole: (e, t, o) => {
    const r = e || {}, n = o?.dataFilterFn;
    return L(r, t, {
      maxLogEntries: 100,
      useIconCopyButton: !0,
      showCount: !0,
      dataFilterFn: n
    });
  },
  renderToolbar: (e, t) => L(e || {}, t, {
    maxLogEntries: 50,
    useIconCopyButton: !1,
    showCount: !1
  }),
  getCount: (e) => {
    const t = e || {};
    return (t.data ? Object.keys(t.data).length : 0) + (t.logs?.length || 0);
  },
  handleEvent: (e, t) => ne(e, t, 500),
  supportsToolbar: !0
}, Pt = {
  id: "jserrors",
  label: "JS Errors",
  icon: "iconoir-warning-triangle",
  snapshotKey: "jserrors",
  eventTypes: "jserror",
  category: "core",
  order: 35,
  render: (e, t, o) => N(e || [], t, {
    ...o,
    compact: !1,
    showSortToggle: !1
  }),
  renderConsole: (e, t, o) => N(e || [], t, {
    ...o,
    maxEntries: 500,
    compact: !1,
    showSortToggle: !1
  }),
  renderToolbar: (e, t, o) => N(e || [], t, {
    ...o,
    maxEntries: 50,
    compact: !0,
    showSortToggle: !0
  }),
  getCount: (e) => (e || []).length,
  handleEvent: (e, t) => S(e || [], t, 500),
  supportsToolbar: !0
}, jt = {
  id: "permissions",
  label: "Permissions",
  icon: "iconoir-shield-check",
  snapshotKey: "permissions",
  eventTypes: [],
  category: "system",
  order: 45,
  showFilters: !1,
  render: (e, t, o) => H(e, t, { showRawJSON: !0 }),
  renderConsole: (e, t, o) => H(e, t, { showRawJSON: !0 }),
  renderToolbar: (e, t, o) => Ue(e, t),
  getCount: (e) => {
    const t = e;
    return !t || !t.summary ? 0 : t.summary.missing_keys;
  },
  supportsToolbar: !0
}, Mt = {
  id: "doctor",
  label: "Doctor",
  icon: "iconoir-heart",
  snapshotKey: "doctor",
  eventTypes: [],
  category: "system",
  order: 46,
  showFilters: !1,
  render: (e, t, o) => F(e, t, { showRawJSON: !0 }),
  renderConsole: (e, t, o) => F(e, t, { showRawJSON: !0 }),
  getCount: (e) => {
    const t = e;
    return !t || !t.summary ? 0 : (t.summary.error || 0) + (t.summary.warn || 0);
  },
  supportsToolbar: !1
}, Ot = {
  id: "site-render-cache",
  label: "Site Cache",
  icon: "iconoir-database",
  snapshotKey: "site-render-cache",
  eventTypes: [],
  category: "site",
  order: 80,
  showFilters: !1,
  render: (e, t) => V(e, t, { showRawJSON: !1 }),
  renderConsole: (e, t) => V(e, t, {
    showRawJSON: !0,
    maxOperations: 50,
    maxKeys: 50,
    maxErrors: 20
  }),
  renderToolbar: (e, t) => $t(e, t),
  getCount: (e) => {
    const t = e;
    return !t || !t.counters ? 0 : t.counters.errors || 0;
  },
  supportsToolbar: !0
};
function Bt() {
  f.register(Tt), f.register(_t), f.register(zt), f.register(Pt), f.register(Et), f.register(jt), f.register(Mt), f.register(Ot), f.register(Rt), f.register(qt), f.register(Lt), f.register(Nt);
}
Bt();
export {
  Vt as C,
  Ft as E,
  Qt as S,
  xe as T,
  Ut as _,
  Yt as a,
  Jt as b,
  N as c,
  R as d,
  E as f,
  ye as g,
  Xt as h,
  F as i,
  L as l,
  he as m,
  V as n,
  H as o,
  z as p,
  $t as r,
  Ue as s,
  Zt as t,
  q as u,
  Wt as v,
  W as w,
  Gt as x,
  Kt as y
};

//# sourceMappingURL=builtin-panels-Df3h6Xh_.js.map