import { escapeAttribute as o, escapeHTML as y } from "../shared/html.js";
function p(e) {
  return e.snapshotKey ?? e.id;
}
function d(e) {
  return e.eventTypes ? Array.isArray(e.eventTypes) ? e.eventTypes : [e.eventTypes] : [p(e)];
}
function m(e) {
  return Array.isArray(e) ? e.length : e && typeof e == "object" ? Object.keys(e).length : 0;
}
function w(e, r, t = 500) {
  if (Array.isArray(e)) {
    const s = [...e, r];
    return t > 0 ? s.slice(-t) : s;
  }
  return e && typeof e == "object" && r && typeof r == "object" ? {
    ...e,
    ...r
  } : r;
}
function v(e, r) {
  return e[p(r)];
}
function S(e, r) {
  const t = v(e, r);
  return r.getCount ? r.getCount(t) : m(t);
}
function L(e, r, t, s, u) {
  return u === "console" && e.renderConsole ? e.renderConsole(r, t, s) : u === "toolbar" && e.renderToolbar ? e.renderToolbar(r, t, s) : u === "toolbar" && e.supportsToolbar === !1 ? `<div class="${t.emptyState}">Panel "${e.label}" not available in toolbar</div>` : e.render(r, t, s);
}
var b = class {
  constructor() {
    this.panels = /* @__PURE__ */ new Map(), this.sources = /* @__PURE__ */ new Map(), this.listeners = /* @__PURE__ */ new Set();
  }
  register(e) {
    this.panels.set(e.id, e), this.sources.set(e.id, "client"), this.notifyListeners({
      type: "register",
      panelId: e.id,
      panel: e
    });
  }
  registerServerDefinition(e) {
    const r = this.panels.get(e.id), t = this.sources.get(e.id);
    return r && t !== "server" ? !1 : (this.panels.set(e.id, e), this.sources.set(e.id, "server"), this.notifyListeners({
      type: "register",
      panelId: e.id,
      panel: e
    }), !0);
  }
  unregister(e) {
    const r = this.panels.get(e);
    this.panels.delete(e) && (this.sources.delete(e), this.notifyListeners({
      type: "unregister",
      panelId: e,
      panel: r
    }));
  }
  clearServerDefinitions() {
    for (const e of Array.from(this.sources.keys())) this.sources.get(e) === "server" && this.unregister(e);
  }
  dispose() {
    this.panels.clear(), this.sources.clear(), this.listeners.clear();
  }
  get(e) {
    return this.panels.get(e);
  }
  has(e) {
    return this.panels.has(e);
  }
  isServerDefinition(e) {
    return this.sources.get(e) === "server";
  }
  list() {
    return Array.from(this.panels.values());
  }
  ids() {
    return Array.from(this.panels.keys());
  }
  getSortedIds() {
    return this.list().sort((e, r) => {
      const t = e.category || "custom", s = r.category || "custom";
      return t !== s ? t.localeCompare(s) : (e.order || 100) - (r.order || 100);
    }).map((e) => e.id);
  }
  getToolbarPanels() {
    return this.list().filter((e) => e.supportsToolbar !== !1);
  }
  getAllEventTypes() {
    const e = /* @__PURE__ */ new Set();
    for (const r of this.panels.values()) for (const t of d(r)) e.add(t);
    return Array.from(e);
  }
  findByEventType(e) {
    for (const r of this.panels.values()) if (d(r).includes(e)) return r;
  }
  subscribe(e) {
    return this.listeners.add(e), () => this.listeners.delete(e);
  }
  onChange(e) {
    const r = () => e();
    return this.subscribe(r);
  }
  notifyListeners(e) {
    this.listeners.forEach((r) => r(e));
  }
};
function _() {
  return new b();
}
var A = 128, T = 256, k = 16, $ = 88e3;
function a(e, r) {
  return typeof e == "string" ? e.trim().slice(0, r) : "";
}
function h(e) {
  const r = a(e, 16).toLowerCase();
  return /^#[0-9a-f]{6}$/.test(r) ? r : "";
}
function C(e) {
  if (!e || typeof e != "object") return null;
  const r = e, t = a(r.name, A), s = a(r.algorithm, 64), u = a(r.version, 64), l = a(r.source, 64), n = r.visual, c = a(n?.alt, T) || t;
  if (!t || !n || !c) return null;
  if (n.kind === "monogram") {
    const i = a(n.text, k), f = h(n.background), g = h(n.foreground);
    return !i || !f || !g ? null : {
      name: t,
      algorithm: s,
      version: u,
      source: l,
      visual: {
        kind: "monogram",
        text: i,
        alt: c,
        background: f,
        foreground: g
      }
    };
  }
  if (n.kind === "image") {
    const i = typeof n.data == "string" ? n.data.trim() : "";
    return n.media_type !== "image/png" || i.length === 0 || i.length > $ || !i.startsWith("iVBORw0KGgo") || !/^[A-Za-z0-9+/]+={0,2}$/.test(i) ? null : {
      name: t,
      algorithm: s,
      version: u,
      source: l,
      visual: {
        kind: "image",
        alt: c,
        media_type: "image/png",
        data: i
      }
    };
  }
  return null;
}
function E(e, r = "deployment-persona-avatar") {
  const t = C(e);
  if (!t?.visual) return "";
  const s = t.visual;
  return s.kind === "image" ? `<span class="${o(r)}"><img src="data:image/png;base64,${o(s.data)}" alt="${o(s.alt)}"></span>` : `<span class="${o(r)}" role="img" aria-label="${o(s.alt)}" style="--persona-background:${o(s.background)};--persona-foreground:${o(s.foreground)}">${y(s.text)}</span>`;
}
export {
  m as a,
  v as c,
  L as d,
  _ as i,
  p as l,
  E as n,
  w as o,
  b as r,
  S as s,
  C as t,
  d as u
};

//# sourceMappingURL=avatar-DIbK-LSg.js.map