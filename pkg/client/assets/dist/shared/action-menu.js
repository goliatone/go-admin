var P = "[data-action-menu], [data-dropdown]", U = "[data-action-menu-trigger], [data-dropdown-trigger]", _ = "[data-action-menu-content], .actions-menu", Z = '[role="menuitem"], [data-action-menu-item], .action-item', q = "hidden", C = /* @__PURE__ */ new Set(), w = /* @__PURE__ */ new WeakMap(), k = /* @__PURE__ */ new WeakMap(), I = /* @__PURE__ */ new WeakMap(), tt = [
  "position",
  "right",
  "bottom",
  "margin",
  "min-width",
  "max-width",
  "max-height",
  "left",
  "top"
], et = [
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
], nt = [
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
function rt(e) {
  const t = e.target;
  return t && typeof t.closest == "function" ? t : null;
}
function A(e, t) {
  return "contains" in e && typeof e.contains == "function" ? e.contains(t) : !1;
}
function ot(e, t) {
  const i = /* @__PURE__ */ new Map();
  return t.forEach((r) => {
    i.set(r, {
      value: e.style.getPropertyValue(r),
      priority: e.style.getPropertyPriority(r)
    });
  }), i;
}
function it(e, t) {
  t.forEach(({ value: i, priority: r }, n) => {
    if (i) {
      e.style.setProperty(n, i, r);
      return;
    }
    e.style.removeProperty(n);
  });
}
function z(e) {
  const t = I.get(e);
  t && (I.delete(e), it(e, t));
}
function st(e) {
  const t = /* @__PURE__ */ new Map(), i = e.ownerDocument.defaultView;
  if (!i) return t;
  const r = i.getComputedStyle(e), n = new Set(et);
  for (let s = 0; s < r.length; s += 1) {
    const c = r.item(s);
    c.startsWith("--") && n.add(c);
  }
  return n.forEach((s) => {
    const c = r.getPropertyValue(s).trim();
    c && t.set(s, c);
  }), nt.forEach((s) => {
    const c = r.getPropertyValue(s).trim();
    c && t.set(s, c);
  }), t;
}
function ct(e, t) {
  t.forEach((i, r) => {
    e.style.setProperty(r, i);
  });
}
function at(e, t = {}) {
  const i = t.containerSelector || P, r = t.menuSelector || _, n = e.closest(i), s = k.get(e) ?? n?.querySelector(r) ?? null;
  return !n || !s ? null : {
    container: n,
    trigger: e,
    menu: s
  };
}
function lt(e, t) {
  const { container: i, trigger: r, menu: n } = e;
  if (w.has(n)) return;
  const s = n.ownerDocument, c = n.parentNode;
  if (!s.body || !c) return;
  const m = st(n);
  w.set(n, {
    container: i,
    trigger: r,
    root: t,
    parent: c,
    nextSibling: n.nextSibling,
    inlineStyle: n.getAttribute("style")
  }), C.add(n), k.set(r, n), s.body.appendChild(n), ct(n, m);
}
function dt(e) {
  const t = w.get(e);
  if (t) {
    if (C.delete(e), w.delete(e), k.delete(t.trigger), t.inlineStyle === null ? e.removeAttribute("style") : e.setAttribute("style", t.inlineStyle), !t.parent.isConnected) {
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
function T(e, t = {}) {
  const i = t.hiddenClass || q;
  e.classList.add(i);
  const r = w.get(e), n = r?.container ?? e.closest(t.containerSelector || P);
  (r?.trigger ?? n?.querySelector(t.triggerSelector || U))?.setAttribute("aria-expanded", "false"), z(e), dt(e);
}
function ut(e = document, t = {}) {
  const i = t.menuSelector || _, r = new Set(Array.from(e.querySelectorAll(i)));
  C.forEach((n) => {
    const s = w.get(n);
    s && (s.root === e || A(e, s.trigger)) && r.add(n);
  }), r.forEach((n) => {
    T(n, t);
  });
}
function gt(e) {
  return e.getAttribute("aria-disabled") === "true" || e.dataset.disabled === "true";
}
function N(e, t) {
  return Array.from(e.querySelectorAll(t)).filter((i) => !i.hasAttribute("disabled") && !i.hidden && i.getAttribute("aria-hidden") !== "true");
}
function R(e) {
  if (e)
    try {
      e.focus({ preventScroll: !0 });
    } catch {
      e.focus();
    }
}
function F(e, t, i) {
  const r = new Set(Array.from(e.querySelectorAll(t)));
  return C.forEach((n) => {
    const s = w.get(n);
    s && (s.root === e || A(e, s.trigger)) && r.add(n);
  }), Array.from(r).find((n) => !n.classList.contains(i)) ?? null;
}
function ht({ trigger: e, menu: t }) {
  z(t), I.set(t, ot(t, tt));
  const i = e.getBoundingClientRect(), r = e.ownerDocument.defaultView ?? window, n = r.visualViewport, s = n?.offsetLeft ?? 0, c = n?.offsetTop ?? 0, m = n?.width ?? r.innerWidth, h = n?.height ?? r.innerHeight, E = 10, v = 8, x = Math.max(0, m - 20), b = Math.max(0, h - 20), f = r.getComputedStyle(t), o = (Q, X) => {
    const B = Number.parseFloat(Q);
    return Number.isFinite(B) ? B : X;
  }, d = o(f.minWidth, 192), u = o(f.maxWidth, x), y = o(f.maxHeight, b), g = Math.min(u, x), a = s + m, l = c + h, S = Math.max(0, l - E - i.bottom - v), M = Math.max(0, i.top - c - E - v), L = Math.min(t.scrollHeight || t.offsetHeight || Math.min(300, b), y, b), p = L > S && M > S, W = Math.min(y, b, p ? M : S);
  t.style.position = "fixed", t.style.right = "auto", t.style.bottom = "auto", t.style.margin = "0", t.style.minWidth = `${Math.min(d, g)}px`, t.style.maxWidth = `${g}px`, t.style.maxHeight = `${W}px`;
  const D = Math.min(t.offsetWidth || 224, x), H = Math.min(t.offsetHeight || L, W), $ = i.right - D, O = s + E, G = Math.max(O, a - D - E), K = Math.min(Math.max(O, $), G), Y = p ? i.top - H - v : i.bottom + v, V = c + E, j = Math.max(V, l - H - E), J = Math.min(Math.max(V, Y), j);
  t.style.left = `${K}px`, t.style.top = `${J}px`;
}
function ft(e = document, t = {}) {
  const i = t.triggerSelector || U, r = t.itemSelector || Z, n = t.hiddenClass || q, s = t.menuSelector || _, c = t.positionMenu, m = e.nodeType === 9 ? e : e.ownerDocument || document, h = [], E = /* @__PURE__ */ new WeakMap(), v = {
    closeAll: () => ut(e, t),
    destroy: () => {
      for (v.closeAll(); h.length > 0; ) h.pop()?.();
    }
  };
  e.querySelectorAll(s).forEach((o) => {
    o.classList.contains(n) || o.classList.add(n);
  });
  const x = (o) => {
    const d = rt(o);
    if (!d) return;
    const u = d.closest(i);
    if (u && A(e, u)) {
      const p = at(u, t);
      if (!p) return;
      if (o.stopPropagation(), !p.menu.classList.contains(n)) {
        T(p.menu, t);
        return;
      }
      v.closeAll(), t.portal && lt(p, e), p.menu.classList.remove(n), p.trigger.setAttribute("aria-expanded", "true"), c && c({
        ...p,
        opening: !0
      }), R(N(p.menu, r)[0]), E.set(p.menu, {
        trigger: p.trigger,
        rect: p.trigger.getBoundingClientRect()
      });
      return;
    }
    const y = d.closest(r), g = y?.closest(s) ?? null, a = g ? w.get(g) : void 0, l = !!(g && (A(e, g) || a?.root === e));
    if (y && l) {
      if (gt(y)) {
        o.preventDefault(), o.stopPropagation();
        return;
      }
      T(g, t);
      return;
    }
    const S = t.outsideIgnoreSelector;
    if (S && d.closest(S)) return;
    const M = d.closest(s), L = M ? w.get(M) : void 0;
    M && (A(e, M) || L?.root === e) || v.closeAll();
  }, b = (o) => {
    const d = F(e, s, n);
    if (!d) return;
    const u = N(d, r), y = m.activeElement, g = y ? u.indexOf(y) : -1;
    if (o.key === "Escape") {
      const l = w.get(d)?.trigger ?? d.closest(t.containerSelector || P)?.querySelector(i) ?? null;
      o.preventDefault(), o.stopPropagation(), T(d, t), l?.isConnected && R(l);
      return;
    }
    let a = null;
    o.key === "ArrowDown" ? a = g < 0 ? 0 : (g + 1) % u.length : o.key === "ArrowUp" ? a = g < 0 ? u.length - 1 : (g - 1 + u.length) % u.length : o.key === "Home" ? a = 0 : o.key === "End" && (a = u.length - 1), a !== null && u.length > 0 && (o.preventDefault(), o.stopPropagation(), R(u[a]));
  };
  m.addEventListener("click", x), m.addEventListener("keydown", b), h.push(() => m.removeEventListener("click", x)), h.push(() => m.removeEventListener("keydown", b));
  const f = m.defaultView;
  if (f && (t.portal || c)) {
    const o = () => v.closeAll(), d = (u) => {
      const y = u.target;
      if (y && typeof y.closest == "function") {
        const l = y.closest(s), S = l ? w.get(l) : void 0;
        if (l && (A(e, l) || S?.root === e)) return;
      }
      const g = F(e, s, n), a = g ? E.get(g) : void 0;
      if (a?.trigger.isConnected) {
        const l = a.trigger.getBoundingClientRect();
        if (l.x === a.rect.x && l.y === a.rect.y && l.width === a.rect.width && l.height === a.rect.height) return;
      }
      v.closeAll();
    };
    f.addEventListener("pagehide", o), f.addEventListener("pageshow", o), f.addEventListener("resize", o), f.visualViewport?.addEventListener("resize", o), f.visualViewport?.addEventListener("scroll", o), m.addEventListener("scroll", d, !0), h.push(() => f.removeEventListener("pagehide", o)), h.push(() => f.removeEventListener("pageshow", o)), h.push(() => f.removeEventListener("resize", o)), h.push(() => f.visualViewport?.removeEventListener("resize", o)), h.push(() => f.visualViewport?.removeEventListener("scroll", o)), h.push(() => m.removeEventListener("scroll", d, !0));
  }
  if (t.signal) {
    const o = () => v.destroy();
    t.signal.addEventListener("abort", o, { once: !0 }), h.push(() => t.signal?.removeEventListener("abort", o));
  }
  return v;
}
function pt(e, t = {}) {
  return ft(e, {
    ...t,
    containerSelector: t.containerSelector || P
  });
}
export {
  T as closeActionMenu,
  ut as closeActionMenus,
  ht as defaultActionMenuPositioner,
  at as findActionMenuElements,
  ft as initActionMenus,
  pt as initActionMenusForElement,
  gt as isActionMenuItemDisabled
};

//# sourceMappingURL=action-menu.js.map