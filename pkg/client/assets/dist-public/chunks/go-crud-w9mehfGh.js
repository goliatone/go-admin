import { escapeAttribute as k, escapeHTML as U } from "../shared/html.js";
import { createLogger as ce } from "../shared/logger.js";
import { parseDateLike as mt } from "../shared/date-utils.js";
import { httpRequest as Q, readHTTPError as In, readHTTPJSONObject as Mr, readHTTPJSONValue as Pr } from "../shared/transport/http-client.js";
import { createStructuredActionError as bn, executeStructuredRequest as Tr, extractErrorMessage as Rr, formatStructuredErrorForDisplay as $n, getStructuredActionError as ct, isHandledActionError as Le } from "../toast/error-helpers.js";
import { t as Gn } from "./toast-manager-dTUZQSLs.js";
import { t as Lr } from "./icon-renderer-DWZ4R-YR.js";
import { F as Or, M as Bn, N as Ir, P as $r, R as Gr, j as Nn, t as Br } from "./action-execution-Bn3QEHJ3.js";
import { D as Nr, E as jt, r as gn, t as Fr } from "./translation-context-CZ7O4EEm.js";
var en = "[data-action-menu], [data-dropdown]", Fn = "[data-action-menu-trigger], [data-dropdown-trigger]", tn = "[data-action-menu-content], .actions-menu", qr = '[role="menuitem"], [data-action-menu-item], .action-item', qn = "hidden", Et = /* @__PURE__ */ new Set(), te = /* @__PURE__ */ new WeakMap(), nn = /* @__PURE__ */ new WeakMap(), Ut = /* @__PURE__ */ new WeakMap(), jr = [
  "position",
  "right",
  "bottom",
  "margin",
  "min-width",
  "max-width",
  "max-height",
  "left",
  "top"
], Ur = [
  "--admin-action-menu-surface",
  "--admin-action-menu-text",
  "--admin-action-menu-border",
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
], zr = [
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
function Hr(e) {
  const t = e.target;
  return t && typeof t.closest == "function" ? t : null;
}
function Te(e, t) {
  return "contains" in e && typeof e.contains == "function" ? e.contains(t) : !1;
}
function Vr(e, t) {
  const n = /* @__PURE__ */ new Map();
  return t.forEach((r) => {
    n.set(r, {
      value: e.style.getPropertyValue(r),
      priority: e.style.getPropertyPriority(r)
    });
  }), n;
}
function Kr(e, t) {
  t.forEach(({ value: n, priority: r }, o) => {
    if (n) {
      e.style.setProperty(o, n, r);
      return;
    }
    e.style.removeProperty(o);
  });
}
function jn(e) {
  const t = Ut.get(e);
  t && (Ut.delete(e), Kr(e, t));
}
function Yr(e) {
  const t = /* @__PURE__ */ new Map(), n = e.ownerDocument.defaultView;
  if (!n) return t;
  const r = n.getComputedStyle(e), o = new Set(Ur);
  for (let a = 0; a < r.length; a += 1) {
    const s = r.item(a);
    s.startsWith("--") && o.add(s);
  }
  return o.forEach((a) => {
    const s = r.getPropertyValue(a).trim();
    s && t.set(a, s);
  }), zr.forEach((a) => {
    const s = r.getPropertyValue(a).trim();
    s && t.set(a, s);
  }), t;
}
function Wr(e, t) {
  t.forEach((n, r) => {
    e.style.setProperty(r, n);
  });
}
function Xr(e, t = {}) {
  const n = t.containerSelector || en, r = t.menuSelector || tn, o = e.closest(n), a = nn.get(e) ?? o?.querySelector(r) ?? null;
  return !o || !a ? null : {
    container: o,
    trigger: e,
    menu: a
  };
}
function Qr(e, t) {
  const { container: n, trigger: r, menu: o } = e;
  if (te.has(o)) return;
  const a = o.ownerDocument, s = o.parentNode;
  if (!a.body || !s) return;
  const i = Yr(o);
  te.set(o, {
    container: n,
    trigger: r,
    root: t,
    parent: s,
    nextSibling: o.nextSibling,
    inlineStyle: o.getAttribute("style")
  }), Et.add(o), nn.set(r, o), a.body.appendChild(o), Wr(o, i);
}
function Jr(e) {
  const t = te.get(e);
  if (t) {
    if (Et.delete(e), te.delete(e), nn.delete(t.trigger), t.inlineStyle === null ? e.removeAttribute("style") : e.setAttribute("style", t.inlineStyle), !t.parent.isConnected) {
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
function qe(e, t = {}) {
  const n = t.hiddenClass || qn;
  e.classList.add(n);
  const r = te.get(e), o = r?.container ?? e.closest(t.containerSelector || en);
  (r?.trigger ?? o?.querySelector(t.triggerSelector || Fn))?.setAttribute("aria-expanded", "false"), jn(e), Jr(e);
}
function Zr(e = document, t = {}) {
  const n = t.menuSelector || tn, r = new Set(Array.from(e.querySelectorAll(n)));
  Et.forEach((o) => {
    const a = te.get(o);
    a && (a.root === e || Te(e, a.trigger)) && r.add(o);
  }), r.forEach((o) => {
    qe(o, t);
  });
}
function eo(e) {
  return e.getAttribute("aria-disabled") === "true" || e.dataset.disabled === "true";
}
function yn(e, t) {
  return Array.from(e.querySelectorAll(t)).filter((n) => !n.hasAttribute("disabled") && !n.hidden && n.getAttribute("aria-hidden") !== "true");
}
function Mt(e) {
  if (e)
    try {
      e.focus({ preventScroll: !0 });
    } catch {
      e.focus();
    }
}
function to(e, t, n) {
  const r = new Set(Array.from(e.querySelectorAll(t)));
  return Et.forEach((o) => {
    const a = te.get(o);
    a && (a.root === e || Te(e, a.trigger)) && r.add(o);
  }), Array.from(r).find((o) => !o.classList.contains(n)) ?? null;
}
function no({ trigger: e, menu: t }) {
  jn(t), Ut.set(t, Vr(t, jr));
  const n = e.getBoundingClientRect(), r = e.ownerDocument.defaultView ?? window, o = r.visualViewport, a = o?.offsetLeft ?? 0, s = o?.offsetTop ?? 0, i = o?.width ?? r.innerWidth, c = o?.height ?? r.innerHeight, l = 10, u = 8, d = Math.max(0, i - 20), f = Math.max(0, c - 20), p = r.getComputedStyle(t), m = (mn, rt) => {
    const ot = Number.parseFloat(mn);
    return Number.isFinite(ot) ? ot : rt;
  }, b = m(p.minWidth, 192), x = m(p.maxWidth, d), w = m(p.maxHeight, f), C = Math.min(x, d), S = a + i, P = s + c, G = Math.max(0, P - l - n.bottom - u), F = Math.max(0, n.top - s - l - u), I = Math.min(t.scrollHeight || t.offsetHeight || Math.min(300, f), w, f), de = I > G && F > G, B = Math.min(w, f, de ? F : G);
  t.style.position = "fixed", t.style.right = "auto", t.style.bottom = "auto", t.style.margin = "0", t.style.minWidth = `${Math.min(b, C)}px`, t.style.maxWidth = `${C}px`, t.style.maxHeight = `${B}px`;
  const fe = Math.min(t.offsetWidth || 224, d), J = Math.min(t.offsetHeight || I, B), be = n.right - fe, Y = a + l, ae = Math.max(Y, S - fe - l), ge = Math.min(Math.max(Y, be), ae), ne = de ? n.top - J - u : n.bottom + u, ye = s + l, ve = Math.max(ye, P - J - l), Dt = Math.min(Math.max(ye, ne), ve);
  t.style.left = `${ge}px`, t.style.top = `${Dt}px`;
}
function ro(e = document, t = {}) {
  const n = t.triggerSelector || Fn, r = t.itemSelector || qr, o = t.hiddenClass || qn, a = t.menuSelector || tn, s = t.positionMenu, i = e.nodeType === 9 ? e : e.ownerDocument || document, c = [], l = {
    closeAll: () => Zr(e, t),
    destroy: () => {
      for (l.closeAll(); c.length > 0; ) c.pop()?.();
    }
  };
  e.querySelectorAll(a).forEach((p) => {
    p.classList.contains(o) || p.classList.add(o);
  });
  const u = (p) => {
    const m = Hr(p);
    if (!m) return;
    const b = m.closest(n);
    if (b && Te(e, b)) {
      const I = Xr(b, t);
      if (!I) return;
      if (p.stopPropagation(), !I.menu.classList.contains(o)) {
        qe(I.menu, t);
        return;
      }
      l.closeAll(), I.menu.classList.remove(o), I.trigger.setAttribute("aria-expanded", "true"), t.portal && Qr(I, e), s && s({
        ...I,
        opening: !0
      }), Mt(yn(I.menu, r)[0]);
      return;
    }
    const x = m.closest(r), w = x?.closest(a) ?? null, C = w ? te.get(w) : void 0, S = !!(w && (Te(e, w) || C?.root === e));
    if (x && S) {
      if (eo(x)) {
        p.preventDefault(), p.stopPropagation();
        return;
      }
      qe(w, t);
      return;
    }
    const P = t.outsideIgnoreSelector;
    if (P && m.closest(P)) return;
    const G = m.closest(a), F = G ? te.get(G) : void 0;
    G && (Te(e, G) || F?.root === e) || l.closeAll();
  }, d = (p) => {
    const m = to(e, a, o);
    if (!m) return;
    const b = yn(m, r), x = i.activeElement, w = x ? b.indexOf(x) : -1;
    if (p.key === "Escape") {
      const S = te.get(m)?.trigger ?? m.closest(t.containerSelector || en)?.querySelector(n) ?? null;
      p.preventDefault(), p.stopPropagation(), qe(m, t), S?.isConnected && Mt(S);
      return;
    }
    let C = null;
    p.key === "ArrowDown" ? C = w < 0 ? 0 : (w + 1) % b.length : p.key === "ArrowUp" ? C = w < 0 ? b.length - 1 : (w - 1 + b.length) % b.length : p.key === "Home" ? C = 0 : p.key === "End" && (C = b.length - 1), C !== null && b.length > 0 && (p.preventDefault(), p.stopPropagation(), Mt(b[C]));
  };
  i.addEventListener("click", u), i.addEventListener("keydown", d), c.push(() => i.removeEventListener("click", u)), c.push(() => i.removeEventListener("keydown", d));
  const f = i.defaultView;
  if (f && (t.portal || s)) {
    const p = () => l.closeAll(), m = (b) => {
      const x = b.target;
      if (x && typeof x.closest == "function") {
        const w = x.closest(a), C = w ? te.get(w) : void 0;
        if (w && (Te(e, w) || C?.root === e)) return;
      }
      l.closeAll();
    };
    f.addEventListener("pagehide", p), f.addEventListener("pageshow", p), f.addEventListener("resize", p), f.visualViewport?.addEventListener("resize", p), f.visualViewport?.addEventListener("scroll", p), i.addEventListener("scroll", m, !0), c.push(() => f.removeEventListener("pagehide", p)), c.push(() => f.removeEventListener("pageshow", p)), c.push(() => f.removeEventListener("resize", p)), c.push(() => f.visualViewport?.removeEventListener("resize", p)), c.push(() => f.visualViewport?.removeEventListener("scroll", p)), c.push(() => i.removeEventListener("scroll", m, !0));
  }
  if (t.signal) {
    const p = () => l.destroy();
    t.signal.addEventListener("abort", p, { once: !0 }), c.push(() => t.signal?.removeEventListener("abort", p));
  }
  return l;
}
var Pt = ce("DataGrid"), oo = 0, ao = class {
  constructor(e = {}) {
    this.actionBasePath = e.actionBasePath || "", this.mode = e.mode || "dropdown", this.notifier = e.notifier || new Gn();
    const t = this.sanitize(e.domIdPrefix || "grid") || "grid";
    this.domNamespace = `${t}-${++oo}`, this.rowRenderSeq = 0;
  }
  renderRowActions(e, t) {
    const n = `${this.domNamespace}-row-${++this.rowRenderSeq}`;
    if (this.mode === "dropdown") return this.renderRowActionsDropdown(e, t, n);
    const r = this.getVisibleActions(e, t);
    return r.length === 0 ? '<div class="admin-datagrid__action-list flex justify-end gap-2"></div>' : `<div class="admin-datagrid__action-list flex justify-end gap-2">${r.map(({ action: o, sourceIndex: a }) => {
      const s = this.getVariantClass(o.variant || "secondary"), i = o.icon ? this.renderIcon(o.icon) : "", c = o.className || "", l = o.disabled === !0, u = this.getActionKey(o, a), d = l ? "opacity-50 cursor-not-allowed" : "", f = l ? 'aria-disabled="true"' : "", p = l && o.disabledReason ? `${n}-${u}-disabled-reason` : "", m = p ? `aria-describedby="${k(p)}"` : "", b = l && o.disabledReason ? `${o.label} unavailable: ${o.disabledReason}` : o.label, x = p ? `<span id="${k(p)}" class="sr-only">${U(o.disabledReason || "Action unavailable")}</span>` : "", w = o.disabledReason ? `title="${k(o.disabledReason)}"` : "";
      return `
        <button
          type="button"
          class="admin-datagrid__action btn btn-sm ${k(s)} ${k(c)} ${d}"
          data-action-id="${k(this.sanitize(o.label))}"
          data-action-key="${k(u)}"
          data-record-id="${k(e.id)}"
          data-disabled="${l}"
          ${f}
          aria-label="${k(b)}"
          ${m}
          ${w}
        >
          ${i}
          ${U(o.label)}
        </button>
        ${x}
      `;
    }).join("")}</div>`;
  }
  renderRowActionsDropdown(e, t, n) {
    const r = this.getVisibleActions(e, t);
    if (r.length === 0) return '<div class="admin-datagrid__actions-empty text-sm text-gray-400">No actions</div>';
    const o = `${n}-menu`, a = this.buildDropdownItems(e, r, n);
    return `
      <div class="action-menu action-menu--right actions-dropdown" data-action-menu data-dropdown>
        <button type="button"
                class="action-menu__trigger actions-menu-trigger"
                data-action-menu-trigger
                data-dropdown-trigger
                aria-label="Actions menu"
                aria-haspopup="true"
                aria-expanded="false"
                aria-controls="${k(o)}">
          ${this.renderDotsIcon()}
        </button>

        <div id="${k(o)}"
             class="action-menu__content actions-menu hidden"
             data-action-menu-content
             data-position="right"
             role="menu"
             aria-orientation="vertical">
          ${a}
        </div>
      </div>
    `;
  }
  buildDropdownItems(e, t, n) {
    return t.map(({ action: r, sourceIndex: o }, a) => {
      const s = r.variant === "danger", i = r.disabled === !0, c = this.getActionKey(r, o), l = r.icon ? this.renderIcon(r.icon) : "", u = this.shouldShowDivider(r, a), d = i ? (r.disabledReason || "Action unavailable").trim() : "", f = d ? `${n}-${c}-disabled-reason` : "", p = u ? '<div class="action-menu__divider action-divider" role="separator"></div>' : "", m = i ? "action-menu__item action-item action-item--disabled" : s ? "action-menu__item action-menu__item--danger action-item action-item--danger" : "action-menu__item action-item", b = i ? 'aria-disabled="true"' : "", x = f ? `aria-describedby="${k(f)}"` : "", w = d ? `${r.label} unavailable: ${d}` : r.label, C = r.disabledReason ? `title="${k(r.disabledReason)}"` : "", S = d ? `<span id="${k(f)}" class="action-item-reason">${U(d)}</span>` : "";
      return `
        ${p}
        <button type="button"
                class="${k(m)}"
                data-action-id="${k(this.sanitize(r.label))}"
                data-action-menu-item
                data-action-key="${k(c)}"
                data-record-id="${k(e.id)}"
                data-disabled="${i}"
                role="menuitem"
                ${b}
                aria-label="${k(w)}"
                ${x}
                ${C}>
          <span class="action-item__icon">${l}</span>
          <span class="action-item__content">
            <span class="action-item__label">${U(r.label)}</span>
            ${S}
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
    ].some((n) => e.label.toLowerCase().includes(n));
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
  attachRowActionListeners(e, t, n, r = {}) {
    t.forEach((o, a) => {
      const s = this.getActionKey(o, a), i = e.querySelector(`[data-action-key="${s}"]`);
      i && i.addEventListener("click", async (c) => {
        if (c.preventDefault(), i.getAttribute("aria-disabled") === "true" || i.dataset.disabled === "true") return;
        const l = i.closest("[data-action-menu-content]");
        l && qe(l);
        try {
          await o.action(n);
        } catch (u) {
          if (Pt.error(`Action "${o.label}" failed:`, u), r.onError) {
            await r.onError(u, o, n);
            return;
          }
          const d = u instanceof Error ? u.message : `Action "${o.label}" failed`;
          this.notifier.error(d);
        }
      });
    });
  }
  renderBulkActionsToolbar(e) {
    const t = document.createElement("div");
    t.id = "bulk-actions-bar", t.className = "hidden bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 flex items-center gap-4";
    const n = document.createElement("span");
    n.className = "text-sm font-medium text-blue-900", n.id = "selected-count", n.textContent = "0 items selected", t.appendChild(n);
    const r = document.createElement("div");
    r.className = "flex gap-2 flex-1", e.forEach((a) => {
      const s = document.createElement("button");
      s.type = "button", s.className = "btn btn-sm btn-primary", s.dataset.bulkAction = a.id, a.icon ? s.innerHTML = `${this.renderIcon(a.icon)} ${a.label}` : s.textContent = a.label, r.appendChild(s);
    }), t.appendChild(r);
    const o = document.createElement("button");
    return o.type = "button", o.className = "btn btn-sm btn-secondary", o.id = "clear-selection-btn", o.textContent = "Clear Selection", t.appendChild(o), t;
  }
  async executeBulkAction(e, t) {
    if (e.guard && !e.guard(t)) {
      Pt.warn(`Bulk action "${e.id}" guard failed`);
      return;
    }
    if (e.confirm) {
      const r = e.confirm.replace("{count}", t.length.toString());
      if (!await this.notifier.confirm(r)) return;
    }
    const n = await this.resolveBulkActionPayload(e, t);
    if (n !== null)
      try {
        const r = await Tr(e.endpoint, {
          method: e.method || "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json"
          },
          body: JSON.stringify(n)
        }, async (a) => {
          const s = await Pr(a, void 0);
          return {
            success: !0,
            data: s === void 0 ? void 0 : s
          };
        });
        if (!r.success) {
          const a = r.error, s = a ? $n(a, `Bulk action '${e.id}' failed`) : `Bulk action '${e.id}' failed`;
          throw e.onError || this.notifier.error(s), a ? bn(a, `Bulk action '${e.id}' failed`, !0) : bn({
            textCode: null,
            message: s,
            metadata: null,
            fields: null,
            validationErrors: null
          }, `Bulk action '${e.id}' failed`, !0);
        }
        const o = r.data;
        this.notifier.success(this.buildBulkSuccessMessage(e, o, t.length)), e.onSuccess && e.onSuccess(o);
      } catch (r) {
        if (Pt.error(`Bulk action "${e.id}" failed:`, r), !e.onError && !Le(r)) {
          const o = r instanceof Error ? r.message : "Bulk action failed";
          this.notifier.error(o);
        }
        throw e.onError && e.onError(r), r;
      }
  }
  async resolveBulkActionPayload(e, t) {
    const n = {
      ...e.payload || {},
      ids: t
    }, r = this.normalizePayloadSchema(e.payloadSchema);
    r?.properties && Object.entries(r.properties).forEach(([s, i]) => {
      n[s] === void 0 && i && i.default !== void 0 && (n[s] = i.default);
    });
    const o = this.collectRequiredFields(e.payloadRequired, r).filter((s) => s !== "ids" && this.isEmptyPayloadValue(n[s]));
    if (o.length === 0) return n;
    const a = await this.requestRequiredFields(e, o, r, n);
    if (a === null) return null;
    for (const s of o) {
      const i = r?.properties?.[s], c = a[s] ?? "", l = this.coercePromptValue(c, s, i);
      if (l.error)
        return this.notifier.error(l.error), null;
      n[s] = l.value;
    }
    return n;
  }
  collectRequiredFields(e, t) {
    const n = [], r = /* @__PURE__ */ new Set(), o = (a) => {
      const s = a.trim();
      !s || r.has(s) || (r.add(s), n.push(s));
    };
    return Array.isArray(e) && e.forEach((a) => o(String(a))), Array.isArray(t?.required) && t.required.forEach((a) => o(String(a))), n;
  }
  normalizePayloadSchema(e) {
    if (!e || typeof e != "object") return null;
    const t = e.properties;
    let n;
    return t && typeof t == "object" && (n = {}, Object.entries(t).forEach(([r, o]) => {
      o && typeof o == "object" && (n[r] = o);
    })), {
      type: typeof e.type == "string" ? e.type : void 0,
      required: e.required,
      properties: n
    };
  }
  async requestRequiredFields(e, t, n, r) {
    const o = t.map((a) => {
      const s = n?.properties?.[a], i = typeof s?.type == "string" ? s.type.toLowerCase() : "string";
      return {
        name: a,
        label: (s?.title || a).trim(),
        description: (s?.description || "").trim() || void 0,
        value: this.stringifyPromptDefault(r[a] !== void 0 ? r[a] : s?.default),
        type: i,
        options: this.buildSchemaOptions(s)
      };
    });
    return Gr.prompt({
      title: `Complete ${e.label || e.id}`,
      fields: o
    });
  }
  buildSchemaOptions(e) {
    if (e) {
      if (Array.isArray(e.oneOf) && e.oneOf.length > 0) {
        const t = e.oneOf.filter((n) => n && Object.prototype.hasOwnProperty.call(n, "const")).map((n) => {
          const r = this.stringifyPromptDefault(n.const);
          return {
            value: r,
            label: typeof n.title == "string" && n.title.trim() ? n.title.trim() : r
          };
        });
        return t.length > 0 ? t : void 0;
      }
      if (Array.isArray(e.enum) && e.enum.length > 0) {
        const t = e.enum.map((n) => {
          const r = this.stringifyPromptDefault(n);
          return {
            value: r,
            label: r
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
  coercePromptValue(e, t, n) {
    if (Array.isArray(n?.oneOf) && n.oneOf.length > 0) {
      const a = n.oneOf.find((s) => s && Object.prototype.hasOwnProperty.call(s, "const") && this.stringifyPromptDefault(s.const) === e);
      return !a || !Object.prototype.hasOwnProperty.call(a, "const") ? {
        value: e,
        error: `${t} must be one of: ${n.oneOf.map((s) => typeof s?.title == "string" && s.title.trim() ? s.title.trim() : this.stringifyPromptDefault(s.const)).filter((s) => s !== "").join(", ")}`
      } : { value: a.const };
    }
    const r = (n?.type || "string").toLowerCase();
    if (e === "") return { value: "" };
    let o = e;
    switch (r) {
      case "integer": {
        const a = Number.parseInt(e, 10);
        if (Number.isNaN(a)) return {
          value: e,
          error: `${t} must be an integer.`
        };
        o = a;
        break;
      }
      case "number": {
        const a = Number.parseFloat(e);
        if (Number.isNaN(a)) return {
          value: e,
          error: `${t} must be a number.`
        };
        o = a;
        break;
      }
      case "boolean": {
        const a = e.toLowerCase();
        if ([
          "true",
          "1",
          "yes",
          "y",
          "on"
        ].includes(a)) {
          o = !0;
          break;
        }
        if ([
          "false",
          "0",
          "no",
          "n",
          "off"
        ].includes(a)) {
          o = !1;
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
          const a = JSON.parse(e);
          if (r === "array" && !Array.isArray(a)) return {
            value: e,
            error: `${t} must be a JSON array.`
          };
          if (r === "object" && (a === null || Array.isArray(a) || typeof a != "object")) return {
            value: e,
            error: `${t} must be a JSON object.`
          };
          o = a;
        } catch {
          return {
            value: e,
            error: `${t} must be valid JSON.`
          };
        }
        break;
      default:
        o = e;
    }
    return Array.isArray(n?.enum) && n.enum.length > 0 && !n.enum.some((a) => a === o || String(a) === String(o)) ? {
      value: o,
      error: `${t} must be one of: ${n.enum.map((a) => String(a)).join(", ")}`
    } : { value: o };
  }
  isEmptyPayloadValue(e) {
    return e == null ? !0 : typeof e == "string" ? e.trim() === "" : Array.isArray(e) ? e.length === 0 : typeof e == "object" ? Object.keys(e).length === 0 : !1;
  }
  buildBulkSuccessMessage(e, t, n) {
    const r = e.label || e.id || "Bulk action", o = t && typeof t == "object" ? t.summary : null, a = o && typeof o.succeeded == "number" ? o.succeeded : typeof t?.processed == "number" ? t.processed : n, s = o && typeof o.failed == "number" ? o.failed : 0;
    return s > 0 ? `${r} completed: ${a} succeeded, ${s} failed.` : `${r} completed for ${a} item${a === 1 ? "" : "s"}.`;
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
    const n = typeof e.id == "string" ? e.id.trim() : "", r = this.sanitize(n || e.label) || "action";
    return `action-${t + 1}-${r}`;
  }
  getVisibleActions(e, t) {
    return t.map((n, r) => ({
      action: n,
      sourceIndex: r
    })).filter(({ action: n }) => !n.condition || n.condition(e));
  }
  sanitize(e) {
    return e.toLowerCase().replace(/[^a-z0-9]/g, "-");
  }
}, se = '<span class="text-gray-400">-</span>', so = [
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
function io(e) {
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}
function lo(e) {
  const t = [], n = (o) => {
    if (typeof o != "string") return;
    const a = o.trim();
    !a || t.includes(a) || t.push(a);
  };
  n(e.display_key), n(e.displayKey);
  const r = e.display_keys ?? e.displayKeys;
  return Array.isArray(r) && r.forEach(n), t;
}
function co(e, t) {
  if (!t) return;
  if (Object.prototype.hasOwnProperty.call(e, t)) return e[t];
  if (!t.includes(".")) return;
  const n = t.split(".");
  let r = e;
  for (const o of n) {
    if (!r || typeof r != "object" || Array.isArray(r) || !Object.prototype.hasOwnProperty.call(r, o)) return;
    r = r[o];
  }
  return r;
}
function uo(e) {
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
function zt(e, t) {
  if (e == null) return "";
  if (Array.isArray(e)) return Ht(e, t);
  if (typeof e != "object") return String(e);
  const n = [...lo(t), ...so], r = /* @__PURE__ */ new Set();
  for (const o of n) {
    if (r.has(o)) continue;
    r.add(o);
    const a = uo(co(e, o));
    if (a) return a;
  }
  return io(e);
}
function Ht(e, t) {
  if (!Array.isArray(e) || e.length === 0) return "";
  const n = e.map((s) => zt(s, t).trim()).filter(Boolean);
  if (n.length === 0) return "";
  const r = Number(t.preview_limit ?? t.previewLimit ?? 3), o = Number.isFinite(r) && r > 0 ? Math.floor(r) : 3, a = n.slice(0, o);
  return n.length <= o ? a.join(", ") : `${a.join(", ")} +${n.length - o} more`;
}
function fo(e, t, n, r) {
  const o = e[t] ?? e[n] ?? r, a = Number(o);
  return Number.isFinite(a) && a > 0 ? Math.floor(a) : r;
}
function po(e, t, n, r) {
  const o = e[t] ?? e[n];
  return o == null ? r : typeof o == "boolean" ? o : typeof o == "string" ? o.toLowerCase() === "true" || o === "1" : !!o;
}
function ho(e, t, n, r) {
  const o = e[t] ?? e[n];
  return o == null ? r : String(o).trim() || r;
}
function mo(e) {
  if (e == null) return "";
  if (typeof e == "string") return e.trim();
  if (typeof e != "object") return String(e).trim();
  for (const t of [
    "_type",
    "type",
    "blockType",
    "block_type"
  ]) {
    const n = e[t];
    if (typeof n == "string" && n.trim()) return n.trim();
  }
  return "";
}
function bo(e) {
  switch (e) {
    case "muted":
      return "bg-gray-100 text-gray-600";
    case "outline":
      return "bg-white border border-gray-300 text-gray-700";
    default:
      return "bg-blue-50 text-blue-700";
  }
}
var go = class {
  constructor() {
    this.renderers = /* @__PURE__ */ new Map(), this.defaultRenderer = (e) => {
      if (e == null) return se;
      if (typeof e == "boolean") return e ? "Yes" : "No";
      if (Array.isArray(e)) {
        const t = Ht(e, {});
        return t ? U(t) : se;
      }
      if (typeof e == "object") {
        const t = zt(e, {});
        return t ? U(t) : se;
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
      return jt(String(e), "status", t);
    }), this.renderers.set("_date", (e) => {
      if (!e) return '<span class="text-gray-400">-</span>';
      const t = mt(e);
      return t ? t.toLocaleDateString() : String(e);
    }), this.renderers.set("_datetime", (e) => {
      if (!e) return '<span class="text-gray-400">-</span>';
      const t = mt(e);
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
      const t = Number(e), n = [
        "Bytes",
        "KB",
        "MB",
        "GB",
        "TB"
      ];
      if (t === 0) return "0 Bytes";
      const r = Math.floor(Math.log(t) / Math.log(1024));
      return `${(t / Math.pow(1024, r)).toFixed(2)} ${n[r]}`;
    }), this.renderers.set("_truncate", (e) => {
      if (!e) return '<span class="text-gray-400">-</span>';
      const t = String(e), n = 50;
      return t.length <= n ? t : `<span title="${t}">${t.substring(0, n)}...</span>`;
    }), this.renderers.set("_array", (e, t, n, r) => {
      if (!Array.isArray(e) || e.length === 0) return se;
      const o = Ht(e, r?.options || {});
      return o ? U(o) : se;
    }), this.renderers.set("_object", (e, t, n, r) => {
      if (e == null) return se;
      const o = zt(e, r?.options || {});
      return o ? U(o) : se;
    }), this.renderers.set("_tags", (e) => !Array.isArray(e) || e.length === 0 ? '<span class="text-gray-400">-</span>' : e.map((t) => `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 mr-1">${t}</span>`).join("")), this.renderers.set("blocks_chips", (e, t, n, r) => {
      if (!Array.isArray(e) || e.length === 0) return se;
      const o = r?.options || {}, a = fo(o, "max_visible", "maxVisible", 3), s = po(o, "show_count", "showCount", !0), i = ho(o, "chip_variant", "chipVariant", "default"), c = o.block_icons_map || o.blockIconsMap || {}, l = [], u = e.slice(0, a);
      for (const p of u) {
        const m = mo(p);
        if (!m) continue;
        const b = c[m] || "view-grid", x = Lr(b, {
          size: "14px",
          extraClass: "flex-shrink-0"
        }), w = bo(i);
        l.push(`<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${w}">${x}<span>${U(m)}</span></span>`);
      }
      if (l.length === 0) return se;
      const d = e.length - a;
      let f = "";
      return s && d > 0 && (f = `<span class="px-2 py-0.5 rounded text-xs bg-gray-200 text-gray-600">+${d} more</span>`), `<div class="flex flex-wrap gap-1">${l.join("")}${f}</div>`;
    }), this.renderers.set("_image", (e) => e ? `<img src="${e}" alt="Thumbnail" class="h-10 w-10 rounded object-cover" />` : '<span class="text-gray-400">-</span>'), this.renderers.set("_avatar", (e, t) => {
      const n = t.name || t.username || t.email || "U", r = n.charAt(0).toUpperCase();
      return e ? `<img src="${e}" alt="${n}" class="h-8 w-8 rounded-full object-cover" />` : `<div class="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium text-sm">${r}</div>`;
    });
  }
}, zi = {
  statusBadge: (e) => (t) => {
    const n = String(t).toLowerCase();
    return jt(String(t), "status", n);
  },
  roleBadge: (e) => (t) => {
    const n = String(t).toLowerCase();
    return jt(String(t), "role", n);
  },
  userInfo: (e, t) => {
    const n = e || t.name || t.username || "-", r = t.email || "";
    return r ? `<div><div class="font-medium text-gray-900">${n}</div><div class="text-sm text-gray-500">${r}</div></div>` : `<div class="font-medium text-gray-900">${n}</div>`;
  },
  booleanChip: (e) => (t) => Nr(!!t, e),
  relativeTime: (e) => {
    if (!e) return '<span class="text-gray-400">-</span>';
    const t = mt(e);
    if (!t) return String(e);
    const n = (/* @__PURE__ */ new Date()).getTime() - t.getTime(), r = Math.floor(n / 6e4), o = Math.floor(n / 36e5), a = Math.floor(n / 864e5);
    return r < 1 ? "Just now" : r < 60 ? `${r} minute${r > 1 ? "s" : ""} ago` : o < 24 ? `${o} hour${o > 1 ? "s" : ""} ago` : a < 30 ? `${a} day${a > 1 ? "s" : ""} ago` : t.toLocaleDateString();
  },
  localeBadge: Fr(),
  translationStatus: gn(),
  translationStatusCompact: gn({
    size: "sm",
    maxLocales: 2
  })
}, yo = "datagrid.state.", Tt = "datagrid.share.", Un = "datagrid.share.index", vo = 20, So = 1500;
function wo(e) {
  return String(e || "").trim() || "default";
}
function Rt(e, t = {}) {
  if (!Array.isArray(e)) return;
  const n = e.map((r) => typeof r == "string" ? r.trim() : "").filter((r) => r.length > 0);
  return n.length === 0 ? t.allowEmpty === !0 ? [] : void 0 : Array.from(new Set(n));
}
function Ke(e) {
  if (!e || typeof e != "object" || Array.isArray(e)) return null;
  const t = e, n = { version: 1 };
  (t.viewMode === "flat" || t.viewMode === "grouped" || t.viewMode === "matrix") && (n.viewMode = t.viewMode), (t.expandMode === "all" || t.expandMode === "none" || t.expandMode === "explicit") && (n.expandMode = t.expandMode);
  const r = Rt(t.expandedGroups, { allowEmpty: !0 });
  r !== void 0 && (n.expandedGroups = r);
  const o = Rt(t.hiddenColumns, { allowEmpty: !0 });
  o !== void 0 && (n.hiddenColumns = o);
  const a = Rt(t.columnOrder);
  return a && (n.columnOrder = a), typeof t.updatedAt == "number" && Number.isFinite(t.updatedAt) && (n.updatedAt = t.updatedAt), n;
}
function vn(e) {
  if (!e || typeof e != "object" || Array.isArray(e)) return null;
  const t = e, n = { version: 1 };
  if (typeof t.search == "string") {
    const o = t.search.trim();
    o && (n.search = o);
  }
  typeof t.page == "number" && Number.isFinite(t.page) && (n.page = Math.max(1, Math.trunc(t.page))), typeof t.perPage == "number" && Number.isFinite(t.perPage) && (n.perPage = Math.max(1, Math.trunc(t.perPage))), Array.isArray(t.filters) && (n.filters = t.filters), Array.isArray(t.sort) && (n.sort = t.sort);
  const r = Ke(t.persisted);
  return r && (n.persisted = r), typeof t.updatedAt == "number" && Number.isFinite(t.updatedAt) && (n.updatedAt = t.updatedAt), n;
}
function zn(e) {
  const t = String(e || "").trim();
  return t ? t.replace(/\/+$/, "") : "";
}
function Eo(e) {
  return String(e || "").trim().replace(/[^a-zA-Z0-9._-]/g, "");
}
function Ao() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`.slice(0, 16);
}
function xo(e) {
  try {
    const t = localStorage.getItem(Un);
    if (!t) return [];
    const n = JSON.parse(t);
    if (!Array.isArray(n)) return [];
    const r = n.map((o) => {
      if (!o || typeof o != "object" || Array.isArray(o)) return null;
      const a = o, s = typeof a.token == "string" ? a.token.trim() : "", i = typeof a.updatedAt == "number" ? a.updatedAt : 0;
      return !s || !Number.isFinite(i) ? null : {
        token: s,
        updatedAt: i
      };
    }).filter((o) => o !== null).sort((o, a) => a.updatedAt - o.updatedAt);
    return r.length <= e ? r : r.slice(0, e);
  } catch {
    return [];
  }
}
function Co(e) {
  try {
    localStorage.setItem(Un, JSON.stringify(e));
  } catch {
  }
}
var Hn = class {
  constructor(e) {
    const t = wo(e.key);
    this.key = t, this.persistedStorageKey = `${yo}${t}`, this.maxShareEntries = Math.max(1, e.maxShareEntries || vo);
  }
  loadPersistedState() {
    try {
      const e = localStorage.getItem(this.persistedStorageKey);
      return e ? Ke(JSON.parse(e)) : null;
    } catch {
      return null;
    }
  }
  savePersistedState(e) {
    const t = Ke(e);
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
    const t = vn(e);
    if (!t) return null;
    t.updatedAt || (t.updatedAt = Date.now());
    const n = Ao(), r = `${Tt}${n}`;
    try {
      localStorage.setItem(r, JSON.stringify(t));
      const o = xo(this.maxShareEntries).filter((a) => a.token !== n);
      for (o.unshift({
        token: n,
        updatedAt: t.updatedAt
      }); o.length > this.maxShareEntries; ) {
        const a = o.pop();
        a && localStorage.removeItem(`${Tt}${a.token}`);
      }
      return Co(o), n;
    } catch {
      return null;
    }
  }
  resolveShareState(e) {
    const t = String(e || "").trim();
    if (!t) return null;
    try {
      const n = localStorage.getItem(`${Tt}${t}`);
      return n ? vn(JSON.parse(n)) : null;
    } catch {
      return null;
    }
  }
}, _o = class extends Hn {
  constructor(e) {
    if (super(e), this.syncTimeout = null, this.mutationQueue = Promise.resolve(), this.preferencesEndpoint = zn(e.preferencesEndpoint), !this.preferencesEndpoint) throw new Error("PreferencesDataGridStateStore requires an advertised preferences endpoint");
    this.resource = Eo(e.resource) || this.key, this.syncDebounceMs = Math.max(100, e.syncDebounceMs || 1e3), this.hydrateTimeoutMs = Math.max(100, e.hydrateTimeoutMs || So), this.preferencesWritable = e.preferencesWritable !== !1;
  }
  get serverStateKey() {
    return `ui.datagrid.${this.resource}.state`;
  }
  async hydrate() {
    const e = typeof AbortController < "u" ? new AbortController() : null, t = setTimeout(() => {
      e?.abort();
    }, this.hydrateTimeoutMs);
    try {
      const n = this.buildKeysQueryURL(this.serverStateKey), r = await fetch(n, {
        method: "GET",
        credentials: "same-origin",
        signal: e?.signal,
        headers: { Accept: "application/json" }
      });
      if (!r.ok) return;
      const o = await r.json(), a = this.extractFirstRecord(o);
      if (!a) return;
      const s = this.extractMap(a.effective), i = this.extractMap(a.raw), c = Ke(s[this.serverStateKey] ?? i[this.serverStateKey]);
      c && super.savePersistedState(c);
    } catch {
    } finally {
      clearTimeout(t);
    }
  }
  savePersistedState(e) {
    super.savePersistedState(e);
    const t = Ke(e);
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
      await Q(this.preferencesEndpoint, {
        method: "POST",
        credentials: "same-origin",
        json: { raw: { [this.serverStateKey]: e } }
      });
    } catch {
    }
  }
  async clearServerState() {
    try {
      await Q(this.preferencesEndpoint, {
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
    const t = e, n = Array.isArray(t.records) ? t.records : Array.isArray(t.data) ? t.data : [];
    if (n.length === 0) return null;
    const r = n[0];
    return !r || typeof r != "object" || Array.isArray(r) ? null : r;
  }
  extractMap(e) {
    return !e || typeof e != "object" || Array.isArray(e) ? {} : e;
  }
};
function ko(e) {
  return (e.mode || "local") === "preferences" && zn(e.preferencesEndpoint) ? new _o(e) : new Hn(e);
}
function Do(e, t = {}) {
  const { groupByField: n = "family_id", defaultExpanded: r = !0, expandMode: o = "explicit", expandedGroups: a = /* @__PURE__ */ new Set() } = t, s = /* @__PURE__ */ new Map(), i = [];
  for (const l of e) {
    const u = Io(l, n);
    if (u) {
      const d = s.get(u);
      d ? d.push(l) : s.set(u, [l]);
    } else i.push(l);
  }
  const c = [];
  for (const [l, u] of s) {
    const d = Qn(u), f = Kn(l, o, a, r);
    c.push({
      groupId: l,
      records: u,
      summary: d,
      expanded: f,
      summaryFromBackend: !1
    });
  }
  return c.sort((l, u) => e.indexOf(l.records[0]) - e.indexOf(u.records[0])), {
    groups: c,
    ungrouped: i,
    totalGroups: c.length,
    totalRecords: e.length
  };
}
function Vn(e) {
  if (e.length === 0) return !1;
  let t = !1;
  for (const n of e) {
    if (Po(n)) {
      t = !0;
      continue;
    }
    if (Yn(n)) {
      t = !0;
      continue;
    }
    return !1;
  }
  return t;
}
function Mo(e, t = {}) {
  const { defaultExpanded: n = !0, expandMode: r = "explicit", expandedGroups: o = /* @__PURE__ */ new Set() } = t;
  if (!Vn(e)) return null;
  const a = [], s = [];
  let i = 0;
  for (const c of e) {
    if (Yn(c)) {
      s.push({ ...c }), i += 1;
      continue;
    }
    const l = To(c);
    if (!l) return null;
    const u = Xn(c), d = Lo(c, u), f = Kn(l, r, o, n);
    a.push({
      groupId: l,
      displayLabel: Oo(c, u),
      records: u,
      summary: d,
      expanded: f,
      summaryFromBackend: Ro(c)
    }), i += u.length;
  }
  return {
    groups: a,
    ungrouped: s,
    totalGroups: a.length,
    totalRecords: i
  };
}
function Kn(e, t, n, r) {
  return t === "all" ? !n.has(e) : t === "none" ? n.has(e) : n.size === 0 ? r : n.has(e);
}
function Po(e) {
  const t = e, n = typeof t.group_by == "string" ? t.group_by.trim().toLowerCase() : "", r = Wn(e);
  if (!(n === "family_id" || r === "group")) return !1;
  const o = Xn(e);
  return Array.isArray(o);
}
function Yn(e) {
  return Wn(e) === "ungrouped";
}
function Wn(e) {
  const t = e._group;
  if (!t || typeof t != "object" || Array.isArray(t)) return "";
  const n = t.row_type;
  return typeof n == "string" ? n.trim().toLowerCase() : "";
}
function To(e) {
  const t = e.family_id;
  if (typeof t == "string" && t.trim()) return t.trim();
  const n = e._group;
  if (!n || typeof n != "object" || Array.isArray(n)) return null;
  const r = n.id;
  return typeof r == "string" && r.trim() ? r.trim() : null;
}
function Xn(e) {
  const t = e, n = Array.isArray(t.records) ? t.records : t.children;
  if (Array.isArray(n)) {
    const o = n.filter((a) => !!a && typeof a == "object" && !Array.isArray(a)).map((a) => ({ ...a }));
    if (o.length > 0) return o;
  }
  const r = t.parent;
  return r && typeof r == "object" && !Array.isArray(r) ? [{ ...r }] : [];
}
function Ro(e) {
  const t = e.family_summary;
  return !!t && typeof t == "object" && !Array.isArray(t);
}
function Lo(e, t) {
  const n = e.family_summary;
  if (!n || typeof n != "object" || Array.isArray(n)) return Qn(t);
  const r = n, o = Array.isArray(r.available_locales) ? r.available_locales.filter(Ce) : [], a = Array.isArray(r.missing_locales) ? r.missing_locales.filter(Ce) : [], s = Jn(r.readiness_state) ? r.readiness_state : null, i = Math.max(t.length, typeof r.child_count == "number" ? Math.max(r.child_count, 0) : 0);
  return {
    totalItems: typeof r.total_items == "number" ? Math.max(r.total_items, 0) : i,
    availableLocales: o,
    missingLocales: a,
    readinessState: s,
    readyForPublish: typeof r.ready_for_publish == "boolean" ? r.ready_for_publish : null
  };
}
function Oo(e, t) {
  const n = e.family_label;
  if (typeof n == "string" && n.trim()) return n.trim();
  const r = e.family_summary;
  if (r && typeof r == "object" && !Array.isArray(r)) {
    const i = r.group_label;
    if (typeof i == "string" && i.trim()) return i.trim();
  }
  const o = e._group;
  if (o && typeof o == "object" && !Array.isArray(o)) {
    const i = o.label;
    if (typeof i == "string" && i.trim()) return i.trim();
  }
  const a = [], s = e.parent;
  if (s && typeof s == "object" && !Array.isArray(s)) {
    const i = s;
    a.push(i.title, i.name, i.slug, i.path);
  }
  t.length > 0 && a.push(t[0].title, t[0].name, t[0].slug, t[0].path);
  for (const i of a) if (typeof i == "string" && i.trim()) return i.trim();
}
function Io(e, t) {
  const n = e[t];
  return typeof n == "string" && n.trim() ? n : null;
}
function Qn(e) {
  const t = /* @__PURE__ */ new Set(), n = /* @__PURE__ */ new Set();
  let r = !1, o = 0;
  for (const s of e) {
    const i = s.translation_readiness;
    if (i) {
      const l = i.available_locales, u = i.missing_required_locales, d = i.readiness_state;
      Array.isArray(l) && l.filter(Ce).forEach((f) => t.add(f)), Array.isArray(u) && u.filter(Ce).forEach((f) => n.add(f)), (d === "missing_fields" || d === "missing_locales_and_fields") && (r = !0), d === "ready" && o++;
    }
    const c = s.available_locales;
    Array.isArray(c) && c.filter(Ce).forEach((l) => t.add(l));
  }
  let a = null;
  if (e.length > 0) {
    const s = o === e.length, i = n.size > 0;
    s ? a = "ready" : i && r ? a = "missing_locales_and_fields" : i ? a = "missing_locales" : r && (a = "missing_fields");
  }
  return {
    totalItems: e.length,
    availableLocales: Array.from(t),
    missingLocales: Array.from(n),
    readinessState: a,
    readyForPublish: a === "ready"
  };
}
function Ce(e) {
  return typeof e == "string";
}
function $o(e, t) {
  const n = e.groups.map((r) => {
    const o = t.get(r.groupId);
    return o ? {
      ...r,
      summary: {
        ...r.summary,
        ...o
      },
      summaryFromBackend: !0
    } : r;
  });
  return {
    ...e,
    groups: n
  };
}
function Go(e) {
  const t = /* @__PURE__ */ new Map(), n = e.group_summaries;
  if (!n || typeof n != "object" || Array.isArray(n)) return t;
  for (const [r, o] of Object.entries(n)) if (o && typeof o == "object") {
    const a = o;
    t.set(r, {
      totalItems: typeof a.total_items == "number" ? a.total_items : void 0,
      availableLocales: Array.isArray(a.available_locales) ? a.available_locales.filter(Ce) : void 0,
      missingLocales: Array.isArray(a.missing_locales) ? a.missing_locales.filter(Ce) : void 0,
      readinessState: Jn(a.readiness_state) ? a.readiness_state : void 0,
      readyForPublish: typeof a.ready_for_publish == "boolean" ? a.ready_for_publish : void 0
    });
  }
  return t;
}
function Jn(e) {
  return e === "ready" || e === "missing_locales" || e === "missing_fields" || e === "missing_locales_and_fields";
}
var At = "datagrid-expand-state-";
function Vt(e) {
  if (!Array.isArray(e)) return [];
  const t = [];
  for (const n of e) {
    const r = on(n);
    if (r && !t.includes(r)) {
      if (t.length >= rn) break;
      t.push(r);
    }
  }
  return t;
}
function Zn(e) {
  if (!e) return null;
  try {
    const t = JSON.parse(e);
    return Array.isArray(t) ? {
      version: 2,
      mode: "explicit",
      ids: Vt(t)
    } : !t || typeof t != "object" || Array.isArray(t) ? null : {
      version: 2,
      mode: Ze(t.mode, "explicit"),
      ids: Vt(t.ids)
    };
  } catch {
    return null;
  }
}
function Bo(e) {
  try {
    const t = At + e, n = Zn(localStorage.getItem(t));
    if (n) return new Set(n.ids);
  } catch {
  }
  return /* @__PURE__ */ new Set();
}
function No(e) {
  try {
    const t = At + e, n = Zn(localStorage.getItem(t));
    if (n) return n.mode;
  } catch {
  }
  return "explicit";
}
function Fo(e) {
  try {
    const t = At + e;
    return localStorage.getItem(t) !== null;
  } catch {
    return !1;
  }
}
function Hi(e, t, n = "explicit") {
  try {
    const r = At + e, o = Vt(Array.from(t)), a = {
      version: 2,
      mode: Ze(n, "explicit"),
      ids: o
    };
    localStorage.setItem(r, JSON.stringify(a));
  } catch {
  }
}
function Vi(e, t) {
  const n = e.groups.map((r) => r.groupId === t ? {
    ...r,
    expanded: !r.expanded
  } : r);
  return {
    ...e,
    groups: n
  };
}
function Ki(e) {
  const t = e.groups.map((n) => ({
    ...n,
    expanded: !0
  }));
  return {
    ...e,
    groups: t
  };
}
function Yi(e) {
  const t = e.groups.map((n) => ({
    ...n,
    expanded: !1
  }));
  return {
    ...e,
    groups: t
  };
}
function Wi(e) {
  const t = /* @__PURE__ */ new Set();
  for (const n of e.groups) n.expanded && t.add(n.groupId);
  return t;
}
var er = "datagrid-view-mode-", rn = 200, qo = 256;
function Ze(e, t = "explicit") {
  return e === "all" || e === "none" || e === "explicit" ? e : t;
}
function jo(e) {
  try {
    const t = er + e, n = localStorage.getItem(t);
    if (n && tr(n)) return n;
  } catch {
  }
  return null;
}
function Xi(e, t) {
  try {
    const n = er + e;
    localStorage.setItem(n, t);
  } catch {
  }
}
function tr(e) {
  return e === "flat" || e === "grouped" || e === "matrix" || e === "server_family";
}
function nr(e) {
  return e && tr(e) ? e : null;
}
function Qi(e) {
  if (!(e instanceof Set) || e.size === 0) return "";
  const t = Array.from(new Set(Array.from(e).map((n) => on(n)).filter((n) => n !== null))).slice(0, rn).sort();
  return t.length === 0 ? "" : t.map((n) => encodeURIComponent(n)).join(",");
}
function Uo(e) {
  const t = /* @__PURE__ */ new Set();
  if (!e) return t;
  const n = e.split(",");
  for (const r of n) {
    if (t.size >= rn) break;
    if (!r) continue;
    let o = "";
    try {
      o = decodeURIComponent(r);
    } catch {
      continue;
    }
    const a = on(o);
    a && t.add(a);
  }
  return t;
}
function on(e) {
  if (typeof e != "string") return null;
  let t = e.trim();
  if (!t) return null;
  if (t.includes("%")) try {
    const n = decodeURIComponent(t);
    typeof n == "string" && n.trim() && (t = n.trim());
  } catch {
  }
  return t.length > qo ? null : t;
}
function zo(e, t = {}) {
  const { summary: n } = e, { size: r = "sm" } = t, o = r === "sm" ? "text-xs" : "text-sm", a = n.availableLocales.length, s = a + n.missingLocales.length;
  let i = "";
  if (n.readinessState) {
    const u = Ho(n.readinessState);
    i = `
      <span class="${o} px-1.5 py-0.5 rounded ${u.bgClass} ${u.textClass}"
            title="${u.description}">
        ${u.icon} ${u.label}
      </span>
    `;
  }
  const c = s > 0 ? `<span class="${o} text-gray-500">${a}/${s} locales</span>` : "", l = `<span class="${o} text-gray-500">${n.totalItems} item${n.totalItems !== 1 ? "s" : ""}</span>`;
  return `
    <div class="inline-flex items-center gap-2">
      ${i}
      ${c}
      ${l}
    </div>
  `;
}
function Ho(e) {
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
function Vo(e) {
  if (typeof e.displayLabel == "string" && e.displayLabel.trim()) return e.displayLabel.trim();
  if (e.groupId.startsWith("ungrouped:")) return "Ungrouped Records";
  if (e.records.length > 0) {
    const t = e.records[0];
    for (const n of [
      "title",
      "name",
      "label",
      "subject"
    ]) {
      const r = t[n];
      if (typeof r == "string" && r.trim()) {
        const o = r.trim();
        return o.length > 60 ? o.slice(0, 57) + "..." : o;
      }
    }
  }
  return `Translation Group (${e.groupId.length > 8 ? e.groupId.slice(0, 8) + "..." : e.groupId})`;
}
function Ko(e, t, n = {}) {
  const { showExpandIcon: r = !0, fixedColumnCount: o = 2 } = n, a = r ? `<span class="expand-icon mr-2" aria-hidden="true">${e.expanded ? "▼" : "▶"}</span>` : "", s = zo(e), i = U(Vo(e)), c = e.records.length, l = c > 1 ? `<span class="ml-2 text-xs text-gray-500">(${c} locales)</span>` : "";
  return `
    <tr class="group-header bg-gray-50 hover:bg-gray-100 cursor-pointer border-b border-gray-200"
        data-group-id="${k(e.groupId)}"
        data-expanded="${e.expanded}"
        role="row"
        aria-expanded="${e.expanded}"
        tabindex="0">
      <td colspan="${t + o}" class="px-4 py-2">
        <div class="flex items-center justify-between">
          <div class="flex items-center">
            ${a}
            <span class="font-medium text-gray-700">${i}</span>
            ${l}
          </div>
          ${s}
        </div>
      </td>
    </tr>
  `;
}
function Yo(e, t = 2) {
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
function Wo(e, t = 2) {
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
function Xo(e, t, n, r = 2) {
  const o = n ? `<button type="button" class="mt-2 px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600" onclick="this.dispatchEvent(new CustomEvent('retry', { bubbles: true }))">Retry</button>` : "";
  return `
    <tr class="admin-datagrid__state-row" data-datagrid-state="error">
      <td colspan="${e + r}" class="admin-datagrid__state admin-datagrid__state--error px-6 py-12 text-center" role="alert" aria-live="assertive">
        <div class="text-red-500">
          <svg class="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
          <h3 class="mt-2 text-sm font-medium text-gray-900">Error loading groups</h3>
          <p class="mt-1 text-sm text-gray-500">${U(t)}</p>
          ${o}
        </div>
      </td>
    </tr>
  `;
}
function Qo(e = 768) {
  return typeof window > "u" ? !1 : window.innerWidth < e;
}
function an(e, t = 768) {
  return Qo(t) && e === "grouped" ? "flat" : e;
}
var Ye = "search", We = "page", Xe = "per_page", Qe = "filters", Je = "sort", xt = "state", Jo = "advanced_search", Ct = "hidden_columns", _t = "view_mode", sn = "expanded_groups", Zo = [
  "perPage",
  "hiddenColumns",
  "advancedSearch"
], ln = [
  Ye,
  We,
  Xe,
  Qe,
  Je,
  xt,
  Ct,
  _t,
  sn
], ea = [...ln, Jo], ta = 1800;
function Sn(e, t) {
  const n = t.toString();
  return n ? `${e}?${n}` : e;
}
function wn(e, t) {
  for (const n of t) e.delete(n);
}
var bt = ce("DataGrid");
function na(e) {
  return {
    maxURLLength: Math.max(256, e.config.urlState?.maxURLLength || 1800),
    maxFiltersLength: Math.max(64, e.config.urlState?.maxFiltersLength || 600),
    enableStateToken: e.config.urlState?.enableStateToken !== !1
  };
}
function ra(e, t, n) {
  const r = String(t || "").trim();
  if (!r) return null;
  try {
    const o = JSON.parse(r);
    return Array.isArray(o) ? o : (bt.warn(`[DataGrid] Invalid ${n} payload in URL (expected array)`), null);
  } catch (o) {
    return bt.warn(`[DataGrid] Failed to parse ${n} payload from URL:`, o), null;
  }
}
function En(e, t) {
  return Array.from(new Set(Array.from(e).map((n) => String(n || "").trim()).filter((n) => n.length > 0 && t.has(n)))).sort();
}
function oa(e, t) {
  return e.length !== t.length ? !1 : e.every((n, r) => n === t[r]);
}
function aa(e) {
  const t = new Set(e.config.columns.map((r) => r.field)), n = En(e.state.hiddenColumns || [], t);
  return oa(n, En(e.config.columns.filter((r) => r.hidden).map((r) => r.field), t)) ? null : JSON.stringify(n);
}
function sa(e, t, n = {}) {
  const r = n.merge === !0, o = new Set(e.config.columns.map((i) => i.field)), a = Array.isArray(t.hiddenColumns) ? new Set(t.hiddenColumns.map((i) => String(i || "").trim()).filter((i) => i.length > 0 && o.has(i))) : null;
  a ? (e.state.hiddenColumns = a, e.hasPersistedHiddenColumnState = !0) : r || (e.state.hiddenColumns = new Set(e.config.columns.filter((i) => i.hidden).map((i) => i.field)), e.hasPersistedHiddenColumnState = !1);
  const s = Array.isArray(t.columnOrder) ? t.columnOrder.map((i) => String(i || "").trim()).filter((i) => i.length > 0 && o.has(i)) : null;
  if (s && s.length > 0) {
    const i = e.mergeColumnOrder(s);
    e.state.columnOrder = i, e.hasPersistedColumnOrderState = !0, e.didRestoreColumnOrder = !0, e.shouldReorderDOMOnRestore = e.defaultColumns.map((l) => l.field).join("|") !== i.join("|");
    const c = new Map(e.config.columns.map((l) => [l.field, l]));
    e.config.columns = i.map((l) => c.get(l)).filter((l) => l !== void 0);
  } else r || (e.state.columnOrder = e.config.columns.map((i) => i.field), e.hasPersistedColumnOrderState = !1, e.didRestoreColumnOrder = !1, e.shouldReorderDOMOnRestore = !1);
  if (e.config.enableGroupedMode) {
    if (t.viewMode) {
      const i = nr(t.viewMode);
      i && (e.state.viewMode = an(i));
    }
    e.state.expandMode = Ze(t.expandMode, e.state.expandMode), Array.isArray(t.expandedGroups) ? (e.state.expandedGroups = new Set(t.expandedGroups.map((i) => String(i || "").trim()).filter(Boolean)), e.state.hasPersistedExpandState = !0) : t.expandMode !== void 0 && (e.state.hasPersistedExpandState = !0);
  }
}
function ia(e, t) {
  t.persisted && e.applyPersistedStateSnapshot(t.persisted, { merge: !0 }), typeof t.search == "string" && (e.state.search = t.search), typeof t.page == "number" && Number.isFinite(t.page) && (e.state.currentPage = Math.max(1, Math.trunc(t.page))), typeof t.perPage == "number" && Number.isFinite(t.perPage) && (e.state.perPage = Math.max(1, Math.trunc(t.perPage))), Array.isArray(t.filters) && (e.state.filters = t.filters), Array.isArray(t.sort) && (e.state.sort = t.sort);
}
function la(e) {
  const t = {
    version: 1,
    hiddenColumns: Array.from(e.state.hiddenColumns),
    columnOrder: [...e.state.columnOrder],
    updatedAt: Date.now()
  };
  return e.config.enableGroupedMode && (t.viewMode = e.state.viewMode, t.expandMode = e.state.expandMode, t.expandedGroups = Array.from(e.state.expandedGroups)), t;
}
function ca(e) {
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
function ua(e) {
  e.stateStore.savePersistedState(e.buildPersistedStateSnapshot());
}
function da(e) {
  const t = new URLSearchParams(window.location.search);
  e.didRestoreColumnOrder = !1, e.shouldReorderDOMOnRestore = !1, e.hasURLStateOverrides = ea.some((l) => t.has(l));
  const n = t.get(xt);
  if (n) {
    const l = e.stateStore.resolveShareState(n);
    l && e.applyShareStateSnapshot(l);
  }
  const r = t.get(Ye);
  if (r) {
    e.state.search = r;
    const l = document.querySelector(e.selectors.searchInput);
    l && (l.value = r);
  }
  const o = t.get(We);
  if (o) {
    const l = parseInt(o, 10);
    e.state.currentPage = Number.isNaN(l) ? 1 : Math.max(1, l);
  }
  const a = t.get(Xe);
  if (a) {
    const l = parseInt(a, 10), u = e.config.perPage || 10;
    e.state.perPage = Number.isNaN(l) ? u : Math.max(1, l);
    const d = document.querySelector(e.selectors.perPageSelect);
    d && (d.value = String(e.state.perPage));
  }
  const s = t.get(Qe);
  if (s) {
    const l = e.parseJSONArray(s, "filters");
    l && (e.state.filters = l);
  }
  const i = t.get(Je);
  if (i) {
    const l = e.parseJSONArray(i, "sort");
    l && (e.state.sort = l);
  }
  if (e.config.enableGroupedMode) {
    const l = nr(t.get(_t));
    l && (e.state.viewMode = an(l)), t.has("expanded_groups") && (e.state.expandedGroups = Uo(t.get(sn)), e.state.expandMode = "explicit", e.state.hasPersistedExpandState = !0);
  }
  const c = t.get(Ct);
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
  e.persistStateSnapshot(), bt.debug("[DataGrid] State restored from URL:", e.state), setTimeout(() => {
    e.applyRestoredState();
  }, 0);
}
function fa(e) {
  const t = document.querySelector(e.selectors.searchInput);
  t && (t.value = e.state.search);
  const n = document.querySelector(e.selectors.perPageSelect);
  n && (n.value = String(e.state.perPage)), e.state.filters.length > 0 && e.state.filters.forEach((o) => {
    const a = document.querySelector(`[data-filter-column="${o.column}"]`);
    a && (a.value = String(o.value));
  }), e.didRestoreColumnOrder && e.shouldReorderDOMOnRestore && e.reorderTableColumns(e.state.columnOrder);
  const r = e.config.columns.filter((o) => !e.state.hiddenColumns.has(o.field)).map((o) => o.field);
  e.updateColumnVisibility(r, !0), e.state.sort.length > 0 && e.updateSortIndicators();
}
function pa(e, t = {}) {
  e.persistStateSnapshot();
  const n = e.getURLStateConfig(), r = new URLSearchParams(window.location.search);
  wn(r, ln), wn(r, Zo), e.state.search && r.set(Ye, e.state.search), e.state.currentPage > 1 && r.set(We, String(e.state.currentPage)), e.state.perPage !== (e.config.perPage || 10) && r.set(Xe, String(e.state.perPage));
  let o = !1;
  if (e.state.filters.length > 0) {
    const c = JSON.stringify(e.state.filters);
    c.length <= n.maxFiltersLength ? r.set(Qe, c) : o = !0;
  }
  e.state.sort.length > 0 && r.set(Je, JSON.stringify(e.state.sort));
  const a = aa(e);
  a !== null && r.set(Ct, a), e.config.enableGroupedMode && r.set(_t, e.state.viewMode);
  let s = Sn(window.location.pathname, r);
  const i = s.length > n.maxURLLength;
  if (n.enableStateToken && (o || i)) {
    r.delete(Ye), r.delete(We), r.delete(Xe), r.delete(Qe), r.delete(Je);
    const c = e.stateStore.createShareState(e.buildShareStateSnapshot());
    c && r.set(xt, c), s = Sn(window.location.pathname, r);
  }
  t.replace ? window.history.replaceState({}, "", s) : window.history.pushState({}, "", s), bt.debug("[DataGrid] URL updated:", s);
}
var W = ce("DataGrid");
async function ha(e, t) {
  W.debug("[DataGrid] ===== refresh() CALLED ====="), W.debug("[DataGrid] Current sort state:", JSON.stringify(e.state.sort)), e.abortController && e.abortController.abort(), e.abortController = new AbortController(), e.setRenderState("loading"), e.renderLoadingState();
  try {
    const n = e.buildApiUrl(), r = await Q(n, {
      signal: e.abortController.signal,
      method: "GET",
      accept: "application/json"
    });
    if (!r.ok) {
      if (e.handleGroupedModeStatusFallback(r.status)) return;
      throw new Error(`HTTP error! status: ${r.status}`);
    }
    const o = await r.json(), a = Or(o) || o;
    if (typeof t == "number" && typeof e.isCurrentRefresh == "function" && !e.isCurrentRefresh(t)) {
      W.debug("[DataGrid] Ignoring stale refresh response");
      return;
    }
    W.debug("[DataGrid] API Response:", a), W.debug("[DataGrid] API Response data array:", a.data), W.debug("[DataGrid] API Response total:", a.total, "count:", a.count, "$meta:", a.$meta);
    const s = a.data || a.records || [];
    if (e.handleGroupedModePayloadFallback(s)) return;
    e.lastSchema = a.schema || null, e.lastForm = a.form || null, e.setBulkActionState(a.$meta?.bulk_action_state || null, a.schema?.bulk_action_state_config || null);
    const i = e.getResponseTotal(a);
    if (e.normalizePagination(i)) {
      if (typeof e.requestRefreshAfterCurrent == "function") {
        e.requestRefreshAfterCurrent();
        return;
      }
      return e.refresh();
    }
    W.debug("[DataGrid] About to call renderData()..."), e.renderData(a), W.debug("[DataGrid] renderData() completed"), e.updatePaginationUI(a), e.updateBulkActionsBar(), W.debug("[DataGrid] ===== refresh() COMPLETED =====");
  } catch (n) {
    if (n instanceof Error && n.name === "AbortError") {
      W.debug("[DataGrid] Request aborted");
      return;
    }
    W.error("[DataGrid] Error fetching data:", n);
    const r = "Failed to load data";
    e.renderErrorState(r), e.setRenderState("error"), e.showError(r);
  }
}
function ma(e) {
  const t = new URLSearchParams(), n = e.buildQueryParams();
  Object.entries(n).forEach(([o, a]) => {
    a != null && t.append(o, String(a));
  });
  const r = `${e.config.apiEndpoint}?${t.toString()}`;
  return W.debug(`[DataGrid] API URL: ${r}`), r;
}
function ba(e) {
  const t = new URLSearchParams(), n = e.buildQueryParams();
  return Object.entries(n).forEach(([r, o]) => {
    o != null && t.append(r, String(o));
  }), t.toString();
}
function ga(e) {
  const t = {};
  if (e.config.behaviors?.pagination) {
    const n = e.config.behaviors.pagination.buildQuery(e.state.currentPage, e.state.perPage);
    Object.assign(t, n);
  }
  if (e.state.search && e.config.behaviors?.search) {
    const n = e.config.behaviors.search.buildQuery(e.state.search);
    Object.assign(t, n);
  }
  if (e.state.filters.length > 0 && e.config.behaviors?.filter) {
    const n = e.config.behaviors.filter.buildFilters(e.state.filters);
    Object.assign(t, n);
  }
  if (e.state.sort.length > 0 && e.config.behaviors?.sort) {
    const n = e.config.behaviors.sort.buildQuery(e.state.sort);
    Object.assign(t, n);
  }
  return e.isGroupedViewActive() && (t.group_by = e.config.groupByField || "family_id"), t;
}
function ya(e, t) {
  return t.total !== void 0 && t.total !== null ? t.total : t.$meta?.count !== void 0 && t.$meta?.count !== null ? t.$meta.count : t.count !== void 0 && t.count !== null ? t.count : null;
}
function va(e, t) {
  if (t === null) return !1;
  const n = Math.max(1, e.state.perPage || e.config.perPage || 10), r = Math.max(1, Math.ceil(t / n));
  let o = e.state.currentPage;
  t === 0 ? o = 1 : o > r ? o = r : o < 1 && (o = 1);
  const a = n !== e.state.perPage || o !== e.state.currentPage;
  return a && (e.state.perPage = n, e.state.currentPage = o, e.pushStateToURL()), t === 0 ? !1 : a;
}
async function Sa(e, t) {
  const n = await Q(`${e.config.apiEndpoint}/${t}`, {
    method: "GET",
    accept: "application/json"
  });
  if (!n.ok) throw new Error(`Detail request failed: ${n.status}`);
  const r = await n.json(), o = e.normalizeDetailResponse(r);
  return o.schema && (e.lastSchema = o.schema), o.form && (e.lastForm = o.form), {
    ...o,
    tabs: o.schema?.tabs || []
  };
}
function wa(e, t) {
  const n = $r(t) || t;
  if (n && typeof n == "object" && "data" in n) {
    const r = n;
    return {
      data: r.data,
      schema: r.schema,
      form: r.form
    };
  }
  return { data: t };
}
function Ea(e) {
  return e.lastSchema;
}
function Aa(e) {
  return e.lastForm;
}
function xa(e) {
  return e.lastSchema?.tabs || [];
}
function cn(e) {
  return typeof e.config.rowActions == "function" || e.config.useDefaultActions !== !1;
}
function et(e) {
  return (cn(e) ? 1 : 0) + (e.isCapabilityEnabled("selection") ? 1 : 0);
}
function rr(e) {
  return Math.max(1, (e.config.columns?.length || 0) + et(e));
}
var or = ce("DataGrid");
function Ca(e, t, n, r) {
  const o = e.config.groupByField || "family_id", a = n.filter((l) => !!l && typeof l == "object" && !Array.isArray(l));
  let s = Mo(a, {
    groupByField: o,
    defaultExpanded: !e.state.hasPersistedExpandState,
    expandMode: e.state.expandMode,
    expandedGroups: e.state.expandedGroups
  });
  s || (s = Do(a, {
    groupByField: o,
    defaultExpanded: !e.state.hasPersistedExpandState,
    expandMode: e.state.expandMode,
    expandedGroups: e.state.expandedGroups
  }));
  const i = Go(t);
  i.size > 0 && (s = $o(s, i)), e.state.groupedData = s;
  const c = e.config.columns.length;
  for (const l of s.groups) {
    const u = Ko(l, c, { fixedColumnCount: et(e) });
    r.insertAdjacentHTML("beforeend", u);
    const d = r.lastElementChild;
    d && (d.addEventListener("click", () => e.toggleGroup(l.groupId)), d.addEventListener("keydown", (f) => {
      (f.key === "Enter" || f.key === " ") && (f.preventDefault(), e.toggleGroup(l.groupId));
    }));
    for (const f of l.records) {
      f.id && (e.recordsById[f.id] = f);
      const p = e.createTableRow(f);
      p.dataset.groupId = l.groupId, p.classList.add("group-child-row"), l.expanded || (p.style.display = "none"), r.appendChild(p);
    }
  }
  for (const l of s.ungrouped) {
    l.id && (e.recordsById[l.id] = l);
    const u = e.createTableRow(l);
    r.appendChild(u);
  }
  or.debug(`[DataGrid] Rendered ${s.groups.length} groups, ${s.ungrouped.length} ungrouped`);
}
function _a(e) {
  return e.config.enableGroupedMode ? e.state.viewMode === "grouped" || e.state.viewMode === "matrix" : !1;
}
function ka(e, t) {
  e.isGroupedViewActive() && (e.state.viewMode = "flat", e.state.groupedData = null, e.pushStateToURL({ replace: !0 }), e.notify(t, "warning"), e.refresh());
}
function Da(e, t) {
  return !e.isGroupedViewActive() || ![
    400,
    404,
    405,
    422
  ].includes(t) ? !1 : (e.fallbackGroupedMode("Grouped pagination is not supported by this panel. Switched to flat view."), !0);
}
function Ma(e, t) {
  if (!e.isGroupedViewActive() || t.length === 0) return !1;
  const n = t.filter((r) => !!r && typeof r == "object" && !Array.isArray(r));
  return n.length !== t.length || !Vn(n) ? (e.fallbackGroupedMode("Grouped pagination contract is unavailable. Switched to flat view to avoid split groups."), !0) : !1;
}
function Pa(e, t) {
  if (!e.state.groupedData) return;
  const n = String(t || "").trim();
  if (!n) return;
  const r = e.isGroupExpandedByState(n, !e.state.hasPersistedExpandState);
  e.state.expandMode === "all" ? r ? e.state.expandedGroups.add(n) : e.state.expandedGroups.delete(n) : e.state.expandMode === "none" ? r ? e.state.expandedGroups.delete(n) : e.state.expandedGroups.add(n) : (!e.state.hasPersistedExpandState && e.state.expandedGroups.size === 0 && (e.state.expandedGroups = new Set(e.state.groupedData.groups.map((a) => a.groupId))), e.state.expandedGroups.has(n) ? e.state.expandedGroups.delete(n) : e.state.expandedGroups.add(n)), e.state.hasPersistedExpandState = !0;
  const o = e.state.groupedData.groups.find((a) => a.groupId === n);
  o && (o.expanded = e.isGroupExpandedByState(n)), e.updateGroupVisibility(n), e.pushStateToURL({ replace: !0 });
}
function Ta(e, t) {
  if (!e.config.enableGroupedMode) return;
  const n = new Set((t || []).map((r) => String(r || "").trim()).filter(Boolean));
  e.state.expandMode = "explicit", e.state.expandedGroups = n, e.state.hasPersistedExpandState = !0, e.updateGroupedRowsFromState(), e.pushStateToURL({ replace: !0 }), !e.state.groupedData && e.isGroupedViewActive() && e.refresh();
}
function Ra(e) {
  e.config.enableGroupedMode && (e.state.expandMode = "all", e.state.expandedGroups.clear(), e.state.hasPersistedExpandState = !0, e.updateGroupedRowsFromState(), e.pushStateToURL({ replace: !0 }), !e.state.groupedData && e.isGroupedViewActive() && e.refresh());
}
function La(e) {
  e.config.enableGroupedMode && (e.state.expandMode = "none", e.state.expandedGroups.clear(), e.state.hasPersistedExpandState = !0, e.updateGroupedRowsFromState(), e.pushStateToURL({ replace: !0 }), !e.state.groupedData && e.isGroupedViewActive() && e.refresh());
}
function Oa(e, t) {
  const n = e.tableEl?.querySelector("tbody");
  if (!n) return;
  const r = n.querySelector(`tr[data-group-id="${t}"]`);
  if (!r) return;
  const o = e.isGroupExpandedByState(t);
  r.dataset.expanded = String(o), r.setAttribute("aria-expanded", String(o));
  const a = r.querySelector(".expand-icon");
  a && (a.textContent = o ? "▼" : "▶"), n.querySelectorAll(`tr.group-child-row[data-group-id="${t}"]`).forEach((s) => {
    s.style.display = o ? "" : "none";
  });
}
function Ia(e) {
  if (e.state.groupedData)
    for (const t of e.state.groupedData.groups)
      t.expanded = e.isGroupExpandedByState(t.groupId), e.updateGroupVisibility(t.groupId);
}
function $a(e, t, n = !1) {
  const r = Ze(e.state.expandMode, "explicit");
  return r === "all" ? !e.state.expandedGroups.has(t) : r === "none" ? e.state.expandedGroups.has(t) : e.state.expandedGroups.size === 0 ? n : e.state.expandedGroups.has(t);
}
function Ga(e, t) {
  if (!e.config.enableGroupedMode) {
    or.warn("[DataGrid] Grouped mode not enabled");
    return;
  }
  const n = an(t);
  e.state.viewMode = n, n === "flat" && (e.state.groupedData = null), e.pushStateToURL(), e.refresh();
}
function Ba(e) {
  return e.state.viewMode;
}
function Na(e) {
  return e.state.groupedData;
}
var Fa = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
  <g transform="translate(2.16665 6.83333)">
    <path d="M7 1.16667C7 1.811 6.47767 2.33333 5.83333 2.33333C5.189 2.33333 4.66667 1.811 4.66667 1.16667C4.66667 0.522334 5.189 0 5.83333 0C6.47767 0 7 0.522334 7 1.16667Z" fill="currentColor"/>
    <path d="M11.6667 1.16667C11.6667 1.811 11.1443 2.33333 10.5 2.33333C9.85567 2.33333 9.33333 1.811 9.33333 1.16667C9.33333 0.522334 9.85567 0 10.5 0C11.1443 0 11.6667 0.522334 11.6667 1.16667Z" fill="currentColor"/>
    <path d="M2.33333 1.16667C2.33333 1.811 1.811 2.33333 1.16667 2.33333C0.522334 2.33333 0 1.811 0 1.16667C0 0.522334 0.522334 0 1.16667 0C1.811 0 2.33333 0.522334 2.33333 1.16667Z" fill="currentColor"/>
  </g>
</svg>
`, _e = ce("DataGrid");
function qa(e, t, n = !1) {
  if (!e.tableEl) return;
  const r = new Set(t);
  e.state.hiddenColumns.clear(), e.config.columns.forEach((o) => {
    r.has(o.field) || e.state.hiddenColumns.add(o.field);
  }), n || e.pushStateToURL(), e.tableEl.querySelectorAll("thead th[data-column]").forEach((o) => {
    const a = o.dataset.column;
    a && (o.style.display = r.has(a) ? "" : "none");
  }), e.tableEl.querySelectorAll("tbody td[data-column]").forEach((o) => {
    const a = o.dataset.column;
    a && (o.style.display = r.has(a) ? "" : "none");
  }), e.syncColumnVisibilityCheckboxes();
}
function ja(e) {
  if (e.columnManager) {
    e.columnManager.syncWithGridState();
    return;
  }
  const t = document.querySelector(e.selectors.columnToggleMenu);
  t && e.config.columns.forEach((n) => {
    const r = t.querySelector(`input[data-column="${n.field}"]`);
    r && (r.checked = !e.state.hiddenColumns.has(n.field));
  });
}
function ar(e) {
  e.querySelectorAll("[data-datagrid-state]").forEach((t) => t.remove());
}
function Ua(e) {
  !e.tableEl || cn(e) || e.tableEl.querySelectorAll('thead [data-role="actions"]').forEach((t) => t.remove());
}
function sr(e, t, n) {
  const r = document.createElement("tr");
  r.className = "admin-datagrid__state-row", r.dataset.datagridState = t;
  const o = document.createElement("td");
  return o.colSpan = rr(e), o.className = `admin-datagrid__state admin-datagrid__state--${t} px-6 py-8 text-center`, o.setAttribute("role", t === "error" ? "alert" : "status"), o.setAttribute("aria-live", t === "error" ? "assertive" : "polite"), o.textContent = n, r.appendChild(o), r;
}
function za(e) {
  const t = e.tableEl?.querySelector("tbody");
  if (t && (ar(t), !(t.children.length > 0))) {
    if (e.isGroupedViewActive()) {
      t.insertAdjacentHTML("beforeend", Wo(e.config.columns.length, et(e)));
      return;
    }
    t.appendChild(sr(e, "loading", "Loading…"));
  }
}
function Ha(e, t) {
  const n = e.tableEl?.querySelector("tbody");
  if (n) {
    if (ar(n), e.isGroupedViewActive()) {
      n.insertAdjacentHTML("afterbegin", Xo(e.config.columns.length, t, void 0, et(e)));
      return;
    }
    n.prepend(sr(e, "error", t));
  }
}
function Va(e, t) {
  const n = e.tableEl?.querySelector("tbody");
  if (!n) {
    _e.error("[DataGrid] tbody not found!");
    return;
  }
  e.actionMenuController?.closeAll(), n.innerHTML = "";
  const r = t.data || t.records || [];
  _e.debug(`[DataGrid] renderData() called with ${r.length} items`), _e.debug("[DataGrid] First 3 items:", r.slice(0, 3));
  const o = e.getResponseTotal(t);
  if (e.state.totalRows = o ?? r.length, r.length === 0) {
    e.isGroupedViewActive() ? n.innerHTML = Yo(e.config.columns.length, et(e)) : n.innerHTML = `
          <tr class="admin-datagrid__state-row" data-datagrid-state="empty">
            <td colspan="${rr(e)}" class="admin-datagrid__state admin-datagrid__state--empty px-6 py-8 text-center text-gray-500">
              No results found
            </td>
          </tr>
        `, e.setRenderState("empty");
    return;
  }
  e.recordsById = /* @__PURE__ */ Object.create(null), e.isGroupedViewActive() ? e.renderGroupedData(t, r, n) : e.renderFlatData(r, n), e.state.hiddenColumns.size > 0 && n.querySelectorAll("td[data-column]").forEach((a) => {
    const s = a.dataset.column;
    s && e.state.hiddenColumns.has(s) && (a.style.display = "none");
  }), e.isCapabilityEnabled("selection") && e.updateSelectionBindings(), e.setRenderState("ready");
}
function Ka(e, t, n) {
  t.forEach((r, o) => {
    _e.debug(`[DataGrid] Rendering row ${o + 1}: id=${r.id}`), r.id && (e.recordsById[r.id] = r);
    const a = e.createTableRow(r);
    n.appendChild(a);
  }), _e.debug(`[DataGrid] Finished appending ${t.length} rows to tbody`), _e.debug("[DataGrid] tbody.children.length =", n.children.length);
}
function Ya(e, t) {
  const n = t.rendererOptions ?? t.renderer_options;
  return !n || typeof n != "object" || Array.isArray(n) ? {} : n;
}
function Wa(e, t) {
  const n = document.createElement("tr");
  let r = ["admin-datagrid__row", "hover:bg-gray-50"];
  if (e.config.rowClassProvider && (r = r.concat(e.config.rowClassProvider(t))), n.className = r.join(" "), e.isCapabilityEnabled("selection")) {
    const i = document.createElement("td");
    i.className = "admin-datagrid__cell px-6 py-4 whitespace-nowrap", i.dataset.role = "selection", i.dataset.fixed = "left", i.innerHTML = `
        <label class="flex">
          <input type="checkbox"
                 class="table-checkbox shrink-0 border-gray-300 rounded text-blue-600 focus:ring-blue-500"
                 data-id="${k(t.id)}">
          <span class="sr-only">Select</span>
        </label>
      `, n.appendChild(i);
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
      const f = mt(l);
      c.textContent = f ? f.toLocaleDateString() : String(l);
    } else c.textContent = String(l);
    n.appendChild(c);
  }), !cn(e)) return n;
  const o = e.config.actionBasePath || e.config.apiEndpoint, a = document.createElement("td");
  a.className = "admin-datagrid__cell admin-datagrid__actions px-6 py-4 whitespace-nowrap text-end text-sm font-medium", a.dataset.role = "actions", a.dataset.fixed = "right";
  const s = (i) => {
    a.innerHTML = e.actionRenderer.renderRowActions(t, i), e.actionRenderer.attachRowActionListeners(a, i, t, { onError: async (c, l) => {
      if (ct(c)?.textCode && await e.refresh(), !Le(c)) {
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
        window.location.href = `${o}/${t.id}`;
      },
      variant: "secondary"
    },
    {
      label: "Edit",
      icon: "edit",
      action: () => {
        window.location.href = `${o}/${t.id}/edit`;
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
  ]), n.appendChild(a), n;
}
function Xa(e, t) {
  return t.toLowerCase().replace(/[^a-z0-9]/g, "-");
}
async function Qa(e, t) {
  try {
    await Br({
      endpoint: `${e.config.apiEndpoint}/${t}`,
      confirmMessage: "Are you sure you want to delete this item?",
      confirmTitle: "Confirm Delete",
      onSuccess: async () => {
        await e.refresh();
      },
      onError: (n) => {
        e.showError($n(n, "Delete failed"));
      },
      reconcileOnDomainFailure: async () => {
        await e.refresh();
      },
      notifier: { confirm: async (n, r) => e.confirmAction(n, r) }
    });
  } catch (n) {
    _e.error("Error deleting item:", n), Le(n) || e.showError(n instanceof Error ? n.message : "Failed to delete item");
  }
}
function Ja(e, t) {
  const n = e.getResponseTotal(t) ?? e.state.totalRows, r = e.state.perPage * (e.state.currentPage - 1), o = n === 0 ? 0 : r + 1, a = Math.min(r + e.state.perPage, n), s = document.querySelector(e.selectors.tableInfoStart), i = document.querySelector(e.selectors.tableInfoEnd), c = document.querySelector(e.selectors.tableInfoTotal), l = e.selectors.tableInfoSummary ? document.querySelector(e.selectors.tableInfoSummary) : null;
  if (s && (s.textContent = ke(e, o)), i && (i.textContent = ke(e, a)), c && (c.textContent = ke(e, n)), l) {
    const u = ns(e, o, a, n);
    u !== null && (l.textContent = u);
  }
  e.renderPaginationButtons(n);
}
function Za(e, t) {
  const n = document.querySelector(e.selectors.paginationContainer);
  if (!n) return;
  const r = e.config.pagination?.mode === "semantic";
  (n.closest?.("[data-datagrid-pagination]") || n).classList?.toggle("admin-datagrid__pagination--presented", r);
  const o = Math.ceil(t / e.state.perPage);
  if (o <= 1) {
    n.innerHTML = "";
    return;
  }
  const a = e.state.currentPage;
  n.innerHTML = (r ? es(e, o, a) : ts(o, a)).join(""), n.querySelectorAll("[data-page]").forEach((s) => {
    s.addEventListener("click", async () => {
      const i = parseInt(s.dataset.page || "1", 10);
      i >= 1 && i <= o && (e.state.currentPage = i, e.pushStateToURL(), e.config.behaviors?.pagination ? await e.config.behaviors.pagination.onPageChange(i, e) : await e.refresh());
    });
  });
}
function es(e, t, n) {
  const r = [], o = {
    previous: xe(e.config.pagination?.labels?.previous, "Previous"),
    next: xe(e.config.pagination?.labels?.next, "Next"),
    previousPage: xe(e.config.pagination?.labels?.previousPage, "Previous page"),
    nextPage: xe(e.config.pagination?.labels?.nextPage, "Next page"),
    page: xe(e.config.pagination?.labels?.page, "Page {page}")
  };
  r.push(`
      <button type="button"
              data-page="${n - 1}"
              aria-label="${k(o.previousPage)}"
              ${n === 1 ? "disabled" : ""}
              class="admin-datagrid__page-button admin-datagrid__page-button--boundary">
        <span>${U(o.previous)}</span>
      </button>
    `);
  for (const a of ir(t, n)) {
    if (a === "ellipsis") {
      r.push(`<span class="admin-datagrid__page-ellipsis" aria-hidden="true">${Fa}</span>`);
      continue;
    }
    const s = a === n, i = ke(e, a), c = o.page.includes("{page}") ? o.page.replace("{page}", i) : `${o.page} ${i}`;
    r.push(`
        <button type="button"
                data-page="${a}"
                aria-label="${k(c)}"
                ${s ? 'aria-current="page"' : ""}
                class="admin-datagrid__page-button admin-datagrid__page-button--page${s ? " admin-datagrid__page-button--active" : ""}">
          ${U(i)}
        </button>
      `);
  }
  return r.push(`
      <button type="button"
              data-page="${n + 1}"
              aria-label="${k(o.nextPage)}"
              ${n === t ? "disabled" : ""}
              class="admin-datagrid__page-button admin-datagrid__page-button--boundary">
        <span>${U(o.next)}</span>
      </button>
    `), r;
}
function ts(e, t) {
  const n = [];
  n.push(`
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
  for (const r of ir(e, t)) {
    if (r === "ellipsis") {
      n.push('<span class="admin-datagrid__page-ellipsis min-w-[24px] text-center text-gray-500" aria-hidden="true">…</span>');
      continue;
    }
    const o = r === t;
    n.push(`
      <button type="button"
              data-page="${r}"
              aria-label="Page ${r}"
              ${o ? 'aria-current="page"' : ""}
              class="min-h-[38px] min-w-[38px] flex justify-center items-center ${o ? "bg-gray-200 text-gray-800 focus:outline-none focus:bg-gray-300" : "text-gray-800 hover:bg-gray-100 focus:outline-none focus:bg-gray-100"} admin-datagrid__page-button py-2 px-3 text-sm rounded-lg">
        ${r}
      </button>
    `);
  }
  return n.push(`
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
  `), n;
}
function xe(e, t) {
  return typeof e == "string" && e.trim() ? e.trim() : t;
}
function ns(e, t, n, r) {
  const o = e.config.pagination?.labels?.summary;
  if (!o || typeof o != "object") return null;
  let a = r === 1 ? "one" : "other";
  try {
    a = new Intl.PluralRules(e.config.pagination?.locale).select(r);
  } catch {
  }
  const s = xe(o[a], xe(o.other, ""));
  if (!s) return null;
  const i = {
    start: ke(e, t),
    end: ke(e, n),
    total: ke(e, r)
  };
  return s.replace(/\{(start|end|total)\}/g, (c, l) => i[l]);
}
function ke(e, t) {
  const n = e.config.pagination?.locale;
  if (!n) return String(t);
  try {
    return new Intl.NumberFormat(n).format(t);
  } catch {
    return String(t);
  }
}
function ir(e, t) {
  const n = Math.max(0, Math.floor(e)), r = Math.min(Math.max(1, Math.floor(t)), Math.max(n, 1));
  return n <= 7 ? Array.from({ length: n }, (o, a) => a + 1) : r <= 4 ? [
    1,
    2,
    3,
    4,
    5,
    "ellipsis",
    n
  ] : r >= n - 3 ? [
    1,
    "ellipsis",
    n - 4,
    n - 3,
    n - 2,
    n - 1,
    n
  ] : [
    1,
    "ellipsis",
    r - 1,
    r,
    r + 1,
    "ellipsis",
    n
  ];
}
function An(e, t) {
  var n = Object.keys(e);
  if (Object.getOwnPropertySymbols) {
    var r = Object.getOwnPropertySymbols(e);
    t && (r = r.filter(function(o) {
      return Object.getOwnPropertyDescriptor(e, o).enumerable;
    })), n.push.apply(n, r);
  }
  return n;
}
function oe(e) {
  for (var t = 1; t < arguments.length; t++) {
    var n = arguments[t] != null ? arguments[t] : {};
    t % 2 ? An(Object(n), !0).forEach(function(r) {
      rs(e, r, n[r]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(n)) : An(Object(n)).forEach(function(r) {
      Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(n, r));
    });
  }
  return e;
}
function ut(e) {
  "@babel/helpers - typeof";
  return typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? ut = function(t) {
    return typeof t;
  } : ut = function(t) {
    return t && typeof Symbol == "function" && t.constructor === Symbol && t !== Symbol.prototype ? "symbol" : typeof t;
  }, ut(e);
}
function rs(e, t, n) {
  return t in e ? Object.defineProperty(e, t, {
    value: n,
    enumerable: !0,
    configurable: !0,
    writable: !0
  }) : e[t] = n, e;
}
function le() {
  return le = Object.assign || function(e) {
    for (var t = 1; t < arguments.length; t++) {
      var n = arguments[t];
      for (var r in n) Object.prototype.hasOwnProperty.call(n, r) && (e[r] = n[r]);
    }
    return e;
  }, le.apply(this, arguments);
}
function os(e, t) {
  if (e == null) return {};
  var n = {}, r = Object.keys(e), o, a;
  for (a = 0; a < r.length; a++)
    o = r[a], !(t.indexOf(o) >= 0) && (n[o] = e[o]);
  return n;
}
function as(e, t) {
  if (e == null) return {};
  var n = os(e, t), r, o;
  if (Object.getOwnPropertySymbols) {
    var a = Object.getOwnPropertySymbols(e);
    for (o = 0; o < a.length; o++)
      r = a[o], !(t.indexOf(r) >= 0) && Object.prototype.propertyIsEnumerable.call(e, r) && (n[r] = e[r]);
  }
  return n;
}
var ss = "1.15.6";
function ie(e) {
  if (typeof window < "u" && window.navigator) return !!/* @__PURE__ */ navigator.userAgent.match(e);
}
var ue = ie(/(?:Trident.*rv[ :]?11\.|msie|iemobile|Windows Phone)/i), tt = ie(/Edge/i), xn = ie(/firefox/i), je = ie(/safari/i) && !ie(/chrome/i) && !ie(/android/i), un = ie(/iP(ad|od|hone)/i), lr = ie(/chrome/i) && ie(/android/i), cr = {
  capture: !1,
  passive: !1
};
function A(e, t, n) {
  e.addEventListener(t, n, !ue && cr);
}
function E(e, t, n) {
  e.removeEventListener(t, n, !ue && cr);
}
function gt(e, t) {
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
function ur(e) {
  return e.host && e !== document && e.host.nodeType ? e.host : e.parentNode;
}
function ee(e, t, n, r) {
  if (e) {
    n = n || document;
    do {
      if (t != null && (t[0] === ">" ? e.parentNode === n && gt(e, t) : gt(e, t)) || r && e === n) return e;
      if (e === n) break;
    } while (e = ur(e));
  }
  return null;
}
var Cn = /\s+/g;
function H(e, t, n) {
  e && t && (e.classList ? e.classList[n ? "add" : "remove"](t) : e.className = ((" " + e.className + " ").replace(Cn, " ").replace(" " + t + " ", " ") + (n ? " " + t : "")).replace(Cn, " "));
}
function g(e, t, n) {
  var r = e && e.style;
  if (r) {
    if (n === void 0)
      return document.defaultView && document.defaultView.getComputedStyle ? n = document.defaultView.getComputedStyle(e, "") : e.currentStyle && (n = e.currentStyle), t === void 0 ? n : n[t];
    !(t in r) && t.indexOf("webkit") === -1 && (t = "-webkit-" + t), r[t] = n + (typeof n == "string" ? "" : "px");
  }
}
function Oe(e, t) {
  var n = "";
  if (typeof e == "string") n = e;
  else do {
    var r = g(e, "transform");
    r && r !== "none" && (n = r + " " + n);
  } while (!t && (e = e.parentNode));
  var o = window.DOMMatrix || window.WebKitCSSMatrix || window.CSSMatrix || window.MSCSSMatrix;
  return o && new o(n);
}
function dr(e, t, n) {
  if (e) {
    var r = e.getElementsByTagName(t), o = 0, a = r.length;
    if (n) for (; o < a; o++) n(r[o], o);
    return r;
  }
  return [];
}
function re() {
  var e = document.scrollingElement;
  return e || document.documentElement;
}
function L(e, t, n, r, o) {
  if (!(!e.getBoundingClientRect && e !== window)) {
    var a, s, i, c, l, u, d;
    if (e !== window && e.parentNode && e !== re() ? (a = e.getBoundingClientRect(), s = a.top, i = a.left, c = a.bottom, l = a.right, u = a.height, d = a.width) : (s = 0, i = 0, c = window.innerHeight, l = window.innerWidth, u = window.innerHeight, d = window.innerWidth), (t || n) && e !== window && (o = o || e.parentNode, !ue))
      do
        if (o && o.getBoundingClientRect && (g(o, "transform") !== "none" || n && g(o, "position") !== "static")) {
          var f = o.getBoundingClientRect();
          s -= f.top + parseInt(g(o, "border-top-width")), i -= f.left + parseInt(g(o, "border-left-width")), c = s + a.height, l = i + a.width;
          break;
        }
      while (o = o.parentNode);
    if (r && e !== window) {
      var p = Oe(o || e), m = p && p.a, b = p && p.d;
      p && (s /= b, i /= m, d /= m, u /= b, c = s + u, l = i + d);
    }
    return {
      top: s,
      left: i,
      bottom: c,
      right: l,
      width: d,
      height: u
    };
  }
}
function _n(e, t, n) {
  for (var r = me(e, !0), o = L(e)[t]; r; ) {
    var a = L(r)[n], s = void 0;
    if (n === "top" || n === "left" ? s = o >= a : s = o <= a, !s) return r;
    if (r === re()) break;
    r = me(r, !1);
  }
  return !1;
}
function Ie(e, t, n, r) {
  for (var o = 0, a = 0, s = e.children; a < s.length; ) {
    if (s[a].style.display !== "none" && s[a] !== y.ghost && (r || s[a] !== y.dragged) && ee(s[a], n.draggable, e, !1)) {
      if (o === t) return s[a];
      o++;
    }
    a++;
  }
  return null;
}
function dn(e, t) {
  for (var n = e.lastElementChild; n && (n === y.ghost || g(n, "display") === "none" || t && !gt(n, t)); ) n = n.previousElementSibling;
  return n || null;
}
function X(e, t) {
  var n = 0;
  if (!e || !e.parentNode) return -1;
  for (; e = e.previousElementSibling; ) e.nodeName.toUpperCase() !== "TEMPLATE" && e !== y.clone && (!t || gt(e, t)) && n++;
  return n;
}
function kn(e) {
  var t = 0, n = 0, r = re();
  if (e) do {
    var o = Oe(e), a = o.a, s = o.d;
    t += e.scrollLeft * a, n += e.scrollTop * s;
  } while (e !== r && (e = e.parentNode));
  return [t, n];
}
function is(e, t) {
  for (var n in e)
    if (e.hasOwnProperty(n)) {
      for (var r in t) if (t.hasOwnProperty(r) && t[r] === e[n][r]) return Number(n);
    }
  return -1;
}
function me(e, t) {
  if (!e || !e.getBoundingClientRect) return re();
  var n = e, r = !1;
  do
    if (n.clientWidth < n.scrollWidth || n.clientHeight < n.scrollHeight) {
      var o = g(n);
      if (n.clientWidth < n.scrollWidth && (o.overflowX == "auto" || o.overflowX == "scroll") || n.clientHeight < n.scrollHeight && (o.overflowY == "auto" || o.overflowY == "scroll")) {
        if (!n.getBoundingClientRect || n === document.body) return re();
        if (r || t) return n;
        r = !0;
      }
    }
  while (n = n.parentNode);
  return re();
}
function ls(e, t) {
  if (e && t)
    for (var n in t) t.hasOwnProperty(n) && (e[n] = t[n]);
  return e;
}
function Lt(e, t) {
  return Math.round(e.top) === Math.round(t.top) && Math.round(e.left) === Math.round(t.left) && Math.round(e.height) === Math.round(t.height) && Math.round(e.width) === Math.round(t.width);
}
var Ue;
function fr(e, t) {
  return function() {
    if (!Ue) {
      var n = arguments, r = this;
      n.length === 1 ? e.call(r, n[0]) : e.apply(r, n), Ue = setTimeout(function() {
        Ue = void 0;
      }, t);
    }
  };
}
function cs() {
  clearTimeout(Ue), Ue = void 0;
}
function pr(e, t, n) {
  e.scrollLeft += t, e.scrollTop += n;
}
function hr(e) {
  var t = window.Polymer, n = window.jQuery || window.Zepto;
  return t && t.dom ? t.dom(e).cloneNode(!0) : n ? n(e).clone(!0)[0] : e.cloneNode(!0);
}
function mr(e, t, n) {
  var r = {};
  return Array.from(e.children).forEach(function(o) {
    var a, s, i, c;
    if (!(!ee(o, t.draggable, e, !1) || o.animated || o === n)) {
      var l = L(o);
      r.left = Math.min((a = r.left) !== null && a !== void 0 ? a : 1 / 0, l.left), r.top = Math.min((s = r.top) !== null && s !== void 0 ? s : 1 / 0, l.top), r.right = Math.max((i = r.right) !== null && i !== void 0 ? i : -1 / 0, l.right), r.bottom = Math.max((c = r.bottom) !== null && c !== void 0 ? c : -1 / 0, l.bottom);
    }
  }), r.width = r.right - r.left, r.height = r.bottom - r.top, r.x = r.left, r.y = r.top, r;
}
var z = "Sortable" + (/* @__PURE__ */ new Date()).getTime();
function us() {
  var e = [], t;
  return {
    captureAnimationState: function() {
      e = [], this.options.animation && [].slice.call(this.el.children).forEach(function(r) {
        if (!(g(r, "display") === "none" || r === y.ghost)) {
          e.push({
            target: r,
            rect: L(r)
          });
          var o = oe({}, e[e.length - 1].rect);
          if (r.thisAnimationDuration) {
            var a = Oe(r, !0);
            a && (o.top -= a.f, o.left -= a.e);
          }
          r.fromRect = o;
        }
      });
    },
    addAnimationState: function(r) {
      e.push(r);
    },
    removeAnimationState: function(r) {
      e.splice(is(e, { target: r }), 1);
    },
    animateAll: function(r) {
      var o = this;
      if (!this.options.animation) {
        clearTimeout(t), typeof r == "function" && r();
        return;
      }
      var a = !1, s = 0;
      e.forEach(function(i) {
        var c = 0, l = i.target, u = l.fromRect, d = L(l), f = l.prevFromRect, p = l.prevToRect, m = i.rect, b = Oe(l, !0);
        b && (d.top -= b.f, d.left -= b.e), l.toRect = d, l.thisAnimationDuration && Lt(f, d) && !Lt(u, d) && (m.top - d.top) / (m.left - d.left) === (u.top - d.top) / (u.left - d.left) && (c = fs(m, f, p, o.options)), Lt(d, u) || (l.prevFromRect = u, l.prevToRect = d, c || (c = o.options.animation), o.animate(l, m, d, c)), c && (a = !0, s = Math.max(s, c), clearTimeout(l.animationResetTimer), l.animationResetTimer = setTimeout(function() {
          l.animationTime = 0, l.prevFromRect = null, l.fromRect = null, l.prevToRect = null, l.thisAnimationDuration = null;
        }, c), l.thisAnimationDuration = c);
      }), clearTimeout(t), a ? t = setTimeout(function() {
        typeof r == "function" && r();
      }, s) : typeof r == "function" && r(), e = [];
    },
    animate: function(r, o, a, s) {
      if (s) {
        g(r, "transition", ""), g(r, "transform", "");
        var i = Oe(this.el), c = i && i.a, l = i && i.d, u = (o.left - a.left) / (c || 1), d = (o.top - a.top) / (l || 1);
        r.animatingX = !!u, r.animatingY = !!d, g(r, "transform", "translate3d(" + u + "px," + d + "px,0)"), this.forRepaintDummy = ds(r), g(r, "transition", "transform " + s + "ms" + (this.options.easing ? " " + this.options.easing : "")), g(r, "transform", "translate3d(0,0,0)"), typeof r.animated == "number" && clearTimeout(r.animated), r.animated = setTimeout(function() {
          g(r, "transition", ""), g(r, "transform", ""), r.animated = !1, r.animatingX = !1, r.animatingY = !1;
        }, s);
      }
    }
  };
}
function ds(e) {
  return e.offsetWidth;
}
function fs(e, t, n, r) {
  return Math.sqrt(Math.pow(t.top - e.top, 2) + Math.pow(t.left - e.left, 2)) / Math.sqrt(Math.pow(t.top - n.top, 2) + Math.pow(t.left - n.left, 2)) * r.animation;
}
var De = [], Ot = { initializeByDefault: !0 }, nt = {
  mount: function(t) {
    for (var n in Ot) Ot.hasOwnProperty(n) && !(n in t) && (t[n] = Ot[n]);
    De.forEach(function(r) {
      if (r.pluginName === t.pluginName) throw "Sortable: Cannot mount plugin ".concat(t.pluginName, " more than once");
    }), De.push(t);
  },
  pluginEvent: function(t, n, r) {
    var o = this;
    this.eventCanceled = !1, r.cancel = function() {
      o.eventCanceled = !0;
    };
    var a = t + "Global";
    De.forEach(function(s) {
      n[s.pluginName] && (n[s.pluginName][a] && n[s.pluginName][a](oe({ sortable: n }, r)), n.options[s.pluginName] && n[s.pluginName][t] && n[s.pluginName][t](oe({ sortable: n }, r)));
    });
  },
  initializePlugins: function(t, n, r, o) {
    De.forEach(function(i) {
      var c = i.pluginName;
      if (!(!t.options[c] && !i.initializeByDefault)) {
        var l = new i(t, n, t.options);
        l.sortable = t, l.options = t.options, t[c] = l, le(r, l.defaults);
      }
    });
    for (var a in t.options)
      if (t.options.hasOwnProperty(a)) {
        var s = this.modifyOption(t, a, t.options[a]);
        typeof s < "u" && (t.options[a] = s);
      }
  },
  getEventProperties: function(t, n) {
    var r = {};
    return De.forEach(function(o) {
      typeof o.eventProperties == "function" && le(r, o.eventProperties.call(n[o.pluginName], t));
    }), r;
  },
  modifyOption: function(t, n, r) {
    var o;
    return De.forEach(function(a) {
      t[a.pluginName] && a.optionListeners && typeof a.optionListeners[n] == "function" && (o = a.optionListeners[n].call(t[a.pluginName], r));
    }), o;
  }
};
function ps(e) {
  var t = e.sortable, n = e.rootEl, r = e.name, o = e.targetEl, a = e.cloneEl, s = e.toEl, i = e.fromEl, c = e.oldIndex, l = e.newIndex, u = e.oldDraggableIndex, d = e.newDraggableIndex, f = e.originalEvent, p = e.putSortable, m = e.extraEventProperties;
  if (t = t || n && n[z], !!t) {
    var b, x = t.options, w = "on" + r.charAt(0).toUpperCase() + r.substr(1);
    window.CustomEvent && !ue && !tt ? b = new CustomEvent(r, {
      bubbles: !0,
      cancelable: !0
    }) : (b = document.createEvent("Event"), b.initEvent(r, !0, !0)), b.to = s || n, b.from = i || n, b.item = o || n, b.clone = a, b.oldIndex = c, b.newIndex = l, b.oldDraggableIndex = u, b.newDraggableIndex = d, b.originalEvent = f, b.pullMode = p ? p.lastPutMode : void 0;
    var C = oe(oe({}, m), nt.getEventProperties(r, t));
    for (var S in C) b[S] = C[S];
    n && n.dispatchEvent(b), x[w] && x[w].call(t, b);
  }
}
var hs = ["evt"], j = function(t, n) {
  var r = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {}, o = r.evt, a = as(r, hs);
  nt.pluginEvent.bind(y)(t, n, oe({
    dragEl: h,
    parentEl: M,
    ghostEl: v,
    rootEl: _,
    nextEl: Ae,
    lastDownEl: dt,
    cloneEl: D,
    cloneHidden: he,
    dragStarted: Be,
    putSortable: $,
    activeSortable: y.active,
    originalEvent: o,
    oldIndex: Re,
    oldDraggableIndex: ze,
    newIndex: V,
    newDraggableIndex: pe,
    hideGhostForTarget: vr,
    unhideGhostForTarget: Sr,
    cloneNowHidden: function() {
      he = !0;
    },
    cloneNowShown: function() {
      he = !1;
    },
    dispatchSortableEvent: function(i) {
      q({
        sortable: n,
        name: i,
        originalEvent: o
      });
    }
  }, a));
};
function q(e) {
  ps(oe({
    putSortable: $,
    cloneEl: D,
    targetEl: h,
    rootEl: _,
    oldIndex: Re,
    oldDraggableIndex: ze,
    newIndex: V,
    newDraggableIndex: pe
  }, e));
}
var h, M, v, _, Ae, dt, D, he, Re, V, ze, pe, at, $, Pe = !1, yt = !1, vt = [], Se, Z, It, $t, Dn, Mn, Be, Me, He, Ve = !1, st = !1, ft, N, Gt = [], Kt = !1, St = [], kt = typeof document < "u", it = un, Pn = tt || ue ? "cssFloat" : "float", ms = kt && !lr && !un && "draggable" in document.createElement("div"), br = (function() {
  if (kt) {
    if (ue) return !1;
    var e = document.createElement("x");
    return e.style.cssText = "pointer-events:auto", e.style.pointerEvents === "auto";
  }
})(), gr = function(t, n) {
  var r = g(t), o = parseInt(r.width) - parseInt(r.paddingLeft) - parseInt(r.paddingRight) - parseInt(r.borderLeftWidth) - parseInt(r.borderRightWidth), a = Ie(t, 0, n), s = Ie(t, 1, n), i = a && g(a), c = s && g(s), l = i && parseInt(i.marginLeft) + parseInt(i.marginRight) + L(a).width, u = c && parseInt(c.marginLeft) + parseInt(c.marginRight) + L(s).width;
  if (r.display === "flex") return r.flexDirection === "column" || r.flexDirection === "column-reverse" ? "vertical" : "horizontal";
  if (r.display === "grid") return r.gridTemplateColumns.split(" ").length <= 1 ? "vertical" : "horizontal";
  if (a && i.float && i.float !== "none") {
    var d = i.float === "left" ? "left" : "right";
    return s && (c.clear === "both" || c.clear === d) ? "vertical" : "horizontal";
  }
  return a && (i.display === "block" || i.display === "flex" || i.display === "table" || i.display === "grid" || l >= o && r[Pn] === "none" || s && r[Pn] === "none" && l + u > o) ? "vertical" : "horizontal";
}, bs = function(t, n, r) {
  var o = r ? t.left : t.top, a = r ? t.right : t.bottom, s = r ? t.width : t.height, i = r ? n.left : n.top, c = r ? n.right : n.bottom, l = r ? n.width : n.height;
  return o === i || a === c || o + s / 2 === i + l / 2;
}, gs = function(t, n) {
  var r;
  return vt.some(function(o) {
    var a = o[z].options.emptyInsertThreshold;
    if (!(!a || dn(o))) {
      var s = L(o), i = t >= s.left - a && t <= s.right + a, c = n >= s.top - a && n <= s.bottom + a;
      if (i && c) return r = o;
    }
  }), r;
}, yr = function(t) {
  function n(a, s) {
    return function(i, c, l, u) {
      var d = i.options.group.name && c.options.group.name && i.options.group.name === c.options.group.name;
      if (a == null && (s || d)) return !0;
      if (a == null || a === !1) return !1;
      if (s && a === "clone") return a;
      if (typeof a == "function") return n(a(i, c, l, u), s)(i, c, l, u);
      var f = (s ? i : c).options.group.name;
      return a === !0 || typeof a == "string" && a === f || a.join && a.indexOf(f) > -1;
    };
  }
  var r = {}, o = t.group;
  (!o || ut(o) != "object") && (o = { name: o }), r.name = o.name, r.checkPull = n(o.pull, !0), r.checkPut = n(o.put), r.revertClone = o.revertClone, t.group = r;
}, vr = function() {
  !br && v && g(v, "display", "none");
}, Sr = function() {
  !br && v && g(v, "display", "");
};
kt && !lr && document.addEventListener("click", function(e) {
  if (yt)
    return e.preventDefault(), e.stopPropagation && e.stopPropagation(), e.stopImmediatePropagation && e.stopImmediatePropagation(), yt = !1, !1;
}, !0);
var we = function(t) {
  if (h) {
    t = t.touches ? t.touches[0] : t;
    var n = gs(t.clientX, t.clientY);
    if (n) {
      var r = {};
      for (var o in t) t.hasOwnProperty(o) && (r[o] = t[o]);
      r.target = r.rootEl = n, r.preventDefault = void 0, r.stopPropagation = void 0, n[z]._onDragOver(r);
    }
  }
}, ys = function(t) {
  h && h.parentNode[z]._isOutsideThisEl(t.target);
};
function y(e, t) {
  if (!(e && e.nodeType && e.nodeType === 1)) throw "Sortable: `el` must be an HTMLElement, not ".concat({}.toString.call(e));
  this.el = e, this.options = t = le({}, t), e[z] = this;
  var n = {
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
      return gr(e, this.options);
    },
    ghostClass: "sortable-ghost",
    chosenClass: "sortable-chosen",
    dragClass: "sortable-drag",
    ignore: "a, img",
    filter: null,
    preventOnFilter: !0,
    animation: 0,
    easing: null,
    setData: function(s, i) {
      s.setData("Text", i.textContent);
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
    supportPointer: y.supportPointer !== !1 && "PointerEvent" in window && (!je || un),
    emptyInsertThreshold: 5
  };
  nt.initializePlugins(this, e, n);
  for (var r in n) !(r in t) && (t[r] = n[r]);
  yr(t);
  for (var o in this) o.charAt(0) === "_" && typeof this[o] == "function" && (this[o] = this[o].bind(this));
  this.nativeDraggable = t.forceFallback ? !1 : ms, this.nativeDraggable && (this.options.touchStartThreshold = 1), t.supportPointer ? A(e, "pointerdown", this._onTapStart) : (A(e, "mousedown", this._onTapStart), A(e, "touchstart", this._onTapStart)), this.nativeDraggable && (A(e, "dragover", this), A(e, "dragenter", this)), vt.push(this.el), t.store && t.store.get && this.sort(t.store.get(this) || []), le(this, us());
}
y.prototype = {
  constructor: y,
  _isOutsideThisEl: function(t) {
    !this.el.contains(t) && t !== this.el && (Me = null);
  },
  _getDirection: function(t, n) {
    return typeof this.options.direction == "function" ? this.options.direction.call(this, t, n, h) : this.options.direction;
  },
  _onTapStart: function(t) {
    if (t.cancelable) {
      var n = this, r = this.el, o = this.options, a = o.preventOnFilter, s = t.type, i = t.touches && t.touches[0] || t.pointerType && t.pointerType === "touch" && t, c = (i || t).target, l = t.target.shadowRoot && (t.path && t.path[0] || t.composedPath && t.composedPath()[0]) || c, u = o.filter;
      if (_s(r), !h && !(/mousedown|pointerdown/.test(s) && t.button !== 0 || o.disabled) && !l.isContentEditable && !(!this.nativeDraggable && je && c && c.tagName.toUpperCase() === "SELECT") && (c = ee(c, o.draggable, r, !1), !(c && c.animated) && dt !== c)) {
        if (Re = X(c), ze = X(c, o.draggable), typeof u == "function") {
          if (u.call(this, t, c, this)) {
            q({
              sortable: n,
              rootEl: l,
              name: "filter",
              targetEl: c,
              toEl: r,
              fromEl: r
            }), j("filter", n, { evt: t }), a && t.preventDefault();
            return;
          }
        } else if (u && (u = u.split(",").some(function(d) {
          if (d = ee(l, d.trim(), r, !1), d)
            return q({
              sortable: n,
              rootEl: d,
              name: "filter",
              targetEl: c,
              fromEl: r,
              toEl: r
            }), j("filter", n, { evt: t }), !0;
        }), u)) {
          a && t.preventDefault();
          return;
        }
        o.handle && !ee(l, o.handle, r, !1) || this._prepareDragStart(t, i, c);
      }
    }
  },
  _prepareDragStart: function(t, n, r) {
    var o = this, a = o.el, s = o.options, i = a.ownerDocument, c;
    if (r && !h && r.parentNode === a) {
      var l = L(r);
      if (_ = a, h = r, M = h.parentNode, Ae = h.nextSibling, dt = r, at = s.group, y.dragged = h, Se = {
        target: h,
        clientX: (n || t).clientX,
        clientY: (n || t).clientY
      }, Dn = Se.clientX - l.left, Mn = Se.clientY - l.top, this._lastX = (n || t).clientX, this._lastY = (n || t).clientY, h.style["will-change"] = "all", c = function() {
        if (j("delayEnded", o, { evt: t }), y.eventCanceled) {
          o._onDrop();
          return;
        }
        o._disableDelayedDragEvents(), !xn && o.nativeDraggable && (h.draggable = !0), o._triggerDragStart(t, n), q({
          sortable: o,
          name: "choose",
          originalEvent: t
        }), H(h, s.chosenClass, !0);
      }, s.ignore.split(",").forEach(function(u) {
        dr(h, u.trim(), Bt);
      }), A(i, "dragover", we), A(i, "mousemove", we), A(i, "touchmove", we), s.supportPointer ? (A(i, "pointerup", o._onDrop), !this.nativeDraggable && A(i, "pointercancel", o._onDrop)) : (A(i, "mouseup", o._onDrop), A(i, "touchend", o._onDrop), A(i, "touchcancel", o._onDrop)), xn && this.nativeDraggable && (this.options.touchStartThreshold = 4, h.draggable = !0), j("delayStart", this, { evt: t }), s.delay && (!s.delayOnTouchOnly || n) && (!this.nativeDraggable || !(tt || ue))) {
        if (y.eventCanceled) {
          this._onDrop();
          return;
        }
        s.supportPointer ? (A(i, "pointerup", o._disableDelayedDrag), A(i, "pointercancel", o._disableDelayedDrag)) : (A(i, "mouseup", o._disableDelayedDrag), A(i, "touchend", o._disableDelayedDrag), A(i, "touchcancel", o._disableDelayedDrag)), A(i, "mousemove", o._delayedDragTouchMoveHandler), A(i, "touchmove", o._delayedDragTouchMoveHandler), s.supportPointer && A(i, "pointermove", o._delayedDragTouchMoveHandler), o._dragStartTimer = setTimeout(c, s.delay);
      } else c();
    }
  },
  _delayedDragTouchMoveHandler: function(t) {
    var n = t.touches ? t.touches[0] : t;
    Math.max(Math.abs(n.clientX - this._lastX), Math.abs(n.clientY - this._lastY)) >= Math.floor(this.options.touchStartThreshold / (this.nativeDraggable && window.devicePixelRatio || 1)) && this._disableDelayedDrag();
  },
  _disableDelayedDrag: function() {
    h && Bt(h), clearTimeout(this._dragStartTimer), this._disableDelayedDragEvents();
  },
  _disableDelayedDragEvents: function() {
    var t = this.el.ownerDocument;
    E(t, "mouseup", this._disableDelayedDrag), E(t, "touchend", this._disableDelayedDrag), E(t, "touchcancel", this._disableDelayedDrag), E(t, "pointerup", this._disableDelayedDrag), E(t, "pointercancel", this._disableDelayedDrag), E(t, "mousemove", this._delayedDragTouchMoveHandler), E(t, "touchmove", this._delayedDragTouchMoveHandler), E(t, "pointermove", this._delayedDragTouchMoveHandler);
  },
  _triggerDragStart: function(t, n) {
    n = n || t.pointerType == "touch" && t, !this.nativeDraggable || n ? this.options.supportPointer ? A(document, "pointermove", this._onTouchMove) : n ? A(document, "touchmove", this._onTouchMove) : A(document, "mousemove", this._onTouchMove) : (A(h, "dragend", this), A(_, "dragstart", this._onDragStart));
    try {
      document.selection ? pt(function() {
        document.selection.empty();
      }) : window.getSelection().removeAllRanges();
    } catch {
    }
  },
  _dragStarted: function(t, n) {
    if (Pe = !1, _ && h) {
      j("dragStarted", this, { evt: n }), this.nativeDraggable && A(document, "dragover", ys);
      var r = this.options;
      !t && H(h, r.dragClass, !1), H(h, r.ghostClass, !0), y.active = this, t && this._appendGhost(), q({
        sortable: this,
        name: "start",
        originalEvent: n
      });
    } else this._nulling();
  },
  _emulateDragOver: function() {
    if (Z) {
      this._lastX = Z.clientX, this._lastY = Z.clientY, vr();
      for (var t = document.elementFromPoint(Z.clientX, Z.clientY), n = t; t && t.shadowRoot && (t = t.shadowRoot.elementFromPoint(Z.clientX, Z.clientY), t !== n); )
        n = t;
      if (h.parentNode[z]._isOutsideThisEl(t), n) do {
        if (n[z]) {
          var r = void 0;
          if (r = n[z]._onDragOver({
            clientX: Z.clientX,
            clientY: Z.clientY,
            target: t,
            rootEl: n
          }), r && !this.options.dragoverBubble) break;
        }
        t = n;
      } while (n = ur(n));
      Sr();
    }
  },
  _onTouchMove: function(t) {
    if (Se) {
      var n = this.options, r = n.fallbackTolerance, o = n.fallbackOffset, a = t.touches ? t.touches[0] : t, s = v && Oe(v, !0), i = v && s && s.a, c = v && s && s.d, l = it && N && kn(N), u = (a.clientX - Se.clientX + o.x) / (i || 1) + (l ? l[0] - Gt[0] : 0) / (i || 1), d = (a.clientY - Se.clientY + o.y) / (c || 1) + (l ? l[1] - Gt[1] : 0) / (c || 1);
      if (!y.active && !Pe) {
        if (r && Math.max(Math.abs(a.clientX - this._lastX), Math.abs(a.clientY - this._lastY)) < r) return;
        this._onDragStart(t, !0);
      }
      if (v) {
        s ? (s.e += u - (It || 0), s.f += d - ($t || 0)) : s = {
          a: 1,
          b: 0,
          c: 0,
          d: 1,
          e: u,
          f: d
        };
        var f = "matrix(".concat(s.a, ",").concat(s.b, ",").concat(s.c, ",").concat(s.d, ",").concat(s.e, ",").concat(s.f, ")");
        g(v, "webkitTransform", f), g(v, "mozTransform", f), g(v, "msTransform", f), g(v, "transform", f), It = u, $t = d, Z = a;
      }
      t.cancelable && t.preventDefault();
    }
  },
  _appendGhost: function() {
    if (!v) {
      var t = this.options.fallbackOnBody ? document.body : _, n = L(h, !0, it, !0, t), r = this.options;
      if (it) {
        for (N = t; g(N, "position") === "static" && g(N, "transform") === "none" && N !== document; ) N = N.parentNode;
        N !== document.body && N !== document.documentElement ? (N === document && (N = re()), n.top += N.scrollTop, n.left += N.scrollLeft) : N = re(), Gt = kn(N);
      }
      v = h.cloneNode(!0), H(v, r.ghostClass, !1), H(v, r.fallbackClass, !0), H(v, r.dragClass, !0), g(v, "transition", ""), g(v, "transform", ""), g(v, "box-sizing", "border-box"), g(v, "margin", 0), g(v, "top", n.top), g(v, "left", n.left), g(v, "width", n.width), g(v, "height", n.height), g(v, "opacity", "0.8"), g(v, "position", it ? "absolute" : "fixed"), g(v, "zIndex", "100000"), g(v, "pointerEvents", "none"), y.ghost = v, t.appendChild(v), g(v, "transform-origin", Dn / parseInt(v.style.width) * 100 + "% " + Mn / parseInt(v.style.height) * 100 + "%");
    }
  },
  _onDragStart: function(t, n) {
    var r = this, o = t.dataTransfer, a = r.options;
    if (j("dragStart", this, { evt: t }), y.eventCanceled) {
      this._onDrop();
      return;
    }
    j("setupClone", this), y.eventCanceled || (D = hr(h), D.removeAttribute("id"), D.draggable = !1, D.style["will-change"] = "", this._hideClone(), H(D, this.options.chosenClass, !1), y.clone = D), r.cloneId = pt(function() {
      j("clone", r), !y.eventCanceled && (r.options.removeCloneOnHide || _.insertBefore(D, h), r._hideClone(), q({
        sortable: r,
        name: "clone"
      }));
    }), !n && H(h, a.dragClass, !0), n ? (yt = !0, r._loopId = setInterval(r._emulateDragOver, 50)) : (E(document, "mouseup", r._onDrop), E(document, "touchend", r._onDrop), E(document, "touchcancel", r._onDrop), o && (o.effectAllowed = "move", a.setData && a.setData.call(r, o, h)), A(document, "drop", r), g(h, "transform", "translateZ(0)")), Pe = !0, r._dragStartId = pt(r._dragStarted.bind(r, n, t)), A(document, "selectstart", r), Be = !0, window.getSelection().removeAllRanges(), je && g(document.body, "user-select", "none");
  },
  _onDragOver: function(t) {
    var n = this.el, r = t.target, o, a, s, i = this.options, c = i.group, l = y.active, u = at === c, d = i.sort, f = $ || l, p, m = this, b = !1;
    if (Kt) return;
    function x(ve, Dt) {
      j(ve, m, oe({
        evt: t,
        isOwner: u,
        axis: p ? "vertical" : "horizontal",
        revert: s,
        dragRect: o,
        targetRect: a,
        canSort: d,
        fromSortable: f,
        target: r,
        completed: C,
        onMove: function(rt, ot) {
          return lt(_, n, h, o, rt, L(rt), t, ot);
        },
        changed: S
      }, Dt));
    }
    function w() {
      x("dragOverAnimationCapture"), m.captureAnimationState(), m !== f && f.captureAnimationState();
    }
    function C(ve) {
      return x("dragOverCompleted", { insertion: ve }), ve && (u ? l._hideClone() : l._showClone(m), m !== f && (H(h, $ ? $.options.ghostClass : l.options.ghostClass, !1), H(h, i.ghostClass, !0)), $ !== m && m !== y.active ? $ = m : m === y.active && $ && ($ = null), f === m && (m._ignoreWhileAnimating = r), m.animateAll(function() {
        x("dragOverAnimationComplete"), m._ignoreWhileAnimating = null;
      }), m !== f && (f.animateAll(), f._ignoreWhileAnimating = null)), (r === h && !h.animated || r === n && !r.animated) && (Me = null), !i.dragoverBubble && !t.rootEl && r !== document && (h.parentNode[z]._isOutsideThisEl(t.target), !ve && we(t)), !i.dragoverBubble && t.stopPropagation && t.stopPropagation(), b = !0;
    }
    function S() {
      V = X(h), pe = X(h, i.draggable), q({
        sortable: m,
        name: "change",
        toEl: n,
        newIndex: V,
        newDraggableIndex: pe,
        originalEvent: t
      });
    }
    if (t.preventDefault !== void 0 && t.cancelable && t.preventDefault(), r = ee(r, i.draggable, n, !0), x("dragOver"), y.eventCanceled) return b;
    if (h.contains(t.target) || r.animated && r.animatingX && r.animatingY || m._ignoreWhileAnimating === r) return C(!1);
    if (yt = !1, l && !i.disabled && (u ? d || (s = M !== _) : $ === this || (this.lastPutMode = at.checkPull(this, l, h, t)) && c.checkPut(this, l, h, t))) {
      if (p = this._getDirection(t, r) === "vertical", o = L(h), x("dragOverValid"), y.eventCanceled) return b;
      if (s)
        return M = _, w(), this._hideClone(), x("revert"), y.eventCanceled || (Ae ? _.insertBefore(h, Ae) : _.appendChild(h)), C(!0);
      var P = dn(n, i.draggable);
      if (!P || Es(t, p, this) && !P.animated) {
        if (P === h) return C(!1);
        if (P && n === t.target && (r = P), r && (a = L(r)), lt(_, n, h, o, r, a, t, !!r) !== !1)
          return w(), P && P.nextSibling ? n.insertBefore(h, P.nextSibling) : n.appendChild(h), M = n, S(), C(!0);
      } else if (P && ws(t, p, this)) {
        var G = Ie(n, 0, i, !0);
        if (G === h) return C(!1);
        if (r = G, a = L(r), lt(_, n, h, o, r, a, t, !1) !== !1)
          return w(), n.insertBefore(h, G), M = n, S(), C(!0);
      } else if (r.parentNode === n) {
        a = L(r);
        var F = 0, I, de = h.parentNode !== n, B = !bs(h.animated && h.toRect || o, r.animated && r.toRect || a, p), fe = p ? "top" : "left", J = _n(r, "top", "top") || _n(h, "top", "top"), be = J ? J.scrollTop : void 0;
        Me !== r && (I = a[fe], Ve = !1, st = !B && i.invertSwap || de), F = As(t, r, a, p, B ? 1 : i.swapThreshold, i.invertedSwapThreshold == null ? i.swapThreshold : i.invertedSwapThreshold, st, Me === r);
        var Y;
        if (F !== 0) {
          var ae = X(h);
          do
            ae -= F, Y = M.children[ae];
          while (Y && (g(Y, "display") === "none" || Y === v));
        }
        if (F === 0 || Y === r) return C(!1);
        Me = r, He = F;
        var ge = r.nextElementSibling, ne = !1;
        ne = F === 1;
        var ye = lt(_, n, h, o, r, a, t, ne);
        if (ye !== !1)
          return (ye === 1 || ye === -1) && (ne = ye === 1), Kt = !0, setTimeout(Ss, 30), w(), ne && !ge ? n.appendChild(h) : r.parentNode.insertBefore(h, ne ? ge : r), J && pr(J, 0, be - J.scrollTop), M = h.parentNode, I !== void 0 && !st && (ft = Math.abs(I - L(r)[fe])), S(), C(!0);
      }
      if (n.contains(h)) return C(!1);
    }
    return !1;
  },
  _ignoreWhileAnimating: null,
  _offMoveEvents: function() {
    E(document, "mousemove", this._onTouchMove), E(document, "touchmove", this._onTouchMove), E(document, "pointermove", this._onTouchMove), E(document, "dragover", we), E(document, "mousemove", we), E(document, "touchmove", we);
  },
  _offUpEvents: function() {
    var t = this.el.ownerDocument;
    E(t, "mouseup", this._onDrop), E(t, "touchend", this._onDrop), E(t, "pointerup", this._onDrop), E(t, "pointercancel", this._onDrop), E(t, "touchcancel", this._onDrop), E(document, "selectstart", this);
  },
  _onDrop: function(t) {
    var n = this.el, r = this.options;
    if (V = X(h), pe = X(h, r.draggable), j("drop", this, { evt: t }), M = h && h.parentNode, V = X(h), pe = X(h, r.draggable), y.eventCanceled) {
      this._nulling();
      return;
    }
    Pe = !1, st = !1, Ve = !1, clearInterval(this._loopId), clearTimeout(this._dragStartTimer), Yt(this.cloneId), Yt(this._dragStartId), this.nativeDraggable && (E(document, "drop", this), E(n, "dragstart", this._onDragStart)), this._offMoveEvents(), this._offUpEvents(), je && g(document.body, "user-select", ""), g(h, "transform", ""), t && (Be && (t.cancelable && t.preventDefault(), !r.dropBubble && t.stopPropagation()), v && v.parentNode && v.parentNode.removeChild(v), (_ === M || $ && $.lastPutMode !== "clone") && D && D.parentNode && D.parentNode.removeChild(D), h && (this.nativeDraggable && E(h, "dragend", this), Bt(h), h.style["will-change"] = "", Be && !Pe && H(h, $ ? $.options.ghostClass : this.options.ghostClass, !1), H(h, this.options.chosenClass, !1), q({
      sortable: this,
      name: "unchoose",
      toEl: M,
      newIndex: null,
      newDraggableIndex: null,
      originalEvent: t
    }), _ !== M ? (V >= 0 && (q({
      rootEl: M,
      name: "add",
      toEl: M,
      fromEl: _,
      originalEvent: t
    }), q({
      sortable: this,
      name: "remove",
      toEl: M,
      originalEvent: t
    }), q({
      rootEl: M,
      name: "sort",
      toEl: M,
      fromEl: _,
      originalEvent: t
    }), q({
      sortable: this,
      name: "sort",
      toEl: M,
      originalEvent: t
    })), $ && $.save()) : V !== Re && V >= 0 && (q({
      sortable: this,
      name: "update",
      toEl: M,
      originalEvent: t
    }), q({
      sortable: this,
      name: "sort",
      toEl: M,
      originalEvent: t
    })), y.active && ((V == null || V === -1) && (V = Re, pe = ze), q({
      sortable: this,
      name: "end",
      toEl: M,
      originalEvent: t
    }), this.save()))), this._nulling();
  },
  _nulling: function() {
    j("nulling", this), _ = h = M = v = Ae = D = dt = he = Se = Z = Be = V = pe = Re = ze = Me = He = $ = at = y.dragged = y.ghost = y.clone = y.active = null, St.forEach(function(t) {
      t.checked = !0;
    }), St.length = It = $t = 0;
  },
  handleEvent: function(t) {
    switch (t.type) {
      case "drop":
      case "dragend":
        this._onDrop(t);
        break;
      case "dragenter":
      case "dragover":
        h && (this._onDragOver(t), vs(t));
        break;
      case "selectstart":
        t.preventDefault();
    }
  },
  toArray: function() {
    for (var t = [], n, r = this.el.children, o = 0, a = r.length, s = this.options; o < a; o++)
      n = r[o], ee(n, s.draggable, this.el, !1) && t.push(n.getAttribute(s.dataIdAttr) || Cs(n));
    return t;
  },
  sort: function(t, n) {
    var r = {}, o = this.el;
    this.toArray().forEach(function(a, s) {
      var i = o.children[s];
      ee(i, this.options.draggable, o, !1) && (r[a] = i);
    }, this), n && this.captureAnimationState(), t.forEach(function(a) {
      r[a] && (o.removeChild(r[a]), o.appendChild(r[a]));
    }), n && this.animateAll();
  },
  save: function() {
    var t = this.options.store;
    t && t.set && t.set(this);
  },
  closest: function(t, n) {
    return ee(t, n || this.options.draggable, this.el, !1);
  },
  option: function(t, n) {
    var r = this.options;
    if (n === void 0) return r[t];
    var o = nt.modifyOption(this, t, n);
    typeof o < "u" ? r[t] = o : r[t] = n, t === "group" && yr(r);
  },
  destroy: function() {
    j("destroy", this);
    var t = this.el;
    t[z] = null, E(t, "mousedown", this._onTapStart), E(t, "touchstart", this._onTapStart), E(t, "pointerdown", this._onTapStart), this.nativeDraggable && (E(t, "dragover", this), E(t, "dragenter", this)), Array.prototype.forEach.call(t.querySelectorAll("[draggable]"), function(n) {
      n.removeAttribute("draggable");
    }), this._onDrop(), this._disableDelayedDragEvents(), vt.splice(vt.indexOf(this.el), 1), this.el = t = null;
  },
  _hideClone: function() {
    if (!he) {
      if (j("hideClone", this), y.eventCanceled) return;
      g(D, "display", "none"), this.options.removeCloneOnHide && D.parentNode && D.parentNode.removeChild(D), he = !0;
    }
  },
  _showClone: function(t) {
    if (t.lastPutMode !== "clone") {
      this._hideClone();
      return;
    }
    if (he) {
      if (j("showClone", this), y.eventCanceled) return;
      h.parentNode == _ && !this.options.group.revertClone ? _.insertBefore(D, h) : Ae ? _.insertBefore(D, Ae) : _.appendChild(D), this.options.group.revertClone && this.animate(h, D), g(D, "display", ""), he = !1;
    }
  }
};
function vs(e) {
  e.dataTransfer && (e.dataTransfer.dropEffect = "move"), e.cancelable && e.preventDefault();
}
function lt(e, t, n, r, o, a, s, i) {
  var c, l = e[z], u = l.options.onMove, d;
  return window.CustomEvent && !ue && !tt ? c = new CustomEvent("move", {
    bubbles: !0,
    cancelable: !0
  }) : (c = document.createEvent("Event"), c.initEvent("move", !0, !0)), c.to = t, c.from = e, c.dragged = n, c.draggedRect = r, c.related = o || t, c.relatedRect = a || L(t), c.willInsertAfter = i, c.originalEvent = s, e.dispatchEvent(c), u && (d = u.call(l, c, s)), d;
}
function Bt(e) {
  e.draggable = !1;
}
function Ss() {
  Kt = !1;
}
function ws(e, t, n) {
  var r = L(Ie(n.el, 0, n.options, !0)), o = mr(n.el, n.options, v), a = 10;
  return t ? e.clientX < o.left - a || e.clientY < r.top && e.clientX < r.right : e.clientY < o.top - a || e.clientY < r.bottom && e.clientX < r.left;
}
function Es(e, t, n) {
  var r = L(dn(n.el, n.options.draggable)), o = mr(n.el, n.options, v), a = 10;
  return t ? e.clientX > o.right + a || e.clientY > r.bottom && e.clientX > r.left : e.clientY > o.bottom + a || e.clientX > r.right && e.clientY > r.top;
}
function As(e, t, n, r, o, a, s, i) {
  var c = r ? e.clientY : e.clientX, l = r ? n.height : n.width, u = r ? n.top : n.left, d = r ? n.bottom : n.right, f = !1;
  if (!s) {
    if (i && ft < l * o) {
      if (!Ve && (He === 1 ? c > u + l * a / 2 : c < d - l * a / 2) && (Ve = !0), Ve)
        f = !0;
      else if (He === 1 ? c < u + ft : c > d - ft) return -He;
    } else if (c > u + l * (1 - o) / 2 && c < d - l * (1 - o) / 2) return xs(t);
  }
  return f = f || s, f && (c < u + l * a / 2 || c > d - l * a / 2) ? c > u + l / 2 ? 1 : -1 : 0;
}
function xs(e) {
  return X(h) < X(e) ? 1 : -1;
}
function Cs(e) {
  for (var t = e.tagName + e.className + e.src + e.href + e.textContent, n = t.length, r = 0; n--; ) r += t.charCodeAt(n);
  return r.toString(36);
}
function _s(e) {
  St.length = 0;
  for (var t = e.getElementsByTagName("input"), n = t.length; n--; ) {
    var r = t[n];
    r.checked && St.push(r);
  }
}
function pt(e) {
  return setTimeout(e, 0);
}
function Yt(e) {
  return clearTimeout(e);
}
kt && A(document, "touchmove", function(e) {
  (y.active || Pe) && e.cancelable && e.preventDefault();
});
y.utils = {
  on: A,
  off: E,
  css: g,
  find: dr,
  is: function(t, n) {
    return !!ee(t, n, t, !1);
  },
  extend: ls,
  throttle: fr,
  closest: ee,
  toggleClass: H,
  clone: hr,
  index: X,
  nextTick: pt,
  cancelNextTick: Yt,
  detectDirection: gr,
  getChild: Ie,
  expando: z
};
y.get = function(e) {
  return e[z];
};
y.mount = function() {
  for (var e = arguments.length, t = new Array(e), n = 0; n < e; n++) t[n] = arguments[n];
  t[0].constructor === Array && (t = t[0]), t.forEach(function(r) {
    if (!r.prototype || !r.prototype.constructor) throw "Sortable: Mounted plugin must be a constructor function, not ".concat({}.toString.call(r));
    r.utils && (y.utils = oe(oe({}, y.utils), r.utils)), nt.mount(r);
  });
};
y.create = function(e, t) {
  return new y(e, t);
};
y.version = ss;
var R = [], Ne, Wt, Xt = !1, Nt, Ft, wt, Fe;
function ks() {
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
    dragStarted: function(n) {
      var r = n.originalEvent;
      this.sortable.nativeDraggable ? A(document, "dragover", this._handleAutoScroll) : this.options.supportPointer ? A(document, "pointermove", this._handleFallbackAutoScroll) : r.touches ? A(document, "touchmove", this._handleFallbackAutoScroll) : A(document, "mousemove", this._handleFallbackAutoScroll);
    },
    dragOverCompleted: function(n) {
      var r = n.originalEvent;
      !this.options.dragOverBubble && !r.rootEl && this._handleAutoScroll(r);
    },
    drop: function() {
      this.sortable.nativeDraggable ? E(document, "dragover", this._handleAutoScroll) : (E(document, "pointermove", this._handleFallbackAutoScroll), E(document, "touchmove", this._handleFallbackAutoScroll), E(document, "mousemove", this._handleFallbackAutoScroll)), Tn(), ht(), cs();
    },
    nulling: function() {
      wt = Wt = Ne = Xt = Fe = Nt = Ft = null, R.length = 0;
    },
    _handleFallbackAutoScroll: function(n) {
      this._handleAutoScroll(n, !0);
    },
    _handleAutoScroll: function(n, r) {
      var o = this, a = (n.touches ? n.touches[0] : n).clientX, s = (n.touches ? n.touches[0] : n).clientY, i = document.elementFromPoint(a, s);
      if (wt = n, r || this.options.forceAutoScrollFallback || tt || ue || je) {
        qt(n, this.options, i, r);
        var c = me(i, !0);
        Xt && (!Fe || a !== Nt || s !== Ft) && (Fe && Tn(), Fe = setInterval(function() {
          var l = me(document.elementFromPoint(a, s), !0);
          l !== c && (c = l, ht()), qt(n, o.options, l, r);
        }, 10), Nt = a, Ft = s);
      } else {
        if (!this.options.bubbleScroll || me(i, !0) === re()) {
          ht();
          return;
        }
        qt(n, this.options, me(i, !1), !1);
      }
    }
  }, le(e, {
    pluginName: "scroll",
    initializeByDefault: !0
  });
}
function ht() {
  R.forEach(function(e) {
    clearInterval(e.pid);
  }), R = [];
}
function Tn() {
  clearInterval(Fe);
}
var qt = fr(function(e, t, n, r) {
  if (t.scroll) {
    var o = (e.touches ? e.touches[0] : e).clientX, a = (e.touches ? e.touches[0] : e).clientY, s = t.scrollSensitivity, i = t.scrollSpeed, c = re(), l = !1, u;
    Wt !== n && (Wt = n, ht(), Ne = t.scroll, u = t.scrollFn, Ne === !0 && (Ne = me(n, !0)));
    var d = 0, f = Ne;
    do {
      var p = f, m = L(p), b = m.top, x = m.bottom, w = m.left, C = m.right, S = m.width, P = m.height, G = void 0, F = void 0, I = p.scrollWidth, de = p.scrollHeight, B = g(p), fe = p.scrollLeft, J = p.scrollTop;
      p === c ? (G = S < I && (B.overflowX === "auto" || B.overflowX === "scroll" || B.overflowX === "visible"), F = P < de && (B.overflowY === "auto" || B.overflowY === "scroll" || B.overflowY === "visible")) : (G = S < I && (B.overflowX === "auto" || B.overflowX === "scroll"), F = P < de && (B.overflowY === "auto" || B.overflowY === "scroll"));
      var be = G && (Math.abs(C - o) <= s && fe + S < I) - (Math.abs(w - o) <= s && !!fe), Y = F && (Math.abs(x - a) <= s && J + P < de) - (Math.abs(b - a) <= s && !!J);
      if (!R[d])
        for (var ae = 0; ae <= d; ae++) R[ae] || (R[ae] = {});
      (R[d].vx != be || R[d].vy != Y || R[d].el !== p) && (R[d].el = p, R[d].vx = be, R[d].vy = Y, clearInterval(R[d].pid), (be != 0 || Y != 0) && (l = !0, R[d].pid = setInterval(function() {
        r && this.layer === 0 && y.active._onTouchMove(wt);
        var ge = R[this.layer].vy ? R[this.layer].vy * i : 0, ne = R[this.layer].vx ? R[this.layer].vx * i : 0;
        typeof u == "function" && u.call(y.dragged.parentNode[z], ne, ge, e, wt, R[this.layer].el) !== "continue" || pr(R[this.layer].el, ne, ge);
      }.bind({ layer: d }), 24))), d++;
    } while (t.bubbleScroll && f !== c && (f = me(f, !1)));
    Xt = l;
  }
}, 30), wr = function(t) {
  var n = t.originalEvent, r = t.putSortable, o = t.dragEl, a = t.activeSortable, s = t.dispatchSortableEvent, i = t.hideGhostForTarget, c = t.unhideGhostForTarget;
  if (n) {
    var l = r || a;
    i();
    var u = n.changedTouches && n.changedTouches.length ? n.changedTouches[0] : n, d = document.elementFromPoint(u.clientX, u.clientY);
    c(), l && !l.el.contains(d) && (s("spill"), this.onSpill({
      dragEl: o,
      putSortable: r
    }));
  }
};
function fn() {
}
fn.prototype = {
  startIndex: null,
  dragStart: function(t) {
    var n = t.oldDraggableIndex;
    this.startIndex = n;
  },
  onSpill: function(t) {
    var n = t.dragEl, r = t.putSortable;
    this.sortable.captureAnimationState(), r && r.captureAnimationState();
    var o = Ie(this.sortable.el, this.startIndex, this.options);
    o ? this.sortable.el.insertBefore(n, o) : this.sortable.el.appendChild(n), this.sortable.animateAll(), r && r.animateAll();
  },
  drop: wr
};
le(fn, { pluginName: "revertOnSpill" });
function pn() {
}
pn.prototype = {
  onSpill: function(t) {
    var n = t.dragEl, r = t.putSortable || this.sortable;
    r.captureAnimationState(), n.parentNode && n.parentNode.removeChild(n), r.animateAll();
  },
  drop: wr
};
le(pn, { pluginName: "removeOnSpill" });
y.mount(new ks());
y.mount(pn, fn);
var Ds = class {
  constructor(e) {
    this.sortable = null, this.searchInput = null, this.columnListEl = null, this.countBadgeEl = null, this.container = e.container, this.grid = e.grid, this.onReorder = e.onReorder, this.onToggle = e.onToggle, this.onReset = e.onReset, this.initialize();
  }
  initialize() {
    this.render(), this.setupDragAndDrop(), this.bindSwitchToggles(), this.setupScrollShadows();
  }
  render() {
    const e = this.grid.config.columns, t = this.grid.state.hiddenColumns;
    this.container.innerHTML = "";
    const n = this.createHeader(e.length, e.length - t.size);
    this.container.appendChild(n);
    const r = document.createElement("div");
    r.className = "column-list", r.setAttribute("role", "list"), r.setAttribute("aria-label", "Column visibility and order"), this.columnListEl = r, e.forEach((a) => {
      const s = this.createColumnItem(a.field, a.label || a.field, !t.has(a.field));
      r.appendChild(s);
    }), this.container.appendChild(r);
    const o = this.createFooter();
    this.container.appendChild(o);
  }
  createHeader(e, t) {
    const n = document.createElement("div");
    n.className = "column-manager-header";
    const r = document.createElement("div");
    r.className = "column-search-container";
    const o = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    o.setAttribute("class", "column-search-icon"), o.setAttribute("viewBox", "0 0 24 24"), o.setAttribute("fill", "none"), o.setAttribute("stroke", "currentColor"), o.setAttribute("stroke-width", "2");
    const a = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    a.setAttribute("cx", "11"), a.setAttribute("cy", "11"), a.setAttribute("r", "8");
    const s = document.createElementNS("http://www.w3.org/2000/svg", "path");
    s.setAttribute("d", "m21 21-4.3-4.3"), o.appendChild(a), o.appendChild(s);
    const i = document.createElement("input");
    i.type = "text", i.className = "column-search-input", i.placeholder = "Filter columns...", i.setAttribute("aria-label", "Filter columns"), this.searchInput = i, i.addEventListener("input", () => {
      this.filterColumns(i.value);
    }), r.appendChild(o), r.appendChild(i);
    const c = document.createElement("span");
    return c.className = "column-count-badge", c.textContent = `${t} of ${e}`, c.setAttribute("aria-live", "polite"), this.countBadgeEl = c, n.appendChild(r), n.appendChild(c), n;
  }
  filterColumns(e) {
    const t = e.toLowerCase().trim();
    this.container.querySelectorAll(".column-item").forEach((n) => {
      const r = n.querySelector(".column-label")?.textContent?.toLowerCase() || "", o = t === "" || r.includes(t);
      n.style.display = o ? "" : "none";
    }), this.updateScrollShadows();
  }
  updateCountBadge() {
    if (!this.countBadgeEl) return;
    const e = this.grid.config.columns, t = this.grid.state.hiddenColumns, n = e.length - t.size;
    this.countBadgeEl.textContent = `${n} of ${e.length}`;
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
    const e = this.columnListEl, t = e.scrollTop, n = e.scrollHeight, r = e.clientHeight, o = n > r, a = o && t > 0, s = o && t + r < n - 1;
    e.classList.toggle("column-list--shadow-top", a), e.classList.toggle("column-list--shadow-bottom", s);
  }
  createFooter() {
    const e = document.createElement("div");
    e.className = "column-manager-footer";
    const t = document.createElement("button");
    t.type = "button", t.className = "column-reset-btn", t.setAttribute("aria-label", "Reset columns to default");
    const n = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    n.setAttribute("class", "column-reset-icon"), n.setAttribute("viewBox", "0 0 24 24"), n.setAttribute("fill", "none"), n.setAttribute("stroke", "currentColor"), n.setAttribute("stroke-width", "2"), n.setAttribute("stroke-linecap", "round"), n.setAttribute("stroke-linejoin", "round");
    const r = document.createElementNS("http://www.w3.org/2000/svg", "path");
    r.setAttribute("d", "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8");
    const o = document.createElementNS("http://www.w3.org/2000/svg", "path");
    o.setAttribute("d", "M3 3v5h5"), n.appendChild(r), n.appendChild(o);
    const a = document.createElement("span");
    return a.textContent = "Reset to Default", t.appendChild(n), t.appendChild(a), t.addEventListener("click", () => {
      this.handleReset();
    }), e.appendChild(t), e;
  }
  handleReset() {
    this.grid.resetColumnsToDefault(), this.onReset?.(), this.searchInput && (this.searchInput.value = "", this.filterColumns("")), this.updateCountBadge();
  }
  createColumnItem(e, t, n) {
    const r = `column-item-${e}`, o = `column-switch-${e}`, a = document.createElement("div");
    a.className = "column-item", a.id = r, a.dataset.column = e, a.setAttribute("role", "listitem");
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
    ].forEach(([p, m]) => {
      const b = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      b.setAttribute("cx", String(p)), b.setAttribute("cy", String(m)), b.setAttribute("r", "1.5"), i.appendChild(b);
    });
    const c = document.createElement("span");
    c.className = "column-label", c.id = `${r}-label`, c.textContent = t, s.appendChild(i), s.appendChild(c);
    const l = document.createElement("label");
    l.className = "column-switch", l.htmlFor = o;
    const u = document.createElement("input");
    u.type = "checkbox", u.id = o, u.dataset.column = e, u.checked = n, u.setAttribute("role", "switch"), u.setAttribute("aria-checked", String(n)), u.setAttribute("aria-labelledby", `${r}-label`), u.setAttribute("aria-describedby", `${r}-desc`);
    const d = document.createElement("span");
    d.id = `${r}-desc`, d.className = "sr-only", d.textContent = `Press Space or Enter to toggle ${t} column visibility. Currently ${n ? "visible" : "hidden"}.`;
    const f = document.createElement("span");
    return f.className = "column-switch-slider", f.setAttribute("aria-hidden", "true"), l.appendChild(u), l.appendChild(f), a.appendChild(s), a.appendChild(l), a.appendChild(d), a;
  }
  setupDragAndDrop() {
    const e = this.container.querySelector(".column-list") || this.container;
    this.sortable = y.create(e, {
      animation: 150,
      handle: ".drag-handle",
      ghostClass: "column-item-ghost",
      dragClass: "column-item-drag",
      chosenClass: "column-item-chosen",
      touchStartThreshold: 3,
      delay: 100,
      delayOnTouchOnly: !0,
      onEnd: () => {
        const t = e.querySelectorAll(".column-item"), n = Array.from(t).map((r) => r.dataset.column);
        this.onReorder && this.onReorder(n), this.grid.reorderColumns(n), this.grid.config.behaviors?.columnVisibility?.reorderColumns?.(n, this.grid);
      }
    });
  }
  bindSwitchToggles() {
    this.container.querySelectorAll('input[type="checkbox"]').forEach((e) => {
      e.addEventListener("change", () => {
        const t = e.dataset.column;
        if (!t) return;
        const n = e.checked;
        e.setAttribute("aria-checked", String(n));
        const r = `column-item-${t}-desc`, o = this.container.querySelector(`#${r}`);
        o && (o.textContent = `Press Space or Enter to toggle ${this.container.querySelector(`#column-item-${t}-label`)?.textContent || t} column visibility. Currently ${n ? "visible" : "hidden"}.`), this.onToggle && this.onToggle(t, n), this.grid.config.behaviors?.columnVisibility && this.grid.config.behaviors.columnVisibility.toggleColumn(t, this.grid), this.updateCountBadge();
      });
    });
  }
  updateSwitchState(e, t) {
    const n = this.container.querySelector(`input[type="checkbox"][data-column="${e}"]`);
    n && (n.checked = t, n.setAttribute("aria-checked", String(t)));
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
function Ms(e, t, n, r, o) {
  const a = (s) => {
    const i = s.target;
    if (!i) return;
    const c = i.closest(n);
    !c || !(c instanceof HTMLElement) || r(s, c);
  };
  return e.addEventListener(t, a, o), () => e.removeEventListener(t, a, o);
}
var O = ce("DataGrid");
function Ps(e) {
  const t = e.tableEl;
  if (!t || !t.classList || typeof t.closest != "function") return;
  t.classList.add("admin-datagrid__table"), (t.closest("[data-datagrid-surface]") || t).classList.add("admin-datagrid");
  const n = t.querySelector("thead");
  n?.classList.add("admin-datagrid__header"), n?.querySelectorAll("th").forEach((a) => {
    a.classList.add("admin-datagrid__header-cell");
  }), t.querySelector("tbody")?.classList.add("admin-datagrid__body"), t.querySelectorAll(e.selectors.filterRow).forEach((a) => {
    a.classList.add("admin-datagrid__filter-control");
    const s = a.closest("tr");
    s?.classList.add("admin-datagrid__filter-row"), s?.querySelectorAll("th").forEach((i) => {
      i.classList.add("admin-datagrid__header-cell");
    });
  }), document.querySelector(e.selectors.searchInput)?.closest("[data-datagrid-toolbar]")?.classList.add("admin-surface-card", "admin-datagrid__toolbar"), document.querySelector("[data-datagrid-filter-panel]")?.classList.add("admin-surface-card", "admin-datagrid__filter-panel");
  const r = document.querySelector(e.selectors.paginationContainer), o = r?.closest("[data-datagrid-pagination]") || r;
  o?.classList.add("admin-surface-card", "admin-datagrid__pagination"), o?.classList.toggle("admin-datagrid__pagination--presented", e.config.pagination?.mode === "semantic"), r?.classList.add("admin-datagrid__pagination-controls");
  for (const a of [
    e.selectors.tableInfoStart,
    e.selectors.tableInfoEnd,
    e.selectors.tableInfoTotal,
    e.selectors.tableInfoSummary
  ]) {
    const s = document.querySelector(a);
    s?.classList.add("admin-datagrid__pagination-text"), s?.parentElement?.classList.add("admin-datagrid__pagination-text");
  }
  document.querySelector(e.selectors.perPageSelect)?.parentElement?.classList.add("admin-datagrid__pagination-text");
}
function Ts(e) {
  const t = document.querySelector(e.selectors.searchInput);
  if (!t) {
    O.warn(`[DataGrid] Search input not found: ${e.selectors.searchInput}`);
    return;
  }
  O.debug(`[DataGrid] Search input bound to: ${e.selectors.searchInput}`);
  const n = document.getElementById("clear-search-btn"), r = () => {
    n && (t.value.trim() ? n.classList.remove("hidden") : n.classList.add("hidden"));
  };
  t.addEventListener("input", () => {
    r(), e.searchTimeout && clearTimeout(e.searchTimeout), e.searchTimeout = window.setTimeout(async () => {
      O.debug(`[DataGrid] Search triggered: "${t.value}"`), e.state.search = t.value, e.pushStateToURL(), e.config.behaviors?.search ? await e.config.behaviors.search.onSearch(t.value, e) : (e.resetPagination(), await e.refresh());
    }, e.config.searchDelay);
  }), n && n.addEventListener("click", async () => {
    t.value = "", t.focus(), r(), e.state.search = "", e.pushStateToURL(), e.config.behaviors?.search ? await e.config.behaviors.search.onSearch("", e) : (e.resetPagination(), await e.refresh());
  }), r();
}
function Rs(e) {
  const t = document.querySelector(e.selectors.perPageSelect);
  t && t.addEventListener("change", async () => {
    e.state.perPage = parseInt(t.value, 10), e.resetPagination(), e.pushStateToURL(), await e.refresh();
  });
}
function Ls(e) {
  document.querySelectorAll(e.selectors.filterRow).forEach((t) => {
    const n = async () => {
      const r = t.dataset.filterColumn, o = t instanceof HTMLInputElement ? t.type.toLowerCase() : "", a = t instanceof HTMLSelectElement ? "eq" : o === "" || o === "text" || o === "search" || o === "email" || o === "tel" || o === "url" ? "ilike" : "eq", s = t.dataset.filterOperator || a, i = t.value;
      if (!r) return;
      const c = e.state.filters.findIndex((l) => l.column === r);
      if (i) {
        const l = {
          column: r,
          operator: s,
          value: i
        };
        c >= 0 ? e.state.filters[c] = l : e.state.filters.push(l);
      } else c >= 0 && e.state.filters.splice(c, 1);
      e.pushStateToURL(), e.config.behaviors?.filter ? await e.config.behaviors.filter.onFilterChange(r, i, e) : (e.resetPagination(), await e.refresh());
    };
    t.addEventListener("input", n), t.addEventListener("change", n);
  });
}
function Os(e) {
  const t = document.querySelector(e.selectors.columnToggleBtn), n = document.querySelector(e.selectors.columnToggleMenu);
  !t || !n || (e.columnManager = new Ds({
    container: n,
    grid: e,
    onToggle: (r, o) => {
      O.debug(`[DataGrid] Column ${r} visibility toggled to ${o}`);
    },
    onReorder: (r) => {
      O.debug("[DataGrid] Columns reordered:", r);
    }
  }));
}
function Is(e) {
  if (!e.isCapabilityEnabled("export")) return;
  const t = document.querySelector(e.selectors.exportMenu);
  if (!t) return;
  const n = t.querySelectorAll("[data-export-format]");
  n.forEach((r) => {
    r.addEventListener("click", async () => {
      const o = r.dataset.exportFormat;
      if (!o || !e.config.behaviors?.export) return;
      const a = e.config.behaviors.export.getConcurrency?.() || "single", s = [];
      a === "single" ? n.forEach((u) => s.push(u)) : a === "per-format" && s.push(r);
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
      const l = a === "none";
      l && (r.setAttribute("data-export-loading", "true"), i(r));
      try {
        await e.config.behaviors.export.export(o, e);
      } catch (u) {
        O.error("[DataGrid] Export failed:", u);
      } finally {
        s.forEach((u) => {
          u.removeAttribute("data-export-loading"), u.disabled = !1, c(u);
        }), l && (r.removeAttribute("data-export-loading"), c(r));
      }
    });
  });
}
function $s(e) {
  e.tableEl && (e.tableEl.querySelectorAll("[data-sort-column]").forEach((t) => {
    t.addEventListener("click", async (n) => {
      n.preventDefault(), n.stopPropagation();
      const r = t.dataset.sortColumn;
      if (!r) return;
      O.debug(`[DataGrid] Sort button clicked for field: ${r}`);
      const o = e.state.sort.find((s) => s.field === r);
      let a = null;
      o ? o.direction === "asc" ? (a = "desc", o.direction = a) : (e.state.sort = e.state.sort.filter((s) => s.field !== r), a = null, O.debug(`[DataGrid] Sort cleared for field: ${r}`)) : (a = "asc", e.state.sort = [{
        field: r,
        direction: a
      }]), O.debug("[DataGrid] New sort state:", e.state.sort), e.pushStateToURL(), a !== null && e.config.behaviors?.sort ? (O.debug("[DataGrid] Calling custom sort behavior"), await e.config.behaviors.sort.onSort(r, a, e)) : (O.debug("[DataGrid] Calling refresh() for sort"), await e.refresh()), O.debug("[DataGrid] Updating sort indicators"), e.updateSortIndicators();
    });
  }), e.tableEl.querySelectorAll("[data-sort]").forEach((t) => {
    t.addEventListener("click", async () => {
      const n = t.dataset.sort;
      if (!n) return;
      const r = e.state.sort.find((a) => a.field === n);
      let o = null;
      r ? r.direction === "asc" ? (o = "desc", r.direction = o) : (e.state.sort = e.state.sort.filter((a) => a.field !== n), o = null) : (o = "asc", e.state.sort = [{
        field: n,
        direction: o
      }]), e.pushStateToURL(), o !== null && e.config.behaviors?.sort ? await e.config.behaviors.sort.onSort(n, o, e) : await e.refresh(), e.updateSortIndicators();
    });
  }));
}
function Gs(e) {
  e.tableEl && (e.tableEl.querySelectorAll("[data-sort-column]").forEach((t) => {
    const n = t.dataset.sortColumn;
    if (!n) return;
    const r = e.state.sort.find((a) => a.field === n), o = t.querySelector("svg");
    o && (r ? (t.classList.remove("opacity-0"), t.classList.add("opacity-100"), r.direction === "asc" ? (o.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />', o.classList.add("text-blue-600"), o.classList.remove("text-gray-400")) : (o.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />', o.classList.add("text-blue-600"), o.classList.remove("text-gray-400"))) : (o.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />', o.classList.remove("text-blue-600"), o.classList.add("text-gray-400")));
  }), e.tableEl.querySelectorAll("[data-sort]").forEach((t) => {
    const n = t.dataset.sort, r = e.state.sort.find((a) => a.field === n), o = t.querySelector(".sort-indicator");
    o && (o.textContent = r ? r.direction === "asc" ? "↑" : "↓" : "");
  }));
}
function Bs(e) {
  if (!e.isCapabilityEnabled("selection")) {
    e.selectionAbortController?.abort(), e.selectionAbortController = null, e.state.selectedRows.clear();
    return;
  }
  if (!e.tableEl) return;
  e.selectionAbortController && e.selectionAbortController.abort(), e.selectionAbortController = new AbortController();
  const { signal: t } = e.selectionAbortController, n = e.tableEl.querySelector(e.selectors.selectAllCheckbox);
  n && n.addEventListener("change", () => {
    e.tableEl.querySelectorAll(e.selectors.rowCheckboxes).forEach((r) => {
      r.checked = n.checked, Qt(r);
      const o = r.dataset.id;
      o && (n.checked ? e.state.selectedRows.add(o) : e.state.selectedRows.delete(o));
    }), e.updateBulkActionsBar();
  }, { signal: t }), e.tableEl.addEventListener("change", (r) => {
    const o = r.target;
    if (!o || o === n || typeof o.matches != "function" || !o.matches(e.selectors.rowCheckboxes)) return;
    const a = o.dataset.id;
    a && (o.checked ? e.state.selectedRows.add(a) : e.state.selectedRows.delete(a)), Qt(o), e.updateBulkActionsBar();
  }, { signal: t }), e.updateSelectionBindings();
}
function Ns(e) {
  e.isCapabilityEnabled("selection") && (e.tableEl?.querySelectorAll(e.selectors.rowCheckboxes) || []).forEach((t) => {
    const n = t.dataset.id;
    n && (t.checked = e.state.selectedRows.has(n)), Qt(t);
  });
}
function Qt(e) {
  const t = e.closest("tr");
  t && (t.dataset.selected = String(e.checked), t.setAttribute("aria-selected", String(e.checked)));
}
function Rn(e) {
  return Array.from(new Set(e.filter(Boolean)));
}
function Jt(e, t) {
  for (const n of t) {
    const r = e.querySelector(n);
    if (r) return r;
  }
  return null;
}
function Fs(e) {
  const t = e?.selectors?.bulkActionsBar;
  if (!t) return null;
  try {
    return document.querySelector(t);
  } catch {
    return null;
  }
}
function $e(e) {
  const t = Fs(e);
  return t && e?.selectors?.bulkActionsBar !== "#bulk-actions-bar" ? t : Jt(document, [
    "[data-bulk-action-overlay]",
    "#bulk-actions-overlay",
    '[data-bulk-action-bar="true"]'
  ]) || t;
}
function hn(e) {
  const t = $e(e);
  return Array.from(t ? t.querySelectorAll("[data-bulk-action]") : document.querySelectorAll("[data-bulk-action]"));
}
function qs(e) {
  const t = $e(e), n = [
    "[data-bulk-selection-count]",
    "#selected-count",
    e?.selectors?.selectedCount
  ].filter(Boolean);
  return (t ? Jt(t, n) : null) || Jt(document, n);
}
function js(e) {
  const t = $e(e), n = [
    "[data-bulk-clear]",
    "#bulk-clear-selection",
    "#clear-selection-btn"
  ], r = n.flatMap((o) => Array.from((t || document).querySelectorAll(o)));
  return r.length ? Rn(r) : Rn(n.flatMap((o) => Array.from(document.querySelectorAll(o))));
}
function Er(e) {
  js(e).forEach((t) => {
    t.dataset.bulkClearBound !== "true" && (t.dataset.bulkClearBound = "true", t.addEventListener("click", () => {
      e.clearSelection();
    }));
  });
}
function Us(e, t) {
  if (e.hasAttribute("data-selection-count") && (e.dataset.selectionCount = String(t)), t > 0) {
    e.classList.remove("hidden", "pointer-events-none", "translate-y-full", "-translate-y-full"), e.classList.add("translate-y-0"), e.removeAttribute("aria-hidden");
    return;
  }
  if (e.classList.remove("translate-y-0"), e.hasAttribute("data-bulk-action-overlay")) {
    const n = e.dataset.bulkOverlayPosition || (e.classList.contains("top-0") ? "top" : "bottom");
    e.classList.add("pointer-events-none", n === "top" ? "-translate-y-full" : "translate-y-full"), e.setAttribute("aria-hidden", "true");
    return;
  }
  e.classList.add("hidden");
}
function zs(e) {
  if (!e) return null;
  let t = e.querySelector("[data-bulk-action-state-reasons]");
  return t || (t = document.createElement("div"), t.dataset.bulkActionStateReasons = "true", t.className = "hidden mt-3 text-sm text-gray-700", e.appendChild(t), t);
}
function Ar(e, t) {
  const n = zs($e(t));
  if (n) {
    if (!e.length) {
      n.classList.add("hidden"), n.innerHTML = "";
      return;
    }
    n.classList.remove("hidden"), n.innerHTML = e.map((r) => `
    <div data-bulk-action-reason-item="${r.actionId}" class="mt-1">
      <span class="font-medium">${r.label}:</span> ${r.reason}
    </div>
  `).join("");
  }
}
function Hs(e, t, n) {
  const r = t?.enabled === !1, o = typeof t?.reason == "string" ? t.reason.trim() : "";
  return e.dataset.disabled = r ? "true" : "false", e.setAttribute("aria-disabled", r ? "true" : "false"), e.dataset.bulkState = r ? "disabled" : "enabled", e.classList.toggle("opacity-50", r), e.classList.toggle("cursor-not-allowed", r), r && o ? (e.setAttribute("title", o), {
    actionId: e.dataset.bulkAction || "",
    label: n,
    reason: o
  }) : (e.removeAttribute("title"), null);
}
function Vs(e) {
  const t = hn(e), n = "Checking selected records...", r = [];
  t.forEach((o) => {
    o.dataset.disabled = "true", o.dataset.bulkState = "loading", o.setAttribute("aria-disabled", "true"), o.setAttribute("title", n), o.classList.add("opacity-50", "cursor-not-allowed"), r.push({
      actionId: o.dataset.bulkAction || "",
      label: o.textContent?.trim() || o.dataset.bulkAction || "Action",
      reason: n
    });
  }), Ar(r, e);
}
function xr(e) {
  return Nn(e.bulkActionStateConfig);
}
function Ks(e, t, n) {
  e.bulkActionState = Bn(t), e.bulkActionStateConfig = Nn(n), e.applyBulkActionState(e.bulkActionState);
}
function Ys(e, t) {
  const n = Bn(t);
  e.bulkActionState = n;
  const r = [];
  hn(e).forEach((o) => {
    const a = o.dataset.bulkAction;
    if (!a) return;
    const s = Hs(o, n[a] || null, o.textContent?.trim() || a);
    s && r.push(s);
  }), Ar(r, e);
}
async function Ws(e) {
  const t = xr(e), n = typeof t?.selection_state_endpoint == "string" ? t.selection_state_endpoint.trim() : "";
  if (!n) {
    e.applyBulkActionState(e.bulkActionState);
    return;
  }
  const r = Array.from(e.state.selectedRows);
  if (!r.length) {
    e.applyBulkActionState(e.bulkActionState);
    return;
  }
  e.bulkActionStateAbortController && e.bulkActionStateAbortController.abort(), e.bulkActionStateAbortController = new AbortController(), e.bulkActionStateRequestSeq += 1;
  const o = e.bulkActionStateRequestSeq, a = typeof e.buildQueryString == "function" ? e.buildQueryString() : "", s = a ? `${n}${n.includes("?") ? "&" : "?"}${a}` : n;
  try {
    const i = await Q(s, {
      method: "POST",
      signal: e.bulkActionStateAbortController.signal,
      json: { ids: r }
    });
    if (!i.ok) throw new Error(`Bulk action state request failed: ${i.status}`);
    const c = Ir(await i.json());
    if (!c || o !== e.bulkActionStateRequestSeq) return;
    e.applyBulkActionState({
      ...e.bulkActionState,
      ...c.bulk_action_state
    });
  } catch (i) {
    if (i instanceof Error && i.name === "AbortError") return;
    O.warn("[DataGrid] Failed to refresh selection-sensitive bulk action state:", i), o === e.bulkActionStateRequestSeq && e.applyBulkActionState(e.bulkActionState);
  }
}
function Xs(e) {
  if (!e.isCapabilityEnabled("bulk")) return;
  e.bulkActionStateDebounce && (clearTimeout(e.bulkActionStateDebounce), e.bulkActionStateDebounce = null);
  const t = xr(e), n = e.state.selectedRows.size;
  if (!t?.selection_sensitive || !t.selection_state_endpoint || n === 0) {
    e.bulkActionStateAbortController && (e.bulkActionStateAbortController.abort(), e.bulkActionStateAbortController = null), e.applyBulkActionState(e.bulkActionState);
    return;
  }
  Vs(e);
  const r = typeof t.debounce_ms == "number" ? t.debounce_ms : 150;
  e.bulkActionStateDebounce = window.setTimeout(() => {
    e.bulkActionStateDebounce = null, Ws(e);
  }, r);
}
function Qs(e) {
  if (!e.isCapabilityEnabled("bulk")) return;
  const t = $e(e)?.dataset?.bulkBase || "";
  hn(e).forEach((n) => {
    n.addEventListener("click", async () => {
      const r = n, o = r.dataset.bulkAction;
      if (!o || r.getAttribute("aria-disabled") === "true" || r.dataset.disabled === "true") return;
      const a = Array.from(e.state.selectedRows);
      if (a.length === 0) {
        e.notify("Please select items first", "warning");
        return;
      }
      if (e.config.bulkActions) {
        const s = e.config.bulkActions.find((i) => i.id === o);
        if (s) {
          try {
            await e.actionRenderer.executeBulkAction(s, a), e.clearSelection(), await e.refresh();
          } catch (i) {
            O.error("Bulk action failed:", i), ct(i)?.textCode && await e.refresh(), Le(i) || e.showError(i instanceof Error ? i.message : "Bulk action failed");
          }
          return;
        }
      }
      if (t) {
        const s = `${t}/${o}`, i = r.dataset.bulkConfirm, c = e.parseDatasetStringArray(r.dataset.bulkPayloadRequired), l = e.parseDatasetObject(r.dataset.bulkPayloadSchema), u = {
          id: o,
          label: r.textContent?.trim() || o,
          endpoint: s,
          confirm: i,
          payloadRequired: c,
          payloadSchema: l
        };
        try {
          await e.actionRenderer.executeBulkAction(u, a), e.clearSelection(), await e.refresh();
        } catch (d) {
          O.error("Bulk action failed:", d), ct(d)?.textCode && await e.refresh(), Le(d) || e.showError(d instanceof Error ? d.message : "Bulk action failed");
        }
        return;
      }
      if (e.config.behaviors?.bulkActions) try {
        await e.config.behaviors.bulkActions.execute(o, a, e), e.clearSelection();
      } catch (s) {
        O.error("Bulk action failed:", s), ct(s)?.textCode && await e.refresh(), Le(s) || e.showError(s instanceof Error ? s.message : "Bulk action failed");
      }
    });
  }), Er(e), e.bindOverflowMenu();
}
function Js(e) {
  const t = document.getElementById("bulk-more-btn"), n = document.getElementById("bulk-overflow-menu");
  !t || !n || (t.addEventListener("click", (r) => {
    r.stopPropagation(), n.classList.toggle("hidden");
  }), document.addEventListener("click", () => {
    n.classList.add("hidden");
  }), document.addEventListener("keydown", (r) => {
    r.key === "Escape" && n.classList.add("hidden");
  }), n.addEventListener("click", (r) => {
    r.stopPropagation();
  }));
}
function Zs(e) {
  if (!e.isCapabilityEnabled("bulk")) return;
  const t = $e(e), n = qs(e), r = e.state.selectedRows.size;
  !t || !n || (n.textContent = String(r), Us(t, r), r > 0 && t.offsetHeight, e.syncBulkActionState());
}
function ei(e) {
  e.isCapabilityEnabled("bulk") && Er(e);
}
function ti(e) {
  if (!e.isCapabilityEnabled("selection")) return;
  O.debug("[DataGrid] Clearing selection..."), e.state.selectedRows.clear();
  const t = e.tableEl?.querySelector(e.selectors.selectAllCheckbox);
  t && (t.checked = !1), e.updateBulkActionsBar(), e.updateSelectionBindings();
}
function ni(e, t, n) {
  no({
    trigger: t,
    menu: n
  });
}
function ri(e) {
  e.actionMenuController && (e.actionMenuController.destroy(), e.actionMenuController = null), e.dropdownAbortController && e.dropdownAbortController.abort(), e.dropdownAbortController = new AbortController();
  const { signal: t } = e.dropdownAbortController;
  document.querySelectorAll("[data-dropdown-toggle]").forEach((o) => {
    const a = o.dataset.dropdownToggle, s = document.getElementById(a || "");
    s && !s.classList.contains("hidden") && s.classList.add("hidden");
  });
  const n = (o = !1) => {
    document.querySelectorAll("[data-dropdown-toggle]").forEach((a) => {
      const s = a.dataset.dropdownToggle, i = document.getElementById(s || "");
      i && (i.classList.add("hidden"), a.setAttribute("aria-expanded", "false"), o && i.getAttribute("data-dropdown-open") === "true" && a.focus(), i.removeAttribute("data-dropdown-open"));
    });
  };
  Ms(document, "click", "[data-dropdown-toggle]", (o, a) => {
    const s = a.dataset.dropdownToggle, i = document.getElementById(s || "");
    if (!(!e.isCapabilityEnabled("export") && (a.matches(e.selectors.exportBtn) || i?.matches(e.selectors.exportMenu))) && (o.stopPropagation(), i)) {
      const c = i.classList.contains("hidden");
      document.querySelectorAll("[data-dropdown-toggle]").forEach((l) => {
        const u = l.dataset.dropdownToggle, d = document.getElementById(u || "");
        d && d !== i && (d.classList.add("hidden"), l.setAttribute("aria-expanded", "false"), d.removeAttribute("data-dropdown-open"));
      }), i.classList.toggle("hidden"), a.setAttribute("aria-expanded", String(c)), c ? (i.setAttribute("data-dropdown-open", "true"), i.querySelector('[role="option"], [role="menuitem"], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])')?.focus()) : (i.removeAttribute("data-dropdown-open"), a.focus());
    }
  }, { signal: t }), document.addEventListener("click", (o) => {
    const a = o.target;
    a && typeof a.closest == "function" && a.closest("[data-dropdown-toggle], #column-toggle-menu, #export-menu") || n();
  }, { signal: t });
  const r = e.tableEl ?? document;
  e.actionMenuController = ro(r, {
    containerSelector: "[data-dropdown], .actions-dropdown",
    triggerSelector: "[data-dropdown-trigger], .actions-menu-trigger",
    menuSelector: ".actions-menu",
    itemSelector: '[role="menuitem"], .action-item',
    outsideIgnoreSelector: "[data-dropdown-toggle], #column-toggle-menu, #export-menu",
    positionMenu: ({ trigger: o, menu: a }) => {
      e.positionDropdownMenu(o, a);
    },
    portal: !0,
    signal: t
  }), document.addEventListener("keydown", (o) => {
    o.key === "Escape" && n(!0);
  }, { signal: t });
}
function oi(e, t) {
  O.error(t), e.notifier.error(t);
}
function ai(e, t, n) {
  e.notifier.show({
    message: t,
    type: n
  });
}
async function si(e, t) {
  return e.notifier.confirm(t);
}
async function ii(e, t) {
  return t instanceof Response ? Rr(t) : t instanceof Error ? t.message : "An unexpected error occurred";
}
function li(e, t) {
  if (t)
    try {
      const n = JSON.parse(t);
      if (!Array.isArray(n)) return;
      const r = n.map((o) => typeof o == "string" ? o.trim() : "").filter((o) => o.length > 0);
      return r.length > 0 ? r : void 0;
    } catch (n) {
      O.warn("[DataGrid] Failed to parse bulk payload_required:", n);
      return;
    }
}
function ci(e, t) {
  if (t)
    try {
      const n = JSON.parse(t);
      return !n || typeof n != "object" || Array.isArray(n) ? void 0 : n;
    } catch (n) {
      O.warn("[DataGrid] Failed to parse bulk payload_schema:", n);
      return;
    }
}
var Cr = ce("DataGrid");
function ui(e, t) {
  if (!e.tableEl) return;
  const n = e.mergeColumnOrder(t);
  e.state.columnOrder = n;
  const r = new Map(e.config.columns.map((o) => [o.field, o]));
  e.config.columns = n.map((o) => r.get(o)).filter((o) => o !== void 0), e.reorderTableColumns(n), e.persistStateSnapshot(), Cr.debug("[DataGrid] Columns reordered:", n);
}
function di(e) {
  e.config.behaviors?.columnVisibility?.clearSavedPrefs?.(), e.config.columns = e.defaultColumns.map((n) => ({ ...n })), e.state.columnOrder = e.config.columns.map((n) => n.field);
  const t = e.config.columns.filter((n) => !n.hidden).map((n) => n.field);
  e.tableEl ? (e.reorderTableColumns(e.state.columnOrder), e.updateColumnVisibility(t)) : (e.state.hiddenColumns = new Set(e.config.columns.filter((n) => n.hidden).map((n) => n.field)), e.persistStateSnapshot()), e.columnManager && (e.columnManager.refresh(), e.columnManager.syncWithGridState()), Cr.debug("[DataGrid] Columns reset to default");
}
function fi(e, t) {
  const n = new Set(e.config.columns.map((s) => s.field)), r = new Set(t), o = t.filter((s) => n.has(s)), a = e.config.columns.map((s) => s.field).filter((s) => !r.has(s));
  return [...o, ...a];
}
function pi(e, t) {
  if (!e.tableEl) return;
  const n = e.tableEl.querySelector("thead tr:first-child");
  n && e.reorderRowCells(n, t, "th");
  const r = e.tableEl.querySelector("#filter-row");
  r && e.reorderRowCells(r, t, "th"), e.tableEl.querySelectorAll("tbody tr").forEach((o) => {
    e.reorderRowCells(o, t, "td");
  });
}
function hi(e, t, n, r) {
  const o = Array.from(t.querySelectorAll(`${r}[data-column]`)), a = new Map(o.map((u) => [u.dataset.column, u])), s = Array.from(t.querySelectorAll(r)), i = t.querySelector(`${r}[data-role="selection"]`) || s.find((u) => u.querySelector('input[type="checkbox"]')), c = t.querySelector(`${r}[data-role="actions"]`) || s.find((u) => !u.dataset.column && (u.querySelector("[data-action]") || u.querySelector("[data-action-id]") || u.querySelector(".dropdown"))), l = [];
  i && l.push(i), n.forEach((u) => {
    const d = a.get(u);
    d && l.push(d);
  }), c && l.push(c), l.forEach((u) => {
    t.appendChild(u);
  });
}
var K, Ge = ce("DataGrid");
function mi(e) {
  if (!e) return {
    selection: !0,
    bulk: !0,
    export: !0
  };
  const t = e.bulk !== !1, n = e.export !== !1;
  return {
    selection: t || n,
    bulk: t,
    export: n
  };
}
var _r = class {
  constructor(e) {
    this.tableEl = null, this.searchTimeout = null, this.abortController = null, this.dropdownAbortController = null, this.actionMenuController = null, this.selectionAbortController = null, this.didRestoreColumnOrder = !1, this.shouldReorderDOMOnRestore = !1, this.recordsById = {}, this.columnManager = null, this.lastSchema = null, this.lastForm = null, this.bulkActionState = {}, this.bulkActionStateConfig = null, this.bulkActionStateDebounce = null, this.bulkActionStateAbortController = null, this.bulkActionStateRequestSeq = 0, this.refreshDrainPromise = null, this.refreshInFlight = null, this.refreshQueued = !1, this.refreshRequestSeq = 0, this.activeRefreshSeq = 0, this.hasURLStateOverrides = !1, this.hasPersistedHiddenColumnState = !1, this.hasPersistedColumnOrderState = !1, this.config = {
      perPage: 10,
      searchDelay: 300,
      behaviors: {},
      ...e,
      capabilities: mi(e.capabilities)
    }, this.notifier = e.notifier || new Gn(), this.selectors = {
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
    this.stateStore = this.config.stateStore || ko({
      key: t,
      ...this.config.stateStoreConfig || {}
    });
    const n = this.stateStore.loadPersistedState(), r = new Set(this.config.columns.map((S) => S.field)), o = new Set(this.config.columns.filter((S) => S.hidden).map((S) => S.field)), a = !!n && Array.isArray(n.hiddenColumns);
    this.hasPersistedHiddenColumnState = a;
    const s = new Set((n?.hiddenColumns || []).filter((S) => r.has(S))), i = this.config.columns.map((S) => S.field), c = !!n && Array.isArray(n.columnOrder) && n.columnOrder.length > 0;
    this.hasPersistedColumnOrderState = c;
    const l = (n?.columnOrder || []).filter((S) => r.has(S)), u = c ? [...l, ...i.filter((S) => !l.includes(S))] : i, d = this.config.enableGroupedMode ? Fo(t) : !1, f = this.config.enableGroupedMode ? jo(t) : null, p = this.config.enableGroupedMode ? No(t) : "explicit", m = this.config.enableGroupedMode ? Bo(t) : /* @__PURE__ */ new Set(), b = Ze(n?.expandMode, p), x = new Set((n?.expandedGroups || Array.from(m)).map((S) => String(S).trim()).filter(Boolean)), w = this.config.enableGroupedMode ? n?.expandMode !== void 0 || x.size > 0 || d : !1, C = (this.config.enableGroupedMode ? n?.viewMode || f : null) || this.config.defaultViewMode || "flat";
    this.state = {
      currentPage: 1,
      perPage: this.config.perPage || 10,
      totalRows: 0,
      search: "",
      filters: [],
      sort: [],
      selectedRows: /* @__PURE__ */ new Set(),
      hiddenColumns: a ? s : o,
      columnOrder: u,
      viewMode: C,
      expandMode: b,
      groupedData: null,
      expandedGroups: x,
      hasPersistedExpandState: w
    }, this.actionRenderer = new ao({
      mode: this.config.actionRenderMode || "dropdown",
      actionBasePath: this.config.actionBasePath || this.config.apiEndpoint,
      notifier: this.notifier,
      domIdPrefix: this.config.tableId
    }), this.cellRendererRegistry = new go(), this.config.cellRenderers && Object.entries(this.config.cellRenderers).forEach(([S, P]) => {
      this.cellRendererRegistry.register(S, P);
    }), this.defaultColumns = this.config.columns.map((S) => ({ ...S }));
  }
  init() {
    if (Ge.debug("[DataGrid] Initializing with config:", this.config), this.tableEl = document.querySelector(this.selectors.table), !this.tableEl) {
      Ge.error(`[DataGrid] Table element not found: ${this.selectors.table}`);
      return;
    }
    Ge.debug("[DataGrid] Table element found:", this.tableEl), Ua(this), Ps(this), this.restoreStateFromURL(), this.bindSearchInput(), this.bindPerPageSelect(), this.bindFilterInputs(), this.bindColumnVisibility(), this.bindExportButtons(), this.bindSorting(), this.bindSelection(), this.bindBulkActions(), this.bindBulkClearButton(), this.bindDropdownToggles(), this.refreshAfterStateHydration();
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
        Ge.error("[DataGrid] onStateChange callback failed:", t);
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
    return na(this);
  }
  parseJSONArray(e, t) {
    return ra(this, e, t);
  }
  applyPersistedStateSnapshot(e, t = {}) {
    sa(this, e, t);
  }
  applyShareStateSnapshot(e) {
    ia(this, e);
  }
  buildPersistedStateSnapshot() {
    return la(this);
  }
  buildShareStateSnapshot() {
    return ca(this);
  }
  persistStateSnapshot() {
    ua(this);
  }
  restoreStateFromURL() {
    da(this);
  }
  applyRestoredState() {
    fa(this);
  }
  pushStateToURL(e = {}) {
    pa(this, e);
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
      this.activeRefreshSeq = e, this.refreshInFlight = ha(this, e), await this.refreshInFlight, this.refreshInFlight = null;
    }
  }
  buildApiUrl() {
    return ma(this);
  }
  buildQueryString() {
    return ba(this);
  }
  buildQueryParams() {
    return ga(this);
  }
  getResponseTotal(e) {
    return ya(this, e);
  }
  normalizePagination(e) {
    return va(this, e);
  }
  resetPagination() {
    this.state.currentPage = 1;
  }
  updateColumnVisibility(e, t = !1) {
    qa(this, e, t);
  }
  syncColumnVisibilityCheckboxes() {
    ja(this);
  }
  renderData(e) {
    Va(this, e);
  }
  renderLoadingState() {
    za(this);
  }
  renderErrorState(e) {
    Ha(this, e);
  }
  renderFlatData(e, t) {
    Ka(this, e, t);
  }
  renderGroupedData(e, t, n) {
    Ca(this, e, t, n);
  }
  isGroupedViewActive() {
    return _a(this);
  }
  fallbackGroupedMode(e) {
    ka(this, e);
  }
  handleGroupedModeStatusFallback(e) {
    return Da(this, e);
  }
  handleGroupedModePayloadFallback(e) {
    return Ma(this, e);
  }
  toggleGroup(e) {
    Pa(this, e);
  }
  setExpandedGroups(e) {
    Ta(this, e);
  }
  expandAllGroups() {
    Ra(this);
  }
  collapseAllGroups() {
    La(this);
  }
  updateGroupVisibility(e) {
    Oa(this, e);
  }
  updateGroupedRowsFromState() {
    Ia(this);
  }
  isGroupExpandedByState(e, t = !1) {
    return $a(this, e, t);
  }
  setViewMode(e) {
    Ga(this, e);
  }
  getViewMode() {
    return Ba(this);
  }
  getGroupedData() {
    return Na(this);
  }
  async fetchDetail(e) {
    return Sa(this, e);
  }
  getSchema() {
    return Ea(this);
  }
  getForm() {
    return Aa(this);
  }
  getTabs() {
    return xa(this);
  }
  normalizeDetailResponse(e) {
    return wa(this, e);
  }
  resolveRendererOptions(e) {
    return Ya(this, e);
  }
  createTableRow(e) {
    return Wa(this, e);
  }
  sanitizeActionId(e) {
    return Xa(this, e);
  }
  async handleDelete(e) {
    return Qa(this, e);
  }
  updatePaginationUI(e) {
    Ja(this, e);
  }
  renderPaginationButtons(e) {
    Za(this, e);
  }
  bindSearchInput() {
    Ts(this);
  }
  bindPerPageSelect() {
    Rs(this);
  }
  bindFilterInputs() {
    Ls(this);
  }
  bindColumnVisibility() {
    Os(this);
  }
  bindExportButtons() {
    Is(this);
  }
  bindSorting() {
    $s(this);
  }
  updateSortIndicators() {
    Gs(this);
  }
  bindSelection() {
    Bs(this);
  }
  updateSelectionBindings() {
    Ns(this);
  }
  bindBulkActions() {
    Qs(this);
  }
  bindOverflowMenu() {
    Js(this);
  }
  updateBulkActionsBar() {
    Zs(this);
  }
  setBulkActionState(e, t) {
    Ks(this, e, t);
  }
  applyBulkActionState(e) {
    Ys(this, e);
  }
  syncBulkActionState() {
    Xs(this);
  }
  bindBulkClearButton() {
    ei(this);
  }
  clearSelection() {
    ti(this);
  }
  positionDropdownMenu(e, t) {
    ni(this, e, t);
  }
  bindDropdownToggles() {
    ri(this);
  }
  showError(e) {
    oi(this, e);
  }
  notify(e, t) {
    ai(this, e, t);
  }
  async confirmAction(e) {
    return si(this, e);
  }
  async extractError(e) {
    return ii(this, e);
  }
  parseDatasetStringArray(e) {
    return li(this, e);
  }
  parseDatasetObject(e) {
    return ci(this, e);
  }
  reorderColumns(e) {
    ui(this, e);
  }
  resetColumnsToDefault() {
    di(this);
  }
  mergeColumnOrder(e) {
    return fi(this, e);
  }
  reorderTableColumns(e) {
    pi(this, e);
  }
  reorderRowCells(e, t, n) {
    hi(this, e, t, n);
  }
  destroy() {
    this.columnManager && (this.columnManager.destroy(), this.columnManager = null), this.dropdownAbortController && (this.dropdownAbortController.abort(), this.dropdownAbortController = null), this.actionMenuController && (this.actionMenuController.destroy(), this.actionMenuController = null), this.selectionAbortController && (this.selectionAbortController.abort(), this.selectionAbortController = null), this.abortController && (this.abortController.abort(), this.abortController = null), this.bulkActionStateAbortController && (this.bulkActionStateAbortController.abort(), this.bulkActionStateAbortController = null), this.searchTimeout && (clearTimeout(this.searchTimeout), this.searchTimeout = null), this.bulkActionStateDebounce && (clearTimeout(this.bulkActionStateDebounce), this.bulkActionStateDebounce = null), Ge.debug("[DataGrid] Instance destroyed");
  }
};
K = _r;
K.URL_KEY_SEARCH = Ye;
K.URL_KEY_PAGE = We;
K.URL_KEY_PER_PAGE = Xe;
K.URL_KEY_FILTERS = Qe;
K.URL_KEY_SORT = Je;
K.URL_KEY_STATE = xt;
K.URL_KEY_HIDDEN_COLUMNS = Ct;
K.URL_KEY_VIEW_MODE = _t;
K.URL_KEY_EXPANDED_GROUPS = sn;
K.MANAGED_URL_KEYS = ln;
K.DEFAULT_MAX_URL_LENGTH = ta;
K.DEFAULT_MAX_FILTERS_LENGTH = 600;
typeof window < "u" && (window.DataGrid = _r);
var Ji = class {
  constructor(e) {
    if (this.searchableFields = e, !e || e.length === 0) throw new Error("At least one searchable field is required");
  }
  buildQuery(e) {
    if (!e || e.trim() === "") return {};
    const t = {}, n = e.trim();
    return this.searchableFields.forEach((r) => {
      t[`${r}__ilike`] = `%${n}%`;
    }), t;
  }
  async onSearch(e, t) {
    t.resetPagination(), await t.refresh();
  }
}, Zi = class {
  buildFilters(e) {
    const t = {}, n = /* @__PURE__ */ new Map();
    return e.forEach((r) => {
      if (r.value === null || r.value === void 0 || r.value === "") return;
      const o = r.operator || "eq", a = r.column;
      n.has(a) || n.set(a, {
        operator: o,
        values: []
      }), n.get(a).values.push(r.value);
    }), n.forEach((r, o) => {
      if (r.values.length === 1) {
        const a = r.operator === "eq" ? o : `${o}__${r.operator}`;
        t[a] = r.values[0];
      } else r.operator === "ilike" ? t[`${o}__ilike`] = r.values.join(",") : r.operator === "eq" ? t[`${o}__in`] = r.values.join(",") : t[`${o}__${r.operator}`] = r.values.join(",");
    }), t;
  }
  async onFilterChange(e, t, n) {
    n.resetPagination(), await n.refresh();
  }
}, el = class {
  buildQuery(e, t) {
    return {
      limit: t,
      offset: (e - 1) * t
    };
  }
  async onPageChange(e, t) {
    await t.refresh();
  }
}, tl = class {
  buildQuery(e) {
    return !e || e.length === 0 ? {} : { order: e.map((t) => `${t.field} ${t.direction}`).join(",") };
  }
  async onSort(e, t, n) {
    await n.refresh();
  }
}, nl = class {
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
    const n = bi(t, this.config, e);
    n.delivery = gi(this.config, e);
    let r;
    try {
      r = await Q(this.getEndpoint(), {
        method: "POST",
        json: n,
        headers: { Accept: "application/json,application/octet-stream" }
      });
    } catch (o) {
      throw Ee(t, "error", o instanceof Error ? o.message : "Network error during export"), o;
    }
    if (r.status === 202) {
      const o = await kr(r);
      Ee(t, "info", "Export queued. You can download it when ready.");
      const a = o?.status_url || "";
      if (a) {
        const s = Si(o, a);
        try {
          await wi(a, {
            intervalMs: yi(this.config),
            timeoutMs: vi(this.config)
          });
          const i = await Q(s, {
            method: "GET",
            headers: { Accept: "application/octet-stream" }
          });
          if (!i.ok) {
            const c = await Zt(i);
            throw Ee(t, "error", c), new Error(c);
          }
          await On(i, n.definition || n.resource || "export", n.format), Ee(t, "success", "Export ready.");
          return;
        } catch (i) {
          throw Ee(t, "error", i instanceof Error ? i.message : "Export failed"), i;
        }
      }
      if (o?.download_url) {
        window.open(o.download_url, "_blank");
        return;
      }
      return;
    }
    if (!r.ok) {
      const o = await Zt(r);
      throw Ee(t, "error", o), new Error(o);
    }
    await On(r, n.definition || n.resource || "export", n.format), Ee(t, "success", "Export ready.");
  }
};
function bi(e, t, n) {
  const r = Mi(n), o = Ai(e, t), a = xi(e, t), s = {
    format: r,
    query: _i(Ci(e)),
    selection: o,
    columns: a,
    delivery: t.delivery || "auto"
  };
  t.definition && (s.definition = t.definition), t.resource && (s.resource = t.resource);
  const i = t.sourceVariant || t.variant;
  return i && (s.source_variant = i), s;
}
function gi(e, t) {
  return e.delivery ? e.delivery : (e.asyncFormats && e.asyncFormats.length > 0 ? e.asyncFormats : ["pdf"]).includes(t) ? "async" : "auto";
}
function yi(e) {
  const t = Number(e.statusPollIntervalMs);
  return Number.isFinite(t) && t > 0 ? t : 2e3;
}
function vi(e) {
  const t = Number(e.statusPollTimeoutMs);
  return Number.isFinite(t) && t >= 0 ? t : 3e5;
}
function Si(e, t) {
  return e?.download_url ? e.download_url : `${t.replace(/\/+$/, "")}/download`;
}
async function kr(e) {
  return await Mr(e);
}
async function wi(e, t) {
  const n = Date.now(), r = Math.max(250, t.intervalMs);
  for (; ; ) {
    const o = await Q(e, {
      method: "GET",
      headers: { Accept: "application/json" }
    });
    if (!o.ok) {
      const i = await Zt(o);
      throw new Error(i);
    }
    const a = await kr(o), s = String(a?.state || "").toLowerCase();
    if (s === "completed") return a;
    if (s === "failed") throw new Error("Export failed");
    if (s === "canceled") throw new Error("Export canceled");
    if (s === "deleted") throw new Error("Export deleted");
    if (t.timeoutMs > 0 && Date.now() - n > t.timeoutMs) throw new Error("Export status timed out");
    await Ei(r);
  }
}
function Ei(e) {
  return new Promise((t) => setTimeout(t, e));
}
function Ai(e, t) {
  if (t.selection?.mode) return t.selection;
  const n = Array.from(e.state.selectedRows || []), r = n.length > 0 ? "ids" : "all";
  return {
    mode: r,
    ids: r === "ids" ? n : []
  };
}
function xi(e, t) {
  if (Array.isArray(t.columns) && t.columns.length > 0) return t.columns.slice();
  const n = e.state?.hiddenColumns ? new Set(e.state.hiddenColumns) : /* @__PURE__ */ new Set();
  return (Array.isArray(e.state?.columnOrder) && e.state.columnOrder.length > 0 ? e.state.columnOrder : e.config.columns.map((r) => r.field)).filter((r) => !n.has(r));
}
function Ci(e) {
  const t = {}, n = e.config.behaviors || {};
  return n.pagination && Object.assign(t, n.pagination.buildQuery(e.state.currentPage, e.state.perPage)), e.state.search && n.search && Object.assign(t, n.search.buildQuery(e.state.search)), e.state.filters.length > 0 && n.filter && Object.assign(t, n.filter.buildFilters(e.state.filters)), e.state.sort.length > 0 && n.sort && Object.assign(t, n.sort.buildQuery(e.state.sort)), t;
}
function _i(e) {
  const t = {}, n = [];
  return Object.entries(e).forEach(([r, o]) => {
    if (o == null || o === "") return;
    switch (r) {
      case "limit":
        t.limit = Ln(o);
        return;
      case "offset":
        t.offset = Ln(o);
        return;
      case "order":
      case "sort":
        t.sort = Di(String(o));
        return;
      case "q":
      case "search":
        t.search = String(o);
        return;
    }
    const { field: a, op: s } = ki(r);
    a && n.push({
      field: a,
      op: s,
      value: o
    });
  }), n.length > 0 && (t.filters = n), t;
}
function ki(e) {
  const t = e.split("__");
  return {
    field: t[0]?.trim() || "",
    op: t[1]?.trim() || "eq"
  };
}
function Di(e) {
  return e ? e.split(",").map((t) => t.trim()).filter(Boolean).map((t) => {
    const n = t.split(/\s+/);
    return {
      field: n[0] || "",
      desc: (n[1] || "asc").toLowerCase() === "desc"
    };
  }).filter((t) => t.field) : [];
}
function Mi(e) {
  const t = String(e || "").trim().toLowerCase();
  return t === "excel" || t === "xls" ? "xlsx" : t || "csv";
}
function Ln(e) {
  const t = Number(e);
  return Number.isFinite(t) ? t : 0;
}
async function On(e, t, n) {
  const r = await e.blob(), o = Pi(e, t, n), a = URL.createObjectURL(r), s = document.createElement("a");
  s.href = a, s.download = o, s.rel = "noopener", document.body.appendChild(s), s.click(), s.remove(), URL.revokeObjectURL(a);
}
function Pi(e, t, n) {
  const r = e.headers.get("content-disposition") || "", o = `${t}.${n}`;
  return Ti(r) || o;
}
function Ti(e) {
  if (!e) return null;
  const t = e.match(/filename\*=(?:UTF-8'')?([^;]+)/i);
  if (t && t[1]) return decodeURIComponent(t[1].replace(/"/g, "").trim());
  const n = e.match(/filename="?([^";]+)"?/i);
  return n && n[1] ? n[1].trim() : null;
}
async function Zt(e) {
  return In(e, `Export failed (${e.status})`, { appendStatusToFallback: !1 });
}
function Ee(e, t, n) {
  const r = e.config.notifier;
  if (r && typeof r[t] == "function") {
    r[t](n);
    return;
  }
  const o = window.toastManager;
  if (o && typeof o[t] == "function") {
    o[t](n);
    return;
  }
  t === "error" && alert(n);
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
  async execute(e, t, n) {
    const r = this.getActionEndpoint(e), o = await Q(r, {
      method: "POST",
      json: { ids: t },
      accept: "application/json"
    });
    if (!o.ok) {
      const a = await In(o, `Bulk action '${e}' failed`);
      throw new Error(`Bulk action '${e}' failed: ${a}`);
    }
    await n.refresh();
  }
}, T = ce("DataGrid"), Ri = 1500;
function Li(e) {
  return typeof e == "object" && e !== null && "name" in e && e.name === "AbortError";
}
function Dr(e) {
  return typeof e == "object" && e !== null && "version" in e && e.version === 2;
}
var Oi = class {
  constructor(e, t = "datatable_columns") {
    this.cachedOrder = null, this.storageKey = t;
  }
  getVisibleColumns(e) {
    return e.config.columns.filter((t) => !e.state.hiddenColumns.has(t.field)).map((t) => t.field);
  }
  toggleColumn(e, t) {
    const n = !t.state.hiddenColumns.has(e), r = t.config.columns.filter((s) => s.field === e ? !n : !t.state.hiddenColumns.has(s.field)).map((s) => s.field), o = {};
    t.config.columns.forEach((s) => {
      o[s.field] = r.includes(s.field);
    });
    const a = this.cachedOrder || t.state.columnOrder;
    this.savePrefs({
      version: 2,
      visibility: o,
      order: a.length > 0 ? a : void 0
    }), t.updateColumnVisibility(r);
  }
  reorderColumns(e, t) {
    const n = {};
    t.config.columns.forEach((r) => {
      n[r.field] = !t.state.hiddenColumns.has(r.field);
    }), this.cachedOrder = e, this.savePrefs({
      version: 2,
      visibility: n,
      order: e
    }), T.debug("[ColumnVisibility] Order saved:", e);
  }
  loadColumnOrderFromCache(e) {
    try {
      const t = this.loadPrefs();
      if (!t || !t.order) return [];
      const n = new Set(e), r = t.order.filter((o) => n.has(o));
      return this.cachedOrder = r, T.debug("[ColumnVisibility] Order loaded from cache:", r), r;
    } catch (t) {
      return T.warn("Failed to load column order from cache:", t), [];
    }
  }
  loadHiddenColumnsFromCache(e) {
    try {
      const t = this.loadPrefs();
      if (!t) return /* @__PURE__ */ new Set();
      const n = new Set(e), r = /* @__PURE__ */ new Set();
      return Object.entries(t.visibility).forEach(([o, a]) => {
        !a && n.has(o) && r.add(o);
      }), r;
    } catch (t) {
      return T.warn("Failed to load column visibility state:", t), /* @__PURE__ */ new Set();
    }
  }
  loadPrefs() {
    try {
      const e = localStorage.getItem(this.storageKey);
      if (!e) return null;
      const t = JSON.parse(e);
      if (Dr(t)) return t;
      const n = {
        version: 2,
        visibility: t
      };
      return T.debug("[ColumnVisibility] Migrating V1 prefs to V2 format"), this.savePrefs(n), n;
    } catch (e) {
      return T.warn("Failed to load column preferences:", e), null;
    }
  }
  savePrefs(e) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(e));
    } catch (t) {
      T.warn("Failed to save column preferences:", t);
    }
  }
  clearSavedPrefs() {
    try {
      localStorage.removeItem(this.storageKey), this.cachedOrder = null, T.debug("[ColumnVisibility] Preferences cleared");
    } catch (e) {
      T.warn("Failed to clear column preferences:", e);
    }
  }
}, ol = class extends Oi {
  constructor(e, t) {
    const n = t.localStorageKey || `${t.resource}_datatable_columns`;
    if (super(e, n), this.syncTimeout = null, this.serverPrefs = null, this.mutationQueue = Promise.resolve(), this.resource = t.resource, this.preferencesEndpoint = String(t.preferencesEndpoint || "").trim().replace(/\/+$/, ""), !this.preferencesEndpoint) throw new Error("ServerColumnVisibilityBehavior requires an advertised preferences endpoint");
    this.syncDebounce = t.syncDebounce ?? 1e3, this.loadTimeoutMs = Math.max(100, t.loadTimeoutMs || Ri), this.canWrite = t.canWrite !== !1;
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
      const n = await Q(this.preferencesEndpoint, {
        method: "GET",
        credentials: "same-origin",
        signal: e?.signal,
        headers: { Accept: "application/json" }
      });
      if (!n.ok)
        return T.warn("[ServerColumnVisibility] Failed to load server prefs:", n.status), null;
      const r = (await n.json()).records || [];
      if (r.length === 0)
        return T.debug("[ServerColumnVisibility] No server preferences found"), null;
      const o = r[0]?.raw;
      if (!o || !o[this.serverPrefsKey])
        return T.debug("[ServerColumnVisibility] No column preferences in server response"), null;
      const a = o[this.serverPrefsKey];
      return Dr(a) ? (this.serverPrefs = a, this.savePrefs(a), T.debug("[ServerColumnVisibility] Loaded prefs from server:", a), a) : (T.warn("[ServerColumnVisibility] Server prefs not in V2 format:", a), null);
    } catch (n) {
      return Li(n) || T.warn("[ServerColumnVisibility] Error loading server prefs:", n), null;
    } finally {
      clearTimeout(t);
    }
  }
  getInitialPrefs(e) {
    const t = this.serverPrefs;
    if (t) {
      const n = /* @__PURE__ */ new Set();
      Object.entries(t.visibility).forEach(([o, a]) => {
        a || n.add(o);
      });
      const r = new Set(e);
      return {
        hiddenColumns: n,
        columnOrder: (t.order || []).filter((o) => r.has(o))
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
    e.config.columns.forEach((r) => {
      t[r.field] = !e.state.hiddenColumns.has(r.field);
    });
    const n = {
      version: 2,
      visibility: t,
      order: e.state.columnOrder.length > 0 ? e.state.columnOrder : void 0
    };
    try {
      const r = await Q(this.preferencesEndpoint, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        json: { raw: { [this.serverPrefsKey]: n } }
      });
      if (!r.ok) {
        T.warn("[ServerColumnVisibility] Failed to sync to server:", r.status);
        return;
      }
      this.serverPrefs = n, T.debug("[ServerColumnVisibility] Synced prefs to server:", n);
    } catch (r) {
      T.warn("[ServerColumnVisibility] Error syncing to server:", r);
    }
  }
  clearSavedPrefs() {
    this.cancelScheduledServerSync(), super.clearSavedPrefs(), this.serverPrefs = null, this.canWrite && this.enqueueServerMutation(() => this.clearServerPrefs());
  }
  async clearServerPrefs() {
    try {
      const e = await Q(this.preferencesEndpoint, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        json: { clear_raw_keys: [this.serverPrefsKey] }
      });
      if (!e.ok) {
        T.warn("[ServerColumnVisibility] Failed to clear server prefs:", e.status);
        return;
      }
      T.debug("[ServerColumnVisibility] Server prefs cleared");
    } catch (e) {
      T.warn("[ServerColumnVisibility] Error clearing server prefs:", e);
    } finally {
      this.serverPrefs = null;
    }
  }
};
export {
  Mo as A,
  Do as B,
  Wi as C,
  Vn as D,
  an as E,
  zo as F,
  zi as G,
  _o as H,
  Yo as I,
  ao as K,
  Xo as L,
  Hi as M,
  Xi as N,
  Qo as O,
  Ko as P,
  Wo as R,
  Go as S,
  jo as T,
  ko as U,
  Hn as V,
  go as W,
  Qe as _,
  tl as a,
  Qi as b,
  Ji as c,
  ke as d,
  Qa as f,
  Jo as g,
  Zo as h,
  nl as i,
  nr as j,
  $o as k,
  _r as l,
  Za as m,
  ol as n,
  el as o,
  ir as p,
  rl as r,
  Zi as s,
  Oi as t,
  Ds as u,
  Yi as v,
  Bo as w,
  Ki as x,
  Uo as y,
  Vi as z
};

//# sourceMappingURL=go-crud-w9mehfGh.js.map