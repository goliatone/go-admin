var T = "[data-action-menu], [data-dropdown]", _ = "[data-action-menu-trigger], [data-dropdown-trigger]", C = "[data-action-menu-content], .actions-menu", G = '[role="menuitem"], [data-action-menu-item], .action-item', F = "hidden", W = /* @__PURE__ */ new Set(), m = /* @__PURE__ */ new WeakMap(), D = /* @__PURE__ */ new WeakMap();
function K(t) {
  const e = t.target;
  return e && typeof e.closest == "function" ? e : null;
}
function y(t, e) {
  return "contains" in t && typeof t.contains == "function" ? t.contains(e) : !1;
}
function j(t, e = {}) {
  const c = e.containerSelector || T, i = e.menuSelector || C, n = t.closest(c), r = D.get(t) ?? n?.querySelector(i) ?? null;
  return !n || !r ? null : {
    container: n,
    trigger: t,
    menu: r
  };
}
function J(t, e) {
  const { container: c, trigger: i, menu: n } = t;
  if (m.has(n)) return;
  const r = n.ownerDocument, g = n.parentNode;
  !r.body || !g || (m.set(n, {
    container: c,
    trigger: i,
    root: e,
    parent: g,
    nextSibling: n.nextSibling
  }), W.add(n), D.set(i, n), r.body.appendChild(n));
}
function Q(t) {
  const e = m.get(t);
  if (e) {
    if (W.delete(t), m.delete(t), D.delete(e.trigger), !e.parent.isConnected) {
      t.remove();
      return;
    }
    if (e.nextSibling?.parentNode === e.parent) {
      e.parent.insertBefore(t, e.nextSibling);
      return;
    }
    e.parent.appendChild(t);
  }
}
function b(t, e = {}) {
  const c = e.hiddenClass || F;
  t.classList.add(c);
  const i = m.get(t), n = i?.container ?? t.closest(e.containerSelector || T);
  (i?.trigger ?? n?.querySelector(e.triggerSelector || _))?.setAttribute("aria-expanded", "false"), Q(t);
}
function X(t = document, e = {}) {
  const c = e.menuSelector || C, i = new Set(Array.from(t.querySelectorAll(c)));
  W.forEach((n) => {
    const r = m.get(n);
    r && (r.root === t || y(t, r.trigger)) && i.add(n);
  }), i.forEach((n) => {
    b(n, e);
  });
}
function Y(t) {
  return t.getAttribute("aria-disabled") === "true" || t.dataset.disabled === "true";
}
function ee({ trigger: t, menu: e }) {
  const c = t.getBoundingClientRect(), i = t.ownerDocument.defaultView ?? window, n = i.visualViewport, r = n?.offsetLeft ?? 0, g = n?.offsetTop ?? 0, h = n?.width ?? i.innerWidth, a = n?.height ?? i.innerHeight, l = 10, w = 8, E = Math.max(0, h - 20), s = Math.max(0, a - 20);
  e.style.minWidth = "", e.style.maxWidth = "", e.style.maxHeight = "";
  const o = i.getComputedStyle(e), d = (q, z) => {
    const H = Number.parseFloat(q);
    return Number.isFinite(H) ? H : z;
  }, v = d(o.minWidth, 192), f = d(o.maxWidth, E), u = d(o.maxHeight, s), S = Math.min(f, E);
  e.style.position = "fixed", e.style.right = "auto", e.style.bottom = "auto", e.style.margin = "0", e.style.minWidth = `${Math.min(v, S)}px`, e.style.maxWidth = `${S}px`, e.style.maxHeight = `${Math.min(u, s)}px`;
  const x = Math.min(e.offsetWidth || 224, E), L = Math.min(e.offsetHeight || Math.min(300, s), s), M = r + h, A = g + a, p = A - c.bottom, V = c.top - g, B = p < L && V > p, N = c.right - x, R = r + l, I = Math.max(R, M - x - l), U = Math.min(Math.max(R, N), I), O = B ? c.top - L - w : c.bottom + w, k = g + l, P = Math.max(k, A - L - l), $ = Math.min(Math.max(k, O), P);
  e.style.left = `${U}px`, e.style.top = `${$}px`;
}
function Z(t = document, e = {}) {
  const c = e.triggerSelector || _, i = e.itemSelector || G, n = e.hiddenClass || F, r = e.menuSelector || C, g = e.positionMenu, h = t.nodeType === 9 ? t : t.ownerDocument || document, a = [], l = {
    closeAll: () => X(t, e),
    destroy: () => {
      for (l.closeAll(); a.length > 0; ) a.pop()?.();
    }
  };
  t.querySelectorAll(r).forEach((o) => {
    o.classList.contains(n) || o.classList.add(n);
  });
  const w = (o) => {
    const d = K(o);
    if (!d) return;
    const v = d.closest(c);
    if (v && y(t, v)) {
      const p = j(v, e);
      if (!p) return;
      if (o.stopPropagation(), !p.menu.classList.contains(n)) {
        b(p.menu, e);
        return;
      }
      l.closeAll(), p.menu.classList.remove(n), p.trigger.setAttribute("aria-expanded", "true"), e.portal && J(p, t), g && g({
        ...p,
        opening: !0
      });
      return;
    }
    const f = d.closest(i), u = f?.closest(r) ?? null, S = u ? m.get(u) : void 0, x = !!(u && (y(t, u) || S?.root === t));
    if (f && x) {
      if (Y(f)) {
        o.preventDefault(), o.stopPropagation();
        return;
      }
      b(u, e);
      return;
    }
    const L = e.outsideIgnoreSelector;
    if (L && d.closest(L)) return;
    const M = d.closest(r), A = M ? m.get(M) : void 0;
    M && (y(t, M) || A?.root === t) || l.closeAll();
  }, E = (o) => {
    o.key === "Escape" && l.closeAll();
  };
  h.addEventListener("click", w), h.addEventListener("keydown", E), a.push(() => h.removeEventListener("click", w)), a.push(() => h.removeEventListener("keydown", E));
  const s = h.defaultView;
  if (s && (e.portal || g)) {
    const o = () => l.closeAll(), d = (v) => {
      const f = v.target;
      if (f && typeof f.closest == "function") {
        const u = f.closest(r), S = u ? m.get(u) : void 0;
        if (u && (y(t, u) || S?.root === t)) return;
      }
      l.closeAll();
    };
    s.addEventListener("pagehide", o), s.addEventListener("pageshow", o), s.addEventListener("resize", o), s.visualViewport?.addEventListener("resize", o), s.visualViewport?.addEventListener("scroll", o), h.addEventListener("scroll", d, !0), a.push(() => s.removeEventListener("pagehide", o)), a.push(() => s.removeEventListener("pageshow", o)), a.push(() => s.removeEventListener("resize", o)), a.push(() => s.visualViewport?.removeEventListener("resize", o)), a.push(() => s.visualViewport?.removeEventListener("scroll", o)), a.push(() => h.removeEventListener("scroll", d, !0));
  }
  if (e.signal) {
    const o = () => l.destroy();
    e.signal.addEventListener("abort", o, { once: !0 }), a.push(() => e.signal?.removeEventListener("abort", o));
  }
  return l;
}
function te(t, e = {}) {
  return Z(t, {
    ...e,
    containerSelector: e.containerSelector || T
  });
}
export {
  b as closeActionMenu,
  X as closeActionMenus,
  ee as defaultActionMenuPositioner,
  j as findActionMenuElements,
  Z as initActionMenus,
  te as initActionMenusForElement,
  Y as isActionMenuItemDisabled
};

//# sourceMappingURL=action-menu.js.map