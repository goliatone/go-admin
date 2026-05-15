import { escapeHTML as n } from "../shared/html.js";
import { normalizeDebugBasePath as Z } from "../debug/shared/path-helpers.js";
import { A as I, D as ee, E as L, F as U, I as te, M as k, N as b, O as oe, P as m, R as w, S as f, _ as C, i as re, j as N, w as h } from "./server-definitions-BXgs2Hko.js";
var ne = 1e3, se = 12e3, ae = 8, ie = 1, le = 3e4, de = (e) => {
  const t = window.location.protocol === "https:" ? "wss:" : "ws:", o = Z(e);
  return `${t}//${window.location.host}${o}/ws`;
}, ce = (e, t, o) => {
  const r = e.trim();
  if (!r || !t || !o) return e;
  const [s, i] = r.split("#"), l = `${s}${s.includes("?") ? "&" : "?"}${encodeURIComponent(t)}=${encodeURIComponent(o)}`;
  return i ? `${l}#${i}` : l;
}, pe = (e) => {
  if (!e) return null;
  const t = e.replace(/-/g, "+").replace(/_/g, "/"), o = t.padEnd(t.length + (4 - (t.length % 4 || 4)) % 4, "=");
  try {
    if (typeof globalThis.atob == "function") return globalThis.atob(o);
  } catch {
    return null;
  }
  return null;
}, ue = (e) => {
  if (!e) return null;
  const t = e.split(".");
  if (t.length < 2) return null;
  const o = pe(t[1]);
  if (!o) return null;
  try {
    const r = JSON.parse(o);
    if (typeof r.exp == "number") return r.exp * 1e3;
  } catch {
    return null;
  }
  return null;
}, ge = (e, t) => {
  if (t) {
    if (typeof t.expiresInMs == "number" && t.expiresInMs > 0) return Date.now() + t.expiresInMs;
    const o = t.expiresAt ?? t.expires_at;
    if (typeof o == "number") return o;
    if (typeof o == "string") {
      const r = new Date(o);
      if (!Number.isNaN(r.getTime())) return r.getTime();
    }
  }
  return ue(e);
}, be = class {
  constructor(e) {
    this.ws = null, this.reconnectTimer = null, this.reconnectAttempts = 0, this.manualClose = !1, this.pendingCommands = [], this.status = "disconnected", this.hasConnected = !1, this.options = e;
  }
  getWebSocketURL() {
    return this.options.url ? this.options.url : de(this.options.basePath || "");
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
    const e = this.hasConnected ? this.options.maxReconnectAttempts ?? ae : this.options.maxInitialReconnectAttempts ?? ie, t = this.options.reconnectDelayMs ?? ne, o = this.options.maxReconnectDelayMs ?? se;
    if (this.reconnectAttempts >= e) {
      this.setStatus("disconnected");
      return;
    }
    const r = this.reconnectAttempts, s = Math.min(t * Math.pow(2, r), o), i = s * (0.2 + Math.random() * 0.3);
    this.reconnectAttempts += 1, this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null, this.connect();
    }, s + i);
  }
}, Ot = class extends be {
  constructor(e) {
    const { url: t, authToken: o, tokenProvider: r, tokenRefreshBufferMs: s, tokenParam: i, appId: l, onEvent: d, ...c } = e, a = (p) => {
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
      onEvent: a
    }), this.authToken = null, this.tokenRefreshTimer = null, this.tokenExpiresAt = null, this.baseUrl = t, this.tokenProvider = r, this.tokenRefreshBufferMs = s ?? le, this.tokenParam = i || "token", o && this.setToken(o);
  }
  getWebSocketURL() {
    return this.authToken ? ce(this.baseUrl, this.tokenParam, this.authToken) : this.baseUrl;
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
    this.authToken = e, this.tokenExpiresAt = ge(e, t), this.scheduleTokenRefresh();
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
async function V(e, t, o = {}) {
  const { feedbackDuration: r = 1500, useIconFeedback: s = !1, successClass: i = s ? "debug-copy--success" : "copied", errorClass: l = "debug-copy--error" } = o;
  try {
    await navigator.clipboard.writeText(e);
    const d = t.innerHTML;
    return t.classList.add(i), s ? t.innerHTML = '<i class="iconoir-check"></i> Copied' : t.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        Copied
      `, setTimeout(() => {
      t.innerHTML = d, t.classList.remove(i);
    }, r), !0;
  } catch {
    return t.classList.add(l), setTimeout(() => {
      t.classList.remove(l);
    }, r), !1;
  }
}
function Bt(e, t = {}) {
  e.querySelectorAll("[data-copy-trigger]").forEach((o) => {
    o.addEventListener("click", async (r) => {
      r.preventDefault(), r.stopPropagation();
      const s = o.closest("[data-copy-content]");
      s && await V(s.getAttribute("data-copy-content") || "", o, t);
    });
  });
}
function It(e) {
  e.querySelectorAll(".expandable-row").forEach((t) => {
    t.addEventListener("click", (o) => {
      o.target.closest("a, button, input") || o.currentTarget.classList.toggle("expanded");
    });
  });
}
function Dt(e, t) {
  e.querySelectorAll("[data-sort-toggle]").forEach((o) => {
    o.addEventListener("change", (r) => {
      const s = r.target, i = s.dataset.sortToggle;
      i && t(i, s.checked);
    });
  });
}
var At = {
  COPY_TRIGGER: "data-copy-trigger",
  COPY_CONTENT: "data-copy-content",
  ROW_ID: "data-row-id",
  EXPANSION_FOR: "data-expansion-for",
  SORT_TOGGLE: "data-sort-toggle"
}, Ht = {
  EXPANDABLE_ROW: "expandable-row",
  EXPANDED: "expanded",
  EXPANSION_ROW: "expansion-row",
  SLOW_QUERY: "slow-query",
  ERROR_QUERY: "error-query",
  EXPAND_ICON: "expand-icon"
};
function D(e, t) {
  return [...t].sort((o, r) => o - r).map((o) => e[o]).filter(Boolean).map((o) => {
    let r = `-- Duration: ${N(o.duration).text} | Rows: ${o.row_count ?? 0}`;
    return o.error && (r += ` | Error: ${o.error}`), o.timestamp && (r += ` | Time: ${o.timestamp}`), `${r}
${o.query || ""};`;
  }).join(`

`);
}
function fe(e, t, o = "text/sql") {
  const r = new Blob([e], { type: o }), s = URL.createObjectURL(r), i = document.createElement("a");
  i.href = s, i.download = t, i.click(), URL.revokeObjectURL(s);
}
function Ft(e, t, o = {}) {
  const r = /* @__PURE__ */ new Set(), s = e.querySelector("[data-sql-toolbar]"), i = e.querySelector("[data-sql-selected-count]"), l = e.querySelector(".sql-select-all"), d = e.querySelectorAll(".sql-select-row");
  if (!s || d.length === 0) return;
  function c() {
    if (!s) return;
    const a = r.size;
    s.dataset.visible = a > 0 ? "true" : "false", i && (i.textContent = `${a} selected`), l && (l.checked = a > 0 && a === d.length, l.indeterminate = a > 0 && a < d.length);
  }
  d.forEach((a) => {
    a.addEventListener("click", (p) => {
      p.stopPropagation();
    }), a.addEventListener("change", () => {
      const p = parseInt(a.dataset.sqlIndex || "", 10);
      Number.isNaN(p) || (a.checked ? r.add(p) : r.delete(p), c());
    });
  }), l && (l.addEventListener("click", (a) => {
    a.stopPropagation();
  }), l.addEventListener("change", () => {
    d.forEach((a) => {
      a.checked = l.checked;
      const p = parseInt(a.dataset.sqlIndex || "", 10);
      Number.isNaN(p) || (l.checked ? r.add(p) : r.delete(p));
    }), c();
  })), e.querySelector('[data-sql-export="clipboard"]')?.addEventListener("click", async (a) => {
    if (a.preventDefault(), r.size === 0) return;
    const p = D(t, r), u = a.currentTarget;
    await V(p, u, o);
  }), e.querySelector('[data-sql-export="download"]')?.addEventListener("click", (a) => {
    a.preventDefault(), r.size !== 0 && fe(D(t, r), `sql-queries-${(/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-").slice(0, 19)}.sql`);
  }), e.querySelector("[data-sql-clear-selection]")?.addEventListener("click", (a) => {
    a.preventDefault(), r.clear(), d.forEach((p) => {
      p.checked = !1;
    }), c();
  });
}
function Kt(e, t) {
  e.querySelectorAll("[data-request-table]").forEach((o) => {
    o.addEventListener("click", (r) => {
      const s = r.target;
      if (s.closest("button, a, input, [data-detail-for]")) return;
      const i = s.closest("[data-request-id]");
      if (!i) return;
      const l = i.dataset.requestId;
      if (!l) return;
      const d = i.nextElementSibling;
      if (!d || !d.hasAttribute("data-detail-for") || d.dataset.detailFor !== l) return;
      const c = d.querySelector("[data-request-detail-template]");
      if (c) {
        const p = d.querySelector("td");
        p && (p.appendChild(c.content.cloneNode(!0)), c.remove());
      }
      const a = i.querySelector("[data-expand-icon]");
      t.has(l) ? (t.delete(l), d.style.display = "none", a && (a.textContent = "▶")) : (t.add(l), d.style.display = "table-row", a && (a.textContent = "▼"));
    });
  });
}
var xe = {
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
}, me = {
  table: "",
  tableRoutes: "",
  badge: "badge",
  badgeMethod: (e) => `badge badge-method ${e.toLowerCase()}`,
  badgeStatus: (e) => {
    const t = te(e);
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
function Jt(e) {
  return e === "console" ? xe : me;
}
function he(e) {
  const t = String(e ?? "GET").trim().toUpperCase();
  return {
    display: t || "GET",
    classToken: t.replace(/[^A-Z]/g, "") || "GET"
  };
}
function ye(e, t) {
  return e.id ? e.id : `${e.timestamp || ""}-${t}`;
}
function ve(e, t, o) {
  return `
    <div class="${o.panelControls}">
      <label class="${o.sortToggle}">
        <input type="checkbox" data-sort-toggle="${e}" ${t ? "checked" : ""}>
        <span>Newest first</span>
      </label>
    </div>
  `;
}
function $e(e, t, o = {}) {
  const { maskPlaceholder: r = "***", maxDetailLength: s } = o, i = [], l = [];
  if (e.id && l.push(`<span>ID: <code>${n(e.id)}</code></span>`), e.remote_ip && l.push(`<span>IP: <code>${n(e.remote_ip)}</code></span>`), e.content_type && l.push(`<span>Content-Type: <code>${n(e.content_type)}</code></span>`), l.length > 0 && i.push(`<div class="${t.detailMetadataLine}">${l.join("")}</div>`), e.headers && Object.keys(e.headers).length > 0) {
    const d = Object.entries(e.headers).map(([c, a]) => {
      const p = s && a.length > s ? w(a, s) : a, u = a === r ? ` <span class="${t.detailMasked}">(masked)</span>` : "";
      return `<dt>${n(c)}</dt><dd>${n(p)}${u}</dd>`;
    }).join("");
    i.push(`
      <div class="${t.detailSection}">
        <span class="${t.detailLabel}">Request Headers</span>
        <dl class="${t.detailKeyValueTable}">${d}</dl>
      </div>
    `);
  }
  if (e.query && Object.keys(e.query).length > 0) {
    const d = Object.entries(e.query).map(([c, a]) => {
      const p = a === r ? ` <span class="${t.detailMasked}">(masked)</span>` : "";
      return `<dt>${n(c)}</dt><dd>${n(a)}${p}</dd>`;
    }).join("");
    i.push(`
      <div class="${t.detailSection}">
        <span class="${t.detailLabel}">Query Parameters</span>
        <dl class="${t.detailKeyValueTable}">${d}</dl>
      </div>
    `);
  }
  if (e.request_body) {
    const d = e.request_size ? ` (${I(e.request_size)})` : "", c = e.body_truncated ? ' <span class="' + t.detailMasked + '">(truncated)</span>' : "";
    let a;
    try {
      a = L(JSON.parse(e.request_body), !0);
    } catch {
      a = n(e.request_body);
    }
    i.push(`
      <div class="${t.detailSection}">
        <span class="${t.detailLabel}">Request Body${d}${c}</span>
        <div class="${t.detailBody}">
          <pre>${a}</pre>
        </div>
        <button class="${t.copyBtnSm}" data-copy-trigger="${n(e.request_body)}">Copy</button>
      </div>
    `);
  }
  if (e.response_headers && Object.keys(e.response_headers).length > 0) {
    const d = Object.entries(e.response_headers).map(([c, a]) => {
      const p = s && a.length > s ? w(a, s) : a;
      return `<dt>${n(c)}</dt><dd>${n(p)}</dd>`;
    }).join("");
    i.push(`
      <div class="${t.detailSection}">
        <span class="${t.detailLabel}">Response Headers</span>
        <dl class="${t.detailKeyValueTable}">${d}</dl>
      </div>
    `);
  }
  if (e.response_body) {
    const d = e.response_size ? ` (${I(e.response_size)})` : "";
    let c;
    try {
      c = L(JSON.parse(e.response_body), !0);
    } catch {
      c = n(e.response_body);
    }
    i.push(`
      <div class="${t.detailSection}">
        <span class="${t.detailLabel}">Response Body${d}</span>
        <div class="${t.detailBody}">
          <pre>${c}</pre>
        </div>
        <button class="${t.copyBtnSm}" data-copy-trigger="${n(e.response_body)}">Copy</button>
      </div>
    `);
  }
  return e.error && i.push(`
      <div class="${t.detailSection}">
        <div class="${t.detailError}">${n(e.error)}</div>
      </div>
    `), i.length === 0 ? `<div class="${t.detailPane}"><span class="${t.muted}">No additional details available</span></div>` : `<div class="${t.detailPane}">${i.join("")}</div>`;
}
function we(e, t, o, r) {
  const { display: s, classToken: i } = he(e.method), l = e.path || "", d = e.status || 0, c = N(e.duration, r.slowThresholdMs), a = ye(e, t), p = r.expandedRequestIds?.has(a) || !1, u = o.badgeMethod(i), g = o.badgeStatus(d), x = c.isSlow ? o.durationSlow : "", v = d >= 400 ? o.rowError : "", $ = r.truncatePath ? w(l, r.maxPathLength || 50) : l;
  let M = "";
  const S = s;
  if (S === "POST" || S === "PUT" || S === "PATCH") {
    const B = (e.content_type || e.headers?.["Content-Type"] || e.headers?.["content-type"] || "").split(";")[0].trim();
    B && (M = ` <span class="${o.badgeContentType}">${n(B)}</span>`);
  }
  const G = `<span class="${o.expandIcon}" data-expand-icon>${p ? "▼" : "▶"}</span>`, X = p ? "table-row" : "none", O = $e(e, o, {
    maskPlaceholder: r.maskPlaceholder,
    maxDetailLength: r.maxDetailLength
  }), Y = p ? O : `<template data-request-detail-template>${O}</template>`;
  return `
    <tr class="${v}" data-request-id="${n(a)}" style="cursor:pointer">
      <td>${G}<span class="${u}">${n(s)}</span>${M}</td>
      <td class="${o.path}" title="${n(l)}">${n($)}</td>
      <td><span class="${g}">${n(d || "-")}</span></td>
      <td class="${o.duration} ${x}">${c.text}</td>
      <td class="${o.timestamp}">${n(m(e.timestamp))}</td>
    </tr>
    <tr class="${o.detailRow}" data-detail-for="${n(a)}" style="display:${X}">
      <td colspan="5">${Y}</td>
    </tr>
  `;
}
function T(e, t, o = {}) {
  const { newestFirst: r = !0, slowThresholdMs: s = 50, maxEntries: i, showSortToggle: l = !1, truncatePath: d = !0, maxPathLength: c = 50 } = o, a = l ? ve("requests", r, t) : "";
  if (!e.length) return a + `<div class="${t.emptyState}">No requests captured</div>`;
  const p = i ? Math.max(0, e.length - i) : 0;
  let u = (i ? e.slice(-i) : e).map((x, v) => ({
    entry: x,
    originalIndex: p + v
  }));
  r && (u = [...u].reverse());
  const g = u.map(({ entry: x, originalIndex: v }) => we(x, v, t, {
    ...o,
    slowThresholdMs: s,
    truncatePath: d,
    maxPathLength: c
  })).join("");
  return `
    ${a}
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
function ke(e, t, o) {
  return `
    <div class="${o.panelControls}">
      <label class="${o.sortToggle}">
        <input type="checkbox" data-sort-toggle="${e}" ${t ? "checked" : ""}>
        <span>Newest first</span>
      </label>
    </div>
  `;
}
function Ce(e) {
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
function Se(e, t, o) {
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
function Te(e, t, o, r) {
  const s = N(e.duration, r.slowThresholdMs), i = s.isSlow, l = !!e.error, d = `sql-row-${t}`, c = e.query || "", a = ee(c, !0), p = [o.expandableRow];
  i && p.push(o.slowQuery), l && p.push(o.errorQuery);
  const u = i ? o.durationSlow : "", g = Se(o, r.useIconCopyButton || !1, d);
  return `
    <tr class="${p.join(" ")}" data-row-id="${d}">
      <td class="${o.selectCell}"><input type="checkbox" class="sql-select-row" data-sql-index="${t}"></td>
      <td class="${o.duration} ${u}">${s.text}</td>
      <td>${n(b(e.row_count ?? "-"))}</td>
      <td class="${o.timestamp}">${n(m(e.timestamp))}</td>
      <td>${l ? `<span class="${o.badgeError}">Error</span>` : ""}</td>
      <td class="${o.queryText}"><span class="${o.expandIcon}">&#9654;</span>${n(c)}</td>
    </tr>
    <tr class="${o.expansionRow}" data-expansion-for="${d}">
      <td colspan="6">
        <div class="${o.expandedContent}" data-copy-content="${n(c)}">
          <div class="${o.expandedContentHeader}">
            ${g}
          </div>
          <pre>${a}</pre>
        </div>
      </td>
    </tr>
  `;
}
function _(e, t, o = {}) {
  const { newestFirst: r = !0, slowThresholdMs: s = 50, maxEntries: i = 50, showSortToggle: l = !1, useIconCopyButton: d = !1 } = o, c = l ? ke("sql", r, t) : "", a = Ce(t);
  if (!e.length) return c + `<div class="${t.emptyState}">No SQL queries captured</div>`;
  let p = i ? e.slice(-i) : e;
  r && (p = [...p].reverse());
  const u = p.map((g, x) => Te(g, x, t, {
    ...o,
    slowThresholdMs: s,
    useIconCopyButton: d
  })).join("");
  return `
    ${c}
    ${a}
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
function _e(e, t, o) {
  return `
    <div class="${o.panelControls}">
      <label class="${o.sortToggle}">
        <input type="checkbox" data-sort-toggle="${e}" ${t ? "checked" : ""}>
        <span>Newest first</span>
      </label>
    </div>
  `;
}
function ze(e, t, o) {
  const r = e.level || "INFO", s = String(r).toUpperCase(), i = U(String(r)), l = e.message || "", d = e.source || "", c = t.badgeLevel(i), a = i === "error" ? t.rowError : "", p = o.truncateMessage ? w(l, o.maxMessageLength || 100) : l, u = o.showSource ? `<td class="${t.timestamp}">${n(d)}</td>` : "";
  return `
    <tr class="${a}">
      <td><span class="${c}">${n(s)}</span></td>
      <td class="${t.timestamp}">${n(m(e.timestamp))}</td>
      <td class="${t.message}" title="${n(l)}">${n(p)}</td>
      ${u}
    </tr>
  `;
}
function z(e, t, o = {}) {
  const { newestFirst: r = !0, maxEntries: s = 100, showSortToggle: i = !1, showSource: l = !1, truncateMessage: d = !0, maxMessageLength: c = 100 } = o, a = i ? _e("logs", r, t) : "";
  if (!e.length) return a + `<div class="${t.emptyState}">No logs captured</div>`;
  let p = s ? e.slice(-s) : e;
  r && (p = [...p].reverse());
  const u = p.map((x) => ze(x, t, {
    ...o,
    showSource: l,
    truncateMessage: d,
    maxMessageLength: c
  })).join(""), g = l ? "<th>Source</th>" : "";
  return `
    ${a}
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
function Re(e, t, o) {
  const r = e.method || "GET", s = e.path || "", i = e.handler || "-", l = e.name || "", d = t.badgeMethod(r), c = o.showName ? `<td class="${t.timestamp}">${n(l)}</td>` : "";
  return `
    <tr>
      <td><span class="${d}">${n(r)}</span></td>
      <td class="${t.path}">${n(s)}</td>
      <td>${n(i)}</td>
      ${c}
    </tr>
  `;
}
function R(e, t, o = {}) {
  const { showName: r = !1 } = o;
  if (!e.length) return `<div class="${t.emptyState}">No routes available</div>`;
  const s = e.map((l) => Re(l, t, { showName: r })).join(""), i = r ? "<th>Name</th>" : "";
  return `
    <table class="${t.tableRoutes || t.table}">
      <thead>
        <tr>
          <th>Method</th>
          <th>Path</th>
          <th>Handler</th>
          ${i}
        </tr>
      </thead>
      <tbody>${s}</tbody>
    </table>
  `;
}
function qe(e, t) {
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
function Ee(e, t) {
  return `
    <tr>
      <td><span class="${t.badgeCustom}">${n(e.category || "custom")}</span></td>
      <td class="${t.timestamp}">${n(m(e.timestamp))}</td>
      <td class="${t.message}">${n(e.message || "")}</td>
    </tr>
  `;
}
function Le(e, t, o) {
  const { useIconCopyButton: r = !1, showCount: s = !0 } = o, i = k(e), l = L(e, !0), d = qe(t, r), c = s ? `<span class="${t.muted}">${b(oe(e))} keys</span>` : "";
  return `
    <div class="${t.jsonPanel}" data-copy-content="${n(i)}">
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
function Ne(e, t, o) {
  const { maxLogEntries: r = 50 } = o;
  if (!e.length) return `<div class="${t.emptyState}">No custom logs yet.</div>`;
  const s = e.slice(-r).reverse().map((i) => Ee(i, t)).join("");
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
function q(e, t, o = {}) {
  const { dataFilterFn: r } = o, s = e.data || {}, i = r ? r(s) : s, l = e.logs || [], d = Object.keys(i).length > 0, c = l.length > 0;
  if (!d && !c) return `<div class="${t.emptyState}">No custom data captured</div>`;
  let a = "";
  return d && (a += Le(i, t, o)), c && (a += `
      <div class="${t.jsonPanel}">
        <div class="${t.jsonHeader}">
          <span class="${t.jsonViewerTitle}">Custom Logs</span>
          <span class="${t.muted}">${b(l.length)} entries</span>
        </div>
        <div class="${t.jsonContent}">
          ${Ne(l, t, o)}
        </div>
      </div>
    `), d && c ? `<div class="${t.jsonGrid}">${a}</div>` : a;
}
function je(e) {
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
function Pe(e) {
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
function Me(e, t, o) {
  const r = Pe(e.type), s = je(e.type), i = t.badgeLevel(s), l = e.message || "", d = e.source || "", c = !!e.stack, a = e.type === "network_error" && e.extra?.request_url ? String(e.extra.request_url) : d && e.line ? `${d}:${e.line}${e.column ? ":" + e.column : ""}` : d || "", p = c ? `<span class="${t.expandIcon}">&#9654;</span>` : "", u = c ? t.expandableRow : "", g = o.compact ? n(l.length > 100 ? l.slice(0, 100) + "..." : l) : n(l), x = !o.compact && a ? `<td class="${t.timestamp}" title="${n(a)}">${n(a.length > 60 ? "..." + a.slice(-57) : a)}</td>` : "", v = !o.compact && e.url ? `<td class="${t.timestamp}" title="${n(e.url)}">${n(e.url.length > 40 ? "..." + e.url.slice(-37) : e.url)}</td>` : "";
  let $ = "";
  return c && ($ = `
      <tr class="${t.expansionRow}">
        <td colspan="${o.compact ? 3 : 5}">
          <div class="${t.expandedContent}">
            <pre style="margin:0;white-space:pre-wrap;word-break:break-all;font-size:0.8em;opacity:0.85">${n(e.stack)}</pre>
          </div>
        </td>
      </tr>
    `), `
    <tr class="${t.rowError} ${u}">
      <td>${p}<span class="${i}">${n(r)}</span></td>
      <td class="${t.timestamp}">${n(m(e.timestamp))}</td>
      <td class="${t.message}" title="${n(l)}">${g}</td>
      ${x}
      ${v}
    </tr>
    ${$}
  `;
}
function Oe(e, t) {
  return `
    <div class="${t.panelControls}">
      <label class="${t.sortToggle}">
        <input type="checkbox" data-sort-toggle="jserrors" ${e ? "checked" : ""}>
        <span>Newest first</span>
      </label>
    </div>
  `;
}
function E(e, t, o = {}) {
  const { newestFirst: r = !0, maxEntries: s = 100, compact: i = !1, showSortToggle: l = !1 } = o, d = l ? Oe(r, t) : "";
  if (!e.length) return d + `<div class="${t.emptyState}">No JS errors captured</div>`;
  let c = s ? e.slice(-s) : e;
  r && (c = [...c].reverse());
  const a = c.map((g) => Me(g, t, {
    ...o,
    compact: i
  })).join(""), p = i ? "" : "<th>Location</th>", u = i ? "" : "<th>Page</th>";
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
      <tbody>${a}</tbody>
    </table>
  `;
}
function j(e) {
  switch (e) {
    case "healthy":
      return {
        label: "Healthy",
        color: "#22c55e",
        bgColor: "rgba(34, 197, 94, 0.1)",
        icon: "✓"
      };
    case "missing_grants":
      return {
        label: "Missing Grants",
        color: "#ef4444",
        bgColor: "rgba(239, 68, 68, 0.1)",
        icon: "✗"
      };
    case "claims_stale":
      return {
        label: "Resolver Drift",
        color: "#f97316",
        bgColor: "rgba(249, 115, 22, 0.1)",
        icon: "⚠"
      };
    case "scope_mismatch":
      return {
        label: "Scope/Policy Mismatch",
        color: "#eab308",
        bgColor: "rgba(234, 179, 8, 0.1)",
        icon: "⚠"
      };
    case "error":
      return {
        label: "Error",
        color: "#ef4444",
        bgColor: "rgba(239, 68, 68, 0.1)",
        icon: "✗"
      };
    default:
      return {
        label: "Unknown",
        color: "#6b7280",
        bgColor: "rgba(107, 114, 128, 0.1)",
        icon: "?"
      };
  }
}
function Be(e) {
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
function Ie(e) {
  const t = j(e.verdict), o = e.user_info || {};
  let r = "";
  return (o.username || o.user_id) && (r = `
      <div style="display: flex; gap: 12px; font-size: 12px; color: #94a3b8; margin-top: 8px;">
        ${o.username ? `<span>User: <strong style="color: #e2e8f0;">${n(o.username)}</strong></span>` : ""}
        ${o.role ? `<span>Role: <strong style="color: #e2e8f0;">${n(o.role)}</strong></span>` : ""}
        ${o.tenant_id ? `<span>Tenant: <strong style="color: #e2e8f0;">${n(o.tenant_id)}</strong></span>` : ""}
        ${o.org_id ? `<span>Org: <strong style="color: #e2e8f0;">${n(o.org_id)}</strong></span>` : ""}
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
        ">${t.icon}</span>
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
function De(e) {
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
function Ae(e, t) {
  const o = Be(e.status), r = (s) => s ? '<span style="color: #22c55e; font-weight: bold;">✓</span>' : '<span style="color: #ef4444; font-weight: bold;">✗</span>';
  return `
    <tr style="border-bottom: 1px solid #334155;">
      <td style="padding: 10px 12px; font-family: monospace; font-size: 12px; color: #e2e8f0;">
        ${n(e.permission)}
        ${e.module ? `<span style="color: #64748b; font-size: 10px; margin-left: 8px;">(${n(e.module)})</span>` : ""}
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
        ">${n(e.diagnosis)}</span>
      </td>
    </tr>
  `;
}
function He(e) {
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
            ${t.map((o, r) => Ae(o, r)).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}
function Fe(e) {
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
        <span style="color: ${j(e.verdict).color};">Next Actions</span>
      </h3>
      <ul style="
        margin: 0;
        padding: 0 0 0 20px;
        color: #cbd5e1;
        font-size: 13px;
        line-height: 1.6;
      ">
        ${t.map((o) => o.startsWith("  -") ? `<li style="margin-left: 20px; color: #94a3b8;">${n(o.trim().slice(2))}</li>` : `<li>${n(o)}</li>`).join("")}
      </ul>
    </div>
  `;
}
function Ke(e) {
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
        ">${n(k(e))}</pre>
      </div>
    </details>
  `;
}
function A(e, t, o = {}) {
  const { showRawJSON: r = !0, showCollapsible: s = !0 } = o;
  return e ? `
    <div style="padding: 8px;">
      ${Ie(e)}
      ${De(e)}
      ${He(e)}
      ${Fe(e)}
      ${r ? Ke(e) : ""}
    </div>
  ` : `<div class="${t.emptyState}">No permissions data available</div>`;
}
function Je(e, t) {
  if (!e) return `<div class="${t.emptyState}">No permissions data</div>`;
  const o = j(e.verdict), r = e.summary || {
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
        ">${o.icon}</span>
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
function P(e) {
  switch ((e || "").toLowerCase()) {
    case "error":
      return {
        label: "Error",
        color: "#ef4444",
        bgColor: "rgba(239, 68, 68, 0.1)",
        borderColor: "rgba(239, 68, 68, 0.4)",
        icon: "✗"
      };
    case "warn":
      return {
        label: "Warning",
        color: "#f59e0b",
        bgColor: "rgba(245, 158, 11, 0.1)",
        borderColor: "rgba(245, 158, 11, 0.4)",
        icon: "⚠"
      };
    case "info":
      return {
        label: "Info",
        color: "#3b82f6",
        bgColor: "rgba(59, 130, 246, 0.1)",
        borderColor: "rgba(59, 130, 246, 0.4)",
        icon: "ℹ"
      };
    default:
      return {
        label: "OK",
        color: "#22c55e",
        bgColor: "rgba(34, 197, 94, 0.1)",
        borderColor: "rgba(34, 197, 94, 0.4)",
        icon: "✓"
      };
  }
}
function Ue(e) {
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
function Ve(e) {
  const t = P(e.verdict), o = Ue(e.verdict);
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
      ">${t.icon}</span>
      <div>
        <div style="
          font-size: 16px;
          font-weight: 600;
          color: ${t.color};
        ">${n(o)}</div>
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
function We(e) {
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
function Qe(e) {
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
      ${Ve(e)}
      <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 8px;">
        ${We(e.summary)}
        ${t ? `<span style="font-size: 11px; color: #64748b;">Generated: ${n(t)}</span>` : ""}
      </div>
    </div>
  `;
}
function Ge(e) {
  const t = P(e.severity), o = String(e.message || "").trim(), r = String(e.hint || "").trim(), s = String(e.code || "").trim(), i = String(e.component || "").trim();
  if (!o) return "";
  const l = [s, i].filter(Boolean).join(" • ");
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
      ">${t.icon}</span>
      <div style="flex: 1; min-width: 0;">
        <div style="
          font-size: 13px;
          color: #e2e8f0;
          line-height: 1.4;
          word-break: break-word;
        ">${n(o)}</div>
        ${r ? `
          <div style="
            margin-top: 6px;
            font-size: 12px;
            color: #94a3b8;
            display: flex;
            align-items: flex-start;
            gap: 6px;
          ">
            <span style="color: #64748b;">💡</span>
            <span>${n(r)}</span>
          </div>
        ` : ""}
        ${l ? `
          <div style="
            margin-top: 4px;
            font-size: 11px;
            color: #64748b;
            font-family: monospace;
          ">${n(l)}</div>
        ` : ""}
      </div>
    </div>
  `;
}
function Xe(e) {
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
      ${e.map((t) => Ge(t)).join("")}
    </div>
  `;
}
function Ye(e, t) {
  if (!t) return "";
  const o = String(t.description || "").trim(), r = String(t.cta || t.label || "").trim(), s = !!t.runnable, i = !!t.applicable, l = !!t.requires_confirmation, d = String(t.confirm_text || "").trim(), c = t.kind || "manual";
  let a = "enabled", p = "";
  i ? s || (a = "manual", p = c === "manual" ? "Manual action required" : "Action not available") : (a = "not-applicable", p = "Not applicable for current status");
  const u = a !== "enabled", g = u ? "background: #374151; color: #6b7280; cursor: not-allowed;" : "background: #3b82f6; color: #fff; cursor: pointer;";
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
        ">${n(o)}</div>
      ` : ""}
      <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
        ${r ? `
          <button
            type="button"
            class="debug-btn"
            data-doctor-action-run="${n(e)}"
            ${d ? `data-doctor-action-confirm="${n(d)}"` : ""}
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
          >${n(r)}</button>
        ` : ""}
        ${p ? `
          <span style="
            font-size: 12px;
            color: #64748b;
            font-style: italic;
          ">${n(p)}</span>
        ` : ""}
      </div>
    </div>
  `;
}
function Ze(e) {
  return e == null ? '<span style="color: #64748b; font-style: italic;">null</span>' : typeof e == "boolean" ? `<span style="color: ${e ? "#22c55e" : "#ef4444"}; font-weight: 500;">${e}</span>` : typeof e == "number" ? `<span style="color: #818cf8;">${e}</span>` : typeof e == "string" ? `<span style="color: #fbbf24;">"${n(e)}"</span>` : typeof e == "object" ? `<span style="color: #94a3b8;">${n(JSON.stringify(e))}</span>` : n(String(e));
}
function et(e) {
  if (!e || Object.keys(e).length === 0) return "";
  const t = Object.entries(e).map(([o, r]) => `
      <tr>
        <td style="
          padding: 4px 8px 4px 0;
          color: #94a3b8;
          font-size: 12px;
          vertical-align: top;
          white-space: nowrap;
        ">${n(o)}:</td>
        <td style="
          padding: 4px 0;
          font-family: monospace;
          font-size: 11px;
          word-break: break-all;
        ">${Ze(r)}</td>
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
function tt(e) {
  const t = P(e.status), o = String(e.label || e.id || "").trim(), r = String(e.summary || "").trim(), s = String(e.help || e.description || "").trim(), i = e.duration_ms !== void 0 ? `${e.duration_ms}ms` : "";
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
          ">${t.icon}</span>
          <div>
            <div style="
              font-size: 14px;
              font-weight: 600;
              color: #e2e8f0;
            ">${n(o)}</div>
            <div style="
              font-size: 11px;
              color: #64748b;
              font-family: monospace;
            ">${n(e.id || "")}</div>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 12px;">
          ${i ? `
            <span style="
              font-size: 11px;
              color: #64748b;
              font-family: monospace;
            ">${n(i)}</span>
          ` : ""}
          <span style="
            padding: 4px 10px;
            border-radius: 999px;
            font-size: 11px;
            font-weight: 600;
            color: ${t.color};
            background: ${t.bgColor};
            border: 1px solid ${t.borderColor};
          ">${n(t.label)}</span>
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
          ">${n(r)}</div>
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
            ">${n(s)}</div>
          </details>
        ` : ""}

        <!-- Findings -->
        ${Xe(e.findings)}

        <!-- Action -->
        ${Ye(e.id, e.action)}

        <!-- Metadata -->
        ${et(e.metadata)}
      </div>
    </div>
  `;
}
function ot(e) {
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
        <span style="color: #f59e0b;">📋</span>
        Recommended Next Actions
      </div>
      <ol style="
        margin: 0;
        padding: 0 0 0 20px;
        color: #cbd5e1;
        font-size: 13px;
        line-height: 1.6;
      ">
        ${e.map((t) => `<li style="margin-bottom: 4px;">${n(t)}</li>`).join("")}
      </ol>
    </div>
  `;
}
function rt(e) {
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
        ">${n(k(e))}</pre>
      </div>
    </details>
  `;
}
function H(e, t, o = {}) {
  const { showRawJSON: r = !0, problemsOnly: s = !1 } = o;
  if (!e) return `<div class="${t.emptyState}">No doctor diagnostics available</div>`;
  let i = e.checks || [];
  s && (i = i.filter((a) => a.status === "warn" || a.status === "error"));
  const l = {
    error: 0,
    warn: 1,
    info: 2,
    ok: 3
  };
  i = [...i].sort((a, p) => {
    const u = l[a.status || "ok"] ?? 4, g = l[p.status || "ok"] ?? 4;
    return u !== g ? u - g : (a.label || a.id || "").localeCompare(p.label || p.id || "");
  });
  const d = i.some((a) => a.status === "warn" || a.status === "error");
  let c = "";
  return i.length === 0 ? s && !d ? c = `
        <div style="
          text-align: center;
          padding: 40px 20px;
          color: #22c55e;
        ">
          <div style="font-size: 48px; margin-bottom: 12px;">✓</div>
          <div style="font-size: 18px; font-weight: 600; margin-bottom: 8px;">All Systems Healthy</div>
          <div style="font-size: 14px; color: #94a3b8;">${e.summary?.checks || 0} checks passed</div>
        </div>
      ` : c = `<div class="${t.emptyState}">No doctor checks available</div>` : c = i.map((a) => tt(a)).join(""), `
    <div style="padding: 12px;">
      ${Qe(e)}
      ${c}
      ${ot(e.next_actions)}
      ${r ? rt(e) : ""}
    </div>
  `;
}
function y(e, t = {}) {
  const o = t.size || 12, r = `data-site-cache-icon="${e}" aria-hidden="true" focusable="false" width="${o}" height="${o}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;flex:0 0 ${o}px;width:${o}px;height:${o}px;color:${t.color || "currentColor"};vertical-align:-2px;"`;
  switch (e) {
    case "check":
      return `<svg ${r}><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    case "warning":
      return `<svg ${r}><path d="M10.3 4.3 2.6 18a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z"></path><path d="M12 9v4"></path><path d="M12 17h.01"></path></svg>`;
    case "x":
      return `<svg ${r}><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>`;
    case "circle":
      return `<svg ${r}><circle cx="12" cy="12" r="8"></circle></svg>`;
    case "refresh":
      return `<svg ${r}><path d="M21 12a9 9 0 0 1-15.1 6.6"></path><path d="M3 12a9 9 0 0 1 15.1-6.6"></path><path d="M18 3v5h-5"></path><path d="M6 21v-5h5"></path></svg>`;
    default:
      return `<svg ${r}><circle cx="12" cy="12" r="9"></circle><path d="M9.5 9a2.6 2.6 0 1 1 4.3 2c-.9.6-1.8 1.3-1.8 2.5"></path><path d="M12 17h.01"></path></svg>`;
  }
}
function W(e) {
  const t = (e || "").toLowerCase();
  return t === "healthy" || t === "active" ? {
    label: "Healthy",
    color: "#22c55e",
    bgColor: "rgba(34, 197, 94, 0.1)",
    borderColor: "rgba(34, 197, 94, 0.4)",
    icon: "check"
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
    icon: "x"
  } : t === "inactive" || t === "disabled" ? {
    label: "Inactive",
    color: "#64748b",
    bgColor: "rgba(100, 116, 139, 0.1)",
    borderColor: "rgba(100, 116, 139, 0.4)",
    icon: "circle"
  } : {
    label: e || "Unknown",
    color: "#94a3b8",
    bgColor: "rgba(148, 163, 184, 0.1)",
    borderColor: "rgba(148, 163, 184, 0.4)",
    icon: "help"
  };
}
function Q(e) {
  const t = (e || "").toLowerCase();
  return t === "success" || t === "ok" ? {
    label: "Success",
    color: "#22c55e",
    bgColor: "rgba(34, 197, 94, 0.1)",
    borderColor: "rgba(34, 197, 94, 0.4)",
    icon: "check"
  } : t === "failed" || t === "error" ? {
    label: "Failed",
    color: "#ef4444",
    bgColor: "rgba(239, 68, 68, 0.1)",
    borderColor: "rgba(239, 68, 68, 0.4)",
    icon: "x"
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
    icon: "help"
  };
}
function nt(e) {
  let t = e.status;
  e.configured && e.active || (t = "inactive");
  const o = W(t);
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
      ">${n(r)}</span>
    </div>
  `;
}
function st(e) {
  const t = e.backend || "none", o = e.scope || "unknown", r = o === "process_local", s = r ? "rgba(245, 158, 11, 0.15)" : "rgba(100, 116, 139, 0.15)", i = r ? "rgba(245, 158, 11, 0.3)" : "rgba(100, 116, 139, 0.3)", l = r ? "#f59e0b" : "#94a3b8";
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
      ">${n(t)}</span>
      <span style="
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 5px 8px;
        background: ${s};
        border: 1px solid ${i};
        border-radius: 4px;
        color: ${l};
        font-weight: 500;
      ">${r ? y("warning", {
    size: 13,
    color: l
  }) : ""}<span>${n(o)}</span></span>
      ${e.observed_by ? `
        <span style="color: #64748b; font-size: 11px;">
          obs: ${n(e.observed_by)}
        </span>
      ` : ""}
    </div>
  `;
}
function at() {
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
      ${y("refresh", {
    size: 13,
    color: "#fff"
  })}
      <span>Clear Cache</span>
    </button>
  `;
}
function F(e) {
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
      ${nt(e)}
      <span style="color: #334155; font-size: 10px;">│</span>
      ${st(e)}
      ${e.active ? `
        <div style="margin-left: auto;">
          ${at()}
        </div>
      ` : ""}
    </div>
  `;
}
function it(e) {
  const t = e || {}, o = t.lookups || 0, r = t.hits || 0, s = t.misses || 0, i = t.writes || 0, l = t.errors || 0, d = t.clears || 0;
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
      value: b(s),
      color: "#f59e0b"
    },
    {
      label: "Writes",
      value: b(i),
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
  ].map((a) => `
        <div style="
          background: ${a.color}15;
          border: 1px solid ${a.color}30;
          border-radius: 5px;
          padding: 8px 10px;
          text-align: center;
        ">
          <div style="
            font-size: 16px;
            font-weight: 600;
            color: ${a.color};
            line-height: 1.2;
          ">${a.value}</div>
          <div style="
            font-size: 10px;
            color: #94a3b8;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            margin-top: 2px;
          ">${a.label}</div>
        </div>
      `).join("")}
    </div>
  `;
}
function lt(e) {
  if (!e) return "";
  const t = Q(e.outcome), o = e.timestamp ? m(e.timestamp) : "";
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
        ">${n(t.label)}</span>
      </div>
      <div style="
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
        font-size: 12px;
        color: #cbd5e1;
      ">
        <span><strong>Command:</strong> ${n(e.command || "unknown")}</span>
        <span><strong>Mode:</strong> ${n(e.mode || "none")}</span>
        ${e.target_count !== void 0 ? `<span><strong>Targets:</strong> ${e.target_count}</span>` : ""}
        ${o ? `<span style="color: #64748b;">${n(o)}</span>` : ""}
      </div>
      ${e.message ? `
        <div style="
          margin-top: 6px;
          font-size: 11px;
          color: #94a3b8;
          font-style: italic;
        ">${n(e.message)}</div>
      ` : ""}
    </div>
  `;
}
function dt(e) {
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
      ">${n(e.message || "Unknown error")}</div>
      <div style="
        margin-top: 6px;
        display: flex;
        gap: 12px;
        font-size: 11px;
        color: #94a3b8;
      ">
        ${e.backend ? `<span><strong>Backend:</strong> ${n(e.backend)}</span>` : ""}
        ${e.error_kind ? `<span><strong>Kind:</strong> ${n(e.error_kind)}</span>` : ""}
        ${e.fail_closed !== void 0 ? `<span><strong>Fail Closed:</strong> ${e.fail_closed ? "Yes" : "No"}</span>` : ""}
      </div>
    </div>
  ` : "";
}
function ct(e) {
  return `
    <tr style="border-bottom: 1px solid #1e293b;">
      <td style="padding: 5px 8px; color: #64748b; font-size: 10px; white-space: nowrap;">${n(e.timestamp ? m(e.timestamp) : "")}</td>
      <td style="padding: 5px 8px;">
        <span style="
          padding: 2px 5px;
          background: rgba(239, 68, 68, 0.15);
          border-radius: 3px;
          font-size: 10px;
          color: #f87171;
        ">${n(e.operation || "unknown")}</span>
      </td>
      <td style="padding: 5px 8px; font-size: 11px; color: #cbd5e1;">${n(e.message || "")}</td>
      <td style="padding: 5px 8px; font-size: 10px; color: #64748b; font-family: monospace;">
        ${e.key?.route_hint ? n(e.key.route_hint) : e.key?.key_hash ? n(e.key.key_hash.slice(0, 12)) : ""}
      </td>
    </tr>
  `;
}
function pt(e, t = 10) {
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
            ${r.map((s) => ct(s)).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}
function K(e) {
  return e == null ? '<span style="color: #64748b; font-style: italic;">null</span>' : typeof e == "boolean" ? `<span style="color: ${e ? "#22c55e" : "#64748b"}; font-weight: 500;">${e}</span>` : typeof e == "number" ? `<span style="color: #818cf8;">${e}</span>` : typeof e == "string" ? e === "" ? '<span style="color: #64748b; font-style: italic;">empty</span>' : `<span style="color: #fbbf24;">${n(e)}</span>` : n(String(e));
}
function ut(e) {
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
      <td style="padding: 4px 8px 4px 0; color: #94a3b8; font-size: 12px; white-space: nowrap;">${n(r)}:</td>
      <td style="padding: 4px 0; font-family: monospace; font-size: 11px;">${K(s)}</td>
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
        <td style="padding: 4px 8px 4px 0; color: #94a3b8; font-size: 12px; white-space: nowrap;">${n(r)}:</td>
        <td style="padding: 4px 0; font-family: monospace; font-size: 11px;">${K(s)}</td>
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
function gt(e) {
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
          ${y(r ? "check" : "x", {
      size: 13,
      color: s
    })}
          ${n(t)}
        </span>
      `;
  }).join("")}
      </div>
    </details>
  ` : "";
}
function bt(e) {
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
        ">${n(e.key?.route_hint || e.key?.key_hash?.slice(0, 16) || "unknown")}</span>
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
            <div style="color: #e2e8f0; font-family: monospace; font-size: 10px;">${n(e.content_type || "unknown")}</div>
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
            <div style="color: #e2e8f0;">${n(e.ttl_class || "default")}</div>
          </div>
        </div>
        ${t ? `<div style="margin-top: 6px; font-size: 10px; color: #64748b;">Cached at: ${n(t)}</div>` : ""}
      </div>
    </details>
  `;
}
function ft(e) {
  const t = e.observed_at ? m(e.observed_at) : "", o = e.raw_key || e.route_hint || e.key_hash?.slice(0, 16) || "unknown";
  return `
    <tr style="border-bottom: 1px solid #1e293b;">
      <td style="padding: 5px 8px; font-size: 10px; color: #64748b; white-space: nowrap;">${n(t)}</td>
      <td style="padding: 5px 8px; font-family: monospace; font-size: 10px; color: #e2e8f0; word-break: break-all;">
        ${n(o)}
        ${e.key_redacted ? '<span style="color: #64748b; font-style: italic;"> (redacted)</span>' : ""}
      </td>
      <td style="padding: 5px 8px; font-size: 10px; color: #64748b;">
        ${e.render_prefix ? '<span style="color: #8b5cf6;">render</span>' : ""}
      </td>
    </tr>
  `;
}
function xt(e, t = 20) {
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
            ${r.map((s) => ft(s)).join("")}
          </tbody>
        </table>
      </div>
    </details>
  `;
}
function mt(e) {
  const t = e.timestamp ? m(e.timestamp) : "", o = Q(e.outcome), r = e.key?.route_hint || e.key?.key_hash?.slice(0, 12) || "";
  return `
    <tr style="border-bottom: 1px solid #1e293b;">
      <td style="padding: 5px 8px; font-size: 10px; color: #64748b; white-space: nowrap;">${n(t)}</td>
      <td style="padding: 5px 8px;">
        <span style="
          padding: 2px 5px;
          background: #3b82f615;
          border-radius: 3px;
          font-size: 10px;
          color: #60a5fa;
        ">${n(e.operation || "unknown")}</span>
      </td>
      <td style="padding: 5px 8px;">
        <span style="
          padding: 2px 5px;
          background: ${o.bgColor};
          border-radius: 3px;
          font-size: 10px;
          color: ${o.color};
        ">${n(e.outcome || "unknown")}</span>
      </td>
      <td style="padding: 5px 8px; font-family: monospace; font-size: 9px; color: #94a3b8; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
        ${n(r)}
      </td>
      <td style="padding: 5px 8px; font-size: 10px; color: #64748b;">
        ${e.message ? n(e.message.slice(0, 50)) : ""}
      </td>
    </tr>
  `;
}
function ht(e, t = 20) {
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
            ${r.map((s) => mt(s)).join("")}
          </tbody>
        </table>
      </div>
    </details>
  `;
}
function yt(e) {
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
        ">${n(k(e))}</pre>
      </div>
    </details>
  `;
}
function J(e, t, o = {}) {
  const { maxOperations: r = 20, maxKeys: s = 20, maxErrors: i = 10, showRawJSON: l = !1 } = o;
  return e ? e.configured ? `
    <div style="padding: 14px;">
      ${F(e)}
      ${dt(e.startup_error)}
      ${it(e.counters)}
      ${lt(e.last_command)}
      ${pt(e.recent_errors, i)}
      ${bt(e.latest_cached)}
      ${ut(e.config)}
      ${gt(e.capabilities)}
      ${xt(e.observed_keys, s)}
      ${ht(e.recent_operations, r)}
      ${l ? yt(e) : ""}
    </div>
  ` : `
      <div style="padding: 12px;">
        ${F(e)}
        <div style="
          text-align: center;
          padding: 32px 16px;
          color: #64748b;
        ">
          <div style="margin-bottom: 10px;">${y("circle", {
    size: 24,
    color: "#64748b"
  })}</div>
          <div style="font-size: 14px; font-weight: 500; margin-bottom: 6px; color: #94a3b8;">Cache Not Configured</div>
          <div style="font-size: 12px;">Enable site render cache in application configuration.</div>
        </div>
      </div>
    ` : `<div class="${t.emptyState}">No site render cache data available</div>`;
}
function vt(e, t) {
  if (!e) return `<div class="${t.emptyState}">No cache data</div>`;
  let o = e.status;
  e.configured && e.active || (o = "inactive");
  const r = W(o), s = e.counters || {}, i = s.hits || 0, l = s.misses || 0, d = s.errors || 0;
  let c = "N/A";
  const a = s.lookups || 0;
  a > 0 && (c = `${((s.hit_ratio !== null && s.hit_ratio !== void 0 ? s.hit_ratio : i / a) * 100).toFixed(1)}%`);
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
          <span style="font-size: 11px; font-weight: 600; color: ${r.color};">${n(r.label)}</span>
        </span>
        <span style="
          padding: 3px 6px;
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 4px;
          font-size: 10px;
          font-family: monospace;
          color: #e2e8f0;
        ">${n(e.backend || "none")}</span>
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
        <span>Hit Rate: <strong style="color: ${a > 0 ? "#22c55e" : "#64748b"};">${c}</strong></span>
        <span>Hits: <strong style="color: #22c55e;">${b(i)}</strong></span>
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
          >${y("refresh", {
    size: 12,
    color: "#fff"
  })} Clear</button>
        </div>
      ` : ""}
    </div>
  `;
}
var $t = {
  id: "requests",
  label: "Requests",
  icon: "iconoir-network",
  snapshotKey: "requests",
  eventTypes: "request",
  category: "core",
  order: 10,
  render: (e, t, o) => T(e || [], t, {
    ...o,
    showSortToggle: !1,
    truncatePath: !1
  }),
  renderConsole: (e, t, o) => T(e || [], t, {
    ...o,
    showSortToggle: !1,
    truncatePath: !1
  }),
  renderToolbar: (e, t, o) => T(e || [], t, {
    ...o,
    maxEntries: 50,
    showSortToggle: !0,
    truncatePath: !0,
    maxPathLength: 50
  }),
  getCount: (e) => (e || []).length,
  handleEvent: (e, t) => C(e || [], t, 500),
  supportsToolbar: !0
}, wt = {
  id: "sql",
  label: "SQL",
  icon: "iconoir-database",
  snapshotKey: "sql",
  eventTypes: "sql",
  category: "core",
  order: 20,
  render: (e, t, o) => _(e || [], t, {
    ...o,
    showSortToggle: !1,
    useIconCopyButton: !0
  }),
  renderConsole: (e, t, o) => _(e || [], t, {
    ...o,
    maxEntries: 200,
    showSortToggle: !1,
    useIconCopyButton: !0
  }),
  renderToolbar: (e, t, o) => _(e || [], t, {
    ...o,
    maxEntries: 50,
    showSortToggle: !0,
    useIconCopyButton: !1
  }),
  getCount: (e) => (e || []).length,
  handleEvent: (e, t) => C(e || [], t, 500),
  supportsToolbar: !0
}, kt = {
  id: "logs",
  label: "Logs",
  icon: "iconoir-page",
  snapshotKey: "logs",
  eventTypes: "log",
  category: "core",
  order: 30,
  render: (e, t, o) => z(e || [], t, {
    ...o,
    showSortToggle: !1,
    showSource: !0,
    truncateMessage: !1
  }),
  renderConsole: (e, t, o) => z(e || [], t, {
    ...o,
    maxEntries: 500,
    showSortToggle: !1,
    showSource: !0,
    truncateMessage: !1
  }),
  renderToolbar: (e, t, o) => z(e || [], t, {
    newestFirst: !0,
    maxEntries: 100,
    showSortToggle: !1,
    showSource: !1,
    truncateMessage: !0,
    maxMessageLength: 100
  }),
  getCount: (e) => (e || []).length,
  handleEvent: (e, t) => C(e || [], t, 1e3),
  supportsToolbar: !0
}, Ct = {
  id: "routes",
  label: "Routes",
  icon: "iconoir-path-arrow",
  snapshotKey: "routes",
  eventTypes: [],
  category: "system",
  order: 40,
  render: (e, t) => R(e || [], t, { showName: !0 }),
  renderConsole: (e, t) => R(e || [], t, { showName: !0 }),
  renderToolbar: (e, t) => R(e || [], t, { showName: !1 }),
  getCount: (e) => (e || []).length,
  supportsToolbar: !0
}, St = {
  id: "config",
  label: "Config",
  icon: "iconoir-settings",
  snapshotKey: "config",
  eventTypes: [],
  category: "system",
  order: 50,
  render: (e, t, o) => h("Config", e, t, {
    useIconCopyButton: !0,
    showCount: !0
  }),
  renderConsole: (e, t, o) => {
    const r = o?.filterFn;
    return h("Config", e, t, {
      useIconCopyButton: !0,
      showCount: !0,
      filterFn: r
    });
  },
  renderToolbar: (e, t) => h("Config", e, t, {
    useIconCopyButton: !1,
    showCount: !1
  }),
  getCount: (e) => e && typeof e == "object" ? Object.keys(e).length : 0,
  supportsToolbar: !0
}, Tt = {
  id: "template",
  label: "Template",
  icon: "iconoir-code",
  snapshotKey: "template",
  eventTypes: "template",
  category: "data",
  order: 10,
  render: (e, t, o) => h("Template Context", e, t, {
    useIconCopyButton: !0,
    showCount: !0
  }),
  renderConsole: (e, t, o) => {
    const r = o?.filterFn;
    return h("Template Context", e, t, {
      useIconCopyButton: !0,
      showCount: !0,
      filterFn: r
    });
  },
  renderToolbar: (e, t) => h("Template Context", e, t, {
    useIconCopyButton: !1,
    showCount: !1
  }),
  getCount: (e) => e && typeof e == "object" ? Object.keys(e).length : 0,
  handleEvent: (e, t) => t,
  supportsToolbar: !0
}, _t = {
  id: "session",
  label: "Session",
  icon: "iconoir-user",
  snapshotKey: "session",
  eventTypes: "session",
  category: "data",
  order: 20,
  render: (e, t, o) => h("Session", e, t, {
    useIconCopyButton: !0,
    showCount: !0
  }),
  renderConsole: (e, t, o) => {
    const r = o?.filterFn;
    return h("Session", e, t, {
      useIconCopyButton: !0,
      showCount: !0,
      filterFn: r
    });
  },
  renderToolbar: (e, t) => h("Session", e, t, {
    useIconCopyButton: !1,
    showCount: !1
  }),
  getCount: (e) => e && typeof e == "object" ? Object.keys(e).length : 0,
  handleEvent: (e, t) => t,
  supportsToolbar: !0
}, zt = {
  id: "custom",
  label: "Custom",
  icon: "iconoir-puzzle",
  snapshotKey: "custom",
  eventTypes: "custom",
  category: "data",
  order: 30,
  render: (e, t, o) => q(e || {}, t, {
    useIconCopyButton: !0,
    showCount: !0
  }),
  renderConsole: (e, t, o) => {
    const r = e || {}, s = o?.dataFilterFn;
    return q(r, t, {
      maxLogEntries: 100,
      useIconCopyButton: !0,
      showCount: !0,
      dataFilterFn: s
    });
  },
  renderToolbar: (e, t) => q(e || {}, t, {
    maxLogEntries: 50,
    useIconCopyButton: !1,
    showCount: !1
  }),
  getCount: (e) => {
    const t = e || {};
    return (t.data ? Object.keys(t.data).length : 0) + (t.logs?.length || 0);
  },
  handleEvent: (e, t) => re(e, t, 500),
  supportsToolbar: !0
}, Rt = {
  id: "jserrors",
  label: "JS Errors",
  icon: "iconoir-warning-triangle",
  snapshotKey: "jserrors",
  eventTypes: "jserror",
  category: "core",
  order: 35,
  render: (e, t, o) => E(e || [], t, {
    ...o,
    compact: !1,
    showSortToggle: !1
  }),
  renderConsole: (e, t, o) => E(e || [], t, {
    ...o,
    maxEntries: 500,
    compact: !1,
    showSortToggle: !1
  }),
  renderToolbar: (e, t, o) => E(e || [], t, {
    ...o,
    maxEntries: 50,
    compact: !0,
    showSortToggle: !0
  }),
  getCount: (e) => (e || []).length,
  handleEvent: (e, t) => C(e || [], t, 500),
  supportsToolbar: !0
}, qt = {
  id: "permissions",
  label: "Permissions",
  icon: "iconoir-shield-check",
  snapshotKey: "permissions",
  eventTypes: [],
  category: "system",
  order: 45,
  showFilters: !1,
  render: (e, t, o) => A(e, t, { showRawJSON: !0 }),
  renderConsole: (e, t, o) => A(e, t, { showRawJSON: !0 }),
  renderToolbar: (e, t, o) => Je(e, t),
  getCount: (e) => {
    const t = e;
    return !t || !t.summary ? 0 : t.summary.missing_keys;
  },
  supportsToolbar: !0
}, Et = {
  id: "doctor",
  label: "Doctor",
  icon: "iconoir-heartbeat",
  snapshotKey: "doctor",
  eventTypes: [],
  category: "system",
  order: 46,
  showFilters: !1,
  render: (e, t, o) => H(e, t, { showRawJSON: !0 }),
  renderConsole: (e, t, o) => H(e, t, { showRawJSON: !0 }),
  getCount: (e) => {
    const t = e;
    return !t || !t.summary ? 0 : (t.summary.error || 0) + (t.summary.warn || 0);
  },
  supportsToolbar: !1
}, Lt = {
  id: "site-render-cache",
  label: "Site Cache",
  icon: "iconoir-database",
  snapshotKey: "site-render-cache",
  eventTypes: [],
  category: "site",
  order: 80,
  showFilters: !1,
  render: (e, t) => J(e, t, { showRawJSON: !1 }),
  renderConsole: (e, t) => J(e, t, {
    showRawJSON: !0,
    maxOperations: 50,
    maxKeys: 50,
    maxErrors: 20
  }),
  renderToolbar: (e, t) => vt(e, t),
  getCount: (e) => {
    const t = e;
    return !t || !t.counters ? 0 : t.counters.errors || 0;
  },
  supportsToolbar: !0
};
function Nt() {
  f.register($t), f.register(wt), f.register(kt), f.register(Rt), f.register(Ct), f.register(qt), f.register(Et), f.register(Lt), f.register(St), f.register(Tt), f.register(_t), f.register(zt);
}
Nt();
export {
  Ft as _,
  R as a,
  be as b,
  T as c,
  me as d,
  At as f,
  Kt as g,
  It as h,
  q as i,
  xe as l,
  Bt as m,
  vt as n,
  z as o,
  Ht as p,
  E as r,
  _ as s,
  J as t,
  Jt as u,
  Dt as v,
  Ot as x,
  V as y
};

//# sourceMappingURL=builtin-panels-Dqn1xdGs.js.map