import { createPaneLayout as g } from "./pane-layout.js";
var s = /* @__PURE__ */ new WeakMap();
function c(t, e) {
  const n = t.getAttribute(e);
  if (n == null || n.trim() === "") return;
  const r = Number(n);
  return Number.isFinite(r) ? r : void 0;
}
function h(t) {
  const e = t.getAttribute("data-pane-rail");
  if (!e) return null;
  const n = t.hasAttribute("data-pane-resizable"), r = t.getAttribute("data-pane-edge");
  return {
    id: e,
    resizable: n,
    edge: r === "leading" || r === "trailing" ? r : void 0,
    min: c(t, "data-pane-min"),
    max: c(t, "data-pane-max"),
    defaultWidth: c(t, "data-pane-default-width"),
    defaultCollapsed: t.hasAttribute("data-pane-default-collapsed")
  };
}
function d(t, e) {
  const n = t.getAttribute("data-cm-surface")?.trim() || "content-modeling", r = [], l = /* @__PURE__ */ new Set();
  t.querySelectorAll("[data-pane-rail]").forEach((u) => {
    const a = h(u);
    a && !l.has(a.id) && (l.add(a.id), r.push(a));
  });
  const i = [];
  t.querySelectorAll("[data-pane-focus-toggle]").forEach((u) => {
    const a = u.getAttribute("data-pane-focus-toggle");
    a && !i.includes(a) && i.push(a);
  });
  const o = {
    surface: n,
    rails: r,
    focusPanes: i
  };
  return e && "storage" in e && (o.storage = e.storage), e?.onChange && (o.onChange = e.onChange), o;
}
function f(t, e) {
  if (!t || t.dataset.cmShellInit === "true") return null;
  const n = d(t, e);
  if (n.rails.length === 0) return null;
  const r = g(t, n);
  return r && (t.dataset.cmShellInit = "true", s.set(t, r)), r;
}
function p(t, e) {
  if (!t) return null;
  const n = s.get(t);
  return n ? (n.refresh(d(t, e)), n) : f(t, e);
}
function A(t = document, e) {
  const n = Array.from(t.querySelectorAll("[data-content-modeling-shell]")), r = [];
  for (const l of n) {
    const i = f(l, e);
    i && r.push(i);
  }
  return r;
}
export {
  d as buildShellConfig,
  f as initContentModelingShell,
  A as initContentModelingShells,
  p as refreshContentModelingShell
};

//# sourceMappingURL=content-modeling-shell.js.map