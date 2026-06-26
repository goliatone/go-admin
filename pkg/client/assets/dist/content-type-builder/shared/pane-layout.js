var E = 1, m = "cm-pane";
function h(t, e, i) {
  const s = typeof t == "number" ? t : Number(t);
  return Number.isFinite(s) ? Math.min(Math.max(e, i), Math.max(Math.min(e, i), s)) : null;
}
function y(t) {
  return `${m}:v${t.version ?? 1}:${t.surface}`;
}
function b(t) {
  const e = {};
  for (const i of t.rails) e[i.id] = {
    collapsed: i.defaultCollapsed === !0,
    width: i.resizable && typeof i.defaultWidth == "number" ? h(i.defaultWidth, i.min ?? 0, i.max ?? i.defaultWidth) : null
  };
  return {
    rails: e,
    focus: null
  };
}
function p(t, e) {
  const i = b(e);
  if (!t || typeof t != "object") return i;
  const s = t, a = s.rails && typeof s.rails == "object" ? s.rails : {};
  for (const r of e.rails) {
    const l = a[r.id];
    if (!l || typeof l != "object") continue;
    const n = l;
    if (typeof n.collapsed == "boolean" && (i.rails[r.id].collapsed = n.collapsed), r.resizable) {
      const c = h(n.width, r.min ?? 0, r.max ?? Number.MAX_SAFE_INTEGER);
      i.rails[r.id].width = c;
    } else i.rails[r.id].width = null;
  }
  const o = e.focusPanes ?? [];
  return typeof s.focus == "string" && o.includes(s.focus) && (i.focus = s.focus), i;
}
function v(t) {
  let e = t ?? null;
  if (e === null && typeof t > "u") try {
    e = typeof localStorage < "u" ? localStorage : null;
  } catch {
    e = null;
  }
  const i = /* @__PURE__ */ new Map();
  return {
    getItem(s) {
      if (e) try {
        return e.getItem(s);
      } catch {
      }
      return i.has(s) ? i.get(s) : null;
    },
    setItem(s, a) {
      if (e) try {
        e.setItem(s, a);
        return;
      } catch {
      }
      i.set(s, a);
    },
    removeItem(s) {
      if (e) try {
        e.removeItem(s);
      } catch {
      }
      i.delete(s);
    }
  };
}
var C = class {
  constructor(t, e) {
    this.cleanups = [], this.dragCleanup = null, this.root = t, this.config = e, this.railDefs = new Map(e.rails.map((i) => [i.id, i])), this.storage = v(e.storage), this.storageKey = y(e), this.state = this.restore();
  }
  restore() {
    let t = null;
    const e = this.storage.getItem(this.storageKey);
    if (e) try {
      t = JSON.parse(e);
    } catch {
      t = null;
    }
    return p(t, this.config);
  }
  persist() {
    this.storage.setItem(this.storageKey, JSON.stringify(this.state));
  }
  emitChange() {
    this.config.onChange && this.config.onChange(this.getState());
  }
  getState() {
    return {
      focus: this.state.focus,
      rails: Object.fromEntries(Object.entries(this.state.rails).map(([t, e]) => [t, { ...e }]))
    };
  }
  init() {
    return this.apply(), this.bindControls(), this;
  }
  setRailCollapsed(t, e, i) {
    const s = this.state.rails[t];
    !s || s.collapsed === e || (s.collapsed = e, this.applyRail(t), i?.persist !== !1 && this.persist(), this.emitChange());
  }
  toggleRail(t) {
    const e = this.state.rails[t];
    e && this.setRailCollapsed(t, !e.collapsed);
  }
  setRailWidth(t, e, i) {
    const s = this.railDefs.get(t), a = this.state.rails[t];
    !s || !s.resizable || !a || (a.width = h(e, s.min ?? 0, s.max ?? Number.MAX_SAFE_INTEGER), this.applyRail(t), i?.persist !== !1 && this.persist(), this.emitChange());
  }
  setFocus(t, e) {
    const i = this.config.focusPanes ?? [], s = t && i.includes(t) ? t : null;
    this.state.focus !== s && (this.state.focus = s, this.applyFocus(), e?.persist !== !1 && this.persist(), this.emitChange());
  }
  toggleFocus(t) {
    this.setFocus(this.state.focus === t ? null : t);
  }
  apply() {
    for (const t of Object.keys(this.state.rails)) this.applyRail(t);
    this.applyFocus();
  }
  refresh(t) {
    if (t) {
      const e = this.config.storage, i = this.config.onChange;
      this.config = {
        ...t,
        storage: t.storage ?? e,
        onChange: t.onChange ?? i
      }, this.railDefs = new Map(this.config.rails.map((s) => [s.id, s])), this.state = p(this.state, this.config);
    }
    this.apply();
  }
  applyRail(t) {
    const e = this.state.rails[t], i = this.railDefs.get(t);
    if (!e || !i) return;
    const s = this.root.querySelector(`[data-pane-rail="${t}"]`);
    s && (s.setAttribute("data-collapsed", e.collapsed ? "true" : "false"), i.resizable && e.width != null && !e.collapsed ? (s.style.flexBasis = `${e.width}px`, s.style.width = `${e.width}px`) : (s.style.removeProperty("flex-basis"), s.style.removeProperty("width"))), this.root.querySelectorAll(`[data-pane-toggle="${t}"]`).forEach((a) => {
      a.setAttribute("aria-expanded", e.collapsed ? "false" : "true"), a.setAttribute("data-pane-collapsed", e.collapsed ? "true" : "false");
    });
  }
  applyFocus() {
    this.state.focus ? this.root.setAttribute("data-pane-focus", this.state.focus) : this.root.removeAttribute("data-pane-focus"), this.root.querySelectorAll("[data-pane-focus-toggle]").forEach((t) => {
      const e = t.getAttribute("data-pane-focus-toggle") ?? "";
      t.setAttribute("aria-pressed", this.state.focus === e ? "true" : "false");
    });
  }
  bindControls() {
    const t = (s) => {
      const a = s.target?.closest("[data-pane-toggle]");
      if (!a || !this.root.contains(a)) return;
      const o = a.getAttribute("data-pane-toggle");
      o && (s.preventDefault(), this.toggleRail(o));
    }, e = (s) => {
      const a = s.target?.closest("[data-pane-focus-exit]");
      if (a && this.root.contains(a)) {
        s.preventDefault(), this.setFocus(null);
        return;
      }
      const o = s.target?.closest("[data-pane-focus-toggle]");
      if (o && this.root.contains(o)) {
        const r = o.getAttribute("data-pane-focus-toggle");
        r && (s.preventDefault(), this.toggleFocus(r));
      }
    }, i = (s) => {
      const a = s.target?.closest("[data-pane-resize]");
      if (!a || !this.root.contains(a)) return;
      const o = a.getAttribute("data-pane-resize");
      o && this.beginResize(o, s);
    };
    this.root.addEventListener("click", t), this.root.addEventListener("click", e), this.root.addEventListener("mousedown", i), this.cleanups.push(() => {
      this.root.removeEventListener("click", t), this.root.removeEventListener("click", e), this.root.removeEventListener("mousedown", i);
    });
  }
  beginResize(t, e) {
    const i = this.railDefs.get(t), s = this.state.rails[t], a = this.root.querySelector(`[data-pane-rail="${t}"]`);
    if (!i || !i.resizable || !s || !a || s.collapsed) return;
    e.preventDefault(), this.endResize();
    const o = e.clientX, r = s.width ?? a.getBoundingClientRect().width, l = i.edge ?? "trailing", n = (d) => {
      const f = d.clientX - o, g = l === "leading" ? -f : f;
      this.setRailWidth(t, r + g, { persist: !1 });
    }, c = () => {
      this.endResize(), this.persist();
    }, u = a.ownerDocument || document;
    u.addEventListener("mousemove", n), u.addEventListener("mouseup", c), this.root.setAttribute("data-pane-resizing", t), this.dragCleanup = () => {
      u.removeEventListener("mousemove", n), u.removeEventListener("mouseup", c), this.root.removeAttribute("data-pane-resizing"), this.dragCleanup = null;
    };
  }
  endResize() {
    this.dragCleanup && this.dragCleanup();
  }
  destroy() {
    this.endResize(), this.cleanups.forEach((t) => t()), this.cleanups.length = 0;
  }
};
function R(t, e) {
  return t ? new C(t, e).init() : null;
}
export {
  E as PANE_LAYOUT_VERSION,
  C as PaneLayoutController,
  h as clampWidth,
  R as createPaneLayout,
  v as createSafeStorage,
  b as defaultPaneState,
  y as paneStorageKey,
  p as sanitizePaneState
};

//# sourceMappingURL=pane-layout.js.map