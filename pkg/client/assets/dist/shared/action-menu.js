var d = "[data-action-menu], [data-dropdown]", T = "[data-action-menu-trigger], [data-dropdown-trigger]", E = "[data-action-menu-content], .actions-menu", M = '[role="menuitem"], [data-action-menu-item], .action-item', b = "hidden";
function w(t) {
  const e = t.target;
  return e && typeof e.closest == "function" ? e : null;
}
function D(t, e) {
  return "contains" in t && typeof t.contains == "function" ? t.contains(e) : !1;
}
function _(t, e = {}) {
  const n = e.containerSelector || d, o = e.menuSelector || E, r = t.closest(n), s = r?.querySelector(o) ?? null;
  return !r || !s ? null : {
    container: r,
    trigger: t,
    menu: s
  };
}
function C(t, e = {}) {
  const n = e.hiddenClass || b;
  t.classList.add(n), t.closest(e.containerSelector || d)?.querySelector(e.triggerSelector || T)?.setAttribute("aria-expanded", "false");
}
function R(t = document, e = {}) {
  const n = e.menuSelector || E;
  t.querySelectorAll(n).forEach((o) => {
    C(o, e);
  });
}
function k(t) {
  return t.getAttribute("aria-disabled") === "true" || t.dataset.disabled === "true";
}
function U({ trigger: t, menu: e }) {
  const n = t.getBoundingClientRect(), o = e.offsetHeight || 300, r = e.offsetWidth || 224, s = window.innerHeight - n.bottom, f = n.top, l = s < o && f > s, i = n.right - r;
  e.style.left = `${Math.max(10, i)}px`, e.style.top = `${l ? n.top - o - 8 : n.bottom + 8}px`, e.style.bottom = "auto";
}
function I(t = document, e = {}) {
  const n = e.triggerSelector || T, o = e.itemSelector || M, r = e.hiddenClass || b, s = e.menuSelector || E, f = e.positionMenu, l = t.nodeType === 9 ? t : t.ownerDocument || document, i = [], g = {
    closeAll: () => R(t, e),
    destroy: () => {
      for (; i.length > 0; ) i.pop()?.();
    }
  };
  t.querySelectorAll(s).forEach((c) => {
    c.classList.contains(r) || c.classList.add(r);
  });
  const A = (c) => {
    const u = w(c);
    if (!u) return;
    const m = u.closest(n);
    if (m && D(t, m)) {
      const a = _(m, e);
      if (!a) return;
      c.stopPropagation();
      const S = a.menu.classList.contains(r);
      t.querySelectorAll(s).forEach((v) => {
        v !== a.menu && C(v, e);
      }), a.menu.classList.toggle(r), a.trigger.setAttribute("aria-expanded", S ? "true" : "false"), S && f && f({
        ...a,
        opening: S
      });
      return;
    }
    const L = u.closest(o);
    if (L && k(L)) {
      c.preventDefault(), c.stopPropagation();
      return;
    }
    const y = e.outsideIgnoreSelector;
    if (y && u.closest(y)) return;
    const p = u.closest(e.containerSelector || d);
    (!p || !Array.from(t.querySelectorAll(e.containerSelector || d)).includes(p)) && g.closeAll();
  }, h = (c) => {
    c.key === "Escape" && g.closeAll();
  };
  if (l.addEventListener("click", A), l.addEventListener("keydown", h), i.push(() => l.removeEventListener("click", A)), i.push(() => l.removeEventListener("keydown", h)), e.signal) {
    const c = () => g.destroy();
    e.signal.addEventListener("abort", c, { once: !0 }), i.push(() => e.signal?.removeEventListener("abort", c));
  }
  return g;
}
function q(t, e = {}) {
  return I(t, {
    ...e,
    containerSelector: e.containerSelector || d
  });
}
export {
  C as closeActionMenu,
  R as closeActionMenus,
  U as defaultActionMenuPositioner,
  _ as findActionMenuElements,
  I as initActionMenus,
  q as initActionMenusForElement,
  k as isActionMenuItemDisabled
};

//# sourceMappingURL=action-menu.js.map