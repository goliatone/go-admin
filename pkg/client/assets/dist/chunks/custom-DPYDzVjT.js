const QT = (T) => {
  const E = (T || "").trim();
  return E ? E.startsWith("/") ? E.replace(/\/+$/, "") : `/${E.replace(/\/+$/, "")}` : "";
}, ZT = (T) => {
  const E = window.location.protocol === "https:" ? "wss:" : "ws:", R = QT(T);
  return `${E}//${window.location.host}${R}/ws`;
};
class tO {
  constructor(E) {
    this.ws = null, this.reconnectTimer = null, this.reconnectAttempts = 0, this.manualClose = !1, this.pendingCommands = [], this.status = "disconnected", this.options = E;
  }
  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING))
      return;
    this.manualClose = !1;
    const E = ZT(this.options.basePath);
    this.ws = new WebSocket(E), this.ws.onopen = () => {
      this.reconnectAttempts = 0, this.setStatus("connected"), this.flushPending();
    }, this.ws.onmessage = (R) => {
      if (!(!R || typeof R.data != "string"))
        try {
          const A = JSON.parse(R.data);
          this.options.onEvent?.(A);
        } catch {
        }
    }, this.ws.onclose = () => {
      if (this.ws = null, this.manualClose) {
        this.setStatus("disconnected");
        return;
      }
      this.setStatus("reconnecting"), this.scheduleReconnect();
    }, this.ws.onerror = (R) => {
      this.options.onError?.(R), this.setStatus("error");
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
    this.sendCommand({ type: "subscribe", panels: E });
  }
  unsubscribe(E) {
    this.sendCommand({ type: "unsubscribe", panels: E });
  }
  requestSnapshot() {
    this.sendCommand({ type: "snapshot" });
  }
  clear(E) {
    this.sendCommand({ type: "clear", panels: E });
  }
  getStatus() {
    return this.status;
  }
  setStatus(E) {
    this.status !== E && (this.status = E, this.options.onStatusChange?.(E));
  }
  flushPending() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || this.pendingCommands.length === 0)
      return;
    const E = [...this.pendingCommands];
    this.pendingCommands = [];
    for (const R of E)
      this.ws.send(JSON.stringify(R));
  }
  scheduleReconnect() {
    const E = this.options.maxReconnectAttempts ?? 8, R = this.options.reconnectDelayMs ?? 1e3, A = this.options.maxReconnectDelayMs ?? 12e3;
    if (this.reconnectAttempts >= E) {
      this.setStatus("disconnected");
      return;
    }
    const S = this.reconnectAttempts, r = Math.min(R * Math.pow(2, S), A), n = r * (0.2 + Math.random() * 0.3);
    this.reconnectAttempts += 1, this.reconnectTimer = window.setTimeout(() => {
      this.connect();
    }, r + n);
  }
}
var yE = typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : typeof self < "u" ? self : {};
function UT(T) {
  return T && T.__esModule && Object.prototype.hasOwnProperty.call(T, "default") ? T.default : T;
}
const d = (T) => String(T ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;"), tE = (T) => {
  if (!T)
    return "";
  if (typeof T == "number")
    return new Date(T).toLocaleTimeString();
  if (typeof T == "string") {
    const E = new Date(T);
    return Number.isNaN(E.getTime()) ? T : E.toLocaleTimeString();
  }
  return "";
}, lT = (T, E = 50) => {
  if (T == null)
    return { text: "0ms", isSlow: !1 };
  if (typeof T == "string") {
    const r = uT(T), n = r !== null && r >= E;
    return { text: T, isSlow: n };
  }
  const R = Number(T);
  if (Number.isNaN(R))
    return { text: "0ms", isSlow: !1 };
  const A = R / 1e6, S = A >= E;
  return A < 1 ? { text: `${(R / 1e3).toFixed(1)}µs`, isSlow: S } : A < 1e3 ? { text: `${A.toFixed(2)}ms`, isSlow: S } : { text: `${(A / 1e3).toFixed(2)}s`, isSlow: S };
}, sO = (T, E = 50) => {
  const R = qT(T);
  return R === null ? !1 : R >= E;
}, GT = (T, E) => {
  const { nullAsEmptyObject: R = !0, indent: A = 2 } = {};
  if (T == null)
    return R ? "{}" : "null";
  try {
    return JSON.stringify(T, null, A);
  } catch {
    return String(T ?? "");
  }
}, cT = (T, E) => T ? T.length > E ? T.substring(0, E) + "..." : T : "", uT = (T) => {
  const E = T.trim();
  if (!E)
    return null;
  const R = E.match(/^([0-9]*\.?[0-9]+)\s*(ns|µs|us|ms|s)?$/i);
  if (!R)
    return null;
  const A = Number(R[1]);
  if (Number.isNaN(A))
    return null;
  switch ((R[2] || "ms").toLowerCase()) {
    case "ns":
      return A / 1e6;
    case "us":
    case "µs":
      return A / 1e3;
    case "ms":
      return A;
    case "s":
      return A * 1e3;
    default:
      return null;
  }
}, qT = (T) => {
  if (T == null)
    return null;
  if (typeof T == "string")
    return uT(T);
  const E = Number(T);
  return Number.isNaN(E) ? null : E / 1e6;
}, sE = (T) => {
  if (T == null || T === "")
    return "0";
  const E = Number(T);
  return Number.isNaN(E) ? String(T) : E.toLocaleString();
}, HT = (T) => T == null ? 0 : Array.isArray(T) ? T.length : typeof T == "object" ? Object.keys(T).length : 1, kT = (T) => T ? T >= 500 ? "error" : T >= 400 ? "warn" : "" : "", jT = (T) => {
  if (!T)
    return "info";
  const E = T.toLowerCase();
  return E === "error" || E === "fatal" ? "error" : E === "warn" || E === "warning" ? "warn" : E === "debug" || E === "trace" ? "debug" : "info";
}, LO = (T) => Array.isArray(T) ? T : [];
async function zT(T, E, R = {}) {
  const {
    feedbackDuration: A = 1500,
    useIconFeedback: S = !1,
    successClass: r = S ? "debug-copy--success" : "copied",
    errorClass: n = "debug-copy--error"
  } = R;
  try {
    await navigator.clipboard.writeText(T);
    const C = E.innerHTML;
    return E.classList.add(r), S ? E.innerHTML = '<i class="iconoir-check"></i> Copied' : E.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        Copied
      `, setTimeout(() => {
      E.innerHTML = C, E.classList.remove(r);
    }, A), !0;
  } catch {
    return E.classList.add(n), setTimeout(() => {
      E.classList.remove(n);
    }, A), !1;
  }
}
function CO(T, E = {}) {
  T.querySelectorAll("[data-copy-trigger]").forEach((R) => {
    R.addEventListener("click", async (A) => {
      A.preventDefault(), A.stopPropagation();
      const S = R.closest("[data-copy-content]");
      if (!S) return;
      const r = S.getAttribute("data-copy-content") || "";
      await zT(r, R, E);
    });
  });
}
function rO(T) {
  T.querySelectorAll(".expandable-row").forEach((E) => {
    E.addEventListener("click", (R) => {
      if (R.target.closest("a, button")) return;
      R.currentTarget.classList.toggle("expanded");
    });
  });
}
function _O(T, E) {
  T.querySelectorAll("[data-sort-toggle]").forEach((R) => {
    R.addEventListener("change", (A) => {
      const S = A.target, r = S.dataset.sortToggle;
      r && E(r, S.checked);
    });
  });
}
const aO = {
  // Table styling
  table: "debug-table",
  tableRoutes: "debug-table debug-routes-table",
  // Badge styling
  badge: "badge",
  badgeMethod: (T) => `badge badge--method-${T.toLowerCase()}`,
  badgeStatus: (T) => T >= 500 ? "badge badge--status-error" : T >= 400 ? "badge badge--status-warn" : "badge badge--status",
  badgeLevel: (T) => `badge badge--level-${T.toLowerCase()}`,
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
  muted: "debug-muted"
}, nO = {
  // Table styling
  table: "",
  tableRoutes: "",
  // Badge styling
  badge: "badge",
  badgeMethod: (T) => `badge badge-method ${T.toLowerCase()}`,
  badgeStatus: (T) => {
    const E = kT(T);
    return E ? `badge badge-status ${E}` : "badge badge-status";
  },
  badgeLevel: (T) => `badge badge-level ${jT(T)}`,
  badgeError: "badge badge-error",
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
  muted: "timestamp"
};
function ER(T, E, R) {
  return `
    <div class="${R.panelControls}">
      <label class="${R.sortToggle}">
        <input type="checkbox" data-sort-toggle="${T}" ${E ? "checked" : ""}>
        <span>Newest first</span>
      </label>
    </div>
  `;
}
function TR(T, E, R) {
  const A = T.method || "GET", S = T.path || "", r = T.status || 0, n = lT(T.duration, R.slowThresholdMs), C = E.badgeMethod(A), M = E.badgeStatus(r), I = n.isSlow ? E.durationSlow : "", L = r >= 400 ? E.rowError : "", _ = R.truncatePath ? cT(S, R.maxPathLength || 50) : S;
  return `
    <tr class="${L}">
      <td><span class="${C}">${d(A)}</span></td>
      <td class="${E.path}" title="${d(S)}">${d(_)}</td>
      <td><span class="${M}">${d(r || "-")}</span></td>
      <td class="${E.duration} ${I}">${n.text}</td>
      <td class="${E.timestamp}">${d(tE(T.timestamp))}</td>
    </tr>
  `;
}
function iO(T, E, R = {}) {
  const {
    newestFirst: A = !0,
    slowThresholdMs: S = 50,
    maxEntries: r,
    showSortToggle: n = !1,
    truncatePath: C = !0,
    maxPathLength: M = 50
  } = R, I = n ? ER("requests", A, E) : "";
  if (!T.length)
    return I + `<div class="${E.emptyState}">No requests captured</div>`;
  let L = r ? T.slice(-r) : T;
  A && (L = [...L].reverse());
  const _ = L.map(
    (D) => TR(D, E, {
      ...R,
      slowThresholdMs: S,
      truncatePath: C,
      maxPathLength: M
    })
  ).join("");
  return `
    ${I}
    <table class="${E.table}">
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
var BT = { exports: {} };
(function(T) {
  var E = typeof window < "u" ? window : typeof WorkerGlobalScope < "u" && self instanceof WorkerGlobalScope ? self : {};
  /**
   * Prism: Lightweight, robust, elegant syntax highlighting
   *
   * @license MIT <https://opensource.org/licenses/MIT>
   * @author Lea Verou <https://lea.verou.me>
   * @namespace
   * @public
   */
  var R = function(A) {
    var S = /(?:^|\s)lang(?:uage)?-([\w-]+)(?=\s|$)/i, r = 0, n = {}, C = {
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
      manual: A.Prism && A.Prism.manual,
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
      disableWorkerMessageHandler: A.Prism && A.Prism.disableWorkerMessageHandler,
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
        encode: function O(t) {
          return t instanceof M ? new M(t.type, O(t.content), t.alias) : Array.isArray(t) ? t.map(O) : t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\u00a0/g, " ");
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
        type: function(O) {
          return Object.prototype.toString.call(O).slice(8, -1);
        },
        /**
         * Returns a unique number for the given object. Later calls will still return the same number.
         *
         * @param {Object} obj
         * @returns {number}
         */
        objId: function(O) {
          return O.__id || Object.defineProperty(O, "__id", { value: ++r }), O.__id;
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
        clone: function O(t, a) {
          a = a || {};
          var i, o;
          switch (C.util.type(t)) {
            case "Object":
              if (o = C.util.objId(t), a[o])
                return a[o];
              i = /** @type {Record<string, any>} */
              {}, a[o] = i;
              for (var U in t)
                t.hasOwnProperty(U) && (i[U] = O(t[U], a));
              return (
                /** @type {any} */
                i
              );
            case "Array":
              return o = C.util.objId(t), a[o] ? a[o] : (i = [], a[o] = i, /** @type {Array} */
              /** @type {any} */
              t.forEach(function(p, l) {
                i[l] = O(p, a);
              }), /** @type {any} */
              i);
            default:
              return t;
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
        getLanguage: function(O) {
          for (; O; ) {
            var t = S.exec(O.className);
            if (t)
              return t[1].toLowerCase();
            O = O.parentElement;
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
        setLanguage: function(O, t) {
          O.className = O.className.replace(RegExp(S, "gi"), ""), O.classList.add("language-" + t);
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
          } catch (i) {
            var O = (/at [^(\r\n]*\((.*):[^:]+:[^:]+\)$/i.exec(i.stack) || [])[1];
            if (O) {
              var t = document.getElementsByTagName("script");
              for (var a in t)
                if (t[a].src == O)
                  return t[a];
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
        isActive: function(O, t, a) {
          for (var i = "no-" + t; O; ) {
            var o = O.classList;
            if (o.contains(t))
              return !0;
            if (o.contains(i))
              return !1;
            O = O.parentElement;
          }
          return !!a;
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
        plain: n,
        plaintext: n,
        text: n,
        txt: n,
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
        extend: function(O, t) {
          var a = C.util.clone(C.languages[O]);
          for (var i in t)
            a[i] = t[i];
          return a;
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
        insertBefore: function(O, t, a, i) {
          i = i || /** @type {any} */
          C.languages;
          var o = i[O], U = {};
          for (var p in o)
            if (o.hasOwnProperty(p)) {
              if (p == t)
                for (var l in a)
                  a.hasOwnProperty(l) && (U[l] = a[l]);
              a.hasOwnProperty(p) || (U[p] = o[p]);
            }
          var Y = i[O];
          return i[O] = U, C.languages.DFS(C.languages, function(W, K) {
            K === Y && W != O && (this[W] = U);
          }), U;
        },
        // Traverse a language definition with Depth First Search
        DFS: function O(t, a, i, o) {
          o = o || {};
          var U = C.util.objId;
          for (var p in t)
            if (t.hasOwnProperty(p)) {
              a.call(t, p, t[p], i || p);
              var l = t[p], Y = C.util.type(l);
              Y === "Object" && !o[U(l)] ? (o[U(l)] = !0, O(l, a, null, o)) : Y === "Array" && !o[U(l)] && (o[U(l)] = !0, O(l, a, p, o));
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
      highlightAll: function(O, t) {
        C.highlightAllUnder(document, O, t);
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
      highlightAllUnder: function(O, t, a) {
        var i = {
          callback: a,
          container: O,
          selector: 'code[class*="language-"], [class*="language-"] code, code[class*="lang-"], [class*="lang-"] code'
        };
        C.hooks.run("before-highlightall", i), i.elements = Array.prototype.slice.apply(i.container.querySelectorAll(i.selector)), C.hooks.run("before-all-elements-highlight", i);
        for (var o = 0, U; U = i.elements[o++]; )
          C.highlightElement(U, t === !0, i.callback);
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
      highlightElement: function(O, t, a) {
        var i = C.util.getLanguage(O), o = C.languages[i];
        C.util.setLanguage(O, i);
        var U = O.parentElement;
        U && U.nodeName.toLowerCase() === "pre" && C.util.setLanguage(U, i);
        var p = O.textContent, l = {
          element: O,
          language: i,
          grammar: o,
          code: p
        };
        function Y(K) {
          l.highlightedCode = K, C.hooks.run("before-insert", l), l.element.innerHTML = l.highlightedCode, C.hooks.run("after-highlight", l), C.hooks.run("complete", l), a && a.call(l.element);
        }
        if (C.hooks.run("before-sanity-check", l), U = l.element.parentElement, U && U.nodeName.toLowerCase() === "pre" && !U.hasAttribute("tabindex") && U.setAttribute("tabindex", "0"), !l.code) {
          C.hooks.run("complete", l), a && a.call(l.element);
          return;
        }
        if (C.hooks.run("before-highlight", l), !l.grammar) {
          Y(C.util.encode(l.code));
          return;
        }
        if (t && A.Worker) {
          var W = new Worker(C.filename);
          W.onmessage = function(K) {
            Y(K.data);
          }, W.postMessage(JSON.stringify({
            language: l.language,
            code: l.code,
            immediateClose: !0
          }));
        } else
          Y(C.highlight(l.code, l.grammar, l.language));
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
      highlight: function(O, t, a) {
        var i = {
          code: O,
          grammar: t,
          language: a
        };
        if (C.hooks.run("before-tokenize", i), !i.grammar)
          throw new Error('The language "' + i.language + '" has no grammar.');
        return i.tokens = C.tokenize(i.code, i.grammar), C.hooks.run("after-tokenize", i), M.stringify(C.util.encode(i.tokens), i.language);
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
      tokenize: function(O, t) {
        var a = t.rest;
        if (a) {
          for (var i in a)
            t[i] = a[i];
          delete t.rest;
        }
        var o = new _();
        return D(o, o.head, O), L(O, o, t, o.head, 0), u(o);
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
        add: function(O, t) {
          var a = C.hooks.all;
          a[O] = a[O] || [], a[O].push(t);
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
        run: function(O, t) {
          var a = C.hooks.all[O];
          if (!(!a || !a.length))
            for (var i = 0, o; o = a[i++]; )
              o(t);
        }
      },
      Token: M
    };
    A.Prism = C;
    function M(O, t, a, i) {
      this.type = O, this.content = t, this.alias = a, this.length = (i || "").length | 0;
    }
    M.stringify = function O(t, a) {
      if (typeof t == "string")
        return t;
      if (Array.isArray(t)) {
        var i = "";
        return t.forEach(function(Y) {
          i += O(Y, a);
        }), i;
      }
      var o = {
        type: t.type,
        content: O(t.content, a),
        tag: "span",
        classes: ["token", t.type],
        attributes: {},
        language: a
      }, U = t.alias;
      U && (Array.isArray(U) ? Array.prototype.push.apply(o.classes, U) : o.classes.push(U)), C.hooks.run("wrap", o);
      var p = "";
      for (var l in o.attributes)
        p += " " + l + '="' + (o.attributes[l] || "").replace(/"/g, "&quot;") + '"';
      return "<" + o.tag + ' class="' + o.classes.join(" ") + '"' + p + ">" + o.content + "</" + o.tag + ">";
    };
    function I(O, t, a, i) {
      O.lastIndex = t;
      var o = O.exec(a);
      if (o && i && o[1]) {
        var U = o[1].length;
        o.index += U, o[0] = o[0].slice(U);
      }
      return o;
    }
    function L(O, t, a, i, o, U) {
      for (var p in a)
        if (!(!a.hasOwnProperty(p) || !a[p])) {
          var l = a[p];
          l = Array.isArray(l) ? l : [l];
          for (var Y = 0; Y < l.length; ++Y) {
            if (U && U.cause == p + "," + Y)
              return;
            var W = l[Y], K = W.inside, bE = !!W.lookbehind, KE = !!W.greedy, xT = W.alias;
            if (KE && !W.pattern.global) {
              var $T = W.pattern.toString().match(/[imsuy]*$/)[0];
              W.pattern = RegExp(W.pattern.source, $T + "g");
            }
            for (var vE = W.pattern || W, f = i.next, X = o; f !== t.tail && !(U && X >= U.reach); X += f.value.length, f = f.next) {
              var Q = f.value;
              if (t.length > O.length)
                return;
              if (!(Q instanceof M)) {
                var EE = 1, y;
                if (KE) {
                  if (y = I(vE, X, O, bE), !y || y.index >= O.length)
                    break;
                  var TE = y.index, wT = y.index + y[0].length, v = X;
                  for (v += f.value.length; TE >= v; )
                    f = f.next, v += f.value.length;
                  if (v -= f.value.length, X = v, f.value instanceof M)
                    continue;
                  for (var j = f; j !== t.tail && (v < wT || typeof j.value == "string"); j = j.next)
                    EE++, v += j.value.length;
                  EE--, Q = O.slice(X, v), y.index -= X;
                } else if (y = I(vE, 0, Q, bE), !y)
                  continue;
                var TE = y.index, RE = y[0], CE = Q.slice(0, TE), xE = Q.slice(TE + RE.length), rE = X + Q.length;
                U && rE > U.reach && (U.reach = rE);
                var AE = f.prev;
                CE && (AE = D(t, AE, CE), X += CE.length), B(t, AE, EE);
                var JT = new M(p, K ? C.tokenize(RE, K) : RE, xT, RE);
                if (f = D(t, AE, JT), xE && D(t, f, xE), EE > 1) {
                  var _E = {
                    cause: p + "," + Y,
                    reach: rE
                  };
                  L(O, t, a, f.prev, X, _E), U && _E.reach > U.reach && (U.reach = _E.reach);
                }
              }
            }
          }
        }
    }
    function _() {
      var O = { value: null, prev: null, next: null }, t = { value: null, prev: O, next: null };
      O.next = t, this.head = O, this.tail = t, this.length = 0;
    }
    function D(O, t, a) {
      var i = t.next, o = { value: a, prev: t, next: i };
      return t.next = o, i.prev = o, O.length++, o;
    }
    function B(O, t, a) {
      for (var i = t.next, o = 0; o < a && i !== O.tail; o++)
        i = i.next;
      t.next = i, i.prev = t, O.length -= o;
    }
    function u(O) {
      for (var t = [], a = O.head.next; a !== O.tail; )
        t.push(a.value), a = a.next;
      return t;
    }
    if (!A.document)
      return A.addEventListener && (C.disableWorkerMessageHandler || A.addEventListener("message", function(O) {
        var t = JSON.parse(O.data), a = t.language, i = t.code, o = t.immediateClose;
        A.postMessage(C.highlight(i, C.languages[a], a)), o && A.close();
      }, !1)), C;
    var H = C.util.currentScript();
    H && (C.filename = H.src, H.hasAttribute("data-manual") && (C.manual = !0));
    function c() {
      C.manual || C.highlightAll();
    }
    if (!C.manual) {
      var F = document.readyState;
      F === "loading" || F === "interactive" && H && H.defer ? document.addEventListener("DOMContentLoaded", c) : window.requestAnimationFrame ? window.requestAnimationFrame(c) : window.setTimeout(c, 16);
    }
    return C;
  }(E);
  T.exports && (T.exports = R), typeof yE < "u" && (yE.Prism = R), R.languages.markup = {
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
  }, R.languages.markup.tag.inside["attr-value"].inside.entity = R.languages.markup.entity, R.languages.markup.doctype.inside["internal-subset"].inside = R.languages.markup, R.hooks.add("wrap", function(A) {
    A.type === "entity" && (A.attributes.title = A.content.replace(/&amp;/, "&"));
  }), Object.defineProperty(R.languages.markup.tag, "addInlined", {
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
    value: function(S, r) {
      var n = {};
      n["language-" + r] = {
        pattern: /(^<!\[CDATA\[)[\s\S]+?(?=\]\]>$)/i,
        lookbehind: !0,
        inside: R.languages[r]
      }, n.cdata = /^<!\[CDATA\[|\]\]>$/i;
      var C = {
        "included-cdata": {
          pattern: /<!\[CDATA\[[\s\S]*?\]\]>/i,
          inside: n
        }
      };
      C["language-" + r] = {
        pattern: /[\s\S]+/,
        inside: R.languages[r]
      };
      var M = {};
      M[S] = {
        pattern: RegExp(/(<__[^>]*>)(?:<!\[CDATA\[(?:[^\]]|\](?!\]>))*\]\]>|(?!<!\[CDATA\[)[\s\S])*?(?=<\/__>)/.source.replace(/__/g, function() {
          return S;
        }), "i"),
        lookbehind: !0,
        greedy: !0,
        inside: C
      }, R.languages.insertBefore("markup", "cdata", M);
    }
  }), Object.defineProperty(R.languages.markup.tag, "addAttribute", {
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
    value: function(A, S) {
      R.languages.markup.tag.inside["special-attr"].push({
        pattern: RegExp(
          /(^|["'\s])/.source + "(?:" + A + ")" + /\s*=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+(?=[\s>]))/.source,
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
                alias: [S, "language-" + S],
                inside: R.languages[S]
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
  }), R.languages.html = R.languages.markup, R.languages.mathml = R.languages.markup, R.languages.svg = R.languages.markup, R.languages.xml = R.languages.extend("markup", {}), R.languages.ssml = R.languages.xml, R.languages.atom = R.languages.xml, R.languages.rss = R.languages.xml, function(A) {
    var S = /(?:"(?:\\(?:\r\n|[\s\S])|[^"\\\r\n])*"|'(?:\\(?:\r\n|[\s\S])|[^'\\\r\n])*')/;
    A.languages.css = {
      comment: /\/\*[\s\S]*?\*\//,
      atrule: {
        pattern: RegExp("@[\\w-](?:" + /[^;{\s"']|\s+(?!\s)/.source + "|" + S.source + ")*?" + /(?:;|(?=\s*\{))/.source),
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
        pattern: RegExp("\\burl\\((?:" + S.source + "|" + /(?:[^\\\r\n()"']|\\[\s\S])*/.source + ")\\)", "i"),
        greedy: !0,
        inside: {
          function: /^url/i,
          punctuation: /^\(|\)$/,
          string: {
            pattern: RegExp("^" + S.source + "$"),
            alias: "url"
          }
        }
      },
      selector: {
        pattern: RegExp(`(^|[{}\\s])[^{}\\s](?:[^{};"'\\s]|\\s+(?![\\s{])|` + S.source + ")*(?=\\s*\\{)"),
        lookbehind: !0
      },
      string: {
        pattern: S,
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
    }, A.languages.css.atrule.inside.rest = A.languages.css;
    var r = A.languages.markup;
    r && (r.tag.addInlined("style", "css"), r.tag.addAttribute("style", "css"));
  }(R), R.languages.clike = {
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
  }, R.languages.javascript = R.languages.extend("clike", {
    "class-name": [
      R.languages.clike["class-name"],
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
  }), R.languages.javascript["class-name"][0].pattern = /(\b(?:class|extends|implements|instanceof|interface|new)\s+)[\w.\\]+/, R.languages.insertBefore("javascript", "keyword", {
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
          inside: R.languages.regex
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
        inside: R.languages.javascript
      },
      {
        pattern: /(^|[^$\w\xA0-\uFFFF])(?!\s)[_$a-z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*=>)/i,
        lookbehind: !0,
        inside: R.languages.javascript
      },
      {
        pattern: /(\(\s*)(?!\s)(?:[^()\s]|\s+(?![\s)])|\([^()]*\))+(?=\s*\)\s*=>)/,
        lookbehind: !0,
        inside: R.languages.javascript
      },
      {
        pattern: /((?:\b|\s|^)(?!(?:as|async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|finally|for|from|function|get|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|set|static|super|switch|this|throw|try|typeof|undefined|var|void|while|with|yield)(?![$\w\xA0-\uFFFF]))(?:(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*\s*)\(\s*|\]\s*\(\s*)(?!\s)(?:[^()\s]|\s+(?![\s)])|\([^()]*\))+(?=\s*\)\s*\{)/,
        lookbehind: !0,
        inside: R.languages.javascript
      }
    ],
    constant: /\b[A-Z](?:[A-Z_]|\dx?)*\b/
  }), R.languages.insertBefore("javascript", "string", {
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
            rest: R.languages.javascript
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
  }), R.languages.insertBefore("javascript", "operator", {
    "literal-property": {
      pattern: /((?:^|[,{])[ \t]*)(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*:)/m,
      lookbehind: !0,
      alias: "property"
    }
  }), R.languages.markup && (R.languages.markup.tag.addInlined("script", "javascript"), R.languages.markup.tag.addAttribute(
    /on(?:abort|blur|change|click|composition(?:end|start|update)|dblclick|error|focus(?:in|out)?|key(?:down|up)|load|mouse(?:down|enter|leave|move|out|over|up)|reset|resize|scroll|select|slotchange|submit|unload|wheel)/.source,
    "javascript"
  )), R.languages.js = R.languages.javascript, function() {
    if (typeof R > "u" || typeof document > "u")
      return;
    Element.prototype.matches || (Element.prototype.matches = Element.prototype.msMatchesSelector || Element.prototype.webkitMatchesSelector);
    var A = "Loading…", S = function(H, c) {
      return "✖ Error " + H + " while fetching file: " + c;
    }, r = "✖ Error: File does not exist or is empty", n = {
      js: "javascript",
      py: "python",
      rb: "ruby",
      ps1: "powershell",
      psm1: "powershell",
      sh: "bash",
      bat: "batch",
      h: "c",
      tex: "latex"
    }, C = "data-src-status", M = "loading", I = "loaded", L = "failed", _ = "pre[data-src]:not([" + C + '="' + I + '"]):not([' + C + '="' + M + '"])';
    function D(H, c, F) {
      var O = new XMLHttpRequest();
      O.open("GET", H, !0), O.onreadystatechange = function() {
        O.readyState == 4 && (O.status < 400 && O.responseText ? c(O.responseText) : O.status >= 400 ? F(S(O.status, O.statusText)) : F(r));
      }, O.send(null);
    }
    function B(H) {
      var c = /^\s*(\d+)\s*(?:(,)\s*(?:(\d+)\s*)?)?$/.exec(H || "");
      if (c) {
        var F = Number(c[1]), O = c[2], t = c[3];
        return O ? t ? [F, Number(t)] : [F, void 0] : [F, F];
      }
    }
    R.hooks.add("before-highlightall", function(H) {
      H.selector += ", " + _;
    }), R.hooks.add("before-sanity-check", function(H) {
      var c = (
        /** @type {HTMLPreElement} */
        H.element
      );
      if (c.matches(_)) {
        H.code = "", c.setAttribute(C, M);
        var F = c.appendChild(document.createElement("CODE"));
        F.textContent = A;
        var O = c.getAttribute("data-src"), t = H.language;
        if (t === "none") {
          var a = (/\.(\w+)$/.exec(O) || [, "none"])[1];
          t = n[a] || a;
        }
        R.util.setLanguage(F, t), R.util.setLanguage(c, t);
        var i = R.plugins.autoloader;
        i && i.loadLanguages(t), D(
          O,
          function(o) {
            c.setAttribute(C, I);
            var U = B(c.getAttribute("data-range"));
            if (U) {
              var p = o.split(/\r\n?|\n/g), l = U[0], Y = U[1] == null ? p.length : U[1];
              l < 0 && (l += p.length), l = Math.max(0, Math.min(l - 1, p.length)), Y < 0 && (Y += p.length), Y = Math.max(0, Math.min(Y, p.length)), o = p.slice(l, Y).join(`
`), c.hasAttribute("data-start") || c.setAttribute("data-start", String(l + 1));
            }
            F.textContent = o, R.highlightElement(F);
          },
          function(o) {
            c.setAttribute(C, L), F.textContent = o;
          }
        );
      }
    }), R.plugins.fileHighlight = {
      /**
       * Executes the File Highlight plugin for all matching `pre` elements under the given container.
       *
       * Note: Elements which are already loaded or currently loading will not be touched by this method.
       *
       * @param {ParentNode} [container=document]
       */
      highlight: function(c) {
        for (var F = (c || document).querySelectorAll(_), O = 0, t; t = F[O++]; )
          R.highlightElement(t);
      }
    };
    var u = !1;
    R.fileHighlight = function() {
      u || (console.warn("Prism.fileHighlight is deprecated. Use `Prism.plugins.fileHighlight.highlight` instead."), u = !0), R.plugins.fileHighlight.highlight.apply(this, arguments);
    };
  }();
})(BT);
var RR = BT.exports;
const OE = /* @__PURE__ */ UT(RR);
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
const e = (T) => T.flatMap(AR), AR = (T) => eE(SR(T)).map(eR), eR = (T) => T.replace(/ +/g, " ").trim(), SR = (T) => ({
  type: "mandatory_block",
  items: XE(T, 0)[0]
}), XE = (T, E, R) => {
  const A = [];
  for (; T[E]; ) {
    const [S, r] = IR(T, E);
    if (A.push(S), E = r, T[E] === "|")
      E++;
    else if (T[E] === "}" || T[E] === "]") {
      if (R !== T[E])
        throw new Error(`Unbalanced parenthesis in: ${T}`);
      return E++, [A, E];
    } else if (E === T.length) {
      if (R)
        throw new Error(`Unbalanced parenthesis in: ${T}`);
      return [A, E];
    } else
      throw new Error(`Unexpected "${T[E]}"`);
  }
  return [A, E];
}, IR = (T, E) => {
  const R = [];
  for (; ; ) {
    const [A, S] = NR(T, E);
    if (A)
      R.push(A), E = S;
    else
      break;
  }
  return R.length === 1 ? [R[0], E] : [{ type: "concatenation", items: R }, E];
}, NR = (T, E) => {
  if (T[E] === "{")
    return tR(T, E + 1);
  if (T[E] === "[")
    return sR(T, E + 1);
  {
    let R = "";
    for (; T[E] && /[A-Za-z0-9_ ]/.test(T[E]); )
      R += T[E], E++;
    return [R, E];
  }
}, tR = (T, E) => {
  const [R, A] = XE(T, E, "}");
  return [{ type: "mandatory_block", items: R }, A];
}, sR = (T, E) => {
  const [R, A] = XE(T, E, "]");
  return [{ type: "optional_block", items: R }, A];
}, eE = (T) => {
  if (typeof T == "string")
    return [T];
  if (T.type === "concatenation")
    return T.items.map(eE).reduce(LR, [""]);
  if (T.type === "mandatory_block")
    return T.items.flatMap(eE);
  if (T.type === "optional_block")
    return ["", ...T.items.flatMap(eE)];
  throw new Error(`Unknown node type: ${T}`);
}, LR = (T, E) => {
  const R = [];
  for (const A of T)
    for (const S of E)
      R.push(A + S);
  return R;
};
var s;
(function(T) {
  T.QUOTED_IDENTIFIER = "QUOTED_IDENTIFIER", T.IDENTIFIER = "IDENTIFIER", T.STRING = "STRING", T.VARIABLE = "VARIABLE", T.RESERVED_DATA_TYPE = "RESERVED_DATA_TYPE", T.RESERVED_PARAMETERIZED_DATA_TYPE = "RESERVED_PARAMETERIZED_DATA_TYPE", T.RESERVED_KEYWORD = "RESERVED_KEYWORD", T.RESERVED_FUNCTION_NAME = "RESERVED_FUNCTION_NAME", T.RESERVED_KEYWORD_PHRASE = "RESERVED_KEYWORD_PHRASE", T.RESERVED_DATA_TYPE_PHRASE = "RESERVED_DATA_TYPE_PHRASE", T.RESERVED_SET_OPERATION = "RESERVED_SET_OPERATION", T.RESERVED_CLAUSE = "RESERVED_CLAUSE", T.RESERVED_SELECT = "RESERVED_SELECT", T.RESERVED_JOIN = "RESERVED_JOIN", T.ARRAY_IDENTIFIER = "ARRAY_IDENTIFIER", T.ARRAY_KEYWORD = "ARRAY_KEYWORD", T.CASE = "CASE", T.END = "END", T.WHEN = "WHEN", T.ELSE = "ELSE", T.THEN = "THEN", T.LIMIT = "LIMIT", T.BETWEEN = "BETWEEN", T.AND = "AND", T.OR = "OR", T.XOR = "XOR", T.OPERATOR = "OPERATOR", T.COMMA = "COMMA", T.ASTERISK = "ASTERISK", T.PROPERTY_ACCESS_OPERATOR = "PROPERTY_ACCESS_OPERATOR", T.OPEN_PAREN = "OPEN_PAREN", T.CLOSE_PAREN = "CLOSE_PAREN", T.LINE_COMMENT = "LINE_COMMENT", T.BLOCK_COMMENT = "BLOCK_COMMENT", T.DISABLE_COMMENT = "DISABLE_COMMENT", T.NUMBER = "NUMBER", T.NAMED_PARAMETER = "NAMED_PARAMETER", T.QUOTED_PARAMETER = "QUOTED_PARAMETER", T.NUMBERED_PARAMETER = "NUMBERED_PARAMETER", T.POSITIONAL_PARAMETER = "POSITIONAL_PARAMETER", T.CUSTOM_PARAMETER = "CUSTOM_PARAMETER", T.DELIMITER = "DELIMITER", T.EOF = "EOF";
})(s = s || (s = {}));
const FT = (T) => ({
  type: s.EOF,
  raw: "«EOF»",
  text: "«EOF»",
  start: T
}), x = FT(1 / 0), Z = (T) => (E) => E.type === T.type && E.text === T.text, $ = {
  ARRAY: Z({ text: "ARRAY", type: s.RESERVED_DATA_TYPE }),
  BY: Z({ text: "BY", type: s.RESERVED_KEYWORD }),
  SET: Z({ text: "SET", type: s.RESERVED_CLAUSE }),
  STRUCT: Z({ text: "STRUCT", type: s.RESERVED_DATA_TYPE }),
  WINDOW: Z({ text: "WINDOW", type: s.RESERVED_CLAUSE }),
  VALUES: Z({ text: "VALUES", type: s.RESERVED_CLAUSE })
}, pT = (T) => T === s.RESERVED_DATA_TYPE || T === s.RESERVED_KEYWORD || T === s.RESERVED_FUNCTION_NAME || T === s.RESERVED_KEYWORD_PHRASE || T === s.RESERVED_DATA_TYPE_PHRASE || T === s.RESERVED_CLAUSE || T === s.RESERVED_SELECT || T === s.RESERVED_SET_OPERATION || T === s.RESERVED_JOIN || T === s.ARRAY_KEYWORD || T === s.CASE || T === s.END || T === s.WHEN || T === s.ELSE || T === s.THEN || T === s.LIMIT || T === s.BETWEEN || T === s.AND || T === s.OR || T === s.XOR, CR = (T) => T === s.AND || T === s.OR || T === s.XOR, rR = [
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
], _R = [
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
], aR = [
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
], nR = e(["SELECT [ALL | DISTINCT] [AS STRUCT | AS VALUE]"]), iR = e([
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
]), $E = e([
  "CREATE [OR REPLACE] [TEMP|TEMPORARY|SNAPSHOT|EXTERNAL] TABLE [IF NOT EXISTS]"
]), aE = e([
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
]), DR = e([
  "UNION {ALL | DISTINCT}",
  "EXCEPT DISTINCT",
  "INTERSECT DISTINCT"
]), oR = e([
  "JOIN",
  "{LEFT | RIGHT | FULL} [OUTER] JOIN",
  "{INNER | CROSS} JOIN"
]), PR = e([
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
]), MR = e([]), UR = {
  name: "bigquery",
  tokenizerOptions: {
    reservedSelect: nR,
    reservedClauses: [...iR, ...aE, ...$E],
    reservedSetOperations: DR,
    reservedJoins: oR,
    reservedKeywordPhrases: PR,
    reservedDataTypePhrases: MR,
    reservedKeywords: _R,
    reservedDataTypes: aR,
    reservedFunctionNames: rR,
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
    postProcess: lR
  },
  formatOptions: {
    onelineClauses: [...$E, ...aE],
    tabularOnelineClauses: aE
  }
};
function lR(T) {
  return GR(cR(T));
}
function GR(T) {
  let E = x;
  return T.map((R) => R.text === "OFFSET" && E.text === "[" ? (E = R, Object.assign(Object.assign({}, R), { type: s.RESERVED_FUNCTION_NAME })) : (E = R, R));
}
function cR(T) {
  var E;
  const R = [];
  for (let A = 0; A < T.length; A++) {
    const S = T[A];
    if (($.ARRAY(S) || $.STRUCT(S)) && ((E = T[A + 1]) === null || E === void 0 ? void 0 : E.text) === "<") {
      const r = uR(T, A + 1), n = T.slice(A, r + 1);
      R.push({
        type: s.IDENTIFIER,
        raw: n.map(wE("raw")).join(""),
        text: n.map(wE("text")).join(""),
        start: S.start
      }), A = r;
    } else
      R.push(S);
  }
  return R;
}
const wE = (T) => (E) => E.type === s.IDENTIFIER || E.type === s.COMMA ? E[T] + " " : E[T];
function uR(T, E) {
  let R = 0;
  for (let A = E; A < T.length; A++) {
    const S = T[A];
    if (S.text === "<" ? R++ : S.text === ">" ? R-- : S.text === ">>" && (R -= 2), R === 0)
      return A;
  }
  return T.length - 1;
}
const HR = [
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
], BR = [
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
], FR = [
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
], pR = e([
  "SELECT [DISTINCT]",
  // https://clickhouse.com/docs/sql-reference/statements/alter/view
  "MODIFY QUERY SELECT [DISTINCT]"
]), dR = e([
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
]), JE = e([
  // https://clickhouse.com/docs/sql-reference/statements/create
  "CREATE [OR REPLACE] [TEMPORARY] TABLE [IF NOT EXISTS]"
]), nE = e([
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
]), YR = e([
  // https://clickhouse.com/docs/sql-reference/statements/select/union
  "UNION [ALL | DISTINCT]",
  // https://clickhouse.com/docs/sql-reference/statements/parallel_with
  "PARALLEL WITH"
]), mR = e([
  // https://clickhouse.com/docs/sql-reference/statements/select/join
  "[GLOBAL] [INNER|LEFT|RIGHT|FULL|CROSS] [OUTER|SEMI|ANTI|ANY|ALL|ASOF] JOIN",
  // https://clickhouse.com/docs/sql-reference/statements/select/array-join
  "[LEFT] ARRAY JOIN"
]), hR = e([
  "{ROWS | RANGE} BETWEEN",
  "ALTER MATERIALIZE STATISTICS"
]), VR = {
  name: "clickhouse",
  tokenizerOptions: {
    reservedSelect: pR,
    reservedClauses: [...dR, ...JE, ...nE],
    reservedSetOperations: YR,
    reservedJoins: mR,
    reservedKeywordPhrases: hR,
    reservedKeywords: BR,
    reservedDataTypes: FR,
    reservedFunctionNames: HR,
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
          key: (T) => {
            const E = /\{([^:]+):/.exec(T);
            return E ? E[1].trim() : T;
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
    postProcess: WR
  },
  formatOptions: {
    onelineClauses: [...JE, ...nE],
    tabularOnelineClauses: nE
  }
};
function WR(T) {
  return T.map((E, R) => {
    const A = T[R + 1] || x, S = T[R - 1] || x;
    return E.type === s.RESERVED_SELECT && (A.type === s.COMMA || S.type === s.RESERVED_CLAUSE || S.type === s.COMMA) ? Object.assign(Object.assign({}, E), { type: s.RESERVED_KEYWORD }) : $.SET(E) && A.type === s.OPEN_PAREN ? Object.assign(Object.assign({}, E), { type: s.RESERVED_FUNCTION_NAME }) : E;
  });
}
const fR = [
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
], yR = [
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
], gR = [
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
], XR = e(["SELECT [ALL | DISTINCT]"]), bR = e([
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
]), QE = e([
  "CREATE [GLOBAL TEMPORARY | EXTERNAL] TABLE [IF NOT EXISTS]"
]), iE = e([
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
]), KR = e(["UNION [ALL]", "EXCEPT [ALL]", "INTERSECT [ALL]"]), vR = e([
  "JOIN",
  "{LEFT | RIGHT | FULL} [OUTER] JOIN",
  "{INNER | CROSS} JOIN"
]), xR = e([
  "ON DELETE",
  "ON UPDATE",
  "SET NULL",
  "{ROWS | RANGE} BETWEEN"
]), $R = e([]), wR = {
  name: "db2",
  tokenizerOptions: {
    reservedSelect: XR,
    reservedClauses: [...bR, ...QE, ...iE],
    reservedSetOperations: KR,
    reservedJoins: vR,
    reservedKeywordPhrases: xR,
    reservedDataTypePhrases: $R,
    reservedKeywords: yR,
    reservedDataTypes: gR,
    reservedFunctionNames: fR,
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
    onelineClauses: [...QE, ...iE],
    tabularOnelineClauses: iE
  }
}, JR = [
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
], QR = [
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
], ZR = [
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
], qR = e(["SELECT [ALL | DISTINCT]"]), kR = e([
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
]), ZE = e(["CREATE [OR REPLACE] TABLE"]), DE = e([
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
]), jR = e(["UNION [ALL]", "EXCEPT [ALL]", "INTERSECT [ALL]"]), zR = e([
  "JOIN",
  "{LEFT | RIGHT | FULL} [OUTER] JOIN",
  "[LEFT | RIGHT] EXCEPTION JOIN",
  "{INNER | CROSS} JOIN"
]), EA = e([
  "ON DELETE",
  "ON UPDATE",
  "SET NULL",
  "{ROWS | RANGE} BETWEEN"
]), TA = e([]), RA = {
  name: "db2i",
  tokenizerOptions: {
    reservedSelect: qR,
    reservedClauses: [...kR, ...ZE, ...DE],
    reservedSetOperations: jR,
    reservedJoins: zR,
    reservedKeywordPhrases: EA,
    reservedDataTypePhrases: TA,
    reservedKeywords: QR,
    reservedDataTypes: ZR,
    reservedFunctionNames: JR,
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
    onelineClauses: [...ZE, ...DE],
    tabularOnelineClauses: DE
  }
}, AA = [
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
], eA = [
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
], SA = [
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
], IA = e(["SELECT [ALL | DISTINCT]"]), OA = e([
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
]), qE = e([
  "CREATE [OR REPLACE] [TEMPORARY | TEMP] TABLE [IF NOT EXISTS]"
]), oE = e([
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
]), NA = e([
  "UNION [ALL | BY NAME]",
  "EXCEPT [ALL]",
  "INTERSECT [ALL]"
]), tA = e([
  "JOIN",
  "{LEFT | RIGHT | FULL} [OUTER] JOIN",
  "{INNER | CROSS} JOIN",
  "{NATURAL | ASOF} [INNER] JOIN",
  "{NATURAL | ASOF} {LEFT | RIGHT | FULL} [OUTER] JOIN",
  "POSITIONAL JOIN",
  "ANTI JOIN",
  "SEMI JOIN"
]), sA = e([
  "{ROWS | RANGE | GROUPS} BETWEEN",
  "SIMILAR TO",
  "IS [NOT] DISTINCT FROM"
]), LA = e(["TIMESTAMP WITH TIME ZONE"]), CA = {
  name: "duckdb",
  tokenizerOptions: {
    reservedSelect: IA,
    reservedClauses: [...OA, ...qE, ...oE],
    reservedSetOperations: NA,
    reservedJoins: tA,
    reservedKeywordPhrases: sA,
    reservedDataTypePhrases: LA,
    supportsXor: !0,
    reservedKeywords: eA,
    reservedDataTypes: SA,
    reservedFunctionNames: AA,
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
    onelineClauses: [...qE, ...oE],
    tabularOnelineClauses: oE
  }
}, rA = [
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
], _A = [
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
], aA = [
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
], nA = e(["SELECT [ALL | DISTINCT]"]), iA = e([
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
]), kE = e([
  "CREATE [TEMPORARY] [EXTERNAL] TABLE [IF NOT EXISTS]"
]), PE = e([
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
]), DA = e(["UNION [ALL | DISTINCT]"]), oA = e([
  "JOIN",
  "{LEFT | RIGHT | FULL} [OUTER] JOIN",
  "{INNER | CROSS} JOIN",
  // non-standard joins
  "LEFT SEMI JOIN"
]), PA = e(["{ROWS | RANGE} BETWEEN"]), MA = e([]), UA = {
  name: "hive",
  tokenizerOptions: {
    reservedSelect: nA,
    reservedClauses: [...iA, ...kE, ...PE],
    reservedSetOperations: DA,
    reservedJoins: oA,
    reservedKeywordPhrases: PA,
    reservedDataTypePhrases: MA,
    reservedKeywords: _A,
    reservedDataTypes: aA,
    reservedFunctionNames: rA,
    extraParens: ["[]"],
    stringTypes: ['""-bs', "''-bs"],
    identTypes: ["``"],
    variableTypes: [{ quote: "{}", prefixes: ["$"], requirePrefix: !0 }],
    operators: ["%", "~", "^", "|", "&", "<=>", "==", "!", "||"]
  },
  formatOptions: {
    onelineClauses: [...kE, ...PE],
    tabularOnelineClauses: PE
  }
};
function LE(T) {
  return T.map((E, R) => {
    const A = T[R + 1] || x;
    if ($.SET(E) && A.text === "(")
      return Object.assign(Object.assign({}, E), { type: s.RESERVED_FUNCTION_NAME });
    const S = T[R - 1] || x;
    return $.VALUES(E) && S.text === "=" ? Object.assign(Object.assign({}, E), { type: s.RESERVED_FUNCTION_NAME }) : E;
  });
}
const lA = [
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
], GA = [
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
], cA = [
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
], uA = e(["SELECT [ALL | DISTINCT | DISTINCTROW]"]), HA = e([
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
]), jE = e([
  "CREATE [OR REPLACE] [TEMPORARY] TABLE [IF NOT EXISTS]"
]), ME = e([
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
]), BA = e([
  "UNION [ALL | DISTINCT]",
  "EXCEPT [ALL | DISTINCT]",
  "INTERSECT [ALL | DISTINCT]",
  "MINUS [ALL | DISTINCT]"
]), FA = e([
  "JOIN",
  "{LEFT | RIGHT} [OUTER] JOIN",
  "{INNER | CROSS} JOIN",
  "NATURAL JOIN",
  "NATURAL {LEFT | RIGHT} [OUTER] JOIN",
  // non-standard joins
  "STRAIGHT_JOIN"
]), pA = e([
  "ON {UPDATE | DELETE} [SET NULL | SET DEFAULT]",
  "CHARACTER SET",
  "{ROWS | RANGE} BETWEEN",
  "IDENTIFIED BY"
]), dA = e([]), YA = {
  name: "mariadb",
  tokenizerOptions: {
    reservedSelect: uA,
    reservedClauses: [...HA, ...jE, ...ME],
    reservedSetOperations: BA,
    reservedJoins: FA,
    reservedKeywordPhrases: pA,
    reservedDataTypePhrases: dA,
    supportsXor: !0,
    reservedKeywords: lA,
    reservedDataTypes: GA,
    reservedFunctionNames: cA,
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
    postProcess: LE
  },
  formatOptions: {
    onelineClauses: [...jE, ...ME],
    tabularOnelineClauses: ME
  }
}, mA = [
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
], hA = [
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
], VA = [
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
], WA = e(["SELECT [ALL | DISTINCT | DISTINCTROW]"]), fA = e([
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
]), zE = e(["CREATE [TEMPORARY] TABLE [IF NOT EXISTS]"]), UE = e([
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
]), yA = e(["UNION [ALL | DISTINCT]"]), gA = e([
  "JOIN",
  "{LEFT | RIGHT} [OUTER] JOIN",
  "{INNER | CROSS} JOIN",
  "NATURAL [INNER] JOIN",
  "NATURAL {LEFT | RIGHT} [OUTER] JOIN",
  // non-standard joins
  "STRAIGHT_JOIN"
]), XA = e([
  "ON {UPDATE | DELETE} [SET NULL]",
  "CHARACTER SET",
  "{ROWS | RANGE} BETWEEN",
  "IDENTIFIED BY"
]), bA = e([]), KA = {
  name: "mysql",
  tokenizerOptions: {
    reservedSelect: WA,
    reservedClauses: [...fA, ...zE, ...UE],
    reservedSetOperations: yA,
    reservedJoins: gA,
    reservedKeywordPhrases: XA,
    reservedDataTypePhrases: bA,
    supportsXor: !0,
    reservedKeywords: mA,
    reservedDataTypes: hA,
    reservedFunctionNames: VA,
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
    postProcess: LE
  },
  formatOptions: {
    onelineClauses: [...zE, ...UE],
    tabularOnelineClauses: UE
  }
}, vA = [
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
], xA = [
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
], $A = [
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
], wA = e(["SELECT [ALL | DISTINCT | DISTINCTROW]"]), JA = e([
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
]), ET = e(["CREATE [TEMPORARY] TABLE [IF NOT EXISTS]"]), lE = e([
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
]), QA = e(["UNION [ALL | DISTINCT]"]), ZA = e([
  "JOIN",
  "{LEFT | RIGHT} [OUTER] JOIN",
  "{INNER | CROSS} JOIN",
  "NATURAL [INNER] JOIN",
  "NATURAL {LEFT | RIGHT} [OUTER] JOIN",
  // non-standard joins
  "STRAIGHT_JOIN"
]), qA = e([
  "ON {UPDATE | DELETE} [SET NULL]",
  "CHARACTER SET",
  "{ROWS | RANGE} BETWEEN",
  "IDENTIFIED BY"
]), kA = e([]), jA = {
  name: "tidb",
  tokenizerOptions: {
    reservedSelect: wA,
    reservedClauses: [...JA, ...ET, ...lE],
    reservedSetOperations: QA,
    reservedJoins: ZA,
    reservedKeywordPhrases: qA,
    reservedDataTypePhrases: kA,
    supportsXor: !0,
    reservedKeywords: vA,
    reservedDataTypes: xA,
    reservedFunctionNames: $A,
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
    postProcess: LE
  },
  formatOptions: {
    onelineClauses: [...ET, ...lE],
    tabularOnelineClauses: lE
  }
}, zA = [
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
], Ee = [
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
], Te = [
  // N1QL does not support any way of declaring types for columns.
  // It does not support the CREATE TABLE statement nor the CAST() expression.
  //
  // It does have several keywords like ARRAY and OBJECT, which seem to refer to types,
  // but they are used as operators. It also reserves several words like STRING and NUMBER,
  // which it actually doesn't use.
  //
  // https://docs.couchbase.com/server/current/n1ql/n1ql-language-reference/datatypes.html
], Re = e(["SELECT [ALL | DISTINCT]"]), Ae = e([
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
]), TT = e([
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
]), ee = e(["UNION [ALL]", "EXCEPT [ALL]", "INTERSECT [ALL]"]), Se = e(["JOIN", "{LEFT | RIGHT} [OUTER] JOIN", "INNER JOIN"]), Ie = e(["{ROWS | RANGE | GROUPS} BETWEEN"]), Oe = e([]), Ne = {
  name: "n1ql",
  tokenizerOptions: {
    reservedSelect: Re,
    reservedClauses: [...Ae, ...TT],
    reservedSetOperations: ee,
    reservedJoins: Se,
    reservedKeywordPhrases: Ie,
    reservedDataTypePhrases: Oe,
    supportsXor: !0,
    reservedKeywords: Ee,
    reservedDataTypes: Te,
    reservedFunctionNames: zA,
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
    onelineClauses: TT
  }
}, te = [
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
], se = [
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
], Le = [
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
], Ce = e(["SELECT [ALL | DISTINCT | UNIQUE]"]), re = e([
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
]), RT = e([
  "CREATE [GLOBAL TEMPORARY | PRIVATE TEMPORARY | SHARDED | DUPLICATED | IMMUTABLE BLOCKCHAIN | BLOCKCHAIN | IMMUTABLE] TABLE"
]), GE = e([
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
]), _e = e(["UNION [ALL]", "MINUS", "INTERSECT"]), ae = e([
  "JOIN",
  "{LEFT | RIGHT | FULL} [OUTER] JOIN",
  "{INNER | CROSS} JOIN",
  "NATURAL [INNER] JOIN",
  "NATURAL {LEFT | RIGHT | FULL} [OUTER] JOIN",
  // non-standard joins
  "{CROSS | OUTER} APPLY"
]), ne = e([
  "ON {UPDATE | DELETE} [SET NULL]",
  "ON COMMIT",
  "{ROWS | RANGE} BETWEEN"
]), ie = e([]), De = {
  name: "plsql",
  tokenizerOptions: {
    reservedSelect: Ce,
    reservedClauses: [...re, ...RT, ...GE],
    reservedSetOperations: _e,
    reservedJoins: ae,
    reservedKeywordPhrases: ne,
    reservedDataTypePhrases: ie,
    supportsXor: !0,
    reservedKeywords: te,
    reservedDataTypes: se,
    reservedFunctionNames: Le,
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
    postProcess: oe
  },
  formatOptions: {
    alwaysDenseOperators: ["@"],
    onelineClauses: [...RT, ...GE],
    tabularOnelineClauses: GE
  }
};
function oe(T) {
  let E = x;
  return T.map((R) => $.SET(R) && $.BY(E) ? Object.assign(Object.assign({}, R), { type: s.RESERVED_KEYWORD }) : (pT(R.type) && (E = R), R));
}
const Pe = [
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
], Me = [
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
], Ue = [
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
], le = e(["SELECT [ALL | DISTINCT]"]), Ge = e([
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
]), AT = e([
  "CREATE [GLOBAL | LOCAL] [TEMPORARY | TEMP | UNLOGGED] TABLE [IF NOT EXISTS]"
]), cE = e([
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
]), ce = e([
  "UNION [ALL | DISTINCT]",
  "EXCEPT [ALL | DISTINCT]",
  "INTERSECT [ALL | DISTINCT]"
]), ue = e([
  "JOIN",
  "{LEFT | RIGHT | FULL} [OUTER] JOIN",
  "{INNER | CROSS} JOIN",
  "NATURAL [INNER] JOIN",
  "NATURAL {LEFT | RIGHT | FULL} [OUTER] JOIN"
]), He = e([
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
]), Be = e([
  // https://www.postgresql.org/docs/current/datatype-datetime.html
  "[TIMESTAMP | TIME] {WITH | WITHOUT} TIME ZONE"
]), Fe = {
  name: "postgresql",
  tokenizerOptions: {
    reservedSelect: le,
    reservedClauses: [...Ge, ...AT, ...cE],
    reservedSetOperations: ce,
    reservedJoins: ue,
    reservedKeywordPhrases: He,
    reservedDataTypePhrases: Be,
    reservedKeywords: Me,
    reservedDataTypes: Ue,
    reservedFunctionNames: Pe,
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
    onelineClauses: [...AT, ...cE],
    tabularOnelineClauses: cE
  }
}, pe = [
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
], de = [
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
], Ye = [
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
], me = e(["SELECT [ALL | DISTINCT]"]), he = e([
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
]), eT = e([
  "CREATE [TEMPORARY | TEMP | LOCAL TEMPORARY | LOCAL TEMP] TABLE [IF NOT EXISTS]"
]), uE = e([
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
]), Ve = e(["UNION [ALL]", "EXCEPT", "INTERSECT", "MINUS"]), We = e([
  "JOIN",
  "{LEFT | RIGHT | FULL} [OUTER] JOIN",
  "{INNER | CROSS} JOIN",
  "NATURAL [INNER] JOIN",
  "NATURAL {LEFT | RIGHT | FULL} [OUTER] JOIN"
]), fe = e([
  // https://docs.aws.amazon.com/redshift/latest/dg/copy-parameters-data-conversion.html
  "NULL AS",
  // https://docs.aws.amazon.com/redshift/latest/dg/r_CREATE_EXTERNAL_SCHEMA.html
  "DATA CATALOG",
  "HIVE METASTORE",
  // in window specifications
  "{ROWS | RANGE} BETWEEN"
]), ye = e([]), ge = {
  name: "redshift",
  tokenizerOptions: {
    reservedSelect: me,
    reservedClauses: [...he, ...eT, ...uE],
    reservedSetOperations: Ve,
    reservedJoins: We,
    reservedKeywordPhrases: fe,
    reservedDataTypePhrases: ye,
    reservedKeywords: de,
    reservedDataTypes: Ye,
    reservedFunctionNames: pe,
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
    onelineClauses: [...eT, ...uE],
    tabularOnelineClauses: uE
  }
}, Xe = [
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
], be = [
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
], Ke = [
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
], ve = e(["SELECT [ALL | DISTINCT]"]), xe = e([
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
]), ST = e(["CREATE [EXTERNAL] TABLE [IF NOT EXISTS]"]), HE = e([
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
]), $e = e([
  "UNION [ALL | DISTINCT]",
  "EXCEPT [ALL | DISTINCT]",
  "INTERSECT [ALL | DISTINCT]"
]), we = e([
  "JOIN",
  "{LEFT | RIGHT | FULL} [OUTER] JOIN",
  "{INNER | CROSS} JOIN",
  "NATURAL [INNER] JOIN",
  "NATURAL {LEFT | RIGHT | FULL} [OUTER] JOIN",
  // non-standard-joins
  "[LEFT] {ANTI | SEMI} JOIN",
  "NATURAL [LEFT] {ANTI | SEMI} JOIN"
]), Je = e([
  "ON DELETE",
  "ON UPDATE",
  "CURRENT ROW",
  "{ROWS | RANGE} BETWEEN"
]), Qe = e([]), Ze = {
  name: "spark",
  tokenizerOptions: {
    reservedSelect: ve,
    reservedClauses: [...xe, ...ST, ...HE],
    reservedSetOperations: $e,
    reservedJoins: we,
    reservedKeywordPhrases: Je,
    reservedDataTypePhrases: Qe,
    supportsXor: !0,
    reservedKeywords: Xe,
    reservedDataTypes: be,
    reservedFunctionNames: Ke,
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
    postProcess: qe
  },
  formatOptions: {
    onelineClauses: [...ST, ...HE],
    tabularOnelineClauses: HE
  }
};
function qe(T) {
  return T.map((E, R) => {
    const A = T[R - 1] || x, S = T[R + 1] || x;
    return $.WINDOW(E) && S.type === s.OPEN_PAREN ? Object.assign(Object.assign({}, E), { type: s.RESERVED_FUNCTION_NAME }) : E.text === "ITEMS" && E.type === s.RESERVED_KEYWORD && !(A.text === "COLLECTION" && S.text === "TERMINATED") ? Object.assign(Object.assign({}, E), { type: s.IDENTIFIER, text: E.raw }) : E;
  });
}
const ke = [
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
], je = [
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
], ze = [
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
], ES = e(["SELECT [ALL | DISTINCT]"]), TS = e([
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
]), IT = e(["CREATE [TEMPORARY | TEMP] TABLE [IF NOT EXISTS]"]), BE = e([
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
]), RS = e(["UNION [ALL]", "EXCEPT", "INTERSECT"]), AS = e([
  "JOIN",
  "{LEFT | RIGHT | FULL} [OUTER] JOIN",
  "{INNER | CROSS} JOIN",
  "NATURAL [INNER] JOIN",
  "NATURAL {LEFT | RIGHT | FULL} [OUTER] JOIN"
]), eS = e([
  "ON {UPDATE | DELETE} [SET NULL | SET DEFAULT]",
  "{ROWS | RANGE | GROUPS} BETWEEN",
  "DO UPDATE"
]), SS = e([]), IS = {
  name: "sqlite",
  tokenizerOptions: {
    reservedSelect: ES,
    reservedClauses: [...TS, ...IT, ...BE],
    reservedSetOperations: RS,
    reservedJoins: AS,
    reservedKeywordPhrases: eS,
    reservedDataTypePhrases: SS,
    reservedKeywords: je,
    reservedDataTypes: ze,
    reservedFunctionNames: ke,
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
    onelineClauses: [...IT, ...BE],
    tabularOnelineClauses: BE
  }
}, OS = [
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
], NS = [
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
], tS = [
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
], sS = e(["SELECT [ALL | DISTINCT]"]), LS = e([
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
]), OT = e(["CREATE [GLOBAL TEMPORARY | LOCAL TEMPORARY] TABLE"]), FE = e([
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
]), CS = e([
  "UNION [ALL | DISTINCT]",
  "EXCEPT [ALL | DISTINCT]",
  "INTERSECT [ALL | DISTINCT]"
]), rS = e([
  "JOIN",
  "{LEFT | RIGHT | FULL} [OUTER] JOIN",
  "{INNER | CROSS} JOIN",
  "NATURAL [INNER] JOIN",
  "NATURAL {LEFT | RIGHT | FULL} [OUTER] JOIN"
]), _S = e([
  "ON {UPDATE | DELETE} [SET NULL | SET DEFAULT]",
  "{ROWS | RANGE} BETWEEN"
]), aS = e([]), nS = {
  name: "sql",
  tokenizerOptions: {
    reservedSelect: sS,
    reservedClauses: [...LS, ...OT, ...FE],
    reservedSetOperations: CS,
    reservedJoins: rS,
    reservedKeywordPhrases: _S,
    reservedDataTypePhrases: aS,
    reservedKeywords: NS,
    reservedDataTypes: tS,
    reservedFunctionNames: OS,
    stringTypes: [
      { quote: "''-qq-bs", prefixes: ["N", "U&"] },
      { quote: "''-raw", prefixes: ["X"], requirePrefix: !0 }
    ],
    identTypes: ['""-qq', "``"],
    paramTypes: { positional: !0 },
    operators: ["||"]
  },
  formatOptions: {
    onelineClauses: [...OT, ...FE],
    tabularOnelineClauses: FE
  }
}, iS = [
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
], DS = [
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
], oS = [
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
], PS = e(["SELECT [ALL | DISTINCT]"]), MS = e([
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
]), NT = e(["CREATE TABLE [IF NOT EXISTS]"]), pE = e([
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
]), US = e([
  "UNION [ALL | DISTINCT]",
  "EXCEPT [ALL | DISTINCT]",
  "INTERSECT [ALL | DISTINCT]"
]), lS = e([
  "JOIN",
  "{LEFT | RIGHT | FULL} [OUTER] JOIN",
  "{INNER | CROSS} JOIN",
  "NATURAL [INNER] JOIN",
  "NATURAL {LEFT | RIGHT | FULL} [OUTER] JOIN"
]), GS = e([
  "{ROWS | RANGE | GROUPS} BETWEEN",
  // comparison operator
  "IS [NOT] DISTINCT FROM"
]), cS = e([]), uS = {
  name: "trino",
  tokenizerOptions: {
    reservedSelect: PS,
    reservedClauses: [...MS, ...NT, ...pE],
    reservedSetOperations: US,
    reservedJoins: lS,
    reservedKeywordPhrases: GS,
    reservedDataTypePhrases: cS,
    reservedKeywords: DS,
    reservedDataTypes: oS,
    reservedFunctionNames: iS,
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
    onelineClauses: [...NT, ...pE],
    tabularOnelineClauses: pE
  }
}, HS = [
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
], BS = [
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
], FS = [
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
], pS = e(["SELECT [ALL | DISTINCT]"]), dS = e([
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
]), tT = e(["CREATE TABLE"]), dE = e([
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
]), YS = e(["UNION [ALL]", "EXCEPT", "INTERSECT"]), mS = e([
  "JOIN",
  "{LEFT | RIGHT | FULL} [OUTER] JOIN",
  "{INNER | CROSS} JOIN",
  // non-standard joins
  "{CROSS | OUTER} APPLY"
]), hS = e([
  "ON {UPDATE | DELETE} [SET NULL | SET DEFAULT]",
  "{ROWS | RANGE} BETWEEN"
]), VS = e([]), WS = {
  name: "transactsql",
  tokenizerOptions: {
    reservedSelect: pS,
    reservedClauses: [...dS, ...tT, ...dE],
    reservedSetOperations: YS,
    reservedJoins: mS,
    reservedKeywordPhrases: hS,
    reservedDataTypePhrases: VS,
    reservedKeywords: BS,
    reservedDataTypes: FS,
    reservedFunctionNames: HS,
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
    onelineClauses: [...tT, ...dE],
    tabularOnelineClauses: dE
  }
}, fS = [
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
], yS = [
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
], gS = [
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
], XS = e(["SELECT [ALL | DISTINCT | DISTINCTROW]"]), bS = e([
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
]), sT = e([
  "CREATE [ROWSTORE] [REFERENCE | TEMPORARY | GLOBAL TEMPORARY] TABLE [IF NOT EXISTS]"
]), YE = e([
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
]), KS = e([
  "UNION [ALL | DISTINCT]",
  "EXCEPT",
  "INTERSECT",
  "MINUS"
]), vS = e([
  "JOIN",
  "{LEFT | RIGHT | FULL} [OUTER] JOIN",
  "{INNER | CROSS} JOIN",
  "NATURAL {LEFT | RIGHT} [OUTER] JOIN",
  // non-standard joins
  "STRAIGHT_JOIN"
]), xS = e([
  "ON DELETE",
  "ON UPDATE",
  "CHARACTER SET",
  "{ROWS | RANGE} BETWEEN",
  "IDENTIFIED BY"
]), $S = e([]), wS = {
  name: "singlestoredb",
  tokenizerOptions: {
    reservedSelect: XS,
    reservedClauses: [...bS, ...sT, ...YE],
    reservedSetOperations: KS,
    reservedJoins: vS,
    reservedKeywordPhrases: xS,
    reservedDataTypePhrases: $S,
    reservedKeywords: fS,
    reservedDataTypes: yS,
    reservedFunctionNames: gS,
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
    postProcess: LE
  },
  formatOptions: {
    alwaysDenseOperators: ["::", "::$", "::%"],
    onelineClauses: [...sT, ...YE],
    tabularOnelineClauses: YE
  }
}, JS = [
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
], QS = [
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
], ZS = [
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
], qS = e(["SELECT [ALL | DISTINCT]"]), kS = e([
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
]), LT = e([
  "CREATE [OR REPLACE] [VOLATILE] TABLE [IF NOT EXISTS]",
  "CREATE [OR REPLACE] [LOCAL | GLOBAL] {TEMP|TEMPORARY} TABLE [IF NOT EXISTS]"
]), mE = e([
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
]), jS = e(["UNION [ALL]", "MINUS", "EXCEPT", "INTERSECT"]), zS = e([
  "[INNER] JOIN",
  "[NATURAL] {LEFT | RIGHT | FULL} [OUTER] JOIN",
  "{CROSS | NATURAL} JOIN"
]), EI = e([
  "{ROWS | RANGE} BETWEEN",
  "ON {UPDATE | DELETE} [SET NULL | SET DEFAULT]"
]), TI = e([]), RI = {
  name: "snowflake",
  tokenizerOptions: {
    reservedSelect: qS,
    reservedClauses: [...kS, ...LT, ...mE],
    reservedSetOperations: jS,
    reservedJoins: zS,
    reservedKeywordPhrases: EI,
    reservedDataTypePhrases: TI,
    reservedKeywords: QS,
    reservedDataTypes: ZS,
    reservedFunctionNames: JS,
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
    onelineClauses: [...LT, ...mE],
    tabularOnelineClauses: mE
  }
}, AI = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  bigquery: UR,
  clickhouse: VR,
  db2: wR,
  db2i: RA,
  duckdb: CA,
  hive: UA,
  mariadb: YA,
  mysql: KA,
  n1ql: Ne,
  plsql: De,
  postgresql: Fe,
  redshift: ge,
  singlestoredb: wS,
  snowflake: RI,
  spark: Ze,
  sql: nS,
  sqlite: IS,
  tidb: jA,
  transactsql: WS,
  trino: uS
}, Symbol.toStringTag, { value: "Module" })), z = (T) => T[T.length - 1], dT = (T) => T.sort((E, R) => R.length - E.length || E.localeCompare(R)), SE = (T) => T.replace(/\s+/gu, " "), hE = (T) => /\n/.test(T), g = (T) => T.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), CT = /\s+/uy, J = (T) => new RegExp(`(?:${T})`, "uy"), eI = (T) => T.split("").map((E) => / /gu.test(E) ? "\\s+" : `[${E.toUpperCase()}${E.toLowerCase()}]`).join(""), SI = (T) => T + "(?:-" + T + ")*", II = ({ prefixes: T, requirePrefix: E }) => `(?:${T.map(eI).join("|")}${E ? "" : "|"})`, OI = (T) => new RegExp(`(?:${T.map(g).join("|")}).*?(?=\r
|\r|
|$)`, "uy"), rT = (T, E = []) => {
  const R = T === "open" ? 0 : 1, A = ["()", ...E].map((S) => S[R]);
  return J(A.map(g).join("|"));
}, _T = (T) => J(`${dT(T).map(g).join("|")}`), NI = ({ rest: T, dashes: E }) => T || E ? `(?![${T || ""}${E ? "-" : ""}])` : "", b = (T, E = {}) => {
  if (T.length === 0)
    return /^\b$/u;
  const R = NI(E), A = dT(T).map(g).join("|").replace(/ /gu, "\\s+");
  return new RegExp(`(?:${A})${R}\\b`, "iuy");
}, VE = (T, E) => {
  if (!T.length)
    return;
  const R = T.map(g).join("|");
  return J(`(?:${R})(?:${E})`);
}, tI = () => {
  const T = {
    "<": ">",
    "[": "]",
    "(": ")",
    "{": "}"
  }, E = "{left}(?:(?!{right}').)*?{right}", R = Object.entries(T).map(([n, C]) => E.replace(/{left}/g, g(n)).replace(/{right}/g, g(C))), A = g(Object.keys(T).join(""));
  return `[Qq]'(?:${String.raw`(?<tag>[^\s${A}])(?:(?!\k<tag>').)*?\k<tag>`}|${R.join("|")})'`;
}, aT = {
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
  "q''": tI()
}, YT = (T) => typeof T == "string" ? aT[T] : "regex" in T ? T.regex : II(T) + aT[T.quote], sI = (T) => J(T.map((E) => "regex" in E ? E.regex : YT(E)).join("|")), mT = (T) => T.map(YT).join("|"), nT = (T) => J(mT(T)), LI = (T = {}) => J(hT(T)), hT = ({ first: T, rest: E, dashes: R, allowFirstCharNumber: A } = {}) => {
  const S = "\\p{Alphabetic}\\p{Mark}_", r = "\\p{Decimal_Number}", n = g(T ?? ""), C = g(E ?? ""), M = A ? `[${S}${r}${n}][${S}${r}${C}]*` : `[${S}${n}][${S}${r}${C}]*`;
  return R ? SI(M) : M;
};
function VT(T, E) {
  const R = T.slice(0, E).split(/\n/);
  return { line: R.length, col: R[R.length - 1].length + 1 };
}
class CI {
  constructor(E, R) {
    this.rules = E, this.dialectName = R, this.input = "", this.index = 0;
  }
  /**
   * Takes a SQL string and breaks it into tokens.
   * Each token is an object with type and value.
   *
   * @param {string} input - The SQL string
   * @returns {Token[]} output token stream
   */
  tokenize(E) {
    this.input = E, this.index = 0;
    const R = [];
    let A;
    for (; this.index < this.input.length; ) {
      const S = this.getWhitespace();
      if (this.index < this.input.length) {
        if (A = this.getNextToken(), !A)
          throw this.createParseError();
        R.push(Object.assign(Object.assign({}, A), { precedingWhitespace: S }));
      }
    }
    return R;
  }
  createParseError() {
    const E = this.input.slice(this.index, this.index + 10), { line: R, col: A } = VT(this.input, this.index);
    return new Error(`Parse error: Unexpected "${E}" at line ${R} column ${A}.
${this.dialectInfo()}`);
  }
  dialectInfo() {
    return this.dialectName === "sql" ? `This likely happens because you're using the default "sql" dialect.
If possible, please select a more specific dialect (like sqlite, postgresql, etc).` : `SQL dialect used: "${this.dialectName}".`;
  }
  getWhitespace() {
    CT.lastIndex = this.index;
    const E = CT.exec(this.input);
    if (E)
      return this.index += E[0].length, E[0];
  }
  getNextToken() {
    for (const E of this.rules) {
      const R = this.match(E);
      if (R)
        return R;
    }
  }
  // Attempts to match token rule regex at current position in input
  match(E) {
    E.regex.lastIndex = this.index;
    const R = E.regex.exec(this.input);
    if (R) {
      const A = R[0], S = {
        type: E.type,
        raw: A,
        text: E.text ? E.text(A) : A,
        start: this.index
      };
      return E.key && (S.key = E.key(A)), this.index += A.length, S;
    }
  }
}
const iT = /\/\*/uy, rI = /[\s\S]/uy, _I = /\*\//uy;
class aI {
  constructor() {
    this.lastIndex = 0;
  }
  exec(E) {
    let R = "", A, S = 0;
    if (A = this.matchSection(iT, E))
      R += A, S++;
    else
      return null;
    for (; S > 0; )
      if (A = this.matchSection(iT, E))
        R += A, S++;
      else if (A = this.matchSection(_I, E))
        R += A, S--;
      else if (A = this.matchSection(rI, E))
        R += A;
      else
        return null;
    return [R];
  }
  matchSection(E, R) {
    E.lastIndex = this.lastIndex;
    const A = E.exec(R);
    return A && (this.lastIndex += A[0].length), A ? A[0] : null;
  }
}
class nI {
  constructor(E, R) {
    this.cfg = E, this.dialectName = R, this.rulesBeforeParams = this.buildRulesBeforeParams(E), this.rulesAfterParams = this.buildRulesAfterParams(E);
  }
  tokenize(E, R) {
    const A = [
      ...this.rulesBeforeParams,
      ...this.buildParamRules(this.cfg, R),
      ...this.rulesAfterParams
    ], S = new CI(A, this.dialectName).tokenize(E);
    return this.cfg.postProcess ? this.cfg.postProcess(S) : S;
  }
  // These rules can be cached as they only depend on
  // the Tokenizer config options specified for each SQL dialect
  buildRulesBeforeParams(E) {
    var R, A, S;
    return this.validRules([
      {
        type: s.DISABLE_COMMENT,
        regex: /(\/\* *sql-formatter-disable *\*\/[\s\S]*?(?:\/\* *sql-formatter-enable *\*\/|$))/uy
      },
      {
        type: s.BLOCK_COMMENT,
        regex: E.nestedBlockComments ? new aI() : /(\/\*[^]*?\*\/)/uy
      },
      {
        type: s.LINE_COMMENT,
        regex: OI((R = E.lineCommentTypes) !== null && R !== void 0 ? R : ["--"])
      },
      {
        type: s.QUOTED_IDENTIFIER,
        regex: nT(E.identTypes)
      },
      {
        type: s.NUMBER,
        regex: E.underscoresInNumbers ? /(?:0x[0-9a-fA-F_]+|0b[01_]+|(?:-\s*)?(?:[0-9_]*\.[0-9_]+|[0-9_]+(?:\.[0-9_]*)?)(?:[eE][-+]?[0-9_]+(?:\.[0-9_]+)?)?)(?![\w\p{Alphabetic}])/uy : /(?:0x[0-9a-fA-F]+|0b[01]+|(?:-\s*)?(?:[0-9]*\.[0-9]+|[0-9]+(?:\.[0-9]*)?)(?:[eE][-+]?[0-9]+(?:\.[0-9]+)?)?)(?![\w\p{Alphabetic}])/uy
      },
      // RESERVED_KEYWORD_PHRASE and RESERVED_DATA_TYPE_PHRASE  is matched before all other keyword tokens
      // to e.g. prioritize matching "TIMESTAMP WITH TIME ZONE" phrase over "WITH" clause.
      {
        type: s.RESERVED_KEYWORD_PHRASE,
        regex: b((A = E.reservedKeywordPhrases) !== null && A !== void 0 ? A : [], E.identChars),
        text: m
      },
      {
        type: s.RESERVED_DATA_TYPE_PHRASE,
        regex: b((S = E.reservedDataTypePhrases) !== null && S !== void 0 ? S : [], E.identChars),
        text: m
      },
      {
        type: s.CASE,
        regex: /CASE\b/iuy,
        text: m
      },
      {
        type: s.END,
        regex: /END\b/iuy,
        text: m
      },
      {
        type: s.BETWEEN,
        regex: /BETWEEN\b/iuy,
        text: m
      },
      {
        type: s.LIMIT,
        regex: E.reservedClauses.includes("LIMIT") ? /LIMIT\b/iuy : void 0,
        text: m
      },
      {
        type: s.RESERVED_CLAUSE,
        regex: b(E.reservedClauses, E.identChars),
        text: m
      },
      {
        type: s.RESERVED_SELECT,
        regex: b(E.reservedSelect, E.identChars),
        text: m
      },
      {
        type: s.RESERVED_SET_OPERATION,
        regex: b(E.reservedSetOperations, E.identChars),
        text: m
      },
      {
        type: s.WHEN,
        regex: /WHEN\b/iuy,
        text: m
      },
      {
        type: s.ELSE,
        regex: /ELSE\b/iuy,
        text: m
      },
      {
        type: s.THEN,
        regex: /THEN\b/iuy,
        text: m
      },
      {
        type: s.RESERVED_JOIN,
        regex: b(E.reservedJoins, E.identChars),
        text: m
      },
      {
        type: s.AND,
        regex: /AND\b/iuy,
        text: m
      },
      {
        type: s.OR,
        regex: /OR\b/iuy,
        text: m
      },
      {
        type: s.XOR,
        regex: E.supportsXor ? /XOR\b/iuy : void 0,
        text: m
      },
      ...E.operatorKeyword ? [
        {
          type: s.OPERATOR,
          regex: /OPERATOR *\([^)]+\)/iuy
        }
      ] : [],
      {
        type: s.RESERVED_FUNCTION_NAME,
        regex: b(E.reservedFunctionNames, E.identChars),
        text: m
      },
      {
        type: s.RESERVED_DATA_TYPE,
        regex: b(E.reservedDataTypes, E.identChars),
        text: m
      },
      {
        type: s.RESERVED_KEYWORD,
        regex: b(E.reservedKeywords, E.identChars),
        text: m
      }
    ]);
  }
  // These rules can also be cached as they only depend on
  // the Tokenizer config options specified for each SQL dialect
  buildRulesAfterParams(E) {
    var R, A;
    return this.validRules([
      {
        type: s.VARIABLE,
        regex: E.variableTypes ? sI(E.variableTypes) : void 0
      },
      { type: s.STRING, regex: nT(E.stringTypes) },
      {
        type: s.IDENTIFIER,
        regex: LI(E.identChars)
      },
      { type: s.DELIMITER, regex: /[;]/uy },
      { type: s.COMMA, regex: /[,]/y },
      {
        type: s.OPEN_PAREN,
        regex: rT("open", E.extraParens)
      },
      {
        type: s.CLOSE_PAREN,
        regex: rT("close", E.extraParens)
      },
      {
        type: s.OPERATOR,
        regex: _T([
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
          ...(R = E.operators) !== null && R !== void 0 ? R : []
        ])
      },
      { type: s.ASTERISK, regex: /[*]/uy },
      {
        type: s.PROPERTY_ACCESS_OPERATOR,
        regex: _T([".", ...(A = E.propertyAccessOperators) !== null && A !== void 0 ? A : []])
      }
    ]);
  }
  // These rules can't be blindly cached as the paramTypesOverrides object
  // can differ on each invocation of the format() function.
  buildParamRules(E, R) {
    var A, S, r, n, C;
    const M = {
      named: R?.named || ((A = E.paramTypes) === null || A === void 0 ? void 0 : A.named) || [],
      quoted: R?.quoted || ((S = E.paramTypes) === null || S === void 0 ? void 0 : S.quoted) || [],
      numbered: R?.numbered || ((r = E.paramTypes) === null || r === void 0 ? void 0 : r.numbered) || [],
      positional: typeof R?.positional == "boolean" ? R.positional : (n = E.paramTypes) === null || n === void 0 ? void 0 : n.positional,
      custom: R?.custom || ((C = E.paramTypes) === null || C === void 0 ? void 0 : C.custom) || []
    };
    return this.validRules([
      {
        type: s.NAMED_PARAMETER,
        regex: VE(M.named, hT(E.paramChars || E.identChars)),
        key: (I) => I.slice(1)
      },
      {
        type: s.QUOTED_PARAMETER,
        regex: VE(M.quoted, mT(E.identTypes)),
        key: (I) => (({ tokenKey: L, quoteChar: _ }) => L.replace(new RegExp(g("\\" + _), "gu"), _))({
          tokenKey: I.slice(2, -1),
          quoteChar: I.slice(-1)
        })
      },
      {
        type: s.NUMBERED_PARAMETER,
        regex: VE(M.numbered, "[0-9]+"),
        key: (I) => I.slice(1)
      },
      {
        type: s.POSITIONAL_PARAMETER,
        regex: M.positional ? /[?]/y : void 0
      },
      ...M.custom.map((I) => {
        var L;
        return {
          type: s.CUSTOM_PARAMETER,
          regex: J(I.regex),
          key: (L = I.key) !== null && L !== void 0 ? L : (_) => _
        };
      })
    ]);
  }
  // filters out rules for token types whose regex is undefined
  validRules(E) {
    return E.filter((R) => !!R.regex);
  }
}
const m = (T) => SE(T.toUpperCase()), DT = /* @__PURE__ */ new Map(), iI = (T) => {
  let E = DT.get(T);
  return E || (E = DI(T), DT.set(T, E)), E;
}, DI = (T) => ({
  tokenizer: new nI(T.tokenizerOptions, T.name),
  formatOptions: oI(T.formatOptions)
}), oI = (T) => {
  var E;
  return {
    alwaysDenseOperators: T.alwaysDenseOperators || [],
    onelineClauses: Object.fromEntries(T.onelineClauses.map((R) => [R, !0])),
    tabularOnelineClauses: Object.fromEntries(((E = T.tabularOnelineClauses) !== null && E !== void 0 ? E : T.onelineClauses).map((R) => [R, !0]))
  };
};
function PI(T) {
  return T.indentStyle === "tabularLeft" || T.indentStyle === "tabularRight" ? " ".repeat(10) : T.useTabs ? "	" : " ".repeat(T.tabWidth);
}
function q(T) {
  return T.indentStyle === "tabularLeft" || T.indentStyle === "tabularRight";
}
class MI {
  constructor(E) {
    this.params = E, this.index = 0;
  }
  /**
   * Returns param value that matches given placeholder with param key.
   */
  get({ key: E, text: R }) {
    return this.params ? E ? this.params[E] : this.params[this.index++] : R;
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
  setPositionalParameterIndex(E) {
    this.index = E;
  }
}
var WT = { exports: {} };
(function(T) {
  (function(E, R) {
    T.exports ? T.exports = R() : E.nearley = R();
  })(yE, function() {
    function E(I, L, _) {
      return this.id = ++E.highestId, this.name = I, this.symbols = L, this.postprocess = _, this;
    }
    E.highestId = 0, E.prototype.toString = function(I) {
      var L = typeof I > "u" ? this.symbols.map(M).join(" ") : this.symbols.slice(0, I).map(M).join(" ") + " ● " + this.symbols.slice(I).map(M).join(" ");
      return this.name + " → " + L;
    };
    function R(I, L, _, D) {
      this.rule = I, this.dot = L, this.reference = _, this.data = [], this.wantedBy = D, this.isComplete = this.dot === I.symbols.length;
    }
    R.prototype.toString = function() {
      return "{" + this.rule.toString(this.dot) + "}, from: " + (this.reference || 0);
    }, R.prototype.nextState = function(I) {
      var L = new R(this.rule, this.dot + 1, this.reference, this.wantedBy);
      return L.left = this, L.right = I, L.isComplete && (L.data = L.build(), L.right = void 0), L;
    }, R.prototype.build = function() {
      var I = [], L = this;
      do
        I.push(L.right.data), L = L.left;
      while (L.left);
      return I.reverse(), I;
    }, R.prototype.finish = function() {
      this.rule.postprocess && (this.data = this.rule.postprocess(this.data, this.reference, n.fail));
    };
    function A(I, L) {
      this.grammar = I, this.index = L, this.states = [], this.wants = {}, this.scannable = [], this.completed = {};
    }
    A.prototype.process = function(I) {
      for (var L = this.states, _ = this.wants, D = this.completed, B = 0; B < L.length; B++) {
        var u = L[B];
        if (u.isComplete) {
          if (u.finish(), u.data !== n.fail) {
            for (var H = u.wantedBy, c = H.length; c--; ) {
              var F = H[c];
              this.complete(F, u);
            }
            if (u.reference === this.index) {
              var O = u.rule.name;
              (this.completed[O] = this.completed[O] || []).push(u);
            }
          }
        } else {
          var O = u.rule.symbols[u.dot];
          if (typeof O != "string") {
            this.scannable.push(u);
            continue;
          }
          if (_[O]) {
            if (_[O].push(u), D.hasOwnProperty(O))
              for (var t = D[O], c = 0; c < t.length; c++) {
                var a = t[c];
                this.complete(u, a);
              }
          } else
            _[O] = [u], this.predict(O);
        }
      }
    }, A.prototype.predict = function(I) {
      for (var L = this.grammar.byName[I] || [], _ = 0; _ < L.length; _++) {
        var D = L[_], B = this.wants[I], u = new R(D, 0, this.index, B);
        this.states.push(u);
      }
    }, A.prototype.complete = function(I, L) {
      var _ = I.nextState(L);
      this.states.push(_);
    };
    function S(I, L) {
      this.rules = I, this.start = L || this.rules[0].name;
      var _ = this.byName = {};
      this.rules.forEach(function(D) {
        _.hasOwnProperty(D.name) || (_[D.name] = []), _[D.name].push(D);
      });
    }
    S.fromCompiled = function(D, L) {
      var _ = D.Lexer;
      D.ParserStart && (L = D.ParserStart, D = D.ParserRules);
      var D = D.map(function(u) {
        return new E(u.name, u.symbols, u.postprocess);
      }), B = new S(D, L);
      return B.lexer = _, B;
    };
    function r() {
      this.reset("");
    }
    r.prototype.reset = function(I, L) {
      this.buffer = I, this.index = 0, this.line = L ? L.line : 1, this.lastLineBreak = L ? -L.col : 0;
    }, r.prototype.next = function() {
      if (this.index < this.buffer.length) {
        var I = this.buffer[this.index++];
        return I === `
` && (this.line += 1, this.lastLineBreak = this.index), { value: I };
      }
    }, r.prototype.save = function() {
      return {
        line: this.line,
        col: this.index - this.lastLineBreak
      };
    }, r.prototype.formatError = function(I, L) {
      var _ = this.buffer;
      if (typeof _ == "string") {
        var D = _.split(`
`).slice(
          Math.max(0, this.line - 5),
          this.line
        ), B = _.indexOf(`
`, this.index);
        B === -1 && (B = _.length);
        var u = this.index - this.lastLineBreak, H = String(this.line).length;
        return L += " at line " + this.line + " col " + u + `:

`, L += D.map(function(F, O) {
          return c(this.line - D.length + O + 1, H) + " " + F;
        }, this).join(`
`), L += `
` + c("", H + u) + `^
`, L;
      } else
        return L + " at index " + (this.index - 1);
      function c(F, O) {
        var t = String(F);
        return Array(O - t.length + 1).join(" ") + t;
      }
    };
    function n(I, L, _) {
      if (I instanceof S)
        var D = I, _ = L;
      else
        var D = S.fromCompiled(I, L);
      this.grammar = D, this.options = {
        keepHistory: !1,
        lexer: D.lexer || new r()
      };
      for (var B in _ || {})
        this.options[B] = _[B];
      this.lexer = this.options.lexer, this.lexerState = void 0;
      var u = new A(D, 0);
      this.table = [u], u.wants[D.start] = [], u.predict(D.start), u.process(), this.current = 0;
    }
    n.fail = {}, n.prototype.feed = function(I) {
      var L = this.lexer;
      L.reset(I, this.lexerState);
      for (var _; ; ) {
        try {
          if (_ = L.next(), !_)
            break;
        } catch (U) {
          var H = new A(this.grammar, this.current + 1);
          this.table.push(H);
          var D = new Error(this.reportLexerError(U));
          throw D.offset = this.current, D.token = U.token, D;
        }
        var B = this.table[this.current];
        this.options.keepHistory || delete this.table[this.current - 1];
        var u = this.current + 1, H = new A(this.grammar, u);
        this.table.push(H);
        for (var c = _.text !== void 0 ? _.text : _.value, F = L.constructor === r ? _.value : _, O = B.scannable, t = O.length; t--; ) {
          var a = O[t], i = a.rule.symbols[a.dot];
          if (i.test ? i.test(F) : i.type ? i.type === _.type : i.literal === c) {
            var o = a.nextState({ data: F, token: _, isToken: !0, reference: u - 1 });
            H.states.push(o);
          }
        }
        if (H.process(), H.states.length === 0) {
          var D = new Error(this.reportError(_));
          throw D.offset = this.current, D.token = _, D;
        }
        this.options.keepHistory && (B.lexerState = L.save()), this.current++;
      }
      return B && (this.lexerState = L.save()), this.results = this.finish(), this;
    }, n.prototype.reportLexerError = function(I) {
      var L, _, D = I.token;
      return D ? (L = "input " + JSON.stringify(D.text[0]) + " (lexer error)", _ = this.lexer.formatError(D, "Syntax error")) : (L = "input (lexer error)", _ = I.message), this.reportErrorCommon(_, L);
    }, n.prototype.reportError = function(I) {
      var L = (I.type ? I.type + " token: " : "") + JSON.stringify(I.value !== void 0 ? I.value : I), _ = this.lexer.formatError(I, "Syntax error");
      return this.reportErrorCommon(_, L);
    }, n.prototype.reportErrorCommon = function(I, L) {
      var _ = [];
      _.push(I);
      var D = this.table.length - 2, B = this.table[D], u = B.states.filter(function(c) {
        var F = c.rule.symbols[c.dot];
        return F && typeof F != "string";
      });
      if (u.length === 0)
        _.push("Unexpected " + L + `. I did not expect any more input. Here is the state of my parse table:
`), this.displayStateStack(B.states, _);
      else {
        _.push("Unexpected " + L + `. Instead, I was expecting to see one of the following:
`);
        var H = u.map(function(c) {
          return this.buildFirstStateStack(c, []) || [c];
        }, this);
        H.forEach(function(c) {
          var F = c[0], O = F.rule.symbols[F.dot], t = this.getSymbolDisplay(O);
          _.push("A " + t + " based on:"), this.displayStateStack(c, _);
        }, this);
      }
      return _.push(""), _.join(`
`);
    }, n.prototype.displayStateStack = function(I, L) {
      for (var _, D = 0, B = 0; B < I.length; B++) {
        var u = I[B], H = u.rule.toString(u.dot);
        H === _ ? D++ : (D > 0 && L.push("    ^ " + D + " more lines identical to this"), D = 0, L.push("    " + H)), _ = H;
      }
    }, n.prototype.getSymbolDisplay = function(I) {
      return C(I);
    }, n.prototype.buildFirstStateStack = function(I, L) {
      if (L.indexOf(I) !== -1)
        return null;
      if (I.wantedBy.length === 0)
        return [I];
      var _ = I.wantedBy[0], D = [I].concat(L), B = this.buildFirstStateStack(_, D);
      return B === null ? null : [I].concat(B);
    }, n.prototype.save = function() {
      var I = this.table[this.current];
      return I.lexerState = this.lexerState, I;
    }, n.prototype.restore = function(I) {
      var L = I.index;
      this.current = L, this.table[L] = I, this.table.splice(L + 1), this.lexerState = I.lexerState, this.results = this.finish();
    }, n.prototype.rewind = function(I) {
      if (!this.options.keepHistory)
        throw new Error("set option `keepHistory` to enable rewinding");
      this.restore(this.table[I]);
    }, n.prototype.finish = function() {
      var I = [], L = this.grammar.start, _ = this.table[this.table.length - 1];
      return _.states.forEach(function(D) {
        D.rule.name === L && D.dot === D.rule.symbols.length && D.reference === 0 && D.data !== n.fail && I.push(D);
      }), I.map(function(D) {
        return D.data;
      });
    };
    function C(I) {
      var L = typeof I;
      if (L === "string")
        return I;
      if (L === "object") {
        if (I.literal)
          return JSON.stringify(I.literal);
        if (I instanceof RegExp)
          return "character matching " + I;
        if (I.type)
          return I.type + " token";
        if (I.test)
          return "token matching " + String(I.test);
        throw new Error("Unknown symbol type: " + I);
      }
    }
    function M(I) {
      var L = typeof I;
      if (L === "string")
        return I;
      if (L === "object") {
        if (I.literal)
          return JSON.stringify(I.literal);
        if (I instanceof RegExp)
          return I.toString();
        if (I.type)
          return "%" + I.type;
        if (I.test)
          return "<" + String(I.test) + ">";
        throw new Error("Unknown symbol type: " + I);
      }
    }
    return {
      Parser: n,
      Grammar: S,
      Rule: E
    };
  });
})(WT);
var UI = WT.exports;
const lI = /* @__PURE__ */ UT(UI);
function GI(T) {
  return T.map(cI).map(uI).map(HI).map(BI).map(FI);
}
const cI = (T, E, R) => {
  if (pT(T.type)) {
    const A = pI(R, E);
    if (A && A.type === s.PROPERTY_ACCESS_OPERATOR)
      return Object.assign(Object.assign({}, T), { type: s.IDENTIFIER, text: T.raw });
    const S = k(R, E);
    if (S && S.type === s.PROPERTY_ACCESS_OPERATOR)
      return Object.assign(Object.assign({}, T), { type: s.IDENTIFIER, text: T.raw });
  }
  return T;
}, uI = (T, E, R) => {
  if (T.type === s.RESERVED_FUNCTION_NAME) {
    const A = k(R, E);
    if (!A || !fT(A))
      return Object.assign(Object.assign({}, T), { type: s.IDENTIFIER, text: T.raw });
  }
  return T;
}, HI = (T, E, R) => {
  if (T.type === s.RESERVED_DATA_TYPE) {
    const A = k(R, E);
    if (A && fT(A))
      return Object.assign(Object.assign({}, T), { type: s.RESERVED_PARAMETERIZED_DATA_TYPE });
  }
  return T;
}, BI = (T, E, R) => {
  if (T.type === s.IDENTIFIER) {
    const A = k(R, E);
    if (A && yT(A))
      return Object.assign(Object.assign({}, T), { type: s.ARRAY_IDENTIFIER });
  }
  return T;
}, FI = (T, E, R) => {
  if (T.type === s.RESERVED_DATA_TYPE) {
    const A = k(R, E);
    if (A && yT(A))
      return Object.assign(Object.assign({}, T), { type: s.ARRAY_KEYWORD });
  }
  return T;
}, pI = (T, E) => k(T, E, -1), k = (T, E, R = 1) => {
  let A = 1;
  for (; T[E + A * R] && dI(T[E + A * R]); )
    A++;
  return T[E + A * R];
}, fT = (T) => T.type === s.OPEN_PAREN && T.text === "(", yT = (T) => T.type === s.OPEN_PAREN && T.text === "[", dI = (T) => T.type === s.BLOCK_COMMENT || T.type === s.LINE_COMMENT;
class gT {
  constructor(E) {
    this.tokenize = E, this.index = 0, this.tokens = [], this.input = "";
  }
  reset(E, R) {
    this.input = E, this.index = 0, this.tokens = this.tokenize(E);
  }
  next() {
    return this.tokens[this.index++];
  }
  save() {
  }
  formatError(E) {
    const { line: R, col: A } = VT(this.input, E.start);
    return `Parse error at token: ${E.text} at line ${R} column ${A}`;
  }
  has(E) {
    return E in s;
  }
}
var P;
(function(T) {
  T.statement = "statement", T.clause = "clause", T.set_operation = "set_operation", T.function_call = "function_call", T.parameterized_data_type = "parameterized_data_type", T.array_subscript = "array_subscript", T.property_access = "property_access", T.parenthesis = "parenthesis", T.between_predicate = "between_predicate", T.case_expression = "case_expression", T.case_when = "case_when", T.case_else = "case_else", T.limit_clause = "limit_clause", T.all_columns_asterisk = "all_columns_asterisk", T.literal = "literal", T.identifier = "identifier", T.keyword = "keyword", T.data_type = "data_type", T.parameter = "parameter", T.operator = "operator", T.comma = "comma", T.line_comment = "line_comment", T.block_comment = "block_comment", T.disable_comment = "disable_comment";
})(P = P || (P = {}));
function WE(T) {
  return T[0];
}
const G = new gT((T) => []), w = ([[T]]) => T, h = (T) => ({
  type: P.keyword,
  tokenType: T.type,
  text: T.text,
  raw: T.raw
}), oT = (T) => ({
  type: P.data_type,
  text: T.text,
  raw: T.raw
}), V = (T, { leading: E, trailing: R }) => (E?.length && (T = Object.assign(Object.assign({}, T), { leadingComments: E })), R?.length && (T = Object.assign(Object.assign({}, T), { trailingComments: R })), T), YI = (T, { leading: E, trailing: R }) => {
  if (E?.length) {
    const [A, ...S] = T;
    T = [V(A, { leading: E }), ...S];
  }
  if (R?.length) {
    const A = T.slice(0, -1), S = T[T.length - 1];
    T = [...A, V(S, { trailing: R })];
  }
  return T;
}, mI = {
  Lexer: G,
  ParserRules: [
    { name: "main$ebnf$1", symbols: [] },
    { name: "main$ebnf$1", symbols: ["main$ebnf$1", "statement"], postprocess: (T) => T[0].concat([T[1]]) },
    {
      name: "main",
      symbols: ["main$ebnf$1"],
      postprocess: ([T]) => {
        const E = T[T.length - 1];
        return E && !E.hasSemicolon ? E.children.length > 0 ? T : T.slice(0, -1) : T;
      }
    },
    { name: "statement$subexpression$1", symbols: [G.has("DELIMITER") ? { type: "DELIMITER" } : DELIMITER] },
    { name: "statement$subexpression$1", symbols: [G.has("EOF") ? { type: "EOF" } : EOF] },
    {
      name: "statement",
      symbols: ["expressions_or_clauses", "statement$subexpression$1"],
      postprocess: ([T, [E]]) => ({
        type: P.statement,
        children: T,
        hasSemicolon: E.type === s.DELIMITER
      })
    },
    { name: "expressions_or_clauses$ebnf$1", symbols: [] },
    { name: "expressions_or_clauses$ebnf$1", symbols: ["expressions_or_clauses$ebnf$1", "free_form_sql"], postprocess: (T) => T[0].concat([T[1]]) },
    { name: "expressions_or_clauses$ebnf$2", symbols: [] },
    { name: "expressions_or_clauses$ebnf$2", symbols: ["expressions_or_clauses$ebnf$2", "clause"], postprocess: (T) => T[0].concat([T[1]]) },
    {
      name: "expressions_or_clauses",
      symbols: ["expressions_or_clauses$ebnf$1", "expressions_or_clauses$ebnf$2"],
      postprocess: ([T, E]) => [...T, ...E]
    },
    { name: "clause$subexpression$1", symbols: ["limit_clause"] },
    { name: "clause$subexpression$1", symbols: ["select_clause"] },
    { name: "clause$subexpression$1", symbols: ["other_clause"] },
    { name: "clause$subexpression$1", symbols: ["set_operation"] },
    { name: "clause", symbols: ["clause$subexpression$1"], postprocess: w },
    { name: "limit_clause$ebnf$1$subexpression$1$ebnf$1", symbols: ["free_form_sql"] },
    { name: "limit_clause$ebnf$1$subexpression$1$ebnf$1", symbols: ["limit_clause$ebnf$1$subexpression$1$ebnf$1", "free_form_sql"], postprocess: (T) => T[0].concat([T[1]]) },
    { name: "limit_clause$ebnf$1$subexpression$1", symbols: [G.has("COMMA") ? { type: "COMMA" } : COMMA, "limit_clause$ebnf$1$subexpression$1$ebnf$1"] },
    { name: "limit_clause$ebnf$1", symbols: ["limit_clause$ebnf$1$subexpression$1"], postprocess: WE },
    { name: "limit_clause$ebnf$1", symbols: [], postprocess: () => null },
    {
      name: "limit_clause",
      symbols: [G.has("LIMIT") ? { type: "LIMIT" } : LIMIT, "_", "expression_chain_", "limit_clause$ebnf$1"],
      postprocess: ([T, E, R, A]) => {
        if (A) {
          const [S, r] = A;
          return {
            type: P.limit_clause,
            limitKw: V(h(T), { trailing: E }),
            offset: R,
            count: r
          };
        } else
          return {
            type: P.limit_clause,
            limitKw: V(h(T), { trailing: E }),
            count: R
          };
      }
    },
    { name: "select_clause$subexpression$1$ebnf$1", symbols: [] },
    { name: "select_clause$subexpression$1$ebnf$1", symbols: ["select_clause$subexpression$1$ebnf$1", "free_form_sql"], postprocess: (T) => T[0].concat([T[1]]) },
    { name: "select_clause$subexpression$1", symbols: ["all_columns_asterisk", "select_clause$subexpression$1$ebnf$1"] },
    { name: "select_clause$subexpression$1$ebnf$2", symbols: [] },
    { name: "select_clause$subexpression$1$ebnf$2", symbols: ["select_clause$subexpression$1$ebnf$2", "free_form_sql"], postprocess: (T) => T[0].concat([T[1]]) },
    { name: "select_clause$subexpression$1", symbols: ["asteriskless_free_form_sql", "select_clause$subexpression$1$ebnf$2"] },
    {
      name: "select_clause",
      symbols: [G.has("RESERVED_SELECT") ? { type: "RESERVED_SELECT" } : RESERVED_SELECT, "select_clause$subexpression$1"],
      postprocess: ([T, [E, R]]) => ({
        type: P.clause,
        nameKw: h(T),
        children: [E, ...R]
      })
    },
    {
      name: "select_clause",
      symbols: [G.has("RESERVED_SELECT") ? { type: "RESERVED_SELECT" } : RESERVED_SELECT],
      postprocess: ([T]) => ({
        type: P.clause,
        nameKw: h(T),
        children: []
      })
    },
    {
      name: "all_columns_asterisk",
      symbols: [G.has("ASTERISK") ? { type: "ASTERISK" } : ASTERISK],
      postprocess: () => ({ type: P.all_columns_asterisk })
    },
    { name: "other_clause$ebnf$1", symbols: [] },
    { name: "other_clause$ebnf$1", symbols: ["other_clause$ebnf$1", "free_form_sql"], postprocess: (T) => T[0].concat([T[1]]) },
    {
      name: "other_clause",
      symbols: [G.has("RESERVED_CLAUSE") ? { type: "RESERVED_CLAUSE" } : RESERVED_CLAUSE, "other_clause$ebnf$1"],
      postprocess: ([T, E]) => ({
        type: P.clause,
        nameKw: h(T),
        children: E
      })
    },
    { name: "set_operation$ebnf$1", symbols: [] },
    { name: "set_operation$ebnf$1", symbols: ["set_operation$ebnf$1", "free_form_sql"], postprocess: (T) => T[0].concat([T[1]]) },
    {
      name: "set_operation",
      symbols: [G.has("RESERVED_SET_OPERATION") ? { type: "RESERVED_SET_OPERATION" } : RESERVED_SET_OPERATION, "set_operation$ebnf$1"],
      postprocess: ([T, E]) => ({
        type: P.set_operation,
        nameKw: h(T),
        children: E
      })
    },
    { name: "expression_chain_$ebnf$1", symbols: ["expression_with_comments_"] },
    { name: "expression_chain_$ebnf$1", symbols: ["expression_chain_$ebnf$1", "expression_with_comments_"], postprocess: (T) => T[0].concat([T[1]]) },
    { name: "expression_chain_", symbols: ["expression_chain_$ebnf$1"], postprocess: WE },
    { name: "expression_chain$ebnf$1", symbols: [] },
    { name: "expression_chain$ebnf$1", symbols: ["expression_chain$ebnf$1", "_expression_with_comments"], postprocess: (T) => T[0].concat([T[1]]) },
    {
      name: "expression_chain",
      symbols: ["expression", "expression_chain$ebnf$1"],
      postprocess: ([T, E]) => [T, ...E]
    },
    { name: "andless_expression_chain$ebnf$1", symbols: [] },
    { name: "andless_expression_chain$ebnf$1", symbols: ["andless_expression_chain$ebnf$1", "_andless_expression_with_comments"], postprocess: (T) => T[0].concat([T[1]]) },
    {
      name: "andless_expression_chain",
      symbols: ["andless_expression", "andless_expression_chain$ebnf$1"],
      postprocess: ([T, E]) => [T, ...E]
    },
    {
      name: "expression_with_comments_",
      symbols: ["expression", "_"],
      postprocess: ([T, E]) => V(T, { trailing: E })
    },
    {
      name: "_expression_with_comments",
      symbols: ["_", "expression"],
      postprocess: ([T, E]) => V(E, { leading: T })
    },
    {
      name: "_andless_expression_with_comments",
      symbols: ["_", "andless_expression"],
      postprocess: ([T, E]) => V(E, { leading: T })
    },
    { name: "free_form_sql$subexpression$1", symbols: ["asteriskless_free_form_sql"] },
    { name: "free_form_sql$subexpression$1", symbols: ["asterisk"] },
    { name: "free_form_sql", symbols: ["free_form_sql$subexpression$1"], postprocess: w },
    { name: "asteriskless_free_form_sql$subexpression$1", symbols: ["asteriskless_andless_expression"] },
    { name: "asteriskless_free_form_sql$subexpression$1", symbols: ["logic_operator"] },
    { name: "asteriskless_free_form_sql$subexpression$1", symbols: ["comma"] },
    { name: "asteriskless_free_form_sql$subexpression$1", symbols: ["comment"] },
    { name: "asteriskless_free_form_sql$subexpression$1", symbols: ["other_keyword"] },
    { name: "asteriskless_free_form_sql", symbols: ["asteriskless_free_form_sql$subexpression$1"], postprocess: w },
    { name: "expression$subexpression$1", symbols: ["andless_expression"] },
    { name: "expression$subexpression$1", symbols: ["logic_operator"] },
    { name: "expression", symbols: ["expression$subexpression$1"], postprocess: w },
    { name: "andless_expression$subexpression$1", symbols: ["asteriskless_andless_expression"] },
    { name: "andless_expression$subexpression$1", symbols: ["asterisk"] },
    { name: "andless_expression", symbols: ["andless_expression$subexpression$1"], postprocess: w },
    { name: "asteriskless_andless_expression$subexpression$1", symbols: ["atomic_expression"] },
    { name: "asteriskless_andless_expression$subexpression$1", symbols: ["between_predicate"] },
    { name: "asteriskless_andless_expression$subexpression$1", symbols: ["case_expression"] },
    { name: "asteriskless_andless_expression", symbols: ["asteriskless_andless_expression$subexpression$1"], postprocess: w },
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
    { name: "atomic_expression", symbols: ["atomic_expression$subexpression$1"], postprocess: w },
    {
      name: "array_subscript",
      symbols: [G.has("ARRAY_IDENTIFIER") ? { type: "ARRAY_IDENTIFIER" } : ARRAY_IDENTIFIER, "_", "square_brackets"],
      postprocess: ([T, E, R]) => ({
        type: P.array_subscript,
        array: V({ type: P.identifier, quoted: !1, text: T.text }, { trailing: E }),
        parenthesis: R
      })
    },
    {
      name: "array_subscript",
      symbols: [G.has("ARRAY_KEYWORD") ? { type: "ARRAY_KEYWORD" } : ARRAY_KEYWORD, "_", "square_brackets"],
      postprocess: ([T, E, R]) => ({
        type: P.array_subscript,
        array: V(h(T), { trailing: E }),
        parenthesis: R
      })
    },
    {
      name: "function_call",
      symbols: [G.has("RESERVED_FUNCTION_NAME") ? { type: "RESERVED_FUNCTION_NAME" } : RESERVED_FUNCTION_NAME, "_", "parenthesis"],
      postprocess: ([T, E, R]) => ({
        type: P.function_call,
        nameKw: V(h(T), { trailing: E }),
        parenthesis: R
      })
    },
    {
      name: "parenthesis",
      symbols: [{ literal: "(" }, "expressions_or_clauses", { literal: ")" }],
      postprocess: ([T, E, R]) => ({
        type: P.parenthesis,
        children: E,
        openParen: "(",
        closeParen: ")"
      })
    },
    { name: "curly_braces$ebnf$1", symbols: [] },
    { name: "curly_braces$ebnf$1", symbols: ["curly_braces$ebnf$1", "free_form_sql"], postprocess: (T) => T[0].concat([T[1]]) },
    {
      name: "curly_braces",
      symbols: [{ literal: "{" }, "curly_braces$ebnf$1", { literal: "}" }],
      postprocess: ([T, E, R]) => ({
        type: P.parenthesis,
        children: E,
        openParen: "{",
        closeParen: "}"
      })
    },
    { name: "square_brackets$ebnf$1", symbols: [] },
    { name: "square_brackets$ebnf$1", symbols: ["square_brackets$ebnf$1", "free_form_sql"], postprocess: (T) => T[0].concat([T[1]]) },
    {
      name: "square_brackets",
      symbols: [{ literal: "[" }, "square_brackets$ebnf$1", { literal: "]" }],
      postprocess: ([T, E, R]) => ({
        type: P.parenthesis,
        children: E,
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
      symbols: ["atomic_expression", "_", G.has("PROPERTY_ACCESS_OPERATOR") ? { type: "PROPERTY_ACCESS_OPERATOR" } : PROPERTY_ACCESS_OPERATOR, "_", "property_access$subexpression$1"],
      postprocess: (
        // Allowing property to be <array_subscript> is currently a hack.
        // A better way would be to allow <property_access> on the left side of array_subscript,
        // but we currently can't do that because of another hack that requires
        // %ARRAY_IDENTIFIER on the left side of <array_subscript>.
        ([T, E, R, A, [S]]) => ({
          type: P.property_access,
          object: V(T, { trailing: E }),
          operator: R.text,
          property: V(S, { leading: A })
        })
      )
    },
    {
      name: "between_predicate",
      symbols: [G.has("BETWEEN") ? { type: "BETWEEN" } : BETWEEN, "_", "andless_expression_chain", "_", G.has("AND") ? { type: "AND" } : AND, "_", "andless_expression"],
      postprocess: ([T, E, R, A, S, r, n]) => ({
        type: P.between_predicate,
        betweenKw: h(T),
        expr1: YI(R, { leading: E, trailing: A }),
        andKw: h(S),
        expr2: [V(n, { leading: r })]
      })
    },
    { name: "case_expression$ebnf$1", symbols: ["expression_chain_"], postprocess: WE },
    { name: "case_expression$ebnf$1", symbols: [], postprocess: () => null },
    { name: "case_expression$ebnf$2", symbols: [] },
    { name: "case_expression$ebnf$2", symbols: ["case_expression$ebnf$2", "case_clause"], postprocess: (T) => T[0].concat([T[1]]) },
    {
      name: "case_expression",
      symbols: [G.has("CASE") ? { type: "CASE" } : CASE, "_", "case_expression$ebnf$1", "case_expression$ebnf$2", G.has("END") ? { type: "END" } : END],
      postprocess: ([T, E, R, A, S]) => ({
        type: P.case_expression,
        caseKw: V(h(T), { trailing: E }),
        endKw: h(S),
        expr: R || [],
        clauses: A
      })
    },
    {
      name: "case_clause",
      symbols: [G.has("WHEN") ? { type: "WHEN" } : WHEN, "_", "expression_chain_", G.has("THEN") ? { type: "THEN" } : THEN, "_", "expression_chain_"],
      postprocess: ([T, E, R, A, S, r]) => ({
        type: P.case_when,
        whenKw: V(h(T), { trailing: E }),
        thenKw: V(h(A), { trailing: S }),
        condition: R,
        result: r
      })
    },
    {
      name: "case_clause",
      symbols: [G.has("ELSE") ? { type: "ELSE" } : ELSE, "_", "expression_chain_"],
      postprocess: ([T, E, R]) => ({
        type: P.case_else,
        elseKw: V(h(T), { trailing: E }),
        result: R
      })
    },
    { name: "comma$subexpression$1", symbols: [G.has("COMMA") ? { type: "COMMA" } : COMMA] },
    { name: "comma", symbols: ["comma$subexpression$1"], postprocess: ([[T]]) => ({ type: P.comma }) },
    { name: "asterisk$subexpression$1", symbols: [G.has("ASTERISK") ? { type: "ASTERISK" } : ASTERISK] },
    { name: "asterisk", symbols: ["asterisk$subexpression$1"], postprocess: ([[T]]) => ({ type: P.operator, text: T.text }) },
    { name: "operator$subexpression$1", symbols: [G.has("OPERATOR") ? { type: "OPERATOR" } : OPERATOR] },
    { name: "operator", symbols: ["operator$subexpression$1"], postprocess: ([[T]]) => ({ type: P.operator, text: T.text }) },
    { name: "identifier$subexpression$1", symbols: [G.has("IDENTIFIER") ? { type: "IDENTIFIER" } : IDENTIFIER] },
    { name: "identifier$subexpression$1", symbols: [G.has("QUOTED_IDENTIFIER") ? { type: "QUOTED_IDENTIFIER" } : QUOTED_IDENTIFIER] },
    { name: "identifier$subexpression$1", symbols: [G.has("VARIABLE") ? { type: "VARIABLE" } : VARIABLE] },
    { name: "identifier", symbols: ["identifier$subexpression$1"], postprocess: ([[T]]) => ({ type: P.identifier, quoted: T.type !== "IDENTIFIER", text: T.text }) },
    { name: "parameter$subexpression$1", symbols: [G.has("NAMED_PARAMETER") ? { type: "NAMED_PARAMETER" } : NAMED_PARAMETER] },
    { name: "parameter$subexpression$1", symbols: [G.has("QUOTED_PARAMETER") ? { type: "QUOTED_PARAMETER" } : QUOTED_PARAMETER] },
    { name: "parameter$subexpression$1", symbols: [G.has("NUMBERED_PARAMETER") ? { type: "NUMBERED_PARAMETER" } : NUMBERED_PARAMETER] },
    { name: "parameter$subexpression$1", symbols: [G.has("POSITIONAL_PARAMETER") ? { type: "POSITIONAL_PARAMETER" } : POSITIONAL_PARAMETER] },
    { name: "parameter$subexpression$1", symbols: [G.has("CUSTOM_PARAMETER") ? { type: "CUSTOM_PARAMETER" } : CUSTOM_PARAMETER] },
    { name: "parameter", symbols: ["parameter$subexpression$1"], postprocess: ([[T]]) => ({ type: P.parameter, key: T.key, text: T.text }) },
    { name: "literal$subexpression$1", symbols: [G.has("NUMBER") ? { type: "NUMBER" } : NUMBER] },
    { name: "literal$subexpression$1", symbols: [G.has("STRING") ? { type: "STRING" } : STRING] },
    { name: "literal", symbols: ["literal$subexpression$1"], postprocess: ([[T]]) => ({ type: P.literal, text: T.text }) },
    { name: "keyword$subexpression$1", symbols: [G.has("RESERVED_KEYWORD") ? { type: "RESERVED_KEYWORD" } : RESERVED_KEYWORD] },
    { name: "keyword$subexpression$1", symbols: [G.has("RESERVED_KEYWORD_PHRASE") ? { type: "RESERVED_KEYWORD_PHRASE" } : RESERVED_KEYWORD_PHRASE] },
    { name: "keyword$subexpression$1", symbols: [G.has("RESERVED_JOIN") ? { type: "RESERVED_JOIN" } : RESERVED_JOIN] },
    {
      name: "keyword",
      symbols: ["keyword$subexpression$1"],
      postprocess: ([[T]]) => h(T)
    },
    { name: "data_type$subexpression$1", symbols: [G.has("RESERVED_DATA_TYPE") ? { type: "RESERVED_DATA_TYPE" } : RESERVED_DATA_TYPE] },
    { name: "data_type$subexpression$1", symbols: [G.has("RESERVED_DATA_TYPE_PHRASE") ? { type: "RESERVED_DATA_TYPE_PHRASE" } : RESERVED_DATA_TYPE_PHRASE] },
    {
      name: "data_type",
      symbols: ["data_type$subexpression$1"],
      postprocess: ([[T]]) => oT(T)
    },
    {
      name: "data_type",
      symbols: [G.has("RESERVED_PARAMETERIZED_DATA_TYPE") ? { type: "RESERVED_PARAMETERIZED_DATA_TYPE" } : RESERVED_PARAMETERIZED_DATA_TYPE, "_", "parenthesis"],
      postprocess: ([T, E, R]) => ({
        type: P.parameterized_data_type,
        dataType: V(oT(T), { trailing: E }),
        parenthesis: R
      })
    },
    { name: "logic_operator$subexpression$1", symbols: [G.has("AND") ? { type: "AND" } : AND] },
    { name: "logic_operator$subexpression$1", symbols: [G.has("OR") ? { type: "OR" } : OR] },
    { name: "logic_operator$subexpression$1", symbols: [G.has("XOR") ? { type: "XOR" } : XOR] },
    {
      name: "logic_operator",
      symbols: ["logic_operator$subexpression$1"],
      postprocess: ([[T]]) => h(T)
    },
    { name: "other_keyword$subexpression$1", symbols: [G.has("WHEN") ? { type: "WHEN" } : WHEN] },
    { name: "other_keyword$subexpression$1", symbols: [G.has("THEN") ? { type: "THEN" } : THEN] },
    { name: "other_keyword$subexpression$1", symbols: [G.has("ELSE") ? { type: "ELSE" } : ELSE] },
    { name: "other_keyword$subexpression$1", symbols: [G.has("END") ? { type: "END" } : END] },
    {
      name: "other_keyword",
      symbols: ["other_keyword$subexpression$1"],
      postprocess: ([[T]]) => h(T)
    },
    { name: "_$ebnf$1", symbols: [] },
    { name: "_$ebnf$1", symbols: ["_$ebnf$1", "comment"], postprocess: (T) => T[0].concat([T[1]]) },
    { name: "_", symbols: ["_$ebnf$1"], postprocess: ([T]) => T },
    {
      name: "comment",
      symbols: [G.has("LINE_COMMENT") ? { type: "LINE_COMMENT" } : LINE_COMMENT],
      postprocess: ([T]) => ({
        type: P.line_comment,
        text: T.text,
        precedingWhitespace: T.precedingWhitespace
      })
    },
    {
      name: "comment",
      symbols: [G.has("BLOCK_COMMENT") ? { type: "BLOCK_COMMENT" } : BLOCK_COMMENT],
      postprocess: ([T]) => ({
        type: P.block_comment,
        text: T.text,
        precedingWhitespace: T.precedingWhitespace
      })
    },
    {
      name: "comment",
      symbols: [G.has("DISABLE_COMMENT") ? { type: "DISABLE_COMMENT" } : DISABLE_COMMENT],
      postprocess: ([T]) => ({
        type: P.disable_comment,
        text: T.text,
        precedingWhitespace: T.precedingWhitespace
      })
    }
  ],
  ParserStart: "main"
}, { Parser: hI, Grammar: VI } = lI;
function WI(T) {
  let E = {};
  const R = new gT((S) => [
    ...GI(T.tokenize(S, E)),
    FT(S.length)
  ]), A = new hI(VI.fromCompiled(mI), { lexer: R });
  return {
    parse: (S, r) => {
      E = r;
      const { results: n } = A.feed(S);
      if (n.length === 1)
        return n[0];
      throw n.length === 0 ? new Error("Parse error: Invalid SQL") : new Error(`Parse error: Ambiguous grammar
${JSON.stringify(n, void 0, 2)}`);
    }
  };
}
var N;
(function(T) {
  T[T.SPACE = 0] = "SPACE", T[T.NO_SPACE = 1] = "NO_SPACE", T[T.NO_NEWLINE = 2] = "NO_NEWLINE", T[T.NEWLINE = 3] = "NEWLINE", T[T.MANDATORY_NEWLINE = 4] = "MANDATORY_NEWLINE", T[T.INDENT = 5] = "INDENT", T[T.SINGLE_INDENT = 6] = "SINGLE_INDENT";
})(N = N || (N = {}));
class XT {
  constructor(E) {
    this.indentation = E, this.items = [];
  }
  /**
   * Appends token strings and whitespace modifications to SQL string.
   */
  add(...E) {
    for (const R of E)
      switch (R) {
        case N.SPACE:
          this.items.push(N.SPACE);
          break;
        case N.NO_SPACE:
          this.trimHorizontalWhitespace();
          break;
        case N.NO_NEWLINE:
          this.trimWhitespace();
          break;
        case N.NEWLINE:
          this.trimHorizontalWhitespace(), this.addNewline(N.NEWLINE);
          break;
        case N.MANDATORY_NEWLINE:
          this.trimHorizontalWhitespace(), this.addNewline(N.MANDATORY_NEWLINE);
          break;
        case N.INDENT:
          this.addIndentation();
          break;
        case N.SINGLE_INDENT:
          this.items.push(N.SINGLE_INDENT);
          break;
        default:
          this.items.push(R);
      }
  }
  trimHorizontalWhitespace() {
    for (; fI(z(this.items)); )
      this.items.pop();
  }
  trimWhitespace() {
    for (; yI(z(this.items)); )
      this.items.pop();
  }
  addNewline(E) {
    if (this.items.length > 0)
      switch (z(this.items)) {
        case N.NEWLINE:
          this.items.pop(), this.items.push(E);
          break;
        case N.MANDATORY_NEWLINE:
          break;
        default:
          this.items.push(E);
          break;
      }
  }
  addIndentation() {
    for (let E = 0; E < this.indentation.getLevel(); E++)
      this.items.push(N.SINGLE_INDENT);
  }
  /**
   * Returns the final SQL string.
   */
  toString() {
    return this.items.map((E) => this.itemToString(E)).join("");
  }
  /**
   * Returns the internal layout data
   */
  getLayoutItems() {
    return this.items;
  }
  itemToString(E) {
    switch (E) {
      case N.SPACE:
        return " ";
      case N.NEWLINE:
      case N.MANDATORY_NEWLINE:
        return `
`;
      case N.SINGLE_INDENT:
        return this.indentation.getSingleIndent();
      default:
        return E;
    }
  }
}
const fI = (T) => T === N.SPACE || T === N.SINGLE_INDENT, yI = (T) => T === N.SPACE || T === N.SINGLE_INDENT || T === N.NEWLINE;
function PT(T, E) {
  if (E === "standard")
    return T;
  let R = [];
  return T.length >= 10 && T.includes(" ") && ([T, ...R] = T.split(" ")), E === "tabularLeft" ? T = T.padEnd(9, " ") : T = T.padStart(9, " "), T + ["", ...R].join(" ");
}
function MT(T) {
  return CR(T) || T === s.RESERVED_CLAUSE || T === s.RESERVED_SELECT || T === s.RESERVED_SET_OPERATION || T === s.RESERVED_JOIN || T === s.LIMIT;
}
const fE = "top-level", gI = "block-level";
class bT {
  /**
   * @param {string} indent A string to indent with
   */
  constructor(E) {
    this.indent = E, this.indentTypes = [];
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
    this.indentTypes.push(fE);
  }
  /**
   * Increases indentation by one block-level indent.
   */
  increaseBlockLevel() {
    this.indentTypes.push(gI);
  }
  /**
   * Decreases indentation by one top-level indent.
   * Does nothing when the previous indent is not top-level.
   */
  decreaseTopLevel() {
    this.indentTypes.length > 0 && z(this.indentTypes) === fE && this.indentTypes.pop();
  }
  /**
   * Decreases indentation by one block-level indent.
   * If there are top-level indents within the block-level indent,
   * throws away these as well.
   */
  decreaseBlockLevel() {
    for (; this.indentTypes.length > 0 && this.indentTypes.pop() === fE; )
      ;
  }
}
class XI extends XT {
  constructor(E) {
    super(new bT("")), this.expressionWidth = E, this.length = 0, this.trailingSpace = !1;
  }
  add(...E) {
    if (E.forEach((R) => this.addToLength(R)), this.length > this.expressionWidth)
      throw new gE();
    super.add(...E);
  }
  addToLength(E) {
    if (typeof E == "string")
      this.length += E.length, this.trailingSpace = !1;
    else {
      if (E === N.MANDATORY_NEWLINE || E === N.NEWLINE)
        throw new gE();
      E === N.INDENT || E === N.SINGLE_INDENT || E === N.SPACE ? this.trailingSpace || (this.length++, this.trailingSpace = !0) : (E === N.NO_NEWLINE || E === N.NO_SPACE) && this.trailingSpace && (this.trailingSpace = !1, this.length--);
    }
  }
}
class gE extends Error {
}
class NE {
  constructor({ cfg: E, dialectCfg: R, params: A, layout: S, inline: r = !1 }) {
    this.inline = !1, this.nodes = [], this.index = -1, this.cfg = E, this.dialectCfg = R, this.inline = r, this.params = A, this.layout = S;
  }
  format(E) {
    for (this.nodes = E, this.index = 0; this.index < this.nodes.length; this.index++)
      this.formatNode(this.nodes[this.index]);
    return this.layout;
  }
  formatNode(E) {
    this.formatComments(E.leadingComments), this.formatNodeWithoutComments(E), this.formatComments(E.trailingComments);
  }
  formatNodeWithoutComments(E) {
    switch (E.type) {
      case P.function_call:
        return this.formatFunctionCall(E);
      case P.parameterized_data_type:
        return this.formatParameterizedDataType(E);
      case P.array_subscript:
        return this.formatArraySubscript(E);
      case P.property_access:
        return this.formatPropertyAccess(E);
      case P.parenthesis:
        return this.formatParenthesis(E);
      case P.between_predicate:
        return this.formatBetweenPredicate(E);
      case P.case_expression:
        return this.formatCaseExpression(E);
      case P.case_when:
        return this.formatCaseWhen(E);
      case P.case_else:
        return this.formatCaseElse(E);
      case P.clause:
        return this.formatClause(E);
      case P.set_operation:
        return this.formatSetOperation(E);
      case P.limit_clause:
        return this.formatLimitClause(E);
      case P.all_columns_asterisk:
        return this.formatAllColumnsAsterisk(E);
      case P.literal:
        return this.formatLiteral(E);
      case P.identifier:
        return this.formatIdentifier(E);
      case P.parameter:
        return this.formatParameter(E);
      case P.operator:
        return this.formatOperator(E);
      case P.comma:
        return this.formatComma(E);
      case P.line_comment:
        return this.formatLineComment(E);
      case P.block_comment:
        return this.formatBlockComment(E);
      case P.disable_comment:
        return this.formatBlockComment(E);
      case P.data_type:
        return this.formatDataType(E);
      case P.keyword:
        return this.formatKeywordNode(E);
    }
  }
  formatFunctionCall(E) {
    this.withComments(E.nameKw, () => {
      this.layout.add(this.showFunctionKw(E.nameKw));
    }), this.formatNode(E.parenthesis);
  }
  formatParameterizedDataType(E) {
    this.withComments(E.dataType, () => {
      this.layout.add(this.showDataType(E.dataType));
    }), this.formatNode(E.parenthesis);
  }
  formatArraySubscript(E) {
    let R;
    switch (E.array.type) {
      case P.data_type:
        R = this.showDataType(E.array);
        break;
      case P.keyword:
        R = this.showKw(E.array);
        break;
      default:
        R = this.showIdentifier(E.array);
        break;
    }
    this.withComments(E.array, () => {
      this.layout.add(R);
    }), this.formatNode(E.parenthesis);
  }
  formatPropertyAccess(E) {
    this.formatNode(E.object), this.layout.add(N.NO_SPACE, E.operator), this.formatNode(E.property);
  }
  formatParenthesis(E) {
    const R = this.formatInlineExpression(E.children);
    R ? (this.layout.add(E.openParen), this.layout.add(...R.getLayoutItems()), this.layout.add(N.NO_SPACE, E.closeParen, N.SPACE)) : (this.layout.add(E.openParen, N.NEWLINE), q(this.cfg) ? (this.layout.add(N.INDENT), this.layout = this.formatSubExpression(E.children)) : (this.layout.indentation.increaseBlockLevel(), this.layout.add(N.INDENT), this.layout = this.formatSubExpression(E.children), this.layout.indentation.decreaseBlockLevel()), this.layout.add(N.NEWLINE, N.INDENT, E.closeParen, N.SPACE));
  }
  formatBetweenPredicate(E) {
    this.layout.add(this.showKw(E.betweenKw), N.SPACE), this.layout = this.formatSubExpression(E.expr1), this.layout.add(N.NO_SPACE, N.SPACE, this.showNonTabularKw(E.andKw), N.SPACE), this.layout = this.formatSubExpression(E.expr2), this.layout.add(N.SPACE);
  }
  formatCaseExpression(E) {
    this.formatNode(E.caseKw), this.layout.indentation.increaseBlockLevel(), this.layout = this.formatSubExpression(E.expr), this.layout = this.formatSubExpression(E.clauses), this.layout.indentation.decreaseBlockLevel(), this.layout.add(N.NEWLINE, N.INDENT), this.formatNode(E.endKw);
  }
  formatCaseWhen(E) {
    this.layout.add(N.NEWLINE, N.INDENT), this.formatNode(E.whenKw), this.layout = this.formatSubExpression(E.condition), this.formatNode(E.thenKw), this.layout = this.formatSubExpression(E.result);
  }
  formatCaseElse(E) {
    this.layout.add(N.NEWLINE, N.INDENT), this.formatNode(E.elseKw), this.layout = this.formatSubExpression(E.result);
  }
  formatClause(E) {
    this.isOnelineClause(E) ? this.formatClauseInOnelineStyle(E) : q(this.cfg) ? this.formatClauseInTabularStyle(E) : this.formatClauseInIndentedStyle(E);
  }
  isOnelineClause(E) {
    return q(this.cfg) ? this.dialectCfg.tabularOnelineClauses[E.nameKw.text] : this.dialectCfg.onelineClauses[E.nameKw.text];
  }
  formatClauseInIndentedStyle(E) {
    this.layout.add(N.NEWLINE, N.INDENT, this.showKw(E.nameKw), N.NEWLINE), this.layout.indentation.increaseTopLevel(), this.layout.add(N.INDENT), this.layout = this.formatSubExpression(E.children), this.layout.indentation.decreaseTopLevel();
  }
  formatClauseInOnelineStyle(E) {
    this.layout.add(N.NEWLINE, N.INDENT, this.showKw(E.nameKw), N.SPACE), this.layout = this.formatSubExpression(E.children);
  }
  formatClauseInTabularStyle(E) {
    this.layout.add(N.NEWLINE, N.INDENT, this.showKw(E.nameKw), N.SPACE), this.layout.indentation.increaseTopLevel(), this.layout = this.formatSubExpression(E.children), this.layout.indentation.decreaseTopLevel();
  }
  formatSetOperation(E) {
    this.layout.add(N.NEWLINE, N.INDENT, this.showKw(E.nameKw), N.NEWLINE), this.layout.add(N.INDENT), this.layout = this.formatSubExpression(E.children);
  }
  formatLimitClause(E) {
    this.withComments(E.limitKw, () => {
      this.layout.add(N.NEWLINE, N.INDENT, this.showKw(E.limitKw));
    }), this.layout.indentation.increaseTopLevel(), q(this.cfg) ? this.layout.add(N.SPACE) : this.layout.add(N.NEWLINE, N.INDENT), E.offset ? (this.layout = this.formatSubExpression(E.offset), this.layout.add(N.NO_SPACE, ",", N.SPACE), this.layout = this.formatSubExpression(E.count)) : this.layout = this.formatSubExpression(E.count), this.layout.indentation.decreaseTopLevel();
  }
  formatAllColumnsAsterisk(E) {
    this.layout.add("*", N.SPACE);
  }
  formatLiteral(E) {
    this.layout.add(E.text, N.SPACE);
  }
  formatIdentifier(E) {
    this.layout.add(this.showIdentifier(E), N.SPACE);
  }
  formatParameter(E) {
    this.layout.add(this.params.get(E), N.SPACE);
  }
  formatOperator({ text: E }) {
    this.cfg.denseOperators || this.dialectCfg.alwaysDenseOperators.includes(E) ? this.layout.add(N.NO_SPACE, E) : E === ":" ? this.layout.add(N.NO_SPACE, E, N.SPACE) : this.layout.add(E, N.SPACE);
  }
  formatComma(E) {
    this.inline ? this.layout.add(N.NO_SPACE, ",", N.SPACE) : this.layout.add(N.NO_SPACE, ",", N.NEWLINE, N.INDENT);
  }
  withComments(E, R) {
    this.formatComments(E.leadingComments), R(), this.formatComments(E.trailingComments);
  }
  formatComments(E) {
    E && E.forEach((R) => {
      R.type === P.line_comment ? this.formatLineComment(R) : this.formatBlockComment(R);
    });
  }
  formatLineComment(E) {
    hE(E.precedingWhitespace || "") ? this.layout.add(N.NEWLINE, N.INDENT, E.text, N.MANDATORY_NEWLINE, N.INDENT) : this.layout.getLayoutItems().length > 0 ? this.layout.add(N.NO_NEWLINE, N.SPACE, E.text, N.MANDATORY_NEWLINE, N.INDENT) : this.layout.add(E.text, N.MANDATORY_NEWLINE, N.INDENT);
  }
  formatBlockComment(E) {
    E.type === P.block_comment && this.isMultilineBlockComment(E) ? (this.splitBlockComment(E.text).forEach((R) => {
      this.layout.add(N.NEWLINE, N.INDENT, R);
    }), this.layout.add(N.NEWLINE, N.INDENT)) : this.layout.add(E.text, N.SPACE);
  }
  isMultilineBlockComment(E) {
    return hE(E.text) || hE(E.precedingWhitespace || "");
  }
  isDocComment(E) {
    const R = E.split(/\n/);
    return (
      // first line starts with /* or /**
      /^\/\*\*?$/.test(R[0]) && // intermediate lines start with *
      R.slice(1, R.length - 1).every((A) => /^\s*\*/.test(A)) && // last line ends with */
      /^\s*\*\/$/.test(z(R))
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
  splitBlockComment(E) {
    return this.isDocComment(E) ? E.split(/\n/).map((R) => /^\s*\*/.test(R) ? " " + R.replace(/^\s*/, "") : R) : E.split(/\n/).map((R) => R.replace(/^\s*/, ""));
  }
  formatSubExpression(E) {
    return new NE({
      cfg: this.cfg,
      dialectCfg: this.dialectCfg,
      params: this.params,
      layout: this.layout,
      inline: this.inline
    }).format(E);
  }
  formatInlineExpression(E) {
    const R = this.params.getPositionalParameterIndex();
    try {
      return new NE({
        cfg: this.cfg,
        dialectCfg: this.dialectCfg,
        params: this.params,
        layout: new XI(this.cfg.expressionWidth),
        inline: !0
      }).format(E);
    } catch (A) {
      if (A instanceof gE) {
        this.params.setPositionalParameterIndex(R);
        return;
      } else
        throw A;
    }
  }
  formatKeywordNode(E) {
    switch (E.tokenType) {
      case s.RESERVED_JOIN:
        return this.formatJoin(E);
      case s.AND:
      case s.OR:
      case s.XOR:
        return this.formatLogicalOperator(E);
      default:
        return this.formatKeyword(E);
    }
  }
  formatJoin(E) {
    q(this.cfg) ? (this.layout.indentation.decreaseTopLevel(), this.layout.add(N.NEWLINE, N.INDENT, this.showKw(E), N.SPACE), this.layout.indentation.increaseTopLevel()) : this.layout.add(N.NEWLINE, N.INDENT, this.showKw(E), N.SPACE);
  }
  formatKeyword(E) {
    this.layout.add(this.showKw(E), N.SPACE);
  }
  formatLogicalOperator(E) {
    this.cfg.logicalOperatorNewline === "before" ? q(this.cfg) ? (this.layout.indentation.decreaseTopLevel(), this.layout.add(N.NEWLINE, N.INDENT, this.showKw(E), N.SPACE), this.layout.indentation.increaseTopLevel()) : this.layout.add(N.NEWLINE, N.INDENT, this.showKw(E), N.SPACE) : this.layout.add(this.showKw(E), N.NEWLINE, N.INDENT);
  }
  formatDataType(E) {
    this.layout.add(this.showDataType(E), N.SPACE);
  }
  showKw(E) {
    return MT(E.tokenType) ? PT(this.showNonTabularKw(E), this.cfg.indentStyle) : this.showNonTabularKw(E);
  }
  // Like showKw(), but skips tabular formatting
  showNonTabularKw(E) {
    switch (this.cfg.keywordCase) {
      case "preserve":
        return SE(E.raw);
      case "upper":
        return E.text;
      case "lower":
        return E.text.toLowerCase();
    }
  }
  showFunctionKw(E) {
    return MT(E.tokenType) ? PT(this.showNonTabularFunctionKw(E), this.cfg.indentStyle) : this.showNonTabularFunctionKw(E);
  }
  // Like showFunctionKw(), but skips tabular formatting
  showNonTabularFunctionKw(E) {
    switch (this.cfg.functionCase) {
      case "preserve":
        return SE(E.raw);
      case "upper":
        return E.text;
      case "lower":
        return E.text.toLowerCase();
    }
  }
  showIdentifier(E) {
    if (E.quoted)
      return E.text;
    switch (this.cfg.identifierCase) {
      case "preserve":
        return E.text;
      case "upper":
        return E.text.toUpperCase();
      case "lower":
        return E.text.toLowerCase();
    }
  }
  showDataType(E) {
    switch (this.cfg.dataTypeCase) {
      case "preserve":
        return SE(E.raw);
      case "upper":
        return E.text;
      case "lower":
        return E.text.toLowerCase();
    }
  }
}
class bI {
  constructor(E, R) {
    this.dialect = E, this.cfg = R, this.params = new MI(this.cfg.params);
  }
  /**
   * Formats an SQL query.
   * @param {string} query - The SQL query string to be formatted
   * @return {string} The formatter query
   */
  format(E) {
    const R = this.parse(E);
    return this.formatAst(R).trimEnd();
  }
  parse(E) {
    return WI(this.dialect.tokenizer).parse(E, this.cfg.paramTypes || {});
  }
  formatAst(E) {
    return E.map((R) => this.formatStatement(R)).join(`
`.repeat(this.cfg.linesBetweenQueries + 1));
  }
  formatStatement(E) {
    const R = new NE({
      cfg: this.cfg,
      dialectCfg: this.dialect.formatOptions,
      params: this.params,
      layout: new XT(new bT(PI(this.cfg)))
    }).format(E.children);
    return E.hasSemicolon && (this.cfg.newlineBeforeSemicolon ? R.add(N.NEWLINE, ";") : R.add(N.NO_NEWLINE, ";")), R.toString();
  }
}
class IE extends Error {
}
function KI(T) {
  const E = [
    "multilineLists",
    "newlineBeforeOpenParen",
    "newlineBeforeCloseParen",
    "aliasAs",
    "commaPosition",
    "tabulateAlias"
  ];
  for (const R of E)
    if (R in T)
      throw new IE(`${R} config is no more supported.`);
  if (T.expressionWidth <= 0)
    throw new IE(`expressionWidth config must be positive number. Received ${T.expressionWidth} instead.`);
  if (T.params && !vI(T.params) && console.warn('WARNING: All "params" option values should be strings.'), T.paramTypes && !xI(T.paramTypes))
    throw new IE("Empty regex given in custom paramTypes. That would result in matching infinite amount of parameters.");
  return T;
}
function vI(T) {
  return (T instanceof Array ? T : Object.values(T)).every((R) => typeof R == "string");
}
function xI(T) {
  return T.custom && Array.isArray(T.custom) ? T.custom.every((E) => E.regex !== "") : !0;
}
var $I = function(T, E) {
  var R = {};
  for (var A in T) Object.prototype.hasOwnProperty.call(T, A) && E.indexOf(A) < 0 && (R[A] = T[A]);
  if (T != null && typeof Object.getOwnPropertySymbols == "function")
    for (var S = 0, A = Object.getOwnPropertySymbols(T); S < A.length; S++)
      E.indexOf(A[S]) < 0 && Object.prototype.propertyIsEnumerable.call(T, A[S]) && (R[A[S]] = T[A[S]]);
  return R;
};
const KT = {
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
}, wI = Object.keys(KT), JI = {
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
}, QI = (T, E = {}) => {
  if (typeof E.language == "string" && !wI.includes(E.language))
    throw new IE(`Unsupported SQL dialect: ${E.language}`);
  const R = KT[E.language || "sql"];
  return ZI(T, Object.assign(Object.assign({}, E), { dialect: AI[R] }));
}, ZI = (T, E) => {
  var { dialect: R } = E, A = $I(E, ["dialect"]);
  if (typeof T != "string")
    throw new Error("Invalid query argument. Expected string, instead got " + typeof T);
  const S = KI(Object.assign(Object.assign({}, JI), A));
  return new bI(iI(R), S).format(T);
};
function qI(T) {
  if (!T || typeof T != "string")
    return "";
  try {
    return QI(T, {
      language: "postgresql",
      tabWidth: 2,
      keywordCase: "upper",
      linesBetweenQueries: 1
    });
  } catch {
    return T;
  }
}
function kI(T, E = !1) {
  if (!T || typeof T != "string")
    return "";
  const R = E ? qI(T) : T;
  return OE.highlight(R, OE.languages.sql, "sql");
}
function vT(T, E = !0) {
  let R;
  if (typeof T == "string")
    try {
      const A = JSON.parse(T);
      R = E ? JSON.stringify(A, null, 2) : T;
    } catch {
      R = T;
    }
  else
    try {
      R = JSON.stringify(T, null, E ? 2 : 0);
    } catch {
      R = String(T ?? "");
    }
  return OE.highlight(R, OE.languages.json, "json");
}
function jI(T, E, R) {
  return `
    <div class="${R.panelControls}">
      <label class="${R.sortToggle}">
        <input type="checkbox" data-sort-toggle="${T}" ${E ? "checked" : ""}>
        <span>Newest first</span>
      </label>
    </div>
  `;
}
function zI(T, E, R) {
  return E ? `
      <button class="${T.copyBtnSm}" data-copy-trigger="${R}" title="Copy SQL">
        <i class="iconoir-copy"></i> Copy
      </button>
    ` : `
    <button class="${T.copyBtn}" data-copy-trigger title="Copy SQL">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
      </svg>
      Copy
    </button>
  `;
}
function EO(T, E, R, A) {
  const S = lT(T.duration, A.slowThresholdMs), r = S.isSlow, n = !!T.error, C = `sql-row-${E}`, M = T.query || "", I = kI(M, !0), L = [R.expandableRow];
  r && L.push(R.slowQuery), n && L.push(R.errorQuery);
  const _ = r ? R.durationSlow : "", D = zI(R, A.useIconCopyButton || !1, C);
  return `
    <tr class="${L.join(" ")}" data-row-id="${C}">
      <td class="${R.duration} ${_}">${S.text}</td>
      <td>${d(sE(T.row_count ?? "-"))}</td>
      <td class="${R.timestamp}">${d(tE(T.timestamp))}</td>
      <td>${n ? `<span class="${R.badgeError}">Error</span>` : ""}</td>
      <td class="${R.queryText}"><span class="${R.expandIcon}">&#9654;</span>${d(M)}</td>
    </tr>
    <tr class="${R.expansionRow}" data-expansion-for="${C}">
      <td colspan="5">
        <div class="${R.expandedContent}" data-copy-content="${d(M)}">
          <div class="${R.expandedContentHeader}">
            ${D}
          </div>
          <pre>${I}</pre>
        </div>
      </td>
    </tr>
  `;
}
function DO(T, E, R = {}) {
  const {
    newestFirst: A = !0,
    slowThresholdMs: S = 50,
    maxEntries: r = 50,
    showSortToggle: n = !1,
    useIconCopyButton: C = !1
  } = R, M = n ? jI("sql", A, E) : "";
  if (!T.length)
    return M + `<div class="${E.emptyState}">No SQL queries captured</div>`;
  let I = r ? T.slice(-r) : T;
  A && (I = [...I].reverse());
  const L = I.map(
    (_, D) => EO(_, D, E, {
      ...R,
      slowThresholdMs: S,
      useIconCopyButton: C
    })
  ).join("");
  return `
    ${M}
    <table class="${E.table}">
      <thead>
        <tr>
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
function TO(T, E, R) {
  return `
    <div class="${R.panelControls}">
      <label class="${R.sortToggle}">
        <input type="checkbox" data-sort-toggle="${T}" ${E ? "checked" : ""}>
        <span>Newest first</span>
      </label>
    </div>
  `;
}
function RO(T, E, R) {
  const A = (T.level || "INFO").toUpperCase(), S = A.toLowerCase(), r = T.message || "", n = T.source || "", C = E.badgeLevel(S), I = S === "error" || S === "fatal" ? E.rowError : "", L = R.truncateMessage ? cT(r, R.maxMessageLength || 100) : r, _ = R.showSource ? `<td class="${E.timestamp}">${d(n)}</td>` : "";
  return `
    <tr class="${I}">
      <td><span class="${C}">${d(A)}</span></td>
      <td class="${E.timestamp}">${d(tE(T.timestamp))}</td>
      <td class="${E.message}" title="${d(r)}">${d(L)}</td>
      ${_}
    </tr>
  `;
}
function oO(T, E, R = {}) {
  const {
    newestFirst: A = !0,
    maxEntries: S = 100,
    showSortToggle: r = !1,
    showSource: n = !1,
    truncateMessage: C = !0,
    maxMessageLength: M = 100
  } = R, I = r ? TO("logs", A, E) : "";
  if (!T.length)
    return I + `<div class="${E.emptyState}">No logs captured</div>`;
  let L = S ? T.slice(-S) : T;
  A && (L = [...L].reverse());
  const _ = L.map(
    (B) => RO(B, E, {
      ...R,
      showSource: n,
      truncateMessage: C,
      maxMessageLength: M
    })
  ).join(""), D = n ? "<th>Source</th>" : "";
  return `
    ${I}
    <table class="${E.table}">
      <thead>
        <tr>
          <th>Level</th>
          <th>Time</th>
          <th>Message</th>
          ${D}
        </tr>
      </thead>
      <tbody>${_}</tbody>
    </table>
  `;
}
function AO(T, E, R) {
  const A = T.method || "GET", S = T.path || "", r = T.handler || "-", n = T.name || "", C = E.badgeMethod(A), M = R.showName ? `<td class="${E.timestamp}">${d(n)}</td>` : "";
  return `
    <tr>
      <td><span class="${C}">${d(A)}</span></td>
      <td class="${E.path}">${d(S)}</td>
      <td>${d(r)}</td>
      ${M}
    </tr>
  `;
}
function PO(T, E, R = {}) {
  const { showName: A = !1 } = R;
  if (!T.length)
    return `<div class="${E.emptyState}">No routes available</div>`;
  const S = T.map((n) => AO(n, E, { showName: A })).join(""), r = A ? "<th>Name</th>" : "";
  return `
    <table class="${E.tableRoutes || E.table}">
      <thead>
        <tr>
          <th>Method</th>
          <th>Path</th>
          <th>Handler</th>
          ${r}
        </tr>
      </thead>
      <tbody>${S}</tbody>
    </table>
  `;
}
function eO(T, E, R) {
  return E ? `
      <button class="${T.copyBtn}" data-copy-trigger="${R}" title="Copy to clipboard">
        <i class="iconoir-copy"></i> Copy
      </button>
    ` : `
    <button class="${T.copyBtn}" data-copy-trigger title="Copy JSON">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
      </svg>
      Copy
    </button>
  `;
}
function MO(T, E, R, A = {}) {
  const {
    useIconCopyButton: S = !1,
    filterFn: r,
    showCount: n = !0
  } = A, C = E && typeof E == "object" && !Array.isArray(E), M = Array.isArray(E);
  let I = E ?? {};
  if (C && r && (I = r(E)), C && Object.keys(I).length === 0 || M && I.length === 0 || !C && !M && !I)
    return `<div class="${R.emptyState}">No ${T.toLowerCase()} data available</div>`;
  const _ = GT(I), D = vT(I, !0), B = HT(I), u = M ? "items" : C ? "keys" : "entries", H = `copy-${T.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`, c = eO(R, S, H), F = n ? `<span class="${R.muted}">${sE(B)} ${u}</span>` : "";
  return `
    <section class="${R.jsonPanel}" data-copy-content="${d(_)}">
      <div class="${R.jsonHeader}">
        <span class="${R.jsonViewerTitle}">${d(T)}</span>
        <div class="${R.jsonActions}">
          ${F}
          ${c}
        </div>
      </div>
      <pre>${D}</pre>
    </section>
  `;
}
function SO(T, E) {
  return E ? `
      <button class="${T.copyBtn}" data-copy-trigger="custom-data" title="Copy to clipboard">
        <i class="iconoir-copy"></i> Copy
      </button>
    ` : `
    <button class="${T.copyBtn}" data-copy-trigger title="Copy JSON">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
      </svg>
      Copy
    </button>
  `;
}
function IO(T, E) {
  return `
    <tr>
      <td><span class="${E.badgeCustom}">${d(T.category || "custom")}</span></td>
      <td class="${E.timestamp}">${d(tE(T.timestamp))}</td>
      <td class="${E.message}">${d(T.message || "")}</td>
    </tr>
  `;
}
function OO(T, E, R) {
  const { useIconCopyButton: A = !1, showCount: S = !0 } = R, r = GT(T), n = vT(T, !0), C = SO(E, A), M = S ? `<span class="${E.muted}">${sE(HT(T))} keys</span>` : "";
  return `
    <div class="${E.jsonPanel}" data-copy-content="${d(r)}">
      <div class="${E.jsonHeader}">
        <span class="${E.jsonViewerTitle}">Custom Data</span>
        <div class="${E.jsonActions}">
          ${M}
          ${C}
        </div>
      </div>
      <div class="${E.jsonContent}">
        <pre>${n}</pre>
      </div>
    </div>
  `;
}
function NO(T, E, R) {
  const { maxLogEntries: A = 50 } = R;
  if (!T.length)
    return `<div class="${E.emptyState}">No custom logs yet.</div>`;
  const r = T.slice(-A).reverse().map((n) => IO(n, E)).join("");
  return `
    <table class="${E.table}">
      <thead>
        <tr>
          <th>Category</th>
          <th>Time</th>
          <th>Message</th>
        </tr>
      </thead>
      <tbody>${r}</tbody>
    </table>
  `;
}
function UO(T, E, R = {}) {
  const { dataFilterFn: A } = R, S = T.data || {}, r = A ? A(S) : S, n = T.logs || [], C = Object.keys(r).length > 0, M = n.length > 0;
  if (!C && !M)
    return `<div class="${E.emptyState}">No custom data captured</div>`;
  let I = "";
  return C && (I += OO(r, E, R)), M && (I += `
      <div class="${E.jsonPanel}">
        <div class="${E.jsonHeader}">
          <span class="${E.jsonViewerTitle}">Custom Logs</span>
          <span class="${E.muted}">${sE(n.length)} entries</span>
        </div>
        <div class="${E.jsonContent}">
          ${NO(n, E, R)}
        </div>
      </div>
    `), C && M ? `<div class="${E.jsonGrid}">${I}</div>` : I;
}
export {
  tO as D,
  rO as a,
  CO as b,
  aO as c,
  DO as d,
  d as e,
  GT as f,
  oO as g,
  PO as h,
  UO as i,
  MO as j,
  HT as k,
  sE as l,
  LO as m,
  sO as n,
  _O as o,
  iO as r,
  nO as t
};
//# sourceMappingURL=custom-DPYDzVjT.js.map
