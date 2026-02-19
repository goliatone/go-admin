const Le = (E) => {
  const T = (E || "").trim();
  return T ? T.startsWith("/") ? T.replace(/\/+$/, "") : `/${T.replace(/\/+$/, "")}` : "";
}, oe = (E) => {
  const T = window.location.protocol === "https:" ? "wss:" : "ws:", e = Le(E);
  return `${T}//${window.location.host}${e}/ws`;
}, ie = (E, T, e) => {
  const R = E.trim();
  if (!R || !T || !e)
    return E;
  const [t, O] = R.split("#"), s = t.includes("?") ? "&" : "?", N = `${t}${s}${encodeURIComponent(T)}=${encodeURIComponent(e)}`;
  return O ? `${N}#${O}` : N;
}, _e = (E) => {
  if (!E)
    return null;
  const T = E.replace(/-/g, "+").replace(/_/g, "/"), e = T.padEnd(T.length + (4 - (T.length % 4 || 4)) % 4, "=");
  try {
    if (typeof globalThis.atob == "function")
      return globalThis.atob(e);
  } catch {
    return null;
  }
  return null;
}, De = (E) => {
  if (!E)
    return null;
  const T = E.split(".");
  if (T.length < 2)
    return null;
  const e = _e(T[1]);
  if (!e)
    return null;
  try {
    const R = JSON.parse(e);
    if (typeof R.exp == "number")
      return R.exp * 1e3;
  } catch {
    return null;
  }
  return null;
}, Pe = (E, T) => {
  if (T) {
    if (typeof T.expiresInMs == "number" && T.expiresInMs > 0)
      return Date.now() + T.expiresInMs;
    const e = T.expiresAt ?? T.expires_at;
    if (typeof e == "number")
      return e;
    if (typeof e == "string") {
      const R = new Date(e);
      if (!Number.isNaN(R.getTime()))
        return R.getTime();
    }
  }
  return De(E);
};
class le {
  constructor(T) {
    this.ws = null, this.reconnectTimer = null, this.reconnectAttempts = 0, this.manualClose = !1, this.pendingCommands = [], this.status = "disconnected", this.options = T;
  }
  getWebSocketURL() {
    return this.options.url ? this.options.url : oe(this.options.basePath || "");
  }
  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING))
      return;
    this.manualClose = !1;
    const T = this.getWebSocketURL();
    if (!T) {
      this.setStatus("error");
      return;
    }
    this.ws = new WebSocket(T), this.ws.onopen = () => {
      this.reconnectAttempts = 0, this.setStatus("connected"), this.flushPending();
    }, this.ws.onmessage = (e) => {
      if (!(!e || typeof e.data != "string"))
        try {
          const R = JSON.parse(e.data);
          this.options.onEvent?.(R);
        } catch {
        }
    }, this.ws.onclose = () => {
      if (this.ws = null, this.manualClose) {
        this.setStatus("disconnected");
        return;
      }
      this.setStatus("reconnecting"), this.scheduleReconnect();
    }, this.ws.onerror = (e) => {
      this.options.onError?.(e), this.setStatus("error");
    };
  }
  close() {
    this.manualClose = !0, this.reconnectTimer !== null && (window.clearTimeout(this.reconnectTimer), this.reconnectTimer = null), this.ws && this.ws.close();
  }
  sendCommand(T) {
    if (!(!T || !T.type)) {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(T));
        return;
      }
      this.pendingCommands.push(T);
    }
  }
  subscribe(T) {
    this.sendCommand({ type: "subscribe", panels: T });
  }
  unsubscribe(T) {
    this.sendCommand({ type: "unsubscribe", panels: T });
  }
  requestSnapshot() {
    this.sendCommand({ type: "snapshot" });
  }
  clear(T) {
    this.sendCommand({ type: "clear", panels: T });
  }
  getStatus() {
    return this.status;
  }
  setStatus(T) {
    this.status !== T && (this.status = T, this.options.onStatusChange?.(T));
  }
  flushPending() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || this.pendingCommands.length === 0)
      return;
    const T = [...this.pendingCommands];
    this.pendingCommands = [];
    for (const e of T)
      this.ws.send(JSON.stringify(e));
  }
  scheduleReconnect() {
    const T = this.options.maxReconnectAttempts ?? 8, e = this.options.reconnectDelayMs ?? 1e3, R = this.options.maxReconnectDelayMs ?? 12e3;
    if (this.reconnectAttempts >= T) {
      this.setStatus("disconnected");
      return;
    }
    const t = this.reconnectAttempts, O = Math.min(e * Math.pow(2, t), R), s = O * (0.2 + Math.random() * 0.3);
    this.reconnectAttempts += 1, this.reconnectTimer = window.setTimeout(() => {
      this.connect();
    }, O + s);
  }
}
class uO extends le {
  constructor(T) {
    const {
      url: e,
      authToken: R,
      tokenProvider: t,
      tokenRefreshBufferMs: O,
      tokenParam: s,
      appId: N,
      onEvent: o,
      ...A
    } = T, I = (L) => {
      if (N && L && !L.app_id) {
        o?.({ ...L, app_id: N });
        return;
      }
      o?.(L);
    };
    super({
      ...A,
      url: e,
      onEvent: I
    }), this.authToken = null, this.tokenRefreshTimer = null, this.tokenExpiresAt = null, this.baseUrl = e, this.tokenProvider = t, this.tokenRefreshBufferMs = O ?? 3e4, this.tokenParam = s || "token", R && this.setToken(R);
  }
  getWebSocketURL() {
    return this.authToken ? ie(this.baseUrl, this.tokenParam, this.authToken) : this.baseUrl;
  }
  connect() {
    this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) || this.ensureToken().then((T) => {
      T && super.connect();
    });
  }
  close() {
    this.clearTokenRefresh(), super.close();
  }
  clearTokenRefresh() {
    this.tokenRefreshTimer !== null && (clearTimeout(this.tokenRefreshTimer), this.tokenRefreshTimer = null);
  }
  scheduleTokenRefresh() {
    if (!this.tokenExpiresAt || !this.tokenProvider)
      return;
    const T = Math.max(this.tokenExpiresAt - Date.now() - this.tokenRefreshBufferMs, 0);
    this.clearTokenRefresh(), this.tokenRefreshTimer = setTimeout(() => {
      this.refreshToken();
    }, T);
  }
  setToken(T, e) {
    this.authToken = T, this.tokenExpiresAt = Pe(T, e), this.scheduleTokenRefresh();
  }
  tokenNeedsRefresh() {
    return this.tokenExpiresAt ? Date.now() + this.tokenRefreshBufferMs >= this.tokenExpiresAt : !1;
  }
  async ensureToken() {
    return this.tokenProvider ? this.authToken && !this.tokenNeedsRefresh() ? !0 : this.refreshToken() : this.authToken != null;
  }
  async refreshToken() {
    if (!this.tokenProvider)
      return this.authToken != null;
    try {
      const T = await this.tokenProvider();
      return !T || !T.token ? (this.setStatus("error"), !1) : (this.setToken(T.token, T), this.reconnectAttempts = 0, this.ws && this.ws.readyState === WebSocket.OPEN && this.ws.close(), !0);
    } catch {
      return this.setStatus("error"), !1;
    }
  }
}
var ZE = typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : typeof self < "u" ? self : {};
function vT(E) {
  return E && E.__esModule && Object.prototype.hasOwnProperty.call(E, "default") ? E.default : E;
}
const D = (E) => String(E ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;"), RE = (E) => {
  if (!E)
    return "";
  if (typeof E == "number")
    return new Date(E).toLocaleTimeString();
  if (typeof E == "string") {
    const T = new Date(E);
    return Number.isNaN(T.getTime()) ? E : T.toLocaleTimeString();
  }
  return "";
}, zE = (E, T = 50) => {
  if (E == null)
    return { text: "0ms", isSlow: !1 };
  if (typeof E == "string") {
    const O = $T(E), s = O !== null && O >= T;
    return { text: E, isSlow: s };
  }
  const e = Number(E);
  if (Number.isNaN(e))
    return { text: "0ms", isSlow: !1 };
  const R = e / 1e6, t = R >= T;
  return R < 1 ? { text: `${(e / 1e3).toFixed(1)}µs`, isSlow: t } : R < 1e3 ? { text: `${R.toFixed(2)}ms`, isSlow: t } : { text: `${(R / 1e3).toFixed(2)}s`, isSlow: t };
}, dO = (E, T = 50) => {
  const e = Me(E);
  return e === null ? !1 : e >= T;
}, AE = (E, T) => {
  const { nullAsEmptyObject: e = !0, indent: R = 2 } = T || {};
  if (E == null)
    return e ? "{}" : "null";
  try {
    return JSON.stringify(E, null, R);
  } catch {
    return String(E ?? "");
  }
}, nE = (E, T) => E ? E.length > T ? E.substring(0, T) + "..." : E : "", $T = (E) => {
  const T = E.trim();
  if (!T)
    return null;
  const e = T.match(/^([0-9]*\.?[0-9]+)\s*(ns|µs|us|ms|s)?$/i);
  if (!e)
    return null;
  const R = Number(e[1]);
  if (Number.isNaN(R))
    return null;
  switch ((e[2] || "ms").toLowerCase()) {
    case "ns":
      return R / 1e6;
    case "us":
    case "µs":
      return R / 1e3;
    case "ms":
      return R;
    case "s":
      return R * 1e3;
    default:
      return null;
  }
}, Me = (E) => {
  if (E == null)
    return null;
  if (typeof E == "string")
    return $T(E);
  const T = Number(E);
  return Number.isNaN(T) ? null : T / 1e6;
}, LE = (E) => {
  if (E == null || E === "")
    return "0";
  const T = Number(E);
  return Number.isNaN(T) ? String(E) : T.toLocaleString();
}, KT = (E) => E == null ? 0 : Array.isArray(E) ? E.length : typeof E == "object" ? Object.keys(E).length : 1, Ue = (E) => E ? E >= 500 ? "error" : E >= 400 ? "warn" : "" : "", wT = (E) => {
  if (!E)
    return "info";
  const T = E.toLowerCase();
  return T === "error" || T === "fatal" ? "error" : T === "warn" || T === "warning" ? "warn" : T === "debug" || T === "trace" ? "debug" : "info";
}, IT = (E) => {
  if (E === void 0 || E === 0) return "0 B";
  const T = ["B", "KB", "MB"], e = Math.min(Math.floor(Math.log(E) / Math.log(1024)), T.length - 1), R = E / Math.pow(1024, e);
  return `${e === 0 ? R : R.toFixed(1)} ${T[e]}`;
}, pO = (E) => Array.isArray(E) ? E : [];
async function JT(E, T, e = {}) {
  const {
    feedbackDuration: R = 1500,
    useIconFeedback: t = !1,
    successClass: O = t ? "debug-copy--success" : "copied",
    errorClass: s = "debug-copy--error"
  } = e;
  try {
    await navigator.clipboard.writeText(E);
    const N = T.innerHTML;
    return T.classList.add(O), t ? T.innerHTML = '<i class="iconoir-check"></i> Copied' : T.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        Copied
      `, setTimeout(() => {
      T.innerHTML = N, T.classList.remove(O);
    }, R), !0;
  } catch {
    return T.classList.add(s), setTimeout(() => {
      T.classList.remove(s);
    }, R), !1;
  }
}
function GO(E, T = {}) {
  E.querySelectorAll("[data-copy-trigger]").forEach((e) => {
    e.addEventListener("click", async (R) => {
      R.preventDefault(), R.stopPropagation();
      const t = e.closest("[data-copy-content]");
      if (!t) return;
      const O = t.getAttribute("data-copy-content") || "";
      await JT(O, e, T);
    });
  });
}
function HO(E) {
  E.querySelectorAll(".expandable-row").forEach((T) => {
    T.addEventListener("click", (e) => {
      if (e.target.closest("a, button, input")) return;
      e.currentTarget.classList.toggle("expanded");
    });
  });
}
function BO(E, T) {
  E.querySelectorAll("[data-sort-toggle]").forEach((e) => {
    e.addEventListener("change", (R) => {
      const t = R.target, O = t.dataset.sortToggle;
      O && T(O, t.checked);
    });
  });
}
const mO = {
  /** Attribute for the copy button trigger */
  COPY_TRIGGER: "data-copy-trigger",
  /** Attribute for the container holding the content to copy */
  COPY_CONTENT: "data-copy-content",
  /** Attribute for row ID (used in SQL expandable rows) */
  ROW_ID: "data-row-id",
  /** Attribute linking expansion row to its parent row */
  EXPANSION_FOR: "data-expansion-for",
  /** Attribute for sort toggle checkbox */
  SORT_TOGGLE: "data-sort-toggle"
}, FO = {
  /** Class for rows that can be expanded */
  EXPANDABLE_ROW: "expandable-row",
  /** Class added when a row is expanded */
  EXPANDED: "expanded",
  /** Class for the hidden expansion row */
  EXPANSION_ROW: "expansion-row",
  /** Class for slow query rows */
  SLOW_QUERY: "slow-query",
  /** Class for error query rows */
  ERROR_QUERY: "error-query",
  /** Class for expand/collapse icon */
  EXPAND_ICON: "expand-icon"
};
function OT(E, T) {
  return [...T].sort((e, R) => e - R).map((e) => E[e]).filter(Boolean).map((e) => {
    let t = `-- Duration: ${zE(e.duration).text} | Rows: ${e.row_count ?? 0}`;
    return e.error && (t += ` | Error: ${e.error}`), e.timestamp && (t += ` | Time: ${e.timestamp}`), `${t}
${e.query || ""};`;
  }).join(`

`);
}
function ce(E, T, e = "text/sql") {
  const R = new Blob([E], { type: e }), t = URL.createObjectURL(R), O = document.createElement("a");
  O.href = t, O.download = T, O.click(), URL.revokeObjectURL(t);
}
function hO(E, T, e = {}) {
  const R = /* @__PURE__ */ new Set(), t = E.querySelector("[data-sql-toolbar]"), O = E.querySelector("[data-sql-selected-count]"), s = E.querySelector(".sql-select-all"), N = E.querySelectorAll(".sql-select-row");
  if (!t || N.length === 0) return;
  function o() {
    if (!t) return;
    const A = R.size;
    t.dataset.visible = A > 0 ? "true" : "false", O && (O.textContent = `${A} selected`), s && (s.checked = A > 0 && A === N.length, s.indeterminate = A > 0 && A < N.length);
  }
  N.forEach((A) => {
    A.addEventListener("click", (I) => {
      I.stopPropagation();
    }), A.addEventListener("change", () => {
      const I = parseInt(A.dataset.sqlIndex || "", 10);
      Number.isNaN(I) || (A.checked ? R.add(I) : R.delete(I), o());
    });
  }), s && (s.addEventListener("click", (A) => {
    A.stopPropagation();
  }), s.addEventListener("change", () => {
    N.forEach((A) => {
      A.checked = s.checked;
      const I = parseInt(A.dataset.sqlIndex || "", 10);
      Number.isNaN(I) || (s.checked ? R.add(I) : R.delete(I));
    }), o();
  })), E.querySelector('[data-sql-export="clipboard"]')?.addEventListener("click", async (A) => {
    if (A.preventDefault(), R.size === 0) return;
    const I = OT(T, R), L = A.currentTarget;
    await JT(I, L, e);
  }), E.querySelector('[data-sql-export="download"]')?.addEventListener("click", (A) => {
    if (A.preventDefault(), R.size === 0) return;
    const I = OT(T, R), L = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-").slice(0, 19);
    ce(I, `sql-queries-${L}.sql`);
  }), E.querySelector("[data-sql-clear-selection]")?.addEventListener("click", (A) => {
    A.preventDefault(), R.clear(), N.forEach((I) => {
      I.checked = !1;
    }), o();
  });
}
function YO(E, T) {
  E.querySelectorAll("[data-request-table]").forEach((e) => {
    e.addEventListener("click", (R) => {
      const t = R.target;
      if (t.closest("button, a, input, [data-detail-for]")) return;
      const O = t.closest("[data-request-id]");
      if (!O) return;
      const s = O.dataset.requestId;
      if (!s) return;
      const N = O.nextElementSibling;
      if (!N || !N.hasAttribute("data-detail-for") || N.dataset.detailFor !== s)
        return;
      const o = N.querySelector("[data-request-detail-template]");
      if (o) {
        const I = N.querySelector("td");
        I && (I.appendChild(o.content.cloneNode(!0)), o.remove());
      }
      const A = O.querySelector("[data-expand-icon]");
      T.has(s) ? (T.delete(s), N.style.display = "none", A && (A.textContent = "▶")) : (T.add(s), N.style.display = "table-row", A && (A.textContent = "▼"));
    });
  });
}
const ue = {
  // Table styling
  table: "debug-table",
  tableRoutes: "debug-table debug-routes-table",
  // Badge styling
  badge: "badge",
  badgeMethod: (E) => `badge badge--method-${E.toLowerCase()}`,
  badgeStatus: (E) => E >= 500 ? "badge badge--status-error" : E >= 400 ? "badge badge--status-warn" : "badge badge--status",
  badgeLevel: (E) => `badge badge--level-${E.toLowerCase()}`,
  badgeError: "badge badge--status-error",
  badgeCustom: "badge badge--custom",
  // Duration styling
  duration: "duration",
  durationSlow: "duration--slow",
  // Cell content styling
  timestamp: "timestamp",
  path: "path",
  message: "message",
  queryText: "query-text",
  // Row styling
  rowError: "error",
  rowSlow: "slow",
  expandableRow: "expandable-row",
  expansionRow: "expansion-row",
  slowQuery: "slow",
  errorQuery: "error",
  // Expand icon
  expandIcon: "expand-icon",
  // Empty state
  emptyState: "debug-empty",
  // JSON viewer
  jsonViewer: "debug-json-panel",
  jsonViewerHeader: "debug-json-header",
  jsonViewerTitle: "",
  jsonGrid: "debug-json-grid",
  jsonPanel: "debug-json-panel",
  jsonHeader: "debug-json-header",
  jsonActions: "debug-json-actions",
  jsonContent: "debug-json-content",
  // Copy button
  copyBtn: "debug-btn debug-copy",
  copyBtnSm: "debug-btn debug-copy debug-copy--sm",
  // Panel controls
  panelControls: "debug-filter",
  sortToggle: "debug-btn",
  // Expanded content
  expandedContent: "expanded-content",
  expandedContentHeader: "expanded-content__header",
  // Muted text
  muted: "debug-muted",
  // SQL selection
  selectCell: "debug-sql-select",
  sqlToolbar: "debug-sql-toolbar",
  sqlToolbarBtn: "debug-btn",
  // Request detail
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
}, de = {
  // Table styling
  table: "",
  tableRoutes: "",
  // Badge styling
  badge: "badge",
  badgeMethod: (E) => `badge badge-method ${E.toLowerCase()}`,
  badgeStatus: (E) => {
    const T = Ue(E);
    return T ? `badge badge-status ${T}` : "badge badge-status";
  },
  badgeLevel: (E) => `badge badge-level ${wT(E)}`,
  badgeError: "badge badge-status error",
  badgeCustom: "badge",
  // Duration styling
  duration: "duration",
  durationSlow: "slow",
  // Cell content styling
  timestamp: "timestamp",
  path: "path",
  message: "message",
  queryText: "query-text",
  // Row styling
  rowError: "",
  rowSlow: "",
  expandableRow: "expandable-row",
  expansionRow: "expansion-row",
  slowQuery: "slow-query",
  errorQuery: "error-query",
  // Expand icon
  expandIcon: "expand-icon",
  // Empty state
  emptyState: "empty-state",
  // JSON viewer
  jsonViewer: "json-viewer",
  jsonViewerHeader: "json-viewer__header",
  jsonViewerTitle: "json-viewer__title",
  jsonGrid: "",
  jsonPanel: "json-viewer",
  jsonHeader: "json-viewer__header",
  jsonActions: "",
  jsonContent: "",
  // Copy button
  copyBtn: "copy-btn",
  copyBtnSm: "copy-btn",
  // Panel controls
  panelControls: "panel-controls",
  sortToggle: "sort-toggle",
  // Expanded content
  expandedContent: "expanded-content",
  expandedContentHeader: "expanded-content__header",
  // Muted text
  muted: "timestamp",
  // SQL selection
  selectCell: "sql-select",
  sqlToolbar: "sql-toolbar",
  sqlToolbarBtn: "copy-btn",
  // Request detail
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
function fO(E) {
  return E === "console" ? ue : de;
}
var kT = { exports: {} };
(function(E) {
  var T = typeof window < "u" ? window : typeof WorkerGlobalScope < "u" && self instanceof WorkerGlobalScope ? self : {};
  /**
   * Prism: Lightweight, robust, elegant syntax highlighting
   *
   * @license MIT <https://opensource.org/licenses/MIT>
   * @author Lea Verou <https://lea.verou.me>
   * @namespace
   * @public
   */
  var e = function(R) {
    var t = /(?:^|\s)lang(?:uage)?-([\w-]+)(?=\s|$)/i, O = 0, s = {}, N = {
      /**
       * By default, Prism will attempt to highlight all code elements (by calling {@link Prism.highlightAll}) on the
       * current page after the page finished loading. This might be a problem if e.g. you wanted to asynchronously load
       * additional languages or plugins yourself.
       *
       * By setting this value to `true`, Prism will not automatically highlight all code elements on the page.
       *
       * You obviously have to change this value before the automatic highlighting started. To do this, you can add an
       * empty Prism object into the global scope before loading the Prism script like this:
       *
       * ```js
       * window.Prism = window.Prism || {};
       * Prism.manual = true;
       * // add a new <script> to load Prism's script
       * ```
       *
       * @default false
       * @type {boolean}
       * @memberof Prism
       * @public
       */
      manual: R.Prism && R.Prism.manual,
      /**
       * By default, if Prism is in a web worker, it assumes that it is in a worker it created itself, so it uses
       * `addEventListener` to communicate with its parent instance. However, if you're using Prism manually in your
       * own worker, you don't want it to do this.
       *
       * By setting this value to `true`, Prism will not add its own listeners to the worker.
       *
       * You obviously have to change this value before Prism executes. To do this, you can add an
       * empty Prism object into the global scope before loading the Prism script like this:
       *
       * ```js
       * window.Prism = window.Prism || {};
       * Prism.disableWorkerMessageHandler = true;
       * // Load Prism's script
       * ```
       *
       * @default false
       * @type {boolean}
       * @memberof Prism
       * @public
       */
      disableWorkerMessageHandler: R.Prism && R.Prism.disableWorkerMessageHandler,
      /**
       * A namespace for utility methods.
       *
       * All function in this namespace that are not explicitly marked as _public_ are for __internal use only__ and may
       * change or disappear at any time.
       *
       * @namespace
       * @memberof Prism
       */
      util: {
        encode: function r(n) {
          return n instanceof o ? new o(n.type, r(n.content), n.alias) : Array.isArray(n) ? n.map(r) : n.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\u00a0/g, " ");
        },
        /**
         * Returns the name of the type of the given value.
         *
         * @param {any} o
         * @returns {string}
         * @example
         * type(null)      === 'Null'
         * type(undefined) === 'Undefined'
         * type(123)       === 'Number'
         * type('foo')     === 'String'
         * type(true)      === 'Boolean'
         * type([1, 2])    === 'Array'
         * type({})        === 'Object'
         * type(String)    === 'Function'
         * type(/abc+/)    === 'RegExp'
         */
        type: function(r) {
          return Object.prototype.toString.call(r).slice(8, -1);
        },
        /**
         * Returns a unique number for the given object. Later calls will still return the same number.
         *
         * @param {Object} obj
         * @returns {number}
         */
        objId: function(r) {
          return r.__id || Object.defineProperty(r, "__id", { value: ++O }), r.__id;
        },
        /**
         * Creates a deep clone of the given object.
         *
         * The main intended use of this function is to clone language definitions.
         *
         * @param {T} o
         * @param {Record<number, any>} [visited]
         * @returns {T}
         * @template T
         */
        clone: function r(n, _) {
          _ = _ || {};
          var P, l;
          switch (N.util.type(n)) {
            case "Object":
              if (l = N.util.objId(n), _[l])
                return _[l];
              P = /** @type {Record<string, any>} */
              {}, _[l] = P;
              for (var U in n)
                n.hasOwnProperty(U) && (P[U] = r(n[U], _));
              return (
                /** @type {any} */
                P
              );
            case "Array":
              return l = N.util.objId(n), _[l] ? _[l] : (P = [], _[l] = P, /** @type {Array} */
              /** @type {any} */
              n.forEach(function(m, d) {
                P[d] = r(m, _);
              }), /** @type {any} */
              P);
            default:
              return n;
          }
        },
        /**
         * Returns the Prism language of the given element set by a `language-xxxx` or `lang-xxxx` class.
         *
         * If no language is set for the element or the element is `null` or `undefined`, `none` will be returned.
         *
         * @param {Element} element
         * @returns {string}
         */
        getLanguage: function(r) {
          for (; r; ) {
            var n = t.exec(r.className);
            if (n)
              return n[1].toLowerCase();
            r = r.parentElement;
          }
          return "none";
        },
        /**
         * Sets the Prism `language-xxxx` class of the given element.
         *
         * @param {Element} element
         * @param {string} language
         * @returns {void}
         */
        setLanguage: function(r, n) {
          r.className = r.className.replace(RegExp(t, "gi"), ""), r.classList.add("language-" + n);
        },
        /**
         * Returns the script element that is currently executing.
         *
         * This does __not__ work for line script element.
         *
         * @returns {HTMLScriptElement | null}
         */
        currentScript: function() {
          if (typeof document > "u")
            return null;
          if (document.currentScript && document.currentScript.tagName === "SCRIPT")
            return (
              /** @type {any} */
              document.currentScript
            );
          try {
            throw new Error();
          } catch (P) {
            var r = (/at [^(\r\n]*\((.*):[^:]+:[^:]+\)$/i.exec(P.stack) || [])[1];
            if (r) {
              var n = document.getElementsByTagName("script");
              for (var _ in n)
                if (n[_].src == r)
                  return n[_];
            }
            return null;
          }
        },
        /**
         * Returns whether a given class is active for `element`.
         *
         * The class can be activated if `element` or one of its ancestors has the given class and it can be deactivated
         * if `element` or one of its ancestors has the negated version of the given class. The _negated version_ of the
         * given class is just the given class with a `no-` prefix.
         *
         * Whether the class is active is determined by the closest ancestor of `element` (where `element` itself is
         * closest ancestor) that has the given class or the negated version of it. If neither `element` nor any of its
         * ancestors have the given class or the negated version of it, then the default activation will be returned.
         *
         * In the paradoxical situation where the closest ancestor contains __both__ the given class and the negated
         * version of it, the class is considered active.
         *
         * @param {Element} element
         * @param {string} className
         * @param {boolean} [defaultActivation=false]
         * @returns {boolean}
         */
        isActive: function(r, n, _) {
          for (var P = "no-" + n; r; ) {
            var l = r.classList;
            if (l.contains(n))
              return !0;
            if (l.contains(P))
              return !1;
            r = r.parentElement;
          }
          return !!_;
        }
      },
      /**
       * This namespace contains all currently loaded languages and the some helper functions to create and modify languages.
       *
       * @namespace
       * @memberof Prism
       * @public
       */
      languages: {
        /**
         * The grammar for plain, unformatted text.
         */
        plain: s,
        plaintext: s,
        text: s,
        txt: s,
        /**
         * Creates a deep copy of the language with the given id and appends the given tokens.
         *
         * If a token in `redef` also appears in the copied language, then the existing token in the copied language
         * will be overwritten at its original position.
         *
         * ## Best practices
         *
         * Since the position of overwriting tokens (token in `redef` that overwrite tokens in the copied language)
         * doesn't matter, they can technically be in any order. However, this can be confusing to others that trying to
         * understand the language definition because, normally, the order of tokens matters in Prism grammars.
         *
         * Therefore, it is encouraged to order overwriting tokens according to the positions of the overwritten tokens.
         * Furthermore, all non-overwriting tokens should be placed after the overwriting ones.
         *
         * @param {string} id The id of the language to extend. This has to be a key in `Prism.languages`.
         * @param {Grammar} redef The new tokens to append.
         * @returns {Grammar} The new language created.
         * @public
         * @example
         * Prism.languages['css-with-colors'] = Prism.languages.extend('css', {
         *     // Prism.languages.css already has a 'comment' token, so this token will overwrite CSS' 'comment' token
         *     // at its original position
         *     'comment': { ... },
         *     // CSS doesn't have a 'color' token, so this token will be appended
         *     'color': /\b(?:red|green|blue)\b/
         * });
         */
        extend: function(r, n) {
          var _ = N.util.clone(N.languages[r]);
          for (var P in n)
            _[P] = n[P];
          return _;
        },
        /**
         * Inserts tokens _before_ another token in a language definition or any other grammar.
         *
         * ## Usage
         *
         * This helper method makes it easy to modify existing languages. For example, the CSS language definition
         * not only defines CSS highlighting for CSS documents, but also needs to define highlighting for CSS embedded
         * in HTML through `<style>` elements. To do this, it needs to modify `Prism.languages.markup` and add the
         * appropriate tokens. However, `Prism.languages.markup` is a regular JavaScript object literal, so if you do
         * this:
         *
         * ```js
         * Prism.languages.markup.style = {
         *     // token
         * };
         * ```
         *
         * then the `style` token will be added (and processed) at the end. `insertBefore` allows you to insert tokens
         * before existing tokens. For the CSS example above, you would use it like this:
         *
         * ```js
         * Prism.languages.insertBefore('markup', 'cdata', {
         *     'style': {
         *         // token
         *     }
         * });
         * ```
         *
         * ## Special cases
         *
         * If the grammars of `inside` and `insert` have tokens with the same name, the tokens in `inside`'s grammar
         * will be ignored.
         *
         * This behavior can be used to insert tokens after `before`:
         *
         * ```js
         * Prism.languages.insertBefore('markup', 'comment', {
         *     'comment': Prism.languages.markup.comment,
         *     // tokens after 'comment'
         * });
         * ```
         *
         * ## Limitations
         *
         * The main problem `insertBefore` has to solve is iteration order. Since ES2015, the iteration order for object
         * properties is guaranteed to be the insertion order (except for integer keys) but some browsers behave
         * differently when keys are deleted and re-inserted. So `insertBefore` can't be implemented by temporarily
         * deleting properties which is necessary to insert at arbitrary positions.
         *
         * To solve this problem, `insertBefore` doesn't actually insert the given tokens into the target object.
         * Instead, it will create a new object and replace all references to the target object with the new one. This
         * can be done without temporarily deleting properties, so the iteration order is well-defined.
         *
         * However, only references that can be reached from `Prism.languages` or `insert` will be replaced. I.e. if
         * you hold the target object in a variable, then the value of the variable will not change.
         *
         * ```js
         * var oldMarkup = Prism.languages.markup;
         * var newMarkup = Prism.languages.insertBefore('markup', 'comment', { ... });
         *
         * assert(oldMarkup !== Prism.languages.markup);
         * assert(newMarkup === Prism.languages.markup);
         * ```
         *
         * @param {string} inside The property of `root` (e.g. a language id in `Prism.languages`) that contains the
         * object to be modified.
         * @param {string} before The key to insert before.
         * @param {Grammar} insert An object containing the key-value pairs to be inserted.
         * @param {Object<string, any>} [root] The object containing `inside`, i.e. the object that contains the
         * object to be modified.
         *
         * Defaults to `Prism.languages`.
         * @returns {Grammar} The new grammar object.
         * @public
         */
        insertBefore: function(r, n, _, P) {
          P = P || /** @type {any} */
          N.languages;
          var l = P[r], U = {};
          for (var m in l)
            if (l.hasOwnProperty(m)) {
              if (m == n)
                for (var d in _)
                  _.hasOwnProperty(d) && (U[d] = _[d]);
              _.hasOwnProperty(m) || (U[m] = l[m]);
            }
          var F = P[r];
          return P[r] = U, N.languages.DFS(N.languages, function(g, $) {
            $ === F && g != r && (this[g] = U);
          }), U;
        },
        // Traverse a language definition with Depth First Search
        DFS: function r(n, _, P, l) {
          l = l || {};
          var U = N.util.objId;
          for (var m in n)
            if (n.hasOwnProperty(m)) {
              _.call(n, m, n[m], P || m);
              var d = n[m], F = N.util.type(d);
              F === "Object" && !l[U(d)] ? (l[U(d)] = !0, r(d, _, null, l)) : F === "Array" && !l[U(d)] && (l[U(d)] = !0, r(d, _, m, l));
            }
        }
      },
      plugins: {},
      /**
       * This is the most high-level function in Prism’s API.
       * It fetches all the elements that have a `.language-xxxx` class and then calls {@link Prism.highlightElement} on
       * each one of them.
       *
       * This is equivalent to `Prism.highlightAllUnder(document, async, callback)`.
       *
       * @param {boolean} [async=false] Same as in {@link Prism.highlightAllUnder}.
       * @param {HighlightCallback} [callback] Same as in {@link Prism.highlightAllUnder}.
       * @memberof Prism
       * @public
       */
      highlightAll: function(r, n) {
        N.highlightAllUnder(document, r, n);
      },
      /**
       * Fetches all the descendants of `container` that have a `.language-xxxx` class and then calls
       * {@link Prism.highlightElement} on each one of them.
       *
       * The following hooks will be run:
       * 1. `before-highlightall`
       * 2. `before-all-elements-highlight`
       * 3. All hooks of {@link Prism.highlightElement} for each element.
       *
       * @param {ParentNode} container The root element, whose descendants that have a `.language-xxxx` class will be highlighted.
       * @param {boolean} [async=false] Whether each element is to be highlighted asynchronously using Web Workers.
       * @param {HighlightCallback} [callback] An optional callback to be invoked on each element after its highlighting is done.
       * @memberof Prism
       * @public
       */
      highlightAllUnder: function(r, n, _) {
        var P = {
          callback: _,
          container: r,
          selector: 'code[class*="language-"], [class*="language-"] code, code[class*="lang-"], [class*="lang-"] code'
        };
        N.hooks.run("before-highlightall", P), P.elements = Array.prototype.slice.apply(P.container.querySelectorAll(P.selector)), N.hooks.run("before-all-elements-highlight", P);
        for (var l = 0, U; U = P.elements[l++]; )
          N.highlightElement(U, n === !0, P.callback);
      },
      /**
       * Highlights the code inside a single element.
       *
       * The following hooks will be run:
       * 1. `before-sanity-check`
       * 2. `before-highlight`
       * 3. All hooks of {@link Prism.highlight}. These hooks will be run by an asynchronous worker if `async` is `true`.
       * 4. `before-insert`
       * 5. `after-highlight`
       * 6. `complete`
       *
       * Some the above hooks will be skipped if the element doesn't contain any text or there is no grammar loaded for
       * the element's language.
       *
       * @param {Element} element The element containing the code.
       * It must have a class of `language-xxxx` to be processed, where `xxxx` is a valid language identifier.
       * @param {boolean} [async=false] Whether the element is to be highlighted asynchronously using Web Workers
       * to improve performance and avoid blocking the UI when highlighting very large chunks of code. This option is
       * [disabled by default](https://prismjs.com/faq.html#why-is-asynchronous-highlighting-disabled-by-default).
       *
       * Note: All language definitions required to highlight the code must be included in the main `prism.js` file for
       * asynchronous highlighting to work. You can build your own bundle on the
       * [Download page](https://prismjs.com/download.html).
       * @param {HighlightCallback} [callback] An optional callback to be invoked after the highlighting is done.
       * Mostly useful when `async` is `true`, since in that case, the highlighting is done asynchronously.
       * @memberof Prism
       * @public
       */
      highlightElement: function(r, n, _) {
        var P = N.util.getLanguage(r), l = N.languages[P];
        N.util.setLanguage(r, P);
        var U = r.parentElement;
        U && U.nodeName.toLowerCase() === "pre" && N.util.setLanguage(U, P);
        var m = r.textContent, d = {
          element: r,
          language: P,
          grammar: l,
          code: m
        };
        function F($) {
          d.highlightedCode = $, N.hooks.run("before-insert", d), d.element.innerHTML = d.highlightedCode, N.hooks.run("after-highlight", d), N.hooks.run("complete", d), _ && _.call(d.element);
        }
        if (N.hooks.run("before-sanity-check", d), U = d.element.parentElement, U && U.nodeName.toLowerCase() === "pre" && !U.hasAttribute("tabindex") && U.setAttribute("tabindex", "0"), !d.code) {
          N.hooks.run("complete", d), _ && _.call(d.element);
          return;
        }
        if (N.hooks.run("before-highlight", d), !d.grammar) {
          F(N.util.encode(d.code));
          return;
        }
        if (n && R.Worker) {
          var g = new Worker(N.filename);
          g.onmessage = function($) {
            F($.data);
          }, g.postMessage(JSON.stringify({
            language: d.language,
            code: d.code,
            immediateClose: !0
          }));
        } else
          F(N.highlight(d.code, d.grammar, d.language));
      },
      /**
       * Low-level function, only use if you know what you’re doing. It accepts a string of text as input
       * and the language definitions to use, and returns a string with the HTML produced.
       *
       * The following hooks will be run:
       * 1. `before-tokenize`
       * 2. `after-tokenize`
       * 3. `wrap`: On each {@link Token}.
       *
       * @param {string} text A string with the code to be highlighted.
       * @param {Grammar} grammar An object containing the tokens to use.
       *
       * Usually a language definition like `Prism.languages.markup`.
       * @param {string} language The name of the language definition passed to `grammar`.
       * @returns {string} The highlighted HTML.
       * @memberof Prism
       * @public
       * @example
       * Prism.highlight('var foo = true;', Prism.languages.javascript, 'javascript');
       */
      highlight: function(r, n, _) {
        var P = {
          code: r,
          grammar: n,
          language: _
        };
        if (N.hooks.run("before-tokenize", P), !P.grammar)
          throw new Error('The language "' + P.language + '" has no grammar.');
        return P.tokens = N.tokenize(P.code, P.grammar), N.hooks.run("after-tokenize", P), o.stringify(N.util.encode(P.tokens), P.language);
      },
      /**
       * This is the heart of Prism, and the most low-level function you can use. It accepts a string of text as input
       * and the language definitions to use, and returns an array with the tokenized code.
       *
       * When the language definition includes nested tokens, the function is called recursively on each of these tokens.
       *
       * This method could be useful in other contexts as well, as a very crude parser.
       *
       * @param {string} text A string with the code to be highlighted.
       * @param {Grammar} grammar An object containing the tokens to use.
       *
       * Usually a language definition like `Prism.languages.markup`.
       * @returns {TokenStream} An array of strings and tokens, a token stream.
       * @memberof Prism
       * @public
       * @example
       * let code = `var foo = 0;`;
       * let tokens = Prism.tokenize(code, Prism.languages.javascript);
       * tokens.forEach(token => {
       *     if (token instanceof Prism.Token && token.type === 'number') {
       *         console.log(`Found numeric literal: ${token.content}`);
       *     }
       * });
       */
      tokenize: function(r, n) {
        var _ = n.rest;
        if (_) {
          for (var P in _)
            n[P] = _[P];
          delete n.rest;
        }
        var l = new L();
        return i(l, l.head, r), I(r, l, n, l.head, 0), c(l);
      },
      /**
       * @namespace
       * @memberof Prism
       * @public
       */
      hooks: {
        all: {},
        /**
         * Adds the given callback to the list of callbacks for the given hook.
         *
         * The callback will be invoked when the hook it is registered for is run.
         * Hooks are usually directly run by a highlight function but you can also run hooks yourself.
         *
         * One callback function can be registered to multiple hooks and the same hook multiple times.
         *
         * @param {string} name The name of the hook.
         * @param {HookCallback} callback The callback function which is given environment variables.
         * @public
         */
        add: function(r, n) {
          var _ = N.hooks.all;
          _[r] = _[r] || [], _[r].push(n);
        },
        /**
         * Runs a hook invoking all registered callbacks with the given environment variables.
         *
         * Callbacks will be invoked synchronously and in the order in which they were registered.
         *
         * @param {string} name The name of the hook.
         * @param {Object<string, any>} env The environment variables of the hook passed to all callbacks registered.
         * @public
         */
        run: function(r, n) {
          var _ = N.hooks.all[r];
          if (!(!_ || !_.length))
            for (var P = 0, l; l = _[P++]; )
              l(n);
        }
      },
      Token: o
    };
    R.Prism = N;
    function o(r, n, _, P) {
      this.type = r, this.content = n, this.alias = _, this.length = (P || "").length | 0;
    }
    o.stringify = function r(n, _) {
      if (typeof n == "string")
        return n;
      if (Array.isArray(n)) {
        var P = "";
        return n.forEach(function(F) {
          P += r(F, _);
        }), P;
      }
      var l = {
        type: n.type,
        content: r(n.content, _),
        tag: "span",
        classes: ["token", n.type],
        attributes: {},
        language: _
      }, U = n.alias;
      U && (Array.isArray(U) ? Array.prototype.push.apply(l.classes, U) : l.classes.push(U)), N.hooks.run("wrap", l);
      var m = "";
      for (var d in l.attributes)
        m += " " + d + '="' + (l.attributes[d] || "").replace(/"/g, "&quot;") + '"';
      return "<" + l.tag + ' class="' + l.classes.join(" ") + '"' + m + ">" + l.content + "</" + l.tag + ">";
    };
    function A(r, n, _, P) {
      r.lastIndex = n;
      var l = r.exec(_);
      if (l && P && l[1]) {
        var U = l[1].length;
        l.index += U, l[0] = l[0].slice(U);
      }
      return l;
    }
    function I(r, n, _, P, l, U) {
      for (var m in _)
        if (!(!_.hasOwnProperty(m) || !_[m])) {
          var d = _[m];
          d = Array.isArray(d) ? d : [d];
          for (var F = 0; F < d.length; ++F) {
            if (U && U.cause == m + "," + F)
              return;
            var g = d[F], $ = g.inside, RT = !!g.lookbehind, AT = !!g.greedy, re = g.alias;
            if (AT && !g.pattern.global) {
              var ne = g.pattern.toString().match(/[imsuy]*$/)[0];
              g.pattern = RegExp(g.pattern.source, ne + "g");
            }
            for (var tT = g.pattern || g, y = P.next, X = l; y !== n.tail && !(U && X >= U.reach); X += y.value.length, y = y.next) {
              var Q = y.value;
              if (n.length > r.length)
                return;
              if (!(Q instanceof o)) {
                var tE = 1, V;
                if (AT) {
                  if (V = A(tT, X, r, RT), !V || V.index >= r.length)
                    break;
                  var SE = V.index, ae = V.index + V[0].length, K = X;
                  for (K += y.value.length; SE >= K; )
                    y = y.next, K += y.value.length;
                  if (K -= y.value.length, X = K, y.value instanceof o)
                    continue;
                  for (var EE = y; EE !== n.tail && (K < ae || typeof EE.value == "string"); EE = EE.next)
                    tE++, K += EE.value.length;
                  tE--, Q = r.slice(X, K), V.index -= X;
                } else if (V = A(tT, 0, Q, RT), !V)
                  continue;
                var SE = V.index, IE = V[0], _E = Q.slice(0, SE), ST = Q.slice(SE + IE.length), DE = X + Q.length;
                U && DE > U.reach && (U.reach = DE);
                var OE = y.prev;
                _E && (OE = i(n, OE, _E), X += _E.length), H(n, OE, tE);
                var Ce = new o(m, $ ? N.tokenize(IE, $) : IE, re, IE);
                if (y = i(n, OE, Ce), ST && i(n, y, ST), tE > 1) {
                  var PE = {
                    cause: m + "," + F,
                    reach: DE
                  };
                  I(r, n, _, y.prev, X, PE), U && PE.reach > U.reach && (U.reach = PE.reach);
                }
              }
            }
          }
        }
    }
    function L() {
      var r = { value: null, prev: null, next: null }, n = { value: null, prev: r, next: null };
      r.next = n, this.head = r, this.tail = n, this.length = 0;
    }
    function i(r, n, _) {
      var P = n.next, l = { value: _, prev: n, next: P };
      return n.next = l, P.prev = l, r.length++, l;
    }
    function H(r, n, _) {
      for (var P = n.next, l = 0; l < _ && P !== r.tail; l++)
        P = P.next;
      n.next = P, P.prev = n, r.length -= l;
    }
    function c(r) {
      for (var n = [], _ = r.head.next; _ !== r.tail; )
        n.push(_.value), _ = _.next;
      return n;
    }
    if (!R.document)
      return R.addEventListener && (N.disableWorkerMessageHandler || R.addEventListener("message", function(r) {
        var n = JSON.parse(r.data), _ = n.language, P = n.code, l = n.immediateClose;
        R.postMessage(N.highlight(P, N.languages[_], _)), l && R.close();
      }, !1)), N;
    var G = N.util.currentScript();
    G && (N.filename = G.src, G.hasAttribute("data-manual") && (N.manual = !0));
    function u() {
      N.manual || N.highlightAll();
    }
    if (!N.manual) {
      var B = document.readyState;
      B === "loading" || B === "interactive" && G && G.defer ? document.addEventListener("DOMContentLoaded", u) : window.requestAnimationFrame ? window.requestAnimationFrame(u) : window.setTimeout(u, 16);
    }
    return N;
  }(T);
  E.exports && (E.exports = e), typeof ZE < "u" && (ZE.Prism = e), e.languages.markup = {
    comment: {
      pattern: /<!--(?:(?!<!--)[\s\S])*?-->/,
      greedy: !0
    },
    prolog: {
      pattern: /<\?[\s\S]+?\?>/,
      greedy: !0
    },
    doctype: {
      // https://www.w3.org/TR/xml/#NT-doctypedecl
      pattern: /<!DOCTYPE(?:[^>"'[\]]|"[^"]*"|'[^']*')+(?:\[(?:[^<"'\]]|"[^"]*"|'[^']*'|<(?!!--)|<!--(?:[^-]|-(?!->))*-->)*\]\s*)?>/i,
      greedy: !0,
      inside: {
        "internal-subset": {
          pattern: /(^[^\[]*\[)[\s\S]+(?=\]>$)/,
          lookbehind: !0,
          greedy: !0,
          inside: null
          // see below
        },
        string: {
          pattern: /"[^"]*"|'[^']*'/,
          greedy: !0
        },
        punctuation: /^<!|>$|[[\]]/,
        "doctype-tag": /^DOCTYPE/i,
        name: /[^\s<>'"]+/
      }
    },
    cdata: {
      pattern: /<!\[CDATA\[[\s\S]*?\]\]>/i,
      greedy: !0
    },
    tag: {
      pattern: /<\/?(?!\d)[^\s>\/=$<%]+(?:\s(?:\s*[^\s>\/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+(?=[\s>]))|(?=[\s/>])))+)?\s*\/?>/,
      greedy: !0,
      inside: {
        tag: {
          pattern: /^<\/?[^\s>\/]+/,
          inside: {
            punctuation: /^<\/?/,
            namespace: /^[^\s>\/:]+:/
          }
        },
        "special-attr": [],
        "attr-value": {
          pattern: /=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+)/,
          inside: {
            punctuation: [
              {
                pattern: /^=/,
                alias: "attr-equals"
              },
              {
                pattern: /^(\s*)["']|["']$/,
                lookbehind: !0
              }
            ]
          }
        },
        punctuation: /\/?>/,
        "attr-name": {
          pattern: /[^\s>\/]+/,
          inside: {
            namespace: /^[^\s>\/:]+:/
          }
        }
      }
    },
    entity: [
      {
        pattern: /&[\da-z]{1,8};/i,
        alias: "named-entity"
      },
      /&#x?[\da-f]{1,8};/i
    ]
  }, e.languages.markup.tag.inside["attr-value"].inside.entity = e.languages.markup.entity, e.languages.markup.doctype.inside["internal-subset"].inside = e.languages.markup, e.hooks.add("wrap", function(R) {
    R.type === "entity" && (R.attributes.title = R.content.replace(/&amp;/, "&"));
  }), Object.defineProperty(e.languages.markup.tag, "addInlined", {
    /**
     * Adds an inlined language to markup.
     *
     * An example of an inlined language is CSS with `<style>` tags.
     *
     * @param {string} tagName The name of the tag that contains the inlined language. This name will be treated as
     * case insensitive.
     * @param {string} lang The language key.
     * @example
     * addInlined('style', 'css');
     */
    value: function(t, O) {
      var s = {};
      s["language-" + O] = {
        pattern: /(^<!\[CDATA\[)[\s\S]+?(?=\]\]>$)/i,
        lookbehind: !0,
        inside: e.languages[O]
      }, s.cdata = /^<!\[CDATA\[|\]\]>$/i;
      var N = {
        "included-cdata": {
          pattern: /<!\[CDATA\[[\s\S]*?\]\]>/i,
          inside: s
        }
      };
      N["language-" + O] = {
        pattern: /[\s\S]+/,
        inside: e.languages[O]
      };
      var o = {};
      o[t] = {
        pattern: RegExp(/(<__[^>]*>)(?:<!\[CDATA\[(?:[^\]]|\](?!\]>))*\]\]>|(?!<!\[CDATA\[)[\s\S])*?(?=<\/__>)/.source.replace(/__/g, function() {
          return t;
        }), "i"),
        lookbehind: !0,
        greedy: !0,
        inside: N
      }, e.languages.insertBefore("markup", "cdata", o);
    }
  }), Object.defineProperty(e.languages.markup.tag, "addAttribute", {
    /**
     * Adds an pattern to highlight languages embedded in HTML attributes.
     *
     * An example of an inlined language is CSS with `style` attributes.
     *
     * @param {string} attrName The name of the tag that contains the inlined language. This name will be treated as
     * case insensitive.
     * @param {string} lang The language key.
     * @example
     * addAttribute('style', 'css');
     */
    value: function(R, t) {
      e.languages.markup.tag.inside["special-attr"].push({
        pattern: RegExp(
          /(^|["'\s])/.source + "(?:" + R + ")" + /\s*=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+(?=[\s>]))/.source,
          "i"
        ),
        lookbehind: !0,
        inside: {
          "attr-name": /^[^\s=]+/,
          "attr-value": {
            pattern: /=[\s\S]+/,
            inside: {
              value: {
                pattern: /(^=\s*(["']|(?!["'])))\S[\s\S]*(?=\2$)/,
                lookbehind: !0,
                alias: [t, "language-" + t],
                inside: e.languages[t]
              },
              punctuation: [
                {
                  pattern: /^=/,
                  alias: "attr-equals"
                },
                /"|'/
              ]
            }
          }
        }
      });
    }
  }), e.languages.html = e.languages.markup, e.languages.mathml = e.languages.markup, e.languages.svg = e.languages.markup, e.languages.xml = e.languages.extend("markup", {}), e.languages.ssml = e.languages.xml, e.languages.atom = e.languages.xml, e.languages.rss = e.languages.xml, function(R) {
    var t = /(?:"(?:\\(?:\r\n|[\s\S])|[^"\\\r\n])*"|'(?:\\(?:\r\n|[\s\S])|[^'\\\r\n])*')/;
    R.languages.css = {
      comment: /\/\*[\s\S]*?\*\//,
      atrule: {
        pattern: RegExp("@[\\w-](?:" + /[^;{\s"']|\s+(?!\s)/.source + "|" + t.source + ")*?" + /(?:;|(?=\s*\{))/.source),
        inside: {
          rule: /^@[\w-]+/,
          "selector-function-argument": {
            pattern: /(\bselector\s*\(\s*(?![\s)]))(?:[^()\s]|\s+(?![\s)])|\((?:[^()]|\([^()]*\))*\))+(?=\s*\))/,
            lookbehind: !0,
            alias: "selector"
          },
          keyword: {
            pattern: /(^|[^\w-])(?:and|not|only|or)(?![\w-])/,
            lookbehind: !0
          }
          // See rest below
        }
      },
      url: {
        // https://drafts.csswg.org/css-values-3/#urls
        pattern: RegExp("\\burl\\((?:" + t.source + "|" + /(?:[^\\\r\n()"']|\\[\s\S])*/.source + ")\\)", "i"),
        greedy: !0,
        inside: {
          function: /^url/i,
          punctuation: /^\(|\)$/,
          string: {
            pattern: RegExp("^" + t.source + "$"),
            alias: "url"
          }
        }
      },
      selector: {
        pattern: RegExp(`(^|[{}\\s])[^{}\\s](?:[^{};"'\\s]|\\s+(?![\\s{])|` + t.source + ")*(?=\\s*\\{)"),
        lookbehind: !0
      },
      string: {
        pattern: t,
        greedy: !0
      },
      property: {
        pattern: /(^|[^-\w\xA0-\uFFFF])(?!\s)[-_a-z\xA0-\uFFFF](?:(?!\s)[-\w\xA0-\uFFFF])*(?=\s*:)/i,
        lookbehind: !0
      },
      important: /!important\b/i,
      function: {
        pattern: /(^|[^-a-z0-9])[-a-z0-9]+(?=\()/i,
        lookbehind: !0
      },
      punctuation: /[(){};:,]/
    }, R.languages.css.atrule.inside.rest = R.languages.css;
    var O = R.languages.markup;
    O && (O.tag.addInlined("style", "css"), O.tag.addAttribute("style", "css"));
  }(e), e.languages.clike = {
    comment: [
      {
        pattern: /(^|[^\\])\/\*[\s\S]*?(?:\*\/|$)/,
        lookbehind: !0,
        greedy: !0
      },
      {
        pattern: /(^|[^\\:])\/\/.*/,
        lookbehind: !0,
        greedy: !0
      }
    ],
    string: {
      pattern: /(["'])(?:\\(?:\r\n|[\s\S])|(?!\1)[^\\\r\n])*\1/,
      greedy: !0
    },
    "class-name": {
      pattern: /(\b(?:class|extends|implements|instanceof|interface|new|trait)\s+|\bcatch\s+\()[\w.\\]+/i,
      lookbehind: !0,
      inside: {
        punctuation: /[.\\]/
      }
    },
    keyword: /\b(?:break|catch|continue|do|else|finally|for|function|if|in|instanceof|new|null|return|throw|try|while)\b/,
    boolean: /\b(?:false|true)\b/,
    function: /\b\w+(?=\()/,
    number: /\b0x[\da-f]+\b|(?:\b\d+(?:\.\d*)?|\B\.\d+)(?:e[+-]?\d+)?/i,
    operator: /[<>]=?|[!=]=?=?|--?|\+\+?|&&?|\|\|?|[?*/~^%]/,
    punctuation: /[{}[\];(),.:]/
  }, e.languages.javascript = e.languages.extend("clike", {
    "class-name": [
      e.languages.clike["class-name"],
      {
        pattern: /(^|[^$\w\xA0-\uFFFF])(?!\s)[_$A-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\.(?:constructor|prototype))/,
        lookbehind: !0
      }
    ],
    keyword: [
      {
        pattern: /((?:^|\})\s*)catch\b/,
        lookbehind: !0
      },
      {
        pattern: /(^|[^.]|\.\.\.\s*)\b(?:as|assert(?=\s*\{)|async(?=\s*(?:function\b|\(|[$\w\xA0-\uFFFF]|$))|await|break|case|class|const|continue|debugger|default|delete|do|else|enum|export|extends|finally(?=\s*(?:\{|$))|for|from(?=\s*(?:['"]|$))|function|(?:get|set)(?=\s*(?:[#\[$\w\xA0-\uFFFF]|$))|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|static|super|switch|this|throw|try|typeof|undefined|var|void|while|with|yield)\b/,
        lookbehind: !0
      }
    ],
    // Allow for all non-ASCII characters (See http://stackoverflow.com/a/2008444)
    function: /#?(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*(?:\.\s*(?:apply|bind|call)\s*)?\()/,
    number: {
      pattern: RegExp(
        /(^|[^\w$])/.source + "(?:" + // constant
        (/NaN|Infinity/.source + "|" + // binary integer
        /0[bB][01]+(?:_[01]+)*n?/.source + "|" + // octal integer
        /0[oO][0-7]+(?:_[0-7]+)*n?/.source + "|" + // hexadecimal integer
        /0[xX][\dA-Fa-f]+(?:_[\dA-Fa-f]+)*n?/.source + "|" + // decimal bigint
        /\d+(?:_\d+)*n/.source + "|" + // decimal number (integer or float) but no bigint
        /(?:\d+(?:_\d+)*(?:\.(?:\d+(?:_\d+)*)?)?|\.\d+(?:_\d+)*)(?:[Ee][+-]?\d+(?:_\d+)*)?/.source) + ")" + /(?![\w$])/.source
      ),
      lookbehind: !0
    },
    operator: /--|\+\+|\*\*=?|=>|&&=?|\|\|=?|[!=]==|<<=?|>>>?=?|[-+*/%&|^!=<>]=?|\.{3}|\?\?=?|\?\.?|[~:]/
  }), e.languages.javascript["class-name"][0].pattern = /(\b(?:class|extends|implements|instanceof|interface|new)\s+)[\w.\\]+/, e.languages.insertBefore("javascript", "keyword", {
    regex: {
      pattern: RegExp(
        // lookbehind
        // eslint-disable-next-line regexp/no-dupe-characters-character-class
        /((?:^|[^$\w\xA0-\uFFFF."'\])\s]|\b(?:return|yield))\s*)/.source + // Regex pattern:
        // There are 2 regex patterns here. The RegExp set notation proposal added support for nested character
        // classes if the `v` flag is present. Unfortunately, nested CCs are both context-free and incompatible
        // with the only syntax, so we have to define 2 different regex patterns.
        /\//.source + "(?:" + /(?:\[(?:[^\]\\\r\n]|\\.)*\]|\\.|[^/\\\[\r\n])+\/[dgimyus]{0,7}/.source + "|" + // `v` flag syntax. This supports 3 levels of nested character classes.
        /(?:\[(?:[^[\]\\\r\n]|\\.|\[(?:[^[\]\\\r\n]|\\.|\[(?:[^[\]\\\r\n]|\\.)*\])*\])*\]|\\.|[^/\\\[\r\n])+\/[dgimyus]{0,7}v[dgimyus]{0,7}/.source + ")" + // lookahead
        /(?=(?:\s|\/\*(?:[^*]|\*(?!\/))*\*\/)*(?:$|[\r\n,.;:})\]]|\/\/))/.source
      ),
      lookbehind: !0,
      greedy: !0,
      inside: {
        "regex-source": {
          pattern: /^(\/)[\s\S]+(?=\/[a-z]*$)/,
          lookbehind: !0,
          alias: "language-regex",
          inside: e.languages.regex
        },
        "regex-delimiter": /^\/|\/$/,
        "regex-flags": /^[a-z]+$/
      }
    },
    // This must be declared before keyword because we use "function" inside the look-forward
    "function-variable": {
      pattern: /#?(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*[=:]\s*(?:async\s*)?(?:\bfunction\b|(?:\((?:[^()]|\([^()]*\))*\)|(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*)\s*=>))/,
      alias: "function"
    },
    parameter: [
      {
        pattern: /(function(?:\s+(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*)?\s*\(\s*)(?!\s)(?:[^()\s]|\s+(?![\s)])|\([^()]*\))+(?=\s*\))/,
        lookbehind: !0,
        inside: e.languages.javascript
      },
      {
        pattern: /(^|[^$\w\xA0-\uFFFF])(?!\s)[_$a-z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*=>)/i,
        lookbehind: !0,
        inside: e.languages.javascript
      },
      {
        pattern: /(\(\s*)(?!\s)(?:[^()\s]|\s+(?![\s)])|\([^()]*\))+(?=\s*\)\s*=>)/,
        lookbehind: !0,
        inside: e.languages.javascript
      },
      {
        pattern: /((?:\b|\s|^)(?!(?:as|async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|finally|for|from|function|get|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|set|static|super|switch|this|throw|try|typeof|undefined|var|void|while|with|yield)(?![$\w\xA0-\uFFFF]))(?:(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*\s*)\(\s*|\]\s*\(\s*)(?!\s)(?:[^()\s]|\s+(?![\s)])|\([^()]*\))+(?=\s*\)\s*\{)/,
        lookbehind: !0,
        inside: e.languages.javascript
      }
    ],
    constant: /\b[A-Z](?:[A-Z_]|\dx?)*\b/
  }), e.languages.insertBefore("javascript", "string", {
    hashbang: {
      pattern: /^#!.*/,
      greedy: !0,
      alias: "comment"
    },
    "template-string": {
      pattern: /`(?:\\[\s\S]|\$\{(?:[^{}]|\{(?:[^{}]|\{[^}]*\})*\})+\}|(?!\$\{)[^\\`])*`/,
      greedy: !0,
      inside: {
        "template-punctuation": {
          pattern: /^`|`$/,
          alias: "string"
        },
        interpolation: {
          pattern: /((?:^|[^\\])(?:\\{2})*)\$\{(?:[^{}]|\{(?:[^{}]|\{[^}]*\})*\})+\}/,
          lookbehind: !0,
          inside: {
            "interpolation-punctuation": {
              pattern: /^\$\{|\}$/,
              alias: "punctuation"
            },
            rest: e.languages.javascript
          }
        },
        string: /[\s\S]+/
      }
    },
    "string-property": {
      pattern: /((?:^|[,{])[ \t]*)(["'])(?:\\(?:\r\n|[\s\S])|(?!\2)[^\\\r\n])*\2(?=\s*:)/m,
      lookbehind: !0,
      greedy: !0,
      alias: "property"
    }
  }), e.languages.insertBefore("javascript", "operator", {
    "literal-property": {
      pattern: /((?:^|[,{])[ \t]*)(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*:)/m,
      lookbehind: !0,
      alias: "property"
    }
  }), e.languages.markup && (e.languages.markup.tag.addInlined("script", "javascript"), e.languages.markup.tag.addAttribute(
    /on(?:abort|blur|change|click|composition(?:end|start|update)|dblclick|error|focus(?:in|out)?|key(?:down|up)|load|mouse(?:down|enter|leave|move|out|over|up)|reset|resize|scroll|select|slotchange|submit|unload|wheel)/.source,
    "javascript"
  )), e.languages.js = e.languages.javascript, function() {
    if (typeof e > "u" || typeof document > "u")
      return;
    Element.prototype.matches || (Element.prototype.matches = Element.prototype.msMatchesSelector || Element.prototype.webkitMatchesSelector);
    var R = "Loading…", t = function(G, u) {
      return "✖ Error " + G + " while fetching file: " + u;
    }, O = "✖ Error: File does not exist or is empty", s = {
      js: "javascript",
      py: "python",
      rb: "ruby",
      ps1: "powershell",
      psm1: "powershell",
      sh: "bash",
      bat: "batch",
      h: "c",
      tex: "latex"
    }, N = "data-src-status", o = "loading", A = "loaded", I = "failed", L = "pre[data-src]:not([" + N + '="' + A + '"]):not([' + N + '="' + o + '"])';
    function i(G, u, B) {
      var r = new XMLHttpRequest();
      r.open("GET", G, !0), r.onreadystatechange = function() {
        r.readyState == 4 && (r.status < 400 && r.responseText ? u(r.responseText) : r.status >= 400 ? B(t(r.status, r.statusText)) : B(O));
      }, r.send(null);
    }
    function H(G) {
      var u = /^\s*(\d+)\s*(?:(,)\s*(?:(\d+)\s*)?)?$/.exec(G || "");
      if (u) {
        var B = Number(u[1]), r = u[2], n = u[3];
        return r ? n ? [B, Number(n)] : [B, void 0] : [B, B];
      }
    }
    e.hooks.add("before-highlightall", function(G) {
      G.selector += ", " + L;
    }), e.hooks.add("before-sanity-check", function(G) {
      var u = (
        /** @type {HTMLPreElement} */
        G.element
      );
      if (u.matches(L)) {
        G.code = "", u.setAttribute(N, o);
        var B = u.appendChild(document.createElement("CODE"));
        B.textContent = R;
        var r = u.getAttribute("data-src"), n = G.language;
        if (n === "none") {
          var _ = (/\.(\w+)$/.exec(r) || [, "none"])[1];
          n = s[_] || _;
        }
        e.util.setLanguage(B, n), e.util.setLanguage(u, n);
        var P = e.plugins.autoloader;
        P && P.loadLanguages(n), i(
          r,
          function(l) {
            u.setAttribute(N, A);
            var U = H(u.getAttribute("data-range"));
            if (U) {
              var m = l.split(/\r\n?|\n/g), d = U[0], F = U[1] == null ? m.length : U[1];
              d < 0 && (d += m.length), d = Math.max(0, Math.min(d - 1, m.length)), F < 0 && (F += m.length), F = Math.max(0, Math.min(F, m.length)), l = m.slice(d, F).join(`
`), u.hasAttribute("data-start") || u.setAttribute("data-start", String(d + 1));
            }
            B.textContent = l, e.highlightElement(B);
          },
          function(l) {
            u.setAttribute(N, I), B.textContent = l;
          }
        );
      }
    }), e.plugins.fileHighlight = {
      /**
       * Executes the File Highlight plugin for all matching `pre` elements under the given container.
       *
       * Note: Elements which are already loaded or currently loading will not be touched by this method.
       *
       * @param {ParentNode} [container=document]
       */
      highlight: function(u) {
        for (var B = (u || document).querySelectorAll(L), r = 0, n; n = B[r++]; )
          e.highlightElement(n);
      }
    };
    var c = !1;
    e.fileHighlight = function() {
      c || (console.warn("Prism.fileHighlight is deprecated. Use `Prism.plugins.fileHighlight.highlight` instead."), c = !0), e.plugins.fileHighlight.highlight.apply(this, arguments);
    };
  }();
})(kT);
var pe = kT.exports;
const aE = /* @__PURE__ */ vT(pe);
Prism.languages.sql = {
  comment: {
    pattern: /(^|[^\\])(?:\/\*[\s\S]*?\*\/|(?:--|\/\/|#).*)/,
    lookbehind: !0
  },
  variable: [
    {
      pattern: /@(["'`])(?:\\[\s\S]|(?!\1)[^\\])+\1/,
      greedy: !0
    },
    /@[\w.$]+/
  ],
  string: {
    pattern: /(^|[^@\\])("|')(?:\\[\s\S]|(?!\2)[^\\]|\2\2)*\2/,
    greedy: !0,
    lookbehind: !0
  },
  identifier: {
    pattern: /(^|[^@\\])`(?:\\[\s\S]|[^`\\]|``)*`/,
    greedy: !0,
    lookbehind: !0,
    inside: {
      punctuation: /^`|`$/
    }
  },
  function: /\b(?:AVG|COUNT|FIRST|FORMAT|LAST|LCASE|LEN|MAX|MID|MIN|MOD|NOW|ROUND|SUM|UCASE)(?=\s*\()/i,
  // Should we highlight user defined functions too?
  keyword: /\b(?:ACTION|ADD|AFTER|ALGORITHM|ALL|ALTER|ANALYZE|ANY|APPLY|AS|ASC|AUTHORIZATION|AUTO_INCREMENT|BACKUP|BDB|BEGIN|BERKELEYDB|BIGINT|BINARY|BIT|BLOB|BOOL|BOOLEAN|BREAK|BROWSE|BTREE|BULK|BY|CALL|CASCADED?|CASE|CHAIN|CHAR(?:ACTER|SET)?|CHECK(?:POINT)?|CLOSE|CLUSTERED|COALESCE|COLLATE|COLUMNS?|COMMENT|COMMIT(?:TED)?|COMPUTE|CONNECT|CONSISTENT|CONSTRAINT|CONTAINS(?:TABLE)?|CONTINUE|CONVERT|CREATE|CROSS|CURRENT(?:_DATE|_TIME|_TIMESTAMP|_USER)?|CURSOR|CYCLE|DATA(?:BASES?)?|DATE(?:TIME)?|DAY|DBCC|DEALLOCATE|DEC|DECIMAL|DECLARE|DEFAULT|DEFINER|DELAYED|DELETE|DELIMITERS?|DENY|DESC|DESCRIBE|DETERMINISTIC|DISABLE|DISCARD|DISK|DISTINCT|DISTINCTROW|DISTRIBUTED|DO|DOUBLE|DROP|DUMMY|DUMP(?:FILE)?|DUPLICATE|ELSE(?:IF)?|ENABLE|ENCLOSED|END|ENGINE|ENUM|ERRLVL|ERRORS|ESCAPED?|EXCEPT|EXEC(?:UTE)?|EXISTS|EXIT|EXPLAIN|EXTENDED|FETCH|FIELDS|FILE|FILLFACTOR|FIRST|FIXED|FLOAT|FOLLOWING|FOR(?: EACH ROW)?|FORCE|FOREIGN|FREETEXT(?:TABLE)?|FROM|FULL|FUNCTION|GEOMETRY(?:COLLECTION)?|GLOBAL|GOTO|GRANT|GROUP|HANDLER|HASH|HAVING|HOLDLOCK|HOUR|IDENTITY(?:COL|_INSERT)?|IF|IGNORE|IMPORT|INDEX|INFILE|INNER|INNODB|INOUT|INSERT|INT|INTEGER|INTERSECT|INTERVAL|INTO|INVOKER|ISOLATION|ITERATE|JOIN|KEYS?|KILL|LANGUAGE|LAST|LEAVE|LEFT|LEVEL|LIMIT|LINENO|LINES|LINESTRING|LOAD|LOCAL|LOCK|LONG(?:BLOB|TEXT)|LOOP|MATCH(?:ED)?|MEDIUM(?:BLOB|INT|TEXT)|MERGE|MIDDLEINT|MINUTE|MODE|MODIFIES|MODIFY|MONTH|MULTI(?:LINESTRING|POINT|POLYGON)|NATIONAL|NATURAL|NCHAR|NEXT|NO|NONCLUSTERED|NULLIF|NUMERIC|OFF?|OFFSETS?|ON|OPEN(?:DATASOURCE|QUERY|ROWSET)?|OPTIMIZE|OPTION(?:ALLY)?|ORDER|OUT(?:ER|FILE)?|OVER|PARTIAL|PARTITION|PERCENT|PIVOT|PLAN|POINT|POLYGON|PRECEDING|PRECISION|PREPARE|PREV|PRIMARY|PRINT|PRIVILEGES|PROC(?:EDURE)?|PUBLIC|PURGE|QUICK|RAISERROR|READS?|REAL|RECONFIGURE|REFERENCES|RELEASE|RENAME|REPEAT(?:ABLE)?|REPLACE|REPLICATION|REQUIRE|RESIGNAL|RESTORE|RESTRICT|RETURN(?:ING|S)?|REVOKE|RIGHT|ROLLBACK|ROUTINE|ROW(?:COUNT|GUIDCOL|S)?|RTREE|RULE|SAVE(?:POINT)?|SCHEMA|SECOND|SELECT|SERIAL(?:IZABLE)?|SESSION(?:_USER)?|SET(?:USER)?|SHARE|SHOW|SHUTDOWN|SIMPLE|SMALLINT|SNAPSHOT|SOME|SONAME|SQL|START(?:ING)?|STATISTICS|STATUS|STRIPED|SYSTEM_USER|TABLES?|TABLESPACE|TEMP(?:ORARY|TABLE)?|TERMINATED|TEXT(?:SIZE)?|THEN|TIME(?:STAMP)?|TINY(?:BLOB|INT|TEXT)|TOP?|TRAN(?:SACTIONS?)?|TRIGGER|TRUNCATE|TSEQUAL|TYPES?|UNBOUNDED|UNCOMMITTED|UNDEFINED|UNION|UNIQUE|UNLOCK|UNPIVOT|UNSIGNED|UPDATE(?:TEXT)?|USAGE|USE|USER|USING|VALUES?|VAR(?:BINARY|CHAR|CHARACTER|YING)|VIEW|WAITFOR|WARNINGS|WHEN|WHERE|WHILE|WITH(?: ROLLUP|IN)?|WORK|WRITE(?:TEXT)?|YEAR)\b/i,
  boolean: /\b(?:FALSE|NULL|TRUE)\b/i,
  number: /\b0x[\da-f]+\b|\b\d+(?:\.\d*)?|\B\.\d+\b/i,
  operator: /[-+*\/=%^~]|&&?|\|\|?|!=?|<(?:=>?|<|>)?|>[>=]?|\b(?:AND|BETWEEN|DIV|ILIKE|IN|IS|LIKE|NOT|OR|REGEXP|RLIKE|SOUNDS LIKE|XOR)\b/i,
  punctuation: /[;[\]()`,.]/
};
Prism.languages.json = {
  property: {
    pattern: /(^|[^\\])"(?:\\.|[^\\"\r\n])*"(?=\s*:)/,
    lookbehind: !0,
    greedy: !0
  },
  string: {
    pattern: /(^|[^\\])"(?:\\.|[^\\"\r\n])*"(?!\s*:)/,
    lookbehind: !0,
    greedy: !0
  },
  comment: {
    pattern: /\/\/.*|\/\*[\s\S]*?(?:\*\/|$)/,
    greedy: !0
  },
  number: /-?\b\d+(?:\.\d+)?(?:e[+-]?\d+)?\b/i,
  punctuation: /[{}[\],]/,
  operator: /:/,
  boolean: /\b(?:false|true)\b/,
  null: {
    pattern: /\bnull\b/,
    alias: "keyword"
  }
};
Prism.languages.webmanifest = Prism.languages.json;
const S = (E) => E.flatMap(Ge), Ge = (E) => NE(Be(E)).map(He), He = (E) => E.replace(/ +/g, " ").trim(), Be = (E) => ({
  type: "mandatory_block",
  items: ET(E, 0)[0]
}), ET = (E, T, e) => {
  const R = [];
  for (; E[T]; ) {
    const [t, O] = me(E, T);
    if (R.push(t), T = O, E[T] === "|")
      T++;
    else if (E[T] === "}" || E[T] === "]") {
      if (e !== E[T])
        throw new Error(`Unbalanced parenthesis in: ${E}`);
      return T++, [R, T];
    } else if (T === E.length) {
      if (e)
        throw new Error(`Unbalanced parenthesis in: ${E}`);
      return [R, T];
    } else
      throw new Error(`Unexpected "${E[T]}"`);
  }
  return [R, T];
}, me = (E, T) => {
  const e = [];
  for (; ; ) {
    const [R, t] = Fe(E, T);
    if (R)
      e.push(R), T = t;
    else
      break;
  }
  return e.length === 1 ? [e[0], T] : [{ type: "concatenation", items: e }, T];
}, Fe = (E, T) => {
  if (E[T] === "{")
    return he(E, T + 1);
  if (E[T] === "[")
    return Ye(E, T + 1);
  {
    let e = "";
    for (; E[T] && /[A-Za-z0-9_ ]/.test(E[T]); )
      e += E[T], T++;
    return [e, T];
  }
}, he = (E, T) => {
  const [e, R] = ET(E, T, "}");
  return [{ type: "mandatory_block", items: e }, R];
}, Ye = (E, T) => {
  const [e, R] = ET(E, T, "]");
  return [{ type: "optional_block", items: e }, R];
}, NE = (E) => {
  if (typeof E == "string")
    return [E];
  if (E.type === "concatenation")
    return E.items.map(NE).reduce(fe, [""]);
  if (E.type === "mandatory_block")
    return E.items.flatMap(NE);
  if (E.type === "optional_block")
    return ["", ...E.items.flatMap(NE)];
  throw new Error(`Unknown node type: ${E}`);
}, fe = (E, T) => {
  const e = [];
  for (const R of E)
    for (const t of T)
      e.push(R + t);
  return e;
};
var C;
(function(E) {
  E.QUOTED_IDENTIFIER = "QUOTED_IDENTIFIER", E.IDENTIFIER = "IDENTIFIER", E.STRING = "STRING", E.VARIABLE = "VARIABLE", E.RESERVED_DATA_TYPE = "RESERVED_DATA_TYPE", E.RESERVED_PARAMETERIZED_DATA_TYPE = "RESERVED_PARAMETERIZED_DATA_TYPE", E.RESERVED_KEYWORD = "RESERVED_KEYWORD", E.RESERVED_FUNCTION_NAME = "RESERVED_FUNCTION_NAME", E.RESERVED_KEYWORD_PHRASE = "RESERVED_KEYWORD_PHRASE", E.RESERVED_DATA_TYPE_PHRASE = "RESERVED_DATA_TYPE_PHRASE", E.RESERVED_SET_OPERATION = "RESERVED_SET_OPERATION", E.RESERVED_CLAUSE = "RESERVED_CLAUSE", E.RESERVED_SELECT = "RESERVED_SELECT", E.RESERVED_JOIN = "RESERVED_JOIN", E.ARRAY_IDENTIFIER = "ARRAY_IDENTIFIER", E.ARRAY_KEYWORD = "ARRAY_KEYWORD", E.CASE = "CASE", E.END = "END", E.WHEN = "WHEN", E.ELSE = "ELSE", E.THEN = "THEN", E.LIMIT = "LIMIT", E.BETWEEN = "BETWEEN", E.AND = "AND", E.OR = "OR", E.XOR = "XOR", E.OPERATOR = "OPERATOR", E.COMMA = "COMMA", E.ASTERISK = "ASTERISK", E.PROPERTY_ACCESS_OPERATOR = "PROPERTY_ACCESS_OPERATOR", E.OPEN_PAREN = "OPEN_PAREN", E.CLOSE_PAREN = "CLOSE_PAREN", E.LINE_COMMENT = "LINE_COMMENT", E.BLOCK_COMMENT = "BLOCK_COMMENT", E.DISABLE_COMMENT = "DISABLE_COMMENT", E.NUMBER = "NUMBER", E.NAMED_PARAMETER = "NAMED_PARAMETER", E.QUOTED_PARAMETER = "QUOTED_PARAMETER", E.NUMBERED_PARAMETER = "NUMBERED_PARAMETER", E.POSITIONAL_PARAMETER = "POSITIONAL_PARAMETER", E.CUSTOM_PARAMETER = "CUSTOM_PARAMETER", E.DELIMITER = "DELIMITER", E.EOF = "EOF";
})(C = C || (C = {}));
const qT = (E) => ({
  type: C.EOF,
  raw: "«EOF»",
  text: "«EOF»",
  start: E
}), w = qT(1 / 0), Z = (E) => (T) => T.type === E.type && T.text === E.text, J = {
  ARRAY: Z({ text: "ARRAY", type: C.RESERVED_DATA_TYPE }),
  BY: Z({ text: "BY", type: C.RESERVED_KEYWORD }),
  SET: Z({ text: "SET", type: C.RESERVED_CLAUSE }),
  STRUCT: Z({ text: "STRUCT", type: C.RESERVED_DATA_TYPE }),
  WINDOW: Z({ text: "WINDOW", type: C.RESERVED_CLAUSE }),
  VALUES: Z({ text: "VALUES", type: C.RESERVED_CLAUSE })
}, QT = (E) => E === C.RESERVED_DATA_TYPE || E === C.RESERVED_KEYWORD || E === C.RESERVED_FUNCTION_NAME || E === C.RESERVED_KEYWORD_PHRASE || E === C.RESERVED_DATA_TYPE_PHRASE || E === C.RESERVED_CLAUSE || E === C.RESERVED_SELECT || E === C.RESERVED_SET_OPERATION || E === C.RESERVED_JOIN || E === C.ARRAY_KEYWORD || E === C.CASE || E === C.END || E === C.WHEN || E === C.ELSE || E === C.THEN || E === C.LIMIT || E === C.BETWEEN || E === C.AND || E === C.OR || E === C.XOR, ge = (E) => E === C.AND || E === C.OR || E === C.XOR, ye = [
  // https://cloud.google.com/bigquery/docs/reference/standard-sql/aead_encryption_functions
  "KEYS.NEW_KEYSET",
  "KEYS.ADD_KEY_FROM_RAW_BYTES",
  "AEAD.DECRYPT_BYTES",
  "AEAD.DECRYPT_STRING",
  "AEAD.ENCRYPT",
  "KEYS.KEYSET_CHAIN",
  "KEYS.KEYSET_FROM_JSON",
  "KEYS.KEYSET_TO_JSON",
  "KEYS.ROTATE_KEYSET",
  "KEYS.KEYSET_LENGTH",
  // https://cloud.google.com/bigquery/docs/reference/standard-sql/aggregate_analytic_functions
  "ANY_VALUE",
  "ARRAY_AGG",
  "AVG",
  "CORR",
  "COUNT",
  "COUNTIF",
  "COVAR_POP",
  "COVAR_SAMP",
  "MAX",
  "MIN",
  "ST_CLUSTERDBSCAN",
  "STDDEV_POP",
  "STDDEV_SAMP",
  "STRING_AGG",
  "SUM",
  "VAR_POP",
  "VAR_SAMP",
  // https://cloud.google.com/bigquery/docs/reference/standard-sql/aggregate_functions
  "ANY_VALUE",
  "ARRAY_AGG",
  "ARRAY_CONCAT_AGG",
  "AVG",
  "BIT_AND",
  "BIT_OR",
  "BIT_XOR",
  "COUNT",
  "COUNTIF",
  "LOGICAL_AND",
  "LOGICAL_OR",
  "MAX",
  "MIN",
  "STRING_AGG",
  "SUM",
  // https://cloud.google.com/bigquery/docs/reference/standard-sql/approximate_aggregate_functions
  "APPROX_COUNT_DISTINCT",
  "APPROX_QUANTILES",
  "APPROX_TOP_COUNT",
  "APPROX_TOP_SUM",
  // https://cloud.google.com/bigquery/docs/reference/standard-sql/array_functions
  // 'ARRAY',
  "ARRAY_CONCAT",
  "ARRAY_LENGTH",
  "ARRAY_TO_STRING",
  "GENERATE_ARRAY",
  "GENERATE_DATE_ARRAY",
  "GENERATE_TIMESTAMP_ARRAY",
  "ARRAY_REVERSE",
  "OFFSET",
  "SAFE_OFFSET",
  "ORDINAL",
  "SAFE_ORDINAL",
  // https://cloud.google.com/bigquery/docs/reference/standard-sql/bit_functions
  "BIT_COUNT",
  // https://cloud.google.com/bigquery/docs/reference/standard-sql/conversion_functions
  // 'CASE',
  "PARSE_BIGNUMERIC",
  "PARSE_NUMERIC",
  "SAFE_CAST",
  // https://cloud.google.com/bigquery/docs/reference/standard-sql/date_functions
  "CURRENT_DATE",
  "EXTRACT",
  "DATE",
  "DATE_ADD",
  "DATE_SUB",
  "DATE_DIFF",
  "DATE_TRUNC",
  "DATE_FROM_UNIX_DATE",
  "FORMAT_DATE",
  "LAST_DAY",
  "PARSE_DATE",
  "UNIX_DATE",
  // https://cloud.google.com/bigquery/docs/reference/standard-sql/datetime_functions
  "CURRENT_DATETIME",
  "DATETIME",
  "EXTRACT",
  "DATETIME_ADD",
  "DATETIME_SUB",
  "DATETIME_DIFF",
  "DATETIME_TRUNC",
  "FORMAT_DATETIME",
  "LAST_DAY",
  "PARSE_DATETIME",
  // https://cloud.google.com/bigquery/docs/reference/standard-sql/debugging_functions
  "ERROR",
  // https://cloud.google.com/bigquery/docs/reference/standard-sql/federated_query_functions
  "EXTERNAL_QUERY",
  // https://cloud.google.com/bigquery/docs/reference/standard-sql/geography_functions
  "S2_CELLIDFROMPOINT",
  "S2_COVERINGCELLIDS",
  "ST_ANGLE",
  "ST_AREA",
  "ST_ASBINARY",
  "ST_ASGEOJSON",
  "ST_ASTEXT",
  "ST_AZIMUTH",
  "ST_BOUNDARY",
  "ST_BOUNDINGBOX",
  "ST_BUFFER",
  "ST_BUFFERWITHTOLERANCE",
  "ST_CENTROID",
  "ST_CENTROID_AGG",
  "ST_CLOSESTPOINT",
  "ST_CLUSTERDBSCAN",
  "ST_CONTAINS",
  "ST_CONVEXHULL",
  "ST_COVEREDBY",
  "ST_COVERS",
  "ST_DIFFERENCE",
  "ST_DIMENSION",
  "ST_DISJOINT",
  "ST_DISTANCE",
  "ST_DUMP",
  "ST_DWITHIN",
  "ST_ENDPOINT",
  "ST_EQUALS",
  "ST_EXTENT",
  "ST_EXTERIORRING",
  "ST_GEOGFROM",
  "ST_GEOGFROMGEOJSON",
  "ST_GEOGFROMTEXT",
  "ST_GEOGFROMWKB",
  "ST_GEOGPOINT",
  "ST_GEOGPOINTFROMGEOHASH",
  "ST_GEOHASH",
  "ST_GEOMETRYTYPE",
  "ST_INTERIORRINGS",
  "ST_INTERSECTION",
  "ST_INTERSECTS",
  "ST_INTERSECTSBOX",
  "ST_ISCOLLECTION",
  "ST_ISEMPTY",
  "ST_LENGTH",
  "ST_MAKELINE",
  "ST_MAKEPOLYGON",
  "ST_MAKEPOLYGONORIENTED",
  "ST_MAXDISTANCE",
  "ST_NPOINTS",
  "ST_NUMGEOMETRIES",
  "ST_NUMPOINTS",
  "ST_PERIMETER",
  "ST_POINTN",
  "ST_SIMPLIFY",
  "ST_SNAPTOGRID",
  "ST_STARTPOINT",
  "ST_TOUCHES",
  "ST_UNION",
  "ST_UNION_AGG",
  "ST_WITHIN",
  "ST_X",
  "ST_Y",
  // https://cloud.google.com/bigquery/docs/reference/standard-sql/hash_functions
  "FARM_FINGERPRINT",
  "MD5",
  "SHA1",
  "SHA256",
  "SHA512",
  // https://cloud.google.com/bigquery/docs/reference/standard-sql/hll_functions
  "HLL_COUNT.INIT",
  "HLL_COUNT.MERGE",
  "HLL_COUNT.MERGE_PARTIAL",
  "HLL_COUNT.EXTRACT",
  // https://cloud.google.com/bigquery/docs/reference/standard-sql/interval_functions
  "MAKE_INTERVAL",
  "EXTRACT",
  "JUSTIFY_DAYS",
  "JUSTIFY_HOURS",
  "JUSTIFY_INTERVAL",
  // https://cloud.google.com/bigquery/docs/reference/standard-sql/json_functions
  "JSON_EXTRACT",
  "JSON_QUERY",
  "JSON_EXTRACT_SCALAR",
  "JSON_VALUE",
  "JSON_EXTRACT_ARRAY",
  "JSON_QUERY_ARRAY",
  "JSON_EXTRACT_STRING_ARRAY",
  "JSON_VALUE_ARRAY",
  "TO_JSON_STRING",
  // https://cloud.google.com/bigquery/docs/reference/standard-sql/mathematical_functions
  "ABS",
  "SIGN",
  "IS_INF",
  "IS_NAN",
  "IEEE_DIVIDE",
  "RAND",
  "SQRT",
  "POW",
  "POWER",
  "EXP",
  "LN",
  "LOG",
  "LOG10",
  "GREATEST",
  "LEAST",
  "DIV",
  "SAFE_DIVIDE",
  "SAFE_MULTIPLY",
  "SAFE_NEGATE",
  "SAFE_ADD",
  "SAFE_SUBTRACT",
  "MOD",
  "ROUND",
  "TRUNC",
  "CEIL",
  "CEILING",
  "FLOOR",
  "COS",
  "COSH",
  "ACOS",
  "ACOSH",
  "SIN",
  "SINH",
  "ASIN",
  "ASINH",
  "TAN",
  "TANH",
  "ATAN",
  "ATANH",
  "ATAN2",
  "RANGE_BUCKET",
  // https://cloud.google.com/bigquery/docs/reference/standard-sql/navigation_functions
  "FIRST_VALUE",
  "LAST_VALUE",
  "NTH_VALUE",
  "LEAD",
  "LAG",
  "PERCENTILE_CONT",
  "PERCENTILE_DISC",
  // https://cloud.google.com/bigquery/docs/reference/standard-sql/net_functions
  "NET.IP_FROM_STRING",
  "NET.SAFE_IP_FROM_STRING",
  "NET.IP_TO_STRING",
  "NET.IP_NET_MASK",
  "NET.IP_TRUNC",
  "NET.IPV4_FROM_INT64",
  "NET.IPV4_TO_INT64",
  "NET.HOST",
  "NET.PUBLIC_SUFFIX",
  "NET.REG_DOMAIN",
  // https://cloud.google.com/bigquery/docs/reference/standard-sql/numbering_functions
  "RANK",
  "DENSE_RANK",
  "PERCENT_RANK",
  "CUME_DIST",
  "NTILE",
  "ROW_NUMBER",
  // https://cloud.google.com/bigquery/docs/reference/standard-sql/security_functions
  "SESSION_USER",
  // https://cloud.google.com/bigquery/docs/reference/standard-sql/statistical_aggregate_functions
  "CORR",
  "COVAR_POP",
  "COVAR_SAMP",
  "STDDEV_POP",
  "STDDEV_SAMP",
  "STDDEV",
  "VAR_POP",
  "VAR_SAMP",
  "VARIANCE",
  // https://cloud.google.com/bigquery/docs/reference/standard-sql/string_functions
  "ASCII",
  "BYTE_LENGTH",
  "CHAR_LENGTH",
  "CHARACTER_LENGTH",
  "CHR",
  "CODE_POINTS_TO_BYTES",
  "CODE_POINTS_TO_STRING",
  "CONCAT",
  "CONTAINS_SUBSTR",
  "ENDS_WITH",
  "FORMAT",
  "FROM_BASE32",
  "FROM_BASE64",
  "FROM_HEX",
  "INITCAP",
  "INSTR",
  "LEFT",
  "LENGTH",
  "LPAD",
  "LOWER",
  "LTRIM",
  "NORMALIZE",
  "NORMALIZE_AND_CASEFOLD",
  "OCTET_LENGTH",
  "REGEXP_CONTAINS",
  "REGEXP_EXTRACT",
  "REGEXP_EXTRACT_ALL",
  "REGEXP_INSTR",
  "REGEXP_REPLACE",
  "REGEXP_SUBSTR",
  "REPLACE",
  "REPEAT",
  "REVERSE",
  "RIGHT",
  "RPAD",
  "RTRIM",
  "SAFE_CONVERT_BYTES_TO_STRING",
  "SOUNDEX",
  "SPLIT",
  "STARTS_WITH",
  "STRPOS",
  "SUBSTR",
  "SUBSTRING",
  "TO_BASE32",
  "TO_BASE64",
  "TO_CODE_POINTS",
  "TO_HEX",
  "TRANSLATE",
  "TRIM",
  "UNICODE",
  "UPPER",
  // https://cloud.google.com/bigquery/docs/reference/standard-sql/time_functions
  "CURRENT_TIME",
  "TIME",
  "EXTRACT",
  "TIME_ADD",
  "TIME_SUB",
  "TIME_DIFF",
  "TIME_TRUNC",
  "FORMAT_TIME",
  "PARSE_TIME",
  // https://cloud.google.com/bigquery/docs/reference/standard-sql/timestamp_functions
  "CURRENT_TIMESTAMP",
  "EXTRACT",
  "STRING",
  "TIMESTAMP",
  "TIMESTAMP_ADD",
  "TIMESTAMP_SUB",
  "TIMESTAMP_DIFF",
  "TIMESTAMP_TRUNC",
  "FORMAT_TIMESTAMP",
  "PARSE_TIMESTAMP",
  "TIMESTAMP_SECONDS",
  "TIMESTAMP_MILLIS",
  "TIMESTAMP_MICROS",
  "UNIX_SECONDS",
  "UNIX_MILLIS",
  "UNIX_MICROS",
  // https://cloud.google.com/bigquery/docs/reference/standard-sql/uuid_functions
  "GENERATE_UUID",
  // https://cloud.google.com/bigquery/docs/reference/standard-sql/conditional_expressions
  "COALESCE",
  "IF",
  "IFNULL",
  "NULLIF",
  // https://cloud.google.com/bigquery/docs/reference/legacy-sql
  // legacyAggregate
  "AVG",
  "BIT_AND",
  "BIT_OR",
  "BIT_XOR",
  "CORR",
  "COUNT",
  "COVAR_POP",
  "COVAR_SAMP",
  "EXACT_COUNT_DISTINCT",
  "FIRST",
  "GROUP_CONCAT",
  "GROUP_CONCAT_UNQUOTED",
  "LAST",
  "MAX",
  "MIN",
  "NEST",
  "NTH",
  "QUANTILES",
  "STDDEV",
  "STDDEV_POP",
  "STDDEV_SAMP",
  "SUM",
  "TOP",
  "UNIQUE",
  "VARIANCE",
  "VAR_POP",
  "VAR_SAMP",
  // legacyBitwise
  "BIT_COUNT",
  // legacyCasting
  "BOOLEAN",
  "BYTES",
  "CAST",
  "FLOAT",
  "HEX_STRING",
  "INTEGER",
  "STRING",
  // legacyComparison
  // expr 'IN',
  "COALESCE",
  "GREATEST",
  "IFNULL",
  "IS_INF",
  "IS_NAN",
  "IS_EXPLICITLY_DEFINED",
  "LEAST",
  "NVL",
  // legacyDatetime
  "CURRENT_DATE",
  "CURRENT_TIME",
  "CURRENT_TIMESTAMP",
  "DATE",
  "DATE_ADD",
  "DATEDIFF",
  "DAY",
  "DAYOFWEEK",
  "DAYOFYEAR",
  "FORMAT_UTC_USEC",
  "HOUR",
  "MINUTE",
  "MONTH",
  "MSEC_TO_TIMESTAMP",
  "NOW",
  "PARSE_UTC_USEC",
  "QUARTER",
  "SEC_TO_TIMESTAMP",
  "SECOND",
  "STRFTIME_UTC_USEC",
  "TIME",
  "TIMESTAMP",
  "TIMESTAMP_TO_MSEC",
  "TIMESTAMP_TO_SEC",
  "TIMESTAMP_TO_USEC",
  "USEC_TO_TIMESTAMP",
  "UTC_USEC_TO_DAY",
  "UTC_USEC_TO_HOUR",
  "UTC_USEC_TO_MONTH",
  "UTC_USEC_TO_WEEK",
  "UTC_USEC_TO_YEAR",
  "WEEK",
  "YEAR",
  // legacyIp
  "FORMAT_IP",
  "PARSE_IP",
  "FORMAT_PACKED_IP",
  "PARSE_PACKED_IP",
  // legacyJson
  "JSON_EXTRACT",
  "JSON_EXTRACT_SCALAR",
  // legacyMath
  "ABS",
  "ACOS",
  "ACOSH",
  "ASIN",
  "ASINH",
  "ATAN",
  "ATANH",
  "ATAN2",
  "CEIL",
  "COS",
  "COSH",
  "DEGREES",
  "EXP",
  "FLOOR",
  "LN",
  "LOG",
  "LOG2",
  "LOG10",
  "PI",
  "POW",
  "RADIANS",
  "RAND",
  "ROUND",
  "SIN",
  "SINH",
  "SQRT",
  "TAN",
  "TANH",
  // legacyRegex
  "REGEXP_MATCH",
  "REGEXP_EXTRACT",
  "REGEXP_REPLACE",
  // legacyString
  "CONCAT",
  // expr CONTAINS 'str'
  "INSTR",
  "LEFT",
  "LENGTH",
  "LOWER",
  "LPAD",
  "LTRIM",
  "REPLACE",
  "RIGHT",
  "RPAD",
  "RTRIM",
  "SPLIT",
  "SUBSTR",
  "UPPER",
  // legacyTableWildcard
  "TABLE_DATE_RANGE",
  "TABLE_DATE_RANGE_STRICT",
  "TABLE_QUERY",
  // legacyUrl
  "HOST",
  "DOMAIN",
  "TLD",
  // legacyWindow
  "AVG",
  "COUNT",
  "MAX",
  "MIN",
  "STDDEV",
  "SUM",
  "CUME_DIST",
  "DENSE_RANK",
  "FIRST_VALUE",
  "LAG",
  "LAST_VALUE",
  "LEAD",
  "NTH_VALUE",
  "NTILE",
  "PERCENT_RANK",
  "PERCENTILE_CONT",
  "PERCENTILE_DISC",
  "RANK",
  "RATIO_TO_REPORT",
  "ROW_NUMBER",
  // legacyMisc
  "CURRENT_USER",
  "EVERY",
  "FROM_BASE64",
  "HASH",
  "FARM_FINGERPRINT",
  "IF",
  "POSITION",
  "SHA1",
  "SOME",
  "TO_BASE64",
  // other
  "BQ.JOBS.CANCEL",
  "BQ.REFRESH_MATERIALIZED_VIEW",
  // ddl
  "OPTIONS",
  // pivot
  "PIVOT",
  "UNPIVOT"
], Ve = [
  // https://cloud.google.com/bigquery/docs/reference/standard-sql/lexical#reserved_keywords
  "ALL",
  "AND",
  "ANY",
  "AS",
  "ASC",
  "ASSERT_ROWS_MODIFIED",
  "AT",
  "BETWEEN",
  "BY",
  "CASE",
  "CAST",
  "COLLATE",
  "CONTAINS",
  "CREATE",
  "CROSS",
  "CUBE",
  "CURRENT",
  "DEFAULT",
  "DEFINE",
  "DESC",
  "DISTINCT",
  "ELSE",
  "END",
  "ENUM",
  "ESCAPE",
  "EXCEPT",
  "EXCLUDE",
  "EXISTS",
  "EXTRACT",
  "FALSE",
  "FETCH",
  "FOLLOWING",
  "FOR",
  "FROM",
  "FULL",
  "GROUP",
  "GROUPING",
  "GROUPS",
  "HASH",
  "HAVING",
  "IF",
  "IGNORE",
  "IN",
  "INNER",
  "INTERSECT",
  "INTO",
  "IS",
  "JOIN",
  "LATERAL",
  "LEFT",
  "LIMIT",
  "LOOKUP",
  "MERGE",
  "NATURAL",
  "NEW",
  "NO",
  "NOT",
  "NULL",
  "NULLS",
  "OF",
  "ON",
  "OR",
  "ORDER",
  "OUTER",
  "OVER",
  "PARTITION",
  "PRECEDING",
  "PROTO",
  "RANGE",
  "RECURSIVE",
  "RESPECT",
  "RIGHT",
  "ROLLUP",
  "ROWS",
  "SELECT",
  "SET",
  "SOME",
  "TABLE",
  "TABLESAMPLE",
  "THEN",
  "TO",
  "TREAT",
  "TRUE",
  "UNBOUNDED",
  "UNION",
  "UNNEST",
  "USING",
  "WHEN",
  "WHERE",
  "WINDOW",
  "WITH",
  "WITHIN",
  // misc
  "SAFE",
  // https://cloud.google.com/bigquery/docs/reference/standard-sql/data-definition-language
  "LIKE",
  "COPY",
  "CLONE",
  "IN",
  "OUT",
  "INOUT",
  "RETURNS",
  "LANGUAGE",
  "CASCADE",
  "RESTRICT",
  "DETERMINISTIC"
], be = [
  // https://cloud.google.com/bigquery/docs/reference/standard-sql/data-types
  "ARRAY",
  "BOOL",
  "BYTES",
  "DATE",
  "DATETIME",
  "GEOGRAPHY",
  "INTERVAL",
  "INT64",
  "INT",
  "SMALLINT",
  "INTEGER",
  "BIGINT",
  "TINYINT",
  "BYTEINT",
  "NUMERIC",
  "DECIMAL",
  "BIGNUMERIC",
  "BIGDECIMAL",
  "FLOAT64",
  "STRING",
  "STRUCT",
  "TIME",
  "TIMEZONE"
], We = S(["SELECT [ALL | DISTINCT] [AS STRUCT | AS VALUE]"]), Xe = S([
  // Queries: https://cloud.google.com/bigquery/docs/reference/standard-sql/query-syntax
  "WITH [RECURSIVE]",
  "FROM",
  "WHERE",
  "GROUP BY",
  "HAVING",
  "QUALIFY",
  "WINDOW",
  "PARTITION BY",
  "ORDER BY",
  "LIMIT",
  "OFFSET",
  "OMIT RECORD IF",
  // Data modification: https://cloud.google.com/bigquery/docs/reference/standard-sql/dml-syntax
  // - insert:
  "INSERT [INTO]",
  "VALUES",
  // - update:
  "SET",
  // - merge:
  "MERGE [INTO]",
  "WHEN [NOT] MATCHED [BY SOURCE | BY TARGET] [THEN]",
  "UPDATE SET",
  "CLUSTER BY",
  "FOR SYSTEM_TIME AS OF",
  "WITH CONNECTION",
  "WITH PARTITION COLUMNS",
  "REMOTE WITH CONNECTION"
]), NT = S([
  "CREATE [OR REPLACE] [TEMP|TEMPORARY|SNAPSHOT|EXTERNAL] TABLE [IF NOT EXISTS]"
]), lE = S([
  // - create:
  // https://cloud.google.com/bigquery/docs/reference/standard-sql/data-definition-language
  "CREATE [OR REPLACE] [MATERIALIZED] VIEW [IF NOT EXISTS]",
  // - update:
  "UPDATE",
  // - delete:
  "DELETE [FROM]",
  // - drop table:
  "DROP [SNAPSHOT | EXTERNAL] TABLE [IF EXISTS]",
  // - alter table:
  "ALTER TABLE [IF EXISTS]",
  "ADD COLUMN [IF NOT EXISTS]",
  "DROP COLUMN [IF EXISTS]",
  "RENAME TO",
  "ALTER COLUMN [IF EXISTS]",
  "SET DEFAULT COLLATE",
  "SET OPTIONS",
  "DROP NOT NULL",
  "SET DATA TYPE",
  // - alter schema
  "ALTER SCHEMA [IF EXISTS]",
  // - alter view
  "ALTER [MATERIALIZED] VIEW [IF EXISTS]",
  // - alter bi_capacity
  "ALTER BI_CAPACITY",
  // - truncate:
  "TRUNCATE TABLE",
  // - create schema
  "CREATE SCHEMA [IF NOT EXISTS]",
  "DEFAULT COLLATE",
  // stored procedures
  "CREATE [OR REPLACE] [TEMP|TEMPORARY|TABLE] FUNCTION [IF NOT EXISTS]",
  "CREATE [OR REPLACE] PROCEDURE [IF NOT EXISTS]",
  // row access policy
  "CREATE [OR REPLACE] ROW ACCESS POLICY [IF NOT EXISTS]",
  "GRANT TO",
  "FILTER USING",
  // capacity
  "CREATE CAPACITY",
  "AS JSON",
  // reservation
  "CREATE RESERVATION",
  // assignment
  "CREATE ASSIGNMENT",
  // search index
  "CREATE SEARCH INDEX [IF NOT EXISTS]",
  // drop
  "DROP SCHEMA [IF EXISTS]",
  "DROP [MATERIALIZED] VIEW [IF EXISTS]",
  "DROP [TABLE] FUNCTION [IF EXISTS]",
  "DROP PROCEDURE [IF EXISTS]",
  "DROP ROW ACCESS POLICY",
  "DROP ALL ROW ACCESS POLICIES",
  "DROP CAPACITY [IF EXISTS]",
  "DROP RESERVATION [IF EXISTS]",
  "DROP ASSIGNMENT [IF EXISTS]",
  "DROP SEARCH INDEX [IF EXISTS]",
  "DROP [IF EXISTS]",
  // DCL, https://cloud.google.com/bigquery/docs/reference/standard-sql/data-control-language
  "GRANT",
  "REVOKE",
  // Script, https://cloud.google.com/bigquery/docs/reference/standard-sql/scripting
  "DECLARE",
  "EXECUTE IMMEDIATE",
  "LOOP",
  "END LOOP",
  "REPEAT",
  "END REPEAT",
  "WHILE",
  "END WHILE",
  "BREAK",
  "LEAVE",
  "CONTINUE",
  "ITERATE",
  "FOR",
  "END FOR",
  "BEGIN",
  "BEGIN TRANSACTION",
  "COMMIT TRANSACTION",
  "ROLLBACK TRANSACTION",
  "RAISE",
  "RETURN",
  "CALL",
  // Debug, https://cloud.google.com/bigquery/docs/reference/standard-sql/debugging-statements
  "ASSERT",
  // Other, https://cloud.google.com/bigquery/docs/reference/standard-sql/other-statements
  "EXPORT DATA"
]), xe = S([
  "UNION {ALL | DISTINCT}",
  "EXCEPT DISTINCT",
  "INTERSECT DISTINCT"
]), ve = S([
  "JOIN",
  "{LEFT | RIGHT | FULL} [OUTER] JOIN",
  "{INNER | CROSS} JOIN"
]), $e = S([
  // https://cloud.google.com/bigquery/docs/reference/standard-sql/query-syntax#tablesample_operator
  "TABLESAMPLE SYSTEM",
  // From DDL: https://cloud.google.com/bigquery/docs/reference/standard-sql/data-definition-language
  "ANY TYPE",
  "ALL COLUMNS",
  "NOT DETERMINISTIC",
  // inside window definitions
  "{ROWS | RANGE} BETWEEN",
  // comparison operator
  "IS [NOT] DISTINCT FROM"
]), Ke = S([]), we = {
  name: "bigquery",
  tokenizerOptions: {
    reservedSelect: We,
    reservedClauses: [...Xe, ...lE, ...NT],
    reservedSetOperations: xe,
    reservedJoins: ve,
    reservedKeywordPhrases: $e,
    reservedDataTypePhrases: Ke,
    reservedKeywords: Ve,
    reservedDataTypes: be,
    reservedFunctionNames: ye,
    extraParens: ["[]"],
    stringTypes: [
      // The triple-quoted strings are listed first, so they get matched first.
      // Otherwise the first two quotes of """ will get matched as an empty "" string.
      { quote: '""".."""', prefixes: ["R", "B", "RB", "BR"] },
      { quote: "'''..'''", prefixes: ["R", "B", "RB", "BR"] },
      '""-bs',
      "''-bs",
      { quote: '""-raw', prefixes: ["R", "B", "RB", "BR"], requirePrefix: !0 },
      { quote: "''-raw", prefixes: ["R", "B", "RB", "BR"], requirePrefix: !0 }
    ],
    identTypes: ["``"],
    identChars: { dashes: !0 },
    paramTypes: { positional: !0, named: ["@"], quoted: ["@"] },
    variableTypes: [{ regex: String.raw`@@\w+` }],
    lineCommentTypes: ["--", "#"],
    operators: ["&", "|", "^", "~", ">>", "<<", "||", "=>"],
    postProcess: Je
  },
  formatOptions: {
    onelineClauses: [...NT, ...lE],
    tabularOnelineClauses: lE
  }
};
function Je(E) {
  return ke(qe(E));
}
function ke(E) {
  let T = w;
  return E.map((e) => e.text === "OFFSET" && T.text === "[" ? (T = e, Object.assign(Object.assign({}, e), { type: C.RESERVED_FUNCTION_NAME })) : (T = e, e));
}
function qe(E) {
  var T;
  const e = [];
  for (let R = 0; R < E.length; R++) {
    const t = E[R];
    if ((J.ARRAY(t) || J.STRUCT(t)) && ((T = E[R + 1]) === null || T === void 0 ? void 0 : T.text) === "<") {
      const O = Qe(E, R + 1), s = E.slice(R, O + 1);
      e.push({
        type: C.IDENTIFIER,
        raw: s.map(sT("raw")).join(""),
        text: s.map(sT("text")).join(""),
        start: t.start
      }), R = O;
    } else
      e.push(t);
  }
  return e;
}
const sT = (E) => (T) => T.type === C.IDENTIFIER || T.type === C.COMMA ? T[E] + " " : T[E];
function Qe(E, T) {
  let e = 0;
  for (let R = T; R < E.length; R++) {
    const t = E[R];
    if (t.text === "<" ? e++ : t.text === ">" ? e-- : t.text === ">>" && (e -= 2), e === 0)
      return R;
  }
  return E.length - 1;
}
const Ze = [
  // Derived from `select name from system.functions order by name;` on Clickhouse Cloud
  // as of November 14, 2025.
  "BIT_AND",
  "BIT_OR",
  "BIT_XOR",
  "BLAKE3",
  "CAST",
  "CHARACTER_LENGTH",
  "CHAR_LENGTH",
  "COVAR_POP",
  "COVAR_SAMP",
  "CRC32",
  "CRC32IEEE",
  "CRC64",
  "DATE",
  "DATE_DIFF",
  "DATE_FORMAT",
  "DATE_TRUNC",
  "DAY",
  "DAYOFMONTH",
  "DAYOFWEEK",
  "DAYOFYEAR",
  "FORMAT_BYTES",
  "FQDN",
  "FROM_BASE64",
  "FROM_DAYS",
  "FROM_UNIXTIME",
  "HOUR",
  "INET6_ATON",
  "INET6_NTOA",
  "INET_ATON",
  "INET_NTOA",
  "IPv4CIDRToRange",
  "IPv4NumToString",
  "IPv4NumToStringClassC",
  "IPv4StringToNum",
  "IPv4StringToNumOrDefault",
  "IPv4StringToNumOrNull",
  "IPv4ToIPv6",
  "IPv6CIDRToRange",
  "IPv6NumToString",
  "IPv6StringToNum",
  "IPv6StringToNumOrDefault",
  "IPv6StringToNumOrNull",
  "JSONAllPaths",
  "JSONAllPathsWithTypes",
  "JSONArrayLength",
  "JSONDynamicPaths",
  "JSONDynamicPathsWithTypes",
  "JSONExtract",
  "JSONExtractArrayRaw",
  "JSONExtractArrayRawCaseInsensitive",
  "JSONExtractBool",
  "JSONExtractBoolCaseInsensitive",
  "JSONExtractCaseInsensitive",
  "JSONExtractFloat",
  "JSONExtractFloatCaseInsensitive",
  "JSONExtractInt",
  "JSONExtractIntCaseInsensitive",
  "JSONExtractKeys",
  "JSONExtractKeysAndValues",
  "JSONExtractKeysAndValuesCaseInsensitive",
  "JSONExtractKeysAndValuesRaw",
  "JSONExtractKeysAndValuesRawCaseInsensitive",
  "JSONExtractKeysCaseInsensitive",
  "JSONExtractRaw",
  "JSONExtractRawCaseInsensitive",
  "JSONExtractString",
  "JSONExtractStringCaseInsensitive",
  "JSONExtractUInt",
  "JSONExtractUIntCaseInsensitive",
  "JSONHas",
  "JSONKey",
  "JSONLength",
  "JSONMergePatch",
  "JSONSharedDataPaths",
  "JSONSharedDataPathsWithTypes",
  "JSONType",
  "JSON_ARRAY_LENGTH",
  "JSON_EXISTS",
  "JSON_QUERY",
  "JSON_VALUE",
  "L1Distance",
  "L1Norm",
  "L1Normalize",
  "L2Distance",
  "L2Norm",
  "L2Normalize",
  "L2SquaredDistance",
  "L2SquaredNorm",
  "LAST_DAY",
  "LinfDistance",
  "LinfNorm",
  "LinfNormalize",
  "LpDistance",
  "LpNorm",
  "LpNormalize",
  "MACNumToString",
  "MACStringToNum",
  "MACStringToOUI",
  "MAP_FROM_ARRAYS",
  "MD4",
  "MD5",
  "MILLISECOND",
  "MINUTE",
  "MONTH",
  "OCTET_LENGTH",
  "QUARTER",
  "REGEXP_EXTRACT",
  "REGEXP_MATCHES",
  "REGEXP_REPLACE",
  "RIPEMD160",
  "SCHEMA",
  "SECOND",
  "SHA1",
  "SHA224",
  "SHA256",
  "SHA384",
  "SHA512",
  "SHA512_256",
  "STD",
  "STDDEV_POP",
  "STDDEV_SAMP",
  "ST_LineFromWKB",
  "ST_MLineFromWKB",
  "ST_MPolyFromWKB",
  "ST_PointFromWKB",
  "ST_PolyFromWKB",
  "SUBSTRING_INDEX",
  "SVG",
  "TIMESTAMP_DIFF",
  "TO_BASE64",
  "TO_DAYS",
  "TO_UNIXTIME",
  "ULIDStringToDateTime",
  "URLHash",
  "URLHierarchy",
  "URLPathHierarchy",
  "UTCTimestamp",
  "UTC_timestamp",
  "UUIDNumToString",
  "UUIDStringToNum",
  "UUIDToNum",
  "UUIDv7ToDateTime",
  "VAR_POP",
  "VAR_SAMP",
  "YEAR",
  "YYYYMMDDToDate",
  "YYYYMMDDToDate32",
  "YYYYMMDDhhmmssToDateTime",
  "YYYYMMDDhhmmssToDateTime64",
  "_CAST",
  "__actionName",
  "__bitBoolMaskAnd",
  "__bitBoolMaskOr",
  "__bitSwapLastTwo",
  "__bitWrapperFunc",
  "__getScalar",
  "__patchPartitionID",
  "__scalarSubqueryResult",
  "abs",
  "accurateCast",
  "accurateCastOrDefault",
  "accurateCastOrNull",
  "acos",
  "acosh",
  "addDate",
  "addDays",
  "addHours",
  "addInterval",
  "addMicroseconds",
  "addMilliseconds",
  "addMinutes",
  "addMonths",
  "addNanoseconds",
  "addQuarters",
  "addSeconds",
  "addTupleOfIntervals",
  "addWeeks",
  "addYears",
  "addressToLine",
  "addressToLineWithInlines",
  "addressToSymbol",
  "aes_decrypt_mysql",
  "aes_encrypt_mysql",
  "age",
  "aggThrow",
  "alphaTokens",
  "analysisOfVariance",
  "anova",
  "any",
  "anyHeavy",
  "anyLast",
  "anyLastRespectNulls",
  "anyLast_respect_nulls",
  "anyRespectNulls",
  "anyValueRespectNulls",
  "any_respect_nulls",
  "any_value",
  "any_value_respect_nulls",
  "appendTrailingCharIfAbsent",
  "approx_top_count",
  "approx_top_k",
  "approx_top_sum",
  "argMax",
  "argMin",
  "array",
  "arrayAUC",
  "arrayAUCPR",
  "arrayAll",
  "arrayAvg",
  "arrayCompact",
  "arrayConcat",
  "arrayCount",
  "arrayCumSum",
  "arrayCumSumNonNegative",
  "arrayDifference",
  "arrayDistinct",
  "arrayDotProduct",
  "arrayElement",
  "arrayElementOrNull",
  "arrayEnumerate",
  "arrayEnumerateDense",
  "arrayEnumerateDenseRanked",
  "arrayEnumerateUniq",
  "arrayEnumerateUniqRanked",
  "arrayExists",
  "arrayFill",
  "arrayFilter",
  "arrayFirst",
  "arrayFirstIndex",
  "arrayFirstOrNull",
  "arrayFlatten",
  "arrayFold",
  "arrayIntersect",
  "arrayJaccardIndex",
  "arrayJoin",
  "arrayLast",
  "arrayLastIndex",
  "arrayLastOrNull",
  "arrayLevenshteinDistance",
  "arrayLevenshteinDistanceWeighted",
  "arrayMap",
  "arrayMax",
  "arrayMin",
  "arrayNormalizedGini",
  "arrayPRAUC",
  "arrayPartialReverseSort",
  "arrayPartialShuffle",
  "arrayPartialSort",
  "arrayPopBack",
  "arrayPopFront",
  "arrayProduct",
  "arrayPushBack",
  "arrayPushFront",
  "arrayROCAUC",
  "arrayRandomSample",
  "arrayReduce",
  "arrayReduceInRanges",
  "arrayResize",
  "arrayReverse",
  "arrayReverseFill",
  "arrayReverseSort",
  "arrayReverseSplit",
  "arrayRotateLeft",
  "arrayRotateRight",
  "arrayShiftLeft",
  "arrayShiftRight",
  "arrayShingles",
  "arrayShuffle",
  "arraySimilarity",
  "arraySlice",
  "arraySort",
  "arraySplit",
  "arrayStringConcat",
  "arraySum",
  "arraySymmetricDifference",
  "arrayUnion",
  "arrayUniq",
  "arrayWithConstant",
  "arrayZip",
  "arrayZipUnaligned",
  "array_agg",
  "array_concat_agg",
  "ascii",
  "asin",
  "asinh",
  "assumeNotNull",
  "atan",
  "atan2",
  "atanh",
  "authenticatedUser",
  "avg",
  "avgWeighted",
  "bar",
  "base32Decode",
  "base32Encode",
  "base58Decode",
  "base58Encode",
  "base64Decode",
  "base64Encode",
  "base64URLDecode",
  "base64URLEncode",
  "basename",
  "bech32Decode",
  "bech32Encode",
  "bin",
  "bitAnd",
  "bitCount",
  "bitHammingDistance",
  "bitNot",
  "bitOr",
  "bitPositionsToArray",
  "bitRotateLeft",
  "bitRotateRight",
  "bitShiftLeft",
  "bitShiftRight",
  "bitSlice",
  "bitTest",
  "bitTestAll",
  "bitTestAny",
  "bitXor",
  "bitmapAnd",
  "bitmapAndCardinality",
  "bitmapAndnot",
  "bitmapAndnotCardinality",
  "bitmapBuild",
  "bitmapCardinality",
  "bitmapContains",
  "bitmapHasAll",
  "bitmapHasAny",
  "bitmapMax",
  "bitmapMin",
  "bitmapOr",
  "bitmapOrCardinality",
  "bitmapSubsetInRange",
  "bitmapSubsetLimit",
  "bitmapToArray",
  "bitmapTransform",
  "bitmapXor",
  "bitmapXorCardinality",
  "bitmaskToArray",
  "bitmaskToList",
  "blockNumber",
  "blockSerializedSize",
  "blockSize",
  "boundingRatio",
  "buildId",
  "byteHammingDistance",
  "byteSize",
  "byteSlice",
  "byteSwap",
  "caseWithExpr",
  "caseWithExpression",
  "caseWithoutExpr",
  "caseWithoutExpression",
  "catboostEvaluate",
  "categoricalInformationValue",
  "cbrt",
  "ceil",
  "ceiling",
  "changeDay",
  "changeHour",
  "changeMinute",
  "changeMonth",
  "changeSecond",
  "changeYear",
  "char",
  "cityHash64",
  "clamp",
  "coalesce",
  "colorOKLCHToSRGB",
  "colorSRGBToOKLCH",
  "compareSubstrings",
  "concat",
  "concatAssumeInjective",
  "concatWithSeparator",
  "concatWithSeparatorAssumeInjective",
  "concat_ws",
  "connectionId",
  "connection_id",
  "contingency",
  "convertCharset",
  "corr",
  "corrMatrix",
  "corrStable",
  "cos",
  "cosh",
  "cosineDistance",
  "count",
  "countDigits",
  "countEqual",
  "countMatches",
  "countMatchesCaseInsensitive",
  "countSubstrings",
  "countSubstringsCaseInsensitive",
  "countSubstringsCaseInsensitiveUTF8",
  "covarPop",
  "covarPopMatrix",
  "covarPopStable",
  "covarSamp",
  "covarSampMatrix",
  "covarSampStable",
  "cramersV",
  "cramersVBiasCorrected",
  "curdate",
  "currentDatabase",
  "currentProfiles",
  "currentQueryID",
  "currentRoles",
  "currentSchemas",
  "currentUser",
  "current_database",
  "current_date",
  "current_query_id",
  "current_schemas",
  "current_timestamp",
  "current_user",
  "cutFragment",
  "cutIPv6",
  "cutQueryString",
  "cutQueryStringAndFragment",
  "cutToFirstSignificantSubdomain",
  "cutToFirstSignificantSubdomainCustom",
  "cutToFirstSignificantSubdomainCustomRFC",
  "cutToFirstSignificantSubdomainCustomWithWWW",
  "cutToFirstSignificantSubdomainCustomWithWWWRFC",
  "cutToFirstSignificantSubdomainRFC",
  "cutToFirstSignificantSubdomainWithWWW",
  "cutToFirstSignificantSubdomainWithWWWRFC",
  "cutURLParameter",
  "cutWWW",
  "damerauLevenshteinDistance",
  "dateDiff",
  "dateName",
  "dateTime64ToSnowflake",
  "dateTime64ToSnowflakeID",
  "dateTimeToSnowflake",
  "dateTimeToSnowflakeID",
  "dateTimeToUUIDv7",
  "dateTrunc",
  "date_bin",
  "date_diff",
  "decodeHTMLComponent",
  "decodeURLComponent",
  "decodeURLFormComponent",
  "decodeXMLComponent",
  "decrypt",
  "defaultProfiles",
  "defaultRoles",
  "defaultValueOfArgumentType",
  "defaultValueOfTypeName",
  "degrees",
  "deltaSum",
  "deltaSumTimestamp",
  "demangle",
  "denseRank",
  "dense_rank",
  "detectCharset",
  "detectLanguage",
  "detectLanguageMixed",
  "detectLanguageUnknown",
  "detectProgrammingLanguage",
  "detectTonality",
  "dictGet",
  "dictGetAll",
  "dictGetChildren",
  "dictGetDate",
  "dictGetDateOrDefault",
  "dictGetDateTime",
  "dictGetDateTimeOrDefault",
  "dictGetDescendants",
  "dictGetFloat32",
  "dictGetFloat32OrDefault",
  "dictGetFloat64",
  "dictGetFloat64OrDefault",
  "dictGetHierarchy",
  "dictGetIPv4",
  "dictGetIPv4OrDefault",
  "dictGetIPv6",
  "dictGetIPv6OrDefault",
  "dictGetInt16",
  "dictGetInt16OrDefault",
  "dictGetInt32",
  "dictGetInt32OrDefault",
  "dictGetInt64",
  "dictGetInt64OrDefault",
  "dictGetInt8",
  "dictGetInt8OrDefault",
  "dictGetOrDefault",
  "dictGetOrNull",
  "dictGetString",
  "dictGetStringOrDefault",
  "dictGetUInt16",
  "dictGetUInt16OrDefault",
  "dictGetUInt32",
  "dictGetUInt32OrDefault",
  "dictGetUInt64",
  "dictGetUInt64OrDefault",
  "dictGetUInt8",
  "dictGetUInt8OrDefault",
  "dictGetUUID",
  "dictGetUUIDOrDefault",
  "dictHas",
  "dictIsIn",
  "displayName",
  "distanceL1",
  "distanceL2",
  "distanceL2Squared",
  "distanceLinf",
  "distanceLp",
  "distinctDynamicTypes",
  "distinctJSONPaths",
  "distinctJSONPathsAndTypes",
  "divide",
  "divideDecimal",
  "divideOrNull",
  "domain",
  "domainRFC",
  "domainWithoutWWW",
  "domainWithoutWWWRFC",
  "dotProduct",
  "dumpColumnStructure",
  "dynamicElement",
  "dynamicType",
  "e",
  "editDistance",
  "editDistanceUTF8",
  "empty",
  "emptyArrayDate",
  "emptyArrayDateTime",
  "emptyArrayFloat32",
  "emptyArrayFloat64",
  "emptyArrayInt16",
  "emptyArrayInt32",
  "emptyArrayInt64",
  "emptyArrayInt8",
  "emptyArrayString",
  "emptyArrayToSingle",
  "emptyArrayUInt16",
  "emptyArrayUInt32",
  "emptyArrayUInt64",
  "emptyArrayUInt8",
  "enabledProfiles",
  "enabledRoles",
  "encodeURLComponent",
  "encodeURLFormComponent",
  "encodeXMLComponent",
  "encrypt",
  "endsWith",
  "endsWithUTF8",
  "entropy",
  "equals",
  "erf",
  "erfc",
  "errorCodeToName",
  "estimateCompressionRatio",
  "evalMLMethod",
  "exp",
  "exp10",
  "exp2",
  "exponentialMovingAverage",
  "exponentialTimeDecayedAvg",
  "exponentialTimeDecayedCount",
  "exponentialTimeDecayedMax",
  "exponentialTimeDecayedSum",
  "extract",
  "extractAll",
  "extractAllGroups",
  "extractAllGroupsHorizontal",
  "extractAllGroupsVertical",
  "extractGroups",
  "extractKeyValuePairs",
  "extractKeyValuePairsWithEscaping",
  "extractTextFromHTML",
  "extractURLParameter",
  "extractURLParameterNames",
  "extractURLParameters",
  "factorial",
  "farmFingerprint64",
  "farmHash64",
  "file",
  "filesystemAvailable",
  "filesystemCapacity",
  "filesystemUnreserved",
  "finalizeAggregation",
  "financialInternalRateOfReturn",
  "financialInternalRateOfReturnExtended",
  "financialNetPresentValue",
  "financialNetPresentValueExtended",
  "firstLine",
  "firstSignificantSubdomain",
  "firstSignificantSubdomainCustom",
  "firstSignificantSubdomainCustomRFC",
  "firstSignificantSubdomainRFC",
  "firstValueRespectNulls",
  "first_value",
  "first_value_respect_nulls",
  "flameGraph",
  "flatten",
  "flattenTuple",
  "floor",
  // We do not include FORMAT as a function, because it's also a keyword.
  // FORMAT clauses are fairly common: https://clickhouse.com/docs/sql-reference/statements/select/format
  // 'format',
  "formatDateTime",
  "formatDateTimeInJodaSyntax",
  "formatQuery",
  "formatQueryOrNull",
  "formatQuerySingleLine",
  "formatQuerySingleLineOrNull",
  "formatReadableDecimalSize",
  "formatReadableQuantity",
  "formatReadableSize",
  "formatReadableTimeDelta",
  "formatRow",
  "formatRowNoNewline",
  "fragment",
  "fromDaysSinceYearZero",
  "fromDaysSinceYearZero32",
  "fromModifiedJulianDay",
  "fromModifiedJulianDayOrNull",
  "fromUTCTimestamp",
  "fromUnixTimestamp",
  "fromUnixTimestamp64Micro",
  "fromUnixTimestamp64Milli",
  "fromUnixTimestamp64Nano",
  "fromUnixTimestamp64Second",
  "fromUnixTimestampInJodaSyntax",
  "from_utc_timestamp",
  "fullHostName",
  "fuzzBits",
  "gccMurmurHash",
  "gcd",
  "generateRandomStructure",
  "generateSerialID",
  "generateSnowflakeID",
  "generateULID",
  "generateUUIDv4",
  "generateUUIDv7",
  "geoDistance",
  "geoToH3",
  "geoToS2",
  "geohashDecode",
  "geohashEncode",
  "geohashesInBox",
  "getClientHTTPHeader",
  "getMacro",
  "getMaxTableNameLengthForDatabase",
  "getMergeTreeSetting",
  "getOSKernelVersion",
  "getServerPort",
  "getServerSetting",
  "getSetting",
  "getSettingOrDefault",
  "getSizeOfEnumType",
  "getSubcolumn",
  "getTypeSerializationStreams",
  "globalIn",
  "globalInIgnoreSet",
  "globalNotIn",
  "globalNotInIgnoreSet",
  "globalNotNullIn",
  "globalNotNullInIgnoreSet",
  "globalNullIn",
  "globalNullInIgnoreSet",
  "globalVariable",
  "greatCircleAngle",
  "greatCircleDistance",
  "greater",
  "greaterOrEquals",
  "greatest",
  "groupArray",
  "groupArrayInsertAt",
  "groupArrayIntersect",
  "groupArrayLast",
  "groupArrayMovingAvg",
  "groupArrayMovingSum",
  "groupArraySample",
  "groupArraySorted",
  "groupBitAnd",
  "groupBitOr",
  "groupBitXor",
  "groupBitmap",
  "groupBitmapAnd",
  "groupBitmapOr",
  "groupBitmapXor",
  "groupConcat",
  "groupNumericIndexedVector",
  "groupUniqArray",
  "group_concat",
  "h3CellAreaM2",
  "h3CellAreaRads2",
  "h3Distance",
  "h3EdgeAngle",
  "h3EdgeLengthKm",
  "h3EdgeLengthM",
  "h3ExactEdgeLengthKm",
  "h3ExactEdgeLengthM",
  "h3ExactEdgeLengthRads",
  "h3GetBaseCell",
  "h3GetDestinationIndexFromUnidirectionalEdge",
  "h3GetFaces",
  "h3GetIndexesFromUnidirectionalEdge",
  "h3GetOriginIndexFromUnidirectionalEdge",
  "h3GetPentagonIndexes",
  "h3GetRes0Indexes",
  "h3GetResolution",
  "h3GetUnidirectionalEdge",
  "h3GetUnidirectionalEdgeBoundary",
  "h3GetUnidirectionalEdgesFromHexagon",
  "h3HexAreaKm2",
  "h3HexAreaM2",
  "h3HexRing",
  "h3IndexesAreNeighbors",
  "h3IsPentagon",
  "h3IsResClassIII",
  "h3IsValid",
  "h3Line",
  "h3NumHexagons",
  "h3PointDistKm",
  "h3PointDistM",
  "h3PointDistRads",
  "h3ToCenterChild",
  "h3ToChildren",
  "h3ToGeo",
  "h3ToGeoBoundary",
  "h3ToParent",
  "h3ToString",
  "h3UnidirectionalEdgeIsValid",
  "h3kRing",
  "halfMD5",
  "has",
  "hasAll",
  "hasAny",
  "hasColumnInTable",
  "hasSubsequence",
  "hasSubsequenceCaseInsensitive",
  "hasSubsequenceCaseInsensitiveUTF8",
  "hasSubsequenceUTF8",
  "hasSubstr",
  "hasThreadFuzzer",
  "hasToken",
  "hasTokenCaseInsensitive",
  "hasTokenCaseInsensitiveOrNull",
  "hasTokenOrNull",
  "hex",
  "hilbertDecode",
  "hilbertEncode",
  "histogram",
  "hiveHash",
  "hop",
  "hopEnd",
  "hopStart",
  "hostName",
  "hostname",
  "hypot",
  "icebergBucket",
  "icebergHash",
  "icebergTruncate",
  "identity",
  "idnaDecode",
  "idnaEncode",
  "if",
  "ifNotFinite",
  "ifNull",
  "ignore",
  // ilike() is a function, but the ILIKE keyword is very common in SQL.
  // 'ilike',
  "inIgnoreSet",
  "indexHint",
  "indexOf",
  "indexOfAssumeSorted",
  "initcap",
  "initcapUTF8",
  "initialQueryID",
  "initialQueryStartTime",
  "initial_query_id",
  "initial_query_start_time",
  "initializeAggregation",
  "instr",
  "intDiv",
  "intDivOrNull",
  "intDivOrZero",
  "intExp10",
  "intExp2",
  "intHash32",
  "intHash64",
  "intervalLengthSum",
  "isConstant",
  "isDecimalOverflow",
  "isDynamicElementInSharedData",
  "isFinite",
  "isIPAddressInRange",
  "isIPv4String",
  "isIPv6String",
  "isInfinite",
  "isMergeTreePartCoveredBy",
  "isNaN",
  "isNotDistinctFrom",
  "isNotNull",
  "isNull",
  "isNullable",
  "isValidJSON",
  "isValidUTF8",
  "isZeroOrNull",
  "jaroSimilarity",
  "jaroWinklerSimilarity",
  "javaHash",
  "javaHashUTF16LE",
  "joinGet",
  "joinGetOrNull",
  "jsonMergePatch",
  "jumpConsistentHash",
  "kafkaMurmurHash",
  "keccak256",
  "kolmogorovSmirnovTest",
  "kostikConsistentHash",
  "kql_array_sort_asc",
  "kql_array_sort_desc",
  "kurtPop",
  "kurtSamp",
  "lag",
  "lagInFrame",
  "largestTriangleThreeBuckets",
  "lastValueRespectNulls",
  "last_value",
  "last_value_respect_nulls",
  "lcase",
  "lcm",
  "lead",
  "leadInFrame",
  "least",
  "left",
  "leftPad",
  "leftPadUTF8",
  "leftUTF8",
  "lemmatize",
  "length",
  "lengthUTF8",
  "less",
  "lessOrEquals",
  "levenshteinDistance",
  "levenshteinDistanceUTF8",
  "lgamma",
  // like() is a function, but the ILIKE keyword is very common in SQL.
  // 'like',
  "ln",
  "locate",
  "log",
  "log10",
  "log1p",
  "log2",
  "logTrace",
  "lowCardinalityIndices",
  "lowCardinalityKeys",
  "lower",
  "lowerUTF8",
  "lpad",
  "ltrim",
  "lttb",
  "makeDate",
  "makeDate32",
  "makeDateTime",
  "makeDateTime64",
  "mannWhitneyUTest",
  "map",
  "mapAdd",
  "mapAll",
  "mapApply",
  "mapConcat",
  "mapContains",
  "mapContainsKey",
  "mapContainsKeyLike",
  "mapContainsValue",
  "mapContainsValueLike",
  "mapExists",
  "mapExtractKeyLike",
  "mapExtractValueLike",
  "mapFilter",
  "mapFromArrays",
  "mapFromString",
  "mapKeys",
  "mapPartialReverseSort",
  "mapPartialSort",
  "mapPopulateSeries",
  "mapReverseSort",
  "mapSort",
  "mapSubtract",
  "mapUpdate",
  "mapValues",
  "match",
  "materialize",
  "max",
  "max2",
  "maxIntersections",
  "maxIntersectionsPosition",
  "maxMappedArrays",
  "meanZTest",
  "median",
  "medianBFloat16",
  "medianBFloat16Weighted",
  "medianDD",
  "medianDeterministic",
  "medianExact",
  "medianExactHigh",
  "medianExactLow",
  "medianExactWeighted",
  "medianExactWeightedInterpolated",
  "medianGK",
  "medianInterpolatedWeighted",
  "medianTDigest",
  "medianTDigestWeighted",
  "medianTiming",
  "medianTimingWeighted",
  "mergeTreePartInfo",
  "metroHash64",
  "mid",
  "min",
  "min2",
  "minMappedArrays",
  "minSampleSizeContinous",
  "minSampleSizeContinuous",
  "minSampleSizeConversion",
  "minus",
  "mismatches",
  "mod",
  "modOrNull",
  "modulo",
  "moduloLegacy",
  "moduloOrNull",
  "moduloOrZero",
  "monthName",
  "mortonDecode",
  "mortonEncode",
  "multiFuzzyMatchAllIndices",
  "multiFuzzyMatchAny",
  "multiFuzzyMatchAnyIndex",
  "multiIf",
  "multiMatchAllIndices",
  "multiMatchAny",
  "multiMatchAnyIndex",
  "multiSearchAllPositions",
  "multiSearchAllPositionsCaseInsensitive",
  "multiSearchAllPositionsCaseInsensitiveUTF8",
  "multiSearchAllPositionsUTF8",
  "multiSearchAny",
  "multiSearchAnyCaseInsensitive",
  "multiSearchAnyCaseInsensitiveUTF8",
  "multiSearchAnyUTF8",
  "multiSearchFirstIndex",
  "multiSearchFirstIndexCaseInsensitive",
  "multiSearchFirstIndexCaseInsensitiveUTF8",
  "multiSearchFirstIndexUTF8",
  "multiSearchFirstPosition",
  "multiSearchFirstPositionCaseInsensitive",
  "multiSearchFirstPositionCaseInsensitiveUTF8",
  "multiSearchFirstPositionUTF8",
  "multiply",
  "multiplyDecimal",
  "murmurHash2_32",
  "murmurHash2_64",
  "murmurHash3_128",
  "murmurHash3_32",
  "murmurHash3_64",
  "negate",
  "neighbor",
  "nested",
  "netloc",
  "ngramDistance",
  "ngramDistanceCaseInsensitive",
  "ngramDistanceCaseInsensitiveUTF8",
  "ngramDistanceUTF8",
  "ngramMinHash",
  "ngramMinHashArg",
  "ngramMinHashArgCaseInsensitive",
  "ngramMinHashArgCaseInsensitiveUTF8",
  "ngramMinHashArgUTF8",
  "ngramMinHashCaseInsensitive",
  "ngramMinHashCaseInsensitiveUTF8",
  "ngramMinHashUTF8",
  "ngramSearch",
  "ngramSearchCaseInsensitive",
  "ngramSearchCaseInsensitiveUTF8",
  "ngramSearchUTF8",
  "ngramSimHash",
  "ngramSimHashCaseInsensitive",
  "ngramSimHashCaseInsensitiveUTF8",
  "ngramSimHashUTF8",
  "ngrams",
  "nonNegativeDerivative",
  "normL1",
  "normL2",
  "normL2Squared",
  "normLinf",
  "normLp",
  "normalizeL1",
  "normalizeL2",
  "normalizeLinf",
  "normalizeLp",
  "normalizeQuery",
  "normalizeQueryKeepNames",
  "normalizeUTF8NFC",
  "normalizeUTF8NFD",
  "normalizeUTF8NFKC",
  "normalizeUTF8NFKD",
  "normalizedQueryHash",
  "normalizedQueryHashKeepNames",
  // not() is a function, but the NOT keyword is very common in SQL.
  // 'not',
  "notEmpty",
  "notEquals",
  "notILike",
  "notIn",
  "notInIgnoreSet",
  "notLike",
  "notNullIn",
  "notNullInIgnoreSet",
  "nothing",
  "nothingNull",
  "nothingUInt64",
  "now",
  "now64",
  "nowInBlock",
  "nowInBlock64",
  "nth_value",
  "ntile",
  "nullIf",
  "nullIn",
  "nullInIgnoreSet",
  "numbers",
  "numericIndexedVectorAllValueSum",
  "numericIndexedVectorBuild",
  "numericIndexedVectorCardinality",
  "numericIndexedVectorGetValue",
  "numericIndexedVectorPointwiseAdd",
  "numericIndexedVectorPointwiseDivide",
  "numericIndexedVectorPointwiseEqual",
  "numericIndexedVectorPointwiseGreater",
  "numericIndexedVectorPointwiseGreaterEqual",
  "numericIndexedVectorPointwiseLess",
  "numericIndexedVectorPointwiseLessEqual",
  "numericIndexedVectorPointwiseMultiply",
  "numericIndexedVectorPointwiseNotEqual",
  "numericIndexedVectorPointwiseSubtract",
  "numericIndexedVectorShortDebugString",
  "numericIndexedVectorToMap",
  "overlay",
  "overlayUTF8",
  "parseDateTime",
  "parseDateTime32BestEffort",
  "parseDateTime32BestEffortOrNull",
  "parseDateTime32BestEffortOrZero",
  "parseDateTime64",
  "parseDateTime64BestEffort",
  "parseDateTime64BestEffortOrNull",
  "parseDateTime64BestEffortOrZero",
  "parseDateTime64BestEffortUS",
  "parseDateTime64BestEffortUSOrNull",
  "parseDateTime64BestEffortUSOrZero",
  "parseDateTime64InJodaSyntax",
  "parseDateTime64InJodaSyntaxOrNull",
  "parseDateTime64InJodaSyntaxOrZero",
  "parseDateTime64OrNull",
  "parseDateTime64OrZero",
  "parseDateTimeBestEffort",
  "parseDateTimeBestEffortOrNull",
  "parseDateTimeBestEffortOrZero",
  "parseDateTimeBestEffortUS",
  "parseDateTimeBestEffortUSOrNull",
  "parseDateTimeBestEffortUSOrZero",
  "parseDateTimeInJodaSyntax",
  "parseDateTimeInJodaSyntaxOrNull",
  "parseDateTimeInJodaSyntaxOrZero",
  "parseDateTimeOrNull",
  "parseDateTimeOrZero",
  "parseReadableSize",
  "parseReadableSizeOrNull",
  "parseReadableSizeOrZero",
  "parseTimeDelta",
  "partitionID",
  "partitionId",
  "path",
  "pathFull",
  "percentRank",
  "percent_rank",
  "pi",
  "plus",
  "pmod",
  "pmodOrNull",
  "pointInEllipses",
  "pointInPolygon",
  "polygonAreaCartesian",
  "polygonAreaSpherical",
  "polygonConvexHullCartesian",
  "polygonPerimeterCartesian",
  "polygonPerimeterSpherical",
  "polygonsDistanceCartesian",
  "polygonsDistanceSpherical",
  "polygonsEqualsCartesian",
  "polygonsIntersectCartesian",
  "polygonsIntersectSpherical",
  "polygonsIntersectionCartesian",
  "polygonsIntersectionSpherical",
  "polygonsSymDifferenceCartesian",
  "polygonsSymDifferenceSpherical",
  "polygonsUnionCartesian",
  "polygonsUnionSpherical",
  "polygonsWithinCartesian",
  "polygonsWithinSpherical",
  "port",
  "portRFC",
  "position",
  "positionCaseInsensitive",
  "positionCaseInsensitiveUTF8",
  "positionUTF8",
  "positiveModulo",
  "positiveModuloOrNull",
  "positive_modulo",
  "positive_modulo_or_null",
  "pow",
  "power",
  "printf",
  "proportionsZTest",
  "protocol",
  "punycodeDecode",
  "punycodeEncode",
  "quantile",
  "quantileBFloat16",
  "quantileBFloat16Weighted",
  "quantileDD",
  "quantileDeterministic",
  "quantileExact",
  "quantileExactExclusive",
  "quantileExactHigh",
  "quantileExactInclusive",
  "quantileExactLow",
  "quantileExactWeighted",
  "quantileExactWeightedInterpolated",
  "quantileGK",
  "quantileInterpolatedWeighted",
  "quantileTDigest",
  "quantileTDigestWeighted",
  "quantileTiming",
  "quantileTimingWeighted",
  "quantiles",
  "quantilesBFloat16",
  "quantilesBFloat16Weighted",
  "quantilesDD",
  "quantilesDeterministic",
  "quantilesExact",
  "quantilesExactExclusive",
  "quantilesExactHigh",
  "quantilesExactInclusive",
  "quantilesExactLow",
  "quantilesExactWeighted",
  "quantilesExactWeightedInterpolated",
  "quantilesGK",
  "quantilesInterpolatedWeighted",
  "quantilesTDigest",
  "quantilesTDigestWeighted",
  "quantilesTiming",
  "quantilesTimingWeighted",
  "queryID",
  "queryString",
  "queryStringAndFragment",
  "query_id",
  "radians",
  "rand",
  "rand32",
  "rand64",
  "randBernoulli",
  "randBinomial",
  "randCanonical",
  "randChiSquared",
  "randConstant",
  "randExponential",
  "randFisherF",
  "randLogNormal",
  "randNegativeBinomial",
  "randNormal",
  "randPoisson",
  "randStudentT",
  "randUniform",
  "randomFixedString",
  "randomPrintableASCII",
  "randomString",
  "randomStringUTF8",
  // range() is a function, but the RANGE keyword is important for window functions.
  // 'range',
  "rank",
  "rankCorr",
  "readWKBLineString",
  "readWKBMultiLineString",
  "readWKBMultiPolygon",
  "readWKBPoint",
  "readWKBPolygon",
  "readWKTLineString",
  "readWKTMultiLineString",
  "readWKTMultiPolygon",
  "readWKTPoint",
  "readWKTPolygon",
  "readWKTRing",
  "regexpExtract",
  "regexpQuoteMeta",
  "regionHierarchy",
  "regionIn",
  "regionToArea",
  "regionToCity",
  "regionToContinent",
  "regionToCountry",
  "regionToDistrict",
  "regionToName",
  "regionToPopulation",
  "regionToTopContinent",
  "reinterpret",
  "reinterpretAsDate",
  "reinterpretAsDateTime",
  "reinterpretAsFixedString",
  "reinterpretAsFloat32",
  "reinterpretAsFloat64",
  "reinterpretAsInt128",
  "reinterpretAsInt16",
  "reinterpretAsInt256",
  "reinterpretAsInt32",
  "reinterpretAsInt64",
  "reinterpretAsInt8",
  "reinterpretAsString",
  "reinterpretAsUInt128",
  "reinterpretAsUInt16",
  "reinterpretAsUInt256",
  "reinterpretAsUInt32",
  "reinterpretAsUInt64",
  "reinterpretAsUInt8",
  "reinterpretAsUUID",
  "repeat",
  "replace",
  "replaceAll",
  "replaceOne",
  "replaceRegexpAll",
  "replaceRegexpOne",
  "replicate",
  "retention",
  "reverse",
  "reverseUTF8",
  "revision",
  "right",
  "rightPad",
  "rightPadUTF8",
  "rightUTF8",
  "round",
  "roundAge",
  "roundBankers",
  "roundDown",
  "roundDuration",
  "roundToExp2",
  "rowNumberInAllBlocks",
  "rowNumberInBlock",
  "row_number",
  "rpad",
  "rtrim",
  "runningAccumulate",
  "runningConcurrency",
  "runningDifference",
  "runningDifferenceStartingWithFirstValue",
  "s2CapContains",
  "s2CapUnion",
  "s2CellsIntersect",
  "s2GetNeighbors",
  "s2RectAdd",
  "s2RectContains",
  "s2RectIntersection",
  "s2RectUnion",
  "s2ToGeo",
  "scalarProduct",
  "searchAll",
  "searchAny",
  "sequenceCount",
  "sequenceMatch",
  "sequenceMatchEvents",
  "sequenceNextNode",
  "seriesDecomposeSTL",
  "seriesOutliersDetectTukey",
  "seriesPeriodDetectFFT",
  "serverTimeZone",
  "serverTimezone",
  "serverUUID",
  "shardCount",
  "shardNum",
  "showCertificate",
  "sigmoid",
  "sign",
  "simpleJSONExtractBool",
  "simpleJSONExtractFloat",
  "simpleJSONExtractInt",
  "simpleJSONExtractRaw",
  "simpleJSONExtractString",
  "simpleJSONExtractUInt",
  "simpleJSONHas",
  "simpleLinearRegression",
  "sin",
  "singleValueOrNull",
  "sinh",
  "sipHash128",
  "sipHash128Keyed",
  "sipHash128Reference",
  "sipHash128ReferenceKeyed",
  "sipHash64",
  "sipHash64Keyed",
  "skewPop",
  "skewSamp",
  "sleep",
  "sleepEachRow",
  "snowflakeIDToDateTime",
  "snowflakeIDToDateTime64",
  "snowflakeToDateTime",
  "snowflakeToDateTime64",
  "soundex",
  "space",
  "sparkBar",
  "sparkbar",
  "sparseGrams",
  "sparseGramsHashes",
  "sparseGramsHashesUTF8",
  "sparseGramsUTF8",
  "splitByAlpha",
  "splitByChar",
  "splitByNonAlpha",
  "splitByRegexp",
  "splitByString",
  "splitByWhitespace",
  "sqid",
  "sqidDecode",
  "sqidEncode",
  "sqrt",
  "startsWith",
  "startsWithUTF8",
  "stddevPop",
  "stddevPopStable",
  "stddevSamp",
  "stddevSampStable",
  "stem",
  "stochasticLinearRegression",
  "stochasticLogisticRegression",
  "str_to_date",
  "str_to_map",
  "stringBytesEntropy",
  "stringBytesUniq",
  "stringJaccardIndex",
  "stringJaccardIndexUTF8",
  "stringToH3",
  "structureToCapnProtoSchema",
  "structureToProtobufSchema",
  "studentTTest",
  "subBitmap",
  "subDate",
  "substr",
  "substring",
  "substringIndex",
  "substringIndexUTF8",
  "substringUTF8",
  "subtractDays",
  "subtractHours",
  "subtractInterval",
  "subtractMicroseconds",
  "subtractMilliseconds",
  "subtractMinutes",
  "subtractMonths",
  "subtractNanoseconds",
  "subtractQuarters",
  "subtractSeconds",
  "subtractTupleOfIntervals",
  "subtractWeeks",
  "subtractYears",
  "sum",
  "sumCount",
  "sumKahan",
  "sumMapFiltered",
  "sumMapFilteredWithOverflow",
  "sumMapWithOverflow",
  "sumMappedArrays",
  "sumWithOverflow",
  "svg",
  "synonyms",
  "tan",
  "tanh",
  "tcpPort",
  "tgamma",
  "theilsU",
  "throwIf",
  "tid",
  "timeDiff",
  "timeSeriesDeltaToGrid",
  "timeSeriesDerivToGrid",
  "timeSeriesFromGrid",
  "timeSeriesGroupArray",
  "timeSeriesIdToTags",
  "timeSeriesIdToTagsGroup",
  "timeSeriesIdeltaToGrid",
  "timeSeriesInstantDeltaToGrid",
  "timeSeriesInstantRateToGrid",
  "timeSeriesIrateToGrid",
  "timeSeriesLastToGrid",
  "timeSeriesLastTwoSamples",
  "timeSeriesPredictLinearToGrid",
  "timeSeriesRange",
  "timeSeriesRateToGrid",
  "timeSeriesResampleToGridWithStaleness",
  "timeSeriesStoreTags",
  "timeSeriesTagsGroupToTags",
  "timeSlot",
  "timeSlots",
  "timeZone",
  "timeZoneOf",
  "timeZoneOffset",
  "time_bucket",
  "timestamp",
  "timestampDiff",
  "timestamp_diff",
  "timezone",
  "timezoneOf",
  "timezoneOffset",
  "toBFloat16",
  "toBFloat16OrNull",
  "toBFloat16OrZero",
  "toBool",
  "toColumnTypeName",
  "toDate",
  "toDate32",
  "toDate32OrDefault",
  "toDate32OrNull",
  "toDate32OrZero",
  "toDateOrDefault",
  "toDateOrNull",
  "toDateOrZero",
  "toDateTime",
  "toDateTime32",
  "toDateTime64",
  "toDateTime64OrDefault",
  "toDateTime64OrNull",
  "toDateTime64OrZero",
  "toDateTimeOrDefault",
  "toDateTimeOrNull",
  "toDateTimeOrZero",
  "toDayOfMonth",
  "toDayOfWeek",
  "toDayOfYear",
  "toDaysSinceYearZero",
  "toDecimal128",
  "toDecimal128OrDefault",
  "toDecimal128OrNull",
  "toDecimal128OrZero",
  "toDecimal256",
  "toDecimal256OrDefault",
  "toDecimal256OrNull",
  "toDecimal256OrZero",
  "toDecimal32",
  "toDecimal32OrDefault",
  "toDecimal32OrNull",
  "toDecimal32OrZero",
  "toDecimal64",
  "toDecimal64OrDefault",
  "toDecimal64OrNull",
  "toDecimal64OrZero",
  "toDecimalString",
  "toFixedString",
  "toFloat32",
  "toFloat32OrDefault",
  "toFloat32OrNull",
  "toFloat32OrZero",
  "toFloat64",
  "toFloat64OrDefault",
  "toFloat64OrNull",
  "toFloat64OrZero",
  "toHour",
  "toIPv4",
  "toIPv4OrDefault",
  "toIPv4OrNull",
  "toIPv4OrZero",
  "toIPv6",
  "toIPv6OrDefault",
  "toIPv6OrNull",
  "toIPv6OrZero",
  "toISOWeek",
  "toISOYear",
  "toInt128",
  "toInt128OrDefault",
  "toInt128OrNull",
  "toInt128OrZero",
  "toInt16",
  "toInt16OrDefault",
  "toInt16OrNull",
  "toInt16OrZero",
  "toInt256",
  "toInt256OrDefault",
  "toInt256OrNull",
  "toInt256OrZero",
  "toInt32",
  "toInt32OrDefault",
  "toInt32OrNull",
  "toInt32OrZero",
  "toInt64",
  "toInt64OrDefault",
  "toInt64OrNull",
  "toInt64OrZero",
  "toInt8",
  "toInt8OrDefault",
  "toInt8OrNull",
  "toInt8OrZero",
  "toInterval",
  "toIntervalDay",
  "toIntervalHour",
  "toIntervalMicrosecond",
  "toIntervalMillisecond",
  "toIntervalMinute",
  "toIntervalMonth",
  "toIntervalNanosecond",
  "toIntervalQuarter",
  "toIntervalSecond",
  "toIntervalWeek",
  "toIntervalYear",
  "toJSONString",
  "toLastDayOfMonth",
  "toLastDayOfWeek",
  "toLowCardinality",
  "toMillisecond",
  "toMinute",
  "toModifiedJulianDay",
  "toModifiedJulianDayOrNull",
  "toMonday",
  "toMonth",
  "toMonthNumSinceEpoch",
  "toNullable",
  "toQuarter",
  "toRelativeDayNum",
  "toRelativeHourNum",
  "toRelativeMinuteNum",
  "toRelativeMonthNum",
  "toRelativeQuarterNum",
  "toRelativeSecondNum",
  "toRelativeWeekNum",
  "toRelativeYearNum",
  "toSecond",
  "toStartOfDay",
  "toStartOfFifteenMinutes",
  "toStartOfFiveMinute",
  "toStartOfFiveMinutes",
  "toStartOfHour",
  "toStartOfISOYear",
  "toStartOfInterval",
  "toStartOfMicrosecond",
  "toStartOfMillisecond",
  "toStartOfMinute",
  "toStartOfMonth",
  "toStartOfNanosecond",
  "toStartOfQuarter",
  "toStartOfSecond",
  "toStartOfTenMinutes",
  "toStartOfWeek",
  "toStartOfYear",
  "toString",
  "toStringCutToZero",
  "toTime",
  "toTime64",
  "toTime64OrNull",
  "toTime64OrZero",
  "toTimeOrNull",
  "toTimeOrZero",
  "toTimeWithFixedDate",
  "toTimeZone",
  "toTimezone",
  "toTypeName",
  "toUInt128",
  "toUInt128OrDefault",
  "toUInt128OrNull",
  "toUInt128OrZero",
  "toUInt16",
  "toUInt16OrDefault",
  "toUInt16OrNull",
  "toUInt16OrZero",
  "toUInt256",
  "toUInt256OrDefault",
  "toUInt256OrNull",
  "toUInt256OrZero",
  "toUInt32",
  "toUInt32OrDefault",
  "toUInt32OrNull",
  "toUInt32OrZero",
  "toUInt64",
  "toUInt64OrDefault",
  "toUInt64OrNull",
  "toUInt64OrZero",
  "toUInt8",
  "toUInt8OrDefault",
  "toUInt8OrNull",
  "toUInt8OrZero",
  "toUTCTimestamp",
  "toUUID",
  "toUUIDOrDefault",
  "toUUIDOrNull",
  "toUUIDOrZero",
  "toUnixTimestamp",
  "toUnixTimestamp64Micro",
  "toUnixTimestamp64Milli",
  "toUnixTimestamp64Nano",
  "toUnixTimestamp64Second",
  "toValidUTF8",
  "toWeek",
  "toYYYYMM",
  "toYYYYMMDD",
  "toYYYYMMDDhhmmss",
  "toYear",
  "toYearNumSinceEpoch",
  "toYearWeek",
  "to_utc_timestamp",
  "today",
  "tokens",
  "topK",
  "topKWeighted",
  "topLevelDomain",
  "topLevelDomainRFC",
  "transactionID",
  "transactionLatestSnapshot",
  "transactionOldestSnapshot",
  "transform",
  "translate",
  "translateUTF8",
  "trim",
  "trimBoth",
  "trimLeft",
  "trimRight",
  "trunc",
  // truncate() is a function, but the TRUNCATE keyword is a statement type.
  // 'truncate',
  "tryBase32Decode",
  "tryBase58Decode",
  "tryBase64Decode",
  "tryBase64URLDecode",
  "tryDecrypt",
  "tryIdnaEncode",
  "tryPunycodeDecode",
  "tumble",
  "tumbleEnd",
  "tumbleStart",
  "tuple",
  "tupleConcat",
  "tupleDivide",
  "tupleDivideByNumber",
  "tupleElement",
  "tupleHammingDistance",
  "tupleIntDiv",
  "tupleIntDivByNumber",
  "tupleIntDivOrZero",
  "tupleIntDivOrZeroByNumber",
  "tupleMinus",
  "tupleModulo",
  "tupleModuloByNumber",
  "tupleMultiply",
  "tupleMultiplyByNumber",
  "tupleNames",
  "tupleNegate",
  "tuplePlus",
  "tupleToNameValuePairs",
  "ucase",
  "unbin",
  "unhex",
  "uniq",
  "uniqCombined",
  "uniqCombined64",
  "uniqExact",
  "uniqHLL12",
  "uniqTheta",
  "uniqThetaIntersect",
  "uniqThetaNot",
  "uniqThetaUnion",
  "uniqUpTo",
  "upper",
  "upperUTF8",
  "uptime",
  "user",
  "validateNestedArraySizes",
  "varPop",
  "varPopStable",
  "varSamp",
  "varSampStable",
  "variantElement",
  "variantType",
  "vectorDifference",
  "vectorSum",
  "version",
  "visibleWidth",
  "visitParamExtractBool",
  "visitParamExtractFloat",
  "visitParamExtractInt",
  "visitParamExtractRaw",
  "visitParamExtractString",
  "visitParamExtractUInt",
  "visitParamHas",
  "week",
  "welchTTest",
  "widthBucket",
  "width_bucket",
  "windowFunnel",
  "windowID",
  "wkb",
  "wkt",
  "wordShingleMinHash",
  "wordShingleMinHashArg",
  "wordShingleMinHashArgCaseInsensitive",
  "wordShingleMinHashArgCaseInsensitiveUTF8",
  "wordShingleMinHashArgUTF8",
  "wordShingleMinHashCaseInsensitive",
  "wordShingleMinHashCaseInsensitiveUTF8",
  "wordShingleMinHashUTF8",
  "wordShingleSimHash",
  "wordShingleSimHashCaseInsensitive",
  "wordShingleSimHashCaseInsensitiveUTF8",
  "wordShingleSimHashUTF8",
  "wyHash64",
  "xor",
  "xxHash32",
  "xxHash64",
  "xxh3",
  "yandexConsistentHash",
  "yearweek",
  "yesterday",
  "zookeeperSessionUptime",
  // Table Engines
  // https://clickhouse.com/docs/engines/table-engines
  "MergeTree",
  "ReplacingMergeTree",
  "SummingMergeTree",
  "AggregatingMergeTree",
  "CollapsingMergeTree",
  "VersionedCollapsingMergeTree",
  "GraphiteMergeTree",
  "CoalescingMergeTree",
  // Database Engines
  // https://clickhouse.com/docs/engines/database-engines
  "Atomic",
  "Shared",
  "Lazy",
  "Replicated",
  "PostgreSQL",
  "MySQL",
  "SQLite",
  // Disabling this because it's more likely to be used in a GRANT statement as a permission.
  // 'Backup',
  "MaterializedPostgreSQL",
  "DataLakeCatalog"
], je = [
  // Derived from https://github.com/ClickHouse/ClickHouse/blob/827a7ef9f6d727ef511fea7785a1243541509efb/tests/fuzz/dictionaries/keywords.dict#L4
  "ACCESS",
  "ACTION",
  "ADD",
  "ADMIN",
  "AFTER",
  "ALGORITHM",
  "ALIAS",
  "ALL",
  "ALLOWED_LATENESS",
  "ALTER",
  "AND",
  "ANTI",
  "APPEND",
  "APPLY",
  "AS",
  "ASC",
  "ASCENDING",
  "ASOF",
  "ASSUME",
  "AST",
  "ASYNC",
  "ATTACH",
  "AUTO_INCREMENT",
  "AZURE",
  "BACKUP",
  "BAGEXPANSION",
  "BASE_BACKUP",
  "BCRYPT_HASH",
  "BCRYPT_PASSWORD",
  "BEGIN",
  "BETWEEN",
  "BIDIRECTIONAL",
  "BOTH",
  "BY",
  "CACHE",
  "CACHES",
  "CASCADE",
  "CASE",
  "CHANGE",
  "CHANGEABLE_IN_READONLY",
  "CHANGED",
  "CHARACTER",
  "CHECK",
  "CLEANUP",
  "CLEAR",
  "CLUSTER",
  "CLUSTERS",
  "CLUSTER_HOST_IDS",
  "CN",
  "CODEC",
  "COLLATE",
  "COLLECTION",
  "COLUMN",
  "COLUMNS",
  "COMMENT",
  "COMMIT",
  "COMPRESSION",
  "CONST",
  "CONSTRAINT",
  "CREATE",
  "CROSS",
  "CUBE",
  "CURRENT",
  "D",
  "DATA",
  "DATABASE",
  "DATABASES",
  "DAYS",
  "DD",
  "DDL",
  "DEDUPLICATE",
  "DEFAULT",
  "DEFINER",
  "DELAY",
  "DELETE",
  "DELETED",
  "DEPENDS",
  "DESC",
  "DESCENDING",
  "DESCRIBE",
  "DETACH",
  "DETACHED",
  "DICTIONARIES",
  "DICTIONARY",
  "DISK",
  "DISTINCT",
  "DIV",
  "DOUBLE_SHA1_HASH",
  "DOUBLE_SHA1_PASSWORD",
  "DROP",
  "ELSE",
  "ENABLED",
  "END",
  "ENFORCED",
  "ENGINE",
  "ENGINES",
  "EPHEMERAL",
  "ESTIMATE",
  "EVENT",
  "EVENTS",
  "EVERY",
  "EXCEPT",
  "EXCHANGE",
  "EXISTS",
  "EXPLAIN",
  "EXPRESSION",
  "EXTENDED",
  "EXTERNAL",
  "FAKE",
  "FALSE",
  "FETCH",
  "FIELDS",
  "FILESYSTEM",
  "FILL",
  "FILTER",
  "FINAL",
  "FIRST",
  "FOLLOWING",
  "FOR",
  "FOREIGN",
  "FORMAT",
  "FREEZE",
  "FROM",
  "FULL",
  "FULLTEXT",
  "FUNCTION",
  "FUNCTIONS",
  "GLOBAL",
  "GRANT",
  "GRANTEES",
  "GRANTS",
  "GRANULARITY",
  "GROUP",
  "GROUPING",
  "GROUPS",
  "H",
  "HASH",
  "HAVING",
  "HDFS",
  "HH",
  "HIERARCHICAL",
  "HOST",
  "HOURS",
  "HTTP",
  // Disabling this because it's a keyword, but formats far more than
  // it should.
  // 'ID',
  "IDENTIFIED",
  "ILIKE",
  "IN",
  "INDEX",
  "INDEXES",
  "INDICES",
  "INFILE",
  "INHERIT",
  "INJECTIVE",
  "INNER",
  "INSERT",
  "INTERPOLATE",
  "INTERSECT",
  "INTERVAL",
  "INTO",
  "INVISIBLE",
  "INVOKER",
  "IP",
  "IS",
  "IS_OBJECT_ID",
  "JOIN",
  "JWT",
  "KERBEROS",
  "KEY",
  "KEYED",
  "KEYS",
  "KILL",
  "KIND",
  "LARGE",
  "LAST",
  "LAYOUT",
  "LDAP",
  "LEADING",
  "LEVEL",
  "LIFETIME",
  "LIGHTWEIGHT",
  "LIKE",
  "LIMIT",
  "LIMITS",
  "LINEAR",
  "LIST",
  "LIVE",
  "LOCAL",
  "M",
  "MASK",
  "MATERIALIZED",
  "MCS",
  "MEMORY",
  "MERGES",
  "METRICS",
  "MI",
  "MICROSECOND",
  "MICROSECONDS",
  "MILLISECONDS",
  "MINUTES",
  "MM",
  "MODIFY",
  "MONTHS",
  "MOVE",
  "MS",
  "MUTATION",
  "N",
  "NAME",
  "NAMED",
  "NANOSECOND",
  "NANOSECONDS",
  "NEXT",
  "NO",
  "NONE",
  "NOT",
  "NO_PASSWORD",
  "NS",
  "NULL",
  "NULLS",
  "OBJECT",
  "OFFSET",
  "ON",
  "ONLY",
  "OPTIMIZE",
  "OPTION",
  "OR",
  "ORDER",
  "OUTER",
  "OUTFILE",
  "OVER",
  "OVERRIDABLE",
  "OVERRIDE",
  "PART",
  "PARTIAL",
  "PARTITION",
  "PARTITIONS",
  "PART_MOVE_TO_SHARD",
  "PASTE",
  "PERIODIC",
  "PERMANENTLY",
  "PERMISSIVE",
  "PERSISTENT",
  "PIPELINE",
  "PLAINTEXT_PASSWORD",
  "PLAN",
  "POLICY",
  "POPULATE",
  "PRECEDING",
  "PRECISION",
  "PREWHERE",
  "PRIMARY",
  "PRIVILEGES",
  "PROCESSLIST",
  "PROFILE",
  "PROJECTION",
  "PROTOBUF",
  "PULL",
  "Q",
  "QQ",
  "QUALIFY",
  "QUARTERS",
  "QUERY",
  "QUOTA",
  "RANDOMIZE",
  "RANDOMIZED",
  "RANGE",
  "READONLY",
  "REALM",
  "RECOMPRESS",
  "RECURSIVE",
  "REFERENCES",
  "REFRESH",
  "REGEXP",
  "REMOVE",
  "RENAME",
  "RESET",
  "RESPECT",
  "RESTORE",
  "RESTRICT",
  "RESTRICTIVE",
  "RESUME",
  "REVOKE",
  "ROLE",
  "ROLES",
  "ROLLBACK",
  "ROLLUP",
  "ROW",
  "ROWS",
  "S",
  "S3",
  "SALT",
  "SAMPLE",
  "SAN",
  "SCHEME",
  "SECONDS",
  "SECURITY",
  "SELECT",
  "SEMI",
  "SEQUENTIAL",
  "SERVER",
  "SET",
  "SETS",
  "SETTING",
  "SETTINGS",
  "SHA256_HASH",
  "SHA256_PASSWORD",
  "SHARD",
  "SHOW",
  "SIGNED",
  "SIMPLE",
  "SNAPSHOT",
  "SOURCE",
  "SPATIAL",
  "SQL",
  "SQL_TSI_DAY",
  "SQL_TSI_HOUR",
  "SQL_TSI_MICROSECOND",
  "SQL_TSI_MILLISECOND",
  "SQL_TSI_MINUTE",
  "SQL_TSI_MONTH",
  "SQL_TSI_NANOSECOND",
  "SQL_TSI_QUARTER",
  "SQL_TSI_SECOND",
  "SQL_TSI_WEEK",
  "SQL_TSI_YEAR",
  "SS",
  "SSH_KEY",
  "SSL_CERTIFICATE",
  "STALENESS",
  "START",
  "STATISTICS",
  "STDOUT",
  "STEP",
  "STORAGE",
  "STRICT",
  "STRICTLY_ASCENDING",
  "SUBPARTITION",
  "SUBPARTITIONS",
  "SUSPEND",
  "SYNC",
  "SYNTAX",
  "SYSTEM",
  "TABLE",
  "TABLES",
  "TAGS",
  "TEMPORARY",
  "TEST",
  "THAN",
  "THEN",
  "TIES",
  "TIME",
  "TO",
  "TOP",
  "TOTALS",
  "TRACKING",
  "TRAILING",
  "TRANSACTION",
  "TREE",
  "TRIGGER",
  "TRUE",
  "TRUNCATE",
  "TTL",
  "TYPE",
  "TYPEOF",
  "UNBOUNDED",
  "UNDROP",
  "UNFREEZE",
  "UNION",
  "UNIQUE",
  "UNSET",
  "UNSIGNED",
  "UNTIL",
  "UPDATE",
  "URL",
  "USE",
  "USING",
  "UUID",
  "VALID",
  "VALUES",
  "VARYING",
  "VIEW",
  "VISIBLE",
  "VOLUME",
  "WATCH",
  "WATERMARK",
  "WEEKS",
  "WHEN",
  "WHERE",
  "WINDOW",
  "WITH",
  "WITH_ITEMINDEX",
  "WK",
  "WRITABLE",
  "WW",
  "YEARS",
  "YY",
  "YYYY",
  "ZKPATH"
], ze = [
  // Derived from `SELECT name FROM system.data_type_families ORDER BY name` on Clickhouse Cloud
  // as of November 14, 2025.
  "AGGREGATEFUNCTION",
  "ARRAY",
  "BFLOAT16",
  "BIGINT",
  "BIGINT SIGNED",
  "BIGINT UNSIGNED",
  "BINARY",
  "BINARY LARGE OBJECT",
  "BINARY VARYING",
  "BIT",
  "BLOB",
  "BYTE",
  "BYTEA",
  "BOOL",
  "CHAR",
  "CHAR LARGE OBJECT",
  "CHAR VARYING",
  "CHARACTER",
  "CHARACTER LARGE OBJECT",
  "CHARACTER VARYING",
  "CLOB",
  "DEC",
  "DOUBLE",
  "DOUBLE PRECISION",
  "DATE",
  "DATE32",
  "DATETIME",
  "DATETIME32",
  "DATETIME64",
  "DECIMAL",
  "DECIMAL128",
  "DECIMAL256",
  "DECIMAL32",
  "DECIMAL64",
  "DYNAMIC",
  "ENUM",
  "ENUM",
  "ENUM16",
  "ENUM8",
  "FIXED",
  "FLOAT",
  "FIXEDSTRING",
  "FLOAT32",
  "FLOAT64",
  "GEOMETRY",
  "INET4",
  "INET6",
  "INT",
  "INT SIGNED",
  "INT UNSIGNED",
  "INT1",
  "INT1 SIGNED",
  "INT1 UNSIGNED",
  "INTEGER",
  "INTEGER SIGNED",
  "INTEGER UNSIGNED",
  "IPV4",
  "IPV6",
  "INT128",
  "INT16",
  "INT256",
  "INT32",
  "INT64",
  "INT8",
  "INTERVALDAY",
  "INTERVALHOUR",
  "INTERVALMICROSECOND",
  "INTERVALMILLISECOND",
  "INTERVALMINUTE",
  "INTERVALMONTH",
  "INTERVALNANOSECOND",
  "INTERVALQUARTER",
  "INTERVALSECOND",
  "INTERVALWEEK",
  "INTERVALYEAR",
  "JSON",
  "LONGBLOB",
  "LONGTEXT",
  "LINESTRING",
  "LOWCARDINALITY",
  "MEDIUMBLOB",
  "MEDIUMINT",
  "MEDIUMINT SIGNED",
  "MEDIUMINT UNSIGNED",
  "MEDIUMTEXT",
  "MAP",
  "MULTILINESTRING",
  "MULTIPOLYGON",
  "NATIONAL CHAR",
  "NATIONAL CHAR VARYING",
  "NATIONAL CHARACTER",
  "NATIONAL CHARACTER LARGE OBJECT",
  "NATIONAL CHARACTER VARYING",
  "NCHAR",
  "NCHAR LARGE OBJECT",
  "NCHAR VARYING",
  "NUMERIC",
  "NVARCHAR",
  "NESTED",
  "NOTHING",
  "NULLABLE",
  "OBJECT",
  "POINT",
  "POLYGON",
  "REAL",
  "RING",
  "SET",
  "SIGNED",
  "SINGLE",
  "SMALLINT",
  "SMALLINT SIGNED",
  "SMALLINT UNSIGNED",
  "SIMPLEAGGREGATEFUNCTION",
  "STRING",
  "TEXT",
  "TIMESTAMP",
  "TINYBLOB",
  "TINYINT",
  "TINYINT SIGNED",
  "TINYINT UNSIGNED",
  "TINYTEXT",
  "TIME",
  "TIME64",
  "TUPLE",
  "UINT128",
  "UINT16",
  "UINT256",
  "UINT32",
  "UINT64",
  "UINT8",
  "UNSIGNED",
  "UUID",
  "VARBINARY",
  "VARCHAR",
  "VARCHAR2",
  "VARIANT",
  "YEAR",
  "BOOL",
  "BOOLEAN"
], ER = S([
  "SELECT [DISTINCT]",
  // https://clickhouse.com/docs/sql-reference/statements/alter/view
  "MODIFY QUERY SELECT [DISTINCT]"
]), TR = S([
  "SET",
  // https://clickhouse.com/docs/sql-reference/statements/select
  "WITH",
  "FROM",
  "SAMPLE",
  "PREWHERE",
  "WHERE",
  "GROUP BY",
  "HAVING",
  "QUALIFY",
  "ORDER BY",
  "LIMIT",
  "SETTINGS",
  "INTO OUTFILE",
  "FORMAT",
  // https://clickhouse.com/docs/sql-reference/window-functions
  "WINDOW",
  "PARTITION BY",
  // https://clickhouse.com/docs/sql-reference/statements/insert-into
  "INSERT INTO",
  "VALUES",
  // https://clickhouse.com/docs/sql-reference/statements/create/view#refreshable-materialized-view
  "DEPENDS ON",
  // https://clickhouse.com/docs/sql-reference/statements/move
  "MOVE {USER | ROLE | QUOTA | SETTINGS PROFILE | ROW POLICY}",
  // https://clickhouse.com/docs/sql-reference/statements/grant
  "GRANT",
  // https://clickhouse.com/docs/sql-reference/statements/revoke
  "REVOKE",
  // https://clickhouse.com/docs/sql-reference/statements/check-grant
  "CHECK GRANT",
  // https://clickhouse.com/docs/sql-reference/statements/set-role
  "SET [DEFAULT] ROLE [NONE | ALL | ALL EXCEPT]",
  // https://clickhouse.com/docs/sql-reference/statements/optimize
  "DEDUPLICATE BY",
  // https://clickhouse.com/docs/sql-reference/statements/alter/statistics
  "MODIFY STATISTICS",
  // Used for ALTER INDEX ... TYPE and ALTER STATISTICS ... TYPE
  "TYPE",
  // https://clickhouse.com/docs/sql-reference/statements/alter
  "ALTER USER [IF EXISTS]",
  "ALTER [ROW] POLICY [IF EXISTS]",
  // https://clickhouse.com/docs/sql-reference/statements/drop
  "DROP {USER | ROLE | QUOTA | PROFILE | SETTINGS PROFILE | ROW POLICY | POLICY} [IF EXISTS]"
]), rT = S([
  // https://clickhouse.com/docs/sql-reference/statements/create
  "CREATE [OR REPLACE] [TEMPORARY] TABLE [IF NOT EXISTS]"
]), ME = S([
  "ALL EXCEPT",
  "ON CLUSTER",
  // https://clickhouse.com/docs/sql-reference/statements/update
  "UPDATE",
  // https://clickhouse.com/docs/sql-reference/statements/system
  "SYSTEM RELOAD {DICTIONARIES | DICTIONARY | FUNCTIONS | FUNCTION | ASYNCHRONOUS METRICS}",
  "SYSTEM DROP {DNS CACHE | MARK CACHE | ICEBERG METADATA CACHE | TEXT INDEX DICTIONARY CACHE | TEXT INDEX HEADER CACHE | TEXT INDEX POSTINGS CACHE | REPLICA | DATABASE REPLICA | UNCOMPRESSED CACHE | COMPILED EXPRESSION CACHE | QUERY CONDITION CACHE | QUERY CACHE | FORMAT SCHEMA CACHE | FILESYSTEM CACHE}",
  "SYSTEM FLUSH LOGS",
  "SYSTEM RELOAD {CONFIG | USERS}",
  "SYSTEM SHUTDOWN",
  "SYSTEM KILL",
  "SYSTEM FLUSH DISTRIBUTED",
  "SYSTEM START DISTRIBUTED SENDS",
  "SYSTEM {STOP | START} {LISTEN | MERGES | TTL MERGES | MOVES | FETCHES | REPLICATED SENDS | REPLICATION QUEUES | PULLING REPLICATION LOG}",
  "SYSTEM {SYNC | RESTART | RESTORE} REPLICA",
  "SYSTEM {SYNC | RESTORE} DATABASE REPLICA",
  "SYSTEM RESTART REPLICAS",
  "SYSTEM UNFREEZE",
  "SYSTEM WAIT LOADING PARTS",
  "SYSTEM {LOAD | UNLOAD} PRIMARY KEY",
  "SYSTEM {STOP | START} [REPLICATED] VIEW",
  "SYSTEM {STOP | START} VIEWS",
  "SYSTEM {REFRESH | CANCEL | WAIT} VIEW",
  "WITH NAME",
  // https://clickhouse.com/docs/sql-reference/statements/show
  "SHOW [CREATE] {TABLE | TEMPORARY TABLE | DICTIONARY | VIEW | DATABASE}",
  "SHOW DATABASES [[NOT] {LIKE | ILIKE}]",
  "SHOW [FULL] [TEMPORARY] TABLES [FROM | IN]",
  "SHOW [EXTENDED] [FULL] COLUMNS {FROM | IN}",
  // https://clickhouse.com/docs/sql-reference/statements/attach
  "ATTACH {TABLE | DICTIONARY | DATABASE} [IF NOT EXISTS]",
  // https://clickhouse.com/docs/sql-reference/statements/detach
  "DETACH {TABLE | DICTIONARY | DATABASE} [IF EXISTS]",
  "PERMANENTLY",
  "SYNC",
  // https://clickhouse.com/docs/sql-reference/statements/drop
  "DROP {DICTIONARY | DATABASE | PROFILE | VIEW | FUNCTION | NAMED COLLECTION} [IF EXISTS]",
  "DROP [TEMPORARY] TABLE [IF EXISTS] [IF EMPTY]",
  // https://clickhouse.com/docs/sql-reference/statements/alter/table#rename
  "RENAME TO",
  // https://clickhouse.com/docs/sql-reference/statements/exists
  "EXISTS [TEMPORARY] {TABLE | DICTIONARY | DATABASE}",
  // https://clickhouse.com/docs/sql-reference/statements/kill
  "KILL QUERY",
  // https://clickhouse.com/docs/sql-reference/statements/optimize
  "OPTIMIZE TABLE",
  // https://clickhouse.com/docs/sql-reference/statements/rename
  "RENAME {TABLE | DICTIONARY | DATABASE}",
  // https://clickhouse.com/docs/sql-reference/statements/exchange
  "EXCHANGE {TABLES | DICTIONARIES}",
  // https://clickhouse.com/docs/sql-reference/statements/truncate
  "TRUNCATE TABLE [IF EXISTS]",
  // https://clickhouse.com/docs/sql-reference/statements/execute_as
  "EXECUTE AS",
  // https://clickhouse.com/docs/sql-reference/statements/use
  "USE",
  "TO",
  // https://clickhouse.com/docs/sql-reference/statements/undrop
  "UNDROP TABLE",
  // https://clickhouse.com/docs/sql-reference/statements/create
  "CREATE {DATABASE | NAMED COLLECTION} [IF NOT EXISTS]",
  "CREATE [OR REPLACE] {VIEW | DICTIONARY} [IF NOT EXISTS]",
  "CREATE MATERIALIZED VIEW [IF NOT EXISTS]",
  "CREATE FUNCTION",
  "CREATE {USER | ROLE | QUOTA | SETTINGS PROFILE} [IF NOT EXISTS | OR REPLACE]",
  "CREATE [ROW] POLICY [IF NOT EXISTS | OR REPLACE]",
  // https://clickhouse.com/docs/sql-reference/statements/create/table#replace-table
  "REPLACE [TEMPORARY] TABLE [IF NOT EXISTS]",
  // https://clickhouse.com/docs/sql-reference/statements/alter
  "ALTER {ROLE | QUOTA | SETTINGS PROFILE} [IF EXISTS]",
  "ALTER [TEMPORARY] TABLE",
  "ALTER NAMED COLLECTION [IF EXISTS]",
  // https://clickhouse.com/docs/sql-reference/statements/alter/user
  "GRANTEES",
  "NOT IDENTIFIED",
  "RESET AUTHENTICATION METHODS TO NEW",
  "{IDENTIFIED | ADD IDENTIFIED} [WITH | BY]",
  "[ADD | DROP] HOST {LOCAL | NAME | REGEXP | IP | LIKE}",
  "VALID UNTIL",
  "DROP [ALL] {PROFILES | SETTINGS}",
  "{ADD | MODIFY} SETTINGS",
  "ADD PROFILES",
  // https://clickhouse.com/docs/sql-reference/statements/alter/apply-deleted-mask
  "APPLY DELETED MASK",
  "IN PARTITION",
  // https://clickhouse.com/docs/sql-reference/statements/alter/column
  "{ADD | DROP | RENAME | CLEAR | COMMENT | MODIFY | ALTER | MATERIALIZE} COLUMN",
  // https://clickhouse.com/docs/sql-reference/statements/alter/partition
  "{DETACH | DROP | ATTACH | FETCH | MOVE} {PART | PARTITION}",
  "DROP DETACHED {PART | PARTITION}",
  "{FORGET | REPLACE} PARTITION",
  "CLEAR COLUMN",
  "{FREEZE | UNFREEZE} [PARTITION]",
  "CLEAR INDEX",
  "TO {DISK | VOLUME}",
  "[DELETE | REWRITE PARTS] IN PARTITION",
  // https://clickhouse.com/docs/sql-reference/statements/alter/setting
  "{MODIFY | RESET} SETTING",
  // https://clickhouse.com/docs/sql-reference/statements/alter/delete
  "DELETE WHERE",
  // https://clickhouse.com/docs/sql-reference/statements/alter/order-by
  "MODIFY ORDER BY",
  // https://clickhouse.com/docs/sql-reference/statements/alter/sample-by
  "{MODIFY | REMOVE} SAMPLE BY",
  // https://clickhouse.com/docs/sql-reference/statements/alter/skipping-index
  "{ADD | MATERIALIZE | CLEAR} INDEX [IF NOT EXISTS]",
  "DROP INDEX [IF EXISTS]",
  "GRANULARITY",
  "AFTER",
  "FIRST",
  // https://clickhouse.com/docs/sql-reference/statements/alter/constraint
  "ADD CONSTRAINT [IF NOT EXISTS]",
  "DROP CONSTRAINT [IF EXISTS]",
  // https://clickhouse.com/docs/sql-reference/statements/alter/ttl
  "MODIFY TTL",
  "REMOVE TTL",
  // https://clickhouse.com/docs/sql-reference/statements/alter/statistics
  "ADD STATISTICS [IF NOT EXISTS]",
  "{DROP | CLEAR} STATISTICS [IF EXISTS]",
  "MATERIALIZE STATISTICS [ALL | IF EXISTS]",
  // https://clickhouse.com/docs/sql-reference/statements/alter/quota
  "KEYED BY",
  "NOT KEYED",
  "FOR [RANDOMIZED] INTERVAL",
  // https://clickhouse.com/docs/sql-reference/statements/alter/row-policy
  "AS {PERMISSIVE | RESTRICTIVE}",
  "FOR SELECT",
  // https://clickhouse.com/docs/sql-reference/statements/alter/projection
  "ADD PROJECTION [IF NOT EXISTS]",
  "{DROP | MATERIALIZE | CLEAR} PROJECTION [IF EXISTS]",
  // https://clickhouse.com/docs/sql-reference/statements/create/view#refreshable-materialized-view
  "REFRESH {EVERY | AFTER}",
  "RANDOMIZE FOR",
  "APPEND",
  "APPEND TO",
  // https://clickhouse.com/docs/sql-reference/statements/delete
  "DELETE FROM",
  // https://clickhouse.com/docs/sql-reference/statements/explain
  "EXPLAIN [AST | SYNTAX | QUERY TREE | PLAN | PIPELINE | ESTIMATE | TABLE OVERRIDE]",
  // https://clickhouse.com/docs/sql-reference/statements/grant
  "GRANT ON CLUSTER",
  "GRANT CURRENT GRANTS",
  "WITH GRANT OPTION",
  // https://clickhouse.com/docs/sql-reference/statements/revoke
  "REVOKE ON CLUSTER",
  "ADMIN OPTION FOR",
  // https://clickhouse.com/docs/sql-reference/statements/check-table
  "CHECK TABLE",
  "PARTITION ID",
  // https://clickhouse.com/docs/sql-reference/statements/describe-table
  "{DESC | DESCRIBE} TABLE"
]), eR = S([
  // https://clickhouse.com/docs/sql-reference/statements/select/union
  "UNION [ALL | DISTINCT]",
  // https://clickhouse.com/docs/sql-reference/statements/parallel_with
  "PARALLEL WITH"
]), RR = S([
  // https://clickhouse.com/docs/sql-reference/statements/select/join
  "[GLOBAL] [INNER|LEFT|RIGHT|FULL|CROSS] [OUTER|SEMI|ANTI|ANY|ALL|ASOF] JOIN",
  // https://clickhouse.com/docs/sql-reference/statements/select/array-join
  "[LEFT] ARRAY JOIN"
]), AR = S([
  "{ROWS | RANGE} BETWEEN",
  "ALTER MATERIALIZE STATISTICS"
]), tR = {
  name: "clickhouse",
  tokenizerOptions: {
    reservedSelect: ER,
    reservedClauses: [...TR, ...rT, ...ME],
    reservedSetOperations: eR,
    reservedJoins: RR,
    reservedKeywordPhrases: AR,
    reservedKeywords: je,
    reservedDataTypes: ze,
    reservedFunctionNames: Ze,
    extraParens: ["[]", "{}"],
    lineCommentTypes: ["#", "--"],
    nestedBlockComments: !1,
    underscoresInNumbers: !0,
    stringTypes: ["$$", "''-qq-bs"],
    identTypes: ['""-qq-bs', "``"],
    paramTypes: {
      // https://clickhouse.com/docs/sql-reference/syntax#defining-and-using-query-parameters
      custom: [
        {
          // Parameters are like {foo:Uint64} or {foo:Map(String, String)}
          // We include `'` in the negated character class to be a little sneaky:
          // map literals have quoted keys, and we use this to avoid confusing
          // them for named parameters. This means that the map literal `{'foo':1}`
          // will be formatted as `{'foo': 1}` rather than `{foo: 1}`.
          regex: String.raw`\{[^:']+:[^}]+\}`,
          key: (E) => {
            const T = /\{([^:]+):/.exec(E);
            return T ? T[1].trim() : E;
          }
        }
      ]
    },
    operators: [
      // Strings, arithmetic
      "%",
      "||",
      // Ternary
      "?",
      ":",
      // Comparison
      "==",
      "<=>",
      // Lambda creation
      "->"
    ],
    postProcess: SR
  },
  formatOptions: {
    onelineClauses: [...rT, ...ME],
    tabularOnelineClauses: ME
  }
};
function SR(E) {
  return E.map((T, e) => {
    const R = E[e + 1] || w, t = E[e - 1] || w;
    return T.type === C.RESERVED_SELECT && (R.type === C.COMMA || t.type === C.RESERVED_CLAUSE || t.type === C.COMMA) ? Object.assign(Object.assign({}, T), { type: C.RESERVED_KEYWORD }) : J.SET(T) && R.type === C.OPEN_PAREN ? Object.assign(Object.assign({}, T), { type: C.RESERVED_FUNCTION_NAME }) : T;
  });
}
const IR = [
  // https://www.ibm.com/docs/en/db2/11.5?topic=bif-aggregate-functions
  "ARRAY_AGG",
  "AVG",
  "CORRELATION",
  "COUNT",
  "COUNT_BIG",
  "COVARIANCE",
  "COVARIANCE_SAMP",
  "CUME_DIST",
  "GROUPING",
  "LISTAGG",
  "MAX",
  "MEDIAN",
  "MIN",
  "PERCENTILE_CONT",
  "PERCENTILE_DISC",
  "PERCENT_RANK",
  "REGR_AVGX",
  "REGR_AVGY",
  "REGR_COUNT",
  "REGR_INTERCEPT",
  "REGR_ICPT",
  "REGR_R2",
  "REGR_SLOPE",
  "REGR_SXX",
  "REGR_SXY",
  "REGR_SYY",
  "STDDEV",
  "STDDEV_SAMP",
  "SUM",
  "VARIANCE",
  "VARIANCE_SAMP",
  "XMLAGG",
  "XMLGROUP",
  // https://www.ibm.com/docs/en/db2/11.5?topic=bif-scalar-functions
  "ABS",
  "ABSVAL",
  "ACOS",
  "ADD_DAYS",
  "ADD_HOURS",
  "ADD_MINUTES",
  "ADD_MONTHS",
  "ADD_SECONDS",
  "ADD_YEARS",
  "AGE",
  "ARRAY_DELETE",
  "ARRAY_FIRST",
  "ARRAY_LAST",
  "ARRAY_NEXT",
  "ARRAY_PRIOR",
  "ASCII",
  "ASCII_STR",
  "ASIN",
  "ATAN",
  "ATAN2",
  "ATANH",
  "BITAND",
  "BITANDNOT",
  "BITOR",
  "BITXOR",
  "BITNOT",
  "BPCHAR",
  "BSON_TO_JSON",
  "BTRIM",
  "CARDINALITY",
  "CEILING",
  "CEIL",
  "CHARACTER_LENGTH",
  "CHR",
  "COALESCE",
  "COLLATION_KEY",
  "COLLATION_KEY_BIT",
  "COMPARE_DECFLOAT",
  "CONCAT",
  "COS",
  "COSH",
  "COT",
  "CURSOR_ROWCOUNT",
  "DATAPARTITIONNUM",
  "DATE_PART",
  "DATE_TRUNC",
  "DAY",
  "DAYNAME",
  "DAYOFMONTH",
  "DAYOFWEEK",
  "DAYOFWEEK_ISO",
  "DAYOFYEAR",
  "DAYS",
  "DAYS_BETWEEN",
  "DAYS_TO_END_OF_MONTH",
  "DBPARTITIONNUM",
  "DECFLOAT",
  "DECFLOAT_FORMAT",
  "DECODE",
  "DECRYPT_BIN",
  "DECRYPT_CHAR",
  "DEGREES",
  "DEREF",
  "DIFFERENCE",
  "DIGITS",
  "DOUBLE_PRECISION",
  "EMPTY_BLOB",
  "EMPTY_CLOB",
  "EMPTY_DBCLOB",
  "EMPTY_NCLOB",
  "ENCRYPT",
  "EVENT_MON_STATE",
  "EXP",
  "EXTRACT",
  "FIRST_DAY",
  "FLOOR",
  "FROM_UTC_TIMESTAMP",
  "GENERATE_UNIQUE",
  "GETHINT",
  "GREATEST",
  "HASH",
  "HASH4",
  "HASH8",
  "HASHEDVALUE",
  "HEX",
  "HEXTORAW",
  "HOUR",
  "HOURS_BETWEEN",
  "IDENTITY_VAL_LOCAL",
  "IFNULL",
  "INITCAP",
  "INSERT",
  "INSTR",
  "INSTR2",
  "INSTR4",
  "INSTRB",
  "INTNAND",
  "INTNOR",
  "INTNXOR",
  "INTNNOT",
  "ISNULL",
  "JSON_ARRAY",
  "JSON_OBJECT",
  "JSON_QUERY",
  "JSON_TO_BSON",
  "JSON_VALUE",
  "JULIAN_DAY",
  "LAST_DAY",
  "LCASE",
  "LEAST",
  "LEFT",
  "LENGTH",
  "LENGTH2",
  "LENGTH4",
  "LENGTHB",
  "LN",
  "LOCATE",
  "LOCATE_IN_STRING",
  "LOG10",
  "LONG_VARCHAR",
  "LONG_VARGRAPHIC",
  "LOWER",
  "LPAD",
  "LTRIM",
  "MAX",
  "MAX_CARDINALITY",
  "MICROSECOND",
  "MIDNIGHT_SECONDS",
  "MIN",
  "MINUTE",
  "MINUTES_BETWEEN",
  "MOD",
  "MONTH",
  "MONTHNAME",
  "MONTHS_BETWEEN",
  "MULTIPLY_ALT",
  "NEXT_DAY",
  "NEXT_MONTH",
  "NEXT_QUARTER",
  "NEXT_WEEK",
  "NEXT_YEAR",
  "NORMALIZE_DECFLOAT",
  "NOW",
  "NULLIF",
  "NVL",
  "NVL2",
  "OCTET_LENGTH",
  "OVERLAY",
  "PARAMETER",
  "POSITION",
  "POSSTR",
  "POW",
  "POWER",
  "QUANTIZE",
  "QUARTER",
  "QUOTE_IDENT",
  "QUOTE_LITERAL",
  "RADIANS",
  "RAISE_ERROR",
  "RAND",
  "RANDOM",
  "RAWTOHEX",
  "REC2XML",
  "REGEXP_COUNT",
  "REGEXP_EXTRACT",
  "REGEXP_INSTR",
  "REGEXP_LIKE",
  "REGEXP_MATCH_COUNT",
  "REGEXP_REPLACE",
  "REGEXP_SUBSTR",
  "REPEAT",
  "REPLACE",
  "RID",
  "RID_BIT",
  "RIGHT",
  "ROUND",
  "ROUND_TIMESTAMP",
  "RPAD",
  "RTRIM",
  "SECLABEL",
  "SECLABEL_BY_NAME",
  "SECLABEL_TO_CHAR",
  "SECOND",
  "SECONDS_BETWEEN",
  "SIGN",
  "SIN",
  "SINH",
  "SOUNDEX",
  "SPACE",
  "SQRT",
  "STRIP",
  "STRLEFT",
  "STRPOS",
  "STRRIGHT",
  "SUBSTR",
  "SUBSTR2",
  "SUBSTR4",
  "SUBSTRB",
  "SUBSTRING",
  "TABLE_NAME",
  "TABLE_SCHEMA",
  "TAN",
  "TANH",
  "THIS_MONTH",
  "THIS_QUARTER",
  "THIS_WEEK",
  "THIS_YEAR",
  "TIMESTAMP_FORMAT",
  "TIMESTAMP_ISO",
  "TIMESTAMPDIFF",
  "TIMEZONE",
  "TO_CHAR",
  "TO_CLOB",
  "TO_DATE",
  "TO_HEX",
  "TO_MULTI_BYTE",
  "TO_NCHAR",
  "TO_NCLOB",
  "TO_NUMBER",
  "TO_SINGLE_BYTE",
  "TO_TIMESTAMP",
  "TO_UTC_TIMESTAMP",
  "TOTALORDER",
  "TRANSLATE",
  "TRIM",
  "TRIM_ARRAY",
  "TRUNC_TIMESTAMP",
  "TRUNCATE",
  "TRUNC",
  "TYPE_ID",
  "TYPE_NAME",
  "TYPE_SCHEMA",
  "UCASE",
  "UNICODE_STR",
  "UPPER",
  "VALUE",
  "VARCHAR_BIT_FORMAT",
  "VARCHAR_FORMAT",
  "VARCHAR_FORMAT_BIT",
  "VERIFY_GROUP_FOR_USER",
  "VERIFY_ROLE_FOR_USER",
  "VERIFY_TRUSTED_CONTEXT_ROLE_FOR_USER",
  "WEEK",
  "WEEK_ISO",
  "WEEKS_BETWEEN",
  "WIDTH_BUCKET",
  "XMLATTRIBUTES",
  "XMLCOMMENT",
  "XMLCONCAT",
  "XMLDOCUMENT",
  "XMLELEMENT",
  "XMLFOREST",
  "XMLNAMESPACES",
  "XMLPARSE",
  "XMLPI",
  "XMLQUERY",
  "XMLROW",
  "XMLSERIALIZE",
  "XMLTEXT",
  "XMLVALIDATE",
  "XMLXSROBJECTID",
  "XSLTRANSFORM",
  "YEAR",
  "YEARS_BETWEEN",
  "YMD_BETWEEN",
  // https://www.ibm.com/docs/en/db2/11.5?topic=bif-table-functions
  "BASE_TABLE",
  "JSON_TABLE",
  "UNNEST",
  "XMLTABLE",
  // https://www.ibm.com/docs/en/db2/11.5?topic=expressions-olap-specification
  // Additional function names not already present in the aggregate functions list
  "RANK",
  "DENSE_RANK",
  "NTILE",
  "LAG",
  "LEAD",
  "ROW_NUMBER",
  "FIRST_VALUE",
  "LAST_VALUE",
  "NTH_VALUE",
  "RATIO_TO_REPORT",
  // Type casting
  "CAST"
], NR = [
  // https://www.ibm.com/docs/en/db2/11.5?topic=sql-reserved-schema-names-reserved-words
  "ACTIVATE",
  "ADD",
  "AFTER",
  "ALIAS",
  "ALL",
  "ALLOCATE",
  "ALLOW",
  "ALTER",
  "AND",
  "ANY",
  "AS",
  "ASENSITIVE",
  "ASSOCIATE",
  "ASUTIME",
  "AT",
  "ATTRIBUTES",
  "AUDIT",
  "AUTHORIZATION",
  "AUX",
  "AUXILIARY",
  "BEFORE",
  "BEGIN",
  "BETWEEN",
  "BINARY",
  "BUFFERPOOL",
  "BY",
  "CACHE",
  "CALL",
  "CALLED",
  "CAPTURE",
  "CARDINALITY",
  "CASCADED",
  "CASE",
  "CAST",
  "CHECK",
  "CLONE",
  "CLOSE",
  "CLUSTER",
  "COLLECTION",
  "COLLID",
  "COLUMN",
  "COMMENT",
  "COMMIT",
  "CONCAT",
  "CONDITION",
  "CONNECT",
  "CONNECTION",
  "CONSTRAINT",
  "CONTAINS",
  "CONTINUE",
  "COUNT",
  "COUNT_BIG",
  "CREATE",
  "CROSS",
  "CURRENT",
  "CURRENT_DATE",
  "CURRENT_LC_CTYPE",
  "CURRENT_PATH",
  "CURRENT_SCHEMA",
  "CURRENT_SERVER",
  "CURRENT_TIME",
  "CURRENT_TIMESTAMP",
  "CURRENT_TIMEZONE",
  "CURRENT_USER",
  "CURSOR",
  "CYCLE",
  "DATA",
  "DATABASE",
  "DATAPARTITIONNAME",
  "DATAPARTITIONNUM",
  "DAY",
  "DAYS",
  "DB2GENERAL",
  "DB2GENRL",
  "DB2SQL",
  "DBINFO",
  "DBPARTITIONNAME",
  "DBPARTITIONNUM",
  "DEALLOCATE",
  "DECLARE",
  "DEFAULT",
  "DEFAULTS",
  "DEFINITION",
  "DELETE",
  "DENSERANK",
  "DENSE_RANK",
  "DESCRIBE",
  "DESCRIPTOR",
  "DETERMINISTIC",
  "DIAGNOSTICS",
  "DISABLE",
  "DISALLOW",
  "DISCONNECT",
  "DISTINCT",
  "DO",
  "DOCUMENT",
  "DROP",
  "DSSIZE",
  "DYNAMIC",
  "EACH",
  "EDITPROC",
  "ELSE",
  "ELSEIF",
  "ENABLE",
  "ENCODING",
  "ENCRYPTION",
  "END",
  "END-EXEC",
  "ENDING",
  "ERASE",
  "ESCAPE",
  "EVERY",
  "EXCEPT",
  "EXCEPTION",
  "EXCLUDING",
  "EXCLUSIVE",
  "EXECUTE",
  "EXISTS",
  "EXIT",
  "EXPLAIN",
  "EXTENDED",
  "EXTERNAL",
  "EXTRACT",
  "FENCED",
  "FETCH",
  "FIELDPROC",
  "FILE",
  "FINAL",
  "FIRST1",
  "FOR",
  "FOREIGN",
  "FREE",
  "FROM",
  "FULL",
  "FUNCTION",
  "GENERAL",
  "GENERATED",
  "GET",
  "GLOBAL",
  "GO",
  "GOTO",
  "GRANT",
  "GRAPHIC",
  "GROUP",
  "HANDLER",
  "HASH",
  "HASHED_VALUE",
  "HAVING",
  "HINT",
  "HOLD",
  "HOUR",
  "HOURS",
  "IDENTITY",
  "IF",
  "IMMEDIATE",
  "IMPORT",
  "IN",
  "INCLUDING",
  "INCLUSIVE",
  "INCREMENT",
  "INDEX",
  "INDICATOR",
  "INDICATORS",
  "INF",
  "INFINITY",
  "INHERIT",
  "INNER",
  "INOUT",
  "INSENSITIVE",
  "INSERT",
  "INTEGRITY",
  "INTERSECT",
  "INTO",
  "IS",
  "ISNULL",
  "ISOBID",
  "ISOLATION",
  "ITERATE",
  "JAR",
  "JAVA",
  "JOIN",
  "KEEP",
  "KEY",
  "LABEL",
  "LANGUAGE",
  "LAST3",
  "LATERAL",
  "LC_CTYPE",
  "LEAVE",
  "LEFT",
  "LIKE",
  "LIMIT",
  "LINKTYPE",
  "LOCAL",
  "LOCALDATE",
  "LOCALE",
  "LOCALTIME",
  "LOCALTIMESTAMP",
  "LOCATOR",
  "LOCATORS",
  "LOCK",
  "LOCKMAX",
  "LOCKSIZE",
  "LOOP",
  "MAINTAINED",
  "MATERIALIZED",
  "MAXVALUE",
  "MICROSECOND",
  "MICROSECONDS",
  "MINUTE",
  "MINUTES",
  "MINVALUE",
  "MODE",
  "MODIFIES",
  "MONTH",
  "MONTHS",
  "NAN",
  "NEW",
  "NEW_TABLE",
  "NEXTVAL",
  "NO",
  "NOCACHE",
  "NOCYCLE",
  "NODENAME",
  "NODENUMBER",
  "NOMAXVALUE",
  "NOMINVALUE",
  "NONE",
  "NOORDER",
  "NORMALIZED",
  "NOT2",
  "NOTNULL",
  "NULL",
  "NULLS",
  "NUMPARTS",
  "OBID",
  "OF",
  "OFF",
  "OFFSET",
  "OLD",
  "OLD_TABLE",
  "ON",
  "OPEN",
  "OPTIMIZATION",
  "OPTIMIZE",
  "OPTION",
  "OR",
  "ORDER",
  "OUT",
  "OUTER",
  "OVER",
  "OVERRIDING",
  "PACKAGE",
  "PADDED",
  "PAGESIZE",
  "PARAMETER",
  "PART",
  "PARTITION",
  "PARTITIONED",
  "PARTITIONING",
  "PARTITIONS",
  "PASSWORD",
  "PATH",
  "PERCENT",
  "PIECESIZE",
  "PLAN",
  "POSITION",
  "PRECISION",
  "PREPARE",
  "PREVVAL",
  "PRIMARY",
  "PRIQTY",
  "PRIVILEGES",
  "PROCEDURE",
  "PROGRAM",
  "PSID",
  "PUBLIC",
  "QUERY",
  "QUERYNO",
  "RANGE",
  "RANK",
  "READ",
  "READS",
  "RECOVERY",
  "REFERENCES",
  "REFERENCING",
  "REFRESH",
  "RELEASE",
  "RENAME",
  "REPEAT",
  "RESET",
  "RESIGNAL",
  "RESTART",
  "RESTRICT",
  "RESULT",
  "RESULT_SET_LOCATOR",
  "RETURN",
  "RETURNS",
  "REVOKE",
  "RIGHT",
  "ROLE",
  "ROLLBACK",
  "ROUND_CEILING",
  "ROUND_DOWN",
  "ROUND_FLOOR",
  "ROUND_HALF_DOWN",
  "ROUND_HALF_EVEN",
  "ROUND_HALF_UP",
  "ROUND_UP",
  "ROUTINE",
  "ROW",
  "ROWNUMBER",
  "ROWS",
  "ROWSET",
  "ROW_NUMBER",
  "RRN",
  "RUN",
  "SAVEPOINT",
  "SCHEMA",
  "SCRATCHPAD",
  "SCROLL",
  "SEARCH",
  "SECOND",
  "SECONDS",
  "SECQTY",
  "SECURITY",
  "SELECT",
  "SENSITIVE",
  "SEQUENCE",
  "SESSION",
  "SESSION_USER",
  "SET",
  "SIGNAL",
  "SIMPLE",
  "SNAN",
  "SOME",
  "SOURCE",
  "SPECIFIC",
  "SQL",
  "SQLID",
  "STACKED",
  "STANDARD",
  "START",
  "STARTING",
  "STATEMENT",
  "STATIC",
  "STATMENT",
  "STAY",
  "STOGROUP",
  "STORES",
  "STYLE",
  "SUBSTRING",
  "SUMMARY",
  "SYNONYM",
  "SYSFUN",
  "SYSIBM",
  "SYSPROC",
  "SYSTEM",
  "SYSTEM_USER",
  "TABLE",
  "TABLESPACE",
  "THEN",
  "TO",
  "TRANSACTION",
  "TRIGGER",
  "TRIM",
  "TRUNCATE",
  "TYPE",
  "UNDO",
  "UNION",
  "UNIQUE",
  "UNTIL",
  "UPDATE",
  "USAGE",
  "USER",
  "USING",
  "VALIDPROC",
  "VALUE",
  "VALUES",
  "VARIABLE",
  "VARIANT",
  "VCAT",
  "VERSION",
  "VIEW",
  "VOLATILE",
  "VOLUMES",
  "WHEN",
  "WHENEVER",
  "WHERE",
  "WHILE",
  "WITH",
  "WITHOUT",
  "WLM",
  "WRITE",
  "XMLELEMENT",
  "XMLEXISTS",
  "XMLNAMESPACES",
  "YEAR",
  "YEARS"
], sR = [
  // https://www.ibm.com/docs/en/db2-for-zos/12?topic=columns-data-types
  "ARRAY",
  "BIGINT",
  "BINARY",
  "BLOB",
  "BOOLEAN",
  "CCSID",
  "CHAR",
  "CHARACTER",
  "CLOB",
  "DATE",
  "DATETIME",
  "DBCLOB",
  "DEC",
  "DECIMAL",
  "DOUBLE",
  "DOUBLE PRECISION",
  "FLOAT",
  "FLOAT4",
  "FLOAT8",
  "GRAPHIC",
  "INT",
  "INT2",
  "INT4",
  "INT8",
  "INTEGER",
  "INTERVAL",
  "LONG VARCHAR",
  "LONG VARGRAPHIC",
  "NCHAR",
  "NCHR",
  "NCLOB",
  "NVARCHAR",
  "NUMERIC",
  "SMALLINT",
  "REAL",
  "TIME",
  "TIMESTAMP",
  "VARBINARY",
  "VARCHAR",
  "VARGRAPHIC"
], rR = S(["SELECT [ALL | DISTINCT]"]), nR = S([
  // queries
  "WITH",
  "FROM",
  "WHERE",
  "GROUP BY",
  "HAVING",
  "PARTITION BY",
  "ORDER BY [INPUT SEQUENCE]",
  "LIMIT",
  "OFFSET",
  "FETCH NEXT",
  "FOR UPDATE [OF]",
  "FOR {READ | FETCH} ONLY",
  "FOR {RR | CS | UR | RS} [USE AND KEEP {SHARE | UPDATE | EXCLUSIVE} LOCKS]",
  "WAIT FOR OUTCOME",
  "SKIP LOCKED DATA",
  "INTO",
  // Data modification
  // - insert:
  "INSERT INTO",
  "VALUES",
  // - update:
  "SET",
  // - merge:
  "MERGE INTO",
  "WHEN [NOT] MATCHED [THEN]",
  "UPDATE SET",
  "INSERT"
]), nT = S([
  "CREATE [GLOBAL TEMPORARY | EXTERNAL] TABLE [IF NOT EXISTS]"
]), UE = S([
  // - create:
  "CREATE [OR REPLACE] VIEW",
  // - update:
  "UPDATE",
  "WHERE CURRENT OF",
  "WITH {RR | RS | CS | UR}",
  // - delete:
  "DELETE FROM",
  // - drop table:
  "DROP TABLE [IF EXISTS]",
  // alter table:
  "ALTER TABLE",
  "ADD [COLUMN]",
  "DROP [COLUMN]",
  "RENAME COLUMN",
  "ALTER [COLUMN]",
  "SET DATA TYPE",
  "SET NOT NULL",
  "DROP {DEFAULT | GENERATED | NOT NULL}",
  // - truncate:
  "TRUNCATE [TABLE]",
  // https://www.ibm.com/docs/en/db2/11.5?topic=s-statements
  "ALLOCATE",
  "ALTER AUDIT POLICY",
  "ALTER BUFFERPOOL",
  "ALTER DATABASE PARTITION GROUP",
  "ALTER DATABASE",
  "ALTER EVENT MONITOR",
  "ALTER FUNCTION",
  "ALTER HISTOGRAM TEMPLATE",
  "ALTER INDEX",
  "ALTER MASK",
  "ALTER METHOD",
  "ALTER MODULE",
  "ALTER NICKNAME",
  "ALTER PACKAGE",
  "ALTER PERMISSION",
  "ALTER PROCEDURE",
  "ALTER SCHEMA",
  "ALTER SECURITY LABEL COMPONENT",
  "ALTER SECURITY POLICY",
  "ALTER SEQUENCE",
  "ALTER SERVER",
  "ALTER SERVICE CLASS",
  "ALTER STOGROUP",
  "ALTER TABLESPACE",
  "ALTER THRESHOLD",
  "ALTER TRIGGER",
  "ALTER TRUSTED CONTEXT",
  "ALTER TYPE",
  "ALTER USAGE LIST",
  "ALTER USER MAPPING",
  "ALTER VIEW",
  "ALTER WORK ACTION SET",
  "ALTER WORK CLASS SET",
  "ALTER WORKLOAD",
  "ALTER WRAPPER",
  "ALTER XSROBJECT",
  "ALTER STOGROUP",
  "ALTER TABLESPACE",
  "ALTER TRIGGER",
  "ALTER TRUSTED CONTEXT",
  "ALTER VIEW",
  "ASSOCIATE [RESULT SET] {LOCATOR | LOCATORS}",
  "AUDIT",
  "BEGIN DECLARE SECTION",
  "CALL",
  "CLOSE",
  "COMMENT ON",
  "COMMIT [WORK]",
  "CONNECT",
  "CREATE [OR REPLACE] [PUBLIC] ALIAS",
  "CREATE AUDIT POLICY",
  "CREATE BUFFERPOOL",
  "CREATE DATABASE PARTITION GROUP",
  "CREATE EVENT MONITOR",
  "CREATE [OR REPLACE] FUNCTION",
  "CREATE FUNCTION MAPPING",
  "CREATE HISTOGRAM TEMPLATE",
  "CREATE [UNIQUE] INDEX",
  "CREATE INDEX EXTENSION",
  "CREATE [OR REPLACE] MASK",
  "CREATE [SPECIFIC] METHOD",
  "CREATE [OR REPLACE] MODULE",
  "CREATE [OR REPLACE] NICKNAME",
  "CREATE [OR REPLACE] PERMISSION",
  "CREATE [OR REPLACE] PROCEDURE",
  "CREATE ROLE",
  "CREATE SCHEMA",
  "CREATE SECURITY LABEL [COMPONENT]",
  "CREATE SECURITY POLICY",
  "CREATE [OR REPLACE] SEQUENCE",
  "CREATE SERVICE CLASS",
  "CREATE SERVER",
  "CREATE STOGROUP",
  "CREATE SYNONYM",
  "CREATE [LARGE | REGULAR | {SYSTEM | USER} TEMPORARY] TABLESPACE",
  "CREATE THRESHOLD",
  "CREATE {TRANSFORM | TRANSFORMS} FOR",
  "CREATE [OR REPLACE] TRIGGER",
  "CREATE TRUSTED CONTEXT",
  "CREATE [OR REPLACE] TYPE",
  "CREATE TYPE MAPPING",
  "CREATE USAGE LIST",
  "CREATE USER MAPPING FOR",
  "CREATE [OR REPLACE] VARIABLE",
  "CREATE WORK ACTION SET",
  "CREATE WORK CLASS SET",
  "CREATE WORKLOAD",
  "CREATE WRAPPER",
  "DECLARE",
  "DECLARE GLOBAL TEMPORARY TABLE",
  "DESCRIBE [INPUT | OUTPUT]",
  "DISCONNECT",
  "DROP [PUBLIC] ALIAS",
  "DROP AUDIT POLICY",
  "DROP BUFFERPOOL",
  "DROP DATABASE PARTITION GROUP",
  "DROP EVENT MONITOR",
  "DROP [SPECIFIC] FUNCTION",
  "DROP FUNCTION MAPPING",
  "DROP HISTOGRAM TEMPLATE",
  "DROP INDEX [EXTENSION]",
  "DROP MASK",
  "DROP [SPECIFIC] METHOD",
  "DROP MODULE",
  "DROP NICKNAME",
  "DROP PACKAGE",
  "DROP PERMISSION",
  "DROP [SPECIFIC] PROCEDURE",
  "DROP ROLE",
  "DROP SCHEMA",
  "DROP SECURITY LABEL [COMPONENT]",
  "DROP SECURITY POLICY",
  "DROP SEQUENCE",
  "DROP SERVER",
  "DROP SERVICE CLASS",
  "DROP STOGROUP",
  "DROP TABLE HIERARCHY",
  "DROP {TABLESPACE | TABLESPACES}",
  "DROP {TRANSFORM | TRANSFORMS}",
  "DROP THRESHOLD",
  "DROP TRIGGER",
  "DROP TRUSTED CONTEXT",
  "DROP TYPE [MAPPING]",
  "DROP USAGE LIST",
  "DROP USER MAPPING FOR",
  "DROP VARIABLE",
  "DROP VIEW [HIERARCHY]",
  "DROP WORK {ACTION | CLASS} SET",
  "DROP WORKLOAD",
  "DROP WRAPPER",
  "DROP XSROBJECT",
  "END DECLARE SECTION",
  "EXECUTE [IMMEDIATE]",
  "EXPLAIN {PLAN [SECTION] | ALL}",
  "FETCH [FROM]",
  "FLUSH {BUFFERPOOL | BUFFERPOOLS} ALL",
  "FLUSH EVENT MONITOR",
  "FLUSH FEDERATED CACHE",
  "FLUSH OPTIMIZATION PROFILE CACHE",
  "FLUSH PACKAGE CACHE [DYNAMIC]",
  "FLUSH AUTHENTICATION CACHE [FOR ALL]",
  "FREE LOCATOR",
  "GET DIAGNOSTICS",
  "GOTO",
  "GRANT",
  "INCLUDE",
  "ITERATE",
  "LEAVE",
  "LOCK TABLE",
  "LOOP",
  "OPEN",
  "PIPE",
  "PREPARE",
  "REFRESH TABLE",
  "RELEASE",
  "RELEASE [TO] SAVEPOINT",
  "RENAME [TABLE | INDEX | STOGROUP | TABLESPACE]",
  "REPEAT",
  "RESIGNAL",
  "RETURN",
  "REVOKE",
  "ROLLBACK [WORK] [TO SAVEPOINT]",
  "SAVEPOINT",
  "SET COMPILATION ENVIRONMENT",
  "SET CONNECTION",
  "SET CURRENT",
  "SET ENCRYPTION PASSWORD",
  "SET EVENT MONITOR STATE",
  "SET INTEGRITY",
  "SET PASSTHRU",
  "SET PATH",
  "SET ROLE",
  "SET SCHEMA",
  "SET SERVER OPTION",
  "SET {SESSION AUTHORIZATION | SESSION_USER}",
  "SET USAGE LIST",
  "SIGNAL",
  "TRANSFER OWNERSHIP OF",
  "WHENEVER {NOT FOUND | SQLERROR | SQLWARNING}",
  "WHILE"
]), aR = S(["UNION [ALL]", "EXCEPT [ALL]", "INTERSECT [ALL]"]), CR = S([
  "JOIN",
  "{LEFT | RIGHT | FULL} [OUTER] JOIN",
  "{INNER | CROSS} JOIN"
]), LR = S([
  "ON DELETE",
  "ON UPDATE",
  "SET NULL",
  "{ROWS | RANGE} BETWEEN"
]), oR = S([]), iR = {
  name: "db2",
  tokenizerOptions: {
    reservedSelect: rR,
    reservedClauses: [...nR, ...nT, ...UE],
    reservedSetOperations: aR,
    reservedJoins: CR,
    reservedKeywordPhrases: LR,
    reservedDataTypePhrases: oR,
    reservedKeywords: NR,
    reservedDataTypes: sR,
    reservedFunctionNames: IR,
    extraParens: ["[]"],
    stringTypes: [
      { quote: "''-qq", prefixes: ["G", "N", "U&"] },
      { quote: "''-raw", prefixes: ["X", "BX", "GX", "UX"], requirePrefix: !0 }
    ],
    identTypes: ['""-qq'],
    identChars: { first: "@#$", rest: "@#$" },
    paramTypes: { positional: !0, named: [":"] },
    paramChars: { first: "@#$", rest: "@#$" },
    operators: [
      "**",
      "%",
      "|",
      "&",
      "^",
      "~",
      "¬=",
      "¬>",
      "¬<",
      "!>",
      "!<",
      "^=",
      "^>",
      "^<",
      "||",
      "->",
      "=>"
    ]
  },
  formatOptions: {
    onelineClauses: [...nT, ...UE],
    tabularOnelineClauses: UE
  }
}, _R = [
  // https://www.ibm.com/docs/en/i/7.5?topic=functions-aggregate
  // TODO: 'ANY', - conflicts with test for ANY predicate in 'operators.ys'!!
  "ARRAY_AGG",
  "AVG",
  "CORR",
  "CORRELATION",
  "COUNT",
  "COUNT_BIG",
  "COVAR_POP",
  "COVARIANCE",
  "COVAR",
  "COVAR_SAMP",
  "COVARIANCE_SAMP",
  "EVERY",
  "GROUPING",
  "JSON_ARRAYAGG",
  "JSON_OBJECTAGG",
  "LISTAGG",
  "MAX",
  "MEDIAN",
  "MIN",
  "PERCENTILE_CONT",
  "PERCENTILE_DISC",
  // https://www.ibm.com/docs/en/i/7.5?topic=functions-regression'
  "REGR_AVGX",
  "REGR_AVGY",
  "REGR_COUNT",
  "REGR_INTERCEPT",
  "REGR_R2",
  "REGR_SLOPE",
  "REGR_SXX",
  "REGR_SXY",
  "REGR_SYY",
  "SOME",
  "STDDEV_POP",
  "STDDEV",
  "STDDEV_SAMP",
  "SUM",
  "VAR_POP",
  "VARIANCE",
  "VAR",
  "VAR_SAMP",
  "VARIANCE_SAMP",
  "XMLAGG",
  "XMLGROUP",
  // https://www.ibm.com/docs/en/i/7.5?topic=functions-scalar
  "ABS",
  "ABSVAL",
  "ACOS",
  "ADD_DAYS",
  "ADD_HOURS",
  "ADD_MINUTES",
  "ADD_MONTHS",
  "ADD_SECONDS",
  "ADD_YEARS",
  "ANTILOG",
  "ARRAY_MAX_CARDINALITY",
  "ARRAY_TRIM",
  "ASCII",
  "ASIN",
  "ATAN",
  "ATAN2",
  "ATANH",
  "BASE64_DECODE",
  "BASE64_ENCODE",
  "BIT_LENGTH",
  "BITAND",
  "BITANDNOT",
  "BITNOT",
  "BITOR",
  "BITXOR",
  "BSON_TO_JSON",
  "CARDINALITY",
  "CEIL",
  "CEILING",
  "CHAR_LENGTH",
  "CHARACTER_LENGTH",
  "CHR",
  "COALESCE",
  "COMPARE_DECFLOAT",
  "CONCAT",
  "CONTAINS",
  "COS",
  "COSH",
  "COT",
  "CURDATE",
  "CURTIME",
  "DATABASE",
  "DATAPARTITIONNAME",
  "DATAPARTITIONNUM",
  "DAY",
  "DAYNAME",
  "DAYOFMONTH",
  "DAYOFWEEK_ISO",
  "DAYOFWEEK",
  "DAYOFYEAR",
  "DAYS",
  "DBPARTITIONNAME",
  "DBPARTITIONNUM",
  "DECFLOAT_FORMAT",
  "DECFLOAT_SORTKEY",
  "DECRYPT_BINARY",
  "DECRYPT_BIT",
  "DECRYPT_CHAR",
  "DECRYPT_DB",
  "DEGREES",
  "DIFFERENCE",
  "DIGITS",
  "DLCOMMENT",
  "DLLINKTYPE",
  "DLURLCOMPLETE",
  "DLURLPATH",
  "DLURLPATHONLY",
  "DLURLSCHEME",
  "DLURLSERVER",
  "DLVALUE",
  "DOUBLE_PRECISION",
  "DOUBLE",
  "ENCRPYT",
  "ENCRYPT_AES",
  "ENCRYPT_AES256",
  "ENCRYPT_RC2",
  "ENCRYPT_TDES",
  "EXP",
  "EXTRACT",
  "FIRST_DAY",
  "FLOOR",
  "GENERATE_UNIQUE",
  "GET_BLOB_FROM_FILE",
  "GET_CLOB_FROM_FILE",
  "GET_DBCLOB_FROM_FILE",
  "GET_XML_FILE",
  "GETHINT",
  "GREATEST",
  "HASH_MD5",
  "HASH_ROW",
  "HASH_SHA1",
  "HASH_SHA256",
  "HASH_SHA512",
  "HASH_VALUES",
  "HASHED_VALUE",
  "HEX",
  "HEXTORAW",
  "HOUR",
  "HTML_ENTITY_DECODE",
  "HTML_ENTITY_ENCODE",
  "HTTP_DELETE_BLOB",
  "HTTP_DELETE",
  "HTTP_GET_BLOB",
  "HTTP_GET",
  "HTTP_PATCH_BLOB",
  "HTTP_PATCH",
  "HTTP_POST_BLOB",
  "HTTP_POST",
  "HTTP_PUT_BLOB",
  "HTTP_PUT",
  "IDENTITY_VAL_LOCAL",
  "IFNULL",
  "INSERT",
  "INSTR",
  "INTERPRET",
  "ISFALSE",
  "ISNOTFALSE",
  "ISNOTTRUE",
  "ISTRUE",
  "JSON_ARRAY",
  "JSON_OBJECT",
  "JSON_QUERY",
  "JSON_TO_BSON",
  "JSON_UPDATE",
  "JSON_VALUE",
  "JULIAN_DAY",
  "LAND",
  "LAST_DAY",
  "LCASE",
  "LEAST",
  "LEFT",
  "LENGTH",
  "LN",
  "LNOT",
  "LOCATE_IN_STRING",
  "LOCATE",
  "LOG10",
  "LOR",
  "LOWER",
  "LPAD",
  "LTRIM",
  "MAX_CARDINALITY",
  "MAX",
  "MICROSECOND",
  "MIDNIGHT_SECONDS",
  "MIN",
  "MINUTE",
  "MOD",
  "MONTH",
  "MONTHNAME",
  "MONTHS_BETWEEN",
  "MQREAD",
  "MQREADCLOB",
  "MQRECEIVE",
  "MQRECEIVECLOB",
  "MQSEND",
  "MULTIPLY_ALT",
  "NEXT_DAY",
  "NORMALIZE_DECFLOAT",
  "NOW",
  "NULLIF",
  "NVL",
  "OCTET_LENGTH",
  "OVERLAY",
  "PI",
  "POSITION",
  "POSSTR",
  "POW",
  "POWER",
  "QUANTIZE",
  "QUARTER",
  "RADIANS",
  "RAISE_ERROR",
  "RANDOM",
  "RAND",
  "REGEXP_COUNT",
  "REGEXP_INSTR",
  "REGEXP_REPLACE",
  "REGEXP_SUBSTR",
  "REPEAT",
  "REPLACE",
  "RID",
  "RIGHT",
  "ROUND_TIMESTAMP",
  "ROUND",
  "RPAD",
  "RRN",
  "RTRIM",
  "SCORE",
  "SECOND",
  "SIGN",
  "SIN",
  "SINH",
  "SOUNDEX",
  "SPACE",
  "SQRT",
  "STRIP",
  "STRLEFT",
  "STRPOS",
  "STRRIGHT",
  "SUBSTR",
  "SUBSTRING",
  "TABLE_NAME",
  "TABLE_SCHEMA",
  "TAN",
  "TANH",
  "TIMESTAMP_FORMAT",
  "TIMESTAMP_ISO",
  "TIMESTAMPDIFF_BIG",
  "TIMESTAMPDIFF",
  "TO_CHAR",
  "TO_CLOB",
  "TO_DATE",
  "TO_NUMBER",
  "TO_TIMESTAMP",
  "TOTALORDER",
  "TRANSLATE",
  "TRIM_ARRAY",
  "TRIM",
  "TRUNC_TIMESTAMP",
  "TRUNC",
  "TRUNCATE",
  "UCASE",
  "UPPER",
  "URL_DECODE",
  "URL_ENCODE",
  "VALUE",
  "VARBINARY_FORMAT",
  "VARCHAR_BIT_FORMAT",
  "VARCHAR_FORMAT_BINARY",
  "VARCHAR_FORMAT",
  "VERIFY_GROUP_FOR_USER",
  "WEEK_ISO",
  "WEEK",
  "WRAP",
  "XMLATTRIBUTES",
  "XMLCOMMENT",
  "XMLCONCAT",
  "XMLDOCUMENT",
  "XMLELEMENT",
  "XMLFOREST",
  "XMLNAMESPACES",
  "XMLPARSE",
  "XMLPI",
  "XMLROW",
  "XMLSERIALIZE",
  "XMLTEXT",
  "XMLVALIDATE",
  "XOR",
  "XSLTRANSFORM",
  "YEAR",
  "ZONED",
  // https://www.ibm.com/docs/en/i/7.5?topic=functions-table
  "BASE_TABLE",
  "HTTP_DELETE_BLOB_VERBOSE",
  "HTTP_DELETE_VERBOSE",
  "HTTP_GET_BLOB_VERBOSE",
  "HTTP_GET_VERBOSE",
  "HTTP_PATCH_BLOB_VERBOSE",
  "HTTP_PATCH_VERBOSE",
  "HTTP_POST_BLOB_VERBOSE",
  "HTTP_POST_VERBOSE",
  "HTTP_PUT_BLOB_VERBOSE",
  "HTTP_PUT_VERBOSE",
  "JSON_TABLE",
  "MQREADALL",
  "MQREADALLCLOB",
  "MQRECEIVEALL",
  "MQRECEIVEALLCLOB",
  "XMLTABLE",
  // https://www.ibm.com/docs/en/db2-for-zos/11?topic=functions-row
  "UNPACK",
  // https://www.ibm.com/docs/en/i/7.5?topic=expressions-olap-specifications
  "CUME_DIST",
  "DENSE_RANK",
  "FIRST_VALUE",
  "LAG",
  "LAST_VALUE",
  "LEAD",
  "NTH_VALUE",
  "NTILE",
  "PERCENT_RANK",
  "RANK",
  "RATIO_TO_REPORT",
  "ROW_NUMBER",
  // Type casting
  "CAST"
], DR = [
  // https://www.ibm.com/docs/en/i/7.5?topic=words-reserved
  // TODO: This list likely contains all keywords, not only the reserved ones,
  // try to filter it down to just the reserved keywords.
  "ABSENT",
  "ACCORDING",
  "ACCTNG",
  "ACTION",
  "ACTIVATE",
  "ADD",
  "ALIAS",
  "ALL",
  "ALLOCATE",
  "ALLOW",
  "ALTER",
  "AND",
  "ANY",
  "APPEND",
  "APPLNAME",
  "ARRAY",
  "ARRAY_AGG",
  "ARRAY_TRIM",
  "AS",
  "ASC",
  "ASENSITIVE",
  "ASSOCIATE",
  "ATOMIC",
  "ATTACH",
  "ATTRIBUTES",
  "AUTHORIZATION",
  "AUTONOMOUS",
  "BEFORE",
  "BEGIN",
  "BETWEEN",
  "BIND",
  "BSON",
  "BUFFERPOOL",
  "BY",
  "CACHE",
  "CALL",
  "CALLED",
  "CARDINALITY",
  "CASE",
  "CAST",
  "CHECK",
  "CL",
  "CLOSE",
  "CLUSTER",
  "COLLECT",
  "COLLECTION",
  "COLUMN",
  "COMMENT",
  "COMMIT",
  "COMPACT",
  "COMPARISONS",
  "COMPRESS",
  "CONCAT",
  "CONCURRENT",
  "CONDITION",
  "CONNECT",
  "CONNECT_BY_ROOT",
  "CONNECTION",
  "CONSTANT",
  "CONSTRAINT",
  "CONTAINS",
  "CONTENT",
  "CONTINUE",
  "COPY",
  "COUNT",
  "COUNT_BIG",
  "CREATE",
  "CREATEIN",
  "CROSS",
  "CUBE",
  "CUME_DIST",
  "CURRENT",
  "CURRENT_DATE",
  "CURRENT_PATH",
  "CURRENT_SCHEMA",
  "CURRENT_SERVER",
  "CURRENT_TIME",
  "CURRENT_TIMESTAMP",
  "CURRENT_TIMEZONE",
  "CURRENT_USER",
  "CURSOR",
  "CYCLE",
  "DATABASE",
  "DATAPARTITIONNAME",
  "DATAPARTITIONNUM",
  "DAY",
  "DAYS",
  "DB2GENERAL",
  "DB2GENRL",
  "DB2SQL",
  "DBINFO",
  "DBPARTITIONNAME",
  "DBPARTITIONNUM",
  "DEACTIVATE",
  "DEALLOCATE",
  "DECLARE",
  "DEFAULT",
  "DEFAULTS",
  "DEFER",
  "DEFINE",
  "DEFINITION",
  "DELETE",
  "DELETING",
  "DENSE_RANK",
  "DENSERANK",
  "DESC",
  "DESCRIBE",
  "DESCRIPTOR",
  "DETACH",
  "DETERMINISTIC",
  "DIAGNOSTICS",
  "DISABLE",
  "DISALLOW",
  "DISCONNECT",
  "DISTINCT",
  "DO",
  "DOCUMENT",
  "DROP",
  "DYNAMIC",
  "EACH",
  "ELSE",
  "ELSEIF",
  "EMPTY",
  "ENABLE",
  "ENCODING",
  "ENCRYPTION",
  "END",
  "END-EXEC",
  "ENDING",
  "ENFORCED",
  "ERROR",
  "ESCAPE",
  "EVERY",
  "EXCEPT",
  "EXCEPTION",
  "EXCLUDING",
  "EXCLUSIVE",
  "EXECUTE",
  "EXISTS",
  "EXIT",
  "EXTEND",
  "EXTERNAL",
  "EXTRACT",
  "FALSE",
  "FENCED",
  "FETCH",
  "FIELDPROC",
  "FILE",
  "FINAL",
  "FIRST_VALUE",
  "FOR",
  "FOREIGN",
  "FORMAT",
  "FREE",
  "FREEPAGE",
  "FROM",
  "FULL",
  "FUNCTION",
  "GBPCACHE",
  "GENERAL",
  "GENERATED",
  "GET",
  "GLOBAL",
  "GO",
  "GOTO",
  "GRANT",
  "GROUP",
  "HANDLER",
  "HASH",
  "HASH_ROW",
  "HASHED_VALUE",
  "HAVING",
  "HINT",
  "HOLD",
  "HOUR",
  "HOURS",
  // 'ID', Not actually a reserved keyword
  "IDENTITY",
  "IF",
  "IGNORE",
  "IMMEDIATE",
  "IMPLICITLY",
  "IN",
  "INCLUDE",
  "INCLUDING",
  "INCLUSIVE",
  "INCREMENT",
  "INDEX",
  "INDEXBP",
  "INDICATOR",
  "INF",
  "INFINITY",
  "INHERIT",
  "INLINE",
  "INNER",
  "INOUT",
  "INSENSITIVE",
  "INSERT",
  "INSERTING",
  "INTEGRITY",
  "INTERPRET",
  "INTERSECT",
  "INTO",
  "IS",
  "ISNULL",
  "ISOLATION",
  "ITERATE",
  "JAVA",
  "JOIN",
  "JSON",
  "JSON_ARRAY",
  "JSON_ARRAYAGG",
  "JSON_EXISTS",
  "JSON_OBJECT",
  "JSON_OBJECTAGG",
  "JSON_QUERY",
  "JSON_TABLE",
  "JSON_VALUE",
  "KEEP",
  "KEY",
  "KEYS",
  "LABEL",
  "LAG",
  "LANGUAGE",
  "LAST_VALUE",
  "LATERAL",
  "LEAD",
  "LEAVE",
  "LEFT",
  "LEVEL2",
  "LIKE",
  "LIMIT",
  "LINKTYPE",
  "LISTAGG",
  "LOCAL",
  "LOCALDATE",
  "LOCALTIME",
  "LOCALTIMESTAMP",
  "LOCATION",
  "LOCATOR",
  "LOCK",
  "LOCKSIZE",
  "LOG",
  "LOGGED",
  "LOOP",
  "MAINTAINED",
  "MASK",
  "MATCHED",
  "MATERIALIZED",
  "MAXVALUE",
  "MERGE",
  "MICROSECOND",
  "MICROSECONDS",
  "MINPCTUSED",
  "MINUTE",
  "MINUTES",
  "MINVALUE",
  "MIRROR",
  "MIXED",
  "MODE",
  "MODIFIES",
  "MONTH",
  "MONTHS",
  "NAMESPACE",
  "NAN",
  "NATIONAL",
  "NCHAR",
  "NCLOB",
  "NESTED",
  "NEW",
  "NEW_TABLE",
  "NEXTVAL",
  "NO",
  "NOCACHE",
  "NOCYCLE",
  "NODENAME",
  "NODENUMBER",
  "NOMAXVALUE",
  "NOMINVALUE",
  "NONE",
  "NOORDER",
  "NORMALIZED",
  "NOT",
  "NOTNULL",
  "NTH_VALUE",
  "NTILE",
  "NULL",
  "NULLS",
  "NVARCHAR",
  "OBID",
  "OBJECT",
  "OF",
  "OFF",
  "OFFSET",
  "OLD",
  "OLD_TABLE",
  "OMIT",
  "ON",
  "ONLY",
  "OPEN",
  "OPTIMIZE",
  "OPTION",
  "OR",
  "ORDER",
  "ORDINALITY",
  "ORGANIZE",
  "OUT",
  "OUTER",
  "OVER",
  "OVERLAY",
  "OVERRIDING",
  "PACKAGE",
  "PADDED",
  "PAGE",
  "PAGESIZE",
  "PARAMETER",
  "PART",
  "PARTITION",
  "PARTITIONED",
  "PARTITIONING",
  "PARTITIONS",
  "PASSING",
  "PASSWORD",
  "PATH",
  "PCTFREE",
  "PERCENT_RANK",
  "PERCENTILE_CONT",
  "PERCENTILE_DISC",
  "PERIOD",
  "PERMISSION",
  "PIECESIZE",
  "PIPE",
  "PLAN",
  "POSITION",
  "PREPARE",
  "PREVVAL",
  "PRIMARY",
  "PRIOR",
  "PRIQTY",
  "PRIVILEGES",
  "PROCEDURE",
  "PROGRAM",
  "PROGRAMID",
  "QUERY",
  "RANGE",
  "RANK",
  "RATIO_TO_REPORT",
  "RCDFMT",
  "READ",
  "READS",
  "RECOVERY",
  "REFERENCES",
  "REFERENCING",
  "REFRESH",
  "REGEXP_LIKE",
  "RELEASE",
  "RENAME",
  "REPEAT",
  "RESET",
  "RESIGNAL",
  "RESTART",
  "RESULT",
  "RESULT_SET_LOCATOR",
  "RETURN",
  "RETURNING",
  "RETURNS",
  "REVOKE",
  "RID",
  "RIGHT",
  "ROLLBACK",
  "ROLLUP",
  "ROUTINE",
  "ROW",
  "ROW_NUMBER",
  "ROWNUMBER",
  "ROWS",
  "RRN",
  "RUN",
  "SAVEPOINT",
  "SBCS",
  "SCALAR",
  "SCHEMA",
  "SCRATCHPAD",
  "SCROLL",
  "SEARCH",
  "SECOND",
  "SECONDS",
  "SECQTY",
  "SECURED",
  "SELECT",
  "SENSITIVE",
  "SEQUENCE",
  "SESSION",
  "SESSION_USER",
  "SET",
  "SIGNAL",
  "SIMPLE",
  "SKIP",
  "SNAN",
  "SOME",
  "SOURCE",
  "SPECIFIC",
  "SQL",
  "SQLID",
  "SQLIND_DEFAULT",
  "SQLIND_UNASSIGNED",
  "STACKED",
  "START",
  "STARTING",
  "STATEMENT",
  "STATIC",
  "STOGROUP",
  "SUBSTRING",
  "SUMMARY",
  "SYNONYM",
  "SYSTEM_TIME",
  "SYSTEM_USER",
  "TABLE",
  "TABLESPACE",
  "TABLESPACES",
  "TAG",
  "THEN",
  "THREADSAFE",
  "TO",
  "TRANSACTION",
  "TRANSFER",
  "TRIGGER",
  "TRIM",
  "TRIM_ARRAY",
  "TRUE",
  "TRUNCATE",
  "TRY_CAST",
  "TYPE",
  "UNDO",
  "UNION",
  "UNIQUE",
  "UNIT",
  "UNKNOWN",
  "UNNEST",
  "UNTIL",
  "UPDATE",
  "UPDATING",
  "URI",
  "USAGE",
  "USE",
  "USER",
  "USERID",
  "USING",
  "VALUE",
  "VALUES",
  "VARIABLE",
  "VARIANT",
  "VCAT",
  "VERSION",
  "VERSIONING",
  "VIEW",
  "VOLATILE",
  "WAIT",
  "WHEN",
  "WHENEVER",
  "WHERE",
  "WHILE",
  "WITH",
  "WITHIN",
  "WITHOUT",
  "WRAPPED",
  "WRAPPER",
  "WRITE",
  "WRKSTNNAME",
  "XMLAGG",
  "XMLATTRIBUTES",
  "XMLCAST",
  "XMLCOMMENT",
  "XMLCONCAT",
  "XMLDOCUMENT",
  "XMLELEMENT",
  "XMLFOREST",
  "XMLGROUP",
  "XMLNAMESPACES",
  "XMLPARSE",
  "XMLPI",
  "XMLROW",
  "XMLSERIALIZE",
  "XMLTABLE",
  "XMLTEXT",
  "XMLVALIDATE",
  "XSLTRANSFORM",
  "XSROBJECT",
  "YEAR",
  "YEARS",
  "YES",
  "ZONE"
], PR = [
  // https://www.ibm.com/docs/en/i/7.2?topic=iaodsd-odbc-data-types-how-they-correspond-db2-i-database-types
  "ARRAY",
  "BIGINT",
  "BINARY",
  "BIT",
  "BLOB",
  "BOOLEAN",
  "CCSID",
  "CHAR",
  "CHARACTER",
  "CLOB",
  "DATA",
  "DATALINK",
  "DATE",
  "DBCLOB",
  "DECFLOAT",
  "DECIMAL",
  "DEC",
  "DOUBLE",
  "DOUBLE PRECISION",
  "FLOAT",
  "GRAPHIC",
  "INT",
  "INTEGER",
  "LONG",
  "NUMERIC",
  "REAL",
  "ROWID",
  "SMALLINT",
  "TIME",
  "TIMESTAMP",
  "VARBINARY",
  "VARCHAR",
  "VARGRAPHIC",
  "XML"
], lR = S(["SELECT [ALL | DISTINCT]"]), MR = S([
  // queries
  "WITH [RECURSIVE]",
  "INTO",
  "FROM",
  "WHERE",
  "GROUP BY",
  "HAVING",
  "PARTITION BY",
  "ORDER [SIBLINGS] BY [INPUT SEQUENCE]",
  "LIMIT",
  "OFFSET",
  "FETCH {FIRST | NEXT}",
  "FOR UPDATE [OF]",
  "FOR READ ONLY",
  "OPTIMIZE FOR",
  // Data modification
  // - insert:
  "INSERT INTO",
  "VALUES",
  // - update:
  "SET",
  // - merge:
  "MERGE INTO",
  "WHEN [NOT] MATCHED [THEN]",
  "UPDATE SET",
  "DELETE",
  "INSERT",
  // Data definition - table
  "FOR SYSTEM NAME"
]), aT = S(["CREATE [OR REPLACE] TABLE"]), cE = S([
  // - create:
  "CREATE [OR REPLACE] [RECURSIVE] VIEW",
  // - update:
  "UPDATE",
  "WHERE CURRENT OF",
  "WITH {NC | RR | RS | CS | UR}",
  // - delete:
  "DELETE FROM",
  // - drop table:
  "DROP TABLE",
  // alter table:
  "ALTER TABLE",
  "ADD [COLUMN]",
  "ALTER [COLUMN]",
  "DROP [COLUMN]",
  "SET DATA TYPE",
  "SET {GENERATED ALWAYS | GENERATED BY DEFAULT}",
  "SET NOT NULL",
  "SET {NOT HIDDEN | IMPLICITLY HIDDEN}",
  "SET FIELDPROC",
  "DROP {DEFAULT | NOT NULL | GENERATED | IDENTITY | ROW CHANGE TIMESTAMP | FIELDPROC}",
  // - truncate:
  "TRUNCATE [TABLE]",
  // other
  "SET [CURRENT] SCHEMA",
  "SET CURRENT_SCHEMA",
  // https://www.ibm.com/docs/en/i/7.5?topic=reference-statements
  "ALLOCATE CURSOR",
  "ALLOCATE [SQL] DESCRIPTOR [LOCAL | GLOBAL] SQL",
  "ALTER [SPECIFIC] {FUNCTION | PROCEDURE}",
  "ALTER {MASK | PERMISSION | SEQUENCE | TRIGGER}",
  "ASSOCIATE [RESULT SET] {LOCATOR | LOCATORS}",
  "BEGIN DECLARE SECTION",
  "CALL",
  "CLOSE",
  "COMMENT ON {ALIAS | COLUMN | CONSTRAINT | INDEX | MASK | PACKAGE | PARAMETER | PERMISSION | SEQUENCE | TABLE | TRIGGER | VARIABLE | XSROBJECT}",
  "COMMENT ON [SPECIFIC] {FUNCTION | PROCEDURE | ROUTINE}",
  "COMMENT ON PARAMETER SPECIFIC {FUNCTION | PROCEDURE | ROUTINE}",
  "COMMENT ON [TABLE FUNCTION] RETURN COLUMN",
  "COMMENT ON [TABLE FUNCTION] RETURN COLUMN SPECIFIC [PROCEDURE | ROUTINE]",
  "COMMIT [WORK] [HOLD]",
  "CONNECT [TO | RESET] USER",
  "CREATE [OR REPLACE] {ALIAS | FUNCTION | MASK | PERMISSION | PROCEDURE | SEQUENCE | TRIGGER | VARIABLE}",
  "CREATE [ENCODED VECTOR] INDEX",
  "CREATE UNIQUE [WHERE NOT NULL] INDEX",
  "CREATE SCHEMA",
  "CREATE TYPE",
  "DEALLOCATE [SQL] DESCRIPTOR [LOCAL | GLOBAL]",
  "DECLARE CURSOR",
  "DECLARE GLOBAL TEMPORARY TABLE",
  "DECLARE",
  "DESCRIBE CURSOR",
  "DESCRIBE INPUT",
  "DESCRIBE [OUTPUT]",
  "DESCRIBE {PROCEDURE | ROUTINE}",
  "DESCRIBE TABLE",
  "DISCONNECT ALL [SQL]",
  "DISCONNECT [CURRENT]",
  "DROP {ALIAS | INDEX | MASK | PACKAGE | PERMISSION | SCHEMA | SEQUENCE | TABLE | TYPE | VARIABLE | XSROBJECT} [IF EXISTS]",
  "DROP [SPECIFIC] {FUNCTION | PROCEDURE | ROUTINE} [IF EXISTS]",
  "END DECLARE SECTION",
  "EXECUTE [IMMEDIATE]",
  // 'FETCH {NEXT | PRIOR | FIRST | LAST | BEFORE | AFTER | CURRENT} [FROM]',
  "FREE LOCATOR",
  "GET [SQL] DESCRIPTOR [LOCAL | GLOBAL]",
  "GET [CURRENT | STACKED] DIAGNOSTICS",
  "GRANT {ALL [PRIVILEGES] | ALTER | EXECUTE} ON {FUNCTION | PROCEDURE | ROUTINE | PACKAGE | SCHEMA | SEQUENCE | TABLE | TYPE | VARIABLE | XSROBJECT}",
  "HOLD LOCATOR",
  "INCLUDE",
  "LABEL ON {ALIAS | COLUMN | CONSTRAINT | INDEX | MASK | PACKAGE | PERMISSION | SEQUENCE | TABLE | TRIGGER | VARIABLE | XSROBJECT}",
  "LABEL ON [SPECIFIC] {FUNCTION | PROCEDURE | ROUTINE}",
  "LOCK TABLE",
  "OPEN",
  "PREPARE",
  "REFRESH TABLE",
  "RELEASE",
  "RELEASE [TO] SAVEPOINT",
  "RENAME [TABLE | INDEX] TO",
  "REVOKE {ALL [PRIVILEGES] | ALTER | EXECUTE} ON {FUNCTION | PROCEDURE | ROUTINE | PACKAGE | SCHEMA | SEQUENCE | TABLE | TYPE | VARIABLE | XSROBJECT}",
  "ROLLBACK [WORK] [HOLD | TO SAVEPOINT]",
  "SAVEPOINT",
  "SET CONNECTION",
  "SET CURRENT {DEBUG MODE | DECFLOAT ROUNDING MODE | DEGREE | IMPLICIT XMLPARSE OPTION | TEMPORAL SYSTEM_TIME}",
  "SET [SQL] DESCRIPTOR [LOCAL | GLOBAL]",
  "SET ENCRYPTION PASSWORD",
  "SET OPTION",
  "SET {[CURRENT [FUNCTION]] PATH | CURRENT_PATH}",
  "SET RESULT SETS [WITH RETURN [TO CALLER | TO CLIENT]]",
  "SET SESSION AUTHORIZATION",
  "SET SESSION_USER",
  "SET TRANSACTION",
  "SIGNAL SQLSTATE [VALUE]",
  "TAG",
  "TRANSFER OWNERSHIP OF",
  "WHENEVER {NOT FOUND | SQLERROR | SQLWARNING}"
]), UR = S(["UNION [ALL]", "EXCEPT [ALL]", "INTERSECT [ALL]"]), cR = S([
  "JOIN",
  "{LEFT | RIGHT | FULL} [OUTER] JOIN",
  "[LEFT | RIGHT] EXCEPTION JOIN",
  "{INNER | CROSS} JOIN"
]), uR = S([
  "ON DELETE",
  "ON UPDATE",
  "SET NULL",
  "{ROWS | RANGE} BETWEEN"
]), dR = S([]), pR = {
  name: "db2i",
  tokenizerOptions: {
    reservedSelect: lR,
    reservedClauses: [...MR, ...aT, ...cE],
    reservedSetOperations: UR,
    reservedJoins: cR,
    reservedKeywordPhrases: uR,
    reservedDataTypePhrases: dR,
    reservedKeywords: DR,
    reservedDataTypes: PR,
    reservedFunctionNames: _R,
    nestedBlockComments: !0,
    extraParens: ["[]"],
    stringTypes: [
      { quote: "''-qq", prefixes: ["G", "N"] },
      { quote: "''-raw", prefixes: ["X", "BX", "GX", "UX"], requirePrefix: !0 }
    ],
    identTypes: ['""-qq'],
    identChars: { first: "@#$", rest: "@#$" },
    paramTypes: { positional: !0, named: [":"] },
    paramChars: { first: "@#$", rest: "@#$" },
    operators: ["**", "¬=", "¬>", "¬<", "!>", "!<", "||", "=>"]
  },
  formatOptions: {
    onelineClauses: [...aT, ...cE],
    tabularOnelineClauses: cE
  }
}, GR = [
  // Functions from DuckDB (excluding those that start with an underscore):
  // SELECT DISTINCT upper(function_name) AS function_name
  // FROM duckdb_functions()
  // WHERE function_name SIMILAR TO '^[a-z].*'
  // ORDER BY function_name
  "ABS",
  "ACOS",
  "ADD",
  "ADD_PARQUET_KEY",
  "AGE",
  "AGGREGATE",
  "ALIAS",
  "ALL_PROFILING_OUTPUT",
  "ANY_VALUE",
  "APPLY",
  "APPROX_COUNT_DISTINCT",
  "APPROX_QUANTILE",
  "ARBITRARY",
  "ARGMAX",
  "ARGMIN",
  "ARG_MAX",
  "ARG_MAX_NULL",
  "ARG_MIN",
  "ARG_MIN_NULL",
  "ARRAY_AGG",
  "ARRAY_AGGR",
  "ARRAY_AGGREGATE",
  "ARRAY_APPEND",
  "ARRAY_APPLY",
  "ARRAY_CAT",
  "ARRAY_CONCAT",
  "ARRAY_CONTAINS",
  "ARRAY_COSINE_SIMILARITY",
  "ARRAY_CROSS_PRODUCT",
  "ARRAY_DISTANCE",
  "ARRAY_DISTINCT",
  "ARRAY_DOT_PRODUCT",
  "ARRAY_EXTRACT",
  "ARRAY_FILTER",
  "ARRAY_GRADE_UP",
  "ARRAY_HAS",
  "ARRAY_HAS_ALL",
  "ARRAY_HAS_ANY",
  "ARRAY_INDEXOF",
  "ARRAY_INNER_PRODUCT",
  "ARRAY_INTERSECT",
  "ARRAY_LENGTH",
  "ARRAY_POP_BACK",
  "ARRAY_POP_FRONT",
  "ARRAY_POSITION",
  "ARRAY_PREPEND",
  "ARRAY_PUSH_BACK",
  "ARRAY_PUSH_FRONT",
  "ARRAY_REDUCE",
  "ARRAY_RESIZE",
  "ARRAY_REVERSE",
  "ARRAY_REVERSE_SORT",
  "ARRAY_SELECT",
  "ARRAY_SLICE",
  "ARRAY_SORT",
  "ARRAY_TO_JSON",
  "ARRAY_TO_STRING",
  "ARRAY_TRANSFORM",
  "ARRAY_UNIQUE",
  "ARRAY_VALUE",
  "ARRAY_WHERE",
  "ARRAY_ZIP",
  "ARROW_SCAN",
  "ARROW_SCAN_DUMB",
  "ASCII",
  "ASIN",
  "ATAN",
  "ATAN2",
  "AVG",
  "BASE64",
  "BIN",
  "BITSTRING",
  "BITSTRING_AGG",
  "BIT_AND",
  "BIT_COUNT",
  "BIT_LENGTH",
  "BIT_OR",
  "BIT_POSITION",
  "BIT_XOR",
  "BOOL_AND",
  "BOOL_OR",
  "CARDINALITY",
  "CBRT",
  "CEIL",
  "CEILING",
  "CENTURY",
  "CHECKPOINT",
  "CHR",
  "COLLATIONS",
  "COL_DESCRIPTION",
  "COMBINE",
  "CONCAT",
  "CONCAT_WS",
  "CONSTANT_OR_NULL",
  "CONTAINS",
  "COPY_DATABASE",
  "CORR",
  "COS",
  "COT",
  "COUNT",
  "COUNT_IF",
  "COUNT_STAR",
  "COVAR_POP",
  "COVAR_SAMP",
  "CREATE_SORT_KEY",
  "CURRENT_CATALOG",
  "CURRENT_DATABASE",
  "CURRENT_DATE",
  "CURRENT_LOCALTIME",
  "CURRENT_LOCALTIMESTAMP",
  "CURRENT_QUERY",
  "CURRENT_ROLE",
  "CURRENT_SCHEMA",
  "CURRENT_SCHEMAS",
  "CURRENT_SETTING",
  "CURRENT_USER",
  "CURRVAL",
  "DAMERAU_LEVENSHTEIN",
  "DATABASE_LIST",
  "DATABASE_SIZE",
  "DATEDIFF",
  "DATEPART",
  "DATESUB",
  "DATETRUNC",
  "DATE_ADD",
  "DATE_DIFF",
  "DATE_PART",
  "DATE_SUB",
  "DATE_TRUNC",
  "DAY",
  "DAYNAME",
  "DAYOFMONTH",
  "DAYOFWEEK",
  "DAYOFYEAR",
  "DECADE",
  "DECODE",
  "DEGREES",
  "DISABLE_CHECKPOINT_ON_SHUTDOWN",
  "DISABLE_OBJECT_CACHE",
  "DISABLE_OPTIMIZER",
  "DISABLE_PRINT_PROGRESS_BAR",
  "DISABLE_PROFILE",
  "DISABLE_PROFILING",
  "DISABLE_PROGRESS_BAR",
  "DISABLE_VERIFICATION",
  "DISABLE_VERIFY_EXTERNAL",
  "DISABLE_VERIFY_FETCH_ROW",
  "DISABLE_VERIFY_PARALLELISM",
  "DISABLE_VERIFY_SERIALIZER",
  "DIVIDE",
  "DUCKDB_COLUMNS",
  "DUCKDB_CONSTRAINTS",
  "DUCKDB_DATABASES",
  "DUCKDB_DEPENDENCIES",
  "DUCKDB_EXTENSIONS",
  "DUCKDB_FUNCTIONS",
  "DUCKDB_INDEXES",
  "DUCKDB_KEYWORDS",
  "DUCKDB_MEMORY",
  "DUCKDB_OPTIMIZERS",
  "DUCKDB_SCHEMAS",
  "DUCKDB_SECRETS",
  "DUCKDB_SEQUENCES",
  "DUCKDB_SETTINGS",
  "DUCKDB_TABLES",
  "DUCKDB_TEMPORARY_FILES",
  "DUCKDB_TYPES",
  "DUCKDB_VIEWS",
  "EDIT",
  "EDITDIST3",
  "ELEMENT_AT",
  "ENABLE_CHECKPOINT_ON_SHUTDOWN",
  "ENABLE_OBJECT_CACHE",
  "ENABLE_OPTIMIZER",
  "ENABLE_PRINT_PROGRESS_BAR",
  "ENABLE_PROFILE",
  "ENABLE_PROFILING",
  "ENABLE_PROGRESS_BAR",
  "ENABLE_VERIFICATION",
  "ENCODE",
  "ENDS_WITH",
  "ENTROPY",
  "ENUM_CODE",
  "ENUM_FIRST",
  "ENUM_LAST",
  "ENUM_RANGE",
  "ENUM_RANGE_BOUNDARY",
  "EPOCH",
  "EPOCH_MS",
  "EPOCH_NS",
  "EPOCH_US",
  "ERA",
  "ERROR",
  "EVEN",
  "EXP",
  "FACTORIAL",
  "FAVG",
  "FDIV",
  "FILTER",
  "FINALIZE",
  "FIRST",
  "FLATTEN",
  "FLOOR",
  "FMOD",
  "FORCE_CHECKPOINT",
  "FORMAT",
  "FORMATREADABLEDECIMALSIZE",
  "FORMATREADABLESIZE",
  "FORMAT_BYTES",
  "FORMAT_PG_TYPE",
  "FORMAT_TYPE",
  "FROM_BASE64",
  "FROM_BINARY",
  "FROM_HEX",
  "FROM_JSON",
  "FROM_JSON_STRICT",
  "FSUM",
  "FUNCTIONS",
  "GAMMA",
  "GCD",
  "GENERATE_SERIES",
  "GENERATE_SUBSCRIPTS",
  "GEN_RANDOM_UUID",
  "GEOMEAN",
  "GEOMETRIC_MEAN",
  "GETENV",
  "GET_BIT",
  "GET_BLOCK_SIZE",
  "GET_CURRENT_TIME",
  "GET_CURRENT_TIMESTAMP",
  "GLOB",
  "GRADE_UP",
  "GREATEST",
  "GREATEST_COMMON_DIVISOR",
  "GROUP_CONCAT",
  "HAMMING",
  "HASH",
  "HAS_ANY_COLUMN_PRIVILEGE",
  "HAS_COLUMN_PRIVILEGE",
  "HAS_DATABASE_PRIVILEGE",
  "HAS_FOREIGN_DATA_WRAPPER_PRIVILEGE",
  "HAS_FUNCTION_PRIVILEGE",
  "HAS_LANGUAGE_PRIVILEGE",
  "HAS_SCHEMA_PRIVILEGE",
  "HAS_SEQUENCE_PRIVILEGE",
  "HAS_SERVER_PRIVILEGE",
  "HAS_TABLESPACE_PRIVILEGE",
  "HAS_TABLE_PRIVILEGE",
  "HEX",
  "HISTOGRAM",
  "HOUR",
  "ICU_CALENDAR_NAMES",
  "ICU_SORT_KEY",
  "ILIKE_ESCAPE",
  "IMPORT_DATABASE",
  "INDEX_SCAN",
  "INET_CLIENT_ADDR",
  "INET_CLIENT_PORT",
  "INET_SERVER_ADDR",
  "INET_SERVER_PORT",
  "INSTR",
  "IN_SEARCH_PATH",
  "ISFINITE",
  "ISINF",
  "ISNAN",
  "ISODOW",
  "ISOYEAR",
  "JACCARD",
  "JARO_SIMILARITY",
  "JARO_WINKLER_SIMILARITY",
  // 'JSON',
  "JSON_ARRAY",
  "JSON_ARRAY_LENGTH",
  "JSON_CONTAINS",
  "JSON_DESERIALIZE_SQL",
  "JSON_EXECUTE_SERIALIZED_SQL",
  "JSON_EXTRACT",
  "JSON_EXTRACT_PATH",
  "JSON_EXTRACT_PATH_TEXT",
  "JSON_EXTRACT_STRING",
  "JSON_GROUP_ARRAY",
  "JSON_GROUP_OBJECT",
  "JSON_GROUP_STRUCTURE",
  "JSON_KEYS",
  "JSON_MERGE_PATCH",
  "JSON_OBJECT",
  "JSON_QUOTE",
  "JSON_SERIALIZE_PLAN",
  "JSON_SERIALIZE_SQL",
  "JSON_STRUCTURE",
  "JSON_TRANSFORM",
  "JSON_TRANSFORM_STRICT",
  "JSON_TYPE",
  "JSON_VALID",
  "JULIAN",
  "KAHAN_SUM",
  "KURTOSIS",
  "KURTOSIS_POP",
  "LAST",
  "LAST_DAY",
  "LCASE",
  "LCM",
  "LEAST",
  "LEAST_COMMON_MULTIPLE",
  "LEFT",
  "LEFT_GRAPHEME",
  "LEN",
  "LENGTH",
  "LENGTH_GRAPHEME",
  "LEVENSHTEIN",
  "LGAMMA",
  "LIKE_ESCAPE",
  "LIST",
  "LISTAGG",
  "LIST_AGGR",
  "LIST_AGGREGATE",
  "LIST_ANY_VALUE",
  "LIST_APPEND",
  "LIST_APPLY",
  "LIST_APPROX_COUNT_DISTINCT",
  "LIST_AVG",
  "LIST_BIT_AND",
  "LIST_BIT_OR",
  "LIST_BIT_XOR",
  "LIST_BOOL_AND",
  "LIST_BOOL_OR",
  "LIST_CAT",
  "LIST_CONCAT",
  "LIST_CONTAINS",
  "LIST_COSINE_SIMILARITY",
  "LIST_COUNT",
  "LIST_DISTANCE",
  "LIST_DISTINCT",
  "LIST_DOT_PRODUCT",
  "LIST_ELEMENT",
  "LIST_ENTROPY",
  "LIST_EXTRACT",
  "LIST_FILTER",
  "LIST_FIRST",
  "LIST_GRADE_UP",
  "LIST_HAS",
  "LIST_HAS_ALL",
  "LIST_HAS_ANY",
  "LIST_HISTOGRAM",
  "LIST_INDEXOF",
  "LIST_INNER_PRODUCT",
  "LIST_INTERSECT",
  "LIST_KURTOSIS",
  "LIST_KURTOSIS_POP",
  "LIST_LAST",
  "LIST_MAD",
  "LIST_MAX",
  "LIST_MEDIAN",
  "LIST_MIN",
  "LIST_MODE",
  "LIST_PACK",
  "LIST_POSITION",
  "LIST_PREPEND",
  "LIST_PRODUCT",
  "LIST_REDUCE",
  "LIST_RESIZE",
  "LIST_REVERSE",
  "LIST_REVERSE_SORT",
  "LIST_SELECT",
  "LIST_SEM",
  "LIST_SKEWNESS",
  "LIST_SLICE",
  "LIST_SORT",
  "LIST_STDDEV_POP",
  "LIST_STDDEV_SAMP",
  "LIST_STRING_AGG",
  "LIST_SUM",
  "LIST_TRANSFORM",
  "LIST_UNIQUE",
  "LIST_VALUE",
  "LIST_VAR_POP",
  "LIST_VAR_SAMP",
  "LIST_WHERE",
  "LIST_ZIP",
  "LN",
  "LOG",
  "LOG10",
  "LOG2",
  "LOWER",
  "LPAD",
  "LSMODE",
  "LTRIM",
  "MAD",
  "MAKE_DATE",
  "MAKE_TIME",
  "MAKE_TIMESTAMP",
  "MAKE_TIMESTAMPTZ",
  "MAP",
  "MAP_CONCAT",
  "MAP_ENTRIES",
  "MAP_EXTRACT",
  "MAP_FROM_ENTRIES",
  "MAP_KEYS",
  "MAP_VALUES",
  "MAX",
  "MAX_BY",
  "MD5",
  "MD5_NUMBER",
  "MD5_NUMBER_LOWER",
  "MD5_NUMBER_UPPER",
  "MEAN",
  "MEDIAN",
  "METADATA_INFO",
  "MICROSECOND",
  "MILLENNIUM",
  "MILLISECOND",
  "MIN",
  "MINUTE",
  "MIN_BY",
  "MISMATCHES",
  "MOD",
  "MODE",
  "MONTH",
  "MONTHNAME",
  "MULTIPLY",
  "NEXTAFTER",
  "NEXTVAL",
  "NFC_NORMALIZE",
  "NOT_ILIKE_ESCAPE",
  "NOT_LIKE_ESCAPE",
  "NOW",
  "NULLIF",
  "OBJ_DESCRIPTION",
  "OCTET_LENGTH",
  "ORD",
  "PARQUET_FILE_METADATA",
  "PARQUET_KV_METADATA",
  "PARQUET_METADATA",
  "PARQUET_SCAN",
  "PARQUET_SCHEMA",
  "PARSE_DIRNAME",
  "PARSE_DIRPATH",
  "PARSE_FILENAME",
  "PARSE_PATH",
  "PG_COLLATION_IS_VISIBLE",
  "PG_CONF_LOAD_TIME",
  "PG_CONVERSION_IS_VISIBLE",
  "PG_FUNCTION_IS_VISIBLE",
  "PG_GET_CONSTRAINTDEF",
  "PG_GET_EXPR",
  "PG_GET_VIEWDEF",
  "PG_HAS_ROLE",
  "PG_IS_OTHER_TEMP_SCHEMA",
  "PG_MY_TEMP_SCHEMA",
  "PG_OPCLASS_IS_VISIBLE",
  "PG_OPERATOR_IS_VISIBLE",
  "PG_OPFAMILY_IS_VISIBLE",
  "PG_POSTMASTER_START_TIME",
  "PG_SIZE_PRETTY",
  "PG_TABLE_IS_VISIBLE",
  "PG_TIMEZONE_NAMES",
  "PG_TS_CONFIG_IS_VISIBLE",
  "PG_TS_DICT_IS_VISIBLE",
  "PG_TS_PARSER_IS_VISIBLE",
  "PG_TS_TEMPLATE_IS_VISIBLE",
  "PG_TYPEOF",
  "PG_TYPE_IS_VISIBLE",
  "PI",
  "PLATFORM",
  "POSITION",
  "POW",
  "POWER",
  "PRAGMA_COLLATIONS",
  "PRAGMA_DATABASE_SIZE",
  "PRAGMA_METADATA_INFO",
  "PRAGMA_PLATFORM",
  "PRAGMA_SHOW",
  "PRAGMA_STORAGE_INFO",
  "PRAGMA_TABLE_INFO",
  "PRAGMA_USER_AGENT",
  "PRAGMA_VERSION",
  "PREFIX",
  "PRINTF",
  "PRODUCT",
  "QUANTILE",
  "QUANTILE_CONT",
  "QUANTILE_DISC",
  "QUARTER",
  "RADIANS",
  "RANDOM",
  "RANGE",
  "READFILE",
  "READ_BLOB",
  "READ_CSV",
  "READ_CSV_AUTO",
  "READ_JSON",
  "READ_JSON_AUTO",
  "READ_JSON_OBJECTS",
  "READ_JSON_OBJECTS_AUTO",
  "READ_NDJSON",
  "READ_NDJSON_AUTO",
  "READ_NDJSON_OBJECTS",
  "READ_PARQUET",
  "READ_TEXT",
  "REDUCE",
  "REGEXP_ESCAPE",
  "REGEXP_EXTRACT",
  "REGEXP_EXTRACT_ALL",
  "REGEXP_FULL_MATCH",
  "REGEXP_MATCHES",
  "REGEXP_REPLACE",
  "REGEXP_SPLIT_TO_ARRAY",
  "REGEXP_SPLIT_TO_TABLE",
  "REGR_AVGX",
  "REGR_AVGY",
  "REGR_COUNT",
  "REGR_INTERCEPT",
  "REGR_R2",
  "REGR_SLOPE",
  "REGR_SXX",
  "REGR_SXY",
  "REGR_SYY",
  "REPEAT",
  "REPEAT_ROW",
  "REPLACE",
  "RESERVOIR_QUANTILE",
  "REVERSE",
  "RIGHT",
  "RIGHT_GRAPHEME",
  "ROUND",
  "ROUNDBANKERS",
  "ROUND_EVEN",
  "ROW",
  "ROW_TO_JSON",
  "RPAD",
  "RTRIM",
  "SECOND",
  "SEM",
  "SEQ_SCAN",
  "SESSION_USER",
  "SETSEED",
  "SET_BIT",
  "SHA256",
  "SHA3",
  "SHELL_ADD_SCHEMA",
  "SHELL_ESCAPE_CRNL",
  "SHELL_IDQUOTE",
  "SHELL_MODULE_SCHEMA",
  "SHELL_PUTSNL",
  "SHOBJ_DESCRIPTION",
  "SHOW",
  "SHOW_DATABASES",
  "SHOW_TABLES",
  "SHOW_TABLES_EXPANDED",
  "SIGN",
  "SIGNBIT",
  "SIN",
  "SKEWNESS",
  "SNIFF_CSV",
  "SPLIT",
  "SPLIT_PART",
  "SQL_AUTO_COMPLETE",
  "SQRT",
  "STARTS_WITH",
  "STATS",
  "STDDEV",
  "STDDEV_POP",
  "STDDEV_SAMP",
  "STORAGE_INFO",
  "STRFTIME",
  "STRING_AGG",
  "STRING_SPLIT",
  "STRING_SPLIT_REGEX",
  "STRING_TO_ARRAY",
  "STRIP_ACCENTS",
  "STRLEN",
  "STRPOS",
  "STRPTIME",
  "STRUCT_EXTRACT",
  "STRUCT_INSERT",
  "STRUCT_PACK",
  "STR_SPLIT",
  "STR_SPLIT_REGEX",
  "SUBSTR",
  "SUBSTRING",
  "SUBSTRING_GRAPHEME",
  "SUBTRACT",
  "SUFFIX",
  "SUM",
  "SUMKAHAN",
  "SUMMARY",
  "SUM_NO_OVERFLOW",
  "TABLE_INFO",
  "TAN",
  "TEST_ALL_TYPES",
  "TEST_VECTOR_TYPES",
  "TIMEZONE",
  "TIMEZONE_HOUR",
  "TIMEZONE_MINUTE",
  "TIME_BUCKET",
  "TODAY",
  "TO_BASE",
  "TO_BASE64",
  "TO_BINARY",
  "TO_CENTURIES",
  "TO_DAYS",
  "TO_DECADES",
  "TO_HEX",
  "TO_HOURS",
  "TO_JSON",
  "TO_MICROSECONDS",
  "TO_MILLENNIA",
  "TO_MILLISECONDS",
  "TO_MINUTES",
  "TO_MONTHS",
  "TO_SECONDS",
  "TO_TIMESTAMP",
  "TO_WEEKS",
  "TO_YEARS",
  "TRANSACTION_TIMESTAMP",
  "TRANSLATE",
  "TRIM",
  "TRUNC",
  "TRY_STRPTIME",
  "TXID_CURRENT",
  "TYPEOF",
  "UCASE",
  "UNBIN",
  "UNHEX",
  "UNICODE",
  "UNION_EXTRACT",
  "UNION_TAG",
  "UNION_VALUE",
  "UNNEST",
  "UNPIVOT_LIST",
  "UPPER",
  "USER",
  "USER_AGENT",
  "UUID",
  "VARIANCE",
  "VAR_POP",
  "VAR_SAMP",
  "VECTOR_TYPE",
  "VERIFY_EXTERNAL",
  "VERIFY_FETCH_ROW",
  "VERIFY_PARALLELISM",
  "VERIFY_SERIALIZER",
  "VERSION",
  "WEEK",
  "WEEKDAY",
  "WEEKOFYEAR",
  "WHICH_SECRET",
  "WRITEFILE",
  "XOR",
  "YEAR",
  "YEARWEEK",
  // Keywords that also need to be listed as functions
  "CAST",
  "COALESCE",
  // 'NULL', we really prefer treating it as keyword
  "RANK",
  "ROW_NUMBER"
], HR = [
  // Keywords from DuckDB:
  // SELECT upper(keyword_name)
  // FROM duckdb_keywords()
  // WHERE keyword_category = 'reserved'
  // ORDER BY keyword_name
  "ALL",
  "ANALYSE",
  "ANALYZE",
  "AND",
  "ANY",
  "AS",
  "ASC",
  "ATTACH",
  "ASYMMETRIC",
  "BOTH",
  "CASE",
  "CAST",
  "CHECK",
  "COLLATE",
  "COLUMN",
  "CONSTRAINT",
  "CREATE",
  "DEFAULT",
  "DEFERRABLE",
  "DESC",
  "DESCRIBE",
  "DETACH",
  "DISTINCT",
  "DO",
  "ELSE",
  "END",
  "EXCEPT",
  "FALSE",
  "FETCH",
  "FOR",
  "FOREIGN",
  "FROM",
  "GRANT",
  "GROUP",
  "HAVING",
  "IN",
  "INITIALLY",
  "INTERSECT",
  "INTO",
  "IS",
  "LATERAL",
  "LEADING",
  "LIMIT",
  "NOT",
  "NULL",
  "OFFSET",
  "ON",
  "ONLY",
  "OR",
  "ORDER",
  "PIVOT",
  "PIVOT_LONGER",
  "PIVOT_WIDER",
  "PLACING",
  "PRIMARY",
  "REFERENCES",
  "RETURNING",
  "SELECT",
  "SHOW",
  "SOME",
  "SUMMARIZE",
  "SYMMETRIC",
  "TABLE",
  "THEN",
  "TO",
  "TRAILING",
  "TRUE",
  "UNION",
  "UNIQUE",
  "UNPIVOT",
  "USING",
  "VARIADIC",
  "WHEN",
  "WHERE",
  "WINDOW",
  "WITH"
], BR = [
  // Types from DuckDB:
  // SELECT DISTINCT upper(type_name)
  // FROM duckdb_types()
  // ORDER BY type_name
  "ARRAY",
  "BIGINT",
  "BINARY",
  "BIT",
  "BITSTRING",
  "BLOB",
  "BOOL",
  "BOOLEAN",
  "BPCHAR",
  "BYTEA",
  "CHAR",
  "DATE",
  "DATETIME",
  "DEC",
  "DECIMAL",
  "DOUBLE",
  "ENUM",
  "FLOAT",
  "FLOAT4",
  "FLOAT8",
  "GUID",
  "HUGEINT",
  "INET",
  "INT",
  "INT1",
  "INT128",
  "INT16",
  "INT2",
  "INT32",
  "INT4",
  "INT64",
  "INT8",
  "INTEGER",
  "INTEGRAL",
  "INTERVAL",
  "JSON",
  "LIST",
  "LOGICAL",
  "LONG",
  "MAP",
  // 'NULL' is a keyword
  "NUMERIC",
  "NVARCHAR",
  "OID",
  "REAL",
  "ROW",
  "SHORT",
  "SIGNED",
  "SMALLINT",
  "STRING",
  "STRUCT",
  "TEXT",
  "TIME",
  "TIMESTAMP_MS",
  "TIMESTAMP_NS",
  "TIMESTAMP_S",
  "TIMESTAMP_US",
  "TIMESTAMP",
  "TIMESTAMPTZ",
  "TIMETZ",
  "TINYINT",
  "UBIGINT",
  "UHUGEINT",
  "UINT128",
  "UINT16",
  "UINT32",
  "UINT64",
  "UINT8",
  "UINTEGER",
  "UNION",
  "USMALLINT",
  "UTINYINT",
  "UUID",
  "VARBINARY",
  "VARCHAR"
], mR = S(["SELECT [ALL | DISTINCT]"]), FR = S([
  // queries
  "WITH [RECURSIVE]",
  "FROM",
  "WHERE",
  "GROUP BY [ALL]",
  "HAVING",
  "WINDOW",
  "PARTITION BY",
  "ORDER BY [ALL]",
  "LIMIT",
  "OFFSET",
  // 'USING' (conflicts with 'USING' in JOIN)
  "USING SAMPLE",
  "QUALIFY",
  // Data manipulation
  // - insert:
  "INSERT [OR REPLACE] INTO",
  "VALUES",
  "DEFAULT VALUES",
  // - update:
  "SET",
  // other:
  "RETURNING"
]), CT = S([
  "CREATE [OR REPLACE] [TEMPORARY | TEMP] TABLE [IF NOT EXISTS]"
]), uE = S([
  // TABLE
  // - update:
  "UPDATE",
  // - insert:
  "ON CONFLICT",
  // - delete:
  "DELETE FROM",
  // - drop table:
  "DROP TABLE [IF EXISTS]",
  // - truncate
  "TRUNCATE",
  // - alter table:
  "ALTER TABLE",
  "ADD [COLUMN] [IF NOT EXISTS]",
  "ADD PRIMARY KEY",
  "DROP [COLUMN] [IF EXISTS]",
  "ALTER [COLUMN]",
  "RENAME [COLUMN]",
  "RENAME TO",
  "SET [DATA] TYPE",
  "{SET | DROP} DEFAULT",
  "{SET | DROP} NOT NULL",
  // MACRO / FUNCTION
  "CREATE [OR REPLACE] [TEMPORARY | TEMP] {MACRO | FUNCTION}",
  "DROP MACRO [TABLE] [IF EXISTS]",
  "DROP FUNCTION [IF EXISTS]",
  // INDEX
  "CREATE [UNIQUE] INDEX [IF NOT EXISTS]",
  "DROP INDEX [IF EXISTS]",
  // SCHEMA
  "CREATE [OR REPLACE] SCHEMA [IF NOT EXISTS]",
  "DROP SCHEMA [IF EXISTS]",
  // SECRET
  "CREATE [OR REPLACE] [PERSISTENT | TEMPORARY] SECRET [IF NOT EXISTS]",
  "DROP [PERSISTENT | TEMPORARY] SECRET [IF EXISTS]",
  // SEQUENCE
  "CREATE [OR REPLACE] [TEMPORARY | TEMP] SEQUENCE",
  "DROP SEQUENCE [IF EXISTS]",
  // VIEW
  "CREATE [OR REPLACE] [TEMPORARY | TEMP] VIEW [IF NOT EXISTS]",
  "DROP VIEW [IF EXISTS]",
  "ALTER VIEW",
  // TYPE
  "CREATE TYPE",
  "DROP TYPE [IF EXISTS]",
  // other
  "ANALYZE",
  "ATTACH [DATABASE] [IF NOT EXISTS]",
  "DETACH [DATABASE] [IF EXISTS]",
  "CALL",
  "[FORCE] CHECKPOINT",
  "COMMENT ON [TABLE | COLUMN | VIEW | INDEX | SEQUENCE | TYPE | MACRO | MACRO TABLE]",
  "COPY [FROM DATABASE]",
  "DESCRIBE",
  "EXPORT DATABASE",
  "IMPORT DATABASE",
  "INSTALL",
  "LOAD",
  "PIVOT",
  "PIVOT_WIDER",
  "UNPIVOT",
  "EXPLAIN [ANALYZE]",
  // plain SET conflicts with SET clause in UPDATE
  "SET {LOCAL | SESSION | GLOBAL}",
  "RESET [LOCAL | SESSION | GLOBAL]",
  "{SET | RESET} VARIABLE",
  "SUMMARIZE",
  "BEGIN TRANSACTION",
  "ROLLBACK",
  "COMMIT",
  "ABORT",
  "USE",
  "VACUUM [ANALYZE]",
  // prepared statements
  "PREPARE",
  "EXECUTE",
  "DEALLOCATE [PREPARE]"
]), hR = S([
  "UNION [ALL | BY NAME]",
  "EXCEPT [ALL]",
  "INTERSECT [ALL]"
]), YR = S([
  "JOIN",
  "{LEFT | RIGHT | FULL} [OUTER] JOIN",
  "{INNER | CROSS} JOIN",
  "{NATURAL | ASOF} [INNER] JOIN",
  "{NATURAL | ASOF} {LEFT | RIGHT | FULL} [OUTER] JOIN",
  "POSITIONAL JOIN",
  "ANTI JOIN",
  "SEMI JOIN"
]), fR = S([
  "{ROWS | RANGE | GROUPS} BETWEEN",
  "SIMILAR TO",
  "IS [NOT] DISTINCT FROM"
]), gR = S(["TIMESTAMP WITH TIME ZONE"]), yR = {
  name: "duckdb",
  tokenizerOptions: {
    reservedSelect: mR,
    reservedClauses: [...FR, ...CT, ...uE],
    reservedSetOperations: hR,
    reservedJoins: YR,
    reservedKeywordPhrases: fR,
    reservedDataTypePhrases: gR,
    supportsXor: !0,
    reservedKeywords: HR,
    reservedDataTypes: BR,
    reservedFunctionNames: GR,
    nestedBlockComments: !0,
    extraParens: ["[]", "{}"],
    underscoresInNumbers: !0,
    stringTypes: [
      "$$",
      "''-qq",
      { quote: "''-qq-bs", prefixes: ["E"], requirePrefix: !0 },
      { quote: "''-raw", prefixes: ["B", "X"], requirePrefix: !0 }
    ],
    identTypes: ['""-qq'],
    identChars: { rest: "$" },
    // TODO: named params $foo currently conflict with $$-quoted strings
    paramTypes: { positional: !0, numbered: ["$"], quoted: ["$"] },
    operators: [
      // Arithmetic:
      "//",
      "%",
      "**",
      "^",
      "!",
      // Bitwise:
      "&",
      "|",
      "~",
      "<<",
      ">>",
      // Cast:
      "::",
      // Comparison:
      "==",
      // Lambda & JSON:
      "->",
      // JSON:
      "->>",
      // key-value separator:
      ":",
      // Named function params:
      ":=",
      "=>",
      // Pattern matching:
      "~~",
      "!~~",
      "~~*",
      "!~~*",
      "~~~",
      // Regular expressions:
      "~",
      "!~",
      "~*",
      "!~*",
      // String:
      "^@",
      "||",
      // INET extension:
      ">>=",
      "<<="
    ]
  },
  formatOptions: {
    alwaysDenseOperators: ["::"],
    onelineClauses: [...CT, ...uE],
    tabularOnelineClauses: uE
  }
}, VR = [
  // https://cwiki.apache.org/confluence/display/Hive/LanguageManual+UDF
  // math
  "ABS",
  "ACOS",
  "ASIN",
  "ATAN",
  "BIN",
  "BROUND",
  "CBRT",
  "CEIL",
  "CEILING",
  "CONV",
  "COS",
  "DEGREES",
  // 'E',
  "EXP",
  "FACTORIAL",
  "FLOOR",
  "GREATEST",
  "HEX",
  "LEAST",
  "LN",
  "LOG",
  "LOG10",
  "LOG2",
  "NEGATIVE",
  "PI",
  "PMOD",
  "POSITIVE",
  "POW",
  "POWER",
  "RADIANS",
  "RAND",
  "ROUND",
  "SHIFTLEFT",
  "SHIFTRIGHT",
  "SHIFTRIGHTUNSIGNED",
  "SIGN",
  "SIN",
  "SQRT",
  "TAN",
  "UNHEX",
  "WIDTH_BUCKET",
  // array
  "ARRAY_CONTAINS",
  "MAP_KEYS",
  "MAP_VALUES",
  "SIZE",
  "SORT_ARRAY",
  // conversion
  "BINARY",
  "CAST",
  // date
  "ADD_MONTHS",
  "DATE",
  "DATE_ADD",
  "DATE_FORMAT",
  "DATE_SUB",
  "DATEDIFF",
  "DAY",
  "DAYNAME",
  "DAYOFMONTH",
  "DAYOFYEAR",
  "EXTRACT",
  "FROM_UNIXTIME",
  "FROM_UTC_TIMESTAMP",
  "HOUR",
  "LAST_DAY",
  "MINUTE",
  "MONTH",
  "MONTHS_BETWEEN",
  "NEXT_DAY",
  "QUARTER",
  "SECOND",
  "TIMESTAMP",
  "TO_DATE",
  "TO_UTC_TIMESTAMP",
  "TRUNC",
  "UNIX_TIMESTAMP",
  "WEEKOFYEAR",
  "YEAR",
  // conditional
  "ASSERT_TRUE",
  "COALESCE",
  "IF",
  "ISNOTNULL",
  "ISNULL",
  "NULLIF",
  "NVL",
  // string
  "ASCII",
  "BASE64",
  "CHARACTER_LENGTH",
  "CHR",
  "CONCAT",
  "CONCAT_WS",
  "CONTEXT_NGRAMS",
  "DECODE",
  "ELT",
  "ENCODE",
  "FIELD",
  "FIND_IN_SET",
  "FORMAT_NUMBER",
  "GET_JSON_OBJECT",
  "IN_FILE",
  "INITCAP",
  "INSTR",
  "LCASE",
  "LENGTH",
  "LEVENSHTEIN",
  "LOCATE",
  "LOWER",
  "LPAD",
  "LTRIM",
  "NGRAMS",
  "OCTET_LENGTH",
  "PARSE_URL",
  "PRINTF",
  "QUOTE",
  "REGEXP_EXTRACT",
  "REGEXP_REPLACE",
  "REPEAT",
  "REVERSE",
  "RPAD",
  "RTRIM",
  "SENTENCES",
  "SOUNDEX",
  "SPACE",
  "SPLIT",
  "STR_TO_MAP",
  "SUBSTR",
  "SUBSTRING",
  "TRANSLATE",
  "TRIM",
  "UCASE",
  "UNBASE64",
  "UPPER",
  // masking
  "MASK",
  "MASK_FIRST_N",
  "MASK_HASH",
  "MASK_LAST_N",
  "MASK_SHOW_FIRST_N",
  "MASK_SHOW_LAST_N",
  // misc
  "AES_DECRYPT",
  "AES_ENCRYPT",
  "CRC32",
  "CURRENT_DATABASE",
  "CURRENT_USER",
  "HASH",
  "JAVA_METHOD",
  "LOGGED_IN_USER",
  "MD5",
  "REFLECT",
  "SHA",
  "SHA1",
  "SHA2",
  "SURROGATE_KEY",
  "VERSION",
  // aggregate
  "AVG",
  "COLLECT_LIST",
  "COLLECT_SET",
  "CORR",
  "COUNT",
  "COVAR_POP",
  "COVAR_SAMP",
  "HISTOGRAM_NUMERIC",
  "MAX",
  "MIN",
  "NTILE",
  "PERCENTILE",
  "PERCENTILE_APPROX",
  "REGR_AVGX",
  "REGR_AVGY",
  "REGR_COUNT",
  "REGR_INTERCEPT",
  "REGR_R2",
  "REGR_SLOPE",
  "REGR_SXX",
  "REGR_SXY",
  "REGR_SYY",
  "STDDEV_POP",
  "STDDEV_SAMP",
  "SUM",
  "VAR_POP",
  "VAR_SAMP",
  "VARIANCE",
  // table
  "EXPLODE",
  "INLINE",
  "JSON_TUPLE",
  "PARSE_URL_TUPLE",
  "POSEXPLODE",
  "STACK",
  // https://cwiki.apache.org/confluence/display/Hive/LanguageManual+WindowingAndAnalytics
  "LEAD",
  "LAG",
  "FIRST_VALUE",
  "LAST_VALUE",
  "RANK",
  "ROW_NUMBER",
  "DENSE_RANK",
  "CUME_DIST",
  "PERCENT_RANK",
  "NTILE"
], bR = [
  // https://cwiki.apache.org/confluence/display/hive/languagemanual+ddl
  // Non-reserved keywords have proscribed meanings in. HiveQL, but can still be used as table or column names
  "ADD",
  "ADMIN",
  "AFTER",
  "ANALYZE",
  "ARCHIVE",
  "ASC",
  "BEFORE",
  "BUCKET",
  "BUCKETS",
  "CASCADE",
  "CHANGE",
  "CLUSTER",
  "CLUSTERED",
  "CLUSTERSTATUS",
  "COLLECTION",
  "COLUMNS",
  "COMMENT",
  "COMPACT",
  "COMPACTIONS",
  "COMPUTE",
  "CONCATENATE",
  "CONTINUE",
  "DATA",
  "DATABASES",
  "DATETIME",
  "DAY",
  "DBPROPERTIES",
  "DEFERRED",
  "DEFINED",
  "DELIMITED",
  "DEPENDENCY",
  "DESC",
  "DIRECTORIES",
  "DIRECTORY",
  "DISABLE",
  "DISTRIBUTE",
  "ELEM_TYPE",
  "ENABLE",
  "ESCAPED",
  "EXCLUSIVE",
  "EXPLAIN",
  "EXPORT",
  "FIELDS",
  "FILE",
  "FILEFORMAT",
  "FIRST",
  "FORMAT",
  "FORMATTED",
  "FUNCTIONS",
  "HOLD_DDLTIME",
  "HOUR",
  "IDXPROPERTIES",
  "IGNORE",
  "INDEX",
  "INDEXES",
  "INPATH",
  "INPUTDRIVER",
  "INPUTFORMAT",
  "ITEMS",
  "JAR",
  "KEYS",
  "KEY_TYPE",
  "LIMIT",
  "LINES",
  "LOAD",
  "LOCATION",
  "LOCK",
  "LOCKS",
  "LOGICAL",
  "LONG",
  "MAPJOIN",
  "MATERIALIZED",
  "METADATA",
  "MINUS",
  "MINUTE",
  "MONTH",
  "MSCK",
  "NOSCAN",
  "NO_DROP",
  "OFFLINE",
  "OPTION",
  "OUTPUTDRIVER",
  "OUTPUTFORMAT",
  "OVERWRITE",
  "OWNER",
  "PARTITIONED",
  "PARTITIONS",
  "PLUS",
  "PRETTY",
  "PRINCIPALS",
  "PROTECTION",
  "PURGE",
  "READ",
  "READONLY",
  "REBUILD",
  "RECORDREADER",
  "RECORDWRITER",
  "RELOAD",
  "RENAME",
  "REPAIR",
  "REPLACE",
  "REPLICATION",
  "RESTRICT",
  "REWRITE",
  "ROLE",
  "ROLES",
  "SCHEMA",
  "SCHEMAS",
  "SECOND",
  "SEMI",
  "SERDE",
  "SERDEPROPERTIES",
  "SERVER",
  "SETS",
  "SHARED",
  "SHOW",
  "SHOW_DATABASE",
  "SKEWED",
  "SORT",
  "SORTED",
  "SSL",
  "STATISTICS",
  "STORED",
  "STREAMTABLE",
  "STRING",
  "TABLES",
  "TBLPROPERTIES",
  "TEMPORARY",
  "TERMINATED",
  "TINYINT",
  "TOUCH",
  "TRANSACTIONS",
  "UNARCHIVE",
  "UNDO",
  "UNIONTYPE",
  "UNLOCK",
  "UNSET",
  "UNSIGNED",
  "URI",
  "USE",
  "UTC",
  "UTCTIMESTAMP",
  "VALUE_TYPE",
  "VIEW",
  "WHILE",
  "YEAR",
  "AUTOCOMMIT",
  "ISOLATION",
  "LEVEL",
  "OFFSET",
  "SNAPSHOT",
  "TRANSACTION",
  "WORK",
  "WRITE",
  "ABORT",
  "KEY",
  "LAST",
  "NORELY",
  "NOVALIDATE",
  "NULLS",
  "RELY",
  "VALIDATE",
  "DETAIL",
  "DOW",
  "EXPRESSION",
  "OPERATOR",
  "QUARTER",
  "SUMMARY",
  "VECTORIZATION",
  "WEEK",
  "YEARS",
  "MONTHS",
  "WEEKS",
  "DAYS",
  "HOURS",
  "MINUTES",
  "SECONDS",
  "TIMESTAMPTZ",
  "ZONE",
  // reserved
  "ALL",
  "ALTER",
  "AND",
  "AS",
  "AUTHORIZATION",
  "BETWEEN",
  "BOTH",
  "BY",
  "CASE",
  "CAST",
  "COLUMN",
  "CONF",
  "CREATE",
  "CROSS",
  "CUBE",
  "CURRENT",
  "CURRENT_DATE",
  "CURRENT_TIMESTAMP",
  "CURSOR",
  "DATABASE",
  "DELETE",
  "DESCRIBE",
  "DISTINCT",
  "DROP",
  "ELSE",
  "END",
  "EXCHANGE",
  "EXISTS",
  "EXTENDED",
  "EXTERNAL",
  "FALSE",
  "FETCH",
  "FOLLOWING",
  "FOR",
  "FROM",
  "FULL",
  "FUNCTION",
  "GRANT",
  "GROUP",
  "GROUPING",
  "HAVING",
  "IF",
  "IMPORT",
  "IN",
  "INNER",
  "INSERT",
  "INTERSECT",
  "INTO",
  "IS",
  "JOIN",
  "LATERAL",
  "LEFT",
  "LESS",
  "LIKE",
  "LOCAL",
  "MACRO",
  "MORE",
  "NONE",
  "NOT",
  "NULL",
  "OF",
  "ON",
  "OR",
  "ORDER",
  "OUT",
  "OUTER",
  "OVER",
  "PARTIALSCAN",
  "PARTITION",
  "PERCENT",
  "PRECEDING",
  "PRESERVE",
  "PROCEDURE",
  "RANGE",
  "READS",
  "REDUCE",
  "REVOKE",
  "RIGHT",
  "ROLLUP",
  "ROW",
  "ROWS",
  "SELECT",
  "SET",
  "TABLE",
  "TABLESAMPLE",
  "THEN",
  "TO",
  "TRANSFORM",
  "TRIGGER",
  "TRUE",
  "TRUNCATE",
  "UNBOUNDED",
  "UNION",
  "UNIQUEJOIN",
  "UPDATE",
  "USER",
  "USING",
  "UTC_TMESTAMP",
  "VALUES",
  "WHEN",
  "WHERE",
  "WINDOW",
  "WITH",
  "COMMIT",
  "ONLY",
  "REGEXP",
  "RLIKE",
  "ROLLBACK",
  "START",
  "CACHE",
  "CONSTRAINT",
  "FOREIGN",
  "PRIMARY",
  "REFERENCES",
  "DAYOFWEEK",
  "EXTRACT",
  "FLOOR",
  "VIEWS",
  "TIME",
  "SYNC",
  // fileTypes
  "TEXTFILE",
  "SEQUENCEFILE",
  "ORC",
  "CSV",
  "TSV",
  "PARQUET",
  "AVRO",
  "RCFILE",
  "JSONFILE",
  "INPUTFORMAT",
  "OUTPUTFORMAT"
], WR = [
  // https://cwiki.apache.org/confluence/display/Hive/LanguageManual+Types
  "ARRAY",
  "BIGINT",
  "BINARY",
  "BOOLEAN",
  "CHAR",
  "DATE",
  "DECIMAL",
  "DOUBLE",
  "FLOAT",
  "INT",
  "INTEGER",
  "INTERVAL",
  "MAP",
  "NUMERIC",
  "PRECISION",
  "SMALLINT",
  "STRUCT",
  "TIMESTAMP",
  "VARCHAR"
], XR = S(["SELECT [ALL | DISTINCT]"]), xR = S([
  // queries
  "WITH",
  "FROM",
  "WHERE",
  "GROUP BY",
  "HAVING",
  "WINDOW",
  "PARTITION BY",
  "ORDER BY",
  "SORT BY",
  "CLUSTER BY",
  "DISTRIBUTE BY",
  "LIMIT",
  // Data manipulation
  // - insert:
  //   Hive does not actually support plain INSERT INTO, only INSERT INTO TABLE
  //   but it's a nuisance to not support it, as all other dialects do.
  "INSERT INTO [TABLE]",
  "VALUES",
  // - update:
  "SET",
  // - merge:
  "MERGE INTO",
  "WHEN [NOT] MATCHED [THEN]",
  "UPDATE SET",
  "INSERT [VALUES]",
  // - insert overwrite directory:
  //   https://cwiki.apache.org/confluence/display/Hive/LanguageManual+DML#LanguageManualDML-Writingdataintothefilesystemfromqueries
  "INSERT OVERWRITE [LOCAL] DIRECTORY",
  // - load:
  //   https://cwiki.apache.org/confluence/display/Hive/LanguageManual+DML#LanguageManualDML-Loadingfilesintotables
  "LOAD DATA [LOCAL] INPATH",
  "[OVERWRITE] INTO TABLE"
]), LT = S([
  "CREATE [TEMPORARY] [EXTERNAL] TABLE [IF NOT EXISTS]"
]), dE = S([
  // - create:
  "CREATE [MATERIALIZED] VIEW [IF NOT EXISTS]",
  // - update:
  "UPDATE",
  // - delete:
  "DELETE FROM",
  // - drop table:
  "DROP TABLE [IF EXISTS]",
  // - alter table:
  "ALTER TABLE",
  "RENAME TO",
  // - truncate:
  "TRUNCATE [TABLE]",
  // other
  "ALTER",
  "CREATE",
  "USE",
  "DESCRIBE",
  "DROP",
  "FETCH",
  "SHOW",
  "STORED AS",
  "STORED BY",
  "ROW FORMAT"
]), vR = S(["UNION [ALL | DISTINCT]"]), $R = S([
  "JOIN",
  "{LEFT | RIGHT | FULL} [OUTER] JOIN",
  "{INNER | CROSS} JOIN",
  // non-standard joins
  "LEFT SEMI JOIN"
]), KR = S(["{ROWS | RANGE} BETWEEN"]), wR = S([]), JR = {
  name: "hive",
  tokenizerOptions: {
    reservedSelect: XR,
    reservedClauses: [...xR, ...LT, ...dE],
    reservedSetOperations: vR,
    reservedJoins: $R,
    reservedKeywordPhrases: KR,
    reservedDataTypePhrases: wR,
    reservedKeywords: bR,
    reservedDataTypes: WR,
    reservedFunctionNames: VR,
    extraParens: ["[]"],
    stringTypes: ['""-bs', "''-bs"],
    identTypes: ["``"],
    variableTypes: [{ quote: "{}", prefixes: ["$"], requirePrefix: !0 }],
    operators: ["%", "~", "^", "|", "&", "<=>", "==", "!", "||"]
  },
  formatOptions: {
    onelineClauses: [...LT, ...dE],
    tabularOnelineClauses: dE
  }
};
function oE(E) {
  return E.map((T, e) => {
    const R = E[e + 1] || w;
    if (J.SET(T) && R.text === "(")
      return Object.assign(Object.assign({}, T), { type: C.RESERVED_FUNCTION_NAME });
    const t = E[e - 1] || w;
    return J.VALUES(T) && t.text === "=" ? Object.assign(Object.assign({}, T), { type: C.RESERVED_FUNCTION_NAME }) : T;
  });
}
const kR = [
  // https://mariadb.com/kb/en/reserved-words/
  "ACCESSIBLE",
  "ADD",
  "ALL",
  "ALTER",
  "ANALYZE",
  "AND",
  "AS",
  "ASC",
  "ASENSITIVE",
  "BEFORE",
  "BETWEEN",
  "BOTH",
  "BY",
  "CALL",
  "CASCADE",
  "CASE",
  "CHANGE",
  "CHECK",
  "COLLATE",
  "COLUMN",
  "CONDITION",
  "CONSTRAINT",
  "CONTINUE",
  "CONVERT",
  "CREATE",
  "CROSS",
  "CURRENT_DATE",
  "CURRENT_ROLE",
  "CURRENT_TIME",
  "CURRENT_TIMESTAMP",
  "CURRENT_USER",
  "CURSOR",
  "DATABASE",
  "DATABASES",
  "DAY_HOUR",
  "DAY_MICROSECOND",
  "DAY_MINUTE",
  "DAY_SECOND",
  "DECLARE",
  "DEFAULT",
  "DELAYED",
  "DELETE",
  "DELETE_DOMAIN_ID",
  "DESC",
  "DESCRIBE",
  "DETERMINISTIC",
  "DISTINCT",
  "DISTINCTROW",
  "DIV",
  "DO_DOMAIN_IDS",
  "DROP",
  "DUAL",
  "EACH",
  "ELSE",
  "ELSEIF",
  "ENCLOSED",
  "ESCAPED",
  "EXCEPT",
  "EXISTS",
  "EXIT",
  "EXPLAIN",
  "FALSE",
  "FETCH",
  "FOR",
  "FORCE",
  "FOREIGN",
  "FROM",
  "FULLTEXT",
  "GENERAL",
  "GRANT",
  "GROUP",
  "HAVING",
  "HIGH_PRIORITY",
  "HOUR_MICROSECOND",
  "HOUR_MINUTE",
  "HOUR_SECOND",
  "IF",
  "IGNORE",
  "IGNORE_DOMAIN_IDS",
  "IGNORE_SERVER_IDS",
  "IN",
  "INDEX",
  "INFILE",
  "INNER",
  "INOUT",
  "INSENSITIVE",
  "INSERT",
  "INTERSECT",
  "INTERVAL",
  "INTO",
  "IS",
  "ITERATE",
  "JOIN",
  "KEY",
  "KEYS",
  "KILL",
  "LEADING",
  "LEAVE",
  "LEFT",
  "LIKE",
  "LIMIT",
  "LINEAR",
  "LINES",
  "LOAD",
  "LOCALTIME",
  "LOCALTIMESTAMP",
  "LOCK",
  "LOOP",
  "LOW_PRIORITY",
  "MASTER_HEARTBEAT_PERIOD",
  "MASTER_SSL_VERIFY_SERVER_CERT",
  "MATCH",
  "MAXVALUE",
  "MINUTE_MICROSECOND",
  "MINUTE_SECOND",
  "MOD",
  "MODIFIES",
  "NATURAL",
  "NOT",
  "NO_WRITE_TO_BINLOG",
  "NULL",
  "OFFSET",
  "ON",
  "OPTIMIZE",
  "OPTION",
  "OPTIONALLY",
  "OR",
  "ORDER",
  "OUT",
  "OUTER",
  "OUTFILE",
  "OVER",
  "PAGE_CHECKSUM",
  "PARSE_VCOL_EXPR",
  "PARTITION",
  "POSITION",
  "PRIMARY",
  "PROCEDURE",
  "PURGE",
  "RANGE",
  "READ",
  "READS",
  "READ_WRITE",
  "RECURSIVE",
  "REF_SYSTEM_ID",
  "REFERENCES",
  "REGEXP",
  "RELEASE",
  "RENAME",
  "REPEAT",
  "REPLACE",
  "REQUIRE",
  "RESIGNAL",
  "RESTRICT",
  "RETURN",
  "RETURNING",
  "REVOKE",
  "RIGHT",
  "RLIKE",
  "ROW_NUMBER",
  "ROWS",
  "SCHEMA",
  "SCHEMAS",
  "SECOND_MICROSECOND",
  "SELECT",
  "SENSITIVE",
  "SEPARATOR",
  "SET",
  "SHOW",
  "SIGNAL",
  "SLOW",
  "SPATIAL",
  "SPECIFIC",
  "SQL",
  "SQLEXCEPTION",
  "SQLSTATE",
  "SQLWARNING",
  "SQL_BIG_RESULT",
  "SQL_CALC_FOUND_ROWS",
  "SQL_SMALL_RESULT",
  "SSL",
  "STARTING",
  "STATS_AUTO_RECALC",
  "STATS_PERSISTENT",
  "STATS_SAMPLE_PAGES",
  "STRAIGHT_JOIN",
  "TABLE",
  "TERMINATED",
  "THEN",
  "TO",
  "TRAILING",
  "TRIGGER",
  "TRUE",
  "UNDO",
  "UNION",
  "UNIQUE",
  "UNLOCK",
  "UNSIGNED",
  "UPDATE",
  "USAGE",
  "USE",
  "USING",
  "UTC_DATE",
  "UTC_TIME",
  "UTC_TIMESTAMP",
  "VALUES",
  "WHEN",
  "WHERE",
  "WHILE",
  "WINDOW",
  "WITH",
  "WRITE",
  "XOR",
  "YEAR_MONTH",
  "ZEROFILL"
], qR = [
  // https://mariadb.com/kb/en/data-types/
  "BIGINT",
  "BINARY",
  "BIT",
  "BLOB",
  "CHAR BYTE",
  "CHAR",
  "CHARACTER",
  "DATETIME",
  "DEC",
  "DECIMAL",
  "DOUBLE PRECISION",
  "DOUBLE",
  "ENUM",
  "FIXED",
  "FLOAT",
  "FLOAT4",
  "FLOAT8",
  "INT",
  "INT1",
  "INT2",
  "INT3",
  "INT4",
  "INT8",
  "INTEGER",
  "LONG",
  "LONGBLOB",
  "LONGTEXT",
  "MEDIUMBLOB",
  "MEDIUMINT",
  "MEDIUMTEXT",
  "MIDDLEINT",
  "NATIONAL CHAR",
  "NATIONAL VARCHAR",
  "NUMERIC",
  "PRECISION",
  "REAL",
  "SMALLINT",
  "TEXT",
  "TIMESTAMP",
  "TINYBLOB",
  "TINYINT",
  "TINYTEXT",
  "VARBINARY",
  "VARCHAR",
  "VARCHARACTER",
  "VARYING",
  "YEAR"
  // 'NUMBER', // ?? In oracle mode only
  // 'SET' // handled as special-case in postProcess
], QR = [
  // https://mariadb.com/kb/en/information-schema-sql_functions-table/
  "ADDDATE",
  "ADD_MONTHS",
  "BIT_AND",
  "BIT_OR",
  "BIT_XOR",
  "CAST",
  "COUNT",
  "CUME_DIST",
  "CURDATE",
  "CURTIME",
  "DATE_ADD",
  "DATE_SUB",
  "DATE_FORMAT",
  "DECODE",
  "DENSE_RANK",
  "EXTRACT",
  "FIRST_VALUE",
  "GROUP_CONCAT",
  "JSON_ARRAYAGG",
  "JSON_OBJECTAGG",
  "LAG",
  "LEAD",
  "MAX",
  "MEDIAN",
  "MID",
  "MIN",
  "NOW",
  "NTH_VALUE",
  "NTILE",
  "POSITION",
  "PERCENT_RANK",
  "PERCENTILE_CONT",
  "PERCENTILE_DISC",
  "RANK",
  "ROW_NUMBER",
  "SESSION_USER",
  "STD",
  "STDDEV",
  "STDDEV_POP",
  "STDDEV_SAMP",
  "SUBDATE",
  "SUBSTR",
  "SUBSTRING",
  "SUM",
  "SYSTEM_USER",
  "TRIM",
  "TRIM_ORACLE",
  "VARIANCE",
  "VAR_POP",
  "VAR_SAMP",
  "ABS",
  "ACOS",
  "ADDTIME",
  "AES_DECRYPT",
  "AES_ENCRYPT",
  "ASIN",
  "ATAN",
  "ATAN2",
  "BENCHMARK",
  "BIN",
  "BINLOG_GTID_POS",
  "BIT_COUNT",
  "BIT_LENGTH",
  "CEIL",
  "CEILING",
  "CHARACTER_LENGTH",
  "CHAR_LENGTH",
  "CHR",
  "COERCIBILITY",
  "COLUMN_CHECK",
  "COLUMN_EXISTS",
  "COLUMN_LIST",
  "COLUMN_JSON",
  "COMPRESS",
  "CONCAT",
  "CONCAT_OPERATOR_ORACLE",
  "CONCAT_WS",
  "CONNECTION_ID",
  "CONV",
  "CONVERT_TZ",
  "COS",
  "COT",
  "CRC32",
  "DATEDIFF",
  "DAYNAME",
  "DAYOFMONTH",
  "DAYOFWEEK",
  "DAYOFYEAR",
  "DEGREES",
  "DECODE_HISTOGRAM",
  "DECODE_ORACLE",
  "DES_DECRYPT",
  "DES_ENCRYPT",
  "ELT",
  "ENCODE",
  "ENCRYPT",
  "EXP",
  "EXPORT_SET",
  "EXTRACTVALUE",
  "FIELD",
  "FIND_IN_SET",
  "FLOOR",
  "FORMAT",
  "FOUND_ROWS",
  "FROM_BASE64",
  "FROM_DAYS",
  "FROM_UNIXTIME",
  "GET_LOCK",
  "GREATEST",
  "HEX",
  "IFNULL",
  "INSTR",
  "ISNULL",
  "IS_FREE_LOCK",
  "IS_USED_LOCK",
  "JSON_ARRAY",
  "JSON_ARRAY_APPEND",
  "JSON_ARRAY_INSERT",
  "JSON_COMPACT",
  "JSON_CONTAINS",
  "JSON_CONTAINS_PATH",
  "JSON_DEPTH",
  "JSON_DETAILED",
  "JSON_EXISTS",
  "JSON_EXTRACT",
  "JSON_INSERT",
  "JSON_KEYS",
  "JSON_LENGTH",
  "JSON_LOOSE",
  "JSON_MERGE",
  "JSON_MERGE_PATCH",
  "JSON_MERGE_PRESERVE",
  "JSON_QUERY",
  "JSON_QUOTE",
  "JSON_OBJECT",
  "JSON_REMOVE",
  "JSON_REPLACE",
  "JSON_SET",
  "JSON_SEARCH",
  "JSON_TYPE",
  "JSON_UNQUOTE",
  "JSON_VALID",
  "JSON_VALUE",
  "LAST_DAY",
  "LAST_INSERT_ID",
  "LCASE",
  "LEAST",
  "LENGTH",
  "LENGTHB",
  "LN",
  "LOAD_FILE",
  "LOCATE",
  "LOG",
  "LOG10",
  "LOG2",
  "LOWER",
  "LPAD",
  "LPAD_ORACLE",
  "LTRIM",
  "LTRIM_ORACLE",
  "MAKEDATE",
  "MAKETIME",
  "MAKE_SET",
  "MASTER_GTID_WAIT",
  "MASTER_POS_WAIT",
  "MD5",
  "MONTHNAME",
  "NAME_CONST",
  "NVL",
  "NVL2",
  "OCT",
  "OCTET_LENGTH",
  "ORD",
  "PERIOD_ADD",
  "PERIOD_DIFF",
  "PI",
  "POW",
  "POWER",
  "QUOTE",
  "REGEXP_INSTR",
  "REGEXP_REPLACE",
  "REGEXP_SUBSTR",
  "RADIANS",
  "RAND",
  "RELEASE_ALL_LOCKS",
  "RELEASE_LOCK",
  "REPLACE_ORACLE",
  "REVERSE",
  "ROUND",
  "RPAD",
  "RPAD_ORACLE",
  "RTRIM",
  "RTRIM_ORACLE",
  "SEC_TO_TIME",
  "SHA",
  "SHA1",
  "SHA2",
  "SIGN",
  "SIN",
  "SLEEP",
  "SOUNDEX",
  "SPACE",
  "SQRT",
  "STRCMP",
  "STR_TO_DATE",
  "SUBSTR_ORACLE",
  "SUBSTRING_INDEX",
  "SUBTIME",
  "SYS_GUID",
  "TAN",
  "TIMEDIFF",
  "TIME_FORMAT",
  "TIME_TO_SEC",
  "TO_BASE64",
  "TO_CHAR",
  "TO_DAYS",
  "TO_SECONDS",
  "UCASE",
  "UNCOMPRESS",
  "UNCOMPRESSED_LENGTH",
  "UNHEX",
  "UNIX_TIMESTAMP",
  "UPDATEXML",
  "UPPER",
  "UUID",
  "UUID_SHORT",
  "VERSION",
  "WEEKDAY",
  "WEEKOFYEAR",
  "WSREP_LAST_WRITTEN_GTID",
  "WSREP_LAST_SEEN_GTID",
  "WSREP_SYNC_WAIT_UPTO_GTID",
  "YEARWEEK",
  // CASE expression shorthands
  "COALESCE",
  "NULLIF"
], ZR = S(["SELECT [ALL | DISTINCT | DISTINCTROW]"]), jR = S([
  // queries
  "WITH [RECURSIVE]",
  "FROM",
  "WHERE",
  "GROUP BY",
  "HAVING",
  "PARTITION BY",
  "ORDER BY",
  "LIMIT",
  "OFFSET",
  "FETCH {FIRST | NEXT}",
  // Data manipulation
  // - insert:
  "INSERT [LOW_PRIORITY | DELAYED | HIGH_PRIORITY] [IGNORE] [INTO]",
  "REPLACE [LOW_PRIORITY | DELAYED] [INTO]",
  "VALUES",
  "ON DUPLICATE KEY UPDATE",
  // - update:
  "SET",
  // other
  "RETURNING"
]), oT = S([
  "CREATE [OR REPLACE] [TEMPORARY] TABLE [IF NOT EXISTS]"
]), pE = S([
  // - create:
  "CREATE [OR REPLACE] [SQL SECURITY DEFINER | SQL SECURITY INVOKER] VIEW [IF NOT EXISTS]",
  // - update:
  "UPDATE [LOW_PRIORITY] [IGNORE]",
  // - delete:
  "DELETE [LOW_PRIORITY] [QUICK] [IGNORE] FROM",
  // - drop table:
  "DROP [TEMPORARY] TABLE [IF EXISTS]",
  // - alter table:
  "ALTER [ONLINE] [IGNORE] TABLE [IF EXISTS]",
  "ADD [COLUMN] [IF NOT EXISTS]",
  "{CHANGE | MODIFY} [COLUMN] [IF EXISTS]",
  "DROP [COLUMN] [IF EXISTS]",
  "RENAME [TO]",
  "RENAME COLUMN",
  "ALTER [COLUMN]",
  "{SET | DROP} DEFAULT",
  "SET {VISIBLE | INVISIBLE}",
  // - truncate:
  "TRUNCATE [TABLE]",
  // https://mariadb.com/docs/reference/mdb/sql-statements/
  "ALTER DATABASE",
  "ALTER DATABASE COMMENT",
  "ALTER EVENT",
  "ALTER FUNCTION",
  "ALTER PROCEDURE",
  "ALTER SCHEMA",
  "ALTER SCHEMA COMMENT",
  "ALTER SEQUENCE",
  "ALTER SERVER",
  "ALTER USER",
  "ALTER VIEW",
  "ANALYZE",
  "ANALYZE TABLE",
  "BACKUP LOCK",
  "BACKUP STAGE",
  "BACKUP UNLOCK",
  "BEGIN",
  "BINLOG",
  "CACHE INDEX",
  "CALL",
  "CHANGE MASTER TO",
  "CHECK TABLE",
  "CHECK VIEW",
  "CHECKSUM TABLE",
  "COMMIT",
  "CREATE AGGREGATE FUNCTION",
  "CREATE DATABASE",
  "CREATE EVENT",
  "CREATE FUNCTION",
  "CREATE INDEX",
  "CREATE PROCEDURE",
  "CREATE ROLE",
  "CREATE SEQUENCE",
  "CREATE SERVER",
  "CREATE SPATIAL INDEX",
  "CREATE TRIGGER",
  "CREATE UNIQUE INDEX",
  "CREATE USER",
  "DEALLOCATE PREPARE",
  "DESCRIBE",
  "DROP DATABASE",
  "DROP EVENT",
  "DROP FUNCTION",
  "DROP INDEX",
  "DROP PREPARE",
  "DROP PROCEDURE",
  "DROP ROLE",
  "DROP SEQUENCE",
  "DROP SERVER",
  "DROP TRIGGER",
  "DROP USER",
  "DROP VIEW",
  "EXECUTE",
  "EXPLAIN",
  "FLUSH",
  "GET DIAGNOSTICS",
  "GET DIAGNOSTICS CONDITION",
  "GRANT",
  "HANDLER",
  "HELP",
  "INSTALL PLUGIN",
  "INSTALL SONAME",
  "KILL",
  "LOAD DATA INFILE",
  "LOAD INDEX INTO CACHE",
  "LOAD XML INFILE",
  "LOCK TABLE",
  "OPTIMIZE TABLE",
  "PREPARE",
  "PURGE BINARY LOGS",
  "PURGE MASTER LOGS",
  "RELEASE SAVEPOINT",
  "RENAME TABLE",
  "RENAME USER",
  "REPAIR TABLE",
  "REPAIR VIEW",
  "RESET MASTER",
  "RESET QUERY CACHE",
  "RESET REPLICA",
  "RESET SLAVE",
  "RESIGNAL",
  "REVOKE",
  "ROLLBACK",
  "SAVEPOINT",
  "SET CHARACTER SET",
  "SET DEFAULT ROLE",
  "SET GLOBAL TRANSACTION",
  "SET NAMES",
  "SET PASSWORD",
  "SET ROLE",
  "SET STATEMENT",
  "SET TRANSACTION",
  "SHOW",
  "SHOW ALL REPLICAS STATUS",
  "SHOW ALL SLAVES STATUS",
  "SHOW AUTHORS",
  "SHOW BINARY LOGS",
  "SHOW BINLOG EVENTS",
  "SHOW BINLOG STATUS",
  "SHOW CHARACTER SET",
  "SHOW CLIENT_STATISTICS",
  "SHOW COLLATION",
  "SHOW COLUMNS",
  "SHOW CONTRIBUTORS",
  "SHOW CREATE DATABASE",
  "SHOW CREATE EVENT",
  "SHOW CREATE FUNCTION",
  "SHOW CREATE PACKAGE",
  "SHOW CREATE PACKAGE BODY",
  "SHOW CREATE PROCEDURE",
  "SHOW CREATE SEQUENCE",
  "SHOW CREATE TABLE",
  "SHOW CREATE TRIGGER",
  "SHOW CREATE USER",
  "SHOW CREATE VIEW",
  "SHOW DATABASES",
  "SHOW ENGINE",
  "SHOW ENGINE INNODB STATUS",
  "SHOW ENGINES",
  "SHOW ERRORS",
  "SHOW EVENTS",
  "SHOW EXPLAIN",
  "SHOW FUNCTION CODE",
  "SHOW FUNCTION STATUS",
  "SHOW GRANTS",
  "SHOW INDEX",
  "SHOW INDEXES",
  "SHOW INDEX_STATISTICS",
  "SHOW KEYS",
  "SHOW LOCALES",
  "SHOW MASTER LOGS",
  "SHOW MASTER STATUS",
  "SHOW OPEN TABLES",
  "SHOW PACKAGE BODY CODE",
  "SHOW PACKAGE BODY STATUS",
  "SHOW PACKAGE STATUS",
  "SHOW PLUGINS",
  "SHOW PLUGINS SONAME",
  "SHOW PRIVILEGES",
  "SHOW PROCEDURE CODE",
  "SHOW PROCEDURE STATUS",
  "SHOW PROCESSLIST",
  "SHOW PROFILE",
  "SHOW PROFILES",
  "SHOW QUERY_RESPONSE_TIME",
  "SHOW RELAYLOG EVENTS",
  "SHOW REPLICA",
  "SHOW REPLICA HOSTS",
  "SHOW REPLICA STATUS",
  "SHOW SCHEMAS",
  "SHOW SLAVE",
  "SHOW SLAVE HOSTS",
  "SHOW SLAVE STATUS",
  "SHOW STATUS",
  "SHOW STORAGE ENGINES",
  "SHOW TABLE STATUS",
  "SHOW TABLES",
  "SHOW TRIGGERS",
  "SHOW USER_STATISTICS",
  "SHOW VARIABLES",
  "SHOW WARNINGS",
  "SHOW WSREP_MEMBERSHIP",
  "SHOW WSREP_STATUS",
  "SHUTDOWN",
  "SIGNAL",
  "START ALL REPLICAS",
  "START ALL SLAVES",
  "START REPLICA",
  "START SLAVE",
  "START TRANSACTION",
  "STOP ALL REPLICAS",
  "STOP ALL SLAVES",
  "STOP REPLICA",
  "STOP SLAVE",
  "UNINSTALL PLUGIN",
  "UNINSTALL SONAME",
  "UNLOCK TABLE",
  "USE",
  "XA BEGIN",
  "XA COMMIT",
  "XA END",
  "XA PREPARE",
  "XA RECOVER",
  "XA ROLLBACK",
  "XA START"
]), zR = S([
  "UNION [ALL | DISTINCT]",
  "EXCEPT [ALL | DISTINCT]",
  "INTERSECT [ALL | DISTINCT]",
  "MINUS [ALL | DISTINCT]"
]), EA = S([
  "JOIN",
  "{LEFT | RIGHT} [OUTER] JOIN",
  "{INNER | CROSS} JOIN",
  "NATURAL JOIN",
  "NATURAL {LEFT | RIGHT} [OUTER] JOIN",
  // non-standard joins
  "STRAIGHT_JOIN"
]), TA = S([
  "ON {UPDATE | DELETE} [SET NULL | SET DEFAULT]",
  "CHARACTER SET",
  "{ROWS | RANGE} BETWEEN",
  "IDENTIFIED BY"
]), eA = S([]), RA = {
  name: "mariadb",
  tokenizerOptions: {
    reservedSelect: ZR,
    reservedClauses: [...jR, ...oT, ...pE],
    reservedSetOperations: zR,
    reservedJoins: EA,
    reservedKeywordPhrases: TA,
    reservedDataTypePhrases: eA,
    supportsXor: !0,
    reservedKeywords: kR,
    reservedDataTypes: qR,
    reservedFunctionNames: QR,
    // TODO: support _ char set prefixes such as _utf8, _latin1, _binary, _utf8mb4, etc.
    stringTypes: [
      '""-qq-bs',
      "''-qq-bs",
      { quote: "''-raw", prefixes: ["B", "X"], requirePrefix: !0 }
    ],
    identTypes: ["``"],
    identChars: { first: "$", rest: "$", allowFirstCharNumber: !0 },
    variableTypes: [
      { regex: "@@?[A-Za-z0-9_.$]+" },
      { quote: '""-qq-bs', prefixes: ["@"], requirePrefix: !0 },
      { quote: "''-qq-bs", prefixes: ["@"], requirePrefix: !0 },
      { quote: "``", prefixes: ["@"], requirePrefix: !0 }
    ],
    paramTypes: { positional: !0 },
    lineCommentTypes: ["--", "#"],
    operators: [
      "%",
      ":=",
      "&",
      "|",
      "^",
      "~",
      "<<",
      ">>",
      "<=>",
      "&&",
      "||",
      "!",
      "*.*"
      // Not actually an operator
    ],
    postProcess: oE
  },
  formatOptions: {
    onelineClauses: [...oT, ...pE],
    tabularOnelineClauses: pE
  }
}, AA = [
  // https://dev.mysql.com/doc/refman/8.0/en/keywords.html
  "ACCESSIBLE",
  "ADD",
  "ALL",
  "ALTER",
  "ANALYZE",
  "AND",
  "AS",
  "ASC",
  "ASENSITIVE",
  "BEFORE",
  "BETWEEN",
  "BOTH",
  "BY",
  "CALL",
  "CASCADE",
  "CASE",
  "CHANGE",
  "CHECK",
  "COLLATE",
  "COLUMN",
  "CONDITION",
  "CONSTRAINT",
  "CONTINUE",
  "CONVERT",
  "CREATE",
  "CROSS",
  "CUBE",
  "CUME_DIST",
  "CURRENT_DATE",
  "CURRENT_TIME",
  "CURRENT_TIMESTAMP",
  "CURRENT_USER",
  "CURSOR",
  "DATABASE",
  "DATABASES",
  "DAY_HOUR",
  "DAY_MICROSECOND",
  "DAY_MINUTE",
  "DAY_SECOND",
  "DECLARE",
  "DEFAULT",
  "DELAYED",
  "DELETE",
  "DENSE_RANK",
  "DESC",
  "DESCRIBE",
  "DETERMINISTIC",
  "DISTINCT",
  "DISTINCTROW",
  "DIV",
  "DROP",
  "DUAL",
  "EACH",
  "ELSE",
  "ELSEIF",
  "EMPTY",
  "ENCLOSED",
  "ESCAPED",
  "EXCEPT",
  "EXISTS",
  "EXIT",
  "EXPLAIN",
  "FALSE",
  "FETCH",
  "FIRST_VALUE",
  "FOR",
  "FORCE",
  "FOREIGN",
  "FROM",
  "FULLTEXT",
  "FUNCTION",
  "GENERATED",
  "GET",
  "GRANT",
  "GROUP",
  "GROUPING",
  "GROUPS",
  "HAVING",
  "HIGH_PRIORITY",
  "HOUR_MICROSECOND",
  "HOUR_MINUTE",
  "HOUR_SECOND",
  "IF",
  "IGNORE",
  "IN",
  "INDEX",
  "INFILE",
  "INNER",
  "INOUT",
  "INSENSITIVE",
  "INSERT",
  "IN",
  "INTERSECT",
  "INTERVAL",
  "INTO",
  "IO_AFTER_GTIDS",
  "IO_BEFORE_GTIDS",
  "IS",
  "ITERATE",
  "JOIN",
  "JSON_TABLE",
  "KEY",
  "KEYS",
  "KILL",
  "LAG",
  "LAST_VALUE",
  "LATERAL",
  "LEAD",
  "LEADING",
  "LEAVE",
  "LEFT",
  "LIKE",
  "LIMIT",
  "LINEAR",
  "LINES",
  "LOAD",
  "LOCALTIME",
  "LOCALTIMESTAMP",
  "LOCK",
  "LONG",
  "LOOP",
  "LOW_PRIORITY",
  "MASTER_BIND",
  "MASTER_SSL_VERIFY_SERVER_CERT",
  "MATCH",
  "MAXVALUE",
  "MINUTE_MICROSECOND",
  "MINUTE_SECOND",
  "MOD",
  "MODIFIES",
  "NATURAL",
  "NOT",
  "NO_WRITE_TO_BINLOG",
  "NTH_VALUE",
  "NTILE",
  "NULL",
  "OF",
  "ON",
  "OPTIMIZE",
  "OPTIMIZER_COSTS",
  "OPTION",
  "OPTIONALLY",
  "OR",
  "ORDER",
  "OUT",
  "OUTER",
  "OUTFILE",
  "OVER",
  "PARTITION",
  "PERCENT_RANK",
  "PRIMARY",
  "PROCEDURE",
  "PURGE",
  "RANGE",
  "RANK",
  "READ",
  "READS",
  "READ_WRITE",
  "RECURSIVE",
  "REFERENCES",
  "REGEXP",
  "RELEASE",
  "RENAME",
  "REPEAT",
  "REPLACE",
  "REQUIRE",
  "RESIGNAL",
  "RESTRICT",
  "RETURN",
  "REVOKE",
  "RIGHT",
  "RLIKE",
  "ROW",
  "ROWS",
  "ROW_NUMBER",
  "SCHEMA",
  "SCHEMAS",
  "SECOND_MICROSECOND",
  "SELECT",
  "SENSITIVE",
  "SEPARATOR",
  "SET",
  "SHOW",
  "SIGNAL",
  "SPATIAL",
  "SPECIFIC",
  "SQL",
  "SQLEXCEPTION",
  "SQLSTATE",
  "SQLWARNING",
  "SQL_BIG_RESULT",
  "SQL_CALC_FOUND_ROWS",
  "SQL_SMALL_RESULT",
  "SSL",
  "STARTING",
  "STORED",
  "STRAIGHT_JOIN",
  "SYSTEM",
  "TABLE",
  "TERMINATED",
  "THEN",
  "TO",
  "TRAILING",
  "TRIGGER",
  "TRUE",
  "UNDO",
  "UNION",
  "UNIQUE",
  "UNLOCK",
  "UNSIGNED",
  "UPDATE",
  "USAGE",
  "USE",
  "USING",
  "UTC_DATE",
  "UTC_TIME",
  "UTC_TIMESTAMP",
  "VALUES",
  "VIRTUAL",
  "WHEN",
  "WHERE",
  "WHILE",
  "WINDOW",
  "WITH",
  "WRITE",
  "XOR",
  "YEAR_MONTH",
  "ZEROFILL"
  // (R)
], tA = [
  // https://dev.mysql.com/doc/refman/8.0/en/data-types.html
  "BIGINT",
  "BINARY",
  "BIT",
  "BLOB",
  "BOOL",
  "BOOLEAN",
  "CHAR",
  "CHARACTER",
  "DATE",
  "DATETIME",
  "DEC",
  "DECIMAL",
  "DOUBLE PRECISION",
  "DOUBLE",
  "ENUM",
  "FIXED",
  "FLOAT",
  "FLOAT4",
  "FLOAT8",
  "INT",
  "INT1",
  "INT2",
  "INT3",
  "INT4",
  "INT8",
  "INTEGER",
  "LONGBLOB",
  "LONGTEXT",
  "MEDIUMBLOB",
  "MEDIUMINT",
  "MEDIUMTEXT",
  "MIDDLEINT",
  "NATIONAL CHAR",
  "NATIONAL VARCHAR",
  "NUMERIC",
  "PRECISION",
  "REAL",
  "SMALLINT",
  "TEXT",
  "TIME",
  "TIMESTAMP",
  "TINYBLOB",
  "TINYINT",
  "TINYTEXT",
  "VARBINARY",
  "VARCHAR",
  "VARCHARACTER",
  "VARYING",
  "YEAR"
  // 'SET' // handled as special-case in postProcess
], SA = [
  // https://dev.mysql.com/doc/refman/8.0/en/built-in-function-reference.html
  "ABS",
  "ACOS",
  "ADDDATE",
  "ADDTIME",
  "AES_DECRYPT",
  "AES_ENCRYPT",
  // 'AND',
  "ANY_VALUE",
  "ASCII",
  "ASIN",
  "ATAN",
  "ATAN2",
  "AVG",
  "BENCHMARK",
  "BIN",
  "BIN_TO_UUID",
  "BINARY",
  "BIT_AND",
  "BIT_COUNT",
  "BIT_LENGTH",
  "BIT_OR",
  "BIT_XOR",
  "CAN_ACCESS_COLUMN",
  "CAN_ACCESS_DATABASE",
  "CAN_ACCESS_TABLE",
  "CAN_ACCESS_USER",
  "CAN_ACCESS_VIEW",
  "CAST",
  "CEIL",
  "CEILING",
  "CHAR",
  "CHAR_LENGTH",
  "CHARACTER_LENGTH",
  "CHARSET",
  "COALESCE",
  "COERCIBILITY",
  "COLLATION",
  "COMPRESS",
  "CONCAT",
  "CONCAT_WS",
  "CONNECTION_ID",
  "CONV",
  "CONVERT",
  "CONVERT_TZ",
  "COS",
  "COT",
  "COUNT",
  "CRC32",
  "CUME_DIST",
  "CURDATE",
  "CURRENT_DATE",
  "CURRENT_ROLE",
  "CURRENT_TIME",
  "CURRENT_TIMESTAMP",
  "CURRENT_USER",
  "CURTIME",
  "DATABASE",
  "DATE",
  "DATE_ADD",
  "DATE_FORMAT",
  "DATE_SUB",
  "DATEDIFF",
  "DAY",
  "DAYNAME",
  "DAYOFMONTH",
  "DAYOFWEEK",
  "DAYOFYEAR",
  "DEFAULT",
  "DEGREES",
  "DENSE_RANK",
  "DIV",
  "ELT",
  "EXP",
  "EXPORT_SET",
  "EXTRACT",
  "EXTRACTVALUE",
  "FIELD",
  "FIND_IN_SET",
  "FIRST_VALUE",
  "FLOOR",
  "FORMAT",
  "FORMAT_BYTES",
  "FORMAT_PICO_TIME",
  "FOUND_ROWS",
  "FROM_BASE64",
  "FROM_DAYS",
  "FROM_UNIXTIME",
  "GEOMCOLLECTION",
  "GEOMETRYCOLLECTION",
  "GET_DD_COLUMN_PRIVILEGES",
  "GET_DD_CREATE_OPTIONS",
  "GET_DD_INDEX_SUB_PART_LENGTH",
  "GET_FORMAT",
  "GET_LOCK",
  "GREATEST",
  "GROUP_CONCAT",
  "GROUPING",
  "GTID_SUBSET",
  "GTID_SUBTRACT",
  "HEX",
  "HOUR",
  "ICU_VERSION",
  "IF",
  "IFNULL",
  // 'IN',
  "INET_ATON",
  "INET_NTOA",
  "INET6_ATON",
  "INET6_NTOA",
  "INSERT",
  "INSTR",
  "INTERNAL_AUTO_INCREMENT",
  "INTERNAL_AVG_ROW_LENGTH",
  "INTERNAL_CHECK_TIME",
  "INTERNAL_CHECKSUM",
  "INTERNAL_DATA_FREE",
  "INTERNAL_DATA_LENGTH",
  "INTERNAL_DD_CHAR_LENGTH",
  "INTERNAL_GET_COMMENT_OR_ERROR",
  "INTERNAL_GET_ENABLED_ROLE_JSON",
  "INTERNAL_GET_HOSTNAME",
  "INTERNAL_GET_USERNAME",
  "INTERNAL_GET_VIEW_WARNING_OR_ERROR",
  "INTERNAL_INDEX_COLUMN_CARDINALITY",
  "INTERNAL_INDEX_LENGTH",
  "INTERNAL_IS_ENABLED_ROLE",
  "INTERNAL_IS_MANDATORY_ROLE",
  "INTERNAL_KEYS_DISABLED",
  "INTERNAL_MAX_DATA_LENGTH",
  "INTERNAL_TABLE_ROWS",
  "INTERNAL_UPDATE_TIME",
  "INTERVAL",
  "IS",
  "IS_FREE_LOCK",
  "IS_IPV4",
  "IS_IPV4_COMPAT",
  "IS_IPV4_MAPPED",
  "IS_IPV6",
  "IS NOT",
  "IS NOT NULL",
  "IS NULL",
  "IS_USED_LOCK",
  "IS_UUID",
  "ISNULL",
  "JSON_ARRAY",
  "JSON_ARRAY_APPEND",
  "JSON_ARRAY_INSERT",
  "JSON_ARRAYAGG",
  "JSON_CONTAINS",
  "JSON_CONTAINS_PATH",
  "JSON_DEPTH",
  "JSON_EXTRACT",
  "JSON_INSERT",
  "JSON_KEYS",
  "JSON_LENGTH",
  "JSON_MERGE",
  "JSON_MERGE_PATCH",
  "JSON_MERGE_PRESERVE",
  "JSON_OBJECT",
  "JSON_OBJECTAGG",
  "JSON_OVERLAPS",
  "JSON_PRETTY",
  "JSON_QUOTE",
  "JSON_REMOVE",
  "JSON_REPLACE",
  "JSON_SCHEMA_VALID",
  "JSON_SCHEMA_VALIDATION_REPORT",
  "JSON_SEARCH",
  "JSON_SET",
  "JSON_STORAGE_FREE",
  "JSON_STORAGE_SIZE",
  "JSON_TABLE",
  "JSON_TYPE",
  "JSON_UNQUOTE",
  "JSON_VALID",
  "JSON_VALUE",
  "LAG",
  "LAST_DAY",
  "LAST_INSERT_ID",
  "LAST_VALUE",
  "LCASE",
  "LEAD",
  "LEAST",
  "LEFT",
  "LENGTH",
  "LIKE",
  "LINESTRING",
  "LN",
  "LOAD_FILE",
  "LOCALTIME",
  "LOCALTIMESTAMP",
  "LOCATE",
  "LOG",
  "LOG10",
  "LOG2",
  "LOWER",
  "LPAD",
  "LTRIM",
  "MAKE_SET",
  "MAKEDATE",
  "MAKETIME",
  "MASTER_POS_WAIT",
  "MATCH",
  "MAX",
  "MBRCONTAINS",
  "MBRCOVEREDBY",
  "MBRCOVERS",
  "MBRDISJOINT",
  "MBREQUALS",
  "MBRINTERSECTS",
  "MBROVERLAPS",
  "MBRTOUCHES",
  "MBRWITHIN",
  "MD5",
  "MEMBER OF",
  "MICROSECOND",
  "MID",
  "MIN",
  "MINUTE",
  "MOD",
  "MONTH",
  "MONTHNAME",
  "MULTILINESTRING",
  "MULTIPOINT",
  "MULTIPOLYGON",
  "NAME_CONST",
  "NOT",
  "NOT IN",
  "NOT LIKE",
  "NOT REGEXP",
  "NOW",
  "NTH_VALUE",
  "NTILE",
  "NULLIF",
  "OCT",
  "OCTET_LENGTH",
  // 'OR',
  "ORD",
  "PERCENT_RANK",
  "PERIOD_ADD",
  "PERIOD_DIFF",
  "PI",
  "POINT",
  "POLYGON",
  "POSITION",
  "POW",
  "POWER",
  "PS_CURRENT_THREAD_ID",
  "PS_THREAD_ID",
  "QUARTER",
  "QUOTE",
  "RADIANS",
  "RAND",
  "RANDOM_BYTES",
  "RANK",
  "REGEXP",
  "REGEXP_INSTR",
  "REGEXP_LIKE",
  "REGEXP_REPLACE",
  "REGEXP_SUBSTR",
  "RELEASE_ALL_LOCKS",
  "RELEASE_LOCK",
  "REPEAT",
  "REPLACE",
  "REVERSE",
  "RIGHT",
  "RLIKE",
  "ROLES_GRAPHML",
  "ROUND",
  "ROW_COUNT",
  "ROW_NUMBER",
  "RPAD",
  "RTRIM",
  "SCHEMA",
  "SEC_TO_TIME",
  "SECOND",
  "SESSION_USER",
  "SHA1",
  "SHA2",
  "SIGN",
  "SIN",
  "SLEEP",
  "SOUNDEX",
  "SOUNDS LIKE",
  "SOURCE_POS_WAIT",
  "SPACE",
  "SQRT",
  "ST_AREA",
  "ST_ASBINARY",
  "ST_ASGEOJSON",
  "ST_ASTEXT",
  "ST_BUFFER",
  "ST_BUFFER_STRATEGY",
  "ST_CENTROID",
  "ST_COLLECT",
  "ST_CONTAINS",
  "ST_CONVEXHULL",
  "ST_CROSSES",
  "ST_DIFFERENCE",
  "ST_DIMENSION",
  "ST_DISJOINT",
  "ST_DISTANCE",
  "ST_DISTANCE_SPHERE",
  "ST_ENDPOINT",
  "ST_ENVELOPE",
  "ST_EQUALS",
  "ST_EXTERIORRING",
  "ST_FRECHETDISTANCE",
  "ST_GEOHASH",
  "ST_GEOMCOLLFROMTEXT",
  "ST_GEOMCOLLFROMWKB",
  "ST_GEOMETRYN",
  "ST_GEOMETRYTYPE",
  "ST_GEOMFROMGEOJSON",
  "ST_GEOMFROMTEXT",
  "ST_GEOMFROMWKB",
  "ST_HAUSDORFFDISTANCE",
  "ST_INTERIORRINGN",
  "ST_INTERSECTION",
  "ST_INTERSECTS",
  "ST_ISCLOSED",
  "ST_ISEMPTY",
  "ST_ISSIMPLE",
  "ST_ISVALID",
  "ST_LATFROMGEOHASH",
  "ST_LATITUDE",
  "ST_LENGTH",
  "ST_LINEFROMTEXT",
  "ST_LINEFROMWKB",
  "ST_LINEINTERPOLATEPOINT",
  "ST_LINEINTERPOLATEPOINTS",
  "ST_LONGFROMGEOHASH",
  "ST_LONGITUDE",
  "ST_MAKEENVELOPE",
  "ST_MLINEFROMTEXT",
  "ST_MLINEFROMWKB",
  "ST_MPOINTFROMTEXT",
  "ST_MPOINTFROMWKB",
  "ST_MPOLYFROMTEXT",
  "ST_MPOLYFROMWKB",
  "ST_NUMGEOMETRIES",
  "ST_NUMINTERIORRING",
  "ST_NUMPOINTS",
  "ST_OVERLAPS",
  "ST_POINTATDISTANCE",
  "ST_POINTFROMGEOHASH",
  "ST_POINTFROMTEXT",
  "ST_POINTFROMWKB",
  "ST_POINTN",
  "ST_POLYFROMTEXT",
  "ST_POLYFROMWKB",
  "ST_SIMPLIFY",
  "ST_SRID",
  "ST_STARTPOINT",
  "ST_SWAPXY",
  "ST_SYMDIFFERENCE",
  "ST_TOUCHES",
  "ST_TRANSFORM",
  "ST_UNION",
  "ST_VALIDATE",
  "ST_WITHIN",
  "ST_X",
  "ST_Y",
  "STATEMENT_DIGEST",
  "STATEMENT_DIGEST_TEXT",
  "STD",
  "STDDEV",
  "STDDEV_POP",
  "STDDEV_SAMP",
  "STR_TO_DATE",
  "STRCMP",
  "SUBDATE",
  "SUBSTR",
  "SUBSTRING",
  "SUBSTRING_INDEX",
  "SUBTIME",
  "SUM",
  "SYSDATE",
  "SYSTEM_USER",
  "TAN",
  "TIME",
  "TIME_FORMAT",
  "TIME_TO_SEC",
  "TIMEDIFF",
  "TIMESTAMP",
  "TIMESTAMPADD",
  "TIMESTAMPDIFF",
  "TO_BASE64",
  "TO_DAYS",
  "TO_SECONDS",
  "TRIM",
  "TRUNCATE",
  "UCASE",
  "UNCOMPRESS",
  "UNCOMPRESSED_LENGTH",
  "UNHEX",
  "UNIX_TIMESTAMP",
  "UPDATEXML",
  "UPPER",
  // 'USER',
  "UTC_DATE",
  "UTC_TIME",
  "UTC_TIMESTAMP",
  "UUID",
  "UUID_SHORT",
  "UUID_TO_BIN",
  "VALIDATE_PASSWORD_STRENGTH",
  "VALUES",
  "VAR_POP",
  "VAR_SAMP",
  "VARIANCE",
  "VERSION",
  "WAIT_FOR_EXECUTED_GTID_SET",
  "WAIT_UNTIL_SQL_THREAD_AFTER_GTIDS",
  "WEEK",
  "WEEKDAY",
  "WEEKOFYEAR",
  "WEIGHT_STRING",
  // 'XOR',
  "YEAR",
  "YEARWEEK"
], IA = S(["SELECT [ALL | DISTINCT | DISTINCTROW]"]), OA = S([
  // queries
  "WITH [RECURSIVE]",
  "FROM",
  "WHERE",
  "GROUP BY",
  "HAVING",
  "WINDOW",
  "PARTITION BY",
  "ORDER BY",
  "LIMIT",
  "OFFSET",
  // Data manipulation
  // - insert:
  "INSERT [LOW_PRIORITY | DELAYED | HIGH_PRIORITY] [IGNORE] [INTO]",
  "REPLACE [LOW_PRIORITY | DELAYED] [INTO]",
  "VALUES",
  "ON DUPLICATE KEY UPDATE",
  // - update:
  "SET"
]), iT = S(["CREATE [TEMPORARY] TABLE [IF NOT EXISTS]"]), GE = S([
  // - create:
  "CREATE [OR REPLACE] [SQL SECURITY DEFINER | SQL SECURITY INVOKER] VIEW [IF NOT EXISTS]",
  // - update:
  "UPDATE [LOW_PRIORITY] [IGNORE]",
  // - delete:
  "DELETE [LOW_PRIORITY] [QUICK] [IGNORE] FROM",
  // - drop table:
  "DROP [TEMPORARY] TABLE [IF EXISTS]",
  // - alter table:
  "ALTER TABLE",
  "ADD [COLUMN]",
  "{CHANGE | MODIFY} [COLUMN]",
  "DROP [COLUMN]",
  "RENAME [TO | AS]",
  "RENAME COLUMN",
  "ALTER [COLUMN]",
  "{SET | DROP} DEFAULT",
  // - truncate:
  "TRUNCATE [TABLE]",
  // https://dev.mysql.com/doc/refman/8.0/en/sql-statements.html
  "ALTER DATABASE",
  "ALTER EVENT",
  "ALTER FUNCTION",
  "ALTER INSTANCE",
  "ALTER LOGFILE GROUP",
  "ALTER PROCEDURE",
  "ALTER RESOURCE GROUP",
  "ALTER SERVER",
  "ALTER TABLESPACE",
  "ALTER USER",
  "ALTER VIEW",
  "ANALYZE TABLE",
  "BINLOG",
  "CACHE INDEX",
  "CALL",
  "CHANGE MASTER TO",
  "CHANGE REPLICATION FILTER",
  "CHANGE REPLICATION SOURCE TO",
  "CHECK TABLE",
  "CHECKSUM TABLE",
  "CLONE",
  "COMMIT",
  "CREATE DATABASE",
  "CREATE EVENT",
  "CREATE FUNCTION",
  "CREATE FUNCTION",
  "CREATE INDEX",
  "CREATE LOGFILE GROUP",
  "CREATE PROCEDURE",
  "CREATE RESOURCE GROUP",
  "CREATE ROLE",
  "CREATE SERVER",
  "CREATE SPATIAL REFERENCE SYSTEM",
  "CREATE TABLESPACE",
  "CREATE TRIGGER",
  "CREATE USER",
  "DEALLOCATE PREPARE",
  "DESCRIBE",
  "DROP DATABASE",
  "DROP EVENT",
  "DROP FUNCTION",
  "DROP FUNCTION",
  "DROP INDEX",
  "DROP LOGFILE GROUP",
  "DROP PROCEDURE",
  "DROP RESOURCE GROUP",
  "DROP ROLE",
  "DROP SERVER",
  "DROP SPATIAL REFERENCE SYSTEM",
  "DROP TABLESPACE",
  "DROP TRIGGER",
  "DROP USER",
  "DROP VIEW",
  "EXECUTE",
  "EXPLAIN",
  "FLUSH",
  "GRANT",
  "HANDLER",
  "HELP",
  "IMPORT TABLE",
  "INSTALL COMPONENT",
  "INSTALL PLUGIN",
  "KILL",
  "LOAD DATA",
  "LOAD INDEX INTO CACHE",
  "LOAD XML",
  "LOCK INSTANCE FOR BACKUP",
  "LOCK TABLES",
  "MASTER_POS_WAIT",
  "OPTIMIZE TABLE",
  "PREPARE",
  "PURGE BINARY LOGS",
  "RELEASE SAVEPOINT",
  "RENAME TABLE",
  "RENAME USER",
  "REPAIR TABLE",
  "RESET",
  "RESET MASTER",
  "RESET PERSIST",
  "RESET REPLICA",
  "RESET SLAVE",
  "RESTART",
  "REVOKE",
  "ROLLBACK",
  "ROLLBACK TO SAVEPOINT",
  "SAVEPOINT",
  "SET CHARACTER SET",
  "SET DEFAULT ROLE",
  "SET NAMES",
  "SET PASSWORD",
  "SET RESOURCE GROUP",
  "SET ROLE",
  "SET TRANSACTION",
  "SHOW",
  "SHOW BINARY LOGS",
  "SHOW BINLOG EVENTS",
  "SHOW CHARACTER SET",
  "SHOW COLLATION",
  "SHOW COLUMNS",
  "SHOW CREATE DATABASE",
  "SHOW CREATE EVENT",
  "SHOW CREATE FUNCTION",
  "SHOW CREATE PROCEDURE",
  "SHOW CREATE TABLE",
  "SHOW CREATE TRIGGER",
  "SHOW CREATE USER",
  "SHOW CREATE VIEW",
  "SHOW DATABASES",
  "SHOW ENGINE",
  "SHOW ENGINES",
  "SHOW ERRORS",
  "SHOW EVENTS",
  "SHOW FUNCTION CODE",
  "SHOW FUNCTION STATUS",
  "SHOW GRANTS",
  "SHOW INDEX",
  "SHOW MASTER STATUS",
  "SHOW OPEN TABLES",
  "SHOW PLUGINS",
  "SHOW PRIVILEGES",
  "SHOW PROCEDURE CODE",
  "SHOW PROCEDURE STATUS",
  "SHOW PROCESSLIST",
  "SHOW PROFILE",
  "SHOW PROFILES",
  "SHOW RELAYLOG EVENTS",
  "SHOW REPLICA STATUS",
  "SHOW REPLICAS",
  "SHOW SLAVE",
  "SHOW SLAVE HOSTS",
  "SHOW STATUS",
  "SHOW TABLE STATUS",
  "SHOW TABLES",
  "SHOW TRIGGERS",
  "SHOW VARIABLES",
  "SHOW WARNINGS",
  "SHUTDOWN",
  "SOURCE_POS_WAIT",
  "START GROUP_REPLICATION",
  "START REPLICA",
  "START SLAVE",
  "START TRANSACTION",
  "STOP GROUP_REPLICATION",
  "STOP REPLICA",
  "STOP SLAVE",
  "TABLE",
  "UNINSTALL COMPONENT",
  "UNINSTALL PLUGIN",
  "UNLOCK INSTANCE",
  "UNLOCK TABLES",
  "USE",
  "XA",
  // flow control
  // 'IF',
  "ITERATE",
  "LEAVE",
  "LOOP",
  "REPEAT",
  "RETURN",
  "WHILE"
]), NA = S(["UNION [ALL | DISTINCT]"]), sA = S([
  "JOIN",
  "{LEFT | RIGHT} [OUTER] JOIN",
  "{INNER | CROSS} JOIN",
  "NATURAL [INNER] JOIN",
  "NATURAL {LEFT | RIGHT} [OUTER] JOIN",
  // non-standard joins
  "STRAIGHT_JOIN"
]), rA = S([
  "ON {UPDATE | DELETE} [SET NULL]",
  "CHARACTER SET",
  "{ROWS | RANGE} BETWEEN",
  "IDENTIFIED BY"
]), nA = S([]), aA = {
  name: "mysql",
  tokenizerOptions: {
    reservedSelect: IA,
    reservedClauses: [...OA, ...iT, ...GE],
    reservedSetOperations: NA,
    reservedJoins: sA,
    reservedKeywordPhrases: rA,
    reservedDataTypePhrases: nA,
    supportsXor: !0,
    reservedKeywords: AA,
    reservedDataTypes: tA,
    reservedFunctionNames: SA,
    // TODO: support _ char set prefixes such as _utf8, _latin1, _binary, _utf8mb4, etc.
    stringTypes: [
      '""-qq-bs',
      { quote: "''-qq-bs", prefixes: ["N"] },
      { quote: "''-raw", prefixes: ["B", "X"], requirePrefix: !0 }
    ],
    identTypes: ["``"],
    identChars: { first: "$", rest: "$", allowFirstCharNumber: !0 },
    variableTypes: [
      { regex: "@@?[A-Za-z0-9_.$]+" },
      { quote: '""-qq-bs', prefixes: ["@"], requirePrefix: !0 },
      { quote: "''-qq-bs", prefixes: ["@"], requirePrefix: !0 },
      { quote: "``", prefixes: ["@"], requirePrefix: !0 }
    ],
    paramTypes: { positional: !0 },
    lineCommentTypes: ["--", "#"],
    operators: [
      "%",
      ":=",
      "&",
      "|",
      "^",
      "~",
      "<<",
      ">>",
      "<=>",
      "->",
      "->>",
      "&&",
      "||",
      "!",
      "*.*"
      // Not actually an operator
    ],
    postProcess: oE
  },
  formatOptions: {
    onelineClauses: [...iT, ...GE],
    tabularOnelineClauses: GE
  }
}, CA = [
  // https://docs.pingcap.com/tidb/stable/keywords
  "ADD",
  "ALL",
  "ALTER",
  "ANALYZE",
  "AND",
  "ARRAY",
  "AS",
  "ASC",
  "BETWEEN",
  "BOTH",
  "BY",
  "CALL",
  "CASCADE",
  "CASE",
  "CHANGE",
  "CHECK",
  "COLLATE",
  "COLUMN",
  "CONSTRAINT",
  "CONTINUE",
  "CONVERT",
  "CREATE",
  "CROSS",
  "CURRENT_DATE",
  "CURRENT_ROLE",
  "CURRENT_TIME",
  "CURRENT_TIMESTAMP",
  "CURRENT_USER",
  "CURSOR",
  "DATABASE",
  "DATABASES",
  "DAY_HOUR",
  "DAY_MICROSECOND",
  "DAY_MINUTE",
  "DAY_SECOND",
  "DEFAULT",
  "DELAYED",
  "DELETE",
  "DESC",
  "DESCRIBE",
  "DISTINCT",
  "DISTINCTROW",
  "DIV",
  "DOUBLE",
  "DROP",
  "DUAL",
  "ELSE",
  "ELSEIF",
  "ENCLOSED",
  "ESCAPED",
  "EXCEPT",
  "EXISTS",
  "EXIT",
  "EXPLAIN",
  "FALSE",
  "FETCH",
  "FOR",
  "FORCE",
  "FOREIGN",
  "FROM",
  "FULLTEXT",
  "GENERATED",
  "GRANT",
  "GROUP",
  "GROUPS",
  "HAVING",
  "HIGH_PRIORITY",
  "HOUR_MICROSECOND",
  "HOUR_MINUTE",
  "HOUR_SECOND",
  "IF",
  "IGNORE",
  "ILIKE",
  "IN",
  "INDEX",
  "INFILE",
  "INNER",
  "INOUT",
  "INSERT",
  "INTERSECT",
  "INTERVAL",
  "INTO",
  "IS",
  "ITERATE",
  "JOIN",
  "KEY",
  "KEYS",
  "KILL",
  "LEADING",
  "LEAVE",
  "LEFT",
  "LIKE",
  "LIMIT",
  "LINEAR",
  "LINES",
  "LOAD",
  "LOCALTIME",
  "LOCALTIMESTAMP",
  "LOCK",
  "LONG",
  "LOW_PRIORITY",
  "MATCH",
  "MAXVALUE",
  "MINUTE_MICROSECOND",
  "MINUTE_SECOND",
  "MOD",
  "NATURAL",
  "NOT",
  "NO_WRITE_TO_BINLOG",
  "NULL",
  "OF",
  "ON",
  "OPTIMIZE",
  "OPTION",
  "OPTIONALLY",
  "OR",
  "ORDER",
  "OUT",
  "OUTER",
  "OUTFILE",
  "OVER",
  "PARTITION",
  "PRIMARY",
  "PROCEDURE",
  "RANGE",
  "READ",
  "RECURSIVE",
  "REFERENCES",
  "REGEXP",
  "RELEASE",
  "RENAME",
  "REPEAT",
  "REPLACE",
  "REQUIRE",
  "RESTRICT",
  "REVOKE",
  "RIGHT",
  "RLIKE",
  "ROW",
  "ROWS",
  "SECOND_MICROSECOND",
  "SELECT",
  "SET",
  "SHOW",
  "SPATIAL",
  "SQL",
  "SQLEXCEPTION",
  "SQLSTATE",
  "SQLWARNING",
  "SQL_BIG_RESULT",
  "SQL_CALC_FOUND_ROWS",
  "SQL_SMALL_RESULT",
  "SSL",
  "STARTING",
  "STATS_EXTENDED",
  "STORED",
  "STRAIGHT_JOIN",
  "TABLE",
  "TABLESAMPLE",
  "TERMINATED",
  "THEN",
  "TO",
  "TRAILING",
  "TRIGGER",
  "TRUE",
  "TiDB_CURRENT_TSO",
  "UNION",
  "UNIQUE",
  "UNLOCK",
  "UNSIGNED",
  "UNTIL",
  "UPDATE",
  "USAGE",
  "USE",
  "USING",
  "UTC_DATE",
  "UTC_TIME",
  "UTC_TIMESTAMP",
  "VALUES",
  "VIRTUAL",
  "WHEN",
  "WHERE",
  "WHILE",
  "WINDOW",
  "WITH",
  "WRITE",
  "XOR",
  "YEAR_MONTH",
  "ZEROFILL"
  // (R)
], LA = [
  // https://docs.pingcap.com/tidb/stable/data-type-overview
  "BIGINT",
  "BINARY",
  "BIT",
  "BLOB",
  "BOOL",
  "BOOLEAN",
  "CHAR",
  "CHARACTER",
  "DATE",
  "DATETIME",
  "DEC",
  "DECIMAL",
  "DOUBLE PRECISION",
  "DOUBLE",
  "ENUM",
  "FIXED",
  "INT",
  "INT1",
  "INT2",
  "INT3",
  "INT4",
  "INT8",
  "INTEGER",
  "LONGBLOB",
  "LONGTEXT",
  "MEDIUMBLOB",
  "MEDIUMINT",
  "MIDDLEINT",
  "NATIONAL CHAR",
  "NATIONAL VARCHAR",
  "NUMERIC",
  "PRECISION",
  "SMALLINT",
  "TEXT",
  "TIME",
  "TIMESTAMP",
  "TINYBLOB",
  "TINYINT",
  "TINYTEXT",
  "VARBINARY",
  "VARCHAR",
  "VARCHARACTER",
  "VARYING",
  "YEAR"
  // 'SET' // handled as special-case in postProcess
], oA = [
  // https://docs.pingcap.com/tidb/stable/sql-statement-show-builtins
  // https://docs.pingcap.com/tidb/stable/functions-and-operators-overview
  // + MySQL aggregate functions: https://dev.mysql.com/doc/refman/8.0/en/aggregate-functions.html
  // + MySQL window functions: https://dev.mysql.com/doc/refman/8.0/en/window-functions-usage.html
  "ABS",
  "ACOS",
  "ADDDATE",
  "ADDTIME",
  "AES_DECRYPT",
  "AES_ENCRYPT",
  // 'AND',
  "ANY_VALUE",
  "ASCII",
  "ASIN",
  "ATAN",
  "ATAN2",
  "AVG",
  "BENCHMARK",
  "BIN",
  "BIN_TO_UUID",
  "BIT_AND",
  "BIT_COUNT",
  "BIT_LENGTH",
  "BIT_OR",
  "BIT_XOR",
  "BITAND",
  "BITNEG",
  "BITOR",
  "BITXOR",
  "CASE",
  "CAST",
  "CEIL",
  "CEILING",
  "CHAR_FUNC",
  "CHAR_LENGTH",
  "CHARACTER_LENGTH",
  "CHARSET",
  "COALESCE",
  "COERCIBILITY",
  "COLLATION",
  "COMPRESS",
  "CONCAT",
  "CONCAT_WS",
  "CONNECTION_ID",
  "CONV",
  "CONVERT",
  "CONVERT_TZ",
  "COS",
  "COT",
  "COUNT",
  "CRC32",
  "CUME_DIST",
  "CURDATE",
  "CURRENT_DATE",
  "CURRENT_RESOURCE_GROUP",
  "CURRENT_ROLE",
  "CURRENT_TIME",
  "CURRENT_TIMESTAMP",
  "CURRENT_USER",
  "CURTIME",
  "DATABASE",
  "DATE",
  "DATE_ADD",
  "DATE_FORMAT",
  "DATE_SUB",
  "DATEDIFF",
  "DAY",
  "DAYNAME",
  "DAYOFMONTH",
  "DAYOFWEEK",
  "DAYOFYEAR",
  "DECODE",
  "DEFAULT_FUNC",
  "DEGREES",
  "DENSE_RANK",
  "DES_DECRYPT",
  "DES_ENCRYPT",
  "DIV",
  "ELT",
  "ENCODE",
  "ENCRYPT",
  "EQ",
  "EXP",
  "EXPORT_SET",
  "EXTRACT",
  "FIELD",
  "FIND_IN_SET",
  "FIRST_VALUE",
  "FLOOR",
  "FORMAT",
  "FORMAT_BYTES",
  "FORMAT_NANO_TIME",
  "FOUND_ROWS",
  "FROM_BASE64",
  "FROM_DAYS",
  "FROM_UNIXTIME",
  "GE",
  "GET_FORMAT",
  "GET_LOCK",
  "GETPARAM",
  "GREATEST",
  "GROUP_CONCAT",
  "GROUPING",
  "GT",
  "HEX",
  "HOUR",
  "IF",
  "IFNULL",
  "ILIKE",
  // 'IN',
  "INET6_ATON",
  "INET6_NTOA",
  "INET_ATON",
  "INET_NTOA",
  "INSERT_FUNC",
  "INSTR",
  "INTDIV",
  "INTERVAL",
  "IS_FREE_LOCK",
  "IS_IPV4",
  "IS_IPV4_COMPAT",
  "IS_IPV4_MAPPED",
  "IS_IPV6",
  "IS_USED_LOCK",
  "IS_UUID",
  "ISFALSE",
  "ISNULL",
  "ISTRUE",
  "JSON_ARRAY",
  "JSON_ARRAYAGG",
  "JSON_ARRAY_APPEND",
  "JSON_ARRAY_INSERT",
  "JSON_CONTAINS",
  "JSON_CONTAINS_PATH",
  "JSON_DEPTH",
  "JSON_EXTRACT",
  "JSON_INSERT",
  "JSON_KEYS",
  "JSON_LENGTH",
  "JSON_MEMBEROF",
  "JSON_MERGE",
  "JSON_MERGE_PATCH",
  "JSON_MERGE_PRESERVE",
  "JSON_OBJECT",
  "JSON_OBJECTAGG",
  "JSON_OVERLAPS",
  "JSON_PRETTY",
  "JSON_QUOTE",
  "JSON_REMOVE",
  "JSON_REPLACE",
  "JSON_SEARCH",
  "JSON_SET",
  "JSON_STORAGE_FREE",
  "JSON_STORAGE_SIZE",
  "JSON_TYPE",
  "JSON_UNQUOTE",
  "JSON_VALID",
  "LAG",
  "LAST_DAY",
  "LAST_INSERT_ID",
  "LAST_VALUE",
  "LASTVAL",
  "LCASE",
  "LE",
  "LEAD",
  "LEAST",
  "LEFT",
  "LEFTSHIFT",
  "LENGTH",
  "LIKE",
  "LN",
  "LOAD_FILE",
  "LOCALTIME",
  "LOCALTIMESTAMP",
  "LOCATE",
  "LOG",
  "LOG10",
  "LOG2",
  "LOWER",
  "LPAD",
  "LT",
  "LTRIM",
  "MAKE_SET",
  "MAKEDATE",
  "MAKETIME",
  "MASTER_POS_WAIT",
  "MAX",
  "MD5",
  "MICROSECOND",
  "MID",
  "MIN",
  "MINUS",
  "MINUTE",
  "MOD",
  "MONTH",
  "MONTHNAME",
  "MUL",
  "NAME_CONST",
  "NE",
  "NEXTVAL",
  "NOT",
  "NOW",
  "NTH_VALUE",
  "NTILE",
  "NULLEQ",
  "OCT",
  "OCTET_LENGTH",
  "OLD_PASSWORD",
  // 'OR',
  "ORD",
  "PASSWORD_FUNC",
  "PERCENT_RANK",
  "PERIOD_ADD",
  "PERIOD_DIFF",
  "PI",
  "PLUS",
  "POSITION",
  "POW",
  "POWER",
  "QUARTER",
  "QUOTE",
  "RADIANS",
  "RAND",
  "RANDOM_BYTES",
  "RANK",
  "REGEXP",
  "REGEXP_INSTR",
  "REGEXP_LIKE",
  "REGEXP_REPLACE",
  "REGEXP_SUBSTR",
  "RELEASE_ALL_LOCKS",
  "RELEASE_LOCK",
  "REPEAT",
  "REPLACE",
  "REVERSE",
  "RIGHT",
  "RIGHTSHIFT",
  "ROUND",
  "ROW_COUNT",
  "ROW_NUMBER",
  "RPAD",
  "RTRIM",
  "SCHEMA",
  "SEC_TO_TIME",
  "SECOND",
  "SESSION_USER",
  "SETVAL",
  "SETVAR",
  "SHA",
  "SHA1",
  "SHA2",
  "SIGN",
  "SIN",
  "SLEEP",
  "SM3",
  "SPACE",
  "SQRT",
  "STD",
  "STDDEV",
  "STDDEV_POP",
  "STDDEV_SAMP",
  "STR_TO_DATE",
  "STRCMP",
  "SUBDATE",
  "SUBSTR",
  "SUBSTRING",
  "SUBSTRING_INDEX",
  "SUBTIME",
  "SUM",
  "SYSDATE",
  "SYSTEM_USER",
  "TAN",
  "TIDB_BOUNDED_STALENESS",
  "TIDB_CURRENT_TSO",
  "TIDB_DECODE_BINARY_PLAN",
  "TIDB_DECODE_KEY",
  "TIDB_DECODE_PLAN",
  "TIDB_DECODE_SQL_DIGESTS",
  "TIDB_ENCODE_SQL_DIGEST",
  "TIDB_IS_DDL_OWNER",
  "TIDB_PARSE_TSO",
  "TIDB_PARSE_TSO_LOGICAL",
  "TIDB_ROW_CHECKSUM",
  "TIDB_SHARD",
  "TIDB_VERSION",
  "TIME",
  "TIME_FORMAT",
  "TIME_TO_SEC",
  "TIMEDIFF",
  "TIMESTAMP",
  "TIMESTAMPADD",
  "TIMESTAMPDIFF",
  "TO_BASE64",
  "TO_DAYS",
  "TO_SECONDS",
  "TRANSLATE",
  "TRIM",
  "TRUNCATE",
  "UCASE",
  "UNARYMINUS",
  "UNCOMPRESS",
  "UNCOMPRESSED_LENGTH",
  "UNHEX",
  "UNIX_TIMESTAMP",
  "UPPER",
  // 'USER',
  "UTC_DATE",
  "UTC_TIME",
  "UTC_TIMESTAMP",
  "UUID",
  "UUID_SHORT",
  "UUID_TO_BIN",
  "VALIDATE_PASSWORD_STRENGTH",
  "VAR_POP",
  "VAR_SAMP",
  "VARIANCE",
  "VERSION",
  "VITESS_HASH",
  "WEEK",
  "WEEKDAY",
  "WEEKOFYEAR",
  "WEIGHT_STRING",
  // 'XOR',
  "YEAR",
  "YEARWEEK"
], iA = S(["SELECT [ALL | DISTINCT | DISTINCTROW]"]), _A = S([
  // queries
  "WITH [RECURSIVE]",
  "FROM",
  "WHERE",
  "GROUP BY",
  "HAVING",
  "WINDOW",
  "PARTITION BY",
  "ORDER BY",
  "LIMIT",
  "OFFSET",
  // Data manipulation
  // - insert:
  "INSERT [LOW_PRIORITY | DELAYED | HIGH_PRIORITY] [IGNORE] [INTO]",
  "REPLACE [LOW_PRIORITY | DELAYED] [INTO]",
  "VALUES",
  "ON DUPLICATE KEY UPDATE",
  // - update:
  "SET"
]), _T = S(["CREATE [TEMPORARY] TABLE [IF NOT EXISTS]"]), HE = S([
  // https://docs.pingcap.com/tidb/stable/sql-statement-create-view
  "CREATE [OR REPLACE] [SQL SECURITY DEFINER | SQL SECURITY INVOKER] VIEW [IF NOT EXISTS]",
  // https://docs.pingcap.com/tidb/stable/sql-statement-update
  "UPDATE [LOW_PRIORITY] [IGNORE]",
  // https://docs.pingcap.com/tidb/stable/sql-statement-delete
  "DELETE [LOW_PRIORITY] [QUICK] [IGNORE] FROM",
  // https://docs.pingcap.com/tidb/stable/sql-statement-drop-table
  "DROP [TEMPORARY] TABLE [IF EXISTS]",
  // https://docs.pingcap.com/tidb/stable/sql-statement-alter-table
  "ALTER TABLE",
  "ADD [COLUMN]",
  "{CHANGE | MODIFY} [COLUMN]",
  "DROP [COLUMN]",
  "RENAME [TO | AS]",
  "RENAME COLUMN",
  "ALTER [COLUMN]",
  "{SET | DROP} DEFAULT",
  // https://docs.pingcap.com/tidb/stable/sql-statement-truncate
  "TRUNCATE [TABLE]",
  // https://docs.pingcap.com/tidb/stable/sql-statement-alter-database
  "ALTER DATABASE",
  // https://docs.pingcap.com/tidb/stable/sql-statement-alter-instance
  "ALTER INSTANCE",
  "ALTER RESOURCE GROUP",
  "ALTER SEQUENCE",
  // https://docs.pingcap.com/tidb/stable/sql-statement-alter-user
  "ALTER USER",
  "ALTER VIEW",
  "ANALYZE TABLE",
  "CHECK TABLE",
  "CHECKSUM TABLE",
  "COMMIT",
  "CREATE DATABASE",
  "CREATE INDEX",
  "CREATE RESOURCE GROUP",
  "CREATE ROLE",
  "CREATE SEQUENCE",
  "CREATE USER",
  "DEALLOCATE PREPARE",
  "DESCRIBE",
  "DROP DATABASE",
  "DROP INDEX",
  "DROP RESOURCE GROUP",
  "DROP ROLE",
  "DROP TABLESPACE",
  "DROP USER",
  "DROP VIEW",
  "EXPLAIN",
  "FLUSH",
  // https://docs.pingcap.com/tidb/stable/sql-statement-grant-privileges
  "GRANT",
  "IMPORT TABLE",
  "INSTALL COMPONENT",
  "INSTALL PLUGIN",
  "KILL",
  "LOAD DATA",
  "LOCK INSTANCE FOR BACKUP",
  "LOCK TABLES",
  "OPTIMIZE TABLE",
  "PREPARE",
  "RELEASE SAVEPOINT",
  "RENAME TABLE",
  "RENAME USER",
  "REPAIR TABLE",
  "RESET",
  "REVOKE",
  "ROLLBACK",
  "ROLLBACK TO SAVEPOINT",
  "SAVEPOINT",
  "SET CHARACTER SET",
  "SET DEFAULT ROLE",
  "SET NAMES",
  "SET PASSWORD",
  "SET RESOURCE GROUP",
  "SET ROLE",
  "SET TRANSACTION",
  "SHOW",
  "SHOW BINARY LOGS",
  "SHOW BINLOG EVENTS",
  "SHOW CHARACTER SET",
  "SHOW COLLATION",
  "SHOW COLUMNS",
  "SHOW CREATE DATABASE",
  "SHOW CREATE TABLE",
  "SHOW CREATE USER",
  "SHOW CREATE VIEW",
  "SHOW DATABASES",
  "SHOW ENGINE",
  "SHOW ENGINES",
  "SHOW ERRORS",
  "SHOW EVENTS",
  "SHOW GRANTS",
  "SHOW INDEX",
  "SHOW MASTER STATUS",
  "SHOW OPEN TABLES",
  "SHOW PLUGINS",
  "SHOW PRIVILEGES",
  "SHOW PROCESSLIST",
  "SHOW PROFILE",
  "SHOW PROFILES",
  "SHOW STATUS",
  "SHOW TABLE STATUS",
  "SHOW TABLES",
  "SHOW TRIGGERS",
  "SHOW VARIABLES",
  "SHOW WARNINGS",
  // https://docs.pingcap.com/tidb/stable/sql-statement-table
  "TABLE",
  "UNINSTALL COMPONENT",
  "UNINSTALL PLUGIN",
  "UNLOCK INSTANCE",
  "UNLOCK TABLES",
  // https://docs.pingcap.com/tidb/stable/sql-statement-use
  "USE"
]), DA = S(["UNION [ALL | DISTINCT]"]), PA = S([
  "JOIN",
  "{LEFT | RIGHT} [OUTER] JOIN",
  "{INNER | CROSS} JOIN",
  "NATURAL [INNER] JOIN",
  "NATURAL {LEFT | RIGHT} [OUTER] JOIN",
  // non-standard joins
  "STRAIGHT_JOIN"
]), lA = S([
  "ON {UPDATE | DELETE} [SET NULL]",
  "CHARACTER SET",
  "{ROWS | RANGE} BETWEEN",
  "IDENTIFIED BY"
]), MA = S([]), UA = {
  name: "tidb",
  tokenizerOptions: {
    reservedSelect: iA,
    reservedClauses: [..._A, ..._T, ...HE],
    reservedSetOperations: DA,
    reservedJoins: PA,
    reservedKeywordPhrases: lA,
    reservedDataTypePhrases: MA,
    supportsXor: !0,
    reservedKeywords: CA,
    reservedDataTypes: LA,
    reservedFunctionNames: oA,
    // TODO: support _ char set prefixes such as _utf8, _latin1, _binary, _utf8mb4, etc.
    stringTypes: [
      '""-qq-bs',
      { quote: "''-qq-bs", prefixes: ["N"] },
      { quote: "''-raw", prefixes: ["B", "X"], requirePrefix: !0 }
    ],
    identTypes: ["``"],
    identChars: { first: "$", rest: "$", allowFirstCharNumber: !0 },
    variableTypes: [
      { regex: "@@?[A-Za-z0-9_.$]+" },
      { quote: '""-qq-bs', prefixes: ["@"], requirePrefix: !0 },
      { quote: "''-qq-bs", prefixes: ["@"], requirePrefix: !0 },
      { quote: "``", prefixes: ["@"], requirePrefix: !0 }
    ],
    paramTypes: { positional: !0 },
    lineCommentTypes: ["--", "#"],
    operators: [
      "%",
      ":=",
      "&",
      "|",
      "^",
      "~",
      "<<",
      ">>",
      "<=>",
      "->",
      "->>",
      "&&",
      "||",
      "!",
      "*.*"
      // Not actually an operator
    ],
    postProcess: oE
  },
  formatOptions: {
    onelineClauses: [..._T, ...HE],
    tabularOnelineClauses: HE
  }
}, cA = [
  // https://docs.couchbase.com/server/current/n1ql/n1ql-language-reference/functions.html
  "ABORT",
  "ABS",
  "ACOS",
  "ADVISOR",
  "ARRAY_AGG",
  "ARRAY_AGG",
  "ARRAY_APPEND",
  "ARRAY_AVG",
  "ARRAY_BINARY_SEARCH",
  "ARRAY_CONCAT",
  "ARRAY_CONTAINS",
  "ARRAY_COUNT",
  "ARRAY_DISTINCT",
  "ARRAY_EXCEPT",
  "ARRAY_FLATTEN",
  "ARRAY_IFNULL",
  "ARRAY_INSERT",
  "ARRAY_INTERSECT",
  "ARRAY_LENGTH",
  "ARRAY_MAX",
  "ARRAY_MIN",
  "ARRAY_MOVE",
  "ARRAY_POSITION",
  "ARRAY_PREPEND",
  "ARRAY_PUT",
  "ARRAY_RANGE",
  "ARRAY_REMOVE",
  "ARRAY_REPEAT",
  "ARRAY_REPLACE",
  "ARRAY_REVERSE",
  "ARRAY_SORT",
  "ARRAY_STAR",
  "ARRAY_SUM",
  "ARRAY_SYMDIFF",
  "ARRAY_SYMDIFF1",
  "ARRAY_SYMDIFFN",
  "ARRAY_UNION",
  "ASIN",
  "ATAN",
  "ATAN2",
  "AVG",
  "BASE64",
  "BASE64_DECODE",
  "BASE64_ENCODE",
  "BITAND ",
  "BITCLEAR ",
  "BITNOT ",
  "BITOR ",
  "BITSET ",
  "BITSHIFT ",
  "BITTEST ",
  "BITXOR ",
  "CEIL",
  "CLOCK_LOCAL",
  "CLOCK_MILLIS",
  "CLOCK_STR",
  "CLOCK_TZ",
  "CLOCK_UTC",
  "COALESCE",
  "CONCAT",
  "CONCAT2",
  "CONTAINS",
  "CONTAINS_TOKEN",
  "CONTAINS_TOKEN_LIKE",
  "CONTAINS_TOKEN_REGEXP",
  "COS",
  "COUNT",
  "COUNT",
  "COUNTN",
  "CUME_DIST",
  "CURL",
  "DATE_ADD_MILLIS",
  "DATE_ADD_STR",
  "DATE_DIFF_MILLIS",
  "DATE_DIFF_STR",
  "DATE_FORMAT_STR",
  "DATE_PART_MILLIS",
  "DATE_PART_STR",
  "DATE_RANGE_MILLIS",
  "DATE_RANGE_STR",
  "DATE_TRUNC_MILLIS",
  "DATE_TRUNC_STR",
  "DECODE",
  "DECODE_JSON",
  "DEGREES",
  "DENSE_RANK",
  "DURATION_TO_STR",
  // 'E',
  "ENCODED_SIZE",
  "ENCODE_JSON",
  "EXP",
  "FIRST_VALUE",
  "FLOOR",
  "GREATEST",
  "HAS_TOKEN",
  "IFINF",
  "IFMISSING",
  "IFMISSINGORNULL",
  "IFNAN",
  "IFNANORINF",
  "IFNULL",
  "INITCAP",
  "ISARRAY",
  "ISATOM",
  "ISBITSET",
  "ISBOOLEAN",
  "ISNUMBER",
  "ISOBJECT",
  "ISSTRING",
  "LAG",
  "LAST_VALUE",
  "LEAD",
  "LEAST",
  "LENGTH",
  "LN",
  "LOG",
  "LOWER",
  "LTRIM",
  "MAX",
  "MEAN",
  "MEDIAN",
  "META",
  "MILLIS",
  "MILLIS_TO_LOCAL",
  "MILLIS_TO_STR",
  "MILLIS_TO_TZ",
  "MILLIS_TO_UTC",
  "MILLIS_TO_ZONE_NAME",
  "MIN",
  "MISSINGIF",
  "NANIF",
  "NEGINFIF",
  "NOW_LOCAL",
  "NOW_MILLIS",
  "NOW_STR",
  "NOW_TZ",
  "NOW_UTC",
  "NTH_VALUE",
  "NTILE",
  "NULLIF",
  "NVL",
  "NVL2",
  "OBJECT_ADD",
  "OBJECT_CONCAT",
  "OBJECT_INNER_PAIRS",
  "OBJECT_INNER_VALUES",
  "OBJECT_LENGTH",
  "OBJECT_NAMES",
  "OBJECT_PAIRS",
  "OBJECT_PUT",
  "OBJECT_REMOVE",
  "OBJECT_RENAME",
  "OBJECT_REPLACE",
  "OBJECT_UNWRAP",
  "OBJECT_VALUES",
  "PAIRS",
  "PERCENT_RANK",
  "PI",
  "POLY_LENGTH",
  "POSINFIF",
  "POSITION",
  "POWER",
  "RADIANS",
  "RANDOM",
  "RANK",
  "RATIO_TO_REPORT",
  "REGEXP_CONTAINS",
  "REGEXP_LIKE",
  "REGEXP_MATCHES",
  "REGEXP_POSITION",
  "REGEXP_REPLACE",
  "REGEXP_SPLIT",
  "REGEX_CONTAINS",
  "REGEX_LIKE",
  "REGEX_MATCHES",
  "REGEX_POSITION",
  "REGEX_REPLACE",
  "REGEX_SPLIT",
  "REPEAT",
  "REPLACE",
  "REVERSE",
  "ROUND",
  "ROW_NUMBER",
  "RTRIM",
  "SEARCH",
  "SEARCH_META",
  "SEARCH_SCORE",
  "SIGN",
  "SIN",
  "SPLIT",
  "SQRT",
  "STDDEV",
  "STDDEV_POP",
  "STDDEV_SAMP",
  "STR_TO_DURATION",
  "STR_TO_MILLIS",
  "STR_TO_TZ",
  "STR_TO_UTC",
  "STR_TO_ZONE_NAME",
  "SUBSTR",
  "SUFFIXES",
  "SUM",
  "TAN",
  "TITLE",
  "TOARRAY",
  "TOATOM",
  "TOBOOLEAN",
  "TOKENS",
  "TOKENS",
  "TONUMBER",
  "TOOBJECT",
  "TOSTRING",
  "TRIM",
  "TRUNC",
  // 'TYPE', // disabled
  "UPPER",
  "UUID",
  "VARIANCE",
  "VARIANCE_POP",
  "VARIANCE_SAMP",
  "VAR_POP",
  "VAR_SAMP",
  "WEEKDAY_MILLIS",
  "WEEKDAY_STR",
  // type casting
  // not implemented in N1QL, but added here now for the sake of tests
  // https://docs.couchbase.com/server/current/analytics/3_query.html#Vs_SQL-92
  "CAST"
], uA = [
  // https://docs.couchbase.com/server/current/n1ql/n1ql-language-reference/reservedwords.html
  "ADVISE",
  "ALL",
  "ALTER",
  "ANALYZE",
  "AND",
  "ANY",
  "ARRAY",
  "AS",
  "ASC",
  "AT",
  "BEGIN",
  "BETWEEN",
  "BINARY",
  "BOOLEAN",
  "BREAK",
  "BUCKET",
  "BUILD",
  "BY",
  "CALL",
  "CASE",
  "CAST",
  "CLUSTER",
  "COLLATE",
  "COLLECTION",
  "COMMIT",
  "COMMITTED",
  "CONNECT",
  "CONTINUE",
  "CORRELATED",
  "COVER",
  "CREATE",
  "CURRENT",
  "DATABASE",
  "DATASET",
  "DATASTORE",
  "DECLARE",
  "DECREMENT",
  "DELETE",
  "DERIVED",
  "DESC",
  "DESCRIBE",
  "DISTINCT",
  "DO",
  "DROP",
  "EACH",
  "ELEMENT",
  "ELSE",
  "END",
  "EVERY",
  "EXCEPT",
  "EXCLUDE",
  "EXECUTE",
  "EXISTS",
  "EXPLAIN",
  "FALSE",
  "FETCH",
  "FILTER",
  "FIRST",
  "FLATTEN",
  "FLUSH",
  "FOLLOWING",
  "FOR",
  "FORCE",
  "FROM",
  "FTS",
  "FUNCTION",
  "GOLANG",
  "GRANT",
  "GROUP",
  "GROUPS",
  "GSI",
  "HASH",
  "HAVING",
  "IF",
  "IGNORE",
  "ILIKE",
  "IN",
  "INCLUDE",
  "INCREMENT",
  "INDEX",
  "INFER",
  "INLINE",
  "INNER",
  "INSERT",
  "INTERSECT",
  "INTO",
  "IS",
  "ISOLATION",
  "JAVASCRIPT",
  "JOIN",
  "KEY",
  "KEYS",
  "KEYSPACE",
  "KNOWN",
  "LANGUAGE",
  "LAST",
  "LEFT",
  "LET",
  "LETTING",
  "LEVEL",
  "LIKE",
  "LIMIT",
  "LSM",
  "MAP",
  "MAPPING",
  "MATCHED",
  "MATERIALIZED",
  "MERGE",
  "MINUS",
  "MISSING",
  "NAMESPACE",
  "NEST",
  "NL",
  "NO",
  "NOT",
  "NTH_VALUE",
  "NULL",
  "NULLS",
  "NUMBER",
  "OBJECT",
  "OFFSET",
  "ON",
  "OPTION",
  "OPTIONS",
  "OR",
  "ORDER",
  "OTHERS",
  "OUTER",
  "OVER",
  "PARSE",
  "PARTITION",
  "PASSWORD",
  "PATH",
  "POOL",
  "PRECEDING",
  "PREPARE",
  "PRIMARY",
  "PRIVATE",
  "PRIVILEGE",
  "PROBE",
  "PROCEDURE",
  "PUBLIC",
  "RANGE",
  "RAW",
  "REALM",
  "REDUCE",
  "RENAME",
  "RESPECT",
  "RETURN",
  "RETURNING",
  "REVOKE",
  "RIGHT",
  "ROLE",
  "ROLLBACK",
  "ROW",
  "ROWS",
  "SATISFIES",
  "SAVEPOINT",
  "SCHEMA",
  "SCOPE",
  "SELECT",
  "SELF",
  "SEMI",
  "SET",
  "SHOW",
  "SOME",
  "START",
  "STATISTICS",
  "STRING",
  "SYSTEM",
  "THEN",
  "TIES",
  "TO",
  "TRAN",
  "TRANSACTION",
  "TRIGGER",
  "TRUE",
  "TRUNCATE",
  "UNBOUNDED",
  "UNDER",
  "UNION",
  "UNIQUE",
  "UNKNOWN",
  "UNNEST",
  "UNSET",
  "UPDATE",
  "UPSERT",
  "USE",
  "USER",
  "USING",
  "VALIDATE",
  "VALUE",
  "VALUED",
  "VALUES",
  "VIA",
  "VIEW",
  "WHEN",
  "WHERE",
  "WHILE",
  "WINDOW",
  "WITH",
  "WITHIN",
  "WORK",
  "XOR"
], dA = [
  // N1QL does not support any way of declaring types for columns.
  // It does not support the CREATE TABLE statement nor the CAST() expression.
  //
  // It does have several keywords like ARRAY and OBJECT, which seem to refer to types,
  // but they are used as operators. It also reserves several words like STRING and NUMBER,
  // which it actually doesn't use.
  //
  // https://docs.couchbase.com/server/current/n1ql/n1ql-language-reference/datatypes.html
], pA = S(["SELECT [ALL | DISTINCT]"]), GA = S([
  // queries
  "WITH",
  "FROM",
  "WHERE",
  "GROUP BY",
  "HAVING",
  "WINDOW",
  "PARTITION BY",
  "ORDER BY",
  "LIMIT",
  "OFFSET",
  // Data manipulation
  // - insert:
  "INSERT INTO",
  "VALUES",
  // - update:
  "SET",
  // - merge:
  "MERGE INTO",
  "WHEN [NOT] MATCHED THEN",
  "UPDATE SET",
  "INSERT",
  // other
  "NEST",
  "UNNEST",
  "RETURNING"
]), DT = S([
  // - update:
  "UPDATE",
  // - delete:
  "DELETE FROM",
  // - set schema:
  "SET SCHEMA",
  // https://docs.couchbase.com/server/current/n1ql/n1ql-language-reference/reservedwords.html
  "ADVISE",
  "ALTER INDEX",
  "BEGIN TRANSACTION",
  "BUILD INDEX",
  "COMMIT TRANSACTION",
  "CREATE COLLECTION",
  "CREATE FUNCTION",
  "CREATE INDEX",
  "CREATE PRIMARY INDEX",
  "CREATE SCOPE",
  "DROP COLLECTION",
  "DROP FUNCTION",
  "DROP INDEX",
  "DROP PRIMARY INDEX",
  "DROP SCOPE",
  "EXECUTE",
  "EXECUTE FUNCTION",
  "EXPLAIN",
  "GRANT",
  "INFER",
  "PREPARE",
  "REVOKE",
  "ROLLBACK TRANSACTION",
  "SAVEPOINT",
  "SET TRANSACTION",
  "UPDATE STATISTICS",
  "UPSERT",
  // other
  "LET",
  "SET CURRENT SCHEMA",
  "SHOW",
  "USE [PRIMARY] KEYS"
]), HA = S(["UNION [ALL]", "EXCEPT [ALL]", "INTERSECT [ALL]"]), BA = S(["JOIN", "{LEFT | RIGHT} [OUTER] JOIN", "INNER JOIN"]), mA = S(["{ROWS | RANGE | GROUPS} BETWEEN"]), FA = S([]), hA = {
  name: "n1ql",
  tokenizerOptions: {
    reservedSelect: pA,
    reservedClauses: [...GA, ...DT],
    reservedSetOperations: HA,
    reservedJoins: BA,
    reservedKeywordPhrases: mA,
    reservedDataTypePhrases: FA,
    supportsXor: !0,
    reservedKeywords: uA,
    reservedDataTypes: dA,
    reservedFunctionNames: cA,
    // NOTE: single quotes are actually not supported in N1QL,
    // but we support them anyway as all other SQL dialects do,
    // which simplifies writing tests that are shared between all dialects.
    stringTypes: ['""-bs', "''-bs"],
    identTypes: ["``"],
    extraParens: ["[]", "{}"],
    paramTypes: { positional: !0, numbered: ["$"], named: ["$"] },
    lineCommentTypes: ["#", "--"],
    operators: ["%", "==", ":", "||"]
  },
  formatOptions: {
    onelineClauses: DT
  }
}, YA = [
  // https://docs.oracle.com/cd/B19306_01/appdev.102/b14261/reservewords.htm
  // 'A',
  "ADD",
  "AGENT",
  "AGGREGATE",
  "ALL",
  "ALTER",
  "AND",
  "ANY",
  "ARROW",
  "AS",
  "ASC",
  "AT",
  "ATTRIBUTE",
  "AUTHID",
  "AVG",
  "BEGIN",
  "BETWEEN",
  "BLOCK",
  "BODY",
  "BOTH",
  "BOUND",
  "BULK",
  "BY",
  "BYTE",
  // 'C',
  "CALL",
  "CALLING",
  "CASCADE",
  "CASE",
  "CHARSET",
  "CHARSETFORM",
  "CHARSETID",
  "CHECK",
  "CLOSE",
  "CLUSTER",
  "CLUSTERS",
  "COLAUTH",
  "COLLECT",
  "COLUMNS",
  "COMMENT",
  "COMMIT",
  "COMMITTED",
  "COMPILED",
  "COMPRESS",
  "CONNECT",
  "CONSTANT",
  "CONSTRUCTOR",
  "CONTEXT",
  "CONVERT",
  "COUNT",
  "CRASH",
  "CREATE",
  "CURRENT",
  "CURSOR",
  "CUSTOMDATUM",
  "DANGLING",
  "DATA",
  "DAY",
  "DECLARE",
  "DEFAULT",
  "DEFINE",
  "DELETE",
  "DESC",
  "DETERMINISTIC",
  "DISTINCT",
  "DROP",
  "DURATION",
  "ELEMENT",
  "ELSE",
  "ELSIF",
  "EMPTY",
  "END",
  "ESCAPE",
  "EXCEPT",
  "EXCEPTION",
  "EXCEPTIONS",
  "EXCLUSIVE",
  "EXECUTE",
  "EXISTS",
  "EXIT",
  "EXTERNAL",
  "FETCH",
  "FINAL",
  "FIXED",
  "FOR",
  "FORALL",
  "FORCE",
  "FORM",
  "FROM",
  "FUNCTION",
  "GENERAL",
  "GOTO",
  "GRANT",
  "GROUP",
  "HASH",
  "HAVING",
  "HEAP",
  "HIDDEN",
  "HOUR",
  "IDENTIFIED",
  "IF",
  "IMMEDIATE",
  "IN",
  "INCLUDING",
  "INDEX",
  "INDEXES",
  "INDICATOR",
  "INDICES",
  "INFINITE",
  "INSERT",
  "INSTANTIABLE",
  "INTERFACE",
  "INTERSECT",
  "INTERVAL",
  "INTO",
  "INVALIDATE",
  "IS",
  "ISOLATION",
  "JAVA",
  "LANGUAGE",
  "LARGE",
  "LEADING",
  "LENGTH",
  "LEVEL",
  "LIBRARY",
  "LIKE",
  "LIKE2",
  "LIKE4",
  "LIKEC",
  "LIMIT",
  "LIMITED",
  "LOCAL",
  "LOCK",
  "LOOP",
  "MAP",
  "MAX",
  "MAXLEN",
  "MEMBER",
  "MERGE",
  "MIN",
  "MINUS",
  "MINUTE",
  "MOD",
  "MODE",
  "MODIFY",
  "MONTH",
  "MULTISET",
  "NAME",
  "NAN",
  "NATIONAL",
  "NATIVE",
  "NEW",
  "NOCOMPRESS",
  "NOCOPY",
  "NOT",
  "NOWAIT",
  "NULL",
  "OBJECT",
  "OCICOLL",
  "OCIDATE",
  "OCIDATETIME",
  "OCIDURATION",
  "OCIINTERVAL",
  "OCILOBLOCATOR",
  "OCINUMBER",
  "OCIRAW",
  "OCIREF",
  "OCIREFCURSOR",
  "OCIROWID",
  "OCISTRING",
  "OCITYPE",
  "OF",
  "ON",
  "ONLY",
  "OPAQUE",
  "OPEN",
  "OPERATOR",
  "OPTION",
  "OR",
  "ORACLE",
  "ORADATA",
  "ORDER",
  "OVERLAPS",
  "ORGANIZATION",
  "ORLANY",
  "ORLVARY",
  "OTHERS",
  "OUT",
  "OVERRIDING",
  "PACKAGE",
  "PARALLEL_ENABLE",
  "PARAMETER",
  "PARAMETERS",
  "PARTITION",
  "PASCAL",
  "PIPE",
  "PIPELINED",
  "PRAGMA",
  "PRIOR",
  "PRIVATE",
  "PROCEDURE",
  "PUBLIC",
  "RAISE",
  "RANGE",
  "READ",
  "RECORD",
  "REF",
  "REFERENCE",
  "REM",
  "REMAINDER",
  "RENAME",
  "RESOURCE",
  "RESULT",
  "RETURN",
  "RETURNING",
  "REVERSE",
  "REVOKE",
  "ROLLBACK",
  "ROW",
  "SAMPLE",
  "SAVE",
  "SAVEPOINT",
  "SB1",
  "SB2",
  "SB4",
  "SECOND",
  "SEGMENT",
  "SELECT",
  "SELF",
  "SEPARATE",
  "SEQUENCE",
  "SERIALIZABLE",
  "SET",
  "SHARE",
  "SHORT",
  "SIZE",
  "SIZE_T",
  "SOME",
  "SPARSE",
  "SQL",
  "SQLCODE",
  "SQLDATA",
  "SQLNAME",
  "SQLSTATE",
  "STANDARD",
  "START",
  "STATIC",
  "STDDEV",
  "STORED",
  "STRING",
  "STRUCT",
  "STYLE",
  "SUBMULTISET",
  "SUBPARTITION",
  "SUBSTITUTABLE",
  "SUBTYPE",
  "SUM",
  "SYNONYM",
  "TABAUTH",
  "TABLE",
  "TDO",
  "THE",
  "THEN",
  "TIME",
  "TIMEZONE_ABBR",
  "TIMEZONE_HOUR",
  "TIMEZONE_MINUTE",
  "TIMEZONE_REGION",
  "TO",
  "TRAILING",
  "TRANSAC",
  "TRANSACTIONAL",
  "TRUSTED",
  "TYPE",
  "UB1",
  "UB2",
  "UB4",
  "UNDER",
  "UNION",
  "UNIQUE",
  "UNSIGNED",
  "UNTRUSTED",
  "UPDATE",
  "USE",
  "USING",
  "VALIST",
  "VALUE",
  "VALUES",
  "VARIABLE",
  "VARIANCE",
  "VARRAY",
  "VIEW",
  "VIEWS",
  "VOID",
  "WHEN",
  "WHERE",
  "WHILE",
  "WITH",
  "WORK",
  "WRAPPED",
  "WRITE",
  "YEAR",
  "ZONE"
], fA = [
  // https://www.ibm.com/docs/en/db2/10.5?topic=plsql-data-types
  "ARRAY",
  "BFILE_BASE",
  "BINARY",
  "BLOB_BASE",
  "CHAR VARYING",
  "CHAR_BASE",
  "CHAR",
  "CHARACTER VARYING",
  "CHARACTER",
  "CLOB_BASE",
  "DATE_BASE",
  "DATE",
  "DECIMAL",
  "DOUBLE",
  "FLOAT",
  "INT",
  "INTERVAL DAY",
  "INTERVAL YEAR",
  "LONG",
  "NATIONAL CHAR VARYING",
  "NATIONAL CHAR",
  "NATIONAL CHARACTER VARYING",
  "NATIONAL CHARACTER",
  "NCHAR VARYING",
  "NCHAR",
  "NCHAR",
  "NUMBER_BASE",
  "NUMBER",
  "NUMBERIC",
  "NVARCHAR",
  "PRECISION",
  "RAW",
  "TIMESTAMP",
  "UROWID",
  "VARCHAR",
  "VARCHAR2"
], gA = [
  // https://docs.oracle.com/cd/B19306_01/server.102/b14200/functions001.htm
  // numeric
  "ABS",
  "ACOS",
  "ASIN",
  "ATAN",
  "ATAN2",
  "BITAND",
  "CEIL",
  "COS",
  "COSH",
  "EXP",
  "FLOOR",
  "LN",
  "LOG",
  "MOD",
  "NANVL",
  "POWER",
  "REMAINDER",
  "ROUND",
  "SIGN",
  "SIN",
  "SINH",
  "SQRT",
  "TAN",
  "TANH",
  "TRUNC",
  "WIDTH_BUCKET",
  // character
  "CHR",
  "CONCAT",
  "INITCAP",
  "LOWER",
  "LPAD",
  "LTRIM",
  "NLS_INITCAP",
  "NLS_LOWER",
  "NLSSORT",
  "NLS_UPPER",
  "REGEXP_REPLACE",
  "REGEXP_SUBSTR",
  "REPLACE",
  "RPAD",
  "RTRIM",
  "SOUNDEX",
  "SUBSTR",
  "TRANSLATE",
  "TREAT",
  "TRIM",
  "UPPER",
  "NLS_CHARSET_DECL_LEN",
  "NLS_CHARSET_ID",
  "NLS_CHARSET_NAME",
  "ASCII",
  "INSTR",
  "LENGTH",
  "REGEXP_INSTR",
  // datetime
  "ADD_MONTHS",
  "CURRENT_DATE",
  "CURRENT_TIMESTAMP",
  "DBTIMEZONE",
  "EXTRACT",
  "FROM_TZ",
  "LAST_DAY",
  "LOCALTIMESTAMP",
  "MONTHS_BETWEEN",
  "NEW_TIME",
  "NEXT_DAY",
  "NUMTODSINTERVAL",
  "NUMTOYMINTERVAL",
  "ROUND",
  "SESSIONTIMEZONE",
  "SYS_EXTRACT_UTC",
  "SYSDATE",
  "SYSTIMESTAMP",
  "TO_CHAR",
  "TO_TIMESTAMP",
  "TO_TIMESTAMP_TZ",
  "TO_DSINTERVAL",
  "TO_YMINTERVAL",
  "TRUNC",
  "TZ_OFFSET",
  // comparison
  "GREATEST",
  "LEAST",
  // conversion
  "ASCIISTR",
  "BIN_TO_NUM",
  "CAST",
  "CHARTOROWID",
  "COMPOSE",
  "CONVERT",
  "DECOMPOSE",
  "HEXTORAW",
  "NUMTODSINTERVAL",
  "NUMTOYMINTERVAL",
  "RAWTOHEX",
  "RAWTONHEX",
  "ROWIDTOCHAR",
  "ROWIDTONCHAR",
  "SCN_TO_TIMESTAMP",
  "TIMESTAMP_TO_SCN",
  "TO_BINARY_DOUBLE",
  "TO_BINARY_FLOAT",
  "TO_CHAR",
  "TO_CLOB",
  "TO_DATE",
  "TO_DSINTERVAL",
  "TO_LOB",
  "TO_MULTI_BYTE",
  "TO_NCHAR",
  "TO_NCLOB",
  "TO_NUMBER",
  "TO_DSINTERVAL",
  "TO_SINGLE_BYTE",
  "TO_TIMESTAMP",
  "TO_TIMESTAMP_TZ",
  "TO_YMINTERVAL",
  "TO_YMINTERVAL",
  "TRANSLATE",
  "UNISTR",
  // largeObject
  "BFILENAME",
  "EMPTY_BLOB,",
  "EMPTY_CLOB",
  // collection
  "CARDINALITY",
  "COLLECT",
  "POWERMULTISET",
  "POWERMULTISET_BY_CARDINALITY",
  "SET",
  // hierarchical
  "SYS_CONNECT_BY_PATH",
  // dataMining
  "CLUSTER_ID",
  "CLUSTER_PROBABILITY",
  "CLUSTER_SET",
  "FEATURE_ID",
  "FEATURE_SET",
  "FEATURE_VALUE",
  "PREDICTION",
  "PREDICTION_COST",
  "PREDICTION_DETAILS",
  "PREDICTION_PROBABILITY",
  "PREDICTION_SET",
  // xml
  "APPENDCHILDXML",
  "DELETEXML",
  "DEPTH",
  "EXTRACT",
  "EXISTSNODE",
  "EXTRACTVALUE",
  "INSERTCHILDXML",
  "INSERTXMLBEFORE",
  "PATH",
  "SYS_DBURIGEN",
  "SYS_XMLAGG",
  "SYS_XMLGEN",
  "UPDATEXML",
  "XMLAGG",
  "XMLCDATA",
  "XMLCOLATTVAL",
  "XMLCOMMENT",
  "XMLCONCAT",
  "XMLFOREST",
  "XMLPARSE",
  "XMLPI",
  "XMLQUERY",
  "XMLROOT",
  "XMLSEQUENCE",
  "XMLSERIALIZE",
  "XMLTABLE",
  "XMLTRANSFORM",
  // encoding
  "DECODE",
  "DUMP",
  "ORA_HASH",
  "VSIZE",
  // nullRelated
  "COALESCE",
  "LNNVL",
  "NULLIF",
  "NVL",
  "NVL2",
  // env
  "SYS_CONTEXT",
  "SYS_GUID",
  "SYS_TYPEID",
  "UID",
  "USER",
  "USERENV",
  // aggregate
  "AVG",
  "COLLECT",
  "CORR",
  "CORR_S",
  "CORR_K",
  "COUNT",
  "COVAR_POP",
  "COVAR_SAMP",
  "CUME_DIST",
  "DENSE_RANK",
  "FIRST",
  "GROUP_ID",
  "GROUPING",
  "GROUPING_ID",
  "LAST",
  "MAX",
  "MEDIAN",
  "MIN",
  "PERCENTILE_CONT",
  "PERCENTILE_DISC",
  "PERCENT_RANK",
  "RANK",
  "REGR_SLOPE",
  "REGR_INTERCEPT",
  "REGR_COUNT",
  "REGR_R2",
  "REGR_AVGX",
  "REGR_AVGY",
  "REGR_SXX",
  "REGR_SYY",
  "REGR_SXY",
  "STATS_BINOMIAL_TEST",
  "STATS_CROSSTAB",
  "STATS_F_TEST",
  "STATS_KS_TEST",
  "STATS_MODE",
  "STATS_MW_TEST",
  "STATS_ONE_WAY_ANOVA",
  "STATS_T_TEST_ONE",
  "STATS_T_TEST_PAIRED",
  "STATS_T_TEST_INDEP",
  "STATS_T_TEST_INDEPU",
  "STATS_WSR_TEST",
  "STDDEV",
  "STDDEV_POP",
  "STDDEV_SAMP",
  "SUM",
  "VAR_POP",
  "VAR_SAMP",
  "VARIANCE",
  // Windowing functions (minus the ones already listed in aggregates)
  // window
  "FIRST_VALUE",
  "LAG",
  "LAST_VALUE",
  "LEAD",
  "NTILE",
  "RATIO_TO_REPORT",
  "ROW_NUMBER",
  // objectReference
  "DEREF",
  "MAKE_REF",
  "REF",
  "REFTOHEX",
  "VALUE",
  // model
  "CV",
  "ITERATION_NUMBER",
  "PRESENTNNV",
  "PRESENTV",
  "PREVIOUS"
], yA = S(["SELECT [ALL | DISTINCT | UNIQUE]"]), VA = S([
  // queries
  "WITH",
  "FROM",
  "WHERE",
  "GROUP BY",
  "HAVING",
  "PARTITION BY",
  "ORDER [SIBLINGS] BY",
  "OFFSET",
  "FETCH {FIRST | NEXT}",
  "FOR UPDATE [OF]",
  // Data manipulation
  // - insert:
  "INSERT [INTO | ALL INTO]",
  "VALUES",
  // - update:
  "SET",
  // - merge:
  "MERGE [INTO]",
  "WHEN [NOT] MATCHED [THEN]",
  "UPDATE SET",
  // other
  "RETURNING"
]), PT = S([
  "CREATE [GLOBAL TEMPORARY | PRIVATE TEMPORARY | SHARDED | DUPLICATED | IMMUTABLE BLOCKCHAIN | BLOCKCHAIN | IMMUTABLE] TABLE"
]), BE = S([
  // - create:
  "CREATE [OR REPLACE] [NO FORCE | FORCE] [EDITIONING | EDITIONABLE | EDITIONABLE EDITIONING | NONEDITIONABLE] VIEW",
  "CREATE MATERIALIZED VIEW",
  // - update:
  "UPDATE [ONLY]",
  // - delete:
  "DELETE FROM [ONLY]",
  // - drop table:
  "DROP TABLE",
  // - alter table:
  "ALTER TABLE",
  "ADD",
  "DROP {COLUMN | UNUSED COLUMNS | COLUMNS CONTINUE}",
  "MODIFY",
  "RENAME TO",
  "RENAME COLUMN",
  // - truncate:
  "TRUNCATE TABLE",
  // other
  "SET SCHEMA",
  "BEGIN",
  "CONNECT BY",
  "DECLARE",
  "EXCEPT",
  "EXCEPTION",
  "LOOP",
  "START WITH"
]), bA = S(["UNION [ALL]", "MINUS", "INTERSECT"]), WA = S([
  "JOIN",
  "{LEFT | RIGHT | FULL} [OUTER] JOIN",
  "{INNER | CROSS} JOIN",
  "NATURAL [INNER] JOIN",
  "NATURAL {LEFT | RIGHT | FULL} [OUTER] JOIN",
  // non-standard joins
  "{CROSS | OUTER} APPLY"
]), XA = S([
  "ON {UPDATE | DELETE} [SET NULL]",
  "ON COMMIT",
  "{ROWS | RANGE} BETWEEN"
]), xA = S([]), vA = {
  name: "plsql",
  tokenizerOptions: {
    reservedSelect: yA,
    reservedClauses: [...VA, ...PT, ...BE],
    reservedSetOperations: bA,
    reservedJoins: WA,
    reservedKeywordPhrases: XA,
    reservedDataTypePhrases: xA,
    supportsXor: !0,
    reservedKeywords: YA,
    reservedDataTypes: fA,
    reservedFunctionNames: gA,
    stringTypes: [
      { quote: "''-qq", prefixes: ["N"] },
      { quote: "q''", prefixes: ["N"] }
    ],
    // PL/SQL doesn't actually support escaping of quotes in identifiers,
    // but for the sake of simpler testing we'll support this anyway
    // as all other SQL dialects with "identifiers" do.
    identTypes: ['""-qq'],
    identChars: { rest: "$#" },
    variableTypes: [{ regex: "&{1,2}[A-Za-z][A-Za-z0-9_$#]*" }],
    paramTypes: { numbered: [":"], named: [":"] },
    operators: [
      "**",
      ":=",
      "%",
      "~=",
      "^=",
      // '..', // Conflicts with float followed by dot (so "2..3" gets parsed as ["2.", ".", "3"])
      ">>",
      "<<",
      "=>",
      "@",
      "||"
    ],
    postProcess: $A
  },
  formatOptions: {
    alwaysDenseOperators: ["@"],
    onelineClauses: [...PT, ...BE],
    tabularOnelineClauses: BE
  }
};
function $A(E) {
  let T = w;
  return E.map((e) => J.SET(e) && J.BY(T) ? Object.assign(Object.assign({}, e), { type: C.RESERVED_KEYWORD }) : (QT(e.type) && (T = e), e));
}
const KA = [
  // https://www.postgresql.org/docs/14/functions.html
  //
  // https://www.postgresql.org/docs/14/functions-math.html
  "ABS",
  "ACOS",
  "ACOSD",
  "ACOSH",
  "ASIN",
  "ASIND",
  "ASINH",
  "ATAN",
  "ATAN2",
  "ATAN2D",
  "ATAND",
  "ATANH",
  "CBRT",
  "CEIL",
  "CEILING",
  "COS",
  "COSD",
  "COSH",
  "COT",
  "COTD",
  "DEGREES",
  "DIV",
  "EXP",
  "FACTORIAL",
  "FLOOR",
  "GCD",
  "LCM",
  "LN",
  "LOG",
  "LOG10",
  "MIN_SCALE",
  "MOD",
  "PI",
  "POWER",
  "RADIANS",
  "RANDOM",
  "ROUND",
  "SCALE",
  "SETSEED",
  "SIGN",
  "SIN",
  "SIND",
  "SINH",
  "SQRT",
  "TAN",
  "TAND",
  "TANH",
  "TRIM_SCALE",
  "TRUNC",
  "WIDTH_BUCKET",
  // https://www.postgresql.org/docs/14/functions-string.html
  "ABS",
  "ASCII",
  "BIT_LENGTH",
  "BTRIM",
  "CHARACTER_LENGTH",
  "CHAR_LENGTH",
  "CHR",
  "CONCAT",
  "CONCAT_WS",
  "FORMAT",
  "INITCAP",
  "LEFT",
  "LENGTH",
  "LOWER",
  "LPAD",
  "LTRIM",
  "MD5",
  "NORMALIZE",
  "OCTET_LENGTH",
  "OVERLAY",
  "PARSE_IDENT",
  "PG_CLIENT_ENCODING",
  "POSITION",
  "QUOTE_IDENT",
  "QUOTE_LITERAL",
  "QUOTE_NULLABLE",
  "REGEXP_MATCH",
  "REGEXP_MATCHES",
  "REGEXP_REPLACE",
  "REGEXP_SPLIT_TO_ARRAY",
  "REGEXP_SPLIT_TO_TABLE",
  "REPEAT",
  "REPLACE",
  "REVERSE",
  "RIGHT",
  "RPAD",
  "RTRIM",
  "SPLIT_PART",
  "SPRINTF",
  "STARTS_WITH",
  "STRING_AGG",
  "STRING_TO_ARRAY",
  "STRING_TO_TABLE",
  "STRPOS",
  "SUBSTR",
  "SUBSTRING",
  "TO_ASCII",
  "TO_HEX",
  "TRANSLATE",
  "TRIM",
  "UNISTR",
  "UPPER",
  // https://www.postgresql.org/docs/14/functions-binarystring.html
  "BIT_COUNT",
  "BIT_LENGTH",
  "BTRIM",
  "CONVERT",
  "CONVERT_FROM",
  "CONVERT_TO",
  "DECODE",
  "ENCODE",
  "GET_BIT",
  "GET_BYTE",
  "LENGTH",
  "LTRIM",
  "MD5",
  "OCTET_LENGTH",
  "OVERLAY",
  "POSITION",
  "RTRIM",
  "SET_BIT",
  "SET_BYTE",
  "SHA224",
  "SHA256",
  "SHA384",
  "SHA512",
  "STRING_AGG",
  "SUBSTR",
  "SUBSTRING",
  "TRIM",
  // https://www.postgresql.org/docs/14/functions-bitstring.html
  "BIT_COUNT",
  "BIT_LENGTH",
  "GET_BIT",
  "LENGTH",
  "OCTET_LENGTH",
  "OVERLAY",
  "POSITION",
  "SET_BIT",
  "SUBSTRING",
  // https://www.postgresql.org/docs/14/functions-matching.html
  "REGEXP_MATCH",
  "REGEXP_MATCHES",
  "REGEXP_REPLACE",
  "REGEXP_SPLIT_TO_ARRAY",
  "REGEXP_SPLIT_TO_TABLE",
  // https://www.postgresql.org/docs/14/functions-formatting.html
  "TO_CHAR",
  "TO_DATE",
  "TO_NUMBER",
  "TO_TIMESTAMP",
  // https://www.postgresql.org/docs/14/functions-datetime.html
  // 'AGE',
  "CLOCK_TIMESTAMP",
  "CURRENT_DATE",
  "CURRENT_TIME",
  "CURRENT_TIMESTAMP",
  "DATE_BIN",
  "DATE_PART",
  "DATE_TRUNC",
  "EXTRACT",
  "ISFINITE",
  "JUSTIFY_DAYS",
  "JUSTIFY_HOURS",
  "JUSTIFY_INTERVAL",
  "LOCALTIME",
  "LOCALTIMESTAMP",
  "MAKE_DATE",
  "MAKE_INTERVAL",
  "MAKE_TIME",
  "MAKE_TIMESTAMP",
  "MAKE_TIMESTAMPTZ",
  "NOW",
  "PG_SLEEP",
  "PG_SLEEP_FOR",
  "PG_SLEEP_UNTIL",
  "STATEMENT_TIMESTAMP",
  "TIMEOFDAY",
  "TO_TIMESTAMP",
  "TRANSACTION_TIMESTAMP",
  // https://www.postgresql.org/docs/14/functions-enum.html
  "ENUM_FIRST",
  "ENUM_LAST",
  "ENUM_RANGE",
  // https://www.postgresql.org/docs/14/functions-geometry.html
  "AREA",
  "BOUND_BOX",
  "BOX",
  "CENTER",
  "CIRCLE",
  "DIAGONAL",
  "DIAMETER",
  "HEIGHT",
  "ISCLOSED",
  "ISOPEN",
  "LENGTH",
  "LINE",
  "LSEG",
  "NPOINTS",
  "PATH",
  "PCLOSE",
  "POINT",
  "POLYGON",
  "POPEN",
  "RADIUS",
  "SLOPE",
  "WIDTH",
  // https://www.postgresql.org/docs/14/functions-net.html
  "ABBREV",
  "BROADCAST",
  "FAMILY",
  "HOST",
  "HOSTMASK",
  "INET_MERGE",
  "INET_SAME_FAMILY",
  "MACADDR8_SET7BIT",
  "MASKLEN",
  "NETMASK",
  "NETWORK",
  "SET_MASKLEN",
  // 'TEXT', // excluded because it's also a data type name
  "TRUNC",
  // https://www.postgresql.org/docs/14/functions-textsearch.html
  "ARRAY_TO_TSVECTOR",
  "GET_CURRENT_TS_CONFIG",
  "JSONB_TO_TSVECTOR",
  "JSON_TO_TSVECTOR",
  "LENGTH",
  "NUMNODE",
  "PHRASETO_TSQUERY",
  "PLAINTO_TSQUERY",
  "QUERYTREE",
  "SETWEIGHT",
  "STRIP",
  "TO_TSQUERY",
  "TO_TSVECTOR",
  "TSQUERY_PHRASE",
  "TSVECTOR_TO_ARRAY",
  "TS_DEBUG",
  "TS_DELETE",
  "TS_FILTER",
  "TS_HEADLINE",
  "TS_LEXIZE",
  "TS_PARSE",
  "TS_RANK",
  "TS_RANK_CD",
  "TS_REWRITE",
  "TS_STAT",
  "TS_TOKEN_TYPE",
  "WEBSEARCH_TO_TSQUERY",
  // https://www.postgresql.org/docs/18/functions-uuid.html
  "GEN_RANDOM_UUID",
  "UUIDV4",
  "UUIDV7",
  "UUID_EXTRACT_TIMESTAMP",
  "UUID_EXTRACT_VERSION",
  // https://www.postgresql.org/docs/14/functions-xml.html
  "CURSOR_TO_XML",
  "CURSOR_TO_XMLSCHEMA",
  "DATABASE_TO_XML",
  "DATABASE_TO_XMLSCHEMA",
  "DATABASE_TO_XML_AND_XMLSCHEMA",
  "NEXTVAL",
  "QUERY_TO_XML",
  "QUERY_TO_XMLSCHEMA",
  "QUERY_TO_XML_AND_XMLSCHEMA",
  "SCHEMA_TO_XML",
  "SCHEMA_TO_XMLSCHEMA",
  "SCHEMA_TO_XML_AND_XMLSCHEMA",
  "STRING",
  "TABLE_TO_XML",
  "TABLE_TO_XMLSCHEMA",
  "TABLE_TO_XML_AND_XMLSCHEMA",
  "XMLAGG",
  "XMLCOMMENT",
  "XMLCONCAT",
  "XMLELEMENT",
  "XMLEXISTS",
  "XMLFOREST",
  "XMLPARSE",
  "XMLPI",
  "XMLROOT",
  "XMLSERIALIZE",
  "XMLTABLE",
  "XML_IS_WELL_FORMED",
  "XML_IS_WELL_FORMED_CONTENT",
  "XML_IS_WELL_FORMED_DOCUMENT",
  "XPATH",
  "XPATH_EXISTS",
  // https://www.postgresql.org/docs/14/functions-json.html
  "ARRAY_TO_JSON",
  "JSONB_AGG",
  "JSONB_ARRAY_ELEMENTS",
  "JSONB_ARRAY_ELEMENTS_TEXT",
  "JSONB_ARRAY_LENGTH",
  "JSONB_BUILD_ARRAY",
  "JSONB_BUILD_OBJECT",
  "JSONB_EACH",
  "JSONB_EACH_TEXT",
  "JSONB_EXTRACT_PATH",
  "JSONB_EXTRACT_PATH_TEXT",
  "JSONB_INSERT",
  "JSONB_OBJECT",
  "JSONB_OBJECT_AGG",
  "JSONB_OBJECT_KEYS",
  "JSONB_PATH_EXISTS",
  "JSONB_PATH_EXISTS_TZ",
  "JSONB_PATH_MATCH",
  "JSONB_PATH_MATCH_TZ",
  "JSONB_PATH_QUERY",
  "JSONB_PATH_QUERY_ARRAY",
  "JSONB_PATH_QUERY_ARRAY_TZ",
  "JSONB_PATH_QUERY_FIRST",
  "JSONB_PATH_QUERY_FIRST_TZ",
  "JSONB_PATH_QUERY_TZ",
  "JSONB_POPULATE_RECORD",
  "JSONB_POPULATE_RECORDSET",
  "JSONB_PRETTY",
  "JSONB_SET",
  "JSONB_SET_LAX",
  "JSONB_STRIP_NULLS",
  "JSONB_TO_RECORD",
  "JSONB_TO_RECORDSET",
  "JSONB_TYPEOF",
  "JSON_AGG",
  "JSON_ARRAY_ELEMENTS",
  "JSON_ARRAY_ELEMENTS_TEXT",
  "JSON_ARRAY_LENGTH",
  "JSON_BUILD_ARRAY",
  "JSON_BUILD_OBJECT",
  "JSON_EACH",
  "JSON_EACH_TEXT",
  "JSON_EXTRACT_PATH",
  "JSON_EXTRACT_PATH_TEXT",
  "JSON_OBJECT",
  "JSON_OBJECT_AGG",
  "JSON_OBJECT_KEYS",
  "JSON_POPULATE_RECORD",
  "JSON_POPULATE_RECORDSET",
  "JSON_STRIP_NULLS",
  "JSON_TO_RECORD",
  "JSON_TO_RECORDSET",
  "JSON_TYPEOF",
  "ROW_TO_JSON",
  "TO_JSON",
  "TO_JSONB",
  "TO_TIMESTAMP",
  // https://www.postgresql.org/docs/14/functions-sequence.html
  "CURRVAL",
  "LASTVAL",
  "NEXTVAL",
  "SETVAL",
  // https://www.postgresql.org/docs/14/functions-conditional.html
  // 'CASE',
  "COALESCE",
  "GREATEST",
  "LEAST",
  "NULLIF",
  // https://www.postgresql.org/docs/14/functions-array.html
  "ARRAY_AGG",
  "ARRAY_APPEND",
  "ARRAY_CAT",
  "ARRAY_DIMS",
  "ARRAY_FILL",
  "ARRAY_LENGTH",
  "ARRAY_LOWER",
  "ARRAY_NDIMS",
  "ARRAY_POSITION",
  "ARRAY_POSITIONS",
  "ARRAY_PREPEND",
  "ARRAY_REMOVE",
  "ARRAY_REPLACE",
  "ARRAY_TO_STRING",
  "ARRAY_UPPER",
  "CARDINALITY",
  "STRING_TO_ARRAY",
  "TRIM_ARRAY",
  "UNNEST",
  // https://www.postgresql.org/docs/14/functions-range.html
  "ISEMPTY",
  "LOWER",
  "LOWER_INC",
  "LOWER_INF",
  "MULTIRANGE",
  "RANGE_MERGE",
  "UPPER",
  "UPPER_INC",
  "UPPER_INF",
  // https://www.postgresql.org/docs/14/functions-aggregate.html
  // 'ANY',
  "ARRAY_AGG",
  "AVG",
  "BIT_AND",
  "BIT_OR",
  "BIT_XOR",
  "BOOL_AND",
  "BOOL_OR",
  "COALESCE",
  "CORR",
  "COUNT",
  "COVAR_POP",
  "COVAR_SAMP",
  "CUME_DIST",
  "DENSE_RANK",
  "EVERY",
  "GROUPING",
  "JSONB_AGG",
  "JSONB_OBJECT_AGG",
  "JSON_AGG",
  "JSON_OBJECT_AGG",
  "MAX",
  "MIN",
  "MODE",
  "PERCENTILE_CONT",
  "PERCENTILE_DISC",
  "PERCENT_RANK",
  "RANGE_AGG",
  "RANGE_INTERSECT_AGG",
  "RANK",
  "REGR_AVGX",
  "REGR_AVGY",
  "REGR_COUNT",
  "REGR_INTERCEPT",
  "REGR_R2",
  "REGR_SLOPE",
  "REGR_SXX",
  "REGR_SXY",
  "REGR_SYY",
  // 'SOME',
  "STDDEV",
  "STDDEV_POP",
  "STDDEV_SAMP",
  "STRING_AGG",
  "SUM",
  "TO_JSON",
  "TO_JSONB",
  "VARIANCE",
  "VAR_POP",
  "VAR_SAMP",
  "XMLAGG",
  // https://www.postgresql.org/docs/14/functions-window.html
  "CUME_DIST",
  "DENSE_RANK",
  "FIRST_VALUE",
  "LAG",
  "LAST_VALUE",
  "LEAD",
  "NTH_VALUE",
  "NTILE",
  "PERCENT_RANK",
  "RANK",
  "ROW_NUMBER",
  // https://www.postgresql.org/docs/14/functions-srf.html
  "GENERATE_SERIES",
  "GENERATE_SUBSCRIPTS",
  // https://www.postgresql.org/docs/14/functions-info.html
  "ACLDEFAULT",
  "ACLEXPLODE",
  "COL_DESCRIPTION",
  "CURRENT_CATALOG",
  "CURRENT_DATABASE",
  "CURRENT_QUERY",
  "CURRENT_ROLE",
  "CURRENT_SCHEMA",
  "CURRENT_SCHEMAS",
  "CURRENT_USER",
  "FORMAT_TYPE",
  "HAS_ANY_COLUMN_PRIVILEGE",
  "HAS_COLUMN_PRIVILEGE",
  "HAS_DATABASE_PRIVILEGE",
  "HAS_FOREIGN_DATA_WRAPPER_PRIVILEGE",
  "HAS_FUNCTION_PRIVILEGE",
  "HAS_LANGUAGE_PRIVILEGE",
  "HAS_SCHEMA_PRIVILEGE",
  "HAS_SEQUENCE_PRIVILEGE",
  "HAS_SERVER_PRIVILEGE",
  "HAS_TABLESPACE_PRIVILEGE",
  "HAS_TABLE_PRIVILEGE",
  "HAS_TYPE_PRIVILEGE",
  "INET_CLIENT_ADDR",
  "INET_CLIENT_PORT",
  "INET_SERVER_ADDR",
  "INET_SERVER_PORT",
  "MAKEACLITEM",
  "OBJ_DESCRIPTION",
  "PG_BACKEND_PID",
  "PG_BLOCKING_PIDS",
  "PG_COLLATION_IS_VISIBLE",
  "PG_CONF_LOAD_TIME",
  "PG_CONTROL_CHECKPOINT",
  "PG_CONTROL_INIT",
  "PG_CONTROL_SYSTEM",
  "PG_CONVERSION_IS_VISIBLE",
  "PG_CURRENT_LOGFILE",
  "PG_CURRENT_SNAPSHOT",
  "PG_CURRENT_XACT_ID",
  "PG_CURRENT_XACT_ID_IF_ASSIGNED",
  "PG_DESCRIBE_OBJECT",
  "PG_FUNCTION_IS_VISIBLE",
  "PG_GET_CATALOG_FOREIGN_KEYS",
  "PG_GET_CONSTRAINTDEF",
  "PG_GET_EXPR",
  "PG_GET_FUNCTIONDEF",
  "PG_GET_FUNCTION_ARGUMENTS",
  "PG_GET_FUNCTION_IDENTITY_ARGUMENTS",
  "PG_GET_FUNCTION_RESULT",
  "PG_GET_INDEXDEF",
  "PG_GET_KEYWORDS",
  "PG_GET_OBJECT_ADDRESS",
  "PG_GET_OWNED_SEQUENCE",
  "PG_GET_RULEDEF",
  "PG_GET_SERIAL_SEQUENCE",
  "PG_GET_STATISTICSOBJDEF",
  "PG_GET_TRIGGERDEF",
  "PG_GET_USERBYID",
  "PG_GET_VIEWDEF",
  "PG_HAS_ROLE",
  "PG_IDENTIFY_OBJECT",
  "PG_IDENTIFY_OBJECT_AS_ADDRESS",
  "PG_INDEXAM_HAS_PROPERTY",
  "PG_INDEX_COLUMN_HAS_PROPERTY",
  "PG_INDEX_HAS_PROPERTY",
  "PG_IS_OTHER_TEMP_SCHEMA",
  "PG_JIT_AVAILABLE",
  "PG_LAST_COMMITTED_XACT",
  "PG_LISTENING_CHANNELS",
  "PG_MY_TEMP_SCHEMA",
  "PG_NOTIFICATION_QUEUE_USAGE",
  "PG_OPCLASS_IS_VISIBLE",
  "PG_OPERATOR_IS_VISIBLE",
  "PG_OPFAMILY_IS_VISIBLE",
  "PG_OPTIONS_TO_TABLE",
  "PG_POSTMASTER_START_TIME",
  "PG_SAFE_SNAPSHOT_BLOCKING_PIDS",
  "PG_SNAPSHOT_XIP",
  "PG_SNAPSHOT_XMAX",
  "PG_SNAPSHOT_XMIN",
  "PG_STATISTICS_OBJ_IS_VISIBLE",
  "PG_TABLESPACE_DATABASES",
  "PG_TABLESPACE_LOCATION",
  "PG_TABLE_IS_VISIBLE",
  "PG_TRIGGER_DEPTH",
  "PG_TS_CONFIG_IS_VISIBLE",
  "PG_TS_DICT_IS_VISIBLE",
  "PG_TS_PARSER_IS_VISIBLE",
  "PG_TS_TEMPLATE_IS_VISIBLE",
  "PG_TYPEOF",
  "PG_TYPE_IS_VISIBLE",
  "PG_VISIBLE_IN_SNAPSHOT",
  "PG_XACT_COMMIT_TIMESTAMP",
  "PG_XACT_COMMIT_TIMESTAMP_ORIGIN",
  "PG_XACT_STATUS",
  "PQSERVERVERSION",
  "ROW_SECURITY_ACTIVE",
  "SESSION_USER",
  "SHOBJ_DESCRIPTION",
  "TO_REGCLASS",
  "TO_REGCOLLATION",
  "TO_REGNAMESPACE",
  "TO_REGOPER",
  "TO_REGOPERATOR",
  "TO_REGPROC",
  "TO_REGPROCEDURE",
  "TO_REGROLE",
  "TO_REGTYPE",
  "TXID_CURRENT",
  "TXID_CURRENT_IF_ASSIGNED",
  "TXID_CURRENT_SNAPSHOT",
  "TXID_SNAPSHOT_XIP",
  "TXID_SNAPSHOT_XMAX",
  "TXID_SNAPSHOT_XMIN",
  "TXID_STATUS",
  "TXID_VISIBLE_IN_SNAPSHOT",
  "USER",
  "VERSION",
  // https://www.postgresql.org/docs/14/functions-admin.html
  "BRIN_DESUMMARIZE_RANGE",
  "BRIN_SUMMARIZE_NEW_VALUES",
  "BRIN_SUMMARIZE_RANGE",
  "CONVERT_FROM",
  "CURRENT_SETTING",
  "GIN_CLEAN_PENDING_LIST",
  "PG_ADVISORY_LOCK",
  "PG_ADVISORY_LOCK_SHARED",
  "PG_ADVISORY_UNLOCK",
  "PG_ADVISORY_UNLOCK_ALL",
  "PG_ADVISORY_UNLOCK_SHARED",
  "PG_ADVISORY_XACT_LOCK",
  "PG_ADVISORY_XACT_LOCK_SHARED",
  "PG_BACKUP_START_TIME",
  "PG_CANCEL_BACKEND",
  "PG_COLLATION_ACTUAL_VERSION",
  "PG_COLUMN_COMPRESSION",
  "PG_COLUMN_SIZE",
  "PG_COPY_LOGICAL_REPLICATION_SLOT",
  "PG_COPY_PHYSICAL_REPLICATION_SLOT",
  "PG_CREATE_LOGICAL_REPLICATION_SLOT",
  "PG_CREATE_PHYSICAL_REPLICATION_SLOT",
  "PG_CREATE_RESTORE_POINT",
  "PG_CURRENT_WAL_FLUSH_LSN",
  "PG_CURRENT_WAL_INSERT_LSN",
  "PG_CURRENT_WAL_LSN",
  "PG_DATABASE_SIZE",
  "PG_DROP_REPLICATION_SLOT",
  "PG_EXPORT_SNAPSHOT",
  "PG_FILENODE_RELATION",
  "PG_GET_WAL_REPLAY_PAUSE_STATE",
  "PG_IMPORT_SYSTEM_COLLATIONS",
  "PG_INDEXES_SIZE",
  "PG_IS_IN_BACKUP",
  "PG_IS_IN_RECOVERY",
  "PG_IS_WAL_REPLAY_PAUSED",
  "PG_LAST_WAL_RECEIVE_LSN",
  "PG_LAST_WAL_REPLAY_LSN",
  "PG_LAST_XACT_REPLAY_TIMESTAMP",
  "PG_LOGICAL_EMIT_MESSAGE",
  "PG_LOGICAL_SLOT_GET_BINARY_CHANGES",
  "PG_LOGICAL_SLOT_GET_CHANGES",
  "PG_LOGICAL_SLOT_PEEK_BINARY_CHANGES",
  "PG_LOGICAL_SLOT_PEEK_CHANGES",
  "PG_LOG_BACKEND_MEMORY_CONTEXTS",
  "PG_LS_ARCHIVE_STATUSDIR",
  "PG_LS_DIR",
  "PG_LS_LOGDIR",
  "PG_LS_TMPDIR",
  "PG_LS_WALDIR",
  "PG_PARTITION_ANCESTORS",
  "PG_PARTITION_ROOT",
  "PG_PARTITION_TREE",
  "PG_PROMOTE",
  "PG_READ_BINARY_FILE",
  "PG_READ_FILE",
  "PG_RELATION_FILENODE",
  "PG_RELATION_FILEPATH",
  "PG_RELATION_SIZE",
  "PG_RELOAD_CONF",
  "PG_REPLICATION_ORIGIN_ADVANCE",
  "PG_REPLICATION_ORIGIN_CREATE",
  "PG_REPLICATION_ORIGIN_DROP",
  "PG_REPLICATION_ORIGIN_OID",
  "PG_REPLICATION_ORIGIN_PROGRESS",
  "PG_REPLICATION_ORIGIN_SESSION_IS_SETUP",
  "PG_REPLICATION_ORIGIN_SESSION_PROGRESS",
  "PG_REPLICATION_ORIGIN_SESSION_RESET",
  "PG_REPLICATION_ORIGIN_SESSION_SETUP",
  "PG_REPLICATION_ORIGIN_XACT_RESET",
  "PG_REPLICATION_ORIGIN_XACT_SETUP",
  "PG_REPLICATION_SLOT_ADVANCE",
  "PG_ROTATE_LOGFILE",
  "PG_SIZE_BYTES",
  "PG_SIZE_PRETTY",
  "PG_START_BACKUP",
  "PG_STAT_FILE",
  "PG_STOP_BACKUP",
  "PG_SWITCH_WAL",
  "PG_TABLESPACE_SIZE",
  "PG_TABLE_SIZE",
  "PG_TERMINATE_BACKEND",
  "PG_TOTAL_RELATION_SIZE",
  "PG_TRY_ADVISORY_LOCK",
  "PG_TRY_ADVISORY_LOCK_SHARED",
  "PG_TRY_ADVISORY_XACT_LOCK",
  "PG_TRY_ADVISORY_XACT_LOCK_SHARED",
  "PG_WALFILE_NAME",
  "PG_WALFILE_NAME_OFFSET",
  "PG_WAL_LSN_DIFF",
  "PG_WAL_REPLAY_PAUSE",
  "PG_WAL_REPLAY_RESUME",
  "SET_CONFIG",
  // https://www.postgresql.org/docs/14/functions-trigger.html
  "SUPPRESS_REDUNDANT_UPDATES_TRIGGER",
  "TSVECTOR_UPDATE_TRIGGER",
  "TSVECTOR_UPDATE_TRIGGER_COLUMN",
  // https://www.postgresql.org/docs/14/functions-event-triggers.html
  "PG_EVENT_TRIGGER_DDL_COMMANDS",
  "PG_EVENT_TRIGGER_DROPPED_OBJECTS",
  "PG_EVENT_TRIGGER_TABLE_REWRITE_OID",
  "PG_EVENT_TRIGGER_TABLE_REWRITE_REASON",
  "PG_GET_OBJECT_ADDRESS",
  // https://www.postgresql.org/docs/14/functions-statistics.html
  "PG_MCV_LIST_ITEMS",
  // cast
  "CAST"
], wA = [
  // https://www.postgresql.org/docs/14/sql-keywords-appendix.html
  "ALL",
  "ANALYSE",
  "ANALYZE",
  "AND",
  "ANY",
  "AS",
  "ASC",
  "ASYMMETRIC",
  "AUTHORIZATION",
  "BETWEEN",
  "BINARY",
  "BOTH",
  "CASE",
  "CAST",
  "CHECK",
  "COLLATE",
  "COLLATION",
  "COLUMN",
  "CONCURRENTLY",
  "CONSTRAINT",
  "CREATE",
  "CROSS",
  "CURRENT_CATALOG",
  "CURRENT_DATE",
  "CURRENT_ROLE",
  "CURRENT_SCHEMA",
  "CURRENT_TIME",
  "CURRENT_TIMESTAMP",
  "CURRENT_USER",
  "DAY",
  "DEFAULT",
  "DEFERRABLE",
  "DESC",
  "DISTINCT",
  "DO",
  "ELSE",
  "END",
  "EXCEPT",
  "EXISTS",
  "FALSE",
  "FETCH",
  "FILTER",
  "FOR",
  "FOREIGN",
  "FREEZE",
  "FROM",
  "FULL",
  "GRANT",
  "GROUP",
  "HAVING",
  "HOUR",
  "ILIKE",
  "IN",
  "INITIALLY",
  "INNER",
  "INOUT",
  "INTERSECT",
  "INTO",
  "IS",
  "ISNULL",
  "JOIN",
  "LATERAL",
  "LEADING",
  "LEFT",
  "LIKE",
  "LIMIT",
  "LOCALTIME",
  "LOCALTIMESTAMP",
  "MINUTE",
  "MONTH",
  "NATURAL",
  "NOT",
  "NOTNULL",
  "NULL",
  "NULLIF",
  "OFFSET",
  "ON",
  "ONLY",
  "OR",
  "ORDER",
  "OUT",
  "OUTER",
  "OVER",
  "OVERLAPS",
  "PLACING",
  "PRIMARY",
  "REFERENCES",
  "RETURNING",
  "RIGHT",
  "ROW",
  "SECOND",
  "SELECT",
  "SESSION_USER",
  "SIMILAR",
  "SOME",
  "SYMMETRIC",
  "TABLE",
  "TABLESAMPLE",
  "THEN",
  "TO",
  "TRAILING",
  "TRUE",
  "UNION",
  "UNIQUE",
  "USER",
  "USING",
  "VALUES",
  "VARIADIC",
  "VERBOSE",
  "WHEN",
  "WHERE",
  "WINDOW",
  "WITH",
  "WITHIN",
  "WITHOUT",
  "YEAR"
  // requires AS
], JA = [
  // https://www.postgresql.org/docs/current/datatype.html
  "ARRAY",
  "BIGINT",
  "BIT",
  "BIT VARYING",
  "BOOL",
  "BOOLEAN",
  "CHAR",
  "CHARACTER",
  "CHARACTER VARYING",
  "DECIMAL",
  "DEC",
  "DOUBLE",
  "ENUM",
  "FLOAT",
  "INT",
  "INTEGER",
  "INTERVAL",
  "NCHAR",
  "NUMERIC",
  "JSON",
  "JSONB",
  "PRECISION",
  "REAL",
  "SMALLINT",
  "TEXT",
  "TIME",
  "TIMESTAMP",
  "TIMESTAMPTZ",
  "UUID",
  "VARCHAR",
  "XML",
  "ZONE"
], kA = S(["SELECT [ALL | DISTINCT]"]), qA = S([
  // queries
  "WITH [RECURSIVE]",
  "FROM",
  "WHERE",
  "GROUP BY [ALL | DISTINCT]",
  "HAVING",
  "WINDOW",
  "PARTITION BY",
  "ORDER BY",
  "LIMIT",
  "OFFSET",
  "FETCH {FIRST | NEXT}",
  "FOR {UPDATE | NO KEY UPDATE | SHARE | KEY SHARE} [OF]",
  // Data manipulation
  // - insert:
  "INSERT INTO",
  "VALUES",
  "DEFAULT VALUES",
  // - update:
  "SET",
  // other
  "RETURNING"
]), lT = S([
  "CREATE [GLOBAL | LOCAL] [TEMPORARY | TEMP | UNLOGGED] TABLE [IF NOT EXISTS]"
]), mE = S([
  // - create
  "CREATE [OR REPLACE] [TEMP | TEMPORARY] [RECURSIVE] VIEW",
  "CREATE [MATERIALIZED] VIEW [IF NOT EXISTS]",
  // - update:
  "UPDATE [ONLY]",
  "WHERE CURRENT OF",
  // - insert:
  "ON CONFLICT",
  // - delete:
  "DELETE FROM [ONLY]",
  // - drop table:
  "DROP TABLE [IF EXISTS]",
  // - alter table:
  "ALTER TABLE [IF EXISTS] [ONLY]",
  "ALTER TABLE ALL IN TABLESPACE",
  "RENAME [COLUMN]",
  "RENAME TO",
  "ADD [COLUMN] [IF NOT EXISTS]",
  "DROP [COLUMN] [IF EXISTS]",
  "ALTER [COLUMN]",
  "SET DATA TYPE",
  "{SET | DROP} DEFAULT",
  "{SET | DROP} NOT NULL",
  // - truncate:
  "TRUNCATE [TABLE] [ONLY]",
  // other
  "SET SCHEMA",
  "AFTER",
  // https://www.postgresql.org/docs/14/sql-commands.html
  "ABORT",
  "ALTER AGGREGATE",
  "ALTER COLLATION",
  "ALTER CONVERSION",
  "ALTER DATABASE",
  "ALTER DEFAULT PRIVILEGES",
  "ALTER DOMAIN",
  "ALTER EVENT TRIGGER",
  "ALTER EXTENSION",
  "ALTER FOREIGN DATA WRAPPER",
  "ALTER FOREIGN TABLE",
  "ALTER FUNCTION",
  "ALTER GROUP",
  "ALTER INDEX",
  "ALTER LANGUAGE",
  "ALTER LARGE OBJECT",
  "ALTER MATERIALIZED VIEW",
  "ALTER OPERATOR",
  "ALTER OPERATOR CLASS",
  "ALTER OPERATOR FAMILY",
  "ALTER POLICY",
  "ALTER PROCEDURE",
  "ALTER PUBLICATION",
  "ALTER ROLE",
  "ALTER ROUTINE",
  "ALTER RULE",
  "ALTER SCHEMA",
  "ALTER SEQUENCE",
  "ALTER SERVER",
  "ALTER STATISTICS",
  "ALTER SUBSCRIPTION",
  "ALTER SYSTEM",
  "ALTER TABLESPACE",
  "ALTER TEXT SEARCH CONFIGURATION",
  "ALTER TEXT SEARCH DICTIONARY",
  "ALTER TEXT SEARCH PARSER",
  "ALTER TEXT SEARCH TEMPLATE",
  "ALTER TRIGGER",
  "ALTER TYPE",
  "ALTER USER",
  "ALTER USER MAPPING",
  "ALTER VIEW",
  "ANALYZE",
  "BEGIN",
  "CALL",
  "CHECKPOINT",
  "CLOSE",
  "CLUSTER",
  "COMMENT ON",
  "COMMIT",
  "COMMIT PREPARED",
  "COPY",
  "CREATE ACCESS METHOD",
  "CREATE [OR REPLACE] AGGREGATE",
  "CREATE CAST",
  "CREATE COLLATION",
  "CREATE [DEFAULT] CONVERSION",
  "CREATE DATABASE",
  "CREATE DOMAIN",
  "CREATE EVENT TRIGGER",
  "CREATE EXTENSION",
  "CREATE FOREIGN DATA WRAPPER",
  "CREATE FOREIGN TABLE",
  "CREATE [OR REPLACE] FUNCTION",
  "CREATE GROUP",
  "CREATE [UNIQUE] INDEX",
  "CREATE [OR REPLACE] [TRUSTED] [PROCEDURAL] LANGUAGE",
  "CREATE OPERATOR",
  "CREATE OPERATOR CLASS",
  "CREATE OPERATOR FAMILY",
  "CREATE POLICY",
  "CREATE [OR REPLACE] PROCEDURE",
  "CREATE PUBLICATION",
  "CREATE ROLE",
  "CREATE [OR REPLACE] RULE",
  "CREATE SCHEMA [AUTHORIZATION]",
  "CREATE [TEMPORARY | TEMP | UNLOGGED] SEQUENCE",
  "CREATE SERVER",
  "CREATE STATISTICS",
  "CREATE SUBSCRIPTION",
  "CREATE TABLESPACE",
  "CREATE TEXT SEARCH CONFIGURATION",
  "CREATE TEXT SEARCH DICTIONARY",
  "CREATE TEXT SEARCH PARSER",
  "CREATE TEXT SEARCH TEMPLATE",
  "CREATE [OR REPLACE] TRANSFORM",
  "CREATE [OR REPLACE] [CONSTRAINT] TRIGGER",
  "CREATE TYPE",
  "CREATE USER",
  "CREATE USER MAPPING",
  "DEALLOCATE",
  "DECLARE",
  "DISCARD",
  "DROP ACCESS METHOD",
  "DROP AGGREGATE",
  "DROP CAST",
  "DROP COLLATION",
  "DROP CONVERSION",
  "DROP DATABASE",
  "DROP DOMAIN",
  "DROP EVENT TRIGGER",
  "DROP EXTENSION",
  "DROP FOREIGN DATA WRAPPER",
  "DROP FOREIGN TABLE",
  "DROP FUNCTION",
  "DROP GROUP",
  "DROP IDENTITY",
  "DROP INDEX",
  "DROP LANGUAGE",
  "DROP MATERIALIZED VIEW [IF EXISTS]",
  "DROP OPERATOR",
  "DROP OPERATOR CLASS",
  "DROP OPERATOR FAMILY",
  "DROP OWNED",
  "DROP POLICY",
  "DROP PROCEDURE",
  "DROP PUBLICATION",
  "DROP ROLE",
  "DROP ROUTINE",
  "DROP RULE",
  "DROP SCHEMA",
  "DROP SEQUENCE",
  "DROP SERVER",
  "DROP STATISTICS",
  "DROP SUBSCRIPTION",
  "DROP TABLESPACE",
  "DROP TEXT SEARCH CONFIGURATION",
  "DROP TEXT SEARCH DICTIONARY",
  "DROP TEXT SEARCH PARSER",
  "DROP TEXT SEARCH TEMPLATE",
  "DROP TRANSFORM",
  "DROP TRIGGER",
  "DROP TYPE",
  "DROP USER",
  "DROP USER MAPPING",
  "DROP VIEW",
  "EXECUTE",
  "EXPLAIN",
  "FETCH",
  "GRANT",
  "IMPORT FOREIGN SCHEMA",
  "LISTEN",
  "LOAD",
  "LOCK",
  "MOVE",
  "NOTIFY",
  "OVERRIDING SYSTEM VALUE",
  "PREPARE",
  "PREPARE TRANSACTION",
  "REASSIGN OWNED",
  "REFRESH MATERIALIZED VIEW",
  "REINDEX",
  "RELEASE SAVEPOINT",
  "RESET [ALL|ROLE|SESSION AUTHORIZATION]",
  "REVOKE",
  "ROLLBACK",
  "ROLLBACK PREPARED",
  "ROLLBACK TO SAVEPOINT",
  "SAVEPOINT",
  "SECURITY LABEL",
  "SELECT INTO",
  "SET CONSTRAINTS",
  "SET ROLE",
  "SET SESSION AUTHORIZATION",
  "SET TRANSACTION",
  "SHOW",
  "START TRANSACTION",
  "UNLISTEN",
  "VACUUM"
]), QA = S([
  "UNION [ALL | DISTINCT]",
  "EXCEPT [ALL | DISTINCT]",
  "INTERSECT [ALL | DISTINCT]"
]), ZA = S([
  "JOIN",
  "{LEFT | RIGHT | FULL} [OUTER] JOIN",
  "{INNER | CROSS} JOIN",
  "NATURAL [INNER] JOIN",
  "NATURAL {LEFT | RIGHT | FULL} [OUTER] JOIN"
]), jA = S([
  "PRIMARY KEY",
  "GENERATED {ALWAYS | BY DEFAULT} AS IDENTITY",
  "ON {UPDATE | DELETE} [NO ACTION | RESTRICT | CASCADE | SET NULL | SET DEFAULT]",
  "DO {NOTHING | UPDATE}",
  "AS MATERIALIZED",
  "{ROWS | RANGE | GROUPS} BETWEEN",
  // comparison operator
  "IS [NOT] DISTINCT FROM",
  "NULLS {FIRST | LAST}",
  "WITH ORDINALITY"
]), zA = S([
  // https://www.postgresql.org/docs/current/datatype-datetime.html
  "[TIMESTAMP | TIME] {WITH | WITHOUT} TIME ZONE"
]), Et = {
  name: "postgresql",
  tokenizerOptions: {
    reservedSelect: kA,
    reservedClauses: [...qA, ...lT, ...mE],
    reservedSetOperations: QA,
    reservedJoins: ZA,
    reservedKeywordPhrases: jA,
    reservedDataTypePhrases: zA,
    reservedKeywords: wA,
    reservedDataTypes: JA,
    reservedFunctionNames: KA,
    nestedBlockComments: !0,
    extraParens: ["[]"],
    underscoresInNumbers: !0,
    stringTypes: [
      "$$",
      { quote: "''-qq", prefixes: ["U&"] },
      { quote: "''-qq-bs", prefixes: ["E"], requirePrefix: !0 },
      { quote: "''-raw", prefixes: ["B", "X"], requirePrefix: !0 }
    ],
    identTypes: [{ quote: '""-qq', prefixes: ["U&"] }],
    identChars: { rest: "$" },
    paramTypes: { numbered: ["$"] },
    operators: [
      // Arithmetic
      "%",
      "^",
      "|/",
      "||/",
      "@",
      // Assignment
      ":=",
      // Bitwise
      "&",
      "|",
      "#",
      "~",
      "<<",
      ">>",
      // Byte comparison
      "~>~",
      "~<~",
      "~>=~",
      "~<=~",
      // Geometric
      "@-@",
      "@@",
      "##",
      "<->",
      "&&",
      "&<",
      "&>",
      "<<|",
      "&<|",
      "|>>",
      "|&>",
      "<^",
      "^>",
      "?#",
      "?-",
      "?|",
      "?-|",
      "?||",
      "@>",
      "<@",
      "~=",
      // JSON
      "?",
      "@?",
      "?&",
      "->",
      "->>",
      "#>",
      "#>>",
      "#-",
      // Named function params
      "=>",
      // Network address
      ">>=",
      "<<=",
      // Pattern matching
      "~~",
      "~~*",
      "!~~",
      "!~~*",
      // POSIX RegExp
      "~",
      "~*",
      "!~",
      "!~*",
      // Range/multirange
      "-|-",
      // String concatenation
      "||",
      // Text search
      "@@@",
      "!!",
      "^@",
      // Trigram/trigraph
      "<%",
      "%>",
      "<<%",
      "%>>",
      "<<->",
      "<->>",
      "<<<->",
      "<->>>",
      // Type cast
      "::",
      ":",
      // Custom operators defined by pgvector extension
      // https://github.com/pgvector/pgvector#querying
      "<#>",
      "<=>",
      "<+>",
      "<~>",
      "<%>"
    ],
    operatorKeyword: !0
  },
  formatOptions: {
    alwaysDenseOperators: ["::", ":"],
    onelineClauses: [...lT, ...mE],
    tabularOnelineClauses: mE
  }
}, Tt = [
  // https://docs.aws.amazon.com/redshift/latest/dg/c_Aggregate_Functions.html
  "ANY_VALUE",
  "APPROXIMATE PERCENTILE_DISC",
  "AVG",
  "COUNT",
  "LISTAGG",
  "MAX",
  "MEDIAN",
  "MIN",
  "PERCENTILE_CONT",
  "STDDEV_SAMP",
  "STDDEV_POP",
  "SUM",
  "VAR_SAMP",
  "VAR_POP",
  // https://docs.aws.amazon.com/redshift/latest/dg/c_Array_Functions.html
  // 'array',
  "array_concat",
  "array_flatten",
  "get_array_length",
  "split_to_array",
  "subarray",
  // https://docs.aws.amazon.com/redshift/latest/dg/c_bitwise_aggregate_functions.html
  "BIT_AND",
  "BIT_OR",
  "BOOL_AND",
  "BOOL_OR",
  // https://docs.aws.amazon.com/redshift/latest/dg/c_conditional_expressions.html
  "COALESCE",
  "DECODE",
  "GREATEST",
  "LEAST",
  "NVL",
  "NVL2",
  "NULLIF",
  // https://docs.aws.amazon.com/redshift/latest/dg/Date_functions_header.html
  "ADD_MONTHS",
  "AT TIME ZONE",
  "CONVERT_TIMEZONE",
  "CURRENT_DATE",
  "CURRENT_TIME",
  "CURRENT_TIMESTAMP",
  "DATE_CMP",
  "DATE_CMP_TIMESTAMP",
  "DATE_CMP_TIMESTAMPTZ",
  "DATE_PART_YEAR",
  "DATEADD",
  "DATEDIFF",
  "DATE_PART",
  "DATE_TRUNC",
  "EXTRACT",
  "GETDATE",
  "INTERVAL_CMP",
  "LAST_DAY",
  "MONTHS_BETWEEN",
  "NEXT_DAY",
  "SYSDATE",
  "TIMEOFDAY",
  "TIMESTAMP_CMP",
  "TIMESTAMP_CMP_DATE",
  "TIMESTAMP_CMP_TIMESTAMPTZ",
  "TIMESTAMPTZ_CMP",
  "TIMESTAMPTZ_CMP_DATE",
  "TIMESTAMPTZ_CMP_TIMESTAMP",
  "TIMEZONE",
  "TO_TIMESTAMP",
  "TRUNC",
  // https://docs.aws.amazon.com/redshift/latest/dg/geospatial-functions.html
  "AddBBox",
  "DropBBox",
  "GeometryType",
  "ST_AddPoint",
  "ST_Angle",
  "ST_Area",
  "ST_AsBinary",
  "ST_AsEWKB",
  "ST_AsEWKT",
  "ST_AsGeoJSON",
  "ST_AsText",
  "ST_Azimuth",
  "ST_Boundary",
  "ST_Collect",
  "ST_Contains",
  "ST_ContainsProperly",
  "ST_ConvexHull",
  "ST_CoveredBy",
  "ST_Covers",
  "ST_Crosses",
  "ST_Dimension",
  "ST_Disjoint",
  "ST_Distance",
  "ST_DistanceSphere",
  "ST_DWithin",
  "ST_EndPoint",
  "ST_Envelope",
  "ST_Equals",
  "ST_ExteriorRing",
  "ST_Force2D",
  "ST_Force3D",
  "ST_Force3DM",
  "ST_Force3DZ",
  "ST_Force4D",
  "ST_GeometryN",
  "ST_GeometryType",
  "ST_GeomFromEWKB",
  "ST_GeomFromEWKT",
  "ST_GeomFromText",
  "ST_GeomFromWKB",
  "ST_InteriorRingN",
  "ST_Intersects",
  "ST_IsPolygonCCW",
  "ST_IsPolygonCW",
  "ST_IsClosed",
  "ST_IsCollection",
  "ST_IsEmpty",
  "ST_IsSimple",
  "ST_IsValid",
  "ST_Length",
  "ST_LengthSphere",
  "ST_Length2D",
  "ST_LineFromMultiPoint",
  "ST_LineInterpolatePoint",
  "ST_M",
  "ST_MakeEnvelope",
  "ST_MakeLine",
  "ST_MakePoint",
  "ST_MakePolygon",
  "ST_MemSize",
  "ST_MMax",
  "ST_MMin",
  "ST_Multi",
  "ST_NDims",
  "ST_NPoints",
  "ST_NRings",
  "ST_NumGeometries",
  "ST_NumInteriorRings",
  "ST_NumPoints",
  "ST_Perimeter",
  "ST_Perimeter2D",
  "ST_Point",
  "ST_PointN",
  "ST_Points",
  "ST_Polygon",
  "ST_RemovePoint",
  "ST_Reverse",
  "ST_SetPoint",
  "ST_SetSRID",
  "ST_Simplify",
  "ST_SRID",
  "ST_StartPoint",
  "ST_Touches",
  "ST_Within",
  "ST_X",
  "ST_XMax",
  "ST_XMin",
  "ST_Y",
  "ST_YMax",
  "ST_YMin",
  "ST_Z",
  "ST_ZMax",
  "ST_ZMin",
  "SupportsBBox",
  // https://docs.aws.amazon.com/redshift/latest/dg/hash-functions.html
  "CHECKSUM",
  "FUNC_SHA1",
  "FNV_HASH",
  "MD5",
  "SHA",
  "SHA1",
  "SHA2",
  // https://docs.aws.amazon.com/redshift/latest/dg/hyperloglog-functions.html
  "HLL",
  "HLL_CREATE_SKETCH",
  "HLL_CARDINALITY",
  "HLL_COMBINE",
  // https://docs.aws.amazon.com/redshift/latest/dg/json-functions.html
  "IS_VALID_JSON",
  "IS_VALID_JSON_ARRAY",
  "JSON_ARRAY_LENGTH",
  "JSON_EXTRACT_ARRAY_ELEMENT_TEXT",
  "JSON_EXTRACT_PATH_TEXT",
  "JSON_PARSE",
  "JSON_SERIALIZE",
  // https://docs.aws.amazon.com/redshift/latest/dg/Math_functions.html
  "ABS",
  "ACOS",
  "ASIN",
  "ATAN",
  "ATAN2",
  "CBRT",
  "CEILING",
  "CEIL",
  "COS",
  "COT",
  "DEGREES",
  "DEXP",
  "DLOG1",
  "DLOG10",
  "EXP",
  "FLOOR",
  "LN",
  "LOG",
  "MOD",
  "PI",
  "POWER",
  "RADIANS",
  "RANDOM",
  "ROUND",
  "SIN",
  "SIGN",
  "SQRT",
  "TAN",
  "TO_HEX",
  "TRUNC",
  // https://docs.aws.amazon.com/redshift/latest/dg/ml-function.html
  "EXPLAIN_MODEL",
  // https://docs.aws.amazon.com/redshift/latest/dg/String_functions_header.html
  "ASCII",
  "BPCHARCMP",
  "BTRIM",
  "BTTEXT_PATTERN_CMP",
  "CHAR_LENGTH",
  "CHARACTER_LENGTH",
  "CHARINDEX",
  "CHR",
  "COLLATE",
  "CONCAT",
  "CRC32",
  "DIFFERENCE",
  "INITCAP",
  "LEFT",
  "RIGHT",
  "LEN",
  "LENGTH",
  "LOWER",
  "LPAD",
  "RPAD",
  "LTRIM",
  "OCTETINDEX",
  "OCTET_LENGTH",
  "POSITION",
  "QUOTE_IDENT",
  "QUOTE_LITERAL",
  "REGEXP_COUNT",
  "REGEXP_INSTR",
  "REGEXP_REPLACE",
  "REGEXP_SUBSTR",
  "REPEAT",
  "REPLACE",
  "REPLICATE",
  "REVERSE",
  "RTRIM",
  "SOUNDEX",
  "SPLIT_PART",
  "STRPOS",
  "STRTOL",
  "SUBSTRING",
  "TEXTLEN",
  "TRANSLATE",
  "TRIM",
  "UPPER",
  // https://docs.aws.amazon.com/redshift/latest/dg/c_Type_Info_Functions.html
  "decimal_precision",
  "decimal_scale",
  "is_array",
  "is_bigint",
  "is_boolean",
  "is_char",
  "is_decimal",
  "is_float",
  "is_integer",
  "is_object",
  "is_scalar",
  "is_smallint",
  "is_varchar",
  "json_typeof",
  // https://docs.aws.amazon.com/redshift/latest/dg/c_Window_functions.html
  "AVG",
  "COUNT",
  "CUME_DIST",
  "DENSE_RANK",
  "FIRST_VALUE",
  "LAST_VALUE",
  "LAG",
  "LEAD",
  "LISTAGG",
  "MAX",
  "MEDIAN",
  "MIN",
  "NTH_VALUE",
  "NTILE",
  "PERCENT_RANK",
  "PERCENTILE_CONT",
  "PERCENTILE_DISC",
  "RANK",
  "RATIO_TO_REPORT",
  "ROW_NUMBER",
  "STDDEV_SAMP",
  "STDDEV_POP",
  "SUM",
  "VAR_SAMP",
  "VAR_POP",
  // https://docs.aws.amazon.com/redshift/latest/dg/r_Data_type_formatting.html
  "CAST",
  "CONVERT",
  "TO_CHAR",
  "TO_DATE",
  "TO_NUMBER",
  "TEXT_TO_INT_ALT",
  "TEXT_TO_NUMERIC_ALT",
  // https://docs.aws.amazon.com/redshift/latest/dg/r_System_administration_functions.html
  "CHANGE_QUERY_PRIORITY",
  "CHANGE_SESSION_PRIORITY",
  "CHANGE_USER_PRIORITY",
  "CURRENT_SETTING",
  "PG_CANCEL_BACKEND",
  "PG_TERMINATE_BACKEND",
  "REBOOT_CLUSTER",
  "SET_CONFIG",
  // https://docs.aws.amazon.com/redshift/latest/dg/r_System_information_functions.html
  "CURRENT_AWS_ACCOUNT",
  "CURRENT_DATABASE",
  "CURRENT_NAMESPACE",
  "CURRENT_SCHEMA",
  "CURRENT_SCHEMAS",
  "CURRENT_USER",
  "CURRENT_USER_ID",
  "HAS_ASSUMEROLE_PRIVILEGE",
  "HAS_DATABASE_PRIVILEGE",
  "HAS_SCHEMA_PRIVILEGE",
  "HAS_TABLE_PRIVILEGE",
  "PG_BACKEND_PID",
  "PG_GET_COLS",
  "PG_GET_GRANTEE_BY_IAM_ROLE",
  "PG_GET_IAM_ROLE_BY_USER",
  "PG_GET_LATE_BINDING_VIEW_COLS",
  "PG_LAST_COPY_COUNT",
  "PG_LAST_COPY_ID",
  "PG_LAST_UNLOAD_ID",
  "PG_LAST_QUERY_ID",
  "PG_LAST_UNLOAD_COUNT",
  "SESSION_USER",
  "SLICE_NUM",
  "USER",
  "VERSION"
], et = [
  // https://docs.aws.amazon.com/redshift/latest/dg/r_pg_keywords.html
  "AES128",
  "AES256",
  "ALL",
  "ALLOWOVERWRITE",
  "ANY",
  "AS",
  "ASC",
  "AUTHORIZATION",
  "BACKUP",
  "BETWEEN",
  "BINARY",
  "BOTH",
  "CHECK",
  "COLUMN",
  "CONSTRAINT",
  "CREATE",
  "CROSS",
  "DEFAULT",
  "DEFERRABLE",
  "DEFLATE",
  "DEFRAG",
  "DESC",
  "DISABLE",
  "DISTINCT",
  "DO",
  "ENABLE",
  "ENCODE",
  "ENCRYPT",
  "ENCRYPTION",
  "EXPLICIT",
  "FALSE",
  "FOR",
  "FOREIGN",
  "FREEZE",
  "FROM",
  "FULL",
  "GLOBALDICT256",
  "GLOBALDICT64K",
  "GROUP",
  "IDENTITY",
  "IGNORE",
  "ILIKE",
  "IN",
  "INITIALLY",
  "INNER",
  "INTO",
  "IS",
  "ISNULL",
  "LANGUAGE",
  "LEADING",
  "LIKE",
  "LIMIT",
  "LOCALTIME",
  "LOCALTIMESTAMP",
  "LUN",
  "LUNS",
  "MINUS",
  "NATURAL",
  "NEW",
  "NOT",
  "NOTNULL",
  "NULL",
  "NULLS",
  "OFF",
  "OFFLINE",
  "OFFSET",
  "OID",
  "OLD",
  "ON",
  "ONLY",
  "OPEN",
  "ORDER",
  "OUTER",
  "OVERLAPS",
  "PARALLEL",
  "PARTITION",
  "PERCENT",
  "PERMISSIONS",
  "PLACING",
  "PRIMARY",
  "RECOVER",
  "REFERENCES",
  "REJECTLOG",
  "RESORT",
  "RESPECT",
  "RESTORE",
  "SIMILAR",
  "SNAPSHOT",
  "SOME",
  "SYSTEM",
  "TABLE",
  "TAG",
  "TDES",
  "THEN",
  "TIMESTAMP",
  "TO",
  "TOP",
  "TRAILING",
  "TRUE",
  "UNIQUE",
  "USING",
  "VERBOSE",
  "WALLET",
  "WITHOUT",
  // https://docs.aws.amazon.com/redshift/latest/dg/copy-parameters-data-conversion.html
  "ACCEPTANYDATE",
  "ACCEPTINVCHARS",
  "BLANKSASNULL",
  "DATEFORMAT",
  "EMPTYASNULL",
  "ENCODING",
  "ESCAPE",
  "EXPLICIT_IDS",
  "FILLRECORD",
  "IGNOREBLANKLINES",
  "IGNOREHEADER",
  "REMOVEQUOTES",
  "ROUNDEC",
  "TIMEFORMAT",
  "TRIMBLANKS",
  "TRUNCATECOLUMNS",
  // https://docs.aws.amazon.com/redshift/latest/dg/copy-parameters-data-load.html
  "COMPROWS",
  "COMPUPDATE",
  "MAXERROR",
  "NOLOAD",
  "STATUPDATE",
  // https://docs.aws.amazon.com/redshift/latest/dg/copy-parameters-data-format.html
  "FORMAT",
  "CSV",
  "DELIMITER",
  "FIXEDWIDTH",
  "SHAPEFILE",
  "AVRO",
  "JSON",
  "PARQUET",
  "ORC",
  // https://docs.aws.amazon.com/redshift/latest/dg/copy-parameters-authorization.html
  "ACCESS_KEY_ID",
  "CREDENTIALS",
  "ENCRYPTED",
  "IAM_ROLE",
  "MASTER_SYMMETRIC_KEY",
  "SECRET_ACCESS_KEY",
  "SESSION_TOKEN",
  // https://docs.aws.amazon.com/redshift/latest/dg/copy-parameters-file-compression.html
  "BZIP2",
  "GZIP",
  "LZOP",
  "ZSTD",
  // https://docs.aws.amazon.com/redshift/latest/dg/r_COPY-alphabetical-parm-list.html
  "MANIFEST",
  "READRATIO",
  "REGION",
  "SSH",
  // https://docs.aws.amazon.com/redshift/latest/dg/c_Compression_encodings.html
  "RAW",
  "AZ64",
  "BYTEDICT",
  "DELTA",
  "DELTA32K",
  "LZO",
  "MOSTLY8",
  "MOSTLY16",
  "MOSTLY32",
  "RUNLENGTH",
  "TEXT255",
  "TEXT32K",
  // misc
  // CREATE EXTERNAL SCHEMA (https://docs.aws.amazon.com/redshift/latest/dg/r_CREATE_EXTERNAL_SCHEMA.html)
  "CATALOG_ROLE",
  "SECRET_ARN",
  "EXTERNAL",
  // https://docs.aws.amazon.com/redshift/latest/dg/c_choosing_dist_sort.html
  "AUTO",
  "EVEN",
  "KEY",
  "PREDICATE",
  // unknown
  "COMPRESSION"
  /**
   * Other keywords not included:
   * STL: https://docs.aws.amazon.com/redshift/latest/dg/c_intro_STL_tables.html
   * SVCS: https://docs.aws.amazon.com/redshift/latest/dg/svcs_views.html
   * SVL: https://docs.aws.amazon.com/redshift/latest/dg/svl_views.html
   * SVV: https://docs.aws.amazon.com/redshift/latest/dg/svv_views.html
   */
], Rt = [
  // https://docs.aws.amazon.com/redshift/latest/dg/r_Character_types.html#r_Character_types-text-and-bpchar-types
  "ARRAY",
  "BIGINT",
  "BPCHAR",
  "CHAR",
  "CHARACTER VARYING",
  "CHARACTER",
  "DECIMAL",
  "INT",
  "INT2",
  "INT4",
  "INT8",
  "INTEGER",
  "NCHAR",
  "NUMERIC",
  "NVARCHAR",
  "SMALLINT",
  "TEXT",
  "VARBYTE",
  "VARCHAR"
], At = S(["SELECT [ALL | DISTINCT]"]), tt = S([
  // queries
  "WITH [RECURSIVE]",
  "FROM",
  "WHERE",
  "GROUP BY",
  "HAVING",
  "QUALIFY",
  "PARTITION BY",
  "ORDER BY",
  "LIMIT",
  "OFFSET",
  // Data manipulation
  // - insert:
  "INSERT INTO",
  "VALUES",
  // - update:
  "SET"
]), MT = S([
  "CREATE [TEMPORARY | TEMP | LOCAL TEMPORARY | LOCAL TEMP] TABLE [IF NOT EXISTS]"
]), FE = S([
  // - create:
  "CREATE [OR REPLACE | MATERIALIZED] VIEW",
  // - update:
  "UPDATE",
  // - delete:
  "DELETE [FROM]",
  // - drop table:
  "DROP TABLE [IF EXISTS]",
  // - alter table:
  "ALTER TABLE",
  "ALTER TABLE APPEND",
  "ADD [COLUMN]",
  "DROP [COLUMN]",
  "RENAME TO",
  "RENAME COLUMN",
  "ALTER COLUMN",
  "TYPE",
  "ENCODE",
  // - truncate:
  "TRUNCATE [TABLE]",
  // https://docs.aws.amazon.com/redshift/latest/dg/c_SQL_commands.html
  "ABORT",
  "ALTER DATABASE",
  "ALTER DATASHARE",
  "ALTER DEFAULT PRIVILEGES",
  "ALTER GROUP",
  "ALTER MATERIALIZED VIEW",
  "ALTER PROCEDURE",
  "ALTER SCHEMA",
  "ALTER USER",
  "ANALYSE",
  "ANALYZE",
  "ANALYSE COMPRESSION",
  "ANALYZE COMPRESSION",
  "BEGIN",
  "CALL",
  "CANCEL",
  "CLOSE",
  "COMMIT",
  "COPY",
  "CREATE DATABASE",
  "CREATE DATASHARE",
  "CREATE EXTERNAL FUNCTION",
  "CREATE EXTERNAL SCHEMA",
  "CREATE EXTERNAL TABLE",
  "CREATE FUNCTION",
  "CREATE GROUP",
  "CREATE LIBRARY",
  "CREATE MODEL",
  "CREATE PROCEDURE",
  "CREATE SCHEMA",
  "CREATE USER",
  "DEALLOCATE",
  "DECLARE",
  "DESC DATASHARE",
  "DROP DATABASE",
  "DROP DATASHARE",
  "DROP FUNCTION",
  "DROP GROUP",
  "DROP LIBRARY",
  "DROP MODEL",
  "DROP MATERIALIZED VIEW",
  "DROP PROCEDURE",
  "DROP SCHEMA",
  "DROP USER",
  "DROP VIEW",
  "DROP",
  "EXECUTE",
  "EXPLAIN",
  "FETCH",
  "GRANT",
  "LOCK",
  "PREPARE",
  "REFRESH MATERIALIZED VIEW",
  "RESET",
  "REVOKE",
  "ROLLBACK",
  "SELECT INTO",
  "SET SESSION AUTHORIZATION",
  "SET SESSION CHARACTERISTICS",
  "SHOW",
  "SHOW EXTERNAL TABLE",
  "SHOW MODEL",
  "SHOW DATASHARES",
  "SHOW PROCEDURE",
  "SHOW TABLE",
  "SHOW VIEW",
  "START TRANSACTION",
  "UNLOAD",
  "VACUUM"
]), St = S(["UNION [ALL]", "EXCEPT", "INTERSECT", "MINUS"]), It = S([
  "JOIN",
  "{LEFT | RIGHT | FULL} [OUTER] JOIN",
  "{INNER | CROSS} JOIN",
  "NATURAL [INNER] JOIN",
  "NATURAL {LEFT | RIGHT | FULL} [OUTER] JOIN"
]), Ot = S([
  // https://docs.aws.amazon.com/redshift/latest/dg/copy-parameters-data-conversion.html
  "NULL AS",
  // https://docs.aws.amazon.com/redshift/latest/dg/r_CREATE_EXTERNAL_SCHEMA.html
  "DATA CATALOG",
  "HIVE METASTORE",
  // in window specifications
  "{ROWS | RANGE} BETWEEN"
]), Nt = S([]), st = {
  name: "redshift",
  tokenizerOptions: {
    reservedSelect: At,
    reservedClauses: [...tt, ...MT, ...FE],
    reservedSetOperations: St,
    reservedJoins: It,
    reservedKeywordPhrases: Ot,
    reservedDataTypePhrases: Nt,
    reservedKeywords: et,
    reservedDataTypes: Rt,
    reservedFunctionNames: Tt,
    extraParens: ["[]"],
    stringTypes: ["''-qq"],
    identTypes: ['""-qq'],
    identChars: { first: "#" },
    paramTypes: { numbered: ["$"] },
    operators: [
      "^",
      "%",
      "@",
      "|/",
      "||/",
      "&",
      "|",
      // '#', conflicts with first char of identifier
      "~",
      "<<",
      ">>",
      "||",
      "::"
    ]
  },
  formatOptions: {
    alwaysDenseOperators: ["::"],
    onelineClauses: [...MT, ...FE],
    tabularOnelineClauses: FE
  }
}, rt = [
  // https://deepkb.com/CO_000013/en/kb/IMPORT-fbfa59f0-2bf1-31fe-bb7b-0f9efe9932c6/spark-sql-keywords
  "ADD",
  "AFTER",
  "ALL",
  "ALTER",
  "ANALYZE",
  "AND",
  "ANTI",
  "ANY",
  "ARCHIVE",
  "AS",
  "ASC",
  "AT",
  "AUTHORIZATION",
  "BETWEEN",
  "BOTH",
  "BUCKET",
  "BUCKETS",
  "BY",
  "CACHE",
  "CASCADE",
  "CAST",
  "CHANGE",
  "CHECK",
  "CLEAR",
  "CLUSTER",
  "CLUSTERED",
  "CODEGEN",
  "COLLATE",
  "COLLECTION",
  "COLUMN",
  "COLUMNS",
  "COMMENT",
  "COMMIT",
  "COMPACT",
  "COMPACTIONS",
  "COMPUTE",
  "CONCATENATE",
  "CONSTRAINT",
  "COST",
  "CREATE",
  "CROSS",
  "CUBE",
  "CURRENT",
  "CURRENT_DATE",
  "CURRENT_TIME",
  "CURRENT_TIMESTAMP",
  "CURRENT_USER",
  "DATA",
  "DATABASE",
  "DATABASES",
  "DAY",
  "DBPROPERTIES",
  "DEFINED",
  "DELETE",
  "DELIMITED",
  "DESC",
  "DESCRIBE",
  "DFS",
  "DIRECTORIES",
  "DIRECTORY",
  "DISTINCT",
  "DISTRIBUTE",
  "DIV",
  "DROP",
  "ESCAPE",
  "ESCAPED",
  "EXCEPT",
  "EXCHANGE",
  "EXISTS",
  "EXPORT",
  "EXTENDED",
  "EXTERNAL",
  "EXTRACT",
  "FALSE",
  "FETCH",
  "FIELDS",
  "FILTER",
  "FILEFORMAT",
  "FIRST",
  "FIRST_VALUE",
  "FOLLOWING",
  "FOR",
  "FOREIGN",
  "FORMAT",
  "FORMATTED",
  "FULL",
  "FUNCTION",
  "FUNCTIONS",
  "GLOBAL",
  "GRANT",
  "GROUP",
  "GROUPING",
  "HOUR",
  "IF",
  "IGNORE",
  "IMPORT",
  "IN",
  "INDEX",
  "INDEXES",
  "INNER",
  "INPATH",
  "INPUTFORMAT",
  "INTERSECT",
  "INTO",
  "IS",
  "ITEMS",
  "KEYS",
  "LAST",
  "LAST_VALUE",
  "LATERAL",
  "LAZY",
  "LEADING",
  "LEFT",
  "LIKE",
  "LINES",
  "LIST",
  "LOCAL",
  "LOCATION",
  "LOCK",
  "LOCKS",
  "LOGICAL",
  "MACRO",
  "MATCHED",
  "MERGE",
  "MINUTE",
  "MONTH",
  "MSCK",
  "NAMESPACE",
  "NAMESPACES",
  "NATURAL",
  "NO",
  "NOT",
  "NULL",
  "NULLS",
  "OF",
  "ONLY",
  "OPTION",
  "OPTIONS",
  "OR",
  "ORDER",
  "OUT",
  "OUTER",
  "OUTPUTFORMAT",
  "OVER",
  "OVERLAPS",
  "OVERLAY",
  "OVERWRITE",
  "OWNER",
  "PARTITION",
  "PARTITIONED",
  "PARTITIONS",
  "PERCENT",
  "PLACING",
  "POSITION",
  "PRECEDING",
  "PRIMARY",
  "PRINCIPALS",
  "PROPERTIES",
  "PURGE",
  "QUERY",
  "RANGE",
  "RECORDREADER",
  "RECORDWRITER",
  "RECOVER",
  "REDUCE",
  "REFERENCES",
  "RENAME",
  "REPAIR",
  "REPLACE",
  "RESPECT",
  "RESTRICT",
  "REVOKE",
  "RIGHT",
  "RLIKE",
  "ROLE",
  "ROLES",
  "ROLLBACK",
  "ROLLUP",
  "ROW",
  "ROWS",
  "SCHEMA",
  "SECOND",
  "SELECT",
  "SEMI",
  "SEPARATED",
  "SERDE",
  "SERDEPROPERTIES",
  "SESSION_USER",
  "SETS",
  "SHOW",
  "SKEWED",
  "SOME",
  "SORT",
  "SORTED",
  "START",
  "STATISTICS",
  "STORED",
  "STRATIFY",
  "SUBSTR",
  "SUBSTRING",
  "TABLE",
  "TABLES",
  "TBLPROPERTIES",
  "TEMPORARY",
  "TERMINATED",
  "THEN",
  "TO",
  "TOUCH",
  "TRAILING",
  "TRANSACTION",
  "TRANSACTIONS",
  "TRIM",
  "TRUE",
  "TRUNCATE",
  "UNARCHIVE",
  "UNBOUNDED",
  "UNCACHE",
  "UNIQUE",
  "UNKNOWN",
  "UNLOCK",
  "UNSET",
  "USE",
  "USER",
  "USING",
  "VIEW",
  "WINDOW",
  "YEAR",
  // other
  "ANALYSE",
  "ARRAY_ZIP",
  "COALESCE",
  "CONTAINS",
  "CONVERT",
  "DAYS",
  "DAY_HOUR",
  "DAY_MINUTE",
  "DAY_SECOND",
  "DECODE",
  "DEFAULT",
  "DISTINCTROW",
  "ENCODE",
  "EXPLODE",
  "EXPLODE_OUTER",
  "FIXED",
  "GREATEST",
  "GROUP_CONCAT",
  "HOURS",
  "HOUR_MINUTE",
  "HOUR_SECOND",
  "IFNULL",
  "LEAST",
  "LEVEL",
  "MINUTE_SECOND",
  "NULLIF",
  "OFFSET",
  "ON",
  "OPTIMIZE",
  "REGEXP",
  "SEPARATOR",
  "SIZE",
  "TYPE",
  "TYPES",
  "UNSIGNED",
  "VARIABLES",
  "YEAR_MONTH"
], nt = [
  // https://spark.apache.org/docs/latest/sql-ref-datatypes.html
  "ARRAY",
  "BIGINT",
  "BINARY",
  "BOOLEAN",
  "BYTE",
  "CHAR",
  "DATE",
  "DEC",
  "DECIMAL",
  "DOUBLE",
  "FLOAT",
  "INT",
  "INTEGER",
  "INTERVAL",
  "LONG",
  "MAP",
  "NUMERIC",
  "REAL",
  "SHORT",
  "SMALLINT",
  "STRING",
  "STRUCT",
  "TIMESTAMP_LTZ",
  "TIMESTAMP_NTZ",
  "TIMESTAMP",
  "TINYINT",
  "VARCHAR"
  // No varchar type in Spark, only STRING. Added for the sake of tests
], at = [
  // http://spark.apache.org/docs/latest/sql-ref-functions.html
  //
  // http://spark.apache.org/docs/latest/sql-ref-functions-builtin.html#aggregate-functions
  // 'ANY',
  "APPROX_COUNT_DISTINCT",
  "APPROX_PERCENTILE",
  "AVG",
  "BIT_AND",
  "BIT_OR",
  "BIT_XOR",
  "BOOL_AND",
  "BOOL_OR",
  "COLLECT_LIST",
  "COLLECT_SET",
  "CORR",
  "COUNT",
  "COUNT",
  "COUNT",
  "COUNT_IF",
  "COUNT_MIN_SKETCH",
  "COVAR_POP",
  "COVAR_SAMP",
  "EVERY",
  "FIRST",
  "FIRST_VALUE",
  "GROUPING",
  "GROUPING_ID",
  "KURTOSIS",
  "LAST",
  "LAST_VALUE",
  "MAX",
  "MAX_BY",
  "MEAN",
  "MIN",
  "MIN_BY",
  "PERCENTILE",
  "PERCENTILE",
  "PERCENTILE_APPROX",
  "SKEWNESS",
  // 'SOME',
  "STD",
  "STDDEV",
  "STDDEV_POP",
  "STDDEV_SAMP",
  "SUM",
  "VAR_POP",
  "VAR_SAMP",
  "VARIANCE",
  // http://spark.apache.org/docs/latest/sql-ref-functions-builtin.html#window-functions
  "CUME_DIST",
  "DENSE_RANK",
  "LAG",
  "LEAD",
  "NTH_VALUE",
  "NTILE",
  "PERCENT_RANK",
  "RANK",
  "ROW_NUMBER",
  // http://spark.apache.org/docs/latest/sql-ref-functions-builtin.html#array-functions
  "ARRAY",
  "ARRAY_CONTAINS",
  "ARRAY_DISTINCT",
  "ARRAY_EXCEPT",
  "ARRAY_INTERSECT",
  "ARRAY_JOIN",
  "ARRAY_MAX",
  "ARRAY_MIN",
  "ARRAY_POSITION",
  "ARRAY_REMOVE",
  "ARRAY_REPEAT",
  "ARRAY_UNION",
  "ARRAYS_OVERLAP",
  "ARRAYS_ZIP",
  "FLATTEN",
  "SEQUENCE",
  "SHUFFLE",
  "SLICE",
  "SORT_ARRAY",
  // http://spark.apache.org/docs/latest/sql-ref-functions-builtin.html#map-functions
  "ELEMENT_AT",
  "ELEMENT_AT",
  "MAP_CONCAT",
  "MAP_ENTRIES",
  "MAP_FROM_ARRAYS",
  "MAP_FROM_ENTRIES",
  "MAP_KEYS",
  "MAP_VALUES",
  "STR_TO_MAP",
  // http://spark.apache.org/docs/latest/sql-ref-functions-builtin.html#date-and-timestamp-functions
  "ADD_MONTHS",
  "CURRENT_DATE",
  "CURRENT_DATE",
  "CURRENT_TIMESTAMP",
  "CURRENT_TIMESTAMP",
  "CURRENT_TIMEZONE",
  "DATE_ADD",
  "DATE_FORMAT",
  "DATE_FROM_UNIX_DATE",
  "DATE_PART",
  "DATE_SUB",
  "DATE_TRUNC",
  "DATEDIFF",
  "DAY",
  "DAYOFMONTH",
  "DAYOFWEEK",
  "DAYOFYEAR",
  "EXTRACT",
  "FROM_UNIXTIME",
  "FROM_UTC_TIMESTAMP",
  "HOUR",
  "LAST_DAY",
  "MAKE_DATE",
  "MAKE_DT_INTERVAL",
  "MAKE_INTERVAL",
  "MAKE_TIMESTAMP",
  "MAKE_YM_INTERVAL",
  "MINUTE",
  "MONTH",
  "MONTHS_BETWEEN",
  "NEXT_DAY",
  "NOW",
  "QUARTER",
  "SECOND",
  "SESSION_WINDOW",
  "TIMESTAMP_MICROS",
  "TIMESTAMP_MILLIS",
  "TIMESTAMP_SECONDS",
  "TO_DATE",
  "TO_TIMESTAMP",
  "TO_UNIX_TIMESTAMP",
  "TO_UTC_TIMESTAMP",
  "TRUNC",
  "UNIX_DATE",
  "UNIX_MICROS",
  "UNIX_MILLIS",
  "UNIX_SECONDS",
  "UNIX_TIMESTAMP",
  "WEEKDAY",
  "WEEKOFYEAR",
  "WINDOW",
  "YEAR",
  // http://spark.apache.org/docs/latest/sql-ref-functions-builtin.html#json-functions
  "FROM_JSON",
  "GET_JSON_OBJECT",
  "JSON_ARRAY_LENGTH",
  "JSON_OBJECT_KEYS",
  "JSON_TUPLE",
  "SCHEMA_OF_JSON",
  "TO_JSON",
  // http://spark.apache.org/docs/latest/api/sql/index.html
  "ABS",
  "ACOS",
  "ACOSH",
  "AGGREGATE",
  "ARRAY_SORT",
  "ASCII",
  "ASIN",
  "ASINH",
  "ASSERT_TRUE",
  "ATAN",
  "ATAN2",
  "ATANH",
  "BASE64",
  "BIN",
  "BIT_COUNT",
  "BIT_GET",
  "BIT_LENGTH",
  "BROUND",
  "BTRIM",
  "CARDINALITY",
  "CBRT",
  "CEIL",
  "CEILING",
  "CHAR_LENGTH",
  "CHARACTER_LENGTH",
  "CHR",
  "CONCAT",
  "CONCAT_WS",
  "CONV",
  "COS",
  "COSH",
  "COT",
  "CRC32",
  "CURRENT_CATALOG",
  "CURRENT_DATABASE",
  "CURRENT_USER",
  "DEGREES",
  // 'E',
  "ELT",
  "EXP",
  "EXPM1",
  "FACTORIAL",
  "FIND_IN_SET",
  "FLOOR",
  "FORALL",
  "FORMAT_NUMBER",
  "FORMAT_STRING",
  "FROM_CSV",
  "GETBIT",
  "HASH",
  "HEX",
  "HYPOT",
  "INITCAP",
  "INLINE",
  "INLINE_OUTER",
  "INPUT_FILE_BLOCK_LENGTH",
  "INPUT_FILE_BLOCK_START",
  "INPUT_FILE_NAME",
  "INSTR",
  "ISNAN",
  "ISNOTNULL",
  "ISNULL",
  "JAVA_METHOD",
  "LCASE",
  "LEFT",
  "LENGTH",
  "LEVENSHTEIN",
  "LN",
  "LOCATE",
  "LOG",
  "LOG10",
  "LOG1P",
  "LOG2",
  "LOWER",
  "LPAD",
  "LTRIM",
  "MAP_FILTER",
  "MAP_ZIP_WITH",
  "MD5",
  "MOD",
  "MONOTONICALLY_INCREASING_ID",
  "NAMED_STRUCT",
  "NANVL",
  "NEGATIVE",
  "NVL",
  "NVL2",
  "OCTET_LENGTH",
  "OVERLAY",
  "PARSE_URL",
  "PI",
  "PMOD",
  "POSEXPLODE",
  "POSEXPLODE_OUTER",
  "POSITION",
  "POSITIVE",
  "POW",
  "POWER",
  "PRINTF",
  "RADIANS",
  "RAISE_ERROR",
  "RAND",
  "RANDN",
  "RANDOM",
  "REFLECT",
  "REGEXP_EXTRACT",
  "REGEXP_EXTRACT_ALL",
  "REGEXP_LIKE",
  "REGEXP_REPLACE",
  "REPEAT",
  "REPLACE",
  "REVERSE",
  "RIGHT",
  "RINT",
  "ROUND",
  "RPAD",
  "RTRIM",
  "SCHEMA_OF_CSV",
  "SENTENCES",
  "SHA",
  "SHA1",
  "SHA2",
  "SHIFTLEFT",
  "SHIFTRIGHT",
  "SHIFTRIGHTUNSIGNED",
  "SIGN",
  "SIGNUM",
  "SIN",
  "SINH",
  "SOUNDEX",
  "SPACE",
  "SPARK_PARTITION_ID",
  "SPLIT",
  "SQRT",
  "STACK",
  "SUBSTR",
  "SUBSTRING",
  "SUBSTRING_INDEX",
  "TAN",
  "TANH",
  "TO_CSV",
  "TRANSFORM_KEYS",
  "TRANSFORM_VALUES",
  "TRANSLATE",
  "TRIM",
  "TRY_ADD",
  "TRY_DIVIDE",
  "TYPEOF",
  "UCASE",
  "UNBASE64",
  "UNHEX",
  "UPPER",
  "UUID",
  "VERSION",
  "WIDTH_BUCKET",
  "XPATH",
  "XPATH_BOOLEAN",
  "XPATH_DOUBLE",
  "XPATH_FLOAT",
  "XPATH_INT",
  "XPATH_LONG",
  "XPATH_NUMBER",
  "XPATH_SHORT",
  "XPATH_STRING",
  "XXHASH64",
  "ZIP_WITH",
  // cast
  "CAST",
  // Shorthand functions to use in place of CASE expression
  "COALESCE",
  "NULLIF"
], Ct = S(["SELECT [ALL | DISTINCT]"]), Lt = S([
  // queries
  "WITH",
  "FROM",
  "WHERE",
  "GROUP BY",
  "HAVING",
  "WINDOW",
  "PARTITION BY",
  "ORDER BY",
  "SORT BY",
  "CLUSTER BY",
  "DISTRIBUTE BY",
  "LIMIT",
  // Data manipulation
  // - insert:
  "INSERT [INTO | OVERWRITE] [TABLE]",
  "VALUES",
  // - insert overwrite directory:
  //   https://spark.apache.org/docs/latest/sql-ref-syntax-dml-insert-overwrite-directory.html
  "INSERT OVERWRITE [LOCAL] DIRECTORY",
  // - load:
  //   https://spark.apache.org/docs/latest/sql-ref-syntax-dml-load.html
  "LOAD DATA [LOCAL] INPATH",
  "[OVERWRITE] INTO TABLE"
]), UT = S(["CREATE [EXTERNAL] TABLE [IF NOT EXISTS]"]), hE = S([
  // - create:
  "CREATE [OR REPLACE] [GLOBAL TEMPORARY | TEMPORARY] VIEW [IF NOT EXISTS]",
  // - drop table:
  "DROP TABLE [IF EXISTS]",
  // - alter table:
  "ALTER TABLE",
  "ADD COLUMNS",
  "DROP {COLUMN | COLUMNS}",
  "RENAME TO",
  "RENAME COLUMN",
  "ALTER COLUMN",
  // - truncate:
  "TRUNCATE TABLE",
  // other
  "LATERAL VIEW",
  "ALTER DATABASE",
  "ALTER VIEW",
  "CREATE DATABASE",
  "CREATE FUNCTION",
  "DROP DATABASE",
  "DROP FUNCTION",
  "DROP VIEW",
  "REPAIR TABLE",
  "USE DATABASE",
  // Data Retrieval
  "TABLESAMPLE",
  "PIVOT",
  "TRANSFORM",
  "EXPLAIN",
  // Auxiliary
  "ADD FILE",
  "ADD JAR",
  "ANALYZE TABLE",
  "CACHE TABLE",
  "CLEAR CACHE",
  "DESCRIBE DATABASE",
  "DESCRIBE FUNCTION",
  "DESCRIBE QUERY",
  "DESCRIBE TABLE",
  "LIST FILE",
  "LIST JAR",
  "REFRESH",
  "REFRESH TABLE",
  "REFRESH FUNCTION",
  "RESET",
  "SHOW COLUMNS",
  "SHOW CREATE TABLE",
  "SHOW DATABASES",
  "SHOW FUNCTIONS",
  "SHOW PARTITIONS",
  "SHOW TABLE EXTENDED",
  "SHOW TABLES",
  "SHOW TBLPROPERTIES",
  "SHOW VIEWS",
  "UNCACHE TABLE"
]), ot = S([
  "UNION [ALL | DISTINCT]",
  "EXCEPT [ALL | DISTINCT]",
  "INTERSECT [ALL | DISTINCT]"
]), it = S([
  "JOIN",
  "{LEFT | RIGHT | FULL} [OUTER] JOIN",
  "{INNER | CROSS} JOIN",
  "NATURAL [INNER] JOIN",
  "NATURAL {LEFT | RIGHT | FULL} [OUTER] JOIN",
  // non-standard-joins
  "[LEFT] {ANTI | SEMI} JOIN",
  "NATURAL [LEFT] {ANTI | SEMI} JOIN"
]), _t = S([
  "ON DELETE",
  "ON UPDATE",
  "CURRENT ROW",
  "{ROWS | RANGE} BETWEEN"
]), Dt = S([]), Pt = {
  name: "spark",
  tokenizerOptions: {
    reservedSelect: Ct,
    reservedClauses: [...Lt, ...UT, ...hE],
    reservedSetOperations: ot,
    reservedJoins: it,
    reservedKeywordPhrases: _t,
    reservedDataTypePhrases: Dt,
    supportsXor: !0,
    reservedKeywords: rt,
    reservedDataTypes: nt,
    reservedFunctionNames: at,
    extraParens: ["[]"],
    stringTypes: [
      "''-bs",
      '""-bs',
      { quote: "''-raw", prefixes: ["R", "X"], requirePrefix: !0 },
      { quote: '""-raw', prefixes: ["R", "X"], requirePrefix: !0 }
    ],
    identTypes: ["``"],
    identChars: { allowFirstCharNumber: !0 },
    variableTypes: [{ quote: "{}", prefixes: ["$"], requirePrefix: !0 }],
    operators: ["%", "~", "^", "|", "&", "<=>", "==", "!", "||", "->"],
    postProcess: lt
  },
  formatOptions: {
    onelineClauses: [...UT, ...hE],
    tabularOnelineClauses: hE
  }
};
function lt(E) {
  return E.map((T, e) => {
    const R = E[e - 1] || w, t = E[e + 1] || w;
    return J.WINDOW(T) && t.type === C.OPEN_PAREN ? Object.assign(Object.assign({}, T), { type: C.RESERVED_FUNCTION_NAME }) : T.text === "ITEMS" && T.type === C.RESERVED_KEYWORD && !(R.text === "COLLECTION" && t.text === "TERMINATED") ? Object.assign(Object.assign({}, T), { type: C.IDENTIFIER, text: T.raw }) : T;
  });
}
const Mt = [
  // https://www.sqlite.org/lang_corefunc.html
  "ABS",
  "CHANGES",
  "CHAR",
  "COALESCE",
  "FORMAT",
  "GLOB",
  "HEX",
  "IFNULL",
  "IIF",
  "INSTR",
  "LAST_INSERT_ROWID",
  "LENGTH",
  "LIKE",
  "LIKELIHOOD",
  "LIKELY",
  "LOAD_EXTENSION",
  "LOWER",
  "LTRIM",
  "NULLIF",
  "PRINTF",
  "QUOTE",
  "RANDOM",
  "RANDOMBLOB",
  "REPLACE",
  "ROUND",
  "RTRIM",
  "SIGN",
  "SOUNDEX",
  "SQLITE_COMPILEOPTION_GET",
  "SQLITE_COMPILEOPTION_USED",
  "SQLITE_OFFSET",
  "SQLITE_SOURCE_ID",
  "SQLITE_VERSION",
  "SUBSTR",
  "SUBSTRING",
  "TOTAL_CHANGES",
  "TRIM",
  "TYPEOF",
  "UNICODE",
  "UNLIKELY",
  "UPPER",
  "ZEROBLOB",
  // https://www.sqlite.org/lang_aggfunc.html
  "AVG",
  "COUNT",
  "GROUP_CONCAT",
  "MAX",
  "MIN",
  "SUM",
  "TOTAL",
  // https://www.sqlite.org/lang_datefunc.html
  "DATE",
  "TIME",
  "DATETIME",
  "JULIANDAY",
  "UNIXEPOCH",
  "STRFTIME",
  // https://www.sqlite.org/windowfunctions.html#biwinfunc
  "row_number",
  "rank",
  "dense_rank",
  "percent_rank",
  "cume_dist",
  "ntile",
  "lag",
  "lead",
  "first_value",
  "last_value",
  "nth_value",
  // https://www.sqlite.org/lang_mathfunc.html
  "ACOS",
  "ACOSH",
  "ASIN",
  "ASINH",
  "ATAN",
  "ATAN2",
  "ATANH",
  "CEIL",
  "CEILING",
  "COS",
  "COSH",
  "DEGREES",
  "EXP",
  "FLOOR",
  "LN",
  "LOG",
  "LOG",
  "LOG10",
  "LOG2",
  "MOD",
  "PI",
  "POW",
  "POWER",
  "RADIANS",
  "SIN",
  "SINH",
  "SQRT",
  "TAN",
  "TANH",
  "TRUNC",
  // https://www.sqlite.org/json1.html
  "JSON",
  "JSON_ARRAY",
  "JSON_ARRAY_LENGTH",
  "JSON_ARRAY_LENGTH",
  "JSON_EXTRACT",
  "JSON_INSERT",
  "JSON_OBJECT",
  "JSON_PATCH",
  "JSON_REMOVE",
  "JSON_REPLACE",
  "JSON_SET",
  "JSON_TYPE",
  "JSON_TYPE",
  "JSON_VALID",
  "JSON_QUOTE",
  "JSON_GROUP_ARRAY",
  "JSON_GROUP_OBJECT",
  "JSON_EACH",
  "JSON_TREE",
  // cast
  "CAST"
], Ut = [
  // https://www.sqlite.org/lang_keywords.html
  // Note: The keywords listed on that URL are not all reserved keywords.
  // We'll need to clean up this list to only include reserved keywords.
  "ABORT",
  "ACTION",
  "ADD",
  "AFTER",
  "ALL",
  "ALTER",
  "AND",
  "ARE",
  "ALWAYS",
  "ANALYZE",
  "AS",
  "ASC",
  "ATTACH",
  "AUTOINCREMENT",
  "BEFORE",
  "BEGIN",
  "BETWEEN",
  "BY",
  "CASCADE",
  "CASE",
  "CAST",
  "CHECK",
  "COLLATE",
  "COLUMN",
  "COMMIT",
  "CONFLICT",
  "CONSTRAINT",
  "CREATE",
  "CROSS",
  "CURRENT",
  "CURRENT_DATE",
  "CURRENT_TIME",
  "CURRENT_TIMESTAMP",
  "DATABASE",
  "DEFAULT",
  "DEFERRABLE",
  "DEFERRED",
  "DELETE",
  "DESC",
  "DETACH",
  "DISTINCT",
  "DO",
  "DROP",
  "EACH",
  "ELSE",
  "END",
  "ESCAPE",
  "EXCEPT",
  "EXCLUDE",
  "EXCLUSIVE",
  "EXISTS",
  "EXPLAIN",
  "FAIL",
  "FILTER",
  "FIRST",
  "FOLLOWING",
  "FOR",
  "FOREIGN",
  "FROM",
  "FULL",
  "GENERATED",
  "GLOB",
  "GROUP",
  "HAVING",
  "IF",
  "IGNORE",
  "IMMEDIATE",
  "IN",
  "INDEX",
  "INDEXED",
  "INITIALLY",
  "INNER",
  "INSERT",
  "INSTEAD",
  "INTERSECT",
  "INTO",
  "IS",
  "ISNULL",
  "JOIN",
  "KEY",
  "LAST",
  "LEFT",
  "LIKE",
  "LIMIT",
  "MATCH",
  "MATERIALIZED",
  "NATURAL",
  "NO",
  "NOT",
  "NOTHING",
  "NOTNULL",
  "NULL",
  "NULLS",
  "OF",
  "OFFSET",
  "ON",
  "ONLY",
  "OPEN",
  "OR",
  "ORDER",
  "OTHERS",
  "OUTER",
  "OVER",
  "PARTITION",
  "PLAN",
  "PRAGMA",
  "PRECEDING",
  "PRIMARY",
  "QUERY",
  "RAISE",
  "RANGE",
  "RECURSIVE",
  "REFERENCES",
  "REGEXP",
  "REINDEX",
  "RELEASE",
  "RENAME",
  "REPLACE",
  "RESTRICT",
  "RETURNING",
  "RIGHT",
  "ROLLBACK",
  "ROW",
  "ROWS",
  "SAVEPOINT",
  "SELECT",
  "SET",
  "TABLE",
  "TEMP",
  "TEMPORARY",
  "THEN",
  "TIES",
  "TO",
  "TRANSACTION",
  "TRIGGER",
  "UNBOUNDED",
  "UNION",
  "UNIQUE",
  "UPDATE",
  "USING",
  "VACUUM",
  "VALUES",
  "VIEW",
  "VIRTUAL",
  "WHEN",
  "WHERE",
  "WINDOW",
  "WITH",
  "WITHOUT"
], ct = [
  // SQLite allows any word as a data type, e.g. CREATE TABLE foo (col1 madeupname(123));
  // Here we just list some common ones as SQL Formatter
  // is only able to detect a predefined list of data types.
  // https://www.sqlite.org/stricttables.html
  // https://www.sqlite.org/datatype3.html
  "ANY",
  "ARRAY",
  "BLOB",
  "CHARACTER",
  "DECIMAL",
  "INT",
  "INTEGER",
  "NATIVE CHARACTER",
  "NCHAR",
  "NUMERIC",
  "NVARCHAR",
  "REAL",
  "TEXT",
  "VARCHAR",
  "VARYING CHARACTER"
], ut = S(["SELECT [ALL | DISTINCT]"]), dt = S([
  // queries
  "WITH [RECURSIVE]",
  "FROM",
  "WHERE",
  "GROUP BY",
  "HAVING",
  "WINDOW",
  "PARTITION BY",
  "ORDER BY",
  "LIMIT",
  "OFFSET",
  // Data manipulation
  // - insert:
  "INSERT [OR ABORT | OR FAIL | OR IGNORE | OR REPLACE | OR ROLLBACK] INTO",
  "REPLACE INTO",
  "VALUES",
  // - update:
  "SET",
  // other:
  "RETURNING"
]), cT = S(["CREATE [TEMPORARY | TEMP] TABLE [IF NOT EXISTS]"]), YE = S([
  // - create:
  "CREATE [TEMPORARY | TEMP] VIEW [IF NOT EXISTS]",
  // - update:
  "UPDATE [OR ABORT | OR FAIL | OR IGNORE | OR REPLACE | OR ROLLBACK]",
  // - insert:
  "ON CONFLICT",
  // - delete:
  "DELETE FROM",
  // - drop table:
  "DROP TABLE [IF EXISTS]",
  // - alter table:
  "ALTER TABLE",
  "ADD [COLUMN]",
  "DROP [COLUMN]",
  "RENAME [COLUMN]",
  "RENAME TO",
  // - set schema
  "SET SCHEMA"
]), pt = S(["UNION [ALL]", "EXCEPT", "INTERSECT"]), Gt = S([
  "JOIN",
  "{LEFT | RIGHT | FULL} [OUTER] JOIN",
  "{INNER | CROSS} JOIN",
  "NATURAL [INNER] JOIN",
  "NATURAL {LEFT | RIGHT | FULL} [OUTER] JOIN"
]), Ht = S([
  "ON {UPDATE | DELETE} [SET NULL | SET DEFAULT]",
  "{ROWS | RANGE | GROUPS} BETWEEN",
  "DO UPDATE"
]), Bt = S([]), mt = {
  name: "sqlite",
  tokenizerOptions: {
    reservedSelect: ut,
    reservedClauses: [...dt, ...cT, ...YE],
    reservedSetOperations: pt,
    reservedJoins: Gt,
    reservedKeywordPhrases: Ht,
    reservedDataTypePhrases: Bt,
    reservedKeywords: Ut,
    reservedDataTypes: ct,
    reservedFunctionNames: Mt,
    stringTypes: [
      "''-qq",
      { quote: "''-raw", prefixes: ["X"], requirePrefix: !0 }
      // Depending on context SQLite also supports double-quotes for strings,
      // and single-quotes for identifiers.
    ],
    identTypes: ['""-qq', "``", "[]"],
    // https://www.sqlite.org/lang_expr.html#parameters
    paramTypes: { positional: !0, numbered: ["?"], named: [":", "@", "$"] },
    operators: ["%", "~", "&", "|", "<<", ">>", "==", "->", "->>", "||"]
  },
  formatOptions: {
    onelineClauses: [...cT, ...YE],
    tabularOnelineClauses: YE
  }
}, Ft = [
  // https://jakewheat.github.io/sql-overview/sql-2008-foundation-grammar.html#_6_9_set_function_specification
  "GROUPING",
  // https://jakewheat.github.io/sql-overview/sql-2008-foundation-grammar.html#_6_10_window_function
  "RANK",
  "DENSE_RANK",
  "PERCENT_RANK",
  "CUME_DIST",
  "ROW_NUMBER",
  // https://jakewheat.github.io/sql-overview/sql-2008-foundation-grammar.html#_6_27_numeric_value_function
  "POSITION",
  "OCCURRENCES_REGEX",
  "POSITION_REGEX",
  "EXTRACT",
  "CHAR_LENGTH",
  "CHARACTER_LENGTH",
  "OCTET_LENGTH",
  "CARDINALITY",
  "ABS",
  "MOD",
  "LN",
  "EXP",
  "POWER",
  "SQRT",
  "FLOOR",
  "CEIL",
  "CEILING",
  "WIDTH_BUCKET",
  // https://jakewheat.github.io/sql-overview/sql-2008-foundation-grammar.html#_6_29_string_value_function
  "SUBSTRING",
  "SUBSTRING_REGEX",
  "UPPER",
  "LOWER",
  "CONVERT",
  "TRANSLATE",
  "TRANSLATE_REGEX",
  "TRIM",
  "OVERLAY",
  "NORMALIZE",
  "SPECIFICTYPE",
  // https://jakewheat.github.io/sql-overview/sql-2008-foundation-grammar.html#_6_31_datetime_value_function
  "CURRENT_DATE",
  "CURRENT_TIME",
  "LOCALTIME",
  "CURRENT_TIMESTAMP",
  "LOCALTIMESTAMP",
  // https://jakewheat.github.io/sql-overview/sql-2008-foundation-grammar.html#_6_38_multiset_value_function
  // SET serves multiple roles: a SET() function and a SET keyword e.g. in UPDATE table SET ...
  // multiset
  // 'SET', (disabled for now)
  // https://jakewheat.github.io/sql-overview/sql-2008-foundation-grammar.html#_10_9_aggregate_function
  "COUNT",
  "AVG",
  "MAX",
  "MIN",
  "SUM",
  // 'EVERY',
  // 'ANY',
  // 'SOME',
  "STDDEV_POP",
  "STDDEV_SAMP",
  "VAR_SAMP",
  "VAR_POP",
  "COLLECT",
  "FUSION",
  "INTERSECTION",
  "COVAR_POP",
  "COVAR_SAMP",
  "CORR",
  "REGR_SLOPE",
  "REGR_INTERCEPT",
  "REGR_COUNT",
  "REGR_R2",
  "REGR_AVGX",
  "REGR_AVGY",
  "REGR_SXX",
  "REGR_SYY",
  "REGR_SXY",
  "PERCENTILE_CONT",
  "PERCENTILE_DISC",
  // CAST is a pretty complex case, involving multiple forms:
  // - CAST(col AS int)
  // - CAST(...) WITH ...
  // - CAST FROM int
  // - CREATE CAST(mycol AS int) WITH ...
  "CAST",
  // Shorthand functions to use in place of CASE expression
  "COALESCE",
  "NULLIF",
  // Non-standard functions that have widespread support
  "ROUND",
  "SIN",
  "COS",
  "TAN",
  "ASIN",
  "ACOS",
  "ATAN"
], ht = [
  // https://jakewheat.github.io/sql-overview/sql-2008-foundation-grammar.html#reserved-word
  "ALL",
  "ALLOCATE",
  "ALTER",
  "ANY",
  "ARE",
  "AS",
  "ASC",
  "ASENSITIVE",
  "ASYMMETRIC",
  "AT",
  "ATOMIC",
  "AUTHORIZATION",
  "BEGIN",
  "BETWEEN",
  "BOTH",
  "BY",
  "CALL",
  "CALLED",
  "CASCADED",
  "CAST",
  "CHECK",
  "CLOSE",
  "COALESCE",
  "COLLATE",
  "COLUMN",
  "COMMIT",
  "CONDITION",
  "CONNECT",
  "CONSTRAINT",
  "CORRESPONDING",
  "CREATE",
  "CROSS",
  "CUBE",
  "CURRENT",
  "CURRENT_CATALOG",
  "CURRENT_DEFAULT_TRANSFORM_GROUP",
  "CURRENT_PATH",
  "CURRENT_ROLE",
  "CURRENT_SCHEMA",
  "CURRENT_TRANSFORM_GROUP_FOR_TYPE",
  "CURRENT_USER",
  "CURSOR",
  "CYCLE",
  "DEALLOCATE",
  "DAY",
  "DECLARE",
  "DEFAULT",
  "DELETE",
  "DEREF",
  "DESC",
  "DESCRIBE",
  "DETERMINISTIC",
  "DISCONNECT",
  "DISTINCT",
  "DROP",
  "DYNAMIC",
  "EACH",
  "ELEMENT",
  "END-EXEC",
  "ESCAPE",
  "EVERY",
  "EXCEPT",
  "EXEC",
  "EXECUTE",
  "EXISTS",
  "EXTERNAL",
  "FALSE",
  "FETCH",
  "FILTER",
  "FOR",
  "FOREIGN",
  "FREE",
  "FROM",
  "FULL",
  "FUNCTION",
  "GET",
  "GLOBAL",
  "GRANT",
  "GROUP",
  "HAVING",
  "HOLD",
  "HOUR",
  "IDENTITY",
  "IN",
  "INDICATOR",
  "INNER",
  "INOUT",
  "INSENSITIVE",
  "INSERT",
  "INTERSECT",
  "INTO",
  "IS",
  "LANGUAGE",
  "LARGE",
  "LATERAL",
  "LEADING",
  "LEFT",
  "LIKE",
  "LIKE_REGEX",
  "LOCAL",
  "MATCH",
  "MEMBER",
  "MERGE",
  "METHOD",
  "MINUTE",
  "MODIFIES",
  "MODULE",
  "MONTH",
  "NATURAL",
  "NEW",
  "NO",
  "NONE",
  "NOT",
  "NULL",
  "NULLIF",
  "OF",
  "OLD",
  "ON",
  "ONLY",
  "OPEN",
  "ORDER",
  "OUT",
  "OUTER",
  "OVER",
  "OVERLAPS",
  "PARAMETER",
  "PARTITION",
  "PRECISION",
  "PREPARE",
  "PRIMARY",
  "PROCEDURE",
  "RANGE",
  "READS",
  "REAL",
  "RECURSIVE",
  "REF",
  "REFERENCES",
  "REFERENCING",
  "RELEASE",
  "RESULT",
  "RETURN",
  "RETURNS",
  "REVOKE",
  "RIGHT",
  "ROLLBACK",
  "ROLLUP",
  "ROW",
  "ROWS",
  "SAVEPOINT",
  "SCOPE",
  "SCROLL",
  "SEARCH",
  "SECOND",
  "SELECT",
  "SENSITIVE",
  "SESSION_USER",
  "SET",
  "SIMILAR",
  "SOME",
  "SPECIFIC",
  "SQL",
  "SQLEXCEPTION",
  "SQLSTATE",
  "SQLWARNING",
  "START",
  "STATIC",
  "SUBMULTISET",
  "SYMMETRIC",
  "SYSTEM",
  "SYSTEM_USER",
  "TABLE",
  "TABLESAMPLE",
  "THEN",
  "TIMEZONE_HOUR",
  "TIMEZONE_MINUTE",
  "TO",
  "TRAILING",
  "TRANSLATION",
  "TREAT",
  "TRIGGER",
  "TRUE",
  "UESCAPE",
  "UNION",
  "UNIQUE",
  "UNKNOWN",
  "UNNEST",
  "UPDATE",
  "USER",
  "USING",
  "VALUE",
  "VALUES",
  "WHENEVER",
  "WINDOW",
  "WITHIN",
  "WITHOUT",
  "YEAR"
], Yt = [
  // https://jakewheat.github.io/sql-overview/sql-2008-foundation-grammar.html#_6_1_data_type
  "ARRAY",
  "BIGINT",
  "BINARY LARGE OBJECT",
  "BINARY VARYING",
  "BINARY",
  "BLOB",
  "BOOLEAN",
  "CHAR LARGE OBJECT",
  "CHAR VARYING",
  "CHAR",
  "CHARACTER LARGE OBJECT",
  "CHARACTER VARYING",
  "CHARACTER",
  "CLOB",
  "DATE",
  "DEC",
  "DECIMAL",
  "DOUBLE",
  "FLOAT",
  "INT",
  "INTEGER",
  "INTERVAL",
  "MULTISET",
  "NATIONAL CHAR VARYING",
  "NATIONAL CHAR",
  "NATIONAL CHARACTER LARGE OBJECT",
  "NATIONAL CHARACTER VARYING",
  "NATIONAL CHARACTER",
  "NCHAR LARGE OBJECT",
  "NCHAR VARYING",
  "NCHAR",
  "NCLOB",
  "NUMERIC",
  "SMALLINT",
  "TIME",
  "TIMESTAMP",
  "VARBINARY",
  "VARCHAR"
], ft = S(["SELECT [ALL | DISTINCT]"]), gt = S([
  // queries
  "WITH [RECURSIVE]",
  "FROM",
  "WHERE",
  "GROUP BY [ALL | DISTINCT]",
  "HAVING",
  "WINDOW",
  "PARTITION BY",
  "ORDER BY",
  "LIMIT",
  "OFFSET",
  "FETCH {FIRST | NEXT}",
  // Data manipulation
  // - insert:
  "INSERT INTO",
  "VALUES",
  // - update:
  "SET"
]), uT = S(["CREATE [GLOBAL TEMPORARY | LOCAL TEMPORARY] TABLE"]), fE = S([
  // - create:
  "CREATE [RECURSIVE] VIEW",
  // - update:
  "UPDATE",
  "WHERE CURRENT OF",
  // - delete:
  "DELETE FROM",
  // - drop table:
  "DROP TABLE",
  // - alter table:
  "ALTER TABLE",
  "ADD COLUMN",
  "DROP [COLUMN]",
  "RENAME COLUMN",
  "RENAME TO",
  "ALTER [COLUMN]",
  "{SET | DROP} DEFAULT",
  "ADD SCOPE",
  "DROP SCOPE {CASCADE | RESTRICT}",
  "RESTART WITH",
  // - truncate:
  "TRUNCATE TABLE",
  // other
  "SET SCHEMA"
]), yt = S([
  "UNION [ALL | DISTINCT]",
  "EXCEPT [ALL | DISTINCT]",
  "INTERSECT [ALL | DISTINCT]"
]), Vt = S([
  "JOIN",
  "{LEFT | RIGHT | FULL} [OUTER] JOIN",
  "{INNER | CROSS} JOIN",
  "NATURAL [INNER] JOIN",
  "NATURAL {LEFT | RIGHT | FULL} [OUTER] JOIN"
]), bt = S([
  "ON {UPDATE | DELETE} [SET NULL | SET DEFAULT]",
  "{ROWS | RANGE} BETWEEN"
]), Wt = S([]), Xt = {
  name: "sql",
  tokenizerOptions: {
    reservedSelect: ft,
    reservedClauses: [...gt, ...uT, ...fE],
    reservedSetOperations: yt,
    reservedJoins: Vt,
    reservedKeywordPhrases: bt,
    reservedDataTypePhrases: Wt,
    reservedKeywords: ht,
    reservedDataTypes: Yt,
    reservedFunctionNames: Ft,
    stringTypes: [
      { quote: "''-qq-bs", prefixes: ["N", "U&"] },
      { quote: "''-raw", prefixes: ["X"], requirePrefix: !0 }
    ],
    identTypes: ['""-qq', "``"],
    paramTypes: { positional: !0 },
    operators: ["||"]
  },
  formatOptions: {
    onelineClauses: [...uT, ...fE],
    tabularOnelineClauses: fE
  }
}, xt = [
  // https://github.com/trinodb/trino/tree/432d2897bdef99388c1a47188743a061c4ac1f34/docs/src/main/sphinx/functions
  // rg '^\.\. function::' ./docs/src/main/sphinx/functions | cut -d' ' -f 3 | cut -d '(' -f 1 | sort | uniq
  // rg '\* ' ./docs/src/main/sphinx/functions/list-by-topic.rst | grep    '\* :func:' | cut -d'`' -f 2
  // rg '\* ' ./docs/src/main/sphinx/functions/list-by-topic.rst | grep -v '\* :func:'
  // grep -e '^- ' ./docs/src/main/sphinx/functions/list.rst | grep  -e '^- :func:' | cut -d'`' -f2
  // grep -e '^- ' ./docs/src/main/sphinx/functions/list.rst | grep -ve '^- :func:'
  "ABS",
  "ACOS",
  "ALL_MATCH",
  "ANY_MATCH",
  "APPROX_DISTINCT",
  "APPROX_MOST_FREQUENT",
  "APPROX_PERCENTILE",
  "APPROX_SET",
  "ARBITRARY",
  "ARRAYS_OVERLAP",
  "ARRAY_AGG",
  "ARRAY_DISTINCT",
  "ARRAY_EXCEPT",
  "ARRAY_INTERSECT",
  "ARRAY_JOIN",
  "ARRAY_MAX",
  "ARRAY_MIN",
  "ARRAY_POSITION",
  "ARRAY_REMOVE",
  "ARRAY_SORT",
  "ARRAY_UNION",
  "ASIN",
  "ATAN",
  "ATAN2",
  "AT_TIMEZONE",
  "AVG",
  "BAR",
  "BETA_CDF",
  "BING_TILE",
  "BING_TILES_AROUND",
  "BING_TILE_AT",
  "BING_TILE_COORDINATES",
  "BING_TILE_POLYGON",
  "BING_TILE_QUADKEY",
  "BING_TILE_ZOOM_LEVEL",
  "BITWISE_AND",
  "BITWISE_AND_AGG",
  "BITWISE_LEFT_SHIFT",
  "BITWISE_NOT",
  "BITWISE_OR",
  "BITWISE_OR_AGG",
  "BITWISE_RIGHT_SHIFT",
  "BITWISE_RIGHT_SHIFT_ARITHMETIC",
  "BITWISE_XOR",
  "BIT_COUNT",
  "BOOL_AND",
  "BOOL_OR",
  "CARDINALITY",
  "CAST",
  "CBRT",
  "CEIL",
  "CEILING",
  "CHAR2HEXINT",
  "CHECKSUM",
  "CHR",
  "CLASSIFY",
  "COALESCE",
  "CODEPOINT",
  "COLOR",
  "COMBINATIONS",
  "CONCAT",
  "CONCAT_WS",
  "CONTAINS",
  "CONTAINS_SEQUENCE",
  "CONVEX_HULL_AGG",
  "CORR",
  "COS",
  "COSH",
  "COSINE_SIMILARITY",
  "COUNT",
  "COUNT_IF",
  "COVAR_POP",
  "COVAR_SAMP",
  "CRC32",
  "CUME_DIST",
  "CURRENT_CATALOG",
  "CURRENT_DATE",
  "CURRENT_GROUPS",
  "CURRENT_SCHEMA",
  "CURRENT_TIME",
  "CURRENT_TIMESTAMP",
  "CURRENT_TIMEZONE",
  "CURRENT_USER",
  "DATE",
  "DATE_ADD",
  "DATE_DIFF",
  "DATE_FORMAT",
  "DATE_PARSE",
  "DATE_TRUNC",
  "DAY",
  "DAY_OF_MONTH",
  "DAY_OF_WEEK",
  "DAY_OF_YEAR",
  "DEGREES",
  "DENSE_RANK",
  "DOW",
  "DOY",
  "E",
  "ELEMENT_AT",
  "EMPTY_APPROX_SET",
  "EVALUATE_CLASSIFIER_PREDICTIONS",
  "EVERY",
  "EXP",
  "EXTRACT",
  "FEATURES",
  "FILTER",
  "FIRST_VALUE",
  "FLATTEN",
  "FLOOR",
  "FORMAT",
  "FORMAT_DATETIME",
  "FORMAT_NUMBER",
  "FROM_BASE",
  "FROM_BASE32",
  "FROM_BASE64",
  "FROM_BASE64URL",
  "FROM_BIG_ENDIAN_32",
  "FROM_BIG_ENDIAN_64",
  "FROM_ENCODED_POLYLINE",
  "FROM_GEOJSON_GEOMETRY",
  "FROM_HEX",
  "FROM_IEEE754_32",
  "FROM_IEEE754_64",
  "FROM_ISO8601_DATE",
  "FROM_ISO8601_TIMESTAMP",
  "FROM_ISO8601_TIMESTAMP_NANOS",
  "FROM_UNIXTIME",
  "FROM_UNIXTIME_NANOS",
  "FROM_UTF8",
  "GEOMETRIC_MEAN",
  "GEOMETRY_FROM_HADOOP_SHAPE",
  "GEOMETRY_INVALID_REASON",
  "GEOMETRY_NEAREST_POINTS",
  "GEOMETRY_TO_BING_TILES",
  "GEOMETRY_UNION",
  "GEOMETRY_UNION_AGG",
  "GREATEST",
  "GREAT_CIRCLE_DISTANCE",
  "HAMMING_DISTANCE",
  "HASH_COUNTS",
  "HISTOGRAM",
  "HMAC_MD5",
  "HMAC_SHA1",
  "HMAC_SHA256",
  "HMAC_SHA512",
  "HOUR",
  "HUMAN_READABLE_SECONDS",
  "IF",
  "INDEX",
  "INFINITY",
  "INTERSECTION_CARDINALITY",
  "INVERSE_BETA_CDF",
  "INVERSE_NORMAL_CDF",
  "IS_FINITE",
  "IS_INFINITE",
  "IS_JSON_SCALAR",
  "IS_NAN",
  "JACCARD_INDEX",
  "JSON_ARRAY_CONTAINS",
  "JSON_ARRAY_GET",
  "JSON_ARRAY_LENGTH",
  "JSON_EXISTS",
  "JSON_EXTRACT",
  "JSON_EXTRACT_SCALAR",
  "JSON_FORMAT",
  "JSON_PARSE",
  "JSON_QUERY",
  "JSON_SIZE",
  "JSON_VALUE",
  "KURTOSIS",
  "LAG",
  "LAST_DAY_OF_MONTH",
  "LAST_VALUE",
  "LEAD",
  "LEARN_CLASSIFIER",
  "LEARN_LIBSVM_CLASSIFIER",
  "LEARN_LIBSVM_REGRESSOR",
  "LEARN_REGRESSOR",
  "LEAST",
  "LENGTH",
  "LEVENSHTEIN_DISTANCE",
  "LINE_INTERPOLATE_POINT",
  "LINE_INTERPOLATE_POINTS",
  "LINE_LOCATE_POINT",
  "LISTAGG",
  "LN",
  "LOCALTIME",
  "LOCALTIMESTAMP",
  "LOG",
  "LOG10",
  "LOG2",
  "LOWER",
  "LPAD",
  "LTRIM",
  "LUHN_CHECK",
  "MAKE_SET_DIGEST",
  "MAP",
  "MAP_AGG",
  "MAP_CONCAT",
  "MAP_ENTRIES",
  "MAP_FILTER",
  "MAP_FROM_ENTRIES",
  "MAP_KEYS",
  "MAP_UNION",
  "MAP_VALUES",
  "MAP_ZIP_WITH",
  "MAX",
  "MAX_BY",
  "MD5",
  "MERGE",
  "MERGE_SET_DIGEST",
  "MILLISECOND",
  "MIN",
  "MINUTE",
  "MIN_BY",
  "MOD",
  "MONTH",
  "MULTIMAP_AGG",
  "MULTIMAP_FROM_ENTRIES",
  "MURMUR3",
  "NAN",
  "NGRAMS",
  "NONE_MATCH",
  "NORMALIZE",
  "NORMAL_CDF",
  "NOW",
  "NTH_VALUE",
  "NTILE",
  "NULLIF",
  "NUMERIC_HISTOGRAM",
  "OBJECTID",
  "OBJECTID_TIMESTAMP",
  "PARSE_DATA_SIZE",
  "PARSE_DATETIME",
  "PARSE_DURATION",
  "PERCENT_RANK",
  "PI",
  "POSITION",
  "POW",
  "POWER",
  "QDIGEST_AGG",
  "QUARTER",
  "RADIANS",
  "RAND",
  "RANDOM",
  "RANK",
  "REDUCE",
  "REDUCE_AGG",
  "REGEXP_COUNT",
  "REGEXP_EXTRACT",
  "REGEXP_EXTRACT_ALL",
  "REGEXP_LIKE",
  "REGEXP_POSITION",
  "REGEXP_REPLACE",
  "REGEXP_SPLIT",
  "REGRESS",
  "REGR_INTERCEPT",
  "REGR_SLOPE",
  "RENDER",
  "REPEAT",
  "REPLACE",
  "REVERSE",
  "RGB",
  "ROUND",
  "ROW_NUMBER",
  "RPAD",
  "RTRIM",
  "SECOND",
  "SEQUENCE",
  "SHA1",
  "SHA256",
  "SHA512",
  "SHUFFLE",
  "SIGN",
  "SIMPLIFY_GEOMETRY",
  "SIN",
  "SKEWNESS",
  "SLICE",
  "SOUNDEX",
  "SPATIAL_PARTITIONING",
  "SPATIAL_PARTITIONS",
  "SPLIT",
  "SPLIT_PART",
  "SPLIT_TO_MAP",
  "SPLIT_TO_MULTIMAP",
  "SPOOKY_HASH_V2_32",
  "SPOOKY_HASH_V2_64",
  "SQRT",
  "STARTS_WITH",
  "STDDEV",
  "STDDEV_POP",
  "STDDEV_SAMP",
  "STRPOS",
  "ST_AREA",
  "ST_ASBINARY",
  "ST_ASTEXT",
  "ST_BOUNDARY",
  "ST_BUFFER",
  "ST_CENTROID",
  "ST_CONTAINS",
  "ST_CONVEXHULL",
  "ST_COORDDIM",
  "ST_CROSSES",
  "ST_DIFFERENCE",
  "ST_DIMENSION",
  "ST_DISJOINT",
  "ST_DISTANCE",
  "ST_ENDPOINT",
  "ST_ENVELOPE",
  "ST_ENVELOPEASPTS",
  "ST_EQUALS",
  "ST_EXTERIORRING",
  "ST_GEOMETRIES",
  "ST_GEOMETRYFROMTEXT",
  "ST_GEOMETRYN",
  "ST_GEOMETRYTYPE",
  "ST_GEOMFROMBINARY",
  "ST_INTERIORRINGN",
  "ST_INTERIORRINGS",
  "ST_INTERSECTION",
  "ST_INTERSECTS",
  "ST_ISCLOSED",
  "ST_ISEMPTY",
  "ST_ISRING",
  "ST_ISSIMPLE",
  "ST_ISVALID",
  "ST_LENGTH",
  "ST_LINEFROMTEXT",
  "ST_LINESTRING",
  "ST_MULTIPOINT",
  "ST_NUMGEOMETRIES",
  "ST_NUMINTERIORRING",
  "ST_NUMPOINTS",
  "ST_OVERLAPS",
  "ST_POINT",
  "ST_POINTN",
  "ST_POINTS",
  "ST_POLYGON",
  "ST_RELATE",
  "ST_STARTPOINT",
  "ST_SYMDIFFERENCE",
  "ST_TOUCHES",
  "ST_UNION",
  "ST_WITHIN",
  "ST_X",
  "ST_XMAX",
  "ST_XMIN",
  "ST_Y",
  "ST_YMAX",
  "ST_YMIN",
  "SUBSTR",
  "SUBSTRING",
  "SUM",
  "TAN",
  "TANH",
  "TDIGEST_AGG",
  "TIMESTAMP_OBJECTID",
  "TIMEZONE_HOUR",
  "TIMEZONE_MINUTE",
  "TO_BASE",
  "TO_BASE32",
  "TO_BASE64",
  "TO_BASE64URL",
  "TO_BIG_ENDIAN_32",
  "TO_BIG_ENDIAN_64",
  "TO_CHAR",
  "TO_DATE",
  "TO_ENCODED_POLYLINE",
  "TO_GEOJSON_GEOMETRY",
  "TO_GEOMETRY",
  "TO_HEX",
  "TO_IEEE754_32",
  "TO_IEEE754_64",
  "TO_ISO8601",
  "TO_MILLISECONDS",
  "TO_SPHERICAL_GEOGRAPHY",
  "TO_TIMESTAMP",
  "TO_UNIXTIME",
  "TO_UTF8",
  "TRANSFORM",
  "TRANSFORM_KEYS",
  "TRANSFORM_VALUES",
  "TRANSLATE",
  "TRIM",
  "TRIM_ARRAY",
  "TRUNCATE",
  "TRY",
  "TRY_CAST",
  "TYPEOF",
  "UPPER",
  "URL_DECODE",
  "URL_ENCODE",
  "URL_EXTRACT_FRAGMENT",
  "URL_EXTRACT_HOST",
  "URL_EXTRACT_PARAMETER",
  "URL_EXTRACT_PATH",
  "URL_EXTRACT_PORT",
  "URL_EXTRACT_PROTOCOL",
  "URL_EXTRACT_QUERY",
  "UUID",
  "VALUES_AT_QUANTILES",
  "VALUE_AT_QUANTILE",
  "VARIANCE",
  "VAR_POP",
  "VAR_SAMP",
  "VERSION",
  "WEEK",
  "WEEK_OF_YEAR",
  "WIDTH_BUCKET",
  "WILSON_INTERVAL_LOWER",
  "WILSON_INTERVAL_UPPER",
  "WITH_TIMEZONE",
  "WORD_STEM",
  "XXHASH64",
  "YEAR",
  "YEAR_OF_WEEK",
  "YOW",
  "ZIP",
  "ZIP_WITH",
  // https://trino.io/docs/current/sql/match-recognize.html#row-pattern-recognition-expressions
  "CLASSIFIER",
  "FIRST",
  "LAST",
  "MATCH_NUMBER",
  "NEXT",
  "PERMUTE",
  "PREV"
], vt = [
  // https://github.com/trinodb/trino/blob/432d2897bdef99388c1a47188743a061c4ac1f34/core/trino-parser/src/main/antlr4/io/trino/sql/parser/SqlBase.g4#L858-L1128
  "ABSENT",
  "ADD",
  "ADMIN",
  "AFTER",
  "ALL",
  "ALTER",
  "ANALYZE",
  "AND",
  "ANY",
  "AS",
  "ASC",
  "AT",
  "AUTHORIZATION",
  "BERNOULLI",
  "BETWEEN",
  "BOTH",
  "BY",
  "CALL",
  "CASCADE",
  "CASE",
  "CATALOGS",
  "COLUMN",
  "COLUMNS",
  "COMMENT",
  "COMMIT",
  "COMMITTED",
  "CONDITIONAL",
  "CONSTRAINT",
  "COPARTITION",
  "CREATE",
  "CROSS",
  "CUBE",
  "CURRENT",
  "CURRENT_PATH",
  "CURRENT_ROLE",
  "DATA",
  "DEALLOCATE",
  "DEFAULT",
  "DEFINE",
  "DEFINER",
  "DELETE",
  "DENY",
  "DESC",
  "DESCRIBE",
  "DESCRIPTOR",
  "DISTINCT",
  "DISTRIBUTED",
  "DOUBLE",
  "DROP",
  "ELSE",
  "EMPTY",
  "ENCODING",
  "END",
  "ERROR",
  "ESCAPE",
  "EXCEPT",
  "EXCLUDING",
  "EXECUTE",
  "EXISTS",
  "EXPLAIN",
  "FALSE",
  "FETCH",
  "FINAL",
  "FIRST",
  "FOLLOWING",
  "FOR",
  "FROM",
  "FULL",
  "FUNCTIONS",
  "GRANT",
  "GRANTED",
  "GRANTS",
  "GRAPHVIZ",
  "GROUP",
  "GROUPING",
  "GROUPS",
  "HAVING",
  "IGNORE",
  "IN",
  "INCLUDING",
  "INITIAL",
  "INNER",
  "INPUT",
  "INSERT",
  "INTERSECT",
  "INTERVAL",
  "INTO",
  "INVOKER",
  "IO",
  "IS",
  "ISOLATION",
  "JOIN",
  "JSON",
  "JSON_ARRAY",
  "JSON_OBJECT",
  "KEEP",
  "KEY",
  "KEYS",
  "LAST",
  "LATERAL",
  "LEADING",
  "LEFT",
  "LEVEL",
  "LIKE",
  "LIMIT",
  "LOCAL",
  "LOGICAL",
  "MATCH",
  "MATCHED",
  "MATCHES",
  "MATCH_RECOGNIZE",
  "MATERIALIZED",
  "MEASURES",
  "NATURAL",
  "NEXT",
  "NFC",
  "NFD",
  "NFKC",
  "NFKD",
  "NO",
  "NONE",
  "NOT",
  "NULL",
  "NULLS",
  "OBJECT",
  "OF",
  "OFFSET",
  "OMIT",
  "ON",
  "ONE",
  "ONLY",
  "OPTION",
  "OR",
  "ORDER",
  "ORDINALITY",
  "OUTER",
  "OUTPUT",
  "OVER",
  "OVERFLOW",
  "PARTITION",
  "PARTITIONS",
  "PASSING",
  "PAST",
  "PATH",
  "PATTERN",
  "PER",
  "PERMUTE",
  "PRECEDING",
  "PRECISION",
  "PREPARE",
  "PRIVILEGES",
  "PROPERTIES",
  "PRUNE",
  "QUOTES",
  "RANGE",
  "READ",
  "RECURSIVE",
  "REFRESH",
  "RENAME",
  "REPEATABLE",
  "RESET",
  "RESPECT",
  "RESTRICT",
  "RETURNING",
  "REVOKE",
  "RIGHT",
  "ROLE",
  "ROLES",
  "ROLLBACK",
  "ROLLUP",
  "ROW",
  "ROWS",
  "RUNNING",
  "SCALAR",
  "SCHEMA",
  "SCHEMAS",
  "SECURITY",
  "SEEK",
  "SELECT",
  "SERIALIZABLE",
  "SESSION",
  "SET",
  "SETS",
  "SHOW",
  "SKIP",
  "SOME",
  "START",
  "STATS",
  "STRING",
  "SUBSET",
  "SYSTEM",
  "TABLE",
  "TABLES",
  "TABLESAMPLE",
  "TEXT",
  "THEN",
  "TIES",
  "TIME",
  "TIMESTAMP",
  "TO",
  "TRAILING",
  "TRANSACTION",
  "TRUE",
  "TYPE",
  "UESCAPE",
  "UNBOUNDED",
  "UNCOMMITTED",
  "UNCONDITIONAL",
  "UNION",
  "UNIQUE",
  "UNKNOWN",
  "UNMATCHED",
  "UNNEST",
  "UPDATE",
  "USE",
  "USER",
  "USING",
  "UTF16",
  "UTF32",
  "UTF8",
  "VALIDATE",
  "VALUE",
  "VALUES",
  "VERBOSE",
  "VIEW",
  "WHEN",
  "WHERE",
  "WINDOW",
  "WITH",
  "WITHIN",
  "WITHOUT",
  "WORK",
  "WRAPPER",
  "WRITE",
  "ZONE"
], $t = [
  // https://github.com/trinodb/trino/blob/432d2897bdef99388c1a47188743a061c4ac1f34/core/trino-main/src/main/java/io/trino/metadata/TypeRegistry.java#L131-L168
  // or https://trino.io/docs/current/language/types.html
  "BIGINT",
  "INT",
  "INTEGER",
  "SMALLINT",
  "TINYINT",
  "BOOLEAN",
  "DATE",
  "DECIMAL",
  "REAL",
  "DOUBLE",
  "HYPERLOGLOG",
  "QDIGEST",
  "TDIGEST",
  "P4HYPERLOGLOG",
  "INTERVAL",
  "TIMESTAMP",
  "TIME",
  "VARBINARY",
  "VARCHAR",
  "CHAR",
  "ROW",
  "ARRAY",
  "MAP",
  "JSON",
  "JSON2016",
  "IPADDRESS",
  "GEOMETRY",
  "UUID",
  "SETDIGEST",
  "JONIREGEXP",
  "RE2JREGEXP",
  "LIKEPATTERN",
  "COLOR",
  "CODEPOINTS",
  "FUNCTION",
  "JSONPATH"
], Kt = S(["SELECT [ALL | DISTINCT]"]), wt = S([
  // queries
  "WITH [RECURSIVE]",
  "FROM",
  "WHERE",
  "GROUP BY [ALL | DISTINCT]",
  "HAVING",
  "WINDOW",
  "PARTITION BY",
  "ORDER BY",
  "LIMIT",
  "OFFSET",
  "FETCH {FIRST | NEXT}",
  // Data manipulation
  // - insert:
  "INSERT INTO",
  "VALUES",
  // - update:
  "SET",
  // MATCH_RECOGNIZE
  "MATCH_RECOGNIZE",
  "MEASURES",
  "ONE ROW PER MATCH",
  "ALL ROWS PER MATCH",
  "AFTER MATCH",
  "PATTERN",
  "SUBSET",
  "DEFINE"
]), dT = S(["CREATE TABLE [IF NOT EXISTS]"]), gE = S([
  // - create:
  "CREATE [OR REPLACE] [MATERIALIZED] VIEW",
  // - update:
  "UPDATE",
  // - delete:
  "DELETE FROM",
  // - drop table:
  "DROP TABLE [IF EXISTS]",
  // - alter table:
  "ALTER TABLE [IF EXISTS]",
  "ADD COLUMN [IF NOT EXISTS]",
  "DROP COLUMN [IF EXISTS]",
  "RENAME COLUMN [IF EXISTS]",
  "RENAME TO",
  "SET AUTHORIZATION [USER | ROLE]",
  "SET PROPERTIES",
  "EXECUTE",
  // - truncate:
  "TRUNCATE TABLE",
  // other
  "ALTER SCHEMA",
  "ALTER MATERIALIZED VIEW",
  "ALTER VIEW",
  "CREATE SCHEMA",
  "CREATE ROLE",
  "DROP SCHEMA",
  "DROP MATERIALIZED VIEW",
  "DROP VIEW",
  "DROP ROLE",
  // Auxiliary
  "EXPLAIN",
  "ANALYZE",
  "EXPLAIN ANALYZE",
  "EXPLAIN ANALYZE VERBOSE",
  "USE",
  "DESCRIBE INPUT",
  "DESCRIBE OUTPUT",
  "REFRESH MATERIALIZED VIEW",
  "RESET SESSION",
  "SET SESSION",
  "SET PATH",
  "SET TIME ZONE",
  "SHOW GRANTS",
  "SHOW CREATE TABLE",
  "SHOW CREATE SCHEMA",
  "SHOW CREATE VIEW",
  "SHOW CREATE MATERIALIZED VIEW",
  "SHOW TABLES",
  "SHOW SCHEMAS",
  "SHOW CATALOGS",
  "SHOW COLUMNS",
  "SHOW STATS FOR",
  "SHOW ROLES",
  "SHOW CURRENT ROLES",
  "SHOW ROLE GRANTS",
  "SHOW FUNCTIONS",
  "SHOW SESSION"
]), Jt = S([
  "UNION [ALL | DISTINCT]",
  "EXCEPT [ALL | DISTINCT]",
  "INTERSECT [ALL | DISTINCT]"
]), kt = S([
  "JOIN",
  "{LEFT | RIGHT | FULL} [OUTER] JOIN",
  "{INNER | CROSS} JOIN",
  "NATURAL [INNER] JOIN",
  "NATURAL {LEFT | RIGHT | FULL} [OUTER] JOIN"
]), qt = S([
  "{ROWS | RANGE | GROUPS} BETWEEN",
  // comparison operator
  "IS [NOT] DISTINCT FROM"
]), Qt = S([]), Zt = {
  name: "trino",
  tokenizerOptions: {
    reservedSelect: Kt,
    reservedClauses: [...wt, ...dT, ...gE],
    reservedSetOperations: Jt,
    reservedJoins: kt,
    reservedKeywordPhrases: qt,
    reservedDataTypePhrases: Qt,
    reservedKeywords: vt,
    reservedDataTypes: $t,
    reservedFunctionNames: xt,
    // Trino also supports {- ... -} parenthesis.
    // The formatting of these currently works out as a result of { and -
    // not getting a space added in-between.
    // https://trino.io/docs/current/sql/match-recognize.html#row-pattern-syntax
    extraParens: ["[]", "{}"],
    // https://trino.io/docs/current/language/types.html#string
    // https://trino.io/docs/current/language/types.html#varbinary
    stringTypes: [
      { quote: "''-qq", prefixes: ["U&"] },
      { quote: "''-raw", prefixes: ["X"], requirePrefix: !0 }
    ],
    // https://trino.io/docs/current/language/reserved.html
    identTypes: ['""-qq'],
    paramTypes: { positional: !0 },
    operators: [
      "%",
      "->",
      "=>",
      ":",
      "||",
      // Row pattern syntax
      "|",
      "^",
      "$"
      // '?', conflicts with positional placeholders
    ]
  },
  formatOptions: {
    onelineClauses: [...dT, ...gE],
    tabularOnelineClauses: gE
  }
}, jt = [
  // https://docs.microsoft.com/en-us/sql/t-sql/functions/functions?view=sql-server-ver15
  // aggregate
  "APPROX_COUNT_DISTINCT",
  "AVG",
  "CHECKSUM_AGG",
  "COUNT",
  "COUNT_BIG",
  "GROUPING",
  "GROUPING_ID",
  "MAX",
  "MIN",
  "STDEV",
  "STDEVP",
  "SUM",
  "VAR",
  "VARP",
  // analytic
  "CUME_DIST",
  "FIRST_VALUE",
  "LAG",
  "LAST_VALUE",
  "LEAD",
  "PERCENTILE_CONT",
  "PERCENTILE_DISC",
  "PERCENT_RANK",
  "Collation - COLLATIONPROPERTY",
  "Collation - TERTIARY_WEIGHTS",
  // configuration
  "@@DBTS",
  "@@LANGID",
  "@@LANGUAGE",
  "@@LOCK_TIMEOUT",
  "@@MAX_CONNECTIONS",
  "@@MAX_PRECISION",
  "@@NESTLEVEL",
  "@@OPTIONS",
  "@@REMSERVER",
  "@@SERVERNAME",
  "@@SERVICENAME",
  "@@SPID",
  "@@TEXTSIZE",
  "@@VERSION",
  // conversion
  "CAST",
  "CONVERT",
  "PARSE",
  "TRY_CAST",
  "TRY_CONVERT",
  "TRY_PARSE",
  // cryptographic
  "ASYMKEY_ID",
  "ASYMKEYPROPERTY",
  "CERTPROPERTY",
  "CERT_ID",
  "CRYPT_GEN_RANDOM",
  "DECRYPTBYASYMKEY",
  "DECRYPTBYCERT",
  "DECRYPTBYKEY",
  "DECRYPTBYKEYAUTOASYMKEY",
  "DECRYPTBYKEYAUTOCERT",
  "DECRYPTBYPASSPHRASE",
  "ENCRYPTBYASYMKEY",
  "ENCRYPTBYCERT",
  "ENCRYPTBYKEY",
  "ENCRYPTBYPASSPHRASE",
  "HASHBYTES",
  "IS_OBJECTSIGNED",
  "KEY_GUID",
  "KEY_ID",
  "KEY_NAME",
  "SIGNBYASYMKEY",
  "SIGNBYCERT",
  "SYMKEYPROPERTY",
  "VERIFYSIGNEDBYCERT",
  "VERIFYSIGNEDBYASYMKEY",
  // cursor
  "@@CURSOR_ROWS",
  "@@FETCH_STATUS",
  "CURSOR_STATUS",
  // dataType
  "DATALENGTH",
  "IDENT_CURRENT",
  "IDENT_INCR",
  "IDENT_SEED",
  "IDENTITY",
  "SQL_VARIANT_PROPERTY",
  // datetime
  "@@DATEFIRST",
  "CURRENT_TIMESTAMP",
  "CURRENT_TIMEZONE",
  "CURRENT_TIMEZONE_ID",
  "DATEADD",
  "DATEDIFF",
  "DATEDIFF_BIG",
  "DATEFROMPARTS",
  "DATENAME",
  "DATEPART",
  "DATETIME2FROMPARTS",
  "DATETIMEFROMPARTS",
  "DATETIMEOFFSETFROMPARTS",
  "DAY",
  "EOMONTH",
  "GETDATE",
  "GETUTCDATE",
  "ISDATE",
  "MONTH",
  "SMALLDATETIMEFROMPARTS",
  "SWITCHOFFSET",
  "SYSDATETIME",
  "SYSDATETIMEOFFSET",
  "SYSUTCDATETIME",
  "TIMEFROMPARTS",
  "TODATETIMEOFFSET",
  "YEAR",
  "JSON",
  "ISJSON",
  "JSON_VALUE",
  "JSON_QUERY",
  "JSON_MODIFY",
  // mathematical
  "ABS",
  "ACOS",
  "ASIN",
  "ATAN",
  "ATN2",
  "CEILING",
  "COS",
  "COT",
  "DEGREES",
  "EXP",
  "FLOOR",
  "LOG",
  "LOG10",
  "PI",
  "POWER",
  "RADIANS",
  "RAND",
  "ROUND",
  "SIGN",
  "SIN",
  "SQRT",
  "SQUARE",
  "TAN",
  "CHOOSE",
  "GREATEST",
  "IIF",
  "LEAST",
  // metadata
  "@@PROCID",
  "APP_NAME",
  "APPLOCK_MODE",
  "APPLOCK_TEST",
  "ASSEMBLYPROPERTY",
  "COL_LENGTH",
  "COL_NAME",
  "COLUMNPROPERTY",
  "DATABASEPROPERTYEX",
  "DB_ID",
  "DB_NAME",
  "FILE_ID",
  "FILE_IDEX",
  "FILE_NAME",
  "FILEGROUP_ID",
  "FILEGROUP_NAME",
  "FILEGROUPPROPERTY",
  "FILEPROPERTY",
  "FILEPROPERTYEX",
  "FULLTEXTCATALOGPROPERTY",
  "FULLTEXTSERVICEPROPERTY",
  "INDEX_COL",
  "INDEXKEY_PROPERTY",
  "INDEXPROPERTY",
  "NEXT VALUE FOR",
  "OBJECT_DEFINITION",
  "OBJECT_ID",
  "OBJECT_NAME",
  "OBJECT_SCHEMA_NAME",
  "OBJECTPROPERTY",
  "OBJECTPROPERTYEX",
  "ORIGINAL_DB_NAME",
  "PARSENAME",
  "SCHEMA_ID",
  "SCHEMA_NAME",
  "SCOPE_IDENTITY",
  "SERVERPROPERTY",
  "STATS_DATE",
  "TYPE_ID",
  "TYPE_NAME",
  "TYPEPROPERTY",
  // ranking
  "DENSE_RANK",
  "NTILE",
  "RANK",
  "ROW_NUMBER",
  "PUBLISHINGSERVERNAME",
  // security
  "CERTENCODED",
  "CERTPRIVATEKEY",
  "CURRENT_USER",
  "DATABASE_PRINCIPAL_ID",
  "HAS_DBACCESS",
  "HAS_PERMS_BY_NAME",
  "IS_MEMBER",
  "IS_ROLEMEMBER",
  "IS_SRVROLEMEMBER",
  "LOGINPROPERTY",
  "ORIGINAL_LOGIN",
  "PERMISSIONS",
  "PWDENCRYPT",
  "PWDCOMPARE",
  "SESSION_USER",
  "SESSIONPROPERTY",
  "SUSER_ID",
  "SUSER_NAME",
  "SUSER_SID",
  "SUSER_SNAME",
  "SYSTEM_USER",
  "USER",
  "USER_ID",
  "USER_NAME",
  // string
  "ASCII",
  "CHARINDEX",
  "CONCAT",
  "CONCAT_WS",
  "DIFFERENCE",
  "FORMAT",
  "LEFT",
  "LEN",
  "LOWER",
  "LTRIM",
  "PATINDEX",
  "QUOTENAME",
  "REPLACE",
  "REPLICATE",
  "REVERSE",
  "RIGHT",
  "RTRIM",
  "SOUNDEX",
  "SPACE",
  "STR",
  "STRING_AGG",
  "STRING_ESCAPE",
  "STUFF",
  "SUBSTRING",
  "TRANSLATE",
  "TRIM",
  "UNICODE",
  "UPPER",
  // system
  "$PARTITION",
  "@@ERROR",
  "@@IDENTITY",
  "@@PACK_RECEIVED",
  "@@ROWCOUNT",
  "@@TRANCOUNT",
  "BINARY_CHECKSUM",
  "CHECKSUM",
  "COMPRESS",
  "CONNECTIONPROPERTY",
  "CONTEXT_INFO",
  "CURRENT_REQUEST_ID",
  "CURRENT_TRANSACTION_ID",
  "DECOMPRESS",
  "ERROR_LINE",
  "ERROR_MESSAGE",
  "ERROR_NUMBER",
  "ERROR_PROCEDURE",
  "ERROR_SEVERITY",
  "ERROR_STATE",
  "FORMATMESSAGE",
  "GET_FILESTREAM_TRANSACTION_CONTEXT",
  "GETANSINULL",
  "HOST_ID",
  "HOST_NAME",
  "ISNULL",
  "ISNUMERIC",
  "MIN_ACTIVE_ROWVERSION",
  "NEWID",
  "NEWSEQUENTIALID",
  "ROWCOUNT_BIG",
  "SESSION_CONTEXT",
  "XACT_STATE",
  // statistical
  "@@CONNECTIONS",
  "@@CPU_BUSY",
  "@@IDLE",
  "@@IO_BUSY",
  "@@PACK_SENT",
  "@@PACKET_ERRORS",
  "@@TIMETICKS",
  "@@TOTAL_ERRORS",
  "@@TOTAL_READ",
  "@@TOTAL_WRITE",
  "TEXTPTR",
  "TEXTVALID",
  // trigger
  "COLUMNS_UPDATED",
  "EVENTDATA",
  "TRIGGER_NESTLEVEL",
  "UPDATE",
  // Shorthand functions to use in place of CASE expression
  "COALESCE",
  "NULLIF"
], zt = [
  // https://docs.microsoft.com/en-us/sql/t-sql/language-elements/reserved-keywords-transact-sql?view=sql-server-ver15
  // standard
  "ADD",
  "ALL",
  "ALTER",
  "AND",
  "ANY",
  "AS",
  "ASC",
  "AUTHORIZATION",
  "BACKUP",
  "BEGIN",
  "BETWEEN",
  "BREAK",
  "BROWSE",
  "BULK",
  "BY",
  "CASCADE",
  "CHECK",
  "CHECKPOINT",
  "CLOSE",
  "CLUSTERED",
  "COALESCE",
  "COLLATE",
  "COLUMN",
  "COMMIT",
  "COMPUTE",
  "CONSTRAINT",
  "CONTAINS",
  "CONTAINSTABLE",
  "CONTINUE",
  "CONVERT",
  "CREATE",
  "CROSS",
  "CURRENT",
  "CURRENT_DATE",
  "CURRENT_TIME",
  "CURRENT_TIMESTAMP",
  "CURRENT_USER",
  "CURSOR",
  "DATABASE",
  "DBCC",
  "DEALLOCATE",
  "DECLARE",
  "DEFAULT",
  "DELETE",
  "DENY",
  "DESC",
  "DISK",
  "DISTINCT",
  "DISTRIBUTED",
  "DROP",
  "DUMP",
  "ERRLVL",
  "ESCAPE",
  "EXEC",
  "EXECUTE",
  "EXISTS",
  "EXIT",
  "EXTERNAL",
  "FETCH",
  "FILE",
  "FILLFACTOR",
  "FOR",
  "FOREIGN",
  "FREETEXT",
  "FREETEXTTABLE",
  "FROM",
  "FULL",
  "FUNCTION",
  "GOTO",
  "GRANT",
  "GROUP",
  "HAVING",
  "HOLDLOCK",
  "IDENTITY",
  "IDENTITYCOL",
  "IDENTITY_INSERT",
  "IF",
  "IN",
  "INDEX",
  "INNER",
  "INSERT",
  "INTERSECT",
  "INTO",
  "IS",
  "JOIN",
  "KEY",
  "KILL",
  "LEFT",
  "LIKE",
  "LINENO",
  "LOAD",
  "MERGE",
  "NOCHECK",
  "NONCLUSTERED",
  "NOT",
  "NULL",
  "NULLIF",
  "OF",
  "OFF",
  "OFFSETS",
  "ON",
  "OPEN",
  "OPENDATASOURCE",
  "OPENQUERY",
  "OPENROWSET",
  "OPENXML",
  "OPTION",
  "OR",
  "ORDER",
  "OUTER",
  "OVER",
  "PERCENT",
  "PIVOT",
  "PLAN",
  "PRIMARY",
  "PRINT",
  "PROC",
  "PROCEDURE",
  "PUBLIC",
  "RAISERROR",
  "READ",
  "READTEXT",
  "RECONFIGURE",
  "REFERENCES",
  "REPLICATION",
  "RESTORE",
  "RESTRICT",
  "RETURN",
  "REVERT",
  "REVOKE",
  "RIGHT",
  "ROLLBACK",
  "ROWCOUNT",
  "ROWGUIDCOL",
  "RULE",
  "SAVE",
  "SCHEMA",
  "SECURITYAUDIT",
  "SELECT",
  "SEMANTICKEYPHRASETABLE",
  "SEMANTICSIMILARITYDETAILSTABLE",
  "SEMANTICSIMILARITYTABLE",
  "SESSION_USER",
  "SET",
  "SETUSER",
  "SHUTDOWN",
  "SOME",
  "STATISTICS",
  "SYSTEM_USER",
  "TABLE",
  "TABLESAMPLE",
  "TEXTSIZE",
  "THEN",
  "TO",
  "TOP",
  "TRAN",
  "TRANSACTION",
  "TRIGGER",
  "TRUNCATE",
  "TRY_CONVERT",
  "TSEQUAL",
  "UNION",
  "UNIQUE",
  "UNPIVOT",
  "UPDATE",
  "UPDATETEXT",
  "USE",
  "USER",
  "VALUES",
  "VIEW",
  "WAITFOR",
  "WHERE",
  "WHILE",
  "WITH",
  "WITHIN GROUP",
  "WRITETEXT",
  // https://learn.microsoft.com/en-us/sql/t-sql/queries/output-clause-transact-sql?view=sql-server-ver16#action
  "$ACTION"
], ES = [
  // https://learn.microsoft.com/en-us/sql/t-sql/data-types/data-types-transact-sql?view=sql-server-ver15
  "BINARY",
  "BIT",
  "CHAR",
  "CHAR",
  "CHARACTER",
  "DATE",
  "DATETIME2",
  "DATETIMEOFFSET",
  "DEC",
  "DECIMAL",
  "DOUBLE",
  "FLOAT",
  "INT",
  "INTEGER",
  "NATIONAL",
  "NCHAR",
  "NUMERIC",
  "NVARCHAR",
  "PRECISION",
  "REAL",
  "SMALLINT",
  "TIME",
  "TIMESTAMP",
  "VARBINARY",
  "VARCHAR"
], TS = S(["SELECT [ALL | DISTINCT]"]), eS = S([
  // queries
  "WITH",
  "INTO",
  "FROM",
  "WHERE",
  "GROUP BY",
  "HAVING",
  "WINDOW",
  "PARTITION BY",
  "ORDER BY",
  "OFFSET",
  "FETCH {FIRST | NEXT}",
  "FOR {BROWSE | XML | JSON}",
  "OPTION",
  // Data manipulation
  // - insert:
  "INSERT [INTO]",
  "VALUES",
  // - update:
  "SET",
  // - merge:
  "MERGE [INTO]",
  "WHEN [NOT] MATCHED [BY TARGET | BY SOURCE] [THEN]",
  "UPDATE SET"
]), pT = S(["CREATE TABLE"]), yE = S([
  // - create:
  "CREATE [OR ALTER] [MATERIALIZED] VIEW",
  // - update:
  "UPDATE",
  "WHERE CURRENT OF",
  // - delete:
  "DELETE [FROM]",
  // - drop table:
  "DROP TABLE [IF EXISTS]",
  // - alter table:
  "ALTER TABLE",
  "ADD",
  "DROP COLUMN [IF EXISTS]",
  "ALTER COLUMN",
  // - truncate:
  "TRUNCATE TABLE",
  // indexes
  "CREATE [UNIQUE] [CLUSTERED] INDEX",
  // databases
  "CREATE DATABASE",
  "ALTER DATABASE",
  "DROP DATABASE [IF EXISTS]",
  // functions/procedures
  "CREATE [OR ALTER] [PARTITION] {FUNCTION | PROCEDURE | PROC}",
  "ALTER [PARTITION] {FUNCTION | PROCEDURE | PROC}",
  "DROP [PARTITION] {FUNCTION | PROCEDURE | PROC} [IF EXISTS]",
  // other statements
  "GO",
  "USE",
  // https://docs.microsoft.com/en-us/sql/t-sql/statements/statements?view=sql-server-ver15
  "ADD SENSITIVITY CLASSIFICATION",
  "ADD SIGNATURE",
  "AGGREGATE",
  "ANSI_DEFAULTS",
  "ANSI_NULLS",
  "ANSI_NULL_DFLT_OFF",
  "ANSI_NULL_DFLT_ON",
  "ANSI_PADDING",
  "ANSI_WARNINGS",
  "APPLICATION ROLE",
  "ARITHABORT",
  "ARITHIGNORE",
  "ASSEMBLY",
  "ASYMMETRIC KEY",
  "AUTHORIZATION",
  "AVAILABILITY GROUP",
  "BACKUP",
  "BACKUP CERTIFICATE",
  "BACKUP MASTER KEY",
  "BACKUP SERVICE MASTER KEY",
  "BEGIN CONVERSATION TIMER",
  "BEGIN DIALOG CONVERSATION",
  "BROKER PRIORITY",
  "BULK INSERT",
  "CERTIFICATE",
  "CLOSE MASTER KEY",
  "CLOSE SYMMETRIC KEY",
  "COLUMN ENCRYPTION KEY",
  "COLUMN MASTER KEY",
  "COLUMNSTORE INDEX",
  "CONCAT_NULL_YIELDS_NULL",
  "CONTEXT_INFO",
  "CONTRACT",
  "CREDENTIAL",
  "CRYPTOGRAPHIC PROVIDER",
  "CURSOR_CLOSE_ON_COMMIT",
  "DATABASE",
  "DATABASE AUDIT SPECIFICATION",
  "DATABASE ENCRYPTION KEY",
  "DATABASE HADR",
  "DATABASE SCOPED CONFIGURATION",
  "DATABASE SCOPED CREDENTIAL",
  "DATABASE SET",
  "DATEFIRST",
  "DATEFORMAT",
  "DEADLOCK_PRIORITY",
  "DENY",
  "DENY XML",
  "DISABLE TRIGGER",
  "ENABLE TRIGGER",
  "END CONVERSATION",
  "ENDPOINT",
  "EVENT NOTIFICATION",
  "EVENT SESSION",
  "EXECUTE AS",
  "EXTERNAL DATA SOURCE",
  "EXTERNAL FILE FORMAT",
  "EXTERNAL LANGUAGE",
  "EXTERNAL LIBRARY",
  "EXTERNAL RESOURCE POOL",
  "EXTERNAL TABLE",
  "FIPS_FLAGGER",
  "FMTONLY",
  "FORCEPLAN",
  "FULLTEXT CATALOG",
  "FULLTEXT INDEX",
  "FULLTEXT STOPLIST",
  "GET CONVERSATION GROUP",
  "GET_TRANSMISSION_STATUS",
  "GRANT",
  "GRANT XML",
  "IDENTITY_INSERT",
  "IMPLICIT_TRANSACTIONS",
  "INDEX",
  "LANGUAGE",
  "LOCK_TIMEOUT",
  "LOGIN",
  "MASTER KEY",
  "MESSAGE TYPE",
  "MOVE CONVERSATION",
  "NOCOUNT",
  "NOEXEC",
  "NUMERIC_ROUNDABORT",
  "OFFSETS",
  "OPEN MASTER KEY",
  "OPEN SYMMETRIC KEY",
  "PARSEONLY",
  "PARTITION SCHEME",
  "QUERY_GOVERNOR_COST_LIMIT",
  "QUEUE",
  "QUOTED_IDENTIFIER",
  "RECEIVE",
  "REMOTE SERVICE BINDING",
  "REMOTE_PROC_TRANSACTIONS",
  "RESOURCE GOVERNOR",
  "RESOURCE POOL",
  "RESTORE",
  "RESTORE FILELISTONLY",
  "RESTORE HEADERONLY",
  "RESTORE LABELONLY",
  "RESTORE MASTER KEY",
  "RESTORE REWINDONLY",
  "RESTORE SERVICE MASTER KEY",
  "RESTORE VERIFYONLY",
  "REVERT",
  "REVOKE",
  "REVOKE XML",
  "ROLE",
  "ROUTE",
  "ROWCOUNT",
  "RULE",
  "SCHEMA",
  "SEARCH PROPERTY LIST",
  "SECURITY POLICY",
  "SELECTIVE XML INDEX",
  "SEND",
  "SENSITIVITY CLASSIFICATION",
  "SEQUENCE",
  "SERVER AUDIT",
  "SERVER AUDIT SPECIFICATION",
  "SERVER CONFIGURATION",
  "SERVER ROLE",
  "SERVICE",
  "SERVICE MASTER KEY",
  "SETUSER",
  "SHOWPLAN_ALL",
  "SHOWPLAN_TEXT",
  "SHOWPLAN_XML",
  "SIGNATURE",
  "SPATIAL INDEX",
  "STATISTICS",
  "STATISTICS IO",
  "STATISTICS PROFILE",
  "STATISTICS TIME",
  "STATISTICS XML",
  "SYMMETRIC KEY",
  "SYNONYM",
  "TABLE",
  "TABLE IDENTITY",
  "TEXTSIZE",
  "TRANSACTION ISOLATION LEVEL",
  "TRIGGER",
  "TYPE",
  "UPDATE STATISTICS",
  "USER",
  "WORKLOAD GROUP",
  "XACT_ABORT",
  "XML INDEX",
  "XML SCHEMA COLLECTION"
]), RS = S(["UNION [ALL]", "EXCEPT", "INTERSECT"]), AS = S([
  "JOIN",
  "{LEFT | RIGHT | FULL} [OUTER] JOIN",
  "{INNER | CROSS} JOIN",
  // non-standard joins
  "{CROSS | OUTER} APPLY"
]), tS = S([
  "ON {UPDATE | DELETE} [SET NULL | SET DEFAULT]",
  "{ROWS | RANGE} BETWEEN"
]), SS = S([]), IS = {
  name: "transactsql",
  tokenizerOptions: {
    reservedSelect: TS,
    reservedClauses: [...eS, ...pT, ...yE],
    reservedSetOperations: RS,
    reservedJoins: AS,
    reservedKeywordPhrases: tS,
    reservedDataTypePhrases: SS,
    reservedKeywords: zt,
    reservedDataTypes: ES,
    reservedFunctionNames: jt,
    nestedBlockComments: !0,
    stringTypes: [{ quote: "''-qq", prefixes: ["N"] }, "{}"],
    identTypes: ['""-qq', "[]"],
    identChars: { first: "#@", rest: "#@$" },
    paramTypes: { named: ["@"], quoted: ["@"] },
    operators: [
      "%",
      "&",
      "|",
      "^",
      "~",
      "!<",
      "!>",
      "+=",
      "-=",
      "*=",
      "/=",
      "%=",
      "|=",
      "&=",
      "^=",
      "::",
      ":"
    ],
    propertyAccessOperators: [".."]
    // TODO: Support for money constants
  },
  formatOptions: {
    alwaysDenseOperators: ["::"],
    onelineClauses: [...pT, ...yE],
    tabularOnelineClauses: yE
  }
}, OS = [
  // List of all keywords taken from:
  // https://docs.singlestore.com/managed-service/en/reference/sql-reference/restricted-keywords/list-of-restricted-keywords.html
  // Then filtered down to reserved keywords by running
  // > SELECT * AS <keyword>;
  // for each keyword in that list and observing which of these produce an error.
  "ADD",
  "ALL",
  "ALTER",
  "ANALYZE",
  "AND",
  "AS",
  "ASC",
  "ASENSITIVE",
  "BEFORE",
  "BETWEEN",
  "_BINARY",
  "BOTH",
  "BY",
  "CALL",
  "CASCADE",
  "CASE",
  "CHANGE",
  "CHECK",
  "COLLATE",
  "COLUMN",
  "CONDITION",
  "CONSTRAINT",
  "CONTINUE",
  "CONVERT",
  "CREATE",
  "CROSS",
  "CURRENT_DATE",
  "CURRENT_TIME",
  "CURRENT_TIMESTAMP",
  "CURRENT_USER",
  "CURSOR",
  "DATABASE",
  "DATABASES",
  "DAY_HOUR",
  "DAY_MICROSECOND",
  "DAY_MINUTE",
  "DAY_SECOND",
  "DECLARE",
  "DEFAULT",
  "DELAYED",
  "DELETE",
  "DESC",
  "DESCRIBE",
  "DETERMINISTIC",
  "DISTINCT",
  "DISTINCTROW",
  "DIV",
  "DROP",
  "DUAL",
  "EACH",
  "ELSE",
  "ELSEIF",
  "ENCLOSED",
  "ESCAPED",
  "EXCEPT",
  "EXISTS",
  "EXIT",
  "EXPLAIN",
  "EXTRA_JOIN",
  "FALSE",
  "FETCH",
  "FOR",
  "FORCE",
  "FORCE_COMPILED_MODE",
  "FORCE_INTERPRETER_MODE",
  "FOREIGN",
  "FROM",
  "FULL",
  "FULLTEXT",
  "GRANT",
  "GROUP",
  "HAVING",
  "HEARTBEAT_NO_LOGGING",
  "HIGH_PRIORITY",
  "HOUR_MICROSECOND",
  "HOUR_MINUTE",
  "HOUR_SECOND",
  "IF",
  "IGNORE",
  "IN",
  "INDEX",
  "INFILE",
  "INNER",
  "INOUT",
  "INSENSITIVE",
  "INSERT",
  "IN",
  "_INTERNAL_DYNAMIC_TYPECAST",
  "INTERSECT",
  "INTERVAL",
  "INTO",
  "ITERATE",
  "JOIN",
  "KEY",
  "KEYS",
  "KILL",
  "LEADING",
  "LEAVE",
  "LEFT",
  "LIKE",
  "LIMIT",
  "LINES",
  "LOAD",
  "LOCALTIME",
  "LOCALTIMESTAMP",
  "LOCK",
  "LOOP",
  "LOW_PRIORITY",
  "MATCH",
  "MAXVALUE",
  "MINUS",
  "MINUTE_MICROSECOND",
  "MINUTE_SECOND",
  "MOD",
  "MODIFIES",
  "NATURAL",
  "NO_QUERY_REWRITE",
  "NOT",
  "NO_WRITE_TO_BINLOG",
  "NO_QUERY_REWRITE",
  "NULL",
  "ON",
  "OPTIMIZE",
  "OPTION",
  "OPTIONALLY",
  "OR",
  "ORDER",
  "OUT",
  "OUTER",
  "OUTFILE",
  "OVER",
  "PRIMARY",
  "PROCEDURE",
  "PURGE",
  "RANGE",
  "READ",
  "READS",
  "REFERENCES",
  "REGEXP",
  "RELEASE",
  "RENAME",
  "REPEAT",
  "REPLACE",
  "REQUIRE",
  "RESTRICT",
  "RETURN",
  "REVOKE",
  "RIGHT",
  "RIGHT_ANTI_JOIN",
  "RIGHT_SEMI_JOIN",
  "RIGHT_STRAIGHT_JOIN",
  "RLIKE",
  "SCHEMA",
  "SCHEMAS",
  "SECOND_MICROSECOND",
  "SELECT",
  "SEMI_JOIN",
  "SENSITIVE",
  "SEPARATOR",
  "SET",
  "SHOW",
  "SIGNAL",
  "SPATIAL",
  "SPECIFIC",
  "SQL",
  "SQL_BIG_RESULT",
  "SQL_BUFFER_RESULT",
  "SQL_CACHE",
  "SQL_CALC_FOUND_ROWS",
  "SQLEXCEPTION",
  "SQL_NO_CACHE",
  "SQL_NO_LOGGING",
  "SQL_SMALL_RESULT",
  "SQLSTATE",
  "SQLWARNING",
  "STRAIGHT_JOIN",
  "TABLE",
  "TERMINATED",
  "THEN",
  "TO",
  "TRAILING",
  "TRIGGER",
  "TRUE",
  "UNBOUNDED",
  "UNDO",
  "UNION",
  "UNIQUE",
  "UNLOCK",
  "UPDATE",
  "USAGE",
  "USE",
  "USING",
  "UTC_DATE",
  "UTC_TIME",
  "UTC_TIMESTAMP",
  "_UTF8",
  "VALUES",
  "WHEN",
  "WHERE",
  "WHILE",
  "WINDOW",
  "WITH",
  "WITHIN",
  "WRITE",
  "XOR",
  "YEAR_MONTH",
  "ZEROFILL"
], NS = [
  // https://docs.singlestore.com/cloud/reference/sql-reference/data-types/
  "BIGINT",
  "BINARY",
  "BIT",
  "BLOB",
  "CHAR",
  "CHARACTER",
  "DATETIME",
  "DEC",
  "DECIMAL",
  "DOUBLE PRECISION",
  "DOUBLE",
  "ENUM",
  "FIXED",
  "FLOAT",
  "FLOAT4",
  "FLOAT8",
  "INT",
  "INT1",
  "INT2",
  "INT3",
  "INT4",
  "INT8",
  "INTEGER",
  "LONG",
  "LONGBLOB",
  "LONGTEXT",
  "MEDIUMBLOB",
  "MEDIUMINT",
  "MEDIUMTEXT",
  "MIDDLEINT",
  "NATIONAL CHAR",
  "NATIONAL VARCHAR",
  "NUMERIC",
  "PRECISION",
  "REAL",
  "SMALLINT",
  "TEXT",
  "TIME",
  "TIMESTAMP",
  "TINYBLOB",
  "TINYINT",
  "TINYTEXT",
  "UNSIGNED",
  "VARBINARY",
  "VARCHAR",
  "VARCHARACTER",
  "YEAR"
], sS = [
  // https://docs.singlestore.com/managed-service/en/reference/sql-reference/vector-functions/vector-functions.html
  // https://docs.singlestore.com/managed-service/en/reference/sql-reference/window-functions/window-functions.html
  // https://docs.singlestore.com/managed-service/en/reference/sql-reference/string-functions/string-functions.html
  // https://docs.singlestore.com/managed-service/en/reference/sql-reference/conditional-functions/conditional-functions.html
  // https://docs.singlestore.com/managed-service/en/reference/sql-reference/numeric-functions/numeric-functions.html
  // https://docs.singlestore.com/managed-service/en/reference/sql-reference/geospatial-functions/geospatial-functions.html
  // https://docs.singlestore.com/managed-service/en/reference/sql-reference/json-functions/json-functions.html
  // https://docs.singlestore.com/managed-service/en/reference/sql-reference/information-functions/information-functions.html
  // https://docs.singlestore.com/managed-service/en/reference/sql-reference/aggregate-functions/aggregate-functions.html
  // https://docs.singlestore.com/managed-service/en/reference/sql-reference/time-series-functions/time-series-functions.html
  // https://docs.singlestore.com/managed-service/en/reference/sql-reference/identifier-generation-functions.html
  // https://docs.singlestore.com/managed-service/en/reference/sql-reference/date-and-time-functions/date-and-time-functions.html
  // https://docs.singlestore.com/managed-service/en/reference/sql-reference/distinct-count-estimation-functions.html
  // https://docs.singlestore.com/managed-service/en/reference/sql-reference/full-text-search-functions/full-text-search-functions.html
  // https://docs.singlestore.com/managed-service/en/reference/sql-reference/regular-expression-functions.html
  "ABS",
  "ACOS",
  "ADDDATE",
  "ADDTIME",
  "AES_DECRYPT",
  "AES_ENCRYPT",
  "ANY_VALUE",
  "APPROX_COUNT_DISTINCT",
  "APPROX_COUNT_DISTINCT_ACCUMULATE",
  "APPROX_COUNT_DISTINCT_COMBINE",
  "APPROX_COUNT_DISTINCT_ESTIMATE",
  "APPROX_GEOGRAPHY_INTERSECTS",
  "APPROX_PERCENTILE",
  "ASCII",
  "ASIN",
  "ATAN",
  "ATAN2",
  "AVG",
  "BIN",
  "BINARY",
  "BIT_AND",
  "BIT_COUNT",
  "BIT_OR",
  "BIT_XOR",
  "CAST",
  "CEIL",
  "CEILING",
  "CHAR",
  "CHARACTER_LENGTH",
  "CHAR_LENGTH",
  "CHARSET",
  "COALESCE",
  "COERCIBILITY",
  "COLLATION",
  "COLLECT",
  "CONCAT",
  "CONCAT_WS",
  "CONNECTION_ID",
  "CONV",
  "CONVERT",
  "CONVERT_TZ",
  "COS",
  "COT",
  "COUNT",
  "CUME_DIST",
  "CURDATE",
  "CURRENT_DATE",
  "CURRENT_ROLE",
  "CURRENT_TIME",
  "CURRENT_TIMESTAMP",
  "CURRENT_USER",
  "CURTIME",
  "DATABASE",
  "DATE",
  "DATE_ADD",
  "DATEDIFF",
  "DATE_FORMAT",
  "DATE_SUB",
  "DATE_TRUNC",
  "DAY",
  "DAYNAME",
  "DAYOFMONTH",
  "DAYOFWEEK",
  "DAYOFYEAR",
  "DECODE",
  "DEFAULT",
  "DEGREES",
  "DENSE_RANK",
  "DIV",
  "DOT_PRODUCT",
  "ELT",
  "EUCLIDEAN_DISTANCE",
  "EXP",
  "EXTRACT",
  "FIELD",
  "FIRST",
  "FIRST_VALUE",
  "FLOOR",
  "FORMAT",
  "FOUND_ROWS",
  "FROM_BASE64",
  "FROM_DAYS",
  "FROM_UNIXTIME",
  "GEOGRAPHY_AREA",
  "GEOGRAPHY_CONTAINS",
  "GEOGRAPHY_DISTANCE",
  "GEOGRAPHY_INTERSECTS",
  "GEOGRAPHY_LATITUDE",
  "GEOGRAPHY_LENGTH",
  "GEOGRAPHY_LONGITUDE",
  "GEOGRAPHY_POINT",
  "GEOGRAPHY_WITHIN_DISTANCE",
  "GEOMETRY_AREA",
  "GEOMETRY_CONTAINS",
  "GEOMETRY_DISTANCE",
  "GEOMETRY_FILTER",
  "GEOMETRY_INTERSECTS",
  "GEOMETRY_LENGTH",
  "GEOMETRY_POINT",
  "GEOMETRY_WITHIN_DISTANCE",
  "GEOMETRY_X",
  "GEOMETRY_Y",
  "GREATEST",
  "GROUPING",
  "GROUP_CONCAT",
  "HEX",
  "HIGHLIGHT",
  "HOUR",
  "ICU_VERSION",
  "IF",
  "IFNULL",
  "INET_ATON",
  "INET_NTOA",
  "INET6_ATON",
  "INET6_NTOA",
  "INITCAP",
  "INSERT",
  "INSTR",
  "INTERVAL",
  "IS",
  "IS NULL",
  "JSON_AGG",
  "JSON_ARRAY_CONTAINS_DOUBLE",
  "JSON_ARRAY_CONTAINS_JSON",
  "JSON_ARRAY_CONTAINS_STRING",
  "JSON_ARRAY_PUSH_DOUBLE",
  "JSON_ARRAY_PUSH_JSON",
  "JSON_ARRAY_PUSH_STRING",
  "JSON_DELETE_KEY",
  "JSON_EXTRACT_DOUBLE",
  "JSON_EXTRACT_JSON",
  "JSON_EXTRACT_STRING",
  "JSON_EXTRACT_BIGINT",
  "JSON_GET_TYPE",
  "JSON_LENGTH",
  "JSON_SET_DOUBLE",
  "JSON_SET_JSON",
  "JSON_SET_STRING",
  "JSON_SPLICE_DOUBLE",
  "JSON_SPLICE_JSON",
  "JSON_SPLICE_STRING",
  "LAG",
  "LAST_DAY",
  "LAST_VALUE",
  "LCASE",
  "LEAD",
  "LEAST",
  "LEFT",
  "LENGTH",
  "LIKE",
  "LN",
  "LOCALTIME",
  "LOCALTIMESTAMP",
  "LOCATE",
  "LOG",
  "LOG10",
  "LOG2",
  "LPAD",
  "LTRIM",
  "MATCH",
  "MAX",
  "MD5",
  "MEDIAN",
  "MICROSECOND",
  "MIN",
  "MINUTE",
  "MOD",
  "MONTH",
  "MONTHNAME",
  "MONTHS_BETWEEN",
  "NOT",
  "NOW",
  "NTH_VALUE",
  "NTILE",
  "NULLIF",
  "OCTET_LENGTH",
  "PERCENT_RANK",
  "PERCENTILE_CONT",
  "PERCENTILE_DISC",
  "PI",
  "PIVOT",
  "POSITION",
  "POW",
  "POWER",
  "QUARTER",
  "QUOTE",
  "RADIANS",
  "RAND",
  "RANK",
  "REGEXP",
  "REPEAT",
  "REPLACE",
  "REVERSE",
  "RIGHT",
  "RLIKE",
  "ROUND",
  "ROW_COUNT",
  "ROW_NUMBER",
  "RPAD",
  "RTRIM",
  "SCALAR",
  "SCHEMA",
  "SEC_TO_TIME",
  "SHA1",
  "SHA2",
  "SIGMOID",
  "SIGN",
  "SIN",
  "SLEEP",
  "SPLIT",
  "SOUNDEX",
  "SOUNDS LIKE",
  "SOURCE_POS_WAIT",
  "SPACE",
  "SQRT",
  "STDDEV",
  "STDDEV_POP",
  "STDDEV_SAMP",
  "STR_TO_DATE",
  "SUBDATE",
  "SUBSTR",
  "SUBSTRING",
  "SUBSTRING_INDEX",
  "SUM",
  "SYS_GUID",
  "TAN",
  "TIME",
  "TIMEDIFF",
  "TIME_BUCKET",
  "TIME_FORMAT",
  "TIMESTAMP",
  "TIMESTAMPADD",
  "TIMESTAMPDIFF",
  "TIME_TO_SEC",
  "TO_BASE64",
  "TO_CHAR",
  "TO_DAYS",
  "TO_JSON",
  "TO_NUMBER",
  "TO_SECONDS",
  "TO_TIMESTAMP",
  "TRIM",
  "TRUNC",
  "TRUNCATE",
  "UCASE",
  "UNHEX",
  "UNIX_TIMESTAMP",
  "UPDATEXML",
  "UPPER",
  // 'USER',
  "UTC_DATE",
  "UTC_TIME",
  "UTC_TIMESTAMP",
  "UUID",
  "VALUES",
  "VARIANCE",
  "VAR_POP",
  "VAR_SAMP",
  "VECTOR_SUB",
  "VERSION",
  "WEEK",
  "WEEKDAY",
  "WEEKOFYEAR",
  "YEAR"
], rS = S(["SELECT [ALL | DISTINCT | DISTINCTROW]"]), nS = S([
  // queries
  "WITH",
  "FROM",
  "WHERE",
  "GROUP BY",
  "HAVING",
  "PARTITION BY",
  "ORDER BY",
  "LIMIT",
  "OFFSET",
  // Data manipulation
  // - insert:
  "INSERT [IGNORE] [INTO]",
  "VALUES",
  "REPLACE [INTO]",
  "ON DUPLICATE KEY UPDATE",
  // - update:
  "SET",
  // Data definition
  "CREATE [OR REPLACE] [TEMPORARY] PROCEDURE [IF NOT EXISTS]",
  "CREATE [OR REPLACE] [EXTERNAL] FUNCTION"
]), GT = S([
  "CREATE [ROWSTORE] [REFERENCE | TEMPORARY | GLOBAL TEMPORARY] TABLE [IF NOT EXISTS]"
]), VE = S([
  // - create:
  "CREATE VIEW",
  // - update:
  "UPDATE",
  // - delete:
  "DELETE [FROM]",
  // - drop table:
  "DROP [TEMPORARY] TABLE [IF EXISTS]",
  // - alter table:
  "ALTER [ONLINE] TABLE",
  "ADD [COLUMN]",
  "ADD [UNIQUE] {INDEX | KEY}",
  "DROP [COLUMN]",
  "MODIFY [COLUMN]",
  "CHANGE",
  "RENAME [TO | AS]",
  // - truncate:
  "TRUNCATE [TABLE]",
  // https://docs.singlestore.com/managed-service/en/reference/sql-reference.html
  "ADD AGGREGATOR",
  "ADD LEAF",
  "AGGREGATOR SET AS MASTER",
  "ALTER DATABASE",
  "ALTER PIPELINE",
  "ALTER RESOURCE POOL",
  "ALTER USER",
  "ALTER VIEW",
  "ANALYZE TABLE",
  "ATTACH DATABASE",
  "ATTACH LEAF",
  "ATTACH LEAF ALL",
  "BACKUP DATABASE",
  "BINLOG",
  "BOOTSTRAP AGGREGATOR",
  "CACHE INDEX",
  "CALL",
  "CHANGE",
  "CHANGE MASTER TO",
  "CHANGE REPLICATION FILTER",
  "CHANGE REPLICATION SOURCE TO",
  "CHECK BLOB CHECKSUM",
  "CHECK TABLE",
  "CHECKSUM TABLE",
  "CLEAR ORPHAN DATABASES",
  "CLONE",
  "COMMIT",
  "CREATE DATABASE",
  "CREATE GROUP",
  "CREATE INDEX",
  "CREATE LINK",
  "CREATE MILESTONE",
  "CREATE PIPELINE",
  "CREATE RESOURCE POOL",
  "CREATE ROLE",
  "CREATE USER",
  "DEALLOCATE PREPARE",
  "DESCRIBE",
  "DETACH DATABASE",
  "DETACH PIPELINE",
  "DROP DATABASE",
  "DROP FUNCTION",
  "DROP INDEX",
  "DROP LINK",
  "DROP PIPELINE",
  "DROP PROCEDURE",
  "DROP RESOURCE POOL",
  "DROP ROLE",
  "DROP USER",
  "DROP VIEW",
  "EXECUTE",
  "EXPLAIN",
  "FLUSH",
  "FORCE",
  "GRANT",
  "HANDLER",
  "HELP",
  "KILL CONNECTION",
  "KILLALL QUERIES",
  "LOAD DATA",
  "LOAD INDEX INTO CACHE",
  "LOAD XML",
  "LOCK INSTANCE FOR BACKUP",
  "LOCK TABLES",
  "MASTER_POS_WAIT",
  "OPTIMIZE TABLE",
  "PREPARE",
  "PURGE BINARY LOGS",
  "REBALANCE PARTITIONS",
  "RELEASE SAVEPOINT",
  "REMOVE AGGREGATOR",
  "REMOVE LEAF",
  "REPAIR TABLE",
  "REPLACE",
  "REPLICATE DATABASE",
  "RESET",
  "RESET MASTER",
  "RESET PERSIST",
  "RESET REPLICA",
  "RESET SLAVE",
  "RESTART",
  "RESTORE DATABASE",
  "RESTORE REDUNDANCY",
  "REVOKE",
  "ROLLBACK",
  "ROLLBACK TO SAVEPOINT",
  "SAVEPOINT",
  "SET CHARACTER SET",
  "SET DEFAULT ROLE",
  "SET NAMES",
  "SET PASSWORD",
  "SET RESOURCE GROUP",
  "SET ROLE",
  "SET TRANSACTION",
  "SHOW",
  "SHOW CHARACTER SET",
  "SHOW COLLATION",
  "SHOW COLUMNS",
  "SHOW CREATE DATABASE",
  "SHOW CREATE FUNCTION",
  "SHOW CREATE PIPELINE",
  "SHOW CREATE PROCEDURE",
  "SHOW CREATE TABLE",
  "SHOW CREATE USER",
  "SHOW CREATE VIEW",
  "SHOW DATABASES",
  "SHOW ENGINE",
  "SHOW ENGINES",
  "SHOW ERRORS",
  "SHOW FUNCTION CODE",
  "SHOW FUNCTION STATUS",
  "SHOW GRANTS",
  "SHOW INDEX",
  "SHOW MASTER STATUS",
  "SHOW OPEN TABLES",
  "SHOW PLUGINS",
  "SHOW PRIVILEGES",
  "SHOW PROCEDURE CODE",
  "SHOW PROCEDURE STATUS",
  "SHOW PROCESSLIST",
  "SHOW PROFILE",
  "SHOW PROFILES",
  "SHOW RELAYLOG EVENTS",
  "SHOW REPLICA STATUS",
  "SHOW REPLICAS",
  "SHOW SLAVE",
  "SHOW SLAVE HOSTS",
  "SHOW STATUS",
  "SHOW TABLE STATUS",
  "SHOW TABLES",
  "SHOW VARIABLES",
  "SHOW WARNINGS",
  "SHUTDOWN",
  "SNAPSHOT DATABASE",
  "SOURCE_POS_WAIT",
  "START GROUP_REPLICATION",
  "START PIPELINE",
  "START REPLICA",
  "START SLAVE",
  "START TRANSACTION",
  "STOP GROUP_REPLICATION",
  "STOP PIPELINE",
  "STOP REPLICA",
  "STOP REPLICATING",
  "STOP SLAVE",
  "TEST PIPELINE",
  "UNLOCK INSTANCE",
  "UNLOCK TABLES",
  "USE",
  "XA",
  // flow control
  "ITERATE",
  "LEAVE",
  "LOOP",
  "REPEAT",
  "RETURN",
  "WHILE"
]), aS = S([
  "UNION [ALL | DISTINCT]",
  "EXCEPT",
  "INTERSECT",
  "MINUS"
]), CS = S([
  "JOIN",
  "{LEFT | RIGHT | FULL} [OUTER] JOIN",
  "{INNER | CROSS} JOIN",
  "NATURAL {LEFT | RIGHT} [OUTER] JOIN",
  // non-standard joins
  "STRAIGHT_JOIN"
]), LS = S([
  "ON DELETE",
  "ON UPDATE",
  "CHARACTER SET",
  "{ROWS | RANGE} BETWEEN",
  "IDENTIFIED BY"
]), oS = S([]), iS = {
  name: "singlestoredb",
  tokenizerOptions: {
    reservedSelect: rS,
    reservedClauses: [...nS, ...GT, ...VE],
    reservedSetOperations: aS,
    reservedJoins: CS,
    reservedKeywordPhrases: LS,
    reservedDataTypePhrases: oS,
    reservedKeywords: OS,
    reservedDataTypes: NS,
    reservedFunctionNames: sS,
    // TODO: support _binary"some string" prefix
    stringTypes: [
      '""-qq-bs',
      "''-qq-bs",
      { quote: "''-raw", prefixes: ["B", "X"], requirePrefix: !0 }
    ],
    identTypes: ["``"],
    identChars: { first: "$", rest: "$", allowFirstCharNumber: !0 },
    variableTypes: [
      { regex: "@@?[A-Za-z0-9_$]+" },
      { quote: "``", prefixes: ["@"], requirePrefix: !0 }
    ],
    lineCommentTypes: ["--", "#"],
    operators: [
      ":=",
      "&",
      "|",
      "^",
      "~",
      "<<",
      ">>",
      "<=>",
      "&&",
      "||",
      "::",
      "::$",
      "::%",
      ":>",
      "!:>",
      "*.*"
      // Not actually an operator
    ],
    postProcess: oE
  },
  formatOptions: {
    alwaysDenseOperators: ["::", "::$", "::%"],
    onelineClauses: [...GT, ...VE],
    tabularOnelineClauses: VE
  }
}, _S = [
  // https://docs.snowflake.com/en/sql-reference-functions.html
  //
  // https://docs.snowflake.com/en/sql-reference/functions-all.html
  // 1. run in console on this page: $x('//tbody/tr/*[1]//a/span/text()').map(x => x.nodeValue)
  // 2. split all lines that contain ',' or '/' into multiple lines
  // 3. remove all '— Deprecated' parts from the strings
  // 4. delete all strings that end with '<object_type>', they are already covered in the list
  // 5. remove all strings that contain '[', they are operators not functions
  // 6. fix all values that contain '*'
  // 7. delete operatos ':', '::', '||'
  //
  // Steps 1-5 can be combined by the following script in the developer console:
  // $x('//tbody/tr/*[1]//a/span/text()').map(x => x.nodeValue) // Step 1
  //   .map(x => x.split(x.includes(',') ? ',' : '/')).flat().map(x => x.trim()) // Step 2
  //   .map(x => x.replace('— Deprecated', '')) // Step 3
  //   .filter(x => !x.endsWith('<object_type>')) // Step 4
  //   .filter(x => !x.includes('[')) // Step 5
  "ABS",
  "ACOS",
  "ACOSH",
  "ADD_MONTHS",
  "ALL_USER_NAMES",
  "ANY_VALUE",
  "APPROX_COUNT_DISTINCT",
  "APPROX_PERCENTILE",
  "APPROX_PERCENTILE_ACCUMULATE",
  "APPROX_PERCENTILE_COMBINE",
  "APPROX_PERCENTILE_ESTIMATE",
  "APPROX_TOP_K",
  "APPROX_TOP_K_ACCUMULATE",
  "APPROX_TOP_K_COMBINE",
  "APPROX_TOP_K_ESTIMATE",
  "APPROXIMATE_JACCARD_INDEX",
  "APPROXIMATE_SIMILARITY",
  "ARRAY_AGG",
  "ARRAY_APPEND",
  "ARRAY_CAT",
  "ARRAY_COMPACT",
  "ARRAY_CONSTRUCT",
  "ARRAY_CONSTRUCT_COMPACT",
  "ARRAY_CONTAINS",
  "ARRAY_INSERT",
  "ARRAY_INTERSECTION",
  "ARRAY_POSITION",
  "ARRAY_PREPEND",
  "ARRAY_SIZE",
  "ARRAY_SLICE",
  "ARRAY_TO_STRING",
  "ARRAY_UNION_AGG",
  "ARRAY_UNIQUE_AGG",
  "ARRAYS_OVERLAP",
  "AS_ARRAY",
  "AS_BINARY",
  "AS_BOOLEAN",
  "AS_CHAR",
  "AS_VARCHAR",
  "AS_DATE",
  "AS_DECIMAL",
  "AS_NUMBER",
  "AS_DOUBLE",
  "AS_REAL",
  "AS_INTEGER",
  "AS_OBJECT",
  "AS_TIME",
  "AS_TIMESTAMP_LTZ",
  "AS_TIMESTAMP_NTZ",
  "AS_TIMESTAMP_TZ",
  "ASCII",
  "ASIN",
  "ASINH",
  "ATAN",
  "ATAN2",
  "ATANH",
  "AUTO_REFRESH_REGISTRATION_HISTORY",
  "AUTOMATIC_CLUSTERING_HISTORY",
  "AVG",
  "BASE64_DECODE_BINARY",
  "BASE64_DECODE_STRING",
  "BASE64_ENCODE",
  "BIT_LENGTH",
  "BITAND",
  "BITAND_AGG",
  "BITMAP_BIT_POSITION",
  "BITMAP_BUCKET_NUMBER",
  "BITMAP_CONSTRUCT_AGG",
  "BITMAP_COUNT",
  "BITMAP_OR_AGG",
  "BITNOT",
  "BITOR",
  "BITOR_AGG",
  "BITSHIFTLEFT",
  "BITSHIFTRIGHT",
  "BITXOR",
  "BITXOR_AGG",
  "BOOLAND",
  "BOOLAND_AGG",
  "BOOLNOT",
  "BOOLOR",
  "BOOLOR_AGG",
  "BOOLXOR",
  "BOOLXOR_AGG",
  "BUILD_SCOPED_FILE_URL",
  "BUILD_STAGE_FILE_URL",
  "CASE",
  "CAST",
  "CBRT",
  "CEIL",
  "CHARINDEX",
  "CHECK_JSON",
  "CHECK_XML",
  "CHR",
  "CHAR",
  "COALESCE",
  "COLLATE",
  "COLLATION",
  "COMPLETE_TASK_GRAPHS",
  "COMPRESS",
  "CONCAT",
  "CONCAT_WS",
  "CONDITIONAL_CHANGE_EVENT",
  "CONDITIONAL_TRUE_EVENT",
  "CONTAINS",
  "CONVERT_TIMEZONE",
  "COPY_HISTORY",
  "CORR",
  "COS",
  "COSH",
  "COT",
  "COUNT",
  "COUNT_IF",
  "COVAR_POP",
  "COVAR_SAMP",
  "CUME_DIST",
  "CURRENT_ACCOUNT",
  "CURRENT_AVAILABLE_ROLES",
  "CURRENT_CLIENT",
  "CURRENT_DATABASE",
  "CURRENT_DATE",
  "CURRENT_IP_ADDRESS",
  "CURRENT_REGION",
  "CURRENT_ROLE",
  "CURRENT_SCHEMA",
  "CURRENT_SCHEMAS",
  "CURRENT_SECONDARY_ROLES",
  "CURRENT_SESSION",
  "CURRENT_STATEMENT",
  "CURRENT_TASK_GRAPHS",
  "CURRENT_TIME",
  "CURRENT_TIMESTAMP",
  "CURRENT_TRANSACTION",
  "CURRENT_USER",
  "CURRENT_VERSION",
  "CURRENT_WAREHOUSE",
  "DATA_TRANSFER_HISTORY",
  "DATABASE_REFRESH_HISTORY",
  "DATABASE_REFRESH_PROGRESS",
  "DATABASE_REFRESH_PROGRESS_BY_JOB",
  "DATABASE_STORAGE_USAGE_HISTORY",
  "DATE_FROM_PARTS",
  "DATE_PART",
  "DATE_TRUNC",
  "DATEADD",
  "DATEDIFF",
  "DAYNAME",
  "DECODE",
  "DECOMPRESS_BINARY",
  "DECOMPRESS_STRING",
  "DECRYPT",
  "DECRYPT_RAW",
  "DEGREES",
  "DENSE_RANK",
  "DIV0",
  "EDITDISTANCE",
  "ENCRYPT",
  "ENCRYPT_RAW",
  "ENDSWITH",
  "EQUAL_NULL",
  "EXP",
  "EXPLAIN_JSON",
  "EXTERNAL_FUNCTIONS_HISTORY",
  "EXTERNAL_TABLE_FILES",
  "EXTERNAL_TABLE_FILE_REGISTRATION_HISTORY",
  "EXTRACT",
  "EXTRACT_SEMANTIC_CATEGORIES",
  "FACTORIAL",
  "FILTER",
  "FIRST_VALUE",
  "FLATTEN",
  "FLOOR",
  "GENERATE_COLUMN_DESCRIPTION",
  "GENERATOR",
  "GET",
  "GET_ABSOLUTE_PATH",
  "GET_DDL",
  "GET_IGNORE_CASE",
  "GET_OBJECT_REFERENCES",
  "GET_PATH",
  "GET_PRESIGNED_URL",
  "GET_RELATIVE_PATH",
  "GET_STAGE_LOCATION",
  "GETBIT",
  "GREATEST",
  "GREATEST_IGNORE_NULLS",
  "GROUPING",
  "GROUPING_ID",
  "HASH",
  "HASH_AGG",
  "HAVERSINE",
  "HEX_DECODE_BINARY",
  "HEX_DECODE_STRING",
  "HEX_ENCODE",
  "HLL",
  "HLL_ACCUMULATE",
  "HLL_COMBINE",
  "HLL_ESTIMATE",
  "HLL_EXPORT",
  "HLL_IMPORT",
  "HOUR",
  "MINUTE",
  "SECOND",
  "IDENTIFIER",
  "IFF",
  "IFNULL",
  "ILIKE",
  "ILIKE ANY",
  "INFER_SCHEMA",
  "INITCAP",
  "INSERT",
  "INVOKER_ROLE",
  "INVOKER_SHARE",
  "IS_ARRAY",
  "IS_BINARY",
  "IS_BOOLEAN",
  "IS_CHAR",
  "IS_VARCHAR",
  "IS_DATE",
  "IS_DATE_VALUE",
  "IS_DECIMAL",
  "IS_DOUBLE",
  "IS_REAL",
  "IS_GRANTED_TO_INVOKER_ROLE",
  "IS_INTEGER",
  "IS_NULL_VALUE",
  "IS_OBJECT",
  "IS_ROLE_IN_SESSION",
  "IS_TIME",
  "IS_TIMESTAMP_LTZ",
  "IS_TIMESTAMP_NTZ",
  "IS_TIMESTAMP_TZ",
  "JAROWINKLER_SIMILARITY",
  "JSON_EXTRACT_PATH_TEXT",
  "KURTOSIS",
  "LAG",
  "LAST_DAY",
  "LAST_QUERY_ID",
  "LAST_TRANSACTION",
  "LAST_VALUE",
  "LEAD",
  "LEAST",
  "LEFT",
  "LENGTH",
  "LEN",
  "LIKE",
  "LIKE ALL",
  "LIKE ANY",
  "LISTAGG",
  "LN",
  "LOCALTIME",
  "LOCALTIMESTAMP",
  "LOG",
  "LOGIN_HISTORY",
  "LOGIN_HISTORY_BY_USER",
  "LOWER",
  "LPAD",
  "LTRIM",
  "MATERIALIZED_VIEW_REFRESH_HISTORY",
  "MD5",
  "MD5_HEX",
  "MD5_BINARY",
  "MD5_NUMBER — Obsoleted",
  "MD5_NUMBER_LOWER64",
  "MD5_NUMBER_UPPER64",
  "MEDIAN",
  "MIN",
  "MAX",
  "MINHASH",
  "MINHASH_COMBINE",
  "MOD",
  "MODE",
  "MONTHNAME",
  "MONTHS_BETWEEN",
  "NEXT_DAY",
  "NORMAL",
  "NTH_VALUE",
  "NTILE",
  "NULLIF",
  "NULLIFZERO",
  "NVL",
  "NVL2",
  "OBJECT_AGG",
  "OBJECT_CONSTRUCT",
  "OBJECT_CONSTRUCT_KEEP_NULL",
  "OBJECT_DELETE",
  "OBJECT_INSERT",
  "OBJECT_KEYS",
  "OBJECT_PICK",
  "OCTET_LENGTH",
  "PARSE_IP",
  "PARSE_JSON",
  "PARSE_URL",
  "PARSE_XML",
  "PERCENT_RANK",
  "PERCENTILE_CONT",
  "PERCENTILE_DISC",
  "PI",
  "PIPE_USAGE_HISTORY",
  "POLICY_CONTEXT",
  "POLICY_REFERENCES",
  "POSITION",
  "POW",
  "POWER",
  "PREVIOUS_DAY",
  "QUERY_ACCELERATION_HISTORY",
  "QUERY_HISTORY",
  "QUERY_HISTORY_BY_SESSION",
  "QUERY_HISTORY_BY_USER",
  "QUERY_HISTORY_BY_WAREHOUSE",
  "RADIANS",
  "RANDOM",
  "RANDSTR",
  "RANK",
  "RATIO_TO_REPORT",
  "REGEXP",
  "REGEXP_COUNT",
  "REGEXP_INSTR",
  "REGEXP_LIKE",
  "REGEXP_REPLACE",
  "REGEXP_SUBSTR",
  "REGEXP_SUBSTR_ALL",
  "REGR_AVGX",
  "REGR_AVGY",
  "REGR_COUNT",
  "REGR_INTERCEPT",
  "REGR_R2",
  "REGR_SLOPE",
  "REGR_SXX",
  "REGR_SXY",
  "REGR_SYY",
  "REGR_VALX",
  "REGR_VALY",
  "REPEAT",
  "REPLACE",
  "REPLICATION_GROUP_REFRESH_HISTORY",
  "REPLICATION_GROUP_REFRESH_PROGRESS",
  "REPLICATION_GROUP_REFRESH_PROGRESS_BY_JOB",
  "REPLICATION_GROUP_USAGE_HISTORY",
  "REPLICATION_USAGE_HISTORY",
  "REST_EVENT_HISTORY",
  "RESULT_SCAN",
  "REVERSE",
  "RIGHT",
  "RLIKE",
  "ROUND",
  "ROW_NUMBER",
  "RPAD",
  "RTRIM",
  "RTRIMMED_LENGTH",
  "SEARCH_OPTIMIZATION_HISTORY",
  "SEQ1",
  "SEQ2",
  "SEQ4",
  "SEQ8",
  "SERVERLESS_TASK_HISTORY",
  "SHA1",
  "SHA1_HEX",
  "SHA1_BINARY",
  "SHA2",
  "SHA2_HEX",
  "SHA2_BINARY",
  "SIGN",
  "SIN",
  "SINH",
  "SKEW",
  "SOUNDEX",
  "SPACE",
  "SPLIT",
  "SPLIT_PART",
  "SPLIT_TO_TABLE",
  "SQRT",
  "SQUARE",
  "ST_AREA",
  "ST_ASEWKB",
  "ST_ASEWKT",
  "ST_ASGEOJSON",
  "ST_ASWKB",
  "ST_ASBINARY",
  "ST_ASWKT",
  "ST_ASTEXT",
  "ST_AZIMUTH",
  "ST_CENTROID",
  "ST_COLLECT",
  "ST_CONTAINS",
  "ST_COVEREDBY",
  "ST_COVERS",
  "ST_DIFFERENCE",
  "ST_DIMENSION",
  "ST_DISJOINT",
  "ST_DISTANCE",
  "ST_DWITHIN",
  "ST_ENDPOINT",
  "ST_ENVELOPE",
  "ST_GEOGFROMGEOHASH",
  "ST_GEOGPOINTFROMGEOHASH",
  "ST_GEOGRAPHYFROMWKB",
  "ST_GEOGRAPHYFROMWKT",
  "ST_GEOHASH",
  "ST_GEOMETRYFROMWKB",
  "ST_GEOMETRYFROMWKT",
  "ST_HAUSDORFFDISTANCE",
  "ST_INTERSECTION",
  "ST_INTERSECTS",
  "ST_LENGTH",
  "ST_MAKEGEOMPOINT",
  "ST_GEOM_POINT",
  "ST_MAKELINE",
  "ST_MAKEPOINT",
  "ST_POINT",
  "ST_MAKEPOLYGON",
  "ST_POLYGON",
  "ST_NPOINTS",
  "ST_NUMPOINTS",
  "ST_PERIMETER",
  "ST_POINTN",
  "ST_SETSRID",
  "ST_SIMPLIFY",
  "ST_SRID",
  "ST_STARTPOINT",
  "ST_SYMDIFFERENCE",
  "ST_UNION",
  "ST_WITHIN",
  "ST_X",
  "ST_XMAX",
  "ST_XMIN",
  "ST_Y",
  "ST_YMAX",
  "ST_YMIN",
  "STAGE_DIRECTORY_FILE_REGISTRATION_HISTORY",
  "STAGE_STORAGE_USAGE_HISTORY",
  "STARTSWITH",
  "STDDEV",
  "STDDEV_POP",
  "STDDEV_SAMP",
  "STRIP_NULL_VALUE",
  "STRTOK",
  "STRTOK_SPLIT_TO_TABLE",
  "STRTOK_TO_ARRAY",
  "SUBSTR",
  "SUBSTRING",
  "SUM",
  "SYSDATE",
  "SYSTEM$ABORT_SESSION",
  "SYSTEM$ABORT_TRANSACTION",
  "SYSTEM$AUTHORIZE_PRIVATELINK",
  "SYSTEM$AUTHORIZE_STAGE_PRIVATELINK_ACCESS",
  "SYSTEM$BEHAVIOR_CHANGE_BUNDLE_STATUS",
  "SYSTEM$CANCEL_ALL_QUERIES",
  "SYSTEM$CANCEL_QUERY",
  "SYSTEM$CLUSTERING_DEPTH",
  "SYSTEM$CLUSTERING_INFORMATION",
  "SYSTEM$CLUSTERING_RATIO ",
  "SYSTEM$CURRENT_USER_TASK_NAME",
  "SYSTEM$DATABASE_REFRESH_HISTORY ",
  "SYSTEM$DATABASE_REFRESH_PROGRESS",
  "SYSTEM$DATABASE_REFRESH_PROGRESS_BY_JOB ",
  "SYSTEM$DISABLE_BEHAVIOR_CHANGE_BUNDLE",
  "SYSTEM$DISABLE_DATABASE_REPLICATION",
  "SYSTEM$ENABLE_BEHAVIOR_CHANGE_BUNDLE",
  "SYSTEM$ESTIMATE_QUERY_ACCELERATION",
  "SYSTEM$ESTIMATE_SEARCH_OPTIMIZATION_COSTS",
  "SYSTEM$EXPLAIN_JSON_TO_TEXT",
  "SYSTEM$EXPLAIN_PLAN_JSON",
  "SYSTEM$EXTERNAL_TABLE_PIPE_STATUS",
  "SYSTEM$GENERATE_SAML_CSR",
  "SYSTEM$GENERATE_SCIM_ACCESS_TOKEN",
  "SYSTEM$GET_AWS_SNS_IAM_POLICY",
  "SYSTEM$GET_PREDECESSOR_RETURN_VALUE",
  "SYSTEM$GET_PRIVATELINK",
  "SYSTEM$GET_PRIVATELINK_AUTHORIZED_ENDPOINTS",
  "SYSTEM$GET_PRIVATELINK_CONFIG",
  "SYSTEM$GET_SNOWFLAKE_PLATFORM_INFO",
  "SYSTEM$GET_TAG",
  "SYSTEM$GET_TAG_ALLOWED_VALUES",
  "SYSTEM$GET_TAG_ON_CURRENT_COLUMN",
  "SYSTEM$GET_TAG_ON_CURRENT_TABLE",
  "SYSTEM$GLOBAL_ACCOUNT_SET_PARAMETER",
  "SYSTEM$LAST_CHANGE_COMMIT_TIME",
  "SYSTEM$LINK_ACCOUNT_OBJECTS_BY_NAME",
  "SYSTEM$MIGRATE_SAML_IDP_REGISTRATION",
  "SYSTEM$PIPE_FORCE_RESUME",
  "SYSTEM$PIPE_STATUS",
  "SYSTEM$REVOKE_PRIVATELINK",
  "SYSTEM$REVOKE_STAGE_PRIVATELINK_ACCESS",
  "SYSTEM$SET_RETURN_VALUE",
  "SYSTEM$SHOW_OAUTH_CLIENT_SECRETS",
  "SYSTEM$STREAM_GET_TABLE_TIMESTAMP",
  "SYSTEM$STREAM_HAS_DATA",
  "SYSTEM$TASK_DEPENDENTS_ENABLE",
  "SYSTEM$TYPEOF",
  "SYSTEM$USER_TASK_CANCEL_ONGOING_EXECUTIONS",
  "SYSTEM$VERIFY_EXTERNAL_OAUTH_TOKEN",
  "SYSTEM$WAIT",
  "SYSTEM$WHITELIST",
  "SYSTEM$WHITELIST_PRIVATELINK",
  "TAG_REFERENCES",
  "TAG_REFERENCES_ALL_COLUMNS",
  "TAG_REFERENCES_WITH_LINEAGE",
  "TAN",
  "TANH",
  "TASK_DEPENDENTS",
  "TASK_HISTORY",
  "TIME_FROM_PARTS",
  "TIME_SLICE",
  "TIMEADD",
  "TIMEDIFF",
  "TIMESTAMP_FROM_PARTS",
  "TIMESTAMPADD",
  "TIMESTAMPDIFF",
  "TO_ARRAY",
  "TO_BINARY",
  "TO_BOOLEAN",
  "TO_CHAR",
  "TO_VARCHAR",
  "TO_DATE",
  "DATE",
  "TO_DECIMAL",
  "TO_NUMBER",
  "TO_NUMERIC",
  "TO_DOUBLE",
  "TO_GEOGRAPHY",
  "TO_GEOMETRY",
  "TO_JSON",
  "TO_OBJECT",
  "TO_TIME",
  "TIME",
  "TO_TIMESTAMP",
  "TO_TIMESTAMP_LTZ",
  "TO_TIMESTAMP_NTZ",
  "TO_TIMESTAMP_TZ",
  "TO_VARIANT",
  "TO_XML",
  "TRANSLATE",
  "TRIM",
  "TRUNCATE",
  "TRUNC",
  "TRUNC",
  "TRY_BASE64_DECODE_BINARY",
  "TRY_BASE64_DECODE_STRING",
  "TRY_CAST",
  "TRY_HEX_DECODE_BINARY",
  "TRY_HEX_DECODE_STRING",
  "TRY_PARSE_JSON",
  "TRY_TO_BINARY",
  "TRY_TO_BOOLEAN",
  "TRY_TO_DATE",
  "TRY_TO_DECIMAL",
  "TRY_TO_NUMBER",
  "TRY_TO_NUMERIC",
  "TRY_TO_DOUBLE",
  "TRY_TO_GEOGRAPHY",
  "TRY_TO_GEOMETRY",
  "TRY_TO_TIME",
  "TRY_TO_TIMESTAMP",
  "TRY_TO_TIMESTAMP_LTZ",
  "TRY_TO_TIMESTAMP_NTZ",
  "TRY_TO_TIMESTAMP_TZ",
  "TYPEOF",
  "UNICODE",
  "UNIFORM",
  "UPPER",
  "UUID_STRING",
  "VALIDATE",
  "VALIDATE_PIPE_LOAD",
  "VAR_POP",
  "VAR_SAMP",
  "VARIANCE",
  "VARIANCE_SAMP",
  "VARIANCE_POP",
  "WAREHOUSE_LOAD_HISTORY",
  "WAREHOUSE_METERING_HISTORY",
  "WIDTH_BUCKET",
  "XMLGET",
  "YEAR",
  "YEAROFWEEK",
  "YEAROFWEEKISO",
  "DAY",
  "DAYOFMONTH",
  "DAYOFWEEK",
  "DAYOFWEEKISO",
  "DAYOFYEAR",
  "WEEK",
  "WEEK",
  "WEEKOFYEAR",
  "WEEKISO",
  "MONTH",
  "QUARTER",
  "ZEROIFNULL",
  "ZIPF"
], DS = [
  // https://docs.snowflake.com/en/sql-reference/reserved-keywords.html
  //
  // run in console on this page: $x('//tbody/tr/*[1]/p/text()').map(x => x.nodeValue)
  "ACCOUNT",
  "ALL",
  "ALTER",
  "AND",
  "ANY",
  "AS",
  "BETWEEN",
  "BY",
  "CASE",
  "CAST",
  "CHECK",
  "COLUMN",
  "CONNECT",
  "CONNECTION",
  "CONSTRAINT",
  "CREATE",
  "CROSS",
  "CURRENT",
  "CURRENT_DATE",
  "CURRENT_TIME",
  "CURRENT_TIMESTAMP",
  "CURRENT_USER",
  "DATABASE",
  "DELETE",
  "DISTINCT",
  "DROP",
  "ELSE",
  "EXISTS",
  "FALSE",
  "FOLLOWING",
  "FOR",
  "FROM",
  "FULL",
  "GRANT",
  "GROUP",
  "GSCLUSTER",
  "HAVING",
  "ILIKE",
  "IN",
  "INCREMENT",
  "INNER",
  "INSERT",
  "INTERSECT",
  "INTO",
  "IS",
  "ISSUE",
  "JOIN",
  "LATERAL",
  "LEFT",
  "LIKE",
  "LOCALTIME",
  "LOCALTIMESTAMP",
  "MINUS",
  "NATURAL",
  "NOT",
  "NULL",
  "OF",
  "ON",
  "OR",
  "ORDER",
  "ORGANIZATION",
  "QUALIFY",
  "REGEXP",
  "REVOKE",
  "RIGHT",
  "RLIKE",
  "ROW",
  "ROWS",
  "SAMPLE",
  "SCHEMA",
  "SELECT",
  "SET",
  "SOME",
  "START",
  "TABLE",
  "TABLESAMPLE",
  "THEN",
  "TO",
  "TRIGGER",
  "TRUE",
  "TRY_CAST",
  "UNION",
  "UNIQUE",
  "UPDATE",
  "USING",
  "VALUES",
  "VIEW",
  "WHEN",
  "WHENEVER",
  "WHERE",
  "WITH",
  // These are definitely keywords, but haven't found a definite list in the docs
  "COMMENT"
], PS = [
  "NUMBER",
  "DECIMAL",
  "NUMERIC",
  "INT",
  "INTEGER",
  "BIGINT",
  "SMALLINT",
  "TINYINT",
  "BYTEINT",
  "FLOAT",
  "FLOAT4",
  "FLOAT8",
  "DOUBLE",
  "DOUBLE PRECISION",
  "REAL",
  "VARCHAR",
  "CHAR",
  "CHARACTER",
  "STRING",
  "TEXT",
  "BINARY",
  "VARBINARY",
  "BOOLEAN",
  "DATE",
  "DATETIME",
  "TIME",
  "TIMESTAMP",
  "TIMESTAMP_LTZ",
  "TIMESTAMP_NTZ",
  "TIMESTAMP",
  "TIMESTAMP_TZ",
  "VARIANT",
  "OBJECT",
  "ARRAY",
  "GEOGRAPHY",
  "GEOMETRY"
], lS = S(["SELECT [ALL | DISTINCT]"]), MS = S([
  // queries
  "WITH [RECURSIVE]",
  "FROM",
  "WHERE",
  "GROUP BY",
  "HAVING",
  "PARTITION BY",
  "ORDER BY",
  "QUALIFY",
  "LIMIT",
  "OFFSET",
  "FETCH [FIRST | NEXT]",
  // Data manipulation
  // - insert:
  "INSERT [OVERWRITE] [ALL INTO | INTO | ALL | FIRST]",
  "{THEN | ELSE} INTO",
  "VALUES",
  // - update:
  "SET",
  "CLUSTER BY",
  "[WITH] {MASKING POLICY | TAG | ROW ACCESS POLICY}",
  "COPY GRANTS",
  "USING TEMPLATE",
  "MERGE INTO",
  "WHEN MATCHED [AND]",
  "THEN {UPDATE SET | DELETE}",
  "WHEN NOT MATCHED THEN INSERT"
]), HT = S([
  "CREATE [OR REPLACE] [VOLATILE] TABLE [IF NOT EXISTS]",
  "CREATE [OR REPLACE] [LOCAL | GLOBAL] {TEMP|TEMPORARY} TABLE [IF NOT EXISTS]"
]), bE = S([
  // - create:
  "CREATE [OR REPLACE] [SECURE] [RECURSIVE] VIEW [IF NOT EXISTS]",
  // - update:
  "UPDATE",
  // - delete:
  "DELETE FROM",
  // - drop table:
  "DROP TABLE [IF EXISTS]",
  // - alter table:
  "ALTER TABLE [IF EXISTS]",
  "RENAME TO",
  "SWAP WITH",
  "[SUSPEND | RESUME] RECLUSTER",
  "DROP CLUSTERING KEY",
  "ADD [COLUMN]",
  "RENAME COLUMN",
  "{ALTER | MODIFY} [COLUMN]",
  "DROP [COLUMN]",
  "{ADD | ALTER | MODIFY | DROP} [CONSTRAINT]",
  "RENAME CONSTRAINT",
  "{ADD | DROP} SEARCH OPTIMIZATION",
  "{SET | UNSET} TAG",
  "{ADD | DROP} ROW ACCESS POLICY",
  "DROP ALL ROW ACCESS POLICIES",
  "{SET | DROP} DEFAULT",
  "{SET | DROP} NOT NULL",
  "SET DATA TYPE",
  "UNSET COMMENT",
  "{SET | UNSET} MASKING POLICY",
  // - truncate:
  "TRUNCATE [TABLE] [IF EXISTS]",
  // other
  // https://docs.snowflake.com/en/sql-reference/sql-all.html
  //
  // 1. run in console on this page: $x('//tbody/tr/*[1]//a/span/text()').map(x => x.nodeValue)
  // 2. delete all lines that contain a sting like '(.*)', they are already covered in the list
  // 3. delete all lines that contain a sting like '<.*>', they are already covered in the list
  // 4. delete all lines that contain '…', they are part of a regex statement that can't be covered here
  // 5. Manually add 'COPY INTO'
  // 6. Remove all lines that are already in `reservedClauses`
  //
  // Steps 1-4 can be combined by the following script in the developer console:
  // $x('//tbody/tr/*[1]//a/span/text()').map(x => x.nodeValue) // Step 1
  //   filter(x => !x.match(/\(.*\)/) && !x.match(/…/) && !x.match(/<.*>/)) // Step 2-4
  "ALTER ACCOUNT",
  "ALTER API INTEGRATION",
  "ALTER CONNECTION",
  "ALTER DATABASE",
  "ALTER EXTERNAL TABLE",
  "ALTER FAILOVER GROUP",
  "ALTER FILE FORMAT",
  "ALTER FUNCTION",
  "ALTER INTEGRATION",
  "ALTER MASKING POLICY",
  "ALTER MATERIALIZED VIEW",
  "ALTER NETWORK POLICY",
  "ALTER NOTIFICATION INTEGRATION",
  "ALTER PIPE",
  "ALTER PROCEDURE",
  "ALTER REPLICATION GROUP",
  "ALTER RESOURCE MONITOR",
  "ALTER ROLE",
  "ALTER ROW ACCESS POLICY",
  "ALTER SCHEMA",
  "ALTER SECURITY INTEGRATION",
  "ALTER SEQUENCE",
  "ALTER SESSION",
  "ALTER SESSION POLICY",
  "ALTER SHARE",
  "ALTER STAGE",
  "ALTER STORAGE INTEGRATION",
  "ALTER STREAM",
  "ALTER TAG",
  "ALTER TASK",
  "ALTER USER",
  "ALTER VIEW",
  "ALTER WAREHOUSE",
  "BEGIN",
  "CALL",
  "COMMIT",
  "COPY INTO",
  "CREATE ACCOUNT",
  "CREATE API INTEGRATION",
  "CREATE CONNECTION",
  "CREATE DATABASE",
  "CREATE EXTERNAL FUNCTION",
  "CREATE EXTERNAL TABLE",
  "CREATE FAILOVER GROUP",
  "CREATE FILE FORMAT",
  "CREATE FUNCTION",
  "CREATE INTEGRATION",
  "CREATE MANAGED ACCOUNT",
  "CREATE MASKING POLICY",
  "CREATE MATERIALIZED VIEW",
  "CREATE NETWORK POLICY",
  "CREATE NOTIFICATION INTEGRATION",
  "CREATE PIPE",
  "CREATE PROCEDURE",
  "CREATE REPLICATION GROUP",
  "CREATE RESOURCE MONITOR",
  "CREATE ROLE",
  "CREATE ROW ACCESS POLICY",
  "CREATE SCHEMA",
  "CREATE SECURITY INTEGRATION",
  "CREATE SEQUENCE",
  "CREATE SESSION POLICY",
  "CREATE SHARE",
  "CREATE STAGE",
  "CREATE STORAGE INTEGRATION",
  "CREATE STREAM",
  "CREATE TAG",
  "CREATE TASK",
  "CREATE USER",
  "CREATE WAREHOUSE",
  "DELETE",
  "DESCRIBE DATABASE",
  "DESCRIBE EXTERNAL TABLE",
  "DESCRIBE FILE FORMAT",
  "DESCRIBE FUNCTION",
  "DESCRIBE INTEGRATION",
  "DESCRIBE MASKING POLICY",
  "DESCRIBE MATERIALIZED VIEW",
  "DESCRIBE NETWORK POLICY",
  "DESCRIBE PIPE",
  "DESCRIBE PROCEDURE",
  "DESCRIBE RESULT",
  "DESCRIBE ROW ACCESS POLICY",
  "DESCRIBE SCHEMA",
  "DESCRIBE SEQUENCE",
  "DESCRIBE SESSION POLICY",
  "DESCRIBE SHARE",
  "DESCRIBE STAGE",
  "DESCRIBE STREAM",
  "DESCRIBE TABLE",
  "DESCRIBE TASK",
  "DESCRIBE TRANSACTION",
  "DESCRIBE USER",
  "DESCRIBE VIEW",
  "DESCRIBE WAREHOUSE",
  "DROP CONNECTION",
  "DROP DATABASE",
  "DROP EXTERNAL TABLE",
  "DROP FAILOVER GROUP",
  "DROP FILE FORMAT",
  "DROP FUNCTION",
  "DROP INTEGRATION",
  "DROP MANAGED ACCOUNT",
  "DROP MASKING POLICY",
  "DROP MATERIALIZED VIEW",
  "DROP NETWORK POLICY",
  "DROP PIPE",
  "DROP PROCEDURE",
  "DROP REPLICATION GROUP",
  "DROP RESOURCE MONITOR",
  "DROP ROLE",
  "DROP ROW ACCESS POLICY",
  "DROP SCHEMA",
  "DROP SEQUENCE",
  "DROP SESSION POLICY",
  "DROP SHARE",
  "DROP STAGE",
  "DROP STREAM",
  "DROP TAG",
  "DROP TASK",
  "DROP USER",
  "DROP VIEW",
  "DROP WAREHOUSE",
  "EXECUTE IMMEDIATE",
  "EXECUTE TASK",
  "EXPLAIN",
  "GET",
  "GRANT OWNERSHIP",
  "GRANT ROLE",
  "INSERT",
  "LIST",
  "MERGE",
  "PUT",
  "REMOVE",
  "REVOKE ROLE",
  "ROLLBACK",
  "SHOW COLUMNS",
  "SHOW CONNECTIONS",
  "SHOW DATABASES",
  "SHOW DATABASES IN FAILOVER GROUP",
  "SHOW DATABASES IN REPLICATION GROUP",
  "SHOW DELEGATED AUTHORIZATIONS",
  "SHOW EXTERNAL FUNCTIONS",
  "SHOW EXTERNAL TABLES",
  "SHOW FAILOVER GROUPS",
  "SHOW FILE FORMATS",
  "SHOW FUNCTIONS",
  "SHOW GLOBAL ACCOUNTS",
  "SHOW GRANTS",
  "SHOW INTEGRATIONS",
  "SHOW LOCKS",
  "SHOW MANAGED ACCOUNTS",
  "SHOW MASKING POLICIES",
  "SHOW MATERIALIZED VIEWS",
  "SHOW NETWORK POLICIES",
  "SHOW OBJECTS",
  "SHOW ORGANIZATION ACCOUNTS",
  "SHOW PARAMETERS",
  "SHOW PIPES",
  "SHOW PRIMARY KEYS",
  "SHOW PROCEDURES",
  "SHOW REGIONS",
  "SHOW REPLICATION ACCOUNTS",
  "SHOW REPLICATION DATABASES",
  "SHOW REPLICATION GROUPS",
  "SHOW RESOURCE MONITORS",
  "SHOW ROLES",
  "SHOW ROW ACCESS POLICIES",
  "SHOW SCHEMAS",
  "SHOW SEQUENCES",
  "SHOW SESSION POLICIES",
  "SHOW SHARES",
  "SHOW SHARES IN FAILOVER GROUP",
  "SHOW SHARES IN REPLICATION GROUP",
  "SHOW STAGES",
  "SHOW STREAMS",
  "SHOW TABLES",
  "SHOW TAGS",
  "SHOW TASKS",
  "SHOW TRANSACTIONS",
  "SHOW USER FUNCTIONS",
  "SHOW USERS",
  "SHOW VARIABLES",
  "SHOW VIEWS",
  "SHOW WAREHOUSES",
  "TRUNCATE MATERIALIZED VIEW",
  "UNDROP DATABASE",
  "UNDROP SCHEMA",
  "UNDROP TABLE",
  "UNDROP TAG",
  "UNSET",
  "USE DATABASE",
  "USE ROLE",
  "USE SCHEMA",
  "USE SECONDARY ROLES",
  "USE WAREHOUSE"
]), US = S(["UNION [ALL]", "MINUS", "EXCEPT", "INTERSECT"]), cS = S([
  "[INNER] JOIN",
  "[NATURAL] {LEFT | RIGHT | FULL} [OUTER] JOIN",
  "{CROSS | NATURAL} JOIN"
]), uS = S([
  "{ROWS | RANGE} BETWEEN",
  "ON {UPDATE | DELETE} [SET NULL | SET DEFAULT]"
]), dS = S([]), pS = {
  name: "snowflake",
  tokenizerOptions: {
    reservedSelect: lS,
    reservedClauses: [...MS, ...HT, ...bE],
    reservedSetOperations: US,
    reservedJoins: cS,
    reservedKeywordPhrases: uS,
    reservedDataTypePhrases: dS,
    reservedKeywords: DS,
    reservedDataTypes: PS,
    reservedFunctionNames: _S,
    stringTypes: ["$$", "''-qq-bs"],
    identTypes: ['""-qq'],
    variableTypes: [
      // for accessing columns at certain positons in the table
      { regex: "[$][1-9]\\d*" },
      // identifier style syntax
      { regex: "[$][_a-zA-Z][_a-zA-Z0-9$]*" }
    ],
    extraParens: ["[]"],
    identChars: { rest: "$" },
    lineCommentTypes: ["--", "//"],
    operators: [
      // Modulo
      "%",
      // Type cast
      "::",
      // String concat
      "||",
      // Generators: https://docs.snowflake.com/en/sql-reference/functions/generator.html#generator
      "=>",
      // Assignment https://docs.snowflake.com/en/sql-reference/snowflake-scripting/let
      ":=",
      // Lambda: https://docs.snowflake.com/en/user-guide/querying-semistructured#lambda-expressions
      "->"
    ],
    propertyAccessOperators: [":"]
  },
  formatOptions: {
    alwaysDenseOperators: ["::"],
    onelineClauses: [...HT, ...bE],
    tabularOnelineClauses: bE
  }
}, GS = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  bigquery: we,
  clickhouse: tR,
  db2: iR,
  db2i: pR,
  duckdb: yR,
  hive: JR,
  mariadb: RA,
  mysql: aA,
  n1ql: hA,
  plsql: vA,
  postgresql: Et,
  redshift: st,
  singlestoredb: iS,
  snowflake: pS,
  spark: Pt,
  sql: Xt,
  sqlite: mt,
  tidb: UA,
  transactsql: IS,
  trino: Zt
}, Symbol.toStringTag, { value: "Module" })), TE = (E) => E[E.length - 1], ZT = (E) => E.sort((T, e) => e.length - T.length || T.localeCompare(e)), sE = (E) => E.replace(/\s+/gu, " "), WE = (E) => /\n/.test(E), W = (E) => E.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), BT = /\s+/uy, q = (E) => new RegExp(`(?:${E})`, "uy"), HS = (E) => E.split("").map((T) => / /gu.test(T) ? "\\s+" : `[${T.toUpperCase()}${T.toLowerCase()}]`).join(""), BS = (E) => E + "(?:-" + E + ")*", mS = ({ prefixes: E, requirePrefix: T }) => `(?:${E.map(HS).join("|")}${T ? "" : "|"})`, FS = (E) => new RegExp(`(?:${E.map(W).join("|")}).*?(?=\r
|\r|
|$)`, "uy"), mT = (E, T = []) => {
  const e = E === "open" ? 0 : 1, R = ["()", ...T].map((t) => t[e]);
  return q(R.map(W).join("|"));
}, FT = (E) => q(`${ZT(E).map(W).join("|")}`), hS = ({ rest: E, dashes: T }) => E || T ? `(?![${E || ""}${T ? "-" : ""}])` : "", x = (E, T = {}) => {
  if (E.length === 0)
    return /^\b$/u;
  const e = hS(T), R = ZT(E).map(W).join("|").replace(/ /gu, "\\s+");
  return new RegExp(`(?:${R})${e}\\b`, "iuy");
}, XE = (E, T) => {
  if (!E.length)
    return;
  const e = E.map(W).join("|");
  return q(`(?:${e})(?:${T})`);
}, YS = () => {
  const E = {
    "<": ">",
    "[": "]",
    "(": ")",
    "{": "}"
  }, T = "{left}(?:(?!{right}').)*?{right}", e = Object.entries(E).map(([s, N]) => T.replace(/{left}/g, W(s)).replace(/{right}/g, W(N))), R = W(Object.keys(E).join(""));
  return `[Qq]'(?:${String.raw`(?<tag>[^\s${R}])(?:(?!\k<tag>').)*?\k<tag>`}|${e.join("|")})'`;
}, hT = {
  // - backtick quoted (using `` to escape)
  "``": "(?:`[^`]*`)+",
  // - Transact-SQL square bracket quoted (using ]] to escape)
  "[]": String.raw`(?:\[[^\]]*\])(?:\][^\]]*\])*`,
  // double-quoted
  '""-qq': String.raw`(?:"[^"]*")+`,
  '""-bs': String.raw`(?:"[^"\\]*(?:\\.[^"\\]*)*")`,
  '""-qq-bs': String.raw`(?:"[^"\\]*(?:\\.[^"\\]*)*")+`,
  '""-raw': String.raw`(?:"[^"]*")`,
  // single-quoted
  "''-qq": String.raw`(?:'[^']*')+`,
  "''-bs": String.raw`(?:'[^'\\]*(?:\\.[^'\\]*)*')`,
  "''-qq-bs": String.raw`(?:'[^'\\]*(?:\\.[^'\\]*)*')+`,
  "''-raw": String.raw`(?:'[^']*')`,
  // PostgreSQL dollar-quoted
  $$: String.raw`(?<tag>\$\w*\$)[\s\S]*?\k<tag>`,
  // BigQuery '''triple-quoted''' (using \' to escape)
  "'''..'''": String.raw`'''[^\\]*?(?:\\.[^\\]*?)*?'''`,
  // BigQuery """triple-quoted""" (using \" to escape)
  '""".."""': String.raw`"""[^\\]*?(?:\\.[^\\]*?)*?"""`,
  // Hive and Spark variables: ${name}
  "{}": String.raw`(?:\{[^\}]*\})`,
  // Oracle q'' strings: q'<text>' q'|text|' ...
  "q''": YS()
}, jT = (E) => typeof E == "string" ? hT[E] : "regex" in E ? E.regex : mS(E) + hT[E.quote], fS = (E) => q(E.map((T) => "regex" in T ? T.regex : jT(T)).join("|")), zT = (E) => E.map(jT).join("|"), YT = (E) => q(zT(E)), gS = (E = {}) => q(Ee(E)), Ee = ({ first: E, rest: T, dashes: e, allowFirstCharNumber: R } = {}) => {
  const t = "\\p{Alphabetic}\\p{Mark}_", O = "\\p{Decimal_Number}", s = W(E ?? ""), N = W(T ?? ""), o = R ? `[${t}${O}${s}][${t}${O}${N}]*` : `[${t}${s}][${t}${O}${N}]*`;
  return e ? BS(o) : o;
};
function Te(E, T) {
  const e = E.slice(0, T).split(/\n/);
  return { line: e.length, col: e[e.length - 1].length + 1 };
}
class yS {
  constructor(T, e) {
    this.rules = T, this.dialectName = e, this.input = "", this.index = 0;
  }
  /**
   * Takes a SQL string and breaks it into tokens.
   * Each token is an object with type and value.
   *
   * @param {string} input - The SQL string
   * @returns {Token[]} output token stream
   */
  tokenize(T) {
    this.input = T, this.index = 0;
    const e = [];
    let R;
    for (; this.index < this.input.length; ) {
      const t = this.getWhitespace();
      if (this.index < this.input.length) {
        if (R = this.getNextToken(), !R)
          throw this.createParseError();
        e.push(Object.assign(Object.assign({}, R), { precedingWhitespace: t }));
      }
    }
    return e;
  }
  createParseError() {
    const T = this.input.slice(this.index, this.index + 10), { line: e, col: R } = Te(this.input, this.index);
    return new Error(`Parse error: Unexpected "${T}" at line ${e} column ${R}.
${this.dialectInfo()}`);
  }
  dialectInfo() {
    return this.dialectName === "sql" ? `This likely happens because you're using the default "sql" dialect.
If possible, please select a more specific dialect (like sqlite, postgresql, etc).` : `SQL dialect used: "${this.dialectName}".`;
  }
  getWhitespace() {
    BT.lastIndex = this.index;
    const T = BT.exec(this.input);
    if (T)
      return this.index += T[0].length, T[0];
  }
  getNextToken() {
    for (const T of this.rules) {
      const e = this.match(T);
      if (e)
        return e;
    }
  }
  // Attempts to match token rule regex at current position in input
  match(T) {
    T.regex.lastIndex = this.index;
    const e = T.regex.exec(this.input);
    if (e) {
      const R = e[0], t = {
        type: T.type,
        raw: R,
        text: T.text ? T.text(R) : R,
        start: this.index
      };
      return T.key && (t.key = T.key(R)), this.index += R.length, t;
    }
  }
}
const fT = /\/\*/uy, VS = /[\s\S]/uy, bS = /\*\//uy;
class WS {
  constructor() {
    this.lastIndex = 0;
  }
  exec(T) {
    let e = "", R, t = 0;
    if (R = this.matchSection(fT, T))
      e += R, t++;
    else
      return null;
    for (; t > 0; )
      if (R = this.matchSection(fT, T))
        e += R, t++;
      else if (R = this.matchSection(bS, T))
        e += R, t--;
      else if (R = this.matchSection(VS, T))
        e += R;
      else
        return null;
    return [e];
  }
  matchSection(T, e) {
    T.lastIndex = this.lastIndex;
    const R = T.exec(e);
    return R && (this.lastIndex += R[0].length), R ? R[0] : null;
  }
}
class XS {
  constructor(T, e) {
    this.cfg = T, this.dialectName = e, this.rulesBeforeParams = this.buildRulesBeforeParams(T), this.rulesAfterParams = this.buildRulesAfterParams(T);
  }
  tokenize(T, e) {
    const R = [
      ...this.rulesBeforeParams,
      ...this.buildParamRules(this.cfg, e),
      ...this.rulesAfterParams
    ], t = new yS(R, this.dialectName).tokenize(T);
    return this.cfg.postProcess ? this.cfg.postProcess(t) : t;
  }
  // These rules can be cached as they only depend on
  // the Tokenizer config options specified for each SQL dialect
  buildRulesBeforeParams(T) {
    var e, R, t;
    return this.validRules([
      {
        type: C.DISABLE_COMMENT,
        regex: /(\/\* *sql-formatter-disable *\*\/[\s\S]*?(?:\/\* *sql-formatter-enable *\*\/|$))/uy
      },
      {
        type: C.BLOCK_COMMENT,
        regex: T.nestedBlockComments ? new WS() : /(\/\*[^]*?\*\/)/uy
      },
      {
        type: C.LINE_COMMENT,
        regex: FS((e = T.lineCommentTypes) !== null && e !== void 0 ? e : ["--"])
      },
      {
        type: C.QUOTED_IDENTIFIER,
        regex: YT(T.identTypes)
      },
      {
        type: C.NUMBER,
        regex: T.underscoresInNumbers ? /(?:0x[0-9a-fA-F_]+|0b[01_]+|(?:-\s*)?(?:[0-9_]*\.[0-9_]+|[0-9_]+(?:\.[0-9_]*)?)(?:[eE][-+]?[0-9_]+(?:\.[0-9_]+)?)?)(?![\w\p{Alphabetic}])/uy : /(?:0x[0-9a-fA-F]+|0b[01]+|(?:-\s*)?(?:[0-9]*\.[0-9]+|[0-9]+(?:\.[0-9]*)?)(?:[eE][-+]?[0-9]+(?:\.[0-9]+)?)?)(?![\w\p{Alphabetic}])/uy
      },
      // RESERVED_KEYWORD_PHRASE and RESERVED_DATA_TYPE_PHRASE  is matched before all other keyword tokens
      // to e.g. prioritize matching "TIMESTAMP WITH TIME ZONE" phrase over "WITH" clause.
      {
        type: C.RESERVED_KEYWORD_PHRASE,
        regex: x((R = T.reservedKeywordPhrases) !== null && R !== void 0 ? R : [], T.identChars),
        text: h
      },
      {
        type: C.RESERVED_DATA_TYPE_PHRASE,
        regex: x((t = T.reservedDataTypePhrases) !== null && t !== void 0 ? t : [], T.identChars),
        text: h
      },
      {
        type: C.CASE,
        regex: /CASE\b/iuy,
        text: h
      },
      {
        type: C.END,
        regex: /END\b/iuy,
        text: h
      },
      {
        type: C.BETWEEN,
        regex: /BETWEEN\b/iuy,
        text: h
      },
      {
        type: C.LIMIT,
        regex: T.reservedClauses.includes("LIMIT") ? /LIMIT\b/iuy : void 0,
        text: h
      },
      {
        type: C.RESERVED_CLAUSE,
        regex: x(T.reservedClauses, T.identChars),
        text: h
      },
      {
        type: C.RESERVED_SELECT,
        regex: x(T.reservedSelect, T.identChars),
        text: h
      },
      {
        type: C.RESERVED_SET_OPERATION,
        regex: x(T.reservedSetOperations, T.identChars),
        text: h
      },
      {
        type: C.WHEN,
        regex: /WHEN\b/iuy,
        text: h
      },
      {
        type: C.ELSE,
        regex: /ELSE\b/iuy,
        text: h
      },
      {
        type: C.THEN,
        regex: /THEN\b/iuy,
        text: h
      },
      {
        type: C.RESERVED_JOIN,
        regex: x(T.reservedJoins, T.identChars),
        text: h
      },
      {
        type: C.AND,
        regex: /AND\b/iuy,
        text: h
      },
      {
        type: C.OR,
        regex: /OR\b/iuy,
        text: h
      },
      {
        type: C.XOR,
        regex: T.supportsXor ? /XOR\b/iuy : void 0,
        text: h
      },
      ...T.operatorKeyword ? [
        {
          type: C.OPERATOR,
          regex: /OPERATOR *\([^)]+\)/iuy
        }
      ] : [],
      {
        type: C.RESERVED_FUNCTION_NAME,
        regex: x(T.reservedFunctionNames, T.identChars),
        text: h
      },
      {
        type: C.RESERVED_DATA_TYPE,
        regex: x(T.reservedDataTypes, T.identChars),
        text: h
      },
      {
        type: C.RESERVED_KEYWORD,
        regex: x(T.reservedKeywords, T.identChars),
        text: h
      }
    ]);
  }
  // These rules can also be cached as they only depend on
  // the Tokenizer config options specified for each SQL dialect
  buildRulesAfterParams(T) {
    var e, R;
    return this.validRules([
      {
        type: C.VARIABLE,
        regex: T.variableTypes ? fS(T.variableTypes) : void 0
      },
      { type: C.STRING, regex: YT(T.stringTypes) },
      {
        type: C.IDENTIFIER,
        regex: gS(T.identChars)
      },
      { type: C.DELIMITER, regex: /[;]/uy },
      { type: C.COMMA, regex: /[,]/y },
      {
        type: C.OPEN_PAREN,
        regex: mT("open", T.extraParens)
      },
      {
        type: C.CLOSE_PAREN,
        regex: mT("close", T.extraParens)
      },
      {
        type: C.OPERATOR,
        regex: FT([
          // standard operators
          "+",
          "-",
          "/",
          ">",
          "<",
          "=",
          "<>",
          "<=",
          ">=",
          "!=",
          ...(e = T.operators) !== null && e !== void 0 ? e : []
        ])
      },
      { type: C.ASTERISK, regex: /[*]/uy },
      {
        type: C.PROPERTY_ACCESS_OPERATOR,
        regex: FT([".", ...(R = T.propertyAccessOperators) !== null && R !== void 0 ? R : []])
      }
    ]);
  }
  // These rules can't be blindly cached as the paramTypesOverrides object
  // can differ on each invocation of the format() function.
  buildParamRules(T, e) {
    var R, t, O, s, N;
    const o = {
      named: e?.named || ((R = T.paramTypes) === null || R === void 0 ? void 0 : R.named) || [],
      quoted: e?.quoted || ((t = T.paramTypes) === null || t === void 0 ? void 0 : t.quoted) || [],
      numbered: e?.numbered || ((O = T.paramTypes) === null || O === void 0 ? void 0 : O.numbered) || [],
      positional: typeof e?.positional == "boolean" ? e.positional : (s = T.paramTypes) === null || s === void 0 ? void 0 : s.positional,
      custom: e?.custom || ((N = T.paramTypes) === null || N === void 0 ? void 0 : N.custom) || []
    };
    return this.validRules([
      {
        type: C.NAMED_PARAMETER,
        regex: XE(o.named, Ee(T.paramChars || T.identChars)),
        key: (A) => A.slice(1)
      },
      {
        type: C.QUOTED_PARAMETER,
        regex: XE(o.quoted, zT(T.identTypes)),
        key: (A) => (({ tokenKey: I, quoteChar: L }) => I.replace(new RegExp(W("\\" + L), "gu"), L))({
          tokenKey: A.slice(2, -1),
          quoteChar: A.slice(-1)
        })
      },
      {
        type: C.NUMBERED_PARAMETER,
        regex: XE(o.numbered, "[0-9]+"),
        key: (A) => A.slice(1)
      },
      {
        type: C.POSITIONAL_PARAMETER,
        regex: o.positional ? /[?]/y : void 0
      },
      ...o.custom.map((A) => {
        var I;
        return {
          type: C.CUSTOM_PARAMETER,
          regex: q(A.regex),
          key: (I = A.key) !== null && I !== void 0 ? I : (L) => L
        };
      })
    ]);
  }
  // filters out rules for token types whose regex is undefined
  validRules(T) {
    return T.filter((e) => !!e.regex);
  }
}
const h = (E) => sE(E.toUpperCase()), gT = /* @__PURE__ */ new Map(), xS = (E) => {
  let T = gT.get(E);
  return T || (T = vS(E), gT.set(E, T)), T;
}, vS = (E) => ({
  tokenizer: new XS(E.tokenizerOptions, E.name),
  formatOptions: $S(E.formatOptions)
}), $S = (E) => {
  var T;
  return {
    alwaysDenseOperators: E.alwaysDenseOperators || [],
    onelineClauses: Object.fromEntries(E.onelineClauses.map((e) => [e, !0])),
    tabularOnelineClauses: Object.fromEntries(((T = E.tabularOnelineClauses) !== null && T !== void 0 ? T : E.onelineClauses).map((e) => [e, !0]))
  };
};
function KS(E) {
  return E.indentStyle === "tabularLeft" || E.indentStyle === "tabularRight" ? " ".repeat(10) : E.useTabs ? "	" : " ".repeat(E.tabWidth);
}
function j(E) {
  return E.indentStyle === "tabularLeft" || E.indentStyle === "tabularRight";
}
class wS {
  constructor(T) {
    this.params = T, this.index = 0;
  }
  /**
   * Returns param value that matches given placeholder with param key.
   */
  get({ key: T, text: e }) {
    return this.params ? T ? this.params[T] : this.params[this.index++] : e;
  }
  /**
   * Returns index of current positional parameter.
   */
  getPositionalParameterIndex() {
    return this.index;
  }
  /**
   * Sets index of current positional parameter.
   */
  setPositionalParameterIndex(T) {
    this.index = T;
  }
}
var ee = { exports: {} };
(function(E) {
  (function(T, e) {
    E.exports ? E.exports = e() : T.nearley = e();
  })(ZE, function() {
    function T(A, I, L) {
      return this.id = ++T.highestId, this.name = A, this.symbols = I, this.postprocess = L, this;
    }
    T.highestId = 0, T.prototype.toString = function(A) {
      var I = typeof A > "u" ? this.symbols.map(o).join(" ") : this.symbols.slice(0, A).map(o).join(" ") + " ● " + this.symbols.slice(A).map(o).join(" ");
      return this.name + " → " + I;
    };
    function e(A, I, L, i) {
      this.rule = A, this.dot = I, this.reference = L, this.data = [], this.wantedBy = i, this.isComplete = this.dot === A.symbols.length;
    }
    e.prototype.toString = function() {
      return "{" + this.rule.toString(this.dot) + "}, from: " + (this.reference || 0);
    }, e.prototype.nextState = function(A) {
      var I = new e(this.rule, this.dot + 1, this.reference, this.wantedBy);
      return I.left = this, I.right = A, I.isComplete && (I.data = I.build(), I.right = void 0), I;
    }, e.prototype.build = function() {
      var A = [], I = this;
      do
        A.push(I.right.data), I = I.left;
      while (I.left);
      return A.reverse(), A;
    }, e.prototype.finish = function() {
      this.rule.postprocess && (this.data = this.rule.postprocess(this.data, this.reference, s.fail));
    };
    function R(A, I) {
      this.grammar = A, this.index = I, this.states = [], this.wants = {}, this.scannable = [], this.completed = {};
    }
    R.prototype.process = function(A) {
      for (var I = this.states, L = this.wants, i = this.completed, H = 0; H < I.length; H++) {
        var c = I[H];
        if (c.isComplete) {
          if (c.finish(), c.data !== s.fail) {
            for (var G = c.wantedBy, u = G.length; u--; ) {
              var B = G[u];
              this.complete(B, c);
            }
            if (c.reference === this.index) {
              var r = c.rule.name;
              (this.completed[r] = this.completed[r] || []).push(c);
            }
          }
        } else {
          var r = c.rule.symbols[c.dot];
          if (typeof r != "string") {
            this.scannable.push(c);
            continue;
          }
          if (L[r]) {
            if (L[r].push(c), i.hasOwnProperty(r))
              for (var n = i[r], u = 0; u < n.length; u++) {
                var _ = n[u];
                this.complete(c, _);
              }
          } else
            L[r] = [c], this.predict(r);
        }
      }
    }, R.prototype.predict = function(A) {
      for (var I = this.grammar.byName[A] || [], L = 0; L < I.length; L++) {
        var i = I[L], H = this.wants[A], c = new e(i, 0, this.index, H);
        this.states.push(c);
      }
    }, R.prototype.complete = function(A, I) {
      var L = A.nextState(I);
      this.states.push(L);
    };
    function t(A, I) {
      this.rules = A, this.start = I || this.rules[0].name;
      var L = this.byName = {};
      this.rules.forEach(function(i) {
        L.hasOwnProperty(i.name) || (L[i.name] = []), L[i.name].push(i);
      });
    }
    t.fromCompiled = function(i, I) {
      var L = i.Lexer;
      i.ParserStart && (I = i.ParserStart, i = i.ParserRules);
      var i = i.map(function(c) {
        return new T(c.name, c.symbols, c.postprocess);
      }), H = new t(i, I);
      return H.lexer = L, H;
    };
    function O() {
      this.reset("");
    }
    O.prototype.reset = function(A, I) {
      this.buffer = A, this.index = 0, this.line = I ? I.line : 1, this.lastLineBreak = I ? -I.col : 0;
    }, O.prototype.next = function() {
      if (this.index < this.buffer.length) {
        var A = this.buffer[this.index++];
        return A === `
` && (this.line += 1, this.lastLineBreak = this.index), { value: A };
      }
    }, O.prototype.save = function() {
      return {
        line: this.line,
        col: this.index - this.lastLineBreak
      };
    }, O.prototype.formatError = function(A, I) {
      var L = this.buffer;
      if (typeof L == "string") {
        var i = L.split(`
`).slice(
          Math.max(0, this.line - 5),
          this.line
        ), H = L.indexOf(`
`, this.index);
        H === -1 && (H = L.length);
        var c = this.index - this.lastLineBreak, G = String(this.line).length;
        return I += " at line " + this.line + " col " + c + `:

`, I += i.map(function(B, r) {
          return u(this.line - i.length + r + 1, G) + " " + B;
        }, this).join(`
`), I += `
` + u("", G + c) + `^
`, I;
      } else
        return I + " at index " + (this.index - 1);
      function u(B, r) {
        var n = String(B);
        return Array(r - n.length + 1).join(" ") + n;
      }
    };
    function s(A, I, L) {
      if (A instanceof t)
        var i = A, L = I;
      else
        var i = t.fromCompiled(A, I);
      this.grammar = i, this.options = {
        keepHistory: !1,
        lexer: i.lexer || new O()
      };
      for (var H in L || {})
        this.options[H] = L[H];
      this.lexer = this.options.lexer, this.lexerState = void 0;
      var c = new R(i, 0);
      this.table = [c], c.wants[i.start] = [], c.predict(i.start), c.process(), this.current = 0;
    }
    s.fail = {}, s.prototype.feed = function(A) {
      var I = this.lexer;
      I.reset(A, this.lexerState);
      for (var L; ; ) {
        try {
          if (L = I.next(), !L)
            break;
        } catch (U) {
          var G = new R(this.grammar, this.current + 1);
          this.table.push(G);
          var i = new Error(this.reportLexerError(U));
          throw i.offset = this.current, i.token = U.token, i;
        }
        var H = this.table[this.current];
        this.options.keepHistory || delete this.table[this.current - 1];
        var c = this.current + 1, G = new R(this.grammar, c);
        this.table.push(G);
        for (var u = L.text !== void 0 ? L.text : L.value, B = I.constructor === O ? L.value : L, r = H.scannable, n = r.length; n--; ) {
          var _ = r[n], P = _.rule.symbols[_.dot];
          if (P.test ? P.test(B) : P.type ? P.type === L.type : P.literal === u) {
            var l = _.nextState({ data: B, token: L, isToken: !0, reference: c - 1 });
            G.states.push(l);
          }
        }
        if (G.process(), G.states.length === 0) {
          var i = new Error(this.reportError(L));
          throw i.offset = this.current, i.token = L, i;
        }
        this.options.keepHistory && (H.lexerState = I.save()), this.current++;
      }
      return H && (this.lexerState = I.save()), this.results = this.finish(), this;
    }, s.prototype.reportLexerError = function(A) {
      var I, L, i = A.token;
      return i ? (I = "input " + JSON.stringify(i.text[0]) + " (lexer error)", L = this.lexer.formatError(i, "Syntax error")) : (I = "input (lexer error)", L = A.message), this.reportErrorCommon(L, I);
    }, s.prototype.reportError = function(A) {
      var I = (A.type ? A.type + " token: " : "") + JSON.stringify(A.value !== void 0 ? A.value : A), L = this.lexer.formatError(A, "Syntax error");
      return this.reportErrorCommon(L, I);
    }, s.prototype.reportErrorCommon = function(A, I) {
      var L = [];
      L.push(A);
      var i = this.table.length - 2, H = this.table[i], c = H.states.filter(function(u) {
        var B = u.rule.symbols[u.dot];
        return B && typeof B != "string";
      });
      if (c.length === 0)
        L.push("Unexpected " + I + `. I did not expect any more input. Here is the state of my parse table:
`), this.displayStateStack(H.states, L);
      else {
        L.push("Unexpected " + I + `. Instead, I was expecting to see one of the following:
`);
        var G = c.map(function(u) {
          return this.buildFirstStateStack(u, []) || [u];
        }, this);
        G.forEach(function(u) {
          var B = u[0], r = B.rule.symbols[B.dot], n = this.getSymbolDisplay(r);
          L.push("A " + n + " based on:"), this.displayStateStack(u, L);
        }, this);
      }
      return L.push(""), L.join(`
`);
    }, s.prototype.displayStateStack = function(A, I) {
      for (var L, i = 0, H = 0; H < A.length; H++) {
        var c = A[H], G = c.rule.toString(c.dot);
        G === L ? i++ : (i > 0 && I.push("    ^ " + i + " more lines identical to this"), i = 0, I.push("    " + G)), L = G;
      }
    }, s.prototype.getSymbolDisplay = function(A) {
      return N(A);
    }, s.prototype.buildFirstStateStack = function(A, I) {
      if (I.indexOf(A) !== -1)
        return null;
      if (A.wantedBy.length === 0)
        return [A];
      var L = A.wantedBy[0], i = [A].concat(I), H = this.buildFirstStateStack(L, i);
      return H === null ? null : [A].concat(H);
    }, s.prototype.save = function() {
      var A = this.table[this.current];
      return A.lexerState = this.lexerState, A;
    }, s.prototype.restore = function(A) {
      var I = A.index;
      this.current = I, this.table[I] = A, this.table.splice(I + 1), this.lexerState = A.lexerState, this.results = this.finish();
    }, s.prototype.rewind = function(A) {
      if (!this.options.keepHistory)
        throw new Error("set option `keepHistory` to enable rewinding");
      this.restore(this.table[A]);
    }, s.prototype.finish = function() {
      var A = [], I = this.grammar.start, L = this.table[this.table.length - 1];
      return L.states.forEach(function(i) {
        i.rule.name === I && i.dot === i.rule.symbols.length && i.reference === 0 && i.data !== s.fail && A.push(i);
      }), A.map(function(i) {
        return i.data;
      });
    };
    function N(A) {
      var I = typeof A;
      if (I === "string")
        return A;
      if (I === "object") {
        if (A.literal)
          return JSON.stringify(A.literal);
        if (A instanceof RegExp)
          return "character matching " + A;
        if (A.type)
          return A.type + " token";
        if (A.test)
          return "token matching " + String(A.test);
        throw new Error("Unknown symbol type: " + A);
      }
    }
    function o(A) {
      var I = typeof A;
      if (I === "string")
        return A;
      if (I === "object") {
        if (A.literal)
          return JSON.stringify(A.literal);
        if (A instanceof RegExp)
          return A.toString();
        if (A.type)
          return "%" + A.type;
        if (A.test)
          return "<" + String(A.test) + ">";
        throw new Error("Unknown symbol type: " + A);
      }
    }
    return {
      Parser: s,
      Grammar: t,
      Rule: T
    };
  });
})(ee);
var JS = ee.exports;
const kS = /* @__PURE__ */ vT(JS);
function qS(E) {
  return E.map(QS).map(ZS).map(jS).map(zS).map(EI);
}
const QS = (E, T, e) => {
  if (QT(E.type)) {
    const R = TI(e, T);
    if (R && R.type === C.PROPERTY_ACCESS_OPERATOR)
      return Object.assign(Object.assign({}, E), { type: C.IDENTIFIER, text: E.raw });
    const t = z(e, T);
    if (t && t.type === C.PROPERTY_ACCESS_OPERATOR)
      return Object.assign(Object.assign({}, E), { type: C.IDENTIFIER, text: E.raw });
  }
  return E;
}, ZS = (E, T, e) => {
  if (E.type === C.RESERVED_FUNCTION_NAME) {
    const R = z(e, T);
    if (!R || !Re(R))
      return Object.assign(Object.assign({}, E), { type: C.IDENTIFIER, text: E.raw });
  }
  return E;
}, jS = (E, T, e) => {
  if (E.type === C.RESERVED_DATA_TYPE) {
    const R = z(e, T);
    if (R && Re(R))
      return Object.assign(Object.assign({}, E), { type: C.RESERVED_PARAMETERIZED_DATA_TYPE });
  }
  return E;
}, zS = (E, T, e) => {
  if (E.type === C.IDENTIFIER) {
    const R = z(e, T);
    if (R && Ae(R))
      return Object.assign(Object.assign({}, E), { type: C.ARRAY_IDENTIFIER });
  }
  return E;
}, EI = (E, T, e) => {
  if (E.type === C.RESERVED_DATA_TYPE) {
    const R = z(e, T);
    if (R && Ae(R))
      return Object.assign(Object.assign({}, E), { type: C.ARRAY_KEYWORD });
  }
  return E;
}, TI = (E, T) => z(E, T, -1), z = (E, T, e = 1) => {
  let R = 1;
  for (; E[T + R * e] && eI(E[T + R * e]); )
    R++;
  return E[T + R * e];
}, Re = (E) => E.type === C.OPEN_PAREN && E.text === "(", Ae = (E) => E.type === C.OPEN_PAREN && E.text === "[", eI = (E) => E.type === C.BLOCK_COMMENT || E.type === C.LINE_COMMENT;
class te {
  constructor(T) {
    this.tokenize = T, this.index = 0, this.tokens = [], this.input = "";
  }
  reset(T, e) {
    this.input = T, this.index = 0, this.tokens = this.tokenize(T);
  }
  next() {
    return this.tokens[this.index++];
  }
  save() {
  }
  formatError(T) {
    const { line: e, col: R } = Te(this.input, T.start);
    return `Parse error at token: ${T.text} at line ${e} column ${R}`;
  }
  has(T) {
    return T in C;
  }
}
var M;
(function(E) {
  E.statement = "statement", E.clause = "clause", E.set_operation = "set_operation", E.function_call = "function_call", E.parameterized_data_type = "parameterized_data_type", E.array_subscript = "array_subscript", E.property_access = "property_access", E.parenthesis = "parenthesis", E.between_predicate = "between_predicate", E.case_expression = "case_expression", E.case_when = "case_when", E.case_else = "case_else", E.limit_clause = "limit_clause", E.all_columns_asterisk = "all_columns_asterisk", E.literal = "literal", E.identifier = "identifier", E.keyword = "keyword", E.data_type = "data_type", E.parameter = "parameter", E.operator = "operator", E.comma = "comma", E.line_comment = "line_comment", E.block_comment = "block_comment", E.disable_comment = "disable_comment";
})(M = M || (M = {}));
function xE(E) {
  return E[0];
}
const p = new te((E) => []), k = ([[E]]) => E, Y = (E) => ({
  type: M.keyword,
  tokenType: E.type,
  text: E.text,
  raw: E.raw
}), yT = (E) => ({
  type: M.data_type,
  text: E.text,
  raw: E.raw
}), f = (E, { leading: T, trailing: e }) => (T?.length && (E = Object.assign(Object.assign({}, E), { leadingComments: T })), e?.length && (E = Object.assign(Object.assign({}, E), { trailingComments: e })), E), RI = (E, { leading: T, trailing: e }) => {
  if (T?.length) {
    const [R, ...t] = E;
    E = [f(R, { leading: T }), ...t];
  }
  if (e?.length) {
    const R = E.slice(0, -1), t = E[E.length - 1];
    E = [...R, f(t, { trailing: e })];
  }
  return E;
}, AI = {
  Lexer: p,
  ParserRules: [
    { name: "main$ebnf$1", symbols: [] },
    { name: "main$ebnf$1", symbols: ["main$ebnf$1", "statement"], postprocess: (E) => E[0].concat([E[1]]) },
    {
      name: "main",
      symbols: ["main$ebnf$1"],
      postprocess: ([E]) => {
        const T = E[E.length - 1];
        return T && !T.hasSemicolon ? T.children.length > 0 ? E : E.slice(0, -1) : E;
      }
    },
    { name: "statement$subexpression$1", symbols: [p.has("DELIMITER") ? { type: "DELIMITER" } : DELIMITER] },
    { name: "statement$subexpression$1", symbols: [p.has("EOF") ? { type: "EOF" } : EOF] },
    {
      name: "statement",
      symbols: ["expressions_or_clauses", "statement$subexpression$1"],
      postprocess: ([E, [T]]) => ({
        type: M.statement,
        children: E,
        hasSemicolon: T.type === C.DELIMITER
      })
    },
    { name: "expressions_or_clauses$ebnf$1", symbols: [] },
    { name: "expressions_or_clauses$ebnf$1", symbols: ["expressions_or_clauses$ebnf$1", "free_form_sql"], postprocess: (E) => E[0].concat([E[1]]) },
    { name: "expressions_or_clauses$ebnf$2", symbols: [] },
    { name: "expressions_or_clauses$ebnf$2", symbols: ["expressions_or_clauses$ebnf$2", "clause"], postprocess: (E) => E[0].concat([E[1]]) },
    {
      name: "expressions_or_clauses",
      symbols: ["expressions_or_clauses$ebnf$1", "expressions_or_clauses$ebnf$2"],
      postprocess: ([E, T]) => [...E, ...T]
    },
    { name: "clause$subexpression$1", symbols: ["limit_clause"] },
    { name: "clause$subexpression$1", symbols: ["select_clause"] },
    { name: "clause$subexpression$1", symbols: ["other_clause"] },
    { name: "clause$subexpression$1", symbols: ["set_operation"] },
    { name: "clause", symbols: ["clause$subexpression$1"], postprocess: k },
    { name: "limit_clause$ebnf$1$subexpression$1$ebnf$1", symbols: ["free_form_sql"] },
    { name: "limit_clause$ebnf$1$subexpression$1$ebnf$1", symbols: ["limit_clause$ebnf$1$subexpression$1$ebnf$1", "free_form_sql"], postprocess: (E) => E[0].concat([E[1]]) },
    { name: "limit_clause$ebnf$1$subexpression$1", symbols: [p.has("COMMA") ? { type: "COMMA" } : COMMA, "limit_clause$ebnf$1$subexpression$1$ebnf$1"] },
    { name: "limit_clause$ebnf$1", symbols: ["limit_clause$ebnf$1$subexpression$1"], postprocess: xE },
    { name: "limit_clause$ebnf$1", symbols: [], postprocess: () => null },
    {
      name: "limit_clause",
      symbols: [p.has("LIMIT") ? { type: "LIMIT" } : LIMIT, "_", "expression_chain_", "limit_clause$ebnf$1"],
      postprocess: ([E, T, e, R]) => {
        if (R) {
          const [t, O] = R;
          return {
            type: M.limit_clause,
            limitKw: f(Y(E), { trailing: T }),
            offset: e,
            count: O
          };
        } else
          return {
            type: M.limit_clause,
            limitKw: f(Y(E), { trailing: T }),
            count: e
          };
      }
    },
    { name: "select_clause$subexpression$1$ebnf$1", symbols: [] },
    { name: "select_clause$subexpression$1$ebnf$1", symbols: ["select_clause$subexpression$1$ebnf$1", "free_form_sql"], postprocess: (E) => E[0].concat([E[1]]) },
    { name: "select_clause$subexpression$1", symbols: ["all_columns_asterisk", "select_clause$subexpression$1$ebnf$1"] },
    { name: "select_clause$subexpression$1$ebnf$2", symbols: [] },
    { name: "select_clause$subexpression$1$ebnf$2", symbols: ["select_clause$subexpression$1$ebnf$2", "free_form_sql"], postprocess: (E) => E[0].concat([E[1]]) },
    { name: "select_clause$subexpression$1", symbols: ["asteriskless_free_form_sql", "select_clause$subexpression$1$ebnf$2"] },
    {
      name: "select_clause",
      symbols: [p.has("RESERVED_SELECT") ? { type: "RESERVED_SELECT" } : RESERVED_SELECT, "select_clause$subexpression$1"],
      postprocess: ([E, [T, e]]) => ({
        type: M.clause,
        nameKw: Y(E),
        children: [T, ...e]
      })
    },
    {
      name: "select_clause",
      symbols: [p.has("RESERVED_SELECT") ? { type: "RESERVED_SELECT" } : RESERVED_SELECT],
      postprocess: ([E]) => ({
        type: M.clause,
        nameKw: Y(E),
        children: []
      })
    },
    {
      name: "all_columns_asterisk",
      symbols: [p.has("ASTERISK") ? { type: "ASTERISK" } : ASTERISK],
      postprocess: () => ({ type: M.all_columns_asterisk })
    },
    { name: "other_clause$ebnf$1", symbols: [] },
    { name: "other_clause$ebnf$1", symbols: ["other_clause$ebnf$1", "free_form_sql"], postprocess: (E) => E[0].concat([E[1]]) },
    {
      name: "other_clause",
      symbols: [p.has("RESERVED_CLAUSE") ? { type: "RESERVED_CLAUSE" } : RESERVED_CLAUSE, "other_clause$ebnf$1"],
      postprocess: ([E, T]) => ({
        type: M.clause,
        nameKw: Y(E),
        children: T
      })
    },
    { name: "set_operation$ebnf$1", symbols: [] },
    { name: "set_operation$ebnf$1", symbols: ["set_operation$ebnf$1", "free_form_sql"], postprocess: (E) => E[0].concat([E[1]]) },
    {
      name: "set_operation",
      symbols: [p.has("RESERVED_SET_OPERATION") ? { type: "RESERVED_SET_OPERATION" } : RESERVED_SET_OPERATION, "set_operation$ebnf$1"],
      postprocess: ([E, T]) => ({
        type: M.set_operation,
        nameKw: Y(E),
        children: T
      })
    },
    { name: "expression_chain_$ebnf$1", symbols: ["expression_with_comments_"] },
    { name: "expression_chain_$ebnf$1", symbols: ["expression_chain_$ebnf$1", "expression_with_comments_"], postprocess: (E) => E[0].concat([E[1]]) },
    { name: "expression_chain_", symbols: ["expression_chain_$ebnf$1"], postprocess: xE },
    { name: "expression_chain$ebnf$1", symbols: [] },
    { name: "expression_chain$ebnf$1", symbols: ["expression_chain$ebnf$1", "_expression_with_comments"], postprocess: (E) => E[0].concat([E[1]]) },
    {
      name: "expression_chain",
      symbols: ["expression", "expression_chain$ebnf$1"],
      postprocess: ([E, T]) => [E, ...T]
    },
    { name: "andless_expression_chain$ebnf$1", symbols: [] },
    { name: "andless_expression_chain$ebnf$1", symbols: ["andless_expression_chain$ebnf$1", "_andless_expression_with_comments"], postprocess: (E) => E[0].concat([E[1]]) },
    {
      name: "andless_expression_chain",
      symbols: ["andless_expression", "andless_expression_chain$ebnf$1"],
      postprocess: ([E, T]) => [E, ...T]
    },
    {
      name: "expression_with_comments_",
      symbols: ["expression", "_"],
      postprocess: ([E, T]) => f(E, { trailing: T })
    },
    {
      name: "_expression_with_comments",
      symbols: ["_", "expression"],
      postprocess: ([E, T]) => f(T, { leading: E })
    },
    {
      name: "_andless_expression_with_comments",
      symbols: ["_", "andless_expression"],
      postprocess: ([E, T]) => f(T, { leading: E })
    },
    { name: "free_form_sql$subexpression$1", symbols: ["asteriskless_free_form_sql"] },
    { name: "free_form_sql$subexpression$1", symbols: ["asterisk"] },
    { name: "free_form_sql", symbols: ["free_form_sql$subexpression$1"], postprocess: k },
    { name: "asteriskless_free_form_sql$subexpression$1", symbols: ["asteriskless_andless_expression"] },
    { name: "asteriskless_free_form_sql$subexpression$1", symbols: ["logic_operator"] },
    { name: "asteriskless_free_form_sql$subexpression$1", symbols: ["comma"] },
    { name: "asteriskless_free_form_sql$subexpression$1", symbols: ["comment"] },
    { name: "asteriskless_free_form_sql$subexpression$1", symbols: ["other_keyword"] },
    { name: "asteriskless_free_form_sql", symbols: ["asteriskless_free_form_sql$subexpression$1"], postprocess: k },
    { name: "expression$subexpression$1", symbols: ["andless_expression"] },
    { name: "expression$subexpression$1", symbols: ["logic_operator"] },
    { name: "expression", symbols: ["expression$subexpression$1"], postprocess: k },
    { name: "andless_expression$subexpression$1", symbols: ["asteriskless_andless_expression"] },
    { name: "andless_expression$subexpression$1", symbols: ["asterisk"] },
    { name: "andless_expression", symbols: ["andless_expression$subexpression$1"], postprocess: k },
    { name: "asteriskless_andless_expression$subexpression$1", symbols: ["atomic_expression"] },
    { name: "asteriskless_andless_expression$subexpression$1", symbols: ["between_predicate"] },
    { name: "asteriskless_andless_expression$subexpression$1", symbols: ["case_expression"] },
    { name: "asteriskless_andless_expression", symbols: ["asteriskless_andless_expression$subexpression$1"], postprocess: k },
    { name: "atomic_expression$subexpression$1", symbols: ["array_subscript"] },
    { name: "atomic_expression$subexpression$1", symbols: ["function_call"] },
    { name: "atomic_expression$subexpression$1", symbols: ["property_access"] },
    { name: "atomic_expression$subexpression$1", symbols: ["parenthesis"] },
    { name: "atomic_expression$subexpression$1", symbols: ["curly_braces"] },
    { name: "atomic_expression$subexpression$1", symbols: ["square_brackets"] },
    { name: "atomic_expression$subexpression$1", symbols: ["operator"] },
    { name: "atomic_expression$subexpression$1", symbols: ["identifier"] },
    { name: "atomic_expression$subexpression$1", symbols: ["parameter"] },
    { name: "atomic_expression$subexpression$1", symbols: ["literal"] },
    { name: "atomic_expression$subexpression$1", symbols: ["data_type"] },
    { name: "atomic_expression$subexpression$1", symbols: ["keyword"] },
    { name: "atomic_expression", symbols: ["atomic_expression$subexpression$1"], postprocess: k },
    {
      name: "array_subscript",
      symbols: [p.has("ARRAY_IDENTIFIER") ? { type: "ARRAY_IDENTIFIER" } : ARRAY_IDENTIFIER, "_", "square_brackets"],
      postprocess: ([E, T, e]) => ({
        type: M.array_subscript,
        array: f({ type: M.identifier, quoted: !1, text: E.text }, { trailing: T }),
        parenthesis: e
      })
    },
    {
      name: "array_subscript",
      symbols: [p.has("ARRAY_KEYWORD") ? { type: "ARRAY_KEYWORD" } : ARRAY_KEYWORD, "_", "square_brackets"],
      postprocess: ([E, T, e]) => ({
        type: M.array_subscript,
        array: f(Y(E), { trailing: T }),
        parenthesis: e
      })
    },
    {
      name: "function_call",
      symbols: [p.has("RESERVED_FUNCTION_NAME") ? { type: "RESERVED_FUNCTION_NAME" } : RESERVED_FUNCTION_NAME, "_", "parenthesis"],
      postprocess: ([E, T, e]) => ({
        type: M.function_call,
        nameKw: f(Y(E), { trailing: T }),
        parenthesis: e
      })
    },
    {
      name: "parenthesis",
      symbols: [{ literal: "(" }, "expressions_or_clauses", { literal: ")" }],
      postprocess: ([E, T, e]) => ({
        type: M.parenthesis,
        children: T,
        openParen: "(",
        closeParen: ")"
      })
    },
    { name: "curly_braces$ebnf$1", symbols: [] },
    { name: "curly_braces$ebnf$1", symbols: ["curly_braces$ebnf$1", "free_form_sql"], postprocess: (E) => E[0].concat([E[1]]) },
    {
      name: "curly_braces",
      symbols: [{ literal: "{" }, "curly_braces$ebnf$1", { literal: "}" }],
      postprocess: ([E, T, e]) => ({
        type: M.parenthesis,
        children: T,
        openParen: "{",
        closeParen: "}"
      })
    },
    { name: "square_brackets$ebnf$1", symbols: [] },
    { name: "square_brackets$ebnf$1", symbols: ["square_brackets$ebnf$1", "free_form_sql"], postprocess: (E) => E[0].concat([E[1]]) },
    {
      name: "square_brackets",
      symbols: [{ literal: "[" }, "square_brackets$ebnf$1", { literal: "]" }],
      postprocess: ([E, T, e]) => ({
        type: M.parenthesis,
        children: T,
        openParen: "[",
        closeParen: "]"
      })
    },
    { name: "property_access$subexpression$1", symbols: ["identifier"] },
    { name: "property_access$subexpression$1", symbols: ["array_subscript"] },
    { name: "property_access$subexpression$1", symbols: ["all_columns_asterisk"] },
    { name: "property_access$subexpression$1", symbols: ["parameter"] },
    {
      name: "property_access",
      symbols: ["atomic_expression", "_", p.has("PROPERTY_ACCESS_OPERATOR") ? { type: "PROPERTY_ACCESS_OPERATOR" } : PROPERTY_ACCESS_OPERATOR, "_", "property_access$subexpression$1"],
      postprocess: (
        // Allowing property to be <array_subscript> is currently a hack.
        // A better way would be to allow <property_access> on the left side of array_subscript,
        // but we currently can't do that because of another hack that requires
        // %ARRAY_IDENTIFIER on the left side of <array_subscript>.
        ([E, T, e, R, [t]]) => ({
          type: M.property_access,
          object: f(E, { trailing: T }),
          operator: e.text,
          property: f(t, { leading: R })
        })
      )
    },
    {
      name: "between_predicate",
      symbols: [p.has("BETWEEN") ? { type: "BETWEEN" } : BETWEEN, "_", "andless_expression_chain", "_", p.has("AND") ? { type: "AND" } : AND, "_", "andless_expression"],
      postprocess: ([E, T, e, R, t, O, s]) => ({
        type: M.between_predicate,
        betweenKw: Y(E),
        expr1: RI(e, { leading: T, trailing: R }),
        andKw: Y(t),
        expr2: [f(s, { leading: O })]
      })
    },
    { name: "case_expression$ebnf$1", symbols: ["expression_chain_"], postprocess: xE },
    { name: "case_expression$ebnf$1", symbols: [], postprocess: () => null },
    { name: "case_expression$ebnf$2", symbols: [] },
    { name: "case_expression$ebnf$2", symbols: ["case_expression$ebnf$2", "case_clause"], postprocess: (E) => E[0].concat([E[1]]) },
    {
      name: "case_expression",
      symbols: [p.has("CASE") ? { type: "CASE" } : CASE, "_", "case_expression$ebnf$1", "case_expression$ebnf$2", p.has("END") ? { type: "END" } : END],
      postprocess: ([E, T, e, R, t]) => ({
        type: M.case_expression,
        caseKw: f(Y(E), { trailing: T }),
        endKw: Y(t),
        expr: e || [],
        clauses: R
      })
    },
    {
      name: "case_clause",
      symbols: [p.has("WHEN") ? { type: "WHEN" } : WHEN, "_", "expression_chain_", p.has("THEN") ? { type: "THEN" } : THEN, "_", "expression_chain_"],
      postprocess: ([E, T, e, R, t, O]) => ({
        type: M.case_when,
        whenKw: f(Y(E), { trailing: T }),
        thenKw: f(Y(R), { trailing: t }),
        condition: e,
        result: O
      })
    },
    {
      name: "case_clause",
      symbols: [p.has("ELSE") ? { type: "ELSE" } : ELSE, "_", "expression_chain_"],
      postprocess: ([E, T, e]) => ({
        type: M.case_else,
        elseKw: f(Y(E), { trailing: T }),
        result: e
      })
    },
    { name: "comma$subexpression$1", symbols: [p.has("COMMA") ? { type: "COMMA" } : COMMA] },
    { name: "comma", symbols: ["comma$subexpression$1"], postprocess: ([[E]]) => ({ type: M.comma }) },
    { name: "asterisk$subexpression$1", symbols: [p.has("ASTERISK") ? { type: "ASTERISK" } : ASTERISK] },
    { name: "asterisk", symbols: ["asterisk$subexpression$1"], postprocess: ([[E]]) => ({ type: M.operator, text: E.text }) },
    { name: "operator$subexpression$1", symbols: [p.has("OPERATOR") ? { type: "OPERATOR" } : OPERATOR] },
    { name: "operator", symbols: ["operator$subexpression$1"], postprocess: ([[E]]) => ({ type: M.operator, text: E.text }) },
    { name: "identifier$subexpression$1", symbols: [p.has("IDENTIFIER") ? { type: "IDENTIFIER" } : IDENTIFIER] },
    { name: "identifier$subexpression$1", symbols: [p.has("QUOTED_IDENTIFIER") ? { type: "QUOTED_IDENTIFIER" } : QUOTED_IDENTIFIER] },
    { name: "identifier$subexpression$1", symbols: [p.has("VARIABLE") ? { type: "VARIABLE" } : VARIABLE] },
    { name: "identifier", symbols: ["identifier$subexpression$1"], postprocess: ([[E]]) => ({ type: M.identifier, quoted: E.type !== "IDENTIFIER", text: E.text }) },
    { name: "parameter$subexpression$1", symbols: [p.has("NAMED_PARAMETER") ? { type: "NAMED_PARAMETER" } : NAMED_PARAMETER] },
    { name: "parameter$subexpression$1", symbols: [p.has("QUOTED_PARAMETER") ? { type: "QUOTED_PARAMETER" } : QUOTED_PARAMETER] },
    { name: "parameter$subexpression$1", symbols: [p.has("NUMBERED_PARAMETER") ? { type: "NUMBERED_PARAMETER" } : NUMBERED_PARAMETER] },
    { name: "parameter$subexpression$1", symbols: [p.has("POSITIONAL_PARAMETER") ? { type: "POSITIONAL_PARAMETER" } : POSITIONAL_PARAMETER] },
    { name: "parameter$subexpression$1", symbols: [p.has("CUSTOM_PARAMETER") ? { type: "CUSTOM_PARAMETER" } : CUSTOM_PARAMETER] },
    { name: "parameter", symbols: ["parameter$subexpression$1"], postprocess: ([[E]]) => ({ type: M.parameter, key: E.key, text: E.text }) },
    { name: "literal$subexpression$1", symbols: [p.has("NUMBER") ? { type: "NUMBER" } : NUMBER] },
    { name: "literal$subexpression$1", symbols: [p.has("STRING") ? { type: "STRING" } : STRING] },
    { name: "literal", symbols: ["literal$subexpression$1"], postprocess: ([[E]]) => ({ type: M.literal, text: E.text }) },
    { name: "keyword$subexpression$1", symbols: [p.has("RESERVED_KEYWORD") ? { type: "RESERVED_KEYWORD" } : RESERVED_KEYWORD] },
    { name: "keyword$subexpression$1", symbols: [p.has("RESERVED_KEYWORD_PHRASE") ? { type: "RESERVED_KEYWORD_PHRASE" } : RESERVED_KEYWORD_PHRASE] },
    { name: "keyword$subexpression$1", symbols: [p.has("RESERVED_JOIN") ? { type: "RESERVED_JOIN" } : RESERVED_JOIN] },
    {
      name: "keyword",
      symbols: ["keyword$subexpression$1"],
      postprocess: ([[E]]) => Y(E)
    },
    { name: "data_type$subexpression$1", symbols: [p.has("RESERVED_DATA_TYPE") ? { type: "RESERVED_DATA_TYPE" } : RESERVED_DATA_TYPE] },
    { name: "data_type$subexpression$1", symbols: [p.has("RESERVED_DATA_TYPE_PHRASE") ? { type: "RESERVED_DATA_TYPE_PHRASE" } : RESERVED_DATA_TYPE_PHRASE] },
    {
      name: "data_type",
      symbols: ["data_type$subexpression$1"],
      postprocess: ([[E]]) => yT(E)
    },
    {
      name: "data_type",
      symbols: [p.has("RESERVED_PARAMETERIZED_DATA_TYPE") ? { type: "RESERVED_PARAMETERIZED_DATA_TYPE" } : RESERVED_PARAMETERIZED_DATA_TYPE, "_", "parenthesis"],
      postprocess: ([E, T, e]) => ({
        type: M.parameterized_data_type,
        dataType: f(yT(E), { trailing: T }),
        parenthesis: e
      })
    },
    { name: "logic_operator$subexpression$1", symbols: [p.has("AND") ? { type: "AND" } : AND] },
    { name: "logic_operator$subexpression$1", symbols: [p.has("OR") ? { type: "OR" } : OR] },
    { name: "logic_operator$subexpression$1", symbols: [p.has("XOR") ? { type: "XOR" } : XOR] },
    {
      name: "logic_operator",
      symbols: ["logic_operator$subexpression$1"],
      postprocess: ([[E]]) => Y(E)
    },
    { name: "other_keyword$subexpression$1", symbols: [p.has("WHEN") ? { type: "WHEN" } : WHEN] },
    { name: "other_keyword$subexpression$1", symbols: [p.has("THEN") ? { type: "THEN" } : THEN] },
    { name: "other_keyword$subexpression$1", symbols: [p.has("ELSE") ? { type: "ELSE" } : ELSE] },
    { name: "other_keyword$subexpression$1", symbols: [p.has("END") ? { type: "END" } : END] },
    {
      name: "other_keyword",
      symbols: ["other_keyword$subexpression$1"],
      postprocess: ([[E]]) => Y(E)
    },
    { name: "_$ebnf$1", symbols: [] },
    { name: "_$ebnf$1", symbols: ["_$ebnf$1", "comment"], postprocess: (E) => E[0].concat([E[1]]) },
    { name: "_", symbols: ["_$ebnf$1"], postprocess: ([E]) => E },
    {
      name: "comment",
      symbols: [p.has("LINE_COMMENT") ? { type: "LINE_COMMENT" } : LINE_COMMENT],
      postprocess: ([E]) => ({
        type: M.line_comment,
        text: E.text,
        precedingWhitespace: E.precedingWhitespace
      })
    },
    {
      name: "comment",
      symbols: [p.has("BLOCK_COMMENT") ? { type: "BLOCK_COMMENT" } : BLOCK_COMMENT],
      postprocess: ([E]) => ({
        type: M.block_comment,
        text: E.text,
        precedingWhitespace: E.precedingWhitespace
      })
    },
    {
      name: "comment",
      symbols: [p.has("DISABLE_COMMENT") ? { type: "DISABLE_COMMENT" } : DISABLE_COMMENT],
      postprocess: ([E]) => ({
        type: M.disable_comment,
        text: E.text,
        precedingWhitespace: E.precedingWhitespace
      })
    }
  ],
  ParserStart: "main"
}, { Parser: tI, Grammar: SI } = kS;
function II(E) {
  let T = {};
  const e = new te((t) => [
    ...qS(E.tokenize(t, T)),
    qT(t.length)
  ]), R = new tI(SI.fromCompiled(AI), { lexer: e });
  return {
    parse: (t, O) => {
      T = O;
      const { results: s } = R.feed(t);
      if (s.length === 1)
        return s[0];
      throw s.length === 0 ? new Error("Parse error: Invalid SQL") : new Error(`Parse error: Ambiguous grammar
${JSON.stringify(s, void 0, 2)}`);
    }
  };
}
var a;
(function(E) {
  E[E.SPACE = 0] = "SPACE", E[E.NO_SPACE = 1] = "NO_SPACE", E[E.NO_NEWLINE = 2] = "NO_NEWLINE", E[E.NEWLINE = 3] = "NEWLINE", E[E.MANDATORY_NEWLINE = 4] = "MANDATORY_NEWLINE", E[E.INDENT = 5] = "INDENT", E[E.SINGLE_INDENT = 6] = "SINGLE_INDENT";
})(a = a || (a = {}));
class Se {
  constructor(T) {
    this.indentation = T, this.items = [];
  }
  /**
   * Appends token strings and whitespace modifications to SQL string.
   */
  add(...T) {
    for (const e of T)
      switch (e) {
        case a.SPACE:
          this.items.push(a.SPACE);
          break;
        case a.NO_SPACE:
          this.trimHorizontalWhitespace();
          break;
        case a.NO_NEWLINE:
          this.trimWhitespace();
          break;
        case a.NEWLINE:
          this.trimHorizontalWhitespace(), this.addNewline(a.NEWLINE);
          break;
        case a.MANDATORY_NEWLINE:
          this.trimHorizontalWhitespace(), this.addNewline(a.MANDATORY_NEWLINE);
          break;
        case a.INDENT:
          this.addIndentation();
          break;
        case a.SINGLE_INDENT:
          this.items.push(a.SINGLE_INDENT);
          break;
        default:
          this.items.push(e);
      }
  }
  trimHorizontalWhitespace() {
    for (; OI(TE(this.items)); )
      this.items.pop();
  }
  trimWhitespace() {
    for (; NI(TE(this.items)); )
      this.items.pop();
  }
  addNewline(T) {
    if (this.items.length > 0)
      switch (TE(this.items)) {
        case a.NEWLINE:
          this.items.pop(), this.items.push(T);
          break;
        case a.MANDATORY_NEWLINE:
          break;
        default:
          this.items.push(T);
          break;
      }
  }
  addIndentation() {
    for (let T = 0; T < this.indentation.getLevel(); T++)
      this.items.push(a.SINGLE_INDENT);
  }
  /**
   * Returns the final SQL string.
   */
  toString() {
    return this.items.map((T) => this.itemToString(T)).join("");
  }
  /**
   * Returns the internal layout data
   */
  getLayoutItems() {
    return this.items;
  }
  itemToString(T) {
    switch (T) {
      case a.SPACE:
        return " ";
      case a.NEWLINE:
      case a.MANDATORY_NEWLINE:
        return `
`;
      case a.SINGLE_INDENT:
        return this.indentation.getSingleIndent();
      default:
        return T;
    }
  }
}
const OI = (E) => E === a.SPACE || E === a.SINGLE_INDENT, NI = (E) => E === a.SPACE || E === a.SINGLE_INDENT || E === a.NEWLINE;
function VT(E, T) {
  if (T === "standard")
    return E;
  let e = [];
  return E.length >= 10 && E.includes(" ") && ([E, ...e] = E.split(" ")), T === "tabularLeft" ? E = E.padEnd(9, " ") : E = E.padStart(9, " "), E + ["", ...e].join(" ");
}
function bT(E) {
  return ge(E) || E === C.RESERVED_CLAUSE || E === C.RESERVED_SELECT || E === C.RESERVED_SET_OPERATION || E === C.RESERVED_JOIN || E === C.LIMIT;
}
const vE = "top-level", sI = "block-level";
class Ie {
  /**
   * @param {string} indent A string to indent with
   */
  constructor(T) {
    this.indent = T, this.indentTypes = [];
  }
  /**
   * Returns indentation string for single indentation step.
   */
  getSingleIndent() {
    return this.indent;
  }
  /**
   * Returns current indentation level
   */
  getLevel() {
    return this.indentTypes.length;
  }
  /**
   * Increases indentation by one top-level indent.
   */
  increaseTopLevel() {
    this.indentTypes.push(vE);
  }
  /**
   * Increases indentation by one block-level indent.
   */
  increaseBlockLevel() {
    this.indentTypes.push(sI);
  }
  /**
   * Decreases indentation by one top-level indent.
   * Does nothing when the previous indent is not top-level.
   */
  decreaseTopLevel() {
    this.indentTypes.length > 0 && TE(this.indentTypes) === vE && this.indentTypes.pop();
  }
  /**
   * Decreases indentation by one block-level indent.
   * If there are top-level indents within the block-level indent,
   * throws away these as well.
   */
  decreaseBlockLevel() {
    for (; this.indentTypes.length > 0 && this.indentTypes.pop() === vE; )
      ;
  }
}
class rI extends Se {
  constructor(T) {
    super(new Ie("")), this.expressionWidth = T, this.length = 0, this.trailingSpace = !1;
  }
  add(...T) {
    if (T.forEach((e) => this.addToLength(e)), this.length > this.expressionWidth)
      throw new jE();
    super.add(...T);
  }
  addToLength(T) {
    if (typeof T == "string")
      this.length += T.length, this.trailingSpace = !1;
    else {
      if (T === a.MANDATORY_NEWLINE || T === a.NEWLINE)
        throw new jE();
      T === a.INDENT || T === a.SINGLE_INDENT || T === a.SPACE ? this.trailingSpace || (this.length++, this.trailingSpace = !0) : (T === a.NO_NEWLINE || T === a.NO_SPACE) && this.trailingSpace && (this.trailingSpace = !1, this.length--);
    }
  }
}
class jE extends Error {
}
class CE {
  constructor({ cfg: T, dialectCfg: e, params: R, layout: t, inline: O = !1 }) {
    this.inline = !1, this.nodes = [], this.index = -1, this.cfg = T, this.dialectCfg = e, this.inline = O, this.params = R, this.layout = t;
  }
  format(T) {
    for (this.nodes = T, this.index = 0; this.index < this.nodes.length; this.index++)
      this.formatNode(this.nodes[this.index]);
    return this.layout;
  }
  formatNode(T) {
    this.formatComments(T.leadingComments), this.formatNodeWithoutComments(T), this.formatComments(T.trailingComments);
  }
  formatNodeWithoutComments(T) {
    switch (T.type) {
      case M.function_call:
        return this.formatFunctionCall(T);
      case M.parameterized_data_type:
        return this.formatParameterizedDataType(T);
      case M.array_subscript:
        return this.formatArraySubscript(T);
      case M.property_access:
        return this.formatPropertyAccess(T);
      case M.parenthesis:
        return this.formatParenthesis(T);
      case M.between_predicate:
        return this.formatBetweenPredicate(T);
      case M.case_expression:
        return this.formatCaseExpression(T);
      case M.case_when:
        return this.formatCaseWhen(T);
      case M.case_else:
        return this.formatCaseElse(T);
      case M.clause:
        return this.formatClause(T);
      case M.set_operation:
        return this.formatSetOperation(T);
      case M.limit_clause:
        return this.formatLimitClause(T);
      case M.all_columns_asterisk:
        return this.formatAllColumnsAsterisk(T);
      case M.literal:
        return this.formatLiteral(T);
      case M.identifier:
        return this.formatIdentifier(T);
      case M.parameter:
        return this.formatParameter(T);
      case M.operator:
        return this.formatOperator(T);
      case M.comma:
        return this.formatComma(T);
      case M.line_comment:
        return this.formatLineComment(T);
      case M.block_comment:
        return this.formatBlockComment(T);
      case M.disable_comment:
        return this.formatBlockComment(T);
      case M.data_type:
        return this.formatDataType(T);
      case M.keyword:
        return this.formatKeywordNode(T);
    }
  }
  formatFunctionCall(T) {
    this.withComments(T.nameKw, () => {
      this.layout.add(this.showFunctionKw(T.nameKw));
    }), this.formatNode(T.parenthesis);
  }
  formatParameterizedDataType(T) {
    this.withComments(T.dataType, () => {
      this.layout.add(this.showDataType(T.dataType));
    }), this.formatNode(T.parenthesis);
  }
  formatArraySubscript(T) {
    let e;
    switch (T.array.type) {
      case M.data_type:
        e = this.showDataType(T.array);
        break;
      case M.keyword:
        e = this.showKw(T.array);
        break;
      default:
        e = this.showIdentifier(T.array);
        break;
    }
    this.withComments(T.array, () => {
      this.layout.add(e);
    }), this.formatNode(T.parenthesis);
  }
  formatPropertyAccess(T) {
    this.formatNode(T.object), this.layout.add(a.NO_SPACE, T.operator), this.formatNode(T.property);
  }
  formatParenthesis(T) {
    const e = this.formatInlineExpression(T.children);
    e ? (this.layout.add(T.openParen), this.layout.add(...e.getLayoutItems()), this.layout.add(a.NO_SPACE, T.closeParen, a.SPACE)) : (this.layout.add(T.openParen, a.NEWLINE), j(this.cfg) ? (this.layout.add(a.INDENT), this.layout = this.formatSubExpression(T.children)) : (this.layout.indentation.increaseBlockLevel(), this.layout.add(a.INDENT), this.layout = this.formatSubExpression(T.children), this.layout.indentation.decreaseBlockLevel()), this.layout.add(a.NEWLINE, a.INDENT, T.closeParen, a.SPACE));
  }
  formatBetweenPredicate(T) {
    this.layout.add(this.showKw(T.betweenKw), a.SPACE), this.layout = this.formatSubExpression(T.expr1), this.layout.add(a.NO_SPACE, a.SPACE, this.showNonTabularKw(T.andKw), a.SPACE), this.layout = this.formatSubExpression(T.expr2), this.layout.add(a.SPACE);
  }
  formatCaseExpression(T) {
    this.formatNode(T.caseKw), this.layout.indentation.increaseBlockLevel(), this.layout = this.formatSubExpression(T.expr), this.layout = this.formatSubExpression(T.clauses), this.layout.indentation.decreaseBlockLevel(), this.layout.add(a.NEWLINE, a.INDENT), this.formatNode(T.endKw);
  }
  formatCaseWhen(T) {
    this.layout.add(a.NEWLINE, a.INDENT), this.formatNode(T.whenKw), this.layout = this.formatSubExpression(T.condition), this.formatNode(T.thenKw), this.layout = this.formatSubExpression(T.result);
  }
  formatCaseElse(T) {
    this.layout.add(a.NEWLINE, a.INDENT), this.formatNode(T.elseKw), this.layout = this.formatSubExpression(T.result);
  }
  formatClause(T) {
    this.isOnelineClause(T) ? this.formatClauseInOnelineStyle(T) : j(this.cfg) ? this.formatClauseInTabularStyle(T) : this.formatClauseInIndentedStyle(T);
  }
  isOnelineClause(T) {
    return j(this.cfg) ? this.dialectCfg.tabularOnelineClauses[T.nameKw.text] : this.dialectCfg.onelineClauses[T.nameKw.text];
  }
  formatClauseInIndentedStyle(T) {
    this.layout.add(a.NEWLINE, a.INDENT, this.showKw(T.nameKw), a.NEWLINE), this.layout.indentation.increaseTopLevel(), this.layout.add(a.INDENT), this.layout = this.formatSubExpression(T.children), this.layout.indentation.decreaseTopLevel();
  }
  formatClauseInOnelineStyle(T) {
    this.layout.add(a.NEWLINE, a.INDENT, this.showKw(T.nameKw), a.SPACE), this.layout = this.formatSubExpression(T.children);
  }
  formatClauseInTabularStyle(T) {
    this.layout.add(a.NEWLINE, a.INDENT, this.showKw(T.nameKw), a.SPACE), this.layout.indentation.increaseTopLevel(), this.layout = this.formatSubExpression(T.children), this.layout.indentation.decreaseTopLevel();
  }
  formatSetOperation(T) {
    this.layout.add(a.NEWLINE, a.INDENT, this.showKw(T.nameKw), a.NEWLINE), this.layout.add(a.INDENT), this.layout = this.formatSubExpression(T.children);
  }
  formatLimitClause(T) {
    this.withComments(T.limitKw, () => {
      this.layout.add(a.NEWLINE, a.INDENT, this.showKw(T.limitKw));
    }), this.layout.indentation.increaseTopLevel(), j(this.cfg) ? this.layout.add(a.SPACE) : this.layout.add(a.NEWLINE, a.INDENT), T.offset ? (this.layout = this.formatSubExpression(T.offset), this.layout.add(a.NO_SPACE, ",", a.SPACE), this.layout = this.formatSubExpression(T.count)) : this.layout = this.formatSubExpression(T.count), this.layout.indentation.decreaseTopLevel();
  }
  formatAllColumnsAsterisk(T) {
    this.layout.add("*", a.SPACE);
  }
  formatLiteral(T) {
    this.layout.add(T.text, a.SPACE);
  }
  formatIdentifier(T) {
    this.layout.add(this.showIdentifier(T), a.SPACE);
  }
  formatParameter(T) {
    this.layout.add(this.params.get(T), a.SPACE);
  }
  formatOperator({ text: T }) {
    this.cfg.denseOperators || this.dialectCfg.alwaysDenseOperators.includes(T) ? this.layout.add(a.NO_SPACE, T) : T === ":" ? this.layout.add(a.NO_SPACE, T, a.SPACE) : this.layout.add(T, a.SPACE);
  }
  formatComma(T) {
    this.inline ? this.layout.add(a.NO_SPACE, ",", a.SPACE) : this.layout.add(a.NO_SPACE, ",", a.NEWLINE, a.INDENT);
  }
  withComments(T, e) {
    this.formatComments(T.leadingComments), e(), this.formatComments(T.trailingComments);
  }
  formatComments(T) {
    T && T.forEach((e) => {
      e.type === M.line_comment ? this.formatLineComment(e) : this.formatBlockComment(e);
    });
  }
  formatLineComment(T) {
    WE(T.precedingWhitespace || "") ? this.layout.add(a.NEWLINE, a.INDENT, T.text, a.MANDATORY_NEWLINE, a.INDENT) : this.layout.getLayoutItems().length > 0 ? this.layout.add(a.NO_NEWLINE, a.SPACE, T.text, a.MANDATORY_NEWLINE, a.INDENT) : this.layout.add(T.text, a.MANDATORY_NEWLINE, a.INDENT);
  }
  formatBlockComment(T) {
    T.type === M.block_comment && this.isMultilineBlockComment(T) ? (this.splitBlockComment(T.text).forEach((e) => {
      this.layout.add(a.NEWLINE, a.INDENT, e);
    }), this.layout.add(a.NEWLINE, a.INDENT)) : this.layout.add(T.text, a.SPACE);
  }
  isMultilineBlockComment(T) {
    return WE(T.text) || WE(T.precedingWhitespace || "");
  }
  isDocComment(T) {
    const e = T.split(/\n/);
    return (
      // first line starts with /* or /**
      /^\/\*\*?$/.test(e[0]) && // intermediate lines start with *
      e.slice(1, e.length - 1).every((R) => /^\s*\*/.test(R)) && // last line ends with */
      /^\s*\*\/$/.test(TE(e))
    );
  }
  // Breaks up block comment to multiple lines.
  // For example this doc-comment (dots representing leading whitespace):
  //
  //   ..../**
  //   .....* Some description here
  //   .....* and here too
  //   .....*/
  //
  // gets broken to this array (note the leading single spaces):
  //
  //   [ '/**',
  //     '.* Some description here',
  //     '.* and here too',
  //     '.*/' ]
  //
  // However, a normal comment (non-doc-comment) like this:
  //
  //   ..../*
  //   ....Some description here
  //   ....*/
  //
  // gets broken to this array (no leading spaces):
  //
  //   [ '/*',
  //     'Some description here',
  //     '*/' ]
  //
  splitBlockComment(T) {
    return this.isDocComment(T) ? T.split(/\n/).map((e) => /^\s*\*/.test(e) ? " " + e.replace(/^\s*/, "") : e) : T.split(/\n/).map((e) => e.replace(/^\s*/, ""));
  }
  formatSubExpression(T) {
    return new CE({
      cfg: this.cfg,
      dialectCfg: this.dialectCfg,
      params: this.params,
      layout: this.layout,
      inline: this.inline
    }).format(T);
  }
  formatInlineExpression(T) {
    const e = this.params.getPositionalParameterIndex();
    try {
      return new CE({
        cfg: this.cfg,
        dialectCfg: this.dialectCfg,
        params: this.params,
        layout: new rI(this.cfg.expressionWidth),
        inline: !0
      }).format(T);
    } catch (R) {
      if (R instanceof jE) {
        this.params.setPositionalParameterIndex(e);
        return;
      } else
        throw R;
    }
  }
  formatKeywordNode(T) {
    switch (T.tokenType) {
      case C.RESERVED_JOIN:
        return this.formatJoin(T);
      case C.AND:
      case C.OR:
      case C.XOR:
        return this.formatLogicalOperator(T);
      default:
        return this.formatKeyword(T);
    }
  }
  formatJoin(T) {
    j(this.cfg) ? (this.layout.indentation.decreaseTopLevel(), this.layout.add(a.NEWLINE, a.INDENT, this.showKw(T), a.SPACE), this.layout.indentation.increaseTopLevel()) : this.layout.add(a.NEWLINE, a.INDENT, this.showKw(T), a.SPACE);
  }
  formatKeyword(T) {
    this.layout.add(this.showKw(T), a.SPACE);
  }
  formatLogicalOperator(T) {
    this.cfg.logicalOperatorNewline === "before" ? j(this.cfg) ? (this.layout.indentation.decreaseTopLevel(), this.layout.add(a.NEWLINE, a.INDENT, this.showKw(T), a.SPACE), this.layout.indentation.increaseTopLevel()) : this.layout.add(a.NEWLINE, a.INDENT, this.showKw(T), a.SPACE) : this.layout.add(this.showKw(T), a.NEWLINE, a.INDENT);
  }
  formatDataType(T) {
    this.layout.add(this.showDataType(T), a.SPACE);
  }
  showKw(T) {
    return bT(T.tokenType) ? VT(this.showNonTabularKw(T), this.cfg.indentStyle) : this.showNonTabularKw(T);
  }
  // Like showKw(), but skips tabular formatting
  showNonTabularKw(T) {
    switch (this.cfg.keywordCase) {
      case "preserve":
        return sE(T.raw);
      case "upper":
        return T.text;
      case "lower":
        return T.text.toLowerCase();
    }
  }
  showFunctionKw(T) {
    return bT(T.tokenType) ? VT(this.showNonTabularFunctionKw(T), this.cfg.indentStyle) : this.showNonTabularFunctionKw(T);
  }
  // Like showFunctionKw(), but skips tabular formatting
  showNonTabularFunctionKw(T) {
    switch (this.cfg.functionCase) {
      case "preserve":
        return sE(T.raw);
      case "upper":
        return T.text;
      case "lower":
        return T.text.toLowerCase();
    }
  }
  showIdentifier(T) {
    if (T.quoted)
      return T.text;
    switch (this.cfg.identifierCase) {
      case "preserve":
        return T.text;
      case "upper":
        return T.text.toUpperCase();
      case "lower":
        return T.text.toLowerCase();
    }
  }
  showDataType(T) {
    switch (this.cfg.dataTypeCase) {
      case "preserve":
        return sE(T.raw);
      case "upper":
        return T.text;
      case "lower":
        return T.text.toLowerCase();
    }
  }
}
class nI {
  constructor(T, e) {
    this.dialect = T, this.cfg = e, this.params = new wS(this.cfg.params);
  }
  /**
   * Formats an SQL query.
   * @param {string} query - The SQL query string to be formatted
   * @return {string} The formatter query
   */
  format(T) {
    const e = this.parse(T);
    return this.formatAst(e).trimEnd();
  }
  parse(T) {
    return II(this.dialect.tokenizer).parse(T, this.cfg.paramTypes || {});
  }
  formatAst(T) {
    return T.map((e) => this.formatStatement(e)).join(`
`.repeat(this.cfg.linesBetweenQueries + 1));
  }
  formatStatement(T) {
    const e = new CE({
      cfg: this.cfg,
      dialectCfg: this.dialect.formatOptions,
      params: this.params,
      layout: new Se(new Ie(KS(this.cfg)))
    }).format(T.children);
    return T.hasSemicolon && (this.cfg.newlineBeforeSemicolon ? e.add(a.NEWLINE, ";") : e.add(a.NO_NEWLINE, ";")), e.toString();
  }
}
class rE extends Error {
}
function aI(E) {
  const T = [
    "multilineLists",
    "newlineBeforeOpenParen",
    "newlineBeforeCloseParen",
    "aliasAs",
    "commaPosition",
    "tabulateAlias"
  ];
  for (const e of T)
    if (e in E)
      throw new rE(`${e} config is no more supported.`);
  if (E.expressionWidth <= 0)
    throw new rE(`expressionWidth config must be positive number. Received ${E.expressionWidth} instead.`);
  if (E.params && !CI(E.params) && console.warn('WARNING: All "params" option values should be strings.'), E.paramTypes && !LI(E.paramTypes))
    throw new rE("Empty regex given in custom paramTypes. That would result in matching infinite amount of parameters.");
  return E;
}
function CI(E) {
  return (E instanceof Array ? E : Object.values(E)).every((e) => typeof e == "string");
}
function LI(E) {
  return E.custom && Array.isArray(E.custom) ? E.custom.every((T) => T.regex !== "") : !0;
}
var oI = function(E, T) {
  var e = {};
  for (var R in E) Object.prototype.hasOwnProperty.call(E, R) && T.indexOf(R) < 0 && (e[R] = E[R]);
  if (E != null && typeof Object.getOwnPropertySymbols == "function")
    for (var t = 0, R = Object.getOwnPropertySymbols(E); t < R.length; t++)
      T.indexOf(R[t]) < 0 && Object.prototype.propertyIsEnumerable.call(E, R[t]) && (e[R[t]] = E[R[t]]);
  return e;
};
const Oe = {
  bigquery: "bigquery",
  clickhouse: "clickhouse",
  db2: "db2",
  db2i: "db2i",
  duckdb: "duckdb",
  hive: "hive",
  mariadb: "mariadb",
  mysql: "mysql",
  n1ql: "n1ql",
  plsql: "plsql",
  postgresql: "postgresql",
  redshift: "redshift",
  spark: "spark",
  sqlite: "sqlite",
  sql: "sql",
  tidb: "tidb",
  trino: "trino",
  transactsql: "transactsql",
  tsql: "transactsql",
  singlestoredb: "singlestoredb",
  snowflake: "snowflake"
}, iI = Object.keys(Oe), _I = {
  tabWidth: 2,
  useTabs: !1,
  keywordCase: "preserve",
  identifierCase: "preserve",
  dataTypeCase: "preserve",
  functionCase: "preserve",
  indentStyle: "standard",
  logicalOperatorNewline: "before",
  expressionWidth: 50,
  linesBetweenQueries: 1,
  denseOperators: !1,
  newlineBeforeSemicolon: !1
}, DI = (E, T = {}) => {
  if (typeof T.language == "string" && !iI.includes(T.language))
    throw new rE(`Unsupported SQL dialect: ${T.language}`);
  const e = Oe[T.language || "sql"];
  return PI(E, Object.assign(Object.assign({}, T), { dialect: GS[e] }));
}, PI = (E, T) => {
  var { dialect: e } = T, R = oI(T, ["dialect"]);
  if (typeof E != "string")
    throw new Error("Invalid query argument. Expected string, instead got " + typeof E);
  const t = aI(Object.assign(Object.assign({}, _I), R));
  return new nI(xS(e), t).format(E);
};
function lI(E) {
  if (!E || typeof E != "string")
    return "";
  try {
    return DI(E, {
      language: "postgresql",
      tabWidth: 2,
      keywordCase: "upper",
      linesBetweenQueries: 1
    });
  } catch {
    return E;
  }
}
function MI(E, T = !1) {
  if (!E || typeof E != "string")
    return "";
  const e = T ? lI(E) : E;
  return aE.highlight(e, aE.languages.sql, "sql");
}
function eE(E, T = !0) {
  let e;
  if (typeof E == "string")
    try {
      const R = JSON.parse(E);
      e = T ? JSON.stringify(R, null, 2) : E;
    } catch {
      e = E;
    }
  else
    try {
      e = JSON.stringify(E, null, T ? 2 : 0);
    } catch {
      e = String(E ?? "");
    }
  return aE.highlight(e, aE.languages.json, "json");
}
function UI(E) {
  const T = String(E ?? "GET").trim().toUpperCase(), e = T || "GET", R = T.replace(/[^A-Z]/g, "") || "GET";
  return { display: e, classToken: R };
}
function cI(E, T) {
  return E.id ? E.id : `${E.timestamp || ""}-${T}`;
}
function uI(E, T, e) {
  return `
    <div class="${e.panelControls}">
      <label class="${e.sortToggle}">
        <input type="checkbox" data-sort-toggle="${E}" ${T ? "checked" : ""}>
        <span>Newest first</span>
      </label>
    </div>
  `;
}
function dI(E, T, e = {}) {
  const { maskPlaceholder: R = "***", maxDetailLength: t } = e, O = [], s = [];
  if (E.id && s.push(`<span>ID: <code>${D(E.id)}</code></span>`), E.remote_ip && s.push(`<span>IP: <code>${D(E.remote_ip)}</code></span>`), E.content_type && s.push(`<span>Content-Type: <code>${D(E.content_type)}</code></span>`), s.length > 0 && O.push(`<div class="${T.detailMetadataLine}">${s.join("")}</div>`), E.headers && Object.keys(E.headers).length > 0) {
    const N = Object.entries(E.headers).map(([o, A]) => {
      const I = t && A.length > t ? nE(A, t) : A, L = A === R ? ` <span class="${T.detailMasked}">(masked)</span>` : "";
      return `<dt>${D(o)}</dt><dd>${D(I)}${L}</dd>`;
    }).join("");
    O.push(`
      <div class="${T.detailSection}">
        <span class="${T.detailLabel}">Request Headers</span>
        <dl class="${T.detailKeyValueTable}">${N}</dl>
      </div>
    `);
  }
  if (E.query && Object.keys(E.query).length > 0) {
    const N = Object.entries(E.query).map(([o, A]) => {
      const I = A === R ? ` <span class="${T.detailMasked}">(masked)</span>` : "";
      return `<dt>${D(o)}</dt><dd>${D(A)}${I}</dd>`;
    }).join("");
    O.push(`
      <div class="${T.detailSection}">
        <span class="${T.detailLabel}">Query Parameters</span>
        <dl class="${T.detailKeyValueTable}">${N}</dl>
      </div>
    `);
  }
  if (E.request_body) {
    const N = E.request_size ? ` (${IT(E.request_size)})` : "", o = E.body_truncated ? ' <span class="' + T.detailMasked + '">(truncated)</span>' : "";
    let A;
    try {
      const I = JSON.parse(E.request_body);
      A = eE(I, !0);
    } catch {
      A = D(E.request_body);
    }
    O.push(`
      <div class="${T.detailSection}">
        <span class="${T.detailLabel}">Request Body${N}${o}</span>
        <div class="${T.detailBody}">
          <pre>${A}</pre>
        </div>
        <button class="${T.copyBtnSm}" data-copy-trigger="${D(E.request_body)}">Copy</button>
      </div>
    `);
  }
  if (E.response_headers && Object.keys(E.response_headers).length > 0) {
    const N = Object.entries(E.response_headers).map(([o, A]) => {
      const I = t && A.length > t ? nE(A, t) : A;
      return `<dt>${D(o)}</dt><dd>${D(I)}</dd>`;
    }).join("");
    O.push(`
      <div class="${T.detailSection}">
        <span class="${T.detailLabel}">Response Headers</span>
        <dl class="${T.detailKeyValueTable}">${N}</dl>
      </div>
    `);
  }
  if (E.response_body) {
    const N = E.response_size ? ` (${IT(E.response_size)})` : "";
    let o;
    try {
      const A = JSON.parse(E.response_body);
      o = eE(A, !0);
    } catch {
      o = D(E.response_body);
    }
    O.push(`
      <div class="${T.detailSection}">
        <span class="${T.detailLabel}">Response Body${N}</span>
        <div class="${T.detailBody}">
          <pre>${o}</pre>
        </div>
        <button class="${T.copyBtnSm}" data-copy-trigger="${D(E.response_body)}">Copy</button>
      </div>
    `);
  }
  return E.error && O.push(`
      <div class="${T.detailSection}">
        <div class="${T.detailError}">${D(E.error)}</div>
      </div>
    `), O.length === 0 ? `<div class="${T.detailPane}"><span class="${T.muted}">No additional details available</span></div>` : `<div class="${T.detailPane}">${O.join("")}</div>`;
}
function pI(E, T, e, R) {
  const { display: t, classToken: O } = UI(E.method), s = E.path || "", N = E.status || 0, o = zE(E.duration, R.slowThresholdMs), A = cI(E, T), I = R.expandedRequestIds?.has(A) || !1, L = e.badgeMethod(O), i = e.badgeStatus(N), H = o.isSlow ? e.durationSlow : "", c = N >= 400 ? e.rowError : "", G = R.truncatePath ? nE(s, R.maxPathLength || 50) : s;
  let u = "";
  const B = t;
  if (B === "POST" || B === "PUT" || B === "PATCH") {
    const U = (E.content_type || E.headers?.["Content-Type"] || E.headers?.["content-type"] || "").split(";")[0].trim();
    U && (u = ` <span class="${e.badgeContentType}">${D(U)}</span>`);
  }
  const r = `<span class="${e.expandIcon}" data-expand-icon>${I ? "▼" : "▶"}</span>`, n = I ? "table-row" : "none", _ = dI(E, e, {
    maskPlaceholder: R.maskPlaceholder,
    maxDetailLength: R.maxDetailLength
  }), P = I ? _ : `<template data-request-detail-template>${_}</template>`;
  return `
    <tr class="${c}" data-request-id="${D(A)}" style="cursor:pointer">
      <td>${r}<span class="${L}">${D(t)}</span>${u}</td>
      <td class="${e.path}" title="${D(s)}">${D(G)}</td>
      <td><span class="${i}">${D(N || "-")}</span></td>
      <td class="${e.duration} ${H}">${o.text}</td>
      <td class="${e.timestamp}">${D(RE(E.timestamp))}</td>
    </tr>
    <tr class="${e.detailRow}" data-detail-for="${D(A)}" style="display:${n}">
      <td colspan="5">${P}</td>
    </tr>
  `;
}
function $E(E, T, e = {}) {
  const {
    newestFirst: R = !0,
    slowThresholdMs: t = 50,
    maxEntries: O,
    showSortToggle: s = !1,
    truncatePath: N = !0,
    maxPathLength: o = 50
  } = e, A = s ? uI("requests", R, T) : "";
  if (!E.length)
    return A + `<div class="${T.emptyState}">No requests captured</div>`;
  const I = O ? Math.max(0, E.length - O) : 0;
  let i = (O ? E.slice(-O) : E).map((c, G) => ({ entry: c, originalIndex: I + G }));
  R && (i = [...i].reverse());
  const H = i.map(
    ({ entry: c, originalIndex: G }) => pI(c, G, T, {
      ...e,
      slowThresholdMs: t,
      truncatePath: N,
      maxPathLength: o
    })
  ).join("");
  return `
    ${A}
    <table class="${T.table}" data-request-table>
      <thead>
        <tr>
          <th>Method</th>
          <th>Path</th>
          <th>Status</th>
          <th>Duration</th>
          <th>Time</th>
        </tr>
      </thead>
      <tbody>${H}</tbody>
    </table>
  `;
}
function GI(E, T, e) {
  return `
    <div class="${e.panelControls}">
      <label class="${e.sortToggle}">
        <input type="checkbox" data-sort-toggle="${E}" ${T ? "checked" : ""}>
        <span>Newest first</span>
      </label>
    </div>
  `;
}
function HI(E) {
  return `
    <div class="${E.sqlToolbar}" data-sql-toolbar>
      <span data-sql-selected-count>0 selected</span>
      <button class="${E.sqlToolbarBtn}" data-sql-export="clipboard" title="Copy selected queries to clipboard">
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
        Copy
      </button>
      <button class="${E.sqlToolbarBtn}" data-sql-export="download" title="Download selected queries as .sql file">
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="7 10 12 15 17 10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
        Download .sql
      </button>
      <button class="${E.sqlToolbarBtn}" data-sql-clear-selection title="Clear selection">
        Clear
      </button>
    </div>
  `;
}
function BI(E, T, e) {
  return T ? `
      <button class="${E.copyBtnSm}" data-copy-trigger="${e}" title="Copy SQL">
        <i class="iconoir-copy"></i> Copy
      </button>
    ` : `
    <button class="${E.copyBtn}" data-copy-trigger title="Copy SQL">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
      </svg>
      Copy
    </button>
  `;
}
function mI(E, T, e, R) {
  const t = zE(E.duration, R.slowThresholdMs), O = t.isSlow, s = !!E.error, N = `sql-row-${T}`, o = E.query || "", A = MI(o, !0), I = [e.expandableRow];
  O && I.push(e.slowQuery), s && I.push(e.errorQuery);
  const L = O ? e.durationSlow : "", i = BI(e, R.useIconCopyButton || !1, N);
  return `
    <tr class="${I.join(" ")}" data-row-id="${N}">
      <td class="${e.selectCell}"><input type="checkbox" class="sql-select-row" data-sql-index="${T}"></td>
      <td class="${e.duration} ${L}">${t.text}</td>
      <td>${D(LE(E.row_count ?? "-"))}</td>
      <td class="${e.timestamp}">${D(RE(E.timestamp))}</td>
      <td>${s ? `<span class="${e.badgeError}">Error</span>` : ""}</td>
      <td class="${e.queryText}"><span class="${e.expandIcon}">&#9654;</span>${D(o)}</td>
    </tr>
    <tr class="${e.expansionRow}" data-expansion-for="${N}">
      <td colspan="6">
        <div class="${e.expandedContent}" data-copy-content="${D(o)}">
          <div class="${e.expandedContentHeader}">
            ${i}
          </div>
          <pre>${A}</pre>
        </div>
      </td>
    </tr>
  `;
}
function KE(E, T, e = {}) {
  const {
    newestFirst: R = !0,
    slowThresholdMs: t = 50,
    maxEntries: O = 50,
    showSortToggle: s = !1,
    useIconCopyButton: N = !1
  } = e, o = s ? GI("sql", R, T) : "", A = HI(T);
  if (!E.length)
    return o + `<div class="${T.emptyState}">No SQL queries captured</div>`;
  let I = O ? E.slice(-O) : E;
  R && (I = [...I].reverse());
  const L = I.map(
    (i, H) => mI(i, H, T, {
      ...e,
      slowThresholdMs: t,
      useIconCopyButton: N
    })
  ).join("");
  return `
    ${o}
    ${A}
    <table class="${T.table}">
      <thead>
        <tr>
          <th class="${T.selectCell}"><input type="checkbox" class="sql-select-all"></th>
          <th>Duration</th>
          <th>Rows</th>
          <th>Time</th>
          <th>Status</th>
          <th>Query</th>
        </tr>
      </thead>
      <tbody>${L}</tbody>
    </table>
  `;
}
function FI(E, T, e) {
  return `
    <div class="${e.panelControls}">
      <label class="${e.sortToggle}">
        <input type="checkbox" data-sort-toggle="${E}" ${T ? "checked" : ""}>
        <span>Newest first</span>
      </label>
    </div>
  `;
}
function hI(E, T, e) {
  const R = E.level || "INFO", t = String(R).toUpperCase(), O = wT(String(R)), s = E.message || "", N = E.source || "", o = T.badgeLevel(O), I = O === "error" ? T.rowError : "", L = e.truncateMessage ? nE(s, e.maxMessageLength || 100) : s, i = e.showSource ? `<td class="${T.timestamp}">${D(N)}</td>` : "";
  return `
    <tr class="${I}">
      <td><span class="${o}">${D(t)}</span></td>
      <td class="${T.timestamp}">${D(RE(E.timestamp))}</td>
      <td class="${T.message}" title="${D(s)}">${D(L)}</td>
      ${i}
    </tr>
  `;
}
function wE(E, T, e = {}) {
  const {
    newestFirst: R = !0,
    maxEntries: t = 100,
    showSortToggle: O = !1,
    showSource: s = !1,
    truncateMessage: N = !0,
    maxMessageLength: o = 100
  } = e, A = O ? FI("logs", R, T) : "";
  if (!E.length)
    return A + `<div class="${T.emptyState}">No logs captured</div>`;
  let I = t ? E.slice(-t) : E;
  R && (I = [...I].reverse());
  const L = I.map(
    (H) => hI(H, T, {
      ...e,
      showSource: s,
      truncateMessage: N,
      maxMessageLength: o
    })
  ).join(""), i = s ? "<th>Source</th>" : "";
  return `
    ${A}
    <table class="${T.table}">
      <thead>
        <tr>
          <th>Level</th>
          <th>Time</th>
          <th>Message</th>
          ${i}
        </tr>
      </thead>
      <tbody>${L}</tbody>
    </table>
  `;
}
function YI(E, T, e) {
  const R = E.method || "GET", t = E.path || "", O = E.handler || "-", s = E.name || "", N = T.badgeMethod(R), o = e.showName ? `<td class="${T.timestamp}">${D(s)}</td>` : "";
  return `
    <tr>
      <td><span class="${N}">${D(R)}</span></td>
      <td class="${T.path}">${D(t)}</td>
      <td>${D(O)}</td>
      ${o}
    </tr>
  `;
}
function JE(E, T, e = {}) {
  const { showName: R = !1 } = e;
  if (!E.length)
    return `<div class="${T.emptyState}">No routes available</div>`;
  const t = E.map((s) => YI(s, T, { showName: R })).join(""), O = R ? "<th>Name</th>" : "";
  return `
    <table class="${T.tableRoutes || T.table}">
      <thead>
        <tr>
          <th>Method</th>
          <th>Path</th>
          <th>Handler</th>
          ${O}
        </tr>
      </thead>
      <tbody>${t}</tbody>
    </table>
  `;
}
function Ne(E, T, e) {
  return T ? `
      <button class="${E.copyBtn}" data-copy-trigger="${e}" title="Copy to clipboard">
        <i class="iconoir-copy"></i> Copy
      </button>
    ` : `
    <button class="${E.copyBtn}" data-copy-trigger title="Copy JSON">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
      </svg>
      Copy
    </button>
  `;
}
function v(E, T, e, R = {}) {
  const {
    useIconCopyButton: t = !1,
    filterFn: O,
    showCount: s = !0
  } = R, N = T && typeof T == "object" && !Array.isArray(T), o = Array.isArray(T);
  let A = T ?? {};
  if (N && O && (A = O(T)), N && Object.keys(A).length === 0 || o && A.length === 0 || !N && !o && !A)
    return `<div class="${e.emptyState}">No ${E.toLowerCase()} data available</div>`;
  const L = AE(A), i = eE(A, !0), H = KT(A), c = o ? "items" : N ? "keys" : "entries", G = `copy-${E.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`, u = Ne(e, t, G), B = s ? `<span class="${e.muted}">${LE(H)} ${c}</span>` : "";
  return `
    <section class="${e.jsonPanel}" data-copy-content="${D(L)}">
      <div class="${e.jsonHeader}">
        <span class="${e.jsonViewerTitle}">${D(E)}</span>
        <div class="${e.jsonActions}">
          ${B}
          ${u}
        </div>
      </div>
      <pre>${i}</pre>
    </section>
  `;
}
function gO(E, T, e = {}) {
  const { useIconCopyButton: R = !1 } = e;
  if (!E || typeof E == "object" && Object.keys(E).length === 0)
    return "";
  const t = AE(E), O = eE(E, !0), s = Ne(T, R, `viewer-${Date.now()}`);
  return `
    <div class="${T.jsonViewer}" data-copy-content="${D(t)}">
      <div class="${T.jsonViewerHeader}">
        ${s}
      </div>
      <pre>${O}</pre>
    </div>
  `;
}
function fI(E, T) {
  return T ? `
      <button class="${E.copyBtn}" data-copy-trigger="custom-data" title="Copy to clipboard">
        <i class="iconoir-copy"></i> Copy
      </button>
    ` : `
    <button class="${E.copyBtn}" data-copy-trigger title="Copy JSON">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
      </svg>
      Copy
    </button>
  `;
}
function gI(E, T) {
  return `
    <tr>
      <td><span class="${T.badgeCustom}">${D(E.category || "custom")}</span></td>
      <td class="${T.timestamp}">${D(RE(E.timestamp))}</td>
      <td class="${T.message}">${D(E.message || "")}</td>
    </tr>
  `;
}
function yI(E, T, e) {
  const { useIconCopyButton: R = !1, showCount: t = !0 } = e, O = AE(E), s = eE(E, !0), N = fI(T, R), o = t ? `<span class="${T.muted}">${LE(KT(E))} keys</span>` : "";
  return `
    <div class="${T.jsonPanel}" data-copy-content="${D(O)}">
      <div class="${T.jsonHeader}">
        <span class="${T.jsonViewerTitle}">Custom Data</span>
        <div class="${T.jsonActions}">
          ${o}
          ${N}
        </div>
      </div>
      <div class="${T.jsonContent}">
        <pre>${s}</pre>
      </div>
    </div>
  `;
}
function VI(E, T, e) {
  const { maxLogEntries: R = 50 } = e;
  if (!E.length)
    return `<div class="${T.emptyState}">No custom logs yet.</div>`;
  const O = E.slice(-R).reverse().map((s) => gI(s, T)).join("");
  return `
    <table class="${T.table}">
      <thead>
        <tr>
          <th>Category</th>
          <th>Time</th>
          <th>Message</th>
        </tr>
      </thead>
      <tbody>${O}</tbody>
    </table>
  `;
}
function kE(E, T, e = {}) {
  const { dataFilterFn: R } = e, t = E.data || {}, O = R ? R(t) : t, s = E.logs || [], N = Object.keys(O).length > 0, o = s.length > 0;
  if (!N && !o)
    return `<div class="${T.emptyState}">No custom data captured</div>`;
  let A = "";
  return N && (A += yI(O, T, e)), o && (A += `
      <div class="${T.jsonPanel}">
        <div class="${T.jsonHeader}">
          <span class="${T.jsonViewerTitle}">Custom Logs</span>
          <span class="${T.muted}">${LE(s.length)} entries</span>
        </div>
        <div class="${T.jsonContent}">
          ${VI(s, T, e)}
        </div>
      </div>
    `), N && o ? `<div class="${T.jsonGrid}">${A}</div>` : A;
}
function bI(E) {
  switch ((E || "").toLowerCase()) {
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
function WI(E) {
  switch ((E || "").toLowerCase()) {
    case "uncaught":
      return "Uncaught";
    case "unhandled_rejection":
      return "Rejection";
    case "console_error":
      return "Console";
    case "network_error":
      return "Network";
    default:
      return E || "Error";
  }
}
function XI(E, T, e) {
  const R = WI(E.type), t = bI(E.type), O = T.badgeLevel(t), s = E.message || "", N = E.source || "", o = !!E.stack, A = E.type === "network_error" && E.extra?.request_url ? String(E.extra.request_url) : N && E.line ? `${N}:${E.line}${E.column ? ":" + E.column : ""}` : N || "", I = o ? `<span class="${T.expandIcon}">&#9654;</span>` : "", L = o ? T.expandableRow : "", i = e.compact ? D(s.length > 100 ? s.slice(0, 100) + "..." : s) : D(s), H = !e.compact && A ? `<td class="${T.timestamp}" title="${D(A)}">${D(
    A.length > 60 ? "..." + A.slice(-57) : A
  )}</td>` : "", c = !e.compact && E.url ? `<td class="${T.timestamp}" title="${D(E.url)}">${D(
    E.url.length > 40 ? "..." + E.url.slice(-37) : E.url
  )}</td>` : "";
  let G = "";
  return o && (G = `
      <tr class="${T.expansionRow}">
        <td colspan="${e.compact ? 3 : 5}">
          <div class="${T.expandedContent}">
            <pre style="margin:0;white-space:pre-wrap;word-break:break-all;font-size:0.8em;opacity:0.85">${D(E.stack)}</pre>
          </div>
        </td>
      </tr>
    `), `
    <tr class="${T.rowError} ${L}">
      <td>${I}<span class="${O}">${D(R)}</span></td>
      <td class="${T.timestamp}">${D(RE(E.timestamp))}</td>
      <td class="${T.message}" title="${D(s)}">${i}</td>
      ${H}
      ${c}
    </tr>
    ${G}
  `;
}
function xI(E, T) {
  return `
    <div class="${T.panelControls}">
      <label class="${T.sortToggle}">
        <input type="checkbox" data-sort-toggle="jserrors" ${E ? "checked" : ""}>
        <span>Newest first</span>
      </label>
    </div>
  `;
}
function qE(E, T, e = {}) {
  const {
    newestFirst: R = !0,
    maxEntries: t = 100,
    compact: O = !1,
    showSortToggle: s = !1
  } = e, N = s ? xI(R, T) : "";
  if (!E.length)
    return N + `<div class="${T.emptyState}">No JS errors captured</div>`;
  let o = t ? E.slice(-t) : E;
  R && (o = [...o].reverse());
  const A = o.map((i) => XI(i, T, { ...e, compact: O })).join(""), I = O ? "" : "<th>Location</th>", L = O ? "" : "<th>Page</th>";
  return `
    ${N}
    <table class="${T.table}">
      <thead>
        <tr>
          <th>Type</th>
          <th>Time</th>
          <th>Message</th>
          ${I}
          ${L}
        </tr>
      </thead>
      <tbody>${A}</tbody>
    </table>
  `;
}
function TT(E) {
  switch (E) {
    case "healthy":
      return {
        label: "Healthy",
        color: "#22c55e",
        bgColor: "rgba(34, 197, 94, 0.1)",
        icon: "✓"
        // checkmark
      };
    case "missing_grants":
      return {
        label: "Missing Grants",
        color: "#ef4444",
        bgColor: "rgba(239, 68, 68, 0.1)",
        icon: "✗"
        // x mark
      };
    case "claims_stale":
      return {
        label: "Claims Stale",
        color: "#f97316",
        bgColor: "rgba(249, 115, 22, 0.1)",
        icon: "⚠"
        // warning
      };
    case "scope_mismatch":
      return {
        label: "Scope/Policy Mismatch",
        color: "#eab308",
        bgColor: "rgba(234, 179, 8, 0.1)",
        icon: "⚠"
        // warning
      };
    case "error":
      return {
        label: "Error",
        color: "#ef4444",
        bgColor: "rgba(239, 68, 68, 0.1)",
        icon: "✗"
        // x mark
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
function vI(E) {
  switch (E) {
    case "ok":
      return { color: "#22c55e", bgColor: "rgba(34, 197, 94, 0.15)" };
    case "error":
      return { color: "#ef4444", bgColor: "rgba(239, 68, 68, 0.15)" };
    case "warning":
      return { color: "#f97316", bgColor: "rgba(249, 115, 22, 0.15)" };
    case "info":
    default:
      return { color: "#6b7280", bgColor: "rgba(107, 114, 128, 0.15)" };
  }
}
function $I(E) {
  const T = TT(E.verdict), e = E.user_info || {};
  let R = "";
  return (e.username || e.user_id) && (R = `
      <div style="display: flex; gap: 12px; font-size: 12px; color: #94a3b8; margin-top: 8px;">
        ${e.username ? `<span>User: <strong style="color: #e2e8f0;">${D(e.username)}</strong></span>` : ""}
        ${e.role ? `<span>Role: <strong style="color: #e2e8f0;">${D(e.role)}</strong></span>` : ""}
        ${e.tenant_id ? `<span>Tenant: <strong style="color: #e2e8f0;">${D(e.tenant_id)}</strong></span>` : ""}
        ${e.org_id ? `<span>Org: <strong style="color: #e2e8f0;">${D(e.org_id)}</strong></span>` : ""}
      </div>
    `), `
    <div style="
      background: ${T.bgColor};
      border: 1px solid ${T.color}40;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 16px;
    ">
      <div style="display: flex; align-items: center; gap: 12px;">
        <span style="
          font-size: 24px;
          color: ${T.color};
        ">${T.icon}</span>
        <div>
          <div style="
            font-size: 18px;
            font-weight: 600;
            color: ${T.color};
          ">${T.label}</div>
        </div>
      </div>
      ${R}
    </div>
  `;
}
function KI(E) {
  const T = E.summary || { module_count: 0, required_keys: 0, claims_keys: 0, missing_keys: 0 };
  return `
    <div style="
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      margin-bottom: 16px;
    ">
      ${[
    { label: "Modules", value: T.module_count, color: "#3b82f6" },
    { label: "Required", value: T.required_keys, color: "#8b5cf6" },
    { label: "In Claims", value: T.claims_keys, color: "#22c55e" },
    { label: "Missing", value: T.missing_keys, color: T.missing_keys > 0 ? "#ef4444" : "#6b7280" }
  ].map(
    (R) => `
        <div style="
          background: ${R.color}20;
          border: 1px solid ${R.color}40;
          border-radius: 6px;
          padding: 8px 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          min-width: 80px;
        ">
          <span style="font-size: 20px; font-weight: 700; color: ${R.color};">${R.value}</span>
          <span style="font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">${R.label}</span>
        </div>
      `
  ).join("")}
    </div>
  `;
}
function wI(E, T) {
  const e = vI(E.status), R = (t) => t ? '<span style="color: #22c55e; font-weight: bold;">✓</span>' : '<span style="color: #ef4444; font-weight: bold;">✗</span>';
  return `
    <tr style="border-bottom: 1px solid #334155;">
      <td style="padding: 10px 12px; font-family: monospace; font-size: 12px; color: #e2e8f0;">
        ${D(E.permission)}
        ${E.module ? `<span style="color: #64748b; font-size: 10px; margin-left: 8px;">(${D(E.module)})</span>` : ""}
      </td>
      <td style="padding: 10px 12px; text-align: center;">${R(E.required)}</td>
      <td style="padding: 10px 12px; text-align: center;">${R(E.in_claims)}</td>
      <td style="padding: 10px 12px; text-align: center;">${R(E.allows)}</td>
      <td style="padding: 10px 12px;">
        <span style="
          display: inline-block;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 11px;
          background: ${e.bgColor};
          color: ${e.color};
        ">${D(E.diagnosis)}</span>
      </td>
    </tr>
  `;
}
function JI(E) {
  const T = E.entries || [];
  return T.length === 0 ? `
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
              <th style="padding: 10px 12px; text-align: center; color: #94a3b8; font-weight: 600; width: 80px;">In Claims</th>
              <th style="padding: 10px 12px; text-align: center; color: #94a3b8; font-weight: 600; width: 80px;">Allows</th>
              <th style="padding: 10px 12px; text-align: left; color: #94a3b8; font-weight: 600;">Diagnosis</th>
            </tr>
          </thead>
          <tbody>
            ${T.map((e, R) => wI(e)).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}
function kI(E) {
  const T = E.next_actions || [];
  return T.length === 0 ? "" : `
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
        <span style="color: ${TT(E.verdict).color};">Next Actions</span>
      </h3>
      <ul style="
        margin: 0;
        padding: 0 0 0 20px;
        color: #cbd5e1;
        font-size: 13px;
        line-height: 1.6;
      ">
        ${T.map((R) => R.startsWith("  -") ? `<li style="margin-left: 20px; color: #94a3b8;">${D(R.trim().slice(2))}</li>` : `<li>${D(R)}</li>`).join("")}
      </ul>
    </div>
  `;
}
function qI(E) {
  const T = AE(E);
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
        ">${D(T)}</pre>
      </div>
    </details>
  `;
}
function WT(E, T, e = {}) {
  const { showRawJSON: R = !0, showCollapsible: t = !0 } = e;
  return E ? `
    <div style="padding: 8px;">
      ${$I(E)}
      ${KI(E)}
      ${JI(E)}
      ${kI(E)}
      ${R ? qI(E) : ""}
    </div>
  ` : `<div class="${T.emptyState}">No permissions data available</div>`;
}
function QI(E, T) {
  if (!E)
    return `<div class="${T.emptyState}">No permissions data</div>`;
  const e = TT(E.verdict), R = E.summary || { required_keys: 0, claims_keys: 0, missing_keys: 0 };
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
          color: ${e.color};
        ">${e.icon}</span>
        <span style="
          font-size: 14px;
          font-weight: 600;
          color: ${e.color};
        ">${e.label}</span>
      </div>
      <div style="
        display: flex;
        gap: 16px;
        font-size: 12px;
        color: #94a3b8;
      ">
        <span>Required: <strong style="color: #e2e8f0;">${R.required_keys}</strong></span>
        <span>Claims: <strong style="color: #e2e8f0;">${R.claims_keys}</strong></span>
        <span>Missing: <strong style="color: ${R.missing_keys > 0 ? "#ef4444" : "#e2e8f0"};">${R.missing_keys}</strong></span>
      </div>
    </div>
  `;
}
function eT(E) {
  switch ((E || "").toLowerCase()) {
    case "error":
      return {
        label: "Error",
        color: "#ef4444",
        bgColor: "rgba(239, 68, 68, 0.1)",
        borderColor: "rgba(239, 68, 68, 0.4)",
        icon: "✗"
        // ✗
      };
    case "warn":
      return {
        label: "Warning",
        color: "#f59e0b",
        bgColor: "rgba(245, 158, 11, 0.1)",
        borderColor: "rgba(245, 158, 11, 0.4)",
        icon: "⚠"
        // ⚠
      };
    case "info":
      return {
        label: "Info",
        color: "#3b82f6",
        bgColor: "rgba(59, 130, 246, 0.1)",
        borderColor: "rgba(59, 130, 246, 0.4)",
        icon: "ℹ"
        // ℹ
      };
    default:
      return {
        label: "OK",
        color: "#22c55e",
        bgColor: "rgba(34, 197, 94, 0.1)",
        borderColor: "rgba(34, 197, 94, 0.4)",
        icon: "✓"
        // ✓
      };
  }
}
function ZI(E) {
  switch ((E || "").toLowerCase()) {
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
function jI(E) {
  const T = eT(E.verdict), e = ZI(E.verdict);
  return `
    <div style="
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 16px;
      background: ${T.bgColor};
      border: 1px solid ${T.borderColor};
      border-radius: 8px;
    ">
      <span style="
        font-size: 24px;
        color: ${T.color};
        line-height: 1;
      ">${T.icon}</span>
      <div>
        <div style="
          font-size: 16px;
          font-weight: 600;
          color: ${T.color};
        ">${D(e)}</div>
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
function zI(E) {
  const T = E || { checks: 0, ok: 0, info: 0, warn: 0, error: 0 };
  return `
    <div style="
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    ">
      ${[
    { label: "Total", value: T.checks || 0, color: "#64748b" },
    { label: "OK", value: T.ok || 0, color: "#22c55e" },
    { label: "Info", value: T.info || 0, color: "#3b82f6" },
    { label: "Warn", value: T.warn || 0, color: T.warn ? "#f59e0b" : "#64748b" },
    { label: "Error", value: T.error || 0, color: T.error ? "#ef4444" : "#64748b" }
  ].map(
    (R) => `
        <div style="
          background: ${R.color}15;
          border: 1px solid ${R.color}30;
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
            color: ${R.color};
            line-height: 1.2;
          ">${R.value}</span>
          <span style="
            font-size: 10px;
            color: #94a3b8;
            text-transform: uppercase;
            letter-spacing: 0.3px;
          ">${R.label}</span>
        </div>
      `
  ).join("")}
    </div>
  `;
}
function EO(E) {
  const T = E.generated_at ? new Date(E.generated_at).toLocaleString() : "";
  return `
    <div style="
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    ">
      ${jI(E)}
      <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 8px;">
        ${zI(E.summary)}
        ${T ? `<span style="font-size: 11px; color: #64748b;">Generated: ${D(T)}</span>` : ""}
      </div>
    </div>
  `;
}
function TO(E) {
  const T = eT(E.severity), e = String(E.message || "").trim(), R = String(E.hint || "").trim(), t = String(E.code || "").trim(), O = String(E.component || "").trim();
  if (!e) return "";
  const s = [t, O].filter(Boolean).join(" • ");
  return `
    <div style="
      display: flex;
      gap: 10px;
      padding: 10px 12px;
      background: ${T.bgColor};
      border-left: 3px solid ${T.color};
      border-radius: 0 6px 6px 0;
      margin-bottom: 8px;
    ">
      <span style="
        font-size: 14px;
        color: ${T.color};
        line-height: 1.4;
      ">${T.icon}</span>
      <div style="flex: 1; min-width: 0;">
        <div style="
          font-size: 13px;
          color: #e2e8f0;
          line-height: 1.4;
          word-break: break-word;
        ">${D(e)}</div>
        ${R ? `
          <div style="
            margin-top: 6px;
            font-size: 12px;
            color: #94a3b8;
            display: flex;
            align-items: flex-start;
            gap: 6px;
          ">
            <span style="color: #64748b;">💡</span>
            <span>${D(R)}</span>
          </div>
        ` : ""}
        ${s ? `
          <div style="
            margin-top: 4px;
            font-size: 11px;
            color: #64748b;
            font-family: monospace;
          ">${D(s)}</div>
        ` : ""}
      </div>
    </div>
  `;
}
function eO(E) {
  return !E || E.length === 0 ? "" : `
    <div style="margin-top: 12px;">
      <div style="
        font-size: 12px;
        font-weight: 600;
        color: #94a3b8;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 8px;
      ">Findings</div>
      ${E.map((T) => TO(T)).join("")}
    </div>
  `;
}
function RO(E, T) {
  if (!T)
    return "";
  const e = String(T.description || "").trim(), R = String(T.cta || T.label || "").trim(), t = !!T.runnable, O = !!T.applicable, s = !!T.requires_confirmation, N = String(T.confirm_text || "").trim(), o = T.kind || "manual";
  let A = "enabled", I = "";
  O ? t || (A = "manual", I = o === "manual" ? "Manual action required" : "Action not available") : (A = "not-applicable", I = "Not applicable for current status");
  const L = A !== "enabled", i = L ? "background: #374151; color: #6b7280; cursor: not-allowed;" : "background: #3b82f6; color: #fff; cursor: pointer;";
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
      ${e ? `
        <div style="
          font-size: 13px;
          color: #cbd5e1;
          line-height: 1.5;
          margin-bottom: 12px;
        ">${D(e)}</div>
      ` : ""}
      <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
        ${R ? `
          <button
            type="button"
            class="debug-btn"
            data-doctor-action-run="${D(E)}"
            ${N ? `data-doctor-action-confirm="${D(N)}"` : ""}
            ${s ? 'data-doctor-action-requires-confirmation="true"' : ""}
            ${L ? "disabled" : ""}
            style="
              padding: 8px 16px;
              border: none;
              border-radius: 6px;
              font-size: 13px;
              font-weight: 500;
              ${i}
            "
          >${D(R)}</button>
        ` : ""}
        ${I ? `
          <span style="
            font-size: 12px;
            color: #64748b;
            font-style: italic;
          ">${D(I)}</span>
        ` : ""}
      </div>
    </div>
  `;
}
function AO(E) {
  return E == null ? '<span style="color: #64748b; font-style: italic;">null</span>' : typeof E == "boolean" ? `<span style="color: ${E ? "#22c55e" : "#ef4444"}; font-weight: 500;">${E}</span>` : typeof E == "number" ? `<span style="color: #818cf8;">${E}</span>` : typeof E == "string" ? `<span style="color: #fbbf24;">"${D(E)}"</span>` : typeof E == "object" ? `<span style="color: #94a3b8;">${D(JSON.stringify(E))}</span>` : D(String(E));
}
function tO(E) {
  if (!E || Object.keys(E).length === 0)
    return "";
  const T = Object.entries(E).map(([e, R]) => `
      <tr>
        <td style="
          padding: 4px 8px 4px 0;
          color: #94a3b8;
          font-size: 12px;
          vertical-align: top;
          white-space: nowrap;
        ">${D(e)}:</td>
        <td style="
          padding: 4px 0;
          font-family: monospace;
          font-size: 11px;
          word-break: break-all;
        ">${AO(R)}</td>
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
        <span style="margin-left: 8px;">Metadata (${Object.keys(E).length} keys)</span>
      </summary>
      <div style="
        margin-top: 4px;
        padding: 12px;
        background: #0f172a;
        border: 1px solid #1e293b;
        border-radius: 6px;
      ">
        <table style="width: 100%; border-collapse: collapse;">
          <tbody>${T}</tbody>
        </table>
      </div>
    </details>
  `;
}
function SO(E) {
  const T = eT(E.status), e = String(E.label || E.id || "").trim(), R = String(E.summary || "").trim(), t = String(E.help || E.description || "").trim(), O = E.duration_ms !== void 0 ? `${E.duration_ms}ms` : "";
  return `
    <div style="
      border: 1px solid ${T.borderColor};
      border-left: 4px solid ${T.color};
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
        background: ${T.bgColor};
        border-bottom: 1px solid ${T.borderColor};
      ">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: ${T.color};
            color: #fff;
            border-radius: 50%;
            font-size: 12px;
            font-weight: 600;
          ">${T.icon}</span>
          <div>
            <div style="
              font-size: 14px;
              font-weight: 600;
              color: #e2e8f0;
            ">${D(e)}</div>
            <div style="
              font-size: 11px;
              color: #64748b;
              font-family: monospace;
            ">${D(E.id || "")}</div>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 12px;">
          ${O ? `
            <span style="
              font-size: 11px;
              color: #64748b;
              font-family: monospace;
            ">${D(O)}</span>
          ` : ""}
          <span style="
            padding: 4px 10px;
            border-radius: 999px;
            font-size: 11px;
            font-weight: 600;
            color: ${T.color};
            background: ${T.bgColor};
            border: 1px solid ${T.borderColor};
          ">${D(T.label)}</span>
        </div>
      </div>

      <!-- Card Body -->
      <div style="padding: 16px;">
        <!-- Summary -->
        ${R ? `
          <div style="
            font-size: 13px;
            color: #cbd5e1;
            line-height: 1.5;
          ">${D(R)}</div>
        ` : ""}

        <!-- Help Section -->
        ${t ? `
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
            ">${D(t)}</div>
          </details>
        ` : ""}

        <!-- Findings -->
        ${eO(E.findings)}

        <!-- Action -->
        ${RO(E.id, E.action)}

        <!-- Metadata -->
        ${tO(E.metadata)}
      </div>
    </div>
  `;
}
function IO(E) {
  return !E || E.length === 0 ? "" : `
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
        ${E.map((T) => `<li style="margin-bottom: 4px;">${D(T)}</li>`).join("")}
      </ol>
    </div>
  `;
}
function OO(E) {
  const T = AE(E);
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
        ">${D(T)}</pre>
      </div>
    </details>
  `;
}
function XT(E, T, e = {}) {
  const { showRawJSON: R = !0, problemsOnly: t = !1 } = e;
  if (!E)
    return `<div class="${T.emptyState}">No doctor diagnostics available</div>`;
  let O = E.checks || [];
  t && (O = O.filter((A) => A.status === "warn" || A.status === "error"));
  const s = { error: 0, warn: 1, info: 2, ok: 3 };
  O = [...O].sort((A, I) => {
    const L = s[A.status || "ok"] ?? 4, i = s[I.status || "ok"] ?? 4;
    return L !== i ? L - i : (A.label || A.id || "").localeCompare(I.label || I.id || "");
  });
  const N = O.some((A) => A.status === "warn" || A.status === "error");
  let o = "";
  return O.length === 0 ? t && !N ? o = `
        <div style="
          text-align: center;
          padding: 40px 20px;
          color: #22c55e;
        ">
          <div style="font-size: 48px; margin-bottom: 12px;">✓</div>
          <div style="font-size: 18px; font-weight: 600; margin-bottom: 8px;">All Systems Healthy</div>
          <div style="font-size: 14px; color: #94a3b8;">${E.summary?.checks || 0} checks passed</div>
        </div>
      ` : o = `<div class="${T.emptyState}">No doctor checks available</div>` : o = O.map((A) => SO(A)).join(""), `
    <div style="padding: 12px;">
      ${EO(E)}
      ${o}
      ${IO(E.next_actions)}
      ${R ? OO(E) : ""}
    </div>
  `;
}
function se(E) {
  return E.snapshotKey ?? E.id;
}
function xT(E) {
  return E.eventTypes ? Array.isArray(E.eventTypes) ? E.eventTypes : [E.eventTypes] : [se(E)];
}
function NO(E) {
  return Array.isArray(E) ? E.length : E && typeof E == "object" ? Object.keys(E).length : 0;
}
function iE(E, T, e = 500) {
  if (Array.isArray(E)) {
    const R = [...E, T];
    return e > 0 ? R.slice(-e) : R;
  }
  return E && typeof E == "object" && T && typeof T == "object" ? { ...E, ...T } : T;
}
function sO(E, T) {
  const e = se(T);
  return E[e];
}
function yO(E, T) {
  const e = sO(E, T);
  return T.getCount ? T.getCount(e) : NO(e);
}
function VO(E, T, e, R, t) {
  return t === "console" && E.renderConsole ? E.renderConsole(T, e, R) : t === "toolbar" && E.renderToolbar ? E.renderToolbar(T, e, R) : t === "toolbar" && E.supportsToolbar === !1 ? `<div class="${e.emptyState}">Panel "${E.label}" not available in toolbar</div>` : E.render(T, e, R);
}
class rO {
  constructor() {
    this.panels = /* @__PURE__ */ new Map(), this.listeners = /* @__PURE__ */ new Set();
  }
  /**
   * Register a panel definition.
   * If a panel with the same ID exists, it will be replaced.
   */
  register(T) {
    this.panels.set(T.id, T), this.notifyListeners({
      type: "register",
      panelId: T.id,
      panel: T
    });
  }
  /**
   * Unregister a panel by ID.
   */
  unregister(T) {
    const e = this.panels.get(T);
    this.panels.delete(T) && this.notifyListeners({
      type: "unregister",
      panelId: T,
      panel: e
    });
  }
  /**
   * Get a panel definition by ID.
   */
  get(T) {
    return this.panels.get(T);
  }
  /**
   * Check if a panel is registered.
   */
  has(T) {
    return this.panels.has(T);
  }
  /**
   * Get all registered panel definitions.
   */
  list() {
    return Array.from(this.panels.values());
  }
  /**
   * Get all registered panel IDs.
   */
  ids() {
    return Array.from(this.panels.keys());
  }
  /**
   * Get panel IDs sorted by category and order.
   */
  getSortedIds() {
    return this.list().sort((T, e) => {
      const R = T.category || "custom", t = e.category || "custom";
      return R !== t ? R.localeCompare(t) : (T.order || 100) - (e.order || 100);
    }).map((T) => T.id);
  }
  /**
   * Get panels filtered for toolbar display.
   */
  getToolbarPanels() {
    return this.list().filter((T) => T.supportsToolbar !== !1);
  }
  /**
   * Get all event types that need WebSocket subscriptions.
   */
  getAllEventTypes() {
    const T = /* @__PURE__ */ new Set();
    for (const e of this.panels.values())
      for (const R of xT(e))
        T.add(R);
    return Array.from(T);
  }
  /**
   * Find panel by event type.
   */
  findByEventType(T) {
    for (const e of this.panels.values())
      if (xT(e).includes(T))
        return e;
  }
  /**
   * Subscribe to registry changes.
   * Returns unsubscribe function.
   */
  subscribe(T) {
    return this.listeners.add(T), () => this.listeners.delete(T);
  }
  /**
   * Subscribe to any registry change (simpler API).
   * Returns unsubscribe function.
   */
  onChange(T) {
    const e = () => T();
    return this.subscribe(e);
  }
  notifyListeners(T) {
    this.listeners.forEach((e) => e(T));
  }
}
const QE = "__go_admin_panel_registry__";
function nO() {
  const E = globalThis;
  return E[QE] || (E[QE] = new rO()), E[QE];
}
const b = nO(), aO = {
  id: "requests",
  label: "Requests",
  icon: "iconoir-network",
  snapshotKey: "requests",
  eventTypes: "request",
  category: "core",
  order: 10,
  render: (E, T, e) => $E(E || [], T, {
    ...e,
    showSortToggle: !1,
    truncatePath: !1
  }),
  renderConsole: (E, T, e) => $E(E || [], T, {
    ...e,
    showSortToggle: !1,
    truncatePath: !1
  }),
  renderToolbar: (E, T, e) => $E(E || [], T, {
    ...e,
    maxEntries: 50,
    showSortToggle: !0,
    truncatePath: !0,
    maxPathLength: 50
  }),
  getCount: (E) => (E || []).length,
  handleEvent: (E, T) => iE(E || [], T, 500),
  supportsToolbar: !0
}, CO = {
  id: "sql",
  label: "SQL",
  icon: "iconoir-database",
  snapshotKey: "sql",
  eventTypes: "sql",
  category: "core",
  order: 20,
  render: (E, T, e) => KE(E || [], T, {
    ...e,
    showSortToggle: !1,
    useIconCopyButton: !0
  }),
  renderConsole: (E, T, e) => KE(E || [], T, {
    ...e,
    maxEntries: 200,
    showSortToggle: !1,
    useIconCopyButton: !0
  }),
  renderToolbar: (E, T, e) => KE(E || [], T, {
    ...e,
    maxEntries: 50,
    showSortToggle: !0,
    useIconCopyButton: !1
  }),
  getCount: (E) => (E || []).length,
  handleEvent: (E, T) => iE(E || [], T, 500),
  supportsToolbar: !0
}, LO = {
  id: "logs",
  label: "Logs",
  icon: "iconoir-page",
  snapshotKey: "logs",
  eventTypes: "log",
  category: "core",
  order: 30,
  render: (E, T, e) => wE(E || [], T, {
    ...e,
    showSortToggle: !1,
    showSource: !0,
    truncateMessage: !1
  }),
  renderConsole: (E, T, e) => wE(E || [], T, {
    ...e,
    maxEntries: 500,
    showSortToggle: !1,
    showSource: !0,
    truncateMessage: !1
  }),
  renderToolbar: (E, T, e) => wE(E || [], T, {
    newestFirst: !0,
    maxEntries: 100,
    showSortToggle: !1,
    showSource: !1,
    truncateMessage: !0,
    maxMessageLength: 100
  }),
  getCount: (E) => (E || []).length,
  handleEvent: (E, T) => iE(E || [], T, 1e3),
  supportsToolbar: !0
}, oO = {
  id: "routes",
  label: "Routes",
  icon: "iconoir-path-arrow",
  snapshotKey: "routes",
  eventTypes: [],
  // Snapshot only, no incremental events
  category: "system",
  order: 40,
  render: (E, T) => JE(E || [], T, {
    showName: !0
  }),
  renderConsole: (E, T) => JE(E || [], T, {
    showName: !0
  }),
  renderToolbar: (E, T) => JE(E || [], T, {
    showName: !1
  }),
  getCount: (E) => (E || []).length,
  // No handleEvent - snapshot only
  supportsToolbar: !0
}, iO = {
  id: "config",
  label: "Config",
  icon: "iconoir-settings",
  snapshotKey: "config",
  eventTypes: [],
  // Snapshot only, no incremental events
  category: "system",
  order: 50,
  render: (E, T, e) => v("Config", E, T, {
    useIconCopyButton: !0,
    showCount: !0
  }),
  renderConsole: (E, T, e) => {
    const R = e?.filterFn;
    return v("Config", E, T, {
      useIconCopyButton: !0,
      showCount: !0,
      filterFn: R
    });
  },
  renderToolbar: (E, T) => v("Config", E, T, {
    useIconCopyButton: !1,
    showCount: !1
  }),
  getCount: (E) => E && typeof E == "object" ? Object.keys(E).length : 0,
  // No handleEvent - snapshot only
  supportsToolbar: !0
}, _O = {
  id: "template",
  label: "Template",
  icon: "iconoir-code",
  snapshotKey: "template",
  eventTypes: "template",
  category: "data",
  order: 10,
  render: (E, T, e) => v("Template Context", E, T, {
    useIconCopyButton: !0,
    showCount: !0
  }),
  renderConsole: (E, T, e) => {
    const R = e?.filterFn;
    return v("Template Context", E, T, {
      useIconCopyButton: !0,
      showCount: !0,
      filterFn: R
    });
  },
  renderToolbar: (E, T) => v("Template Context", E, T, {
    useIconCopyButton: !1,
    showCount: !1
  }),
  getCount: (E) => E && typeof E == "object" ? Object.keys(E).length : 0,
  handleEvent: (E, T) => T,
  supportsToolbar: !0
}, DO = {
  id: "session",
  label: "Session",
  icon: "iconoir-user",
  snapshotKey: "session",
  eventTypes: "session",
  category: "data",
  order: 20,
  render: (E, T, e) => v("Session", E, T, {
    useIconCopyButton: !0,
    showCount: !0
  }),
  renderConsole: (E, T, e) => {
    const R = e?.filterFn;
    return v("Session", E, T, {
      useIconCopyButton: !0,
      showCount: !0,
      filterFn: R
    });
  },
  renderToolbar: (E, T) => v("Session", E, T, {
    useIconCopyButton: !1,
    showCount: !1
  }),
  getCount: (E) => E && typeof E == "object" ? Object.keys(E).length : 0,
  handleEvent: (E, T) => T,
  supportsToolbar: !0
}, PO = {
  id: "custom",
  label: "Custom",
  icon: "iconoir-puzzle",
  snapshotKey: "custom",
  eventTypes: "custom",
  category: "data",
  order: 30,
  render: (E, T, e) => kE(E || {}, T, {
    useIconCopyButton: !0,
    showCount: !0
  }),
  renderConsole: (E, T, e) => {
    const R = E || {}, t = e?.dataFilterFn;
    return kE(R, T, {
      maxLogEntries: 100,
      useIconCopyButton: !0,
      showCount: !0,
      dataFilterFn: t
    });
  },
  renderToolbar: (E, T) => kE(E || {}, T, {
    maxLogEntries: 50,
    useIconCopyButton: !1,
    showCount: !1
  }),
  getCount: (E) => {
    const T = E || {}, e = T.data ? Object.keys(T.data).length : 0, R = T.logs?.length || 0;
    return e + R;
  },
  handleEvent: (E, T) => {
    const e = E || { data: {}, logs: [] }, R = T, t = R.data ? { ...e.data, ...R.data } : e.data, O = R.logs ? [...e.logs || [], ...R.logs].slice(-500) : e.logs;
    return { data: t, logs: O };
  },
  supportsToolbar: !0
}, lO = {
  id: "jserrors",
  label: "JS Errors",
  icon: "iconoir-warning-triangle",
  snapshotKey: "jserrors",
  eventTypes: "jserror",
  category: "core",
  order: 35,
  render: (E, T, e) => qE(E || [], T, {
    ...e,
    compact: !1,
    showSortToggle: !1
  }),
  renderConsole: (E, T, e) => qE(E || [], T, {
    ...e,
    maxEntries: 500,
    compact: !1,
    showSortToggle: !1
  }),
  renderToolbar: (E, T, e) => qE(E || [], T, {
    ...e,
    maxEntries: 50,
    compact: !0,
    showSortToggle: !0
  }),
  getCount: (E) => (E || []).length,
  handleEvent: (E, T) => iE(E || [], T, 500),
  supportsToolbar: !0
}, MO = {
  id: "permissions",
  label: "Permissions",
  icon: "iconoir-shield-check",
  snapshotKey: "permissions",
  eventTypes: [],
  // Snapshot only, no incremental events
  category: "system",
  order: 45,
  showFilters: !1,
  render: (E, T, e) => WT(E, T, {
    showRawJSON: !0
  }),
  renderConsole: (E, T, e) => WT(E, T, {
    showRawJSON: !0
  }),
  renderToolbar: (E, T, e) => QI(E, T),
  getCount: (E) => {
    const T = E;
    return !T || !T.summary ? 0 : T.summary.missing_keys;
  },
  // No handleEvent - snapshot only
  supportsToolbar: !0
}, UO = {
  id: "doctor",
  label: "Doctor",
  icon: "iconoir-heartbeat",
  snapshotKey: "doctor",
  eventTypes: [],
  category: "system",
  order: 46,
  showFilters: !1,
  render: (E, T, e) => XT(E, T, {
    showRawJSON: !0
  }),
  renderConsole: (E, T, e) => XT(E, T, {
    showRawJSON: !0
  }),
  getCount: (E) => {
    const T = E;
    return !T || !T.summary ? 0 : (T.summary.error || 0) + (T.summary.warn || 0);
  },
  supportsToolbar: !1
};
function cO() {
  b.register(aO), b.register(CO), b.register(LO), b.register(lO), b.register(oO), b.register(MO), b.register(UO), b.register(iO), b.register(_O), b.register(DO), b.register(PO);
}
cO();
export {
  VO as A,
  de as B,
  fO as C,
  le as D,
  zE as E,
  nE as F,
  Ue as G,
  wT as H,
  JT as I,
  mO as J,
  FO as K,
  gO as L,
  BO as M,
  uO as R,
  YO as a,
  HO as b,
  ue as c,
  GO as d,
  D as e,
  hO as f,
  se as g,
  $E as h,
  KE as i,
  AE as j,
  wE as k,
  JE as l,
  RE as m,
  LE as n,
  kE as o,
  b as p,
  v as q,
  qE as r,
  yO as s,
  KT as t,
  iE as u,
  pO as v,
  dO as w,
  xT as x,
  NO as y,
  sO as z
};
//# sourceMappingURL=builtin-panels-DhCCPLES.js.map
