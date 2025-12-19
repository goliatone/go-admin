import { F as He, e as wt } from "../chunks/error-helpers-CECqNnwO.js";
class Nt {
  constructor(e = {}) {
    this.actionBasePath = e.actionBasePath || "", this.mode = e.mode || "dropdown", this.notifier = e.notifier || new He();
  }
  /**
   * Render row actions as HTML
   */
  renderRowActions(e, t) {
    if (this.mode === "dropdown")
      return this.renderRowActionsDropdown(e, t);
    const r = t.filter(
      (o) => !o.condition || o.condition(e)
    );
    return r.length === 0 ? '<div class="flex justify-end gap-2"></div>' : `<div class="flex justify-end gap-2">${r.map((o) => {
      const s = this.getVariantClass(o.variant || "secondary"), a = o.icon ? this.renderIcon(o.icon) : "", l = o.className || "";
      return `
        <button
          type="button"
          class="btn btn-sm ${s} ${l}"
          data-action-id="${this.sanitize(o.label)}"
          data-record-id="${e.id}"
        >
          ${a}
          ${this.sanitize(o.label)}
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
    const n = `actions-menu-${e.id}`, o = this.buildDropdownItems(e, r);
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
          ${o}
        </div>
      </div>
    `;
  }
  /**
   * Build dropdown menu items HTML
   */
  buildDropdownItems(e, t) {
    return t.map((r, n) => {
      const o = r.variant === "danger", s = r.icon ? this.renderIcon(r.icon) : "";
      return `
        ${this.shouldShowDivider(r, n, t) ? '<div class="action-divider border-t border-gray-200 my-1"></div>' : ""}
        <button type="button"
                class="${o ? "action-item text-red-600 hover:bg-red-50" : "action-item text-gray-700 hover:bg-gray-50"} flex items-center gap-3 w-full px-4 py-2.5 transition-colors"
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
      (o) => e.label.toLowerCase().includes(o)
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
    const o = document.createElement("button");
    return o.type = "button", o.className = "btn btn-sm btn-secondary", o.id = "clear-selection-btn", o.textContent = "Clear Selection", t.appendChild(o), t;
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
        const o = await wt(r);
        throw this.notifier.error(o), new Error(o);
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
class Ft {
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
      const r = {
        active: "green",
        inactive: "gray",
        suspended: "red",
        disabled: "gray",
        pending: "yellow",
        published: "green",
        draft: "gray",
        archived: "orange"
      }[String(e).toLowerCase()] || "blue";
      return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${r}-100 text-${r}-800">${e}</span>`;
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
const mr = {
  /**
   * Status badge renderer with custom colors
   */
  statusBadge: (i) => {
    const t = { ...{
      active: "green",
      inactive: "gray",
      suspended: "red",
      disabled: "gray",
      pending: "yellow",
      published: "green",
      draft: "gray",
      archived: "orange"
    }, ...i };
    return (r) => (t[String(r).toLowerCase()], `<span class="status-badge status-${r}">${r}</span>`);
  },
  /**
   * Role badge renderer with color mapping
   */
  roleBadge: (i) => {
    const t = { ...{
      admin: "red",
      editor: "blue",
      member: "purple",
      viewer: "gray",
      guest: "yellow"
    }, ...i };
    return (r) => {
      const n = String(r).toLowerCase();
      return t[n] ? `<span class="role-badge role-${n}">${r}</span>` : `<span class="badge bg-blue-100 text-blue-900 border-blue-200">${r}</span>`;
    };
  },
  /**
   * Combined name+email renderer
   */
  userInfo: (i, e) => {
    const t = i || e.name || e.username || "-", r = e.email || "";
    return r ? `<div><div class="font-medium text-gray-900">${t}</div><div class="text-sm text-gray-500">${r}</div></div>` : `<div class="font-medium text-gray-900">${t}</div>`;
  },
  /**
   * Boolean chip renderer with icon + label (e.g., [✓ Yes] or [✕ No])
   */
  booleanChip: (i) => {
    const e = i?.trueLabel || "Yes", t = i?.falseLabel || "No", r = '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>', n = '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>';
    return (o) => o ? `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">${r}${e}</span>` : `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">${n}${t}</span>`;
  },
  /**
   * Relative time renderer (e.g., "2 hours ago")
   */
  relativeTime: (i) => {
    if (!i) return '<span class="text-gray-400">-</span>';
    try {
      const e = new Date(i), r = (/* @__PURE__ */ new Date()).getTime() - e.getTime(), n = Math.floor(r / 6e4), o = Math.floor(r / 36e5), s = Math.floor(r / 864e5);
      return n < 1 ? "Just now" : n < 60 ? `${n} minute${n > 1 ? "s" : ""} ago` : o < 24 ? `${o} hour${o > 1 ? "s" : ""} ago` : s < 30 ? `${s} day${s > 1 ? "s" : ""} ago` : e.toLocaleDateString();
    } catch {
      return String(i);
    }
  }
};
/**!
 * Sortable 1.15.6
 * @author	RubaXa   <trash@rubaxa.org>
 * @author	owenm    <owen23355@gmail.com>
 * @license MIT
 */
function ct(i, e) {
  var t = Object.keys(i);
  if (Object.getOwnPropertySymbols) {
    var r = Object.getOwnPropertySymbols(i);
    e && (r = r.filter(function(n) {
      return Object.getOwnPropertyDescriptor(i, n).enumerable;
    })), t.push.apply(t, r);
  }
  return t;
}
function V(i) {
  for (var e = 1; e < arguments.length; e++) {
    var t = arguments[e] != null ? arguments[e] : {};
    e % 2 ? ct(Object(t), !0).forEach(function(r) {
      qt(i, r, t[r]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(i, Object.getOwnPropertyDescriptors(t)) : ct(Object(t)).forEach(function(r) {
      Object.defineProperty(i, r, Object.getOwnPropertyDescriptor(t, r));
    });
  }
  return i;
}
function _e(i) {
  "@babel/helpers - typeof";
  return typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? _e = function(e) {
    return typeof e;
  } : _e = function(e) {
    return e && typeof Symbol == "function" && e.constructor === Symbol && e !== Symbol.prototype ? "symbol" : typeof e;
  }, _e(i);
}
function qt(i, e, t) {
  return e in i ? Object.defineProperty(i, e, {
    value: t,
    enumerable: !0,
    configurable: !0,
    writable: !0
  }) : i[e] = t, i;
}
function X() {
  return X = Object.assign || function(i) {
    for (var e = 1; e < arguments.length; e++) {
      var t = arguments[e];
      for (var r in t)
        Object.prototype.hasOwnProperty.call(t, r) && (i[r] = t[r]);
    }
    return i;
  }, X.apply(this, arguments);
}
function Gt(i, e) {
  if (i == null) return {};
  var t = {}, r = Object.keys(i), n, o;
  for (o = 0; o < r.length; o++)
    n = r[o], !(e.indexOf(n) >= 0) && (t[n] = i[n]);
  return t;
}
function jt(i, e) {
  if (i == null) return {};
  var t = Gt(i, e), r, n;
  if (Object.getOwnPropertySymbols) {
    var o = Object.getOwnPropertySymbols(i);
    for (n = 0; n < o.length; n++)
      r = o[n], !(e.indexOf(r) >= 0) && Object.prototype.propertyIsEnumerable.call(i, r) && (t[r] = i[r]);
  }
  return t;
}
var Ht = "1.15.6";
function Y(i) {
  if (typeof window < "u" && window.navigator)
    return !!/* @__PURE__ */ navigator.userAgent.match(i);
}
var W = Y(/(?:Trident.*rv[ :]?11\.|msie|iemobile|Windows Phone)/i), ke = Y(/Edge/i), dt = Y(/firefox/i), Ee = Y(/safari/i) && !Y(/chrome/i) && !Y(/android/i), ot = Y(/iP(ad|od|hone)/i), Et = Y(/chrome/i) && Y(/android/i), Ct = {
  capture: !1,
  passive: !1
};
function w(i, e, t) {
  i.addEventListener(e, t, !W && Ct);
}
function y(i, e, t) {
  i.removeEventListener(e, t, !W && Ct);
}
function Ne(i, e) {
  if (e) {
    if (e[0] === ">" && (e = e.substring(1)), i)
      try {
        if (i.matches)
          return i.matches(e);
        if (i.msMatchesSelector)
          return i.msMatchesSelector(e);
        if (i.webkitMatchesSelector)
          return i.webkitMatchesSelector(e);
      } catch {
        return !1;
      }
    return !1;
  }
}
function St(i) {
  return i.host && i !== document && i.host.nodeType ? i.host : i.parentNode;
}
function j(i, e, t, r) {
  if (i) {
    t = t || document;
    do {
      if (e != null && (e[0] === ">" ? i.parentNode === t && Ne(i, e) : Ne(i, e)) || r && i === t)
        return i;
      if (i === t) break;
    } while (i = St(i));
  }
  return null;
}
var ut = /\s+/g;
function R(i, e, t) {
  if (i && e)
    if (i.classList)
      i.classList[t ? "add" : "remove"](e);
    else {
      var r = (" " + i.className + " ").replace(ut, " ").replace(" " + e + " ", " ");
      i.className = (r + (t ? " " + e : "")).replace(ut, " ");
    }
}
function p(i, e, t) {
  var r = i && i.style;
  if (r) {
    if (t === void 0)
      return document.defaultView && document.defaultView.getComputedStyle ? t = document.defaultView.getComputedStyle(i, "") : i.currentStyle && (t = i.currentStyle), e === void 0 ? t : t[e];
    !(e in r) && e.indexOf("webkit") === -1 && (e = "-webkit-" + e), r[e] = t + (typeof t == "string" ? "" : "px");
  }
}
function ue(i, e) {
  var t = "";
  if (typeof i == "string")
    t = i;
  else
    do {
      var r = p(i, "transform");
      r && r !== "none" && (t = r + " " + t);
    } while (!e && (i = i.parentNode));
  var n = window.DOMMatrix || window.WebKitCSSMatrix || window.CSSMatrix || window.MSCSSMatrix;
  return n && new n(t);
}
function xt(i, e, t) {
  if (i) {
    var r = i.getElementsByTagName(e), n = 0, o = r.length;
    if (t)
      for (; n < o; n++)
        t(r[n], n);
    return r;
  }
  return [];
}
function U() {
  var i = document.scrollingElement;
  return i || document.documentElement;
}
function k(i, e, t, r, n) {
  if (!(!i.getBoundingClientRect && i !== window)) {
    var o, s, a, l, c, d, u;
    if (i !== window && i.parentNode && i !== U() ? (o = i.getBoundingClientRect(), s = o.top, a = o.left, l = o.bottom, c = o.right, d = o.height, u = o.width) : (s = 0, a = 0, l = window.innerHeight, c = window.innerWidth, d = window.innerHeight, u = window.innerWidth), (e || t) && i !== window && (n = n || i.parentNode, !W))
      do
        if (n && n.getBoundingClientRect && (p(n, "transform") !== "none" || t && p(n, "position") !== "static")) {
          var f = n.getBoundingClientRect();
          s -= f.top + parseInt(p(n, "border-top-width")), a -= f.left + parseInt(p(n, "border-left-width")), l = s + o.height, c = a + o.width;
          break;
        }
      while (n = n.parentNode);
    if (r && i !== window) {
      var m = ue(n || i), b = m && m.a, E = m && m.d;
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
function ht(i, e, t) {
  for (var r = ee(i, !0), n = k(i)[e]; r; ) {
    var o = k(r)[t], s = void 0;
    if (s = n >= o, !s) return r;
    if (r === U()) break;
    r = ee(r, !1);
  }
  return !1;
}
function he(i, e, t, r) {
  for (var n = 0, o = 0, s = i.children; o < s.length; ) {
    if (s[o].style.display !== "none" && s[o] !== g.ghost && (r || s[o] !== g.dragged) && j(s[o], t.draggable, i, !1)) {
      if (n === e)
        return s[o];
      n++;
    }
    o++;
  }
  return null;
}
function it(i, e) {
  for (var t = i.lastElementChild; t && (t === g.ghost || p(t, "display") === "none" || e && !Ne(t, e)); )
    t = t.previousElementSibling;
  return t || null;
}
function F(i, e) {
  var t = 0;
  if (!i || !i.parentNode)
    return -1;
  for (; i = i.previousElementSibling; )
    i.nodeName.toUpperCase() !== "TEMPLATE" && i !== g.clone && (!e || Ne(i, e)) && t++;
  return t;
}
function ft(i) {
  var e = 0, t = 0, r = U();
  if (i)
    do {
      var n = ue(i), o = n.a, s = n.d;
      e += i.scrollLeft * o, t += i.scrollTop * s;
    } while (i !== r && (i = i.parentNode));
  return [e, t];
}
function Ut(i, e) {
  for (var t in i)
    if (i.hasOwnProperty(t)) {
      for (var r in e)
        if (e.hasOwnProperty(r) && e[r] === i[t][r]) return Number(t);
    }
  return -1;
}
function ee(i, e) {
  if (!i || !i.getBoundingClientRect) return U();
  var t = i, r = !1;
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
function Vt(i, e) {
  if (i && e)
    for (var t in e)
      e.hasOwnProperty(t) && (i[t] = e[t]);
  return i;
}
function Ve(i, e) {
  return Math.round(i.top) === Math.round(e.top) && Math.round(i.left) === Math.round(e.left) && Math.round(i.height) === Math.round(e.height) && Math.round(i.width) === Math.round(e.width);
}
var Ce;
function Dt(i, e) {
  return function() {
    if (!Ce) {
      var t = arguments, r = this;
      t.length === 1 ? i.call(r, t[0]) : i.apply(r, t), Ce = setTimeout(function() {
        Ce = void 0;
      }, e);
    }
  };
}
function zt() {
  clearTimeout(Ce), Ce = void 0;
}
function kt(i, e, t) {
  i.scrollLeft += e, i.scrollTop += t;
}
function At(i) {
  var e = window.Polymer, t = window.jQuery || window.Zepto;
  return e && e.dom ? e.dom(i).cloneNode(!0) : t ? t(i).clone(!0)[0] : i.cloneNode(!0);
}
function $t(i, e, t) {
  var r = {};
  return Array.from(i.children).forEach(function(n) {
    var o, s, a, l;
    if (!(!j(n, e.draggable, i, !1) || n.animated || n === t)) {
      var c = k(n);
      r.left = Math.min((o = r.left) !== null && o !== void 0 ? o : 1 / 0, c.left), r.top = Math.min((s = r.top) !== null && s !== void 0 ? s : 1 / 0, c.top), r.right = Math.max((a = r.right) !== null && a !== void 0 ? a : -1 / 0, c.right), r.bottom = Math.max((l = r.bottom) !== null && l !== void 0 ? l : -1 / 0, c.bottom);
    }
  }), r.width = r.right - r.left, r.height = r.bottom - r.top, r.x = r.left, r.y = r.top, r;
}
var _ = "Sortable" + (/* @__PURE__ */ new Date()).getTime();
function Yt() {
  var i = [], e;
  return {
    captureAnimationState: function() {
      if (i = [], !!this.options.animation) {
        var r = [].slice.call(this.el.children);
        r.forEach(function(n) {
          if (!(p(n, "display") === "none" || n === g.ghost)) {
            i.push({
              target: n,
              rect: k(n)
            });
            var o = V({}, i[i.length - 1].rect);
            if (n.thisAnimationDuration) {
              var s = ue(n, !0);
              s && (o.top -= s.f, o.left -= s.e);
            }
            n.fromRect = o;
          }
        });
      }
    },
    addAnimationState: function(r) {
      i.push(r);
    },
    removeAnimationState: function(r) {
      i.splice(Ut(i, {
        target: r
      }), 1);
    },
    animateAll: function(r) {
      var n = this;
      if (!this.options.animation) {
        clearTimeout(e), typeof r == "function" && r();
        return;
      }
      var o = !1, s = 0;
      i.forEach(function(a) {
        var l = 0, c = a.target, d = c.fromRect, u = k(c), f = c.prevFromRect, m = c.prevToRect, b = a.rect, E = ue(c, !0);
        E && (u.top -= E.f, u.left -= E.e), c.toRect = u, c.thisAnimationDuration && Ve(f, u) && !Ve(d, u) && // Make sure animatingRect is on line between toRect & fromRect
        (b.top - u.top) / (b.left - u.left) === (d.top - u.top) / (d.left - u.left) && (l = Wt(b, f, m, n.options)), Ve(u, d) || (c.prevFromRect = d, c.prevToRect = u, l || (l = n.options.animation), n.animate(c, b, u, l)), l && (o = !0, s = Math.max(s, l), clearTimeout(c.animationResetTimer), c.animationResetTimer = setTimeout(function() {
          c.animationTime = 0, c.prevFromRect = null, c.fromRect = null, c.prevToRect = null, c.thisAnimationDuration = null;
        }, l), c.thisAnimationDuration = l);
      }), clearTimeout(e), o ? e = setTimeout(function() {
        typeof r == "function" && r();
      }, s) : typeof r == "function" && r(), i = [];
    },
    animate: function(r, n, o, s) {
      if (s) {
        p(r, "transition", ""), p(r, "transform", "");
        var a = ue(this.el), l = a && a.a, c = a && a.d, d = (n.left - o.left) / (l || 1), u = (n.top - o.top) / (c || 1);
        r.animatingX = !!d, r.animatingY = !!u, p(r, "transform", "translate3d(" + d + "px," + u + "px,0)"), this.forRepaintDummy = Xt(r), p(r, "transition", "transform " + s + "ms" + (this.options.easing ? " " + this.options.easing : "")), p(r, "transform", "translate3d(0,0,0)"), typeof r.animated == "number" && clearTimeout(r.animated), r.animated = setTimeout(function() {
          p(r, "transition", ""), p(r, "transform", ""), r.animated = !1, r.animatingX = !1, r.animatingY = !1;
        }, s);
      }
    }
  };
}
function Xt(i) {
  return i.offsetWidth;
}
function Wt(i, e, t, r) {
  return Math.sqrt(Math.pow(e.top - i.top, 2) + Math.pow(e.left - i.left, 2)) / Math.sqrt(Math.pow(e.top - t.top, 2) + Math.pow(e.left - t.left, 2)) * r.animation;
}
var ae = [], ze = {
  initializeByDefault: !0
}, Ae = {
  mount: function(e) {
    for (var t in ze)
      ze.hasOwnProperty(t) && !(t in e) && (e[t] = ze[t]);
    ae.forEach(function(r) {
      if (r.pluginName === e.pluginName)
        throw "Sortable: Cannot mount plugin ".concat(e.pluginName, " more than once");
    }), ae.push(e);
  },
  pluginEvent: function(e, t, r) {
    var n = this;
    this.eventCanceled = !1, r.cancel = function() {
      n.eventCanceled = !0;
    };
    var o = e + "Global";
    ae.forEach(function(s) {
      t[s.pluginName] && (t[s.pluginName][o] && t[s.pluginName][o](V({
        sortable: t
      }, r)), t.options[s.pluginName] && t[s.pluginName][e] && t[s.pluginName][e](V({
        sortable: t
      }, r)));
    });
  },
  initializePlugins: function(e, t, r, n) {
    ae.forEach(function(a) {
      var l = a.pluginName;
      if (!(!e.options[l] && !a.initializeByDefault)) {
        var c = new a(e, t, e.options);
        c.sortable = e, c.options = e.options, e[l] = c, X(r, c.defaults);
      }
    });
    for (var o in e.options)
      if (e.options.hasOwnProperty(o)) {
        var s = this.modifyOption(e, o, e.options[o]);
        typeof s < "u" && (e.options[o] = s);
      }
  },
  getEventProperties: function(e, t) {
    var r = {};
    return ae.forEach(function(n) {
      typeof n.eventProperties == "function" && X(r, n.eventProperties.call(t[n.pluginName], e));
    }), r;
  },
  modifyOption: function(e, t, r) {
    var n;
    return ae.forEach(function(o) {
      e[o.pluginName] && o.optionListeners && typeof o.optionListeners[t] == "function" && (n = o.optionListeners[t].call(e[o.pluginName], r));
    }), n;
  }
};
function Jt(i) {
  var e = i.sortable, t = i.rootEl, r = i.name, n = i.targetEl, o = i.cloneEl, s = i.toEl, a = i.fromEl, l = i.oldIndex, c = i.newIndex, d = i.oldDraggableIndex, u = i.newDraggableIndex, f = i.originalEvent, m = i.putSortable, b = i.extraEventProperties;
  if (e = e || t && t[_], !!e) {
    var E, I = e.options, L = "on" + r.charAt(0).toUpperCase() + r.substr(1);
    window.CustomEvent && !W && !ke ? E = new CustomEvent(r, {
      bubbles: !0,
      cancelable: !0
    }) : (E = document.createEvent("Event"), E.initEvent(r, !0, !0)), E.to = s || t, E.from = a || t, E.item = n || t, E.clone = o, E.oldIndex = l, E.newIndex = c, E.oldDraggableIndex = d, E.newDraggableIndex = u, E.originalEvent = f, E.pullMode = m ? m.lastPutMode : void 0;
    var P = V(V({}, b), Ae.getEventProperties(r, e));
    for (var q in P)
      E[q] = P[q];
    t && t.dispatchEvent(E), I[L] && I[L].call(e, E);
  }
}
var Qt = ["evt"], B = function(e, t) {
  var r = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {}, n = r.evt, o = jt(r, Qt);
  Ae.pluginEvent.bind(g)(e, t, V({
    dragEl: h,
    parentEl: x,
    ghostEl: v,
    rootEl: C,
    nextEl: se,
    lastDownEl: Ie,
    cloneEl: S,
    cloneHidden: Z,
    dragStarted: be,
    putSortable: A,
    activeSortable: g.active,
    originalEvent: n,
    oldIndex: de,
    oldDraggableIndex: Se,
    newIndex: N,
    newDraggableIndex: K,
    hideGhostForTarget: Bt,
    unhideGhostForTarget: _t,
    cloneNowHidden: function() {
      Z = !0;
    },
    cloneNowShown: function() {
      Z = !1;
    },
    dispatchSortableEvent: function(a) {
      T({
        sortable: t,
        name: a,
        originalEvent: n
      });
    }
  }, o));
};
function T(i) {
  Jt(V({
    putSortable: A,
    cloneEl: S,
    targetEl: h,
    rootEl: C,
    oldIndex: de,
    oldDraggableIndex: Se,
    newIndex: N,
    newDraggableIndex: K
  }, i));
}
var h, x, v, C, se, Ie, S, Z, de, N, Se, K, Pe, A, ce = !1, Fe = !1, qe = [], oe, G, Ye, Xe, pt, gt, be, le, xe, De = !1, Te = !1, Oe, $, We = [], et = !1, Ge = [], Ue = typeof document < "u", Le = ot, mt = ke || W ? "cssFloat" : "float", Kt = Ue && !Et && !ot && "draggable" in document.createElement("div"), Pt = function() {
  if (Ue) {
    if (W)
      return !1;
    var i = document.createElement("x");
    return i.style.cssText = "pointer-events:auto", i.style.pointerEvents === "auto";
  }
}(), Tt = function(e, t) {
  var r = p(e), n = parseInt(r.width) - parseInt(r.paddingLeft) - parseInt(r.paddingRight) - parseInt(r.borderLeftWidth) - parseInt(r.borderRightWidth), o = he(e, 0, t), s = he(e, 1, t), a = o && p(o), l = s && p(s), c = a && parseInt(a.marginLeft) + parseInt(a.marginRight) + k(o).width, d = l && parseInt(l.marginLeft) + parseInt(l.marginRight) + k(s).width;
  if (r.display === "flex")
    return r.flexDirection === "column" || r.flexDirection === "column-reverse" ? "vertical" : "horizontal";
  if (r.display === "grid")
    return r.gridTemplateColumns.split(" ").length <= 1 ? "vertical" : "horizontal";
  if (o && a.float && a.float !== "none") {
    var u = a.float === "left" ? "left" : "right";
    return s && (l.clear === "both" || l.clear === u) ? "vertical" : "horizontal";
  }
  return o && (a.display === "block" || a.display === "flex" || a.display === "table" || a.display === "grid" || c >= n && r[mt] === "none" || s && r[mt] === "none" && c + d > n) ? "vertical" : "horizontal";
}, Zt = function(e, t, r) {
  var n = r ? e.left : e.top, o = r ? e.right : e.bottom, s = r ? e.width : e.height, a = r ? t.left : t.top, l = r ? t.right : t.bottom, c = r ? t.width : t.height;
  return n === a || o === l || n + s / 2 === a + c / 2;
}, er = function(e, t) {
  var r;
  return qe.some(function(n) {
    var o = n[_].options.emptyInsertThreshold;
    if (!(!o || it(n))) {
      var s = k(n), a = e >= s.left - o && e <= s.right + o, l = t >= s.top - o && t <= s.bottom + o;
      if (a && l)
        return r = n;
    }
  }), r;
}, Lt = function(e) {
  function t(o, s) {
    return function(a, l, c, d) {
      var u = a.options.group.name && l.options.group.name && a.options.group.name === l.options.group.name;
      if (o == null && (s || u))
        return !0;
      if (o == null || o === !1)
        return !1;
      if (s && o === "clone")
        return o;
      if (typeof o == "function")
        return t(o(a, l, c, d), s)(a, l, c, d);
      var f = (s ? a : l).options.group.name;
      return o === !0 || typeof o == "string" && o === f || o.join && o.indexOf(f) > -1;
    };
  }
  var r = {}, n = e.group;
  (!n || _e(n) != "object") && (n = {
    name: n
  }), r.name = n.name, r.checkPull = t(n.pull, !0), r.checkPut = t(n.put), r.revertClone = n.revertClone, e.group = r;
}, Bt = function() {
  !Pt && v && p(v, "display", "none");
}, _t = function() {
  !Pt && v && p(v, "display", "");
};
Ue && !Et && document.addEventListener("click", function(i) {
  if (Fe)
    return i.preventDefault(), i.stopPropagation && i.stopPropagation(), i.stopImmediatePropagation && i.stopImmediatePropagation(), Fe = !1, !1;
}, !0);
var ie = function(e) {
  if (h) {
    e = e.touches ? e.touches[0] : e;
    var t = er(e.clientX, e.clientY);
    if (t) {
      var r = {};
      for (var n in e)
        e.hasOwnProperty(n) && (r[n] = e[n]);
      r.target = r.rootEl = t, r.preventDefault = void 0, r.stopPropagation = void 0, t[_]._onDragOver(r);
    }
  }
}, tr = function(e) {
  h && h.parentNode[_]._isOutsideThisEl(e.target);
};
function g(i, e) {
  if (!(i && i.nodeType && i.nodeType === 1))
    throw "Sortable: `el` must be an HTMLElement, not ".concat({}.toString.call(i));
  this.el = i, this.options = e = X({}, e), i[_] = this;
  var t = {
    group: null,
    sort: !0,
    disabled: !1,
    store: null,
    handle: null,
    draggable: /^[uo]l$/i.test(i.nodeName) ? ">li" : ">*",
    swapThreshold: 1,
    // percentage; 0 <= x <= 1
    invertSwap: !1,
    // invert always
    invertedSwapThreshold: null,
    // will be set to same as swapThreshold if default
    removeCloneOnHide: !0,
    direction: function() {
      return Tt(i, this.options);
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
    supportPointer: g.supportPointer !== !1 && "PointerEvent" in window && (!Ee || ot),
    emptyInsertThreshold: 5
  };
  Ae.initializePlugins(this, i, t);
  for (var r in t)
    !(r in e) && (e[r] = t[r]);
  Lt(e);
  for (var n in this)
    n.charAt(0) === "_" && typeof this[n] == "function" && (this[n] = this[n].bind(this));
  this.nativeDraggable = e.forceFallback ? !1 : Kt, this.nativeDraggable && (this.options.touchStartThreshold = 1), e.supportPointer ? w(i, "pointerdown", this._onTapStart) : (w(i, "mousedown", this._onTapStart), w(i, "touchstart", this._onTapStart)), this.nativeDraggable && (w(i, "dragover", this), w(i, "dragenter", this)), qe.push(this.el), e.store && e.store.get && this.sort(e.store.get(this) || []), X(this, Yt());
}
g.prototype = /** @lends Sortable.prototype */
{
  constructor: g,
  _isOutsideThisEl: function(e) {
    !this.el.contains(e) && e !== this.el && (le = null);
  },
  _getDirection: function(e, t) {
    return typeof this.options.direction == "function" ? this.options.direction.call(this, e, t, h) : this.options.direction;
  },
  _onTapStart: function(e) {
    if (e.cancelable) {
      var t = this, r = this.el, n = this.options, o = n.preventOnFilter, s = e.type, a = e.touches && e.touches[0] || e.pointerType && e.pointerType === "touch" && e, l = (a || e).target, c = e.target.shadowRoot && (e.path && e.path[0] || e.composedPath && e.composedPath()[0]) || l, d = n.filter;
      if (cr(r), !h && !(/mousedown|pointerdown/.test(s) && e.button !== 0 || n.disabled) && !c.isContentEditable && !(!this.nativeDraggable && Ee && l && l.tagName.toUpperCase() === "SELECT") && (l = j(l, n.draggable, r, !1), !(l && l.animated) && Ie !== l)) {
        if (de = F(l), Se = F(l, n.draggable), typeof d == "function") {
          if (d.call(this, e, l, this)) {
            T({
              sortable: t,
              rootEl: c,
              name: "filter",
              targetEl: l,
              toEl: r,
              fromEl: r
            }), B("filter", t, {
              evt: e
            }), o && e.preventDefault();
            return;
          }
        } else if (d && (d = d.split(",").some(function(u) {
          if (u = j(c, u.trim(), r, !1), u)
            return T({
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
          o && e.preventDefault();
          return;
        }
        n.handle && !j(c, n.handle, r, !1) || this._prepareDragStart(e, a, l);
      }
    }
  },
  _prepareDragStart: function(e, t, r) {
    var n = this, o = n.el, s = n.options, a = o.ownerDocument, l;
    if (r && !h && r.parentNode === o) {
      var c = k(r);
      if (C = o, h = r, x = h.parentNode, se = h.nextSibling, Ie = r, Pe = s.group, g.dragged = h, oe = {
        target: h,
        clientX: (t || e).clientX,
        clientY: (t || e).clientY
      }, pt = oe.clientX - c.left, gt = oe.clientY - c.top, this._lastX = (t || e).clientX, this._lastY = (t || e).clientY, h.style["will-change"] = "all", l = function() {
        if (B("delayEnded", n, {
          evt: e
        }), g.eventCanceled) {
          n._onDrop();
          return;
        }
        n._disableDelayedDragEvents(), !dt && n.nativeDraggable && (h.draggable = !0), n._triggerDragStart(e, t), T({
          sortable: n,
          name: "choose",
          originalEvent: e
        }), R(h, s.chosenClass, !0);
      }, s.ignore.split(",").forEach(function(d) {
        xt(h, d.trim(), Je);
      }), w(a, "dragover", ie), w(a, "mousemove", ie), w(a, "touchmove", ie), s.supportPointer ? (w(a, "pointerup", n._onDrop), !this.nativeDraggable && w(a, "pointercancel", n._onDrop)) : (w(a, "mouseup", n._onDrop), w(a, "touchend", n._onDrop), w(a, "touchcancel", n._onDrop)), dt && this.nativeDraggable && (this.options.touchStartThreshold = 4, h.draggable = !0), B("delayStart", this, {
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
    h && Je(h), clearTimeout(this._dragStartTimer), this._disableDelayedDragEvents();
  },
  _disableDelayedDragEvents: function() {
    var e = this.el.ownerDocument;
    y(e, "mouseup", this._disableDelayedDrag), y(e, "touchend", this._disableDelayedDrag), y(e, "touchcancel", this._disableDelayedDrag), y(e, "pointerup", this._disableDelayedDrag), y(e, "pointercancel", this._disableDelayedDrag), y(e, "mousemove", this._delayedDragTouchMoveHandler), y(e, "touchmove", this._delayedDragTouchMoveHandler), y(e, "pointermove", this._delayedDragTouchMoveHandler);
  },
  _triggerDragStart: function(e, t) {
    t = t || e.pointerType == "touch" && e, !this.nativeDraggable || t ? this.options.supportPointer ? w(document, "pointermove", this._onTouchMove) : t ? w(document, "touchmove", this._onTouchMove) : w(document, "mousemove", this._onTouchMove) : (w(h, "dragend", this), w(C, "dragstart", this._onDragStart));
    try {
      document.selection ? Me(function() {
        document.selection.empty();
      }) : window.getSelection().removeAllRanges();
    } catch {
    }
  },
  _dragStarted: function(e, t) {
    if (ce = !1, C && h) {
      B("dragStarted", this, {
        evt: t
      }), this.nativeDraggable && w(document, "dragover", tr);
      var r = this.options;
      !e && R(h, r.dragClass, !1), R(h, r.ghostClass, !0), g.active = this, e && this._appendGhost(), T({
        sortable: this,
        name: "start",
        originalEvent: t
      });
    } else
      this._nulling();
  },
  _emulateDragOver: function() {
    if (G) {
      this._lastX = G.clientX, this._lastY = G.clientY, Bt();
      for (var e = document.elementFromPoint(G.clientX, G.clientY), t = e; e && e.shadowRoot && (e = e.shadowRoot.elementFromPoint(G.clientX, G.clientY), e !== t); )
        t = e;
      if (h.parentNode[_]._isOutsideThisEl(e), t)
        do {
          if (t[_]) {
            var r = void 0;
            if (r = t[_]._onDragOver({
              clientX: G.clientX,
              clientY: G.clientY,
              target: e,
              rootEl: t
            }), r && !this.options.dragoverBubble)
              break;
          }
          e = t;
        } while (t = St(t));
      _t();
    }
  },
  _onTouchMove: function(e) {
    if (oe) {
      var t = this.options, r = t.fallbackTolerance, n = t.fallbackOffset, o = e.touches ? e.touches[0] : e, s = v && ue(v, !0), a = v && s && s.a, l = v && s && s.d, c = Le && $ && ft($), d = (o.clientX - oe.clientX + n.x) / (a || 1) + (c ? c[0] - We[0] : 0) / (a || 1), u = (o.clientY - oe.clientY + n.y) / (l || 1) + (c ? c[1] - We[1] : 0) / (l || 1);
      if (!g.active && !ce) {
        if (r && Math.max(Math.abs(o.clientX - this._lastX), Math.abs(o.clientY - this._lastY)) < r)
          return;
        this._onDragStart(e, !0);
      }
      if (v) {
        s ? (s.e += d - (Ye || 0), s.f += u - (Xe || 0)) : s = {
          a: 1,
          b: 0,
          c: 0,
          d: 1,
          e: d,
          f: u
        };
        var f = "matrix(".concat(s.a, ",").concat(s.b, ",").concat(s.c, ",").concat(s.d, ",").concat(s.e, ",").concat(s.f, ")");
        p(v, "webkitTransform", f), p(v, "mozTransform", f), p(v, "msTransform", f), p(v, "transform", f), Ye = d, Xe = u, G = o;
      }
      e.cancelable && e.preventDefault();
    }
  },
  _appendGhost: function() {
    if (!v) {
      var e = this.options.fallbackOnBody ? document.body : C, t = k(h, !0, Le, !0, e), r = this.options;
      if (Le) {
        for ($ = e; p($, "position") === "static" && p($, "transform") === "none" && $ !== document; )
          $ = $.parentNode;
        $ !== document.body && $ !== document.documentElement ? ($ === document && ($ = U()), t.top += $.scrollTop, t.left += $.scrollLeft) : $ = U(), We = ft($);
      }
      v = h.cloneNode(!0), R(v, r.ghostClass, !1), R(v, r.fallbackClass, !0), R(v, r.dragClass, !0), p(v, "transition", ""), p(v, "transform", ""), p(v, "box-sizing", "border-box"), p(v, "margin", 0), p(v, "top", t.top), p(v, "left", t.left), p(v, "width", t.width), p(v, "height", t.height), p(v, "opacity", "0.8"), p(v, "position", Le ? "absolute" : "fixed"), p(v, "zIndex", "100000"), p(v, "pointerEvents", "none"), g.ghost = v, e.appendChild(v), p(v, "transform-origin", pt / parseInt(v.style.width) * 100 + "% " + gt / parseInt(v.style.height) * 100 + "%");
    }
  },
  _onDragStart: function(e, t) {
    var r = this, n = e.dataTransfer, o = r.options;
    if (B("dragStart", this, {
      evt: e
    }), g.eventCanceled) {
      this._onDrop();
      return;
    }
    B("setupClone", this), g.eventCanceled || (S = At(h), S.removeAttribute("id"), S.draggable = !1, S.style["will-change"] = "", this._hideClone(), R(S, this.options.chosenClass, !1), g.clone = S), r.cloneId = Me(function() {
      B("clone", r), !g.eventCanceled && (r.options.removeCloneOnHide || C.insertBefore(S, h), r._hideClone(), T({
        sortable: r,
        name: "clone"
      }));
    }), !t && R(h, o.dragClass, !0), t ? (Fe = !0, r._loopId = setInterval(r._emulateDragOver, 50)) : (y(document, "mouseup", r._onDrop), y(document, "touchend", r._onDrop), y(document, "touchcancel", r._onDrop), n && (n.effectAllowed = "move", o.setData && o.setData.call(r, n, h)), w(document, "drop", r), p(h, "transform", "translateZ(0)")), ce = !0, r._dragStartId = Me(r._dragStarted.bind(r, t, e)), w(document, "selectstart", r), be = !0, window.getSelection().removeAllRanges(), Ee && p(document.body, "user-select", "none");
  },
  // Returns true - if no further action is needed (either inserted or another condition)
  _onDragOver: function(e) {
    var t = this.el, r = e.target, n, o, s, a = this.options, l = a.group, c = g.active, d = Pe === l, u = a.sort, f = A || c, m, b = this, E = !1;
    if (et) return;
    function I(ve, Mt) {
      B(ve, b, V({
        evt: e,
        isOwner: d,
        axis: m ? "vertical" : "horizontal",
        revert: s,
        dragRect: n,
        targetRect: o,
        canSort: u,
        fromSortable: f,
        target: r,
        completed: P,
        onMove: function(lt, Rt) {
          return Be(C, t, h, n, lt, k(lt), e, Rt);
        },
        changed: q
      }, Mt));
    }
    function L() {
      I("dragOverAnimationCapture"), b.captureAnimationState(), b !== f && f.captureAnimationState();
    }
    function P(ve) {
      return I("dragOverCompleted", {
        insertion: ve
      }), ve && (d ? c._hideClone() : c._showClone(b), b !== f && (R(h, A ? A.options.ghostClass : c.options.ghostClass, !1), R(h, a.ghostClass, !0)), A !== b && b !== g.active ? A = b : b === g.active && A && (A = null), f === b && (b._ignoreWhileAnimating = r), b.animateAll(function() {
        I("dragOverAnimationComplete"), b._ignoreWhileAnimating = null;
      }), b !== f && (f.animateAll(), f._ignoreWhileAnimating = null)), (r === h && !h.animated || r === t && !r.animated) && (le = null), !a.dragoverBubble && !e.rootEl && r !== document && (h.parentNode[_]._isOutsideThisEl(e.target), !ve && ie(e)), !a.dragoverBubble && e.stopPropagation && e.stopPropagation(), E = !0;
    }
    function q() {
      N = F(h), K = F(h, a.draggable), T({
        sortable: b,
        name: "change",
        toEl: t,
        newIndex: N,
        newDraggableIndex: K,
        originalEvent: e
      });
    }
    if (e.preventDefault !== void 0 && e.cancelable && e.preventDefault(), r = j(r, a.draggable, t, !0), I("dragOver"), g.eventCanceled) return E;
    if (h.contains(e.target) || r.animated && r.animatingX && r.animatingY || b._ignoreWhileAnimating === r)
      return P(!1);
    if (Fe = !1, c && !a.disabled && (d ? u || (s = x !== C) : A === this || (this.lastPutMode = Pe.checkPull(this, c, h, e)) && l.checkPut(this, c, h, e))) {
      if (m = this._getDirection(e, r) === "vertical", n = k(h), I("dragOverValid"), g.eventCanceled) return E;
      if (s)
        return x = C, L(), this._hideClone(), I("revert"), g.eventCanceled || (se ? C.insertBefore(h, se) : C.appendChild(h)), P(!0);
      var O = it(t, a.draggable);
      if (!O || ir(e, m, this) && !O.animated) {
        if (O === h)
          return P(!1);
        if (O && t === e.target && (r = O), r && (o = k(r)), Be(C, t, h, n, r, o, e, !!r) !== !1)
          return L(), O && O.nextSibling ? t.insertBefore(h, O.nextSibling) : t.appendChild(h), x = t, q(), P(!0);
      } else if (O && or(e, m, this)) {
        var te = he(t, 0, a, !0);
        if (te === h)
          return P(!1);
        if (r = te, o = k(r), Be(C, t, h, n, r, o, e, !1) !== !1)
          return L(), t.insertBefore(h, te), x = t, q(), P(!0);
      } else if (r.parentNode === t) {
        o = k(r);
        var H = 0, re, fe = h.parentNode !== t, M = !Zt(h.animated && h.toRect || n, r.animated && r.toRect || o, m), pe = m ? "top" : "left", J = ht(r, "top", "top") || ht(h, "top", "top"), ge = J ? J.scrollTop : void 0;
        le !== r && (re = o[pe], De = !1, Te = !M && a.invertSwap || fe), H = sr(e, r, o, m, M ? 1 : a.swapThreshold, a.invertedSwapThreshold == null ? a.swapThreshold : a.invertedSwapThreshold, Te, le === r);
        var z;
        if (H !== 0) {
          var ne = F(h);
          do
            ne -= H, z = x.children[ne];
          while (z && (p(z, "display") === "none" || z === v));
        }
        if (H === 0 || z === r)
          return P(!1);
        le = r, xe = H;
        var me = r.nextElementSibling, Q = !1;
        Q = H === 1;
        var $e = Be(C, t, h, n, r, o, e, Q);
        if ($e !== !1)
          return ($e === 1 || $e === -1) && (Q = $e === 1), et = !0, setTimeout(nr, 30), L(), Q && !me ? t.appendChild(h) : r.parentNode.insertBefore(h, Q ? me : r), J && kt(J, 0, ge - J.scrollTop), x = h.parentNode, re !== void 0 && !Te && (Oe = Math.abs(re - k(r)[pe])), q(), P(!0);
      }
      if (t.contains(h))
        return P(!1);
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
    ce = !1, Te = !1, De = !1, clearInterval(this._loopId), clearTimeout(this._dragStartTimer), tt(this.cloneId), tt(this._dragStartId), this.nativeDraggable && (y(document, "drop", this), y(t, "dragstart", this._onDragStart)), this._offMoveEvents(), this._offUpEvents(), Ee && p(document.body, "user-select", ""), p(h, "transform", ""), e && (be && (e.cancelable && e.preventDefault(), !r.dropBubble && e.stopPropagation()), v && v.parentNode && v.parentNode.removeChild(v), (C === x || A && A.lastPutMode !== "clone") && S && S.parentNode && S.parentNode.removeChild(S), h && (this.nativeDraggable && y(h, "dragend", this), Je(h), h.style["will-change"] = "", be && !ce && R(h, A ? A.options.ghostClass : this.options.ghostClass, !1), R(h, this.options.chosenClass, !1), T({
      sortable: this,
      name: "unchoose",
      toEl: x,
      newIndex: null,
      newDraggableIndex: null,
      originalEvent: e
    }), C !== x ? (N >= 0 && (T({
      rootEl: x,
      name: "add",
      toEl: x,
      fromEl: C,
      originalEvent: e
    }), T({
      sortable: this,
      name: "remove",
      toEl: x,
      originalEvent: e
    }), T({
      rootEl: x,
      name: "sort",
      toEl: x,
      fromEl: C,
      originalEvent: e
    }), T({
      sortable: this,
      name: "sort",
      toEl: x,
      originalEvent: e
    })), A && A.save()) : N !== de && N >= 0 && (T({
      sortable: this,
      name: "update",
      toEl: x,
      originalEvent: e
    }), T({
      sortable: this,
      name: "sort",
      toEl: x,
      originalEvent: e
    })), g.active && ((N == null || N === -1) && (N = de, K = Se), T({
      sortable: this,
      name: "end",
      toEl: x,
      originalEvent: e
    }), this.save()))), this._nulling();
  },
  _nulling: function() {
    B("nulling", this), C = h = x = v = se = S = Ie = Z = oe = G = be = N = K = de = Se = le = xe = A = Pe = g.dragged = g.ghost = g.clone = g.active = null, Ge.forEach(function(e) {
      e.checked = !0;
    }), Ge.length = Ye = Xe = 0;
  },
  handleEvent: function(e) {
    switch (e.type) {
      case "drop":
      case "dragend":
        this._onDrop(e);
        break;
      case "dragenter":
      case "dragover":
        h && (this._onDragOver(e), rr(e));
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
    for (var e = [], t, r = this.el.children, n = 0, o = r.length, s = this.options; n < o; n++)
      t = r[n], j(t, s.draggable, this.el, !1) && e.push(t.getAttribute(s.dataIdAttr) || lr(t));
    return e;
  },
  /**
   * Sorts the elements according to the array.
   * @param  {String[]}  order  order of the items
   */
  sort: function(e, t) {
    var r = {}, n = this.el;
    this.toArray().forEach(function(o, s) {
      var a = n.children[s];
      j(a, this.options.draggable, n, !1) && (r[o] = a);
    }, this), t && this.captureAnimationState(), e.forEach(function(o) {
      r[o] && (n.removeChild(r[o]), n.appendChild(r[o]));
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
    return j(e, t || this.options.draggable, this.el, !1);
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
    var n = Ae.modifyOption(this, e, t);
    typeof n < "u" ? r[e] = n : r[e] = t, e === "group" && Lt(r);
  },
  /**
   * Destroy
   */
  destroy: function() {
    B("destroy", this);
    var e = this.el;
    e[_] = null, y(e, "mousedown", this._onTapStart), y(e, "touchstart", this._onTapStart), y(e, "pointerdown", this._onTapStart), this.nativeDraggable && (y(e, "dragover", this), y(e, "dragenter", this)), Array.prototype.forEach.call(e.querySelectorAll("[draggable]"), function(t) {
      t.removeAttribute("draggable");
    }), this._onDrop(), this._disableDelayedDragEvents(), qe.splice(qe.indexOf(this.el), 1), this.el = e = null;
  },
  _hideClone: function() {
    if (!Z) {
      if (B("hideClone", this), g.eventCanceled) return;
      p(S, "display", "none"), this.options.removeCloneOnHide && S.parentNode && S.parentNode.removeChild(S), Z = !0;
    }
  },
  _showClone: function(e) {
    if (e.lastPutMode !== "clone") {
      this._hideClone();
      return;
    }
    if (Z) {
      if (B("showClone", this), g.eventCanceled) return;
      h.parentNode == C && !this.options.group.revertClone ? C.insertBefore(S, h) : se ? C.insertBefore(S, se) : C.appendChild(S), this.options.group.revertClone && this.animate(h, S), p(S, "display", ""), Z = !1;
    }
  }
};
function rr(i) {
  i.dataTransfer && (i.dataTransfer.dropEffect = "move"), i.cancelable && i.preventDefault();
}
function Be(i, e, t, r, n, o, s, a) {
  var l, c = i[_], d = c.options.onMove, u;
  return window.CustomEvent && !W && !ke ? l = new CustomEvent("move", {
    bubbles: !0,
    cancelable: !0
  }) : (l = document.createEvent("Event"), l.initEvent("move", !0, !0)), l.to = e, l.from = i, l.dragged = t, l.draggedRect = r, l.related = n || e, l.relatedRect = o || k(e), l.willInsertAfter = a, l.originalEvent = s, i.dispatchEvent(l), d && (u = d.call(c, l, s)), u;
}
function Je(i) {
  i.draggable = !1;
}
function nr() {
  et = !1;
}
function or(i, e, t) {
  var r = k(he(t.el, 0, t.options, !0)), n = $t(t.el, t.options, v), o = 10;
  return e ? i.clientX < n.left - o || i.clientY < r.top && i.clientX < r.right : i.clientY < n.top - o || i.clientY < r.bottom && i.clientX < r.left;
}
function ir(i, e, t) {
  var r = k(it(t.el, t.options.draggable)), n = $t(t.el, t.options, v), o = 10;
  return e ? i.clientX > n.right + o || i.clientY > r.bottom && i.clientX > r.left : i.clientY > n.bottom + o || i.clientX > r.right && i.clientY > r.top;
}
function sr(i, e, t, r, n, o, s, a) {
  var l = r ? i.clientY : i.clientX, c = r ? t.height : t.width, d = r ? t.top : t.left, u = r ? t.bottom : t.right, f = !1;
  if (!s) {
    if (a && Oe < c * n) {
      if (!De && (xe === 1 ? l > d + c * o / 2 : l < u - c * o / 2) && (De = !0), De)
        f = !0;
      else if (xe === 1 ? l < d + Oe : l > u - Oe)
        return -xe;
    } else if (l > d + c * (1 - n) / 2 && l < u - c * (1 - n) / 2)
      return ar(e);
  }
  return f = f || s, f && (l < d + c * o / 2 || l > u - c * o / 2) ? l > d + c / 2 ? 1 : -1 : 0;
}
function ar(i) {
  return F(h) < F(i) ? 1 : -1;
}
function lr(i) {
  for (var e = i.tagName + i.className + i.src + i.href + i.textContent, t = e.length, r = 0; t--; )
    r += e.charCodeAt(t);
  return r.toString(36);
}
function cr(i) {
  Ge.length = 0;
  for (var e = i.getElementsByTagName("input"), t = e.length; t--; ) {
    var r = e[t];
    r.checked && Ge.push(r);
  }
}
function Me(i) {
  return setTimeout(i, 0);
}
function tt(i) {
  return clearTimeout(i);
}
Ue && w(document, "touchmove", function(i) {
  (g.active || ce) && i.cancelable && i.preventDefault();
});
g.utils = {
  on: w,
  off: y,
  css: p,
  find: xt,
  is: function(e, t) {
    return !!j(e, t, e, !1);
  },
  extend: Vt,
  throttle: Dt,
  closest: j,
  toggleClass: R,
  clone: At,
  index: F,
  nextTick: Me,
  cancelNextTick: tt,
  detectDirection: Tt,
  getChild: he,
  expando: _
};
g.get = function(i) {
  return i[_];
};
g.mount = function() {
  for (var i = arguments.length, e = new Array(i), t = 0; t < i; t++)
    e[t] = arguments[t];
  e[0].constructor === Array && (e = e[0]), e.forEach(function(r) {
    if (!r.prototype || !r.prototype.constructor)
      throw "Sortable: Mounted plugin must be a constructor function, not ".concat({}.toString.call(r));
    r.utils && (g.utils = V(V({}, g.utils), r.utils)), Ae.mount(r);
  });
};
g.create = function(i, e) {
  return new g(i, e);
};
g.version = Ht;
var D = [], ye, rt, nt = !1, Qe, Ke, je, we;
function dr() {
  function i() {
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
  return i.prototype = {
    dragStarted: function(t) {
      var r = t.originalEvent;
      this.sortable.nativeDraggable ? w(document, "dragover", this._handleAutoScroll) : this.options.supportPointer ? w(document, "pointermove", this._handleFallbackAutoScroll) : r.touches ? w(document, "touchmove", this._handleFallbackAutoScroll) : w(document, "mousemove", this._handleFallbackAutoScroll);
    },
    dragOverCompleted: function(t) {
      var r = t.originalEvent;
      !this.options.dragOverBubble && !r.rootEl && this._handleAutoScroll(r);
    },
    drop: function() {
      this.sortable.nativeDraggable ? y(document, "dragover", this._handleAutoScroll) : (y(document, "pointermove", this._handleFallbackAutoScroll), y(document, "touchmove", this._handleFallbackAutoScroll), y(document, "mousemove", this._handleFallbackAutoScroll)), vt(), Re(), zt();
    },
    nulling: function() {
      je = rt = ye = nt = we = Qe = Ke = null, D.length = 0;
    },
    _handleFallbackAutoScroll: function(t) {
      this._handleAutoScroll(t, !0);
    },
    _handleAutoScroll: function(t, r) {
      var n = this, o = (t.touches ? t.touches[0] : t).clientX, s = (t.touches ? t.touches[0] : t).clientY, a = document.elementFromPoint(o, s);
      if (je = t, r || this.options.forceAutoScrollFallback || ke || W || Ee) {
        Ze(t, this.options, a, r);
        var l = ee(a, !0);
        nt && (!we || o !== Qe || s !== Ke) && (we && vt(), we = setInterval(function() {
          var c = ee(document.elementFromPoint(o, s), !0);
          c !== l && (l = c, Re()), Ze(t, n.options, c, r);
        }, 10), Qe = o, Ke = s);
      } else {
        if (!this.options.bubbleScroll || ee(a, !0) === U()) {
          Re();
          return;
        }
        Ze(t, this.options, ee(a, !1), !1);
      }
    }
  }, X(i, {
    pluginName: "scroll",
    initializeByDefault: !0
  });
}
function Re() {
  D.forEach(function(i) {
    clearInterval(i.pid);
  }), D = [];
}
function vt() {
  clearInterval(we);
}
var Ze = Dt(function(i, e, t, r) {
  if (e.scroll) {
    var n = (i.touches ? i.touches[0] : i).clientX, o = (i.touches ? i.touches[0] : i).clientY, s = e.scrollSensitivity, a = e.scrollSpeed, l = U(), c = !1, d;
    rt !== t && (rt = t, Re(), ye = e.scroll, d = e.scrollFn, ye === !0 && (ye = ee(t, !0)));
    var u = 0, f = ye;
    do {
      var m = f, b = k(m), E = b.top, I = b.bottom, L = b.left, P = b.right, q = b.width, O = b.height, te = void 0, H = void 0, re = m.scrollWidth, fe = m.scrollHeight, M = p(m), pe = m.scrollLeft, J = m.scrollTop;
      m === l ? (te = q < re && (M.overflowX === "auto" || M.overflowX === "scroll" || M.overflowX === "visible"), H = O < fe && (M.overflowY === "auto" || M.overflowY === "scroll" || M.overflowY === "visible")) : (te = q < re && (M.overflowX === "auto" || M.overflowX === "scroll"), H = O < fe && (M.overflowY === "auto" || M.overflowY === "scroll"));
      var ge = te && (Math.abs(P - n) <= s && pe + q < re) - (Math.abs(L - n) <= s && !!pe), z = H && (Math.abs(I - o) <= s && J + O < fe) - (Math.abs(E - o) <= s && !!J);
      if (!D[u])
        for (var ne = 0; ne <= u; ne++)
          D[ne] || (D[ne] = {});
      (D[u].vx != ge || D[u].vy != z || D[u].el !== m) && (D[u].el = m, D[u].vx = ge, D[u].vy = z, clearInterval(D[u].pid), (ge != 0 || z != 0) && (c = !0, D[u].pid = setInterval(function() {
        r && this.layer === 0 && g.active._onTouchMove(je);
        var me = D[this.layer].vy ? D[this.layer].vy * a : 0, Q = D[this.layer].vx ? D[this.layer].vx * a : 0;
        typeof d == "function" && d.call(g.dragged.parentNode[_], Q, me, i, je, D[this.layer].el) !== "continue" || kt(D[this.layer].el, Q, me);
      }.bind({
        layer: u
      }), 24))), u++;
    } while (e.bubbleScroll && f !== l && (f = ee(f, !1)));
    nt = c;
  }
}, 30), It = function(e) {
  var t = e.originalEvent, r = e.putSortable, n = e.dragEl, o = e.activeSortable, s = e.dispatchSortableEvent, a = e.hideGhostForTarget, l = e.unhideGhostForTarget;
  if (t) {
    var c = r || o;
    a();
    var d = t.changedTouches && t.changedTouches.length ? t.changedTouches[0] : t, u = document.elementFromPoint(d.clientX, d.clientY);
    l(), c && !c.el.contains(u) && (s("spill"), this.onSpill({
      dragEl: n,
      putSortable: r
    }));
  }
};
function st() {
}
st.prototype = {
  startIndex: null,
  dragStart: function(e) {
    var t = e.oldDraggableIndex;
    this.startIndex = t;
  },
  onSpill: function(e) {
    var t = e.dragEl, r = e.putSortable;
    this.sortable.captureAnimationState(), r && r.captureAnimationState();
    var n = he(this.sortable.el, this.startIndex, this.options);
    n ? this.sortable.el.insertBefore(t, n) : this.sortable.el.appendChild(t), this.sortable.animateAll(), r && r.animateAll();
  },
  drop: It
};
X(st, {
  pluginName: "revertOnSpill"
});
function at() {
}
at.prototype = {
  onSpill: function(e) {
    var t = e.dragEl, r = e.putSortable, n = r || this.sortable;
    n.captureAnimationState(), t.parentNode && t.parentNode.removeChild(t), n.animateAll();
  },
  drop: It
};
X(at, {
  pluginName: "removeOnSpill"
});
g.mount(new dr());
g.mount(at, st);
class ur {
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
    r.className = "column-list", r.setAttribute("role", "list"), r.setAttribute("aria-label", "Column visibility and order"), e.forEach((o) => {
      const s = this.createColumnItem(o.field, o.label || o.field, !t.has(o.field));
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
    const o = document.createElementNS("http://www.w3.org/2000/svg", "path");
    o.setAttribute("d", "M3 3v5h5"), r.appendChild(n), r.appendChild(o);
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
    const n = `column-item-${e}`, o = `column-switch-${e}`, s = document.createElement("div");
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
      const L = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      L.setAttribute("cx", String(E)), L.setAttribute("cy", String(I)), L.setAttribute("r", "1.5"), l.appendChild(L);
    });
    const d = document.createElement("span");
    d.className = "column-label", d.id = `${n}-label`, d.textContent = t, a.appendChild(l), a.appendChild(d);
    const u = document.createElement("label");
    u.className = "column-switch", u.htmlFor = o;
    const f = document.createElement("input");
    f.type = "checkbox", f.id = o, f.dataset.column = e, f.checked = r, f.setAttribute("role", "switch"), f.setAttribute("aria-checked", String(r)), f.setAttribute("aria-labelledby", `${n}-label`), f.setAttribute("aria-describedby", `${n}-desc`);
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
        const o = `column-item-${r}-desc`, s = this.container.querySelector(`#${o}`);
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
class hr {
  constructor(e) {
    this.tableEl = null, this.searchTimeout = null, this.abortController = null, this.dropdownAbortController = null, this.didRestoreColumnOrder = !1, this.shouldReorderDOMOnRestore = !1, this.recordsById = {}, this.columnManager = null, this.config = {
      perPage: 10,
      searchDelay: 300,
      behaviors: {},
      ...e
    }, this.notifier = e.notifier || new He(), this.selectors = {
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
    }, this.actionRenderer = new Nt({
      mode: this.config.actionRenderMode || "dropdown",
      // Default to dropdown
      actionBasePath: this.config.actionBasePath || this.config.apiEndpoint,
      notifier: this.notifier
      // Pass notifier to ActionRenderer
    }), this.cellRendererRegistry = new Ft(), this.config.cellRenderers && Object.entries(this.config.cellRenderers).forEach(([t, r]) => {
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
    r && (this.state.currentPage = parseInt(r, 10) || 1);
    const n = e.get("perPage");
    if (n) {
      this.state.perPage = parseInt(n, 10) || this.config.perPage || 10;
      const l = document.querySelector(this.selectors.perPageSelect);
      l && (l.value = String(this.state.perPage));
    }
    const o = e.get("filters");
    if (o)
      try {
        this.state.filters = JSON.parse(o);
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
      console.log("[DataGrid] API Response:", r), console.log("[DataGrid] API Response data array:", r.data), console.log("[DataGrid] API Response total:", r.total, "count:", r.count, "$meta:", r.$meta), console.log("[DataGrid] About to call renderData()..."), this.renderData(r), console.log("[DataGrid] renderData() completed"), this.updatePaginationUI(r), console.log("[DataGrid] ===== refresh() COMPLETED =====");
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
    Object.entries(t).forEach(([n, o]) => {
      o != null && e.append(n, String(o));
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
    const r = e.data || [];
    if (console.log(`[DataGrid] renderData() called with ${r.length} items`), console.log("[DataGrid] First 3 items:", r.slice(0, 3)), this.state.totalRows = e.total || e.$meta?.count || e.count || r.length, r.length === 0) {
      t.innerHTML = `
        <tr>
          <td colspan="${this.config.columns.length + 2}" class="px-6 py-8 text-center text-gray-500">
            No results found
          </td>
        </tr>
      `;
      return;
    }
    this.recordsById = {}, r.forEach((n, o) => {
      console.log(`[DataGrid] Rendering row ${o + 1}: id=${n.id}, email=${n.email}, role=${n.role}, status=${n.status}`), n.id && (this.recordsById[n.id] = n);
      const s = this.createTableRow(n);
      t.appendChild(s);
    }), console.log(`[DataGrid] Finished appending ${r.length} rows to tbody`), console.log("[DataGrid] tbody.children.length =", t.children.length), this.state.hiddenColumns.size > 0 && t.querySelectorAll("td[data-column]").forEach((o) => {
      const s = o.dataset.column;
      s && this.state.hiddenColumns.has(s) && (o.style.display = "none");
    }), this.updateSelectionBindings();
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
    const o = this.config.actionBasePath || this.config.apiEndpoint, s = document.createElement("td");
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
            window.location.href = `${o}/${e.id}`;
          },
          variant: "secondary"
        },
        {
          label: "Edit",
          icon: "edit",
          action: () => {
            window.location.href = `${o}/${e.id}/edit`;
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
    const t = e.total || e.$meta?.count || e.count || this.state.totalRows, r = this.state.perPage * (this.state.currentPage - 1), n = t === 0 ? 0 : r + 1, o = Math.min(r + this.state.perPage, t), s = document.querySelector(this.selectors.tableInfoStart), a = document.querySelector(this.selectors.tableInfoEnd), l = document.querySelector(this.selectors.tableInfoTotal);
    s && (s.textContent = String(n)), a && (a.textContent = String(o)), l && (l.textContent = String(t)), this.renderPaginationButtons(t);
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
    const n = [], o = this.state.currentPage;
    n.push(`
      <button type="button"
              data-page="${o - 1}"
              ${o === 1 ? "disabled" : ""}
              class="min-h-[38px] min-w-[38px] py-2 px-2.5 inline-flex justify-center items-center gap-x-1.5 text-sm rounded-lg text-gray-800 hover:bg-gray-100 focus:outline-none focus:bg-gray-100 disabled:opacity-50 disabled:pointer-events-none">
        <svg class="shrink-0 size-3.5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m15 18-6-6 6-6"></path>
        </svg>
        <span>Previous</span>
      </button>
    `);
    const s = 5;
    let a = Math.max(1, o - Math.floor(s / 2)), l = Math.min(r, a + s - 1);
    l - a < s - 1 && (a = Math.max(1, l - s + 1));
    for (let c = a; c <= l; c++) {
      const d = c === o;
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
              data-page="${o + 1}"
              ${o === r ? "disabled" : ""}
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
        const n = t.dataset.filterColumn, o = t.dataset.filterOperator || "eq", s = t.value;
        if (!n) return;
        const a = this.state.filters.findIndex((l) => l.column === n);
        if (s) {
          const l = { column: n, operator: o, value: s };
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
    !e || !t || (this.columnManager = new ur({
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
    e && e.querySelectorAll("[data-export-format]").forEach((t) => {
      t.addEventListener("click", async () => {
        const r = t.dataset.exportFormat;
        r && this.config.behaviors?.export && await this.config.behaviors.export.export(r, this);
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
        const o = r.dataset.sortColumn;
        if (!o) return;
        console.log(`[DataGrid] Sort button clicked for field: ${o}`);
        const s = this.state.sort.find((l) => l.field === o);
        let a = null;
        s ? s.direction === "asc" ? (a = "desc", s.direction = a) : (this.state.sort = this.state.sort.filter((l) => l.field !== o), a = null, console.log(`[DataGrid] Sort cleared for field: ${o}`)) : (a = "asc", this.state.sort = [{ field: o, direction: a }]), console.log("[DataGrid] New sort state:", this.state.sort), this.pushStateToURL(), a !== null && this.config.behaviors?.sort ? (console.log("[DataGrid] Calling custom sort behavior"), await this.config.behaviors.sort.onSort(o, a, this)) : (console.log("[DataGrid] Calling refresh() for sort"), await this.refresh()), console.log("[DataGrid] Updating sort indicators"), this.updateSortIndicators();
      });
    }), this.tableEl.querySelectorAll("[data-sort]").forEach((r) => {
      r.addEventListener("click", async () => {
        const n = r.dataset.sort;
        if (!n) return;
        const o = this.state.sort.find((a) => a.field === n);
        let s = null;
        o ? o.direction === "asc" ? (s = "desc", o.direction = s) : (this.state.sort = this.state.sort.filter((a) => a.field !== n), s = null) : (s = "asc", this.state.sort = [{ field: n, direction: s }]), this.pushStateToURL(), s !== null && this.config.behaviors?.sort ? await this.config.behaviors.sort.onSort(n, s, this) : await this.refresh(), this.updateSortIndicators();
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
      const o = this.state.sort.find((a) => a.field === n), s = r.querySelector("svg");
      s && (o ? (r.classList.remove("opacity-0"), r.classList.add("opacity-100"), o.direction === "asc" ? (s.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />', s.classList.add("text-blue-600"), s.classList.remove("text-gray-400")) : (s.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />', s.classList.add("text-blue-600"), s.classList.remove("text-gray-400"))) : (s.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />', s.classList.remove("text-blue-600"), s.classList.add("text-gray-400")));
    }), this.tableEl.querySelectorAll("[data-sort]").forEach((r) => {
      const n = r.dataset.sort, o = this.state.sort.find((a) => a.field === n), s = r.querySelector(".sort-indicator");
      s && (s.textContent = o ? o.direction === "asc" ? "↑" : "↓" : "");
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
    document.querySelectorAll("[data-bulk-action]").forEach((r) => {
      r.addEventListener("click", async () => {
        const n = r.dataset.bulkAction;
        if (!n) return;
        const o = Array.from(this.state.selectedRows);
        if (o.length === 0) {
          this.notify("Please select items first", "warning");
          return;
        }
        if (this.config.bulkActions) {
          const s = this.config.bulkActions.find((a) => a.id === n);
          if (s) {
            try {
              await this.actionRenderer.executeBulkAction(s, o), this.state.selectedRows.clear(), this.updateBulkActionsBar(), await this.refresh();
            } catch (a) {
              console.error("Bulk action failed:", a), this.showError("Bulk action failed");
            }
            return;
          }
        }
        if (this.config.behaviors?.bulkActions)
          try {
            await this.config.behaviors.bulkActions.execute(n, o, this), this.state.selectedRows.clear(), this.updateBulkActionsBar();
          } catch (s) {
            console.error("Bulk action failed:", s), this.showError("Bulk action failed");
          }
      });
    });
    const t = document.getElementById("clear-selection-btn");
    t && t.addEventListener("click", () => {
      this.state.selectedRows.clear(), this.updateBulkActionsBar(), document.querySelectorAll(".table-checkbox").forEach((o) => o.checked = !1);
      const n = document.querySelector(this.selectors.selectAllCheckbox);
      n && (n.checked = !1);
    });
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
        const n = t.dataset.dropdownToggle, o = document.getElementById(n || "");
        o && (o.classList.contains("hidden"), document.querySelectorAll("[data-dropdown-toggle]").forEach((s) => {
          const a = s.dataset.dropdownToggle, l = document.getElementById(a || "");
          l && l !== o && l.classList.add("hidden");
        }), o.classList.toggle("hidden"));
      }, { signal: e });
    }), document.addEventListener("click", (t) => {
      const r = t.target.closest("[data-dropdown-trigger]");
      if (r) {
        t.stopPropagation();
        const o = r.closest("[data-dropdown]")?.querySelector(".actions-menu");
        document.querySelectorAll(".actions-menu").forEach((a) => {
          a !== o && a.classList.add("hidden");
        });
        const s = o?.classList.contains("hidden");
        o?.classList.toggle("hidden"), r.setAttribute("aria-expanded", s ? "true" : "false"), s && o && this.positionDropdownMenu(r, o);
      } else
        t.target.closest("[data-dropdown-toggle], #column-toggle-menu, #export-menu") || (document.querySelectorAll(".actions-menu").forEach(
          (o) => o.classList.add("hidden")
        ), document.querySelectorAll("[data-dropdown-toggle]").forEach((o) => {
          const s = o.dataset.dropdownToggle, a = document.getElementById(s || "");
          a && a.classList.add("hidden");
        }));
    }, { signal: e }), document.addEventListener("keydown", (t) => {
      t.key === "Escape" && (document.querySelectorAll(".actions-menu").forEach((r) => {
        r.classList.add("hidden");
        const n = r.closest("[data-dropdown]")?.querySelector("[data-dropdown-trigger]");
        n && n.setAttribute("aria-expanded", "false");
      }), document.querySelectorAll("[data-dropdown-toggle]").forEach((r) => {
        const n = r.dataset.dropdownToggle, o = document.getElementById(n || "");
        o && o.classList.add("hidden");
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
    return e instanceof Response ? wt(e) : e instanceof Error ? e.message : "An unexpected error occurred";
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
    const t = new Set(this.config.columns.map((s) => s.field)), r = new Set(e), n = e.filter((s) => t.has(s)), o = this.config.columns.map((s) => s.field).filter((s) => !r.has(s));
    return [...n, ...o];
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
    r && this.reorderRowCells(r, e, "th"), this.tableEl.querySelectorAll("tbody tr").forEach((o) => {
      this.reorderRowCells(o, e, "td");
    });
  }
  /**
   * Reorder cells within a single row
   * Preserves fixed columns (selection on left, actions on right)
   */
  reorderRowCells(e, t, r) {
    const n = Array.from(e.querySelectorAll(`${r}[data-column]`)), o = new Map(
      n.map((d) => [d.dataset.column, d])
    ), s = Array.from(e.querySelectorAll(r)), a = e.querySelector(`${r}[data-role="selection"]`) || s.find((d) => d.querySelector('input[type="checkbox"]')), l = e.querySelector(`${r}[data-role="actions"]`) || s.find(
      (d) => !d.dataset.column && (d.querySelector("[data-action]") || d.querySelector("[data-action-id]") || d.querySelector(".dropdown"))
    ), c = [];
    a && c.push(a), t.forEach((d) => {
      const u = o.get(d);
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
typeof window < "u" && (window.DataGrid = hr);
const bt = {
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
class vr {
  constructor(e) {
    this.criteria = [], this.modal = null, this.container = null, this.searchInput = null, this.clearBtn = null, this.config = e, this.notifier = e.notifier || new He();
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
        const o = this.createLogicConnector(t);
        r.appendChild(o);
      }
      this.container.appendChild(r);
    }));
  }
  createCriterionRow(e, t) {
    const r = document.createElement("div");
    r.className = "flex items-center gap-2 py-3";
    const n = this.config.fields.find((o) => o.name === e.field) || this.config.fields[0];
    return r.innerHTML = `
      <select data-criterion-index="${t}" data-criterion-part="field"
              class="py-2 px-3 pe-9 block border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50">
        ${this.config.fields.map((o) => `
          <option value="${o.name}" ${o.name === e.field ? "selected" : ""}>${o.label}</option>
        `).join("")}
      </select>

      <select data-criterion-index="${t}" data-criterion-part="operator"
              class="py-2 px-3 pe-9 block border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50">
        ${this.getOperatorsForField(n).map((o) => `
          <option value="${o.value}" ${o.value === e.operator ? "selected" : ""}>${o.label}</option>
        `).join("")}
      </select>

      ${this.createValueInput(n, e, t)}

      <button type="button" data-criterion-index="${t}" data-action="remove"
              class="p-2 text-gray-400 hover:text-red-600">
        <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
        </svg>
      </button>
    `, r.querySelectorAll("select, input").forEach((o) => {
      o.addEventListener("change", (s) => this.updateCriterion(s.target));
    }), r.querySelector('[data-action="remove"]')?.addEventListener("click", () => {
      this.removeCriterion(t);
    }), r;
  }
  createValueInput(e, t, r) {
    return e.type === "select" && e.options ? `
        <select data-criterion-index="${r}" data-criterion-part="value"
                class="flex-1 py-2 px-3 block border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500">
          <option value="">Select...</option>
          ${e.options.map((o) => `
            <option value="${o.value}" ${o.value === t.value ? "selected" : ""}>${o.label}</option>
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
      n.addEventListener("click", (o) => {
        const s = o.target, a = parseInt(s.dataset.logicIndex || "0", 10), l = s.dataset.logicValue;
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
    return e.operators && e.operators.length > 0 ? e.operators.map((t) => ({ label: t, value: t })) : bt[e.type] || bt.text;
  }
  applySearch() {
    this.pushCriteriaToURL(), this.config.onSearch(this.criteria), this.renderChips(), this.close();
  }
  savePreset() {
    const e = prompt("Enter a name for this search preset:");
    if (!e) return;
    const t = this.loadPresetsFromStorage();
    t[e] = this.criteria, localStorage.setItem("search_presets", JSON.stringify(t)), this.notifier.success(`Preset "${e}" saved!`);
  }
  loadPreset() {
    const e = this.loadPresetsFromStorage(), t = Object.keys(e);
    if (t.length === 0) {
      this.notifier.warning("No saved presets found.");
      return;
    }
    const r = prompt(`Available presets:
${t.join(`
`)}

Enter preset name to load:`);
    !r || !e[r] || (this.criteria = e[r], this.renderCriteria());
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
      t && (t.placeholder = "", t.style.display = ""), r && r.classList.remove("hidden"), this.criteria.forEach((n, o) => {
        const s = this.createChip(n, o);
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
    const o = this.config.fields.find((l) => l.name === e.field)?.label || e.field, s = e.operator === "ilike" ? "contains" : e.operator === "eq" ? "is" : e.operator;
    r.innerHTML = `
      <span>${o} ${s} "${e.value}"</span>
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
const yt = {
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
class br {
  constructor(e) {
    this.panel = null, this.container = null, this.previewElement = null, this.sqlPreviewElement = null, this.overlay = null, this.config = e, this.notifier = e.notifier || new He(), this.structure = { groups: [], groupLogic: [] }, this.init();
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
    const o = document.createElement("button");
    return o.type = "button", o.className = "mt-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800", o.dataset.addCondition = String(t), o.innerHTML = `
      <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 5v14"/><path d="M5 12h14"/>
      </svg>
      ${e.logic.toUpperCase()}
    `, r.appendChild(o), this.bindGroupEvents(r, t), r;
  }
  createConditionElement(e, t, r) {
    const n = document.createElement("div");
    n.className = "flex items-center gap-2 mb-2";
    const o = this.config.fields.find((s) => s.name === e.field) || this.config.fields[0];
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
        ${this.getOperatorsForField(o).map((s) => `
          <option value="${s.value}" ${s.value === e.operator ? "selected" : ""}>${s.label}</option>
        `).join("")}
      </select>

      ${this.renderValueInput(o, e, t, r)}

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
      n.addEventListener("click", (o) => {
        const s = o.target, a = parseInt(s.dataset.groupLogic || "0", 10), l = s.dataset.logicValue;
        this.structure.groupLogic[a] = l, this.render();
      });
    }), t;
  }
  bindGroupEvents(e, t) {
    const r = e.querySelector(`[data-remove-group="${t}"]`);
    r && r.addEventListener("click", () => this.removeGroup(t));
    const n = e.querySelector(`[data-add-condition="${t}"]`);
    n && n.addEventListener("click", () => this.addCondition(t)), e.querySelectorAll("[data-cond]").forEach((o) => {
      const s = o, [a, l, c] = s.dataset.cond.split("-"), d = parseInt(a, 10), u = parseInt(l, 10);
      s.addEventListener("change", () => {
        c === "field" ? (this.structure.groups[d].conditions[u].field = s.value, this.render()) : c === "operator" ? (this.structure.groups[d].conditions[u].operator = s.value, this.updatePreview()) : c === "value" && (this.structure.groups[d].conditions[u].value = s.value, this.updatePreview());
      });
    }), e.querySelectorAll("[data-remove-cond]").forEach((o) => {
      o.addEventListener("click", (s) => {
        const l = s.target.closest("[data-remove-cond]");
        if (!l) return;
        const [c, d] = l.dataset.removeCond.split("-").map(Number);
        this.removeCondition(c, d);
      });
    }), e.querySelectorAll("[data-add-cond-or], [data-add-cond-and]").forEach((o) => {
      o.addEventListener("click", (s) => {
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
    return e.operators && e.operators.length > 0 ? e.operators.map((t) => ({ label: t, value: t })) : yt[e.type] || yt.text;
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
        const o = n.operator.toUpperCase(), s = typeof n.value == "string" ? `'${n.value}'` : n.value;
        return `${n.field} ${o === "ILIKE" ? "ILIKE" : o === "EQ" ? "=" : o} ${s}`;
      });
      return r.length === 0 ? "" : r.length === 1 ? r[0] : `( ${r.join(` ${t.logic.toUpperCase()} `)} )`;
    }).filter((t) => t !== "");
    return e.length === 0 ? "" : e.length === 1 ? e[0] : e.reduce((t, r, n) => {
      if (n === 0) return r;
      const o = this.structure.groupLogic[n - 1] || "and";
      return `${t} ${o.toUpperCase()} ${r}`;
    }, "");
  }
  generateTextPreview() {
    const e = this.structure.groups.map((t) => {
      const r = t.conditions.filter((n) => n.value !== "" && n.value !== null).map((n) => {
        const o = this.config.fields.find((l) => l.name === n.field), s = o?.label || n.field, a = this.getOperatorsForField(o).find((l) => l.value === n.operator)?.label || n.operator;
        return `${s} ${a} "${n.value}"`;
      });
      return r.length === 0 ? "" : r.length === 1 ? r[0] : `( ${r.join(` ${t.logic.toUpperCase()} `)} )`;
    }).filter((t) => t !== "");
    return e.length === 0 ? "" : e.length === 1 ? e[0] : e.reduce((t, r, n) => {
      if (n === 0) return r;
      const o = this.structure.groupLogic[n - 1] || "and";
      return `${t} ${o.toUpperCase()} ${r}`;
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
      const o = n.column;
      t.has(o) || t.set(o, []), t.get(o).push(n);
    });
    const r = [];
    return t.forEach((n) => {
      r.push({
        conditions: n.map((o) => ({
          field: o.column,
          operator: o.operator || "ilike",
          value: o.value
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
class yr {
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
class wr {
  buildFilters(e) {
    const t = {}, r = /* @__PURE__ */ new Map();
    return e.forEach((n) => {
      if (n.value === null || n.value === void 0 || n.value === "")
        return;
      const o = n.operator || "eq", s = n.column;
      r.has(s) || r.set(s, { operator: o, values: [] }), r.get(s).values.push(n.value);
    }), r.forEach((n, o) => {
      if (n.values.length === 1) {
        const s = n.operator === "eq" ? o : `${o}__${n.operator}`;
        t[s] = n.values[0];
      } else
        n.operator === "ilike" ? t[`${o}__ilike`] = n.values.join(",") : n.operator === "eq" ? t[`${o}__in`] = n.values.join(",") : t[`${o}__${n.operator}`] = n.values.join(",");
    }), t;
  }
  async onFilterChange(e, t, r) {
    r.resetPagination(), await r.refresh();
  }
}
class Er {
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
class Cr {
  buildQuery(e) {
    return !e || e.length === 0 ? {} : { order: e.map((r) => `${r.field} ${r.direction}`).join(",") };
  }
  async onSort(e, t, r) {
    await r.refresh();
  }
}
class Sr {
  constructor(e, t = "export") {
    this.baseEndpoint = e, this.actionSlug = t;
  }
  getEndpoint() {
    return `${this.getPluralEndpoint()}/actions/${this.actionSlug}`;
  }
  getPluralEndpoint() {
    return this.baseEndpoint.endsWith("s") ? this.baseEndpoint : `${this.baseEndpoint}s`;
  }
  async export(e, t) {
    const r = t.buildQueryString(), n = `${this.getEndpoint()}?format=${e}&${r}`;
    window.open(n, "_blank");
  }
}
class xr {
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
    const n = this.getActionEndpoint(e), o = await fetch(n, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ ids: t })
    });
    if (!o.ok) {
      const s = await o.text();
      throw new Error(`Bulk action '${e}' failed: ${s}`);
    }
    await r.refresh();
  }
}
function Ot(i) {
  return typeof i == "object" && i !== null && "version" in i && i.version === 2;
}
class fr {
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
    const r = !t.state.hiddenColumns.has(e), n = t.config.columns.filter((a) => a.field === e ? !r : !t.state.hiddenColumns.has(a.field)).map((a) => a.field), o = {};
    t.config.columns.forEach((a) => {
      o[a.field] = n.includes(a.field);
    });
    const s = this.cachedOrder || t.state.columnOrder;
    this.savePrefs({
      version: 2,
      visibility: o,
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
      const r = new Set(e), n = t.order.filter((o) => r.has(o));
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
      return Object.entries(t.visibility).forEach(([o, s]) => {
        !s && r.has(o) && n.add(o);
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
      if (Ot(t))
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
class Dr extends fr {
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
      const o = n[this.serverPrefsKey];
      return Ot(o) ? (this.serverPrefs = o, this.savePrefs(o), console.log("[ServerColumnVisibility] Loaded prefs from server:", o), o) : (console.warn("[ServerColumnVisibility] Server prefs not in V2 format:", o), null);
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
      const n = new Set(e), o = (t.order || []).filter((s) => n.has(s));
      return {
        hiddenColumns: r,
        columnOrder: o
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
  Nt as ActionRenderer,
  vr as AdvancedSearch,
  Ft as CellRendererRegistry,
  ur as ColumnManager,
  mr as CommonRenderers,
  hr as DataGrid,
  fr as DefaultColumnVisibilityBehavior,
  br as FilterBuilder,
  xr as GoCrudBulkActionBehavior,
  Sr as GoCrudExportBehavior,
  wr as GoCrudFilterBehavior,
  Er as GoCrudPaginationBehavior,
  yr as GoCrudSearchBehavior,
  Cr as GoCrudSortBehavior,
  Dr as ServerColumnVisibilityBehavior
};
//# sourceMappingURL=index.js.map
