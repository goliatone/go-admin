import { F as Ue } from "../chunks/toast-manager-CTShyzXw.js";
import { e as At, T as ht } from "../chunks/error-helpers-DitNcCtC.js";
import { b as tt, a as Ut } from "../chunks/badge-CqKzZ9y5.js";
class Vt {
  constructor(e = {}) {
    this.actionBasePath = e.actionBasePath || "", this.mode = e.mode || "dropdown", this.notifier = e.notifier || new Ue();
  }
  /**
   * Render row actions as HTML
   */
  renderRowActions(e, t) {
    if (this.mode === "dropdown")
      return this.renderRowActionsDropdown(e, t);
    const r = t.filter(
      (i) => !i.condition || i.condition(e)
    );
    return r.length === 0 ? '<div class="flex justify-end gap-2"></div>' : `<div class="flex justify-end gap-2">${r.map((i) => {
      const s = this.getVariantClass(i.variant || "secondary"), a = i.icon ? this.renderIcon(i.icon) : "", l = i.className || "";
      return `
        <button
          type="button"
          class="btn btn-sm ${s} ${l}"
          data-action-id="${this.sanitize(i.label)}"
          data-record-id="${e.id}"
        >
          ${a}
          ${this.sanitize(i.label)}
        </button>
      `;
    }).join("")}</div>`;
  }
  /**
   * Render row actions as dropdown menu
   */
  renderRowActionsDropdown(e, t) {
    const r = t.filter(
      (s) => !s.condition || s.condition(e)
    );
    if (r.length === 0)
      return '<div class="text-sm text-gray-400">No actions</div>';
    const n = `actions-menu-${e.id}`, i = this.buildDropdownItems(e, r);
    return `
      <div class="relative actions-dropdown" data-dropdown>
        <button type="button"
                class="actions-menu-trigger p-2 hover:bg-gray-100 rounded-md transition-colors"
                data-dropdown-trigger
                aria-label="Actions menu"
                aria-haspopup="true"
                aria-expanded="false">
          ${this.renderDotsIcon()}
        </button>

        <div id="${n}"
             class="actions-menu hidden absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-10 py-1"
             role="menu"
             aria-orientation="vertical">
          ${i}
        </div>
      </div>
    `;
  }
  /**
   * Build dropdown menu items HTML
   */
  buildDropdownItems(e, t) {
    return t.map((r, n) => {
      const i = r.variant === "danger", s = r.icon ? this.renderIcon(r.icon) : "";
      return `
        ${this.shouldShowDivider(r, n, t) ? '<div class="action-divider border-t border-gray-200 my-1"></div>' : ""}
        <button type="button"
                class="${i ? "action-item text-red-600 hover:bg-red-50" : "action-item text-gray-700 hover:bg-gray-50"} flex items-center gap-3 w-full px-4 py-2.5 transition-colors"
                data-action-id="${this.sanitize(r.label)}"
                data-record-id="${e.id}"
                role="menuitem">
          <span class="flex-shrink-0 w-5 h-5">${s}</span>
          <span class="text-sm font-medium">${this.escapeHtml(r.label)}</span>
        </button>
      `;
    }).join("");
  }
  /**
   * Determine if divider should be shown before action
   */
  shouldShowDivider(e, t, r) {
    return t === 0 ? !1 : e.variant === "danger" ? !0 : ["download", "archive", "delete", "remove"].some(
      (i) => e.label.toLowerCase().includes(i)
    );
  }
  /**
   * Render three-dot vertical icon
   */
  renderDotsIcon() {
    return `
      <svg class="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/>
      </svg>
    `;
  }
  /**
   * Render default actions (view, edit, delete)
   * NOTE: This method is deprecated - default actions are now handled in core.ts
   * Kept for backward compatibility
   */
  renderDefaultActions(e, t) {
    return '<div class="text-sm text-gray-400">Use core.ts for default actions</div>';
  }
  /**
   * Attach event listeners for row actions
   */
  attachRowActionListeners(e, t, r) {
    t.forEach((n) => {
      e.querySelectorAll(
        `[data-action-id="${this.sanitize(n.label)}"]`
      ).forEach((s) => {
        const a = s, l = a.dataset.recordId, c = r[l];
        c && a.addEventListener("click", async (d) => {
          d.preventDefault();
          try {
            await n.action(c);
          } catch (u) {
            console.error(`Action "${n.label}" failed:`, u);
            const f = u instanceof Error ? u.message : `Action "${n.label}" failed`;
            this.notifier.error(f);
          }
        });
      });
    });
  }
  /**
   * Render bulk actions toolbar
   */
  renderBulkActionsToolbar(e) {
    const t = document.createElement("div");
    t.id = "bulk-actions-bar", t.className = "hidden bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 flex items-center gap-4";
    const r = document.createElement("span");
    r.className = "text-sm font-medium text-blue-900", r.id = "selected-count", r.textContent = "0 items selected", t.appendChild(r);
    const n = document.createElement("div");
    n.className = "flex gap-2 flex-1", e.forEach((s) => {
      const a = document.createElement("button");
      a.type = "button", a.className = "btn btn-sm btn-primary", a.dataset.bulkAction = s.id, s.icon ? a.innerHTML = `${this.renderIcon(s.icon)} ${s.label}` : a.textContent = s.label, n.appendChild(a);
    }), t.appendChild(n);
    const i = document.createElement("button");
    return i.type = "button", i.className = "btn btn-sm btn-secondary", i.id = "clear-selection-btn", i.textContent = "Clear Selection", t.appendChild(i), t;
  }
  /**
   * Execute bulk action
   */
  async executeBulkAction(e, t) {
    if (e.guard && !e.guard(t)) {
      console.warn(`Bulk action "${e.id}" guard failed`);
      return;
    }
    if (e.confirm) {
      const r = e.confirm.replace("{count}", t.length.toString());
      if (!await this.notifier.confirm(r))
        return;
    }
    try {
      const r = await fetch(e.endpoint, {
        method: e.method || "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({ ids: t })
      });
      if (!r.ok) {
        const i = await At(r);
        throw this.notifier.error(i), new Error(i);
      }
      const n = await r.json();
      e.onSuccess && e.onSuccess(n);
    } catch (r) {
      if (console.error(`Bulk action "${e.id}" failed:`, r), !e.onError) {
        const n = r instanceof Error ? r.message : "Bulk action failed";
        this.notifier.error(n);
      }
      throw e.onError && e.onError(r), r;
    }
  }
  getVariantClass(e) {
    return {
      primary: "btn-primary",
      secondary: "btn-secondary",
      danger: "btn-danger",
      success: "btn-success",
      warning: "btn-warning"
    }[e] || "btn-secondary";
  }
  renderIcon(e) {
    return {
      eye: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>',
      edit: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>',
      trash: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>',
      "check-circle": '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
      pause: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
      "pause-circle": '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
      "x-circle": '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
      key: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/></svg>',
      archive: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"/></svg>',
      download: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>',
      copy: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>',
      "user-badge": '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>'
    }[e] || "";
  }
  sanitize(e) {
    return e.toLowerCase().replace(/[^a-z0-9]/g, "-");
  }
  escapeHtml(e) {
    const t = document.createElement("div");
    return t.textContent = e, t.innerHTML;
  }
}
class zt {
  constructor() {
    this.renderers = /* @__PURE__ */ new Map(), this.defaultRenderer = (e) => e == null ? '<span class="text-gray-400">-</span>' : typeof e == "boolean" ? e ? "Yes" : "No" : String(e), this.registerDefaultRenderers();
  }
  /**
   * Register a custom renderer for a column
   */
  register(e, t) {
    this.renderers.set(e, t);
  }
  /**
   * Get renderer for a column (fallback to default)
   */
  get(e) {
    return this.renderers.get(e) || this.defaultRenderer;
  }
  /**
   * Check if a custom renderer exists
   */
  has(e) {
    return this.renderers.has(e);
  }
  /**
   * Register built-in renderers
   */
  registerDefaultRenderers() {
    this.renderers.set("_badge", (e) => {
      const t = String(e).toLowerCase();
      return tt(String(e), "status", t);
    }), this.renderers.set("_date", (e) => {
      if (!e) return '<span class="text-gray-400">-</span>';
      try {
        return new Date(e).toLocaleDateString();
      } catch {
        return String(e);
      }
    }), this.renderers.set("_datetime", (e) => {
      if (!e) return '<span class="text-gray-400">-</span>';
      try {
        return new Date(e).toLocaleString();
      } catch {
        return String(e);
      }
    }), this.renderers.set("_boolean", (e) => `<div class="flex justify-center">${!!e ? '<svg class="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>' : '<svg class="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg>'}</div>`), this.renderers.set("_link", (e, t) => e ? `<a href="${t.url || t.link || "#"}" class="text-blue-600 hover:text-blue-800 underline">${e}</a>` : '<span class="text-gray-400">-</span>'), this.renderers.set("_email", (e) => e ? `<a href="mailto:${e}" class="text-blue-600 hover:text-blue-800">${e}</a>` : '<span class="text-gray-400">-</span>'), this.renderers.set("_url", (e) => e ? `<a href="${e}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 inline-flex items-center gap-1">
        ${e}
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
        </svg>
      </a>` : '<span class="text-gray-400">-</span>'), this.renderers.set("_number", (e) => e == null ? '<span class="text-gray-400">-</span>' : Number(e).toLocaleString()), this.renderers.set("_currency", (e) => e == null ? '<span class="text-gray-400">-</span>' : new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD"
    }).format(Number(e))), this.renderers.set("_percentage", (e) => e == null ? '<span class="text-gray-400">-</span>' : `${Number(e).toFixed(2)}%`), this.renderers.set("_filesize", (e) => {
      if (!e) return '<span class="text-gray-400">-</span>';
      const t = Number(e), r = ["Bytes", "KB", "MB", "GB", "TB"];
      if (t === 0) return "0 Bytes";
      const n = Math.floor(Math.log(t) / Math.log(1024));
      return `${(t / Math.pow(1024, n)).toFixed(2)} ${r[n]}`;
    }), this.renderers.set("_truncate", (e) => {
      if (!e) return '<span class="text-gray-400">-</span>';
      const t = String(e), r = 50;
      return t.length <= r ? t : `<span title="${t}">${t.substring(0, r)}...</span>`;
    }), this.renderers.set("_array", (e) => !Array.isArray(e) || e.length === 0 ? '<span class="text-gray-400">-</span>' : e.join(", ")), this.renderers.set("_tags", (e) => !Array.isArray(e) || e.length === 0 ? '<span class="text-gray-400">-</span>' : e.map(
      (t) => `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 mr-1">${t}</span>`
    ).join("")), this.renderers.set("_image", (e) => e ? `<img src="${e}" alt="Thumbnail" class="h-10 w-10 rounded object-cover" />` : '<span class="text-gray-400">-</span>'), this.renderers.set("_avatar", (e, t) => {
      const r = t.name || t.username || t.email || "U", n = r.charAt(0).toUpperCase();
      return e ? `<img src="${e}" alt="${r}" class="h-8 w-8 rounded-full object-cover" />` : `<div class="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium text-sm">${n}</div>`;
    });
  }
}
const jr = {
  /**
   * Status badge renderer with custom colors
   */
  statusBadge: (o) => (e) => {
    const t = String(e).toLowerCase();
    return tt(String(e), "status", t);
  },
  /**
   * Role badge renderer with color mapping
   */
  roleBadge: (o) => (e) => {
    const t = String(e).toLowerCase();
    return tt(String(e), "role", t);
  },
  /**
   * Combined name+email renderer
   */
  userInfo: (o, e) => {
    const t = o || e.name || e.username || "-", r = e.email || "";
    return r ? `<div><div class="font-medium text-gray-900">${t}</div><div class="text-sm text-gray-500">${r}</div></div>` : `<div class="font-medium text-gray-900">${t}</div>`;
  },
  /**
   * Boolean chip renderer with icon + label (e.g., [✓ Yes] or [✕ No])
   */
  booleanChip: (o) => (e) => Ut(!!e, o),
  /**
   * Relative time renderer (e.g., "2 hours ago")
   */
  relativeTime: (o) => {
    if (!o) return '<span class="text-gray-400">-</span>';
    try {
      const e = new Date(o), r = (/* @__PURE__ */ new Date()).getTime() - e.getTime(), n = Math.floor(r / 6e4), i = Math.floor(r / 36e5), s = Math.floor(r / 864e5);
      return n < 1 ? "Just now" : n < 60 ? `${n} minute${n > 1 ? "s" : ""} ago` : i < 24 ? `${i} hour${i > 1 ? "s" : ""} ago` : s < 30 ? `${s} day${s > 1 ? "s" : ""} ago` : e.toLocaleDateString();
    } catch {
      return String(o);
    }
  }
};
/**!
 * Sortable 1.15.6
 * @author	RubaXa   <trash@rubaxa.org>
 * @author	owenm    <owen23355@gmail.com>
 * @license MIT
 */
