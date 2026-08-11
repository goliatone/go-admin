var T = "[data-action-menu], [data-dropdown]", B = "[data-action-menu-trigger], [data-dropdown-trigger]", I = "[data-action-menu-content], .actions-menu", X = '[role="menuitem"], [data-action-menu-item], .action-item', U = "hidden", P = /* @__PURE__ */ new Set(), v = /* @__PURE__ */ new WeakMap(), _ = /* @__PURE__ */ new WeakMap(), R = /* @__PURE__ */ new WeakMap(), Z = [
  "position",
  "right",
  "bottom",
  "margin",
  "min-width",
  "max-width",
  "max-height",
  "left",
  "top"
], tt = [
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
], et = [
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
function nt(e) {
  const t = e.target;
  return t && typeof t.closest == "function" ? t : null;
}
function M(e, t) {
  return "contains" in e && typeof e.contains == "function" ? e.contains(t) : !1;
}
function ot(e, t) {
  const i = /* @__PURE__ */ new Map();
  return t.forEach((o) => {
    i.set(o, {
      value: e.style.getPropertyValue(o),
      priority: e.style.getPropertyPriority(o)
    });
  }), i;
}
function rt(e, t) {
  t.forEach(({ value: i, priority: o }, n) => {
    if (i) {
      e.style.setProperty(n, i, o);
      return;
    }
    e.style.removeProperty(n);
  });
}
function q(e) {
  const t = R.get(e);
  t && (R.delete(e), rt(e, t));
}
function it(e) {
  const t = /* @__PURE__ */ new Map(), i = e.ownerDocument.defaultView;
  if (!i) return t;
  const o = i.getComputedStyle(e), n = new Set(tt);
  for (let s = 0; s < o.length; s += 1) {
    const a = o.item(s);
    a.startsWith("--") && n.add(a);
  }
  return n.forEach((s) => {
    const a = o.getPropertyValue(s).trim();
    a && t.set(s, a);
  }), et.forEach((s) => {
    const a = o.getPropertyValue(s).trim();
    a && t.set(s, a);
  }), t;
}
function st(e, t) {
  t.forEach((i, o) => {
    e.style.setProperty(o, i);
  });
}
function at(e, t = {}) {
  const i = t.containerSelector || T, o = t.menuSelector || I, n = e.closest(i), s = _.get(e) ?? n?.querySelector(o) ?? null;
  return !n || !s ? null : {
    container: n,
    trigger: e,
    menu: s
  };
}
function ct(e, t) {
  const { container: i, trigger: o, menu: n } = e;
  if (v.has(n)) return;
  const s = n.ownerDocument, a = n.parentNode;
  if (!s.body || !a) return;
  const g = it(n);
  v.set(n, {
    container: i,
    trigger: o,
    root: t,
    parent: a,
    nextSibling: n.nextSibling,
    inlineStyle: n.getAttribute("style")
  }), P.add(n), _.set(o, n), s.body.appendChild(n), st(n, g);
}
function lt(e) {
  const t = v.get(e);
  if (t) {
    if (P.delete(e), v.delete(e), _.delete(t.trigger), t.inlineStyle === null ? e.removeAttribute("style") : e.setAttribute("style", t.inlineStyle), !t.parent.isConnected) {
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
function L(e, t = {}) {
  const i = t.hiddenClass || U;
  e.classList.add(i);
  const o = v.get(e), n = o?.container ?? e.closest(t.containerSelector || T);
  (o?.trigger ?? n?.querySelector(t.triggerSelector || B))?.setAttribute("aria-expanded", "false"), q(e), lt(e);
}
function dt(e = document, t = {}) {
  const i = t.menuSelector || I, o = new Set(Array.from(e.querySelectorAll(i)));
  P.forEach((n) => {
    const s = v.get(n);
    s && (s.root === e || M(e, s.trigger)) && o.add(n);
  }), o.forEach((n) => {
    L(n, t);
  });
}
function ut(e) {
  return e.getAttribute("aria-disabled") === "true" || e.dataset.disabled === "true";
}
function F(e, t) {
  return Array.from(e.querySelectorAll(t)).filter((i) => !i.hasAttribute("disabled") && !i.hidden && i.getAttribute("aria-hidden") !== "true");
}
function C(e) {
  if (e)
    try {
      e.focus({ preventScroll: !0 });
    } catch {
      e.focus();
    }
}
function ft(e, t, i) {
  const o = new Set(Array.from(e.querySelectorAll(t)));
  return P.forEach((n) => {
    const s = v.get(n);
    s && (s.root === e || M(e, s.trigger)) && o.add(n);
  }), Array.from(o).find((n) => !n.classList.contains(i)) ?? null;
}
function gt({ trigger: e, menu: t }) {
  q(t), R.set(t, ot(t, Z));
  const i = e.getBoundingClientRect(), o = e.ownerDocument.defaultView ?? window, n = o.visualViewport, s = n?.offsetLeft ?? 0, a = n?.offsetTop ?? 0, g = n?.width ?? o.innerWidth, f = n?.height ?? o.innerHeight, h = 10, S = 8, w = Math.max(0, g - 20), d = Math.max(0, f - 20), r = o.getComputedStyle(t), c = (J, Q) => {
    const N = Number.parseFloat(J);
    return Number.isFinite(N) ? N : Q;
  }, u = c(r.minWidth, 192), m = c(r.maxWidth, w), l = c(r.maxHeight, d), p = Math.min(m, w), b = s + g, A = a + f, E = Math.max(0, A - h - i.bottom - S), x = Math.max(0, i.top - a - h - S), y = Math.min(t.scrollHeight || t.offsetHeight || Math.min(300, d), l, d), k = y > E && x > E, D = Math.min(l, d, k ? x : E);
  t.style.position = "fixed", t.style.right = "auto", t.style.bottom = "auto", t.style.margin = "0", t.style.minWidth = `${Math.min(u, p)}px`, t.style.maxWidth = `${p}px`, t.style.maxHeight = `${D}px`;
  const H = Math.min(t.offsetWidth || 224, w), O = Math.min(t.offsetHeight || y, D), z = i.right - H, W = s + h, $ = Math.max(W, b - H - h), G = Math.min(Math.max(W, z), $), K = k ? i.top - O - S : i.bottom + S, V = a + h, Y = Math.max(V, A - O - h), j = Math.min(Math.max(V, K), Y);
  t.style.left = `${G}px`, t.style.top = `${j}px`;
}
function ht(e = document, t = {}) {
  const i = t.triggerSelector || B, o = t.itemSelector || X, n = t.hiddenClass || U, s = t.menuSelector || I, a = t.positionMenu, g = e.nodeType === 9 ? e : e.ownerDocument || document, f = [], h = {
    closeAll: () => dt(e, t),
    destroy: () => {
      for (h.closeAll(); f.length > 0; ) f.pop()?.();
    }
  };
  e.querySelectorAll(s).forEach((r) => {
    r.classList.contains(n) || r.classList.add(n);
  });
  const S = (r) => {
    const c = nt(r);
    if (!c) return;
    const u = c.closest(i);
    if (u && M(e, u)) {
      const y = at(u, t);
      if (!y) return;
      if (r.stopPropagation(), !y.menu.classList.contains(n)) {
        L(y.menu, t);
        return;
      }
      h.closeAll(), y.menu.classList.remove(n), y.trigger.setAttribute("aria-expanded", "true"), t.portal && ct(y, e), a && a({
        ...y,
        opening: !0
      }), C(F(y.menu, o)[0]);
      return;
    }
    const m = c.closest(o), l = m?.closest(s) ?? null, p = l ? v.get(l) : void 0, b = !!(l && (M(e, l) || p?.root === e));
    if (m && b) {
      if (ut(m)) {
        r.preventDefault(), r.stopPropagation();
        return;
      }
      L(l, t);
      return;
    }
    const A = t.outsideIgnoreSelector;
    if (A && c.closest(A)) return;
    const E = c.closest(s), x = E ? v.get(E) : void 0;
    E && (M(e, E) || x?.root === e) || h.closeAll();
  }, w = (r) => {
    const c = ft(e, s, n);
    if (!c) return;
    const u = F(c, o), m = g.activeElement, l = m ? u.indexOf(m) : -1;
    if (r.key === "Escape") {
      const b = v.get(c)?.trigger ?? c.closest(t.containerSelector || T)?.querySelector(i) ?? null;
      r.preventDefault(), r.stopPropagation(), L(c, t), b?.isConnected && C(b);
      return;
    }
    let p = null;
    r.key === "ArrowDown" ? p = l < 0 ? 0 : (l + 1) % u.length : r.key === "ArrowUp" ? p = l < 0 ? u.length - 1 : (l - 1 + u.length) % u.length : r.key === "Home" ? p = 0 : r.key === "End" && (p = u.length - 1), p !== null && u.length > 0 && (r.preventDefault(), r.stopPropagation(), C(u[p]));
  };
  g.addEventListener("click", S), g.addEventListener("keydown", w), f.push(() => g.removeEventListener("click", S)), f.push(() => g.removeEventListener("keydown", w));
  const d = g.defaultView;
  if (d && (t.portal || a)) {
    const r = () => h.closeAll(), c = (u) => {
      const m = u.target;
      if (m && typeof m.closest == "function") {
        const l = m.closest(s), p = l ? v.get(l) : void 0;
        if (l && (M(e, l) || p?.root === e)) return;
      }
      h.closeAll();
    };
    d.addEventListener("pagehide", r), d.addEventListener("pageshow", r), d.addEventListener("resize", r), d.visualViewport?.addEventListener("resize", r), d.visualViewport?.addEventListener("scroll", r), g.addEventListener("scroll", c, !0), f.push(() => d.removeEventListener("pagehide", r)), f.push(() => d.removeEventListener("pageshow", r)), f.push(() => d.removeEventListener("resize", r)), f.push(() => d.visualViewport?.removeEventListener("resize", r)), f.push(() => d.visualViewport?.removeEventListener("scroll", r)), f.push(() => g.removeEventListener("scroll", c, !0));
  }
  if (t.signal) {
    const r = () => h.destroy();
    t.signal.addEventListener("abort", r, { once: !0 }), f.push(() => t.signal?.removeEventListener("abort", r));
  }
  return h;
}
function pt(e, t = {}) {
  return ht(e, {
    ...t,
    containerSelector: t.containerSelector || T
  });
}
export {
  L as closeActionMenu,
  dt as closeActionMenus,
  gt as defaultActionMenuPositioner,
  at as findActionMenuElements,
  ht as initActionMenus,
  pt as initActionMenusForElement,
  ut as isActionMenuItemDisabled
};

//# sourceMappingURL=action-menu.js.map