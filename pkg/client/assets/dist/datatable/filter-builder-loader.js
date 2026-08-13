function v(t = () => import("../chunks/filter-builder-CwgMRfQQ.js").then((e) => e.n)) {
  let e = null;
  return {
    load() {
      return e || (e = t().catch((d) => {
        throw e = null, d;
      })), e;
    },
    reset() {
      e = null;
    }
  };
}
var B = v();
function m(t) {
  return t ? typeof t != "string" ? t : document.querySelector(t) : null;
}
function p(t, e) {
  t.notifier?.error?.(e);
}
function L(t, e = {}) {
  const d = e.loader ?? B, r = m(e.toggleButton ?? t.toggleButton ?? "#filter-toggle-btn"), f = r?.getAttribute("aria-busy") ?? null, c = r?.getAttribute("data-filter-builder-load-state") ?? null;
  let l = null, o = null, u = 0, i = !1;
  const a = (n) => {
    if (r) {
      if (n === "loading") {
        r.setAttribute("aria-busy", "true"), r.dataset.filterBuilderLoadState = "loading";
        return;
      }
      f === null ? r.removeAttribute("aria-busy") : r.setAttribute("aria-busy", f), n === "error" ? r.dataset.filterBuilderLoadState = "error" : c === null ? r.removeAttribute("data-filter-builder-load-state") : r.dataset.filterBuilderLoadState = c;
    }
  }, g = ({ open: n = !1 } = {}) => {
    if (i) return Promise.resolve(null);
    if (l)
      return n && l.open(), Promise.resolve(l);
    if (o) return o;
    const y = u;
    return a("loading"), o = d.load().then((s) => i || y !== u ? null : (l = new s.FilterBuilder(t), a(null), n && l.open(), l)).catch((s) => {
      throw !i && y === u && (a("error"), p(t, e.loadErrorMessage ?? "Unable to load filters. Try again.")), s;
    }).finally(() => {
      o = null;
    }), o;
  }, b = (n) => {
    i || l || (n.preventDefault(), n.stopImmediatePropagation(), g({ open: !0 }).catch(() => {
    }));
  };
  return r?.addEventListener("click", b), {
    load: g,
    getInstance: () => l,
    destroy() {
      i || (i = !0, u += 1, r?.removeEventListener("click", b), l?.destroy(), l = null, a(null));
    }
  };
}
export {
  v as createFilterBuilderModuleLoader,
  L as mountFilterBuilderOnInteraction
};

//# sourceMappingURL=filter-builder-loader.js.map