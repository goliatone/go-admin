import { n as CT, r as $e, t as Ke } from "./chunk-BUbnbzFL.js";
import { escapeHTML as n } from "../shared/html.js";
import { normalizeDebugBasePath as LT } from "../debug/shared/path-helpers.js";
import { C as Se, D as X, E as b, O as we, T as eE, j as oE, k as _T, m as iE, t as lT, w as zE, x as Je, y as v } from "./runtime-helpers-73DjiyO0.js";
var DT = 1e3, PT = 12e3, MT = 8, UT = 1, dT = 3e4, pT = (E) => {
  const e = window.location.protocol === "https:" ? "wss:" : "ws:", T = LT(E);
  return `${e}//${window.location.host}${T}/ws`;
}, uT = (E, e, T) => {
  const R = E.trim();
  if (!R || !e || !T) return E;
  const [A, r] = R.split("#"), s = `${A}${A.includes("?") ? "&" : "?"}${encodeURIComponent(e)}=${encodeURIComponent(T)}`;
  return r ? `${s}#${r}` : s;
}, cT = (E) => {
  if (!E) return null;
  const e = E.replace(/-/g, "+").replace(/_/g, "/"), T = e.padEnd(e.length + (4 - (e.length % 4 || 4)) % 4, "=");
  try {
    if (typeof globalThis.atob == "function") return globalThis.atob(T);
  } catch {
    return null;
  }
  return null;
}, GT = (E) => {
  if (!E) return null;
  const e = E.split(".");
  if (e.length < 2) return null;
  const T = cT(e[1]);
  if (!T) return null;
  try {
    const R = JSON.parse(T);
    if (typeof R.exp == "number") return R.exp * 1e3;
  } catch {
    return null;
  }
  return null;
}, mT = (E, e) => {
  if (e) {
    if (typeof e.expiresInMs == "number" && e.expiresInMs > 0) return Date.now() + e.expiresInMs;
    const T = e.expiresAt ?? e.expires_at;
    if (typeof T == "number") return T;
    if (typeof T == "string") {
      const R = new Date(T);
      if (!Number.isNaN(R.getTime())) return R.getTime();
    }
  }
  return GT(E);
}, HT = class {
  constructor(E) {
    this.ws = null, this.reconnectTimer = null, this.reconnectAttempts = 0, this.manualClose = !1, this.pendingCommands = [], this.status = "disconnected", this.hasConnected = !1, this.options = E;
  }
  getWebSocketURL() {
    return this.options.url ? this.options.url : pT(this.options.basePath || "");
  }
  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return;
    this.reconnectTimer !== null && (window.clearTimeout(this.reconnectTimer), this.reconnectTimer = null), this.manualClose = !1;
    const E = this.getWebSocketURL();
    if (!E) {
      this.setStatus("error");
      return;
    }
    this.ws = new WebSocket(E), this.ws.onopen = () => {
      this.hasConnected = !0, this.reconnectAttempts = 0, this.setStatus("connected"), this.flushPending();
    }, this.ws.onmessage = (e) => {
      if (!(!e || typeof e.data != "string"))
        try {
          const T = JSON.parse(e.data);
          this.options.onEvent?.(T);
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
  sendCommand(E) {
    if (!(!E || !E.type)) {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(E));
        return;
      }
      this.pendingCommands.push(E);
    }
  }
  subscribe(E) {
    this.sendCommand({
      type: "subscribe",
      panels: E
    });
  }
  unsubscribe(E) {
    this.sendCommand({
      type: "unsubscribe",
      panels: E
    });
  }
  requestSnapshot() {
    this.sendCommand({ type: "snapshot" });
  }
  clear(E) {
    this.sendCommand({
      type: "clear",
      panels: E
    });
  }
  getStatus() {
    return this.status;
  }
  setStatus(E) {
    this.status !== E && (this.status = E, this.options.onStatusChange?.(E));
  }
  flushPending() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || this.pendingCommands.length === 0) return;
    const E = [...this.pendingCommands];
    this.pendingCommands = [];
    for (const e of E) this.ws.send(JSON.stringify(e));
  }
  scheduleReconnect() {
    const E = this.hasConnected ? this.options.maxReconnectAttempts ?? MT : this.options.maxInitialReconnectAttempts ?? UT, e = this.options.reconnectDelayMs ?? DT, T = this.options.maxReconnectDelayMs ?? PT;
    if (this.reconnectAttempts >= E) {
      this.setStatus("disconnected");
      return;
    }
    const R = this.reconnectAttempts, A = Math.min(e * Math.pow(2, R), T), r = A * (0.2 + Math.random() * 0.3);
    this.reconnectAttempts += 1, this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null, this.connect();
    }, A + r);
  }
}, jr = class extends HT {
  constructor(E) {
    const { url: e, authToken: T, tokenProvider: R, tokenRefreshBufferMs: A, tokenParam: r, appId: s, onEvent: S, ...L } = E, N = (t) => {
      if (s && t && !t.app_id) {
        S?.({
          ...t,
          app_id: s
        });
        return;
      }
      S?.(t);
    };
    super({
      ...L,
      url: e,
      onEvent: N
    }), this.authToken = null, this.tokenRefreshTimer = null, this.tokenExpiresAt = null, this.baseUrl = e, this.tokenProvider = R, this.tokenRefreshBufferMs = A ?? dT, this.tokenParam = r || "token", T && this.setToken(T);
  }
  getWebSocketURL() {
    return this.authToken ? uT(this.baseUrl, this.tokenParam, this.authToken) : this.baseUrl;
  }
  connect() {
    this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) || this.ensureToken().then((E) => {
      E && super.connect();
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
    const E = Math.max(this.tokenExpiresAt - Date.now() - this.tokenRefreshBufferMs, 0);
    this.clearTokenRefresh(), this.tokenRefreshTimer = setTimeout(() => {
      this.refreshToken();
    }, E);
  }
  setToken(E, e) {
    this.authToken = E, this.tokenExpiresAt = mT(E, e), this.scheduleTokenRefresh();
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
      const E = await this.tokenProvider();
      return !E || !E.token ? (this.setStatus("error"), !1) : (this.setToken(E.token, E), this.reconnectAttempts = 0, this.ws && this.ws.readyState === WebSocket.OPEN && this.ws.close(), !0);
    } catch {
      return this.setStatus("error"), !1;
    }
  }
};
async function ke(E, e, T = {}) {
  const { feedbackDuration: R = 1500, useIconFeedback: A = !1, successClass: r = A ? "debug-copy--success" : "copied", errorClass: s = "debug-copy--error" } = T;
  try {
    await navigator.clipboard.writeText(E);
    const S = e.innerHTML;
    return e.classList.add(r), A ? e.innerHTML = '<i class="iconoir-check"></i> Copied' : e.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        Copied
      `, setTimeout(() => {
      e.innerHTML = S, e.classList.remove(r);
    }, R), !0;
  } catch {
    return e.classList.add(s), setTimeout(() => {
      e.classList.remove(s);
    }, R), !1;
  }
}
function EO(E, e = {}) {
  E.querySelectorAll("[data-copy-trigger]").forEach((T) => {
    T.addEventListener("click", async (R) => {
      R.preventDefault(), R.stopPropagation();
      const A = T.closest("[data-copy-content]");
      A && await ke(A.getAttribute("data-copy-content") || "", T, e);
    });
  });
}
function eO(E) {
  E.querySelectorAll(".expandable-row").forEach((e) => {
    e.addEventListener("click", (T) => {
      T.target.closest("a, button, input") || T.currentTarget.classList.toggle("expanded");
    });
  });
}
function TO(E, e) {
  E.querySelectorAll("[data-sort-toggle]").forEach((T) => {
    T.addEventListener("change", (R) => {
      const A = R.target, r = A.dataset.sortToggle;
      r && e(r, A.checked);
    });
  });
}
var RO = {
  COPY_TRIGGER: "data-copy-trigger",
  COPY_CONTENT: "data-copy-content",
  ROW_ID: "data-row-id",
  EXPANSION_FOR: "data-expansion-for",
  SORT_TOGGLE: "data-sort-toggle"
}, AO = {
  EXPANDABLE_ROW: "expandable-row",
  EXPANDED: "expanded",
  EXPANSION_ROW: "expansion-row",
  SLOW_QUERY: "slow-query",
  ERROR_QUERY: "error-query",
  EXPAND_ICON: "expand-icon"
};
function Ie(E, e) {
  return [...e].sort((T, R) => T - R).map((T) => E[T]).filter(Boolean).map((T) => {
    let R = `-- Duration: ${zE(T.duration).text} | Rows: ${T.row_count ?? 0}`;
    return T.error && (R += ` | Error: ${T.error}`), T.timestamp && (R += ` | Time: ${T.timestamp}`), `${R}
${T.query || ""};`;
  }).join(`

`);
}
function BT(E, e, T = "text/sql") {
  const R = new Blob([E], { type: T }), A = URL.createObjectURL(R), r = document.createElement("a");
  r.href = A, r.download = e, r.click(), URL.revokeObjectURL(A);
}
function tO(E, e, T = {}) {
  const R = /* @__PURE__ */ new Set(), A = E.querySelector("[data-sql-toolbar]"), r = E.querySelector("[data-sql-selected-count]"), s = E.querySelector(".sql-select-all"), S = E.querySelectorAll(".sql-select-row");
  if (!A || S.length === 0) return;
  function L() {
    if (!A) return;
    const N = R.size;
    A.dataset.visible = N > 0 ? "true" : "false", r && (r.textContent = `${N} selected`), s && (s.checked = N > 0 && N === S.length, s.indeterminate = N > 0 && N < S.length);
  }
  S.forEach((N) => {
    N.addEventListener("click", (t) => {
      t.stopPropagation();
    }), N.addEventListener("change", () => {
      const t = parseInt(N.dataset.sqlIndex || "", 10);
      Number.isNaN(t) || (N.checked ? R.add(t) : R.delete(t), L());
    });
  }), s && (s.addEventListener("click", (N) => {
    N.stopPropagation();
  }), s.addEventListener("change", () => {
    S.forEach((N) => {
      N.checked = s.checked;
      const t = parseInt(N.dataset.sqlIndex || "", 10);
      Number.isNaN(t) || (s.checked ? R.add(t) : R.delete(t));
    }), L();
  })), E.querySelector('[data-sql-export="clipboard"]')?.addEventListener("click", async (N) => {
    if (N.preventDefault(), R.size === 0) return;
    const t = Ie(e, R), C = N.currentTarget;
    await ke(t, C, T);
  }), E.querySelector('[data-sql-export="download"]')?.addEventListener("click", (N) => {
    N.preventDefault(), R.size !== 0 && BT(Ie(e, R), `sql-queries-${(/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-").slice(0, 19)}.sql`);
  }), E.querySelector("[data-sql-clear-selection]")?.addEventListener("click", (N) => {
    N.preventDefault(), R.clear(), S.forEach((t) => {
      t.checked = !1;
    }), L();
  });
}
function SO(E, e) {
  E.querySelectorAll("[data-request-table]").forEach((T) => {
    T.addEventListener("click", (R) => {
      const A = R.target;
      if (A.closest("button, a, input, [data-detail-for]")) return;
      const r = A.closest("[data-request-id]");
      if (!r) return;
      const s = r.dataset.requestId;
      if (!s) return;
      const S = r.nextElementSibling;
      if (!S || !S.hasAttribute("data-detail-for") || S.dataset.detailFor !== s) return;
      const L = S.querySelector("[data-request-detail-template]");
      if (L) {
        const t = S.querySelector("td");
        t && (t.appendChild(L.content.cloneNode(!0)), L.remove());
      }
      const N = r.querySelector("[data-expand-icon]");
      e.has(s) ? (e.delete(s), S.style.display = "none", N && (N.textContent = "▶")) : (e.add(s), S.style.display = "table-row", N && (N.textContent = "▼"));
    });
  });
}
var FT = {
  table: "debug-table",
  tableRoutes: "debug-table debug-routes-table",
  badge: "badge",
  badgeMethod: (E) => `badge badge--method-${E.toLowerCase()}`,
  badgeStatus: (E) => E >= 500 ? "badge badge--status-error" : E >= 400 ? "badge badge--status-warn" : "badge badge--status",
  badgeLevel: (E) => `badge badge--level-${E.toLowerCase()}`,
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
}, hT = {
  table: "",
  tableRoutes: "",
  badge: "badge",
  badgeMethod: (E) => `badge badge-method ${E.toLowerCase()}`,
  badgeStatus: (E) => {
    const e = _T(E);
    return e ? `badge badge-status ${e}` : "badge badge-status";
  },
  badgeLevel: (E) => `badge badge-level ${we(E)}`,
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
function IO(E) {
  return E === "console" ? FT : hT;
}
var YT = /* @__PURE__ */ Ke(((E, e) => {
  var T = (function(R) {
    var A = /(?:^|\s)lang(?:uage)?-([\w-]+)(?=\s|$)/i, r = 0, s = {}, S = {
      manual: R.Prism && R.Prism.manual,
      disableWorkerMessageHandler: R.Prism && R.Prism.disableWorkerMessageHandler,
      util: {
        encode: function o(O) {
          return O instanceof L ? new L(O.type, o(O.content), O.alias) : Array.isArray(O) ? O.map(o) : O.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\u00a0/g, " ");
        },
        type: function(o) {
          return Object.prototype.toString.call(o).slice(8, -1);
        },
        objId: function(o) {
          return o.__id || Object.defineProperty(o, "__id", { value: ++r }), o.__id;
        },
        clone: function o(O, l) {
          l = l || {};
          var D, P;
          switch (S.util.type(O)) {
            case "Object":
              if (P = S.util.objId(O), l[P]) return l[P];
              D = {}, l[P] = D;
              for (var c in O) O.hasOwnProperty(c) && (D[c] = o(O[c], l));
              return D;
            case "Array":
              return P = S.util.objId(O), l[P] ? l[P] : (D = [], l[P] = D, O.forEach(function(p, B) {
                D[B] = o(p, l);
              }), D);
            default:
              return O;
          }
        },
        getLanguage: function(o) {
          for (; o; ) {
            var O = A.exec(o.className);
            if (O) return O[1].toLowerCase();
            o = o.parentElement;
          }
          return "none";
        },
        setLanguage: function(o, O) {
          o.className = o.className.replace(RegExp(A, "gi"), ""), o.classList.add("language-" + O);
        },
        currentScript: function() {
          if (typeof document > "u") return null;
          if (document.currentScript && document.currentScript.tagName === "SCRIPT") return document.currentScript;
          try {
            throw new Error();
          } catch (D) {
            var o = (/at [^(\r\n]*\((.*):[^:]+:[^:]+\)$/i.exec(D.stack) || [])[1];
            if (o) {
              var O = document.getElementsByTagName("script");
              for (var l in O) if (O[l].src == o) return O[l];
            }
            return null;
          }
        },
        isActive: function(o, O, l) {
          for (var D = "no-" + O; o; ) {
            var P = o.classList;
            if (P.contains(O)) return !0;
            if (P.contains(D)) return !1;
            o = o.parentElement;
          }
          return !!l;
        }
      },
      languages: {
        plain: s,
        plaintext: s,
        text: s,
        txt: s,
        extend: function(o, O) {
          var l = S.util.clone(S.languages[o]);
          for (var D in O) l[D] = O[D];
          return l;
        },
        insertBefore: function(o, O, l, D) {
          D = D || S.languages;
          var P = D[o], c = {};
          for (var p in P) if (P.hasOwnProperty(p)) {
            if (p == O)
              for (var B in l) l.hasOwnProperty(B) && (c[B] = l[B]);
            l.hasOwnProperty(p) || (c[p] = P[p]);
          }
          var F = D[o];
          return D[o] = c, S.languages.DFS(S.languages, function(f, SE) {
            SE === F && f != o && (this[f] = c);
          }), c;
        },
        DFS: function o(O, l, D, P) {
          P = P || {};
          var c = S.util.objId;
          for (var p in O) if (O.hasOwnProperty(p)) {
            l.call(O, p, O[p], D || p);
            var B = O[p], F = S.util.type(B);
            F === "Object" && !P[c(B)] ? (P[c(B)] = !0, o(B, l, null, P)) : F === "Array" && !P[c(B)] && (P[c(B)] = !0, o(B, l, p, P));
          }
        }
      },
      plugins: {},
      highlightAll: function(o, O) {
        S.highlightAllUnder(document, o, O);
      },
      highlightAllUnder: function(o, O, l) {
        var D = {
          callback: l,
          container: o,
          selector: 'code[class*="language-"], [class*="language-"] code, code[class*="lang-"], [class*="lang-"] code'
        };
        S.hooks.run("before-highlightall", D), D.elements = Array.prototype.slice.apply(D.container.querySelectorAll(D.selector)), S.hooks.run("before-all-elements-highlight", D);
        for (var P = 0, c; c = D.elements[P++]; ) S.highlightElement(c, O === !0, D.callback);
      },
      highlightElement: function(o, O, l) {
        var D = S.util.getLanguage(o), P = S.languages[D];
        S.util.setLanguage(o, D);
        var c = o.parentElement;
        c && c.nodeName.toLowerCase() === "pre" && S.util.setLanguage(c, D);
        var p = {
          element: o,
          language: D,
          grammar: P,
          code: o.textContent
        };
        function B(f) {
          p.highlightedCode = f, S.hooks.run("before-insert", p), p.element.innerHTML = p.highlightedCode, S.hooks.run("after-highlight", p), S.hooks.run("complete", p), l && l.call(p.element);
        }
        if (S.hooks.run("before-sanity-check", p), c = p.element.parentElement, c && c.nodeName.toLowerCase() === "pre" && !c.hasAttribute("tabindex") && c.setAttribute("tabindex", "0"), !p.code) {
          S.hooks.run("complete", p), l && l.call(p.element);
          return;
        }
        if (S.hooks.run("before-highlight", p), !p.grammar) {
          B(S.util.encode(p.code));
          return;
        }
        if (O && R.Worker) {
          var F = new Worker(S.filename);
          F.onmessage = function(f) {
            B(f.data);
          }, F.postMessage(JSON.stringify({
            language: p.language,
            code: p.code,
            immediateClose: !0
          }));
        } else B(S.highlight(p.code, p.grammar, p.language));
      },
      highlight: function(o, O, l) {
        var D = {
          code: o,
          grammar: O,
          language: l
        };
        if (S.hooks.run("before-tokenize", D), !D.grammar) throw new Error('The language "' + D.language + '" has no grammar.');
        return D.tokens = S.tokenize(D.code, D.grammar), S.hooks.run("after-tokenize", D), L.stringify(S.util.encode(D.tokens), D.language);
      },
      tokenize: function(o, O) {
        var l = O.rest;
        if (l) {
          for (var D in l) O[D] = l[D];
          delete O.rest;
        }
        var P = new C();
        return _(P, P.head, o), t(o, P, O, P.head, 0), m(P);
      },
      hooks: {
        all: {},
        add: function(o, O) {
          var l = S.hooks.all;
          l[o] = l[o] || [], l[o].push(O);
        },
        run: function(o, O) {
          var l = S.hooks.all[o];
          if (!(!l || !l.length))
            for (var D = 0, P; P = l[D++]; ) P(O);
        }
      },
      Token: L
    };
    R.Prism = S;
    function L(o, O, l, D) {
      this.type = o, this.content = O, this.alias = l, this.length = (D || "").length | 0;
    }
    L.stringify = function o(O, l) {
      if (typeof O == "string") return O;
      if (Array.isArray(O)) {
        var D = "";
        return O.forEach(function(F) {
          D += o(F, l);
        }), D;
      }
      var P = {
        type: O.type,
        content: o(O.content, l),
        tag: "span",
        classes: ["token", O.type],
        attributes: {},
        language: l
      }, c = O.alias;
      c && (Array.isArray(c) ? Array.prototype.push.apply(P.classes, c) : P.classes.push(c)), S.hooks.run("wrap", P);
      var p = "";
      for (var B in P.attributes) p += " " + B + '="' + (P.attributes[B] || "").replace(/"/g, "&quot;") + '"';
      return "<" + P.tag + ' class="' + P.classes.join(" ") + '"' + p + ">" + P.content + "</" + P.tag + ">";
    };
    function N(o, O, l, D) {
      o.lastIndex = O;
      var P = o.exec(l);
      if (P && D && P[1]) {
        var c = P[1].length;
        P.index += c, P[0] = P[0].slice(c);
      }
      return P;
    }
    function t(o, O, l, D, P, c) {
      for (var p in l)
        if (!(!l.hasOwnProperty(p) || !l[p])) {
          var B = l[p];
          B = Array.isArray(B) ? B : [B];
          for (var F = 0; F < B.length; ++F) {
            if (c && c.cause == p + "," + F) return;
            var f = B[F], SE = f.inside, Te = !!f.lookbehind, Re = !!f.greedy, aT = f.alias;
            if (Re && !f.pattern.global) {
              var nT = f.pattern.toString().match(/[imsuy]*$/)[0];
              f.pattern = RegExp(f.pattern.source, nT + "g");
            }
            for (var Ae = f.pattern || f, y = D.next, W = P; y !== O.tail && !(c && W >= c.reach); W += y.value.length, y = y.next) {
              var z = y.value;
              if (O.length > o.length) return;
              if (!(z instanceof L)) {
                var IE = 1, V;
                if (Re) {
                  if (V = N(Ae, W, o, Te), !V || V.index >= o.length) break;
                  var rE = V.index, oT = V.index + V[0].length, w = W;
                  for (w += y.value.length; rE >= w; )
                    y = y.next, w += y.value.length;
                  if (w -= y.value.length, W = w, y.value instanceof L) continue;
                  for (var RE = y; RE !== O.tail && (w < oT || typeof RE.value == "string"); RE = RE.next)
                    IE++, w += RE.value.length;
                  IE--, z = o.slice(W, w), V.index -= W;
                } else if (V = N(Ae, 0, z, Te), !V) continue;
                var rE = V.index, OE = V[0], LE = z.slice(0, rE), te = z.slice(rE + OE.length), _E = W + z.length;
                c && _E > c.reach && (c.reach = _E);
                var NE = y.prev;
                LE && (NE = _(O, NE, LE), W += LE.length), M(O, NE, IE);
                var iT = new L(p, SE ? S.tokenize(OE, SE) : OE, aT, OE);
                if (y = _(O, NE, iT), te && _(O, y, te), IE > 1) {
                  var lE = {
                    cause: p + "," + F,
                    reach: _E
                  };
                  t(o, O, l, y.prev, W, lE), c && lE.reach > c.reach && (c.reach = lE.reach);
                }
              }
            }
          }
        }
    }
    function C() {
      var o = {
        value: null,
        prev: null,
        next: null
      }, O = {
        value: null,
        prev: o,
        next: null
      };
      o.next = O, this.head = o, this.tail = O, this.length = 0;
    }
    function _(o, O, l) {
      var D = O.next, P = {
        value: l,
        prev: O,
        next: D
      };
      return O.next = P, D.prev = P, o.length++, P;
    }
    function M(o, O, l) {
      for (var D = O.next, P = 0; P < l && D !== o.tail; P++) D = D.next;
      O.next = D, D.prev = O, o.length -= P;
    }
    function m(o) {
      for (var O = [], l = o.head.next; l !== o.tail; )
        O.push(l.value), l = l.next;
      return O;
    }
    if (!R.document)
      return R.addEventListener && (S.disableWorkerMessageHandler || R.addEventListener("message", function(o) {
        var O = JSON.parse(o.data), l = O.language, D = O.code, P = O.immediateClose;
        R.postMessage(S.highlight(D, S.languages[l], l)), P && R.close();
      }, !1)), S;
    var U = S.util.currentScript();
    U && (S.filename = U.src, U.hasAttribute("data-manual") && (S.manual = !0));
    function u() {
      S.manual || S.highlightAll();
    }
    if (!S.manual) {
      var H = document.readyState;
      H === "loading" || H === "interactive" && U && U.defer ? document.addEventListener("DOMContentLoaded", u) : window.requestAnimationFrame ? window.requestAnimationFrame(u) : window.setTimeout(u, 16);
    }
    return S;
  })(typeof window < "u" ? window : typeof WorkerGlobalScope < "u" && self instanceof WorkerGlobalScope ? self : {});
  typeof e < "u" && e.exports && (e.exports = T), typeof global < "u" && (global.Prism = T), T.languages.markup = {
    comment: {
      pattern: /<!--(?:(?!<!--)[\s\S])*?-->/,
      greedy: !0
    },
    prolog: {
      pattern: /<\?[\s\S]+?\?>/,
      greedy: !0
    },
    doctype: {
      pattern: /<!DOCTYPE(?:[^>"'[\]]|"[^"]*"|'[^']*')+(?:\[(?:[^<"'\]]|"[^"]*"|'[^']*'|<(?!!--)|<!--(?:[^-]|-(?!->))*-->)*\]\s*)?>/i,
      greedy: !0,
      inside: {
        "internal-subset": {
          pattern: /(^[^\[]*\[)[\s\S]+(?=\]>$)/,
          lookbehind: !0,
          greedy: !0,
          inside: null
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
          inside: { punctuation: [{
            pattern: /^=/,
            alias: "attr-equals"
          }, {
            pattern: /^(\s*)["']|["']$/,
            lookbehind: !0
          }] }
        },
        punctuation: /\/?>/,
        "attr-name": {
          pattern: /[^\s>\/]+/,
          inside: { namespace: /^[^\s>\/:]+:/ }
        }
      }
    },
    entity: [{
      pattern: /&[\da-z]{1,8};/i,
      alias: "named-entity"
    }, /&#x?[\da-f]{1,8};/i]
  }, T.languages.markup.tag.inside["attr-value"].inside.entity = T.languages.markup.entity, T.languages.markup.doctype.inside["internal-subset"].inside = T.languages.markup, T.hooks.add("wrap", function(R) {
    R.type === "entity" && (R.attributes.title = R.content.replace(/&amp;/, "&"));
  }), Object.defineProperty(T.languages.markup.tag, "addInlined", { value: function(A, r) {
    var s = {};
    s["language-" + r] = {
      pattern: /(^<!\[CDATA\[)[\s\S]+?(?=\]\]>$)/i,
      lookbehind: !0,
      inside: T.languages[r]
    }, s.cdata = /^<!\[CDATA\[|\]\]>$/i;
    var S = { "included-cdata": {
      pattern: /<!\[CDATA\[[\s\S]*?\]\]>/i,
      inside: s
    } };
    S["language-" + r] = {
      pattern: /[\s\S]+/,
      inside: T.languages[r]
    };
    var L = {};
    L[A] = {
      pattern: RegExp(/(<__[^>]*>)(?:<!\[CDATA\[(?:[^\]]|\](?!\]>))*\]\]>|(?!<!\[CDATA\[)[\s\S])*?(?=<\/__>)/.source.replace(/__/g, function() {
        return A;
      }), "i"),
      lookbehind: !0,
      greedy: !0,
      inside: S
    }, T.languages.insertBefore("markup", "cdata", L);
  } }), Object.defineProperty(T.languages.markup.tag, "addAttribute", { value: function(R, A) {
    T.languages.markup.tag.inside["special-attr"].push({
      pattern: RegExp(/(^|["'\s])/.source + "(?:" + R + ")" + /\s*=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+(?=[\s>]))/.source, "i"),
      lookbehind: !0,
      inside: {
        "attr-name": /^[^\s=]+/,
        "attr-value": {
          pattern: /=[\s\S]+/,
          inside: {
            value: {
              pattern: /(^=\s*(["']|(?!["'])))\S[\s\S]*(?=\2$)/,
              lookbehind: !0,
              alias: [A, "language-" + A],
              inside: T.languages[A]
            },
            punctuation: [{
              pattern: /^=/,
              alias: "attr-equals"
            }, /"|'/]
          }
        }
      }
    });
  } }), T.languages.html = T.languages.markup, T.languages.mathml = T.languages.markup, T.languages.svg = T.languages.markup, T.languages.xml = T.languages.extend("markup", {}), T.languages.ssml = T.languages.xml, T.languages.atom = T.languages.xml, T.languages.rss = T.languages.xml, (function(R) {
    var A = /(?:"(?:\\(?:\r\n|[\s\S])|[^"\\\r\n])*"|'(?:\\(?:\r\n|[\s\S])|[^'\\\r\n])*')/;
    R.languages.css = {
      comment: /\/\*[\s\S]*?\*\//,
      atrule: {
        pattern: RegExp("@[\\w-](?:" + /[^;{\s"']|\s+(?!\s)/.source + "|" + A.source + ")*?" + /(?:;|(?=\s*\{))/.source),
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
        }
      },
      url: {
        pattern: RegExp("\\burl\\((?:" + A.source + "|" + /(?:[^\\\r\n()"']|\\[\s\S])*/.source + ")\\)", "i"),
        greedy: !0,
        inside: {
          function: /^url/i,
          punctuation: /^\(|\)$/,
          string: {
            pattern: RegExp("^" + A.source + "$"),
            alias: "url"
          }
        }
      },
      selector: {
        pattern: RegExp(`(^|[{}\\s])[^{}\\s](?:[^{};"'\\s]|\\s+(?![\\s{])|` + A.source + ")*(?=\\s*\\{)"),
        lookbehind: !0
      },
      string: {
        pattern: A,
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
    var r = R.languages.markup;
    r && (r.tag.addInlined("style", "css"), r.tag.addAttribute("style", "css"));
  })(T), T.languages.clike = {
    comment: [{
      pattern: /(^|[^\\])\/\*[\s\S]*?(?:\*\/|$)/,
      lookbehind: !0,
      greedy: !0
    }, {
      pattern: /(^|[^\\:])\/\/.*/,
      lookbehind: !0,
      greedy: !0
    }],
    string: {
      pattern: /(["'])(?:\\(?:\r\n|[\s\S])|(?!\1)[^\\\r\n])*\1/,
      greedy: !0
    },
    "class-name": {
      pattern: /(\b(?:class|extends|implements|instanceof|interface|new|trait)\s+|\bcatch\s+\()[\w.\\]+/i,
      lookbehind: !0,
      inside: { punctuation: /[.\\]/ }
    },
    keyword: /\b(?:break|catch|continue|do|else|finally|for|function|if|in|instanceof|new|null|return|throw|try|while)\b/,
    boolean: /\b(?:false|true)\b/,
    function: /\b\w+(?=\()/,
    number: /\b0x[\da-f]+\b|(?:\b\d+(?:\.\d*)?|\B\.\d+)(?:e[+-]?\d+)?/i,
    operator: /[<>]=?|[!=]=?=?|--?|\+\+?|&&?|\|\|?|[?*/~^%]/,
    punctuation: /[{}[\];(),.:]/
  }, T.languages.javascript = T.languages.extend("clike", {
    "class-name": [T.languages.clike["class-name"], {
      pattern: /(^|[^$\w\xA0-\uFFFF])(?!\s)[_$A-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\.(?:constructor|prototype))/,
      lookbehind: !0
    }],
    keyword: [{
      pattern: /((?:^|\})\s*)catch\b/,
      lookbehind: !0
    }, {
      pattern: /(^|[^.]|\.\.\.\s*)\b(?:as|assert(?=\s*\{)|async(?=\s*(?:function\b|\(|[$\w\xA0-\uFFFF]|$))|await|break|case|class|const|continue|debugger|default|delete|do|else|enum|export|extends|finally(?=\s*(?:\{|$))|for|from(?=\s*(?:['"]|$))|function|(?:get|set)(?=\s*(?:[#\[$\w\xA0-\uFFFF]|$))|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|static|super|switch|this|throw|try|typeof|undefined|var|void|while|with|yield)\b/,
      lookbehind: !0
    }],
    function: /#?(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*(?:\.\s*(?:apply|bind|call)\s*)?\()/,
    number: {
      pattern: RegExp(/(^|[^\w$])/.source + "(?:" + (/NaN|Infinity/.source + "|" + /0[bB][01]+(?:_[01]+)*n?/.source + "|" + /0[oO][0-7]+(?:_[0-7]+)*n?/.source + "|" + /0[xX][\dA-Fa-f]+(?:_[\dA-Fa-f]+)*n?/.source + "|" + /\d+(?:_\d+)*n/.source + "|" + /(?:\d+(?:_\d+)*(?:\.(?:\d+(?:_\d+)*)?)?|\.\d+(?:_\d+)*)(?:[Ee][+-]?\d+(?:_\d+)*)?/.source) + ")" + /(?![\w$])/.source),
      lookbehind: !0
    },
    operator: /--|\+\+|\*\*=?|=>|&&=?|\|\|=?|[!=]==|<<=?|>>>?=?|[-+*/%&|^!=<>]=?|\.{3}|\?\?=?|\?\.?|[~:]/
  }), T.languages.javascript["class-name"][0].pattern = /(\b(?:class|extends|implements|instanceof|interface|new)\s+)[\w.\\]+/, T.languages.insertBefore("javascript", "keyword", {
    regex: {
      pattern: RegExp(/((?:^|[^$\w\xA0-\uFFFF."'\])\s]|\b(?:return|yield))\s*)/.source + /\//.source + "(?:" + /(?:\[(?:[^\]\\\r\n]|\\.)*\]|\\.|[^/\\\[\r\n])+\/[dgimyus]{0,7}/.source + "|" + /(?:\[(?:[^[\]\\\r\n]|\\.|\[(?:[^[\]\\\r\n]|\\.|\[(?:[^[\]\\\r\n]|\\.)*\])*\])*\]|\\.|[^/\\\[\r\n])+\/[dgimyus]{0,7}v[dgimyus]{0,7}/.source + ")" + /(?=(?:\s|\/\*(?:[^*]|\*(?!\/))*\*\/)*(?:$|[\r\n,.;:})\]]|\/\/))/.source),
      lookbehind: !0,
      greedy: !0,
      inside: {
        "regex-source": {
          pattern: /^(\/)[\s\S]+(?=\/[a-z]*$)/,
          lookbehind: !0,
          alias: "language-regex",
          inside: T.languages.regex
        },
        "regex-delimiter": /^\/|\/$/,
        "regex-flags": /^[a-z]+$/
      }
    },
    "function-variable": {
      pattern: /#?(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*[=:]\s*(?:async\s*)?(?:\bfunction\b|(?:\((?:[^()]|\([^()]*\))*\)|(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*)\s*=>))/,
      alias: "function"
    },
    parameter: [
      {
        pattern: /(function(?:\s+(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*)?\s*\(\s*)(?!\s)(?:[^()\s]|\s+(?![\s)])|\([^()]*\))+(?=\s*\))/,
        lookbehind: !0,
        inside: T.languages.javascript
      },
      {
        pattern: /(^|[^$\w\xA0-\uFFFF])(?!\s)[_$a-z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*=>)/i,
        lookbehind: !0,
        inside: T.languages.javascript
      },
      {
        pattern: /(\(\s*)(?!\s)(?:[^()\s]|\s+(?![\s)])|\([^()]*\))+(?=\s*\)\s*=>)/,
        lookbehind: !0,
        inside: T.languages.javascript
      },
      {
        pattern: /((?:\b|\s|^)(?!(?:as|async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|finally|for|from|function|get|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|set|static|super|switch|this|throw|try|typeof|undefined|var|void|while|with|yield)(?![$\w\xA0-\uFFFF]))(?:(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*\s*)\(\s*|\]\s*\(\s*)(?!\s)(?:[^()\s]|\s+(?![\s)])|\([^()]*\))+(?=\s*\)\s*\{)/,
        lookbehind: !0,
        inside: T.languages.javascript
      }
    ],
    constant: /\b[A-Z](?:[A-Z_]|\dx?)*\b/
  }), T.languages.insertBefore("javascript", "string", {
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
            rest: T.languages.javascript
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
  }), T.languages.insertBefore("javascript", "operator", { "literal-property": {
    pattern: /((?:^|[,{])[ \t]*)(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*:)/m,
    lookbehind: !0,
    alias: "property"
  } }), T.languages.markup && (T.languages.markup.tag.addInlined("script", "javascript"), T.languages.markup.tag.addAttribute(/on(?:abort|blur|change|click|composition(?:end|start|update)|dblclick|error|focus(?:in|out)?|key(?:down|up)|load|mouse(?:down|enter|leave|move|out|over|up)|reset|resize|scroll|select|slotchange|submit|unload|wheel)/.source, "javascript")), T.languages.js = T.languages.javascript, (function() {
    if (typeof T > "u" || typeof document > "u") return;
    Element.prototype.matches || (Element.prototype.matches = Element.prototype.msMatchesSelector || Element.prototype.webkitMatchesSelector);
    var R = "Loading…", A = function(U, u) {
      return "✖ Error " + U + " while fetching file: " + u;
    }, r = "✖ Error: File does not exist or is empty", s = {
      js: "javascript",
      py: "python",
      rb: "ruby",
      ps1: "powershell",
      psm1: "powershell",
      sh: "bash",
      bat: "batch",
      h: "c",
      tex: "latex"
    }, S = "data-src-status", L = "loading", N = "loaded", t = "failed", C = "pre[data-src]:not([" + S + '="' + N + '"]):not([' + S + '="' + L + '"])';
    function _(U, u, H) {
      var o = new XMLHttpRequest();
      o.open("GET", U, !0), o.onreadystatechange = function() {
        o.readyState == 4 && (o.status < 400 && o.responseText ? u(o.responseText) : o.status >= 400 ? H(A(o.status, o.statusText)) : H(r));
      }, o.send(null);
    }
    function M(U) {
      var u = /^\s*(\d+)\s*(?:(,)\s*(?:(\d+)\s*)?)?$/.exec(U || "");
      if (u) {
        var H = Number(u[1]), o = u[2], O = u[3];
        return o ? O ? [H, Number(O)] : [H, void 0] : [H, H];
      }
    }
    T.hooks.add("before-highlightall", function(U) {
      U.selector += ", " + C;
    }), T.hooks.add("before-sanity-check", function(U) {
      var u = U.element;
      if (u.matches(C)) {
        U.code = "", u.setAttribute(S, L);
        var H = u.appendChild(document.createElement("CODE"));
        H.textContent = R;
        var o = u.getAttribute("data-src"), O = U.language;
        if (O === "none") {
          var l = (/\.(\w+)$/.exec(o) || [, "none"])[1];
          O = s[l] || l;
        }
        T.util.setLanguage(H, O), T.util.setLanguage(u, O);
        var D = T.plugins.autoloader;
        D && D.loadLanguages(O), _(o, function(P) {
          u.setAttribute(S, N);
          var c = M(u.getAttribute("data-range"));
          if (c) {
            var p = P.split(/\r\n?|\n/g), B = c[0], F = c[1] == null ? p.length : c[1];
            B < 0 && (B += p.length), B = Math.max(0, Math.min(B - 1, p.length)), F < 0 && (F += p.length), F = Math.max(0, Math.min(F, p.length)), P = p.slice(B, F).join(`
`), u.hasAttribute("data-start") || u.setAttribute("data-start", String(B + 1));
          }
          H.textContent = P, T.highlightElement(H);
        }, function(P) {
          u.setAttribute(S, t), H.textContent = P;
        });
      }
    }), T.plugins.fileHighlight = { highlight: function(u) {
      for (var H = (u || document).querySelectorAll(C), o = 0, O; O = H[o++]; ) T.highlightElement(O);
    } };
    var m = !1;
    T.fileHighlight = function() {
      m || (console.warn("Prism.fileHighlight is deprecated. Use `Prism.plugins.fileHighlight.highlight` instead."), m = !0), T.plugins.fileHighlight.highlight.apply(this, arguments);
    };
  })();
})), I = (E) => E.flatMap(gT), gT = (E) => sE(yT(E)).map(fT), fT = (E) => E.replace(/ +/g, " ").trim(), yT = (E) => ({
  type: "mandatory_block",
  items: jE(E, 0)[0]
}), jE = (E, e, T) => {
  const R = [];
  for (; E[e]; ) {
    const [A, r] = bT(E, e);
    if (R.push(A), e = r, E[e] === "|") e++;
    else if (E[e] === "}" || E[e] === "]") {
      if (T !== E[e]) throw new Error(`Unbalanced parenthesis in: ${E}`);
      return e++, [R, e];
    } else if (e === E.length) {
      if (T) throw new Error(`Unbalanced parenthesis in: ${E}`);
      return [R, e];
    } else throw new Error(`Unexpected "${E[e]}"`);
  }
  return [R, e];
}, bT = (E, e) => {
  const T = [];
  for (; ; ) {
    const [R, A] = vT(E, e);
    if (R)
      T.push(R), e = A;
    else break;
  }
  return T.length === 1 ? [T[0], e] : [{
    type: "concatenation",
    items: T
  }, e];
}, vT = (E, e) => {
  if (E[e] === "{") return VT(E, e + 1);
  if (E[e] === "[") return xT(E, e + 1);
  {
    let T = "";
    for (; E[e] && /[A-Za-z0-9_ ]/.test(E[e]); )
      T += E[e], e++;
    return [T, e];
  }
}, VT = (E, e) => {
  const [T, R] = jE(E, e, "}");
  return [{
    type: "mandatory_block",
    items: T
  }, R];
}, xT = (E, e) => {
  const [T, R] = jE(E, e, "]");
  return [{
    type: "optional_block",
    items: T
  }, R];
}, sE = (E) => {
  if (typeof E == "string") return [E];
  if (E.type === "concatenation") return E.items.map(sE).reduce(WT, [""]);
  if (E.type === "mandatory_block") return E.items.flatMap(sE);
  if (E.type === "optional_block") return ["", ...E.items.flatMap(sE)];
  throw new Error(`Unknown node type: ${E}`);
}, WT = (E, e) => {
  const T = [];
  for (const R of E) for (const A of e) T.push(R + A);
  return T;
}, i;
(function(E) {
  E.QUOTED_IDENTIFIER = "QUOTED_IDENTIFIER", E.IDENTIFIER = "IDENTIFIER", E.STRING = "STRING", E.VARIABLE = "VARIABLE", E.RESERVED_DATA_TYPE = "RESERVED_DATA_TYPE", E.RESERVED_PARAMETERIZED_DATA_TYPE = "RESERVED_PARAMETERIZED_DATA_TYPE", E.RESERVED_KEYWORD = "RESERVED_KEYWORD", E.RESERVED_FUNCTION_NAME = "RESERVED_FUNCTION_NAME", E.RESERVED_KEYWORD_PHRASE = "RESERVED_KEYWORD_PHRASE", E.RESERVED_DATA_TYPE_PHRASE = "RESERVED_DATA_TYPE_PHRASE", E.RESERVED_SET_OPERATION = "RESERVED_SET_OPERATION", E.RESERVED_CLAUSE = "RESERVED_CLAUSE", E.RESERVED_SELECT = "RESERVED_SELECT", E.RESERVED_JOIN = "RESERVED_JOIN", E.ARRAY_IDENTIFIER = "ARRAY_IDENTIFIER", E.ARRAY_KEYWORD = "ARRAY_KEYWORD", E.CASE = "CASE", E.END = "END", E.WHEN = "WHEN", E.ELSE = "ELSE", E.THEN = "THEN", E.LIMIT = "LIMIT", E.BETWEEN = "BETWEEN", E.AND = "AND", E.OR = "OR", E.XOR = "XOR", E.OPERATOR = "OPERATOR", E.COMMA = "COMMA", E.ASTERISK = "ASTERISK", E.PROPERTY_ACCESS_OPERATOR = "PROPERTY_ACCESS_OPERATOR", E.OPEN_PAREN = "OPEN_PAREN", E.CLOSE_PAREN = "CLOSE_PAREN", E.LINE_COMMENT = "LINE_COMMENT", E.BLOCK_COMMENT = "BLOCK_COMMENT", E.DISABLE_COMMENT = "DISABLE_COMMENT", E.NUMBER = "NUMBER", E.NAMED_PARAMETER = "NAMED_PARAMETER", E.QUOTED_PARAMETER = "QUOTED_PARAMETER", E.NUMBERED_PARAMETER = "NUMBERED_PARAMETER", E.POSITIONAL_PARAMETER = "POSITIONAL_PARAMETER", E.CUSTOM_PARAMETER = "CUSTOM_PARAMETER", E.DELIMITER = "DELIMITER", E.EOF = "EOF";
})(i = i || (i = {}));
var qe = (E) => ({
  type: i.EOF,
  raw: "«EOF»",
  text: "«EOF»",
  start: E
}), J = qe(1 / 0), j = (E) => (e) => e.type === E.type && e.text === E.text, k = {
  ARRAY: j({
    text: "ARRAY",
    type: i.RESERVED_DATA_TYPE
  }),
  BY: j({
    text: "BY",
    type: i.RESERVED_KEYWORD
  }),
  SET: j({
    text: "SET",
    type: i.RESERVED_CLAUSE
  }),
  STRUCT: j({
    text: "STRUCT",
    type: i.RESERVED_DATA_TYPE
  }),
  WINDOW: j({
    text: "WINDOW",
    type: i.RESERVED_CLAUSE
  }),
  VALUES: j({
    text: "VALUES",
    type: i.RESERVED_CLAUSE
  })
}, Qe = (E) => E === i.RESERVED_DATA_TYPE || E === i.RESERVED_KEYWORD || E === i.RESERVED_FUNCTION_NAME || E === i.RESERVED_KEYWORD_PHRASE || E === i.RESERVED_DATA_TYPE_PHRASE || E === i.RESERVED_CLAUSE || E === i.RESERVED_SELECT || E === i.RESERVED_SET_OPERATION || E === i.RESERVED_JOIN || E === i.ARRAY_KEYWORD || E === i.CASE || E === i.END || E === i.WHEN || E === i.ELSE || E === i.THEN || E === i.LIMIT || E === i.BETWEEN || E === i.AND || E === i.OR || E === i.XOR, XT = (E) => E === i.AND || E === i.OR || E === i.XOR, $T = [
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
  "APPROX_COUNT_DISTINCT",
  "APPROX_QUANTILES",
  "APPROX_TOP_COUNT",
  "APPROX_TOP_SUM",
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
  "BIT_COUNT",
  "PARSE_BIGNUMERIC",
  "PARSE_NUMERIC",
  "SAFE_CAST",
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
  "ERROR",
  "EXTERNAL_QUERY",
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
  "FARM_FINGERPRINT",
  "MD5",
  "SHA1",
  "SHA256",
  "SHA512",
  "HLL_COUNT.INIT",
  "HLL_COUNT.MERGE",
  "HLL_COUNT.MERGE_PARTIAL",
  "HLL_COUNT.EXTRACT",
  "MAKE_INTERVAL",
  "EXTRACT",
  "JUSTIFY_DAYS",
  "JUSTIFY_HOURS",
  "JUSTIFY_INTERVAL",
  "JSON_EXTRACT",
  "JSON_QUERY",
  "JSON_EXTRACT_SCALAR",
  "JSON_VALUE",
  "JSON_EXTRACT_ARRAY",
  "JSON_QUERY_ARRAY",
  "JSON_EXTRACT_STRING_ARRAY",
  "JSON_VALUE_ARRAY",
  "TO_JSON_STRING",
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
  "FIRST_VALUE",
  "LAST_VALUE",
  "NTH_VALUE",
  "LEAD",
  "LAG",
  "PERCENTILE_CONT",
  "PERCENTILE_DISC",
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
  "RANK",
  "DENSE_RANK",
  "PERCENT_RANK",
  "CUME_DIST",
  "NTILE",
  "ROW_NUMBER",
  "SESSION_USER",
  "CORR",
  "COVAR_POP",
  "COVAR_SAMP",
  "STDDEV_POP",
  "STDDEV_SAMP",
  "STDDEV",
  "VAR_POP",
  "VAR_SAMP",
  "VARIANCE",
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
  "CURRENT_TIME",
  "TIME",
  "EXTRACT",
  "TIME_ADD",
  "TIME_SUB",
  "TIME_DIFF",
  "TIME_TRUNC",
  "FORMAT_TIME",
  "PARSE_TIME",
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
  "GENERATE_UUID",
  "COALESCE",
  "IF",
  "IFNULL",
  "NULLIF",
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
  "BIT_COUNT",
  "BOOLEAN",
  "BYTES",
  "CAST",
  "FLOAT",
  "HEX_STRING",
  "INTEGER",
  "STRING",
  "COALESCE",
  "GREATEST",
  "IFNULL",
  "IS_INF",
  "IS_NAN",
  "IS_EXPLICITLY_DEFINED",
  "LEAST",
  "NVL",
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
  "FORMAT_IP",
  "PARSE_IP",
  "FORMAT_PACKED_IP",
  "PARSE_PACKED_IP",
  "JSON_EXTRACT",
  "JSON_EXTRACT_SCALAR",
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
  "REGEXP_MATCH",
  "REGEXP_EXTRACT",
  "REGEXP_REPLACE",
  "CONCAT",
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
  "TABLE_DATE_RANGE",
  "TABLE_DATE_RANGE_STRICT",
  "TABLE_QUERY",
  "HOST",
  "DOMAIN",
  "TLD",
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
  "BQ.JOBS.CANCEL",
  "BQ.REFRESH_MATERIALIZED_VIEW",
  "OPTIONS",
  "PIVOT",
  "UNPIVOT"
], KT = [
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
  "SAFE",
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
], wT = [
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
], JT = I(["SELECT [ALL | DISTINCT] [AS STRUCT | AS VALUE]"]), kT = I([
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
  "INSERT [INTO]",
  "VALUES",
  "SET",
  "MERGE [INTO]",
  "WHEN [NOT] MATCHED [BY SOURCE | BY TARGET] [THEN]",
  "UPDATE SET",
  "CLUSTER BY",
  "FOR SYSTEM_TIME AS OF",
  "WITH CONNECTION",
  "WITH PARTITION COLUMNS",
  "REMOTE WITH CONNECTION"
]), re = I(["CREATE [OR REPLACE] [TEMP|TEMPORARY|SNAPSHOT|EXTERNAL] TABLE [IF NOT EXISTS]"]), DE = I([
  "CREATE [OR REPLACE] [MATERIALIZED] VIEW [IF NOT EXISTS]",
  "UPDATE",
  "DELETE [FROM]",
  "DROP [SNAPSHOT | EXTERNAL] TABLE [IF EXISTS]",
  "ALTER TABLE [IF EXISTS]",
  "ADD COLUMN [IF NOT EXISTS]",
  "DROP COLUMN [IF EXISTS]",
  "RENAME TO",
  "ALTER COLUMN [IF EXISTS]",
  "SET DEFAULT COLLATE",
  "SET OPTIONS",
  "DROP NOT NULL",
  "SET DATA TYPE",
  "ALTER SCHEMA [IF EXISTS]",
  "ALTER [MATERIALIZED] VIEW [IF EXISTS]",
  "ALTER BI_CAPACITY",
  "TRUNCATE TABLE",
  "CREATE SCHEMA [IF NOT EXISTS]",
  "DEFAULT COLLATE",
  "CREATE [OR REPLACE] [TEMP|TEMPORARY|TABLE] FUNCTION [IF NOT EXISTS]",
  "CREATE [OR REPLACE] PROCEDURE [IF NOT EXISTS]",
  "CREATE [OR REPLACE] ROW ACCESS POLICY [IF NOT EXISTS]",
  "GRANT TO",
  "FILTER USING",
  "CREATE CAPACITY",
  "AS JSON",
  "CREATE RESERVATION",
  "CREATE ASSIGNMENT",
  "CREATE SEARCH INDEX [IF NOT EXISTS]",
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
  "GRANT",
  "REVOKE",
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
  "ASSERT",
  "EXPORT DATA"
]), qT = I([
  "UNION {ALL | DISTINCT}",
  "EXCEPT DISTINCT",
  "INTERSECT DISTINCT"
]), QT = I([
  "JOIN",
  "{LEFT | RIGHT | FULL} [OUTER] JOIN",
  "{INNER | CROSS} JOIN"
]), ZT = I([
  "TABLESAMPLE SYSTEM",
  "ANY TYPE",
  "ALL COLUMNS",
  "NOT DETERMINISTIC",
  "{ROWS | RANGE} BETWEEN",
  "IS [NOT] DISTINCT FROM"
]), zT = I([]), jT = {
  name: "bigquery",
  tokenizerOptions: {
    reservedSelect: JT,
    reservedClauses: [
      ...kT,
      ...DE,
      ...re
    ],
    reservedSetOperations: qT,
    reservedJoins: QT,
    reservedKeywordPhrases: ZT,
    reservedDataTypePhrases: zT,
    reservedKeywords: KT,
    reservedDataTypes: wT,
    reservedFunctionNames: $T,
    extraParens: ["[]"],
    stringTypes: [
      {
        quote: '""".."""',
        prefixes: [
          "R",
          "B",
          "RB",
          "BR"
        ]
      },
      {
        quote: "'''..'''",
        prefixes: [
          "R",
          "B",
          "RB",
          "BR"
        ]
      },
      '""-bs',
      "''-bs",
      {
        quote: '""-raw',
        prefixes: [
          "R",
          "B",
          "RB",
          "BR"
        ],
        requirePrefix: !0
      },
      {
        quote: "''-raw",
        prefixes: [
          "R",
          "B",
          "RB",
          "BR"
        ],
        requirePrefix: !0
      }
    ],
    identTypes: ["``"],
    identChars: { dashes: !0 },
    paramTypes: {
      positional: !0,
      named: ["@"],
      quoted: ["@"]
    },
    variableTypes: [{ regex: String.raw`@@\w+` }],
    lineCommentTypes: ["--", "#"],
    operators: [
      "&",
      "|",
      "^",
      "~",
      ">>",
      "<<",
      "||",
      "=>"
    ],
    postProcess: ER
  },
  formatOptions: {
    onelineClauses: [...re, ...DE],
    tabularOnelineClauses: DE
  }
};
function ER(E) {
  return eR(TR(E));
}
function eR(E) {
  let e = J;
  return E.map((T) => T.text === "OFFSET" && e.text === "[" ? (e = T, Object.assign(Object.assign({}, T), { type: i.RESERVED_FUNCTION_NAME })) : (e = T, T));
}
function TR(E) {
  var e;
  const T = [];
  for (let R = 0; R < E.length; R++) {
    const A = E[R];
    if ((k.ARRAY(A) || k.STRUCT(A)) && ((e = E[R + 1]) === null || e === void 0 ? void 0 : e.text) === "<") {
      const r = RR(E, R + 1), s = E.slice(R, r + 1);
      T.push({
        type: i.IDENTIFIER,
        raw: s.map(Oe("raw")).join(""),
        text: s.map(Oe("text")).join(""),
        start: A.start
      }), R = r;
    } else T.push(A);
  }
  return T;
}
var Oe = (E) => (e) => e.type === i.IDENTIFIER || e.type === i.COMMA ? e[E] + " " : e[E];
function RR(E, e) {
  let T = 0;
  for (let R = e; R < E.length; R++) {
    const A = E[R];
    if (A.text === "<" ? T++ : A.text === ">" ? T-- : A.text === ">>" && (T -= 2), T === 0) return R;
  }
  return E.length - 1;
}
var AR = [
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
  "MergeTree",
  "ReplacingMergeTree",
  "SummingMergeTree",
  "AggregatingMergeTree",
  "CollapsingMergeTree",
  "VersionedCollapsingMergeTree",
  "GraphiteMergeTree",
  "CoalescingMergeTree",
  "Atomic",
  "Shared",
  "Lazy",
  "Replicated",
  "PostgreSQL",
  "MySQL",
  "SQLite",
  "MaterializedPostgreSQL",
  "DataLakeCatalog"
], tR = [
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
], SR = [
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
], IR = I(["SELECT [DISTINCT]", "MODIFY QUERY SELECT [DISTINCT]"]), rR = I([
  "SET",
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
  "WINDOW",
  "PARTITION BY",
  "INSERT INTO",
  "VALUES",
  "DEPENDS ON",
  "MOVE {USER | ROLE | QUOTA | SETTINGS PROFILE | ROW POLICY}",
  "GRANT",
  "REVOKE",
  "CHECK GRANT",
  "SET [DEFAULT] ROLE [NONE | ALL | ALL EXCEPT]",
  "DEDUPLICATE BY",
  "MODIFY STATISTICS",
  "TYPE",
  "ALTER USER [IF EXISTS]",
  "ALTER [ROW] POLICY [IF EXISTS]",
  "DROP {USER | ROLE | QUOTA | PROFILE | SETTINGS PROFILE | ROW POLICY | POLICY} [IF EXISTS]"
]), Ne = I(["CREATE [OR REPLACE] [TEMPORARY] TABLE [IF NOT EXISTS]"]), PE = I([
  "ALL EXCEPT",
  "ON CLUSTER",
  "UPDATE",
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
  "SHOW [CREATE] {TABLE | TEMPORARY TABLE | DICTIONARY | VIEW | DATABASE}",
  "SHOW DATABASES [[NOT] {LIKE | ILIKE}]",
  "SHOW [FULL] [TEMPORARY] TABLES [FROM | IN]",
  "SHOW [EXTENDED] [FULL] COLUMNS {FROM | IN}",
  "ATTACH {TABLE | DICTIONARY | DATABASE} [IF NOT EXISTS]",
  "DETACH {TABLE | DICTIONARY | DATABASE} [IF EXISTS]",
  "PERMANENTLY",
  "SYNC",
  "DROP {DICTIONARY | DATABASE | PROFILE | VIEW | FUNCTION | NAMED COLLECTION} [IF EXISTS]",
  "DROP [TEMPORARY] TABLE [IF EXISTS] [IF EMPTY]",
  "RENAME TO",
  "EXISTS [TEMPORARY] {TABLE | DICTIONARY | DATABASE}",
  "KILL QUERY",
  "OPTIMIZE TABLE",
  "RENAME {TABLE | DICTIONARY | DATABASE}",
  "EXCHANGE {TABLES | DICTIONARIES}",
  "TRUNCATE TABLE [IF EXISTS]",
  "EXECUTE AS",
  "USE",
  "TO",
  "UNDROP TABLE",
  "CREATE {DATABASE | NAMED COLLECTION} [IF NOT EXISTS]",
  "CREATE [OR REPLACE] {VIEW | DICTIONARY} [IF NOT EXISTS]",
  "CREATE MATERIALIZED VIEW [IF NOT EXISTS]",
  "CREATE FUNCTION",
  "CREATE {USER | ROLE | QUOTA | SETTINGS PROFILE} [IF NOT EXISTS | OR REPLACE]",
  "CREATE [ROW] POLICY [IF NOT EXISTS | OR REPLACE]",
  "REPLACE [TEMPORARY] TABLE [IF NOT EXISTS]",
  "ALTER {ROLE | QUOTA | SETTINGS PROFILE} [IF EXISTS]",
  "ALTER [TEMPORARY] TABLE",
  "ALTER NAMED COLLECTION [IF EXISTS]",
  "GRANTEES",
  "NOT IDENTIFIED",
  "RESET AUTHENTICATION METHODS TO NEW",
  "{IDENTIFIED | ADD IDENTIFIED} [WITH | BY]",
  "[ADD | DROP] HOST {LOCAL | NAME | REGEXP | IP | LIKE}",
  "VALID UNTIL",
  "DROP [ALL] {PROFILES | SETTINGS}",
  "{ADD | MODIFY} SETTINGS",
  "ADD PROFILES",
  "APPLY DELETED MASK",
  "IN PARTITION",
  "{ADD | DROP | RENAME | CLEAR | COMMENT | MODIFY | ALTER | MATERIALIZE} COLUMN",
  "{DETACH | DROP | ATTACH | FETCH | MOVE} {PART | PARTITION}",
  "DROP DETACHED {PART | PARTITION}",
  "{FORGET | REPLACE} PARTITION",
  "CLEAR COLUMN",
  "{FREEZE | UNFREEZE} [PARTITION]",
  "CLEAR INDEX",
  "TO {DISK | VOLUME}",
  "[DELETE | REWRITE PARTS] IN PARTITION",
  "{MODIFY | RESET} SETTING",
  "DELETE WHERE",
  "MODIFY ORDER BY",
  "{MODIFY | REMOVE} SAMPLE BY",
  "{ADD | MATERIALIZE | CLEAR} INDEX [IF NOT EXISTS]",
  "DROP INDEX [IF EXISTS]",
  "GRANULARITY",
  "AFTER",
  "FIRST",
  "ADD CONSTRAINT [IF NOT EXISTS]",
  "DROP CONSTRAINT [IF EXISTS]",
  "MODIFY TTL",
  "REMOVE TTL",
  "ADD STATISTICS [IF NOT EXISTS]",
  "{DROP | CLEAR} STATISTICS [IF EXISTS]",
  "MATERIALIZE STATISTICS [ALL | IF EXISTS]",
  "KEYED BY",
  "NOT KEYED",
  "FOR [RANDOMIZED] INTERVAL",
  "AS {PERMISSIVE | RESTRICTIVE}",
  "FOR SELECT",
  "ADD PROJECTION [IF NOT EXISTS]",
  "{DROP | MATERIALIZE | CLEAR} PROJECTION [IF EXISTS]",
  "REFRESH {EVERY | AFTER}",
  "RANDOMIZE FOR",
  "APPEND",
  "APPEND TO",
  "DELETE FROM",
  "EXPLAIN [AST | SYNTAX | QUERY TREE | PLAN | PIPELINE | ESTIMATE | TABLE OVERRIDE]",
  "GRANT ON CLUSTER",
  "GRANT CURRENT GRANTS",
  "WITH GRANT OPTION",
  "REVOKE ON CLUSTER",
  "ADMIN OPTION FOR",
  "CHECK TABLE",
  "PARTITION ID",
  "{DESC | DESCRIBE} TABLE"
]), NR = I(["UNION [ALL | DISTINCT]", "PARALLEL WITH"]), sR = I(["[GLOBAL] [INNER|LEFT|RIGHT|FULL|CROSS] [OUTER|SEMI|ANTI|ANY|ALL|ASOF] JOIN", "[LEFT] ARRAY JOIN"]), aR = I(["{ROWS | RANGE} BETWEEN", "ALTER MATERIALIZE STATISTICS"]), nR = {
  name: "clickhouse",
  tokenizerOptions: {
    reservedSelect: IR,
    reservedClauses: [
      ...rR,
      ...Ne,
      ...PE
    ],
    reservedSetOperations: NR,
    reservedJoins: sR,
    reservedKeywordPhrases: aR,
    reservedKeywords: tR,
    reservedDataTypes: SR,
    reservedFunctionNames: AR,
    extraParens: ["[]", "{}"],
    lineCommentTypes: ["#", "--"],
    nestedBlockComments: !1,
    underscoresInNumbers: !0,
    stringTypes: ["$$", "''-qq-bs"],
    identTypes: ['""-qq-bs', "``"],
    paramTypes: { custom: [{
      regex: String.raw`\{[^:']+:[^}]+\}`,
      key: (E) => {
        const e = /\{([^:]+):/.exec(E);
        return e ? e[1].trim() : E;
      }
    }] },
    operators: [
      "%",
      "||",
      "?",
      ":",
      "==",
      "<=>",
      "->"
    ],
    postProcess: oR
  },
  formatOptions: {
    onelineClauses: [...Ne, ...PE],
    tabularOnelineClauses: PE
  }
};
function oR(E) {
  return E.map((e, T) => {
    const R = E[T + 1] || J, A = E[T - 1] || J;
    return e.type === i.RESERVED_SELECT && (R.type === i.COMMA || A.type === i.RESERVED_CLAUSE || A.type === i.COMMA) ? Object.assign(Object.assign({}, e), { type: i.RESERVED_KEYWORD }) : k.SET(e) && R.type === i.OPEN_PAREN ? Object.assign(Object.assign({}, e), { type: i.RESERVED_FUNCTION_NAME }) : e;
  });
}
var iR = [
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
  "BASE_TABLE",
  "JSON_TABLE",
  "UNNEST",
  "XMLTABLE",
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
  "CAST"
], CR = [
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
], LR = [
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
], _R = I(["SELECT [ALL | DISTINCT]"]), lR = I([
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
  "INSERT INTO",
  "VALUES",
  "SET",
  "MERGE INTO",
  "WHEN [NOT] MATCHED [THEN]",
  "UPDATE SET",
  "INSERT"
]), se = I(["CREATE [GLOBAL TEMPORARY | EXTERNAL] TABLE [IF NOT EXISTS]"]), ME = I([
  "CREATE [OR REPLACE] VIEW",
  "UPDATE",
  "WHERE CURRENT OF",
  "WITH {RR | RS | CS | UR}",
  "DELETE FROM",
  "DROP TABLE [IF EXISTS]",
  "ALTER TABLE",
  "ADD [COLUMN]",
  "DROP [COLUMN]",
  "RENAME COLUMN",
  "ALTER [COLUMN]",
  "SET DATA TYPE",
  "SET NOT NULL",
  "DROP {DEFAULT | GENERATED | NOT NULL}",
  "TRUNCATE [TABLE]",
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
]), DR = I([
  "UNION [ALL]",
  "EXCEPT [ALL]",
  "INTERSECT [ALL]"
]), PR = I([
  "JOIN",
  "{LEFT | RIGHT | FULL} [OUTER] JOIN",
  "{INNER | CROSS} JOIN"
]), MR = I([
  "ON DELETE",
  "ON UPDATE",
  "SET NULL",
  "{ROWS | RANGE} BETWEEN"
]), UR = I([]), dR = {
  name: "db2",
  tokenizerOptions: {
    reservedSelect: _R,
    reservedClauses: [
      ...lR,
      ...se,
      ...ME
    ],
    reservedSetOperations: DR,
    reservedJoins: PR,
    reservedKeywordPhrases: MR,
    reservedDataTypePhrases: UR,
    reservedKeywords: CR,
    reservedDataTypes: LR,
    reservedFunctionNames: iR,
    extraParens: ["[]"],
    stringTypes: [{
      quote: "''-qq",
      prefixes: [
        "G",
        "N",
        "U&"
      ]
    }, {
      quote: "''-raw",
      prefixes: [
        "X",
        "BX",
        "GX",
        "UX"
      ],
      requirePrefix: !0
    }],
    identTypes: ['""-qq'],
    identChars: {
      first: "@#$",
      rest: "@#$"
    },
    paramTypes: {
      positional: !0,
      named: [":"]
    },
    paramChars: {
      first: "@#$",
      rest: "@#$"
    },
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
    onelineClauses: [...se, ...ME],
    tabularOnelineClauses: ME
  }
}, pR = [
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
  "UNPACK",
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
  "CAST"
], uR = [
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
], cR = [
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
], GR = I(["SELECT [ALL | DISTINCT]"]), mR = I([
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
  "INSERT INTO",
  "VALUES",
  "SET",
  "MERGE INTO",
  "WHEN [NOT] MATCHED [THEN]",
  "UPDATE SET",
  "DELETE",
  "INSERT",
  "FOR SYSTEM NAME"
]), ae = I(["CREATE [OR REPLACE] TABLE"]), UE = I([
  "CREATE [OR REPLACE] [RECURSIVE] VIEW",
  "UPDATE",
  "WHERE CURRENT OF",
  "WITH {NC | RR | RS | CS | UR}",
  "DELETE FROM",
  "DROP TABLE",
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
  "TRUNCATE [TABLE]",
  "SET [CURRENT] SCHEMA",
  "SET CURRENT_SCHEMA",
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
]), HR = I([
  "UNION [ALL]",
  "EXCEPT [ALL]",
  "INTERSECT [ALL]"
]), BR = I([
  "JOIN",
  "{LEFT | RIGHT | FULL} [OUTER] JOIN",
  "[LEFT | RIGHT] EXCEPTION JOIN",
  "{INNER | CROSS} JOIN"
]), FR = I([
  "ON DELETE",
  "ON UPDATE",
  "SET NULL",
  "{ROWS | RANGE} BETWEEN"
]), hR = I([]), YR = {
  name: "db2i",
  tokenizerOptions: {
    reservedSelect: GR,
    reservedClauses: [
      ...mR,
      ...ae,
      ...UE
    ],
    reservedSetOperations: HR,
    reservedJoins: BR,
    reservedKeywordPhrases: FR,
    reservedDataTypePhrases: hR,
    reservedKeywords: uR,
    reservedDataTypes: cR,
    reservedFunctionNames: pR,
    nestedBlockComments: !0,
    extraParens: ["[]"],
    stringTypes: [{
      quote: "''-qq",
      prefixes: ["G", "N"]
    }, {
      quote: "''-raw",
      prefixes: [
        "X",
        "BX",
        "GX",
        "UX"
      ],
      requirePrefix: !0
    }],
    identTypes: ['""-qq'],
    identChars: {
      first: "@#$",
      rest: "@#$"
    },
    paramTypes: {
      positional: !0,
      named: [":"]
    },
    paramChars: {
      first: "@#$",
      rest: "@#$"
    },
    operators: [
      "**",
      "¬=",
      "¬>",
      "¬<",
      "!>",
      "!<",
      "||",
      "=>"
    ]
  },
  formatOptions: {
    onelineClauses: [...ae, ...UE],
    tabularOnelineClauses: UE
  }
}, gR = [
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
  "CAST",
  "COALESCE",
  "RANK",
  "ROW_NUMBER"
], fR = [
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
], yR = [
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
], bR = I(["SELECT [ALL | DISTINCT]"]), vR = I([
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
  "USING SAMPLE",
  "QUALIFY",
  "INSERT [OR REPLACE] INTO",
  "VALUES",
  "DEFAULT VALUES",
  "SET",
  "RETURNING"
]), ne = I(["CREATE [OR REPLACE] [TEMPORARY | TEMP] TABLE [IF NOT EXISTS]"]), dE = I([
  "UPDATE",
  "ON CONFLICT",
  "DELETE FROM",
  "DROP TABLE [IF EXISTS]",
  "TRUNCATE",
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
  "CREATE [OR REPLACE] [TEMPORARY | TEMP] {MACRO | FUNCTION}",
  "DROP MACRO [TABLE] [IF EXISTS]",
  "DROP FUNCTION [IF EXISTS]",
  "CREATE [UNIQUE] INDEX [IF NOT EXISTS]",
  "DROP INDEX [IF EXISTS]",
  "CREATE [OR REPLACE] SCHEMA [IF NOT EXISTS]",
  "DROP SCHEMA [IF EXISTS]",
  "CREATE [OR REPLACE] [PERSISTENT | TEMPORARY] SECRET [IF NOT EXISTS]",
  "DROP [PERSISTENT | TEMPORARY] SECRET [IF EXISTS]",
  "CREATE [OR REPLACE] [TEMPORARY | TEMP] SEQUENCE",
  "DROP SEQUENCE [IF EXISTS]",
  "CREATE [OR REPLACE] [TEMPORARY | TEMP] VIEW [IF NOT EXISTS]",
  "DROP VIEW [IF EXISTS]",
  "ALTER VIEW",
  "CREATE TYPE",
  "DROP TYPE [IF EXISTS]",
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
  "PREPARE",
  "EXECUTE",
  "DEALLOCATE [PREPARE]"
]), VR = I([
  "UNION [ALL | BY NAME]",
  "EXCEPT [ALL]",
  "INTERSECT [ALL]"
]), xR = I([
  "JOIN",
  "{LEFT | RIGHT | FULL} [OUTER] JOIN",
  "{INNER | CROSS} JOIN",
  "{NATURAL | ASOF} [INNER] JOIN",
  "{NATURAL | ASOF} {LEFT | RIGHT | FULL} [OUTER] JOIN",
  "POSITIONAL JOIN",
  "ANTI JOIN",
  "SEMI JOIN"
]), WR = I([
  "{ROWS | RANGE | GROUPS} BETWEEN",
  "SIMILAR TO",
  "IS [NOT] DISTINCT FROM"
]), XR = I(["TIMESTAMP WITH TIME ZONE"]), $R = {
  name: "duckdb",
  tokenizerOptions: {
    reservedSelect: bR,
    reservedClauses: [
      ...vR,
      ...ne,
      ...dE
    ],
    reservedSetOperations: VR,
    reservedJoins: xR,
    reservedKeywordPhrases: WR,
    reservedDataTypePhrases: XR,
    supportsXor: !0,
    reservedKeywords: fR,
    reservedDataTypes: yR,
    reservedFunctionNames: gR,
    nestedBlockComments: !0,
    extraParens: ["[]", "{}"],
    underscoresInNumbers: !0,
    stringTypes: [
      "$$",
      "''-qq",
      {
        quote: "''-qq-bs",
        prefixes: ["E"],
        requirePrefix: !0
      },
      {
        quote: "''-raw",
        prefixes: ["B", "X"],
        requirePrefix: !0
      }
    ],
    identTypes: ['""-qq'],
    identChars: { rest: "$" },
    paramTypes: {
      positional: !0,
      numbered: ["$"],
      quoted: ["$"]
    },
    operators: [
      "//",
      "%",
      "**",
      "^",
      "!",
      "&",
      "|",
      "~",
      "<<",
      ">>",
      "::",
      "==",
      "->",
      "->>",
      ":",
      ":=",
      "=>",
      "~~",
      "!~~",
      "~~*",
      "!~~*",
      "~~~",
      "~",
      "!~",
      "~*",
      "!~*",
      "^@",
      "||",
      ">>=",
      "<<="
    ]
  },
  formatOptions: {
    alwaysDenseOperators: ["::"],
    onelineClauses: [...ne, ...dE],
    tabularOnelineClauses: dE
  }
}, KR = [
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
  "ARRAY_CONTAINS",
  "MAP_KEYS",
  "MAP_VALUES",
  "SIZE",
  "SORT_ARRAY",
  "BINARY",
  "CAST",
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
  "ASSERT_TRUE",
  "COALESCE",
  "IF",
  "ISNOTNULL",
  "ISNULL",
  "NULLIF",
  "NVL",
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
  "MASK",
  "MASK_FIRST_N",
  "MASK_HASH",
  "MASK_LAST_N",
  "MASK_SHOW_FIRST_N",
  "MASK_SHOW_LAST_N",
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
  "EXPLODE",
  "INLINE",
  "JSON_TUPLE",
  "PARSE_URL_TUPLE",
  "POSEXPLODE",
  "STACK",
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
], wR = [
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
], JR = [
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
], kR = I(["SELECT [ALL | DISTINCT]"]), qR = I([
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
  "INSERT INTO [TABLE]",
  "VALUES",
  "SET",
  "MERGE INTO",
  "WHEN [NOT] MATCHED [THEN]",
  "UPDATE SET",
  "INSERT [VALUES]",
  "INSERT OVERWRITE [LOCAL] DIRECTORY",
  "LOAD DATA [LOCAL] INPATH",
  "[OVERWRITE] INTO TABLE"
]), oe = I(["CREATE [TEMPORARY] [EXTERNAL] TABLE [IF NOT EXISTS]"]), pE = I([
  "CREATE [MATERIALIZED] VIEW [IF NOT EXISTS]",
  "UPDATE",
  "DELETE FROM",
  "DROP TABLE [IF EXISTS]",
  "ALTER TABLE",
  "RENAME TO",
  "TRUNCATE [TABLE]",
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
]), QR = I(["UNION [ALL | DISTINCT]"]), ZR = I([
  "JOIN",
  "{LEFT | RIGHT | FULL} [OUTER] JOIN",
  "{INNER | CROSS} JOIN",
  "LEFT SEMI JOIN"
]), zR = I(["{ROWS | RANGE} BETWEEN"]), jR = I([]), EA = {
  name: "hive",
  tokenizerOptions: {
    reservedSelect: kR,
    reservedClauses: [
      ...qR,
      ...oe,
      ...pE
    ],
    reservedSetOperations: QR,
    reservedJoins: ZR,
    reservedKeywordPhrases: zR,
    reservedDataTypePhrases: jR,
    reservedKeywords: wR,
    reservedDataTypes: JR,
    reservedFunctionNames: KR,
    extraParens: ["[]"],
    stringTypes: ['""-bs', "''-bs"],
    identTypes: ["``"],
    variableTypes: [{
      quote: "{}",
      prefixes: ["$"],
      requirePrefix: !0
    }],
    operators: [
      "%",
      "~",
      "^",
      "|",
      "&",
      "<=>",
      "==",
      "!",
      "||"
    ]
  },
  formatOptions: {
    onelineClauses: [...oe, ...pE],
    tabularOnelineClauses: pE
  }
};
function CE(E) {
  return E.map((e, T) => {
    const R = E[T + 1] || J;
    if (k.SET(e) && R.text === "(") return Object.assign(Object.assign({}, e), { type: i.RESERVED_FUNCTION_NAME });
    const A = E[T - 1] || J;
    return k.VALUES(e) && A.text === "=" ? Object.assign(Object.assign({}, e), { type: i.RESERVED_FUNCTION_NAME }) : e;
  });
}
var eA = [
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
], TA = [
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
], RA = [
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
  "COALESCE",
  "NULLIF"
], AA = I(["SELECT [ALL | DISTINCT | DISTINCTROW]"]), tA = I([
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
  "INSERT [LOW_PRIORITY | DELAYED | HIGH_PRIORITY] [IGNORE] [INTO]",
  "REPLACE [LOW_PRIORITY | DELAYED] [INTO]",
  "VALUES",
  "ON DUPLICATE KEY UPDATE",
  "SET",
  "RETURNING"
]), ie = I(["CREATE [OR REPLACE] [TEMPORARY] TABLE [IF NOT EXISTS]"]), uE = I([
  "CREATE [OR REPLACE] [SQL SECURITY DEFINER | SQL SECURITY INVOKER] VIEW [IF NOT EXISTS]",
  "UPDATE [LOW_PRIORITY] [IGNORE]",
  "DELETE [LOW_PRIORITY] [QUICK] [IGNORE] FROM",
  "DROP [TEMPORARY] TABLE [IF EXISTS]",
  "ALTER [ONLINE] [IGNORE] TABLE [IF EXISTS]",
  "ADD [COLUMN] [IF NOT EXISTS]",
  "{CHANGE | MODIFY} [COLUMN] [IF EXISTS]",
  "DROP [COLUMN] [IF EXISTS]",
  "RENAME [TO]",
  "RENAME COLUMN",
  "ALTER [COLUMN]",
  "{SET | DROP} DEFAULT",
  "SET {VISIBLE | INVISIBLE}",
  "TRUNCATE [TABLE]",
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
]), SA = I([
  "UNION [ALL | DISTINCT]",
  "EXCEPT [ALL | DISTINCT]",
  "INTERSECT [ALL | DISTINCT]",
  "MINUS [ALL | DISTINCT]"
]), IA = I([
  "JOIN",
  "{LEFT | RIGHT} [OUTER] JOIN",
  "{INNER | CROSS} JOIN",
  "NATURAL JOIN",
  "NATURAL {LEFT | RIGHT} [OUTER] JOIN",
  "STRAIGHT_JOIN"
]), rA = I([
  "ON {UPDATE | DELETE} [SET NULL | SET DEFAULT]",
  "CHARACTER SET",
  "{ROWS | RANGE} BETWEEN",
  "IDENTIFIED BY"
]), OA = I([]), NA = {
  name: "mariadb",
  tokenizerOptions: {
    reservedSelect: AA,
    reservedClauses: [
      ...tA,
      ...ie,
      ...uE
    ],
    reservedSetOperations: SA,
    reservedJoins: IA,
    reservedKeywordPhrases: rA,
    reservedDataTypePhrases: OA,
    supportsXor: !0,
    reservedKeywords: eA,
    reservedDataTypes: TA,
    reservedFunctionNames: RA,
    stringTypes: [
      '""-qq-bs',
      "''-qq-bs",
      {
        quote: "''-raw",
        prefixes: ["B", "X"],
        requirePrefix: !0
      }
    ],
    identTypes: ["``"],
    identChars: {
      first: "$",
      rest: "$",
      allowFirstCharNumber: !0
    },
    variableTypes: [
      { regex: "@@?[A-Za-z0-9_.$]+" },
      {
        quote: '""-qq-bs',
        prefixes: ["@"],
        requirePrefix: !0
      },
      {
        quote: "''-qq-bs",
        prefixes: ["@"],
        requirePrefix: !0
      },
      {
        quote: "``",
        prefixes: ["@"],
        requirePrefix: !0
      }
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
    ],
    postProcess: CE
  },
  formatOptions: {
    onelineClauses: [...ie, ...uE],
    tabularOnelineClauses: uE
  }
}, sA = [
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
], aA = [
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
], nA = [
  "ABS",
  "ACOS",
  "ADDDATE",
  "ADDTIME",
  "AES_DECRYPT",
  "AES_ENCRYPT",
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
  "YEAR",
  "YEARWEEK"
], oA = I(["SELECT [ALL | DISTINCT | DISTINCTROW]"]), iA = I([
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
  "INSERT [LOW_PRIORITY | DELAYED | HIGH_PRIORITY] [IGNORE] [INTO]",
  "REPLACE [LOW_PRIORITY | DELAYED] [INTO]",
  "VALUES",
  "ON DUPLICATE KEY UPDATE",
  "SET"
]), Ce = I(["CREATE [TEMPORARY] TABLE [IF NOT EXISTS]"]), cE = I([
  "CREATE [OR REPLACE] [SQL SECURITY DEFINER | SQL SECURITY INVOKER] VIEW [IF NOT EXISTS]",
  "UPDATE [LOW_PRIORITY] [IGNORE]",
  "DELETE [LOW_PRIORITY] [QUICK] [IGNORE] FROM",
  "DROP [TEMPORARY] TABLE [IF EXISTS]",
  "ALTER TABLE",
  "ADD [COLUMN]",
  "{CHANGE | MODIFY} [COLUMN]",
  "DROP [COLUMN]",
  "RENAME [TO | AS]",
  "RENAME COLUMN",
  "ALTER [COLUMN]",
  "{SET | DROP} DEFAULT",
  "TRUNCATE [TABLE]",
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
  "ITERATE",
  "LEAVE",
  "LOOP",
  "REPEAT",
  "RETURN",
  "WHILE"
]), CA = I(["UNION [ALL | DISTINCT]"]), LA = I([
  "JOIN",
  "{LEFT | RIGHT} [OUTER] JOIN",
  "{INNER | CROSS} JOIN",
  "NATURAL [INNER] JOIN",
  "NATURAL {LEFT | RIGHT} [OUTER] JOIN",
  "STRAIGHT_JOIN"
]), _A = I([
  "ON {UPDATE | DELETE} [SET NULL]",
  "CHARACTER SET",
  "{ROWS | RANGE} BETWEEN",
  "IDENTIFIED BY"
]), lA = I([]), DA = {
  name: "mysql",
  tokenizerOptions: {
    reservedSelect: oA,
    reservedClauses: [
      ...iA,
      ...Ce,
      ...cE
    ],
    reservedSetOperations: CA,
    reservedJoins: LA,
    reservedKeywordPhrases: _A,
    reservedDataTypePhrases: lA,
    supportsXor: !0,
    reservedKeywords: sA,
    reservedDataTypes: aA,
    reservedFunctionNames: nA,
    stringTypes: [
      '""-qq-bs',
      {
        quote: "''-qq-bs",
        prefixes: ["N"]
      },
      {
        quote: "''-raw",
        prefixes: ["B", "X"],
        requirePrefix: !0
      }
    ],
    identTypes: ["``"],
    identChars: {
      first: "$",
      rest: "$",
      allowFirstCharNumber: !0
    },
    variableTypes: [
      { regex: "@@?[A-Za-z0-9_.$]+" },
      {
        quote: '""-qq-bs',
        prefixes: ["@"],
        requirePrefix: !0
      },
      {
        quote: "''-qq-bs",
        prefixes: ["@"],
        requirePrefix: !0
      },
      {
        quote: "``",
        prefixes: ["@"],
        requirePrefix: !0
      }
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
    ],
    postProcess: CE
  },
  formatOptions: {
    onelineClauses: [...Ce, ...cE],
    tabularOnelineClauses: cE
  }
}, PA = [
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
], MA = [
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
], UA = [
  "ABS",
  "ACOS",
  "ADDDATE",
  "ADDTIME",
  "AES_DECRYPT",
  "AES_ENCRYPT",
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
  "YEAR",
  "YEARWEEK"
], dA = I(["SELECT [ALL | DISTINCT | DISTINCTROW]"]), pA = I([
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
  "INSERT [LOW_PRIORITY | DELAYED | HIGH_PRIORITY] [IGNORE] [INTO]",
  "REPLACE [LOW_PRIORITY | DELAYED] [INTO]",
  "VALUES",
  "ON DUPLICATE KEY UPDATE",
  "SET"
]), Le = I(["CREATE [TEMPORARY] TABLE [IF NOT EXISTS]"]), GE = I([
  "CREATE [OR REPLACE] [SQL SECURITY DEFINER | SQL SECURITY INVOKER] VIEW [IF NOT EXISTS]",
  "UPDATE [LOW_PRIORITY] [IGNORE]",
  "DELETE [LOW_PRIORITY] [QUICK] [IGNORE] FROM",
  "DROP [TEMPORARY] TABLE [IF EXISTS]",
  "ALTER TABLE",
  "ADD [COLUMN]",
  "{CHANGE | MODIFY} [COLUMN]",
  "DROP [COLUMN]",
  "RENAME [TO | AS]",
  "RENAME COLUMN",
  "ALTER [COLUMN]",
  "{SET | DROP} DEFAULT",
  "TRUNCATE [TABLE]",
  "ALTER DATABASE",
  "ALTER INSTANCE",
  "ALTER RESOURCE GROUP",
  "ALTER SEQUENCE",
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
  "TABLE",
  "UNINSTALL COMPONENT",
  "UNINSTALL PLUGIN",
  "UNLOCK INSTANCE",
  "UNLOCK TABLES",
  "USE"
]), uA = I(["UNION [ALL | DISTINCT]"]), cA = I([
  "JOIN",
  "{LEFT | RIGHT} [OUTER] JOIN",
  "{INNER | CROSS} JOIN",
  "NATURAL [INNER] JOIN",
  "NATURAL {LEFT | RIGHT} [OUTER] JOIN",
  "STRAIGHT_JOIN"
]), GA = I([
  "ON {UPDATE | DELETE} [SET NULL]",
  "CHARACTER SET",
  "{ROWS | RANGE} BETWEEN",
  "IDENTIFIED BY"
]), mA = I([]), HA = {
  name: "tidb",
  tokenizerOptions: {
    reservedSelect: dA,
    reservedClauses: [
      ...pA,
      ...Le,
      ...GE
    ],
    reservedSetOperations: uA,
    reservedJoins: cA,
    reservedKeywordPhrases: GA,
    reservedDataTypePhrases: mA,
    supportsXor: !0,
    reservedKeywords: PA,
    reservedDataTypes: MA,
    reservedFunctionNames: UA,
    stringTypes: [
      '""-qq-bs',
      {
        quote: "''-qq-bs",
        prefixes: ["N"]
      },
      {
        quote: "''-raw",
        prefixes: ["B", "X"],
        requirePrefix: !0
      }
    ],
    identTypes: ["``"],
    identChars: {
      first: "$",
      rest: "$",
      allowFirstCharNumber: !0
    },
    variableTypes: [
      { regex: "@@?[A-Za-z0-9_.$]+" },
      {
        quote: '""-qq-bs',
        prefixes: ["@"],
        requirePrefix: !0
      },
      {
        quote: "''-qq-bs",
        prefixes: ["@"],
        requirePrefix: !0
      },
      {
        quote: "``",
        prefixes: ["@"],
        requirePrefix: !0
      }
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
    ],
    postProcess: CE
  },
  formatOptions: {
    onelineClauses: [...Le, ...GE],
    tabularOnelineClauses: GE
  }
}, BA = [
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
  "UPPER",
  "UUID",
  "VARIANCE",
  "VARIANCE_POP",
  "VARIANCE_SAMP",
  "VAR_POP",
  "VAR_SAMP",
  "WEEKDAY_MILLIS",
  "WEEKDAY_STR",
  "CAST"
], FA = [
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
], hA = [], YA = I(["SELECT [ALL | DISTINCT]"]), gA = I([
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
  "INSERT INTO",
  "VALUES",
  "SET",
  "MERGE INTO",
  "WHEN [NOT] MATCHED THEN",
  "UPDATE SET",
  "INSERT",
  "NEST",
  "UNNEST",
  "RETURNING"
]), _e = I([
  "UPDATE",
  "DELETE FROM",
  "SET SCHEMA",
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
  "LET",
  "SET CURRENT SCHEMA",
  "SHOW",
  "USE [PRIMARY] KEYS"
]), fA = I([
  "UNION [ALL]",
  "EXCEPT [ALL]",
  "INTERSECT [ALL]"
]), yA = I([
  "JOIN",
  "{LEFT | RIGHT} [OUTER] JOIN",
  "INNER JOIN"
]), bA = I(["{ROWS | RANGE | GROUPS} BETWEEN"]), vA = I([]), VA = {
  name: "n1ql",
  tokenizerOptions: {
    reservedSelect: YA,
    reservedClauses: [...gA, ..._e],
    reservedSetOperations: fA,
    reservedJoins: yA,
    reservedKeywordPhrases: bA,
    reservedDataTypePhrases: vA,
    supportsXor: !0,
    reservedKeywords: FA,
    reservedDataTypes: hA,
    reservedFunctionNames: BA,
    stringTypes: ['""-bs', "''-bs"],
    identTypes: ["``"],
    extraParens: ["[]", "{}"],
    paramTypes: {
      positional: !0,
      numbered: ["$"],
      named: ["$"]
    },
    lineCommentTypes: ["#", "--"],
    operators: [
      "%",
      "==",
      ":",
      "||"
    ]
  },
  formatOptions: { onelineClauses: _e }
}, xA = [
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
], WA = [
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
], XA = [
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
  "GREATEST",
  "LEAST",
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
  "BFILENAME",
  "EMPTY_BLOB,",
  "EMPTY_CLOB",
  "CARDINALITY",
  "COLLECT",
  "POWERMULTISET",
  "POWERMULTISET_BY_CARDINALITY",
  "SET",
  "SYS_CONNECT_BY_PATH",
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
  "DECODE",
  "DUMP",
  "ORA_HASH",
  "VSIZE",
  "COALESCE",
  "LNNVL",
  "NULLIF",
  "NVL",
  "NVL2",
  "SYS_CONTEXT",
  "SYS_GUID",
  "SYS_TYPEID",
  "UID",
  "USER",
  "USERENV",
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
  "FIRST_VALUE",
  "LAG",
  "LAST_VALUE",
  "LEAD",
  "NTILE",
  "RATIO_TO_REPORT",
  "ROW_NUMBER",
  "DEREF",
  "MAKE_REF",
  "REF",
  "REFTOHEX",
  "VALUE",
  "CV",
  "ITERATION_NUMBER",
  "PRESENTNNV",
  "PRESENTV",
  "PREVIOUS"
], $A = I(["SELECT [ALL | DISTINCT | UNIQUE]"]), KA = I([
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
  "INSERT [INTO | ALL INTO]",
  "VALUES",
  "SET",
  "MERGE [INTO]",
  "WHEN [NOT] MATCHED [THEN]",
  "UPDATE SET",
  "RETURNING"
]), le = I(["CREATE [GLOBAL TEMPORARY | PRIVATE TEMPORARY | SHARDED | DUPLICATED | IMMUTABLE BLOCKCHAIN | BLOCKCHAIN | IMMUTABLE] TABLE"]), mE = I([
  "CREATE [OR REPLACE] [NO FORCE | FORCE] [EDITIONING | EDITIONABLE | EDITIONABLE EDITIONING | NONEDITIONABLE] VIEW",
  "CREATE MATERIALIZED VIEW",
  "UPDATE [ONLY]",
  "DELETE FROM [ONLY]",
  "DROP TABLE",
  "ALTER TABLE",
  "ADD",
  "DROP {COLUMN | UNUSED COLUMNS | COLUMNS CONTINUE}",
  "MODIFY",
  "RENAME TO",
  "RENAME COLUMN",
  "TRUNCATE TABLE",
  "SET SCHEMA",
  "BEGIN",
  "CONNECT BY",
  "DECLARE",
  "EXCEPT",
  "EXCEPTION",
  "LOOP",
  "START WITH"
]), wA = I([
  "UNION [ALL]",
  "MINUS",
  "INTERSECT"
]), JA = I([
  "JOIN",
  "{LEFT | RIGHT | FULL} [OUTER] JOIN",
  "{INNER | CROSS} JOIN",
  "NATURAL [INNER] JOIN",
  "NATURAL {LEFT | RIGHT | FULL} [OUTER] JOIN",
  "{CROSS | OUTER} APPLY"
]), kA = I([
  "ON {UPDATE | DELETE} [SET NULL]",
  "ON COMMIT",
  "{ROWS | RANGE} BETWEEN"
]), qA = I([]), QA = {
  name: "plsql",
  tokenizerOptions: {
    reservedSelect: $A,
    reservedClauses: [
      ...KA,
      ...le,
      ...mE
    ],
    reservedSetOperations: wA,
    reservedJoins: JA,
    reservedKeywordPhrases: kA,
    reservedDataTypePhrases: qA,
    supportsXor: !0,
    reservedKeywords: xA,
    reservedDataTypes: WA,
    reservedFunctionNames: XA,
    stringTypes: [{
      quote: "''-qq",
      prefixes: ["N"]
    }, {
      quote: "q''",
      prefixes: ["N"]
    }],
    identTypes: ['""-qq'],
    identChars: { rest: "$#" },
    variableTypes: [{ regex: "&{1,2}[A-Za-z][A-Za-z0-9_$#]*" }],
    paramTypes: {
      numbered: [":"],
      named: [":"]
    },
    operators: [
      "**",
      ":=",
      "%",
      "~=",
      "^=",
      ">>",
      "<<",
      "=>",
      "@",
      "||"
    ],
    postProcess: ZA
  },
  formatOptions: {
    alwaysDenseOperators: ["@"],
    onelineClauses: [...le, ...mE],
    tabularOnelineClauses: mE
  }
};
function ZA(E) {
  let e = J;
  return E.map((T) => k.SET(T) && k.BY(e) ? Object.assign(Object.assign({}, T), { type: i.RESERVED_KEYWORD }) : (Qe(T.type) && (e = T), T));
}
var zA = [
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
  "BIT_COUNT",
  "BIT_LENGTH",
  "GET_BIT",
  "LENGTH",
  "OCTET_LENGTH",
  "OVERLAY",
  "POSITION",
  "SET_BIT",
  "SUBSTRING",
  "REGEXP_MATCH",
  "REGEXP_MATCHES",
  "REGEXP_REPLACE",
  "REGEXP_SPLIT_TO_ARRAY",
  "REGEXP_SPLIT_TO_TABLE",
  "TO_CHAR",
  "TO_DATE",
  "TO_NUMBER",
  "TO_TIMESTAMP",
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
  "ENUM_FIRST",
  "ENUM_LAST",
  "ENUM_RANGE",
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
  "TRUNC",
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
  "GEN_RANDOM_UUID",
  "UUIDV4",
  "UUIDV7",
  "UUID_EXTRACT_TIMESTAMP",
  "UUID_EXTRACT_VERSION",
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
  "CURRVAL",
  "LASTVAL",
  "NEXTVAL",
  "SETVAL",
  "COALESCE",
  "GREATEST",
  "LEAST",
  "NULLIF",
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
  "ISEMPTY",
  "LOWER",
  "LOWER_INC",
  "LOWER_INF",
  "MULTIRANGE",
  "RANGE_MERGE",
  "UPPER",
  "UPPER_INC",
  "UPPER_INF",
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
  "GENERATE_SERIES",
  "GENERATE_SUBSCRIPTS",
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
  "SUPPRESS_REDUNDANT_UPDATES_TRIGGER",
  "TSVECTOR_UPDATE_TRIGGER",
  "TSVECTOR_UPDATE_TRIGGER_COLUMN",
  "PG_EVENT_TRIGGER_DDL_COMMANDS",
  "PG_EVENT_TRIGGER_DROPPED_OBJECTS",
  "PG_EVENT_TRIGGER_TABLE_REWRITE_OID",
  "PG_EVENT_TRIGGER_TABLE_REWRITE_REASON",
  "PG_GET_OBJECT_ADDRESS",
  "PG_MCV_LIST_ITEMS",
  "CAST"
], jA = [
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
], Et = [
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
], et = I(["SELECT [ALL | DISTINCT]"]), Tt = I([
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
  "INSERT INTO",
  "VALUES",
  "DEFAULT VALUES",
  "SET",
  "RETURNING"
]), De = I(["CREATE [GLOBAL | LOCAL] [TEMPORARY | TEMP | UNLOGGED] TABLE [IF NOT EXISTS]"]), HE = I([
  "CREATE [OR REPLACE] [TEMP | TEMPORARY] [RECURSIVE] VIEW",
  "CREATE [MATERIALIZED] VIEW [IF NOT EXISTS]",
  "UPDATE [ONLY]",
  "WHERE CURRENT OF",
  "ON CONFLICT",
  "DELETE FROM [ONLY]",
  "DROP TABLE [IF EXISTS]",
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
  "TRUNCATE [TABLE] [ONLY]",
  "SET SCHEMA",
  "AFTER",
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
]), Rt = I([
  "UNION [ALL | DISTINCT]",
  "EXCEPT [ALL | DISTINCT]",
  "INTERSECT [ALL | DISTINCT]"
]), At = I([
  "JOIN",
  "{LEFT | RIGHT | FULL} [OUTER] JOIN",
  "{INNER | CROSS} JOIN",
  "NATURAL [INNER] JOIN",
  "NATURAL {LEFT | RIGHT | FULL} [OUTER] JOIN"
]), tt = I([
  "PRIMARY KEY",
  "GENERATED {ALWAYS | BY DEFAULT} AS IDENTITY",
  "ON {UPDATE | DELETE} [NO ACTION | RESTRICT | CASCADE | SET NULL | SET DEFAULT]",
  "DO {NOTHING | UPDATE}",
  "AS MATERIALIZED",
  "{ROWS | RANGE | GROUPS} BETWEEN",
  "IS [NOT] DISTINCT FROM",
  "NULLS {FIRST | LAST}",
  "WITH ORDINALITY"
]), St = I(["[TIMESTAMP | TIME] {WITH | WITHOUT} TIME ZONE"]), It = {
  name: "postgresql",
  tokenizerOptions: {
    reservedSelect: et,
    reservedClauses: [
      ...Tt,
      ...De,
      ...HE
    ],
    reservedSetOperations: Rt,
    reservedJoins: At,
    reservedKeywordPhrases: tt,
    reservedDataTypePhrases: St,
    reservedKeywords: jA,
    reservedDataTypes: Et,
    reservedFunctionNames: zA,
    nestedBlockComments: !0,
    extraParens: ["[]"],
    underscoresInNumbers: !0,
    stringTypes: [
      "$$",
      {
        quote: "''-qq",
        prefixes: ["U&"]
      },
      {
        quote: "''-qq-bs",
        prefixes: ["E"],
        requirePrefix: !0
      },
      {
        quote: "''-raw",
        prefixes: ["B", "X"],
        requirePrefix: !0
      }
    ],
    identTypes: [{
      quote: '""-qq',
      prefixes: ["U&"]
    }],
    identChars: { rest: "$" },
    paramTypes: { numbered: ["$"] },
    operators: [
      "%",
      "^",
      "|/",
      "||/",
      "@",
      ":=",
      "&",
      "|",
      "#",
      "~",
      "<<",
      ">>",
      "~>~",
      "~<~",
      "~>=~",
      "~<=~",
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
      "?",
      "@?",
      "?&",
      "->",
      "->>",
      "#>",
      "#>>",
      "#-",
      "=>",
      ">>=",
      "<<=",
      "~~",
      "~~*",
      "!~~",
      "!~~*",
      "~",
      "~*",
      "!~",
      "!~*",
      "-|-",
      "||",
      "@@@",
      "!!",
      "^@",
      "<%",
      "%>",
      "<<%",
      "%>>",
      "<<->",
      "<->>",
      "<<<->",
      "<->>>",
      "::",
      ":",
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
    onelineClauses: [...De, ...HE],
    tabularOnelineClauses: HE
  }
}, rt = [
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
  "array_concat",
  "array_flatten",
  "get_array_length",
  "split_to_array",
  "subarray",
  "BIT_AND",
  "BIT_OR",
  "BOOL_AND",
  "BOOL_OR",
  "COALESCE",
  "DECODE",
  "GREATEST",
  "LEAST",
  "NVL",
  "NVL2",
  "NULLIF",
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
  "CHECKSUM",
  "FUNC_SHA1",
  "FNV_HASH",
  "MD5",
  "SHA",
  "SHA1",
  "SHA2",
  "HLL",
  "HLL_CREATE_SKETCH",
  "HLL_CARDINALITY",
  "HLL_COMBINE",
  "IS_VALID_JSON",
  "IS_VALID_JSON_ARRAY",
  "JSON_ARRAY_LENGTH",
  "JSON_EXTRACT_ARRAY_ELEMENT_TEXT",
  "JSON_EXTRACT_PATH_TEXT",
  "JSON_PARSE",
  "JSON_SERIALIZE",
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
  "EXPLAIN_MODEL",
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
  "CAST",
  "CONVERT",
  "TO_CHAR",
  "TO_DATE",
  "TO_NUMBER",
  "TEXT_TO_INT_ALT",
  "TEXT_TO_NUMERIC_ALT",
  "CHANGE_QUERY_PRIORITY",
  "CHANGE_SESSION_PRIORITY",
  "CHANGE_USER_PRIORITY",
  "CURRENT_SETTING",
  "PG_CANCEL_BACKEND",
  "PG_TERMINATE_BACKEND",
  "REBOOT_CLUSTER",
  "SET_CONFIG",
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
], Ot = [
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
  "COMPROWS",
  "COMPUPDATE",
  "MAXERROR",
  "NOLOAD",
  "STATUPDATE",
  "FORMAT",
  "CSV",
  "DELIMITER",
  "FIXEDWIDTH",
  "SHAPEFILE",
  "AVRO",
  "JSON",
  "PARQUET",
  "ORC",
  "ACCESS_KEY_ID",
  "CREDENTIALS",
  "ENCRYPTED",
  "IAM_ROLE",
  "MASTER_SYMMETRIC_KEY",
  "SECRET_ACCESS_KEY",
  "SESSION_TOKEN",
  "BZIP2",
  "GZIP",
  "LZOP",
  "ZSTD",
  "MANIFEST",
  "READRATIO",
  "REGION",
  "SSH",
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
  "CATALOG_ROLE",
  "SECRET_ARN",
  "EXTERNAL",
  "AUTO",
  "EVEN",
  "KEY",
  "PREDICATE",
  "COMPRESSION"
], Nt = [
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
], st = I(["SELECT [ALL | DISTINCT]"]), at = I([
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
  "INSERT INTO",
  "VALUES",
  "SET"
]), Pe = I(["CREATE [TEMPORARY | TEMP | LOCAL TEMPORARY | LOCAL TEMP] TABLE [IF NOT EXISTS]"]), BE = I([
  "CREATE [OR REPLACE | MATERIALIZED] VIEW",
  "UPDATE",
  "DELETE [FROM]",
  "DROP TABLE [IF EXISTS]",
  "ALTER TABLE",
  "ALTER TABLE APPEND",
  "ADD [COLUMN]",
  "DROP [COLUMN]",
  "RENAME TO",
  "RENAME COLUMN",
  "ALTER COLUMN",
  "TYPE",
  "ENCODE",
  "TRUNCATE [TABLE]",
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
]), nt = I([
  "UNION [ALL]",
  "EXCEPT",
  "INTERSECT",
  "MINUS"
]), ot = I([
  "JOIN",
  "{LEFT | RIGHT | FULL} [OUTER] JOIN",
  "{INNER | CROSS} JOIN",
  "NATURAL [INNER] JOIN",
  "NATURAL {LEFT | RIGHT | FULL} [OUTER] JOIN"
]), it = I([
  "NULL AS",
  "DATA CATALOG",
  "HIVE METASTORE",
  "{ROWS | RANGE} BETWEEN"
]), Ct = I([]), Lt = {
  name: "redshift",
  tokenizerOptions: {
    reservedSelect: st,
    reservedClauses: [
      ...at,
      ...Pe,
      ...BE
    ],
    reservedSetOperations: nt,
    reservedJoins: ot,
    reservedKeywordPhrases: it,
    reservedDataTypePhrases: Ct,
    reservedKeywords: Ot,
    reservedDataTypes: Nt,
    reservedFunctionNames: rt,
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
      "~",
      "<<",
      ">>",
      "||",
      "::"
    ]
  },
  formatOptions: {
    alwaysDenseOperators: ["::"],
    onelineClauses: [...Pe, ...BE],
    tabularOnelineClauses: BE
  }
}, _t = [
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
], lt = [
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
], Dt = [
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
  "STD",
  "STDDEV",
  "STDDEV_POP",
  "STDDEV_SAMP",
  "SUM",
  "VAR_POP",
  "VAR_SAMP",
  "VARIANCE",
  "CUME_DIST",
  "DENSE_RANK",
  "LAG",
  "LEAD",
  "NTH_VALUE",
  "NTILE",
  "PERCENT_RANK",
  "RANK",
  "ROW_NUMBER",
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
  "ELEMENT_AT",
  "ELEMENT_AT",
  "MAP_CONCAT",
  "MAP_ENTRIES",
  "MAP_FROM_ARRAYS",
  "MAP_FROM_ENTRIES",
  "MAP_KEYS",
  "MAP_VALUES",
  "STR_TO_MAP",
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
  "FROM_JSON",
  "GET_JSON_OBJECT",
  "JSON_ARRAY_LENGTH",
  "JSON_OBJECT_KEYS",
  "JSON_TUPLE",
  "SCHEMA_OF_JSON",
  "TO_JSON",
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
  "CAST",
  "COALESCE",
  "NULLIF"
], Pt = I(["SELECT [ALL | DISTINCT]"]), Mt = I([
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
  "INSERT [INTO | OVERWRITE] [TABLE]",
  "VALUES",
  "INSERT OVERWRITE [LOCAL] DIRECTORY",
  "LOAD DATA [LOCAL] INPATH",
  "[OVERWRITE] INTO TABLE"
]), Me = I(["CREATE [EXTERNAL] TABLE [IF NOT EXISTS]"]), FE = I([
  "CREATE [OR REPLACE] [GLOBAL TEMPORARY | TEMPORARY] VIEW [IF NOT EXISTS]",
  "DROP TABLE [IF EXISTS]",
  "ALTER TABLE",
  "ADD COLUMNS",
  "DROP {COLUMN | COLUMNS}",
  "RENAME TO",
  "RENAME COLUMN",
  "ALTER COLUMN",
  "TRUNCATE TABLE",
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
  "TABLESAMPLE",
  "PIVOT",
  "TRANSFORM",
  "EXPLAIN",
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
]), Ut = I([
  "UNION [ALL | DISTINCT]",
  "EXCEPT [ALL | DISTINCT]",
  "INTERSECT [ALL | DISTINCT]"
]), dt = I([
  "JOIN",
  "{LEFT | RIGHT | FULL} [OUTER] JOIN",
  "{INNER | CROSS} JOIN",
  "NATURAL [INNER] JOIN",
  "NATURAL {LEFT | RIGHT | FULL} [OUTER] JOIN",
  "[LEFT] {ANTI | SEMI} JOIN",
  "NATURAL [LEFT] {ANTI | SEMI} JOIN"
]), pt = I([
  "ON DELETE",
  "ON UPDATE",
  "CURRENT ROW",
  "{ROWS | RANGE} BETWEEN"
]), ut = I([]), ct = {
  name: "spark",
  tokenizerOptions: {
    reservedSelect: Pt,
    reservedClauses: [
      ...Mt,
      ...Me,
      ...FE
    ],
    reservedSetOperations: Ut,
    reservedJoins: dt,
    reservedKeywordPhrases: pt,
    reservedDataTypePhrases: ut,
    supportsXor: !0,
    reservedKeywords: _t,
    reservedDataTypes: lt,
    reservedFunctionNames: Dt,
    extraParens: ["[]"],
    stringTypes: [
      "''-bs",
      '""-bs',
      {
        quote: "''-raw",
        prefixes: ["R", "X"],
        requirePrefix: !0
      },
      {
        quote: '""-raw',
        prefixes: ["R", "X"],
        requirePrefix: !0
      }
    ],
    identTypes: ["``"],
    identChars: { allowFirstCharNumber: !0 },
    variableTypes: [{
      quote: "{}",
      prefixes: ["$"],
      requirePrefix: !0
    }],
    operators: [
      "%",
      "~",
      "^",
      "|",
      "&",
      "<=>",
      "==",
      "!",
      "||",
      "->"
    ],
    postProcess: Gt
  },
  formatOptions: {
    onelineClauses: [...Me, ...FE],
    tabularOnelineClauses: FE
  }
};
function Gt(E) {
  return E.map((e, T) => {
    const R = E[T - 1] || J, A = E[T + 1] || J;
    return k.WINDOW(e) && A.type === i.OPEN_PAREN ? Object.assign(Object.assign({}, e), { type: i.RESERVED_FUNCTION_NAME }) : e.text === "ITEMS" && e.type === i.RESERVED_KEYWORD && !(R.text === "COLLECTION" && A.text === "TERMINATED") ? Object.assign(Object.assign({}, e), {
      type: i.IDENTIFIER,
      text: e.raw
    }) : e;
  });
}
var mt = [
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
  "AVG",
  "COUNT",
  "GROUP_CONCAT",
  "MAX",
  "MIN",
  "SUM",
  "TOTAL",
  "DATE",
  "TIME",
  "DATETIME",
  "JULIANDAY",
  "UNIXEPOCH",
  "STRFTIME",
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
  "CAST"
], Ht = [
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
], Bt = [
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
], Ft = I(["SELECT [ALL | DISTINCT]"]), ht = I([
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
  "INSERT [OR ABORT | OR FAIL | OR IGNORE | OR REPLACE | OR ROLLBACK] INTO",
  "REPLACE INTO",
  "VALUES",
  "SET",
  "RETURNING"
]), Ue = I(["CREATE [TEMPORARY | TEMP] TABLE [IF NOT EXISTS]"]), hE = I([
  "CREATE [TEMPORARY | TEMP] VIEW [IF NOT EXISTS]",
  "UPDATE [OR ABORT | OR FAIL | OR IGNORE | OR REPLACE | OR ROLLBACK]",
  "ON CONFLICT",
  "DELETE FROM",
  "DROP TABLE [IF EXISTS]",
  "ALTER TABLE",
  "ADD [COLUMN]",
  "DROP [COLUMN]",
  "RENAME [COLUMN]",
  "RENAME TO",
  "SET SCHEMA"
]), Yt = I([
  "UNION [ALL]",
  "EXCEPT",
  "INTERSECT"
]), gt = I([
  "JOIN",
  "{LEFT | RIGHT | FULL} [OUTER] JOIN",
  "{INNER | CROSS} JOIN",
  "NATURAL [INNER] JOIN",
  "NATURAL {LEFT | RIGHT | FULL} [OUTER] JOIN"
]), ft = I([
  "ON {UPDATE | DELETE} [SET NULL | SET DEFAULT]",
  "{ROWS | RANGE | GROUPS} BETWEEN",
  "DO UPDATE"
]), yt = I([]), bt = {
  name: "sqlite",
  tokenizerOptions: {
    reservedSelect: Ft,
    reservedClauses: [
      ...ht,
      ...Ue,
      ...hE
    ],
    reservedSetOperations: Yt,
    reservedJoins: gt,
    reservedKeywordPhrases: ft,
    reservedDataTypePhrases: yt,
    reservedKeywords: Ht,
    reservedDataTypes: Bt,
    reservedFunctionNames: mt,
    stringTypes: ["''-qq", {
      quote: "''-raw",
      prefixes: ["X"],
      requirePrefix: !0
    }],
    identTypes: [
      '""-qq',
      "``",
      "[]"
    ],
    paramTypes: {
      positional: !0,
      numbered: ["?"],
      named: [
        ":",
        "@",
        "$"
      ]
    },
    operators: [
      "%",
      "~",
      "&",
      "|",
      "<<",
      ">>",
      "==",
      "->",
      "->>",
      "||"
    ]
  },
  formatOptions: {
    onelineClauses: [...Ue, ...hE],
    tabularOnelineClauses: hE
  }
}, vt = [
  "GROUPING",
  "RANK",
  "DENSE_RANK",
  "PERCENT_RANK",
  "CUME_DIST",
  "ROW_NUMBER",
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
  "CURRENT_DATE",
  "CURRENT_TIME",
  "LOCALTIME",
  "CURRENT_TIMESTAMP",
  "LOCALTIMESTAMP",
  "COUNT",
  "AVG",
  "MAX",
  "MIN",
  "SUM",
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
  "CAST",
  "COALESCE",
  "NULLIF",
  "ROUND",
  "SIN",
  "COS",
  "TAN",
  "ASIN",
  "ACOS",
  "ATAN"
], Vt = [
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
], xt = [
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
], Wt = I(["SELECT [ALL | DISTINCT]"]), Xt = I([
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
  "INSERT INTO",
  "VALUES",
  "SET"
]), de = I(["CREATE [GLOBAL TEMPORARY | LOCAL TEMPORARY] TABLE"]), YE = I([
  "CREATE [RECURSIVE] VIEW",
  "UPDATE",
  "WHERE CURRENT OF",
  "DELETE FROM",
  "DROP TABLE",
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
  "TRUNCATE TABLE",
  "SET SCHEMA"
]), $t = I([
  "UNION [ALL | DISTINCT]",
  "EXCEPT [ALL | DISTINCT]",
  "INTERSECT [ALL | DISTINCT]"
]), Kt = I([
  "JOIN",
  "{LEFT | RIGHT | FULL} [OUTER] JOIN",
  "{INNER | CROSS} JOIN",
  "NATURAL [INNER] JOIN",
  "NATURAL {LEFT | RIGHT | FULL} [OUTER] JOIN"
]), wt = I(["ON {UPDATE | DELETE} [SET NULL | SET DEFAULT]", "{ROWS | RANGE} BETWEEN"]), Jt = I([]), kt = {
  name: "sql",
  tokenizerOptions: {
    reservedSelect: Wt,
    reservedClauses: [
      ...Xt,
      ...de,
      ...YE
    ],
    reservedSetOperations: $t,
    reservedJoins: Kt,
    reservedKeywordPhrases: wt,
    reservedDataTypePhrases: Jt,
    reservedKeywords: Vt,
    reservedDataTypes: xt,
    reservedFunctionNames: vt,
    stringTypes: [{
      quote: "''-qq-bs",
      prefixes: ["N", "U&"]
    }, {
      quote: "''-raw",
      prefixes: ["X"],
      requirePrefix: !0
    }],
    identTypes: ['""-qq', "``"],
    paramTypes: { positional: !0 },
    operators: ["||"]
  },
  formatOptions: {
    onelineClauses: [...de, ...YE],
    tabularOnelineClauses: YE
  }
}, qt = [
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
  "CLASSIFIER",
  "FIRST",
  "LAST",
  "MATCH_NUMBER",
  "NEXT",
  "PERMUTE",
  "PREV"
], Qt = [
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
], Zt = [
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
], zt = I(["SELECT [ALL | DISTINCT]"]), jt = I([
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
  "INSERT INTO",
  "VALUES",
  "SET",
  "MATCH_RECOGNIZE",
  "MEASURES",
  "ONE ROW PER MATCH",
  "ALL ROWS PER MATCH",
  "AFTER MATCH",
  "PATTERN",
  "SUBSET",
  "DEFINE"
]), pe = I(["CREATE TABLE [IF NOT EXISTS]"]), gE = I([
  "CREATE [OR REPLACE] [MATERIALIZED] VIEW",
  "UPDATE",
  "DELETE FROM",
  "DROP TABLE [IF EXISTS]",
  "ALTER TABLE [IF EXISTS]",
  "ADD COLUMN [IF NOT EXISTS]",
  "DROP COLUMN [IF EXISTS]",
  "RENAME COLUMN [IF EXISTS]",
  "RENAME TO",
  "SET AUTHORIZATION [USER | ROLE]",
  "SET PROPERTIES",
  "EXECUTE",
  "TRUNCATE TABLE",
  "ALTER SCHEMA",
  "ALTER MATERIALIZED VIEW",
  "ALTER VIEW",
  "CREATE SCHEMA",
  "CREATE ROLE",
  "DROP SCHEMA",
  "DROP MATERIALIZED VIEW",
  "DROP VIEW",
  "DROP ROLE",
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
]), ES = I([
  "UNION [ALL | DISTINCT]",
  "EXCEPT [ALL | DISTINCT]",
  "INTERSECT [ALL | DISTINCT]"
]), eS = I([
  "JOIN",
  "{LEFT | RIGHT | FULL} [OUTER] JOIN",
  "{INNER | CROSS} JOIN",
  "NATURAL [INNER] JOIN",
  "NATURAL {LEFT | RIGHT | FULL} [OUTER] JOIN"
]), TS = I(["{ROWS | RANGE | GROUPS} BETWEEN", "IS [NOT] DISTINCT FROM"]), RS = I([]), AS = {
  name: "trino",
  tokenizerOptions: {
    reservedSelect: zt,
    reservedClauses: [
      ...jt,
      ...pe,
      ...gE
    ],
    reservedSetOperations: ES,
    reservedJoins: eS,
    reservedKeywordPhrases: TS,
    reservedDataTypePhrases: RS,
    reservedKeywords: Qt,
    reservedDataTypes: Zt,
    reservedFunctionNames: qt,
    extraParens: ["[]", "{}"],
    stringTypes: [{
      quote: "''-qq",
      prefixes: ["U&"]
    }, {
      quote: "''-raw",
      prefixes: ["X"],
      requirePrefix: !0
    }],
    identTypes: ['""-qq'],
    paramTypes: { positional: !0 },
    operators: [
      "%",
      "->",
      "=>",
      ":",
      "||",
      "|",
      "^",
      "$"
    ]
  },
  formatOptions: {
    onelineClauses: [...pe, ...gE],
    tabularOnelineClauses: gE
  }
}, tS = [
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
  "CAST",
  "CONVERT",
  "PARSE",
  "TRY_CAST",
  "TRY_CONVERT",
  "TRY_PARSE",
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
  "@@CURSOR_ROWS",
  "@@FETCH_STATUS",
  "CURSOR_STATUS",
  "DATALENGTH",
  "IDENT_CURRENT",
  "IDENT_INCR",
  "IDENT_SEED",
  "IDENTITY",
  "SQL_VARIANT_PROPERTY",
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
  "DENSE_RANK",
  "NTILE",
  "RANK",
  "ROW_NUMBER",
  "PUBLISHINGSERVERNAME",
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
  "COLUMNS_UPDATED",
  "EVENTDATA",
  "TRIGGER_NESTLEVEL",
  "UPDATE",
  "COALESCE",
  "NULLIF"
], SS = [
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
  "$ACTION"
], IS = [
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
], rS = I(["SELECT [ALL | DISTINCT]"]), OS = I([
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
  "INSERT [INTO]",
  "VALUES",
  "SET",
  "MERGE [INTO]",
  "WHEN [NOT] MATCHED [BY TARGET | BY SOURCE] [THEN]",
  "UPDATE SET"
]), ue = I(["CREATE TABLE"]), fE = I([
  "CREATE [OR ALTER] [MATERIALIZED] VIEW",
  "UPDATE",
  "WHERE CURRENT OF",
  "DELETE [FROM]",
  "DROP TABLE [IF EXISTS]",
  "ALTER TABLE",
  "ADD",
  "DROP COLUMN [IF EXISTS]",
  "ALTER COLUMN",
  "TRUNCATE TABLE",
  "CREATE [UNIQUE] [CLUSTERED] INDEX",
  "CREATE DATABASE",
  "ALTER DATABASE",
  "DROP DATABASE [IF EXISTS]",
  "CREATE [OR ALTER] [PARTITION] {FUNCTION | PROCEDURE | PROC}",
  "ALTER [PARTITION] {FUNCTION | PROCEDURE | PROC}",
  "DROP [PARTITION] {FUNCTION | PROCEDURE | PROC} [IF EXISTS]",
  "GO",
  "USE",
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
]), NS = I([
  "UNION [ALL]",
  "EXCEPT",
  "INTERSECT"
]), sS = I([
  "JOIN",
  "{LEFT | RIGHT | FULL} [OUTER] JOIN",
  "{INNER | CROSS} JOIN",
  "{CROSS | OUTER} APPLY"
]), aS = I(["ON {UPDATE | DELETE} [SET NULL | SET DEFAULT]", "{ROWS | RANGE} BETWEEN"]), nS = I([]), oS = {
  name: "transactsql",
  tokenizerOptions: {
    reservedSelect: rS,
    reservedClauses: [
      ...OS,
      ...ue,
      ...fE
    ],
    reservedSetOperations: NS,
    reservedJoins: sS,
    reservedKeywordPhrases: aS,
    reservedDataTypePhrases: nS,
    reservedKeywords: SS,
    reservedDataTypes: IS,
    reservedFunctionNames: tS,
    nestedBlockComments: !0,
    stringTypes: [{
      quote: "''-qq",
      prefixes: ["N"]
    }, "{}"],
    identTypes: ['""-qq', "[]"],
    identChars: {
      first: "#@",
      rest: "#@$"
    },
    paramTypes: {
      named: ["@"],
      quoted: ["@"]
    },
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
  },
  formatOptions: {
    alwaysDenseOperators: ["::"],
    onelineClauses: [...ue, ...fE],
    tabularOnelineClauses: fE
  }
}, iS = [
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
], CS = [
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
], LS = [
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
], _S = I(["SELECT [ALL | DISTINCT | DISTINCTROW]"]), lS = I([
  "WITH",
  "FROM",
  "WHERE",
  "GROUP BY",
  "HAVING",
  "PARTITION BY",
  "ORDER BY",
  "LIMIT",
  "OFFSET",
  "INSERT [IGNORE] [INTO]",
  "VALUES",
  "REPLACE [INTO]",
  "ON DUPLICATE KEY UPDATE",
  "SET",
  "CREATE [OR REPLACE] [TEMPORARY] PROCEDURE [IF NOT EXISTS]",
  "CREATE [OR REPLACE] [EXTERNAL] FUNCTION"
]), ce = I(["CREATE [ROWSTORE] [REFERENCE | TEMPORARY | GLOBAL TEMPORARY] TABLE [IF NOT EXISTS]"]), yE = I([
  "CREATE VIEW",
  "UPDATE",
  "DELETE [FROM]",
  "DROP [TEMPORARY] TABLE [IF EXISTS]",
  "ALTER [ONLINE] TABLE",
  "ADD [COLUMN]",
  "ADD [UNIQUE] {INDEX | KEY}",
  "DROP [COLUMN]",
  "MODIFY [COLUMN]",
  "CHANGE",
  "RENAME [TO | AS]",
  "TRUNCATE [TABLE]",
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
  "ITERATE",
  "LEAVE",
  "LOOP",
  "REPEAT",
  "RETURN",
  "WHILE"
]), DS = I([
  "UNION [ALL | DISTINCT]",
  "EXCEPT",
  "INTERSECT",
  "MINUS"
]), PS = I([
  "JOIN",
  "{LEFT | RIGHT | FULL} [OUTER] JOIN",
  "{INNER | CROSS} JOIN",
  "NATURAL {LEFT | RIGHT} [OUTER] JOIN",
  "STRAIGHT_JOIN"
]), MS = I([
  "ON DELETE",
  "ON UPDATE",
  "CHARACTER SET",
  "{ROWS | RANGE} BETWEEN",
  "IDENTIFIED BY"
]), US = I([]), dS = {
  name: "singlestoredb",
  tokenizerOptions: {
    reservedSelect: _S,
    reservedClauses: [
      ...lS,
      ...ce,
      ...yE
    ],
    reservedSetOperations: DS,
    reservedJoins: PS,
    reservedKeywordPhrases: MS,
    reservedDataTypePhrases: US,
    reservedKeywords: iS,
    reservedDataTypes: CS,
    reservedFunctionNames: LS,
    stringTypes: [
      '""-qq-bs',
      "''-qq-bs",
      {
        quote: "''-raw",
        prefixes: ["B", "X"],
        requirePrefix: !0
      }
    ],
    identTypes: ["``"],
    identChars: {
      first: "$",
      rest: "$",
      allowFirstCharNumber: !0
    },
    variableTypes: [{ regex: "@@?[A-Za-z0-9_$]+" }, {
      quote: "``",
      prefixes: ["@"],
      requirePrefix: !0
    }],
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
    ],
    postProcess: CE
  },
  formatOptions: {
    alwaysDenseOperators: [
      "::",
      "::$",
      "::%"
    ],
    onelineClauses: [...ce, ...yE],
    tabularOnelineClauses: yE
  }
}, pS = [
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
], uS = [
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
  "COMMENT"
], cS = [
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
], GS = I(["SELECT [ALL | DISTINCT]"]), mS = I([
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
  "INSERT [OVERWRITE] [ALL INTO | INTO | ALL | FIRST]",
  "{THEN | ELSE} INTO",
  "VALUES",
  "SET",
  "CLUSTER BY",
  "[WITH] {MASKING POLICY | TAG | ROW ACCESS POLICY}",
  "COPY GRANTS",
  "USING TEMPLATE",
  "MERGE INTO",
  "WHEN MATCHED [AND]",
  "THEN {UPDATE SET | DELETE}",
  "WHEN NOT MATCHED THEN INSERT"
]), Ge = I(["CREATE [OR REPLACE] [VOLATILE] TABLE [IF NOT EXISTS]", "CREATE [OR REPLACE] [LOCAL | GLOBAL] {TEMP|TEMPORARY} TABLE [IF NOT EXISTS]"]), bE = I([
  "CREATE [OR REPLACE] [SECURE] [RECURSIVE] VIEW [IF NOT EXISTS]",
  "UPDATE",
  "DELETE FROM",
  "DROP TABLE [IF EXISTS]",
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
  "TRUNCATE [TABLE] [IF EXISTS]",
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
]), HS = I([
  "UNION [ALL]",
  "MINUS",
  "EXCEPT",
  "INTERSECT"
]), BS = I([
  "[INNER] JOIN",
  "[NATURAL] {LEFT | RIGHT | FULL} [OUTER] JOIN",
  "{CROSS | NATURAL} JOIN"
]), FS = I(["{ROWS | RANGE} BETWEEN", "ON {UPDATE | DELETE} [SET NULL | SET DEFAULT]"]), hS = I([]), YS = {
  name: "snowflake",
  tokenizerOptions: {
    reservedSelect: GS,
    reservedClauses: [
      ...mS,
      ...Ge,
      ...bE
    ],
    reservedSetOperations: HS,
    reservedJoins: BS,
    reservedKeywordPhrases: FS,
    reservedDataTypePhrases: hS,
    reservedKeywords: uS,
    reservedDataTypes: cS,
    reservedFunctionNames: pS,
    stringTypes: ["$$", "''-qq-bs"],
    identTypes: ['""-qq'],
    variableTypes: [{ regex: "[$][1-9]\\d*" }, { regex: "[$][_a-zA-Z][_a-zA-Z0-9$]*" }],
    extraParens: ["[]"],
    identChars: { rest: "$" },
    lineCommentTypes: ["--", "//"],
    operators: [
      "%",
      "::",
      "||",
      "=>",
      ":=",
      "->"
    ],
    propertyAccessOperators: [":"]
  },
  formatOptions: {
    alwaysDenseOperators: ["::"],
    onelineClauses: [...Ge, ...bE],
    tabularOnelineClauses: bE
  }
}, gS = /* @__PURE__ */ CT({
  bigquery: () => jT,
  clickhouse: () => nR,
  db2: () => dR,
  db2i: () => YR,
  duckdb: () => $R,
  hive: () => EA,
  mariadb: () => NA,
  mysql: () => DA,
  n1ql: () => VA,
  plsql: () => QA,
  postgresql: () => It,
  redshift: () => Lt,
  singlestoredb: () => dS,
  snowflake: () => YS,
  spark: () => ct,
  sql: () => kt,
  sqlite: () => bt,
  tidb: () => HA,
  transactsql: () => oS,
  trino: () => AS
}), AE = (E) => E[E.length - 1], Ze = (E) => E.sort((e, T) => T.length - e.length || e.localeCompare(T)), aE = (E) => E.replace(/\s+/gu, " "), vE = (E) => /\n/.test(E), x = (E) => E.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), me = /\s+/uy, Z = (E) => new RegExp(`(?:${E})`, "uy"), fS = (E) => E.split("").map((e) => / /gu.test(e) ? "\\s+" : `[${e.toUpperCase()}${e.toLowerCase()}]`).join(""), yS = (E) => E + "(?:-" + E + ")*", bS = ({ prefixes: E, requirePrefix: e }) => `(?:${E.map(fS).join("|")}${e ? "" : "|"})`, vS = (E) => new RegExp(`(?:${E.map(x).join("|")}).*?(?=\r
|\r|
|$)`, "uy"), He = (E, e = []) => {
  const T = E === "open" ? 0 : 1;
  return Z(["()", ...e].map((R) => R[T]).map(x).join("|"));
}, Be = (E) => Z(`${Ze(E).map(x).join("|")}`), VS = ({ rest: E, dashes: e }) => E || e ? `(?![${E || ""}${e ? "-" : ""}])` : "", $ = (E, e = {}) => {
  if (E.length === 0) return /^\b$/u;
  const T = VS(e), R = Ze(E).map(x).join("|").replace(/ /gu, "\\s+");
  return new RegExp(`(?:${R})${T}\\b`, "iuy");
}, VE = (E, e) => {
  if (E.length)
    return Z(`(?:${E.map(x).join("|")})(?:${e})`);
}, xS = () => {
  const E = {
    "<": ">",
    "[": "]",
    "(": ")",
    "{": "}"
  }, e = "{left}(?:(?!{right}').)*?{right}", T = Object.entries(E).map(([A, r]) => e.replace(/{left}/g, x(A)).replace(/{right}/g, x(r))), R = x(Object.keys(E).join(""));
  return `[Qq]'(?:${String.raw`(?<tag>[^\s${R}])(?:(?!\k<tag>').)*?\k<tag>`}|${T.join("|")})'`;
}, Fe = {
  "``": "(?:`[^`]*`)+",
  "[]": String.raw`(?:\[[^\]]*\])(?:\][^\]]*\])*`,
  '""-qq': String.raw`(?:"[^"]*")+`,
  '""-bs': String.raw`(?:"[^"\\]*(?:\\.[^"\\]*)*")`,
  '""-qq-bs': String.raw`(?:"[^"\\]*(?:\\.[^"\\]*)*")+`,
  '""-raw': String.raw`(?:"[^"]*")`,
  "''-qq": String.raw`(?:'[^']*')+`,
  "''-bs": String.raw`(?:'[^'\\]*(?:\\.[^'\\]*)*')`,
  "''-qq-bs": String.raw`(?:'[^'\\]*(?:\\.[^'\\]*)*')+`,
  "''-raw": String.raw`(?:'[^']*')`,
  $$: String.raw`(?<tag>\$\w*\$)[\s\S]*?\k<tag>`,
  "'''..'''": String.raw`'''[^\\]*?(?:\\.[^\\]*?)*?'''`,
  '""".."""': String.raw`"""[^\\]*?(?:\\.[^\\]*?)*?"""`,
  "{}": String.raw`(?:\{[^\}]*\})`,
  "q''": xS()
}, ze = (E) => typeof E == "string" ? Fe[E] : "regex" in E ? E.regex : bS(E) + Fe[E.quote], WS = (E) => Z(E.map((e) => "regex" in e ? e.regex : ze(e)).join("|")), je = (E) => E.map(ze).join("|"), he = (E) => Z(je(E)), XS = (E = {}) => Z(ET(E)), ET = ({ first: E, rest: e, dashes: T, allowFirstCharNumber: R } = {}) => {
  const A = "\\p{Alphabetic}\\p{Mark}_", r = "\\p{Decimal_Number}", s = x(E ?? ""), S = x(e ?? ""), L = R ? `[${A}${r}${s}][${A}${r}${S}]*` : `[${A}${s}][${A}${r}${S}]*`;
  return T ? yS(L) : L;
};
function eT(E, e) {
  const T = E.slice(0, e).split(/\n/);
  return {
    line: T.length,
    col: T[T.length - 1].length + 1
  };
}
var $S = class {
  constructor(E, e) {
    this.rules = E, this.dialectName = e, this.input = "", this.index = 0;
  }
  tokenize(E) {
    this.input = E, this.index = 0;
    const e = [];
    let T;
    for (; this.index < this.input.length; ) {
      const R = this.getWhitespace();
      if (this.index < this.input.length) {
        if (T = this.getNextToken(), !T) throw this.createParseError();
        e.push(Object.assign(Object.assign({}, T), { precedingWhitespace: R }));
      }
    }
    return e;
  }
  createParseError() {
    const E = this.input.slice(this.index, this.index + 10), { line: e, col: T } = eT(this.input, this.index);
    return /* @__PURE__ */ new Error(`Parse error: Unexpected "${E}" at line ${e} column ${T}.
${this.dialectInfo()}`);
  }
  dialectInfo() {
    return this.dialectName === "sql" ? `This likely happens because you're using the default "sql" dialect.
If possible, please select a more specific dialect (like sqlite, postgresql, etc).` : `SQL dialect used: "${this.dialectName}".`;
  }
  getWhitespace() {
    me.lastIndex = this.index;
    const E = me.exec(this.input);
    if (E)
      return this.index += E[0].length, E[0];
  }
  getNextToken() {
    for (const E of this.rules) {
      const e = this.match(E);
      if (e) return e;
    }
  }
  match(E) {
    E.regex.lastIndex = this.index;
    const e = E.regex.exec(this.input);
    if (e) {
      const T = e[0], R = {
        type: E.type,
        raw: T,
        text: E.text ? E.text(T) : T,
        start: this.index
      };
      return E.key && (R.key = E.key(T)), this.index += T.length, R;
    }
  }
}, Ye = /\/\*/uy, KS = /[\s\S]/uy, wS = /\*\//uy, JS = class {
  constructor() {
    this.lastIndex = 0;
  }
  exec(E) {
    let e = "", T, R = 0;
    if (T = this.matchSection(Ye, E))
      e += T, R++;
    else return null;
    for (; R > 0; ) if (T = this.matchSection(Ye, E))
      e += T, R++;
    else if (T = this.matchSection(wS, E))
      e += T, R--;
    else if (T = this.matchSection(KS, E)) e += T;
    else return null;
    return [e];
  }
  matchSection(E, e) {
    E.lastIndex = this.lastIndex;
    const T = E.exec(e);
    return T && (this.lastIndex += T[0].length), T ? T[0] : null;
  }
}, kS = class {
  constructor(E, e) {
    this.cfg = E, this.dialectName = e, this.rulesBeforeParams = this.buildRulesBeforeParams(E), this.rulesAfterParams = this.buildRulesAfterParams(E);
  }
  tokenize(E, e) {
    const T = new $S([
      ...this.rulesBeforeParams,
      ...this.buildParamRules(this.cfg, e),
      ...this.rulesAfterParams
    ], this.dialectName).tokenize(E);
    return this.cfg.postProcess ? this.cfg.postProcess(T) : T;
  }
  buildRulesBeforeParams(E) {
    var e, T, R;
    return this.validRules([
      {
        type: i.DISABLE_COMMENT,
        regex: /(\/\* *sql-formatter-disable *\*\/[\s\S]*?(?:\/\* *sql-formatter-enable *\*\/|$))/uy
      },
      {
        type: i.BLOCK_COMMENT,
        regex: E.nestedBlockComments ? new JS() : /(\/\*[^]*?\*\/)/uy
      },
      {
        type: i.LINE_COMMENT,
        regex: vS((e = E.lineCommentTypes) !== null && e !== void 0 ? e : ["--"])
      },
      {
        type: i.QUOTED_IDENTIFIER,
        regex: he(E.identTypes)
      },
      {
        type: i.NUMBER,
        regex: E.underscoresInNumbers ? /(?:0x[0-9a-fA-F_]+|0b[01_]+|(?:-\s*)?(?:[0-9_]*\.[0-9_]+|[0-9_]+(?:\.[0-9_]*)?)(?:[eE][-+]?[0-9_]+(?:\.[0-9_]+)?)?)(?![\w\p{Alphabetic}])/uy : /(?:0x[0-9a-fA-F]+|0b[01]+|(?:-\s*)?(?:[0-9]*\.[0-9]+|[0-9]+(?:\.[0-9]*)?)(?:[eE][-+]?[0-9]+(?:\.[0-9]+)?)?)(?![\w\p{Alphabetic}])/uy
      },
      {
        type: i.RESERVED_KEYWORD_PHRASE,
        regex: $((T = E.reservedKeywordPhrases) !== null && T !== void 0 ? T : [], E.identChars),
        text: h
      },
      {
        type: i.RESERVED_DATA_TYPE_PHRASE,
        regex: $((R = E.reservedDataTypePhrases) !== null && R !== void 0 ? R : [], E.identChars),
        text: h
      },
      {
        type: i.CASE,
        regex: /CASE\b/iuy,
        text: h
      },
      {
        type: i.END,
        regex: /END\b/iuy,
        text: h
      },
      {
        type: i.BETWEEN,
        regex: /BETWEEN\b/iuy,
        text: h
      },
      {
        type: i.LIMIT,
        regex: E.reservedClauses.includes("LIMIT") ? /LIMIT\b/iuy : void 0,
        text: h
      },
      {
        type: i.RESERVED_CLAUSE,
        regex: $(E.reservedClauses, E.identChars),
        text: h
      },
      {
        type: i.RESERVED_SELECT,
        regex: $(E.reservedSelect, E.identChars),
        text: h
      },
      {
        type: i.RESERVED_SET_OPERATION,
        regex: $(E.reservedSetOperations, E.identChars),
        text: h
      },
      {
        type: i.WHEN,
        regex: /WHEN\b/iuy,
        text: h
      },
      {
        type: i.ELSE,
        regex: /ELSE\b/iuy,
        text: h
      },
      {
        type: i.THEN,
        regex: /THEN\b/iuy,
        text: h
      },
      {
        type: i.RESERVED_JOIN,
        regex: $(E.reservedJoins, E.identChars),
        text: h
      },
      {
        type: i.AND,
        regex: /AND\b/iuy,
        text: h
      },
      {
        type: i.OR,
        regex: /OR\b/iuy,
        text: h
      },
      {
        type: i.XOR,
        regex: E.supportsXor ? /XOR\b/iuy : void 0,
        text: h
      },
      ...E.operatorKeyword ? [{
        type: i.OPERATOR,
        regex: /OPERATOR *\([^)]+\)/iuy
      }] : [],
      {
        type: i.RESERVED_FUNCTION_NAME,
        regex: $(E.reservedFunctionNames, E.identChars),
        text: h
      },
      {
        type: i.RESERVED_DATA_TYPE,
        regex: $(E.reservedDataTypes, E.identChars),
        text: h
      },
      {
        type: i.RESERVED_KEYWORD,
        regex: $(E.reservedKeywords, E.identChars),
        text: h
      }
    ]);
  }
  buildRulesAfterParams(E) {
    var e, T;
    return this.validRules([
      {
        type: i.VARIABLE,
        regex: E.variableTypes ? WS(E.variableTypes) : void 0
      },
      {
        type: i.STRING,
        regex: he(E.stringTypes)
      },
      {
        type: i.IDENTIFIER,
        regex: XS(E.identChars)
      },
      {
        type: i.DELIMITER,
        regex: /[;]/uy
      },
      {
        type: i.COMMA,
        regex: /[,]/y
      },
      {
        type: i.OPEN_PAREN,
        regex: He("open", E.extraParens)
      },
      {
        type: i.CLOSE_PAREN,
        regex: He("close", E.extraParens)
      },
      {
        type: i.OPERATOR,
        regex: Be([
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
          ...(e = E.operators) !== null && e !== void 0 ? e : []
        ])
      },
      {
        type: i.ASTERISK,
        regex: /[*]/uy
      },
      {
        type: i.PROPERTY_ACCESS_OPERATOR,
        regex: Be([".", ...(T = E.propertyAccessOperators) !== null && T !== void 0 ? T : []])
      }
    ]);
  }
  buildParamRules(E, e) {
    var T, R, A, r, s;
    const S = {
      named: e?.named || ((T = E.paramTypes) === null || T === void 0 ? void 0 : T.named) || [],
      quoted: e?.quoted || ((R = E.paramTypes) === null || R === void 0 ? void 0 : R.quoted) || [],
      numbered: e?.numbered || ((A = E.paramTypes) === null || A === void 0 ? void 0 : A.numbered) || [],
      positional: typeof e?.positional == "boolean" ? e.positional : (r = E.paramTypes) === null || r === void 0 ? void 0 : r.positional,
      custom: e?.custom || ((s = E.paramTypes) === null || s === void 0 ? void 0 : s.custom) || []
    };
    return this.validRules([
      {
        type: i.NAMED_PARAMETER,
        regex: VE(S.named, ET(E.paramChars || E.identChars)),
        key: (L) => L.slice(1)
      },
      {
        type: i.QUOTED_PARAMETER,
        regex: VE(S.quoted, je(E.identTypes)),
        key: (L) => (({ tokenKey: N, quoteChar: t }) => N.replace(new RegExp(x("\\" + t), "gu"), t))({
          tokenKey: L.slice(2, -1),
          quoteChar: L.slice(-1)
        })
      },
      {
        type: i.NUMBERED_PARAMETER,
        regex: VE(S.numbered, "[0-9]+"),
        key: (L) => L.slice(1)
      },
      {
        type: i.POSITIONAL_PARAMETER,
        regex: S.positional ? /[?]/y : void 0
      },
      ...S.custom.map((L) => {
        var N;
        return {
          type: i.CUSTOM_PARAMETER,
          regex: Z(L.regex),
          key: (N = L.key) !== null && N !== void 0 ? N : ((t) => t)
        };
      })
    ]);
  }
  validRules(E) {
    return E.filter((e) => !!e.regex);
  }
}, h = (E) => aE(E.toUpperCase()), ge = /* @__PURE__ */ new Map(), qS = (E) => {
  let e = ge.get(E);
  return e || (e = QS(E), ge.set(E, e)), e;
}, QS = (E) => ({
  tokenizer: new kS(E.tokenizerOptions, E.name),
  formatOptions: ZS(E.formatOptions)
}), ZS = (E) => {
  var e;
  return {
    alwaysDenseOperators: E.alwaysDenseOperators || [],
    onelineClauses: Object.fromEntries(E.onelineClauses.map((T) => [T, !0])),
    tabularOnelineClauses: Object.fromEntries(((e = E.tabularOnelineClauses) !== null && e !== void 0 ? e : E.onelineClauses).map((T) => [T, !0]))
  };
};
function zS(E) {
  return E.indentStyle === "tabularLeft" || E.indentStyle === "tabularRight" ? " ".repeat(10) : E.useTabs ? "	" : " ".repeat(E.tabWidth);
}
function EE(E) {
  return E.indentStyle === "tabularLeft" || E.indentStyle === "tabularRight";
}
var jS = class {
  constructor(E) {
    this.params = E, this.index = 0;
  }
  get({ key: E, text: e }) {
    return this.params ? E ? this.params[E] : this.params[this.index++] : e;
  }
  getPositionalParameterIndex() {
    return this.index;
  }
  setPositionalParameterIndex(E) {
    this.index = E;
  }
}, EI = /* @__PURE__ */ Ke(((E, e) => {
  (function(T, R) {
    typeof e == "object" && e.exports ? e.exports = R() : T.nearley = R();
  })(E, function() {
    function T(t, C, _) {
      return this.id = ++T.highestId, this.name = t, this.symbols = C, this.postprocess = _, this;
    }
    T.highestId = 0, T.prototype.toString = function(t) {
      var C = typeof t > "u" ? this.symbols.map(N).join(" ") : this.symbols.slice(0, t).map(N).join(" ") + " ● " + this.symbols.slice(t).map(N).join(" ");
      return this.name + " → " + C;
    };
    function R(t, C, _, M) {
      this.rule = t, this.dot = C, this.reference = _, this.data = [], this.wantedBy = M, this.isComplete = this.dot === t.symbols.length;
    }
    R.prototype.toString = function() {
      return "{" + this.rule.toString(this.dot) + "}, from: " + (this.reference || 0);
    }, R.prototype.nextState = function(t) {
      var C = new R(this.rule, this.dot + 1, this.reference, this.wantedBy);
      return C.left = this, C.right = t, C.isComplete && (C.data = C.build(), C.right = void 0), C;
    }, R.prototype.build = function() {
      var t = [], C = this;
      do
        t.push(C.right.data), C = C.left;
      while (C.left);
      return t.reverse(), t;
    }, R.prototype.finish = function() {
      this.rule.postprocess && (this.data = this.rule.postprocess(this.data, this.reference, S.fail));
    };
    function A(t, C) {
      this.grammar = t, this.index = C, this.states = [], this.wants = {}, this.scannable = [], this.completed = {};
    }
    A.prototype.process = function(t) {
      for (var C = this.states, _ = this.wants, M = this.completed, m = 0; m < C.length; m++) {
        var U = C[m];
        if (U.isComplete) {
          if (U.finish(), U.data !== S.fail) {
            for (var u = U.wantedBy, H = u.length; H--; ) {
              var o = u[H];
              this.complete(o, U);
            }
            if (U.reference === this.index) {
              var O = U.rule.name;
              (this.completed[O] = this.completed[O] || []).push(U);
            }
          }
        } else {
          var O = U.rule.symbols[U.dot];
          if (typeof O != "string") {
            this.scannable.push(U);
            continue;
          }
          if (_[O]) {
            if (_[O].push(U), M.hasOwnProperty(O))
              for (var l = M[O], H = 0; H < l.length; H++) {
                var D = l[H];
                this.complete(U, D);
              }
          } else
            _[O] = [U], this.predict(O);
        }
      }
    }, A.prototype.predict = function(t) {
      for (var C = this.grammar.byName[t] || [], _ = 0; _ < C.length; _++) {
        var M = C[_], m = this.wants[t], U = new R(M, 0, this.index, m);
        this.states.push(U);
      }
    }, A.prototype.complete = function(t, C) {
      var _ = t.nextState(C);
      this.states.push(_);
    };
    function r(t, C) {
      this.rules = t, this.start = C || this.rules[0].name;
      var _ = this.byName = {};
      this.rules.forEach(function(M) {
        _.hasOwnProperty(M.name) || (_[M.name] = []), _[M.name].push(M);
      });
    }
    r.fromCompiled = function(M, C) {
      var _ = M.Lexer;
      M.ParserStart && (C = M.ParserStart, M = M.ParserRules);
      var M = M.map(function(U) {
        return new T(U.name, U.symbols, U.postprocess);
      }), m = new r(M, C);
      return m.lexer = _, m;
    };
    function s() {
      this.reset("");
    }
    s.prototype.reset = function(t, C) {
      this.buffer = t, this.index = 0, this.line = C ? C.line : 1, this.lastLineBreak = C ? -C.col : 0;
    }, s.prototype.next = function() {
      if (this.index < this.buffer.length) {
        var t = this.buffer[this.index++];
        return t === `
` && (this.line += 1, this.lastLineBreak = this.index), { value: t };
      }
    }, s.prototype.save = function() {
      return {
        line: this.line,
        col: this.index - this.lastLineBreak
      };
    }, s.prototype.formatError = function(t, C) {
      var _ = this.buffer;
      if (typeof _ == "string") {
        var M = _.split(`
`).slice(Math.max(0, this.line - 5), this.line), m = _.indexOf(`
`, this.index);
        m === -1 && (m = _.length);
        var U = this.index - this.lastLineBreak, u = String(this.line).length;
        return C += " at line " + this.line + " col " + U + `:

`, C += M.map(function(o, O) {
          return H(this.line - M.length + O + 1, u) + " " + o;
        }, this).join(`
`), C += `
` + H("", u + U) + `^
`, C;
      } else return C + " at index " + (this.index - 1);
      function H(o, O) {
        var l = String(o);
        return Array(O - l.length + 1).join(" ") + l;
      }
    };
    function S(t, C, _) {
      if (t instanceof r)
        var M = t, _ = C;
      else var M = r.fromCompiled(t, C);
      this.grammar = M, this.options = {
        keepHistory: !1,
        lexer: M.lexer || new s()
      };
      for (var m in _ || {}) this.options[m] = _[m];
      this.lexer = this.options.lexer, this.lexerState = void 0;
      var U = new A(M, 0);
      this.table = [U], U.wants[M.start] = [], U.predict(M.start), U.process(), this.current = 0;
    }
    S.fail = {}, S.prototype.feed = function(t) {
      var C = this.lexer;
      C.reset(t, this.lexerState);
      for (var _; ; ) {
        try {
          if (_ = C.next(), !_) break;
        } catch (p) {
          var u = new A(this.grammar, this.current + 1);
          this.table.push(u);
          var M = new Error(this.reportLexerError(p));
          throw M.offset = this.current, M.token = p.token, M;
        }
        var m = this.table[this.current];
        this.options.keepHistory || delete this.table[this.current - 1];
        var U = this.current + 1, u = new A(this.grammar, U);
        this.table.push(u);
        for (var H = _.text !== void 0 ? _.text : _.value, o = C.constructor === s ? _.value : _, O = m.scannable, l = O.length; l--; ) {
          var D = O[l], P = D.rule.symbols[D.dot];
          if (P.test ? P.test(o) : P.type ? P.type === _.type : P.literal === H) {
            var c = D.nextState({
              data: o,
              token: _,
              isToken: !0,
              reference: U - 1
            });
            u.states.push(c);
          }
        }
        if (u.process(), u.states.length === 0) {
          var M = new Error(this.reportError(_));
          throw M.offset = this.current, M.token = _, M;
        }
        this.options.keepHistory && (m.lexerState = C.save()), this.current++;
      }
      return m && (this.lexerState = C.save()), this.results = this.finish(), this;
    }, S.prototype.reportLexerError = function(t) {
      var C, _, M = t.token;
      return M ? (C = "input " + JSON.stringify(M.text[0]) + " (lexer error)", _ = this.lexer.formatError(M, "Syntax error")) : (C = "input (lexer error)", _ = t.message), this.reportErrorCommon(_, C);
    }, S.prototype.reportError = function(t) {
      var C = (t.type ? t.type + " token: " : "") + JSON.stringify(t.value !== void 0 ? t.value : t), _ = this.lexer.formatError(t, "Syntax error");
      return this.reportErrorCommon(_, C);
    }, S.prototype.reportErrorCommon = function(t, C) {
      var _ = [];
      _.push(t);
      var M = this.table.length - 2, m = this.table[M], U = m.states.filter(function(u) {
        var H = u.rule.symbols[u.dot];
        return H && typeof H != "string";
      });
      return U.length === 0 ? (_.push("Unexpected " + C + `. I did not expect any more input. Here is the state of my parse table:
`), this.displayStateStack(m.states, _)) : (_.push("Unexpected " + C + `. Instead, I was expecting to see one of the following:
`), U.map(function(u) {
        return this.buildFirstStateStack(u, []) || [u];
      }, this).forEach(function(u) {
        var H = u[0], o = H.rule.symbols[H.dot], O = this.getSymbolDisplay(o);
        _.push("A " + O + " based on:"), this.displayStateStack(u, _);
      }, this)), _.push(""), _.join(`
`);
    }, S.prototype.displayStateStack = function(t, C) {
      for (var _, M = 0, m = 0; m < t.length; m++) {
        var U = t[m], u = U.rule.toString(U.dot);
        u === _ ? M++ : (M > 0 && C.push("    ^ " + M + " more lines identical to this"), M = 0, C.push("    " + u)), _ = u;
      }
    }, S.prototype.getSymbolDisplay = function(t) {
      return L(t);
    }, S.prototype.buildFirstStateStack = function(t, C) {
      if (C.indexOf(t) !== -1) return null;
      if (t.wantedBy.length === 0) return [t];
      var _ = t.wantedBy[0], M = [t].concat(C), m = this.buildFirstStateStack(_, M);
      return m === null ? null : [t].concat(m);
    }, S.prototype.save = function() {
      var t = this.table[this.current];
      return t.lexerState = this.lexerState, t;
    }, S.prototype.restore = function(t) {
      var C = t.index;
      this.current = C, this.table[C] = t, this.table.splice(C + 1), this.lexerState = t.lexerState, this.results = this.finish();
    }, S.prototype.rewind = function(t) {
      if (!this.options.keepHistory) throw new Error("set option `keepHistory` to enable rewinding");
      this.restore(this.table[t]);
    }, S.prototype.finish = function() {
      var t = [], C = this.grammar.start;
      return this.table[this.table.length - 1].states.forEach(function(_) {
        _.rule.name === C && _.dot === _.rule.symbols.length && _.reference === 0 && _.data !== S.fail && t.push(_);
      }), t.map(function(_) {
        return _.data;
      });
    };
    function L(t) {
      var C = typeof t;
      if (C === "string") return t;
      if (C === "object") {
        if (t.literal) return JSON.stringify(t.literal);
        if (t instanceof RegExp) return "character matching " + t;
        if (t.type) return t.type + " token";
        if (t.test) return "token matching " + String(t.test);
        throw new Error("Unknown symbol type: " + t);
      }
    }
    function N(t) {
      var C = typeof t;
      if (C === "string") return t;
      if (C === "object") {
        if (t.literal) return JSON.stringify(t.literal);
        if (t instanceof RegExp) return t.toString();
        if (t.type) return "%" + t.type;
        if (t.test) return "<" + String(t.test) + ">";
        throw new Error("Unknown symbol type: " + t);
      }
    }
    return {
      Parser: S,
      Grammar: r,
      Rule: T
    };
  });
}));
function eI(E) {
  return E.map(TI).map(RI).map(AI).map(tI).map(SI);
}
var TI = (E, e, T) => {
  if (Qe(E.type)) {
    const R = II(T, e);
    if (R && R.type === i.PROPERTY_ACCESS_OPERATOR) return Object.assign(Object.assign({}, E), {
      type: i.IDENTIFIER,
      text: E.raw
    });
    const A = TE(T, e);
    if (A && A.type === i.PROPERTY_ACCESS_OPERATOR) return Object.assign(Object.assign({}, E), {
      type: i.IDENTIFIER,
      text: E.raw
    });
  }
  return E;
}, RI = (E, e, T) => {
  if (E.type === i.RESERVED_FUNCTION_NAME) {
    const R = TE(T, e);
    if (!R || !TT(R)) return Object.assign(Object.assign({}, E), {
      type: i.IDENTIFIER,
      text: E.raw
    });
  }
  return E;
}, AI = (E, e, T) => {
  if (E.type === i.RESERVED_DATA_TYPE) {
    const R = TE(T, e);
    if (R && TT(R)) return Object.assign(Object.assign({}, E), { type: i.RESERVED_PARAMETERIZED_DATA_TYPE });
  }
  return E;
}, tI = (E, e, T) => {
  if (E.type === i.IDENTIFIER) {
    const R = TE(T, e);
    if (R && RT(R)) return Object.assign(Object.assign({}, E), { type: i.ARRAY_IDENTIFIER });
  }
  return E;
}, SI = (E, e, T) => {
  if (E.type === i.RESERVED_DATA_TYPE) {
    const R = TE(T, e);
    if (R && RT(R)) return Object.assign(Object.assign({}, E), { type: i.ARRAY_KEYWORD });
  }
  return E;
}, II = (E, e) => TE(E, e, -1), TE = (E, e, T = 1) => {
  let R = 1;
  for (; E[e + R * T] && rI(E[e + R * T]); ) R++;
  return E[e + R * T];
}, TT = (E) => E.type === i.OPEN_PAREN && E.text === "(", RT = (E) => E.type === i.OPEN_PAREN && E.text === "[", rI = (E) => E.type === i.BLOCK_COMMENT || E.type === i.LINE_COMMENT, AT = class {
  constructor(E) {
    this.tokenize = E, this.index = 0, this.tokens = [], this.input = "";
  }
  reset(E, e) {
    this.input = E, this.index = 0, this.tokens = this.tokenize(E);
  }
  next() {
    return this.tokens[this.index++];
  }
  save() {
  }
  formatError(E) {
    const { line: e, col: T } = eT(this.input, E.start);
    return `Parse error at token: ${E.text} at line ${e} column ${T}`;
  }
  has(E) {
    return E in i;
  }
}, d;
(function(E) {
  E.statement = "statement", E.clause = "clause", E.set_operation = "set_operation", E.function_call = "function_call", E.parameterized_data_type = "parameterized_data_type", E.array_subscript = "array_subscript", E.property_access = "property_access", E.parenthesis = "parenthesis", E.between_predicate = "between_predicate", E.case_expression = "case_expression", E.case_when = "case_when", E.case_else = "case_else", E.limit_clause = "limit_clause", E.all_columns_asterisk = "all_columns_asterisk", E.literal = "literal", E.identifier = "identifier", E.keyword = "keyword", E.data_type = "data_type", E.parameter = "parameter", E.operator = "operator", E.comma = "comma", E.line_comment = "line_comment", E.block_comment = "block_comment", E.disable_comment = "disable_comment";
})(d = d || (d = {}));
function xE(E) {
  return E[0];
}
var G = new AT((E) => []), q = ([[E]]) => E, Y = (E) => ({
  type: d.keyword,
  tokenType: E.type,
  text: E.text,
  raw: E.raw
}), fe = (E) => ({
  type: d.data_type,
  text: E.text,
  raw: E.raw
}), g = (E, { leading: e, trailing: T }) => (e?.length && (E = Object.assign(Object.assign({}, E), { leadingComments: e })), T?.length && (E = Object.assign(Object.assign({}, E), { trailingComments: T })), E), OI = (E, { leading: e, trailing: T }) => {
  if (e?.length) {
    const [R, ...A] = E;
    E = [g(R, { leading: e }), ...A];
  }
  if (T?.length) {
    const R = E.slice(0, -1), A = E[E.length - 1];
    E = [...R, g(A, { trailing: T })];
  }
  return E;
}, NI = {
  Lexer: G,
  ParserRules: [
    {
      name: "main$ebnf$1",
      symbols: []
    },
    {
      name: "main$ebnf$1",
      symbols: ["main$ebnf$1", "statement"],
      postprocess: (E) => E[0].concat([E[1]])
    },
    {
      name: "main",
      symbols: ["main$ebnf$1"],
      postprocess: ([E]) => {
        const e = E[E.length - 1];
        return e && !e.hasSemicolon ? e.children.length > 0 ? E : E.slice(0, -1) : E;
      }
    },
    {
      name: "statement$subexpression$1",
      symbols: [G.has("DELIMITER") ? { type: "DELIMITER" } : DELIMITER]
    },
    {
      name: "statement$subexpression$1",
      symbols: [G.has("EOF") ? { type: "EOF" } : EOF]
    },
    {
      name: "statement",
      symbols: ["expressions_or_clauses", "statement$subexpression$1"],
      postprocess: ([E, [e]]) => ({
        type: d.statement,
        children: E,
        hasSemicolon: e.type === i.DELIMITER
      })
    },
    {
      name: "expressions_or_clauses$ebnf$1",
      symbols: []
    },
    {
      name: "expressions_or_clauses$ebnf$1",
      symbols: ["expressions_or_clauses$ebnf$1", "free_form_sql"],
      postprocess: (E) => E[0].concat([E[1]])
    },
    {
      name: "expressions_or_clauses$ebnf$2",
      symbols: []
    },
    {
      name: "expressions_or_clauses$ebnf$2",
      symbols: ["expressions_or_clauses$ebnf$2", "clause"],
      postprocess: (E) => E[0].concat([E[1]])
    },
    {
      name: "expressions_or_clauses",
      symbols: ["expressions_or_clauses$ebnf$1", "expressions_or_clauses$ebnf$2"],
      postprocess: ([E, e]) => [...E, ...e]
    },
    {
      name: "clause$subexpression$1",
      symbols: ["limit_clause"]
    },
    {
      name: "clause$subexpression$1",
      symbols: ["select_clause"]
    },
    {
      name: "clause$subexpression$1",
      symbols: ["other_clause"]
    },
    {
      name: "clause$subexpression$1",
      symbols: ["set_operation"]
    },
    {
      name: "clause",
      symbols: ["clause$subexpression$1"],
      postprocess: q
    },
    {
      name: "limit_clause$ebnf$1$subexpression$1$ebnf$1",
      symbols: ["free_form_sql"]
    },
    {
      name: "limit_clause$ebnf$1$subexpression$1$ebnf$1",
      symbols: ["limit_clause$ebnf$1$subexpression$1$ebnf$1", "free_form_sql"],
      postprocess: (E) => E[0].concat([E[1]])
    },
    {
      name: "limit_clause$ebnf$1$subexpression$1",
      symbols: [G.has("COMMA") ? { type: "COMMA" } : COMMA, "limit_clause$ebnf$1$subexpression$1$ebnf$1"]
    },
    {
      name: "limit_clause$ebnf$1",
      symbols: ["limit_clause$ebnf$1$subexpression$1"],
      postprocess: xE
    },
    {
      name: "limit_clause$ebnf$1",
      symbols: [],
      postprocess: () => null
    },
    {
      name: "limit_clause",
      symbols: [
        G.has("LIMIT") ? { type: "LIMIT" } : LIMIT,
        "_",
        "expression_chain_",
        "limit_clause$ebnf$1"
      ],
      postprocess: ([E, e, T, R]) => {
        if (R) {
          const [A, r] = R;
          return {
            type: d.limit_clause,
            limitKw: g(Y(E), { trailing: e }),
            offset: T,
            count: r
          };
        } else return {
          type: d.limit_clause,
          limitKw: g(Y(E), { trailing: e }),
          count: T
        };
      }
    },
    {
      name: "select_clause$subexpression$1$ebnf$1",
      symbols: []
    },
    {
      name: "select_clause$subexpression$1$ebnf$1",
      symbols: ["select_clause$subexpression$1$ebnf$1", "free_form_sql"],
      postprocess: (E) => E[0].concat([E[1]])
    },
    {
      name: "select_clause$subexpression$1",
      symbols: ["all_columns_asterisk", "select_clause$subexpression$1$ebnf$1"]
    },
    {
      name: "select_clause$subexpression$1$ebnf$2",
      symbols: []
    },
    {
      name: "select_clause$subexpression$1$ebnf$2",
      symbols: ["select_clause$subexpression$1$ebnf$2", "free_form_sql"],
      postprocess: (E) => E[0].concat([E[1]])
    },
    {
      name: "select_clause$subexpression$1",
      symbols: ["asteriskless_free_form_sql", "select_clause$subexpression$1$ebnf$2"]
    },
    {
      name: "select_clause",
      symbols: [G.has("RESERVED_SELECT") ? { type: "RESERVED_SELECT" } : RESERVED_SELECT, "select_clause$subexpression$1"],
      postprocess: ([E, [e, T]]) => ({
        type: d.clause,
        nameKw: Y(E),
        children: [e, ...T]
      })
    },
    {
      name: "select_clause",
      symbols: [G.has("RESERVED_SELECT") ? { type: "RESERVED_SELECT" } : RESERVED_SELECT],
      postprocess: ([E]) => ({
        type: d.clause,
        nameKw: Y(E),
        children: []
      })
    },
    {
      name: "all_columns_asterisk",
      symbols: [G.has("ASTERISK") ? { type: "ASTERISK" } : ASTERISK],
      postprocess: () => ({ type: d.all_columns_asterisk })
    },
    {
      name: "other_clause$ebnf$1",
      symbols: []
    },
    {
      name: "other_clause$ebnf$1",
      symbols: ["other_clause$ebnf$1", "free_form_sql"],
      postprocess: (E) => E[0].concat([E[1]])
    },
    {
      name: "other_clause",
      symbols: [G.has("RESERVED_CLAUSE") ? { type: "RESERVED_CLAUSE" } : RESERVED_CLAUSE, "other_clause$ebnf$1"],
      postprocess: ([E, e]) => ({
        type: d.clause,
        nameKw: Y(E),
        children: e
      })
    },
    {
      name: "set_operation$ebnf$1",
      symbols: []
    },
    {
      name: "set_operation$ebnf$1",
      symbols: ["set_operation$ebnf$1", "free_form_sql"],
      postprocess: (E) => E[0].concat([E[1]])
    },
    {
      name: "set_operation",
      symbols: [G.has("RESERVED_SET_OPERATION") ? { type: "RESERVED_SET_OPERATION" } : RESERVED_SET_OPERATION, "set_operation$ebnf$1"],
      postprocess: ([E, e]) => ({
        type: d.set_operation,
        nameKw: Y(E),
        children: e
      })
    },
    {
      name: "expression_chain_$ebnf$1",
      symbols: ["expression_with_comments_"]
    },
    {
      name: "expression_chain_$ebnf$1",
      symbols: ["expression_chain_$ebnf$1", "expression_with_comments_"],
      postprocess: (E) => E[0].concat([E[1]])
    },
    {
      name: "expression_chain_",
      symbols: ["expression_chain_$ebnf$1"],
      postprocess: xE
    },
    {
      name: "expression_chain$ebnf$1",
      symbols: []
    },
    {
      name: "expression_chain$ebnf$1",
      symbols: ["expression_chain$ebnf$1", "_expression_with_comments"],
      postprocess: (E) => E[0].concat([E[1]])
    },
    {
      name: "expression_chain",
      symbols: ["expression", "expression_chain$ebnf$1"],
      postprocess: ([E, e]) => [E, ...e]
    },
    {
      name: "andless_expression_chain$ebnf$1",
      symbols: []
    },
    {
      name: "andless_expression_chain$ebnf$1",
      symbols: ["andless_expression_chain$ebnf$1", "_andless_expression_with_comments"],
      postprocess: (E) => E[0].concat([E[1]])
    },
    {
      name: "andless_expression_chain",
      symbols: ["andless_expression", "andless_expression_chain$ebnf$1"],
      postprocess: ([E, e]) => [E, ...e]
    },
    {
      name: "expression_with_comments_",
      symbols: ["expression", "_"],
      postprocess: ([E, e]) => g(E, { trailing: e })
    },
    {
      name: "_expression_with_comments",
      symbols: ["_", "expression"],
      postprocess: ([E, e]) => g(e, { leading: E })
    },
    {
      name: "_andless_expression_with_comments",
      symbols: ["_", "andless_expression"],
      postprocess: ([E, e]) => g(e, { leading: E })
    },
    {
      name: "free_form_sql$subexpression$1",
      symbols: ["asteriskless_free_form_sql"]
    },
    {
      name: "free_form_sql$subexpression$1",
      symbols: ["asterisk"]
    },
    {
      name: "free_form_sql",
      symbols: ["free_form_sql$subexpression$1"],
      postprocess: q
    },
    {
      name: "asteriskless_free_form_sql$subexpression$1",
      symbols: ["asteriskless_andless_expression"]
    },
    {
      name: "asteriskless_free_form_sql$subexpression$1",
      symbols: ["logic_operator"]
    },
    {
      name: "asteriskless_free_form_sql$subexpression$1",
      symbols: ["comma"]
    },
    {
      name: "asteriskless_free_form_sql$subexpression$1",
      symbols: ["comment"]
    },
    {
      name: "asteriskless_free_form_sql$subexpression$1",
      symbols: ["other_keyword"]
    },
    {
      name: "asteriskless_free_form_sql",
      symbols: ["asteriskless_free_form_sql$subexpression$1"],
      postprocess: q
    },
    {
      name: "expression$subexpression$1",
      symbols: ["andless_expression"]
    },
    {
      name: "expression$subexpression$1",
      symbols: ["logic_operator"]
    },
    {
      name: "expression",
      symbols: ["expression$subexpression$1"],
      postprocess: q
    },
    {
      name: "andless_expression$subexpression$1",
      symbols: ["asteriskless_andless_expression"]
    },
    {
      name: "andless_expression$subexpression$1",
      symbols: ["asterisk"]
    },
    {
      name: "andless_expression",
      symbols: ["andless_expression$subexpression$1"],
      postprocess: q
    },
    {
      name: "asteriskless_andless_expression$subexpression$1",
      symbols: ["atomic_expression"]
    },
    {
      name: "asteriskless_andless_expression$subexpression$1",
      symbols: ["between_predicate"]
    },
    {
      name: "asteriskless_andless_expression$subexpression$1",
      symbols: ["case_expression"]
    },
    {
      name: "asteriskless_andless_expression",
      symbols: ["asteriskless_andless_expression$subexpression$1"],
      postprocess: q
    },
    {
      name: "atomic_expression$subexpression$1",
      symbols: ["array_subscript"]
    },
    {
      name: "atomic_expression$subexpression$1",
      symbols: ["function_call"]
    },
    {
      name: "atomic_expression$subexpression$1",
      symbols: ["property_access"]
    },
    {
      name: "atomic_expression$subexpression$1",
      symbols: ["parenthesis"]
    },
    {
      name: "atomic_expression$subexpression$1",
      symbols: ["curly_braces"]
    },
    {
      name: "atomic_expression$subexpression$1",
      symbols: ["square_brackets"]
    },
    {
      name: "atomic_expression$subexpression$1",
      symbols: ["operator"]
    },
    {
      name: "atomic_expression$subexpression$1",
      symbols: ["identifier"]
    },
    {
      name: "atomic_expression$subexpression$1",
      symbols: ["parameter"]
    },
    {
      name: "atomic_expression$subexpression$1",
      symbols: ["literal"]
    },
    {
      name: "atomic_expression$subexpression$1",
      symbols: ["data_type"]
    },
    {
      name: "atomic_expression$subexpression$1",
      symbols: ["keyword"]
    },
    {
      name: "atomic_expression",
      symbols: ["atomic_expression$subexpression$1"],
      postprocess: q
    },
    {
      name: "array_subscript",
      symbols: [
        G.has("ARRAY_IDENTIFIER") ? { type: "ARRAY_IDENTIFIER" } : ARRAY_IDENTIFIER,
        "_",
        "square_brackets"
      ],
      postprocess: ([E, e, T]) => ({
        type: d.array_subscript,
        array: g({
          type: d.identifier,
          quoted: !1,
          text: E.text
        }, { trailing: e }),
        parenthesis: T
      })
    },
    {
      name: "array_subscript",
      symbols: [
        G.has("ARRAY_KEYWORD") ? { type: "ARRAY_KEYWORD" } : ARRAY_KEYWORD,
        "_",
        "square_brackets"
      ],
      postprocess: ([E, e, T]) => ({
        type: d.array_subscript,
        array: g(Y(E), { trailing: e }),
        parenthesis: T
      })
    },
    {
      name: "function_call",
      symbols: [
        G.has("RESERVED_FUNCTION_NAME") ? { type: "RESERVED_FUNCTION_NAME" } : RESERVED_FUNCTION_NAME,
        "_",
        "parenthesis"
      ],
      postprocess: ([E, e, T]) => ({
        type: d.function_call,
        nameKw: g(Y(E), { trailing: e }),
        parenthesis: T
      })
    },
    {
      name: "parenthesis",
      symbols: [
        { literal: "(" },
        "expressions_or_clauses",
        { literal: ")" }
      ],
      postprocess: ([E, e, T]) => ({
        type: d.parenthesis,
        children: e,
        openParen: "(",
        closeParen: ")"
      })
    },
    {
      name: "curly_braces$ebnf$1",
      symbols: []
    },
    {
      name: "curly_braces$ebnf$1",
      symbols: ["curly_braces$ebnf$1", "free_form_sql"],
      postprocess: (E) => E[0].concat([E[1]])
    },
    {
      name: "curly_braces",
      symbols: [
        { literal: "{" },
        "curly_braces$ebnf$1",
        { literal: "}" }
      ],
      postprocess: ([E, e, T]) => ({
        type: d.parenthesis,
        children: e,
        openParen: "{",
        closeParen: "}"
      })
    },
    {
      name: "square_brackets$ebnf$1",
      symbols: []
    },
    {
      name: "square_brackets$ebnf$1",
      symbols: ["square_brackets$ebnf$1", "free_form_sql"],
      postprocess: (E) => E[0].concat([E[1]])
    },
    {
      name: "square_brackets",
      symbols: [
        { literal: "[" },
        "square_brackets$ebnf$1",
        { literal: "]" }
      ],
      postprocess: ([E, e, T]) => ({
        type: d.parenthesis,
        children: e,
        openParen: "[",
        closeParen: "]"
      })
    },
    {
      name: "property_access$subexpression$1",
      symbols: ["identifier"]
    },
    {
      name: "property_access$subexpression$1",
      symbols: ["array_subscript"]
    },
    {
      name: "property_access$subexpression$1",
      symbols: ["all_columns_asterisk"]
    },
    {
      name: "property_access$subexpression$1",
      symbols: ["parameter"]
    },
    {
      name: "property_access",
      symbols: [
        "atomic_expression",
        "_",
        G.has("PROPERTY_ACCESS_OPERATOR") ? { type: "PROPERTY_ACCESS_OPERATOR" } : PROPERTY_ACCESS_OPERATOR,
        "_",
        "property_access$subexpression$1"
      ],
      postprocess: ([E, e, T, R, [A]]) => ({
        type: d.property_access,
        object: g(E, { trailing: e }),
        operator: T.text,
        property: g(A, { leading: R })
      })
    },
    {
      name: "between_predicate",
      symbols: [
        G.has("BETWEEN") ? { type: "BETWEEN" } : BETWEEN,
        "_",
        "andless_expression_chain",
        "_",
        G.has("AND") ? { type: "AND" } : AND,
        "_",
        "andless_expression"
      ],
      postprocess: ([E, e, T, R, A, r, s]) => ({
        type: d.between_predicate,
        betweenKw: Y(E),
        expr1: OI(T, {
          leading: e,
          trailing: R
        }),
        andKw: Y(A),
        expr2: [g(s, { leading: r })]
      })
    },
    {
      name: "case_expression$ebnf$1",
      symbols: ["expression_chain_"],
      postprocess: xE
    },
    {
      name: "case_expression$ebnf$1",
      symbols: [],
      postprocess: () => null
    },
    {
      name: "case_expression$ebnf$2",
      symbols: []
    },
    {
      name: "case_expression$ebnf$2",
      symbols: ["case_expression$ebnf$2", "case_clause"],
      postprocess: (E) => E[0].concat([E[1]])
    },
    {
      name: "case_expression",
      symbols: [
        G.has("CASE") ? { type: "CASE" } : CASE,
        "_",
        "case_expression$ebnf$1",
        "case_expression$ebnf$2",
        G.has("END") ? { type: "END" } : END
      ],
      postprocess: ([E, e, T, R, A]) => ({
        type: d.case_expression,
        caseKw: g(Y(E), { trailing: e }),
        endKw: Y(A),
        expr: T || [],
        clauses: R
      })
    },
    {
      name: "case_clause",
      symbols: [
        G.has("WHEN") ? { type: "WHEN" } : WHEN,
        "_",
        "expression_chain_",
        G.has("THEN") ? { type: "THEN" } : THEN,
        "_",
        "expression_chain_"
      ],
      postprocess: ([E, e, T, R, A, r]) => ({
        type: d.case_when,
        whenKw: g(Y(E), { trailing: e }),
        thenKw: g(Y(R), { trailing: A }),
        condition: T,
        result: r
      })
    },
    {
      name: "case_clause",
      symbols: [
        G.has("ELSE") ? { type: "ELSE" } : ELSE,
        "_",
        "expression_chain_"
      ],
      postprocess: ([E, e, T]) => ({
        type: d.case_else,
        elseKw: g(Y(E), { trailing: e }),
        result: T
      })
    },
    {
      name: "comma$subexpression$1",
      symbols: [G.has("COMMA") ? { type: "COMMA" } : COMMA]
    },
    {
      name: "comma",
      symbols: ["comma$subexpression$1"],
      postprocess: ([[E]]) => ({ type: d.comma })
    },
    {
      name: "asterisk$subexpression$1",
      symbols: [G.has("ASTERISK") ? { type: "ASTERISK" } : ASTERISK]
    },
    {
      name: "asterisk",
      symbols: ["asterisk$subexpression$1"],
      postprocess: ([[E]]) => ({
        type: d.operator,
        text: E.text
      })
    },
    {
      name: "operator$subexpression$1",
      symbols: [G.has("OPERATOR") ? { type: "OPERATOR" } : OPERATOR]
    },
    {
      name: "operator",
      symbols: ["operator$subexpression$1"],
      postprocess: ([[E]]) => ({
        type: d.operator,
        text: E.text
      })
    },
    {
      name: "identifier$subexpression$1",
      symbols: [G.has("IDENTIFIER") ? { type: "IDENTIFIER" } : IDENTIFIER]
    },
    {
      name: "identifier$subexpression$1",
      symbols: [G.has("QUOTED_IDENTIFIER") ? { type: "QUOTED_IDENTIFIER" } : QUOTED_IDENTIFIER]
    },
    {
      name: "identifier$subexpression$1",
      symbols: [G.has("VARIABLE") ? { type: "VARIABLE" } : VARIABLE]
    },
    {
      name: "identifier",
      symbols: ["identifier$subexpression$1"],
      postprocess: ([[E]]) => ({
        type: d.identifier,
        quoted: E.type !== "IDENTIFIER",
        text: E.text
      })
    },
    {
      name: "parameter$subexpression$1",
      symbols: [G.has("NAMED_PARAMETER") ? { type: "NAMED_PARAMETER" } : NAMED_PARAMETER]
    },
    {
      name: "parameter$subexpression$1",
      symbols: [G.has("QUOTED_PARAMETER") ? { type: "QUOTED_PARAMETER" } : QUOTED_PARAMETER]
    },
    {
      name: "parameter$subexpression$1",
      symbols: [G.has("NUMBERED_PARAMETER") ? { type: "NUMBERED_PARAMETER" } : NUMBERED_PARAMETER]
    },
    {
      name: "parameter$subexpression$1",
      symbols: [G.has("POSITIONAL_PARAMETER") ? { type: "POSITIONAL_PARAMETER" } : POSITIONAL_PARAMETER]
    },
    {
      name: "parameter$subexpression$1",
      symbols: [G.has("CUSTOM_PARAMETER") ? { type: "CUSTOM_PARAMETER" } : CUSTOM_PARAMETER]
    },
    {
      name: "parameter",
      symbols: ["parameter$subexpression$1"],
      postprocess: ([[E]]) => ({
        type: d.parameter,
        key: E.key,
        text: E.text
      })
    },
    {
      name: "literal$subexpression$1",
      symbols: [G.has("NUMBER") ? { type: "NUMBER" } : NUMBER]
    },
    {
      name: "literal$subexpression$1",
      symbols: [G.has("STRING") ? { type: "STRING" } : STRING]
    },
    {
      name: "literal",
      symbols: ["literal$subexpression$1"],
      postprocess: ([[E]]) => ({
        type: d.literal,
        text: E.text
      })
    },
    {
      name: "keyword$subexpression$1",
      symbols: [G.has("RESERVED_KEYWORD") ? { type: "RESERVED_KEYWORD" } : RESERVED_KEYWORD]
    },
    {
      name: "keyword$subexpression$1",
      symbols: [G.has("RESERVED_KEYWORD_PHRASE") ? { type: "RESERVED_KEYWORD_PHRASE" } : RESERVED_KEYWORD_PHRASE]
    },
    {
      name: "keyword$subexpression$1",
      symbols: [G.has("RESERVED_JOIN") ? { type: "RESERVED_JOIN" } : RESERVED_JOIN]
    },
    {
      name: "keyword",
      symbols: ["keyword$subexpression$1"],
      postprocess: ([[E]]) => Y(E)
    },
    {
      name: "data_type$subexpression$1",
      symbols: [G.has("RESERVED_DATA_TYPE") ? { type: "RESERVED_DATA_TYPE" } : RESERVED_DATA_TYPE]
    },
    {
      name: "data_type$subexpression$1",
      symbols: [G.has("RESERVED_DATA_TYPE_PHRASE") ? { type: "RESERVED_DATA_TYPE_PHRASE" } : RESERVED_DATA_TYPE_PHRASE]
    },
    {
      name: "data_type",
      symbols: ["data_type$subexpression$1"],
      postprocess: ([[E]]) => fe(E)
    },
    {
      name: "data_type",
      symbols: [
        G.has("RESERVED_PARAMETERIZED_DATA_TYPE") ? { type: "RESERVED_PARAMETERIZED_DATA_TYPE" } : RESERVED_PARAMETERIZED_DATA_TYPE,
        "_",
        "parenthesis"
      ],
      postprocess: ([E, e, T]) => ({
        type: d.parameterized_data_type,
        dataType: g(fe(E), { trailing: e }),
        parenthesis: T
      })
    },
    {
      name: "logic_operator$subexpression$1",
      symbols: [G.has("AND") ? { type: "AND" } : AND]
    },
    {
      name: "logic_operator$subexpression$1",
      symbols: [G.has("OR") ? { type: "OR" } : OR]
    },
    {
      name: "logic_operator$subexpression$1",
      symbols: [G.has("XOR") ? { type: "XOR" } : XOR]
    },
    {
      name: "logic_operator",
      symbols: ["logic_operator$subexpression$1"],
      postprocess: ([[E]]) => Y(E)
    },
    {
      name: "other_keyword$subexpression$1",
      symbols: [G.has("WHEN") ? { type: "WHEN" } : WHEN]
    },
    {
      name: "other_keyword$subexpression$1",
      symbols: [G.has("THEN") ? { type: "THEN" } : THEN]
    },
    {
      name: "other_keyword$subexpression$1",
      symbols: [G.has("ELSE") ? { type: "ELSE" } : ELSE]
    },
    {
      name: "other_keyword$subexpression$1",
      symbols: [G.has("END") ? { type: "END" } : END]
    },
    {
      name: "other_keyword",
      symbols: ["other_keyword$subexpression$1"],
      postprocess: ([[E]]) => Y(E)
    },
    {
      name: "_$ebnf$1",
      symbols: []
    },
    {
      name: "_$ebnf$1",
      symbols: ["_$ebnf$1", "comment"],
      postprocess: (E) => E[0].concat([E[1]])
    },
    {
      name: "_",
      symbols: ["_$ebnf$1"],
      postprocess: ([E]) => E
    },
    {
      name: "comment",
      symbols: [G.has("LINE_COMMENT") ? { type: "LINE_COMMENT" } : LINE_COMMENT],
      postprocess: ([E]) => ({
        type: d.line_comment,
        text: E.text,
        precedingWhitespace: E.precedingWhitespace
      })
    },
    {
      name: "comment",
      symbols: [G.has("BLOCK_COMMENT") ? { type: "BLOCK_COMMENT" } : BLOCK_COMMENT],
      postprocess: ([E]) => ({
        type: d.block_comment,
        text: E.text,
        precedingWhitespace: E.precedingWhitespace
      })
    },
    {
      name: "comment",
      symbols: [G.has("DISABLE_COMMENT") ? { type: "DISABLE_COMMENT" } : DISABLE_COMMENT],
      postprocess: ([E]) => ({
        type: d.disable_comment,
        text: E.text,
        precedingWhitespace: E.precedingWhitespace
      })
    }
  ],
  ParserStart: "main"
}, sI = /* @__PURE__ */ $e(EI(), 1), { Parser: aI, Grammar: nI } = sI.default;
function oI(E) {
  let e = {};
  const T = new AT((A) => [...eI(E.tokenize(A, e)), qe(A.length)]), R = new aI(nI.fromCompiled(NI), { lexer: T });
  return { parse: (A, r) => {
    e = r;
    const { results: s } = R.feed(A);
    if (s.length === 1) return s[0];
    throw s.length === 0 ? new Error("Parse error: Invalid SQL") : new Error(`Parse error: Ambiguous grammar
${JSON.stringify(s, void 0, 2)}`);
  } };
}
var a;
(function(E) {
  E[E.SPACE = 0] = "SPACE", E[E.NO_SPACE = 1] = "NO_SPACE", E[E.NO_NEWLINE = 2] = "NO_NEWLINE", E[E.NEWLINE = 3] = "NEWLINE", E[E.MANDATORY_NEWLINE = 4] = "MANDATORY_NEWLINE", E[E.INDENT = 5] = "INDENT", E[E.SINGLE_INDENT = 6] = "SINGLE_INDENT";
})(a = a || (a = {}));
var tT = class {
  constructor(E) {
    this.indentation = E, this.items = [];
  }
  add(...E) {
    for (const e of E) switch (e) {
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
    for (; iI(AE(this.items)); ) this.items.pop();
  }
  trimWhitespace() {
    for (; CI(AE(this.items)); ) this.items.pop();
  }
  addNewline(E) {
    if (this.items.length > 0) switch (AE(this.items)) {
      case a.NEWLINE:
        this.items.pop(), this.items.push(E);
        break;
      case a.MANDATORY_NEWLINE:
        break;
      default:
        this.items.push(E);
        break;
    }
  }
  addIndentation() {
    for (let E = 0; E < this.indentation.getLevel(); E++) this.items.push(a.SINGLE_INDENT);
  }
  toString() {
    return this.items.map((E) => this.itemToString(E)).join("");
  }
  getLayoutItems() {
    return this.items;
  }
  itemToString(E) {
    switch (E) {
      case a.SPACE:
        return " ";
      case a.NEWLINE:
      case a.MANDATORY_NEWLINE:
        return `
`;
      case a.SINGLE_INDENT:
        return this.indentation.getSingleIndent();
      default:
        return E;
    }
  }
}, iI = (E) => E === a.SPACE || E === a.SINGLE_INDENT, CI = (E) => E === a.SPACE || E === a.SINGLE_INDENT || E === a.NEWLINE;
function ye(E, e) {
  if (e === "standard") return E;
  let T = [];
  return E.length >= 10 && E.includes(" ") && ([E, ...T] = E.split(" ")), e === "tabularLeft" ? E = E.padEnd(9, " ") : E = E.padStart(9, " "), E + ["", ...T].join(" ");
}
function be(E) {
  return XT(E) || E === i.RESERVED_CLAUSE || E === i.RESERVED_SELECT || E === i.RESERVED_SET_OPERATION || E === i.RESERVED_JOIN || E === i.LIMIT;
}
var WE = "top-level", LI = "block-level", ST = class {
  constructor(E) {
    this.indent = E, this.indentTypes = [];
  }
  getSingleIndent() {
    return this.indent;
  }
  getLevel() {
    return this.indentTypes.length;
  }
  increaseTopLevel() {
    this.indentTypes.push(WE);
  }
  increaseBlockLevel() {
    this.indentTypes.push(LI);
  }
  decreaseTopLevel() {
    this.indentTypes.length > 0 && AE(this.indentTypes) === WE && this.indentTypes.pop();
  }
  decreaseBlockLevel() {
    for (; this.indentTypes.length > 0 && this.indentTypes.pop() === WE; ) ;
  }
}, _I = class extends tT {
  constructor(E) {
    super(new ST("")), this.expressionWidth = E, this.length = 0, this.trailingSpace = !1;
  }
  add(...E) {
    if (E.forEach((e) => this.addToLength(e)), this.length > this.expressionWidth) throw new qE();
    super.add(...E);
  }
  addToLength(E) {
    if (typeof E == "string")
      this.length += E.length, this.trailingSpace = !1;
    else {
      if (E === a.MANDATORY_NEWLINE || E === a.NEWLINE) throw new qE();
      E === a.INDENT || E === a.SINGLE_INDENT || E === a.SPACE ? this.trailingSpace || (this.length++, this.trailingSpace = !0) : (E === a.NO_NEWLINE || E === a.NO_SPACE) && this.trailingSpace && (this.trailingSpace = !1, this.length--);
    }
  }
}, qE = class extends Error {
}, lI = class QE {
  constructor({ cfg: e, dialectCfg: T, params: R, layout: A, inline: r = !1 }) {
    this.inline = !1, this.nodes = [], this.index = -1, this.cfg = e, this.dialectCfg = T, this.inline = r, this.params = R, this.layout = A;
  }
  format(e) {
    for (this.nodes = e, this.index = 0; this.index < this.nodes.length; this.index++) this.formatNode(this.nodes[this.index]);
    return this.layout;
  }
  formatNode(e) {
    this.formatComments(e.leadingComments), this.formatNodeWithoutComments(e), this.formatComments(e.trailingComments);
  }
  formatNodeWithoutComments(e) {
    switch (e.type) {
      case d.function_call:
        return this.formatFunctionCall(e);
      case d.parameterized_data_type:
        return this.formatParameterizedDataType(e);
      case d.array_subscript:
        return this.formatArraySubscript(e);
      case d.property_access:
        return this.formatPropertyAccess(e);
      case d.parenthesis:
        return this.formatParenthesis(e);
      case d.between_predicate:
        return this.formatBetweenPredicate(e);
      case d.case_expression:
        return this.formatCaseExpression(e);
      case d.case_when:
        return this.formatCaseWhen(e);
      case d.case_else:
        return this.formatCaseElse(e);
      case d.clause:
        return this.formatClause(e);
      case d.set_operation:
        return this.formatSetOperation(e);
      case d.limit_clause:
        return this.formatLimitClause(e);
      case d.all_columns_asterisk:
        return this.formatAllColumnsAsterisk(e);
      case d.literal:
        return this.formatLiteral(e);
      case d.identifier:
        return this.formatIdentifier(e);
      case d.parameter:
        return this.formatParameter(e);
      case d.operator:
        return this.formatOperator(e);
      case d.comma:
        return this.formatComma(e);
      case d.line_comment:
        return this.formatLineComment(e);
      case d.block_comment:
        return this.formatBlockComment(e);
      case d.disable_comment:
        return this.formatBlockComment(e);
      case d.data_type:
        return this.formatDataType(e);
      case d.keyword:
        return this.formatKeywordNode(e);
    }
  }
  formatFunctionCall(e) {
    this.withComments(e.nameKw, () => {
      this.layout.add(this.showFunctionKw(e.nameKw));
    }), this.formatNode(e.parenthesis);
  }
  formatParameterizedDataType(e) {
    this.withComments(e.dataType, () => {
      this.layout.add(this.showDataType(e.dataType));
    }), this.formatNode(e.parenthesis);
  }
  formatArraySubscript(e) {
    let T;
    switch (e.array.type) {
      case d.data_type:
        T = this.showDataType(e.array);
        break;
      case d.keyword:
        T = this.showKw(e.array);
        break;
      default:
        T = this.showIdentifier(e.array);
        break;
    }
    this.withComments(e.array, () => {
      this.layout.add(T);
    }), this.formatNode(e.parenthesis);
  }
  formatPropertyAccess(e) {
    this.formatNode(e.object), this.layout.add(a.NO_SPACE, e.operator), this.formatNode(e.property);
  }
  formatParenthesis(e) {
    const T = this.formatInlineExpression(e.children);
    T ? (this.layout.add(e.openParen), this.layout.add(...T.getLayoutItems()), this.layout.add(a.NO_SPACE, e.closeParen, a.SPACE)) : (this.layout.add(e.openParen, a.NEWLINE), EE(this.cfg) ? (this.layout.add(a.INDENT), this.layout = this.formatSubExpression(e.children)) : (this.layout.indentation.increaseBlockLevel(), this.layout.add(a.INDENT), this.layout = this.formatSubExpression(e.children), this.layout.indentation.decreaseBlockLevel()), this.layout.add(a.NEWLINE, a.INDENT, e.closeParen, a.SPACE));
  }
  formatBetweenPredicate(e) {
    this.layout.add(this.showKw(e.betweenKw), a.SPACE), this.layout = this.formatSubExpression(e.expr1), this.layout.add(a.NO_SPACE, a.SPACE, this.showNonTabularKw(e.andKw), a.SPACE), this.layout = this.formatSubExpression(e.expr2), this.layout.add(a.SPACE);
  }
  formatCaseExpression(e) {
    this.formatNode(e.caseKw), this.layout.indentation.increaseBlockLevel(), this.layout = this.formatSubExpression(e.expr), this.layout = this.formatSubExpression(e.clauses), this.layout.indentation.decreaseBlockLevel(), this.layout.add(a.NEWLINE, a.INDENT), this.formatNode(e.endKw);
  }
  formatCaseWhen(e) {
    this.layout.add(a.NEWLINE, a.INDENT), this.formatNode(e.whenKw), this.layout = this.formatSubExpression(e.condition), this.formatNode(e.thenKw), this.layout = this.formatSubExpression(e.result);
  }
  formatCaseElse(e) {
    this.layout.add(a.NEWLINE, a.INDENT), this.formatNode(e.elseKw), this.layout = this.formatSubExpression(e.result);
  }
  formatClause(e) {
    this.isOnelineClause(e) ? this.formatClauseInOnelineStyle(e) : EE(this.cfg) ? this.formatClauseInTabularStyle(e) : this.formatClauseInIndentedStyle(e);
  }
  isOnelineClause(e) {
    return EE(this.cfg) ? this.dialectCfg.tabularOnelineClauses[e.nameKw.text] : this.dialectCfg.onelineClauses[e.nameKw.text];
  }
  formatClauseInIndentedStyle(e) {
    this.layout.add(a.NEWLINE, a.INDENT, this.showKw(e.nameKw), a.NEWLINE), this.layout.indentation.increaseTopLevel(), this.layout.add(a.INDENT), this.layout = this.formatSubExpression(e.children), this.layout.indentation.decreaseTopLevel();
  }
  formatClauseInOnelineStyle(e) {
    this.layout.add(a.NEWLINE, a.INDENT, this.showKw(e.nameKw), a.SPACE), this.layout = this.formatSubExpression(e.children);
  }
  formatClauseInTabularStyle(e) {
    this.layout.add(a.NEWLINE, a.INDENT, this.showKw(e.nameKw), a.SPACE), this.layout.indentation.increaseTopLevel(), this.layout = this.formatSubExpression(e.children), this.layout.indentation.decreaseTopLevel();
  }
  formatSetOperation(e) {
    this.layout.add(a.NEWLINE, a.INDENT, this.showKw(e.nameKw), a.NEWLINE), this.layout.add(a.INDENT), this.layout = this.formatSubExpression(e.children);
  }
  formatLimitClause(e) {
    this.withComments(e.limitKw, () => {
      this.layout.add(a.NEWLINE, a.INDENT, this.showKw(e.limitKw));
    }), this.layout.indentation.increaseTopLevel(), EE(this.cfg) ? this.layout.add(a.SPACE) : this.layout.add(a.NEWLINE, a.INDENT), e.offset ? (this.layout = this.formatSubExpression(e.offset), this.layout.add(a.NO_SPACE, ",", a.SPACE), this.layout = this.formatSubExpression(e.count)) : this.layout = this.formatSubExpression(e.count), this.layout.indentation.decreaseTopLevel();
  }
  formatAllColumnsAsterisk(e) {
    this.layout.add("*", a.SPACE);
  }
  formatLiteral(e) {
    this.layout.add(e.text, a.SPACE);
  }
  formatIdentifier(e) {
    this.layout.add(this.showIdentifier(e), a.SPACE);
  }
  formatParameter(e) {
    this.layout.add(this.params.get(e), a.SPACE);
  }
  formatOperator({ text: e }) {
    this.cfg.denseOperators || this.dialectCfg.alwaysDenseOperators.includes(e) ? this.layout.add(a.NO_SPACE, e) : e === ":" ? this.layout.add(a.NO_SPACE, e, a.SPACE) : this.layout.add(e, a.SPACE);
  }
  formatComma(e) {
    this.inline ? this.layout.add(a.NO_SPACE, ",", a.SPACE) : this.layout.add(a.NO_SPACE, ",", a.NEWLINE, a.INDENT);
  }
  withComments(e, T) {
    this.formatComments(e.leadingComments), T(), this.formatComments(e.trailingComments);
  }
  formatComments(e) {
    e && e.forEach((T) => {
      T.type === d.line_comment ? this.formatLineComment(T) : this.formatBlockComment(T);
    });
  }
  formatLineComment(e) {
    vE(e.precedingWhitespace || "") ? this.layout.add(a.NEWLINE, a.INDENT, e.text, a.MANDATORY_NEWLINE, a.INDENT) : this.layout.getLayoutItems().length > 0 ? this.layout.add(a.NO_NEWLINE, a.SPACE, e.text, a.MANDATORY_NEWLINE, a.INDENT) : this.layout.add(e.text, a.MANDATORY_NEWLINE, a.INDENT);
  }
  formatBlockComment(e) {
    e.type === d.block_comment && this.isMultilineBlockComment(e) ? (this.splitBlockComment(e.text).forEach((T) => {
      this.layout.add(a.NEWLINE, a.INDENT, T);
    }), this.layout.add(a.NEWLINE, a.INDENT)) : this.layout.add(e.text, a.SPACE);
  }
  isMultilineBlockComment(e) {
    return vE(e.text) || vE(e.precedingWhitespace || "");
  }
  isDocComment(e) {
    const T = e.split(/\n/);
    return /^\/\*\*?$/.test(T[0]) && T.slice(1, T.length - 1).every((R) => /^\s*\*/.test(R)) && /^\s*\*\/$/.test(AE(T));
  }
  splitBlockComment(e) {
    return this.isDocComment(e) ? e.split(/\n/).map((T) => /^\s*\*/.test(T) ? " " + T.replace(/^\s*/, "") : T) : e.split(/\n/).map((T) => T.replace(/^\s*/, ""));
  }
  formatSubExpression(e) {
    return new QE({
      cfg: this.cfg,
      dialectCfg: this.dialectCfg,
      params: this.params,
      layout: this.layout,
      inline: this.inline
    }).format(e);
  }
  formatInlineExpression(e) {
    const T = this.params.getPositionalParameterIndex();
    try {
      return new QE({
        cfg: this.cfg,
        dialectCfg: this.dialectCfg,
        params: this.params,
        layout: new _I(this.cfg.expressionWidth),
        inline: !0
      }).format(e);
    } catch (R) {
      if (R instanceof qE) {
        this.params.setPositionalParameterIndex(T);
        return;
      } else throw R;
    }
  }
  formatKeywordNode(e) {
    switch (e.tokenType) {
      case i.RESERVED_JOIN:
        return this.formatJoin(e);
      case i.AND:
      case i.OR:
      case i.XOR:
        return this.formatLogicalOperator(e);
      default:
        return this.formatKeyword(e);
    }
  }
  formatJoin(e) {
    EE(this.cfg) ? (this.layout.indentation.decreaseTopLevel(), this.layout.add(a.NEWLINE, a.INDENT, this.showKw(e), a.SPACE), this.layout.indentation.increaseTopLevel()) : this.layout.add(a.NEWLINE, a.INDENT, this.showKw(e), a.SPACE);
  }
  formatKeyword(e) {
    this.layout.add(this.showKw(e), a.SPACE);
  }
  formatLogicalOperator(e) {
    this.cfg.logicalOperatorNewline === "before" ? EE(this.cfg) ? (this.layout.indentation.decreaseTopLevel(), this.layout.add(a.NEWLINE, a.INDENT, this.showKw(e), a.SPACE), this.layout.indentation.increaseTopLevel()) : this.layout.add(a.NEWLINE, a.INDENT, this.showKw(e), a.SPACE) : this.layout.add(this.showKw(e), a.NEWLINE, a.INDENT);
  }
  formatDataType(e) {
    this.layout.add(this.showDataType(e), a.SPACE);
  }
  showKw(e) {
    return be(e.tokenType) ? ye(this.showNonTabularKw(e), this.cfg.indentStyle) : this.showNonTabularKw(e);
  }
  showNonTabularKw(e) {
    switch (this.cfg.keywordCase) {
      case "preserve":
        return aE(e.raw);
      case "upper":
        return e.text;
      case "lower":
        return e.text.toLowerCase();
    }
  }
  showFunctionKw(e) {
    return be(e.tokenType) ? ye(this.showNonTabularFunctionKw(e), this.cfg.indentStyle) : this.showNonTabularFunctionKw(e);
  }
  showNonTabularFunctionKw(e) {
    switch (this.cfg.functionCase) {
      case "preserve":
        return aE(e.raw);
      case "upper":
        return e.text;
      case "lower":
        return e.text.toLowerCase();
    }
  }
  showIdentifier(e) {
    if (e.quoted) return e.text;
    switch (this.cfg.identifierCase) {
      case "preserve":
        return e.text;
      case "upper":
        return e.text.toUpperCase();
      case "lower":
        return e.text.toLowerCase();
    }
  }
  showDataType(e) {
    switch (this.cfg.dataTypeCase) {
      case "preserve":
        return aE(e.raw);
      case "upper":
        return e.text;
      case "lower":
        return e.text.toLowerCase();
    }
  }
}, DI = class {
  constructor(E, e) {
    this.dialect = E, this.cfg = e, this.params = new jS(this.cfg.params);
  }
  format(E) {
    const e = this.parse(E);
    return this.formatAst(e).trimEnd();
  }
  parse(E) {
    return oI(this.dialect.tokenizer).parse(E, this.cfg.paramTypes || {});
  }
  formatAst(E) {
    return E.map((e) => this.formatStatement(e)).join(`
`.repeat(this.cfg.linesBetweenQueries + 1));
  }
  formatStatement(E) {
    const e = new lI({
      cfg: this.cfg,
      dialectCfg: this.dialect.formatOptions,
      params: this.params,
      layout: new tT(new ST(zS(this.cfg)))
    }).format(E.children);
    return E.hasSemicolon && (this.cfg.newlineBeforeSemicolon ? e.add(a.NEWLINE, ";") : e.add(a.NO_NEWLINE, ";")), e.toString();
  }
}, nE = class extends Error {
};
function PI(E) {
  for (const e of [
    "multilineLists",
    "newlineBeforeOpenParen",
    "newlineBeforeCloseParen",
    "aliasAs",
    "commaPosition",
    "tabulateAlias"
  ]) if (e in E) throw new nE(`${e} config is no more supported.`);
  if (E.expressionWidth <= 0) throw new nE(`expressionWidth config must be positive number. Received ${E.expressionWidth} instead.`);
  if (E.params && !MI(E.params) && console.warn('WARNING: All "params" option values should be strings.'), E.paramTypes && !UI(E.paramTypes)) throw new nE("Empty regex given in custom paramTypes. That would result in matching infinite amount of parameters.");
  return E;
}
function MI(E) {
  return (E instanceof Array ? E : Object.values(E)).every((e) => typeof e == "string");
}
function UI(E) {
  return E.custom && Array.isArray(E.custom) ? E.custom.every((e) => e.regex !== "") : !0;
}
var dI = function(E, e) {
  var T = {};
  for (var R in E) Object.prototype.hasOwnProperty.call(E, R) && e.indexOf(R) < 0 && (T[R] = E[R]);
  if (E != null && typeof Object.getOwnPropertySymbols == "function")
    for (var A = 0, R = Object.getOwnPropertySymbols(E); A < R.length; A++) e.indexOf(R[A]) < 0 && Object.prototype.propertyIsEnumerable.call(E, R[A]) && (T[R[A]] = E[R[A]]);
  return T;
}, IT = {
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
}, pI = Object.keys(IT), uI = {
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
}, cI = (E, e = {}) => {
  if (typeof e.language == "string" && !pI.includes(e.language)) throw new nE(`Unsupported SQL dialect: ${e.language}`);
  const T = IT[e.language || "sql"];
  return GI(E, Object.assign(Object.assign({}, e), { dialect: gS[T] }));
}, GI = (E, e) => {
  var { dialect: T } = e, R = dI(e, ["dialect"]);
  if (typeof E != "string") throw new Error("Invalid query argument. Expected string, instead got " + typeof E);
  const A = PI(Object.assign(Object.assign({}, uI), R));
  return new DI(qS(T), A).format(E);
}, Q = /* @__PURE__ */ $e(YT(), 1);
function mI() {
  ZE("json") || (Q.default.languages.json = {
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
  }, Q.default.languages.webmanifest = Q.default.languages.json), ZE("sql") || (Q.default.languages.sql = {
    comment: {
      pattern: /(^|[^\\])(?:\/\*[\s\S]*?\*\/|(?:--|\/\/|#).*)/,
      lookbehind: !0
    },
    variable: [{
      pattern: /@(["'`])(?:\\[\s\S]|(?!\1)[^\\])+\1/,
      greedy: !0
    }, /@[\w.$]+/],
    string: {
      pattern: /(^|[^@\\])("|')(?:\\[\s\S]|(?!\2)[^\\]|\2\2)*\2/,
      greedy: !0,
      lookbehind: !0
    },
    identifier: {
      pattern: /(^|[^@\\])`(?:\\[\s\S]|[^`\\]|``)*`/,
      greedy: !0,
      lookbehind: !0,
      inside: { punctuation: /^`|`$/ }
    },
    function: /\b(?:AVG|COUNT|FIRST|FORMAT|LAST|LCASE|LEN|MAX|MID|MIN|MOD|NOW|ROUND|SUM|UCASE)(?=\s*\()/i,
    keyword: /\b(?:ACTION|ADD|AFTER|ALGORITHM|ALL|ALTER|ANALYZE|ANY|APPLY|AS|ASC|AUTHORIZATION|AUTO_INCREMENT|BACKUP|BDB|BEGIN|BERKELEYDB|BIGINT|BINARY|BIT|BLOB|BOOL|BOOLEAN|BREAK|BROWSE|BTREE|BULK|BY|CALL|CASCADED?|CASE|CHAIN|CHAR(?:ACTER|SET)?|CHECK(?:POINT)?|CLOSE|CLUSTERED|COALESCE|COLLATE|COLUMNS?|COMMENT|COMMIT(?:TED)?|COMPUTE|CONNECT|CONSISTENT|CONSTRAINT|CONTAINS(?:TABLE)?|CONTINUE|CONVERT|CREATE|CROSS|CURRENT(?:_DATE|_TIME|_TIMESTAMP|_USER)?|CURSOR|CYCLE|DATA(?:BASES?)?|DATE(?:TIME)?|DAY|DBCC|DEALLOCATE|DEC|DECIMAL|DECLARE|DEFAULT|DEFINER|DELAYED|DELETE|DELIMITERS?|DENY|DESC|DESCRIBE|DETERMINISTIC|DISABLE|DISCARD|DISK|DISTINCT|DISTINCTROW|DISTRIBUTED|DO|DOUBLE|DROP|DUMMY|DUMP(?:FILE)?|DUPLICATE|ELSE(?:IF)?|ENABLE|ENCLOSED|END|ENGINE|ENUM|ERRLVL|ERRORS|ESCAPED?|EXCEPT|EXEC(?:UTE)?|EXISTS|EXIT|EXPLAIN|EXTENDED|FETCH|FIELDS|FILE|FILLFACTOR|FIRST|FIXED|FLOAT|FOLLOWING|FOR(?: EACH ROW)?|FORCE|FOREIGN|FREETEXT(?:TABLE)?|FROM|FULL|FUNCTION|GEOMETRY(?:COLLECTION)?|GLOBAL|GOTO|GRANT|GROUP|HANDLER|HASH|HAVING|HOLDLOCK|HOUR|IDENTITY(?:COL|_INSERT)?|IF|IGNORE|IMPORT|INDEX|INFILE|INNER|INNODB|INOUT|INSERT|INT|INTEGER|INTERSECT|INTERVAL|INTO|INVOKER|ISOLATION|ITERATE|JOIN|KEYS?|KILL|LANGUAGE|LAST|LEAVE|LEFT|LEVEL|LIMIT|LINENO|LINES|LINESTRING|LOAD|LOCAL|LOCK|LONG(?:BLOB|TEXT)|LOOP|MATCH(?:ED)?|MEDIUM(?:BLOB|INT|TEXT)|MERGE|MIDDLEINT|MINUTE|MODE|MODIFIES|MODIFY|MONTH|MULTI(?:LINESTRING|POINT|POLYGON)|NATIONAL|NATURAL|NCHAR|NEXT|NO|NONCLUSTERED|NULLIF|NUMERIC|OFF?|OFFSETS?|ON|OPEN(?:DATASOURCE|QUERY|ROWSET)?|OPTIMIZE|OPTION(?:ALLY)?|ORDER|OUT(?:ER|FILE)?|OVER|PARTIAL|PARTITION|PERCENT|PIVOT|PLAN|POINT|POLYGON|PRECEDING|PRECISION|PREPARE|PREV|PRIMARY|PRINT|PRIVILEGES|PROC(?:EDURE)?|PUBLIC|PURGE|QUICK|RAISERROR|READS?|REAL|RECONFIGURE|REFERENCES|RELEASE|RENAME|REPEAT(?:ABLE)?|REPLACE|REPLICATION|REQUIRE|RESIGNAL|RESTORE|RESTRICT|RETURN(?:ING|S)?|REVOKE|RIGHT|ROLLBACK|ROUTINE|ROW(?:COUNT|GUIDCOL|S)?|RTREE|RULE|SAVE(?:POINT)?|SCHEMA|SECOND|SELECT|SERIAL(?:IZABLE)?|SESSION(?:_USER)?|SET(?:USER)?|SHARE|SHOW|SHUTDOWN|SIMPLE|SMALLINT|SNAPSHOT|SOME|SONAME|SQL|START(?:ING)?|STATISTICS|STATUS|STRIPED|SYSTEM_USER|TABLES?|TABLESPACE|TEMP(?:ORARY|TABLE)?|TERMINATED|TEXT(?:SIZE)?|THEN|TIME(?:STAMP)?|TINY(?:BLOB|INT|TEXT)|TOP?|TRAN(?:SACTIONS?)?|TRIGGER|TRUNCATE|TSEQUAL|TYPES?|UNBOUNDED|UNCOMMITTED|UNDEFINED|UNION|UNIQUE|UNLOCK|UNPIVOT|UNSIGNED|UPDATE(?:TEXT)?|USAGE|USE|USER|USING|VALUES?|VAR(?:BINARY|CHAR|CHARACTER|YING)|VIEW|WAITFOR|WARNINGS|WHEN|WHERE|WHILE|WITH(?: ROLLUP|IN)?|WORK|WRITE(?:TEXT)?|YEAR)\b/i,
    boolean: /\b(?:FALSE|NULL|TRUE)\b/i,
    number: /\b0x[\da-f]+\b|\b\d+(?:\.\d*)?|\B\.\d+\b/i,
    operator: /[-+*\/=%^~]|&&?|\|\|?|!=?|<(?:=>?|<|>)?|>[>=]?|\b(?:AND|BETWEEN|DIV|ILIKE|IN|IS|LIKE|NOT|OR|REGEXP|RLIKE|SOUNDS LIKE|XOR)\b/i,
    punctuation: /[;[\]()`,.]/
  });
}
function ZE(E) {
  return Object.prototype.hasOwnProperty.call(Q.default.languages, E);
}
function HI(E) {
  return E.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function rT(E, e) {
  return mI(), ZE(e) ? Q.default.highlight(E, Q.default.languages[e], e) : HI(E);
}
function BI(E) {
  if (!E || typeof E != "string") return "";
  try {
    return cI(E, {
      language: "postgresql",
      tabWidth: 2,
      keywordCase: "upper",
      linesBetweenQueries: 1
    });
  } catch {
    return E;
  }
}
function FI(E, e = !1) {
  return !E || typeof E != "string" ? "" : rT(e ? BI(E) : E, "sql");
}
function tE(E, e = !0) {
  let T;
  if (typeof E == "string") try {
    const R = JSON.parse(E);
    T = e ? JSON.stringify(R, null, 2) : E;
  } catch {
    T = E;
  }
  else try {
    T = JSON.stringify(E, null, e ? 2 : 0);
  } catch {
    T = String(E ?? "");
  }
  return rT(T, "json");
}
function hI(E) {
  const e = String(E ?? "GET").trim().toUpperCase();
  return {
    display: e || "GET",
    classToken: e.replace(/[^A-Z]/g, "") || "GET"
  };
}
function YI(E, e) {
  return E.id ? E.id : `${E.timestamp || ""}-${e}`;
}
function gI(E, e, T) {
  return `
    <div class="${T.panelControls}">
      <label class="${T.sortToggle}">
        <input type="checkbox" data-sort-toggle="${E}" ${e ? "checked" : ""}>
        <span>Newest first</span>
      </label>
    </div>
  `;
}
function fI(E, e, T = {}) {
  const { maskPlaceholder: R = "***", maxDetailLength: A } = T, r = [], s = [];
  if (E.id && s.push(`<span>ID: <code>${n(E.id)}</code></span>`), E.remote_ip && s.push(`<span>IP: <code>${n(E.remote_ip)}</code></span>`), E.content_type && s.push(`<span>Content-Type: <code>${n(E.content_type)}</code></span>`), s.length > 0 && r.push(`<div class="${e.detailMetadataLine}">${s.join("")}</div>`), E.headers && Object.keys(E.headers).length > 0) {
    const S = Object.entries(E.headers).map(([L, N]) => {
      const t = A && N.length > A ? oE(N, A) : N, C = N === R ? ` <span class="${e.detailMasked}">(masked)</span>` : "";
      return `<dt>${n(L)}</dt><dd>${n(t)}${C}</dd>`;
    }).join("");
    r.push(`
      <div class="${e.detailSection}">
        <span class="${e.detailLabel}">Request Headers</span>
        <dl class="${e.detailKeyValueTable}">${S}</dl>
      </div>
    `);
  }
  if (E.query && Object.keys(E.query).length > 0) {
    const S = Object.entries(E.query).map(([L, N]) => {
      const t = N === R ? ` <span class="${e.detailMasked}">(masked)</span>` : "";
      return `<dt>${n(L)}</dt><dd>${n(N)}${t}</dd>`;
    }).join("");
    r.push(`
      <div class="${e.detailSection}">
        <span class="${e.detailLabel}">Query Parameters</span>
        <dl class="${e.detailKeyValueTable}">${S}</dl>
      </div>
    `);
  }
  if (E.request_body) {
    const S = E.request_size ? ` (${Se(E.request_size)})` : "", L = E.body_truncated ? ' <span class="' + e.detailMasked + '">(truncated)</span>' : "";
    let N;
    try {
      N = tE(JSON.parse(E.request_body), !0);
    } catch {
      N = n(E.request_body);
    }
    r.push(`
      <div class="${e.detailSection}">
        <span class="${e.detailLabel}">Request Body${S}${L}</span>
        <div class="${e.detailBody}">
          <pre>${N}</pre>
        </div>
        <button class="${e.copyBtnSm}" data-copy-trigger="${n(E.request_body)}">Copy</button>
      </div>
    `);
  }
  if (E.response_headers && Object.keys(E.response_headers).length > 0) {
    const S = Object.entries(E.response_headers).map(([L, N]) => {
      const t = A && N.length > A ? oE(N, A) : N;
      return `<dt>${n(L)}</dt><dd>${n(t)}</dd>`;
    }).join("");
    r.push(`
      <div class="${e.detailSection}">
        <span class="${e.detailLabel}">Response Headers</span>
        <dl class="${e.detailKeyValueTable}">${S}</dl>
      </div>
    `);
  }
  if (E.response_body) {
    const S = E.response_size ? ` (${Se(E.response_size)})` : "";
    let L;
    try {
      L = tE(JSON.parse(E.response_body), !0);
    } catch {
      L = n(E.response_body);
    }
    r.push(`
      <div class="${e.detailSection}">
        <span class="${e.detailLabel}">Response Body${S}</span>
        <div class="${e.detailBody}">
          <pre>${L}</pre>
        </div>
        <button class="${e.copyBtnSm}" data-copy-trigger="${n(E.response_body)}">Copy</button>
      </div>
    `);
  }
  return E.error && r.push(`
      <div class="${e.detailSection}">
        <div class="${e.detailError}">${n(E.error)}</div>
      </div>
    `), r.length === 0 ? `<div class="${e.detailPane}"><span class="${e.muted}">No additional details available</span></div>` : `<div class="${e.detailPane}">${r.join("")}</div>`;
}
function yI(E, e, T, R) {
  const { display: A, classToken: r } = hI(E.method), s = E.path || "", S = E.status || 0, L = zE(E.duration, R.slowThresholdMs), N = YI(E, e), t = R.expandedRequestIds?.has(N) || !1, C = T.badgeMethod(r), _ = T.badgeStatus(S), M = L.isSlow ? T.durationSlow : "", m = S >= 400 ? T.rowError : "", U = R.truncatePath ? oE(s, R.maxPathLength || 50) : s;
  let u = "";
  const H = A;
  if (H === "POST" || H === "PUT" || H === "PATCH") {
    const P = (E.content_type || E.headers?.["Content-Type"] || E.headers?.["content-type"] || "").split(";")[0].trim();
    P && (u = ` <span class="${T.badgeContentType}">${n(P)}</span>`);
  }
  const o = `<span class="${T.expandIcon}" data-expand-icon>${t ? "▼" : "▶"}</span>`, O = t ? "table-row" : "none", l = fI(E, T, {
    maskPlaceholder: R.maskPlaceholder,
    maxDetailLength: R.maxDetailLength
  }), D = t ? l : `<template data-request-detail-template>${l}</template>`;
  return `
    <tr class="${m}" data-request-id="${n(N)}" style="cursor:pointer">
      <td>${o}<span class="${C}">${n(A)}</span>${u}</td>
      <td class="${T.path}" title="${n(s)}">${n(U)}</td>
      <td><span class="${_}">${n(S || "-")}</span></td>
      <td class="${T.duration} ${M}">${L.text}</td>
      <td class="${T.timestamp}">${n(X(E.timestamp))}</td>
    </tr>
    <tr class="${T.detailRow}" data-detail-for="${n(N)}" style="display:${O}">
      <td colspan="5">${D}</td>
    </tr>
  `;
}
function XE(E, e, T = {}) {
  const { newestFirst: R = !0, slowThresholdMs: A = 50, maxEntries: r, showSortToggle: s = !1, truncatePath: S = !0, maxPathLength: L = 50 } = T, N = s ? gI("requests", R, e) : "";
  if (!E.length) return N + `<div class="${e.emptyState}">No requests captured</div>`;
  const t = r ? Math.max(0, E.length - r) : 0;
  let C = (r ? E.slice(-r) : E).map((M, m) => ({
    entry: M,
    originalIndex: t + m
  }));
  R && (C = [...C].reverse());
  const _ = C.map(({ entry: M, originalIndex: m }) => yI(M, m, e, {
    ...T,
    slowThresholdMs: A,
    truncatePath: S,
    maxPathLength: L
  })).join("");
  return `
    ${N}
    <table class="${e.table}" data-request-table>
      <thead>
        <tr>
          <th>Method</th>
          <th>Path</th>
          <th>Status</th>
          <th>Duration</th>
          <th>Time</th>
        </tr>
      </thead>
      <tbody>${_}</tbody>
    </table>
  `;
}
function bI(E, e, T) {
  return `
    <div class="${T.panelControls}">
      <label class="${T.sortToggle}">
        <input type="checkbox" data-sort-toggle="${E}" ${e ? "checked" : ""}>
        <span>Newest first</span>
      </label>
    </div>
  `;
}
function vI(E) {
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
function VI(E, e, T) {
  return e ? `
      <button class="${E.copyBtnSm}" data-copy-trigger="${T}" title="Copy SQL">
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
function xI(E, e, T, R) {
  const A = zE(E.duration, R.slowThresholdMs), r = A.isSlow, s = !!E.error, S = `sql-row-${e}`, L = E.query || "", N = FI(L, !0), t = [T.expandableRow];
  r && t.push(T.slowQuery), s && t.push(T.errorQuery);
  const C = r ? T.durationSlow : "", _ = VI(T, R.useIconCopyButton || !1, S);
  return `
    <tr class="${t.join(" ")}" data-row-id="${S}">
      <td class="${T.selectCell}"><input type="checkbox" class="sql-select-row" data-sql-index="${e}"></td>
      <td class="${T.duration} ${C}">${A.text}</td>
      <td>${n(b(E.row_count ?? "-"))}</td>
      <td class="${T.timestamp}">${n(X(E.timestamp))}</td>
      <td>${s ? `<span class="${T.badgeError}">Error</span>` : ""}</td>
      <td class="${T.queryText}"><span class="${T.expandIcon}">&#9654;</span>${n(L)}</td>
    </tr>
    <tr class="${T.expansionRow}" data-expansion-for="${S}">
      <td colspan="6">
        <div class="${T.expandedContent}" data-copy-content="${n(L)}">
          <div class="${T.expandedContentHeader}">
            ${_}
          </div>
          <pre>${N}</pre>
        </div>
      </td>
    </tr>
  `;
}
function $E(E, e, T = {}) {
  const { newestFirst: R = !0, slowThresholdMs: A = 50, maxEntries: r = 50, showSortToggle: s = !1, useIconCopyButton: S = !1 } = T, L = s ? bI("sql", R, e) : "", N = vI(e);
  if (!E.length) return L + `<div class="${e.emptyState}">No SQL queries captured</div>`;
  let t = r ? E.slice(-r) : E;
  R && (t = [...t].reverse());
  const C = t.map((_, M) => xI(_, M, e, {
    ...T,
    slowThresholdMs: A,
    useIconCopyButton: S
  })).join("");
  return `
    ${L}
    ${N}
    <table class="${e.table}">
      <thead>
        <tr>
          <th class="${e.selectCell}"><input type="checkbox" class="sql-select-all"></th>
          <th>Duration</th>
          <th>Rows</th>
          <th>Time</th>
          <th>Status</th>
          <th>Query</th>
        </tr>
      </thead>
      <tbody>${C}</tbody>
    </table>
  `;
}
function WI(E, e, T) {
  return `
    <div class="${T.panelControls}">
      <label class="${T.sortToggle}">
        <input type="checkbox" data-sort-toggle="${E}" ${e ? "checked" : ""}>
        <span>Newest first</span>
      </label>
    </div>
  `;
}
function XI(E, e, T) {
  const R = E.level || "INFO", A = String(R).toUpperCase(), r = we(String(R)), s = E.message || "", S = E.source || "", L = e.badgeLevel(r), N = r === "error" ? e.rowError : "", t = T.truncateMessage ? oE(s, T.maxMessageLength || 100) : s, C = T.showSource ? `<td class="${e.timestamp}">${n(S)}</td>` : "";
  return `
    <tr class="${N}">
      <td><span class="${L}">${n(A)}</span></td>
      <td class="${e.timestamp}">${n(X(E.timestamp))}</td>
      <td class="${e.message}" title="${n(s)}">${n(t)}</td>
      ${C}
    </tr>
  `;
}
function KE(E, e, T = {}) {
  const { newestFirst: R = !0, maxEntries: A = 100, showSortToggle: r = !1, showSource: s = !1, truncateMessage: S = !0, maxMessageLength: L = 100 } = T, N = r ? WI("logs", R, e) : "";
  if (!E.length) return N + `<div class="${e.emptyState}">No logs captured</div>`;
  let t = A ? E.slice(-A) : E;
  R && (t = [...t].reverse());
  const C = t.map((M) => XI(M, e, {
    ...T,
    showSource: s,
    truncateMessage: S,
    maxMessageLength: L
  })).join(""), _ = s ? "<th>Source</th>" : "";
  return `
    ${N}
    <table class="${e.table}">
      <thead>
        <tr>
          <th>Level</th>
          <th>Time</th>
          <th>Message</th>
          ${_}
        </tr>
      </thead>
      <tbody>${C}</tbody>
    </table>
  `;
}
function $I(E, e, T) {
  const R = E.method || "GET", A = E.path || "", r = E.handler || "-", s = E.name || "", S = e.badgeMethod(R), L = T.showName ? `<td class="${e.timestamp}">${n(s)}</td>` : "";
  return `
    <tr>
      <td><span class="${S}">${n(R)}</span></td>
      <td class="${e.path}">${n(A)}</td>
      <td>${n(r)}</td>
      ${L}
    </tr>
  `;
}
function wE(E, e, T = {}) {
  const { showName: R = !1 } = T;
  if (!E.length) return `<div class="${e.emptyState}">No routes available</div>`;
  const A = E.map((s) => $I(s, e, { showName: R })).join(""), r = R ? "<th>Name</th>" : "";
  return `
    <table class="${e.tableRoutes || e.table}">
      <thead>
        <tr>
          <th>Method</th>
          <th>Path</th>
          <th>Handler</th>
          ${r}
        </tr>
      </thead>
      <tbody>${A}</tbody>
    </table>
  `;
}
function OT(E, e, T) {
  return e ? `
      <button class="${E.copyBtn}" data-copy-trigger="${T}" title="Copy to clipboard">
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
function K(E, e, T, R = {}) {
  const { useIconCopyButton: A = !1, filterFn: r, showCount: s = !0 } = R, S = e && typeof e == "object" && !Array.isArray(e), L = Array.isArray(e);
  let N = e ?? {};
  if (S && r && (N = r(e)), S && Object.keys(N).length === 0 || L && N.length === 0 || !S && !L && !N) return `<div class="${T.emptyState}">No ${E.toLowerCase()} data available</div>`;
  const t = eE(N), C = tE(N, !0), _ = Je(N), M = L ? "items" : S ? "keys" : "entries", m = OT(T, A, `copy-${E.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`), U = s ? `<span class="${T.muted}">${b(_)} ${M}</span>` : "";
  return `
    <section class="${T.jsonPanel}" data-copy-content="${n(t)}">
      <div class="${T.jsonHeader}">
        <span class="${T.jsonViewerTitle}">${n(E)}</span>
        <div class="${T.jsonActions}">
          ${U}
          ${m}
        </div>
      </div>
      <pre>${C}</pre>
    </section>
  `;
}
function rO(E, e, T = {}) {
  const { useIconCopyButton: R = !1 } = T;
  if (!E || typeof E == "object" && Object.keys(E).length === 0) return "";
  const A = eE(E), r = tE(E, !0), s = OT(e, R, `viewer-${Date.now()}`);
  return `
    <div class="${e.jsonViewer}" data-copy-content="${n(A)}">
      <div class="${e.jsonViewerHeader}">
        ${s}
      </div>
      <pre>${r}</pre>
    </div>
  `;
}
function KI(E, e) {
  return e ? `
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
function wI(E, e) {
  return `
    <tr>
      <td><span class="${e.badgeCustom}">${n(E.category || "custom")}</span></td>
      <td class="${e.timestamp}">${n(X(E.timestamp))}</td>
      <td class="${e.message}">${n(E.message || "")}</td>
    </tr>
  `;
}
function JI(E, e, T) {
  const { useIconCopyButton: R = !1, showCount: A = !0 } = T, r = eE(E), s = tE(E, !0), S = KI(e, R), L = A ? `<span class="${e.muted}">${b(Je(E))} keys</span>` : "";
  return `
    <div class="${e.jsonPanel}" data-copy-content="${n(r)}">
      <div class="${e.jsonHeader}">
        <span class="${e.jsonViewerTitle}">Custom Data</span>
        <div class="${e.jsonActions}">
          ${L}
          ${S}
        </div>
      </div>
      <div class="${e.jsonContent}">
        <pre>${s}</pre>
      </div>
    </div>
  `;
}
function kI(E, e, T) {
  const { maxLogEntries: R = 50 } = T;
  if (!E.length) return `<div class="${e.emptyState}">No custom logs yet.</div>`;
  const A = E.slice(-R).reverse().map((r) => wI(r, e)).join("");
  return `
    <table class="${e.table}">
      <thead>
        <tr>
          <th>Category</th>
          <th>Time</th>
          <th>Message</th>
        </tr>
      </thead>
      <tbody>${A}</tbody>
    </table>
  `;
}
function JE(E, e, T = {}) {
  const { dataFilterFn: R } = T, A = E.data || {}, r = R ? R(A) : A, s = E.logs || [], S = Object.keys(r).length > 0, L = s.length > 0;
  if (!S && !L) return `<div class="${e.emptyState}">No custom data captured</div>`;
  let N = "";
  return S && (N += JI(r, e, T)), L && (N += `
      <div class="${e.jsonPanel}">
        <div class="${e.jsonHeader}">
          <span class="${e.jsonViewerTitle}">Custom Logs</span>
          <span class="${e.muted}">${b(s.length)} entries</span>
        </div>
        <div class="${e.jsonContent}">
          ${kI(s, e, T)}
        </div>
      </div>
    `), S && L ? `<div class="${e.jsonGrid}">${N}</div>` : N;
}
function qI(E) {
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
function QI(E) {
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
function ZI(E, e, T) {
  const R = QI(E.type), A = qI(E.type), r = e.badgeLevel(A), s = E.message || "", S = E.source || "", L = !!E.stack, N = E.type === "network_error" && E.extra?.request_url ? String(E.extra.request_url) : S && E.line ? `${S}:${E.line}${E.column ? ":" + E.column : ""}` : S || "", t = L ? `<span class="${e.expandIcon}">&#9654;</span>` : "", C = L ? e.expandableRow : "", _ = T.compact ? n(s.length > 100 ? s.slice(0, 100) + "..." : s) : n(s), M = !T.compact && N ? `<td class="${e.timestamp}" title="${n(N)}">${n(N.length > 60 ? "..." + N.slice(-57) : N)}</td>` : "", m = !T.compact && E.url ? `<td class="${e.timestamp}" title="${n(E.url)}">${n(E.url.length > 40 ? "..." + E.url.slice(-37) : E.url)}</td>` : "";
  let U = "";
  return L && (U = `
      <tr class="${e.expansionRow}">
        <td colspan="${T.compact ? 3 : 5}">
          <div class="${e.expandedContent}">
            <pre style="margin:0;white-space:pre-wrap;word-break:break-all;font-size:0.8em;opacity:0.85">${n(E.stack)}</pre>
          </div>
        </td>
      </tr>
    `), `
    <tr class="${e.rowError} ${C}">
      <td>${t}<span class="${r}">${n(R)}</span></td>
      <td class="${e.timestamp}">${n(X(E.timestamp))}</td>
      <td class="${e.message}" title="${n(s)}">${_}</td>
      ${M}
      ${m}
    </tr>
    ${U}
  `;
}
function zI(E, e) {
  return `
    <div class="${e.panelControls}">
      <label class="${e.sortToggle}">
        <input type="checkbox" data-sort-toggle="jserrors" ${E ? "checked" : ""}>
        <span>Newest first</span>
      </label>
    </div>
  `;
}
function kE(E, e, T = {}) {
  const { newestFirst: R = !0, maxEntries: A = 100, compact: r = !1, showSortToggle: s = !1 } = T, S = s ? zI(R, e) : "";
  if (!E.length) return S + `<div class="${e.emptyState}">No JS errors captured</div>`;
  let L = A ? E.slice(-A) : E;
  R && (L = [...L].reverse());
  const N = L.map((_) => ZI(_, e, {
    ...T,
    compact: r
  })).join(""), t = r ? "" : "<th>Location</th>", C = r ? "" : "<th>Page</th>";
  return `
    ${S}
    <table class="${e.table}">
      <thead>
        <tr>
          <th>Type</th>
          <th>Time</th>
          <th>Message</th>
          ${t}
          ${C}
        </tr>
      </thead>
      <tbody>${N}</tbody>
    </table>
  `;
}
function Ee(E) {
  switch (E) {
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
function jI(E) {
  switch (E) {
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
function Er(E) {
  const e = Ee(E.verdict), T = E.user_info || {};
  let R = "";
  return (T.username || T.user_id) && (R = `
      <div style="display: flex; gap: 12px; font-size: 12px; color: #94a3b8; margin-top: 8px;">
        ${T.username ? `<span>User: <strong style="color: #e2e8f0;">${n(T.username)}</strong></span>` : ""}
        ${T.role ? `<span>Role: <strong style="color: #e2e8f0;">${n(T.role)}</strong></span>` : ""}
        ${T.tenant_id ? `<span>Tenant: <strong style="color: #e2e8f0;">${n(T.tenant_id)}</strong></span>` : ""}
        ${T.org_id ? `<span>Org: <strong style="color: #e2e8f0;">${n(T.org_id)}</strong></span>` : ""}
      </div>
    `), `
    <div style="
      background: ${e.bgColor};
      border: 1px solid ${e.color}40;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 16px;
    ">
      <div style="display: flex; align-items: center; gap: 12px;">
        <span style="
          font-size: 24px;
          color: ${e.color};
        ">${e.icon}</span>
        <div>
          <div style="
            font-size: 18px;
            font-weight: 600;
            color: ${e.color};
          ">${e.label}</div>
        </div>
      </div>
      ${R}
    </div>
  `;
}
function er(E) {
  const e = E.summary || {
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
      value: e.module_count,
      color: "#3b82f6"
    },
    {
      label: "Required",
      value: e.required_keys,
      color: "#8b5cf6"
    },
    {
      label: "Resolved",
      value: e.claims_keys,
      color: "#22c55e"
    },
    {
      label: "Missing",
      value: e.missing_keys,
      color: e.missing_keys > 0 ? "#ef4444" : "#6b7280"
    }
  ].map((T) => `
        <div style="
          background: ${T.color}20;
          border: 1px solid ${T.color}40;
          border-radius: 6px;
          padding: 8px 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          min-width: 80px;
        ">
          <span style="font-size: 20px; font-weight: 700; color: ${T.color};">${T.value}</span>
          <span style="font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">${T.label}</span>
        </div>
      `).join("")}
    </div>
  `;
}
function Tr(E, e) {
  const T = jI(E.status), R = (A) => A ? '<span style="color: #22c55e; font-weight: bold;">✓</span>' : '<span style="color: #ef4444; font-weight: bold;">✗</span>';
  return `
    <tr style="border-bottom: 1px solid #334155;">
      <td style="padding: 10px 12px; font-family: monospace; font-size: 12px; color: #e2e8f0;">
        ${n(E.permission)}
        ${E.module ? `<span style="color: #64748b; font-size: 10px; margin-left: 8px;">(${n(E.module)})</span>` : ""}
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
          background: ${T.bgColor};
          color: ${T.color};
        ">${n(E.diagnosis)}</span>
      </td>
    </tr>
  `;
}
function Rr(E) {
  const e = E.entries || [];
  return e.length === 0 ? `
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
            ${e.map((T, R) => Tr(T, R)).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}
function Ar(E) {
  const e = E.next_actions || [];
  return e.length === 0 ? "" : `
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
        <span style="color: ${Ee(E.verdict).color};">Next Actions</span>
      </h3>
      <ul style="
        margin: 0;
        padding: 0 0 0 20px;
        color: #cbd5e1;
        font-size: 13px;
        line-height: 1.6;
      ">
        ${e.map((T) => T.startsWith("  -") ? `<li style="margin-left: 20px; color: #94a3b8;">${n(T.trim().slice(2))}</li>` : `<li>${n(T)}</li>`).join("")}
      </ul>
    </div>
  `;
}
function tr(E) {
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
        ">${n(eE(E))}</pre>
      </div>
    </details>
  `;
}
function ve(E, e, T = {}) {
  const { showRawJSON: R = !0, showCollapsible: A = !0 } = T;
  return E ? `
    <div style="padding: 8px;">
      ${Er(E)}
      ${er(E)}
      ${Rr(E)}
      ${Ar(E)}
      ${R ? tr(E) : ""}
    </div>
  ` : `<div class="${e.emptyState}">No permissions data available</div>`;
}
function Sr(E, e) {
  if (!E) return `<div class="${e.emptyState}">No permissions data</div>`;
  const T = Ee(E.verdict), R = E.summary || {
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
          color: ${T.color};
        ">${T.icon}</span>
        <span style="
          font-size: 14px;
          font-weight: 600;
          color: ${T.color};
        ">${T.label}</span>
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
function ee(E) {
  switch ((E || "").toLowerCase()) {
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
function Ir(E) {
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
function rr(E) {
  const e = ee(E.verdict), T = Ir(E.verdict);
  return `
    <div style="
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 16px;
      background: ${e.bgColor};
      border: 1px solid ${e.borderColor};
      border-radius: 8px;
    ">
      <span style="
        font-size: 24px;
        color: ${e.color};
        line-height: 1;
      ">${e.icon}</span>
      <div>
        <div style="
          font-size: 16px;
          font-weight: 600;
          color: ${e.color};
        ">${n(T)}</div>
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
function Or(E) {
  const e = E || {
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
      value: e.checks || 0,
      color: "#64748b"
    },
    {
      label: "OK",
      value: e.ok || 0,
      color: "#22c55e"
    },
    {
      label: "Info",
      value: e.info || 0,
      color: "#3b82f6"
    },
    {
      label: "Warn",
      value: e.warn || 0,
      color: e.warn ? "#f59e0b" : "#64748b"
    },
    {
      label: "Error",
      value: e.error || 0,
      color: e.error ? "#ef4444" : "#64748b"
    }
  ].map((T) => `
        <div style="
          background: ${T.color}15;
          border: 1px solid ${T.color}30;
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
            color: ${T.color};
            line-height: 1.2;
          ">${T.value}</span>
          <span style="
            font-size: 10px;
            color: #94a3b8;
            text-transform: uppercase;
            letter-spacing: 0.3px;
          ">${T.label}</span>
        </div>
      `).join("")}
    </div>
  `;
}
function Nr(E) {
  const e = E.generated_at ? new Date(E.generated_at).toLocaleString() : "";
  return `
    <div style="
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    ">
      ${rr(E)}
      <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 8px;">
        ${Or(E.summary)}
        ${e ? `<span style="font-size: 11px; color: #64748b;">Generated: ${n(e)}</span>` : ""}
      </div>
    </div>
  `;
}
function sr(E) {
  const e = ee(E.severity), T = String(E.message || "").trim(), R = String(E.hint || "").trim(), A = String(E.code || "").trim(), r = String(E.component || "").trim();
  if (!T) return "";
  const s = [A, r].filter(Boolean).join(" • ");
  return `
    <div style="
      display: flex;
      gap: 10px;
      padding: 10px 12px;
      background: ${e.bgColor};
      border-left: 3px solid ${e.color};
      border-radius: 0 6px 6px 0;
      margin-bottom: 8px;
    ">
      <span style="
        font-size: 14px;
        color: ${e.color};
        line-height: 1.4;
      ">${e.icon}</span>
      <div style="flex: 1; min-width: 0;">
        <div style="
          font-size: 13px;
          color: #e2e8f0;
          line-height: 1.4;
          word-break: break-word;
        ">${n(T)}</div>
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
            <span>${n(R)}</span>
          </div>
        ` : ""}
        ${s ? `
          <div style="
            margin-top: 4px;
            font-size: 11px;
            color: #64748b;
            font-family: monospace;
          ">${n(s)}</div>
        ` : ""}
      </div>
    </div>
  `;
}
function ar(E) {
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
      ${E.map((e) => sr(e)).join("")}
    </div>
  `;
}
function nr(E, e) {
  if (!e) return "";
  const T = String(e.description || "").trim(), R = String(e.cta || e.label || "").trim(), A = !!e.runnable, r = !!e.applicable, s = !!e.requires_confirmation, S = String(e.confirm_text || "").trim(), L = e.kind || "manual";
  let N = "enabled", t = "";
  r ? A || (N = "manual", t = L === "manual" ? "Manual action required" : "Action not available") : (N = "not-applicable", t = "Not applicable for current status");
  const C = N !== "enabled", _ = C ? "background: #374151; color: #6b7280; cursor: not-allowed;" : "background: #3b82f6; color: #fff; cursor: pointer;";
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
      ${T ? `
        <div style="
          font-size: 13px;
          color: #cbd5e1;
          line-height: 1.5;
          margin-bottom: 12px;
        ">${n(T)}</div>
      ` : ""}
      <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
        ${R ? `
          <button
            type="button"
            class="debug-btn"
            data-doctor-action-run="${n(E)}"
            ${S ? `data-doctor-action-confirm="${n(S)}"` : ""}
            ${s ? 'data-doctor-action-requires-confirmation="true"' : ""}
            ${C ? "disabled" : ""}
            style="
              padding: 8px 16px;
              border: none;
              border-radius: 6px;
              font-size: 13px;
              font-weight: 500;
              ${_}
            "
          >${n(R)}</button>
        ` : ""}
        ${t ? `
          <span style="
            font-size: 12px;
            color: #64748b;
            font-style: italic;
          ">${n(t)}</span>
        ` : ""}
      </div>
    </div>
  `;
}
function or(E) {
  return E == null ? '<span style="color: #64748b; font-style: italic;">null</span>' : typeof E == "boolean" ? `<span style="color: ${E ? "#22c55e" : "#ef4444"}; font-weight: 500;">${E}</span>` : typeof E == "number" ? `<span style="color: #818cf8;">${E}</span>` : typeof E == "string" ? `<span style="color: #fbbf24;">"${n(E)}"</span>` : typeof E == "object" ? `<span style="color: #94a3b8;">${n(JSON.stringify(E))}</span>` : n(String(E));
}
function ir(E) {
  if (!E || Object.keys(E).length === 0) return "";
  const e = Object.entries(E).map(([T, R]) => `
      <tr>
        <td style="
          padding: 4px 8px 4px 0;
          color: #94a3b8;
          font-size: 12px;
          vertical-align: top;
          white-space: nowrap;
        ">${n(T)}:</td>
        <td style="
          padding: 4px 0;
          font-family: monospace;
          font-size: 11px;
          word-break: break-all;
        ">${or(R)}</td>
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
          <tbody>${e}</tbody>
        </table>
      </div>
    </details>
  `;
}
function Cr(E) {
  const e = ee(E.status), T = String(E.label || E.id || "").trim(), R = String(E.summary || "").trim(), A = String(E.help || E.description || "").trim(), r = E.duration_ms !== void 0 ? `${E.duration_ms}ms` : "";
  return `
    <div style="
      border: 1px solid ${e.borderColor};
      border-left: 4px solid ${e.color};
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
        background: ${e.bgColor};
        border-bottom: 1px solid ${e.borderColor};
      ">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: ${e.color};
            color: #fff;
            border-radius: 50%;
            font-size: 12px;
            font-weight: 600;
          ">${e.icon}</span>
          <div>
            <div style="
              font-size: 14px;
              font-weight: 600;
              color: #e2e8f0;
            ">${n(T)}</div>
            <div style="
              font-size: 11px;
              color: #64748b;
              font-family: monospace;
            ">${n(E.id || "")}</div>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 12px;">
          ${r ? `
            <span style="
              font-size: 11px;
              color: #64748b;
              font-family: monospace;
            ">${n(r)}</span>
          ` : ""}
          <span style="
            padding: 4px 10px;
            border-radius: 999px;
            font-size: 11px;
            font-weight: 600;
            color: ${e.color};
            background: ${e.bgColor};
            border: 1px solid ${e.borderColor};
          ">${n(e.label)}</span>
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
          ">${n(R)}</div>
        ` : ""}

        <!-- Help Section -->
        ${A ? `
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
            ">${n(A)}</div>
          </details>
        ` : ""}

        <!-- Findings -->
        ${ar(E.findings)}

        <!-- Action -->
        ${nr(E.id, E.action)}

        <!-- Metadata -->
        ${ir(E.metadata)}
      </div>
    </div>
  `;
}
function Lr(E) {
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
        ${E.map((e) => `<li style="margin-bottom: 4px;">${n(e)}</li>`).join("")}
      </ol>
    </div>
  `;
}
function _r(E) {
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
        ">${n(eE(E))}</pre>
      </div>
    </details>
  `;
}
function Ve(E, e, T = {}) {
  const { showRawJSON: R = !0, problemsOnly: A = !1 } = T;
  if (!E) return `<div class="${e.emptyState}">No doctor diagnostics available</div>`;
  let r = E.checks || [];
  A && (r = r.filter((N) => N.status === "warn" || N.status === "error"));
  const s = {
    error: 0,
    warn: 1,
    info: 2,
    ok: 3
  };
  r = [...r].sort((N, t) => {
    const C = s[N.status || "ok"] ?? 4, _ = s[t.status || "ok"] ?? 4;
    return C !== _ ? C - _ : (N.label || N.id || "").localeCompare(t.label || t.id || "");
  });
  const S = r.some((N) => N.status === "warn" || N.status === "error");
  let L = "";
  return r.length === 0 ? A && !S ? L = `
        <div style="
          text-align: center;
          padding: 40px 20px;
          color: #22c55e;
        ">
          <div style="font-size: 48px; margin-bottom: 12px;">✓</div>
          <div style="font-size: 18px; font-weight: 600; margin-bottom: 8px;">All Systems Healthy</div>
          <div style="font-size: 14px; color: #94a3b8;">${E.summary?.checks || 0} checks passed</div>
        </div>
      ` : L = `<div class="${e.emptyState}">No doctor checks available</div>` : L = r.map((N) => Cr(N)).join(""), `
    <div style="padding: 12px;">
      ${Nr(E)}
      ${L}
      ${Lr(E.next_actions)}
      ${R ? _r(E) : ""}
    </div>
  `;
}
function NT(E) {
  const e = (E || "").toLowerCase();
  return e === "healthy" || e === "active" ? {
    label: "Healthy",
    color: "#22c55e",
    bgColor: "rgba(34, 197, 94, 0.1)",
    borderColor: "rgba(34, 197, 94, 0.4)",
    icon: "✓"
  } : e === "degraded" || e === "warn" ? {
    label: "Degraded",
    color: "#f59e0b",
    bgColor: "rgba(245, 158, 11, 0.1)",
    borderColor: "rgba(245, 158, 11, 0.4)",
    icon: "⚠"
  } : e === "error" || e === "startup_error" ? {
    label: "Error",
    color: "#ef4444",
    bgColor: "rgba(239, 68, 68, 0.1)",
    borderColor: "rgba(239, 68, 68, 0.4)",
    icon: "✗"
  } : e === "inactive" || e === "disabled" ? {
    label: "Inactive",
    color: "#64748b",
    bgColor: "rgba(100, 116, 139, 0.1)",
    borderColor: "rgba(100, 116, 139, 0.4)",
    icon: "○"
  } : {
    label: E || "Unknown",
    color: "#94a3b8",
    bgColor: "rgba(148, 163, 184, 0.1)",
    borderColor: "rgba(148, 163, 184, 0.4)",
    icon: "?"
  };
}
function sT(E) {
  const e = (E || "").toLowerCase();
  return e === "success" || e === "ok" ? {
    label: "Success",
    color: "#22c55e",
    bgColor: "rgba(34, 197, 94, 0.1)",
    borderColor: "rgba(34, 197, 94, 0.4)",
    icon: "✓"
  } : e === "failed" || e === "error" ? {
    label: "Failed",
    color: "#ef4444",
    bgColor: "rgba(239, 68, 68, 0.1)",
    borderColor: "rgba(239, 68, 68, 0.4)",
    icon: "✗"
  } : e === "unsupported" || e === "none" ? {
    label: "Unsupported",
    color: "#f59e0b",
    bgColor: "rgba(245, 158, 11, 0.1)",
    borderColor: "rgba(245, 158, 11, 0.4)",
    icon: "⚠"
  } : {
    label: E || "Unknown",
    color: "#94a3b8",
    bgColor: "rgba(148, 163, 184, 0.1)",
    borderColor: "rgba(148, 163, 184, 0.4)",
    icon: "?"
  };
}
function lr(E) {
  const e = NT(E.status);
  let T = e.label;
  return E.configured ? E.active || (T = "Inactive") : T = "Not Configured", `
    <div style="
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 16px;
      background: ${e.bgColor};
      border: 1px solid ${e.borderColor};
      border-radius: 8px;
    ">
      <span style="
        font-size: 24px;
        color: ${e.color};
        line-height: 1;
      ">${e.icon}</span>
      <div>
        <div style="
          font-size: 16px;
          font-weight: 600;
          color: ${e.color};
        ">${n(T)}</div>
        <div style="
          font-size: 11px;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        ">Site Render Cache</div>
      </div>
    </div>
  `;
}
function Dr(E) {
  const e = E.backend || "none", T = E.scope || "unknown", R = T === "process_local";
  return `
    <div style="
      display: flex;
      flex-direction: column;
      gap: 4px;
      text-align: right;
    ">
      <div style="
        font-size: 13px;
        color: #e2e8f0;
      ">
        <span style="color: #64748b;">Backend:</span>
        <span style="
          margin-left: 6px;
          padding: 2px 8px;
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 4px;
          font-family: monospace;
        ">${n(e)}</span>
      </div>
      <div style="
        font-size: 12px;
        color: ${R ? "#f59e0b" : "#94a3b8"};
        ${R ? "font-weight: 500;" : ""}
      ">
        ${R ? "⚠ " : ""}Scope: ${n(T)}
      </div>
      ${E.observed_by ? `
        <div style="font-size: 11px; color: #64748b;">
          Observer: ${n(E.observed_by)}
        </div>
      ` : ""}
    </div>
  `;
}
function Pr() {
  return `
    <button
      type="button"
      class="debug-btn"
      data-debug-action="clear-panel"
      style="
        padding: 8px 16px;
        background: #dc2626;
        color: #fff;
        border: none;
        border-radius: 6px;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 6px;
      "
    >
      <span>↻</span> Clear Cache
    </button>
  `;
}
function xe(E) {
  return `
    <div style="
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    ">
      <div style="display: flex; align-items: center; gap: 12px;">
        ${lr(E)}
        ${E.active ? Pr() : ""}
      </div>
      ${Dr(E)}
    </div>
  `;
}
function Mr(E) {
  const e = E || {}, T = e.lookups || 0, R = e.hits || 0, A = e.misses || 0, r = e.writes || 0, s = e.errors || 0, S = e.clears || 0;
  let L = "N/A";
  return T > 0 && (L = `${((e.hit_ratio !== null && e.hit_ratio !== void 0 ? e.hit_ratio : R / T) * 100).toFixed(1)}%`), `
    <div style="
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
      gap: 8px;
      margin-bottom: 20px;
    ">
      ${[
    {
      label: "Lookups",
      value: b(T),
      color: "#64748b"
    },
    {
      label: "Hits",
      value: b(R),
      color: "#22c55e"
    },
    {
      label: "Misses",
      value: b(A),
      color: "#f59e0b"
    },
    {
      label: "Writes",
      value: b(r),
      color: "#3b82f6"
    },
    {
      label: "Errors",
      value: b(s),
      color: s > 0 ? "#ef4444" : "#64748b"
    },
    {
      label: "Clears",
      value: b(S),
      color: "#8b5cf6"
    },
    {
      label: "Hit Rate",
      value: L,
      color: T > 0 ? "#22c55e" : "#64748b"
    }
  ].map((N) => `
        <div style="
          background: ${N.color}15;
          border: 1px solid ${N.color}30;
          border-radius: 6px;
          padding: 10px 12px;
          text-align: center;
        ">
          <div style="
            font-size: 18px;
            font-weight: 700;
            color: ${N.color};
            line-height: 1.2;
          ">${N.value}</div>
          <div style="
            font-size: 10px;
            color: #94a3b8;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            margin-top: 2px;
          ">${N.label}</div>
        </div>
      `).join("")}
    </div>
  `;
}
function Ur(E) {
  if (!E) return "";
  const e = sT(E.outcome), T = E.timestamp ? X(E.timestamp) : "";
  return `
    <div style="
      margin-bottom: 16px;
      padding: 12px 16px;
      background: ${e.bgColor};
      border: 1px solid ${e.borderColor};
      border-left: 4px solid ${e.color};
      border-radius: 0 8px 8px 0;
    ">
      <div style="
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      ">
        <div style="
          font-size: 12px;
          font-weight: 600;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        ">Last Command</div>
        <span style="
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
          color: ${e.color};
          background: ${e.bgColor};
          border: 1px solid ${e.borderColor};
        ">${n(e.label)}</span>
      </div>
      <div style="
        display: flex;
        gap: 16px;
        flex-wrap: wrap;
        font-size: 13px;
        color: #cbd5e1;
      ">
        <span><strong>Command:</strong> ${n(E.command || "unknown")}</span>
        <span><strong>Mode:</strong> ${n(E.mode || "none")}</span>
        ${E.target_count !== void 0 ? `<span><strong>Targets:</strong> ${E.target_count}</span>` : ""}
        ${T ? `<span style="color: #64748b;">${n(T)}</span>` : ""}
      </div>
      ${E.message ? `
        <div style="
          margin-top: 8px;
          font-size: 12px;
          color: #94a3b8;
          font-style: italic;
        ">${n(E.message)}</div>
      ` : ""}
    </div>
  `;
}
function dr(E) {
  return E ? `
    <div style="
      margin-bottom: 16px;
      padding: 12px 16px;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.4);
      border-left: 4px solid #ef4444;
      border-radius: 0 8px 8px 0;
    ">
      <div style="
        font-size: 12px;
        font-weight: 600;
        color: #ef4444;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 8px;
      ">Startup Error</div>
      <div style="
        font-size: 13px;
        color: #fca5a5;
        line-height: 1.5;
      ">${n(E.message || "Unknown error")}</div>
      <div style="
        margin-top: 8px;
        display: flex;
        gap: 16px;
        font-size: 12px;
        color: #94a3b8;
      ">
        ${E.backend ? `<span><strong>Backend:</strong> ${n(E.backend)}</span>` : ""}
        ${E.error_kind ? `<span><strong>Kind:</strong> ${n(E.error_kind)}</span>` : ""}
        ${E.fail_closed !== void 0 ? `<span><strong>Fail Closed:</strong> ${E.fail_closed ? "Yes" : "No"}</span>` : ""}
      </div>
    </div>
  ` : "";
}
function pr(E) {
  return `
    <tr style="border-bottom: 1px solid #1e293b;">
      <td style="padding: 8px; color: #64748b; font-size: 11px; white-space: nowrap;">${n(E.timestamp ? X(E.timestamp) : "")}</td>
      <td style="padding: 8px;">
        <span style="
          padding: 2px 6px;
          background: rgba(239, 68, 68, 0.15);
          border-radius: 4px;
          font-size: 11px;
          color: #f87171;
        ">${n(E.operation || "unknown")}</span>
      </td>
      <td style="padding: 8px; font-size: 12px; color: #cbd5e1;">${n(E.message || "")}</td>
      <td style="padding: 8px; font-size: 11px; color: #64748b; font-family: monospace;">
        ${E.key?.route_hint ? n(E.key.route_hint) : E.key?.key_hash ? n(E.key.key_hash.slice(0, 12)) : ""}
      </td>
    </tr>
  `;
}
function ur(E, e = 10) {
  const T = E || [];
  if (T.length === 0) return "";
  const R = T.slice(-e).reverse();
  return `
    <div style="margin-bottom: 16px;">
      <div style="
        font-size: 12px;
        font-weight: 600;
        color: #ef4444;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 8px;
        display: flex;
        align-items: center;
        gap: 6px;
      ">
        <span>⚠</span> Recent Errors (${T.length})
      </div>
      <div style="
        background: #0f172a;
        border: 1px solid #1e293b;
        border-radius: 6px;
        overflow: hidden;
      ">
        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
          <thead>
            <tr style="background: #1e293b;">
              <th style="padding: 8px; text-align: left; color: #94a3b8; font-weight: 500;">Time</th>
              <th style="padding: 8px; text-align: left; color: #94a3b8; font-weight: 500;">Operation</th>
              <th style="padding: 8px; text-align: left; color: #94a3b8; font-weight: 500;">Message</th>
              <th style="padding: 8px; text-align: left; color: #94a3b8; font-weight: 500;">Key</th>
            </tr>
          </thead>
          <tbody>
            ${R.map((A) => pr(A)).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}
function We(E) {
  return E == null ? '<span style="color: #64748b; font-style: italic;">null</span>' : typeof E == "boolean" ? `<span style="color: ${E ? "#22c55e" : "#64748b"}; font-weight: 500;">${E}</span>` : typeof E == "number" ? `<span style="color: #818cf8;">${E}</span>` : typeof E == "string" ? E === "" ? '<span style="color: #64748b; font-style: italic;">empty</span>' : `<span style="color: #fbbf24;">${n(E)}</span>` : n(String(E));
}
function cr(E) {
  if (!E) return "";
  const e = [
    {
      key: "enabled",
      value: E.enabled
    },
    {
      key: "backend",
      value: E.backend
    },
    {
      key: "fresh_ttl",
      value: E.fresh_ttl
    },
    {
      key: "stale_ttl",
      value: E.stale_ttl
    },
    {
      key: "render_version",
      value: E.render_version
    },
    {
      key: "namespace",
      value: E.namespace
    },
    {
      key: "debug_headers",
      value: E.debug_headers
    },
    {
      key: "debug_keys",
      value: E.debug_keys
    },
    {
      key: "fail_closed",
      value: E.fail_closed
    }
  ].map(({ key: R, value: A }) => `
    <tr>
      <td style="padding: 4px 8px 4px 0; color: #94a3b8; font-size: 12px; white-space: nowrap;">${n(R)}:</td>
      <td style="padding: 4px 0; font-family: monospace; font-size: 11px;">${We(A)}</td>
    </tr>
  `).join("");
  let T = "";
  return E.valkey && E.backend === "valkey" && (T = `
      <div style="margin-top: 8px; padding-left: 12px; border-left: 2px solid #334155;">
        <div style="font-size: 11px; color: #64748b; margin-bottom: 4px;">Valkey</div>
        <table style="width: 100%; border-collapse: collapse;">${[
    {
      key: "address",
      value: E.valkey.address
    },
    {
      key: "namespace",
      value: E.valkey.namespace
    },
    {
      key: "db",
      value: E.valkey.db
    },
    {
      key: "tls_enabled",
      value: E.valkey.tls_enabled
    },
    {
      key: "username_set",
      value: E.valkey.username_set
    },
    {
      key: "password_set",
      value: E.valkey.password_set
    }
  ].map(({ key: R, value: A }) => `
      <tr>
        <td style="padding: 4px 8px 4px 0; color: #94a3b8; font-size: 12px; white-space: nowrap;">${n(R)}:</td>
        <td style="padding: 4px 0; font-family: monospace; font-size: 11px;">${We(A)}</td>
      </tr>
    `).join("")}</table>
      </div>
    `), `
    <details style="margin-bottom: 12px;">
      <summary style="
        cursor: pointer;
        padding: 10px 12px;
        background: #1e293b;
        border: 1px solid #334155;
        border-radius: 6px;
        color: #94a3b8;
        font-size: 12px;
        font-weight: 500;
        user-select: none;
      ">
        <span style="margin-left: 8px;">Configuration</span>
      </summary>
      <div style="
        margin-top: 4px;
        padding: 12px;
        background: #0f172a;
        border: 1px solid #1e293b;
        border-radius: 6px;
      ">
        <table style="width: 100%; border-collapse: collapse;">${e}</table>
        ${T}
      </div>
    </details>
  `;
}
function Gr(E) {
  return E ? `
    <details style="margin-bottom: 12px;">
      <summary style="
        cursor: pointer;
        padding: 10px 12px;
        background: #1e293b;
        border: 1px solid #334155;
        border-radius: 6px;
        color: #94a3b8;
        font-size: 12px;
        font-weight: 500;
        user-select: none;
      ">
        <span style="margin-left: 8px;">Capabilities</span>
      </summary>
      <div style="
        margin-top: 4px;
        padding: 12px;
        background: #0f172a;
        border: 1px solid #1e293b;
        border-radius: 6px;
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      ">
        ${[
    {
      key: "tag_invalidation",
      label: "Tag Invalidation",
      value: E.tag_invalidation
    },
    {
      key: "prefix_invalidation",
      label: "Prefix Invalidation",
      value: E.prefix_invalidation
    },
    {
      key: "app_wide_tag_clear_preferred",
      label: "App-Wide Clear",
      value: E.app_wide_tag_clear_preferred
    },
    {
      key: "process_local_observed_keys",
      label: "Process Local Keys",
      value: E.process_local_observed_keys
    },
    {
      key: "backend_key_scanning_enabled",
      label: "Key Scanning",
      value: E.backend_key_scanning_enabled
    }
  ].map(({ label: e, value: T }) => {
    const R = !!T, A = R ? "#22c55e" : "#64748b";
    return `
        <span style="
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          background: ${A}15;
          border: 1px solid ${A}30;
          border-radius: 4px;
          font-size: 11px;
          color: ${A};
        ">
          <span>${R ? "✓" : "✗"}</span>
          ${n(e)}
        </span>
      `;
  }).join("")}
      </div>
    </details>
  ` : "";
}
function mr(E) {
  if (!E) return "";
  const e = E.timestamp ? X(E.timestamp) : "";
  return `
    <details style="margin-bottom: 12px;">
      <summary style="
        cursor: pointer;
        padding: 10px 12px;
        background: #1e293b;
        border: 1px solid #334155;
        border-radius: 6px;
        color: #94a3b8;
        font-size: 12px;
        font-weight: 500;
        user-select: none;
      ">
        <span style="margin-left: 8px;">Latest Cached Response</span>
        <span style="
          margin-left: 8px;
          padding: 2px 6px;
          background: #3b82f615;
          border-radius: 4px;
          font-size: 10px;
          color: #60a5fa;
        ">${n(E.key?.route_hint || E.key?.key_hash?.slice(0, 16) || "unknown")}</span>
      </summary>
      <div style="
        margin-top: 4px;
        padding: 12px;
        background: #0f172a;
        border: 1px solid #1e293b;
        border-radius: 6px;
      ">
        <div style="
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 12px;
          font-size: 12px;
        ">
          <div>
            <div style="color: #64748b; margin-bottom: 2px;">Status</div>
            <div style="color: #e2e8f0; font-weight: 500;">${E.status || 0}</div>
          </div>
          <div>
            <div style="color: #64748b; margin-bottom: 2px;">Content Type</div>
            <div style="color: #e2e8f0; font-family: monospace; font-size: 11px;">${n(E.content_type || "unknown")}</div>
          </div>
          <div>
            <div style="color: #64748b; margin-bottom: 2px;">Body Size</div>
            <div style="color: #e2e8f0;">${b(E.body_size || 0)} bytes</div>
          </div>
          <div>
            <div style="color: #64748b; margin-bottom: 2px;">Headers</div>
            <div style="color: #e2e8f0;">${E.header_count || 0}</div>
          </div>
          <div>
            <div style="color: #64748b; margin-bottom: 2px;">Tags</div>
            <div style="color: #e2e8f0;">${E.tag_count || 0}</div>
          </div>
          <div>
            <div style="color: #64748b; margin-bottom: 2px;">TTL Class</div>
            <div style="color: #e2e8f0;">${n(E.ttl_class || "default")}</div>
          </div>
        </div>
        ${e ? `<div style="margin-top: 8px; font-size: 11px; color: #64748b;">Cached at: ${n(e)}</div>` : ""}
      </div>
    </details>
  `;
}
function Hr(E) {
  const e = E.observed_at ? X(E.observed_at) : "", T = E.raw_key || E.route_hint || E.key_hash?.slice(0, 16) || "unknown";
  return `
    <tr style="border-bottom: 1px solid #1e293b;">
      <td style="padding: 6px 8px; font-size: 11px; color: #64748b; white-space: nowrap;">${n(e)}</td>
      <td style="padding: 6px 8px; font-family: monospace; font-size: 11px; color: #e2e8f0; word-break: break-all;">
        ${n(T)}
        ${E.key_redacted ? '<span style="color: #64748b; font-style: italic;"> (redacted)</span>' : ""}
      </td>
      <td style="padding: 6px 8px; font-size: 11px; color: #64748b;">
        ${E.render_prefix ? '<span style="color: #8b5cf6;">render</span>' : ""}
      </td>
    </tr>
  `;
}
function Br(E, e = 20) {
  const T = E || [];
  if (T.length === 0) return "";
  const R = T.slice(-e).reverse();
  return `
    <details style="margin-bottom: 12px;">
      <summary style="
        cursor: pointer;
        padding: 10px 12px;
        background: #1e293b;
        border: 1px solid #334155;
        border-radius: 6px;
        color: #94a3b8;
        font-size: 12px;
        font-weight: 500;
        user-select: none;
      ">
        <span style="margin-left: 8px;">Observed Keys (${T.length})</span>
      </summary>
      <div style="
        margin-top: 4px;
        background: #0f172a;
        border: 1px solid #1e293b;
        border-radius: 6px;
        overflow: hidden;
        max-height: 300px;
        overflow-y: auto;
      ">
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: #1e293b; position: sticky; top: 0;">
              <th style="padding: 6px 8px; text-align: left; color: #64748b; font-weight: 500; font-size: 11px;">Time</th>
              <th style="padding: 6px 8px; text-align: left; color: #64748b; font-weight: 500; font-size: 11px;">Key</th>
              <th style="padding: 6px 8px; text-align: left; color: #64748b; font-weight: 500; font-size: 11px;">Type</th>
            </tr>
          </thead>
          <tbody>
            ${R.map((A) => Hr(A)).join("")}
          </tbody>
        </table>
      </div>
    </details>
  `;
}
function Fr(E) {
  const e = E.timestamp ? X(E.timestamp) : "", T = sT(E.outcome), R = E.key?.route_hint || E.key?.key_hash?.slice(0, 12) || "";
  return `
    <tr style="border-bottom: 1px solid #1e293b;">
      <td style="padding: 6px 8px; font-size: 11px; color: #64748b; white-space: nowrap;">${n(e)}</td>
      <td style="padding: 6px 8px;">
        <span style="
          padding: 2px 6px;
          background: #3b82f615;
          border-radius: 4px;
          font-size: 11px;
          color: #60a5fa;
        ">${n(E.operation || "unknown")}</span>
      </td>
      <td style="padding: 6px 8px;">
        <span style="
          padding: 2px 6px;
          background: ${T.bgColor};
          border-radius: 4px;
          font-size: 11px;
          color: ${T.color};
        ">${n(E.outcome || "unknown")}</span>
      </td>
      <td style="padding: 6px 8px; font-family: monospace; font-size: 10px; color: #94a3b8; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
        ${n(R)}
      </td>
      <td style="padding: 6px 8px; font-size: 11px; color: #64748b;">
        ${E.message ? n(E.message.slice(0, 50)) : ""}
      </td>
    </tr>
  `;
}
function hr(E, e = 20) {
  const T = E || [];
  if (T.length === 0) return "";
  const R = T.slice(-e).reverse();
  return `
    <details style="margin-bottom: 12px;">
      <summary style="
        cursor: pointer;
        padding: 10px 12px;
        background: #1e293b;
        border: 1px solid #334155;
        border-radius: 6px;
        color: #94a3b8;
        font-size: 12px;
        font-weight: 500;
        user-select: none;
      ">
        <span style="margin-left: 8px;">Recent Operations (${T.length})</span>
      </summary>
      <div style="
        margin-top: 4px;
        background: #0f172a;
        border: 1px solid #1e293b;
        border-radius: 6px;
        overflow: hidden;
        max-height: 300px;
        overflow-y: auto;
      ">
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: #1e293b; position: sticky; top: 0;">
              <th style="padding: 6px 8px; text-align: left; color: #64748b; font-weight: 500; font-size: 11px;">Time</th>
              <th style="padding: 6px 8px; text-align: left; color: #64748b; font-weight: 500; font-size: 11px;">Operation</th>
              <th style="padding: 6px 8px; text-align: left; color: #64748b; font-weight: 500; font-size: 11px;">Outcome</th>
              <th style="padding: 6px 8px; text-align: left; color: #64748b; font-weight: 500; font-size: 11px;">Key</th>
              <th style="padding: 6px 8px; text-align: left; color: #64748b; font-weight: 500; font-size: 11px;">Message</th>
            </tr>
          </thead>
          <tbody>
            ${R.map((A) => Fr(A)).join("")}
          </tbody>
        </table>
      </div>
    </details>
  `;
}
function Yr(E) {
  return `
    <details style="margin-top: 16px;">
      <summary style="
        cursor: pointer;
        padding: 10px 12px;
        background: #1e293b;
        border: 1px solid #334155;
        border-radius: 6px;
        color: #64748b;
        font-size: 12px;
        user-select: none;
      ">
        <span style="margin-left: 8px;">Raw JSON Data</span>
      </summary>
      <div style="
        margin-top: 4px;
        background: #0f172a;
        border: 1px solid #1e293b;
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
        ">${n(eE(E))}</pre>
      </div>
    </details>
  `;
}
function Xe(E, e, T = {}) {
  const { maxOperations: R = 20, maxKeys: A = 20, maxErrors: r = 10, showRawJSON: s = !1 } = T;
  return E ? E.configured ? `
    <div style="padding: 12px;">
      ${xe(E)}
      ${dr(E.startup_error)}
      ${Mr(E.counters)}
      ${Ur(E.last_command)}
      ${ur(E.recent_errors, r)}
      ${mr(E.latest_cached)}
      ${cr(E.config)}
      ${Gr(E.capabilities)}
      ${Br(E.observed_keys, A)}
      ${hr(E.recent_operations, R)}
      ${s ? Yr(E) : ""}
    </div>
  ` : `
      <div style="padding: 12px;">
        ${xe(E)}
        <div style="
          text-align: center;
          padding: 40px 20px;
          color: #64748b;
        ">
          <div style="font-size: 36px; margin-bottom: 12px;">○</div>
          <div style="font-size: 16px; font-weight: 500; margin-bottom: 8px; color: #94a3b8;">Cache Not Configured</div>
          <div style="font-size: 13px;">Enable site render cache in application configuration.</div>
        </div>
      </div>
    ` : `<div class="${e.emptyState}">No site render cache data available</div>`;
}
function gr(E, e) {
  if (!E) return `<div class="${e.emptyState}">No cache data</div>`;
  const T = NT(E.status), R = E.counters || {}, A = R.hits || 0, r = R.misses || 0, s = R.errors || 0;
  let S = "N/A";
  const L = R.lookups || 0;
  L > 0 && (S = `${((R.hit_ratio !== null && R.hit_ratio !== void 0 ? R.hit_ratio : A / L) * 100).toFixed(1)}%`);
  const N = (E.recent_errors || []).length;
  return `
    <div style="padding: 8px;">
      <div style="
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 10px;
      ">
        <span style="
          font-size: 18px;
          color: ${T.color};
        ">${T.icon}</span>
        <span style="
          font-size: 13px;
          font-weight: 600;
          color: ${T.color};
        ">${n(T.label)}</span>
        <span style="
          margin-left: auto;
          font-size: 11px;
          color: #64748b;
          font-family: monospace;
        ">${n(E.backend || "none")}</span>
      </div>
      <div style="
        display: flex;
        gap: 16px;
        font-size: 11px;
        color: #94a3b8;
      ">
        <span>Hit Rate: <strong style="color: ${L > 0 ? "#22c55e" : "#64748b"};">${S}</strong></span>
        <span>Hits: <strong style="color: #22c55e;">${b(A)}</strong></span>
        <span>Misses: <strong style="color: #f59e0b;">${b(r)}</strong></span>
        ${s > 0 || N > 0 ? `
          <span>Errors: <strong style="color: #ef4444;">${b(s)}</strong></span>
        ` : ""}
      </div>
      ${E.active ? `
        <div style="margin-top: 10px;">
          <button
            type="button"
            class="debug-btn"
            data-debug-action="clear-panel"
            style="
              padding: 6px 12px;
              background: #dc2626;
              color: #fff;
              border: none;
              border-radius: 4px;
              font-size: 11px;
              cursor: pointer;
            "
          >Clear Cache</button>
        </div>
      ` : ""}
    </div>
  `;
}
var fr = {
  id: "requests",
  label: "Requests",
  icon: "iconoir-network",
  snapshotKey: "requests",
  eventTypes: "request",
  category: "core",
  order: 10,
  render: (E, e, T) => XE(E || [], e, {
    ...T,
    showSortToggle: !1,
    truncatePath: !1
  }),
  renderConsole: (E, e, T) => XE(E || [], e, {
    ...T,
    showSortToggle: !1,
    truncatePath: !1
  }),
  renderToolbar: (E, e, T) => XE(E || [], e, {
    ...T,
    maxEntries: 50,
    showSortToggle: !0,
    truncatePath: !0,
    maxPathLength: 50
  }),
  getCount: (E) => (E || []).length,
  handleEvent: (E, e) => iE(E || [], e, 500),
  supportsToolbar: !0
}, yr = {
  id: "sql",
  label: "SQL",
  icon: "iconoir-database",
  snapshotKey: "sql",
  eventTypes: "sql",
  category: "core",
  order: 20,
  render: (E, e, T) => $E(E || [], e, {
    ...T,
    showSortToggle: !1,
    useIconCopyButton: !0
  }),
  renderConsole: (E, e, T) => $E(E || [], e, {
    ...T,
    maxEntries: 200,
    showSortToggle: !1,
    useIconCopyButton: !0
  }),
  renderToolbar: (E, e, T) => $E(E || [], e, {
    ...T,
    maxEntries: 50,
    showSortToggle: !0,
    useIconCopyButton: !1
  }),
  getCount: (E) => (E || []).length,
  handleEvent: (E, e) => iE(E || [], e, 500),
  supportsToolbar: !0
}, br = {
  id: "logs",
  label: "Logs",
  icon: "iconoir-page",
  snapshotKey: "logs",
  eventTypes: "log",
  category: "core",
  order: 30,
  render: (E, e, T) => KE(E || [], e, {
    ...T,
    showSortToggle: !1,
    showSource: !0,
    truncateMessage: !1
  }),
  renderConsole: (E, e, T) => KE(E || [], e, {
    ...T,
    maxEntries: 500,
    showSortToggle: !1,
    showSource: !0,
    truncateMessage: !1
  }),
  renderToolbar: (E, e, T) => KE(E || [], e, {
    newestFirst: !0,
    maxEntries: 100,
    showSortToggle: !1,
    showSource: !1,
    truncateMessage: !0,
    maxMessageLength: 100
  }),
  getCount: (E) => (E || []).length,
  handleEvent: (E, e) => iE(E || [], e, 1e3),
  supportsToolbar: !0
}, vr = {
  id: "routes",
  label: "Routes",
  icon: "iconoir-path-arrow",
  snapshotKey: "routes",
  eventTypes: [],
  category: "system",
  order: 40,
  render: (E, e) => wE(E || [], e, { showName: !0 }),
  renderConsole: (E, e) => wE(E || [], e, { showName: !0 }),
  renderToolbar: (E, e) => wE(E || [], e, { showName: !1 }),
  getCount: (E) => (E || []).length,
  supportsToolbar: !0
}, Vr = {
  id: "config",
  label: "Config",
  icon: "iconoir-settings",
  snapshotKey: "config",
  eventTypes: [],
  category: "system",
  order: 50,
  render: (E, e, T) => K("Config", E, e, {
    useIconCopyButton: !0,
    showCount: !0
  }),
  renderConsole: (E, e, T) => {
    const R = T?.filterFn;
    return K("Config", E, e, {
      useIconCopyButton: !0,
      showCount: !0,
      filterFn: R
    });
  },
  renderToolbar: (E, e) => K("Config", E, e, {
    useIconCopyButton: !1,
    showCount: !1
  }),
  getCount: (E) => E && typeof E == "object" ? Object.keys(E).length : 0,
  supportsToolbar: !0
}, xr = {
  id: "template",
  label: "Template",
  icon: "iconoir-code",
  snapshotKey: "template",
  eventTypes: "template",
  category: "data",
  order: 10,
  render: (E, e, T) => K("Template Context", E, e, {
    useIconCopyButton: !0,
    showCount: !0
  }),
  renderConsole: (E, e, T) => {
    const R = T?.filterFn;
    return K("Template Context", E, e, {
      useIconCopyButton: !0,
      showCount: !0,
      filterFn: R
    });
  },
  renderToolbar: (E, e) => K("Template Context", E, e, {
    useIconCopyButton: !1,
    showCount: !1
  }),
  getCount: (E) => E && typeof E == "object" ? Object.keys(E).length : 0,
  handleEvent: (E, e) => e,
  supportsToolbar: !0
}, Wr = {
  id: "session",
  label: "Session",
  icon: "iconoir-user",
  snapshotKey: "session",
  eventTypes: "session",
  category: "data",
  order: 20,
  render: (E, e, T) => K("Session", E, e, {
    useIconCopyButton: !0,
    showCount: !0
  }),
  renderConsole: (E, e, T) => {
    const R = T?.filterFn;
    return K("Session", E, e, {
      useIconCopyButton: !0,
      showCount: !0,
      filterFn: R
    });
  },
  renderToolbar: (E, e) => K("Session", E, e, {
    useIconCopyButton: !1,
    showCount: !1
  }),
  getCount: (E) => E && typeof E == "object" ? Object.keys(E).length : 0,
  handleEvent: (E, e) => e,
  supportsToolbar: !0
}, Xr = {
  id: "custom",
  label: "Custom",
  icon: "iconoir-puzzle",
  snapshotKey: "custom",
  eventTypes: "custom",
  category: "data",
  order: 30,
  render: (E, e, T) => JE(E || {}, e, {
    useIconCopyButton: !0,
    showCount: !0
  }),
  renderConsole: (E, e, T) => {
    const R = E || {}, A = T?.dataFilterFn;
    return JE(R, e, {
      maxLogEntries: 100,
      useIconCopyButton: !0,
      showCount: !0,
      dataFilterFn: A
    });
  },
  renderToolbar: (E, e) => JE(E || {}, e, {
    maxLogEntries: 50,
    useIconCopyButton: !1,
    showCount: !1
  }),
  getCount: (E) => {
    const e = E || {};
    return (e.data ? Object.keys(e.data).length : 0) + (e.logs?.length || 0);
  },
  handleEvent: (E, e) => lT(E, e, 500),
  supportsToolbar: !0
}, $r = {
  id: "jserrors",
  label: "JS Errors",
  icon: "iconoir-warning-triangle",
  snapshotKey: "jserrors",
  eventTypes: "jserror",
  category: "core",
  order: 35,
  render: (E, e, T) => kE(E || [], e, {
    ...T,
    compact: !1,
    showSortToggle: !1
  }),
  renderConsole: (E, e, T) => kE(E || [], e, {
    ...T,
    maxEntries: 500,
    compact: !1,
    showSortToggle: !1
  }),
  renderToolbar: (E, e, T) => kE(E || [], e, {
    ...T,
    maxEntries: 50,
    compact: !0,
    showSortToggle: !0
  }),
  getCount: (E) => (E || []).length,
  handleEvent: (E, e) => iE(E || [], e, 500),
  supportsToolbar: !0
}, Kr = {
  id: "permissions",
  label: "Permissions",
  icon: "iconoir-shield-check",
  snapshotKey: "permissions",
  eventTypes: [],
  category: "system",
  order: 45,
  showFilters: !1,
  render: (E, e, T) => ve(E, e, { showRawJSON: !0 }),
  renderConsole: (E, e, T) => ve(E, e, { showRawJSON: !0 }),
  renderToolbar: (E, e, T) => Sr(E, e),
  getCount: (E) => {
    const e = E;
    return !e || !e.summary ? 0 : e.summary.missing_keys;
  },
  supportsToolbar: !0
}, wr = {
  id: "doctor",
  label: "Doctor",
  icon: "iconoir-heartbeat",
  snapshotKey: "doctor",
  eventTypes: [],
  category: "system",
  order: 46,
  showFilters: !1,
  render: (E, e, T) => Ve(E, e, { showRawJSON: !0 }),
  renderConsole: (E, e, T) => Ve(E, e, { showRawJSON: !0 }),
  getCount: (E) => {
    const e = E;
    return !e || !e.summary ? 0 : (e.summary.error || 0) + (e.summary.warn || 0);
  },
  supportsToolbar: !1
}, Jr = {
  id: "site-render-cache",
  label: "Site Cache",
  icon: "iconoir-database",
  snapshotKey: "site-render-cache",
  eventTypes: [],
  category: "site",
  order: 80,
  showFilters: !1,
  render: (E, e) => Xe(E, e, { showRawJSON: !1 }),
  renderConsole: (E, e) => Xe(E, e, {
    showRawJSON: !0,
    maxOperations: 50,
    maxKeys: 50,
    maxErrors: 20
  }),
  renderToolbar: (E, e) => gr(E, e),
  getCount: (E) => {
    const e = E;
    return !e || !e.counters ? 0 : e.counters.errors || 0;
  },
  supportsToolbar: !0
};
function kr() {
  v.register(fr), v.register(yr), v.register(br), v.register($r), v.register(vr), v.register(Kr), v.register(wr), v.register(Jr), v.register(Vr), v.register(xr), v.register(Wr), v.register(Xr);
}
kr();
export {
  jr as C,
  HT as S,
  eO as _,
  K as a,
  TO as b,
  KE as c,
  FT as d,
  IO as f,
  EO as g,
  AO as h,
  JE as i,
  $E as l,
  RO as m,
  gr as n,
  rO as o,
  hT as p,
  kE as r,
  wE as s,
  Xe as t,
  XE as u,
  SO as v,
  ke as x,
  tO as y
};

//# sourceMappingURL=builtin-panels-rp98daiS.js.map