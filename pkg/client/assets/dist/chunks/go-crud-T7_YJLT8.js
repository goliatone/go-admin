import { createLogger as x } from "../shared/logger.js";
import { escapeAttribute as h, escapeHTML as v } from "../shared/html.js";
import { t as je } from "./icon-renderer-CRFyVbyB.js";
import { t as we } from "./toast-manager-CEA-8d8Y.js";
import { httpRequest as A, readHTTPError as ve, readHTTPJSONObject as Ue, readHTTPJSONValue as ze } from "../shared/transport/http-client.js";
import { createStructuredActionError as de, executeStructuredRequest as Ve, extractErrorMessage as He, formatStructuredErrorForDisplay as Ae, getStructuredActionError as U, isHandledActionError as D } from "../toast/error-helpers.js";
import { closeActionMenu as Ke, defaultActionMenuPositioner as Qe, initActionMenus as Je } from "../shared/action-menu.js";
import { n as Ye, t as We } from "./action-execution-CwwC3ziX.js";
import { n as Xe, t as Z } from "./badge-uRjgR9qC.js";
import { A as Ce, M as Ze, N as et, P as tt, j as Ee } from "./translation-status-vocabulary-NKPjpKF9.js";
import { r as fe, t as rt } from "./translation-context-Dzj4Lb4I.js";
import { C as nt, E as at, S as ot, _ as xe, a as st, b as it, c as lt, d as ct, f as ut, g as oe, h as dt, l as ft, m as pt, n as ht, s as mt, u as se, w as bt } from "./grouped-mode-C1WBh7ma.js";
import { buildURL as pe, deleteSearchParams as he } from "../shared/query-state/url-state.js";
import { t as yt } from "./sortable.esm-ChQrsKAN.js";
var Y = x("DataGrid"), St = 0, gt = class {
  constructor(e = {}) {
    this.actionBasePath = e.actionBasePath || "", this.mode = e.mode || "dropdown", this.notifier = e.notifier || new we();
    const t = this.sanitize(e.domIdPrefix || "grid") || "grid";
    this.domNamespace = `${t}-${++St}`, this.rowRenderSeq = 0;
  }
  renderRowActions(e, t) {
    const r = `${this.domNamespace}-row-${++this.rowRenderSeq}`;
    if (this.mode === "dropdown") return this.renderRowActionsDropdown(e, t, r);
    const n = this.getVisibleActions(e, t);
    return n.length === 0 ? '<div class="admin-datagrid__action-list flex justify-end gap-2"></div>' : `<div class="admin-datagrid__action-list flex justify-end gap-2">${n.map(({ action: a, sourceIndex: o }) => {
      const s = this.getVariantClass(a.variant || "secondary"), i = a.icon ? this.renderIcon(a.icon) : "", c = a.className || "", l = a.disabled === !0, u = this.getActionKey(a, o), d = l ? "opacity-50 cursor-not-allowed" : "", f = l ? 'aria-disabled="true"' : "", p = l && a.disabledReason ? `${r}-${u}-disabled-reason` : "", C = p ? `aria-describedby="${h(p)}"` : "", g = l && a.disabledReason ? `${a.label} unavailable: ${a.disabledReason}` : a.label, k = p ? `<span id="${h(p)}" class="sr-only">${v(a.disabledReason || "Action unavailable")}</span>` : "", R = a.disabledReason ? `title="${h(a.disabledReason)}"` : "";
      return `
        <button
          type="button"
          class="admin-datagrid__action btn btn-sm ${h(s)} ${h(c)} ${d}"
          data-action-id="${h(this.sanitize(a.label))}"
          data-action-key="${h(u)}"
          data-record-id="${h(e.id)}"
          data-disabled="${l}"
          ${f}
          aria-label="${h(g)}"
          ${C}
          ${R}
        >
          ${i}
          ${v(a.label)}
        </button>
        ${k}
      `;
    }).join("")}</div>`;
  }
  renderRowActionsDropdown(e, t, r) {
    const n = this.getVisibleActions(e, t);
    if (n.length === 0) return '<div class="admin-datagrid__actions-empty text-sm text-gray-400">No actions</div>';
    const a = `${r}-menu`, o = this.buildDropdownItems(e, n, r);
    return `
      <div class="action-menu action-menu--right actions-dropdown" data-action-menu data-dropdown>
        <button type="button"
                class="action-menu__trigger actions-menu-trigger"
                data-action-menu-trigger
                data-dropdown-trigger
                aria-label="Actions menu"
                aria-haspopup="true"
                aria-expanded="false"
                aria-controls="${h(a)}">
          ${this.renderDotsIcon()}
        </button>

        <div id="${h(a)}"
             class="action-menu__content actions-menu hidden"
             data-action-menu-content
             data-position="right"
             role="menu"
             aria-orientation="vertical">
          ${o}
        </div>
      </div>
    `;
  }
  buildDropdownItems(e, t, r) {
    return t.map(({ action: n, sourceIndex: a }, o) => {
      const s = n.variant === "danger", i = n.disabled === !0, c = this.getActionKey(n, a), l = n.icon ? this.renderIcon(n.icon) : "", u = this.shouldShowDivider(n, o), d = i ? (n.disabledReason || "Action unavailable").trim() : "", f = d ? `${r}-${c}-disabled-reason` : "", p = u ? '<div class="action-menu__divider action-divider" role="separator"></div>' : "", C = i ? "action-menu__item action-item action-item--disabled" : s ? "action-menu__item action-menu__item--danger action-item action-item--danger" : "action-menu__item action-item", g = i ? 'aria-disabled="true"' : "", k = f ? `aria-describedby="${h(f)}"` : "", R = d ? `${n.label} unavailable: ${d}` : n.label, J = n.disabledReason ? `title="${h(n.disabledReason)}"` : "", m = d ? `<span id="${h(f)}" class="action-item-reason">${v(d)}</span>` : "";
      return `
        ${p}
        <button type="button"
                class="${h(C)}"
                data-action-id="${h(this.sanitize(n.label))}"
                data-action-menu-item
                data-action-key="${h(c)}"
                data-record-id="${h(e.id)}"
                data-disabled="${i}"
                role="menuitem"
                ${g}
                aria-label="${h(R)}"
                ${k}
                ${J}>
          <span class="action-item__icon">${l}</span>
          <span class="action-item__content">
            <span class="action-item__label">${v(n.label)}</span>
            ${m}
          </span>
        </button>
      `;
    }).join("");
  }
  shouldShowDivider(e, t) {
    return t === 0 ? !1 : e.variant === "danger" ? !0 : [
      "download",
      "archive",
      "delete",
      "remove"
    ].some((r) => e.label.toLowerCase().includes(r));
  }
  renderDotsIcon() {
    return `
      <svg class="action-menu__icon" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/>
      </svg>
    `;
  }
  renderDefaultActions(e, t) {
    return '<div class="text-sm text-gray-400">Use core.ts for default actions</div>';
  }
  attachRowActionListeners(e, t, r, n = {}) {
    t.forEach((a, o) => {
      const s = this.getActionKey(a, o), i = e.querySelector(`[data-action-key="${s}"]`);
      i && i.addEventListener("click", async (c) => {
        if (c.preventDefault(), i.getAttribute("aria-disabled") === "true" || i.dataset.disabled === "true") return;
        const l = i.closest("[data-action-menu-content]");
        l && Ke(l);
        try {
          await a.action(r);
        } catch (u) {
          if (Y.error(`Action "${a.label}" failed:`, u), n.onError) {
            await n.onError(u, a, r);
            return;
          }
          const d = u instanceof Error ? u.message : `Action "${a.label}" failed`;
          this.notifier.error(d);
        }
      });
    });
  }
  renderBulkActionsToolbar(e) {
    const t = document.createElement("div");
    t.id = "bulk-actions-bar", t.className = "hidden bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 flex items-center gap-4";
    const r = document.createElement("span");
    r.className = "text-sm font-medium text-blue-900", r.id = "selected-count", r.textContent = "0 items selected", t.appendChild(r);
    const n = document.createElement("div");
    n.className = "flex gap-2 flex-1", e.forEach((o) => {
      const s = document.createElement("button");
      s.type = "button", s.className = "btn btn-sm btn-primary", s.dataset.bulkAction = o.id, o.icon ? s.innerHTML = `${this.renderIcon(o.icon)} ${o.label}` : s.textContent = o.label, n.appendChild(s);
    }), t.appendChild(n);
    const a = document.createElement("button");
    return a.type = "button", a.className = "btn btn-sm btn-secondary", a.id = "clear-selection-btn", a.textContent = "Clear Selection", t.appendChild(a), t;
  }
  async executeBulkAction(e, t) {
    if (e.guard && !e.guard(t)) {
      Y.warn(`Bulk action "${e.id}" guard failed`);
      return;
    }
    if (e.confirm) {
      const n = e.confirm.replace("{count}", t.length.toString());
      if (!await this.notifier.confirm(n)) return;
    }
    const r = await this.resolveBulkActionPayload(e, t);
    if (r !== null)
      try {
        const n = await Ve(e.endpoint, {
          method: e.method || "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json"
          },
          body: JSON.stringify(r)
        }, async (o) => {
          const s = await ze(o, void 0);
          return {
            success: !0,
            data: s === void 0 ? void 0 : s
          };
        });
        if (!n.success) {
          const o = n.error, s = o ? Ae(o, `Bulk action '${e.id}' failed`) : `Bulk action '${e.id}' failed`;
          throw e.onError || this.notifier.error(s), o ? de(o, `Bulk action '${e.id}' failed`, !0) : de({
            textCode: null,
            message: s,
            metadata: null,
            fields: null,
            validationErrors: null
          }, `Bulk action '${e.id}' failed`, !0);
        }
        const a = n.data;
        this.notifier.success(this.buildBulkSuccessMessage(e, a, t.length)), e.onSuccess && e.onSuccess(a);
      } catch (n) {
        if (Y.error(`Bulk action "${e.id}" failed:`, n), !e.onError && !D(n)) {
          const a = n instanceof Error ? n.message : "Bulk action failed";
          this.notifier.error(a);
        }
        throw e.onError && e.onError(n), n;
      }
  }
  async resolveBulkActionPayload(e, t) {
    const r = {
      ...e.payload || {},
      ids: t
    }, n = this.normalizePayloadSchema(e.payloadSchema);
    n?.properties && Object.entries(n.properties).forEach(([s, i]) => {
      r[s] === void 0 && i && i.default !== void 0 && (r[s] = i.default);
    });
    const a = this.collectRequiredFields(e.payloadRequired, n).filter((s) => s !== "ids" && this.isEmptyPayloadValue(r[s]));
    if (a.length === 0) return r;
    const o = await this.requestRequiredFields(e, a, n, r);
    if (o === null) return null;
    for (const s of a) {
      const i = n?.properties?.[s], c = o[s] ?? "", l = this.coercePromptValue(c, s, i);
      if (l.error)
        return this.notifier.error(l.error), null;
      r[s] = l.value;
    }
    return r;
  }
  collectRequiredFields(e, t) {
    const r = [], n = /* @__PURE__ */ new Set(), a = (o) => {
      const s = o.trim();
      !s || n.has(s) || (n.add(s), r.push(s));
    };
    return Array.isArray(e) && e.forEach((o) => a(String(o))), Array.isArray(t?.required) && t.required.forEach((o) => a(String(o))), r;
  }
  normalizePayloadSchema(e) {
    if (!e || typeof e != "object") return null;
    const t = e.properties;
    let r;
    return t && typeof t == "object" && (r = {}, Object.entries(t).forEach(([n, a]) => {
      a && typeof a == "object" && (r[n] = a);
    })), {
      type: typeof e.type == "string" ? e.type : void 0,
      required: e.required,
      properties: r
    };
  }
  async requestRequiredFields(e, t, r, n) {
    const a = t.map((o) => {
      const s = r?.properties?.[o], i = typeof s?.type == "string" ? s.type.toLowerCase() : "string";
      return {
        name: o,
        label: (s?.title || o).trim(),
        description: (s?.description || "").trim() || void 0,
        value: this.stringifyPromptDefault(n[o] !== void 0 ? n[o] : s?.default),
        type: i,
        options: this.buildSchemaOptions(s)
      };
    });
    return Ye.prompt({
      title: `Complete ${e.label || e.id}`,
      fields: a
    });
  }
  buildSchemaOptions(e) {
    if (e) {
      if (Array.isArray(e.oneOf) && e.oneOf.length > 0) {
        const t = e.oneOf.filter((r) => r && Object.prototype.hasOwnProperty.call(r, "const")).map((r) => {
          const n = this.stringifyPromptDefault(r.const);
          return {
            value: n,
            label: typeof r.title == "string" && r.title.trim() ? r.title.trim() : n
          };
        });
        return t.length > 0 ? t : void 0;
      }
      if (Array.isArray(e.enum) && e.enum.length > 0) {
        const t = e.enum.map((r) => {
          const n = this.stringifyPromptDefault(r);
          return {
            value: n,
            label: n
          };
        });
        return t.length > 0 ? t : void 0;
      }
      if (typeof e.type == "string" && e.type.toLowerCase() === "boolean") return [{
        value: "true",
        label: "True"
      }, {
        value: "false",
        label: "False"
      }];
    }
  }
  stringifyPromptDefault(e) {
    if (e == null) return "";
    if (typeof e == "string") return e;
    if (typeof e == "number" || typeof e == "boolean") return String(e);
    try {
      return JSON.stringify(e);
    } catch {
      return "";
    }
  }
  coercePromptValue(e, t, r) {
    if (Array.isArray(r?.oneOf) && r.oneOf.length > 0) {
      const o = r.oneOf.find((s) => s && Object.prototype.hasOwnProperty.call(s, "const") && this.stringifyPromptDefault(s.const) === e);
      return !o || !Object.prototype.hasOwnProperty.call(o, "const") ? {
        value: e,
        error: `${t} must be one of: ${r.oneOf.map((s) => typeof s?.title == "string" && s.title.trim() ? s.title.trim() : this.stringifyPromptDefault(s.const)).filter((s) => s !== "").join(", ")}`
      } : { value: o.const };
    }
    const n = (r?.type || "string").toLowerCase();
    if (e === "") return { value: "" };
    let a = e;
    switch (n) {
      case "integer": {
        const o = Number.parseInt(e, 10);
        if (Number.isNaN(o)) return {
          value: e,
          error: `${t} must be an integer.`
        };
        a = o;
        break;
      }
      case "number": {
        const o = Number.parseFloat(e);
        if (Number.isNaN(o)) return {
          value: e,
          error: `${t} must be a number.`
        };
        a = o;
        break;
      }
      case "boolean": {
        const o = e.toLowerCase();
        if ([
          "true",
          "1",
          "yes",
          "y",
          "on"
        ].includes(o)) {
          a = !0;
          break;
        }
        if ([
          "false",
          "0",
          "no",
          "n",
          "off"
        ].includes(o)) {
          a = !1;
          break;
        }
        return {
          value: e,
          error: `${t} must be true/false.`
        };
      }
      case "array":
      case "object":
        try {
          const o = JSON.parse(e);
          if (n === "array" && !Array.isArray(o)) return {
            value: e,
            error: `${t} must be a JSON array.`
          };
          if (n === "object" && (o === null || Array.isArray(o) || typeof o != "object")) return {
            value: e,
            error: `${t} must be a JSON object.`
          };
          a = o;
        } catch {
          return {
            value: e,
            error: `${t} must be valid JSON.`
          };
        }
        break;
      default:
        a = e;
    }
    return Array.isArray(r?.enum) && r.enum.length > 0 && !r.enum.some((o) => o === a || String(o) === String(a)) ? {
      value: a,
      error: `${t} must be one of: ${r.enum.map((o) => String(o)).join(", ")}`
    } : { value: a };
  }
  isEmptyPayloadValue(e) {
    return e == null ? !0 : typeof e == "string" ? e.trim() === "" : Array.isArray(e) ? e.length === 0 : typeof e == "object" ? Object.keys(e).length === 0 : !1;
  }
  buildBulkSuccessMessage(e, t, r) {
    const n = e.label || e.id || "Bulk action", a = t && typeof t == "object" ? t.summary : null, o = a && typeof a.succeeded == "number" ? a.succeeded : typeof t?.processed == "number" ? t.processed : r, s = a && typeof a.failed == "number" ? a.failed : 0;
    return s > 0 ? `${n} completed: ${o} succeeded, ${s} failed.` : `${n} completed for ${o} item${o === 1 ? "" : "s"}.`;
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
  getActionKey(e, t) {
    const r = typeof e.id == "string" ? e.id.trim() : "", n = this.sanitize(r || e.label) || "action";
    return `action-${t + 1}-${n}`;
  }
  getVisibleActions(e, t) {
    return t.map((r, n) => ({
      action: r,
      sourceIndex: n
    })).filter(({ action: r }) => !r.condition || r.condition(e));
  }
  sanitize(e) {
    return e.toLowerCase().replace(/[^a-z0-9]/g, "-");
  }
}, wt = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})\.(\d+)(Z|[+-]\d{2}:\d{2})$/;
function j(e) {
  return !Number.isNaN(e.getTime());
}
function vt(e) {
  const t = e.trim(), r = t.match(wt);
  if (!r) return t;
  const [, n, a, o] = r;
  return a.length <= 3 ? t : `${n}.${a.slice(0, 3)}${o}`;
}
function z(e) {
  if (e instanceof Date) return j(e) ? new Date(e.getTime()) : null;
  if (typeof e == "number") {
    const o = new Date(e);
    return j(o) ? o : null;
  }
  if (typeof e != "string") return null;
  const t = e.trim();
  if (!t) return null;
  const r = new Date(t);
  if (j(r)) return r;
  const n = vt(t);
  if (n === t) return null;
  const a = new Date(n);
  return j(a) ? a : null;
}
var E = '<span class="text-gray-400">-</span>', At = [
  "name",
  "label",
  "title",
  "slug",
  "id",
  "code",
  "key",
  "value",
  "type",
  "blockType",
  "block_type"
];
function Ct(e) {
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}
function Et(e) {
  const t = [], r = (a) => {
    if (typeof a != "string") return;
    const o = a.trim();
    !o || t.includes(o) || t.push(o);
  };
  r(e.display_key), r(e.displayKey);
  const n = e.display_keys ?? e.displayKeys;
  return Array.isArray(n) && n.forEach(r), t;
}
function xt(e, t) {
  if (!t) return;
  if (Object.prototype.hasOwnProperty.call(e, t)) return e[t];
  if (!t.includes(".")) return;
  const r = t.split(".");
  let n = e;
  for (const a of r) {
    if (!n || typeof n != "object" || Array.isArray(n) || !Object.prototype.hasOwnProperty.call(n, a)) return;
    n = n[a];
  }
  return n;
}
function kt(e) {
  if (e == null) return "";
  switch (typeof e) {
    case "string":
      return e.trim();
    case "number":
    case "bigint":
      return String(e);
    case "boolean":
      return e ? "true" : "false";
    default:
      return "";
  }
}
function ee(e, t) {
  if (e == null) return "";
  if (Array.isArray(e)) return te(e, t);
  if (typeof e != "object") return String(e);
  const r = [...Et(t), ...At], n = /* @__PURE__ */ new Set();
  for (const a of r) {
    if (n.has(a)) continue;
    n.add(a);
    const o = kt(xt(e, a));
    if (o) return o;
  }
  return Ct(e);
}
function te(e, t) {
  if (!Array.isArray(e) || e.length === 0) return "";
  const r = e.map((s) => ee(s, t).trim()).filter(Boolean);
  if (r.length === 0) return "";
  const n = Number(t.preview_limit ?? t.previewLimit ?? 3), a = Number.isFinite(n) && n > 0 ? Math.floor(n) : 3, o = r.slice(0, a);
  return r.length <= a ? o.join(", ") : `${o.join(", ")} +${r.length - a} more`;
}
function Rt(e, t, r, n) {
  const a = e[t] ?? e[r] ?? n, o = Number(a);
  return Number.isFinite(o) && o > 0 ? Math.floor(o) : n;
}
function _t(e, t, r, n) {
  const a = e[t] ?? e[r];
  return a == null ? n : typeof a == "boolean" ? a : typeof a == "string" ? a.toLowerCase() === "true" || a === "1" : !!a;
}
function Pt(e, t, r, n) {
  const a = e[t] ?? e[r];
  return a == null ? n : String(a).trim() || n;
}
function Mt(e) {
  if (e == null) return "";
  if (typeof e == "string") return e.trim();
  if (typeof e != "object") return String(e).trim();
  for (const t of [
    "_type",
    "type",
    "blockType",
    "block_type"
  ]) {
    const r = e[t];
    if (typeof r == "string" && r.trim()) return r.trim();
  }
  return "";
}
function Lt(e) {
  switch (e) {
    case "muted":
      return "bg-gray-100 text-gray-600";
    case "outline":
      return "bg-white border border-gray-300 text-gray-700";
    default:
      return "bg-blue-50 text-blue-700";
  }
}
var Dt = class {
  constructor() {
    this.renderers = /* @__PURE__ */ new Map(), this.defaultRenderer = (e) => {
      if (e == null) return E;
      if (typeof e == "boolean") return e ? "Yes" : "No";
      if (Array.isArray(e)) {
        const t = te(e, {});
        return t ? v(t) : E;
      }
      if (typeof e == "object") {
        const t = ee(e, {});
        return t ? v(t) : E;
      }
      return String(e);
    }, this.registerDefaultRenderers();
  }
  register(e, t) {
    this.renderers.set(e, t);
  }
  get(e) {
    return this.renderers.get(e) || this.defaultRenderer;
  }
  has(e) {
    return this.renderers.has(e);
  }
  registerDefaultRenderers() {
    this.renderers.set("_badge", (e) => {
      const t = String(e).toLowerCase();
      return Z(String(e), "status", t);
    }), this.renderers.set("_date", (e) => {
      if (!e) return '<span class="text-gray-400">-</span>';
      const t = z(e);
      return t ? t.toLocaleDateString() : String(e);
    }), this.renderers.set("_datetime", (e) => {
      if (!e) return '<span class="text-gray-400">-</span>';
      const t = z(e);
      return t ? t.toLocaleString() : String(e);
    }), this.renderers.set("_boolean", (e) => `<div class="flex justify-center">${e ? '<svg class="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>' : '<svg class="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg>'}</div>`), this.renderers.set("_link", (e, t) => e ? `<a href="${t.url || t.link || "#"}" class="text-blue-600 hover:text-blue-800 underline">${e}</a>` : '<span class="text-gray-400">-</span>'), this.renderers.set("_email", (e) => e ? `<a href="mailto:${e}" class="text-blue-600 hover:text-blue-800">${e}</a>` : '<span class="text-gray-400">-</span>'), this.renderers.set("_url", (e) => e ? `<a href="${e}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 inline-flex items-center gap-1">
        ${e}
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
        </svg>
      </a>` : '<span class="text-gray-400">-</span>'), this.renderers.set("_number", (e) => e == null ? '<span class="text-gray-400">-</span>' : Number(e).toLocaleString()), this.renderers.set("_currency", (e) => e == null ? '<span class="text-gray-400">-</span>' : new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD"
    }).format(Number(e))), this.renderers.set("_percentage", (e) => e == null ? '<span class="text-gray-400">-</span>' : `${Number(e).toFixed(2)}%`), this.renderers.set("_filesize", (e) => {
      if (!e) return '<span class="text-gray-400">-</span>';
      const t = Number(e), r = [
        "Bytes",
        "KB",
        "MB",
        "GB",
        "TB"
      ];
      if (t === 0) return "0 Bytes";
      const n = Math.floor(Math.log(t) / Math.log(1024));
      return `${(t / Math.pow(1024, n)).toFixed(2)} ${r[n]}`;
    }), this.renderers.set("_truncate", (e) => {
      if (!e) return '<span class="text-gray-400">-</span>';
      const t = String(e), r = 50;
      return t.length <= r ? t : `<span title="${t}">${t.substring(0, r)}...</span>`;
    }), this.renderers.set("_array", (e, t, r, n) => {
      if (!Array.isArray(e) || e.length === 0) return E;
      const a = te(e, n?.options || {});
      return a ? v(a) : E;
    }), this.renderers.set("_object", (e, t, r, n) => {
      if (e == null) return E;
      const a = ee(e, n?.options || {});
      return a ? v(a) : E;
    }), this.renderers.set("_tags", (e) => !Array.isArray(e) || e.length === 0 ? '<span class="text-gray-400">-</span>' : e.map((t) => `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 mr-1">${t}</span>`).join("")), this.renderers.set("blocks_chips", (e, t, r, n) => {
      if (!Array.isArray(e) || e.length === 0) return E;
      const a = n?.options || {}, o = Rt(a, "max_visible", "maxVisible", 3), s = _t(a, "show_count", "showCount", !0), i = Pt(a, "chip_variant", "chipVariant", "default"), c = a.block_icons_map || a.blockIconsMap || {}, l = [], u = e.slice(0, o);
      for (const p of u) {
        const C = Mt(p);
        if (!C) continue;
        const g = c[C] || "view-grid", k = je(g, {
          size: "14px",
          extraClass: "flex-shrink-0"
        }), R = Lt(i);
        l.push(`<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${R}">${k}<span>${v(C)}</span></span>`);
      }
      if (l.length === 0) return E;
      const d = e.length - o;
      let f = "";
      return s && d > 0 && (f = `<span class="px-2 py-0.5 rounded text-xs bg-gray-200 text-gray-600">+${d} more</span>`), `<div class="flex flex-wrap gap-1">${l.join("")}${f}</div>`;
    }), this.renderers.set("_image", (e) => e ? `<img src="${e}" alt="Thumbnail" class="h-10 w-10 rounded object-cover" />` : '<span class="text-gray-400">-</span>'), this.renderers.set("_avatar", (e, t) => {
      const r = t.name || t.username || t.email || "U", n = r.charAt(0).toUpperCase();
      return e ? `<img src="${e}" alt="${r}" class="h-8 w-8 rounded-full object-cover" />` : `<div class="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium text-sm">${n}</div>`;
    });
  }
}, ba = {
  statusBadge: (e) => (t) => {
    const r = String(t).toLowerCase();
    return Z(String(t), "status", r);
  },
  roleBadge: (e) => (t) => {
    const r = String(t).toLowerCase();
    return Z(String(t), "role", r);
  },
  userInfo: (e, t) => {
    const r = e || t.name || t.username || "-", n = t.email || "";
    return n ? `<div><div class="font-medium text-gray-900">${r}</div><div class="text-sm text-gray-500">${n}</div></div>` : `<div class="font-medium text-gray-900">${r}</div>`;
  },
  booleanChip: (e) => (t) => Xe(!!t, e),
  relativeTime: (e) => {
    if (!e) return '<span class="text-gray-400">-</span>';
    const t = z(e);
    if (!t) return String(e);
    const r = (/* @__PURE__ */ new Date()).getTime() - t.getTime(), n = Math.floor(r / 6e4), a = Math.floor(r / 36e5), o = Math.floor(r / 864e5);
    return n < 1 ? "Just now" : n < 60 ? `${n} minute${n > 1 ? "s" : ""} ago` : a < 24 ? `${a} hour${a > 1 ? "s" : ""} ago` : o < 30 ? `${o} day${o > 1 ? "s" : ""} ago` : t.toLocaleDateString();
  },
  localeBadge: rt(),
  translationStatus: fe(),
  translationStatusCompact: fe({
    size: "sm",
    maxLocales: 2
  })
}, $t = "datagrid.state.", W = "datagrid.share.", ke = "datagrid.share.index", Tt = 20, Gt = 1500;
function Bt(e) {
  return String(e || "").trim() || "default";
}
function X(e, t = {}) {
  if (!Array.isArray(e)) return;
  const r = e.map((n) => typeof n == "string" ? n.trim() : "").filter((n) => n.length > 0);
  return r.length === 0 ? t.allowEmpty === !0 ? [] : void 0 : Array.from(new Set(r));
}
function G(e) {
  if (!e || typeof e != "object" || Array.isArray(e)) return null;
  const t = e, r = { version: 1 };
  (t.viewMode === "flat" || t.viewMode === "grouped" || t.viewMode === "matrix") && (r.viewMode = t.viewMode), (t.expandMode === "all" || t.expandMode === "none" || t.expandMode === "explicit") && (r.expandMode = t.expandMode);
  const n = X(t.expandedGroups, { allowEmpty: !0 });
  n !== void 0 && (r.expandedGroups = n);
  const a = X(t.hiddenColumns, { allowEmpty: !0 });
  a !== void 0 && (r.hiddenColumns = a);
  const o = X(t.columnOrder);
  return o && (r.columnOrder = o), typeof t.updatedAt == "number" && Number.isFinite(t.updatedAt) && (r.updatedAt = t.updatedAt), r;
}
function me(e) {
  if (!e || typeof e != "object" || Array.isArray(e)) return null;
  const t = e, r = { version: 1 };
  if (typeof t.search == "string") {
    const a = t.search.trim();
    a && (r.search = a);
  }
  typeof t.page == "number" && Number.isFinite(t.page) && (r.page = Math.max(1, Math.trunc(t.page))), typeof t.perPage == "number" && Number.isFinite(t.perPage) && (r.perPage = Math.max(1, Math.trunc(t.perPage))), Array.isArray(t.filters) && (r.filters = t.filters), Array.isArray(t.sort) && (r.sort = t.sort);
  const n = G(t.persisted);
  return n && (r.persisted = n), typeof t.updatedAt == "number" && Number.isFinite(t.updatedAt) && (r.updatedAt = t.updatedAt), r;
}
function Re(e) {
  const t = String(e || "").trim();
  return t ? t.replace(/\/+$/, "") : "";
}
function Ot(e) {
  return String(e || "").trim().replace(/[^a-zA-Z0-9._-]/g, "");
}
function It() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`.slice(0, 16);
}
function qt(e) {
  try {
    const t = localStorage.getItem(ke);
    if (!t) return [];
    const r = JSON.parse(t);
    if (!Array.isArray(r)) return [];
    const n = r.map((a) => {
      if (!a || typeof a != "object" || Array.isArray(a)) return null;
      const o = a, s = typeof o.token == "string" ? o.token.trim() : "", i = typeof o.updatedAt == "number" ? o.updatedAt : 0;
      return !s || !Number.isFinite(i) ? null : {
        token: s,
        updatedAt: i
      };
    }).filter((a) => a !== null).sort((a, o) => o.updatedAt - a.updatedAt);
    return n.length <= e ? n : n.slice(0, e);
  } catch {
    return [];
  }
}
function Nt(e) {
  try {
    localStorage.setItem(ke, JSON.stringify(e));
  } catch {
  }
}
var _e = class {
  constructor(e) {
    const t = Bt(e.key);
    this.key = t, this.persistedStorageKey = `${$t}${t}`, this.maxShareEntries = Math.max(1, e.maxShareEntries || Tt);
  }
  loadPersistedState() {
    try {
      const e = localStorage.getItem(this.persistedStorageKey);
      return e ? G(JSON.parse(e)) : null;
    } catch {
      return null;
    }
  }
  savePersistedState(e) {
    const t = G(e);
    if (t) {
      t.updatedAt || (t.updatedAt = Date.now());
      try {
        localStorage.setItem(this.persistedStorageKey, JSON.stringify(t));
      } catch {
      }
    }
  }
  clearPersistedState() {
    try {
      localStorage.removeItem(this.persistedStorageKey);
    } catch {
    }
  }
  createShareState(e) {
    const t = me(e);
    if (!t) return null;
    t.updatedAt || (t.updatedAt = Date.now());
    const r = It(), n = `${W}${r}`;
    try {
      localStorage.setItem(n, JSON.stringify(t));
      const a = qt(this.maxShareEntries).filter((o) => o.token !== r);
      for (a.unshift({
        token: r,
        updatedAt: t.updatedAt
      }); a.length > this.maxShareEntries; ) {
        const o = a.pop();
        o && localStorage.removeItem(`${W}${o.token}`);
      }
      return Nt(a), r;
    } catch {
      return null;
    }
  }
  resolveShareState(e) {
    const t = String(e || "").trim();
    if (!t) return null;
    try {
      const r = localStorage.getItem(`${W}${t}`);
      return r ? me(JSON.parse(r)) : null;
    } catch {
      return null;
    }
  }
}, Ft = class extends _e {
  constructor(e) {
    if (super(e), this.syncTimeout = null, this.mutationQueue = Promise.resolve(), this.preferencesEndpoint = Re(e.preferencesEndpoint), !this.preferencesEndpoint) throw new Error("PreferencesDataGridStateStore requires an advertised preferences endpoint");
    this.resource = Ot(e.resource) || this.key, this.syncDebounceMs = Math.max(100, e.syncDebounceMs || 1e3), this.hydrateTimeoutMs = Math.max(100, e.hydrateTimeoutMs || Gt), this.preferencesWritable = e.preferencesWritable !== !1;
  }
  get serverStateKey() {
    return `ui.datagrid.${this.resource}.state`;
  }
  async hydrate() {
    const e = typeof AbortController < "u" ? new AbortController() : null, t = setTimeout(() => {
      e?.abort();
    }, this.hydrateTimeoutMs);
    try {
      const r = this.buildKeysQueryURL(this.serverStateKey), n = await fetch(r, {
        method: "GET",
        credentials: "same-origin",
        signal: e?.signal,
        headers: { Accept: "application/json" }
      });
      if (!n.ok) return;
      const a = await n.json(), o = this.extractFirstRecord(a);
      if (!o) return;
      const s = this.extractMap(o.effective), i = this.extractMap(o.raw), c = G(s[this.serverStateKey] ?? i[this.serverStateKey]);
      c && super.savePersistedState(c);
    } catch {
    } finally {
      clearTimeout(t);
    }
  }
  savePersistedState(e) {
    super.savePersistedState(e);
    const t = G(e);
    t && this.scheduleServerSync(t);
  }
  clearPersistedState() {
    super.clearPersistedState(), this.scheduleServerClear();
  }
  scheduleServerSync(e) {
    this.preferencesWritable && (this.syncTimeout && clearTimeout(this.syncTimeout), this.syncTimeout = setTimeout(() => {
      this.syncTimeout = null, this.enqueueServerMutation(() => this.syncToServer(e));
    }, this.syncDebounceMs));
  }
  scheduleServerClear() {
    this.preferencesWritable && (this.syncTimeout && clearTimeout(this.syncTimeout), this.syncTimeout = setTimeout(() => {
      this.syncTimeout = null, this.enqueueServerMutation(() => this.clearServerState());
    }, this.syncDebounceMs));
  }
  enqueueServerMutation(e) {
    this.mutationQueue = this.mutationQueue.then(e, e);
  }
  async syncToServer(e) {
    try {
      await A(this.preferencesEndpoint, {
        method: "POST",
        credentials: "same-origin",
        json: { raw: { [this.serverStateKey]: e } }
      });
    } catch {
    }
  }
  async clearServerState() {
    try {
      await A(this.preferencesEndpoint, {
        method: "POST",
        credentials: "same-origin",
        json: { clear_raw_keys: [this.serverStateKey] }
      });
    } catch {
    }
  }
  buildKeysQueryURL(e) {
    const t = this.preferencesEndpoint.includes("?") ? "&" : "?";
    return `${this.preferencesEndpoint}${t}keys=${encodeURIComponent(e)}`;
  }
  extractFirstRecord(e) {
    if (!e || typeof e != "object" || Array.isArray(e)) return null;
    const t = e, r = Array.isArray(t.records) ? t.records : Array.isArray(t.data) ? t.data : [];
    if (r.length === 0) return null;
    const n = r[0];
    return !n || typeof n != "object" || Array.isArray(n) ? null : n;
  }
  extractMap(e) {
    return !e || typeof e != "object" || Array.isArray(e) ? {} : e;
  }
};
function jt(e) {
  return (e.mode || "local") === "preferences" && Re(e.preferencesEndpoint) ? new Ft(e) : new _e(e);
}
var B = "search", O = "page", I = "per_page", q = "filters", N = "sort", H = "state", Ut = "advanced_search", K = "hidden_columns", Q = "view_mode", ie = "expanded_groups", zt = [
  "perPage",
  "hiddenColumns",
  "advancedSearch"
], le = [
  B,
  O,
  I,
  q,
  N,
  H,
  K,
  Q,
  ie
], Vt = [...le, Ut], Ht = 1800, V = x("DataGrid");
function Kt(e) {
  return {
    maxURLLength: Math.max(256, e.config.urlState?.maxURLLength || 1800),
    maxFiltersLength: Math.max(64, e.config.urlState?.maxFiltersLength || 600),
    enableStateToken: e.config.urlState?.enableStateToken !== !1
  };
}
function Qt(e, t, r) {
  const n = String(t || "").trim();
  if (!n) return null;
  try {
    const a = JSON.parse(n);
    return Array.isArray(a) ? a : (V.warn(`[DataGrid] Invalid ${r} payload in URL (expected array)`), null);
  } catch (a) {
    return V.warn(`[DataGrid] Failed to parse ${r} payload from URL:`, a), null;
  }
}
function be(e, t) {
  return Array.from(new Set(Array.from(e).map((r) => String(r || "").trim()).filter((r) => r.length > 0 && t.has(r)))).sort();
}
function Jt(e, t) {
  return e.length !== t.length ? !1 : e.every((r, n) => r === t[n]);
}
function Yt(e) {
  const t = new Set(e.config.columns.map((n) => n.field)), r = be(e.state.hiddenColumns || [], t);
  return Jt(r, be(e.config.columns.filter((n) => n.hidden).map((n) => n.field), t)) ? null : JSON.stringify(r);
}
function Wt(e, t, r = {}) {
  const n = r.merge === !0, a = new Set(e.config.columns.map((i) => i.field)), o = Array.isArray(t.hiddenColumns) ? new Set(t.hiddenColumns.map((i) => String(i || "").trim()).filter((i) => i.length > 0 && a.has(i))) : null;
  o ? (e.state.hiddenColumns = o, e.hasPersistedHiddenColumnState = !0) : n || (e.state.hiddenColumns = new Set(e.config.columns.filter((i) => i.hidden).map((i) => i.field)), e.hasPersistedHiddenColumnState = !1);
  const s = Array.isArray(t.columnOrder) ? t.columnOrder.map((i) => String(i || "").trim()).filter((i) => i.length > 0 && a.has(i)) : null;
  if (s && s.length > 0) {
    const i = e.mergeColumnOrder(s);
    e.state.columnOrder = i, e.hasPersistedColumnOrderState = !0, e.didRestoreColumnOrder = !0, e.shouldReorderDOMOnRestore = e.defaultColumns.map((l) => l.field).join("|") !== i.join("|");
    const c = new Map(e.config.columns.map((l) => [l.field, l]));
    e.config.columns = i.map((l) => c.get(l)).filter((l) => l !== void 0);
  } else n || (e.state.columnOrder = e.config.columns.map((i) => i.field), e.hasPersistedColumnOrderState = !1, e.didRestoreColumnOrder = !1, e.shouldReorderDOMOnRestore = !1);
  if (e.config.enableGroupedMode) {
    if (t.viewMode) {
      const i = xe(t.viewMode);
      i && (e.state.viewMode = se(i));
    }
    e.state.expandMode = oe(t.expandMode, e.state.expandMode), Array.isArray(t.expandedGroups) ? (e.state.expandedGroups = new Set(t.expandedGroups.map((i) => String(i || "").trim()).filter(Boolean)), e.state.hasPersistedExpandState = !0) : t.expandMode !== void 0 && (e.state.hasPersistedExpandState = !0);
  }
}
function Xt(e, t) {
  t.persisted && e.applyPersistedStateSnapshot(t.persisted, { merge: !0 }), typeof t.search == "string" && (e.state.search = t.search), typeof t.page == "number" && Number.isFinite(t.page) && (e.state.currentPage = Math.max(1, Math.trunc(t.page))), typeof t.perPage == "number" && Number.isFinite(t.perPage) && (e.state.perPage = Math.max(1, Math.trunc(t.perPage))), Array.isArray(t.filters) && (e.state.filters = t.filters), Array.isArray(t.sort) && (e.state.sort = t.sort);
}
function Zt(e) {
  const t = {
    version: 1,
    hiddenColumns: Array.from(e.state.hiddenColumns),
    columnOrder: [...e.state.columnOrder],
    updatedAt: Date.now()
  };
  return e.config.enableGroupedMode && (t.viewMode = e.state.viewMode, t.expandMode = e.state.expandMode, t.expandedGroups = Array.from(e.state.expandedGroups)), t;
}
function er(e) {
  return {
    version: 1,
    search: e.state.search || void 0,
    page: e.state.currentPage > 1 ? e.state.currentPage : void 0,
    perPage: e.state.perPage !== (e.config.perPage || 10) ? e.state.perPage : void 0,
    filters: e.state.filters.length > 0 ? [...e.state.filters] : void 0,
    sort: e.state.sort.length > 0 ? [...e.state.sort] : void 0,
    persisted: e.buildPersistedStateSnapshot(),
    updatedAt: Date.now()
  };
}
function tr(e) {
  e.stateStore.savePersistedState(e.buildPersistedStateSnapshot());
}
function rr(e) {
  const t = new URLSearchParams(window.location.search);
  e.didRestoreColumnOrder = !1, e.shouldReorderDOMOnRestore = !1, e.hasURLStateOverrides = Vt.some((l) => t.has(l));
  const r = t.get(H);
  if (r) {
    const l = e.stateStore.resolveShareState(r);
    l && e.applyShareStateSnapshot(l);
  }
  const n = t.get(B);
  if (n) {
    e.state.search = n;
    const l = document.querySelector(e.selectors.searchInput);
    l && (l.value = n);
  }
  const a = t.get(O);
  if (a) {
    const l = parseInt(a, 10);
    e.state.currentPage = Number.isNaN(l) ? 1 : Math.max(1, l);
  }
  const o = t.get(I);
  if (o) {
    const l = parseInt(o, 10), u = e.config.perPage || 10;
    e.state.perPage = Number.isNaN(l) ? u : Math.max(1, l);
    const d = document.querySelector(e.selectors.perPageSelect);
    d && (d.value = String(e.state.perPage));
  }
  const s = t.get(q);
  if (s) {
    const l = e.parseJSONArray(s, "filters");
    l && (e.state.filters = l);
  }
  const i = t.get(N);
  if (i) {
    const l = e.parseJSONArray(i, "sort");
    l && (e.state.sort = l);
  }
  if (e.config.enableGroupedMode) {
    const l = xe(t.get(Q));
    l && (e.state.viewMode = se(l)), t.has("expanded_groups") && (e.state.expandedGroups = ht(t.get(ie)), e.state.expandMode = "explicit", e.state.hasPersistedExpandState = !0);
  }
  const c = t.get(K);
  if (c) {
    const l = e.parseJSONArray(c, "hidden columns");
    if (l) {
      const u = new Set(e.config.columns.map((d) => d.field));
      e.state.hiddenColumns = new Set(l.map((d) => typeof d == "string" ? d.trim() : "").filter((d) => d.length > 0 && u.has(d)));
    }
  } else if (!e.hasPersistedHiddenColumnState && e.config.behaviors?.columnVisibility) {
    const l = e.config.columns.map((d) => d.field), u = e.config.behaviors.columnVisibility.loadHiddenColumnsFromCache(l);
    u.size > 0 && (e.state.hiddenColumns = u);
  }
  if (!e.hasPersistedColumnOrderState && e.config.behaviors?.columnVisibility?.loadColumnOrderFromCache) {
    const l = e.config.columns.map((d) => d.field), u = e.config.behaviors.columnVisibility.loadColumnOrderFromCache(l);
    if (u && u.length > 0) {
      const d = e.mergeColumnOrder(u);
      e.state.columnOrder = d, e.didRestoreColumnOrder = !0, e.shouldReorderDOMOnRestore = e.defaultColumns.map((p) => p.field).join("|") !== d.join("|");
      const f = new Map(e.config.columns.map((p) => [p.field, p]));
      e.config.columns = d.map((p) => f.get(p)).filter((p) => p !== void 0);
    }
  }
  e.persistStateSnapshot(), V.debug("[DataGrid] State restored from URL:", e.state), setTimeout(() => {
    e.applyRestoredState();
  }, 0);
}
function nr(e) {
  const t = document.querySelector(e.selectors.searchInput);
  t && (t.value = e.state.search);
  const r = document.querySelector(e.selectors.perPageSelect);
  r && (r.value = String(e.state.perPage)), e.state.filters.length > 0 && e.state.filters.forEach((a) => {
    const o = document.querySelector(`[data-filter-column="${a.column}"]`);
    o && (o.value = String(a.value));
  }), e.didRestoreColumnOrder && e.shouldReorderDOMOnRestore && e.reorderTableColumns(e.state.columnOrder);
  const n = e.config.columns.filter((a) => !e.state.hiddenColumns.has(a.field)).map((a) => a.field);
  e.updateColumnVisibility(n, !0), e.state.sort.length > 0 && e.updateSortIndicators();
}
function ar(e, t = {}) {
  e.persistStateSnapshot();
  const r = e.getURLStateConfig(), n = new URLSearchParams(window.location.search);
  he(n, le), he(n, zt), e.state.search && n.set(B, e.state.search), e.state.currentPage > 1 && n.set(O, String(e.state.currentPage)), e.state.perPage !== (e.config.perPage || 10) && n.set(I, String(e.state.perPage));
  let a = !1;
  if (e.state.filters.length > 0) {
    const c = JSON.stringify(e.state.filters);
    c.length <= r.maxFiltersLength ? n.set(q, c) : a = !0;
  }
  e.state.sort.length > 0 && n.set(N, JSON.stringify(e.state.sort));
  const o = Yt(e);
  o !== null && n.set(K, o), e.config.enableGroupedMode && n.set(Q, e.state.viewMode);
  let s = pe(window.location.pathname, n);
  const i = s.length > r.maxURLLength;
  if (r.enableStateToken && (a || i)) {
    n.delete(B), n.delete(O), n.delete(I), n.delete(q), n.delete(N);
    const c = e.stateStore.createShareState(e.buildShareStateSnapshot());
    c && n.set(H, c), s = pe(window.location.pathname, n);
  }
  t.replace ? window.history.replaceState({}, "", s) : window.history.pushState({}, "", s), V.debug("[DataGrid] URL updated:", s);
}
var w = x("DataGrid");
async function or(e, t) {
  w.debug("[DataGrid] ===== refresh() CALLED ====="), w.debug("[DataGrid] Current sort state:", JSON.stringify(e.state.sort)), e.abortController && e.abortController.abort(), e.abortController = new AbortController(), e.setRenderState("loading"), e.renderLoadingState();
  try {
    const r = e.buildApiUrl(), n = await A(r, {
      signal: e.abortController.signal,
      method: "GET",
      accept: "application/json"
    });
    if (!n.ok) {
      if (e.handleGroupedModeStatusFallback(n.status)) return;
      throw new Error(`HTTP error! status: ${n.status}`);
    }
    const a = await n.json(), o = tt(a) || a;
    if (typeof t == "number" && typeof e.isCurrentRefresh == "function" && !e.isCurrentRefresh(t)) {
      w.debug("[DataGrid] Ignoring stale refresh response");
      return;
    }
    w.debug("[DataGrid] API Response:", o), w.debug("[DataGrid] API Response data array:", o.data), w.debug("[DataGrid] API Response total:", o.total, "count:", o.count, "$meta:", o.$meta);
    const s = o.data || o.records || [];
    if (e.handleGroupedModePayloadFallback(s)) return;
    e.lastSchema = o.schema || null, e.lastForm = o.form || null, e.setBulkActionState(o.$meta?.bulk_action_state || null, o.schema?.bulk_action_state_config || null);
    const i = e.getResponseTotal(o);
    if (e.normalizePagination(i)) {
      if (typeof e.requestRefreshAfterCurrent == "function") {
        e.requestRefreshAfterCurrent();
        return;
      }
      return e.refresh();
    }
    w.debug("[DataGrid] About to call renderData()..."), e.renderData(o), w.debug("[DataGrid] renderData() completed"), e.updatePaginationUI(o), e.updateBulkActionsBar(), w.debug("[DataGrid] ===== refresh() COMPLETED =====");
  } catch (r) {
    if (r instanceof Error && r.name === "AbortError") {
      w.debug("[DataGrid] Request aborted");
      return;
    }
    w.error("[DataGrid] Error fetching data:", r);
    const n = "Failed to load data";
    e.renderErrorState(n), e.setRenderState("error"), e.showError(n);
  }
}
function sr(e) {
  const t = new URLSearchParams(), r = e.buildQueryParams();
  Object.entries(r).forEach(([a, o]) => {
    o != null && t.append(a, String(o));
  });
  const n = `${e.config.apiEndpoint}?${t.toString()}`;
  return w.debug(`[DataGrid] API URL: ${n}`), n;
}
function ir(e) {
  const t = new URLSearchParams(), r = e.buildQueryParams();
  return Object.entries(r).forEach(([n, a]) => {
    a != null && t.append(n, String(a));
  }), t.toString();
}
function lr(e) {
  const t = {};
  if (e.config.behaviors?.pagination) {
    const r = e.config.behaviors.pagination.buildQuery(e.state.currentPage, e.state.perPage);
    Object.assign(t, r);
  }
  if (e.state.search && e.config.behaviors?.search) {
    const r = e.config.behaviors.search.buildQuery(e.state.search);
    Object.assign(t, r);
  }
  if (e.state.filters.length > 0 && e.config.behaviors?.filter) {
    const r = e.config.behaviors.filter.buildFilters(e.state.filters);
    Object.assign(t, r);
  }
  if (e.state.sort.length > 0 && e.config.behaviors?.sort) {
    const r = e.config.behaviors.sort.buildQuery(e.state.sort);
    Object.assign(t, r);
  }
  return e.isGroupedViewActive() && (t.group_by = e.config.groupByField || "family_id"), t;
}
function cr(e, t) {
  return t.total !== void 0 && t.total !== null ? t.total : t.$meta?.count !== void 0 && t.$meta?.count !== null ? t.$meta.count : t.count !== void 0 && t.count !== null ? t.count : null;
}
function ur(e, t) {
  if (t === null) return !1;
  const r = Math.max(1, e.state.perPage || e.config.perPage || 10), n = Math.max(1, Math.ceil(t / r));
  let a = e.state.currentPage;
  t === 0 ? a = 1 : a > n ? a = n : a < 1 && (a = 1);
  const o = r !== e.state.perPage || a !== e.state.currentPage;
  return o && (e.state.perPage = r, e.state.currentPage = a, e.pushStateToURL()), t === 0 ? !1 : o;
}
async function dr(e, t) {
  const r = await A(`${e.config.apiEndpoint}/${t}`, {
    method: "GET",
    accept: "application/json"
  });
  if (!r.ok) throw new Error(`Detail request failed: ${r.status}`);
  const n = await r.json(), a = e.normalizeDetailResponse(n);
  return a.schema && (e.lastSchema = a.schema), a.form && (e.lastForm = a.form), {
    ...a,
    tabs: a.schema?.tabs || []
  };
}
function fr(e, t) {
  const r = et(t) || t;
  if (r && typeof r == "object" && "data" in r) {
    const n = r;
    return {
      data: n.data,
      schema: n.schema,
      form: n.form
    };
  }
  return { data: t };
}
function pr(e) {
  return e.lastSchema;
}
function hr(e) {
  return e.lastForm;
}
function mr(e) {
  return e.lastSchema?.tabs || [];
}
function ce(e) {
  return typeof e.config.rowActions == "function" || e.config.useDefaultActions !== !1;
}
function F(e) {
  return (ce(e) ? 1 : 0) + (e.isCapabilityEnabled("selection") ? 1 : 0);
}
function Pe(e) {
  return Math.max(1, (e.config.columns?.length || 0) + F(e));
}
var Me = x("DataGrid");
function br(e, t, r, n) {
  const a = e.config.groupByField || "family_id", o = r.filter((l) => !!l && typeof l == "object" && !Array.isArray(l));
  let s = dt(o, {
    groupByField: a,
    defaultExpanded: !e.state.hasPersistedExpandState,
    expandMode: e.state.expandMode,
    expandedGroups: e.state.expandedGroups
  });
  s || (s = at(o, {
    groupByField: a,
    defaultExpanded: !e.state.hasPersistedExpandState,
    expandMode: e.state.expandMode,
    expandedGroups: e.state.expandedGroups
  }));
  const i = st(t);
  i.size > 0 && (s = pt(s, i)), e.state.groupedData = s;
  const c = e.config.columns.length;
  for (const l of s.groups) {
    const u = it(l, c, { fixedColumnCount: F(e) });
    n.insertAdjacentHTML("beforeend", u);
    const d = n.lastElementChild;
    d && (d.addEventListener("click", () => e.toggleGroup(l.groupId)), d.addEventListener("keydown", (f) => {
      (f.key === "Enter" || f.key === " ") && (f.preventDefault(), e.toggleGroup(l.groupId));
    }));
    for (const f of l.records) {
      f.id && (e.recordsById[f.id] = f);
      const p = e.createTableRow(f);
      p.dataset.groupId = l.groupId, p.classList.add("group-child-row"), l.expanded || (p.style.display = "none"), n.appendChild(p);
    }
  }
  for (const l of s.ungrouped) {
    l.id && (e.recordsById[l.id] = l);
    const u = e.createTableRow(l);
    n.appendChild(u);
  }
  Me.debug(`[DataGrid] Rendered ${s.groups.length} groups, ${s.ungrouped.length} ungrouped`);
}
function yr(e) {
  return e.config.enableGroupedMode ? e.state.viewMode === "grouped" || e.state.viewMode === "matrix" : !1;
}
function Sr(e, t) {
  e.isGroupedViewActive() && (e.state.viewMode = "flat", e.state.groupedData = null, e.pushStateToURL({ replace: !0 }), e.notify(t, "warning"), e.refresh());
}
function gr(e, t) {
  return !e.isGroupedViewActive() || ![
    400,
    404,
    405,
    422
  ].includes(t) ? !1 : (e.fallbackGroupedMode("Grouped pagination is not supported by this panel. Switched to flat view."), !0);
}
function wr(e, t) {
  if (!e.isGroupedViewActive() || t.length === 0) return !1;
  const r = t.filter((n) => !!n && typeof n == "object" && !Array.isArray(n));
  return r.length !== t.length || !ct(r) ? (e.fallbackGroupedMode("Grouped pagination contract is unavailable. Switched to flat view to avoid split groups."), !0) : !1;
}
function vr(e, t) {
  if (!e.state.groupedData) return;
  const r = String(t || "").trim();
  if (!r) return;
  const n = e.isGroupExpandedByState(r, !e.state.hasPersistedExpandState);
  e.state.expandMode === "all" ? n ? e.state.expandedGroups.add(r) : e.state.expandedGroups.delete(r) : e.state.expandMode === "none" ? n ? e.state.expandedGroups.delete(r) : e.state.expandedGroups.add(r) : (!e.state.hasPersistedExpandState && e.state.expandedGroups.size === 0 && (e.state.expandedGroups = new Set(e.state.groupedData.groups.map((o) => o.groupId))), e.state.expandedGroups.has(r) ? e.state.expandedGroups.delete(r) : e.state.expandedGroups.add(r)), e.state.hasPersistedExpandState = !0;
  const a = e.state.groupedData.groups.find((o) => o.groupId === r);
  a && (a.expanded = e.isGroupExpandedByState(r)), e.updateGroupVisibility(r), e.pushStateToURL({ replace: !0 });
}
function Ar(e, t) {
  if (!e.config.enableGroupedMode) return;
  const r = new Set((t || []).map((n) => String(n || "").trim()).filter(Boolean));
  e.state.expandMode = "explicit", e.state.expandedGroups = r, e.state.hasPersistedExpandState = !0, e.updateGroupedRowsFromState(), e.pushStateToURL({ replace: !0 }), !e.state.groupedData && e.isGroupedViewActive() && e.refresh();
}
function Cr(e) {
  e.config.enableGroupedMode && (e.state.expandMode = "all", e.state.expandedGroups.clear(), e.state.hasPersistedExpandState = !0, e.updateGroupedRowsFromState(), e.pushStateToURL({ replace: !0 }), !e.state.groupedData && e.isGroupedViewActive() && e.refresh());
}
function Er(e) {
  e.config.enableGroupedMode && (e.state.expandMode = "none", e.state.expandedGroups.clear(), e.state.hasPersistedExpandState = !0, e.updateGroupedRowsFromState(), e.pushStateToURL({ replace: !0 }), !e.state.groupedData && e.isGroupedViewActive() && e.refresh());
}
function xr(e, t) {
  const r = e.tableEl?.querySelector("tbody");
  if (!r) return;
  const n = r.querySelector(`tr[data-group-id="${t}"]`);
  if (!n) return;
  const a = e.isGroupExpandedByState(t);
  n.dataset.expanded = String(a), n.setAttribute("aria-expanded", String(a));
  const o = n.querySelector(".expand-icon");
  o && (o.textContent = a ? "▼" : "▶"), r.querySelectorAll(`tr.group-child-row[data-group-id="${t}"]`).forEach((s) => {
    s.style.display = a ? "" : "none";
  });
}
function kr(e) {
  if (e.state.groupedData)
    for (const t of e.state.groupedData.groups)
      t.expanded = e.isGroupExpandedByState(t.groupId), e.updateGroupVisibility(t.groupId);
}
function Rr(e, t, r = !1) {
  const n = oe(e.state.expandMode, "explicit");
  return n === "all" ? !e.state.expandedGroups.has(t) : n === "none" ? e.state.expandedGroups.has(t) : e.state.expandedGroups.size === 0 ? r : e.state.expandedGroups.has(t);
}
function _r(e, t) {
  if (!e.config.enableGroupedMode) {
    Me.warn("[DataGrid] Grouped mode not enabled");
    return;
  }
  const r = se(t);
  e.state.viewMode = r, r === "flat" && (e.state.groupedData = null), e.pushStateToURL(), e.refresh();
}
function Pr(e) {
  return e.state.viewMode;
}
function Mr(e) {
  return e.state.groupedData;
}
var Lr = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
  <g transform="translate(2.16665 6.83333)">
    <path d="M7 1.16667C7 1.811 6.47767 2.33333 5.83333 2.33333C5.189 2.33333 4.66667 1.811 4.66667 1.16667C4.66667 0.522334 5.189 0 5.83333 0C6.47767 0 7 0.522334 7 1.16667Z" fill="currentColor"/>
    <path d="M11.6667 1.16667C11.6667 1.811 11.1443 2.33333 10.5 2.33333C9.85567 2.33333 9.33333 1.811 9.33333 1.16667C9.33333 0.522334 9.85567 0 10.5 0C11.1443 0 11.6667 0.522334 11.6667 1.16667Z" fill="currentColor"/>
    <path d="M2.33333 1.16667C2.33333 1.811 1.811 2.33333 1.16667 2.33333C0.522334 2.33333 0 1.811 0 1.16667C0 0.522334 0.522334 0 1.16667 0C1.811 0 2.33333 0.522334 2.33333 1.16667Z" fill="currentColor"/>
  </g>
</svg>
`, M = x("DataGrid");
function Dr(e, t, r = !1) {
  if (!e.tableEl) return;
  const n = new Set(t);
  e.state.hiddenColumns.clear(), e.config.columns.forEach((a) => {
    n.has(a.field) || e.state.hiddenColumns.add(a.field);
  }), r || e.pushStateToURL(), e.tableEl.querySelectorAll("thead th[data-column]").forEach((a) => {
    const o = a.dataset.column;
    o && (a.style.display = n.has(o) ? "" : "none");
  }), e.tableEl.querySelectorAll("tbody td[data-column]").forEach((a) => {
    const o = a.dataset.column;
    o && (a.style.display = n.has(o) ? "" : "none");
  }), e.syncColumnVisibilityCheckboxes();
}
function $r(e) {
  if (e.columnManager) {
    e.columnManager.syncWithGridState();
    return;
  }
  const t = document.querySelector(e.selectors.columnToggleMenu);
  t && e.config.columns.forEach((r) => {
    const n = t.querySelector(`input[data-column="${r.field}"]`);
    n && (n.checked = !e.state.hiddenColumns.has(r.field));
  });
}
function Le(e) {
  e.querySelectorAll("[data-datagrid-state]").forEach((t) => t.remove());
}
function Tr(e) {
  !e.tableEl || ce(e) || e.tableEl.querySelectorAll('thead [data-role="actions"]').forEach((t) => t.remove());
}
function De(e, t, r) {
  const n = document.createElement("tr");
  n.className = "admin-datagrid__state-row", n.dataset.datagridState = t;
  const a = document.createElement("td");
  return a.colSpan = Pe(e), a.className = `admin-datagrid__state admin-datagrid__state--${t} px-6 py-8 text-center`, a.setAttribute("role", t === "error" ? "alert" : "status"), a.setAttribute("aria-live", t === "error" ? "assertive" : "polite"), a.textContent = r, n.appendChild(a), n;
}
function Gr(e) {
  const t = e.tableEl?.querySelector("tbody");
  if (t && (Le(t), !(t.children.length > 0))) {
    if (e.isGroupedViewActive()) {
      t.insertAdjacentHTML("beforeend", bt(e.config.columns.length, F(e)));
      return;
    }
    t.appendChild(De(e, "loading", "Loading…"));
  }
}
function Br(e, t) {
  const r = e.tableEl?.querySelector("tbody");
  if (r) {
    if (Le(r), e.isGroupedViewActive()) {
      r.insertAdjacentHTML("afterbegin", nt(e.config.columns.length, t, void 0, F(e)));
      return;
    }
    r.prepend(De(e, "error", t));
  }
}
function Or(e, t) {
  const r = e.tableEl?.querySelector("tbody");
  if (!r) {
    M.error("[DataGrid] tbody not found!");
    return;
  }
  e.actionMenuController?.closeAll(), r.innerHTML = "";
  const n = t.data || t.records || [];
  M.debug(`[DataGrid] renderData() called with ${n.length} items`), M.debug("[DataGrid] First 3 items:", n.slice(0, 3));
  const a = e.getResponseTotal(t);
  if (e.state.totalRows = a ?? n.length, n.length === 0) {
    e.isGroupedViewActive() ? r.innerHTML = ot(e.config.columns.length, F(e)) : r.innerHTML = `
          <tr class="admin-datagrid__state-row" data-datagrid-state="empty">
            <td colspan="${Pe(e)}" class="admin-datagrid__state admin-datagrid__state--empty px-6 py-8 text-center text-gray-500">
              No results found
            </td>
          </tr>
        `, e.setRenderState("empty");
    return;
  }
  e.recordsById = /* @__PURE__ */ Object.create(null), e.isGroupedViewActive() ? e.renderGroupedData(t, n, r) : e.renderFlatData(n, r), e.state.hiddenColumns.size > 0 && r.querySelectorAll("td[data-column]").forEach((o) => {
    const s = o.dataset.column;
    s && e.state.hiddenColumns.has(s) && (o.style.display = "none");
  }), e.isCapabilityEnabled("selection") && e.updateSelectionBindings(), e.setRenderState("ready");
}
function Ir(e, t, r) {
  t.forEach((n, a) => {
    M.debug(`[DataGrid] Rendering row ${a + 1}: id=${n.id}`), n.id && (e.recordsById[n.id] = n);
    const o = e.createTableRow(n);
    r.appendChild(o);
  }), M.debug(`[DataGrid] Finished appending ${t.length} rows to tbody`), M.debug("[DataGrid] tbody.children.length =", r.children.length);
}
function qr(e, t) {
  const r = t.rendererOptions ?? t.renderer_options;
  return !r || typeof r != "object" || Array.isArray(r) ? {} : r;
}
function Nr(e, t) {
  const r = document.createElement("tr");
  let n = ["admin-datagrid__row", "hover:bg-gray-50"];
  if (e.config.rowClassProvider && (n = n.concat(e.config.rowClassProvider(t))), r.className = n.join(" "), e.isCapabilityEnabled("selection")) {
    const i = document.createElement("td");
    i.className = "admin-datagrid__cell px-6 py-4 whitespace-nowrap", i.dataset.role = "selection", i.dataset.fixed = "left", i.innerHTML = `
        <label class="flex">
          <input type="checkbox"
                 class="table-checkbox shrink-0 border-gray-300 rounded text-blue-600 focus:ring-blue-500"
                 data-id="${h(t.id)}">
          <span class="sr-only">Select</span>
        </label>
      `, r.appendChild(i);
  }
  if (e.config.columns.forEach((i) => {
    const c = document.createElement("td");
    c.className = "admin-datagrid__cell px-6 py-4 whitespace-nowrap text-sm text-gray-800", c.setAttribute("data-column", i.field);
    const l = t[i.field], u = typeof i.renderer == "string" ? i.renderer.trim() : "", d = { options: e.resolveRendererOptions(i) };
    if (i.render) c.innerHTML = i.render(l, t);
    else if (e.cellRendererRegistry.has(i.field)) c.innerHTML = e.cellRendererRegistry.get(i.field)(l, t, i.field, d);
    else if (u && e.cellRendererRegistry.has(u)) c.innerHTML = e.cellRendererRegistry.get(u)(l, t, i.field, d);
    else if (l == null) c.textContent = "-";
    else if (i.field.includes("_at")) {
      const f = z(l);
      c.textContent = f ? f.toLocaleDateString() : String(l);
    } else c.textContent = String(l);
    r.appendChild(c);
  }), !ce(e)) return r;
  const a = e.config.actionBasePath || e.config.apiEndpoint, o = document.createElement("td");
  o.className = "admin-datagrid__cell admin-datagrid__actions px-6 py-4 whitespace-nowrap text-end text-sm font-medium", o.dataset.role = "actions", o.dataset.fixed = "right";
  const s = (i) => {
    o.innerHTML = e.actionRenderer.renderRowActions(t, i), e.actionRenderer.attachRowActionListeners(o, i, t, { onError: async (c, l) => {
      if (U(c)?.textCode && await e.refresh(), !D(c)) {
        const u = c instanceof Error ? c.message : `Action "${l.label}" failed`;
        e.notify(u, "error");
      }
    } });
  };
  return e.config.rowActions ? s(e.config.rowActions(t)) : e.config.useDefaultActions !== !1 && s([
    {
      label: "View",
      icon: "eye",
      action: () => {
        window.location.href = `${a}/${t.id}`;
      },
      variant: "secondary"
    },
    {
      label: "Edit",
      icon: "edit",
      action: () => {
        window.location.href = `${a}/${t.id}/edit`;
      },
      variant: "primary"
    },
    {
      label: "Delete",
      icon: "trash",
      action: async () => {
        await e.handleDelete(t.id);
      },
      variant: "danger"
    }
  ]), r.appendChild(o), r;
}
function Fr(e, t) {
  return t.toLowerCase().replace(/[^a-z0-9]/g, "-");
}
async function jr(e, t) {
  try {
    await We({
      endpoint: `${e.config.apiEndpoint}/${t}`,
      confirmMessage: "Are you sure you want to delete this item?",
      confirmTitle: "Confirm Delete",
      onSuccess: async () => {
        await e.refresh();
      },
      onError: (r) => {
        e.showError(Ae(r, "Delete failed"));
      },
      reconcileOnDomainFailure: async () => {
        await e.refresh();
      },
      notifier: { confirm: async (r, n) => e.confirmAction(r, n) }
    });
  } catch (r) {
    M.error("Error deleting item:", r), D(r) || e.showError(r instanceof Error ? r.message : "Failed to delete item");
  }
}
function Ur(e, t) {
  const r = e.getResponseTotal(t) ?? e.state.totalRows, n = e.state.perPage * (e.state.currentPage - 1), a = r === 0 ? 0 : n + 1, o = Math.min(n + e.state.perPage, r), s = document.querySelector(e.selectors.tableInfoStart), i = document.querySelector(e.selectors.tableInfoEnd), c = document.querySelector(e.selectors.tableInfoTotal), l = e.selectors.tableInfoSummary ? document.querySelector(e.selectors.tableInfoSummary) : null;
  if (s && (s.textContent = L(e, a)), i && (i.textContent = L(e, o)), c && (c.textContent = L(e, r)), l) {
    const u = Kr(e, a, o, r);
    u !== null && (l.textContent = u);
  }
  e.renderPaginationButtons(r);
}
function zr(e, t) {
  const r = document.querySelector(e.selectors.paginationContainer);
  if (!r) return;
  const n = e.config.pagination?.mode === "semantic";
  (r.closest?.("[data-datagrid-pagination]") || r).classList?.toggle("admin-datagrid__pagination--presented", n);
  const a = Math.ceil(t / e.state.perPage);
  if (a <= 1) {
    r.innerHTML = "";
    return;
  }
  const o = e.state.currentPage;
  r.innerHTML = (n ? Vr(e, a, o) : Hr(a, o)).join(""), r.querySelectorAll("[data-page]").forEach((s) => {
    s.addEventListener("click", async () => {
      const i = parseInt(s.dataset.page || "1", 10);
      i >= 1 && i <= a && (e.state.currentPage = i, e.pushStateToURL(), e.config.behaviors?.pagination ? await e.config.behaviors.pagination.onPageChange(i, e) : await e.refresh());
    });
  });
}
function Vr(e, t, r) {
  const n = [], a = {
    previous: P(e.config.pagination?.labels?.previous, "Previous"),
    next: P(e.config.pagination?.labels?.next, "Next"),
    previousPage: P(e.config.pagination?.labels?.previousPage, "Previous page"),
    nextPage: P(e.config.pagination?.labels?.nextPage, "Next page"),
    page: P(e.config.pagination?.labels?.page, "Page {page}")
  };
  n.push(`
      <button type="button"
              data-page="${r - 1}"
              aria-label="${h(a.previousPage)}"
              ${r === 1 ? "disabled" : ""}
              class="admin-datagrid__page-button admin-datagrid__page-button--boundary">
        <span>${v(a.previous)}</span>
      </button>
    `);
  for (const o of $e(t, r)) {
    if (o === "ellipsis") {
      n.push(`<span class="admin-datagrid__page-ellipsis" aria-hidden="true">${Lr}</span>`);
      continue;
    }
    const s = o === r, i = L(e, o), c = a.page.includes("{page}") ? a.page.replace("{page}", i) : `${a.page} ${i}`;
    n.push(`
        <button type="button"
                data-page="${o}"
                aria-label="${h(c)}"
                ${s ? 'aria-current="page"' : ""}
                class="admin-datagrid__page-button admin-datagrid__page-button--page${s ? " admin-datagrid__page-button--active" : ""}">
          ${v(i)}
        </button>
      `);
  }
  return n.push(`
      <button type="button"
              data-page="${r + 1}"
              aria-label="${h(a.nextPage)}"
              ${r === t ? "disabled" : ""}
              class="admin-datagrid__page-button admin-datagrid__page-button--boundary">
        <span>${v(a.next)}</span>
      </button>
    `), n;
}
function Hr(e, t) {
  const r = [];
  r.push(`
    <button type="button"
            data-page="${t - 1}"
            aria-label="Previous page"
            ${t === 1 ? "disabled" : ""}
            class="admin-datagrid__page-button min-h-[38px] min-w-[38px] py-2 px-2.5 inline-flex justify-center items-center gap-x-1.5 text-sm rounded-lg text-gray-800 hover:bg-gray-100 focus:outline-none focus:bg-gray-100 disabled:opacity-50 disabled:pointer-events-none">
      <svg class="shrink-0 size-3.5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="m15 18-6-6 6-6"></path>
      </svg>
      <span>Previous</span>
    </button>
  `);
  for (const n of $e(e, t)) {
    if (n === "ellipsis") {
      r.push('<span class="admin-datagrid__page-ellipsis min-w-[24px] text-center text-gray-500" aria-hidden="true">…</span>');
      continue;
    }
    const a = n === t;
    r.push(`
      <button type="button"
              data-page="${n}"
              aria-label="Page ${n}"
              ${a ? 'aria-current="page"' : ""}
              class="min-h-[38px] min-w-[38px] flex justify-center items-center ${a ? "bg-gray-200 text-gray-800 focus:outline-none focus:bg-gray-300" : "text-gray-800 hover:bg-gray-100 focus:outline-none focus:bg-gray-100"} admin-datagrid__page-button py-2 px-3 text-sm rounded-lg">
        ${n}
      </button>
    `);
  }
  return r.push(`
    <button type="button"
            data-page="${t + 1}"
            aria-label="Next page"
            ${t === e ? "disabled" : ""}
            class="admin-datagrid__page-button min-h-[38px] min-w-[38px] py-2 px-2.5 inline-flex justify-center items-center gap-x-1.5 text-sm rounded-lg text-gray-800 hover:bg-gray-100 focus:outline-none focus:bg-gray-100 disabled:opacity-50 disabled:pointer-events-none">
      <span>Next</span>
      <svg class="shrink-0 size-3.5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="m9 18 6-6-6-6"></path>
      </svg>
    </button>
  `), r;
}
function P(e, t) {
  return typeof e == "string" && e.trim() ? e.trim() : t;
}
function Kr(e, t, r, n) {
  const a = e.config.pagination?.labels?.summary;
  if (!a || typeof a != "object") return null;
  let o = n === 1 ? "one" : "other";
  try {
    o = new Intl.PluralRules(e.config.pagination?.locale).select(n);
  } catch {
  }
  const s = P(a[o], P(a.other, ""));
  if (!s) return null;
  const i = {
    start: L(e, t),
    end: L(e, r),
    total: L(e, n)
  };
  return s.replace(/\{(start|end|total)\}/g, (c, l) => i[l]);
}
function L(e, t) {
  const r = e.config.pagination?.locale;
  if (!r) return String(t);
  try {
    return new Intl.NumberFormat(r).format(t);
  } catch {
    return String(t);
  }
}
function $e(e, t) {
  const r = Math.max(0, Math.floor(e)), n = Math.min(Math.max(1, Math.floor(t)), Math.max(r, 1));
  return r <= 7 ? Array.from({ length: r }, (a, o) => o + 1) : n <= 4 ? [
    1,
    2,
    3,
    4,
    5,
    "ellipsis",
    r
  ] : n >= r - 3 ? [
    1,
    "ellipsis",
    r - 4,
    r - 3,
    r - 2,
    r - 1,
    r
  ] : [
    1,
    "ellipsis",
    n - 1,
    n,
    n + 1,
    "ellipsis",
    r
  ];
}
var Qr = class {
  constructor(e) {
    this.sortable = null, this.searchInput = null, this.columnListEl = null, this.countBadgeEl = null, this.container = e.container, this.grid = e.grid, this.onReorder = e.onReorder, this.onToggle = e.onToggle, this.onReset = e.onReset, this.initialize();
  }
  initialize() {
    this.render(), this.setupDragAndDrop(), this.bindSwitchToggles(), this.setupScrollShadows();
  }
  render() {
    const e = this.grid.config.columns, t = this.grid.state.hiddenColumns;
    this.container.innerHTML = "";
    const r = this.createHeader(e.length, e.length - t.size);
    this.container.appendChild(r);
    const n = document.createElement("div");
    n.className = "column-list", n.setAttribute("role", "list"), n.setAttribute("aria-label", "Column visibility and order"), this.columnListEl = n, e.forEach((o) => {
      const s = this.createColumnItem(o.field, o.label || o.field, !t.has(o.field));
      n.appendChild(s);
    }), this.container.appendChild(n);
    const a = this.createFooter();
    this.container.appendChild(a);
  }
  createHeader(e, t) {
    const r = document.createElement("div");
    r.className = "column-manager-header";
    const n = document.createElement("div");
    n.className = "column-search-container";
    const a = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    a.setAttribute("class", "column-search-icon"), a.setAttribute("viewBox", "0 0 24 24"), a.setAttribute("fill", "none"), a.setAttribute("stroke", "currentColor"), a.setAttribute("stroke-width", "2");
    const o = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    o.setAttribute("cx", "11"), o.setAttribute("cy", "11"), o.setAttribute("r", "8");
    const s = document.createElementNS("http://www.w3.org/2000/svg", "path");
    s.setAttribute("d", "m21 21-4.3-4.3"), a.appendChild(o), a.appendChild(s);
    const i = document.createElement("input");
    i.type = "text", i.className = "column-search-input", i.placeholder = "Filter columns...", i.setAttribute("aria-label", "Filter columns"), this.searchInput = i, i.addEventListener("input", () => {
      this.filterColumns(i.value);
    }), n.appendChild(a), n.appendChild(i);
    const c = document.createElement("span");
    return c.className = "column-count-badge", c.textContent = `${t} of ${e}`, c.setAttribute("aria-live", "polite"), this.countBadgeEl = c, r.appendChild(n), r.appendChild(c), r;
  }
  filterColumns(e) {
    const t = e.toLowerCase().trim();
    this.container.querySelectorAll(".column-item").forEach((r) => {
      const n = r.querySelector(".column-label")?.textContent?.toLowerCase() || "", a = t === "" || n.includes(t);
      r.style.display = a ? "" : "none";
    }), this.updateScrollShadows();
  }
  updateCountBadge() {
    if (!this.countBadgeEl) return;
    const e = this.grid.config.columns, t = this.grid.state.hiddenColumns, r = e.length - t.size;
    this.countBadgeEl.textContent = `${r} of ${e.length}`;
  }
  setupScrollShadows() {
    this.columnListEl && (this.updateScrollShadows(), this.columnListEl.addEventListener("scroll", () => {
      this.updateScrollShadows();
    }), new ResizeObserver(() => {
      this.updateScrollShadows();
    }).observe(this.columnListEl));
  }
  updateScrollShadows() {
    if (!this.columnListEl) return;
    const e = this.columnListEl, t = e.scrollTop, r = e.scrollHeight, n = e.clientHeight, a = r > n, o = a && t > 0, s = a && t + n < r - 1;
    e.classList.toggle("column-list--shadow-top", o), e.classList.toggle("column-list--shadow-bottom", s);
  }
  createFooter() {
    const e = document.createElement("div");
    e.className = "column-manager-footer";
    const t = document.createElement("button");
    t.type = "button", t.className = "column-reset-btn", t.setAttribute("aria-label", "Reset columns to default");
    const r = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    r.setAttribute("class", "column-reset-icon"), r.setAttribute("viewBox", "0 0 24 24"), r.setAttribute("fill", "none"), r.setAttribute("stroke", "currentColor"), r.setAttribute("stroke-width", "2"), r.setAttribute("stroke-linecap", "round"), r.setAttribute("stroke-linejoin", "round");
    const n = document.createElementNS("http://www.w3.org/2000/svg", "path");
    n.setAttribute("d", "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8");
    const a = document.createElementNS("http://www.w3.org/2000/svg", "path");
    a.setAttribute("d", "M3 3v5h5"), r.appendChild(n), r.appendChild(a);
    const o = document.createElement("span");
    return o.textContent = "Reset to Default", t.appendChild(r), t.appendChild(o), t.addEventListener("click", () => {
      this.handleReset();
    }), e.appendChild(t), e;
  }
  handleReset() {
    this.grid.resetColumnsToDefault(), this.onReset?.(), this.searchInput && (this.searchInput.value = "", this.filterColumns("")), this.updateCountBadge();
  }
  createColumnItem(e, t, r) {
    const n = `column-item-${e}`, a = `column-switch-${e}`, o = document.createElement("div");
    o.className = "column-item", o.id = n, o.dataset.column = e, o.setAttribute("role", "listitem");
    const s = document.createElement("div");
    s.className = "column-item-content";
    const i = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    i.setAttribute("class", "drag-handle"), i.setAttribute("viewBox", "0 0 20 20"), i.setAttribute("fill", "currentColor"), i.setAttribute("aria-hidden", "true"), i.setAttribute("focusable", "false"), [
      [5, 4],
      [5, 10],
      [5, 16],
      [11, 4],
      [11, 10],
      [11, 16]
    ].forEach(([p, C]) => {
      const g = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      g.setAttribute("cx", String(p)), g.setAttribute("cy", String(C)), g.setAttribute("r", "1.5"), i.appendChild(g);
    });
    const c = document.createElement("span");
    c.className = "column-label", c.id = `${n}-label`, c.textContent = t, s.appendChild(i), s.appendChild(c);
    const l = document.createElement("label");
    l.className = "column-switch", l.htmlFor = a;
    const u = document.createElement("input");
    u.type = "checkbox", u.id = a, u.dataset.column = e, u.checked = r, u.setAttribute("role", "switch"), u.setAttribute("aria-checked", String(r)), u.setAttribute("aria-labelledby", `${n}-label`), u.setAttribute("aria-describedby", `${n}-desc`);
    const d = document.createElement("span");
    d.id = `${n}-desc`, d.className = "sr-only", d.textContent = `Press Space or Enter to toggle ${t} column visibility. Currently ${r ? "visible" : "hidden"}.`;
    const f = document.createElement("span");
    return f.className = "column-switch-slider", f.setAttribute("aria-hidden", "true"), l.appendChild(u), l.appendChild(f), o.appendChild(s), o.appendChild(l), o.appendChild(d), o;
  }
  setupDragAndDrop() {
    const e = this.container.querySelector(".column-list") || this.container;
    this.sortable = yt.create(e, {
      animation: 150,
      handle: ".drag-handle",
      ghostClass: "column-item-ghost",
      dragClass: "column-item-drag",
      chosenClass: "column-item-chosen",
      touchStartThreshold: 3,
      delay: 100,
      delayOnTouchOnly: !0,
      onEnd: () => {
        const t = e.querySelectorAll(".column-item"), r = Array.from(t).map((n) => n.dataset.column);
        this.onReorder && this.onReorder(r), this.grid.reorderColumns(r), this.grid.config.behaviors?.columnVisibility?.reorderColumns?.(r, this.grid);
      }
    });
  }
  bindSwitchToggles() {
    this.container.querySelectorAll('input[type="checkbox"]').forEach((e) => {
      e.addEventListener("change", () => {
        const t = e.dataset.column;
        if (!t) return;
        const r = e.checked;
        e.setAttribute("aria-checked", String(r));
        const n = `column-item-${t}-desc`, a = this.container.querySelector(`#${n}`);
        a && (a.textContent = `Press Space or Enter to toggle ${this.container.querySelector(`#column-item-${t}-label`)?.textContent || t} column visibility. Currently ${r ? "visible" : "hidden"}.`), this.onToggle && this.onToggle(t, r), this.grid.config.behaviors?.columnVisibility && this.grid.config.behaviors.columnVisibility.toggleColumn(t, this.grid), this.updateCountBadge();
      });
    });
  }
  updateSwitchState(e, t) {
    const r = this.container.querySelector(`input[type="checkbox"][data-column="${e}"]`);
    r && (r.checked = t, r.setAttribute("aria-checked", String(t)));
  }
  syncWithGridState() {
    const e = this.grid.state.hiddenColumns;
    this.grid.config.columns.forEach((t) => {
      this.updateSwitchState(t.field, !e.has(t.field));
    }), this.updateCountBadge();
  }
  getColumnOrder() {
    const e = this.container.querySelectorAll(".column-item");
    return Array.from(e).map((t) => t.dataset.column);
  }
  refresh() {
    this.destroy(), this.render(), this.setupDragAndDrop(), this.bindSwitchToggles(), this.setupScrollShadows();
  }
  destroy() {
    this.sortable && (this.sortable.destroy(), this.sortable = null);
  }
};
function Jr(e, t, r, n, a) {
  const o = (s) => {
    const i = s.target;
    if (!i) return;
    const c = i.closest(r);
    !c || !(c instanceof HTMLElement) || n(s, c);
  };
  return e.addEventListener(t, o, a), () => e.removeEventListener(t, o, a);
}
var y = x("DataGrid");
function Yr(e) {
  const t = e.tableEl;
  if (!t || !t.classList || typeof t.closest != "function") return;
  t.classList.add("admin-datagrid__table"), (t.closest("[data-datagrid-surface]") || t).classList.add("admin-datagrid");
  const r = t.querySelector("thead");
  r?.classList.add("admin-datagrid__header"), r?.querySelectorAll("th").forEach((o) => {
    o.classList.add("admin-datagrid__header-cell");
  }), t.querySelector("tbody")?.classList.add("admin-datagrid__body"), t.querySelectorAll(e.selectors.filterRow).forEach((o) => {
    o.classList.add("admin-datagrid__filter-control");
    const s = o.closest("tr");
    s?.classList.add("admin-datagrid__filter-row"), s?.querySelectorAll("th").forEach((i) => {
      i.classList.add("admin-datagrid__header-cell");
    });
  }), document.querySelector(e.selectors.searchInput)?.closest("[data-datagrid-toolbar]")?.classList.add("admin-surface-card", "admin-datagrid__toolbar"), document.querySelector("[data-datagrid-filter-panel]")?.classList.add("admin-surface-card", "admin-datagrid__filter-panel");
  const n = document.querySelector(e.selectors.paginationContainer), a = n?.closest("[data-datagrid-pagination]") || n;
  a?.classList.add("admin-surface-card", "admin-datagrid__pagination"), a?.classList.toggle("admin-datagrid__pagination--presented", e.config.pagination?.mode === "semantic"), n?.classList.add("admin-datagrid__pagination-controls");
  for (const o of [
    e.selectors.tableInfoStart,
    e.selectors.tableInfoEnd,
    e.selectors.tableInfoTotal,
    e.selectors.tableInfoSummary
  ]) {
    const s = document.querySelector(o);
    s?.classList.add("admin-datagrid__pagination-text"), s?.parentElement?.classList.add("admin-datagrid__pagination-text");
  }
  document.querySelector(e.selectors.perPageSelect)?.parentElement?.classList.add("admin-datagrid__pagination-text");
}
function Wr(e) {
  const t = document.querySelector(e.selectors.searchInput);
  if (!t) {
    y.warn(`[DataGrid] Search input not found: ${e.selectors.searchInput}`);
    return;
  }
  y.debug(`[DataGrid] Search input bound to: ${e.selectors.searchInput}`);
  const r = document.getElementById("clear-search-btn"), n = () => {
    r && (t.value.trim() ? r.classList.remove("hidden") : r.classList.add("hidden"));
  };
  t.addEventListener("input", () => {
    n(), e.searchTimeout && clearTimeout(e.searchTimeout), e.searchTimeout = window.setTimeout(async () => {
      y.debug(`[DataGrid] Search triggered: "${t.value}"`), e.state.search = t.value, e.pushStateToURL(), e.config.behaviors?.search ? await e.config.behaviors.search.onSearch(t.value, e) : (e.resetPagination(), await e.refresh());
    }, e.config.searchDelay);
  }), r && r.addEventListener("click", async () => {
    t.value = "", t.focus(), n(), e.state.search = "", e.pushStateToURL(), e.config.behaviors?.search ? await e.config.behaviors.search.onSearch("", e) : (e.resetPagination(), await e.refresh());
  }), n();
}
function Xr(e) {
  const t = document.querySelector(e.selectors.perPageSelect);
  t && t.addEventListener("change", async () => {
    e.state.perPage = parseInt(t.value, 10), e.resetPagination(), e.pushStateToURL(), await e.refresh();
  });
}
function Zr(e) {
  document.querySelectorAll(e.selectors.filterRow).forEach((t) => {
    const r = async () => {
      const n = t.dataset.filterColumn, a = t instanceof HTMLInputElement ? t.type.toLowerCase() : "", o = t instanceof HTMLSelectElement ? "eq" : a === "" || a === "text" || a === "search" || a === "email" || a === "tel" || a === "url" ? "ilike" : "eq", s = t.dataset.filterOperator || o, i = t.value;
      if (!n) return;
      const c = e.state.filters.findIndex((l) => l.column === n);
      if (i) {
        const l = {
          column: n,
          operator: s,
          value: i
        };
        c >= 0 ? e.state.filters[c] = l : e.state.filters.push(l);
      } else c >= 0 && e.state.filters.splice(c, 1);
      e.pushStateToURL(), e.config.behaviors?.filter ? await e.config.behaviors.filter.onFilterChange(n, i, e) : (e.resetPagination(), await e.refresh());
    };
    t.addEventListener("input", r), t.addEventListener("change", r);
  });
}
function en(e) {
  const t = document.querySelector(e.selectors.columnToggleBtn), r = document.querySelector(e.selectors.columnToggleMenu);
  !t || !r || (e.columnManager = new Qr({
    container: r,
    grid: e,
    onToggle: (n, a) => {
      y.debug(`[DataGrid] Column ${n} visibility toggled to ${a}`);
    },
    onReorder: (n) => {
      y.debug("[DataGrid] Columns reordered:", n);
    }
  }));
}
function tn(e) {
  if (!e.isCapabilityEnabled("export")) return;
  const t = document.querySelector(e.selectors.exportMenu);
  if (!t) return;
  const r = t.querySelectorAll("[data-export-format]");
  r.forEach((n) => {
    n.addEventListener("click", async () => {
      const a = n.dataset.exportFormat;
      if (!a || !e.config.behaviors?.export) return;
      const o = e.config.behaviors.export.getConcurrency?.() || "single", s = [];
      o === "single" ? r.forEach((u) => s.push(u)) : o === "per-format" && s.push(n);
      const i = (u) => {
        const d = u.querySelector(".export-icon"), f = u.querySelector(".export-spinner");
        d && d.classList.add("hidden"), f && f.classList.remove("hidden");
      }, c = (u) => {
        const d = u.querySelector(".export-icon"), f = u.querySelector(".export-spinner");
        d && d.classList.remove("hidden"), f && f.classList.add("hidden");
      };
      s.forEach((u) => {
        u.setAttribute("data-export-loading", "true"), u.disabled = !0, i(u);
      });
      const l = o === "none";
      l && (n.setAttribute("data-export-loading", "true"), i(n));
      try {
        await e.config.behaviors.export.export(a, e);
      } catch (u) {
        y.error("[DataGrid] Export failed:", u);
      } finally {
        s.forEach((u) => {
          u.removeAttribute("data-export-loading"), u.disabled = !1, c(u);
        }), l && (n.removeAttribute("data-export-loading"), c(n));
      }
    });
  });
}
function rn(e) {
  e.tableEl && (e.tableEl.querySelectorAll("[data-sort-column]").forEach((t) => {
    t.addEventListener("click", async (r) => {
      r.preventDefault(), r.stopPropagation();
      const n = t.dataset.sortColumn;
      if (!n) return;
      y.debug(`[DataGrid] Sort button clicked for field: ${n}`);
      const a = e.state.sort.find((s) => s.field === n);
      let o = null;
      a ? a.direction === "asc" ? (o = "desc", a.direction = o) : (e.state.sort = e.state.sort.filter((s) => s.field !== n), o = null, y.debug(`[DataGrid] Sort cleared for field: ${n}`)) : (o = "asc", e.state.sort = [{
        field: n,
        direction: o
      }]), y.debug("[DataGrid] New sort state:", e.state.sort), e.pushStateToURL(), o !== null && e.config.behaviors?.sort ? (y.debug("[DataGrid] Calling custom sort behavior"), await e.config.behaviors.sort.onSort(n, o, e)) : (y.debug("[DataGrid] Calling refresh() for sort"), await e.refresh()), y.debug("[DataGrid] Updating sort indicators"), e.updateSortIndicators();
    });
  }), e.tableEl.querySelectorAll("[data-sort]").forEach((t) => {
    t.addEventListener("click", async () => {
      const r = t.dataset.sort;
      if (!r) return;
      const n = e.state.sort.find((o) => o.field === r);
      let a = null;
      n ? n.direction === "asc" ? (a = "desc", n.direction = a) : (e.state.sort = e.state.sort.filter((o) => o.field !== r), a = null) : (a = "asc", e.state.sort = [{
        field: r,
        direction: a
      }]), e.pushStateToURL(), a !== null && e.config.behaviors?.sort ? await e.config.behaviors.sort.onSort(r, a, e) : await e.refresh(), e.updateSortIndicators();
    });
  }));
}
function nn(e) {
  e.tableEl && (e.tableEl.querySelectorAll("[data-sort-column]").forEach((t) => {
    const r = t.dataset.sortColumn;
    if (!r) return;
    const n = e.state.sort.find((o) => o.field === r), a = t.querySelector("svg");
    a && (n ? (t.classList.remove("opacity-0"), t.classList.add("opacity-100"), n.direction === "asc" ? (a.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />', a.classList.add("text-blue-600"), a.classList.remove("text-gray-400")) : (a.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />', a.classList.add("text-blue-600"), a.classList.remove("text-gray-400"))) : (a.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />', a.classList.remove("text-blue-600"), a.classList.add("text-gray-400")));
  }), e.tableEl.querySelectorAll("[data-sort]").forEach((t) => {
    const r = t.dataset.sort, n = e.state.sort.find((o) => o.field === r), a = t.querySelector(".sort-indicator");
    a && (a.textContent = n ? n.direction === "asc" ? "↑" : "↓" : "");
  }));
}
function an(e) {
  if (!e.isCapabilityEnabled("selection")) {
    e.selectionAbortController?.abort(), e.selectionAbortController = null, e.state.selectedRows.clear();
    return;
  }
  if (!e.tableEl) return;
  e.selectionAbortController && e.selectionAbortController.abort(), e.selectionAbortController = new AbortController();
  const { signal: t } = e.selectionAbortController, r = e.tableEl.querySelector(e.selectors.selectAllCheckbox);
  r && r.addEventListener("change", () => {
    e.tableEl.querySelectorAll(e.selectors.rowCheckboxes).forEach((n) => {
      n.checked = r.checked, re(n);
      const a = n.dataset.id;
      a && (r.checked ? e.state.selectedRows.add(a) : e.state.selectedRows.delete(a));
    }), e.updateBulkActionsBar();
  }, { signal: t }), e.tableEl.addEventListener("change", (n) => {
    const a = n.target;
    if (!a || a === r || typeof a.matches != "function" || !a.matches(e.selectors.rowCheckboxes)) return;
    const o = a.dataset.id;
    o && (a.checked ? e.state.selectedRows.add(o) : e.state.selectedRows.delete(o)), re(a), e.updateBulkActionsBar();
  }, { signal: t }), e.updateSelectionBindings();
}
function on(e) {
  e.isCapabilityEnabled("selection") && (e.tableEl?.querySelectorAll(e.selectors.rowCheckboxes) || []).forEach((t) => {
    const r = t.dataset.id;
    r && (t.checked = e.state.selectedRows.has(r)), re(t);
  });
}
function re(e) {
  const t = e.closest("tr");
  t && (t.dataset.selected = String(e.checked), t.setAttribute("aria-selected", String(e.checked)));
}
function ye(e) {
  return Array.from(new Set(e.filter(Boolean)));
}
function ne(e, t) {
  for (const r of t) {
    const n = e.querySelector(r);
    if (n) return n;
  }
  return null;
}
function sn(e) {
  const t = e?.selectors?.bulkActionsBar;
  if (!t) return null;
  try {
    return document.querySelector(t);
  } catch {
    return null;
  }
}
function $(e) {
  const t = sn(e);
  return t && e?.selectors?.bulkActionsBar !== "#bulk-actions-bar" ? t : ne(document, [
    "[data-bulk-action-overlay]",
    "#bulk-actions-overlay",
    '[data-bulk-action-bar="true"]'
  ]) || t;
}
function ue(e) {
  const t = $(e);
  return Array.from(t ? t.querySelectorAll("[data-bulk-action]") : document.querySelectorAll("[data-bulk-action]"));
}
function ln(e) {
  const t = $(e), r = [
    "[data-bulk-selection-count]",
    "#selected-count",
    e?.selectors?.selectedCount
  ].filter(Boolean);
  return (t ? ne(t, r) : null) || ne(document, r);
}
function cn(e) {
  const t = $(e), r = [
    "[data-bulk-clear]",
    "#bulk-clear-selection",
    "#clear-selection-btn"
  ], n = r.flatMap((a) => Array.from((t || document).querySelectorAll(a)));
  return n.length ? ye(n) : ye(r.flatMap((a) => Array.from(document.querySelectorAll(a))));
}
function Te(e) {
  cn(e).forEach((t) => {
    t.dataset.bulkClearBound !== "true" && (t.dataset.bulkClearBound = "true", t.addEventListener("click", () => {
      e.clearSelection();
    }));
  });
}
function un(e, t) {
  if (e.hasAttribute("data-selection-count") && (e.dataset.selectionCount = String(t)), t > 0) {
    e.classList.remove("hidden", "pointer-events-none", "translate-y-full", "-translate-y-full"), e.classList.add("translate-y-0"), e.removeAttribute("aria-hidden");
    return;
  }
  if (e.classList.remove("translate-y-0"), e.hasAttribute("data-bulk-action-overlay")) {
    const r = e.dataset.bulkOverlayPosition || (e.classList.contains("top-0") ? "top" : "bottom");
    e.classList.add("pointer-events-none", r === "top" ? "-translate-y-full" : "translate-y-full"), e.setAttribute("aria-hidden", "true");
    return;
  }
  e.classList.add("hidden");
}
function dn(e) {
  if (!e) return null;
  let t = e.querySelector("[data-bulk-action-state-reasons]");
  return t || (t = document.createElement("div"), t.dataset.bulkActionStateReasons = "true", t.className = "hidden mt-3 text-sm text-gray-700", e.appendChild(t), t);
}
function Ge(e, t) {
  const r = dn($(t));
  if (r) {
    if (!e.length) {
      r.classList.add("hidden"), r.innerHTML = "";
      return;
    }
    r.classList.remove("hidden"), r.innerHTML = e.map((n) => `
    <div data-bulk-action-reason-item="${n.actionId}" class="mt-1">
      <span class="font-medium">${n.label}:</span> ${n.reason}
    </div>
  `).join("");
  }
}
function fn(e, t, r) {
  const n = t?.enabled === !1, a = typeof t?.reason == "string" ? t.reason.trim() : "";
  return e.dataset.disabled = n ? "true" : "false", e.setAttribute("aria-disabled", n ? "true" : "false"), e.dataset.bulkState = n ? "disabled" : "enabled", e.classList.toggle("opacity-50", n), e.classList.toggle("cursor-not-allowed", n), n && a ? (e.setAttribute("title", a), {
    actionId: e.dataset.bulkAction || "",
    label: r,
    reason: a
  }) : (e.removeAttribute("title"), null);
}
function pn(e) {
  const t = ue(e), r = "Checking selected records...", n = [];
  t.forEach((a) => {
    a.dataset.disabled = "true", a.dataset.bulkState = "loading", a.setAttribute("aria-disabled", "true"), a.setAttribute("title", r), a.classList.add("opacity-50", "cursor-not-allowed"), n.push({
      actionId: a.dataset.bulkAction || "",
      label: a.textContent?.trim() || a.dataset.bulkAction || "Action",
      reason: r
    });
  }), Ge(n, e);
}
function Be(e) {
  return Ce(e.bulkActionStateConfig);
}
function hn(e, t, r) {
  e.bulkActionState = Ee(t), e.bulkActionStateConfig = Ce(r), e.applyBulkActionState(e.bulkActionState);
}
function mn(e, t) {
  const r = Ee(t);
  e.bulkActionState = r;
  const n = [];
  ue(e).forEach((a) => {
    const o = a.dataset.bulkAction;
    if (!o) return;
    const s = fn(a, r[o] || null, a.textContent?.trim() || o);
    s && n.push(s);
  }), Ge(n, e);
}
async function bn(e) {
  const t = Be(e), r = typeof t?.selection_state_endpoint == "string" ? t.selection_state_endpoint.trim() : "";
  if (!r) {
    e.applyBulkActionState(e.bulkActionState);
    return;
  }
  const n = Array.from(e.state.selectedRows);
  if (!n.length) {
    e.applyBulkActionState(e.bulkActionState);
    return;
  }
  e.bulkActionStateAbortController && e.bulkActionStateAbortController.abort(), e.bulkActionStateAbortController = new AbortController(), e.bulkActionStateRequestSeq += 1;
  const a = e.bulkActionStateRequestSeq, o = typeof e.buildQueryString == "function" ? e.buildQueryString() : "", s = o ? `${r}${r.includes("?") ? "&" : "?"}${o}` : r;
  try {
    const i = await A(s, {
      method: "POST",
      signal: e.bulkActionStateAbortController.signal,
      json: { ids: n }
    });
    if (!i.ok) throw new Error(`Bulk action state request failed: ${i.status}`);
    const c = Ze(await i.json());
    if (!c || a !== e.bulkActionStateRequestSeq) return;
    e.applyBulkActionState({
      ...e.bulkActionState,
      ...c.bulk_action_state
    });
  } catch (i) {
    if (i instanceof Error && i.name === "AbortError") return;
    y.warn("[DataGrid] Failed to refresh selection-sensitive bulk action state:", i), a === e.bulkActionStateRequestSeq && e.applyBulkActionState(e.bulkActionState);
  }
}
function yn(e) {
  if (!e.isCapabilityEnabled("bulk")) return;
  e.bulkActionStateDebounce && (clearTimeout(e.bulkActionStateDebounce), e.bulkActionStateDebounce = null);
  const t = Be(e), r = e.state.selectedRows.size;
  if (!t?.selection_sensitive || !t.selection_state_endpoint || r === 0) {
    e.bulkActionStateAbortController && (e.bulkActionStateAbortController.abort(), e.bulkActionStateAbortController = null), e.applyBulkActionState(e.bulkActionState);
    return;
  }
  pn(e);
  const n = typeof t.debounce_ms == "number" ? t.debounce_ms : 150;
  e.bulkActionStateDebounce = window.setTimeout(() => {
    e.bulkActionStateDebounce = null, bn(e);
  }, n);
}
function Sn(e) {
  if (!e.isCapabilityEnabled("bulk")) return;
  const t = $(e)?.dataset?.bulkBase || "";
  ue(e).forEach((r) => {
    r.addEventListener("click", async () => {
      const n = r, a = n.dataset.bulkAction;
      if (!a || n.getAttribute("aria-disabled") === "true" || n.dataset.disabled === "true") return;
      const o = Array.from(e.state.selectedRows);
      if (o.length === 0) {
        e.notify("Please select items first", "warning");
        return;
      }
      if (e.config.bulkActions) {
        const s = e.config.bulkActions.find((i) => i.id === a);
        if (s) {
          try {
            await e.actionRenderer.executeBulkAction(s, o), e.clearSelection(), await e.refresh();
          } catch (i) {
            y.error("Bulk action failed:", i), U(i)?.textCode && await e.refresh(), D(i) || e.showError(i instanceof Error ? i.message : "Bulk action failed");
          }
          return;
        }
      }
      if (t) {
        const s = `${t}/${a}`, i = n.dataset.bulkConfirm, c = e.parseDatasetStringArray(n.dataset.bulkPayloadRequired), l = e.parseDatasetObject(n.dataset.bulkPayloadSchema), u = {
          id: a,
          label: n.textContent?.trim() || a,
          endpoint: s,
          confirm: i,
          payloadRequired: c,
          payloadSchema: l
        };
        try {
          await e.actionRenderer.executeBulkAction(u, o), e.clearSelection(), await e.refresh();
        } catch (d) {
          y.error("Bulk action failed:", d), U(d)?.textCode && await e.refresh(), D(d) || e.showError(d instanceof Error ? d.message : "Bulk action failed");
        }
        return;
      }
      if (e.config.behaviors?.bulkActions) try {
        await e.config.behaviors.bulkActions.execute(a, o, e), e.clearSelection();
      } catch (s) {
        y.error("Bulk action failed:", s), U(s)?.textCode && await e.refresh(), D(s) || e.showError(s instanceof Error ? s.message : "Bulk action failed");
      }
    });
  }), Te(e), e.bindOverflowMenu();
}
function gn(e) {
  const t = document.getElementById("bulk-more-btn"), r = document.getElementById("bulk-overflow-menu");
  !t || !r || (t.addEventListener("click", (n) => {
    n.stopPropagation(), r.classList.toggle("hidden");
  }), document.addEventListener("click", () => {
    r.classList.add("hidden");
  }), document.addEventListener("keydown", (n) => {
    n.key === "Escape" && r.classList.add("hidden");
  }), r.addEventListener("click", (n) => {
    n.stopPropagation();
  }));
}
function wn(e) {
  if (!e.isCapabilityEnabled("bulk")) return;
  const t = $(e), r = ln(e), n = e.state.selectedRows.size;
  !t || !r || (r.textContent = String(n), un(t, n), n > 0 && t.offsetHeight, e.syncBulkActionState());
}
function vn(e) {
  e.isCapabilityEnabled("bulk") && Te(e);
}
function An(e) {
  if (!e.isCapabilityEnabled("selection")) return;
  y.debug("[DataGrid] Clearing selection..."), e.state.selectedRows.clear();
  const t = e.tableEl?.querySelector(e.selectors.selectAllCheckbox);
  t && (t.checked = !1), e.updateBulkActionsBar(), e.updateSelectionBindings();
}
function Cn(e, t, r) {
  Qe({
    trigger: t,
    menu: r
  });
}
function En(e) {
  e.actionMenuController && (e.actionMenuController.destroy(), e.actionMenuController = null), e.dropdownAbortController && e.dropdownAbortController.abort(), e.dropdownAbortController = new AbortController();
  const { signal: t } = e.dropdownAbortController;
  document.querySelectorAll("[data-dropdown-toggle]").forEach((a) => {
    const o = a.dataset.dropdownToggle, s = document.getElementById(o || "");
    s && !s.classList.contains("hidden") && s.classList.add("hidden");
  });
  const r = (a = !1) => {
    document.querySelectorAll("[data-dropdown-toggle]").forEach((o) => {
      const s = o.dataset.dropdownToggle, i = document.getElementById(s || "");
      i && (i.classList.add("hidden"), o.setAttribute("aria-expanded", "false"), a && i.getAttribute("data-dropdown-open") === "true" && o.focus(), i.removeAttribute("data-dropdown-open"));
    });
  };
  Jr(document, "click", "[data-dropdown-toggle]", (a, o) => {
    const s = o.dataset.dropdownToggle, i = document.getElementById(s || "");
    if (!(!e.isCapabilityEnabled("export") && (o.matches(e.selectors.exportBtn) || i?.matches(e.selectors.exportMenu))) && (a.stopPropagation(), i)) {
      const c = i.classList.contains("hidden");
      document.querySelectorAll("[data-dropdown-toggle]").forEach((l) => {
        const u = l.dataset.dropdownToggle, d = document.getElementById(u || "");
        d && d !== i && (d.classList.add("hidden"), l.setAttribute("aria-expanded", "false"), d.removeAttribute("data-dropdown-open"));
      }), i.classList.toggle("hidden"), o.setAttribute("aria-expanded", String(c)), c ? (i.setAttribute("data-dropdown-open", "true"), i.querySelector('[role="option"], [role="menuitem"], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])')?.focus()) : (i.removeAttribute("data-dropdown-open"), o.focus());
    }
  }, { signal: t }), document.addEventListener("click", (a) => {
    const o = a.target;
    o && typeof o.closest == "function" && o.closest("[data-dropdown-toggle], #column-toggle-menu, #export-menu") || r();
  }, { signal: t });
  const n = e.tableEl ?? document;
  e.actionMenuController = Je(n, {
    containerSelector: "[data-dropdown], .actions-dropdown",
    triggerSelector: "[data-dropdown-trigger], .actions-menu-trigger",
    menuSelector: ".actions-menu",
    itemSelector: '[role="menuitem"], .action-item',
    outsideIgnoreSelector: "[data-dropdown-toggle], #column-toggle-menu, #export-menu",
    positionMenu: ({ trigger: a, menu: o }) => {
      e.positionDropdownMenu(a, o);
    },
    portal: !0,
    signal: t
  }), document.addEventListener("keydown", (a) => {
    a.key === "Escape" && r(!0);
  }, { signal: t });
}
function xn(e, t) {
  y.error(t), e.notifier.error(t);
}
function kn(e, t, r) {
  e.notifier.show({
    message: t,
    type: r
  });
}
async function Rn(e, t) {
  return e.notifier.confirm(t);
}
async function _n(e, t) {
  return t instanceof Response ? He(t) : t instanceof Error ? t.message : "An unexpected error occurred";
}
function Pn(e, t) {
  if (t)
    try {
      const r = JSON.parse(t);
      if (!Array.isArray(r)) return;
      const n = r.map((a) => typeof a == "string" ? a.trim() : "").filter((a) => a.length > 0);
      return n.length > 0 ? n : void 0;
    } catch (r) {
      y.warn("[DataGrid] Failed to parse bulk payload_required:", r);
      return;
    }
}
function Mn(e, t) {
  if (t)
    try {
      const r = JSON.parse(t);
      return !r || typeof r != "object" || Array.isArray(r) ? void 0 : r;
    } catch (r) {
      y.warn("[DataGrid] Failed to parse bulk payload_schema:", r);
      return;
    }
}
var Oe = x("DataGrid");
function Ln(e, t) {
  if (!e.tableEl) return;
  const r = e.mergeColumnOrder(t);
  e.state.columnOrder = r;
  const n = new Map(e.config.columns.map((a) => [a.field, a]));
  e.config.columns = r.map((a) => n.get(a)).filter((a) => a !== void 0), e.reorderTableColumns(r), e.persistStateSnapshot(), Oe.debug("[DataGrid] Columns reordered:", r);
}
function Dn(e) {
  e.config.behaviors?.columnVisibility?.clearSavedPrefs?.(), e.config.columns = e.defaultColumns.map((r) => ({ ...r })), e.state.columnOrder = e.config.columns.map((r) => r.field);
  const t = e.config.columns.filter((r) => !r.hidden).map((r) => r.field);
  e.tableEl ? (e.reorderTableColumns(e.state.columnOrder), e.updateColumnVisibility(t)) : (e.state.hiddenColumns = new Set(e.config.columns.filter((r) => r.hidden).map((r) => r.field)), e.persistStateSnapshot()), e.columnManager && (e.columnManager.refresh(), e.columnManager.syncWithGridState()), Oe.debug("[DataGrid] Columns reset to default");
}
function $n(e, t) {
  const r = new Set(e.config.columns.map((s) => s.field)), n = new Set(t), a = t.filter((s) => r.has(s)), o = e.config.columns.map((s) => s.field).filter((s) => !n.has(s));
  return [...a, ...o];
}
function Tn(e, t) {
  if (!e.tableEl) return;
  const r = e.tableEl.querySelector("thead tr:first-child");
  r && e.reorderRowCells(r, t, "th");
  const n = e.tableEl.querySelector("#filter-row");
  n && e.reorderRowCells(n, t, "th"), e.tableEl.querySelectorAll("tbody tr").forEach((a) => {
    e.reorderRowCells(a, t, "td");
  });
}
function Gn(e, t, r, n) {
  const a = Array.from(t.querySelectorAll(`${n}[data-column]`)), o = new Map(a.map((u) => [u.dataset.column, u])), s = Array.from(t.querySelectorAll(n)), i = t.querySelector(`${n}[data-role="selection"]`) || s.find((u) => u.querySelector('input[type="checkbox"]')), c = t.querySelector(`${n}[data-role="actions"]`) || s.find((u) => !u.dataset.column && (u.querySelector("[data-action]") || u.querySelector("[data-action-id]") || u.querySelector(".dropdown"))), l = [];
  i && l.push(i), r.forEach((u) => {
    const d = o.get(u);
    d && l.push(d);
  }), c && l.push(c), l.forEach((u) => {
    t.appendChild(u);
  });
}
var S, T = x("DataGrid");
function Bn(e) {
  if (!e) return {
    selection: !0,
    bulk: !0,
    export: !0
  };
  const t = e.bulk !== !1, r = e.export !== !1;
  return {
    selection: t || r,
    bulk: t,
    export: r
  };
}
var Ie = class {
  constructor(e) {
    this.tableEl = null, this.searchTimeout = null, this.abortController = null, this.dropdownAbortController = null, this.actionMenuController = null, this.selectionAbortController = null, this.didRestoreColumnOrder = !1, this.shouldReorderDOMOnRestore = !1, this.recordsById = {}, this.columnManager = null, this.lastSchema = null, this.lastForm = null, this.bulkActionState = {}, this.bulkActionStateConfig = null, this.bulkActionStateDebounce = null, this.bulkActionStateAbortController = null, this.bulkActionStateRequestSeq = 0, this.refreshDrainPromise = null, this.refreshInFlight = null, this.refreshQueued = !1, this.refreshRequestSeq = 0, this.activeRefreshSeq = 0, this.hasURLStateOverrides = !1, this.hasPersistedHiddenColumnState = !1, this.hasPersistedColumnOrderState = !1, this.config = {
      perPage: 10,
      searchDelay: 300,
      behaviors: {},
      ...e,
      capabilities: Bn(e.capabilities)
    }, this.notifier = e.notifier || new we(), this.selectors = {
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
      tableInfoSummary: "#table-info-summary",
      selectAllCheckbox: "#table-checkbox-all",
      rowCheckboxes: ".table-checkbox",
      bulkActionsBar: "#bulk-actions-bar",
      selectedCount: "#selected-count",
      ...e.selectors
    };
    const t = this.config.panelId || this.config.tableId;
    this.stateStore = this.config.stateStore || jt({
      key: t,
      ...this.config.stateStoreConfig || {}
    });
    const r = this.stateStore.loadPersistedState(), n = new Set(this.config.columns.map((m) => m.field)), a = new Set(this.config.columns.filter((m) => m.hidden).map((m) => m.field)), o = !!r && Array.isArray(r.hiddenColumns);
    this.hasPersistedHiddenColumnState = o;
    const s = new Set((r?.hiddenColumns || []).filter((m) => n.has(m))), i = this.config.columns.map((m) => m.field), c = !!r && Array.isArray(r.columnOrder) && r.columnOrder.length > 0;
    this.hasPersistedColumnOrderState = c;
    const l = (r?.columnOrder || []).filter((m) => n.has(m)), u = c ? [...l, ...i.filter((m) => !l.includes(m))] : i, d = this.config.enableGroupedMode ? ut(t) : !1, f = this.config.enableGroupedMode ? ft(t) : null, p = this.config.enableGroupedMode ? mt(t) : "explicit", C = this.config.enableGroupedMode ? lt(t) : /* @__PURE__ */ new Set(), g = oe(r?.expandMode, p), k = new Set((r?.expandedGroups || Array.from(C)).map((m) => String(m).trim()).filter(Boolean)), R = this.config.enableGroupedMode ? r?.expandMode !== void 0 || k.size > 0 || d : !1, J = (this.config.enableGroupedMode ? r?.viewMode || f : null) || this.config.defaultViewMode || "flat";
    this.state = {
      currentPage: 1,
      perPage: this.config.perPage || 10,
      totalRows: 0,
      search: "",
      filters: [],
      sort: [],
      selectedRows: /* @__PURE__ */ new Set(),
      hiddenColumns: o ? s : a,
      columnOrder: u,
      viewMode: J,
      expandMode: g,
      groupedData: null,
      expandedGroups: k,
      hasPersistedExpandState: R
    }, this.actionRenderer = new gt({
      mode: this.config.actionRenderMode || "dropdown",
      actionBasePath: this.config.actionBasePath || this.config.apiEndpoint,
      notifier: this.notifier,
      domIdPrefix: this.config.tableId
    }), this.cellRendererRegistry = new Dt(), this.config.cellRenderers && Object.entries(this.config.cellRenderers).forEach(([m, Fe]) => {
      this.cellRendererRegistry.register(m, Fe);
    }), this.defaultColumns = this.config.columns.map((m) => ({ ...m }));
  }
  init() {
    if (T.debug("[DataGrid] Initializing with config:", this.config), this.tableEl = document.querySelector(this.selectors.table), !this.tableEl) {
      T.error(`[DataGrid] Table element not found: ${this.selectors.table}`);
      return;
    }
    T.debug("[DataGrid] Table element found:", this.tableEl), Tr(this), Yr(this), this.restoreStateFromURL(), this.bindSearchInput(), this.bindPerPageSelect(), this.bindFilterInputs(), this.bindColumnVisibility(), this.bindExportButtons(), this.bindSorting(), this.bindSelection(), this.bindBulkActions(), this.bindBulkClearButton(), this.bindDropdownToggles(), this.refreshAfterStateHydration();
  }
  isCapabilityEnabled(e) {
    return this.config.capabilities?.[e] !== !1;
  }
  setRenderState(e) {
    if (this.tableEl) {
      this.tableEl.dataset.state = e, this.tableEl.setAttribute("aria-busy", e === "loading" ? "true" : "false");
      try {
        this.config.onStateChange?.(e);
      } catch (t) {
        T.error("[DataGrid] onStateChange callback failed:", t);
      }
    }
  }
  async refreshAfterStateHydration() {
    if (typeof this.stateStore.hydrate == "function") try {
      if (await this.stateStore.hydrate(), !this.hasURLStateOverrides) {
        const e = this.stateStore.loadPersistedState();
        e && (this.applyPersistedStateSnapshot(e, { merge: !0 }), this.applyRestoredState(), this.pushStateToURL({ replace: !0 }));
      }
    } catch {
    }
    await this.refresh();
  }
  getURLStateConfig() {
    return Kt(this);
  }
  parseJSONArray(e, t) {
    return Qt(this, e, t);
  }
  applyPersistedStateSnapshot(e, t = {}) {
    Wt(this, e, t);
  }
  applyShareStateSnapshot(e) {
    Xt(this, e);
  }
  buildPersistedStateSnapshot() {
    return Zt(this);
  }
  buildShareStateSnapshot() {
    return er(this);
  }
  persistStateSnapshot() {
    tr(this);
  }
  restoreStateFromURL() {
    rr(this);
  }
  applyRestoredState() {
    nr(this);
  }
  pushStateToURL(e = {}) {
    ar(this, e);
  }
  syncURL() {
    this.pushStateToURL();
  }
  async refresh() {
    return this.refreshDrainPromise ? (this.refreshQueued = !0, this.refreshDrainPromise) : (this.refreshQueued = !0, this.refreshDrainPromise = this.drainRefreshQueue().finally(() => {
      this.refreshDrainPromise = null, this.refreshInFlight = null;
    }), this.refreshDrainPromise);
  }
  requestRefreshAfterCurrent() {
    this.refreshQueued = !0;
  }
  isCurrentRefresh(e) {
    return e === this.activeRefreshSeq;
  }
  async drainRefreshQueue() {
    for (; this.refreshQueued; ) {
      this.refreshQueued = !1;
      const e = ++this.refreshRequestSeq;
      this.activeRefreshSeq = e, this.refreshInFlight = or(this, e), await this.refreshInFlight, this.refreshInFlight = null;
    }
  }
  buildApiUrl() {
    return sr(this);
  }
  buildQueryString() {
    return ir(this);
  }
  buildQueryParams() {
    return lr(this);
  }
  getResponseTotal(e) {
    return cr(this, e);
  }
  normalizePagination(e) {
    return ur(this, e);
  }
  resetPagination() {
    this.state.currentPage = 1;
  }
  updateColumnVisibility(e, t = !1) {
    Dr(this, e, t);
  }
  syncColumnVisibilityCheckboxes() {
    $r(this);
  }
  renderData(e) {
    Or(this, e);
  }
  renderLoadingState() {
    Gr(this);
  }
  renderErrorState(e) {
    Br(this, e);
  }
  renderFlatData(e, t) {
    Ir(this, e, t);
  }
  renderGroupedData(e, t, r) {
    br(this, e, t, r);
  }
  isGroupedViewActive() {
    return yr(this);
  }
  fallbackGroupedMode(e) {
    Sr(this, e);
  }
  handleGroupedModeStatusFallback(e) {
    return gr(this, e);
  }
  handleGroupedModePayloadFallback(e) {
    return wr(this, e);
  }
  toggleGroup(e) {
    vr(this, e);
  }
  setExpandedGroups(e) {
    Ar(this, e);
  }
  expandAllGroups() {
    Cr(this);
  }
  collapseAllGroups() {
    Er(this);
  }
  updateGroupVisibility(e) {
    xr(this, e);
  }
  updateGroupedRowsFromState() {
    kr(this);
  }
  isGroupExpandedByState(e, t = !1) {
    return Rr(this, e, t);
  }
  setViewMode(e) {
    _r(this, e);
  }
  getViewMode() {
    return Pr(this);
  }
  getGroupedData() {
    return Mr(this);
  }
  async fetchDetail(e) {
    return dr(this, e);
  }
  getSchema() {
    return pr(this);
  }
  getForm() {
    return hr(this);
  }
  getTabs() {
    return mr(this);
  }
  normalizeDetailResponse(e) {
    return fr(this, e);
  }
  resolveRendererOptions(e) {
    return qr(this, e);
  }
  createTableRow(e) {
    return Nr(this, e);
  }
  sanitizeActionId(e) {
    return Fr(this, e);
  }
  async handleDelete(e) {
    return jr(this, e);
  }
  updatePaginationUI(e) {
    Ur(this, e);
  }
  renderPaginationButtons(e) {
    zr(this, e);
  }
  bindSearchInput() {
    Wr(this);
  }
  bindPerPageSelect() {
    Xr(this);
  }
  bindFilterInputs() {
    Zr(this);
  }
  bindColumnVisibility() {
    en(this);
  }
  bindExportButtons() {
    tn(this);
  }
  bindSorting() {
    rn(this);
  }
  updateSortIndicators() {
    nn(this);
  }
  bindSelection() {
    an(this);
  }
  updateSelectionBindings() {
    on(this);
  }
  bindBulkActions() {
    Sn(this);
  }
  bindOverflowMenu() {
    gn(this);
  }
  updateBulkActionsBar() {
    wn(this);
  }
  setBulkActionState(e, t) {
    hn(this, e, t);
  }
  applyBulkActionState(e) {
    mn(this, e);
  }
  syncBulkActionState() {
    yn(this);
  }
  bindBulkClearButton() {
    vn(this);
  }
  clearSelection() {
    An(this);
  }
  positionDropdownMenu(e, t) {
    Cn(this, e, t);
  }
  bindDropdownToggles() {
    En(this);
  }
  showError(e) {
    xn(this, e);
  }
  notify(e, t) {
    kn(this, e, t);
  }
  async confirmAction(e) {
    return Rn(this, e);
  }
  async extractError(e) {
    return _n(this, e);
  }
  parseDatasetStringArray(e) {
    return Pn(this, e);
  }
  parseDatasetObject(e) {
    return Mn(this, e);
  }
  reorderColumns(e) {
    Ln(this, e);
  }
  resetColumnsToDefault() {
    Dn(this);
  }
  mergeColumnOrder(e) {
    return $n(this, e);
  }
  reorderTableColumns(e) {
    Tn(this, e);
  }
  reorderRowCells(e, t, r) {
    Gn(this, e, t, r);
  }
  destroy() {
    this.columnManager && (this.columnManager.destroy(), this.columnManager = null), this.dropdownAbortController && (this.dropdownAbortController.abort(), this.dropdownAbortController = null), this.actionMenuController && (this.actionMenuController.destroy(), this.actionMenuController = null), this.selectionAbortController && (this.selectionAbortController.abort(), this.selectionAbortController = null), this.abortController && (this.abortController.abort(), this.abortController = null), this.bulkActionStateAbortController && (this.bulkActionStateAbortController.abort(), this.bulkActionStateAbortController = null), this.searchTimeout && (clearTimeout(this.searchTimeout), this.searchTimeout = null), this.bulkActionStateDebounce && (clearTimeout(this.bulkActionStateDebounce), this.bulkActionStateDebounce = null), T.debug("[DataGrid] Instance destroyed");
  }
};
S = Ie;
S.URL_KEY_SEARCH = B;
S.URL_KEY_PAGE = O;
S.URL_KEY_PER_PAGE = I;
S.URL_KEY_FILTERS = q;
S.URL_KEY_SORT = N;
S.URL_KEY_STATE = H;
S.URL_KEY_HIDDEN_COLUMNS = K;
S.URL_KEY_VIEW_MODE = Q;
S.URL_KEY_EXPANDED_GROUPS = ie;
S.MANAGED_URL_KEYS = le;
S.DEFAULT_MAX_URL_LENGTH = Ht;
S.DEFAULT_MAX_FILTERS_LENGTH = 600;
typeof window < "u" && (window.DataGrid = Ie);
var ya = class {
  constructor(e) {
    if (this.searchableFields = e, !e || e.length === 0) throw new Error("At least one searchable field is required");
  }
  buildQuery(e) {
    if (!e || e.trim() === "") return {};
    const t = {}, r = e.trim();
    return this.searchableFields.forEach((n) => {
      t[`${n}__ilike`] = `%${r}%`;
    }), t;
  }
  async onSearch(e, t) {
    t.resetPagination(), await t.refresh();
  }
}, Sa = class {
  buildFilters(e) {
    const t = {}, r = /* @__PURE__ */ new Map();
    return e.forEach((n) => {
      if (n.value === null || n.value === void 0 || n.value === "") return;
      const a = n.operator || "eq", o = n.column;
      r.has(o) || r.set(o, {
        operator: a,
        values: []
      }), r.get(o).values.push(n.value);
    }), r.forEach((n, a) => {
      if (n.values.length === 1) {
        const o = n.operator === "eq" ? a : `${a}__${n.operator}`;
        t[o] = n.values[0];
      } else n.operator === "ilike" ? t[`${a}__ilike`] = n.values.join(",") : n.operator === "eq" ? t[`${a}__in`] = n.values.join(",") : t[`${a}__${n.operator}`] = n.values.join(",");
    }), t;
  }
  async onFilterChange(e, t, r) {
    r.resetPagination(), await r.refresh();
  }
}, ga = class {
  buildQuery(e, t) {
    return {
      limit: t,
      offset: (e - 1) * t
    };
  }
  async onPageChange(e, t) {
    await t.refresh();
  }
}, wa = class {
  buildQuery(e) {
    return !e || e.length === 0 ? {} : { order: e.map((t) => `${t.field} ${t.direction}`).join(",") };
  }
  async onSort(e, t, r) {
    await r.refresh();
  }
}, va = class {
  constructor(e) {
    if (!e || !e.endpoint) throw new Error("export endpoint is required");
    if (!e.definition && !e.resource) throw new Error("export definition or resource is required");
    this.config = e;
  }
  getEndpoint() {
    return this.config.endpoint;
  }
  getConcurrency() {
    return this.config.concurrency || "single";
  }
  async export(e, t) {
    if (!t) throw new Error("datagrid instance is required");
    const r = On(t, this.config, e);
    r.delivery = In(this.config, e);
    let n;
    try {
      n = await A(this.getEndpoint(), {
        method: "POST",
        json: r,
        headers: { Accept: "application/json,application/octet-stream" }
      });
    } catch (a) {
      throw _(t, "error", a instanceof Error ? a.message : "Network error during export"), a;
    }
    if (n.status === 202) {
      const a = await qe(n);
      _(t, "info", "Export queued. You can download it when ready.");
      const o = a?.status_url || "";
      if (o) {
        const s = Fn(a, o);
        try {
          await jn(o, {
            intervalMs: qn(this.config),
            timeoutMs: Nn(this.config)
          });
          const i = await A(s, {
            method: "GET",
            headers: { Accept: "application/octet-stream" }
          });
          if (!i.ok) {
            const c = await ae(i);
            throw _(t, "error", c), new Error(c);
          }
          await ge(i, r.definition || r.resource || "export", r.format), _(t, "success", "Export ready.");
          return;
        } catch (i) {
          throw _(t, "error", i instanceof Error ? i.message : "Export failed"), i;
        }
      }
      if (a?.download_url) {
        window.open(a.download_url, "_blank");
        return;
      }
      return;
    }
    if (!n.ok) {
      const a = await ae(n);
      throw _(t, "error", a), new Error(a);
    }
    await ge(n, r.definition || r.resource || "export", r.format), _(t, "success", "Export ready.");
  }
};
function On(e, t, r) {
  const n = Yn(r), a = zn(e, t), o = Vn(e, t), s = {
    format: n,
    query: Kn(Hn(e)),
    selection: a,
    columns: o,
    delivery: t.delivery || "auto"
  };
  t.definition && (s.definition = t.definition), t.resource && (s.resource = t.resource);
  const i = t.sourceVariant || t.variant;
  return i && (s.source_variant = i), s;
}
function In(e, t) {
  return e.delivery ? e.delivery : (e.asyncFormats && e.asyncFormats.length > 0 ? e.asyncFormats : ["pdf"]).includes(t) ? "async" : "auto";
}
function qn(e) {
  const t = Number(e.statusPollIntervalMs);
  return Number.isFinite(t) && t > 0 ? t : 2e3;
}
function Nn(e) {
  const t = Number(e.statusPollTimeoutMs);
  return Number.isFinite(t) && t >= 0 ? t : 3e5;
}
function Fn(e, t) {
  return e?.download_url ? e.download_url : `${t.replace(/\/+$/, "")}/download`;
}
async function qe(e) {
  return await Ue(e);
}
async function jn(e, t) {
  const r = Date.now(), n = Math.max(250, t.intervalMs);
  for (; ; ) {
    const a = await A(e, {
      method: "GET",
      headers: { Accept: "application/json" }
    });
    if (!a.ok) {
      const i = await ae(a);
      throw new Error(i);
    }
    const o = await qe(a), s = String(o?.state || "").toLowerCase();
    if (s === "completed") return o;
    if (s === "failed") throw new Error("Export failed");
    if (s === "canceled") throw new Error("Export canceled");
    if (s === "deleted") throw new Error("Export deleted");
    if (t.timeoutMs > 0 && Date.now() - r > t.timeoutMs) throw new Error("Export status timed out");
    await Un(n);
  }
}
function Un(e) {
  return new Promise((t) => setTimeout(t, e));
}
function zn(e, t) {
  if (t.selection?.mode) return t.selection;
  const r = Array.from(e.state.selectedRows || []), n = r.length > 0 ? "ids" : "all";
  return {
    mode: n,
    ids: n === "ids" ? r : []
  };
}
function Vn(e, t) {
  if (Array.isArray(t.columns) && t.columns.length > 0) return t.columns.slice();
  const r = e.state?.hiddenColumns ? new Set(e.state.hiddenColumns) : /* @__PURE__ */ new Set();
  return (Array.isArray(e.state?.columnOrder) && e.state.columnOrder.length > 0 ? e.state.columnOrder : e.config.columns.map((n) => n.field)).filter((n) => !r.has(n));
}
function Hn(e) {
  const t = {}, r = e.config.behaviors || {};
  return r.pagination && Object.assign(t, r.pagination.buildQuery(e.state.currentPage, e.state.perPage)), e.state.search && r.search && Object.assign(t, r.search.buildQuery(e.state.search)), e.state.filters.length > 0 && r.filter && Object.assign(t, r.filter.buildFilters(e.state.filters)), e.state.sort.length > 0 && r.sort && Object.assign(t, r.sort.buildQuery(e.state.sort)), t;
}
function Kn(e) {
  const t = {}, r = [];
  return Object.entries(e).forEach(([n, a]) => {
    if (a == null || a === "") return;
    switch (n) {
      case "limit":
        t.limit = Se(a);
        return;
      case "offset":
        t.offset = Se(a);
        return;
      case "order":
      case "sort":
        t.sort = Jn(String(a));
        return;
      case "q":
      case "search":
        t.search = String(a);
        return;
    }
    const { field: o, op: s } = Qn(n);
    o && r.push({
      field: o,
      op: s,
      value: a
    });
  }), r.length > 0 && (t.filters = r), t;
}
function Qn(e) {
  const t = e.split("__");
  return {
    field: t[0]?.trim() || "",
    op: t[1]?.trim() || "eq"
  };
}
function Jn(e) {
  return e ? e.split(",").map((t) => t.trim()).filter(Boolean).map((t) => {
    const r = t.split(/\s+/);
    return {
      field: r[0] || "",
      desc: (r[1] || "asc").toLowerCase() === "desc"
    };
  }).filter((t) => t.field) : [];
}
function Yn(e) {
  const t = String(e || "").trim().toLowerCase();
  return t === "excel" || t === "xls" ? "xlsx" : t || "csv";
}
function Se(e) {
  const t = Number(e);
  return Number.isFinite(t) ? t : 0;
}
async function ge(e, t, r) {
  const n = await e.blob(), a = Wn(e, t, r), o = URL.createObjectURL(n), s = document.createElement("a");
  s.href = o, s.download = a, s.rel = "noopener", document.body.appendChild(s), s.click(), s.remove(), URL.revokeObjectURL(o);
}
function Wn(e, t, r) {
  const n = e.headers.get("content-disposition") || "", a = `${t}.${r}`;
  return Xn(n) || a;
}
function Xn(e) {
  if (!e) return null;
  const t = e.match(/filename\*=(?:UTF-8'')?([^;]+)/i);
  if (t && t[1]) return decodeURIComponent(t[1].replace(/"/g, "").trim());
  const r = e.match(/filename="?([^";]+)"?/i);
  return r && r[1] ? r[1].trim() : null;
}
async function ae(e) {
  return ve(e, `Export failed (${e.status})`, { appendStatusToFallback: !1 });
}
function _(e, t, r) {
  const n = e.config.notifier;
  if (n && typeof n[t] == "function") {
    n[t](r);
    return;
  }
  const a = window.toastManager;
  if (a && typeof a[t] == "function") {
    a[t](r);
    return;
  }
  t === "error" && alert(r);
}
var Aa = class {
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
    const n = this.getActionEndpoint(e), a = await A(n, {
      method: "POST",
      json: { ids: t },
      accept: "application/json"
    });
    if (!a.ok) {
      const o = await ve(a, `Bulk action '${e}' failed`);
      throw new Error(`Bulk action '${e}' failed: ${o}`);
    }
    await r.refresh();
  }
}, b = x("DataGrid"), Zn = 1500;
function ea(e) {
  return typeof e == "object" && e !== null && "name" in e && e.name === "AbortError";
}
function Ne(e) {
  return typeof e == "object" && e !== null && "version" in e && e.version === 2;
}
var ta = class {
  constructor(e, t = "datatable_columns") {
    this.cachedOrder = null, this.storageKey = t;
  }
  getVisibleColumns(e) {
    return e.config.columns.filter((t) => !e.state.hiddenColumns.has(t.field)).map((t) => t.field);
  }
  toggleColumn(e, t) {
    const r = !t.state.hiddenColumns.has(e), n = t.config.columns.filter((s) => s.field === e ? !r : !t.state.hiddenColumns.has(s.field)).map((s) => s.field), a = {};
    t.config.columns.forEach((s) => {
      a[s.field] = n.includes(s.field);
    });
    const o = this.cachedOrder || t.state.columnOrder;
    this.savePrefs({
      version: 2,
      visibility: a,
      order: o.length > 0 ? o : void 0
    }), t.updateColumnVisibility(n);
  }
  reorderColumns(e, t) {
    const r = {};
    t.config.columns.forEach((n) => {
      r[n.field] = !t.state.hiddenColumns.has(n.field);
    }), this.cachedOrder = e, this.savePrefs({
      version: 2,
      visibility: r,
      order: e
    }), b.debug("[ColumnVisibility] Order saved:", e);
  }
  loadColumnOrderFromCache(e) {
    try {
      const t = this.loadPrefs();
      if (!t || !t.order) return [];
      const r = new Set(e), n = t.order.filter((a) => r.has(a));
      return this.cachedOrder = n, b.debug("[ColumnVisibility] Order loaded from cache:", n), n;
    } catch (t) {
      return b.warn("Failed to load column order from cache:", t), [];
    }
  }
  loadHiddenColumnsFromCache(e) {
    try {
      const t = this.loadPrefs();
      if (!t) return /* @__PURE__ */ new Set();
      const r = new Set(e), n = /* @__PURE__ */ new Set();
      return Object.entries(t.visibility).forEach(([a, o]) => {
        !o && r.has(a) && n.add(a);
      }), n;
    } catch (t) {
      return b.warn("Failed to load column visibility state:", t), /* @__PURE__ */ new Set();
    }
  }
  loadPrefs() {
    try {
      const e = localStorage.getItem(this.storageKey);
      if (!e) return null;
      const t = JSON.parse(e);
      if (Ne(t)) return t;
      const r = {
        version: 2,
        visibility: t
      };
      return b.debug("[ColumnVisibility] Migrating V1 prefs to V2 format"), this.savePrefs(r), r;
    } catch (e) {
      return b.warn("Failed to load column preferences:", e), null;
    }
  }
  savePrefs(e) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(e));
    } catch (t) {
      b.warn("Failed to save column preferences:", t);
    }
  }
  clearSavedPrefs() {
    try {
      localStorage.removeItem(this.storageKey), this.cachedOrder = null, b.debug("[ColumnVisibility] Preferences cleared");
    } catch (e) {
      b.warn("Failed to clear column preferences:", e);
    }
  }
}, Ca = class extends ta {
  constructor(e, t) {
    const r = t.localStorageKey || `${t.resource}_datatable_columns`;
    if (super(e, r), this.syncTimeout = null, this.serverPrefs = null, this.mutationQueue = Promise.resolve(), this.resource = t.resource, this.preferencesEndpoint = String(t.preferencesEndpoint || "").trim().replace(/\/+$/, ""), !this.preferencesEndpoint) throw new Error("ServerColumnVisibilityBehavior requires an advertised preferences endpoint");
    this.syncDebounce = t.syncDebounce ?? 1e3, this.loadTimeoutMs = Math.max(100, t.loadTimeoutMs || Zn), this.canWrite = t.canWrite !== !1;
  }
  get serverPrefsKey() {
    return `ui.datagrid.${this.resource}.columns`;
  }
  toggleColumn(e, t) {
    super.toggleColumn(e, t), this.scheduleServerSync(t);
  }
  reorderColumns(e, t) {
    super.reorderColumns(e, t), this.scheduleServerSync(t);
  }
  async loadFromServer() {
    const e = typeof AbortController < "u" ? new AbortController() : null, t = setTimeout(() => {
      e?.abort();
    }, this.loadTimeoutMs);
    try {
      const r = await A(this.preferencesEndpoint, {
        method: "GET",
        credentials: "same-origin",
        signal: e?.signal,
        headers: { Accept: "application/json" }
      });
      if (!r.ok)
        return b.warn("[ServerColumnVisibility] Failed to load server prefs:", r.status), null;
      const n = (await r.json()).records || [];
      if (n.length === 0)
        return b.debug("[ServerColumnVisibility] No server preferences found"), null;
      const a = n[0]?.raw;
      if (!a || !a[this.serverPrefsKey])
        return b.debug("[ServerColumnVisibility] No column preferences in server response"), null;
      const o = a[this.serverPrefsKey];
      return Ne(o) ? (this.serverPrefs = o, this.savePrefs(o), b.debug("[ServerColumnVisibility] Loaded prefs from server:", o), o) : (b.warn("[ServerColumnVisibility] Server prefs not in V2 format:", o), null);
    } catch (r) {
      return ea(r) || b.warn("[ServerColumnVisibility] Error loading server prefs:", r), null;
    } finally {
      clearTimeout(t);
    }
  }
  getInitialPrefs(e) {
    const t = this.serverPrefs;
    if (t) {
      const r = /* @__PURE__ */ new Set();
      Object.entries(t.visibility).forEach(([a, o]) => {
        o || r.add(a);
      });
      const n = new Set(e);
      return {
        hiddenColumns: r,
        columnOrder: (t.order || []).filter((a) => n.has(a))
      };
    }
    return {
      hiddenColumns: this.loadHiddenColumnsFromCache(e),
      columnOrder: this.loadColumnOrderFromCache(e)
    };
  }
  scheduleServerSync(e) {
    this.canWrite && (this.syncTimeout && clearTimeout(this.syncTimeout), this.syncTimeout = setTimeout(() => {
      this.syncTimeout = null, this.enqueueServerMutation(() => this.syncToServer(e));
    }, this.syncDebounce));
  }
  cancelScheduledServerSync() {
    this.syncTimeout && (clearTimeout(this.syncTimeout), this.syncTimeout = null);
  }
  enqueueServerMutation(e) {
    this.mutationQueue = this.mutationQueue.then(e, e);
  }
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
      const n = await A(this.preferencesEndpoint, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        json: { raw: { [this.serverPrefsKey]: r } }
      });
      if (!n.ok) {
        b.warn("[ServerColumnVisibility] Failed to sync to server:", n.status);
        return;
      }
      this.serverPrefs = r, b.debug("[ServerColumnVisibility] Synced prefs to server:", r);
    } catch (n) {
      b.warn("[ServerColumnVisibility] Error syncing to server:", n);
    }
  }
  clearSavedPrefs() {
    this.cancelScheduledServerSync(), super.clearSavedPrefs(), this.serverPrefs = null, this.canWrite && this.enqueueServerMutation(() => this.clearServerPrefs());
  }
  async clearServerPrefs() {
    try {
      const e = await A(this.preferencesEndpoint, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        json: { clear_raw_keys: [this.serverPrefsKey] }
      });
      if (!e.ok) {
        b.warn("[ServerColumnVisibility] Failed to clear server prefs:", e.status);
        return;
      }
      b.debug("[ServerColumnVisibility] Server prefs cleared");
    } catch (e) {
      b.warn("[ServerColumnVisibility] Error clearing server prefs:", e);
    } finally {
      this.serverPrefs = null;
    }
  }
};
export {
  gt as C,
  ba as S,
  q as _,
  wa as a,
  jt as b,
  ya as c,
  L as d,
  jr as f,
  Ut as g,
  zt as h,
  va as i,
  Ie as l,
  zr as m,
  Ca as n,
  ga as o,
  $e as p,
  Aa as r,
  Sa as s,
  ta as t,
  Qr as u,
  _e as v,
  Dt as x,
  Ft as y
};

//# sourceMappingURL=go-crud-T7_YJLT8.js.map