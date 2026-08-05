var h = "[data-action-menu], [data-dropdown]", v = "[data-action-menu-trigger], [data-dropdown-trigger]", y = "[data-action-menu-content], .actions-menu", b = '[role="menuitem"], [data-action-menu-item], .action-item', w = "hidden";
function x(t) {
  const e = t.target;
  return e && typeof e.closest == "function" ? e : null;
}
function C(t, e) {
  return "contains" in t && typeof t.contains == "function" ? t.contains(e) : !1;
}
function D(t, e = {}) {
  const o = e.containerSelector || h, l = e.menuSelector || y, c = t.closest(o), r = c?.querySelector(l) ?? null;
  return !c || !r ? null : {
    container: c,
    trigger: t,
    menu: r
  };
}
function T(t, e = {}) {
  const o = e.hiddenClass || w;
  t.classList.add(o), t.closest(e.containerSelector || h)?.querySelector(e.triggerSelector || v)?.setAttribute("aria-expanded", "false");
}
function _(t = document, e = {}) {
  const o = e.menuSelector || y;
  t.querySelectorAll(o).forEach((l) => {
    T(l, e);
  });
}
function R(t) {
  return t.getAttribute("aria-disabled") === "true" || t.dataset.disabled === "true";
}
function k({ trigger: t, menu: e }) {
  const o = t.getBoundingClientRect(), l = window.innerWidth, c = e.offsetWidth || 224, r = window.innerHeight, i = 10, d = 8, u = Math.max(0, r - 20), s = e.offsetHeight || Math.min(300, u), g = r - o.bottom, S = o.top, n = g < s && S > g, f = o.right - c, m = Math.max(i, l - c - i), E = Math.min(Math.max(i, f), m), A = n ? o.top - s - d : o.bottom + d, L = Math.max(i, r - s - i), a = Math.min(Math.max(i, A), L);
  e.style.position = "fixed", e.style.right = "auto", e.style.left = `${E}px`, e.style.top = `${a}px`, e.style.bottom = "auto", e.style.margin = "0";
}
function I(t = document, e = {}) {
  const o = e.triggerSelector || v, l = e.itemSelector || b, c = e.hiddenClass || w, r = e.menuSelector || y, i = e.positionMenu, d = t.nodeType === 9 ? t : t.ownerDocument || document, u = [], s = {
    closeAll: () => _(t, e),
    destroy: () => {
      for (; u.length > 0; ) u.pop()?.();
    }
  };
  t.querySelectorAll(r).forEach((n) => {
    n.classList.contains(c) || n.classList.add(c);
  });
  const g = (n) => {
    const f = x(n);
    if (!f) return;
    const m = f.closest(o);
    if (m && C(t, m)) {
      const a = D(m, e);
      if (!a) return;
      n.stopPropagation();
      const p = a.menu.classList.contains(c);
      t.querySelectorAll(r).forEach((M) => {
        M !== a.menu && T(M, e);
      }), a.menu.classList.toggle(c), a.trigger.setAttribute("aria-expanded", p ? "true" : "false"), p && i && i({
        ...a,
        opening: p
      });
      return;
    }
    const E = f.closest(l);
    if (E && R(E)) {
      n.preventDefault(), n.stopPropagation();
      return;
    }
    const A = e.outsideIgnoreSelector;
    if (A && f.closest(A)) return;
    const L = f.closest(e.containerSelector || h);
    (!L || !Array.from(t.querySelectorAll(e.containerSelector || h)).includes(L)) && s.closeAll();
  }, S = (n) => {
    n.key === "Escape" && s.closeAll();
  };
  if (d.addEventListener("click", g), d.addEventListener("keydown", S), u.push(() => d.removeEventListener("click", g)), u.push(() => d.removeEventListener("keydown", S)), e.signal) {
    const n = () => s.destroy();
    e.signal.addEventListener("abort", n, { once: !0 }), u.push(() => e.signal?.removeEventListener("abort", n));
  }
  return s;
}
function U(t, e = {}) {
  return I(t, {
    ...e,
    containerSelector: e.containerSelector || h
  });
}
export {
  T as closeActionMenu,
  _ as closeActionMenus,
  k as defaultActionMenuPositioner,
  D as findActionMenuElements,
  I as initActionMenus,
  U as initActionMenusForElement,
  R as isActionMenuItemDisabled
};

//# sourceMappingURL=action-menu.js.map