import { escapeAttribute as f, escapeHTML as d } from "../shared/html.js";
import { t as Kt } from "../chunks/icon-renderer-DauoBn1n.js";
import { n as Jt, r as Fe } from "../chunks/modal-3jeDrPyW.js";
import { t as O } from "../chunks/toast-manager-BXCGGKRA.js";
import { httpRequest as C, readHTTPError as $e, readHTTPJSON as Ze, readHTTPJSONObject as Qt, readHTTPJSONValue as et } from "../shared/transport/http-client.js";
import { createStructuredActionError as re, executeActionRequest as Ae, executeStructuredRequest as tt, extractErrorMessage as Yt, extractExchangeError as ja, extractTranslationBlocker as Wt, formatStructuredErrorForDisplay as q, generateExchangeReport as Na, getStructuredActionError as V, groupRowResultsByStatus as za, isExchangeError as Ga, isHandledActionError as M, isTranslationBlocker as Xt, parseImportResult as Ua } from "../toast/error-helpers.js";
import { closeActionMenu as Zt, defaultActionMenuPositioner as er, initActionMenus as tr } from "../shared/action-menu.js";
import { n as rr, t as se } from "../chunks/badge-D5ShfcsT.js";
import { $ as Ja, A as Qa, B as rt, C as sr, D as Ya, E as nr, F as Wa, G as Xa, H as Za, I as st, J as eo, K as to, L as ro, M as so, N as no, O as io, P as ao, Q as oo, R as lo, S as ir, T as co, U as uo, V as Ee, W as ho, X as ar, Y as j, Z as po, _ as nt, a as or, at as it, b as lr, c as cr, d as dr, et as fo, f as ur, g as ke, h as hr, i as mo, it as pr, j as go, k as bo, l as fr, m as mr, n as gr, nt as at, o as yo, ot as br, p as vo, q as yr, r as wo, rt as ot, s as vr, st as lt, t as xo, tt as So, u as Le, v as Co, w as wr, x as $o, y as Ao, z as Eo } from "../chunks/grouped-mode-BeogW5_G.js";
import { buildURL as qe, deleteSearchParams as Oe } from "../shared/query-state/url-state.js";
import { t as xr } from "../chunks/sortable.esm-ChQrsKAN.js";
import { r as Sr, t as Cr } from "../chunks/translation-contracts-C_O37O2-.js";
import { t as ct } from "../chunks/stateful-controller-BhTsWevz.js";
var dt = { async prompt(e) {
  const { PayloadInputModal: t } = await import("../chunks/payload-modal-8i1sOycU.js");
  return t.prompt(e);
} }, $r = 0, Ar = class {
  constructor(e = {}) {
    this.actionBasePath = e.actionBasePath || "", this.mode = e.mode || "dropdown", this.notifier = e.notifier || new O();
    const t = this.sanitize(e.domIdPrefix || "grid") || "grid";
    this.domNamespace = `${t}-${++$r}`, this.rowRenderSeq = 0;
  }
  renderRowActions(e, t) {
    const r = `${this.domNamespace}-row-${++this.rowRenderSeq}`;
    if (this.mode === "dropdown") return this.renderRowActionsDropdown(e, t, r);
    const s = this.getVisibleActions(e, t);
    return s.length === 0 ? '<div class="admin-datagrid__action-list flex justify-end gap-2"></div>' : `<div class="admin-datagrid__action-list flex justify-end gap-2">${s.map(({ action: n, sourceIndex: i }) => {
      const a = this.getVariantClass(n.variant || "secondary"), o = n.icon ? this.renderIcon(n.icon) : "", l = n.className || "", c = n.disabled === !0, u = this.getActionKey(n, i), h = c ? "opacity-50 cursor-not-allowed" : "", p = c ? 'aria-disabled="true"' : "", m = c && n.disabledReason ? `${r}-${u}-disabled-reason` : "", v = m ? `aria-describedby="${f(m)}"` : "", y = c && n.disabledReason ? `${n.label} unavailable: ${n.disabledReason}` : n.label, b = m ? `<span id="${f(m)}" class="sr-only">${d(n.disabledReason || "Action unavailable")}</span>` : "", x = n.disabledReason ? `title="${f(n.disabledReason)}"` : "";
      return `
        <button
          type="button"
          class="admin-datagrid__action btn btn-sm ${f(a)} ${f(l)} ${h}"
          data-action-id="${f(this.sanitize(n.label))}"
          data-action-key="${f(u)}"
          data-record-id="${f(e.id)}"
          data-disabled="${c}"
          ${p}
          aria-label="${f(y)}"
          ${v}
          ${x}
        >
          ${o}
          ${d(n.label)}
        </button>
        ${b}
      `;
    }).join("")}</div>`;
  }
  renderRowActionsDropdown(e, t, r) {
    const s = this.getVisibleActions(e, t);
    if (s.length === 0) return '<div class="admin-datagrid__actions-empty text-sm text-gray-400">No actions</div>';
    const n = `${r}-menu`, i = this.buildDropdownItems(e, s, r);
    return `
      <div class="actions-dropdown" data-dropdown>
        <button type="button"
                class="actions-menu-trigger"
                data-dropdown-trigger
                aria-label="Actions menu"
                aria-haspopup="true"
                aria-expanded="false"
                aria-controls="${f(n)}">
          ${this.renderDotsIcon()}
        </button>

        <div id="${f(n)}"
             class="actions-menu hidden"
             role="menu"
             aria-orientation="vertical">
          ${i}
        </div>
      </div>
    `;
  }
  buildDropdownItems(e, t, r) {
    return t.map(({ action: s, sourceIndex: n }, i) => {
      const a = s.variant === "danger", o = s.disabled === !0, l = this.getActionKey(s, n), c = s.icon ? this.renderIcon(s.icon) : "", u = this.shouldShowDivider(s, i), h = o ? (s.disabledReason || "Action unavailable").trim() : "", p = h ? `${r}-${l}-disabled-reason` : "", m = u ? '<div class="action-divider"></div>' : "", v = o ? "action-item action-item--disabled" : a ? "action-item action-item--danger" : "action-item", y = o ? 'aria-disabled="true"' : "", b = p ? `aria-describedby="${f(p)}"` : "", x = h ? `${s.label} unavailable: ${h}` : s.label, S = s.disabledReason ? `title="${f(s.disabledReason)}"` : "", w = h ? `<span id="${f(p)}" class="action-item-reason">${d(h)}</span>` : "";
      return `
        ${m}
        <button type="button"
                class="${f(v)}"
                data-action-id="${f(this.sanitize(s.label))}"
                data-action-key="${f(l)}"
                data-record-id="${f(e.id)}"
                data-disabled="${o}"
                role="menuitem"
                ${y}
                aria-label="${f(x)}"
                ${b}
                ${S}>
          <span class="action-item__icon">${c}</span>
          <span class="action-item__content">
            <span class="action-item__label">${d(s.label)}</span>
            ${w}
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
      <svg class="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/>
      </svg>
    `;
  }
  renderDefaultActions(e, t) {
    return '<div class="text-sm text-gray-400">Use core.ts for default actions</div>';
  }
  attachRowActionListeners(e, t, r, s = {}) {
    t.forEach((n, i) => {
      const a = this.getActionKey(n, i), o = e.querySelector(`[data-action-key="${a}"]`);
      o && o.addEventListener("click", async (l) => {
        if (l.preventDefault(), o.getAttribute("aria-disabled") === "true" || o.dataset.disabled === "true") return;
        const c = o.closest(".actions-menu");
        c && Zt(c);
        try {
          await n.action(r);
        } catch (u) {
          if (console.error(`Action "${n.label}" failed:`, u), s.onError) {
            await s.onError(u, n, r);
            return;
          }
          const h = u instanceof Error ? u.message : `Action "${n.label}" failed`;
          this.notifier.error(h);
        }
      });
    });
  }
  renderBulkActionsToolbar(e) {
    const t = document.createElement("div");
    t.id = "bulk-actions-bar", t.className = "hidden bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 flex items-center gap-4";
    const r = document.createElement("span");
    r.className = "text-sm font-medium text-blue-900", r.id = "selected-count", r.textContent = "0 items selected", t.appendChild(r);
    const s = document.createElement("div");
    s.className = "flex gap-2 flex-1", e.forEach((i) => {
      const a = document.createElement("button");
      a.type = "button", a.className = "btn btn-sm btn-primary", a.dataset.bulkAction = i.id, i.icon ? a.innerHTML = `${this.renderIcon(i.icon)} ${i.label}` : a.textContent = i.label, s.appendChild(a);
    }), t.appendChild(s);
    const n = document.createElement("button");
    return n.type = "button", n.className = "btn btn-sm btn-secondary", n.id = "clear-selection-btn", n.textContent = "Clear Selection", t.appendChild(n), t;
  }
  async executeBulkAction(e, t) {
    if (e.guard && !e.guard(t)) {
      console.warn(`Bulk action "${e.id}" guard failed`);
      return;
    }
    if (e.confirm) {
      const s = e.confirm.replace("{count}", t.length.toString());
      if (!await this.notifier.confirm(s)) return;
    }
    const r = await this.resolveBulkActionPayload(e, t);
    if (r !== null)
      try {
        const s = await tt(e.endpoint, {
          method: e.method || "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json"
          },
          body: JSON.stringify(r)
        }, async (i) => {
          const a = await et(i, void 0);
          return {
            success: !0,
            data: a === void 0 ? void 0 : a
          };
        });
        if (!s.success) {
          const i = s.error, a = i ? q(i, `Bulk action '${e.id}' failed`) : `Bulk action '${e.id}' failed`;
          throw e.onError || this.notifier.error(a), i ? re(i, `Bulk action '${e.id}' failed`, !0) : re({
            textCode: null,
            message: a,
            metadata: null,
            fields: null,
            validationErrors: null
          }, `Bulk action '${e.id}' failed`, !0);
        }
        const n = s.data;
        this.notifier.success(this.buildBulkSuccessMessage(e, n, t.length)), e.onSuccess && e.onSuccess(n);
      } catch (s) {
        if (console.error(`Bulk action "${e.id}" failed:`, s), !e.onError && !M(s)) {
          const n = s instanceof Error ? s.message : "Bulk action failed";
          this.notifier.error(n);
        }
        throw e.onError && e.onError(s), s;
      }
  }
  async resolveBulkActionPayload(e, t) {
    const r = {
      ...e.payload || {},
      ids: t
    }, s = this.normalizePayloadSchema(e.payloadSchema);
    s?.properties && Object.entries(s.properties).forEach(([a, o]) => {
      r[a] === void 0 && o && o.default !== void 0 && (r[a] = o.default);
    });
    const n = this.collectRequiredFields(e.payloadRequired, s).filter((a) => a !== "ids" && this.isEmptyPayloadValue(r[a]));
    if (n.length === 0) return r;
    const i = await this.requestRequiredFields(e, n, s, r);
    if (i === null) return null;
    for (const a of n) {
      const o = s?.properties?.[a], l = i[a] ?? "", c = this.coercePromptValue(l, a, o);
      if (c.error)
        return this.notifier.error(c.error), null;
      r[a] = c.value;
    }
    return r;
  }
  collectRequiredFields(e, t) {
    const r = [], s = /* @__PURE__ */ new Set(), n = (i) => {
      const a = i.trim();
      !a || s.has(a) || (s.add(a), r.push(a));
    };
    return Array.isArray(e) && e.forEach((i) => n(String(i))), Array.isArray(t?.required) && t.required.forEach((i) => n(String(i))), r;
  }
  normalizePayloadSchema(e) {
    if (!e || typeof e != "object") return null;
    const t = e.properties;
    let r;
    return t && typeof t == "object" && (r = {}, Object.entries(t).forEach(([s, n]) => {
      n && typeof n == "object" && (r[s] = n);
    })), {
      type: typeof e.type == "string" ? e.type : void 0,
      required: e.required,
      properties: r
    };
  }
  async requestRequiredFields(e, t, r, s) {
    const n = t.map((i) => {
      const a = r?.properties?.[i], o = typeof a?.type == "string" ? a.type.toLowerCase() : "string";
      return {
        name: i,
        label: (a?.title || i).trim(),
        description: (a?.description || "").trim() || void 0,
        value: this.stringifyPromptDefault(s[i] !== void 0 ? s[i] : a?.default),
        type: o,
        options: this.buildSchemaOptions(a)
      };
    });
    return dt.prompt({
      title: `Complete ${e.label || e.id}`,
      fields: n
    });
  }
  buildSchemaOptions(e) {
    if (e) {
      if (Array.isArray(e.oneOf) && e.oneOf.length > 0) {
        const t = e.oneOf.filter((r) => r && Object.prototype.hasOwnProperty.call(r, "const")).map((r) => {
          const s = this.stringifyPromptDefault(r.const);
          return {
            value: s,
            label: typeof r.title == "string" && r.title.trim() ? r.title.trim() : s
          };
        });
        return t.length > 0 ? t : void 0;
      }
      if (Array.isArray(e.enum) && e.enum.length > 0) {
        const t = e.enum.map((r) => {
          const s = this.stringifyPromptDefault(r);
          return {
            value: s,
            label: s
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
      const i = r.oneOf.find((a) => a && Object.prototype.hasOwnProperty.call(a, "const") && this.stringifyPromptDefault(a.const) === e);
      return !i || !Object.prototype.hasOwnProperty.call(i, "const") ? {
        value: e,
        error: `${t} must be one of: ${r.oneOf.map((a) => typeof a?.title == "string" && a.title.trim() ? a.title.trim() : this.stringifyPromptDefault(a.const)).filter((a) => a !== "").join(", ")}`
      } : { value: i.const };
    }
    const s = (r?.type || "string").toLowerCase();
    if (e === "") return { value: "" };
    let n = e;
    switch (s) {
      case "integer": {
        const i = Number.parseInt(e, 10);
        if (Number.isNaN(i)) return {
          value: e,
          error: `${t} must be an integer.`
        };
        n = i;
        break;
      }
      case "number": {
        const i = Number.parseFloat(e);
        if (Number.isNaN(i)) return {
          value: e,
          error: `${t} must be a number.`
        };
        n = i;
        break;
      }
      case "boolean": {
        const i = e.toLowerCase();
        if ([
          "true",
          "1",
          "yes",
          "y",
          "on"
        ].includes(i)) {
          n = !0;
          break;
        }
        if ([
          "false",
          "0",
          "no",
          "n",
          "off"
        ].includes(i)) {
          n = !1;
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
          const i = JSON.parse(e);
          if (s === "array" && !Array.isArray(i)) return {
            value: e,
            error: `${t} must be a JSON array.`
          };
          if (s === "object" && (i === null || Array.isArray(i) || typeof i != "object")) return {
            value: e,
            error: `${t} must be a JSON object.`
          };
          n = i;
        } catch {
          return {
            value: e,
            error: `${t} must be valid JSON.`
          };
        }
        break;
      default:
        n = e;
    }
    return Array.isArray(r?.enum) && r.enum.length > 0 && !r.enum.some((i) => i === n || String(i) === String(n)) ? {
      value: n,
      error: `${t} must be one of: ${r.enum.map((i) => String(i)).join(", ")}`
    } : { value: n };
  }
  isEmptyPayloadValue(e) {
    return e == null ? !0 : typeof e == "string" ? e.trim() === "" : Array.isArray(e) ? e.length === 0 : typeof e == "object" ? Object.keys(e).length === 0 : !1;
  }
  buildBulkSuccessMessage(e, t, r) {
    const s = e.label || e.id || "Bulk action", n = t && typeof t == "object" ? t.summary : null, i = n && typeof n.succeeded == "number" ? n.succeeded : typeof t?.processed == "number" ? t.processed : r, a = n && typeof n.failed == "number" ? n.failed : 0;
    return a > 0 ? `${s} completed: ${i} succeeded, ${a} failed.` : `${s} completed for ${i} item${i === 1 ? "" : "s"}.`;
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
    const r = typeof e.id == "string" ? e.id.trim() : "", s = this.sanitize(r || e.label) || "action";
    return `action-${t + 1}-${s}`;
  }
  getVisibleActions(e, t) {
    return t.map((r, s) => ({
      action: r,
      sourceIndex: s
    })).filter(({ action: r }) => !r.condition || r.condition(e));
  }
  sanitize(e) {
    return e.toLowerCase().replace(/[^a-z0-9]/g, "-");
  }
}, Er = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})\.(\d+)(Z|[+-]\d{2}:\d{2})$/;
function Z(e) {
  return !Number.isNaN(e.getTime());
}
function kr(e) {
  const t = e.trim(), r = t.match(Er);
  if (!r) return t;
  const [, s, n, i] = r;
  return n.length <= 3 ? t : `${s}.${n.slice(0, 3)}${i}`;
}
function ne(e) {
  if (e instanceof Date) return Z(e) ? new Date(e.getTime()) : null;
  if (typeof e == "number") {
    const i = new Date(e);
    return Z(i) ? i : null;
  }
  if (typeof e != "string") return null;
  const t = e.trim();
  if (!t) return null;
  const r = new Date(t);
  if (Z(r)) return r;
  const s = kr(t);
  if (s === t) return null;
  const n = new Date(s);
  return Z(n) ? n : null;
}
function _(e) {
  const t = {
    requestedLocale: null,
    resolvedLocale: null,
    availableLocales: [],
    missingRequestedLocale: !1,
    fallbackUsed: !1,
    familyId: null,
    status: null,
    entityType: null,
    recordId: null
  };
  return !e || typeof e != "object" || (t.requestedLocale = T(e, ["requested_locale"]), t.resolvedLocale = T(e, ["resolved_locale", "locale"]), t.availableLocales = Ir(e, ["available_locales"]), t.missingRequestedLocale = Ne(e, ["missing_requested_locale"]), t.fallbackUsed = Ne(e, ["fallback_used"]), t.familyId = T(e, ["family_id"]), t.status = T(e, ["status"]), t.entityType = T(e, [
    "entity_type",
    "type",
    "_type"
  ]), t.recordId = T(e, ["id"]), !t.fallbackUsed && t.requestedLocale && t.resolvedLocale && (t.fallbackUsed = t.requestedLocale !== t.resolvedLocale), !t.missingRequestedLocale && t.fallbackUsed && (t.missingRequestedLocale = !0)), t;
}
function Po(e) {
  const t = _(e);
  return t.fallbackUsed || t.missingRequestedLocale;
}
function To(e) {
  const t = _(e);
  return t.familyId !== null || t.resolvedLocale !== null || t.availableLocales.length > 0;
}
function L(e, t = {}, r = "neutral") {
  const s = e.trim();
  if (!s) return "";
  const { size: n = "sm", extraClass: i = "" } = t;
  return `<span class="inline-flex items-center rounded-full border font-medium ${n === "sm" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-1"} ${r === "info" ? "bg-blue-50 text-blue-700 border-blue-200" : r === "warning" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-slate-100 text-slate-700 border-slate-200"} ${i}">${d(s)}</span>`;
}
function ut(e, t) {
  if (!e || typeof e != "object" || Array.isArray(e)) return null;
  const r = e, s = r[t];
  return s && typeof s == "object" && !Array.isArray(s) ? s : r;
}
function F(e, t) {
  for (const r of t) {
    const s = e[r];
    if (typeof s == "string" && s.trim()) return s.trim();
  }
  return "";
}
function be(e, t) {
  for (const r of t) {
    const s = e[r];
    if (typeof s == "number" && Number.isFinite(s)) return Math.trunc(s);
    if (typeof s == "string" && s.trim()) {
      const n = Number(s);
      if (Number.isFinite(n)) return Math.trunc(n);
    }
  }
  return null;
}
function ht(e) {
  const t = typeof e.family_member_count == "number" ? Math.trunc(e.family_member_count) : Number(e.family_member_count);
  if (Number.isFinite(t) && t > 0) return Math.trunc(t);
  const r = A(e);
  if (r.availableLocales.length > 0) return r.availableLocales.length;
  const s = _(e);
  return s.availableLocales.length > 0 ? s.availableLocales.length : s.resolvedLocale ? 1 : null;
}
function Do(e, t = {}) {
  const r = typeof e.translation_family_url == "string" ? e.translation_family_url.trim() : "";
  if (!r) return '<span class="text-gray-400">-</span>';
  const s = ht(e), n = s && s > 0 ? L(`${s} ${s === 1 ? "locale" : "locales"}`, t, "info") : "";
  return `
    <div class="inline-flex items-center gap-2">
      <a href="${f(r)}" class="text-sm font-medium text-blue-700 hover:text-blue-800 hover:underline">View family</a>
      ${n}
    </div>
  `.trim();
}
function Mo(e, t = {}) {
  const r = ht(e);
  return !r || r <= 0 ? '<span class="text-gray-400">-</span>' : L(`${r} ${r === 1 ? "locale" : "locales"}`, t, "info");
}
function Io(e, t = {}) {
  const r = ut(e, "translation_assignment_summary");
  if (!r) return '<span class="text-gray-400">-</span>';
  const s = F(r, ["status"]), n = F(r, ["label"]), i = F(r, ["assignee_id"]), a = F(r, ["priority"]), o = be(r, ["active_count", "open_count"]), l = [];
  return s ? l.push(j(s, {
    domain: "queue",
    size: "sm",
    showIcon: !1
  })) : n && l.push(L(n, t, "info")), o !== null && o >= 0 && l.push(L(`${o} active`, t, "neutral")), i && l.push(L(`@${i}`, t, "neutral")), a && l.push(L(a, t, a === "urgent" || a === "high" ? "warning" : "neutral")), l.length === 0 ? '<span class="text-gray-400">-</span>' : `<div class="inline-flex items-center gap-1.5 flex-wrap">${l.join("")}</div>`;
}
function Bo(e, t = {}) {
  const r = ut(e, "translation_exchange_summary");
  if (!r) return '<span class="text-gray-400">-</span>';
  const s = F(r, ["status", "last_job_status"]), n = F(r, ["label", "last_job_label"]), i = be(r, ["pending_count"]), a = be(r, ["error_count"]), o = [];
  return s ? o.push(j(s, {
    domain: "exchange",
    size: "sm",
    showIcon: !1
  })) : n && o.push(L(n, t, "info")), i !== null && i >= 0 && o.push(L(`${i} pending`, t, "neutral")), a !== null && a > 0 && o.push(L(`${a} errors`, t, "warning")), o.length === 0 ? '<span class="text-gray-400">-</span>' : `<div class="inline-flex items-center gap-1.5 flex-wrap">${o.join("")}</div>`;
}
function A(e) {
  const t = {
    familyId: null,
    requiredLocales: [],
    availableLocales: [],
    missingRequiredLocales: [],
    missingRequiredFieldsByLocale: {},
    readinessState: null,
    readyForTransition: {},
    evaluatedChannel: null,
    hasReadinessMetadata: !1
  };
  if (!e || typeof e != "object") return t;
  const r = e.translation_readiness;
  if (r && typeof r == "object") {
    t.hasReadinessMetadata = !0, t.familyId = T(e, ["translation_readiness.family_id", "family_id"]), t.requiredLocales = Array.isArray(r.required_locales) ? r.required_locales.filter((a) => typeof a == "string") : [], t.availableLocales = Array.isArray(r.available_locales) ? r.available_locales.filter((a) => typeof a == "string") : [], t.missingRequiredLocales = Array.isArray(r.missing_required_locales) ? r.missing_required_locales.filter((a) => typeof a == "string") : [];
    const s = r.missing_required_fields_by_locale;
    if (s && typeof s == "object" && !Array.isArray(s))
      for (const [a, o] of Object.entries(s)) Array.isArray(o) && (t.missingRequiredFieldsByLocale[a] = o.filter((l) => typeof l == "string"));
    const n = r.readiness_state;
    typeof n == "string" && Lr(n) && (t.readinessState = n);
    const i = r.ready_for_transition;
    if (i && typeof i == "object" && !Array.isArray(i))
      for (const [a, o] of Object.entries(i)) typeof o == "boolean" && (t.readyForTransition[a] = o);
    t.evaluatedChannel = typeof r.evaluated_channel == "string" ? r.evaluated_channel : null;
  }
  return t;
}
function Fo(e) {
  return A(e).hasReadinessMetadata;
}
function qo(e, t) {
  return A(e).readyForTransition[t] === !0;
}
function Lr(e) {
  return [
    "ready",
    "missing_locales",
    "missing_fields",
    "missing_locales_and_fields"
  ].includes(e);
}
function pt(e, t = {}) {
  const r = "resolvedLocale" in e ? e : _(e), { showFallbackIndicator: s = !0, size: n = "default", extraClass: i = "" } = t;
  if (!r.resolvedLocale) return "";
  const a = r.resolvedLocale.toUpperCase(), o = r.fallbackUsed || r.missingRequestedLocale, l = `inline-flex items-center gap-1 rounded font-medium ${n === "sm" ? "text-xs px-1.5 py-0.5" : "text-xs px-2 py-1"}`;
  return o && s ? `<span class="${l} bg-amber-100 text-amber-800 ${i}"
                  title="Showing ${r.resolvedLocale} content (${r.requestedLocale || "requested locale"} not available)"
                  aria-label="Fallback locale: ${a}">
      <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
      </svg>
      ${a}
    </span>` : `<span class="${l} bg-blue-100 text-blue-800 ${i}"
                title="Locale: ${a}"
                aria-label="Locale: ${a}">
    ${a}
  </span>`;
}
function _r(e, t = {}) {
  const r = "resolvedLocale" in e ? e : _(e), { maxLocales: s = 3, size: n = "default" } = t;
  if (r.availableLocales.length === 0) return "";
  const i = n === "sm" ? "text-xs gap-0.5" : "text-xs gap-1", a = n === "sm" ? "px-1 py-0.5 text-[10px]" : "px-1.5 py-0.5", o = r.availableLocales.slice(0, s), l = r.availableLocales.length - s, c = o.map((h) => `<span class="${h === r.resolvedLocale ? `${a} rounded bg-blue-100 text-blue-700 font-medium` : `${a} rounded bg-gray-100 text-gray-600`}">${h.toUpperCase()}</span>`).join(""), u = l > 0 ? `<span class="${a} rounded bg-gray-100 text-gray-500">+${l}</span>` : "";
  return `<span class="inline-flex items-center ${i}"
                title="Available locales: ${r.availableLocales.join(", ")}"
                aria-label="Available locales: ${r.availableLocales.join(", ")}">
    ${c}${u}
  </span>`;
}
function Rr(e, t = {}) {
  const r = "resolvedLocale" in e ? e : _(e), { showResolvedLocale: s = !0, size: n = "default" } = t, i = [];
  return s && r.resolvedLocale && i.push(pt(r, {
    size: n,
    showFallbackIndicator: !0
  })), r.availableLocales.length > 1 && i.push(_r(r, {
    ...t,
    size: n
  })), i.length === 0 ? '<span class="text-gray-400">-</span>' : `<div class="flex items-center flex-wrap ${n === "sm" ? "gap-1" : "gap-2"}">${i.join("")}</div>`;
}
function Oo(e, t = "default") {
  if (!e) return "";
  const r = e.trim();
  if (Ee(r) !== null) return j(r, { size: t === "sm" ? "sm" : "default" });
  const s = r.toLowerCase();
  return se(e, "status", s, { size: t === "sm" ? "sm" : void 0 });
}
function jo(e, t = {}) {
  const r = A(e);
  if (!r.hasReadinessMetadata) return "";
  const { size: s = "default", showDetailedTooltip: n = !0, extraClass: i = "" } = t, a = `inline-flex items-center gap-1 rounded font-medium ${s === "sm" ? "text-xs px-1.5 py-0.5" : "text-xs px-2 py-1"}`, o = r.readinessState || "ready", { icon: l, label: c, bgClass: u, textClass: h, tooltip: p } = Pr(o, r, n);
  return `<span class="${a} ${u} ${h} ${i}"
                title="${p}"
                aria-label="${c}"
                data-readiness-state="${o}">
    ${l}
    <span>${c}</span>
  </span>`;
}
function No(e, t = {}) {
  const r = A(e);
  if (!r.hasReadinessMetadata) return "";
  const s = r.readyForTransition.publish === !0, { size: n = "default", extraClass: i = "" } = t, a = n === "sm" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-1";
  if (s) return `<span class="inline-flex items-center gap-1 rounded font-medium ${a} bg-green-100 text-green-700 ${i}"
                  title="Ready to publish"
                  aria-label="Ready to publish">
      <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
      </svg>
      Ready
    </span>`;
  const o = r.missingRequiredLocales.length;
  return `<span class="inline-flex items-center gap-1 rounded font-medium ${a} bg-amber-100 text-amber-700 ${i}"
                title="${o > 0 ? `Missing translations: ${r.missingRequiredLocales.join(", ")}` : "Not ready to publish"}"
                aria-label="Not ready to publish">
    <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
      <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
    </svg>
    ${o > 0 ? `${o} missing` : "Not ready"}
  </span>`;
}
function zo(e, t = {}) {
  const r = A(e);
  if (!r.hasReadinessMetadata || r.requiredLocales.length === 0) return "";
  const { size: s = "default", extraClass: n = "" } = t, i = s === "sm" ? "text-xs" : "text-sm", a = r.requiredLocales.length, o = r.availableLocales.filter((l) => r.requiredLocales.includes(l)).length;
  return `<span class="${i} ${a > 0 && o === a ? "text-green-600" : o > 0 ? "text-amber-600" : "text-gray-500"} font-medium ${n}"
                title="Locale completeness: ${o} of ${a} required locales available"
                aria-label="${o} of ${a} locales">
    ${o}/${a}
  </span>`;
}
function Go(e, t = {}) {
  const r = A(e);
  if (!r.hasReadinessMetadata || r.readinessState === "ready") return "";
  const { size: s = "default", extraClass: n = "" } = t, i = s === "sm" ? "text-xs px-2 py-1" : "text-sm px-2.5 py-1", a = r.missingRequiredLocales.length, o = a > 0, l = Object.keys(r.missingRequiredFieldsByLocale).length > 0;
  let c = "", u = "", h = "";
  if (o && l ? (c = "missing_locales_and_fields", u = `${a} missing`, h = `Missing translations: ${r.missingRequiredLocales.join(", ")}. Also has incomplete fields.`) : o ? (c = "missing_locales", u = `${a} missing`, h = `Missing translations: ${r.missingRequiredLocales.join(", ")}`) : l && (c = "missing_fields", u = "Incomplete", h = `Incomplete fields in: ${Object.keys(r.missingRequiredFieldsByLocale).join(", ")}`), !u) return "";
  const p = Ee(c, "core");
  return `<span class="inline-flex items-center gap-1.5 rounded-full font-medium ${i} ${p?.bgClass || "bg-amber-50"} ${p?.textClass || "text-amber-700"} ${n}"
                title="${h}"
                aria-label="${h}"
                data-missing-translations="true"
                data-missing-count="${a}">
    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
    <span>${u}</span>
  </span>`;
}
function Uo(e) {
  const t = A(e);
  return t.hasReadinessMetadata ? t.readinessState !== "ready" : !1;
}
function Ho(e) {
  return A(e).missingRequiredLocales.length;
}
function Pr(e, t, r) {
  const s = Ee(e, "core"), n = s ? ar(s, "sm") : "", i = s?.bgClass || "bg-gray-100", a = s?.textClass || "text-gray-600", o = s?.label || "Unknown", l = s?.description || "Unknown readiness state";
  switch (e) {
    case "ready":
      return {
        icon: n,
        label: o,
        bgClass: i,
        textClass: a,
        tooltip: l
      };
    case "missing_locales": {
      const c = t.missingRequiredLocales, u = r && c.length > 0 ? `Missing translations: ${c.join(", ")}` : "Missing required translations";
      return {
        icon: n,
        label: `${c.length} missing`,
        bgClass: i,
        textClass: a,
        tooltip: u
      };
    }
    case "missing_fields": {
      const c = Object.keys(t.missingRequiredFieldsByLocale);
      return {
        icon: n,
        label: "Incomplete",
        bgClass: i,
        textClass: a,
        tooltip: r && c.length > 0 ? `Incomplete fields in: ${c.join(", ")}` : "Some translations have missing required fields"
      };
    }
    case "missing_locales_and_fields": {
      const c = t.missingRequiredLocales, u = Object.keys(t.missingRequiredFieldsByLocale), h = [];
      return c.length > 0 && h.push(`Missing: ${c.join(", ")}`), u.length > 0 && h.push(`Incomplete: ${u.join(", ")}`), {
        icon: n,
        label: "Not ready",
        bgClass: i,
        textClass: a,
        tooltip: r ? h.join("; ") : "Missing translations and incomplete fields"
      };
    }
    default:
      return {
        icon: n,
        label: o,
        bgClass: i,
        textClass: a,
        tooltip: l
      };
  }
}
function Tr(e, t = {}) {
  const { size: r = "sm", maxLocales: s = 5, showLabels: n = !1 } = t, i = A(e);
  if (!i.hasReadinessMetadata) return '<span class="text-gray-400">-</span>';
  const { requiredLocales: a, availableLocales: o, missingRequiredFieldsByLocale: l } = i, c = a.length > 0 ? a : o;
  if (c.length === 0) return '<span class="text-gray-400">-</span>';
  const u = new Set(o), h = Dr(l);
  return `<div class="flex items-center gap-1 flex-wrap" data-matrix-cell="true">${c.slice(0, s).map((p) => {
    const m = u.has(p), v = m && h.has(p), y = m && !v;
    let b, x, S;
    y ? (b = "bg-green-100 text-green-700 border-green-300", x = "●", S = "Complete") : v ? (b = "bg-amber-100 text-amber-700 border-amber-300", x = "◐", S = "Incomplete") : (b = "bg-white text-gray-400 border-gray-300 border-dashed", x = "○", S = "Missing");
    const w = r === "sm" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-1", z = n ? `<span class="font-medium">${p.toUpperCase()}</span>` : "";
    return `
        <span class="inline-flex items-center gap-0.5 ${w} rounded border ${b}"
              title="${p.toUpperCase()}: ${S}"
              aria-label="${p.toUpperCase()}: ${S}"
              data-locale="${p}"
              data-state="${S.toLowerCase()}">
          ${z}
          <span aria-hidden="true">${x}</span>
        </span>
      `;
  }).join("")}${c.length > s ? `<span class="text-[10px] text-gray-500" title="${c.length - s} more locales">+${c.length - s}</span>` : ""}</div>`;
}
function Dr(e) {
  const t = /* @__PURE__ */ new Set();
  if (e && typeof e == "object")
    for (const [r, s] of Object.entries(e)) Array.isArray(s) && s.length > 0 && t.add(r);
  return t;
}
function Vo(e = {}) {
  return (t, r, s) => Tr(r, e);
}
function Ko(e, t = {}) {
  if (!e.fallbackUsed && !e.missingRequestedLocale) return "";
  const { showCreateButton: r = !0, createTranslationUrl: s, panelName: n } = t, i = e.requestedLocale || "requested locale", a = e.resolvedLocale || "default", o = r ? `
    <button type="button"
            class="inline-flex items-center gap-1 text-sm font-medium text-amber-800 hover:text-amber-900 underline"
            data-action="create-translation"
            data-locale="${e.requestedLocale || ""}"
            data-panel="${n || ""}"
            data-record-id="${e.recordId || ""}"
            ${s ? `data-url="${s}"` : ""}>
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
      </svg>
      Create ${i.toUpperCase()} translation
    </button>
  ` : "";
  return `
    <div class="fallback-warning bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4"
         role="alert"
         aria-live="polite"
         data-fallback-mode="true"
         data-requested-locale="${e.requestedLocale || ""}"
         data-resolved-locale="${e.resolvedLocale || ""}">
      <div class="flex items-start gap-3">
        <div class="flex-shrink-0">
          <svg class="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
          </svg>
        </div>
        <div class="flex-1">
          <h3 class="text-sm font-medium text-amber-800">
            Viewing fallback content
          </h3>
          <p class="mt-1 text-sm text-amber-700">
            The <strong>${i.toUpperCase()}</strong> translation doesn't exist yet.
            You're viewing content from <strong>${a.toUpperCase()}</strong>.
            <span class="block mt-1 text-amber-600">Editing is disabled until you create the missing translation.</span>
          </p>
          ${o ? `<div class="mt-3">${o}</div>` : ""}
        </div>
      </div>
    </div>
  `;
}
function je(e = {}) {
  return (t, r, s) => Rr(r, e);
}
function Mr(e = {}) {
  return (t, r, s) => pt(r, e);
}
function T(e, t) {
  for (const r of t) {
    const s = _e(e, r);
    if (typeof s == "string" && s.trim()) return s;
  }
  return null;
}
function Ir(e, t) {
  for (const r of t) {
    const s = _e(e, r);
    if (Array.isArray(s)) return s.filter((n) => typeof n == "string");
  }
  return [];
}
function Ne(e, t) {
  for (const r of t) {
    const s = _e(e, r);
    if (typeof s == "boolean") return s;
    if (s === "true") return !0;
    if (s === "false") return !1;
  }
  return !1;
}
function _e(e, t) {
  const r = t.split(".");
  let s = e;
  for (const n of r) {
    if (s == null || typeof s != "object") return;
    s = s[n];
  }
  return s;
}
var k = '<span class="text-gray-400">-</span>', Br = [
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
function Fr(e) {
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}
function qr(e) {
  const t = [], r = (n) => {
    if (typeof n != "string") return;
    const i = n.trim();
    !i || t.includes(i) || t.push(i);
  };
  r(e.display_key), r(e.displayKey);
  const s = e.display_keys ?? e.displayKeys;
  return Array.isArray(s) && s.forEach(r), t;
}
function Or(e, t) {
  if (!t) return;
  if (Object.prototype.hasOwnProperty.call(e, t)) return e[t];
  if (!t.includes(".")) return;
  const r = t.split(".");
  let s = e;
  for (const n of r) {
    if (!s || typeof s != "object" || Array.isArray(s) || !Object.prototype.hasOwnProperty.call(s, n)) return;
    s = s[n];
  }
  return s;
}
function jr(e) {
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
function ye(e, t) {
  if (e == null) return "";
  if (Array.isArray(e)) return ve(e, t);
  if (typeof e != "object") return String(e);
  const r = [...qr(t), ...Br], s = /* @__PURE__ */ new Set();
  for (const n of r) {
    if (s.has(n)) continue;
    s.add(n);
    const i = jr(Or(e, n));
    if (i) return i;
  }
  return Fr(e);
}
function ve(e, t) {
  if (!Array.isArray(e) || e.length === 0) return "";
  const r = e.map((a) => ye(a, t).trim()).filter(Boolean);
  if (r.length === 0) return "";
  const s = Number(t.preview_limit ?? t.previewLimit ?? 3), n = Number.isFinite(s) && s > 0 ? Math.floor(s) : 3, i = r.slice(0, n);
  return r.length <= n ? i.join(", ") : `${i.join(", ")} +${r.length - n} more`;
}
function Nr(e, t, r, s) {
  const n = e[t] ?? e[r] ?? s, i = Number(n);
  return Number.isFinite(i) && i > 0 ? Math.floor(i) : s;
}
function zr(e, t, r, s) {
  const n = e[t] ?? e[r];
  return n == null ? s : typeof n == "boolean" ? n : typeof n == "string" ? n.toLowerCase() === "true" || n === "1" : !!n;
}
function Gr(e, t, r, s) {
  const n = e[t] ?? e[r];
  return n == null ? s : String(n).trim() || s;
}
function Ur(e) {
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
function Hr(e) {
  switch (e) {
    case "muted":
      return "bg-gray-100 text-gray-600";
    case "outline":
      return "bg-white border border-gray-300 text-gray-700";
    default:
      return "bg-blue-50 text-blue-700";
  }
}
var Vr = class {
  constructor() {
    this.renderers = /* @__PURE__ */ new Map(), this.defaultRenderer = (e) => {
      if (e == null) return k;
      if (typeof e == "boolean") return e ? "Yes" : "No";
      if (Array.isArray(e)) {
        const t = ve(e, {});
        return t ? d(t) : k;
      }
      if (typeof e == "object") {
        const t = ye(e, {});
        return t ? d(t) : k;
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
      return se(String(e), "status", t);
    }), this.renderers.set("_date", (e) => {
      if (!e) return '<span class="text-gray-400">-</span>';
      const t = ne(e);
      return t ? t.toLocaleDateString() : String(e);
    }), this.renderers.set("_datetime", (e) => {
      if (!e) return '<span class="text-gray-400">-</span>';
      const t = ne(e);
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
      const s = Math.floor(Math.log(t) / Math.log(1024));
      return `${(t / Math.pow(1024, s)).toFixed(2)} ${r[s]}`;
    }), this.renderers.set("_truncate", (e) => {
      if (!e) return '<span class="text-gray-400">-</span>';
      const t = String(e), r = 50;
      return t.length <= r ? t : `<span title="${t}">${t.substring(0, r)}...</span>`;
    }), this.renderers.set("_array", (e, t, r, s) => {
      if (!Array.isArray(e) || e.length === 0) return k;
      const n = ve(e, s?.options || {});
      return n ? d(n) : k;
    }), this.renderers.set("_object", (e, t, r, s) => {
      if (e == null) return k;
      const n = ye(e, s?.options || {});
      return n ? d(n) : k;
    }), this.renderers.set("_tags", (e) => !Array.isArray(e) || e.length === 0 ? '<span class="text-gray-400">-</span>' : e.map((t) => `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 mr-1">${t}</span>`).join("")), this.renderers.set("blocks_chips", (e, t, r, s) => {
      if (!Array.isArray(e) || e.length === 0) return k;
      const n = s?.options || {}, i = Nr(n, "max_visible", "maxVisible", 3), a = zr(n, "show_count", "showCount", !0), o = Gr(n, "chip_variant", "chipVariant", "default"), l = n.block_icons_map || n.blockIconsMap || {}, c = [], u = e.slice(0, i);
      for (const m of u) {
        const v = Ur(m);
        if (!v) continue;
        const y = l[v] || "view-grid", b = Kt(y, {
          size: "14px",
          extraClass: "flex-shrink-0"
        }), x = Hr(o);
        c.push(`<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${x}">${b}<span>${d(v)}</span></span>`);
      }
      if (c.length === 0) return k;
      const h = e.length - i;
      let p = "";
      return a && h > 0 && (p = `<span class="px-2 py-0.5 rounded text-xs bg-gray-200 text-gray-600">+${h} more</span>`), `<div class="flex flex-wrap gap-1">${c.join("")}${p}</div>`;
    }), this.renderers.set("_image", (e) => e ? `<img src="${e}" alt="Thumbnail" class="h-10 w-10 rounded object-cover" />` : '<span class="text-gray-400">-</span>'), this.renderers.set("_avatar", (e, t) => {
      const r = t.name || t.username || t.email || "U", s = r.charAt(0).toUpperCase();
      return e ? `<img src="${e}" alt="${r}" class="h-8 w-8 rounded-full object-cover" />` : `<div class="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium text-sm">${s}</div>`;
    });
  }
}, Jo = {
  statusBadge: (e) => (t) => {
    const r = String(t).toLowerCase();
    return se(String(t), "status", r);
  },
  roleBadge: (e) => (t) => {
    const r = String(t).toLowerCase();
    return se(String(t), "role", r);
  },
  userInfo: (e, t) => {
    const r = e || t.name || t.username || "-", s = t.email || "";
    return s ? `<div><div class="font-medium text-gray-900">${r}</div><div class="text-sm text-gray-500">${s}</div></div>` : `<div class="font-medium text-gray-900">${r}</div>`;
  },
  booleanChip: (e) => (t) => rr(!!t, e),
  relativeTime: (e) => {
    if (!e) return '<span class="text-gray-400">-</span>';
    const t = ne(e);
    if (!t) return String(e);
    const r = (/* @__PURE__ */ new Date()).getTime() - t.getTime(), s = Math.floor(r / 6e4), n = Math.floor(r / 36e5), i = Math.floor(r / 864e5);
    return s < 1 ? "Just now" : s < 60 ? `${s} minute${s > 1 ? "s" : ""} ago` : n < 24 ? `${n} hour${n > 1 ? "s" : ""} ago` : i < 30 ? `${i} day${i > 1 ? "s" : ""} ago` : t.toLocaleDateString();
  },
  localeBadge: Mr(),
  translationStatus: je(),
  translationStatusCompact: je({
    size: "sm",
    maxLocales: 2
  })
}, Kr = "datagrid.state.", ue = "datagrid.share.", ft = "datagrid.share.index", Jr = 20, Qr = 1500;
function Yr(e) {
  return String(e || "").trim() || "default";
}
function he(e, t = {}) {
  if (!Array.isArray(e)) return;
  const r = e.map((s) => typeof s == "string" ? s.trim() : "").filter((s) => s.length > 0);
  return r.length === 0 ? t.allowEmpty === !0 ? [] : void 0 : Array.from(new Set(r));
}
function K(e) {
  if (!e || typeof e != "object" || Array.isArray(e)) return null;
  const t = e, r = { version: 1 };
  (t.viewMode === "flat" || t.viewMode === "grouped" || t.viewMode === "matrix") && (r.viewMode = t.viewMode), (t.expandMode === "all" || t.expandMode === "none" || t.expandMode === "explicit") && (r.expandMode = t.expandMode);
  const s = he(t.expandedGroups, { allowEmpty: !0 });
  s !== void 0 && (r.expandedGroups = s);
  const n = he(t.hiddenColumns, { allowEmpty: !0 });
  n !== void 0 && (r.hiddenColumns = n);
  const i = he(t.columnOrder);
  return i && (r.columnOrder = i), typeof t.updatedAt == "number" && Number.isFinite(t.updatedAt) && (r.updatedAt = t.updatedAt), r;
}
function ze(e) {
  if (!e || typeof e != "object" || Array.isArray(e)) return null;
  const t = e, r = { version: 1 };
  if (typeof t.search == "string") {
    const n = t.search.trim();
    n && (r.search = n);
  }
  typeof t.page == "number" && Number.isFinite(t.page) && (r.page = Math.max(1, Math.trunc(t.page))), typeof t.perPage == "number" && Number.isFinite(t.perPage) && (r.perPage = Math.max(1, Math.trunc(t.perPage))), Array.isArray(t.filters) && (r.filters = t.filters), Array.isArray(t.sort) && (r.sort = t.sort);
  const s = K(t.persisted);
  return s && (r.persisted = s), typeof t.updatedAt == "number" && Number.isFinite(t.updatedAt) && (r.updatedAt = t.updatedAt), r;
}
function mt(e) {
  const t = String(e || "").trim();
  return t ? t.replace(/\/+$/, "") : "";
}
function Wr(e) {
  return String(e || "").trim().replace(/[^a-zA-Z0-9._-]/g, "");
}
function Xr() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`.slice(0, 16);
}
function Zr(e) {
  try {
    const t = localStorage.getItem(ft);
    if (!t) return [];
    const r = JSON.parse(t);
    if (!Array.isArray(r)) return [];
    const s = r.map((n) => {
      if (!n || typeof n != "object" || Array.isArray(n)) return null;
      const i = n, a = typeof i.token == "string" ? i.token.trim() : "", o = typeof i.updatedAt == "number" ? i.updatedAt : 0;
      return !a || !Number.isFinite(o) ? null : {
        token: a,
        updatedAt: o
      };
    }).filter((n) => n !== null).sort((n, i) => i.updatedAt - n.updatedAt);
    return s.length <= e ? s : s.slice(0, e);
  } catch {
    return [];
  }
}
function es(e) {
  try {
    localStorage.setItem(ft, JSON.stringify(e));
  } catch {
  }
}
var gt = class {
  constructor(e) {
    const t = Yr(e.key);
    this.key = t, this.persistedStorageKey = `${Kr}${t}`, this.maxShareEntries = Math.max(1, e.maxShareEntries || Jr);
  }
  loadPersistedState() {
    try {
      const e = localStorage.getItem(this.persistedStorageKey);
      return e ? K(JSON.parse(e)) : null;
    } catch {
      return null;
    }
  }
  savePersistedState(e) {
    const t = K(e);
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
    const t = ze(e);
    if (!t) return null;
    t.updatedAt || (t.updatedAt = Date.now());
    const r = Xr(), s = `${ue}${r}`;
    try {
      localStorage.setItem(s, JSON.stringify(t));
      const n = Zr(this.maxShareEntries).filter((i) => i.token !== r);
      for (n.unshift({
        token: r,
        updatedAt: t.updatedAt
      }); n.length > this.maxShareEntries; ) {
        const i = n.pop();
        i && localStorage.removeItem(`${ue}${i.token}`);
      }
      return es(n), r;
    } catch {
      return null;
    }
  }
  resolveShareState(e) {
    const t = String(e || "").trim();
    if (!t) return null;
    try {
      const r = localStorage.getItem(`${ue}${t}`);
      return r ? ze(JSON.parse(r)) : null;
    } catch {
      return null;
    }
  }
}, ts = class extends gt {
  constructor(e) {
    if (super(e), this.syncTimeout = null, this.mutationQueue = Promise.resolve(), this.preferencesEndpoint = mt(e.preferencesEndpoint), !this.preferencesEndpoint) throw new Error("PreferencesDataGridStateStore requires an advertised preferences endpoint");
    this.resource = Wr(e.resource) || this.key, this.syncDebounceMs = Math.max(100, e.syncDebounceMs || 1e3), this.hydrateTimeoutMs = Math.max(100, e.hydrateTimeoutMs || Qr), this.preferencesWritable = e.preferencesWritable !== !1;
  }
  get serverStateKey() {
    return `ui.datagrid.${this.resource}.state`;
  }
  async hydrate() {
    const e = typeof AbortController < "u" ? new AbortController() : null, t = setTimeout(() => {
      e?.abort();
    }, this.hydrateTimeoutMs);
    try {
      const r = this.buildKeysQueryURL(this.serverStateKey), s = await fetch(r, {
        method: "GET",
        credentials: "same-origin",
        signal: e?.signal,
        headers: { Accept: "application/json" }
      });
      if (!s.ok) return;
      const n = await s.json(), i = this.extractFirstRecord(n);
      if (!i) return;
      const a = this.extractMap(i.effective), o = this.extractMap(i.raw), l = K(a[this.serverStateKey] ?? o[this.serverStateKey]);
      l && super.savePersistedState(l);
    } catch {
    } finally {
      clearTimeout(t);
    }
  }
  savePersistedState(e) {
    super.savePersistedState(e);
    const t = K(e);
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
      await C(this.preferencesEndpoint, {
        method: "POST",
        credentials: "same-origin",
        json: { raw: { [this.serverStateKey]: e } }
      });
    } catch {
    }
  }
  async clearServerState() {
    try {
      await C(this.preferencesEndpoint, {
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
    const s = r[0];
    return !s || typeof s != "object" || Array.isArray(s) ? null : s;
  }
  extractMap(e) {
    return !e || typeof e != "object" || Array.isArray(e) ? {} : e;
  }
};
function rs(e) {
  return (e.mode || "local") === "preferences" && mt(e.preferencesEndpoint) ? new ts(e) : new gt(e);
}
var J = "search", Q = "page", Y = "per_page", B = "filters", W = "sort", ie = "state", ee = "advanced_search", ae = "hidden_columns", oe = "view_mode", Re = "expanded_groups", bt = [
  "perPage",
  "hiddenColumns",
  "advancedSearch"
], Pe = [
  J,
  Q,
  Y,
  B,
  W,
  ie,
  ae,
  oe,
  Re
], ss = [...Pe, ee], ns = 1800;
function is(e) {
  return {
    maxURLLength: Math.max(256, e.config.urlState?.maxURLLength || 1800),
    maxFiltersLength: Math.max(64, e.config.urlState?.maxFiltersLength || 600),
    enableStateToken: e.config.urlState?.enableStateToken !== !1
  };
}
function as(e, t, r) {
  const s = String(t || "").trim();
  if (!s) return null;
  try {
    const n = JSON.parse(s);
    return Array.isArray(n) ? n : (console.warn(`[DataGrid] Invalid ${r} payload in URL (expected array)`), null);
  } catch (n) {
    return console.warn(`[DataGrid] Failed to parse ${r} payload from URL:`, n), null;
  }
}
function Ge(e, t) {
  return Array.from(new Set(Array.from(e).map((r) => String(r || "").trim()).filter((r) => r.length > 0 && t.has(r)))).sort();
}
function os(e, t) {
  return e.length !== t.length ? !1 : e.every((r, s) => r === t[s]);
}
function ls(e) {
  const t = new Set(e.config.columns.map((s) => s.field)), r = Ge(e.state.hiddenColumns || [], t);
  return os(r, Ge(e.config.columns.filter((s) => s.hidden).map((s) => s.field), t)) ? null : JSON.stringify(r);
}
function cs(e, t, r = {}) {
  const s = r.merge === !0, n = new Set(e.config.columns.map((o) => o.field)), i = Array.isArray(t.hiddenColumns) ? new Set(t.hiddenColumns.map((o) => String(o || "").trim()).filter((o) => o.length > 0 && n.has(o))) : null;
  i ? (e.state.hiddenColumns = i, e.hasPersistedHiddenColumnState = !0) : s || (e.state.hiddenColumns = new Set(e.config.columns.filter((o) => o.hidden).map((o) => o.field)), e.hasPersistedHiddenColumnState = !1);
  const a = Array.isArray(t.columnOrder) ? t.columnOrder.map((o) => String(o || "").trim()).filter((o) => o.length > 0 && n.has(o)) : null;
  if (a && a.length > 0) {
    const o = e.mergeColumnOrder(a);
    e.state.columnOrder = o, e.hasPersistedColumnOrderState = !0, e.didRestoreColumnOrder = !0, e.shouldReorderDOMOnRestore = e.defaultColumns.map((c) => c.field).join("|") !== o.join("|");
    const l = new Map(e.config.columns.map((c) => [c.field, c]));
    e.config.columns = o.map((c) => l.get(c)).filter((c) => c !== void 0);
  } else s || (e.state.columnOrder = e.config.columns.map((o) => o.field), e.hasPersistedColumnOrderState = !1, e.didRestoreColumnOrder = !1, e.shouldReorderDOMOnRestore = !1);
  if (e.config.enableGroupedMode) {
    if (t.viewMode) {
      const o = nt(t.viewMode);
      o && (e.state.viewMode = Le(o));
    }
    e.state.expandMode = ke(t.expandMode, e.state.expandMode), Array.isArray(t.expandedGroups) ? (e.state.expandedGroups = new Set(t.expandedGroups.map((o) => String(o || "").trim()).filter(Boolean)), e.state.hasPersistedExpandState = !0) : t.expandMode !== void 0 && (e.state.hasPersistedExpandState = !0);
  }
}
function ds(e, t) {
  t.persisted && e.applyPersistedStateSnapshot(t.persisted, { merge: !0 }), typeof t.search == "string" && (e.state.search = t.search), typeof t.page == "number" && Number.isFinite(t.page) && (e.state.currentPage = Math.max(1, Math.trunc(t.page))), typeof t.perPage == "number" && Number.isFinite(t.perPage) && (e.state.perPage = Math.max(1, Math.trunc(t.perPage))), Array.isArray(t.filters) && (e.state.filters = t.filters), Array.isArray(t.sort) && (e.state.sort = t.sort);
}
function us(e) {
  const t = {
    version: 1,
    hiddenColumns: Array.from(e.state.hiddenColumns),
    columnOrder: [...e.state.columnOrder],
    updatedAt: Date.now()
  };
  return e.config.enableGroupedMode && (t.viewMode = e.state.viewMode, t.expandMode = e.state.expandMode, t.expandedGroups = Array.from(e.state.expandedGroups)), t;
}
function hs(e) {
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
function ps(e) {
  e.stateStore.savePersistedState(e.buildPersistedStateSnapshot());
}
function fs(e) {
  const t = new URLSearchParams(window.location.search);
  e.didRestoreColumnOrder = !1, e.shouldReorderDOMOnRestore = !1, e.hasURLStateOverrides = ss.some((c) => t.has(c));
  const r = t.get(ie);
  if (r) {
    const c = e.stateStore.resolveShareState(r);
    c && e.applyShareStateSnapshot(c);
  }
  const s = t.get(J);
  if (s) {
    e.state.search = s;
    const c = document.querySelector(e.selectors.searchInput);
    c && (c.value = s);
  }
  const n = t.get(Q);
  if (n) {
    const c = parseInt(n, 10);
    e.state.currentPage = Number.isNaN(c) ? 1 : Math.max(1, c);
  }
  const i = t.get(Y);
  if (i) {
    const c = parseInt(i, 10), u = e.config.perPage || 10;
    e.state.perPage = Number.isNaN(c) ? u : Math.max(1, c);
    const h = document.querySelector(e.selectors.perPageSelect);
    h && (h.value = String(e.state.perPage));
  }
  const a = t.get(B);
  if (a) {
    const c = e.parseJSONArray(a, "filters");
    c && (e.state.filters = c);
  }
  const o = t.get(W);
  if (o) {
    const c = e.parseJSONArray(o, "sort");
    c && (e.state.sort = c);
  }
  if (e.config.enableGroupedMode) {
    const c = nt(t.get(oe));
    c && (e.state.viewMode = Le(c)), t.has("expanded_groups") && (e.state.expandedGroups = gr(t.get(Re)), e.state.expandMode = "explicit", e.state.hasPersistedExpandState = !0);
  }
  const l = t.get(ae);
  if (l) {
    const c = e.parseJSONArray(l, "hidden columns");
    if (c) {
      const u = new Set(e.config.columns.map((h) => h.field));
      e.state.hiddenColumns = new Set(c.map((h) => typeof h == "string" ? h.trim() : "").filter((h) => h.length > 0 && u.has(h)));
    }
  } else if (!e.hasPersistedHiddenColumnState && e.config.behaviors?.columnVisibility) {
    const c = e.config.columns.map((h) => h.field), u = e.config.behaviors.columnVisibility.loadHiddenColumnsFromCache(c);
    u.size > 0 && (e.state.hiddenColumns = u);
  }
  if (!e.hasPersistedColumnOrderState && e.config.behaviors?.columnVisibility?.loadColumnOrderFromCache) {
    const c = e.config.columns.map((h) => h.field), u = e.config.behaviors.columnVisibility.loadColumnOrderFromCache(c);
    if (u && u.length > 0) {
      const h = e.mergeColumnOrder(u);
      e.state.columnOrder = h, e.didRestoreColumnOrder = !0, e.shouldReorderDOMOnRestore = e.defaultColumns.map((m) => m.field).join("|") !== h.join("|");
      const p = new Map(e.config.columns.map((m) => [m.field, m]));
      e.config.columns = h.map((m) => p.get(m)).filter((m) => m !== void 0);
    }
  }
  e.persistStateSnapshot(), console.log("[DataGrid] State restored from URL:", e.state), setTimeout(() => {
    e.applyRestoredState();
  }, 0);
}
function ms(e) {
  const t = document.querySelector(e.selectors.searchInput);
  t && (t.value = e.state.search);
  const r = document.querySelector(e.selectors.perPageSelect);
  r && (r.value = String(e.state.perPage)), e.state.filters.length > 0 && e.state.filters.forEach((n) => {
    const i = document.querySelector(`[data-filter-column="${n.column}"]`);
    i && (i.value = String(n.value));
  }), e.didRestoreColumnOrder && e.shouldReorderDOMOnRestore && e.reorderTableColumns(e.state.columnOrder);
  const s = e.config.columns.filter((n) => !e.state.hiddenColumns.has(n.field)).map((n) => n.field);
  e.updateColumnVisibility(s, !0), e.state.sort.length > 0 && e.updateSortIndicators();
}
function gs(e, t = {}) {
  e.persistStateSnapshot();
  const r = e.getURLStateConfig(), s = new URLSearchParams(window.location.search);
  Oe(s, Pe), Oe(s, bt), e.state.search && s.set(J, e.state.search), e.state.currentPage > 1 && s.set(Q, String(e.state.currentPage)), e.state.perPage !== (e.config.perPage || 10) && s.set(Y, String(e.state.perPage));
  let n = !1;
  if (e.state.filters.length > 0) {
    const l = JSON.stringify(e.state.filters);
    l.length <= r.maxFiltersLength ? s.set(B, l) : n = !0;
  }
  e.state.sort.length > 0 && s.set(W, JSON.stringify(e.state.sort));
  const i = ls(e);
  i !== null && s.set(ae, i), e.config.enableGroupedMode && s.set(oe, e.state.viewMode);
  let a = qe(window.location.pathname, s);
  const o = a.length > r.maxURLLength;
  if (r.enableStateToken && (n || o)) {
    s.delete(J), s.delete(Q), s.delete(Y), s.delete(B), s.delete(W);
    const l = e.stateStore.createShareState(e.buildShareStateSnapshot());
    l && s.set(ie, l), a = qe(window.location.pathname, s);
  }
  t.replace ? window.history.replaceState({}, "", a) : window.history.pushState({}, "", a), console.log("[DataGrid] URL updated:", a);
}
async function bs(e, t) {
  console.log("[DataGrid] ===== refresh() CALLED ====="), console.log("[DataGrid] Current sort state:", JSON.stringify(e.state.sort)), e.abortController && e.abortController.abort(), e.abortController = new AbortController(), e.setRenderState("loading"), e.renderLoadingState();
  try {
    const r = e.buildApiUrl(), s = await C(r, {
      signal: e.abortController.signal,
      method: "GET",
      accept: "application/json"
    });
    if (!s.ok) {
      if (e.handleGroupedModeStatusFallback(s.status)) return;
      throw new Error(`HTTP error! status: ${s.status}`);
    }
    const n = await s.json(), i = br(n) || n;
    if (typeof t == "number" && typeof e.isCurrentRefresh == "function" && !e.isCurrentRefresh(t)) {
      console.log("[DataGrid] Ignoring stale refresh response");
      return;
    }
    console.log("[DataGrid] API Response:", i), console.log("[DataGrid] API Response data array:", i.data), console.log("[DataGrid] API Response total:", i.total, "count:", i.count, "$meta:", i.$meta);
    const a = i.data || i.records || [];
    if (e.handleGroupedModePayloadFallback(a)) return;
    e.lastSchema = i.schema || null, e.lastForm = i.form || null, e.setBulkActionState(i.$meta?.bulk_action_state || null, i.schema?.bulk_action_state_config || null);
    const o = e.getResponseTotal(i);
    if (e.normalizePagination(o)) {
      if (typeof e.requestRefreshAfterCurrent == "function") {
        e.requestRefreshAfterCurrent();
        return;
      }
      return e.refresh();
    }
    console.log("[DataGrid] About to call renderData()..."), e.renderData(i), console.log("[DataGrid] renderData() completed"), e.updatePaginationUI(i), e.updateBulkActionsBar(), console.log("[DataGrid] ===== refresh() COMPLETED =====");
  } catch (r) {
    if (r instanceof Error && r.name === "AbortError") {
      console.log("[DataGrid] Request aborted");
      return;
    }
    console.error("[DataGrid] Error fetching data:", r);
    const s = "Failed to load data";
    e.renderErrorState(s), e.setRenderState("error"), e.showError(s);
  }
}
function ys(e) {
  const t = new URLSearchParams(), r = e.buildQueryParams();
  Object.entries(r).forEach(([n, i]) => {
    i != null && t.append(n, String(i));
  });
  const s = `${e.config.apiEndpoint}?${t.toString()}`;
  return console.log(`[DataGrid] API URL: ${s}`), s;
}
function vs(e) {
  const t = new URLSearchParams(), r = e.buildQueryParams();
  return Object.entries(r).forEach(([s, n]) => {
    n != null && t.append(s, String(n));
  }), t.toString();
}
function ws(e) {
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
function xs(e, t) {
  return t.total !== void 0 && t.total !== null ? t.total : t.$meta?.count !== void 0 && t.$meta?.count !== null ? t.$meta.count : t.count !== void 0 && t.count !== null ? t.count : null;
}
function Ss(e, t) {
  if (t === null) return !1;
  const r = Math.max(1, e.state.perPage || e.config.perPage || 10), s = Math.max(1, Math.ceil(t / r));
  let n = e.state.currentPage;
  t === 0 ? n = 1 : n > s ? n = s : n < 1 && (n = 1);
  const i = r !== e.state.perPage || n !== e.state.currentPage;
  return i && (e.state.perPage = r, e.state.currentPage = n, e.pushStateToURL()), t === 0 ? !1 : i;
}
async function Cs(e, t) {
  const r = await C(`${e.config.apiEndpoint}/${t}`, {
    method: "GET",
    accept: "application/json"
  });
  if (!r.ok) throw new Error(`Detail request failed: ${r.status}`);
  const s = await r.json(), n = e.normalizeDetailResponse(s);
  return n.schema && (e.lastSchema = n.schema), n.form && (e.lastForm = n.form), {
    ...n,
    tabs: n.schema?.tabs || []
  };
}
function $s(e, t) {
  const r = it(t) || t;
  if (r && typeof r == "object" && "data" in r) {
    const s = r;
    return {
      data: s.data,
      schema: s.schema,
      form: s.form
    };
  }
  return { data: t };
}
function As(e) {
  return e.lastSchema;
}
function Es(e) {
  return e.lastForm;
}
function ks(e) {
  return e.lastSchema?.tabs || [];
}
function Te(e) {
  return typeof e.config.rowActions == "function" || e.config.useDefaultActions !== !1;
}
function X(e) {
  return (Te(e) ? 1 : 0) + (e.isCapabilityEnabled("selection") ? 1 : 0);
}
function yt(e) {
  return Math.max(1, (e.config.columns?.length || 0) + X(e));
}
function Ls(e, t, r, s) {
  const n = e.config.groupByField || "family_id", i = r.filter((c) => !!c && typeof c == "object" && !Array.isArray(c));
  let a = hr(i, {
    groupByField: n,
    defaultExpanded: !e.state.hasPersistedExpandState,
    expandMode: e.state.expandMode,
    expandedGroups: e.state.expandedGroups
  });
  a || (a = nr(i, {
    groupByField: n,
    defaultExpanded: !e.state.hasPersistedExpandState,
    expandMode: e.state.expandMode,
    expandedGroups: e.state.expandedGroups
  }));
  const o = or(t);
  o.size > 0 && (a = mr(a, o)), e.state.groupedData = a;
  const l = e.config.columns.length;
  for (const c of a.groups) {
    const u = lr(c, l, { fixedColumnCount: X(e) });
    s.insertAdjacentHTML("beforeend", u);
    const h = s.lastElementChild;
    h && (h.addEventListener("click", () => e.toggleGroup(c.groupId)), h.addEventListener("keydown", (p) => {
      (p.key === "Enter" || p.key === " ") && (p.preventDefault(), e.toggleGroup(c.groupId));
    }));
    for (const p of c.records) {
      p.id && (e.recordsById[p.id] = p);
      const m = e.createTableRow(p);
      m.dataset.groupId = c.groupId, m.classList.add("group-child-row"), c.expanded || (m.style.display = "none"), s.appendChild(m);
    }
  }
  for (const c of a.ungrouped) {
    c.id && (e.recordsById[c.id] = c);
    const u = e.createTableRow(c);
    s.appendChild(u);
  }
  console.log(`[DataGrid] Rendered ${a.groups.length} groups, ${a.ungrouped.length} ungrouped`);
}
function _s(e) {
  return e.config.enableGroupedMode ? e.state.viewMode === "grouped" || e.state.viewMode === "matrix" : !1;
}
function Rs(e, t) {
  e.isGroupedViewActive() && (e.state.viewMode = "flat", e.state.groupedData = null, e.pushStateToURL({ replace: !0 }), e.notify(t, "warning"), e.refresh());
}
function Ps(e, t) {
  return !e.isGroupedViewActive() || ![
    400,
    404,
    405,
    422
  ].includes(t) ? !1 : (e.fallbackGroupedMode("Grouped pagination is not supported by this panel. Switched to flat view."), !0);
}
function Ts(e, t) {
  if (!e.isGroupedViewActive() || t.length === 0) return !1;
  const r = t.filter((s) => !!s && typeof s == "object" && !Array.isArray(s));
  return r.length !== t.length || !dr(r) ? (e.fallbackGroupedMode("Grouped pagination contract is unavailable. Switched to flat view to avoid split groups."), !0) : !1;
}
function Ds(e, t) {
  if (!e.state.groupedData) return;
  const r = String(t || "").trim();
  if (!r) return;
  const s = e.isGroupExpandedByState(r, !e.state.hasPersistedExpandState);
  e.state.expandMode === "all" ? s ? e.state.expandedGroups.add(r) : e.state.expandedGroups.delete(r) : e.state.expandMode === "none" ? s ? e.state.expandedGroups.delete(r) : e.state.expandedGroups.add(r) : (!e.state.hasPersistedExpandState && e.state.expandedGroups.size === 0 && (e.state.expandedGroups = new Set(e.state.groupedData.groups.map((i) => i.groupId))), e.state.expandedGroups.has(r) ? e.state.expandedGroups.delete(r) : e.state.expandedGroups.add(r)), e.state.hasPersistedExpandState = !0;
  const n = e.state.groupedData.groups.find((i) => i.groupId === r);
  n && (n.expanded = e.isGroupExpandedByState(r)), e.updateGroupVisibility(r), e.pushStateToURL({ replace: !0 });
}
function Ms(e, t) {
  if (!e.config.enableGroupedMode) return;
  const r = new Set((t || []).map((s) => String(s || "").trim()).filter(Boolean));
  e.state.expandMode = "explicit", e.state.expandedGroups = r, e.state.hasPersistedExpandState = !0, e.updateGroupedRowsFromState(), e.pushStateToURL({ replace: !0 }), !e.state.groupedData && e.isGroupedViewActive() && e.refresh();
}
function Is(e) {
  e.config.enableGroupedMode && (e.state.expandMode = "all", e.state.expandedGroups.clear(), e.state.hasPersistedExpandState = !0, e.updateGroupedRowsFromState(), e.pushStateToURL({ replace: !0 }), !e.state.groupedData && e.isGroupedViewActive() && e.refresh());
}
function Bs(e) {
  e.config.enableGroupedMode && (e.state.expandMode = "none", e.state.expandedGroups.clear(), e.state.hasPersistedExpandState = !0, e.updateGroupedRowsFromState(), e.pushStateToURL({ replace: !0 }), !e.state.groupedData && e.isGroupedViewActive() && e.refresh());
}
function Fs(e, t) {
  const r = e.tableEl?.querySelector("tbody");
  if (!r) return;
  const s = r.querySelector(`tr[data-group-id="${t}"]`);
  if (!s) return;
  const n = e.isGroupExpandedByState(t);
  s.dataset.expanded = String(n), s.setAttribute("aria-expanded", String(n));
  const i = s.querySelector(".expand-icon");
  i && (i.textContent = n ? "▼" : "▶"), r.querySelectorAll(`tr.group-child-row[data-group-id="${t}"]`).forEach((a) => {
    a.style.display = n ? "" : "none";
  });
}
function qs(e) {
  if (e.state.groupedData)
    for (const t of e.state.groupedData.groups)
      t.expanded = e.isGroupExpandedByState(t.groupId), e.updateGroupVisibility(t.groupId);
}
function Os(e, t, r = !1) {
  const s = ke(e.state.expandMode, "explicit");
  return s === "all" ? !e.state.expandedGroups.has(t) : s === "none" ? e.state.expandedGroups.has(t) : e.state.expandedGroups.size === 0 ? r : e.state.expandedGroups.has(t);
}
function js(e, t) {
  if (!e.config.enableGroupedMode) {
    console.warn("[DataGrid] Grouped mode not enabled");
    return;
  }
  const r = Le(t);
  e.state.viewMode = r, r === "flat" && (e.state.groupedData = null), e.pushStateToURL(), e.refresh();
}
function Ns(e) {
  return e.state.viewMode;
}
function zs(e) {
  return e.state.groupedData;
}
function Gs(e) {
  return {
    textCode: null,
    message: e,
    metadata: null,
    fields: null,
    validationErrors: null
  };
}
async function Us(e) {
  const t = String(e.confirmMessage || "Are you sure you want to delete this item?").trim() || "Are you sure you want to delete this item?", r = String(e.confirmTitle || "Confirm Delete").trim() || "Confirm Delete";
  if (e.notifier?.confirm) return e.notifier.confirm(t, {
    title: r,
    confirmText: "Delete",
    cancelText: "Cancel"
  });
  const s = globalThis.window;
  return s && typeof s.confirm == "function" ? s.confirm(t) : !0;
}
async function vt(e) {
  if (!await Us(e)) return null;
  const t = await tt(e.endpoint, {
    method: "DELETE",
    headers: { Accept: "application/json" }
  });
  if (t.success)
    return await e.onSuccess?.(t), t;
  const r = String(e.fallbackMessage || "Delete failed").trim() || "Delete failed", s = t.error || Gs(r), n = {
    ...s,
    message: q(s, r)
  };
  throw n.textCode && e.reconcileOnDomainFailure && await e.reconcileOnDomainFailure(n), await e.onError?.(n), re(n, r, !!e.onError);
}
var Hs = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
  <g transform="translate(2.16665 6.83333)">
    <path d="M7 1.16667C7 1.811 6.47767 2.33333 5.83333 2.33333C5.189 2.33333 4.66667 1.811 4.66667 1.16667C4.66667 0.522334 5.189 0 5.83333 0C6.47767 0 7 0.522334 7 1.16667Z" fill="currentColor"/>
    <path d="M11.6667 1.16667C11.6667 1.811 11.1443 2.33333 10.5 2.33333C9.85567 2.33333 9.33333 1.811 9.33333 1.16667C9.33333 0.522334 9.85567 0 10.5 0C11.1443 0 11.6667 0.522334 11.6667 1.16667Z" fill="currentColor"/>
    <path d="M2.33333 1.16667C2.33333 1.811 1.811 2.33333 1.16667 2.33333C0.522334 2.33333 0 1.811 0 1.16667C0 0.522334 0.522334 0 1.16667 0C1.811 0 2.33333 0.522334 2.33333 1.16667Z" fill="currentColor"/>
  </g>
</svg>
`;
function Vs(e, t, r = !1) {
  if (!e.tableEl) return;
  const s = new Set(t);
  e.state.hiddenColumns.clear(), e.config.columns.forEach((n) => {
    s.has(n.field) || e.state.hiddenColumns.add(n.field);
  }), r || e.pushStateToURL(), e.tableEl.querySelectorAll("thead th[data-column]").forEach((n) => {
    const i = n.dataset.column;
    i && (n.style.display = s.has(i) ? "" : "none");
  }), e.tableEl.querySelectorAll("tbody td[data-column]").forEach((n) => {
    const i = n.dataset.column;
    i && (n.style.display = s.has(i) ? "" : "none");
  }), e.syncColumnVisibilityCheckboxes();
}
function Ks(e) {
  if (e.columnManager) {
    e.columnManager.syncWithGridState();
    return;
  }
  const t = document.querySelector(e.selectors.columnToggleMenu);
  t && e.config.columns.forEach((r) => {
    const s = t.querySelector(`input[data-column="${r.field}"]`);
    s && (s.checked = !e.state.hiddenColumns.has(r.field));
  });
}
function wt(e) {
  e.querySelectorAll("[data-datagrid-state]").forEach((t) => t.remove());
}
function Js(e) {
  !e.tableEl || Te(e) || e.tableEl.querySelectorAll('thead [data-role="actions"]').forEach((t) => t.remove());
}
function xt(e, t, r) {
  const s = document.createElement("tr");
  s.className = "admin-datagrid__state-row", s.dataset.datagridState = t;
  const n = document.createElement("td");
  return n.colSpan = yt(e), n.className = `admin-datagrid__state admin-datagrid__state--${t} px-6 py-8 text-center`, n.setAttribute("role", t === "error" ? "alert" : "status"), n.setAttribute("aria-live", t === "error" ? "assertive" : "polite"), n.textContent = r, s.appendChild(n), s;
}
function Qs(e) {
  const t = e.tableEl?.querySelector("tbody");
  if (t && (wt(t), !(t.children.length > 0))) {
    if (e.isGroupedViewActive()) {
      t.insertAdjacentHTML("beforeend", wr(e.config.columns.length, X(e)));
      return;
    }
    t.appendChild(xt(e, "loading", "Loading…"));
  }
}
function Ys(e, t) {
  const r = e.tableEl?.querySelector("tbody");
  if (r) {
    if (wt(r), e.isGroupedViewActive()) {
      r.insertAdjacentHTML("afterbegin", sr(e.config.columns.length, t, void 0, X(e)));
      return;
    }
    r.prepend(xt(e, "error", t));
  }
}
function Ws(e, t) {
  const r = e.tableEl?.querySelector("tbody");
  if (!r) {
    console.error("[DataGrid] tbody not found!");
    return;
  }
  e.actionMenuController?.closeAll(), r.innerHTML = "";
  const s = t.data || t.records || [];
  console.log(`[DataGrid] renderData() called with ${s.length} items`), console.log("[DataGrid] First 3 items:", s.slice(0, 3));
  const n = e.getResponseTotal(t);
  if (e.state.totalRows = n ?? s.length, s.length === 0) {
    e.isGroupedViewActive() ? r.innerHTML = ir(e.config.columns.length, X(e)) : r.innerHTML = `
          <tr class="admin-datagrid__state-row" data-datagrid-state="empty">
            <td colspan="${yt(e)}" class="admin-datagrid__state admin-datagrid__state--empty px-6 py-8 text-center text-gray-500">
              No results found
            </td>
          </tr>
        `, e.setRenderState("empty");
    return;
  }
  e.recordsById = /* @__PURE__ */ Object.create(null), e.isGroupedViewActive() ? e.renderGroupedData(t, s, r) : e.renderFlatData(s, r), e.state.hiddenColumns.size > 0 && r.querySelectorAll("td[data-column]").forEach((i) => {
    const a = i.dataset.column;
    a && e.state.hiddenColumns.has(a) && (i.style.display = "none");
  }), e.isCapabilityEnabled("selection") && e.updateSelectionBindings(), e.setRenderState("ready");
}
function Xs(e, t, r) {
  t.forEach((s, n) => {
    console.log(`[DataGrid] Rendering row ${n + 1}: id=${s.id}`), s.id && (e.recordsById[s.id] = s);
    const i = e.createTableRow(s);
    r.appendChild(i);
  }), console.log(`[DataGrid] Finished appending ${t.length} rows to tbody`), console.log("[DataGrid] tbody.children.length =", r.children.length);
}
function Zs(e, t) {
  const r = t.rendererOptions ?? t.renderer_options;
  return !r || typeof r != "object" || Array.isArray(r) ? {} : r;
}
function en(e, t) {
  const r = document.createElement("tr");
  let s = ["admin-datagrid__row", "hover:bg-gray-50"];
  if (e.config.rowClassProvider && (s = s.concat(e.config.rowClassProvider(t))), r.className = s.join(" "), e.isCapabilityEnabled("selection")) {
    const o = document.createElement("td");
    o.className = "admin-datagrid__cell px-6 py-4 whitespace-nowrap", o.dataset.role = "selection", o.dataset.fixed = "left", o.innerHTML = `
        <label class="flex">
          <input type="checkbox"
                 class="table-checkbox shrink-0 border-gray-300 rounded text-blue-600 focus:ring-blue-500"
                 data-id="${f(t.id)}">
          <span class="sr-only">Select</span>
        </label>
      `, r.appendChild(o);
  }
  if (e.config.columns.forEach((o) => {
    const l = document.createElement("td");
    l.className = "admin-datagrid__cell px-6 py-4 whitespace-nowrap text-sm text-gray-800", l.setAttribute("data-column", o.field);
    const c = t[o.field], u = typeof o.renderer == "string" ? o.renderer.trim() : "", h = { options: e.resolveRendererOptions(o) };
    if (o.render) l.innerHTML = o.render(c, t);
    else if (e.cellRendererRegistry.has(o.field)) l.innerHTML = e.cellRendererRegistry.get(o.field)(c, t, o.field, h);
    else if (u && e.cellRendererRegistry.has(u)) l.innerHTML = e.cellRendererRegistry.get(u)(c, t, o.field, h);
    else if (c == null) l.textContent = "-";
    else if (o.field.includes("_at")) {
      const p = ne(c);
      l.textContent = p ? p.toLocaleDateString() : String(c);
    } else l.textContent = String(c);
    r.appendChild(l);
  }), !Te(e)) return r;
  const n = e.config.actionBasePath || e.config.apiEndpoint, i = document.createElement("td");
  i.className = "admin-datagrid__cell admin-datagrid__actions px-6 py-4 whitespace-nowrap text-end text-sm font-medium", i.dataset.role = "actions", i.dataset.fixed = "right";
  const a = (o) => {
    i.innerHTML = e.actionRenderer.renderRowActions(t, o), e.actionRenderer.attachRowActionListeners(i, o, t, { onError: async (l, c) => {
      if (V(l)?.textCode && await e.refresh(), !M(l)) {
        const u = l instanceof Error ? l.message : `Action "${c.label}" failed`;
        e.notify(u, "error");
      }
    } });
  };
  return e.config.rowActions ? a(e.config.rowActions(t)) : e.config.useDefaultActions !== !1 && a([
    {
      label: "View",
      icon: "eye",
      action: () => {
        window.location.href = `${n}/${t.id}`;
      },
      variant: "secondary"
    },
    {
      label: "Edit",
      icon: "edit",
      action: () => {
        window.location.href = `${n}/${t.id}/edit`;
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
  ]), r.appendChild(i), r;
}
function tn(e, t) {
  return t.toLowerCase().replace(/[^a-z0-9]/g, "-");
}
async function rn(e, t) {
  try {
    await vt({
      endpoint: `${e.config.apiEndpoint}/${t}`,
      confirmMessage: "Are you sure you want to delete this item?",
      confirmTitle: "Confirm Delete",
      onSuccess: async () => {
        await e.refresh();
      },
      onError: (r) => {
        e.showError(q(r, "Delete failed"));
      },
      reconcileOnDomainFailure: async () => {
        await e.refresh();
      },
      notifier: { confirm: async (r, s) => e.confirmAction(r, s) }
    });
  } catch (r) {
    console.error("Error deleting item:", r), M(r) || e.showError(r instanceof Error ? r.message : "Failed to delete item");
  }
}
function sn(e, t) {
  const r = e.getResponseTotal(t) ?? e.state.totalRows, s = e.state.perPage * (e.state.currentPage - 1), n = r === 0 ? 0 : s + 1, i = Math.min(s + e.state.perPage, r), a = document.querySelector(e.selectors.tableInfoStart), o = document.querySelector(e.selectors.tableInfoEnd), l = document.querySelector(e.selectors.tableInfoTotal), c = e.selectors.tableInfoSummary ? document.querySelector(e.selectors.tableInfoSummary) : null;
  if (a && (a.textContent = I(e, n)), o && (o.textContent = I(e, i)), l && (l.textContent = I(e, r)), c) {
    const u = ln(e, n, i, r);
    u !== null && (c.textContent = u);
  }
  e.renderPaginationButtons(r);
}
function nn(e, t) {
  const r = document.querySelector(e.selectors.paginationContainer);
  if (!r) return;
  const s = e.config.pagination?.mode === "semantic";
  (r.closest?.("[data-datagrid-pagination]") || r).classList?.toggle("admin-datagrid__pagination--presented", s);
  const n = Math.ceil(t / e.state.perPage);
  if (n <= 1) {
    r.innerHTML = "";
    return;
  }
  const i = e.state.currentPage;
  r.innerHTML = (s ? an(e, n, i) : on(n, i)).join(""), r.querySelectorAll("[data-page]").forEach((a) => {
    a.addEventListener("click", async () => {
      const o = parseInt(a.dataset.page || "1", 10);
      o >= 1 && o <= n && (e.state.currentPage = o, e.pushStateToURL(), e.config.behaviors?.pagination ? await e.config.behaviors.pagination.onPageChange(o, e) : await e.refresh());
    });
  });
}
function an(e, t, r) {
  const s = [], n = {
    previous: D(e.config.pagination?.labels?.previous, "Previous"),
    next: D(e.config.pagination?.labels?.next, "Next"),
    previousPage: D(e.config.pagination?.labels?.previousPage, "Previous page"),
    nextPage: D(e.config.pagination?.labels?.nextPage, "Next page"),
    page: D(e.config.pagination?.labels?.page, "Page {page}")
  };
  s.push(`
      <button type="button"
              data-page="${r - 1}"
              aria-label="${f(n.previousPage)}"
              ${r === 1 ? "disabled" : ""}
              class="admin-datagrid__page-button admin-datagrid__page-button--boundary">
        <span>${d(n.previous)}</span>
      </button>
    `);
  for (const i of St(t, r)) {
    if (i === "ellipsis") {
      s.push(`<span class="admin-datagrid__page-ellipsis" aria-hidden="true">${Hs}</span>`);
      continue;
    }
    const a = i === r, o = I(e, i), l = n.page.includes("{page}") ? n.page.replace("{page}", o) : `${n.page} ${o}`;
    s.push(`
        <button type="button"
                data-page="${i}"
                aria-label="${f(l)}"
                ${a ? 'aria-current="page"' : ""}
                class="admin-datagrid__page-button admin-datagrid__page-button--page${a ? " admin-datagrid__page-button--active" : ""}">
          ${d(o)}
        </button>
      `);
  }
  return s.push(`
      <button type="button"
              data-page="${r + 1}"
              aria-label="${f(n.nextPage)}"
              ${r === t ? "disabled" : ""}
              class="admin-datagrid__page-button admin-datagrid__page-button--boundary">
        <span>${d(n.next)}</span>
      </button>
    `), s;
}
function on(e, t) {
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
  for (const s of St(e, t)) {
    if (s === "ellipsis") {
      r.push('<span class="admin-datagrid__page-ellipsis min-w-[24px] text-center text-gray-500" aria-hidden="true">…</span>');
      continue;
    }
    const n = s === t;
    r.push(`
      <button type="button"
              data-page="${s}"
              aria-label="Page ${s}"
              ${n ? 'aria-current="page"' : ""}
              class="min-h-[38px] min-w-[38px] flex justify-center items-center ${n ? "bg-gray-200 text-gray-800 focus:outline-none focus:bg-gray-300" : "text-gray-800 hover:bg-gray-100 focus:outline-none focus:bg-gray-100"} admin-datagrid__page-button py-2 px-3 text-sm rounded-lg">
        ${s}
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
function D(e, t) {
  return typeof e == "string" && e.trim() ? e.trim() : t;
}
function ln(e, t, r, s) {
  const n = e.config.pagination?.labels?.summary;
  if (!n || typeof n != "object") return null;
  let i = s === 1 ? "one" : "other";
  try {
    i = new Intl.PluralRules(e.config.pagination?.locale).select(s);
  } catch {
  }
  const a = D(n[i], D(n.other, ""));
  if (!a) return null;
  const o = {
    start: I(e, t),
    end: I(e, r),
    total: I(e, s)
  };
  return a.replace(/\{(start|end|total)\}/g, (l, c) => o[c]);
}
function I(e, t) {
  const r = e.config.pagination?.locale;
  if (!r) return String(t);
  try {
    return new Intl.NumberFormat(r).format(t);
  } catch {
    return String(t);
  }
}
function St(e, t) {
  const r = Math.max(0, Math.floor(e)), s = Math.min(Math.max(1, Math.floor(t)), Math.max(r, 1));
  return r <= 7 ? Array.from({ length: r }, (n, i) => i + 1) : s <= 4 ? [
    1,
    2,
    3,
    4,
    5,
    "ellipsis",
    r
  ] : s >= r - 3 ? [
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
    s - 1,
    s,
    s + 1,
    "ellipsis",
    r
  ];
}
var cn = class {
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
    const s = document.createElement("div");
    s.className = "column-list", s.setAttribute("role", "list"), s.setAttribute("aria-label", "Column visibility and order"), this.columnListEl = s, e.forEach((i) => {
      const a = this.createColumnItem(i.field, i.label || i.field, !t.has(i.field));
      s.appendChild(a);
    }), this.container.appendChild(s);
    const n = this.createFooter();
    this.container.appendChild(n);
  }
  createHeader(e, t) {
    const r = document.createElement("div");
    r.className = "column-manager-header";
    const s = document.createElement("div");
    s.className = "column-search-container";
    const n = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    n.setAttribute("class", "column-search-icon"), n.setAttribute("viewBox", "0 0 24 24"), n.setAttribute("fill", "none"), n.setAttribute("stroke", "currentColor"), n.setAttribute("stroke-width", "2");
    const i = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    i.setAttribute("cx", "11"), i.setAttribute("cy", "11"), i.setAttribute("r", "8");
    const a = document.createElementNS("http://www.w3.org/2000/svg", "path");
    a.setAttribute("d", "m21 21-4.3-4.3"), n.appendChild(i), n.appendChild(a);
    const o = document.createElement("input");
    o.type = "text", o.className = "column-search-input", o.placeholder = "Filter columns...", o.setAttribute("aria-label", "Filter columns"), this.searchInput = o, o.addEventListener("input", () => {
      this.filterColumns(o.value);
    }), s.appendChild(n), s.appendChild(o);
    const l = document.createElement("span");
    return l.className = "column-count-badge", l.textContent = `${t} of ${e}`, l.setAttribute("aria-live", "polite"), this.countBadgeEl = l, r.appendChild(s), r.appendChild(l), r;
  }
  filterColumns(e) {
    const t = e.toLowerCase().trim();
    this.container.querySelectorAll(".column-item").forEach((r) => {
      const s = r.querySelector(".column-label")?.textContent?.toLowerCase() || "", n = t === "" || s.includes(t);
      r.style.display = n ? "" : "none";
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
    const e = this.columnListEl, t = e.scrollTop, r = e.scrollHeight, s = e.clientHeight, n = r > s, i = n && t > 0, a = n && t + s < r - 1;
    e.classList.toggle("column-list--shadow-top", i), e.classList.toggle("column-list--shadow-bottom", a);
  }
  createFooter() {
    const e = document.createElement("div");
    e.className = "column-manager-footer";
    const t = document.createElement("button");
    t.type = "button", t.className = "column-reset-btn", t.setAttribute("aria-label", "Reset columns to default");
    const r = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    r.setAttribute("class", "column-reset-icon"), r.setAttribute("viewBox", "0 0 24 24"), r.setAttribute("fill", "none"), r.setAttribute("stroke", "currentColor"), r.setAttribute("stroke-width", "2"), r.setAttribute("stroke-linecap", "round"), r.setAttribute("stroke-linejoin", "round");
    const s = document.createElementNS("http://www.w3.org/2000/svg", "path");
    s.setAttribute("d", "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8");
    const n = document.createElementNS("http://www.w3.org/2000/svg", "path");
    n.setAttribute("d", "M3 3v5h5"), r.appendChild(s), r.appendChild(n);
    const i = document.createElement("span");
    return i.textContent = "Reset to Default", t.appendChild(r), t.appendChild(i), t.addEventListener("click", () => {
      this.handleReset();
    }), e.appendChild(t), e;
  }
  handleReset() {
    this.grid.resetColumnsToDefault(), this.onReset?.(), this.searchInput && (this.searchInput.value = "", this.filterColumns("")), this.updateCountBadge();
  }
  createColumnItem(e, t, r) {
    const s = `column-item-${e}`, n = `column-switch-${e}`, i = document.createElement("div");
    i.className = "column-item", i.id = s, i.dataset.column = e, i.setAttribute("role", "listitem");
    const a = document.createElement("div");
    a.className = "column-item-content";
    const o = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    o.setAttribute("class", "drag-handle"), o.setAttribute("viewBox", "0 0 20 20"), o.setAttribute("fill", "currentColor"), o.setAttribute("aria-hidden", "true"), o.setAttribute("focusable", "false"), [
      [5, 4],
      [5, 10],
      [5, 16],
      [11, 4],
      [11, 10],
      [11, 16]
    ].forEach(([m, v]) => {
      const y = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      y.setAttribute("cx", String(m)), y.setAttribute("cy", String(v)), y.setAttribute("r", "1.5"), o.appendChild(y);
    });
    const l = document.createElement("span");
    l.className = "column-label", l.id = `${s}-label`, l.textContent = t, a.appendChild(o), a.appendChild(l);
    const c = document.createElement("label");
    c.className = "column-switch", c.htmlFor = n;
    const u = document.createElement("input");
    u.type = "checkbox", u.id = n, u.dataset.column = e, u.checked = r, u.setAttribute("role", "switch"), u.setAttribute("aria-checked", String(r)), u.setAttribute("aria-labelledby", `${s}-label`), u.setAttribute("aria-describedby", `${s}-desc`);
    const h = document.createElement("span");
    h.id = `${s}-desc`, h.className = "sr-only", h.textContent = `Press Space or Enter to toggle ${t} column visibility. Currently ${r ? "visible" : "hidden"}.`;
    const p = document.createElement("span");
    return p.className = "column-switch-slider", p.setAttribute("aria-hidden", "true"), c.appendChild(u), c.appendChild(p), i.appendChild(a), i.appendChild(c), i.appendChild(h), i;
  }
  setupDragAndDrop() {
    const e = this.container.querySelector(".column-list") || this.container;
    this.sortable = xr.create(e, {
      animation: 150,
      handle: ".drag-handle",
      ghostClass: "column-item-ghost",
      dragClass: "column-item-drag",
      chosenClass: "column-item-chosen",
      touchStartThreshold: 3,
      delay: 100,
      delayOnTouchOnly: !0,
      onEnd: () => {
        const t = e.querySelectorAll(".column-item"), r = Array.from(t).map((s) => s.dataset.column);
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
        const s = `column-item-${t}-desc`, n = this.container.querySelector(`#${s}`);
        n && (n.textContent = `Press Space or Enter to toggle ${this.container.querySelector(`#column-item-${t}-label`)?.textContent || t} column visibility. Currently ${r ? "visible" : "hidden"}.`), this.onToggle && this.onToggle(t, r), this.grid.config.behaviors?.columnVisibility && this.grid.config.behaviors.columnVisibility.toggleColumn(t, this.grid), this.updateCountBadge();
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
function dn(e, t, r, s, n) {
  const i = (a) => {
    const o = a.target;
    if (!o) return;
    const l = o.closest(r);
    !l || !(l instanceof HTMLElement) || s(a, l);
  };
  return e.addEventListener(t, i, n), () => e.removeEventListener(t, i, n);
}
function un(e) {
  const t = e.tableEl;
  if (!t || !t.classList || typeof t.closest != "function") return;
  t.classList.add("admin-datagrid__table"), (t.closest("[data-datagrid-surface]") || t).classList.add("admin-datagrid");
  const r = t.querySelector("thead");
  r?.classList.add("admin-datagrid__header"), r?.querySelectorAll("th").forEach((i) => {
    i.classList.add("admin-datagrid__header-cell");
  }), t.querySelector("tbody")?.classList.add("admin-datagrid__body"), t.querySelectorAll(e.selectors.filterRow).forEach((i) => {
    i.classList.add("admin-datagrid__filter-control");
    const a = i.closest("tr");
    a?.classList.add("admin-datagrid__filter-row"), a?.querySelectorAll("th").forEach((o) => {
      o.classList.add("admin-datagrid__header-cell");
    });
  }), document.querySelector(e.selectors.searchInput)?.closest("[data-datagrid-toolbar]")?.classList.add("admin-surface-card", "admin-datagrid__toolbar"), document.querySelector("[data-datagrid-filter-panel]")?.classList.add("admin-surface-card", "admin-datagrid__filter-panel");
  const s = document.querySelector(e.selectors.paginationContainer), n = s?.closest("[data-datagrid-pagination]") || s;
  n?.classList.add("admin-surface-card", "admin-datagrid__pagination"), n?.classList.toggle("admin-datagrid__pagination--presented", e.config.pagination?.mode === "semantic"), s?.classList.add("admin-datagrid__pagination-controls");
  for (const i of [
    e.selectors.tableInfoStart,
    e.selectors.tableInfoEnd,
    e.selectors.tableInfoTotal,
    e.selectors.tableInfoSummary
  ]) {
    const a = document.querySelector(i);
    a?.classList.add("admin-datagrid__pagination-text"), a?.parentElement?.classList.add("admin-datagrid__pagination-text");
  }
  document.querySelector(e.selectors.perPageSelect)?.parentElement?.classList.add("admin-datagrid__pagination-text");
}
function hn(e) {
  const t = document.querySelector(e.selectors.searchInput);
  if (!t) {
    console.warn(`[DataGrid] Search input not found: ${e.selectors.searchInput}`);
    return;
  }
  console.log(`[DataGrid] Search input bound to: ${e.selectors.searchInput}`);
  const r = document.getElementById("clear-search-btn"), s = () => {
    r && (t.value.trim() ? r.classList.remove("hidden") : r.classList.add("hidden"));
  };
  t.addEventListener("input", () => {
    s(), e.searchTimeout && clearTimeout(e.searchTimeout), e.searchTimeout = window.setTimeout(async () => {
      console.log(`[DataGrid] Search triggered: "${t.value}"`), e.state.search = t.value, e.pushStateToURL(), e.config.behaviors?.search ? await e.config.behaviors.search.onSearch(t.value, e) : (e.resetPagination(), await e.refresh());
    }, e.config.searchDelay);
  }), r && r.addEventListener("click", async () => {
    t.value = "", t.focus(), s(), e.state.search = "", e.pushStateToURL(), e.config.behaviors?.search ? await e.config.behaviors.search.onSearch("", e) : (e.resetPagination(), await e.refresh());
  }), s();
}
function pn(e) {
  const t = document.querySelector(e.selectors.perPageSelect);
  t && t.addEventListener("change", async () => {
    e.state.perPage = parseInt(t.value, 10), e.resetPagination(), e.pushStateToURL(), await e.refresh();
  });
}
function fn(e) {
  document.querySelectorAll(e.selectors.filterRow).forEach((t) => {
    const r = async () => {
      const s = t.dataset.filterColumn, n = t instanceof HTMLInputElement ? t.type.toLowerCase() : "", i = t instanceof HTMLSelectElement ? "eq" : n === "" || n === "text" || n === "search" || n === "email" || n === "tel" || n === "url" ? "ilike" : "eq", a = t.dataset.filterOperator || i, o = t.value;
      if (!s) return;
      const l = e.state.filters.findIndex((c) => c.column === s);
      if (o) {
        const c = {
          column: s,
          operator: a,
          value: o
        };
        l >= 0 ? e.state.filters[l] = c : e.state.filters.push(c);
      } else l >= 0 && e.state.filters.splice(l, 1);
      e.pushStateToURL(), e.config.behaviors?.filter ? await e.config.behaviors.filter.onFilterChange(s, o, e) : (e.resetPagination(), await e.refresh());
    };
    t.addEventListener("input", r), t.addEventListener("change", r);
  });
}
function mn(e) {
  const t = document.querySelector(e.selectors.columnToggleBtn), r = document.querySelector(e.selectors.columnToggleMenu);
  !t || !r || (e.columnManager = new cn({
    container: r,
    grid: e,
    onToggle: (s, n) => {
      console.log(`[DataGrid] Column ${s} visibility toggled to ${n}`);
    },
    onReorder: (s) => {
      console.log("[DataGrid] Columns reordered:", s);
    }
  }));
}
function gn(e) {
  if (!e.isCapabilityEnabled("export")) return;
  const t = document.querySelector(e.selectors.exportMenu);
  if (!t) return;
  const r = t.querySelectorAll("[data-export-format]");
  r.forEach((s) => {
    s.addEventListener("click", async () => {
      const n = s.dataset.exportFormat;
      if (!n || !e.config.behaviors?.export) return;
      const i = e.config.behaviors.export.getConcurrency?.() || "single", a = [];
      i === "single" ? r.forEach((u) => a.push(u)) : i === "per-format" && a.push(s);
      const o = (u) => {
        const h = u.querySelector(".export-icon"), p = u.querySelector(".export-spinner");
        h && h.classList.add("hidden"), p && p.classList.remove("hidden");
      }, l = (u) => {
        const h = u.querySelector(".export-icon"), p = u.querySelector(".export-spinner");
        h && h.classList.remove("hidden"), p && p.classList.add("hidden");
      };
      a.forEach((u) => {
        u.setAttribute("data-export-loading", "true"), u.disabled = !0, o(u);
      });
      const c = i === "none";
      c && (s.setAttribute("data-export-loading", "true"), o(s));
      try {
        await e.config.behaviors.export.export(n, e);
      } catch (u) {
        console.error("[DataGrid] Export failed:", u);
      } finally {
        a.forEach((u) => {
          u.removeAttribute("data-export-loading"), u.disabled = !1, l(u);
        }), c && (s.removeAttribute("data-export-loading"), l(s));
      }
    });
  });
}
function bn(e) {
  e.tableEl && (e.tableEl.querySelectorAll("[data-sort-column]").forEach((t) => {
    t.addEventListener("click", async (r) => {
      r.preventDefault(), r.stopPropagation();
      const s = t.dataset.sortColumn;
      if (!s) return;
      console.log(`[DataGrid] Sort button clicked for field: ${s}`);
      const n = e.state.sort.find((a) => a.field === s);
      let i = null;
      n ? n.direction === "asc" ? (i = "desc", n.direction = i) : (e.state.sort = e.state.sort.filter((a) => a.field !== s), i = null, console.log(`[DataGrid] Sort cleared for field: ${s}`)) : (i = "asc", e.state.sort = [{
        field: s,
        direction: i
      }]), console.log("[DataGrid] New sort state:", e.state.sort), e.pushStateToURL(), i !== null && e.config.behaviors?.sort ? (console.log("[DataGrid] Calling custom sort behavior"), await e.config.behaviors.sort.onSort(s, i, e)) : (console.log("[DataGrid] Calling refresh() for sort"), await e.refresh()), console.log("[DataGrid] Updating sort indicators"), e.updateSortIndicators();
    });
  }), e.tableEl.querySelectorAll("[data-sort]").forEach((t) => {
    t.addEventListener("click", async () => {
      const r = t.dataset.sort;
      if (!r) return;
      const s = e.state.sort.find((i) => i.field === r);
      let n = null;
      s ? s.direction === "asc" ? (n = "desc", s.direction = n) : (e.state.sort = e.state.sort.filter((i) => i.field !== r), n = null) : (n = "asc", e.state.sort = [{
        field: r,
        direction: n
      }]), e.pushStateToURL(), n !== null && e.config.behaviors?.sort ? await e.config.behaviors.sort.onSort(r, n, e) : await e.refresh(), e.updateSortIndicators();
    });
  }));
}
function yn(e) {
  e.tableEl && (e.tableEl.querySelectorAll("[data-sort-column]").forEach((t) => {
    const r = t.dataset.sortColumn;
    if (!r) return;
    const s = e.state.sort.find((i) => i.field === r), n = t.querySelector("svg");
    n && (s ? (t.classList.remove("opacity-0"), t.classList.add("opacity-100"), s.direction === "asc" ? (n.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />', n.classList.add("text-blue-600"), n.classList.remove("text-gray-400")) : (n.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />', n.classList.add("text-blue-600"), n.classList.remove("text-gray-400"))) : (n.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />', n.classList.remove("text-blue-600"), n.classList.add("text-gray-400")));
  }), e.tableEl.querySelectorAll("[data-sort]").forEach((t) => {
    const r = t.dataset.sort, s = e.state.sort.find((i) => i.field === r), n = t.querySelector(".sort-indicator");
    n && (n.textContent = s ? s.direction === "asc" ? "↑" : "↓" : "");
  }));
}
function vn(e) {
  if (!e.isCapabilityEnabled("selection")) {
    e.selectionAbortController?.abort(), e.selectionAbortController = null, e.state.selectedRows.clear();
    return;
  }
  if (!e.tableEl) return;
  e.selectionAbortController && e.selectionAbortController.abort(), e.selectionAbortController = new AbortController();
  const { signal: t } = e.selectionAbortController, r = e.tableEl.querySelector(e.selectors.selectAllCheckbox);
  r && r.addEventListener("change", () => {
    e.tableEl.querySelectorAll(e.selectors.rowCheckboxes).forEach((s) => {
      s.checked = r.checked, we(s);
      const n = s.dataset.id;
      n && (r.checked ? e.state.selectedRows.add(n) : e.state.selectedRows.delete(n));
    }), e.updateBulkActionsBar();
  }, { signal: t }), e.tableEl.addEventListener("change", (s) => {
    const n = s.target;
    if (!n || n === r || typeof n.matches != "function" || !n.matches(e.selectors.rowCheckboxes)) return;
    const i = n.dataset.id;
    i && (n.checked ? e.state.selectedRows.add(i) : e.state.selectedRows.delete(i)), we(n), e.updateBulkActionsBar();
  }, { signal: t }), e.updateSelectionBindings();
}
function wn(e) {
  e.isCapabilityEnabled("selection") && (e.tableEl?.querySelectorAll(e.selectors.rowCheckboxes) || []).forEach((t) => {
    const r = t.dataset.id;
    r && (t.checked = e.state.selectedRows.has(r)), we(t);
  });
}
function we(e) {
  const t = e.closest("tr");
  t && (t.dataset.selected = String(e.checked), t.setAttribute("aria-selected", String(e.checked)));
}
function Ue(e) {
  return Array.from(new Set(e.filter(Boolean)));
}
function xe(e, t) {
  for (const r of t) {
    const s = e.querySelector(r);
    if (s) return s;
  }
  return null;
}
function xn(e) {
  const t = e?.selectors?.bulkActionsBar;
  if (!t) return null;
  try {
    return document.querySelector(t);
  } catch {
    return null;
  }
}
function N(e) {
  const t = xn(e);
  return t && e?.selectors?.bulkActionsBar !== "#bulk-actions-bar" ? t : xe(document, [
    "[data-bulk-action-overlay]",
    "#bulk-actions-overlay",
    '[data-bulk-action-bar="true"]'
  ]) || t;
}
function De(e) {
  const t = N(e);
  return Array.from(t ? t.querySelectorAll("[data-bulk-action]") : document.querySelectorAll("[data-bulk-action]"));
}
function Sn(e) {
  const t = N(e), r = [
    "[data-bulk-selection-count]",
    "#selected-count",
    e?.selectors?.selectedCount
  ].filter(Boolean);
  return (t ? xe(t, r) : null) || xe(document, r);
}
function Cn(e) {
  const t = N(e), r = [
    "[data-bulk-clear]",
    "#bulk-clear-selection",
    "#clear-selection-btn"
  ], s = r.flatMap((n) => Array.from((t || document).querySelectorAll(n)));
  return s.length ? Ue(s) : Ue(r.flatMap((n) => Array.from(document.querySelectorAll(n))));
}
function Ct(e) {
  Cn(e).forEach((t) => {
    t.dataset.bulkClearBound !== "true" && (t.dataset.bulkClearBound = "true", t.addEventListener("click", () => {
      e.clearSelection();
    }));
  });
}
function $n(e, t) {
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
function An(e) {
  if (!e) return null;
  let t = e.querySelector("[data-bulk-action-state-reasons]");
  return t || (t = document.createElement("div"), t.dataset.bulkActionStateReasons = "true", t.className = "hidden mt-3 text-sm text-gray-700", e.appendChild(t), t);
}
function $t(e, t) {
  const r = An(N(t));
  if (r) {
    if (!e.length) {
      r.classList.add("hidden"), r.innerHTML = "";
      return;
    }
    r.classList.remove("hidden"), r.innerHTML = e.map((s) => `
    <div data-bulk-action-reason-item="${s.actionId}" class="mt-1">
      <span class="font-medium">${s.label}:</span> ${s.reason}
    </div>
  `).join("");
  }
}
function En(e, t, r) {
  const s = t?.enabled === !1, n = typeof t?.reason == "string" ? t.reason.trim() : "";
  return e.dataset.disabled = s ? "true" : "false", e.setAttribute("aria-disabled", s ? "true" : "false"), e.dataset.bulkState = s ? "disabled" : "enabled", e.classList.toggle("opacity-50", s), e.classList.toggle("cursor-not-allowed", s), s && n ? (e.setAttribute("title", n), {
    actionId: e.dataset.bulkAction || "",
    label: r,
    reason: n
  }) : (e.removeAttribute("title"), null);
}
function kn(e) {
  const t = De(e), r = "Checking selected records...", s = [];
  t.forEach((n) => {
    n.dataset.disabled = "true", n.dataset.bulkState = "loading", n.setAttribute("aria-disabled", "true"), n.setAttribute("title", r), n.classList.add("opacity-50", "cursor-not-allowed"), s.push({
      actionId: n.dataset.bulkAction || "",
      label: n.textContent?.trim() || n.dataset.bulkAction || "Action",
      reason: r
    });
  }), $t(s, e);
}
function At(e) {
  return at(e.bulkActionStateConfig);
}
function Ln(e, t, r) {
  e.bulkActionState = ot(t), e.bulkActionStateConfig = at(r), e.applyBulkActionState(e.bulkActionState);
}
function _n(e, t) {
  const r = ot(t);
  e.bulkActionState = r;
  const s = [];
  De(e).forEach((n) => {
    const i = n.dataset.bulkAction;
    if (!i) return;
    const a = En(n, r[i] || null, n.textContent?.trim() || i);
    a && s.push(a);
  }), $t(s, e);
}
async function Rn(e) {
  const t = At(e), r = typeof t?.selection_state_endpoint == "string" ? t.selection_state_endpoint.trim() : "";
  if (!r) {
    e.applyBulkActionState(e.bulkActionState);
    return;
  }
  const s = Array.from(e.state.selectedRows);
  if (!s.length) {
    e.applyBulkActionState(e.bulkActionState);
    return;
  }
  e.bulkActionStateAbortController && e.bulkActionStateAbortController.abort(), e.bulkActionStateAbortController = new AbortController(), e.bulkActionStateRequestSeq += 1;
  const n = e.bulkActionStateRequestSeq, i = typeof e.buildQueryString == "function" ? e.buildQueryString() : "", a = i ? `${r}${r.includes("?") ? "&" : "?"}${i}` : r;
  try {
    const o = await C(a, {
      method: "POST",
      signal: e.bulkActionStateAbortController.signal,
      json: { ids: s }
    });
    if (!o.ok) throw new Error(`Bulk action state request failed: ${o.status}`);
    const l = pr(await o.json());
    if (!l || n !== e.bulkActionStateRequestSeq) return;
    e.applyBulkActionState({
      ...e.bulkActionState,
      ...l.bulk_action_state
    });
  } catch (o) {
    if (o instanceof Error && o.name === "AbortError") return;
    console.warn("[DataGrid] Failed to refresh selection-sensitive bulk action state:", o), n === e.bulkActionStateRequestSeq && e.applyBulkActionState(e.bulkActionState);
  }
}
function Pn(e) {
  if (!e.isCapabilityEnabled("bulk")) return;
  e.bulkActionStateDebounce && (clearTimeout(e.bulkActionStateDebounce), e.bulkActionStateDebounce = null);
  const t = At(e), r = e.state.selectedRows.size;
  if (!t?.selection_sensitive || !t.selection_state_endpoint || r === 0) {
    e.bulkActionStateAbortController && (e.bulkActionStateAbortController.abort(), e.bulkActionStateAbortController = null), e.applyBulkActionState(e.bulkActionState);
    return;
  }
  kn(e);
  const s = typeof t.debounce_ms == "number" ? t.debounce_ms : 150;
  e.bulkActionStateDebounce = window.setTimeout(() => {
    e.bulkActionStateDebounce = null, Rn(e);
  }, s);
}
function Tn(e) {
  if (!e.isCapabilityEnabled("bulk")) return;
  const t = N(e)?.dataset?.bulkBase || "";
  De(e).forEach((r) => {
    r.addEventListener("click", async () => {
      const s = r, n = s.dataset.bulkAction;
      if (!n || s.getAttribute("aria-disabled") === "true" || s.dataset.disabled === "true") return;
      const i = Array.from(e.state.selectedRows);
      if (i.length === 0) {
        e.notify("Please select items first", "warning");
        return;
      }
      if (e.config.bulkActions) {
        const a = e.config.bulkActions.find((o) => o.id === n);
        if (a) {
          try {
            await e.actionRenderer.executeBulkAction(a, i), e.clearSelection(), await e.refresh();
          } catch (o) {
            console.error("Bulk action failed:", o), V(o)?.textCode && await e.refresh(), M(o) || e.showError(o instanceof Error ? o.message : "Bulk action failed");
          }
          return;
        }
      }
      if (t) {
        const a = `${t}/${n}`, o = s.dataset.bulkConfirm, l = e.parseDatasetStringArray(s.dataset.bulkPayloadRequired), c = e.parseDatasetObject(s.dataset.bulkPayloadSchema), u = {
          id: n,
          label: s.textContent?.trim() || n,
          endpoint: a,
          confirm: o,
          payloadRequired: l,
          payloadSchema: c
        };
        try {
          await e.actionRenderer.executeBulkAction(u, i), e.clearSelection(), await e.refresh();
        } catch (h) {
          console.error("Bulk action failed:", h), V(h)?.textCode && await e.refresh(), M(h) || e.showError(h instanceof Error ? h.message : "Bulk action failed");
        }
        return;
      }
      if (e.config.behaviors?.bulkActions) try {
        await e.config.behaviors.bulkActions.execute(n, i, e), e.clearSelection();
      } catch (a) {
        console.error("Bulk action failed:", a), V(a)?.textCode && await e.refresh(), M(a) || e.showError(a instanceof Error ? a.message : "Bulk action failed");
      }
    });
  }), Ct(e), e.bindOverflowMenu();
}
function Dn(e) {
  const t = document.getElementById("bulk-more-btn"), r = document.getElementById("bulk-overflow-menu");
  !t || !r || (t.addEventListener("click", (s) => {
    s.stopPropagation(), r.classList.toggle("hidden");
  }), document.addEventListener("click", () => {
    r.classList.add("hidden");
  }), document.addEventListener("keydown", (s) => {
    s.key === "Escape" && r.classList.add("hidden");
  }), r.addEventListener("click", (s) => {
    s.stopPropagation();
  }));
}
function Mn(e) {
  if (!e.isCapabilityEnabled("bulk")) return;
  const t = N(e), r = Sn(e), s = e.state.selectedRows.size;
  !t || !r || (r.textContent = String(s), $n(t, s), s > 0 && t.offsetHeight, e.syncBulkActionState());
}
function In(e) {
  e.isCapabilityEnabled("bulk") && Ct(e);
}
function Bn(e) {
  if (!e.isCapabilityEnabled("selection")) return;
  console.log("[DataGrid] Clearing selection..."), e.state.selectedRows.clear();
  const t = e.tableEl?.querySelector(e.selectors.selectAllCheckbox);
  t && (t.checked = !1), e.updateBulkActionsBar(), e.updateSelectionBindings();
}
function Fn(e, t, r) {
  er({
    trigger: t,
    menu: r
  });
}
function qn(e) {
  e.actionMenuController && (e.actionMenuController.destroy(), e.actionMenuController = null), e.dropdownAbortController && e.dropdownAbortController.abort(), e.dropdownAbortController = new AbortController();
  const { signal: t } = e.dropdownAbortController;
  document.querySelectorAll("[data-dropdown-toggle]").forEach((n) => {
    const i = n.dataset.dropdownToggle, a = document.getElementById(i || "");
    a && !a.classList.contains("hidden") && a.classList.add("hidden");
  });
  const r = (n = !1) => {
    document.querySelectorAll("[data-dropdown-toggle]").forEach((i) => {
      const a = i.dataset.dropdownToggle, o = document.getElementById(a || "");
      o && (o.classList.add("hidden"), i.setAttribute("aria-expanded", "false"), n && o.getAttribute("data-dropdown-open") === "true" && i.focus(), o.removeAttribute("data-dropdown-open"));
    });
  };
  dn(document, "click", "[data-dropdown-toggle]", (n, i) => {
    const a = i.dataset.dropdownToggle, o = document.getElementById(a || "");
    if (!(!e.isCapabilityEnabled("export") && (i.matches(e.selectors.exportBtn) || o?.matches(e.selectors.exportMenu))) && (n.stopPropagation(), o)) {
      const l = o.classList.contains("hidden");
      document.querySelectorAll("[data-dropdown-toggle]").forEach((c) => {
        const u = c.dataset.dropdownToggle, h = document.getElementById(u || "");
        h && h !== o && (h.classList.add("hidden"), c.setAttribute("aria-expanded", "false"), h.removeAttribute("data-dropdown-open"));
      }), o.classList.toggle("hidden"), i.setAttribute("aria-expanded", String(l)), l ? (o.setAttribute("data-dropdown-open", "true"), o.querySelector('[role="option"], [role="menuitem"], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])')?.focus()) : (o.removeAttribute("data-dropdown-open"), i.focus());
    }
  }, { signal: t }), document.addEventListener("click", (n) => {
    const i = n.target;
    i && typeof i.closest == "function" && i.closest("[data-dropdown-toggle], #column-toggle-menu, #export-menu") || r();
  }, { signal: t });
  const s = e.tableEl ?? document;
  e.actionMenuController = tr(s, {
    containerSelector: "[data-dropdown], .actions-dropdown",
    triggerSelector: "[data-dropdown-trigger], .actions-menu-trigger",
    menuSelector: ".actions-menu",
    itemSelector: '[role="menuitem"], .action-item',
    outsideIgnoreSelector: "[data-dropdown-toggle], #column-toggle-menu, #export-menu",
    positionMenu: ({ trigger: n, menu: i }) => {
      e.positionDropdownMenu(n, i);
    },
    portal: !0,
    signal: t
  }), document.addEventListener("keydown", (n) => {
    n.key === "Escape" && r(!0);
  }, { signal: t });
}
function On(e, t) {
  console.error(t), e.notifier.error(t);
}
function jn(e, t, r) {
  e.notifier.show({
    message: t,
    type: r
  });
}
async function Nn(e, t) {
  return e.notifier.confirm(t);
}
async function zn(e, t) {
  return t instanceof Response ? Yt(t) : t instanceof Error ? t.message : "An unexpected error occurred";
}
function Gn(e, t) {
  if (t)
    try {
      const r = JSON.parse(t);
      if (!Array.isArray(r)) return;
      const s = r.map((n) => typeof n == "string" ? n.trim() : "").filter((n) => n.length > 0);
      return s.length > 0 ? s : void 0;
    } catch (r) {
      console.warn("[DataGrid] Failed to parse bulk payload_required:", r);
      return;
    }
}
function Un(e, t) {
  if (t)
    try {
      const r = JSON.parse(t);
      return !r || typeof r != "object" || Array.isArray(r) ? void 0 : r;
    } catch (r) {
      console.warn("[DataGrid] Failed to parse bulk payload_schema:", r);
      return;
    }
}
function Hn(e, t) {
  if (!e.tableEl) return;
  const r = e.mergeColumnOrder(t);
  e.state.columnOrder = r;
  const s = new Map(e.config.columns.map((n) => [n.field, n]));
  e.config.columns = r.map((n) => s.get(n)).filter((n) => n !== void 0), e.reorderTableColumns(r), e.persistStateSnapshot(), console.log("[DataGrid] Columns reordered:", r);
}
function Vn(e) {
  e.config.behaviors?.columnVisibility?.clearSavedPrefs?.(), e.config.columns = e.defaultColumns.map((r) => ({ ...r })), e.state.columnOrder = e.config.columns.map((r) => r.field);
  const t = e.config.columns.filter((r) => !r.hidden).map((r) => r.field);
  e.tableEl ? (e.reorderTableColumns(e.state.columnOrder), e.updateColumnVisibility(t)) : (e.state.hiddenColumns = new Set(e.config.columns.filter((r) => r.hidden).map((r) => r.field)), e.persistStateSnapshot()), e.columnManager && (e.columnManager.refresh(), e.columnManager.syncWithGridState()), console.log("[DataGrid] Columns reset to default");
}
function Kn(e, t) {
  const r = new Set(e.config.columns.map((a) => a.field)), s = new Set(t), n = t.filter((a) => r.has(a)), i = e.config.columns.map((a) => a.field).filter((a) => !s.has(a));
  return [...n, ...i];
}
function Jn(e, t) {
  if (!e.tableEl) return;
  const r = e.tableEl.querySelector("thead tr:first-child");
  r && e.reorderRowCells(r, t, "th");
  const s = e.tableEl.querySelector("#filter-row");
  s && e.reorderRowCells(s, t, "th"), e.tableEl.querySelectorAll("tbody tr").forEach((n) => {
    e.reorderRowCells(n, t, "td");
  });
}
function Qn(e, t, r, s) {
  const n = Array.from(t.querySelectorAll(`${s}[data-column]`)), i = new Map(n.map((u) => [u.dataset.column, u])), a = Array.from(t.querySelectorAll(s)), o = t.querySelector(`${s}[data-role="selection"]`) || a.find((u) => u.querySelector('input[type="checkbox"]')), l = t.querySelector(`${s}[data-role="actions"]`) || a.find((u) => !u.dataset.column && (u.querySelector("[data-action]") || u.querySelector("[data-action-id]") || u.querySelector(".dropdown"))), c = [];
  o && c.push(o), r.forEach((u) => {
    const h = i.get(u);
    h && c.push(h);
  }), l && c.push(l), c.forEach((u) => {
    t.appendChild(u);
  });
}
var $;
function Yn(e) {
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
var Et = class {
  constructor(e) {
    this.tableEl = null, this.searchTimeout = null, this.abortController = null, this.dropdownAbortController = null, this.actionMenuController = null, this.selectionAbortController = null, this.didRestoreColumnOrder = !1, this.shouldReorderDOMOnRestore = !1, this.recordsById = {}, this.columnManager = null, this.lastSchema = null, this.lastForm = null, this.bulkActionState = {}, this.bulkActionStateConfig = null, this.bulkActionStateDebounce = null, this.bulkActionStateAbortController = null, this.bulkActionStateRequestSeq = 0, this.refreshDrainPromise = null, this.refreshInFlight = null, this.refreshQueued = !1, this.refreshRequestSeq = 0, this.activeRefreshSeq = 0, this.hasURLStateOverrides = !1, this.hasPersistedHiddenColumnState = !1, this.hasPersistedColumnOrderState = !1, this.config = {
      perPage: 10,
      searchDelay: 300,
      behaviors: {},
      ...e,
      capabilities: Yn(e.capabilities)
    }, this.notifier = e.notifier || new O(), this.selectors = {
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
    this.stateStore = this.config.stateStore || rs({
      key: t,
      ...this.config.stateStoreConfig || {}
    });
    const r = this.stateStore.loadPersistedState(), s = new Set(this.config.columns.map((w) => w.field)), n = new Set(this.config.columns.filter((w) => w.hidden).map((w) => w.field)), i = !!r && Array.isArray(r.hiddenColumns);
    this.hasPersistedHiddenColumnState = i;
    const a = new Set((r?.hiddenColumns || []).filter((w) => s.has(w))), o = this.config.columns.map((w) => w.field), l = !!r && Array.isArray(r.columnOrder) && r.columnOrder.length > 0;
    this.hasPersistedColumnOrderState = l;
    const c = (r?.columnOrder || []).filter((w) => s.has(w)), u = l ? [...c, ...o.filter((w) => !c.includes(w))] : o, h = this.config.enableGroupedMode ? ur(t) : !1, p = this.config.enableGroupedMode ? fr(t) : null, m = this.config.enableGroupedMode ? vr(t) : "explicit", v = this.config.enableGroupedMode ? cr(t) : /* @__PURE__ */ new Set(), y = ke(r?.expandMode, m), b = new Set((r?.expandedGroups || Array.from(v)).map((w) => String(w).trim()).filter(Boolean)), x = this.config.enableGroupedMode ? r?.expandMode !== void 0 || b.size > 0 || h : !1, S = (this.config.enableGroupedMode ? r?.viewMode || p : null) || this.config.defaultViewMode || "flat";
    this.state = {
      currentPage: 1,
      perPage: this.config.perPage || 10,
      totalRows: 0,
      search: "",
      filters: [],
      sort: [],
      selectedRows: /* @__PURE__ */ new Set(),
      hiddenColumns: i ? a : n,
      columnOrder: u,
      viewMode: S,
      expandMode: y,
      groupedData: null,
      expandedGroups: b,
      hasPersistedExpandState: x
    }, this.actionRenderer = new Ar({
      mode: this.config.actionRenderMode || "dropdown",
      actionBasePath: this.config.actionBasePath || this.config.apiEndpoint,
      notifier: this.notifier,
      domIdPrefix: this.config.tableId
    }), this.cellRendererRegistry = new Vr(), this.config.cellRenderers && Object.entries(this.config.cellRenderers).forEach(([w, z]) => {
      this.cellRendererRegistry.register(w, z);
    }), this.defaultColumns = this.config.columns.map((w) => ({ ...w }));
  }
  init() {
    if (console.log("[DataGrid] Initializing with config:", this.config), this.tableEl = document.querySelector(this.selectors.table), !this.tableEl) {
      console.error(`[DataGrid] Table element not found: ${this.selectors.table}`);
      return;
    }
    console.log("[DataGrid] Table element found:", this.tableEl), Js(this), un(this), this.restoreStateFromURL(), this.bindSearchInput(), this.bindPerPageSelect(), this.bindFilterInputs(), this.bindColumnVisibility(), this.bindExportButtons(), this.bindSorting(), this.bindSelection(), this.bindBulkActions(), this.bindBulkClearButton(), this.bindDropdownToggles(), this.refreshAfterStateHydration();
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
        console.error("[DataGrid] onStateChange callback failed:", t);
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
    return is(this);
  }
  parseJSONArray(e, t) {
    return as(this, e, t);
  }
  applyPersistedStateSnapshot(e, t = {}) {
    cs(this, e, t);
  }
  applyShareStateSnapshot(e) {
    ds(this, e);
  }
  buildPersistedStateSnapshot() {
    return us(this);
  }
  buildShareStateSnapshot() {
    return hs(this);
  }
  persistStateSnapshot() {
    ps(this);
  }
  restoreStateFromURL() {
    fs(this);
  }
  applyRestoredState() {
    ms(this);
  }
  pushStateToURL(e = {}) {
    gs(this, e);
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
      this.activeRefreshSeq = e, this.refreshInFlight = bs(this, e), await this.refreshInFlight, this.refreshInFlight = null;
    }
  }
  buildApiUrl() {
    return ys(this);
  }
  buildQueryString() {
    return vs(this);
  }
  buildQueryParams() {
    return ws(this);
  }
  getResponseTotal(e) {
    return xs(this, e);
  }
  normalizePagination(e) {
    return Ss(this, e);
  }
  resetPagination() {
    this.state.currentPage = 1;
  }
  updateColumnVisibility(e, t = !1) {
    Vs(this, e, t);
  }
  syncColumnVisibilityCheckboxes() {
    Ks(this);
  }
  renderData(e) {
    Ws(this, e);
  }
  renderLoadingState() {
    Qs(this);
  }
  renderErrorState(e) {
    Ys(this, e);
  }
  renderFlatData(e, t) {
    Xs(this, e, t);
  }
  renderGroupedData(e, t, r) {
    Ls(this, e, t, r);
  }
  isGroupedViewActive() {
    return _s(this);
  }
  fallbackGroupedMode(e) {
    Rs(this, e);
  }
  handleGroupedModeStatusFallback(e) {
    return Ps(this, e);
  }
  handleGroupedModePayloadFallback(e) {
    return Ts(this, e);
  }
  toggleGroup(e) {
    Ds(this, e);
  }
  setExpandedGroups(e) {
    Ms(this, e);
  }
  expandAllGroups() {
    Is(this);
  }
  collapseAllGroups() {
    Bs(this);
  }
  updateGroupVisibility(e) {
    Fs(this, e);
  }
  updateGroupedRowsFromState() {
    qs(this);
  }
  isGroupExpandedByState(e, t = !1) {
    return Os(this, e, t);
  }
  setViewMode(e) {
    js(this, e);
  }
  getViewMode() {
    return Ns(this);
  }
  getGroupedData() {
    return zs(this);
  }
  async fetchDetail(e) {
    return Cs(this, e);
  }
  getSchema() {
    return As(this);
  }
  getForm() {
    return Es(this);
  }
  getTabs() {
    return ks(this);
  }
  normalizeDetailResponse(e) {
    return $s(this, e);
  }
  resolveRendererOptions(e) {
    return Zs(this, e);
  }
  createTableRow(e) {
    return en(this, e);
  }
  sanitizeActionId(e) {
    return tn(this, e);
  }
  async handleDelete(e) {
    return rn(this, e);
  }
  updatePaginationUI(e) {
    sn(this, e);
  }
  renderPaginationButtons(e) {
    nn(this, e);
  }
  bindSearchInput() {
    hn(this);
  }
  bindPerPageSelect() {
    pn(this);
  }
  bindFilterInputs() {
    fn(this);
  }
  bindColumnVisibility() {
    mn(this);
  }
  bindExportButtons() {
    gn(this);
  }
  bindSorting() {
    bn(this);
  }
  updateSortIndicators() {
    yn(this);
  }
  bindSelection() {
    vn(this);
  }
  updateSelectionBindings() {
    wn(this);
  }
  bindBulkActions() {
    Tn(this);
  }
  bindOverflowMenu() {
    Dn(this);
  }
  updateBulkActionsBar() {
    Mn(this);
  }
  setBulkActionState(e, t) {
    Ln(this, e, t);
  }
  applyBulkActionState(e) {
    _n(this, e);
  }
  syncBulkActionState() {
    Pn(this);
  }
  bindBulkClearButton() {
    In(this);
  }
  clearSelection() {
    Bn(this);
  }
  positionDropdownMenu(e, t) {
    Fn(this, e, t);
  }
  bindDropdownToggles() {
    qn(this);
  }
  showError(e) {
    On(this, e);
  }
  notify(e, t) {
    jn(this, e, t);
  }
  async confirmAction(e) {
    return Nn(this, e);
  }
  async extractError(e) {
    return zn(this, e);
  }
  parseDatasetStringArray(e) {
    return Gn(this, e);
  }
  parseDatasetObject(e) {
    return Un(this, e);
  }
  reorderColumns(e) {
    Hn(this, e);
  }
  resetColumnsToDefault() {
    Vn(this);
  }
  mergeColumnOrder(e) {
    return Kn(this, e);
  }
  reorderTableColumns(e) {
    Jn(this, e);
  }
  reorderRowCells(e, t, r) {
    Qn(this, e, t, r);
  }
  destroy() {
    this.columnManager && (this.columnManager.destroy(), this.columnManager = null), this.dropdownAbortController && (this.dropdownAbortController.abort(), this.dropdownAbortController = null), this.actionMenuController && (this.actionMenuController.destroy(), this.actionMenuController = null), this.selectionAbortController && (this.selectionAbortController.abort(), this.selectionAbortController = null), this.abortController && (this.abortController.abort(), this.abortController = null), this.bulkActionStateAbortController && (this.bulkActionStateAbortController.abort(), this.bulkActionStateAbortController = null), this.searchTimeout && (clearTimeout(this.searchTimeout), this.searchTimeout = null), this.bulkActionStateDebounce && (clearTimeout(this.bulkActionStateDebounce), this.bulkActionStateDebounce = null), console.log("[DataGrid] Instance destroyed");
  }
};
$ = Et;
$.URL_KEY_SEARCH = J;
$.URL_KEY_PAGE = Q;
$.URL_KEY_PER_PAGE = Y;
$.URL_KEY_FILTERS = B;
$.URL_KEY_SORT = W;
$.URL_KEY_STATE = ie;
$.URL_KEY_HIDDEN_COLUMNS = ae;
$.URL_KEY_VIEW_MODE = oe;
$.URL_KEY_EXPANDED_GROUPS = Re;
$.MANAGED_URL_KEYS = Pe;
$.DEFAULT_MAX_URL_LENGTH = ns;
$.DEFAULT_MAX_FILTERS_LENGTH = 600;
typeof window < "u" && (window.DataGrid = Et);
var He = {
  text: [
    {
      label: "contains",
      value: "ilike"
    },
    {
      label: "equals",
      value: "eq"
    },
    {
      label: "starts with",
      value: "starts"
    },
    {
      label: "ends with",
      value: "ends"
    },
    {
      label: "not equals",
      value: "ne"
    }
  ],
  number: [
    {
      label: "equals",
      value: "eq"
    },
    {
      label: "not equals",
      value: "ne"
    },
    {
      label: "greater than",
      value: "gt"
    },
    {
      label: "less than",
      value: "lt"
    },
    {
      label: "between",
      value: "between"
    }
  ],
  select: [{
    label: "equals",
    value: "eq"
  }, {
    label: "not equals",
    value: "ne"
  }],
  date: [
    {
      label: "on",
      value: "eq"
    },
    {
      label: "before",
      value: "lt"
    },
    {
      label: "after",
      value: "gt"
    },
    {
      label: "between",
      value: "between"
    }
  ]
}, Qo = class {
  constructor(e) {
    this.criteria = [], this.modal = null, this.container = null, this.searchInput = null, this.clearBtn = null, this.config = e, this.notifier = e.notifier || new O();
  }
  init() {
    if (this.modal = document.getElementById("advanced-search-modal"), this.container = document.getElementById("search-criteria-container"), this.searchInput = document.getElementById("table-search"), this.clearBtn = document.getElementById("search-clear-btn"), !this.modal || !this.container) {
      console.error("[AdvancedSearch] Required elements not found");
      return;
    }
    const e = this.restoreCriteriaFromURL();
    this.criteria.length > 0 && (this.renderCriteria(), this.renderChips()), e && this.config.onSearch(this.criteria), this.bindEvents(), this.bindClearButton();
  }
  restoreCriteriaFromURL() {
    const e = new URLSearchParams(window.location.search), t = e.get(ee);
    if (t !== null) {
      const s = this.parseAdvancedSearchCriteria(t);
      return s ? (this.criteria = s, !0) : !1;
    }
    const r = e.get(B);
    if (r !== null) try {
      const s = JSON.parse(r);
      return this.criteria = this.normalizeCriteria(Array.isArray(s) ? s.map((n) => ({
        field: n?.column,
        operator: n?.operator || "ilike",
        value: n?.value,
        logic: "and"
      })) : []), console.log("[AdvancedSearch] Restored criteria from URL:", this.criteria), !0;
    } catch (s) {
      console.warn("[AdvancedSearch] Failed to parse filters from URL:", s);
    }
    return !1;
  }
  parseAdvancedSearchCriteria(e) {
    try {
      const t = JSON.parse(e);
      if (!Array.isArray(t))
        return console.warn("[AdvancedSearch] Invalid advanced_search payload in URL (expected array)"), null;
      const r = this.normalizeCriteria(t);
      return console.log("[AdvancedSearch] Restored criteria from URL:", r), r;
    } catch (t) {
      return console.warn("[AdvancedSearch] Failed to parse advanced_search from URL:", t), null;
    }
  }
  normalizeCriteria(e) {
    const t = new Set(this.config.fields.map((r) => r.name));
    return e.map((r) => {
      const s = String(r?.field || "").trim();
      if (!s || !t.has(s)) return null;
      const n = String(r?.operator || "ilike").trim() || "ilike", i = r?.logic === "or" ? "or" : "and";
      return {
        field: s,
        operator: n,
        value: typeof r?.value == "number" ? r.value : String(r?.value || ""),
        logic: i
      };
    }).filter((r) => r !== null);
  }
  pushCriteriaToURL() {
    const e = new URLSearchParams(window.location.search);
    this.criteria.length > 0 ? e.set(ee, JSON.stringify(this.criteria)) : (e.delete(ee), e.delete(B)), bt.forEach((r) => e.delete(r));
    const t = e.toString() ? `${window.location.pathname}?${e.toString()}` : window.location.pathname;
    window.history.pushState({}, "", t), console.log("[AdvancedSearch] URL updated with criteria");
  }
  bindEvents() {
    document.getElementById("advanced-search-btn")?.addEventListener("click", () => this.open());
    const e = document.getElementById("advanced-search-close"), t = document.getElementById("advanced-search-cancel"), r = document.getElementById("advanced-search-overlay");
    e?.addEventListener("click", () => this.close()), t?.addEventListener("click", () => this.close()), r?.addEventListener("click", () => this.close()), document.getElementById("add-criteria-btn")?.addEventListener("click", () => this.addCriterion()), document.getElementById("advanced-search-apply")?.addEventListener("click", () => this.applySearch());
    const s = document.getElementById("save-search-preset-btn"), n = document.getElementById("load-search-preset-btn");
    s?.addEventListener("click", () => this.savePreset()), n?.addEventListener("click", () => this.loadPreset());
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
      const r = document.createElement("div"), s = this.createCriterionRow(e, t);
      if (r.appendChild(s), t < this.criteria.length - 1) {
        const n = this.createLogicConnector(t);
        r.appendChild(n);
      }
      this.container.appendChild(r);
    }));
  }
  createCriterionRow(e, t) {
    const r = document.createElement("div");
    r.className = "flex items-center gap-2 py-3";
    const s = this.config.fields.find((n) => n.name === e.field) || this.config.fields[0];
    return r.innerHTML = `
      <select data-criterion-index="${t}" data-criterion-part="field"
              class="py-2 px-3 pe-9 block border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50">
        ${this.config.fields.map((n) => `
          <option value="${n.name}" ${n.name === e.field ? "selected" : ""}>${n.label}</option>
        `).join("")}
      </select>

      <select data-criterion-index="${t}" data-criterion-part="operator"
              class="py-2 px-3 pe-9 block border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50">
        ${this.getOperatorsForField(s).map((n) => `
          <option value="${n.value}" ${n.value === e.operator ? "selected" : ""}>${n.label}</option>
        `).join("")}
      </select>

      ${this.createValueInput(s, e, t)}

      <button type="button" data-criterion-index="${t}" data-action="remove"
              class="p-2 text-gray-400 hover:text-red-600">
        <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
        </svg>
      </button>
    `, r.querySelectorAll("select, input").forEach((n) => {
      n.addEventListener("change", (i) => this.updateCriterion(i.target));
    }), r.querySelector('[data-action="remove"]')?.addEventListener("click", () => {
      this.removeCriterion(t);
    }), r;
  }
  createValueInput(e, t, r) {
    return e.type === "select" && e.options ? `
        <select data-criterion-index="${r}" data-criterion-part="value"
                class="flex-1 py-2 px-3 block border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500">
          <option value="">Select...</option>
          ${e.options.map((s) => `
            <option value="${s.value}" ${s.value === t.value ? "selected" : ""}>${s.label}</option>
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
    `, t.querySelectorAll("[data-logic-index]").forEach((s) => {
      s.addEventListener("click", (n) => {
        const i = n.target, a = parseInt(i.dataset.logicIndex || "0", 10), o = i.dataset.logicValue;
        this.criteria[a].logic = o, this.renderCriteria();
      });
    }), t;
  }
  updateCriterion(e) {
    const t = parseInt(e.dataset.criterionIndex || "0", 10), r = e.dataset.criterionPart;
    if (!this.criteria[t]) return;
    const s = e.value;
    r === "field" ? (this.criteria[t].field = s, this.renderCriteria()) : r === "operator" ? this.criteria[t].operator = s : r === "value" && (this.criteria[t].value = s);
  }
  getOperatorsForField(e) {
    return e.operators && e.operators.length > 0 ? e.operators.map((t) => ({
      label: t,
      value: t
    })) : He[e.type] || He.text;
  }
  applySearch() {
    this.pushCriteriaToURL(), this.config.onSearch(this.criteria), this.renderChips(), this.close();
  }
  savePreset() {
    new Fe({
      title: "Save Search Preset",
      label: "Preset name",
      placeholder: "e.g. Active users filter",
      confirmLabel: "Save",
      onConfirm: (e) => {
        const t = this.loadPresetsFromStorage();
        t[e] = this.criteria, localStorage.setItem("search_presets", JSON.stringify(t)), this.notifier.success(`Preset "${e}" saved!`);
      }
    }).show();
  }
  loadPreset() {
    const e = this.loadPresetsFromStorage(), t = Object.keys(e);
    if (t.length === 0) {
      this.notifier.warning("No saved presets found.");
      return;
    }
    new Fe({
      title: "Load Search Preset",
      label: `Available presets: ${t.join(", ")}`,
      placeholder: "Enter preset name",
      confirmLabel: "Load",
      onConfirm: (r) => {
        if (!e[r]) {
          this.notifier.warning(`Preset "${r}" not found.`);
          return;
        }
        this.criteria = e[r], this.renderCriteria();
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
  renderChips() {
    const e = document.getElementById("filter-chips-container"), t = document.getElementById("table-search"), r = document.getElementById("search-clear-btn");
    if (e) {
      if (e.innerHTML = "", this.criteria.length === 0) {
        t && (t.placeholder = "Search for items", t.style.display = ""), r && r.classList.add("hidden");
        return;
      }
      t && (t.placeholder = "", t.style.display = ""), r && r.classList.remove("hidden"), this.criteria.forEach((s, n) => {
        const i = this.createChip(s, n);
        e.appendChild(i);
      });
    }
  }
  createChip(e, t) {
    const r = document.createElement("div");
    r.className = "inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded border border-blue-200", r.innerHTML = `
      <span>${this.config.fields.find((n) => n.name === e.field)?.label || e.field} ${e.operator === "ilike" ? "contains" : e.operator === "eq" ? "is" : e.operator} "${e.value}"</span>
      <button type="button"
              data-chip-index="${t}"
              class="ml-1 text-blue-600 hover:text-blue-800 focus:outline-none"
              title="Remove filter">
        <svg class="h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
        </svg>
      </button>
    `;
    const s = r.querySelector("[data-chip-index]");
    return s && s.addEventListener("click", () => {
      this.removeChip(t);
    }), r;
  }
  removeChip(e) {
    this.criteria.splice(e, 1), this.renderCriteria(), this.renderChips(), this.pushCriteriaToURL(), this.config.onSearch(this.criteria);
  }
  clearAllChips() {
    this.criteria = [], this.renderCriteria(), this.renderChips(), this.pushCriteriaToURL(), this.config.onClear && this.config.onClear();
  }
}, Wn = {
  filtersTitle: "Filters",
  savedFilters: "Saved filters",
  editAsSQL: "Edit as SQL",
  previewLabel: "Preview:",
  noFiltersApplied: "No filters applied",
  filterName: "Filter name",
  filterNamePlaceholder: "Type a name here",
  saveFilter: "Save filter",
  clearAll: "Clear all",
  applyFilter: "Apply filter",
  addFilterGroup: "Add filter group",
  removeGroup: "Remove group",
  dragToReorder: "Drag to reorder",
  selectValue: "Select...",
  enterValue: "Enter value...",
  unavailable: "Unavailable",
  and: "AND",
  or: "OR",
  operatorContains: "contains",
  operatorIs: "is",
  operatorIsNot: "is not",
  operatorEquals: "equals",
  operatorNotEquals: "not equals",
  operatorGreaterThan: "greater than",
  operatorLessThan: "less than",
  operatorGreaterThanOrEqual: "greater than or equal",
  operatorLessThanOrEqual: "less than or equal",
  operatorBefore: "before",
  operatorAfter: "after",
  removeGroupLabel: (e) => `Remove filter group ${e}`,
  addConditionLabel: (e, t) => `Add ${e} condition to group ${t}`,
  unavailableOperatorOption: (e) => `Unavailable operator: ${e}`,
  missingFieldReason: (e) => `Field "${e}" is no longer available. Select a supported field to repair this condition.`,
  disabledFieldReason: (e) => `Field "${e}" is unavailable.`,
  missingOperatorReason: (e, t) => `Operator "${e}" is not available for ${t}. Select a supported operator.`,
  missingValueReason: (e, t) => `Value "${e}" is no longer available for ${t}. Select a supported value.`,
  fieldControlLabel: (e, t) => `Group ${e} filter ${t} field`,
  operatorControlLabel: (e, t) => `Group ${e} filter ${t} operator`,
  valueControlLabel: (e, t) => `Group ${e} filter ${t} value`,
  removeConditionLabel: (e) => `Remove filter ${e}`,
  addLogicConditionLabel: (e) => `Add ${e} condition`,
  unavailableFieldOption: (e) => `Unavailable field: ${e}`,
  disabledFieldOption: (e, t) => `${e} — ${t}`,
  unavailableValueOption: (e) => `Unavailable value: ${e}`,
  groupConnectorLabel: (e, t) => `Logic between filter groups ${e} and ${t}`,
  unavailableFieldPreview: (e) => `Unavailable field (${e})`,
  unavailableValuePreview: (e) => `Unavailable value (${e})`,
  saveNameRequired: "Please enter a name for the filter",
  filterSaved: (e) => `Filter "${e}" saved!`,
  groupLimitReached: (e) => `The maximum of ${e} filter groups has been reached.`,
  conditionsPerGroupLimitReached: (e) => `The maximum of ${e} conditions in this group has been reached.`,
  totalConditionsLimitReached: (e) => `The maximum of ${e} total conditions has been reached.`,
  structureExceedsLimits: (e) => `This filter exceeds the editing limits: ${e.join(" ")}`
}, Xn = 0;
function g(e) {
  return String(e ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function kt(e) {
  return e == null ? e : typeof structuredClone == "function" ? structuredClone(e) : JSON.parse(JSON.stringify(e));
}
function G(e) {
  return {
    groups: e.groups.map((t) => ({
      logic: t.logic,
      conditions: t.conditions.map((r) => ({
        field: r.field,
        operator: r.operator,
        value: kt(r.value)
      }))
    })),
    groupLogic: [...e.groupLogic]
  };
}
function U(e) {
  return e ? typeof e != "string" ? e : document.querySelector(e) : null;
}
var Yo = class {
  constructor(e) {
    if (this.cleanupListeners = [], this.panel = null, this.root = null, this.container = null, this.previewElement = null, this.sqlPreviewElement = null, this.overlay = null, this.toggleButton = null, this.appliedPreviewContainer = null, this.ownsPanelID = !1, this.previousPanelInstance = null, this.previousToggleAriaControls = null, this.previousToggleAriaExpanded = null, this.destroyed = !1, !Array.isArray(e.fields) || e.fields.length === 0) throw new Error("[FilterBuilder] At least one field is required");
    this.config = e, this.mode = e.mode ?? "overlay", this.messages = {
      ...Wn,
      ...e.messages
    }, this.limits = this.resolveLimits(e.limits), this.chrome = this.resolveChrome(e.chrome), this.actions = this.resolveActions(e.actions), this.instanceID = `filter-builder-${++Xn}`, this.notifier = e.notifier || new O(), this.structure = e.initialStructure ? this.normalizeStructure(e.initialStructure) : this.createDefaultStructure(), this.init();
  }
  resolveChrome(e) {
    const t = this.mode === "overlay" ? {
      header: !0,
      title: this.messages.filtersTitle,
      savedFilters: !0,
      sqlPreview: !0
    } : {
      header: !1,
      title: this.messages.filtersTitle,
      savedFilters: !1,
      sqlPreview: !1
    };
    return e === void 0 ? t : typeof e == "boolean" ? {
      header: e,
      title: t.title,
      savedFilters: e,
      sqlPreview: e
    } : {
      ...t,
      ...e
    };
  }
  resolveActions(e) {
    const t = this.mode === "overlay" ? {
      apply: !0,
      clear: !0,
      save: !0
    } : {
      apply: !1,
      clear: !1,
      save: !1
    };
    return e === void 0 ? t : typeof e == "boolean" ? {
      apply: e,
      clear: e,
      save: e
    } : {
      ...t,
      ...e
    };
  }
  resolveLimits(e) {
    const t = (r, s) => {
      if (r === void 0) return Number.POSITIVE_INFINITY;
      if (!Number.isInteger(r) || r < 1) throw new Error(`[FilterBuilder] ${s} must be a positive integer`);
      return r;
    };
    return {
      maxGroups: t(e?.maxGroups, "maxGroups"),
      maxConditionsPerGroup: t(e?.maxConditionsPerGroup, "maxConditionsPerGroup"),
      maxTotalConditions: t(e?.maxTotalConditions, "maxTotalConditions")
    };
  }
  init() {
    if (this.previewElement = U(this.config.previewElement), this.mode === "compact") {
      if (this.panel = U(this.config.host), !this.panel) throw new Error("[FilterBuilder] Compact mode requires a valid host");
    } else {
      if (this.panel = U(this.config.host) || document.getElementById("filter-panel"), !this.panel) {
        console.error("[FilterBuilder] Panel element not found");
        return;
      }
      this.toggleButton = U(this.config.toggleButton) || document.getElementById("filter-toggle-btn"), this.overlay = U(this.config.overlay) || document.getElementById("filter-overlay"), this.previewElement || (this.previewElement = document.getElementById("filter-preview-text")), this.appliedPreviewContainer = document.getElementById("applied-filter-preview");
    }
    if (Array.from(this.panel.children).some((e) => e.hasAttribute("data-filter-builder-root"))) throw new Error("[FilterBuilder] Host already contains a mounted FilterBuilder");
    this.previousPanelInstance = this.panel.getAttribute("data-filter-builder-instance"), this.panel.dataset.filterBuilderInstance = this.instanceID, this.mode === "overlay" && !this.panel.id && (this.panel.id = this.instanceID, this.ownsPanelID = !0), this.toggleButton && (this.previousToggleAriaControls = this.toggleButton.getAttribute("aria-controls"), this.previousToggleAriaExpanded = this.toggleButton.getAttribute("aria-expanded")), this.buildPanelStructure(), this.bindOwnedListeners(), this.mode === "overlay" && !this.config.initialStructure && (this.config.restoreFromURL ?? !0) && this.restoreFromURL();
  }
  buildPanelStructure() {
    if (!this.panel) return;
    this.root = document.createElement("div"), this.root.dataset.filterBuilderRoot = this.instanceID, this.panel.appendChild(this.root);
    const e = this.chrome.header ? `
      <div class="flex items-center justify-between mb-4" data-filter-builder-header>
        <h3 id="${this.instanceID}-title" class="text-base font-semibold text-gray-900">${g(this.chrome.title)}</h3>
        ${this.chrome.savedFilters ? `
          <div class="flex gap-2">
            <button type="button" data-filter-builder-saved-menu class="text-sm text-blue-600 hover:text-blue-800">
              ${g(this.messages.savedFilters)} ▾
            </button>
            <button type="button" data-filter-builder-edit-sql class="text-sm text-blue-600 hover:text-blue-800">
              ${g(this.messages.editAsSQL)}
            </button>
          </div>
        ` : ""}
      </div>
    ` : "", t = this.chrome.sqlPreview ? `
      <div class="border-t border-gray-200 pt-3 mb-4" data-filter-builder-preview-region>
        <div class="text-xs text-gray-500 mb-1">${g(this.messages.previewLabel)}</div>
        <div data-filter-builder-sql-preview aria-live="polite" class="text-xs font-mono text-gray-700 bg-gray-50 p-2 rounded border border-gray-200 min-h-[40px] max-h-[100px] overflow-y-auto break-words">
          ${g(this.messages.noFiltersApplied)}
        </div>
      </div>
    ` : "", r = this.actions.apply || this.actions.clear || this.actions.save ? `
      <div class="flex items-center justify-between border-t border-gray-200 pt-4" data-filter-builder-actions>
        <div class="flex gap-2">
          ${this.actions.save ? `
            <label class="sr-only" for="${this.instanceID}-save-name">${g(this.messages.filterName)}</label>
            <input type="text" id="${this.instanceID}-save-name" data-filter-builder-save-name placeholder="${g(this.messages.filterNamePlaceholder)}" class="text-sm border border-gray-200 rounded px-3 py-1.5 w-48">
            <button type="button" data-filter-builder-action="save" class="text-sm text-gray-600 hover:text-gray-800 border border-gray-200 rounded px-3 py-1.5">
              ${g(this.messages.saveFilter)}
            </button>
          ` : ""}
        </div>
        <div class="flex gap-2">
          ${this.actions.clear ? `
            <button type="button" data-filter-builder-action="clear" class="text-sm text-gray-700 hover:text-gray-900 px-4 py-2">
              ${g(this.messages.clearAll)}
            </button>
          ` : ""}
          ${this.actions.apply ? `
            <button type="button" data-filter-builder-action="apply" class="text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg px-4 py-2">
              ${g(this.messages.applyFilter)}
            </button>
          ` : ""}
        </div>
      </div>
    ` : "";
    this.root.innerHTML = `
      ${e}
      <div data-filter-builder-groups class="space-y-3 mb-4"></div>
      <p data-filter-builder-limit-status class="hidden mb-3 text-xs text-amber-700" role="status" aria-live="polite"></p>
      <button type="button" data-filter-builder-action="add-group" class="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-50 mb-4" aria-label="${g(this.messages.addFilterGroup)}">
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
          <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
        </svg>
        ${g(this.messages.and)}
      </button>
      ${t}
      ${r}
    `, this.container = this.root.querySelector("[data-filter-builder-groups]"), this.sqlPreviewElement = this.root.querySelector("[data-filter-builder-sql-preview]"), this.render();
  }
  bindOwnedListeners() {
    if (!this.root || (this.listen(this.root, "click", (t) => this.handleClick(t)), this.listen(this.root, "change", (t) => this.handleChange(t)), this.listen(this.root, "input", (t) => this.handleInput(t)), this.mode !== "overlay")) return;
    this.toggleButton && this.listen(this.toggleButton, "click", () => this.toggle());
    const e = document.getElementById("clear-filters-btn");
    e && this.listen(e, "click", () => this.clearFilters()), this.overlay && this.listen(this.overlay, "click", () => this.close(!0)), this.listen(document, "keydown", (t) => {
      t.key === "Escape" && this.panel && !this.panel.classList.contains("hidden") && this.close(!0);
    });
  }
  listen(e, t, r) {
    e.addEventListener(t, r), this.cleanupListeners.push(() => e.removeEventListener(t, r));
  }
  handleClick(e) {
    if (this.destroyed) return;
    const t = e.target?.closest("[data-filter-builder-action]");
    if (!(!t || !this.root?.contains(t)))
      switch (t.dataset.filterBuilderAction) {
        case "add-group":
          this.addGroup();
          return;
        case "remove-group":
          this.removeGroup(Number(t.dataset.groupIndex));
          return;
        case "add-condition":
          this.addCondition(Number(t.dataset.groupIndex));
          return;
        case "add-condition-and":
          this.setGroupLogicAndAddCondition(Number(t.dataset.groupIndex), "and");
          return;
        case "add-condition-or":
          this.setGroupLogicAndAddCondition(Number(t.dataset.groupIndex), "or");
          return;
        case "remove-condition":
          this.removeCondition(Number(t.dataset.groupIndex), Number(t.dataset.conditionIndex));
          return;
        case "group-logic":
          this.setGroupConnector(Number(t.dataset.groupIndex), t.dataset.logicValue);
          return;
        case "apply":
          this.applyFilters();
          return;
        case "clear":
          this.clearAll(!0);
          return;
        case "save":
          this.saveFilter();
      }
  }
  handleChange(e) {
    if (this.destroyed) return;
    const t = e.target;
    if (!t?.dataset.filterBuilderPart) return;
    const r = Number(t.dataset.groupIndex), s = Number(t.dataset.conditionIndex), n = this.structure.groups[r]?.conditions[s];
    if (n)
      switch (t.dataset.filterBuilderPart) {
        case "field": {
          const i = this.getField(t.value);
          if (!i || i.disabled) return;
          n.field = t.value, n.operator = this.getOperatorsForField(i)[0]?.value ?? "eq", n.value = "", this.render(), this.focusConditionPart(r, s, "operator"), this.emitChange();
          return;
        }
        case "operator": {
          const i = this.getField(n.field);
          if (!i || i.disabled) return;
          const a = this.getOperatorsForField(i);
          if (!a.some((l) => l.value === t.value)) return;
          const o = a.some((l) => l.value === n.operator);
          n.operator = t.value, o ? this.updatePreview() : (this.render(), this.focusConditionPart(r, s, "value")), this.emitChange();
          return;
        }
        case "value":
          if (t.tagName === "INPUT") return;
          {
            const i = this.getField(n.field);
            if (!i || i.disabled || !this.getOperatorsForField(i).some((o) => o.value === n.operator)) return;
            const a = this.isValueAvailable(i, n.value);
            n.value = t.value, a ? this.updatePreview() : (this.render(), this.focusConditionPart(r, s, "value")), this.emitChange();
            return;
          }
      }
  }
  handleInput(e) {
    if (this.destroyed) return;
    const t = e.target;
    if (t?.dataset.filterBuilderPart !== "value" || t.tagName === "SELECT") return;
    const r = Number(t.dataset.groupIndex), s = Number(t.dataset.conditionIndex), n = this.structure.groups[r]?.conditions[s];
    if (!n) return;
    const i = this.getField(n.field);
    !i || i.disabled || !this.getOperatorsForField(i).some((a) => a.value === n.operator) || (n.value = t.value, this.updatePreview(), this.emitChange());
  }
  createDefaultStructure() {
    return {
      groups: [{
        conditions: [this.createEmptyCondition()],
        logic: "or"
      }],
      groupLogic: []
    };
  }
  normalizeStructure(e) {
    const t = G(e);
    for (t.groups = t.groups.filter((r) => Array.isArray(r.conditions) && r.conditions.length > 0), t.groups.forEach((r) => {
      r.logic = r.logic === "and" ? "and" : "or";
    }), t.groupLogic = t.groupLogic.slice(0, Math.max(0, t.groups.length - 1)).map((r) => r === "or" ? "or" : "and"); t.groupLogic.length < Math.max(0, t.groups.length - 1); ) t.groupLogic.push("and");
    return t.groups.length > 0 ? t : this.createDefaultStructure();
  }
  createEmptyCondition() {
    const e = this.config.fields.find((t) => !t.disabled) || this.config.fields[0];
    return {
      field: e.name,
      operator: this.getOperatorsForField(e)[0]?.value ?? "eq",
      value: ""
    };
  }
  totalConditions() {
    return this.structure.groups.reduce((e, t) => e + t.conditions.length, 0);
  }
  addGroupLimitReason() {
    return this.structure.groups.length >= this.limits.maxGroups ? this.messages.groupLimitReached(this.limits.maxGroups) : this.totalConditions() >= this.limits.maxTotalConditions ? this.messages.totalConditionsLimitReached(this.limits.maxTotalConditions) : "";
  }
  addConditionLimitReason(e) {
    const t = this.structure.groups[e];
    return t ? t.conditions.length >= this.limits.maxConditionsPerGroup ? this.messages.conditionsPerGroupLimitReached(this.limits.maxConditionsPerGroup) : this.totalConditions() >= this.limits.maxTotalConditions ? this.messages.totalConditionsLimitReached(this.limits.maxTotalConditions) : "" : "";
  }
  structureLimitReasons() {
    const e = [];
    return this.structure.groups.length > this.limits.maxGroups && e.push(this.messages.groupLimitReached(this.limits.maxGroups)), this.structure.groups.some((t) => t.conditions.length > this.limits.maxConditionsPerGroup) && e.push(this.messages.conditionsPerGroupLimitReached(this.limits.maxConditionsPerGroup)), this.totalConditions() > this.limits.maxTotalConditions && e.push(this.messages.totalConditionsLimitReached(this.limits.maxTotalConditions)), e;
  }
  updateLimitState() {
    if (!this.root) return;
    const e = this.root.querySelector("[data-filter-builder-limit-status]"), t = this.structureLimitReasons();
    e && (e.textContent = t.length > 0 ? this.messages.structureExceedsLimits(t) : "", e.classList.toggle("hidden", t.length === 0));
    const r = this.root.querySelector('[data-filter-builder-action="add-group"]'), s = this.addGroupLimitReason();
    r && (r.disabled = s !== "", s ? r.title = s : r.removeAttribute("title"));
  }
  render() {
    !this.container || this.destroyed || (this.container.innerHTML = this.structure.groups.map((e, t) => {
      const r = t < this.structure.groups.length - 1 ? this.renderGroupConnector(t) : "";
      return `${this.renderGroup(e, t)}${r}`;
    }).join(""), this.updateLimitState(), this.updatePreview());
  }
  renderGroup(e, t) {
    const r = this.addConditionLimitReason(t), s = r ? ` disabled title="${g(r)}"` : "", n = e.logic === "and" ? this.messages.and : this.messages.or, i = e.conditions.map((a, o) => {
      const l = o < e.conditions.length - 1 ? `<div class="flex items-center justify-center my-1" aria-hidden="true">
            <span class="text-xs font-medium text-gray-500 px-2 py-0.5 bg-white border border-gray-200 rounded">${g(n)}</span>
          </div>` : "";
      return `${this.renderCondition(a, t, o)}${l}`;
    }).join("");
    return `
      <div class="border border-gray-200 rounded-lg p-3 bg-gray-50" data-filter-builder-group="${t}">
        <div class="flex justify-end mb-2">
          <button type="button" data-filter-builder-action="remove-group" data-group-index="${t}" class="text-xs text-red-600 hover:text-red-800" aria-label="${g(this.messages.removeGroupLabel(t + 1))}">
            ${g(this.messages.removeGroup)}
          </button>
        </div>
        ${i}
        <button type="button" data-filter-builder-action="add-condition" data-group-index="${t}" class="mt-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 disabled:cursor-not-allowed disabled:opacity-50" aria-label="${g(this.messages.addConditionLabel(n, t + 1))}"${s}>
          <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M12 5v14"/><path d="M5 12h14"/>
          </svg>
          ${g(n)}
        </button>
      </div>
    `;
  }
  renderCondition(e, t, r) {
    const s = this.getField(e.field), n = r + 1, i = this.renderFieldOptions(e.field), a = s ? this.getOperatorsForField(s) : [], o = a.some((S) => S.value === e.operator), l = `${o ? "" : `
      <option value="${g(e.operator)}" selected disabled>
        ${g(this.messages.unavailableOperatorOption(e.operator))}
      </option>
    `}${a.map((S) => `
      <option value="${g(S.value)}" ${S.value === e.operator ? "selected" : ""}>${g(S.label)}</option>
    `).join("")}`, c = s ? s.disabled ? s.disabledReason || this.messages.disabledFieldReason(s.label) : "" : this.messages.missingFieldReason(e.field), u = s && !o ? this.messages.missingOperatorReason(e.operator, s.label) : "", h = s ? this.isValueAvailable(s, e.value) : !0, p = s && o && !s.disabled && !h ? this.messages.missingValueReason(String(e.value), s.label) : "", m = c || u || p, v = `${this.instanceID}-group-${t + 1}-condition-${r + 1}-status`, y = m ? ` aria-describedby="${v}"` : "", b = s || {
      name: e.field,
      label: e.field,
      type: "text"
    }, x = !s || s.disabled || !o;
    return `
      <div class="flex flex-wrap items-center gap-2 mb-2" data-filter-builder-condition="${t}-${r}">
        <div class="flex items-center text-gray-400 cursor-move" title="${g(this.messages.dragToReorder)}" aria-hidden="true">
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/>
            <circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/>
          </svg>
        </div>
        <select data-filter-builder-part="field" data-group-index="${t}" data-condition-index="${r}" aria-label="${g(this.messages.fieldControlLabel(t + 1, n))}"${y} class="py-1.5 px-2 text-sm border-gray-200 rounded-lg bg-white w-32">
          ${i}
        </select>
        <select data-filter-builder-part="operator" data-group-index="${t}" data-condition-index="${r}" aria-label="${g(this.messages.operatorControlLabel(t + 1, n))}"${y} ${!s || s.disabled ? "disabled" : ""} class="py-1.5 px-2 text-sm border-gray-200 rounded-lg bg-white w-36">
          ${l}
        </select>
        ${this.renderValueInput(b, e, t, r, n, x, y)}
        <button type="button" data-filter-builder-action="remove-condition" data-group-index="${t}" data-condition-index="${r}" class="text-red-600 hover:text-red-800" aria-label="${g(this.messages.removeConditionLabel(n))}">
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M3 6h18"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
          </svg>
        </button>
        <button type="button" data-filter-builder-action="add-condition-or" data-group-index="${t}" class="px-2 py-1 text-xs border border-blue-600 text-blue-600 rounded hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50" aria-label="${g(this.messages.addLogicConditionLabel(this.messages.or))}"${this.addConditionLimitReason(t) ? ` disabled title="${g(this.addConditionLimitReason(t))}"` : ""}>
          ${g(this.messages.or)}
        </button>
        <button type="button" data-filter-builder-action="add-condition-and" data-group-index="${t}" class="px-2 py-1 text-xs border border-blue-600 text-blue-600 rounded hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50" aria-label="${g(this.messages.addLogicConditionLabel(this.messages.and))}"${this.addConditionLimitReason(t) ? ` disabled title="${g(this.addConditionLimitReason(t))}"` : ""}>
          ${g(this.messages.and)}
        </button>
        ${m ? `
          <p id="${v}" data-filter-builder-field-status class="w-full text-xs text-amber-700" role="note">
            ${g(m)}
          </p>
        ` : ""}
      </div>
    `;
  }
  renderFieldOptions(e) {
    let t = "", r = "";
    this.getField(e) || (r += `
        <option value="${g(e)}" selected disabled>
          ${g(this.messages.unavailableFieldOption(e))}
        </option>
      `);
    for (const s of this.config.fields) {
      const n = s.group?.trim() || "";
      n !== t && (t && (r += "</optgroup>"), n && (r += `<optgroup label="${g(n)}">`), t = n);
      const i = s.disabled ? this.messages.disabledFieldOption(s.label, s.disabledReason || this.messages.unavailable) : s.label;
      r += `
        <option value="${g(s.name)}" ${s.name === e ? "selected" : ""} ${s.disabled ? "disabled" : ""}>
          ${g(i)}
        </option>
      `;
    }
    return t && (r += "</optgroup>"), r;
  }
  renderValueInput(e, t, r, s, n, i, a) {
    const o = `data-filter-builder-part="value" data-group-index="${r}" data-condition-index="${s}" aria-label="${g(this.messages.valueControlLabel(r + 1, n))}"${a} ${i ? "disabled" : ""}`;
    if (e.type === "select") {
      const l = this.isValueAvailable(e, t.value) ? "" : `
        <option value="${g(t.value)}" selected disabled>${g(this.messages.unavailableValueOption(String(t.value)))}</option>
      `, c = (e.options || []).map((u) => `
        <option value="${g(u.value)}" ${String(u.value) === String(t.value) ? "selected" : ""}>${g(u.label)}</option>
      `).join("");
      return `
        <select ${o} class="flex-1 min-w-[200px] py-1.5 px-2 text-sm border-gray-200 rounded-lg bg-white">
          <option value="">${g(this.messages.selectValue)}</option>
          ${l}
          ${c}
        </select>
      `;
    }
    return `
      <input type="${e.type === "date" ? "date" : e.type === "number" ? "number" : "text"}" ${o} value="${g(t.value)}" placeholder="${g(this.messages.enterValue)}" class="flex-1 min-w-[200px] py-1.5 px-2 text-sm border-gray-200 rounded-lg">
    `;
  }
  isValueAvailable(e, t) {
    return e.type !== "select" || t === "" || t === null || t === void 0 ? !0 : (e.options || []).some((r) => String(r.value) === String(t));
  }
  renderGroupConnector(e) {
    const t = this.structure.groupLogic[e] || "and";
    return `
      <div class="flex items-center justify-center py-2" role="group" aria-label="${g(this.messages.groupConnectorLabel(e + 1, e + 2))}">
        <button type="button" data-filter-builder-action="group-logic" data-group-index="${e}" data-logic-value="and" aria-pressed="${t === "and"}" class="px-3 py-1 text-xs font-medium rounded-l border ${t === "and" ? "bg-green-600 text-white border-green-600" : "bg-gray-200 text-gray-800 border-gray-300 hover:bg-gray-300"}">
          ${g(this.messages.and)}
        </button>
        <button type="button" data-filter-builder-action="group-logic" data-group-index="${e}" data-logic-value="or" aria-pressed="${t === "or"}" class="px-3 py-1 text-xs font-medium rounded-r border ${t === "or" ? "bg-green-600 text-white border-green-600" : "bg-gray-200 text-gray-800 border-gray-300 hover:bg-gray-300"}">
          ${g(this.messages.or)}
        </button>
      </div>
    `;
  }
  addGroup() {
    this.addGroupLimitReason() || (this.structure.groups.push({
      conditions: [this.createEmptyCondition()],
      logic: "or"
    }), this.structure.groups.length > 1 && this.structure.groupLogic.push("and"), this.render(), this.focusConditionPart(this.structure.groups.length - 1, 0, "field"), this.emitChange());
  }
  addCondition(e) {
    const t = this.structure.groups[e];
    !t || this.addConditionLimitReason(e) || (t.conditions.push(this.createEmptyCondition()), this.render(), this.focusConditionPart(e, t.conditions.length - 1, "field"), this.emitChange());
  }
  setGroupLogicAndAddCondition(e, t) {
    const r = this.structure.groups[e];
    !r || this.addConditionLimitReason(e) || (r.logic = t, r.conditions.push(this.createEmptyCondition()), this.render(), this.focusConditionPart(e, r.conditions.length - 1, "field"), this.emitChange());
  }
  removeCondition(e, t) {
    const r = this.structure.groups[e];
    if (r) {
      if (r.conditions.splice(t, 1), r.conditions.length === 0) {
        this.removeGroup(e);
        return;
      }
      this.render(), this.focusConditionPart(e, Math.min(t, r.conditions.length - 1), "field"), this.emitChange();
    }
  }
  removeGroup(e) {
    this.structure.groups[e] && (this.structure.groups.splice(e, 1), e < this.structure.groupLogic.length ? this.structure.groupLogic.splice(e, 1) : e > 0 && this.structure.groupLogic.splice(e - 1, 1), this.structure.groups.length === 0 && (this.structure = this.createDefaultStructure()), this.render(), this.focusConditionPart(Math.min(e, this.structure.groups.length - 1), 0, "field"), this.emitChange());
  }
  setGroupConnector(e, t) {
    t !== "and" && t !== "or" || !this.structure.groupLogic[e] || (this.structure.groupLogic[e] = t, this.render(), this.root?.querySelector(`[data-filter-builder-action="group-logic"][data-group-index="${e}"][data-logic-value="${t}"]`)?.focus(), this.emitChange());
  }
  focusConditionPart(e, t, r) {
    this.root?.querySelector(`[data-filter-builder-part="${r}"][data-group-index="${e}"][data-condition-index="${t}"]`)?.focus();
  }
  getField(e) {
    return this.config.fields.find((t) => t.name === e);
  }
  getOperatorsForField(e) {
    if (e.operators && e.operators.length > 0) return e.operators.map((r) => typeof r == "string" ? {
      label: r,
      value: r
    } : r);
    const t = {
      text: [
        {
          label: this.messages.operatorContains,
          value: "ilike"
        },
        {
          label: this.messages.operatorIs,
          value: "eq"
        },
        {
          label: this.messages.operatorIsNot,
          value: "ne"
        }
      ],
      number: [
        {
          label: this.messages.operatorEquals,
          value: "eq"
        },
        {
          label: this.messages.operatorNotEquals,
          value: "ne"
        },
        {
          label: this.messages.operatorGreaterThan,
          value: "gt"
        },
        {
          label: this.messages.operatorLessThan,
          value: "lt"
        },
        {
          label: this.messages.operatorGreaterThanOrEqual,
          value: "gte"
        },
        {
          label: this.messages.operatorLessThanOrEqual,
          value: "lte"
        }
      ],
      date: [
        {
          label: this.messages.operatorIs,
          value: "eq"
        },
        {
          label: this.messages.operatorBefore,
          value: "lt"
        },
        {
          label: this.messages.operatorAfter,
          value: "gt"
        }
      ],
      select: [{
        label: this.messages.operatorIs,
        value: "eq"
      }, {
        label: this.messages.operatorIsNot,
        value: "ne"
      }]
    };
    return t[e.type] || t.text;
  }
  updatePreview() {
    const e = this.generateSQLPreview(), t = this.generateTextPreview();
    this.sqlPreviewElement && (this.sqlPreviewElement.textContent = e || this.messages.noFiltersApplied), this.previewElement && (this.previewElement.textContent = t), this.appliedPreviewContainer && this.appliedPreviewContainer.classList.toggle("hidden", !this.hasActiveFilters());
  }
  hasActiveFilters() {
    return this.structure.groups.some((e) => e.conditions.some((t) => t.value !== "" && t.value !== null && t.value !== void 0));
  }
  generateSQLPreview() {
    const e = this.structure.groups.map((t, r) => {
      const s = t.conditions.filter((n) => n.value !== "" && n.value !== null && n.value !== void 0).map((n) => {
        const i = n.operator.toUpperCase(), a = typeof n.value == "string" ? `'${n.value}'` : n.value;
        return `${n.field} ${i === "ILIKE" ? "ILIKE" : i === "EQ" ? "=" : i} ${a}`;
      });
      return s.length === 0 ? null : {
        groupIndex: r,
        text: s.length === 1 ? s[0] : `( ${s.join(` ${t.logic.toUpperCase()} `)} )`
      };
    }).filter((t) => t !== null);
    return this.joinGroups(e);
  }
  generateTextPreview() {
    const e = this.structure.groups.map((t, r) => {
      const s = t.conditions.filter((n) => n.value !== "" && n.value !== null && n.value !== void 0).map((n) => {
        const i = this.getField(n.field), a = i ? this.getOperatorsForField(i).find((c) => c.value === n.operator) : void 0, o = i?.label || this.messages.unavailableFieldPreview(n.field), l = i && !this.isValueAvailable(i, n.value) ? this.messages.unavailableValuePreview(String(n.value)) : String(n.value);
        return `${o} ${a?.label || n.operator} "${l}"`;
      });
      return s.length === 0 ? null : {
        groupIndex: r,
        text: s.length === 1 ? s[0] : `( ${s.join(` ${t.logic === "and" ? this.messages.and : this.messages.or} `)} )`
      };
    }).filter((t) => t !== null);
    return this.joinGroups(e, !0);
  }
  joinGroups(e, t = !1) {
    return e.length < 2 ? e[0]?.text || "" : e.reduce((r, s, n) => {
      if (n === 0) return s.text;
      const i = Math.max(0, s.groupIndex - 1), a = this.structure.groupLogic[i] || "and";
      return `${r} ${t ? a === "and" ? this.messages.and : this.messages.or : a.toUpperCase()} ${s.text}`;
    }, "");
  }
  emitChange() {
    this.config.onChange?.(G(this.structure));
  }
  applyFilters() {
    this.config.onApply?.(G(this.structure)), this.mode === "overlay" && this.close(!0);
  }
  clearAll(e) {
    this.structure = this.createDefaultStructure(), this.render(), this.focusConditionPart(0, 0, "field"), e && this.emitChange();
  }
  clearFilters() {
    this.clearAll(!0), this.config.onClear?.();
  }
  saveFilter() {
    const e = this.root?.querySelector("[data-filter-builder-save-name]"), t = e?.value.trim();
    if (!t) {
      this.notifier.warning(this.messages.saveNameRequired);
      return;
    }
    const r = this.getSavedFilters();
    r[t] = G(this.structure), localStorage.setItem("saved_filters", JSON.stringify(r)), this.notifier.success(this.messages.filterSaved(t)), e && (e.value = "");
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
    this.panel?.classList.contains("hidden") ? this.open() : this.close(!0);
  }
  open() {
    if (this.mode !== "overlay" || !this.panel || !this.toggleButton || this.destroyed) return;
    const e = 8, t = window.visualViewport, r = t?.offsetLeft ?? 0, s = t?.offsetTop ?? 0, n = t?.width ?? window.innerWidth, i = t?.height ?? window.innerHeight, a = r + n, o = s + i, l = this.toggleButton.getBoundingClientRect();
    this.panel.classList.remove("hidden"), this.panel.style.visibility = "hidden";
    const c = this.panel.getBoundingClientRect(), u = Math.max(0, n - 16), h = Math.min(c.width || 800, u), p = c.height || this.panel.scrollHeight, m = Math.min(Math.max(l.left, r + e), Math.max(r + e, a - e - h)), v = l.bottom + e, y = o - e - v, b = l.top - e - s, x = p > y && b > y ? Math.max(s + e, l.top - e - Math.min(p, b)) : Math.max(s + e, v);
    this.panel.style.left = `${m}px`, this.panel.style.top = `${x}px`, this.panel.style.maxWidth = `${u}px`, this.panel.style.maxHeight = `${Math.max(0, o - e - x)}px`, this.panel.style.visibility = "", this.toggleButton.setAttribute("aria-expanded", "true"), this.toggleButton.setAttribute("aria-controls", this.panel.id || this.instanceID), this.overlay?.classList.remove("hidden"), this.root?.querySelector('button, input, select, textarea, [tabindex]:not([tabindex="-1"])')?.focus();
  }
  close(e = !1) {
    this.mode === "overlay" && (this.panel?.classList.add("hidden"), this.overlay?.classList.add("hidden"), this.toggleButton?.setAttribute("aria-expanded", "false"), e && this.toggleButton?.focus());
  }
  restoreFromURL() {
    const e = new URLSearchParams(window.location.search).get("filters");
    if (e)
      try {
        const t = JSON.parse(e);
        Array.isArray(t) && t.length > 0 ? (this.structure = this.normalizeStructure(this.convertLegacyFilters(t)), this.render()) : t && Array.isArray(t.groups) && Array.isArray(t.groupLogic) && (this.structure = this.normalizeStructure(t), this.render());
      } catch (t) {
        console.warn("[FilterBuilder] Failed to parse filters from URL:", t);
      }
  }
  convertLegacyFilters(e) {
    const t = /* @__PURE__ */ new Map();
    e.forEach((s) => {
      const n = t.get(s.column) || [];
      n.push(s), t.set(s.column, n);
    });
    const r = [];
    return t.forEach((s) => {
      r.push({
        conditions: s.map((n) => ({
          field: n.column,
          operator: n.operator || "ilike",
          value: kt(n.value)
        })),
        logic: s.length > 1 ? "or" : "and"
      });
    }), {
      groups: r,
      groupLogic: new Array(Math.max(0, r.length - 1)).fill("and")
    };
  }
  getStructure() {
    return G(this.structure);
  }
  setStructure(e, t = !0) {
    this.destroyed || (this.structure = this.normalizeStructure(e), this.render(), t && this.emitChange());
  }
  destroy() {
    if (!this.destroyed) {
      for (this.close(!1), this.destroyed = !0; this.cleanupListeners.length > 0; ) this.cleanupListeners.pop()?.();
      this.root?.remove(), this.panel && (this.previousPanelInstance === null ? this.panel.removeAttribute("data-filter-builder-instance") : this.panel.setAttribute("data-filter-builder-instance", this.previousPanelInstance), this.ownsPanelID && this.panel.removeAttribute("id")), this.toggleButton && (this.previousToggleAriaControls === null ? this.toggleButton.removeAttribute("aria-controls") : this.toggleButton.setAttribute("aria-controls", this.previousToggleAriaControls), this.previousToggleAriaExpanded === null ? this.toggleButton.removeAttribute("aria-expanded") : this.toggleButton.setAttribute("aria-expanded", this.previousToggleAriaExpanded)), this.root = null, this.container = null, this.sqlPreviewElement = null, this.previewElement = null, this.appliedPreviewContainer = null, this.overlay = null, this.toggleButton = null, this.panel = null;
    }
  }
}, Wo = class {
  constructor(e) {
    if (this.searchableFields = e, !e || e.length === 0) throw new Error("At least one searchable field is required");
  }
  buildQuery(e) {
    if (!e || e.trim() === "") return {};
    const t = {}, r = e.trim();
    return this.searchableFields.forEach((s) => {
      t[`${s}__ilike`] = `%${r}%`;
    }), t;
  }
  async onSearch(e, t) {
    t.resetPagination(), await t.refresh();
  }
}, Xo = class {
  buildFilters(e) {
    const t = {}, r = /* @__PURE__ */ new Map();
    return e.forEach((s) => {
      if (s.value === null || s.value === void 0 || s.value === "") return;
      const n = s.operator || "eq", i = s.column;
      r.has(i) || r.set(i, {
        operator: n,
        values: []
      }), r.get(i).values.push(s.value);
    }), r.forEach((s, n) => {
      if (s.values.length === 1) {
        const i = s.operator === "eq" ? n : `${n}__${s.operator}`;
        t[i] = s.values[0];
      } else s.operator === "ilike" ? t[`${n}__ilike`] = s.values.join(",") : s.operator === "eq" ? t[`${n}__in`] = s.values.join(",") : t[`${n}__${s.operator}`] = s.values.join(",");
    }), t;
  }
  async onFilterChange(e, t, r) {
    r.resetPagination(), await r.refresh();
  }
}, Zo = class {
  buildQuery(e, t) {
    return {
      limit: t,
      offset: (e - 1) * t
    };
  }
  async onPageChange(e, t) {
    await t.refresh();
  }
}, el = class {
  buildQuery(e) {
    return !e || e.length === 0 ? {} : { order: e.map((t) => `${t.field} ${t.direction}`).join(",") };
  }
  async onSort(e, t, r) {
    await r.refresh();
  }
}, tl = class {
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
    const r = Zn(t, this.config, e);
    r.delivery = ei(this.config, e);
    let s;
    try {
      s = await C(this.getEndpoint(), {
        method: "POST",
        json: r,
        headers: { Accept: "application/json,application/octet-stream" }
      });
    } catch (n) {
      throw R(t, "error", n instanceof Error ? n.message : "Network error during export"), n;
    }
    if (s.status === 202) {
      const n = await Lt(s);
      R(t, "info", "Export queued. You can download it when ready.");
      const i = n?.status_url || "";
      if (i) {
        const a = si(n, i);
        try {
          await ni(i, {
            intervalMs: ti(this.config),
            timeoutMs: ri(this.config)
          });
          const o = await C(a, {
            method: "GET",
            headers: { Accept: "application/octet-stream" }
          });
          if (!o.ok) {
            const l = await Se(o);
            throw R(t, "error", l), new Error(l);
          }
          await Ke(o, r.definition || r.resource || "export", r.format), R(t, "success", "Export ready.");
          return;
        } catch (o) {
          throw R(t, "error", o instanceof Error ? o.message : "Export failed"), o;
        }
      }
      if (n?.download_url) {
        window.open(n.download_url, "_blank");
        return;
      }
      return;
    }
    if (!s.ok) {
      const n = await Se(s);
      throw R(t, "error", n), new Error(n);
    }
    await Ke(s, r.definition || r.resource || "export", r.format), R(t, "success", "Export ready.");
  }
};
function Zn(e, t, r) {
  const s = hi(r), n = ai(e, t), i = oi(e, t), a = {
    format: s,
    query: ci(li(e)),
    selection: n,
    columns: i,
    delivery: t.delivery || "auto"
  };
  t.definition && (a.definition = t.definition), t.resource && (a.resource = t.resource);
  const o = t.sourceVariant || t.variant;
  return o && (a.source_variant = o), a;
}
function ei(e, t) {
  return e.delivery ? e.delivery : (e.asyncFormats && e.asyncFormats.length > 0 ? e.asyncFormats : ["pdf"]).includes(t) ? "async" : "auto";
}
function ti(e) {
  const t = Number(e.statusPollIntervalMs);
  return Number.isFinite(t) && t > 0 ? t : 2e3;
}
function ri(e) {
  const t = Number(e.statusPollTimeoutMs);
  return Number.isFinite(t) && t >= 0 ? t : 3e5;
}
function si(e, t) {
  return e?.download_url ? e.download_url : `${t.replace(/\/+$/, "")}/download`;
}
async function Lt(e) {
  return await Qt(e);
}
async function ni(e, t) {
  const r = Date.now(), s = Math.max(250, t.intervalMs);
  for (; ; ) {
    const n = await C(e, {
      method: "GET",
      headers: { Accept: "application/json" }
    });
    if (!n.ok) {
      const o = await Se(n);
      throw new Error(o);
    }
    const i = await Lt(n), a = String(i?.state || "").toLowerCase();
    if (a === "completed") return i;
    if (a === "failed") throw new Error("Export failed");
    if (a === "canceled") throw new Error("Export canceled");
    if (a === "deleted") throw new Error("Export deleted");
    if (t.timeoutMs > 0 && Date.now() - r > t.timeoutMs) throw new Error("Export status timed out");
    await ii(s);
  }
}
function ii(e) {
  return new Promise((t) => setTimeout(t, e));
}
function ai(e, t) {
  if (t.selection?.mode) return t.selection;
  const r = Array.from(e.state.selectedRows || []), s = r.length > 0 ? "ids" : "all";
  return {
    mode: s,
    ids: s === "ids" ? r : []
  };
}
function oi(e, t) {
  if (Array.isArray(t.columns) && t.columns.length > 0) return t.columns.slice();
  const r = e.state?.hiddenColumns ? new Set(e.state.hiddenColumns) : /* @__PURE__ */ new Set();
  return (Array.isArray(e.state?.columnOrder) && e.state.columnOrder.length > 0 ? e.state.columnOrder : e.config.columns.map((s) => s.field)).filter((s) => !r.has(s));
}
function li(e) {
  const t = {}, r = e.config.behaviors || {};
  return r.pagination && Object.assign(t, r.pagination.buildQuery(e.state.currentPage, e.state.perPage)), e.state.search && r.search && Object.assign(t, r.search.buildQuery(e.state.search)), e.state.filters.length > 0 && r.filter && Object.assign(t, r.filter.buildFilters(e.state.filters)), e.state.sort.length > 0 && r.sort && Object.assign(t, r.sort.buildQuery(e.state.sort)), t;
}
function ci(e) {
  const t = {}, r = [];
  return Object.entries(e).forEach(([s, n]) => {
    if (n == null || n === "") return;
    switch (s) {
      case "limit":
        t.limit = Ve(n);
        return;
      case "offset":
        t.offset = Ve(n);
        return;
      case "order":
      case "sort":
        t.sort = ui(String(n));
        return;
      case "q":
      case "search":
        t.search = String(n);
        return;
    }
    const { field: i, op: a } = di(s);
    i && r.push({
      field: i,
      op: a,
      value: n
    });
  }), r.length > 0 && (t.filters = r), t;
}
function di(e) {
  const t = e.split("__");
  return {
    field: t[0]?.trim() || "",
    op: t[1]?.trim() || "eq"
  };
}
function ui(e) {
  return e ? e.split(",").map((t) => t.trim()).filter(Boolean).map((t) => {
    const r = t.split(/\s+/);
    return {
      field: r[0] || "",
      desc: (r[1] || "asc").toLowerCase() === "desc"
    };
  }).filter((t) => t.field) : [];
}
function hi(e) {
  const t = String(e || "").trim().toLowerCase();
  return t === "excel" || t === "xls" ? "xlsx" : t || "csv";
}
function Ve(e) {
  const t = Number(e);
  return Number.isFinite(t) ? t : 0;
}
async function Ke(e, t, r) {
  const s = await e.blob(), n = pi(e, t, r), i = URL.createObjectURL(s), a = document.createElement("a");
  a.href = i, a.download = n, a.rel = "noopener", document.body.appendChild(a), a.click(), a.remove(), URL.revokeObjectURL(i);
}
function pi(e, t, r) {
  const s = e.headers.get("content-disposition") || "", n = `${t}.${r}`;
  return fi(s) || n;
}
function fi(e) {
  if (!e) return null;
  const t = e.match(/filename\*=(?:UTF-8'')?([^;]+)/i);
  if (t && t[1]) return decodeURIComponent(t[1].replace(/"/g, "").trim());
  const r = e.match(/filename="?([^";]+)"?/i);
  return r && r[1] ? r[1].trim() : null;
}
async function Se(e) {
  return $e(e, `Export failed (${e.status})`, { appendStatusToFallback: !1 });
}
function R(e, t, r) {
  const s = e.config.notifier;
  if (s && typeof s[t] == "function") {
    s[t](r);
    return;
  }
  const n = window.toastManager;
  if (n && typeof n[t] == "function") {
    n[t](r);
    return;
  }
  t === "error" && alert(r);
}
var rl = class {
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
    const s = this.getActionEndpoint(e), n = await C(s, {
      method: "POST",
      json: { ids: t },
      accept: "application/json"
    });
    if (!n.ok) {
      const i = await $e(n, `Bulk action '${e}' failed`);
      throw new Error(`Bulk action '${e}' failed: ${i}`);
    }
    await r.refresh();
  }
}, mi = 1500;
function gi(e) {
  return typeof e == "object" && e !== null && "name" in e && e.name === "AbortError";
}
function _t(e) {
  return typeof e == "object" && e !== null && "version" in e && e.version === 2;
}
var bi = class {
  constructor(e, t = "datatable_columns") {
    this.cachedOrder = null, this.storageKey = t;
  }
  getVisibleColumns(e) {
    return e.config.columns.filter((t) => !e.state.hiddenColumns.has(t.field)).map((t) => t.field);
  }
  toggleColumn(e, t) {
    const r = !t.state.hiddenColumns.has(e), s = t.config.columns.filter((a) => a.field === e ? !r : !t.state.hiddenColumns.has(a.field)).map((a) => a.field), n = {};
    t.config.columns.forEach((a) => {
      n[a.field] = s.includes(a.field);
    });
    const i = this.cachedOrder || t.state.columnOrder;
    this.savePrefs({
      version: 2,
      visibility: n,
      order: i.length > 0 ? i : void 0
    }), t.updateColumnVisibility(s);
  }
  reorderColumns(e, t) {
    const r = {};
    t.config.columns.forEach((s) => {
      r[s.field] = !t.state.hiddenColumns.has(s.field);
    }), this.cachedOrder = e, this.savePrefs({
      version: 2,
      visibility: r,
      order: e
    }), console.log("[ColumnVisibility] Order saved:", e);
  }
  loadColumnOrderFromCache(e) {
    try {
      const t = this.loadPrefs();
      if (!t || !t.order) return [];
      const r = new Set(e), s = t.order.filter((n) => r.has(n));
      return this.cachedOrder = s, console.log("[ColumnVisibility] Order loaded from cache:", s), s;
    } catch (t) {
      return console.warn("Failed to load column order from cache:", t), [];
    }
  }
  loadHiddenColumnsFromCache(e) {
    try {
      const t = this.loadPrefs();
      if (!t) return /* @__PURE__ */ new Set();
      const r = new Set(e), s = /* @__PURE__ */ new Set();
      return Object.entries(t.visibility).forEach(([n, i]) => {
        !i && r.has(n) && s.add(n);
      }), s;
    } catch (t) {
      return console.warn("Failed to load column visibility state:", t), /* @__PURE__ */ new Set();
    }
  }
  loadPrefs() {
    try {
      const e = localStorage.getItem(this.storageKey);
      if (!e) return null;
      const t = JSON.parse(e);
      if (_t(t)) return t;
      const r = {
        version: 2,
        visibility: t
      };
      return console.log("[ColumnVisibility] Migrating V1 prefs to V2 format"), this.savePrefs(r), r;
    } catch (e) {
      return console.warn("Failed to load column preferences:", e), null;
    }
  }
  savePrefs(e) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(e));
    } catch (t) {
      console.warn("Failed to save column preferences:", t);
    }
  }
  clearSavedPrefs() {
    try {
      localStorage.removeItem(this.storageKey), this.cachedOrder = null, console.log("[ColumnVisibility] Preferences cleared");
    } catch (e) {
      console.warn("Failed to clear column preferences:", e);
    }
  }
}, sl = class extends bi {
  constructor(e, t) {
    const r = t.localStorageKey || `${t.resource}_datatable_columns`;
    if (super(e, r), this.syncTimeout = null, this.serverPrefs = null, this.mutationQueue = Promise.resolve(), this.resource = t.resource, this.preferencesEndpoint = String(t.preferencesEndpoint || "").trim().replace(/\/+$/, ""), !this.preferencesEndpoint) throw new Error("ServerColumnVisibilityBehavior requires an advertised preferences endpoint");
    this.syncDebounce = t.syncDebounce ?? 1e3, this.loadTimeoutMs = Math.max(100, t.loadTimeoutMs || mi), this.canWrite = t.canWrite !== !1;
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
      const r = await C(this.preferencesEndpoint, {
        method: "GET",
        credentials: "same-origin",
        signal: e?.signal,
        headers: { Accept: "application/json" }
      });
      if (!r.ok)
        return console.warn("[ServerColumnVisibility] Failed to load server prefs:", r.status), null;
      const s = (await r.json()).records || [];
      if (s.length === 0)
        return console.log("[ServerColumnVisibility] No server preferences found"), null;
      const n = s[0]?.raw;
      if (!n || !n[this.serverPrefsKey])
        return console.log("[ServerColumnVisibility] No column preferences in server response"), null;
      const i = n[this.serverPrefsKey];
      return _t(i) ? (this.serverPrefs = i, this.savePrefs(i), console.log("[ServerColumnVisibility] Loaded prefs from server:", i), i) : (console.warn("[ServerColumnVisibility] Server prefs not in V2 format:", i), null);
    } catch (r) {
      return gi(r) || console.warn("[ServerColumnVisibility] Error loading server prefs:", r), null;
    } finally {
      clearTimeout(t);
    }
  }
  getInitialPrefs(e) {
    const t = this.serverPrefs;
    if (t) {
      const r = /* @__PURE__ */ new Set();
      Object.entries(t.visibility).forEach(([n, i]) => {
        i || r.add(n);
      });
      const s = new Set(e);
      return {
        hiddenColumns: r,
        columnOrder: (t.order || []).filter((n) => s.has(n))
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
    e.config.columns.forEach((s) => {
      t[s.field] = !e.state.hiddenColumns.has(s.field);
    });
    const r = {
      version: 2,
      visibility: t,
      order: e.state.columnOrder.length > 0 ? e.state.columnOrder : void 0
    };
    try {
      const s = await C(this.preferencesEndpoint, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        json: { raw: { [this.serverPrefsKey]: r } }
      });
      if (!s.ok) {
        console.warn("[ServerColumnVisibility] Failed to sync to server:", s.status);
        return;
      }
      this.serverPrefs = r, console.log("[ServerColumnVisibility] Synced prefs to server:", r);
    } catch (s) {
      console.warn("[ServerColumnVisibility] Error syncing to server:", s);
    }
  }
  clearSavedPrefs() {
    this.cancelScheduledServerSync(), super.clearSavedPrefs(), this.serverPrefs = null, this.canWrite && this.enqueueServerMutation(() => this.clearServerPrefs());
  }
  async clearServerPrefs() {
    try {
      const e = await C(this.preferencesEndpoint, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        json: { clear_raw_keys: [this.serverPrefsKey] }
      });
      if (!e.ok) {
        console.warn("[ServerColumnVisibility] Failed to clear server prefs:", e.status);
        return;
      }
      console.log("[ServerColumnVisibility] Server prefs cleared");
    } catch (e) {
      console.warn("[ServerColumnVisibility] Error clearing server prefs:", e);
    } finally {
      this.serverPrefs = null;
    }
  }
};
function yi(e) {
  const t = e.trim(), r = t.indexOf("?");
  return r === -1 ? {
    path: t,
    query: ""
  } : {
    path: t.slice(0, r),
    query: t.slice(r + 1)
  };
}
function P(e, t, r = "", s = "") {
  const { path: n, query: i } = yi(e), a = n.replace(/\/+$/, ""), o = r.replace(/^\/+/, "");
  let l = `${a}/${encodeURIComponent(t)}`;
  o && (l += `/${o}`);
  const c = [];
  return i && c.push(i), s && c.push(s), c.length > 0 ? `${l}?${c.join("&")}` : l;
}
var Je = {
  view: 100,
  view_family: 150,
  edit: 200,
  duplicate: 300,
  create_translation: 400,
  publish: 500,
  unpublish: 600,
  submit: 700,
  approve: 800,
  reject: 900,
  archive: 1e3,
  restore: 1100,
  delete: 9e3
}, vi = 5e3, Rt = class {
  constructor(e) {
    this.seenActions = /* @__PURE__ */ new Set(), this.config = {
      useDefaultFallback: !0,
      appendDefaultActions: !1,
      actionContext: "row",
      ...e
    };
  }
  getContentChannel() {
    return String(this.config.channel ?? "").trim() || null;
  }
  buildRowActions(e, t) {
    this.seenActions.clear();
    const r = [];
    let s = 0;
    const n = this.buildQueryContext();
    if (Array.isArray(t) && t.length > 0) {
      for (const i of t) {
        if (!i.name) continue;
        const a = this.resolveRecordActionState(e, i.name);
        if (!this.shouldIncludeAction(e, i, a)) continue;
        const o = i.name.toLowerCase();
        if (this.seenActions.has(o)) continue;
        this.seenActions.add(o);
        const l = this.normalizeContextBoundActionState(e, i, a), c = this.buildActionFromSchema(e, i, n, l);
        c && r.push({
          action: c,
          name: i.name,
          order: this.resolveActionOrder(i.name, i.order),
          insertionIndex: s++
        });
      }
      this.config.appendDefaultActions && this.appendDefaultActionsOrdered(r, e, n, s);
    } else this.config.useDefaultFallback && this.appendDefaultActionsOrdered(r, e, n, s);
    return r.sort((i, a) => i.order !== a.order ? i.order - a.order : i.insertionIndex - a.insertionIndex), r.map((i) => i.action);
  }
  resolveActionOrder(e, t) {
    if (typeof t == "number" && Number.isFinite(t)) return t;
    const r = e.toLowerCase();
    return this.config.actionOrderOverride?.[r] !== void 0 ? this.config.actionOrderOverride[r] : Je[r] !== void 0 ? Je[r] : vi;
  }
  buildActionFromSchema(e, t, r, s) {
    const n = t.name, i = t.label || t.label_key || n, a = t.variant || "secondary", o = t.icon, l = this.isNavigationAction(t), c = n === "delete";
    return l ? this.applyActionState(this.buildNavigationAction(e, t, i, a, o, r), s) : c ? this.applyActionState(this.buildDeleteAction(e, i, a, o), s) : this.applyActionState(this.buildPostAction(e, t, i, a, o), s);
  }
  isNavigationAction(e) {
    return e.type === "navigation" || e.href ? !0 : [
      "view",
      "edit",
      "show",
      "details"
    ].includes(e.name.toLowerCase());
  }
  shouldIncludeAction(e, t, r) {
    return this.matchesActionScope(t.scope) ? this.missingRequiredContext(e, t).length === 0 ? !0 : r !== null : !1;
  }
  resolveRecordActionState(e, t) {
    return lt(e, t);
  }
  applyActionState(e, t) {
    if (!t || t.enabled !== !1) return e;
    const r = this.disabledReason(t);
    return {
      ...e,
      disabled: !0,
      disabledReason: r,
      disabledReasonCode: typeof t.reason_code == "string" ? t.reason_code : void 0,
      disabledSeverity: typeof t.severity == "string" ? t.severity : void 0,
      disabledKind: typeof t.kind == "string" ? t.kind : void 0,
      remediation: this.normalizeRemediation(t.remediation)
    };
  }
  normalizeRemediation(e) {
    if (!e || typeof e != "object") return null;
    const t = typeof e.label == "string" ? e.label.trim() : "", r = typeof e.href == "string" ? e.href.trim() : "", s = typeof e.kind == "string" ? e.kind.trim() : "";
    return !t && !r && !s ? null : {
      ...t ? { label: t } : {},
      ...r ? { href: r } : {},
      ...s ? { kind: s } : {}
    };
  }
  disabledReason(e) {
    const t = typeof e.reason == "string" ? e.reason.trim() : "";
    if (t) return t;
    const r = typeof e.reason_code == "string" ? e.reason_code.trim() : "";
    if (r) {
      const s = st({ reason_code: r });
      if (s?.message) return s.message;
    }
    switch (r.toLowerCase()) {
      case "workflow_transition_not_available":
      case "invalid_status":
        return "Action is not available in the current workflow state.";
      case "permission_denied":
        return "You do not have permission to execute this action.";
      case "missing_context_required":
      case "missing_context":
        return "Action is unavailable because required record context is missing.";
      case "translation_missing":
        return "Required translations are missing.";
      case "feature_disabled":
        return "This feature is currently disabled.";
      default:
        return "Action is currently unavailable.";
    }
  }
  matchesActionScope(e) {
    const t = typeof e == "string" ? e.trim().toLowerCase() : "";
    return !t || t === "all" ? !0 : t === (this.config.actionContext || "row").toLowerCase();
  }
  missingRequiredContext(e, t) {
    const r = Array.isArray(t.context_required) ? t.context_required : [];
    if (r.length === 0) return [];
    const s = [];
    for (const n of r) {
      const i = typeof n == "string" ? n.trim() : "";
      if (!i) continue;
      const a = this.resolveRecordContextValue(e, i);
      this.isEmptyPayloadValue(a) && s.push(i);
    }
    return s;
  }
  normalizeContextBoundActionState(e, t, r) {
    const s = this.missingRequiredContext(e, t);
    return s.length === 0 || r && r.enabled === !1 ? r : {
      enabled: !1,
      reason: "record does not include required context for this action",
      reason_code: "missing_context_required",
      metadata: {
        missing_context_fields: s,
        required_context_fields: Array.isArray(t.context_required) ? [...t.context_required] : []
      }
    };
  }
  resolveRecordContextValue(e, t) {
    const r = t.trim();
    if (!r) return;
    if (!r.includes(".")) return e[r];
    const s = r.split(".").map((i) => i.trim()).filter(Boolean);
    if (s.length === 0) return;
    let n = e;
    for (const i of s) {
      if (!n || typeof n != "object" || Array.isArray(n)) return;
      n = n[i];
    }
    return n;
  }
  buildNavigationAction(e, t, r, s, n, i) {
    const a = String(e.id || ""), o = this.config.actionBasePath;
    let l;
    if (t.href) {
      const c = this.interpolateHrefTemplate(t.href, e, a);
      i ? l = c.includes("?") ? `${c}&${i}` : `${c}?${i}` : l = c;
    } else t.name === "edit" ? l = P(o, a, "edit", i) : l = P(o, a, "", i);
    return {
      id: t.name,
      label: r,
      icon: n || this.getDefaultIcon(t.name),
      variant: s,
      action: () => {
        window.location.href = l;
      }
    };
  }
  interpolateHrefTemplate(e, t, r) {
    const s = e.trim();
    return s && s.replace(/\{([^}]+)\}/g, (n, i) => {
      const a = String(i || "").trim();
      if (!a) return "";
      if (a === "id") return r;
      const o = this.resolveRecordContextValue(t, a);
      return o == null ? "" : String(o);
    });
  }
  buildDeleteAction(e, t, r, s) {
    const n = String(e.id || ""), i = this.config.apiEndpoint;
    return {
      id: "delete",
      label: t,
      icon: s || "trash",
      variant: r === "secondary" ? "danger" : r,
      action: async () => {
        await vt({
          endpoint: `${i}/${n}`,
          fallbackMessage: "Delete failed",
          onSuccess: async (a) => {
            this.config.onActionSuccess?.("delete", {
              success: !0,
              data: a.data
            });
          },
          onError: async (a) => {
            this.config.onActionError?.("delete", a);
          },
          reconcileOnDomainFailure: async (a) => {
            a.textCode && this.config.reconcileOnDomainFailure && await this.config.reconcileOnDomainFailure("delete", a);
          }
        });
      }
    };
  }
  buildPostAction(e, t, r, s, n) {
    const i = String(e.id || ""), a = t.name, o = `${this.config.apiEndpoint}/actions/${a}`;
    return {
      id: a,
      label: r,
      icon: n || this.getDefaultIcon(a),
      variant: s,
      action: async () => {
        if (t.confirm && !window.confirm(t.confirm))
          return;
        const l = await this.buildActionPayload(e, t);
        l !== null && await this.executePostAction({
          actionName: a,
          endpoint: o,
          payload: l,
          recordId: i
        });
      }
    };
  }
  async executePostAction(e) {
    const t = await Ae(e.endpoint, e.payload);
    if (t.success)
      return e.actionName.toLowerCase() === "create_translation" && t.data ? (this.handleCreateTranslationSuccess(t.data, e.payload), t) : (this.handleActionRedirectSuccess(t.data) || this.config.onActionSuccess?.(e.actionName, t), t);
    if (t.error && Xt(t.error)) {
      const r = Wt(t.error);
      if (r && this.config.onTranslationBlocker) {
        const s = { ...e.payload }, n = this.getContentChannel() || r.channel || null;
        return this.config.onTranslationBlocker({
          actionName: e.actionName,
          recordId: e.recordId,
          ...r,
          channel: n,
          retry: async () => this.executePostAction({
            actionName: e.actionName,
            endpoint: e.endpoint,
            payload: { ...s },
            recordId: e.recordId
          })
        }), {
          success: !1,
          error: t.error
        };
      }
    }
    return await this.handleStructuredActionFailure(e.actionName, t, `${e.actionName} failed`), {
      success: !1,
      error: t.error
    };
  }
  handleActionRedirectSuccess(e) {
    if (!e || typeof window > "u") return !1;
    const t = typeof e.redirect_path == "string" ? e.redirect_path.trim() : "";
    if (t)
      return window.location.href = t, !0;
    const r = typeof e.redirect_record_id == "string" ? e.redirect_record_id.trim() : "";
    if (!r) return !1;
    const s = e.redirect_to_edit === !0 || e.mode === "redirect", n = this.buildQueryContext(), i = P(this.config.actionBasePath, r, s ? "edit" : "", n);
    return window.location.href = i, !0;
  }
  async handleStructuredActionFailure(e, t, r) {
    if (!t.error) return t;
    const s = this.buildActionErrorMessage(e, t.error), n = {
      ...t.error,
      message: s
    };
    throw n.textCode && this.config.reconcileOnDomainFailure && await this.config.reconcileOnDomainFailure(e, n), this.config.onActionError?.(e, n), re(n, r, !!this.config.onActionError);
  }
  handleCreateTranslationSuccess(e, t) {
    const r = typeof e.id == "string" ? e.id : String(e.id || ""), s = typeof e.locale == "string" ? e.locale : "";
    if (!r) {
      console.warn("[SchemaActionBuilder] create_translation response missing id");
      return;
    }
    const n = this.config.actionBasePath, i = new URLSearchParams();
    s && i.set("locale", s);
    const a = this.getContentChannel();
    a && i.set("channel", a);
    const o = i.toString(), l = `${n}/${r}/edit${o ? `?${o}` : ""}`, c = typeof t.source_locale == "string" ? t.source_locale : this.config.locale || "source", u = this.localeLabel(s || "unknown");
    typeof window < "u" && "toastManager" in window ? window.toastManager.success(`${u} translation created`, { action: {
      label: `View ${c.toUpperCase()}`,
      handler: () => {
        const h = new URLSearchParams();
        h.set("locale", c), a && h.set("channel", a);
        const p = typeof t.id == "string" ? t.id : String(t.id || r);
        window.location.href = `${n}/${p}/edit?${h.toString()}`;
      }
    } }) : console.log(`[SchemaActionBuilder] Translation created: ${s}`), window.location.href = l;
  }
  async buildActionPayload(e, t) {
    const r = t.name.trim().toLowerCase(), s = { id: e.id };
    this.config.locale && r !== "create_translation" && (s.locale = this.config.locale);
    const n = this.getContentChannel();
    if (n && (s.channel = n), this.config.panelName && (s.policy_entity = this.config.panelName), s.expected_version === void 0) {
      const c = this.resolveExpectedVersion(e);
      c !== null && (s.expected_version = c);
    }
    const i = this.normalizePayloadSchema(t.payload_schema), a = this.collectRequiredFields(t.payload_required, i);
    if (r === "create_translation" && this.applySchemaTranslationContext(s, e, i), i?.properties)
      for (const [c, u] of Object.entries(i.properties)) s[c] === void 0 && u.default !== void 0 && (s[c] = u.default);
    a.includes("idempotency_key") && this.isEmptyPayloadValue(s.idempotency_key) && (s.idempotency_key = this.generateIdempotencyKey(t.name, String(e.id || "")));
    const o = a.filter((c) => this.isEmptyPayloadValue(s[c]));
    if (o.length === 0) return s;
    const l = await this.promptForPayload(t, o, i, s, e);
    if (l === null) return null;
    for (const c of o) {
      const u = i?.properties?.[c], h = l[c] ?? "", p = this.coercePromptValue(h, c, u);
      if (p.error) throw new Error(p.error);
      s[c] = p.value;
    }
    return s;
  }
  async promptForPayload(e, t, r, s, n) {
    if (t.length === 0) return {};
    const i = t.map((a) => {
      const o = r?.properties?.[a];
      return {
        name: a,
        label: o?.title || a,
        description: o?.description,
        value: this.stringifyDefault(s[a] ?? o?.default),
        type: o?.type || "string",
        options: this.buildFieldOptions(a, e.name, o, n, s)
      };
    });
    return await dt.prompt({
      title: `Complete ${e.label || e.name}`,
      fields: i
    });
  }
  buildFieldOptions(e, t, r, s, n) {
    const i = this.deriveCreateTranslationLocaleOptions(e, t, s, r, n);
    if (i && i.length > 0) return i;
    if (!r) return;
    if (r.oneOf) return r.oneOf.filter((o) => o && "const" in o).map((o) => ({
      value: this.stringifyDefault(o.const),
      label: o.title || this.stringifyDefault(o.const)
    }));
    if (r.enum) return r.enum.map((o) => ({
      value: this.stringifyDefault(o),
      label: this.stringifyDefault(o)
    }));
    const a = this.buildExtensionFieldOptions(r);
    if (a && a.length > 0) return a;
  }
  buildExtensionFieldOptions(e) {
    const t = e, r = t["x-options"] ?? t.x_options ?? t.xOptions;
    if (!Array.isArray(r) || r.length === 0) return;
    const s = [];
    for (const n of r) {
      if (typeof n == "string") {
        const c = this.stringifyDefault(n);
        if (!c) continue;
        s.push({
          value: c,
          label: c
        });
        continue;
      }
      if (!n || typeof n != "object") continue;
      const i = n.value, a = this.stringifyDefault(i);
      if (!a) continue;
      const o = n.label, l = this.stringifyDefault(o) || a;
      s.push({
        value: a,
        label: l
      });
    }
    return s.length > 0 ? s : void 0;
  }
  deriveCreateTranslationLocaleOptions(e, t, r, s, n) {
    if (e.trim().toLowerCase() !== "locale" || t.trim().toLowerCase() !== "create_translation" || !r || typeof r != "object") return;
    const i = this.asObject(r.translation_readiness), a = n && typeof n == "object" ? n : {};
    let o = this.asStringArray(a.missing_locales);
    if (o.length === 0 && (o = this.asStringArray(i?.missing_required_locales)), o.length === 0 && (o = this.asStringArray(r.missing_locales)), o.length === 0 && i) {
      const y = this.asStringArray(i.required_locales), b = new Set(this.asStringArray(i.available_locales));
      o = y.filter((x) => !b.has(x));
    }
    const l = this.asStringArray(s?.enum);
    if (l.length > 0) {
      const y = new Set(l);
      o = o.filter((b) => y.has(b));
    }
    if (o.length === 0) return;
    const c = this.extractStringField(a, "recommended_locale") || this.extractStringField(r, "recommended_locale") || this.extractStringField(i || {}, "recommended_locale"), u = this.asStringArray(a.required_for_publish ?? r.required_for_publish ?? i?.required_for_publish ?? i?.required_locales), h = this.asStringArray(a.existing_locales ?? r.existing_locales ?? i?.available_locales), p = this.createTranslationLocaleLabelMap(s), m = /* @__PURE__ */ new Set(), v = [];
    for (const y of o) {
      const b = y.trim().toLowerCase();
      if (!b || m.has(b)) continue;
      m.add(b);
      const x = c?.toLowerCase() === b, S = u.includes(b), w = [];
      S && w.push("Required for publishing"), h.length > 0 && w.push(`${h.length} translation${h.length > 1 ? "s" : ""} exist`);
      const z = w.length > 0 ? w.join(" • ") : void 0, Vt = p[b] || this.localeLabel(b);
      let Be = `${b.toUpperCase()} - ${Vt}`;
      x && (Be += " (recommended)"), v.push({
        value: b,
        label: Be,
        description: z,
        recommended: x
      });
    }
    return v.sort((y, b) => y.recommended && !b.recommended ? -1 : !y.recommended && b.recommended ? 1 : y.value.localeCompare(b.value)), v.length > 0 ? v : void 0;
  }
  applySchemaTranslationContext(e, t, r) {
    if (!r) return;
    const s = this.extractTranslationContextMap(r);
    if (Object.keys(s).length !== 0)
      for (const [n, i] of Object.entries(s)) {
        const a = n.trim(), o = i.trim();
        if (!a || !o || !this.isEmptyPayloadValue(e[a])) continue;
        const l = this.resolveRecordContextValue(t, o);
        l != null && (e[a] = this.clonePayloadValue(l));
      }
  }
  extractTranslationContextMap(e) {
    const t = e["x-translation-context"] ?? e.x_translation_context;
    if (!t || typeof t != "object" || Array.isArray(t)) return {};
    const r = {};
    for (const [s, n] of Object.entries(t)) {
      const i = s.trim(), a = typeof n == "string" ? n.trim() : "";
      !i || !a || (r[i] = a);
    }
    return r;
  }
  clonePayloadValue(e) {
    return Array.isArray(e) ? e.map((t) => this.clonePayloadValue(t)) : e && typeof e == "object" ? { ...e } : e;
  }
  createTranslationLocaleLabelMap(e) {
    const t = {};
    if (!e) return t;
    if (Array.isArray(e.oneOf)) for (const n of e.oneOf) {
      const i = this.stringifyDefault(n?.const).trim().toLowerCase();
      if (!i) continue;
      const a = this.stringifyDefault(n?.title).trim();
      a && (t[i] = a);
    }
    const r = e, s = r["x-options"] ?? r.x_options ?? r.xOptions;
    if (Array.isArray(s)) for (const n of s) {
      if (!n || typeof n != "object") continue;
      const i = this.stringifyDefault(n.value).trim().toLowerCase(), a = this.stringifyDefault(n.label).trim();
      i && a && (t[i] = a);
    }
    return t;
  }
  extractStringField(e, t) {
    const r = e[t];
    return typeof r == "string" && r.trim() ? r.trim() : null;
  }
  resolveExpectedVersion(e) {
    const t = [
      e.expected_version,
      e.expectedVersion,
      e.version,
      e._version
    ];
    for (const r of t) {
      if (typeof r == "number" && Number.isFinite(r) && r > 0) return r;
      if (typeof r == "string") {
        const s = r.trim();
        if (!s) continue;
        const n = Number(s);
        if (Number.isFinite(n) && n > 0) return s;
      }
    }
    return null;
  }
  asObject(e) {
    return !e || typeof e != "object" || Array.isArray(e) ? null : e;
  }
  asStringArray(e) {
    return Array.isArray(e) ? e.filter((t) => typeof t == "string").map((t) => t.trim().toLowerCase()).filter((t) => t.length > 0) : [];
  }
  localeLabel(e) {
    return {
      en: "English",
      es: "Spanish",
      fr: "French",
      de: "German",
      it: "Italian",
      pt: "Portuguese"
    }[e] || e.toUpperCase();
  }
  stringifyDefault(e) {
    if (e == null) return "";
    if (typeof e == "string") return e;
    if (typeof e == "object") try {
      return JSON.stringify(e);
    } catch {
      return "";
    }
    return String(e);
  }
  normalizePayloadSchema(e) {
    if (!e || typeof e != "object") return null;
    const t = e.properties;
    let r;
    if (t && typeof t == "object" && !Array.isArray(t)) {
      r = {};
      for (const [o, l] of Object.entries(t)) l && typeof l == "object" && !Array.isArray(l) && (r[o] = l);
    }
    const s = e.required, n = Array.isArray(s) ? s.filter((o) => typeof o == "string").map((o) => o.trim()).filter((o) => o.length > 0) : void 0, i = e["x-translation-context"] ?? e.x_translation_context, a = i && typeof i == "object" && !Array.isArray(i) ? i : void 0;
    return {
      type: typeof e.type == "string" ? e.type : void 0,
      required: n,
      properties: r,
      ...a ? { "x-translation-context": a } : {}
    };
  }
  collectRequiredFields(e, t) {
    const r = [], s = /* @__PURE__ */ new Set(), n = (i) => {
      const a = i.trim();
      !a || s.has(a) || (s.add(a), r.push(a));
    };
    return Array.isArray(e) && e.forEach((i) => n(String(i))), Array.isArray(t?.required) && t.required.forEach((i) => n(String(i))), r;
  }
  isEmptyPayloadValue(e) {
    return e == null ? !0 : typeof e == "string" ? e.trim() === "" : Array.isArray(e) ? e.length === 0 : typeof e == "object" ? Object.keys(e).length === 0 : !1;
  }
  generateIdempotencyKey(e, t) {
    const r = e.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-"), s = t.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-"), n = typeof crypto < "u" && typeof crypto.randomUUID == "function" ? crypto.randomUUID() : `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    return `${r || "action"}-${s || "record"}-${n}`;
  }
  coercePromptValue(e, t, r) {
    const s = typeof e == "string" ? e.trim() : String(e ?? "").trim(), n = typeof r?.type == "string" ? r.type.toLowerCase() : "string";
    if (s.length === 0) return { value: s };
    if (n === "number" || n === "integer") {
      const i = Number(s);
      return Number.isFinite(i) ? { value: n === "integer" ? Math.trunc(i) : i } : {
        value: null,
        error: `${t} must be a valid number`
      };
    }
    if (n === "boolean") {
      const i = s.toLowerCase();
      return i === "true" || i === "1" || i === "yes" ? { value: !0 } : i === "false" || i === "0" || i === "no" ? { value: !1 } : {
        value: null,
        error: `${t} must be true or false`
      };
    }
    if (n === "array" || n === "object") try {
      return { value: JSON.parse(s) };
    } catch {
      return {
        value: null,
        error: `${t} must be valid JSON (${n === "array" ? "[...]" : "{...}"})`
      };
    }
    return { value: s };
  }
  buildActionErrorMessage(e, t) {
    return q(t, `${e} failed`);
  }
  buildQueryContext() {
    const e = new URLSearchParams();
    this.config.locale && e.set("locale", this.config.locale);
    const t = this.getContentChannel();
    return t && e.set("channel", t), e.toString();
  }
  appendDefaultActions(e, t, r) {
    const s = String(t.id || ""), n = this.config.actionBasePath, i = [
      {
        name: "view",
        button: {
          id: "view",
          label: "View",
          icon: "eye",
          variant: "secondary",
          action: () => {
            window.location.href = P(n, s, "", r);
          }
        }
      },
      {
        name: "edit",
        button: {
          id: "edit",
          label: "Edit",
          icon: "edit",
          variant: "primary",
          action: () => {
            window.location.href = P(n, s, "edit", r);
          }
        }
      },
      {
        name: "delete",
        button: this.buildDeleteAction(t, "Delete", "danger", "trash")
      }
    ];
    for (const a of i) this.seenActions.has(a.name) || (this.seenActions.add(a.name), e.push(a.button));
  }
  appendDefaultActionsOrdered(e, t, r, s) {
    const n = String(t.id || ""), i = this.config.actionBasePath, a = [
      {
        name: "view",
        button: {
          id: "view",
          label: "View",
          icon: "eye",
          variant: "secondary",
          action: () => {
            window.location.href = P(i, n, "", r);
          }
        }
      },
      {
        name: "edit",
        button: {
          id: "edit",
          label: "Edit",
          icon: "edit",
          variant: "primary",
          action: () => {
            window.location.href = P(i, n, "edit", r);
          }
        }
      },
      {
        name: "delete",
        button: this.buildDeleteAction(t, "Delete", "danger", "trash")
      }
    ];
    let o = s;
    for (const l of a) this.seenActions.has(l.name) || (this.seenActions.add(l.name), e.push({
      action: l.button,
      name: l.name,
      order: this.resolveActionOrder(l.name, void 0),
      insertionIndex: o++
    }));
  }
  getDefaultIcon(e) {
    return {
      view: "eye",
      edit: "edit",
      delete: "trash",
      publish: "check-circle",
      unpublish: "x-circle",
      archive: "archive",
      restore: "archive",
      duplicate: "copy",
      create_translation: "copy",
      view_family: "git-branch",
      approve: "check-circle",
      reject: "x-circle",
      submit: "check-circle"
    }[e.toLowerCase()];
  }
};
function nl(e, t, r) {
  return new Rt(r).buildRowActions(e, t);
}
function il(e) {
  return e.schema?.actions;
}
function wi() {
  const e = globalThis.window;
  return e?.toastManager ? e.toastManager : new O();
}
async function xi(e) {
  return et(e, null);
}
function Ce(e, t) {
  return (typeof e.id == "string" && e.id.trim() ? e.id.trim() : `${e.label}-${t + 1}`).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || `action-${t + 1}`;
}
function Si(e, t) {
  const r = "inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2";
  if (t) return `${r} cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400 focus:ring-gray-300`;
  switch ((e.variant || "secondary").toLowerCase()) {
    case "primary":
      return `${r} border-blue-600 bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500`;
    case "danger":
      return `${r} border-red-600 bg-red-600 text-white hover:bg-red-700 focus:ring-red-500`;
    case "success":
      return `${r} border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500`;
    case "warning":
      return `${r} border-amber-500 bg-amber-500 text-white hover:bg-amber-600 focus:ring-amber-400`;
    default:
      return `${r} border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-blue-500`;
  }
}
function Ci(e, t) {
  const r = "flex w-full items-center gap-2 px-4 py-2.5 text-sm text-left transition-colors";
  if (t) return `${r} cursor-not-allowed text-gray-400`;
  switch ((e.variant || "secondary").toLowerCase()) {
    case "danger":
      return `${r} text-red-600 hover:bg-red-50`;
    case "success":
      return `${r} text-emerald-600 hover:bg-emerald-50`;
    case "warning":
      return `${r} text-amber-600 hover:bg-amber-50`;
    default:
      return `${r} text-gray-700 hover:bg-gray-50`;
  }
}
function Qe(e) {
  return {
    edit: "iconoir-edit-pencil",
    delete: "iconoir-trash",
    publish: "iconoir-cloud-upload",
    unpublish: "iconoir-cloud-download",
    submit_for_approval: "iconoir-send",
    approve: "iconoir-check-circle",
    reject: "iconoir-xmark-circle",
    archive: "iconoir-archive",
    restore: "iconoir-refresh",
    duplicate: "iconoir-copy",
    add_translation: "iconoir-translate",
    create_translation: "iconoir-translate"
  }[String(e.id || "").toLowerCase().replace(/[^a-z_]/g, "_")] || "";
}
function $i(e) {
  const t = e.findIndex((s) => String(s.id || "").toLowerCase() === "edit");
  if (t >= 0) return {
    primary: e[t],
    rest: [...e.slice(0, t), ...e.slice(t + 1)]
  };
  const r = e.findIndex((s) => (s.variant || "").toLowerCase() === "primary");
  return r >= 0 ? {
    primary: e[r],
    rest: [...e.slice(0, r), ...e.slice(r + 1)]
  } : e.length === 1 ? {
    primary: e[0],
    rest: []
  } : {
    primary: null,
    rest: e
  };
}
function Ai(e) {
  if (e.length === 0) return "";
  const { primary: t, rest: r } = $i(e);
  let s = "";
  if (t) {
    const i = t.disabled === !0, a = Ce(t, 0), o = Qe(t), l = i ? (t.disabledReason || "Action unavailable").trim() : "", c = l ? `detail-action-reason-${a}` : "", u = c ? `aria-describedby="${c}"` : "", h = l ? `${t.label} unavailable: ${l}` : t.label, p = i && t.remediation?.href && t.remediation?.label ? `
          <a
            href="${d(t.remediation.href.trim())}"
            class="inline-flex items-center justify-center rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            data-detail-action-remediation="${d(a)}"
          >
            ${d(t.remediation.label.trim())}
          </a>
        ` : "", m = l ? `title="${d(l)}"` : "", v = i && l ? `<span
           class="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-100 text-amber-600 text-xs cursor-help"
           title="${d(l)}"
           aria-hidden="true"
         >?</span>
         <span class="sr-only" data-detail-action-reason="${d(a)}" id="detail-action-reason-${d(a)}">${d(l)}</span>` : "";
    s = `
      <div data-detail-action-card="${d(a)}" class="flex items-center gap-2">
        <button
          type="button"
          class="${Si(t, i)}"
          data-detail-action-button="${d(a)}"
          data-detail-action-name="${d(t.id || t.label)}"
          data-disabled="${i}"
          aria-disabled="${i ? "true" : "false"}"
          aria-label="${d(h)}"
          ${u}
          ${m}
        >
          ${o ? `<i class="${o}"></i>` : ""}
          ${d(t.label)}
          ${v}
        </button>
        ${i && p ? p : ""}
      </div>
    `;
  }
  let n = "";
  return r.length > 0 && (n = `
      <div class="relative" data-detail-actions-dropdown>
        <button
          type="button"
          class="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          data-detail-actions-dropdown-trigger
          aria-haspopup="true"
          aria-expanded="false"
          aria-label="More actions"
        >
          <i class="iconoir-more-horiz text-lg"></i>
        </button>
        <div
          class="absolute right-0 z-50 mt-2 w-56 origin-top-right rounded-xl border border-gray-200 bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 hidden"
          data-detail-actions-dropdown-menu
          role="menu"
          aria-orientation="vertical"
        >
          ${r.map((i, a) => {
    const o = i.disabled === !0, l = Ce(i, t ? a + 1 : a), c = Qe(i), u = o ? (i.disabledReason || "Action unavailable").trim() : "", h = u ? `detail-action-reason-${l}` : "", p = h ? `aria-describedby="${h}"` : "", m = u ? `${i.label} unavailable: ${u}` : i.label, v = i.variant === "danger" && a > 0 ? '<div class="my-1 border-t border-gray-100"></div>' : "", y = u ? `title="${d(u)}"` : "", b = o && i.remediation?.href && i.remediation?.label ? `
            <a
              href="${d(i.remediation.href.trim())}"
              class="block px-4 pb-2 text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
              data-detail-action-remediation="${d(l)}"
            >
              ${d(i.remediation.label.trim())}
            </a>
          ` : "", x = o && u ? `<span
             class="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-100 text-amber-600 text-xs cursor-help"
             title="${d(u)}"
             aria-hidden="true"
           >?</span>
           <span class="sr-only" data-detail-action-reason="${d(l)}" id="detail-action-reason-${d(l)}">${d(u)}</span>` : "";
    return `
        ${v}
        <div data-detail-action-card="${d(l)}" class="space-y-1">
          <button
            type="button"
            class="${Ci(i, o)}"
            data-detail-action-button="${d(l)}"
            data-detail-action-name="${d(i.id || i.label)}"
            data-disabled="${o}"
            aria-disabled="${o ? "true" : "false"}"
            aria-label="${d(m)}"
            ${p}
            ${y}
          >
            ${c ? `<i class="${c} text-base"></i>` : '<span class="w-4"></span>'}
            <span class="flex-1">${d(i.label)}</span>
            ${x}
            ${o ? '<i class="iconoir-lock text-gray-400 text-xs ml-1"></i>' : ""}
          </button>
          ${o && b ? b : ""}
        </div>
      `;
  }).join("")}
        </div>
      </div>
    `), `
    <div class="flex items-start gap-2" data-panel-detail-actions-list="true" aria-label="Detail actions" role="toolbar">
      ${s}
      ${n}
    </div>
  `;
}
var Ei = class {
  constructor(e) {
    this.actions = [], this.record = null, this.documentClickHandler = null, this.documentKeydownHandler = null, this.mount = e.mount, this.notifier = e.notifier || wi(), this.fetchImpl = e.fetchImpl || fetch.bind(globalThis);
  }
  async init() {
    this.mount && (this.mount.setAttribute("aria-busy", "true"), await this.refresh());
  }
  async refresh() {
    this.cleanupDocumentListeners();
    const e = await this.fetchDetailPayload();
    if (!e) {
      this.mount.innerHTML = "", this.mount.setAttribute("aria-busy", "false");
      return;
    }
    const t = e.data && typeof e.data == "object" ? e.data : null, r = Array.isArray(e.schema?.actions) ? e.schema.actions : [];
    if (!t || r.length === 0) {
      this.mount.innerHTML = "", this.mount.setAttribute("aria-busy", "false");
      return;
    }
    const s = this.panelName(), n = this.recordID(), i = this.panelBasePath(), a = `${this.apiBasePath()}/panels/${encodeURIComponent(s)}`, o = new URLSearchParams(window.location.search), l = o.get("locale") || void 0, c = o.get("channel") || o.get("environment") || void 0, u = new Rt({
      apiEndpoint: a,
      actionBasePath: i,
      panelName: s,
      locale: l,
      channel: c,
      actionContext: "detail",
      onActionSuccess: async (h) => {
        if (h === "delete") {
          const p = this.backHref();
          if (p) {
            window.location.assign(p);
            return;
          }
          window.location.assign(i);
          return;
        }
        await this.refresh();
      },
      onActionError: (h, p) => {
        this.notifier.error(q(p, `${h} failed`));
      },
      reconcileOnDomainFailure: async () => {
        await this.refresh();
      }
    });
    this.record = t, this.actions = u.buildRowActions(t, r), this.mount.innerHTML = Ai(this.actions), this.mount.setAttribute("aria-busy", "false"), this.attachListeners(n), this.attachDropdownListeners();
  }
  async fetchDetailPayload() {
    const e = this.detailEndpoint();
    if (!e) return null;
    const t = await this.fetchImpl(e, { headers: { Accept: "application/json" } });
    if (!t.ok)
      return this.notifier.error(`Actions unavailable (${t.status})`), null;
    const r = await xi(t);
    return !r || typeof r != "object" ? null : it(r);
  }
  attachListeners(e) {
    this.actions.forEach((t, r) => {
      const s = Ce(t, r), n = this.mount.querySelector(`[data-detail-action-button="${s}"]`);
      n && n.addEventListener("click", async (i) => {
        if (i.preventDefault(), !(n.getAttribute("aria-disabled") === "true" || n.dataset.disabled === "true"))
          try {
            await t.action({
              ...this.record || {},
              id: e
            });
          } catch (a) {
            if (!M(a)) {
              const o = V(a), l = o ? q(o, `${t.label} failed`) : a instanceof Error ? a.message : `${t.label} failed`;
              this.notifier.error(l);
            }
          }
      });
    });
  }
  cleanupDocumentListeners() {
    this.documentClickHandler && (document.removeEventListener("click", this.documentClickHandler), this.documentClickHandler = null), this.documentKeydownHandler && (document.removeEventListener("keydown", this.documentKeydownHandler), this.documentKeydownHandler = null);
  }
  attachDropdownListeners() {
    const e = this.mount.querySelector("[data-detail-actions-dropdown]");
    if (!e) return;
    const t = e.querySelector("[data-detail-actions-dropdown-trigger]"), r = e.querySelector("[data-detail-actions-dropdown-menu]");
    !t || !r || (t.addEventListener("click", (s) => {
      s.preventDefault(), s.stopPropagation(), r.classList.contains("hidden") ? this.openDropdown(t, r) : this.closeDropdown(t, r);
    }), this.documentClickHandler = (s) => {
      e.contains(s.target) || this.closeDropdown(t, r);
    }, document.addEventListener("click", this.documentClickHandler), this.documentKeydownHandler = (s) => {
      s.key === "Escape" && !r.classList.contains("hidden") && (this.closeDropdown(t, r), t.focus());
    }, document.addEventListener("keydown", this.documentKeydownHandler), r.querySelectorAll("[data-detail-action-button]").forEach((s) => {
      s.addEventListener("click", (n) => {
        if (s.getAttribute("aria-disabled") === "true" || s.dataset.disabled === "true") {
          n.preventDefault();
          return;
        }
        this.closeDropdown(t, r);
      });
    }));
  }
  openDropdown(e, t) {
    t.classList.remove("hidden"), e.setAttribute("aria-expanded", "true");
  }
  closeDropdown(e, t) {
    t.classList.add("hidden"), e.setAttribute("aria-expanded", "false");
  }
  detailEndpoint() {
    const e = this.panelName(), t = this.recordID();
    if (!e || !t) return "";
    const r = new URLSearchParams(window.location.search), s = r.get("locale"), n = r.get("channel") || r.get("environment"), i = `${this.apiBasePath()}/panels/${encodeURIComponent(e)}/${encodeURIComponent(t)}`;
    if (!s && !n) return i;
    const a = new URLSearchParams();
    return s && a.set("locale", s), n && a.set("channel", n), `${i}?${a.toString()}`;
  }
  apiBasePath() {
    return String(this.mount.dataset.apiBasePath || "").trim().replace(/\/$/, "");
  }
  panelBasePath() {
    const e = String(this.mount.dataset.panelBasePath || "").trim();
    return e ? e.replace(/\/$/, "") : `${String(this.mount.dataset.basePath || "").trim().replace(/\/$/, "")}/${this.panelName()}`.replace(/\/{2,}/g, "/");
  }
  backHref() {
    return String(this.mount.dataset.backHref || "").trim();
  }
  panelName() {
    return String(this.mount.dataset.panel || "").trim();
  }
  recordID() {
    return String(this.mount.dataset.recordId || "").trim();
  }
};
async function al(e = document) {
  const t = Array.from(e.querySelectorAll("[data-panel-detail-actions]")), r = [];
  for (const s of t) {
    const n = new Ei({ mount: s });
    r.push(n), await n.init();
  }
  return r;
}
var ki = class Pt extends Jt {
  constructor(t) {
    super({
      size: "lg",
      initialFocus: "[data-blocker-action]",
      labelledBy: "blocker-title",
      describedBy: "blocker-description",
      lockBodyScroll: !0,
      dismissOnBackdropClick: !0,
      dismissOnEscape: !0
    }), this.localeStates = /* @__PURE__ */ new Map(), this.resolved = !1, this.config = t;
    for (const r of t.missingLocales) this.localeStates.set(r, {
      loading: !1,
      created: !1
    });
  }
  getContentChannel() {
    return String(this.config.channel ?? "").trim() || null;
  }
  static showBlocker(t) {
    return new Promise((r) => {
      const s = t.onDismiss;
      new Pt({
        ...t,
        onDismiss: () => {
          s?.(), r();
        }
      }).show();
    });
  }
  renderContent() {
    const t = this.config.transition || "complete action", r = this.config.entityType || "content", s = this.config.missingFieldsByLocale !== null && Object.keys(this.config.missingFieldsByLocale).length > 0;
    return `
      <div class="flex flex-col">
        <!-- Header -->
        <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-amber-50 dark:bg-amber-900/20">
          <div class="flex items-center gap-3">
            <div class="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-amber-100 dark:bg-amber-800/40">
              <svg class="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
            </div>
            <div>
              <h2 id="blocker-title" class="text-lg font-semibold text-gray-900 dark:text-white">
                Cannot ${d(t)} ${d(r)}
              </h2>
              <p id="blocker-description" class="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                ${this.renderDescription(s)}
              </p>
            </div>
          </div>
        </div>

        <!-- Missing Locales List -->
        <div class="px-6 py-4 max-h-[50vh] overflow-y-auto">
          <p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3" id="locales-heading">
            Missing translations (${this.config.missingLocales.length}):
          </p>
          <ul class="space-y-3" role="list" aria-labelledby="locales-heading">
            ${this.config.missingLocales.map((n) => this.renderLocaleItem(n)).join("")}
          </ul>
        </div>

        <!-- Footer -->
        <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <button type="button"
                  data-blocker-dismiss
                  class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer transition-colors">
            Close
          </button>
          <button type="button"
                  data-blocker-retry
                  class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-describedby="retry-hint">
            Retry ${d(t)}
          </button>
        </div>
        <p id="retry-hint" class="sr-only">Retry the blocked action after creating missing translations</p>
      </div>
    `;
  }
  renderDescription(t) {
    return t ? "Required translations are missing or incomplete. Create or complete the translations listed below." : "Required translations are missing. Create the translations listed below to continue.";
  }
  renderLocaleItem(t) {
    const r = this.localeStates.get(t) || {
      loading: !1,
      created: !1
    }, s = this.config.missingFieldsByLocale?.[t], n = Array.isArray(s) && s.length > 0, i = this.getLocaleLabel(t), a = r.loading ? "disabled" : "";
    return `
      <li class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 ${r.loading ? "opacity-50" : ""}"
          data-locale-item="${d(t)}"
          role="listitem">
        <div class="flex items-start justify-between gap-4">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 uppercase tracking-wide"
                    aria-label="Locale code">
                ${d(t)}
              </span>
              <span class="text-sm font-medium text-gray-900 dark:text-white">
                ${d(i)}
              </span>
              ${r.created ? `
                <span class="inline-flex items-center text-xs text-green-600 dark:text-green-400" role="status">
                  <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                  </svg>
                  Created
                </span>
              ` : ""}
            </div>
            ${n ? `
              <div class="mt-2">
                <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Missing required fields:</p>
                <div class="flex flex-wrap gap-1.5">
                  ${s.map((o) => `
                    <span class="inline-flex items-center px-2 py-0.5 rounded text-xs bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
                      ${d(o)}
                    </span>
                  `).join("")}
                </div>
              </div>
            ` : ""}
          </div>
          <div class="flex items-center gap-2 flex-shrink-0">
            ${r.created ? this.renderOpenButton(t, r.newRecordId) : this.renderCreateButton(t, a)}
            ${this.renderOpenButton(t, void 0, r.created)}
          </div>
        </div>
        ${r.loading ? `
          <div class="mt-2 flex items-center text-xs text-gray-500 dark:text-gray-400" role="status" aria-live="polite">
            <svg class="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
            </svg>
            Creating translation...
          </div>
        ` : ""}
      </li>
    `;
  }
  renderCreateButton(t, r) {
    return `
      <button type="button"
              data-blocker-action="create"
              data-locale="${d(t)}"
              ${r}
              class="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
              aria-label="Create ${this.getLocaleLabel(t)} translation">
        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
        </svg>
        Create
      </button>
    `;
  }
  renderOpenButton(t, r, s = !1) {
    if (s) return "";
    const n = this.config.navigationBasePath, i = r || this.config.recordId, a = new URLSearchParams();
    a.set("locale", t);
    const o = this.getContentChannel();
    o && a.set("channel", o);
    const l = `${n}/${i}/edit?${a.toString()}`;
    return `
      <a href="${d(l)}"
         data-blocker-action="open"
         data-locale="${d(t)}"
         class="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer transition-colors"
         aria-label="Open ${this.getLocaleLabel(t)} translation">
        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
        </svg>
        Open
      </a>
    `;
  }
  getLocaleLabel(t) {
    return {
      en: "English",
      es: "Spanish",
      fr: "French",
      de: "German",
      it: "Italian",
      pt: "Portuguese",
      ja: "Japanese",
      ko: "Korean",
      zh: "Chinese",
      ar: "Arabic",
      ru: "Russian",
      nl: "Dutch",
      pl: "Polish",
      sv: "Swedish",
      da: "Danish",
      no: "Norwegian",
      fi: "Finnish"
    }[t.toLowerCase()] || t.toUpperCase();
  }
  bindContentEvents() {
    this.container?.querySelector("[data-blocker-dismiss]")?.addEventListener("click", () => {
      this.dismiss();
    }), this.container?.querySelector("[data-blocker-retry]")?.addEventListener("click", async () => {
      await this.handleRetry();
    }), this.container?.querySelectorAll('[data-blocker-action="create"]')?.forEach((r) => {
      r.addEventListener("click", () => {
        const s = r.getAttribute("data-locale");
        s && this.handleCreateTranslation(s);
      });
    });
    const t = this.container?.querySelectorAll("[data-locale-item]");
    t?.forEach((r, s) => {
      r.addEventListener("keydown", (n) => {
        n.key === "ArrowDown" && s < t.length - 1 ? (n.preventDefault(), t[s + 1].querySelector("[data-blocker-action]")?.focus()) : n.key === "ArrowUp" && s > 0 && (n.preventDefault(), t[s - 1].querySelector("[data-blocker-action]")?.focus());
      });
    });
  }
  async handleCreateTranslation(t) {
    const r = this.localeStates.get(t);
    if (!(!r || r.loading || r.created)) {
      r.loading = !0, this.updateLocaleItemUI(t);
      try {
        const s = {
          id: this.config.recordId,
          locale: t
        }, n = this.getContentChannel();
        n && (s.channel = n), this.config.panelName && (s.policy_entity = this.config.panelName);
        const i = `${this.config.apiEndpoint}/actions/create_translation`, a = await Ae(i, s);
        if (a.success) {
          r.loading = !1, r.created = !0, a.data?.id && (r.newRecordId = String(a.data.id)), this.updateLocaleItemUI(t);
          const o = {
            id: r.newRecordId || this.config.recordId,
            locale: t,
            status: String(a.data?.status || "draft"),
            family_id: a.data?.family_id ? String(a.data.family_id) : void 0
          };
          this.config.onCreateSuccess?.(t, o);
        } else {
          r.loading = !1, this.updateLocaleItemUI(t);
          const o = a.error?.message || "Failed to create translation";
          this.config.onError?.(o);
        }
      } catch (s) {
        r.loading = !1, this.updateLocaleItemUI(t);
        const n = s instanceof Error ? s.message : "Failed to create translation";
        this.config.onError?.(n);
      }
    }
  }
  updateLocaleItemUI(t) {
    const r = this.container?.querySelector(`[data-locale-item="${t}"]`);
    if (!r || !this.localeStates.get(t)) return;
    const s = r.parentElement;
    if (!s) return;
    const n = document.createElement("div");
    n.innerHTML = this.renderLocaleItem(t);
    const i = n.firstElementChild;
    i && (s.replaceChild(i, r), i.querySelector('[data-blocker-action="create"]')?.addEventListener("click", () => {
      this.handleCreateTranslation(t);
    }));
  }
  async handleRetry() {
    if (this.resolved = !0, this.hide(), !!this.config.onRetry)
      try {
        await this.config.onRetry();
      } catch (t) {
        const r = t instanceof Error ? t.message : "Retry failed";
        this.config.onError?.(r);
      }
  }
  dismiss() {
    this.resolved = !0, this.config.onDismiss?.(), this.hide();
  }
  onBeforeHide() {
    return this.resolved || (this.resolved = !0, this.config.onDismiss?.()), !0;
  }
};
async function ol(e) {
  try {
    await ki.showBlocker(e);
  } catch (t) {
    console.error("[TranslationBlockerModal] Render failed, using fallback:", t);
    const r = `Cannot ${e.transition || "complete action"}: Missing translations for ${e.missingLocales.join(", ")}`;
    typeof window < "u" && "toastManager" in window ? window.toastManager.error(r) : alert(r);
  }
}
var Li = [
  {
    key: "ready",
    label: "Ready",
    icon: "●",
    colorClass: "text-green-500",
    description: "All required translations are complete"
  },
  {
    key: "incomplete",
    label: "Incomplete",
    icon: "◐",
    colorClass: "text-amber-500",
    description: "Has translations but missing required fields"
  },
  {
    key: "missing",
    label: "Missing",
    icon: "○",
    colorClass: "text-red-500",
    description: "Missing required locale translations"
  },
  {
    key: "fallback",
    label: "Fallback",
    icon: "⚠",
    colorClass: "text-amber-600",
    description: "Viewing fallback content or stale data"
  }
], Tt = class {
  constructor(e) {
    this.container = null;
    const t = typeof e.container == "string" ? document.querySelector(e.container) : e.container;
    this.config = {
      container: t,
      containerClass: e.containerClass || "",
      title: e.title || "",
      orientation: e.orientation || "horizontal",
      size: e.size || "default",
      items: e.items || Li
    }, this.container = t;
  }
  render() {
    if (!this.container) {
      console.warn("[StatusLegend] Container not found");
      return;
    }
    this.container.innerHTML = this.buildHTML();
  }
  buildHTML() {
    const { title: e, orientation: t, size: r, items: s, containerClass: n } = this.config, i = t === "vertical", a = r === "sm", o = i ? "flex-col" : "flex-row flex-wrap", l = a ? "gap-2" : "gap-4", c = a ? "text-xs" : "text-sm", u = a ? "text-sm" : "text-base";
    return `
      <div class="status-legend inline-flex items-center ${o} ${l} ${n}"
           role="list"
           aria-label="Translation status legend">
        ${e ? `<span class="font-medium text-gray-600 dark:text-gray-400 mr-2 ${c}">${d(e)}</span>` : ""}
        ${s.map((h) => this.renderItem(h, u, c)).join("")}
      </div>
    `;
  }
  renderItem(e, t, r) {
    return `
      <div class="status-legend-item inline-flex items-center gap-1"
           role="listitem"
           title="${d(e.description)}"
           aria-label="${d(e.label)}: ${d(e.description)}">
        <span class="${e.colorClass} ${t}" aria-hidden="true">${e.icon}</span>
        <span class="text-gray-600 dark:text-gray-400 ${r}">${d(e.label)}</span>
      </div>
    `;
  }
  setItems(e) {
    this.config.items = e, this.render();
  }
  destroy() {
    this.container && (this.container.innerHTML = ""), this.container = null;
  }
};
function _i(e) {
  const t = new Tt(e);
  return t.render(), t;
}
function ll() {
  const e = document.querySelectorAll("[data-status-legend]"), t = [];
  return e.forEach((r) => {
    if (r.hasAttribute("data-status-legend-init")) return;
    const s = _i({
      container: r,
      orientation: r.dataset.orientation || "horizontal",
      size: r.dataset.size || "default",
      title: r.dataset.title || ""
    });
    r.setAttribute("data-status-legend-init", "true"), t.push(s);
  }), t;
}
function cl(e = {}) {
  const t = document.createElement("div");
  return new Tt({
    container: t,
    ...e
  }).buildHTML();
}
var Dt = [
  {
    key: "all",
    label: "All",
    field: "",
    value: "",
    icon: "○",
    styleClass: "bg-gray-100 text-gray-700 hover:bg-gray-200",
    description: "Show all records"
  },
  {
    key: "ready",
    label: "Ready",
    field: "readiness_state",
    value: "ready",
    icon: "●",
    styleClass: "bg-green-100 text-green-700 hover:bg-green-200",
    description: "All translations complete"
  },
  {
    key: "missing_locales",
    label: "Missing",
    field: "readiness_state",
    value: "missing_locales",
    icon: "○",
    styleClass: "bg-amber-100 text-amber-700 hover:bg-amber-200",
    description: "Missing required locale translations"
  },
  {
    key: "missing_fields",
    label: "Incomplete",
    field: "readiness_state",
    value: "missing_fields",
    icon: "◐",
    styleClass: "bg-yellow-100 text-yellow-700 hover:bg-yellow-200",
    description: "Has translations but missing required fields"
  },
  {
    key: "fallback",
    label: "Fallback",
    field: "fallback_used",
    value: "true",
    icon: "⚠",
    styleClass: "bg-orange-100 text-orange-700 hover:bg-orange-200",
    description: "Records currently viewed in fallback mode"
  }
], Ri = class {
  constructor(e) {
    if (this.container = null, this.config = e, this.container = typeof e.container == "string" ? document.querySelector(e.container) : e.container, this.state = {
      activeKey: null,
      capabilities: /* @__PURE__ */ new Map()
    }, e.capabilities) for (const t of e.capabilities) this.state.capabilities.set(t.key, t);
    for (const t of e.filters) this.state.capabilities.has(t.key) || this.state.capabilities.set(t.key, {
      key: t.key,
      supported: !0
    });
    this.render();
  }
  render() {
    if (!this.container) {
      console.warn("[QuickFilters] Container not found");
      return;
    }
    const { size: e = "default", containerClass: t = "" } = this.config, r = e === "sm" ? "text-xs" : "text-sm", s = e === "sm" ? "px-2 py-1" : "px-3 py-1.5", n = this.config.filters.map((i) => this.renderFilterButton(i, r, s)).join("");
    this.container.innerHTML = `
      <div class="quick-filters inline-flex items-center gap-1 flex-wrap ${t}"
           role="group"
           aria-label="Quick filters">
        ${n}
      </div>
    `, this.bindEventListeners();
  }
  renderFilterButton(e, t, r) {
    const s = this.state.capabilities.get(e.key), n = s?.supported !== !1, i = this.state.activeKey === e.key, a = s?.disabledReason || "Filter not available", o = `inline-flex items-center gap-1 ${r} ${t} rounded-full font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500`;
    let l, c;
    n ? i ? (l = `${e.styleClass || "bg-blue-100 text-blue-700"} ring-2 ring-offset-1 ring-blue-500`, c = 'aria-pressed="true"') : (l = e.styleClass || "bg-gray-100 text-gray-700 hover:bg-gray-200", c = 'aria-pressed="false"') : (l = "bg-gray-100 text-gray-400 cursor-not-allowed opacity-60", c = `aria-disabled="true" title="${f(a)}"`);
    const u = e.icon ? `<span aria-hidden="true">${e.icon}</span>` : "";
    return `
      <button type="button"
              class="quick-filter-btn ${o} ${l}"
              data-filter-key="${f(e.key)}"
              ${c}
              ${n ? "" : "disabled"}>
        ${u}
        <span>${d(e.label)}</span>
      </button>
    `;
  }
  bindEventListeners() {
    this.container && this.container.querySelectorAll(".quick-filter-btn").forEach((e) => {
      e.addEventListener("click", () => {
        const t = e.dataset.filterKey;
        t && !e.disabled && this.selectFilter(t);
      });
    });
  }
  selectFilter(e) {
    const t = this.config.filters.find((r) => r.key === e);
    if (!t) {
      console.warn(`[QuickFilters] Filter not found: ${e}`);
      return;
    }
    if (this.state.capabilities.get(e)?.supported === !1) {
      console.warn(`[QuickFilters] Filter not supported: ${e}`);
      return;
    }
    if (this.state.activeKey === e) {
      this.clearFilter();
      return;
    }
    this.state.activeKey = e, this.render(), t.field === "" ? this.config.onFilterSelect(null) : this.config.onFilterSelect(t);
  }
  clearFilter() {
    this.state.activeKey = null, this.render(), this.config.onFilterSelect(null);
  }
  updateCapabilities(e) {
    for (const t of e) this.state.capabilities.set(t.key, t);
    this.render();
  }
  setCapability(e, t, r) {
    this.state.capabilities.set(e, {
      key: e,
      supported: t,
      disabledReason: r
    }), this.render();
  }
  getActiveFilter() {
    return this.state.activeKey && this.config.filters.find((e) => e.key === this.state.activeKey) || null;
  }
  setActiveFilter(e) {
    this.state.activeKey = e, this.render();
  }
  destroy() {
    this.container && (this.container.innerHTML = ""), this.container = null;
  }
};
function Pi(e, t, r = {}) {
  return new Ri({
    container: e,
    filters: Dt,
    onFilterSelect: t,
    ...r
  });
}
function dl(e) {
  const t = document.querySelectorAll("[data-quick-filters]"), r = [];
  return t.forEach((s) => {
    if (s.hasAttribute("data-quick-filters-init")) return;
    const n = Pi(s, (i) => e(i, s), { size: s.dataset.size || "default" });
    s.setAttribute("data-quick-filters-init", "true"), r.push(n);
  }), r;
}
function ul(e = {}) {
  const { filters: t = Dt, activeKey: r = null, capabilities: s = [], size: n = "default", containerClass: i = "" } = e, a = n === "sm" ? "text-xs" : "text-sm", o = n === "sm" ? "px-2 py-1" : "px-3 py-1.5", l = /* @__PURE__ */ new Map();
  for (const c of s) l.set(c.key, c);
  return `<div class="quick-filters inline-flex items-center gap-1 flex-wrap ${i}">${t.map((c) => {
    const u = l.get(c.key), h = u?.supported !== !1, p = r === c.key, m = u?.disabledReason || "Filter not available", v = `inline-flex items-center gap-1 ${o} ${a} rounded-full font-medium`;
    let y;
    h ? p ? y = `${c.styleClass || "bg-blue-100 text-blue-700"} ring-2 ring-offset-1 ring-blue-500` : y = c.styleClass || "bg-gray-100 text-gray-700" : y = "bg-gray-100 text-gray-400 cursor-not-allowed opacity-60";
    const b = c.icon ? `<span>${c.icon}</span>` : "", x = h ? "" : `title="${f(m)}"`;
    return `<span class="${v} ${y}" ${x}>${b}<span>${d(c.label)}</span></span>`;
  }).join("")}</div>`;
}
var pe = "go-admin:translation-panel-expanded", Ti = class {
  constructor(e) {
    this.toggleButton = null, this.panelElement = null, this.expandAllButton = null, this.collapseAllButton = null, this.groupControls = null, this.viewModeButtons = [], this.expanded = !1, this.boundToggleHandler = null, this.config = {
      ...e,
      storageKey: e.storageKey || pe
    };
  }
  init() {
    if (this.toggleButton = document.getElementById(this.config.toggleButtonId), this.panelElement = document.getElementById(this.config.panelId), this.expandAllButton = this.config.expandAllBtnId ? document.getElementById(this.config.expandAllBtnId) : null, this.collapseAllButton = this.config.collapseAllBtnId ? document.getElementById(this.config.collapseAllBtnId) : null, this.groupControls = this.config.groupControlsId ? document.getElementById(this.config.groupControlsId) : null, this.viewModeButtons = Array.from(document.querySelectorAll(this.config.viewModeSelector)), !this.toggleButton || !this.panelElement) return;
    this.boundToggleHandler = (t) => {
      t.preventDefault(), this.toggle();
    }, this.toggleButton.addEventListener("click", this.boundToggleHandler);
    const e = this.getPersistedExpandedState();
    this.setExpanded(e, !1);
  }
  toggle() {
    this.setExpanded(!this.expanded, !0);
  }
  expand() {
    this.setExpanded(!0, !0);
  }
  collapse() {
    this.setExpanded(!1, !0);
  }
  isExpanded() {
    return this.expanded;
  }
  onViewModeChange(e) {
    const t = e === "grouped" || e === "matrix";
    this.groupControls ? this.groupControls.classList.toggle("hidden", !t) : (this.expandAllButton && this.expandAllButton.classList.toggle("hidden", !t), this.collapseAllButton && this.collapseAllButton.classList.toggle("hidden", !t)), this.dispatchViewModeEvent(e);
  }
  destroy() {
    this.toggleButton && this.boundToggleHandler && this.toggleButton.removeEventListener("click", this.boundToggleHandler), this.boundToggleHandler = null, this.toggleButton = null, this.panelElement = null, this.expandAllButton = null, this.collapseAllButton = null, this.groupControls = null, this.viewModeButtons = [];
  }
  setExpanded(e, t) {
    if (this.expanded = e, this.panelElement && this.panelElement.classList.toggle("hidden", !e), this.toggleButton) {
      this.toggleButton.setAttribute("aria-expanded", e ? "true" : "false"), this.toggleButton.classList.toggle("bg-blue-50", e), this.toggleButton.classList.toggle("border-blue-300", e), this.toggleButton.classList.toggle("text-blue-700", e), this.toggleButton.classList.toggle("bg-white", !e), this.toggleButton.classList.toggle("border-gray-200", !e), this.toggleButton.classList.toggle("text-gray-800", !e);
      const r = this.toggleButton.querySelector("[data-chevron]");
      r && r.classList.toggle("rotate-180", e);
    }
    t && this.persistExpandedState(e), this.dispatchToggleEvent(e);
  }
  getPersistedExpandedState() {
    if (typeof window > "u" || !window.localStorage) return !1;
    try {
      return window.localStorage.getItem(this.config.storageKey || pe) === "true";
    } catch {
      return !1;
    }
  }
  persistExpandedState(e) {
    if (!(typeof window > "u" || !window.localStorage))
      try {
        window.localStorage.setItem(this.config.storageKey || pe, e ? "true" : "false");
      } catch {
      }
  }
  dispatchToggleEvent(e) {
    !this.panelElement || typeof CustomEvent > "u" || this.panelElement.dispatchEvent(new CustomEvent("translation-panel:toggle", { detail: { expanded: e } }));
  }
  dispatchViewModeEvent(e) {
    !this.panelElement || typeof CustomEvent > "u" || this.panelElement.dispatchEvent(new CustomEvent("translation-panel:view-mode", { detail: {
      mode: e,
      buttonCount: this.viewModeButtons.length
    } }));
  }
};
function hl(e) {
  return new Ti(e);
}
async function Di(e, t, r = {}) {
  const { apiEndpoint: s, notifier: n = new O(), maxFailuresToShow: i = 5 } = e, a = `${s}/bulk/create-missing-translations`;
  try {
    const o = await C(a, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({
        ids: t,
        locales: r.locales
      })
    });
    if (!o.ok) throw new Error(await $e(o, `Request failed: ${o.status}`, { appendStatusToFallback: !1 }));
    const l = Mi(await o.json(), i);
    return Ii(l, n), e.onSuccess && e.onSuccess(l), l;
  } catch (o) {
    const l = o instanceof Error ? o : new Error(String(o));
    throw n.error(`Failed to create translations: ${l.message}`), e.onError && e.onError(l), l;
  }
}
function Mi(e, t) {
  const r = e.data || [], s = e.created_count ?? r.filter((a) => a.success).length, n = e.failed_count ?? r.filter((a) => !a.success).length, i = e.skipped_count ?? 0;
  return {
    total: e.total ?? r.length,
    created: s,
    failed: n,
    skipped: i,
    failures: r.filter((a) => !a.success && a.error).slice(0, t).map((a) => ({
      id: a.id,
      locale: a.locale,
      error: a.error || "Unknown error"
    }))
  };
}
function Ii(e, t) {
  const { created: r, failed: s, skipped: n, total: i } = e;
  if (i === 0) {
    t.info("No translations to create");
    return;
  }
  s === 0 ? r > 0 ? t.success(`Created ${r} translation${r !== 1 ? "s" : ""}${n > 0 ? ` (${n} skipped)` : ""}`) : n > 0 && t.info(`All ${n} translation${n !== 1 ? "s" : ""} already exist`) : r === 0 ? t.error(`Failed to create ${s} translation${s !== 1 ? "s" : ""}`) : t.warning(`Created ${r}, failed ${s}${n > 0 ? `, skipped ${n}` : ""}`);
}
function pl(e) {
  const { created: t, failed: r, skipped: s, total: n, failures: i } = e, a = `
    <div class="grid grid-cols-3 gap-4 mb-4">
      <div class="text-center p-3 bg-green-50 rounded">
        <div class="text-2xl font-bold text-green-700">${t}</div>
        <div class="text-sm text-green-600">Created</div>
      </div>
      <div class="text-center p-3 ${r > 0 ? "bg-red-50" : "bg-gray-50"} rounded">
        <div class="text-2xl font-bold ${r > 0 ? "text-red-700" : "text-gray-400"}">${r}</div>
        <div class="text-sm ${r > 0 ? "text-red-600" : "text-gray-500"}">Failed</div>
      </div>
      <div class="text-center p-3 ${s > 0 ? "bg-yellow-50" : "bg-gray-50"} rounded">
        <div class="text-2xl font-bold ${s > 0 ? "text-yellow-700" : "text-gray-400"}">${s}</div>
        <div class="text-sm ${s > 0 ? "text-yellow-600" : "text-gray-500"}">Skipped</div>
      </div>
    </div>
  `;
  let o = "";
  return i.length > 0 && (o = `
      <div class="mt-4">
        <h4 class="text-sm font-medium text-gray-700 mb-2">Failure Details</h4>
        <div class="border rounded overflow-hidden">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Locale</th>
                <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Error</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              ${i.map((l) => `
        <tr>
          <td class="px-3 py-2 text-sm text-gray-700">${d(l.id)}</td>
          <td class="px-3 py-2 text-sm text-gray-700">${d(l.locale)}</td>
          <td class="px-3 py-2 text-sm text-red-600">${d(l.error)}</td>
        </tr>
      `).join("")}
            </tbody>
          </table>
        </div>
        ${r > i.length ? `<p class="mt-2 text-sm text-gray-500">Showing ${i.length} of ${r} failures</p>` : ""}
      </div>
    `), `
    <div class="bulk-result-summary">
      <div class="mb-4 text-sm text-gray-600">
        Processed ${n} item${n !== 1 ? "s" : ""}
      </div>
      ${a}
      ${o}
    </div>
  `;
}
function fl(e) {
  const { created: t, failed: r, skipped: s } = e, n = [];
  return t > 0 && n.push(`<span class="text-green-600">+${t}</span>`), r > 0 && n.push(`<span class="text-red-600">${r} failed</span>`), s > 0 && n.push(`<span class="text-yellow-600">${s} skipped</span>`), n.join(" · ");
}
function ml(e, t, r) {
  return async (s) => Di({
    apiEndpoint: e,
    notifier: t,
    onSuccess: r
  }, s);
}
var Bi = {
  en: "English",
  es: "Spanish",
  fr: "French",
  de: "German",
  it: "Italian",
  pt: "Portuguese",
  ja: "Japanese",
  ko: "Korean",
  zh: "Chinese",
  ar: "Arabic",
  ru: "Russian",
  nl: "Dutch",
  pl: "Polish",
  sv: "Swedish",
  da: "Danish",
  no: "Norwegian",
  fi: "Finnish"
};
function E(e) {
  const t = e.toLowerCase();
  return Bi[t] || e.toUpperCase();
}
var le = class {
  constructor(e) {
    this.element = null, this.config = {
      size: "sm",
      mode: "chip",
      localeExists: !1,
      ...e
    }, this.state = {
      loading: !1,
      created: !1,
      error: null
    };
  }
  getContentChannel() {
    return String(this.config.channel ?? "").trim() || void 0;
  }
  render() {
    const { locale: e, size: t, mode: r, localeExists: s } = this.config, { loading: n, created: i, error: a } = this.state, o = E(e), l = t === "sm" ? "text-xs px-2 py-1" : "text-sm px-3 py-1.5", c = r === "button" ? "rounded-lg" : "rounded-full";
    let u, h = "";
    n ? (u = "bg-gray-100 text-gray-600 border-gray-300", h = this.renderSpinner()) : i ? (u = "bg-green-100 text-green-700 border-green-300", h = this.renderCheckIcon()) : a ? (u = "bg-red-100 text-red-700 border-red-300", h = this.renderErrorIcon()) : s ? u = "bg-blue-100 text-blue-700 border-blue-300" : u = "bg-amber-100 text-amber-700 border-amber-300";
    const p = this.renderActions();
    return `
      <div class="inline-flex items-center gap-1.5 ${l} ${c} border ${u}"
           data-locale-action="${d(e)}"
           data-locale-exists="${s}"
           data-loading="${n}"
           data-created="${i}"
           role="group"
           aria-label="${o} translation">
        ${h}
        <span class="font-medium uppercase tracking-wide" aria-hidden="true">${d(e)}</span>
        <span class="sr-only">${o}</span>
        ${p}
      </div>
    `;
  }
  renderActions() {
    const { locale: e, localeExists: t, size: r } = this.config, { loading: s, created: n } = this.state, i = r === "sm" ? "p-0.5" : "p-1", a = r === "sm" ? "w-3 h-3" : "w-4 h-4", o = [];
    if (!t && !n && !s && o.push(`
        <button type="button"
                class="inline-flex items-center justify-center ${i} rounded hover:bg-amber-200 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors"
                data-action="create"
                data-locale="${d(e)}"
                aria-label="Create ${E(e)} translation"
                title="Create ${E(e)} translation">
          <svg class="${a}" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
        </button>
      `), t || n) {
      const l = n ? "hover:bg-green-200" : "hover:bg-blue-200", c = n ? "focus:ring-green-500" : "focus:ring-blue-500";
      o.push(`
        <button type="button"
                class="inline-flex items-center justify-center ${i} rounded ${l} focus:outline-none focus:ring-1 ${c} transition-colors"
                data-action="open"
                data-locale="${d(e)}"
                aria-label="Open ${E(e)} translation"
                title="Open ${E(e)} translation">
          <svg class="${a}" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
          </svg>
        </button>
      `);
    }
    return o.join("");
  }
  mount(e) {
    e.innerHTML = this.render(), this.element = e.querySelector(`[data-locale-action="${this.config.locale}"]`), this.bindEvents();
  }
  bindEvents() {
    if (!this.element) return;
    const e = this.element.querySelector('[data-action="create"]'), t = this.element.querySelector('[data-action="open"]');
    e?.addEventListener("click", (r) => {
      r.preventDefault(), r.stopPropagation(), this.handleCreate();
    }), t?.addEventListener("click", (r) => {
      r.preventDefault(), r.stopPropagation(), this.handleOpen();
    });
  }
  async handleCreate() {
    if (!(this.state.loading || this.state.created)) {
      this.setState({
        loading: !0,
        error: null
      });
      try {
        const e = {
          id: this.config.recordId,
          locale: this.config.locale
        }, t = this.getContentChannel();
        t && (e.channel = t), this.config.panelName && (e.policy_entity = this.config.panelName);
        const r = `${this.config.apiEndpoint}/actions/create_translation`, s = await Ae(r, e);
        if (s.success) {
          const n = s.data?.id ? String(s.data.id) : void 0;
          this.setState({
            loading: !1,
            created: !0,
            newRecordId: n
          });
          const i = {
            id: n || this.config.recordId,
            locale: this.config.locale,
            status: String(s.data?.status || "draft"),
            familyId: s.data?.family_id ? String(s.data.family_id) : void 0
          };
          this.config.onCreateSuccess?.(this.config.locale, i);
        } else {
          const n = s.error?.message || "Failed to create translation";
          this.setState({
            loading: !1,
            error: n
          }), this.config.onError?.(this.config.locale, n);
        }
      } catch (e) {
        const t = e instanceof Error ? e.message : "Failed to create translation";
        this.setState({
          loading: !1,
          error: t
        }), this.config.onError?.(this.config.locale, t);
      }
    }
  }
  handleOpen() {
    const { locale: e, navigationBasePath: t, recordId: r } = this.config, { newRecordId: s } = this.state, n = s || r, i = new URLSearchParams();
    i.set("locale", e);
    const a = this.getContentChannel();
    a && i.set("channel", a);
    const o = `${t}/${n}/edit?${i.toString()}`;
    this.config.onOpen?.(e, o), window.location.href = o;
  }
  setState(e) {
    if (this.state = {
      ...this.state,
      ...e
    }, this.element) {
      const t = this.element.parentElement;
      t && this.mount(t);
    }
  }
  renderSpinner() {
    return `
      <svg class="${this.config.size === "sm" ? "w-3 h-3" : "w-4 h-4"} animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
      </svg>
    `;
  }
  renderCheckIcon() {
    return `
      <svg class="${this.config.size === "sm" ? "w-3 h-3" : "w-4 h-4"}" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
      </svg>
    `;
  }
  renderErrorIcon() {
    return `
      <svg class="${this.config.size === "sm" ? "w-3 h-3" : "w-4 h-4"}" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
      </svg>
    `;
  }
  getState() {
    return { ...this.state };
  }
};
function Mt(e) {
  return new le(e).render();
}
function gl(e, t) {
  return e.length === 0 ? "" : `
    <div class="flex flex-wrap items-center gap-2" role="list" aria-label="Missing translations">
      ${e.map((r) => Mt({
    ...t,
    locale: r
  })).join("")}
    </div>
  `;
}
function bl(e, t) {
  const r = /* @__PURE__ */ new Map();
  return e.querySelectorAll("[data-locale-action]").forEach((s) => {
    const n = s.getAttribute("data-locale-action");
    if (!n) return;
    const i = s.getAttribute("data-locale-exists") === "true", a = {
      ...t,
      locale: n,
      localeExists: i
    }, o = new le(a), l = s.parentElement;
    l && (o.mount(l), r.set(n, o));
  }), r;
}
function Ye(e, t, r, s) {
  const n = new URLSearchParams();
  n.set("locale", r);
  const i = String(s ?? "").trim();
  return i && n.set("channel", i), `${e}/${t}/edit?${n.toString()}`;
}
var Me = class {
  constructor(e) {
    this.element = null, this.localeChip = null, this.config = {
      showFormLockMessage: !0,
      ...e
    };
  }
  isInFallbackMode() {
    const { context: e } = this.config;
    return e.fallbackUsed || e.missingRequestedLocale;
  }
  getFormLockState() {
    const { context: e } = this.config;
    return this.isInFallbackMode() ? {
      locked: !0,
      reason: this.config.formLockMessage || `The ${e.requestedLocale?.toUpperCase() || "requested"} translation doesn't exist. Create it to enable editing.`,
      missingLocale: e.requestedLocale,
      fallbackLocale: e.resolvedLocale
    } : {
      locked: !1,
      reason: null,
      missingLocale: null,
      fallbackLocale: null
    };
  }
  render() {
    if (!this.isInFallbackMode()) return "";
    const { context: e, showFormLockMessage: t } = this.config, r = e.requestedLocale || "requested", s = e.resolvedLocale || "default", n = E(r), i = E(s), a = this.renderPrimaryCta(), o = this.renderSecondaryCta(), l = t ? this.renderFormLockMessage() : "";
    return `
      <div class="fallback-banner bg-amber-50 border border-amber-200 rounded-lg shadow-sm"
           role="alert"
           aria-live="polite"
           data-fallback-banner="true"
           data-requested-locale="${d(r)}"
           data-resolved-locale="${d(s)}">
        <div class="p-4">
          <div class="flex items-start gap-3">
            <!-- Warning Icon -->
            <div class="flex-shrink-0 mt-0.5">
              <svg class="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
              </svg>
            </div>

            <!-- Content -->
            <div class="flex-1 min-w-0">
              <h3 class="text-sm font-semibold text-amber-800">
                Viewing fallback content
              </h3>
              <p class="mt-1 text-sm text-amber-700">
                The <strong class="font-medium">${d(n)}</strong> (${d(r.toUpperCase())})
                translation doesn't exist yet. You're viewing content from
                <strong class="font-medium">${d(i)}</strong> (${d(s.toUpperCase())}).
              </p>

              ${l}

              <!-- Actions -->
              <div class="mt-4 flex flex-wrap items-center gap-3">
                ${a}
                ${o}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
  renderPrimaryCta() {
    const { context: e, apiEndpoint: t, navigationBasePath: r, panelName: s, channel: n } = this.config, i = e.requestedLocale, a = String(n ?? "").trim();
    return !i || !e.recordId ? "" : `
      <button type="button"
              class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-colors"
              data-action="create-translation"
              data-locale="${d(i)}"
              data-record-id="${d(e.recordId)}"
              data-api-endpoint="${d(t)}"
              data-panel="${d(s || "")}"
              data-channel="${d(a)}"
              aria-label="Create ${E(i)} translation">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
        </svg>
        Create ${d(i.toUpperCase())} translation
      </button>
    `;
  }
  renderSecondaryCta() {
    const { context: e, navigationBasePath: t, channel: r } = this.config, s = e.resolvedLocale;
    if (!s || !e.recordId) return "";
    const n = Ye(t, e.recordId, s, r);
    return `
      <a href="${d(n)}"
         class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-amber-700 bg-white border border-amber-300 rounded-lg hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-colors"
         data-action="open-source"
         data-locale="${d(s)}"
         aria-label="Open ${E(s)} translation">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
        </svg>
        Open ${d(s.toUpperCase())} (source)
      </a>
    `;
  }
  renderFormLockMessage() {
    return `
      <p class="mt-2 text-sm text-amber-600 flex items-center gap-1.5">
        <svg class="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"/>
        </svg>
        <span>Editing is disabled until you create the missing translation.</span>
      </p>
    `;
  }
  mount(e) {
    e.innerHTML = this.render(), this.element = e.querySelector("[data-fallback-banner]"), this.bindEvents();
  }
  bindEvents() {
    if (!this.element) return;
    const e = this.element.querySelector('[data-action="create-translation"]'), t = this.element.querySelector('[data-action="open-source"]');
    e?.addEventListener("click", async (r) => {
      r.preventDefault(), await this.handleCreate();
    }), t?.addEventListener("click", (r) => {
      const s = t.getAttribute("data-locale"), n = t.getAttribute("href");
      s && n && this.config.onOpenSource?.(s, n);
    });
  }
  async handleCreate() {
    const { context: e, apiEndpoint: t, panelName: r, channel: s, navigationBasePath: n } = this.config, i = e.requestedLocale, a = e.recordId, o = String(s ?? "").trim() || void 0;
    !i || !a || await new le({
      locale: i,
      recordId: a,
      apiEndpoint: t,
      navigationBasePath: n,
      panelName: r,
      channel: o,
      localeExists: !1,
      onCreateSuccess: (l, c) => {
        this.config.onCreateSuccess?.(l, c);
        const u = Ye(n, c.id, l, o);
        window.location.href = u;
      },
      onError: (l, c) => {
        this.config.onError?.(c);
      }
    }).handleCreate();
  }
};
function Fi(e, t) {
  if (!t.locked) {
    qi(e);
    return;
  }
  if (e.classList.add("form-locked", "pointer-events-none", "opacity-75"), e.setAttribute("data-form-locked", "true"), e.setAttribute("data-lock-reason", t.reason || ""), e.querySelectorAll('input, textarea, select, button[type="submit"]').forEach((r) => {
    r.setAttribute("disabled", "true"), r.setAttribute("data-was-enabled", "true"), r.setAttribute("aria-disabled", "true");
  }), !e.querySelector("[data-form-lock-overlay]")) {
    const r = document.createElement("div");
    r.setAttribute("data-form-lock-overlay", "true"), r.className = "absolute inset-0 bg-amber-50/30 cursor-not-allowed z-10", r.setAttribute("title", t.reason || "Form is locked"), window.getComputedStyle(e).position === "static" && (e.style.position = "relative"), e.appendChild(r);
  }
}
function qi(e) {
  e.classList.remove("form-locked", "pointer-events-none", "opacity-75"), e.removeAttribute("data-form-locked"), e.removeAttribute("data-lock-reason"), e.querySelectorAll('[data-was-enabled="true"]').forEach((t) => {
    t.removeAttribute("disabled"), t.removeAttribute("data-was-enabled"), t.removeAttribute("aria-disabled");
  }), e.querySelector("[data-form-lock-overlay]")?.remove();
}
function yl(e) {
  return e.getAttribute("data-form-locked") === "true";
}
function vl(e) {
  return e.getAttribute("data-lock-reason");
}
function wl(e, t) {
  const r = _(e);
  return new Me({
    ...t,
    context: r
  }).render();
}
function xl(e) {
  const t = _(e);
  return t.fallbackUsed || t.missingRequestedLocale;
}
function Sl(e, t) {
  const r = new Me(t);
  return r.mount(e), r;
}
function Cl(e, t) {
  const r = _(t), s = new Me({
    context: r,
    apiEndpoint: "",
    navigationBasePath: ""
  }).getFormLockState();
  return Fi(e, s), s;
}
var It = class {
  constructor(e, t) {
    this.chips = /* @__PURE__ */ new Map(), this.element = null, this.config = {
      maxChips: 3,
      size: "sm",
      ...t
    }, this.readiness = A(e), this.actionState = this.extractActionState(e, "create_translation");
  }
  extractActionState(e, t) {
    return lt(e, t);
  }
  isCreateActionEnabled() {
    return this.actionState ? this.actionState.enabled : !0;
  }
  getDisabledReason() {
    if (this.isCreateActionEnabled()) return null;
    if (this.actionState?.reason) return this.actionState.reason;
    const e = st({ reason_code: this.actionState?.reason_code });
    if (e?.message) return e.message;
    const t = String(this.actionState?.reason_code || "").trim().toLowerCase();
    return t === "workflow_transition_not_available" ? "Translation creation is not available in the current workflow state." : t === "permission_denied" ? "You do not have permission to create translations." : "Translation creation is currently unavailable.";
  }
  getMissingLocales() {
    return this.readiness.hasReadinessMetadata ? this.readiness.missingRequiredLocales.slice(0, this.config.maxChips) : [];
  }
  getOverflowCount() {
    if (!this.readiness.hasReadinessMetadata) return 0;
    const e = this.readiness.missingRequiredLocales.length;
    return Math.max(0, e - (this.config.maxChips || 3));
  }
  render() {
    const e = this.getMissingLocales();
    if (e.length === 0) return "";
    const t = this.isCreateActionEnabled(), r = this.getDisabledReason(), s = this.getOverflowCount(), n = e.map((a) => this.renderChip(a, t, r)).join(""), i = s > 0 ? this.renderOverflow(s) : "";
    return `
      <div class="${t ? "inline-flex items-center gap-1.5 flex-wrap" : "inline-flex items-center gap-1.5 flex-wrap opacity-60"}"
           data-inline-locale-chips="true"
           data-record-id="${d(this.config.recordId)}"
           data-action-enabled="${t}"
           role="list"
           aria-label="Missing translations">
        ${n}${i}
      </div>
    `;
  }
  renderChip(e, t, r) {
    const { recordId: s, apiEndpoint: n, navigationBasePath: i, panelName: a, channel: o, size: l } = this.config, c = String(o ?? "").trim() || void 0;
    return t ? Mt({
      locale: e,
      recordId: s,
      apiEndpoint: n,
      navigationBasePath: i,
      panelName: a,
      channel: c,
      localeExists: !1,
      size: l,
      mode: "chip",
      onCreateSuccess: this.config.onCreateSuccess,
      onError: this.config.onError
    }) : this.renderDisabledChip(e, r, l);
  }
  renderDisabledChip(e, t, r) {
    const s = r === "md" ? "text-sm px-3 py-1.5" : "text-xs px-2 py-1", n = t || "Translation creation unavailable", i = E(e);
    return `
      <div class="inline-flex items-center gap-1 ${s} rounded-full border border-gray-300 bg-gray-100 text-gray-500 cursor-not-allowed"
           data-locale="${d(e)}"
           data-disabled="true"
           title="${d(n)}"
           role="listitem"
           aria-label="${i} translation (unavailable)">
        <svg class="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"/>
        </svg>
        <span class="font-medium uppercase tracking-wide">${d(e)}</span>
      </div>
    `;
  }
  renderOverflow(e) {
    const { size: t } = this.config, r = t === "md" ? "text-sm px-2 py-1" : "text-xs px-1.5 py-0.5", s = this.readiness.missingRequiredLocales.join(", ").toUpperCase();
    return `
      <span class="${r} rounded text-gray-500 font-medium"
            title="Also missing: ${d(s)}"
            aria-label="${e} more missing translations">
        +${e}
      </span>
    `;
  }
  mount(e) {
    e.innerHTML = this.render(), this.element = e.querySelector("[data-inline-locale-chips]"), this.bindEvents();
  }
  bindEvents() {
    !this.element || !this.isCreateActionEnabled() || this.element.querySelectorAll("[data-locale-action]").forEach((e) => {
      const t = e.getAttribute("data-locale-action");
      if (!t) return;
      const r = new le({
        locale: t,
        recordId: this.config.recordId,
        apiEndpoint: this.config.apiEndpoint,
        navigationBasePath: this.config.navigationBasePath,
        panelName: this.config.panelName,
        channel: String(this.config.channel ?? "").trim() || void 0,
        localeExists: !1,
        size: this.config.size,
        onCreateSuccess: this.config.onCreateSuccess,
        onError: this.config.onError
      });
      this.chips.set(t, r), e.querySelector('[data-action="create"]')?.addEventListener("click", async (s) => {
        s.preventDefault(), s.stopPropagation(), await r.handleCreate();
      }), e.querySelector('[data-action="open"]')?.addEventListener("click", (s) => {
        s.preventDefault(), s.stopPropagation(), r.handleOpen();
      });
    });
  }
  getChip(e) {
    return this.chips.get(e);
  }
};
function Oi(e, t) {
  const r = String(e.id || "");
  return r ? new It(e, {
    ...t,
    recordId: r
  }).render() : "";
}
function $l(e) {
  const t = A(e);
  return t.hasReadinessMetadata && t.missingRequiredLocales.length > 0;
}
function Al(e, t, r) {
  const s = String(t.id || ""), n = new It(t, {
    ...r,
    recordId: s
  });
  return n.mount(e), n;
}
function El(e) {
  return (t, r, s) => Oi(r, e);
}
function ce() {
  return typeof navigator > "u" ? !1 : /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent);
}
function ji() {
  return ce() ? "⌘" : "Ctrl";
}
function Ni(e) {
  if (ce()) switch (e) {
    case "ctrl":
      return "⌃";
    case "alt":
      return "⌥";
    case "shift":
      return "⇧";
    case "meta":
      return "⌘";
  }
  switch (e) {
    case "ctrl":
      return "Ctrl";
    case "alt":
      return "Alt";
    case "shift":
      return "Shift";
    case "meta":
      return "Win";
  }
}
function Bt(e) {
  const t = e.modifiers.map(Ni), r = zi(e.key);
  return ce() ? [...t, r].join("") : [...t, r].join("+");
}
function zi(e) {
  return {
    Enter: "↵",
    Escape: "Esc",
    ArrowUp: "↑",
    ArrowDown: "↓",
    ArrowLeft: "←",
    ArrowRight: "→",
    " ": "Space",
    "[": "[",
    "]": "]"
  }[e] || e.toUpperCase();
}
var Ft = class {
  constructor(e = {}) {
    this.shortcuts = /* @__PURE__ */ new Map(), this.keydownHandler = null, this.boundElement = null, this.config = {
      enabled: !0,
      context: "global",
      ...e
    };
  }
  register(e, t = {}) {
    const { override: r = !1 } = t;
    if (this.shortcuts.has(e.id) && !r) {
      console.warn(`[KeyboardShortcuts] Shortcut "${e.id}" already registered`);
      return;
    }
    this.shortcuts.set(e.id, {
      enabled: !0,
      context: "global",
      preventDefault: !0,
      allowInInput: !1,
      ...e
    });
  }
  unregister(e) {
    return this.shortcuts.delete(e);
  }
  setEnabled(e, t) {
    const r = this.shortcuts.get(e);
    r && (r.enabled = t);
  }
  setContext(e) {
    this.config.context = e;
  }
  getContext() {
    return this.config.context || "global";
  }
  getShortcuts() {
    return Array.from(this.shortcuts.values());
  }
  getShortcutsByCategory(e) {
    return this.getShortcuts().filter((t) => t.category === e);
  }
  getShortcutsGroupedByCategory() {
    const e = /* @__PURE__ */ new Map();
    for (const t of this.shortcuts.values()) {
      const r = e.get(t.category) || [];
      r.push(t), e.set(t.category, r);
    }
    return e;
  }
  bind(e = document) {
    this.keydownHandler && this.unbind(), this.keydownHandler = (t) => {
      this.handleKeydown(t);
    }, this.boundElement = e, e.addEventListener("keydown", this.keydownHandler);
  }
  unbind() {
    this.keydownHandler && this.boundElement && (this.boundElement.removeEventListener("keydown", this.keydownHandler), this.keydownHandler = null, this.boundElement = null);
  }
  handleKeydown(e) {
    if (!this.config.enabled) return;
    if (e.key === "?" && !e.ctrlKey && !e.altKey && !e.metaKey && !this.isInputFocused(e)) {
      e.preventDefault(), this.config.onHelpRequested?.();
      return;
    }
    const t = this.findMatchingShortcut(e);
    if (t && t.enabled && !(t.context !== "global" && t.context !== this.config.context) && !(!t.allowInInput && this.isInputFocused(e))) {
      t.preventDefault && e.preventDefault(), this.config.onShortcutTriggered?.(t);
      try {
        const r = t.handler(e);
        r instanceof Promise && r.catch((s) => {
          console.error(`[KeyboardShortcuts] Handler error for "${t.id}":`, s);
        });
      } catch (r) {
        console.error(`[KeyboardShortcuts] Handler error for "${t.id}":`, r);
      }
    }
  }
  findMatchingShortcut(e) {
    for (const t of this.shortcuts.values()) if (this.matchesEvent(t, e)) return t;
    return null;
  }
  matchesEvent(e, t) {
    const r = t.key.toLowerCase(), s = e.key.toLowerCase();
    if (r !== s && t.code.toLowerCase() !== s) return !1;
    const n = ce(), i = new Set(e.modifiers), a = i.has("ctrl"), o = i.has("meta"), l = i.has("alt"), c = i.has("shift");
    return !(a && !(n ? t.metaKey : t.ctrlKey) || o && !n && !t.metaKey || l && !t.altKey || c && !t.shiftKey || !a && !o && (n ? t.metaKey : t.ctrlKey) || !l && t.altKey || !c && t.shiftKey);
  }
  isInputFocused(e) {
    const t = e.target;
    if (!t) return !1;
    const r = t.tagName.toLowerCase();
    return !!(r === "input" || r === "textarea" || r === "select" || t.isContentEditable);
  }
  destroy() {
    this.unbind(), this.shortcuts.clear();
  }
};
function Gi(e) {
  const t = [];
  return e.onSave && t.push({
    id: "save",
    description: "Save changes",
    category: "save",
    key: "s",
    modifiers: ["ctrl"],
    handler: e.onSave,
    context: "form"
  }), e.onPublish && t.push({
    id: "publish",
    description: "Publish content",
    category: "actions",
    key: "p",
    modifiers: ["ctrl", "shift"],
    handler: e.onPublish,
    context: "form"
  }), e.onLocalePicker && t.push({
    id: "locale-picker",
    description: "Open locale picker",
    category: "locale",
    key: "l",
    modifiers: ["ctrl", "shift"],
    handler: e.onLocalePicker
  }), e.onPrevLocale && t.push({
    id: "prev-locale",
    description: "Switch to previous locale",
    category: "locale",
    key: "[",
    modifiers: ["ctrl"],
    handler: e.onPrevLocale
  }), e.onNextLocale && t.push({
    id: "next-locale",
    description: "Switch to next locale",
    category: "locale",
    key: "]",
    modifiers: ["ctrl"],
    handler: e.onNextLocale
  }), e.onCreateTranslation && t.push({
    id: "create-translation",
    description: "Create new translation",
    category: "actions",
    key: "t",
    modifiers: ["ctrl", "shift"],
    handler: e.onCreateTranslation
  }), t;
}
function kl(e) {
  const t = /* @__PURE__ */ new Map();
  for (const i of e) {
    if (i.enabled === !1) continue;
    const a = t.get(i.category) || [];
    a.push(i), t.set(i.category, a);
  }
  const r = {
    save: "Save & Submit",
    navigation: "Navigation",
    locale: "Locale Switching",
    actions: "Actions",
    help: "Help",
    other: "Other"
  }, s = [
    "save",
    "locale",
    "navigation",
    "actions",
    "help",
    "other"
  ];
  let n = `
    <div class="shortcuts-help" role="document">
      <div class="text-sm text-gray-500 mb-4">
        Press <kbd class="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs font-mono">?</kbd> to show this help anytime
      </div>
  `;
  for (const i of s) {
    const a = t.get(i);
    if (!(!a || a.length === 0)) {
      n += `
      <div class="mb-4">
        <h4 class="text-sm font-medium text-gray-700 mb-2">${r[i]}</h4>
        <dl class="space-y-1">
    `;
      for (const o of a) {
        const l = Bt(o);
        n += `
          <div class="flex justify-between items-center py-1">
            <dt class="text-sm text-gray-600">${d(o.description)}</dt>
            <dd class="flex-shrink-0 ml-4">
              <kbd class="px-2 py-1 bg-gray-100 border border-gray-200 rounded text-xs font-mono text-gray-700">${d(l)}</kbd>
            </dd>
          </div>
      `;
      }
      n += `
        </dl>
      </div>
    `;
    }
  }
  return n += "</div>", n;
}
var qt = "admin_keyboard_shortcuts_settings", Ot = "admin_keyboard_shortcuts_hint_dismissed", te = {
  enabled: !0,
  shortcuts: {},
  updatedAt: (/* @__PURE__ */ new Date()).toISOString()
};
function de() {
  return typeof localStorage > "u" || !localStorage || typeof localStorage.getItem != "function" || typeof localStorage.setItem != "function" ? null : localStorage;
}
function Ui() {
  const e = de();
  if (!e) return { ...te };
  try {
    const t = e.getItem(qt);
    if (!t) return { ...te };
    const r = JSON.parse(t);
    return {
      enabled: typeof r.enabled == "boolean" ? r.enabled : !0,
      shortcuts: typeof r.shortcuts == "object" && r.shortcuts !== null ? r.shortcuts : {},
      updatedAt: typeof r.updatedAt == "string" ? r.updatedAt : (/* @__PURE__ */ new Date()).toISOString()
    };
  } catch {
    return { ...te };
  }
}
function Ll(e) {
  const t = de();
  if (t)
    try {
      const r = {
        ...e,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      t.setItem(qt, JSON.stringify(r));
    } catch {
    }
}
function Hi() {
  const e = de();
  return e ? e.getItem(Ot) === "true" : !1;
}
function Vi() {
  const e = de();
  if (e)
    try {
      e.setItem(Ot, "true");
    } catch {
    }
}
function Ki(e) {
  if (Hi()) return null;
  const { container: t, position: r = "bottom", onDismiss: s, onShowHelp: n, autoDismissMs: i = 1e4 } = e, a = document.createElement("div");
  a.className = `shortcuts-discovery-hint fixed ${r === "top" ? "top-4" : "bottom-4"} right-4 z-50 animate-fade-in`, a.setAttribute("role", "alert"), a.setAttribute("aria-live", "polite"), a.innerHTML = `
    <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 max-w-sm">
      <div class="flex items-start gap-3">
        <div class="flex-shrink-0">
          <svg class="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-gray-900 dark:text-white">
            Keyboard shortcuts available
          </p>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Press <kbd class="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-xs font-mono">?</kbd>
            to view all shortcuts, or use <kbd class="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-xs font-mono">${ji()}+S</kbd> to save.
          </p>
          <div class="mt-3 flex items-center gap-2">
            <button type="button" data-hint-action="show-help"
                    class="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 focus:outline-none focus:underline">
              View shortcuts
            </button>
            <span class="text-gray-300 dark:text-gray-600" aria-hidden="true">|</span>
            <button type="button" data-hint-action="dismiss"
                    class="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none focus:underline">
              Don't show again
            </button>
          </div>
        </div>
        <button type="button" data-hint-action="close" aria-label="Close hint"
                class="flex-shrink-0 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
    </div>
  `;
  const o = (l) => {
    l && Vi(), a.remove(), s?.();
  };
  return a.querySelector('[data-hint-action="show-help"]')?.addEventListener("click", () => {
    o(!0), n?.();
  }), a.querySelector('[data-hint-action="dismiss"]')?.addEventListener("click", () => {
    o(!0);
  }), a.querySelector('[data-hint-action="close"]')?.addEventListener("click", () => {
    o(!1);
  }), i > 0 && setTimeout(() => {
    a.parentElement && o(!1);
  }, i), t.appendChild(a), a;
}
function _l(e) {
  const { container: t, shortcuts: r, settings: s, onSettingsChange: n } = e, i = {
    save: "Save & Submit",
    navigation: "Navigation",
    locale: "Locale Switching",
    actions: "Actions",
    help: "Help",
    other: "Other"
  }, a = /* @__PURE__ */ new Map();
  for (const c of r) {
    const u = a.get(c.category) || [];
    u.push(c), a.set(c.category, u);
  }
  const o = [
    "save",
    "locale",
    "navigation",
    "actions",
    "help",
    "other"
  ];
  let l = `
    <div class="shortcuts-settings space-y-6">
      <!-- Global toggle -->
      <div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div>
          <label for="shortcuts-global-toggle" class="text-sm font-medium text-gray-900 dark:text-white">
            Enable keyboard shortcuts
          </label>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Turn off to disable all keyboard shortcuts
          </p>
        </div>
        <button type="button"
                id="shortcuts-global-toggle"
                role="switch"
                aria-checked="${s.enabled}"
                data-settings-action="toggle-global"
                class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${s.enabled ? "bg-blue-600" : "bg-gray-200 dark:bg-gray-600"}">
          <span class="sr-only">Enable keyboard shortcuts</span>
          <span aria-hidden="true"
                class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${s.enabled ? "translate-x-5" : "translate-x-0"}"></span>
        </button>
      </div>

      <!-- Per-shortcut toggles -->
      <div class="${s.enabled ? "" : "opacity-50 pointer-events-none"}" data-shortcuts-list>
  `;
  for (const c of o) {
    const u = a.get(c);
    if (!(!u || u.length === 0)) {
      l += `
      <div class="space-y-2">
        <h4 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          ${i[c]}
        </h4>
        <div class="space-y-1">
    `;
      for (const h of u) {
        const p = s.shortcuts[h.id] !== !1, m = Bt(h);
        l += `
        <div class="flex items-center justify-between py-2 px-3 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50">
          <div class="flex items-center gap-3">
            <kbd class="px-2 py-1 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-xs font-mono text-gray-700 dark:text-gray-300">
              ${d(m)}
            </kbd>
            <span class="text-sm text-gray-700 dark:text-gray-300">${d(h.description)}</span>
          </div>
          <input type="checkbox"
                 id="shortcut-${d(h.id)}"
                 data-settings-action="toggle-shortcut"
                 data-shortcut-id="${d(h.id)}"
                 ${p ? "checked" : ""}
                 class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                 aria-label="Enable ${d(h.description)} shortcut">
        </div>
      `;
      }
      l += `
        </div>
      </div>
    `;
    }
  }
  l += `
      </div>

      <!-- Reset button -->
      <div class="pt-4 border-t border-gray-200 dark:border-gray-700">
        <button type="button"
                data-settings-action="reset"
                class="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none focus:underline">
          Reset to defaults
        </button>
      </div>
    </div>
  `, t.innerHTML = l, t.querySelector('[data-settings-action="toggle-global"]')?.addEventListener("click", () => {
    const c = {
      ...s,
      enabled: !s.enabled
    };
    n(c);
  }), t.querySelectorAll('[data-settings-action="toggle-shortcut"]').forEach((c) => {
    c.addEventListener("change", () => {
      const u = c.getAttribute("data-shortcut-id");
      if (!u) return;
      const h = {
        ...s,
        shortcuts: {
          ...s.shortcuts,
          [u]: c.checked
        }
      };
      n(h);
    });
  }), t.querySelector('[data-settings-action="reset"]')?.addEventListener("click", () => {
    n({ ...te });
  });
}
function Ji(e, t) {
  const r = e;
  r.config && (r.config.enabled = t.enabled);
  for (const s of e.getShortcuts()) {
    const n = t.shortcuts[s.id] !== !1;
    e.setEnabled(s.id, n);
  }
}
var fe = null;
function Rl() {
  return fe || (fe = new Ft()), fe;
}
function Qi(e, t) {
  const r = Ui(), s = new Ft({
    ...t,
    enabled: r.enabled
  }), n = Gi(e);
  for (const i of n) s.register(i);
  return Ji(s, r), s.bind(), s;
}
function Pl(e, t) {
  const r = Qi(e, t);
  return t.hintContainer && Ki({
    container: t.hintContainer,
    onShowHelp: t.onShowHelp,
    onDismiss: () => {
    }
  }), r;
}
var Yi = 1500, Wi = 2e3, Ie = "autosave", H = {
  idle: "",
  saving: "Saving...",
  saved: "Saved",
  error: "Save failed",
  conflict: "Conflict detected"
}, Xi = {
  title: "Save Conflict",
  message: "This content was modified by someone else. Choose how to proceed:",
  useServer: "Use server version",
  forceSave: "Overwrite with my changes",
  viewDiff: "View differences",
  dismiss: "Dismiss"
}, jt = class {
  constructor(e = {}) {
    this.state = "idle", this.conflictInfo = null, this.pendingData = null, this.lastError = null, this.debounceTimer = null, this.savedTimer = null, this.listeners = [], this.isDirty = !1, this.config = {
      container: e.container,
      onSave: e.onSave,
      debounceMs: e.debounceMs ?? Yi,
      savedDurationMs: e.savedDurationMs ?? Wi,
      notifier: e.notifier,
      showToasts: e.showToasts ?? !1,
      classPrefix: e.classPrefix ?? Ie,
      labels: {
        ...H,
        ...e.labels
      },
      enableConflictDetection: e.enableConflictDetection ?? !1,
      onConflictResolve: e.onConflictResolve,
      fetchServerState: e.fetchServerState,
      allowForceSave: e.allowForceSave ?? !0,
      conflictLabels: {
        ...Xi,
        ...e.conflictLabels
      }
    };
  }
  getState() {
    return this.state;
  }
  hasPendingChanges() {
    return this.isDirty || this.pendingData !== null;
  }
  getLastError() {
    return this.lastError;
  }
  markDirty(e) {
    this.isDirty = !0, this.pendingData = e, this.lastError = null, this.cancelDebounce(), this.config.onSave && (this.debounceTimer = setTimeout(() => {
      this.save();
    }, this.config.debounceMs)), (this.state === "saved" || this.state === "idle") && this.cancelSavedTimer(), this.render();
  }
  markClean() {
    this.isDirty = !1, this.pendingData = null, this.cancelDebounce(), this.setState("idle");
  }
  async save() {
    if (!this.config.onSave || !this.isDirty && this.pendingData === null) return !0;
    this.cancelDebounce();
    const e = this.pendingData;
    this.setState("saving");
    try {
      return await this.config.onSave(e), this.isDirty = !1, this.pendingData = null, this.lastError = null, this.conflictInfo = null, this.setState("saved"), this.savedTimer = setTimeout(() => {
        this.state === "saved" && this.setState("idle");
      }, this.config.savedDurationMs), !0;
    } catch (t) {
      return this.lastError = t instanceof Error ? t : new Error(String(t)), this.config.enableConflictDetection && this.isConflictError(t) ? (this.conflictInfo = this.extractConflictInfo(t), this.setState("conflict"), !1) : (this.setState("error"), !1);
    }
  }
  async retry() {
    return this.state !== "error" && this.state !== "conflict" ? !0 : (this.conflictInfo = null, this.save());
  }
  getConflictInfo() {
    return this.conflictInfo;
  }
  isInConflict() {
    return this.state === "conflict" && this.conflictInfo !== null;
  }
  async resolveWithServerVersion() {
    if (!this.isInConflict() || !this.conflictInfo) return;
    const e = this.conflictInfo;
    let t = e.latestServerState;
    if (!t && e.latestStatePath && this.config.fetchServerState) try {
      t = await this.config.fetchServerState(e.latestStatePath);
    } catch {
      this.lastError = /* @__PURE__ */ new Error("Failed to fetch server version"), this.setState("error");
      return;
    }
    const r = {
      action: "use_server",
      serverState: t,
      localData: this.pendingData,
      conflict: e
    };
    if (this.isDirty = !1, this.pendingData = null, this.conflictInfo = null, this.setState("idle"), this.config.onConflictResolve) try {
      await this.config.onConflictResolve(r);
    } catch {
    }
  }
  async resolveWithForceSave() {
    if (!this.isInConflict() || !this.conflictInfo) return !0;
    if (!this.config.allowForceSave) return !1;
    const e = this.conflictInfo, t = {
      action: "force_save",
      localData: this.pendingData,
      conflict: e
    };
    if (this.config.onConflictResolve) try {
      await this.config.onConflictResolve(t);
    } catch {
    }
    return this.conflictInfo = null, this.save();
  }
  dismissConflict() {
    if (!this.isInConflict() || !this.conflictInfo) return;
    const e = this.conflictInfo, t = {
      action: "dismiss",
      localData: this.pendingData,
      conflict: e
    };
    if (this.conflictInfo = null, this.setState("idle"), this.config.onConflictResolve) try {
      this.config.onConflictResolve(t);
    } catch {
    }
  }
  isConflictError(e) {
    if (!e) return !1;
    const t = e;
    return !!(t.code === "AUTOSAVE_CONFLICT" || t.text_code === "AUTOSAVE_CONFLICT" || t.name === "AutosaveConflictError" || (e instanceof Error ? e.message : String(e)).toLowerCase().includes("autosave conflict"));
  }
  extractConflictInfo(e) {
    const t = e, r = t.metadata;
    return r ? {
      version: r.version || "",
      expectedVersion: r.expected_version || "",
      latestStatePath: r.latest_state_path,
      latestServerState: r.latest_server_state,
      entityId: r.entity_id,
      panel: r.panel
    } : {
      version: t.version || "",
      expectedVersion: t.expectedVersion || "",
      latestStatePath: t.latestStatePath,
      latestServerState: t.latestServerState,
      entityId: t.entityId,
      panel: t.panel
    };
  }
  onStateChange(e) {
    return this.listeners.push(e), () => {
      const t = this.listeners.indexOf(e);
      t >= 0 && this.listeners.splice(t, 1);
    };
  }
  renderIndicator() {
    const e = this.config.classPrefix, t = this.config.labels, r = `${e}--${this.state}`, s = t[this.state] || "", n = this.getStateIcon();
    return this.state === "conflict" ? this.renderConflictUI() : `<div class="${e} ${r}" role="status" aria-live="polite" aria-atomic="true">
      <span class="${e}__icon">${n}</span>
      <span class="${e}__label">${s}</span>
      ${this.state === "error" ? `<button type="button" class="${e}__retry" aria-label="Retry save">Retry</button>` : ""}
    </div>`;
  }
  renderConflictUI() {
    const e = this.config.classPrefix, t = this.config.conflictLabels;
    return `<div class="${e} ${e}--conflict" role="alertdialog" aria-labelledby="${e}-conflict-title" aria-describedby="${e}-conflict-desc">
      <div class="${e}__conflict-header">
        <span class="${e}__icon">${this.getStateIcon()}</span>
        <span id="${e}-conflict-title" class="${e}__conflict-title">${t.title}</span>
      </div>
      <p id="${e}-conflict-desc" class="${e}__conflict-message">${t.message}</p>
      <div class="${e}__conflict-actions">
        <button type="button" class="${e}__conflict-use-server" aria-label="${t.useServer}">
          ${t.useServer}
        </button>
        ${this.config.allowForceSave ? `
          <button type="button" class="${e}__conflict-force-save" aria-label="${t.forceSave}">
            ${t.forceSave}
          </button>
        ` : ""}
        <button type="button" class="${e}__conflict-dismiss" aria-label="${t.dismiss}">
          ${t.dismiss}
        </button>
      </div>
    </div>`;
  }
  render() {
    this.config.container && (this.config.container.innerHTML = this.renderIndicator(), this.bindRetryButton(), this.bindConflictButtons());
  }
  destroy() {
    this.cancelDebounce(), this.cancelSavedTimer(), this.listeners = [];
  }
  setState(e) {
    if (e === this.state) return;
    const t = this.state;
    this.state = e;
    const r = {
      previousState: t,
      currentState: e,
      error: this.lastError ?? void 0,
      data: this.pendingData ?? void 0
    };
    for (const s of this.listeners) try {
      s(r);
    } catch {
    }
    this.config.showToasts && this.config.notifier && this.showToast(e), this.render();
  }
  showToast(e) {
    const t = this.config.notifier;
    if (t)
      switch (e) {
        case "saved":
          t.success(this.config.labels.saved ?? H.saved, 2e3);
          break;
        case "error":
          t.error(this.lastError?.message ?? this.config.labels.error ?? H.error);
          break;
        case "conflict":
          t.warning?.(this.config.labels.conflict ?? H.conflict);
      }
  }
  getStateIcon() {
    switch (this.state) {
      case "saving":
        return `<svg class="${this.config.classPrefix}__spinner" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-dasharray="28" stroke-dashoffset="7">
            <animateTransform attributeName="transform" type="rotate" from="0 8 8" to="360 8 8" dur="1s" repeatCount="indefinite"/>
          </circle>
        </svg>`;
      case "saved":
        return `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 8.5L6.5 12L13 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`;
      case "error":
        return `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="2"/>
          <path d="M8 5v4M8 11v.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>`;
      case "conflict":
        return `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M8 1L15 14H1L8 1Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
          <path d="M8 6v4M8 12v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>`;
      default:
        return "";
    }
  }
  bindConflictButtons() {
    if (!this.config.container || this.state !== "conflict") return;
    const e = this.config.classPrefix, t = this.config.container.querySelector(`.${e}__conflict-use-server`);
    t && t.addEventListener("click", () => this.resolveWithServerVersion());
    const r = this.config.container.querySelector(`.${e}__conflict-force-save`);
    r && r.addEventListener("click", () => this.resolveWithForceSave());
    const s = this.config.container.querySelector(`.${e}__conflict-dismiss`);
    s && s.addEventListener("click", () => this.dismissConflict());
  }
  cancelDebounce() {
    this.debounceTimer && (clearTimeout(this.debounceTimer), this.debounceTimer = null);
  }
  cancelSavedTimer() {
    this.savedTimer && (clearTimeout(this.savedTimer), this.savedTimer = null);
  }
  bindRetryButton() {
    if (!this.config.container) return;
    const e = this.config.container.querySelector(`.${this.config.classPrefix}__retry`);
    e && e.addEventListener("click", () => this.retry());
  }
};
function Tl(e) {
  return new jt({
    debounceMs: 1500,
    savedDurationMs: 2e3,
    showToasts: !1,
    labels: {
      idle: "",
      saving: "Saving...",
      saved: "All changes saved",
      error: "Failed to save",
      conflict: "Conflict detected"
    },
    enableConflictDetection: !0,
    allowForceSave: !0,
    ...e
  });
}
function Dl(e, t = {}) {
  const r = t.classPrefix ?? Ie, s = {
    ...H,
    ...t.labels
  }[e] || "";
  let n = "";
  switch (e) {
    case "saving":
      n = `<span class="${r}__spinner"></span>`;
      break;
    case "saved":
      n = `<span class="${r}__check">✓</span>`;
      break;
    case "error":
      n = `<span class="${r}__error">!</span>`;
      break;
    case "conflict":
      n = `<span class="${r}__conflict-icon">⚠</span>`;
  }
  return `<div class="${r} ${r}--${e}" role="status" aria-live="polite">
    ${n}
    <span class="${r}__label">${s}</span>
  </div>`;
}
function Ml(e = Ie) {
  return `
    .${e} {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.75rem;
      color: var(--autosave-color, #6b7280);
      transition: opacity 200ms ease;
    }

    .${e}--idle {
      opacity: 0;
    }

    .${e}--saving {
      color: var(--autosave-saving-color, #3b82f6);
    }

    .${e}--saved {
      color: var(--autosave-saved-color, #10b981);
    }

    .${e}--error {
      color: var(--autosave-error-color, #ef4444);
    }

    .${e}__icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1rem;
      height: 1rem;
    }

    .${e}__icon svg {
      width: 100%;
      height: 100%;
    }

    .${e}__spinner {
      animation: ${e}-spin 1s linear infinite;
    }

    .${e}__retry {
      margin-left: 0.5rem;
      padding: 0.125rem 0.375rem;
      font-size: 0.75rem;
      color: var(--autosave-retry-color, #3b82f6);
      background: transparent;
      border: 1px solid currentColor;
      border-radius: 0.25rem;
      cursor: pointer;
      transition: background-color 150ms ease;
    }

    .${e}__retry:hover {
      background-color: var(--autosave-retry-hover-bg, rgba(59, 130, 246, 0.1));
    }

    @keyframes ${e}-spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    /* Conflict state styles (TX-074) */
    .${e}--conflict {
      color: var(--autosave-conflict-color, #f59e0b);
      padding: 0.75rem;
      background: var(--autosave-conflict-bg, #fffbeb);
      border: 1px solid var(--autosave-conflict-border, #fcd34d);
      border-radius: 0.5rem;
      flex-direction: column;
      align-items: stretch;
      gap: 0.5rem;
    }

    .${e}__conflict-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .${e}__conflict-title {
      font-weight: 600;
      color: var(--autosave-conflict-title-color, #92400e);
    }

    .${e}__conflict-message {
      font-size: 0.75rem;
      color: var(--autosave-conflict-message-color, #78350f);
      margin: 0;
    }

    .${e}__conflict-actions {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
      margin-top: 0.25rem;
    }

    .${e}__conflict-actions button {
      padding: 0.25rem 0.5rem;
      font-size: 0.75rem;
      border-radius: 0.25rem;
      cursor: pointer;
      transition: background-color 150ms ease;
    }

    .${e}__conflict-use-server {
      color: white;
      background: var(--autosave-conflict-use-server-bg, #3b82f6);
      border: none;
    }

    .${e}__conflict-use-server:hover {
      background: var(--autosave-conflict-use-server-hover-bg, #2563eb);
    }

    .${e}__conflict-force-save {
      color: var(--autosave-conflict-force-color, #ef4444);
      background: transparent;
      border: 1px solid currentColor;
    }

    .${e}__conflict-force-save:hover {
      background: var(--autosave-conflict-force-hover-bg, rgba(239, 68, 68, 0.1));
    }

    .${e}__conflict-dismiss {
      color: var(--autosave-conflict-dismiss-color, #6b7280);
      background: transparent;
      border: 1px solid var(--autosave-conflict-dismiss-border, #d1d5db);
    }

    .${e}__conflict-dismiss:hover {
      background: var(--autosave-conflict-dismiss-hover-bg, #f3f4f6);
    }
  `;
}
function Il(e, t) {
  const { watchFields: r, indicatorSelector: s, ...n } = t;
  let i = n.container;
  !i && s && (i = e.querySelector(s) ?? void 0);
  const a = new jt({
    ...n,
    container: i
  }), o = () => {
    const p = new FormData(e), m = {};
    return p.forEach((v, y) => {
      m[y] = v;
    }), m;
  }, l = (p) => {
    const m = p.target;
    if (m) {
      if (r && r.length > 0) {
        const v = m.name;
        if (!v || !r.includes(v)) return;
      }
      a.markDirty(o());
    }
  };
  e.addEventListener("input", l), e.addEventListener("change", l), e.addEventListener("submit", async (p) => {
    a.hasPendingChanges() && (p.preventDefault(), await a.save() && e.submit());
  });
  const c = (p) => {
    a.hasPendingChanges() && (p.preventDefault(), p.returnValue = "");
  };
  window.addEventListener("beforeunload", c);
  const u = () => {
    document.hidden && a.hasPendingChanges() && a.save();
  };
  document.addEventListener("visibilitychange", u);
  const h = a.destroy.bind(a);
  return a.destroy = () => {
    e.removeEventListener("input", l), e.removeEventListener("change", l), window.removeEventListener("beforeunload", c), document.removeEventListener("visibilitychange", u), h();
  }, a;
}
var Nt = "char-counter", Zi = "interpolation-preview", zt = "dir-toggle", Gt = [
  {
    pattern: /\{\{(\w+(?:\.\w+)*)\}\}/g,
    name: "Mustache",
    example: "{{name}}"
  },
  {
    pattern: /\{(\w+)(?:,\s*\w+(?:,\s*[^}]+)?)?\}/g,
    name: "ICU",
    example: "{name}"
  },
  {
    pattern: /%(\d+\$)?[sdfc]/g,
    name: "Printf",
    example: "%s"
  },
  {
    pattern: /%\((\w+)\)[sdf]/g,
    name: "Named Printf",
    example: "%(name)s"
  },
  {
    pattern: /\$\{(\w+)\}/g,
    name: "Template Literal",
    example: "${name}"
  }
], ea = {
  name: "John",
  count: "5",
  email: "user@example.com",
  date: "2024-01-15",
  price: "$29.99",
  user: "Jane",
  item: "Product",
  total: "100"
}, ta = class {
  constructor(e) {
    this.counterEl = null, this.config = {
      input: e.input,
      container: e.container,
      softLimit: e.softLimit,
      hardLimit: e.hardLimit,
      thresholds: e.thresholds ?? this.buildDefaultThresholds(e),
      enforceHardLimit: e.enforceHardLimit ?? !1,
      classPrefix: e.classPrefix ?? Nt,
      formatDisplay: e.formatDisplay ?? this.defaultFormatDisplay.bind(this)
    }, this.boundUpdate = this.update.bind(this), this.init();
  }
  getCount() {
    return this.config.input.value.length;
  }
  getSeverity() {
    const e = this.getCount(), t = [...this.config.thresholds].sort((r, s) => s.limit - r.limit);
    for (const r of t) if (e >= r.limit) return r.severity;
    return null;
  }
  update() {
    const e = this.getCount(), t = this.getSeverity(), r = this.config.hardLimit ?? this.config.softLimit;
    this.config.enforceHardLimit && this.config.hardLimit && e > this.config.hardLimit && (this.config.input.value = this.config.input.value.slice(0, this.config.hardLimit)), this.counterEl && (this.counterEl.textContent = this.config.formatDisplay(e, r), this.counterEl.className = this.buildCounterClasses(t), this.counterEl.setAttribute("aria-live", "polite"), t === "error" ? this.counterEl.setAttribute("role", "alert") : this.counterEl.removeAttribute("role"));
  }
  render() {
    const e = this.getCount(), t = this.getSeverity(), r = this.config.hardLimit ?? this.config.softLimit;
    return `<span class="${this.buildCounterClasses(t)}" aria-live="polite">${this.config.formatDisplay(e, r)}</span>`;
  }
  destroy() {
    this.config.input.removeEventListener("input", this.boundUpdate), this.config.input.removeEventListener("change", this.boundUpdate), this.counterEl?.parentElement && this.counterEl.parentElement.removeChild(this.counterEl);
  }
  init() {
    this.counterEl = document.createElement("span"), this.counterEl.className = this.buildCounterClasses(null), this.config.container ? this.config.container.appendChild(this.counterEl) : this.config.input.parentElement?.insertBefore(this.counterEl, this.config.input.nextSibling), this.config.input.addEventListener("input", this.boundUpdate), this.config.input.addEventListener("change", this.boundUpdate), this.update();
  }
  buildDefaultThresholds(e) {
    const t = [];
    return e.softLimit && t.push({
      limit: e.softLimit,
      severity: "warning",
      message: `Approaching limit (${e.softLimit} characters)`
    }), e.hardLimit && t.push({
      limit: e.hardLimit,
      severity: "error",
      message: `Maximum limit reached (${e.hardLimit} characters)`
    }), t;
  }
  buildCounterClasses(e) {
    const t = this.config.classPrefix, r = [t];
    return e && r.push(`${t}--${e}`), r.join(" ");
  }
  defaultFormatDisplay(e, t) {
    return t ? `${e} / ${t}` : `${e}`;
  }
}, ra = class {
  constructor(e) {
    this.previewEl = null, this.config = {
      input: e.input,
      container: e.container,
      sampleValues: e.sampleValues ?? ea,
      patterns: [...Gt, ...e.customPatterns ?? []],
      highlightVariables: e.highlightVariables ?? !0,
      classPrefix: e.classPrefix ?? Zi
    }, this.boundUpdate = this.update.bind(this), this.init();
  }
  getMatches() {
    const e = this.config.input.value, t = [];
    for (const r of this.config.patterns) {
      r.pattern.lastIndex = 0;
      let s;
      for (; (s = r.pattern.exec(e)) !== null; ) t.push({
        pattern: r.name,
        variable: s[1] ?? s[0],
        start: s.index,
        end: s.index + s[0].length
      });
    }
    return t;
  }
  getPreviewText() {
    let e = this.config.input.value;
    for (const t of this.config.patterns)
      t.pattern.lastIndex = 0, e = e.replace(t.pattern, (r, s) => {
        const n = (s ?? r).replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
        for (const [i, a] of Object.entries(this.config.sampleValues)) if (i.toLowerCase() === n) return a;
        return r;
      });
    return e;
  }
  update() {
    if (this.previewEl) {
      if (!(this.getMatches().length > 0)) {
        this.previewEl.classList.add(`${this.config.classPrefix}--empty`), this.previewEl.innerHTML = "";
        return;
      }
      this.previewEl.classList.remove(`${this.config.classPrefix}--empty`), this.config.highlightVariables ? this.previewEl.innerHTML = this.renderHighlightedPreview() : this.previewEl.textContent = this.getPreviewText();
    }
  }
  renderHighlightedPreview() {
    const e = this.config.input.value, t = this.getMatches(), r = this.config.classPrefix;
    if (t.length === 0) return d(e);
    t.sort((i, a) => i.start - a.start);
    let s = "", n = 0;
    for (const i of t) {
      s += d(e.slice(n, i.start));
      const a = this.getSampleValue(i.variable), o = e.slice(i.start, i.end);
      s += `<span class="${r}__variable" title="${d(o)}">${d(a ?? o)}</span>`, n = i.end;
    }
    return s += d(e.slice(n)), s;
  }
  render() {
    const e = this.config.classPrefix;
    return `<div class="${e}${this.getMatches().length === 0 ? ` ${e}--empty` : ""}">
      <span class="${e}__label">Preview:</span>
      <span class="${e}__content">${this.config.highlightVariables ? this.renderHighlightedPreview() : d(this.getPreviewText())}</span>
    </div>`;
  }
  destroy() {
    this.config.input.removeEventListener("input", this.boundUpdate), this.previewEl?.parentElement && this.previewEl.parentElement.removeChild(this.previewEl);
  }
  init() {
    this.previewEl = document.createElement("div"), this.previewEl.className = this.config.classPrefix, this.config.container ? this.config.container.appendChild(this.previewEl) : this.config.input.parentElement?.appendChild(this.previewEl), this.config.input.addEventListener("input", this.boundUpdate), this.update();
  }
  getSampleValue(e) {
    const t = e.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
    for (const [r, s] of Object.entries(this.config.sampleValues)) if (r.toLowerCase() === t) return s;
    return null;
  }
}, sa = class {
  constructor(e) {
    this.toggleEl = null, this.config = {
      input: e.input,
      container: e.container,
      initialDirection: e.initialDirection ?? "auto",
      persistenceKey: e.persistenceKey,
      classPrefix: e.classPrefix ?? zt,
      onChange: e.onChange
    }, this.currentDirection = this.resolveInitialDirection(), this.init();
  }
  getDirection() {
    return this.currentDirection;
  }
  setDirection(e) {
    if (e !== this.currentDirection) {
      if (this.currentDirection = e, this.config.input.dir = e, this.config.input.style.textAlign = e === "rtl" ? "right" : "left", this.config.persistenceKey) try {
        localStorage.setItem(this.config.persistenceKey, e);
      } catch {
      }
      this.updateToggle(), this.config.onChange?.(e);
    }
  }
  toggle() {
    this.setDirection(this.currentDirection === "ltr" ? "rtl" : "ltr");
  }
  render() {
    const e = this.config.classPrefix, t = this.currentDirection === "rtl";
    return `<button type="button" class="${e}" aria-pressed="${t}" title="Toggle text direction (${t ? "RTL" : "LTR"})">
      <span class="${e}__icon">${t ? this.rtlIcon() : this.ltrIcon()}</span>
      <span class="${e}__label">${t ? "RTL" : "LTR"}</span>
    </button>`;
  }
  destroy() {
    this.toggleEl?.parentElement && this.toggleEl.parentElement.removeChild(this.toggleEl);
  }
  init() {
    this.config.input.dir = this.currentDirection, this.config.input.style.textAlign = this.currentDirection === "rtl" ? "right" : "left", this.toggleEl = document.createElement("button"), this.toggleEl.type = "button", this.toggleEl.className = this.config.classPrefix, this.updateToggle(), this.toggleEl.addEventListener("click", () => this.toggle()), this.config.container ? this.config.container.appendChild(this.toggleEl) : this.config.input.parentElement?.appendChild(this.toggleEl);
  }
  resolveInitialDirection() {
    if (this.config.persistenceKey) try {
      const e = localStorage.getItem(this.config.persistenceKey);
      if (e === "ltr" || e === "rtl") return e;
    } catch {
    }
    return this.config.initialDirection === "ltr" || this.config.initialDirection === "rtl" ? this.config.initialDirection : this.config.input.dir === "rtl" || document.dir === "rtl" || document.documentElement.dir === "rtl" ? "rtl" : "ltr";
  }
  updateToggle() {
    if (!this.toggleEl) return;
    const e = this.currentDirection === "rtl";
    this.toggleEl.setAttribute("aria-pressed", String(e)), this.toggleEl.setAttribute("title", `Toggle text direction (${e ? "RTL" : "LTR"})`), this.toggleEl.innerHTML = `
      <span class="${this.config.classPrefix}__icon">${e ? this.rtlIcon() : this.ltrIcon()}</span>
      <span class="${this.config.classPrefix}__label">${e ? "RTL" : "LTR"}</span>
    `;
  }
  ltrIcon() {
    return `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" width="16" height="16">
      <path d="M3 8h10M10 5l3 3-3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
  }
  rtlIcon() {
    return `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" width="16" height="16">
      <path d="M13 8H3M6 5L3 8l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
  }
};
function Bl(e, t = {}) {
  const r = [], s = [], n = [];
  for (const i of t.charCounterFields ?? []) {
    const a = e.querySelector(`[name="${i}"]`);
    a && r.push(new ta({
      input: a,
      ...t.charCounterConfig
    }));
  }
  for (const i of t.interpolationFields ?? []) {
    const a = e.querySelector(`[name="${i}"]`);
    a && s.push(new ra({
      input: a,
      ...t.interpolationConfig
    }));
  }
  for (const i of t.directionToggleFields ?? []) {
    const a = e.querySelector(`[name="${i}"]`);
    a && n.push(new sa({
      input: a,
      persistenceKey: `dir-${i}`,
      ...t.directionToggleConfig
    }));
  }
  return {
    counters: r,
    previews: s,
    toggles: n,
    destroy: () => {
      r.forEach((i) => i.destroy()), s.forEach((i) => i.destroy()), n.forEach((i) => i.destroy());
    }
  };
}
function Fl(e, t, r, s = Nt) {
  const n = [s];
  r && n.push(`${s}--${r}`);
  const i = t ? `${e} / ${t}` : `${e}`;
  return `<span class="${n.join(" ")}" aria-live="polite">${i}</span>`;
}
function ql(e, t = zt) {
  const r = e === "rtl", s = r ? '<path d="M13 8H3M6 5L3 8l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>' : '<path d="M3 8h10M10 5l3 3-3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>';
  return `<button type="button" class="${t}" aria-pressed="${r}" title="Toggle text direction (${e.toUpperCase()})">
    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" width="16" height="16">${s}</svg>
    <span class="${t}__label">${e.toUpperCase()}</span>
  </button>`;
}
function Ol() {
  return `
    /* Character Counter */
    .char-counter {
      display: inline-flex;
      font-size: 0.75rem;
      color: var(--char-counter-color, #6b7280);
      margin-left: 0.5rem;
    }

    .char-counter--warning {
      color: var(--char-counter-warning-color, #f59e0b);
    }

    .char-counter--error {
      color: var(--char-counter-error-color, #ef4444);
      font-weight: 500;
    }

    /* Interpolation Preview */
    .interpolation-preview {
      margin-top: 0.5rem;
      padding: 0.5rem;
      background: var(--preview-bg, #f9fafb);
      border-radius: 0.25rem;
      font-size: 0.875rem;
    }

    .interpolation-preview--empty {
      display: none;
    }

    .interpolation-preview__label {
      color: var(--preview-label-color, #6b7280);
      font-size: 0.75rem;
      margin-right: 0.5rem;
    }

    .interpolation-preview__variable {
      background: var(--preview-variable-bg, #e0f2fe);
      color: var(--preview-variable-color, #0369a1);
      padding: 0.125rem 0.25rem;
      border-radius: 0.125rem;
      font-family: monospace;
    }

    /* Direction Toggle */
    .dir-toggle {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.25rem 0.5rem;
      font-size: 0.75rem;
      color: var(--dir-toggle-color, #374151);
      background: var(--dir-toggle-bg, #f3f4f6);
      border: 1px solid var(--dir-toggle-border, #d1d5db);
      border-radius: 0.25rem;
      cursor: pointer;
      transition: background-color 150ms ease;
    }

    .dir-toggle:hover {
      background: var(--dir-toggle-hover-bg, #e5e7eb);
    }

    .dir-toggle[aria-pressed="true"] {
      background: var(--dir-toggle-active-bg, #dbeafe);
      border-color: var(--dir-toggle-active-border, #93c5fd);
      color: var(--dir-toggle-active-color, #1d4ed8);
    }

    .dir-toggle__icon {
      display: inline-flex;
    }

    .dir-toggle__label {
      font-weight: 500;
    }
  `;
}
function jl(e, t = Gt) {
  const r = [];
  for (const s of t) {
    s.pattern.lastIndex = 0;
    let n;
    for (; (n = s.pattern.exec(e)) !== null; ) r.push({
      pattern: s.name,
      variable: n[1] ?? n[0],
      start: n.index,
      end: n.index + n[0].length
    });
  }
  return r;
}
function Nl(e, t, r) {
  return r && e >= r ? "error" : t && e >= t ? "warning" : null;
}
function zl(e) {
  return typeof e == "string" && [
    "none",
    "core",
    "core+exchange",
    "core+queue",
    "full"
  ].includes(e) ? e : "none";
}
function na(e) {
  return e === "core+exchange" || e === "full";
}
function ia(e) {
  return e === "core+queue" || e === "full";
}
function Gl(e) {
  return e !== "none";
}
function aa(e) {
  return !e || typeof e != "object" ? null : Sr(e);
}
var Ut = class {
  constructor(e) {
    this.capabilities = e;
  }
  getMode() {
    return this.capabilities.profile;
  }
  getCapabilities() {
    return this.capabilities;
  }
  isModuleEnabledByMode(e) {
    const t = this.capabilities.profile;
    return e === "exchange" ? na(t) : ia(t);
  }
  getModuleState(e) {
    return this.capabilities.modules[e] || null;
  }
  getActionState(e, t) {
    const r = this.getModuleState(e);
    return r && r.actions[t] || null;
  }
  gateNavItem(e) {
    const t = this.getModuleState(e.module);
    if (!t) return {
      visible: !1,
      enabled: !1,
      reason: `${e.module} module not configured`,
      reasonCode: "MODULE_NOT_CONFIGURED"
    };
    if (!t.enabled) return {
      visible: !1,
      enabled: !1,
      reason: t.entry.reason || "Module disabled by capability mode",
      reasonCode: t.entry.reason_code || "FEATURE_DISABLED"
    };
    if (!t.visible) return {
      visible: !1,
      enabled: !1,
      reason: t.entry.reason || "Module hidden by capability metadata",
      reasonCode: t.entry.reason_code || "FEATURE_DISABLED",
      permission: t.entry.permission
    };
    if (!t.entry.enabled) return {
      visible: !0,
      enabled: !1,
      reason: t.entry.reason || "Missing module view permission",
      reasonCode: t.entry.reason_code || "PERMISSION_DENIED",
      permission: t.entry.permission
    };
    if (e.action) {
      const r = t.actions[e.action];
      if (!r) return {
        visible: !0,
        enabled: !1,
        reason: `Action ${e.action} not configured`,
        reasonCode: "ACTION_NOT_CONFIGURED"
      };
      if (!r.enabled) return {
        visible: !0,
        enabled: !1,
        reason: r.reason || `Missing ${e.action} permission`,
        reasonCode: r.reason_code || "PERMISSION_DENIED",
        permission: r.permission
      };
    }
    return {
      visible: !0,
      enabled: !0
    };
  }
  gateAction(e, t) {
    return this.gateNavItem({
      module: e,
      action: t
    });
  }
  canAccessExchange() {
    const e = this.gateNavItem({ module: "exchange" });
    return e.visible && e.enabled;
  }
  canAccessQueue() {
    const e = this.gateNavItem({ module: "queue" });
    return e.visible && e.enabled;
  }
  getRoute(e) {
    return this.capabilities.routes[e] || null;
  }
  isFeatureEnabled(e) {
    return this.capabilities.features[e] === !0;
  }
};
function We(e) {
  const t = aa(e);
  return t ? new Ut(t) : null;
}
function Ul() {
  return new Ut({ ...Cr });
}
function Hl(e) {
  return e.visible ? e.enabled ? "" : `aria-disabled="true"${e.reason ? ` title="${f(e.reason)}"` : ""}` : 'aria-hidden="true" style="display: none;"';
}
function oa(e) {
  if (e.enabled || !e.reason) return "";
  const t = (e.reasonCode || "").trim();
  return t ? yr(t, {
    size: "sm",
    showFullMessage: !0
  }) : `
    <span class="capability-gate-reason text-gray-500 bg-gray-100"
          role="status"
          aria-label="${f(e.reason)}">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 inline-block mr-1">
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clip-rule="evenodd" />
      </svg>
      ${d(e.reason)}
    </span>
  `.trim();
}
function Vl() {
  return `
    /* Capability Gate Styles */
    .capability-gate-reason {
      display: inline-flex;
      align-items: center;
      padding: 0.25rem 0.5rem;
      font-size: 0.75rem;
      font-weight: 500;
      border-radius: 0.25rem;
      white-space: nowrap;
    }

    .capability-gate-disabled {
      opacity: 0.6;
      cursor: not-allowed;
      pointer-events: none;
    }

    .capability-gate-disabled:focus-visible {
      pointer-events: auto;
    }

    [aria-disabled="true"].capability-gate-action {
      opacity: 0.6;
      cursor: not-allowed;
    }

    [aria-disabled="true"].capability-gate-action:hover {
      background-color: inherit;
    }

    .capability-gate-hidden {
      display: none !important;
    }
  `;
}
function la(e, t) {
  if (!t.visible) {
    e.style.display = "none", e.setAttribute("aria-hidden", "true");
    return;
  }
  e.style.display = "", e.removeAttribute("aria-hidden"), t.enabled ? (e.removeAttribute("aria-disabled"), e.classList.remove("capability-gate-disabled"), e.removeAttribute("title"), delete e.dataset.reasonCode, e.removeEventListener("click", Xe, !0)) : (e.setAttribute("aria-disabled", "true"), e.classList.add("capability-gate-disabled"), t.reason && (e.setAttribute("title", t.reason), e.dataset.reasonCode = t.reasonCode || ""), e.addEventListener("click", Xe, !0));
}
function Xe(e) {
  e.currentTarget.getAttribute("aria-disabled") === "true" && (e.preventDefault(), e.stopPropagation());
}
function Kl(e, t) {
  e.querySelectorAll("[data-capability-gate]").forEach((r) => {
    const s = r.dataset.capabilityGate;
    if (s)
      try {
        const n = JSON.parse(s);
        la(r, t.gateNavItem(n));
      } catch {
        console.warn("Invalid capability gate config:", s);
      }
  });
}
async function ca(e) {
  return Ze(e);
}
var da = {
  title: "My Translation Work",
  myAssignments: "My Assignments",
  dueSoon: "Due Soon",
  needsReview: "Needs Review",
  all: "All",
  overdue: "Overdue",
  onTrack: "On Track",
  noAssignments: "No assignments",
  noAssignmentsDescription: "You have no translation assignments at this time.",
  loading: "Loading assignments...",
  error: "Failed to load assignments",
  retry: "Retry",
  submitForReview: "Submit for Review",
  approve: "Approve",
  reject: "Reject",
  openAssignment: "Open",
  dueDate: "Due Date",
  priority: "Priority",
  status: "Status",
  targetLocale: "Target",
  sourceTitle: "Content"
}, ua = [
  {
    id: "all",
    label: "All",
    filters: {}
  },
  {
    id: "in_progress",
    label: "In Progress",
    filters: { status: "in_progress" }
  },
  {
    id: "due_soon",
    label: "Due Soon",
    filters: { status: "in_progress" }
  },
  {
    id: "review",
    label: "Needs Review",
    filters: { status: "review" }
  }
], ha = class extends ct {
  constructor(e) {
    super("loading"), this.container = null, this.gateResult = null, this.data = null, this.error = null, this.activePreset = "all", this.refreshTimer = null, this.config = {
      myWorkEndpoint: e.myWorkEndpoint,
      queueEndpoint: e.queueEndpoint || "",
      panelBaseUrl: e.panelBaseUrl || "",
      capabilityGate: e.capabilityGate,
      filterPresets: e.filterPresets || ua,
      refreshInterval: e.refreshInterval || 0,
      onAssignmentClick: e.onAssignmentClick,
      onActionClick: e.onActionClick,
      labels: {
        ...da,
        ...e.labels || {}
      }
    };
  }
  mount(e) {
    if (this.container = e, this.config.capabilityGate) {
      if (this.gateResult = this.config.capabilityGate.gateNavItem({ module: "queue" }), !this.gateResult.visible) {
        this.container.setAttribute("aria-hidden", "true"), this.container.style.display = "none";
        return;
      }
      if (!this.gateResult.enabled) {
        this.state = "disabled", this.render();
        return;
      }
    }
    this.render(), this.loadData(), this.config.refreshInterval > 0 && this.startAutoRefresh();
  }
  unmount() {
    this.stopAutoRefresh(), this.container && (this.container.innerHTML = ""), this.container = null;
  }
  async refresh() {
    await this.loadData();
  }
  setActivePreset(e) {
    this.activePreset = e, this.loadData();
  }
  getData() {
    return this.data;
  }
  startAutoRefresh() {
    this.refreshTimer || (this.refreshTimer = window.setInterval(() => {
      this.loadData();
    }, this.config.refreshInterval));
  }
  stopAutoRefresh() {
    this.refreshTimer && (window.clearInterval(this.refreshTimer), this.refreshTimer = null);
  }
  async loadData() {
    this.state = "loading", this.render();
    try {
      const e = this.config.filterPresets.find((n) => n.id === this.activePreset), t = new URLSearchParams(e?.filters || {}), r = `${this.config.myWorkEndpoint}${t.toString() ? "?" + t.toString() : ""}`, s = await fetch(r, { headers: { Accept: "application/json" } });
      if (!s.ok) throw new Error(`Failed to load: ${s.status}`);
      this.data = await ca(s), this.state = this.data.assignments.length === 0 ? "empty" : "loaded", this.error = null;
    } catch (e) {
      this.error = e instanceof Error ? e : new Error(String(e)), this.state = "error";
    }
    this.render();
  }
  render() {
    if (!this.container) return;
    const e = this.config.labels;
    this.container.innerHTML = `
      <div class="translator-dashboard" role="region" aria-label="${d(e.title)}">
        ${this.renderHeader()}
        ${this.renderSummaryCards()}
        ${this.renderFilterBar()}
        ${this.renderContent()}
      </div>
    `, this.attachEventListeners();
  }
  renderHeader() {
    const e = this.config.labels;
    return `
      <div class="dashboard-header">
        <h2 class="dashboard-title">${d(e.title)}</h2>
        <button type="button" class="dashboard-refresh-btn" aria-label="Refresh">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5">
            <path fill-rule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm-1.621-6.01a7 7 0 00-11.712 3.138.75.75 0 001.449.39 5.5 5.5 0 019.201-2.466l.312.311H10.51a.75.75 0 000 1.5h4.243a.75.75 0 00.75-.75V3.295a.75.75 0 00-1.5 0v2.43l-.311-.311z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>
    `;
  }
  renderSummaryCards() {
    if (this.state === "loading" || !this.data) return this.renderSummaryLoading();
    const e = this.data.summary, t = this.config.labels;
    return `
      <div class="dashboard-summary-cards" role="list" aria-label="Work summary">
        ${this.renderSummaryCard("total", t.myAssignments, e.total, "text-blue-600 bg-blue-50")}
        ${this.renderSummaryCard("overdue", t.overdue, e.overdue, "text-red-600 bg-red-50")}
        ${this.renderSummaryCard("due_soon", t.dueSoon, e.due_soon, "text-amber-600 bg-amber-50")}
        ${this.renderSummaryCard("review", t.needsReview, e.review, "text-purple-600 bg-purple-50")}
      </div>
    `;
  }
  renderSummaryCard(e, t, r, s) {
    return `
      <div class="summary-card ${s}" role="listitem" data-summary="${e}">
        <div class="summary-count">${r}</div>
        <div class="summary-label">${d(t)}</div>
      </div>
    `;
  }
  renderSummaryLoading() {
    return `
      <div class="dashboard-summary-cards loading" role="list" aria-busy="true">
        <div class="summary-card bg-gray-100 animate-pulse" role="listitem"><div class="h-12"></div></div>
        <div class="summary-card bg-gray-100 animate-pulse" role="listitem"><div class="h-12"></div></div>
        <div class="summary-card bg-gray-100 animate-pulse" role="listitem"><div class="h-12"></div></div>
        <div class="summary-card bg-gray-100 animate-pulse" role="listitem"><div class="h-12"></div></div>
      </div>
    `;
  }
  renderFilterBar() {
    return `
      <div class="dashboard-filter-bar" role="tablist" aria-label="Filter assignments">
        ${this.config.filterPresets.map((e) => this.renderFilterPreset(e)).join("")}
      </div>
    `;
  }
  renderFilterPreset(e) {
    const t = this.activePreset === e.id, r = e.badge?.() ?? null, s = r !== null ? `<span class="filter-badge">${r}</span>` : "";
    return `
      <button type="button"
              class="filter-preset ${t ? "active" : ""}"
              role="tab"
              aria-selected="${t}"
              data-preset="${e.id}">
        ${e.icon || ""}
        <span class="filter-label">${d(e.label)}</span>
        ${s}
      </button>
    `;
  }
  renderContent() {
    switch (this.state) {
      case "disabled":
        return this.renderDisabled();
      case "loading":
        return this.renderLoading();
      case "error":
        return this.renderError();
      case "empty":
        return this.renderEmpty();
      case "loaded":
        return this.renderAssignmentList();
      default:
        return "";
    }
  }
  renderLoading() {
    const e = this.config.labels;
    return `
      <div class="dashboard-loading" role="status" aria-busy="true">
        <div class="loading-spinner"></div>
        <p>${d(e.loading)}</p>
      </div>
    `;
  }
  renderError() {
    const e = this.config.labels;
    return `
      <div class="dashboard-error" role="alert">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-10 h-10 text-red-500">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" />
        </svg>
        <p class="error-message">${d(e.error)}</p>
        ${this.error ? `<p class="error-detail">${d(this.error.message)}</p>` : ""}
        <button type="button" class="retry-btn">${d(e.retry)}</button>
      </div>
    `;
  }
  renderEmpty() {
    const e = this.config.labels;
    return `
      <div class="dashboard-empty" role="status">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-12 h-12 text-gray-400">
          <path fill-rule="evenodd" d="M2.5 3A1.5 1.5 0 001 4.5v4A1.5 1.5 0 002.5 10h6A1.5 1.5 0 0010 8.5v-4A1.5 1.5 0 008.5 3h-6zm11 2A1.5 1.5 0 0012 6.5v7a1.5 1.5 0 001.5 1.5h4a1.5 1.5 0 001.5-1.5v-7A1.5 1.5 0 0017.5 5h-4zm-10 7A1.5 1.5 0 002 13.5v2A1.5 1.5 0 003.5 17h5A1.5 1.5 0 0010 15.5v-2A1.5 1.5 0 008.5 12h-5z" clip-rule="evenodd" />
        </svg>
        <p class="empty-title">${d(e.noAssignments)}</p>
        <p class="empty-description">${d(e.noAssignmentsDescription)}</p>
      </div>
    `;
  }
  renderDisabled() {
    const e = this.gateResult?.reason || "Access to this feature is not available.", t = this.gateResult ? oa(this.gateResult) : "";
    return `
      <div class="dashboard-disabled" role="alert" aria-live="polite">
        <div class="disabled-icon">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-12 h-12 text-gray-400">
            <path fill-rule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clip-rule="evenodd" />
          </svg>
        </div>
        <p class="disabled-title">Translator Dashboard Unavailable</p>
        <p class="disabled-description">${d(e)}</p>
        ${t}
        <p class="disabled-help-text">
          Contact your administrator if you believe you should have access to this feature.
        </p>
      </div>
    `;
  }
  renderAssignmentList() {
    if (!this.data) return "";
    const e = this.config.labels;
    let t = this.data.assignments;
    return this.activePreset === "due_soon" && (t = t.filter((r) => r.due_state === "due_soon" || r.due_state === "overdue")), t.length === 0 ? this.renderEmpty() : `
      <div class="dashboard-assignment-list">
        <table class="assignment-table" role="grid" aria-label="Translation assignments">
          <thead>
            <tr>
              <th scope="col">${d(e.sourceTitle)}</th>
              <th scope="col">${d(e.targetLocale)}</th>
              <th scope="col">${d(e.status)}</th>
              <th scope="col">${d(e.dueDate)}</th>
              <th scope="col">${d(e.priority)}</th>
              <th scope="col" class="actions-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${t.map((r) => this.renderAssignmentRow(r)).join("")}
          </tbody>
        </table>
      </div>
    `;
  }
  renderAssignmentRow(e) {
    this.config.labels;
    const t = pa(e.due_state), r = fa(e.priority), s = j(e.queue_state, {
      domain: "queue",
      size: "sm"
    }), n = e.due_date ? ga(new Date(e.due_date)) : "-";
    return `
      <tr class="assignment-row" data-assignment-id="${f(e.id)}">
        <td class="title-cell">
          <div class="title-content">
            <span class="source-title">${d(e.source_title || e.source_path || e.id)}</span>
            <span class="entity-type">${d(e.entity_type)}</span>
          </div>
        </td>
        <td class="locale-cell">
          <span class="locale-badge">${d(e.target_locale.toUpperCase())}</span>
          <span class="locale-arrow">←</span>
          <span class="locale-badge source">${d(e.source_locale.toUpperCase())}</span>
        </td>
        <td class="status-cell">
          ${s}
        </td>
        <td class="due-cell ${t}">
          ${n}
        </td>
        <td class="priority-cell">
          <span class="priority-indicator ${r}">${d(ma(e.priority))}</span>
        </td>
        <td class="actions-cell">
          ${this.renderAssignmentActions(e)}
        </td>
      </tr>
    `;
  }
  renderAssignmentActions(e) {
    const t = this.config.labels, r = [], s = typeof this.config.onActionClick == "function";
    r.push(`
      <button type="button" class="action-btn open-btn" data-action="open" title="${f(t.openAssignment)}">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
          <path d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 01-.65-.65z" />
          <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0010 3H4.75A2.75 2.75 0 002 5.75v9.5A2.75 2.75 0 004.75 18h9.5A2.75 2.75 0 0017 15.25V10a.75.75 0 00-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5z" />
        </svg>
      </button>
    `);
    const n = e.review_actions;
    return s && e.queue_state === "in_progress" && n.submit_review.enabled && r.push(`
        <button type="button" class="action-btn submit-review-btn" data-action="submit_review" title="${f(t.submitForReview)}">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd" />
          </svg>
        </button>
      `), s && e.queue_state === "review" && (n.approve.enabled && r.push(`
          <button type="button" class="action-btn approve-btn" data-action="approve" title="${f(t.approve)}">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
              <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" />
            </svg>
          </button>
        `), n.reject.enabled && r.push(`
          <button type="button" class="action-btn reject-btn" data-action="reject" title="${f(t.reject)}">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        `)), `<div class="action-buttons">${r.join("")}</div>`;
  }
  attachEventListeners() {
    this.container && (this.container.querySelector(".dashboard-refresh-btn")?.addEventListener("click", () => this.loadData()), this.container.querySelector(".retry-btn")?.addEventListener("click", () => this.loadData()), this.container.querySelectorAll(".filter-preset").forEach((e) => {
      e.addEventListener("click", () => {
        const t = e.dataset.preset;
        t && this.setActivePreset(t);
      });
    }), this.container.querySelectorAll(".assignment-row").forEach((e) => {
      const t = e.dataset.assignmentId;
      if (!t || !this.data) return;
      const r = this.data.assignments.find((s) => s.id === t);
      r && (e.querySelectorAll(".action-btn").forEach((s) => {
        s.addEventListener("click", async (n) => {
          n.stopPropagation();
          const i = s.dataset.action;
          i && (i === "open" ? this.openAssignment(r) : typeof this.config.onActionClick == "function" && await this.config.onActionClick(i, r));
        });
      }), e.addEventListener("click", () => {
        this.openAssignment(r);
      }));
    }), this.container.querySelectorAll(".summary-card").forEach((e) => {
      e.addEventListener("click", () => {
        const t = e.dataset.summary;
        t === "review" ? this.setActivePreset("review") : t === "due_soon" || t === "overdue" ? this.setActivePreset("due_soon") : this.setActivePreset("all");
      });
    }));
  }
  openAssignment(e) {
    if (typeof this.config.onAssignmentClick == "function") {
      this.config.onAssignmentClick(e);
      return;
    }
    const t = this.buildAssignmentEditURL(e);
    !t || typeof window > "u" || (window.location.href = t);
  }
  buildAssignmentEditURL(e) {
    const t = this.config.panelBaseUrl.trim().replace(/\/+$/, "");
    if (!t) return "";
    const r = e.entity_type.trim(), s = e.target_record_id.trim() || e.source_record_id.trim();
    return !r || !s ? "" : `${t}/${encodeURIComponent(r)}/${encodeURIComponent(s)}/edit`;
  }
};
function pa(e) {
  switch (e) {
    case "overdue":
      return "due-overdue";
    case "due_soon":
      return "due-soon";
    case "on_track":
      return "due-on-track";
    default:
      return "";
  }
}
function fa(e) {
  switch (e) {
    case "urgent":
      return "priority-urgent";
    case "high":
      return "priority-high";
    case "normal":
      return "priority-normal";
    case "low":
      return "priority-low";
    default:
      return "priority-normal";
  }
}
function ma(e) {
  return e.charAt(0).toUpperCase() + e.slice(1);
}
function ga(e) {
  const t = /* @__PURE__ */ new Date(), r = e.getTime() - t.getTime(), s = Math.ceil(r / 864e5);
  return s < 0 ? `${Math.abs(s)}d overdue` : s === 0 ? "Today" : s === 1 ? "Tomorrow" : s <= 7 ? `${s}d` : e.toLocaleDateString(void 0, {
    month: "short",
    day: "numeric"
  });
}
function Jl() {
  return `
    /* Translator Dashboard Styles */
    .translator-dashboard {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      padding: 1.5rem;
      background: white;
      border-radius: 0.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .dashboard-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .dashboard-title {
      font-size: 1.25rem;
      font-weight: 600;
      color: #1f2937;
      margin: 0;
    }

    .dashboard-refresh-btn {
      padding: 0.5rem;
      border: none;
      background: transparent;
      cursor: pointer;
      color: #6b7280;
      border-radius: 0.25rem;
      transition: color 0.2s, background 0.2s;
    }

    .dashboard-refresh-btn:hover {
      color: #374151;
      background: #f3f4f6;
    }

    /* Summary Cards */
    .dashboard-summary-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 1rem;
    }

    .summary-card {
      padding: 1rem;
      border-radius: 0.5rem;
      text-align: center;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .summary-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .summary-count {
      font-size: 1.75rem;
      font-weight: 700;
      line-height: 1;
    }

    .summary-label {
      font-size: 0.875rem;
      margin-top: 0.25rem;
      opacity: 0.8;
    }

    /* Filter Bar */
    .dashboard-filter-bar {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 0.75rem;
    }

    .filter-preset {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.5rem 0.75rem;
      font-size: 0.875rem;
      border: 1px solid #e5e7eb;
      border-radius: 0.375rem;
      background: white;
      cursor: pointer;
      color: #6b7280;
      transition: all 0.2s;
    }

    .filter-preset:hover {
      border-color: #d1d5db;
      color: #374151;
    }

    .filter-preset.active {
      border-color: #2563eb;
      background: #eff6ff;
      color: #2563eb;
    }

    .filter-badge {
      padding: 0.125rem 0.375rem;
      font-size: 0.75rem;
      font-weight: 500;
      background: #e5e7eb;
      border-radius: 9999px;
    }

    .filter-preset.active .filter-badge {
      background: #dbeafe;
    }

    /* Loading State */
    .dashboard-loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 3rem;
      color: #6b7280;
    }

    .loading-spinner {
      width: 2rem;
      height: 2rem;
      border: 2px solid #e5e7eb;
      border-top-color: #2563eb;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 1rem;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Error State */
    .dashboard-error {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 3rem;
      text-align: center;
    }

    .error-message {
      font-weight: 500;
      color: #dc2626;
      margin: 1rem 0 0.5rem;
    }

    .error-detail {
      font-size: 0.875rem;
      color: #6b7280;
      margin: 0 0 1rem;
    }

    .retry-btn {
      padding: 0.5rem 1rem;
      font-size: 0.875rem;
      border: 1px solid #d1d5db;
      border-radius: 0.375rem;
      background: white;
      cursor: pointer;
      color: #374151;
      transition: all 0.2s;
    }

    .retry-btn:hover {
      background: #f3f4f6;
    }

    /* Empty State */
    .dashboard-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 3rem;
      text-align: center;
    }

    .empty-title {
      font-weight: 500;
      color: #374151;
      margin: 1rem 0 0.5rem;
    }

    .empty-description {
      font-size: 0.875rem;
      color: #6b7280;
      margin: 0;
    }

    /* Disabled State (TX-101: visible-disabled module UX) */
    .dashboard-disabled {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 3rem;
      text-align: center;
      background: #f9fafb;
      border: 2px dashed #d1d5db;
      border-radius: 0.5rem;
      opacity: 0.9;
    }

    .disabled-icon {
      margin-bottom: 1rem;
    }

    .disabled-title {
      font-weight: 600;
      color: #4b5563;
      margin: 0 0 0.5rem;
      font-size: 1.125rem;
    }

    .disabled-description {
      font-size: 0.875rem;
      color: #6b7280;
      margin: 0 0 1rem;
      max-width: 300px;
    }

    .disabled-help-text {
      font-size: 0.75rem;
      color: #9ca3af;
      margin: 1rem 0 0;
      max-width: 300px;
    }

    /* Assignment Table */
    .dashboard-assignment-list {
      overflow-x: auto;
    }

    .assignment-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
    }

    .assignment-table th {
      text-align: left;
      padding: 0.75rem;
      font-weight: 500;
      color: #6b7280;
      border-bottom: 1px solid #e5e7eb;
      white-space: nowrap;
    }

    .assignment-table td {
      padding: 0.75rem;
      border-bottom: 1px solid #f3f4f6;
      vertical-align: middle;
    }

    .assignment-row {
      cursor: pointer;
      transition: background 0.2s;
    }

    .assignment-row:hover {
      background: #f9fafb;
    }

    .title-cell .title-content {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
    }

    .source-title {
      font-weight: 500;
      color: #1f2937;
    }

    .entity-type {
      font-size: 0.75rem;
      color: #9ca3af;
    }

    .locale-cell {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .locale-badge {
      padding: 0.125rem 0.375rem;
      font-size: 0.75rem;
      font-weight: 500;
      background: #dbeafe;
      color: #1d4ed8;
      border-radius: 0.25rem;
    }

    .locale-badge.source {
      background: #f3f4f6;
      color: #6b7280;
    }

    .locale-arrow {
      color: #9ca3af;
    }

    .status-badge {
      display: inline-block;
      padding: 0.25rem 0.5rem;
      font-size: 0.75rem;
      font-weight: 500;
      border-radius: 9999px;
    }

    .status-pending { background: #f3f4f6; color: #6b7280; }
    .status-assigned { background: #e0e7ff; color: #4338ca; }
    .status-in-progress { background: #dbeafe; color: #1d4ed8; }
    .status-review { background: #fae8ff; color: #a21caf; }
    .status-approved { background: #d1fae5; color: #059669; }
    .status-published { background: #d1fae5; color: #047857; }
    .status-archived { background: #e5e7eb; color: #6b7280; }

    .due-overdue { color: #dc2626; font-weight: 500; }
    .due-soon { color: #d97706; }
    .due-on-track { color: #059669; }

    .priority-indicator {
      font-size: 0.75rem;
      font-weight: 500;
    }

    .priority-urgent { color: #dc2626; }
    .priority-high { color: #d97706; }
    .priority-normal { color: #6b7280; }
    .priority-low { color: #9ca3af; }

    .actions-col { width: 100px; text-align: right; }
    .actions-cell { text-align: right; }

    .action-buttons {
      display: flex;
      justify-content: flex-end;
      gap: 0.25rem;
    }

    .action-btn {
      padding: 0.375rem;
      border: none;
      background: transparent;
      cursor: pointer;
      border-radius: 0.25rem;
      color: #6b7280;
      transition: all 0.2s;
    }

    .action-btn:hover {
      background: #f3f4f6;
      color: #374151;
    }

    .open-btn:hover { color: #2563eb; }
    .submit-review-btn:hover { color: #7c3aed; }
    .approve-btn:hover { color: #059669; }
    .reject-btn:hover { color: #dc2626; }

    /* Responsive */
    @media (max-width: 640px) {
      .translator-dashboard {
        padding: 1rem;
      }

      .dashboard-summary-cards {
        grid-template-columns: repeat(2, 1fr);
      }

      .assignment-table th:nth-child(4),
      .assignment-table td:nth-child(4),
      .assignment-table th:nth-child(5),
      .assignment-table td:nth-child(5) {
        display: none;
      }
    }
  `;
}
function ba(e, t) {
  const r = new ha(t);
  return r.mount(e), r;
}
function Ql(e) {
  return ya(e);
}
function ya(e, t = {}) {
  const r = e.dataset.myWorkEndpoint;
  if (!r)
    return console.warn("TranslatorDashboard: Missing data-my-work-endpoint attribute"), null;
  const s = va(t);
  return ba(e, {
    myWorkEndpoint: r,
    panelBaseUrl: e.dataset.panelBaseUrl,
    queueEndpoint: e.dataset.queueEndpoint,
    refreshInterval: parseInt(e.dataset.refreshInterval || "0", 10),
    capabilityGate: s || void 0
  });
}
function va(e) {
  if (e.capabilityGate) return e.capabilityGate;
  if (e.capabilitiesPayload !== void 0) return We(e.capabilitiesPayload);
  const t = wa();
  return t === null ? null : We(t);
}
function wa() {
  if (typeof window < "u") {
    const e = window.__TRANSLATION_CAPABILITIES__;
    if (e && typeof e == "object") return e;
  }
  if (typeof document < "u") {
    const e = document.querySelector("script[data-translation-capabilities]");
    if (e && e.textContent) try {
      return JSON.parse(e.textContent);
    } catch {
      return null;
    }
  }
  return null;
}
async function me(e) {
  return Ze(e);
}
var xa = {
  title: "Import Translations",
  selectFile: "Select file or paste data",
  validateButton: "Validate",
  applyButton: "Apply",
  cancelButton: "Cancel",
  selectAll: "Select All",
  deselectAll: "Deselect All",
  selectedCount: "selected",
  previewTitle: "Preview",
  conflictResolution: "Conflict Resolution",
  keepCurrent: "Keep Current",
  acceptIncoming: "Accept Incoming",
  skip: "Skip",
  force: "Force",
  success: "Success",
  error: "Error",
  conflict: "Conflict",
  skipped: "Skipped",
  validating: "Validating...",
  applying: "Applying...",
  noRowsSelected: "No rows selected",
  applyDisabledReason: "Missing import.apply permission",
  resource: "Resource",
  field: "Field",
  status: "Status",
  sourceText: "Source",
  translatedText: "Translation",
  conflictDetails: "Conflict Details",
  allowCreateMissing: "Create missing translations",
  continueOnError: "Continue on error",
  dryRun: "Dry run (preview only)"
}, Sa = class extends ct {
  constructor(e) {
    super("idle"), this.container = null, this.validationResult = null, this.previewRows = [], this.selection = {
      selected: /* @__PURE__ */ new Set(),
      excluded: /* @__PURE__ */ new Set(),
      allSelected: !1
    }, this.applyOptions = {
      allowCreateMissing: !1,
      continueOnError: !1,
      dryRun: !1,
      async: !1
    }, this.error = null, this.file = null, this.rawData = "";
    const t = {
      ...xa,
      ...e.labels || {}
    };
    this.config = {
      validateEndpoint: e.validateEndpoint,
      applyEndpoint: e.applyEndpoint,
      capabilityGate: e.capabilityGate,
      onValidationComplete: e.onValidationComplete,
      onApplyComplete: e.onApplyComplete,
      onError: e.onError,
      labels: t
    };
  }
  mount(e) {
    this.container = e, this.render();
  }
  unmount() {
    this.container && (this.container.innerHTML = ""), this.container = null;
  }
  getValidationResult() {
    return this.validationResult;
  }
  getSelectedIndices() {
    return this.selection.allSelected ? this.previewRows.filter((e) => !this.selection.excluded.has(e.index)).map((e) => e.index) : Array.from(this.selection.selected);
  }
  setFile(e) {
    this.file = e, this.rawData = "", this.render();
  }
  setRawData(e) {
    this.rawData = e, this.file = null, this.render();
  }
  async validate() {
    this.state = "validating", this.error = null, this.render();
    try {
      const e = new FormData();
      if (this.file) e.append("file", this.file);
      else if (this.rawData) {
        const s = await C(this.config.validateEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json"
          },
          body: this.rawData
        });
        if (!s.ok) throw new Error(`Validation failed: ${s.status}`);
        const n = await me(s);
        return this.handleValidationResult(n), n;
      } else throw new Error("No file or data to validate");
      const t = await C(this.config.validateEndpoint, {
        method: "POST",
        body: e
      });
      if (!t.ok) throw new Error(`Validation failed: ${t.status}`);
      const r = await me(t);
      return this.handleValidationResult(r), r;
    } catch (e) {
      return this.error = e instanceof Error ? e : new Error(String(e)), this.state = "error", this.config.onError?.(this.error), this.render(), null;
    }
  }
  async apply(e) {
    const t = {
      ...this.applyOptions,
      ...e
    }, r = t.selectedIndices || this.getSelectedIndices();
    if (r.length === 0)
      return this.error = new Error(this.config.labels.noRowsSelected), this.render(), null;
    if (this.config.capabilityGate) {
      const s = this.config.capabilityGate.gateAction("exchange", "import.apply");
      if (!s.enabled)
        return this.error = new Error(s.reason || this.config.labels.applyDisabledReason), this.render(), null;
    }
    this.state = "applying", this.error = null, this.render();
    try {
      const s = {
        rows: (this.validationResult?.results.filter((a) => r.includes(a.index)) || []).map((a) => {
          const o = this.previewRows.find((l) => l.index === a.index);
          return {
            ...a,
            resolution: o?.resolution
          };
        }),
        allow_create_missing: t.allowCreateMissing,
        allow_source_hash_override: t.allowSourceHashOverride,
        continue_on_error: t.continueOnError,
        dry_run: t.dryRun,
        async: t.async
      }, n = await C(this.config.applyEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify(s)
      });
      if (!n.ok) throw new Error(`Apply failed: ${n.status}`);
      const i = await me(n);
      return this.state = "applied", this.config.onApplyComplete?.(i), this.render(), i;
    } catch (s) {
      return this.error = s instanceof Error ? s : new Error(String(s)), this.state = "error", this.config.onError?.(this.error), this.render(), null;
    }
  }
  toggleRowSelection(e) {
    this.selection.allSelected ? this.selection.excluded.has(e) ? this.selection.excluded.delete(e) : this.selection.excluded.add(e) : this.selection.selected.has(e) ? this.selection.selected.delete(e) : this.selection.selected.add(e), this.updatePreviewRowSelection(), this.render();
  }
  selectAll() {
    this.selection.allSelected = !0, this.selection.excluded.clear(), this.updatePreviewRowSelection(), this.render();
  }
  deselectAll() {
    this.selection.allSelected = !1, this.selection.selected.clear(), this.selection.excluded.clear(), this.updatePreviewRowSelection(), this.render();
  }
  setRowResolution(e, t) {
    const r = this.previewRows.find((s) => s.index === e);
    r && (r.resolution = t, this.render());
  }
  setApplyOption(e, t) {
    this.applyOptions[e] = t, this.render();
  }
  reset() {
    this.state = "idle", this.validationResult = null, this.previewRows = [], this.selection = {
      selected: /* @__PURE__ */ new Set(),
      excluded: /* @__PURE__ */ new Set(),
      allSelected: !1
    }, this.error = null, this.file = null, this.rawData = "", this.render();
  }
  handleValidationResult(e) {
    this.validationResult = e, this.previewRows = e.results.map((t) => ({
      ...t,
      isSelected: t.status !== "error",
      resolution: t.status === "conflict" ? "skip" : void 0
    })), this.selection.allSelected = !0, this.selection.excluded = new Set(e.results.filter((t) => t.status === "error").map((t) => t.index)), this.state = "validated", this.config.onValidationComplete?.(e), this.render();
  }
  updatePreviewRowSelection() {
    this.previewRows = this.previewRows.map((e) => ({
      ...e,
      isSelected: this.selection.allSelected ? !this.selection.excluded.has(e.index) : this.selection.selected.has(e.index)
    }));
  }
  render() {
    if (!this.container) return;
    const e = this.config.labels;
    this.container.innerHTML = `
      <div class="exchange-import" role="region" aria-label="${d(e.title)}">
        ${this.renderHeader()}
        ${this.renderContent()}
        ${this.renderFooter()}
      </div>
    `, this.attachEventListeners();
  }
  renderHeader() {
    const e = this.config.labels;
    return `
      <div class="import-header">
        <h3 class="import-title">${d(e.title)}</h3>
        ${this.validationResult ? this.renderSummaryBadges() : ""}
      </div>
    `;
  }
  renderSummaryBadges() {
    if (!this.validationResult) return "";
    const e = this.validationResult.summary, t = this.config.labels;
    return `
      <div class="import-summary-badges">
        <span class="summary-badge success">${e.succeeded} ${d(t.success)}</span>
        <span class="summary-badge error">${e.failed} ${d(t.error)}</span>
        <span class="summary-badge conflict">${e.conflicts} ${d(t.conflict)}</span>
        <span class="summary-badge skipped">${e.skipped} ${d(t.skipped)}</span>
      </div>
    `;
  }
  renderContent() {
    switch (this.state) {
      case "idle":
        return this.renderFileInput();
      case "validating":
        return this.renderLoading(this.config.labels.validating);
      case "validated":
        return this.renderPreviewGrid();
      case "applying":
        return this.renderLoading(this.config.labels.applying);
      case "applied":
        return this.renderApplyResult();
      case "error":
        return this.renderError();
      default:
        return "";
    }
  }
  renderFileInput() {
    const e = this.config.labels;
    return `
      <div class="import-file-input">
        <label class="file-dropzone">
          <input type="file" accept=".csv,.json" class="file-input" />
          <span class="dropzone-text">${d(e.selectFile)}</span>
        </label>
        <div class="or-divider">or</div>
        <textarea class="data-input" placeholder="Paste JSON or CSV data here..." rows="5"></textarea>
      </div>
    `;
  }
  renderLoading(e) {
    return `
      <div class="import-loading" role="status" aria-busy="true">
        <div class="loading-spinner"></div>
        <p>${d(e)}</p>
      </div>
    `;
  }
  renderPreviewGrid() {
    const e = this.config.labels, t = this.getSelectedIndices().length, r = this.previewRows.length;
    return `
      <div class="import-preview">
        <div class="preview-toolbar">
          <div class="selection-controls">
            <button type="button" class="select-all-btn">${d(e.selectAll)}</button>
            <button type="button" class="deselect-all-btn">${d(e.deselectAll)}</button>
            <span class="selection-count">${t} / ${r} ${d(e.selectedCount)}</span>
          </div>
          <div class="import-options">
            <label class="option-checkbox">
              <input type="checkbox" name="allowCreateMissing" ${this.applyOptions.allowCreateMissing ? "checked" : ""} />
              ${d(e.allowCreateMissing)}
            </label>
            <label class="option-checkbox">
              <input type="checkbox" name="continueOnError" ${this.applyOptions.continueOnError ? "checked" : ""} />
              ${d(e.continueOnError)}
            </label>
            <label class="option-checkbox">
              <input type="checkbox" name="dryRun" ${this.applyOptions.dryRun ? "checked" : ""} />
              ${d(e.dryRun)}
            </label>
          </div>
        </div>
        <div class="preview-grid-container">
          <table class="preview-grid" role="grid">
            <thead>
              <tr>
                <th scope="col" class="select-col">
                  <input type="checkbox" class="select-all-checkbox" ${this.selection.allSelected && this.selection.excluded.size === 0 ? "checked" : ""} />
                </th>
                <th scope="col">${d(e.resource)}</th>
                <th scope="col">${d(e.field)}</th>
                <th scope="col">${d(e.status)}</th>
                <th scope="col">${d(e.translatedText)}</th>
                <th scope="col">${d(e.conflictResolution)}</th>
              </tr>
            </thead>
            <tbody>
              ${this.previewRows.map((s) => this.renderPreviewRow(s)).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }
  renderPreviewRow(e) {
    this.config.labels;
    const t = rt(e.status, "exchange"), r = e.status === "error", s = j(e.status, {
      domain: "exchange",
      size: "sm"
    });
    return `
      <tr class="preview-row ${t} ${e.isSelected ? "selected" : ""}" data-index="${e.index}">
        <td class="select-col">
          <input type="checkbox" class="row-checkbox" ${e.isSelected ? "checked" : ""} ${r ? "disabled" : ""} />
        </td>
        <td class="resource-cell">
          <span class="resource-type">${d(e.resource)}</span>
          <span class="entity-id">${d(e.entityId)}</span>
        </td>
        <td class="field-cell">${d(e.fieldPath)}</td>
        <td class="status-cell">
          ${s}
          ${e.error ? `<span class="error-message" title="${f(e.error)}">${d(Ca(e.error, 30))}</span>` : ""}
        </td>
        <td class="translation-cell">
          <span class="translation-text" title="${f(e.targetLocale)}">${d(e.targetLocale)}</span>
        </td>
        <td class="resolution-cell">
          ${e.status === "conflict" ? this.renderConflictResolution(e) : "-"}
        </td>
      </tr>
    `;
  }
  renderConflictResolution(e) {
    const t = this.config.labels, r = e.resolution || "skip";
    return `
      <select class="resolution-select" data-index="${e.index}">
        <option value="skip" ${r === "skip" ? "selected" : ""}>${d(t.skip)}</option>
        <option value="keep_current" ${r === "keep_current" ? "selected" : ""}>${d(t.keepCurrent)}</option>
        <option value="accept_incoming" ${r === "accept_incoming" ? "selected" : ""}>${d(t.acceptIncoming)}</option>
        <option value="force" ${r === "force" ? "selected" : ""}>${d(t.force)}</option>
      </select>
      ${e.conflict ? `<button type="button" class="conflict-details-btn" data-index="${e.index}" title="${f(t.conflictDetails)}">?</button>` : ""}
    `;
  }
  renderApplyResult() {
    return this.config.labels, `
      <div class="import-applied">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-12 h-12 text-green-500">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd" />
        </svg>
        <p class="applied-message">Import completed successfully</p>
        <button type="button" class="reset-btn">Import Another</button>
      </div>
    `;
  }
  renderError() {
    const e = this.config.labels;
    return `
      <div class="import-error" role="alert">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-10 h-10 text-red-500">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" />
        </svg>
        <p class="error-message">${d(this.error?.message || e.error)}</p>
        <button type="button" class="reset-btn">${d(e.cancelButton)}</button>
      </div>
    `;
  }
  renderFooter() {
    const e = this.config.labels, t = this.state === "validated" && this.getSelectedIndices().length > 0, r = this.getApplyGate();
    return `
      <div class="import-footer">
        <button type="button" class="cancel-btn">${d(e.cancelButton)}</button>
        ${this.state === "idle" ? `
          <button type="button" class="validate-btn" ${!this.file && !this.rawData ? "disabled" : ""}>
            ${d(e.validateButton)}
          </button>
        ` : ""}
        ${this.state === "validated" ? `
          <button type="button"
                  class="apply-btn"
                  ${!t || !r.enabled ? "disabled" : ""}
                  ${r.enabled ? "" : `aria-disabled="true" title="${f(r.reason || e.applyDisabledReason)}"`}>
            ${d(e.applyButton)}
          </button>
        ` : ""}
      </div>
    `;
  }
  getApplyGate() {
    return this.config.capabilityGate ? this.config.capabilityGate.gateAction("exchange", "import.apply") : {
      visible: !0,
      enabled: !0
    };
  }
  attachEventListeners() {
    this.container && (this.container.querySelector(".file-input")?.addEventListener("change", (e) => {
      const t = e.target;
      t.files?.[0] && this.setFile(t.files[0]);
    }), this.container.querySelector(".data-input")?.addEventListener("input", (e) => {
      const t = e.target;
      this.rawData = t.value;
    }), this.container.querySelector(".validate-btn")?.addEventListener("click", () => this.validate()), this.container.querySelector(".apply-btn")?.addEventListener("click", () => this.apply()), this.container.querySelector(".cancel-btn")?.addEventListener("click", () => this.reset()), this.container.querySelector(".reset-btn")?.addEventListener("click", () => this.reset()), this.container.querySelector(".select-all-btn")?.addEventListener("click", () => this.selectAll()), this.container.querySelector(".deselect-all-btn")?.addEventListener("click", () => this.deselectAll()), this.container.querySelector(".select-all-checkbox")?.addEventListener("change", (e) => {
      e.target.checked ? this.selectAll() : this.deselectAll();
    }), this.container.querySelectorAll(".row-checkbox").forEach((e) => {
      e.addEventListener("change", () => {
        const t = e.closest(".preview-row"), r = parseInt(t?.dataset.index || "", 10);
        isNaN(r) || this.toggleRowSelection(r);
      });
    }), this.container.querySelectorAll(".resolution-select").forEach((e) => {
      e.addEventListener("change", () => {
        const t = parseInt(e.dataset.index || "", 10);
        isNaN(t) || this.setRowResolution(t, e.value);
      });
    }), this.container.querySelectorAll(".option-checkbox input").forEach((e) => {
      e.addEventListener("change", () => {
        const t = e.name;
        t && this.setApplyOption(t, e.checked);
      });
    }));
  }
};
function Ca(e, t) {
  return e.length <= t ? e : e.slice(0, t - 3) + "...";
}
function Yl() {
  return `
    /* Exchange Import Styles */
    .exchange-import {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      padding: 1.5rem;
      background: white;
      border-radius: 0.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      max-height: 80vh;
      overflow: hidden;
    }

    .import-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .import-title {
      font-size: 1.25rem;
      font-weight: 600;
      color: #1f2937;
      margin: 0;
    }

    .import-summary-badges {
      display: flex;
      gap: 0.5rem;
    }

    .summary-badge {
      padding: 0.25rem 0.5rem;
      font-size: 0.75rem;
      font-weight: 500;
      border-radius: 9999px;
    }

    .summary-badge.success { background: #d1fae5; color: #059669; }
    .summary-badge.error { background: #fee2e2; color: #dc2626; }
    .summary-badge.conflict { background: #fef3c7; color: #d97706; }
    .summary-badge.skipped { background: #f3f4f6; color: #6b7280; }

    /* File Input */
    .import-file-input {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .file-dropzone {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      border: 2px dashed #d1d5db;
      border-radius: 0.5rem;
      cursor: pointer;
      transition: border-color 0.2s, background 0.2s;
    }

    .file-dropzone:hover {
      border-color: #2563eb;
      background: #eff6ff;
    }

    .file-input {
      display: none;
    }

    .dropzone-text {
      font-size: 0.875rem;
      color: #6b7280;
    }

    .or-divider {
      text-align: center;
      color: #9ca3af;
      font-size: 0.875rem;
    }

    .data-input {
      width: 100%;
      padding: 0.75rem;
      font-family: monospace;
      font-size: 0.875rem;
      border: 1px solid #d1d5db;
      border-radius: 0.375rem;
      resize: vertical;
    }

    /* Loading */
    .import-loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 3rem;
      color: #6b7280;
    }

    .loading-spinner {
      width: 2rem;
      height: 2rem;
      border: 2px solid #e5e7eb;
      border-top-color: #2563eb;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 1rem;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Preview Grid */
    .import-preview {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      flex: 1;
      overflow: hidden;
    }

    .preview-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .selection-controls {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .selection-count {
      font-size: 0.875rem;
      color: #6b7280;
    }

    .import-options {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .option-checkbox {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.875rem;
      color: #374151;
      cursor: pointer;
    }

    .preview-grid-container {
      flex: 1;
      overflow: auto;
      border: 1px solid #e5e7eb;
      border-radius: 0.375rem;
    }

    .preview-grid {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
    }

    .preview-grid th {
      position: sticky;
      top: 0;
      background: #f9fafb;
      padding: 0.75rem 0.5rem;
      text-align: left;
      font-weight: 500;
      color: #6b7280;
      border-bottom: 1px solid #e5e7eb;
    }

    .preview-grid td {
      padding: 0.5rem;
      border-bottom: 1px solid #f3f4f6;
      vertical-align: middle;
    }

    .preview-row.selected {
      background: #eff6ff;
    }

    .preview-row.status-error {
      opacity: 0.6;
    }

    .select-col {
      width: 40px;
      text-align: center;
    }

    .resource-cell {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
    }

    .resource-type {
      font-weight: 500;
      color: #1f2937;
    }

    .entity-id {
      font-size: 0.75rem;
      color: #9ca3af;
    }

    .status-badge {
      display: inline-block;
      padding: 0.125rem 0.375rem;
      font-size: 0.75rem;
      font-weight: 500;
      border-radius: 0.25rem;
    }

    .status-badge.status-success { background: #d1fae5; color: #059669; }
    .status-badge.status-error { background: #fee2e2; color: #dc2626; }
    .status-badge.status-conflict { background: #fef3c7; color: #d97706; }
    .status-badge.status-skipped { background: #f3f4f6; color: #6b7280; }

    .error-message {
      display: block;
      font-size: 0.75rem;
      color: #dc2626;
      margin-top: 0.125rem;
    }

    .resolution-select {
      padding: 0.25rem 0.5rem;
      font-size: 0.75rem;
      border: 1px solid #d1d5db;
      border-radius: 0.25rem;
    }

    .conflict-details-btn {
      padding: 0.125rem 0.375rem;
      font-size: 0.75rem;
      border: 1px solid #d1d5db;
      border-radius: 0.25rem;
      background: white;
      cursor: pointer;
      margin-left: 0.25rem;
    }

    /* Applied / Error states */
    .import-applied,
    .import-error {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 3rem;
      text-align: center;
    }

    .applied-message,
    .error-message {
      font-weight: 500;
      margin: 1rem 0;
    }

    .import-applied .applied-message { color: #059669; }
    .import-error .error-message { color: #dc2626; }

    /* Footer */
    .import-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding-top: 1rem;
      border-top: 1px solid #e5e7eb;
    }

    .cancel-btn,
    .validate-btn,
    .apply-btn,
    .reset-btn,
    .select-all-btn,
    .deselect-all-btn {
      padding: 0.5rem 1rem;
      font-size: 0.875rem;
      border-radius: 0.375rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .cancel-btn,
    .reset-btn,
    .select-all-btn,
    .deselect-all-btn {
      background: white;
      border: 1px solid #d1d5db;
      color: #374151;
    }

    .cancel-btn:hover,
    .reset-btn:hover,
    .select-all-btn:hover,
    .deselect-all-btn:hover {
      background: #f3f4f6;
    }

    .validate-btn,
    .apply-btn {
      background: #2563eb;
      border: none;
      color: white;
    }

    .validate-btn:hover,
    .apply-btn:hover {
      background: #1d4ed8;
    }

    .validate-btn:disabled,
    .apply-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .apply-btn[aria-disabled="true"] {
      opacity: 0.6;
      cursor: not-allowed;
    }
  `;
}
function $a(e, t) {
  const r = new Sa(t);
  return r.mount(e), r;
}
function Wl(e) {
  const t = e.dataset.validateEndpoint, r = e.dataset.applyEndpoint;
  return !t || !r ? (console.warn("ExchangeImport: Missing required data attributes"), null) : $a(e, {
    validateEndpoint: t,
    applyEndpoint: r
  });
}
var Aa = {
  title: "Job Progress",
  running: "In Progress",
  completed: "Completed",
  failed: "Failed",
  processed: "Processed",
  succeeded: "Succeeded",
  failedCount: "Failed",
  resume: "Resume",
  cancel: "Cancel",
  retry: "Retry",
  dismiss: "Dismiss",
  noActiveJob: "No active job",
  pollingPaused: "Polling paused",
  pollingStopped: "Polling stopped",
  jobId: "Job ID",
  startedAt: "Started",
  elapsed: "Elapsed",
  conflicts: "Conflicts"
}, Ea = 2e3, ka = 300, La = "async_job_", Ht = class {
  constructor(e = {}) {
    this.container = null, this.job = null, this.pollingState = "idle", this.pollTimer = null, this.pollAttempts = 0, this.startTime = null, this.error = null;
    const t = {
      ...Aa,
      ...e.labels || {}
    };
    this.config = {
      storageKeyPrefix: e.storageKeyPrefix || La,
      pollInterval: e.pollInterval || Ea,
      maxPollAttempts: e.maxPollAttempts || ka,
      onComplete: e.onComplete,
      onFailed: e.onFailed,
      onError: e.onError,
      onProgress: e.onProgress,
      labels: t,
      autoStart: e.autoStart !== !1
    };
  }
  mount(e) {
    this.container = e, this.render();
  }
  unmount() {
    this.stopPolling(), this.container && (this.container.innerHTML = ""), this.container = null;
  }
  getJob() {
    return this.job;
  }
  getPollingState() {
    return this.pollingState;
  }
  setJob(e) {
    this.job = e, this.startTime = /* @__PURE__ */ new Date(), this.pollAttempts = 0, this.error = null, this.persistJob(e), this.config.autoStart && e.status === "running" ? this.startPolling() : this.render();
  }
  startFromEnvelope(e) {
    this.setJob(e);
  }
  resumeFromStorage(e) {
    const t = this.loadPersistedJob(e);
    return t ? (this.job = {
      id: t.jobId,
      kind: t.kind,
      status: "running",
      poll_endpoint: t.pollEndpoint,
      progress: {
        processed: 0,
        succeeded: 0,
        failed: 0
      },
      created_at: t.startedAt,
      updated_at: t.lastPolledAt || t.startedAt
    }, this.startTime = new Date(t.startedAt), this.pollAttempts = 0, this.error = null, this.config.autoStart && this.startPolling(), !0) : !1;
  }
  hasPersistedJob(e) {
    return this.loadPersistedJob(e) !== null;
  }
  startPolling() {
    this.job && this.pollingState !== "polling" && (this.pollingState = "polling", this.error = null, this.schedulePoll(), this.render());
  }
  pausePolling() {
    this.pollingState === "polling" && (this.pollingState = "paused", this.pollTimer && (clearTimeout(this.pollTimer), this.pollTimer = null), this.render());
  }
  stopPolling() {
    this.pollingState = "stopped", this.pollTimer && (clearTimeout(this.pollTimer), this.pollTimer = null), this.clearPersistedJob(this.job?.kind || ""), this.render();
  }
  resumePolling() {
    this.pollingState === "paused" && (this.pollingState = "polling", this.schedulePoll(), this.render());
  }
  reset() {
    this.stopPolling(), this.job = null, this.pollingState = "idle", this.pollAttempts = 0, this.startTime = null, this.error = null, this.render();
  }
  retry() {
    this.job && (this.pollAttempts = 0, this.error = null, this.startPolling());
  }
  schedulePoll() {
    this.pollingState === "polling" && (this.pollTimer = setTimeout(() => {
      this.poll();
    }, this.config.pollInterval));
  }
  async poll() {
    if (!(!this.job || this.pollingState !== "polling")) {
      this.pollAttempts++;
      try {
        const e = await fetch(this.job.poll_endpoint, {
          method: "GET",
          headers: { Accept: "application/json" }
        });
        if (!e.ok) throw new Error(`Poll failed: ${e.status}`);
        const t = await e.json();
        this.handlePollResponse(t);
      } catch (e) {
        this.handlePollError(e instanceof Error ? e : new Error(String(e)));
      }
    }
  }
  handlePollResponse(e) {
    if (this.job = e, this.updatePersistedJob(e), this.config.onProgress?.(e), e.status === "completed") {
      this.pollingState = "stopped", this.clearPersistedJob(e.kind), this.config.onComplete?.(e), this.render();
      return;
    }
    if (e.status === "failed") {
      this.pollingState = "stopped", this.clearPersistedJob(e.kind), this.config.onFailed?.(e), this.render();
      return;
    }
    if (this.pollAttempts >= this.config.maxPollAttempts) {
      this.error = /* @__PURE__ */ new Error("Max polling attempts reached"), this.pollingState = "stopped", this.config.onError?.(this.error), this.render();
      return;
    }
    this.render(), this.schedulePoll();
  }
  handlePollError(e) {
    this.error = e, this.pollingState = "paused", this.config.onError?.(e), this.render();
  }
  getStorageKey(e) {
    return `${this.config.storageKeyPrefix}${e}`;
  }
  persistJob(e) {
    try {
      const t = {
        jobId: e.id,
        kind: e.kind,
        pollEndpoint: e.poll_endpoint,
        startedAt: e.created_at
      };
      localStorage.setItem(this.getStorageKey(e.kind), JSON.stringify(t));
    } catch {
    }
  }
  updatePersistedJob(e) {
    try {
      const t = this.getStorageKey(e.kind), r = localStorage.getItem(t);
      if (r) {
        const s = JSON.parse(r);
        s.lastPolledAt = (/* @__PURE__ */ new Date()).toISOString(), localStorage.setItem(t, JSON.stringify(s));
      }
    } catch {
    }
  }
  clearPersistedJob(e) {
    try {
      localStorage.removeItem(this.getStorageKey(e));
    } catch {
    }
  }
  loadPersistedJob(e) {
    try {
      const t = localStorage.getItem(this.getStorageKey(e));
      return t ? JSON.parse(t) : null;
    } catch {
      return null;
    }
  }
  render() {
    if (!this.container) return;
    const e = this.config.labels;
    this.container.innerHTML = `
      <div class="async-progress" role="region" aria-label="${d(e.title)}">
        ${this.renderHeader()}
        ${this.renderContent()}
        ${this.renderFooter()}
      </div>
    `, this.attachEventListeners();
  }
  renderHeader() {
    const e = this.config.labels;
    if (!this.job) return `
        <div class="progress-header idle">
          <h4 class="progress-title">${d(e.title)}</h4>
          <span class="progress-status">${d(e.noActiveJob)}</span>
        </div>
      `;
    const t = rt(this.job.status, "exchange"), r = this.getStatusLabel(), s = this.pollingState === "paused" ? `<span class="progress-status ${t}">${d(r)}</span>` : j(this.job.status, {
      domain: "exchange",
      size: "sm"
    });
    return `
      <div class="progress-header ${t}">
        <h4 class="progress-title">${d(e.title)}</h4>
        ${s}
      </div>
    `;
  }
  renderContent() {
    if (!this.job) return "";
    const e = this.config.labels, t = this.job.progress;
    t.total || t.processed + 1;
    const r = t.total ? Math.round(t.processed / t.total * 100) : null;
    return `
      <div class="progress-content">
        ${this.renderProgressBar(r)}
        <div class="progress-counters">
          <span class="counter processed">
            <span class="counter-label">${d(e.processed)}:</span>
            <span class="counter-value">${t.processed}${t.total ? ` / ${t.total}` : ""}</span>
          </span>
          <span class="counter succeeded">
            <span class="counter-label">${d(e.succeeded)}:</span>
            <span class="counter-value">${t.succeeded}</span>
          </span>
          <span class="counter failed">
            <span class="counter-label">${d(e.failedCount)}:</span>
            <span class="counter-value">${t.failed}</span>
          </span>
        </div>
        ${this.renderJobInfo()}
        ${this.renderConflictSummary()}
        ${this.renderError()}
      </div>
    `;
  }
  renderProgressBar(e) {
    return e === null ? `
        <div class="progress-bar-container">
          <div class="progress-bar indeterminate" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>
        </div>
      ` : `
      <div class="progress-bar-container">
        <div class="progress-bar"
             role="progressbar"
             aria-valuenow="${e}"
             aria-valuemin="0"
             aria-valuemax="100"
             style="width: ${e}%">
        </div>
        <span class="progress-percentage">${e}%</span>
      </div>
    `;
  }
  renderJobInfo() {
    if (!this.job) return "";
    const e = this.config.labels, t = this.getElapsedTime();
    return `
      <div class="progress-info">
        <span class="info-item">
          <span class="info-label">${d(e.jobId)}:</span>
          <code class="info-value">${d(this.job.id)}</code>
        </span>
        ${t ? `
          <span class="info-item">
            <span class="info-label">${d(e.elapsed)}:</span>
            <span class="info-value">${d(t)}</span>
          </span>
        ` : ""}
      </div>
    `;
  }
  renderConflictSummary() {
    if (!this.job?.conflict_summary || this.job.conflict_summary.total === 0) return "";
    const e = this.config.labels, t = this.job.conflict_summary;
    return `
      <div class="progress-conflicts">
        <span class="conflicts-header">
          <span class="conflicts-label">${d(e.conflicts)}:</span>
          <span class="conflicts-count">${t.total}</span>
        </span>
        <div class="conflicts-by-type">
          ${Object.entries(t.by_type).map(([r, s]) => `
              <span class="conflict-type">
                <span class="type-name">${d(r)}:</span>
                <span class="type-count">${s}</span>
              </span>
            `).join("")}
        </div>
      </div>
    `;
  }
  renderError() {
    const e = this.error?.message || this.job?.error;
    return e ? `
      <div class="progress-error" role="alert">
        <span class="error-message">${d(e)}</span>
      </div>
    ` : "";
  }
  renderFooter() {
    const e = this.config.labels, t = [];
    return this.pollingState === "paused" && t.push(`<button type="button" class="resume-btn">${d(e.resume)}</button>`), this.pollingState === "polling" && t.push(`<button type="button" class="cancel-btn">${d(e.cancel)}</button>`), (this.error || this.job?.status === "failed") && t.push(`<button type="button" class="retry-btn">${d(e.retry)}</button>`), (this.job?.status === "completed" || this.job?.status === "failed") && t.push(`<button type="button" class="dismiss-btn">${d(e.dismiss)}</button>`), t.length === 0 ? "" : `
      <div class="progress-footer">
        ${t.join("")}
      </div>
    `;
  }
  getStatusLabel() {
    const e = this.config.labels;
    if (this.pollingState === "paused") return e.pollingPaused;
    if (this.pollingState === "stopped" && !this.job?.status) return e.pollingStopped;
    switch (this.job?.status) {
      case "running":
        return e.running;
      case "completed":
        return e.completed;
      case "failed":
        return e.failed;
      default:
        return "";
    }
  }
  getElapsedTime() {
    if (!this.startTime) return null;
    const e = (/* @__PURE__ */ new Date()).getTime() - this.startTime.getTime(), t = Math.floor(e / 1e3);
    if (t < 60) return `${t}s`;
    const r = Math.floor(t / 60), s = t % 60;
    return r < 60 ? `${r}m ${s}s` : `${Math.floor(r / 60)}h ${r % 60}m`;
  }
  attachEventListeners() {
    this.container && (this.container.querySelector(".resume-btn")?.addEventListener("click", () => this.resumePolling()), this.container.querySelector(".cancel-btn")?.addEventListener("click", () => this.stopPolling()), this.container.querySelector(".retry-btn")?.addEventListener("click", () => this.retry()), this.container.querySelector(".dismiss-btn")?.addEventListener("click", () => this.reset()));
  }
};
function Xl() {
  return `
    /* Async Progress Styles */
    .async-progress {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding: 1rem;
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 0.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .progress-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .progress-title {
      font-size: 1rem;
      font-weight: 600;
      color: #1f2937;
      margin: 0;
    }

    .progress-status {
      padding: 0.25rem 0.5rem;
      font-size: 0.75rem;
      font-weight: 500;
      border-radius: 9999px;
    }

    .progress-status.status-running {
      background: #dbeafe;
      color: #2563eb;
    }

    .progress-status.status-completed {
      background: #d1fae5;
      color: #059669;
    }

    .progress-status.status-failed {
      background: #fee2e2;
      color: #dc2626;
    }

    .progress-content {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    /* Progress Bar */
    .progress-bar-container {
      position: relative;
      height: 8px;
      background: #e5e7eb;
      border-radius: 9999px;
      overflow: hidden;
    }

    .progress-bar {
      height: 100%;
      background: #2563eb;
      border-radius: 9999px;
      transition: width 0.3s ease;
    }

    .progress-bar.indeterminate {
      width: 30%;
      animation: progress-indeterminate 1.5s infinite ease-in-out;
    }

    @keyframes progress-indeterminate {
      0% { transform: translateX(-100%); }
      50% { transform: translateX(200%); }
      100% { transform: translateX(-100%); }
    }

    .progress-percentage {
      position: absolute;
      right: 0;
      top: 12px;
      font-size: 0.75rem;
      color: #6b7280;
    }

    /* Counters */
    .progress-counters {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .counter {
      display: flex;
      gap: 0.25rem;
      font-size: 0.875rem;
    }

    .counter-label {
      color: #6b7280;
    }

    .counter-value {
      font-weight: 500;
      color: #1f2937;
    }

    .counter.succeeded .counter-value {
      color: #059669;
    }

    .counter.failed .counter-value {
      color: #dc2626;
    }

    /* Job Info */
    .progress-info {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      padding-top: 0.5rem;
      border-top: 1px solid #f3f4f6;
    }

    .info-item {
      display: flex;
      gap: 0.5rem;
      font-size: 0.75rem;
    }

    .info-label {
      color: #9ca3af;
    }

    .info-value {
      color: #6b7280;
    }

    .info-value code {
      font-family: monospace;
      background: #f3f4f6;
      padding: 0.125rem 0.25rem;
      border-radius: 0.25rem;
    }

    /* Conflicts */
    .progress-conflicts {
      padding: 0.5rem;
      background: #fef3c7;
      border-radius: 0.375rem;
    }

    .conflicts-header {
      display: flex;
      gap: 0.25rem;
      font-size: 0.875rem;
      font-weight: 500;
      color: #92400e;
    }

    .conflicts-by-type {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
      margin-top: 0.25rem;
    }

    .conflict-type {
      font-size: 0.75rem;
      color: #b45309;
    }

    /* Error */
    .progress-error {
      padding: 0.5rem;
      background: #fee2e2;
      border-radius: 0.375rem;
    }

    .progress-error .error-message {
      font-size: 0.875rem;
      color: #dc2626;
    }

    /* Footer */
    .progress-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
      padding-top: 0.75rem;
      border-top: 1px solid #e5e7eb;
    }

    .resume-btn,
    .cancel-btn,
    .retry-btn,
    .dismiss-btn {
      padding: 0.375rem 0.75rem;
      font-size: 0.875rem;
      border-radius: 0.375rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .resume-btn,
    .retry-btn {
      background: #2563eb;
      border: none;
      color: white;
    }

    .resume-btn:hover,
    .retry-btn:hover {
      background: #1d4ed8;
    }

    .cancel-btn,
    .dismiss-btn {
      background: white;
      border: 1px solid #d1d5db;
      color: #374151;
    }

    .cancel-btn:hover,
    .dismiss-btn:hover {
      background: #f3f4f6;
    }
  `;
}
function _a(e, t) {
  const r = new Ht(t);
  return r.mount(e), r;
}
function Zl(e) {
  return _a(e, {
    pollInterval: e.dataset.pollInterval ? parseInt(e.dataset.pollInterval, 10) : void 0,
    autoStart: e.dataset.autoStart !== "false"
  });
}
function ec(e, t) {
  const r = new Ht(t);
  return r.hasPersistedJob(e) ? r : null;
}
var ge = {
  sourceColumn: "Source",
  targetColumn: "Translation",
  driftBannerTitle: "Source content has changed",
  driftBannerDescription: "The source content has been updated since this translation was last edited.",
  driftAcknowledgeButton: "Acknowledge",
  driftViewChangesButton: "View Changes",
  copySourceButton: "Copy from source",
  fieldChangedIndicator: "Source changed"
};
function Ra(e) {
  const t = {
    sourceHash: null,
    sourceVersion: null,
    changedFieldsSummary: {
      count: 0,
      fields: []
    },
    hasDrift: !1
  };
  if (!e || typeof e != "object") return t;
  const r = e.source_target_drift;
  if (r && typeof r == "object") {
    t.sourceHash = typeof r.source_hash == "string" ? r.source_hash : null, t.sourceVersion = typeof r.source_version == "string" ? r.source_version : null;
    const s = r.changed_fields_summary;
    s && typeof s == "object" && (t.changedFieldsSummary.count = typeof s.count == "number" ? s.count : 0, t.changedFieldsSummary.fields = Array.isArray(s.fields) ? s.fields.filter((n) => typeof n == "string") : []), t.hasDrift = t.changedFieldsSummary.count > 0 || t.changedFieldsSummary.fields.length > 0;
  }
  return t;
}
function Pa(e, t) {
  return !e || !e.hasDrift ? !1 : e.changedFieldsSummary.fields.some((r) => r.toLowerCase() === t.toLowerCase());
}
function tc(e) {
  return !e || !e.hasDrift ? [] : [...e.changedFieldsSummary.fields];
}
var Ta = class {
  constructor(e) {
    this.container = null, this.driftAcknowledged = !1;
    const t = typeof e.container == "string" ? document.querySelector(e.container) : e.container;
    this.config = {
      container: t,
      fields: e.fields,
      drift: e.drift,
      sourceLocale: e.sourceLocale,
      targetLocale: e.targetLocale,
      panelName: e.panelName,
      recordId: e.recordId,
      basePath: e.basePath || "/admin",
      onChange: e.onChange,
      onDriftAcknowledge: e.onDriftAcknowledge,
      onCopySource: e.onCopySource,
      labels: {
        ...ge,
        ...e.labels
      }
    }, this.container = t;
  }
  render() {
    if (!this.container) {
      console.warn("[SideBySideEditor] Container not found");
      return;
    }
    this.container.innerHTML = this.buildHTML(), this.attachEventListeners();
  }
  buildHTML() {
    const { drift: e, labels: t, sourceLocale: r, targetLocale: s, fields: n } = this.config, i = this.shouldShowDriftBanner() ? this.renderDriftBanner(e, t) : "", a = n.map((o) => this.renderFieldRow(o, t)).join("");
    return `
      <div class="side-by-side-editor" data-source-locale="${r}" data-target-locale="${s}">
        ${i}
        <div class="sbs-columns">
          <div class="sbs-header">
            <div class="sbs-column-header sbs-source-header">
              <span class="sbs-column-title">${d(t.sourceColumn)}</span>
              <span class="sbs-locale-badge">${r.toUpperCase()}</span>
            </div>
            <div class="sbs-column-header sbs-target-header">
              <span class="sbs-column-title">${d(t.targetColumn)}</span>
              <span class="sbs-locale-badge">${s.toUpperCase()}</span>
            </div>
          </div>
          <div class="sbs-fields">
            ${a}
          </div>
        </div>
      </div>
    `;
  }
  renderDriftBanner(e, t) {
    const r = {
      ...ge,
      ...t
    }, s = e.changedFieldsSummary.count, n = e.changedFieldsSummary.fields, i = n.length > 0 ? `<ul class="sbs-drift-fields-list">${n.map((a) => `<li>${d(a)}</li>`).join("")}</ul>` : "";
    return `
      <div class="sbs-drift-banner" role="alert" aria-live="polite" data-drift-banner="true">
        <div class="sbs-drift-icon">
          <svg class="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
          </svg>
        </div>
        <div class="sbs-drift-content">
          <h3 class="sbs-drift-title">${d(r.driftBannerTitle)}</h3>
          <p class="sbs-drift-description">
            ${d(r.driftBannerDescription)}
            ${s > 0 ? `<span class="sbs-drift-count">${s} field${s !== 1 ? "s" : ""} changed.</span>` : ""}
          </p>
          ${i}
        </div>
        <div class="sbs-drift-actions">
          <button type="button" class="sbs-drift-acknowledge" data-action="acknowledge-drift">
            ${d(r.driftAcknowledgeButton)}
          </button>
        </div>
      </div>
    `;
  }
  renderFieldRow(e, t) {
    const r = {
      ...ge,
      ...t
    }, s = e.hasSourceChanged ? `<span class="sbs-field-changed" title="${d(r.fieldChangedIndicator)}">
          <svg class="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clip-rule="evenodd" />
          </svg>
        </span>` : "", n = this.renderSourceField(e), i = this.renderTargetField(e), a = `
      <button type="button"
              class="sbs-copy-source"
              data-action="copy-source"
              data-field="${f(e.key)}"
              title="${f(r.copySourceButton)}"
              aria-label="${f(r.copySourceButton)} for ${f(e.label)}">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
        </svg>
      </button>
    `;
    return `
      <div class="${e.hasSourceChanged ? "sbs-field-row sbs-field-changed-row" : "sbs-field-row"}" data-field-key="${f(e.key)}">
        <div class="sbs-field-header">
          <label class="sbs-field-label">
            ${d(e.label)}
            ${e.required ? '<span class="sbs-required">*</span>' : ""}
          </label>
          ${s}
        </div>
        <div class="sbs-field-content">
          <div class="sbs-source-field">
            ${n}
          </div>
          <div class="sbs-field-actions">
            ${a}
          </div>
          <div class="sbs-target-field">
            ${i}
          </div>
        </div>
      </div>
    `;
  }
  renderSourceField(e) {
    const t = d(e.sourceValue || "");
    return e.type === "textarea" || e.type === "richtext" || e.type === "html" ? `
        <div class="sbs-source-content sbs-textarea-field"
             data-field="${f(e.key)}"
             aria-label="Source: ${f(e.label)}">
          ${t || '<span class="sbs-empty">Empty</span>'}
        </div>
      ` : `
      <div class="sbs-source-content sbs-text-field"
           data-field="${f(e.key)}"
           aria-label="Source: ${f(e.label)}">
        ${t || '<span class="sbs-empty">Empty</span>'}
      </div>
    `;
  }
  renderTargetField(e) {
    const t = d(e.targetValue || ""), r = e.placeholder ? `placeholder="${f(e.placeholder)}"` : "", s = e.required ? "required" : "", n = e.maxLength ? `maxlength="${e.maxLength}"` : "";
    return e.type === "textarea" || e.type === "richtext" || e.type === "html" ? `
        <textarea class="sbs-target-input sbs-textarea-input"
                  name="${f(e.key)}"
                  data-field="${f(e.key)}"
                  aria-label="Translation: ${f(e.label)}"
                  ${r}
                  ${s}
                  ${n}>${t}</textarea>
      ` : `
      <input type="text"
             class="sbs-target-input sbs-text-input"
             name="${f(e.key)}"
             data-field="${f(e.key)}"
             value="${t}"
             aria-label="Translation: ${f(e.label)}"
             ${r}
             ${s}
             ${n}>
    `;
  }
  shouldShowDriftBanner() {
    return !this.driftAcknowledged && this.config.drift !== null && this.config.drift.hasDrift;
  }
  attachEventListeners() {
    if (!this.container) return;
    const e = this.container.querySelector('[data-action="acknowledge-drift"]');
    e && e.addEventListener("click", () => this.acknowledgeDrift()), this.container.querySelectorAll('[data-action="copy-source"]').forEach((t) => {
      t.addEventListener("click", (r) => {
        const s = r.currentTarget.dataset.field;
        s && this.copySourceToTarget(s);
      });
    }), this.container.querySelectorAll(".sbs-target-input").forEach((t) => {
      t.addEventListener("input", (r) => {
        const s = r.target, n = s.dataset.field;
        n && this.config.onChange && this.config.onChange(n, s.value);
      });
    });
  }
  acknowledgeDrift() {
    this.driftAcknowledged = !0;
    const e = this.container?.querySelector("[data-drift-banner]");
    e && (e.classList.add("sbs-drift-acknowledged"), setTimeout(() => e.remove(), 300)), this.config.onDriftAcknowledge && this.config.onDriftAcknowledge();
  }
  copySourceToTarget(e) {
    const t = this.config.fields.find((s) => s.key === e);
    if (!t) return;
    const r = this.container?.querySelector(`.sbs-target-input[data-field="${e}"]`);
    if (r) {
      r.value = t.sourceValue || "";
      const s = new Event("input", { bubbles: !0 });
      r.dispatchEvent(s);
    }
    this.config.onCopySource && this.config.onCopySource(e);
  }
  getValues() {
    const e = {};
    return this.container && this.container.querySelectorAll(".sbs-target-input").forEach((t) => {
      const r = t.dataset.field;
      r && (e[r] = t.value);
    }), e;
  }
  setValue(e, t) {
    const r = this.container?.querySelector(`.sbs-target-input[data-field="${e}"]`);
    r && (r.value = t);
  }
  setFields(e) {
    this.config.fields = e, this.render();
  }
  setDrift(e) {
    this.config.drift = e, this.driftAcknowledged = !1, this.render();
  }
  isDriftAcknowledged() {
    return this.driftAcknowledged;
  }
  destroy() {
    this.container && (this.container.innerHTML = ""), this.container = null;
  }
};
function Da(e) {
  const t = new Ta(e);
  return t.render(), t;
}
function rc(e, t, r, s, n) {
  const i = Ra(t);
  return Da({
    container: e,
    fields: s.map((a) => ({
      key: a,
      label: a.replace(/_/g, " ").replace(/\b\w/g, (o) => o.toUpperCase()),
      type: "text",
      hasSourceChanged: Pa(i, a),
      sourceValue: String(r[a] || ""),
      targetValue: String(t[a] || ""),
      sourceLocale: n.sourceLocale || "en",
      targetLocale: n.targetLocale || ""
    })),
    drift: i,
    sourceLocale: n.sourceLocale || "en",
    targetLocale: n.targetLocale || "",
    panelName: n.panelName || "",
    recordId: n.recordId || "",
    ...n
  });
}
function sc() {
  return `
    /* Side-by-Side Editor Styles */
    .side-by-side-editor {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      width: 100%;
    }

    /* Drift Banner */
    .sbs-drift-banner {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 1rem;
      background-color: #fffbeb;
      border: 1px solid #fcd34d;
      border-radius: 0.5rem;
      transition: opacity 0.3s ease, transform 0.3s ease;
    }

    .sbs-drift-banner.sbs-drift-acknowledged {
      opacity: 0;
      transform: translateY(-0.5rem);
    }

    .sbs-drift-icon {
      flex-shrink: 0;
      color: #d97706;
    }

    .sbs-drift-content {
      flex: 1;
    }

    .sbs-drift-title {
      font-size: 0.875rem;
      font-weight: 600;
      color: #92400e;
      margin: 0 0 0.25rem 0;
    }

    .sbs-drift-description {
      font-size: 0.875rem;
      color: #b45309;
      margin: 0;
    }

    .sbs-drift-count {
      font-weight: 500;
    }

    .sbs-drift-fields-list {
      margin: 0.5rem 0 0 0;
      padding-left: 1.25rem;
      font-size: 0.75rem;
      color: #92400e;
    }

    .sbs-drift-actions {
      flex-shrink: 0;
    }

    .sbs-drift-acknowledge {
      padding: 0.375rem 0.75rem;
      font-size: 0.75rem;
      font-weight: 500;
      color: #92400e;
      background-color: white;
      border: 1px solid #fcd34d;
      border-radius: 0.375rem;
      cursor: pointer;
      transition: background-color 0.15s ease;
    }

    .sbs-drift-acknowledge:hover {
      background-color: #fef3c7;
    }

    /* Columns Layout */
    .sbs-columns {
      display: flex;
      flex-direction: column;
      gap: 0;
      border: 1px solid #e5e7eb;
      border-radius: 0.5rem;
      overflow: hidden;
    }

    .sbs-header {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      background-color: #f9fafb;
      border-bottom: 1px solid #e5e7eb;
    }

    .sbs-column-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
    }

    .sbs-source-header {
      border-right: 1px solid #e5e7eb;
    }

    .sbs-target-header {
      padding-left: calc(1rem + 2.5rem); /* Account for copy button column */
    }

    .sbs-column-title {
      font-size: 0.75rem;
      font-weight: 600;
      color: #374151;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .sbs-locale-badge {
      font-size: 0.625rem;
      font-weight: 600;
      padding: 0.125rem 0.375rem;
      background-color: #e5e7eb;
      color: #4b5563;
      border-radius: 0.25rem;
    }

    /* Fields */
    .sbs-fields {
      display: flex;
      flex-direction: column;
    }

    .sbs-field-row {
      border-bottom: 1px solid #e5e7eb;
    }

    .sbs-field-row:last-child {
      border-bottom: none;
    }

    .sbs-field-row.sbs-field-changed-row {
      background-color: #fffbeb;
    }

    .sbs-field-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      background-color: #f9fafb;
      border-bottom: 1px solid #e5e7eb;
    }

    .sbs-field-label {
      font-size: 0.875rem;
      font-weight: 500;
      color: #374151;
    }

    .sbs-required {
      color: #dc2626;
    }

    .sbs-field-changed {
      display: flex;
      align-items: center;
    }

    .sbs-field-content {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      min-height: 5rem;
    }

    .sbs-source-field,
    .sbs-target-field {
      padding: 0.75rem 1rem;
    }

    .sbs-source-field {
      background-color: #f9fafb;
      border-right: 1px solid #e5e7eb;
    }

    .sbs-source-content {
      font-size: 0.875rem;
      color: #6b7280;
      line-height: 1.5;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .sbs-empty {
      font-style: italic;
      color: #9ca3af;
    }

    .sbs-field-actions {
      display: flex;
      align-items: flex-start;
      padding: 0.75rem 0.5rem;
      background-color: #f3f4f6;
      border-right: 1px solid #e5e7eb;
    }

    .sbs-copy-source {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2rem;
      height: 2rem;
      color: #6b7280;
      background-color: white;
      border: 1px solid #d1d5db;
      border-radius: 0.375rem;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .sbs-copy-source:hover {
      color: #3b82f6;
      border-color: #3b82f6;
      background-color: #eff6ff;
    }

    .sbs-target-input {
      width: 100%;
      font-size: 0.875rem;
      line-height: 1.5;
      color: #111827;
      background-color: white;
      border: 1px solid #d1d5db;
      border-radius: 0.375rem;
      padding: 0.5rem 0.75rem;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }

    .sbs-target-input:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    .sbs-textarea-input {
      min-height: 6rem;
      resize: vertical;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .sbs-header {
        display: none;
      }

      .sbs-field-content {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .sbs-source-field,
      .sbs-field-actions,
      .sbs-target-field {
        border: none;
        padding: 0.5rem 1rem;
      }

      .sbs-source-field {
        background-color: #f9fafb;
        border-radius: 0.375rem;
      }

      .sbs-source-field::before {
        content: 'Source';
        display: block;
        font-size: 0.625rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: #6b7280;
        margin-bottom: 0.25rem;
      }

      .sbs-target-field::before {
        content: 'Translation';
        display: block;
        font-size: 0.625rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: #6b7280;
        margin-bottom: 0.25rem;
      }

      .sbs-field-actions {
        background: transparent;
        padding: 0 1rem;
      }
    }

    /* Dark mode support */
    @media (prefers-color-scheme: dark) {
      .sbs-drift-banner {
        background-color: #451a03;
        border-color: #92400e;
      }

      .sbs-drift-title {
        color: #fcd34d;
      }

      .sbs-drift-description {
        color: #fbbf24;
      }

      .sbs-drift-acknowledge {
        background-color: #1f2937;
        border-color: #92400e;
        color: #fcd34d;
      }

      .sbs-columns {
        border-color: #374151;
      }

      .sbs-header,
      .sbs-field-header,
      .sbs-source-field {
        background-color: #1f2937;
      }

      .sbs-column-title,
      .sbs-field-label {
        color: #e5e7eb;
      }

      .sbs-locale-badge {
        background-color: #374151;
        color: #d1d5db;
      }

      .sbs-source-content {
        color: #9ca3af;
      }

      .sbs-field-actions {
        background-color: #111827;
      }

      .sbs-copy-source {
        background-color: #1f2937;
        border-color: #4b5563;
        color: #9ca3af;
      }

      .sbs-target-input {
        background-color: #1f2937;
        border-color: #4b5563;
        color: #f3f4f6;
      }

      .sbs-field-row.sbs-field-changed-row {
        background-color: #451a03;
      }
    }
  `;
}
export {
  Ar as ActionRenderer,
  Qo as AdvancedSearch,
  Ht as AsyncProgress,
  jt as AutosaveIndicator,
  Ya as CORE_READINESS_DISPLAY,
  Ut as CapabilityGate,
  Vr as CellRendererRegistry,
  ta as CharacterCounter,
  cn as ColumnManager,
  Jo as CommonRenderers,
  ua as DEFAULT_FILTER_PRESETS,
  Gt as DEFAULT_INTERPOLATION_PATTERNS,
  ea as DEFAULT_SAMPLE_VALUES,
  ge as DEFAULT_SIDE_BY_SIDE_LABELS,
  Li as DEFAULT_STATUS_LEGEND_ITEMS,
  Dt as DEFAULT_TRANSLATION_QUICK_FILTERS,
  io as DISABLED_REASON_DISPLAY,
  Et as DataGrid,
  bi as DefaultColumnVisibilityBehavior,
  Ei as DetailActionsController,
  sa as DirectionToggle,
  bo as EXCHANGE_JOB_STATUS_DISPLAY,
  Qa as EXCHANGE_ROW_STATUS_DISPLAY,
  Sa as ExchangeImport,
  Me as FallbackBanner,
  Yo as FilterBuilder,
  rl as GoCrudBulkActionBehavior,
  tl as GoCrudExportBehavior,
  Xo as GoCrudFilterBehavior,
  Zo as GoCrudPaginationBehavior,
  Wo as GoCrudSearchBehavior,
  el as GoCrudSortBehavior,
  It as InlineLocaleChips,
  ra as InterpolationPreview,
  Ft as KeyboardShortcutRegistry,
  gt as LocalDataGridStateStore,
  le as LocaleActionChip,
  dt as PayloadInputModal,
  ts as PreferencesDataGridStateStore,
  go as QUEUE_CONTENT_STATE_DISPLAY,
  so as QUEUE_DUE_STATE_DISPLAY,
  no as QUEUE_STATE_DISPLAY,
  Ri as QuickFilters,
  Rt as SchemaActionBuilder,
  sl as ServerColumnVisibilityBehavior,
  Ta as SideBySideEditor,
  Tt as StatusLegend,
  ki as TranslationBlockerModal,
  Ti as TranslationPanel,
  ha as TranslatorDashboard,
  Fi as applyFormLock,
  la as applyGateToElement,
  Ji as applyShortcutSettings,
  Ye as buildLocaleEditUrl,
  nl as buildSchemaRowActions,
  ec as checkForPersistedJob,
  xo as collapseAllGroups,
  _a as createAsyncProgress,
  ml as createBulkCreateMissingHandler,
  We as createCapabilityGate,
  rs as createDataGridStateStore,
  Ul as createEmptyCapabilityGate,
  $a as createExchangeImport,
  El as createInlineLocaleChipsRenderer,
  Mr as createLocaleBadgeRenderer,
  ao as createReasonCodeCellRenderer,
  Da as createSideBySideEditor,
  Wa as createStatusCellRenderer,
  _i as createStatusLegend,
  Tl as createTranslationAutosave,
  Vo as createTranslationMatrixRenderer,
  hl as createTranslationPanel,
  Pi as createTranslationQuickFilters,
  Gi as createTranslationShortcuts,
  je as createTranslationStatusRenderer,
  ba as createTranslatorDashboard,
  gr as decodeExpandedGroupsToken,
  jl as detectInterpolations,
  Vi as dismissShortcutHint,
  wo as encodeExpandedGroupsToken,
  Di as executeBulkCreateMissing,
  mo as expandAllGroups,
  or as extractBackendSummaries,
  aa as extractCapabilities,
  ja as extractExchangeError,
  il as extractSchemaActions,
  Ra as extractSourceTargetDrift,
  _ as extractTranslationContext,
  A as extractTranslationReadiness,
  I as formatPaginationNumber,
  Bt as formatShortcutDisplay,
  Na as generateExchangeReport,
  st as getActionBlockDisplay,
  ro as getAllReasonCodes,
  Xl as getAsyncProgressStyles,
  Ml as getAutosaveIndicatorStyles,
  Vl as getCapabilityGateStyles,
  tc as getChangedFields,
  Nl as getCharCountSeverity,
  Rl as getDefaultShortcutRegistry,
  lo as getDisabledReasonDisplay,
  Yl as getExchangeImportStyles,
  yo as getExpandedGroupIds,
  Ol as getFieldHelperStyles,
  vl as getFormLockReason,
  E as getLocaleLabel,
  Ho as getMissingTranslationsCount,
  Ni as getModifierSymbol,
  cr as getPersistedExpandState,
  fr as getPersistedViewMode,
  ji as getPrimaryModifierLabel,
  Eo as getSeverityCssClass,
  sc as getSideBySideEditorStyles,
  rt as getStatusCssClass,
  Ee as getStatusDisplay,
  Za as getStatusVocabularyStyles,
  uo as getStatusesForDomain,
  Jl as getTranslatorDashboardStyles,
  Le as getViewModeForViewport,
  za as groupRowResultsByStatus,
  rn as handleDelete,
  dr as hasBackendGroupedRows,
  Pa as hasFieldDrift,
  Uo as hasMissingTranslations,
  To as hasTranslationContext,
  Fo as hasTranslationReadiness,
  Zl as initAsyncProgress,
  Kl as initCapabilityGating,
  Wl as initExchangeImport,
  Sl as initFallbackBanner,
  Bl as initFieldHelpers,
  Il as initFormAutosave,
  Cl as initFormLock,
  Al as initInlineLocaleChips,
  Qi as initKeyboardShortcuts,
  Pl as initKeyboardShortcutsWithDiscovery,
  bl as initLocaleActionChips,
  al as initPanelDetailActions,
  dl as initQuickFilters,
  rc as initSideBySideEditorFromRecord,
  ll as initStatusLegends,
  Ql as initTranslatorDashboard,
  ya as initTranslatorDashboardWithOptions,
  ho as initializeVocabularyFromPayload,
  Gl as isCoreEnabled,
  na as isExchangeEnabled,
  Ga as isExchangeError,
  yl as isFormLocked,
  Po as isInFallbackMode,
  ce as isMacPlatform,
  vo as isNarrowViewport,
  ia as isQueueEnabled,
  qo as isReadyForTransition,
  Hi as isShortcutHintDismissed,
  Xa as isValidReasonCode,
  to as isValidStatus,
  Ui as loadShortcutSettings,
  mr as mergeBackendSummaries,
  po as normalizeActionBlockCode,
  oo as normalizeActionState,
  Ja as normalizeActionStateMap,
  fo as normalizeActionStateMeta,
  So as normalizeActionStateRecord,
  hr as normalizeBackendGroupedRows,
  at as normalizeBulkActionStateConfig,
  ot as normalizeBulkActionStateMap,
  pr as normalizeBulkActionStateResponse,
  it as normalizeDetailActionStatePayload,
  br as normalizeListActionStatePayload,
  St as paginationWindow,
  zl as parseCapabilityMode,
  Ua as parseImportResult,
  nt as parseViewMode,
  Co as persistExpandState,
  Ao as persistViewMode,
  qi as removeFormLock,
  Dl as renderAutosaveIndicator,
  _r as renderAvailableLocalesIndicator,
  fl as renderBulkResultInline,
  pl as renderBulkResultSummary,
  Fl as renderCharacterCounter,
  Ai as renderDetailActions,
  ql as renderDirectionToggle,
  oa as renderDisabledReasonBadge,
  Ki as renderDiscoveryHint,
  wl as renderFallbackBannerFromRecord,
  Ko as renderFallbackWarning,
  Hl as renderGateAriaAttributes,
  lr as renderGroupHeaderRow,
  $o as renderGroupHeaderSummary,
  ir as renderGroupedEmptyState,
  sr as renderGroupedErrorState,
  wr as renderGroupedLoadingState,
  Oi as renderInlineLocaleChips,
  Mt as renderLocaleActionChip,
  gl as renderLocaleActionList,
  pt as renderLocaleBadge,
  zo as renderLocaleCompleteness,
  Go as renderMissingTranslationsBadge,
  nn as renderPaginationButtons,
  No as renderPublishReadinessBadge,
  ul as renderQuickFiltersHTML,
  jo as renderReadinessIndicator,
  yr as renderReasonCodeBadge,
  eo as renderReasonCodeIndicator,
  _l as renderShortcutSettingsUI,
  kl as renderShortcutsHelpContent,
  Oo as renderStatusBadge,
  cl as renderStatusLegendHTML,
  Io as renderTranslationAssignmentSummary,
  Bo as renderTranslationExchangeSummary,
  Do as renderTranslationFamilyLink,
  Mo as renderTranslationFamilyMemberCount,
  Tr as renderTranslationMatrixCell,
  Rr as renderTranslationStatusCell,
  j as renderVocabularyStatusBadge,
  ar as renderVocabularyStatusIcon,
  lt as resolveActionState,
  Ll as saveShortcutSettings,
  xl as shouldShowFallbackBanner,
  $l as shouldShowInlineLocaleChips,
  ol as showTranslationBlocker,
  co as toggleGroupExpand,
  nr as transformToGroups
};

//# sourceMappingURL=index.js.map