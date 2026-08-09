import { escapeAttribute as w, escapeHTML as f } from "./shared/html.js";
import { parseDateLike as kt } from "./shared/date-utils.js";
import { t as Ln } from "./chunks/stateful-controller-BhTsWevz.js";
import { httpRequest as j, readHTTPError as Tr, readHTTPJSON as Tn, readHTTPJSONObject as Qs, readHTTPJSONValue as Dn } from "./shared/transport/http-client.js";
import { createStructuredActionError as $t, executeActionRequest as Dr, executeStructuredRequest as Rn, extractErrorMessage as Zs, extractExchangeError as Hd, extractTranslationBlocker as ei, formatStructuredErrorForDisplay as ze, generateExchangeReport as Ud, getStructuredActionError as We, groupRowResultsByStatus as Vd, isExchangeError as Kd, isHandledActionError as Te, isTranslationBlocker as ti, parseImportResult as Jd } from "./toast/error-helpers.js";
import { n as ri, r as en } from "./chunks/modal-Cl0Dmdof.js";
import { t as He } from "./chunks/toast-manager-DYX_EcbR.js";
import { t as ni } from "./chunks/icon-renderer-DauoBn1n.js";
var Rr = "[data-action-menu], [data-dropdown]", Mn = "[data-action-menu-trigger], [data-dropdown-trigger]", Mr = "[data-action-menu-content], .actions-menu", si = '[role="menuitem"], [data-action-menu-item], .action-item', In = "hidden", It = /* @__PURE__ */ new Set(), ee = /* @__PURE__ */ new WeakMap(), Ir = /* @__PURE__ */ new WeakMap(), cr = /* @__PURE__ */ new WeakMap(), ii = [
  "position",
  "right",
  "bottom",
  "margin",
  "min-width",
  "max-width",
  "max-height",
  "left",
  "top"
], oi = [
  "--action-menu-z-index",
  "--action-menu-width",
  "--action-menu-min-width",
  "--action-menu-max-width",
  "--action-menu-max-height",
  "--action-menu-mobile-width",
  "--color-surface-raised",
  "--color-surface-subtle",
  "--color-border-default",
  "--color-text-primary",
  "--color-text-secondary",
  "--color-status-danger",
  "--color-focus-ring",
  "--datagrid-border",
  "--datagrid-row-hover",
  "--radius-surface",
  "--shadow-overlay"
], ai = [
  "background-color",
  "border-top-color",
  "border-right-color",
  "border-bottom-color",
  "border-left-color",
  "border-top-style",
  "border-right-style",
  "border-bottom-style",
  "border-left-style",
  "border-top-width",
  "border-right-width",
  "border-bottom-width",
  "border-left-width",
  "border-top-left-radius",
  "border-top-right-radius",
  "border-bottom-right-radius",
  "border-bottom-left-radius",
  "box-shadow",
  "color",
  "color-scheme",
  "font-family",
  "font-size",
  "font-weight",
  "line-height"
];
function li(e) {
  const t = e.target;
  return t && typeof t.closest == "function" ? t : null;
}
function Fe(e, t) {
  return "contains" in e && typeof e.contains == "function" ? e.contains(t) : !1;
}
function ci(e, t) {
  const r = /* @__PURE__ */ new Map();
  return t.forEach((n) => {
    r.set(n, {
      value: e.style.getPropertyValue(n),
      priority: e.style.getPropertyPriority(n)
    });
  }), r;
}
function di(e, t) {
  t.forEach(({ value: r, priority: n }, s) => {
    if (r) {
      e.style.setProperty(s, r, n);
      return;
    }
    e.style.removeProperty(s);
  });
}
function Pn(e) {
  const t = cr.get(e);
  t && (cr.delete(e), di(e, t));
}
function ui(e) {
  const t = /* @__PURE__ */ new Map(), r = e.ownerDocument.defaultView;
  if (!r) return t;
  const n = r.getComputedStyle(e), s = new Set(oi);
  for (let i = 0; i < n.length; i += 1) {
    const o = n.item(i);
    o.startsWith("--") && s.add(o);
  }
  return s.forEach((i) => {
    const o = n.getPropertyValue(i).trim();
    o && t.set(i, o);
  }), ai.forEach((i) => {
    const o = n.getPropertyValue(i).trim();
    o && t.set(i, o);
  }), t;
}
function fi(e, t) {
  t.forEach((r, n) => {
    e.style.setProperty(n, r);
  });
}
function hi(e, t = {}) {
  const r = t.containerSelector || Rr, n = t.menuSelector || Mr, s = e.closest(r), i = Ir.get(e) ?? s?.querySelector(n) ?? null;
  return !s || !i ? null : {
    container: s,
    trigger: e,
    menu: i
  };
}
function pi(e, t) {
  const { container: r, trigger: n, menu: s } = e;
  if (ee.has(s)) return;
  const i = s.ownerDocument, o = s.parentNode;
  if (!i.body || !o) return;
  const a = ui(s);
  ee.set(s, {
    container: r,
    trigger: n,
    root: t,
    parent: o,
    nextSibling: s.nextSibling,
    inlineStyle: s.getAttribute("style")
  }), It.add(s), Ir.set(n, s), i.body.appendChild(s), fi(s, a);
}
function mi(e) {
  const t = ee.get(e);
  if (t) {
    if (It.delete(e), ee.delete(e), Ir.delete(t.trigger), t.inlineStyle === null ? e.removeAttribute("style") : e.setAttribute("style", t.inlineStyle), !t.parent.isConnected) {
      e.remove();
      return;
    }
    if (t.nextSibling?.parentNode === t.parent) {
      t.parent.insertBefore(e, t.nextSibling);
      return;
    }
    t.parent.appendChild(e);
  }
}
function Xe(e, t = {}) {
  const r = t.hiddenClass || In;
  e.classList.add(r);
  const n = ee.get(e), s = n?.container ?? e.closest(t.containerSelector || Rr);
  (n?.trigger ?? s?.querySelector(t.triggerSelector || Mn))?.setAttribute("aria-expanded", "false"), Pn(e), mi(e);
}
function gi(e = document, t = {}) {
  const r = t.menuSelector || Mr, n = new Set(Array.from(e.querySelectorAll(r)));
  It.forEach((s) => {
    const i = ee.get(s);
    i && (i.root === e || Fe(e, i.trigger)) && n.add(s);
  }), n.forEach((s) => {
    Xe(s, t);
  });
}
function bi(e) {
  return e.getAttribute("aria-disabled") === "true" || e.dataset.disabled === "true";
}
function tn(e, t) {
  return Array.from(e.querySelectorAll(t)).filter((r) => !r.hasAttribute("disabled") && !r.hidden && r.getAttribute("aria-hidden") !== "true");
}
function Ut(e) {
  if (e)
    try {
      e.focus({ preventScroll: !0 });
    } catch {
      e.focus();
    }
}
function yi(e, t, r) {
  const n = new Set(Array.from(e.querySelectorAll(t)));
  return It.forEach((s) => {
    const i = ee.get(s);
    i && (i.root === e || Fe(e, i.trigger)) && n.add(s);
  }), Array.from(n).find((s) => !s.classList.contains(r)) ?? null;
}
function vi({ trigger: e, menu: t }) {
  Pn(t), cr.set(t, ci(t, ii));
  const r = e.getBoundingClientRect(), n = e.ownerDocument.defaultView ?? window, s = n.visualViewport, i = s?.offsetLeft ?? 0, o = s?.offsetTop ?? 0, a = s?.width ?? n.innerWidth, l = s?.height ?? n.innerHeight, c = 10, d = 8, u = Math.max(0, a - 20), h = Math.max(0, l - 20), p = n.getComputedStyle(t), m = (Zr, ht) => {
    const pt = Number.parseFloat(Zr);
    return Number.isFinite(pt) ? pt : ht;
  }, g = m(p.minWidth, 192), y = m(p.maxWidth, u), v = m(p.maxHeight, h), A = Math.min(y, u), C = i + a, L = o + l, B = Math.max(0, L - c - r.bottom - d), O = Math.max(0, r.top - o - c - d), P = Math.min(t.scrollHeight || t.offsetHeight || Math.min(300, h), v, h), me = P > B && O > B, q = Math.min(v, h, me ? O : B);
  t.style.position = "fixed", t.style.right = "auto", t.style.bottom = "auto", t.style.margin = "0", t.style.minWidth = `${Math.min(g, A)}px`, t.style.maxWidth = `${A}px`, t.style.maxHeight = `${q}px`;
  const ge = Math.min(t.offsetWidth || 224, u), X = Math.min(t.offsetHeight || P, q), we = r.right - ge, J = i + c, le = Math.max(J, C - ge - c), xe = Math.min(Math.max(J, we), le), re = me ? r.top - X - d : r.bottom + d, Se = o + c, Ce = Math.max(Se, L - X - c), Ht = Math.min(Math.max(Se, re), Ce);
  t.style.left = `${xe}px`, t.style.top = `${Ht}px`;
}
function wi(e = document, t = {}) {
  const r = t.triggerSelector || Mn, n = t.itemSelector || si, s = t.hiddenClass || In, i = t.menuSelector || Mr, o = t.positionMenu, a = e.nodeType === 9 ? e : e.ownerDocument || document, l = [], c = {
    closeAll: () => gi(e, t),
    destroy: () => {
      for (c.closeAll(); l.length > 0; ) l.pop()?.();
    }
  };
  e.querySelectorAll(i).forEach((p) => {
    p.classList.contains(s) || p.classList.add(s);
  });
  const d = (p) => {
    const m = li(p);
    if (!m) return;
    const g = m.closest(r);
    if (g && Fe(e, g)) {
      const P = hi(g, t);
      if (!P) return;
      if (p.stopPropagation(), !P.menu.classList.contains(s)) {
        Xe(P.menu, t);
        return;
      }
      c.closeAll(), P.menu.classList.remove(s), P.trigger.setAttribute("aria-expanded", "true"), t.portal && pi(P, e), o && o({
        ...P,
        opening: !0
      }), Ut(tn(P.menu, n)[0]);
      return;
    }
    const y = m.closest(n), v = y?.closest(i) ?? null, A = v ? ee.get(v) : void 0, C = !!(v && (Fe(e, v) || A?.root === e));
    if (y && C) {
      if (bi(y)) {
        p.preventDefault(), p.stopPropagation();
        return;
      }
      Xe(v, t);
      return;
    }
    const L = t.outsideIgnoreSelector;
    if (L && m.closest(L)) return;
    const B = m.closest(i), O = B ? ee.get(B) : void 0;
    B && (Fe(e, B) || O?.root === e) || c.closeAll();
  }, u = (p) => {
    const m = yi(e, i, s);
    if (!m) return;
    const g = tn(m, n), y = a.activeElement, v = y ? g.indexOf(y) : -1;
    if (p.key === "Escape") {
      const C = ee.get(m)?.trigger ?? m.closest(t.containerSelector || Rr)?.querySelector(r) ?? null;
      p.preventDefault(), p.stopPropagation(), Xe(m, t), C?.isConnected && Ut(C);
      return;
    }
    let A = null;
    p.key === "ArrowDown" ? A = v < 0 ? 0 : (v + 1) % g.length : p.key === "ArrowUp" ? A = v < 0 ? g.length - 1 : (v - 1 + g.length) % g.length : p.key === "Home" ? A = 0 : p.key === "End" && (A = g.length - 1), A !== null && g.length > 0 && (p.preventDefault(), p.stopPropagation(), Ut(g[A]));
  };
  a.addEventListener("click", d), a.addEventListener("keydown", u), l.push(() => a.removeEventListener("click", d)), l.push(() => a.removeEventListener("keydown", u));
  const h = a.defaultView;
  if (h && (t.portal || o)) {
    const p = () => c.closeAll(), m = (g) => {
      const y = g.target;
      if (y && typeof y.closest == "function") {
        const v = y.closest(i), A = v ? ee.get(v) : void 0;
        if (v && (Fe(e, v) || A?.root === e)) return;
      }
      c.closeAll();
    };
    h.addEventListener("pagehide", p), h.addEventListener("pageshow", p), h.addEventListener("resize", p), h.visualViewport?.addEventListener("resize", p), h.visualViewport?.addEventListener("scroll", p), a.addEventListener("scroll", m, !0), l.push(() => h.removeEventListener("pagehide", p)), l.push(() => h.removeEventListener("pageshow", p)), l.push(() => h.removeEventListener("resize", p)), l.push(() => h.visualViewport?.removeEventListener("resize", p)), l.push(() => h.visualViewport?.removeEventListener("scroll", p)), l.push(() => a.removeEventListener("scroll", m, !0));
  }
  if (t.signal) {
    const p = () => c.destroy();
    t.signal.addEventListener("abort", p, { once: !0 }), l.push(() => t.signal?.removeEventListener("abort", p));
  }
  return c;
}
var Bn = { async prompt(e) {
  const { PayloadInputModal: t } = await import("./chunks/payload-modal-aASOivKe.js");
  return t.prompt(e);
} }, xi = 0, Si = class {
  constructor(e = {}) {
    this.actionBasePath = e.actionBasePath || "", this.mode = e.mode || "dropdown", this.notifier = e.notifier || new He();
    const t = this.sanitize(e.domIdPrefix || "grid") || "grid";
    this.domNamespace = `${t}-${++xi}`, this.rowRenderSeq = 0;
  }
  renderRowActions(e, t) {
    const r = `${this.domNamespace}-row-${++this.rowRenderSeq}`;
    if (this.mode === "dropdown") return this.renderRowActionsDropdown(e, t, r);
    const n = this.getVisibleActions(e, t);
    return n.length === 0 ? '<div class="admin-datagrid__action-list flex justify-end gap-2"></div>' : `<div class="admin-datagrid__action-list flex justify-end gap-2">${n.map(({ action: s, sourceIndex: i }) => {
      const o = this.getVariantClass(s.variant || "secondary"), a = s.icon ? this.renderIcon(s.icon) : "", l = s.className || "", c = s.disabled === !0, d = this.getActionKey(s, i), u = c ? "opacity-50 cursor-not-allowed" : "", h = c ? 'aria-disabled="true"' : "", p = c && s.disabledReason ? `${r}-${d}-disabled-reason` : "", m = p ? `aria-describedby="${w(p)}"` : "", g = c && s.disabledReason ? `${s.label} unavailable: ${s.disabledReason}` : s.label, y = p ? `<span id="${w(p)}" class="sr-only">${f(s.disabledReason || "Action unavailable")}</span>` : "", v = s.disabledReason ? `title="${w(s.disabledReason)}"` : "";
      return `
        <button
          type="button"
          class="admin-datagrid__action btn btn-sm ${w(o)} ${w(l)} ${u}"
          data-action-id="${w(this.sanitize(s.label))}"
          data-action-key="${w(d)}"
          data-record-id="${w(e.id)}"
          data-disabled="${c}"
          ${h}
          aria-label="${w(g)}"
          ${m}
          ${v}
        >
          ${a}
          ${f(s.label)}
        </button>
        ${y}
      `;
    }).join("")}</div>`;
  }
  renderRowActionsDropdown(e, t, r) {
    const n = this.getVisibleActions(e, t);
    if (n.length === 0) return '<div class="admin-datagrid__actions-empty text-sm text-gray-400">No actions</div>';
    const s = `${r}-menu`, i = this.buildDropdownItems(e, n, r);
    return `
      <div class="actions-dropdown" data-dropdown>
        <button type="button"
                class="actions-menu-trigger"
                data-dropdown-trigger
                aria-label="Actions menu"
                aria-haspopup="true"
                aria-expanded="false"
                aria-controls="${w(s)}">
          ${this.renderDotsIcon()}
        </button>

        <div id="${w(s)}"
             class="actions-menu hidden"
             role="menu"
             aria-orientation="vertical">
          ${i}
        </div>
      </div>
    `;
  }
  buildDropdownItems(e, t, r) {
    return t.map(({ action: n, sourceIndex: s }, i) => {
      const o = n.variant === "danger", a = n.disabled === !0, l = this.getActionKey(n, s), c = n.icon ? this.renderIcon(n.icon) : "", d = this.shouldShowDivider(n, i), u = a ? (n.disabledReason || "Action unavailable").trim() : "", h = u ? `${r}-${l}-disabled-reason` : "", p = d ? '<div class="action-divider"></div>' : "", m = a ? "action-item action-item--disabled" : o ? "action-item action-item--danger" : "action-item", g = a ? 'aria-disabled="true"' : "", y = h ? `aria-describedby="${w(h)}"` : "", v = u ? `${n.label} unavailable: ${u}` : n.label, A = n.disabledReason ? `title="${w(n.disabledReason)}"` : "", C = u ? `<span id="${w(h)}" class="action-item-reason">${f(u)}</span>` : "";
      return `
        ${p}
        <button type="button"
                class="${w(m)}"
                data-action-id="${w(this.sanitize(n.label))}"
                data-action-key="${w(l)}"
                data-record-id="${w(e.id)}"
                data-disabled="${a}"
                role="menuitem"
                ${g}
                aria-label="${w(v)}"
                ${y}
                ${A}>
          <span class="action-item__icon">${c}</span>
          <span class="action-item__content">
            <span class="action-item__label">${f(n.label)}</span>
            ${C}
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
  attachRowActionListeners(e, t, r, n = {}) {
    t.forEach((s, i) => {
      const o = this.getActionKey(s, i), a = e.querySelector(`[data-action-key="${o}"]`);
      a && a.addEventListener("click", async (l) => {
        if (l.preventDefault(), a.getAttribute("aria-disabled") === "true" || a.dataset.disabled === "true") return;
        const c = a.closest(".actions-menu");
        c && Xe(c);
        try {
          await s.action(r);
        } catch (d) {
          if (console.error(`Action "${s.label}" failed:`, d), n.onError) {
            await n.onError(d, s, r);
            return;
          }
          const u = d instanceof Error ? d.message : `Action "${s.label}" failed`;
          this.notifier.error(u);
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
    n.className = "flex gap-2 flex-1", e.forEach((i) => {
      const o = document.createElement("button");
      o.type = "button", o.className = "btn btn-sm btn-primary", o.dataset.bulkAction = i.id, i.icon ? o.innerHTML = `${this.renderIcon(i.icon)} ${i.label}` : o.textContent = i.label, n.appendChild(o);
    }), t.appendChild(n);
    const s = document.createElement("button");
    return s.type = "button", s.className = "btn btn-sm btn-secondary", s.id = "clear-selection-btn", s.textContent = "Clear Selection", t.appendChild(s), t;
  }
  async executeBulkAction(e, t) {
    if (e.guard && !e.guard(t)) {
      console.warn(`Bulk action "${e.id}" guard failed`);
      return;
    }
    if (e.confirm) {
      const n = e.confirm.replace("{count}", t.length.toString());
      if (!await this.notifier.confirm(n)) return;
    }
    const r = await this.resolveBulkActionPayload(e, t);
    if (r !== null)
      try {
        const n = await Rn(e.endpoint, {
          method: e.method || "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json"
          },
          body: JSON.stringify(r)
        }, async (i) => {
          const o = await Dn(i, void 0);
          return {
            success: !0,
            data: o === void 0 ? void 0 : o
          };
        });
        if (!n.success) {
          const i = n.error, o = i ? ze(i, `Bulk action '${e.id}' failed`) : `Bulk action '${e.id}' failed`;
          throw e.onError || this.notifier.error(o), i ? $t(i, `Bulk action '${e.id}' failed`, !0) : $t({
            textCode: null,
            message: o,
            metadata: null,
            fields: null,
            validationErrors: null
          }, `Bulk action '${e.id}' failed`, !0);
        }
        const s = n.data;
        this.notifier.success(this.buildBulkSuccessMessage(e, s, t.length)), e.onSuccess && e.onSuccess(s);
      } catch (n) {
        if (console.error(`Bulk action "${e.id}" failed:`, n), !e.onError && !Te(n)) {
          const s = n instanceof Error ? n.message : "Bulk action failed";
          this.notifier.error(s);
        }
        throw e.onError && e.onError(n), n;
      }
  }
  async resolveBulkActionPayload(e, t) {
    const r = {
      ...e.payload || {},
      ids: t
    }, n = this.normalizePayloadSchema(e.payloadSchema);
    n?.properties && Object.entries(n.properties).forEach(([o, a]) => {
      r[o] === void 0 && a && a.default !== void 0 && (r[o] = a.default);
    });
    const s = this.collectRequiredFields(e.payloadRequired, n).filter((o) => o !== "ids" && this.isEmptyPayloadValue(r[o]));
    if (s.length === 0) return r;
    const i = await this.requestRequiredFields(e, s, n, r);
    if (i === null) return null;
    for (const o of s) {
      const a = n?.properties?.[o], l = i[o] ?? "", c = this.coercePromptValue(l, o, a);
      if (c.error)
        return this.notifier.error(c.error), null;
      r[o] = c.value;
    }
    return r;
  }
  collectRequiredFields(e, t) {
    const r = [], n = /* @__PURE__ */ new Set(), s = (i) => {
      const o = i.trim();
      !o || n.has(o) || (n.add(o), r.push(o));
    };
    return Array.isArray(e) && e.forEach((i) => s(String(i))), Array.isArray(t?.required) && t.required.forEach((i) => s(String(i))), r;
  }
  normalizePayloadSchema(e) {
    if (!e || typeof e != "object") return null;
    const t = e.properties;
    let r;
    return t && typeof t == "object" && (r = {}, Object.entries(t).forEach(([n, s]) => {
      s && typeof s == "object" && (r[n] = s);
    })), {
      type: typeof e.type == "string" ? e.type : void 0,
      required: e.required,
      properties: r
    };
  }
  async requestRequiredFields(e, t, r, n) {
    const s = t.map((i) => {
      const o = r?.properties?.[i], a = typeof o?.type == "string" ? o.type.toLowerCase() : "string";
      return {
        name: i,
        label: (o?.title || i).trim(),
        description: (o?.description || "").trim() || void 0,
        value: this.stringifyPromptDefault(n[i] !== void 0 ? n[i] : o?.default),
        type: a,
        options: this.buildSchemaOptions(o)
      };
    });
    return Bn.prompt({
      title: `Complete ${e.label || e.id}`,
      fields: s
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
      const i = r.oneOf.find((o) => o && Object.prototype.hasOwnProperty.call(o, "const") && this.stringifyPromptDefault(o.const) === e);
      return !i || !Object.prototype.hasOwnProperty.call(i, "const") ? {
        value: e,
        error: `${t} must be one of: ${r.oneOf.map((o) => typeof o?.title == "string" && o.title.trim() ? o.title.trim() : this.stringifyPromptDefault(o.const)).filter((o) => o !== "").join(", ")}`
      } : { value: i.const };
    }
    const n = (r?.type || "string").toLowerCase();
    if (e === "") return { value: "" };
    let s = e;
    switch (n) {
      case "integer": {
        const i = Number.parseInt(e, 10);
        if (Number.isNaN(i)) return {
          value: e,
          error: `${t} must be an integer.`
        };
        s = i;
        break;
      }
      case "number": {
        const i = Number.parseFloat(e);
        if (Number.isNaN(i)) return {
          value: e,
          error: `${t} must be a number.`
        };
        s = i;
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
          s = !0;
          break;
        }
        if ([
          "false",
          "0",
          "no",
          "n",
          "off"
        ].includes(i)) {
          s = !1;
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
          if (n === "array" && !Array.isArray(i)) return {
            value: e,
            error: `${t} must be a JSON array.`
          };
          if (n === "object" && (i === null || Array.isArray(i) || typeof i != "object")) return {
            value: e,
            error: `${t} must be a JSON object.`
          };
          s = i;
        } catch {
          return {
            value: e,
            error: `${t} must be valid JSON.`
          };
        }
        break;
      default:
        s = e;
    }
    return Array.isArray(r?.enum) && r.enum.length > 0 && !r.enum.some((i) => i === s || String(i) === String(s)) ? {
      value: s,
      error: `${t} must be one of: ${r.enum.map((i) => String(i)).join(", ")}`
    } : { value: s };
  }
  isEmptyPayloadValue(e) {
    return e == null ? !0 : typeof e == "string" ? e.trim() === "" : Array.isArray(e) ? e.length === 0 : typeof e == "object" ? Object.keys(e).length === 0 : !1;
  }
  buildBulkSuccessMessage(e, t, r) {
    const n = e.label || e.id || "Bulk action", s = t && typeof t == "object" ? t.summary : null, i = s && typeof s.succeeded == "number" ? s.succeeded : typeof t?.processed == "number" ? t.processed : r, o = s && typeof s.failed == "number" ? s.failed : 0;
    return o > 0 ? `${n} completed: ${i} succeeded, ${o} failed.` : `${n} completed for ${i} item${i === 1 ? "" : "s"}.`;
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
};
function Ci(e, t, r) {
  const n = t.toLowerCase(), s = e === "status" ? "status-badge" : e === "role" ? "role-badge" : "badge", i = e === "status" ? "status" : e === "role" ? "role" : "badge", o = [s];
  return r === "sm" && o.push(`${s}--sm`), o.push(`${i}-${n}`), o.join(" ");
}
function _t(e, t, r, n) {
  const s = [Ci(t, r, n?.size)];
  n?.uppercase && s.push("badge--uppercase"), n?.extraClass && s.push(n.extraClass);
  let i = "";
  return n?.attrs && (i = Object.entries(n.attrs).map(([o, a]) => a === "" ? ` ${o}` : ` ${o}="${w(a)}"`).join("")), `<span class="${s.join(" ")}"${i}>${f(e)}</span>`;
}
var Ei = '<svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path fill-rule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clip-rule="evenodd"/></svg>', Ai = '<svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path fill-rule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm-1.72 6.97a.75.75 0 1 0-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 1 0 1.06 1.06L12 13.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L13.06 12l1.72-1.72a.75.75 0 1 0-1.06-1.06L12 10.94l-1.72-1.72Z" clip-rule="evenodd"/></svg>';
function ki(e, t) {
  const r = e ? t?.trueLabel ?? "Yes" : t?.falseLabel ?? "No";
  return `<span class="badge badge-${e ? "boolean-true" : "boolean-false"}">${e ? Ei : Ai}${f(r)}</span>`;
}
function Vt(e) {
  return typeof e == "string" ? e.trim() : "";
}
function te(e) {
  return (typeof e == "string" ? e.trim() : "") || void 0;
}
function oe(e) {
  return !!e && typeof e == "object" && !Array.isArray(e);
}
function $i(e) {
  if (!e || typeof e != "object" || Array.isArray(e)) return null;
  const t = e, r = te(t.label), n = te(t.href), s = te(t.kind);
  return !r && !n && !s ? null : {
    ...r ? { label: r } : {},
    ...n ? { href: n } : {},
    ...s ? { kind: s } : {}
  };
}
function _i(e) {
  if (!Array.isArray(e)) return;
  const t = e.map((r) => te(r)).filter((r) => !!r);
  return t.length > 0 ? t : void 0;
}
function Li(e) {
  return [
    "enabled",
    "reason",
    "reason_code",
    "severity",
    "kind",
    "permission",
    "metadata",
    "remediation",
    "available_transitions"
  ].some((t) => t in e);
}
function Ti(e) {
  if (typeof e != "number" || !Number.isFinite(e)) return;
  const t = Math.trunc(e);
  return t > 0 ? t : void 0;
}
function On(e, t = 0) {
  return !e || t > 2 ? "" : Vt(e.reason_code) || Vt(e.textCode) || Vt(e.text_code) || On(e.error ?? void 0, t + 1);
}
function Pr(e) {
  if (typeof e == "string") return e.trim().toUpperCase() || null;
  if (!e || typeof e != "object" || Array.isArray(e)) return null;
  const t = On(e);
  return t ? t.toUpperCase() : null;
}
function Di(e) {
  if (!e || typeof e != "object" || Array.isArray(e)) return null;
  const t = e;
  if (!Li(t)) return null;
  const r = Pr({ reason_code: t.reason_code }), n = { enabled: typeof t.enabled == "boolean" ? t.enabled : !1 }, s = te(t.reason), i = te(t.severity), o = te(t.kind), a = te(t.permission), l = t.metadata && typeof t.metadata == "object" && !Array.isArray(t.metadata) ? t.metadata : null, c = $i(t.remediation), d = _i(t.available_transitions);
  return s && (n.reason = s), r && (n.reason_code = r), i && (n.severity = i), o && (n.kind = o), a && (n.permission = a), l && (n.metadata = l), c && (n.remediation = c), d && (n.available_transitions = d), n;
}
function Br(e) {
  if (!oe(e)) return {};
  const t = e, r = {};
  for (const [n, s] of Object.entries(t)) {
    const i = te(n), o = Di(s);
    !i || !o || (r[i] = o);
  }
  return r;
}
function Pt(e) {
  return Br(e);
}
function Or(e) {
  if (!oe(e)) return null;
  const t = e.selection_sensitive === !0, r = te(e.selection_state_endpoint), n = Ti(e.debounce_ms);
  if (!t && !r && n === void 0) return null;
  const s = {};
  return t && (s.selection_sensitive = !0), r && (s.selection_state_endpoint = r), n !== void 0 && (s.debounce_ms = n), s;
}
function Fn(e) {
  if (!oe(e)) return null;
  const t = Br(e._action_state);
  return Object.keys(t).length === 0 ? { ...e } : {
    ...e,
    _action_state: t
  };
}
function Ri(e) {
  if (!oe(e)) return null;
  const t = Pt(e.bulk_action_state);
  return Object.keys(t).length === 0 ? { ...e } : {
    ...e,
    bulk_action_state: t
  };
}
function Mi(e) {
  if (!oe(e)) return null;
  const t = Pt(e.bulk_action_state);
  if (Object.keys(t).length === 0) return null;
  const r = { bulk_action_state: t };
  return oe(e.selection) && (r.selection = e.selection), r;
}
function Ii(e) {
  if (!oe(e)) return null;
  const t = Array.isArray(e.data) ? e.data : Array.isArray(e.records) ? e.records : null, r = t && t.map((i) => Fn(i) ?? i), n = Ri(e.$meta), s = { ...e };
  if (r && (Array.isArray(e.data) && (s.data = r), Array.isArray(e.records) && (s.records = r)), n && (s.$meta = n), oe(e.schema)) {
    const i = Or(e.schema.bulk_action_state_config);
    i && (s.schema = {
      ...e.schema,
      bulk_action_state_config: i
    });
  }
  return s;
}
function qn(e) {
  return oe(e) ? oe(e.data) ? {
    ...e,
    data: Fn(e.data)
  } : { ...e } : null;
}
function Nn(e, t) {
  const r = te(t);
  return r && Br(e._action_state)[r] || null;
}
var jn = {
  draft: {
    tone: "neutral",
    label: "Draft",
    icon: "edit-pencil"
  },
  open: {
    tone: "info",
    label: "Open",
    icon: "mail-in"
  },
  pending: {
    tone: "warning",
    label: "Pending",
    icon: "clock"
  },
  assigned: {
    tone: "info",
    label: "Assigned",
    icon: "user"
  },
  in_progress: {
    tone: "info",
    label: "In Progress",
    icon: "arrow-right"
  },
  in_review: {
    tone: "warning",
    label: "In Review",
    icon: "clock"
  },
  review: {
    tone: "warning",
    label: "In Review",
    icon: "clock"
  },
  changes_requested: {
    tone: "error",
    label: "Changes Requested",
    icon: "edit"
  },
  approved: {
    tone: "success",
    label: "Approved",
    icon: "check-circle"
  },
  rejected: {
    tone: "error",
    label: "Rejected",
    icon: "xmark-circle"
  },
  archived: {
    tone: "neutral",
    label: "Archived",
    icon: "archive"
  },
  ready: {
    tone: "success",
    label: "Ready",
    icon: "check"
  },
  blocked: {
    tone: "error",
    label: "Blocked",
    icon: "prohibition"
  },
  missing_locales: {
    tone: "warning",
    label: "Missing Locales",
    icon: "warning-circle"
  },
  missing_fields: {
    tone: "warning",
    label: "Missing Fields",
    icon: "warning-circle"
  },
  missing_locales_and_fields: {
    tone: "error",
    label: "Not Ready",
    icon: "warning-triangle"
  },
  not_started: {
    tone: "neutral",
    label: "Not Started",
    icon: "circle"
  },
  missing: {
    tone: "error",
    label: "Missing",
    icon: "warning-circle"
  },
  fallback: {
    tone: "warning",
    label: "Fallback",
    icon: "arrow-down"
  },
  not_required: {
    tone: "neutral",
    label: "Not Required",
    icon: "minus"
  },
  low: {
    tone: "neutral",
    label: "Low",
    icon: "minus"
  },
  normal: {
    tone: "info",
    label: "Normal",
    icon: "circle"
  },
  high: {
    tone: "warning",
    label: "High",
    icon: "arrow-up"
  },
  urgent: {
    tone: "error",
    label: "Urgent",
    icon: "warning-triangle"
  },
  critical: {
    tone: "error",
    label: "Critical",
    icon: "flash"
  },
  on_track: {
    tone: "success",
    label: "On Track",
    icon: "check-circle"
  },
  due_soon: {
    tone: "warning",
    label: "Due Soon",
    icon: "clock"
  },
  overdue: {
    tone: "error",
    label: "Overdue",
    icon: "warning-triangle"
  },
  none: {
    tone: "neutral",
    label: "No Due Date",
    icon: "clock"
  },
  pending_review: {
    tone: "warning",
    label: "Pending Review",
    icon: "clock"
  },
  review_approved: {
    tone: "success",
    label: "Review Approved",
    icon: "check-circle"
  },
  review_rejected: {
    tone: "error",
    label: "Review Rejected",
    icon: "xmark-circle"
  },
  published: {
    tone: "success",
    label: "Published",
    icon: "check-circle"
  },
  unpublished: {
    tone: "neutral",
    label: "Unpublished",
    icon: "minus"
  },
  pending_publish: {
    tone: "warning",
    label: "Pending Publish",
    icon: "clock"
  },
  active: {
    tone: "success",
    label: "Active",
    icon: "check-circle"
  },
  inactive: {
    tone: "neutral",
    label: "Inactive",
    icon: "pause"
  },
  enabled: {
    tone: "success",
    label: "Enabled",
    icon: "check-circle"
  },
  disabled: {
    tone: "neutral",
    label: "Disabled",
    icon: "pause"
  },
  completed: {
    tone: "success",
    label: "Completed",
    icon: "check"
  },
  failed: {
    tone: "error",
    label: "Failed",
    icon: "xmark"
  },
  cancelled: {
    tone: "neutral",
    label: "Cancelled",
    icon: "xmark-circle"
  },
  running: {
    tone: "info",
    label: "Running",
    icon: "arrow-right"
  },
  success: {
    tone: "success",
    label: "Success",
    icon: "check"
  },
  error: {
    tone: "error",
    label: "Error",
    icon: "xmark"
  },
  conflict: {
    tone: "warning",
    label: "Conflict",
    icon: "warning-triangle"
  },
  skipped: {
    tone: "neutral",
    label: "Skipped",
    icon: "minus"
  },
  missing_locale: {
    tone: "warning",
    label: "Missing Locale",
    icon: "warning-circle"
  },
  missing_field: {
    tone: "warning",
    label: "Missing Field",
    icon: "warning-circle"
  },
  outdated_source: {
    tone: "error",
    label: "Outdated Source",
    icon: "warning-triangle"
  },
  qa_blocked: {
    tone: "error",
    label: "QA Blocked",
    icon: "prohibition"
  },
  policy_denied: {
    tone: "error",
    label: "Policy Denied",
    icon: "prohibition"
  },
  validation_error: {
    tone: "error",
    label: "Validation Error",
    icon: "warning-triangle"
  },
  permission_denied: {
    tone: "error",
    label: "Permission Denied",
    icon: "prohibition"
  },
  complete: {
    tone: "success",
    label: "Complete",
    icon: "check"
  },
  drift: {
    tone: "warning",
    label: "Source Changed",
    icon: "warning-triangle"
  }
}, Qd = Object.fromEntries(Object.entries(jn).map(([e, t]) => [e, t.tone]));
function zn(e) {
  return e?.toLowerCase().trim().replace(/-/g, "_") || "";
}
function Pi(e) {
  return jn[zn(e)] ?? null;
}
function Gn(e) {
  return zn(e).split("_").filter(Boolean).map((t) => t.charAt(0).toUpperCase() + t.slice(1)).join(" ");
}
function Bi(e, t = "badge") {
  if (t === "badge") return `status-chip status-chip--${e}`;
  const r = {
    neutral: {
      bg: "bg-gray-100",
      text: "text-gray-700"
    },
    info: {
      bg: "bg-sky-50",
      text: "text-sky-700"
    },
    success: {
      bg: "bg-emerald-50",
      text: "text-emerald-700"
    },
    warning: {
      bg: "bg-amber-50",
      text: "text-amber-700"
    },
    error: {
      bg: "bg-rose-50",
      text: "text-rose-700"
    }
  };
  return r[e]?.[t] || r.neutral[t];
}
var ne = {
  check: "M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z",
  warning: "M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z",
  error: "M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z",
  info: "M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z",
  clock: "M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z",
  document: "M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z",
  archive: "M4 3a2 2 0 100 4h12a2 2 0 100-4H4zm0 6a1 1 0 00-1 1v7a1 1 0 001 1h12a1 1 0 001-1v-7a1 1 0 00-1-1H4zm4 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z",
  user: "M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z",
  play: "M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z",
  lock: "M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z",
  ban: "M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z"
}, Oi = {
  neutral: "bg-gray-100",
  info: "bg-sky-50",
  success: "bg-emerald-50",
  warning: "bg-amber-50",
  error: "bg-rose-50"
}, Fi = {
  neutral: "text-gray-700",
  info: "text-sky-700",
  success: "text-emerald-700",
  warning: "text-amber-700",
  error: "text-rose-700"
}, qi = {
  neutral: "border-gray-200",
  info: "border-sky-200",
  success: "border-emerald-200",
  warning: "border-amber-200",
  error: "border-rose-200"
};
function _(e, t = {}) {
  const r = Pi(e), n = r?.tone ?? "neutral";
  return {
    label: r?.label ?? Gn(e),
    shortLabel: t.shortLabel,
    colorClass: Bi(n, "badge"),
    bgClass: Oi[n],
    textClass: Fi[n],
    borderClass: qi[n],
    icon: r?.icon ?? "help-circle",
    iconType: "iconoir",
    severity: n,
    description: t.description
  };
}
var dr = {
  ready: _("ready", {
    shortLabel: "Ready",
    description: "All required translations are complete"
  }),
  missing_locales: _("missing_locales", {
    shortLabel: "Missing",
    description: "Required locale translations are missing"
  }),
  missing_fields: _("missing_fields", {
    shortLabel: "Incomplete",
    description: "Some translations have missing required fields"
  }),
  missing_locales_and_fields: _("missing_locales_and_fields", {
    shortLabel: "Not Ready",
    description: "Missing translations and incomplete fields"
  })
}, ur = {
  open: _("open", { description: "Available to be claimed" }),
  pending: _("pending", { description: "Waiting to be assigned" }),
  assigned: _("assigned", { description: "Assigned to a translator" }),
  in_progress: _("in_progress", { description: "Translation in progress" }),
  review: _("review", { description: "Pending review" }),
  rejected: _("rejected", { description: "Translation rejected" }),
  approved: _("approved", { description: "Translation approved" }),
  published: _("published", { description: "Translation published" }),
  archived: _("archived", { description: "Translation archived" })
}, fr = {
  draft: _("draft", { description: "Draft content" }),
  review: _("review", { description: "Content under review" }),
  ready: _("ready", { description: "Content ready" }),
  archived: _("archived", { description: "Content archived" })
}, hr = {
  overdue: _("overdue", { description: "Past due date" }),
  due_soon: _("due_soon", { description: "Due within 24 hours" }),
  on_track: _("on_track", { description: "On schedule" }),
  none: _("none", { description: "No due date set" })
}, pr = {
  success: _("success", { description: "Import/export succeeded" }),
  error: _("error", { description: "Import/export failed" }),
  conflict: _("conflict", { description: "Conflicting changes detected" }),
  skipped: _("skipped", { description: "Row skipped" })
}, mr = {
  running: _("running", { description: "Job in progress" }),
  completed: _("completed", { description: "Job completed successfully" }),
  failed: _("failed", { description: "Job failed" })
}, nt = {
  TRANSLATION_MISSING: {
    message: "Required translation is missing",
    shortMessage: "Translation missing",
    colorClass: "bg-amber-100 text-amber-700",
    bgClass: "bg-amber-50",
    textClass: "text-amber-700",
    icon: ne.warning,
    severity: "warning",
    actionable: !0,
    actionLabel: "Create translation"
  },
  INVALID_STATUS: {
    message: "Action not available in current status",
    shortMessage: "Invalid status",
    colorClass: "bg-gray-100 text-gray-600",
    bgClass: "bg-gray-50",
    textClass: "text-gray-600",
    icon: ne.ban,
    severity: "info",
    actionable: !1
  },
  PERMISSION_DENIED: {
    message: "You do not have permission for this action",
    shortMessage: "No permission",
    colorClass: "bg-red-100 text-red-700",
    bgClass: "bg-red-50",
    textClass: "text-red-700",
    icon: ne.lock,
    severity: "error",
    actionable: !1
  },
  MISSING_CONTEXT: {
    message: "Required context is missing",
    shortMessage: "Missing context",
    colorClass: "bg-gray-100 text-gray-600",
    bgClass: "bg-gray-50",
    textClass: "text-gray-600",
    icon: ne.info,
    severity: "info",
    actionable: !1
  },
  FEATURE_DISABLED: {
    message: "This feature is currently disabled",
    shortMessage: "Feature disabled",
    colorClass: "bg-gray-100 text-gray-500",
    bgClass: "bg-gray-50",
    textClass: "text-gray-500",
    icon: ne.ban,
    severity: "info",
    actionable: !1
  },
  RESOURCE_IN_USE: {
    message: "This resource is currently in use",
    shortMessage: "Resource in use",
    colorClass: "bg-amber-100 text-amber-800",
    bgClass: "bg-amber-50",
    textClass: "text-amber-800",
    icon: ne.warning,
    severity: "warning",
    actionable: !0,
    actionLabel: "Review usage"
  },
  PRECONDITION_FAILED: {
    message: "Action preconditions are not satisfied",
    shortMessage: "Precondition failed",
    colorClass: "bg-amber-100 text-amber-800",
    bgClass: "bg-amber-50",
    textClass: "text-amber-800",
    icon: ne.warning,
    severity: "warning",
    actionable: !1
  },
  INVALID_SELECTION: {
    message: "The current selection is not valid for this action",
    shortMessage: "Invalid selection",
    colorClass: "bg-gray-100 text-gray-700",
    bgClass: "bg-gray-50",
    textClass: "text-gray-700",
    icon: ne.info,
    severity: "info",
    actionable: !1
  },
  RATE_LIMITED: {
    message: "Too many requests. Please try again shortly",
    shortMessage: "Rate limited",
    colorClass: "bg-orange-100 text-orange-800",
    bgClass: "bg-orange-50",
    textClass: "text-orange-800",
    icon: ne.clock,
    severity: "warning",
    actionable: !1
  },
  TEMPORARILY_UNAVAILABLE: {
    message: "This action is temporarily unavailable",
    shortMessage: "Temporarily unavailable",
    colorClass: "bg-gray-100 text-gray-700",
    bgClass: "bg-gray-50",
    textClass: "text-gray-700",
    icon: ne.ban,
    severity: "info",
    actionable: !1
  }
};
function Me(e, t) {
  const r = e.toLowerCase();
  if ((!t || t === "core") && r in dr)
    return dr[r];
  if (!t || t === "queue") {
    if (r in ur) return ur[r];
    if (r in fr) return fr[r];
    if (r in hr) return hr[r];
  }
  if (!t || t === "exchange") {
    if (r in pr) return pr[r];
    if (r in mr) return mr[r];
  }
  return null;
}
function Fr(e) {
  const t = Pr(e);
  return t && t in nt ? nt[t] : null;
}
function Hn(e) {
  const t = Pr(e);
  return t && t in nt ? nt[t] : null;
}
function Zd(e, t) {
  return Me(e, t) !== null;
}
function eu(e) {
  return Fr(e) !== null;
}
function tu(e) {
  switch (e) {
    case "core":
      return Object.keys(dr);
    case "queue":
      return [
        ...Object.keys(ur),
        ...Object.keys(fr),
        ...Object.keys(hr)
      ];
    case "exchange":
      return [...Object.keys(pr), ...Object.keys(mr)];
    default:
      return [];
  }
}
function ru() {
  return Object.keys(nt);
}
function Un(e, t) {
  return Me(e, t) ? `status-${e.toLowerCase()}` : "";
}
function nu(e, t) {
  const r = Me(e, t);
  return r ? `severity-${r.severity}` : "";
}
function Ie(e, t = {}) {
  const r = Me(e, t.domain);
  if (!r) return `<span class="status-chip status-chip--neutral">${f(Gn(e) || e)}</span>`;
  const { size: n = "default", showIcon: s = !0, showLabel: i = !0, extraClass: o = "" } = t, a = {
    xs: "px-1.5 py-0.5 text-[10px]",
    sm: "px-2 py-0.5",
    default: ""
  }, l = s ? Vn(r, n) : "", c = i ? `<span>${f(r.label)}</span>` : "";
  return `<span class="status-chip status-chip--${r.severity} ${a[n]} ${o}"
                title="${f(r.description || r.label)}"
                aria-label="${f(r.label)}"
                data-status="${f(e)}">
    ${l}${c}
  </span>`;
}
function Vn(e, t = "default") {
  const r = {
    xs: "w-3 h-3",
    sm: "w-3.5 h-3.5",
    default: "w-4 h-4"
  };
  if (e.iconType === "iconoir") {
    const n = t === "default" ? "text-xs" : "text-[10px]";
    return `<i class="iconoir-${e.icon} ${n}" aria-hidden="true"></i>`;
  }
  return e.iconType === "char" ? `<span class="${r[t]} inline-flex items-center justify-center" aria-hidden="true">${e.icon}</span>` : `<svg class="${r[t]}" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
    <path fill-rule="evenodd" d="${e.icon}" clip-rule="evenodd"/>
  </svg>`;
}
function Kn(e, t = {}) {
  const r = Fr(e);
  if (!r) return `<span class="text-gray-500 text-xs">${f(e)}</span>`;
  const { size: n = "default", showIcon: s = !0, showFullMessage: i = !1, extraClass: o = "" } = t, a = {
    sm: "px-2 py-0.5 text-xs",
    default: "px-2.5 py-1 text-sm"
  }, l = s ? `<svg class="${n === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"}" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
        <path fill-rule="evenodd" d="${r.icon}" clip-rule="evenodd"/>
      </svg>` : "", c = i ? r.message : r.shortMessage;
  return `<span class="inline-flex items-center gap-1.5 rounded ${a[n]} ${r.colorClass} ${o}"
                role="status"
                aria-label="${f(r.message)}"
                data-reason-code="${f(e)}">
    ${l}
    <span>${f(c)}</span>
  </span>`;
}
function su(e, t) {
  const r = Fr(e);
  if (!r) return "";
  const n = t || r.message;
  return `<span class="inline-flex items-center justify-center w-5 h-5 rounded-full ${r.bgClass} ${r.textClass}"
                title="${f(n)}"
                aria-label="${f(r.shortMessage)}"
                data-reason-code="${f(e)}">
    <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
      <path fill-rule="evenodd" d="${r.icon}" clip-rule="evenodd"/>
    </svg>
  </span>`;
}
function iu(e = {}) {
  return (t) => typeof t != "string" || !t ? '<span class="text-gray-400">-</span>' : Ie(t, e);
}
function ou(e = {}) {
  return (t) => typeof t != "string" || !t ? "" : Kn(t, e);
}
function au(e) {
  e.schema_version !== 1 && console.warn("[TranslationStatusVocabulary] Unknown schema version:", e.schema_version);
}
function lu() {
  return `
    /* Status Vocabulary Styles */
    [data-status],
    [data-reason-code] {
      transition: opacity 0.15s ease;
    }

    [data-status]:hover,
    [data-reason-code]:hover {
      opacity: 0.9;
    }

    /* Severity-based animations */
    [data-status="overdue"],
    [data-status="rejected"],
    [data-status="error"],
    [data-status="failed"] {
      animation: pulse-subtle 2s ease-in-out infinite;
    }

    @keyframes pulse-subtle {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.85; }
    }
  `;
}
function he(e) {
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
  return !e || typeof e != "object" || (t.requestedLocale = _e(e, ["requested_locale"]), t.resolvedLocale = _e(e, ["resolved_locale", "locale"]), t.availableLocales = Ki(e, ["available_locales"]), t.missingRequestedLocale = nn(e, ["missing_requested_locale"]), t.fallbackUsed = nn(e, ["fallback_used"]), t.familyId = _e(e, ["family_id"]), t.status = _e(e, ["status"]), t.entityType = _e(e, [
    "entity_type",
    "type",
    "_type"
  ]), t.recordId = _e(e, ["id"]), !t.fallbackUsed && t.requestedLocale && t.resolvedLocale && (t.fallbackUsed = t.requestedLocale !== t.resolvedLocale), !t.missingRequestedLocale && t.fallbackUsed && (t.missingRequestedLocale = !0)), t;
}
function cu(e) {
  const t = he(e);
  return t.fallbackUsed || t.missingRequestedLocale;
}
function du(e) {
  const t = he(e);
  return t.familyId !== null || t.resolvedLocale !== null || t.availableLocales.length > 0;
}
function de(e, t = {}, r = "neutral") {
  const n = e.trim();
  if (!n) return "";
  const { size: s = "sm", extraClass: i = "" } = t;
  return `<span class="inline-flex items-center rounded-full border font-medium ${s === "sm" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-1"} ${r === "info" ? "bg-blue-50 text-blue-700 border-blue-200" : r === "warning" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-slate-100 text-slate-700 border-slate-200"} ${i}">${f(n)}</span>`;
}
function Jn(e, t) {
  if (!e || typeof e != "object" || Array.isArray(e)) return null;
  const r = e, n = r[t];
  return n && typeof n == "object" && !Array.isArray(n) ? n : r;
}
function qe(e, t) {
  for (const r of t) {
    const n = e[r];
    if (typeof n == "string" && n.trim()) return n.trim();
  }
  return "";
}
function gr(e, t) {
  for (const r of t) {
    const n = e[r];
    if (typeof n == "number" && Number.isFinite(n)) return Math.trunc(n);
    if (typeof n == "string" && n.trim()) {
      const s = Number(n);
      if (Number.isFinite(s)) return Math.trunc(s);
    }
  }
  return null;
}
function Yn(e) {
  const t = typeof e.family_member_count == "number" ? Math.trunc(e.family_member_count) : Number(e.family_member_count);
  if (Number.isFinite(t) && t > 0) return Math.trunc(t);
  const r = W(e);
  if (r.availableLocales.length > 0) return r.availableLocales.length;
  const n = he(e);
  return n.availableLocales.length > 0 ? n.availableLocales.length : n.resolvedLocale ? 1 : null;
}
function uu(e, t = {}) {
  const r = typeof e.translation_family_url == "string" ? e.translation_family_url.trim() : "";
  if (!r) return '<span class="text-gray-400">-</span>';
  const n = Yn(e), s = n && n > 0 ? de(`${n} ${n === 1 ? "locale" : "locales"}`, t, "info") : "";
  return `
    <div class="inline-flex items-center gap-2">
      <a href="${w(r)}" class="text-sm font-medium text-blue-700 hover:text-blue-800 hover:underline">View family</a>
      ${s}
    </div>
  `.trim();
}
function fu(e, t = {}) {
  const r = Yn(e);
  return !r || r <= 0 ? '<span class="text-gray-400">-</span>' : de(`${r} ${r === 1 ? "locale" : "locales"}`, t, "info");
}
function hu(e, t = {}) {
  const r = Jn(e, "translation_assignment_summary");
  if (!r) return '<span class="text-gray-400">-</span>';
  const n = qe(r, ["status"]), s = qe(r, ["label"]), i = qe(r, ["assignee_id"]), o = qe(r, ["priority"]), a = gr(r, ["active_count", "open_count"]), l = [];
  return n ? l.push(Ie(n, {
    domain: "queue",
    size: "sm",
    showIcon: !1
  })) : s && l.push(de(s, t, "info")), a !== null && a >= 0 && l.push(de(`${a} active`, t, "neutral")), i && l.push(de(`@${i}`, t, "neutral")), o && l.push(de(o, t, o === "urgent" || o === "high" ? "warning" : "neutral")), l.length === 0 ? '<span class="text-gray-400">-</span>' : `<div class="inline-flex items-center gap-1.5 flex-wrap">${l.join("")}</div>`;
}
function pu(e, t = {}) {
  const r = Jn(e, "translation_exchange_summary");
  if (!r) return '<span class="text-gray-400">-</span>';
  const n = qe(r, ["status", "last_job_status"]), s = qe(r, ["label", "last_job_label"]), i = gr(r, ["pending_count"]), o = gr(r, ["error_count"]), a = [];
  return n ? a.push(Ie(n, {
    domain: "exchange",
    size: "sm",
    showIcon: !1
  })) : s && a.push(de(s, t, "info")), i !== null && i >= 0 && a.push(de(`${i} pending`, t, "neutral")), o !== null && o > 0 && a.push(de(`${o} errors`, t, "warning")), a.length === 0 ? '<span class="text-gray-400">-</span>' : `<div class="inline-flex items-center gap-1.5 flex-wrap">${a.join("")}</div>`;
}
function W(e) {
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
    t.hasReadinessMetadata = !0, t.familyId = _e(e, ["translation_readiness.family_id", "family_id"]), t.requiredLocales = Array.isArray(r.required_locales) ? r.required_locales.filter((o) => typeof o == "string") : [], t.availableLocales = Array.isArray(r.available_locales) ? r.available_locales.filter((o) => typeof o == "string") : [], t.missingRequiredLocales = Array.isArray(r.missing_required_locales) ? r.missing_required_locales.filter((o) => typeof o == "string") : [];
    const n = r.missing_required_fields_by_locale;
    if (n && typeof n == "object" && !Array.isArray(n))
      for (const [o, a] of Object.entries(n)) Array.isArray(a) && (t.missingRequiredFieldsByLocale[o] = a.filter((l) => typeof l == "string"));
    const s = r.readiness_state;
    typeof s == "string" && Ni(s) && (t.readinessState = s);
    const i = r.ready_for_transition;
    if (i && typeof i == "object" && !Array.isArray(i))
      for (const [o, a] of Object.entries(i)) typeof a == "boolean" && (t.readyForTransition[o] = a);
    t.evaluatedChannel = typeof r.evaluated_channel == "string" ? r.evaluated_channel : null;
  }
  return t;
}
function mu(e) {
  return W(e).hasReadinessMetadata;
}
function gu(e, t) {
  return W(e).readyForTransition[t] === !0;
}
function Ni(e) {
  return [
    "ready",
    "missing_locales",
    "missing_fields",
    "missing_locales_and_fields"
  ].includes(e);
}
function Wn(e, t = {}) {
  const r = "resolvedLocale" in e ? e : he(e), { showFallbackIndicator: n = !0, size: s = "default", extraClass: i = "" } = t;
  if (!r.resolvedLocale) return "";
  const o = r.resolvedLocale.toUpperCase(), a = r.fallbackUsed || r.missingRequestedLocale, l = `inline-flex items-center gap-1 rounded font-medium ${s === "sm" ? "text-xs px-1.5 py-0.5" : "text-xs px-2 py-1"}`;
  return a && n ? `<span class="${l} bg-amber-100 text-amber-800 ${i}"
                  title="Showing ${r.resolvedLocale} content (${r.requestedLocale || "requested locale"} not available)"
                  aria-label="Fallback locale: ${o}">
      <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
      </svg>
      ${o}
    </span>` : `<span class="${l} bg-blue-100 text-blue-800 ${i}"
                title="Locale: ${o}"
                aria-label="Locale: ${o}">
    ${o}
  </span>`;
}
function ji(e, t = {}) {
  const r = "resolvedLocale" in e ? e : he(e), { maxLocales: n = 3, size: s = "default" } = t;
  if (r.availableLocales.length === 0) return "";
  const i = s === "sm" ? "text-xs gap-0.5" : "text-xs gap-1", o = s === "sm" ? "px-1 py-0.5 text-[10px]" : "px-1.5 py-0.5", a = r.availableLocales.slice(0, n), l = r.availableLocales.length - n, c = a.map((u) => `<span class="${u === r.resolvedLocale ? `${o} rounded bg-blue-100 text-blue-700 font-medium` : `${o} rounded bg-gray-100 text-gray-600`}">${u.toUpperCase()}</span>`).join(""), d = l > 0 ? `<span class="${o} rounded bg-gray-100 text-gray-500">+${l}</span>` : "";
  return `<span class="inline-flex items-center ${i}"
                title="Available locales: ${r.availableLocales.join(", ")}"
                aria-label="Available locales: ${r.availableLocales.join(", ")}">
    ${c}${d}
  </span>`;
}
function zi(e, t = {}) {
  const r = "resolvedLocale" in e ? e : he(e), { showResolvedLocale: n = !0, size: s = "default" } = t, i = [];
  return n && r.resolvedLocale && i.push(Wn(r, {
    size: s,
    showFallbackIndicator: !0
  })), r.availableLocales.length > 1 && i.push(ji(r, {
    ...t,
    size: s
  })), i.length === 0 ? '<span class="text-gray-400">-</span>' : `<div class="flex items-center flex-wrap ${s === "sm" ? "gap-1" : "gap-2"}">${i.join("")}</div>`;
}
function bu(e, t = "default") {
  if (!e) return "";
  const r = e.trim();
  if (Me(r) !== null) return Ie(r, { size: t === "sm" ? "sm" : "default" });
  const n = r.toLowerCase();
  return _t(e, "status", n, { size: t === "sm" ? "sm" : void 0 });
}
function yu(e, t = {}) {
  const r = W(e);
  if (!r.hasReadinessMetadata) return "";
  const { size: n = "default", showDetailedTooltip: s = !0, extraClass: i = "" } = t, o = `inline-flex items-center gap-1 rounded font-medium ${n === "sm" ? "text-xs px-1.5 py-0.5" : "text-xs px-2 py-1"}`, a = r.readinessState || "ready", { icon: l, label: c, bgClass: d, textClass: u, tooltip: h } = Gi(a, r, s);
  return `<span class="${o} ${d} ${u} ${i}"
                title="${h}"
                aria-label="${c}"
                data-readiness-state="${a}">
    ${l}
    <span>${c}</span>
  </span>`;
}
function vu(e, t = {}) {
  const r = W(e);
  if (!r.hasReadinessMetadata) return "";
  const n = r.readyForTransition.publish === !0, { size: s = "default", extraClass: i = "" } = t, o = s === "sm" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-1";
  if (n) return `<span class="inline-flex items-center gap-1 rounded font-medium ${o} bg-green-100 text-green-700 ${i}"
                  title="Ready to publish"
                  aria-label="Ready to publish">
      <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
      </svg>
      Ready
    </span>`;
  const a = r.missingRequiredLocales.length;
  return `<span class="inline-flex items-center gap-1 rounded font-medium ${o} bg-amber-100 text-amber-700 ${i}"
                title="${a > 0 ? `Missing translations: ${r.missingRequiredLocales.join(", ")}` : "Not ready to publish"}"
                aria-label="Not ready to publish">
    <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
      <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
    </svg>
    ${a > 0 ? `${a} missing` : "Not ready"}
  </span>`;
}
function wu(e, t = {}) {
  const r = W(e);
  if (!r.hasReadinessMetadata || r.requiredLocales.length === 0) return "";
  const { size: n = "default", extraClass: s = "" } = t, i = n === "sm" ? "text-xs" : "text-sm", o = r.requiredLocales.length, a = r.availableLocales.filter((l) => r.requiredLocales.includes(l)).length;
  return `<span class="${i} ${o > 0 && a === o ? "text-green-600" : a > 0 ? "text-amber-600" : "text-gray-500"} font-medium ${s}"
                title="Locale completeness: ${a} of ${o} required locales available"
                aria-label="${a} of ${o} locales">
    ${a}/${o}
  </span>`;
}
function xu(e, t = {}) {
  const r = W(e);
  if (!r.hasReadinessMetadata || r.readinessState === "ready") return "";
  const { size: n = "default", extraClass: s = "" } = t, i = n === "sm" ? "text-xs px-2 py-1" : "text-sm px-2.5 py-1", o = r.missingRequiredLocales.length, a = o > 0, l = Object.keys(r.missingRequiredFieldsByLocale).length > 0;
  let c = "", d = "", u = "";
  if (a && l ? (c = "missing_locales_and_fields", d = `${o} missing`, u = `Missing translations: ${r.missingRequiredLocales.join(", ")}. Also has incomplete fields.`) : a ? (c = "missing_locales", d = `${o} missing`, u = `Missing translations: ${r.missingRequiredLocales.join(", ")}`) : l && (c = "missing_fields", d = "Incomplete", u = `Incomplete fields in: ${Object.keys(r.missingRequiredFieldsByLocale).join(", ")}`), !d) return "";
  const h = Me(c, "core");
  return `<span class="inline-flex items-center gap-1.5 rounded-full font-medium ${i} ${h?.bgClass || "bg-amber-50"} ${h?.textClass || "text-amber-700"} ${s}"
                title="${u}"
                aria-label="${u}"
                data-missing-translations="true"
                data-missing-count="${o}">
    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
    <span>${d}</span>
  </span>`;
}
function Su(e) {
  const t = W(e);
  return t.hasReadinessMetadata ? t.readinessState !== "ready" : !1;
}
function Cu(e) {
  return W(e).missingRequiredLocales.length;
}
function Gi(e, t, r) {
  const n = Me(e, "core"), s = n ? Vn(n, "sm") : "", i = n?.bgClass || "bg-gray-100", o = n?.textClass || "text-gray-600", a = n?.label || "Unknown", l = n?.description || "Unknown readiness state";
  switch (e) {
    case "ready":
      return {
        icon: s,
        label: a,
        bgClass: i,
        textClass: o,
        tooltip: l
      };
    case "missing_locales": {
      const c = t.missingRequiredLocales, d = r && c.length > 0 ? `Missing translations: ${c.join(", ")}` : "Missing required translations";
      return {
        icon: s,
        label: `${c.length} missing`,
        bgClass: i,
        textClass: o,
        tooltip: d
      };
    }
    case "missing_fields": {
      const c = Object.keys(t.missingRequiredFieldsByLocale);
      return {
        icon: s,
        label: "Incomplete",
        bgClass: i,
        textClass: o,
        tooltip: r && c.length > 0 ? `Incomplete fields in: ${c.join(", ")}` : "Some translations have missing required fields"
      };
    }
    case "missing_locales_and_fields": {
      const c = t.missingRequiredLocales, d = Object.keys(t.missingRequiredFieldsByLocale), u = [];
      return c.length > 0 && u.push(`Missing: ${c.join(", ")}`), d.length > 0 && u.push(`Incomplete: ${d.join(", ")}`), {
        icon: s,
        label: "Not ready",
        bgClass: i,
        textClass: o,
        tooltip: r ? u.join("; ") : "Missing translations and incomplete fields"
      };
    }
    default:
      return {
        icon: s,
        label: a,
        bgClass: i,
        textClass: o,
        tooltip: l
      };
  }
}
function Hi(e, t = {}) {
  const { size: r = "sm", maxLocales: n = 5, showLabels: s = !1 } = t, i = W(e);
  if (!i.hasReadinessMetadata) return '<span class="text-gray-400">-</span>';
  const { requiredLocales: o, availableLocales: a, missingRequiredFieldsByLocale: l } = i, c = o.length > 0 ? o : a;
  if (c.length === 0) return '<span class="text-gray-400">-</span>';
  const d = new Set(a), u = Ui(l);
  return `<div class="flex items-center gap-1 flex-wrap" data-matrix-cell="true">${c.slice(0, n).map((h) => {
    const p = d.has(h), m = p && u.has(h), g = p && !m;
    let y, v, A;
    g ? (y = "bg-green-100 text-green-700 border-green-300", v = "●", A = "Complete") : m ? (y = "bg-amber-100 text-amber-700 border-amber-300", v = "◐", A = "Incomplete") : (y = "bg-white text-gray-400 border-gray-300 border-dashed", v = "○", A = "Missing");
    const C = r === "sm" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-1", L = s ? `<span class="font-medium">${h.toUpperCase()}</span>` : "";
    return `
        <span class="inline-flex items-center gap-0.5 ${C} rounded border ${y}"
              title="${h.toUpperCase()}: ${A}"
              aria-label="${h.toUpperCase()}: ${A}"
              data-locale="${h}"
              data-state="${A.toLowerCase()}">
          ${L}
          <span aria-hidden="true">${v}</span>
        </span>
      `;
  }).join("")}${c.length > n ? `<span class="text-[10px] text-gray-500" title="${c.length - n} more locales">+${c.length - n}</span>` : ""}</div>`;
}
function Ui(e) {
  const t = /* @__PURE__ */ new Set();
  if (e && typeof e == "object")
    for (const [r, n] of Object.entries(e)) Array.isArray(n) && n.length > 0 && t.add(r);
  return t;
}
function Eu(e = {}) {
  return (t, r, n) => Hi(r, e);
}
function Au(e, t = {}) {
  if (!e.fallbackUsed && !e.missingRequestedLocale) return "";
  const { showCreateButton: r = !0, createTranslationUrl: n, panelName: s } = t, i = e.requestedLocale || "requested locale", o = e.resolvedLocale || "default", a = r ? `
    <button type="button"
            class="inline-flex items-center gap-1 text-sm font-medium text-amber-800 hover:text-amber-900 underline"
            data-action="create-translation"
            data-locale="${e.requestedLocale || ""}"
            data-panel="${s || ""}"
            data-record-id="${e.recordId || ""}"
            ${n ? `data-url="${n}"` : ""}>
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
            You're viewing content from <strong>${o.toUpperCase()}</strong>.
            <span class="block mt-1 text-amber-600">Editing is disabled until you create the missing translation.</span>
          </p>
          ${a ? `<div class="mt-3">${a}</div>` : ""}
        </div>
      </div>
    </div>
  `;
}
function rn(e = {}) {
  return (t, r, n) => zi(r, e);
}
function Vi(e = {}) {
  return (t, r, n) => Wn(r, e);
}
function _e(e, t) {
  for (const r of t) {
    const n = qr(e, r);
    if (typeof n == "string" && n.trim()) return n;
  }
  return null;
}
function Ki(e, t) {
  for (const r of t) {
    const n = qr(e, r);
    if (Array.isArray(n)) return n.filter((s) => typeof s == "string");
  }
  return [];
}
function nn(e, t) {
  for (const r of t) {
    const n = qr(e, r);
    if (typeof n == "boolean") return n;
    if (n === "true") return !0;
    if (n === "false") return !1;
  }
  return !1;
}
function qr(e, t) {
  const r = t.split(".");
  let n = e;
  for (const s of r) {
    if (n == null || typeof n != "object") return;
    n = n[s];
  }
  return n;
}
var ce = '<span class="text-gray-400">-</span>', Ji = [
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
function Yi(e) {
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}
function Wi(e) {
  const t = [], r = (s) => {
    if (typeof s != "string") return;
    const i = s.trim();
    !i || t.includes(i) || t.push(i);
  };
  r(e.display_key), r(e.displayKey);
  const n = e.display_keys ?? e.displayKeys;
  return Array.isArray(n) && n.forEach(r), t;
}
function Xi(e, t) {
  if (!t) return;
  if (Object.prototype.hasOwnProperty.call(e, t)) return e[t];
  if (!t.includes(".")) return;
  const r = t.split(".");
  let n = e;
  for (const s of r) {
    if (!n || typeof n != "object" || Array.isArray(n) || !Object.prototype.hasOwnProperty.call(n, s)) return;
    n = n[s];
  }
  return n;
}
function Qi(e) {
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
function br(e, t) {
  if (e == null) return "";
  if (Array.isArray(e)) return yr(e, t);
  if (typeof e != "object") return String(e);
  const r = [...Wi(t), ...Ji], n = /* @__PURE__ */ new Set();
  for (const s of r) {
    if (n.has(s)) continue;
    n.add(s);
    const i = Qi(Xi(e, s));
    if (i) return i;
  }
  return Yi(e);
}
function yr(e, t) {
  if (!Array.isArray(e) || e.length === 0) return "";
  const r = e.map((o) => br(o, t).trim()).filter(Boolean);
  if (r.length === 0) return "";
  const n = Number(t.preview_limit ?? t.previewLimit ?? 3), s = Number.isFinite(n) && n > 0 ? Math.floor(n) : 3, i = r.slice(0, s);
  return r.length <= s ? i.join(", ") : `${i.join(", ")} +${r.length - s} more`;
}
function Zi(e, t, r, n) {
  const s = e[t] ?? e[r] ?? n, i = Number(s);
  return Number.isFinite(i) && i > 0 ? Math.floor(i) : n;
}
function eo(e, t, r, n) {
  const s = e[t] ?? e[r];
  return s == null ? n : typeof s == "boolean" ? s : typeof s == "string" ? s.toLowerCase() === "true" || s === "1" : !!s;
}
function to(e, t, r, n) {
  const s = e[t] ?? e[r];
  return s == null ? n : String(s).trim() || n;
}
function ro(e) {
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
function no(e) {
  switch (e) {
    case "muted":
      return "bg-gray-100 text-gray-600";
    case "outline":
      return "bg-white border border-gray-300 text-gray-700";
    default:
      return "bg-blue-50 text-blue-700";
  }
}
var so = class {
  constructor() {
    this.renderers = /* @__PURE__ */ new Map(), this.defaultRenderer = (e) => {
      if (e == null) return ce;
      if (typeof e == "boolean") return e ? "Yes" : "No";
      if (Array.isArray(e)) {
        const t = yr(e, {});
        return t ? f(t) : ce;
      }
      if (typeof e == "object") {
        const t = br(e, {});
        return t ? f(t) : ce;
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
      return _t(String(e), "status", t);
    }), this.renderers.set("_date", (e) => {
      if (!e) return '<span class="text-gray-400">-</span>';
      const t = kt(e);
      return t ? t.toLocaleDateString() : String(e);
    }), this.renderers.set("_datetime", (e) => {
      if (!e) return '<span class="text-gray-400">-</span>';
      const t = kt(e);
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
      if (!Array.isArray(e) || e.length === 0) return ce;
      const s = yr(e, n?.options || {});
      return s ? f(s) : ce;
    }), this.renderers.set("_object", (e, t, r, n) => {
      if (e == null) return ce;
      const s = br(e, n?.options || {});
      return s ? f(s) : ce;
    }), this.renderers.set("_tags", (e) => !Array.isArray(e) || e.length === 0 ? '<span class="text-gray-400">-</span>' : e.map((t) => `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 mr-1">${t}</span>`).join("")), this.renderers.set("blocks_chips", (e, t, r, n) => {
      if (!Array.isArray(e) || e.length === 0) return ce;
      const s = n?.options || {}, i = Zi(s, "max_visible", "maxVisible", 3), o = eo(s, "show_count", "showCount", !0), a = to(s, "chip_variant", "chipVariant", "default"), l = s.block_icons_map || s.blockIconsMap || {}, c = [], d = e.slice(0, i);
      for (const p of d) {
        const m = ro(p);
        if (!m) continue;
        const g = l[m] || "view-grid", y = ni(g, {
          size: "14px",
          extraClass: "flex-shrink-0"
        }), v = no(a);
        c.push(`<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${v}">${y}<span>${f(m)}</span></span>`);
      }
      if (c.length === 0) return ce;
      const u = e.length - i;
      let h = "";
      return o && u > 0 && (h = `<span class="px-2 py-0.5 rounded text-xs bg-gray-200 text-gray-600">+${u} more</span>`), `<div class="flex flex-wrap gap-1">${c.join("")}${h}</div>`;
    }), this.renderers.set("_image", (e) => e ? `<img src="${e}" alt="Thumbnail" class="h-10 w-10 rounded object-cover" />` : '<span class="text-gray-400">-</span>'), this.renderers.set("_avatar", (e, t) => {
      const r = t.name || t.username || t.email || "U", n = r.charAt(0).toUpperCase();
      return e ? `<img src="${e}" alt="${r}" class="h-8 w-8 rounded-full object-cover" />` : `<div class="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium text-sm">${n}</div>`;
    });
  }
}, ku = {
  statusBadge: (e) => (t) => {
    const r = String(t).toLowerCase();
    return _t(String(t), "status", r);
  },
  roleBadge: (e) => (t) => {
    const r = String(t).toLowerCase();
    return _t(String(t), "role", r);
  },
  userInfo: (e, t) => {
    const r = e || t.name || t.username || "-", n = t.email || "";
    return n ? `<div><div class="font-medium text-gray-900">${r}</div><div class="text-sm text-gray-500">${n}</div></div>` : `<div class="font-medium text-gray-900">${r}</div>`;
  },
  booleanChip: (e) => (t) => ki(!!t, e),
  relativeTime: (e) => {
    if (!e) return '<span class="text-gray-400">-</span>';
    const t = kt(e);
    if (!t) return String(e);
    const r = (/* @__PURE__ */ new Date()).getTime() - t.getTime(), n = Math.floor(r / 6e4), s = Math.floor(r / 36e5), i = Math.floor(r / 864e5);
    return n < 1 ? "Just now" : n < 60 ? `${n} minute${n > 1 ? "s" : ""} ago` : s < 24 ? `${s} hour${s > 1 ? "s" : ""} ago` : i < 30 ? `${i} day${i > 1 ? "s" : ""} ago` : t.toLocaleDateString();
  },
  localeBadge: Vi(),
  translationStatus: rn(),
  translationStatusCompact: rn({
    size: "sm",
    maxLocales: 2
  })
}, io = "datagrid.state.", Kt = "datagrid.share.", Xn = "datagrid.share.index", oo = 20, ao = 1500;
function lo(e) {
  return String(e || "").trim() || "default";
}
function Jt(e, t = {}) {
  if (!Array.isArray(e)) return;
  const r = e.map((n) => typeof n == "string" ? n.trim() : "").filter((n) => n.length > 0);
  return r.length === 0 ? t.allowEmpty === !0 ? [] : void 0 : Array.from(new Set(r));
}
function st(e) {
  if (!e || typeof e != "object" || Array.isArray(e)) return null;
  const t = e, r = { version: 1 };
  (t.viewMode === "flat" || t.viewMode === "grouped" || t.viewMode === "matrix") && (r.viewMode = t.viewMode), (t.expandMode === "all" || t.expandMode === "none" || t.expandMode === "explicit") && (r.expandMode = t.expandMode);
  const n = Jt(t.expandedGroups, { allowEmpty: !0 });
  n !== void 0 && (r.expandedGroups = n);
  const s = Jt(t.hiddenColumns, { allowEmpty: !0 });
  s !== void 0 && (r.hiddenColumns = s);
  const i = Jt(t.columnOrder);
  return i && (r.columnOrder = i), typeof t.updatedAt == "number" && Number.isFinite(t.updatedAt) && (r.updatedAt = t.updatedAt), r;
}
function sn(e) {
  if (!e || typeof e != "object" || Array.isArray(e)) return null;
  const t = e, r = { version: 1 };
  if (typeof t.search == "string") {
    const s = t.search.trim();
    s && (r.search = s);
  }
  typeof t.page == "number" && Number.isFinite(t.page) && (r.page = Math.max(1, Math.trunc(t.page))), typeof t.perPage == "number" && Number.isFinite(t.perPage) && (r.perPage = Math.max(1, Math.trunc(t.perPage))), Array.isArray(t.filters) && (r.filters = t.filters), Array.isArray(t.sort) && (r.sort = t.sort);
  const n = st(t.persisted);
  return n && (r.persisted = n), typeof t.updatedAt == "number" && Number.isFinite(t.updatedAt) && (r.updatedAt = t.updatedAt), r;
}
function Qn(e) {
  const t = String(e || "").trim();
  return t ? t.replace(/\/+$/, "") : "";
}
function co(e) {
  return String(e || "").trim().replace(/[^a-zA-Z0-9._-]/g, "");
}
function uo() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`.slice(0, 16);
}
function fo(e) {
  try {
    const t = localStorage.getItem(Xn);
    if (!t) return [];
    const r = JSON.parse(t);
    if (!Array.isArray(r)) return [];
    const n = r.map((s) => {
      if (!s || typeof s != "object" || Array.isArray(s)) return null;
      const i = s, o = typeof i.token == "string" ? i.token.trim() : "", a = typeof i.updatedAt == "number" ? i.updatedAt : 0;
      return !o || !Number.isFinite(a) ? null : {
        token: o,
        updatedAt: a
      };
    }).filter((s) => s !== null).sort((s, i) => i.updatedAt - s.updatedAt);
    return n.length <= e ? n : n.slice(0, e);
  } catch {
    return [];
  }
}
function ho(e) {
  try {
    localStorage.setItem(Xn, JSON.stringify(e));
  } catch {
  }
}
var Zn = class {
  constructor(e) {
    const t = lo(e.key);
    this.key = t, this.persistedStorageKey = `${io}${t}`, this.maxShareEntries = Math.max(1, e.maxShareEntries || oo);
  }
  loadPersistedState() {
    try {
      const e = localStorage.getItem(this.persistedStorageKey);
      return e ? st(JSON.parse(e)) : null;
    } catch {
      return null;
    }
  }
  savePersistedState(e) {
    const t = st(e);
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
    const t = sn(e);
    if (!t) return null;
    t.updatedAt || (t.updatedAt = Date.now());
    const r = uo(), n = `${Kt}${r}`;
    try {
      localStorage.setItem(n, JSON.stringify(t));
      const s = fo(this.maxShareEntries).filter((i) => i.token !== r);
      for (s.unshift({
        token: r,
        updatedAt: t.updatedAt
      }); s.length > this.maxShareEntries; ) {
        const i = s.pop();
        i && localStorage.removeItem(`${Kt}${i.token}`);
      }
      return ho(s), r;
    } catch {
      return null;
    }
  }
  resolveShareState(e) {
    const t = String(e || "").trim();
    if (!t) return null;
    try {
      const r = localStorage.getItem(`${Kt}${t}`);
      return r ? sn(JSON.parse(r)) : null;
    } catch {
      return null;
    }
  }
}, po = class extends Zn {
  constructor(e) {
    if (super(e), this.syncTimeout = null, this.mutationQueue = Promise.resolve(), this.preferencesEndpoint = Qn(e.preferencesEndpoint), !this.preferencesEndpoint) throw new Error("PreferencesDataGridStateStore requires an advertised preferences endpoint");
    this.resource = co(e.resource) || this.key, this.syncDebounceMs = Math.max(100, e.syncDebounceMs || 1e3), this.hydrateTimeoutMs = Math.max(100, e.hydrateTimeoutMs || ao), this.preferencesWritable = e.preferencesWritable !== !1;
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
      const s = await n.json(), i = this.extractFirstRecord(s);
      if (!i) return;
      const o = this.extractMap(i.effective), a = this.extractMap(i.raw), l = st(o[this.serverStateKey] ?? a[this.serverStateKey]);
      l && super.savePersistedState(l);
    } catch {
    } finally {
      clearTimeout(t);
    }
  }
  savePersistedState(e) {
    super.savePersistedState(e);
    const t = st(e);
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
      await j(this.preferencesEndpoint, {
        method: "POST",
        credentials: "same-origin",
        json: { raw: { [this.serverStateKey]: e } }
      });
    } catch {
    }
  }
  async clearServerState() {
    try {
      await j(this.preferencesEndpoint, {
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
function mo(e) {
  return (e.mode || "local") === "preferences" && Qn(e.preferencesEndpoint) ? new po(e) : new Zn(e);
}
function go(e, t = {}) {
  const { groupByField: r = "family_id", defaultExpanded: n = !0, expandMode: s = "explicit", expandedGroups: i = /* @__PURE__ */ new Set() } = t, o = /* @__PURE__ */ new Map(), a = [];
  for (const c of e) {
    const d = Co(c, r);
    if (d) {
      const u = o.get(d);
      u ? u.push(c) : o.set(d, [c]);
    } else a.push(c);
  }
  const l = [];
  for (const [c, d] of o) {
    const u = is(d), h = ts(c, s, i, n);
    l.push({
      groupId: c,
      records: d,
      summary: u,
      expanded: h,
      summaryFromBackend: !1
    });
  }
  return l.sort((c, d) => e.indexOf(c.records[0]) - e.indexOf(d.records[0])), {
    groups: l,
    ungrouped: a,
    totalGroups: l.length,
    totalRecords: e.length
  };
}
function es(e) {
  if (e.length === 0) return !1;
  let t = !1;
  for (const r of e) {
    if (yo(r)) {
      t = !0;
      continue;
    }
    if (rs(r)) {
      t = !0;
      continue;
    }
    return !1;
  }
  return t;
}
function bo(e, t = {}) {
  const { defaultExpanded: r = !0, expandMode: n = "explicit", expandedGroups: s = /* @__PURE__ */ new Set() } = t;
  if (!es(e)) return null;
  const i = [], o = [];
  let a = 0;
  for (const l of e) {
    if (rs(l)) {
      o.push({ ...l }), a += 1;
      continue;
    }
    const c = vo(l);
    if (!c) return null;
    const d = ss(l), u = xo(l, d), h = ts(c, n, s, r);
    i.push({
      groupId: c,
      displayLabel: So(l, d),
      records: d,
      summary: u,
      expanded: h,
      summaryFromBackend: wo(l)
    }), a += d.length;
  }
  return {
    groups: i,
    ungrouped: o,
    totalGroups: i.length,
    totalRecords: a
  };
}
function ts(e, t, r, n) {
  return t === "all" ? !r.has(e) : t === "none" ? r.has(e) : r.size === 0 ? n : r.has(e);
}
function yo(e) {
  const t = e, r = typeof t.group_by == "string" ? t.group_by.trim().toLowerCase() : "", n = ns(e);
  if (!(r === "family_id" || n === "group")) return !1;
  const s = ss(e);
  return Array.isArray(s);
}
function rs(e) {
  return ns(e) === "ungrouped";
}
function ns(e) {
  const t = e._group;
  if (!t || typeof t != "object" || Array.isArray(t)) return "";
  const r = t.row_type;
  return typeof r == "string" ? r.trim().toLowerCase() : "";
}
function vo(e) {
  const t = e.family_id;
  if (typeof t == "string" && t.trim()) return t.trim();
  const r = e._group;
  if (!r || typeof r != "object" || Array.isArray(r)) return null;
  const n = r.id;
  return typeof n == "string" && n.trim() ? n.trim() : null;
}
function ss(e) {
  const t = e, r = Array.isArray(t.records) ? t.records : t.children;
  if (Array.isArray(r)) {
    const s = r.filter((i) => !!i && typeof i == "object" && !Array.isArray(i)).map((i) => ({ ...i }));
    if (s.length > 0) return s;
  }
  const n = t.parent;
  return n && typeof n == "object" && !Array.isArray(n) ? [{ ...n }] : [];
}
function wo(e) {
  const t = e.family_summary;
  return !!t && typeof t == "object" && !Array.isArray(t);
}
function xo(e, t) {
  const r = e.family_summary;
  if (!r || typeof r != "object" || Array.isArray(r)) return is(t);
  const n = r, s = Array.isArray(n.available_locales) ? n.available_locales.filter(De) : [], i = Array.isArray(n.missing_locales) ? n.missing_locales.filter(De) : [], o = os(n.readiness_state) ? n.readiness_state : null, a = Math.max(t.length, typeof n.child_count == "number" ? Math.max(n.child_count, 0) : 0);
  return {
    totalItems: typeof n.total_items == "number" ? Math.max(n.total_items, 0) : a,
    availableLocales: s,
    missingLocales: i,
    readinessState: o,
    readyForPublish: typeof n.ready_for_publish == "boolean" ? n.ready_for_publish : null
  };
}
function So(e, t) {
  const r = e.family_label;
  if (typeof r == "string" && r.trim()) return r.trim();
  const n = e.family_summary;
  if (n && typeof n == "object" && !Array.isArray(n)) {
    const a = n.group_label;
    if (typeof a == "string" && a.trim()) return a.trim();
  }
  const s = e._group;
  if (s && typeof s == "object" && !Array.isArray(s)) {
    const a = s.label;
    if (typeof a == "string" && a.trim()) return a.trim();
  }
  const i = [], o = e.parent;
  if (o && typeof o == "object" && !Array.isArray(o)) {
    const a = o;
    i.push(a.title, a.name, a.slug, a.path);
  }
  t.length > 0 && i.push(t[0].title, t[0].name, t[0].slug, t[0].path);
  for (const a of i) if (typeof a == "string" && a.trim()) return a.trim();
}
function Co(e, t) {
  const r = e[t];
  return typeof r == "string" && r.trim() ? r : null;
}
function is(e) {
  const t = /* @__PURE__ */ new Set(), r = /* @__PURE__ */ new Set();
  let n = !1, s = 0;
  for (const o of e) {
    const a = o.translation_readiness;
    if (a) {
      const c = a.available_locales, d = a.missing_required_locales, u = a.readiness_state;
      Array.isArray(c) && c.filter(De).forEach((h) => t.add(h)), Array.isArray(d) && d.filter(De).forEach((h) => r.add(h)), (u === "missing_fields" || u === "missing_locales_and_fields") && (n = !0), u === "ready" && s++;
    }
    const l = o.available_locales;
    Array.isArray(l) && l.filter(De).forEach((c) => t.add(c));
  }
  let i = null;
  if (e.length > 0) {
    const o = s === e.length, a = r.size > 0;
    o ? i = "ready" : a && n ? i = "missing_locales_and_fields" : a ? i = "missing_locales" : n && (i = "missing_fields");
  }
  return {
    totalItems: e.length,
    availableLocales: Array.from(t),
    missingLocales: Array.from(r),
    readinessState: i,
    readyForPublish: i === "ready"
  };
}
function De(e) {
  return typeof e == "string";
}
function Eo(e, t) {
  const r = e.groups.map((n) => {
    const s = t.get(n.groupId);
    return s ? {
      ...n,
      summary: {
        ...n.summary,
        ...s
      },
      summaryFromBackend: !0
    } : n;
  });
  return {
    ...e,
    groups: r
  };
}
function Ao(e) {
  const t = /* @__PURE__ */ new Map(), r = e.group_summaries;
  if (!r || typeof r != "object" || Array.isArray(r)) return t;
  for (const [n, s] of Object.entries(r)) if (s && typeof s == "object") {
    const i = s;
    t.set(n, {
      totalItems: typeof i.total_items == "number" ? i.total_items : void 0,
      availableLocales: Array.isArray(i.available_locales) ? i.available_locales.filter(De) : void 0,
      missingLocales: Array.isArray(i.missing_locales) ? i.missing_locales.filter(De) : void 0,
      readinessState: os(i.readiness_state) ? i.readiness_state : void 0,
      readyForPublish: typeof i.ready_for_publish == "boolean" ? i.ready_for_publish : void 0
    });
  }
  return t;
}
function os(e) {
  return e === "ready" || e === "missing_locales" || e === "missing_fields" || e === "missing_locales_and_fields";
}
var Bt = "datagrid-expand-state-";
function vr(e) {
  if (!Array.isArray(e)) return [];
  const t = [];
  for (const r of e) {
    const n = jr(r);
    if (n && !t.includes(n)) {
      if (t.length >= Nr) break;
      t.push(n);
    }
  }
  return t;
}
function as(e) {
  if (!e) return null;
  try {
    const t = JSON.parse(e);
    return Array.isArray(t) ? {
      version: 2,
      mode: "explicit",
      ids: vr(t)
    } : !t || typeof t != "object" || Array.isArray(t) ? null : {
      version: 2,
      mode: ct(t.mode, "explicit"),
      ids: vr(t.ids)
    };
  } catch {
    return null;
  }
}
function ko(e) {
  try {
    const t = Bt + e, r = as(localStorage.getItem(t));
    if (r) return new Set(r.ids);
  } catch {
  }
  return /* @__PURE__ */ new Set();
}
function $o(e) {
  try {
    const t = Bt + e, r = as(localStorage.getItem(t));
    if (r) return r.mode;
  } catch {
  }
  return "explicit";
}
function _o(e) {
  try {
    const t = Bt + e;
    return localStorage.getItem(t) !== null;
  } catch {
    return !1;
  }
}
function $u(e, t, r = "explicit") {
  try {
    const n = Bt + e, s = vr(Array.from(t)), i = {
      version: 2,
      mode: ct(r, "explicit"),
      ids: s
    };
    localStorage.setItem(n, JSON.stringify(i));
  } catch {
  }
}
function _u(e, t) {
  const r = e.groups.map((n) => n.groupId === t ? {
    ...n,
    expanded: !n.expanded
  } : n);
  return {
    ...e,
    groups: r
  };
}
function Lu(e) {
  const t = e.groups.map((r) => ({
    ...r,
    expanded: !0
  }));
  return {
    ...e,
    groups: t
  };
}
function Tu(e) {
  const t = e.groups.map((r) => ({
    ...r,
    expanded: !1
  }));
  return {
    ...e,
    groups: t
  };
}
function Du(e) {
  const t = /* @__PURE__ */ new Set();
  for (const r of e.groups) r.expanded && t.add(r.groupId);
  return t;
}
var ls = "datagrid-view-mode-", Nr = 200, Lo = 256;
function ct(e, t = "explicit") {
  return e === "all" || e === "none" || e === "explicit" ? e : t;
}
function To(e) {
  try {
    const t = ls + e, r = localStorage.getItem(t);
    if (r && cs(r)) return r;
  } catch {
  }
  return null;
}
function Ru(e, t) {
  try {
    const r = ls + e;
    localStorage.setItem(r, t);
  } catch {
  }
}
function cs(e) {
  return e === "flat" || e === "grouped" || e === "matrix" || e === "server_family";
}
function ds(e) {
  return e && cs(e) ? e : null;
}
function Mu(e) {
  if (!(e instanceof Set) || e.size === 0) return "";
  const t = Array.from(new Set(Array.from(e).map((r) => jr(r)).filter((r) => r !== null))).slice(0, Nr).sort();
  return t.length === 0 ? "" : t.map((r) => encodeURIComponent(r)).join(",");
}
function Do(e) {
  const t = /* @__PURE__ */ new Set();
  if (!e) return t;
  const r = e.split(",");
  for (const n of r) {
    if (t.size >= Nr) break;
    if (!n) continue;
    let s = "";
    try {
      s = decodeURIComponent(n);
    } catch {
      continue;
    }
    const i = jr(s);
    i && t.add(i);
  }
  return t;
}
function jr(e) {
  if (typeof e != "string") return null;
  let t = e.trim();
  if (!t) return null;
  if (t.includes("%")) try {
    const r = decodeURIComponent(t);
    typeof r == "string" && r.trim() && (t = r.trim());
  } catch {
  }
  return t.length > Lo ? null : t;
}
function Ro(e, t = {}) {
  const { summary: r } = e, { size: n = "sm" } = t, s = n === "sm" ? "text-xs" : "text-sm", i = r.availableLocales.length, o = i + r.missingLocales.length;
  let a = "";
  if (r.readinessState) {
    const d = Mo(r.readinessState);
    a = `
      <span class="${s} px-1.5 py-0.5 rounded ${d.bgClass} ${d.textClass}"
            title="${d.description}">
        ${d.icon} ${d.label}
      </span>
    `;
  }
  const l = o > 0 ? `<span class="${s} text-gray-500">${i}/${o} locales</span>` : "", c = `<span class="${s} text-gray-500">${r.totalItems} item${r.totalItems !== 1 ? "s" : ""}</span>`;
  return `
    <div class="inline-flex items-center gap-2">
      ${a}
      ${l}
      ${c}
    </div>
  `;
}
function Mo(e) {
  switch (e) {
    case "ready":
      return {
        icon: "●",
        label: "Ready",
        bgClass: "bg-green-100",
        textClass: "text-green-700",
        description: "All translations complete"
      };
    case "missing_locales":
      return {
        icon: "○",
        label: "Missing",
        bgClass: "bg-amber-100",
        textClass: "text-amber-700",
        description: "Missing required locale translations"
      };
    case "missing_fields":
      return {
        icon: "◐",
        label: "Incomplete",
        bgClass: "bg-yellow-100",
        textClass: "text-yellow-700",
        description: "Has translations but missing required fields"
      };
    case "missing_locales_and_fields":
      return {
        icon: "⚠",
        label: "Not Ready",
        bgClass: "bg-red-100",
        textClass: "text-red-700",
        description: "Missing translations and required fields"
      };
    default:
      return {
        icon: "?",
        label: "Unknown",
        bgClass: "bg-gray-100",
        textClass: "text-gray-700",
        description: "Status unknown"
      };
  }
}
function Io(e) {
  if (typeof e.displayLabel == "string" && e.displayLabel.trim()) return e.displayLabel.trim();
  if (e.groupId.startsWith("ungrouped:")) return "Ungrouped Records";
  if (e.records.length > 0) {
    const t = e.records[0];
    for (const r of [
      "title",
      "name",
      "label",
      "subject"
    ]) {
      const n = t[r];
      if (typeof n == "string" && n.trim()) {
        const s = n.trim();
        return s.length > 60 ? s.slice(0, 57) + "..." : s;
      }
    }
  }
  return `Translation Group (${e.groupId.length > 8 ? e.groupId.slice(0, 8) + "..." : e.groupId})`;
}
function Po(e, t, r = {}) {
  const { showExpandIcon: n = !0, fixedColumnCount: s = 2 } = r, i = n ? `<span class="expand-icon mr-2" aria-hidden="true">${e.expanded ? "▼" : "▶"}</span>` : "", o = Ro(e), a = f(Io(e)), l = e.records.length, c = l > 1 ? `<span class="ml-2 text-xs text-gray-500">(${l} locales)</span>` : "";
  return `
    <tr class="group-header bg-gray-50 hover:bg-gray-100 cursor-pointer border-b border-gray-200"
        data-group-id="${w(e.groupId)}"
        data-expanded="${e.expanded}"
        role="row"
        aria-expanded="${e.expanded}"
        tabindex="0">
      <td colspan="${t + s}" class="px-4 py-2">
        <div class="flex items-center justify-between">
          <div class="flex items-center">
            ${i}
            <span class="font-medium text-gray-700">${a}</span>
            ${c}
          </div>
          ${o}
        </div>
      </td>
    </tr>
  `;
}
function Bo(e, t = 2) {
  return `
    <tr class="admin-datagrid__state-row" data-datagrid-state="empty">
      <td colspan="${e + t}" class="admin-datagrid__state admin-datagrid__state--empty px-6 py-12 text-center">
        <div class="text-gray-500">
          <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
          </svg>
          <h3 class="mt-2 text-sm font-medium text-gray-900">No translation groups</h3>
          <p class="mt-1 text-sm text-gray-500">No grouped translations found for this content type.</p>
        </div>
      </td>
    </tr>
  `;
}
function Oo(e, t = 2) {
  return `
    <tr class="admin-datagrid__state-row" data-datagrid-state="loading">
      <td colspan="${e + t}" class="admin-datagrid__state admin-datagrid__state--loading px-6 py-12 text-center" role="status" aria-live="polite">
        <div class="flex items-center justify-center">
          <svg class="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span class="ml-2 text-gray-500">Loading groups...</span>
        </div>
      </td>
    </tr>
  `;
}
function Fo(e, t, r, n = 2) {
  const s = r ? `<button type="button" class="mt-2 px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600" onclick="this.dispatchEvent(new CustomEvent('retry', { bubbles: true }))">Retry</button>` : "";
  return `
    <tr class="admin-datagrid__state-row" data-datagrid-state="error">
      <td colspan="${e + n}" class="admin-datagrid__state admin-datagrid__state--error px-6 py-12 text-center" role="alert" aria-live="assertive">
        <div class="text-red-500">
          <svg class="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
          <h3 class="mt-2 text-sm font-medium text-gray-900">Error loading groups</h3>
          <p class="mt-1 text-sm text-gray-500">${f(t)}</p>
          ${s}
        </div>
      </td>
    </tr>
  `;
}
function qo(e = 768) {
  return typeof window > "u" ? !1 : window.innerWidth < e;
}
function zr(e, t = 768) {
  return qo(t) && e === "grouped" ? "flat" : e;
}
var it = "search", ot = "page", at = "per_page", Re = "filters", lt = "sort", Ot = "state", vt = "advanced_search", Ft = "hidden_columns", qt = "view_mode", Gr = "expanded_groups", us = [
  "perPage",
  "hiddenColumns",
  "advancedSearch"
], Hr = [
  it,
  ot,
  at,
  Re,
  lt,
  Ot,
  Ft,
  qt,
  Gr
], No = [...Hr, vt], jo = 1800;
function on(e, t) {
  const r = t.toString();
  return r ? `${e}?${r}` : e;
}
function an(e, t) {
  for (const r of t) e.delete(r);
}
function zo(e) {
  return {
    maxURLLength: Math.max(256, e.config.urlState?.maxURLLength || 1800),
    maxFiltersLength: Math.max(64, e.config.urlState?.maxFiltersLength || 600),
    enableStateToken: e.config.urlState?.enableStateToken !== !1
  };
}
function Go(e, t, r) {
  const n = String(t || "").trim();
  if (!n) return null;
  try {
    const s = JSON.parse(n);
    return Array.isArray(s) ? s : (console.warn(`[DataGrid] Invalid ${r} payload in URL (expected array)`), null);
  } catch (s) {
    return console.warn(`[DataGrid] Failed to parse ${r} payload from URL:`, s), null;
  }
}
function ln(e, t) {
  return Array.from(new Set(Array.from(e).map((r) => String(r || "").trim()).filter((r) => r.length > 0 && t.has(r)))).sort();
}
function Ho(e, t) {
  return e.length !== t.length ? !1 : e.every((r, n) => r === t[n]);
}
function Uo(e) {
  const t = new Set(e.config.columns.map((n) => n.field)), r = ln(e.state.hiddenColumns || [], t);
  return Ho(r, ln(e.config.columns.filter((n) => n.hidden).map((n) => n.field), t)) ? null : JSON.stringify(r);
}
function Vo(e, t, r = {}) {
  const n = r.merge === !0, s = new Set(e.config.columns.map((a) => a.field)), i = Array.isArray(t.hiddenColumns) ? new Set(t.hiddenColumns.map((a) => String(a || "").trim()).filter((a) => a.length > 0 && s.has(a))) : null;
  i ? (e.state.hiddenColumns = i, e.hasPersistedHiddenColumnState = !0) : n || (e.state.hiddenColumns = new Set(e.config.columns.filter((a) => a.hidden).map((a) => a.field)), e.hasPersistedHiddenColumnState = !1);
  const o = Array.isArray(t.columnOrder) ? t.columnOrder.map((a) => String(a || "").trim()).filter((a) => a.length > 0 && s.has(a)) : null;
  if (o && o.length > 0) {
    const a = e.mergeColumnOrder(o);
    e.state.columnOrder = a, e.hasPersistedColumnOrderState = !0, e.didRestoreColumnOrder = !0, e.shouldReorderDOMOnRestore = e.defaultColumns.map((c) => c.field).join("|") !== a.join("|");
    const l = new Map(e.config.columns.map((c) => [c.field, c]));
    e.config.columns = a.map((c) => l.get(c)).filter((c) => c !== void 0);
  } else n || (e.state.columnOrder = e.config.columns.map((a) => a.field), e.hasPersistedColumnOrderState = !1, e.didRestoreColumnOrder = !1, e.shouldReorderDOMOnRestore = !1);
  if (e.config.enableGroupedMode) {
    if (t.viewMode) {
      const a = ds(t.viewMode);
      a && (e.state.viewMode = zr(a));
    }
    e.state.expandMode = ct(t.expandMode, e.state.expandMode), Array.isArray(t.expandedGroups) ? (e.state.expandedGroups = new Set(t.expandedGroups.map((a) => String(a || "").trim()).filter(Boolean)), e.state.hasPersistedExpandState = !0) : t.expandMode !== void 0 && (e.state.hasPersistedExpandState = !0);
  }
}
function Ko(e, t) {
  t.persisted && e.applyPersistedStateSnapshot(t.persisted, { merge: !0 }), typeof t.search == "string" && (e.state.search = t.search), typeof t.page == "number" && Number.isFinite(t.page) && (e.state.currentPage = Math.max(1, Math.trunc(t.page))), typeof t.perPage == "number" && Number.isFinite(t.perPage) && (e.state.perPage = Math.max(1, Math.trunc(t.perPage))), Array.isArray(t.filters) && (e.state.filters = t.filters), Array.isArray(t.sort) && (e.state.sort = t.sort);
}
function Jo(e) {
  const t = {
    version: 1,
    hiddenColumns: Array.from(e.state.hiddenColumns),
    columnOrder: [...e.state.columnOrder],
    updatedAt: Date.now()
  };
  return e.config.enableGroupedMode && (t.viewMode = e.state.viewMode, t.expandMode = e.state.expandMode, t.expandedGroups = Array.from(e.state.expandedGroups)), t;
}
function Yo(e) {
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
function Wo(e) {
  e.stateStore.savePersistedState(e.buildPersistedStateSnapshot());
}
function Xo(e) {
  const t = new URLSearchParams(window.location.search);
  e.didRestoreColumnOrder = !1, e.shouldReorderDOMOnRestore = !1, e.hasURLStateOverrides = No.some((c) => t.has(c));
  const r = t.get(Ot);
  if (r) {
    const c = e.stateStore.resolveShareState(r);
    c && e.applyShareStateSnapshot(c);
  }
  const n = t.get(it);
  if (n) {
    e.state.search = n;
    const c = document.querySelector(e.selectors.searchInput);
    c && (c.value = n);
  }
  const s = t.get(ot);
  if (s) {
    const c = parseInt(s, 10);
    e.state.currentPage = Number.isNaN(c) ? 1 : Math.max(1, c);
  }
  const i = t.get(at);
  if (i) {
    const c = parseInt(i, 10), d = e.config.perPage || 10;
    e.state.perPage = Number.isNaN(c) ? d : Math.max(1, c);
    const u = document.querySelector(e.selectors.perPageSelect);
    u && (u.value = String(e.state.perPage));
  }
  const o = t.get(Re);
  if (o) {
    const c = e.parseJSONArray(o, "filters");
    c && (e.state.filters = c);
  }
  const a = t.get(lt);
  if (a) {
    const c = e.parseJSONArray(a, "sort");
    c && (e.state.sort = c);
  }
  if (e.config.enableGroupedMode) {
    const c = ds(t.get(qt));
    c && (e.state.viewMode = zr(c)), t.has("expanded_groups") && (e.state.expandedGroups = Do(t.get(Gr)), e.state.expandMode = "explicit", e.state.hasPersistedExpandState = !0);
  }
  const l = t.get(Ft);
  if (l) {
    const c = e.parseJSONArray(l, "hidden columns");
    if (c) {
      const d = new Set(e.config.columns.map((u) => u.field));
      e.state.hiddenColumns = new Set(c.map((u) => typeof u == "string" ? u.trim() : "").filter((u) => u.length > 0 && d.has(u)));
    }
  } else if (!e.hasPersistedHiddenColumnState && e.config.behaviors?.columnVisibility) {
    const c = e.config.columns.map((u) => u.field), d = e.config.behaviors.columnVisibility.loadHiddenColumnsFromCache(c);
    d.size > 0 && (e.state.hiddenColumns = d);
  }
  if (!e.hasPersistedColumnOrderState && e.config.behaviors?.columnVisibility?.loadColumnOrderFromCache) {
    const c = e.config.columns.map((u) => u.field), d = e.config.behaviors.columnVisibility.loadColumnOrderFromCache(c);
    if (d && d.length > 0) {
      const u = e.mergeColumnOrder(d);
      e.state.columnOrder = u, e.didRestoreColumnOrder = !0, e.shouldReorderDOMOnRestore = e.defaultColumns.map((p) => p.field).join("|") !== u.join("|");
      const h = new Map(e.config.columns.map((p) => [p.field, p]));
      e.config.columns = u.map((p) => h.get(p)).filter((p) => p !== void 0);
    }
  }
  e.persistStateSnapshot(), console.log("[DataGrid] State restored from URL:", e.state), setTimeout(() => {
    e.applyRestoredState();
  }, 0);
}
function Qo(e) {
  const t = document.querySelector(e.selectors.searchInput);
  t && (t.value = e.state.search);
  const r = document.querySelector(e.selectors.perPageSelect);
  r && (r.value = String(e.state.perPage)), e.state.filters.length > 0 && e.state.filters.forEach((s) => {
    const i = document.querySelector(`[data-filter-column="${s.column}"]`);
    i && (i.value = String(s.value));
  }), e.didRestoreColumnOrder && e.shouldReorderDOMOnRestore && e.reorderTableColumns(e.state.columnOrder);
  const n = e.config.columns.filter((s) => !e.state.hiddenColumns.has(s.field)).map((s) => s.field);
  e.updateColumnVisibility(n, !0), e.state.sort.length > 0 && e.updateSortIndicators();
}
function Zo(e, t = {}) {
  e.persistStateSnapshot();
  const r = e.getURLStateConfig(), n = new URLSearchParams(window.location.search);
  an(n, Hr), an(n, us), e.state.search && n.set(it, e.state.search), e.state.currentPage > 1 && n.set(ot, String(e.state.currentPage)), e.state.perPage !== (e.config.perPage || 10) && n.set(at, String(e.state.perPage));
  let s = !1;
  if (e.state.filters.length > 0) {
    const l = JSON.stringify(e.state.filters);
    l.length <= r.maxFiltersLength ? n.set(Re, l) : s = !0;
  }
  e.state.sort.length > 0 && n.set(lt, JSON.stringify(e.state.sort));
  const i = Uo(e);
  i !== null && n.set(Ft, i), e.config.enableGroupedMode && n.set(qt, e.state.viewMode);
  let o = on(window.location.pathname, n);
  const a = o.length > r.maxURLLength;
  if (r.enableStateToken && (s || a)) {
    n.delete(it), n.delete(ot), n.delete(at), n.delete(Re), n.delete(lt);
    const l = e.stateStore.createShareState(e.buildShareStateSnapshot());
    l && n.set(Ot, l), o = on(window.location.pathname, n);
  }
  t.replace ? window.history.replaceState({}, "", o) : window.history.pushState({}, "", o), console.log("[DataGrid] URL updated:", o);
}
async function ea(e, t) {
  console.log("[DataGrid] ===== refresh() CALLED ====="), console.log("[DataGrid] Current sort state:", JSON.stringify(e.state.sort)), e.abortController && e.abortController.abort(), e.abortController = new AbortController(), e.setRenderState("loading"), e.renderLoadingState();
  try {
    const r = e.buildApiUrl(), n = await j(r, {
      signal: e.abortController.signal,
      method: "GET",
      accept: "application/json"
    });
    if (!n.ok) {
      if (e.handleGroupedModeStatusFallback(n.status)) return;
      throw new Error(`HTTP error! status: ${n.status}`);
    }
    const s = await n.json(), i = Ii(s) || s;
    if (typeof t == "number" && typeof e.isCurrentRefresh == "function" && !e.isCurrentRefresh(t)) {
      console.log("[DataGrid] Ignoring stale refresh response");
      return;
    }
    console.log("[DataGrid] API Response:", i), console.log("[DataGrid] API Response data array:", i.data), console.log("[DataGrid] API Response total:", i.total, "count:", i.count, "$meta:", i.$meta);
    const o = i.data || i.records || [];
    if (e.handleGroupedModePayloadFallback(o)) return;
    e.lastSchema = i.schema || null, e.lastForm = i.form || null, e.setBulkActionState(i.$meta?.bulk_action_state || null, i.schema?.bulk_action_state_config || null);
    const a = e.getResponseTotal(i);
    if (e.normalizePagination(a)) {
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
    const n = "Failed to load data";
    e.renderErrorState(n), e.setRenderState("error"), e.showError(n);
  }
}
function ta(e) {
  const t = new URLSearchParams(), r = e.buildQueryParams();
  Object.entries(r).forEach(([s, i]) => {
    i != null && t.append(s, String(i));
  });
  const n = `${e.config.apiEndpoint}?${t.toString()}`;
  return console.log(`[DataGrid] API URL: ${n}`), n;
}
function ra(e) {
  const t = new URLSearchParams(), r = e.buildQueryParams();
  return Object.entries(r).forEach(([n, s]) => {
    s != null && t.append(n, String(s));
  }), t.toString();
}
function na(e) {
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
function sa(e, t) {
  return t.total !== void 0 && t.total !== null ? t.total : t.$meta?.count !== void 0 && t.$meta?.count !== null ? t.$meta.count : t.count !== void 0 && t.count !== null ? t.count : null;
}
function ia(e, t) {
  if (t === null) return !1;
  const r = Math.max(1, e.state.perPage || e.config.perPage || 10), n = Math.max(1, Math.ceil(t / r));
  let s = e.state.currentPage;
  t === 0 ? s = 1 : s > n ? s = n : s < 1 && (s = 1);
  const i = r !== e.state.perPage || s !== e.state.currentPage;
  return i && (e.state.perPage = r, e.state.currentPage = s, e.pushStateToURL()), t === 0 ? !1 : i;
}
async function oa(e, t) {
  const r = await j(`${e.config.apiEndpoint}/${t}`, {
    method: "GET",
    accept: "application/json"
  });
  if (!r.ok) throw new Error(`Detail request failed: ${r.status}`);
  const n = await r.json(), s = e.normalizeDetailResponse(n);
  return s.schema && (e.lastSchema = s.schema), s.form && (e.lastForm = s.form), {
    ...s,
    tabs: s.schema?.tabs || []
  };
}
function aa(e, t) {
  const r = qn(t) || t;
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
function la(e) {
  return e.lastSchema;
}
function ca(e) {
  return e.lastForm;
}
function da(e) {
  return e.lastSchema?.tabs || [];
}
function Ur(e) {
  return typeof e.config.rowActions == "function" || e.config.useDefaultActions !== !1;
}
function dt(e) {
  return (Ur(e) ? 1 : 0) + (e.isCapabilityEnabled("selection") ? 1 : 0);
}
function fs(e) {
  return Math.max(1, (e.config.columns?.length || 0) + dt(e));
}
function ua(e, t, r, n) {
  const s = e.config.groupByField || "family_id", i = r.filter((c) => !!c && typeof c == "object" && !Array.isArray(c));
  let o = bo(i, {
    groupByField: s,
    defaultExpanded: !e.state.hasPersistedExpandState,
    expandMode: e.state.expandMode,
    expandedGroups: e.state.expandedGroups
  });
  o || (o = go(i, {
    groupByField: s,
    defaultExpanded: !e.state.hasPersistedExpandState,
    expandMode: e.state.expandMode,
    expandedGroups: e.state.expandedGroups
  }));
  const a = Ao(t);
  a.size > 0 && (o = Eo(o, a)), e.state.groupedData = o;
  const l = e.config.columns.length;
  for (const c of o.groups) {
    const d = Po(c, l, { fixedColumnCount: dt(e) });
    n.insertAdjacentHTML("beforeend", d);
    const u = n.lastElementChild;
    u && (u.addEventListener("click", () => e.toggleGroup(c.groupId)), u.addEventListener("keydown", (h) => {
      (h.key === "Enter" || h.key === " ") && (h.preventDefault(), e.toggleGroup(c.groupId));
    }));
    for (const h of c.records) {
      h.id && (e.recordsById[h.id] = h);
      const p = e.createTableRow(h);
      p.dataset.groupId = c.groupId, p.classList.add("group-child-row"), c.expanded || (p.style.display = "none"), n.appendChild(p);
    }
  }
  for (const c of o.ungrouped) {
    c.id && (e.recordsById[c.id] = c);
    const d = e.createTableRow(c);
    n.appendChild(d);
  }
  console.log(`[DataGrid] Rendered ${o.groups.length} groups, ${o.ungrouped.length} ungrouped`);
}
function fa(e) {
  return e.config.enableGroupedMode ? e.state.viewMode === "grouped" || e.state.viewMode === "matrix" : !1;
}
function ha(e, t) {
  e.isGroupedViewActive() && (e.state.viewMode = "flat", e.state.groupedData = null, e.pushStateToURL({ replace: !0 }), e.notify(t, "warning"), e.refresh());
}
function pa(e, t) {
  return !e.isGroupedViewActive() || ![
    400,
    404,
    405,
    422
  ].includes(t) ? !1 : (e.fallbackGroupedMode("Grouped pagination is not supported by this panel. Switched to flat view."), !0);
}
function ma(e, t) {
  if (!e.isGroupedViewActive() || t.length === 0) return !1;
  const r = t.filter((n) => !!n && typeof n == "object" && !Array.isArray(n));
  return r.length !== t.length || !es(r) ? (e.fallbackGroupedMode("Grouped pagination contract is unavailable. Switched to flat view to avoid split groups."), !0) : !1;
}
function ga(e, t) {
  if (!e.state.groupedData) return;
  const r = String(t || "").trim();
  if (!r) return;
  const n = e.isGroupExpandedByState(r, !e.state.hasPersistedExpandState);
  e.state.expandMode === "all" ? n ? e.state.expandedGroups.add(r) : e.state.expandedGroups.delete(r) : e.state.expandMode === "none" ? n ? e.state.expandedGroups.delete(r) : e.state.expandedGroups.add(r) : (!e.state.hasPersistedExpandState && e.state.expandedGroups.size === 0 && (e.state.expandedGroups = new Set(e.state.groupedData.groups.map((i) => i.groupId))), e.state.expandedGroups.has(r) ? e.state.expandedGroups.delete(r) : e.state.expandedGroups.add(r)), e.state.hasPersistedExpandState = !0;
  const s = e.state.groupedData.groups.find((i) => i.groupId === r);
  s && (s.expanded = e.isGroupExpandedByState(r)), e.updateGroupVisibility(r), e.pushStateToURL({ replace: !0 });
}
function ba(e, t) {
  if (!e.config.enableGroupedMode) return;
  const r = new Set((t || []).map((n) => String(n || "").trim()).filter(Boolean));
  e.state.expandMode = "explicit", e.state.expandedGroups = r, e.state.hasPersistedExpandState = !0, e.updateGroupedRowsFromState(), e.pushStateToURL({ replace: !0 }), !e.state.groupedData && e.isGroupedViewActive() && e.refresh();
}
function ya(e) {
  e.config.enableGroupedMode && (e.state.expandMode = "all", e.state.expandedGroups.clear(), e.state.hasPersistedExpandState = !0, e.updateGroupedRowsFromState(), e.pushStateToURL({ replace: !0 }), !e.state.groupedData && e.isGroupedViewActive() && e.refresh());
}
function va(e) {
  e.config.enableGroupedMode && (e.state.expandMode = "none", e.state.expandedGroups.clear(), e.state.hasPersistedExpandState = !0, e.updateGroupedRowsFromState(), e.pushStateToURL({ replace: !0 }), !e.state.groupedData && e.isGroupedViewActive() && e.refresh());
}
function wa(e, t) {
  const r = e.tableEl?.querySelector("tbody");
  if (!r) return;
  const n = r.querySelector(`tr[data-group-id="${t}"]`);
  if (!n) return;
  const s = e.isGroupExpandedByState(t);
  n.dataset.expanded = String(s), n.setAttribute("aria-expanded", String(s));
  const i = n.querySelector(".expand-icon");
  i && (i.textContent = s ? "▼" : "▶"), r.querySelectorAll(`tr.group-child-row[data-group-id="${t}"]`).forEach((o) => {
    o.style.display = s ? "" : "none";
  });
}
function xa(e) {
  if (e.state.groupedData)
    for (const t of e.state.groupedData.groups)
      t.expanded = e.isGroupExpandedByState(t.groupId), e.updateGroupVisibility(t.groupId);
}
function Sa(e, t, r = !1) {
  const n = ct(e.state.expandMode, "explicit");
  return n === "all" ? !e.state.expandedGroups.has(t) : n === "none" ? e.state.expandedGroups.has(t) : e.state.expandedGroups.size === 0 ? r : e.state.expandedGroups.has(t);
}
function Ca(e, t) {
  if (!e.config.enableGroupedMode) {
    console.warn("[DataGrid] Grouped mode not enabled");
    return;
  }
  const r = zr(t);
  e.state.viewMode = r, r === "flat" && (e.state.groupedData = null), e.pushStateToURL(), e.refresh();
}
function Ea(e) {
  return e.state.viewMode;
}
function Aa(e) {
  return e.state.groupedData;
}
function ka(e) {
  return {
    textCode: null,
    message: e,
    metadata: null,
    fields: null,
    validationErrors: null
  };
}
async function $a(e) {
  const t = String(e.confirmMessage || "Are you sure you want to delete this item?").trim() || "Are you sure you want to delete this item?", r = String(e.confirmTitle || "Confirm Delete").trim() || "Confirm Delete";
  if (e.notifier?.confirm) return e.notifier.confirm(t, {
    title: r,
    confirmText: "Delete",
    cancelText: "Cancel"
  });
  const n = globalThis.window;
  return n && typeof n.confirm == "function" ? n.confirm(t) : !0;
}
async function hs(e) {
  if (!await $a(e)) return null;
  const t = await Rn(e.endpoint, {
    method: "DELETE",
    headers: { Accept: "application/json" }
  });
  if (t.success)
    return await e.onSuccess?.(t), t;
  const r = String(e.fallbackMessage || "Delete failed").trim() || "Delete failed", n = t.error || ka(r), s = {
    ...n,
    message: ze(n, r)
  };
  throw s.textCode && e.reconcileOnDomainFailure && await e.reconcileOnDomainFailure(s), await e.onError?.(s), $t(s, r, !!e.onError);
}
function _a(e, t, r = !1) {
  if (!e.tableEl) return;
  const n = new Set(t);
  e.state.hiddenColumns.clear(), e.config.columns.forEach((s) => {
    n.has(s.field) || e.state.hiddenColumns.add(s.field);
  }), r || e.pushStateToURL(), e.tableEl.querySelectorAll("thead th[data-column]").forEach((s) => {
    const i = s.dataset.column;
    i && (s.style.display = n.has(i) ? "" : "none");
  }), e.tableEl.querySelectorAll("tbody td[data-column]").forEach((s) => {
    const i = s.dataset.column;
    i && (s.style.display = n.has(i) ? "" : "none");
  }), e.syncColumnVisibilityCheckboxes();
}
function La(e) {
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
function ps(e) {
  e.querySelectorAll("[data-datagrid-state]").forEach((t) => t.remove());
}
function Ta(e) {
  !e.tableEl || Ur(e) || e.tableEl.querySelectorAll('thead [data-role="actions"]').forEach((t) => t.remove());
}
function ms(e, t, r) {
  const n = document.createElement("tr");
  n.className = "admin-datagrid__state-row", n.dataset.datagridState = t;
  const s = document.createElement("td");
  return s.colSpan = fs(e), s.className = `admin-datagrid__state admin-datagrid__state--${t} px-6 py-8 text-center`, s.setAttribute("role", t === "error" ? "alert" : "status"), s.setAttribute("aria-live", t === "error" ? "assertive" : "polite"), s.textContent = r, n.appendChild(s), n;
}
function Da(e) {
  const t = e.tableEl?.querySelector("tbody");
  if (t && (ps(t), !(t.children.length > 0))) {
    if (e.isGroupedViewActive()) {
      t.insertAdjacentHTML("beforeend", Oo(e.config.columns.length, dt(e)));
      return;
    }
    t.appendChild(ms(e, "loading", "Loading…"));
  }
}
function Ra(e, t) {
  const r = e.tableEl?.querySelector("tbody");
  if (r) {
    if (ps(r), e.isGroupedViewActive()) {
      r.insertAdjacentHTML("afterbegin", Fo(e.config.columns.length, t, void 0, dt(e)));
      return;
    }
    r.prepend(ms(e, "error", t));
  }
}
function Ma(e, t) {
  const r = e.tableEl?.querySelector("tbody");
  if (!r) {
    console.error("[DataGrid] tbody not found!");
    return;
  }
  e.actionMenuController?.closeAll(), r.innerHTML = "";
  const n = t.data || t.records || [];
  console.log(`[DataGrid] renderData() called with ${n.length} items`), console.log("[DataGrid] First 3 items:", n.slice(0, 3));
  const s = e.getResponseTotal(t);
  if (e.state.totalRows = s ?? n.length, n.length === 0) {
    e.isGroupedViewActive() ? r.innerHTML = Bo(e.config.columns.length, dt(e)) : r.innerHTML = `
          <tr class="admin-datagrid__state-row" data-datagrid-state="empty">
            <td colspan="${fs(e)}" class="admin-datagrid__state admin-datagrid__state--empty px-6 py-8 text-center text-gray-500">
              No results found
            </td>
          </tr>
        `, e.setRenderState("empty");
    return;
  }
  e.recordsById = /* @__PURE__ */ Object.create(null), e.isGroupedViewActive() ? e.renderGroupedData(t, n, r) : e.renderFlatData(n, r), e.state.hiddenColumns.size > 0 && r.querySelectorAll("td[data-column]").forEach((i) => {
    const o = i.dataset.column;
    o && e.state.hiddenColumns.has(o) && (i.style.display = "none");
  }), e.isCapabilityEnabled("selection") && e.updateSelectionBindings(), e.setRenderState("ready");
}
function Ia(e, t, r) {
  t.forEach((n, s) => {
    console.log(`[DataGrid] Rendering row ${s + 1}: id=${n.id}`), n.id && (e.recordsById[n.id] = n);
    const i = e.createTableRow(n);
    r.appendChild(i);
  }), console.log(`[DataGrid] Finished appending ${t.length} rows to tbody`), console.log("[DataGrid] tbody.children.length =", r.children.length);
}
function Pa(e, t) {
  const r = t.rendererOptions ?? t.renderer_options;
  return !r || typeof r != "object" || Array.isArray(r) ? {} : r;
}
function Ba(e, t) {
  const r = document.createElement("tr");
  let n = ["admin-datagrid__row", "hover:bg-gray-50"];
  if (e.config.rowClassProvider && (n = n.concat(e.config.rowClassProvider(t))), r.className = n.join(" "), e.isCapabilityEnabled("selection")) {
    const a = document.createElement("td");
    a.className = "admin-datagrid__cell px-6 py-4 whitespace-nowrap", a.dataset.role = "selection", a.dataset.fixed = "left", a.innerHTML = `
        <label class="flex">
          <input type="checkbox"
                 class="table-checkbox shrink-0 border-gray-300 rounded text-blue-600 focus:ring-blue-500"
                 data-id="${w(t.id)}">
          <span class="sr-only">Select</span>
        </label>
      `, r.appendChild(a);
  }
  if (e.config.columns.forEach((a) => {
    const l = document.createElement("td");
    l.className = "admin-datagrid__cell px-6 py-4 whitespace-nowrap text-sm text-gray-800", l.setAttribute("data-column", a.field);
    const c = t[a.field], d = typeof a.renderer == "string" ? a.renderer.trim() : "", u = { options: e.resolveRendererOptions(a) };
    if (a.render) l.innerHTML = a.render(c, t);
    else if (e.cellRendererRegistry.has(a.field)) l.innerHTML = e.cellRendererRegistry.get(a.field)(c, t, a.field, u);
    else if (d && e.cellRendererRegistry.has(d)) l.innerHTML = e.cellRendererRegistry.get(d)(c, t, a.field, u);
    else if (c == null) l.textContent = "-";
    else if (a.field.includes("_at")) {
      const h = kt(c);
      l.textContent = h ? h.toLocaleDateString() : String(c);
    } else l.textContent = String(c);
    r.appendChild(l);
  }), !Ur(e)) return r;
  const s = e.config.actionBasePath || e.config.apiEndpoint, i = document.createElement("td");
  i.className = "admin-datagrid__cell admin-datagrid__actions px-6 py-4 whitespace-nowrap text-end text-sm font-medium", i.dataset.role = "actions", i.dataset.fixed = "right";
  const o = (a) => {
    i.innerHTML = e.actionRenderer.renderRowActions(t, a), e.actionRenderer.attachRowActionListeners(i, a, t, { onError: async (l, c) => {
      if (We(l)?.textCode && await e.refresh(), !Te(l)) {
        const d = l instanceof Error ? l.message : `Action "${c.label}" failed`;
        e.notify(d, "error");
      }
    } });
  };
  return e.config.rowActions ? o(e.config.rowActions(t)) : e.config.useDefaultActions !== !1 && o([
    {
      label: "View",
      icon: "eye",
      action: () => {
        window.location.href = `${s}/${t.id}`;
      },
      variant: "secondary"
    },
    {
      label: "Edit",
      icon: "edit",
      action: () => {
        window.location.href = `${s}/${t.id}/edit`;
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
function Oa(e, t) {
  return t.toLowerCase().replace(/[^a-z0-9]/g, "-");
}
async function Fa(e, t) {
  try {
    await hs({
      endpoint: `${e.config.apiEndpoint}/${t}`,
      confirmMessage: "Are you sure you want to delete this item?",
      confirmTitle: "Confirm Delete",
      onSuccess: async () => {
        await e.refresh();
      },
      onError: (r) => {
        e.showError(ze(r, "Delete failed"));
      },
      reconcileOnDomainFailure: async () => {
        await e.refresh();
      },
      notifier: { confirm: async (r, n) => e.confirmAction(r, n) }
    });
  } catch (r) {
    console.error("Error deleting item:", r), Te(r) || e.showError(r instanceof Error ? r.message : "Failed to delete item");
  }
}
function qa(e, t) {
  const r = e.getResponseTotal(t) ?? e.state.totalRows, n = e.state.perPage * (e.state.currentPage - 1), s = r === 0 ? 0 : n + 1, i = Math.min(n + e.state.perPage, r), o = document.querySelector(e.selectors.tableInfoStart), a = document.querySelector(e.selectors.tableInfoEnd), l = document.querySelector(e.selectors.tableInfoTotal);
  o && (o.textContent = String(s)), a && (a.textContent = String(i)), l && (l.textContent = String(r)), e.renderPaginationButtons(r);
}
function Na(e, t) {
  const r = document.querySelector(e.selectors.paginationContainer);
  if (!r) return;
  const n = Math.ceil(t / e.state.perPage);
  if (n <= 1) {
    r.innerHTML = "";
    return;
  }
  const s = [], i = e.state.currentPage;
  s.push(`
      <button type="button"
              data-page="${i - 1}"
              aria-label="Previous page"
              ${i === 1 ? "disabled" : ""}
              class="admin-datagrid__page-button min-h-[38px] min-w-[38px] py-2 px-2.5 inline-flex justify-center items-center gap-x-1.5 text-sm rounded-lg text-gray-800 hover:bg-gray-100 focus:outline-none focus:bg-gray-100 disabled:opacity-50 disabled:pointer-events-none">
        <svg class="shrink-0 size-3.5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m15 18-6-6 6-6"></path>
        </svg>
        <span>Previous</span>
      </button>
    `);
  for (const o of ja(n, i)) {
    if (o === "ellipsis") {
      s.push('<span class="admin-datagrid__page-ellipsis min-w-[24px] text-center text-gray-500" aria-hidden="true">…</span>');
      continue;
    }
    const a = o === i;
    s.push(`
        <button type="button"
                data-page="${o}"
                aria-label="Page ${o}"
                ${a ? 'aria-current="page"' : ""}
                class="min-h-[38px] min-w-[38px] flex justify-center items-center ${a ? "bg-gray-200 text-gray-800 focus:outline-none focus:bg-gray-300" : "text-gray-800 hover:bg-gray-100 focus:outline-none focus:bg-gray-100"} admin-datagrid__page-button py-2 px-3 text-sm rounded-lg">
          ${o}
        </button>
      `);
  }
  s.push(`
      <button type="button"
              data-page="${i + 1}"
              aria-label="Next page"
              ${i === n ? "disabled" : ""}
              class="admin-datagrid__page-button min-h-[38px] min-w-[38px] py-2 px-2.5 inline-flex justify-center items-center gap-x-1.5 text-sm rounded-lg text-gray-800 hover:bg-gray-100 focus:outline-none focus:bg-gray-100 disabled:opacity-50 disabled:pointer-events-none">
        <span>Next</span>
        <svg class="shrink-0 size-3.5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m9 18 6-6-6-6"></path>
        </svg>
      </button>
    `), r.innerHTML = s.join(""), r.querySelectorAll("[data-page]").forEach((o) => {
    o.addEventListener("click", async () => {
      const a = parseInt(o.dataset.page || "1", 10);
      a >= 1 && a <= n && (e.state.currentPage = a, e.pushStateToURL(), e.config.behaviors?.pagination ? await e.config.behaviors.pagination.onPageChange(a, e) : await e.refresh());
    });
  });
}
function ja(e, t) {
  const r = Math.max(0, Math.floor(e)), n = Math.min(Math.max(1, Math.floor(t)), Math.max(r, 1));
  return r <= 7 ? Array.from({ length: r }, (s, i) => i + 1) : n <= 4 ? [
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
function cn(e, t) {
  var r = Object.keys(e);
  if (Object.getOwnPropertySymbols) {
    var n = Object.getOwnPropertySymbols(e);
    t && (n = n.filter(function(s) {
      return Object.getOwnPropertyDescriptor(e, s).enumerable;
    })), r.push.apply(r, n);
  }
  return r;
}
function ae(e) {
  for (var t = 1; t < arguments.length; t++) {
    var r = arguments[t] != null ? arguments[t] : {};
    t % 2 ? cn(Object(r), !0).forEach(function(n) {
      za(e, n, r[n]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(r)) : cn(Object(r)).forEach(function(n) {
      Object.defineProperty(e, n, Object.getOwnPropertyDescriptor(r, n));
    });
  }
  return e;
}
function wt(e) {
  "@babel/helpers - typeof";
  return typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? wt = function(t) {
    return typeof t;
  } : wt = function(t) {
    return t && typeof Symbol == "function" && t.constructor === Symbol && t !== Symbol.prototype ? "symbol" : typeof t;
  }, wt(e);
}
function za(e, t, r) {
  return t in e ? Object.defineProperty(e, t, {
    value: r,
    enumerable: !0,
    configurable: !0,
    writable: !0
  }) : e[t] = r, e;
}
function fe() {
  return fe = Object.assign || function(e) {
    for (var t = 1; t < arguments.length; t++) {
      var r = arguments[t];
      for (var n in r) Object.prototype.hasOwnProperty.call(r, n) && (e[n] = r[n]);
    }
    return e;
  }, fe.apply(this, arguments);
}
function Ga(e, t) {
  if (e == null) return {};
  var r = {}, n = Object.keys(e), s, i;
  for (i = 0; i < n.length; i++)
    s = n[i], !(t.indexOf(s) >= 0) && (r[s] = e[s]);
  return r;
}
function Ha(e, t) {
  if (e == null) return {};
  var r = Ga(e, t), n, s;
  if (Object.getOwnPropertySymbols) {
    var i = Object.getOwnPropertySymbols(e);
    for (s = 0; s < i.length; s++)
      n = i[s], !(t.indexOf(n) >= 0) && Object.prototype.propertyIsEnumerable.call(e, n) && (r[n] = e[n]);
  }
  return r;
}
var Ua = "1.15.6";
function ue(e) {
  if (typeof window < "u" && window.navigator) return !!/* @__PURE__ */ navigator.userAgent.match(e);
}
var pe = ue(/(?:Trident.*rv[ :]?11\.|msie|iemobile|Windows Phone)/i), ut = ue(/Edge/i), dn = ue(/firefox/i), Qe = ue(/safari/i) && !ue(/chrome/i) && !ue(/android/i), Vr = ue(/iP(ad|od|hone)/i), gs = ue(/chrome/i) && ue(/android/i), bs = {
  capture: !1,
  passive: !1
};
function $(e, t, r) {
  e.addEventListener(t, r, !pe && bs);
}
function k(e, t, r) {
  e.removeEventListener(t, r, !pe && bs);
}
function Lt(e, t) {
  if (t) {
    if (t[0] === ">" && (t = t.substring(1)), e) try {
      if (e.matches) return e.matches(t);
      if (e.msMatchesSelector) return e.msMatchesSelector(t);
      if (e.webkitMatchesSelector) return e.webkitMatchesSelector(t);
    } catch {
      return !1;
    }
    return !1;
  }
}
function ys(e) {
  return e.host && e !== document && e.host.nodeType ? e.host : e.parentNode;
}
function Z(e, t, r, n) {
  if (e) {
    r = r || document;
    do {
      if (t != null && (t[0] === ">" ? e.parentNode === r && Lt(e, t) : Lt(e, t)) || n && e === r) return e;
      if (e === r) break;
    } while (e = ys(e));
  }
  return null;
}
var un = /\s+/g;
function U(e, t, r) {
  e && t && (e.classList ? e.classList[r ? "add" : "remove"](t) : e.className = ((" " + e.className + " ").replace(un, " ").replace(" " + t + " ", " ") + (r ? " " + t : "")).replace(un, " "));
}
function x(e, t, r) {
  var n = e && e.style;
  if (n) {
    if (r === void 0)
      return document.defaultView && document.defaultView.getComputedStyle ? r = document.defaultView.getComputedStyle(e, "") : e.currentStyle && (r = e.currentStyle), t === void 0 ? r : r[t];
    !(t in n) && t.indexOf("webkit") === -1 && (t = "-webkit-" + t), n[t] = r + (typeof r == "string" ? "" : "px");
  }
}
function je(e, t) {
  var r = "";
  if (typeof e == "string") r = e;
  else do {
    var n = x(e, "transform");
    n && n !== "none" && (r = n + " " + r);
  } while (!t && (e = e.parentNode));
  var s = window.DOMMatrix || window.WebKitCSSMatrix || window.CSSMatrix || window.MSCSSMatrix;
  return s && new s(r);
}
function vs(e, t, r) {
  if (e) {
    var n = e.getElementsByTagName(t), s = 0, i = n.length;
    if (r) for (; s < i; s++) r(n[s], s);
    return n;
  }
  return [];
}
function ie() {
  var e = document.scrollingElement;
  return e || document.documentElement;
}
function I(e, t, r, n, s) {
  if (!(!e.getBoundingClientRect && e !== window)) {
    var i, o, a, l, c, d, u;
    if (e !== window && e.parentNode && e !== ie() ? (i = e.getBoundingClientRect(), o = i.top, a = i.left, l = i.bottom, c = i.right, d = i.height, u = i.width) : (o = 0, a = 0, l = window.innerHeight, c = window.innerWidth, d = window.innerHeight, u = window.innerWidth), (t || r) && e !== window && (s = s || e.parentNode, !pe))
      do
        if (s && s.getBoundingClientRect && (x(s, "transform") !== "none" || r && x(s, "position") !== "static")) {
          var h = s.getBoundingClientRect();
          o -= h.top + parseInt(x(s, "border-top-width")), a -= h.left + parseInt(x(s, "border-left-width")), l = o + i.height, c = a + i.width;
          break;
        }
      while (s = s.parentNode);
    if (n && e !== window) {
      var p = je(s || e), m = p && p.a, g = p && p.d;
      p && (o /= g, a /= m, u /= m, d /= g, l = o + d, c = a + u);
    }
    return {
      top: o,
      left: a,
      bottom: l,
      right: c,
      width: u,
      height: d
    };
  }
}
function fn(e, t, r) {
  for (var n = ve(e, !0), s = I(e)[t]; n; ) {
    var i = I(n)[r], o = void 0;
    if (r === "top" || r === "left" ? o = s >= i : o = s <= i, !o) return n;
    if (n === ie()) break;
    n = ve(n, !1);
  }
  return !1;
}
function Ge(e, t, r, n) {
  for (var s = 0, i = 0, o = e.children; i < o.length; ) {
    if (o[i].style.display !== "none" && o[i] !== S.ghost && (n || o[i] !== S.dragged) && Z(o[i], r.draggable, e, !1)) {
      if (s === t) return o[i];
      s++;
    }
    i++;
  }
  return null;
}
function Kr(e, t) {
  for (var r = e.lastElementChild; r && (r === S.ghost || x(r, "display") === "none" || t && !Lt(r, t)); ) r = r.previousElementSibling;
  return r || null;
}
function Y(e, t) {
  var r = 0;
  if (!e || !e.parentNode) return -1;
  for (; e = e.previousElementSibling; ) e.nodeName.toUpperCase() !== "TEMPLATE" && e !== S.clone && (!t || Lt(e, t)) && r++;
  return r;
}
function hn(e) {
  var t = 0, r = 0, n = ie();
  if (e) do {
    var s = je(e), i = s.a, o = s.d;
    t += e.scrollLeft * i, r += e.scrollTop * o;
  } while (e !== n && (e = e.parentNode));
  return [t, r];
}
function Va(e, t) {
  for (var r in e)
    if (e.hasOwnProperty(r)) {
      for (var n in t) if (t.hasOwnProperty(n) && t[n] === e[r][n]) return Number(r);
    }
  return -1;
}
function ve(e, t) {
  if (!e || !e.getBoundingClientRect) return ie();
  var r = e, n = !1;
  do
    if (r.clientWidth < r.scrollWidth || r.clientHeight < r.scrollHeight) {
      var s = x(r);
      if (r.clientWidth < r.scrollWidth && (s.overflowX == "auto" || s.overflowX == "scroll") || r.clientHeight < r.scrollHeight && (s.overflowY == "auto" || s.overflowY == "scroll")) {
        if (!r.getBoundingClientRect || r === document.body) return ie();
        if (n || t) return r;
        n = !0;
      }
    }
  while (r = r.parentNode);
  return ie();
}
function Ka(e, t) {
  if (e && t)
    for (var r in t) t.hasOwnProperty(r) && (e[r] = t[r]);
  return e;
}
function Yt(e, t) {
  return Math.round(e.top) === Math.round(t.top) && Math.round(e.left) === Math.round(t.left) && Math.round(e.height) === Math.round(t.height) && Math.round(e.width) === Math.round(t.width);
}
var Ze;
function ws(e, t) {
  return function() {
    if (!Ze) {
      var r = arguments, n = this;
      r.length === 1 ? e.call(n, r[0]) : e.apply(n, r), Ze = setTimeout(function() {
        Ze = void 0;
      }, t);
    }
  };
}
function Ja() {
  clearTimeout(Ze), Ze = void 0;
}
function xs(e, t, r) {
  e.scrollLeft += t, e.scrollTop += r;
}
function Ss(e) {
  var t = window.Polymer, r = window.jQuery || window.Zepto;
  return t && t.dom ? t.dom(e).cloneNode(!0) : r ? r(e).clone(!0)[0] : e.cloneNode(!0);
}
function Cs(e, t, r) {
  var n = {};
  return Array.from(e.children).forEach(function(s) {
    var i, o, a, l;
    if (!(!Z(s, t.draggable, e, !1) || s.animated || s === r)) {
      var c = I(s);
      n.left = Math.min((i = n.left) !== null && i !== void 0 ? i : 1 / 0, c.left), n.top = Math.min((o = n.top) !== null && o !== void 0 ? o : 1 / 0, c.top), n.right = Math.max((a = n.right) !== null && a !== void 0 ? a : -1 / 0, c.right), n.bottom = Math.max((l = n.bottom) !== null && l !== void 0 ? l : -1 / 0, c.bottom);
    }
  }), n.width = n.right - n.left, n.height = n.bottom - n.top, n.x = n.left, n.y = n.top, n;
}
var H = "Sortable" + (/* @__PURE__ */ new Date()).getTime();
function Ya() {
  var e = [], t;
  return {
    captureAnimationState: function() {
      e = [], this.options.animation && [].slice.call(this.el.children).forEach(function(n) {
        if (!(x(n, "display") === "none" || n === S.ghost)) {
          e.push({
            target: n,
            rect: I(n)
          });
          var s = ae({}, e[e.length - 1].rect);
          if (n.thisAnimationDuration) {
            var i = je(n, !0);
            i && (s.top -= i.f, s.left -= i.e);
          }
          n.fromRect = s;
        }
      });
    },
    addAnimationState: function(n) {
      e.push(n);
    },
    removeAnimationState: function(n) {
      e.splice(Va(e, { target: n }), 1);
    },
    animateAll: function(n) {
      var s = this;
      if (!this.options.animation) {
        clearTimeout(t), typeof n == "function" && n();
        return;
      }
      var i = !1, o = 0;
      e.forEach(function(a) {
        var l = 0, c = a.target, d = c.fromRect, u = I(c), h = c.prevFromRect, p = c.prevToRect, m = a.rect, g = je(c, !0);
        g && (u.top -= g.f, u.left -= g.e), c.toRect = u, c.thisAnimationDuration && Yt(h, u) && !Yt(d, u) && (m.top - u.top) / (m.left - u.left) === (d.top - u.top) / (d.left - u.left) && (l = Xa(m, h, p, s.options)), Yt(u, d) || (c.prevFromRect = d, c.prevToRect = u, l || (l = s.options.animation), s.animate(c, m, u, l)), l && (i = !0, o = Math.max(o, l), clearTimeout(c.animationResetTimer), c.animationResetTimer = setTimeout(function() {
          c.animationTime = 0, c.prevFromRect = null, c.fromRect = null, c.prevToRect = null, c.thisAnimationDuration = null;
        }, l), c.thisAnimationDuration = l);
      }), clearTimeout(t), i ? t = setTimeout(function() {
        typeof n == "function" && n();
      }, o) : typeof n == "function" && n(), e = [];
    },
    animate: function(n, s, i, o) {
      if (o) {
        x(n, "transition", ""), x(n, "transform", "");
        var a = je(this.el), l = a && a.a, c = a && a.d, d = (s.left - i.left) / (l || 1), u = (s.top - i.top) / (c || 1);
        n.animatingX = !!d, n.animatingY = !!u, x(n, "transform", "translate3d(" + d + "px," + u + "px,0)"), this.forRepaintDummy = Wa(n), x(n, "transition", "transform " + o + "ms" + (this.options.easing ? " " + this.options.easing : "")), x(n, "transform", "translate3d(0,0,0)"), typeof n.animated == "number" && clearTimeout(n.animated), n.animated = setTimeout(function() {
          x(n, "transition", ""), x(n, "transform", ""), n.animated = !1, n.animatingX = !1, n.animatingY = !1;
        }, o);
      }
    }
  };
}
function Wa(e) {
  return e.offsetWidth;
}
function Xa(e, t, r, n) {
  return Math.sqrt(Math.pow(t.top - e.top, 2) + Math.pow(t.left - e.left, 2)) / Math.sqrt(Math.pow(t.top - r.top, 2) + Math.pow(t.left - r.left, 2)) * n.animation;
}
var Pe = [], Wt = { initializeByDefault: !0 }, ft = {
  mount: function(t) {
    for (var r in Wt) Wt.hasOwnProperty(r) && !(r in t) && (t[r] = Wt[r]);
    Pe.forEach(function(n) {
      if (n.pluginName === t.pluginName) throw "Sortable: Cannot mount plugin ".concat(t.pluginName, " more than once");
    }), Pe.push(t);
  },
  pluginEvent: function(t, r, n) {
    var s = this;
    this.eventCanceled = !1, n.cancel = function() {
      s.eventCanceled = !0;
    };
    var i = t + "Global";
    Pe.forEach(function(o) {
      r[o.pluginName] && (r[o.pluginName][i] && r[o.pluginName][i](ae({ sortable: r }, n)), r.options[o.pluginName] && r[o.pluginName][t] && r[o.pluginName][t](ae({ sortable: r }, n)));
    });
  },
  initializePlugins: function(t, r, n, s) {
    Pe.forEach(function(a) {
      var l = a.pluginName;
      if (!(!t.options[l] && !a.initializeByDefault)) {
        var c = new a(t, r, t.options);
        c.sortable = t, c.options = t.options, t[l] = c, fe(n, c.defaults);
      }
    });
    for (var i in t.options)
      if (t.options.hasOwnProperty(i)) {
        var o = this.modifyOption(t, i, t.options[i]);
        typeof o < "u" && (t.options[i] = o);
      }
  },
  getEventProperties: function(t, r) {
    var n = {};
    return Pe.forEach(function(s) {
      typeof s.eventProperties == "function" && fe(n, s.eventProperties.call(r[s.pluginName], t));
    }), n;
  },
  modifyOption: function(t, r, n) {
    var s;
    return Pe.forEach(function(i) {
      t[i.pluginName] && i.optionListeners && typeof i.optionListeners[r] == "function" && (s = i.optionListeners[r].call(t[i.pluginName], n));
    }), s;
  }
};
function Qa(e) {
  var t = e.sortable, r = e.rootEl, n = e.name, s = e.targetEl, i = e.cloneEl, o = e.toEl, a = e.fromEl, l = e.oldIndex, c = e.newIndex, d = e.oldDraggableIndex, u = e.newDraggableIndex, h = e.originalEvent, p = e.putSortable, m = e.extraEventProperties;
  if (t = t || r && r[H], !!t) {
    var g, y = t.options, v = "on" + n.charAt(0).toUpperCase() + n.substr(1);
    window.CustomEvent && !pe && !ut ? g = new CustomEvent(n, {
      bubbles: !0,
      cancelable: !0
    }) : (g = document.createEvent("Event"), g.initEvent(n, !0, !0)), g.to = o || r, g.from = a || r, g.item = s || r, g.clone = i, g.oldIndex = l, g.newIndex = c, g.oldDraggableIndex = d, g.newDraggableIndex = u, g.originalEvent = h, g.pullMode = p ? p.lastPutMode : void 0;
    var A = ae(ae({}, m), ft.getEventProperties(n, t));
    for (var C in A) g[C] = A[C];
    r && r.dispatchEvent(g), y[v] && y[v].call(t, g);
  }
}
var Za = ["evt"], G = function(t, r) {
  var n = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {}, s = n.evt, i = Ha(n, Za);
  ft.pluginEvent.bind(S)(t, r, ae({
    dragEl: b,
    parentEl: R,
    ghostEl: E,
    rootEl: T,
    nextEl: Le,
    lastDownEl: xt,
    cloneEl: D,
    cloneHidden: ye,
    dragStarted: Ve,
    putSortable: F,
    activeSortable: S.active,
    originalEvent: s,
    oldIndex: Ne,
    oldDraggableIndex: et,
    newIndex: V,
    newDraggableIndex: be,
    hideGhostForTarget: $s,
    unhideGhostForTarget: _s,
    cloneNowHidden: function() {
      ye = !0;
    },
    cloneNowShown: function() {
      ye = !1;
    },
    dispatchSortableEvent: function(a) {
      z({
        sortable: r,
        name: a,
        originalEvent: s
      });
    }
  }, i));
};
function z(e) {
  Qa(ae({
    putSortable: F,
    cloneEl: D,
    targetEl: b,
    rootEl: T,
    oldIndex: Ne,
    oldDraggableIndex: et,
    newIndex: V,
    newDraggableIndex: be
  }, e));
}
var b, R, E, T, Le, xt, D, ye, Ne, V, et, be, mt, F, Oe = !1, Tt = !1, Dt = [], Ee, Q, Xt, Qt, pn, mn, Ve, Be, tt, rt = !1, gt = !1, St, N, Zt = [], wr = !1, Rt = [], Nt = typeof document < "u", bt = Vr, gn = ut || pe ? "cssFloat" : "float", el = Nt && !gs && !Vr && "draggable" in document.createElement("div"), Es = (function() {
  if (Nt) {
    if (pe) return !1;
    var e = document.createElement("x");
    return e.style.cssText = "pointer-events:auto", e.style.pointerEvents === "auto";
  }
})(), As = function(t, r) {
  var n = x(t), s = parseInt(n.width) - parseInt(n.paddingLeft) - parseInt(n.paddingRight) - parseInt(n.borderLeftWidth) - parseInt(n.borderRightWidth), i = Ge(t, 0, r), o = Ge(t, 1, r), a = i && x(i), l = o && x(o), c = a && parseInt(a.marginLeft) + parseInt(a.marginRight) + I(i).width, d = l && parseInt(l.marginLeft) + parseInt(l.marginRight) + I(o).width;
  if (n.display === "flex") return n.flexDirection === "column" || n.flexDirection === "column-reverse" ? "vertical" : "horizontal";
  if (n.display === "grid") return n.gridTemplateColumns.split(" ").length <= 1 ? "vertical" : "horizontal";
  if (i && a.float && a.float !== "none") {
    var u = a.float === "left" ? "left" : "right";
    return o && (l.clear === "both" || l.clear === u) ? "vertical" : "horizontal";
  }
  return i && (a.display === "block" || a.display === "flex" || a.display === "table" || a.display === "grid" || c >= s && n[gn] === "none" || o && n[gn] === "none" && c + d > s) ? "vertical" : "horizontal";
}, tl = function(t, r, n) {
  var s = n ? t.left : t.top, i = n ? t.right : t.bottom, o = n ? t.width : t.height, a = n ? r.left : r.top, l = n ? r.right : r.bottom, c = n ? r.width : r.height;
  return s === a || i === l || s + o / 2 === a + c / 2;
}, rl = function(t, r) {
  var n;
  return Dt.some(function(s) {
    var i = s[H].options.emptyInsertThreshold;
    if (!(!i || Kr(s))) {
      var o = I(s), a = t >= o.left - i && t <= o.right + i, l = r >= o.top - i && r <= o.bottom + i;
      if (a && l) return n = s;
    }
  }), n;
}, ks = function(t) {
  function r(i, o) {
    return function(a, l, c, d) {
      var u = a.options.group.name && l.options.group.name && a.options.group.name === l.options.group.name;
      if (i == null && (o || u)) return !0;
      if (i == null || i === !1) return !1;
      if (o && i === "clone") return i;
      if (typeof i == "function") return r(i(a, l, c, d), o)(a, l, c, d);
      var h = (o ? a : l).options.group.name;
      return i === !0 || typeof i == "string" && i === h || i.join && i.indexOf(h) > -1;
    };
  }
  var n = {}, s = t.group;
  (!s || wt(s) != "object") && (s = { name: s }), n.name = s.name, n.checkPull = r(s.pull, !0), n.checkPut = r(s.put), n.revertClone = s.revertClone, t.group = n;
}, $s = function() {
  !Es && E && x(E, "display", "none");
}, _s = function() {
  !Es && E && x(E, "display", "");
};
Nt && !gs && document.addEventListener("click", function(e) {
  if (Tt)
    return e.preventDefault(), e.stopPropagation && e.stopPropagation(), e.stopImmediatePropagation && e.stopImmediatePropagation(), Tt = !1, !1;
}, !0);
var Ae = function(t) {
  if (b) {
    t = t.touches ? t.touches[0] : t;
    var r = rl(t.clientX, t.clientY);
    if (r) {
      var n = {};
      for (var s in t) t.hasOwnProperty(s) && (n[s] = t[s]);
      n.target = n.rootEl = r, n.preventDefault = void 0, n.stopPropagation = void 0, r[H]._onDragOver(n);
    }
  }
}, nl = function(t) {
  b && b.parentNode[H]._isOutsideThisEl(t.target);
};
function S(e, t) {
  if (!(e && e.nodeType && e.nodeType === 1)) throw "Sortable: `el` must be an HTMLElement, not ".concat({}.toString.call(e));
  this.el = e, this.options = t = fe({}, t), e[H] = this;
  var r = {
    group: null,
    sort: !0,
    disabled: !1,
    store: null,
    handle: null,
    draggable: /^[uo]l$/i.test(e.nodeName) ? ">li" : ">*",
    swapThreshold: 1,
    invertSwap: !1,
    invertedSwapThreshold: null,
    removeCloneOnHide: !0,
    direction: function() {
      return As(e, this.options);
    },
    ghostClass: "sortable-ghost",
    chosenClass: "sortable-chosen",
    dragClass: "sortable-drag",
    ignore: "a, img",
    filter: null,
    preventOnFilter: !0,
    animation: 0,
    easing: null,
    setData: function(o, a) {
      o.setData("Text", a.textContent);
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
    supportPointer: S.supportPointer !== !1 && "PointerEvent" in window && (!Qe || Vr),
    emptyInsertThreshold: 5
  };
  ft.initializePlugins(this, e, r);
  for (var n in r) !(n in t) && (t[n] = r[n]);
  ks(t);
  for (var s in this) s.charAt(0) === "_" && typeof this[s] == "function" && (this[s] = this[s].bind(this));
  this.nativeDraggable = t.forceFallback ? !1 : el, this.nativeDraggable && (this.options.touchStartThreshold = 1), t.supportPointer ? $(e, "pointerdown", this._onTapStart) : ($(e, "mousedown", this._onTapStart), $(e, "touchstart", this._onTapStart)), this.nativeDraggable && ($(e, "dragover", this), $(e, "dragenter", this)), Dt.push(this.el), t.store && t.store.get && this.sort(t.store.get(this) || []), fe(this, Ya());
}
S.prototype = {
  constructor: S,
  _isOutsideThisEl: function(t) {
    !this.el.contains(t) && t !== this.el && (Be = null);
  },
  _getDirection: function(t, r) {
    return typeof this.options.direction == "function" ? this.options.direction.call(this, t, r, b) : this.options.direction;
  },
  _onTapStart: function(t) {
    if (t.cancelable) {
      var r = this, n = this.el, s = this.options, i = s.preventOnFilter, o = t.type, a = t.touches && t.touches[0] || t.pointerType && t.pointerType === "touch" && t, l = (a || t).target, c = t.target.shadowRoot && (t.path && t.path[0] || t.composedPath && t.composedPath()[0]) || l, d = s.filter;
      if (ul(n), !b && !(/mousedown|pointerdown/.test(o) && t.button !== 0 || s.disabled) && !c.isContentEditable && !(!this.nativeDraggable && Qe && l && l.tagName.toUpperCase() === "SELECT") && (l = Z(l, s.draggable, n, !1), !(l && l.animated) && xt !== l)) {
        if (Ne = Y(l), et = Y(l, s.draggable), typeof d == "function") {
          if (d.call(this, t, l, this)) {
            z({
              sortable: r,
              rootEl: c,
              name: "filter",
              targetEl: l,
              toEl: n,
              fromEl: n
            }), G("filter", r, { evt: t }), i && t.preventDefault();
            return;
          }
        } else if (d && (d = d.split(",").some(function(u) {
          if (u = Z(c, u.trim(), n, !1), u)
            return z({
              sortable: r,
              rootEl: u,
              name: "filter",
              targetEl: l,
              fromEl: n,
              toEl: n
            }), G("filter", r, { evt: t }), !0;
        }), d)) {
          i && t.preventDefault();
          return;
        }
        s.handle && !Z(c, s.handle, n, !1) || this._prepareDragStart(t, a, l);
      }
    }
  },
  _prepareDragStart: function(t, r, n) {
    var s = this, i = s.el, o = s.options, a = i.ownerDocument, l;
    if (n && !b && n.parentNode === i) {
      var c = I(n);
      if (T = i, b = n, R = b.parentNode, Le = b.nextSibling, xt = n, mt = o.group, S.dragged = b, Ee = {
        target: b,
        clientX: (r || t).clientX,
        clientY: (r || t).clientY
      }, pn = Ee.clientX - c.left, mn = Ee.clientY - c.top, this._lastX = (r || t).clientX, this._lastY = (r || t).clientY, b.style["will-change"] = "all", l = function() {
        if (G("delayEnded", s, { evt: t }), S.eventCanceled) {
          s._onDrop();
          return;
        }
        s._disableDelayedDragEvents(), !dn && s.nativeDraggable && (b.draggable = !0), s._triggerDragStart(t, r), z({
          sortable: s,
          name: "choose",
          originalEvent: t
        }), U(b, o.chosenClass, !0);
      }, o.ignore.split(",").forEach(function(d) {
        vs(b, d.trim(), er);
      }), $(a, "dragover", Ae), $(a, "mousemove", Ae), $(a, "touchmove", Ae), o.supportPointer ? ($(a, "pointerup", s._onDrop), !this.nativeDraggable && $(a, "pointercancel", s._onDrop)) : ($(a, "mouseup", s._onDrop), $(a, "touchend", s._onDrop), $(a, "touchcancel", s._onDrop)), dn && this.nativeDraggable && (this.options.touchStartThreshold = 4, b.draggable = !0), G("delayStart", this, { evt: t }), o.delay && (!o.delayOnTouchOnly || r) && (!this.nativeDraggable || !(ut || pe))) {
        if (S.eventCanceled) {
          this._onDrop();
          return;
        }
        o.supportPointer ? ($(a, "pointerup", s._disableDelayedDrag), $(a, "pointercancel", s._disableDelayedDrag)) : ($(a, "mouseup", s._disableDelayedDrag), $(a, "touchend", s._disableDelayedDrag), $(a, "touchcancel", s._disableDelayedDrag)), $(a, "mousemove", s._delayedDragTouchMoveHandler), $(a, "touchmove", s._delayedDragTouchMoveHandler), o.supportPointer && $(a, "pointermove", s._delayedDragTouchMoveHandler), s._dragStartTimer = setTimeout(l, o.delay);
      } else l();
    }
  },
  _delayedDragTouchMoveHandler: function(t) {
    var r = t.touches ? t.touches[0] : t;
    Math.max(Math.abs(r.clientX - this._lastX), Math.abs(r.clientY - this._lastY)) >= Math.floor(this.options.touchStartThreshold / (this.nativeDraggable && window.devicePixelRatio || 1)) && this._disableDelayedDrag();
  },
  _disableDelayedDrag: function() {
    b && er(b), clearTimeout(this._dragStartTimer), this._disableDelayedDragEvents();
  },
  _disableDelayedDragEvents: function() {
    var t = this.el.ownerDocument;
    k(t, "mouseup", this._disableDelayedDrag), k(t, "touchend", this._disableDelayedDrag), k(t, "touchcancel", this._disableDelayedDrag), k(t, "pointerup", this._disableDelayedDrag), k(t, "pointercancel", this._disableDelayedDrag), k(t, "mousemove", this._delayedDragTouchMoveHandler), k(t, "touchmove", this._delayedDragTouchMoveHandler), k(t, "pointermove", this._delayedDragTouchMoveHandler);
  },
  _triggerDragStart: function(t, r) {
    r = r || t.pointerType == "touch" && t, !this.nativeDraggable || r ? this.options.supportPointer ? $(document, "pointermove", this._onTouchMove) : r ? $(document, "touchmove", this._onTouchMove) : $(document, "mousemove", this._onTouchMove) : ($(b, "dragend", this), $(T, "dragstart", this._onDragStart));
    try {
      document.selection ? Ct(function() {
        document.selection.empty();
      }) : window.getSelection().removeAllRanges();
    } catch {
    }
  },
  _dragStarted: function(t, r) {
    if (Oe = !1, T && b) {
      G("dragStarted", this, { evt: r }), this.nativeDraggable && $(document, "dragover", nl);
      var n = this.options;
      !t && U(b, n.dragClass, !1), U(b, n.ghostClass, !0), S.active = this, t && this._appendGhost(), z({
        sortable: this,
        name: "start",
        originalEvent: r
      });
    } else this._nulling();
  },
  _emulateDragOver: function() {
    if (Q) {
      this._lastX = Q.clientX, this._lastY = Q.clientY, $s();
      for (var t = document.elementFromPoint(Q.clientX, Q.clientY), r = t; t && t.shadowRoot && (t = t.shadowRoot.elementFromPoint(Q.clientX, Q.clientY), t !== r); )
        r = t;
      if (b.parentNode[H]._isOutsideThisEl(t), r) do {
        if (r[H]) {
          var n = void 0;
          if (n = r[H]._onDragOver({
            clientX: Q.clientX,
            clientY: Q.clientY,
            target: t,
            rootEl: r
          }), n && !this.options.dragoverBubble) break;
        }
        t = r;
      } while (r = ys(r));
      _s();
    }
  },
  _onTouchMove: function(t) {
    if (Ee) {
      var r = this.options, n = r.fallbackTolerance, s = r.fallbackOffset, i = t.touches ? t.touches[0] : t, o = E && je(E, !0), a = E && o && o.a, l = E && o && o.d, c = bt && N && hn(N), d = (i.clientX - Ee.clientX + s.x) / (a || 1) + (c ? c[0] - Zt[0] : 0) / (a || 1), u = (i.clientY - Ee.clientY + s.y) / (l || 1) + (c ? c[1] - Zt[1] : 0) / (l || 1);
      if (!S.active && !Oe) {
        if (n && Math.max(Math.abs(i.clientX - this._lastX), Math.abs(i.clientY - this._lastY)) < n) return;
        this._onDragStart(t, !0);
      }
      if (E) {
        o ? (o.e += d - (Xt || 0), o.f += u - (Qt || 0)) : o = {
          a: 1,
          b: 0,
          c: 0,
          d: 1,
          e: d,
          f: u
        };
        var h = "matrix(".concat(o.a, ",").concat(o.b, ",").concat(o.c, ",").concat(o.d, ",").concat(o.e, ",").concat(o.f, ")");
        x(E, "webkitTransform", h), x(E, "mozTransform", h), x(E, "msTransform", h), x(E, "transform", h), Xt = d, Qt = u, Q = i;
      }
      t.cancelable && t.preventDefault();
    }
  },
  _appendGhost: function() {
    if (!E) {
      var t = this.options.fallbackOnBody ? document.body : T, r = I(b, !0, bt, !0, t), n = this.options;
      if (bt) {
        for (N = t; x(N, "position") === "static" && x(N, "transform") === "none" && N !== document; ) N = N.parentNode;
        N !== document.body && N !== document.documentElement ? (N === document && (N = ie()), r.top += N.scrollTop, r.left += N.scrollLeft) : N = ie(), Zt = hn(N);
      }
      E = b.cloneNode(!0), U(E, n.ghostClass, !1), U(E, n.fallbackClass, !0), U(E, n.dragClass, !0), x(E, "transition", ""), x(E, "transform", ""), x(E, "box-sizing", "border-box"), x(E, "margin", 0), x(E, "top", r.top), x(E, "left", r.left), x(E, "width", r.width), x(E, "height", r.height), x(E, "opacity", "0.8"), x(E, "position", bt ? "absolute" : "fixed"), x(E, "zIndex", "100000"), x(E, "pointerEvents", "none"), S.ghost = E, t.appendChild(E), x(E, "transform-origin", pn / parseInt(E.style.width) * 100 + "% " + mn / parseInt(E.style.height) * 100 + "%");
    }
  },
  _onDragStart: function(t, r) {
    var n = this, s = t.dataTransfer, i = n.options;
    if (G("dragStart", this, { evt: t }), S.eventCanceled) {
      this._onDrop();
      return;
    }
    G("setupClone", this), S.eventCanceled || (D = Ss(b), D.removeAttribute("id"), D.draggable = !1, D.style["will-change"] = "", this._hideClone(), U(D, this.options.chosenClass, !1), S.clone = D), n.cloneId = Ct(function() {
      G("clone", n), !S.eventCanceled && (n.options.removeCloneOnHide || T.insertBefore(D, b), n._hideClone(), z({
        sortable: n,
        name: "clone"
      }));
    }), !r && U(b, i.dragClass, !0), r ? (Tt = !0, n._loopId = setInterval(n._emulateDragOver, 50)) : (k(document, "mouseup", n._onDrop), k(document, "touchend", n._onDrop), k(document, "touchcancel", n._onDrop), s && (s.effectAllowed = "move", i.setData && i.setData.call(n, s, b)), $(document, "drop", n), x(b, "transform", "translateZ(0)")), Oe = !0, n._dragStartId = Ct(n._dragStarted.bind(n, r, t)), $(document, "selectstart", n), Ve = !0, window.getSelection().removeAllRanges(), Qe && x(document.body, "user-select", "none");
  },
  _onDragOver: function(t) {
    var r = this.el, n = t.target, s, i, o, a = this.options, l = a.group, c = S.active, d = mt === l, u = a.sort, h = F || c, p, m = this, g = !1;
    if (wr) return;
    function y(Ce, Ht) {
      G(Ce, m, ae({
        evt: t,
        isOwner: d,
        axis: p ? "vertical" : "horizontal",
        revert: o,
        dragRect: s,
        targetRect: i,
        canSort: u,
        fromSortable: h,
        target: n,
        completed: A,
        onMove: function(ht, pt) {
          return yt(T, r, b, s, ht, I(ht), t, pt);
        },
        changed: C
      }, Ht));
    }
    function v() {
      y("dragOverAnimationCapture"), m.captureAnimationState(), m !== h && h.captureAnimationState();
    }
    function A(Ce) {
      return y("dragOverCompleted", { insertion: Ce }), Ce && (d ? c._hideClone() : c._showClone(m), m !== h && (U(b, F ? F.options.ghostClass : c.options.ghostClass, !1), U(b, a.ghostClass, !0)), F !== m && m !== S.active ? F = m : m === S.active && F && (F = null), h === m && (m._ignoreWhileAnimating = n), m.animateAll(function() {
        y("dragOverAnimationComplete"), m._ignoreWhileAnimating = null;
      }), m !== h && (h.animateAll(), h._ignoreWhileAnimating = null)), (n === b && !b.animated || n === r && !n.animated) && (Be = null), !a.dragoverBubble && !t.rootEl && n !== document && (b.parentNode[H]._isOutsideThisEl(t.target), !Ce && Ae(t)), !a.dragoverBubble && t.stopPropagation && t.stopPropagation(), g = !0;
    }
    function C() {
      V = Y(b), be = Y(b, a.draggable), z({
        sortable: m,
        name: "change",
        toEl: r,
        newIndex: V,
        newDraggableIndex: be,
        originalEvent: t
      });
    }
    if (t.preventDefault !== void 0 && t.cancelable && t.preventDefault(), n = Z(n, a.draggable, r, !0), y("dragOver"), S.eventCanceled) return g;
    if (b.contains(t.target) || n.animated && n.animatingX && n.animatingY || m._ignoreWhileAnimating === n) return A(!1);
    if (Tt = !1, c && !a.disabled && (d ? u || (o = R !== T) : F === this || (this.lastPutMode = mt.checkPull(this, c, b, t)) && l.checkPut(this, c, b, t))) {
      if (p = this._getDirection(t, n) === "vertical", s = I(b), y("dragOverValid"), S.eventCanceled) return g;
      if (o)
        return R = T, v(), this._hideClone(), y("revert"), S.eventCanceled || (Le ? T.insertBefore(b, Le) : T.appendChild(b)), A(!0);
      var L = Kr(r, a.draggable);
      if (!L || al(t, p, this) && !L.animated) {
        if (L === b) return A(!1);
        if (L && r === t.target && (n = L), n && (i = I(n)), yt(T, r, b, s, n, i, t, !!n) !== !1)
          return v(), L && L.nextSibling ? r.insertBefore(b, L.nextSibling) : r.appendChild(b), R = r, C(), A(!0);
      } else if (L && ol(t, p, this)) {
        var B = Ge(r, 0, a, !0);
        if (B === b) return A(!1);
        if (n = B, i = I(n), yt(T, r, b, s, n, i, t, !1) !== !1)
          return v(), r.insertBefore(b, B), R = r, C(), A(!0);
      } else if (n.parentNode === r) {
        i = I(n);
        var O = 0, P, me = b.parentNode !== r, q = !tl(b.animated && b.toRect || s, n.animated && n.toRect || i, p), ge = p ? "top" : "left", X = fn(n, "top", "top") || fn(b, "top", "top"), we = X ? X.scrollTop : void 0;
        Be !== n && (P = i[ge], rt = !1, gt = !q && a.invertSwap || me), O = ll(t, n, i, p, q ? 1 : a.swapThreshold, a.invertedSwapThreshold == null ? a.swapThreshold : a.invertedSwapThreshold, gt, Be === n);
        var J;
        if (O !== 0) {
          var le = Y(b);
          do
            le -= O, J = R.children[le];
          while (J && (x(J, "display") === "none" || J === E));
        }
        if (O === 0 || J === n) return A(!1);
        Be = n, tt = O;
        var xe = n.nextElementSibling, re = !1;
        re = O === 1;
        var Se = yt(T, r, b, s, n, i, t, re);
        if (Se !== !1)
          return (Se === 1 || Se === -1) && (re = Se === 1), wr = !0, setTimeout(il, 30), v(), re && !xe ? r.appendChild(b) : n.parentNode.insertBefore(b, re ? xe : n), X && xs(X, 0, we - X.scrollTop), R = b.parentNode, P !== void 0 && !gt && (St = Math.abs(P - I(n)[ge])), C(), A(!0);
      }
      if (r.contains(b)) return A(!1);
    }
    return !1;
  },
  _ignoreWhileAnimating: null,
  _offMoveEvents: function() {
    k(document, "mousemove", this._onTouchMove), k(document, "touchmove", this._onTouchMove), k(document, "pointermove", this._onTouchMove), k(document, "dragover", Ae), k(document, "mousemove", Ae), k(document, "touchmove", Ae);
  },
  _offUpEvents: function() {
    var t = this.el.ownerDocument;
    k(t, "mouseup", this._onDrop), k(t, "touchend", this._onDrop), k(t, "pointerup", this._onDrop), k(t, "pointercancel", this._onDrop), k(t, "touchcancel", this._onDrop), k(document, "selectstart", this);
  },
  _onDrop: function(t) {
    var r = this.el, n = this.options;
    if (V = Y(b), be = Y(b, n.draggable), G("drop", this, { evt: t }), R = b && b.parentNode, V = Y(b), be = Y(b, n.draggable), S.eventCanceled) {
      this._nulling();
      return;
    }
    Oe = !1, gt = !1, rt = !1, clearInterval(this._loopId), clearTimeout(this._dragStartTimer), xr(this.cloneId), xr(this._dragStartId), this.nativeDraggable && (k(document, "drop", this), k(r, "dragstart", this._onDragStart)), this._offMoveEvents(), this._offUpEvents(), Qe && x(document.body, "user-select", ""), x(b, "transform", ""), t && (Ve && (t.cancelable && t.preventDefault(), !n.dropBubble && t.stopPropagation()), E && E.parentNode && E.parentNode.removeChild(E), (T === R || F && F.lastPutMode !== "clone") && D && D.parentNode && D.parentNode.removeChild(D), b && (this.nativeDraggable && k(b, "dragend", this), er(b), b.style["will-change"] = "", Ve && !Oe && U(b, F ? F.options.ghostClass : this.options.ghostClass, !1), U(b, this.options.chosenClass, !1), z({
      sortable: this,
      name: "unchoose",
      toEl: R,
      newIndex: null,
      newDraggableIndex: null,
      originalEvent: t
    }), T !== R ? (V >= 0 && (z({
      rootEl: R,
      name: "add",
      toEl: R,
      fromEl: T,
      originalEvent: t
    }), z({
      sortable: this,
      name: "remove",
      toEl: R,
      originalEvent: t
    }), z({
      rootEl: R,
      name: "sort",
      toEl: R,
      fromEl: T,
      originalEvent: t
    }), z({
      sortable: this,
      name: "sort",
      toEl: R,
      originalEvent: t
    })), F && F.save()) : V !== Ne && V >= 0 && (z({
      sortable: this,
      name: "update",
      toEl: R,
      originalEvent: t
    }), z({
      sortable: this,
      name: "sort",
      toEl: R,
      originalEvent: t
    })), S.active && ((V == null || V === -1) && (V = Ne, be = et), z({
      sortable: this,
      name: "end",
      toEl: R,
      originalEvent: t
    }), this.save()))), this._nulling();
  },
  _nulling: function() {
    G("nulling", this), T = b = R = E = Le = D = xt = ye = Ee = Q = Ve = V = be = Ne = et = Be = tt = F = mt = S.dragged = S.ghost = S.clone = S.active = null, Rt.forEach(function(t) {
      t.checked = !0;
    }), Rt.length = Xt = Qt = 0;
  },
  handleEvent: function(t) {
    switch (t.type) {
      case "drop":
      case "dragend":
        this._onDrop(t);
        break;
      case "dragenter":
      case "dragover":
        b && (this._onDragOver(t), sl(t));
        break;
      case "selectstart":
        t.preventDefault();
    }
  },
  toArray: function() {
    for (var t = [], r, n = this.el.children, s = 0, i = n.length, o = this.options; s < i; s++)
      r = n[s], Z(r, o.draggable, this.el, !1) && t.push(r.getAttribute(o.dataIdAttr) || dl(r));
    return t;
  },
  sort: function(t, r) {
    var n = {}, s = this.el;
    this.toArray().forEach(function(i, o) {
      var a = s.children[o];
      Z(a, this.options.draggable, s, !1) && (n[i] = a);
    }, this), r && this.captureAnimationState(), t.forEach(function(i) {
      n[i] && (s.removeChild(n[i]), s.appendChild(n[i]));
    }), r && this.animateAll();
  },
  save: function() {
    var t = this.options.store;
    t && t.set && t.set(this);
  },
  closest: function(t, r) {
    return Z(t, r || this.options.draggable, this.el, !1);
  },
  option: function(t, r) {
    var n = this.options;
    if (r === void 0) return n[t];
    var s = ft.modifyOption(this, t, r);
    typeof s < "u" ? n[t] = s : n[t] = r, t === "group" && ks(n);
  },
  destroy: function() {
    G("destroy", this);
    var t = this.el;
    t[H] = null, k(t, "mousedown", this._onTapStart), k(t, "touchstart", this._onTapStart), k(t, "pointerdown", this._onTapStart), this.nativeDraggable && (k(t, "dragover", this), k(t, "dragenter", this)), Array.prototype.forEach.call(t.querySelectorAll("[draggable]"), function(r) {
      r.removeAttribute("draggable");
    }), this._onDrop(), this._disableDelayedDragEvents(), Dt.splice(Dt.indexOf(this.el), 1), this.el = t = null;
  },
  _hideClone: function() {
    if (!ye) {
      if (G("hideClone", this), S.eventCanceled) return;
      x(D, "display", "none"), this.options.removeCloneOnHide && D.parentNode && D.parentNode.removeChild(D), ye = !0;
    }
  },
  _showClone: function(t) {
    if (t.lastPutMode !== "clone") {
      this._hideClone();
      return;
    }
    if (ye) {
      if (G("showClone", this), S.eventCanceled) return;
      b.parentNode == T && !this.options.group.revertClone ? T.insertBefore(D, b) : Le ? T.insertBefore(D, Le) : T.appendChild(D), this.options.group.revertClone && this.animate(b, D), x(D, "display", ""), ye = !1;
    }
  }
};
function sl(e) {
  e.dataTransfer && (e.dataTransfer.dropEffect = "move"), e.cancelable && e.preventDefault();
}
function yt(e, t, r, n, s, i, o, a) {
  var l, c = e[H], d = c.options.onMove, u;
  return window.CustomEvent && !pe && !ut ? l = new CustomEvent("move", {
    bubbles: !0,
    cancelable: !0
  }) : (l = document.createEvent("Event"), l.initEvent("move", !0, !0)), l.to = t, l.from = e, l.dragged = r, l.draggedRect = n, l.related = s || t, l.relatedRect = i || I(t), l.willInsertAfter = a, l.originalEvent = o, e.dispatchEvent(l), d && (u = d.call(c, l, o)), u;
}
function er(e) {
  e.draggable = !1;
}
function il() {
  wr = !1;
}
function ol(e, t, r) {
  var n = I(Ge(r.el, 0, r.options, !0)), s = Cs(r.el, r.options, E), i = 10;
  return t ? e.clientX < s.left - i || e.clientY < n.top && e.clientX < n.right : e.clientY < s.top - i || e.clientY < n.bottom && e.clientX < n.left;
}
function al(e, t, r) {
  var n = I(Kr(r.el, r.options.draggable)), s = Cs(r.el, r.options, E), i = 10;
  return t ? e.clientX > s.right + i || e.clientY > n.bottom && e.clientX > n.left : e.clientY > s.bottom + i || e.clientX > n.right && e.clientY > n.top;
}
function ll(e, t, r, n, s, i, o, a) {
  var l = n ? e.clientY : e.clientX, c = n ? r.height : r.width, d = n ? r.top : r.left, u = n ? r.bottom : r.right, h = !1;
  if (!o) {
    if (a && St < c * s) {
      if (!rt && (tt === 1 ? l > d + c * i / 2 : l < u - c * i / 2) && (rt = !0), rt)
        h = !0;
      else if (tt === 1 ? l < d + St : l > u - St) return -tt;
    } else if (l > d + c * (1 - s) / 2 && l < u - c * (1 - s) / 2) return cl(t);
  }
  return h = h || o, h && (l < d + c * i / 2 || l > u - c * i / 2) ? l > d + c / 2 ? 1 : -1 : 0;
}
function cl(e) {
  return Y(b) < Y(e) ? 1 : -1;
}
function dl(e) {
  for (var t = e.tagName + e.className + e.src + e.href + e.textContent, r = t.length, n = 0; r--; ) n += t.charCodeAt(r);
  return n.toString(36);
}
function ul(e) {
  Rt.length = 0;
  for (var t = e.getElementsByTagName("input"), r = t.length; r--; ) {
    var n = t[r];
    n.checked && Rt.push(n);
  }
}
function Ct(e) {
  return setTimeout(e, 0);
}
function xr(e) {
  return clearTimeout(e);
}
Nt && $(document, "touchmove", function(e) {
  (S.active || Oe) && e.cancelable && e.preventDefault();
});
S.utils = {
  on: $,
  off: k,
  css: x,
  find: vs,
  is: function(t, r) {
    return !!Z(t, r, t, !1);
  },
  extend: Ka,
  throttle: ws,
  closest: Z,
  toggleClass: U,
  clone: Ss,
  index: Y,
  nextTick: Ct,
  cancelNextTick: xr,
  detectDirection: As,
  getChild: Ge,
  expando: H
};
S.get = function(e) {
  return e[H];
};
S.mount = function() {
  for (var e = arguments.length, t = new Array(e), r = 0; r < e; r++) t[r] = arguments[r];
  t[0].constructor === Array && (t = t[0]), t.forEach(function(n) {
    if (!n.prototype || !n.prototype.constructor) throw "Sortable: Mounted plugin must be a constructor function, not ".concat({}.toString.call(n));
    n.utils && (S.utils = ae(ae({}, S.utils), n.utils)), ft.mount(n);
  });
};
S.create = function(e, t) {
  return new S(e, t);
};
S.version = Ua;
var M = [], Ke, Sr, Cr = !1, tr, rr, Mt, Je;
function fl() {
  function e() {
    this.defaults = {
      scroll: !0,
      forceAutoScrollFallback: !1,
      scrollSensitivity: 30,
      scrollSpeed: 10,
      bubbleScroll: !0
    };
    for (var t in this) t.charAt(0) === "_" && typeof this[t] == "function" && (this[t] = this[t].bind(this));
  }
  return e.prototype = {
    dragStarted: function(r) {
      var n = r.originalEvent;
      this.sortable.nativeDraggable ? $(document, "dragover", this._handleAutoScroll) : this.options.supportPointer ? $(document, "pointermove", this._handleFallbackAutoScroll) : n.touches ? $(document, "touchmove", this._handleFallbackAutoScroll) : $(document, "mousemove", this._handleFallbackAutoScroll);
    },
    dragOverCompleted: function(r) {
      var n = r.originalEvent;
      !this.options.dragOverBubble && !n.rootEl && this._handleAutoScroll(n);
    },
    drop: function() {
      this.sortable.nativeDraggable ? k(document, "dragover", this._handleAutoScroll) : (k(document, "pointermove", this._handleFallbackAutoScroll), k(document, "touchmove", this._handleFallbackAutoScroll), k(document, "mousemove", this._handleFallbackAutoScroll)), bn(), Et(), Ja();
    },
    nulling: function() {
      Mt = Sr = Ke = Cr = Je = tr = rr = null, M.length = 0;
    },
    _handleFallbackAutoScroll: function(r) {
      this._handleAutoScroll(r, !0);
    },
    _handleAutoScroll: function(r, n) {
      var s = this, i = (r.touches ? r.touches[0] : r).clientX, o = (r.touches ? r.touches[0] : r).clientY, a = document.elementFromPoint(i, o);
      if (Mt = r, n || this.options.forceAutoScrollFallback || ut || pe || Qe) {
        nr(r, this.options, a, n);
        var l = ve(a, !0);
        Cr && (!Je || i !== tr || o !== rr) && (Je && bn(), Je = setInterval(function() {
          var c = ve(document.elementFromPoint(i, o), !0);
          c !== l && (l = c, Et()), nr(r, s.options, c, n);
        }, 10), tr = i, rr = o);
      } else {
        if (!this.options.bubbleScroll || ve(a, !0) === ie()) {
          Et();
          return;
        }
        nr(r, this.options, ve(a, !1), !1);
      }
    }
  }, fe(e, {
    pluginName: "scroll",
    initializeByDefault: !0
  });
}
function Et() {
  M.forEach(function(e) {
    clearInterval(e.pid);
  }), M = [];
}
function bn() {
  clearInterval(Je);
}
var nr = ws(function(e, t, r, n) {
  if (t.scroll) {
    var s = (e.touches ? e.touches[0] : e).clientX, i = (e.touches ? e.touches[0] : e).clientY, o = t.scrollSensitivity, a = t.scrollSpeed, l = ie(), c = !1, d;
    Sr !== r && (Sr = r, Et(), Ke = t.scroll, d = t.scrollFn, Ke === !0 && (Ke = ve(r, !0)));
    var u = 0, h = Ke;
    do {
      var p = h, m = I(p), g = m.top, y = m.bottom, v = m.left, A = m.right, C = m.width, L = m.height, B = void 0, O = void 0, P = p.scrollWidth, me = p.scrollHeight, q = x(p), ge = p.scrollLeft, X = p.scrollTop;
      p === l ? (B = C < P && (q.overflowX === "auto" || q.overflowX === "scroll" || q.overflowX === "visible"), O = L < me && (q.overflowY === "auto" || q.overflowY === "scroll" || q.overflowY === "visible")) : (B = C < P && (q.overflowX === "auto" || q.overflowX === "scroll"), O = L < me && (q.overflowY === "auto" || q.overflowY === "scroll"));
      var we = B && (Math.abs(A - s) <= o && ge + C < P) - (Math.abs(v - s) <= o && !!ge), J = O && (Math.abs(y - i) <= o && X + L < me) - (Math.abs(g - i) <= o && !!X);
      if (!M[u])
        for (var le = 0; le <= u; le++) M[le] || (M[le] = {});
      (M[u].vx != we || M[u].vy != J || M[u].el !== p) && (M[u].el = p, M[u].vx = we, M[u].vy = J, clearInterval(M[u].pid), (we != 0 || J != 0) && (c = !0, M[u].pid = setInterval(function() {
        n && this.layer === 0 && S.active._onTouchMove(Mt);
        var xe = M[this.layer].vy ? M[this.layer].vy * a : 0, re = M[this.layer].vx ? M[this.layer].vx * a : 0;
        typeof d == "function" && d.call(S.dragged.parentNode[H], re, xe, e, Mt, M[this.layer].el) !== "continue" || xs(M[this.layer].el, re, xe);
      }.bind({ layer: u }), 24))), u++;
    } while (t.bubbleScroll && h !== l && (h = ve(h, !1)));
    Cr = c;
  }
}, 30), Ls = function(t) {
  var r = t.originalEvent, n = t.putSortable, s = t.dragEl, i = t.activeSortable, o = t.dispatchSortableEvent, a = t.hideGhostForTarget, l = t.unhideGhostForTarget;
  if (r) {
    var c = n || i;
    a();
    var d = r.changedTouches && r.changedTouches.length ? r.changedTouches[0] : r, u = document.elementFromPoint(d.clientX, d.clientY);
    l(), c && !c.el.contains(u) && (o("spill"), this.onSpill({
      dragEl: s,
      putSortable: n
    }));
  }
};
function Jr() {
}
Jr.prototype = {
  startIndex: null,
  dragStart: function(t) {
    var r = t.oldDraggableIndex;
    this.startIndex = r;
  },
  onSpill: function(t) {
    var r = t.dragEl, n = t.putSortable;
    this.sortable.captureAnimationState(), n && n.captureAnimationState();
    var s = Ge(this.sortable.el, this.startIndex, this.options);
    s ? this.sortable.el.insertBefore(r, s) : this.sortable.el.appendChild(r), this.sortable.animateAll(), n && n.animateAll();
  },
  drop: Ls
};
fe(Jr, { pluginName: "revertOnSpill" });
function Yr() {
}
Yr.prototype = {
  onSpill: function(t) {
    var r = t.dragEl, n = t.putSortable || this.sortable;
    n.captureAnimationState(), r.parentNode && r.parentNode.removeChild(r), n.animateAll();
  },
  drop: Ls
};
fe(Yr, { pluginName: "removeOnSpill" });
S.mount(new fl());
S.mount(Yr, Jr);
var hl = class {
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
    n.className = "column-list", n.setAttribute("role", "list"), n.setAttribute("aria-label", "Column visibility and order"), this.columnListEl = n, e.forEach((i) => {
      const o = this.createColumnItem(i.field, i.label || i.field, !t.has(i.field));
      n.appendChild(o);
    }), this.container.appendChild(n);
    const s = this.createFooter();
    this.container.appendChild(s);
  }
  createHeader(e, t) {
    const r = document.createElement("div");
    r.className = "column-manager-header";
    const n = document.createElement("div");
    n.className = "column-search-container";
    const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    s.setAttribute("class", "column-search-icon"), s.setAttribute("viewBox", "0 0 24 24"), s.setAttribute("fill", "none"), s.setAttribute("stroke", "currentColor"), s.setAttribute("stroke-width", "2");
    const i = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    i.setAttribute("cx", "11"), i.setAttribute("cy", "11"), i.setAttribute("r", "8");
    const o = document.createElementNS("http://www.w3.org/2000/svg", "path");
    o.setAttribute("d", "m21 21-4.3-4.3"), s.appendChild(i), s.appendChild(o);
    const a = document.createElement("input");
    a.type = "text", a.className = "column-search-input", a.placeholder = "Filter columns...", a.setAttribute("aria-label", "Filter columns"), this.searchInput = a, a.addEventListener("input", () => {
      this.filterColumns(a.value);
    }), n.appendChild(s), n.appendChild(a);
    const l = document.createElement("span");
    return l.className = "column-count-badge", l.textContent = `${t} of ${e}`, l.setAttribute("aria-live", "polite"), this.countBadgeEl = l, r.appendChild(n), r.appendChild(l), r;
  }
  filterColumns(e) {
    const t = e.toLowerCase().trim();
    this.container.querySelectorAll(".column-item").forEach((r) => {
      const n = r.querySelector(".column-label")?.textContent?.toLowerCase() || "", s = t === "" || n.includes(t);
      r.style.display = s ? "" : "none";
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
    const e = this.columnListEl, t = e.scrollTop, r = e.scrollHeight, n = e.clientHeight, s = r > n, i = s && t > 0, o = s && t + n < r - 1;
    e.classList.toggle("column-list--shadow-top", i), e.classList.toggle("column-list--shadow-bottom", o);
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
    const s = document.createElementNS("http://www.w3.org/2000/svg", "path");
    s.setAttribute("d", "M3 3v5h5"), r.appendChild(n), r.appendChild(s);
    const i = document.createElement("span");
    return i.textContent = "Reset to Default", t.appendChild(r), t.appendChild(i), t.addEventListener("click", () => {
      this.handleReset();
    }), e.appendChild(t), e;
  }
  handleReset() {
    this.grid.resetColumnsToDefault(), this.onReset?.(), this.searchInput && (this.searchInput.value = "", this.filterColumns("")), this.updateCountBadge();
  }
  createColumnItem(e, t, r) {
    const n = `column-item-${e}`, s = `column-switch-${e}`, i = document.createElement("div");
    i.className = "column-item", i.id = n, i.dataset.column = e, i.setAttribute("role", "listitem");
    const o = document.createElement("div");
    o.className = "column-item-content";
    const a = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    a.setAttribute("class", "drag-handle"), a.setAttribute("viewBox", "0 0 20 20"), a.setAttribute("fill", "currentColor"), a.setAttribute("aria-hidden", "true"), a.setAttribute("focusable", "false"), [
      [5, 4],
      [5, 10],
      [5, 16],
      [11, 4],
      [11, 10],
      [11, 16]
    ].forEach(([p, m]) => {
      const g = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      g.setAttribute("cx", String(p)), g.setAttribute("cy", String(m)), g.setAttribute("r", "1.5"), a.appendChild(g);
    });
    const l = document.createElement("span");
    l.className = "column-label", l.id = `${n}-label`, l.textContent = t, o.appendChild(a), o.appendChild(l);
    const c = document.createElement("label");
    c.className = "column-switch", c.htmlFor = s;
    const d = document.createElement("input");
    d.type = "checkbox", d.id = s, d.dataset.column = e, d.checked = r, d.setAttribute("role", "switch"), d.setAttribute("aria-checked", String(r)), d.setAttribute("aria-labelledby", `${n}-label`), d.setAttribute("aria-describedby", `${n}-desc`);
    const u = document.createElement("span");
    u.id = `${n}-desc`, u.className = "sr-only", u.textContent = `Press Space or Enter to toggle ${t} column visibility. Currently ${r ? "visible" : "hidden"}.`;
    const h = document.createElement("span");
    return h.className = "column-switch-slider", h.setAttribute("aria-hidden", "true"), c.appendChild(d), c.appendChild(h), i.appendChild(o), i.appendChild(c), i.appendChild(u), i;
  }
  setupDragAndDrop() {
    const e = this.container.querySelector(".column-list") || this.container;
    this.sortable = S.create(e, {
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
        const n = `column-item-${t}-desc`, s = this.container.querySelector(`#${n}`);
        s && (s.textContent = `Press Space or Enter to toggle ${this.container.querySelector(`#column-item-${t}-label`)?.textContent || t} column visibility. Currently ${r ? "visible" : "hidden"}.`), this.onToggle && this.onToggle(t, r), this.grid.config.behaviors?.columnVisibility && this.grid.config.behaviors.columnVisibility.toggleColumn(t, this.grid), this.updateCountBadge();
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
function pl(e, t, r, n, s) {
  const i = (o) => {
    const a = o.target;
    if (!a) return;
    const l = a.closest(r);
    !l || !(l instanceof HTMLElement) || n(o, l);
  };
  return e.addEventListener(t, i, s), () => e.removeEventListener(t, i, s);
}
function ml(e) {
  const t = e.tableEl;
  if (!t || !t.classList || typeof t.closest != "function") return;
  t.classList.add("admin-datagrid__table"), (t.closest("[data-datagrid-surface]") || t).classList.add("admin-datagrid");
  const r = t.querySelector("thead");
  r?.classList.add("admin-datagrid__header"), r?.querySelectorAll("th").forEach((s) => {
    s.classList.add("admin-datagrid__header-cell");
  }), t.querySelector("tbody")?.classList.add("admin-datagrid__body"), t.querySelectorAll(e.selectors.filterRow).forEach((s) => {
    s.classList.add("admin-datagrid__filter-control");
    const i = s.closest("tr");
    i?.classList.add("admin-datagrid__filter-row"), i?.querySelectorAll("th").forEach((o) => {
      o.classList.add("admin-datagrid__header-cell");
    });
  }), document.querySelector(e.selectors.searchInput)?.closest("[data-datagrid-toolbar]")?.classList.add("admin-surface-card", "admin-datagrid__toolbar"), document.querySelector("[data-datagrid-filter-panel]")?.classList.add("admin-surface-card", "admin-datagrid__filter-panel");
  const n = document.querySelector(e.selectors.paginationContainer);
  (n?.closest("[data-datagrid-pagination]") || n)?.classList.add("admin-surface-card", "admin-datagrid__pagination"), n?.classList.add("admin-datagrid__pagination-controls");
  for (const s of [
    e.selectors.tableInfoStart,
    e.selectors.tableInfoEnd,
    e.selectors.tableInfoTotal
  ]) {
    const i = document.querySelector(s);
    i?.classList.add("admin-datagrid__pagination-text"), i?.parentElement?.classList.add("admin-datagrid__pagination-text");
  }
  document.querySelector(e.selectors.perPageSelect)?.parentElement?.classList.add("admin-datagrid__pagination-text");
}
function gl(e) {
  const t = document.querySelector(e.selectors.searchInput);
  if (!t) {
    console.warn(`[DataGrid] Search input not found: ${e.selectors.searchInput}`);
    return;
  }
  console.log(`[DataGrid] Search input bound to: ${e.selectors.searchInput}`);
  const r = document.getElementById("clear-search-btn"), n = () => {
    r && (t.value.trim() ? r.classList.remove("hidden") : r.classList.add("hidden"));
  };
  t.addEventListener("input", () => {
    n(), e.searchTimeout && clearTimeout(e.searchTimeout), e.searchTimeout = window.setTimeout(async () => {
      console.log(`[DataGrid] Search triggered: "${t.value}"`), e.state.search = t.value, e.pushStateToURL(), e.config.behaviors?.search ? await e.config.behaviors.search.onSearch(t.value, e) : (e.resetPagination(), await e.refresh());
    }, e.config.searchDelay);
  }), r && r.addEventListener("click", async () => {
    t.value = "", t.focus(), n(), e.state.search = "", e.pushStateToURL(), e.config.behaviors?.search ? await e.config.behaviors.search.onSearch("", e) : (e.resetPagination(), await e.refresh());
  }), n();
}
function bl(e) {
  const t = document.querySelector(e.selectors.perPageSelect);
  t && t.addEventListener("change", async () => {
    e.state.perPage = parseInt(t.value, 10), e.resetPagination(), e.pushStateToURL(), await e.refresh();
  });
}
function yl(e) {
  document.querySelectorAll(e.selectors.filterRow).forEach((t) => {
    const r = async () => {
      const n = t.dataset.filterColumn, s = t instanceof HTMLInputElement ? t.type.toLowerCase() : "", i = t instanceof HTMLSelectElement ? "eq" : s === "" || s === "text" || s === "search" || s === "email" || s === "tel" || s === "url" ? "ilike" : "eq", o = t.dataset.filterOperator || i, a = t.value;
      if (!n) return;
      const l = e.state.filters.findIndex((c) => c.column === n);
      if (a) {
        const c = {
          column: n,
          operator: o,
          value: a
        };
        l >= 0 ? e.state.filters[l] = c : e.state.filters.push(c);
      } else l >= 0 && e.state.filters.splice(l, 1);
      e.pushStateToURL(), e.config.behaviors?.filter ? await e.config.behaviors.filter.onFilterChange(n, a, e) : (e.resetPagination(), await e.refresh());
    };
    t.addEventListener("input", r), t.addEventListener("change", r);
  });
}
function vl(e) {
  const t = document.querySelector(e.selectors.columnToggleBtn), r = document.querySelector(e.selectors.columnToggleMenu);
  !t || !r || (e.columnManager = new hl({
    container: r,
    grid: e,
    onToggle: (n, s) => {
      console.log(`[DataGrid] Column ${n} visibility toggled to ${s}`);
    },
    onReorder: (n) => {
      console.log("[DataGrid] Columns reordered:", n);
    }
  }));
}
function wl(e) {
  if (!e.isCapabilityEnabled("export")) return;
  const t = document.querySelector(e.selectors.exportMenu);
  if (!t) return;
  const r = t.querySelectorAll("[data-export-format]");
  r.forEach((n) => {
    n.addEventListener("click", async () => {
      const s = n.dataset.exportFormat;
      if (!s || !e.config.behaviors?.export) return;
      const i = e.config.behaviors.export.getConcurrency?.() || "single", o = [];
      i === "single" ? r.forEach((d) => o.push(d)) : i === "per-format" && o.push(n);
      const a = (d) => {
        const u = d.querySelector(".export-icon"), h = d.querySelector(".export-spinner");
        u && u.classList.add("hidden"), h && h.classList.remove("hidden");
      }, l = (d) => {
        const u = d.querySelector(".export-icon"), h = d.querySelector(".export-spinner");
        u && u.classList.remove("hidden"), h && h.classList.add("hidden");
      };
      o.forEach((d) => {
        d.setAttribute("data-export-loading", "true"), d.disabled = !0, a(d);
      });
      const c = i === "none";
      c && (n.setAttribute("data-export-loading", "true"), a(n));
      try {
        await e.config.behaviors.export.export(s, e);
      } catch (d) {
        console.error("[DataGrid] Export failed:", d);
      } finally {
        o.forEach((d) => {
          d.removeAttribute("data-export-loading"), d.disabled = !1, l(d);
        }), c && (n.removeAttribute("data-export-loading"), l(n));
      }
    });
  });
}
function xl(e) {
  e.tableEl && (e.tableEl.querySelectorAll("[data-sort-column]").forEach((t) => {
    t.addEventListener("click", async (r) => {
      r.preventDefault(), r.stopPropagation();
      const n = t.dataset.sortColumn;
      if (!n) return;
      console.log(`[DataGrid] Sort button clicked for field: ${n}`);
      const s = e.state.sort.find((o) => o.field === n);
      let i = null;
      s ? s.direction === "asc" ? (i = "desc", s.direction = i) : (e.state.sort = e.state.sort.filter((o) => o.field !== n), i = null, console.log(`[DataGrid] Sort cleared for field: ${n}`)) : (i = "asc", e.state.sort = [{
        field: n,
        direction: i
      }]), console.log("[DataGrid] New sort state:", e.state.sort), e.pushStateToURL(), i !== null && e.config.behaviors?.sort ? (console.log("[DataGrid] Calling custom sort behavior"), await e.config.behaviors.sort.onSort(n, i, e)) : (console.log("[DataGrid] Calling refresh() for sort"), await e.refresh()), console.log("[DataGrid] Updating sort indicators"), e.updateSortIndicators();
    });
  }), e.tableEl.querySelectorAll("[data-sort]").forEach((t) => {
    t.addEventListener("click", async () => {
      const r = t.dataset.sort;
      if (!r) return;
      const n = e.state.sort.find((i) => i.field === r);
      let s = null;
      n ? n.direction === "asc" ? (s = "desc", n.direction = s) : (e.state.sort = e.state.sort.filter((i) => i.field !== r), s = null) : (s = "asc", e.state.sort = [{
        field: r,
        direction: s
      }]), e.pushStateToURL(), s !== null && e.config.behaviors?.sort ? await e.config.behaviors.sort.onSort(r, s, e) : await e.refresh(), e.updateSortIndicators();
    });
  }));
}
function Sl(e) {
  e.tableEl && (e.tableEl.querySelectorAll("[data-sort-column]").forEach((t) => {
    const r = t.dataset.sortColumn;
    if (!r) return;
    const n = e.state.sort.find((i) => i.field === r), s = t.querySelector("svg");
    s && (n ? (t.classList.remove("opacity-0"), t.classList.add("opacity-100"), n.direction === "asc" ? (s.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />', s.classList.add("text-blue-600"), s.classList.remove("text-gray-400")) : (s.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />', s.classList.add("text-blue-600"), s.classList.remove("text-gray-400"))) : (s.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />', s.classList.remove("text-blue-600"), s.classList.add("text-gray-400")));
  }), e.tableEl.querySelectorAll("[data-sort]").forEach((t) => {
    const r = t.dataset.sort, n = e.state.sort.find((i) => i.field === r), s = t.querySelector(".sort-indicator");
    s && (s.textContent = n ? n.direction === "asc" ? "↑" : "↓" : "");
  }));
}
function Cl(e) {
  if (!e.isCapabilityEnabled("selection")) {
    e.selectionAbortController?.abort(), e.selectionAbortController = null, e.state.selectedRows.clear();
    return;
  }
  if (!e.tableEl) return;
  e.selectionAbortController && e.selectionAbortController.abort(), e.selectionAbortController = new AbortController();
  const { signal: t } = e.selectionAbortController, r = e.tableEl.querySelector(e.selectors.selectAllCheckbox);
  r && r.addEventListener("change", () => {
    e.tableEl.querySelectorAll(e.selectors.rowCheckboxes).forEach((n) => {
      n.checked = r.checked, Er(n);
      const s = n.dataset.id;
      s && (r.checked ? e.state.selectedRows.add(s) : e.state.selectedRows.delete(s));
    }), e.updateBulkActionsBar();
  }, { signal: t }), e.tableEl.addEventListener("change", (n) => {
    const s = n.target;
    if (!s || s === r || typeof s.matches != "function" || !s.matches(e.selectors.rowCheckboxes)) return;
    const i = s.dataset.id;
    i && (s.checked ? e.state.selectedRows.add(i) : e.state.selectedRows.delete(i)), Er(s), e.updateBulkActionsBar();
  }, { signal: t }), e.updateSelectionBindings();
}
function El(e) {
  e.isCapabilityEnabled("selection") && (e.tableEl?.querySelectorAll(e.selectors.rowCheckboxes) || []).forEach((t) => {
    const r = t.dataset.id;
    r && (t.checked = e.state.selectedRows.has(r)), Er(t);
  });
}
function Er(e) {
  const t = e.closest("tr");
  t && (t.dataset.selected = String(e.checked), t.setAttribute("aria-selected", String(e.checked)));
}
function yn(e) {
  return Array.from(new Set(e.filter(Boolean)));
}
function Ar(e, t) {
  for (const r of t) {
    const n = e.querySelector(r);
    if (n) return n;
  }
  return null;
}
function Al(e) {
  const t = e?.selectors?.bulkActionsBar;
  if (!t) return null;
  try {
    return document.querySelector(t);
  } catch {
    return null;
  }
}
function Ue(e) {
  const t = Al(e);
  return t && e?.selectors?.bulkActionsBar !== "#bulk-actions-bar" ? t : Ar(document, [
    "[data-bulk-action-overlay]",
    "#bulk-actions-overlay",
    '[data-bulk-action-bar="true"]'
  ]) || t;
}
function Wr(e) {
  const t = Ue(e);
  return Array.from(t ? t.querySelectorAll("[data-bulk-action]") : document.querySelectorAll("[data-bulk-action]"));
}
function kl(e) {
  const t = Ue(e), r = [
    "[data-bulk-selection-count]",
    "#selected-count",
    e?.selectors?.selectedCount
  ].filter(Boolean);
  return (t ? Ar(t, r) : null) || Ar(document, r);
}
function $l(e) {
  const t = Ue(e), r = [
    "[data-bulk-clear]",
    "#bulk-clear-selection",
    "#clear-selection-btn"
  ], n = r.flatMap((s) => Array.from((t || document).querySelectorAll(s)));
  return n.length ? yn(n) : yn(r.flatMap((s) => Array.from(document.querySelectorAll(s))));
}
function Ts(e) {
  $l(e).forEach((t) => {
    t.dataset.bulkClearBound !== "true" && (t.dataset.bulkClearBound = "true", t.addEventListener("click", () => {
      e.clearSelection();
    }));
  });
}
function _l(e, t) {
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
function Ll(e) {
  if (!e) return null;
  let t = e.querySelector("[data-bulk-action-state-reasons]");
  return t || (t = document.createElement("div"), t.dataset.bulkActionStateReasons = "true", t.className = "hidden mt-3 text-sm text-gray-700", e.appendChild(t), t);
}
function Ds(e, t) {
  const r = Ll(Ue(t));
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
function Tl(e, t, r) {
  const n = t?.enabled === !1, s = typeof t?.reason == "string" ? t.reason.trim() : "";
  return e.dataset.disabled = n ? "true" : "false", e.setAttribute("aria-disabled", n ? "true" : "false"), e.dataset.bulkState = n ? "disabled" : "enabled", e.classList.toggle("opacity-50", n), e.classList.toggle("cursor-not-allowed", n), n && s ? (e.setAttribute("title", s), {
    actionId: e.dataset.bulkAction || "",
    label: r,
    reason: s
  }) : (e.removeAttribute("title"), null);
}
function Dl(e) {
  const t = Wr(e), r = "Checking selected records...", n = [];
  t.forEach((s) => {
    s.dataset.disabled = "true", s.dataset.bulkState = "loading", s.setAttribute("aria-disabled", "true"), s.setAttribute("title", r), s.classList.add("opacity-50", "cursor-not-allowed"), n.push({
      actionId: s.dataset.bulkAction || "",
      label: s.textContent?.trim() || s.dataset.bulkAction || "Action",
      reason: r
    });
  }), Ds(n, e);
}
function Rs(e) {
  return Or(e.bulkActionStateConfig);
}
function Rl(e, t, r) {
  e.bulkActionState = Pt(t), e.bulkActionStateConfig = Or(r), e.applyBulkActionState(e.bulkActionState);
}
function Ml(e, t) {
  const r = Pt(t);
  e.bulkActionState = r;
  const n = [];
  Wr(e).forEach((s) => {
    const i = s.dataset.bulkAction;
    if (!i) return;
    const o = Tl(s, r[i] || null, s.textContent?.trim() || i);
    o && n.push(o);
  }), Ds(n, e);
}
async function Il(e) {
  const t = Rs(e), r = typeof t?.selection_state_endpoint == "string" ? t.selection_state_endpoint.trim() : "";
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
  const s = e.bulkActionStateRequestSeq, i = typeof e.buildQueryString == "function" ? e.buildQueryString() : "", o = i ? `${r}${r.includes("?") ? "&" : "?"}${i}` : r;
  try {
    const a = await j(o, {
      method: "POST",
      signal: e.bulkActionStateAbortController.signal,
      json: { ids: n }
    });
    if (!a.ok) throw new Error(`Bulk action state request failed: ${a.status}`);
    const l = Mi(await a.json());
    if (!l || s !== e.bulkActionStateRequestSeq) return;
    e.applyBulkActionState({
      ...e.bulkActionState,
      ...l.bulk_action_state
    });
  } catch (a) {
    if (a instanceof Error && a.name === "AbortError") return;
    console.warn("[DataGrid] Failed to refresh selection-sensitive bulk action state:", a), s === e.bulkActionStateRequestSeq && e.applyBulkActionState(e.bulkActionState);
  }
}
function Pl(e) {
  if (!e.isCapabilityEnabled("bulk")) return;
  e.bulkActionStateDebounce && (clearTimeout(e.bulkActionStateDebounce), e.bulkActionStateDebounce = null);
  const t = Rs(e), r = e.state.selectedRows.size;
  if (!t?.selection_sensitive || !t.selection_state_endpoint || r === 0) {
    e.bulkActionStateAbortController && (e.bulkActionStateAbortController.abort(), e.bulkActionStateAbortController = null), e.applyBulkActionState(e.bulkActionState);
    return;
  }
  Dl(e);
  const n = typeof t.debounce_ms == "number" ? t.debounce_ms : 150;
  e.bulkActionStateDebounce = window.setTimeout(() => {
    e.bulkActionStateDebounce = null, Il(e);
  }, n);
}
function Bl(e) {
  if (!e.isCapabilityEnabled("bulk")) return;
  const t = Ue(e)?.dataset?.bulkBase || "";
  Wr(e).forEach((r) => {
    r.addEventListener("click", async () => {
      const n = r, s = n.dataset.bulkAction;
      if (!s || n.getAttribute("aria-disabled") === "true" || n.dataset.disabled === "true") return;
      const i = Array.from(e.state.selectedRows);
      if (i.length === 0) {
        e.notify("Please select items first", "warning");
        return;
      }
      if (e.config.bulkActions) {
        const o = e.config.bulkActions.find((a) => a.id === s);
        if (o) {
          try {
            await e.actionRenderer.executeBulkAction(o, i), e.clearSelection(), await e.refresh();
          } catch (a) {
            console.error("Bulk action failed:", a), We(a)?.textCode && await e.refresh(), Te(a) || e.showError(a instanceof Error ? a.message : "Bulk action failed");
          }
          return;
        }
      }
      if (t) {
        const o = `${t}/${s}`, a = n.dataset.bulkConfirm, l = e.parseDatasetStringArray(n.dataset.bulkPayloadRequired), c = e.parseDatasetObject(n.dataset.bulkPayloadSchema), d = {
          id: s,
          label: n.textContent?.trim() || s,
          endpoint: o,
          confirm: a,
          payloadRequired: l,
          payloadSchema: c
        };
        try {
          await e.actionRenderer.executeBulkAction(d, i), e.clearSelection(), await e.refresh();
        } catch (u) {
          console.error("Bulk action failed:", u), We(u)?.textCode && await e.refresh(), Te(u) || e.showError(u instanceof Error ? u.message : "Bulk action failed");
        }
        return;
      }
      if (e.config.behaviors?.bulkActions) try {
        await e.config.behaviors.bulkActions.execute(s, i, e), e.clearSelection();
      } catch (o) {
        console.error("Bulk action failed:", o), We(o)?.textCode && await e.refresh(), Te(o) || e.showError(o instanceof Error ? o.message : "Bulk action failed");
      }
    });
  }), Ts(e), e.bindOverflowMenu();
}
function Ol(e) {
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
function Fl(e) {
  if (!e.isCapabilityEnabled("bulk")) return;
  const t = Ue(e), r = kl(e), n = e.state.selectedRows.size;
  !t || !r || (r.textContent = String(n), _l(t, n), n > 0 && t.offsetHeight, e.syncBulkActionState());
}
function ql(e) {
  e.isCapabilityEnabled("bulk") && Ts(e);
}
function Nl(e) {
  if (!e.isCapabilityEnabled("selection")) return;
  console.log("[DataGrid] Clearing selection..."), e.state.selectedRows.clear();
  const t = e.tableEl?.querySelector(e.selectors.selectAllCheckbox);
  t && (t.checked = !1), e.updateBulkActionsBar(), e.updateSelectionBindings();
}
function jl(e, t, r) {
  vi({
    trigger: t,
    menu: r
  });
}
function zl(e) {
  e.actionMenuController && (e.actionMenuController.destroy(), e.actionMenuController = null), e.dropdownAbortController && e.dropdownAbortController.abort(), e.dropdownAbortController = new AbortController();
  const { signal: t } = e.dropdownAbortController;
  document.querySelectorAll("[data-dropdown-toggle]").forEach((s) => {
    const i = s.dataset.dropdownToggle, o = document.getElementById(i || "");
    o && !o.classList.contains("hidden") && o.classList.add("hidden");
  });
  const r = (s = !1) => {
    document.querySelectorAll("[data-dropdown-toggle]").forEach((i) => {
      const o = i.dataset.dropdownToggle, a = document.getElementById(o || "");
      a && (a.classList.add("hidden"), i.setAttribute("aria-expanded", "false"), s && a.getAttribute("data-dropdown-open") === "true" && i.focus(), a.removeAttribute("data-dropdown-open"));
    });
  };
  pl(document, "click", "[data-dropdown-toggle]", (s, i) => {
    const o = i.dataset.dropdownToggle, a = document.getElementById(o || "");
    if (!(!e.isCapabilityEnabled("export") && (i.matches(e.selectors.exportBtn) || a?.matches(e.selectors.exportMenu))) && (s.stopPropagation(), a)) {
      const l = a.classList.contains("hidden");
      document.querySelectorAll("[data-dropdown-toggle]").forEach((c) => {
        const d = c.dataset.dropdownToggle, u = document.getElementById(d || "");
        u && u !== a && (u.classList.add("hidden"), c.setAttribute("aria-expanded", "false"), u.removeAttribute("data-dropdown-open"));
      }), a.classList.toggle("hidden"), i.setAttribute("aria-expanded", String(l)), l ? (a.setAttribute("data-dropdown-open", "true"), a.querySelector('[role="option"], [role="menuitem"], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])')?.focus()) : (a.removeAttribute("data-dropdown-open"), i.focus());
    }
  }, { signal: t }), document.addEventListener("click", (s) => {
    const i = s.target;
    i && typeof i.closest == "function" && i.closest("[data-dropdown-toggle], #column-toggle-menu, #export-menu") || r();
  }, { signal: t });
  const n = e.tableEl ?? document;
  e.actionMenuController = wi(n, {
    containerSelector: "[data-dropdown], .actions-dropdown",
    triggerSelector: "[data-dropdown-trigger], .actions-menu-trigger",
    menuSelector: ".actions-menu",
    itemSelector: '[role="menuitem"], .action-item',
    outsideIgnoreSelector: "[data-dropdown-toggle], #column-toggle-menu, #export-menu",
    positionMenu: ({ trigger: s, menu: i }) => {
      e.positionDropdownMenu(s, i);
    },
    portal: !0,
    signal: t
  }), document.addEventListener("keydown", (s) => {
    s.key === "Escape" && r(!0);
  }, { signal: t });
}
function Gl(e, t) {
  console.error(t), e.notifier.error(t);
}
function Hl(e, t, r) {
  e.notifier.show({
    message: t,
    type: r
  });
}
async function Ul(e, t) {
  return e.notifier.confirm(t);
}
async function Vl(e, t) {
  return t instanceof Response ? Zs(t) : t instanceof Error ? t.message : "An unexpected error occurred";
}
function Kl(e, t) {
  if (t)
    try {
      const r = JSON.parse(t);
      if (!Array.isArray(r)) return;
      const n = r.map((s) => typeof s == "string" ? s.trim() : "").filter((s) => s.length > 0);
      return n.length > 0 ? n : void 0;
    } catch (r) {
      console.warn("[DataGrid] Failed to parse bulk payload_required:", r);
      return;
    }
}
function Jl(e, t) {
  if (t)
    try {
      const r = JSON.parse(t);
      return !r || typeof r != "object" || Array.isArray(r) ? void 0 : r;
    } catch (r) {
      console.warn("[DataGrid] Failed to parse bulk payload_schema:", r);
      return;
    }
}
function Yl(e, t) {
  if (!e.tableEl) return;
  const r = e.mergeColumnOrder(t);
  e.state.columnOrder = r;
  const n = new Map(e.config.columns.map((s) => [s.field, s]));
  e.config.columns = r.map((s) => n.get(s)).filter((s) => s !== void 0), e.reorderTableColumns(r), e.persistStateSnapshot(), console.log("[DataGrid] Columns reordered:", r);
}
function Wl(e) {
  e.config.behaviors?.columnVisibility?.clearSavedPrefs?.(), e.config.columns = e.defaultColumns.map((r) => ({ ...r })), e.state.columnOrder = e.config.columns.map((r) => r.field);
  const t = e.config.columns.filter((r) => !r.hidden).map((r) => r.field);
  e.tableEl ? (e.reorderTableColumns(e.state.columnOrder), e.updateColumnVisibility(t)) : (e.state.hiddenColumns = new Set(e.config.columns.filter((r) => r.hidden).map((r) => r.field)), e.persistStateSnapshot()), e.columnManager && (e.columnManager.refresh(), e.columnManager.syncWithGridState()), console.log("[DataGrid] Columns reset to default");
}
function Xl(e, t) {
  const r = new Set(e.config.columns.map((o) => o.field)), n = new Set(t), s = t.filter((o) => r.has(o)), i = e.config.columns.map((o) => o.field).filter((o) => !n.has(o));
  return [...s, ...i];
}
function Ql(e, t) {
  if (!e.tableEl) return;
  const r = e.tableEl.querySelector("thead tr:first-child");
  r && e.reorderRowCells(r, t, "th");
  const n = e.tableEl.querySelector("#filter-row");
  n && e.reorderRowCells(n, t, "th"), e.tableEl.querySelectorAll("tbody tr").forEach((s) => {
    e.reorderRowCells(s, t, "td");
  });
}
function Zl(e, t, r, n) {
  const s = Array.from(t.querySelectorAll(`${n}[data-column]`)), i = new Map(s.map((d) => [d.dataset.column, d])), o = Array.from(t.querySelectorAll(n)), a = t.querySelector(`${n}[data-role="selection"]`) || o.find((d) => d.querySelector('input[type="checkbox"]')), l = t.querySelector(`${n}[data-role="actions"]`) || o.find((d) => !d.dataset.column && (d.querySelector("[data-action]") || d.querySelector("[data-action-id]") || d.querySelector(".dropdown"))), c = [];
  a && c.push(a), r.forEach((d) => {
    const u = i.get(d);
    u && c.push(u);
  }), l && c.push(l), c.forEach((d) => {
    t.appendChild(d);
  });
}
var K;
function ec(e) {
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
var Ms = class {
  constructor(e) {
    this.tableEl = null, this.searchTimeout = null, this.abortController = null, this.dropdownAbortController = null, this.actionMenuController = null, this.selectionAbortController = null, this.didRestoreColumnOrder = !1, this.shouldReorderDOMOnRestore = !1, this.recordsById = {}, this.columnManager = null, this.lastSchema = null, this.lastForm = null, this.bulkActionState = {}, this.bulkActionStateConfig = null, this.bulkActionStateDebounce = null, this.bulkActionStateAbortController = null, this.bulkActionStateRequestSeq = 0, this.refreshDrainPromise = null, this.refreshInFlight = null, this.refreshQueued = !1, this.refreshRequestSeq = 0, this.activeRefreshSeq = 0, this.hasURLStateOverrides = !1, this.hasPersistedHiddenColumnState = !1, this.hasPersistedColumnOrderState = !1, this.config = {
      perPage: 10,
      searchDelay: 300,
      behaviors: {},
      ...e,
      capabilities: ec(e.capabilities)
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
    };
    const t = this.config.panelId || this.config.tableId;
    this.stateStore = this.config.stateStore || mo({
      key: t,
      ...this.config.stateStoreConfig || {}
    });
    const r = this.stateStore.loadPersistedState(), n = new Set(this.config.columns.map((C) => C.field)), s = new Set(this.config.columns.filter((C) => C.hidden).map((C) => C.field)), i = !!r && Array.isArray(r.hiddenColumns);
    this.hasPersistedHiddenColumnState = i;
    const o = new Set((r?.hiddenColumns || []).filter((C) => n.has(C))), a = this.config.columns.map((C) => C.field), l = !!r && Array.isArray(r.columnOrder) && r.columnOrder.length > 0;
    this.hasPersistedColumnOrderState = l;
    const c = (r?.columnOrder || []).filter((C) => n.has(C)), d = l ? [...c, ...a.filter((C) => !c.includes(C))] : a, u = this.config.enableGroupedMode ? _o(t) : !1, h = this.config.enableGroupedMode ? To(t) : null, p = this.config.enableGroupedMode ? $o(t) : "explicit", m = this.config.enableGroupedMode ? ko(t) : /* @__PURE__ */ new Set(), g = ct(r?.expandMode, p), y = new Set((r?.expandedGroups || Array.from(m)).map((C) => String(C).trim()).filter(Boolean)), v = this.config.enableGroupedMode ? r?.expandMode !== void 0 || y.size > 0 || u : !1, A = (this.config.enableGroupedMode ? r?.viewMode || h : null) || this.config.defaultViewMode || "flat";
    this.state = {
      currentPage: 1,
      perPage: this.config.perPage || 10,
      totalRows: 0,
      search: "",
      filters: [],
      sort: [],
      selectedRows: /* @__PURE__ */ new Set(),
      hiddenColumns: i ? o : s,
      columnOrder: d,
      viewMode: A,
      expandMode: g,
      groupedData: null,
      expandedGroups: y,
      hasPersistedExpandState: v
    }, this.actionRenderer = new Si({
      mode: this.config.actionRenderMode || "dropdown",
      actionBasePath: this.config.actionBasePath || this.config.apiEndpoint,
      notifier: this.notifier,
      domIdPrefix: this.config.tableId
    }), this.cellRendererRegistry = new so(), this.config.cellRenderers && Object.entries(this.config.cellRenderers).forEach(([C, L]) => {
      this.cellRendererRegistry.register(C, L);
    }), this.defaultColumns = this.config.columns.map((C) => ({ ...C }));
  }
  init() {
    if (console.log("[DataGrid] Initializing with config:", this.config), this.tableEl = document.querySelector(this.selectors.table), !this.tableEl) {
      console.error(`[DataGrid] Table element not found: ${this.selectors.table}`);
      return;
    }
    console.log("[DataGrid] Table element found:", this.tableEl), Ta(this), ml(this), this.restoreStateFromURL(), this.bindSearchInput(), this.bindPerPageSelect(), this.bindFilterInputs(), this.bindColumnVisibility(), this.bindExportButtons(), this.bindSorting(), this.bindSelection(), this.bindBulkActions(), this.bindBulkClearButton(), this.bindDropdownToggles(), this.refreshAfterStateHydration();
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
    return zo(this);
  }
  parseJSONArray(e, t) {
    return Go(this, e, t);
  }
  applyPersistedStateSnapshot(e, t = {}) {
    Vo(this, e, t);
  }
  applyShareStateSnapshot(e) {
    Ko(this, e);
  }
  buildPersistedStateSnapshot() {
    return Jo(this);
  }
  buildShareStateSnapshot() {
    return Yo(this);
  }
  persistStateSnapshot() {
    Wo(this);
  }
  restoreStateFromURL() {
    Xo(this);
  }
  applyRestoredState() {
    Qo(this);
  }
  pushStateToURL(e = {}) {
    Zo(this, e);
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
      this.activeRefreshSeq = e, this.refreshInFlight = ea(this, e), await this.refreshInFlight, this.refreshInFlight = null;
    }
  }
  buildApiUrl() {
    return ta(this);
  }
  buildQueryString() {
    return ra(this);
  }
  buildQueryParams() {
    return na(this);
  }
  getResponseTotal(e) {
    return sa(this, e);
  }
  normalizePagination(e) {
    return ia(this, e);
  }
  resetPagination() {
    this.state.currentPage = 1;
  }
  updateColumnVisibility(e, t = !1) {
    _a(this, e, t);
  }
  syncColumnVisibilityCheckboxes() {
    La(this);
  }
  renderData(e) {
    Ma(this, e);
  }
  renderLoadingState() {
    Da(this);
  }
  renderErrorState(e) {
    Ra(this, e);
  }
  renderFlatData(e, t) {
    Ia(this, e, t);
  }
  renderGroupedData(e, t, r) {
    ua(this, e, t, r);
  }
  isGroupedViewActive() {
    return fa(this);
  }
  fallbackGroupedMode(e) {
    ha(this, e);
  }
  handleGroupedModeStatusFallback(e) {
    return pa(this, e);
  }
  handleGroupedModePayloadFallback(e) {
    return ma(this, e);
  }
  toggleGroup(e) {
    ga(this, e);
  }
  setExpandedGroups(e) {
    ba(this, e);
  }
  expandAllGroups() {
    ya(this);
  }
  collapseAllGroups() {
    va(this);
  }
  updateGroupVisibility(e) {
    wa(this, e);
  }
  updateGroupedRowsFromState() {
    xa(this);
  }
  isGroupExpandedByState(e, t = !1) {
    return Sa(this, e, t);
  }
  setViewMode(e) {
    Ca(this, e);
  }
  getViewMode() {
    return Ea(this);
  }
  getGroupedData() {
    return Aa(this);
  }
  async fetchDetail(e) {
    return oa(this, e);
  }
  getSchema() {
    return la(this);
  }
  getForm() {
    return ca(this);
  }
  getTabs() {
    return da(this);
  }
  normalizeDetailResponse(e) {
    return aa(this, e);
  }
  resolveRendererOptions(e) {
    return Pa(this, e);
  }
  createTableRow(e) {
    return Ba(this, e);
  }
  sanitizeActionId(e) {
    return Oa(this, e);
  }
  async handleDelete(e) {
    return Fa(this, e);
  }
  updatePaginationUI(e) {
    qa(this, e);
  }
  renderPaginationButtons(e) {
    Na(this, e);
  }
  bindSearchInput() {
    gl(this);
  }
  bindPerPageSelect() {
    bl(this);
  }
  bindFilterInputs() {
    yl(this);
  }
  bindColumnVisibility() {
    vl(this);
  }
  bindExportButtons() {
    wl(this);
  }
  bindSorting() {
    xl(this);
  }
  updateSortIndicators() {
    Sl(this);
  }
  bindSelection() {
    Cl(this);
  }
  updateSelectionBindings() {
    El(this);
  }
  bindBulkActions() {
    Bl(this);
  }
  bindOverflowMenu() {
    Ol(this);
  }
  updateBulkActionsBar() {
    Fl(this);
  }
  setBulkActionState(e, t) {
    Rl(this, e, t);
  }
  applyBulkActionState(e) {
    Ml(this, e);
  }
  syncBulkActionState() {
    Pl(this);
  }
  bindBulkClearButton() {
    ql(this);
  }
  clearSelection() {
    Nl(this);
  }
  positionDropdownMenu(e, t) {
    jl(this, e, t);
  }
  bindDropdownToggles() {
    zl(this);
  }
  showError(e) {
    Gl(this, e);
  }
  notify(e, t) {
    Hl(this, e, t);
  }
  async confirmAction(e) {
    return Ul(this, e);
  }
  async extractError(e) {
    return Vl(this, e);
  }
  parseDatasetStringArray(e) {
    return Kl(this, e);
  }
  parseDatasetObject(e) {
    return Jl(this, e);
  }
  reorderColumns(e) {
    Yl(this, e);
  }
  resetColumnsToDefault() {
    Wl(this);
  }
  mergeColumnOrder(e) {
    return Xl(this, e);
  }
  reorderTableColumns(e) {
    Ql(this, e);
  }
  reorderRowCells(e, t, r) {
    Zl(this, e, t, r);
  }
  destroy() {
    this.columnManager && (this.columnManager.destroy(), this.columnManager = null), this.dropdownAbortController && (this.dropdownAbortController.abort(), this.dropdownAbortController = null), this.actionMenuController && (this.actionMenuController.destroy(), this.actionMenuController = null), this.selectionAbortController && (this.selectionAbortController.abort(), this.selectionAbortController = null), this.abortController && (this.abortController.abort(), this.abortController = null), this.bulkActionStateAbortController && (this.bulkActionStateAbortController.abort(), this.bulkActionStateAbortController = null), this.searchTimeout && (clearTimeout(this.searchTimeout), this.searchTimeout = null), this.bulkActionStateDebounce && (clearTimeout(this.bulkActionStateDebounce), this.bulkActionStateDebounce = null), console.log("[DataGrid] Instance destroyed");
  }
};
K = Ms;
K.URL_KEY_SEARCH = it;
K.URL_KEY_PAGE = ot;
K.URL_KEY_PER_PAGE = at;
K.URL_KEY_FILTERS = Re;
K.URL_KEY_SORT = lt;
K.URL_KEY_STATE = Ot;
K.URL_KEY_HIDDEN_COLUMNS = Ft;
K.URL_KEY_VIEW_MODE = qt;
K.URL_KEY_EXPANDED_GROUPS = Gr;
K.MANAGED_URL_KEYS = Hr;
K.DEFAULT_MAX_URL_LENGTH = jo;
K.DEFAULT_MAX_FILTERS_LENGTH = 600;
typeof window < "u" && (window.DataGrid = Ms);
var vn = {
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
}, Iu = class {
  constructor(e) {
    this.criteria = [], this.modal = null, this.container = null, this.searchInput = null, this.clearBtn = null, this.config = e, this.notifier = e.notifier || new He();
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
    const e = new URLSearchParams(window.location.search), t = e.get(vt);
    if (t !== null) {
      const n = this.parseAdvancedSearchCriteria(t);
      return n ? (this.criteria = n, !0) : !1;
    }
    const r = e.get(Re);
    if (r !== null) try {
      const n = JSON.parse(r);
      return this.criteria = this.normalizeCriteria(Array.isArray(n) ? n.map((s) => ({
        field: s?.column,
        operator: s?.operator || "ilike",
        value: s?.value,
        logic: "and"
      })) : []), console.log("[AdvancedSearch] Restored criteria from URL:", this.criteria), !0;
    } catch (n) {
      console.warn("[AdvancedSearch] Failed to parse filters from URL:", n);
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
      const n = String(r?.field || "").trim();
      if (!n || !t.has(n)) return null;
      const s = String(r?.operator || "ilike").trim() || "ilike", i = r?.logic === "or" ? "or" : "and";
      return {
        field: n,
        operator: s,
        value: typeof r?.value == "number" ? r.value : String(r?.value || ""),
        logic: i
      };
    }).filter((r) => r !== null);
  }
  pushCriteriaToURL() {
    const e = new URLSearchParams(window.location.search);
    this.criteria.length > 0 ? e.set(vt, JSON.stringify(this.criteria)) : (e.delete(vt), e.delete(Re)), us.forEach((r) => e.delete(r));
    const t = e.toString() ? `${window.location.pathname}?${e.toString()}` : window.location.pathname;
    window.history.pushState({}, "", t), console.log("[AdvancedSearch] URL updated with criteria");
  }
  bindEvents() {
    document.getElementById("advanced-search-btn")?.addEventListener("click", () => this.open());
    const e = document.getElementById("advanced-search-close"), t = document.getElementById("advanced-search-cancel"), r = document.getElementById("advanced-search-overlay");
    e?.addEventListener("click", () => this.close()), t?.addEventListener("click", () => this.close()), r?.addEventListener("click", () => this.close()), document.getElementById("add-criteria-btn")?.addEventListener("click", () => this.addCriterion()), document.getElementById("advanced-search-apply")?.addEventListener("click", () => this.applySearch());
    const n = document.getElementById("save-search-preset-btn"), s = document.getElementById("load-search-preset-btn");
    n?.addEventListener("click", () => this.savePreset()), s?.addEventListener("click", () => this.loadPreset());
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
        const s = this.createLogicConnector(t);
        r.appendChild(s);
      }
      this.container.appendChild(r);
    }));
  }
  createCriterionRow(e, t) {
    const r = document.createElement("div");
    r.className = "flex items-center gap-2 py-3";
    const n = this.config.fields.find((s) => s.name === e.field) || this.config.fields[0];
    return r.innerHTML = `
      <select data-criterion-index="${t}" data-criterion-part="field"
              class="py-2 px-3 pe-9 block border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50">
        ${this.config.fields.map((s) => `
          <option value="${s.name}" ${s.name === e.field ? "selected" : ""}>${s.label}</option>
        `).join("")}
      </select>

      <select data-criterion-index="${t}" data-criterion-part="operator"
              class="py-2 px-3 pe-9 block border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50">
        ${this.getOperatorsForField(n).map((s) => `
          <option value="${s.value}" ${s.value === e.operator ? "selected" : ""}>${s.label}</option>
        `).join("")}
      </select>

      ${this.createValueInput(n, e, t)}

      <button type="button" data-criterion-index="${t}" data-action="remove"
              class="p-2 text-gray-400 hover:text-red-600">
        <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
        </svg>
      </button>
    `, r.querySelectorAll("select, input").forEach((s) => {
      s.addEventListener("change", (i) => this.updateCriterion(i.target));
    }), r.querySelector('[data-action="remove"]')?.addEventListener("click", () => {
      this.removeCriterion(t);
    }), r;
  }
  createValueInput(e, t, r) {
    return e.type === "select" && e.options ? `
        <select data-criterion-index="${r}" data-criterion-part="value"
                class="flex-1 py-2 px-3 block border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500">
          <option value="">Select...</option>
          ${e.options.map((n) => `
            <option value="${n.value}" ${n.value === t.value ? "selected" : ""}>${n.label}</option>
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
      n.addEventListener("click", (s) => {
        const i = s.target, o = parseInt(i.dataset.logicIndex || "0", 10), a = i.dataset.logicValue;
        this.criteria[o].logic = a, this.renderCriteria();
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
    return e.operators && e.operators.length > 0 ? e.operators.map((t) => ({
      label: t,
      value: t
    })) : vn[e.type] || vn.text;
  }
  applySearch() {
    this.pushCriteriaToURL(), this.config.onSearch(this.criteria), this.renderChips(), this.close();
  }
  savePreset() {
    new en({
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
    new en({
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
      t && (t.placeholder = "", t.style.display = ""), r && r.classList.remove("hidden"), this.criteria.forEach((n, s) => {
        const i = this.createChip(n, s);
        e.appendChild(i);
      });
    }
  }
  createChip(e, t) {
    const r = document.createElement("div");
    r.className = "inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded border border-blue-200", r.innerHTML = `
      <span>${this.config.fields.find((s) => s.name === e.field)?.label || e.field} ${e.operator === "ilike" ? "contains" : e.operator === "eq" ? "is" : e.operator} "${e.value}"</span>
      <button type="button"
              data-chip-index="${t}"
              class="ml-1 text-blue-600 hover:text-blue-800 focus:outline-none"
              title="Remove filter">
        <svg class="h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
        </svg>
      </button>
    `;
    const n = r.querySelector("[data-chip-index]");
    return n && n.addEventListener("click", () => {
      this.removeChip(t);
    }), r;
  }
  removeChip(e) {
    this.criteria.splice(e, 1), this.renderCriteria(), this.renderChips(), this.pushCriteriaToURL(), this.config.onSearch(this.criteria);
  }
  clearAllChips() {
    this.criteria = [], this.renderCriteria(), this.renderChips(), this.pushCriteriaToURL(), this.config.onClear && this.config.onClear();
  }
}, wn = {
  text: [
    {
      label: "contains",
      value: "ilike"
    },
    {
      label: "is",
      value: "eq"
    },
    {
      label: "is not",
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
      label: "greater than or equal",
      value: "gte"
    },
    {
      label: "less than or equal",
      value: "lte"
    }
  ],
  date: [
    {
      label: "is",
      value: "eq"
    },
    {
      label: "before",
      value: "lt"
    },
    {
      label: "after",
      value: "gt"
    }
  ],
  select: [{
    label: "is",
    value: "eq"
  }, {
    label: "is not",
    value: "ne"
  }]
}, Pu = class {
  constructor(e) {
    this.panel = null, this.container = null, this.previewElement = null, this.sqlPreviewElement = null, this.overlay = null, this.toggleButton = null, this.config = e, this.notifier = e.notifier || new He(), this.structure = {
      groups: [],
      groupLogic: []
    }, this.init();
  }
  init() {
    if (this.panel = document.getElementById("filter-panel"), this.overlay = document.getElementById("filter-overlay"), this.previewElement = document.getElementById("filter-preview-text"), !this.panel) {
      console.error("[FilterBuilder] Panel element not found");
      return;
    }
    this.buildPanelStructure(), this.toggleButton = document.getElementById("filter-toggle-btn"), this.toggleButton && this.toggleButton.addEventListener("click", () => this.toggle());
    const e = document.getElementById("clear-filters-btn");
    e && e.addEventListener("click", () => this.clearFilters()), this.overlay && this.overlay.addEventListener("click", () => this.close(!0)), document.addEventListener("keydown", (t) => {
      t.key === "Escape" && !this.panel.classList.contains("hidden") && this.close(!0);
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
    `, r.appendChild(n), e.conditions.forEach((i, o) => {
      const a = this.createConditionElement(i, t, o);
      if (r.appendChild(a), o < e.conditions.length - 1) {
        const l = this.createConditionConnector(t, o, e.logic);
        r.appendChild(l);
      }
    });
    const s = document.createElement("button");
    return s.type = "button", s.className = "mt-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800", s.dataset.addCondition = String(t), s.innerHTML = `
      <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 5v14"/><path d="M5 12h14"/>
      </svg>
      ${e.logic.toUpperCase()}
    `, r.appendChild(s), this.bindGroupEvents(r, t), r;
  }
  createConditionElement(e, t, r) {
    const n = document.createElement("div");
    n.className = "flex items-center gap-2 mb-2";
    const s = this.config.fields.find((i) => i.name === e.field) || this.config.fields[0];
    return n.innerHTML = `
      <div class="flex items-center text-gray-400 cursor-move" title="Drag to reorder">
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/>
          <circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/>
        </svg>
      </div>

      <select data-cond="${t}-${r}-field" class="py-1.5 px-2 text-sm border-gray-200 rounded-lg bg-white w-32">
        ${this.config.fields.map((i) => `
          <option value="${i.name}" ${i.name === e.field ? "selected" : ""}>${i.label}</option>
        `).join("")}
      </select>

      <select data-cond="${t}-${r}-operator" class="py-1.5 px-2 text-sm border-gray-200 rounded-lg bg-white w-36">
        ${this.getOperatorsForField(s).map((i) => `
          <option value="${i.value}" ${i.value === e.operator ? "selected" : ""}>${i.label}</option>
        `).join("")}
      </select>

      ${this.renderValueInput(s, e, t, r)}

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
      n.addEventListener("click", (s) => {
        const i = s.target, o = parseInt(i.dataset.groupLogic || "0", 10), a = i.dataset.logicValue;
        this.structure.groupLogic[o] = a, this.render();
      });
    }), t;
  }
  bindGroupEvents(e, t) {
    const r = e.querySelector(`[data-remove-group="${t}"]`);
    r && r.addEventListener("click", () => this.removeGroup(t));
    const n = e.querySelector(`[data-add-condition="${t}"]`);
    n && n.addEventListener("click", () => this.addCondition(t)), e.querySelectorAll("[data-cond]").forEach((s) => {
      const i = s, [o, a, l] = i.dataset.cond.split("-"), c = parseInt(o, 10), d = parseInt(a, 10);
      i.addEventListener("change", () => {
        l === "field" ? (this.structure.groups[c].conditions[d].field = i.value, this.render()) : l === "operator" ? (this.structure.groups[c].conditions[d].operator = i.value, this.updatePreview()) : l === "value" && (this.structure.groups[c].conditions[d].value = i.value, this.updatePreview());
      });
    }), e.querySelectorAll("[data-remove-cond]").forEach((s) => {
      s.addEventListener("click", (i) => {
        const o = i.target.closest("[data-remove-cond]");
        if (!o) return;
        const [a, l] = o.dataset.removeCond.split("-").map(Number);
        this.removeCondition(a, l);
      });
    }), e.querySelectorAll("[data-add-cond-or], [data-add-cond-and]").forEach((s) => {
      s.addEventListener("click", (i) => {
        const o = i.target, a = o.dataset.addCondOr !== void 0, l = a ? o.dataset.addCondOr : o.dataset.addCondAnd;
        if (!l) return;
        const [c] = l.split("-").map(Number);
        this.structure.groups[c].logic = a ? "or" : "and", this.addCondition(c);
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
    return e.operators && e.operators.length > 0 ? e.operators.map((t) => ({
      label: t,
      value: t
    })) : wn[e.type] || wn.text;
  }
  updatePreview() {
    const e = this.generateSQLPreview(), t = this.generateTextPreview();
    this.sqlPreviewElement && (this.sqlPreviewElement.textContent = e || "No filters applied"), this.previewElement && (this.previewElement.textContent = t);
    const r = document.getElementById("applied-filter-preview");
    r && (this.hasActiveFilters() ? r.classList.remove("hidden") : r.classList.add("hidden"));
  }
  hasActiveFilters() {
    return this.structure.groups.some((e) => e.conditions.some((t) => t.value !== "" && t.value !== null && t.value !== void 0));
  }
  generateSQLPreview() {
    const e = this.structure.groups.map((t) => {
      const r = t.conditions.filter((n) => n.value !== "" && n.value !== null).map((n) => {
        const s = n.operator.toUpperCase(), i = typeof n.value == "string" ? `'${n.value}'` : n.value;
        return `${n.field} ${s === "ILIKE" ? "ILIKE" : s === "EQ" ? "=" : s} ${i}`;
      });
      return r.length === 0 ? "" : r.length === 1 ? r[0] : `( ${r.join(` ${t.logic.toUpperCase()} `)} )`;
    }).filter((t) => t !== "");
    return e.length === 0 ? "" : e.length === 1 ? e[0] : e.reduce((t, r, n) => n === 0 ? r : `${t} ${(this.structure.groupLogic[n - 1] || "and").toUpperCase()} ${r}`, "");
  }
  generateTextPreview() {
    const e = this.structure.groups.map((t) => {
      const r = t.conditions.filter((n) => n.value !== "" && n.value !== null).map((n) => {
        const s = this.config.fields.find((i) => i.name === n.field);
        return `${s?.label || n.field} ${this.getOperatorsForField(s).find((i) => i.value === n.operator)?.label || n.operator} "${n.value}"`;
      });
      return r.length === 0 ? "" : r.length === 1 ? r[0] : `( ${r.join(` ${t.logic.toUpperCase()} `)} )`;
    }).filter((t) => t !== "");
    return e.length === 0 ? "" : e.length === 1 ? e[0] : e.reduce((t, r, n) => n === 0 ? r : `${t} ${(this.structure.groupLogic[n - 1] || "and").toUpperCase()} ${r}`, "");
  }
  applyFilters() {
    this.config.onApply(this.structure), this.close(!0);
  }
  clearAll() {
    this.structure = {
      groups: [],
      groupLogic: []
    }, this.addGroup(), this.updatePreview();
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
    this.panel?.classList.contains("hidden") ? this.open() : this.close(!0);
  }
  open() {
    if (!this.panel || !this.toggleButton) return;
    const e = 8, t = window.visualViewport, r = t?.offsetLeft ?? 0, n = t?.offsetTop ?? 0, s = t?.width ?? window.innerWidth, i = t?.height ?? window.innerHeight, o = r + s, a = n + i, l = this.toggleButton.getBoundingClientRect();
    this.panel.classList.remove("hidden"), this.panel.style.visibility = "hidden";
    const c = this.panel.getBoundingClientRect(), d = Math.max(0, s - 16), u = Math.min(c.width || 800, d), h = c.height || this.panel.scrollHeight, p = Math.min(Math.max(l.left, r + e), Math.max(r + e, o - e - u)), m = l.bottom + e, g = a - e - m, y = l.top - e - n, v = h > g && y > g ? Math.max(n + e, l.top - e - Math.min(h, y)) : Math.max(n + e, m);
    this.panel.style.left = `${p}px`, this.panel.style.top = `${v}px`, this.panel.style.maxWidth = `${d}px`, this.panel.style.maxHeight = `${Math.max(0, a - e - v)}px`, this.panel.style.visibility = "", this.toggleButton.setAttribute("aria-expanded", "true"), this.overlay?.classList.remove("hidden"), this.panel.querySelector('button, input, select, textarea, [tabindex]:not([tabindex="-1"])')?.focus();
  }
  close(e = !1) {
    this.panel?.classList.add("hidden"), this.overlay?.classList.add("hidden"), this.toggleButton?.setAttribute("aria-expanded", "false"), e && this.toggleButton?.focus();
  }
  restoreFromURL() {
    const e = new URLSearchParams(window.location.search).get("filters");
    if (e) try {
      const t = JSON.parse(e);
      Array.isArray(t) && t.length > 0 && (this.structure = this.convertLegacyFilters(t), this.render());
    } catch (t) {
      console.warn("[FilterBuilder] Failed to parse filters from URL:", t);
    }
  }
  convertLegacyFilters(e) {
    const t = /* @__PURE__ */ new Map();
    e.forEach((n) => {
      const s = n.column;
      t.has(s) || t.set(s, []), t.get(s).push(n);
    });
    const r = [];
    return t.forEach((n) => {
      r.push({
        conditions: n.map((s) => ({
          field: s.column,
          operator: s.operator || "ilike",
          value: s.value
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
}, Bu = class {
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
}, Ou = class {
  buildFilters(e) {
    const t = {}, r = /* @__PURE__ */ new Map();
    return e.forEach((n) => {
      if (n.value === null || n.value === void 0 || n.value === "") return;
      const s = n.operator || "eq", i = n.column;
      r.has(i) || r.set(i, {
        operator: s,
        values: []
      }), r.get(i).values.push(n.value);
    }), r.forEach((n, s) => {
      if (n.values.length === 1) {
        const i = n.operator === "eq" ? s : `${s}__${n.operator}`;
        t[i] = n.values[0];
      } else n.operator === "ilike" ? t[`${s}__ilike`] = n.values.join(",") : n.operator === "eq" ? t[`${s}__in`] = n.values.join(",") : t[`${s}__${n.operator}`] = n.values.join(",");
    }), t;
  }
  async onFilterChange(e, t, r) {
    r.resetPagination(), await r.refresh();
  }
}, Fu = class {
  buildQuery(e, t) {
    return {
      limit: t,
      offset: (e - 1) * t
    };
  }
  async onPageChange(e, t) {
    await t.refresh();
  }
}, qu = class {
  buildQuery(e) {
    return !e || e.length === 0 ? {} : { order: e.map((t) => `${t.field} ${t.direction}`).join(",") };
  }
  async onSort(e, t, r) {
    await r.refresh();
  }
}, Nu = class {
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
    const r = tc(t, this.config, e);
    r.delivery = rc(this.config, e);
    let n;
    try {
      n = await j(this.getEndpoint(), {
        method: "POST",
        json: r,
        headers: { Accept: "application/json,application/octet-stream" }
      });
    } catch (s) {
      throw ke(t, "error", s instanceof Error ? s.message : "Network error during export"), s;
    }
    if (n.status === 202) {
      const s = await Is(n);
      ke(t, "info", "Export queued. You can download it when ready.");
      const i = s?.status_url || "";
      if (i) {
        const o = ic(s, i);
        try {
          await oc(i, {
            intervalMs: nc(this.config),
            timeoutMs: sc(this.config)
          });
          const a = await j(o, {
            method: "GET",
            headers: { Accept: "application/octet-stream" }
          });
          if (!a.ok) {
            const l = await kr(a);
            throw ke(t, "error", l), new Error(l);
          }
          await Sn(a, r.definition || r.resource || "export", r.format), ke(t, "success", "Export ready.");
          return;
        } catch (a) {
          throw ke(t, "error", a instanceof Error ? a.message : "Export failed"), a;
        }
      }
      if (s?.download_url) {
        window.open(s.download_url, "_blank");
        return;
      }
      return;
    }
    if (!n.ok) {
      const s = await kr(n);
      throw ke(t, "error", s), new Error(s);
    }
    await Sn(n, r.definition || r.resource || "export", r.format), ke(t, "success", "Export ready.");
  }
};
function tc(e, t, r) {
  const n = pc(r), s = lc(e, t), i = cc(e, t), o = {
    format: n,
    query: uc(dc(e)),
    selection: s,
    columns: i,
    delivery: t.delivery || "auto"
  };
  t.definition && (o.definition = t.definition), t.resource && (o.resource = t.resource);
  const a = t.sourceVariant || t.variant;
  return a && (o.source_variant = a), o;
}
function rc(e, t) {
  return e.delivery ? e.delivery : (e.asyncFormats && e.asyncFormats.length > 0 ? e.asyncFormats : ["pdf"]).includes(t) ? "async" : "auto";
}
function nc(e) {
  const t = Number(e.statusPollIntervalMs);
  return Number.isFinite(t) && t > 0 ? t : 2e3;
}
function sc(e) {
  const t = Number(e.statusPollTimeoutMs);
  return Number.isFinite(t) && t >= 0 ? t : 3e5;
}
function ic(e, t) {
  return e?.download_url ? e.download_url : `${t.replace(/\/+$/, "")}/download`;
}
async function Is(e) {
  return await Qs(e);
}
async function oc(e, t) {
  const r = Date.now(), n = Math.max(250, t.intervalMs);
  for (; ; ) {
    const s = await j(e, {
      method: "GET",
      headers: { Accept: "application/json" }
    });
    if (!s.ok) {
      const a = await kr(s);
      throw new Error(a);
    }
    const i = await Is(s), o = String(i?.state || "").toLowerCase();
    if (o === "completed") return i;
    if (o === "failed") throw new Error("Export failed");
    if (o === "canceled") throw new Error("Export canceled");
    if (o === "deleted") throw new Error("Export deleted");
    if (t.timeoutMs > 0 && Date.now() - r > t.timeoutMs) throw new Error("Export status timed out");
    await ac(n);
  }
}
function ac(e) {
  return new Promise((t) => setTimeout(t, e));
}
function lc(e, t) {
  if (t.selection?.mode) return t.selection;
  const r = Array.from(e.state.selectedRows || []), n = r.length > 0 ? "ids" : "all";
  return {
    mode: n,
    ids: n === "ids" ? r : []
  };
}
function cc(e, t) {
  if (Array.isArray(t.columns) && t.columns.length > 0) return t.columns.slice();
  const r = e.state?.hiddenColumns ? new Set(e.state.hiddenColumns) : /* @__PURE__ */ new Set();
  return (Array.isArray(e.state?.columnOrder) && e.state.columnOrder.length > 0 ? e.state.columnOrder : e.config.columns.map((n) => n.field)).filter((n) => !r.has(n));
}
function dc(e) {
  const t = {}, r = e.config.behaviors || {};
  return r.pagination && Object.assign(t, r.pagination.buildQuery(e.state.currentPage, e.state.perPage)), e.state.search && r.search && Object.assign(t, r.search.buildQuery(e.state.search)), e.state.filters.length > 0 && r.filter && Object.assign(t, r.filter.buildFilters(e.state.filters)), e.state.sort.length > 0 && r.sort && Object.assign(t, r.sort.buildQuery(e.state.sort)), t;
}
function uc(e) {
  const t = {}, r = [];
  return Object.entries(e).forEach(([n, s]) => {
    if (s == null || s === "") return;
    switch (n) {
      case "limit":
        t.limit = xn(s);
        return;
      case "offset":
        t.offset = xn(s);
        return;
      case "order":
      case "sort":
        t.sort = hc(String(s));
        return;
      case "q":
      case "search":
        t.search = String(s);
        return;
    }
    const { field: i, op: o } = fc(n);
    i && r.push({
      field: i,
      op: o,
      value: s
    });
  }), r.length > 0 && (t.filters = r), t;
}
function fc(e) {
  const t = e.split("__");
  return {
    field: t[0]?.trim() || "",
    op: t[1]?.trim() || "eq"
  };
}
function hc(e) {
  return e ? e.split(",").map((t) => t.trim()).filter(Boolean).map((t) => {
    const r = t.split(/\s+/);
    return {
      field: r[0] || "",
      desc: (r[1] || "asc").toLowerCase() === "desc"
    };
  }).filter((t) => t.field) : [];
}
function pc(e) {
  const t = String(e || "").trim().toLowerCase();
  return t === "excel" || t === "xls" ? "xlsx" : t || "csv";
}
function xn(e) {
  const t = Number(e);
  return Number.isFinite(t) ? t : 0;
}
async function Sn(e, t, r) {
  const n = await e.blob(), s = mc(e, t, r), i = URL.createObjectURL(n), o = document.createElement("a");
  o.href = i, o.download = s, o.rel = "noopener", document.body.appendChild(o), o.click(), o.remove(), URL.revokeObjectURL(i);
}
function mc(e, t, r) {
  const n = e.headers.get("content-disposition") || "", s = `${t}.${r}`;
  return gc(n) || s;
}
function gc(e) {
  if (!e) return null;
  const t = e.match(/filename\*=(?:UTF-8'')?([^;]+)/i);
  if (t && t[1]) return decodeURIComponent(t[1].replace(/"/g, "").trim());
  const r = e.match(/filename="?([^";]+)"?/i);
  return r && r[1] ? r[1].trim() : null;
}
async function kr(e) {
  return Tr(e, `Export failed (${e.status})`, { appendStatusToFallback: !1 });
}
function ke(e, t, r) {
  const n = e.config.notifier;
  if (n && typeof n[t] == "function") {
    n[t](r);
    return;
  }
  const s = window.toastManager;
  if (s && typeof s[t] == "function") {
    s[t](r);
    return;
  }
  t === "error" && alert(r);
}
var ju = class {
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
    const n = this.getActionEndpoint(e), s = await j(n, {
      method: "POST",
      json: { ids: t },
      accept: "application/json"
    });
    if (!s.ok) {
      const i = await Tr(s, `Bulk action '${e}' failed`);
      throw new Error(`Bulk action '${e}' failed: ${i}`);
    }
    await r.refresh();
  }
}, bc = 1500;
function yc(e) {
  return typeof e == "object" && e !== null && "name" in e && e.name === "AbortError";
}
function Ps(e) {
  return typeof e == "object" && e !== null && "version" in e && e.version === 2;
}
var vc = class {
  constructor(e, t = "datatable_columns") {
    this.cachedOrder = null, this.storageKey = t;
  }
  getVisibleColumns(e) {
    return e.config.columns.filter((t) => !e.state.hiddenColumns.has(t.field)).map((t) => t.field);
  }
  toggleColumn(e, t) {
    const r = !t.state.hiddenColumns.has(e), n = t.config.columns.filter((o) => o.field === e ? !r : !t.state.hiddenColumns.has(o.field)).map((o) => o.field), s = {};
    t.config.columns.forEach((o) => {
      s[o.field] = n.includes(o.field);
    });
    const i = this.cachedOrder || t.state.columnOrder;
    this.savePrefs({
      version: 2,
      visibility: s,
      order: i.length > 0 ? i : void 0
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
    }), console.log("[ColumnVisibility] Order saved:", e);
  }
  loadColumnOrderFromCache(e) {
    try {
      const t = this.loadPrefs();
      if (!t || !t.order) return [];
      const r = new Set(e), n = t.order.filter((s) => r.has(s));
      return this.cachedOrder = n, console.log("[ColumnVisibility] Order loaded from cache:", n), n;
    } catch (t) {
      return console.warn("Failed to load column order from cache:", t), [];
    }
  }
  loadHiddenColumnsFromCache(e) {
    try {
      const t = this.loadPrefs();
      if (!t) return /* @__PURE__ */ new Set();
      const r = new Set(e), n = /* @__PURE__ */ new Set();
      return Object.entries(t.visibility).forEach(([s, i]) => {
        !i && r.has(s) && n.add(s);
      }), n;
    } catch (t) {
      return console.warn("Failed to load column visibility state:", t), /* @__PURE__ */ new Set();
    }
  }
  loadPrefs() {
    try {
      const e = localStorage.getItem(this.storageKey);
      if (!e) return null;
      const t = JSON.parse(e);
      if (Ps(t)) return t;
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
}, zu = class extends vc {
  constructor(e, t) {
    const r = t.localStorageKey || `${t.resource}_datatable_columns`;
    if (super(e, r), this.syncTimeout = null, this.serverPrefs = null, this.mutationQueue = Promise.resolve(), this.resource = t.resource, this.preferencesEndpoint = String(t.preferencesEndpoint || "").trim().replace(/\/+$/, ""), !this.preferencesEndpoint) throw new Error("ServerColumnVisibilityBehavior requires an advertised preferences endpoint");
    this.syncDebounce = t.syncDebounce ?? 1e3, this.loadTimeoutMs = Math.max(100, t.loadTimeoutMs || bc), this.canWrite = t.canWrite !== !1;
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
      const r = await j(this.preferencesEndpoint, {
        method: "GET",
        credentials: "same-origin",
        signal: e?.signal,
        headers: { Accept: "application/json" }
      });
      if (!r.ok)
        return console.warn("[ServerColumnVisibility] Failed to load server prefs:", r.status), null;
      const n = (await r.json()).records || [];
      if (n.length === 0)
        return console.log("[ServerColumnVisibility] No server preferences found"), null;
      const s = n[0]?.raw;
      if (!s || !s[this.serverPrefsKey])
        return console.log("[ServerColumnVisibility] No column preferences in server response"), null;
      const i = s[this.serverPrefsKey];
      return Ps(i) ? (this.serverPrefs = i, this.savePrefs(i), console.log("[ServerColumnVisibility] Loaded prefs from server:", i), i) : (console.warn("[ServerColumnVisibility] Server prefs not in V2 format:", i), null);
    } catch (r) {
      return yc(r) || console.warn("[ServerColumnVisibility] Error loading server prefs:", r), null;
    } finally {
      clearTimeout(t);
    }
  }
  getInitialPrefs(e) {
    const t = this.serverPrefs;
    if (t) {
      const r = /* @__PURE__ */ new Set();
      Object.entries(t.visibility).forEach(([s, i]) => {
        i || r.add(s);
      });
      const n = new Set(e);
      return {
        hiddenColumns: r,
        columnOrder: (t.order || []).filter((s) => n.has(s))
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
      const n = await j(this.preferencesEndpoint, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        json: { raw: { [this.serverPrefsKey]: r } }
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
  clearSavedPrefs() {
    this.cancelScheduledServerSync(), super.clearSavedPrefs(), this.serverPrefs = null, this.canWrite && this.enqueueServerMutation(() => this.clearServerPrefs());
  }
  async clearServerPrefs() {
    try {
      const e = await j(this.preferencesEndpoint, {
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
function wc(e) {
  const t = e.trim(), r = t.indexOf("?");
  return r === -1 ? {
    path: t,
    query: ""
  } : {
    path: t.slice(0, r),
    query: t.slice(r + 1)
  };
}
function $e(e, t, r = "", n = "") {
  const { path: s, query: i } = wc(e), o = s.replace(/\/+$/, ""), a = r.replace(/^\/+/, "");
  let l = `${o}/${encodeURIComponent(t)}`;
  a && (l += `/${a}`);
  const c = [];
  return i && c.push(i), n && c.push(n), c.length > 0 ? `${l}?${c.join("&")}` : l;
}
var Cn = {
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
}, xc = 5e3, Bs = class {
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
    let n = 0;
    const s = this.buildQueryContext();
    if (Array.isArray(t) && t.length > 0) {
      for (const i of t) {
        if (!i.name) continue;
        const o = this.resolveRecordActionState(e, i.name);
        if (!this.shouldIncludeAction(e, i, o)) continue;
        const a = i.name.toLowerCase();
        if (this.seenActions.has(a)) continue;
        this.seenActions.add(a);
        const l = this.normalizeContextBoundActionState(e, i, o), c = this.buildActionFromSchema(e, i, s, l);
        c && r.push({
          action: c,
          name: i.name,
          order: this.resolveActionOrder(i.name, i.order),
          insertionIndex: n++
        });
      }
      this.config.appendDefaultActions && this.appendDefaultActionsOrdered(r, e, s, n);
    } else this.config.useDefaultFallback && this.appendDefaultActionsOrdered(r, e, s, n);
    return r.sort((i, o) => i.order !== o.order ? i.order - o.order : i.insertionIndex - o.insertionIndex), r.map((i) => i.action);
  }
  resolveActionOrder(e, t) {
    if (typeof t == "number" && Number.isFinite(t)) return t;
    const r = e.toLowerCase();
    return this.config.actionOrderOverride?.[r] !== void 0 ? this.config.actionOrderOverride[r] : Cn[r] !== void 0 ? Cn[r] : xc;
  }
  buildActionFromSchema(e, t, r, n) {
    const s = t.name, i = t.label || t.label_key || s, o = t.variant || "secondary", a = t.icon, l = this.isNavigationAction(t), c = s === "delete";
    return l ? this.applyActionState(this.buildNavigationAction(e, t, i, o, a, r), n) : c ? this.applyActionState(this.buildDeleteAction(e, i, o, a), n) : this.applyActionState(this.buildPostAction(e, t, i, o, a), n);
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
    return Nn(e, t);
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
    const t = typeof e.label == "string" ? e.label.trim() : "", r = typeof e.href == "string" ? e.href.trim() : "", n = typeof e.kind == "string" ? e.kind.trim() : "";
    return !t && !r && !n ? null : {
      ...t ? { label: t } : {},
      ...r ? { href: r } : {},
      ...n ? { kind: n } : {}
    };
  }
  disabledReason(e) {
    const t = typeof e.reason == "string" ? e.reason.trim() : "";
    if (t) return t;
    const r = typeof e.reason_code == "string" ? e.reason_code.trim() : "";
    if (r) {
      const n = Hn({ reason_code: r });
      if (n?.message) return n.message;
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
    const n = [];
    for (const s of r) {
      const i = typeof s == "string" ? s.trim() : "";
      if (!i) continue;
      const o = this.resolveRecordContextValue(e, i);
      this.isEmptyPayloadValue(o) && n.push(i);
    }
    return n;
  }
  normalizeContextBoundActionState(e, t, r) {
    const n = this.missingRequiredContext(e, t);
    return n.length === 0 || r && r.enabled === !1 ? r : {
      enabled: !1,
      reason: "record does not include required context for this action",
      reason_code: "missing_context_required",
      metadata: {
        missing_context_fields: n,
        required_context_fields: Array.isArray(t.context_required) ? [...t.context_required] : []
      }
    };
  }
  resolveRecordContextValue(e, t) {
    const r = t.trim();
    if (!r) return;
    if (!r.includes(".")) return e[r];
    const n = r.split(".").map((i) => i.trim()).filter(Boolean);
    if (n.length === 0) return;
    let s = e;
    for (const i of n) {
      if (!s || typeof s != "object" || Array.isArray(s)) return;
      s = s[i];
    }
    return s;
  }
  buildNavigationAction(e, t, r, n, s, i) {
    const o = String(e.id || ""), a = this.config.actionBasePath;
    let l;
    if (t.href) {
      const c = this.interpolateHrefTemplate(t.href, e, o);
      i ? l = c.includes("?") ? `${c}&${i}` : `${c}?${i}` : l = c;
    } else t.name === "edit" ? l = $e(a, o, "edit", i) : l = $e(a, o, "", i);
    return {
      id: t.name,
      label: r,
      icon: s || this.getDefaultIcon(t.name),
      variant: n,
      action: () => {
        window.location.href = l;
      }
    };
  }
  interpolateHrefTemplate(e, t, r) {
    const n = e.trim();
    return n && n.replace(/\{([^}]+)\}/g, (s, i) => {
      const o = String(i || "").trim();
      if (!o) return "";
      if (o === "id") return r;
      const a = this.resolveRecordContextValue(t, o);
      return a == null ? "" : String(a);
    });
  }
  buildDeleteAction(e, t, r, n) {
    const s = String(e.id || ""), i = this.config.apiEndpoint;
    return {
      id: "delete",
      label: t,
      icon: n || "trash",
      variant: r === "secondary" ? "danger" : r,
      action: async () => {
        await hs({
          endpoint: `${i}/${s}`,
          fallbackMessage: "Delete failed",
          onSuccess: async (o) => {
            this.config.onActionSuccess?.("delete", {
              success: !0,
              data: o.data
            });
          },
          onError: async (o) => {
            this.config.onActionError?.("delete", o);
          },
          reconcileOnDomainFailure: async (o) => {
            o.textCode && this.config.reconcileOnDomainFailure && await this.config.reconcileOnDomainFailure("delete", o);
          }
        });
      }
    };
  }
  buildPostAction(e, t, r, n, s) {
    const i = String(e.id || ""), o = t.name, a = `${this.config.apiEndpoint}/actions/${o}`;
    return {
      id: o,
      label: r,
      icon: s || this.getDefaultIcon(o),
      variant: n,
      action: async () => {
        if (t.confirm && !window.confirm(t.confirm))
          return;
        const l = await this.buildActionPayload(e, t);
        l !== null && await this.executePostAction({
          actionName: o,
          endpoint: a,
          payload: l,
          recordId: i
        });
      }
    };
  }
  async executePostAction(e) {
    const t = await Dr(e.endpoint, e.payload);
    if (t.success)
      return e.actionName.toLowerCase() === "create_translation" && t.data ? (this.handleCreateTranslationSuccess(t.data, e.payload), t) : (this.handleActionRedirectSuccess(t.data) || this.config.onActionSuccess?.(e.actionName, t), t);
    if (t.error && ti(t.error)) {
      const r = ei(t.error);
      if (r && this.config.onTranslationBlocker) {
        const n = { ...e.payload }, s = this.getContentChannel() || r.channel || null;
        return this.config.onTranslationBlocker({
          actionName: e.actionName,
          recordId: e.recordId,
          ...r,
          channel: s,
          retry: async () => this.executePostAction({
            actionName: e.actionName,
            endpoint: e.endpoint,
            payload: { ...n },
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
    const n = e.redirect_to_edit === !0 || e.mode === "redirect", s = this.buildQueryContext(), i = $e(this.config.actionBasePath, r, n ? "edit" : "", s);
    return window.location.href = i, !0;
  }
  async handleStructuredActionFailure(e, t, r) {
    if (!t.error) return t;
    const n = this.buildActionErrorMessage(e, t.error), s = {
      ...t.error,
      message: n
    };
    throw s.textCode && this.config.reconcileOnDomainFailure && await this.config.reconcileOnDomainFailure(e, s), this.config.onActionError?.(e, s), $t(s, r, !!this.config.onActionError);
  }
  handleCreateTranslationSuccess(e, t) {
    const r = typeof e.id == "string" ? e.id : String(e.id || ""), n = typeof e.locale == "string" ? e.locale : "";
    if (!r) {
      console.warn("[SchemaActionBuilder] create_translation response missing id");
      return;
    }
    const s = this.config.actionBasePath, i = new URLSearchParams();
    n && i.set("locale", n);
    const o = this.getContentChannel();
    o && i.set("channel", o);
    const a = i.toString(), l = `${s}/${r}/edit${a ? `?${a}` : ""}`, c = typeof t.source_locale == "string" ? t.source_locale : this.config.locale || "source", d = this.localeLabel(n || "unknown");
    typeof window < "u" && "toastManager" in window ? window.toastManager.success(`${d} translation created`, { action: {
      label: `View ${c.toUpperCase()}`,
      handler: () => {
        const u = new URLSearchParams();
        u.set("locale", c), o && u.set("channel", o);
        const h = typeof t.id == "string" ? t.id : String(t.id || r);
        window.location.href = `${s}/${h}/edit?${u.toString()}`;
      }
    } }) : console.log(`[SchemaActionBuilder] Translation created: ${n}`), window.location.href = l;
  }
  async buildActionPayload(e, t) {
    const r = t.name.trim().toLowerCase(), n = { id: e.id };
    this.config.locale && r !== "create_translation" && (n.locale = this.config.locale);
    const s = this.getContentChannel();
    if (s && (n.channel = s), this.config.panelName && (n.policy_entity = this.config.panelName), n.expected_version === void 0) {
      const c = this.resolveExpectedVersion(e);
      c !== null && (n.expected_version = c);
    }
    const i = this.normalizePayloadSchema(t.payload_schema), o = this.collectRequiredFields(t.payload_required, i);
    if (r === "create_translation" && this.applySchemaTranslationContext(n, e, i), i?.properties)
      for (const [c, d] of Object.entries(i.properties)) n[c] === void 0 && d.default !== void 0 && (n[c] = d.default);
    o.includes("idempotency_key") && this.isEmptyPayloadValue(n.idempotency_key) && (n.idempotency_key = this.generateIdempotencyKey(t.name, String(e.id || "")));
    const a = o.filter((c) => this.isEmptyPayloadValue(n[c]));
    if (a.length === 0) return n;
    const l = await this.promptForPayload(t, a, i, n, e);
    if (l === null) return null;
    for (const c of a) {
      const d = i?.properties?.[c], u = l[c] ?? "", h = this.coercePromptValue(u, c, d);
      if (h.error) throw new Error(h.error);
      n[c] = h.value;
    }
    return n;
  }
  async promptForPayload(e, t, r, n, s) {
    if (t.length === 0) return {};
    const i = t.map((o) => {
      const a = r?.properties?.[o];
      return {
        name: o,
        label: a?.title || o,
        description: a?.description,
        value: this.stringifyDefault(n[o] ?? a?.default),
        type: a?.type || "string",
        options: this.buildFieldOptions(o, e.name, a, s, n)
      };
    });
    return await Bn.prompt({
      title: `Complete ${e.label || e.name}`,
      fields: i
    });
  }
  buildFieldOptions(e, t, r, n, s) {
    const i = this.deriveCreateTranslationLocaleOptions(e, t, n, r, s);
    if (i && i.length > 0) return i;
    if (!r) return;
    if (r.oneOf) return r.oneOf.filter((a) => a && "const" in a).map((a) => ({
      value: this.stringifyDefault(a.const),
      label: a.title || this.stringifyDefault(a.const)
    }));
    if (r.enum) return r.enum.map((a) => ({
      value: this.stringifyDefault(a),
      label: this.stringifyDefault(a)
    }));
    const o = this.buildExtensionFieldOptions(r);
    if (o && o.length > 0) return o;
  }
  buildExtensionFieldOptions(e) {
    const t = e, r = t["x-options"] ?? t.x_options ?? t.xOptions;
    if (!Array.isArray(r) || r.length === 0) return;
    const n = [];
    for (const s of r) {
      if (typeof s == "string") {
        const c = this.stringifyDefault(s);
        if (!c) continue;
        n.push({
          value: c,
          label: c
        });
        continue;
      }
      if (!s || typeof s != "object") continue;
      const i = s.value, o = this.stringifyDefault(i);
      if (!o) continue;
      const a = s.label, l = this.stringifyDefault(a) || o;
      n.push({
        value: o,
        label: l
      });
    }
    return n.length > 0 ? n : void 0;
  }
  deriveCreateTranslationLocaleOptions(e, t, r, n, s) {
    if (e.trim().toLowerCase() !== "locale" || t.trim().toLowerCase() !== "create_translation" || !r || typeof r != "object") return;
    const i = this.asObject(r.translation_readiness), o = s && typeof s == "object" ? s : {};
    let a = this.asStringArray(o.missing_locales);
    if (a.length === 0 && (a = this.asStringArray(i?.missing_required_locales)), a.length === 0 && (a = this.asStringArray(r.missing_locales)), a.length === 0 && i) {
      const g = this.asStringArray(i.required_locales), y = new Set(this.asStringArray(i.available_locales));
      a = g.filter((v) => !y.has(v));
    }
    const l = this.asStringArray(n?.enum);
    if (l.length > 0) {
      const g = new Set(l);
      a = a.filter((y) => g.has(y));
    }
    if (a.length === 0) return;
    const c = this.extractStringField(o, "recommended_locale") || this.extractStringField(r, "recommended_locale") || this.extractStringField(i || {}, "recommended_locale"), d = this.asStringArray(o.required_for_publish ?? r.required_for_publish ?? i?.required_for_publish ?? i?.required_locales), u = this.asStringArray(o.existing_locales ?? r.existing_locales ?? i?.available_locales), h = this.createTranslationLocaleLabelMap(n), p = /* @__PURE__ */ new Set(), m = [];
    for (const g of a) {
      const y = g.trim().toLowerCase();
      if (!y || p.has(y)) continue;
      p.add(y);
      const v = c?.toLowerCase() === y, A = d.includes(y), C = [];
      A && C.push("Required for publishing"), u.length > 0 && C.push(`${u.length} translation${u.length > 1 ? "s" : ""} exist`);
      const L = C.length > 0 ? C.join(" • ") : void 0, B = h[y] || this.localeLabel(y);
      let O = `${y.toUpperCase()} - ${B}`;
      v && (O += " (recommended)"), m.push({
        value: y,
        label: O,
        description: L,
        recommended: v
      });
    }
    return m.sort((g, y) => g.recommended && !y.recommended ? -1 : !g.recommended && y.recommended ? 1 : g.value.localeCompare(y.value)), m.length > 0 ? m : void 0;
  }
  applySchemaTranslationContext(e, t, r) {
    if (!r) return;
    const n = this.extractTranslationContextMap(r);
    if (Object.keys(n).length !== 0)
      for (const [s, i] of Object.entries(n)) {
        const o = s.trim(), a = i.trim();
        if (!o || !a || !this.isEmptyPayloadValue(e[o])) continue;
        const l = this.resolveRecordContextValue(t, a);
        l != null && (e[o] = this.clonePayloadValue(l));
      }
  }
  extractTranslationContextMap(e) {
    const t = e["x-translation-context"] ?? e.x_translation_context;
    if (!t || typeof t != "object" || Array.isArray(t)) return {};
    const r = {};
    for (const [n, s] of Object.entries(t)) {
      const i = n.trim(), o = typeof s == "string" ? s.trim() : "";
      !i || !o || (r[i] = o);
    }
    return r;
  }
  clonePayloadValue(e) {
    return Array.isArray(e) ? e.map((t) => this.clonePayloadValue(t)) : e && typeof e == "object" ? { ...e } : e;
  }
  createTranslationLocaleLabelMap(e) {
    const t = {};
    if (!e) return t;
    if (Array.isArray(e.oneOf)) for (const s of e.oneOf) {
      const i = this.stringifyDefault(s?.const).trim().toLowerCase();
      if (!i) continue;
      const o = this.stringifyDefault(s?.title).trim();
      o && (t[i] = o);
    }
    const r = e, n = r["x-options"] ?? r.x_options ?? r.xOptions;
    if (Array.isArray(n)) for (const s of n) {
      if (!s || typeof s != "object") continue;
      const i = this.stringifyDefault(s.value).trim().toLowerCase(), o = this.stringifyDefault(s.label).trim();
      i && o && (t[i] = o);
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
        const n = r.trim();
        if (!n) continue;
        const s = Number(n);
        if (Number.isFinite(s) && s > 0) return n;
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
      for (const [a, l] of Object.entries(t)) l && typeof l == "object" && !Array.isArray(l) && (r[a] = l);
    }
    const n = e.required, s = Array.isArray(n) ? n.filter((a) => typeof a == "string").map((a) => a.trim()).filter((a) => a.length > 0) : void 0, i = e["x-translation-context"] ?? e.x_translation_context, o = i && typeof i == "object" && !Array.isArray(i) ? i : void 0;
    return {
      type: typeof e.type == "string" ? e.type : void 0,
      required: s,
      properties: r,
      ...o ? { "x-translation-context": o } : {}
    };
  }
  collectRequiredFields(e, t) {
    const r = [], n = /* @__PURE__ */ new Set(), s = (i) => {
      const o = i.trim();
      !o || n.has(o) || (n.add(o), r.push(o));
    };
    return Array.isArray(e) && e.forEach((i) => s(String(i))), Array.isArray(t?.required) && t.required.forEach((i) => s(String(i))), r;
  }
  isEmptyPayloadValue(e) {
    return e == null ? !0 : typeof e == "string" ? e.trim() === "" : Array.isArray(e) ? e.length === 0 : typeof e == "object" ? Object.keys(e).length === 0 : !1;
  }
  generateIdempotencyKey(e, t) {
    const r = e.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-"), n = t.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-"), s = typeof crypto < "u" && typeof crypto.randomUUID == "function" ? crypto.randomUUID() : `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    return `${r || "action"}-${n || "record"}-${s}`;
  }
  coercePromptValue(e, t, r) {
    const n = typeof e == "string" ? e.trim() : String(e ?? "").trim(), s = typeof r?.type == "string" ? r.type.toLowerCase() : "string";
    if (n.length === 0) return { value: n };
    if (s === "number" || s === "integer") {
      const i = Number(n);
      return Number.isFinite(i) ? { value: s === "integer" ? Math.trunc(i) : i } : {
        value: null,
        error: `${t} must be a valid number`
      };
    }
    if (s === "boolean") {
      const i = n.toLowerCase();
      return i === "true" || i === "1" || i === "yes" ? { value: !0 } : i === "false" || i === "0" || i === "no" ? { value: !1 } : {
        value: null,
        error: `${t} must be true or false`
      };
    }
    if (s === "array" || s === "object") try {
      return { value: JSON.parse(n) };
    } catch {
      return {
        value: null,
        error: `${t} must be valid JSON (${s === "array" ? "[...]" : "{...}"})`
      };
    }
    return { value: n };
  }
  buildActionErrorMessage(e, t) {
    return ze(t, `${e} failed`);
  }
  buildQueryContext() {
    const e = new URLSearchParams();
    this.config.locale && e.set("locale", this.config.locale);
    const t = this.getContentChannel();
    return t && e.set("channel", t), e.toString();
  }
  appendDefaultActions(e, t, r) {
    const n = String(t.id || ""), s = this.config.actionBasePath, i = [
      {
        name: "view",
        button: {
          id: "view",
          label: "View",
          icon: "eye",
          variant: "secondary",
          action: () => {
            window.location.href = $e(s, n, "", r);
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
            window.location.href = $e(s, n, "edit", r);
          }
        }
      },
      {
        name: "delete",
        button: this.buildDeleteAction(t, "Delete", "danger", "trash")
      }
    ];
    for (const o of i) this.seenActions.has(o.name) || (this.seenActions.add(o.name), e.push(o.button));
  }
  appendDefaultActionsOrdered(e, t, r, n) {
    const s = String(t.id || ""), i = this.config.actionBasePath, o = [
      {
        name: "view",
        button: {
          id: "view",
          label: "View",
          icon: "eye",
          variant: "secondary",
          action: () => {
            window.location.href = $e(i, s, "", r);
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
            window.location.href = $e(i, s, "edit", r);
          }
        }
      },
      {
        name: "delete",
        button: this.buildDeleteAction(t, "Delete", "danger", "trash")
      }
    ];
    let a = n;
    for (const l of o) this.seenActions.has(l.name) || (this.seenActions.add(l.name), e.push({
      action: l.button,
      name: l.name,
      order: this.resolveActionOrder(l.name, void 0),
      insertionIndex: a++
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
function Gu(e, t, r) {
  return new Bs(r).buildRowActions(e, t);
}
function Hu(e) {
  return e.schema?.actions;
}
function Sc() {
  const e = globalThis.window;
  return e?.toastManager ? e.toastManager : new He();
}
async function Cc(e) {
  return Dn(e, null);
}
function $r(e, t) {
  return (typeof e.id == "string" && e.id.trim() ? e.id.trim() : `${e.label}-${t + 1}`).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || `action-${t + 1}`;
}
function Ec(e, t) {
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
function Ac(e, t) {
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
function En(e) {
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
function kc(e) {
  const t = e.findIndex((n) => String(n.id || "").toLowerCase() === "edit");
  if (t >= 0) return {
    primary: e[t],
    rest: [...e.slice(0, t), ...e.slice(t + 1)]
  };
  const r = e.findIndex((n) => (n.variant || "").toLowerCase() === "primary");
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
function $c(e) {
  if (e.length === 0) return "";
  const { primary: t, rest: r } = kc(e);
  let n = "";
  if (t) {
    const i = t.disabled === !0, o = $r(t, 0), a = En(t), l = i ? (t.disabledReason || "Action unavailable").trim() : "", c = l ? `detail-action-reason-${o}` : "", d = c ? `aria-describedby="${c}"` : "", u = l ? `${t.label} unavailable: ${l}` : t.label, h = i && t.remediation?.href && t.remediation?.label ? `
          <a
            href="${f(t.remediation.href.trim())}"
            class="inline-flex items-center justify-center rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            data-detail-action-remediation="${f(o)}"
          >
            ${f(t.remediation.label.trim())}
          </a>
        ` : "", p = l ? `title="${f(l)}"` : "", m = i && l ? `<span
           class="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-100 text-amber-600 text-xs cursor-help"
           title="${f(l)}"
           aria-hidden="true"
         >?</span>
         <span class="sr-only" data-detail-action-reason="${f(o)}" id="detail-action-reason-${f(o)}">${f(l)}</span>` : "";
    n = `
      <div data-detail-action-card="${f(o)}" class="flex items-center gap-2">
        <button
          type="button"
          class="${Ec(t, i)}"
          data-detail-action-button="${f(o)}"
          data-detail-action-name="${f(t.id || t.label)}"
          data-disabled="${i}"
          aria-disabled="${i ? "true" : "false"}"
          aria-label="${f(u)}"
          ${d}
          ${p}
        >
          ${a ? `<i class="${a}"></i>` : ""}
          ${f(t.label)}
          ${m}
        </button>
        ${i && h ? h : ""}
      </div>
    `;
  }
  let s = "";
  return r.length > 0 && (s = `
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
          ${r.map((i, o) => {
    const a = i.disabled === !0, l = $r(i, t ? o + 1 : o), c = En(i), d = a ? (i.disabledReason || "Action unavailable").trim() : "", u = d ? `detail-action-reason-${l}` : "", h = u ? `aria-describedby="${u}"` : "", p = d ? `${i.label} unavailable: ${d}` : i.label, m = i.variant === "danger" && o > 0 ? '<div class="my-1 border-t border-gray-100"></div>' : "", g = d ? `title="${f(d)}"` : "", y = a && i.remediation?.href && i.remediation?.label ? `
            <a
              href="${f(i.remediation.href.trim())}"
              class="block px-4 pb-2 text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
              data-detail-action-remediation="${f(l)}"
            >
              ${f(i.remediation.label.trim())}
            </a>
          ` : "", v = a && d ? `<span
             class="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-100 text-amber-600 text-xs cursor-help"
             title="${f(d)}"
             aria-hidden="true"
           >?</span>
           <span class="sr-only" data-detail-action-reason="${f(l)}" id="detail-action-reason-${f(l)}">${f(d)}</span>` : "";
    return `
        ${m}
        <div data-detail-action-card="${f(l)}" class="space-y-1">
          <button
            type="button"
            class="${Ac(i, a)}"
            data-detail-action-button="${f(l)}"
            data-detail-action-name="${f(i.id || i.label)}"
            data-disabled="${a}"
            aria-disabled="${a ? "true" : "false"}"
            aria-label="${f(p)}"
            ${h}
            ${g}
          >
            ${c ? `<i class="${c} text-base"></i>` : '<span class="w-4"></span>'}
            <span class="flex-1">${f(i.label)}</span>
            ${v}
            ${a ? '<i class="iconoir-lock text-gray-400 text-xs ml-1"></i>' : ""}
          </button>
          ${a && y ? y : ""}
        </div>
      `;
  }).join("")}
        </div>
      </div>
    `), `
    <div class="flex items-start gap-2" data-panel-detail-actions-list="true" aria-label="Detail actions" role="toolbar">
      ${n}
      ${s}
    </div>
  `;
}
var _c = class {
  constructor(e) {
    this.actions = [], this.record = null, this.documentClickHandler = null, this.documentKeydownHandler = null, this.mount = e.mount, this.notifier = e.notifier || Sc(), this.fetchImpl = e.fetchImpl || fetch.bind(globalThis);
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
    const n = this.panelName(), s = this.recordID(), i = this.panelBasePath(), o = `${this.apiBasePath()}/panels/${encodeURIComponent(n)}`, a = new URLSearchParams(window.location.search), l = a.get("locale") || void 0, c = a.get("channel") || a.get("environment") || void 0, d = new Bs({
      apiEndpoint: o,
      actionBasePath: i,
      panelName: n,
      locale: l,
      channel: c,
      actionContext: "detail",
      onActionSuccess: async (u) => {
        if (u === "delete") {
          const h = this.backHref();
          if (h) {
            window.location.assign(h);
            return;
          }
          window.location.assign(i);
          return;
        }
        await this.refresh();
      },
      onActionError: (u, h) => {
        this.notifier.error(ze(h, `${u} failed`));
      },
      reconcileOnDomainFailure: async () => {
        await this.refresh();
      }
    });
    this.record = t, this.actions = d.buildRowActions(t, r), this.mount.innerHTML = $c(this.actions), this.mount.setAttribute("aria-busy", "false"), this.attachListeners(s), this.attachDropdownListeners();
  }
  async fetchDetailPayload() {
    const e = this.detailEndpoint();
    if (!e) return null;
    const t = await this.fetchImpl(e, { headers: { Accept: "application/json" } });
    if (!t.ok)
      return this.notifier.error(`Actions unavailable (${t.status})`), null;
    const r = await Cc(t);
    return !r || typeof r != "object" ? null : qn(r);
  }
  attachListeners(e) {
    this.actions.forEach((t, r) => {
      const n = $r(t, r), s = this.mount.querySelector(`[data-detail-action-button="${n}"]`);
      s && s.addEventListener("click", async (i) => {
        if (i.preventDefault(), !(s.getAttribute("aria-disabled") === "true" || s.dataset.disabled === "true"))
          try {
            await t.action({
              ...this.record || {},
              id: e
            });
          } catch (o) {
            if (!Te(o)) {
              const a = We(o), l = a ? ze(a, `${t.label} failed`) : o instanceof Error ? o.message : `${t.label} failed`;
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
    !t || !r || (t.addEventListener("click", (n) => {
      n.preventDefault(), n.stopPropagation(), r.classList.contains("hidden") ? this.openDropdown(t, r) : this.closeDropdown(t, r);
    }), this.documentClickHandler = (n) => {
      e.contains(n.target) || this.closeDropdown(t, r);
    }, document.addEventListener("click", this.documentClickHandler), this.documentKeydownHandler = (n) => {
      n.key === "Escape" && !r.classList.contains("hidden") && (this.closeDropdown(t, r), t.focus());
    }, document.addEventListener("keydown", this.documentKeydownHandler), r.querySelectorAll("[data-detail-action-button]").forEach((n) => {
      n.addEventListener("click", (s) => {
        if (n.getAttribute("aria-disabled") === "true" || n.dataset.disabled === "true") {
          s.preventDefault();
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
    const r = new URLSearchParams(window.location.search), n = r.get("locale"), s = r.get("channel") || r.get("environment"), i = `${this.apiBasePath()}/panels/${encodeURIComponent(e)}/${encodeURIComponent(t)}`;
    if (!n && !s) return i;
    const o = new URLSearchParams();
    return n && o.set("locale", n), s && o.set("channel", s), `${i}?${o.toString()}`;
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
async function Uu(e = document) {
  const t = Array.from(e.querySelectorAll("[data-panel-detail-actions]")), r = [];
  for (const n of t) {
    const s = new _c({ mount: n });
    r.push(s), await s.init();
  }
  return r;
}
var Lc = class Os extends ri {
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
      const n = t.onDismiss;
      new Os({
        ...t,
        onDismiss: () => {
          n?.(), r();
        }
      }).show();
    });
  }
  renderContent() {
    const t = this.config.transition || "complete action", r = this.config.entityType || "content", n = this.config.missingFieldsByLocale !== null && Object.keys(this.config.missingFieldsByLocale).length > 0;
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
                Cannot ${f(t)} ${f(r)}
              </h2>
              <p id="blocker-description" class="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                ${this.renderDescription(n)}
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
            ${this.config.missingLocales.map((s) => this.renderLocaleItem(s)).join("")}
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
            Retry ${f(t)}
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
    }, n = this.config.missingFieldsByLocale?.[t], s = Array.isArray(n) && n.length > 0, i = this.getLocaleLabel(t), o = r.loading ? "disabled" : "";
    return `
      <li class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 ${r.loading ? "opacity-50" : ""}"
          data-locale-item="${f(t)}"
          role="listitem">
        <div class="flex items-start justify-between gap-4">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 uppercase tracking-wide"
                    aria-label="Locale code">
                ${f(t)}
              </span>
              <span class="text-sm font-medium text-gray-900 dark:text-white">
                ${f(i)}
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
            ${s ? `
              <div class="mt-2">
                <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Missing required fields:</p>
                <div class="flex flex-wrap gap-1.5">
                  ${n.map((a) => `
                    <span class="inline-flex items-center px-2 py-0.5 rounded text-xs bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
                      ${f(a)}
                    </span>
                  `).join("")}
                </div>
              </div>
            ` : ""}
          </div>
          <div class="flex items-center gap-2 flex-shrink-0">
            ${r.created ? this.renderOpenButton(t, r.newRecordId) : this.renderCreateButton(t, o)}
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
              data-locale="${f(t)}"
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
  renderOpenButton(t, r, n = !1) {
    if (n) return "";
    const s = this.config.navigationBasePath, i = r || this.config.recordId, o = new URLSearchParams();
    o.set("locale", t);
    const a = this.getContentChannel();
    a && o.set("channel", a);
    const l = `${s}/${i}/edit?${o.toString()}`;
    return `
      <a href="${f(l)}"
         data-blocker-action="open"
         data-locale="${f(t)}"
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
        const n = r.getAttribute("data-locale");
        n && this.handleCreateTranslation(n);
      });
    });
    const t = this.container?.querySelectorAll("[data-locale-item]");
    t?.forEach((r, n) => {
      r.addEventListener("keydown", (s) => {
        s.key === "ArrowDown" && n < t.length - 1 ? (s.preventDefault(), t[n + 1].querySelector("[data-blocker-action]")?.focus()) : s.key === "ArrowUp" && n > 0 && (s.preventDefault(), t[n - 1].querySelector("[data-blocker-action]")?.focus());
      });
    });
  }
  async handleCreateTranslation(t) {
    const r = this.localeStates.get(t);
    if (!(!r || r.loading || r.created)) {
      r.loading = !0, this.updateLocaleItemUI(t);
      try {
        const n = {
          id: this.config.recordId,
          locale: t
        }, s = this.getContentChannel();
        s && (n.channel = s), this.config.panelName && (n.policy_entity = this.config.panelName);
        const i = `${this.config.apiEndpoint}/actions/create_translation`, o = await Dr(i, n);
        if (o.success) {
          r.loading = !1, r.created = !0, o.data?.id && (r.newRecordId = String(o.data.id)), this.updateLocaleItemUI(t);
          const a = {
            id: r.newRecordId || this.config.recordId,
            locale: t,
            status: String(o.data?.status || "draft"),
            family_id: o.data?.family_id ? String(o.data.family_id) : void 0
          };
          this.config.onCreateSuccess?.(t, a);
        } else {
          r.loading = !1, this.updateLocaleItemUI(t);
          const a = o.error?.message || "Failed to create translation";
          this.config.onError?.(a);
        }
      } catch (n) {
        r.loading = !1, this.updateLocaleItemUI(t);
        const s = n instanceof Error ? n.message : "Failed to create translation";
        this.config.onError?.(s);
      }
    }
  }
  updateLocaleItemUI(t) {
    const r = this.container?.querySelector(`[data-locale-item="${t}"]`);
    if (!r || !this.localeStates.get(t)) return;
    const n = r.parentElement;
    if (!n) return;
    const s = document.createElement("div");
    s.innerHTML = this.renderLocaleItem(t);
    const i = s.firstElementChild;
    i && (n.replaceChild(i, r), i.querySelector('[data-blocker-action="create"]')?.addEventListener("click", () => {
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
async function Vu(e) {
  try {
    await Lc.showBlocker(e);
  } catch (t) {
    console.error("[TranslationBlockerModal] Render failed, using fallback:", t);
    const r = `Cannot ${e.transition || "complete action"}: Missing translations for ${e.missingLocales.join(", ")}`;
    typeof window < "u" && "toastManager" in window ? window.toastManager.error(r) : alert(r);
  }
}
var Tc = [
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
], Fs = class {
  constructor(e) {
    this.container = null;
    const t = typeof e.container == "string" ? document.querySelector(e.container) : e.container;
    this.config = {
      container: t,
      containerClass: e.containerClass || "",
      title: e.title || "",
      orientation: e.orientation || "horizontal",
      size: e.size || "default",
      items: e.items || Tc
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
    const { title: e, orientation: t, size: r, items: n, containerClass: s } = this.config, i = t === "vertical", o = r === "sm", a = i ? "flex-col" : "flex-row flex-wrap", l = o ? "gap-2" : "gap-4", c = o ? "text-xs" : "text-sm", d = o ? "text-sm" : "text-base";
    return `
      <div class="status-legend inline-flex items-center ${a} ${l} ${s}"
           role="list"
           aria-label="Translation status legend">
        ${e ? `<span class="font-medium text-gray-600 dark:text-gray-400 mr-2 ${c}">${f(e)}</span>` : ""}
        ${n.map((u) => this.renderItem(u, d, c)).join("")}
      </div>
    `;
  }
  renderItem(e, t, r) {
    return `
      <div class="status-legend-item inline-flex items-center gap-1"
           role="listitem"
           title="${f(e.description)}"
           aria-label="${f(e.label)}: ${f(e.description)}">
        <span class="${e.colorClass} ${t}" aria-hidden="true">${e.icon}</span>
        <span class="text-gray-600 dark:text-gray-400 ${r}">${f(e.label)}</span>
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
function Dc(e) {
  const t = new Fs(e);
  return t.render(), t;
}
function Ku() {
  const e = document.querySelectorAll("[data-status-legend]"), t = [];
  return e.forEach((r) => {
    if (r.hasAttribute("data-status-legend-init")) return;
    const n = Dc({
      container: r,
      orientation: r.dataset.orientation || "horizontal",
      size: r.dataset.size || "default",
      title: r.dataset.title || ""
    });
    r.setAttribute("data-status-legend-init", "true"), t.push(n);
  }), t;
}
function Ju(e = {}) {
  const t = document.createElement("div");
  return new Fs({
    container: t,
    ...e
  }).buildHTML();
}
var qs = [
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
], Rc = class {
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
    const { size: e = "default", containerClass: t = "" } = this.config, r = e === "sm" ? "text-xs" : "text-sm", n = e === "sm" ? "px-2 py-1" : "px-3 py-1.5", s = this.config.filters.map((i) => this.renderFilterButton(i, r, n)).join("");
    this.container.innerHTML = `
      <div class="quick-filters inline-flex items-center gap-1 flex-wrap ${t}"
           role="group"
           aria-label="Quick filters">
        ${s}
      </div>
    `, this.bindEventListeners();
  }
  renderFilterButton(e, t, r) {
    const n = this.state.capabilities.get(e.key), s = n?.supported !== !1, i = this.state.activeKey === e.key, o = n?.disabledReason || "Filter not available", a = `inline-flex items-center gap-1 ${r} ${t} rounded-full font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500`;
    let l, c;
    s ? i ? (l = `${e.styleClass || "bg-blue-100 text-blue-700"} ring-2 ring-offset-1 ring-blue-500`, c = 'aria-pressed="true"') : (l = e.styleClass || "bg-gray-100 text-gray-700 hover:bg-gray-200", c = 'aria-pressed="false"') : (l = "bg-gray-100 text-gray-400 cursor-not-allowed opacity-60", c = `aria-disabled="true" title="${w(o)}"`);
    const d = e.icon ? `<span aria-hidden="true">${e.icon}</span>` : "";
    return `
      <button type="button"
              class="quick-filter-btn ${a} ${l}"
              data-filter-key="${w(e.key)}"
              ${c}
              ${s ? "" : "disabled"}>
        ${d}
        <span>${f(e.label)}</span>
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
function Mc(e, t, r = {}) {
  return new Rc({
    container: e,
    filters: qs,
    onFilterSelect: t,
    ...r
  });
}
function Yu(e) {
  const t = document.querySelectorAll("[data-quick-filters]"), r = [];
  return t.forEach((n) => {
    if (n.hasAttribute("data-quick-filters-init")) return;
    const s = Mc(n, (i) => e(i, n), { size: n.dataset.size || "default" });
    n.setAttribute("data-quick-filters-init", "true"), r.push(s);
  }), r;
}
function Wu(e = {}) {
  const { filters: t = qs, activeKey: r = null, capabilities: n = [], size: s = "default", containerClass: i = "" } = e, o = s === "sm" ? "text-xs" : "text-sm", a = s === "sm" ? "px-2 py-1" : "px-3 py-1.5", l = /* @__PURE__ */ new Map();
  for (const c of n) l.set(c.key, c);
  return `<div class="quick-filters inline-flex items-center gap-1 flex-wrap ${i}">${t.map((c) => {
    const d = l.get(c.key), u = d?.supported !== !1, h = r === c.key, p = d?.disabledReason || "Filter not available", m = `inline-flex items-center gap-1 ${a} ${o} rounded-full font-medium`;
    let g;
    u ? h ? g = `${c.styleClass || "bg-blue-100 text-blue-700"} ring-2 ring-offset-1 ring-blue-500` : g = c.styleClass || "bg-gray-100 text-gray-700" : g = "bg-gray-100 text-gray-400 cursor-not-allowed opacity-60";
    const y = c.icon ? `<span>${c.icon}</span>` : "", v = u ? "" : `title="${w(p)}"`;
    return `<span class="${m} ${g}" ${v}>${y}<span>${f(c.label)}</span></span>`;
  }).join("")}</div>`;
}
var sr = "go-admin:translation-panel-expanded", Ic = class {
  constructor(e) {
    this.toggleButton = null, this.panelElement = null, this.expandAllButton = null, this.collapseAllButton = null, this.groupControls = null, this.viewModeButtons = [], this.expanded = !1, this.boundToggleHandler = null, this.config = {
      ...e,
      storageKey: e.storageKey || sr
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
      return window.localStorage.getItem(this.config.storageKey || sr) === "true";
    } catch {
      return !1;
    }
  }
  persistExpandedState(e) {
    if (!(typeof window > "u" || !window.localStorage))
      try {
        window.localStorage.setItem(this.config.storageKey || sr, e ? "true" : "false");
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
function Xu(e) {
  return new Ic(e);
}
async function Pc(e, t, r = {}) {
  const { apiEndpoint: n, notifier: s = new He(), maxFailuresToShow: i = 5 } = e, o = `${n}/bulk/create-missing-translations`;
  try {
    const a = await j(o, {
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
    if (!a.ok) throw new Error(await Tr(a, `Request failed: ${a.status}`, { appendStatusToFallback: !1 }));
    const l = Bc(await a.json(), i);
    return Oc(l, s), e.onSuccess && e.onSuccess(l), l;
  } catch (a) {
    const l = a instanceof Error ? a : new Error(String(a));
    throw s.error(`Failed to create translations: ${l.message}`), e.onError && e.onError(l), l;
  }
}
function Bc(e, t) {
  const r = e.data || [], n = e.created_count ?? r.filter((o) => o.success).length, s = e.failed_count ?? r.filter((o) => !o.success).length, i = e.skipped_count ?? 0;
  return {
    total: e.total ?? r.length,
    created: n,
    failed: s,
    skipped: i,
    failures: r.filter((o) => !o.success && o.error).slice(0, t).map((o) => ({
      id: o.id,
      locale: o.locale,
      error: o.error || "Unknown error"
    }))
  };
}
function Oc(e, t) {
  const { created: r, failed: n, skipped: s, total: i } = e;
  if (i === 0) {
    t.info("No translations to create");
    return;
  }
  n === 0 ? r > 0 ? t.success(`Created ${r} translation${r !== 1 ? "s" : ""}${s > 0 ? ` (${s} skipped)` : ""}`) : s > 0 && t.info(`All ${s} translation${s !== 1 ? "s" : ""} already exist`) : r === 0 ? t.error(`Failed to create ${n} translation${n !== 1 ? "s" : ""}`) : t.warning(`Created ${r}, failed ${n}${s > 0 ? `, skipped ${s}` : ""}`);
}
function Qu(e) {
  const { created: t, failed: r, skipped: n, total: s, failures: i } = e, o = `
    <div class="grid grid-cols-3 gap-4 mb-4">
      <div class="text-center p-3 bg-green-50 rounded">
        <div class="text-2xl font-bold text-green-700">${t}</div>
        <div class="text-sm text-green-600">Created</div>
      </div>
      <div class="text-center p-3 ${r > 0 ? "bg-red-50" : "bg-gray-50"} rounded">
        <div class="text-2xl font-bold ${r > 0 ? "text-red-700" : "text-gray-400"}">${r}</div>
        <div class="text-sm ${r > 0 ? "text-red-600" : "text-gray-500"}">Failed</div>
      </div>
      <div class="text-center p-3 ${n > 0 ? "bg-yellow-50" : "bg-gray-50"} rounded">
        <div class="text-2xl font-bold ${n > 0 ? "text-yellow-700" : "text-gray-400"}">${n}</div>
        <div class="text-sm ${n > 0 ? "text-yellow-600" : "text-gray-500"}">Skipped</div>
      </div>
    </div>
  `;
  let a = "";
  return i.length > 0 && (a = `
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
          <td class="px-3 py-2 text-sm text-gray-700">${f(l.id)}</td>
          <td class="px-3 py-2 text-sm text-gray-700">${f(l.locale)}</td>
          <td class="px-3 py-2 text-sm text-red-600">${f(l.error)}</td>
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
        Processed ${s} item${s !== 1 ? "s" : ""}
      </div>
      ${o}
      ${a}
    </div>
  `;
}
function Zu(e) {
  const { created: t, failed: r, skipped: n } = e, s = [];
  return t > 0 && s.push(`<span class="text-green-600">+${t}</span>`), r > 0 && s.push(`<span class="text-red-600">${r} failed</span>`), n > 0 && s.push(`<span class="text-yellow-600">${n} skipped</span>`), s.join(" · ");
}
function ef(e, t, r) {
  return async (n) => Pc({
    apiEndpoint: e,
    notifier: t,
    onSuccess: r
  }, n);
}
var Fc = {
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
function se(e) {
  const t = e.toLowerCase();
  return Fc[t] || e.toUpperCase();
}
var jt = class {
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
    const { locale: e, size: t, mode: r, localeExists: n } = this.config, { loading: s, created: i, error: o } = this.state, a = se(e), l = t === "sm" ? "text-xs px-2 py-1" : "text-sm px-3 py-1.5", c = r === "button" ? "rounded-lg" : "rounded-full";
    let d, u = "";
    s ? (d = "bg-gray-100 text-gray-600 border-gray-300", u = this.renderSpinner()) : i ? (d = "bg-green-100 text-green-700 border-green-300", u = this.renderCheckIcon()) : o ? (d = "bg-red-100 text-red-700 border-red-300", u = this.renderErrorIcon()) : n ? d = "bg-blue-100 text-blue-700 border-blue-300" : d = "bg-amber-100 text-amber-700 border-amber-300";
    const h = this.renderActions();
    return `
      <div class="inline-flex items-center gap-1.5 ${l} ${c} border ${d}"
           data-locale-action="${f(e)}"
           data-locale-exists="${n}"
           data-loading="${s}"
           data-created="${i}"
           role="group"
           aria-label="${a} translation">
        ${u}
        <span class="font-medium uppercase tracking-wide" aria-hidden="true">${f(e)}</span>
        <span class="sr-only">${a}</span>
        ${h}
      </div>
    `;
  }
  renderActions() {
    const { locale: e, localeExists: t, size: r } = this.config, { loading: n, created: s } = this.state, i = r === "sm" ? "p-0.5" : "p-1", o = r === "sm" ? "w-3 h-3" : "w-4 h-4", a = [];
    if (!t && !s && !n && a.push(`
        <button type="button"
                class="inline-flex items-center justify-center ${i} rounded hover:bg-amber-200 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors"
                data-action="create"
                data-locale="${f(e)}"
                aria-label="Create ${se(e)} translation"
                title="Create ${se(e)} translation">
          <svg class="${o}" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
        </button>
      `), t || s) {
      const l = s ? "hover:bg-green-200" : "hover:bg-blue-200", c = s ? "focus:ring-green-500" : "focus:ring-blue-500";
      a.push(`
        <button type="button"
                class="inline-flex items-center justify-center ${i} rounded ${l} focus:outline-none focus:ring-1 ${c} transition-colors"
                data-action="open"
                data-locale="${f(e)}"
                aria-label="Open ${se(e)} translation"
                title="Open ${se(e)} translation">
          <svg class="${o}" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
          </svg>
        </button>
      `);
    }
    return a.join("");
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
        const r = `${this.config.apiEndpoint}/actions/create_translation`, n = await Dr(r, e);
        if (n.success) {
          const s = n.data?.id ? String(n.data.id) : void 0;
          this.setState({
            loading: !1,
            created: !0,
            newRecordId: s
          });
          const i = {
            id: s || this.config.recordId,
            locale: this.config.locale,
            status: String(n.data?.status || "draft"),
            familyId: n.data?.family_id ? String(n.data.family_id) : void 0
          };
          this.config.onCreateSuccess?.(this.config.locale, i);
        } else {
          const s = n.error?.message || "Failed to create translation";
          this.setState({
            loading: !1,
            error: s
          }), this.config.onError?.(this.config.locale, s);
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
    const { locale: e, navigationBasePath: t, recordId: r } = this.config, { newRecordId: n } = this.state, s = n || r, i = new URLSearchParams();
    i.set("locale", e);
    const o = this.getContentChannel();
    o && i.set("channel", o);
    const a = `${t}/${s}/edit?${i.toString()}`;
    this.config.onOpen?.(e, a), window.location.href = a;
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
function Ns(e) {
  return new jt(e).render();
}
function tf(e, t) {
  return e.length === 0 ? "" : `
    <div class="flex flex-wrap items-center gap-2" role="list" aria-label="Missing translations">
      ${e.map((r) => Ns({
    ...t,
    locale: r
  })).join("")}
    </div>
  `;
}
function rf(e, t) {
  const r = /* @__PURE__ */ new Map();
  return e.querySelectorAll("[data-locale-action]").forEach((n) => {
    const s = n.getAttribute("data-locale-action");
    if (!s) return;
    const i = n.getAttribute("data-locale-exists") === "true", o = {
      ...t,
      locale: s,
      localeExists: i
    }, a = new jt(o), l = n.parentElement;
    l && (a.mount(l), r.set(s, a));
  }), r;
}
function An(e, t, r, n) {
  const s = new URLSearchParams();
  s.set("locale", r);
  const i = String(n ?? "").trim();
  return i && s.set("channel", i), `${e}/${t}/edit?${s.toString()}`;
}
var Xr = class {
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
    const { context: e, showFormLockMessage: t } = this.config, r = e.requestedLocale || "requested", n = e.resolvedLocale || "default", s = se(r), i = se(n), o = this.renderPrimaryCta(), a = this.renderSecondaryCta(), l = t ? this.renderFormLockMessage() : "";
    return `
      <div class="fallback-banner bg-amber-50 border border-amber-200 rounded-lg shadow-sm"
           role="alert"
           aria-live="polite"
           data-fallback-banner="true"
           data-requested-locale="${f(r)}"
           data-resolved-locale="${f(n)}">
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
                The <strong class="font-medium">${f(s)}</strong> (${f(r.toUpperCase())})
                translation doesn't exist yet. You're viewing content from
                <strong class="font-medium">${f(i)}</strong> (${f(n.toUpperCase())}).
              </p>

              ${l}

              <!-- Actions -->
              <div class="mt-4 flex flex-wrap items-center gap-3">
                ${o}
                ${a}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
  renderPrimaryCta() {
    const { context: e, apiEndpoint: t, navigationBasePath: r, panelName: n, channel: s } = this.config, i = e.requestedLocale, o = String(s ?? "").trim();
    return !i || !e.recordId ? "" : `
      <button type="button"
              class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-colors"
              data-action="create-translation"
              data-locale="${f(i)}"
              data-record-id="${f(e.recordId)}"
              data-api-endpoint="${f(t)}"
              data-panel="${f(n || "")}"
              data-channel="${f(o)}"
              aria-label="Create ${se(i)} translation">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
        </svg>
        Create ${f(i.toUpperCase())} translation
      </button>
    `;
  }
  renderSecondaryCta() {
    const { context: e, navigationBasePath: t, channel: r } = this.config, n = e.resolvedLocale;
    if (!n || !e.recordId) return "";
    const s = An(t, e.recordId, n, r);
    return `
      <a href="${f(s)}"
         class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-amber-700 bg-white border border-amber-300 rounded-lg hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-colors"
         data-action="open-source"
         data-locale="${f(n)}"
         aria-label="Open ${se(n)} translation">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
        </svg>
        Open ${f(n.toUpperCase())} (source)
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
      const n = t.getAttribute("data-locale"), s = t.getAttribute("href");
      n && s && this.config.onOpenSource?.(n, s);
    });
  }
  async handleCreate() {
    const { context: e, apiEndpoint: t, panelName: r, channel: n, navigationBasePath: s } = this.config, i = e.requestedLocale, o = e.recordId, a = String(n ?? "").trim() || void 0;
    !i || !o || await new jt({
      locale: i,
      recordId: o,
      apiEndpoint: t,
      navigationBasePath: s,
      panelName: r,
      channel: a,
      localeExists: !1,
      onCreateSuccess: (l, c) => {
        this.config.onCreateSuccess?.(l, c);
        const d = An(s, c.id, l, a);
        window.location.href = d;
      },
      onError: (l, c) => {
        this.config.onError?.(c);
      }
    }).handleCreate();
  }
};
function qc(e, t) {
  if (!t.locked) {
    Nc(e);
    return;
  }
  if (e.classList.add("form-locked", "pointer-events-none", "opacity-75"), e.setAttribute("data-form-locked", "true"), e.setAttribute("data-lock-reason", t.reason || ""), e.querySelectorAll('input, textarea, select, button[type="submit"]').forEach((r) => {
    r.setAttribute("disabled", "true"), r.setAttribute("data-was-enabled", "true"), r.setAttribute("aria-disabled", "true");
  }), !e.querySelector("[data-form-lock-overlay]")) {
    const r = document.createElement("div");
    r.setAttribute("data-form-lock-overlay", "true"), r.className = "absolute inset-0 bg-amber-50/30 cursor-not-allowed z-10", r.setAttribute("title", t.reason || "Form is locked"), window.getComputedStyle(e).position === "static" && (e.style.position = "relative"), e.appendChild(r);
  }
}
function Nc(e) {
  e.classList.remove("form-locked", "pointer-events-none", "opacity-75"), e.removeAttribute("data-form-locked"), e.removeAttribute("data-lock-reason"), e.querySelectorAll('[data-was-enabled="true"]').forEach((t) => {
    t.removeAttribute("disabled"), t.removeAttribute("data-was-enabled"), t.removeAttribute("aria-disabled");
  }), e.querySelector("[data-form-lock-overlay]")?.remove();
}
function nf(e) {
  return e.getAttribute("data-form-locked") === "true";
}
function sf(e) {
  return e.getAttribute("data-lock-reason");
}
function of(e, t) {
  const r = he(e);
  return new Xr({
    ...t,
    context: r
  }).render();
}
function af(e) {
  const t = he(e);
  return t.fallbackUsed || t.missingRequestedLocale;
}
function lf(e, t) {
  const r = new Xr(t);
  return r.mount(e), r;
}
function cf(e, t) {
  const r = he(t), n = new Xr({
    context: r,
    apiEndpoint: "",
    navigationBasePath: ""
  }).getFormLockState();
  return qc(e, n), n;
}
var js = class {
  constructor(e, t) {
    this.chips = /* @__PURE__ */ new Map(), this.element = null, this.config = {
      maxChips: 3,
      size: "sm",
      ...t
    }, this.readiness = W(e), this.actionState = this.extractActionState(e, "create_translation");
  }
  extractActionState(e, t) {
    return Nn(e, t);
  }
  isCreateActionEnabled() {
    return this.actionState ? this.actionState.enabled : !0;
  }
  getDisabledReason() {
    if (this.isCreateActionEnabled()) return null;
    if (this.actionState?.reason) return this.actionState.reason;
    const e = Hn({ reason_code: this.actionState?.reason_code });
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
    const t = this.isCreateActionEnabled(), r = this.getDisabledReason(), n = this.getOverflowCount(), s = e.map((o) => this.renderChip(o, t, r)).join(""), i = n > 0 ? this.renderOverflow(n) : "";
    return `
      <div class="${t ? "inline-flex items-center gap-1.5 flex-wrap" : "inline-flex items-center gap-1.5 flex-wrap opacity-60"}"
           data-inline-locale-chips="true"
           data-record-id="${f(this.config.recordId)}"
           data-action-enabled="${t}"
           role="list"
           aria-label="Missing translations">
        ${s}${i}
      </div>
    `;
  }
  renderChip(e, t, r) {
    const { recordId: n, apiEndpoint: s, navigationBasePath: i, panelName: o, channel: a, size: l } = this.config, c = String(a ?? "").trim() || void 0;
    return t ? Ns({
      locale: e,
      recordId: n,
      apiEndpoint: s,
      navigationBasePath: i,
      panelName: o,
      channel: c,
      localeExists: !1,
      size: l,
      mode: "chip",
      onCreateSuccess: this.config.onCreateSuccess,
      onError: this.config.onError
    }) : this.renderDisabledChip(e, r, l);
  }
  renderDisabledChip(e, t, r) {
    const n = r === "md" ? "text-sm px-3 py-1.5" : "text-xs px-2 py-1", s = t || "Translation creation unavailable", i = se(e);
    return `
      <div class="inline-flex items-center gap-1 ${n} rounded-full border border-gray-300 bg-gray-100 text-gray-500 cursor-not-allowed"
           data-locale="${f(e)}"
           data-disabled="true"
           title="${f(s)}"
           role="listitem"
           aria-label="${i} translation (unavailable)">
        <svg class="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"/>
        </svg>
        <span class="font-medium uppercase tracking-wide">${f(e)}</span>
      </div>
    `;
  }
  renderOverflow(e) {
    const { size: t } = this.config, r = t === "md" ? "text-sm px-2 py-1" : "text-xs px-1.5 py-0.5", n = this.readiness.missingRequiredLocales.join(", ").toUpperCase();
    return `
      <span class="${r} rounded text-gray-500 font-medium"
            title="Also missing: ${f(n)}"
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
      const r = new jt({
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
      this.chips.set(t, r), e.querySelector('[data-action="create"]')?.addEventListener("click", async (n) => {
        n.preventDefault(), n.stopPropagation(), await r.handleCreate();
      }), e.querySelector('[data-action="open"]')?.addEventListener("click", (n) => {
        n.preventDefault(), n.stopPropagation(), r.handleOpen();
      });
    });
  }
  getChip(e) {
    return this.chips.get(e);
  }
};
function jc(e, t) {
  const r = String(e.id || "");
  return r ? new js(e, {
    ...t,
    recordId: r
  }).render() : "";
}
function df(e) {
  const t = W(e);
  return t.hasReadinessMetadata && t.missingRequiredLocales.length > 0;
}
function uf(e, t, r) {
  const n = String(t.id || ""), s = new js(t, {
    ...r,
    recordId: n
  });
  return s.mount(e), s;
}
function ff(e) {
  return (t, r, n) => jc(r, e);
}
function zt() {
  return typeof navigator > "u" ? !1 : /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent);
}
function zc() {
  return zt() ? "⌘" : "Ctrl";
}
function Gc(e) {
  if (zt()) switch (e) {
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
function zs(e) {
  const t = e.modifiers.map(Gc), r = Hc(e.key);
  return zt() ? [...t, r].join("") : [...t, r].join("+");
}
function Hc(e) {
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
var Gs = class {
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
        r instanceof Promise && r.catch((n) => {
          console.error(`[KeyboardShortcuts] Handler error for "${t.id}":`, n);
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
    const r = t.key.toLowerCase(), n = e.key.toLowerCase();
    if (r !== n && t.code.toLowerCase() !== n) return !1;
    const s = zt(), i = new Set(e.modifiers), o = i.has("ctrl"), a = i.has("meta"), l = i.has("alt"), c = i.has("shift");
    return !(o && !(s ? t.metaKey : t.ctrlKey) || a && !s && !t.metaKey || l && !t.altKey || c && !t.shiftKey || !o && !a && (s ? t.metaKey : t.ctrlKey) || !l && t.altKey || !c && t.shiftKey);
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
function Uc(e) {
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
function hf(e) {
  const t = /* @__PURE__ */ new Map();
  for (const i of e) {
    if (i.enabled === !1) continue;
    const o = t.get(i.category) || [];
    o.push(i), t.set(i.category, o);
  }
  const r = {
    save: "Save & Submit",
    navigation: "Navigation",
    locale: "Locale Switching",
    actions: "Actions",
    help: "Help",
    other: "Other"
  }, n = [
    "save",
    "locale",
    "navigation",
    "actions",
    "help",
    "other"
  ];
  let s = `
    <div class="shortcuts-help" role="document">
      <div class="text-sm text-gray-500 mb-4">
        Press <kbd class="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs font-mono">?</kbd> to show this help anytime
      </div>
  `;
  for (const i of n) {
    const o = t.get(i);
    if (!(!o || o.length === 0)) {
      s += `
      <div class="mb-4">
        <h4 class="text-sm font-medium text-gray-700 mb-2">${r[i]}</h4>
        <dl class="space-y-1">
    `;
      for (const a of o) {
        const l = zs(a);
        s += `
          <div class="flex justify-between items-center py-1">
            <dt class="text-sm text-gray-600">${f(a.description)}</dt>
            <dd class="flex-shrink-0 ml-4">
              <kbd class="px-2 py-1 bg-gray-100 border border-gray-200 rounded text-xs font-mono text-gray-700">${f(l)}</kbd>
            </dd>
          </div>
      `;
      }
      s += `
        </dl>
      </div>
    `;
    }
  }
  return s += "</div>", s;
}
var Hs = "admin_keyboard_shortcuts_settings", Us = "admin_keyboard_shortcuts_hint_dismissed", At = {
  enabled: !0,
  shortcuts: {},
  updatedAt: (/* @__PURE__ */ new Date()).toISOString()
};
function Gt() {
  return typeof localStorage > "u" || !localStorage || typeof localStorage.getItem != "function" || typeof localStorage.setItem != "function" ? null : localStorage;
}
function Vc() {
  const e = Gt();
  if (!e) return { ...At };
  try {
    const t = e.getItem(Hs);
    if (!t) return { ...At };
    const r = JSON.parse(t);
    return {
      enabled: typeof r.enabled == "boolean" ? r.enabled : !0,
      shortcuts: typeof r.shortcuts == "object" && r.shortcuts !== null ? r.shortcuts : {},
      updatedAt: typeof r.updatedAt == "string" ? r.updatedAt : (/* @__PURE__ */ new Date()).toISOString()
    };
  } catch {
    return { ...At };
  }
}
function pf(e) {
  const t = Gt();
  if (t)
    try {
      const r = {
        ...e,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      t.setItem(Hs, JSON.stringify(r));
    } catch {
    }
}
function Kc() {
  const e = Gt();
  return e ? e.getItem(Us) === "true" : !1;
}
function Jc() {
  const e = Gt();
  if (e)
    try {
      e.setItem(Us, "true");
    } catch {
    }
}
function Yc(e) {
  if (Kc()) return null;
  const { container: t, position: r = "bottom", onDismiss: n, onShowHelp: s, autoDismissMs: i = 1e4 } = e, o = document.createElement("div");
  o.className = `shortcuts-discovery-hint fixed ${r === "top" ? "top-4" : "bottom-4"} right-4 z-50 animate-fade-in`, o.setAttribute("role", "alert"), o.setAttribute("aria-live", "polite"), o.innerHTML = `
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
            to view all shortcuts, or use <kbd class="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-xs font-mono">${zc()}+S</kbd> to save.
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
  const a = (l) => {
    l && Jc(), o.remove(), n?.();
  };
  return o.querySelector('[data-hint-action="show-help"]')?.addEventListener("click", () => {
    a(!0), s?.();
  }), o.querySelector('[data-hint-action="dismiss"]')?.addEventListener("click", () => {
    a(!0);
  }), o.querySelector('[data-hint-action="close"]')?.addEventListener("click", () => {
    a(!1);
  }), i > 0 && setTimeout(() => {
    o.parentElement && a(!1);
  }, i), t.appendChild(o), o;
}
function mf(e) {
  const { container: t, shortcuts: r, settings: n, onSettingsChange: s } = e, i = {
    save: "Save & Submit",
    navigation: "Navigation",
    locale: "Locale Switching",
    actions: "Actions",
    help: "Help",
    other: "Other"
  }, o = /* @__PURE__ */ new Map();
  for (const c of r) {
    const d = o.get(c.category) || [];
    d.push(c), o.set(c.category, d);
  }
  const a = [
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
                aria-checked="${n.enabled}"
                data-settings-action="toggle-global"
                class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${n.enabled ? "bg-blue-600" : "bg-gray-200 dark:bg-gray-600"}">
          <span class="sr-only">Enable keyboard shortcuts</span>
          <span aria-hidden="true"
                class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${n.enabled ? "translate-x-5" : "translate-x-0"}"></span>
        </button>
      </div>

      <!-- Per-shortcut toggles -->
      <div class="${n.enabled ? "" : "opacity-50 pointer-events-none"}" data-shortcuts-list>
  `;
  for (const c of a) {
    const d = o.get(c);
    if (!(!d || d.length === 0)) {
      l += `
      <div class="space-y-2">
        <h4 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          ${i[c]}
        </h4>
        <div class="space-y-1">
    `;
      for (const u of d) {
        const h = n.shortcuts[u.id] !== !1, p = zs(u);
        l += `
        <div class="flex items-center justify-between py-2 px-3 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50">
          <div class="flex items-center gap-3">
            <kbd class="px-2 py-1 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-xs font-mono text-gray-700 dark:text-gray-300">
              ${f(p)}
            </kbd>
            <span class="text-sm text-gray-700 dark:text-gray-300">${f(u.description)}</span>
          </div>
          <input type="checkbox"
                 id="shortcut-${f(u.id)}"
                 data-settings-action="toggle-shortcut"
                 data-shortcut-id="${f(u.id)}"
                 ${h ? "checked" : ""}
                 class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                 aria-label="Enable ${f(u.description)} shortcut">
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
      ...n,
      enabled: !n.enabled
    };
    s(c);
  }), t.querySelectorAll('[data-settings-action="toggle-shortcut"]').forEach((c) => {
    c.addEventListener("change", () => {
      const d = c.getAttribute("data-shortcut-id");
      if (!d) return;
      const u = {
        ...n,
        shortcuts: {
          ...n.shortcuts,
          [d]: c.checked
        }
      };
      s(u);
    });
  }), t.querySelector('[data-settings-action="reset"]')?.addEventListener("click", () => {
    s({ ...At });
  });
}
function Wc(e, t) {
  const r = e;
  r.config && (r.config.enabled = t.enabled);
  for (const n of e.getShortcuts()) {
    const s = t.shortcuts[n.id] !== !1;
    e.setEnabled(n.id, s);
  }
}
var ir = null;
function gf() {
  return ir || (ir = new Gs()), ir;
}
function Xc(e, t) {
  const r = Vc(), n = new Gs({
    ...t,
    enabled: r.enabled
  }), s = Uc(e);
  for (const i of s) n.register(i);
  return Wc(n, r), n.bind(), n;
}
function bf(e, t) {
  const r = Xc(e, t);
  return t.hintContainer && Yc({
    container: t.hintContainer,
    onShowHelp: t.onShowHelp,
    onDismiss: () => {
    }
  }), r;
}
var Qc = 1500, Zc = 2e3, Qr = "autosave", Ye = {
  idle: "",
  saving: "Saving...",
  saved: "Saved",
  error: "Save failed",
  conflict: "Conflict detected"
}, ed = {
  title: "Save Conflict",
  message: "This content was modified by someone else. Choose how to proceed:",
  useServer: "Use server version",
  forceSave: "Overwrite with my changes",
  viewDiff: "View differences",
  dismiss: "Dismiss"
}, Vs = class {
  constructor(e = {}) {
    this.state = "idle", this.conflictInfo = null, this.pendingData = null, this.lastError = null, this.debounceTimer = null, this.savedTimer = null, this.listeners = [], this.isDirty = !1, this.config = {
      container: e.container,
      onSave: e.onSave,
      debounceMs: e.debounceMs ?? Qc,
      savedDurationMs: e.savedDurationMs ?? Zc,
      notifier: e.notifier,
      showToasts: e.showToasts ?? !1,
      classPrefix: e.classPrefix ?? Qr,
      labels: {
        ...Ye,
        ...e.labels
      },
      enableConflictDetection: e.enableConflictDetection ?? !1,
      onConflictResolve: e.onConflictResolve,
      fetchServerState: e.fetchServerState,
      allowForceSave: e.allowForceSave ?? !0,
      conflictLabels: {
        ...ed,
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
    const e = this.config.classPrefix, t = this.config.labels, r = `${e}--${this.state}`, n = t[this.state] || "", s = this.getStateIcon();
    return this.state === "conflict" ? this.renderConflictUI() : `<div class="${e} ${r}" role="status" aria-live="polite" aria-atomic="true">
      <span class="${e}__icon">${s}</span>
      <span class="${e}__label">${n}</span>
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
    for (const n of this.listeners) try {
      n(r);
    } catch {
    }
    this.config.showToasts && this.config.notifier && this.showToast(e), this.render();
  }
  showToast(e) {
    const t = this.config.notifier;
    if (t)
      switch (e) {
        case "saved":
          t.success(this.config.labels.saved ?? Ye.saved, 2e3);
          break;
        case "error":
          t.error(this.lastError?.message ?? this.config.labels.error ?? Ye.error);
          break;
        case "conflict":
          t.warning?.(this.config.labels.conflict ?? Ye.conflict);
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
    const n = this.config.container.querySelector(`.${e}__conflict-dismiss`);
    n && n.addEventListener("click", () => this.dismissConflict());
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
function yf(e) {
  return new Vs({
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
function vf(e, t = {}) {
  const r = t.classPrefix ?? Qr, n = {
    ...Ye,
    ...t.labels
  }[e] || "";
  let s = "";
  switch (e) {
    case "saving":
      s = `<span class="${r}__spinner"></span>`;
      break;
    case "saved":
      s = `<span class="${r}__check">✓</span>`;
      break;
    case "error":
      s = `<span class="${r}__error">!</span>`;
      break;
    case "conflict":
      s = `<span class="${r}__conflict-icon">⚠</span>`;
  }
  return `<div class="${r} ${r}--${e}" role="status" aria-live="polite">
    ${s}
    <span class="${r}__label">${n}</span>
  </div>`;
}
function wf(e = Qr) {
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
function xf(e, t) {
  const { watchFields: r, indicatorSelector: n, ...s } = t;
  let i = s.container;
  !i && n && (i = e.querySelector(n) ?? void 0);
  const o = new Vs({
    ...s,
    container: i
  }), a = () => {
    const h = new FormData(e), p = {};
    return h.forEach((m, g) => {
      p[g] = m;
    }), p;
  }, l = (h) => {
    const p = h.target;
    if (p) {
      if (r && r.length > 0) {
        const m = p.name;
        if (!m || !r.includes(m)) return;
      }
      o.markDirty(a());
    }
  };
  e.addEventListener("input", l), e.addEventListener("change", l), e.addEventListener("submit", async (h) => {
    o.hasPendingChanges() && (h.preventDefault(), await o.save() && e.submit());
  });
  const c = (h) => {
    o.hasPendingChanges() && (h.preventDefault(), h.returnValue = "");
  };
  window.addEventListener("beforeunload", c);
  const d = () => {
    document.hidden && o.hasPendingChanges() && o.save();
  };
  document.addEventListener("visibilitychange", d);
  const u = o.destroy.bind(o);
  return o.destroy = () => {
    e.removeEventListener("input", l), e.removeEventListener("change", l), window.removeEventListener("beforeunload", c), document.removeEventListener("visibilitychange", d), u();
  }, o;
}
var Ks = "char-counter", td = "interpolation-preview", Js = "dir-toggle", Ys = [
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
], rd = {
  name: "John",
  count: "5",
  email: "user@example.com",
  date: "2024-01-15",
  price: "$29.99",
  user: "Jane",
  item: "Product",
  total: "100"
}, nd = class {
  constructor(e) {
    this.counterEl = null, this.config = {
      input: e.input,
      container: e.container,
      softLimit: e.softLimit,
      hardLimit: e.hardLimit,
      thresholds: e.thresholds ?? this.buildDefaultThresholds(e),
      enforceHardLimit: e.enforceHardLimit ?? !1,
      classPrefix: e.classPrefix ?? Ks,
      formatDisplay: e.formatDisplay ?? this.defaultFormatDisplay.bind(this)
    }, this.boundUpdate = this.update.bind(this), this.init();
  }
  getCount() {
    return this.config.input.value.length;
  }
  getSeverity() {
    const e = this.getCount(), t = [...this.config.thresholds].sort((r, n) => n.limit - r.limit);
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
}, sd = class {
  constructor(e) {
    this.previewEl = null, this.config = {
      input: e.input,
      container: e.container,
      sampleValues: e.sampleValues ?? rd,
      patterns: [...Ys, ...e.customPatterns ?? []],
      highlightVariables: e.highlightVariables ?? !0,
      classPrefix: e.classPrefix ?? td
    }, this.boundUpdate = this.update.bind(this), this.init();
  }
  getMatches() {
    const e = this.config.input.value, t = [];
    for (const r of this.config.patterns) {
      r.pattern.lastIndex = 0;
      let n;
      for (; (n = r.pattern.exec(e)) !== null; ) t.push({
        pattern: r.name,
        variable: n[1] ?? n[0],
        start: n.index,
        end: n.index + n[0].length
      });
    }
    return t;
  }
  getPreviewText() {
    let e = this.config.input.value;
    for (const t of this.config.patterns)
      t.pattern.lastIndex = 0, e = e.replace(t.pattern, (r, n) => {
        const s = (n ?? r).replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
        for (const [i, o] of Object.entries(this.config.sampleValues)) if (i.toLowerCase() === s) return o;
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
    if (t.length === 0) return f(e);
    t.sort((i, o) => i.start - o.start);
    let n = "", s = 0;
    for (const i of t) {
      n += f(e.slice(s, i.start));
      const o = this.getSampleValue(i.variable), a = e.slice(i.start, i.end);
      n += `<span class="${r}__variable" title="${f(a)}">${f(o ?? a)}</span>`, s = i.end;
    }
    return n += f(e.slice(s)), n;
  }
  render() {
    const e = this.config.classPrefix;
    return `<div class="${e}${this.getMatches().length === 0 ? ` ${e}--empty` : ""}">
      <span class="${e}__label">Preview:</span>
      <span class="${e}__content">${this.config.highlightVariables ? this.renderHighlightedPreview() : f(this.getPreviewText())}</span>
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
    for (const [r, n] of Object.entries(this.config.sampleValues)) if (r.toLowerCase() === t) return n;
    return null;
  }
}, id = class {
  constructor(e) {
    this.toggleEl = null, this.config = {
      input: e.input,
      container: e.container,
      initialDirection: e.initialDirection ?? "auto",
      persistenceKey: e.persistenceKey,
      classPrefix: e.classPrefix ?? Js,
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
function Sf(e, t = {}) {
  const r = [], n = [], s = [];
  for (const i of t.charCounterFields ?? []) {
    const o = e.querySelector(`[name="${i}"]`);
    o && r.push(new nd({
      input: o,
      ...t.charCounterConfig
    }));
  }
  for (const i of t.interpolationFields ?? []) {
    const o = e.querySelector(`[name="${i}"]`);
    o && n.push(new sd({
      input: o,
      ...t.interpolationConfig
    }));
  }
  for (const i of t.directionToggleFields ?? []) {
    const o = e.querySelector(`[name="${i}"]`);
    o && s.push(new id({
      input: o,
      persistenceKey: `dir-${i}`,
      ...t.directionToggleConfig
    }));
  }
  return {
    counters: r,
    previews: n,
    toggles: s,
    destroy: () => {
      r.forEach((i) => i.destroy()), n.forEach((i) => i.destroy()), s.forEach((i) => i.destroy());
    }
  };
}
function Cf(e, t, r, n = Ks) {
  const s = [n];
  r && s.push(`${n}--${r}`);
  const i = t ? `${e} / ${t}` : `${e}`;
  return `<span class="${s.join(" ")}" aria-live="polite">${i}</span>`;
}
function Ef(e, t = Js) {
  const r = e === "rtl", n = r ? '<path d="M13 8H3M6 5L3 8l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>' : '<path d="M3 8h10M10 5l3 3-3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>';
  return `<button type="button" class="${t}" aria-pressed="${r}" title="Toggle text direction (${e.toUpperCase()})">
    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" width="16" height="16">${n}</svg>
    <span class="${t}__label">${e.toUpperCase()}</span>
  </button>`;
}
function Af() {
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
function kf(e, t = Ys) {
  const r = [];
  for (const n of t) {
    n.pattern.lastIndex = 0;
    let s;
    for (; (s = n.pattern.exec(e)) !== null; ) r.push({
      pattern: n.name,
      variable: s[1] ?? s[0],
      start: s.index,
      end: s.index + s[0].length
    });
  }
  return r;
}
function $f(e, t, r) {
  return r && e >= r ? "error" : t && e >= t ? "warning" : null;
}
var _r = {
  profile: "none",
  capability_mode: "none",
  supported_profiles: [
    "none",
    "core",
    "core+exchange",
    "core+queue",
    "full"
  ],
  schema_version: 1,
  modules: {
    exchange: {
      enabled: !1,
      visible: !1,
      entry: { enabled: !1 },
      actions: {}
    },
    queue: {
      enabled: !1,
      visible: !1,
      entry: { enabled: !1 },
      actions: {}
    }
  },
  features: {
    cms: !1,
    dashboard: !1,
    suggestions: {
      enabled: !1,
      service_configured: !1,
      queue_enabled: !1,
      permission: "admin.translations.suggest",
      command_name: "translations.suggestions.generate",
      command_registered: !1,
      command_dispatchable: !1,
      inline_result_supported: !1,
      rpc_allowed: !1
    }
  },
  routes: {},
  panels: [],
  resolver_keys: [],
  warnings: []
};
function or(e) {
  if (typeof e != "string") return "none";
  const t = e.toLowerCase().trim();
  return [
    "none",
    "core",
    "core+exchange",
    "core+queue",
    "full"
  ].includes(t) ? t : "none";
}
function Lr(e) {
  if (!e || typeof e != "object") return null;
  const t = e;
  return {
    enabled: t.enabled === !0,
    reason: typeof t.reason == "string" ? t.reason : void 0,
    reason_code: typeof t.reason_code == "string" ? t.reason_code : void 0,
    permission: typeof t.permission == "string" ? t.permission : void 0
  };
}
function kn(e) {
  if (typeof e == "boolean") return {
    enabled: e,
    visible: e,
    entry: { enabled: e },
    actions: {}
  };
  if (!e || typeof e != "object") return {
    enabled: !1,
    visible: !1,
    entry: { enabled: !1 },
    actions: {}
  };
  const t = e, r = t.enabled === !0, n = Lr(t.entry), s = typeof t.visible == "boolean" ? t.visible : r && (n ? n.enabled : !0), i = t.actions && typeof t.actions == "object" ? t.actions : {}, o = {};
  for (const [a, l] of Object.entries(i)) {
    const c = Lr(l);
    c && (o[a] = c);
  }
  return {
    enabled: r,
    visible: s,
    entry: n ?? { enabled: r },
    actions: o
  };
}
function od(e) {
  const t = e && typeof e == "object" ? e : {}, r = Lr(t) ?? { enabled: !1 };
  return {
    ...r,
    permission: typeof t.permission == "string" ? t.permission : r.permission ?? "admin.translations.suggest",
    service_configured: t.service_configured === !0,
    queue_enabled: t.queue_enabled === !0,
    command_name: typeof t.command_name == "string" && t.command_name.trim() ? t.command_name.trim() : "translations.suggestions.generate",
    command_registered: t.command_registered === !0,
    command_dispatchable: t.command_dispatchable === !0,
    inline_result_supported: t.inline_result_supported === !0,
    rpc_allowed: t.rpc_allowed === !0
  };
}
function ad(e) {
  if (!e || typeof e != "object") return {};
  const t = e, r = {};
  for (const [n, s] of Object.entries(t)) {
    const i = typeof s == "string" ? s.trim() : "";
    i && (r[n] = i);
  }
  return r;
}
function ld(e) {
  if (!e || typeof e != "object") return { ..._r };
  const t = e, r = typeof t.modules == "object" && t.modules ? t.modules : {}, n = typeof t.features == "object" && t.features ? t.features : {};
  return {
    profile: or(t.profile ?? t.capability_mode),
    capability_mode: or(t.capability_mode ?? t.profile),
    supported_profiles: Array.isArray(t.supported_profiles) ? t.supported_profiles.map(or).filter((s, i, o) => o.indexOf(s) === i) : [..._r.supported_profiles],
    schema_version: typeof t.schema_version == "number" ? t.schema_version : 1,
    modules: {
      exchange: kn(r.exchange),
      queue: kn(r.queue)
    },
    features: {
      cms: typeof n.cms == "boolean" ? n.cms : !1,
      dashboard: typeof n.dashboard == "boolean" ? n.dashboard : !1,
      suggestions: od(n.suggestions)
    },
    routes: ad(t.routes),
    panels: Array.isArray(t.panels) ? t.panels.filter((s) => typeof s == "string") : [],
    resolver_keys: Array.isArray(t.resolver_keys) ? t.resolver_keys.filter((s) => typeof s == "string") : [],
    warnings: Array.isArray(t.warnings) ? t.warnings.filter((s) => typeof s == "string") : [],
    contracts: typeof t.contracts == "object" && t.contracts ? t.contracts : void 0
  };
}
function _f(e) {
  return typeof e == "string" && [
    "none",
    "core",
    "core+exchange",
    "core+queue",
    "full"
  ].includes(e) ? e : "none";
}
function cd(e) {
  return e === "core+exchange" || e === "full";
}
function dd(e) {
  return e === "core+queue" || e === "full";
}
function Lf(e) {
  return e !== "none";
}
function ud(e) {
  return !e || typeof e != "object" ? null : ld(e);
}
var Ws = class {
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
    return e === "exchange" ? cd(t) : dd(t);
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
function $n(e) {
  const t = ud(e);
  return t ? new Ws(t) : null;
}
function Tf() {
  return new Ws({ ..._r });
}
function Df(e) {
  return e.visible ? e.enabled ? "" : `aria-disabled="true"${e.reason ? ` title="${w(e.reason)}"` : ""}` : 'aria-hidden="true" style="display: none;"';
}
function fd(e) {
  if (e.enabled || !e.reason) return "";
  const t = (e.reasonCode || "").trim();
  return t ? Kn(t, {
    size: "sm",
    showFullMessage: !0
  }) : `
    <span class="capability-gate-reason text-gray-500 bg-gray-100"
          role="status"
          aria-label="${w(e.reason)}">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 inline-block mr-1">
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clip-rule="evenodd" />
      </svg>
      ${f(e.reason)}
    </span>
  `.trim();
}
function Rf() {
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
function hd(e, t) {
  if (!t.visible) {
    e.style.display = "none", e.setAttribute("aria-hidden", "true");
    return;
  }
  e.style.display = "", e.removeAttribute("aria-hidden"), t.enabled ? (e.removeAttribute("aria-disabled"), e.classList.remove("capability-gate-disabled"), e.removeAttribute("title"), delete e.dataset.reasonCode, e.removeEventListener("click", _n, !0)) : (e.setAttribute("aria-disabled", "true"), e.classList.add("capability-gate-disabled"), t.reason && (e.setAttribute("title", t.reason), e.dataset.reasonCode = t.reasonCode || ""), e.addEventListener("click", _n, !0));
}
function _n(e) {
  e.currentTarget.getAttribute("aria-disabled") === "true" && (e.preventDefault(), e.stopPropagation());
}
function Mf(e, t) {
  e.querySelectorAll("[data-capability-gate]").forEach((r) => {
    const n = r.dataset.capabilityGate;
    if (n)
      try {
        const s = JSON.parse(n);
        hd(r, t.gateNavItem(s));
      } catch {
        console.warn("Invalid capability gate config:", n);
      }
  });
}
async function pd(e) {
  return Tn(e);
}
var md = {
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
}, gd = [
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
], bd = class extends Ln {
  constructor(e) {
    super("loading"), this.container = null, this.gateResult = null, this.data = null, this.error = null, this.activePreset = "all", this.refreshTimer = null, this.config = {
      myWorkEndpoint: e.myWorkEndpoint,
      queueEndpoint: e.queueEndpoint || "",
      panelBaseUrl: e.panelBaseUrl || "",
      capabilityGate: e.capabilityGate,
      filterPresets: e.filterPresets || gd,
      refreshInterval: e.refreshInterval || 0,
      onAssignmentClick: e.onAssignmentClick,
      onActionClick: e.onActionClick,
      labels: {
        ...md,
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
      const e = this.config.filterPresets.find((s) => s.id === this.activePreset), t = new URLSearchParams(e?.filters || {}), r = `${this.config.myWorkEndpoint}${t.toString() ? "?" + t.toString() : ""}`, n = await fetch(r, { headers: { Accept: "application/json" } });
      if (!n.ok) throw new Error(`Failed to load: ${n.status}`);
      this.data = await pd(n), this.state = this.data.assignments.length === 0 ? "empty" : "loaded", this.error = null;
    } catch (e) {
      this.error = e instanceof Error ? e : new Error(String(e)), this.state = "error";
    }
    this.render();
  }
  render() {
    if (!this.container) return;
    const e = this.config.labels;
    this.container.innerHTML = `
      <div class="translator-dashboard" role="region" aria-label="${f(e.title)}">
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
        <h2 class="dashboard-title">${f(e.title)}</h2>
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
  renderSummaryCard(e, t, r, n) {
    return `
      <div class="summary-card ${n}" role="listitem" data-summary="${e}">
        <div class="summary-count">${r}</div>
        <div class="summary-label">${f(t)}</div>
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
    const t = this.activePreset === e.id, r = e.badge?.() ?? null, n = r !== null ? `<span class="filter-badge">${r}</span>` : "";
    return `
      <button type="button"
              class="filter-preset ${t ? "active" : ""}"
              role="tab"
              aria-selected="${t}"
              data-preset="${e.id}">
        ${e.icon || ""}
        <span class="filter-label">${f(e.label)}</span>
        ${n}
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
        <p>${f(e.loading)}</p>
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
        <p class="error-message">${f(e.error)}</p>
        ${this.error ? `<p class="error-detail">${f(this.error.message)}</p>` : ""}
        <button type="button" class="retry-btn">${f(e.retry)}</button>
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
        <p class="empty-title">${f(e.noAssignments)}</p>
        <p class="empty-description">${f(e.noAssignmentsDescription)}</p>
      </div>
    `;
  }
  renderDisabled() {
    const e = this.gateResult?.reason || "Access to this feature is not available.", t = this.gateResult ? fd(this.gateResult) : "";
    return `
      <div class="dashboard-disabled" role="alert" aria-live="polite">
        <div class="disabled-icon">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-12 h-12 text-gray-400">
            <path fill-rule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clip-rule="evenodd" />
          </svg>
        </div>
        <p class="disabled-title">Translator Dashboard Unavailable</p>
        <p class="disabled-description">${f(e)}</p>
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
              <th scope="col">${f(e.sourceTitle)}</th>
              <th scope="col">${f(e.targetLocale)}</th>
              <th scope="col">${f(e.status)}</th>
              <th scope="col">${f(e.dueDate)}</th>
              <th scope="col">${f(e.priority)}</th>
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
    const t = yd(e.due_state), r = vd(e.priority), n = Ie(e.queue_state, {
      domain: "queue",
      size: "sm"
    }), s = e.due_date ? xd(new Date(e.due_date)) : "-";
    return `
      <tr class="assignment-row" data-assignment-id="${w(e.id)}">
        <td class="title-cell">
          <div class="title-content">
            <span class="source-title">${f(e.source_title || e.source_path || e.id)}</span>
            <span class="entity-type">${f(e.entity_type)}</span>
          </div>
        </td>
        <td class="locale-cell">
          <span class="locale-badge">${f(e.target_locale.toUpperCase())}</span>
          <span class="locale-arrow">←</span>
          <span class="locale-badge source">${f(e.source_locale.toUpperCase())}</span>
        </td>
        <td class="status-cell">
          ${n}
        </td>
        <td class="due-cell ${t}">
          ${s}
        </td>
        <td class="priority-cell">
          <span class="priority-indicator ${r}">${f(wd(e.priority))}</span>
        </td>
        <td class="actions-cell">
          ${this.renderAssignmentActions(e)}
        </td>
      </tr>
    `;
  }
  renderAssignmentActions(e) {
    const t = this.config.labels, r = [], n = typeof this.config.onActionClick == "function";
    r.push(`
      <button type="button" class="action-btn open-btn" data-action="open" title="${w(t.openAssignment)}">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
          <path d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 01-.65-.65z" />
          <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0010 3H4.75A2.75 2.75 0 002 5.75v9.5A2.75 2.75 0 004.75 18h9.5A2.75 2.75 0 0017 15.25V10a.75.75 0 00-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5z" />
        </svg>
      </button>
    `);
    const s = e.review_actions;
    return n && e.queue_state === "in_progress" && s.submit_review.enabled && r.push(`
        <button type="button" class="action-btn submit-review-btn" data-action="submit_review" title="${w(t.submitForReview)}">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd" />
          </svg>
        </button>
      `), n && e.queue_state === "review" && (s.approve.enabled && r.push(`
          <button type="button" class="action-btn approve-btn" data-action="approve" title="${w(t.approve)}">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
              <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" />
            </svg>
          </button>
        `), s.reject.enabled && r.push(`
          <button type="button" class="action-btn reject-btn" data-action="reject" title="${w(t.reject)}">
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
      const r = this.data.assignments.find((n) => n.id === t);
      r && (e.querySelectorAll(".action-btn").forEach((n) => {
        n.addEventListener("click", async (s) => {
          s.stopPropagation();
          const i = n.dataset.action;
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
    const r = e.entity_type.trim(), n = e.target_record_id.trim() || e.source_record_id.trim();
    return !r || !n ? "" : `${t}/${encodeURIComponent(r)}/${encodeURIComponent(n)}/edit`;
  }
};
function yd(e) {
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
function vd(e) {
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
function wd(e) {
  return e.charAt(0).toUpperCase() + e.slice(1);
}
function xd(e) {
  const t = /* @__PURE__ */ new Date(), r = e.getTime() - t.getTime(), n = Math.ceil(r / 864e5);
  return n < 0 ? `${Math.abs(n)}d overdue` : n === 0 ? "Today" : n === 1 ? "Tomorrow" : n <= 7 ? `${n}d` : e.toLocaleDateString(void 0, {
    month: "short",
    day: "numeric"
  });
}
function If() {
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
function Sd(e, t) {
  const r = new bd(t);
  return r.mount(e), r;
}
function Pf(e) {
  return Cd(e);
}
function Cd(e, t = {}) {
  const r = e.dataset.myWorkEndpoint;
  if (!r)
    return console.warn("TranslatorDashboard: Missing data-my-work-endpoint attribute"), null;
  const n = Ed(t);
  return Sd(e, {
    myWorkEndpoint: r,
    panelBaseUrl: e.dataset.panelBaseUrl,
    queueEndpoint: e.dataset.queueEndpoint,
    refreshInterval: parseInt(e.dataset.refreshInterval || "0", 10),
    capabilityGate: n || void 0
  });
}
function Ed(e) {
  if (e.capabilityGate) return e.capabilityGate;
  if (e.capabilitiesPayload !== void 0) return $n(e.capabilitiesPayload);
  const t = Ad();
  return t === null ? null : $n(t);
}
function Ad() {
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
async function ar(e) {
  return Tn(e);
}
var kd = {
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
}, $d = class extends Ln {
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
      ...kd,
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
        const n = await j(this.config.validateEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json"
          },
          body: this.rawData
        });
        if (!n.ok) throw new Error(`Validation failed: ${n.status}`);
        const s = await ar(n);
        return this.handleValidationResult(s), s;
      } else throw new Error("No file or data to validate");
      const t = await j(this.config.validateEndpoint, {
        method: "POST",
        body: e
      });
      if (!t.ok) throw new Error(`Validation failed: ${t.status}`);
      const r = await ar(t);
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
      const n = this.config.capabilityGate.gateAction("exchange", "import.apply");
      if (!n.enabled)
        return this.error = new Error(n.reason || this.config.labels.applyDisabledReason), this.render(), null;
    }
    this.state = "applying", this.error = null, this.render();
    try {
      const n = {
        rows: (this.validationResult?.results.filter((o) => r.includes(o.index)) || []).map((o) => {
          const a = this.previewRows.find((l) => l.index === o.index);
          return {
            ...o,
            resolution: a?.resolution
          };
        }),
        allow_create_missing: t.allowCreateMissing,
        allow_source_hash_override: t.allowSourceHashOverride,
        continue_on_error: t.continueOnError,
        dry_run: t.dryRun,
        async: t.async
      }, s = await j(this.config.applyEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify(n)
      });
      if (!s.ok) throw new Error(`Apply failed: ${s.status}`);
      const i = await ar(s);
      return this.state = "applied", this.config.onApplyComplete?.(i), this.render(), i;
    } catch (n) {
      return this.error = n instanceof Error ? n : new Error(String(n)), this.state = "error", this.config.onError?.(this.error), this.render(), null;
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
    const r = this.previewRows.find((n) => n.index === e);
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
      <div class="exchange-import" role="region" aria-label="${f(e.title)}">
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
        <h3 class="import-title">${f(e.title)}</h3>
        ${this.validationResult ? this.renderSummaryBadges() : ""}
      </div>
    `;
  }
  renderSummaryBadges() {
    if (!this.validationResult) return "";
    const e = this.validationResult.summary, t = this.config.labels;
    return `
      <div class="import-summary-badges">
        <span class="summary-badge success">${e.succeeded} ${f(t.success)}</span>
        <span class="summary-badge error">${e.failed} ${f(t.error)}</span>
        <span class="summary-badge conflict">${e.conflicts} ${f(t.conflict)}</span>
        <span class="summary-badge skipped">${e.skipped} ${f(t.skipped)}</span>
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
          <span class="dropzone-text">${f(e.selectFile)}</span>
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
        <p>${f(e)}</p>
      </div>
    `;
  }
  renderPreviewGrid() {
    const e = this.config.labels, t = this.getSelectedIndices().length, r = this.previewRows.length;
    return `
      <div class="import-preview">
        <div class="preview-toolbar">
          <div class="selection-controls">
            <button type="button" class="select-all-btn">${f(e.selectAll)}</button>
            <button type="button" class="deselect-all-btn">${f(e.deselectAll)}</button>
            <span class="selection-count">${t} / ${r} ${f(e.selectedCount)}</span>
          </div>
          <div class="import-options">
            <label class="option-checkbox">
              <input type="checkbox" name="allowCreateMissing" ${this.applyOptions.allowCreateMissing ? "checked" : ""} />
              ${f(e.allowCreateMissing)}
            </label>
            <label class="option-checkbox">
              <input type="checkbox" name="continueOnError" ${this.applyOptions.continueOnError ? "checked" : ""} />
              ${f(e.continueOnError)}
            </label>
            <label class="option-checkbox">
              <input type="checkbox" name="dryRun" ${this.applyOptions.dryRun ? "checked" : ""} />
              ${f(e.dryRun)}
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
                <th scope="col">${f(e.resource)}</th>
                <th scope="col">${f(e.field)}</th>
                <th scope="col">${f(e.status)}</th>
                <th scope="col">${f(e.translatedText)}</th>
                <th scope="col">${f(e.conflictResolution)}</th>
              </tr>
            </thead>
            <tbody>
              ${this.previewRows.map((n) => this.renderPreviewRow(n)).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }
  renderPreviewRow(e) {
    this.config.labels;
    const t = Un(e.status, "exchange"), r = e.status === "error", n = Ie(e.status, {
      domain: "exchange",
      size: "sm"
    });
    return `
      <tr class="preview-row ${t} ${e.isSelected ? "selected" : ""}" data-index="${e.index}">
        <td class="select-col">
          <input type="checkbox" class="row-checkbox" ${e.isSelected ? "checked" : ""} ${r ? "disabled" : ""} />
        </td>
        <td class="resource-cell">
          <span class="resource-type">${f(e.resource)}</span>
          <span class="entity-id">${f(e.entityId)}</span>
        </td>
        <td class="field-cell">${f(e.fieldPath)}</td>
        <td class="status-cell">
          ${n}
          ${e.error ? `<span class="error-message" title="${w(e.error)}">${f(_d(e.error, 30))}</span>` : ""}
        </td>
        <td class="translation-cell">
          <span class="translation-text" title="${w(e.targetLocale)}">${f(e.targetLocale)}</span>
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
        <option value="skip" ${r === "skip" ? "selected" : ""}>${f(t.skip)}</option>
        <option value="keep_current" ${r === "keep_current" ? "selected" : ""}>${f(t.keepCurrent)}</option>
        <option value="accept_incoming" ${r === "accept_incoming" ? "selected" : ""}>${f(t.acceptIncoming)}</option>
        <option value="force" ${r === "force" ? "selected" : ""}>${f(t.force)}</option>
      </select>
      ${e.conflict ? `<button type="button" class="conflict-details-btn" data-index="${e.index}" title="${w(t.conflictDetails)}">?</button>` : ""}
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
        <p class="error-message">${f(this.error?.message || e.error)}</p>
        <button type="button" class="reset-btn">${f(e.cancelButton)}</button>
      </div>
    `;
  }
  renderFooter() {
    const e = this.config.labels, t = this.state === "validated" && this.getSelectedIndices().length > 0, r = this.getApplyGate();
    return `
      <div class="import-footer">
        <button type="button" class="cancel-btn">${f(e.cancelButton)}</button>
        ${this.state === "idle" ? `
          <button type="button" class="validate-btn" ${!this.file && !this.rawData ? "disabled" : ""}>
            ${f(e.validateButton)}
          </button>
        ` : ""}
        ${this.state === "validated" ? `
          <button type="button"
                  class="apply-btn"
                  ${!t || !r.enabled ? "disabled" : ""}
                  ${r.enabled ? "" : `aria-disabled="true" title="${w(r.reason || e.applyDisabledReason)}"`}>
            ${f(e.applyButton)}
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
function _d(e, t) {
  return e.length <= t ? e : e.slice(0, t - 3) + "...";
}
function Bf() {
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
function Ld(e, t) {
  const r = new $d(t);
  return r.mount(e), r;
}
function Of(e) {
  const t = e.dataset.validateEndpoint, r = e.dataset.applyEndpoint;
  return !t || !r ? (console.warn("ExchangeImport: Missing required data attributes"), null) : Ld(e, {
    validateEndpoint: t,
    applyEndpoint: r
  });
}
var Td = {
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
}, Dd = 2e3, Rd = 300, Md = "async_job_", Xs = class {
  constructor(e = {}) {
    this.container = null, this.job = null, this.pollingState = "idle", this.pollTimer = null, this.pollAttempts = 0, this.startTime = null, this.error = null;
    const t = {
      ...Td,
      ...e.labels || {}
    };
    this.config = {
      storageKeyPrefix: e.storageKeyPrefix || Md,
      pollInterval: e.pollInterval || Dd,
      maxPollAttempts: e.maxPollAttempts || Rd,
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
        const n = JSON.parse(r);
        n.lastPolledAt = (/* @__PURE__ */ new Date()).toISOString(), localStorage.setItem(t, JSON.stringify(n));
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
      <div class="async-progress" role="region" aria-label="${f(e.title)}">
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
          <h4 class="progress-title">${f(e.title)}</h4>
          <span class="progress-status">${f(e.noActiveJob)}</span>
        </div>
      `;
    const t = Un(this.job.status, "exchange"), r = this.getStatusLabel(), n = this.pollingState === "paused" ? `<span class="progress-status ${t}">${f(r)}</span>` : Ie(this.job.status, {
      domain: "exchange",
      size: "sm"
    });
    return `
      <div class="progress-header ${t}">
        <h4 class="progress-title">${f(e.title)}</h4>
        ${n}
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
            <span class="counter-label">${f(e.processed)}:</span>
            <span class="counter-value">${t.processed}${t.total ? ` / ${t.total}` : ""}</span>
          </span>
          <span class="counter succeeded">
            <span class="counter-label">${f(e.succeeded)}:</span>
            <span class="counter-value">${t.succeeded}</span>
          </span>
          <span class="counter failed">
            <span class="counter-label">${f(e.failedCount)}:</span>
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
          <span class="info-label">${f(e.jobId)}:</span>
          <code class="info-value">${f(this.job.id)}</code>
        </span>
        ${t ? `
          <span class="info-item">
            <span class="info-label">${f(e.elapsed)}:</span>
            <span class="info-value">${f(t)}</span>
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
          <span class="conflicts-label">${f(e.conflicts)}:</span>
          <span class="conflicts-count">${t.total}</span>
        </span>
        <div class="conflicts-by-type">
          ${Object.entries(t.by_type).map(([r, n]) => `
              <span class="conflict-type">
                <span class="type-name">${f(r)}:</span>
                <span class="type-count">${n}</span>
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
        <span class="error-message">${f(e)}</span>
      </div>
    ` : "";
  }
  renderFooter() {
    const e = this.config.labels, t = [];
    return this.pollingState === "paused" && t.push(`<button type="button" class="resume-btn">${f(e.resume)}</button>`), this.pollingState === "polling" && t.push(`<button type="button" class="cancel-btn">${f(e.cancel)}</button>`), (this.error || this.job?.status === "failed") && t.push(`<button type="button" class="retry-btn">${f(e.retry)}</button>`), (this.job?.status === "completed" || this.job?.status === "failed") && t.push(`<button type="button" class="dismiss-btn">${f(e.dismiss)}</button>`), t.length === 0 ? "" : `
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
    const r = Math.floor(t / 60), n = t % 60;
    return r < 60 ? `${r}m ${n}s` : `${Math.floor(r / 60)}h ${r % 60}m`;
  }
  attachEventListeners() {
    this.container && (this.container.querySelector(".resume-btn")?.addEventListener("click", () => this.resumePolling()), this.container.querySelector(".cancel-btn")?.addEventListener("click", () => this.stopPolling()), this.container.querySelector(".retry-btn")?.addEventListener("click", () => this.retry()), this.container.querySelector(".dismiss-btn")?.addEventListener("click", () => this.reset()));
  }
};
function Ff() {
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
function Id(e, t) {
  const r = new Xs(t);
  return r.mount(e), r;
}
function qf(e) {
  return Id(e, {
    pollInterval: e.dataset.pollInterval ? parseInt(e.dataset.pollInterval, 10) : void 0,
    autoStart: e.dataset.autoStart !== "false"
  });
}
function Nf(e, t) {
  const r = new Xs(t);
  return r.hasPersistedJob(e) ? r : null;
}
var lr = {
  sourceColumn: "Source",
  targetColumn: "Translation",
  driftBannerTitle: "Source content has changed",
  driftBannerDescription: "The source content has been updated since this translation was last edited.",
  driftAcknowledgeButton: "Acknowledge",
  driftViewChangesButton: "View Changes",
  copySourceButton: "Copy from source",
  fieldChangedIndicator: "Source changed"
};
function Pd(e) {
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
    const n = r.changed_fields_summary;
    n && typeof n == "object" && (t.changedFieldsSummary.count = typeof n.count == "number" ? n.count : 0, t.changedFieldsSummary.fields = Array.isArray(n.fields) ? n.fields.filter((s) => typeof s == "string") : []), t.hasDrift = t.changedFieldsSummary.count > 0 || t.changedFieldsSummary.fields.length > 0;
  }
  return t;
}
function Bd(e, t) {
  return !e || !e.hasDrift ? !1 : e.changedFieldsSummary.fields.some((r) => r.toLowerCase() === t.toLowerCase());
}
function jf(e) {
  return !e || !e.hasDrift ? [] : [...e.changedFieldsSummary.fields];
}
var Od = class {
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
        ...lr,
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
    const { drift: e, labels: t, sourceLocale: r, targetLocale: n, fields: s } = this.config, i = this.shouldShowDriftBanner() ? this.renderDriftBanner(e, t) : "", o = s.map((a) => this.renderFieldRow(a, t)).join("");
    return `
      <div class="side-by-side-editor" data-source-locale="${r}" data-target-locale="${n}">
        ${i}
        <div class="sbs-columns">
          <div class="sbs-header">
            <div class="sbs-column-header sbs-source-header">
              <span class="sbs-column-title">${f(t.sourceColumn)}</span>
              <span class="sbs-locale-badge">${r.toUpperCase()}</span>
            </div>
            <div class="sbs-column-header sbs-target-header">
              <span class="sbs-column-title">${f(t.targetColumn)}</span>
              <span class="sbs-locale-badge">${n.toUpperCase()}</span>
            </div>
          </div>
          <div class="sbs-fields">
            ${o}
          </div>
        </div>
      </div>
    `;
  }
  renderDriftBanner(e, t) {
    const r = {
      ...lr,
      ...t
    }, n = e.changedFieldsSummary.count, s = e.changedFieldsSummary.fields, i = s.length > 0 ? `<ul class="sbs-drift-fields-list">${s.map((o) => `<li>${f(o)}</li>`).join("")}</ul>` : "";
    return `
      <div class="sbs-drift-banner" role="alert" aria-live="polite" data-drift-banner="true">
        <div class="sbs-drift-icon">
          <svg class="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
          </svg>
        </div>
        <div class="sbs-drift-content">
          <h3 class="sbs-drift-title">${f(r.driftBannerTitle)}</h3>
          <p class="sbs-drift-description">
            ${f(r.driftBannerDescription)}
            ${n > 0 ? `<span class="sbs-drift-count">${n} field${n !== 1 ? "s" : ""} changed.</span>` : ""}
          </p>
          ${i}
        </div>
        <div class="sbs-drift-actions">
          <button type="button" class="sbs-drift-acknowledge" data-action="acknowledge-drift">
            ${f(r.driftAcknowledgeButton)}
          </button>
        </div>
      </div>
    `;
  }
  renderFieldRow(e, t) {
    const r = {
      ...lr,
      ...t
    }, n = e.hasSourceChanged ? `<span class="sbs-field-changed" title="${f(r.fieldChangedIndicator)}">
          <svg class="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clip-rule="evenodd" />
          </svg>
        </span>` : "", s = this.renderSourceField(e), i = this.renderTargetField(e), o = `
      <button type="button"
              class="sbs-copy-source"
              data-action="copy-source"
              data-field="${w(e.key)}"
              title="${w(r.copySourceButton)}"
              aria-label="${w(r.copySourceButton)} for ${w(e.label)}">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
        </svg>
      </button>
    `;
    return `
      <div class="${e.hasSourceChanged ? "sbs-field-row sbs-field-changed-row" : "sbs-field-row"}" data-field-key="${w(e.key)}">
        <div class="sbs-field-header">
          <label class="sbs-field-label">
            ${f(e.label)}
            ${e.required ? '<span class="sbs-required">*</span>' : ""}
          </label>
          ${n}
        </div>
        <div class="sbs-field-content">
          <div class="sbs-source-field">
            ${s}
          </div>
          <div class="sbs-field-actions">
            ${o}
          </div>
          <div class="sbs-target-field">
            ${i}
          </div>
        </div>
      </div>
    `;
  }
  renderSourceField(e) {
    const t = f(e.sourceValue || "");
    return e.type === "textarea" || e.type === "richtext" || e.type === "html" ? `
        <div class="sbs-source-content sbs-textarea-field"
             data-field="${w(e.key)}"
             aria-label="Source: ${w(e.label)}">
          ${t || '<span class="sbs-empty">Empty</span>'}
        </div>
      ` : `
      <div class="sbs-source-content sbs-text-field"
           data-field="${w(e.key)}"
           aria-label="Source: ${w(e.label)}">
        ${t || '<span class="sbs-empty">Empty</span>'}
      </div>
    `;
  }
  renderTargetField(e) {
    const t = f(e.targetValue || ""), r = e.placeholder ? `placeholder="${w(e.placeholder)}"` : "", n = e.required ? "required" : "", s = e.maxLength ? `maxlength="${e.maxLength}"` : "";
    return e.type === "textarea" || e.type === "richtext" || e.type === "html" ? `
        <textarea class="sbs-target-input sbs-textarea-input"
                  name="${w(e.key)}"
                  data-field="${w(e.key)}"
                  aria-label="Translation: ${w(e.label)}"
                  ${r}
                  ${n}
                  ${s}>${t}</textarea>
      ` : `
      <input type="text"
             class="sbs-target-input sbs-text-input"
             name="${w(e.key)}"
             data-field="${w(e.key)}"
             value="${t}"
             aria-label="Translation: ${w(e.label)}"
             ${r}
             ${n}
             ${s}>
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
        const n = r.currentTarget.dataset.field;
        n && this.copySourceToTarget(n);
      });
    }), this.container.querySelectorAll(".sbs-target-input").forEach((t) => {
      t.addEventListener("input", (r) => {
        const n = r.target, s = n.dataset.field;
        s && this.config.onChange && this.config.onChange(s, n.value);
      });
    });
  }
  acknowledgeDrift() {
    this.driftAcknowledged = !0;
    const e = this.container?.querySelector("[data-drift-banner]");
    e && (e.classList.add("sbs-drift-acknowledged"), setTimeout(() => e.remove(), 300)), this.config.onDriftAcknowledge && this.config.onDriftAcknowledge();
  }
  copySourceToTarget(e) {
    const t = this.config.fields.find((n) => n.key === e);
    if (!t) return;
    const r = this.container?.querySelector(`.sbs-target-input[data-field="${e}"]`);
    if (r) {
      r.value = t.sourceValue || "";
      const n = new Event("input", { bubbles: !0 });
      r.dispatchEvent(n);
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
function Fd(e) {
  const t = new Od(e);
  return t.render(), t;
}
function zf(e, t, r, n, s) {
  const i = Pd(t);
  return Fd({
    container: e,
    fields: n.map((o) => ({
      key: o,
      label: o.replace(/_/g, " ").replace(/\b\w/g, (a) => a.toUpperCase()),
      type: "text",
      hasSourceChanged: Bd(i, o),
      sourceValue: String(r[o] || ""),
      targetValue: String(t[o] || ""),
      sourceLocale: s.sourceLocale || "en",
      targetLocale: s.targetLocale || ""
    })),
    drift: i,
    sourceLocale: s.sourceLocale || "en",
    targetLocale: s.targetLocale || "",
    panelName: s.panelName || "",
    recordId: s.recordId || "",
    ...s
  });
}
function Gf() {
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
  Si as ActionRenderer,
  Iu as AdvancedSearch,
  Xs as AsyncProgress,
  Vs as AutosaveIndicator,
  dr as CORE_READINESS_DISPLAY,
  Ws as CapabilityGate,
  so as CellRendererRegistry,
  nd as CharacterCounter,
  hl as ColumnManager,
  ku as CommonRenderers,
  gd as DEFAULT_FILTER_PRESETS,
  Ys as DEFAULT_INTERPOLATION_PATTERNS,
  rd as DEFAULT_SAMPLE_VALUES,
  lr as DEFAULT_SIDE_BY_SIDE_LABELS,
  Tc as DEFAULT_STATUS_LEGEND_ITEMS,
  qs as DEFAULT_TRANSLATION_QUICK_FILTERS,
  nt as DISABLED_REASON_DISPLAY,
  Ms as DataGrid,
  vc as DefaultColumnVisibilityBehavior,
  _c as DetailActionsController,
  id as DirectionToggle,
  mr as EXCHANGE_JOB_STATUS_DISPLAY,
  pr as EXCHANGE_ROW_STATUS_DISPLAY,
  $d as ExchangeImport,
  Xr as FallbackBanner,
  Pu as FilterBuilder,
  ju as GoCrudBulkActionBehavior,
  Nu as GoCrudExportBehavior,
  Ou as GoCrudFilterBehavior,
  Fu as GoCrudPaginationBehavior,
  Bu as GoCrudSearchBehavior,
  qu as GoCrudSortBehavior,
  js as InlineLocaleChips,
  sd as InterpolationPreview,
  Gs as KeyboardShortcutRegistry,
  Zn as LocalDataGridStateStore,
  jt as LocaleActionChip,
  Bn as PayloadInputModal,
  po as PreferencesDataGridStateStore,
  fr as QUEUE_CONTENT_STATE_DISPLAY,
  hr as QUEUE_DUE_STATE_DISPLAY,
  ur as QUEUE_STATE_DISPLAY,
  Rc as QuickFilters,
  Bs as SchemaActionBuilder,
  zu as ServerColumnVisibilityBehavior,
  Od as SideBySideEditor,
  Fs as StatusLegend,
  Lc as TranslationBlockerModal,
  Ic as TranslationPanel,
  bd as TranslatorDashboard,
  qc as applyFormLock,
  hd as applyGateToElement,
  Wc as applyShortcutSettings,
  An as buildLocaleEditUrl,
  Gu as buildSchemaRowActions,
  Nf as checkForPersistedJob,
  Tu as collapseAllGroups,
  Id as createAsyncProgress,
  ef as createBulkCreateMissingHandler,
  $n as createCapabilityGate,
  mo as createDataGridStateStore,
  Tf as createEmptyCapabilityGate,
  Ld as createExchangeImport,
  ff as createInlineLocaleChipsRenderer,
  Vi as createLocaleBadgeRenderer,
  ou as createReasonCodeCellRenderer,
  Fd as createSideBySideEditor,
  iu as createStatusCellRenderer,
  Dc as createStatusLegend,
  yf as createTranslationAutosave,
  Eu as createTranslationMatrixRenderer,
  Xu as createTranslationPanel,
  Mc as createTranslationQuickFilters,
  Uc as createTranslationShortcuts,
  rn as createTranslationStatusRenderer,
  Sd as createTranslatorDashboard,
  Do as decodeExpandedGroupsToken,
  kf as detectInterpolations,
  Jc as dismissShortcutHint,
  Mu as encodeExpandedGroupsToken,
  Pc as executeBulkCreateMissing,
  Lu as expandAllGroups,
  Ao as extractBackendSummaries,
  ud as extractCapabilities,
  Hd as extractExchangeError,
  Hu as extractSchemaActions,
  Pd as extractSourceTargetDrift,
  he as extractTranslationContext,
  W as extractTranslationReadiness,
  zs as formatShortcutDisplay,
  Ud as generateExchangeReport,
  Hn as getActionBlockDisplay,
  ru as getAllReasonCodes,
  Ff as getAsyncProgressStyles,
  wf as getAutosaveIndicatorStyles,
  Rf as getCapabilityGateStyles,
  jf as getChangedFields,
  $f as getCharCountSeverity,
  gf as getDefaultShortcutRegistry,
  Fr as getDisabledReasonDisplay,
  Bf as getExchangeImportStyles,
  Du as getExpandedGroupIds,
  Af as getFieldHelperStyles,
  sf as getFormLockReason,
  se as getLocaleLabel,
  Cu as getMissingTranslationsCount,
  Gc as getModifierSymbol,
  ko as getPersistedExpandState,
  To as getPersistedViewMode,
  zc as getPrimaryModifierLabel,
  nu as getSeverityCssClass,
  Gf as getSideBySideEditorStyles,
  Un as getStatusCssClass,
  Me as getStatusDisplay,
  lu as getStatusVocabularyStyles,
  tu as getStatusesForDomain,
  If as getTranslatorDashboardStyles,
  zr as getViewModeForViewport,
  Vd as groupRowResultsByStatus,
  Fa as handleDelete,
  es as hasBackendGroupedRows,
  Bd as hasFieldDrift,
  Su as hasMissingTranslations,
  du as hasTranslationContext,
  mu as hasTranslationReadiness,
  qf as initAsyncProgress,
  Mf as initCapabilityGating,
  Of as initExchangeImport,
  lf as initFallbackBanner,
  Sf as initFieldHelpers,
  xf as initFormAutosave,
  cf as initFormLock,
  uf as initInlineLocaleChips,
  Xc as initKeyboardShortcuts,
  bf as initKeyboardShortcutsWithDiscovery,
  rf as initLocaleActionChips,
  Uu as initPanelDetailActions,
  Yu as initQuickFilters,
  zf as initSideBySideEditorFromRecord,
  Ku as initStatusLegends,
  Pf as initTranslatorDashboard,
  Cd as initTranslatorDashboardWithOptions,
  au as initializeVocabularyFromPayload,
  Lf as isCoreEnabled,
  cd as isExchangeEnabled,
  Kd as isExchangeError,
  nf as isFormLocked,
  cu as isInFallbackMode,
  zt as isMacPlatform,
  qo as isNarrowViewport,
  dd as isQueueEnabled,
  gu as isReadyForTransition,
  Kc as isShortcutHintDismissed,
  eu as isValidReasonCode,
  Zd as isValidStatus,
  Vc as loadShortcutSettings,
  Eo as mergeBackendSummaries,
  Pr as normalizeActionBlockCode,
  Di as normalizeActionState,
  Br as normalizeActionStateMap,
  Ri as normalizeActionStateMeta,
  Fn as normalizeActionStateRecord,
  bo as normalizeBackendGroupedRows,
  Or as normalizeBulkActionStateConfig,
  Pt as normalizeBulkActionStateMap,
  Mi as normalizeBulkActionStateResponse,
  qn as normalizeDetailActionStatePayload,
  Ii as normalizeListActionStatePayload,
  ja as paginationWindow,
  _f as parseCapabilityMode,
  Jd as parseImportResult,
  ds as parseViewMode,
  $u as persistExpandState,
  Ru as persistViewMode,
  Nc as removeFormLock,
  vf as renderAutosaveIndicator,
  ji as renderAvailableLocalesIndicator,
  Zu as renderBulkResultInline,
  Qu as renderBulkResultSummary,
  Cf as renderCharacterCounter,
  $c as renderDetailActions,
  Ef as renderDirectionToggle,
  fd as renderDisabledReasonBadge,
  Yc as renderDiscoveryHint,
  of as renderFallbackBannerFromRecord,
  Au as renderFallbackWarning,
  Df as renderGateAriaAttributes,
  Po as renderGroupHeaderRow,
  Ro as renderGroupHeaderSummary,
  Bo as renderGroupedEmptyState,
  Fo as renderGroupedErrorState,
  Oo as renderGroupedLoadingState,
  jc as renderInlineLocaleChips,
  Ns as renderLocaleActionChip,
  tf as renderLocaleActionList,
  Wn as renderLocaleBadge,
  wu as renderLocaleCompleteness,
  xu as renderMissingTranslationsBadge,
  vu as renderPublishReadinessBadge,
  Wu as renderQuickFiltersHTML,
  yu as renderReadinessIndicator,
  Kn as renderReasonCodeBadge,
  su as renderReasonCodeIndicator,
  mf as renderShortcutSettingsUI,
  hf as renderShortcutsHelpContent,
  bu as renderStatusBadge,
  Ju as renderStatusLegendHTML,
  hu as renderTranslationAssignmentSummary,
  pu as renderTranslationExchangeSummary,
  uu as renderTranslationFamilyLink,
  fu as renderTranslationFamilyMemberCount,
  Hi as renderTranslationMatrixCell,
  zi as renderTranslationStatusCell,
  Ie as renderVocabularyStatusBadge,
  Vn as renderVocabularyStatusIcon,
  Nn as resolveActionState,
  pf as saveShortcutSettings,
  af as shouldShowFallbackBanner,
  df as shouldShowInlineLocaleChips,
  Vu as showTranslationBlocker,
  _u as toggleGroupExpand,
  go as transformToGroups
};

//# sourceMappingURL=datatable.js.map