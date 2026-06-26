import { createPaneLayout as s } from "./pane-layout.js";
function c(t, n) {
  const a = t.getAttribute(n);
  if (a == null || a.trim() === "") return;
  const e = Number(a);
  return Number.isFinite(e) ? e : void 0;
}
function d(t) {
  const n = t.getAttribute("data-pane-rail");
  if (!n) return null;
  const a = t.hasAttribute("data-pane-resizable"), e = t.getAttribute("data-pane-edge");
  return {
    id: n,
    resizable: a,
    edge: e === "leading" || e === "trailing" ? e : void 0,
    min: c(t, "data-pane-min"),
    max: c(t, "data-pane-max"),
    defaultWidth: c(t, "data-pane-default-width"),
    defaultCollapsed: t.hasAttribute("data-pane-default-collapsed")
  };
}
function f(t, n) {
  const a = t.getAttribute("data-cm-surface")?.trim() || "content-modeling", e = [], l = /* @__PURE__ */ new Set();
  t.querySelectorAll("[data-pane-rail]").forEach((u) => {
    const r = d(u);
    r && !l.has(r.id) && (l.add(r.id), e.push(r));
  });
  const i = [];
  t.querySelectorAll("[data-pane-focus-toggle]").forEach((u) => {
    const r = u.getAttribute("data-pane-focus-toggle");
    r && !i.includes(r) && i.push(r);
  });
  const o = {
    surface: a,
    rails: e,
    focusPanes: i
  };
  return n && "storage" in n && (o.storage = n.storage), n?.onChange && (o.onChange = n.onChange), o;
}
function g(t, n) {
  if (!t || t.dataset.cmShellInit === "true") return null;
  const a = f(t, n);
  if (a.rails.length === 0) return null;
  const e = s(t, a);
  return e && (t.dataset.cmShellInit = "true"), e;
}
function m(t = document, n) {
  const a = Array.from(t.querySelectorAll("[data-content-modeling-shell]")), e = [];
  for (const l of a) {
    const i = g(l, n);
    i && e.push(i);
  }
  return e;
}
export {
  f as buildShellConfig,
  g as initContentModelingShell,
  m as initContentModelingShells
};

//# sourceMappingURL=content-modeling-shell.js.map