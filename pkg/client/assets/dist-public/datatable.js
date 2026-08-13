import { escapeAttribute as v, escapeHTML as u } from "./shared/html.js";
import { createLogger as M } from "./shared/logger.js";
import { parseDateLike as Ot } from "./shared/date-utils.js";
import { t as Kn } from "./chunks/stateful-controller-BhTsWevz.js";
import { httpRequest as U, readHTTPError as Hr, readHTTPJSON as Jn, readHTTPJSONObject as vs, readHTTPJSONValue as Yn } from "./shared/transport/http-client.js";
import { createStructuredActionError as Ft, executeActionRequest as Vr, executeStructuredRequest as Wn, extractErrorMessage as ws, extractExchangeError as Au, extractTranslationBlocker as xs, formatStructuredErrorForDisplay as We, generateExchangeReport as $u, getStructuredActionError as ot, groupRowResultsByStatus as ku, isExchangeError as _u, isHandledActionError as Be, isTranslationBlocker as Ss, parseImportResult as Lu } from "./toast/error-helpers.js";
import { i as yn, r as Cs } from "./chunks/modal-B1Um4QMU.js";
import { t as Qe } from "./chunks/toast-manager-dTUZQSLs.js";
import { t as Es } from "./chunks/icon-renderer-DWZ4R-YR.js";
var Kr = "[data-action-menu], [data-dropdown]", Xn = "[data-action-menu-trigger], [data-dropdown-trigger]", Jr = "[data-action-menu-content], .actions-menu", As = '[role="menuitem"], [data-action-menu-item], .action-item', Qn = "hidden", Vt = /* @__PURE__ */ new Set(), ie = /* @__PURE__ */ new WeakMap(), Yr = /* @__PURE__ */ new WeakMap(), Er = /* @__PURE__ */ new WeakMap(), $s = [
  "position",
  "right",
  "bottom",
  "margin",
  "min-width",
  "max-width",
  "max-height",
  "left",
  "top"
], ks = [
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
], _s = [
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
function Ls(e) {
  const t = e.target;
  return t && typeof t.closest == "function" ? t : null;
}
function Ve(e, t) {
  return "contains" in e && typeof e.contains == "function" ? e.contains(t) : !1;
}
function Ds(e, t) {
  const r = /* @__PURE__ */ new Map();
  return t.forEach((n) => {
    r.set(n, {
      value: e.style.getPropertyValue(n),
      priority: e.style.getPropertyPriority(n)
    });
  }), r;
}
function Ts(e, t) {
  t.forEach(({ value: r, priority: n }, i) => {
    if (r) {
      e.style.setProperty(i, r, n);
      return;
    }
    e.style.removeProperty(i);
  });
}
function Zn(e) {
  const t = Er.get(e);
  t && (Er.delete(e), Ts(e, t));
}
function Rs(e) {
  const t = /* @__PURE__ */ new Map(), r = e.ownerDocument.defaultView;
  if (!r) return t;
  const n = r.getComputedStyle(e), i = new Set(ks);
  for (let s = 0; s < n.length; s += 1) {
    const a = n.item(s);
    a.startsWith("--") && i.add(a);
  }
  return i.forEach((s) => {
    const a = n.getPropertyValue(s).trim();
    a && t.set(s, a);
  }), _s.forEach((s) => {
    const a = n.getPropertyValue(s).trim();
    a && t.set(s, a);
  }), t;
}
function Ps(e, t) {
  t.forEach((r, n) => {
    e.style.setProperty(n, r);
  });
}
function Ms(e, t = {}) {
  const r = t.containerSelector || Kr, n = t.menuSelector || Jr, i = e.closest(r), s = Yr.get(e) ?? i?.querySelector(n) ?? null;
  return !i || !s ? null : {
    container: i,
    trigger: e,
    menu: s
  };
}
function Is(e, t) {
  const { container: r, trigger: n, menu: i } = e;
  if (ie.has(i)) return;
  const s = i.ownerDocument, a = i.parentNode;
  if (!s.body || !a) return;
  const o = Rs(i);
  ie.set(i, {
    container: r,
    trigger: n,
    root: t,
    parent: a,
    nextSibling: i.nextSibling,
    inlineStyle: i.getAttribute("style")
  }), Vt.add(i), Yr.set(n, i), s.body.appendChild(i), Ps(i, o);
}
function Bs(e) {
  const t = ie.get(e);
  if (t) {
    if (Vt.delete(e), ie.delete(e), Yr.delete(t.trigger), t.inlineStyle === null ? e.removeAttribute("style") : e.setAttribute("style", t.inlineStyle), !t.parent.isConnected) {
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
function lt(e, t = {}) {
  const r = t.hiddenClass || Qn;
  e.classList.add(r);
  const n = ie.get(e), i = n?.container ?? e.closest(t.containerSelector || Kr);
  (n?.trigger ?? i?.querySelector(t.triggerSelector || Xn))?.setAttribute("aria-expanded", "false"), Zn(e), Bs(e);
}
function Os(e = document, t = {}) {
  const r = t.menuSelector || Jr, n = new Set(Array.from(e.querySelectorAll(r)));
  Vt.forEach((i) => {
    const s = ie.get(i);
    s && (s.root === e || Ve(e, s.trigger)) && n.add(i);
  }), n.forEach((i) => {
    lt(i, t);
  });
}
function Fs(e) {
  return e.getAttribute("aria-disabled") === "true" || e.dataset.disabled === "true";
}
function vn(e, t) {
  return Array.from(e.querySelectorAll(t)).filter((r) => !r.hasAttribute("disabled") && !r.hidden && r.getAttribute("aria-hidden") !== "true");
}
function nr(e) {
  if (e)
    try {
      e.focus({ preventScroll: !0 });
    } catch {
      e.focus();
    }
}
function qs(e, t, r) {
  const n = new Set(Array.from(e.querySelectorAll(t)));
  return Vt.forEach((i) => {
    const s = ie.get(i);
    s && (s.root === e || Ve(e, s.trigger)) && n.add(i);
  }), Array.from(n).find((i) => !i.classList.contains(r)) ?? null;
}
function Ns({ trigger: e, menu: t }) {
  Zn(t), Er.set(t, Ds(t, $s));
  const r = e.getBoundingClientRect(), n = e.ownerDocument.defaultView ?? window, i = n.visualViewport, s = i?.offsetLeft ?? 0, a = i?.offsetTop ?? 0, o = i?.width ?? n.innerWidth, l = i?.height ?? n.innerHeight, c = 10, d = 8, f = Math.max(0, o - 20), h = Math.max(0, l - 20), p = n.getComputedStyle(t), m = (bn, Et) => {
    const At = Number.parseFloat(bn);
    return Number.isFinite(At) ? At : Et;
  }, g = m(p.minWidth, 192), y = m(p.maxWidth, f), w = m(p.maxHeight, h), x = Math.min(y, f), E = s + o, L = a + l, q = Math.max(0, L - c - r.bottom - d), N = Math.max(0, r.top - a - c - d), F = Math.min(t.scrollHeight || t.offsetHeight || Math.min(300, h), w, h), ve = F > q && N > q, z = Math.min(w, h, ve ? N : q);
  t.style.position = "fixed", t.style.right = "auto", t.style.bottom = "auto", t.style.margin = "0", t.style.minWidth = `${Math.min(g, x)}px`, t.style.maxWidth = `${x}px`, t.style.maxHeight = `${z}px`;
  const we = Math.min(t.offsetWidth || 224, f), te = Math.min(t.offsetHeight || F, z), Ee = r.right - we, X = s + c, fe = Math.max(X, E - we - c), Ae = Math.min(Math.max(X, Ee), fe), ae = ve ? r.top - te - d : r.bottom + d, $e = a + c, ke = Math.max($e, L - te - c), rr = Math.min(Math.max($e, ae), ke);
  t.style.left = `${Ae}px`, t.style.top = `${rr}px`;
}
function js(e = document, t = {}) {
  const r = t.triggerSelector || Xn, n = t.itemSelector || As, i = t.hiddenClass || Qn, s = t.menuSelector || Jr, a = t.positionMenu, o = e.nodeType === 9 ? e : e.ownerDocument || document, l = [], c = {
    closeAll: () => Os(e, t),
    destroy: () => {
      for (c.closeAll(); l.length > 0; ) l.pop()?.();
    }
  };
  e.querySelectorAll(s).forEach((p) => {
    p.classList.contains(i) || p.classList.add(i);
  });
  const d = (p) => {
    const m = Ls(p);
    if (!m) return;
    const g = m.closest(r);
    if (g && Ve(e, g)) {
      const F = Ms(g, t);
      if (!F) return;
      if (p.stopPropagation(), !F.menu.classList.contains(i)) {
        lt(F.menu, t);
        return;
      }
      c.closeAll(), F.menu.classList.remove(i), F.trigger.setAttribute("aria-expanded", "true"), t.portal && Is(F, e), a && a({
        ...F,
        opening: !0
      }), nr(vn(F.menu, n)[0]);
      return;
    }
    const y = m.closest(n), w = y?.closest(s) ?? null, x = w ? ie.get(w) : void 0, E = !!(w && (Ve(e, w) || x?.root === e));
    if (y && E) {
      if (Fs(y)) {
        p.preventDefault(), p.stopPropagation();
        return;
      }
      lt(w, t);
      return;
    }
    const L = t.outsideIgnoreSelector;
    if (L && m.closest(L)) return;
    const q = m.closest(s), N = q ? ie.get(q) : void 0;
    q && (Ve(e, q) || N?.root === e) || c.closeAll();
  }, f = (p) => {
    const m = qs(e, s, i);
    if (!m) return;
    const g = vn(m, n), y = o.activeElement, w = y ? g.indexOf(y) : -1;
    if (p.key === "Escape") {
      const E = ie.get(m)?.trigger ?? m.closest(t.containerSelector || Kr)?.querySelector(r) ?? null;
      p.preventDefault(), p.stopPropagation(), lt(m, t), E?.isConnected && nr(E);
      return;
    }
    let x = null;
    p.key === "ArrowDown" ? x = w < 0 ? 0 : (w + 1) % g.length : p.key === "ArrowUp" ? x = w < 0 ? g.length - 1 : (w - 1 + g.length) % g.length : p.key === "Home" ? x = 0 : p.key === "End" && (x = g.length - 1), x !== null && g.length > 0 && (p.preventDefault(), p.stopPropagation(), nr(g[x]));
  };
  o.addEventListener("click", d), o.addEventListener("keydown", f), l.push(() => o.removeEventListener("click", d)), l.push(() => o.removeEventListener("keydown", f));
  const h = o.defaultView;
  if (h && (t.portal || a)) {
    const p = () => c.closeAll(), m = (g) => {
      const y = g.target;
      if (y && typeof y.closest == "function") {
        const w = y.closest(s), x = w ? ie.get(w) : void 0;
        if (w && (Ve(e, w) || x?.root === e)) return;
      }
      c.closeAll();
    };
    h.addEventListener("pagehide", p), h.addEventListener("pageshow", p), h.addEventListener("resize", p), h.visualViewport?.addEventListener("resize", p), h.visualViewport?.addEventListener("scroll", p), o.addEventListener("scroll", m, !0), l.push(() => h.removeEventListener("pagehide", p)), l.push(() => h.removeEventListener("pageshow", p)), l.push(() => h.removeEventListener("resize", p)), l.push(() => h.visualViewport?.removeEventListener("resize", p)), l.push(() => h.visualViewport?.removeEventListener("scroll", p)), l.push(() => o.removeEventListener("scroll", m, !0));
  }
  if (t.signal) {
    const p = () => c.destroy();
    t.signal.addEventListener("abort", p, { once: !0 }), l.push(() => t.signal?.removeEventListener("abort", p));
  }
  return c;
}
var ei = { async prompt(e) {
  const { PayloadInputModal: t } = await import("./chunks/payload-modal-BQVD82TP.js");
  return t.prompt(e);
} }, ir = M("DataGrid"), zs = 0, Gs = class {
  constructor(e = {}) {
    this.actionBasePath = e.actionBasePath || "", this.mode = e.mode || "dropdown", this.notifier = e.notifier || new Qe();
    const t = this.sanitize(e.domIdPrefix || "grid") || "grid";
    this.domNamespace = `${t}-${++zs}`, this.rowRenderSeq = 0;
  }
  renderRowActions(e, t) {
    const r = `${this.domNamespace}-row-${++this.rowRenderSeq}`;
    if (this.mode === "dropdown") return this.renderRowActionsDropdown(e, t, r);
    const n = this.getVisibleActions(e, t);
    return n.length === 0 ? '<div class="admin-datagrid__action-list flex justify-end gap-2"></div>' : `<div class="admin-datagrid__action-list flex justify-end gap-2">${n.map(({ action: i, sourceIndex: s }) => {
      const a = this.getVariantClass(i.variant || "secondary"), o = i.icon ? this.renderIcon(i.icon) : "", l = i.className || "", c = i.disabled === !0, d = this.getActionKey(i, s), f = c ? "opacity-50 cursor-not-allowed" : "", h = c ? 'aria-disabled="true"' : "", p = c && i.disabledReason ? `${r}-${d}-disabled-reason` : "", m = p ? `aria-describedby="${v(p)}"` : "", g = c && i.disabledReason ? `${i.label} unavailable: ${i.disabledReason}` : i.label, y = p ? `<span id="${v(p)}" class="sr-only">${u(i.disabledReason || "Action unavailable")}</span>` : "", w = i.disabledReason ? `title="${v(i.disabledReason)}"` : "";
      return `
        <button
          type="button"
          class="admin-datagrid__action btn btn-sm ${v(a)} ${v(l)} ${f}"
          data-action-id="${v(this.sanitize(i.label))}"
          data-action-key="${v(d)}"
          data-record-id="${v(e.id)}"
          data-disabled="${c}"
          ${h}
          aria-label="${v(g)}"
          ${m}
          ${w}
        >
          ${o}
          ${u(i.label)}
        </button>
        ${y}
      `;
    }).join("")}</div>`;
  }
  renderRowActionsDropdown(e, t, r) {
    const n = this.getVisibleActions(e, t);
    if (n.length === 0) return '<div class="admin-datagrid__actions-empty text-sm text-gray-400">No actions</div>';
    const i = `${r}-menu`, s = this.buildDropdownItems(e, n, r);
    return `
      <div class="action-menu action-menu--right actions-dropdown" data-action-menu data-dropdown>
        <button type="button"
                class="action-menu__trigger actions-menu-trigger"
                data-action-menu-trigger
                data-dropdown-trigger
                aria-label="Actions menu"
                aria-haspopup="true"
                aria-expanded="false"
                aria-controls="${v(i)}">
          ${this.renderDotsIcon()}
        </button>

        <div id="${v(i)}"
             class="action-menu__content actions-menu hidden"
             data-action-menu-content
             data-position="right"
             role="menu"
             aria-orientation="vertical">
          ${s}
        </div>
      </div>
    `;
  }
  buildDropdownItems(e, t, r) {
    return t.map(({ action: n, sourceIndex: i }, s) => {
      const a = n.variant === "danger", o = n.disabled === !0, l = this.getActionKey(n, i), c = n.icon ? this.renderIcon(n.icon) : "", d = this.shouldShowDivider(n, s), f = o ? (n.disabledReason || "Action unavailable").trim() : "", h = f ? `${r}-${l}-disabled-reason` : "", p = d ? '<div class="action-menu__divider action-divider" role="separator"></div>' : "", m = o ? "action-menu__item action-item action-item--disabled" : a ? "action-menu__item action-menu__item--danger action-item action-item--danger" : "action-menu__item action-item", g = o ? 'aria-disabled="true"' : "", y = h ? `aria-describedby="${v(h)}"` : "", w = f ? `${n.label} unavailable: ${f}` : n.label, x = n.disabledReason ? `title="${v(n.disabledReason)}"` : "", E = f ? `<span id="${v(h)}" class="action-item-reason">${u(f)}</span>` : "";
      return `
        ${p}
        <button type="button"
                class="${v(m)}"
                data-action-id="${v(this.sanitize(n.label))}"
                data-action-menu-item
                data-action-key="${v(l)}"
                data-record-id="${v(e.id)}"
                data-disabled="${o}"
                role="menuitem"
                ${g}
                aria-label="${v(w)}"
                ${y}
                ${x}>
          <span class="action-item__icon">${c}</span>
          <span class="action-item__content">
            <span class="action-item__label">${u(n.label)}</span>
            ${E}
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
    t.forEach((i, s) => {
      const a = this.getActionKey(i, s), o = e.querySelector(`[data-action-key="${a}"]`);
      o && o.addEventListener("click", async (l) => {
        if (l.preventDefault(), o.getAttribute("aria-disabled") === "true" || o.dataset.disabled === "true") return;
        const c = o.closest("[data-action-menu-content]");
        c && lt(c);
        try {
          await i.action(r);
        } catch (d) {
          if (ir.error(`Action "${i.label}" failed:`, d), n.onError) {
            await n.onError(d, i, r);
            return;
          }
          const f = d instanceof Error ? d.message : `Action "${i.label}" failed`;
          this.notifier.error(f);
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
    n.className = "flex gap-2 flex-1", e.forEach((s) => {
      const a = document.createElement("button");
      a.type = "button", a.className = "btn btn-sm btn-primary", a.dataset.bulkAction = s.id, s.icon ? a.innerHTML = `${this.renderIcon(s.icon)} ${s.label}` : a.textContent = s.label, n.appendChild(a);
    }), t.appendChild(n);
    const i = document.createElement("button");
    return i.type = "button", i.className = "btn btn-sm btn-secondary", i.id = "clear-selection-btn", i.textContent = "Clear Selection", t.appendChild(i), t;
  }
  async executeBulkAction(e, t) {
    if (e.guard && !e.guard(t)) {
      ir.warn(`Bulk action "${e.id}" guard failed`);
      return;
    }
    if (e.confirm) {
      const n = e.confirm.replace("{count}", t.length.toString());
      if (!await this.notifier.confirm(n)) return;
    }
    const r = await this.resolveBulkActionPayload(e, t);
    if (r !== null)
      try {
        const n = await Wn(e.endpoint, {
          method: e.method || "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json"
          },
          body: JSON.stringify(r)
        }, async (s) => {
          const a = await Yn(s, void 0);
          return {
            success: !0,
            data: a === void 0 ? void 0 : a
          };
        });
        if (!n.success) {
          const s = n.error, a = s ? We(s, `Bulk action '${e.id}' failed`) : `Bulk action '${e.id}' failed`;
          throw e.onError || this.notifier.error(a), s ? Ft(s, `Bulk action '${e.id}' failed`, !0) : Ft({
            textCode: null,
            message: a,
            metadata: null,
            fields: null,
            validationErrors: null
          }, `Bulk action '${e.id}' failed`, !0);
        }
        const i = n.data;
        this.notifier.success(this.buildBulkSuccessMessage(e, i, t.length)), e.onSuccess && e.onSuccess(i);
      } catch (n) {
        if (ir.error(`Bulk action "${e.id}" failed:`, n), !e.onError && !Be(n)) {
          const i = n instanceof Error ? n.message : "Bulk action failed";
          this.notifier.error(i);
        }
        throw e.onError && e.onError(n), n;
      }
  }
  async resolveBulkActionPayload(e, t) {
    const r = {
      ...e.payload || {},
      ids: t
    }, n = this.normalizePayloadSchema(e.payloadSchema);
    n?.properties && Object.entries(n.properties).forEach(([a, o]) => {
      r[a] === void 0 && o && o.default !== void 0 && (r[a] = o.default);
    });
    const i = this.collectRequiredFields(e.payloadRequired, n).filter((a) => a !== "ids" && this.isEmptyPayloadValue(r[a]));
    if (i.length === 0) return r;
    const s = await this.requestRequiredFields(e, i, n, r);
    if (s === null) return null;
    for (const a of i) {
      const o = n?.properties?.[a], l = s[a] ?? "", c = this.coercePromptValue(l, a, o);
      if (c.error)
        return this.notifier.error(c.error), null;
      r[a] = c.value;
    }
    return r;
  }
  collectRequiredFields(e, t) {
    const r = [], n = /* @__PURE__ */ new Set(), i = (s) => {
      const a = s.trim();
      !a || n.has(a) || (n.add(a), r.push(a));
    };
    return Array.isArray(e) && e.forEach((s) => i(String(s))), Array.isArray(t?.required) && t.required.forEach((s) => i(String(s))), r;
  }
  normalizePayloadSchema(e) {
    if (!e || typeof e != "object") return null;
    const t = e.properties;
    let r;
    return t && typeof t == "object" && (r = {}, Object.entries(t).forEach(([n, i]) => {
      i && typeof i == "object" && (r[n] = i);
    })), {
      type: typeof e.type == "string" ? e.type : void 0,
      required: e.required,
      properties: r
    };
  }
  async requestRequiredFields(e, t, r, n) {
    const i = t.map((s) => {
      const a = r?.properties?.[s], o = typeof a?.type == "string" ? a.type.toLowerCase() : "string";
      return {
        name: s,
        label: (a?.title || s).trim(),
        description: (a?.description || "").trim() || void 0,
        value: this.stringifyPromptDefault(n[s] !== void 0 ? n[s] : a?.default),
        type: o,
        options: this.buildSchemaOptions(a)
      };
    });
    return ei.prompt({
      title: `Complete ${e.label || e.id}`,
      fields: i
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
      const s = r.oneOf.find((a) => a && Object.prototype.hasOwnProperty.call(a, "const") && this.stringifyPromptDefault(a.const) === e);
      return !s || !Object.prototype.hasOwnProperty.call(s, "const") ? {
        value: e,
        error: `${t} must be one of: ${r.oneOf.map((a) => typeof a?.title == "string" && a.title.trim() ? a.title.trim() : this.stringifyPromptDefault(a.const)).filter((a) => a !== "").join(", ")}`
      } : { value: s.const };
    }
    const n = (r?.type || "string").toLowerCase();
    if (e === "") return { value: "" };
    let i = e;
    switch (n) {
      case "integer": {
        const s = Number.parseInt(e, 10);
        if (Number.isNaN(s)) return {
          value: e,
          error: `${t} must be an integer.`
        };
        i = s;
        break;
      }
      case "number": {
        const s = Number.parseFloat(e);
        if (Number.isNaN(s)) return {
          value: e,
          error: `${t} must be a number.`
        };
        i = s;
        break;
      }
      case "boolean": {
        const s = e.toLowerCase();
        if ([
          "true",
          "1",
          "yes",
          "y",
          "on"
        ].includes(s)) {
          i = !0;
          break;
        }
        if ([
          "false",
          "0",
          "no",
          "n",
          "off"
        ].includes(s)) {
          i = !1;
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
          const s = JSON.parse(e);
          if (n === "array" && !Array.isArray(s)) return {
            value: e,
            error: `${t} must be a JSON array.`
          };
          if (n === "object" && (s === null || Array.isArray(s) || typeof s != "object")) return {
            value: e,
            error: `${t} must be a JSON object.`
          };
          i = s;
        } catch {
          return {
            value: e,
            error: `${t} must be valid JSON.`
          };
        }
        break;
      default:
        i = e;
    }
    return Array.isArray(r?.enum) && r.enum.length > 0 && !r.enum.some((s) => s === i || String(s) === String(i)) ? {
      value: i,
      error: `${t} must be one of: ${r.enum.map((s) => String(s)).join(", ")}`
    } : { value: i };
  }
  isEmptyPayloadValue(e) {
    return e == null ? !0 : typeof e == "string" ? e.trim() === "" : Array.isArray(e) ? e.length === 0 : typeof e == "object" ? Object.keys(e).length === 0 : !1;
  }
  buildBulkSuccessMessage(e, t, r) {
    const n = e.label || e.id || "Bulk action", i = t && typeof t == "object" ? t.summary : null, s = i && typeof i.succeeded == "number" ? i.succeeded : typeof t?.processed == "number" ? t.processed : r, a = i && typeof i.failed == "number" ? i.failed : 0;
    return a > 0 ? `${n} completed: ${s} succeeded, ${a} failed.` : `${n} completed for ${s} item${s === 1 ? "" : "s"}.`;
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
}, Wr = {
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
  suspended: {
    tone: "warning",
    label: "Suspended",
    icon: "pause"
  },
  deprecated: {
    tone: "error",
    label: "Deprecated",
    icon: "warning-triangle"
  },
  breaking: {
    tone: "error",
    label: "Breaking",
    icon: "warning-triangle"
  },
  migrating: {
    tone: "info",
    label: "Migrating",
    icon: "arrow-right"
  },
  migrated: {
    tone: "success",
    label: "Migrated",
    icon: "check"
  },
  required: {
    tone: "warning",
    label: "Required",
    icon: "warning-circle"
  },
  readonly: {
    tone: "neutral",
    label: "Read Only",
    icon: "lock"
  },
  hidden: {
    tone: "neutral",
    label: "Hidden",
    icon: "eye-closed"
  },
  unknown: {
    tone: "neutral",
    label: "Unknown",
    icon: "help-circle"
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
}, Pu = Object.fromEntries(Object.entries(Wr).map(([e, t]) => [e, t.tone])), Us = {
  healthy: "success",
  ok: "success",
  warning: "warning",
  critical: "error",
  error: "error",
  info: "info",
  neutral: "neutral"
};
function Xr(e) {
  return e?.toLowerCase().trim().replace(/-/g, "_") || "";
}
function Hs(e) {
  return Wr[Xr(e)] ?? null;
}
function ti(e, t = "translation") {
  const r = Xr(e);
  return t === "alert" ? Us[r] || "neutral" : Wr[r]?.tone || "neutral";
}
function ri(e) {
  return Xr(e).split("_").filter(Boolean).map((t) => t.charAt(0).toUpperCase() + t.slice(1)).join(" ");
}
function Vs(e, t = "badge") {
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
function Ks(e, t, r) {
  const n = t.toLowerCase();
  if (e === "status") {
    const o = [
      "status-chip",
      `status-chip--${ti(n)}`,
      "status-badge"
    ];
    return r === "sm" && o.push("status-chip--sm", "status-badge--sm"), o.push(`status-${n}`), o.join(" ");
  }
  const i = e === "role" ? "role-badge" : "badge", s = e === "role" ? "role" : "badge", a = [i];
  return r === "sm" && a.push(`${i}--sm`), a.push(`${s}-${n}`), a.join(" ");
}
function qt(e, t, r, n) {
  const i = [Ks(t, r, n?.size)];
  n?.uppercase && i.push("badge--uppercase"), n?.extraClass && i.push(n.extraClass);
  let s = "";
  n?.attrs && (s = Object.entries(n.attrs).map(([o, l]) => l === "" ? ` ${o}` : ` ${o}="${v(l)}"`).join(""));
  const a = t === "status" ? ` data-tone="${ti(r)}"` : "";
  return `<span class="${i.join(" ")}"${a}${s}>${u(e)}</span>`;
}
var Js = '<svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path fill-rule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clip-rule="evenodd"/></svg>', Ys = '<svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path fill-rule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm-1.72 6.97a.75.75 0 1 0-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 1 0 1.06 1.06L12 13.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L13.06 12l1.72-1.72a.75.75 0 1 0-1.06-1.06L12 10.94l-1.72-1.72Z" clip-rule="evenodd"/></svg>';
function Ws(e, t) {
  const r = e ? t?.trueLabel ?? "Yes" : t?.falseLabel ?? "No";
  return `<span class="badge badge-${e ? "boolean-true" : "boolean-false"}">${e ? Js : Ys}${u(r)}</span>`;
}
function sr(e) {
  return typeof e == "string" ? e.trim() : "";
}
function se(e) {
  return (typeof e == "string" ? e.trim() : "") || void 0;
}
function de(e) {
  return !!e && typeof e == "object" && !Array.isArray(e);
}
function Xs(e) {
  if (!e || typeof e != "object" || Array.isArray(e)) return null;
  const t = e, r = se(t.label), n = se(t.href), i = se(t.kind);
  return !r && !n && !i ? null : {
    ...r ? { label: r } : {},
    ...n ? { href: n } : {},
    ...i ? { kind: i } : {}
  };
}
function Qs(e) {
  if (!Array.isArray(e)) return;
  const t = e.map((r) => se(r)).filter((r) => !!r);
  return t.length > 0 ? t : void 0;
}
function Zs(e) {
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
function ea(e) {
  if (typeof e != "number" || !Number.isFinite(e)) return;
  const t = Math.trunc(e);
  return t > 0 ? t : void 0;
}
function ni(e, t = 0) {
  return !e || t > 2 ? "" : sr(e.reason_code) || sr(e.textCode) || sr(e.text_code) || ni(e.error ?? void 0, t + 1);
}
function Qr(e) {
  if (typeof e == "string") return e.trim().toUpperCase() || null;
  if (!e || typeof e != "object" || Array.isArray(e)) return null;
  const t = ni(e);
  return t ? t.toUpperCase() : null;
}
function ta(e) {
  if (!e || typeof e != "object" || Array.isArray(e)) return null;
  const t = e;
  if (!Zs(t)) return null;
  const r = Qr({ reason_code: t.reason_code }), n = { enabled: typeof t.enabled == "boolean" ? t.enabled : !1 }, i = se(t.reason), s = se(t.severity), a = se(t.kind), o = se(t.permission), l = t.metadata && typeof t.metadata == "object" && !Array.isArray(t.metadata) ? t.metadata : null, c = Xs(t.remediation), d = Qs(t.available_transitions);
  return i && (n.reason = i), r && (n.reason_code = r), s && (n.severity = s), a && (n.kind = a), o && (n.permission = o), l && (n.metadata = l), c && (n.remediation = c), d && (n.available_transitions = d), n;
}
function Zr(e) {
  if (!de(e)) return {};
  const t = e, r = {};
  for (const [n, i] of Object.entries(t)) {
    const s = se(n), a = ta(i);
    !s || !a || (r[s] = a);
  }
  return r;
}
function Kt(e) {
  return Zr(e);
}
function en(e) {
  if (!de(e)) return null;
  const t = e.selection_sensitive === !0, r = se(e.selection_state_endpoint), n = ea(e.debounce_ms);
  if (!t && !r && n === void 0) return null;
  const i = {};
  return t && (i.selection_sensitive = !0), r && (i.selection_state_endpoint = r), n !== void 0 && (i.debounce_ms = n), i;
}
function ii(e) {
  if (!de(e)) return null;
  const t = Zr(e._action_state);
  return Object.keys(t).length === 0 ? { ...e } : {
    ...e,
    _action_state: t
  };
}
function ra(e) {
  if (!de(e)) return null;
  const t = Kt(e.bulk_action_state);
  return Object.keys(t).length === 0 ? { ...e } : {
    ...e,
    bulk_action_state: t
  };
}
function na(e) {
  if (!de(e)) return null;
  const t = Kt(e.bulk_action_state);
  if (Object.keys(t).length === 0) return null;
  const r = { bulk_action_state: t };
  return de(e.selection) && (r.selection = e.selection), r;
}
function ia(e) {
  if (!de(e)) return null;
  const t = Array.isArray(e.data) ? e.data : Array.isArray(e.records) ? e.records : null, r = t && t.map((s) => ii(s) ?? s), n = ra(e.$meta), i = { ...e };
  if (r && (Array.isArray(e.data) && (i.data = r), Array.isArray(e.records) && (i.records = r)), n && (i.$meta = n), de(e.schema)) {
    const s = en(e.schema.bulk_action_state_config);
    s && (i.schema = {
      ...e.schema,
      bulk_action_state_config: s
    });
  }
  return i;
}
function si(e) {
  return de(e) ? de(e.data) ? {
    ...e,
    data: ii(e.data)
  } : { ...e } : null;
}
function ai(e, t) {
  const r = se(t);
  return r && Zr(e._action_state)[r] || null;
}
var sa = M("DataGrid"), oe = {
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
}, aa = {
  neutral: "bg-gray-100",
  info: "bg-sky-50",
  success: "bg-emerald-50",
  warning: "bg-amber-50",
  error: "bg-rose-50"
}, oa = {
  neutral: "text-gray-700",
  info: "text-sky-700",
  success: "text-emerald-700",
  warning: "text-amber-700",
  error: "text-rose-700"
}, la = {
  neutral: "border-gray-200",
  info: "border-sky-200",
  success: "border-emerald-200",
  warning: "border-amber-200",
  error: "border-rose-200"
};
function _(e, t = {}) {
  const r = Hs(e), n = r?.tone ?? "neutral";
  return {
    label: r?.label ?? ri(e),
    shortLabel: t.shortLabel,
    colorClass: Vs(n, "badge"),
    bgClass: aa[n],
    textClass: oa[n],
    borderClass: la[n],
    icon: r?.icon ?? "help-circle",
    iconType: "iconoir",
    severity: n,
    description: t.description
  };
}
var Ar = {
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
}, $r = {
  open: _("open", { description: "Available to be claimed" }),
  pending: _("pending", { description: "Waiting to be assigned" }),
  assigned: _("assigned", { description: "Assigned to a translator" }),
  in_progress: _("in_progress", { description: "Translation in progress" }),
  review: _("review", { description: "Pending review" }),
  rejected: _("rejected", { description: "Translation rejected" }),
  approved: _("approved", { description: "Translation approved" }),
  published: _("published", { description: "Translation published" }),
  archived: _("archived", { description: "Translation archived" })
}, kr = {
  draft: _("draft", { description: "Draft content" }),
  review: _("review", { description: "Content under review" }),
  ready: _("ready", { description: "Content ready" }),
  archived: _("archived", { description: "Content archived" })
}, _r = {
  overdue: _("overdue", { description: "Past due date" }),
  due_soon: _("due_soon", { description: "Due within 24 hours" }),
  on_track: _("on_track", { description: "On schedule" }),
  none: _("none", { description: "No due date set" })
}, Lr = {
  success: _("success", { description: "Import/export succeeded" }),
  error: _("error", { description: "Import/export failed" }),
  conflict: _("conflict", { description: "Conflicting changes detected" }),
  skipped: _("skipped", { description: "Row skipped" })
}, Dr = {
  running: _("running", { description: "Job in progress" }),
  completed: _("completed", { description: "Job completed successfully" }),
  failed: _("failed", { description: "Job failed" })
}, pt = {
  TRANSLATION_MISSING: {
    message: "Required translation is missing",
    shortMessage: "Translation missing",
    colorClass: "bg-amber-100 text-amber-700",
    bgClass: "bg-amber-50",
    textClass: "text-amber-700",
    icon: oe.warning,
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
    icon: oe.ban,
    severity: "info",
    actionable: !1
  },
  PERMISSION_DENIED: {
    message: "You do not have permission for this action",
    shortMessage: "No permission",
    colorClass: "bg-red-100 text-red-700",
    bgClass: "bg-red-50",
    textClass: "text-red-700",
    icon: oe.lock,
    severity: "error",
    actionable: !1
  },
  MISSING_CONTEXT: {
    message: "Required context is missing",
    shortMessage: "Missing context",
    colorClass: "bg-gray-100 text-gray-600",
    bgClass: "bg-gray-50",
    textClass: "text-gray-600",
    icon: oe.info,
    severity: "info",
    actionable: !1
  },
  FEATURE_DISABLED: {
    message: "This feature is currently disabled",
    shortMessage: "Feature disabled",
    colorClass: "bg-gray-100 text-gray-500",
    bgClass: "bg-gray-50",
    textClass: "text-gray-500",
    icon: oe.ban,
    severity: "info",
    actionable: !1
  },
  RESOURCE_IN_USE: {
    message: "This resource is currently in use",
    shortMessage: "Resource in use",
    colorClass: "bg-amber-100 text-amber-800",
    bgClass: "bg-amber-50",
    textClass: "text-amber-800",
    icon: oe.warning,
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
    icon: oe.warning,
    severity: "warning",
    actionable: !1
  },
  INVALID_SELECTION: {
    message: "The current selection is not valid for this action",
    shortMessage: "Invalid selection",
    colorClass: "bg-gray-100 text-gray-700",
    bgClass: "bg-gray-50",
    textClass: "text-gray-700",
    icon: oe.info,
    severity: "info",
    actionable: !1
  },
  RATE_LIMITED: {
    message: "Too many requests. Please try again shortly",
    shortMessage: "Rate limited",
    colorClass: "bg-orange-100 text-orange-800",
    bgClass: "bg-orange-50",
    textClass: "text-orange-800",
    icon: oe.clock,
    severity: "warning",
    actionable: !1
  },
  TEMPORARILY_UNAVAILABLE: {
    message: "This action is temporarily unavailable",
    shortMessage: "Temporarily unavailable",
    colorClass: "bg-gray-100 text-gray-700",
    bgClass: "bg-gray-50",
    textClass: "text-gray-700",
    icon: oe.ban,
    severity: "info",
    actionable: !1
  }
};
function je(e, t) {
  const r = e.toLowerCase();
  if ((!t || t === "core") && r in Ar)
    return Ar[r];
  if (!t || t === "queue") {
    if (r in $r) return $r[r];
    if (r in kr) return kr[r];
    if (r in _r) return _r[r];
  }
  if (!t || t === "exchange") {
    if (r in Lr) return Lr[r];
    if (r in Dr) return Dr[r];
  }
  return null;
}
function tn(e) {
  const t = Qr(e);
  return t && t in pt ? pt[t] : null;
}
function oi(e) {
  const t = Qr(e);
  return t && t in pt ? pt[t] : null;
}
function Mu(e, t) {
  return je(e, t) !== null;
}
function Iu(e) {
  return tn(e) !== null;
}
function Bu(e) {
  switch (e) {
    case "core":
      return Object.keys(Ar);
    case "queue":
      return [
        ...Object.keys($r),
        ...Object.keys(kr),
        ...Object.keys(_r)
      ];
    case "exchange":
      return [...Object.keys(Lr), ...Object.keys(Dr)];
    default:
      return [];
  }
}
function Ou() {
  return Object.keys(pt);
}
function li(e, t) {
  return je(e, t) ? `status-${e.toLowerCase()}` : "";
}
function Fu(e, t) {
  const r = je(e, t);
  return r ? `severity-${r.severity}` : "";
}
function ze(e, t = {}) {
  const r = je(e, t.domain);
  if (!r) return `<span class="status-chip status-chip--neutral" data-status="${u(e)}" data-tone="neutral">${u(ri(e) || e)}</span>`;
  const { size: n = "default", showIcon: i = !0, showLabel: s = !0, extraClass: a = "" } = t, o = {
    xs: "px-1.5 py-0.5 text-[10px]",
    sm: "px-2 py-0.5",
    default: ""
  }, l = i ? ci(r, n) : "", c = s ? `<span>${u(r.label)}</span>` : "";
  return `<span class="status-chip status-chip--${r.severity} ${o[n]} ${a}"
                title="${u(r.description || r.label)}"
                aria-label="${u(r.label)}"
                data-status="${u(e)}"
                data-tone="${r.severity}">
    ${l}${c}
  </span>`;
}
function ci(e, t = "default") {
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
function di(e, t = {}) {
  const r = tn(e);
  if (!r) return `<span class="text-gray-500 text-xs">${u(e)}</span>`;
  const { size: n = "default", showIcon: i = !0, showFullMessage: s = !1, extraClass: a = "" } = t, o = {
    sm: "px-2 py-0.5 text-xs",
    default: "px-2.5 py-1 text-sm"
  }, l = i ? `<svg class="${n === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"}" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
        <path fill-rule="evenodd" d="${r.icon}" clip-rule="evenodd"/>
      </svg>` : "", c = s ? r.message : r.shortMessage;
  return `<span class="inline-flex items-center gap-1.5 rounded ${o[n]} ${r.colorClass} ${a}"
                role="status"
                aria-label="${u(r.message)}"
                data-reason-code="${u(e)}">
    ${l}
    <span>${u(c)}</span>
  </span>`;
}
function qu(e, t) {
  const r = tn(e);
  if (!r) return "";
  const n = t || r.message;
  return `<span class="inline-flex items-center justify-center w-5 h-5 rounded-full ${r.bgClass} ${r.textClass}"
                title="${u(n)}"
                aria-label="${u(r.shortMessage)}"
                data-reason-code="${u(e)}">
    <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
      <path fill-rule="evenodd" d="${r.icon}" clip-rule="evenodd"/>
    </svg>
  </span>`;
}
function Nu(e = {}) {
  return (t) => typeof t != "string" || !t ? '<span class="text-gray-400">-</span>' : ze(t, e);
}
function ju(e = {}) {
  return (t) => typeof t != "string" || !t ? "" : di(t, e);
}
function zu(e) {
  e.schema_version !== 1 && sa.warn("[TranslationStatusVocabulary] Unknown schema version:", e.schema_version);
}
function Gu() {
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
function be(e) {
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
  return !e || typeof e != "object" || (t.requestedLocale = Pe(e, ["requested_locale"]), t.resolvedLocale = Pe(e, ["resolved_locale", "locale"]), t.availableLocales = ga(e, ["available_locales"]), t.missingRequestedLocale = xn(e, ["missing_requested_locale"]), t.fallbackUsed = xn(e, ["fallback_used"]), t.familyId = Pe(e, ["family_id"]), t.status = Pe(e, ["status"]), t.entityType = Pe(e, [
    "entity_type",
    "type",
    "_type"
  ]), t.recordId = Pe(e, ["id"]), !t.fallbackUsed && t.requestedLocale && t.resolvedLocale && (t.fallbackUsed = t.requestedLocale !== t.resolvedLocale), !t.missingRequestedLocale && t.fallbackUsed && (t.missingRequestedLocale = !0)), t;
}
function Uu(e) {
  const t = be(e);
  return t.fallbackUsed || t.missingRequestedLocale;
}
function Hu(e) {
  const t = be(e);
  return t.familyId !== null || t.resolvedLocale !== null || t.availableLocales.length > 0;
}
function pe(e, t = {}, r = "neutral") {
  const n = e.trim();
  if (!n) return "";
  const { size: i = "sm", extraClass: s = "" } = t;
  return `<span class="inline-flex items-center rounded-full border font-medium ${i === "sm" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-1"} ${r === "info" ? "bg-blue-50 text-blue-700 border-blue-200" : r === "warning" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-slate-100 text-slate-700 border-slate-200"} ${s}">${u(n)}</span>`;
}
function ui(e, t) {
  if (!e || typeof e != "object" || Array.isArray(e)) return null;
  const r = e, n = r[t];
  return n && typeof n == "object" && !Array.isArray(n) ? n : r;
}
function Ke(e, t) {
  for (const r of t) {
    const n = e[r];
    if (typeof n == "string" && n.trim()) return n.trim();
  }
  return "";
}
function Tr(e, t) {
  for (const r of t) {
    const n = e[r];
    if (typeof n == "number" && Number.isFinite(n)) return Math.trunc(n);
    if (typeof n == "string" && n.trim()) {
      const i = Number(n);
      if (Number.isFinite(i)) return Math.trunc(i);
    }
  }
  return null;
}
function fi(e) {
  const t = typeof e.family_member_count == "number" ? Math.trunc(e.family_member_count) : Number(e.family_member_count);
  if (Number.isFinite(t) && t > 0) return Math.trunc(t);
  const r = ee(e);
  if (r.availableLocales.length > 0) return r.availableLocales.length;
  const n = be(e);
  return n.availableLocales.length > 0 ? n.availableLocales.length : n.resolvedLocale ? 1 : null;
}
function Vu(e, t = {}) {
  const r = typeof e.translation_family_url == "string" ? e.translation_family_url.trim() : "";
  if (!r) return '<span class="text-gray-400">-</span>';
  const n = fi(e), i = n && n > 0 ? pe(`${n} ${n === 1 ? "locale" : "locales"}`, t, "info") : "";
  return `
    <div class="inline-flex items-center gap-2">
      <a href="${v(r)}" class="text-sm font-medium text-blue-700 hover:text-blue-800 hover:underline">View family</a>
      ${i}
    </div>
  `.trim();
}
function Ku(e, t = {}) {
  const r = fi(e);
  return !r || r <= 0 ? '<span class="text-gray-400">-</span>' : pe(`${r} ${r === 1 ? "locale" : "locales"}`, t, "info");
}
function Ju(e, t = {}) {
  const r = ui(e, "translation_assignment_summary");
  if (!r) return '<span class="text-gray-400">-</span>';
  const n = Ke(r, ["status"]), i = Ke(r, ["label"]), s = Ke(r, ["assignee_id"]), a = Ke(r, ["priority"]), o = Tr(r, ["active_count", "open_count"]), l = [];
  return n ? l.push(ze(n, {
    domain: "queue",
    size: "sm",
    showIcon: !1
  })) : i && l.push(pe(i, t, "info")), o !== null && o >= 0 && l.push(pe(`${o} active`, t, "neutral")), s && l.push(pe(`@${s}`, t, "neutral")), a && l.push(pe(a, t, a === "urgent" || a === "high" ? "warning" : "neutral")), l.length === 0 ? '<span class="text-gray-400">-</span>' : `<div class="inline-flex items-center gap-1.5 flex-wrap">${l.join("")}</div>`;
}
function Yu(e, t = {}) {
  const r = ui(e, "translation_exchange_summary");
  if (!r) return '<span class="text-gray-400">-</span>';
  const n = Ke(r, ["status", "last_job_status"]), i = Ke(r, ["label", "last_job_label"]), s = Tr(r, ["pending_count"]), a = Tr(r, ["error_count"]), o = [];
  return n ? o.push(ze(n, {
    domain: "exchange",
    size: "sm",
    showIcon: !1
  })) : i && o.push(pe(i, t, "info")), s !== null && s >= 0 && o.push(pe(`${s} pending`, t, "neutral")), a !== null && a > 0 && o.push(pe(`${a} errors`, t, "warning")), o.length === 0 ? '<span class="text-gray-400">-</span>' : `<div class="inline-flex items-center gap-1.5 flex-wrap">${o.join("")}</div>`;
}
function ee(e) {
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
    t.hasReadinessMetadata = !0, t.familyId = Pe(e, ["translation_readiness.family_id", "family_id"]), t.requiredLocales = Array.isArray(r.required_locales) ? r.required_locales.filter((a) => typeof a == "string") : [], t.availableLocales = Array.isArray(r.available_locales) ? r.available_locales.filter((a) => typeof a == "string") : [], t.missingRequiredLocales = Array.isArray(r.missing_required_locales) ? r.missing_required_locales.filter((a) => typeof a == "string") : [];
    const n = r.missing_required_fields_by_locale;
    if (n && typeof n == "object" && !Array.isArray(n))
      for (const [a, o] of Object.entries(n)) Array.isArray(o) && (t.missingRequiredFieldsByLocale[a] = o.filter((l) => typeof l == "string"));
    const i = r.readiness_state;
    typeof i == "string" && ca(i) && (t.readinessState = i);
    const s = r.ready_for_transition;
    if (s && typeof s == "object" && !Array.isArray(s))
      for (const [a, o] of Object.entries(s)) typeof o == "boolean" && (t.readyForTransition[a] = o);
    t.evaluatedChannel = typeof r.evaluated_channel == "string" ? r.evaluated_channel : null;
  }
  return t;
}
function Wu(e) {
  return ee(e).hasReadinessMetadata;
}
function Xu(e, t) {
  return ee(e).readyForTransition[t] === !0;
}
function ca(e) {
  return [
    "ready",
    "missing_locales",
    "missing_fields",
    "missing_locales_and_fields"
  ].includes(e);
}
function hi(e, t = {}) {
  const r = "resolvedLocale" in e ? e : be(e), { showFallbackIndicator: n = !0, size: i = "default", extraClass: s = "" } = t;
  if (!r.resolvedLocale) return "";
  const a = r.resolvedLocale.toUpperCase(), o = r.fallbackUsed || r.missingRequestedLocale, l = `inline-flex items-center gap-1 rounded font-medium ${i === "sm" ? "text-xs px-1.5 py-0.5" : "text-xs px-2 py-1"}`;
  return o && n ? `<span class="${l} bg-amber-100 text-amber-800 ${s}"
                  title="Showing ${r.resolvedLocale} content (${r.requestedLocale || "requested locale"} not available)"
                  aria-label="Fallback locale: ${a}">
      <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
      </svg>
      ${a}
    </span>` : `<span class="${l} bg-blue-100 text-blue-800 ${s}"
                title="Locale: ${a}"
                aria-label="Locale: ${a}">
    ${a}
  </span>`;
}
function da(e, t = {}) {
  const r = "resolvedLocale" in e ? e : be(e), { maxLocales: n = 3, size: i = "default" } = t;
  if (r.availableLocales.length === 0) return "";
  const s = i === "sm" ? "text-xs gap-0.5" : "text-xs gap-1", a = i === "sm" ? "px-1 py-0.5 text-[10px]" : "px-1.5 py-0.5", o = r.availableLocales.slice(0, n), l = r.availableLocales.length - n, c = o.map((f) => `<span class="${f === r.resolvedLocale ? `${a} rounded bg-blue-100 text-blue-700 font-medium` : `${a} rounded bg-gray-100 text-gray-600`}">${f.toUpperCase()}</span>`).join(""), d = l > 0 ? `<span class="${a} rounded bg-gray-100 text-gray-500">+${l}</span>` : "";
  return `<span class="inline-flex items-center ${s}"
                title="Available locales: ${r.availableLocales.join(", ")}"
                aria-label="Available locales: ${r.availableLocales.join(", ")}">
    ${c}${d}
  </span>`;
}
function ua(e, t = {}) {
  const r = "resolvedLocale" in e ? e : be(e), { showResolvedLocale: n = !0, size: i = "default" } = t, s = [];
  return n && r.resolvedLocale && s.push(hi(r, {
    size: i,
    showFallbackIndicator: !0
  })), r.availableLocales.length > 1 && s.push(da(r, {
    ...t,
    size: i
  })), s.length === 0 ? '<span class="text-gray-400">-</span>' : `<div class="flex items-center flex-wrap ${i === "sm" ? "gap-1" : "gap-2"}">${s.join("")}</div>`;
}
function Qu(e, t = "default") {
  if (!e) return "";
  const r = e.trim();
  if (je(r) !== null) return ze(r, { size: t === "sm" ? "sm" : "default" });
  const n = r.toLowerCase();
  return qt(e, "status", n, { size: t === "sm" ? "sm" : void 0 });
}
function Zu(e, t = {}) {
  const r = ee(e);
  if (!r.hasReadinessMetadata) return "";
  const { size: n = "default", showDetailedTooltip: i = !0, extraClass: s = "" } = t, a = `inline-flex items-center gap-1 rounded font-medium ${n === "sm" ? "text-xs px-1.5 py-0.5" : "text-xs px-2 py-1"}`, o = r.readinessState || "ready", { icon: l, label: c, bgClass: d, textClass: f, tooltip: h } = fa(o, r, i);
  return `<span class="${a} ${d} ${f} ${s}"
                title="${h}"
                aria-label="${c}"
                data-readiness-state="${o}">
    ${l}
    <span>${c}</span>
  </span>`;
}
function ef(e, t = {}) {
  const r = ee(e);
  if (!r.hasReadinessMetadata) return "";
  const n = r.readyForTransition.publish === !0, { size: i = "default", extraClass: s = "" } = t, a = i === "sm" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-1";
  if (n) return `<span class="inline-flex items-center gap-1 rounded font-medium ${a} bg-green-100 text-green-700 ${s}"
                  title="Ready to publish"
                  aria-label="Ready to publish">
      <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
      </svg>
      Ready
    </span>`;
  const o = r.missingRequiredLocales.length;
  return `<span class="inline-flex items-center gap-1 rounded font-medium ${a} bg-amber-100 text-amber-700 ${s}"
                title="${o > 0 ? `Missing translations: ${r.missingRequiredLocales.join(", ")}` : "Not ready to publish"}"
                aria-label="Not ready to publish">
    <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
      <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
    </svg>
    ${o > 0 ? `${o} missing` : "Not ready"}
  </span>`;
}
function tf(e, t = {}) {
  const r = ee(e);
  if (!r.hasReadinessMetadata || r.requiredLocales.length === 0) return "";
  const { size: n = "default", extraClass: i = "" } = t, s = n === "sm" ? "text-xs" : "text-sm", a = r.requiredLocales.length, o = r.availableLocales.filter((l) => r.requiredLocales.includes(l)).length;
  return `<span class="${s} ${a > 0 && o === a ? "text-green-600" : o > 0 ? "text-amber-600" : "text-gray-500"} font-medium ${i}"
                title="Locale completeness: ${o} of ${a} required locales available"
                aria-label="${o} of ${a} locales">
    ${o}/${a}
  </span>`;
}
function rf(e, t = {}) {
  const r = ee(e);
  if (!r.hasReadinessMetadata || r.readinessState === "ready") return "";
  const { size: n = "default", extraClass: i = "" } = t, s = n === "sm" ? "text-xs px-2 py-1" : "text-sm px-2.5 py-1", a = r.missingRequiredLocales.length, o = a > 0, l = Object.keys(r.missingRequiredFieldsByLocale).length > 0;
  let c = "", d = "", f = "";
  if (o && l ? (c = "missing_locales_and_fields", d = `${a} missing`, f = `Missing translations: ${r.missingRequiredLocales.join(", ")}. Also has incomplete fields.`) : o ? (c = "missing_locales", d = `${a} missing`, f = `Missing translations: ${r.missingRequiredLocales.join(", ")}`) : l && (c = "missing_fields", d = "Incomplete", f = `Incomplete fields in: ${Object.keys(r.missingRequiredFieldsByLocale).join(", ")}`), !d) return "";
  const h = je(c, "core");
  return `<span class="inline-flex items-center gap-1.5 rounded-full font-medium ${s} ${h?.bgClass || "bg-amber-50"} ${h?.textClass || "text-amber-700"} ${i}"
                title="${f}"
                aria-label="${f}"
                data-missing-translations="true"
                data-missing-count="${a}">
    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
    <span>${d}</span>
  </span>`;
}
function nf(e) {
  const t = ee(e);
  return t.hasReadinessMetadata ? t.readinessState !== "ready" : !1;
}
function sf(e) {
  return ee(e).missingRequiredLocales.length;
}
function fa(e, t, r) {
  const n = je(e, "core"), i = n ? ci(n, "sm") : "", s = n?.bgClass || "bg-gray-100", a = n?.textClass || "text-gray-600", o = n?.label || "Unknown", l = n?.description || "Unknown readiness state";
  switch (e) {
    case "ready":
      return {
        icon: i,
        label: o,
        bgClass: s,
        textClass: a,
        tooltip: l
      };
    case "missing_locales": {
      const c = t.missingRequiredLocales, d = r && c.length > 0 ? `Missing translations: ${c.join(", ")}` : "Missing required translations";
      return {
        icon: i,
        label: `${c.length} missing`,
        bgClass: s,
        textClass: a,
        tooltip: d
      };
    }
    case "missing_fields": {
      const c = Object.keys(t.missingRequiredFieldsByLocale);
      return {
        icon: i,
        label: "Incomplete",
        bgClass: s,
        textClass: a,
        tooltip: r && c.length > 0 ? `Incomplete fields in: ${c.join(", ")}` : "Some translations have missing required fields"
      };
    }
    case "missing_locales_and_fields": {
      const c = t.missingRequiredLocales, d = Object.keys(t.missingRequiredFieldsByLocale), f = [];
      return c.length > 0 && f.push(`Missing: ${c.join(", ")}`), d.length > 0 && f.push(`Incomplete: ${d.join(", ")}`), {
        icon: i,
        label: "Not ready",
        bgClass: s,
        textClass: a,
        tooltip: r ? f.join("; ") : "Missing translations and incomplete fields"
      };
    }
    default:
      return {
        icon: i,
        label: o,
        bgClass: s,
        textClass: a,
        tooltip: l
      };
  }
}
function ha(e, t = {}) {
  const { size: r = "sm", maxLocales: n = 5, showLabels: i = !1 } = t, s = ee(e);
  if (!s.hasReadinessMetadata) return '<span class="text-gray-400">-</span>';
  const { requiredLocales: a, availableLocales: o, missingRequiredFieldsByLocale: l } = s, c = a.length > 0 ? a : o;
  if (c.length === 0) return '<span class="text-gray-400">-</span>';
  const d = new Set(o), f = pa(l);
  return `<div class="flex items-center gap-1 flex-wrap" data-matrix-cell="true">${c.slice(0, n).map((h) => {
    const p = d.has(h), m = p && f.has(h), g = p && !m;
    let y, w, x;
    g ? (y = "bg-green-100 text-green-700 border-green-300", w = "●", x = "Complete") : m ? (y = "bg-amber-100 text-amber-700 border-amber-300", w = "◐", x = "Incomplete") : (y = "bg-white text-gray-400 border-gray-300 border-dashed", w = "○", x = "Missing");
    const E = r === "sm" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-1", L = i ? `<span class="font-medium">${h.toUpperCase()}</span>` : "";
    return `
        <span class="inline-flex items-center gap-0.5 ${E} rounded border ${y}"
              title="${h.toUpperCase()}: ${x}"
              aria-label="${h.toUpperCase()}: ${x}"
              data-locale="${h}"
              data-state="${x.toLowerCase()}">
          ${L}
          <span aria-hidden="true">${w}</span>
        </span>
      `;
  }).join("")}${c.length > n ? `<span class="text-[10px] text-gray-500" title="${c.length - n} more locales">+${c.length - n}</span>` : ""}</div>`;
}
function pa(e) {
  const t = /* @__PURE__ */ new Set();
  if (e && typeof e == "object")
    for (const [r, n] of Object.entries(e)) Array.isArray(n) && n.length > 0 && t.add(r);
  return t;
}
function af(e = {}) {
  return (t, r, n) => ha(r, e);
}
function of(e, t = {}) {
  if (!e.fallbackUsed && !e.missingRequestedLocale) return "";
  const { showCreateButton: r = !0, createTranslationUrl: n, panelName: i } = t, s = e.requestedLocale || "requested locale", a = e.resolvedLocale || "default", o = r ? `
    <button type="button"
            class="inline-flex items-center gap-1 text-sm font-medium text-amber-800 hover:text-amber-900 underline"
            data-action="create-translation"
            data-locale="${e.requestedLocale || ""}"
            data-panel="${i || ""}"
            data-record-id="${e.recordId || ""}"
            ${n ? `data-url="${n}"` : ""}>
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
      </svg>
      Create ${s.toUpperCase()} translation
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
            The <strong>${s.toUpperCase()}</strong> translation doesn't exist yet.
            You're viewing content from <strong>${a.toUpperCase()}</strong>.
            <span class="block mt-1 text-amber-600">Editing is disabled until you create the missing translation.</span>
          </p>
          ${o ? `<div class="mt-3">${o}</div>` : ""}
        </div>
      </div>
    </div>
  `;
}
function wn(e = {}) {
  return (t, r, n) => ua(r, e);
}
function ma(e = {}) {
  return (t, r, n) => hi(r, e);
}
function Pe(e, t) {
  for (const r of t) {
    const n = rn(e, r);
    if (typeof n == "string" && n.trim()) return n;
  }
  return null;
}
function ga(e, t) {
  for (const r of t) {
    const n = rn(e, r);
    if (Array.isArray(n)) return n.filter((i) => typeof i == "string");
  }
  return [];
}
function xn(e, t) {
  for (const r of t) {
    const n = rn(e, r);
    if (typeof n == "boolean") return n;
    if (n === "true") return !0;
    if (n === "false") return !1;
  }
  return !1;
}
function rn(e, t) {
  const r = t.split(".");
  let n = e;
  for (const i of r) {
    if (n == null || typeof n != "object") return;
    n = n[i];
  }
  return n;
}
var he = '<span class="text-gray-400">-</span>', ba = [
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
function ya(e) {
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}
function va(e) {
  const t = [], r = (i) => {
    if (typeof i != "string") return;
    const s = i.trim();
    !s || t.includes(s) || t.push(s);
  };
  r(e.display_key), r(e.displayKey);
  const n = e.display_keys ?? e.displayKeys;
  return Array.isArray(n) && n.forEach(r), t;
}
function wa(e, t) {
  if (!t) return;
  if (Object.prototype.hasOwnProperty.call(e, t)) return e[t];
  if (!t.includes(".")) return;
  const r = t.split(".");
  let n = e;
  for (const i of r) {
    if (!n || typeof n != "object" || Array.isArray(n) || !Object.prototype.hasOwnProperty.call(n, i)) return;
    n = n[i];
  }
  return n;
}
function xa(e) {
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
function Rr(e, t) {
  if (e == null) return "";
  if (Array.isArray(e)) return Pr(e, t);
  if (typeof e != "object") return String(e);
  const r = [...va(t), ...ba], n = /* @__PURE__ */ new Set();
  for (const i of r) {
    if (n.has(i)) continue;
    n.add(i);
    const s = xa(wa(e, i));
    if (s) return s;
  }
  return ya(e);
}
function Pr(e, t) {
  if (!Array.isArray(e) || e.length === 0) return "";
  const r = e.map((a) => Rr(a, t).trim()).filter(Boolean);
  if (r.length === 0) return "";
  const n = Number(t.preview_limit ?? t.previewLimit ?? 3), i = Number.isFinite(n) && n > 0 ? Math.floor(n) : 3, s = r.slice(0, i);
  return r.length <= i ? s.join(", ") : `${s.join(", ")} +${r.length - i} more`;
}
function Sa(e, t, r, n) {
  const i = e[t] ?? e[r] ?? n, s = Number(i);
  return Number.isFinite(s) && s > 0 ? Math.floor(s) : n;
}
function Ca(e, t, r, n) {
  const i = e[t] ?? e[r];
  return i == null ? n : typeof i == "boolean" ? i : typeof i == "string" ? i.toLowerCase() === "true" || i === "1" : !!i;
}
function Ea(e, t, r, n) {
  const i = e[t] ?? e[r];
  return i == null ? n : String(i).trim() || n;
}
function Aa(e) {
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
function $a(e) {
  switch (e) {
    case "muted":
      return "bg-gray-100 text-gray-600";
    case "outline":
      return "bg-white border border-gray-300 text-gray-700";
    default:
      return "bg-blue-50 text-blue-700";
  }
}
var ka = class {
  constructor() {
    this.renderers = /* @__PURE__ */ new Map(), this.defaultRenderer = (e) => {
      if (e == null) return he;
      if (typeof e == "boolean") return e ? "Yes" : "No";
      if (Array.isArray(e)) {
        const t = Pr(e, {});
        return t ? u(t) : he;
      }
      if (typeof e == "object") {
        const t = Rr(e, {});
        return t ? u(t) : he;
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
      return qt(String(e), "status", t);
    }), this.renderers.set("_date", (e) => {
      if (!e) return '<span class="text-gray-400">-</span>';
      const t = Ot(e);
      return t ? t.toLocaleDateString() : String(e);
    }), this.renderers.set("_datetime", (e) => {
      if (!e) return '<span class="text-gray-400">-</span>';
      const t = Ot(e);
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
      if (!Array.isArray(e) || e.length === 0) return he;
      const i = Pr(e, n?.options || {});
      return i ? u(i) : he;
    }), this.renderers.set("_object", (e, t, r, n) => {
      if (e == null) return he;
      const i = Rr(e, n?.options || {});
      return i ? u(i) : he;
    }), this.renderers.set("_tags", (e) => !Array.isArray(e) || e.length === 0 ? '<span class="text-gray-400">-</span>' : e.map((t) => `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 mr-1">${t}</span>`).join("")), this.renderers.set("blocks_chips", (e, t, r, n) => {
      if (!Array.isArray(e) || e.length === 0) return he;
      const i = n?.options || {}, s = Sa(i, "max_visible", "maxVisible", 3), a = Ca(i, "show_count", "showCount", !0), o = Ea(i, "chip_variant", "chipVariant", "default"), l = i.block_icons_map || i.blockIconsMap || {}, c = [], d = e.slice(0, s);
      for (const p of d) {
        const m = Aa(p);
        if (!m) continue;
        const g = l[m] || "view-grid", y = Es(g, {
          size: "14px",
          extraClass: "flex-shrink-0"
        }), w = $a(o);
        c.push(`<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${w}">${y}<span>${u(m)}</span></span>`);
      }
      if (c.length === 0) return he;
      const f = e.length - s;
      let h = "";
      return a && f > 0 && (h = `<span class="px-2 py-0.5 rounded text-xs bg-gray-200 text-gray-600">+${f} more</span>`), `<div class="flex flex-wrap gap-1">${c.join("")}${h}</div>`;
    }), this.renderers.set("_image", (e) => e ? `<img src="${e}" alt="Thumbnail" class="h-10 w-10 rounded object-cover" />` : '<span class="text-gray-400">-</span>'), this.renderers.set("_avatar", (e, t) => {
      const r = t.name || t.username || t.email || "U", n = r.charAt(0).toUpperCase();
      return e ? `<img src="${e}" alt="${r}" class="h-8 w-8 rounded-full object-cover" />` : `<div class="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium text-sm">${n}</div>`;
    });
  }
}, lf = {
  statusBadge: (e) => (t) => {
    const r = String(t).toLowerCase();
    return qt(String(t), "status", r);
  },
  roleBadge: (e) => (t) => {
    const r = String(t).toLowerCase();
    return qt(String(t), "role", r);
  },
  userInfo: (e, t) => {
    const r = e || t.name || t.username || "-", n = t.email || "";
    return n ? `<div><div class="font-medium text-gray-900">${r}</div><div class="text-sm text-gray-500">${n}</div></div>` : `<div class="font-medium text-gray-900">${r}</div>`;
  },
  booleanChip: (e) => (t) => Ws(!!t, e),
  relativeTime: (e) => {
    if (!e) return '<span class="text-gray-400">-</span>';
    const t = Ot(e);
    if (!t) return String(e);
    const r = (/* @__PURE__ */ new Date()).getTime() - t.getTime(), n = Math.floor(r / 6e4), i = Math.floor(r / 36e5), s = Math.floor(r / 864e5);
    return n < 1 ? "Just now" : n < 60 ? `${n} minute${n > 1 ? "s" : ""} ago` : i < 24 ? `${i} hour${i > 1 ? "s" : ""} ago` : s < 30 ? `${s} day${s > 1 ? "s" : ""} ago` : t.toLocaleDateString();
  },
  localeBadge: ma(),
  translationStatus: wn(),
  translationStatusCompact: wn({
    size: "sm",
    maxLocales: 2
  })
}, _a = "datagrid.state.", ar = "datagrid.share.", pi = "datagrid.share.index", La = 20, Da = 1500;
function Ta(e) {
  return String(e || "").trim() || "default";
}
function or(e, t = {}) {
  if (!Array.isArray(e)) return;
  const r = e.map((n) => typeof n == "string" ? n.trim() : "").filter((n) => n.length > 0);
  return r.length === 0 ? t.allowEmpty === !0 ? [] : void 0 : Array.from(new Set(r));
}
function mt(e) {
  if (!e || typeof e != "object" || Array.isArray(e)) return null;
  const t = e, r = { version: 1 };
  (t.viewMode === "flat" || t.viewMode === "grouped" || t.viewMode === "matrix") && (r.viewMode = t.viewMode), (t.expandMode === "all" || t.expandMode === "none" || t.expandMode === "explicit") && (r.expandMode = t.expandMode);
  const n = or(t.expandedGroups, { allowEmpty: !0 });
  n !== void 0 && (r.expandedGroups = n);
  const i = or(t.hiddenColumns, { allowEmpty: !0 });
  i !== void 0 && (r.hiddenColumns = i);
  const s = or(t.columnOrder);
  return s && (r.columnOrder = s), typeof t.updatedAt == "number" && Number.isFinite(t.updatedAt) && (r.updatedAt = t.updatedAt), r;
}
function Sn(e) {
  if (!e || typeof e != "object" || Array.isArray(e)) return null;
  const t = e, r = { version: 1 };
  if (typeof t.search == "string") {
    const i = t.search.trim();
    i && (r.search = i);
  }
  typeof t.page == "number" && Number.isFinite(t.page) && (r.page = Math.max(1, Math.trunc(t.page))), typeof t.perPage == "number" && Number.isFinite(t.perPage) && (r.perPage = Math.max(1, Math.trunc(t.perPage))), Array.isArray(t.filters) && (r.filters = t.filters), Array.isArray(t.sort) && (r.sort = t.sort);
  const n = mt(t.persisted);
  return n && (r.persisted = n), typeof t.updatedAt == "number" && Number.isFinite(t.updatedAt) && (r.updatedAt = t.updatedAt), r;
}
function mi(e) {
  const t = String(e || "").trim();
  return t ? t.replace(/\/+$/, "") : "";
}
function Ra(e) {
  return String(e || "").trim().replace(/[^a-zA-Z0-9._-]/g, "");
}
function Pa() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`.slice(0, 16);
}
function Ma(e) {
  try {
    const t = localStorage.getItem(pi);
    if (!t) return [];
    const r = JSON.parse(t);
    if (!Array.isArray(r)) return [];
    const n = r.map((i) => {
      if (!i || typeof i != "object" || Array.isArray(i)) return null;
      const s = i, a = typeof s.token == "string" ? s.token.trim() : "", o = typeof s.updatedAt == "number" ? s.updatedAt : 0;
      return !a || !Number.isFinite(o) ? null : {
        token: a,
        updatedAt: o
      };
    }).filter((i) => i !== null).sort((i, s) => s.updatedAt - i.updatedAt);
    return n.length <= e ? n : n.slice(0, e);
  } catch {
    return [];
  }
}
function Ia(e) {
  try {
    localStorage.setItem(pi, JSON.stringify(e));
  } catch {
  }
}
var gi = class {
  constructor(e) {
    const t = Ta(e.key);
    this.key = t, this.persistedStorageKey = `${_a}${t}`, this.maxShareEntries = Math.max(1, e.maxShareEntries || La);
  }
  loadPersistedState() {
    try {
      const e = localStorage.getItem(this.persistedStorageKey);
      return e ? mt(JSON.parse(e)) : null;
    } catch {
      return null;
    }
  }
  savePersistedState(e) {
    const t = mt(e);
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
    const t = Sn(e);
    if (!t) return null;
    t.updatedAt || (t.updatedAt = Date.now());
    const r = Pa(), n = `${ar}${r}`;
    try {
      localStorage.setItem(n, JSON.stringify(t));
      const i = Ma(this.maxShareEntries).filter((s) => s.token !== r);
      for (i.unshift({
        token: r,
        updatedAt: t.updatedAt
      }); i.length > this.maxShareEntries; ) {
        const s = i.pop();
        s && localStorage.removeItem(`${ar}${s.token}`);
      }
      return Ia(i), r;
    } catch {
      return null;
    }
  }
  resolveShareState(e) {
    const t = String(e || "").trim();
    if (!t) return null;
    try {
      const r = localStorage.getItem(`${ar}${t}`);
      return r ? Sn(JSON.parse(r)) : null;
    } catch {
      return null;
    }
  }
}, Ba = class extends gi {
  constructor(e) {
    if (super(e), this.syncTimeout = null, this.mutationQueue = Promise.resolve(), this.preferencesEndpoint = mi(e.preferencesEndpoint), !this.preferencesEndpoint) throw new Error("PreferencesDataGridStateStore requires an advertised preferences endpoint");
    this.resource = Ra(e.resource) || this.key, this.syncDebounceMs = Math.max(100, e.syncDebounceMs || 1e3), this.hydrateTimeoutMs = Math.max(100, e.hydrateTimeoutMs || Da), this.preferencesWritable = e.preferencesWritable !== !1;
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
      const i = await n.json(), s = this.extractFirstRecord(i);
      if (!s) return;
      const a = this.extractMap(s.effective), o = this.extractMap(s.raw), l = mt(a[this.serverStateKey] ?? o[this.serverStateKey]);
      l && super.savePersistedState(l);
    } catch {
    } finally {
      clearTimeout(t);
    }
  }
  savePersistedState(e) {
    super.savePersistedState(e);
    const t = mt(e);
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
      await U(this.preferencesEndpoint, {
        method: "POST",
        credentials: "same-origin",
        json: { raw: { [this.serverStateKey]: e } }
      });
    } catch {
    }
  }
  async clearServerState() {
    try {
      await U(this.preferencesEndpoint, {
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
function Oa(e) {
  return (e.mode || "local") === "preferences" && mi(e.preferencesEndpoint) ? new Ba(e) : new gi(e);
}
function Fa(e, t = {}) {
  const { groupByField: r = "family_id", defaultExpanded: n = !0, expandMode: i = "explicit", expandedGroups: s = /* @__PURE__ */ new Set() } = t, a = /* @__PURE__ */ new Map(), o = [];
  for (const c of e) {
    const d = Ha(c, r);
    if (d) {
      const f = a.get(d);
      f ? f.push(c) : a.set(d, [c]);
    } else o.push(c);
  }
  const l = [];
  for (const [c, d] of a) {
    const f = Si(d), h = yi(c, i, s, n);
    l.push({
      groupId: c,
      records: d,
      summary: f,
      expanded: h,
      summaryFromBackend: !1
    });
  }
  return l.sort((c, d) => e.indexOf(c.records[0]) - e.indexOf(d.records[0])), {
    groups: l,
    ungrouped: o,
    totalGroups: l.length,
    totalRecords: e.length
  };
}
function bi(e) {
  if (e.length === 0) return !1;
  let t = !1;
  for (const r of e) {
    if (Na(r)) {
      t = !0;
      continue;
    }
    if (vi(r)) {
      t = !0;
      continue;
    }
    return !1;
  }
  return t;
}
function qa(e, t = {}) {
  const { defaultExpanded: r = !0, expandMode: n = "explicit", expandedGroups: i = /* @__PURE__ */ new Set() } = t;
  if (!bi(e)) return null;
  const s = [], a = [];
  let o = 0;
  for (const l of e) {
    if (vi(l)) {
      a.push({ ...l }), o += 1;
      continue;
    }
    const c = ja(l);
    if (!c) return null;
    const d = xi(l), f = Ga(l, d), h = yi(c, n, i, r);
    s.push({
      groupId: c,
      displayLabel: Ua(l, d),
      records: d,
      summary: f,
      expanded: h,
      summaryFromBackend: za(l)
    }), o += d.length;
  }
  return {
    groups: s,
    ungrouped: a,
    totalGroups: s.length,
    totalRecords: o
  };
}
function yi(e, t, r, n) {
  return t === "all" ? !r.has(e) : t === "none" ? r.has(e) : r.size === 0 ? n : r.has(e);
}
function Na(e) {
  const t = e, r = typeof t.group_by == "string" ? t.group_by.trim().toLowerCase() : "", n = wi(e);
  if (!(r === "family_id" || n === "group")) return !1;
  const i = xi(e);
  return Array.isArray(i);
}
function vi(e) {
  return wi(e) === "ungrouped";
}
function wi(e) {
  const t = e._group;
  if (!t || typeof t != "object" || Array.isArray(t)) return "";
  const r = t.row_type;
  return typeof r == "string" ? r.trim().toLowerCase() : "";
}
function ja(e) {
  const t = e.family_id;
  if (typeof t == "string" && t.trim()) return t.trim();
  const r = e._group;
  if (!r || typeof r != "object" || Array.isArray(r)) return null;
  const n = r.id;
  return typeof n == "string" && n.trim() ? n.trim() : null;
}
function xi(e) {
  const t = e, r = Array.isArray(t.records) ? t.records : t.children;
  if (Array.isArray(r)) {
    const i = r.filter((s) => !!s && typeof s == "object" && !Array.isArray(s)).map((s) => ({ ...s }));
    if (i.length > 0) return i;
  }
  const n = t.parent;
  return n && typeof n == "object" && !Array.isArray(n) ? [{ ...n }] : [];
}
function za(e) {
  const t = e.family_summary;
  return !!t && typeof t == "object" && !Array.isArray(t);
}
function Ga(e, t) {
  const r = e.family_summary;
  if (!r || typeof r != "object" || Array.isArray(r)) return Si(t);
  const n = r, i = Array.isArray(n.available_locales) ? n.available_locales.filter(Oe) : [], s = Array.isArray(n.missing_locales) ? n.missing_locales.filter(Oe) : [], a = Ci(n.readiness_state) ? n.readiness_state : null, o = Math.max(t.length, typeof n.child_count == "number" ? Math.max(n.child_count, 0) : 0);
  return {
    totalItems: typeof n.total_items == "number" ? Math.max(n.total_items, 0) : o,
    availableLocales: i,
    missingLocales: s,
    readinessState: a,
    readyForPublish: typeof n.ready_for_publish == "boolean" ? n.ready_for_publish : null
  };
}
function Ua(e, t) {
  const r = e.family_label;
  if (typeof r == "string" && r.trim()) return r.trim();
  const n = e.family_summary;
  if (n && typeof n == "object" && !Array.isArray(n)) {
    const o = n.group_label;
    if (typeof o == "string" && o.trim()) return o.trim();
  }
  const i = e._group;
  if (i && typeof i == "object" && !Array.isArray(i)) {
    const o = i.label;
    if (typeof o == "string" && o.trim()) return o.trim();
  }
  const s = [], a = e.parent;
  if (a && typeof a == "object" && !Array.isArray(a)) {
    const o = a;
    s.push(o.title, o.name, o.slug, o.path);
  }
  t.length > 0 && s.push(t[0].title, t[0].name, t[0].slug, t[0].path);
  for (const o of s) if (typeof o == "string" && o.trim()) return o.trim();
}
function Ha(e, t) {
  const r = e[t];
  return typeof r == "string" && r.trim() ? r : null;
}
function Si(e) {
  const t = /* @__PURE__ */ new Set(), r = /* @__PURE__ */ new Set();
  let n = !1, i = 0;
  for (const a of e) {
    const o = a.translation_readiness;
    if (o) {
      const c = o.available_locales, d = o.missing_required_locales, f = o.readiness_state;
      Array.isArray(c) && c.filter(Oe).forEach((h) => t.add(h)), Array.isArray(d) && d.filter(Oe).forEach((h) => r.add(h)), (f === "missing_fields" || f === "missing_locales_and_fields") && (n = !0), f === "ready" && i++;
    }
    const l = a.available_locales;
    Array.isArray(l) && l.filter(Oe).forEach((c) => t.add(c));
  }
  let s = null;
  if (e.length > 0) {
    const a = i === e.length, o = r.size > 0;
    a ? s = "ready" : o && n ? s = "missing_locales_and_fields" : o ? s = "missing_locales" : n && (s = "missing_fields");
  }
  return {
    totalItems: e.length,
    availableLocales: Array.from(t),
    missingLocales: Array.from(r),
    readinessState: s,
    readyForPublish: s === "ready"
  };
}
function Oe(e) {
  return typeof e == "string";
}
function Va(e, t) {
  const r = e.groups.map((n) => {
    const i = t.get(n.groupId);
    return i ? {
      ...n,
      summary: {
        ...n.summary,
        ...i
      },
      summaryFromBackend: !0
    } : n;
  });
  return {
    ...e,
    groups: r
  };
}
function Ka(e) {
  const t = /* @__PURE__ */ new Map(), r = e.group_summaries;
  if (!r || typeof r != "object" || Array.isArray(r)) return t;
  for (const [n, i] of Object.entries(r)) if (i && typeof i == "object") {
    const s = i;
    t.set(n, {
      totalItems: typeof s.total_items == "number" ? s.total_items : void 0,
      availableLocales: Array.isArray(s.available_locales) ? s.available_locales.filter(Oe) : void 0,
      missingLocales: Array.isArray(s.missing_locales) ? s.missing_locales.filter(Oe) : void 0,
      readinessState: Ci(s.readiness_state) ? s.readiness_state : void 0,
      readyForPublish: typeof s.ready_for_publish == "boolean" ? s.ready_for_publish : void 0
    });
  }
  return t;
}
function Ci(e) {
  return e === "ready" || e === "missing_locales" || e === "missing_fields" || e === "missing_locales_and_fields";
}
var Jt = "datagrid-expand-state-";
function Mr(e) {
  if (!Array.isArray(e)) return [];
  const t = [];
  for (const r of e) {
    const n = sn(r);
    if (n && !t.includes(n)) {
      if (t.length >= nn) break;
      t.push(n);
    }
  }
  return t;
}
function Ei(e) {
  if (!e) return null;
  try {
    const t = JSON.parse(e);
    return Array.isArray(t) ? {
      version: 2,
      mode: "explicit",
      ids: Mr(t)
    } : !t || typeof t != "object" || Array.isArray(t) ? null : {
      version: 2,
      mode: wt(t.mode, "explicit"),
      ids: Mr(t.ids)
    };
  } catch {
    return null;
  }
}
function Ja(e) {
  try {
    const t = Jt + e, r = Ei(localStorage.getItem(t));
    if (r) return new Set(r.ids);
  } catch {
  }
  return /* @__PURE__ */ new Set();
}
function Ya(e) {
  try {
    const t = Jt + e, r = Ei(localStorage.getItem(t));
    if (r) return r.mode;
  } catch {
  }
  return "explicit";
}
function Wa(e) {
  try {
    const t = Jt + e;
    return localStorage.getItem(t) !== null;
  } catch {
    return !1;
  }
}
function cf(e, t, r = "explicit") {
  try {
    const n = Jt + e, i = Mr(Array.from(t)), s = {
      version: 2,
      mode: wt(r, "explicit"),
      ids: i
    };
    localStorage.setItem(n, JSON.stringify(s));
  } catch {
  }
}
function df(e, t) {
  const r = e.groups.map((n) => n.groupId === t ? {
    ...n,
    expanded: !n.expanded
  } : n);
  return {
    ...e,
    groups: r
  };
}
function uf(e) {
  const t = e.groups.map((r) => ({
    ...r,
    expanded: !0
  }));
  return {
    ...e,
    groups: t
  };
}
function ff(e) {
  const t = e.groups.map((r) => ({
    ...r,
    expanded: !1
  }));
  return {
    ...e,
    groups: t
  };
}
function hf(e) {
  const t = /* @__PURE__ */ new Set();
  for (const r of e.groups) r.expanded && t.add(r.groupId);
  return t;
}
var Ai = "datagrid-view-mode-", nn = 200, Xa = 256;
function wt(e, t = "explicit") {
  return e === "all" || e === "none" || e === "explicit" ? e : t;
}
function Qa(e) {
  try {
    const t = Ai + e, r = localStorage.getItem(t);
    if (r && $i(r)) return r;
  } catch {
  }
  return null;
}
function pf(e, t) {
  try {
    const r = Ai + e;
    localStorage.setItem(r, t);
  } catch {
  }
}
function $i(e) {
  return e === "flat" || e === "grouped" || e === "matrix" || e === "server_family";
}
function ki(e) {
  return e && $i(e) ? e : null;
}
function mf(e) {
  if (!(e instanceof Set) || e.size === 0) return "";
  const t = Array.from(new Set(Array.from(e).map((r) => sn(r)).filter((r) => r !== null))).slice(0, nn).sort();
  return t.length === 0 ? "" : t.map((r) => encodeURIComponent(r)).join(",");
}
function Za(e) {
  const t = /* @__PURE__ */ new Set();
  if (!e) return t;
  const r = e.split(",");
  for (const n of r) {
    if (t.size >= nn) break;
    if (!n) continue;
    let i = "";
    try {
      i = decodeURIComponent(n);
    } catch {
      continue;
    }
    const s = sn(i);
    s && t.add(s);
  }
  return t;
}
function sn(e) {
  if (typeof e != "string") return null;
  let t = e.trim();
  if (!t) return null;
  if (t.includes("%")) try {
    const r = decodeURIComponent(t);
    typeof r == "string" && r.trim() && (t = r.trim());
  } catch {
  }
  return t.length > Xa ? null : t;
}
function eo(e, t = {}) {
  const { summary: r } = e, { size: n = "sm" } = t, i = n === "sm" ? "text-xs" : "text-sm", s = r.availableLocales.length, a = s + r.missingLocales.length;
  let o = "";
  if (r.readinessState) {
    const d = to(r.readinessState);
    o = `
      <span class="${i} px-1.5 py-0.5 rounded ${d.bgClass} ${d.textClass}"
            title="${d.description}">
        ${d.icon} ${d.label}
      </span>
    `;
  }
  const l = a > 0 ? `<span class="${i} text-gray-500">${s}/${a} locales</span>` : "", c = `<span class="${i} text-gray-500">${r.totalItems} item${r.totalItems !== 1 ? "s" : ""}</span>`;
  return `
    <div class="inline-flex items-center gap-2">
      ${o}
      ${l}
      ${c}
    </div>
  `;
}
function to(e) {
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
function ro(e) {
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
        const i = n.trim();
        return i.length > 60 ? i.slice(0, 57) + "..." : i;
      }
    }
  }
  return `Translation Group (${e.groupId.length > 8 ? e.groupId.slice(0, 8) + "..." : e.groupId})`;
}
function no(e, t, r = {}) {
  const { showExpandIcon: n = !0, fixedColumnCount: i = 2 } = r, s = n ? `<span class="expand-icon mr-2" aria-hidden="true">${e.expanded ? "▼" : "▶"}</span>` : "", a = eo(e), o = u(ro(e)), l = e.records.length, c = l > 1 ? `<span class="ml-2 text-xs text-gray-500">(${l} locales)</span>` : "";
  return `
    <tr class="group-header bg-gray-50 hover:bg-gray-100 cursor-pointer border-b border-gray-200"
        data-group-id="${v(e.groupId)}"
        data-expanded="${e.expanded}"
        role="row"
        aria-expanded="${e.expanded}"
        tabindex="0">
      <td colspan="${t + i}" class="px-4 py-2">
        <div class="flex items-center justify-between">
          <div class="flex items-center">
            ${s}
            <span class="font-medium text-gray-700">${o}</span>
            ${c}
          </div>
          ${a}
        </div>
      </td>
    </tr>
  `;
}
function io(e, t = 2) {
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
function so(e, t = 2) {
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
function ao(e, t, r, n = 2) {
  const i = r ? `<button type="button" class="mt-2 px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600" onclick="this.dispatchEvent(new CustomEvent('retry', { bubbles: true }))">Retry</button>` : "";
  return `
    <tr class="admin-datagrid__state-row" data-datagrid-state="error">
      <td colspan="${e + n}" class="admin-datagrid__state admin-datagrid__state--error px-6 py-12 text-center" role="alert" aria-live="assertive">
        <div class="text-red-500">
          <svg class="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
          <h3 class="mt-2 text-sm font-medium text-gray-900">Error loading groups</h3>
          <p class="mt-1 text-sm text-gray-500">${u(t)}</p>
          ${i}
        </div>
      </td>
    </tr>
  `;
}
function oo(e = 768) {
  return typeof window > "u" ? !1 : window.innerWidth < e;
}
function an(e, t = 768) {
  return oo(t) && e === "grouped" ? "flat" : e;
}
var gt = "search", bt = "page", yt = "per_page", Ne = "filters", vt = "sort", Yt = "state", Dt = "advanced_search", Wt = "hidden_columns", Xt = "view_mode", on = "expanded_groups", _i = [
  "perPage",
  "hiddenColumns",
  "advancedSearch"
], ln = [
  gt,
  bt,
  yt,
  Ne,
  vt,
  Yt,
  Wt,
  Xt,
  on
], lo = [...ln, Dt], co = 1800;
function Cn(e, t) {
  const r = t.toString();
  return r ? `${e}?${r}` : e;
}
function En(e, t) {
  for (const r of t) e.delete(r);
}
var Nt = M("DataGrid");
function uo(e) {
  return {
    maxURLLength: Math.max(256, e.config.urlState?.maxURLLength || 1800),
    maxFiltersLength: Math.max(64, e.config.urlState?.maxFiltersLength || 600),
    enableStateToken: e.config.urlState?.enableStateToken !== !1
  };
}
function fo(e, t, r) {
  const n = String(t || "").trim();
  if (!n) return null;
  try {
    const i = JSON.parse(n);
    return Array.isArray(i) ? i : (Nt.warn(`[DataGrid] Invalid ${r} payload in URL (expected array)`), null);
  } catch (i) {
    return Nt.warn(`[DataGrid] Failed to parse ${r} payload from URL:`, i), null;
  }
}
function An(e, t) {
  return Array.from(new Set(Array.from(e).map((r) => String(r || "").trim()).filter((r) => r.length > 0 && t.has(r)))).sort();
}
function ho(e, t) {
  return e.length !== t.length ? !1 : e.every((r, n) => r === t[n]);
}
function po(e) {
  const t = new Set(e.config.columns.map((n) => n.field)), r = An(e.state.hiddenColumns || [], t);
  return ho(r, An(e.config.columns.filter((n) => n.hidden).map((n) => n.field), t)) ? null : JSON.stringify(r);
}
function mo(e, t, r = {}) {
  const n = r.merge === !0, i = new Set(e.config.columns.map((o) => o.field)), s = Array.isArray(t.hiddenColumns) ? new Set(t.hiddenColumns.map((o) => String(o || "").trim()).filter((o) => o.length > 0 && i.has(o))) : null;
  s ? (e.state.hiddenColumns = s, e.hasPersistedHiddenColumnState = !0) : n || (e.state.hiddenColumns = new Set(e.config.columns.filter((o) => o.hidden).map((o) => o.field)), e.hasPersistedHiddenColumnState = !1);
  const a = Array.isArray(t.columnOrder) ? t.columnOrder.map((o) => String(o || "").trim()).filter((o) => o.length > 0 && i.has(o)) : null;
  if (a && a.length > 0) {
    const o = e.mergeColumnOrder(a);
    e.state.columnOrder = o, e.hasPersistedColumnOrderState = !0, e.didRestoreColumnOrder = !0, e.shouldReorderDOMOnRestore = e.defaultColumns.map((c) => c.field).join("|") !== o.join("|");
    const l = new Map(e.config.columns.map((c) => [c.field, c]));
    e.config.columns = o.map((c) => l.get(c)).filter((c) => c !== void 0);
  } else n || (e.state.columnOrder = e.config.columns.map((o) => o.field), e.hasPersistedColumnOrderState = !1, e.didRestoreColumnOrder = !1, e.shouldReorderDOMOnRestore = !1);
  if (e.config.enableGroupedMode) {
    if (t.viewMode) {
      const o = ki(t.viewMode);
      o && (e.state.viewMode = an(o));
    }
    e.state.expandMode = wt(t.expandMode, e.state.expandMode), Array.isArray(t.expandedGroups) ? (e.state.expandedGroups = new Set(t.expandedGroups.map((o) => String(o || "").trim()).filter(Boolean)), e.state.hasPersistedExpandState = !0) : t.expandMode !== void 0 && (e.state.hasPersistedExpandState = !0);
  }
}
function go(e, t) {
  t.persisted && e.applyPersistedStateSnapshot(t.persisted, { merge: !0 }), typeof t.search == "string" && (e.state.search = t.search), typeof t.page == "number" && Number.isFinite(t.page) && (e.state.currentPage = Math.max(1, Math.trunc(t.page))), typeof t.perPage == "number" && Number.isFinite(t.perPage) && (e.state.perPage = Math.max(1, Math.trunc(t.perPage))), Array.isArray(t.filters) && (e.state.filters = t.filters), Array.isArray(t.sort) && (e.state.sort = t.sort);
}
function bo(e) {
  const t = {
    version: 1,
    hiddenColumns: Array.from(e.state.hiddenColumns),
    columnOrder: [...e.state.columnOrder],
    updatedAt: Date.now()
  };
  return e.config.enableGroupedMode && (t.viewMode = e.state.viewMode, t.expandMode = e.state.expandMode, t.expandedGroups = Array.from(e.state.expandedGroups)), t;
}
function yo(e) {
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
function vo(e) {
  e.stateStore.savePersistedState(e.buildPersistedStateSnapshot());
}
function wo(e) {
  const t = new URLSearchParams(window.location.search);
  e.didRestoreColumnOrder = !1, e.shouldReorderDOMOnRestore = !1, e.hasURLStateOverrides = lo.some((c) => t.has(c));
  const r = t.get(Yt);
  if (r) {
    const c = e.stateStore.resolveShareState(r);
    c && e.applyShareStateSnapshot(c);
  }
  const n = t.get(gt);
  if (n) {
    e.state.search = n;
    const c = document.querySelector(e.selectors.searchInput);
    c && (c.value = n);
  }
  const i = t.get(bt);
  if (i) {
    const c = parseInt(i, 10);
    e.state.currentPage = Number.isNaN(c) ? 1 : Math.max(1, c);
  }
  const s = t.get(yt);
  if (s) {
    const c = parseInt(s, 10), d = e.config.perPage || 10;
    e.state.perPage = Number.isNaN(c) ? d : Math.max(1, c);
    const f = document.querySelector(e.selectors.perPageSelect);
    f && (f.value = String(e.state.perPage));
  }
  const a = t.get(Ne);
  if (a) {
    const c = e.parseJSONArray(a, "filters");
    c && (e.state.filters = c);
  }
  const o = t.get(vt);
  if (o) {
    const c = e.parseJSONArray(o, "sort");
    c && (e.state.sort = c);
  }
  if (e.config.enableGroupedMode) {
    const c = ki(t.get(Xt));
    c && (e.state.viewMode = an(c)), t.has("expanded_groups") && (e.state.expandedGroups = Za(t.get(on)), e.state.expandMode = "explicit", e.state.hasPersistedExpandState = !0);
  }
  const l = t.get(Wt);
  if (l) {
    const c = e.parseJSONArray(l, "hidden columns");
    if (c) {
      const d = new Set(e.config.columns.map((f) => f.field));
      e.state.hiddenColumns = new Set(c.map((f) => typeof f == "string" ? f.trim() : "").filter((f) => f.length > 0 && d.has(f)));
    }
  } else if (!e.hasPersistedHiddenColumnState && e.config.behaviors?.columnVisibility) {
    const c = e.config.columns.map((f) => f.field), d = e.config.behaviors.columnVisibility.loadHiddenColumnsFromCache(c);
    d.size > 0 && (e.state.hiddenColumns = d);
  }
  if (!e.hasPersistedColumnOrderState && e.config.behaviors?.columnVisibility?.loadColumnOrderFromCache) {
    const c = e.config.columns.map((f) => f.field), d = e.config.behaviors.columnVisibility.loadColumnOrderFromCache(c);
    if (d && d.length > 0) {
      const f = e.mergeColumnOrder(d);
      e.state.columnOrder = f, e.didRestoreColumnOrder = !0, e.shouldReorderDOMOnRestore = e.defaultColumns.map((p) => p.field).join("|") !== f.join("|");
      const h = new Map(e.config.columns.map((p) => [p.field, p]));
      e.config.columns = f.map((p) => h.get(p)).filter((p) => p !== void 0);
    }
  }
  e.persistStateSnapshot(), Nt.debug("[DataGrid] State restored from URL:", e.state), setTimeout(() => {
    e.applyRestoredState();
  }, 0);
}
function xo(e) {
  const t = document.querySelector(e.selectors.searchInput);
  t && (t.value = e.state.search);
  const r = document.querySelector(e.selectors.perPageSelect);
  r && (r.value = String(e.state.perPage)), e.state.filters.length > 0 && e.state.filters.forEach((i) => {
    const s = document.querySelector(`[data-filter-column="${i.column}"]`);
    s && (s.value = String(i.value));
  }), e.didRestoreColumnOrder && e.shouldReorderDOMOnRestore && e.reorderTableColumns(e.state.columnOrder);
  const n = e.config.columns.filter((i) => !e.state.hiddenColumns.has(i.field)).map((i) => i.field);
  e.updateColumnVisibility(n, !0), e.state.sort.length > 0 && e.updateSortIndicators();
}
function So(e, t = {}) {
  e.persistStateSnapshot();
  const r = e.getURLStateConfig(), n = new URLSearchParams(window.location.search);
  En(n, ln), En(n, _i), e.state.search && n.set(gt, e.state.search), e.state.currentPage > 1 && n.set(bt, String(e.state.currentPage)), e.state.perPage !== (e.config.perPage || 10) && n.set(yt, String(e.state.perPage));
  let i = !1;
  if (e.state.filters.length > 0) {
    const l = JSON.stringify(e.state.filters);
    l.length <= r.maxFiltersLength ? n.set(Ne, l) : i = !0;
  }
  e.state.sort.length > 0 && n.set(vt, JSON.stringify(e.state.sort));
  const s = po(e);
  s !== null && n.set(Wt, s), e.config.enableGroupedMode && n.set(Xt, e.state.viewMode);
  let a = Cn(window.location.pathname, n);
  const o = a.length > r.maxURLLength;
  if (r.enableStateToken && (i || o)) {
    n.delete(gt), n.delete(bt), n.delete(yt), n.delete(Ne), n.delete(vt);
    const l = e.stateStore.createShareState(e.buildShareStateSnapshot());
    l && n.set(Yt, l), a = Cn(window.location.pathname, n);
  }
  t.replace ? window.history.replaceState({}, "", a) : window.history.pushState({}, "", a), Nt.debug("[DataGrid] URL updated:", a);
}
var Q = M("DataGrid");
async function Co(e, t) {
  Q.debug("[DataGrid] ===== refresh() CALLED ====="), Q.debug("[DataGrid] Current sort state:", JSON.stringify(e.state.sort)), e.abortController && e.abortController.abort(), e.abortController = new AbortController(), e.setRenderState("loading"), e.renderLoadingState();
  try {
    const r = e.buildApiUrl(), n = await U(r, {
      signal: e.abortController.signal,
      method: "GET",
      accept: "application/json"
    });
    if (!n.ok) {
      if (e.handleGroupedModeStatusFallback(n.status)) return;
      throw new Error(`HTTP error! status: ${n.status}`);
    }
    const i = await n.json(), s = ia(i) || i;
    if (typeof t == "number" && typeof e.isCurrentRefresh == "function" && !e.isCurrentRefresh(t)) {
      Q.debug("[DataGrid] Ignoring stale refresh response");
      return;
    }
    Q.debug("[DataGrid] API Response:", s), Q.debug("[DataGrid] API Response data array:", s.data), Q.debug("[DataGrid] API Response total:", s.total, "count:", s.count, "$meta:", s.$meta);
    const a = s.data || s.records || [];
    if (e.handleGroupedModePayloadFallback(a)) return;
    e.lastSchema = s.schema || null, e.lastForm = s.form || null, e.setBulkActionState(s.$meta?.bulk_action_state || null, s.schema?.bulk_action_state_config || null);
    const o = e.getResponseTotal(s);
    if (e.normalizePagination(o)) {
      if (typeof e.requestRefreshAfterCurrent == "function") {
        e.requestRefreshAfterCurrent();
        return;
      }
      return e.refresh();
    }
    Q.debug("[DataGrid] About to call renderData()..."), e.renderData(s), Q.debug("[DataGrid] renderData() completed"), e.updatePaginationUI(s), e.updateBulkActionsBar(), Q.debug("[DataGrid] ===== refresh() COMPLETED =====");
  } catch (r) {
    if (r instanceof Error && r.name === "AbortError") {
      Q.debug("[DataGrid] Request aborted");
      return;
    }
    Q.error("[DataGrid] Error fetching data:", r);
    const n = "Failed to load data";
    e.renderErrorState(n), e.setRenderState("error"), e.showError(n);
  }
}
function Eo(e) {
  const t = new URLSearchParams(), r = e.buildQueryParams();
  Object.entries(r).forEach(([i, s]) => {
    s != null && t.append(i, String(s));
  });
  const n = `${e.config.apiEndpoint}?${t.toString()}`;
  return Q.debug(`[DataGrid] API URL: ${n}`), n;
}
function Ao(e) {
  const t = new URLSearchParams(), r = e.buildQueryParams();
  return Object.entries(r).forEach(([n, i]) => {
    i != null && t.append(n, String(i));
  }), t.toString();
}
function $o(e) {
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
function ko(e, t) {
  return t.total !== void 0 && t.total !== null ? t.total : t.$meta?.count !== void 0 && t.$meta?.count !== null ? t.$meta.count : t.count !== void 0 && t.count !== null ? t.count : null;
}
function _o(e, t) {
  if (t === null) return !1;
  const r = Math.max(1, e.state.perPage || e.config.perPage || 10), n = Math.max(1, Math.ceil(t / r));
  let i = e.state.currentPage;
  t === 0 ? i = 1 : i > n ? i = n : i < 1 && (i = 1);
  const s = r !== e.state.perPage || i !== e.state.currentPage;
  return s && (e.state.perPage = r, e.state.currentPage = i, e.pushStateToURL()), t === 0 ? !1 : s;
}
async function Lo(e, t) {
  const r = await U(`${e.config.apiEndpoint}/${t}`, {
    method: "GET",
    accept: "application/json"
  });
  if (!r.ok) throw new Error(`Detail request failed: ${r.status}`);
  const n = await r.json(), i = e.normalizeDetailResponse(n);
  return i.schema && (e.lastSchema = i.schema), i.form && (e.lastForm = i.form), {
    ...i,
    tabs: i.schema?.tabs || []
  };
}
function Do(e, t) {
  const r = si(t) || t;
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
function To(e) {
  return e.lastSchema;
}
function Ro(e) {
  return e.lastForm;
}
function Po(e) {
  return e.lastSchema?.tabs || [];
}
function cn(e) {
  return typeof e.config.rowActions == "function" || e.config.useDefaultActions !== !1;
}
function xt(e) {
  return (cn(e) ? 1 : 0) + (e.isCapabilityEnabled("selection") ? 1 : 0);
}
function Li(e) {
  return Math.max(1, (e.config.columns?.length || 0) + xt(e));
}
var Di = M("DataGrid");
function Mo(e, t, r, n) {
  const i = e.config.groupByField || "family_id", s = r.filter((c) => !!c && typeof c == "object" && !Array.isArray(c));
  let a = qa(s, {
    groupByField: i,
    defaultExpanded: !e.state.hasPersistedExpandState,
    expandMode: e.state.expandMode,
    expandedGroups: e.state.expandedGroups
  });
  a || (a = Fa(s, {
    groupByField: i,
    defaultExpanded: !e.state.hasPersistedExpandState,
    expandMode: e.state.expandMode,
    expandedGroups: e.state.expandedGroups
  }));
  const o = Ka(t);
  o.size > 0 && (a = Va(a, o)), e.state.groupedData = a;
  const l = e.config.columns.length;
  for (const c of a.groups) {
    const d = no(c, l, { fixedColumnCount: xt(e) });
    n.insertAdjacentHTML("beforeend", d);
    const f = n.lastElementChild;
    f && (f.addEventListener("click", () => e.toggleGroup(c.groupId)), f.addEventListener("keydown", (h) => {
      (h.key === "Enter" || h.key === " ") && (h.preventDefault(), e.toggleGroup(c.groupId));
    }));
    for (const h of c.records) {
      h.id && (e.recordsById[h.id] = h);
      const p = e.createTableRow(h);
      p.dataset.groupId = c.groupId, p.classList.add("group-child-row"), c.expanded || (p.style.display = "none"), n.appendChild(p);
    }
  }
  for (const c of a.ungrouped) {
    c.id && (e.recordsById[c.id] = c);
    const d = e.createTableRow(c);
    n.appendChild(d);
  }
  Di.debug(`[DataGrid] Rendered ${a.groups.length} groups, ${a.ungrouped.length} ungrouped`);
}
function Io(e) {
  return e.config.enableGroupedMode ? e.state.viewMode === "grouped" || e.state.viewMode === "matrix" : !1;
}
function Bo(e, t) {
  e.isGroupedViewActive() && (e.state.viewMode = "flat", e.state.groupedData = null, e.pushStateToURL({ replace: !0 }), e.notify(t, "warning"), e.refresh());
}
function Oo(e, t) {
  return !e.isGroupedViewActive() || ![
    400,
    404,
    405,
    422
  ].includes(t) ? !1 : (e.fallbackGroupedMode("Grouped pagination is not supported by this panel. Switched to flat view."), !0);
}
function Fo(e, t) {
  if (!e.isGroupedViewActive() || t.length === 0) return !1;
  const r = t.filter((n) => !!n && typeof n == "object" && !Array.isArray(n));
  return r.length !== t.length || !bi(r) ? (e.fallbackGroupedMode("Grouped pagination contract is unavailable. Switched to flat view to avoid split groups."), !0) : !1;
}
function qo(e, t) {
  if (!e.state.groupedData) return;
  const r = String(t || "").trim();
  if (!r) return;
  const n = e.isGroupExpandedByState(r, !e.state.hasPersistedExpandState);
  e.state.expandMode === "all" ? n ? e.state.expandedGroups.add(r) : e.state.expandedGroups.delete(r) : e.state.expandMode === "none" ? n ? e.state.expandedGroups.delete(r) : e.state.expandedGroups.add(r) : (!e.state.hasPersistedExpandState && e.state.expandedGroups.size === 0 && (e.state.expandedGroups = new Set(e.state.groupedData.groups.map((s) => s.groupId))), e.state.expandedGroups.has(r) ? e.state.expandedGroups.delete(r) : e.state.expandedGroups.add(r)), e.state.hasPersistedExpandState = !0;
  const i = e.state.groupedData.groups.find((s) => s.groupId === r);
  i && (i.expanded = e.isGroupExpandedByState(r)), e.updateGroupVisibility(r), e.pushStateToURL({ replace: !0 });
}
function No(e, t) {
  if (!e.config.enableGroupedMode) return;
  const r = new Set((t || []).map((n) => String(n || "").trim()).filter(Boolean));
  e.state.expandMode = "explicit", e.state.expandedGroups = r, e.state.hasPersistedExpandState = !0, e.updateGroupedRowsFromState(), e.pushStateToURL({ replace: !0 }), !e.state.groupedData && e.isGroupedViewActive() && e.refresh();
}
function jo(e) {
  e.config.enableGroupedMode && (e.state.expandMode = "all", e.state.expandedGroups.clear(), e.state.hasPersistedExpandState = !0, e.updateGroupedRowsFromState(), e.pushStateToURL({ replace: !0 }), !e.state.groupedData && e.isGroupedViewActive() && e.refresh());
}
function zo(e) {
  e.config.enableGroupedMode && (e.state.expandMode = "none", e.state.expandedGroups.clear(), e.state.hasPersistedExpandState = !0, e.updateGroupedRowsFromState(), e.pushStateToURL({ replace: !0 }), !e.state.groupedData && e.isGroupedViewActive() && e.refresh());
}
function Go(e, t) {
  const r = e.tableEl?.querySelector("tbody");
  if (!r) return;
  const n = r.querySelector(`tr[data-group-id="${t}"]`);
  if (!n) return;
  const i = e.isGroupExpandedByState(t);
  n.dataset.expanded = String(i), n.setAttribute("aria-expanded", String(i));
  const s = n.querySelector(".expand-icon");
  s && (s.textContent = i ? "▼" : "▶"), r.querySelectorAll(`tr.group-child-row[data-group-id="${t}"]`).forEach((a) => {
    a.style.display = i ? "" : "none";
  });
}
function Uo(e) {
  if (e.state.groupedData)
    for (const t of e.state.groupedData.groups)
      t.expanded = e.isGroupExpandedByState(t.groupId), e.updateGroupVisibility(t.groupId);
}
function Ho(e, t, r = !1) {
  const n = wt(e.state.expandMode, "explicit");
  return n === "all" ? !e.state.expandedGroups.has(t) : n === "none" ? e.state.expandedGroups.has(t) : e.state.expandedGroups.size === 0 ? r : e.state.expandedGroups.has(t);
}
function Vo(e, t) {
  if (!e.config.enableGroupedMode) {
    Di.warn("[DataGrid] Grouped mode not enabled");
    return;
  }
  const r = an(t);
  e.state.viewMode = r, r === "flat" && (e.state.groupedData = null), e.pushStateToURL(), e.refresh();
}
function Ko(e) {
  return e.state.viewMode;
}
function Jo(e) {
  return e.state.groupedData;
}
function Yo(e) {
  return {
    textCode: null,
    message: e,
    metadata: null,
    fields: null,
    validationErrors: null
  };
}
async function Wo(e) {
  const t = String(e.confirmMessage || "Are you sure you want to delete this item?").trim() || "Are you sure you want to delete this item?", r = String(e.confirmTitle || "Confirm Delete").trim() || "Confirm Delete";
  if (e.notifier?.confirm) return e.notifier.confirm(t, {
    title: r,
    confirmText: "Delete",
    cancelText: "Cancel"
  });
  const n = globalThis.window;
  return n && typeof n.confirm == "function" ? n.confirm(t) : !0;
}
async function Ti(e) {
  if (!await Wo(e)) return null;
  const t = await Wn(e.endpoint, {
    method: "DELETE",
    headers: { Accept: "application/json" }
  });
  if (t.success)
    return await e.onSuccess?.(t), t;
  const r = String(e.fallbackMessage || "Delete failed").trim() || "Delete failed", n = t.error || Yo(r), i = {
    ...n,
    message: We(n, r)
  };
  throw i.textCode && e.reconcileOnDomainFailure && await e.reconcileOnDomainFailure(i), await e.onError?.(i), Ft(i, r, !!e.onError);
}
var Xo = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
  <g transform="translate(2.16665 6.83333)">
    <path d="M7 1.16667C7 1.811 6.47767 2.33333 5.83333 2.33333C5.189 2.33333 4.66667 1.811 4.66667 1.16667C4.66667 0.522334 5.189 0 5.83333 0C6.47767 0 7 0.522334 7 1.16667Z" fill="currentColor"/>
    <path d="M11.6667 1.16667C11.6667 1.811 11.1443 2.33333 10.5 2.33333C9.85567 2.33333 9.33333 1.811 9.33333 1.16667C9.33333 0.522334 9.85567 0 10.5 0C11.1443 0 11.6667 0.522334 11.6667 1.16667Z" fill="currentColor"/>
    <path d="M2.33333 1.16667C2.33333 1.811 1.811 2.33333 1.16667 2.33333C0.522334 2.33333 0 1.811 0 1.16667C0 0.522334 0.522334 0 1.16667 0C1.811 0 2.33333 0.522334 2.33333 1.16667Z" fill="currentColor"/>
  </g>
</svg>
`, Fe = M("DataGrid");
function Qo(e, t, r = !1) {
  if (!e.tableEl) return;
  const n = new Set(t);
  e.state.hiddenColumns.clear(), e.config.columns.forEach((i) => {
    n.has(i.field) || e.state.hiddenColumns.add(i.field);
  }), r || e.pushStateToURL(), e.tableEl.querySelectorAll("thead th[data-column]").forEach((i) => {
    const s = i.dataset.column;
    s && (i.style.display = n.has(s) ? "" : "none");
  }), e.tableEl.querySelectorAll("tbody td[data-column]").forEach((i) => {
    const s = i.dataset.column;
    s && (i.style.display = n.has(s) ? "" : "none");
  }), e.syncColumnVisibilityCheckboxes();
}
function Zo(e) {
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
function Ri(e) {
  e.querySelectorAll("[data-datagrid-state]").forEach((t) => t.remove());
}
function el(e) {
  !e.tableEl || cn(e) || e.tableEl.querySelectorAll('thead [data-role="actions"]').forEach((t) => t.remove());
}
function Pi(e, t, r) {
  const n = document.createElement("tr");
  n.className = "admin-datagrid__state-row", n.dataset.datagridState = t;
  const i = document.createElement("td");
  return i.colSpan = Li(e), i.className = `admin-datagrid__state admin-datagrid__state--${t} px-6 py-8 text-center`, i.setAttribute("role", t === "error" ? "alert" : "status"), i.setAttribute("aria-live", t === "error" ? "assertive" : "polite"), i.textContent = r, n.appendChild(i), n;
}
function tl(e) {
  const t = e.tableEl?.querySelector("tbody");
  if (t && (Ri(t), !(t.children.length > 0))) {
    if (e.isGroupedViewActive()) {
      t.insertAdjacentHTML("beforeend", so(e.config.columns.length, xt(e)));
      return;
    }
    t.appendChild(Pi(e, "loading", "Loading…"));
  }
}
function rl(e, t) {
  const r = e.tableEl?.querySelector("tbody");
  if (r) {
    if (Ri(r), e.isGroupedViewActive()) {
      r.insertAdjacentHTML("afterbegin", ao(e.config.columns.length, t, void 0, xt(e)));
      return;
    }
    r.prepend(Pi(e, "error", t));
  }
}
function nl(e, t) {
  const r = e.tableEl?.querySelector("tbody");
  if (!r) {
    Fe.error("[DataGrid] tbody not found!");
    return;
  }
  e.actionMenuController?.closeAll(), r.innerHTML = "";
  const n = t.data || t.records || [];
  Fe.debug(`[DataGrid] renderData() called with ${n.length} items`), Fe.debug("[DataGrid] First 3 items:", n.slice(0, 3));
  const i = e.getResponseTotal(t);
  if (e.state.totalRows = i ?? n.length, n.length === 0) {
    e.isGroupedViewActive() ? r.innerHTML = io(e.config.columns.length, xt(e)) : r.innerHTML = `
          <tr class="admin-datagrid__state-row" data-datagrid-state="empty">
            <td colspan="${Li(e)}" class="admin-datagrid__state admin-datagrid__state--empty px-6 py-8 text-center text-gray-500">
              No results found
            </td>
          </tr>
        `, e.setRenderState("empty");
    return;
  }
  e.recordsById = /* @__PURE__ */ Object.create(null), e.isGroupedViewActive() ? e.renderGroupedData(t, n, r) : e.renderFlatData(n, r), e.state.hiddenColumns.size > 0 && r.querySelectorAll("td[data-column]").forEach((s) => {
    const a = s.dataset.column;
    a && e.state.hiddenColumns.has(a) && (s.style.display = "none");
  }), e.isCapabilityEnabled("selection") && e.updateSelectionBindings(), e.setRenderState("ready");
}
function il(e, t, r) {
  t.forEach((n, i) => {
    Fe.debug(`[DataGrid] Rendering row ${i + 1}: id=${n.id}`), n.id && (e.recordsById[n.id] = n);
    const s = e.createTableRow(n);
    r.appendChild(s);
  }), Fe.debug(`[DataGrid] Finished appending ${t.length} rows to tbody`), Fe.debug("[DataGrid] tbody.children.length =", r.children.length);
}
function sl(e, t) {
  const r = t.rendererOptions ?? t.renderer_options;
  return !r || typeof r != "object" || Array.isArray(r) ? {} : r;
}
function al(e, t) {
  const r = document.createElement("tr");
  let n = ["admin-datagrid__row", "hover:bg-gray-50"];
  if (e.config.rowClassProvider && (n = n.concat(e.config.rowClassProvider(t))), r.className = n.join(" "), e.isCapabilityEnabled("selection")) {
    const o = document.createElement("td");
    o.className = "admin-datagrid__cell px-6 py-4 whitespace-nowrap", o.dataset.role = "selection", o.dataset.fixed = "left", o.innerHTML = `
        <label class="flex">
          <input type="checkbox"
                 class="table-checkbox shrink-0 border-gray-300 rounded text-blue-600 focus:ring-blue-500"
                 data-id="${v(t.id)}">
          <span class="sr-only">Select</span>
        </label>
      `, r.appendChild(o);
  }
  if (e.config.columns.forEach((o) => {
    const l = document.createElement("td");
    l.className = "admin-datagrid__cell px-6 py-4 whitespace-nowrap text-sm text-gray-800", l.setAttribute("data-column", o.field);
    const c = t[o.field], d = typeof o.renderer == "string" ? o.renderer.trim() : "", f = { options: e.resolveRendererOptions(o) };
    if (o.render) l.innerHTML = o.render(c, t);
    else if (e.cellRendererRegistry.has(o.field)) l.innerHTML = e.cellRendererRegistry.get(o.field)(c, t, o.field, f);
    else if (d && e.cellRendererRegistry.has(d)) l.innerHTML = e.cellRendererRegistry.get(d)(c, t, o.field, f);
    else if (c == null) l.textContent = "-";
    else if (o.field.includes("_at")) {
      const h = Ot(c);
      l.textContent = h ? h.toLocaleDateString() : String(c);
    } else l.textContent = String(c);
    r.appendChild(l);
  }), !cn(e)) return r;
  const i = e.config.actionBasePath || e.config.apiEndpoint, s = document.createElement("td");
  s.className = "admin-datagrid__cell admin-datagrid__actions px-6 py-4 whitespace-nowrap text-end text-sm font-medium", s.dataset.role = "actions", s.dataset.fixed = "right";
  const a = (o) => {
    s.innerHTML = e.actionRenderer.renderRowActions(t, o), e.actionRenderer.attachRowActionListeners(s, o, t, { onError: async (l, c) => {
      if (ot(l)?.textCode && await e.refresh(), !Be(l)) {
        const d = l instanceof Error ? l.message : `Action "${c.label}" failed`;
        e.notify(d, "error");
      }
    } });
  };
  return e.config.rowActions ? a(e.config.rowActions(t)) : e.config.useDefaultActions !== !1 && a([
    {
      label: "View",
      icon: "eye",
      action: () => {
        window.location.href = `${i}/${t.id}`;
      },
      variant: "secondary"
    },
    {
      label: "Edit",
      icon: "edit",
      action: () => {
        window.location.href = `${i}/${t.id}/edit`;
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
  ]), r.appendChild(s), r;
}
function ol(e, t) {
  return t.toLowerCase().replace(/[^a-z0-9]/g, "-");
}
async function ll(e, t) {
  try {
    await Ti({
      endpoint: `${e.config.apiEndpoint}/${t}`,
      confirmMessage: "Are you sure you want to delete this item?",
      confirmTitle: "Confirm Delete",
      onSuccess: async () => {
        await e.refresh();
      },
      onError: (r) => {
        e.showError(We(r, "Delete failed"));
      },
      reconcileOnDomainFailure: async () => {
        await e.refresh();
      },
      notifier: { confirm: async (r, n) => e.confirmAction(r, n) }
    });
  } catch (r) {
    Fe.error("Error deleting item:", r), Be(r) || e.showError(r instanceof Error ? r.message : "Failed to delete item");
  }
}
function cl(e, t) {
  const r = e.getResponseTotal(t) ?? e.state.totalRows, n = e.state.perPage * (e.state.currentPage - 1), i = r === 0 ? 0 : n + 1, s = Math.min(n + e.state.perPage, r), a = document.querySelector(e.selectors.tableInfoStart), o = document.querySelector(e.selectors.tableInfoEnd), l = document.querySelector(e.selectors.tableInfoTotal), c = e.selectors.tableInfoSummary ? document.querySelector(e.selectors.tableInfoSummary) : null;
  if (a && (a.textContent = qe(e, i)), o && (o.textContent = qe(e, s)), l && (l.textContent = qe(e, r)), c) {
    const d = hl(e, i, s, r);
    d !== null && (c.textContent = d);
  }
  e.renderPaginationButtons(r);
}
function dl(e, t) {
  const r = document.querySelector(e.selectors.paginationContainer);
  if (!r) return;
  const n = e.config.pagination?.mode === "semantic";
  (r.closest?.("[data-datagrid-pagination]") || r).classList?.toggle("admin-datagrid__pagination--presented", n);
  const i = Math.ceil(t / e.state.perPage);
  if (i <= 1) {
    r.innerHTML = "";
    return;
  }
  const s = e.state.currentPage;
  r.innerHTML = (n ? ul(e, i, s) : fl(i, s)).join(""), r.querySelectorAll("[data-page]").forEach((a) => {
    a.addEventListener("click", async () => {
      const o = parseInt(a.dataset.page || "1", 10);
      o >= 1 && o <= i && (e.state.currentPage = o, e.pushStateToURL(), e.config.behaviors?.pagination ? await e.config.behaviors.pagination.onPageChange(o, e) : await e.refresh());
    });
  });
}
function ul(e, t, r) {
  const n = [], i = {
    previous: Ie(e.config.pagination?.labels?.previous, "Previous"),
    next: Ie(e.config.pagination?.labels?.next, "Next"),
    previousPage: Ie(e.config.pagination?.labels?.previousPage, "Previous page"),
    nextPage: Ie(e.config.pagination?.labels?.nextPage, "Next page"),
    page: Ie(e.config.pagination?.labels?.page, "Page {page}")
  };
  n.push(`
      <button type="button"
              data-page="${r - 1}"
              aria-label="${v(i.previousPage)}"
              ${r === 1 ? "disabled" : ""}
              class="admin-datagrid__page-button admin-datagrid__page-button--boundary">
        <span>${u(i.previous)}</span>
      </button>
    `);
  for (const s of Mi(t, r)) {
    if (s === "ellipsis") {
      n.push(`<span class="admin-datagrid__page-ellipsis" aria-hidden="true">${Xo}</span>`);
      continue;
    }
    const a = s === r, o = qe(e, s), l = i.page.includes("{page}") ? i.page.replace("{page}", o) : `${i.page} ${o}`;
    n.push(`
        <button type="button"
                data-page="${s}"
                aria-label="${v(l)}"
                ${a ? 'aria-current="page"' : ""}
                class="admin-datagrid__page-button admin-datagrid__page-button--page${a ? " admin-datagrid__page-button--active" : ""}">
          ${u(o)}
        </button>
      `);
  }
  return n.push(`
      <button type="button"
              data-page="${r + 1}"
              aria-label="${v(i.nextPage)}"
              ${r === t ? "disabled" : ""}
              class="admin-datagrid__page-button admin-datagrid__page-button--boundary">
        <span>${u(i.next)}</span>
      </button>
    `), n;
}
function fl(e, t) {
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
  for (const n of Mi(e, t)) {
    if (n === "ellipsis") {
      r.push('<span class="admin-datagrid__page-ellipsis min-w-[24px] text-center text-gray-500" aria-hidden="true">…</span>');
      continue;
    }
    const i = n === t;
    r.push(`
      <button type="button"
              data-page="${n}"
              aria-label="Page ${n}"
              ${i ? 'aria-current="page"' : ""}
              class="min-h-[38px] min-w-[38px] flex justify-center items-center ${i ? "bg-gray-200 text-gray-800 focus:outline-none focus:bg-gray-300" : "text-gray-800 hover:bg-gray-100 focus:outline-none focus:bg-gray-100"} admin-datagrid__page-button py-2 px-3 text-sm rounded-lg">
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
function Ie(e, t) {
  return typeof e == "string" && e.trim() ? e.trim() : t;
}
function hl(e, t, r, n) {
  const i = e.config.pagination?.labels?.summary;
  if (!i || typeof i != "object") return null;
  let s = n === 1 ? "one" : "other";
  try {
    s = new Intl.PluralRules(e.config.pagination?.locale).select(n);
  } catch {
  }
  const a = Ie(i[s], Ie(i.other, ""));
  if (!a) return null;
  const o = {
    start: qe(e, t),
    end: qe(e, r),
    total: qe(e, n)
  };
  return a.replace(/\{(start|end|total)\}/g, (l, c) => o[c]);
}
function qe(e, t) {
  const r = e.config.pagination?.locale;
  if (!r) return String(t);
  try {
    return new Intl.NumberFormat(r).format(t);
  } catch {
    return String(t);
  }
}
function Mi(e, t) {
  const r = Math.max(0, Math.floor(e)), n = Math.min(Math.max(1, Math.floor(t)), Math.max(r, 1));
  return r <= 7 ? Array.from({ length: r }, (i, s) => s + 1) : n <= 4 ? [
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
function $n(e, t) {
  var r = Object.keys(e);
  if (Object.getOwnPropertySymbols) {
    var n = Object.getOwnPropertySymbols(e);
    t && (n = n.filter(function(i) {
      return Object.getOwnPropertyDescriptor(e, i).enumerable;
    })), r.push.apply(r, n);
  }
  return r;
}
function ue(e) {
  for (var t = 1; t < arguments.length; t++) {
    var r = arguments[t] != null ? arguments[t] : {};
    t % 2 ? $n(Object(r), !0).forEach(function(n) {
      pl(e, n, r[n]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(r)) : $n(Object(r)).forEach(function(n) {
      Object.defineProperty(e, n, Object.getOwnPropertyDescriptor(r, n));
    });
  }
  return e;
}
function Tt(e) {
  "@babel/helpers - typeof";
  return typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? Tt = function(t) {
    return typeof t;
  } : Tt = function(t) {
    return t && typeof Symbol == "function" && t.constructor === Symbol && t !== Symbol.prototype ? "symbol" : typeof t;
  }, Tt(e);
}
function pl(e, t, r) {
  return t in e ? Object.defineProperty(e, t, {
    value: r,
    enumerable: !0,
    configurable: !0,
    writable: !0
  }) : e[t] = r, e;
}
function ge() {
  return ge = Object.assign || function(e) {
    for (var t = 1; t < arguments.length; t++) {
      var r = arguments[t];
      for (var n in r) Object.prototype.hasOwnProperty.call(r, n) && (e[n] = r[n]);
    }
    return e;
  }, ge.apply(this, arguments);
}
function ml(e, t) {
  if (e == null) return {};
  var r = {}, n = Object.keys(e), i, s;
  for (s = 0; s < n.length; s++)
    i = n[s], !(t.indexOf(i) >= 0) && (r[i] = e[i]);
  return r;
}
function gl(e, t) {
  if (e == null) return {};
  var r = ml(e, t), n, i;
  if (Object.getOwnPropertySymbols) {
    var s = Object.getOwnPropertySymbols(e);
    for (i = 0; i < s.length; i++)
      n = s[i], !(t.indexOf(n) >= 0) && Object.prototype.propertyIsEnumerable.call(e, n) && (r[n] = e[n]);
  }
  return r;
}
var bl = "1.15.6";
function me(e) {
  if (typeof window < "u" && window.navigator) return !!/* @__PURE__ */ navigator.userAgent.match(e);
}
var ye = me(/(?:Trident.*rv[ :]?11\.|msie|iemobile|Windows Phone)/i), St = me(/Edge/i), kn = me(/firefox/i), ct = me(/safari/i) && !me(/chrome/i) && !me(/android/i), dn = me(/iP(ad|od|hone)/i), Ii = me(/chrome/i) && me(/android/i), Bi = {
  capture: !1,
  passive: !1
};
function k(e, t, r) {
  e.addEventListener(t, r, !ye && Bi);
}
function $(e, t, r) {
  e.removeEventListener(t, r, !ye && Bi);
}
function jt(e, t) {
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
function Oi(e) {
  return e.host && e !== document && e.host.nodeType ? e.host : e.parentNode;
}
function ne(e, t, r, n) {
  if (e) {
    r = r || document;
    do {
      if (t != null && (t[0] === ">" ? e.parentNode === r && jt(e, t) : jt(e, t)) || n && e === r) return e;
      if (e === r) break;
    } while (e = Oi(e));
  }
  return null;
}
var _n = /\s+/g;
function J(e, t, r) {
  e && t && (e.classList ? e.classList[r ? "add" : "remove"](t) : e.className = ((" " + e.className + " ").replace(_n, " ").replace(" " + t + " ", " ") + (r ? " " + t : "")).replace(_n, " "));
}
function S(e, t, r) {
  var n = e && e.style;
  if (n) {
    if (r === void 0)
      return document.defaultView && document.defaultView.getComputedStyle ? r = document.defaultView.getComputedStyle(e, "") : e.currentStyle && (r = e.currentStyle), t === void 0 ? r : r[t];
    !(t in n) && t.indexOf("webkit") === -1 && (t = "-webkit-" + t), n[t] = r + (typeof r == "string" ? "" : "px");
  }
}
function Ye(e, t) {
  var r = "";
  if (typeof e == "string") r = e;
  else do {
    var n = S(e, "transform");
    n && n !== "none" && (r = n + " " + r);
  } while (!t && (e = e.parentNode));
  var i = window.DOMMatrix || window.WebKitCSSMatrix || window.CSSMatrix || window.MSCSSMatrix;
  return i && new i(r);
}
function Fi(e, t, r) {
  if (e) {
    var n = e.getElementsByTagName(t), i = 0, s = n.length;
    if (r) for (; i < s; i++) r(n[i], i);
    return n;
  }
  return [];
}
function ce() {
  var e = document.scrollingElement;
  return e || document.documentElement;
}
function B(e, t, r, n, i) {
  if (!(!e.getBoundingClientRect && e !== window)) {
    var s, a, o, l, c, d, f;
    if (e !== window && e.parentNode && e !== ce() ? (s = e.getBoundingClientRect(), a = s.top, o = s.left, l = s.bottom, c = s.right, d = s.height, f = s.width) : (a = 0, o = 0, l = window.innerHeight, c = window.innerWidth, d = window.innerHeight, f = window.innerWidth), (t || r) && e !== window && (i = i || e.parentNode, !ye))
      do
        if (i && i.getBoundingClientRect && (S(i, "transform") !== "none" || r && S(i, "position") !== "static")) {
          var h = i.getBoundingClientRect();
          a -= h.top + parseInt(S(i, "border-top-width")), o -= h.left + parseInt(S(i, "border-left-width")), l = a + s.height, c = o + s.width;
          break;
        }
      while (i = i.parentNode);
    if (n && e !== window) {
      var p = Ye(i || e), m = p && p.a, g = p && p.d;
      p && (a /= g, o /= m, f /= m, d /= g, l = a + d, c = o + f);
    }
    return {
      top: a,
      left: o,
      bottom: l,
      right: c,
      width: f,
      height: d
    };
  }
}
function Ln(e, t, r) {
  for (var n = Ce(e, !0), i = B(e)[t]; n; ) {
    var s = B(n)[r], a = void 0;
    if (r === "top" || r === "left" ? a = i >= s : a = i <= s, !a) return n;
    if (n === ce()) break;
    n = Ce(n, !1);
  }
  return !1;
}
function Xe(e, t, r, n) {
  for (var i = 0, s = 0, a = e.children; s < a.length; ) {
    if (a[s].style.display !== "none" && a[s] !== C.ghost && (n || a[s] !== C.dragged) && ne(a[s], r.draggable, e, !1)) {
      if (i === t) return a[s];
      i++;
    }
    s++;
  }
  return null;
}
function un(e, t) {
  for (var r = e.lastElementChild; r && (r === C.ghost || S(r, "display") === "none" || t && !jt(r, t)); ) r = r.previousElementSibling;
  return r || null;
}
function Z(e, t) {
  var r = 0;
  if (!e || !e.parentNode) return -1;
  for (; e = e.previousElementSibling; ) e.nodeName.toUpperCase() !== "TEMPLATE" && e !== C.clone && (!t || jt(e, t)) && r++;
  return r;
}
function Dn(e) {
  var t = 0, r = 0, n = ce();
  if (e) do {
    var i = Ye(e), s = i.a, a = i.d;
    t += e.scrollLeft * s, r += e.scrollTop * a;
  } while (e !== n && (e = e.parentNode));
  return [t, r];
}
function yl(e, t) {
  for (var r in e)
    if (e.hasOwnProperty(r)) {
      for (var n in t) if (t.hasOwnProperty(n) && t[n] === e[r][n]) return Number(r);
    }
  return -1;
}
function Ce(e, t) {
  if (!e || !e.getBoundingClientRect) return ce();
  var r = e, n = !1;
  do
    if (r.clientWidth < r.scrollWidth || r.clientHeight < r.scrollHeight) {
      var i = S(r);
      if (r.clientWidth < r.scrollWidth && (i.overflowX == "auto" || i.overflowX == "scroll") || r.clientHeight < r.scrollHeight && (i.overflowY == "auto" || i.overflowY == "scroll")) {
        if (!r.getBoundingClientRect || r === document.body) return ce();
        if (n || t) return r;
        n = !0;
      }
    }
  while (r = r.parentNode);
  return ce();
}
function vl(e, t) {
  if (e && t)
    for (var r in t) t.hasOwnProperty(r) && (e[r] = t[r]);
  return e;
}
function lr(e, t) {
  return Math.round(e.top) === Math.round(t.top) && Math.round(e.left) === Math.round(t.left) && Math.round(e.height) === Math.round(t.height) && Math.round(e.width) === Math.round(t.width);
}
var dt;
function qi(e, t) {
  return function() {
    if (!dt) {
      var r = arguments, n = this;
      r.length === 1 ? e.call(n, r[0]) : e.apply(n, r), dt = setTimeout(function() {
        dt = void 0;
      }, t);
    }
  };
}
function wl() {
  clearTimeout(dt), dt = void 0;
}
function Ni(e, t, r) {
  e.scrollLeft += t, e.scrollTop += r;
}
function ji(e) {
  var t = window.Polymer, r = window.jQuery || window.Zepto;
  return t && t.dom ? t.dom(e).cloneNode(!0) : r ? r(e).clone(!0)[0] : e.cloneNode(!0);
}
function zi(e, t, r) {
  var n = {};
  return Array.from(e.children).forEach(function(i) {
    var s, a, o, l;
    if (!(!ne(i, t.draggable, e, !1) || i.animated || i === r)) {
      var c = B(i);
      n.left = Math.min((s = n.left) !== null && s !== void 0 ? s : 1 / 0, c.left), n.top = Math.min((a = n.top) !== null && a !== void 0 ? a : 1 / 0, c.top), n.right = Math.max((o = n.right) !== null && o !== void 0 ? o : -1 / 0, c.right), n.bottom = Math.max((l = n.bottom) !== null && l !== void 0 ? l : -1 / 0, c.bottom);
    }
  }), n.width = n.right - n.left, n.height = n.bottom - n.top, n.x = n.left, n.y = n.top, n;
}
var K = "Sortable" + (/* @__PURE__ */ new Date()).getTime();
function xl() {
  var e = [], t;
  return {
    captureAnimationState: function() {
      e = [], this.options.animation && [].slice.call(this.el.children).forEach(function(n) {
        if (!(S(n, "display") === "none" || n === C.ghost)) {
          e.push({
            target: n,
            rect: B(n)
          });
          var i = ue({}, e[e.length - 1].rect);
          if (n.thisAnimationDuration) {
            var s = Ye(n, !0);
            s && (i.top -= s.f, i.left -= s.e);
          }
          n.fromRect = i;
        }
      });
    },
    addAnimationState: function(n) {
      e.push(n);
    },
    removeAnimationState: function(n) {
      e.splice(yl(e, { target: n }), 1);
    },
    animateAll: function(n) {
      var i = this;
      if (!this.options.animation) {
        clearTimeout(t), typeof n == "function" && n();
        return;
      }
      var s = !1, a = 0;
      e.forEach(function(o) {
        var l = 0, c = o.target, d = c.fromRect, f = B(c), h = c.prevFromRect, p = c.prevToRect, m = o.rect, g = Ye(c, !0);
        g && (f.top -= g.f, f.left -= g.e), c.toRect = f, c.thisAnimationDuration && lr(h, f) && !lr(d, f) && (m.top - f.top) / (m.left - f.left) === (d.top - f.top) / (d.left - f.left) && (l = Cl(m, h, p, i.options)), lr(f, d) || (c.prevFromRect = d, c.prevToRect = f, l || (l = i.options.animation), i.animate(c, m, f, l)), l && (s = !0, a = Math.max(a, l), clearTimeout(c.animationResetTimer), c.animationResetTimer = setTimeout(function() {
          c.animationTime = 0, c.prevFromRect = null, c.fromRect = null, c.prevToRect = null, c.thisAnimationDuration = null;
        }, l), c.thisAnimationDuration = l);
      }), clearTimeout(t), s ? t = setTimeout(function() {
        typeof n == "function" && n();
      }, a) : typeof n == "function" && n(), e = [];
    },
    animate: function(n, i, s, a) {
      if (a) {
        S(n, "transition", ""), S(n, "transform", "");
        var o = Ye(this.el), l = o && o.a, c = o && o.d, d = (i.left - s.left) / (l || 1), f = (i.top - s.top) / (c || 1);
        n.animatingX = !!d, n.animatingY = !!f, S(n, "transform", "translate3d(" + d + "px," + f + "px,0)"), this.forRepaintDummy = Sl(n), S(n, "transition", "transform " + a + "ms" + (this.options.easing ? " " + this.options.easing : "")), S(n, "transform", "translate3d(0,0,0)"), typeof n.animated == "number" && clearTimeout(n.animated), n.animated = setTimeout(function() {
          S(n, "transition", ""), S(n, "transform", ""), n.animated = !1, n.animatingX = !1, n.animatingY = !1;
        }, a);
      }
    }
  };
}
function Sl(e) {
  return e.offsetWidth;
}
function Cl(e, t, r, n) {
  return Math.sqrt(Math.pow(t.top - e.top, 2) + Math.pow(t.left - e.left, 2)) / Math.sqrt(Math.pow(t.top - r.top, 2) + Math.pow(t.left - r.left, 2)) * n.animation;
}
var Ge = [], cr = { initializeByDefault: !0 }, Ct = {
  mount: function(t) {
    for (var r in cr) cr.hasOwnProperty(r) && !(r in t) && (t[r] = cr[r]);
    Ge.forEach(function(n) {
      if (n.pluginName === t.pluginName) throw "Sortable: Cannot mount plugin ".concat(t.pluginName, " more than once");
    }), Ge.push(t);
  },
  pluginEvent: function(t, r, n) {
    var i = this;
    this.eventCanceled = !1, n.cancel = function() {
      i.eventCanceled = !0;
    };
    var s = t + "Global";
    Ge.forEach(function(a) {
      r[a.pluginName] && (r[a.pluginName][s] && r[a.pluginName][s](ue({ sortable: r }, n)), r.options[a.pluginName] && r[a.pluginName][t] && r[a.pluginName][t](ue({ sortable: r }, n)));
    });
  },
  initializePlugins: function(t, r, n, i) {
    Ge.forEach(function(o) {
      var l = o.pluginName;
      if (!(!t.options[l] && !o.initializeByDefault)) {
        var c = new o(t, r, t.options);
        c.sortable = t, c.options = t.options, t[l] = c, ge(n, c.defaults);
      }
    });
    for (var s in t.options)
      if (t.options.hasOwnProperty(s)) {
        var a = this.modifyOption(t, s, t.options[s]);
        typeof a < "u" && (t.options[s] = a);
      }
  },
  getEventProperties: function(t, r) {
    var n = {};
    return Ge.forEach(function(i) {
      typeof i.eventProperties == "function" && ge(n, i.eventProperties.call(r[i.pluginName], t));
    }), n;
  },
  modifyOption: function(t, r, n) {
    var i;
    return Ge.forEach(function(s) {
      t[s.pluginName] && s.optionListeners && typeof s.optionListeners[r] == "function" && (i = s.optionListeners[r].call(t[s.pluginName], n));
    }), i;
  }
};
function El(e) {
  var t = e.sortable, r = e.rootEl, n = e.name, i = e.targetEl, s = e.cloneEl, a = e.toEl, o = e.fromEl, l = e.oldIndex, c = e.newIndex, d = e.oldDraggableIndex, f = e.newDraggableIndex, h = e.originalEvent, p = e.putSortable, m = e.extraEventProperties;
  if (t = t || r && r[K], !!t) {
    var g, y = t.options, w = "on" + n.charAt(0).toUpperCase() + n.substr(1);
    window.CustomEvent && !ye && !St ? g = new CustomEvent(n, {
      bubbles: !0,
      cancelable: !0
    }) : (g = document.createEvent("Event"), g.initEvent(n, !0, !0)), g.to = a || r, g.from = o || r, g.item = i || r, g.clone = s, g.oldIndex = l, g.newIndex = c, g.oldDraggableIndex = d, g.newDraggableIndex = f, g.originalEvent = h, g.pullMode = p ? p.lastPutMode : void 0;
    var x = ue(ue({}, m), Ct.getEventProperties(n, t));
    for (var E in x) g[E] = x[E];
    r && r.dispatchEvent(g), y[w] && y[w].call(t, g);
  }
}
var Al = ["evt"], V = function(t, r) {
  var n = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {}, i = n.evt, s = gl(n, Al);
  Ct.pluginEvent.bind(C)(t, r, ue({
    dragEl: b,
    parentEl: R,
    ghostEl: A,
    rootEl: D,
    nextEl: Me,
    lastDownEl: Rt,
    cloneEl: T,
    cloneHidden: Se,
    dragStarted: nt,
    putSortable: j,
    activeSortable: C.active,
    originalEvent: i,
    oldIndex: Je,
    oldDraggableIndex: ut,
    newIndex: Y,
    newDraggableIndex: xe,
    hideGhostForTarget: Vi,
    unhideGhostForTarget: Ki,
    cloneNowHidden: function() {
      Se = !0;
    },
    cloneNowShown: function() {
      Se = !1;
    },
    dispatchSortableEvent: function(o) {
      H({
        sortable: r,
        name: o,
        originalEvent: i
      });
    }
  }, s));
};
function H(e) {
  El(ue({
    putSortable: j,
    cloneEl: T,
    targetEl: b,
    rootEl: D,
    oldIndex: Je,
    oldDraggableIndex: ut,
    newIndex: Y,
    newDraggableIndex: xe
  }, e));
}
var b, R, A, D, Me, Rt, T, Se, Je, Y, ut, xe, $t, j, He = !1, zt = !1, Gt = [], _e, re, dr, ur, Tn, Rn, nt, Ue, ft, ht = !1, kt = !1, Pt, G, fr = [], Ir = !1, Ut = [], Qt = typeof document < "u", _t = dn, Pn = St || ye ? "cssFloat" : "float", $l = Qt && !Ii && !dn && "draggable" in document.createElement("div"), Gi = (function() {
  if (Qt) {
    if (ye) return !1;
    var e = document.createElement("x");
    return e.style.cssText = "pointer-events:auto", e.style.pointerEvents === "auto";
  }
})(), Ui = function(t, r) {
  var n = S(t), i = parseInt(n.width) - parseInt(n.paddingLeft) - parseInt(n.paddingRight) - parseInt(n.borderLeftWidth) - parseInt(n.borderRightWidth), s = Xe(t, 0, r), a = Xe(t, 1, r), o = s && S(s), l = a && S(a), c = o && parseInt(o.marginLeft) + parseInt(o.marginRight) + B(s).width, d = l && parseInt(l.marginLeft) + parseInt(l.marginRight) + B(a).width;
  if (n.display === "flex") return n.flexDirection === "column" || n.flexDirection === "column-reverse" ? "vertical" : "horizontal";
  if (n.display === "grid") return n.gridTemplateColumns.split(" ").length <= 1 ? "vertical" : "horizontal";
  if (s && o.float && o.float !== "none") {
    var f = o.float === "left" ? "left" : "right";
    return a && (l.clear === "both" || l.clear === f) ? "vertical" : "horizontal";
  }
  return s && (o.display === "block" || o.display === "flex" || o.display === "table" || o.display === "grid" || c >= i && n[Pn] === "none" || a && n[Pn] === "none" && c + d > i) ? "vertical" : "horizontal";
}, kl = function(t, r, n) {
  var i = n ? t.left : t.top, s = n ? t.right : t.bottom, a = n ? t.width : t.height, o = n ? r.left : r.top, l = n ? r.right : r.bottom, c = n ? r.width : r.height;
  return i === o || s === l || i + a / 2 === o + c / 2;
}, _l = function(t, r) {
  var n;
  return Gt.some(function(i) {
    var s = i[K].options.emptyInsertThreshold;
    if (!(!s || un(i))) {
      var a = B(i), o = t >= a.left - s && t <= a.right + s, l = r >= a.top - s && r <= a.bottom + s;
      if (o && l) return n = i;
    }
  }), n;
}, Hi = function(t) {
  function r(s, a) {
    return function(o, l, c, d) {
      var f = o.options.group.name && l.options.group.name && o.options.group.name === l.options.group.name;
      if (s == null && (a || f)) return !0;
      if (s == null || s === !1) return !1;
      if (a && s === "clone") return s;
      if (typeof s == "function") return r(s(o, l, c, d), a)(o, l, c, d);
      var h = (a ? o : l).options.group.name;
      return s === !0 || typeof s == "string" && s === h || s.join && s.indexOf(h) > -1;
    };
  }
  var n = {}, i = t.group;
  (!i || Tt(i) != "object") && (i = { name: i }), n.name = i.name, n.checkPull = r(i.pull, !0), n.checkPut = r(i.put), n.revertClone = i.revertClone, t.group = n;
}, Vi = function() {
  !Gi && A && S(A, "display", "none");
}, Ki = function() {
  !Gi && A && S(A, "display", "");
};
Qt && !Ii && document.addEventListener("click", function(e) {
  if (zt)
    return e.preventDefault(), e.stopPropagation && e.stopPropagation(), e.stopImmediatePropagation && e.stopImmediatePropagation(), zt = !1, !1;
}, !0);
var Le = function(t) {
  if (b) {
    t = t.touches ? t.touches[0] : t;
    var r = _l(t.clientX, t.clientY);
    if (r) {
      var n = {};
      for (var i in t) t.hasOwnProperty(i) && (n[i] = t[i]);
      n.target = n.rootEl = r, n.preventDefault = void 0, n.stopPropagation = void 0, r[K]._onDragOver(n);
    }
  }
}, Ll = function(t) {
  b && b.parentNode[K]._isOutsideThisEl(t.target);
};
function C(e, t) {
  if (!(e && e.nodeType && e.nodeType === 1)) throw "Sortable: `el` must be an HTMLElement, not ".concat({}.toString.call(e));
  this.el = e, this.options = t = ge({}, t), e[K] = this;
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
      return Ui(e, this.options);
    },
    ghostClass: "sortable-ghost",
    chosenClass: "sortable-chosen",
    dragClass: "sortable-drag",
    ignore: "a, img",
    filter: null,
    preventOnFilter: !0,
    animation: 0,
    easing: null,
    setData: function(a, o) {
      a.setData("Text", o.textContent);
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
    supportPointer: C.supportPointer !== !1 && "PointerEvent" in window && (!ct || dn),
    emptyInsertThreshold: 5
  };
  Ct.initializePlugins(this, e, r);
  for (var n in r) !(n in t) && (t[n] = r[n]);
  Hi(t);
  for (var i in this) i.charAt(0) === "_" && typeof this[i] == "function" && (this[i] = this[i].bind(this));
  this.nativeDraggable = t.forceFallback ? !1 : $l, this.nativeDraggable && (this.options.touchStartThreshold = 1), t.supportPointer ? k(e, "pointerdown", this._onTapStart) : (k(e, "mousedown", this._onTapStart), k(e, "touchstart", this._onTapStart)), this.nativeDraggable && (k(e, "dragover", this), k(e, "dragenter", this)), Gt.push(this.el), t.store && t.store.get && this.sort(t.store.get(this) || []), ge(this, xl());
}
C.prototype = {
  constructor: C,
  _isOutsideThisEl: function(t) {
    !this.el.contains(t) && t !== this.el && (Ue = null);
  },
  _getDirection: function(t, r) {
    return typeof this.options.direction == "function" ? this.options.direction.call(this, t, r, b) : this.options.direction;
  },
  _onTapStart: function(t) {
    if (t.cancelable) {
      var r = this, n = this.el, i = this.options, s = i.preventOnFilter, a = t.type, o = t.touches && t.touches[0] || t.pointerType && t.pointerType === "touch" && t, l = (o || t).target, c = t.target.shadowRoot && (t.path && t.path[0] || t.composedPath && t.composedPath()[0]) || l, d = i.filter;
      if (Ol(n), !b && !(/mousedown|pointerdown/.test(a) && t.button !== 0 || i.disabled) && !c.isContentEditable && !(!this.nativeDraggable && ct && l && l.tagName.toUpperCase() === "SELECT") && (l = ne(l, i.draggable, n, !1), !(l && l.animated) && Rt !== l)) {
        if (Je = Z(l), ut = Z(l, i.draggable), typeof d == "function") {
          if (d.call(this, t, l, this)) {
            H({
              sortable: r,
              rootEl: c,
              name: "filter",
              targetEl: l,
              toEl: n,
              fromEl: n
            }), V("filter", r, { evt: t }), s && t.preventDefault();
            return;
          }
        } else if (d && (d = d.split(",").some(function(f) {
          if (f = ne(c, f.trim(), n, !1), f)
            return H({
              sortable: r,
              rootEl: f,
              name: "filter",
              targetEl: l,
              fromEl: n,
              toEl: n
            }), V("filter", r, { evt: t }), !0;
        }), d)) {
          s && t.preventDefault();
          return;
        }
        i.handle && !ne(c, i.handle, n, !1) || this._prepareDragStart(t, o, l);
      }
    }
  },
  _prepareDragStart: function(t, r, n) {
    var i = this, s = i.el, a = i.options, o = s.ownerDocument, l;
    if (n && !b && n.parentNode === s) {
      var c = B(n);
      if (D = s, b = n, R = b.parentNode, Me = b.nextSibling, Rt = n, $t = a.group, C.dragged = b, _e = {
        target: b,
        clientX: (r || t).clientX,
        clientY: (r || t).clientY
      }, Tn = _e.clientX - c.left, Rn = _e.clientY - c.top, this._lastX = (r || t).clientX, this._lastY = (r || t).clientY, b.style["will-change"] = "all", l = function() {
        if (V("delayEnded", i, { evt: t }), C.eventCanceled) {
          i._onDrop();
          return;
        }
        i._disableDelayedDragEvents(), !kn && i.nativeDraggable && (b.draggable = !0), i._triggerDragStart(t, r), H({
          sortable: i,
          name: "choose",
          originalEvent: t
        }), J(b, a.chosenClass, !0);
      }, a.ignore.split(",").forEach(function(d) {
        Fi(b, d.trim(), hr);
      }), k(o, "dragover", Le), k(o, "mousemove", Le), k(o, "touchmove", Le), a.supportPointer ? (k(o, "pointerup", i._onDrop), !this.nativeDraggable && k(o, "pointercancel", i._onDrop)) : (k(o, "mouseup", i._onDrop), k(o, "touchend", i._onDrop), k(o, "touchcancel", i._onDrop)), kn && this.nativeDraggable && (this.options.touchStartThreshold = 4, b.draggable = !0), V("delayStart", this, { evt: t }), a.delay && (!a.delayOnTouchOnly || r) && (!this.nativeDraggable || !(St || ye))) {
        if (C.eventCanceled) {
          this._onDrop();
          return;
        }
        a.supportPointer ? (k(o, "pointerup", i._disableDelayedDrag), k(o, "pointercancel", i._disableDelayedDrag)) : (k(o, "mouseup", i._disableDelayedDrag), k(o, "touchend", i._disableDelayedDrag), k(o, "touchcancel", i._disableDelayedDrag)), k(o, "mousemove", i._delayedDragTouchMoveHandler), k(o, "touchmove", i._delayedDragTouchMoveHandler), a.supportPointer && k(o, "pointermove", i._delayedDragTouchMoveHandler), i._dragStartTimer = setTimeout(l, a.delay);
      } else l();
    }
  },
  _delayedDragTouchMoveHandler: function(t) {
    var r = t.touches ? t.touches[0] : t;
    Math.max(Math.abs(r.clientX - this._lastX), Math.abs(r.clientY - this._lastY)) >= Math.floor(this.options.touchStartThreshold / (this.nativeDraggable && window.devicePixelRatio || 1)) && this._disableDelayedDrag();
  },
  _disableDelayedDrag: function() {
    b && hr(b), clearTimeout(this._dragStartTimer), this._disableDelayedDragEvents();
  },
  _disableDelayedDragEvents: function() {
    var t = this.el.ownerDocument;
    $(t, "mouseup", this._disableDelayedDrag), $(t, "touchend", this._disableDelayedDrag), $(t, "touchcancel", this._disableDelayedDrag), $(t, "pointerup", this._disableDelayedDrag), $(t, "pointercancel", this._disableDelayedDrag), $(t, "mousemove", this._delayedDragTouchMoveHandler), $(t, "touchmove", this._delayedDragTouchMoveHandler), $(t, "pointermove", this._delayedDragTouchMoveHandler);
  },
  _triggerDragStart: function(t, r) {
    r = r || t.pointerType == "touch" && t, !this.nativeDraggable || r ? this.options.supportPointer ? k(document, "pointermove", this._onTouchMove) : r ? k(document, "touchmove", this._onTouchMove) : k(document, "mousemove", this._onTouchMove) : (k(b, "dragend", this), k(D, "dragstart", this._onDragStart));
    try {
      document.selection ? Mt(function() {
        document.selection.empty();
      }) : window.getSelection().removeAllRanges();
    } catch {
    }
  },
  _dragStarted: function(t, r) {
    if (He = !1, D && b) {
      V("dragStarted", this, { evt: r }), this.nativeDraggable && k(document, "dragover", Ll);
      var n = this.options;
      !t && J(b, n.dragClass, !1), J(b, n.ghostClass, !0), C.active = this, t && this._appendGhost(), H({
        sortable: this,
        name: "start",
        originalEvent: r
      });
    } else this._nulling();
  },
  _emulateDragOver: function() {
    if (re) {
      this._lastX = re.clientX, this._lastY = re.clientY, Vi();
      for (var t = document.elementFromPoint(re.clientX, re.clientY), r = t; t && t.shadowRoot && (t = t.shadowRoot.elementFromPoint(re.clientX, re.clientY), t !== r); )
        r = t;
      if (b.parentNode[K]._isOutsideThisEl(t), r) do {
        if (r[K]) {
          var n = void 0;
          if (n = r[K]._onDragOver({
            clientX: re.clientX,
            clientY: re.clientY,
            target: t,
            rootEl: r
          }), n && !this.options.dragoverBubble) break;
        }
        t = r;
      } while (r = Oi(r));
      Ki();
    }
  },
  _onTouchMove: function(t) {
    if (_e) {
      var r = this.options, n = r.fallbackTolerance, i = r.fallbackOffset, s = t.touches ? t.touches[0] : t, a = A && Ye(A, !0), o = A && a && a.a, l = A && a && a.d, c = _t && G && Dn(G), d = (s.clientX - _e.clientX + i.x) / (o || 1) + (c ? c[0] - fr[0] : 0) / (o || 1), f = (s.clientY - _e.clientY + i.y) / (l || 1) + (c ? c[1] - fr[1] : 0) / (l || 1);
      if (!C.active && !He) {
        if (n && Math.max(Math.abs(s.clientX - this._lastX), Math.abs(s.clientY - this._lastY)) < n) return;
        this._onDragStart(t, !0);
      }
      if (A) {
        a ? (a.e += d - (dr || 0), a.f += f - (ur || 0)) : a = {
          a: 1,
          b: 0,
          c: 0,
          d: 1,
          e: d,
          f
        };
        var h = "matrix(".concat(a.a, ",").concat(a.b, ",").concat(a.c, ",").concat(a.d, ",").concat(a.e, ",").concat(a.f, ")");
        S(A, "webkitTransform", h), S(A, "mozTransform", h), S(A, "msTransform", h), S(A, "transform", h), dr = d, ur = f, re = s;
      }
      t.cancelable && t.preventDefault();
    }
  },
  _appendGhost: function() {
    if (!A) {
      var t = this.options.fallbackOnBody ? document.body : D, r = B(b, !0, _t, !0, t), n = this.options;
      if (_t) {
        for (G = t; S(G, "position") === "static" && S(G, "transform") === "none" && G !== document; ) G = G.parentNode;
        G !== document.body && G !== document.documentElement ? (G === document && (G = ce()), r.top += G.scrollTop, r.left += G.scrollLeft) : G = ce(), fr = Dn(G);
      }
      A = b.cloneNode(!0), J(A, n.ghostClass, !1), J(A, n.fallbackClass, !0), J(A, n.dragClass, !0), S(A, "transition", ""), S(A, "transform", ""), S(A, "box-sizing", "border-box"), S(A, "margin", 0), S(A, "top", r.top), S(A, "left", r.left), S(A, "width", r.width), S(A, "height", r.height), S(A, "opacity", "0.8"), S(A, "position", _t ? "absolute" : "fixed"), S(A, "zIndex", "100000"), S(A, "pointerEvents", "none"), C.ghost = A, t.appendChild(A), S(A, "transform-origin", Tn / parseInt(A.style.width) * 100 + "% " + Rn / parseInt(A.style.height) * 100 + "%");
    }
  },
  _onDragStart: function(t, r) {
    var n = this, i = t.dataTransfer, s = n.options;
    if (V("dragStart", this, { evt: t }), C.eventCanceled) {
      this._onDrop();
      return;
    }
    V("setupClone", this), C.eventCanceled || (T = ji(b), T.removeAttribute("id"), T.draggable = !1, T.style["will-change"] = "", this._hideClone(), J(T, this.options.chosenClass, !1), C.clone = T), n.cloneId = Mt(function() {
      V("clone", n), !C.eventCanceled && (n.options.removeCloneOnHide || D.insertBefore(T, b), n._hideClone(), H({
        sortable: n,
        name: "clone"
      }));
    }), !r && J(b, s.dragClass, !0), r ? (zt = !0, n._loopId = setInterval(n._emulateDragOver, 50)) : ($(document, "mouseup", n._onDrop), $(document, "touchend", n._onDrop), $(document, "touchcancel", n._onDrop), i && (i.effectAllowed = "move", s.setData && s.setData.call(n, i, b)), k(document, "drop", n), S(b, "transform", "translateZ(0)")), He = !0, n._dragStartId = Mt(n._dragStarted.bind(n, r, t)), k(document, "selectstart", n), nt = !0, window.getSelection().removeAllRanges(), ct && S(document.body, "user-select", "none");
  },
  _onDragOver: function(t) {
    var r = this.el, n = t.target, i, s, a, o = this.options, l = o.group, c = C.active, d = $t === l, f = o.sort, h = j || c, p, m = this, g = !1;
    if (Ir) return;
    function y(ke, rr) {
      V(ke, m, ue({
        evt: t,
        isOwner: d,
        axis: p ? "vertical" : "horizontal",
        revert: a,
        dragRect: i,
        targetRect: s,
        canSort: f,
        fromSortable: h,
        target: n,
        completed: x,
        onMove: function(Et, At) {
          return Lt(D, r, b, i, Et, B(Et), t, At);
        },
        changed: E
      }, rr));
    }
    function w() {
      y("dragOverAnimationCapture"), m.captureAnimationState(), m !== h && h.captureAnimationState();
    }
    function x(ke) {
      return y("dragOverCompleted", { insertion: ke }), ke && (d ? c._hideClone() : c._showClone(m), m !== h && (J(b, j ? j.options.ghostClass : c.options.ghostClass, !1), J(b, o.ghostClass, !0)), j !== m && m !== C.active ? j = m : m === C.active && j && (j = null), h === m && (m._ignoreWhileAnimating = n), m.animateAll(function() {
        y("dragOverAnimationComplete"), m._ignoreWhileAnimating = null;
      }), m !== h && (h.animateAll(), h._ignoreWhileAnimating = null)), (n === b && !b.animated || n === r && !n.animated) && (Ue = null), !o.dragoverBubble && !t.rootEl && n !== document && (b.parentNode[K]._isOutsideThisEl(t.target), !ke && Le(t)), !o.dragoverBubble && t.stopPropagation && t.stopPropagation(), g = !0;
    }
    function E() {
      Y = Z(b), xe = Z(b, o.draggable), H({
        sortable: m,
        name: "change",
        toEl: r,
        newIndex: Y,
        newDraggableIndex: xe,
        originalEvent: t
      });
    }
    if (t.preventDefault !== void 0 && t.cancelable && t.preventDefault(), n = ne(n, o.draggable, r, !0), y("dragOver"), C.eventCanceled) return g;
    if (b.contains(t.target) || n.animated && n.animatingX && n.animatingY || m._ignoreWhileAnimating === n) return x(!1);
    if (zt = !1, c && !o.disabled && (d ? f || (a = R !== D) : j === this || (this.lastPutMode = $t.checkPull(this, c, b, t)) && l.checkPut(this, c, b, t))) {
      if (p = this._getDirection(t, n) === "vertical", i = B(b), y("dragOverValid"), C.eventCanceled) return g;
      if (a)
        return R = D, w(), this._hideClone(), y("revert"), C.eventCanceled || (Me ? D.insertBefore(b, Me) : D.appendChild(b)), x(!0);
      var L = un(r, o.draggable);
      if (!L || Pl(t, p, this) && !L.animated) {
        if (L === b) return x(!1);
        if (L && r === t.target && (n = L), n && (s = B(n)), Lt(D, r, b, i, n, s, t, !!n) !== !1)
          return w(), L && L.nextSibling ? r.insertBefore(b, L.nextSibling) : r.appendChild(b), R = r, E(), x(!0);
      } else if (L && Rl(t, p, this)) {
        var q = Xe(r, 0, o, !0);
        if (q === b) return x(!1);
        if (n = q, s = B(n), Lt(D, r, b, i, n, s, t, !1) !== !1)
          return w(), r.insertBefore(b, q), R = r, E(), x(!0);
      } else if (n.parentNode === r) {
        s = B(n);
        var N = 0, F, ve = b.parentNode !== r, z = !kl(b.animated && b.toRect || i, n.animated && n.toRect || s, p), we = p ? "top" : "left", te = Ln(n, "top", "top") || Ln(b, "top", "top"), Ee = te ? te.scrollTop : void 0;
        Ue !== n && (F = s[we], ht = !1, kt = !z && o.invertSwap || ve), N = Ml(t, n, s, p, z ? 1 : o.swapThreshold, o.invertedSwapThreshold == null ? o.swapThreshold : o.invertedSwapThreshold, kt, Ue === n);
        var X;
        if (N !== 0) {
          var fe = Z(b);
          do
            fe -= N, X = R.children[fe];
          while (X && (S(X, "display") === "none" || X === A));
        }
        if (N === 0 || X === n) return x(!1);
        Ue = n, ft = N;
        var Ae = n.nextElementSibling, ae = !1;
        ae = N === 1;
        var $e = Lt(D, r, b, i, n, s, t, ae);
        if ($e !== !1)
          return ($e === 1 || $e === -1) && (ae = $e === 1), Ir = !0, setTimeout(Tl, 30), w(), ae && !Ae ? r.appendChild(b) : n.parentNode.insertBefore(b, ae ? Ae : n), te && Ni(te, 0, Ee - te.scrollTop), R = b.parentNode, F !== void 0 && !kt && (Pt = Math.abs(F - B(n)[we])), E(), x(!0);
      }
      if (r.contains(b)) return x(!1);
    }
    return !1;
  },
  _ignoreWhileAnimating: null,
  _offMoveEvents: function() {
    $(document, "mousemove", this._onTouchMove), $(document, "touchmove", this._onTouchMove), $(document, "pointermove", this._onTouchMove), $(document, "dragover", Le), $(document, "mousemove", Le), $(document, "touchmove", Le);
  },
  _offUpEvents: function() {
    var t = this.el.ownerDocument;
    $(t, "mouseup", this._onDrop), $(t, "touchend", this._onDrop), $(t, "pointerup", this._onDrop), $(t, "pointercancel", this._onDrop), $(t, "touchcancel", this._onDrop), $(document, "selectstart", this);
  },
  _onDrop: function(t) {
    var r = this.el, n = this.options;
    if (Y = Z(b), xe = Z(b, n.draggable), V("drop", this, { evt: t }), R = b && b.parentNode, Y = Z(b), xe = Z(b, n.draggable), C.eventCanceled) {
      this._nulling();
      return;
    }
    He = !1, kt = !1, ht = !1, clearInterval(this._loopId), clearTimeout(this._dragStartTimer), Br(this.cloneId), Br(this._dragStartId), this.nativeDraggable && ($(document, "drop", this), $(r, "dragstart", this._onDragStart)), this._offMoveEvents(), this._offUpEvents(), ct && S(document.body, "user-select", ""), S(b, "transform", ""), t && (nt && (t.cancelable && t.preventDefault(), !n.dropBubble && t.stopPropagation()), A && A.parentNode && A.parentNode.removeChild(A), (D === R || j && j.lastPutMode !== "clone") && T && T.parentNode && T.parentNode.removeChild(T), b && (this.nativeDraggable && $(b, "dragend", this), hr(b), b.style["will-change"] = "", nt && !He && J(b, j ? j.options.ghostClass : this.options.ghostClass, !1), J(b, this.options.chosenClass, !1), H({
      sortable: this,
      name: "unchoose",
      toEl: R,
      newIndex: null,
      newDraggableIndex: null,
      originalEvent: t
    }), D !== R ? (Y >= 0 && (H({
      rootEl: R,
      name: "add",
      toEl: R,
      fromEl: D,
      originalEvent: t
    }), H({
      sortable: this,
      name: "remove",
      toEl: R,
      originalEvent: t
    }), H({
      rootEl: R,
      name: "sort",
      toEl: R,
      fromEl: D,
      originalEvent: t
    }), H({
      sortable: this,
      name: "sort",
      toEl: R,
      originalEvent: t
    })), j && j.save()) : Y !== Je && Y >= 0 && (H({
      sortable: this,
      name: "update",
      toEl: R,
      originalEvent: t
    }), H({
      sortable: this,
      name: "sort",
      toEl: R,
      originalEvent: t
    })), C.active && ((Y == null || Y === -1) && (Y = Je, xe = ut), H({
      sortable: this,
      name: "end",
      toEl: R,
      originalEvent: t
    }), this.save()))), this._nulling();
  },
  _nulling: function() {
    V("nulling", this), D = b = R = A = Me = T = Rt = Se = _e = re = nt = Y = xe = Je = ut = Ue = ft = j = $t = C.dragged = C.ghost = C.clone = C.active = null, Ut.forEach(function(t) {
      t.checked = !0;
    }), Ut.length = dr = ur = 0;
  },
  handleEvent: function(t) {
    switch (t.type) {
      case "drop":
      case "dragend":
        this._onDrop(t);
        break;
      case "dragenter":
      case "dragover":
        b && (this._onDragOver(t), Dl(t));
        break;
      case "selectstart":
        t.preventDefault();
    }
  },
  toArray: function() {
    for (var t = [], r, n = this.el.children, i = 0, s = n.length, a = this.options; i < s; i++)
      r = n[i], ne(r, a.draggable, this.el, !1) && t.push(r.getAttribute(a.dataIdAttr) || Bl(r));
    return t;
  },
  sort: function(t, r) {
    var n = {}, i = this.el;
    this.toArray().forEach(function(s, a) {
      var o = i.children[a];
      ne(o, this.options.draggable, i, !1) && (n[s] = o);
    }, this), r && this.captureAnimationState(), t.forEach(function(s) {
      n[s] && (i.removeChild(n[s]), i.appendChild(n[s]));
    }), r && this.animateAll();
  },
  save: function() {
    var t = this.options.store;
    t && t.set && t.set(this);
  },
  closest: function(t, r) {
    return ne(t, r || this.options.draggable, this.el, !1);
  },
  option: function(t, r) {
    var n = this.options;
    if (r === void 0) return n[t];
    var i = Ct.modifyOption(this, t, r);
    typeof i < "u" ? n[t] = i : n[t] = r, t === "group" && Hi(n);
  },
  destroy: function() {
    V("destroy", this);
    var t = this.el;
    t[K] = null, $(t, "mousedown", this._onTapStart), $(t, "touchstart", this._onTapStart), $(t, "pointerdown", this._onTapStart), this.nativeDraggable && ($(t, "dragover", this), $(t, "dragenter", this)), Array.prototype.forEach.call(t.querySelectorAll("[draggable]"), function(r) {
      r.removeAttribute("draggable");
    }), this._onDrop(), this._disableDelayedDragEvents(), Gt.splice(Gt.indexOf(this.el), 1), this.el = t = null;
  },
  _hideClone: function() {
    if (!Se) {
      if (V("hideClone", this), C.eventCanceled) return;
      S(T, "display", "none"), this.options.removeCloneOnHide && T.parentNode && T.parentNode.removeChild(T), Se = !0;
    }
  },
  _showClone: function(t) {
    if (t.lastPutMode !== "clone") {
      this._hideClone();
      return;
    }
    if (Se) {
      if (V("showClone", this), C.eventCanceled) return;
      b.parentNode == D && !this.options.group.revertClone ? D.insertBefore(T, b) : Me ? D.insertBefore(T, Me) : D.appendChild(T), this.options.group.revertClone && this.animate(b, T), S(T, "display", ""), Se = !1;
    }
  }
};
function Dl(e) {
  e.dataTransfer && (e.dataTransfer.dropEffect = "move"), e.cancelable && e.preventDefault();
}
function Lt(e, t, r, n, i, s, a, o) {
  var l, c = e[K], d = c.options.onMove, f;
  return window.CustomEvent && !ye && !St ? l = new CustomEvent("move", {
    bubbles: !0,
    cancelable: !0
  }) : (l = document.createEvent("Event"), l.initEvent("move", !0, !0)), l.to = t, l.from = e, l.dragged = r, l.draggedRect = n, l.related = i || t, l.relatedRect = s || B(t), l.willInsertAfter = o, l.originalEvent = a, e.dispatchEvent(l), d && (f = d.call(c, l, a)), f;
}
function hr(e) {
  e.draggable = !1;
}
function Tl() {
  Ir = !1;
}
function Rl(e, t, r) {
  var n = B(Xe(r.el, 0, r.options, !0)), i = zi(r.el, r.options, A), s = 10;
  return t ? e.clientX < i.left - s || e.clientY < n.top && e.clientX < n.right : e.clientY < i.top - s || e.clientY < n.bottom && e.clientX < n.left;
}
function Pl(e, t, r) {
  var n = B(un(r.el, r.options.draggable)), i = zi(r.el, r.options, A), s = 10;
  return t ? e.clientX > i.right + s || e.clientY > n.bottom && e.clientX > n.left : e.clientY > i.bottom + s || e.clientX > n.right && e.clientY > n.top;
}
function Ml(e, t, r, n, i, s, a, o) {
  var l = n ? e.clientY : e.clientX, c = n ? r.height : r.width, d = n ? r.top : r.left, f = n ? r.bottom : r.right, h = !1;
  if (!a) {
    if (o && Pt < c * i) {
      if (!ht && (ft === 1 ? l > d + c * s / 2 : l < f - c * s / 2) && (ht = !0), ht)
        h = !0;
      else if (ft === 1 ? l < d + Pt : l > f - Pt) return -ft;
    } else if (l > d + c * (1 - i) / 2 && l < f - c * (1 - i) / 2) return Il(t);
  }
  return h = h || a, h && (l < d + c * s / 2 || l > f - c * s / 2) ? l > d + c / 2 ? 1 : -1 : 0;
}
function Il(e) {
  return Z(b) < Z(e) ? 1 : -1;
}
function Bl(e) {
  for (var t = e.tagName + e.className + e.src + e.href + e.textContent, r = t.length, n = 0; r--; ) n += t.charCodeAt(r);
  return n.toString(36);
}
function Ol(e) {
  Ut.length = 0;
  for (var t = e.getElementsByTagName("input"), r = t.length; r--; ) {
    var n = t[r];
    n.checked && Ut.push(n);
  }
}
function Mt(e) {
  return setTimeout(e, 0);
}
function Br(e) {
  return clearTimeout(e);
}
Qt && k(document, "touchmove", function(e) {
  (C.active || He) && e.cancelable && e.preventDefault();
});
C.utils = {
  on: k,
  off: $,
  css: S,
  find: Fi,
  is: function(t, r) {
    return !!ne(t, r, t, !1);
  },
  extend: vl,
  throttle: qi,
  closest: ne,
  toggleClass: J,
  clone: ji,
  index: Z,
  nextTick: Mt,
  cancelNextTick: Br,
  detectDirection: Ui,
  getChild: Xe,
  expando: K
};
C.get = function(e) {
  return e[K];
};
C.mount = function() {
  for (var e = arguments.length, t = new Array(e), r = 0; r < e; r++) t[r] = arguments[r];
  t[0].constructor === Array && (t = t[0]), t.forEach(function(n) {
    if (!n.prototype || !n.prototype.constructor) throw "Sortable: Mounted plugin must be a constructor function, not ".concat({}.toString.call(n));
    n.utils && (C.utils = ue(ue({}, C.utils), n.utils)), Ct.mount(n);
  });
};
C.create = function(e, t) {
  return new C(e, t);
};
C.version = bl;
var I = [], it, Or, Fr = !1, pr, mr, Ht, st;
function Fl() {
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
      this.sortable.nativeDraggable ? k(document, "dragover", this._handleAutoScroll) : this.options.supportPointer ? k(document, "pointermove", this._handleFallbackAutoScroll) : n.touches ? k(document, "touchmove", this._handleFallbackAutoScroll) : k(document, "mousemove", this._handleFallbackAutoScroll);
    },
    dragOverCompleted: function(r) {
      var n = r.originalEvent;
      !this.options.dragOverBubble && !n.rootEl && this._handleAutoScroll(n);
    },
    drop: function() {
      this.sortable.nativeDraggable ? $(document, "dragover", this._handleAutoScroll) : ($(document, "pointermove", this._handleFallbackAutoScroll), $(document, "touchmove", this._handleFallbackAutoScroll), $(document, "mousemove", this._handleFallbackAutoScroll)), Mn(), It(), wl();
    },
    nulling: function() {
      Ht = Or = it = Fr = st = pr = mr = null, I.length = 0;
    },
    _handleFallbackAutoScroll: function(r) {
      this._handleAutoScroll(r, !0);
    },
    _handleAutoScroll: function(r, n) {
      var i = this, s = (r.touches ? r.touches[0] : r).clientX, a = (r.touches ? r.touches[0] : r).clientY, o = document.elementFromPoint(s, a);
      if (Ht = r, n || this.options.forceAutoScrollFallback || St || ye || ct) {
        gr(r, this.options, o, n);
        var l = Ce(o, !0);
        Fr && (!st || s !== pr || a !== mr) && (st && Mn(), st = setInterval(function() {
          var c = Ce(document.elementFromPoint(s, a), !0);
          c !== l && (l = c, It()), gr(r, i.options, c, n);
        }, 10), pr = s, mr = a);
      } else {
        if (!this.options.bubbleScroll || Ce(o, !0) === ce()) {
          It();
          return;
        }
        gr(r, this.options, Ce(o, !1), !1);
      }
    }
  }, ge(e, {
    pluginName: "scroll",
    initializeByDefault: !0
  });
}
function It() {
  I.forEach(function(e) {
    clearInterval(e.pid);
  }), I = [];
}
function Mn() {
  clearInterval(st);
}
var gr = qi(function(e, t, r, n) {
  if (t.scroll) {
    var i = (e.touches ? e.touches[0] : e).clientX, s = (e.touches ? e.touches[0] : e).clientY, a = t.scrollSensitivity, o = t.scrollSpeed, l = ce(), c = !1, d;
    Or !== r && (Or = r, It(), it = t.scroll, d = t.scrollFn, it === !0 && (it = Ce(r, !0)));
    var f = 0, h = it;
    do {
      var p = h, m = B(p), g = m.top, y = m.bottom, w = m.left, x = m.right, E = m.width, L = m.height, q = void 0, N = void 0, F = p.scrollWidth, ve = p.scrollHeight, z = S(p), we = p.scrollLeft, te = p.scrollTop;
      p === l ? (q = E < F && (z.overflowX === "auto" || z.overflowX === "scroll" || z.overflowX === "visible"), N = L < ve && (z.overflowY === "auto" || z.overflowY === "scroll" || z.overflowY === "visible")) : (q = E < F && (z.overflowX === "auto" || z.overflowX === "scroll"), N = L < ve && (z.overflowY === "auto" || z.overflowY === "scroll"));
      var Ee = q && (Math.abs(x - i) <= a && we + E < F) - (Math.abs(w - i) <= a && !!we), X = N && (Math.abs(y - s) <= a && te + L < ve) - (Math.abs(g - s) <= a && !!te);
      if (!I[f])
        for (var fe = 0; fe <= f; fe++) I[fe] || (I[fe] = {});
      (I[f].vx != Ee || I[f].vy != X || I[f].el !== p) && (I[f].el = p, I[f].vx = Ee, I[f].vy = X, clearInterval(I[f].pid), (Ee != 0 || X != 0) && (c = !0, I[f].pid = setInterval(function() {
        n && this.layer === 0 && C.active._onTouchMove(Ht);
        var Ae = I[this.layer].vy ? I[this.layer].vy * o : 0, ae = I[this.layer].vx ? I[this.layer].vx * o : 0;
        typeof d == "function" && d.call(C.dragged.parentNode[K], ae, Ae, e, Ht, I[this.layer].el) !== "continue" || Ni(I[this.layer].el, ae, Ae);
      }.bind({ layer: f }), 24))), f++;
    } while (t.bubbleScroll && h !== l && (h = Ce(h, !1)));
    Fr = c;
  }
}, 30), Ji = function(t) {
  var r = t.originalEvent, n = t.putSortable, i = t.dragEl, s = t.activeSortable, a = t.dispatchSortableEvent, o = t.hideGhostForTarget, l = t.unhideGhostForTarget;
  if (r) {
    var c = n || s;
    o();
    var d = r.changedTouches && r.changedTouches.length ? r.changedTouches[0] : r, f = document.elementFromPoint(d.clientX, d.clientY);
    l(), c && !c.el.contains(f) && (a("spill"), this.onSpill({
      dragEl: i,
      putSortable: n
    }));
  }
};
function fn() {
}
fn.prototype = {
  startIndex: null,
  dragStart: function(t) {
    var r = t.oldDraggableIndex;
    this.startIndex = r;
  },
  onSpill: function(t) {
    var r = t.dragEl, n = t.putSortable;
    this.sortable.captureAnimationState(), n && n.captureAnimationState();
    var i = Xe(this.sortable.el, this.startIndex, this.options);
    i ? this.sortable.el.insertBefore(r, i) : this.sortable.el.appendChild(r), this.sortable.animateAll(), n && n.animateAll();
  },
  drop: Ji
};
ge(fn, { pluginName: "revertOnSpill" });
function hn() {
}
hn.prototype = {
  onSpill: function(t) {
    var r = t.dragEl, n = t.putSortable || this.sortable;
    n.captureAnimationState(), r.parentNode && r.parentNode.removeChild(r), n.animateAll();
  },
  drop: Ji
};
ge(hn, { pluginName: "removeOnSpill" });
C.mount(new Fl());
C.mount(hn, fn);
var ql = class {
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
    n.className = "column-list", n.setAttribute("role", "list"), n.setAttribute("aria-label", "Column visibility and order"), this.columnListEl = n, e.forEach((s) => {
      const a = this.createColumnItem(s.field, s.label || s.field, !t.has(s.field));
      n.appendChild(a);
    }), this.container.appendChild(n);
    const i = this.createFooter();
    this.container.appendChild(i);
  }
  createHeader(e, t) {
    const r = document.createElement("div");
    r.className = "column-manager-header";
    const n = document.createElement("div");
    n.className = "column-search-container";
    const i = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    i.setAttribute("class", "column-search-icon"), i.setAttribute("viewBox", "0 0 24 24"), i.setAttribute("fill", "none"), i.setAttribute("stroke", "currentColor"), i.setAttribute("stroke-width", "2");
    const s = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    s.setAttribute("cx", "11"), s.setAttribute("cy", "11"), s.setAttribute("r", "8");
    const a = document.createElementNS("http://www.w3.org/2000/svg", "path");
    a.setAttribute("d", "m21 21-4.3-4.3"), i.appendChild(s), i.appendChild(a);
    const o = document.createElement("input");
    o.type = "text", o.className = "column-search-input", o.placeholder = "Filter columns...", o.setAttribute("aria-label", "Filter columns"), this.searchInput = o, o.addEventListener("input", () => {
      this.filterColumns(o.value);
    }), n.appendChild(i), n.appendChild(o);
    const l = document.createElement("span");
    return l.className = "column-count-badge", l.textContent = `${t} of ${e}`, l.setAttribute("aria-live", "polite"), this.countBadgeEl = l, r.appendChild(n), r.appendChild(l), r;
  }
  filterColumns(e) {
    const t = e.toLowerCase().trim();
    this.container.querySelectorAll(".column-item").forEach((r) => {
      const n = r.querySelector(".column-label")?.textContent?.toLowerCase() || "", i = t === "" || n.includes(t);
      r.style.display = i ? "" : "none";
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
    const e = this.columnListEl, t = e.scrollTop, r = e.scrollHeight, n = e.clientHeight, i = r > n, s = i && t > 0, a = i && t + n < r - 1;
    e.classList.toggle("column-list--shadow-top", s), e.classList.toggle("column-list--shadow-bottom", a);
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
    const i = document.createElementNS("http://www.w3.org/2000/svg", "path");
    i.setAttribute("d", "M3 3v5h5"), r.appendChild(n), r.appendChild(i);
    const s = document.createElement("span");
    return s.textContent = "Reset to Default", t.appendChild(r), t.appendChild(s), t.addEventListener("click", () => {
      this.handleReset();
    }), e.appendChild(t), e;
  }
  handleReset() {
    this.grid.resetColumnsToDefault(), this.onReset?.(), this.searchInput && (this.searchInput.value = "", this.filterColumns("")), this.updateCountBadge();
  }
  createColumnItem(e, t, r) {
    const n = `column-item-${e}`, i = `column-switch-${e}`, s = document.createElement("div");
    s.className = "column-item", s.id = n, s.dataset.column = e, s.setAttribute("role", "listitem");
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
    ].forEach(([p, m]) => {
      const g = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      g.setAttribute("cx", String(p)), g.setAttribute("cy", String(m)), g.setAttribute("r", "1.5"), o.appendChild(g);
    });
    const l = document.createElement("span");
    l.className = "column-label", l.id = `${n}-label`, l.textContent = t, a.appendChild(o), a.appendChild(l);
    const c = document.createElement("label");
    c.className = "column-switch", c.htmlFor = i;
    const d = document.createElement("input");
    d.type = "checkbox", d.id = i, d.dataset.column = e, d.checked = r, d.setAttribute("role", "switch"), d.setAttribute("aria-checked", String(r)), d.setAttribute("aria-labelledby", `${n}-label`), d.setAttribute("aria-describedby", `${n}-desc`);
    const f = document.createElement("span");
    f.id = `${n}-desc`, f.className = "sr-only", f.textContent = `Press Space or Enter to toggle ${t} column visibility. Currently ${r ? "visible" : "hidden"}.`;
    const h = document.createElement("span");
    return h.className = "column-switch-slider", h.setAttribute("aria-hidden", "true"), c.appendChild(d), c.appendChild(h), s.appendChild(a), s.appendChild(c), s.appendChild(f), s;
  }
  setupDragAndDrop() {
    const e = this.container.querySelector(".column-list") || this.container;
    this.sortable = C.create(e, {
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
        const n = `column-item-${t}-desc`, i = this.container.querySelector(`#${n}`);
        i && (i.textContent = `Press Space or Enter to toggle ${this.container.querySelector(`#column-item-${t}-label`)?.textContent || t} column visibility. Currently ${r ? "visible" : "hidden"}.`), this.onToggle && this.onToggle(t, r), this.grid.config.behaviors?.columnVisibility && this.grid.config.behaviors.columnVisibility.toggleColumn(t, this.grid), this.updateCountBadge();
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
function Nl(e, t, r, n, i) {
  const s = (a) => {
    const o = a.target;
    if (!o) return;
    const l = o.closest(r);
    !l || !(l instanceof HTMLElement) || n(a, l);
  };
  return e.addEventListener(t, s, i), () => e.removeEventListener(t, s, i);
}
var O = M("DataGrid");
function jl(e) {
  const t = e.tableEl;
  if (!t || !t.classList || typeof t.closest != "function") return;
  t.classList.add("admin-datagrid__table"), (t.closest("[data-datagrid-surface]") || t).classList.add("admin-datagrid");
  const r = t.querySelector("thead");
  r?.classList.add("admin-datagrid__header"), r?.querySelectorAll("th").forEach((s) => {
    s.classList.add("admin-datagrid__header-cell");
  }), t.querySelector("tbody")?.classList.add("admin-datagrid__body"), t.querySelectorAll(e.selectors.filterRow).forEach((s) => {
    s.classList.add("admin-datagrid__filter-control");
    const a = s.closest("tr");
    a?.classList.add("admin-datagrid__filter-row"), a?.querySelectorAll("th").forEach((o) => {
      o.classList.add("admin-datagrid__header-cell");
    });
  }), document.querySelector(e.selectors.searchInput)?.closest("[data-datagrid-toolbar]")?.classList.add("admin-surface-card", "admin-datagrid__toolbar"), document.querySelector("[data-datagrid-filter-panel]")?.classList.add("admin-surface-card", "admin-datagrid__filter-panel");
  const n = document.querySelector(e.selectors.paginationContainer), i = n?.closest("[data-datagrid-pagination]") || n;
  i?.classList.add("admin-surface-card", "admin-datagrid__pagination"), i?.classList.toggle("admin-datagrid__pagination--presented", e.config.pagination?.mode === "semantic"), n?.classList.add("admin-datagrid__pagination-controls");
  for (const s of [
    e.selectors.tableInfoStart,
    e.selectors.tableInfoEnd,
    e.selectors.tableInfoTotal,
    e.selectors.tableInfoSummary
  ]) {
    const a = document.querySelector(s);
    a?.classList.add("admin-datagrid__pagination-text"), a?.parentElement?.classList.add("admin-datagrid__pagination-text");
  }
  document.querySelector(e.selectors.perPageSelect)?.parentElement?.classList.add("admin-datagrid__pagination-text");
}
function zl(e) {
  const t = document.querySelector(e.selectors.searchInput);
  if (!t) {
    O.warn(`[DataGrid] Search input not found: ${e.selectors.searchInput}`);
    return;
  }
  O.debug(`[DataGrid] Search input bound to: ${e.selectors.searchInput}`);
  const r = document.getElementById("clear-search-btn"), n = () => {
    r && (t.value.trim() ? r.classList.remove("hidden") : r.classList.add("hidden"));
  };
  t.addEventListener("input", () => {
    n(), e.searchTimeout && clearTimeout(e.searchTimeout), e.searchTimeout = window.setTimeout(async () => {
      O.debug(`[DataGrid] Search triggered: "${t.value}"`), e.state.search = t.value, e.pushStateToURL(), e.config.behaviors?.search ? await e.config.behaviors.search.onSearch(t.value, e) : (e.resetPagination(), await e.refresh());
    }, e.config.searchDelay);
  }), r && r.addEventListener("click", async () => {
    t.value = "", t.focus(), n(), e.state.search = "", e.pushStateToURL(), e.config.behaviors?.search ? await e.config.behaviors.search.onSearch("", e) : (e.resetPagination(), await e.refresh());
  }), n();
}
function Gl(e) {
  const t = document.querySelector(e.selectors.perPageSelect);
  t && t.addEventListener("change", async () => {
    e.state.perPage = parseInt(t.value, 10), e.resetPagination(), e.pushStateToURL(), await e.refresh();
  });
}
function Ul(e) {
  document.querySelectorAll(e.selectors.filterRow).forEach((t) => {
    const r = async () => {
      const n = t.dataset.filterColumn, i = t instanceof HTMLInputElement ? t.type.toLowerCase() : "", s = t instanceof HTMLSelectElement ? "eq" : i === "" || i === "text" || i === "search" || i === "email" || i === "tel" || i === "url" ? "ilike" : "eq", a = t.dataset.filterOperator || s, o = t.value;
      if (!n) return;
      const l = e.state.filters.findIndex((c) => c.column === n);
      if (o) {
        const c = {
          column: n,
          operator: a,
          value: o
        };
        l >= 0 ? e.state.filters[l] = c : e.state.filters.push(c);
      } else l >= 0 && e.state.filters.splice(l, 1);
      e.pushStateToURL(), e.config.behaviors?.filter ? await e.config.behaviors.filter.onFilterChange(n, o, e) : (e.resetPagination(), await e.refresh());
    };
    t.addEventListener("input", r), t.addEventListener("change", r);
  });
}
function Hl(e) {
  const t = document.querySelector(e.selectors.columnToggleBtn), r = document.querySelector(e.selectors.columnToggleMenu);
  !t || !r || (e.columnManager = new ql({
    container: r,
    grid: e,
    onToggle: (n, i) => {
      O.debug(`[DataGrid] Column ${n} visibility toggled to ${i}`);
    },
    onReorder: (n) => {
      O.debug("[DataGrid] Columns reordered:", n);
    }
  }));
}
function Vl(e) {
  if (!e.isCapabilityEnabled("export")) return;
  const t = document.querySelector(e.selectors.exportMenu);
  if (!t) return;
  const r = t.querySelectorAll("[data-export-format]");
  r.forEach((n) => {
    n.addEventListener("click", async () => {
      const i = n.dataset.exportFormat;
      if (!i || !e.config.behaviors?.export) return;
      const s = e.config.behaviors.export.getConcurrency?.() || "single", a = [];
      s === "single" ? r.forEach((d) => a.push(d)) : s === "per-format" && a.push(n);
      const o = (d) => {
        const f = d.querySelector(".export-icon"), h = d.querySelector(".export-spinner");
        f && f.classList.add("hidden"), h && h.classList.remove("hidden");
      }, l = (d) => {
        const f = d.querySelector(".export-icon"), h = d.querySelector(".export-spinner");
        f && f.classList.remove("hidden"), h && h.classList.add("hidden");
      };
      a.forEach((d) => {
        d.setAttribute("data-export-loading", "true"), d.disabled = !0, o(d);
      });
      const c = s === "none";
      c && (n.setAttribute("data-export-loading", "true"), o(n));
      try {
        await e.config.behaviors.export.export(i, e);
      } catch (d) {
        O.error("[DataGrid] Export failed:", d);
      } finally {
        a.forEach((d) => {
          d.removeAttribute("data-export-loading"), d.disabled = !1, l(d);
        }), c && (n.removeAttribute("data-export-loading"), l(n));
      }
    });
  });
}
function Kl(e) {
  e.tableEl && (e.tableEl.querySelectorAll("[data-sort-column]").forEach((t) => {
    t.addEventListener("click", async (r) => {
      r.preventDefault(), r.stopPropagation();
      const n = t.dataset.sortColumn;
      if (!n) return;
      O.debug(`[DataGrid] Sort button clicked for field: ${n}`);
      const i = e.state.sort.find((a) => a.field === n);
      let s = null;
      i ? i.direction === "asc" ? (s = "desc", i.direction = s) : (e.state.sort = e.state.sort.filter((a) => a.field !== n), s = null, O.debug(`[DataGrid] Sort cleared for field: ${n}`)) : (s = "asc", e.state.sort = [{
        field: n,
        direction: s
      }]), O.debug("[DataGrid] New sort state:", e.state.sort), e.pushStateToURL(), s !== null && e.config.behaviors?.sort ? (O.debug("[DataGrid] Calling custom sort behavior"), await e.config.behaviors.sort.onSort(n, s, e)) : (O.debug("[DataGrid] Calling refresh() for sort"), await e.refresh()), O.debug("[DataGrid] Updating sort indicators"), e.updateSortIndicators();
    });
  }), e.tableEl.querySelectorAll("[data-sort]").forEach((t) => {
    t.addEventListener("click", async () => {
      const r = t.dataset.sort;
      if (!r) return;
      const n = e.state.sort.find((s) => s.field === r);
      let i = null;
      n ? n.direction === "asc" ? (i = "desc", n.direction = i) : (e.state.sort = e.state.sort.filter((s) => s.field !== r), i = null) : (i = "asc", e.state.sort = [{
        field: r,
        direction: i
      }]), e.pushStateToURL(), i !== null && e.config.behaviors?.sort ? await e.config.behaviors.sort.onSort(r, i, e) : await e.refresh(), e.updateSortIndicators();
    });
  }));
}
function Jl(e) {
  e.tableEl && (e.tableEl.querySelectorAll("[data-sort-column]").forEach((t) => {
    const r = t.dataset.sortColumn;
    if (!r) return;
    const n = e.state.sort.find((s) => s.field === r), i = t.querySelector("svg");
    i && (n ? (t.classList.remove("opacity-0"), t.classList.add("opacity-100"), n.direction === "asc" ? (i.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />', i.classList.add("text-blue-600"), i.classList.remove("text-gray-400")) : (i.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />', i.classList.add("text-blue-600"), i.classList.remove("text-gray-400"))) : (i.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />', i.classList.remove("text-blue-600"), i.classList.add("text-gray-400")));
  }), e.tableEl.querySelectorAll("[data-sort]").forEach((t) => {
    const r = t.dataset.sort, n = e.state.sort.find((s) => s.field === r), i = t.querySelector(".sort-indicator");
    i && (i.textContent = n ? n.direction === "asc" ? "↑" : "↓" : "");
  }));
}
function Yl(e) {
  if (!e.isCapabilityEnabled("selection")) {
    e.selectionAbortController?.abort(), e.selectionAbortController = null, e.state.selectedRows.clear();
    return;
  }
  if (!e.tableEl) return;
  e.selectionAbortController && e.selectionAbortController.abort(), e.selectionAbortController = new AbortController();
  const { signal: t } = e.selectionAbortController, r = e.tableEl.querySelector(e.selectors.selectAllCheckbox);
  r && r.addEventListener("change", () => {
    e.tableEl.querySelectorAll(e.selectors.rowCheckboxes).forEach((n) => {
      n.checked = r.checked, qr(n);
      const i = n.dataset.id;
      i && (r.checked ? e.state.selectedRows.add(i) : e.state.selectedRows.delete(i));
    }), e.updateBulkActionsBar();
  }, { signal: t }), e.tableEl.addEventListener("change", (n) => {
    const i = n.target;
    if (!i || i === r || typeof i.matches != "function" || !i.matches(e.selectors.rowCheckboxes)) return;
    const s = i.dataset.id;
    s && (i.checked ? e.state.selectedRows.add(s) : e.state.selectedRows.delete(s)), qr(i), e.updateBulkActionsBar();
  }, { signal: t }), e.updateSelectionBindings();
}
function Wl(e) {
  e.isCapabilityEnabled("selection") && (e.tableEl?.querySelectorAll(e.selectors.rowCheckboxes) || []).forEach((t) => {
    const r = t.dataset.id;
    r && (t.checked = e.state.selectedRows.has(r)), qr(t);
  });
}
function qr(e) {
  const t = e.closest("tr");
  t && (t.dataset.selected = String(e.checked), t.setAttribute("aria-selected", String(e.checked)));
}
function In(e) {
  return Array.from(new Set(e.filter(Boolean)));
}
function Nr(e, t) {
  for (const r of t) {
    const n = e.querySelector(r);
    if (n) return n;
  }
  return null;
}
function Xl(e) {
  const t = e?.selectors?.bulkActionsBar;
  if (!t) return null;
  try {
    return document.querySelector(t);
  } catch {
    return null;
  }
}
function Ze(e) {
  const t = Xl(e);
  return t && e?.selectors?.bulkActionsBar !== "#bulk-actions-bar" ? t : Nr(document, [
    "[data-bulk-action-overlay]",
    "#bulk-actions-overlay",
    '[data-bulk-action-bar="true"]'
  ]) || t;
}
function pn(e) {
  const t = Ze(e);
  return Array.from(t ? t.querySelectorAll("[data-bulk-action]") : document.querySelectorAll("[data-bulk-action]"));
}
function Ql(e) {
  const t = Ze(e), r = [
    "[data-bulk-selection-count]",
    "#selected-count",
    e?.selectors?.selectedCount
  ].filter(Boolean);
  return (t ? Nr(t, r) : null) || Nr(document, r);
}
function Zl(e) {
  const t = Ze(e), r = [
    "[data-bulk-clear]",
    "#bulk-clear-selection",
    "#clear-selection-btn"
  ], n = r.flatMap((i) => Array.from((t || document).querySelectorAll(i)));
  return n.length ? In(n) : In(r.flatMap((i) => Array.from(document.querySelectorAll(i))));
}
function Yi(e) {
  Zl(e).forEach((t) => {
    t.dataset.bulkClearBound !== "true" && (t.dataset.bulkClearBound = "true", t.addEventListener("click", () => {
      e.clearSelection();
    }));
  });
}
function ec(e, t) {
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
function tc(e) {
  if (!e) return null;
  let t = e.querySelector("[data-bulk-action-state-reasons]");
  return t || (t = document.createElement("div"), t.dataset.bulkActionStateReasons = "true", t.className = "hidden mt-3 text-sm text-gray-700", e.appendChild(t), t);
}
function Wi(e, t) {
  const r = tc(Ze(t));
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
function rc(e, t, r) {
  const n = t?.enabled === !1, i = typeof t?.reason == "string" ? t.reason.trim() : "";
  return e.dataset.disabled = n ? "true" : "false", e.setAttribute("aria-disabled", n ? "true" : "false"), e.dataset.bulkState = n ? "disabled" : "enabled", e.classList.toggle("opacity-50", n), e.classList.toggle("cursor-not-allowed", n), n && i ? (e.setAttribute("title", i), {
    actionId: e.dataset.bulkAction || "",
    label: r,
    reason: i
  }) : (e.removeAttribute("title"), null);
}
function nc(e) {
  const t = pn(e), r = "Checking selected records...", n = [];
  t.forEach((i) => {
    i.dataset.disabled = "true", i.dataset.bulkState = "loading", i.setAttribute("aria-disabled", "true"), i.setAttribute("title", r), i.classList.add("opacity-50", "cursor-not-allowed"), n.push({
      actionId: i.dataset.bulkAction || "",
      label: i.textContent?.trim() || i.dataset.bulkAction || "Action",
      reason: r
    });
  }), Wi(n, e);
}
function Xi(e) {
  return en(e.bulkActionStateConfig);
}
function ic(e, t, r) {
  e.bulkActionState = Kt(t), e.bulkActionStateConfig = en(r), e.applyBulkActionState(e.bulkActionState);
}
function sc(e, t) {
  const r = Kt(t);
  e.bulkActionState = r;
  const n = [];
  pn(e).forEach((i) => {
    const s = i.dataset.bulkAction;
    if (!s) return;
    const a = rc(i, r[s] || null, i.textContent?.trim() || s);
    a && n.push(a);
  }), Wi(n, e);
}
async function ac(e) {
  const t = Xi(e), r = typeof t?.selection_state_endpoint == "string" ? t.selection_state_endpoint.trim() : "";
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
  const i = e.bulkActionStateRequestSeq, s = typeof e.buildQueryString == "function" ? e.buildQueryString() : "", a = s ? `${r}${r.includes("?") ? "&" : "?"}${s}` : r;
  try {
    const o = await U(a, {
      method: "POST",
      signal: e.bulkActionStateAbortController.signal,
      json: { ids: n }
    });
    if (!o.ok) throw new Error(`Bulk action state request failed: ${o.status}`);
    const l = na(await o.json());
    if (!l || i !== e.bulkActionStateRequestSeq) return;
    e.applyBulkActionState({
      ...e.bulkActionState,
      ...l.bulk_action_state
    });
  } catch (o) {
    if (o instanceof Error && o.name === "AbortError") return;
    O.warn("[DataGrid] Failed to refresh selection-sensitive bulk action state:", o), i === e.bulkActionStateRequestSeq && e.applyBulkActionState(e.bulkActionState);
  }
}
function oc(e) {
  if (!e.isCapabilityEnabled("bulk")) return;
  e.bulkActionStateDebounce && (clearTimeout(e.bulkActionStateDebounce), e.bulkActionStateDebounce = null);
  const t = Xi(e), r = e.state.selectedRows.size;
  if (!t?.selection_sensitive || !t.selection_state_endpoint || r === 0) {
    e.bulkActionStateAbortController && (e.bulkActionStateAbortController.abort(), e.bulkActionStateAbortController = null), e.applyBulkActionState(e.bulkActionState);
    return;
  }
  nc(e);
  const n = typeof t.debounce_ms == "number" ? t.debounce_ms : 150;
  e.bulkActionStateDebounce = window.setTimeout(() => {
    e.bulkActionStateDebounce = null, ac(e);
  }, n);
}
function lc(e) {
  if (!e.isCapabilityEnabled("bulk")) return;
  const t = Ze(e)?.dataset?.bulkBase || "";
  pn(e).forEach((r) => {
    r.addEventListener("click", async () => {
      const n = r, i = n.dataset.bulkAction;
      if (!i || n.getAttribute("aria-disabled") === "true" || n.dataset.disabled === "true") return;
      const s = Array.from(e.state.selectedRows);
      if (s.length === 0) {
        e.notify("Please select items first", "warning");
        return;
      }
      if (e.config.bulkActions) {
        const a = e.config.bulkActions.find((o) => o.id === i);
        if (a) {
          try {
            await e.actionRenderer.executeBulkAction(a, s), e.clearSelection(), await e.refresh();
          } catch (o) {
            O.error("Bulk action failed:", o), ot(o)?.textCode && await e.refresh(), Be(o) || e.showError(o instanceof Error ? o.message : "Bulk action failed");
          }
          return;
        }
      }
      if (t) {
        const a = `${t}/${i}`, o = n.dataset.bulkConfirm, l = e.parseDatasetStringArray(n.dataset.bulkPayloadRequired), c = e.parseDatasetObject(n.dataset.bulkPayloadSchema), d = {
          id: i,
          label: n.textContent?.trim() || i,
          endpoint: a,
          confirm: o,
          payloadRequired: l,
          payloadSchema: c
        };
        try {
          await e.actionRenderer.executeBulkAction(d, s), e.clearSelection(), await e.refresh();
        } catch (f) {
          O.error("Bulk action failed:", f), ot(f)?.textCode && await e.refresh(), Be(f) || e.showError(f instanceof Error ? f.message : "Bulk action failed");
        }
        return;
      }
      if (e.config.behaviors?.bulkActions) try {
        await e.config.behaviors.bulkActions.execute(i, s, e), e.clearSelection();
      } catch (a) {
        O.error("Bulk action failed:", a), ot(a)?.textCode && await e.refresh(), Be(a) || e.showError(a instanceof Error ? a.message : "Bulk action failed");
      }
    });
  }), Yi(e), e.bindOverflowMenu();
}
function cc(e) {
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
function dc(e) {
  if (!e.isCapabilityEnabled("bulk")) return;
  const t = Ze(e), r = Ql(e), n = e.state.selectedRows.size;
  !t || !r || (r.textContent = String(n), ec(t, n), n > 0 && t.offsetHeight, e.syncBulkActionState());
}
function uc(e) {
  e.isCapabilityEnabled("bulk") && Yi(e);
}
function fc(e) {
  if (!e.isCapabilityEnabled("selection")) return;
  O.debug("[DataGrid] Clearing selection..."), e.state.selectedRows.clear();
  const t = e.tableEl?.querySelector(e.selectors.selectAllCheckbox);
  t && (t.checked = !1), e.updateBulkActionsBar(), e.updateSelectionBindings();
}
function hc(e, t, r) {
  Ns({
    trigger: t,
    menu: r
  });
}
function pc(e) {
  e.actionMenuController && (e.actionMenuController.destroy(), e.actionMenuController = null), e.dropdownAbortController && e.dropdownAbortController.abort(), e.dropdownAbortController = new AbortController();
  const { signal: t } = e.dropdownAbortController;
  document.querySelectorAll("[data-dropdown-toggle]").forEach((i) => {
    const s = i.dataset.dropdownToggle, a = document.getElementById(s || "");
    a && !a.classList.contains("hidden") && a.classList.add("hidden");
  });
  const r = (i = !1) => {
    document.querySelectorAll("[data-dropdown-toggle]").forEach((s) => {
      const a = s.dataset.dropdownToggle, o = document.getElementById(a || "");
      o && (o.classList.add("hidden"), s.setAttribute("aria-expanded", "false"), i && o.getAttribute("data-dropdown-open") === "true" && s.focus(), o.removeAttribute("data-dropdown-open"));
    });
  };
  Nl(document, "click", "[data-dropdown-toggle]", (i, s) => {
    const a = s.dataset.dropdownToggle, o = document.getElementById(a || "");
    if (!(!e.isCapabilityEnabled("export") && (s.matches(e.selectors.exportBtn) || o?.matches(e.selectors.exportMenu))) && (i.stopPropagation(), o)) {
      const l = o.classList.contains("hidden");
      document.querySelectorAll("[data-dropdown-toggle]").forEach((c) => {
        const d = c.dataset.dropdownToggle, f = document.getElementById(d || "");
        f && f !== o && (f.classList.add("hidden"), c.setAttribute("aria-expanded", "false"), f.removeAttribute("data-dropdown-open"));
      }), o.classList.toggle("hidden"), s.setAttribute("aria-expanded", String(l)), l ? (o.setAttribute("data-dropdown-open", "true"), o.querySelector('[role="option"], [role="menuitem"], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])')?.focus()) : (o.removeAttribute("data-dropdown-open"), s.focus());
    }
  }, { signal: t }), document.addEventListener("click", (i) => {
    const s = i.target;
    s && typeof s.closest == "function" && s.closest("[data-dropdown-toggle], #column-toggle-menu, #export-menu") || r();
  }, { signal: t });
  const n = e.tableEl ?? document;
  e.actionMenuController = js(n, {
    containerSelector: "[data-dropdown], .actions-dropdown",
    triggerSelector: "[data-dropdown-trigger], .actions-menu-trigger",
    menuSelector: ".actions-menu",
    itemSelector: '[role="menuitem"], .action-item',
    outsideIgnoreSelector: "[data-dropdown-toggle], #column-toggle-menu, #export-menu",
    positionMenu: ({ trigger: i, menu: s }) => {
      e.positionDropdownMenu(i, s);
    },
    portal: !0,
    signal: t
  }), document.addEventListener("keydown", (i) => {
    i.key === "Escape" && r(!0);
  }, { signal: t });
}
function mc(e, t) {
  O.error(t), e.notifier.error(t);
}
function gc(e, t, r) {
  e.notifier.show({
    message: t,
    type: r
  });
}
async function bc(e, t) {
  return e.notifier.confirm(t);
}
async function yc(e, t) {
  return t instanceof Response ? ws(t) : t instanceof Error ? t.message : "An unexpected error occurred";
}
function vc(e, t) {
  if (t)
    try {
      const r = JSON.parse(t);
      if (!Array.isArray(r)) return;
      const n = r.map((i) => typeof i == "string" ? i.trim() : "").filter((i) => i.length > 0);
      return n.length > 0 ? n : void 0;
    } catch (r) {
      O.warn("[DataGrid] Failed to parse bulk payload_required:", r);
      return;
    }
}
function wc(e, t) {
  if (t)
    try {
      const r = JSON.parse(t);
      return !r || typeof r != "object" || Array.isArray(r) ? void 0 : r;
    } catch (r) {
      O.warn("[DataGrid] Failed to parse bulk payload_schema:", r);
      return;
    }
}
var Qi = M("DataGrid");
function xc(e, t) {
  if (!e.tableEl) return;
  const r = e.mergeColumnOrder(t);
  e.state.columnOrder = r;
  const n = new Map(e.config.columns.map((i) => [i.field, i]));
  e.config.columns = r.map((i) => n.get(i)).filter((i) => i !== void 0), e.reorderTableColumns(r), e.persistStateSnapshot(), Qi.debug("[DataGrid] Columns reordered:", r);
}
function Sc(e) {
  e.config.behaviors?.columnVisibility?.clearSavedPrefs?.(), e.config.columns = e.defaultColumns.map((r) => ({ ...r })), e.state.columnOrder = e.config.columns.map((r) => r.field);
  const t = e.config.columns.filter((r) => !r.hidden).map((r) => r.field);
  e.tableEl ? (e.reorderTableColumns(e.state.columnOrder), e.updateColumnVisibility(t)) : (e.state.hiddenColumns = new Set(e.config.columns.filter((r) => r.hidden).map((r) => r.field)), e.persistStateSnapshot()), e.columnManager && (e.columnManager.refresh(), e.columnManager.syncWithGridState()), Qi.debug("[DataGrid] Columns reset to default");
}
function Cc(e, t) {
  const r = new Set(e.config.columns.map((a) => a.field)), n = new Set(t), i = t.filter((a) => r.has(a)), s = e.config.columns.map((a) => a.field).filter((a) => !n.has(a));
  return [...i, ...s];
}
function Ec(e, t) {
  if (!e.tableEl) return;
  const r = e.tableEl.querySelector("thead tr:first-child");
  r && e.reorderRowCells(r, t, "th");
  const n = e.tableEl.querySelector("#filter-row");
  n && e.reorderRowCells(n, t, "th"), e.tableEl.querySelectorAll("tbody tr").forEach((i) => {
    e.reorderRowCells(i, t, "td");
  });
}
function Ac(e, t, r, n) {
  const i = Array.from(t.querySelectorAll(`${n}[data-column]`)), s = new Map(i.map((d) => [d.dataset.column, d])), a = Array.from(t.querySelectorAll(n)), o = t.querySelector(`${n}[data-role="selection"]`) || a.find((d) => d.querySelector('input[type="checkbox"]')), l = t.querySelector(`${n}[data-role="actions"]`) || a.find((d) => !d.dataset.column && (d.querySelector("[data-action]") || d.querySelector("[data-action-id]") || d.querySelector(".dropdown"))), c = [];
  o && c.push(o), r.forEach((d) => {
    const f = s.get(d);
    f && c.push(f);
  }), l && c.push(l), c.forEach((d) => {
    t.appendChild(d);
  });
}
var W, et = M("DataGrid");
function $c(e) {
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
var Zi = class {
  constructor(e) {
    this.tableEl = null, this.searchTimeout = null, this.abortController = null, this.dropdownAbortController = null, this.actionMenuController = null, this.selectionAbortController = null, this.didRestoreColumnOrder = !1, this.shouldReorderDOMOnRestore = !1, this.recordsById = {}, this.columnManager = null, this.lastSchema = null, this.lastForm = null, this.bulkActionState = {}, this.bulkActionStateConfig = null, this.bulkActionStateDebounce = null, this.bulkActionStateAbortController = null, this.bulkActionStateRequestSeq = 0, this.refreshDrainPromise = null, this.refreshInFlight = null, this.refreshQueued = !1, this.refreshRequestSeq = 0, this.activeRefreshSeq = 0, this.hasURLStateOverrides = !1, this.hasPersistedHiddenColumnState = !1, this.hasPersistedColumnOrderState = !1, this.config = {
      perPage: 10,
      searchDelay: 300,
      behaviors: {},
      ...e,
      capabilities: $c(e.capabilities)
    }, this.notifier = e.notifier || new Qe(), this.selectors = {
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
    this.stateStore = this.config.stateStore || Oa({
      key: t,
      ...this.config.stateStoreConfig || {}
    });
    const r = this.stateStore.loadPersistedState(), n = new Set(this.config.columns.map((E) => E.field)), i = new Set(this.config.columns.filter((E) => E.hidden).map((E) => E.field)), s = !!r && Array.isArray(r.hiddenColumns);
    this.hasPersistedHiddenColumnState = s;
    const a = new Set((r?.hiddenColumns || []).filter((E) => n.has(E))), o = this.config.columns.map((E) => E.field), l = !!r && Array.isArray(r.columnOrder) && r.columnOrder.length > 0;
    this.hasPersistedColumnOrderState = l;
    const c = (r?.columnOrder || []).filter((E) => n.has(E)), d = l ? [...c, ...o.filter((E) => !c.includes(E))] : o, f = this.config.enableGroupedMode ? Wa(t) : !1, h = this.config.enableGroupedMode ? Qa(t) : null, p = this.config.enableGroupedMode ? Ya(t) : "explicit", m = this.config.enableGroupedMode ? Ja(t) : /* @__PURE__ */ new Set(), g = wt(r?.expandMode, p), y = new Set((r?.expandedGroups || Array.from(m)).map((E) => String(E).trim()).filter(Boolean)), w = this.config.enableGroupedMode ? r?.expandMode !== void 0 || y.size > 0 || f : !1, x = (this.config.enableGroupedMode ? r?.viewMode || h : null) || this.config.defaultViewMode || "flat";
    this.state = {
      currentPage: 1,
      perPage: this.config.perPage || 10,
      totalRows: 0,
      search: "",
      filters: [],
      sort: [],
      selectedRows: /* @__PURE__ */ new Set(),
      hiddenColumns: s ? a : i,
      columnOrder: d,
      viewMode: x,
      expandMode: g,
      groupedData: null,
      expandedGroups: y,
      hasPersistedExpandState: w
    }, this.actionRenderer = new Gs({
      mode: this.config.actionRenderMode || "dropdown",
      actionBasePath: this.config.actionBasePath || this.config.apiEndpoint,
      notifier: this.notifier,
      domIdPrefix: this.config.tableId
    }), this.cellRendererRegistry = new ka(), this.config.cellRenderers && Object.entries(this.config.cellRenderers).forEach(([E, L]) => {
      this.cellRendererRegistry.register(E, L);
    }), this.defaultColumns = this.config.columns.map((E) => ({ ...E }));
  }
  init() {
    if (et.debug("[DataGrid] Initializing with config:", this.config), this.tableEl = document.querySelector(this.selectors.table), !this.tableEl) {
      et.error(`[DataGrid] Table element not found: ${this.selectors.table}`);
      return;
    }
    et.debug("[DataGrid] Table element found:", this.tableEl), el(this), jl(this), this.restoreStateFromURL(), this.bindSearchInput(), this.bindPerPageSelect(), this.bindFilterInputs(), this.bindColumnVisibility(), this.bindExportButtons(), this.bindSorting(), this.bindSelection(), this.bindBulkActions(), this.bindBulkClearButton(), this.bindDropdownToggles(), this.refreshAfterStateHydration();
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
        et.error("[DataGrid] onStateChange callback failed:", t);
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
    return uo(this);
  }
  parseJSONArray(e, t) {
    return fo(this, e, t);
  }
  applyPersistedStateSnapshot(e, t = {}) {
    mo(this, e, t);
  }
  applyShareStateSnapshot(e) {
    go(this, e);
  }
  buildPersistedStateSnapshot() {
    return bo(this);
  }
  buildShareStateSnapshot() {
    return yo(this);
  }
  persistStateSnapshot() {
    vo(this);
  }
  restoreStateFromURL() {
    wo(this);
  }
  applyRestoredState() {
    xo(this);
  }
  pushStateToURL(e = {}) {
    So(this, e);
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
      this.activeRefreshSeq = e, this.refreshInFlight = Co(this, e), await this.refreshInFlight, this.refreshInFlight = null;
    }
  }
  buildApiUrl() {
    return Eo(this);
  }
  buildQueryString() {
    return Ao(this);
  }
  buildQueryParams() {
    return $o(this);
  }
  getResponseTotal(e) {
    return ko(this, e);
  }
  normalizePagination(e) {
    return _o(this, e);
  }
  resetPagination() {
    this.state.currentPage = 1;
  }
  updateColumnVisibility(e, t = !1) {
    Qo(this, e, t);
  }
  syncColumnVisibilityCheckboxes() {
    Zo(this);
  }
  renderData(e) {
    nl(this, e);
  }
  renderLoadingState() {
    tl(this);
  }
  renderErrorState(e) {
    rl(this, e);
  }
  renderFlatData(e, t) {
    il(this, e, t);
  }
  renderGroupedData(e, t, r) {
    Mo(this, e, t, r);
  }
  isGroupedViewActive() {
    return Io(this);
  }
  fallbackGroupedMode(e) {
    Bo(this, e);
  }
  handleGroupedModeStatusFallback(e) {
    return Oo(this, e);
  }
  handleGroupedModePayloadFallback(e) {
    return Fo(this, e);
  }
  toggleGroup(e) {
    qo(this, e);
  }
  setExpandedGroups(e) {
    No(this, e);
  }
  expandAllGroups() {
    jo(this);
  }
  collapseAllGroups() {
    zo(this);
  }
  updateGroupVisibility(e) {
    Go(this, e);
  }
  updateGroupedRowsFromState() {
    Uo(this);
  }
  isGroupExpandedByState(e, t = !1) {
    return Ho(this, e, t);
  }
  setViewMode(e) {
    Vo(this, e);
  }
  getViewMode() {
    return Ko(this);
  }
  getGroupedData() {
    return Jo(this);
  }
  async fetchDetail(e) {
    return Lo(this, e);
  }
  getSchema() {
    return To(this);
  }
  getForm() {
    return Ro(this);
  }
  getTabs() {
    return Po(this);
  }
  normalizeDetailResponse(e) {
    return Do(this, e);
  }
  resolveRendererOptions(e) {
    return sl(this, e);
  }
  createTableRow(e) {
    return al(this, e);
  }
  sanitizeActionId(e) {
    return ol(this, e);
  }
  async handleDelete(e) {
    return ll(this, e);
  }
  updatePaginationUI(e) {
    cl(this, e);
  }
  renderPaginationButtons(e) {
    dl(this, e);
  }
  bindSearchInput() {
    zl(this);
  }
  bindPerPageSelect() {
    Gl(this);
  }
  bindFilterInputs() {
    Ul(this);
  }
  bindColumnVisibility() {
    Hl(this);
  }
  bindExportButtons() {
    Vl(this);
  }
  bindSorting() {
    Kl(this);
  }
  updateSortIndicators() {
    Jl(this);
  }
  bindSelection() {
    Yl(this);
  }
  updateSelectionBindings() {
    Wl(this);
  }
  bindBulkActions() {
    lc(this);
  }
  bindOverflowMenu() {
    cc(this);
  }
  updateBulkActionsBar() {
    dc(this);
  }
  setBulkActionState(e, t) {
    ic(this, e, t);
  }
  applyBulkActionState(e) {
    sc(this, e);
  }
  syncBulkActionState() {
    oc(this);
  }
  bindBulkClearButton() {
    uc(this);
  }
  clearSelection() {
    fc(this);
  }
  positionDropdownMenu(e, t) {
    hc(this, e, t);
  }
  bindDropdownToggles() {
    pc(this);
  }
  showError(e) {
    mc(this, e);
  }
  notify(e, t) {
    gc(this, e, t);
  }
  async confirmAction(e) {
    return bc(this, e);
  }
  async extractError(e) {
    return yc(this, e);
  }
  parseDatasetStringArray(e) {
    return vc(this, e);
  }
  parseDatasetObject(e) {
    return wc(this, e);
  }
  reorderColumns(e) {
    xc(this, e);
  }
  resetColumnsToDefault() {
    Sc(this);
  }
  mergeColumnOrder(e) {
    return Cc(this, e);
  }
  reorderTableColumns(e) {
    Ec(this, e);
  }
  reorderRowCells(e, t, r) {
    Ac(this, e, t, r);
  }
  destroy() {
    this.columnManager && (this.columnManager.destroy(), this.columnManager = null), this.dropdownAbortController && (this.dropdownAbortController.abort(), this.dropdownAbortController = null), this.actionMenuController && (this.actionMenuController.destroy(), this.actionMenuController = null), this.selectionAbortController && (this.selectionAbortController.abort(), this.selectionAbortController = null), this.abortController && (this.abortController.abort(), this.abortController = null), this.bulkActionStateAbortController && (this.bulkActionStateAbortController.abort(), this.bulkActionStateAbortController = null), this.searchTimeout && (clearTimeout(this.searchTimeout), this.searchTimeout = null), this.bulkActionStateDebounce && (clearTimeout(this.bulkActionStateDebounce), this.bulkActionStateDebounce = null), et.debug("[DataGrid] Instance destroyed");
  }
};
W = Zi;
W.URL_KEY_SEARCH = gt;
W.URL_KEY_PAGE = bt;
W.URL_KEY_PER_PAGE = yt;
W.URL_KEY_FILTERS = Ne;
W.URL_KEY_SORT = vt;
W.URL_KEY_STATE = Yt;
W.URL_KEY_HIDDEN_COLUMNS = Wt;
W.URL_KEY_VIEW_MODE = Xt;
W.URL_KEY_EXPANDED_GROUPS = on;
W.MANAGED_URL_KEYS = ln;
W.DEFAULT_MAX_URL_LENGTH = co;
W.DEFAULT_MAX_FILTERS_LENGTH = 600;
typeof window < "u" && (window.DataGrid = Zi);
var De = M("DataGrid"), Bn = {
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
}, gf = class {
  constructor(e) {
    this.criteria = [], this.modal = null, this.container = null, this.searchInput = null, this.clearBtn = null, this.config = e, this.notifier = e.notifier || new Qe();
  }
  init() {
    if (this.modal = document.getElementById("advanced-search-modal"), this.container = document.getElementById("search-criteria-container"), this.searchInput = document.getElementById("table-search"), this.clearBtn = document.getElementById("search-clear-btn"), !this.modal || !this.container) {
      De.error("[AdvancedSearch] Required elements not found");
      return;
    }
    const e = this.restoreCriteriaFromURL();
    this.criteria.length > 0 && (this.renderCriteria(), this.renderChips()), e && this.config.onSearch(this.criteria), this.bindEvents(), this.bindClearButton();
  }
  restoreCriteriaFromURL() {
    const e = new URLSearchParams(window.location.search), t = e.get(Dt);
    if (t !== null) {
      const n = this.parseAdvancedSearchCriteria(t);
      return n ? (this.criteria = n, !0) : !1;
    }
    const r = e.get(Ne);
    if (r !== null) try {
      const n = JSON.parse(r);
      return this.criteria = this.normalizeCriteria(Array.isArray(n) ? n.map((i) => ({
        field: i?.column,
        operator: i?.operator || "ilike",
        value: i?.value,
        logic: "and"
      })) : []), De.debug("[AdvancedSearch] Restored criteria from URL:", this.criteria), !0;
    } catch (n) {
      De.warn("[AdvancedSearch] Failed to parse filters from URL:", n);
    }
    return !1;
  }
  parseAdvancedSearchCriteria(e) {
    try {
      const t = JSON.parse(e);
      if (!Array.isArray(t))
        return De.warn("[AdvancedSearch] Invalid advanced_search payload in URL (expected array)"), null;
      const r = this.normalizeCriteria(t);
      return De.debug("[AdvancedSearch] Restored criteria from URL:", r), r;
    } catch (t) {
      return De.warn("[AdvancedSearch] Failed to parse advanced_search from URL:", t), null;
    }
  }
  normalizeCriteria(e) {
    const t = new Set(this.config.fields.map((r) => r.name));
    return e.map((r) => {
      const n = String(r?.field || "").trim();
      if (!n || !t.has(n)) return null;
      const i = String(r?.operator || "ilike").trim() || "ilike", s = r?.logic === "or" ? "or" : "and";
      return {
        field: n,
        operator: i,
        value: typeof r?.value == "number" ? r.value : String(r?.value || ""),
        logic: s
      };
    }).filter((r) => r !== null);
  }
  pushCriteriaToURL() {
    const e = new URLSearchParams(window.location.search);
    this.criteria.length > 0 ? e.set(Dt, JSON.stringify(this.criteria)) : (e.delete(Dt), e.delete(Ne)), _i.forEach((r) => e.delete(r));
    const t = e.toString() ? `${window.location.pathname}?${e.toString()}` : window.location.pathname;
    window.history.pushState({}, "", t), De.debug("[AdvancedSearch] URL updated with criteria");
  }
  bindEvents() {
    document.getElementById("advanced-search-btn")?.addEventListener("click", () => this.open());
    const e = document.getElementById("advanced-search-close"), t = document.getElementById("advanced-search-cancel"), r = document.getElementById("advanced-search-overlay");
    e?.addEventListener("click", () => this.close()), t?.addEventListener("click", () => this.close()), r?.addEventListener("click", () => this.close()), document.getElementById("add-criteria-btn")?.addEventListener("click", () => this.addCriterion()), document.getElementById("advanced-search-apply")?.addEventListener("click", () => this.applySearch());
    const n = document.getElementById("save-search-preset-btn"), i = document.getElementById("load-search-preset-btn");
    n?.addEventListener("click", () => this.savePreset()), i?.addEventListener("click", () => this.loadPreset());
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
      n.addEventListener("click", (i) => {
        const s = i.target, a = parseInt(s.dataset.logicIndex || "0", 10), o = s.dataset.logicValue;
        this.criteria[a].logic = o, this.renderCriteria();
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
    })) : Bn[e.type] || Bn.text;
  }
  applySearch() {
    this.pushCriteriaToURL(), this.config.onSearch(this.criteria), this.renderChips(), this.close();
  }
  savePreset() {
    new yn({
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
    new yn({
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
      t && (t.placeholder = "", t.style.display = ""), r && r.classList.remove("hidden"), this.criteria.forEach((n, i) => {
        const s = this.createChip(n, i);
        e.appendChild(s);
      });
    }
  }
  createChip(e, t) {
    const r = document.createElement("div");
    r.className = "inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded border border-blue-200", r.innerHTML = `
      <span>${this.config.fields.find((i) => i.name === e.field)?.label || e.field} ${e.operator === "ilike" ? "contains" : e.operator === "eq" ? "is" : e.operator} "${e.value}"</span>
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
}, On = M("DataGrid"), kc = {
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
}, _c = 0;
function es(e) {
  return e == null ? e : typeof structuredClone == "function" ? structuredClone(e) : JSON.parse(JSON.stringify(e));
}
function tt(e) {
  return {
    groups: e.groups.map((t) => ({
      logic: t.logic,
      conditions: t.conditions.map((r) => ({
        field: r.field,
        operator: r.operator,
        value: es(r.value)
      }))
    })),
    groupLogic: [...e.groupLogic]
  };
}
function rt(e) {
  return e ? typeof e != "string" ? e : document.querySelector(e) : null;
}
var bf = class {
  constructor(e) {
    if (this.cleanupListeners = [], this.panel = null, this.root = null, this.container = null, this.previewElement = null, this.sqlPreviewElement = null, this.overlay = null, this.toggleButton = null, this.appliedPreviewContainer = null, this.ownsPanelID = !1, this.previousPanelInstance = null, this.previousToggleAriaControls = null, this.previousToggleAriaExpanded = null, this.destroyed = !1, !Array.isArray(e.fields) || e.fields.length === 0) throw new Error("[FilterBuilder] At least one field is required");
    this.config = e, this.mode = e.mode ?? "overlay", this.messages = {
      ...kc,
      ...e.messages
    }, this.limits = this.resolveLimits(e.limits), this.chrome = this.resolveChrome(e.chrome), this.actions = this.resolveActions(e.actions), this.instanceID = `filter-builder-${++_c}`, this.notifier = e.notifier || new Qe(), this.structure = e.initialStructure ? this.normalizeStructure(e.initialStructure) : this.createDefaultStructure(), this.init();
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
    const t = (r, n) => {
      if (r === void 0) return Number.POSITIVE_INFINITY;
      if (!Number.isInteger(r) || r < 1) throw new Error(`[FilterBuilder] ${n} must be a positive integer`);
      return r;
    };
    return {
      maxGroups: t(e?.maxGroups, "maxGroups"),
      maxConditionsPerGroup: t(e?.maxConditionsPerGroup, "maxConditionsPerGroup"),
      maxTotalConditions: t(e?.maxTotalConditions, "maxTotalConditions")
    };
  }
  init() {
    if (this.previewElement = rt(this.config.previewElement), this.mode === "compact") {
      if (this.panel = rt(this.config.host), !this.panel) throw new Error("[FilterBuilder] Compact mode requires a valid host");
    } else {
      if (this.panel = rt(this.config.host) || document.getElementById("filter-panel"), !this.panel) {
        On.error("[FilterBuilder] Panel element not found");
        return;
      }
      this.toggleButton = rt(this.config.toggleButton) || document.getElementById("filter-toggle-btn"), this.overlay = rt(this.config.overlay) || document.getElementById("filter-overlay"), this.previewElement || (this.previewElement = document.getElementById("filter-preview-text")), this.appliedPreviewContainer = document.getElementById("applied-filter-preview");
    }
    if (Array.from(this.panel.children).some((e) => e.hasAttribute("data-filter-builder-root"))) throw new Error("[FilterBuilder] Host already contains a mounted FilterBuilder");
    this.previousPanelInstance = this.panel.getAttribute("data-filter-builder-instance"), this.panel.dataset.filterBuilderInstance = this.instanceID, this.mode === "overlay" && !this.panel.id && (this.panel.id = this.instanceID, this.ownsPanelID = !0), this.toggleButton && (this.previousToggleAriaControls = this.toggleButton.getAttribute("aria-controls"), this.previousToggleAriaExpanded = this.toggleButton.getAttribute("aria-expanded")), this.buildPanelStructure(), this.bindOwnedListeners(), this.mode === "overlay" && !this.config.initialStructure && (this.config.restoreFromURL ?? !0) && this.restoreFromURL();
  }
  buildPanelStructure() {
    if (!this.panel) return;
    this.root = document.createElement("div"), this.root.dataset.filterBuilderRoot = this.instanceID, this.panel.appendChild(this.root);
    const e = this.chrome.header ? `
      <div class="flex items-center justify-between mb-4" data-filter-builder-header>
        <h3 id="${this.instanceID}-title" class="text-base font-semibold text-gray-900">${u(this.chrome.title)}</h3>
        ${this.chrome.savedFilters ? `
          <div class="flex gap-2">
            <button type="button" data-filter-builder-saved-menu class="text-sm text-blue-600 hover:text-blue-800">
              ${u(this.messages.savedFilters)} ▾
            </button>
            <button type="button" data-filter-builder-edit-sql class="text-sm text-blue-600 hover:text-blue-800">
              ${u(this.messages.editAsSQL)}
            </button>
          </div>
        ` : ""}
      </div>
    ` : "", t = this.chrome.sqlPreview ? `
      <div class="border-t border-gray-200 pt-3 mb-4" data-filter-builder-preview-region>
        <div class="text-xs text-gray-500 mb-1">${u(this.messages.previewLabel)}</div>
        <div data-filter-builder-sql-preview aria-live="polite" class="text-xs font-mono text-gray-700 bg-gray-50 p-2 rounded border border-gray-200 min-h-[40px] max-h-[100px] overflow-y-auto break-words">
          ${u(this.messages.noFiltersApplied)}
        </div>
      </div>
    ` : "", r = this.actions.apply || this.actions.clear || this.actions.save ? `
      <div class="flex items-center justify-between border-t border-gray-200 pt-4" data-filter-builder-actions>
        <div class="flex gap-2">
          ${this.actions.save ? `
            <label class="sr-only" for="${this.instanceID}-save-name">${u(this.messages.filterName)}</label>
            <input type="text" id="${this.instanceID}-save-name" data-filter-builder-save-name placeholder="${u(this.messages.filterNamePlaceholder)}" class="text-sm border border-gray-200 rounded px-3 py-1.5 w-48">
            <button type="button" data-filter-builder-action="save" class="text-sm text-gray-600 hover:text-gray-800 border border-gray-200 rounded px-3 py-1.5">
              ${u(this.messages.saveFilter)}
            </button>
          ` : ""}
        </div>
        <div class="flex gap-2">
          ${this.actions.clear ? `
            <button type="button" data-filter-builder-action="clear" class="text-sm text-gray-700 hover:text-gray-900 px-4 py-2">
              ${u(this.messages.clearAll)}
            </button>
          ` : ""}
          ${this.actions.apply ? `
            <button type="button" data-filter-builder-action="apply" class="text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg px-4 py-2">
              ${u(this.messages.applyFilter)}
            </button>
          ` : ""}
        </div>
      </div>
    ` : "";
    this.root.innerHTML = `
      ${e}
      <div data-filter-builder-groups class="space-y-3 mb-4"></div>
      <p data-filter-builder-limit-status class="hidden mb-3 text-xs text-amber-700" role="status" aria-live="polite"></p>
      <button type="button" data-filter-builder-action="add-group" class="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-50 mb-4" aria-label="${u(this.messages.addFilterGroup)}">
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
          <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
        </svg>
        ${u(this.messages.and)}
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
    const r = Number(t.dataset.groupIndex), n = Number(t.dataset.conditionIndex), i = this.structure.groups[r]?.conditions[n];
    if (i)
      switch (t.dataset.filterBuilderPart) {
        case "field": {
          const s = this.getField(t.value);
          if (!s || s.disabled) return;
          i.field = t.value, i.operator = this.getOperatorsForField(s)[0]?.value ?? "eq", i.value = "", this.render(), this.focusConditionPart(r, n, "operator"), this.emitChange();
          return;
        }
        case "operator": {
          const s = this.getField(i.field);
          if (!s || s.disabled) return;
          const a = this.getOperatorsForField(s);
          if (!a.some((l) => l.value === t.value)) return;
          const o = a.some((l) => l.value === i.operator);
          i.operator = t.value, o ? this.updatePreview() : (this.render(), this.focusConditionPart(r, n, "value")), this.emitChange();
          return;
        }
        case "value":
          if (t.tagName === "INPUT") return;
          {
            const s = this.getField(i.field);
            if (!s || s.disabled || !this.getOperatorsForField(s).some((o) => o.value === i.operator)) return;
            const a = this.isValueAvailable(s, i.value);
            i.value = t.value, a ? this.updatePreview() : (this.render(), this.focusConditionPart(r, n, "value")), this.emitChange();
            return;
          }
      }
  }
  handleInput(e) {
    if (this.destroyed) return;
    const t = e.target;
    if (t?.dataset.filterBuilderPart !== "value" || t.tagName === "SELECT") return;
    const r = Number(t.dataset.groupIndex), n = Number(t.dataset.conditionIndex), i = this.structure.groups[r]?.conditions[n];
    if (!i) return;
    const s = this.getField(i.field);
    !s || s.disabled || !this.getOperatorsForField(s).some((a) => a.value === i.operator) || (i.value = t.value, this.updatePreview(), this.emitChange());
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
    const t = tt(e);
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
    const r = this.root.querySelector('[data-filter-builder-action="add-group"]'), n = this.addGroupLimitReason();
    r && (r.disabled = n !== "", n ? r.title = n : r.removeAttribute("title"));
  }
  render() {
    !this.container || this.destroyed || (this.container.innerHTML = this.structure.groups.map((e, t) => {
      const r = t < this.structure.groups.length - 1 ? this.renderGroupConnector(t) : "";
      return `${this.renderGroup(e, t)}${r}`;
    }).join(""), this.updateLimitState(), this.updatePreview());
  }
  renderGroup(e, t) {
    const r = this.addConditionLimitReason(t), n = r ? ` disabled title="${u(r)}"` : "", i = e.logic === "and" ? this.messages.and : this.messages.or, s = e.conditions.map((a, o) => {
      const l = o < e.conditions.length - 1 ? `<div class="flex items-center justify-center my-1" aria-hidden="true">
            <span class="text-xs font-medium text-gray-500 px-2 py-0.5 bg-white border border-gray-200 rounded">${u(i)}</span>
          </div>` : "";
      return `${this.renderCondition(a, t, o)}${l}`;
    }).join("");
    return `
      <div class="border border-gray-200 rounded-lg p-3 bg-gray-50" data-filter-builder-group="${t}">
        <div class="flex justify-end mb-2">
          <button type="button" data-filter-builder-action="remove-group" data-group-index="${t}" class="text-xs text-red-600 hover:text-red-800" aria-label="${u(this.messages.removeGroupLabel(t + 1))}">
            ${u(this.messages.removeGroup)}
          </button>
        </div>
        ${s}
        <button type="button" data-filter-builder-action="add-condition" data-group-index="${t}" class="mt-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 disabled:cursor-not-allowed disabled:opacity-50" aria-label="${u(this.messages.addConditionLabel(i, t + 1))}"${n}>
          <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M12 5v14"/><path d="M5 12h14"/>
          </svg>
          ${u(i)}
        </button>
      </div>
    `;
  }
  renderCondition(e, t, r) {
    const n = this.getField(e.field), i = r + 1, s = this.renderFieldOptions(e.field), a = n ? this.getOperatorsForField(n) : [], o = a.some((x) => x.value === e.operator), l = `${o ? "" : `
      <option value="${u(e.operator)}" selected disabled>
        ${u(this.messages.unavailableOperatorOption(e.operator))}
      </option>
    `}${a.map((x) => `
      <option value="${u(x.value)}" ${x.value === e.operator ? "selected" : ""}>${u(x.label)}</option>
    `).join("")}`, c = n ? n.disabled ? n.disabledReason || this.messages.disabledFieldReason(n.label) : "" : this.messages.missingFieldReason(e.field), d = n && !o ? this.messages.missingOperatorReason(e.operator, n.label) : "", f = n ? this.isValueAvailable(n, e.value) : !0, h = n && o && !n.disabled && !f ? this.messages.missingValueReason(String(e.value), n.label) : "", p = c || d || h, m = `${this.instanceID}-group-${t + 1}-condition-${r + 1}-status`, g = p ? ` aria-describedby="${m}"` : "", y = n || {
      name: e.field,
      label: e.field,
      type: "text"
    }, w = !n || n.disabled || !o;
    return `
      <div class="flex flex-wrap items-center gap-2 mb-2" data-filter-builder-condition="${t}-${r}">
        <div class="flex items-center text-gray-400 cursor-move" title="${u(this.messages.dragToReorder)}" aria-hidden="true">
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/>
            <circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/>
          </svg>
        </div>
        <select data-filter-builder-part="field" data-group-index="${t}" data-condition-index="${r}" aria-label="${u(this.messages.fieldControlLabel(t + 1, i))}"${g} class="py-1.5 px-2 text-sm border-gray-200 rounded-lg bg-white w-32">
          ${s}
        </select>
        <select data-filter-builder-part="operator" data-group-index="${t}" data-condition-index="${r}" aria-label="${u(this.messages.operatorControlLabel(t + 1, i))}"${g} ${!n || n.disabled ? "disabled" : ""} class="py-1.5 px-2 text-sm border-gray-200 rounded-lg bg-white w-36">
          ${l}
        </select>
        ${this.renderValueInput(y, e, t, r, i, w, g)}
        <button type="button" data-filter-builder-action="remove-condition" data-group-index="${t}" data-condition-index="${r}" class="text-red-600 hover:text-red-800" aria-label="${u(this.messages.removeConditionLabel(i))}">
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M3 6h18"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
          </svg>
        </button>
        <button type="button" data-filter-builder-action="add-condition-or" data-group-index="${t}" class="px-2 py-1 text-xs border border-blue-600 text-blue-600 rounded hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50" aria-label="${u(this.messages.addLogicConditionLabel(this.messages.or))}"${this.addConditionLimitReason(t) ? ` disabled title="${u(this.addConditionLimitReason(t))}"` : ""}>
          ${u(this.messages.or)}
        </button>
        <button type="button" data-filter-builder-action="add-condition-and" data-group-index="${t}" class="px-2 py-1 text-xs border border-blue-600 text-blue-600 rounded hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50" aria-label="${u(this.messages.addLogicConditionLabel(this.messages.and))}"${this.addConditionLimitReason(t) ? ` disabled title="${u(this.addConditionLimitReason(t))}"` : ""}>
          ${u(this.messages.and)}
        </button>
        ${p ? `
          <p id="${m}" data-filter-builder-field-status class="w-full text-xs text-amber-700" role="note">
            ${u(p)}
          </p>
        ` : ""}
      </div>
    `;
  }
  renderFieldOptions(e) {
    let t = "", r = "";
    this.getField(e) || (r += `
        <option value="${u(e)}" selected disabled>
          ${u(this.messages.unavailableFieldOption(e))}
        </option>
      `);
    for (const n of this.config.fields) {
      const i = n.group?.trim() || "";
      i !== t && (t && (r += "</optgroup>"), i && (r += `<optgroup label="${u(i)}">`), t = i);
      const s = n.disabled ? this.messages.disabledFieldOption(n.label, n.disabledReason || this.messages.unavailable) : n.label;
      r += `
        <option value="${u(n.name)}" ${n.name === e ? "selected" : ""} ${n.disabled ? "disabled" : ""}>
          ${u(s)}
        </option>
      `;
    }
    return t && (r += "</optgroup>"), r;
  }
  renderValueInput(e, t, r, n, i, s, a) {
    const o = `data-filter-builder-part="value" data-group-index="${r}" data-condition-index="${n}" aria-label="${u(this.messages.valueControlLabel(r + 1, i))}"${a} ${s ? "disabled" : ""}`;
    if (e.type === "select") {
      const l = this.isValueAvailable(e, t.value) ? "" : `
        <option value="${u(t.value)}" selected disabled>${u(this.messages.unavailableValueOption(String(t.value)))}</option>
      `, c = (e.options || []).map((d) => `
        <option value="${u(d.value)}" ${String(d.value) === String(t.value) ? "selected" : ""}>${u(d.label)}</option>
      `).join("");
      return `
        <select ${o} class="flex-1 min-w-[200px] py-1.5 px-2 text-sm border-gray-200 rounded-lg bg-white">
          <option value="">${u(this.messages.selectValue)}</option>
          ${l}
          ${c}
        </select>
      `;
    }
    return `
      <input type="${e.type === "date" ? "date" : e.type === "number" ? "number" : "text"}" ${o} value="${u(t.value)}" placeholder="${u(this.messages.enterValue)}" class="flex-1 min-w-[200px] py-1.5 px-2 text-sm border-gray-200 rounded-lg">
    `;
  }
  isValueAvailable(e, t) {
    return e.type !== "select" || t === "" || t === null || t === void 0 ? !0 : (e.options || []).some((r) => String(r.value) === String(t));
  }
  renderGroupConnector(e) {
    const t = this.structure.groupLogic[e] || "and";
    return `
      <div class="flex items-center justify-center py-2" role="group" aria-label="${u(this.messages.groupConnectorLabel(e + 1, e + 2))}">
        <button type="button" data-filter-builder-action="group-logic" data-group-index="${e}" data-logic-value="and" aria-pressed="${t === "and"}" class="px-3 py-1 text-xs font-medium rounded-l border ${t === "and" ? "bg-green-600 text-white border-green-600" : "bg-gray-200 text-gray-800 border-gray-300 hover:bg-gray-300"}">
          ${u(this.messages.and)}
        </button>
        <button type="button" data-filter-builder-action="group-logic" data-group-index="${e}" data-logic-value="or" aria-pressed="${t === "or"}" class="px-3 py-1 text-xs font-medium rounded-r border ${t === "or" ? "bg-green-600 text-white border-green-600" : "bg-gray-200 text-gray-800 border-gray-300 hover:bg-gray-300"}">
          ${u(this.messages.or)}
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
      const n = t.conditions.filter((i) => i.value !== "" && i.value !== null && i.value !== void 0).map((i) => {
        const s = i.operator.toUpperCase(), a = typeof i.value == "string" ? `'${i.value}'` : i.value;
        return `${i.field} ${s === "ILIKE" ? "ILIKE" : s === "EQ" ? "=" : s} ${a}`;
      });
      return n.length === 0 ? null : {
        groupIndex: r,
        text: n.length === 1 ? n[0] : `( ${n.join(` ${t.logic.toUpperCase()} `)} )`
      };
    }).filter((t) => t !== null);
    return this.joinGroups(e);
  }
  generateTextPreview() {
    const e = this.structure.groups.map((t, r) => {
      const n = t.conditions.filter((i) => i.value !== "" && i.value !== null && i.value !== void 0).map((i) => {
        const s = this.getField(i.field), a = s ? this.getOperatorsForField(s).find((c) => c.value === i.operator) : void 0, o = s?.label || this.messages.unavailableFieldPreview(i.field), l = s && !this.isValueAvailable(s, i.value) ? this.messages.unavailableValuePreview(String(i.value)) : String(i.value);
        return `${o} ${a?.label || i.operator} "${l}"`;
      });
      return n.length === 0 ? null : {
        groupIndex: r,
        text: n.length === 1 ? n[0] : `( ${n.join(` ${t.logic === "and" ? this.messages.and : this.messages.or} `)} )`
      };
    }).filter((t) => t !== null);
    return this.joinGroups(e, !0);
  }
  joinGroups(e, t = !1) {
    return e.length < 2 ? e[0]?.text || "" : e.reduce((r, n, i) => {
      if (i === 0) return n.text;
      const s = Math.max(0, n.groupIndex - 1), a = this.structure.groupLogic[s] || "and";
      return `${r} ${t ? a === "and" ? this.messages.and : this.messages.or : a.toUpperCase()} ${n.text}`;
    }, "");
  }
  emitChange() {
    this.config.onChange?.(tt(this.structure));
  }
  applyFilters() {
    this.config.onApply?.(tt(this.structure)), this.mode === "overlay" && this.close(!0);
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
    r[t] = tt(this.structure), localStorage.setItem("saved_filters", JSON.stringify(r)), this.notifier.success(this.messages.filterSaved(t)), e && (e.value = "");
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
    const e = 8, t = window.visualViewport, r = t?.offsetLeft ?? 0, n = t?.offsetTop ?? 0, i = t?.width ?? window.innerWidth, s = t?.height ?? window.innerHeight, a = r + i, o = n + s, l = this.toggleButton.getBoundingClientRect();
    this.panel.classList.remove("hidden"), this.panel.style.visibility = "hidden";
    const c = this.panel.getBoundingClientRect(), d = Math.max(0, i - 16), f = Math.min(c.width || 800, d), h = c.height || this.panel.scrollHeight, p = Math.min(Math.max(l.left, r + e), Math.max(r + e, a - e - f)), m = l.bottom + e, g = o - e - m, y = l.top - e - n, w = h > g && y > g ? Math.max(n + e, l.top - e - Math.min(h, y)) : Math.max(n + e, m);
    this.panel.style.left = `${p}px`, this.panel.style.top = `${w}px`, this.panel.style.maxWidth = `${d}px`, this.panel.style.maxHeight = `${Math.max(0, o - e - w)}px`, this.panel.style.visibility = "", this.toggleButton.setAttribute("aria-expanded", "true"), this.toggleButton.setAttribute("aria-controls", this.panel.id || this.instanceID), this.overlay?.classList.remove("hidden"), this.root?.querySelector('button, input, select, textarea, [tabindex]:not([tabindex="-1"])')?.focus();
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
        On.warn("[FilterBuilder] Failed to parse filters from URL:", t);
      }
  }
  convertLegacyFilters(e) {
    const t = /* @__PURE__ */ new Map();
    e.forEach((n) => {
      const i = t.get(n.column) || [];
      i.push(n), t.set(n.column, i);
    });
    const r = [];
    return t.forEach((n) => {
      r.push({
        conditions: n.map((i) => ({
          field: i.column,
          operator: i.operator || "ilike",
          value: es(i.value)
        })),
        logic: n.length > 1 ? "or" : "and"
      });
    }), {
      groups: r,
      groupLogic: new Array(Math.max(0, r.length - 1)).fill("and")
    };
  }
  getStructure() {
    return tt(this.structure);
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
}, yf = class {
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
}, vf = class {
  buildFilters(e) {
    const t = {}, r = /* @__PURE__ */ new Map();
    return e.forEach((n) => {
      if (n.value === null || n.value === void 0 || n.value === "") return;
      const i = n.operator || "eq", s = n.column;
      r.has(s) || r.set(s, {
        operator: i,
        values: []
      }), r.get(s).values.push(n.value);
    }), r.forEach((n, i) => {
      if (n.values.length === 1) {
        const s = n.operator === "eq" ? i : `${i}__${n.operator}`;
        t[s] = n.values[0];
      } else n.operator === "ilike" ? t[`${i}__ilike`] = n.values.join(",") : n.operator === "eq" ? t[`${i}__in`] = n.values.join(",") : t[`${i}__${n.operator}`] = n.values.join(",");
    }), t;
  }
  async onFilterChange(e, t, r) {
    r.resetPagination(), await r.refresh();
  }
}, wf = class {
  buildQuery(e, t) {
    return {
      limit: t,
      offset: (e - 1) * t
    };
  }
  async onPageChange(e, t) {
    await t.refresh();
  }
}, xf = class {
  buildQuery(e) {
    return !e || e.length === 0 ? {} : { order: e.map((t) => `${t.field} ${t.direction}`).join(",") };
  }
  async onSort(e, t, r) {
    await r.refresh();
  }
}, Sf = class {
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
    const r = Lc(t, this.config, e);
    r.delivery = Dc(this.config, e);
    let n;
    try {
      n = await U(this.getEndpoint(), {
        method: "POST",
        json: r,
        headers: { Accept: "application/json,application/octet-stream" }
      });
    } catch (i) {
      throw Te(t, "error", i instanceof Error ? i.message : "Network error during export"), i;
    }
    if (n.status === 202) {
      const i = await ts(n);
      Te(t, "info", "Export queued. You can download it when ready.");
      const s = i?.status_url || "";
      if (s) {
        const a = Pc(i, s);
        try {
          await Mc(s, {
            intervalMs: Tc(this.config),
            timeoutMs: Rc(this.config)
          });
          const o = await U(a, {
            method: "GET",
            headers: { Accept: "application/octet-stream" }
          });
          if (!o.ok) {
            const l = await jr(o);
            throw Te(t, "error", l), new Error(l);
          }
          await qn(o, r.definition || r.resource || "export", r.format), Te(t, "success", "Export ready.");
          return;
        } catch (o) {
          throw Te(t, "error", o instanceof Error ? o.message : "Export failed"), o;
        }
      }
      if (i?.download_url) {
        window.open(i.download_url, "_blank");
        return;
      }
      return;
    }
    if (!n.ok) {
      const i = await jr(n);
      throw Te(t, "error", i), new Error(i);
    }
    await qn(n, r.definition || r.resource || "export", r.format), Te(t, "success", "Export ready.");
  }
};
function Lc(e, t, r) {
  const n = zc(r), i = Bc(e, t), s = Oc(e, t), a = {
    format: n,
    query: qc(Fc(e)),
    selection: i,
    columns: s,
    delivery: t.delivery || "auto"
  };
  t.definition && (a.definition = t.definition), t.resource && (a.resource = t.resource);
  const o = t.sourceVariant || t.variant;
  return o && (a.source_variant = o), a;
}
function Dc(e, t) {
  return e.delivery ? e.delivery : (e.asyncFormats && e.asyncFormats.length > 0 ? e.asyncFormats : ["pdf"]).includes(t) ? "async" : "auto";
}
function Tc(e) {
  const t = Number(e.statusPollIntervalMs);
  return Number.isFinite(t) && t > 0 ? t : 2e3;
}
function Rc(e) {
  const t = Number(e.statusPollTimeoutMs);
  return Number.isFinite(t) && t >= 0 ? t : 3e5;
}
function Pc(e, t) {
  return e?.download_url ? e.download_url : `${t.replace(/\/+$/, "")}/download`;
}
async function ts(e) {
  return await vs(e);
}
async function Mc(e, t) {
  const r = Date.now(), n = Math.max(250, t.intervalMs);
  for (; ; ) {
    const i = await U(e, {
      method: "GET",
      headers: { Accept: "application/json" }
    });
    if (!i.ok) {
      const o = await jr(i);
      throw new Error(o);
    }
    const s = await ts(i), a = String(s?.state || "").toLowerCase();
    if (a === "completed") return s;
    if (a === "failed") throw new Error("Export failed");
    if (a === "canceled") throw new Error("Export canceled");
    if (a === "deleted") throw new Error("Export deleted");
    if (t.timeoutMs > 0 && Date.now() - r > t.timeoutMs) throw new Error("Export status timed out");
    await Ic(n);
  }
}
function Ic(e) {
  return new Promise((t) => setTimeout(t, e));
}
function Bc(e, t) {
  if (t.selection?.mode) return t.selection;
  const r = Array.from(e.state.selectedRows || []), n = r.length > 0 ? "ids" : "all";
  return {
    mode: n,
    ids: n === "ids" ? r : []
  };
}
function Oc(e, t) {
  if (Array.isArray(t.columns) && t.columns.length > 0) return t.columns.slice();
  const r = e.state?.hiddenColumns ? new Set(e.state.hiddenColumns) : /* @__PURE__ */ new Set();
  return (Array.isArray(e.state?.columnOrder) && e.state.columnOrder.length > 0 ? e.state.columnOrder : e.config.columns.map((n) => n.field)).filter((n) => !r.has(n));
}
function Fc(e) {
  const t = {}, r = e.config.behaviors || {};
  return r.pagination && Object.assign(t, r.pagination.buildQuery(e.state.currentPage, e.state.perPage)), e.state.search && r.search && Object.assign(t, r.search.buildQuery(e.state.search)), e.state.filters.length > 0 && r.filter && Object.assign(t, r.filter.buildFilters(e.state.filters)), e.state.sort.length > 0 && r.sort && Object.assign(t, r.sort.buildQuery(e.state.sort)), t;
}
function qc(e) {
  const t = {}, r = [];
  return Object.entries(e).forEach(([n, i]) => {
    if (i == null || i === "") return;
    switch (n) {
      case "limit":
        t.limit = Fn(i);
        return;
      case "offset":
        t.offset = Fn(i);
        return;
      case "order":
      case "sort":
        t.sort = jc(String(i));
        return;
      case "q":
      case "search":
        t.search = String(i);
        return;
    }
    const { field: s, op: a } = Nc(n);
    s && r.push({
      field: s,
      op: a,
      value: i
    });
  }), r.length > 0 && (t.filters = r), t;
}
function Nc(e) {
  const t = e.split("__");
  return {
    field: t[0]?.trim() || "",
    op: t[1]?.trim() || "eq"
  };
}
function jc(e) {
  return e ? e.split(",").map((t) => t.trim()).filter(Boolean).map((t) => {
    const r = t.split(/\s+/);
    return {
      field: r[0] || "",
      desc: (r[1] || "asc").toLowerCase() === "desc"
    };
  }).filter((t) => t.field) : [];
}
function zc(e) {
  const t = String(e || "").trim().toLowerCase();
  return t === "excel" || t === "xls" ? "xlsx" : t || "csv";
}
function Fn(e) {
  const t = Number(e);
  return Number.isFinite(t) ? t : 0;
}
async function qn(e, t, r) {
  const n = await e.blob(), i = Gc(e, t, r), s = URL.createObjectURL(n), a = document.createElement("a");
  a.href = s, a.download = i, a.rel = "noopener", document.body.appendChild(a), a.click(), a.remove(), URL.revokeObjectURL(s);
}
function Gc(e, t, r) {
  const n = e.headers.get("content-disposition") || "", i = `${t}.${r}`;
  return Uc(n) || i;
}
function Uc(e) {
  if (!e) return null;
  const t = e.match(/filename\*=(?:UTF-8'')?([^;]+)/i);
  if (t && t[1]) return decodeURIComponent(t[1].replace(/"/g, "").trim());
  const r = e.match(/filename="?([^";]+)"?/i);
  return r && r[1] ? r[1].trim() : null;
}
async function jr(e) {
  return Hr(e, `Export failed (${e.status})`, { appendStatusToFallback: !1 });
}
function Te(e, t, r) {
  const n = e.config.notifier;
  if (n && typeof n[t] == "function") {
    n[t](r);
    return;
  }
  const i = window.toastManager;
  if (i && typeof i[t] == "function") {
    i[t](r);
    return;
  }
  t === "error" && alert(r);
}
var Cf = class {
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
    const n = this.getActionEndpoint(e), i = await U(n, {
      method: "POST",
      json: { ids: t },
      accept: "application/json"
    });
    if (!i.ok) {
      const s = await Hr(i, `Bulk action '${e}' failed`);
      throw new Error(`Bulk action '${e}' failed: ${s}`);
    }
    await r.refresh();
  }
}, P = M("DataGrid"), Hc = 1500;
function Vc(e) {
  return typeof e == "object" && e !== null && "name" in e && e.name === "AbortError";
}
function rs(e) {
  return typeof e == "object" && e !== null && "version" in e && e.version === 2;
}
var Kc = class {
  constructor(e, t = "datatable_columns") {
    this.cachedOrder = null, this.storageKey = t;
  }
  getVisibleColumns(e) {
    return e.config.columns.filter((t) => !e.state.hiddenColumns.has(t.field)).map((t) => t.field);
  }
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
  reorderColumns(e, t) {
    const r = {};
    t.config.columns.forEach((n) => {
      r[n.field] = !t.state.hiddenColumns.has(n.field);
    }), this.cachedOrder = e, this.savePrefs({
      version: 2,
      visibility: r,
      order: e
    }), P.debug("[ColumnVisibility] Order saved:", e);
  }
  loadColumnOrderFromCache(e) {
    try {
      const t = this.loadPrefs();
      if (!t || !t.order) return [];
      const r = new Set(e), n = t.order.filter((i) => r.has(i));
      return this.cachedOrder = n, P.debug("[ColumnVisibility] Order loaded from cache:", n), n;
    } catch (t) {
      return P.warn("Failed to load column order from cache:", t), [];
    }
  }
  loadHiddenColumnsFromCache(e) {
    try {
      const t = this.loadPrefs();
      if (!t) return /* @__PURE__ */ new Set();
      const r = new Set(e), n = /* @__PURE__ */ new Set();
      return Object.entries(t.visibility).forEach(([i, s]) => {
        !s && r.has(i) && n.add(i);
      }), n;
    } catch (t) {
      return P.warn("Failed to load column visibility state:", t), /* @__PURE__ */ new Set();
    }
  }
  loadPrefs() {
    try {
      const e = localStorage.getItem(this.storageKey);
      if (!e) return null;
      const t = JSON.parse(e);
      if (rs(t)) return t;
      const r = {
        version: 2,
        visibility: t
      };
      return P.debug("[ColumnVisibility] Migrating V1 prefs to V2 format"), this.savePrefs(r), r;
    } catch (e) {
      return P.warn("Failed to load column preferences:", e), null;
    }
  }
  savePrefs(e) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(e));
    } catch (t) {
      P.warn("Failed to save column preferences:", t);
    }
  }
  clearSavedPrefs() {
    try {
      localStorage.removeItem(this.storageKey), this.cachedOrder = null, P.debug("[ColumnVisibility] Preferences cleared");
    } catch (e) {
      P.warn("Failed to clear column preferences:", e);
    }
  }
}, Ef = class extends Kc {
  constructor(e, t) {
    const r = t.localStorageKey || `${t.resource}_datatable_columns`;
    if (super(e, r), this.syncTimeout = null, this.serverPrefs = null, this.mutationQueue = Promise.resolve(), this.resource = t.resource, this.preferencesEndpoint = String(t.preferencesEndpoint || "").trim().replace(/\/+$/, ""), !this.preferencesEndpoint) throw new Error("ServerColumnVisibilityBehavior requires an advertised preferences endpoint");
    this.syncDebounce = t.syncDebounce ?? 1e3, this.loadTimeoutMs = Math.max(100, t.loadTimeoutMs || Hc), this.canWrite = t.canWrite !== !1;
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
      const r = await U(this.preferencesEndpoint, {
        method: "GET",
        credentials: "same-origin",
        signal: e?.signal,
        headers: { Accept: "application/json" }
      });
      if (!r.ok)
        return P.warn("[ServerColumnVisibility] Failed to load server prefs:", r.status), null;
      const n = (await r.json()).records || [];
      if (n.length === 0)
        return P.debug("[ServerColumnVisibility] No server preferences found"), null;
      const i = n[0]?.raw;
      if (!i || !i[this.serverPrefsKey])
        return P.debug("[ServerColumnVisibility] No column preferences in server response"), null;
      const s = i[this.serverPrefsKey];
      return rs(s) ? (this.serverPrefs = s, this.savePrefs(s), P.debug("[ServerColumnVisibility] Loaded prefs from server:", s), s) : (P.warn("[ServerColumnVisibility] Server prefs not in V2 format:", s), null);
    } catch (r) {
      return Vc(r) || P.warn("[ServerColumnVisibility] Error loading server prefs:", r), null;
    } finally {
      clearTimeout(t);
    }
  }
  getInitialPrefs(e) {
    const t = this.serverPrefs;
    if (t) {
      const r = /* @__PURE__ */ new Set();
      Object.entries(t.visibility).forEach(([i, s]) => {
        s || r.add(i);
      });
      const n = new Set(e);
      return {
        hiddenColumns: r,
        columnOrder: (t.order || []).filter((i) => n.has(i))
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
      const n = await U(this.preferencesEndpoint, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        json: { raw: { [this.serverPrefsKey]: r } }
      });
      if (!n.ok) {
        P.warn("[ServerColumnVisibility] Failed to sync to server:", n.status);
        return;
      }
      this.serverPrefs = r, P.debug("[ServerColumnVisibility] Synced prefs to server:", r);
    } catch (n) {
      P.warn("[ServerColumnVisibility] Error syncing to server:", n);
    }
  }
  clearSavedPrefs() {
    this.cancelScheduledServerSync(), super.clearSavedPrefs(), this.serverPrefs = null, this.canWrite && this.enqueueServerMutation(() => this.clearServerPrefs());
  }
  async clearServerPrefs() {
    try {
      const e = await U(this.preferencesEndpoint, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        json: { clear_raw_keys: [this.serverPrefsKey] }
      });
      if (!e.ok) {
        P.warn("[ServerColumnVisibility] Failed to clear server prefs:", e.status);
        return;
      }
      P.debug("[ServerColumnVisibility] Server prefs cleared");
    } catch (e) {
      P.warn("[ServerColumnVisibility] Error clearing server prefs:", e);
    } finally {
      this.serverPrefs = null;
    }
  }
}, Nn = M("DataGrid");
function Jc(e) {
  const t = e.trim(), r = t.indexOf("?");
  return r === -1 ? {
    path: t,
    query: ""
  } : {
    path: t.slice(0, r),
    query: t.slice(r + 1)
  };
}
function Re(e, t, r = "", n = "") {
  const { path: i, query: s } = Jc(e), a = i.replace(/\/+$/, ""), o = r.replace(/^\/+/, "");
  let l = `${a}/${encodeURIComponent(t)}`;
  o && (l += `/${o}`);
  const c = [];
  return s && c.push(s), n && c.push(n), c.length > 0 ? `${l}?${c.join("&")}` : l;
}
var jn = {
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
}, Yc = 5e3, ns = class {
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
    const i = this.buildQueryContext();
    if (Array.isArray(t) && t.length > 0) {
      for (const s of t) {
        if (!s.name) continue;
        const a = this.resolveRecordActionState(e, s.name);
        if (!this.shouldIncludeAction(e, s, a)) continue;
        const o = s.name.toLowerCase();
        if (this.seenActions.has(o)) continue;
        this.seenActions.add(o);
        const l = this.normalizeContextBoundActionState(e, s, a), c = this.buildActionFromSchema(e, s, i, l);
        c && r.push({
          action: c,
          name: s.name,
          order: this.resolveActionOrder(s.name, s.order),
          insertionIndex: n++
        });
      }
      this.config.appendDefaultActions && this.appendDefaultActionsOrdered(r, e, i, n);
    } else this.config.useDefaultFallback && this.appendDefaultActionsOrdered(r, e, i, n);
    return r.sort((s, a) => s.order !== a.order ? s.order - a.order : s.insertionIndex - a.insertionIndex), r.map((s) => s.action);
  }
  resolveActionOrder(e, t) {
    if (typeof t == "number" && Number.isFinite(t)) return t;
    const r = e.toLowerCase();
    return this.config.actionOrderOverride?.[r] !== void 0 ? this.config.actionOrderOverride[r] : jn[r] !== void 0 ? jn[r] : Yc;
  }
  buildActionFromSchema(e, t, r, n) {
    const i = t.name, s = t.label || t.label_key || i, a = t.variant || "secondary", o = t.icon, l = this.isNavigationAction(t), c = i === "delete";
    return l ? this.applyActionState(this.buildNavigationAction(e, t, s, a, o, r), n) : c ? this.applyActionState(this.buildDeleteAction(e, s, a, o), n) : this.applyActionState(this.buildPostAction(e, t, s, a, o), n);
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
    return ai(e, t);
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
      const n = oi({ reason_code: r });
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
    for (const i of r) {
      const s = typeof i == "string" ? i.trim() : "";
      if (!s) continue;
      const a = this.resolveRecordContextValue(e, s);
      this.isEmptyPayloadValue(a) && n.push(s);
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
    const n = r.split(".").map((s) => s.trim()).filter(Boolean);
    if (n.length === 0) return;
    let i = e;
    for (const s of n) {
      if (!i || typeof i != "object" || Array.isArray(i)) return;
      i = i[s];
    }
    return i;
  }
  buildNavigationAction(e, t, r, n, i, s) {
    const a = String(e.id || ""), o = this.config.actionBasePath;
    let l;
    if (t.href) {
      const c = this.interpolateHrefTemplate(t.href, e, a);
      s ? l = c.includes("?") ? `${c}&${s}` : `${c}?${s}` : l = c;
    } else t.name === "edit" ? l = Re(o, a, "edit", s) : l = Re(o, a, "", s);
    return {
      id: t.name,
      label: r,
      icon: i || this.getDefaultIcon(t.name),
      variant: n,
      action: () => {
        window.location.href = l;
      }
    };
  }
  interpolateHrefTemplate(e, t, r) {
    const n = e.trim();
    return n && n.replace(/\{([^}]+)\}/g, (i, s) => {
      const a = String(s || "").trim();
      if (!a) return "";
      if (a === "id") return r;
      const o = this.resolveRecordContextValue(t, a);
      return o == null ? "" : String(o);
    });
  }
  buildDeleteAction(e, t, r, n) {
    const i = String(e.id || ""), s = this.config.apiEndpoint;
    return {
      id: "delete",
      label: t,
      icon: n || "trash",
      variant: r === "secondary" ? "danger" : r,
      action: async () => {
        await Ti({
          endpoint: `${s}/${i}`,
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
  buildPostAction(e, t, r, n, i) {
    const s = String(e.id || ""), a = t.name, o = `${this.config.apiEndpoint}/actions/${a}`;
    return {
      id: a,
      label: r,
      icon: i || this.getDefaultIcon(a),
      variant: n,
      action: async () => {
        if (t.confirm && !window.confirm(t.confirm))
          return;
        const l = await this.buildActionPayload(e, t);
        l !== null && await this.executePostAction({
          actionName: a,
          endpoint: o,
          payload: l,
          recordId: s
        });
      }
    };
  }
  async executePostAction(e) {
    const t = await Vr(e.endpoint, e.payload);
    if (t.success)
      return e.actionName.toLowerCase() === "create_translation" && t.data ? (this.handleCreateTranslationSuccess(t.data, e.payload), t) : (this.handleActionRedirectSuccess(t.data) || this.config.onActionSuccess?.(e.actionName, t), t);
    if (t.error && Ss(t.error)) {
      const r = xs(t.error);
      if (r && this.config.onTranslationBlocker) {
        const n = { ...e.payload }, i = this.getContentChannel() || r.channel || null;
        return this.config.onTranslationBlocker({
          actionName: e.actionName,
          recordId: e.recordId,
          ...r,
          channel: i,
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
    const n = e.redirect_to_edit === !0 || e.mode === "redirect", i = this.buildQueryContext(), s = Re(this.config.actionBasePath, r, n ? "edit" : "", i);
    return window.location.href = s, !0;
  }
  async handleStructuredActionFailure(e, t, r) {
    if (!t.error) return t;
    const n = this.buildActionErrorMessage(e, t.error), i = {
      ...t.error,
      message: n
    };
    throw i.textCode && this.config.reconcileOnDomainFailure && await this.config.reconcileOnDomainFailure(e, i), this.config.onActionError?.(e, i), Ft(i, r, !!this.config.onActionError);
  }
  handleCreateTranslationSuccess(e, t) {
    const r = typeof e.id == "string" ? e.id : String(e.id || ""), n = typeof e.locale == "string" ? e.locale : "";
    if (!r) {
      Nn.warn("[SchemaActionBuilder] create_translation response missing id");
      return;
    }
    const i = this.config.actionBasePath, s = new URLSearchParams();
    n && s.set("locale", n);
    const a = this.getContentChannel();
    a && s.set("channel", a);
    const o = s.toString(), l = `${i}/${r}/edit${o ? `?${o}` : ""}`, c = typeof t.source_locale == "string" ? t.source_locale : this.config.locale || "source", d = this.localeLabel(n || "unknown");
    typeof window < "u" && "toastManager" in window ? window.toastManager.success(`${d} translation created`, { action: {
      label: `View ${c.toUpperCase()}`,
      handler: () => {
        const f = new URLSearchParams();
        f.set("locale", c), a && f.set("channel", a);
        const h = typeof t.id == "string" ? t.id : String(t.id || r);
        window.location.href = `${i}/${h}/edit?${f.toString()}`;
      }
    } }) : Nn.debug(`[SchemaActionBuilder] Translation created: ${n}`), window.location.href = l;
  }
  async buildActionPayload(e, t) {
    const r = t.name.trim().toLowerCase(), n = { id: e.id };
    this.config.locale && r !== "create_translation" && (n.locale = this.config.locale);
    const i = this.getContentChannel();
    if (i && (n.channel = i), this.config.panelName && (n.policy_entity = this.config.panelName), n.expected_version === void 0) {
      const c = this.resolveExpectedVersion(e);
      c !== null && (n.expected_version = c);
    }
    const s = this.normalizePayloadSchema(t.payload_schema), a = this.collectRequiredFields(t.payload_required, s);
    if (r === "create_translation" && this.applySchemaTranslationContext(n, e, s), s?.properties)
      for (const [c, d] of Object.entries(s.properties)) n[c] === void 0 && d.default !== void 0 && (n[c] = d.default);
    a.includes("idempotency_key") && this.isEmptyPayloadValue(n.idempotency_key) && (n.idempotency_key = this.generateIdempotencyKey(t.name, String(e.id || "")));
    const o = a.filter((c) => this.isEmptyPayloadValue(n[c]));
    if (o.length === 0) return n;
    const l = await this.promptForPayload(t, o, s, n, e);
    if (l === null) return null;
    for (const c of o) {
      const d = s?.properties?.[c], f = l[c] ?? "", h = this.coercePromptValue(f, c, d);
      if (h.error) throw new Error(h.error);
      n[c] = h.value;
    }
    return n;
  }
  async promptForPayload(e, t, r, n, i) {
    if (t.length === 0) return {};
    const s = t.map((a) => {
      const o = r?.properties?.[a];
      return {
        name: a,
        label: o?.title || a,
        description: o?.description,
        value: this.stringifyDefault(n[a] ?? o?.default),
        type: o?.type || "string",
        options: this.buildFieldOptions(a, e.name, o, i, n)
      };
    });
    return await ei.prompt({
      title: `Complete ${e.label || e.name}`,
      fields: s
    });
  }
  buildFieldOptions(e, t, r, n, i) {
    const s = this.deriveCreateTranslationLocaleOptions(e, t, n, r, i);
    if (s && s.length > 0) return s;
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
    const n = [];
    for (const i of r) {
      if (typeof i == "string") {
        const c = this.stringifyDefault(i);
        if (!c) continue;
        n.push({
          value: c,
          label: c
        });
        continue;
      }
      if (!i || typeof i != "object") continue;
      const s = i.value, a = this.stringifyDefault(s);
      if (!a) continue;
      const o = i.label, l = this.stringifyDefault(o) || a;
      n.push({
        value: a,
        label: l
      });
    }
    return n.length > 0 ? n : void 0;
  }
  deriveCreateTranslationLocaleOptions(e, t, r, n, i) {
    if (e.trim().toLowerCase() !== "locale" || t.trim().toLowerCase() !== "create_translation" || !r || typeof r != "object") return;
    const s = this.asObject(r.translation_readiness), a = i && typeof i == "object" ? i : {};
    let o = this.asStringArray(a.missing_locales);
    if (o.length === 0 && (o = this.asStringArray(s?.missing_required_locales)), o.length === 0 && (o = this.asStringArray(r.missing_locales)), o.length === 0 && s) {
      const g = this.asStringArray(s.required_locales), y = new Set(this.asStringArray(s.available_locales));
      o = g.filter((w) => !y.has(w));
    }
    const l = this.asStringArray(n?.enum);
    if (l.length > 0) {
      const g = new Set(l);
      o = o.filter((y) => g.has(y));
    }
    if (o.length === 0) return;
    const c = this.extractStringField(a, "recommended_locale") || this.extractStringField(r, "recommended_locale") || this.extractStringField(s || {}, "recommended_locale"), d = this.asStringArray(a.required_for_publish ?? r.required_for_publish ?? s?.required_for_publish ?? s?.required_locales), f = this.asStringArray(a.existing_locales ?? r.existing_locales ?? s?.available_locales), h = this.createTranslationLocaleLabelMap(n), p = /* @__PURE__ */ new Set(), m = [];
    for (const g of o) {
      const y = g.trim().toLowerCase();
      if (!y || p.has(y)) continue;
      p.add(y);
      const w = c?.toLowerCase() === y, x = d.includes(y), E = [];
      x && E.push("Required for publishing"), f.length > 0 && E.push(`${f.length} translation${f.length > 1 ? "s" : ""} exist`);
      const L = E.length > 0 ? E.join(" • ") : void 0, q = h[y] || this.localeLabel(y);
      let N = `${y.toUpperCase()} - ${q}`;
      w && (N += " (recommended)"), m.push({
        value: y,
        label: N,
        description: L,
        recommended: w
      });
    }
    return m.sort((g, y) => g.recommended && !y.recommended ? -1 : !g.recommended && y.recommended ? 1 : g.value.localeCompare(y.value)), m.length > 0 ? m : void 0;
  }
  applySchemaTranslationContext(e, t, r) {
    if (!r) return;
    const n = this.extractTranslationContextMap(r);
    if (Object.keys(n).length !== 0)
      for (const [i, s] of Object.entries(n)) {
        const a = i.trim(), o = s.trim();
        if (!a || !o || !this.isEmptyPayloadValue(e[a])) continue;
        const l = this.resolveRecordContextValue(t, o);
        l != null && (e[a] = this.clonePayloadValue(l));
      }
  }
  extractTranslationContextMap(e) {
    const t = e["x-translation-context"] ?? e.x_translation_context;
    if (!t || typeof t != "object" || Array.isArray(t)) return {};
    const r = {};
    for (const [n, i] of Object.entries(t)) {
      const s = n.trim(), a = typeof i == "string" ? i.trim() : "";
      !s || !a || (r[s] = a);
    }
    return r;
  }
  clonePayloadValue(e) {
    return Array.isArray(e) ? e.map((t) => this.clonePayloadValue(t)) : e && typeof e == "object" ? { ...e } : e;
  }
  createTranslationLocaleLabelMap(e) {
    const t = {};
    if (!e) return t;
    if (Array.isArray(e.oneOf)) for (const i of e.oneOf) {
      const s = this.stringifyDefault(i?.const).trim().toLowerCase();
      if (!s) continue;
      const a = this.stringifyDefault(i?.title).trim();
      a && (t[s] = a);
    }
    const r = e, n = r["x-options"] ?? r.x_options ?? r.xOptions;
    if (Array.isArray(n)) for (const i of n) {
      if (!i || typeof i != "object") continue;
      const s = this.stringifyDefault(i.value).trim().toLowerCase(), a = this.stringifyDefault(i.label).trim();
      s && a && (t[s] = a);
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
        const i = Number(n);
        if (Number.isFinite(i) && i > 0) return n;
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
    const n = e.required, i = Array.isArray(n) ? n.filter((o) => typeof o == "string").map((o) => o.trim()).filter((o) => o.length > 0) : void 0, s = e["x-translation-context"] ?? e.x_translation_context, a = s && typeof s == "object" && !Array.isArray(s) ? s : void 0;
    return {
      type: typeof e.type == "string" ? e.type : void 0,
      required: i,
      properties: r,
      ...a ? { "x-translation-context": a } : {}
    };
  }
  collectRequiredFields(e, t) {
    const r = [], n = /* @__PURE__ */ new Set(), i = (s) => {
      const a = s.trim();
      !a || n.has(a) || (n.add(a), r.push(a));
    };
    return Array.isArray(e) && e.forEach((s) => i(String(s))), Array.isArray(t?.required) && t.required.forEach((s) => i(String(s))), r;
  }
  isEmptyPayloadValue(e) {
    return e == null ? !0 : typeof e == "string" ? e.trim() === "" : Array.isArray(e) ? e.length === 0 : typeof e == "object" ? Object.keys(e).length === 0 : !1;
  }
  generateIdempotencyKey(e, t) {
    const r = e.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-"), n = t.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-"), i = typeof crypto < "u" && typeof crypto.randomUUID == "function" ? crypto.randomUUID() : `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    return `${r || "action"}-${n || "record"}-${i}`;
  }
  coercePromptValue(e, t, r) {
    const n = typeof e == "string" ? e.trim() : String(e ?? "").trim(), i = typeof r?.type == "string" ? r.type.toLowerCase() : "string";
    if (n.length === 0) return { value: n };
    if (i === "number" || i === "integer") {
      const s = Number(n);
      return Number.isFinite(s) ? { value: i === "integer" ? Math.trunc(s) : s } : {
        value: null,
        error: `${t} must be a valid number`
      };
    }
    if (i === "boolean") {
      const s = n.toLowerCase();
      return s === "true" || s === "1" || s === "yes" ? { value: !0 } : s === "false" || s === "0" || s === "no" ? { value: !1 } : {
        value: null,
        error: `${t} must be true or false`
      };
    }
    if (i === "array" || i === "object") try {
      return { value: JSON.parse(n) };
    } catch {
      return {
        value: null,
        error: `${t} must be valid JSON (${i === "array" ? "[...]" : "{...}"})`
      };
    }
    return { value: n };
  }
  buildActionErrorMessage(e, t) {
    return We(t, `${e} failed`);
  }
  buildQueryContext() {
    const e = new URLSearchParams();
    this.config.locale && e.set("locale", this.config.locale);
    const t = this.getContentChannel();
    return t && e.set("channel", t), e.toString();
  }
  appendDefaultActions(e, t, r) {
    const n = String(t.id || ""), i = this.config.actionBasePath, s = [
      {
        name: "view",
        button: {
          id: "view",
          label: "View",
          icon: "eye",
          variant: "secondary",
          action: () => {
            window.location.href = Re(i, n, "", r);
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
            window.location.href = Re(i, n, "edit", r);
          }
        }
      },
      {
        name: "delete",
        button: this.buildDeleteAction(t, "Delete", "danger", "trash")
      }
    ];
    for (const a of s) this.seenActions.has(a.name) || (this.seenActions.add(a.name), e.push(a.button));
  }
  appendDefaultActionsOrdered(e, t, r, n) {
    const i = String(t.id || ""), s = this.config.actionBasePath, a = [
      {
        name: "view",
        button: {
          id: "view",
          label: "View",
          icon: "eye",
          variant: "secondary",
          action: () => {
            window.location.href = Re(s, i, "", r);
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
            window.location.href = Re(s, i, "edit", r);
          }
        }
      },
      {
        name: "delete",
        button: this.buildDeleteAction(t, "Delete", "danger", "trash")
      }
    ];
    let o = n;
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
function Af(e, t, r) {
  return new ns(r).buildRowActions(e, t);
}
function $f(e) {
  return e.schema?.actions;
}
function Wc() {
  const e = globalThis.window;
  return e?.toastManager ? e.toastManager : new Qe();
}
async function Xc(e) {
  return Yn(e, null);
}
function zr(e, t) {
  return (typeof e.id == "string" && e.id.trim() ? e.id.trim() : `${e.label}-${t + 1}`).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || `action-${t + 1}`;
}
function Qc(e, t) {
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
function Zc(e, t) {
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
function zn(e) {
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
function ed(e) {
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
function td(e) {
  if (e.length === 0) return "";
  const { primary: t, rest: r } = ed(e);
  let n = "";
  if (t) {
    const s = t.disabled === !0, a = zr(t, 0), o = zn(t), l = s ? (t.disabledReason || "Action unavailable").trim() : "", c = l ? `detail-action-reason-${a}` : "", d = c ? `aria-describedby="${c}"` : "", f = l ? `${t.label} unavailable: ${l}` : t.label, h = s && t.remediation?.href && t.remediation?.label ? `
          <a
            href="${u(t.remediation.href.trim())}"
            class="inline-flex items-center justify-center rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            data-detail-action-remediation="${u(a)}"
          >
            ${u(t.remediation.label.trim())}
          </a>
        ` : "", p = l ? `title="${u(l)}"` : "", m = s && l ? `<span
           class="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-100 text-amber-600 text-xs cursor-help"
           title="${u(l)}"
           aria-hidden="true"
         >?</span>
         <span class="sr-only" data-detail-action-reason="${u(a)}" id="detail-action-reason-${u(a)}">${u(l)}</span>` : "";
    n = `
      <div data-detail-action-card="${u(a)}" class="flex items-center gap-2">
        <button
          type="button"
          class="${Qc(t, s)}"
          data-detail-action-button="${u(a)}"
          data-detail-action-name="${u(t.id || t.label)}"
          data-disabled="${s}"
          aria-disabled="${s ? "true" : "false"}"
          aria-label="${u(f)}"
          ${d}
          ${p}
        >
          ${o ? `<i class="${o}"></i>` : ""}
          ${u(t.label)}
          ${m}
        </button>
        ${s && h ? h : ""}
      </div>
    `;
  }
  let i = "";
  return r.length > 0 && (i = `
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
          ${r.map((s, a) => {
    const o = s.disabled === !0, l = zr(s, t ? a + 1 : a), c = zn(s), d = o ? (s.disabledReason || "Action unavailable").trim() : "", f = d ? `detail-action-reason-${l}` : "", h = f ? `aria-describedby="${f}"` : "", p = d ? `${s.label} unavailable: ${d}` : s.label, m = s.variant === "danger" && a > 0 ? '<div class="my-1 border-t border-gray-100"></div>' : "", g = d ? `title="${u(d)}"` : "", y = o && s.remediation?.href && s.remediation?.label ? `
            <a
              href="${u(s.remediation.href.trim())}"
              class="block px-4 pb-2 text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
              data-detail-action-remediation="${u(l)}"
            >
              ${u(s.remediation.label.trim())}
            </a>
          ` : "", w = o && d ? `<span
             class="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-100 text-amber-600 text-xs cursor-help"
             title="${u(d)}"
             aria-hidden="true"
           >?</span>
           <span class="sr-only" data-detail-action-reason="${u(l)}" id="detail-action-reason-${u(l)}">${u(d)}</span>` : "";
    return `
        ${m}
        <div data-detail-action-card="${u(l)}" class="space-y-1">
          <button
            type="button"
            class="${Zc(s, o)}"
            data-detail-action-button="${u(l)}"
            data-detail-action-name="${u(s.id || s.label)}"
            data-disabled="${o}"
            aria-disabled="${o ? "true" : "false"}"
            aria-label="${u(p)}"
            ${h}
            ${g}
          >
            ${c ? `<i class="${c} text-base"></i>` : '<span class="w-4"></span>'}
            <span class="flex-1">${u(s.label)}</span>
            ${w}
            ${o ? '<i class="iconoir-lock text-gray-400 text-xs ml-1"></i>' : ""}
          </button>
          ${o && y ? y : ""}
        </div>
      `;
  }).join("")}
        </div>
      </div>
    `), `
    <div class="flex items-start gap-2" data-panel-detail-actions-list="true" aria-label="Detail actions" role="toolbar">
      ${n}
      ${i}
    </div>
  `;
}
var rd = class {
  constructor(e) {
    this.actions = [], this.record = null, this.documentClickHandler = null, this.documentKeydownHandler = null, this.mount = e.mount, this.notifier = e.notifier || Wc(), this.fetchImpl = e.fetchImpl || fetch.bind(globalThis);
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
    const n = this.panelName(), i = this.recordID(), s = this.panelBasePath(), a = `${this.apiBasePath()}/panels/${encodeURIComponent(n)}`, o = new URLSearchParams(window.location.search), l = o.get("locale") || void 0, c = o.get("channel") || o.get("environment") || void 0, d = new ns({
      apiEndpoint: a,
      actionBasePath: s,
      panelName: n,
      locale: l,
      channel: c,
      actionContext: "detail",
      onActionSuccess: async (f) => {
        if (f === "delete") {
          const h = this.backHref();
          if (h) {
            window.location.assign(h);
            return;
          }
          window.location.assign(s);
          return;
        }
        await this.refresh();
      },
      onActionError: (f, h) => {
        this.notifier.error(We(h, `${f} failed`));
      },
      reconcileOnDomainFailure: async () => {
        await this.refresh();
      }
    });
    this.record = t, this.actions = d.buildRowActions(t, r), this.mount.innerHTML = td(this.actions), this.mount.setAttribute("aria-busy", "false"), this.attachListeners(i), this.attachDropdownListeners();
  }
  async fetchDetailPayload() {
    const e = this.detailEndpoint();
    if (!e) return null;
    const t = await this.fetchImpl(e, { headers: { Accept: "application/json" } });
    if (!t.ok)
      return this.notifier.error(`Actions unavailable (${t.status})`), null;
    const r = await Xc(t);
    return !r || typeof r != "object" ? null : si(r);
  }
  attachListeners(e) {
    this.actions.forEach((t, r) => {
      const n = zr(t, r), i = this.mount.querySelector(`[data-detail-action-button="${n}"]`);
      i && i.addEventListener("click", async (s) => {
        if (s.preventDefault(), !(i.getAttribute("aria-disabled") === "true" || i.dataset.disabled === "true"))
          try {
            await t.action({
              ...this.record || {},
              id: e
            });
          } catch (a) {
            if (!Be(a)) {
              const o = ot(a), l = o ? We(o, `${t.label} failed`) : a instanceof Error ? a.message : `${t.label} failed`;
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
      n.addEventListener("click", (i) => {
        if (n.getAttribute("aria-disabled") === "true" || n.dataset.disabled === "true") {
          i.preventDefault();
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
    const r = new URLSearchParams(window.location.search), n = r.get("locale"), i = r.get("channel") || r.get("environment"), s = `${this.apiBasePath()}/panels/${encodeURIComponent(e)}/${encodeURIComponent(t)}`;
    if (!n && !i) return s;
    const a = new URLSearchParams();
    return n && a.set("locale", n), i && a.set("channel", i), `${s}?${a.toString()}`;
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
async function kf(e = document) {
  const t = Array.from(e.querySelectorAll("[data-panel-detail-actions]")), r = [];
  for (const n of t) {
    const i = new rd({ mount: n });
    r.push(i), await i.init();
  }
  return r;
}
var nd = M("DataGrid"), id = class is extends Cs {
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
      new is({
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
                Cannot ${u(t)} ${u(r)}
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
            ${this.config.missingLocales.map((i) => this.renderLocaleItem(i)).join("")}
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
            Retry ${u(t)}
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
    }, n = this.config.missingFieldsByLocale?.[t], i = Array.isArray(n) && n.length > 0, s = this.getLocaleLabel(t), a = r.loading ? "disabled" : "";
    return `
      <li class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 ${r.loading ? "opacity-50" : ""}"
          data-locale-item="${u(t)}"
          role="listitem">
        <div class="flex items-start justify-between gap-4">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 uppercase tracking-wide"
                    aria-label="Locale code">
                ${u(t)}
              </span>
              <span class="text-sm font-medium text-gray-900 dark:text-white">
                ${u(s)}
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
            ${i ? `
              <div class="mt-2">
                <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Missing required fields:</p>
                <div class="flex flex-wrap gap-1.5">
                  ${n.map((o) => `
                    <span class="inline-flex items-center px-2 py-0.5 rounded text-xs bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
                      ${u(o)}
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
              data-locale="${u(t)}"
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
    const i = this.config.navigationBasePath, s = r || this.config.recordId, a = new URLSearchParams();
    a.set("locale", t);
    const o = this.getContentChannel();
    o && a.set("channel", o);
    const l = `${i}/${s}/edit?${a.toString()}`;
    return `
      <a href="${u(l)}"
         data-blocker-action="open"
         data-locale="${u(t)}"
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
      r.addEventListener("keydown", (i) => {
        i.key === "ArrowDown" && n < t.length - 1 ? (i.preventDefault(), t[n + 1].querySelector("[data-blocker-action]")?.focus()) : i.key === "ArrowUp" && n > 0 && (i.preventDefault(), t[n - 1].querySelector("[data-blocker-action]")?.focus());
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
        }, i = this.getContentChannel();
        i && (n.channel = i), this.config.panelName && (n.policy_entity = this.config.panelName);
        const s = `${this.config.apiEndpoint}/actions/create_translation`, a = await Vr(s, n);
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
      } catch (n) {
        r.loading = !1, this.updateLocaleItemUI(t);
        const i = n instanceof Error ? n.message : "Failed to create translation";
        this.config.onError?.(i);
      }
    }
  }
  updateLocaleItemUI(t) {
    const r = this.container?.querySelector(`[data-locale-item="${t}"]`);
    if (!r || !this.localeStates.get(t)) return;
    const n = r.parentElement;
    if (!n) return;
    const i = document.createElement("div");
    i.innerHTML = this.renderLocaleItem(t);
    const s = i.firstElementChild;
    s && (n.replaceChild(s, r), s.querySelector('[data-blocker-action="create"]')?.addEventListener("click", () => {
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
async function _f(e) {
  try {
    await id.showBlocker(e);
  } catch (t) {
    nd.error("[TranslationBlockerModal] Render failed, using fallback:", t);
    const r = `Cannot ${e.transition || "complete action"}: Missing translations for ${e.missingLocales.join(", ")}`;
    typeof window < "u" && "toastManager" in window ? window.toastManager.error(r) : alert(r);
  }
}
var sd = M("DataGrid"), ad = [
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
], ss = class {
  constructor(e) {
    this.container = null;
    const t = typeof e.container == "string" ? document.querySelector(e.container) : e.container;
    this.config = {
      container: t,
      containerClass: e.containerClass || "",
      title: e.title || "",
      orientation: e.orientation || "horizontal",
      size: e.size || "default",
      items: e.items || ad
    }, this.container = t;
  }
  render() {
    if (!this.container) {
      sd.warn("[StatusLegend] Container not found");
      return;
    }
    this.container.innerHTML = this.buildHTML();
  }
  buildHTML() {
    const { title: e, orientation: t, size: r, items: n, containerClass: i } = this.config, s = t === "vertical", a = r === "sm", o = s ? "flex-col" : "flex-row flex-wrap", l = a ? "gap-2" : "gap-4", c = a ? "text-xs" : "text-sm", d = a ? "text-sm" : "text-base";
    return `
      <div class="status-legend inline-flex items-center ${o} ${l} ${i}"
           role="list"
           aria-label="Translation status legend">
        ${e ? `<span class="font-medium text-gray-600 dark:text-gray-400 mr-2 ${c}">${u(e)}</span>` : ""}
        ${n.map((f) => this.renderItem(f, d, c)).join("")}
      </div>
    `;
  }
  renderItem(e, t, r) {
    return `
      <div class="status-legend-item inline-flex items-center gap-1"
           role="listitem"
           title="${u(e.description)}"
           aria-label="${u(e.label)}: ${u(e.description)}">
        <span class="${e.colorClass} ${t}" aria-hidden="true">${e.icon}</span>
        <span class="text-gray-600 dark:text-gray-400 ${r}">${u(e.label)}</span>
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
function od(e) {
  const t = new ss(e);
  return t.render(), t;
}
function Lf() {
  const e = document.querySelectorAll("[data-status-legend]"), t = [];
  return e.forEach((r) => {
    if (r.hasAttribute("data-status-legend-init")) return;
    const n = od({
      container: r,
      orientation: r.dataset.orientation || "horizontal",
      size: r.dataset.size || "default",
      title: r.dataset.title || ""
    });
    r.setAttribute("data-status-legend-init", "true"), t.push(n);
  }), t;
}
function Df(e = {}) {
  const t = document.createElement("div");
  return new ss({
    container: t,
    ...e
  }).buildHTML();
}
var br = M("DataGrid"), as = [
  {
    key: "all",
    label: "All",
    field: "",
    value: "",
    icon: "○",
    tone: "neutral",
    description: "Show all records"
  },
  {
    key: "ready",
    label: "Ready",
    field: "readiness_state",
    value: "ready",
    icon: "●",
    tone: "success",
    description: "All translations complete"
  },
  {
    key: "missing_locales",
    label: "Missing",
    field: "readiness_state",
    value: "missing_locales",
    icon: "○",
    tone: "warning",
    description: "Missing required locale translations"
  },
  {
    key: "missing_fields",
    label: "Incomplete",
    field: "readiness_state",
    value: "missing_fields",
    icon: "◐",
    tone: "warning",
    description: "Has translations but missing required fields"
  },
  {
    key: "fallback",
    label: "Fallback",
    field: "fallback_used",
    value: "true",
    icon: "⚠",
    tone: "warning",
    description: "Records currently viewed in fallback mode"
  }
], ld = class {
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
      br.warn("[QuickFilters] Container not found");
      return;
    }
    const { size: e = "default", containerClass: t = "" } = this.config, r = this.config.filters.map((n) => this.renderFilterButton(n, e)).join("");
    this.container.innerHTML = `
      <div class="quick-filters ${t}"
           role="group"
           aria-label="Quick filters">
        ${r}
      </div>
    `, this.bindEventListeners();
  }
  renderFilterButton(e, t) {
    const r = this.state.capabilities.get(e.key), n = r?.supported !== !1, i = this.state.activeKey === e.key, s = r?.disabledReason || "Filter not available";
    let a;
    n ? i ? a = 'aria-pressed="true"' : a = 'aria-pressed="false"' : a = `aria-disabled="true" aria-pressed="false" title="${v(s)}"`;
    const o = e.icon ? `<span aria-hidden="true">${e.icon}</span>` : "";
    return `
      <button type="button"
              class="quick-filter quick-filter--${t} ${v(e.styleClass || "")}"
              data-quick-filter-value="${v(e.value)}"
              data-quick-filter-key="${v(e.key)}"
              data-filter-key="${v(e.key)}"
              data-tone="${v(e.tone || "neutral")}"
              data-state="${n ? i ? "active" : "inactive" : "disabled"}"
              ${a}
              ${n ? "" : "disabled"}>
        ${o}
        <span>${u(e.label)}</span>
      </button>
    `;
  }
  bindEventListeners() {
    this.container && this.container.querySelectorAll("[data-quick-filter-value]").forEach((e) => {
      e.addEventListener("click", () => {
        const t = e.dataset.quickFilterKey || e.dataset.filterKey;
        t && !e.disabled && this.selectFilter(t);
      });
    });
  }
  selectFilter(e) {
    const t = this.config.filters.find((r) => r.key === e);
    if (!t) {
      br.warn(`[QuickFilters] Filter not found: ${e}`);
      return;
    }
    if (this.state.capabilities.get(e)?.supported === !1) {
      br.warn(`[QuickFilters] Filter not supported: ${e}`);
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
function cd(e, t, r = {}) {
  return new ld({
    container: e,
    filters: as,
    onFilterSelect: t,
    ...r
  });
}
function Tf(e) {
  const t = document.querySelectorAll("[data-quick-filters]"), r = [];
  return t.forEach((n) => {
    if (n.hasAttribute("data-quick-filters-init")) return;
    const i = cd(n, (s) => e(s, n), { size: n.dataset.size || "default" });
    n.setAttribute("data-quick-filters-init", "true"), r.push(i);
  }), r;
}
function Rf(e = {}) {
  const { filters: t = as, activeKey: r = null, capabilities: n = [], size: i = "default", containerClass: s = "" } = e, a = /* @__PURE__ */ new Map();
  for (const l of n) a.set(l.key, l);
  const o = t.map((l) => {
    const c = a.get(l.key), d = c?.supported !== !1, f = r === l.key, h = c?.disabledReason || "Filter not available", p = l.icon ? `<span aria-hidden="true">${u(l.icon)}</span>` : "", m = d ? "" : `title="${v(h)}"`, g = d ? "" : 'aria-disabled="true"', y = f ? 'aria-current="true"' : "", w = d ? f ? "active" : "inactive" : "disabled";
    return `<span class="quick-filter quick-filter--${i} ${v(l.styleClass || "")}" data-quick-filter-value="${v(l.value)}" data-quick-filter-key="${v(l.key)}" data-tone="${v(l.tone || "neutral")}" data-state="${w}" ${g} ${y} ${m}>${p}<span>${u(l.label)}</span></span>`;
  }).join("");
  return `<div class="quick-filters ${v(s)}" data-quick-filters role="group" aria-label="Quick filters">${o}</div>`;
}
var yr = "go-admin:translation-panel-expanded", dd = class {
  constructor(e) {
    this.toggleButton = null, this.panelElement = null, this.expandAllButton = null, this.collapseAllButton = null, this.groupControls = null, this.viewModeButtons = [], this.expanded = !1, this.boundToggleHandler = null, this.config = {
      ...e,
      storageKey: e.storageKey || yr
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
      return window.localStorage.getItem(this.config.storageKey || yr) === "true";
    } catch {
      return !1;
    }
  }
  persistExpandedState(e) {
    if (!(typeof window > "u" || !window.localStorage))
      try {
        window.localStorage.setItem(this.config.storageKey || yr, e ? "true" : "false");
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
function Pf(e) {
  return new dd(e);
}
async function ud(e, t, r = {}) {
  const { apiEndpoint: n, notifier: i = new Qe(), maxFailuresToShow: s = 5 } = e, a = `${n}/bulk/create-missing-translations`;
  try {
    const o = await U(a, {
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
    if (!o.ok) throw new Error(await Hr(o, `Request failed: ${o.status}`, { appendStatusToFallback: !1 }));
    const l = fd(await o.json(), s);
    return hd(l, i), e.onSuccess && e.onSuccess(l), l;
  } catch (o) {
    const l = o instanceof Error ? o : new Error(String(o));
    throw i.error(`Failed to create translations: ${l.message}`), e.onError && e.onError(l), l;
  }
}
function fd(e, t) {
  const r = e.data || [], n = e.created_count ?? r.filter((a) => a.success).length, i = e.failed_count ?? r.filter((a) => !a.success).length, s = e.skipped_count ?? 0;
  return {
    total: e.total ?? r.length,
    created: n,
    failed: i,
    skipped: s,
    failures: r.filter((a) => !a.success && a.error).slice(0, t).map((a) => ({
      id: a.id,
      locale: a.locale,
      error: a.error || "Unknown error"
    }))
  };
}
function hd(e, t) {
  const { created: r, failed: n, skipped: i, total: s } = e;
  if (s === 0) {
    t.info("No translations to create");
    return;
  }
  n === 0 ? r > 0 ? t.success(`Created ${r} translation${r !== 1 ? "s" : ""}${i > 0 ? ` (${i} skipped)` : ""}`) : i > 0 && t.info(`All ${i} translation${i !== 1 ? "s" : ""} already exist`) : r === 0 ? t.error(`Failed to create ${n} translation${n !== 1 ? "s" : ""}`) : t.warning(`Created ${r}, failed ${n}${i > 0 ? `, skipped ${i}` : ""}`);
}
function Mf(e) {
  const { created: t, failed: r, skipped: n, total: i, failures: s } = e, a = `
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
  let o = "";
  return s.length > 0 && (o = `
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
              ${s.map((l) => `
        <tr>
          <td class="px-3 py-2 text-sm text-gray-700">${u(l.id)}</td>
          <td class="px-3 py-2 text-sm text-gray-700">${u(l.locale)}</td>
          <td class="px-3 py-2 text-sm text-red-600">${u(l.error)}</td>
        </tr>
      `).join("")}
            </tbody>
          </table>
        </div>
        ${r > s.length ? `<p class="mt-2 text-sm text-gray-500">Showing ${s.length} of ${r} failures</p>` : ""}
      </div>
    `), `
    <div class="bulk-result-summary">
      <div class="mb-4 text-sm text-gray-600">
        Processed ${i} item${i !== 1 ? "s" : ""}
      </div>
      ${a}
      ${o}
    </div>
  `;
}
function If(e) {
  const { created: t, failed: r, skipped: n } = e, i = [];
  return t > 0 && i.push(`<span class="text-green-600">+${t}</span>`), r > 0 && i.push(`<span class="text-red-600">${r} failed</span>`), n > 0 && i.push(`<span class="text-yellow-600">${n} skipped</span>`), i.join(" · ");
}
function Bf(e, t, r) {
  return async (n) => ud({
    apiEndpoint: e,
    notifier: t,
    onSuccess: r
  }, n);
}
var pd = {
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
function le(e) {
  const t = e.toLowerCase();
  return pd[t] || e.toUpperCase();
}
var Zt = class {
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
    const { locale: e, size: t, mode: r, localeExists: n } = this.config, { loading: i, created: s, error: a } = this.state, o = le(e), l = t === "sm" ? "text-xs px-2 py-1" : "text-sm px-3 py-1.5", c = r === "button" ? "rounded-lg" : "rounded-full";
    let d, f = "";
    i ? (d = "bg-gray-100 text-gray-600 border-gray-300", f = this.renderSpinner()) : s ? (d = "bg-green-100 text-green-700 border-green-300", f = this.renderCheckIcon()) : a ? (d = "bg-red-100 text-red-700 border-red-300", f = this.renderErrorIcon()) : n ? d = "bg-blue-100 text-blue-700 border-blue-300" : d = "bg-amber-100 text-amber-700 border-amber-300";
    const h = this.renderActions();
    return `
      <div class="inline-flex items-center gap-1.5 ${l} ${c} border ${d}"
           data-locale-action="${u(e)}"
           data-locale-exists="${n}"
           data-loading="${i}"
           data-created="${s}"
           role="group"
           aria-label="${o} translation">
        ${f}
        <span class="font-medium uppercase tracking-wide" aria-hidden="true">${u(e)}</span>
        <span class="sr-only">${o}</span>
        ${h}
      </div>
    `;
  }
  renderActions() {
    const { locale: e, localeExists: t, size: r } = this.config, { loading: n, created: i } = this.state, s = r === "sm" ? "p-0.5" : "p-1", a = r === "sm" ? "w-3 h-3" : "w-4 h-4", o = [];
    if (!t && !i && !n && o.push(`
        <button type="button"
                class="inline-flex items-center justify-center ${s} rounded hover:bg-amber-200 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors"
                data-action="create"
                data-locale="${u(e)}"
                aria-label="Create ${le(e)} translation"
                title="Create ${le(e)} translation">
          <svg class="${a}" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
        </button>
      `), t || i) {
      const l = i ? "hover:bg-green-200" : "hover:bg-blue-200", c = i ? "focus:ring-green-500" : "focus:ring-blue-500";
      o.push(`
        <button type="button"
                class="inline-flex items-center justify-center ${s} rounded ${l} focus:outline-none focus:ring-1 ${c} transition-colors"
                data-action="open"
                data-locale="${u(e)}"
                aria-label="Open ${le(e)} translation"
                title="Open ${le(e)} translation">
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
        const r = `${this.config.apiEndpoint}/actions/create_translation`, n = await Vr(r, e);
        if (n.success) {
          const i = n.data?.id ? String(n.data.id) : void 0;
          this.setState({
            loading: !1,
            created: !0,
            newRecordId: i
          });
          const s = {
            id: i || this.config.recordId,
            locale: this.config.locale,
            status: String(n.data?.status || "draft"),
            familyId: n.data?.family_id ? String(n.data.family_id) : void 0
          };
          this.config.onCreateSuccess?.(this.config.locale, s);
        } else {
          const i = n.error?.message || "Failed to create translation";
          this.setState({
            loading: !1,
            error: i
          }), this.config.onError?.(this.config.locale, i);
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
    const { locale: e, navigationBasePath: t, recordId: r } = this.config, { newRecordId: n } = this.state, i = n || r, s = new URLSearchParams();
    s.set("locale", e);
    const a = this.getContentChannel();
    a && s.set("channel", a);
    const o = `${t}/${i}/edit?${s.toString()}`;
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
function os(e) {
  return new Zt(e).render();
}
function Of(e, t) {
  return e.length === 0 ? "" : `
    <div class="flex flex-wrap items-center gap-2" role="list" aria-label="Missing translations">
      ${e.map((r) => os({
    ...t,
    locale: r
  })).join("")}
    </div>
  `;
}
function Ff(e, t) {
  const r = /* @__PURE__ */ new Map();
  return e.querySelectorAll("[data-locale-action]").forEach((n) => {
    const i = n.getAttribute("data-locale-action");
    if (!i) return;
    const s = n.getAttribute("data-locale-exists") === "true", a = {
      ...t,
      locale: i,
      localeExists: s
    }, o = new Zt(a), l = n.parentElement;
    l && (o.mount(l), r.set(i, o));
  }), r;
}
function Gn(e, t, r, n) {
  const i = new URLSearchParams();
  i.set("locale", r);
  const s = String(n ?? "").trim();
  return s && i.set("channel", s), `${e}/${t}/edit?${i.toString()}`;
}
var mn = class {
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
    const { context: e, showFormLockMessage: t } = this.config, r = e.requestedLocale || "requested", n = e.resolvedLocale || "default", i = le(r), s = le(n), a = this.renderPrimaryCta(), o = this.renderSecondaryCta(), l = t ? this.renderFormLockMessage() : "";
    return `
      <div class="fallback-banner bg-amber-50 border border-amber-200 rounded-lg shadow-sm"
           role="alert"
           aria-live="polite"
           data-fallback-banner="true"
           data-requested-locale="${u(r)}"
           data-resolved-locale="${u(n)}">
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
                The <strong class="font-medium">${u(i)}</strong> (${u(r.toUpperCase())})
                translation doesn't exist yet. You're viewing content from
                <strong class="font-medium">${u(s)}</strong> (${u(n.toUpperCase())}).
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
    const { context: e, apiEndpoint: t, navigationBasePath: r, panelName: n, channel: i } = this.config, s = e.requestedLocale, a = String(i ?? "").trim();
    return !s || !e.recordId ? "" : `
      <button type="button"
              class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-colors"
              data-action="create-translation"
              data-locale="${u(s)}"
              data-record-id="${u(e.recordId)}"
              data-api-endpoint="${u(t)}"
              data-panel="${u(n || "")}"
              data-channel="${u(a)}"
              aria-label="Create ${le(s)} translation">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
        </svg>
        Create ${u(s.toUpperCase())} translation
      </button>
    `;
  }
  renderSecondaryCta() {
    const { context: e, navigationBasePath: t, channel: r } = this.config, n = e.resolvedLocale;
    if (!n || !e.recordId) return "";
    const i = Gn(t, e.recordId, n, r);
    return `
      <a href="${u(i)}"
         class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-amber-700 bg-white border border-amber-300 rounded-lg hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-colors"
         data-action="open-source"
         data-locale="${u(n)}"
         aria-label="Open ${le(n)} translation">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
        </svg>
        Open ${u(n.toUpperCase())} (source)
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
      const n = t.getAttribute("data-locale"), i = t.getAttribute("href");
      n && i && this.config.onOpenSource?.(n, i);
    });
  }
  async handleCreate() {
    const { context: e, apiEndpoint: t, panelName: r, channel: n, navigationBasePath: i } = this.config, s = e.requestedLocale, a = e.recordId, o = String(n ?? "").trim() || void 0;
    !s || !a || await new Zt({
      locale: s,
      recordId: a,
      apiEndpoint: t,
      navigationBasePath: i,
      panelName: r,
      channel: o,
      localeExists: !1,
      onCreateSuccess: (l, c) => {
        this.config.onCreateSuccess?.(l, c);
        const d = Gn(i, c.id, l, o);
        window.location.href = d;
      },
      onError: (l, c) => {
        this.config.onError?.(c);
      }
    }).handleCreate();
  }
};
function md(e, t) {
  if (!t.locked) {
    gd(e);
    return;
  }
  if (e.classList.add("form-locked", "pointer-events-none", "opacity-75"), e.setAttribute("data-form-locked", "true"), e.setAttribute("data-lock-reason", t.reason || ""), e.querySelectorAll('input, textarea, select, button[type="submit"]').forEach((r) => {
    r.setAttribute("disabled", "true"), r.setAttribute("data-was-enabled", "true"), r.setAttribute("aria-disabled", "true");
  }), !e.querySelector("[data-form-lock-overlay]")) {
    const r = document.createElement("div");
    r.setAttribute("data-form-lock-overlay", "true"), r.className = "absolute inset-0 bg-amber-50/30 cursor-not-allowed z-10", r.setAttribute("title", t.reason || "Form is locked"), window.getComputedStyle(e).position === "static" && (e.style.position = "relative"), e.appendChild(r);
  }
}
function gd(e) {
  e.classList.remove("form-locked", "pointer-events-none", "opacity-75"), e.removeAttribute("data-form-locked"), e.removeAttribute("data-lock-reason"), e.querySelectorAll('[data-was-enabled="true"]').forEach((t) => {
    t.removeAttribute("disabled"), t.removeAttribute("data-was-enabled"), t.removeAttribute("aria-disabled");
  }), e.querySelector("[data-form-lock-overlay]")?.remove();
}
function qf(e) {
  return e.getAttribute("data-form-locked") === "true";
}
function Nf(e) {
  return e.getAttribute("data-lock-reason");
}
function jf(e, t) {
  const r = be(e);
  return new mn({
    ...t,
    context: r
  }).render();
}
function zf(e) {
  const t = be(e);
  return t.fallbackUsed || t.missingRequestedLocale;
}
function Gf(e, t) {
  const r = new mn(t);
  return r.mount(e), r;
}
function Uf(e, t) {
  const r = be(t), n = new mn({
    context: r,
    apiEndpoint: "",
    navigationBasePath: ""
  }).getFormLockState();
  return md(e, n), n;
}
var ls = class {
  constructor(e, t) {
    this.chips = /* @__PURE__ */ new Map(), this.element = null, this.config = {
      maxChips: 3,
      size: "sm",
      ...t
    }, this.readiness = ee(e), this.actionState = this.extractActionState(e, "create_translation");
  }
  extractActionState(e, t) {
    return ai(e, t);
  }
  isCreateActionEnabled() {
    return this.actionState ? this.actionState.enabled : !0;
  }
  getDisabledReason() {
    if (this.isCreateActionEnabled()) return null;
    if (this.actionState?.reason) return this.actionState.reason;
    const e = oi({ reason_code: this.actionState?.reason_code });
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
    const t = this.isCreateActionEnabled(), r = this.getDisabledReason(), n = this.getOverflowCount(), i = e.map((a) => this.renderChip(a, t, r)).join(""), s = n > 0 ? this.renderOverflow(n) : "";
    return `
      <div class="${t ? "inline-flex items-center gap-1.5 flex-wrap" : "inline-flex items-center gap-1.5 flex-wrap opacity-60"}"
           data-inline-locale-chips="true"
           data-record-id="${u(this.config.recordId)}"
           data-action-enabled="${t}"
           role="list"
           aria-label="Missing translations">
        ${i}${s}
      </div>
    `;
  }
  renderChip(e, t, r) {
    const { recordId: n, apiEndpoint: i, navigationBasePath: s, panelName: a, channel: o, size: l } = this.config, c = String(o ?? "").trim() || void 0;
    return t ? os({
      locale: e,
      recordId: n,
      apiEndpoint: i,
      navigationBasePath: s,
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
    const n = r === "md" ? "text-sm px-3 py-1.5" : "text-xs px-2 py-1", i = t || "Translation creation unavailable", s = le(e);
    return `
      <div class="inline-flex items-center gap-1 ${n} rounded-full border border-gray-300 bg-gray-100 text-gray-500 cursor-not-allowed"
           data-locale="${u(e)}"
           data-disabled="true"
           title="${u(i)}"
           role="listitem"
           aria-label="${s} translation (unavailable)">
        <svg class="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"/>
        </svg>
        <span class="font-medium uppercase tracking-wide">${u(e)}</span>
      </div>
    `;
  }
  renderOverflow(e) {
    const { size: t } = this.config, r = t === "md" ? "text-sm px-2 py-1" : "text-xs px-1.5 py-0.5", n = this.readiness.missingRequiredLocales.join(", ").toUpperCase();
    return `
      <span class="${r} rounded text-gray-500 font-medium"
            title="Also missing: ${u(n)}"
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
      const r = new Zt({
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
function bd(e, t) {
  const r = String(e.id || "");
  return r ? new ls(e, {
    ...t,
    recordId: r
  }).render() : "";
}
function Hf(e) {
  const t = ee(e);
  return t.hasReadinessMetadata && t.missingRequiredLocales.length > 0;
}
function Vf(e, t, r) {
  const n = String(t.id || ""), i = new ls(t, {
    ...r,
    recordId: n
  });
  return i.mount(e), i;
}
function Kf(e) {
  return (t, r, n) => bd(r, e);
}
var vr = M("DataGrid");
function er() {
  return typeof navigator > "u" ? !1 : /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent);
}
function yd() {
  return er() ? "⌘" : "Ctrl";
}
function vd(e) {
  if (er()) switch (e) {
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
function cs(e) {
  const t = e.modifiers.map(vd), r = wd(e.key);
  return er() ? [...t, r].join("") : [...t, r].join("+");
}
function wd(e) {
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
var ds = class {
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
      vr.warn(`[KeyboardShortcuts] Shortcut "${e.id}" already registered`);
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
          vr.error(`[KeyboardShortcuts] Handler error for "${t.id}":`, n);
        });
      } catch (r) {
        vr.error(`[KeyboardShortcuts] Handler error for "${t.id}":`, r);
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
    const i = er(), s = new Set(e.modifiers), a = s.has("ctrl"), o = s.has("meta"), l = s.has("alt"), c = s.has("shift");
    return !(a && !(i ? t.metaKey : t.ctrlKey) || o && !i && !t.metaKey || l && !t.altKey || c && !t.shiftKey || !a && !o && (i ? t.metaKey : t.ctrlKey) || !l && t.altKey || !c && t.shiftKey);
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
function xd(e) {
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
function Jf(e) {
  const t = /* @__PURE__ */ new Map();
  for (const s of e) {
    if (s.enabled === !1) continue;
    const a = t.get(s.category) || [];
    a.push(s), t.set(s.category, a);
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
  let i = `
    <div class="shortcuts-help" role="document">
      <div class="text-sm text-gray-500 mb-4">
        Press <kbd class="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs font-mono">?</kbd> to show this help anytime
      </div>
  `;
  for (const s of n) {
    const a = t.get(s);
    if (!(!a || a.length === 0)) {
      i += `
      <div class="mb-4">
        <h4 class="text-sm font-medium text-gray-700 mb-2">${r[s]}</h4>
        <dl class="space-y-1">
    `;
      for (const o of a) {
        const l = cs(o);
        i += `
          <div class="flex justify-between items-center py-1">
            <dt class="text-sm text-gray-600">${u(o.description)}</dt>
            <dd class="flex-shrink-0 ml-4">
              <kbd class="px-2 py-1 bg-gray-100 border border-gray-200 rounded text-xs font-mono text-gray-700">${u(l)}</kbd>
            </dd>
          </div>
      `;
      }
      i += `
        </dl>
      </div>
    `;
    }
  }
  return i += "</div>", i;
}
var us = "admin_keyboard_shortcuts_settings", fs = "admin_keyboard_shortcuts_hint_dismissed", Bt = {
  enabled: !0,
  shortcuts: {},
  updatedAt: (/* @__PURE__ */ new Date()).toISOString()
};
function tr() {
  return typeof localStorage > "u" || !localStorage || typeof localStorage.getItem != "function" || typeof localStorage.setItem != "function" ? null : localStorage;
}
function Sd() {
  const e = tr();
  if (!e) return { ...Bt };
  try {
    const t = e.getItem(us);
    if (!t) return { ...Bt };
    const r = JSON.parse(t);
    return {
      enabled: typeof r.enabled == "boolean" ? r.enabled : !0,
      shortcuts: typeof r.shortcuts == "object" && r.shortcuts !== null ? r.shortcuts : {},
      updatedAt: typeof r.updatedAt == "string" ? r.updatedAt : (/* @__PURE__ */ new Date()).toISOString()
    };
  } catch {
    return { ...Bt };
  }
}
function Yf(e) {
  const t = tr();
  if (t)
    try {
      const r = {
        ...e,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      t.setItem(us, JSON.stringify(r));
    } catch {
    }
}
function Cd() {
  const e = tr();
  return e ? e.getItem(fs) === "true" : !1;
}
function Ed() {
  const e = tr();
  if (e)
    try {
      e.setItem(fs, "true");
    } catch {
    }
}
function Ad(e) {
  if (Cd()) return null;
  const { container: t, position: r = "bottom", onDismiss: n, onShowHelp: i, autoDismissMs: s = 1e4 } = e, a = document.createElement("div");
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
            to view all shortcuts, or use <kbd class="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-xs font-mono">${yd()}+S</kbd> to save.
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
    l && Ed(), a.remove(), n?.();
  };
  return a.querySelector('[data-hint-action="show-help"]')?.addEventListener("click", () => {
    o(!0), i?.();
  }), a.querySelector('[data-hint-action="dismiss"]')?.addEventListener("click", () => {
    o(!0);
  }), a.querySelector('[data-hint-action="close"]')?.addEventListener("click", () => {
    o(!1);
  }), s > 0 && setTimeout(() => {
    a.parentElement && o(!1);
  }, s), t.appendChild(a), a;
}
function Wf(e) {
  const { container: t, shortcuts: r, settings: n, onSettingsChange: i } = e, s = {
    save: "Save & Submit",
    navigation: "Navigation",
    locale: "Locale Switching",
    actions: "Actions",
    help: "Help",
    other: "Other"
  }, a = /* @__PURE__ */ new Map();
  for (const c of r) {
    const d = a.get(c.category) || [];
    d.push(c), a.set(c.category, d);
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
  for (const c of o) {
    const d = a.get(c);
    if (!(!d || d.length === 0)) {
      l += `
      <div class="space-y-2">
        <h4 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          ${s[c]}
        </h4>
        <div class="space-y-1">
    `;
      for (const f of d) {
        const h = n.shortcuts[f.id] !== !1, p = cs(f);
        l += `
        <div class="flex items-center justify-between py-2 px-3 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50">
          <div class="flex items-center gap-3">
            <kbd class="px-2 py-1 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-xs font-mono text-gray-700 dark:text-gray-300">
              ${u(p)}
            </kbd>
            <span class="text-sm text-gray-700 dark:text-gray-300">${u(f.description)}</span>
          </div>
          <input type="checkbox"
                 id="shortcut-${u(f.id)}"
                 data-settings-action="toggle-shortcut"
                 data-shortcut-id="${u(f.id)}"
                 ${h ? "checked" : ""}
                 class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                 aria-label="Enable ${u(f.description)} shortcut">
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
    i(c);
  }), t.querySelectorAll('[data-settings-action="toggle-shortcut"]').forEach((c) => {
    c.addEventListener("change", () => {
      const d = c.getAttribute("data-shortcut-id");
      if (!d) return;
      const f = {
        ...n,
        shortcuts: {
          ...n.shortcuts,
          [d]: c.checked
        }
      };
      i(f);
    });
  }), t.querySelector('[data-settings-action="reset"]')?.addEventListener("click", () => {
    i({ ...Bt });
  });
}
function $d(e, t) {
  const r = e;
  r.config && (r.config.enabled = t.enabled);
  for (const n of e.getShortcuts()) {
    const i = t.shortcuts[n.id] !== !1;
    e.setEnabled(n.id, i);
  }
}
var wr = null;
function Xf() {
  return wr || (wr = new ds()), wr;
}
function kd(e, t) {
  const r = Sd(), n = new ds({
    ...t,
    enabled: r.enabled
  }), i = xd(e);
  for (const s of i) n.register(s);
  return $d(n, r), n.bind(), n;
}
function Qf(e, t) {
  const r = kd(e, t);
  return t.hintContainer && Ad({
    container: t.hintContainer,
    onShowHelp: t.onShowHelp,
    onDismiss: () => {
    }
  }), r;
}
var _d = 1500, Ld = 2e3, gn = "autosave", at = {
  idle: "",
  saving: "Saving...",
  saved: "Saved",
  error: "Save failed",
  conflict: "Conflict detected"
}, Dd = {
  title: "Save Conflict",
  message: "This content was modified by someone else. Choose how to proceed:",
  useServer: "Use server version",
  forceSave: "Overwrite with my changes",
  viewDiff: "View differences",
  dismiss: "Dismiss"
}, hs = class {
  constructor(e = {}) {
    this.state = "idle", this.conflictInfo = null, this.pendingData = null, this.lastError = null, this.debounceTimer = null, this.savedTimer = null, this.listeners = [], this.isDirty = !1, this.config = {
      container: e.container,
      onSave: e.onSave,
      debounceMs: e.debounceMs ?? _d,
      savedDurationMs: e.savedDurationMs ?? Ld,
      notifier: e.notifier,
      showToasts: e.showToasts ?? !1,
      classPrefix: e.classPrefix ?? gn,
      labels: {
        ...at,
        ...e.labels
      },
      enableConflictDetection: e.enableConflictDetection ?? !1,
      onConflictResolve: e.onConflictResolve,
      fetchServerState: e.fetchServerState,
      allowForceSave: e.allowForceSave ?? !0,
      conflictLabels: {
        ...Dd,
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
    const e = this.config.classPrefix, t = this.config.labels, r = `${e}--${this.state}`, n = t[this.state] || "", i = this.getStateIcon();
    return this.state === "conflict" ? this.renderConflictUI() : `<div class="${e} ${r}" role="status" aria-live="polite" aria-atomic="true">
      <span class="${e}__icon">${i}</span>
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
          t.success(this.config.labels.saved ?? at.saved, 2e3);
          break;
        case "error":
          t.error(this.lastError?.message ?? this.config.labels.error ?? at.error);
          break;
        case "conflict":
          t.warning?.(this.config.labels.conflict ?? at.conflict);
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
function Zf(e) {
  return new hs({
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
function eh(e, t = {}) {
  const r = t.classPrefix ?? gn, n = {
    ...at,
    ...t.labels
  }[e] || "";
  let i = "";
  switch (e) {
    case "saving":
      i = `<span class="${r}__spinner"></span>`;
      break;
    case "saved":
      i = `<span class="${r}__check">✓</span>`;
      break;
    case "error":
      i = `<span class="${r}__error">!</span>`;
      break;
    case "conflict":
      i = `<span class="${r}__conflict-icon">⚠</span>`;
  }
  return `<div class="${r} ${r}--${e}" role="status" aria-live="polite">
    ${i}
    <span class="${r}__label">${n}</span>
  </div>`;
}
function th(e = gn) {
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
function rh(e, t) {
  const { watchFields: r, indicatorSelector: n, ...i } = t;
  let s = i.container;
  !s && n && (s = e.querySelector(n) ?? void 0);
  const a = new hs({
    ...i,
    container: s
  }), o = () => {
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
      a.markDirty(o());
    }
  };
  e.addEventListener("input", l), e.addEventListener("change", l), e.addEventListener("submit", async (h) => {
    a.hasPendingChanges() && (h.preventDefault(), await a.save() && e.submit());
  });
  const c = (h) => {
    a.hasPendingChanges() && (h.preventDefault(), h.returnValue = "");
  };
  window.addEventListener("beforeunload", c);
  const d = () => {
    document.hidden && a.hasPendingChanges() && a.save();
  };
  document.addEventListener("visibilitychange", d);
  const f = a.destroy.bind(a);
  return a.destroy = () => {
    e.removeEventListener("input", l), e.removeEventListener("change", l), window.removeEventListener("beforeunload", c), document.removeEventListener("visibilitychange", d), f();
  }, a;
}
var ps = "char-counter", Td = "interpolation-preview", ms = "dir-toggle", gs = [
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
], Rd = {
  name: "John",
  count: "5",
  email: "user@example.com",
  date: "2024-01-15",
  price: "$29.99",
  user: "Jane",
  item: "Product",
  total: "100"
}, Pd = class {
  constructor(e) {
    this.counterEl = null, this.config = {
      input: e.input,
      container: e.container,
      softLimit: e.softLimit,
      hardLimit: e.hardLimit,
      thresholds: e.thresholds ?? this.buildDefaultThresholds(e),
      enforceHardLimit: e.enforceHardLimit ?? !1,
      classPrefix: e.classPrefix ?? ps,
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
}, Md = class {
  constructor(e) {
    this.previewEl = null, this.config = {
      input: e.input,
      container: e.container,
      sampleValues: e.sampleValues ?? Rd,
      patterns: [...gs, ...e.customPatterns ?? []],
      highlightVariables: e.highlightVariables ?? !0,
      classPrefix: e.classPrefix ?? Td
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
        const i = (n ?? r).replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
        for (const [s, a] of Object.entries(this.config.sampleValues)) if (s.toLowerCase() === i) return a;
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
    if (t.length === 0) return u(e);
    t.sort((s, a) => s.start - a.start);
    let n = "", i = 0;
    for (const s of t) {
      n += u(e.slice(i, s.start));
      const a = this.getSampleValue(s.variable), o = e.slice(s.start, s.end);
      n += `<span class="${r}__variable" title="${u(o)}">${u(a ?? o)}</span>`, i = s.end;
    }
    return n += u(e.slice(i)), n;
  }
  render() {
    const e = this.config.classPrefix;
    return `<div class="${e}${this.getMatches().length === 0 ? ` ${e}--empty` : ""}">
      <span class="${e}__label">Preview:</span>
      <span class="${e}__content">${this.config.highlightVariables ? this.renderHighlightedPreview() : u(this.getPreviewText())}</span>
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
}, Id = class {
  constructor(e) {
    this.toggleEl = null, this.config = {
      input: e.input,
      container: e.container,
      initialDirection: e.initialDirection ?? "auto",
      persistenceKey: e.persistenceKey,
      classPrefix: e.classPrefix ?? ms,
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
function nh(e, t = {}) {
  const r = [], n = [], i = [];
  for (const s of t.charCounterFields ?? []) {
    const a = e.querySelector(`[name="${s}"]`);
    a && r.push(new Pd({
      input: a,
      ...t.charCounterConfig
    }));
  }
  for (const s of t.interpolationFields ?? []) {
    const a = e.querySelector(`[name="${s}"]`);
    a && n.push(new Md({
      input: a,
      ...t.interpolationConfig
    }));
  }
  for (const s of t.directionToggleFields ?? []) {
    const a = e.querySelector(`[name="${s}"]`);
    a && i.push(new Id({
      input: a,
      persistenceKey: `dir-${s}`,
      ...t.directionToggleConfig
    }));
  }
  return {
    counters: r,
    previews: n,
    toggles: i,
    destroy: () => {
      r.forEach((s) => s.destroy()), n.forEach((s) => s.destroy()), i.forEach((s) => s.destroy());
    }
  };
}
function ih(e, t, r, n = ps) {
  const i = [n];
  r && i.push(`${n}--${r}`);
  const s = t ? `${e} / ${t}` : `${e}`;
  return `<span class="${i.join(" ")}" aria-live="polite">${s}</span>`;
}
function sh(e, t = ms) {
  const r = e === "rtl", n = r ? '<path d="M13 8H3M6 5L3 8l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>' : '<path d="M3 8h10M10 5l3 3-3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>';
  return `<button type="button" class="${t}" aria-pressed="${r}" title="Toggle text direction (${e.toUpperCase()})">
    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" width="16" height="16">${n}</svg>
    <span class="${t}__label">${e.toUpperCase()}</span>
  </button>`;
}
function ah() {
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
function oh(e, t = gs) {
  const r = [];
  for (const n of t) {
    n.pattern.lastIndex = 0;
    let i;
    for (; (i = n.pattern.exec(e)) !== null; ) r.push({
      pattern: n.name,
      variable: i[1] ?? i[0],
      start: i.index,
      end: i.index + i[0].length
    });
  }
  return r;
}
function lh(e, t, r) {
  return r && e >= r ? "error" : t && e >= t ? "warning" : null;
}
var Gr = {
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
function xr(e) {
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
function Ur(e) {
  if (!e || typeof e != "object") return null;
  const t = e;
  return {
    enabled: t.enabled === !0,
    reason: typeof t.reason == "string" ? t.reason : void 0,
    reason_code: typeof t.reason_code == "string" ? t.reason_code : void 0,
    permission: typeof t.permission == "string" ? t.permission : void 0
  };
}
function Un(e) {
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
  const t = e, r = t.enabled === !0, n = Ur(t.entry), i = typeof t.visible == "boolean" ? t.visible : r && (n ? n.enabled : !0), s = t.actions && typeof t.actions == "object" ? t.actions : {}, a = {};
  for (const [o, l] of Object.entries(s)) {
    const c = Ur(l);
    c && (a[o] = c);
  }
  return {
    enabled: r,
    visible: i,
    entry: n ?? { enabled: r },
    actions: a
  };
}
function Bd(e) {
  const t = e && typeof e == "object" ? e : {}, r = Ur(t) ?? { enabled: !1 };
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
function Od(e) {
  if (!e || typeof e != "object") return {};
  const t = e, r = {};
  for (const [n, i] of Object.entries(t)) {
    const s = typeof i == "string" ? i.trim() : "";
    s && (r[n] = s);
  }
  return r;
}
function Fd(e) {
  if (!e || typeof e != "object") return { ...Gr };
  const t = e, r = typeof t.modules == "object" && t.modules ? t.modules : {}, n = typeof t.features == "object" && t.features ? t.features : {};
  return {
    profile: xr(t.profile ?? t.capability_mode),
    capability_mode: xr(t.capability_mode ?? t.profile),
    supported_profiles: Array.isArray(t.supported_profiles) ? t.supported_profiles.map(xr).filter((i, s, a) => a.indexOf(i) === s) : [...Gr.supported_profiles],
    schema_version: typeof t.schema_version == "number" ? t.schema_version : 1,
    modules: {
      exchange: Un(r.exchange),
      queue: Un(r.queue)
    },
    features: {
      cms: typeof n.cms == "boolean" ? n.cms : !1,
      dashboard: typeof n.dashboard == "boolean" ? n.dashboard : !1,
      suggestions: Bd(n.suggestions)
    },
    routes: Od(t.routes),
    panels: Array.isArray(t.panels) ? t.panels.filter((i) => typeof i == "string") : [],
    resolver_keys: Array.isArray(t.resolver_keys) ? t.resolver_keys.filter((i) => typeof i == "string") : [],
    warnings: Array.isArray(t.warnings) ? t.warnings.filter((i) => typeof i == "string") : [],
    contracts: typeof t.contracts == "object" && t.contracts ? t.contracts : void 0
  };
}
var qd = M("DataGrid");
function ch(e) {
  return typeof e == "string" && [
    "none",
    "core",
    "core+exchange",
    "core+queue",
    "full"
  ].includes(e) ? e : "none";
}
function Nd(e) {
  return e === "core+exchange" || e === "full";
}
function jd(e) {
  return e === "core+queue" || e === "full";
}
function dh(e) {
  return e !== "none";
}
function zd(e) {
  return !e || typeof e != "object" ? null : Fd(e);
}
var bs = class {
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
    return e === "exchange" ? Nd(t) : jd(t);
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
function Hn(e) {
  const t = zd(e);
  return t ? new bs(t) : null;
}
function uh() {
  return new bs({ ...Gr });
}
function fh(e) {
  return e.visible ? e.enabled ? "" : `aria-disabled="true"${e.reason ? ` title="${v(e.reason)}"` : ""}` : 'aria-hidden="true" style="display: none;"';
}
function Gd(e) {
  if (e.enabled || !e.reason) return "";
  const t = (e.reasonCode || "").trim();
  return t ? di(t, {
    size: "sm",
    showFullMessage: !0
  }) : `
    <span class="capability-gate-reason text-gray-500 bg-gray-100"
          role="status"
          aria-label="${v(e.reason)}">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 inline-block mr-1">
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clip-rule="evenodd" />
      </svg>
      ${u(e.reason)}
    </span>
  `.trim();
}
function hh() {
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
function Ud(e, t) {
  if (!t.visible) {
    e.style.display = "none", e.setAttribute("aria-hidden", "true");
    return;
  }
  e.style.display = "", e.removeAttribute("aria-hidden"), t.enabled ? (e.removeAttribute("aria-disabled"), e.classList.remove("capability-gate-disabled"), e.removeAttribute("title"), delete e.dataset.reasonCode, e.removeEventListener("click", Vn, !0)) : (e.setAttribute("aria-disabled", "true"), e.classList.add("capability-gate-disabled"), t.reason && (e.setAttribute("title", t.reason), e.dataset.reasonCode = t.reasonCode || ""), e.addEventListener("click", Vn, !0));
}
function Vn(e) {
  e.currentTarget.getAttribute("aria-disabled") === "true" && (e.preventDefault(), e.stopPropagation());
}
function ph(e, t) {
  e.querySelectorAll("[data-capability-gate]").forEach((r) => {
    const n = r.dataset.capabilityGate;
    if (n)
      try {
        const i = JSON.parse(n);
        Ud(r, t.gateNavItem(i));
      } catch {
        qd.warn("Invalid capability gate config:", n);
      }
  });
}
var Hd = M("DataGrid");
async function Vd(e) {
  return Jn(e);
}
var Kd = {
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
}, Jd = [
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
], Yd = class extends Kn {
  constructor(e) {
    super("loading"), this.container = null, this.gateResult = null, this.data = null, this.error = null, this.activePreset = "all", this.refreshTimer = null, this.config = {
      myWorkEndpoint: e.myWorkEndpoint,
      queueEndpoint: e.queueEndpoint || "",
      panelBaseUrl: e.panelBaseUrl || "",
      capabilityGate: e.capabilityGate,
      filterPresets: e.filterPresets || Jd,
      refreshInterval: e.refreshInterval || 0,
      onAssignmentClick: e.onAssignmentClick,
      onActionClick: e.onActionClick,
      labels: {
        ...Kd,
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
      const e = this.config.filterPresets.find((i) => i.id === this.activePreset), t = new URLSearchParams(e?.filters || {}), r = `${this.config.myWorkEndpoint}${t.toString() ? "?" + t.toString() : ""}`, n = await fetch(r, { headers: { Accept: "application/json" } });
      if (!n.ok) throw new Error(`Failed to load: ${n.status}`);
      this.data = await Vd(n), this.state = this.data.assignments.length === 0 ? "empty" : "loaded", this.error = null;
    } catch (e) {
      this.error = e instanceof Error ? e : new Error(String(e)), this.state = "error";
    }
    this.render();
  }
  render() {
    if (!this.container) return;
    const e = this.config.labels;
    this.container.innerHTML = `
      <div class="translator-dashboard" role="region" aria-label="${u(e.title)}">
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
        <h2 class="dashboard-title">${u(e.title)}</h2>
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
        <div class="summary-label">${u(t)}</div>
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
        <span class="filter-label">${u(e.label)}</span>
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
        <p>${u(e.loading)}</p>
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
        <p class="error-message">${u(e.error)}</p>
        ${this.error ? `<p class="error-detail">${u(this.error.message)}</p>` : ""}
        <button type="button" class="retry-btn">${u(e.retry)}</button>
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
        <p class="empty-title">${u(e.noAssignments)}</p>
        <p class="empty-description">${u(e.noAssignmentsDescription)}</p>
      </div>
    `;
  }
  renderDisabled() {
    const e = this.gateResult?.reason || "Access to this feature is not available.", t = this.gateResult ? Gd(this.gateResult) : "";
    return `
      <div class="dashboard-disabled" role="alert" aria-live="polite">
        <div class="disabled-icon">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-12 h-12 text-gray-400">
            <path fill-rule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clip-rule="evenodd" />
          </svg>
        </div>
        <p class="disabled-title">Translator Dashboard Unavailable</p>
        <p class="disabled-description">${u(e)}</p>
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
              <th scope="col">${u(e.sourceTitle)}</th>
              <th scope="col">${u(e.targetLocale)}</th>
              <th scope="col">${u(e.status)}</th>
              <th scope="col">${u(e.dueDate)}</th>
              <th scope="col">${u(e.priority)}</th>
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
    const t = Wd(e.due_state), r = Xd(e.priority), n = ze(e.queue_state, {
      domain: "queue",
      size: "sm"
    }), i = e.due_date ? Zd(new Date(e.due_date)) : "-";
    return `
      <tr class="assignment-row" data-assignment-id="${v(e.id)}">
        <td class="title-cell">
          <div class="title-content">
            <span class="source-title">${u(e.source_title || e.source_path || e.id)}</span>
            <span class="entity-type">${u(e.entity_type)}</span>
          </div>
        </td>
        <td class="locale-cell">
          <span class="locale-badge">${u(e.target_locale.toUpperCase())}</span>
          <span class="locale-arrow">←</span>
          <span class="locale-badge source">${u(e.source_locale.toUpperCase())}</span>
        </td>
        <td class="status-cell">
          ${n}
        </td>
        <td class="due-cell ${t}">
          ${i}
        </td>
        <td class="priority-cell">
          <span class="priority-indicator ${r}">${u(Qd(e.priority))}</span>
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
      <button type="button" class="action-btn open-btn" data-action="open" title="${v(t.openAssignment)}">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
          <path d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 01-.65-.65z" />
          <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0010 3H4.75A2.75 2.75 0 002 5.75v9.5A2.75 2.75 0 004.75 18h9.5A2.75 2.75 0 0017 15.25V10a.75.75 0 00-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5z" />
        </svg>
      </button>
    `);
    const i = e.review_actions;
    return n && e.queue_state === "in_progress" && i.submit_review.enabled && r.push(`
        <button type="button" class="action-btn submit-review-btn" data-action="submit_review" title="${v(t.submitForReview)}">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd" />
          </svg>
        </button>
      `), n && e.queue_state === "review" && (i.approve.enabled && r.push(`
          <button type="button" class="action-btn approve-btn" data-action="approve" title="${v(t.approve)}">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
              <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" />
            </svg>
          </button>
        `), i.reject.enabled && r.push(`
          <button type="button" class="action-btn reject-btn" data-action="reject" title="${v(t.reject)}">
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
        n.addEventListener("click", async (i) => {
          i.stopPropagation();
          const s = n.dataset.action;
          s && (s === "open" ? this.openAssignment(r) : typeof this.config.onActionClick == "function" && await this.config.onActionClick(s, r));
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
function Wd(e) {
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
function Xd(e) {
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
function Qd(e) {
  return e.charAt(0).toUpperCase() + e.slice(1);
}
function Zd(e) {
  const t = /* @__PURE__ */ new Date(), r = e.getTime() - t.getTime(), n = Math.ceil(r / 864e5);
  return n < 0 ? `${Math.abs(n)}d overdue` : n === 0 ? "Today" : n === 1 ? "Tomorrow" : n <= 7 ? `${n}d` : e.toLocaleDateString(void 0, {
    month: "short",
    day: "numeric"
  });
}
function mh() {
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
function eu(e, t) {
  const r = new Yd(t);
  return r.mount(e), r;
}
function gh(e) {
  return tu(e);
}
function tu(e, t = {}) {
  const r = e.dataset.myWorkEndpoint;
  if (!r)
    return Hd.warn("TranslatorDashboard: Missing data-my-work-endpoint attribute"), null;
  const n = ru(t);
  return eu(e, {
    myWorkEndpoint: r,
    panelBaseUrl: e.dataset.panelBaseUrl,
    queueEndpoint: e.dataset.queueEndpoint,
    refreshInterval: parseInt(e.dataset.refreshInterval || "0", 10),
    capabilityGate: n || void 0
  });
}
function ru(e) {
  if (e.capabilityGate) return e.capabilityGate;
  if (e.capabilitiesPayload !== void 0) return Hn(e.capabilitiesPayload);
  const t = nu();
  return t === null ? null : Hn(t);
}
function nu() {
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
var iu = M("DataGrid");
async function Sr(e) {
  return Jn(e);
}
var su = {
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
}, au = class extends Kn {
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
      ...su,
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
        const n = await U(this.config.validateEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json"
          },
          body: this.rawData
        });
        if (!n.ok) throw new Error(`Validation failed: ${n.status}`);
        const i = await Sr(n);
        return this.handleValidationResult(i), i;
      } else throw new Error("No file or data to validate");
      const t = await U(this.config.validateEndpoint, {
        method: "POST",
        body: e
      });
      if (!t.ok) throw new Error(`Validation failed: ${t.status}`);
      const r = await Sr(t);
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
      }, i = await U(this.config.applyEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify(n)
      });
      if (!i.ok) throw new Error(`Apply failed: ${i.status}`);
      const s = await Sr(i);
      return this.state = "applied", this.config.onApplyComplete?.(s), this.render(), s;
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
      <div class="exchange-import" role="region" aria-label="${u(e.title)}">
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
        <h3 class="import-title">${u(e.title)}</h3>
        ${this.validationResult ? this.renderSummaryBadges() : ""}
      </div>
    `;
  }
  renderSummaryBadges() {
    if (!this.validationResult) return "";
    const e = this.validationResult.summary, t = this.config.labels;
    return `
      <div class="import-summary-badges">
        <span class="summary-badge success">${e.succeeded} ${u(t.success)}</span>
        <span class="summary-badge error">${e.failed} ${u(t.error)}</span>
        <span class="summary-badge conflict">${e.conflicts} ${u(t.conflict)}</span>
        <span class="summary-badge skipped">${e.skipped} ${u(t.skipped)}</span>
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
          <span class="dropzone-text">${u(e.selectFile)}</span>
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
        <p>${u(e)}</p>
      </div>
    `;
  }
  renderPreviewGrid() {
    const e = this.config.labels, t = this.getSelectedIndices().length, r = this.previewRows.length;
    return `
      <div class="import-preview">
        <div class="preview-toolbar">
          <div class="selection-controls">
            <button type="button" class="select-all-btn">${u(e.selectAll)}</button>
            <button type="button" class="deselect-all-btn">${u(e.deselectAll)}</button>
            <span class="selection-count">${t} / ${r} ${u(e.selectedCount)}</span>
          </div>
          <div class="import-options">
            <label class="option-checkbox">
              <input type="checkbox" name="allowCreateMissing" ${this.applyOptions.allowCreateMissing ? "checked" : ""} />
              ${u(e.allowCreateMissing)}
            </label>
            <label class="option-checkbox">
              <input type="checkbox" name="continueOnError" ${this.applyOptions.continueOnError ? "checked" : ""} />
              ${u(e.continueOnError)}
            </label>
            <label class="option-checkbox">
              <input type="checkbox" name="dryRun" ${this.applyOptions.dryRun ? "checked" : ""} />
              ${u(e.dryRun)}
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
                <th scope="col">${u(e.resource)}</th>
                <th scope="col">${u(e.field)}</th>
                <th scope="col">${u(e.status)}</th>
                <th scope="col">${u(e.translatedText)}</th>
                <th scope="col">${u(e.conflictResolution)}</th>
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
    const t = li(e.status, "exchange"), r = e.status === "error", n = ze(e.status, {
      domain: "exchange",
      size: "sm"
    });
    return `
      <tr class="preview-row ${t} ${e.isSelected ? "selected" : ""}" data-index="${e.index}">
        <td class="select-col">
          <input type="checkbox" class="row-checkbox" ${e.isSelected ? "checked" : ""} ${r ? "disabled" : ""} />
        </td>
        <td class="resource-cell">
          <span class="resource-type">${u(e.resource)}</span>
          <span class="entity-id">${u(e.entityId)}</span>
        </td>
        <td class="field-cell">${u(e.fieldPath)}</td>
        <td class="status-cell">
          ${n}
          ${e.error ? `<span class="error-message" title="${v(e.error)}">${u(ou(e.error, 30))}</span>` : ""}
        </td>
        <td class="translation-cell">
          <span class="translation-text" title="${v(e.targetLocale)}">${u(e.targetLocale)}</span>
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
        <option value="skip" ${r === "skip" ? "selected" : ""}>${u(t.skip)}</option>
        <option value="keep_current" ${r === "keep_current" ? "selected" : ""}>${u(t.keepCurrent)}</option>
        <option value="accept_incoming" ${r === "accept_incoming" ? "selected" : ""}>${u(t.acceptIncoming)}</option>
        <option value="force" ${r === "force" ? "selected" : ""}>${u(t.force)}</option>
      </select>
      ${e.conflict ? `<button type="button" class="conflict-details-btn" data-index="${e.index}" title="${v(t.conflictDetails)}">?</button>` : ""}
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
        <p class="error-message">${u(this.error?.message || e.error)}</p>
        <button type="button" class="reset-btn">${u(e.cancelButton)}</button>
      </div>
    `;
  }
  renderFooter() {
    const e = this.config.labels, t = this.state === "validated" && this.getSelectedIndices().length > 0, r = this.getApplyGate();
    return `
      <div class="import-footer">
        <button type="button" class="cancel-btn">${u(e.cancelButton)}</button>
        ${this.state === "idle" ? `
          <button type="button" class="validate-btn" ${!this.file && !this.rawData ? "disabled" : ""}>
            ${u(e.validateButton)}
          </button>
        ` : ""}
        ${this.state === "validated" ? `
          <button type="button"
                  class="apply-btn"
                  ${!t || !r.enabled ? "disabled" : ""}
                  ${r.enabled ? "" : `aria-disabled="true" title="${v(r.reason || e.applyDisabledReason)}"`}>
            ${u(e.applyButton)}
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
function ou(e, t) {
  return e.length <= t ? e : e.slice(0, t - 3) + "...";
}
function bh() {
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
function lu(e, t) {
  const r = new au(t);
  return r.mount(e), r;
}
function yh(e) {
  const t = e.dataset.validateEndpoint, r = e.dataset.applyEndpoint;
  return !t || !r ? (iu.warn("ExchangeImport: Missing required data attributes"), null) : lu(e, {
    validateEndpoint: t,
    applyEndpoint: r
  });
}
var cu = {
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
}, du = 2e3, uu = 300, fu = "async_job_", ys = class {
  constructor(e = {}) {
    this.container = null, this.job = null, this.pollingState = "idle", this.pollTimer = null, this.pollAttempts = 0, this.startTime = null, this.error = null;
    const t = {
      ...cu,
      ...e.labels || {}
    };
    this.config = {
      storageKeyPrefix: e.storageKeyPrefix || fu,
      pollInterval: e.pollInterval || du,
      maxPollAttempts: e.maxPollAttempts || uu,
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
      <div class="async-progress" role="region" aria-label="${u(e.title)}">
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
          <h4 class="progress-title">${u(e.title)}</h4>
          <span class="progress-status">${u(e.noActiveJob)}</span>
        </div>
      `;
    const t = li(this.job.status, "exchange"), r = this.getStatusLabel(), n = this.pollingState === "paused" ? `<span class="progress-status ${t}">${u(r)}</span>` : ze(this.job.status, {
      domain: "exchange",
      size: "sm"
    });
    return `
      <div class="progress-header ${t}">
        <h4 class="progress-title">${u(e.title)}</h4>
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
            <span class="counter-label">${u(e.processed)}:</span>
            <span class="counter-value">${t.processed}${t.total ? ` / ${t.total}` : ""}</span>
          </span>
          <span class="counter succeeded">
            <span class="counter-label">${u(e.succeeded)}:</span>
            <span class="counter-value">${t.succeeded}</span>
          </span>
          <span class="counter failed">
            <span class="counter-label">${u(e.failedCount)}:</span>
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
          <span class="info-label">${u(e.jobId)}:</span>
          <code class="info-value">${u(this.job.id)}</code>
        </span>
        ${t ? `
          <span class="info-item">
            <span class="info-label">${u(e.elapsed)}:</span>
            <span class="info-value">${u(t)}</span>
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
          <span class="conflicts-label">${u(e.conflicts)}:</span>
          <span class="conflicts-count">${t.total}</span>
        </span>
        <div class="conflicts-by-type">
          ${Object.entries(t.by_type).map(([r, n]) => `
              <span class="conflict-type">
                <span class="type-name">${u(r)}:</span>
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
        <span class="error-message">${u(e)}</span>
      </div>
    ` : "";
  }
  renderFooter() {
    const e = this.config.labels, t = [];
    return this.pollingState === "paused" && t.push(`<button type="button" class="resume-btn">${u(e.resume)}</button>`), this.pollingState === "polling" && t.push(`<button type="button" class="cancel-btn">${u(e.cancel)}</button>`), (this.error || this.job?.status === "failed") && t.push(`<button type="button" class="retry-btn">${u(e.retry)}</button>`), (this.job?.status === "completed" || this.job?.status === "failed") && t.push(`<button type="button" class="dismiss-btn">${u(e.dismiss)}</button>`), t.length === 0 ? "" : `
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
function vh() {
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
function hu(e, t) {
  const r = new ys(t);
  return r.mount(e), r;
}
function wh(e) {
  return hu(e, {
    pollInterval: e.dataset.pollInterval ? parseInt(e.dataset.pollInterval, 10) : void 0,
    autoStart: e.dataset.autoStart !== "false"
  });
}
function xh(e, t) {
  const r = new ys(t);
  return r.hasPersistedJob(e) ? r : null;
}
var pu = M("DataGrid"), Cr = {
  sourceColumn: "Source",
  targetColumn: "Translation",
  driftBannerTitle: "Source content has changed",
  driftBannerDescription: "The source content has been updated since this translation was last edited.",
  driftAcknowledgeButton: "Acknowledge",
  driftViewChangesButton: "View Changes",
  copySourceButton: "Copy from source",
  fieldChangedIndicator: "Source changed"
};
function mu(e) {
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
    n && typeof n == "object" && (t.changedFieldsSummary.count = typeof n.count == "number" ? n.count : 0, t.changedFieldsSummary.fields = Array.isArray(n.fields) ? n.fields.filter((i) => typeof i == "string") : []), t.hasDrift = t.changedFieldsSummary.count > 0 || t.changedFieldsSummary.fields.length > 0;
  }
  return t;
}
function gu(e, t) {
  return !e || !e.hasDrift ? !1 : e.changedFieldsSummary.fields.some((r) => r.toLowerCase() === t.toLowerCase());
}
function Sh(e) {
  return !e || !e.hasDrift ? [] : [...e.changedFieldsSummary.fields];
}
var bu = class {
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
        ...Cr,
        ...e.labels
      }
    }, this.container = t;
  }
  render() {
    if (!this.container) {
      pu.warn("[SideBySideEditor] Container not found");
      return;
    }
    this.container.innerHTML = this.buildHTML(), this.attachEventListeners();
  }
  buildHTML() {
    const { drift: e, labels: t, sourceLocale: r, targetLocale: n, fields: i } = this.config, s = this.shouldShowDriftBanner() ? this.renderDriftBanner(e, t) : "", a = i.map((o) => this.renderFieldRow(o, t)).join("");
    return `
      <div class="side-by-side-editor" data-source-locale="${r}" data-target-locale="${n}">
        ${s}
        <div class="sbs-columns">
          <div class="sbs-header">
            <div class="sbs-column-header sbs-source-header">
              <span class="sbs-column-title">${u(t.sourceColumn)}</span>
              <span class="sbs-locale-badge">${r.toUpperCase()}</span>
            </div>
            <div class="sbs-column-header sbs-target-header">
              <span class="sbs-column-title">${u(t.targetColumn)}</span>
              <span class="sbs-locale-badge">${n.toUpperCase()}</span>
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
      ...Cr,
      ...t
    }, n = e.changedFieldsSummary.count, i = e.changedFieldsSummary.fields, s = i.length > 0 ? `<ul class="sbs-drift-fields-list">${i.map((a) => `<li>${u(a)}</li>`).join("")}</ul>` : "";
    return `
      <div class="sbs-drift-banner" role="alert" aria-live="polite" data-drift-banner="true">
        <div class="sbs-drift-icon">
          <svg class="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
          </svg>
        </div>
        <div class="sbs-drift-content">
          <h3 class="sbs-drift-title">${u(r.driftBannerTitle)}</h3>
          <p class="sbs-drift-description">
            ${u(r.driftBannerDescription)}
            ${n > 0 ? `<span class="sbs-drift-count">${n} field${n !== 1 ? "s" : ""} changed.</span>` : ""}
          </p>
          ${s}
        </div>
        <div class="sbs-drift-actions">
          <button type="button" class="sbs-drift-acknowledge" data-action="acknowledge-drift">
            ${u(r.driftAcknowledgeButton)}
          </button>
        </div>
      </div>
    `;
  }
  renderFieldRow(e, t) {
    const r = {
      ...Cr,
      ...t
    }, n = e.hasSourceChanged ? `<span class="sbs-field-changed" title="${u(r.fieldChangedIndicator)}">
          <svg class="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clip-rule="evenodd" />
          </svg>
        </span>` : "", i = this.renderSourceField(e), s = this.renderTargetField(e), a = `
      <button type="button"
              class="sbs-copy-source"
              data-action="copy-source"
              data-field="${v(e.key)}"
              title="${v(r.copySourceButton)}"
              aria-label="${v(r.copySourceButton)} for ${v(e.label)}">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
        </svg>
      </button>
    `;
    return `
      <div class="${e.hasSourceChanged ? "sbs-field-row sbs-field-changed-row" : "sbs-field-row"}" data-field-key="${v(e.key)}">
        <div class="sbs-field-header">
          <label class="sbs-field-label">
            ${u(e.label)}
            ${e.required ? '<span class="sbs-required">*</span>' : ""}
          </label>
          ${n}
        </div>
        <div class="sbs-field-content">
          <div class="sbs-source-field">
            ${i}
          </div>
          <div class="sbs-field-actions">
            ${a}
          </div>
          <div class="sbs-target-field">
            ${s}
          </div>
        </div>
      </div>
    `;
  }
  renderSourceField(e) {
    const t = u(e.sourceValue || "");
    return e.type === "textarea" || e.type === "richtext" || e.type === "html" ? `
        <div class="sbs-source-content sbs-textarea-field"
             data-field="${v(e.key)}"
             aria-label="Source: ${v(e.label)}">
          ${t || '<span class="sbs-empty">Empty</span>'}
        </div>
      ` : `
      <div class="sbs-source-content sbs-text-field"
           data-field="${v(e.key)}"
           aria-label="Source: ${v(e.label)}">
        ${t || '<span class="sbs-empty">Empty</span>'}
      </div>
    `;
  }
  renderTargetField(e) {
    const t = u(e.targetValue || ""), r = e.placeholder ? `placeholder="${v(e.placeholder)}"` : "", n = e.required ? "required" : "", i = e.maxLength ? `maxlength="${e.maxLength}"` : "";
    return e.type === "textarea" || e.type === "richtext" || e.type === "html" ? `
        <textarea class="sbs-target-input sbs-textarea-input"
                  name="${v(e.key)}"
                  data-field="${v(e.key)}"
                  aria-label="Translation: ${v(e.label)}"
                  ${r}
                  ${n}
                  ${i}>${t}</textarea>
      ` : `
      <input type="text"
             class="sbs-target-input sbs-text-input"
             name="${v(e.key)}"
             data-field="${v(e.key)}"
             value="${t}"
             aria-label="Translation: ${v(e.label)}"
             ${r}
             ${n}
             ${i}>
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
        const n = r.target, i = n.dataset.field;
        i && this.config.onChange && this.config.onChange(i, n.value);
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
function yu(e) {
  const t = new bu(e);
  return t.render(), t;
}
function Ch(e, t, r, n, i) {
  const s = mu(t);
  return yu({
    container: e,
    fields: n.map((a) => ({
      key: a,
      label: a.replace(/_/g, " ").replace(/\b\w/g, (o) => o.toUpperCase()),
      type: "text",
      hasSourceChanged: gu(s, a),
      sourceValue: String(r[a] || ""),
      targetValue: String(t[a] || ""),
      sourceLocale: i.sourceLocale || "en",
      targetLocale: i.targetLocale || ""
    })),
    drift: s,
    sourceLocale: i.sourceLocale || "en",
    targetLocale: i.targetLocale || "",
    panelName: i.panelName || "",
    recordId: i.recordId || "",
    ...i
  });
}
function Eh() {
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
  Gs as ActionRenderer,
  gf as AdvancedSearch,
  ys as AsyncProgress,
  hs as AutosaveIndicator,
  Ar as CORE_READINESS_DISPLAY,
  bs as CapabilityGate,
  ka as CellRendererRegistry,
  Pd as CharacterCounter,
  ql as ColumnManager,
  lf as CommonRenderers,
  Jd as DEFAULT_FILTER_PRESETS,
  gs as DEFAULT_INTERPOLATION_PATTERNS,
  Rd as DEFAULT_SAMPLE_VALUES,
  Cr as DEFAULT_SIDE_BY_SIDE_LABELS,
  ad as DEFAULT_STATUS_LEGEND_ITEMS,
  as as DEFAULT_TRANSLATION_QUICK_FILTERS,
  pt as DISABLED_REASON_DISPLAY,
  Zi as DataGrid,
  Kc as DefaultColumnVisibilityBehavior,
  rd as DetailActionsController,
  Id as DirectionToggle,
  Dr as EXCHANGE_JOB_STATUS_DISPLAY,
  Lr as EXCHANGE_ROW_STATUS_DISPLAY,
  au as ExchangeImport,
  mn as FallbackBanner,
  bf as FilterBuilder,
  Cf as GoCrudBulkActionBehavior,
  Sf as GoCrudExportBehavior,
  vf as GoCrudFilterBehavior,
  wf as GoCrudPaginationBehavior,
  yf as GoCrudSearchBehavior,
  xf as GoCrudSortBehavior,
  ls as InlineLocaleChips,
  Md as InterpolationPreview,
  ds as KeyboardShortcutRegistry,
  gi as LocalDataGridStateStore,
  Zt as LocaleActionChip,
  ei as PayloadInputModal,
  Ba as PreferencesDataGridStateStore,
  kr as QUEUE_CONTENT_STATE_DISPLAY,
  _r as QUEUE_DUE_STATE_DISPLAY,
  $r as QUEUE_STATE_DISPLAY,
  ld as QuickFilters,
  ns as SchemaActionBuilder,
  Ef as ServerColumnVisibilityBehavior,
  bu as SideBySideEditor,
  ss as StatusLegend,
  id as TranslationBlockerModal,
  dd as TranslationPanel,
  Yd as TranslatorDashboard,
  md as applyFormLock,
  Ud as applyGateToElement,
  $d as applyShortcutSettings,
  Gn as buildLocaleEditUrl,
  Af as buildSchemaRowActions,
  xh as checkForPersistedJob,
  ff as collapseAllGroups,
  hu as createAsyncProgress,
  Bf as createBulkCreateMissingHandler,
  Hn as createCapabilityGate,
  Oa as createDataGridStateStore,
  uh as createEmptyCapabilityGate,
  lu as createExchangeImport,
  Kf as createInlineLocaleChipsRenderer,
  ma as createLocaleBadgeRenderer,
  ju as createReasonCodeCellRenderer,
  yu as createSideBySideEditor,
  Nu as createStatusCellRenderer,
  od as createStatusLegend,
  Zf as createTranslationAutosave,
  af as createTranslationMatrixRenderer,
  Pf as createTranslationPanel,
  cd as createTranslationQuickFilters,
  xd as createTranslationShortcuts,
  wn as createTranslationStatusRenderer,
  eu as createTranslatorDashboard,
  Za as decodeExpandedGroupsToken,
  oh as detectInterpolations,
  Ed as dismissShortcutHint,
  mf as encodeExpandedGroupsToken,
  ud as executeBulkCreateMissing,
  uf as expandAllGroups,
  Ka as extractBackendSummaries,
  zd as extractCapabilities,
  Au as extractExchangeError,
  $f as extractSchemaActions,
  mu as extractSourceTargetDrift,
  be as extractTranslationContext,
  ee as extractTranslationReadiness,
  qe as formatPaginationNumber,
  cs as formatShortcutDisplay,
  $u as generateExchangeReport,
  oi as getActionBlockDisplay,
  Ou as getAllReasonCodes,
  vh as getAsyncProgressStyles,
  th as getAutosaveIndicatorStyles,
  hh as getCapabilityGateStyles,
  Sh as getChangedFields,
  lh as getCharCountSeverity,
  Xf as getDefaultShortcutRegistry,
  tn as getDisabledReasonDisplay,
  bh as getExchangeImportStyles,
  hf as getExpandedGroupIds,
  ah as getFieldHelperStyles,
  Nf as getFormLockReason,
  le as getLocaleLabel,
  sf as getMissingTranslationsCount,
  vd as getModifierSymbol,
  Ja as getPersistedExpandState,
  Qa as getPersistedViewMode,
  yd as getPrimaryModifierLabel,
  Fu as getSeverityCssClass,
  Eh as getSideBySideEditorStyles,
  li as getStatusCssClass,
  je as getStatusDisplay,
  Gu as getStatusVocabularyStyles,
  Bu as getStatusesForDomain,
  mh as getTranslatorDashboardStyles,
  an as getViewModeForViewport,
  ku as groupRowResultsByStatus,
  ll as handleDelete,
  bi as hasBackendGroupedRows,
  gu as hasFieldDrift,
  nf as hasMissingTranslations,
  Hu as hasTranslationContext,
  Wu as hasTranslationReadiness,
  wh as initAsyncProgress,
  ph as initCapabilityGating,
  yh as initExchangeImport,
  Gf as initFallbackBanner,
  nh as initFieldHelpers,
  rh as initFormAutosave,
  Uf as initFormLock,
  Vf as initInlineLocaleChips,
  kd as initKeyboardShortcuts,
  Qf as initKeyboardShortcutsWithDiscovery,
  Ff as initLocaleActionChips,
  kf as initPanelDetailActions,
  Tf as initQuickFilters,
  Ch as initSideBySideEditorFromRecord,
  Lf as initStatusLegends,
  gh as initTranslatorDashboard,
  tu as initTranslatorDashboardWithOptions,
  zu as initializeVocabularyFromPayload,
  dh as isCoreEnabled,
  Nd as isExchangeEnabled,
  _u as isExchangeError,
  qf as isFormLocked,
  Uu as isInFallbackMode,
  er as isMacPlatform,
  oo as isNarrowViewport,
  jd as isQueueEnabled,
  Xu as isReadyForTransition,
  Cd as isShortcutHintDismissed,
  Iu as isValidReasonCode,
  Mu as isValidStatus,
  Sd as loadShortcutSettings,
  Va as mergeBackendSummaries,
  Qr as normalizeActionBlockCode,
  ta as normalizeActionState,
  Zr as normalizeActionStateMap,
  ra as normalizeActionStateMeta,
  ii as normalizeActionStateRecord,
  qa as normalizeBackendGroupedRows,
  en as normalizeBulkActionStateConfig,
  Kt as normalizeBulkActionStateMap,
  na as normalizeBulkActionStateResponse,
  si as normalizeDetailActionStatePayload,
  ia as normalizeListActionStatePayload,
  Mi as paginationWindow,
  ch as parseCapabilityMode,
  Lu as parseImportResult,
  ki as parseViewMode,
  cf as persistExpandState,
  pf as persistViewMode,
  gd as removeFormLock,
  eh as renderAutosaveIndicator,
  da as renderAvailableLocalesIndicator,
  If as renderBulkResultInline,
  Mf as renderBulkResultSummary,
  ih as renderCharacterCounter,
  td as renderDetailActions,
  sh as renderDirectionToggle,
  Gd as renderDisabledReasonBadge,
  Ad as renderDiscoveryHint,
  jf as renderFallbackBannerFromRecord,
  of as renderFallbackWarning,
  fh as renderGateAriaAttributes,
  no as renderGroupHeaderRow,
  eo as renderGroupHeaderSummary,
  io as renderGroupedEmptyState,
  ao as renderGroupedErrorState,
  so as renderGroupedLoadingState,
  bd as renderInlineLocaleChips,
  os as renderLocaleActionChip,
  Of as renderLocaleActionList,
  hi as renderLocaleBadge,
  tf as renderLocaleCompleteness,
  rf as renderMissingTranslationsBadge,
  dl as renderPaginationButtons,
  ef as renderPublishReadinessBadge,
  Rf as renderQuickFiltersHTML,
  Zu as renderReadinessIndicator,
  di as renderReasonCodeBadge,
  qu as renderReasonCodeIndicator,
  Wf as renderShortcutSettingsUI,
  Jf as renderShortcutsHelpContent,
  Qu as renderStatusBadge,
  Df as renderStatusLegendHTML,
  Ju as renderTranslationAssignmentSummary,
  Yu as renderTranslationExchangeSummary,
  Vu as renderTranslationFamilyLink,
  Ku as renderTranslationFamilyMemberCount,
  ha as renderTranslationMatrixCell,
  ua as renderTranslationStatusCell,
  ze as renderVocabularyStatusBadge,
  ci as renderVocabularyStatusIcon,
  ai as resolveActionState,
  Yf as saveShortcutSettings,
  zf as shouldShowFallbackBanner,
  Hf as shouldShowInlineLocaleChips,
  _f as showTranslationBlocker,
  df as toggleGroupExpand,
  Fa as transformToGroups
};

//# sourceMappingURL=datatable.js.map