function ft(o, e) {
  var t = Object.keys(o);
  if (Object.getOwnPropertySymbols) {
    var r = Object.getOwnPropertySymbols(o);
    e && (r = r.filter(function(n) {
      return Object.getOwnPropertyDescriptor(o, n).enumerable;
    })), t.push.apply(t, r);
  }
  return t;
}
function V(o) {
  for (var e = 1; e < arguments.length; e++) {
    var t = arguments[e] != null ? arguments[e] : {};
    e % 2 ? ft(Object(t), !0).forEach(function(r) {
      Yt(o, r, t[r]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(o, Object.getOwnPropertyDescriptors(t)) : ft(Object(t)).forEach(function(r) {
      Object.defineProperty(o, r, Object.getOwnPropertyDescriptor(t, r));
    });
  }
  return o;
}
function Ie(o) {
  "@babel/helpers - typeof";
  return typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? Ie = function(e) {
    return typeof e;
  } : Ie = function(e) {
    return e && typeof Symbol == "function" && e.constructor === Symbol && e !== Symbol.prototype ? "symbol" : typeof e;
  }, Ie(o);
}
function Yt(o, e, t) {
  return e in o ? Object.defineProperty(o, e, {
    value: t,
    enumerable: !0,
    configurable: !0,
    writable: !0
  }) : o[e] = t, o;
}
function X() {
  return X = Object.assign || function(o) {
    for (var e = 1; e < arguments.length; e++) {
      var t = arguments[e];
      for (var r in t)
        Object.prototype.hasOwnProperty.call(t, r) && (o[r] = t[r]);
    }
    return o;
  }, X.apply(this, arguments);
}
function Xt(o, e) {
  if (o == null) return {};
  var t = {}, r = Object.keys(o), n, i;
  for (i = 0; i < r.length; i++)
    n = r[i], !(e.indexOf(n) >= 0) && (t[n] = o[n]);
  return t;
}
function Wt(o, e) {
  if (o == null) return {};
  var t = Xt(o, e), r, n;
  if (Object.getOwnPropertySymbols) {
    var i = Object.getOwnPropertySymbols(o);
    for (n = 0; n < i.length; n++)
      r = i[n], !(e.indexOf(r) >= 0) && Object.prototype.propertyIsEnumerable.call(o, r) && (t[r] = o[r]);
  }
  return t;
}
var Jt = "1.15.6";
function Y(o) {
  if (typeof window < "u" && window.navigator)
    return !!/* @__PURE__ */ navigator.userAgent.match(o);
}
var W = Y(/(?:Trident.*rv[ :]?11\.|msie|iemobile|Windows Phone)/i), ke = Y(/Edge/i), pt = Y(/firefox/i), Se = Y(/safari/i) && !Y(/chrome/i) && !Y(/android/i), at = Y(/iP(ad|od|hone)/i), kt = Y(/chrome/i) && Y(/android/i), Pt = {
  capture: !1,
  passive: !1
};
function w(o, e, t) {
  o.addEventListener(e, t, !W && Pt);
}
function y(o, e, t) {
  o.removeEventListener(e, t, !W && Pt);
}
function Fe(o, e) {
  if (e) {
    if (e[0] === ">" && (e = e.substring(1)), o)
      try {
        if (o.matches)
          return o.matches(e);
        if (o.msMatchesSelector)
          return o.msMatchesSelector(e);
        if (o.webkitMatchesSelector)
          return o.webkitMatchesSelector(e);
      } catch {
        return !1;
      }
    return !1;
  }
}
function Tt(o) {
  return o.host && o !== document && o.host.nodeType ? o.host : o.parentNode;
}
function G(o, e, t, r) {
  if (o) {
    t = t || document;
    do {
      if (e != null && (e[0] === ">" ? o.parentNode === t && Fe(o, e) : Fe(o, e)) || r && o === t)
        return o;
      if (o === t) break;
    } while (o = Tt(o));
  }
  return null;
}
var gt = /\s+/g;
function R(o, e, t) {
  if (o && e)
    if (o.classList)
      o.classList[t ? "add" : "remove"](e);
    else {
      var r = (" " + o.className + " ").replace(gt, " ").replace(" " + e + " ", " ");
      o.className = (r + (t ? " " + e : "")).replace(gt, " ");
    }
}
function p(o, e, t) {
  var r = o && o.style;
  if (r) {
    if (t === void 0)
      return document.defaultView && document.defaultView.getComputedStyle ? t = document.defaultView.getComputedStyle(o, "") : o.currentStyle && (t = o.currentStyle), e === void 0 ? t : t[e];
    !(e in r) && e.indexOf("webkit") === -1 && (e = "-webkit-" + e), r[e] = t + (typeof t == "string" ? "" : "px");
  }
}
function he(o, e) {
  var t = "";
  if (typeof o == "string")
    t = o;
  else
    do {
      var r = p(o, "transform");
      r && r !== "none" && (t = r + " " + t);
    } while (!e && (o = o.parentNode));
  var n = window.DOMMatrix || window.WebKitCSSMatrix || window.CSSMatrix || window.MSCSSMatrix;
  return n && new n(t);
}
function Lt(o, e, t) {
  if (o) {
    var r = o.getElementsByTagName(e), n = 0, i = r.length;
    if (t)
      for (; n < i; n++)
        t(r[n], n);
    return r;
  }
  return [];
}
function U() {
  var o = document.scrollingElement;
  return o || document.documentElement;
}
function A(o, e, t, r, n) {
  if (!(!o.getBoundingClientRect && o !== window)) {
    var i, s, a, l, c, d, u;
    if (o !== window && o.parentNode && o !== U() ? (i = o.getBoundingClientRect(), s = i.top, a = i.left, l = i.bottom, c = i.right, d = i.height, u = i.width) : (s = 0, a = 0, l = window.innerHeight, c = window.innerWidth, d = window.innerHeight, u = window.innerWidth), (e || t) && o !== window && (n = n || o.parentNode, !W))
      do
        if (n && n.getBoundingClientRect && (p(n, "transform") !== "none" || t && p(n, "position") !== "static")) {
          var f = n.getBoundingClientRect();
          s -= f.top + parseInt(p(n, "border-top-width")), a -= f.left + parseInt(p(n, "border-left-width")), l = s + i.height, c = a + i.width;
          break;
        }
      while (n = n.parentNode);
    if (r && o !== window) {
      var m = he(n || o), b = m && m.a, E = m && m.d;
      m && (s /= E, a /= b, u /= b, d /= E, l = s + d, c = a + u);
    }
    return {
      top: s,
      left: a,
      bottom: l,
      right: c,
      width: u,
      height: d
    };
  }
}
function mt(o, e, t) {
  for (var r = ee(o, !0), n = A(o)[e]; r; ) {
    var i = A(r)[t], s = void 0;
    if (s = n >= i, !s) return r;
    if (r === U()) break;
    r = ee(r, !1);
  }
  return !1;
}
function fe(o, e, t, r) {
  for (var n = 0, i = 0, s = o.children; i < s.length; ) {
    if (s[i].style.display !== "none" && s[i] !== g.ghost && (r || s[i] !== g.dragged) && G(s[i], t.draggable, o, !1)) {
      if (n === e)
        return s[i];
      n++;
    }
    i++;
  }
  return null;
}
function lt(o, e) {
  for (var t = o.lastElementChild; t && (t === g.ghost || p(t, "display") === "none" || e && !Fe(t, e)); )
    t = t.previousElementSibling;
  return t || null;
}
function F(o, e) {
  var t = 0;
  if (!o || !o.parentNode)
    return -1;
  for (; o = o.previousElementSibling; )
    o.nodeName.toUpperCase() !== "TEMPLATE" && o !== g.clone && (!e || Fe(o, e)) && t++;
  return t;
}
function vt(o) {
  var e = 0, t = 0, r = U();
  if (o)
    do {
      var n = he(o), i = n.a, s = n.d;
      e += o.scrollLeft * i, t += o.scrollTop * s;
    } while (o !== r && (o = o.parentNode));
  return [e, t];
}
function Qt(o, e) {
  for (var t in o)
    if (o.hasOwnProperty(t)) {
      for (var r in e)
        if (e.hasOwnProperty(r) && e[r] === o[t][r]) return Number(t);
    }
  return -1;
}
function ee(o, e) {
  if (!o || !o.getBoundingClientRect) return U();
  var t = o, r = !1;
  do
    if (t.clientWidth < t.scrollWidth || t.clientHeight < t.scrollHeight) {
      var n = p(t);
      if (t.clientWidth < t.scrollWidth && (n.overflowX == "auto" || n.overflowX == "scroll") || t.clientHeight < t.scrollHeight && (n.overflowY == "auto" || n.overflowY == "scroll")) {
        if (!t.getBoundingClientRect || t === document.body) return U();
        if (r || e) return t;
        r = !0;
      }
    }
  while (t = t.parentNode);
  return U();
}
function Kt(o, e) {
  if (o && e)
    for (var t in e)
      e.hasOwnProperty(t) && (o[t] = e[t]);
  return o;
}
function ze(o, e) {
  return Math.round(o.top) === Math.round(e.top) && Math.round(o.left) === Math.round(e.left) && Math.round(o.height) === Math.round(e.height) && Math.round(o.width) === Math.round(e.width);
}
var Ce;
function $t(o, e) {
  return function() {
    if (!Ce) {
      var t = arguments, r = this;
      t.length === 1 ? o.call(r, t[0]) : o.apply(r, t), Ce = setTimeout(function() {
        Ce = void 0;
      }, e);
    }
  };
}
function Zt() {
  clearTimeout(Ce), Ce = void 0;
}
function Bt(o, e, t) {
  o.scrollLeft += e, o.scrollTop += t;
}
function _t(o) {
  var e = window.Polymer, t = window.jQuery || window.Zepto;
  return e && e.dom ? e.dom(o).cloneNode(!0) : t ? t(o).clone(!0)[0] : o.cloneNode(!0);
}
function It(o, e, t) {
  var r = {};
  return Array.from(o.children).forEach(function(n) {
    var i, s, a, l;
    if (!(!G(n, e.draggable, o, !1) || n.animated || n === t)) {
      var c = A(n);
      r.left = Math.min((i = r.left) !== null && i !== void 0 ? i : 1 / 0, c.left), r.top = Math.min((s = r.top) !== null && s !== void 0 ? s : 1 / 0, c.top), r.right = Math.max((a = r.right) !== null && a !== void 0 ? a : -1 / 0, c.right), r.bottom = Math.max((l = r.bottom) !== null && l !== void 0 ? l : -1 / 0, c.bottom);
    }
  }), r.width = r.right - r.left, r.height = r.bottom - r.top, r.x = r.left, r.y = r.top, r;
}
var _ = "Sortable" + (/* @__PURE__ */ new Date()).getTime();
function er() {
  var o = [], e;
  return {
    captureAnimationState: function() {
      if (o = [], !!this.options.animation) {
        var r = [].slice.call(this.el.children);
        r.forEach(function(n) {
          if (!(p(n, "display") === "none" || n === g.ghost)) {
            o.push({
              target: n,
              rect: A(n)
            });
            var i = V({}, o[o.length - 1].rect);
            if (n.thisAnimationDuration) {
              var s = he(n, !0);
              s && (i.top -= s.f, i.left -= s.e);
            }
            n.fromRect = i;
          }
        });
      }
    },
    addAnimationState: function(r) {
      o.push(r);
    },
    removeAnimationState: function(r) {
      o.splice(Qt(o, {
        target: r
      }), 1);
    },
    animateAll: function(r) {
      var n = this;
      if (!this.options.animation) {
        clearTimeout(e), typeof r == "function" && r();
        return;
      }
      var i = !1, s = 0;
      o.forEach(function(a) {
        var l = 0, c = a.target, d = c.fromRect, u = A(c), f = c.prevFromRect, m = c.prevToRect, b = a.rect, E = he(c, !0);
        E && (u.top -= E.f, u.left -= E.e), c.toRect = u, c.thisAnimationDuration && ze(f, u) && !ze(d, u) && // Make sure animatingRect is on line between toRect & fromRect
        (b.top - u.top) / (b.left - u.left) === (d.top - u.top) / (d.left - u.left) && (l = rr(b, f, m, n.options)), ze(u, d) || (c.prevFromRect = d, c.prevToRect = u, l || (l = n.options.animation), n.animate(c, b, u, l)), l && (i = !0, s = Math.max(s, l), clearTimeout(c.animationResetTimer), c.animationResetTimer = setTimeout(function() {
          c.animationTime = 0, c.prevFromRect = null, c.fromRect = null, c.prevToRect = null, c.thisAnimationDuration = null;
        }, l), c.thisAnimationDuration = l);
      }), clearTimeout(e), i ? e = setTimeout(function() {
        typeof r == "function" && r();
      }, s) : typeof r == "function" && r(), o = [];
    },
    animate: function(r, n, i, s) {
      if (s) {
        p(r, "transition", ""), p(r, "transform", "");
        var a = he(this.el), l = a && a.a, c = a && a.d, d = (n.left - i.left) / (l || 1), u = (n.top - i.top) / (c || 1);
        r.animatingX = !!d, r.animatingY = !!u, p(r, "transform", "translate3d(" + d + "px," + u + "px,0)"), this.forRepaintDummy = tr(r), p(r, "transition", "transform " + s + "ms" + (this.options.easing ? " " + this.options.easing : "")), p(r, "transform", "translate3d(0,0,0)"), typeof r.animated == "number" && clearTimeout(r.animated), r.animated = setTimeout(function() {
          p(r, "transition", ""), p(r, "transform", ""), r.animated = !1, r.animatingX = !1, r.animatingY = !1;
        }, s);
      }
    }
  };
}
function tr(o) {
  return o.offsetWidth;
}
function rr(o, e, t, r) {
  return Math.sqrt(Math.pow(e.top - o.top, 2) + Math.pow(e.left - o.left, 2)) / Math.sqrt(Math.pow(e.top - t.top, 2) + Math.pow(e.left - t.left, 2)) * r.animation;
}
var le = [], Ye = {
  initializeByDefault: !0
}, Pe = {
  mount: function(e) {
    for (var t in Ye)
      Ye.hasOwnProperty(t) && !(t in e) && (e[t] = Ye[t]);
    le.forEach(function(r) {
      if (r.pluginName === e.pluginName)
        throw "Sortable: Cannot mount plugin ".concat(e.pluginName, " more than once");
    }), le.push(e);
  },
  pluginEvent: function(e, t, r) {
    var n = this;
    this.eventCanceled = !1, r.cancel = function() {
      n.eventCanceled = !0;
    };
    var i = e + "Global";
    le.forEach(function(s) {
      t[s.pluginName] && (t[s.pluginName][i] && t[s.pluginName][i](V({
        sortable: t
      }, r)), t.options[s.pluginName] && t[s.pluginName][e] && t[s.pluginName][e](V({
        sortable: t
      }, r)));
    });
  },
  initializePlugins: function(e, t, r, n) {
    le.forEach(function(a) {
      var l = a.pluginName;
      if (!(!e.options[l] && !a.initializeByDefault)) {
        var c = new a(e, t, e.options);
        c.sortable = e, c.options = e.options, e[l] = c, X(r, c.defaults);
      }
    });
    for (var i in e.options)
      if (e.options.hasOwnProperty(i)) {
        var s = this.modifyOption(e, i, e.options[i]);
        typeof s < "u" && (e.options[i] = s);
      }
  },
  getEventProperties: function(e, t) {
    var r = {};
    return le.forEach(function(n) {
      typeof n.eventProperties == "function" && X(r, n.eventProperties.call(t[n.pluginName], e));
    }), r;
  },
  modifyOption: function(e, t, r) {
    var n;
    return le.forEach(function(i) {
      e[i.pluginName] && i.optionListeners && typeof i.optionListeners[t] == "function" && (n = i.optionListeners[t].call(e[i.pluginName], r));
    }), n;
  }
};
function nr(o) {
  var e = o.sortable, t = o.rootEl, r = o.name, n = o.targetEl, i = o.cloneEl, s = o.toEl, a = o.fromEl, l = o.oldIndex, c = o.newIndex, d = o.oldDraggableIndex, u = o.newDraggableIndex, f = o.originalEvent, m = o.putSortable, b = o.extraEventProperties;
  if (e = e || t && t[_], !!e) {
    var E, I = e.options, $ = "on" + r.charAt(0).toUpperCase() + r.substr(1);
    window.CustomEvent && !W && !ke ? E = new CustomEvent(r, {
      bubbles: !0,
      cancelable: !0
    }) : (E = document.createEvent("Event"), E.initEvent(r, !0, !0)), E.to = s || t, E.from = a || t, E.item = n || t, E.clone = i, E.oldIndex = l, E.newIndex = c, E.oldDraggableIndex = d, E.newDraggableIndex = u, E.originalEvent = f, E.pullMode = m ? m.lastPutMode : void 0;
    var T = V(V({}, b), Pe.getEventProperties(r, e));
    for (var q in T)
      E[q] = T[q];
    t && t.dispatchEvent(E), I[$] && I[$].call(e, E);
  }
}
var or = ["evt"], B = function(e, t) {
  var r = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {}, n = r.evt, i = Wt(r, or);
  Pe.pluginEvent.bind(g)(e, t, V({
    dragEl: h,
    parentEl: x,
    ghostEl: v,
    rootEl: S,
    nextEl: ae,
    lastDownEl: Oe,
    cloneEl: C,
    cloneHidden: Z,
    dragStarted: ye,
    putSortable: k,
    activeSortable: g.active,
    originalEvent: n,
    oldIndex: ue,
    oldDraggableIndex: xe,
    newIndex: N,
    newDraggableIndex: K,
    hideGhostForTarget: Nt,
    unhideGhostForTarget: Ft,
    cloneNowHidden: function() {
      Z = !0;
    },
    cloneNowShown: function() {
      Z = !1;
    },
    dispatchSortableEvent: function(a) {
      L({
        sortable: t,
        name: a,
        originalEvent: n
      });
    }
  }, i));
};
function L(o) {
  nr(V({
    putSortable: k,
    cloneEl: C,
    targetEl: h,
    rootEl: S,
    oldIndex: ue,
    oldDraggableIndex: xe,
    newIndex: N,
    newDraggableIndex: K
  }, o));
}
var h, x, v, S, ae, Oe, C, Z, ue, N, xe, K, Le, k, de = !1, qe = !1, je = [], oe, j, Xe, We, bt, yt, ye, ce, De, Ae = !1, $e = !1, Me, P, Je = [], rt = !1, Ge = [], Ve = typeof document < "u", Be = at, wt = ke || W ? "cssFloat" : "float", ir = Ve && !kt && !at && "draggable" in document.createElement("div"), Ot = function() {
  if (Ve) {
    if (W)
      return !1;
    var o = document.createElement("x");
    return o.style.cssText = "pointer-events:auto", o.style.pointerEvents === "auto";
  }
}(), Mt = function(e, t) {
  var r = p(e), n = parseInt(r.width) - parseInt(r.paddingLeft) - parseInt(r.paddingRight) - parseInt(r.borderLeftWidth) - parseInt(r.borderRightWidth), i = fe(e, 0, t), s = fe(e, 1, t), a = i && p(i), l = s && p(s), c = a && parseInt(a.marginLeft) + parseInt(a.marginRight) + A(i).width, d = l && parseInt(l.marginLeft) + parseInt(l.marginRight) + A(s).width;
  if (r.display === "flex")
    return r.flexDirection === "column" || r.flexDirection === "column-reverse" ? "vertical" : "horizontal";
  if (r.display === "grid")
    return r.gridTemplateColumns.split(" ").length <= 1 ? "vertical" : "horizontal";
  if (i && a.float && a.float !== "none") {
    var u = a.float === "left" ? "left" : "right";
    return s && (l.clear === "both" || l.clear === u) ? "vertical" : "horizontal";
  }
  return i && (a.display === "block" || a.display === "flex" || a.display === "table" || a.display === "grid" || c >= n && r[wt] === "none" || s && r[wt] === "none" && c + d > n) ? "vertical" : "horizontal";
}, sr = function(e, t, r) {
  var n = r ? e.left : e.top, i = r ? e.right : e.bottom, s = r ? e.width : e.height, a = r ? t.left : t.top, l = r ? t.right : t.bottom, c = r ? t.width : t.height;
  return n === a || i === l || n + s / 2 === a + c / 2;
}, ar = function(e, t) {
  var r;
  return je.some(function(n) {
    var i = n[_].options.emptyInsertThreshold;
    if (!(!i || lt(n))) {
      var s = A(n), a = e >= s.left - i && e <= s.right + i, l = t >= s.top - i && t <= s.bottom + i;
      if (a && l)
        return r = n;
    }
  }), r;
}, Rt = function(e) {
  function t(i, s) {
    return function(a, l, c, d) {
      var u = a.options.group.name && l.options.group.name && a.options.group.name === l.options.group.name;
      if (i == null && (s || u))
        return !0;
      if (i == null || i === !1)
        return !1;
      if (s && i === "clone")
        return i;
      if (typeof i == "function")
        return t(i(a, l, c, d), s)(a, l, c, d);
      var f = (s ? a : l).options.group.name;
      return i === !0 || typeof i == "string" && i === f || i.join && i.indexOf(f) > -1;
    };
  }
  var r = {}, n = e.group;
  (!n || Ie(n) != "object") && (n = {
    name: n
  }), r.name = n.name, r.checkPull = t(n.pull, !0), r.checkPut = t(n.put), r.revertClone = n.revertClone, e.group = r;
}, Nt = function() {
  !Ot && v && p(v, "display", "none");
}, Ft = function() {
  !Ot && v && p(v, "display", "");
};
Ve && !kt && document.addEventListener("click", function(o) {
  if (qe)
    return o.preventDefault(), o.stopPropagation && o.stopPropagation(), o.stopImmediatePropagation && o.stopImmediatePropagation(), qe = !1, !1;
}, !0);
var ie = function(e) {
  if (h) {
    e = e.touches ? e.touches[0] : e;
    var t = ar(e.clientX, e.clientY);
    if (t) {
      var r = {};
      for (var n in e)
        e.hasOwnProperty(n) && (r[n] = e[n]);
      r.target = r.rootEl = t, r.preventDefault = void 0, r.stopPropagation = void 0, t[_]._onDragOver(r);
    }
  }
}, lr = function(e) {
  h && h.parentNode[_]._isOutsideThisEl(e.target);
};
function g(o, e) {
  if (!(o && o.nodeType && o.nodeType === 1))
    throw "Sortable: `el` must be an HTMLElement, not ".concat({}.toString.call(o));
  this.el = o, this.options = e = X({}, e), o[_] = this;
  var t = {
    group: null,
    sort: !0,
    disabled: !1,
    store: null,
    handle: null,
    draggable: /^[uo]l$/i.test(o.nodeName) ? ">li" : ">*",
    swapThreshold: 1,
    // percentage; 0 <= x <= 1
    invertSwap: !1,
    // invert always
    invertedSwapThreshold: null,
    // will be set to same as swapThreshold if default
    removeCloneOnHide: !0,
    direction: function() {
      return Mt(o, this.options);
    },
    ghostClass: "sortable-ghost",
    chosenClass: "sortable-chosen",
    dragClass: "sortable-drag",
    ignore: "a, img",
    filter: null,
    preventOnFilter: !0,
    animation: 0,
    easing: null,
    setData: function(s, a) {
      s.setData("Text", a.textContent);
    },
    dropBubble: !1,
    dragoverBubble: !1,
    dataIdAttr: "data-id",
    delay: 0,
    delayOnTouchOnly: !1,
    touchStartThreshold: (Number.parseInt ? Number : window).parseInt(window.devicePixelRatio, 10) || 1,
    forceFallback: !1,
    fallbackClass: "sortable-fallback",
    fallbackOnBody: !1,
    fallbackTolerance: 0,
    fallbackOffset: {
      x: 0,
      y: 0
    },
    // Disabled on Safari: #1571; Enabled on Safari IOS: #2244
    supportPointer: g.supportPointer !== !1 && "PointerEvent" in window && (!Se || at),
    emptyInsertThreshold: 5
  };
  Pe.initializePlugins(this, o, t);
  for (var r in t)
    !(r in e) && (e[r] = t[r]);
  Rt(e);
  for (var n in this)
    n.charAt(0) === "_" && typeof this[n] == "function" && (this[n] = this[n].bind(this));
  this.nativeDraggable = e.forceFallback ? !1 : ir, this.nativeDraggable && (this.options.touchStartThreshold = 1), e.supportPointer ? w(o, "pointerdown", this._onTapStart) : (w(o, "mousedown", this._onTapStart), w(o, "touchstart", this._onTapStart)), this.nativeDraggable && (w(o, "dragover", this), w(o, "dragenter", this)), je.push(this.el), e.store && e.store.get && this.sort(e.store.get(this) || []), X(this, er());
}
g.prototype = /** @lends Sortable.prototype */
{
  constructor: g,
  _isOutsideThisEl: function(e) {
    !this.el.contains(e) && e !== this.el && (ce = null);
  },
  _getDirection: function(e, t) {
    return typeof this.options.direction == "function" ? this.options.direction.call(this, e, t, h) : this.options.direction;
  },
  _onTapStart: function(e) {
    if (e.cancelable) {
      var t = this, r = this.el, n = this.options, i = n.preventOnFilter, s = e.type, a = e.touches && e.touches[0] || e.pointerType && e.pointerType === "touch" && e, l = (a || e).target, c = e.target.shadowRoot && (e.path && e.path[0] || e.composedPath && e.composedPath()[0]) || l, d = n.filter;
      if (mr(r), !h && !(/mousedown|pointerdown/.test(s) && e.button !== 0 || n.disabled) && !c.isContentEditable && !(!this.nativeDraggable && Se && l && l.tagName.toUpperCase() === "SELECT") && (l = G(l, n.draggable, r, !1), !(l && l.animated) && Oe !== l)) {
        if (ue = F(l), xe = F(l, n.draggable), typeof d == "function") {
          if (d.call(this, e, l, this)) {
            L({
              sortable: t,
              rootEl: c,
              name: "filter",
              targetEl: l,
              toEl: r,
              fromEl: r
            }), B("filter", t, {
              evt: e
            }), i && e.preventDefault();
            return;
          }
        } else if (d && (d = d.split(",").some(function(u) {
          if (u = G(c, u.trim(), r, !1), u)
            return L({
              sortable: t,
              rootEl: u,
              name: "filter",
              targetEl: l,
              fromEl: r,
              toEl: r
            }), B("filter", t, {
              evt: e
            }), !0;
        }), d)) {
          i && e.preventDefault();
          return;
        }
        n.handle && !G(c, n.handle, r, !1) || this._prepareDragStart(e, a, l);
      }
    }
  },
  _prepareDragStart: function(e, t, r) {
    var n = this, i = n.el, s = n.options, a = i.ownerDocument, l;
    if (r && !h && r.parentNode === i) {
      var c = A(r);
      if (S = i, h = r, x = h.parentNode, ae = h.nextSibling, Oe = r, Le = s.group, g.dragged = h, oe = {
        target: h,
        clientX: (t || e).clientX,
        clientY: (t || e).clientY
      }, bt = oe.clientX - c.left, yt = oe.clientY - c.top, this._lastX = (t || e).clientX, this._lastY = (t || e).clientY, h.style["will-change"] = "all", l = function() {
        if (B("delayEnded", n, {
          evt: e
        }), g.eventCanceled) {
          n._onDrop();
          return;
        }
        n._disableDelayedDragEvents(), !pt && n.nativeDraggable && (h.draggable = !0), n._triggerDragStart(e, t), L({
          sortable: n,
          name: "choose",
          originalEvent: e
        }), R(h, s.chosenClass, !0);
      }, s.ignore.split(",").forEach(function(d) {
        Lt(h, d.trim(), Qe);
      }), w(a, "dragover", ie), w(a, "mousemove", ie), w(a, "touchmove", ie), s.supportPointer ? (w(a, "pointerup", n._onDrop), !this.nativeDraggable && w(a, "pointercancel", n._onDrop)) : (w(a, "mouseup", n._onDrop), w(a, "touchend", n._onDrop), w(a, "touchcancel", n._onDrop)), pt && this.nativeDraggable && (this.options.touchStartThreshold = 4, h.draggable = !0), B("delayStart", this, {
        evt: e
      }), s.delay && (!s.delayOnTouchOnly || t) && (!this.nativeDraggable || !(ke || W))) {
        if (g.eventCanceled) {
          this._onDrop();
          return;
        }
        s.supportPointer ? (w(a, "pointerup", n._disableDelayedDrag), w(a, "pointercancel", n._disableDelayedDrag)) : (w(a, "mouseup", n._disableDelayedDrag), w(a, "touchend", n._disableDelayedDrag), w(a, "touchcancel", n._disableDelayedDrag)), w(a, "mousemove", n._delayedDragTouchMoveHandler), w(a, "touchmove", n._delayedDragTouchMoveHandler), s.supportPointer && w(a, "pointermove", n._delayedDragTouchMoveHandler), n._dragStartTimer = setTimeout(l, s.delay);
      } else
        l();
    }
  },
  _delayedDragTouchMoveHandler: function(e) {
    var t = e.touches ? e.touches[0] : e;
    Math.max(Math.abs(t.clientX - this._lastX), Math.abs(t.clientY - this._lastY)) >= Math.floor(this.options.touchStartThreshold / (this.nativeDraggable && window.devicePixelRatio || 1)) && this._disableDelayedDrag();
  },
  _disableDelayedDrag: function() {
    h && Qe(h), clearTimeout(this._dragStartTimer), this._disableDelayedDragEvents();
  },
  _disableDelayedDragEvents: function() {
    var e = this.el.ownerDocument;
    y(e, "mouseup", this._disableDelayedDrag), y(e, "touchend", this._disableDelayedDrag), y(e, "touchcancel", this._disableDelayedDrag), y(e, "pointerup", this._disableDelayedDrag), y(e, "pointercancel", this._disableDelayedDrag), y(e, "mousemove", this._delayedDragTouchMoveHandler), y(e, "touchmove", this._delayedDragTouchMoveHandler), y(e, "pointermove", this._delayedDragTouchMoveHandler);
  },
  _triggerDragStart: function(e, t) {
    t = t || e.pointerType == "touch" && e, !this.nativeDraggable || t ? this.options.supportPointer ? w(document, "pointermove", this._onTouchMove) : t ? w(document, "touchmove", this._onTouchMove) : w(document, "mousemove", this._onTouchMove) : (w(h, "dragend", this), w(S, "dragstart", this._onDragStart));
    try {
      document.selection ? Re(function() {
        document.selection.empty();
      }) : window.getSelection().removeAllRanges();
    } catch {
    }
  },
  _dragStarted: function(e, t) {
    if (de = !1, S && h) {
      B("dragStarted", this, {
        evt: t
      }), this.nativeDraggable && w(document, "dragover", lr);
      var r = this.options;
      !e && R(h, r.dragClass, !1), R(h, r.ghostClass, !0), g.active = this, e && this._appendGhost(), L({
        sortable: this,
        name: "start",
        originalEvent: t
      });
    } else
      this._nulling();
  },
  _emulateDragOver: function() {
    if (j) {
      this._lastX = j.clientX, this._lastY = j.clientY, Nt();
      for (var e = document.elementFromPoint(j.clientX, j.clientY), t = e; e && e.shadowRoot && (e = e.shadowRoot.elementFromPoint(j.clientX, j.clientY), e !== t); )
        t = e;
      if (h.parentNode[_]._isOutsideThisEl(e), t)
        do {
          if (t[_]) {
            var r = void 0;
            if (r = t[_]._onDragOver({
              clientX: j.clientX,
              clientY: j.clientY,
              target: e,
              rootEl: t
            }), r && !this.options.dragoverBubble)
              break;
          }
          e = t;
        } while (t = Tt(t));
      Ft();
    }
  },
  _onTouchMove: function(e) {
    if (oe) {
      var t = this.options, r = t.fallbackTolerance, n = t.fallbackOffset, i = e.touches ? e.touches[0] : e, s = v && he(v, !0), a = v && s && s.a, l = v && s && s.d, c = Be && P && vt(P), d = (i.clientX - oe.clientX + n.x) / (a || 1) + (c ? c[0] - Je[0] : 0) / (a || 1), u = (i.clientY - oe.clientY + n.y) / (l || 1) + (c ? c[1] - Je[1] : 0) / (l || 1);
      if (!g.active && !de) {
        if (r && Math.max(Math.abs(i.clientX - this._lastX), Math.abs(i.clientY - this._lastY)) < r)
          return;
        this._onDragStart(e, !0);
      }
      if (v) {
        s ? (s.e += d - (Xe || 0), s.f += u - (We || 0)) : s = {
          a: 1,
          b: 0,
          c: 0,
          d: 1,
          e: d,
          f: u
        };
        var f = "matrix(".concat(s.a, ",").concat(s.b, ",").concat(s.c, ",").concat(s.d, ",").concat(s.e, ",").concat(s.f, ")");
        p(v, "webkitTransform", f), p(v, "mozTransform", f), p(v, "msTransform", f), p(v, "transform", f), Xe = d, We = u, j = i;
      }
      e.cancelable && e.preventDefault();
    }
  },
  _appendGhost: function() {
    if (!v) {
      var e = this.options.fallbackOnBody ? document.body : S, t = A(h, !0, Be, !0, e), r = this.options;
      if (Be) {
        for (P = e; p(P, "position") === "static" && p(P, "transform") === "none" && P !== document; )
          P = P.parentNode;
        P !== document.body && P !== document.documentElement ? (P === document && (P = U()), t.top += P.scrollTop, t.left += P.scrollLeft) : P = U(), Je = vt(P);
      }
      v = h.cloneNode(!0), R(v, r.ghostClass, !1), R(v, r.fallbackClass, !0), R(v, r.dragClass, !0), p(v, "transition", ""), p(v, "transform", ""), p(v, "box-sizing", "border-box"), p(v, "margin", 0), p(v, "top", t.top), p(v, "left", t.left), p(v, "width", t.width), p(v, "height", t.height), p(v, "opacity", "0.8"), p(v, "position", Be ? "absolute" : "fixed"), p(v, "zIndex", "100000"), p(v, "pointerEvents", "none"), g.ghost = v, e.appendChild(v), p(v, "transform-origin", bt / parseInt(v.style.width) * 100 + "% " + yt / parseInt(v.style.height) * 100 + "%");
    }
  },
  _onDragStart: function(e, t) {
    var r = this, n = e.dataTransfer, i = r.options;
    if (B("dragStart", this, {
      evt: e
    }), g.eventCanceled) {
      this._onDrop();
      return;
    }
    B("setupClone", this), g.eventCanceled || (C = _t(h), C.removeAttribute("id"), C.draggable = !1, C.style["will-change"] = "", this._hideClone(), R(C, this.options.chosenClass, !1), g.clone = C), r.cloneId = Re(function() {
      B("clone", r), !g.eventCanceled && (r.options.removeCloneOnHide || S.insertBefore(C, h), r._hideClone(), L({
        sortable: r,
        name: "clone"
      }));
    }), !t && R(h, i.dragClass, !0), t ? (qe = !0, r._loopId = setInterval(r._emulateDragOver, 50)) : (y(document, "mouseup", r._onDrop), y(document, "touchend", r._onDrop), y(document, "touchcancel", r._onDrop), n && (n.effectAllowed = "move", i.setData && i.setData.call(r, n, h)), w(document, "drop", r), p(h, "transform", "translateZ(0)")), de = !0, r._dragStartId = Re(r._dragStarted.bind(r, t, e)), w(document, "selectstart", r), ye = !0, window.getSelection().removeAllRanges(), Se && p(document.body, "user-select", "none");
  },
  // Returns true - if no further action is needed (either inserted or another condition)
  _onDragOver: function(e) {
    var t = this.el, r = e.target, n, i, s, a = this.options, l = a.group, c = g.active, d = Le === l, u = a.sort, f = k || c, m, b = this, E = !1;
    if (rt) return;
    function I(be, Gt) {
      B(be, b, V({
        evt: e,
        isOwner: d,
        axis: m ? "vertical" : "horizontal",
        revert: s,
        dragRect: n,
        targetRect: i,
        canSort: u,
        fromSortable: f,
        target: r,
        completed: T,
        onMove: function(ut, Ht) {
          return _e(S, t, h, n, ut, A(ut), e, Ht);
        },
        changed: q
      }, Gt));
    }
    function $() {
      I("dragOverAnimationCapture"), b.captureAnimationState(), b !== f && f.captureAnimationState();
    }
    function T(be) {
      return I("dragOverCompleted", {
        insertion: be
      }), be && (d ? c._hideClone() : c._showClone(b), b !== f && (R(h, k ? k.options.ghostClass : c.options.ghostClass, !1), R(h, a.ghostClass, !0)), k !== b && b !== g.active ? k = b : b === g.active && k && (k = null), f === b && (b._ignoreWhileAnimating = r), b.animateAll(function() {
        I("dragOverAnimationComplete"), b._ignoreWhileAnimating = null;
      }), b !== f && (f.animateAll(), f._ignoreWhileAnimating = null)), (r === h && !h.animated || r === t && !r.animated) && (ce = null), !a.dragoverBubble && !e.rootEl && r !== document && (h.parentNode[_]._isOutsideThisEl(e.target), !be && ie(e)), !a.dragoverBubble && e.stopPropagation && e.stopPropagation(), E = !0;
    }
    function q() {
      N = F(h), K = F(h, a.draggable), L({
        sortable: b,
        name: "change",
        toEl: t,
        newIndex: N,
        newDraggableIndex: K,
        originalEvent: e
      });
    }
    if (e.preventDefault !== void 0 && e.cancelable && e.preventDefault(), r = G(r, a.draggable, t, !0), I("dragOver"), g.eventCanceled) return E;
    if (h.contains(e.target) || r.animated && r.animatingX && r.animatingY || b._ignoreWhileAnimating === r)
      return T(!1);
    if (qe = !1, c && !a.disabled && (d ? u || (s = x !== S) : k === this || (this.lastPutMode = Le.checkPull(this, c, h, e)) && l.checkPut(this, c, h, e))) {
      if (m = this._getDirection(e, r) === "vertical", n = A(h), I("dragOverValid"), g.eventCanceled) return E;
      if (s)
        return x = S, $(), this._hideClone(), I("revert"), g.eventCanceled || (ae ? S.insertBefore(h, ae) : S.appendChild(h)), T(!0);
      var O = lt(t, a.draggable);
      if (!O || hr(e, m, this) && !O.animated) {
        if (O === h)
          return T(!1);
        if (O && t === e.target && (r = O), r && (i = A(r)), _e(S, t, h, n, r, i, e, !!r) !== !1)
          return $(), O && O.nextSibling ? t.insertBefore(h, O.nextSibling) : t.appendChild(h), x = t, q(), T(!0);
      } else if (O && ur(e, m, this)) {
        var te = fe(t, 0, a, !0);
        if (te === h)
          return T(!1);
        if (r = te, i = A(r), _e(S, t, h, n, r, i, e, !1) !== !1)
          return $(), t.insertBefore(h, te), x = t, q(), T(!0);
      } else if (r.parentNode === t) {
        i = A(r);
        var H = 0, re, pe = h.parentNode !== t, M = !sr(h.animated && h.toRect || n, r.animated && r.toRect || i, m), ge = m ? "top" : "left", J = mt(r, "top", "top") || mt(h, "top", "top"), me = J ? J.scrollTop : void 0;
        ce !== r && (re = i[ge], Ae = !1, $e = !M && a.invertSwap || pe), H = fr(e, r, i, m, M ? 1 : a.swapThreshold, a.invertedSwapThreshold == null ? a.swapThreshold : a.invertedSwapThreshold, $e, ce === r);
        var z;
        if (H !== 0) {
          var ne = F(h);
          do
            ne -= H, z = x.children[ne];
          while (z && (p(z, "display") === "none" || z === v));
        }
        if (H === 0 || z === r)
          return T(!1);
        ce = r, De = H;
        var ve = r.nextElementSibling, Q = !1;
        Q = H === 1;
        var Te = _e(S, t, h, n, r, i, e, Q);
        if (Te !== !1)
          return (Te === 1 || Te === -1) && (Q = Te === 1), rt = !0, setTimeout(dr, 30), $(), Q && !ve ? t.appendChild(h) : r.parentNode.insertBefore(h, Q ? ve : r), J && Bt(J, 0, me - J.scrollTop), x = h.parentNode, re !== void 0 && !$e && (Me = Math.abs(re - A(r)[ge])), q(), T(!0);
      }
      if (t.contains(h))
        return T(!1);
    }
    return !1;
  },
  _ignoreWhileAnimating: null,
  _offMoveEvents: function() {
    y(document, "mousemove", this._onTouchMove), y(document, "touchmove", this._onTouchMove), y(document, "pointermove", this._onTouchMove), y(document, "dragover", ie), y(document, "mousemove", ie), y(document, "touchmove", ie);
  },
  _offUpEvents: function() {
    var e = this.el.ownerDocument;
    y(e, "mouseup", this._onDrop), y(e, "touchend", this._onDrop), y(e, "pointerup", this._onDrop), y(e, "pointercancel", this._onDrop), y(e, "touchcancel", this._onDrop), y(document, "selectstart", this);
  },
  _onDrop: function(e) {
    var t = this.el, r = this.options;
    if (N = F(h), K = F(h, r.draggable), B("drop", this, {
      evt: e
    }), x = h && h.parentNode, N = F(h), K = F(h, r.draggable), g.eventCanceled) {
      this._nulling();
      return;
    }
    de = !1, $e = !1, Ae = !1, clearInterval(this._loopId), clearTimeout(this._dragStartTimer), nt(this.cloneId), nt(this._dragStartId), this.nativeDraggable && (y(document, "drop", this), y(t, "dragstart", this._onDragStart)), this._offMoveEvents(), this._offUpEvents(), Se && p(document.body, "user-select", ""), p(h, "transform", ""), e && (ye && (e.cancelable && e.preventDefault(), !r.dropBubble && e.stopPropagation()), v && v.parentNode && v.parentNode.removeChild(v), (S === x || k && k.lastPutMode !== "clone") && C && C.parentNode && C.parentNode.removeChild(C), h && (this.nativeDraggable && y(h, "dragend", this), Qe(h), h.style["will-change"] = "", ye && !de && R(h, k ? k.options.ghostClass : this.options.ghostClass, !1), R(h, this.options.chosenClass, !1), L({
      sortable: this,
      name: "unchoose",
      toEl: x,
      newIndex: null,
      newDraggableIndex: null,
      originalEvent: e
    }), S !== x ? (N >= 0 && (L({
      rootEl: x,
      name: "add",
      toEl: x,
      fromEl: S,
      originalEvent: e
    }), L({
      sortable: this,
      name: "remove",
      toEl: x,
      originalEvent: e
    }), L({
      rootEl: x,
      name: "sort",
      toEl: x,
      fromEl: S,
      originalEvent: e
    }), L({
      sortable: this,
      name: "sort",
      toEl: x,
      originalEvent: e
    })), k && k.save()) : N !== ue && N >= 0 && (L({
      sortable: this,
      name: "update",
      toEl: x,
      originalEvent: e
    }), L({
      sortable: this,
      name: "sort",
      toEl: x,
      originalEvent: e
    })), g.active && ((N == null || N === -1) && (N = ue, K = xe), L({
      sortable: this,
      name: "end",
      toEl: x,
      originalEvent: e
    }), this.save()))), this._nulling();
  },
  _nulling: function() {
    B("nulling", this), S = h = x = v = ae = C = Oe = Z = oe = j = ye = N = K = ue = xe = ce = De = k = Le = g.dragged = g.ghost = g.clone = g.active = null, Ge.forEach(function(e) {
      e.checked = !0;
    }), Ge.length = Xe = We = 0;
  },
  handleEvent: function(e) {
    switch (e.type) {
      case "drop":
      case "dragend":
        this._onDrop(e);
        break;
      case "dragenter":
      case "dragover":
        h && (this._onDragOver(e), cr(e));
        break;
      case "selectstart":
        e.preventDefault();
        break;
    }
  },
  /**
   * Serializes the item into an array of string.
   * @returns {String[]}
   */
  toArray: function() {
    for (var e = [], t, r = this.el.children, n = 0, i = r.length, s = this.options; n < i; n++)
      t = r[n], G(t, s.draggable, this.el, !1) && e.push(t.getAttribute(s.dataIdAttr) || gr(t));
    return e;
  },
  /**
   * Sorts the elements according to the array.
   * @param  {String[]}  order  order of the items
   */
  sort: function(e, t) {
    var r = {}, n = this.el;
    this.toArray().forEach(function(i, s) {
      var a = n.children[s];
      G(a, this.options.draggable, n, !1) && (r[i] = a);
    }, this), t && this.captureAnimationState(), e.forEach(function(i) {
      r[i] && (n.removeChild(r[i]), n.appendChild(r[i]));
    }), t && this.animateAll();
  },
  /**
   * Save the current sorting
   */
  save: function() {
    var e = this.options.store;
    e && e.set && e.set(this);
  },
  /**
   * For each element in the set, get the first element that matches the selector by testing the element itself and traversing up through its ancestors in the DOM tree.
   * @param   {HTMLElement}  el
   * @param   {String}       [selector]  default: `options.draggable`
   * @returns {HTMLElement|null}
   */
  closest: function(e, t) {
    return G(e, t || this.options.draggable, this.el, !1);
  },
  /**
   * Set/get option
   * @param   {string} name
   * @param   {*}      [value]
   * @returns {*}
   */
  option: function(e, t) {
    var r = this.options;
    if (t === void 0)
      return r[e];
    var n = Pe.modifyOption(this, e, t);
    typeof n < "u" ? r[e] = n : r[e] = t, e === "group" && Rt(r);
  },
  /**
   * Destroy
   */
  destroy: function() {
    B("destroy", this);
    var e = this.el;
    e[_] = null, y(e, "mousedown", this._onTapStart), y(e, "touchstart", this._onTapStart), y(e, "pointerdown", this._onTapStart), this.nativeDraggable && (y(e, "dragover", this), y(e, "dragenter", this)), Array.prototype.forEach.call(e.querySelectorAll("[draggable]"), function(t) {
      t.removeAttribute("draggable");
    }), this._onDrop(), this._disableDelayedDragEvents(), je.splice(je.indexOf(this.el), 1), this.el = e = null;
  },
  _hideClone: function() {
    if (!Z) {
      if (B("hideClone", this), g.eventCanceled) return;
      p(C, "display", "none"), this.options.removeCloneOnHide && C.parentNode && C.parentNode.removeChild(C), Z = !0;
    }
  },
  _showClone: function(e) {
    if (e.lastPutMode !== "clone") {
      this._hideClone();
      return;
    }
    if (Z) {
      if (B("showClone", this), g.eventCanceled) return;
      h.parentNode == S && !this.options.group.revertClone ? S.insertBefore(C, h) : ae ? S.insertBefore(C, ae) : S.appendChild(C), this.options.group.revertClone && this.animate(h, C), p(C, "display", ""), Z = !1;
    }
  }
};
function cr(o) {
  o.dataTransfer && (o.dataTransfer.dropEffect = "move"), o.cancelable && o.preventDefault();
}
function _e(o, e, t, r, n, i, s, a) {
  var l, c = o[_], d = c.options.onMove, u;
  return window.CustomEvent && !W && !ke ? l = new CustomEvent("move", {
    bubbles: !0,
    cancelable: !0
  }) : (l = document.createEvent("Event"), l.initEvent("move", !0, !0)), l.to = e, l.from = o, l.dragged = t, l.draggedRect = r, l.related = n || e, l.relatedRect = i || A(e), l.willInsertAfter = a, l.originalEvent = s, o.dispatchEvent(l), d && (u = d.call(c, l, s)), u;
}
function Qe(o) {
  o.draggable = !1;
}
function dr() {
  rt = !1;
}
function ur(o, e, t) {
  var r = A(fe(t.el, 0, t.options, !0)), n = It(t.el, t.options, v), i = 10;
  return e ? o.clientX < n.left - i || o.clientY < r.top && o.clientX < r.right : o.clientY < n.top - i || o.clientY < r.bottom && o.clientX < r.left;
}
function hr(o, e, t) {
  var r = A(lt(t.el, t.options.draggable)), n = It(t.el, t.options, v), i = 10;
  return e ? o.clientX > n.right + i || o.clientY > r.bottom && o.clientX > r.left : o.clientY > n.bottom + i || o.clientX > r.right && o.clientY > r.top;
}
function fr(o, e, t, r, n, i, s, a) {
  var l = r ? o.clientY : o.clientX, c = r ? t.height : t.width, d = r ? t.top : t.left, u = r ? t.bottom : t.right, f = !1;
  if (!s) {
    if (a && Me < c * n) {
      if (!Ae && (De === 1 ? l > d + c * i / 2 : l < u - c * i / 2) && (Ae = !0), Ae)
        f = !0;
      else if (De === 1 ? l < d + Me : l > u - Me)
        return -De;
    } else if (l > d + c * (1 - n) / 2 && l < u - c * (1 - n) / 2)
      return pr(e);
  }
  return f = f || s, f && (l < d + c * i / 2 || l > u - c * i / 2) ? l > d + c / 2 ? 1 : -1 : 0;
}
function pr(o) {
  return F(h) < F(o) ? 1 : -1;
}
function gr(o) {
  for (var e = o.tagName + o.className + o.src + o.href + o.textContent, t = e.length, r = 0; t--; )
    r += e.charCodeAt(t);
  return r.toString(36);
}
function mr(o) {
  Ge.length = 0;
  for (var e = o.getElementsByTagName("input"), t = e.length; t--; ) {
    var r = e[t];
    r.checked && Ge.push(r);
  }
}
function Re(o) {
  return setTimeout(o, 0);
}
function nt(o) {
  return clearTimeout(o);
}
Ve && w(document, "touchmove", function(o) {
  (g.active || de) && o.cancelable && o.preventDefault();
});
g.utils = {
  on: w,
  off: y,
  css: p,
  find: Lt,
  is: function(e, t) {
    return !!G(e, t, e, !1);
  },
  extend: Kt,
  throttle: $t,
  closest: G,
  toggleClass: R,
  clone: _t,
  index: F,
  nextTick: Re,
  cancelNextTick: nt,
  detectDirection: Mt,
  getChild: fe,
  expando: _
};
g.get = function(o) {
  return o[_];
};
g.mount = function() {
  for (var o = arguments.length, e = new Array(o), t = 0; t < o; t++)
    e[t] = arguments[t];
  e[0].constructor === Array && (e = e[0]), e.forEach(function(r) {
    if (!r.prototype || !r.prototype.constructor)
      throw "Sortable: Mounted plugin must be a constructor function, not ".concat({}.toString.call(r));
    r.utils && (g.utils = V(V({}, g.utils), r.utils)), Pe.mount(r);
  });
};
g.create = function(o, e) {
  return new g(o, e);
};
g.version = Jt;
var D = [], we, ot, it = !1, Ke, Ze, He, Ee;
function vr() {
  function o() {
    this.defaults = {
      scroll: !0,
      forceAutoScrollFallback: !1,
      scrollSensitivity: 30,
      scrollSpeed: 10,
      bubbleScroll: !0
    };
    for (var e in this)
      e.charAt(0) === "_" && typeof this[e] == "function" && (this[e] = this[e].bind(this));
  }
  return o.prototype = {
    dragStarted: function(t) {
      var r = t.originalEvent;
      this.sortable.nativeDraggable ? w(document, "dragover", this._handleAutoScroll) : this.options.supportPointer ? w(document, "pointermove", this._handleFallbackAutoScroll) : r.touches ? w(document, "touchmove", this._handleFallbackAutoScroll) : w(document, "mousemove", this._handleFallbackAutoScroll);
    },
    dragOverCompleted: function(t) {
      var r = t.originalEvent;
      !this.options.dragOverBubble && !r.rootEl && this._handleAutoScroll(r);
    },
    drop: function() {
      this.sortable.nativeDraggable ? y(document, "dragover", this._handleAutoScroll) : (y(document, "pointermove", this._handleFallbackAutoScroll), y(document, "touchmove", this._handleFallbackAutoScroll), y(document, "mousemove", this._handleFallbackAutoScroll)), Et(), Ne(), Zt();
    },
    nulling: function() {
      He = ot = we = it = Ee = Ke = Ze = null, D.length = 0;
    },
    _handleFallbackAutoScroll: function(t) {
      this._handleAutoScroll(t, !0);
    },
    _handleAutoScroll: function(t, r) {
      var n = this, i = (t.touches ? t.touches[0] : t).clientX, s = (t.touches ? t.touches[0] : t).clientY, a = document.elementFromPoint(i, s);
      if (He = t, r || this.options.forceAutoScrollFallback || ke || W || Se) {
        et(t, this.options, a, r);
        var l = ee(a, !0);
        it && (!Ee || i !== Ke || s !== Ze) && (Ee && Et(), Ee = setInterval(function() {
          var c = ee(document.elementFromPoint(i, s), !0);
          c !== l && (l = c, Ne()), et(t, n.options, c, r);
        }, 10), Ke = i, Ze = s);
      } else {
        if (!this.options.bubbleScroll || ee(a, !0) === U()) {
          Ne();
          return;
        }
        et(t, this.options, ee(a, !1), !1);
      }
    }
  }, X(o, {
    pluginName: "scroll",
    initializeByDefault: !0
  });
}
function Ne() {
  D.forEach(function(o) {
    clearInterval(o.pid);
  }), D = [];
}
function Et() {
  clearInterval(Ee);
}
var et = $t(function(o, e, t, r) {
  if (e.scroll) {
    var n = (o.touches ? o.touches[0] : o).clientX, i = (o.touches ? o.touches[0] : o).clientY, s = e.scrollSensitivity, a = e.scrollSpeed, l = U(), c = !1, d;
    ot !== t && (ot = t, Ne(), we = e.scroll, d = e.scrollFn, we === !0 && (we = ee(t, !0)));
    var u = 0, f = we;
    do {
      var m = f, b = A(m), E = b.top, I = b.bottom, $ = b.left, T = b.right, q = b.width, O = b.height, te = void 0, H = void 0, re = m.scrollWidth, pe = m.scrollHeight, M = p(m), ge = m.scrollLeft, J = m.scrollTop;
      m === l ? (te = q < re && (M.overflowX === "auto" || M.overflowX === "scroll" || M.overflowX === "visible"), H = O < pe && (M.overflowY === "auto" || M.overflowY === "scroll" || M.overflowY === "visible")) : (te = q < re && (M.overflowX === "auto" || M.overflowX === "scroll"), H = O < pe && (M.overflowY === "auto" || M.overflowY === "scroll"));
      var me = te && (Math.abs(T - n) <= s && ge + q < re) - (Math.abs($ - n) <= s && !!ge), z = H && (Math.abs(I - i) <= s && J + O < pe) - (Math.abs(E - i) <= s && !!J);
      if (!D[u])
        for (var ne = 0; ne <= u; ne++)
          D[ne] || (D[ne] = {});
      (D[u].vx != me || D[u].vy != z || D[u].el !== m) && (D[u].el = m, D[u].vx = me, D[u].vy = z, clearInterval(D[u].pid), (me != 0 || z != 0) && (c = !0, D[u].pid = setInterval(function() {
        r && this.layer === 0 && g.active._onTouchMove(He);
        var ve = D[this.layer].vy ? D[this.layer].vy * a : 0, Q = D[this.layer].vx ? D[this.layer].vx * a : 0;
        typeof d == "function" && d.call(g.dragged.parentNode[_], Q, ve, o, He, D[this.layer].el) !== "continue" || Bt(D[this.layer].el, Q, ve);
      }.bind({
        layer: u
      }), 24))), u++;
    } while (e.bubbleScroll && f !== l && (f = ee(f, !1)));
    it = c;
  }
}, 30), qt = function(e) {
  var t = e.originalEvent, r = e.putSortable, n = e.dragEl, i = e.activeSortable, s = e.dispatchSortableEvent, a = e.hideGhostForTarget, l = e.unhideGhostForTarget;
  if (t) {
    var c = r || i;
    a();
    var d = t.changedTouches && t.changedTouches.length ? t.changedTouches[0] : t, u = document.elementFromPoint(d.clientX, d.clientY);
    l(), c && !c.el.contains(u) && (s("spill"), this.onSpill({
      dragEl: n,
      putSortable: r
    }));
  }
};
function ct() {
}
ct.prototype = {
  startIndex: null,
  dragStart: function(e) {
    var t = e.oldDraggableIndex;
    this.startIndex = t;
  },
  onSpill: function(e) {
    var t = e.dragEl, r = e.putSortable;
    this.sortable.captureAnimationState(), r && r.captureAnimationState();
    var n = fe(this.sortable.el, this.startIndex, this.options);
    n ? this.sortable.el.insertBefore(t, n) : this.sortable.el.appendChild(t), this.sortable.animateAll(), r && r.animateAll();
  },
  drop: qt
};
X(ct, {
  pluginName: "revertOnSpill"
});
function dt() {
}
dt.prototype = {
  onSpill: function(e) {
    var t = e.dragEl, r = e.putSortable, n = r || this.sortable;
    n.captureAnimationState(), t.parentNode && t.parentNode.removeChild(t), n.animateAll();
  },
  drop: qt
};
X(dt, {
  pluginName: "removeOnSpill"
});
g.mount(new vr());
g.mount(dt, ct);
class br {
  constructor(e) {
    this.sortable = null, this.container = e.container, this.grid = e.grid, this.onReorder = e.onReorder, this.onToggle = e.onToggle, this.onReset = e.onReset, this.initialize();
  }
  initialize() {
    this.render(), this.setupDragAndDrop(), this.bindSwitchToggles();
  }
  /**
   * Render column items using safe DOM construction
   * Uses textContent for labels to prevent XSS
   */
  render() {
    const e = this.grid.config.columns, t = this.grid.state.hiddenColumns;
    this.container.innerHTML = "";
    const r = document.createElement("div");
    r.className = "column-list", r.setAttribute("role", "list"), r.setAttribute("aria-label", "Column visibility and order"), e.forEach((i) => {
      const s = this.createColumnItem(i.field, i.label || i.field, !t.has(i.field));
      r.appendChild(s);
    }), this.container.appendChild(r);
    const n = this.createFooter();
    this.container.appendChild(n);
  }
  /**
   * Create footer with Reset to Default button
   */
  createFooter() {
    const e = document.createElement("div");
    e.className = "column-manager-footer";
    const t = document.createElement("button");
    t.type = "button", t.className = "column-reset-btn", t.setAttribute("aria-label", "Reset columns to default");
    const r = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    r.setAttribute("class", "column-reset-icon"), r.setAttribute("viewBox", "0 0 24 24"), r.setAttribute("fill", "none"), r.setAttribute("stroke", "currentColor"), r.setAttribute("stroke-width", "2"), r.setAttribute("stroke-linecap", "round"), r.setAttribute("stroke-linejoin", "round");
    const n = document.createElementNS("http://www.w3.org/2000/svg", "path");
    n.setAttribute("d", "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8");
    const i = document.createElementNS("http://www.w3.org/2000/svg", "path");
    i.setAttribute("d", "M3 3v5h5"), r.appendChild(n), r.appendChild(i);
    const s = document.createElement("span");
    return s.textContent = "Reset to Default", t.appendChild(r), t.appendChild(s), t.addEventListener("click", () => {
      this.handleReset();
    }), e.appendChild(t), e;
  }
  /**
   * Handle reset button click
   */
  handleReset() {
    this.grid.resetColumnsToDefault(), this.onReset?.();
  }
  /**
   * Create a single column item element
   * Uses DOM APIs with textContent for safe label rendering
   * Includes full ARIA support for accessibility
   */
  createColumnItem(e, t, r) {
    const n = `column-item-${e}`, i = `column-switch-${e}`, s = document.createElement("div");
    s.className = "column-item", s.id = n, s.dataset.column = e, s.setAttribute("role", "listitem");
    const a = document.createElement("div");
    a.className = "column-item-content";
    const l = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    l.setAttribute("class", "drag-handle"), l.setAttribute("viewBox", "0 0 20 20"), l.setAttribute("fill", "currentColor"), l.setAttribute("aria-hidden", "true"), l.setAttribute("focusable", "false"), [
      [5, 4],
      [5, 10],
      [5, 16],
      [11, 4],
      [11, 10],
      [11, 16]
    ].forEach(([E, I]) => {
      const $ = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      $.setAttribute("cx", String(E)), $.setAttribute("cy", String(I)), $.setAttribute("r", "1.5"), l.appendChild($);
    });
    const d = document.createElement("span");
    d.className = "column-label", d.id = `${n}-label`, d.textContent = t, a.appendChild(l), a.appendChild(d);
    const u = document.createElement("label");
    u.className = "column-switch", u.htmlFor = i;
    const f = document.createElement("input");
    f.type = "checkbox", f.id = i, f.dataset.column = e, f.checked = r, f.setAttribute("role", "switch"), f.setAttribute("aria-checked", String(r)), f.setAttribute("aria-labelledby", `${n}-label`), f.setAttribute("aria-describedby", `${n}-desc`);
    const m = document.createElement("span");
    m.id = `${n}-desc`, m.className = "sr-only", m.textContent = `Press Space or Enter to toggle ${t} column visibility. Currently ${r ? "visible" : "hidden"}.`;
    const b = document.createElement("span");
    return b.className = "column-switch-slider", b.setAttribute("aria-hidden", "true"), u.appendChild(f), u.appendChild(b), s.appendChild(a), s.appendChild(u), s.appendChild(m), s;
  }
  /**
   * Setup SortableJS for drag-and-drop reordering
   */
  setupDragAndDrop() {
    const e = this.container.querySelector(".column-list") || this.container;
    this.sortable = g.create(e, {
      animation: 150,
      handle: ".drag-handle",
      ghostClass: "column-item-ghost",
      dragClass: "column-item-drag",
      chosenClass: "column-item-chosen",
      // Touch handling for mobile
      touchStartThreshold: 3,
      delay: 100,
      delayOnTouchOnly: !0,
      onEnd: () => {
        const t = e.querySelectorAll(".column-item"), r = Array.from(t).map(
          (n) => n.dataset.column
        );
        this.onReorder && this.onReorder(r), this.grid.reorderColumns(r), this.grid.config.behaviors?.columnVisibility?.reorderColumns?.(r, this.grid);
      }
    });
  }
  /**
   * Bind change events for visibility switches
   * Includes ARIA state updates for accessibility
   */
  bindSwitchToggles() {
    this.container.querySelectorAll('input[type="checkbox"]').forEach((t) => {
      t.addEventListener("change", () => {
        const r = t.dataset.column;
        if (!r) return;
        const n = t.checked;
        t.setAttribute("aria-checked", String(n));
        const i = `column-item-${r}-desc`, s = this.container.querySelector(`#${i}`);
        if (s) {
          const a = this.container.querySelector(`#column-item-${r}-label`)?.textContent || r;
          s.textContent = `Press Space or Enter to toggle ${a} column visibility. Currently ${n ? "visible" : "hidden"}.`;
        }
        this.onToggle && this.onToggle(r, n), this.grid.config.behaviors?.columnVisibility && this.grid.config.behaviors.columnVisibility.toggleColumn(r, this.grid);
      });
    });
  }
  /**
   * Update the switch state for a specific column
   * Called when visibility changes externally (e.g., URL restore)
   * Also updates ARIA attributes for accessibility
   */
  updateSwitchState(e, t) {
    const r = this.container.querySelector(
      `input[type="checkbox"][data-column="${e}"]`
    );
    r && (r.checked = t, r.setAttribute("aria-checked", String(t)));
  }
  /**
   * Sync all switch states with current grid state
   */
  syncWithGridState() {
    const e = this.grid.state.hiddenColumns;
    this.grid.config.columns.forEach((t) => {
      this.updateSwitchState(t.field, !e.has(t.field));
    });
  }
  /**
   * Get the current column order from the DOM
   */
  getColumnOrder() {
    const e = this.container.querySelectorAll(".column-item");
    return Array.from(e).map((t) => t.dataset.column);
  }
  /**
   * Re-render the column list (e.g., after columns change)
   */
  refresh() {
    this.destroy(), this.render(), this.setupDragAndDrop(), this.bindSwitchToggles();
  }
  /**
   * Cleanup - destroy SortableJS instance
   */
  destroy() {
    this.sortable && (this.sortable.destroy(), this.sortable = null);
  }
}
class yr {
  constructor(e) {
    this.tableEl = null, this.searchTimeout = null, this.abortController = null, this.dropdownAbortController = null, this.didRestoreColumnOrder = !1, this.shouldReorderDOMOnRestore = !1, this.recordsById = {}, this.columnManager = null, this.lastSchema = null, this.lastForm = null, this.config = {
      perPage: 10,
      searchDelay: 300,
      behaviors: {},
      ...e
    }, this.notifier = e.notifier || new Ue(), this.selectors = {
      table: `#${e.tableId}`,
      searchInput: "#table-search",
      perPageSelect: "#table-per-page",
      filterRow: "[data-filter-column]",
      columnToggleBtn: "#column-toggle-btn",
      columnToggleMenu: "#column-toggle-menu",
      exportBtn: "#export-btn",
      exportMenu: "#export-menu",
      paginationContainer: "#table-pagination",
      tableInfoStart: "#table-info-start",
      tableInfoEnd: "#table-info-end",
      tableInfoTotal: "#table-info-total",
      selectAllCheckbox: "#table-checkbox-all",
      rowCheckboxes: ".table-checkbox",
      bulkActionsBar: "#bulk-actions-bar",
      selectedCount: "#selected-count",
      ...e.selectors
    }, this.state = {
      currentPage: 1,
      perPage: this.config.perPage || 10,
      totalRows: 0,
      search: "",
      filters: [],
      sort: [],
      selectedRows: /* @__PURE__ */ new Set(),
      hiddenColumns: new Set(
        this.config.columns.filter((t) => t.hidden).map((t) => t.field)
      ),
      columnOrder: this.config.columns.map((t) => t.field)
      // Initialize with config column order
    }, this.actionRenderer = new Vt({
      mode: this.config.actionRenderMode || "dropdown",
      // Default to dropdown
      actionBasePath: this.config.actionBasePath || this.config.apiEndpoint,
      notifier: this.notifier
      // Pass notifier to ActionRenderer
    }), this.cellRendererRegistry = new zt(), this.config.cellRenderers && Object.entries(this.config.cellRenderers).forEach(([t, r]) => {
      this.cellRendererRegistry.register(t, r);
    }), this.defaultColumns = this.config.columns.map((t) => ({ ...t }));
  }
  /**
   * Initialize the data grid
   */
  init() {
    if (console.log("[DataGrid] Initializing with config:", this.config), this.tableEl = document.querySelector(this.selectors.table), !this.tableEl) {
      console.error(`[DataGrid] Table element not found: ${this.selectors.table}`);
      return;
    }
    console.log("[DataGrid] Table element found:", this.tableEl), this.restoreStateFromURL(), this.bindSearchInput(), this.bindPerPageSelect(), this.bindFilterInputs(), this.bindColumnVisibility(), this.bindExportButtons(), this.bindSorting(), this.bindSelection(), this.bindBulkActions(), this.bindBulkClearButton(), this.bindDropdownToggles(), this.refresh();
  }
  /**
   * Restore DataGrid state from URL parameters
   */
  restoreStateFromURL() {
    const e = new URLSearchParams(window.location.search);
    this.didRestoreColumnOrder = !1, this.shouldReorderDOMOnRestore = !1;
    const t = e.get("search");
    if (t) {
      this.state.search = t;
      const l = document.querySelector(this.selectors.searchInput);
      l && (l.value = t);
    }
    const r = e.get("page");
    if (r) {
      const l = parseInt(r, 10);
      this.state.currentPage = Number.isNaN(l) ? 1 : Math.max(1, l);
    }
    const n = e.get("perPage");
    if (n) {
      const l = parseInt(n, 10), c = this.config.perPage || 10;
      this.state.perPage = Number.isNaN(l) ? c : Math.max(1, l);
      const d = document.querySelector(this.selectors.perPageSelect);
      d && (d.value = String(this.state.perPage));
    }
    const i = e.get("filters");
    if (i)
      try {
        this.state.filters = JSON.parse(i);
      } catch (l) {
        console.warn("[DataGrid] Failed to parse filters from URL:", l);
      }
    const s = e.get("sort");
    if (s)
      try {
        this.state.sort = JSON.parse(s);
      } catch (l) {
        console.warn("[DataGrid] Failed to parse sort from URL:", l);
      }
    const a = e.get("hiddenColumns");
    if (a)
      try {
        const l = JSON.parse(a), c = new Set(this.config.columns.map((d) => d.field));
        this.state.hiddenColumns = new Set(
          (Array.isArray(l) ? l : []).filter((d) => c.has(d))
        );
      } catch (l) {
        console.warn("[DataGrid] Failed to parse hidden columns from URL:", l);
      }
    else if (this.config.behaviors?.columnVisibility) {
      const l = this.config.columns.map((d) => d.field), c = this.config.behaviors.columnVisibility.loadHiddenColumnsFromCache(l);
      c.size > 0 && (this.state.hiddenColumns = c);
    }
    if (this.config.behaviors?.columnVisibility?.loadColumnOrderFromCache) {
      const l = this.config.columns.map((d) => d.field), c = this.config.behaviors.columnVisibility.loadColumnOrderFromCache(l);
      if (c && c.length > 0) {
        const d = this.mergeColumnOrder(c);
        this.state.columnOrder = d, this.didRestoreColumnOrder = !0;
        const u = this.defaultColumns.map((m) => m.field);
        this.shouldReorderDOMOnRestore = u.join("|") !== d.join("|");
        const f = new Map(this.config.columns.map((m) => [m.field, m]));
        this.config.columns = d.map((m) => f.get(m)).filter((m) => m !== void 0), console.log("[DataGrid] Column order restored from cache:", d);
      }
    }
    console.log("[DataGrid] State restored from URL:", this.state), setTimeout(() => {
      this.applyRestoredState();
    }, 0);
  }
  /**
   * Apply restored state to UI elements
   */
  applyRestoredState() {
    this.state.filters.length > 0 && this.state.filters.forEach((t) => {
      const r = document.querySelector(
        `[data-filter-column="${t.column}"]`
      );
      r && (r.value = String(t.value));
    }), this.didRestoreColumnOrder && this.shouldReorderDOMOnRestore && this.reorderTableColumns(this.state.columnOrder);
    const e = this.config.columns.filter((t) => !this.state.hiddenColumns.has(t.field)).map((t) => t.field);
    this.updateColumnVisibility(e, !0), this.state.sort.length > 0 && this.updateSortIndicators();
  }
  /**
   * Push current state to URL without reloading page
   */
  pushStateToURL() {
    const e = new URLSearchParams();
    this.state.search && e.set("search", this.state.search), this.state.currentPage > 1 && e.set("page", String(this.state.currentPage)), this.state.perPage !== (this.config.perPage || 10) && e.set("perPage", String(this.state.perPage)), this.state.filters.length > 0 && e.set("filters", JSON.stringify(this.state.filters)), this.state.sort.length > 0 && e.set("sort", JSON.stringify(this.state.sort)), this.state.hiddenColumns.size > 0 && e.set("hiddenColumns", JSON.stringify(Array.from(this.state.hiddenColumns)));
    const t = e.toString() ? `${window.location.pathname}?${e.toString()}` : window.location.pathname;
    window.history.pushState({}, "", t), console.log("[DataGrid] URL updated:", t);
  }
  /**
   * Public API: sync current grid state to the URL.
   * Keeps `hiddenColumns` shareable; column order stays preferences-only by default.
   */
  syncURL() {
    this.pushStateToURL();
  }
  /**
   * Refresh data from API
   */
  async refresh() {
    console.log("[DataGrid] ===== refresh() CALLED ====="), console.log("[DataGrid] Current sort state:", JSON.stringify(this.state.sort)), this.abortController && this.abortController.abort(), this.abortController = new AbortController();
    try {
      const e = this.buildApiUrl(), t = await fetch(e, {
        signal: this.abortController.signal,
        headers: {
          Accept: "application/json"
        }
      });
      if (!t.ok)
        throw new Error(`HTTP error! status: ${t.status}`);
      const r = await t.json();
      console.log("[DataGrid] API Response:", r), console.log("[DataGrid] API Response data array:", r.data), console.log("[DataGrid] API Response total:", r.total, "count:", r.count, "$meta:", r.$meta), this.lastSchema = r.schema || null, this.lastForm = r.form || null;
      const n = this.getResponseTotal(r);
      if (this.normalizePagination(n))
        return this.refresh();
      console.log("[DataGrid] About to call renderData()..."), this.renderData(r), console.log("[DataGrid] renderData() completed"), this.updatePaginationUI(r), console.log("[DataGrid] ===== refresh() COMPLETED =====");
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        console.log("[DataGrid] Request aborted");
        return;
      }
      console.error("[DataGrid] Error fetching data:", e), this.showError("Failed to load data");
    }
  }
  /**
   * Build API URL with all query parameters
   */
  buildApiUrl() {
    const e = new URLSearchParams(), t = this.buildQueryParams();
    Object.entries(t).forEach(([n, i]) => {
      i != null && e.append(n, String(i));
    });
    const r = `${this.config.apiEndpoint}?${e.toString()}`;
    return console.log(`[DataGrid] API URL: ${r}`), r;
  }
  /**
   * Build query string (for exports, etc.)
   */
  buildQueryString() {
    const e = new URLSearchParams(), t = this.buildQueryParams();
    return Object.entries(t).forEach(([r, n]) => {
      n != null && e.append(r, String(n));
    }), e.toString();
  }
  /**
   * Build query parameters from state using behaviors
   */
  buildQueryParams() {
    const e = {};
    if (this.config.behaviors?.pagination) {
      const t = this.config.behaviors.pagination.buildQuery(
        this.state.currentPage,
        this.state.perPage
      );
      Object.assign(e, t);
    }
    if (this.state.search && this.config.behaviors?.search) {
      const t = this.config.behaviors.search.buildQuery(this.state.search);
      Object.assign(e, t);
    }
    if (this.state.filters.length > 0 && this.config.behaviors?.filter) {
      const t = this.config.behaviors.filter.buildFilters(this.state.filters);
      Object.assign(e, t);
    }
    if (this.state.sort.length > 0 && this.config.behaviors?.sort) {
      const t = this.config.behaviors.sort.buildQuery(this.state.sort);
      Object.assign(e, t);
    }
    return e;
  }
  getResponseTotal(e) {
    return e.total !== void 0 && e.total !== null ? e.total : e.$meta?.count !== void 0 && e.$meta?.count !== null ? e.$meta.count : e.count !== void 0 && e.count !== null ? e.count : null;
  }
  normalizePagination(e) {
    if (e === null)
      return !1;
    const t = Math.max(1, this.state.perPage || this.config.perPage || 10), r = Math.max(1, Math.ceil(e / t));
    let n = this.state.currentPage;
    e === 0 ? n = 1 : n > r ? n = r : n < 1 && (n = 1);
    const i = t !== this.state.perPage || n !== this.state.currentPage;
    return i && (this.state.perPage = t, this.state.currentPage = n, this.pushStateToURL()), e === 0 ? !1 : i;
  }
  /**
   * Reset pagination to first page
   */
  resetPagination() {
    this.state.currentPage = 1;
  }
  /**
   * Update column visibility
   */
  updateColumnVisibility(e, t = !1) {
    if (!this.tableEl) return;
    const r = new Set(e);
    this.state.hiddenColumns.clear(), this.config.columns.forEach((s) => {
      r.has(s.field) || this.state.hiddenColumns.add(s.field);
    }), t || this.pushStateToURL(), this.tableEl.querySelectorAll("thead th[data-column]").forEach((s) => {
      const a = s.dataset.column;
      a && (s.style.display = r.has(a) ? "" : "none");
    }), this.tableEl.querySelectorAll("tbody td[data-column]").forEach((s) => {
      const a = s.dataset.column;
      a && (s.style.display = r.has(a) ? "" : "none");
    }), this.syncColumnVisibilityCheckboxes();
  }
  /**
   * Sync column visibility switches with current state
   * Uses ColumnManager if available, falls back to direct DOM manipulation
   */
  syncColumnVisibilityCheckboxes() {
    if (this.columnManager) {
      this.columnManager.syncWithGridState();
      return;
    }
    const e = document.querySelector(this.selectors.columnToggleMenu);
    e && this.config.columns.forEach((t) => {
      const r = e.querySelector(
        `input[data-column="${t.field}"]`
      );
      r && (r.checked = !this.state.hiddenColumns.has(t.field));
    });
  }
  /**
   * Render data into table
   */
  renderData(e) {
    const t = this.tableEl?.querySelector("tbody");
    if (!t) {
      console.error("[DataGrid] tbody not found!");
      return;
    }
    t.innerHTML = "";
    const r = e.data || e.records || [];
    console.log(`[DataGrid] renderData() called with ${r.length} items`), console.log("[DataGrid] First 3 items:", r.slice(0, 3));
    const n = this.getResponseTotal(e);
    if (this.state.totalRows = n ?? r.length, r.length === 0) {
      t.innerHTML = `
        <tr>
          <td colspan="${this.config.columns.length + 2}" class="px-6 py-8 text-center text-gray-500">
            No results found
          </td>
        </tr>
      `;
      return;
    }
    this.recordsById = {}, r.forEach((i, s) => {
      console.log(`[DataGrid] Rendering row ${s + 1}: id=${i.id}, email=${i.email}, role=${i.role}, status=${i.status}`), i.id && (this.recordsById[i.id] = i);
      const a = this.createTableRow(i);
      t.appendChild(a);
    }), console.log(`[DataGrid] Finished appending ${r.length} rows to tbody`), console.log("[DataGrid] tbody.children.length =", t.children.length), this.state.hiddenColumns.size > 0 && t.querySelectorAll("td[data-column]").forEach((s) => {
      const a = s.dataset.column;
      a && this.state.hiddenColumns.has(a) && (s.style.display = "none");
    }), this.updateSelectionBindings();
  }
  /**
   * Fetch a detail payload and unwrap the record from the `data` field.
   */
  async fetchDetail(e) {
    const t = await fetch(`${this.config.apiEndpoint}/${e}`, {
      headers: {
        Accept: "application/json"
      }
    });
    if (!t.ok)
      throw new Error(`Detail request failed: ${t.status}`);
    const r = await t.json(), n = this.normalizeDetailResponse(r);
    return n.schema && (this.lastSchema = n.schema), n.form && (this.lastForm = n.form), {
      ...n,
      tabs: n.schema?.tabs || []
    };
  }
  /**
   * Access the most recent schema returned by the API (list or detail).
   */
  getSchema() {
    return this.lastSchema;
  }
  /**
   * Access the most recent form returned by the API (list or detail).
   */
  getForm() {
    return this.lastForm;
  }
  /**
   * Access tabs from the most recent schema payload.
   */
  getTabs() {
    return this.lastSchema?.tabs || [];
  }
  normalizeDetailResponse(e) {
    if (e && typeof e == "object" && "data" in e) {
      const t = e;
      return {
        data: t.data,
        schema: t.schema,
        form: t.form
      };
    }
    return { data: e };
  }
  /**
   * Create table row element
   */
  createTableRow(e) {
    const t = document.createElement("tr");
    let r = ["hover:bg-gray-50"];
    this.config.rowClassProvider && (r = r.concat(this.config.rowClassProvider(e))), t.className = r.join(" ");
    const n = document.createElement("td");
    n.className = "px-6 py-4 whitespace-nowrap", n.dataset.role = "selection", n.dataset.fixed = "left", n.innerHTML = `
      <label class="flex">
        <input type="checkbox"
               class="table-checkbox shrink-0 border-gray-300 rounded text-blue-600 focus:ring-blue-500"
               data-id="${e.id}">
        <span class="sr-only">Select</span>
      </label>
    `, t.appendChild(n), this.config.columns.forEach((a) => {
      const l = document.createElement("td");
      l.className = "px-6 py-4 whitespace-nowrap text-sm text-gray-800", l.setAttribute("data-column", a.field);
      const c = e[a.field];
      if (a.render)
        l.innerHTML = a.render(c, e);
      else if (this.cellRendererRegistry.has(a.field)) {
        const d = this.cellRendererRegistry.get(a.field);
        l.innerHTML = d(c, e, a.field);
      } else c == null ? l.textContent = "-" : a.field.includes("_at") ? l.textContent = new Date(c).toLocaleDateString() : l.textContent = String(c);
      t.appendChild(l);
    });
    const i = this.config.actionBasePath || this.config.apiEndpoint, s = document.createElement("td");
    if (s.className = "px-6 py-4 whitespace-nowrap text-end text-sm font-medium", s.dataset.role = "actions", s.dataset.fixed = "right", this.config.rowActions) {
      const a = this.config.rowActions(e);
      s.innerHTML = this.actionRenderer.renderRowActions(e, a), a.forEach((l) => {
        const c = this.sanitizeActionId(l.label), d = s.querySelector(`[data-action-id="${c}"]`);
        d && d.addEventListener("click", async (u) => {
          u.preventDefault();
          try {
            await l.action(e);
          } catch (f) {
            console.error(`Action "${l.label}" failed:`, f);
            const m = f instanceof Error ? f.message : `Action "${l.label}" failed`;
            this.notify(m, "error");
          }
        });
      });
    } else if (this.config.useDefaultActions !== !1) {
      const a = [
        {
          label: "View",
          icon: "eye",
          action: () => {
            window.location.href = `${i}/${e.id}`;
          },
          variant: "secondary"
        },
        {
          label: "Edit",
          icon: "edit",
          action: () => {
            window.location.href = `${i}/${e.id}/edit`;
          },
          variant: "primary"
        },
        {
          label: "Delete",
          icon: "trash",
          action: async () => {
            await this.handleDelete(e.id);
          },
          variant: "danger"
        }
      ];
      s.innerHTML = this.actionRenderer.renderRowActions(e, a), a.forEach((l) => {
        const c = this.sanitizeActionId(l.label), d = s.querySelector(`[data-action-id="${c}"]`);
        d && d.addEventListener("click", async (u) => {
          u.preventDefault(), u.stopPropagation();
          try {
            await l.action();
          } catch (f) {
            console.error(`Action "${l.label}" failed:`, f);
            const m = f instanceof Error ? f.message : `Action "${l.label}" failed`;
            this.notify(m, "error");
          }
        });
      });
    }
    return t.appendChild(s), t;
  }
  /**
   * Sanitize action label to create a valid ID
   */
  sanitizeActionId(e) {
    return e.toLowerCase().replace(/[^a-z0-9]/g, "-");
  }
  /**
   * Handle delete action
   */
  async handleDelete(e) {
    if (await this.confirmAction("Are you sure you want to delete this item?"))
      try {
        if (!(await fetch(`${this.config.apiEndpoint}/${e}`, {
          method: "DELETE",
          headers: {
            Accept: "application/json"
          }
        })).ok)
          throw new Error("Delete failed");
        await this.refresh();
      } catch (r) {
        console.error("Error deleting item:", r), this.showError("Failed to delete item");
      }
  }
  /**
   * Update pagination UI
   */
  updatePaginationUI(e) {
    const t = this.getResponseTotal(e) ?? this.state.totalRows, r = this.state.perPage * (this.state.currentPage - 1), n = t === 0 ? 0 : r + 1, i = Math.min(r + this.state.perPage, t), s = document.querySelector(this.selectors.tableInfoStart), a = document.querySelector(this.selectors.tableInfoEnd), l = document.querySelector(this.selectors.tableInfoTotal);
    s && (s.textContent = String(n)), a && (a.textContent = String(i)), l && (l.textContent = String(t)), this.renderPaginationButtons(t);
  }
  /**
   * Render pagination buttons
   */
  renderPaginationButtons(e) {
    const t = document.querySelector(this.selectors.paginationContainer);
    if (!t) return;
    const r = Math.ceil(e / this.state.perPage);
    if (r <= 1) {
      t.innerHTML = "";
      return;
    }
    const n = [], i = this.state.currentPage;
    n.push(`
      <button type="button"
              data-page="${i - 1}"
              ${i === 1 ? "disabled" : ""}
              class="min-h-[38px] min-w-[38px] py-2 px-2.5 inline-flex justify-center items-center gap-x-1.5 text-sm rounded-lg text-gray-800 hover:bg-gray-100 focus:outline-none focus:bg-gray-100 disabled:opacity-50 disabled:pointer-events-none">
        <svg class="shrink-0 size-3.5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m15 18-6-6 6-6"></path>
        </svg>
        <span>Previous</span>
      </button>
    `);
    const s = 5;
    let a = Math.max(1, i - Math.floor(s / 2)), l = Math.min(r, a + s - 1);
    l - a < s - 1 && (a = Math.max(1, l - s + 1));
    for (let c = a; c <= l; c++) {
      const d = c === i;
      n.push(`
        <button type="button"
                data-page="${c}"
                class="min-h-[38px] min-w-[38px] flex justify-center items-center ${d ? "bg-gray-200 text-gray-800 focus:outline-none focus:bg-gray-300" : "text-gray-800 hover:bg-gray-100 focus:outline-none focus:bg-gray-100"} py-2 px-3 text-sm rounded-lg">
          ${c}
        </button>
      `);
    }
    n.push(`
      <button type="button"
              data-page="${i + 1}"
              ${i === r ? "disabled" : ""}
              class="min-h-[38px] min-w-[38px] py-2 px-2.5 inline-flex justify-center items-center gap-x-1.5 text-sm rounded-lg text-gray-800 hover:bg-gray-100 focus:outline-none focus:bg-gray-100 disabled:opacity-50 disabled:pointer-events-none">
        <span>Next</span>
        <svg class="shrink-0 size-3.5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m9 18 6-6-6-6"></path>
        </svg>
      </button>
    `), t.innerHTML = n.join(""), t.querySelectorAll("[data-page]").forEach((c) => {
      c.addEventListener("click", async () => {
        const d = parseInt(c.dataset.page || "1", 10);
        d >= 1 && d <= r && (this.state.currentPage = d, this.pushStateToURL(), this.config.behaviors?.pagination ? await this.config.behaviors.pagination.onPageChange(d, this) : await this.refresh());
      });
    });
  }
  /**
   * Bind search input
   */
  bindSearchInput() {
    const e = document.querySelector(this.selectors.searchInput);
    if (!e) {
      console.warn(`[DataGrid] Search input not found: ${this.selectors.searchInput}`);
      return;
    }
    console.log(`[DataGrid] Search input bound to: ${this.selectors.searchInput}`);
    const t = document.getElementById("clear-search-btn"), r = () => {
      t && (e.value.trim() ? t.classList.remove("hidden") : t.classList.add("hidden"));
    };
    e.addEventListener("input", () => {
      r(), this.searchTimeout && clearTimeout(this.searchTimeout), this.searchTimeout = window.setTimeout(async () => {
        console.log(`[DataGrid] Search triggered: "${e.value}"`), this.state.search = e.value, this.pushStateToURL(), this.config.behaviors?.search ? await this.config.behaviors.search.onSearch(e.value, this) : (this.resetPagination(), await this.refresh());
      }, this.config.searchDelay);
    }), t && t.addEventListener("click", async () => {
      e.value = "", e.focus(), r(), this.state.search = "", this.pushStateToURL(), this.config.behaviors?.search ? await this.config.behaviors.search.onSearch("", this) : (this.resetPagination(), await this.refresh());
    }), r();
  }
  /**
   * Bind per-page select
   */
  bindPerPageSelect() {
    const e = document.querySelector(this.selectors.perPageSelect);
    e && e.addEventListener("change", async () => {
      this.state.perPage = parseInt(e.value, 10), this.resetPagination(), this.pushStateToURL(), await this.refresh();
    });
  }
  /**
   * Bind filter inputs
   */
  bindFilterInputs() {
    document.querySelectorAll(this.selectors.filterRow).forEach((t) => {
      const r = async () => {
        const n = t.dataset.filterColumn, i = t.dataset.filterOperator || "eq", s = t.value;
        if (!n) return;
        const a = this.state.filters.findIndex((l) => l.column === n);
        if (s) {
          const l = { column: n, operator: i, value: s };
          a >= 0 ? this.state.filters[a] = l : this.state.filters.push(l);
        } else
          a >= 0 && this.state.filters.splice(a, 1);
        this.pushStateToURL(), this.config.behaviors?.filter ? await this.config.behaviors.filter.onFilterChange(n, s, this) : (this.resetPagination(), await this.refresh());
      };
      t.addEventListener("input", r), t.addEventListener("change", r);
    });
  }
  /**
   * Bind column visibility toggle using ColumnManager
   */
  bindColumnVisibility() {
    const e = document.querySelector(this.selectors.columnToggleBtn), t = document.querySelector(this.selectors.columnToggleMenu);
    !e || !t || (this.columnManager = new br({
      container: t,
      grid: this,
      onToggle: (r, n) => {
        console.log(`[DataGrid] Column ${r} visibility toggled to ${n}`);
      },
      onReorder: (r) => {
        console.log("[DataGrid] Columns reordered:", r);
      }
    }));
  }
  /**
   * Bind export buttons
   */
  bindExportButtons() {
    const e = document.querySelector(this.selectors.exportMenu);
    if (!e) return;
    const t = e.querySelectorAll("[data-export-format]");
    t.forEach((r) => {
      r.addEventListener("click", async () => {
        const n = r.dataset.exportFormat;
        if (!n || !this.config.behaviors?.export) return;
        const i = this.config.behaviors.export.getConcurrency?.() || "single", s = [];
        i === "single" ? t.forEach((d) => s.push(d)) : i === "per-format" && s.push(r);
        const a = (d) => {
          const u = d.querySelector(".export-icon"), f = d.querySelector(".export-spinner");
          u && u.classList.add("hidden"), f && f.classList.remove("hidden");
        }, l = (d) => {
          const u = d.querySelector(".export-icon"), f = d.querySelector(".export-spinner");
          u && u.classList.remove("hidden"), f && f.classList.add("hidden");
        };
        s.forEach((d) => {
          d.setAttribute("data-export-loading", "true"), d.disabled = !0, a(d);
        });
        const c = i === "none";
        c && (r.setAttribute("data-export-loading", "true"), a(r));
        try {
          await this.config.behaviors.export.export(n, this);
        } catch (d) {
          console.error("[DataGrid] Export failed:", d);
        } finally {
          s.forEach((d) => {
            d.removeAttribute("data-export-loading"), d.disabled = !1, l(d);
          }), c && (r.removeAttribute("data-export-loading"), l(r));
        }
      });
    });
  }
  /**
   * Bind table sorting
   */
  bindSorting() {
    if (!this.tableEl) return;
    this.tableEl.querySelectorAll("[data-sort-column]").forEach((r) => {
      r.addEventListener("click", async (n) => {
        n.preventDefault(), n.stopPropagation();
        const i = r.dataset.sortColumn;
        if (!i) return;
        console.log(`[DataGrid] Sort button clicked for field: ${i}`);
        const s = this.state.sort.find((l) => l.field === i);
        let a = null;
        s ? s.direction === "asc" ? (a = "desc", s.direction = a) : (this.state.sort = this.state.sort.filter((l) => l.field !== i), a = null, console.log(`[DataGrid] Sort cleared for field: ${i}`)) : (a = "asc", this.state.sort = [{ field: i, direction: a }]), console.log("[DataGrid] New sort state:", this.state.sort), this.pushStateToURL(), a !== null && this.config.behaviors?.sort ? (console.log("[DataGrid] Calling custom sort behavior"), await this.config.behaviors.sort.onSort(i, a, this)) : (console.log("[DataGrid] Calling refresh() for sort"), await this.refresh()), console.log("[DataGrid] Updating sort indicators"), this.updateSortIndicators();
      });
    }), this.tableEl.querySelectorAll("[data-sort]").forEach((r) => {
      r.addEventListener("click", async () => {
        const n = r.dataset.sort;
        if (!n) return;
        const i = this.state.sort.find((a) => a.field === n);
        let s = null;
        i ? i.direction === "asc" ? (s = "desc", i.direction = s) : (this.state.sort = this.state.sort.filter((a) => a.field !== n), s = null) : (s = "asc", this.state.sort = [{ field: n, direction: s }]), this.pushStateToURL(), s !== null && this.config.behaviors?.sort ? await this.config.behaviors.sort.onSort(n, s, this) : await this.refresh(), this.updateSortIndicators();
      });
    });
  }
  /**
   * Update sort indicators in table headers
   */
  updateSortIndicators() {
    if (!this.tableEl) return;
    this.tableEl.querySelectorAll("[data-sort-column]").forEach((r) => {
      const n = r.dataset.sortColumn;
      if (!n) return;
      const i = this.state.sort.find((a) => a.field === n), s = r.querySelector("svg");
      s && (i ? (r.classList.remove("opacity-0"), r.classList.add("opacity-100"), i.direction === "asc" ? (s.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />', s.classList.add("text-blue-600"), s.classList.remove("text-gray-400")) : (s.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />', s.classList.add("text-blue-600"), s.classList.remove("text-gray-400"))) : (s.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />', s.classList.remove("text-blue-600"), s.classList.add("text-gray-400")));
    }), this.tableEl.querySelectorAll("[data-sort]").forEach((r) => {
      const n = r.dataset.sort, i = this.state.sort.find((a) => a.field === n), s = r.querySelector(".sort-indicator");
      s && (s.textContent = i ? i.direction === "asc" ? "↑" : "↓" : "");
    });
  }
  /**
   * Bind selection checkboxes
   */
  bindSelection() {
    const e = document.querySelector(this.selectors.selectAllCheckbox);
    e && e.addEventListener("change", () => {
      document.querySelectorAll(this.selectors.rowCheckboxes).forEach((r) => {
        r.checked = e.checked;
        const n = r.dataset.id;
        n && (e.checked ? this.state.selectedRows.add(n) : this.state.selectedRows.delete(n));
      }), this.updateBulkActionsBar();
    }), this.updateSelectionBindings();
  }
  /**
   * Update selection bindings after rendering
   * This syncs checkbox states with the selectedRows Set
   */
  updateSelectionBindings() {
    document.querySelectorAll(this.selectors.rowCheckboxes).forEach((t) => {
      const r = t.dataset.id;
      r && (t.checked = this.state.selectedRows.has(r)), t.addEventListener("change", () => {
        r && (t.checked ? this.state.selectedRows.add(r) : this.state.selectedRows.delete(r)), this.updateBulkActionsBar();
      });
    });
  }
  /**
   * Bind bulk action buttons
   */
  bindBulkActions() {
    const t = document.getElementById("bulk-actions-overlay")?.dataset?.bulkBase || "";
    document.querySelectorAll("[data-bulk-action]").forEach((i) => {
      i.addEventListener("click", async () => {
        const s = i, a = s.dataset.bulkAction;
        if (!a) return;
        const l = Array.from(this.state.selectedRows);
        if (l.length === 0) {
          this.notify("Please select items first", "warning");
          return;
        }
        if (this.config.bulkActions) {
          const c = this.config.bulkActions.find((d) => d.id === a);
          if (c) {
            try {
              await this.actionRenderer.executeBulkAction(c, l), this.state.selectedRows.clear(), this.updateBulkActionsBar(), await this.refresh();
            } catch (d) {
              console.error("Bulk action failed:", d), this.showError("Bulk action failed");
            }
            return;
          }
        }
        if (t) {
          const c = `${t}/${a}`, d = s.dataset.bulkConfirm, u = {
            id: a,
            label: s.textContent?.trim() || a,
            endpoint: c,
            confirm: d
          };
          try {
            await this.actionRenderer.executeBulkAction(u, l), this.state.selectedRows.clear(), this.updateBulkActionsBar(), await this.refresh();
          } catch (f) {
            console.error("Bulk action failed:", f), this.showError("Bulk action failed");
          }
          return;
        }
        if (this.config.behaviors?.bulkActions)
          try {
            await this.config.behaviors.bulkActions.execute(a, l, this), this.state.selectedRows.clear(), this.updateBulkActionsBar();
          } catch (c) {
            console.error("Bulk action failed:", c), this.showError("Bulk action failed");
          }
      });
    });
    const n = document.getElementById("clear-selection-btn");
    n && n.addEventListener("click", () => {
      this.state.selectedRows.clear(), this.updateBulkActionsBar(), document.querySelectorAll(".table-checkbox").forEach((a) => a.checked = !1);
      const s = document.querySelector(this.selectors.selectAllCheckbox);
      s && (s.checked = !1);
    }), this.bindOverflowMenu();
  }
  /**
   * Bind overflow menu toggle (three-dot "More" button)
   */
  bindOverflowMenu() {
    const e = document.getElementById("bulk-more-btn"), t = document.getElementById("bulk-overflow-menu");
    !e || !t || (e.addEventListener("click", (r) => {
      r.stopPropagation(), t.classList.toggle("hidden");
    }), document.addEventListener("click", () => {
      t.classList.add("hidden");
    }), document.addEventListener("keydown", (r) => {
      r.key === "Escape" && t.classList.add("hidden");
    }), t.addEventListener("click", (r) => {
      r.stopPropagation();
    }));
  }
  /**
   * Update bulk actions bar visibility with animation
   */
  updateBulkActionsBar() {
    const e = document.getElementById("bulk-actions-overlay"), t = document.getElementById("selected-count"), r = this.state.selectedRows.size;
    if (console.log("[DataGrid] updateBulkActionsBar - overlay:", e, "countEl:", t, "count:", r), !e || !t) {
      console.error("[DataGrid] Missing bulk actions elements!");
      return;
    }
    t.textContent = String(r), r > 0 ? (e.classList.remove("hidden"), e.offsetHeight) : e.classList.add("hidden");
  }
  /**
   * Bind clear selection button
   */
  bindBulkClearButton() {
    const e = document.getElementById("bulk-clear-selection");
    console.log("[DataGrid] Binding clear button:", e), e ? e.addEventListener("click", () => {
      console.log("[DataGrid] Clear button clicked!"), this.clearSelection();
    }) : console.error("[DataGrid] Clear button not found!");
  }
  /**
   * Clear all selections
   */
  clearSelection() {
    console.log("[DataGrid] Clearing selection..."), this.state.selectedRows.clear();
    const e = document.querySelector(this.selectors.selectAllCheckbox);
    e && (e.checked = !1), this.updateBulkActionsBar(), this.updateSelectionBindings();
  }
  /**
   * Position dropdown menu intelligently based on available space
   */
  positionDropdownMenu(e, t) {
    const r = e.getBoundingClientRect(), n = t.offsetHeight || 300, s = window.innerHeight - r.bottom, a = r.top, l = s < n && a > s, c = r.right - (t.offsetWidth || 224);
    t.style.left = `${Math.max(10, c)}px`, l ? (t.style.top = `${r.top - n - 8}px`, t.style.bottom = "auto") : (t.style.top = `${r.bottom + 8}px`, t.style.bottom = "auto");
  }
  /**
   * Bind dropdown toggles
   */
  bindDropdownToggles() {
    this.dropdownAbortController && this.dropdownAbortController.abort(), this.dropdownAbortController = new AbortController();
    const { signal: e } = this.dropdownAbortController;
    document.querySelectorAll("[data-dropdown-toggle]").forEach((t) => {
      t.addEventListener("click", (r) => {
        r.stopPropagation();
        const n = t.dataset.dropdownToggle, i = document.getElementById(n || "");
        i && (i.classList.contains("hidden"), document.querySelectorAll("[data-dropdown-toggle]").forEach((s) => {
          const a = s.dataset.dropdownToggle, l = document.getElementById(a || "");
          l && l !== i && l.classList.add("hidden");
        }), i.classList.toggle("hidden"));
      }, { signal: e });
    }), document.addEventListener("click", (t) => {
      const r = t.target.closest("[data-dropdown-trigger]");
      if (r) {
        t.stopPropagation();
        const i = r.closest("[data-dropdown]")?.querySelector(".actions-menu");
        document.querySelectorAll(".actions-menu").forEach((a) => {
          a !== i && a.classList.add("hidden");
        });
        const s = i?.classList.contains("hidden");
        i?.classList.toggle("hidden"), r.setAttribute("aria-expanded", s ? "true" : "false"), s && i && this.positionDropdownMenu(r, i);
      } else
        t.target.closest("[data-dropdown-toggle], #column-toggle-menu, #export-menu") || (document.querySelectorAll(".actions-menu").forEach(
          (i) => i.classList.add("hidden")
        ), document.querySelectorAll("[data-dropdown-toggle]").forEach((i) => {
          const s = i.dataset.dropdownToggle, a = document.getElementById(s || "");
          a && a.classList.add("hidden");
        }));
    }, { signal: e }), document.addEventListener("keydown", (t) => {
      t.key === "Escape" && (document.querySelectorAll(".actions-menu").forEach((r) => {
        r.classList.add("hidden");
        const n = r.closest("[data-dropdown]")?.querySelector("[data-dropdown-trigger]");
        n && n.setAttribute("aria-expanded", "false");
      }), document.querySelectorAll("[data-dropdown-toggle]").forEach((r) => {
        const n = r.dataset.dropdownToggle, i = document.getElementById(n || "");
        i && i.classList.add("hidden");
      }));
    }, { signal: e });
  }
  /**
   * Show error message using notifier
   */
  showError(e) {
    console.error(e), this.notifier.error(e);
  }
  /**
   * Show notification using notifier
   */
  notify(e, t) {
    this.notifier.show({ message: e, type: t });
  }
  /**
   * Show confirmation dialog using notifier
   */
  async confirmAction(e) {
    return this.notifier.confirm(e);
  }
  /**
   * Extract error message from Response or Error
   */
  async extractError(e) {
    return e instanceof Response ? At(e) : e instanceof Error ? e.message : "An unexpected error occurred";
  }
  /**
   * Reorder columns based on the provided order array
   * Updates config.columns order and triggers DOM reordering
   * Note: Column order is NOT pushed to URL by default (per guiding notes)
   */
  reorderColumns(e) {
    if (!this.tableEl) return;
    const t = this.mergeColumnOrder(e);
    this.state.columnOrder = t;
    const r = new Map(this.config.columns.map((n) => [n.field, n]));
    this.config.columns = t.map((n) => r.get(n)).filter((n) => n !== void 0), this.reorderTableColumns(t), console.log("[DataGrid] Columns reordered:", t);
  }
  /**
   * Reset columns to their initial/default order and visibility.
   * Intended to be called by ColumnManager's "Reset to Default" action.
   */
  resetColumnsToDefault() {
    this.config.behaviors?.columnVisibility?.clearSavedPrefs?.(), this.config.columns = this.defaultColumns.map((t) => ({ ...t })), this.state.columnOrder = this.config.columns.map((t) => t.field);
    const e = this.config.columns.filter((t) => !t.hidden).map((t) => t.field);
    this.tableEl ? (this.reorderTableColumns(this.state.columnOrder), this.updateColumnVisibility(e)) : this.state.hiddenColumns = new Set(
      this.config.columns.filter((t) => t.hidden).map((t) => t.field)
    ), this.columnManager && (this.columnManager.refresh(), this.columnManager.syncWithGridState()), console.log("[DataGrid] Columns reset to default");
  }
  /**
   * Merge and validate saved column order with current columns
   * - Drops columns that no longer exist
   * - Appends new columns that aren't in saved order
   */
  mergeColumnOrder(e) {
    const t = new Set(this.config.columns.map((s) => s.field)), r = new Set(e), n = e.filter((s) => t.has(s)), i = this.config.columns.map((s) => s.field).filter((s) => !r.has(s));
    return [...n, ...i];
  }
  /**
   * Reorder table DOM elements (header, filter row, body rows)
   * Moves existing nodes rather than recreating them to preserve event listeners
   */
  reorderTableColumns(e) {
    if (!this.tableEl) return;
    const t = this.tableEl.querySelector("thead tr:first-child");
    t && this.reorderRowCells(t, e, "th");
    const r = this.tableEl.querySelector("#filter-row");
    r && this.reorderRowCells(r, e, "th"), this.tableEl.querySelectorAll("tbody tr").forEach((i) => {
      this.reorderRowCells(i, e, "td");
    });
  }
  /**
   * Reorder cells within a single row
   * Preserves fixed columns (selection on left, actions on right)
   */
  reorderRowCells(e, t, r) {
    const n = Array.from(e.querySelectorAll(`${r}[data-column]`)), i = new Map(
      n.map((d) => [d.dataset.column, d])
    ), s = Array.from(e.querySelectorAll(r)), a = e.querySelector(`${r}[data-role="selection"]`) || s.find((d) => d.querySelector('input[type="checkbox"]')), l = e.querySelector(`${r}[data-role="actions"]`) || s.find(
      (d) => !d.dataset.column && (d.querySelector("[data-action]") || d.querySelector("[data-action-id]") || d.querySelector(".dropdown"))
    ), c = [];
    a && c.push(a), t.forEach((d) => {
      const u = i.get(d);
      u && c.push(u);
    }), l && c.push(l), c.forEach((d) => {
      e.appendChild(d);
    });
  }
  /**
   * Cleanup and destroy the DataGrid instance
   * Call this when removing the grid from the DOM to prevent memory leaks
   */
  destroy() {
    this.columnManager && (this.columnManager.destroy(), this.columnManager = null), this.dropdownAbortController && (this.dropdownAbortController.abort(), this.dropdownAbortController = null), this.abortController && (this.abortController.abort(), this.abortController = null), this.searchTimeout && (clearTimeout(this.searchTimeout), this.searchTimeout = null), console.log("[DataGrid] Instance destroyed");
  }
}
typeof window < "u" && (window.DataGrid = yr);
const St = {
  text: [
    { label: "contains", value: "ilike" },
    { label: "equals", value: "eq" },
    { label: "starts with", value: "starts" },
    { label: "ends with", value: "ends" },
    { label: "not equals", value: "ne" }
  ],
  number: [
    { label: "equals", value: "eq" },
    { label: "not equals", value: "ne" },
    { label: "greater than", value: "gt" },
    { label: "less than", value: "lt" },
    { label: "between", value: "between" }
  ],
  select: [
    { label: "equals", value: "eq" },
    { label: "not equals", value: "ne" }
  ],
  date: [
    { label: "on", value: "eq" },
    { label: "before", value: "lt" },
    { label: "after", value: "gt" },
    { label: "between", value: "between" }
  ]
};
class Gr {
  constructor(e) {
    this.criteria = [], this.modal = null, this.container = null, this.searchInput = null, this.clearBtn = null, this.config = e, this.notifier = e.notifier || new Ue();
  }
  init() {
    if (this.modal = document.getElementById("advanced-search-modal"), this.container = document.getElementById("search-criteria-container"), this.searchInput = document.getElementById("table-search"), this.clearBtn = document.getElementById("search-clear-btn"), !this.modal || !this.container) {
      console.error("[AdvancedSearch] Required elements not found");
      return;
    }
    this.restoreCriteriaFromURL(), this.criteria.length > 0 && (this.renderCriteria(), this.renderChips()), this.bindEvents(), this.bindClearButton();
  }
  /**
   * Restore advanced search criteria from URL
   */
  restoreCriteriaFromURL() {
    const t = new URLSearchParams(window.location.search).get("filters");
    if (t)
      try {
        const r = JSON.parse(t);
        this.criteria = r.map((n) => ({
          field: n.column,
          operator: n.operator || "ilike",
          value: n.value,
          logic: "and"
          // Default logic connector
        })), console.log("[AdvancedSearch] Restored criteria from URL:", this.criteria);
      } catch (r) {
        console.warn("[AdvancedSearch] Failed to parse filters from URL:", r);
      }
  }
  /**
   * Push criteria to URL
   */
  pushCriteriaToURL() {
    const e = new URLSearchParams(window.location.search);
    this.criteria.length > 0 ? e.set("advancedSearch", JSON.stringify(this.criteria)) : e.delete("advancedSearch");
    const t = e.toString() ? `${window.location.pathname}?${e.toString()}` : window.location.pathname;
    window.history.pushState({}, "", t), console.log("[AdvancedSearch] URL updated with criteria");
  }
  bindEvents() {
    document.getElementById("advanced-search-btn")?.addEventListener("click", () => this.open());
    const t = document.getElementById("advanced-search-close"), r = document.getElementById("advanced-search-cancel"), n = document.getElementById("advanced-search-overlay");
    t?.addEventListener("click", () => this.close()), r?.addEventListener("click", () => this.close()), n?.addEventListener("click", () => this.close()), document.getElementById("add-criteria-btn")?.addEventListener("click", () => this.addCriterion()), document.getElementById("advanced-search-apply")?.addEventListener("click", () => this.applySearch());
    const a = document.getElementById("save-search-preset-btn"), l = document.getElementById("load-search-preset-btn");
    a?.addEventListener("click", () => this.savePreset()), l?.addEventListener("click", () => this.loadPreset());
  }
  bindClearButton() {
    if (!this.searchInput || !this.clearBtn) return;
    const e = () => {
      this.searchInput.value.trim() ? this.clearBtn.classList.remove("hidden") : this.clearBtn.classList.add("hidden");
    };
    this.searchInput.addEventListener("input", e), this.clearBtn.addEventListener("click", () => {
      this.searchInput && (this.searchInput.value = "", this.clearBtn.classList.add("hidden"), this.clearAllChips());
    }), e();
  }
  open() {
    this.modal && (this.modal.classList.remove("hidden"), this.criteria.length === 0 ? this.addCriterion() : this.renderCriteria());
  }
  close() {
    this.modal && this.modal.classList.add("hidden");
  }
  addCriterion(e) {
    const t = {
      field: e?.field || this.config.fields[0]?.name || "",
      operator: e?.operator || "ilike",
      value: e?.value || "",
      logic: e?.logic || "and"
    };
    this.criteria.push(t), this.renderCriteria();
  }
  removeCriterion(e) {
    this.criteria.splice(e, 1), this.renderCriteria();
  }
  renderCriteria() {
    this.container && (this.container.innerHTML = "", this.criteria.forEach((e, t) => {
      const r = document.createElement("div"), n = this.createCriterionRow(e, t);
      if (r.appendChild(n), t < this.criteria.length - 1) {
        const i = this.createLogicConnector(t);
        r.appendChild(i);
      }
      this.container.appendChild(r);
    }));
  }
  createCriterionRow(e, t) {
    const r = document.createElement("div");
    r.className = "flex items-center gap-2 py-3";
    const n = this.config.fields.find((i) => i.name === e.field) || this.config.fields[0];
    return r.innerHTML = `
      <select data-criterion-index="${t}" data-criterion-part="field"
              class="py-2 px-3 pe-9 block border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50">
        ${this.config.fields.map((i) => `
          <option value="${i.name}" ${i.name === e.field ? "selected" : ""}>${i.label}</option>
        `).join("")}
      </select>

      <select data-criterion-index="${t}" data-criterion-part="operator"
              class="py-2 px-3 pe-9 block border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50">
        ${this.getOperatorsForField(n).map((i) => `
          <option value="${i.value}" ${i.value === e.operator ? "selected" : ""}>${i.label}</option>
        `).join("")}
      </select>

      ${this.createValueInput(n, e, t)}

      <button type="button" data-criterion-index="${t}" data-action="remove"
              class="p-2 text-gray-400 hover:text-red-600">
        <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
        </svg>
      </button>
    `, r.querySelectorAll("select, input").forEach((i) => {
      i.addEventListener("change", (s) => this.updateCriterion(s.target));
    }), r.querySelector('[data-action="remove"]')?.addEventListener("click", () => {
      this.removeCriterion(t);
    }), r;
  }
  createValueInput(e, t, r) {
    return e.type === "select" && e.options ? `
        <select data-criterion-index="${r}" data-criterion-part="value"
                class="flex-1 py-2 px-3 block border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500">
          <option value="">Select...</option>
          ${e.options.map((i) => `
            <option value="${i.value}" ${i.value === t.value ? "selected" : ""}>${i.label}</option>
          `).join("")}
        </select>
      ` : `
      <input type="${e.type === "date" ? "date" : e.type === "number" ? "number" : "text"}"
             data-criterion-index="${r}"
             data-criterion-part="value"
             value="${t.value}"
             placeholder="Enter value..."
             class="flex-1 py-2 px-3 block border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500">
    `;
  }
  createLogicConnector(e) {
    const t = document.createElement("div");
    t.className = "flex items-center justify-center gap-2 py-2";
    const r = this.criteria[e].logic || "and";
    return t.innerHTML = `
      <button type="button"
              data-logic-index="${e}"
              data-logic-value="and"
              class="px-3 py-1 text-xs font-medium rounded border ${r === "and" ? "bg-green-600 text-white border-green-600" : "bg-gray-200 text-gray-800 border-gray-300 hover:bg-gray-300"}">
        And
      </button>
      <button type="button"
              data-logic-index="${e}"
              data-logic-value="or"
              class="px-3 py-1 text-xs font-medium rounded border ${r === "or" ? "bg-green-600 text-white border-green-600" : "bg-gray-200 text-gray-800 border-gray-300 hover:bg-gray-300"}">
        Or
      </button>
    `, t.querySelectorAll("[data-logic-index]").forEach((n) => {
      n.addEventListener("click", (i) => {
        const s = i.target, a = parseInt(s.dataset.logicIndex || "0", 10), l = s.dataset.logicValue;
        this.criteria[a].logic = l, this.renderCriteria();
      });
    }), t;
  }
  updateCriterion(e) {
    const t = parseInt(e.dataset.criterionIndex || "0", 10), r = e.dataset.criterionPart;
    if (!this.criteria[t]) return;
    const n = e.value;
    r === "field" ? (this.criteria[t].field = n, this.renderCriteria()) : r === "operator" ? this.criteria[t].operator = n : r === "value" && (this.criteria[t].value = n);
  }
  getOperatorsForField(e) {
    return e.operators && e.operators.length > 0 ? e.operators.map((t) => ({ label: t, value: t })) : St[e.type] || St.text;
  }
  applySearch() {
    this.pushCriteriaToURL(), this.config.onSearch(this.criteria), this.renderChips(), this.close();
  }
  savePreset() {
    new ht({
      title: "Save Search Preset",
      label: "Preset name",
      placeholder: "e.g. Active users filter",
      confirmLabel: "Save",
      onConfirm: (t) => {
        const r = this.loadPresetsFromStorage();
        r[t] = this.criteria, localStorage.setItem("search_presets", JSON.stringify(r)), this.notifier.success(`Preset "${t}" saved!`);
      }
    }).show();
  }
  loadPreset() {
    const e = this.loadPresetsFromStorage(), t = Object.keys(e);
    if (t.length === 0) {
      this.notifier.warning("No saved presets found.");
      return;
    }
    new ht({
      title: "Load Search Preset",
      label: `Available presets: ${t.join(", ")}`,
      placeholder: "Enter preset name",
      confirmLabel: "Load",
      onConfirm: (n) => {
        if (!e[n]) {
          this.notifier.warning(`Preset "${n}" not found.`);
          return;
        }
        this.criteria = e[n], this.renderCriteria();
      }
    }).show();
  }
  loadPresetsFromStorage() {
    try {
      const e = localStorage.getItem("search_presets");
      return e ? JSON.parse(e) : {};
    } catch {
      return {};
    }
  }
  getCriteria() {
    return this.criteria;
  }
  setCriteria(e) {
    this.criteria = e, this.renderCriteria(), this.renderChips();
  }
  /**
   * Render filter chips in the search input
   */
  renderChips() {
    const e = document.getElementById("filter-chips-container"), t = document.getElementById("table-search"), r = document.getElementById("search-clear-btn");
    if (e) {
      if (e.innerHTML = "", this.criteria.length === 0) {
        t && (t.placeholder = "Search for items", t.style.display = ""), r && r.classList.add("hidden");
        return;
      }
      t && (t.placeholder = "", t.style.display = ""), r && r.classList.remove("hidden"), this.criteria.forEach((n, i) => {
        const s = this.createChip(n, i);
        e.appendChild(s);
      });
    }
  }
  /**
   * Create a single filter chip
   */
  createChip(e, t) {
    const r = document.createElement("div");
    r.className = "inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded border border-blue-200";
    const i = this.config.fields.find((l) => l.name === e.field)?.label || e.field, s = e.operator === "ilike" ? "contains" : e.operator === "eq" ? "is" : e.operator;
    r.innerHTML = `
      <span>${i} ${s} "${e.value}"</span>
      <button type="button"
              data-chip-index="${t}"
              class="ml-1 text-blue-600 hover:text-blue-800 focus:outline-none"
              title="Remove filter">
        <svg class="h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
        </svg>
      </button>
    `;
    const a = r.querySelector("[data-chip-index]");
    return a && a.addEventListener("click", () => {
      this.removeChip(t);
    }), r;
  }
  /**
   * Remove a chip and update filters
   */
  removeChip(e) {
    this.criteria.splice(e, 1), this.renderCriteria(), this.renderChips(), this.config.onSearch(this.criteria);
  }
  /**
   * Clear all chips
   */
  clearAllChips() {
    this.criteria = [], this.renderCriteria(), this.renderChips(), this.config.onClear && this.config.onClear();
  }
}
const Ct = {
  text: [
    { label: "contains", value: "ilike" },
    { label: "is", value: "eq" },
    { label: "is not", value: "ne" }
  ],
  number: [
    { label: "equals", value: "eq" },
    { label: "not equals", value: "ne" },
    { label: "greater than", value: "gt" },
    { label: "less than", value: "lt" },
    { label: "greater than or equal", value: "gte" },
    { label: "less than or equal", value: "lte" }
  ],
  date: [
    { label: "is", value: "eq" },
    { label: "before", value: "lt" },
    { label: "after", value: "gt" }
  ],
  select: [
    { label: "is", value: "eq" },
    { label: "is not", value: "ne" }
  ]
};
class Hr {
  constructor(e) {
    this.panel = null, this.container = null, this.previewElement = null, this.sqlPreviewElement = null, this.overlay = null, this.config = e, this.notifier = e.notifier || new Ue(), this.structure = { groups: [], groupLogic: [] }, this.init();
  }
  init() {
    if (this.panel = document.getElementById("filter-panel"), this.overlay = document.getElementById("filter-overlay"), this.previewElement = document.getElementById("filter-preview-text"), !this.panel) {
      console.error("[FilterBuilder] Panel element not found");
      return;
    }
    this.buildPanelStructure();
    const e = document.getElementById("filter-toggle-btn");
    e && e.addEventListener("click", () => this.toggle());
    const t = document.getElementById("clear-filters-btn");
    t && t.addEventListener("click", () => this.clearFilters()), this.overlay && this.overlay.addEventListener("click", () => this.close()), document.addEventListener("keydown", (r) => {
      r.key === "Escape" && !this.panel.classList.contains("hidden") && this.close();
    }), this.restoreFromURL();
  }
  buildPanelStructure() {
    this.panel && (this.panel.innerHTML = `
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-base font-semibold text-gray-900">Filters</h3>
        <div class="flex gap-2">
          <button type="button" id="saved-filters-btn" class="text-sm text-blue-600 hover:text-blue-800">
            Saved filters ▾
          </button>
          <button type="button" id="edit-sql-btn" class="text-sm text-blue-600 hover:text-blue-800">
            Edit as SQL
          </button>
        </div>
      </div>

      <!-- Filter Groups Container -->
      <div id="filter-groups-container" class="space-y-3 mb-4">
        <!-- Groups will be rendered here -->
      </div>

      <!-- Add Group Button -->
      <button type="button" id="add-group-btn" class="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 mb-4">
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
          <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
        </svg>
        AND
      </button>

      <!-- SQL Preview -->
      <div class="border-t border-gray-200 pt-3 mb-4">
        <div class="text-xs text-gray-500 mb-1">Preview:</div>
        <div id="sql-preview" class="text-xs font-mono text-gray-700 bg-gray-50 p-2 rounded border border-gray-200 min-h-[40px] max-h-[100px] overflow-y-auto break-words">
          No filters applied
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center justify-between border-t border-gray-200 pt-4">
        <div class="flex gap-2">
          <input type="text" id="save-filter-name" placeholder="Type a name here" class="text-sm border border-gray-200 rounded px-3 py-1.5 w-48">
          <button type="button" id="save-filter-btn" class="text-sm text-gray-600 hover:text-gray-800 border border-gray-200 rounded px-3 py-1.5">
            Save filter
          </button>
        </div>
        <div class="flex gap-2">
          <button type="button" id="clear-all-btn" class="text-sm text-gray-700 hover:text-gray-900 px-4 py-2">
            Clear all
          </button>
          <button type="button" id="apply-filter-btn" class="text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg px-4 py-2">
            Apply filter
          </button>
        </div>
      </div>
    `, this.container = document.getElementById("filter-groups-container"), this.sqlPreviewElement = document.getElementById("sql-preview"), this.bindActions(), this.structure.groups.length === 0 && this.addGroup());
  }
  bindActions() {
    const e = document.getElementById("add-group-btn"), t = document.getElementById("apply-filter-btn"), r = document.getElementById("clear-all-btn"), n = document.getElementById("save-filter-btn");
    e && e.addEventListener("click", () => this.addGroup()), t && t.addEventListener("click", () => this.applyFilters()), r && r.addEventListener("click", () => this.clearAll()), n && n.addEventListener("click", () => this.saveFilter());
  }
  addGroup() {
    const e = {
      conditions: [this.createEmptyCondition()],
      logic: "or"
    };
    this.structure.groups.push(e), this.structure.groups.length > 1 && this.structure.groupLogic.push("and"), this.render();
  }
  createEmptyCondition() {
    return {
      field: this.config.fields[0].name,
      operator: "ilike",
      value: ""
    };
  }
  render() {
    this.container && (this.container.innerHTML = "", this.structure.groups.forEach((e, t) => {
      const r = this.createGroupElement(e, t);
      if (this.container.appendChild(r), t < this.structure.groups.length - 1) {
        const n = this.createGroupConnector(t);
        this.container.appendChild(n);
      }
    }), this.updatePreview());
  }
  createGroupElement(e, t) {
    const r = document.createElement("div");
    r.className = "border border-gray-200 rounded-lg p-3 bg-gray-50";
    const n = document.createElement("div");
    n.className = "flex justify-end mb-2", n.innerHTML = `
      <button type="button" data-remove-group="${t}" class="text-xs text-red-600 hover:text-red-800">
        Remove group
      </button>
    `, r.appendChild(n), e.conditions.forEach((s, a) => {
      const l = this.createConditionElement(s, t, a);
      if (r.appendChild(l), a < e.conditions.length - 1) {
        const c = this.createConditionConnector(t, a, e.logic);
        r.appendChild(c);
      }
    });
    const i = document.createElement("button");
    return i.type = "button", i.className = "mt-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800", i.dataset.addCondition = String(t), i.innerHTML = `
      <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 5v14"/><path d="M5 12h14"/>
      </svg>
      ${e.logic.toUpperCase()}
    `, r.appendChild(i), this.bindGroupEvents(r, t), r;
  }
  createConditionElement(e, t, r) {
    const n = document.createElement("div");
    n.className = "flex items-center gap-2 mb-2";
    const i = this.config.fields.find((s) => s.name === e.field) || this.config.fields[0];
    return n.innerHTML = `
      <div class="flex items-center text-gray-400 cursor-move" title="Drag to reorder">
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/>
          <circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/>
        </svg>
      </div>

      <select data-cond="${t}-${r}-field" class="py-1.5 px-2 text-sm border-gray-200 rounded-lg bg-white w-32">
        ${this.config.fields.map((s) => `
          <option value="${s.name}" ${s.name === e.field ? "selected" : ""}>${s.label}</option>
        `).join("")}
      </select>

      <select data-cond="${t}-${r}-operator" class="py-1.5 px-2 text-sm border-gray-200 rounded-lg bg-white w-36">
        ${this.getOperatorsForField(i).map((s) => `
          <option value="${s.value}" ${s.value === e.operator ? "selected" : ""}>${s.label}</option>
        `).join("")}
      </select>

      ${this.renderValueInput(i, e, t, r)}

      <button type="button" data-remove-cond="${t}-${r}" class="text-red-600 hover:text-red-800">
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 6h18"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
        </svg>
      </button>

      <button type="button" data-add-cond-or="${t}-${r}" class="px-2 py-1 text-xs border border-blue-600 text-blue-600 rounded hover:bg-blue-50" title="Add OR condition">
        OR
      </button>

      <button type="button" data-add-cond-and="${t}-${r}" class="px-2 py-1 text-xs border border-blue-600 text-blue-600 rounded hover:bg-blue-50" title="Add AND condition">
        AND
      </button>
    `, n;
  }
  renderValueInput(e, t, r, n) {
    return e.type === "select" && e.options ? `
        <select data-cond="${r}-${n}-value" class="flex-1 min-w-[200px] py-1.5 px-2 text-sm border-gray-200 rounded-lg bg-white">
          <option value="">Select...</option>
          ${e.options.map((s) => `
            <option value="${s.value}" ${s.value === t.value ? "selected" : ""}>${s.label}</option>
          `).join("")}
        </select>
      ` : `
      <input type="${e.type === "date" ? "date" : e.type === "number" ? "number" : "text"}"
             data-cond="${r}-${n}-value"
             value="${t.value || ""}"
             placeholder="Enter value..."
             class="flex-1 min-w-[200px] py-1.5 px-2 text-sm border-gray-200 rounded-lg">
    `;
  }
  createConditionConnector(e, t, r) {
    const n = document.createElement("div");
    return n.className = "flex items-center justify-center my-1", n.innerHTML = `
      <span class="text-xs font-medium text-gray-500 px-2 py-0.5 bg-white border border-gray-200 rounded">
        ${r.toUpperCase()}
      </span>
    `, n;
  }
  createGroupConnector(e) {
    const t = document.createElement("div");
    t.className = "flex items-center justify-center py-2";
    const r = this.structure.groupLogic[e] || "and";
    return t.innerHTML = `
      <button type="button"
              data-group-logic="${e}"
              data-logic-value="and"
              class="px-3 py-1 text-xs font-medium rounded-l border ${r === "and" ? "bg-green-600 text-white border-green-600" : "bg-gray-200 text-gray-800 border-gray-300 hover:bg-gray-300"}">
        AND
      </button>
      <button type="button"
              data-group-logic="${e}"
              data-logic-value="or"
              class="px-3 py-1 text-xs font-medium rounded-r border ${r === "or" ? "bg-green-600 text-white border-green-600" : "bg-gray-200 text-gray-800 border-gray-300 hover:bg-gray-300"}">
        OR
      </button>
    `, t.querySelectorAll("[data-group-logic]").forEach((n) => {
      n.addEventListener("click", (i) => {
        const s = i.target, a = parseInt(s.dataset.groupLogic || "0", 10), l = s.dataset.logicValue;
        this.structure.groupLogic[a] = l, this.render();
      });
    }), t;
  }
  bindGroupEvents(e, t) {
    const r = e.querySelector(`[data-remove-group="${t}"]`);
    r && r.addEventListener("click", () => this.removeGroup(t));
    const n = e.querySelector(`[data-add-condition="${t}"]`);
    n && n.addEventListener("click", () => this.addCondition(t)), e.querySelectorAll("[data-cond]").forEach((i) => {
      const s = i, [a, l, c] = s.dataset.cond.split("-"), d = parseInt(a, 10), u = parseInt(l, 10);
      s.addEventListener("change", () => {
        c === "field" ? (this.structure.groups[d].conditions[u].field = s.value, this.render()) : c === "operator" ? (this.structure.groups[d].conditions[u].operator = s.value, this.updatePreview()) : c === "value" && (this.structure.groups[d].conditions[u].value = s.value, this.updatePreview());
      });
    }), e.querySelectorAll("[data-remove-cond]").forEach((i) => {
      i.addEventListener("click", (s) => {
        const l = s.target.closest("[data-remove-cond]");
        if (!l) return;
        const [c, d] = l.dataset.removeCond.split("-").map(Number);
        this.removeCondition(c, d);
      });
    }), e.querySelectorAll("[data-add-cond-or], [data-add-cond-and]").forEach((i) => {
      i.addEventListener("click", (s) => {
        const a = s.target, l = a.dataset.addCondOr !== void 0, c = l ? a.dataset.addCondOr : a.dataset.addCondAnd;
        if (!c) return;
        const [d] = c.split("-").map(Number);
        this.structure.groups[d].logic = l ? "or" : "and", this.addCondition(d);
      });
    });
  }
  addCondition(e) {
    this.structure.groups[e].conditions.push(this.createEmptyCondition()), this.render();
  }
  removeCondition(e, t) {
    const r = this.structure.groups[e];
    r.conditions.splice(t, 1), r.conditions.length === 0 ? this.removeGroup(e) : this.render();
  }
  removeGroup(e) {
    this.structure.groups.splice(e, 1), e < this.structure.groupLogic.length ? this.structure.groupLogic.splice(e, 1) : e > 0 && this.structure.groupLogic.length > 0 && this.structure.groupLogic.splice(e - 1, 1), this.structure.groups.length === 0 ? this.addGroup() : this.render();
  }
  getOperatorsForField(e) {
    return e.operators && e.operators.length > 0 ? e.operators.map((t) => ({ label: t, value: t })) : Ct[e.type] || Ct.text;
  }
  updatePreview() {
    const e = this.generateSQLPreview(), t = this.generateTextPreview();
    this.sqlPreviewElement && (this.sqlPreviewElement.textContent = e || "No filters applied"), this.previewElement && (this.previewElement.textContent = t);
    const r = document.getElementById("applied-filter-preview");
    r && (this.hasActiveFilters() ? r.classList.remove("hidden") : r.classList.add("hidden"));
  }
  hasActiveFilters() {
    return this.structure.groups.some(
      (e) => e.conditions.some((t) => t.value !== "" && t.value !== null && t.value !== void 0)
    );
  }
  generateSQLPreview() {
    const e = this.structure.groups.map((t) => {
      const r = t.conditions.filter((n) => n.value !== "" && n.value !== null).map((n) => {
        const i = n.operator.toUpperCase(), s = typeof n.value == "string" ? `'${n.value}'` : n.value;
        return `${n.field} ${i === "ILIKE" ? "ILIKE" : i === "EQ" ? "=" : i} ${s}`;
      });
      return r.length === 0 ? "" : r.length === 1 ? r[0] : `( ${r.join(` ${t.logic.toUpperCase()} `)} )`;
    }).filter((t) => t !== "");
    return e.length === 0 ? "" : e.length === 1 ? e[0] : e.reduce((t, r, n) => {
      if (n === 0) return r;
      const i = this.structure.groupLogic[n - 1] || "and";
      return `${t} ${i.toUpperCase()} ${r}`;
    }, "");
  }
  generateTextPreview() {
    const e = this.structure.groups.map((t) => {
      const r = t.conditions.filter((n) => n.value !== "" && n.value !== null).map((n) => {
        const i = this.config.fields.find((l) => l.name === n.field), s = i?.label || n.field, a = this.getOperatorsForField(i).find((l) => l.value === n.operator)?.label || n.operator;
        return `${s} ${a} "${n.value}"`;
      });
      return r.length === 0 ? "" : r.length === 1 ? r[0] : `( ${r.join(` ${t.logic.toUpperCase()} `)} )`;
    }).filter((t) => t !== "");
    return e.length === 0 ? "" : e.length === 1 ? e[0] : e.reduce((t, r, n) => {
      if (n === 0) return r;
      const i = this.structure.groupLogic[n - 1] || "and";
      return `${t} ${i.toUpperCase()} ${r}`;
    }, "");
  }
  applyFilters() {
    this.config.onApply(this.structure), this.close();
  }
  clearAll() {
    this.structure = { groups: [], groupLogic: [] }, this.addGroup(), this.updatePreview();
  }
  clearFilters() {
    this.clearAll(), this.config.onClear(), this.updatePreview();
  }
  saveFilter() {
    const e = document.getElementById("save-filter-name"), t = e?.value.trim();
    if (!t) {
      this.notifier.warning("Please enter a name for the filter");
      return;
    }
    const r = this.getSavedFilters();
    r[t] = this.structure, localStorage.setItem("saved_filters", JSON.stringify(r)), this.notifier.success(`Filter "${t}" saved!`), e && (e.value = "");
  }
  getSavedFilters() {
    try {
      const e = localStorage.getItem("saved_filters");
      return e ? JSON.parse(e) : {};
    } catch {
      return {};
    }
  }
  toggle() {
    this.panel?.classList.contains("hidden") ? this.open() : this.close();
  }
  open() {
    const e = document.getElementById("filter-toggle-btn");
    if (e && this.panel) {
      const t = e.getBoundingClientRect();
      this.panel.style.top = `${t.bottom + 8}px`, this.panel.style.left = `${t.left}px`;
    }
    this.panel?.classList.remove("hidden"), this.overlay?.classList.remove("hidden");
  }
  close() {
    this.panel?.classList.add("hidden"), this.overlay?.classList.add("hidden");
  }
  restoreFromURL() {
    const t = new URLSearchParams(window.location.search).get("filters");
    if (t)
      try {
        const r = JSON.parse(t);
        Array.isArray(r) && r.length > 0 && (this.structure = this.convertLegacyFilters(r), this.render());
      } catch (r) {
        console.warn("[FilterBuilder] Failed to parse filters from URL:", r);
      }
  }
  convertLegacyFilters(e) {
    const t = /* @__PURE__ */ new Map();
    e.forEach((n) => {
      const i = n.column;
      t.has(i) || t.set(i, []), t.get(i).push(n);
    });
    const r = [];
    return t.forEach((n) => {
      r.push({
        conditions: n.map((i) => ({
          field: i.column,
          operator: i.operator || "ilike",
          value: i.value
        })),
        logic: n.length > 1 ? "or" : "and"
      });
    }), {
      groups: r,
      groupLogic: new Array(r.length - 1).fill("and")
    };
  }
  getStructure() {
    return this.structure;
  }
  setStructure(e) {
    this.structure = e, this.render();
  }
}
class Ur {
  constructor(e) {
    if (this.searchableFields = e, !e || e.length === 0)
      throw new Error("At least one searchable field is required");
  }
  buildQuery(e) {
    if (!e || e.trim() === "")
      return {};
    const t = {}, r = e.trim();
    return this.searchableFields.forEach((n) => {
      t[`${n}__ilike`] = `%${r}%`;
    }), t;
  }
  async onSearch(e, t) {
    t.resetPagination(), await t.refresh();
  }
}
class Vr {
  buildFilters(e) {
    const t = {}, r = /* @__PURE__ */ new Map();
    return e.forEach((n) => {
      if (n.value === null || n.value === void 0 || n.value === "")
        return;
      const i = n.operator || "eq", s = n.column;
      r.has(s) || r.set(s, { operator: i, values: [] }), r.get(s).values.push(n.value);
    }), r.forEach((n, i) => {
      if (n.values.length === 1) {
        const s = n.operator === "eq" ? i : `${i}__${n.operator}`;
        t[s] = n.values[0];
      } else
        n.operator === "ilike" ? t[`${i}__ilike`] = n.values.join(",") : n.operator === "eq" ? t[`${i}__in`] = n.values.join(",") : t[`${i}__${n.operator}`] = n.values.join(",");
    }), t;
  }
  async onFilterChange(e, t, r) {
    r.resetPagination(), await r.refresh();
  }
}
class zr {
  buildQuery(e, t) {
    return {
      limit: t,
      offset: (e - 1) * t
    };
  }
  async onPageChange(e, t) {
    await t.refresh();
  }
}
class Yr {
  buildQuery(e) {
    return !e || e.length === 0 ? {} : { order: e.map((r) => `${r.field} ${r.direction}`).join(",") };
  }
  async onSort(e, t, r) {
    await r.refresh();
  }
}
class Xr {
  constructor(e) {
    if (!e || !e.endpoint)
      throw new Error("export endpoint is required");
    if (!e.definition && !e.resource)
      throw new Error("export definition or resource is required");
    this.config = e;
  }
  getEndpoint() {
    return this.config.endpoint;
  }
  getConcurrency() {
    return this.config.concurrency || "single";
  }
  async export(e, t) {
    if (!t)
      throw new Error("datagrid instance is required");
    const r = wr(t, this.config, e);
    r.delivery = Er(this.config, e);
    let n;
    try {
      n = await fetch(this.getEndpoint(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json,application/octet-stream"
        },
        body: JSON.stringify(r)
      });
    } catch (i) {
      const s = i instanceof Error ? i.message : "Network error during export";
      throw se(t, "error", s), i;
    }
    if (n.status === 202) {
      const i = await n.json().catch(() => ({}));
      se(t, "info", "Export queued. You can download it when ready.");
      const s = i?.status_url || "";
      if (s) {
        const a = xr(i, s);
        try {
          await Dr(s, {
            intervalMs: Sr(this.config),
            timeoutMs: Cr(this.config)
          });
          const l = await fetch(a, {
            headers: {
              Accept: "application/octet-stream"
            }
          });
          if (!l.ok) {
            const c = await st(l);
            throw se(t, "error", c), new Error(c);
          }
          await Dt(l, r.definition || r.resource || "export", r.format), se(t, "success", "Export ready.");
          return;
        } catch (l) {
          const c = l instanceof Error ? l.message : "Export failed";
          throw se(t, "error", c), l;
        }
      }
      if (i?.download_url) {
        window.open(i.download_url, "_blank");
        return;
      }
      return;
    }
    if (!n.ok) {
      const i = await st(n);
      throw se(t, "error", i), new Error(i);
    }
    await Dt(n, r.definition || r.resource || "export", r.format), se(t, "success", "Export ready.");
  }
}
function wr(o, e, t) {
  const r = _r(t), n = kr(o, e), i = Pr(o, e), s = Tr(o), a = Lr(s), l = {
    format: r,
    query: a,
    selection: n,
    columns: i,
    delivery: e.delivery || "auto"
  };
  e.definition && (l.definition = e.definition), e.resource && (l.resource = e.resource);
  const c = e.sourceVariant || e.variant;
  return c && (l.source_variant = c), l;
}
function Er(o, e) {
  return o.delivery ? o.delivery : (o.asyncFormats && o.asyncFormats.length > 0 ? o.asyncFormats : ["pdf"]).includes(e) ? "async" : "auto";
}
function Sr(o) {
  const e = Number(o.statusPollIntervalMs);
  return Number.isFinite(e) && e > 0 ? e : 2e3;
}
function Cr(o) {
  const e = Number(o.statusPollTimeoutMs);
  return Number.isFinite(e) && e >= 0 ? e : 3e5;
}
function xr(o, e) {
  return o?.download_url ? o.download_url : `${e.replace(/\/+$/, "")}/download`;
}
async function Dr(o, e) {
  const t = Date.now(), r = Math.max(250, e.intervalMs);
  for (; ; ) {
    const n = await fetch(o, {
      headers: {
        Accept: "application/json"
      }
    });
    if (!n.ok) {
      const a = await st(n);
      throw new Error(a);
    }
    const i = await n.json().catch(() => ({})), s = String(i?.state || "").toLowerCase();
    if (s === "completed")
      return i;
    if (s === "failed")
      throw new Error("Export failed");
    if (s === "canceled")
      throw new Error("Export canceled");
    if (s === "deleted")
      throw new Error("Export deleted");
    if (e.timeoutMs > 0 && Date.now() - t > e.timeoutMs)
      throw new Error("Export status timed out");
    await Ar(r);
  }
}
function Ar(o) {
  return new Promise((e) => setTimeout(e, o));
}
function kr(o, e) {
  if (e.selection?.mode)
    return e.selection;
  const t = Array.from(o.state.selectedRows || []), r = t.length > 0 ? "ids" : "all";
  return {
    mode: r,
    ids: r === "ids" ? t : []
  };
}
function Pr(o, e) {
  if (Array.isArray(e.columns) && e.columns.length > 0)
    return e.columns.slice();
  const t = o.state?.hiddenColumns ? new Set(o.state.hiddenColumns) : /* @__PURE__ */ new Set();
  return (Array.isArray(o.state?.columnOrder) && o.state.columnOrder.length > 0 ? o.state.columnOrder : o.config.columns.map((n) => n.field)).filter((n) => !t.has(n));
}
function Tr(o) {
  const e = {}, t = o.config.behaviors || {};
  return t.pagination && Object.assign(e, t.pagination.buildQuery(o.state.currentPage, o.state.perPage)), o.state.search && t.search && Object.assign(e, t.search.buildQuery(o.state.search)), o.state.filters.length > 0 && t.filter && Object.assign(e, t.filter.buildFilters(o.state.filters)), o.state.sort.length > 0 && t.sort && Object.assign(e, t.sort.buildQuery(o.state.sort)), e;
}
function Lr(o) {
  const e = {}, t = [];
  return Object.entries(o).forEach(([r, n]) => {
    if (n == null || n === "")
      return;
    switch (r) {
      case "limit":
        e.limit = xt(n);
        return;
      case "offset":
        e.offset = xt(n);
        return;
      case "order":
      case "sort":
        e.sort = Br(String(n));
        return;
      case "q":
      case "search":
        e.search = String(n);
        return;
    }
    const { field: i, op: s } = $r(r);
    i && t.push({ field: i, op: s, value: n });
  }), t.length > 0 && (e.filters = t), e;
}
function $r(o) {
  const e = o.split("__"), t = e[0]?.trim() || "", r = e[1]?.trim() || "eq";
  return { field: t, op: r };
}
function Br(o) {
  return o ? o.split(",").map((e) => e.trim()).filter(Boolean).map((e) => {
    const t = e.split(/\s+/), r = t[0] || "", n = t[1] || "asc";
    return { field: r, desc: n.toLowerCase() === "desc" };
  }).filter((e) => e.field) : [];
}
function _r(o) {
  const e = String(o || "").trim().toLowerCase();
  return e === "excel" || e === "xls" ? "xlsx" : e || "csv";
}
function xt(o) {
  const e = Number(o);
  return Number.isFinite(e) ? e : 0;
}
async function Dt(o, e, t) {
  const r = await o.blob(), n = Ir(o, e, t), i = URL.createObjectURL(r), s = document.createElement("a");
  s.href = i, s.download = n, s.rel = "noopener", document.body.appendChild(s), s.click(), s.remove(), URL.revokeObjectURL(i);
}
function Ir(o, e, t) {
  const r = o.headers.get("content-disposition") || "", n = `${e}.${t}`;
  return Or(r) || n;
}
function Or(o) {
  if (!o) return null;
  const e = o.match(/filename\*=(?:UTF-8'')?([^;]+)/i);
  if (e && e[1])
    return decodeURIComponent(e[1].replace(/"/g, "").trim());
  const t = o.match(/filename="?([^";]+)"?/i);
  return t && t[1] ? t[1].trim() : null;
}
async function st(o) {
  if ((o.headers.get("content-type") || "").includes("application/json")) {
    const r = await o.json().catch(() => ({}));
    if (r?.error?.message)
      return r.error.message;
    if (r?.message)
      return r.message;
  }
  const t = await o.text().catch(() => "");
  return t || `Export failed (${o.status})`;
}
function se(o, e, t) {
  const r = o.config.notifier;
  if (r && typeof r[e] == "function") {
    r[e](t);
    return;
  }
  const n = window.toastManager;
  if (n && typeof n[e] == "function") {
    n[e](t);
    return;
  }
  e === "error" && alert(t);
}
class Wr {
  constructor(e) {
    this.baseEndpoint = e;
  }
  getActionEndpoint(e) {
    return `${this.getPluralEndpoint()}/bulk/${e}`;
  }
  getPluralEndpoint() {
    return this.baseEndpoint.endsWith("s") ? this.baseEndpoint : `${this.baseEndpoint}s`;
  }
  async execute(e, t, r) {
    const n = this.getActionEndpoint(e), i = await fetch(n, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ ids: t })
    });
    if (!i.ok) {
      const s = await i.text();
      throw new Error(`Bulk action '${e}' failed: ${s}`);
    }
    await r.refresh();
  }
}
function jt(o) {
  return typeof o == "object" && o !== null && "version" in o && o.version === 2;
}
class Mr {
  constructor(e, t = "datatable_columns") {
    this.cachedOrder = null, this.storageKey = t;
  }
  /**
   * Get visible columns from grid state (single source of truth)
   */
  getVisibleColumns(e) {
    return e.config.columns.filter((t) => !e.state.hiddenColumns.has(t.field)).map((t) => t.field);
  }
  /**
   * Toggle column visibility based on current grid state
   * Preserves column order when writing visibility updates
   */
  toggleColumn(e, t) {
    const r = !t.state.hiddenColumns.has(e), n = t.config.columns.filter((a) => a.field === e ? !r : !t.state.hiddenColumns.has(a.field)).map((a) => a.field), i = {};
    t.config.columns.forEach((a) => {
      i[a.field] = n.includes(a.field);
    });
    const s = this.cachedOrder || t.state.columnOrder;
    this.savePrefs({
      version: 2,
      visibility: i,
      order: s.length > 0 ? s : void 0
    }), t.updateColumnVisibility(n);
  }
  /**
   * Reorder columns and persist to storage
   * Stores both visibility and order in V2 format
   */
  reorderColumns(e, t) {
    const r = {};
    t.config.columns.forEach((n) => {
      r[n.field] = !t.state.hiddenColumns.has(n.field);
    }), this.cachedOrder = e, this.savePrefs({
      version: 2,
      visibility: r,
      order: e
    }), console.log("[ColumnVisibility] Order saved:", e);
  }
  /**
   * Load column order from cache (localStorage)
   * Validates order against current columns (drops missing, doesn't append new)
   * New columns are appended by DataGrid.mergeColumnOrder()
   */
  loadColumnOrderFromCache(e) {
    try {
      const t = this.loadPrefs();
      if (!t || !t.order)
        return [];
      const r = new Set(e), n = t.order.filter((i) => r.has(i));
      return this.cachedOrder = n, console.log("[ColumnVisibility] Order loaded from cache:", n), n;
    } catch (t) {
      return console.warn("Failed to load column order from cache:", t), [];
    }
  }
  /**
   * Load saved visibility state from localStorage
   * Returns hiddenColumns Set to be merged with URL state
   * Handles both V1 and V2 formats (migrates V1 automatically)
   * Filters out stale columns that no longer exist in allColumns
   */
  loadHiddenColumnsFromCache(e) {
    try {
      const t = this.loadPrefs();
      if (!t) return /* @__PURE__ */ new Set();
      const r = new Set(e), n = /* @__PURE__ */ new Set();
      return Object.entries(t.visibility).forEach(([i, s]) => {
        !s && r.has(i) && n.add(i);
      }), n;
    } catch (t) {
      return console.warn("Failed to load column visibility state:", t), /* @__PURE__ */ new Set();
    }
  }
  /**
   * Load preferences from localStorage with V1->V2 migration
   */
  loadPrefs() {
    try {
      const e = localStorage.getItem(this.storageKey);
      if (!e) return null;
      const t = JSON.parse(e);
      if (jt(t))
        return t;
      const n = {
        version: 2,
        visibility: t
        // order is undefined - will be populated on first reorder
      };
      return console.log("[ColumnVisibility] Migrating V1 prefs to V2 format"), this.savePrefs(n), n;
    } catch (e) {
      return console.warn("Failed to load column preferences:", e), null;
    }
  }
  /**
   * Save V2 preferences to localStorage
   */
  savePrefs(e) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(e));
    } catch (t) {
      console.warn("Failed to save column preferences:", t);
    }
  }
  /**
   * Clear saved preferences from localStorage
   * Called when user clicks "Reset to Default"
   */
  clearSavedPrefs() {
    try {
      localStorage.removeItem(this.storageKey), this.cachedOrder = null, console.log("[ColumnVisibility] Preferences cleared");
    } catch (e) {
      console.warn("Failed to clear column preferences:", e);
    }
  }
}
class Jr extends Mr {
  constructor(e, t) {
    const r = t.localStorageKey || `${t.resource}_datatable_columns`;
    super(e, r), this.syncTimeout = null, this.serverPrefs = null, this.resource = t.resource, this.preferencesEndpoint = t.preferencesEndpoint || "/admin/api/preferences", this.syncDebounce = t.syncDebounce ?? 1e3;
  }
  /**
   * Get the server preference key for this resource
   */
  get serverPrefsKey() {
    return `ui.datagrid.${this.resource}.columns`;
  }
  /**
   * Toggle column visibility and sync to server
   */
  toggleColumn(e, t) {
    super.toggleColumn(e, t), this.scheduleServerSync(t);
  }
  /**
   * Reorder columns and sync to server
   */
  reorderColumns(e, t) {
    super.reorderColumns(e, t), this.scheduleServerSync(t);
  }
  /**
   * Load preferences from server
   * Call this before DataGrid.init() to hydrate state from server
   * Returns the V2 prefs if found, null otherwise
   */
  async loadFromServer() {
    try {
      const e = await fetch(this.preferencesEndpoint, {
        method: "GET",
        credentials: "same-origin",
        headers: {
          Accept: "application/json"
        }
      });
      if (!e.ok)
        return console.warn("[ServerColumnVisibility] Failed to load server prefs:", e.status), null;
      const r = (await e.json()).records || [];
      if (r.length === 0)
        return console.log("[ServerColumnVisibility] No server preferences found"), null;
      const n = r[0]?.raw;
      if (!n || !n[this.serverPrefsKey])
        return console.log("[ServerColumnVisibility] No column preferences in server response"), null;
      const i = n[this.serverPrefsKey];
      return jt(i) ? (this.serverPrefs = i, this.savePrefs(i), console.log("[ServerColumnVisibility] Loaded prefs from server:", i), i) : (console.warn("[ServerColumnVisibility] Server prefs not in V2 format:", i), null);
    } catch (e) {
      return console.warn("[ServerColumnVisibility] Error loading server prefs:", e), null;
    }
  }
  /**
   * Get initial column prefs (server takes precedence over localStorage)
   * Call this after loadFromServer() to get the prefs to use
   */
  getInitialPrefs(e) {
    const t = this.serverPrefs;
    if (t) {
      const r = /* @__PURE__ */ new Set();
      Object.entries(t.visibility).forEach(([s, a]) => {
        a || r.add(s);
      });
      const n = new Set(e), i = (t.order || []).filter((s) => n.has(s));
      return {
        hiddenColumns: r,
        columnOrder: i
      };
    }
    return {
      hiddenColumns: this.loadHiddenColumnsFromCache(e),
      columnOrder: this.loadColumnOrderFromCache(e)
    };
  }
  /**
   * Schedule a debounced sync to server
   */
  scheduleServerSync(e) {
    this.syncTimeout && clearTimeout(this.syncTimeout), this.syncTimeout = setTimeout(() => {
      this.syncToServer(e);
    }, this.syncDebounce);
  }
  /**
   * Sync current preferences to server
   */
  async syncToServer(e) {
    const t = {};
    e.config.columns.forEach((n) => {
      t[n.field] = !e.state.hiddenColumns.has(n.field);
    });
    const r = {
      version: 2,
      visibility: t,
      order: e.state.columnOrder.length > 0 ? e.state.columnOrder : void 0
    };
    try {
      const n = await fetch(this.preferencesEndpoint, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({
          raw: {
            [this.serverPrefsKey]: r
          }
        })
      });
      if (!n.ok) {
        console.warn("[ServerColumnVisibility] Failed to sync to server:", n.status);
        return;
      }
      this.serverPrefs = r, console.log("[ServerColumnVisibility] Synced prefs to server:", r);
    } catch (n) {
      console.warn("[ServerColumnVisibility] Error syncing to server:", n);
    }
  }
  /**
   * Clear saved preferences from both localStorage and server
   * Called when user clicks "Reset to Default"
   */
  clearSavedPrefs() {
    super.clearSavedPrefs(), this.serverPrefs = null, this.clearServerPrefs();
  }
  /**
   * Clear preferences on server
   */
  async clearServerPrefs() {
    try {
      const e = await fetch(this.preferencesEndpoint, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({
          raw: {
            [this.serverPrefsKey]: null
          }
        })
      });
      if (!e.ok) {
        console.warn("[ServerColumnVisibility] Failed to clear server prefs:", e.status);
        return;
      }
      console.log("[ServerColumnVisibility] Server prefs cleared");
    } catch (e) {
      console.warn("[ServerColumnVisibility] Error clearing server prefs:", e);
    }
  }
}
export {
  Vt as ActionRenderer,
  Gr as AdvancedSearch,
  zt as CellRendererRegistry,
  br as ColumnManager,
  jr as CommonRenderers,
  yr as DataGrid,
  Mr as DefaultColumnVisibilityBehavior,
  Hr as FilterBuilder,
  Wr as GoCrudBulkActionBehavior,
  Xr as GoCrudExportBehavior,
  Vr as GoCrudFilterBehavior,
  zr as GoCrudPaginationBehavior,
  Ur as GoCrudSearchBehavior,
  Yr as GoCrudSortBehavior,
  Jr as ServerColumnVisibilityBehavior
};
//# sourceMappingURL=index.js.map
